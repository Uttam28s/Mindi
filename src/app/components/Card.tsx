import { useRef, useCallback, useState, useEffect } from 'react';
import { Card as CardType } from '../types';
import { Sounds } from '../utils/sounds';
import { haptic, prefersReduced } from '../utils/juice';

interface CardProps {
  card: CardType;
  faceUp?: boolean;
  selected?: boolean;
  playable?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  glowColor?: string;
  dealDelay?: number;
  /** Index within the hand — drives the idle bob offset so cards breathe out of phase. */
  bobIndex?: number;
  /** Suppresses hover/tilt/idle. Used for cards on the table. */
  inert?: boolean;
}

/* ── Suit colours. Saturated candy, not the old desaturated maroon set. ───── */
const SUIT: Record<string, { ink: string; deep: string; soft: string; robe: string }> = {
  //                                                          robe = the court figure's gown.
  //                                                          Dark enough to hold the gold and
  //                                                          the tabard, tinted so each suit's
  //                                                          court reads as its own.
  hearts:   { ink: '#FF3B6B', deep: '#C41F4A', soft: '#FFE4EB', robe: '#3A1020' },
  diamonds: { ink: '#FF8A00', deep: '#C25E00', soft: '#FFEFD9', robe: '#3A2208' },
  spades:   { ink: '#4B32C0', deep: '#2E1C88', soft: '#E6E1FF', robe: '#1A1436' },
  clubs:    { ink: '#17A05C', deep: '#0E6B3D', soft: '#DDF7E9', robe: '#0C2418' },
};

const PATHS: Record<string, string> = {
  hearts:  'M12 20.9 4.1 13a5.2 5.2 0 0 1 7.3-7.4l.6.6.6-.6A5.2 5.2 0 0 1 19.9 13z',
  diamonds:'M12 2.2 21.2 12 12 21.8 2.8 12z',
  spades:  'M12 2.2C12 2.2 4.1 8.4 4.1 13.2a4.7 4.7 0 0 0 7.3 3.9c-.3 2-1.2 3.5-2.4 4.4h6a6.4 6.4 0 0 1-2.4-4.4 4.7 4.7 0 0 0 7.3-3.9c0-4.8-7.9-11-7.9-11z',
  clubs:   'M12 2.1a4.1 4.1 0 0 0-2.7 7.2A4.1 4.1 0 1 0 7 16.8a4 4 0 0 0 3.4-1.9c-.2 2.1-1.1 3.7-2.3 4.6h7.8c-1.2-.9-2.1-2.5-2.3-4.6a4 4 0 0 0 3.4 1.9 4.1 4.1 0 1 0-2.3-7.5A4.1 4.1 0 0 0 12 2.1z',
};

function Pip({ suit, size, color, shadow }: { suit: string; size: number; color: string; shadow?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }} aria-hidden="true">
      {/* Hard contact shadow in a darker sibling hue — never grey. */}
      {shadow && <path d={PATHS[suit]} fill={shadow} transform="translate(0,1.1)" />}
      <path d={PATHS[suit]} fill={color} />
      {/* One soft top-left specular blob. Never a rim sweep — that reads as glass. */}
      <path d={PATHS[suit]} fill="rgba(255,255,255,.34)" transform="translate(-.35,-.7) scale(.995)"
            style={{ clipPath: 'inset(0 45% 55% 0)' }} />
    </svg>
  );
}

/* ── Court cards ───────────────────────────────────────────────────────────
   Figures supplied as SVG and recoloured per suit at render time.

   Three adjustments were needed to make them safe as components:
     - the Jack shipped with a full-bleed #262626 background rect, which would
       have painted over the card face; dropped.
     - all three shared a `.o` CSS class for the outline. A <style> block inside
       a component is document-global, so with several courts on screen (and
       multiple decks in a 6+ player game) they would all fight over one class
       name. The outline is inline attributes instead.
     - the artwork is 512x800 (0.64, the bridge-card ratio) while our cards are
       0.714, so the figure is sized off card *height* and centred.            */

const GOLD = '#F2C94C';
const LINE = '#000';

/** Shared outline, replacing the original `.o` class. */
const O = {
  stroke: LINE, strokeWidth: 14, strokeLinejoin: 'round', strokeLinecap: 'round',
} as const;

function CourtFigure({ rank, suit, height }: { rank: string; suit: string; height: number }) {
  const c = SUIT[suit] ?? SUIT.spades;
  const width = height * (512 / 800);

  // Common to all three: face, eyes, smile, gown, tabard.
  const face = (cy: number, eyeY: number, smileY: number) => (
    <>
      <circle {...O} cx="256" cy={cy} r="95" fill="#fff" />
      <circle cx="225" cy={eyeY} r="12" />
      <circle cx="287" cy={eyeY} r="12" />
      <path d={`M220 ${smileY} Q256 ${smileY + 25} 292 ${smileY}`}
        fill="none" stroke={LINE} strokeWidth="10" strokeLinecap="round" />
    </>
  );

  const gown = (
    <>
      <path {...O} fill={c.robe} d="M110 390 L402 390 L460 730 L52 730 Z" />
      <path fill={c.ink} d="M195 405 L317 405 L290 700 L222 700 Z" />
    </>
  );

  return (
    <svg width={width} height={height} viewBox="0 0 512 800"
      aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      {rank === 'K' && (
        <>
          <path {...O} fill={c.ink} d="M110 205 L160 80 L200 130 L235 60 L277 130 L312 60 L352 130 L402 205 Z" />
          <path {...O} fill={GOLD} d="M150 90 L362 90 L382 125 L130 125 Z" />
          {face(285, 265, 315)}
          {gown}
          {/* sceptre */}
          <path {...O} fill="#DDD" d="M385 165 L395 165 L395 355 L385 355 Z" />
          <path {...O} fill={GOLD} d="M372 160 L408 160 L390 130 Z" />
        </>
      )}

      {rank === 'Q' && (
        <>
          <path {...O} fill={c.ink} d="M110 205 L160 80 L205 140 L256 70 L307 140 L352 80 L402 205 Z" />
          <path {...O} fill={GOLD} d="M150 90 L362 90 L382 125 L130 125 Z" />
          {face(285, 265, 315)}
          {gown}
          {/* pearls on the crown points */}
          <circle cx="160" cy="78" r="10" fill={GOLD} />
          <circle cx="256" cy="68" r="10" fill={GOLD} />
          <circle cx="352" cy="78" r="10" fill={GOLD} />
        </>
      )}

      {rank === 'J' && (
        <>
          <path {...O} fill={c.ink}
            d="M80 200 L140 60 L372 60 L432 200 L360 200 C340 140 300 110 256 110 C212 110 172 140 152 200 Z" />
          <path {...O} fill={GOLD} d="M160 70 L352 70 L380 110 L132 110 Z" />
          {face(290, 270, 320)}
          {gown}
        </>
      )}
    </svg>
  );
}

const isCourt = (r: string) => r === 'J' || r === 'Q' || r === 'K';

export function Card({
  card, faceUp = true, selected = false, playable = true, onClick,
  size = 'md', glowColor, dealDelay, bobIndex = 0, inert = false,
}: CardProps) {
  const d = {
    // `court` is the figure's HEIGHT — the artwork is 512x800, taller than the
    // card is, so height is the binding dimension. ~62% of the card leaves the
    // corner indices clear.
    sm: { w: 64,  h: 90,  rank: 15, pip: 10, court: 56, center: 26, r: 10, bw: 2.5 },
    md: { w: 84,  h: 118, rank: 19, pip: 12, court: 73, center: 34, r: 13, bw: 3 },
    lg: { w: 110, h: 154, rank: 25, pip: 16, court: 96, center: 44, r: 16, bw: 3.5 },
  }[size];

  const sc = SUIT[card.suit] ?? SUIT.spades;
  const isMindi = card.rank === '10';

  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);
  const pending = useRef<{ x: number; y: number } | null>(null);
  const [pressed, setPressed] = useState(false);
  const [nudging, setNudging] = useState(false);
  const [hovered, setHovered] = useState(false);

  const interactive = !inert && faceUp;

  /* ── Pointer tilt. The handler only stores coordinates; a single rAF does
        the write, so pointermove firing faster than the display never causes
        more than one style write per frame. ── */
  const flush = useCallback(() => {
    raf.current = null;
    const el = ref.current;
    const p = pending.current;
    if (!el || !p) return;
    const MAX = 11;
    // rotateY follows cursor X; rotateX is the NEGATIVE of cursor Y, because
    // positive rotateX tips the top away from the viewer.
    el.style.setProperty('--u-ry', `${(p.x - 0.5) * 2 * MAX}deg`);
    el.style.setProperty('--u-rx', `${(p.y - 0.5) * -2 * MAX}deg`);
    el.style.setProperty('--u-gx', `${p.x * 100}%`);
    el.style.setProperty('--u-gy', `${p.y * 100}%`);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!interactive || !playable || prefersReduced()) return;
    const r = e.currentTarget.getBoundingClientRect();
    pending.current = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    if (raf.current == null) raf.current = requestAnimationFrame(flush);
  }, [interactive, playable, flush]);

  const resetTilt = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--u-ry', '0deg');
    el.style.setProperty('--u-rx', '0deg');
  }, []);

  useEffect(() => () => { if (raf.current != null) cancelAnimationFrame(raf.current); }, []);

  const handleEnter = () => {
    if (!interactive) return;
    setHovered(true);
    if (playable) Sounds.cardSelect();
  };
  const handleLeave = () => {
    setHovered(false);
    setPressed(false);
    resetTilt();
  };

  const handleClick = () => {
    if (!interactive) return;
    if (!playable) {
      // Say no clearly: a nudge, a flat buzz, and a short buzz on the phone.
      setNudging(true);
      Sounds.invalid();
      haptic([14, 40, 14]);
      window.setTimeout(() => setNudging(false), 440);
      return;
    }
    haptic(11);
    onClick?.();
  };

  /* ── Card back ─────────────────────────────────────────────────────────── */
  if (!faceUp) {
    return (
      <div style={{ width: d.w, height: d.h }} onClick={onClick}
        className={inert ? '' : 'cursor-pointer transition-transform duration-200 hover:scale-105'}>
        <div style={{
          width: '100%', height: '100%', borderRadius: d.r, position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(160deg, #7B5CFF 0%, #5B37B0 52%, #40287F 100%)',
          border: `${d.bw}px solid #FFFFFF`,
          boxShadow: '0 3px 0 rgba(52,36,110,.75), 0 8px 18px rgba(30,16,60,.4)',
        }}>
          {/* Ganjifa-style plain back with a rangoli dot grid — instantly Indian,
              legible at 60px, and no pattern to fight the face cards. */}
          <div style={{
            position: 'absolute', inset: 5, borderRadius: d.r - 5,
            backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,.55) 1.1px, transparent 1.1px)',
            backgroundSize: `${Math.round(d.w / 6)}px ${Math.round(d.w / 6)}px`,
            opacity: .8,
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(150deg, rgba(255,255,255,.26), transparent 46%)',
          }} />
        </div>
      </div>
    );
  }

  /* ── Card face ─────────────────────────────────────────────────────────── */
  // Shipped trick-takers lift a highlighted card 18-35% of its own height;
  // 14px on a 90px card was under that band and read as a twitch.
  const lift = selected ? -Math.round(d.h * 0.30) : hovered && playable ? -Math.round(d.h * 0.22) : 0;
  const scale = pressed ? 0.96 : selected ? 1.09 : hovered && playable ? 1.06 : 1;
  const scaleY = pressed ? 0.92 : 1;

  const corner = (
    <>
      <span style={{
        fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 800,
        fontSize: d.rank, lineHeight: .92, color: sc.ink,
        textShadow: `0 1px 0 ${sc.deep}30`,
      }}>{card.rank}</span>
      <Pip suit={card.suit} size={d.pip} color={sc.ink} />
    </>
  );

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={interactive ? 0 : -1}
      aria-label={`${card.rank} of ${card.suit}${playable ? '' : ', not playable'}`}
      aria-disabled={!playable}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      onPointerMove={onPointerMove}
      onPointerDown={() => interactive && playable && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onClick={handleClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      className={nudging ? 'u-anim-nudge' : undefined}
      style={{
        width: d.w,
        height: d.h,
        position: 'relative',
        perspective: 620,
        cursor: interactive ? (playable ? 'pointer' : 'not-allowed') : 'default',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        // Idle bob: playable cards breathe out of phase so the hand never
        // looks like a static row of rectangles.
        animation: interactive && playable && !selected && dealDelay == null
          ? `u-bob ${3.1 + (bobIndex % 5) * 0.22}s ease-in-out ${(bobIndex % 7) * 0.19}s infinite`
          : undefined,
        // @ts-expect-error custom property consumed by the u-bob keyframes
        '--u-bob-y': '-4px',
      }}
    >
      <div
        style={{
          width: '100%', height: '100%', position: 'relative',
          transform: `translateY(${lift}px) scale(${scale}) scaleY(${scaleY})
                      rotateX(var(--u-rx, 0deg)) rotateY(var(--u-ry, 0deg))`,
          transition: pressed
            ? 'transform 80ms cubic-bezier(.22,1,.36,1)'
            : 'transform 240ms cubic-bezier(.34,1.56,.64,1)',
          transformStyle: 'preserve-3d',
          willChange: hovered || selected || pressed ? 'transform' : undefined,
          filter: !playable && interactive ? 'saturate(.35) brightness(.82)' : undefined,
          animation: dealDelay != null ? `u-drop-in .42s cubic-bezier(.34,1.56,.64,1) ${dealDelay}ms both` : undefined,
        }}
      >
        {/* Glow behind a playable card. A soft box-shadow, not a blur filter —
            13 blur passes a frame is what the old version was paying for. */}
        {playable && glowColor && !selected && (
          <div style={{
            position: 'absolute', inset: -3, borderRadius: d.r + 3,
            boxShadow: `0 0 14px 3px ${glowColor}`, pointerEvents: 'none',
          }} />
        )}

        {/* ── the card ── */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: d.r, overflow: 'hidden',
          background: isMindi
            ? 'linear-gradient(168deg,#FFFDF2 0%,#FFF0BE 48%,#FFE28A 100%)'
            : '#FFFFFF',
          border: `${d.bw}px solid ${sc.ink}`,
          boxShadow: selected
            ? `0 8px 0 ${sc.deep}, 0 16px 26px rgba(30,16,60,.42), 0 0 0 3px rgba(255,201,60,.85)`
            : hovered && playable
              ? `0 6px 0 ${sc.deep}, 0 12px 22px rgba(30,16,60,.34)`
              : `0 3px 0 ${sc.deep}, 0 6px 12px rgba(30,16,60,.24)`,
          transition: 'box-shadow 200ms cubic-bezier(.22,1,.36,1)',
        }}>
          {/* broad top specular — the moulded-plastic read */}
          <div style={{
            position: 'absolute', top: 2, left: 4, right: 4, height: '26%',
            borderRadius: 999, background: 'rgba(255,255,255,.72)',
            opacity: isMindi ? .5 : .34, pointerEvents: 'none',
          }} />

          {/* corners */}
          <div style={{ position: 'absolute', top: 4, left: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, lineHeight: .85 }}>
            {corner}
          </div>
          <div style={{ position: 'absolute', bottom: 4, right: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, lineHeight: .85, transform: 'rotate(180deg)' }}>
            {corner}
          </div>

          {/* centre */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            {isCourt(card.rank)
              ? <CourtFigure rank={card.rank} suit={card.suit} height={d.court} />
              : <Pip suit={card.suit} size={card.rank === 'A' ? d.center * 1.32 : d.center} color={sc.ink} shadow={`${sc.deep}55`} />}
          </div>

          {/* Mindi tens are the whole point of the game — they get a marigold
              ring and a shine that sweeps on hover. */}
          {isMindi && (
            <>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: d.r - d.bw,
                border: '2px solid rgba(255,201,60,.9)', pointerEvents: 'none',
              }} />
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, width: '46%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.85), transparent)',
                  animation: `u-shine-sweep ${hovered ? 1.1 : 4.4}s ease-in-out infinite`,
                }} />
              </div>
            </>
          )}
        </div>

        {/* Selected: a marigold chevron above the card saying "this one goes". */}
        {selected && (
          <div style={{
            position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }} className="u-anim-breathe">
            <svg width="20" height="12" viewBox="0 0 20 12" aria-hidden="true">
              <path d="M10 0 20 12 0 12z" fill="#FFC93C" stroke="#C98A00" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
