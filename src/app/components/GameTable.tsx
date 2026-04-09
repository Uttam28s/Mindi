import { useState, useEffect, useRef, useMemo } from 'react';
import { GameState, TrickEntry, Suit, Card as CardType } from '../types';
import { Card } from './Card';
import { TrickArea } from './TrickArea';
import { TableBackground3D } from './TableBackground3D';
import { Trophy, Target, Zap, ChevronUp, ChevronDown, Crown, Layers, Hash, Menu, X, Home, RotateCcw } from 'lucide-react';
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
  onExitGame?: () => void;
}

const suitSymbols: Record<string, string> = { hearts: '♥', diamonds: '♦', spades: '♠', clubs: '♣' };
const suitCols: Record<string, string>    = { hearts: '#e53e3e', diamonds: '#dd6b20', spades: '#a0aec0', clubs: '#a0aec0' };
const SUIT_ORDER = ['hearts', 'diamonds', 'spades', 'clubs'] as const;
const TEAM_COL = [
  { bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)',  text: '#6fa3d4', label: 'A' },
  { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', text: '#d47070', label: 'B' },
];

function getPlayableCardIds(hand: { id: string; suit: Suit }[], ledSuit: Suit | null): Set<string> {
  if (!ledSuit) return new Set(hand.map(c => c.id));
  const same = hand.filter(c => c.suit === ledSuit);
  return new Set((same.length > 0 ? same : hand).map(c => c.id));
}

export function GameTable({ gameState, myPlayerIndex, onCardClick, aiPlayers, trickPause, onExitGame }: GameTableProps) {
  const myPlayer = gameState.players[myPlayerIndex];
  const { round, config } = gameState;
  const isMyTurn = round.currentTurnSeatIndex === myPlayerIndex && !trickPause;

  const [scoreExpanded, setScoreExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dealing, setDealing] = useState(true);
  const prevTrickRef = useRef(round.trickNumber);
  const prevTurnRef  = useRef(round.currentTurnSeatIndex);

  const handCount = myPlayer.hand.length;

  // ── Font scale: 4p baseline ────────────────────────────────────────
  const uiScale = ({ 4: 1.0, 6: 0.88, 8: 0.78, 10: 0.70 } as Record<number, number>)[config.playerCount] ?? 1.0;
  const fs = (px: number): string => `${Math.round(px * uiScale)}px`;

  // ── Window / orientation tracking ─────────────────────────────────
  const [winSize, setWinSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const update = () => setWinSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', () => setTimeout(update, 100));
    return () => window.removeEventListener('resize', update);
  }, []);
  const isLandscape      = winSize.w > winSize.h;
  const isMobilePortrait = winSize.h > winSize.w && winSize.w < 900;

  // ── Card size ──────────────────────────────────────────────────────
  const cardSz: 'sm' | 'md' = isLandscape && winSize.h < 500 ? 'sm' : 'md';
  const cardH  = cardSz === 'sm' ? 90  : 118;
  const cardW  = cardSz === 'sm' ? 64  : 84;

  // ── Hand geometry ──────────────────────────────────────────────────
  // Extra horizontal padding to accommodate corner overshoot from rotation
  const handPadX  = 52;
  const maxW      = Math.min(winSize.w - 24, 760);
  const overlap   = handCount > 1 ? Math.max(24, Math.min(60, (maxW - cardW - handPadX * 2) / (handCount - 1))) : 0;
  const maxRot    = Math.min(handCount * 1.4, 20);

  // Extra bottom space: rotated bottom corner extends sin(maxRot) * cardW/2 below pivot
  const rotBottomOverflow = Math.ceil(Math.sin((maxRot * Math.PI) / 180) * (cardW / 2)) + 6;
  // Height must contain top of most-rotated card: cos(maxRot)*cardH + sin(maxRot)*cardW/2
  const rotTopReach = Math.ceil(Math.cos((maxRot * Math.PI) / 180) * cardH + Math.sin((maxRot * Math.PI) / 180) * (cardW / 2));
  const handHeight  = rotTopReach + rotBottomOverflow + 20; // comfortable buffer

  // Total container width including side padding for rotation overshoot
  const innerWidth  = handCount > 1 ? cardW + overlap * (handCount - 1) : cardW;
  const totalHandWidth = innerWidth + handPadX * 2;

  // ── Table size ─────────────────────────────────────────────────────
  const tableSize = useMemo(() => {
    const { w, h } = winSize;
    const land = w > h;
    const overhead = land ? 280 : 440;
    const maxTableW = land ? Math.min(w * 0.55, h - 30) : w - 16;
    const availH    = (h - overhead) * 0.95;
    return Math.floor(Math.min(maxTableW, availH, 560));
  }, [winSize]);

  const totalTricks = Math.floor((40 * config.deckCount) / config.playerCount);

  // ── Sounds ────────────────────────────────────────────────────────
  useEffect(() => { setDealing(true); const t = setTimeout(() => setDealing(false), 800); return () => clearTimeout(t); }, []);
  useEffect(() => { if (isMyTurn && !aiPlayers?.has(myPlayerIndex)) Sounds.yourTurn(); }, [isMyTurn, myPlayerIndex, aiPlayers]);
  useEffect(() => { if (trickPause) Sounds.trickWin(); }, [trickPause]);
  useEffect(() => {
    if (round.currentTurnSeatIndex !== prevTurnRef.current || round.trickNumber !== prevTrickRef.current) {
      if (!dealing) Sounds.cardPlay();
      prevTurnRef.current  = round.currentTurnSeatIndex;
      prevTrickRef.current = round.trickNumber;
    }
  }, [round.currentTurnSeatIndex, round.trickNumber, dealing]);

  // ── Playable cards ─────────────────────────────────────────────────
  const playableIds = isMyTurn && !aiPlayers?.has(myPlayerIndex)
    ? getPlayableCardIds(myPlayer.hand, round.currentTrick.ledSuit)
    : new Set<string>();

  // ── Hand sort: suits grouped, colors alternate ♥ ♠ ♦ ♣ ────────────
  const sortedHand = useMemo(() => {
    const rv = (r: string) => ({ '3':1,'2':2,'7':3,'8':4,'9':5,'10':6,'J':7,'Q':8,'K':9,'A':10 } as Record<string,number>)[r] ?? 0;
    const suitOrder: Record<string, number> = { hearts: 0, spades: 1, diamonds: 2, clubs: 3 };
    return [...myPlayer.hand].sort((a, b) =>
      suitOrder[a.suit] !== suitOrder[b.suit]
        ? suitOrder[a.suit] - suitOrder[b.suit]
        : rv(b.rank) - rv(a.rank)
    );
  }, [myPlayer.hand]);

  // ── Captured mindis ────────────────────────────────────────────────
  const capturedMindis = useMemo(() => {
    const r: [Record<string,number>, Record<string,number>] = [{}, {}];
    for (const trick of round.completedTricks) {
      if (!trick.mindisInTrick) continue;
      const team = gameState.players[trick.winnerSeatIndex]?.teamId ?? 0;
      for (const e of trick.cards)
        if (e.card.rank === '10') r[team][e.card.suit] = (r[team][e.card.suit] || 0) + 1;
    }
    return r;
  }, [round.completedTricks, gameState.players]);

  const handleCardClick = (cardId: string) => {
    if (playableIds.has(cardId)) onCardClick?.(cardId);
  };

  const barPy = isLandscape ? 6 : 11;

  return (
    <div className="h-screen w-screen relative flex flex-col"
      style={{ background: 'linear-gradient(180deg,#120404 0%,#1e0808 40%,#2a0f0f 100%)', overflow: 'hidden' }}>
      <TableBackground3D />

      {/* ── Portrait overlay ────────────────────────────────────────── */}
      {isMobilePortrait && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5"
          style={{ background: 'rgba(8,2,2,0.97)', backdropFilter: 'blur(12px)' }}>
          <div className="text-6xl animate-bounce-subtle">📱</div>
          <div className="text-5xl font-bold" style={{ color: '#d4a843', transform: 'rotate(90deg)', display: 'inline-block' }}>↻</div>
          <p className="font-cinzel text-xl tracking-widest text-center" style={{ color: '#d4a843' }}>ROTATE YOUR DEVICE</p>
          <p className="text-sm text-center px-10" style={{ color: 'rgba(255,255,255,0.35)' }}>Mindi is designed for landscape mode</p>
        </div>
      )}

      {/* ══ TOP BAR ═════════════════════════════════════════════════ */}
      <div className="relative z-20 flex-shrink-0"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(212,168,67,0.12)', padding: `${barPy}px 18px` }}>
        <div className="flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: fs(26), color: '#d4a843', lineHeight: 1 }}>♠</span>
            <span className="font-cinzel tracking-[0.2em]" style={{ fontSize: fs(14), color: 'rgba(212,168,67,0.65)' }}>MINDI</span>
          </div>

          {/* Trump indicator */}
          {round.trumpSuit ? (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
              style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)' }}>
              <Zap style={{ width: fs(15), height: fs(15), color: '#d4a843' }} />
              <span style={{ fontSize: fs(14), color: 'rgba(255,255,255,0.55)' }}>Trump</span>
              <span style={{ fontSize: fs(28), lineHeight: 1, color: suitCols[round.trumpSuit] }}>
                {suitSymbols[round.trumpSuit]}
              </span>
            </div>
          ) : config.trumpMethod === 'cut_hukum' ? (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full animate-pulse"
              style={{ background: 'rgba(212,168,67,0.04)', border: '1px dashed rgba(212,168,67,0.28)' }}>
              <Zap style={{ width: fs(15), height: fs(15), color: 'rgba(212,168,67,0.6)' }} />
              <span style={{ fontSize: fs(14), color: 'rgba(212,168,67,0.7)' }}>Cut Hukum</span>
              <span style={{ fontSize: fs(14), color: 'rgba(255,255,255,0.3)' }}>?</span>
            </div>
          ) : null}

          {/* Score */}
          <button onClick={() => setScoreExpanded((v: boolean) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-full transition-colors"
            style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.18)' }}>
            <Trophy style={{ width: fs(16), height: fs(16), color: '#d4a843' }} />
            <span className="font-bold tabular-nums" style={{ fontSize: fs(26), color: '#6fa3d4', lineHeight: 1 }}>{gameState.gamePoints[0]}</span>
            <span style={{ fontSize: fs(16), color: 'rgba(255,255,255,0.25)' }}>–</span>
            <span className="font-bold tabular-nums" style={{ fontSize: fs(26), color: '#d47070', lineHeight: 1 }}>{gameState.gamePoints[1]}</span>
            {scoreExpanded
              ? <ChevronUp  style={{ width: fs(16), height: fs(16), color: 'rgba(212,168,67,0.5)' }} />
              : <ChevronDown style={{ width: fs(16), height: fs(16), color: 'rgba(212,168,67,0.5)' }} />}
          </button>

          {/* Menu button */}
          <button onClick={() => { setMenuOpen(true); setScoreExpanded(false); }}
            className="flex items-center justify-center rounded-full transition-colors"
            style={{ width: 38, height: 38, background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.18)' }}>
            <Menu style={{ width: fs(18), height: fs(18), color: 'rgba(212,168,67,0.8)' }} />
          </button>
        </div>

        {/* Score expanded panel */}
        {scoreExpanded && (
          <div className="mt-2 pt-2 animate-fade-in" style={{ borderTop: '1px solid rgba(212,168,67,0.08)' }}>
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
              {[
                { label: 'Team A', pts: gameState.gamePoints[0], m: round.teamMindis[0], t: round.teamTricks[0], c: '96,165,250' },
                null,
                { label: 'Team B', pts: gameState.gamePoints[1], m: round.teamMindis[1], t: round.teamTricks[1], c: '248,113,113' },
              ].map((d, i) => d ? (
                <div key={i} className="rounded-xl p-3 text-center"
                  style={{ background: `rgba(${d.c},0.07)`, border: `1px solid rgba(${d.c},0.18)` }}>
                  <div className="uppercase tracking-widest mb-1" style={{ fontSize: fs(11), color: `rgba(${d.c},0.65)` }}>{d.label}</div>
                  <div className="font-bold text-white" style={{ fontSize: fs(28) }}>
                    {d.pts}<span style={{ fontSize: fs(13), color: 'rgba(255,255,255,0.25)' }}>/{config.gamePointsTarget}</span>
                  </div>
                  <div className="mt-1" style={{ fontSize: fs(12), color: `rgba(${d.c},0.5)` }}>{d.m} Mindis · {d.t} Tricks</div>
                </div>
              ) : (
                <div key={i} className="rounded-xl p-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: fs(11), color: 'rgba(255,255,255,0.25)' }}>Trick</div>
                  <div className="font-bold text-white" style={{ fontSize: fs(28) }}>{round.trickNumber}</div>
                  <div className="w-full h-1 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100,(round.trickNumber/totalTricks)*100)}%`, background: 'linear-gradient(90deg,#d4a843,#b8892a)', transition: 'width 0.4s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ STATUS BAR ══════════════════════════════════════════════ */}
      <div className="relative z-20 flex-shrink-0"
        style={{ background: 'rgba(0,0,0,0.35)', borderBottom: '1px solid rgba(212,168,67,0.06)', padding: `${isLandscape ? 5 : 8}px 18px` }}>
        <div className="flex items-center justify-between">

          {/* Left: trick counter + cards left */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <Hash style={{ width: fs(15), height: fs(15), color: 'rgba(212,168,67,0.45)' }} />
              <span className="font-bold text-white tabular-nums" style={{ fontSize: fs(16) }}>{round.trickNumber}</span>
              <span style={{ fontSize: fs(13), color: 'rgba(255,255,255,0.3)' }}>/ {totalTricks}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers style={{ width: fs(15), height: fs(15), color: 'rgba(212,168,67,0.35)' }} />
              <span className="font-bold text-white tabular-nums" style={{ fontSize: fs(16) }}>{handCount}</span>
              <span style={{ fontSize: fs(13), color: 'rgba(255,255,255,0.3)' }}>left</span>
            </div>
          </div>

          {/* Centre: mindi tally */}
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#6fa3d4' }} />
            <span className="font-bold tabular-nums" style={{ fontSize: fs(19), color: '#6fa3d4' }}>{round.teamMindis[0]}</span>
            <Target style={{ width: fs(16), height: fs(16), color: 'rgba(212,168,67,0.4)' }} />
            <span className="font-bold tabular-nums" style={{ fontSize: fs(19), color: '#d47070' }}>{round.teamMindis[1]}</span>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#d47070' }} />
          </div>

          {/* Right: turn indicator */}
          <div className="flex items-center gap-2">
            {!trickPause ? (
              <>
                <div className={`w-2.5 h-2.5 rounded-full ${isMyTurn ? 'animate-pulse' : ''}`}
                  style={{ background: isMyTurn ? '#d4a843' : 'rgba(255,255,255,0.18)', boxShadow: isMyTurn ? '0 0 8px rgba(212,168,67,0.75)' : 'none' }} />
                <span style={{ fontSize: fs(15), color: isMyTurn ? '#d4a843' : 'rgba(255,255,255,0.4)', fontWeight: isMyTurn ? 700 : 400 }}>
                  {isMyTurn ? 'Your turn' : `${AVATARS[round.currentTurnSeatIndex]} ${gameState.players[round.currentTurnSeatIndex]?.name?.slice(0,10) ?? ''}`}
                </span>
              </>
            ) : (
              <span className="font-semibold animate-pulse text-gold" style={{ fontSize: fs(15) }}>Trick won!</span>
            )}
          </div>
        </div>
      </div>

      {/* ── AI thinking ─────────────────────────────────────────────── */}
      {!isMyTurn && !trickPause && aiPlayers?.has(round.currentTurnSeatIndex) && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30">
          <div className="px-5 py-2 rounded-full flex items-center gap-2.5 animate-pulse"
            style={{ background: 'rgba(20,6,6,0.88)', border: '1px solid rgba(212,168,67,0.2)', backdropFilter: 'blur(8px)' }}>
            <span style={{ fontSize: 22 }}>{AVATARS[round.currentTurnSeatIndex]}</span>
            <span style={{ fontSize: fs(14), color: 'rgba(212,168,67,0.75)' }}>
              {gameState.players[round.currentTurnSeatIndex]?.name} thinking…
            </span>
          </div>
        </div>
      )}

      {/* ══ MIDDLE — trick table ════════════════════════════════════ */}
      <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-2">

        {/* Mindi capture panels */}
        {([0, 1] as const).map(teamId => {
          const tc     = TEAM_COL[teamId];
          const mindis = capturedMindis[teamId];
          const has    = SUIT_ORDER.some(s => mindis[s] > 0);
          return (
            <div key={teamId} className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5"
              style={{ [teamId === 0 ? 'left' : 'right']: 8 }}>
              <div className="font-bold tracking-widest mb-0.5" style={{ fontSize: fs(13), color: tc.text }}>{tc.label}</div>
              {has ? SUIT_ORDER.map(suit => {
                const count = mindis[suit] || 0;
                if (!count) return null;
                return (
                  <div key={suit} className="flex items-center gap-1 rounded-lg px-2.5 py-1"
                    style={{ background: tc.bg, border: `1px solid ${tc.border}` }}>
                    <span style={{ color: suitCols[suit], fontSize: 17, lineHeight: 1 }}>{suitSymbols[suit]}</span>
                    {count > 1 && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>×{count}</span>}
                  </div>
                );
              }) : (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.12)' }}>—</span>
                </div>
              )}
            </div>
          );
        })}

        {trickPause ? (
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="px-6 py-2.5 rounded-xl flex items-center gap-3"
              style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.22)' }}>
              <Crown style={{ width: fs(20), height: fs(20), color: '#d4a843' }} />
              <span className="font-bold text-gold" style={{ fontSize: fs(18) }}>{trickPause.winnerName} wins!</span>
              {trickPause.mindisWon > 0 && (
                <span className="font-bold px-2.5 py-1 rounded-full text-gold"
                  style={{ fontSize: fs(13), background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.28)' }}>
                  +{trickPause.mindisWon} Mindi
                </span>
              )}
            </div>
            <div className="flex items-end gap-4 flex-wrap justify-center">
              {trickPause.cards.map(entry => {
                const isW   = entry.seatIndex === trickPause.winnerSeatIndex;
                const tc    = TEAM_COL[gameState.players[entry.seatIndex]?.teamId ?? 0];
                return (
                  <div key={`p-${entry.card.id}`} className="flex flex-col items-center gap-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl"
                        style={{ background: tc.bg, border: `2px solid ${tc.border}` }}>
                        {AVATARS[entry.seatIndex]}
                      </div>
                      <span className="font-semibold" style={{ fontSize: fs(12), color: isW ? '#d4a843' : 'rgba(255,255,255,0.35)' }}>
                        {gameState.players[entry.seatIndex]?.name?.slice(0, 8)}
                      </span>
                    </div>
                    <div className={`transition-transform duration-300 ${isW ? 'scale-110' : ''}`}
                      style={{ filter: isW ? 'drop-shadow(0 0 12px rgba(212,168,67,0.5))' : undefined }}>
                      <Card card={entry.card} faceUp size={cardSz} />
                    </div>
                    {isW && <Crown style={{ width: fs(18), height: fs(18), color: '#d4a843' }} />}
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
            localSeatIndex={myPlayerIndex}
          />
        )}
      </div>

      {/* ══ BOTTOM — hand ═══════════════════════════════════════════ */}
      {/*
        IMPORTANT: overflow must be visible here so rotated card corners
        (which extend past the calculated container bounds) are not clipped.
        Horizontal overflow is handled by centering + generous handPadX.
      */}
      <div className="relative z-20 flex-shrink-0"
        style={{ paddingBottom: isLandscape ? 12 : 20, paddingTop: 4, overflow: 'visible' }}>
          <div className='flex justify-center flex-row-reverse'>
        {/* YOUR TURN banner */}
        {isMyTurn && !aiPlayers?.has(myPlayerIndex) && (
          <div className="flex justify-center mb-2.5">
            <div className="px-7 py-2 rounded-full font-cinzel tracking-wider animate-bounce-subtle animate-border-glow-gold align-content-center"
              style={{ fontSize: "12px", alignSelf: 'anchor-center' , background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.45)', color: '#d4a843', boxShadow: '0 0 20px rgba(212,168,67,0.12)' }}>
              YOUR TURN — Pick a card
            </div>
          </div>
        )}

        {/* Player identity row */}
        <div className="flex items-center justify-center mb-2.5 px-4">
          <div className="flex items-center gap-3 px-5 py-2 rounded-full"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(212,168,67,0.1)' }}>
            <div className="rounded-full flex items-center justify-center flex-shrink-0 text-xl"
              style={{ width: 36, height: 36, background: TEAM_COL[myPlayer.teamId].bg, border: `1.5px solid ${TEAM_COL[myPlayer.teamId].border}` }}>
              {AVATARS[myPlayerIndex]}
            </div>
            <span className="text-white font-semibold" style={{ fontSize: fs(16) }}>{myPlayer.name}</span>
            <span style={{ color: 'rgba(212,168,67,0.25)' }}>·</span>
            <span style={{ fontSize: fs(14), color: myPlayer.teamId === 0 ? 'rgba(111,163,212,0.8)' : 'rgba(212,112,112,0.8)' }}>
              Team {myPlayer.teamId === 0 ? 'A' : 'B'}
            </span>
          </div>
        </div>
        </div>

        {/*
          Card fan — NO overflow clipping here.
          totalHandWidth includes handPadX on each side so rotation corners
          don't escape the container. The container itself uses overflow:visible
          (inherited from parent) so nothing gets cut.
        */}
        <div className="w-full flex justify-center" style={{ overflow: 'visible' }}>
          <div className="relative" style={{ width: totalHandWidth, height: handHeight, overflow: 'visible' }}>
            {sortedHand.map((card: CardType, index: number) => {
              const centre   = index - (handCount - 1) / 2;
              const rotation = handCount > 1 ? (centre / ((handCount - 1) / 2)) * maxRot : 0;
              const yOffset  = Math.abs(centre) * (handCount > 6 ? 1.2 : 2);
              const isPlayable = playableIds.has(card.id);
              return (
                <div key={card.id} className="absolute transition-all duration-200"
                  style={{
                    // Offset by handPadX so left rotation corner stays within container
                    left: handPadX + index * overlap,
                    // Sit cards above bottom overflow zone
                    bottom: rotBottomOverflow + 2,
                    zIndex: index,
                    transform: `rotate(${rotation}deg) translateY(-${yOffset}px)`,
                    transformOrigin: 'bottom center',
                  }}>
                  <Card
                    card={card}
                    faceUp
                    playable={isPlayable}
                    onClick={() => handleCardClick(card.id)}
                    size={cardSz}
                    glowColor={isPlayable ? 'rgba(212,168,67,0.25)' : undefined}
                    dealDelay={dealing ? index * 40 : undefined}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* ══ PAUSE MENU OVERLAY ══════════════════════════════════ */}
      {menuOpen && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center"
          style={{ background: 'rgba(8,2,2,0.88)', backdropFilter: 'blur(16px)' }}
          onClick={() => setMenuOpen(false)}>
          <div className="flex flex-col items-center gap-4 w-72 animate-fade-in"
            onClick={e => e.stopPropagation()}
            style={{ background: 'rgba(20,6,6,0.95)', border: '1px solid rgba(212,168,67,0.2)', borderRadius: 20, padding: '32px 24px' }}>

            {/* Header */}
            <div className="flex items-center justify-between w-full mb-2">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 22, color: '#d4a843' }}>♠</span>
                <span className="font-cinzel tracking-widest" style={{ fontSize: 16, color: '#d4a843' }}>MENU</span>
              </div>
              <button onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center rounded-full transition-colors"
                style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <X style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.5)' }} />
              </button>
            </div>

            {/* Score summary */}
            <div className="w-full rounded-xl px-4 py-3 flex items-center justify-center gap-4"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,168,67,0.1)' }}>
              <div className="text-center">
                <div style={{ fontSize: 11, color: 'rgba(111,163,212,0.65)', letterSpacing: '0.1em' }}>TEAM A</div>
                <div className="font-bold" style={{ fontSize: 28, color: '#6fa3d4', lineHeight: 1.1 }}>{gameState.gamePoints[0]}</div>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>vs</div>
              <div className="text-center">
                <div style={{ fontSize: 11, color: 'rgba(212,112,112,0.65)', letterSpacing: '0.1em' }}>TEAM B</div>
                <div className="font-bold" style={{ fontSize: 28, color: '#d47070', lineHeight: 1.1 }}>{gameState.gamePoints[1]}</div>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', marginLeft: 8 }}>
                / {gameState.config.gamePointsTarget}
              </div>
            </div>

            {/* Resume */}
            <button onClick={() => setMenuOpen(false)}
              className="w-full flex items-center justify-center gap-3 rounded-xl font-cinzel tracking-wider transition-all"
              style={{ padding: '14px 0', background: 'rgba(212,168,67,0.12)', border: '1px solid rgba(212,168,67,0.35)', color: '#d4a843', fontSize: 14 }}>
              <RotateCcw style={{ width: 18, height: 18 }} />
              Resume Game
            </button>

            {/* Divider */}
            <div className="w-full" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

            {/* Exit to Home */}
            <button onClick={() => { setMenuOpen(false); onExitGame?.(); }}
              className="w-full flex items-center justify-center gap-3 rounded-xl font-cinzel tracking-wider transition-all"
              style={{ padding: '14px 0', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: 'rgba(248,113,113,0.8)', fontSize: 14 }}>
              <Home style={{ width: 18, height: 18 }} />
              Exit to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
