import { useState, useEffect, useCallback, useRef } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { SetupScreen, GameSetup, PlayerConfig } from './components/SetupScreen';
import { JoinGameScreen } from './components/JoinGameScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { GameTable } from './components/GameTable';
import { RoundResult } from './components/RoundResult';
import { GameOver } from './components/GameOver';
import { LoadingScreen } from './components/LoadingScreen';
import { TeamShuffleAnimation } from './components/TeamShuffleAnimation';
import { GameState, Card, Player, Suit, Rank, CompletedTrick } from './types';
import { AIPlayer } from './utils/aiPlayer';
import { connectSocket, disconnectSocket, getSocket } from './utils/socket';
import { CG } from './utils/crazygames';

type Screen = 'home' | 'setup' | 'join' | 'lobby' | 'loading' | 'team_reveal' | 'game' | 'round_result' | 'game_over';

// ─── Deck & Deal ───────────────────────────────────────────────
// PRD §5: Active cards = ranks 8–A only (28 per deck).
// Filler cards are added per player count to bring total to playerCount × 15.

const SUITS: Suit[] = ['hearts', 'diamonds', 'spades', 'clubs'];
// Active ranks only — 7, 2, 3 are filler-only ranks
const ACTIVE_RANKS: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8'];

// Rank value: A=14 … 8=8, then fillers 7 > 2 > 3
const RANK_VALUE: Record<Rank, number> = {
  'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10,
  '9': 9, '8': 8, '7': 7, '2': 2, '3': 1
};

const getRankValue = (rank: string): number => RANK_VALUE[rank as Rank] ?? 0;

/** Build one active deck (28 cards: ranks 8–A × 4 suits). */
function buildActiveDeck(deckIndex: number): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of ACTIVE_RANKS) {
      cards.push({ suit, rank, isFiller: false, deckIndex, id: `${suit}_${rank}_d${deckIndex}_${Math.random().toString(36).slice(2, 8)}` });
    }
  }
  return cards; // 28 cards
}

/**
 * Filler sets per PRD §5.3. All from deckIndex=0.
 * 4p → 4♥7♦7♠7♣  6p → 2♥7♥7♦2♠7♠7♣
 * 8p → 2♥7♥2♦7♦2♠7♠2♣7♣  10p → +3♥3♦
 */
function getFillerCards(playerCount: 4 | 6 | 8 | 10): Card[] {
  const f = (suit: Suit, rank: Rank): Card => ({
    suit, rank, isFiller: true, deckIndex: 0,
    id: `filler_${suit}_${rank}_${Math.random().toString(36).slice(2, 8)}`
  });
  if (playerCount === 4) return [f('hearts','7'), f('diamonds','7'), f('spades','7'), f('clubs','7')];
  if (playerCount === 6) return [f('hearts','2'), f('hearts','7'), f('diamonds','7'), f('spades','2'), f('spades','7'), f('clubs','7')];
  if (playerCount === 8) return [f('hearts','2'), f('hearts','7'), f('diamonds','2'), f('diamonds','7'), f('spades','2'), f('spades','7'), f('clubs','2'), f('clubs','7')];
  // 10 players
  return [f('hearts','2'), f('hearts','7'), f('diamonds','2'), f('diamonds','7'), f('spades','2'), f('spades','7'), f('clubs','2'), f('clubs','7'), f('hearts','3'), f('diamonds','3')];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build and deal the full deck. Each player gets exactly 15 cards.
 * Returns [hands, fillerCards] so GameConfig can store fillerCards.
 */
function buildAndDeal(playerCount: 4 | 6 | 8 | 10): { hands: Card[][]; fillerCards: Card[] } {
  const dc = getDeckCount(playerCount);
  let allCards: Card[] = [];
  for (let d = 0; d < dc; d++) allCards = allCards.concat(buildActiveDeck(d));
  const fillerCards = getFillerCards(playerCount);
  allCards = shuffle([...allCards, ...fillerCards]);

  // Verify: should be playerCount × 15
  console.assert(allCards.length === playerCount * 15, `Deck size ${allCards.length} ≠ ${playerCount * 15}`);

  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  allCards.forEach((card, i) => hands[i % playerCount].push(card));
  return { hands, fillerCards };
}

function getDeckCount(playerCount: number): 2 | 3 | 4 | 5 {
  if (playerCount === 4) return 2;
  if (playerCount === 6) return 3;
  if (playerCount === 8) return 4;
  return 5;
}

function shuffleLocalTeams(playerCount: number): (0 | 1)[] {
  // 50/50 coin flip: [0,1,0,1,...] or [1,0,1,0,...] — guarantees teammates never sit adjacent
  const startTeam = Math.random() < 0.5 ? 0 : 1;
  return Array.from({ length: playerCount }, (_, i) => ((i + startTeam) % 2) as 0 | 1);
}

function getTotalMindis(playerCount: number): 8 | 12 | 16 | 20 {
  if (playerCount === 4) return 8;
  if (playerCount === 6) return 12;
  if (playerCount === 8) return 16;
  return 20;
}

function getMindiMajority(playerCount: number): 5 | 7 | 9 | 11 {
  if (playerCount === 4) return 5;
  if (playerCount === 6) return 7;
  if (playerCount === 8) return 9;
  return 11;
}

/** Anticlockwise: decrement seat index (PRD §6.2) */
function nextSeatAnticlockwise(seat: number, playerCount: number): number {
  return (seat - 1 + playerCount) % playerCount;
}

// ─── Build Initial GameState ───────────────────────────────────

function buildGameState(
  setup: GameSetup,
  roomCode: string,
  dealerSeat = 0,
  preservedGamePoints: [number, number] = [0, 0],
  teamIds?: (0 | 1)[]
): GameState {
  const pc = setup.playerCount as 4 | 6 | 8 | 10;
  const dc = getDeckCount(pc);
  const { hands, fillerCards } = buildAndDeal(pc);

  // For cut_hukum, trump starts as null (decided on first void)
  // For random, trump is drawn immediately
  // For band_hukum_*, trump is hidden until revealed
  const isCutHukum = setup.trumpMethod === 'cut_hukum';
  const isBandHukum = setup.trumpMethod === 'band_hukum_a' || setup.trumpMethod === 'band_hukum_b';
  const randomTrump: Suit | null = (!isCutHukum && !isBandHukum)
    ? SUITS[Math.floor(Math.random() * 4)]
    : null;

  const assignedTeamIds = teamIds ?? shuffleLocalTeams(pc);
  const players: Player[] = setup.playerNames.map((name, i) => ({
    id: `player_${i}`,
    name,
    seatIndex: i,
    teamId: assignedTeamIds[i],
    hand: hands[i],
    cardCount: hands[i].length
  }));

  // PRD §6.2: First trick led by player to dealer's RIGHT = anticlockwise next
  const firstTurn = nextSeatAnticlockwise(dealerSeat, pc);

  return {
    roomCode,
    config: {
      playerCount: pc,
      deckCount: dc,
      trumpMethod: setup.trumpMethod,
      gamePointsTarget: setup.gamePointsTarget,
      totalMindis: getTotalMindis(pc),
      mindiMajority: getMindiMajority(pc),
      fillerCards,
    },
    players,
    round: {
      dealerSeatIndex: dealerSeat,
      currentLeaderSeatIndex: firstTurn,
      currentTurnSeatIndex: firstTurn,
      trumpSuit: randomTrump,
      trumpCard: null,
      trumpRevealed: randomTrump !== null, // only revealed for random method
      currentTrick: { cards: [], ledSuit: null },
      completedTricks: [],
      teamMindis: [0, 0],
      teamTricks: [0, 0],
      trickNumber: 1,
    },
    gamePoints: preservedGamePoints,
    phase: isBandHukum ? 'trump_selection' : 'playing',
    winnerTeamId: null,
  };
}

// ─── Room Code ─────────────────────────────────────────────────

const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

// ─── App ───────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [currentSetup, setCurrentSetup] = useState<GameSetup | null>(null);
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>([]);
  const [aiPlayersMap, setAIPlayersMap] = useState<Map<number, AIPlayer>>(new Map());
  const [roundWinner, setRoundWinner] = useState<{ team: 0 | 1; category: string; points: number } | null>(null);

  // ─── Online multiplayer state ─────────────────────────────────
  const [isOnlineMode, setIsOnlineMode] = useState(false);
  const [mySeatIndex, setMySeatIndex] = useState(0);
  const [myHand, setMyHand] = useState<Card[]>([]);
  const [lobbyPlayers, setLobbyPlayers] = useState<{ name: string; seatIndex: number; teamId: 0|1; connected: boolean; isAI?: boolean; aiDifficulty?: string }[]>([]);
  const [onlineSettings, setOnlineSettings] = useState<{ playerCount: number; trumpMethod: string; gamePointsTarget: number } | null>(null);
  const [isHost, setIsHost] = useState(false);
  // AI hands tracked by host in mixed online games: seatIndex → cards
  const [_onlineAiHands, setOnlineAiHands] = useState<Map<number, Card[]>>(new Map());
  // Team reveal animation data
  const [teamRevealPlayers, setTeamRevealPlayers] = useState<{ name: string; teamId: 0|1; seatIndex: number }[]>([]);

  // Trick-complete display: keep cards visible for a pause before clearing
  const [trickPause, setTrickPause] = useState<{
    cards: GameState['round']['currentTrick']['cards'];
    winnerSeatIndex: number;
    winnerName: string;
    mindisWon: number;
  } | null>(null);

  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trickPauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localTeamIdsRef = useRef<(0 | 1)[] | null>(null);

  // ── CrazyGames SDK: gameplay lifecycle signals ────────────────
  // gameplayStart = player is actively playing cards
  // gameplayStop  = any non-gameplay screen (menus, loading, results)
  useEffect(() => {
    if (screen === 'game') {
      CG.gameplayStart();
    } else {
      CG.gameplayStop();
    }
  }, [screen]);

  // ─── Socket event payload types ──────────────────────────────
  type OnlineLobbyPlayer = { name: string; seatIndex: number; teamId: 0|1; connected: boolean; isAI?: boolean; aiDifficulty?: string };
  type OnlineSettings    = { playerCount: number; trumpMethod: string; gamePointsTarget: number };
  type RRPayload         = { winnerTeamId: 0|1; category: 'normal'|'mendikot'|'whitewash'; pointsAwarded: number };

  // ─── Socket.io event listeners (online mode) ─────────────────
  useEffect(() => {
    if (!isOnlineMode) return;
    const socket = getSocket();

    const onRoomCreated = (d: { roomCode: string; seatIndex: number; players: OnlineLobbyPlayer[]; settings: OnlineSettings }) => {
      setRoomCode(d.roomCode); setMySeatIndex(d.seatIndex); setLobbyPlayers(d.players); setOnlineSettings(d.settings); setIsHost(true); setScreen('lobby');
    };
    const onRoomJoined = (d: { roomCode: string; seatIndex: number; players: OnlineLobbyPlayer[]; settings: OnlineSettings }) => {
      setRoomCode(d.roomCode); setMySeatIndex(d.seatIndex); setLobbyPlayers(d.players); setOnlineSettings(d.settings); setIsHost(false); setScreen('lobby');
    };
    const onPlayerJoined  = (d: { players: OnlineLobbyPlayer[] }) => setLobbyPlayers(d.players);
    const onPlayerLeft    = (d: { players: OnlineLobbyPlayer[] }) => setLobbyPlayers(d.players);
    const onPlayerRenamed = (d: { players: OnlineLobbyPlayer[] }) => setLobbyPlayers(d.players);

    const onGameStarted = (d: { gameState: GameState; myHand: Card[]; mySeatIndex: number; aiHands?: Record<number, Card[]> }) => {
      // Host initialises AI player instances for any AI seats
      if (d.aiHands) {
        const aiMap = new Map<number, AIPlayer>();
        const handsMap = new Map<number, Card[]>();
        Object.entries(d.aiHands).forEach(([seatStr, hand]) => {
          const seat = Number(seatStr);
          handsMap.set(seat, hand as Card[]);
          // Determine difficulty from lobby players
          const lp = lobbyPlayers.find(p => p.seatIndex === seat);
          aiMap.set(seat, new AIPlayer((lp?.aiDifficulty as 'easy' | 'medium' | 'hard') ?? 'medium'));
        });
        setAIPlayersMap(aiMap);
        setOnlineAiHands(handsMap);
      }
      const fullState: GameState = {
        ...d.gameState,
        players: d.gameState.players.map((p: Player, i: number) => {
          if (i === d.mySeatIndex) return { ...p, hand: d.myHand };
          if (d.aiHands?.[i]) return { ...p, hand: d.aiHands[i] };
          return { ...p, hand: [] };
        })
      };
      setGameState(fullState); setMyHand(d.myHand); setMySeatIndex(d.mySeatIndex);
      setTeamRevealPlayers(fullState.players.map(p => ({ name: p.name, teamId: p.teamId, seatIndex: p.seatIndex })));
      setScreen('team_reveal');
    };

    const onCardPlayed = (d: { gameState: GameState; trickComplete: boolean; seatIndex: number; cardId: string }) => {
      // Update AI hand locally — remove played card
      setOnlineAiHands(prev => {
        if (!prev.has(d.seatIndex)) return prev;
        const next = new Map(prev);
        next.set(d.seatIndex, (prev.get(d.seatIndex) ?? []).filter(c => c.id !== d.cardId));
        return next;
      });
      // Update myHand state if the local player played the card
      if (d.seatIndex === mySeatIndex) {
        setMyHand(prev => prev.filter(c => c.id !== d.cardId));
      }
      setGameState(prev => {
        if (!prev) return prev;
        const currentMyHand = prev.players[mySeatIndex]?.hand ?? myHand;
        // Remove the played card from my hand if I was the one who played it
        const myHandNow = d.seatIndex === mySeatIndex
          ? currentMyHand.filter(c => c.id !== d.cardId)
          : currentMyHand;
        return {
          ...d.gameState,
          players: d.gameState.players.map((p: Player, i: number) => {
            if (i === mySeatIndex) return { ...p, hand: myHandNow };
            // Preserve AI hand (already updated via setOnlineAiHands above — use prev)
            const prevHand = prev.players[i]?.hand ?? [];
            if (prevHand.length > 0) {
              const updatedHand = i === d.seatIndex ? prevHand.filter(c => c.id !== d.cardId) : prevHand;
              return { ...p, hand: updatedHand };
            }
            return { ...p, hand: [] };
          })
        };
      });
      if (d.trickComplete) {
        const lastTrick = d.gameState.round.completedTricks.at(-1);
        if (lastTrick) {
          setTrickPause({
            cards: lastTrick.cards,
            winnerSeatIndex: lastTrick.winnerSeatIndex,
            winnerName: d.gameState.players[lastTrick.winnerSeatIndex]?.name ?? '',
            mindisWon: lastTrick.mindisInTrick
          });
        }
        trickPauseRef.current = setTimeout(() => { trickPauseRef.current = null; setTrickPause(null); }, 2000);
      }
    };

    const onRoundComplete = (d: { roundResult: RRPayload; gamePoints: [number,number] }) => {
      setRoundWinner({ team: d.roundResult.winnerTeamId, category: d.roundResult.category, points: d.roundResult.pointsAwarded });
      setScreen('round_result');
    };

    const onGameOver = (d: { winnerTeam: 0|1; finalScores: [number,number]; roundResult: RRPayload }) => {
      setRoundWinner({ team: d.roundResult.winnerTeamId, category: d.roundResult.category, points: d.roundResult.pointsAwarded });
      setGameState(prev => prev ? { ...prev, gamePoints: d.finalScores, winnerTeamId: d.winnerTeam, phase: 'game_over' } : prev);
      setScreen('game_over');
    };

    const onRoundStarted = (d: { gameState: GameState; myHand: Card[]; mySeatIndex: number; aiHands?: Record<number, Card[]> }) => {
      if (d.aiHands) {
        const handsMap = new Map<number, Card[]>();
        Object.entries(d.aiHands).forEach(([seatStr, hand]) => handsMap.set(Number(seatStr), hand as Card[]));
        setOnlineAiHands(handsMap);
      }
      const fullState: GameState = {
        ...d.gameState,
        players: d.gameState.players.map((p: Player, i: number) => {
          if (i === d.mySeatIndex) return { ...p, hand: d.myHand };
          if (d.aiHands?.[i]) return { ...p, hand: d.aiHands[i] };
          return { ...p, hand: [] };
        })
      };
      setGameState(fullState); setMyHand(d.myHand); setRoundWinner(null); setScreen('game');
    };

    const onTrumpRevealed = (d: { trumpSuit: Suit }) => {
      setGameState(prev => prev ? { ...prev, round: { ...prev.round, trumpSuit: d.trumpSuit, trumpRevealed: true } } : prev);
    };

    const onSocketError  = (d: { message: string }) => { console.error('[socket error]', d.message); alert(`Server error: ${d.message}`); };
    const onDisconnected = (d: { seatIndex: number }) => console.warn('[online] player disconnected from seat', d.seatIndex);

    socket.on('room_created',       onRoomCreated);
    socket.on('room_joined',        onRoomJoined);
    socket.on('player_joined',      onPlayerJoined);
    socket.on('player_left',        onPlayerLeft);
    socket.on('player_renamed',     onPlayerRenamed);
    socket.on('game_started',       onGameStarted);
    socket.on('card_played',        onCardPlayed);
    socket.on('round_complete',     onRoundComplete);
    socket.on('game_over',          onGameOver);
    socket.on('round_started',      onRoundStarted);
    socket.on('trump_revealed',     onTrumpRevealed);
    socket.on('error',              onSocketError);
    socket.on('player_disconnected',onDisconnected);

    return () => {
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('player_renamed');
      socket.off('game_started');
      socket.off('card_played');
      socket.off('round_complete');
      socket.off('game_over');
      socket.off('round_started');
      socket.off('trump_revealed');
      socket.off('error');
      socket.off('player_disconnected');
    };
  }, [isOnlineMode, mySeatIndex, myHand]);

  // ─── Play a card (works for both human and AI) ───────────────

  const playCard = useCallback((cardId: string) => {
    setGameState(prev => {
      if (!prev) return prev;
      // Block play during trick pause
      if (trickPauseRef.current) return prev;

      const currentIdx = prev.round.currentTurnSeatIndex;
      const player = prev.players[currentIdx];
      const card = player.hand.find(c => c.id === cardId);
      if (!card) {
        console.warn('Card not found:', cardId, 'in player', currentIdx, 'hand size', player.hand.length);
        return prev;
      }

      // Build new players array with card removed
      const newPlayers = prev.players.map((p, i) => {
        if (i !== currentIdx) return p;
        const newHand = p.hand.filter(c => c.id !== cardId);
        return { ...p, hand: newHand, cardCount: newHand.length };
      });

      // Build new trick cards
      const newTrickCards = [...prev.round.currentTrick.cards, { seatIndex: currentIdx, card }];
      const newLedSuit = prev.round.currentTrick.ledSuit || card.suit;

      // ─── Cut Hukum: set trump on first void ───
      let updatedTrumpSuit = prev.round.trumpSuit;
      let updatedTrumpRevealed = prev.round.trumpRevealed;
      if (prev.config.trumpMethod === 'cut_hukum' && !prev.round.trumpSuit && prev.round.currentTrick.ledSuit) {
        // A led suit exists. If this card doesn't match it, it's a void = cut
        if (card.suit !== prev.round.currentTrick.ledSuit) {
          updatedTrumpSuit = card.suit;
          updatedTrumpRevealed = true;
        }
      }

      // Check if trick is complete
      if (newTrickCards.length === prev.config.playerCount) {
        // Determine winner
        let winIdx = 0;
        let winCard = newTrickCards[0].card;
        const ledSuit = newTrickCards[0].card.suit;
        const trumpSuit = updatedTrumpSuit;

        for (let i = 1; i < newTrickCards.length; i++) {
          const c = newTrickCards[i].card;
          let beats = false;
          if (trumpSuit && c.suit === trumpSuit && winCard.suit !== trumpSuit) {
            beats = true;
          } else if (trumpSuit && winCard.suit === trumpSuit && c.suit !== trumpSuit) {
            beats = false;
          } else if (c.suit === winCard.suit) {
            // Same card: last player wins
            beats = getRankValue(c.rank) >= getRankValue(winCard.rank);
          } else if (c.suit === ledSuit && winCard.suit !== ledSuit) {
            beats = true;
          }
          if (beats) { winCard = c; winIdx = i; }
        }

        const winningSeat = newTrickCards[winIdx].seatIndex;
        const winTeam = newPlayers[winningSeat].teamId;
        const mindisInTrick = newTrickCards.filter(e => e.card.rank === '10').length;

        const newTeamMindis: [number, number] = [...prev.round.teamMindis] as [number, number];
        const newTeamTricks: [number, number] = [...prev.round.teamTricks] as [number, number];
        newTeamMindis[winTeam] += mindisInTrick;
        newTeamTricks[winTeam] += 1;

        const completed: CompletedTrick = {
          cards: newTrickCards,
          winnerSeatIndex: winningSeat,
          mindisInTrick
        };

        const newTrickNumber = prev.round.trickNumber + 1;
        // PRD §9.2: every round = exactly 15 tricks
        const roundOver = newPlayers.every(p => p.hand.length === 0);

        if (roundOver) {
          // ─── Scoring (PRD §11) ───────────────────────────────
          const majority = prev.config.mindiMajority;
          const totalMindis = prev.config.totalMindis;
          let winnerTeam: 0 | 1;
          let category: 'normal' | 'mendikot' | 'whitewash' = 'normal';
          let points = 1;

          // Tiebreaker: if equal mindis, trick majority decides
          if (newTeamMindis[0] >= majority) {
            winnerTeam = 0;
          } else if (newTeamMindis[1] >= majority) {
            winnerTeam = 1;
          } else {
            // Equal mindis — trick majority wins (PRD §11.1)
            winnerTeam = newTeamTricks[0] >= 8 ? 0 : 1;
          }

          // PRD §11.2: Whitewash=3pts, Mendikot=2pts, Normal=1pt
          if (newTeamTricks[1 - winnerTeam as 0 | 1] === 0) {
            category = 'whitewash';
            points = 3;
          } else if (newTeamMindis[winnerTeam] === totalMindis) {
            category = 'mendikot';
            points = 2;
          }

          const newGamePoints: [number, number] = [...prev.gamePoints] as [number, number];
          newGamePoints[winnerTeam] += points;

          // Store round result for display
          setTimeout(() => {
            setRoundWinner({ team: winnerTeam, category, points });
            if (newGamePoints[winnerTeam] >= prev.config.gamePointsTarget) {
              setScreen('game_over');
            } else {
              setScreen('round_result');
            }
          }, 1000);

          return {
            ...prev,
            players: newPlayers,
            round: {
              ...prev.round,
              currentTrick: { cards: [], ledSuit: null },
              completedTricks: [...prev.round.completedTricks, completed],
              teamMindis: newTeamMindis,
              teamTricks: newTeamTricks,
              currentLeaderSeatIndex: winningSeat,
              currentTurnSeatIndex: winningSeat,
              trickNumber: newTrickNumber,
            },
            gamePoints: newGamePoints,
            winnerTeamId: newGamePoints[0] >= prev.config.gamePointsTarget ? 0 :
                          newGamePoints[1] >= prev.config.gamePointsTarget ? 1 : null,
          };
        }

        // Trick complete but round continues
        // Set a pause to show the winning card
        trickPauseRef.current = setTimeout(() => {
          trickPauseRef.current = null;
          setTrickPause(null);
        }, 2000);
        setTrickPause({
          cards: newTrickCards,
          winnerSeatIndex: winningSeat,
          winnerName: newPlayers[winningSeat].name,
          mindisWon: mindisInTrick
        });

        return {
          ...prev,
          players: newPlayers,
          round: {
            ...prev.round,
            currentTrick: { cards: [], ledSuit: null },
            completedTricks: [...prev.round.completedTricks, completed],
            teamMindis: newTeamMindis,
            teamTricks: newTeamTricks,
            currentLeaderSeatIndex: winningSeat,
            currentTurnSeatIndex: winningSeat,
            trickNumber: newTrickNumber,
            trumpSuit: updatedTrumpSuit,
            trumpRevealed: updatedTrumpRevealed,
          }
        };
      }

      // Trick not yet complete — advance turn anticlockwise (PRD §6.2)
      const nextTurn = nextSeatAnticlockwise(currentIdx, prev.config.playerCount);
      return {
        ...prev,
        players: newPlayers,
        round: {
          ...prev.round,
          currentTrick: { cards: newTrickCards, ledSuit: newLedSuit },
          currentTurnSeatIndex: nextTurn,
          trumpSuit: updatedTrumpSuit,
          trumpRevealed: updatedTrumpRevealed,
        }
      };
    });
  }, []);

  // ─── AI auto-play ────────────────────────────────────────────

  useEffect(() => {
    if (!gameState || screen !== 'game') return;
    if (trickPause) return;

    const currentIdx = gameState.round.currentTurnSeatIndex;

    // ── Online mode: host drives AI seats ──────────────────────────
    if (isOnlineMode) {
      if (!isHost || !aiPlayersMap.has(currentIdx)) {
        // Also handle band_hukum trump selection for AI dealer
        if (isHost && gameState.phase === 'trump_selection') {
          const dealerSeat = gameState.round.dealerSeatIndex;
          if (aiPlayersMap.has(dealerSeat)) {
            const aiHand = gameState.players[dealerSeat].hand;
            if (aiHand.length > 0) {
              const randomCard = aiHand[Math.floor(Math.random() * aiHand.length)];
              aiTimeoutRef.current = setTimeout(() => {
                getSocket().emit('ai_set_band_hukum', { roomCode, seatIndex: dealerSeat, cardId: randomCard.id });
              }, 800);
              return () => { if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current); };
            }
          }
        }
        return;
      }

      const ai = aiPlayersMap.get(currentIdx)!;
      const aiHand = gameState.players[currentIdx].hand;
      if (aiHand.length === 0) return;

      const thinkTime = 600 + Math.random() * 800;
      aiTimeoutRef.current = setTimeout(() => {
        const selectedCard = ai.selectCard(aiHand, gameState, currentIdx);
        getSocket().emit('ai_play_card', { roomCode, seatIndex: currentIdx, cardId: selectedCard.id });
      }, thinkTime);
      return () => { if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current); };
    }

    // ── Local mode ─────────────────────────────────────────────────
    const config = playerConfigs[currentIdx];
    if (!config?.isAI || !aiPlayersMap.has(currentIdx)) return;

    const ai = aiPlayersMap.get(currentIdx)!;
    const player = gameState.players[currentIdx];
    if (player.hand.length === 0) return;

    const thinkTime = 600 + Math.random() * 800;
    aiTimeoutRef.current = setTimeout(() => {
      const selectedCard = ai.selectCard(player.hand, gameState, currentIdx);
      playCard(selectedCard.id);
    }, thinkTime);

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [gameState, screen, playerConfigs, aiPlayersMap, playCard, trickPause, isOnlineMode, isHost, roomCode]);

  // ─── Setup helpers ───────────────────────────────────────────

  const initAI = (setup: GameSetup) => {
    const aiMap = new Map<number, AIPlayer>();
    setup.players.forEach((p, i) => {
      if (p.isAI && p.aiDifficulty) {
        aiMap.set(i, new AIPlayer(p.aiDifficulty));
      }
    });
    setAIPlayersMap(aiMap);
    return aiMap;
  };

  const startGameFromSetup = (setup: GameSetup) => {
    const code = generateRoomCode();
    setRoomCode(code);
    setCurrentSetup(setup);
    setPlayerConfigs(setup.players);
    initAI(setup);

    // Shuffle teams once; preserve across rounds
    const teamIds = shuffleLocalTeams(setup.playerCount);
    localTeamIdsRef.current = teamIds;

    setScreen('loading');
    setTimeout(() => {
      const state = buildGameState(setup, code, 0, [0, 0], teamIds);
      setGameState(state);
      setTeamRevealPlayers(state.players.map(p => ({ name: p.name, teamId: p.teamId, seatIndex: p.seatIndex })));
      setScreen('team_reveal');
    }, 1500);
  };

  // ─── Screen handlers ────────────────────────────────────────

  const PLAYER_NAME_KEY = 'mindi_player_name';

  const handleRenamePlayer = (newName: string) => {
    const trimmed = newName.trim().slice(0, 20);
    if (!trimmed) return;
    localStorage.setItem(PLAYER_NAME_KEY, trimmed);
    if (isOnlineMode) {
      getSocket().emit('rename_player', { roomCode, newName: trimmed });
      return;
    }
    // Local mode: update configs so the lobby reflects the new name
    setPlayerConfigs(prev => prev.map((p, i) => i === 0 ? { ...p, name: trimmed } : p));
    setCurrentSetup(prev => prev ? {
      ...prev,
      playerNames: prev.playerNames.map((n, i) => i === 0 ? trimmed : n),
      players: prev.players.map((p, i) => i === 0 ? { ...p, name: trimmed } : p),
    } : prev);
    setLobbyPlayers(prev => prev.map(p => p.seatIndex === 0 ? { ...p, name: trimmed } : p));
  };

  const handleBack = () => {
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    if (isOnlineMode) {
      disconnectSocket();
      setIsOnlineMode(false);
    }
    setScreen('home');
    setGameState(null);
    setRoomCode('');
    setCurrentSetup(null);
    setLobbyPlayers([]);
    setOnlineSettings(null);
  };

  const handleQuickPlay = () => {
    const savedName = localStorage.getItem('mindi_player_name') || 'You';
    const quickSetup: GameSetup = {
      playerCount: 4,
      trumpMethod: 'cut_hukum',
      gamePointsTarget: 5,
      playerNames: [savedName, 'Arjun', 'Priya', 'Vikram'],
      players: [
        { name: savedName, isAI: false },
        { name: 'Arjun', isAI: true, aiDifficulty: 'medium' },
        { name: 'Priya', isAI: true, aiDifficulty: 'medium' },
        { name: 'Vikram', isAI: true, aiDifficulty: 'medium' },
      ]
    };
    startGameFromSetup(quickSetup);
  };

  const handleSetupComplete = (setup: GameSetup) => {
    const aiPlayers = setup.players.filter((p, i) => i > 0 && p.isAI);
    const humanCount = setup.players.filter(p => !p.isAI).length;
    setCurrentSetup(setup);

    // Go local only if every non-host seat is AI (solo play)
    if (humanCount === 1 && aiPlayers.length > 0) {
      setPlayerConfigs(setup.players);
      startGameFromSetup(setup);
      return;
    }

    // Online mode — supports all-human and mixed human+AI
    setIsOnlineMode(true);
    setScreen('loading');
    const aiSlots = aiPlayers.map(p => ({
      seatIndex: setup.players.indexOf(p),
      name: p.name,
      difficulty: (p.aiDifficulty ?? 'medium') as 'easy' | 'medium' | 'hard',
    }));
    const payload = {
      playerName: setup.playerNames[0],
      playerCount: setup.playerCount,
      trumpMethod: setup.trumpMethod,
      gamePointsTarget: setup.gamePointsTarget,
      ...(aiSlots.length > 0 && { aiSlots }),
    };
    const socket = connectSocket();
    const doCreate = () => socket.emit('create_room', payload);
    if (socket.connected) {
      doCreate();
    } else {
      socket.once('connect', doCreate);
    }
  };

  const handleStartGameFromLobby = () => {
    if (isOnlineMode) {
      // Online: tell server to start
      getSocket().emit('start_game', { roomCode });
      setScreen('loading');
    } else {
      // Local fallback (shouldn't normally be reached)
      if (!currentSetup) return;
      setScreen('loading');
      setTimeout(() => {
        const state = buildGameState(currentSetup, roomCode);
        setGameState(state);
        setTeamRevealPlayers(state.players.map(p => ({ name: p.name, teamId: p.teamId, seatIndex: p.seatIndex })));
        setScreen('team_reveal');
      }, 1500);
    }
  };

  const handleJoinSubmit = (code: string, playerName: string) => {
    setIsOnlineMode(true);
    setScreen('loading');
    const socket = connectSocket();
    const doJoin = () => {
      socket.emit('join_room', { roomCode: code.toUpperCase(), playerName });
    };
    if (socket.connected) {
      doJoin();
    } else {
      socket.once('connect', doJoin);
    }
  };

  const handleNextRound = () => {
    if (isOnlineMode) {
      // Online: only host can trigger next round
      if (isHost) getSocket().emit('next_round', { roomCode });
      return;
    }
    if (!currentSetup || !gameState) return;
    // PRD §12.2: dealer rotation — loser stays, winner passes right (anticlockwise)
    const prevDealer = gameState.round.dealerSeatIndex;
    const winnerTeam = roundWinner?.team;
    let newDealer: number;
    if (winnerTeam !== undefined && gameState.players[prevDealer].teamId !== winnerTeam) {
      newDealer = prevDealer;
    } else {
      newDealer = nextSeatAnticlockwise(prevDealer, gameState.config.playerCount);
    }
    const newState = buildGameState(
      currentSetup,
      roomCode,
      newDealer,
      [...gameState.gamePoints] as [number, number],
      localTeamIdsRef.current ?? undefined
    );
    setGameState(newState);
    setRoundWinner(null);
    setScreen('game');
  };

  const handlePlayAgain = () => {
    setScreen('setup');
    setGameState(null);
    setRoundWinner(null);
  };

  const handleCardClick = (cardId: string) => {
    if (!gameState) return;
    if (isOnlineMode) {
      // Online: only allow action on our own seat
      if (gameState.round.currentTurnSeatIndex !== mySeatIndex) return;
      getSocket().emit('play_card', { roomCode, cardId });
      return;
    }
    // Local/AI mode
    const currentIdx = gameState.round.currentTurnSeatIndex;
    if (playerConfigs[currentIdx]?.isAI) return;
    playCard(cardId);
  };

  // ─── Render ──────────────────────────────────────────────────

  return (
    <>
      {screen === 'home' && (
        <HomeScreen
          onCreateGame={() => setScreen('setup')}
          onJoinGame={() => setScreen('join')}
          onQuickPlay={handleQuickPlay}
        />
      )}

      {screen === 'setup' && (
        <SetupScreen onBack={handleBack} onStart={handleSetupComplete} />
      )}

      {screen === 'join' && (
        <JoinGameScreen onBack={handleBack} onJoin={handleJoinSubmit} />
      )}

      {screen === 'lobby' && (
        <LobbyScreen
          roomCode={roomCode}
          mySeatIndex={mySeatIndex}
          players={
            isOnlineMode
              ? lobbyPlayers.map(p => ({
                  name: p.name,
                  seatIndex: p.seatIndex,
                  teamId: p.teamId,
                  isHost: p.seatIndex === 0,
                  isAI: p.isAI ?? false,
                  aiDifficulty: p.aiDifficulty,
                }))
              : playerConfigs.map((config, index) => ({
                  name: config.name,
                  seatIndex: index,
                  teamId: (index % 2) as 0 | 1,
                  isHost: index === 0,
                  isAI: config.isAI,
                  aiDifficulty: config.aiDifficulty
                }))
          }
          maxPlayers={
            isOnlineMode
              ? (onlineSettings?.playerCount ?? 4)
              : (currentSetup?.playerCount ?? 4)
          }
          isHost={isOnlineMode ? isHost : true}
          gameSettings={
            isOnlineMode && onlineSettings
              ? onlineSettings as { playerCount: number; trumpMethod: string; gamePointsTarget: number }
              : {
                  playerCount: currentSetup?.playerCount ?? 4,
                  trumpMethod: currentSetup?.trumpMethod ?? 'cut_hukum',
                  gamePointsTarget: currentSetup?.gamePointsTarget ?? 5
                }
          }
          onStartGame={handleStartGameFromLobby}
          onBack={handleBack}
          onRenamePlayer={handleRenamePlayer}
        />
      )}

      {screen === 'loading' && (
        <LoadingScreen message="Setting up the game..." />
      )}

      {screen === 'team_reveal' && (
        <TeamShuffleAnimation
          players={teamRevealPlayers}
          onComplete={() => setScreen('game')}
        />
      )}

      {screen === 'game' && gameState && (
        <GameTable
          gameState={gameState}
          myPlayerIndex={isOnlineMode ? mySeatIndex : (playerConfigs.findIndex((p: PlayerConfig) => !p.isAI) ?? 0)}
          onCardClick={handleCardClick}
          aiPlayers={isOnlineMode ? new Set<number>() : new Set(aiPlayersMap.keys())}
          trickPause={trickPause}
          onExitGame={handleBack}
        />
      )}

      {screen === 'round_result' && gameState && roundWinner && (
        <RoundResult
          winnerTeam={roundWinner.team}
          category={roundWinner.category as any}
          pointsAwarded={roundWinner.points}
          teamScores={gameState.gamePoints}
          teamMindis={gameState.round.teamMindis}
          teamTricks={gameState.round.teamTricks}
          onNextRound={handleNextRound}
        />
      )}

      {screen === 'game_over' && gameState && (
        <GameOver
          winnerTeam={gameState.winnerTeamId ?? 0}
          finalScores={gameState.gamePoints}
          targetPoints={gameState.config.gamePointsTarget}
          players={gameState.players.map(p => ({ name: p.name, teamId: p.teamId }))}
          teamMindis={gameState.round.teamMindis}
          teamTricks={gameState.round.teamTricks}
          onPlayAgain={handlePlayAgain}
          onHome={handleBack}
        />
      )}
    </>
  );
}