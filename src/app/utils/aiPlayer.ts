import { Card, GameState, Suit, TrickEntry } from '../types';

/**
 * AI Player Engine for Mindi Card Game
 *
 * Human-like strategy goals:
 *  1. Mindi (rank '10') is precious — never play it unless forced or you are the
 *     LAST player and the trick is already safe for your team.
 *  2. Void engineering — lead suits where a teammate is already void so they can
 *     trump; avoid leading suits where an opponent is void (they'll trump you).
 *  3. Teammate support — when a teammate leads with a low card (signalling they
 *     want to burn a suit and void themselves), try to win the trick so your team
 *     keeps the lead; on your next lead, repeat that suit to accelerate the void.
 *  4. Trump discipline — use trump cards only when you cannot win otherwise or
 *     when a mindi is at stake.
 */

export class AIPlayer {
  private difficulty: 'easy' | 'medium' | 'hard';

  constructor(difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
    this.difficulty = difficulty;
  }

  // ─── Public entry point ───────────────────────────────────────────────────

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

  // ─── Easy strategy ────────────────────────────────────────────────────────

  private playEasyStrategy(playableCards: Card[], _gameState: GameState): Card {
    // Easy still avoids leading mindi
    if (Math.random() < 0.7) {
      const nonMindi = playableCards.filter(c => c.rank !== '10');
      const pool = nonMindi.length > 0 ? nonMindi : playableCards;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    return this.getLowestCard(playableCards.filter(c => c.rank !== '10').length > 0
      ? playableCards.filter(c => c.rank !== '10')
      : playableCards);
  }

  // ─── Medium strategy ──────────────────────────────────────────────────────

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
    const voidMap = this.buildVoidedSuits(gameState);

    // ── Leading ──
    if (isLeading) {
      // Never lead with mindi unless that's literally all we have
      const nonMindiCards = playableCards.filter(c => c.rank !== '10');
      const leadPool = nonMindiCards.length > 0 ? nonMindiCards : playableCards;

      // Lead a suit where a teammate is void → they can trump it
      const voidExploit = this.getVoidExploitLead(leadPool, gameState, playerIndex, voidMap, trumpSuit);
      if (voidExploit) return voidExploit;

      if (safeAhead) return this.getHighestNonMindiCard(leadPool);
      return this.getMiddleCard(leadPool);
    }

    // ── Mindi in trick: fight for it ──
    if (trickHasMindi) {
      if (teammateWinning) {
        // Only gift our mindi if we're the last player and it's totally safe
        if (isLastPlayer) {
          const mindi = playableCards.find(c => c.rank === '10');
          if (mindi) return mindi;
        }
        return this.getLowestNonMindiCard(playableCards);
      }
      // Opponent winning — fight for it
      if (minWinCard) return minWinCard;
      // Try trump if we're void in led suit
      if (trumpSuit && currentTrick.ledSuit !== trumpSuit) {
        const trumpCards = playableCards.filter(c => c.suit === trumpSuit);
        if (trumpCards.length > 0) return this.getLowestCard(trumpCards);
      }
      return this.getLowestNonMindiCard(playableCards);
    }

    // ── Teammate leading low → try to win trick to take over the lead ──
    const leaderSeat = currentTrick.cards[0]?.seatIndex;
    const leaderTeam = leaderSeat !== undefined ? gameState.players[leaderSeat]?.teamId : -1;
    const isTeammateLead = leaderTeam === myTeam;
    const leaderCard = currentTrick.cards[0]?.card;
    if (
      isTeammateLead &&
      leaderCard &&
      (leaderCard.isFiller || this.getRankValue(leaderCard.rank) <= this.getRankValue('8'))
    ) {
      // Teammate signalling a low card — win cheaply to maintain team lead
      if (minWinCard && this.getRankValue(minWinCard.rank) <= this.getRankValue('Q')) {
        return minWinCard;
      }
      // Can't win cheaply — discard
      return this.getLowestNonMindiCard(playableCards);
    }

    // ── Last player optimisation ──
    if (isLastPlayer) {
      if (teammateWinning) {
        // Only gift mindi when we're last and trick is safe
        const mindi = playableCards.find(c => c.rank === '10');
        if (mindi) return mindi;
        return this.getLowestNonMindiCard(playableCards);
      }
      if (minWinCard) return minWinCard;
      return this.getLowestNonMindiCard(playableCards);
    }

    // ── cut_hukum: void in led suit → pick best trump-establishing card ──
    if (
      gameState.config.trumpMethod === 'cut_hukum' &&
      !trumpSuit &&
      currentTrick.ledSuit &&
      playableCards[0].suit !== currentTrick.ledSuit
    ) {
      return this.pickTrumpEstablishCard(playableCards, fullHand);
    }

    // ── Teammate winning → discard cheap (no free mindi giveaway) ──
    if (teammateWinning) {
      return this.getLowestNonMindiCard(playableCards);
    }

    // ── Try to win cheaply if worth it ──
    if (minWinCard) {
      const winVal = this.getRankValue(minWinCard.rank);
      if (oppThreatening || winVal <= this.getRankValue('J')) return minWinCard;
    }

    return this.getLowestNonMindiCard(playableCards);
  }

  // ─── Hard strategy ────────────────────────────────────────────────────────

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

  // ─── Hard: Lead strategy ──────────────────────────────────────────────────

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
    const { myMindis, remaining } = this.countMindiStatus(gameState, myTeam);
    const mindiMajority = gameState.config.mindiMajority;
    const safeAhead = myMindis >= mindiMajority;
    const myTeamTricks = gameState.round.teamTricks[myTeam];
    const isLateGame = trickNumber > 10;

    // Never lead with a mindi unless it's our only option
    const nonMindiPlayable = playableCards.filter(c => c.rank !== '10' && !c.isFiller);
    const leadPool = nonMindiPlayable.length > 0 ? nonMindiPlayable : playableCards;

    // ── 1. Mendikot/Whitewash push ──
    if (safeAhead) {
      if (myTeamTricks >= 8 || remaining === 0) {
        return this.getHighestCard(leadPool);
      }
      return this.getHighestCard(leadPool);
    }

    // ── 2. Void exploit: lead suit where teammate is void so they can trump ──
    const voidExploit = this.getVoidExploitLead(leadPool, gameState, playerIndex, voidMap, trumpSuit);
    if (voidExploit) return voidExploit;

    // ── 3. Late game ──
    if (isLateGame) {
      if (trumpKnown && trumpSuit) {
        const myTrumps = leadPool.filter(c => c.suit === trumpSuit);
        const oppsHaveVoidedTrump = opponents.every(s => voidMap.get(s)?.has(trumpSuit));
        if (myTrumps.length > 0 && !oppsHaveVoidedTrump) {
          return this.getHighestCard(myTrumps);
        }
      }
      return this.getHighestCard(leadPool);
    }

    // ── 4. Suit control: lead suit where we hold 2+ high cards (J+) ──
    const suits: Suit[] = ['hearts', 'diamonds', 'spades', 'clubs'];
    for (const suit of suits) {
      if (suit === trumpSuit) continue;
      const highCardsInSuit = fullHand.filter(
        c => c.suit === suit && !c.isFiller && !c.rank.match(/^10$/) &&
          this.getRankValue(c.rank) >= this.getRankValue('J')
      );
      if (highCardsInSuit.length >= 2) {
        const allOppsVoided = opponents.length > 0 && opponents.every(s => voidMap.get(s)?.has(suit));
        const suitPlayables = leadPool.filter(c => c.suit === suit);
        if (suitPlayables.length === 0) continue;
        if (allOppsVoided) return this.getHighestCard(suitPlayables);
        return this.getLowestCard(suitPlayables);
      }
    }

    // ── 5. Void engineering (cut_hukum only, trump not yet established) ──
    if (trumpMethod === 'cut_hukum' && !trumpKnown) {
      let targetSuit: Suit | null = null;
      let minCount = Infinity;
      for (const suit of suits) {
        if (suit === trumpSuit) continue;
        const nonFillers = fullHand.filter(c => c.suit === suit && !c.isFiller && c.rank !== '10');
        if (nonFillers.length > 0 && nonFillers.length < minCount) {
          minCount = nonFillers.length;
          targetSuit = suit;
        }
      }
      if (targetSuit) {
        const targetPlayables = leadPool.filter(c => c.suit === targetSuit);
        if (targetPlayables.length > 0) return this.getLowestCard(targetPlayables);
      }
    }

    // ── 6. Default: lowest non-mindi card ──
    return this.getLowestCard(leadPool);
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
    const leaderTeam = leaderSeat !== undefined ? gameState.players[leaderSeat]?.teamId : -1;
    const isTeammateLead = leaderTeam === myTeam;
    const isOpponentLead = !isTeammateLead;

    // ── Rule 1: Mindi in trick — only fight or safely gift, never recklessly ──
    if (trickHasMindi) {
      if (teammateWinning) {
        // Gift our mindi ONLY when we're last (no one can steal the trick)
        if (isLastPlayer) {
          const mindi = playableCards.find(c => c.rank === '10');
          if (mindi) return mindi;
        }
        return this.getLowestNonMindiCard(playableCards);
      }
      // Opponent winning — fight at all costs
      if (minWinCard) return minWinCard;
      if (trumpKnown && trumpSuit && currentTrick.ledSuit !== trumpSuit) {
        const myTrumps = playableCards.filter(c => c.suit === trumpSuit);
        if (myTrumps.length > 0) return this.getLowestCard(myTrumps);
      }
      return this.getLowestNonMindiCard(playableCards);
    }

    // ── Rule 2: Last player — perfect information ──
    if (isLastPlayer) {
      if (teammateWinning) {
        // Safe to gift mindi now — last position, teammate already winning
        const mindi = playableCards.find(c => c.rank === '10');
        if (mindi) return mindi;
        return this.getLowestNonMindiCard(playableCards);
      }
      if (minWinCard) return minWinCard;
      return this.getLowestNonMindiCard(playableCards);
    }

    // ── Rule 3: Teammate leads low → win cheaply to keep team's lead ──
    if (isTeammateLead && leaderCard &&
      (leaderCard.isFiller || this.getRankValue(leaderCard.rank) <= this.getRankValue('8'))) {
      if (minWinCard && this.getRankValue(minWinCard.rank) <= this.getRankValue('Q')) {
        return minWinCard;
      }
      return this.getLowestNonMindiCard(playableCards);
    }

    // ── Rule 4: cut_hukum coordination ──
    if (trumpMethod === 'cut_hukum') {
      const leaderRankVal = leaderCard ? this.getRankValue(leaderCard.rank) : 0;
      const ledSuit = currentTrick.ledSuit;

      // 4a. Void in led suit → establish trump
      if (!trumpKnown && ledSuit && playableCards[0].suit !== ledSuit) {
        return this.pickTrumpEstablishCard(playableCards, fullHand);
      }

      // 4b. Opponent leads low → cover high to prevent cheap void
      if (!trumpKnown && isOpponentLead && leaderCard &&
        (leaderCard.isFiller || leaderRankVal <= this.getRankValue('7'))) {
        const ledSuitPlayables = playableCards.filter(c => c.suit === ledSuit);
        if (ledSuitPlayables.length > 0) {
          const highCard = ledSuitPlayables.find(c => this.getRankValue(c.rank) >= this.getRankValue('J'));
          if (highCard) return highCard;
        }
      }
    }

    // ── Rule 5: Trump known — aggressive trump use against opponents ──
    if (trumpKnown && trumpSuit && currentWinner) {
      const winnerCard = currentWinner.card;
      const winnerTeam = gameState.players[currentWinner.seatIndex]?.teamId;
      const opponentWinning = winnerTeam !== myTeam;

      if (opponentWinning) {
        const myTrumps = playableCards.filter(c => c.suit === trumpSuit);

        // Opponent winning with non-trump → cut with lowest trump
        if (winnerCard.suit !== trumpSuit && myTrumps.length > 0) {
          if (isLateGame || safeAhead || oppThreatening) {
            return this.getLowestCard(myTrumps);
          }
        }

        // Opponent winning with trump → over-trump if possible
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

    // ── Rule 6: Teammate winning → discard cheap; never gift mindi mid-trick ──
    if (teammateWinning) {
      return this.getLowestNonMindiCard(playableCards);
    }

    // ── Rule 7: Try to win cheaply ──
    if (minWinCard) {
      const winVal = this.getRankValue(minWinCard.rank);
      if (isLateGame || oppThreatening || winVal <= this.getRankValue('J')) {
        return minWinCard;
      }
    }

    return this.getLowestNonMindiCard(playableCards);
  }

  // ─── Helper: Void exploit lead ────────────────────────────────────────────
  //
  // When it's our turn to lead, look for a suit where:
  //   • A teammate has already voided (so they can trump it)
  //   • At least one opponent still holds that suit (otherwise they'd also trump)
  //   • The suit is not the current trump (we want opponents to follow suit)
  //
  // This models the scenario: "I voided diamonds, so my AI teammate should lead
  // diamonds — I'll win with my Spades trump."

  private getVoidExploitLead(
    leadPool: Card[],
    gameState: GameState,
    playerIndex: number,
    voidMap: Map<number, Set<Suit>>,
    trumpSuit: Suit | null
  ): Card | null {
    const teammates = this.getTeammates(gameState, playerIndex);
    const opponents = this.getOpponents(gameState, playerIndex);
    const suits: Suit[] = ['hearts', 'diamonds', 'spades', 'clubs'];

    for (const suit of suits) {
      if (suit === trumpSuit) continue; // don't lead trump as the exploit suit

      const teammateIsVoid = teammates.some(t => voidMap.get(t)?.has(suit));
      if (!teammateIsVoid) continue;

      // At least one opponent must still follow suit (otherwise our teammate's trump
      // gets over-trumped and we just handed the trick to opponents)
      const someOpponentHasSuit = opponents.length === 0 ||
        opponents.some(o => !voidMap.get(o)?.has(suit));
      if (!someOpponentHasSuit) continue;

      const suitCards = leadPool.filter(c => c.suit === suit);
      if (suitCards.length > 0) {
        // Lead lowest to keep the trick cheap; teammate's trump should win it
        return this.getLowestCard(suitCards);
      }
    }
    return null;
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

  // ─── Helper: Suit strength ────────────────────────────────────────────────

  private getSuitStrength(cards: Card[], suit: Suit): number {
    return cards
      .filter(c => c.suit === suit && !c.isFiller)
      .reduce((sum, c) => sum + this.getRankValue(c.rank), 0);
  }

  // ─── Helper: Current trick winner ────────────────────────────────────────

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

  // ─── Helper: Cheapest winning card ───────────────────────────────────────

  private getMinWinningCard(
    playableCards: Card[],
    trickCards: TrickEntry[],
    trumpSuit: Suit | null
  ): Card | null {
    if (trickCards.length === 0) return null;
    const winner = this.getCurrentTrickWinner(trickCards, trumpSuit);
    if (!winner) return null;
    const ledSuit = trickCards[0].card.suit;

    const winners = playableCards
      .filter(c => this.cardBeats(c, winner.card, ledSuit, trumpSuit))
      .sort((a, b) => this.getRankValue(a.rank) - this.getRankValue(b.rank));

    return winners.length > 0 ? winners[0] : null;
  }

  // ─── Helper: Is this the last player to play this trick? ─────────────────

  private isLastToPlay(
    currentTrick: GameState['round']['currentTrick'],
    playerCount: number
  ): boolean {
    return currentTrick.cards.length === playerCount - 1;
  }

  // ─── Helper: Pick best trump-establishing card (cut_hukum void) ──────────

  private pickTrumpEstablishCard(playableCards: Card[], fullHand: Card[]): Card {
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

  // ─── Helper: Rank value ───────────────────────────────────────────────────

  private getRankValue(rank: string): number {
    const values: Record<string, number> = {
      '3': 1, '2': 2, '7': 3, '8': 4, '9': 5,
      '10': 6, 'J': 7, 'Q': 8, 'K': 9, 'A': 10
    };
    return values[rank] || 0;
  }

  // ─── Helper: Is a teammate currently winning the trick? ──────────────────

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
    const winningTeam = gameState.players[winner.seatIndex]?.teamId;
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

  /** Lowest card that is not a mindi (rank '10'); falls back to lowest overall */
  private getLowestNonMindiCard(cards: Card[]): Card {
    const nonMindi = cards.filter(c => c.rank !== '10' && !c.isFiller);
    if (nonMindi.length > 0) return this.getLowestCard(nonMindi);
    const nonMindiAny = cards.filter(c => c.rank !== '10');
    if (nonMindiAny.length > 0) return this.getLowestCard(nonMindiAny);
    return this.getLowestCard(cards); // forced to play mindi
  }

  /** Highest card that is not a mindi (rank '10'); falls back to highest overall */
  private getHighestNonMindiCard(cards: Card[]): Card {
    const nonMindi = cards.filter(c => c.rank !== '10' && !c.isFiller);
    if (nonMindi.length > 0) return this.getHighestCard(nonMindi);
    const nonMindiAny = cards.filter(c => c.rank !== '10');
    if (nonMindiAny.length > 0) return this.getHighestCard(nonMindiAny);
    return this.getHighestCard(cards); // forced to play mindi
  }
}
