import { Card, GameState, Suit, TrickEntry } from '../types';

/**
 * AI Player Engine for Mindi Card Game
 * Implements aggressive card-playing strategies
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

    const playableCards = this.getPlayableCards(hand, currentTrick.ledSuit);

    if (playableCards.length === 0) return hand[0];
    if (playableCards.length === 1) return playableCards[0];

    switch (this.difficulty) {
      case 'easy':
        return this.playEasyStrategy(playableCards, gameState);
      case 'hard':
        return this.playHardStrategy(playableCards, hand, gameState, playerIndex);
      case 'medium':
      default:
        return this.playMediumStrategy(playableCards, hand, gameState, playerIndex);
    }
  }

  // ─── Legal play filter ────────────────────────────────────────────────────

  private getPlayableCards(hand: Card[], ledSuit: Suit | null): Card[] {
    if (!ledSuit) return hand;
    const sameSuit = hand.filter(c => c.suit === ledSuit);
    return sameSuit.length > 0 ? sameSuit : hand;
  }

  // ─── Easy strategy (unchanged) ────────────────────────────────────────────

  private playEasyStrategy(playableCards: Card[], _gameState: GameState): Card {
    if (Math.random() < 0.7) {
      return playableCards[Math.floor(Math.random() * playableCards.length)];
    }
    return this.getLowestCard(playableCards);
  }

  // ─── Medium strategy (enhanced) ──────────────────────────────────────────

  private playMediumStrategy(
    playableCards: Card[],
    fullHand: Card[],
    gameState: GameState,
    playerIndex: number
  ): Card {
    const { round } = gameState;
    const { currentTrick, trumpSuit } = round;
    const isLeading = currentTrick.cards.length === 0;
    const isLastPlayer = this.isLastToPlay(currentTrick, gameState.config.playerCount);
    const trickHasMindi = currentTrick.cards.some(e => e.card.rank === '10');
    const teammateWinning = this.isTeammateWinningTrick(currentTrick.cards, gameState, playerIndex);
    const minWinCard = this.getMinWinningCard(playableCards, currentTrick.cards, trumpSuit);
    const myTeam = gameState.players[playerIndex].teamId;
    const { myMindis, oppMindis } = this.countMindiStatus(gameState, myTeam);
    const mindiMajority = gameState.config.mindiMajority;
    const safeAhead = myMindis >= mindiMajority;
    const oppThreatening = oppMindis >= mindiMajority - 1;

    // ── Leading ──
    if (isLeading) {
      if (safeAhead) return this.getHighestNonFillerCard(playableCards);
      return this.getMiddleCard(playableCards);
    }

    // ── Mindi in trick: maximum priority ──
    if (trickHasMindi) {
      if (teammateWinning) {
        const mindi = playableCards.find(c => c.rank === '10');
        if (mindi) return mindi;
        return this.getLowestNonFillerCard(playableCards);
      }
      // Opponent winning or unknown — fight for it
      if (minWinCard) return minWinCard;
      // Try trump
      if (trumpSuit && currentTrick.ledSuit !== trumpSuit) {
        const trumpCards = playableCards.filter(c => c.suit === trumpSuit);
        if (trumpCards.length > 0) return this.getLowestCard(trumpCards);
      }
      return this.getLowestNonFillerCard(playableCards);
    }

    // ── Last player optimization ──
    if (isLastPlayer) {
      if (teammateWinning) {
        const mindi = playableCards.find(c => c.rank === '10');
        if (mindi) return mindi;
        return this.getLowestNonFillerCard(playableCards);
      }
      if (minWinCard) return minWinCard;
      return this.getLowestNonFillerCard(playableCards);
    }

    // ── Cut_hukum: void in led suit → pick best trump-establishing card ──
    if (
      gameState.config.trumpMethod === 'cut_hukum' &&
      !trumpSuit &&
      currentTrick.ledSuit &&
      playableCards[0].suit !== currentTrick.ledSuit
    ) {
      return this.pickTrumpEstablishCard(playableCards, fullHand);
    }

    // ── Teammate winning → gift Mindi or discard ──
    if (teammateWinning) {
      const mindi = playableCards.find(c => c.rank === '10');
      if (mindi) return mindi;
      return this.getLowestNonFillerCard(playableCards);
    }

    // ── Try to win cheaply if worth it ──
    if (minWinCard) {
      const winVal = this.getRankValue(minWinCard.rank);
      if (oppThreatening || winVal <= this.getRankValue('J')) return minWinCard;
    }

    return this.getLowestNonFillerCard(playableCards);
  }

  // ─── Hard strategy (rewritten — aggressive) ───────────────────────────────

  private playHardStrategy(
    playableCards: Card[],
    fullHand: Card[],
    gameState: GameState,
    playerIndex: number
  ): Card {
    const { round } = gameState;
    const { currentTrick } = round;
    const isLeading = currentTrick.cards.length === 0;

    const voidMap = this.buildVoidedSuits(gameState);

    if (isLeading) {
      return this.evaluateLeadCard(playableCards, fullHand, gameState, playerIndex, voidMap);
    } else {
      return this.evaluateFollowCard(playableCards, fullHand, gameState, playerIndex, voidMap);
    }
  }

  // ─── Hard: Lead strategy ─────────────────────────────────────────────────

  private evaluateLeadCard(
    playableCards: Card[],
    fullHand: Card[],
    gameState: GameState,
    playerIndex: number,
    voidMap: Map<number, Set<Suit>>
  ): Card {
    const { round } = gameState;
    const { trumpSuit, trickNumber } = round;
    const trumpMethod = gameState.config.trumpMethod;
    const trumpKnown = trumpSuit !== null;
    const myTeam = gameState.players[playerIndex].teamId;
    const opponents = this.getOpponents(gameState, playerIndex);
    const { myMindis, oppMindis, remaining } = this.countMindiStatus(gameState, myTeam);
    const mindiMajority = gameState.config.mindiMajority;
    const safeAhead = myMindis >= mindiMajority;
    const myTeamTricks = gameState.round.teamTricks[myTeam];
    const isLateGame = trickNumber > 10;

    // ── 1. Mendikot/Whitewash push ──
    if (safeAhead) {
      // All remaining Mindis secured — push for trick majority/whitewash
      if (myTeamTricks >= 8 || remaining === 0) {
        const best = this.getHighestNonFillerCard(playableCards);
        return best;
      }
      // We have majority Mindis, lead with force to prevent losing tricks
      const best = this.getHighestNonFillerCard(playableCards);
      return best;
    }

    // ── 2. Late game ──
    if (isLateGame) {
      // Pull trump if we hold it and opponents haven't voided it
      if (trumpKnown && trumpSuit) {
        const myTrumps = playableCards.filter(c => c.suit === trumpSuit);
        const oppsHaveVoidedTrump = opponents.every(s => voidMap.get(s)?.has(trumpSuit));
        if (myTrumps.length > 0 && !oppsHaveVoidedTrump) {
          return this.getHighestCard(myTrumps);
        }
      }
      return this.getHighestNonFillerCard(playableCards);
    }

    // ── 3. Suit control: lead suit where we have 2+ high cards (J+) ──
    const suits: Suit[] = ['hearts', 'diamonds', 'spades', 'clubs'];
    for (const suit of suits) {
      if (suit === trumpSuit) continue; // save trump for later
      const highCardsInSuit = fullHand.filter(
        c => c.suit === suit && !c.isFiller && this.getRankValue(c.rank) >= this.getRankValue('J')
      );
      if (highCardsInSuit.length >= 2) {
        // Check if all opponents have voided this suit (even better — guaranteed win)
        const allOppsVoided = opponents.length > 0 && opponents.every(s => voidMap.get(s)?.has(suit));
        const suitPlayables = playableCards.filter(c => c.suit === suit);
        if (suitPlayables.length === 0) continue;

        if (allOppsVoided) {
          // Guaranteed win — lead highest
          return this.getHighestCard(suitPlayables);
        }
        // Lead lowest of this strong suit to signal control to teammate
        return this.getLowestCard(suitPlayables);
      }
    }

    // ── 4. Void engineering (cut_hukum only, trump not yet established) ──
    if (trumpMethod === 'cut_hukum' && !trumpKnown) {
      // Find the suit in our hand with fewest non-filler cards (closest to voiding)
      let targetSuit: Suit | null = null;
      let minCount = Infinity;
      for (const suit of suits) {
        const nonFillers = fullHand.filter(c => c.suit === suit && !c.isFiller);
        if (nonFillers.length > 0 && nonFillers.length < minCount) {
          minCount = nonFillers.length;
          targetSuit = suit;
        }
      }
      if (targetSuit) {
        const targetPlayables = playableCards.filter(c => c.suit === targetSuit);
        if (targetPlayables.length > 0) {
          return this.getLowestCard(targetPlayables);
        }
      }
    }

    // ── 5. Mindi protection: don't lead our 10 if we have other cards ──
    const nonMindiPlayable = playableCards.filter(c => c.rank !== '10' && !c.isFiller);
    if (nonMindiPlayable.length > 0) {
      // Lead lowest non-filler, non-mindi
      return this.getLowestCard(nonMindiPlayable);
    }

    // ── 6. Default ──
    return this.getLowestNonFillerCard(playableCards);
  }

  // ─── Hard: Follow strategy ────────────────────────────────────────────────

  private evaluateFollowCard(
    playableCards: Card[],
    fullHand: Card[],
    gameState: GameState,
    playerIndex: number,
    _voidMap: Map<number, Set<Suit>>
  ): Card {
    const { round } = gameState;
    const { currentTrick, trumpSuit, trickNumber } = round;
    const trumpMethod = gameState.config.trumpMethod;
    const trumpKnown = trumpSuit !== null;
    const isLateGame = trickNumber > 10;
    const isLastPlayer = this.isLastToPlay(currentTrick, gameState.config.playerCount);
    const trickHasMindi = currentTrick.cards.some(e => e.card.rank === '10');
    const teammateWinning = this.isTeammateWinningTrick(currentTrick.cards, gameState, playerIndex);
    const currentWinner = this.getCurrentTrickWinner(currentTrick.cards, trumpSuit);
    const minWinCard = this.getMinWinningCard(playableCards, currentTrick.cards, trumpSuit);
    const myTeam = gameState.players[playerIndex].teamId;
    const { myMindis, oppMindis } = this.countMindiStatus(gameState, myTeam);
    const mindiMajority = gameState.config.mindiMajority;
    const safeAhead = myMindis >= mindiMajority;
    const oppThreatening = oppMindis >= mindiMajority - 1;

    const leaderCard = currentTrick.cards[0]?.card;
    const leaderSeat = currentTrick.cards[0]?.seatIndex;
    const leaderTeam = leaderSeat !== undefined ? gameState.players[leaderSeat].teamId : -1;
    const isTeammateLead = leaderTeam === myTeam;
    const isOpponentLead = leaderTeam !== myTeam;

    // ── Rule 1: Mindi in trick — MAXIMUM PRIORITY ──
    if (trickHasMindi) {
      if (teammateWinning) {
        // Gift our Mindi to teammate if held; else discard cheaply
        const mindi = playableCards.find(c => c.rank === '10');
        if (mindi) return mindi;
        return this.getLowestNonFillerCard(playableCards);
      }
      // Opponent winning — fight for it at all costs
      if (minWinCard) return minWinCard;
      // Use trump to capture it
      if (trumpKnown && trumpSuit && currentTrick.ledSuit !== trumpSuit) {
        const myTrumps = playableCards.filter(c => c.suit === trumpSuit);
        if (myTrumps.length > 0) return this.getLowestCard(myTrumps);
      }
      // Can't win — discard cheapest
      return this.getLowestNonFillerCard(playableCards);
    }

    // ── Rule 2: Last player — perfect information play ──
    if (isLastPlayer) {
      if (teammateWinning) {
        const mindi = playableCards.find(c => c.rank === '10');
        if (mindi) return mindi;
        return this.getLowestNonFillerCard(playableCards);
      }
      // Opponent winning — win cheaply or discard
      if (minWinCard) return minWinCard;
      return this.getLowestNonFillerCard(playableCards);
    }

    // ── Rule 3: Cut_hukum coordination ──
    if (trumpMethod === 'cut_hukum') {
      const leaderRankVal = leaderCard ? this.getRankValue(leaderCard.rank) : 0;
      const ledSuit = currentTrick.ledSuit;

      // 3a. Void in led suit → establish trump right now
      if (!trumpKnown && ledSuit && playableCards[0].suit !== ledSuit) {
        return this.pickTrumpEstablishCard(playableCards, fullHand);
      }

      // 3b. Teammate leads low (≤ 8 or filler) → help them win to maintain lead control
      if (isTeammateLead && leaderCard && (leaderCard.isFiller || leaderRankVal <= this.getRankValue('8'))) {
        // Try to win cheaply (spend ≤ Q)
        if (minWinCard && this.getRankValue(minWinCard.rank) <= this.getRankValue('Q')) {
          return minWinCard;
        }
        // Let teammate win solo — discard cheaply
        return this.getLowestNonFillerCard(playableCards);
      }

      // 3c. Opponent leads low (filler or ≤ 7) → they may be trying to void themselves
      // Cover with a high card of led suit to prevent them getting a safe loss
      if (!trumpKnown && isOpponentLead && leaderCard && (leaderCard.isFiller || leaderRankVal <= this.getRankValue('7'))) {
        const ledSuitPlayables = playableCards.filter(c => c.suit === ledSuit);
        if (ledSuitPlayables.length > 0) {
          const highCard = ledSuitPlayables.find(c => this.getRankValue(c.rank) >= this.getRankValue('J'));
          if (highCard) return highCard;
        }
      }
    }

    // ── Rule 4: Trump known — aggressive trump use ──
    if (trumpKnown && trumpSuit && currentWinner) {
      const winnerCard = currentWinner.card;
      const winnerTeam = gameState.players[currentWinner.seatIndex].teamId;
      const opponentWinning = winnerTeam !== myTeam;

      if (opponentWinning) {
        const myTrumps = playableCards.filter(c => c.suit === trumpSuit);

        // 4a. Opponent winning with non-trump → cut with lowest trump (late game or safe ahead)
        if (winnerCard.suit !== trumpSuit && myTrumps.length > 0) {
          if (isLateGame || safeAhead || oppThreatening) {
            return this.getLowestCard(myTrumps);
          }
        }

        // 4b. Opponent winning with trump → over-trump if we can
        if (winnerCard.suit === trumpSuit && myTrumps.length > 0) {
          const higherTrumps = myTrumps.filter(
            c => this.getRankValue(c.rank) > this.getRankValue(winnerCard.rank)
          );
          if (higherTrumps.length > 0 && (isLateGame || oppThreatening)) {
            return this.getLowestCard(higherTrumps);
          }
        }
      }
    }

    // ── Rule 5: Teammate winning → gift Mindi or discard ──
    if (teammateWinning) {
      const mindi = playableCards.find(c => c.rank === '10');
      if (mindi) return mindi;
      return this.getLowestNonFillerCard(playableCards);
    }

    // ── Rule 6: Try to win cheaply or discard ──
    if (minWinCard) {
      const winVal = this.getRankValue(minWinCard.rank);
      if (isLateGame || oppThreatening || winVal <= this.getRankValue('J')) {
        return minWinCard;
      }
    }

    return this.getLowestNonFillerCard(playableCards);
  }

  // ─── Helper: Build voided suits map from completed tricks ─────────────────

  private buildVoidedSuits(gameState: GameState): Map<number, Set<Suit>> {
    const voidMap = new Map<number, Set<Suit>>();
    for (const player of gameState.players) {
      voidMap.set(player.seatIndex, new Set<Suit>());
    }
    for (const trick of gameState.round.completedTricks) {
      if (trick.cards.length === 0) continue;
      const ledSuit = trick.cards[0].card.suit;
      // Skip the leader (index 0), check remaining players
      for (let i = 1; i < trick.cards.length; i++) {
        const entry = trick.cards[i];
        if (entry.card.suit !== ledSuit) {
          voidMap.get(entry.seatIndex)?.add(ledSuit);
        }
      }
    }
    return voidMap;
  }

  // ─── Helper: Team utilities ───────────────────────────────────────────────

  private getTeammates(gameState: GameState, playerIndex: number): number[] {
    const myTeam = gameState.players[playerIndex].teamId;
    return gameState.players
      .filter((p, i) => i !== playerIndex && p.teamId === myTeam)
      .map(p => p.seatIndex);
  }

  private getOpponents(gameState: GameState, playerIndex: number): number[] {
    const myTeam = gameState.players[playerIndex].teamId;
    return gameState.players
      .filter(p => p.teamId !== myTeam)
      .map(p => p.seatIndex);
  }

  // ─── Helper: Mindi status ─────────────────────────────────────────────────

  private countMindiStatus(
    gameState: GameState,
    myTeam: number
  ): { myMindis: number; oppMindis: number; remaining: number } {
    const myMindis = gameState.round.teamMindis[myTeam as 0 | 1];
    const oppMindis = gameState.round.teamMindis[(1 - myTeam) as 0 | 1];
    const remaining = gameState.config.totalMindis - myMindis - oppMindis;
    return { myMindis, oppMindis, remaining };
  }

  // ─── Helper: Suit strength (sum of rank values of non-filler cards) ───────

  private getSuitStrength(cards: Card[], suit: Suit): number {
    return cards
      .filter(c => c.suit === suit && !c.isFiller)
      .reduce((sum, c) => sum + this.getRankValue(c.rank), 0);
  }

  // ─── Helper: Get current trick winner ────────────────────────────────────

  private getCurrentTrickWinner(
    trickCards: TrickEntry[],
    trumpSuit: Suit | null
  ): TrickEntry | null {
    if (trickCards.length === 0) return null;
    const ledSuit = trickCards[0].card.suit;
    let winner = trickCards[0];
    for (let i = 1; i < trickCards.length; i++) {
      if (this.cardBeats(trickCards[i].card, winner.card, ledSuit, trumpSuit)) {
        winner = trickCards[i];
      }
    }
    return winner;
  }

  // ─── Helper: Find cheapest winning card ──────────────────────────────────

  private getMinWinningCard(
    playableCards: Card[],
    trickCards: TrickEntry[],
    trumpSuit: Suit | null
  ): Card | null {
    if (trickCards.length === 0) return null;
    const winner = this.getCurrentTrickWinner(trickCards, trumpSuit);
    if (!winner) return null;
    const ledSuit = trickCards[0].card.suit;

    // Find all cards that can beat the current winner, sorted cheapest first
    const winners = playableCards
      .filter(c => this.cardBeats(c, winner.card, ledSuit, trumpSuit))
      .sort((a, b) => this.getRankValue(a.rank) - this.getRankValue(b.rank));

    return winners.length > 0 ? winners[0] : null;
  }

  // ─── Helper: Is this AI the last to play in the trick? ───────────────────

  private isLastToPlay(
    currentTrick: GameState['round']['currentTrick'],
    playerCount: number
  ): boolean {
    return currentTrick.cards.length === playerCount - 1;
  }

  // ─── Helper: Pick best card to establish as trump (cut_hukum void) ────────

  private pickTrumpEstablishCard(playableCards: Card[], fullHand: Card[]): Card {
    // Choose the suit in playableCards where we hold the highest strength in fullHand
    const suits = [...new Set(playableCards.map(c => c.suit))] as Suit[];
    let bestSuit: Suit = suits[0];
    let bestStrength = -1;

    for (const suit of suits) {
      const strength = this.getSuitStrength(fullHand, suit);
      if (strength > bestStrength) {
        bestStrength = strength;
        bestSuit = suit;
      }
    }

    // Play the lowest card of that suit (establish trump cheaply)
    const suitCards = playableCards.filter(c => c.suit === bestSuit);
    return this.getLowestCard(suitCards);
  }

  // ─── Helper: cardBeats ────────────────────────────────────────────────────

  private cardBeats(card1: Card, card2: Card, ledSuit: Suit, trumpSuit: Suit | null): boolean {
    if (trumpSuit) {
      if (card1.suit === trumpSuit && card2.suit !== trumpSuit) return true;
      if (card2.suit === trumpSuit && card1.suit !== trumpSuit) return false;
    }
    if (card1.suit === card2.suit) {
      return this.getRankValue(card1.rank) >= this.getRankValue(card2.rank);
    }
    if (card1.suit === ledSuit) return true;
    if (card2.suit === ledSuit) return false;
    return false;
  }

  // ─── Helper: getRankValue ─────────────────────────────────────────────────

  private getRankValue(rank: string): number {
    const values: Record<string, number> = {
      '3': 1, '2': 2, '7': 3, '8': 4, '9': 5,
      '10': 6, 'J': 7, 'Q': 8, 'K': 9, 'A': 10
    };
    return values[rank] || 0;
  }

  // ─── Helper: isTeammateWinningTrick ──────────────────────────────────────

  private isTeammateWinningTrick(
    trickCards: TrickEntry[],
    gameState: GameState,
    myPlayerIndex: number
  ): boolean {
    if (trickCards.length === 0) return false;
    const myTeam = gameState.players[myPlayerIndex].teamId;
    const { trumpSuit } = gameState.round;
    const winner = this.getCurrentTrickWinner(trickCards, trumpSuit);
    if (!winner) return false;
    const winningTeam = gameState.players[winner.seatIndex].teamId;
    return winningTeam === myTeam;
  }

  // ─── Card selection utilities ─────────────────────────────────────────────

  private getLowestCard(cards: Card[]): Card {
    return cards.reduce((lowest, card) =>
      this.getRankValue(card.rank) < this.getRankValue(lowest.rank) ? card : lowest
    );
  }

  private getHighestCard(cards: Card[]): Card {
    return cards.reduce((highest, card) =>
      this.getRankValue(card.rank) > this.getRankValue(highest.rank) ? card : highest
    );
  }

  private getMiddleCard(cards: Card[]): Card {
    const sorted = [...cards].sort((a, b) => this.getRankValue(a.rank) - this.getRankValue(b.rank));
    return sorted[Math.floor(sorted.length / 2)];
  }

  /** Lowest card preferring non-filler; falls back to lowest filler if all are fillers */
  private getLowestNonFillerCard(cards: Card[]): Card {
    const nonFillers = cards.filter(c => !c.isFiller);
    return nonFillers.length > 0 ? this.getLowestCard(nonFillers) : this.getLowestCard(cards);
  }

  /** Highest card preferring non-filler */
  private getHighestNonFillerCard(cards: Card[]): Card {
    const nonFillers = cards.filter(c => !c.isFiller);
    return nonFillers.length > 0 ? this.getHighestCard(nonFillers) : this.getHighestCard(cards);
  }
}
