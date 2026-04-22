"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRankValue = getRankValue;
exports.cardBeats = cardBeats;
exports.resolveTrick = resolveTrick;
exports.countMindisInTrick = countMindisInTrick;
exports.determineCutHukum = determineCutHukum;
exports.canPlayCard = canPlayCard;
const RANK_VALUE = {
    'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10,
    '9': 9, '8': 8, '7': 7, '2': 2, '3': 1
};
function getRankValue(rank) {
    return RANK_VALUE[rank] ?? 0;
}
/**
 * Returns true if card `a` beats card `b` given trump/led suit context.
 * PRD §7.4: trump beats non-trump; among same suit higher rank wins;
 * off-suit non-trump cards cannot win.
 */
function cardBeats(a, b, ledSuit, trumpSuit) {
    const aIsTrump = trumpSuit !== null && a.suit === trumpSuit;
    const bIsTrump = trumpSuit !== null && b.suit === trumpSuit;
    if (aIsTrump && !bIsTrump)
        return true;
    if (!aIsTrump && bIsTrump)
        return false;
    // Both trump or both non-trump
    // PRD: if same card played, last player's card wins (>= so later card beats earlier on tie)
    if (a.suit === b.suit)
        return getRankValue(a.rank) >= getRankValue(b.rank);
    // Different suits, neither is trump: only led-suit card can win
    if (a.suit === ledSuit && b.suit !== ledSuit)
        return true;
    return false;
}
/**
 * Resolve a completed trick. Returns the seatIndex of the winner.
 * PRD §7.4
 */
function resolveTrick(trick, ledSuit, trumpSuit) {
    let bestEntry = trick[0];
    for (let i = 1; i < trick.length; i++) {
        if (cardBeats(trick[i].card, bestEntry.card, ledSuit, trumpSuit)) {
            bestEntry = trick[i];
        }
    }
    return bestEntry.seatIndex;
}
/** Count 10-rank cards (mindis) in a trick. */
function countMindisInTrick(trick) {
    return trick.filter(e => e.card.rank === '10').length;
}
/**
 * Cut Hukum: if played card's suit ≠ led suit, it becomes trump.
 * PRD §8.3
 */
function determineCutHukum(card, ledSuit) {
    return card.suit !== ledSuit ? card.suit : null;
}
/**
 * Returns true if playing `card` is a legal move.
 * PRD §7.2: must follow led suit if possible.
 */
function canPlayCard(hand, card, ledSuit) {
    if (!ledSuit)
        return true; // leading: any card
    const hasSuit = hand.some(c => c.suit === ledSuit);
    if (hasSuit)
        return card.suit === ledSuit;
    return true; // void: any card allowed
}
