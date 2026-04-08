import { Card, Suit, Rank, TrickEntry } from '../types';

const RANK_VALUE: Record<Rank, number> = {
  'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10,
  '9': 9, '8': 8, '7': 7, '2': 2, '3': 1
};

export function getRankValue(rank: Rank): number {
  return RANK_VALUE[rank] ?? 0;
}

/**
 * Returns true if card `a` beats card `b` given trump/led suit context.
 * PRD §7.4: trump beats non-trump; among same suit higher rank wins;
 * off-suit non-trump cards cannot win.
 */
export function cardBeats(a: Card, b: Card, ledSuit: Suit, trumpSuit: Suit | null): boolean {
  const aIsTrump = trumpSuit !== null && a.suit === trumpSuit;
  const bIsTrump = trumpSuit !== null && b.suit === trumpSuit;

  if (aIsTrump && !bIsTrump) return true;
  if (!aIsTrump && bIsTrump) return false;

  // Both trump or both non-trump
  // PRD: if same card played, last player's card wins (>= so later card beats earlier on tie)
  if (a.suit === b.suit) return getRankValue(a.rank) >= getRankValue(b.rank);

  // Different suits, neither is trump: only led-suit card can win
  if (a.suit === ledSuit && b.suit !== ledSuit) return true;
  return false;
}

/**
 * Resolve a completed trick. Returns the seatIndex of the winner.
 * PRD §7.4
 */
export function resolveTrick(trick: TrickEntry[], ledSuit: Suit, trumpSuit: Suit | null): number {
  let bestEntry = trick[0];
  for (let i = 1; i < trick.length; i++) {
    if (cardBeats(trick[i].card, bestEntry.card, ledSuit, trumpSuit)) {
      bestEntry = trick[i];
    }
  }
  return bestEntry.seatIndex;
}

/** Count 10-rank cards (mindis) in a trick. */
export function countMindisInTrick(trick: TrickEntry[]): number {
  return trick.filter(e => e.card.rank === '10').length;
}

/**
 * Cut Hukum: if played card's suit ≠ led suit, it becomes trump.
 * PRD §8.3
 */
export function determineCutHukum(card: Card, ledSuit: Suit): Suit | null {
  return card.suit !== ledSuit ? card.suit : null;
}

/**
 * Returns true if playing `card` is a legal move.
 * PRD §7.2: must follow led suit if possible.
 */
export function canPlayCard(hand: Card[], card: Card, ledSuit: Suit | null): boolean {
  if (!ledSuit) return true; // leading: any card
  const hasSuit = hand.some(c => c.suit === ledSuit);
  if (hasSuit) return card.suit === ledSuit;
  return true; // void: any card allowed
}
