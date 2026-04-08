export type Suit = 'hearts' | 'diamonds' | 'spades' | 'clubs';
export type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '2' | '3';
export type TeamId = 0 | 1;
export type TrumpMethod = 'random' | 'band_hukum_a' | 'band_hukum_b' | 'cut_hukum';

export interface Card {
  suit: Suit;
  rank: Rank;
  isFiller: boolean;
  deckIndex: number;
  id: string;
}

export interface Player {
  id: string;
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

export interface RoundResult {
  winnerTeamId: TeamId;
  category: 'normal' | 'mendikot' | 'whitewash';
  pointsAwarded: number;
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
  trumpCard: Card | null;
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

export type GamePhase = 'lobby' | 'trump_selection' | 'playing' | 'round_end' | 'game_over';

export interface GameState {
  roomCode: string;
  config: GameConfig;
  players: Player[];
  round: RoundState;
  gamePoints: [number, number];
  phase: GamePhase;
  winnerTeamId: TeamId | null;
}
