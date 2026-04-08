import { useState, useEffect, useRef, useMemo } from 'react';
import { GameState, TrickEntry, Suit, Card as CardType } from '../types';
import { Card } from './Card';
import { TrickArea } from './TrickArea';
import { TableBackground3D } from './TableBackground3D';
import { Trophy, Target, Zap, ChevronUp, ChevronDown, Crown, Layers, Hash } from 'lucide-react';
import { Sounds } from '../utils/sounds';

const AVATARS = ['🦁', '🦅', '🐘', '🦚', '🐅', '🐍', '🦎', '🐎', '🐒', '🦜'];

interface TrickPauseData {
  cards: TrickEntry[];
  winnerSeatIndex: number;
  winnerName: string;
  mindisWon: number;
}

interface GameTableProps {
  gameState: GameState;
  myPlayerIndex: number;
  onCardClick?: (cardId: string) => void;
  aiPlayers?: Set<number>;
  trickPause?: TrickPauseData | null;
}

const suitSymbols: Record<string, string> = { hearts: '♥', diamonds: '♦', spades: '♠', clubs: '♣' };
const suitCols: Record<string, string> = { hearts: '#e53e3e', diamonds: '#dd6b20', spades: '#a0aec0', clubs: '#a0aec0' };
const SUIT_ORDER = ['hearts', 'diamonds', 'spades', 'clubs'] as const;
const TEAM_COL = [
  { bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)', text: '#6fa3d4', label: 'A' },
  { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', text: '#d47070', label: 'B' },
];

/** Get playable cards for the human player (must follow led suit) */
function getPlayableCardIds(hand: { id: string; suit: Suit }[], ledSuit: Suit | null): Set<string> {
  if (!ledSuit) return new Set(hand.map(c => c.id));
  const samesuit = hand.filter(c => c.suit === ledSuit);
  if (samesuit.length > 0) return new Set(samesuit.map(c => c.id));
  return new Set(hand.map(c => c.id));
}

export function GameTable({ gameState, myPlayerIndex, onCardClick, aiPlayers, trickPause }: GameTableProps) {
  const myPlayer = gameState.players[myPlayerIndex];
  const { round, config } = gameState;
  const isMyTurn = round.currentTurnSeatIndex === myPlayerIndex && !trickPause;
  const [scoreExpanded, setScoreExpanded] = useState(false);
  const [dealing, setDealing] = useState(true);
  const prevTrickRef = useRef(round.trickNumber);
  const prevTurnRef = useRef(round.currentTurnSeatIndex);

  const handCount = myPlayer.hand.length;

  // ── Font scale: fewer players = larger text ──────────────────────
  const uiScale = ({ 4: 1.0, 6: 0.88, 8: 0.78, 10: 0.70 } as Record<number, number>)[config.playerCount] ?? 1.0;
  const fs = (px: number): string => `${Math.round(px * uiScale)}px`;

  // ── Orientation & window tracking ─────────────────────────────────
  const [winSize, setWinSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const update = () => setWinSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', () => setTimeout(update, 100));
    return () => window.removeEventListener('resize', update);
  }, []);
  const isLandscape = winSize.w > winSize.h;
  const isMobilePortrait = winSize.h > winSize.w && winSize.w < 900;

  // ── Table size: adapts to orientation ─────────────────────────────
  const tableSize = useMemo(() => {
    const { w, h } = winSize;
    const landscape = w > h;
    const overhead = landscape ? 190 : 310;
    const maxW = landscape ? Math.min(w * 0.52, h - 40) : w - 8;
    const availH = (h - overhead) * 0.95;
    return Math.floor(Math.min(maxW, availH, 540));
  }, [winSize]);

  const cardSz: 'sm' | 'md' = isLandscape && winSize.h < 500 ? 'sm' : 'md';
  const cardW = cardSz === 'sm' ? 64 : 84;
  const handHeight = isLandscape ? 120 : 165;

  // Deal animation on mount
  useEffect(() => {
    setDealing(true);
    const t = setTimeout(() => setDealing(false), 800);
    return () => clearTimeout(t);
  }, []);

  // Sound: your turn
  useEffect(() => {
    if (isMyTurn && !aiPlayers?.has(myPlayerIndex)) Sounds.yourTurn();
  }, [isMyTurn, myPlayerIndex, aiPlayers]);

  // Sound: trick won
  useEffect(() => {
    if (trickPause) Sounds.trickWin();
  }, [trickPause]);

  // Sound: card played
  useEffect(() => {
    if (round.currentTurnSeatIndex !== prevTurnRef.current || round.trickNumber !== prevTrickRef.current) {
      if (!dealing) Sounds.cardPlay();
      prevTurnRef.current = round.currentTurnSeatIndex;
      prevTrickRef.current = round.trickNumber;
    }
  }, [round.currentTurnSeatIndex, round.trickNumber, dealing]);

  // ── Playable cards ─────────────────────────────────────────────────
  const playableIds = isMyTurn && !aiPlayers?.has(myPlayerIndex)
    ? getPlayableCardIds(myPlayer.hand, round.currentTrick.ledSuit)
    : new Set<string>();

  // ── Hand: suits grouped, alternating color order ♥ ♠ ♦ ♣ ──────────
  // hearts(red) → spades(black) → diamonds(red) → clubs(black)
  const sortedHand = useMemo(() => {
    const rv = (r: string) => ({ '3': 1, '2': 2, '7': 3, '8': 4, '9': 5, '10': 6, 'J': 7, 'Q': 8, 'K': 9, 'A': 10 } as Record<string, number>)[r] ?? 0;
    const suitOrder: Record<string, number> = { hearts: 0, spades: 1, diamonds: 2, clubs: 3 };
    return [...myPlayer.hand].sort((a, b) => {
      if (suitOrder[a.suit] !== suitOrder[b.suit]) return suitOrder[a.suit] - suitOrder[b.suit];
      return rv(b.rank) - rv(a.rank);
    });
  }, [myPlayer.hand]);

  const maxW = Math.min(winSize.w - 24, 700);
  const overlap = handCount > 1 ? Math.max(24, Math.min(60, (maxW - cardW) / (handCount - 1))) : 0;
  const totalHandWidth = handCount > 1 ? cardW + overlap * (handCount - 1) : cardW;
  const maxRot = Math.min(handCount * 1.5, 22);
  const totalTricks = Math.floor((40 * config.deckCount) / config.playerCount);

  const handleCardClick = (cardId: string) => {
    if (!playableIds.has(cardId)) return;
    onCardClick?.(cardId);
  };

  // ── Captured mindis by suit per team ──────────────────────────────
  const capturedMindis = useMemo(() => {
    const result: [Record<string, number>, Record<string, number>] = [{}, {}];
    for (const trick of round.completedTricks) {
      if (trick.mindisInTrick === 0) continue;
      const teamId = gameState.players[trick.winnerSeatIndex]?.teamId ?? 0;
      for (const entry of trick.cards) {
        if (entry.card.rank === '10') {
          result[teamId][entry.card.suit] = (result[teamId][entry.card.suit] || 0) + 1;
        }
      }
    }
    return result;
  }, [round.completedTricks, gameState.players]);

  return (
    <div className="h-screen w-screen relative overflow-hidden flex flex-col" style={{ background: 'linear-gradient(180deg, #120404 0%, #1e0808 40%, #2a0f0f 100%)' }}>
      <TableBackground3D />

      {/* ── Portrait overlay: ask user to rotate ── */}
      {isMobilePortrait && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4"
          style={{ background: 'rgba(8,2,2,0.97)', backdropFilter: 'blur(12px)' }}>
          <div className="text-6xl animate-bounce-subtle">📱</div>
          <div className="text-5xl font-bold" style={{ color: '#d4a843', transform: 'rotate(90deg)', display: 'inline-block' }}>↻</div>
          <p className="font-cinzel text-xl tracking-widest text-center" style={{ color: '#d4a843' }}>ROTATE YOUR DEVICE</p>
          <p className="text-sm text-center px-10" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Mindi is designed for landscape mode
          </p>
        </div>
      )}

      {/* ─── Top Bar ─── */}
      <div className="relative z-20 flex-shrink-0">
        <div className="flex items-center justify-between px-3" style={{
          paddingTop: isLandscape ? 4 : 8, paddingBottom: isLandscape ? 4 : 8,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(212,168,67,0.08)',
        }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: fs(18), color: '#d4a843' }}>♠</span>
            <span className="font-cinzel tracking-[0.15em]" style={{ fontSize: fs(10), color: 'rgba(212,168,67,0.5)' }}>MINDI</span>
          </div>

          {round.trumpSuit ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.12)' }}>
              <Zap style={{ width: fs(12), height: fs(12), color: '#d4a843' }} />
              <span style={{ fontSize: fs(9), color: 'rgba(255,255,255,0.3)' }}>Trump</span>
              <span style={{ fontSize: fs(18), lineHeight: 1, color: suitCols[round.trumpSuit] }}>
                {suitSymbols[round.trumpSuit]}
              </span>
            </div>
          ) : config.trumpMethod === 'cut_hukum' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full animate-pulse" style={{ background: 'rgba(212,168,67,0.04)', border: '1px dashed rgba(212,168,67,0.2)' }}>
              <Zap style={{ width: fs(12), height: fs(12), color: 'rgba(212,168,67,0.4)' }} />
              <span style={{ fontSize: fs(9), color: 'rgba(212,168,67,0.5)' }}>Cut Hukum</span>
              <span style={{ fontSize: fs(9), color: 'rgba(255,255,255,0.2)' }}>?</span>
            </div>
          ) : null}

          <button onClick={() => setScoreExpanded(!scoreExpanded)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors"
            style={{ background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.1)' }}>
            <Trophy style={{ width: fs(12), height: fs(12), color: '#d4a843' }} />
            <span className="font-bold" style={{ fontSize: fs(14), color: '#6fa3d4' }}>{gameState.gamePoints[0]}</span>
            <span style={{ fontSize: fs(10), color: 'rgba(255,255,255,0.15)' }}>–</span>
            <span className="font-bold" style={{ fontSize: fs(14), color: '#d47070' }}>{gameState.gamePoints[1]}</span>
            {scoreExpanded
              ? <ChevronUp style={{ width: fs(12), height: fs(12), color: 'rgba(212,168,67,0.3)' }} />
              : <ChevronDown style={{ width: fs(12), height: fs(12), color: 'rgba(212,168,67,0.3)' }} />}
          </button>
        </div>

        {scoreExpanded && (
          <div className="px-4 py-3 animate-fade-in" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(212,168,67,0.06)' }}>
            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
              {[
                { label: 'Team A', pts: gameState.gamePoints[0], m: round.teamMindis[0], t: round.teamTricks[0], c: '96,165,250' },
                null,
                { label: 'Team B', pts: gameState.gamePoints[1], m: round.teamMindis[1], t: round.teamTricks[1], c: '248,113,113' },
              ].map((d, i) => d ? (
                <div key={i} className="rounded-lg p-2 text-center" style={{ background: `rgba(${d.c},0.05)`, border: `1px solid rgba(${d.c},0.1)` }}>
                  <div className="uppercase tracking-wider" style={{ fontSize: fs(8), color: `rgba(${d.c},0.5)` }}>{d.label}</div>
                  <div className="font-bold text-white" style={{ fontSize: fs(18) }}>
                    {d.pts}<span style={{ fontSize: fs(10), color: 'rgba(255,255,255,0.15)' }}>/{config.gamePointsTarget}</span>
                  </div>
                  <div style={{ fontSize: fs(8), color: `rgba(${d.c},0.35)` }}>{d.m}M · {d.t}T</div>
                </div>
              ) : (
                <div key={i} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ fontSize: fs(8), color: 'rgba(255,255,255,0.15)' }}>Trick</div>
                  <div className="font-bold text-white" style={{ fontSize: fs(18) }}>{round.trickNumber}</div>
                  <div className="w-full h-0.5 rounded-full overflow-hidden mt-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (round.trickNumber / totalTricks) * 100)}%`, background: 'linear-gradient(90deg, #d4a843, #b8892a)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Live Status ─── */}
      <div className="relative z-20 flex-shrink-0">
        <div className="flex items-center justify-between px-3" style={{
          paddingTop: isLandscape ? 3 : 6, paddingBottom: isLandscape ? 3 : 6,
          background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(212,168,67,0.04)',
        }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Hash style={{ width: fs(12), height: fs(12), color: 'rgba(212,168,67,0.3)' }} />
              <span className="font-bold text-white" style={{ fontSize: fs(10) }}>{round.trickNumber}/{totalTricks}</span>
            </div>
            <div className="w-px h-3" style={{ background: 'rgba(212,168,67,0.1)' }} />
            <div className="flex items-center gap-1">
              <Layers style={{ width: fs(12), height: fs(12), color: 'rgba(212,168,67,0.25)' }} />
              <span className="font-bold text-white" style={{ fontSize: fs(10) }}>{handCount}</span>
              <span style={{ fontSize: fs(9), color: 'rgba(255,255,255,0.15)' }}>left</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#6fa3d4' }} />
            <span className="font-bold" style={{ fontSize: fs(10), color: '#6fa3d4' }}>{round.teamMindis[0]}</span>
            <Target style={{ width: fs(12), height: fs(12), color: 'rgba(212,168,67,0.25)' }} />
            <span className="font-bold" style={{ fontSize: fs(10), color: '#d47070' }}>{round.teamMindis[1]}</span>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#d47070' }} />
          </div>

          <div className="flex items-center gap-1.5">
            {!trickPause ? (
              <>
                <div className={`w-1.5 h-1.5 rounded-full ${isMyTurn ? 'animate-pulse' : ''}`}
                  style={{ background: isMyTurn ? '#d4a843' : 'rgba(255,255,255,0.1)', boxShadow: isMyTurn ? '0 0 5px rgba(212,168,67,0.6)' : 'none' }} />
                <span style={{ fontSize: fs(10), color: isMyTurn ? '#d4a843' : 'rgba(255,255,255,0.2)' }}>
                  {isMyTurn ? 'Your turn' : `${AVATARS[round.currentTurnSeatIndex]}`}
                </span>
              </>
            ) : (
              <span className="font-medium animate-pulse text-gold" style={{ fontSize: fs(10) }}>Trick won!</span>
            )}
          </div>
        </div>
      </div>

      {/* AI Thinking */}
      {!isMyTurn && !trickPause && aiPlayers?.has(round.currentTurnSeatIndex) && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30">
          <div className="px-4 py-1.5 rounded-full flex items-center gap-2 animate-pulse"
            style={{ background: 'rgba(30,10,10,0.8)', border: '1px solid rgba(212,168,67,0.15)', backdropFilter: 'blur(8px)' }}>
            <span style={{ fontSize: fs(16) }}>{AVATARS[round.currentTurnSeatIndex]}</span>
            <span style={{ fontSize: fs(10), color: 'rgba(212,168,67,0.6)' }}>
              {gameState.players[round.currentTurnSeatIndex]?.name} thinking...
            </span>
          </div>
        </div>
      )}

      {/* ─── Middle: Trick Area + Mindi panels ─── */}
      <div className="relative z-10 flex-1 flex items-center justify-center min-h-0 px-2">

        {/* Mindi capture panels — left (Team A) / right (Team B) */}
        {([0, 1] as const).map(teamId => {
          const tc = TEAM_COL[teamId];
          const mindis = capturedMindis[teamId];
          const hasMindis = SUIT_ORDER.some(s => mindis[s] > 0);
          return (
            <div key={teamId} className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1"
              style={{ [teamId === 0 ? 'left' : 'right']: 4 }}>
              <div className="font-bold tracking-widest mb-0.5" style={{ fontSize: fs(8), color: tc.text }}>{tc.label}</div>
              {hasMindis ? SUIT_ORDER.map(suit => {
                const count = mindis[suit] || 0;
                if (!count) return null;
                return (
                  <div key={suit} className="flex items-center gap-0.5 rounded-lg px-1.5 py-0.5"
                    style={{ background: tc.bg, border: `1px solid ${tc.border}` }}>
                    <span style={{ color: suitCols[suit], fontSize: 13, lineHeight: 1 }}>{suitSymbols[suit]}</span>
                    {count > 1 && <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>×{count}</span>}
                  </div>
                );
              }) : (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.1)' }}>—</span>
                </div>
              )}
            </div>
          );
        })}

        {trickPause ? (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="px-5 py-2 rounded-xl flex items-center gap-2"
              style={{ background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.15)' }}>
              <Crown style={{ width: fs(16), height: fs(16), color: '#d4a843' }} />
              <span className="font-bold text-gold" style={{ fontSize: fs(14) }}>{trickPause.winnerName} wins!</span>
              {trickPause.mindisWon > 0 && (
                <span className="font-bold px-2 py-0.5 rounded-full text-gold" style={{ fontSize: fs(9), background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)' }}>
                  +{trickPause.mindisWon} Mindi
                </span>
              )}
            </div>
            <div className="flex items-end gap-3">
              {trickPause.cards.map((entry) => {
                const isW = entry.seatIndex === trickPause.winnerSeatIndex;
                const entryTeam = gameState.players[entry.seatIndex]?.teamId ?? 0;
                const tc = TEAM_COL[entryTeam];
                return (
                  <div key={`p-${entry.card.id}`} className="flex flex-col items-center gap-1.5">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ fontSize: fs(16), background: tc.bg, border: `1.5px solid ${tc.border}` }}>
                        {AVATARS[entry.seatIndex]}
                      </div>
                      <span className="font-bold" style={{ fontSize: fs(8), color: isW ? '#d4a843' : 'rgba(255,255,255,0.2)' }}>
                        {gameState.players[entry.seatIndex]?.name?.slice(0, 5)}
                      </span>
                    </div>
                    <div className={`transition-transform duration-300 ${isW ? 'scale-110' : ''}`}
                      style={{ filter: isW ? 'drop-shadow(0 0 10px rgba(212,168,67,0.4))' : undefined }}>
                      <Card card={entry.card} faceUp size={cardSz} />
                    </div>
                    {isW && <Crown style={{ width: fs(14), height: fs(14), color: '#d4a843' }} />}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <TrickArea
            currentTrick={round.currentTrick}
            playerCount={config.playerCount}
            currentTurnIndex={round.currentTurnSeatIndex}
            playerNames={gameState.players.map(p => p.name)}
            playerTeams={gameState.players.map(p => p.teamId)}
            size={tableSize}
          />
        )}
      </div>

      {/* ─── Bottom: Hand ─── */}
      <div className="relative z-20 flex-shrink-0 pb-3 pt-1">
        {isMyTurn && !aiPlayers?.has(myPlayerIndex) && (
          <div className="flex justify-center mb-2">
            <div className="px-5 py-1.5 rounded-full font-cinzel tracking-wider animate-bounce-subtle animate-border-glow-gold"
              style={{ fontSize: fs(12), background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.35)', color: '#d4a843', boxShadow: '0 0 12px rgba(212,168,67,0.12)' }}>
              YOUR TURN — Pick a card
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 mb-2 px-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,168,67,0.06)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ fontSize: fs(16), background: TEAM_COL[myPlayer.teamId].bg, border: `1.5px solid ${TEAM_COL[myPlayer.teamId].border}` }}>
              {AVATARS[myPlayerIndex]}
            </div>
            <span className="text-white" style={{ fontSize: fs(12) }}>{myPlayer.name}</span>
            <span style={{ color: 'rgba(212,168,67,0.15)' }}>·</span>
            <span style={{ fontSize: fs(10), color: myPlayer.teamId === 0 ? 'rgba(111,163,212,0.6)' : 'rgba(212,112,112,0.6)' }}>
              Team {myPlayer.teamId === 0 ? 'A' : 'B'}
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto scrollbar-hide px-2">
          <div className="mx-auto relative" style={{ width: totalHandWidth, height: handHeight }}>
            {sortedHand.map((card: CardType, index: number) => {
              const centerOffset = index - (handCount - 1) / 2;
              const rotation = handCount > 1 ? (centerOffset / ((handCount - 1) / 2)) * maxRot : 0;
              const yOffset = Math.abs(centerOffset) * (handCount > 6 ? 1.5 : 2.5);
              const isPlayable = playableIds.has(card.id);

              return (
                <div key={card.id} className="absolute bottom-2 transition-all duration-200"
                  style={{ left: index * overlap, zIndex: index, transform: `rotate(${rotation}deg) translateY(-${yOffset}px)`, transformOrigin: 'center' }}>
                  <Card
                    card={card}
                    faceUp
                    playable={isPlayable}
                    onClick={() => handleCardClick(card.id)}
                    size={cardSz}
                    glowColor={isPlayable ? 'rgba(212,168,67,0.2)' : undefined}
                    dealDelay={dealing ? index * 40 : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
