"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildActiveDeck = buildActiveDeck;
exports.getFillerCards = getFillerCards;
exports.getDeckCount = getDeckCount;
exports.buildAndDeal = buildAndDeal;
const SUITS = ['hearts', 'diamonds', 'spades', 'clubs'];
const ACTIVE_RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8'];
let _idCounter = 0;
function uid(prefix) {
    return `${prefix}_${Date.now()}_${++_idCounter}`;
}
/** Build one active deck (28 cards: ranks 8–A × 4 suits). */
function buildActiveDeck(deckIndex) {
    const cards = [];
    for (const suit of SUITS) {
        for (const rank of ACTIVE_RANKS) {
            cards.push({ suit, rank, isFiller: false, deckIndex, id: uid(`${suit}_${rank}_d${deckIndex}`) });
        }
    }
    return cards;
}
/**
 * Filler sets per PRD §5.3.
 * 4p  → 7♥ 7♦ 7♠ 7♣
 * 6p  → 2♥ 7♥ 7♦ 2♠ 7♠ 7♣
 * 8p  → 2♥ 7♥ 2♦ 7♦ 2♠ 7♠ 2♣ 7♣
 * 10p → 2♥ 7♥ 2♦ 7♦ 2♠ 7♠ 2♣ 7♣ 3♥ 3♦
 */
function getFillerCards(playerCount) {
    const f = (suit, rank) => ({
        suit, rank, isFiller: true, deckIndex: 0, id: uid(`filler_${suit}_${rank}`)
    });
    if (playerCount === 4)
        return [f('hearts', '7'), f('diamonds', '7'), f('spades', '7'), f('clubs', '7')];
    if (playerCount === 6)
        return [f('hearts', '2'), f('hearts', '7'), f('diamonds', '7'), f('spades', '2'), f('spades', '7'), f('clubs', '7')];
    if (playerCount === 8)
        return [f('hearts', '2'), f('hearts', '7'), f('diamonds', '2'), f('diamonds', '7'), f('spades', '2'), f('spades', '7'), f('clubs', '2'), f('clubs', '7')];
    // 10 players
    return [f('hearts', '2'), f('hearts', '7'), f('diamonds', '2'), f('diamonds', '7'), f('spades', '2'), f('spades', '7'), f('clubs', '2'), f('clubs', '7'), f('hearts', '3'), f('diamonds', '3')];
}
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function getDeckCount(playerCount) {
    const map = { 4: 2, 6: 3, 8: 4, 10: 5 };
    return map[playerCount];
}
/**
 * Build the full shuffled game deck and deal 15 cards to each player.
 * Returns hands array + the filler card set (stored in GameConfig).
 */
function buildAndDeal(playerCount) {
    const dc = getDeckCount(playerCount);
    let allCards = [];
    for (let d = 0; d < dc; d++)
        allCards = allCards.concat(buildActiveDeck(d));
    const fillerCards = getFillerCards(playerCount);
    allCards = shuffle([...allCards, ...fillerCards]);
    if (allCards.length !== playerCount * 15) {
        throw new Error(`Deck size ${allCards.length} ≠ ${playerCount * 15}`);
    }
    const hands = Array.from({ length: playerCount }, () => []);
    allCards.forEach((card, i) => hands[i % playerCount].push(card));
    return { hands, fillerCards };
}
