/**
 * MindiRoom — one Durable Object instance per room code.
 *
 * This replaces server/src/rooms/roomManager.ts + server/src/socket/handlers.ts.
 * Two things differ from the Render implementation and drive the whole design:
 *
 *  1. Hibernation resets memory. When the DO hibernates, instance fields are
 *     lost and the constructor re-runs. So room state is persisted to DO
 *     storage on every mutation and lazily rehydrated via #load(). A side
 *     benefit: games now survive a restart, which they never did on Render.
 *
 *  2. There is no socket.id. Each connection gets a generated connId, stored on
 *     the WebSocket via serializeAttachment so it survives hibernation. connId
 *     plays exactly the role socket.id used to, which is why the game engine
 *     needs no changes at all.
 */

import type { GameState, Player, Card, TeamId, TrumpMethod, RoundResult } from '../../server/src/types';
import {
  initGame,
  nextDealerSeat,
  playCard as enginePlayCard,
  applyBandHukum,
  revealBandHukum,
} from '../../server/src/engine/gameEngine';
import {
  validateCreateRoom,
  validateJoinRoom,
  validateCardId,
  validateSeatIndex,
  cleanName,
} from './validate';

/**
 * A room needs this many real people before it can start.
 *
 * Rooms exist for playing with other humans; solo-vs-AI has its own local path
 * and never reaches this Durable Object. Without this floor a host could fill
 * every other seat with AI and play alone behind a room code — and because
 * `aiSlots` arrives from the client, that has to be enforced here rather than
 * in the lobby UI.
 */
const MIN_HUMANS = 2;

export interface RoomSeat {
  socketId: string; // connId, or `ai_seat_<n>` for AI seats
  name: string;
  seatIndex: number;
  teamId: TeamId;
  isAI?: boolean;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
}

export interface Room {
  code: string;
  hostSocketId: string;
  playerCount: 4 | 6 | 8 | 10;
  trumpMethod: TrumpMethod;
  gamePointsTarget: 3 | 5 | 7 | 10;
  seats: (RoomSeat | null)[];
  gameState: GameState | null;
  phase: 'lobby' | 'playing' | 'round_end' | 'game_over';
  createdAt: number;
  /** Updated on every successful mutation; drives garbage collection. */
  lastActivityAt: number;
  teamIds?: TeamId[];
  /** Was `(room as any)._lastRoundResult` on Render; now a real persisted field. */
  lastRoundResult?: { winnerTeamId: TeamId; category: 'normal' | 'mendikot' | 'whitewash' };
}

interface Attachment {
  connId: string;
}

type PublicGameState = Omit<GameState, 'players' | 'round'> & {
  players: Omit<Player, 'hand'>[];
  round: Omit<GameState['round'], 'trumpCard'>;
};

/**
 * Strip everything a client must not see:
 *  - players[].hand — a player only ever receives their own cards.
 *  - round.trumpCard — the concealed band hukum nomination. types.ts marks this
 *    "server only"; spreading `state` used to ship it to every client, which
 *    defeated the entire band hukum mechanic.
 */
function publicState(state: GameState): PublicGameState {
  const { trumpCard: _trumpCard, ...round } = state.round;
  return {
    ...state,
    round,
    players: state.players.map(({ hand: _hand, ...rest }) => rest),
  };
}

const LOBBY_TTL_MS = 30 * 60 * 1000;
/** An in-progress game abandoned for this long is garbage. */
const GAME_TTL_MS = 6 * 60 * 60 * 1000;
/** How often the GC alarm re-checks. */
const GC_INTERVAL_MS = 30 * 60 * 1000;

/** Largest client frame we will parse. Real messages are a few hundred bytes. */
const MAX_MESSAGE_BYTES = 8 * 1024;
/** Token bucket: short bursts are fine, sustained flooding is not. */
const RL_BURST = 25;
const RL_REFILL_PER_SEC = 3;
/** Misbehaviours tolerated before the socket is closed. */
const MAX_STRIKES = 5;

interface Bucket {
  tokens: number;
  ts: number;
}

export class MindiRoom {
  private ctx: DurableObjectState;
  private room: Room | null = null;
  private loaded = false;

  /**
   * Rate-limit state is intentionally in-memory rather than persisted: writing
   * it would itself consume the DO storage budget we are trying to protect.
   * Hibernation clears it, but hibernation only happens after a quiet period —
   * a client flooding us keeps the object awake, so the limiter is live exactly
   * when it is needed.
   */
  private buckets = new Map<string, Bucket>();
  private strikes = new Map<string, number>();

  constructor(ctx: DurableObjectState, _env: unknown) {
    this.ctx = ctx;
  }

  /** Token bucket. Returns false when the connection is over budget. */
  private allow(connId: string): boolean {
    const now = Date.now();
    const b = this.buckets.get(connId) ?? { tokens: RL_BURST, ts: now };
    b.tokens = Math.min(RL_BURST, b.tokens + ((now - b.ts) / 1000) * RL_REFILL_PER_SEC);
    b.ts = now;
    if (b.tokens < 1) {
      this.buckets.set(connId, b);
      return false;
    }
    b.tokens -= 1;
    this.buckets.set(connId, b);
    return true;
  }

  /** Records a misbehaviour; true once the socket should be closed. */
  private strike(connId: string): boolean {
    const n = (this.strikes.get(connId) ?? 0) + 1;
    this.strikes.set(connId, n);
    return n >= MAX_STRIKES;
  }

  private forget(connId: string): void {
    this.buckets.delete(connId);
    this.strikes.delete(connId);
  }

  // ── Persistence ────────────────────────────────────────────────────
  private async load(): Promise<Room | null> {
    if (!this.loaded) {
      this.room = (await this.ctx.storage.get<Room>('room')) ?? null;
      this.loaded = true;
    }
    return this.room;
  }

  private async save(): Promise<void> {
    if (!this.room) return;
    // Every mutation refreshes the clock the GC alarm reads, at no extra cost
    // since we are already writing.
    this.room.lastActivityAt = Date.now();
    await this.ctx.storage.put('room', this.room);
  }

  // ── Connection plumbing ────────────────────────────────────────────
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const roomCode = (url.searchParams.get('room') ?? '').toUpperCase();
    const wantsCreate = url.searchParams.get('create') === '1';

    await this.load();

    // Reject a join to a room that does not exist yet, before upgrading, so the
    // client gets a clean HTTP error rather than a socket that opens and dies.
    if (!wantsCreate && !this.room) {
      return new Response('Room not found', { status: 404 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const connId = crypto.randomUUID();
    server.serializeAttachment({ connId } satisfies Attachment);

    // acceptWebSocket (not server.accept()) is what makes hibernation possible:
    // an idle lobby costs nothing and never spins down.
    this.ctx.acceptWebSocket(server);

    if (wantsCreate && !this.room) {
      // Room is materialised by the create_room message, not here; we only
      // remember the code the client picked.
      await this.ctx.storage.put('pendingCode', roomCode);
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  private connIdOf(ws: WebSocket): string | null {
    const att = ws.deserializeAttachment() as Attachment | null;
    return att?.connId ?? null;
  }

  private send(ws: WebSocket, e: string, d: unknown): void {
    try {
      ws.send(JSON.stringify({ e, d }));
    } catch {
      /* socket already gone */
    }
  }

  /**
   * True when this connection currently occupies a seat.
   *
   * SECURITY: a socket is accepted before it has joined (the client connects,
   * then sends create_room/join_room), so "connected" must never be treated as
   * "is a player". Everything that reveals or mutates game state gates on this.
   */
  private isSeated(connId: string): boolean {
    return !!this.room?.seats.some(s => s?.socketId === connId);
  }

  /**
   * Broadcast to seated players only. Previously this fanned out to every
   * socket returned by getWebSockets(), so anyone who merely knew a room code
   * could open a connection and watch the whole game unfold.
   */
  private broadcast(e: string, d: unknown, exceptConnId?: string): void {
    for (const ws of this.ctx.getWebSockets()) {
      const id = this.connIdOf(ws);
      if (!id) continue;
      if (!this.isSeated(id)) continue;
      if (exceptConnId && id === exceptConnId) continue;
      this.send(ws, e, d);
    }
  }

  private toConn(connId: string, e: string, d: unknown): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (this.connIdOf(ws) === connId) {
        this.send(ws, e, d);
        return;
      }
    }
  }

  // ── Message dispatch ───────────────────────────────────────────────
  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== 'string') return;

    const connId = this.connIdOf(ws);
    if (!connId) return;

    // Refuse oversized frames before spending anything on JSON.parse.
    if (raw.length > MAX_MESSAGE_BYTES) {
      this.send(ws, 'error', { code: 'MESSAGE_TOO_LARGE', message: 'Message too large' });
      ws.close(1009, 'message too large');
      this.forget(connId);
      return;
    }

    // Throttle before touching storage — an unthrottled client can otherwise
    // burn the daily DO write budget and take multiplayer down for everyone.
    if (!this.allow(connId)) {
      this.send(ws, 'error', { code: 'RATE_LIMITED', message: 'Slow down' });
      if (this.strike(connId)) {
        ws.close(1008, 'rate limit exceeded');
        this.forget(connId);
      }
      return;
    }

    let msg: { e?: string; d?: any };
    try {
      msg = JSON.parse(raw);
    } catch {
      return this.send(ws, 'error', { code: 'BAD_JSON', message: 'Malformed message' });
    }
    if (!msg.e) return;

    await this.load();
    const d = msg.d ?? {};

    // Only these two may be sent by a connection that holds no seat — they are
    // how a connection acquires one. Everything else requires a seat, so an
    // unjoined socket cannot mutate or probe game state.
    if (msg.e !== 'create_room' && msg.e !== 'join_room' && !this.isSeated(connId)) {
      this.send(ws, 'error', {
        code: 'NOT_IN_ROOM',
        message: 'You must join the room before acting',
      });
      // A real client never does this, so treat repetition as probing.
      if (this.strike(connId)) {
        ws.close(1008, 'not a participant');
        this.forget(connId);
      }
      return;
    }

    switch (msg.e) {
      case 'create_room':       return this.onCreateRoom(ws, connId, d);
      case 'join_room':         return this.onJoinRoom(ws, connId, d);
      case 'rename_player':     return this.onRename(ws, connId, d);
      case 'start_game':        return this.onStartGame(ws, connId);
      case 'set_band_hukum':    return this.onSetBandHukum(ws, connId, d);
      case 'request_trump_reveal': return this.onRequestTrumpReveal(ws, connId);
      case 'play_card':         return this.onPlayCard(ws, connId, d);
      case 'next_round':        return this.onNextRound(ws, connId);
      case 'ai_play_card':      return this.onAiPlayCard(ws, connId, d);
      case 'ai_set_band_hukum': return this.onAiSetBandHukum(ws, connId, d);
      default:
        return this.send(ws, 'error', { code: 'UNKNOWN_EVENT', message: `Unknown event ${msg.e}` });
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.handleLeave(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.handleLeave(ws);
  }

  private async handleLeave(ws: WebSocket): Promise<void> {
    const connId = this.connIdOf(ws);
    if (!connId) return;
    this.forget(connId);
    await this.load();
    if (!this.room) return;

    const idx = this.room.seats.findIndex(s => s?.socketId === connId);
    if (idx === -1) return;

    this.room.seats[idx] = null;

    // Once no human holds a seat the room is unreachable in EVERY phase, not
    // just the lobby. This previously only ran for lobbies, so an abandoned
    // in-progress game leaked its storage permanently.
    const anyHuman = this.room.seats.some(s => s && !s.isAI);
    if (!anyHuman) {
      this.room = null;
      this.loaded = true;
      await this.ctx.storage.deleteAll();
      return;
    }

    await this.save();
    if (this.room.phase === 'lobby') {
      this.broadcast('player_left', { seatIndex: idx, players: this.lobbyPlayers() });
    } else {
      this.broadcast('player_disconnected', { seatIndex: idx });
    }
  }

  // ── Lobby helpers ──────────────────────────────────────────────────
  private lobbyPlayers() {
    if (!this.room) return [];
    return this.room.seats
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

  private settings() {
    return {
      playerCount: this.room!.playerCount,
      trumpMethod: this.room!.trumpMethod,
      gamePointsTarget: this.room!.gamePointsTarget,
    };
  }

  // ── Handlers ───────────────────────────────────────────────────────
  private async onCreateRoom(ws: WebSocket, connId: string, d: any): Promise<void> {
    if (this.room) {
      // Client-generated code collided with a live room (odds ~1 in 2.1bn).
      // The shim retries with a fresh code on this error.
      return this.send(ws, 'error', { code: 'CODE_TAKEN', message: 'Room code already in use' });
    }

    const code = (await this.ctx.storage.get<string>('pendingCode')) ?? '';
    if (!code) {
      return this.send(ws, 'error', { code: 'CREATE_FAILED', message: 'No room code reserved' });
    }

    // Everything below this point is trusted, so nothing above it may be.
    const checked = validateCreateRoom(d);
    if (!checked.ok) {
      return this.send(ws, 'error', { code: 'INVALID_INPUT', message: checked.error });
    }
    const { playerName, playerCount, trumpMethod, gamePointsTarget, aiSlots } = checked.value;

    // A room is for playing with other people. Leave space for at least one
    // more human besides the host, so a room can never be created that is
    // really a solo game wearing a room code. Solo-vs-AI has its own path and
    // does not come through here.
    //
    // This has to be checked on the server: `aiSlots` arrives from the client,
    // and a crafted payload could otherwise fill every non-host seat with AI.
    if (playerCount - 1 - aiSlots.length < MIN_HUMANS - 1) {
      return this.send(ws, 'error', {
        code: 'TOO_MANY_AI',
        message: `Leave at least ${MIN_HUMANS - 1} open seat for another player — rooms need ${MIN_HUMANS} real players.`,
      });
    }

    const seats: (RoomSeat | null)[] = Array(playerCount).fill(null);
    seats[0] = { socketId: connId, name: playerName, seatIndex: 0, teamId: 0 };

    for (const ai of aiSlots) {
      seats[ai.seatIndex] = {
        socketId: `ai_seat_${ai.seatIndex}`,
        name: ai.name,
        seatIndex: ai.seatIndex,
        teamId: (ai.seatIndex % 2) as TeamId,
        isAI: true,
        aiDifficulty: ai.difficulty,
      };
    }

    const now = Date.now();
    this.room = {
      code,
      hostSocketId: connId,
      playerCount,
      trumpMethod,
      gamePointsTarget,
      seats,
      gameState: null,
      phase: 'lobby',
      createdAt: now,
      lastActivityAt: now,
    };
    await this.save();

    // Replaces setInterval(cleanupStaleRooms) — expire an abandoned lobby.
    await this.ctx.storage.setAlarm(Date.now() + LOBBY_TTL_MS);

    this.send(ws, 'room_created', {
      roomCode: code,
      seatIndex: 0,
      players: this.lobbyPlayers(),
      settings: this.settings(),
    });
  }

  private async onJoinRoom(ws: WebSocket, connId: string, d: any): Promise<void> {
    if (!this.room) return this.send(ws, 'error', { code: 'JOIN_FAILED', message: 'Room not found' });
    if (this.room.phase !== 'lobby') {
      return this.send(ws, 'error', { code: 'JOIN_FAILED', message: 'Game already started' });
    }

    const checked = validateJoinRoom(d);
    if (!checked.ok) {
      return this.send(ws, 'error', { code: 'INVALID_INPUT', message: checked.error });
    }

    const nextSeat = this.room.seats.findIndex(s => s === null);
    if (nextSeat === -1) return this.send(ws, 'error', { code: 'JOIN_FAILED', message: 'Room is full' });

    const seat: RoomSeat = {
      socketId: connId,
      name: checked.value.playerName,
      seatIndex: nextSeat,
      teamId: (nextSeat % 2) as TeamId,
    };
    this.room.seats[nextSeat] = seat;
    await this.save();

    this.send(ws, 'room_joined', {
      roomCode: this.room.code,
      seatIndex: seat.seatIndex,
      players: this.lobbyPlayers(),
      settings: this.settings(),
    });

    this.broadcast(
      'player_joined',
      { name: seat.name, seatIndex: seat.seatIndex, teamId: seat.teamId, players: this.lobbyPlayers() },
      connId,
    );
  }

  private async onRename(ws: WebSocket, connId: string, d: any): Promise<void> {
    if (!this.room) return this.send(ws, 'error', { code: 'RENAME_FAILED', message: 'Room not found' });
    if (this.room.phase !== 'lobby') {
      return this.send(ws, 'error', { code: 'RENAME_FAILED', message: 'Game already started' });
    }
    const idx = this.room.seats.findIndex(s => s?.socketId === connId);
    if (idx === -1) return this.send(ws, 'error', { code: 'RENAME_FAILED', message: 'Not in room' });

    const trimmed = cleanName(d.newName);
    if (!trimmed) return this.send(ws, 'error', { code: 'RENAME_FAILED', message: 'Name cannot be empty' });

    this.room.seats[idx]!.name = trimmed;
    await this.save();
    this.broadcast('player_renamed', { players: this.lobbyPlayers() });
  }

  private async onStartGame(ws: WebSocket, connId: string): Promise<void> {
    if (!this.room || this.room.hostSocketId !== connId) {
      return this.send(ws, 'error', { code: 'START_FAILED', message: 'Unauthorized or room not found' });
    }
    if (this.room.phase !== 'lobby') {
      return this.send(ws, 'error', { code: 'START_FAILED', message: 'Already started' });
    }
    if (this.room.seats.some(s => s === null)) {
      return this.send(ws, 'error', { code: 'START_FAILED', message: 'Not all players joined' });
    }

    // Seats being full is not the same as having enough people: AI seats are
    // filled the moment the room is created. Count the humans separately.
    const humans = this.room.seats.filter(s => s && !s.isAI).length;
    if (humans < MIN_HUMANS) {
      return this.send(ws, 'error', {
        code: 'NEED_MORE_HUMANS',
        message: `Waiting for ${MIN_HUMANS - humans} more player${MIN_HUMANS - humans === 1 ? '' : 's'} to join.`,
      });
    }

    // Shuffle players across seats, then alternate teams so no two teammates
    // ever sit adjacent (Mindi rule) — same algorithm as the Render version.
    const allSeats = this.room.seats as RoomSeat[];
    const shuffled = [...allSeats];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const half = this.room.playerCount / 2;
    const newSeats: (RoomSeat | null)[] = Array(this.room.playerCount).fill(null);
    const teamIds: TeamId[] = Array(this.room.playerCount).fill(0) as TeamId[];

    for (let k = 0; k < half; k++) {
      const evenIdx = k * 2;
      newSeats[evenIdx] = { ...shuffled[k], seatIndex: evenIdx, teamId: 0 };
      teamIds[evenIdx] = 0;
    }
    for (let k = 0; k < half; k++) {
      const oddIdx = k * 2 + 1;
      newSeats[oddIdx] = { ...shuffled[half + k], seatIndex: oddIdx, teamId: 1 };
      teamIds[oddIdx] = 1;
    }

    this.room.seats = newSeats;
    this.room.teamIds = teamIds;

    const seats = this.room.seats as RoomSeat[];
    const state = initGame(
      this.room.code,
      seats.map(s => s.name),
      seats.map(s => s.socketId),
      this.settings(),
      0,
      [0, 0],
      teamIds,
    );

    this.room.gameState = state;
    this.room.phase = 'playing';
    await this.save();
    // The lobby TTL no longer applies, but keep an alarm armed: an abandoned
    // in-progress game still has to be collected. Deleting the alarm here was
    // what let orphaned rooms accumulate.
    await this.ctx.storage.setAlarm(Date.now() + GC_INTERVAL_MS);

    this.broadcastRoundState(state, 'game_started');
  }

  private async onSetBandHukum(ws: WebSocket, connId: string, d: any): Promise<void> {
    if (!this.room?.gameState) return this.send(ws, 'error', { code: 'NO_GAME', message: 'No active game' });
    const seatIndex = this.room.gameState.players.findIndex(p => p.id === connId);
    if (seatIndex === -1) return this.send(ws, 'error', { code: 'NOT_IN_GAME', message: 'Not in game' });

    const card = validateCardId(d.cardId);
    if (!card.ok) return this.send(ws, 'error', { code: 'INVALID_INPUT', message: card.error });

    const { newState, error } = applyBandHukum(this.room.gameState, seatIndex, card.value);
    if (error) return this.send(ws, 'error', { code: 'INVALID_MOVE', message: error });

    this.room.gameState = newState;
    await this.save();
    this.broadcast('game_state_update', { gameState: publicState(newState) });
  }

  /**
   * SECURITY: this previously had no checks whatsoever — any socket, including
   * one that never joined a seat, could force the hidden trump to be revealed.
   */
  private async onRequestTrumpReveal(ws: WebSocket, connId: string): Promise<void> {
    if (!this.room?.gameState) {
      return this.send(ws, 'error', { code: 'NO_GAME', message: 'No active game' });
    }

    const state = this.room.gameState;

    // Must hold a seat in this game.
    const seatIndex = state.players.findIndex(p => p.id === connId);
    if (seatIndex === -1) {
      return this.send(ws, 'error', { code: 'NOT_IN_GAME', message: 'Not in game' });
    }

    // Only Band Hukum B lets a player choose to reveal; mode A auto-reveals
    // inside playCard when someone cannot follow suit.
    if (state.config.trumpMethod !== 'band_hukum_b') {
      return this.send(ws, 'error', { code: 'NOT_ALLOWED', message: 'Trump cannot be revealed on demand in this mode' });
    }

    // Only on your own turn — revealing is a move, not a free action.
    if (state.round.currentTurnSeatIndex !== seatIndex) {
      return this.send(ws, 'error', { code: 'NOT_YOUR_TURN', message: 'Not your turn' });
    }

    const { newState, error } = revealBandHukum(state);
    if (error) return this.send(ws, 'error', { code: 'INVALID_MOVE', message: error });

    this.room.gameState = newState;
    await this.save();
    this.broadcast('trump_revealed', {
      trumpSuit: newState.round.trumpSuit,
      gameState: publicState(newState),
    });
  }

  private async onPlayCard(ws: WebSocket, connId: string, d: any): Promise<void> {
    if (!this.room?.gameState) return this.send(ws, 'error', { code: 'NO_GAME', message: 'No active game' });
    const seatIndex = this.room.gameState.players.findIndex(p => p.id === connId);
    if (seatIndex === -1) return this.send(ws, 'error', { code: 'NOT_IN_GAME', message: 'Not in game' });
    const card = validateCardId(d.cardId);
    if (!card.ok) return this.send(ws, 'error', { code: 'INVALID_INPUT', message: card.error });
    await this.applyPlay(ws, seatIndex, card.value);
  }

  private async onAiPlayCard(ws: WebSocket, connId: string, d: any): Promise<void> {
    if (!this.room?.gameState) return this.send(ws, 'error', { code: 'NO_GAME', message: 'No active game' });
    if (this.room.hostSocketId !== connId) {
      return this.send(ws, 'error', { code: 'UNAUTHORIZED', message: 'Only host can play for AI' });
    }
    const seat = validateSeatIndex(d.seatIndex, this.room.playerCount);
    if (!seat.ok) return this.send(ws, 'error', { code: 'INVALID_INPUT', message: seat.error });
    const card = validateCardId(d.cardId);
    if (!card.ok) return this.send(ws, 'error', { code: 'INVALID_INPUT', message: card.error });

    if (!this.room.seats[seat.value]?.isAI) {
      return this.send(ws, 'error', { code: 'NOT_AI', message: 'Seat is not an AI' });
    }
    await this.applyPlay(ws, seat.value, card.value);
  }

  private async onAiSetBandHukum(ws: WebSocket, connId: string, d: any): Promise<void> {
    if (!this.room?.gameState) return this.send(ws, 'error', { code: 'NO_GAME', message: 'No active game' });
    if (this.room.hostSocketId !== connId) {
      return this.send(ws, 'error', { code: 'UNAUTHORIZED', message: 'Only host can act for AI' });
    }
    const seat = validateSeatIndex(d.seatIndex, this.room.playerCount);
    if (!seat.ok) return this.send(ws, 'error', { code: 'INVALID_INPUT', message: seat.error });
    const card = validateCardId(d.cardId);
    if (!card.ok) return this.send(ws, 'error', { code: 'INVALID_INPUT', message: card.error });

    if (!this.room.seats[seat.value]?.isAI) {
      return this.send(ws, 'error', { code: 'NOT_AI', message: 'Seat is not an AI' });
    }

    const { newState, error } = applyBandHukum(this.room.gameState, seat.value, card.value);
    if (error) return this.send(ws, 'error', { code: 'INVALID_MOVE', message: error });

    this.room.gameState = newState;
    await this.save();
    this.broadcast('game_state_update', { gameState: publicState(newState) });
  }

  /**
   * Shared by play_card and ai_play_card. On Render these two handlers were
   * near-identical copies; folding them together removes the risk of the two
   * paths drifting apart.
   */
  private async applyPlay(ws: WebSocket, seatIndex: number, cardId: string): Promise<void> {
    const result = enginePlayCard(this.room!.gameState!, seatIndex, cardId);
    if (result.error) return this.send(ws, 'error', { code: 'INVALID_MOVE', message: result.error });

    this.room!.gameState = result.newState;

    const lastTrick = result.newState.round.completedTricks.at(-1);
    this.broadcast('card_played', {
      seatIndex,
      cardId,
      trickComplete: result.trickComplete,
      gameState: publicState(result.newState),
      ...(result.trickComplete && {
        trickResult: {
          winnerSeat: lastTrick?.winnerSeatIndex,
          mindisInTrick: lastTrick?.mindisInTrick ?? 0,
          teamMindis: result.newState.round.teamMindis,
          teamTricks: result.newState.round.teamTricks,
        },
      }),
    });

    if (result.roundComplete && result.roundResult) {
      this.room!.phase = result.newState.phase as 'round_end' | 'game_over';
      this.room!.lastRoundResult = result.roundResult;

      if (result.newState.phase === 'game_over') {
        this.broadcast('game_over', {
          winnerTeam: result.newState.winnerTeamId,
          finalScores: result.newState.gamePoints,
          roundResult: result.roundResult,
        });
      } else {
        this.broadcast('round_complete', {
          roundResult: result.roundResult,
          gamePoints: result.newState.gamePoints,
        });
      }
    }

    await this.save();
  }

  private async onNextRound(ws: WebSocket, connId: string): Promise<void> {
    if (!this.room || this.room.hostSocketId !== connId) return;
    if (!this.room.gameState || this.room.phase !== 'round_end') return;

    // A mid-game disconnect nulls a seat. The seats.map() below assumes every
    // entry is present, so without this guard the handler throws a TypeError
    // server-side instead of reporting a problem.
    if (this.room.seats.some(s => s === null)) {
      return this.send(ws, 'error', {
        code: 'SEAT_EMPTY',
        message: 'A player left — cannot start the next round',
      });
    }

    const stored = this.room.lastRoundResult;
    if (!stored) return this.send(ws, 'error', { code: 'NO_RESULT', message: 'No round result stored' });

    const prev = this.room.gameState;
    const seats = this.room.seats as RoomSeat[];
    const prevDealer = prev.round.dealerSeatIndex;
    const dealerTeam = prev.players[prevDealer].teamId;
    const newDealer = nextDealerSeat(
      prevDealer,
      dealerTeam,
      stored.winnerTeamId,
      stored.category,
      this.room.playerCount,
    );

    const newState = initGame(
      this.room.code,
      seats.map(s => s.name),
      seats.map(s => s.socketId),
      this.settings(),
      newDealer,
      [...prev.gamePoints] as [number, number],
      this.room.teamIds,
    );

    this.room.gameState = newState;
    this.room.phase = 'playing';
    await this.save();

    this.broadcastRoundState(newState, 'round_started');
  }

  /** Each human gets their own hand; the host additionally gets the AI hands. */
  private broadcastRoundState(state: GameState, eventName: 'game_started' | 'round_started'): void {
    const aiHands: Record<number, Card[]> = {};
    for (const seat of this.room!.seats) {
      if (seat?.isAI) aiHands[seat.seatIndex] = state.players[seat.seatIndex].hand;
    }
    const hasAI = Object.keys(aiHands).length > 0;

    for (const player of state.players) {
      if (player.id.startsWith('ai_seat_')) continue;
      const isHost = player.id === this.room!.hostSocketId;
      this.toConn(player.id, eventName, {
        gameState: publicState(state),
        myHand: player.hand,
        mySeatIndex: player.seatIndex,
        ...(isHost && hasAI && { aiHands }),
      });
    }
  }

  /**
   * Garbage collector. Deletes a room only when nobody is connected AND it has
   * been idle past its TTL, otherwise re-arms itself. Hibernated sockets are
   * still reported by getWebSockets(), so a zero count means genuinely nobody
   * is attached — a live game is never collected out from under its players.
   */
  async alarm(): Promise<void> {
    await this.load();
    if (!this.room) return;

    const now = Date.now();
    const ttl = this.room.phase === 'lobby' ? LOBBY_TTL_MS : GAME_TTL_MS;
    // Fall back to createdAt for rooms persisted before lastActivityAt existed.
    const idle = now - (this.room.lastActivityAt ?? this.room.createdAt);

    if (this.ctx.getWebSockets().length === 0 && idle > ttl) {
      this.room = null;
      this.loaded = true;
      await this.ctx.storage.deleteAll();
      return;
    }

    await this.ctx.storage.setAlarm(now + GC_INTERVAL_MS);
  }
}
