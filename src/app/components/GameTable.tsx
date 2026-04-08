import { useState, useEffect, useRef, useMemo } from 'react';
import { GameState, TrickEntry, Suit } from '../types';
import { Card } from './Card';
import { TrickArea } from './TrickArea';
import { TableBackground3D } from './TableBackground3D';
import { Bot, Trophy, Target, Zap, ChevronUp, ChevronDown, Crown, Layers, Hash } from 'lucide-react';
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
  if (!ledSuit) return new Set(hand.map(c => c.id)); // leading: play anything
  const samesuit = hand.filter(c => c.suit === ledSuit);
  if (samesuit.length > 0) return new Set(samesuit.map(c => c.id)); // must follow
  return new Set(hand.map(c => c.id)); // void: play anything
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

  // Deal animation on mount
  useEffect(() => {
    setDealing(true);
    const t = setTimeout(() => setDealing(false), 800);
    return () => clearTimeout(t);
  }, []); // only on first mount

  // Sound: your turn
  useEffect(() => {
    if (isMyTurn && !aiPlayers?.has(myPlayerIndex)) {
      Sounds.yourTurn();
    }
  }, [isMyTurn, myPlayerIndex, aiPlayers]);

  // Sound: trick won
  useEffect(() => {
    if (trickPause) {
      Sounds.trickWin();
    }
  }, [trickPause]);

  // Sound: card played (detect trick number / turn change)
  useEffect(() => {
    if (round.currentTurnSeatIndex !== prevTurnRef.current || round.trickNumber !== prevTrickRef.current) {
      if (!dealing) Sounds.cardPlay();
      prevTurnRef.current = round.currentTurnSeatIndex;
      prevTrickRef.current = round.trickNumber;
    }
  }, [round.currentTurnSeatIndex, round.trickNumber, dealing]);

  // Playable card IDs (suit following)
  const playableIds = isMyTurn && !aiPlayers?.has(myPlayerIndex)
    ? getPlayableCardIds(myPlayer.hand, round.currentTrick.ledSuit)
    : new Set<string>();

  const sortedHand = [...myPlayer.hand].sort((a, b) => {
    const so: Record<string, number> = { hearts: 0, diamonds: 1, clubs: 2, spades: 3 };
    if (so[a.suit] !== so[b.suit]) return so[a.suit] - so[b.suit];
    const rv = (r: string) => ({ '3': 1, '2': 2, '7': 3, '8': 4, '9': 5, '10': 6, 'J': 7, 'Q': 8, 'K': 9, 'A': 10 }[r] || 0);
    return rv(b.rank) - rv(a.rank);
  });

  // Responsive table size: fill available screen space while staying within bounds
  const tableSize = useMemo(() => {
    if (typeof window === 'undefined') return 400;
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Middle section ≈ screen height minus top bars (~80px) and bottom hand area (~230px)
    const availH = (h - 310) * 0.95;
    return Math.floor(Math.min(w - 8, availH, 540));
  }, []);

  // Compute captured mindis by suit per team from completed tricks
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

  const cardW = 84;
  const maxW = typeof window !== 'undefined' ? Math.min(window.innerWidth - 24, 700) : 500;
  const overlap = handCount > 1 ? Math.max(24, Math.min(60, (maxW - cardW) / (handCount - 1))) : 0;
  const totalHandWidth = handCount > 1 ? cardW + overlap * (handCount - 1) : cardW;
  const maxRot = Math.min(handCount * 1.5, 22);
  const totalTricks = Math.floor((40 * config.deckCount) / config.playerCount);

  const handleCardClick = (cardId: string) => {
    if (!playableIds.has(cardId)) return;
    onCardClick?.(cardId);
  };

  return (
    <div className="h-screen w-screen relative overflow-hidden flex flex-col" style={{ background: 'linear-gradient(180deg, #120404 0%, #1e0808 40%, #2a0f0f 100%)' }}>
      <TableBackground3D />

      {/* ─── Top Bar ─── */}
      <div className="relative z-20 flex-shrink-0">
        <div className="flex items-center justify-between px-3 py-2" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(212,168,67,0.08)' }}>
          <div className="flex items-center gap-2">
            <span className="text-lg" style={{ color: '#d4a843' }}>♠</span>
            <span className="font-cinzel text-[10px] tracking-[0.15em]" style={{ color: 'rgba(212,168,67,0.5)' }}>MINDI</span>
          </div>

          {round.trumpSuit ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.12)' }}>
              <Zap className="w-3 h-3" style={{ color: '#d4a843' }} />
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Trump</span>
              <span className="text-lg leading-none" style={{ color: suitCols[round.trumpSuit] }}>
                {suitSymbols[round.trumpSuit]}
              </span>
            </div>
          ) : config.trumpMethod === 'cut_hukum' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full animate-pulse" style={{ background: 'rgba(212,168,67,0.04)', border: '1px dashed rgba(212,168,67,0.2)' }}>
              <Zap className="w-3 h-3" style={{ color: 'rgba(212,168,67,0.4)' }} />
              <span className="text-[9px]" style={{ color: 'rgba(212,168,67,0.5)' }}>Cut Hukum</span>
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>?</span>
            </div>
          ) : null}

          <button onClick={() => setScoreExpanded(!scoreExpanded)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors"
            style={{ background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.1)' }}>
            <Trophy className="w-3 h-3" style={{ color: '#d4a843' }} />
            <span className="text-sm font-bold" style={{ color: '#6fa3d4' }}>{gameState.gamePoints[0]}</span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.15)' }}>–</span>
            <span className="text-sm font-bold" style={{ color: '#d47070' }}>{gameState.gamePoints[1]}</span>
            {scoreExpanded ? <ChevronUp className="w-3 h-3" style={{ color: 'rgba(212,168,67,0.3)' }} /> : <ChevronDown className="w-3 h-3" style={{ color: 'rgba(212,168,67,0.3)' }} />}
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
                  <div className="text-[8px] uppercase tracking-wider" style={{ color: `rgba(${d.c},0.5)` }}>{d.label}</div>
                  <div className="text-lg font-bold text-white">{d.pts}<span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.15)' }}>/{config.gamePointsTarget}</span></div>
                  <div className="text-[8px]" style={{ color: `rgba(${d.c},0.35)` }}>{d.m}M · {d.t}T</div>
                </div>
              ) : (
                <div key={i} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.01)' }}>
                  <div className="text-[8px]" style={{ color: 'rgba(255,255,255,0.15)' }}>Trick</div>
                  <div className="text-lg font-bold text-white">{round.trickNumber}</div>
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
        <div className="flex items-center justify-between px-3 py-1.5" style={{ background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(212,168,67,0.04)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3" style={{ color: 'rgba(212,168,67,0.3)' }} />
              <span className="text-[10px] font-bold text-white">{round.trickNumber}/{totalTricks}</span>
            </div>
            <div className="w-px h-3" style={{ background: 'rgba(212,168,67,0.1)' }} />
            <div className="flex items-center gap-1">
              <Layers className="w-3 h-3" style={{ color: 'rgba(212,168,67,0.25)' }} />
              <span className="text-[10px] font-bold text-white">{handCount}</span>
              <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.15)' }}>left</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#6fa3d4' }} />
            <span className="text-[10px] font-bold" style={{ color: '#6fa3d4' }}>{round.teamMindis[0]}</span>
            <Target className="w-3 h-3" style={{ color: 'rgba(212,168,67,0.25)' }} />
            <span className="text-[10px] font-bold" style={{ color: '#d47070' }}>{round.teamMindis[1]}</span>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#d47070' }} />
          </div>

          <div className="flex items-center gap-1.5">
            {!trickPause ? (
              <>
                <div className={`w-1.5 h-1.5 rounded-full ${isMyTurn ? 'animate-pulse' : ''}`}
                  style={{ background: isMyTurn ? '#d4a843' : 'rgba(255,255,255,0.1)', boxShadow: isMyTurn ? '0 0 5px rgba(212,168,67,0.4)' : 'none' }} />
                <span className="text-[10px]" style={{ color: isMyTurn ? '#d4a843' : 'rgba(255,255,255,0.2)' }}>
                  {isMyTurn ? 'Your turn' : `${AVATARS[round.currentTurnSeatIndex]}`}
                </span>
              </>
            ) : (
              <span className="text-[10px] font-medium animate-pulse text-gold">Trick won!</span>
            )}
          </div>
        </div>
      </div>

      {/* AI Thinking */}
      {!isMyTurn && !trickPause && aiPlayers?.has(round.currentTurnSeatIndex) && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30">
          <div className="px-4 py-1.5 rounded-full flex items-center gap-2 animate-pulse"
            style={{ background: 'rgba(30,10,10,0.8)', border: '1px solid rgba(212,168,67,0.15)', backdropFilter: 'blur(8px)' }}>
            <span className="text-base">{AVATARS[round.currentTurnSeatIndex]}</span>
            <span className="text-[10px]" style={{ color: 'rgba(212,168,67,0.6)' }}>
              {gameState.players[round.currentTurnSeatIndex]?.name} thinking...
            </span>
          </div>
        </div>
      )}

      {/* ─── Middle: Trick Area ─── */}
      <div className="relative z-10 flex-1 flex items-center justify-center min-h-0 px-2">

        {/* Mindi capture panels — left (Team A) / right (Team B) */}
        {([0, 1] as const).map(teamId => {
          const tc = TEAM_COL[teamId];
          const mindis = capturedMindis[teamId];
          const hasMindis = SUIT_ORDER.some(s => mindis[s] > 0);
          return (
            <div key={teamId} className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1"
              style={{ [teamId === 0 ? 'left' : 'right']: 4 }}>
              <div className="text-[8px] font-bold tracking-widest mb-0.5" style={{ color: tc.text }}>{tc.label}</div>
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
              <Crown className="w-4 h-4" style={{ color: '#d4a843' }} />
              <span className="text-sm font-bold text-gold">{trickPause.winnerName} wins!</span>
              {trickPause.mindisWon > 0 && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-gold" style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)' }}>
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
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-base"
                        style={{ background: tc.bg, border: `1.5px solid ${tc.border}` }}>
                        {AVATARS[entry.seatIndex]}
                      </div>
                      <span className="text-[8px] font-bold" style={{ color: isW ? '#d4a843' : 'rgba(255,255,255,0.2)' }}>
                        {gameState.players[entry.seatIndex]?.name?.slice(0, 5)}
                      </span>
                    </div>
                    <div className={`transition-transform duration-300 ${isW ? 'scale-110' : ''}`}
                      style={{ filter: isW ? 'drop-shadow(0 0 10px rgba(212,168,67,0.4))' : undefined }}>
                      <Card card={entry.card} faceUp size="md" />
                    </div>
                    {isW && <Crown className="w-3.5 h-3.5" style={{ color: '#d4a843' }} />}
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
            <div className="px-5 py-1.5 rounded-full font-cinzel text-xs tracking-wider animate-bounce-subtle"
              style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.25)', color: '#d4a843' }}>
              YOUR TURN — Pick a card
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 mb-2 px-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(212,168,67,0.06)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-base flex-shrink-0"
              style={{ background: TEAM_COL[myPlayer.teamId].bg, border: `1.5px solid ${TEAM_COL[myPlayer.teamId].border}` }}>
              {AVATARS[myPlayerIndex]}
            </div>
            <span className="text-white text-xs">{myPlayer.name}</span>
            <span style={{ color: 'rgba(212,168,67,0.15)' }}>·</span>
            <span className="text-[10px]" style={{ color: myPlayer.teamId === 0 ? 'rgba(111,163,212,0.6)' : 'rgba(212,112,112,0.6)' }}>
              Team {myPlayer.teamId === 0 ? 'A' : 'B'}
            </span>
          </div>
        </div>

        {/* height: 165 gives rotated card corners enough room to not clip (md card = 118px + rotation buffer) */}
        <div className="w-full overflow-x-auto scrollbar-hide px-2">
          <div className="mx-auto relative" style={{ width: totalHandWidth, height: 165 }}>
            {sortedHand.map((card, index) => {
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
                    size="md"
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