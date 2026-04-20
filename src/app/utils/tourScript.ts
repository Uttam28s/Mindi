import { Card, GameState, Suit, Rank, TeamId } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────

export type TourAction =
  | { type: 'none' }
  | { type: 'play_card'; cardId: string }
  | { type: 'click_next' };

export interface TourHighlight   { type: 'card'; cardId: string; pulseColor?: string }
export interface TourSeatHL      { type: 'seat'; seatIndex: number }
export interface TourAreaHL      { type: 'area'; areaId: 'hand' | 'table' | 'trump_indicator' | 'score_bar' }
export type TourHighlightSpec    = TourHighlight | TourSeatHL | TourAreaHL;

export interface TourStep {
  id: string;
  title: string;
  description: string;
  highlights: TourHighlightSpec[];
  requiredAction: TourAction;
  tooltipPosition?: 'top' | 'bottom' | 'center';
  aiPlaysBeforeStep?: Array<{ seatIndex: number; cardId: string }>;
}

export interface AiPlayScript {
  stepId: string;
  plays: Array<{ seatIndex: number; cardId: string; delayMs: number }>;
}

export interface TourScenario {
  initialGameState: GameState;
  steps: TourStep[];
  aiPlayScripts: AiPlayScript[];
}

// ── Card builder ───────────────────────────────────────────────────────────

function mk(suit: Suit, rank: Rank, seat: number, isFiller = false, deckIndex = 0): Card {
  const deckTag = isFiller ? 'f' : `d${deckIndex}`;
  return { suit, rank, isFiller, deckIndex, id: `tour_${suit}_${rank}_s${seat}_${deckTag}` };
}

// ── Scripted hands (60 cards total, 15 per seat, no duplicates) ────────────
//
// Seat teams: 0+2 = Team A (player + top), 1+3 = Team B (right + left)
// Trump: hearts. Seat 0 has NO spades (enables trump-ruff step).
//
// Verified card distribution:
//  d0 ♥: A(s1) K(s0) Q(s0) J(s1) 10(s2) 9(s1) 8(s0)
//  d0 ♦: A(s0) K(s1) Q(s1) J(s0) 10(s0) 9(s0) 8(s0)
//  d0 ♠: A(s1) K(s2) Q(s1) J(s1) 10(s1) 9(s3) 8(s3)
//  d0 ♣: A(s1) K(s1) Q(s1) J(s0) 10(s0) 9(s0) 8(s0)
//  d1 ♥: A(s2) K(s2) Q(s0) J(s2) 10(s3) 9(s3) 8(s3)
//  d1 ♦: A(s2) K(s2) Q(s1) J(s2) 10(s3) 9(s3) 8(s3)
//  d1 ♠: A(s2) K(s2) Q(s2) J(s2) 10(s3) 9(s3) 8(s3)
//  d1 ♣: A(s2) K(s2) Q(s3) J(s2) 10(s3) 9(s1) 8(s3)
//  fillers: 7♥(s0) 7♦(s0) 7♠(s1) 7♣(s3)

const TOUR_HANDS: Record<number, Card[]> = {
  // Seat 0 — YOU (Team A) — no spades
  0: [
    mk('hearts',   'K',  0, false, 0), mk('hearts',   'Q',  0, false, 0),
    mk('hearts',   'Q',  0, false, 1), mk('hearts',   '8',  0, false, 0),
    mk('hearts',   '7',  0, true),
    mk('diamonds', 'A',  0, false, 0), mk('diamonds', '10', 0, false, 0),
    mk('diamonds', 'J',  0, false, 0), mk('diamonds', '9',  0, false, 0),
    mk('diamonds', '8',  0, false, 0), mk('diamonds', '7',  0, true),
    mk('clubs',    '10', 0, false, 0), mk('clubs',    'J',  0, false, 0),
    mk('clubs',    '9',  0, false, 0), mk('clubs',    '8',  0, false, 0),
  ],
  // Seat 1 — Team B (right)
  1: [
    mk('hearts',   'A',  1, false, 0), mk('hearts',   'J',  1, false, 0),
    mk('hearts',   '9',  1, false, 0),
    mk('diamonds', 'K',  1, false, 0), mk('diamonds', 'Q',  1, false, 0),
    mk('diamonds', 'Q',  1, false, 1),
    mk('spades',   'A',  1, false, 0), mk('spades',   'Q',  1, false, 0),
    mk('spades',   'J',  1, false, 0), mk('spades',   '10', 1, false, 0),
    mk('spades',   '7',  1, true),
    mk('clubs',    'A',  1, false, 0), mk('clubs',    'K',  1, false, 0),
    mk('clubs',    'Q',  1, false, 0), mk('clubs',    '9',  1, false, 1),
  ],
  // Seat 2 — Team A (top — teammate)
  2: [
    mk('hearts',   '10', 2, false, 0), mk('hearts',   'A',  2, false, 1),
    mk('hearts',   'K',  2, false, 1), mk('hearts',   'J',  2, false, 1),
    mk('diamonds', 'A',  2, false, 1), mk('diamonds', 'K',  2, false, 1),
    mk('diamonds', 'J',  2, false, 1),
    mk('spades',   'A',  2, false, 1), mk('spades',   'K',  2, false, 0),
    mk('spades',   'K',  2, false, 1), mk('spades',   'Q',  2, false, 1),
    mk('spades',   'J',  2, false, 1),
    mk('clubs',    'A',  2, false, 1), mk('clubs',    'K',  2, false, 1),
    mk('clubs',    'J',  2, false, 1),
  ],
  // Seat 3 — Team B (left)
  3: [
    mk('hearts',   '10', 3, false, 1), mk('hearts',   '9',  3, false, 1),
    mk('hearts',   '8',  3, false, 1),
    mk('diamonds', '10', 3, false, 1), mk('diamonds', '9',  3, false, 1),
    mk('diamonds', '8',  3, false, 1),
    mk('spades',   '9',  3, false, 0), mk('spades',   '8',  3, false, 0),
    mk('spades',   '10', 3, false, 1), mk('spades',   '9',  3, false, 1),
    mk('spades',   '8',  3, false, 1),
    mk('clubs',    'Q',  3, false, 1), mk('clubs',    '10', 3, false, 1),
    mk('clubs',    '8',  3, false, 1), mk('clubs',    '7',  3, true),
  ],
};

// DEV-only sanity check
if (import.meta.env.DEV) {
  const allIds = Object.values(TOUR_HANDS).flat().map(c => c.id);
  if (allIds.length !== 60) console.error('[Tour] Card count wrong:', allIds.length);
  if (new Set(allIds).size !== 60) {
    const seen = new Set<string>();
    allIds.forEach(id => { if (seen.has(id)) console.error('[Tour] Duplicate card ID:', id); seen.add(id); });
  }
}

// ── Step definitions ───────────────────────────────────────────────────────

// Helper card IDs
const ID = {
  // s0 cards
  A_diamonds:  'tour_diamonds_A_s0_d0',
  ten_diamonds:'tour_diamonds_10_s0_d0',
  K_hearts:    'tour_hearts_K_s0_d0',
  Q_hearts_d0: 'tour_hearts_Q_s0_d0',
  Q_hearts_d1: 'tour_hearts_Q_s0_d1',
  eight_hearts:'tour_hearts_8_s0_d0',
  J_clubs_s0:  'tour_clubs_J_s0_d0',
  ten_clubs:   'tour_clubs_10_s0_d0',
  // s1 cards
  K_diamonds_s1: 'tour_diamonds_K_s1_d0',
  J_hearts_s1:   'tour_hearts_J_s1_d0',
  K_clubs_s1:    'tour_clubs_K_s1_d0',
  nine_clubs_s1: 'tour_clubs_9_s1_d1',
  J_spades_s1:   'tour_spades_J_s1_d0',
  // s2 cards
  J_diamonds_s2: 'tour_diamonds_J_s2_d1',
  ten_hearts_s2: 'tour_hearts_10_s2_d0',
  A_clubs_s2:    'tour_clubs_A_s2_d1',
  K_clubs_s2:    'tour_clubs_K_s2_d1',
  K_spades_s2:   'tour_spades_K_s2_d0',
  // s3 cards
  nine_diamonds_s3: 'tour_diamonds_9_s3_d1',
  ten_hearts_s3:    'tour_hearts_10_s3_d1',
  Q_clubs_s3:       'tour_clubs_Q_s3_d1',
  eight_clubs_s3:   'tour_clubs_8_s3_d1',
  nine_spades_s3:   'tour_spades_9_s3_d0',
};

const TOUR_STEPS: TourStep[] = [
  {
    id: 'orientation',
    title: 'Welcome to Mindi!',
    description:
      "You're the bottom player. Your teammate is directly across (top). The two side players are your opponents. In a 4-player game: seats 0 + 2 vs seats 1 + 3.",
    highlights: [{ type: 'area', areaId: 'table' }],
    requiredAction: { type: 'click_next' },
    tooltipPosition: 'center',
  },
  {
    id: 'card_anatomy',
    title: 'Your Hand & the Mindi',
    description:
      "Each card has a suit (♥ ♦ ♠ ♣) and a rank (A K Q J 10 9 8). The most important card is the 10 — called a Mindi! Capture 3 or more Mindis in a round to score a point for your team.",
    highlights: [
      { type: 'card', cardId: ID.ten_diamonds },
      { type: 'card', cardId: ID.ten_clubs },
      { type: 'area', areaId: 'hand' },
    ],
    requiredAction: { type: 'click_next' },
    tooltipPosition: 'bottom',
  },
  {
    id: 'trump_intro',
    title: 'Trump Suit — Hukum!',
    description:
      "See the ♥ badge at the top? Hearts is the trump suit (Hukum). A trump card beats ANY card from any other suit — even the 2♥ beats the Ace of Spades!",
    highlights: [{ type: 'area', areaId: 'trump_indicator' }],
    requiredAction: { type: 'click_next' },
    tooltipPosition: 'top',
  },
  {
    id: 'lead_trick',
    title: 'Lead the First Trick',
    description:
      "It's your turn to lead! Play the Ace of Diamonds ♦ — the highest diamond. All other players must follow the diamond suit. A♦ beats everything in diamonds!",
    highlights: [{ type: 'card', cardId: ID.A_diamonds }],
    requiredAction: { type: 'play_card', cardId: ID.A_diamonds },
    tooltipPosition: 'bottom',
  },
  {
    id: 'trump_power',
    title: 'Trump Wins Everything!',
    description:
      "Now lead K♥ — a powerful trump card! Everyone must follow hearts. Your opponents have the 10♥ Mindis — but your King beats them all. You'll capture TWO Mindis in one trick!",
    highlights: [{ type: 'card', cardId: ID.K_hearts }],
    requiredAction: { type: 'play_card', cardId: ID.K_hearts },
    tooltipPosition: 'bottom',
  },
  {
    id: 'teammate_trick',
    title: 'Watch Your Teammate Shine',
    description:
      "Lead J♣ and observe: each player follows clubs. Your teammate (top seat) plays A♣ — the highest club — and wins the trick for Team A! Teammates help each other win tricks.",
    highlights: [{ type: 'card', cardId: ID.J_clubs_s0 }],
    requiredAction: { type: 'play_card', cardId: ID.J_clubs_s0 },
    tooltipPosition: 'bottom',
  },
  {
    id: 'throw_mindi',
    title: 'Give Your Mindi to Teammate',
    description:
      "Your teammate (top) leads K♣ — guaranteed to win! You must follow clubs. Throw your 10♣ Mindi onto this trick. Your teammate's K♣ will win, and the Mindi score goes to Team A!",
    highlights: [
      { type: 'card', cardId: ID.ten_clubs },
      { type: 'seat', seatIndex: 2 },
    ],
    requiredAction: { type: 'play_card', cardId: ID.ten_clubs },
    aiPlaysBeforeStep: [
      { seatIndex: 2, cardId: ID.K_clubs_s2 },
      { seatIndex: 1, cardId: ID.nine_clubs_s1 },
    ],
    tooltipPosition: 'bottom',
  },
  {
    id: 'trump_ruff',
    title: 'Ruff with Trump When Void',
    description:
      "Your teammate leads K♠ but you have NO spades — you're void! When void in the led suit, you can play ANY card. Play 8♥ (trump) to steal the trick. Even the lowest trump beats the highest non-trump!",
    highlights: [
      { type: 'card', cardId: ID.eight_hearts },
      { type: 'seat', seatIndex: 2 },
    ],
    requiredAction: { type: 'play_card', cardId: ID.eight_hearts },
    aiPlaysBeforeStep: [
      { seatIndex: 2, cardId: ID.K_spades_s2 },
      { seatIndex: 1, cardId: ID.J_spades_s1 },
    ],
    tooltipPosition: 'bottom',
  },
  {
    id: 'scoring',
    title: 'How Scoring Works',
    description:
      "Each round: the team with 3+ Mindis scores 1 point. All 4 Mindis = Mendikot (2 pts). Win all 15 tricks = Whitewash (3 pts). First team to reach the point target wins the game!",
    highlights: [{ type: 'area', areaId: 'score_bar' }],
    requiredAction: { type: 'click_next' },
    tooltipPosition: 'top',
  },
  {
    id: 'complete',
    title: "You're Ready to Play!",
    description:
      "You've learned the basics of Mindi! Capture Mindis, use trump wisely, support your teammate, and lead strong. Good luck — and have fun!",
    highlights: [],
    requiredAction: { type: 'click_next' },
    tooltipPosition: 'center',
  },
];

// ── AI play scripts ────────────────────────────────────────────────────────
// After the player performs the step's required action, these plays fire in order.

const AI_PLAY_SCRIPTS: AiPlayScript[] = [
  {
    stepId: 'lead_trick',
    // Turn order from s0: s0 played → s3 → s2 → s1
    plays: [
      { seatIndex: 3, cardId: ID.nine_diamonds_s3,  delayMs: 700  },
      { seatIndex: 2, cardId: ID.J_diamonds_s2,     delayMs: 1400 },
      { seatIndex: 1, cardId: ID.K_diamonds_s1,     delayMs: 2100 },
    ],
  },
  {
    stepId: 'trump_power',
    // Turn order from s0: s0 played K♥ → s3 → s2 → s1
    plays: [
      { seatIndex: 3, cardId: ID.ten_hearts_s3, delayMs: 700  },
      { seatIndex: 2, cardId: ID.ten_hearts_s2, delayMs: 1400 },
      { seatIndex: 1, cardId: ID.J_hearts_s1,   delayMs: 2100 },
    ],
  },
  {
    stepId: 'teammate_trick',
    // Turn order from s0: s0 played J♣ → s3 → s2 → s1
    plays: [
      { seatIndex: 3, cardId: ID.Q_clubs_s3,   delayMs: 700  },
      { seatIndex: 2, cardId: ID.A_clubs_s2,   delayMs: 1400 },
      { seatIndex: 1, cardId: ID.K_clubs_s1,   delayMs: 2100 },
    ],
  },
  {
    stepId: 'throw_mindi',
    // aiPlaysBeforeStep already covered s2 K♣ and s1 9♣. Now s0 plays (required).
    // After s0 plays 10♣, s3 plays last.
    plays: [
      { seatIndex: 3, cardId: ID.eight_clubs_s3, delayMs: 700 },
    ],
  },
  {
    stepId: 'trump_ruff',
    // aiPlaysBeforeStep covered s2 K♠ and s1 J♠. s0 plays 8♥ (required). s3 plays last.
    plays: [
      { seatIndex: 3, cardId: ID.nine_spades_s3, delayMs: 700 },
    ],
  },
];

// ── Build TourScenario ─────────────────────────────────────────────────────

export function buildTourScenario(playerName: string): TourScenario {
  const players = [
    { id: 'tour_p0', name: playerName, seatIndex: 0, teamId: 0 as TeamId, hand: [...TOUR_HANDS[0]], cardCount: 15 },
    { id: 'tour_p1', name: 'Riya',     seatIndex: 1, teamId: 1 as TeamId, hand: [...TOUR_HANDS[1]], cardCount: 15 },
    { id: 'tour_p2', name: 'Arjun',    seatIndex: 2, teamId: 0 as TeamId, hand: [...TOUR_HANDS[2]], cardCount: 15 },
    { id: 'tour_p3', name: 'Vikram',   seatIndex: 3, teamId: 1 as TeamId, hand: [...TOUR_HANDS[3]], cardCount: 15 },
  ];

  const initialGameState: GameState = {
    roomCode: 'TOUR',
    config: {
      playerCount: 4,
      deckCount: 2,
      trumpMethod: 'random',
      gamePointsTarget: 5,
      totalMindis: 8,
      mindiMajority: 5,
      fillerCards: [
        mk('hearts',   '7', 0, true),
        mk('diamonds', '7', 0, true),
        mk('spades',   '7', 1, true),
        mk('clubs',    '7', 3, true),
      ],
    },
    players,
    round: {
      dealerSeatIndex: 3,
      currentLeaderSeatIndex: 0,
      currentTurnSeatIndex: 0,
      trumpSuit: 'hearts',
      trumpCard: null,
      trumpRevealed: true,
      currentTrick: { cards: [], ledSuit: null },
      completedTricks: [],
      teamMindis: [0, 0],
      teamTricks: [0, 0],
      trickNumber: 1,
    },
    gamePoints: [0, 0],
    phase: 'playing',
    winnerTeamId: null,
  };

  return {
    initialGameState,
    steps: TOUR_STEPS,
    aiPlayScripts: AI_PLAY_SCRIPTS,
  };
}
