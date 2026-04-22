"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextSeat = nextSeat;
exports.initGame = initGame;
exports.applyBandHukum = applyBandHukum;
exports.revealBandHukum = revealBandHukum;
exports.playCard = playCard;
exports.nextDealerSeat = nextDealerSeat;
const deckBuilder_1 = require("./deckBuilder");
const trickResolver_1 = require("./trickResolver");
// ── Helpers ────────────────────────────────────────────────────────
/** Anticlockwise seat advance (PRD §6.2) */
function nextSeat(seat, playerCount) {
    return (seat - 1 + playerCount) % playerCount;
}
function totalMindis(playerCount) {
    return { 4: 8, 6: 12, 8: 16, 10: 20 }[playerCount];
}
function mindiMajority(playerCount) {
    return { 4: 5, 6: 7, 8: 9, 10: 11 }[playerCount];
}
// ── Init ────────────────────────────────────────────────────────────
function initGame(roomCode, playerNames, socketIds, config, dealerSeat = 0, preservedGamePoints = [0, 0], teamIds) {
    const pc = config.playerCount;
    const { hands, fillerCards } = (0, deckBuilder_1.buildAndDeal)(pc);
    const isCutHukum = config.trumpMethod === 'cut_hukum';
    const isBandHukum = config.trumpMethod === 'band_hukum_a' || config.trumpMethod === 'band_hukum_b';
    const SUITS = ['hearts', 'diamonds', 'spades', 'clubs'];
    const randomTrump = (!isCutHukum && !isBandHukum)
        ? SUITS[Math.floor(Math.random() * 4)]
        : null;
    const players = playerNames.map((name, i) => ({
        id: socketIds[i] ?? `bot_${i}`,
        name,
        seatIndex: i,
        teamId: teamIds ? teamIds[i] : (i % 2),
        hand: hands[i],
        cardCount: hands[i].length
    }));
    // PRD §6.2: first trick led by player to dealer's RIGHT (anticlockwise)
    const firstTurn = nextSeat(dealerSeat, pc);
    const gameConfig = {
        playerCount: pc,
        deckCount: (0, deckBuilder_1.getDeckCount)(pc),
        trumpMethod: config.trumpMethod,
        gamePointsTarget: config.gamePointsTarget,
        totalMindis: totalMindis(pc),
        mindiMajority: mindiMajority(pc),
        fillerCards
    };
    return {
        roomCode,
        config: gameConfig,
        players,
        round: {
            dealerSeatIndex: dealerSeat,
            currentLeaderSeatIndex: firstTurn,
            currentTurnSeatIndex: firstTurn,
            trumpSuit: randomTrump,
            trumpCard: null,
            trumpRevealed: randomTrump !== null,
            currentTrick: { cards: [], ledSuit: null },
            completedTricks: [],
            teamMindis: [0, 0],
            teamTricks: [0, 0],
            trickNumber: 1
        },
        gamePoints: preservedGamePoints,
        phase: isBandHukum ? 'trump_selection' : 'playing',
        winnerTeamId: null
    };
}
// ── Band Hukum selection ────────────────────────────────────────────
/** Player nominates their hidden trump card (band hukum). PRD §8.2 */
function applyBandHukum(state, seatIndex, cardId) {
    const player = state.players[seatIndex];
    const card = player.hand.find(c => c.id === cardId);
    if (!card)
        return { newState: state, error: 'Card not in hand' };
    return {
        newState: {
            ...state,
            round: { ...state.round, trumpCard: card, trumpRevealed: false },
            phase: 'playing'
        }
    };
}
/** Reveal band hukum trump. PRD §8.2 */
function revealBandHukum(state) {
    const { trumpCard } = state.round;
    if (!trumpCard)
        return state;
    return {
        ...state,
        round: {
            ...state.round,
            trumpSuit: trumpCard.suit,
            trumpRevealed: true,
            trumpCard: null
        }
    };
}
function playCard(state, seatIndex, cardId) {
    const { round, config } = state;
    if (round.currentTurnSeatIndex !== seatIndex) {
        return { newState: state, trickComplete: false, roundComplete: false, error: 'Not your turn' };
    }
    const player = state.players[seatIndex];
    const card = player.hand.find(c => c.id === cardId);
    if (!card) {
        return { newState: state, trickComplete: false, roundComplete: false, error: 'Card not found' };
    }
    if (!(0, trickResolver_1.canPlayCard)(player.hand, card, round.currentTrick.ledSuit)) {
        return { newState: state, trickComplete: false, roundComplete: false, error: 'Must follow led suit' };
    }
    // Remove card from hand
    const newPlayers = state.players.map((p, i) => {
        if (i !== seatIndex)
            return p;
        const newHand = p.hand.filter(c => c.id !== cardId);
        return { ...p, hand: newHand, cardCount: newHand.length };
    });
    const newTrickCards = [...round.currentTrick.cards, { seatIndex, card }];
    const ledSuit = round.currentTrick.ledSuit ?? card.suit;
    // Cut Hukum: first void sets trump
    let trumpSuit = round.trumpSuit;
    let trumpRevealed = round.trumpRevealed;
    if (config.trumpMethod === 'cut_hukum' && !trumpSuit && round.currentTrick.ledSuit) {
        const cut = (0, trickResolver_1.determineCutHukum)(card, round.currentTrick.ledSuit);
        if (cut) {
            trumpSuit = cut;
            trumpRevealed = true;
        }
    }
    // Band Hukum A: auto-reveal on first void
    if (config.trumpMethod === 'band_hukum_a' && !trumpRevealed && round.trumpCard) {
        const hasLedSuit = player.hand.some(c => c.suit === ledSuit);
        if (!hasLedSuit) {
            trumpSuit = round.trumpCard.suit;
            trumpRevealed = true;
        }
    }
    // Trick not complete yet
    if (newTrickCards.length < config.playerCount) {
        const nextTurn = nextSeat(seatIndex, config.playerCount);
        return {
            newState: {
                ...state,
                players: newPlayers,
                round: {
                    ...round,
                    currentTrick: { cards: newTrickCards, ledSuit },
                    currentTurnSeatIndex: nextTurn,
                    trumpSuit,
                    trumpRevealed
                }
            },
            trickComplete: false,
            roundComplete: false
        };
    }
    // ── Trick complete ──────────────────────────────────────────────
    const winningSeat = (0, trickResolver_1.resolveTrick)(newTrickCards, ledSuit, trumpSuit);
    const winTeam = newPlayers[winningSeat].teamId;
    const mindisInTrick = newTrickCards.filter(e => e.card.rank === '10').length;
    const newTeamMindis = [...round.teamMindis];
    const newTeamTricks = [...round.teamTricks];
    newTeamMindis[winTeam] += mindisInTrick;
    newTeamTricks[winTeam] += 1;
    const completed = { cards: newTrickCards, winnerSeatIndex: winningSeat, mindisInTrick };
    const newTrickNumber = round.trickNumber + 1;
    const roundComplete = newPlayers.every(p => p.hand.length === 0);
    const baseRound = {
        ...round,
        currentTrick: { cards: [], ledSuit: null },
        completedTricks: [...round.completedTricks, completed],
        teamMindis: newTeamMindis,
        teamTricks: newTeamTricks,
        currentLeaderSeatIndex: winningSeat,
        currentTurnSeatIndex: winningSeat,
        trickNumber: newTrickNumber,
        trumpSuit,
        trumpRevealed,
        trumpCard: trumpRevealed ? null : round.trumpCard
    };
    if (!roundComplete) {
        return {
            newState: { ...state, players: newPlayers, round: baseRound },
            trickComplete: true,
            roundComplete: false
        };
    }
    // ── Round complete — scoring (PRD §11) ──────────────────────────
    const { roundResult, newGamePoints, winnerTeamId } = evaluateRound(newTeamMindis, newTeamTricks, config, state.gamePoints);
    const phase = newGamePoints[winnerTeamId] >= config.gamePointsTarget ? 'game_over' : 'round_end';
    return {
        newState: {
            ...state,
            players: newPlayers,
            round: { ...baseRound },
            gamePoints: newGamePoints,
            phase,
            winnerTeamId: phase === 'game_over' ? winnerTeamId : null
        },
        trickComplete: true,
        roundComplete: true,
        roundResult
    };
}
// ── Round evaluation ────────────────────────────────────────────────
function evaluateRound(teamMindis, teamTricks, config, prevGamePoints) {
    let winnerTeamId;
    if (teamMindis[0] >= config.mindiMajority) {
        winnerTeamId = 0;
    }
    else if (teamMindis[1] >= config.mindiMajority) {
        winnerTeamId = 1;
    }
    else {
        // Equal mindis — trick majority (PRD §11.1 tiebreaker)
        winnerTeamId = teamTricks[0] >= 8 ? 0 : 1;
    }
    // PRD §11.2: Whitewash=3, Mendikot=2, Normal=1
    let category = 'normal';
    let pointsAwarded = 1;
    if (teamTricks[1 - winnerTeamId] === 0) {
        category = 'whitewash';
        pointsAwarded = 3;
    }
    else if (teamMindis[winnerTeamId] === config.totalMindis) {
        category = 'mendikot';
        pointsAwarded = 2;
    }
    const newGamePoints = [...prevGamePoints];
    newGamePoints[winnerTeamId] += pointsAwarded;
    return { roundResult: { winnerTeamId, category, pointsAwarded }, newGamePoints, winnerTeamId };
}
// ── Dealer rotation ─────────────────────────────────────────────────
/**
 * PRD §12.2: loser's dealer stays; winner's dealer passes anticlockwise.
 * Whitewash penalty: pass to dealer's partner.
 */
function nextDealerSeat(currentDealer, dealerTeam, winnerTeam, category, playerCount) {
    if (dealerTeam !== winnerTeam) {
        // Dealer's team lost — whitewash penalty: partner takes deal
        if (category === 'whitewash') {
            // Partner = 2 seats anticlockwise
            return nextSeat(nextSeat(currentDealer, playerCount), playerCount);
        }
        return currentDealer; // same dealer
    }
    // Dealer's team won — pass anticlockwise
    return nextSeat(currentDealer, playerCount);
}
