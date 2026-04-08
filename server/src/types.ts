// Shared game types — keep in sync with src/app/types.ts

export type Suit = 'hearts' | 'diamonds' | 'spades' | 'clubs';
export type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '2' | '3';
export type TeamId = 0 | 1;
export type TrumpMethod = 'random' | 'band_hukum_a' | 'band_hukum_b' | 'cut_hukum';
export type GamePhase = 'lobby' | 'trump_selection' | 'playing' | 'round_end' | 'game_over';

export interface Card {
  suit: Suit;
  rank: Rank;
  isFiller: boolean;
  deckIndex: number;
  id: string;
}

export interface Player {
  id: string;          // socket ID in online mode
  name: string;
  seatIndex: number;
  teamId: TeamId;
  hand: Card[];
  cardCount: number;
}

export interface GameConfig {
  playerCount: 4 | 6 | 8 | 10;
  deckCount: 2 | 3 | 4 | 5;
  trumpMethod: TrumpMethod;
  gamePointsTarget: 3 | 5 | 7 | 10;
  totalMindis: 8 | 12 | 16 | 20;
  mindiMajority: 5 | 7 | 9 | 11;
  fillerCards: Card[];
}

export interface TrickEntry {
  seatIndex: number;
  card: Card;
}

export interface CompletedTrick {
  cards: TrickEntry[];
  winnerSeatIndex: number;
  mindisInTrick: number;
}

export interface RoundState {
  dealerSeatIndex: number;
  currentLeaderSeatIndex: number;
  currentTurnSeatIndex: number;
  trumpSuit: Suit | null;
  trumpCard: Card | null;   // band hukum hidden card (server only)
  trumpRevealed: boolean;
  currentTrick: {
    cards: TrickEntry[];
    ledSuit: Suit | null;
  };
  completedTricks: CompletedTrick[];
  teamMindis: [number, number];
  teamTricks: [number, number];
  trickNumber: number;
}

export interface GameState {
  roomCode: string;
  config: GameConfig;
  players: Player[];
  round: RoundState;
  gamePoints: [number, number];
  phase: GamePhase;
  winnerTeamId: TeamId | null;
}

export interface RoundResult {
  winnerTeamId: TeamId;
  category: 'normal' | 'mendikot' | 'whitewash';
  pointsAwarded: number;
}

// ── WebSocket event payloads ──────────────────────────────────────

export interface CreateRoomPayload {
  playerName: string;
  playerCount: 4 | 6 | 8 | 10;
  trumpMethod: TrumpMethod;
  gamePointsTarget: 3 | 5 | 7 | 10;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
}

/** Public view of a player in the lobby (no hand) */
export interface LobbyPlayer {
  name: string;
  seatIndex: number;
  teamId: TeamId;
  connected: boolean;
  isAI?: boolean;
  aiDifficulty?: string;
}

/** State sent to each player on game_started — hand is private */
export interface PlayerGameView {
  gameState: Omit<GameState, 'players'> & {
    players: Omit<Player, 'hand'>[];
  };
  myHand: Card[];
  mySeatIndex: number;
}
