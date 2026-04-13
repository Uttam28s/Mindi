import { Card, GameState, Suit } from '../types';

/**
 * AI Player Engine for Mindi Card Game
 * Implements smart card-playing strategies
 */

export class AIPlayer {
  private difficulty: 'easy' | 'medium' | 'hard';

  constructor(difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.difficulty = difficulty;
  }

  /**
   * Main method: AI decides which card to play
   */
  selectCard(hand: Card[], gameState: GameState, playerIndex: number): Card {
    const { round } = gameState;
    const { currentTrick } = round;

    // Filter playable cards based on game rules
    const playableCards = this.getPlayableCards(hand, currentTrick.ledSuit);

    if (playableCards.length === 0) {
      return hand[0]; // Fallback (should never happen)
    }

    if (playableCards.length === 1) {
      return playableCards[0];
    }

    // Apply strategy based on difficulty
    switch (this.difficulty) {
      case 'easy':
        return this.playEasyStrategy(playableCards, gameState);
      case 'hard':
        return this.playHardStrategy(playableCards, gameState, playerIndex);
      case 'medium':
      default:
        return this.playMediumStrategy(playableCards, gameState, playerIndex);
    }
  }

  /**
   * Get cards that can legally be played according to game rules
   */
  private getPlayableCards(hand: Card[], ledSuit: Suit | null): Card[] {
    if (!ledSuit) {
      // First card of the trick - can play anything
      return hand;
    }

    // Must follow suit if possible
    const sameSuitCards = hand.filter(card => card.suit === ledSuit);

    if (sameSuitCards.length > 0) {
      return sameSuitCards;
    }

    // Can't follow suit - can play any card
    return hand;
  }

  /**
   * Easy strategy: Random selection with slight preference for low cards
   */
  private playEasyStrategy(playableCards: Card[], _gameState: GameState): Card {
    // 70% chance to play randomly, 30% chance to play lowest card
    if (Math.random() < 0.7) {
      return playableCards[Math.floor(Math.random() * playableCards.length)];
    }

    // Play lowest card (by rank value)
    return this.getLowestCard(playableCards);
  }

  /**
   * Medium strategy: Balanced play with some tactical awareness
   */
  private playMediumStrategy(playableCards: Card[], gameState: GameState, playerIndex: number): Card {
    const { round } = gameState;
    const { currentTrick, trumpSuit } = round;

    // If leading the trick, play a medium-strength card
    if (currentTrick.cards.length === 0) {
      return this.getMiddleCard(playableCards);
    }

    // Try to win the trick if it contains a 10 (Mindi)
    const trickHasMindi = currentTrick.cards.some(entry => entry.card.rank === '10');
    if (trickHasMindi) {
      const winningCard = this.tryToWinTrick(playableCards, currentTrick.cards, trumpSuit);
      if (winningCard) return winningCard;
    }

    // Check if teammate is winning
    const teammateWinning = this.isTeammateWinningTrick(currentTrick.cards, gameState, playerIndex);

    if (teammateWinning) {
      // Play lowest card to conserve high cards
      return this.getLowestCard(playableCards);
    }

    // Try to win with a reasonable card
    const winningCard = this.tryToWinTrick(playableCards, currentTrick.cards, trumpSuit);
    if (winningCard && !this.isHighValueCard(winningCard)) {
      return winningCard;
    }

    // Otherwise play lowest card
    return this.getLowestCard(playableCards);
  }

  /**
   * Hard strategy: Advanced tactics and card counting
   */
  private playHardStrategy(playableCards: Card[], gameState: GameState, playerIndex: number): Card {
    const { round } = gameState;
    const { currentTrick, trumpSuit, teamMindis, trickNumber } = round;

    const myTeam = gameState.players[playerIndex].teamId;
    const teamMindisCount = teamMindis[myTeam];
    const mindiMajority = gameState.config.mindiMajority;

    // Strategic considerations
    const needMindis = teamMindisCount < mindiMajority;
    const isLateGame = trickNumber > 10;
    const teammateWinning = this.isTeammateWinningTrick(currentTrick.cards, gameState, playerIndex);
    const trickHasMindi = currentTrick.cards.some(entry => entry.card.rank === '10');

    // If leading the trick
    if (currentTrick.cards.length === 0) {
      // In late game with secure lead, play high cards to ensure wins
      if (isLateGame && !needMindis) {
        return this.getHighestCard(playableCards);
      }

      // Lead with moderate card, save high cards
      return this.getMiddleCard(playableCards);
    }

    // If trick has Mindi and we need it
    if (trickHasMindi && needMindis) {
      const winningCard = this.tryToWinTrick(playableCards, currentTrick.cards, trumpSuit);
      if (winningCard) return winningCard;
    }

    // If teammate is winning
    if (teammateWinning) {
      // Play Mindi if we have one (give it to teammate)
      const mindiCard = playableCards.find(card => card.rank === '10');
      if (mindiCard) return mindiCard;

      // Otherwise play lowest card
      return this.getLowestCard(playableCards);
    }

    // Try to win if we can with a reasonable card
    const winningCard = this.tryToWinTrick(playableCards, currentTrick.cards, trumpSuit);
    if (winningCard) {
      // Only use trump if necessary or if trick has value
      if (winningCard.suit === trumpSuit && !trickHasMindi && !isLateGame) {
        return this.getLowestCard(playableCards);
      }
      return winningCard;
    }

    // Can't win - discard lowest card
    return this.getLowestCard(playableCards);
  }

  /**
   * Try to find a card that can win the current trick
   */
  private tryToWinTrick(
    playableCards: Card[],
    trickCards: { seatIndex: number; card: Card }[],
    trumpSuit: Suit | null
  ): Card | null {
    if (trickCards.length === 0) return null;

    const ledSuit = trickCards[0].card.suit;
    let currentWinningCard = trickCards[0].card;

    // Determine current winning card
    for (const entry of trickCards) {
      if (this.cardBeats(entry.card, currentWinningCard, ledSuit, trumpSuit)) {
        currentWinningCard = entry.card;
      }
    }

    // Find a card that can beat it
    for (const card of playableCards) {
      if (this.cardBeats(card, currentWinningCard, ledSuit, trumpSuit)) {
        return card;
      }
    }

    return null;
  }

  /**
   * Check if card1 beats card2
   */
  private cardBeats(card1: Card, card2: Card, ledSuit: Suit, trumpSuit: Suit | null): boolean {
    // Trump beats non-trump
    if (trumpSuit) {
      if (card1.suit === trumpSuit && card2.suit !== trumpSuit) return true;
      if (card2.suit === trumpSuit && card1.suit !== trumpSuit) return false;
    }

    // Both trump or both not trump
    // Same card: last player wins (>= so later card beats earlier on tie)
    if (card1.suit === card2.suit) {
      return this.getRankValue(card1.rank) >= this.getRankValue(card2.rank);
    }

    // Different suits, neither trump - only led suit matters
    if (card1.suit === ledSuit) return true;
    if (card2.suit === ledSuit) return false;

    // Both off-suit, card2 wins by default (was played first)
    return false;
  }

  /**
   * Get numeric value for card rank
   */
  private getRankValue(rank: string): number {
    const values: Record<string, number> = {
      '3': 1, '2': 2, '7': 3, '8': 4, '9': 5,
      '10': 6, 'J': 7, 'Q': 8, 'K': 9, 'A': 10
    };
    return values[rank] || 0;
  }

  /**
   * Check if teammate is currently winning the trick
   */
  private isTeammateWinningTrick(
    trickCards: { seatIndex: number; card: Card }[],
    gameState: GameState,
    myPlayerIndex: number
  ): boolean {
    if (trickCards.length === 0) return false;

    const myTeam = gameState.players[myPlayerIndex].teamId;
    const { trumpSuit } = gameState.round;
    const ledSuit = trickCards[0].card.suit;

    let winningIndex = 0;
    let winningCard = trickCards[0].card;

    for (let i = 1; i < trickCards.length; i++) {
      if (this.cardBeats(trickCards[i].card, winningCard, ledSuit, trumpSuit)) {
        winningCard = trickCards[i].card;
        winningIndex = i;
      }
    }

    const winningTeam = gameState.players[trickCards[winningIndex].seatIndex].teamId;
    return winningTeam === myTeam;
  }

  /**
   * Get lowest value card from hand
   */
  private getLowestCard(cards: Card[]): Card {
    return cards.reduce((lowest, card) =>
      this.getRankValue(card.rank) < this.getRankValue(lowest.rank) ? card : lowest
    );
  }

  /**
   * Get highest value card from hand
   */
  private getHighestCard(cards: Card[]): Card {
    return cards.reduce((highest, card) =>
      this.getRankValue(card.rank) > this.getRankValue(highest.rank) ? card : highest
    );
  }

  /**
   * Get middle value card from hand
   */
  private getMiddleCard(cards: Card[]): Card {
    const sorted = [...cards].sort((a, b) =>
      this.getRankValue(a.rank) - this.getRankValue(b.rank)
    );
    return sorted[Math.floor(sorted.length / 2)];
  }

  /**
   * Check if card is high value (K or A)
   */
  private isHighValueCard(card: Card): boolean {
    return card.rank === 'K' || card.rank === 'A';
  }
}
