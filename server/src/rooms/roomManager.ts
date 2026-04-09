import { GameState, TrumpMethod, TeamId, LobbyPlayer, Card } from '../types';
import { initGame, nextDealerSeat } from '../engine/gameEngine';

export interface Room {
  code: string;
  hostSocketId: string;
  playerCount: 4 | 6 | 8 | 10;
  trumpMethod: TrumpMethod;
  gamePointsTarget: 3 | 5 | 7 | 10;
  seats: (RoomSeat | null)[];  // length = playerCount
  gameState: GameState | null;
  phase: 'lobby' | 'playing' | 'round_end' | 'game_over';
  createdAt: number;
  teamIds?: TeamId[];  // shuffled once at game start, preserved across rounds
}

export interface RoomSeat {
  socketId: string;
  name: string;
  seatIndex: number;
  teamId: TeamId;
  isAI?: boolean;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
}

export interface AiSlotConfig {
  seatIndex: number;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const rooms = new Map<string, Room>();

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateCode() : code;
}

/** Create a new lobby room. Returns the room code. */
export function createRoom(
  hostSocketId: string,
  hostName: string,
  playerCount: 4 | 6 | 8 | 10,
  trumpMethod: TrumpMethod,
  gamePointsTarget: 3 | 5 | 7 | 10,
  aiSlots?: AiSlotConfig[]
): Room {
  const code = generateCode();
  const seats: (RoomSeat | null)[] = Array(playerCount).fill(null);
  seats[0] = { socketId: hostSocketId, name: hostName, seatIndex: 0, teamId: 0 };

  // Pre-fill AI seats with placeholder socket IDs
  if (aiSlots) {
    for (const ai of aiSlots) {
      if (ai.seatIndex > 0 && ai.seatIndex < playerCount) {
        seats[ai.seatIndex] = {
          socketId: `ai_seat_${ai.seatIndex}`,
          name: ai.name,
          seatIndex: ai.seatIndex,
          teamId: (ai.seatIndex % 2) as TeamId,
          isAI: true,
          aiDifficulty: ai.difficulty,
        };
      }
    }
  }

  const room: Room = {
    code,
    hostSocketId,
    playerCount,
    trumpMethod,
    gamePointsTarget,
    seats,
    gameState: null,
    phase: 'lobby',
    createdAt: Date.now()
  };
  rooms.set(code, room);
  return room;
}

/** Join an existing lobby room. Returns the assigned seatIndex or error. */
export function joinRoom(
  socketId: string,
  name: string,
  code: string
): { seat: RoomSeat; room: Room } | { error: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { error: 'Room not found' };
  if (room.phase !== 'lobby') return { error: 'Game already started' };

  // Find next empty human seat (skip AI pre-filled slots)
  const nextSeat = room.seats.findIndex(s => s === null);
  if (nextSeat === -1) return { error: 'Room is full' };

  const seat: RoomSeat = {
    socketId,
    name,
    seatIndex: nextSeat,
    teamId: (nextSeat % 2) as TeamId
  };
  room.seats[nextSeat] = seat;
  return { seat, room };
}

/** Remove a player from their room (disconnect handling). */
export function leaveRoom(socketId: string): { room: Room; seatIndex: number } | null {
  for (const room of rooms.values()) {
    const idx = room.seats.findIndex(s => s?.socketId === socketId);
    if (idx !== -1) {
      room.seats[idx] = null;
      // Clean up empty rooms
      if (room.seats.every(s => s === null)) rooms.delete(room.code);
      return { room, seatIndex: idx };
    }
  }
  return null;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function getRoomBySocket(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.seats.some(s => s?.socketId === socketId)) return room;
  }
  return undefined;
}

/** Lobby snapshot: public player list (no hands). */
export function getLobbyPlayers(room: Room): LobbyPlayer[] {
  return room.seats
    .filter((s): s is RoomSeat => s !== null)
    .map(s => ({
      name: s.name,
      seatIndex: s.seatIndex,
      teamId: s.teamId,
      connected: true,
      isAI: s.isAI,
      aiDifficulty: s.aiDifficulty,
    }));
}

/** Shuffle team assignments: balanced [0,1,0,1,...] randomly permuted. */
function shuffleTeams(playerCount: number): TeamId[] {
  const half = playerCount / 2;
  const teams: TeamId[] = [...Array(half).fill(0 as TeamId), ...Array(half).fill(1 as TeamId)];
  // Fisher-Yates shuffle
  for (let i = teams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }
  return teams;
}

/** Start the game. Fails if not all seats filled or already started. */
export function startGame(room: Room): GameState | { error: string } {
  if (room.phase !== 'lobby') return { error: 'Already started' };
  if (room.seats.some(s => s === null)) return { error: 'Not all players joined' };

  // Shuffle team assignments once at game start
  const teamIds = shuffleTeams(room.playerCount);
  room.teamIds = teamIds;

  // Update seat records so getLobbyPlayers reflects the shuffled teams
  const seats = room.seats as RoomSeat[];
  seats.forEach((seat, i) => { seat.teamId = teamIds[i]; });

  const state = initGame(
    room.code,
    seats.map(s => s.name),
    seats.map(s => s.socketId),
    {
      playerCount: room.playerCount,
      trumpMethod: room.trumpMethod,
      gamePointsTarget: room.gamePointsTarget
    },
    0,
    [0, 0],
    teamIds
  );
  room.gameState = state;
  room.phase = 'playing';
  return state;
}

/** Start next round with proper dealer rotation (PRD §12). */
export function startNextRound(
  room: Room,
  winnerTeamId: TeamId,
  category: 'normal' | 'mendikot' | 'whitewash'
): GameState | { error: string } {
  if (!room.gameState) return { error: 'No game state' };
  const prev = room.gameState;
  const seats = room.seats as RoomSeat[];

  const prevDealer = prev.round.dealerSeatIndex;
  const dealerTeam = prev.players[prevDealer].teamId;
  const newDealer = nextDealerSeat(prevDealer, dealerTeam, winnerTeamId, category, room.playerCount);

  const newState = initGame(
    room.code,
    seats.map(s => s.name),
    seats.map(s => s.socketId),
    {
      playerCount: room.playerCount,
      trumpMethod: room.trumpMethod,
      gamePointsTarget: room.gamePointsTarget
    },
    newDealer,
    [...prev.gamePoints] as [number, number],
    room.teamIds
  );
  room.gameState = newState;
  room.phase = 'playing';
  return newState;
}

/** Rename a player in the lobby. Only allowed before game starts. */
export function renamePlayer(
  socketId: string,
  code: string,
  newName: string
): { room: Room; seatIndex: number } | { error: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { error: 'Room not found' };
  if (room.phase !== 'lobby') return { error: 'Game already started' };
  const idx = room.seats.findIndex(s => s?.socketId === socketId);
  if (idx === -1) return { error: 'Not in room' };
  const trimmed = newName.trim().slice(0, 20);
  if (!trimmed) return { error: 'Name cannot be empty' };
  room.seats[idx]!.name = trimmed;
  return { room, seatIndex: idx };
}

/** Expire rooms older than 30 minutes with no active game (PRD §14.3). */
export function cleanupStaleRooms(): void {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [code, room] of rooms.entries()) {
    if (room.phase === 'lobby' && room.createdAt < cutoff) rooms.delete(code);
  }
}
