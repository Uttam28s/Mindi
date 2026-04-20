import { useState, useEffect, useRef, useMemo } from 'react';
import { GameState, TrickEntry, Suit, Card as CardType } from '../types';
import { Card } from './Card';
import { TrickArea } from './TrickArea';
import { GameTour } from './GameTour';
import { TourStep, TourHighlight, TourSeatHL, TourAreaHL } from '../utils/tourScript';
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
  tourStep?: TourStep;
  tourStepIndex?: number;
  tourTotalSteps?: number;
  onTourNext?: () => void;
  onTourSkip?: () => void;
}

const suitSymbols: Record<string, string> = { hearts: '♥', diamonds: '♦', spades: '♠', clubs: '♣' };
const suitCols: Record<string, string> = { hearts: '#e53e3e', diamonds: '#dd6b20', spades: '#a0aec0', clubs: '#a0aec0' };
const SUIT_ORDER = ['hearts', 'diamonds', 'spades', 'clubs'] as const;
const TEAM_COL = [
  { bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)', text: '#6fa3d4', label: 'A' },
  { bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', text: '#d47070', label: 'B' },
];

function getPlayableCardIds(hand: { id: string; suit: Suit }[], ledSuit: Suit | null): Set<string> {
  if (!ledSuit) return new Set(hand.map(c => c.id));
  const same = hand.filter(c => c.suit === ledSuit);
  return new Set((same.length > 0 ? same : hand).map(c => c.id));
}

export function GameTable({
  gameState, myPlayerIndex, onCardClick, aiPlayers, trickPause, onExitGame,
  tourStep, tourStepIndex, tourTotalSteps, onTourNext, onTourSkip,
}: GameTableProps) {
  const myPlayer = gameState.players[myPlayerIndex];

  const isTourMode = !!tourStep;

  const tourHighlightedCardIds = useMemo<Set<string>>(() => {
    if (!tourStep) return new Set();
    return new Set(
      tourStep.highlights
        .filter((h): h is TourHighlight => h.type === 'card')
        .map(h => h.cardId)
    );
  }, [tourStep]);

  const tourHighlightedAreaId = useMemo<string | null>(() => {
    if (!tourStep) return null;
    const a = tourStep.highlights.find(h => h.type === 'area') as TourAreaHL | undefined;
    return a?.areaId ?? null;
  }, [tourStep]);

  const tourHighlightedSeatIndex = useMemo<number | null>(() => {
    if (!tourStep) return null;
    const s = tourStep.highlights.find(h => h.type === 'seat') as TourSeatHL | undefined;
    return s?.seatIndex ?? null;
  }, [tourStep]);
  const { round, config } = gameState;
  const isMyTurn = round.currentTurnSeatIndex === myPlayerIndex && !trickPause;

  const [scoreExpanded, setScoreExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dealing, setDealing] = useState(true);
  const prevTrickRef = useRef(round.trickNumber);
  const prevTurnRef = useRef(round.currentTurnSeatIndex);

  const handCount = myPlayer.hand.length;

  // ── Font scale: 4p baseline ────────────────────────────────────────
  const uiScale = ({ 4: 1.0, 6: 0.88, 8: 0.78, 10: 0.70 } as Record<number, number>)[config.playerCount] ?? 1.0;

  // ── Window / orientation tracking ─────────────────────────────────
  const [winSize, setWinSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const update = () => setWinSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', () => setTimeout(update, 100));
    return () => window.removeEventListener('resize', update);
  }, []);
  const isLandscape = winSize.w > winSize.h;
  const isMobilePortrait = winSize.h > winSize.w && winSize.w < 900;

  // Portrait-aware font scale (0.82× in portrait to reduce header clutter)
  const pScale = isMobilePortrait ? 0.82 : 1.0;
  const fs = (px: number): string => `${Math.round(px * uiScale * pScale)}px`;

  // ── Card size ──────────────────────────────────────────────────────
  const cardSz: 'sm' | 'md' = (isLandscape && winSize.h < 500) || isMobilePortrait ? 'sm' : 'md';
  const cardH = cardSz === 'sm' ? 90 : 118;
  const cardW = cardSz === 'sm' ? 64 : 84;

  // ── Hand geometry ──────────────────────────────────────────────────
  const handPadX = isMobilePortrait ? 6 : 12;
  const maxW = Math.min(winSize.w - (isMobilePortrait ? 8 : 24), 760);
  const overlap = handCount > 1
    ? Math.max(isMobilePortrait ? 18 : 28, Math.min(isMobilePortrait ? 32 : 40, (maxW - cardW - handPadX * 2) / (handCount - 1)))
    : 0;

  const handHeight = cardH + 28; // flat layout — no rotation overshoot needed

  // Total container width
  const innerWidth = handCount > 1 ? cardW + overlap * (handCount - 1) : cardW;
  const totalHandWidth = innerWidth + handPadX * 2;

  // ── Table size ─────────────────────────────────────────────────────
  const tableSize = useMemo(() => {
    const { w, h } = winSize;
    const land = w > h;
    const overhead = land ? 280 : 440;
    const maxTableW = land ? Math.min(w * 0.55, h - 30) : w - 16;
    const availH = (h - overhead) * 0.95;
    return Math.floor(Math.min(maxTableW, availH, 560));
  }, [winSize]);

  const totalTricks = 15;

  // ── Portrait table dimensions ──────────────────────────────────────
  const pBS = 46;                               // badge space — fits vertical pill (~36px) + 10px margin
  const pTW = winSize.w - pBS * 2 - 8;          // container = W-8, always within screen
  const pTH = Math.round(pTW * 0.58);           // table height
  // Card offset from table center for each relative seat index
  const pCardPos = (relIdx: number): { x: number; y: number } => {
    const count = config.playerCount;
    if (count === 4) {
      const p: Record<number, { x: number; y: number }> = {
        0: { x: 0, y: pTH * 0.22 },   // bottom (local)
        1: { x: pTW * 0.26, y: 0 },   // right
        2: { x: 0, y: -pTH * 0.22 },   // top
        3: { x: -pTW * 0.26, y: 0 },   // left
      };
      return p[relIdx] ?? { x: 0, y: 0 };
    }
    const angle = -(360 / count) * relIdx + 90;
    const rad = angle * Math.PI / 180;
    const r = Math.min(pTW, pTH) * 0.25;
    return { x: Math.cos(rad) * r, y: -Math.sin(rad) * r };
  };

  // ── Sounds ────────────────────────────────────────────────────────
  useEffect(() => { setDealing(true); const t = setTimeout(() => setDealing(false), 800); return () => clearTimeout(t); }, []);
  useEffect(() => { if (isMyTurn && !aiPlayers?.has(myPlayerIndex)) Sounds.yourTurn(); }, [isMyTurn, myPlayerIndex, aiPlayers]);
  useEffect(() => { if (trickPause) Sounds.trickWin(); }, [trickPause]);
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

  // ── Hand sort: suits grouped, colors alternate ♥ ♠ ♦ ♣ ────────────
  const sortedHand = useMemo(() => {
    const rv = (r: string) => ({ '3': 1, '2': 2, '7': 3, '8': 4, '9': 5, '10': 6, 'J': 7, 'Q': 8, 'K': 9, 'A': 10 } as Record<string, number>)[r] ?? 0;
    const suitOrder: Record<string, number> = { hearts: 0, spades: 1, diamonds: 2, clubs: 3 };
    return [...myPlayer.hand].sort((a, b) =>
      suitOrder[a.suit] !== suitOrder[b.suit]
        ? suitOrder[a.suit] - suitOrder[b.suit]
        : rv(b.rank) - rv(a.rank)
    );
  }, [myPlayer.hand]);

  // ── Captured mindis ────────────────────────────────────────────────
  const capturedMindis = useMemo(() => {
    const r: [Record<string, number>, Record<string, number>] = [{}, {}];
    for (const trick of round.completedTricks) {
      if (!trick.mindisInTrick) continue;
      const team = gameState.players[trick.winnerSeatIndex]?.teamId ?? 0;
      for (const e of trick.cards)
        if (e.card.rank === '10') r[team][e.card.suit] = (r[team][e.card.suit] || 0) + 1;
    }
    return r;
  }, [round.completedTricks, gameState.players]);

  const handleCardClick = (cardId: string) => {
    if (isTourMode) {
      if (tourHighlightedCardIds.has(cardId)) onCardClick?.(cardId);
    } else if (playableIds.has(cardId)) onCardClick?.(cardId);
  };

  const barPy = isLandscape ? 6 : isMobilePortrait ? 6 : 11;

  return (
    <div className="h-screen w-screen relative flex flex-col"
      style={{ background: 'linear-gradient(180deg,#120404 0%,#1e0808 40%,#2a0f0f 100%)', overflow: 'hidden' }}>
      <TableBackground3D />


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
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full relative"
              style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)' }}>
              <Zap style={{ width: fs(14), height: fs(14), color: '#d4a843' }} />
              {!isMobilePortrait && <span style={{ fontSize: fs(13), color: 'rgba(255,255,255,0.55)' }}>Trump</span>}
              <span style={{ fontSize: fs(24), lineHeight: 1, color: suitCols[round.trumpSuit] }}>
                {suitSymbols[round.trumpSuit]}
              </span>
              {tourHighlightedAreaId === 'trump_indicator' && (
                <div className="absolute inset-[-3px] rounded-full pointer-events-none"
                  style={{ border: '2px solid #d4a843', animation: 'goldPulse 1.2s ease-in-out infinite', zIndex: 400 }} />
              )}
            </div>
          ) : config.trumpMethod === 'cut_hukum' ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full animate-pulse"
              style={{ background: 'rgba(212,168,67,0.04)', border: '1px dashed rgba(212,168,67,0.28)' }}>
              <Zap style={{ width: fs(14), height: fs(14), color: 'rgba(212,168,67,0.6)' }} />
              {!isMobilePortrait && <span style={{ fontSize: fs(13), color: 'rgba(212,168,67,0.7)' }}>Cut Hukum</span>}
              <span style={{ fontSize: fs(13), color: 'rgba(255,255,255,0.3)' }}>?</span>
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
              ? <ChevronUp style={{ width: fs(16), height: fs(16), color: 'rgba(212,168,67,0.5)' }} />
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
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (round.trickNumber / totalTricks) * 100)}%`, background: 'linear-gradient(90deg,#d4a843,#b8892a)', transition: 'width 0.4s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══ STATUS BAR (landscape only) ════════════════════════════ */}
      {!isMobilePortrait && <div className="relative z-20 flex-shrink-0"
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
                  {isMyTurn ? 'Your turn' : `${AVATARS[round.currentTurnSeatIndex]} ${gameState.players[round.currentTurnSeatIndex]?.name?.slice(0, 10) ?? ''}`}
                </span>
              </>
            ) : (
              <span className="font-semibold animate-pulse text-gold" style={{ fontSize: fs(15) }}>Trick won!</span>
            )}
          </div>
        </div>
      </div>}

      {/* ══ PORTRAIT STATUS STRIP ══════════════════════════════════ */}
      {isMobilePortrait && (
        <div className="relative z-20 flex-shrink-0 flex items-center justify-between w-full px-3 py-1"
          style={{ background: 'rgba(0,0,0,0.45)', borderBottom: '1px solid rgba(212,168,67,0.07)' }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 11, color: 'rgba(212,168,67,0.55)' }}>#{round.trickNumber}/{totalTricks}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{handCount} left</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 12, color: '#6fa3d4', fontWeight: 700 }}>{round.teamMindis[0]}</span>
            <Target style={{ width: 11, height: 11, color: 'rgba(212,168,67,0.4)' }} />
            <span style={{ fontSize: 12, color: '#d47070', fontWeight: 700 }}>{round.teamMindis[1]}</span>
          </div>
          {round.trumpSuit ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)' }}>
              <Zap style={{ width: 10, height: 10, color: '#d4a843' }} />
              <span style={{ fontSize: 16, color: suitCols[round.trumpSuit], lineHeight: 1 }}>{suitSymbols[round.trumpSuit]}</span>
            </div>
          ) : config.trumpMethod === 'cut_hukum' ? (
            <span style={{ fontSize: 11, color: 'rgba(212,168,67,0.4)' }}>Cut ?</span>
          ) : null}
        </div>
      )}



      {/* ══ PORTRAIT MIDDLE ════════════════════════════════════════ */}
      {isMobilePortrait && (
        <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center gap-3 px-3 py-2">

          {trickPause ? (
            /* Portrait trick pause */
            <div className="flex flex-col items-center gap-3 animate-fade-in">
              <div className="px-4 py-2 rounded-xl flex items-center gap-2"
                style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.22)' }}>
                <Crown style={{ width: 15, height: 15, color: '#d4a843' }} />
                <span style={{ fontSize: 13, color: '#d4a843', fontWeight: 700 }}>{trickPause.winnerName} wins!</span>
                {trickPause.mindisWon > 0 && (
                  <span style={{ fontSize: 11, color: '#d4a843', background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.28)', padding: '2px 8px', borderRadius: 99 }}>
                    +{trickPause.mindisWon} Mindi
                  </span>
                )}
              </div>
              <div className="flex items-end gap-3 flex-wrap justify-center">
                {trickPause.cards.map(entry => {
                  const isW = entry.seatIndex === trickPause.winnerSeatIndex;
                  const tc2 = TEAM_COL[gameState.players[entry.seatIndex]?.teamId ?? 0];
                  return (
                    <div key={`pp-${entry.card.id}`} className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                        style={{ background: tc2.bg, border: `2px solid ${tc2.border}` }}>
                        {AVATARS[entry.seatIndex]}
                      </div>
                      <span style={{ fontSize: 9, color: isW ? '#d4a843' : 'rgba(255,255,255,0.3)' }}>
                        {gameState.players[entry.seatIndex]?.name?.slice(0, 6)}
                      </span>
                      <div style={{ filter: isW ? 'drop-shadow(0 0 8px rgba(212,168,67,0.5))' : undefined }}>
                        <Card card={entry.card} faceUp size="sm" />
                      </div>
                      {isW && <Crown style={{ width: 12, height: 12, color: '#d4a843' }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Portrait table */
            <div className="relative flex-shrink-0" style={{ width: pTW + pBS * 2, height: pTH + pBS * 2 }}>

              {/* Non-local player badges */}
              {gameState.players.map((p, seatIdx) => {
                if (seatIdx === myPlayerIndex) return null;
                const relIdx = (seatIdx - myPlayerIndex + config.playerCount) % config.playerCount;
                const isCurrent = seatIdx === round.currentTurnSeatIndex;
                const hasPlayed = round.currentTrick.cards.some(e => e.seatIndex === seatIdx);
                const tc2 = TEAM_COL[p.teamId];

                // Compute badge position — side badges pinned to screen border, never over the table
                let bx = pBS + pTW / 2;
                let by = pBS + pTH / 2;
                let anchor = 'translate(-50%,-50%)';
                let isLR = false;
                let isLeft = false;

                if (config.playerCount === 4) {
                  // right | top | left
                  if (relIdx === 1) { bx = pBS + pTW + 4; by = pBS + pTH / 2; anchor = 'translateY(-50%)'; isLR = true; }
                  else if (relIdx === 2) { bx = pBS + pTW / 2; by = 4; anchor = 'translate(-50%,0)'; }
                  else if (relIdx === 3) { bx = pBS - 4; by = pBS + pTH / 2; anchor = 'translate(-100%,-50%)'; isLR = true; isLeft = true; }
                } else if (config.playerCount === 6) {
                  // top | right-upper | right-lower | left-upper | left-lower
                  if (relIdx === 3) { bx = pBS + pTW / 2; by = 4; anchor = 'translate(-50%,0)'; }
                  else if (relIdx === 2) { bx = pBS + pTW + 4; by = pBS + pTH * 0.22; anchor = 'translateY(-50%)'; isLR = true; }
                  else if (relIdx === 1) { bx = pBS + pTW + 4; by = pBS + pTH * 0.78; anchor = 'translateY(-50%)'; isLR = true; }
                  else if (relIdx === 4) { bx = pBS - 4; by = pBS + pTH * 0.22; anchor = 'translate(-100%,-50%)'; isLR = true; isLeft = true; }
                  else if (relIdx === 5) { bx = pBS - 4; by = pBS + pTH * 0.78; anchor = 'translate(-100%,-50%)'; isLR = true; isLeft = true; }
                } else {
                  // 8/10 players: circular formula, but snap top-center to just above the table
                  const topRelIdx = config.playerCount / 2; // relIdx with sin≈-1 (directly opposite)
                  if (relIdx === topRelIdx) {
                    // Pin directly above the table, matching the 4/6-player top badge style
                    bx = pBS + pTW / 2;
                    by = -32;
                    anchor = 'translate(-50%,-50%)';
                  } else {
                    const angle = -(360 / config.playerCount) * relIdx + 90;
                    const rad = angle * Math.PI / 180;
                    const distX = pTW / 2 + pBS * 0.7;
                    const distY = pTH / 2 + pBS * 0.85;
                    bx = pBS + pTW / 2 + Math.cos(rad) * distX;
                    by = pBS + pTH / 2 + Math.sin(rad) * distY;
                    anchor = 'translate(-50%,-50%)';
                  }
                }

                return (
                  <div key={seatIdx} className="absolute" style={{ left: bx, top: by, transform: anchor, zIndex: 20 }}>
                    {isLR ? (
                      /* Vertical pill — side players (left / right border) */
                      <div className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-2xl"
                        style={{
                          background: isCurrent ? 'rgba(212,168,67,0.12)' : tc2.bg,
                          border: `1px solid ${isCurrent ? 'rgba(212,168,67,0.45)' : tc2.border}`,
                          minWidth: 28,
                        }}>
                        <span style={{ fontSize: 12 }}>{AVATARS[seatIdx]}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 800,
                          writingMode: 'vertical-lr' as const,
                          textOrientation: 'mixed' as const,
                          color: isCurrent ? '#d4a843' : hasPlayed ? 'rgba(34,197,94,0.85)' : 'rgba(255,255,255,0.75)',
                          transform: isLeft ? 'rotate(180deg)' : undefined,
                          letterSpacing: '0.05em',
                        }}>
                          {p.name[0]?.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 9, color: tc2.text }}>{round.teamTricks[p.teamId]}</span>
                        {isCurrent && <span className="animate-pulse" style={{ fontSize: 7, color: '#d4a843' }}>●</span>}
                      </div>
                    ) : (
                      /* Horizontal pill — top player (and all badges for 8/10p circular layout) */
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                        style={{
                          background: isCurrent ? 'rgba(212,168,67,0.12)' : tc2.bg,
                          border: `1px solid ${isCurrent ? 'rgba(212,168,67,0.45)' : tc2.border}`,
                        }}>
                        <span style={{ fontSize: config.playerCount >= 6 ? 12 : 14 }}>{AVATARS[seatIdx]}</span>
                        <span style={{ fontSize: config.playerCount >= 6 ? 11 : 12, fontWeight: 700, color: isCurrent ? '#d4a843' : hasPlayed ? 'rgba(34,197,94,0.85)' : 'rgba(255,255,255,0.8)' }}>
                          {config.playerCount >= 6 ? p.name[0]?.toUpperCase() : p.name.slice(0, 8)}
                        </span>
                        <span style={{ fontSize: 10, color: tc2.text }}>{round.teamTricks[p.teamId]}</span>
                        {isCurrent && <span className="animate-pulse" style={{ fontSize: 8, color: '#d4a843' }}>●</span>}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Table rectangle */}
              <div className="absolute rounded-3xl"
                style={{
                  left: pBS, top: pBS,
                  width: pTW, height: pTH,
                  background: 'radial-gradient(ellipse at 50% 40%, rgba(212,168,67,0.03), rgba(0,0,0,0.35))',
                  border: '1px solid rgba(212,168,67,0.1)',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)',
                  overflow: 'hidden',
                }}>

                {/* Mindi captures — small badges inside top corners */}
                {([0, 1] as const).map(teamId => {
                  const mindis = capturedMindis[teamId];
                  const captured = SUIT_ORDER.filter(s => mindis[s] > 0);
                  if (!captured.length) return null;
                  const tc = TEAM_COL[teamId];
                  return (
                    <div key={teamId} className="absolute top-2 flex items-center gap-1"
                      style={{ [teamId === 0 ? 'left' : 'right']: 8 }}>
                      {captured.map(suit => (
                        <div key={suit} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md"
                          style={{ background: tc.bg, border: `1px solid ${tc.border}` }}>
                          <span style={{ color: suitCols[suit], fontSize: 12, lineHeight: 1 }}>{suitSymbols[suit]}</span>
                          {mindis[suit] > 1 && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)' }}>×{mindis[suit]}</span>}
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* Empty state */}
                {round.currentTrick.cards.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span style={{ fontSize: 11, color: 'rgba(212,168,67,0.15)', letterSpacing: '0.1em' }}>PLAY</span>
                  </div>
                )}

                {/* Played cards */}
                {round.currentTrick.cards.map((entry, i) => {
                  const relIdx = (entry.seatIndex - myPlayerIndex + config.playerCount) % config.playerCount;
                  const { x, y } = pCardPos(relIdx);
                  const isLatest = i === round.currentTrick.cards.length - 1;
                  return (
                    <div key={`${entry.seatIndex}-${entry.card.id}`} className="absolute transition-all duration-300"
                      style={{
                        left: pTW / 2 + x,
                        top: pTH / 2 + y,
                        transform: 'translate(-50%,-50%)',
                        zIndex: 10 + i,
                        filter: isLatest ? 'drop-shadow(0 0 8px rgba(212,168,67,0.35))' : undefined,
                      }}>
                      <Card card={entry.card} faceUp size="sm" />
                    </div>
                  );
                })}
              </div>

              {/* YOU badge — bottom center, sits just below the table container */}
              <div className="absolute" style={{ left: pBS + pTW / 2, bottom: -50, transform: 'translateX(-50%)', zIndex: 20 }}>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                  style={{
                    background: isMyTurn && !trickPause ? 'rgba(212,168,67,0.15)' : TEAM_COL[myPlayer.teamId].bg,
                    border: `1px solid ${isMyTurn && !trickPause ? 'rgba(212,168,67,0.55)' : TEAM_COL[myPlayer.teamId].border}`,
                  }}>
                  <span style={{ fontSize: 15 }}>{AVATARS[myPlayerIndex]}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isMyTurn && !trickPause ? '#d4a843' : 'rgba(255,255,255,0.85)' }}>
                    {myPlayer.name.slice(0, 10)}
                  </span>
                  <span style={{ fontSize: 10, color: TEAM_COL[myPlayer.teamId].text }}>
                    {round.teamTricks[myPlayer.teamId]}
                  </span>
                  {isMyTurn && !trickPause && <span className="animate-pulse" style={{ fontSize: 8, color: '#d4a843' }}>●</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ LANDSCAPE MIDDLE — trick table ══════════════════════════ */}
      {!isMobilePortrait && <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-2">

        {/* Mindi capture panels */}
        {([0, 1] as const).map(teamId => {
          const tc = TEAM_COL[teamId];
          const mindis = capturedMindis[teamId];
          const has = SUIT_ORDER.some(s => mindis[s] > 0);
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
                const isW = entry.seatIndex === trickPause.winnerSeatIndex;
                const tc = TEAM_COL[gameState.players[entry.seatIndex]?.teamId ?? 0];
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
      </div>}

      {/* ══ BOTTOM — hand ═══════════════════════════════════════════ */}
      {/*
        IMPORTANT: overflow must be visible here so rotated card corners
        (which extend past the calculated container bounds) are not clipped.
        Horizontal overflow is handled by centering + generous handPadX.
      */}
      <div className="relative z-20 flex-shrink-0"
        style={{ paddingBottom: isLandscape ? 12 : 20, paddingTop: 4, overflow: 'visible' }}>

        {/*
          Card fan — NO overflow clipping here.
          totalHandWidth includes handPadX on each side so rotation corners
          don't escape the container. The container itself uses overflow:visible
          (inherited from parent) so nothing gets cut.
        */}
        <div className="w-full flex justify-center" style={{ overflow: 'visible' }}>
          <div className="relative" style={{ width: totalHandWidth, height: handHeight, overflow: 'visible' }}>
            {sortedHand.map((card: CardType, index: number) => {
              const isPlayable = playableIds.has(card.id);
              const isTourHL = isTourMode && tourHighlightedCardIds.has(card.id);
              // Only truly "playable" in tour if this specific card must be played this step
              const isTourPlayable = isTourHL &&
                tourStep?.requiredAction.type === 'play_card' &&
                tourStep.requiredAction.cardId === card.id;
              const effectivePlayable = isTourMode ? isTourPlayable : isPlayable;
              const dimForTour = isTourMode && !isTourHL;
              return (
                <div key={card.id}
                  className="absolute transition-all duration-200"
                  style={{
                    left: handPadX + index * overlap,
                    bottom: 10,
                    zIndex: isTourHL ? 250 : index,
                    opacity: dimForTour ? 0.28 : 1,
                    filter: dimForTour ? 'saturate(0.4)' : undefined,
                  }}>
                  <Card
                    card={card}
                    faceUp
                    playable={effectivePlayable}
                    onClick={() => handleCardClick(card.id)}
                    size={cardSz}
                    glowColor={
                      isTourHL ? 'rgba(212,168,67,0.55)' :
                      isPlayable ? 'rgba(212,168,67,0.25)' : undefined
                    }
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

      {/* ══ TOUR OVERLAY ════════════════════════════════════════════ */}
      {isTourMode && tourStep && (
        <GameTour
          step={tourStep}
          stepIndex={tourStepIndex ?? 0}
          totalSteps={tourTotalSteps ?? 1}
          onNext={onTourNext ?? (() => {})}
          onSkip={onTourSkip ?? (() => {})}
          highlightedCardIds={tourHighlightedCardIds}
          highlightedAreaId={tourHighlightedAreaId}
          highlightedSeatIndex={tourHighlightedSeatIndex}
          canAdvance={tourStep.requiredAction.type === 'click_next'}
        />
      )}
    </div>
  );
}
