import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { GameState, TrickEntry, Suit } from '../types';
import { GameTour } from './GameTour';
import { TourStep, TourHighlight, TourSeatHL, TourAreaHL } from '../utils/tourScript';
import { UtsavBackground } from './UtsavBackground';
import { SoundToggle } from './SoundToggle';
import { Home, RotateCcw, X } from 'lucide-react';
import { Sounds } from '../utils/sounds';
import { shake, hitStop, flash, burst, puff, ring, haptic, centerOf } from '../utils/juice';

import { computeGeometry, seatPos } from './table/geometry';
import { TableSurface } from './table/TableSurface';
import { PlayerSeat } from './table/PlayerSeat';
import { TrickPile } from './table/TrickPile';
import { Hand } from './table/Hand';
import { TableHUD } from './table/TableHUD';
import { MindiTracker } from './table/MindiTracker';

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

const TOTAL_TRICKS = 15;

/** Follow suit if you can. Mirrors the engine — display only, never authoritative. */
function getPlayableCardIds(hand: { id: string; suit: Suit }[], ledSuit: Suit | null): Set<string> {
  if (!ledSuit) return new Set(hand.map(c => c.id));
  const same = hand.filter(c => c.suit === ledSuit);
  return new Set((same.length > 0 ? same : hand).map(c => c.id));
}

export function GameTable({
  gameState, myPlayerIndex, onCardClick, aiPlayers, trickPause, onExitGame,
  tourStep, tourStepIndex, tourTotalSteps, onTourNext, onTourSkip,
}: GameTableProps) {
  const { round, config } = gameState;
  const myPlayer = gameState.players[myPlayerIndex];
  const isTourMode = !!tourStep;
  const isMyTurn = round.currentTurnSeatIndex === myPlayerIndex && !trickPause;

  const [menuOpen, setMenuOpen] = useState(false);
  const [dealing, setDealing] = useState(true);

  /* ── Measure the space the table gets, rather than guessing from the window.
        The hand and HUD are laid out by flex; the table takes what's left.
        ResizeObserver is the accurate source but it is delivered as part of the
        rendering steps, so it goes quiet in a backgrounded or non-compositing
        tab. A window listener and an initial rAF pass cover that, and a real
        measurement always wins over the seed value. ── */
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: window.innerWidth, h: Math.max(220, window.innerHeight - 230) });
  const [winW, setWinW] = useState(window.innerWidth);

  useLayoutEffect(() => {
    const measure = () => {
      setWinW(window.innerWidth);
      const el = boxRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setBox(prev => {
          const w = Math.round(r.width), h = Math.round(r.height);
          return prev.w === w && prev.h === h ? prev : { w, h };
        });
      }
    };

    measure();
    const raf = requestAnimationFrame(measure);

    const ro = new ResizeObserver(measure);
    if (boxRef.current) ro.observe(boxRef.current);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  const compact = winW < 560;

  const g = useMemo(
    () => computeGeometry({ w: box.w, h: box.h, hudH: 0, handH: 0 }, config.playerCount),
    [box.w, box.h, config.playerCount]
  );

  const handSize: 'sm' | 'md' = compact || box.h < 340 ? 'sm' : 'md';

  /* ── Tour highlights ───────────────────────────────────────────── */
  const tourCardIds = useMemo<Set<string> | null>(() => {
    if (!tourStep) return null;
    const ids = tourStep.highlights.filter((h): h is TourHighlight => h.type === 'card').map(h => h.cardId);
    return ids.length ? new Set(ids) : null;
  }, [tourStep]);

  const tourAreaId = useMemo<string | null>(() => {
    if (!tourStep) return null;
    return (tourStep.highlights.find(h => h.type === 'area') as TourAreaHL | undefined)?.areaId ?? null;
  }, [tourStep]);

  const tourSeatIndex = useMemo<number | null>(() => {
    if (!tourStep) return null;
    return (tourStep.highlights.find(h => h.type === 'seat') as TourSeatHL | undefined)?.seatIndex ?? null;
  }, [tourStep]);

  /* ── Playable set ──────────────────────────────────────────────── */
  const playableIds = useMemo(() => (
    isMyTurn && !aiPlayers?.has(myPlayerIndex)
      ? getPlayableCardIds(myPlayer.hand, round.currentTrick.ledSuit)
      : new Set<string>()
  ), [isMyTurn, aiPlayers, myPlayerIndex, myPlayer.hand, round.currentTrick.ledSuit]);

  /* ── Which tens each team has taken, by suit. ── */
  const capturedTens = useMemo(() => {
    const out: [Record<string, number>, Record<string, number>] = [{}, {}];
    for (const trick of round.completedTricks) {
      if (!trick.mindisInTrick) continue;
      const team = gameState.players[trick.winnerSeatIndex]?.teamId ?? 0;
      for (const e of trick.cards) {
        if (e.card.rank === '10') out[team][e.card.suit] = (out[team][e.card.suit] ?? 0) + 1;
      }
    }
    return out;
  }, [round.completedTricks, gameState.players]);

  /* ── Hand sorted: suits grouped, colours alternating so adjacent suits never
        blur together in a dense fan. ── */
  const sortedHand = useMemo(() => {
    const rv = (r: string) => ({ '3': 1, '2': 2, '7': 3, '8': 4, '9': 5, '10': 6, J: 7, Q: 8, K: 9, A: 10 } as Record<string, number>)[r] ?? 0;
    const order: Record<string, number> = { hearts: 0, spades: 1, diamonds: 2, clubs: 3 };
    return [...myPlayer.hand].sort((a, b) =>
      order[a.suit] !== order[b.suit] ? order[a.suit] - order[b.suit] : rv(b.rank) - rv(a.rank));
  }, [myPlayer.hand]);

  /* ══ DEAL ═══════════════════════════════════════════════════════ */
  useEffect(() => {
    setDealing(true);
    const n = Math.min(myPlayer.hand.length, 15);
    const flicks: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < n; i++) flicks.push(setTimeout(() => Sounds.deal(), i * 52));
    const done = setTimeout(() => { setDealing(false); Sounds.dealComplete(); haptic(16); }, n * 52 + 240);
    return () => { flicks.forEach(clearTimeout); clearTimeout(done); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.dealerSeatIndex]);

  useEffect(() => {
    if (isMyTurn && !aiPlayers?.has(myPlayerIndex) && !dealing) Sounds.yourTurn();
  }, [isMyTurn, myPlayerIndex, aiPlayers, dealing]);

  /* ══ A CARD LANDS ═══════════════════════════════════════════════ */
  const prevPlayedRef = useRef(0);
  useEffect(() => {
    const n = round.currentTrick.cards.length;
    if (n === prevPlayedRef.current) return;
    const grew = n > prevPlayedRef.current;
    prevPlayedRef.current = n;
    if (!grew || dealing) return;

    Sounds.cardPlay();
    const last = round.currentTrick.cards.at(-1);
    if (last) {
      const at = centerOf(document.querySelector(`[data-played-seat="${last.seatIndex}"]`));
      if (at) puff(at.x, at.y);
    }
  }, [round.currentTrick.cards, dealing]);

  /* ══ TRICK WON ══════════════════════════════════════════════════
     The cards themselves carry the news — see TrickPile. This is only the
     percussion that goes with it. */
  const celebratedRef = useRef(-1);
  useEffect(() => {
    if (!trickPause) return;
    if (celebratedRef.current === round.trickNumber) return;
    celebratedRef.current = round.trickNumber;

    const gotMindi = trickPause.mindisWon > 0;
    const iWon = gameState.players[trickPause.winnerSeatIndex]?.teamId === myPlayer.teamId;

    hitStop(gotMindi ? 80 : 55);

    window.setTimeout(() => {
      if (gotMindi) flash('rgba(255,201,60,.28)', 110);
      shake(gotMindi ? 'md' : 'sm');
      haptic(gotMindi ? [18, 40, 26] : 14);
    }, gotMindi ? 80 : 55);

    window.setTimeout(() => {
      if (gotMindi) Sounds.mindiCapture();
      if (iWon) Sounds.trickWin(); else Sounds.trickLose();
    }, 130);

    // The burst fires where the cards are about to land — on the winner's seat.
    window.setTimeout(() => {
      const at =
        centerOf(document.querySelector(`[data-seat="${trickPause.winnerSeatIndex}"]`)) ??
        { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      ring(at.x, at.y, gotMindi ? '#FFC93C' : '#38E08A', 36);
      burst(at.x, at.y, gotMindi);
      // Timed to the cards arriving, not to the pause ending.
    }, 470);
  }, [trickPause, round.trickNumber, gameState.players, myPlayer.teamId]);

  /* ── Interaction ───────────────────────────────────────────────── */
  const handlePlay = (cardId: string) => {
    if (isTourMode) {
      if (tourCardIds?.has(cardId)) onCardClick?.(cardId);
      return;
    }
    if (playableIds.has(cardId)) onCardClick?.(cardId);
  };

  // While the trick is being collected, keep showing the four cards from the
  // pause snapshot — the engine has already cleared currentTrick.
  const shownTrick = trickPause ? trickPause.cards : round.currentTrick.cards;
  const collectTo = trickPause
    ? { winnerSeatIndex: trickPause.winnerSeatIndex, mindisWon: trickPause.mindisWon }
    : null;

  const rel = (seat: number) => (seat - myPlayerIndex + config.playerCount) % config.playerCount;
  const tourDim = (seat: number) => isTourMode && tourSeatIndex != null && tourSeatIndex !== seat;

  return (
    <div id="u-shake-root" className="relative flex flex-col"
      style={{ height: '100dvh', width: '100vw', overflow: 'hidden' }}>
      <UtsavBackground variant="table" />

      <TableHUD
        trumpSuit={round.trumpSuit}
        trumpPending={!round.trumpSuit && config.trumpMethod === 'cut_hukum'}
        scores={gameState.gamePoints}
        target={config.gamePointsTarget}
        mindis={round.teamMindis}
        tricks={round.teamTricks}
        trickNumber={round.trickNumber}
        totalTricks={TOTAL_TRICKS}
        compact={compact}
        onMenu={() => { Sounds.click(); setMenuOpen(true); }}
        highlightTrump={tourAreaId === 'trump_indicator'}
      />

      {/* ══ TABLE ═══════════════════════════════════════════════════ */}
      <div ref={boxRef} className="relative z-10"
        style={{ flex: '1 1 auto', minHeight: 0, display: 'grid', placeItems: 'center', padding: 4 }}>
        <div style={{ position: 'relative', width: g.width, height: g.height }}>
          <TableSurface g={g} dim={isTourMode && tourSeatIndex != null} />

          {/* Seats, sitting on the rim */}
          {gameState.players.map((p, seatIdx) => {
            const r = rel(seatIdx);
            const pos = seatPos(g, r, config.playerCount);
            return (
              <div key={seatIdx} style={{
                position: 'absolute',
                left: g.cx + pos.x, top: g.cy + pos.y,
                transform: 'translate(-50%,-50%)',
                zIndex: 25,
              }}>
                <PlayerSeat
                  seatIndex={seatIdx}
                  name={p.name}
                  teamId={p.teamId}
                  tricks={round.teamTricks[p.teamId]}
                  size={g.seatSize}
                  // Deliberately NOT gated on trickPause. The engine has already
                  // moved the turn to the trick winner, so keeping the ring lit
                  // shows who leads next while the cards are still flying. Blanking
                  // it meant nobody looked on-turn for the whole pause, which is a
                  // big part of why the old build read as "frozen".
                  isTurn={seatIdx === round.currentTurnSeatIndex}
                  isMe={seatIdx === myPlayerIndex}
                  isDealer={seatIdx === round.dealerSeatIndex}
                  hasPlayed={round.currentTrick.cards.some(e => e.seatIndex === seatIdx)}
                  isWinner={trickPause?.winnerSeatIndex === seatIdx}
                  dimmed={tourDim(seatIdx)}
                  highlighted={tourSeatIndex === seatIdx}
                />
              </div>
            );
          })}

          {/* The played cards, and their flight to the winner */}
          <TrickPile
            entries={shownTrick}
            playerCount={config.playerCount}
            myPlayerIndex={myPlayerIndex}
            g={g}
            collectTo={collectTo}
            dimmed={isTourMode && tourSeatIndex != null}
          />

          {/* Centre prompt — only when the table is empty, so it never sits
              under a card. */}
          {shownTrick.length === 0 && !dealing && (
            <div style={{
              position: 'absolute', left: g.cx, top: g.cy,
              transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 5,
              textAlign: 'center',
            }}>
              <div className={isMyTurn ? 'u-anim-breathe' : undefined} style={{
                fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 800,
                fontSize: compact ? 13 : 15,
                color: isMyTurn ? 'rgba(255,201,60,.92)' : 'rgba(255,255,255,.24)',
                letterSpacing: '.08em',
              }}>
                {isMyTurn ? 'YOUR TURN' : 'WAITING'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ MINDI RACE ══════════════════════════════════════════════
          The whole game is the race for four tens, so it gets its own strip
          rather than a bare number buried in the HUD. */}
      <div className="relative z-20" style={{
        flexShrink: 0, display: 'flex', justifyContent: 'center',
        gap: 8, padding: '0 8px 6px', flexWrap: 'wrap',
      }}>
        {([0, 1] as const).map(t => (
          <MindiTracker key={t} captured={capturedTens} teamId={t}
            total={round.teamMindis[t]} compact={compact} />
        ))}
      </div>

      {/* ══ HAND ════════════════════════════════════════════════════
          Capped to the table's width. The hand being the largest object on
          screen is a big part of why the old layout never read as a table. */}
      <div className="relative z-20" style={{
        flexShrink: 0, paddingBottom: 6, display: 'flex', justifyContent: 'center',
      }}>
        {/* Lead-suit reminder — the one rule new players trip on. */}
        {isMyTurn && round.currentTrick.ledSuit && (
          <div className="u-anim-pop-in" style={{
            position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
            padding: '3px 12px', borderRadius: 999, zIndex: 30,
            background: 'rgba(20,10,44,.9)', border: '1.5px solid rgba(255,255,255,.2)',
            fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 700, fontSize: 11,
            color: 'rgba(255,255,255,.8)', whiteSpace: 'nowrap',
          }}>
            Follow {round.currentTrick.ledSuit}
          </div>
        )}
        <Hand
          cards={sortedHand}
          width={Math.min(winW - 8, Math.max(g.width, 300))}
          playableIds={isTourMode ? (tourCardIds ?? new Set()) : playableIds}
          interactive={isTourMode ? !!tourCardIds : isMyTurn}
          dealing={dealing}
          onPlay={handlePlay}
          size={handSize}
          highlightIds={tourCardIds}
        />
      </div>

      {/* ══ PAUSE MENU ══════════════════════════════════════════════ */}
      {menuOpen && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center"
          style={{ background: 'rgba(20,10,44,.86)' }}
          onClick={() => setMenuOpen(false)}>
          <div className="u-panel u-anim-pop-in" onClick={e => e.stopPropagation()}
            style={{ width: 292, padding: 22, background: 'rgba(46,26,96,.96)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span className="u-display" style={{ fontSize: 22, color: '#fff' }}>Paused</span>
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu"
                style={{
                  width: 32, height: 32, borderRadius: 999, cursor: 'pointer',
                  background: 'rgba(255,255,255,.12)', border: '2px solid rgba(255,255,255,.2)',
                  display: 'grid', placeItems: 'center',
                }}>
                <X style={{ width: 15, height: 15, color: '#fff' }} />
              </button>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 10, padding: '10px 12px', borderRadius: 16, marginBottom: 12,
              background: 'rgba(255,255,255,.08)', border: '2px solid rgba(255,255,255,.16)',
            }}>
              <span className="u-body" style={{ fontSize: 13.5, color: 'rgba(255,255,255,.85)' }}>
                Music &amp; sound
              </span>
              <SoundToggle compact />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="u-btn u-btn--mint" style={{ width: '100%' }}
                onClick={() => { Sounds.click(); setMenuOpen(false); }}>
                <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <RotateCcw style={{ width: 16, height: 16 }} /> Resume
                </span>
              </button>
              <button className="u-btn" style={{ width: '100%' }}
                onClick={() => { Sounds.click(); onExitGame?.(); }}>
                <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <Home style={{ width: 16, height: 16 }} /> Leave game
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ TOUR ════════════════════════════════════════════════════ */}
      {tourStep && (
        <GameTour
          step={tourStep}
          stepIndex={tourStepIndex ?? 0}
          totalSteps={tourTotalSteps ?? 1}
          onNext={() => onTourNext?.()}
          onSkip={() => onTourSkip?.()}
          highlightedCardIds={tourCardIds ?? new Set()}
          highlightedAreaId={tourAreaId}
          highlightedSeatIndex={tourSeatIndex}
          canAdvance={tourStep.requiredAction.type !== 'play_card'}
        />
      )}
    </div>
  );
}
