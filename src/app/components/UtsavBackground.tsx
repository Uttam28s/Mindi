import { useMemo } from 'react';

/**
 * UTSAV background — the world the game sits in.
 *
 * Modelled on a Fall Guys menu rather than a sky: a deep candy gradient with
 * big soft objects drifting on parallax layers, bunting across the top, and
 * confetti. Two variants, because the table has a different job to the menu:
 *
 *   menu  — full energy. Big shapes, bunting, confetti, hills.
 *   table — same world, turned down. Fewer objects, pushed to the edges, and a
 *           vignette through the middle so white cards keep their contrast.
 *
 * Everything animates on transform/opacity only. No `filter: blur()` anywhere —
 * soft edges come from radial-gradients, which cost a fraction as much on the
 * mid-range Androids this has to run on.
 */

type Variant = 'menu' | 'table';

/* Deterministic pseudo-random so the layout never jumps between renders. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const SUIT_PATHS: Record<string, string> = {
  hearts:  'M12 20.9 4.1 13a5.2 5.2 0 0 1 7.3-7.4l.6.6.6-.6A5.2 5.2 0 0 1 19.9 13z',
  diamonds:'M12 2.2 21.2 12 12 21.8 2.8 12z',
  spades:  'M12 2.2C12 2.2 4.1 8.4 4.1 13.2a4.7 4.7 0 0 0 7.3 3.9c-.3 2-1.2 3.5-2.4 4.4h6a6.4 6.4 0 0 1-2.4-4.4 4.7 4.7 0 0 0 7.3-3.9c0-4.8-7.9-11-7.9-11z',
  clubs:   'M12 2.1a4.1 4.1 0 0 0-2.7 7.2A4.1 4.1 0 1 0 7 16.8a4 4 0 0 0 3.4-1.9c-.2 2.1-1.1 3.7-2.3 4.6h7.8c-1.2-.9-2.1-2.5-2.3-4.6a4 4 0 0 0 3.4 1.9 4.1 4.1 0 1 0-2.3-7.5A4.1 4.1 0 0 0 12 2.1z',
};

const SHAPE_COLORS = [
  { fill: '#FF4D8D', edge: '#C41F5E' },   // holi pink
  { fill: '#FFC93C', edge: '#C98A00' },   // marigold
  { fill: '#25C9F5', edge: '#0B87AC' },   // sky
  { fill: '#38E08A', edge: '#17A05C' },   // mint
  { fill: '#7B5CFF', edge: '#4B32C0' },   // jamun
  { fill: '#FF8A3D', edge: '#C25A15' },   // orange
];

const BUNTING_COLORS = ['#FF4D8D', '#FFC93C', '#25C9F5', '#38E08A', '#7B5CFF', '#FF8A3D'];

type Shape = {
  id: number;
  kind: 'circle' | 'capsule' | 'squircle' | 'ring' | 'suit';
  suit?: string;
  x: number; y: number; size: number;
  color: { fill: string; edge: string };
  rot: number; dur: number; delay: number;
  dx: number; dy: number;
  depth: number;      // 0 = far (small, faint, slow), 1 = near
};

function buildShapes(variant: Variant): Shape[] {
  const rand = rng(variant === 'menu' ? 20260801 : 77712345);
  const count = variant === 'menu' ? 13 : 9;
  const suits = Object.keys(SUIT_PATHS);
  const kinds: Shape['kind'][] = ['circle', 'capsule', 'squircle', 'ring', 'suit', 'suit'];

  return Array.from({ length: count }, (_, i) => {
    const depth = rand();
    // On the table, keep the middle clear — push objects toward the edges so
    // they never sit behind a card.
    let x = rand() * 100;
    if (variant === 'table') {
      x = rand() < 0.5 ? rand() * 26 : 74 + rand() * 26;
    }
    return {
      id: i,
      kind: kinds[Math.floor(rand() * kinds.length)],
      suit: suits[Math.floor(rand() * suits.length)],
      x,
      y: rand() * 96,
      size: (variant === 'menu' ? 46 : 38) + depth * (variant === 'menu' ? 108 : 74),
      color: SHAPE_COLORS[Math.floor(rand() * SHAPE_COLORS.length)],
      rot: rand() * 360,
      dur: 15 + rand() * 16,
      delay: -rand() * 20,
      dx: (rand() - 0.5) * 60,
      dy: -18 - rand() * 34,
      depth,
    };
  });
}

function ShapeEl({ s, variant }: { s: Shape; variant: Variant }) {
  const base = variant === 'menu' ? 0.2 : 0.13;
  const opacity = base + s.depth * (variant === 'menu' ? 0.24 : 0.13);
  const edge = Math.max(3, Math.round(s.size * 0.07));

  // Flat saturated fill + a light inner top and dark inner bottom. That pairing
  // is what reads as inflated plastic rather than a flat sticker.
  const plastic: React.CSSProperties = {
    background: s.color.fill,
    boxShadow: `inset 0 ${edge}px 0 rgba(255,255,255,.30),
                inset 0 -${edge}px 0 ${s.color.edge}`,
  };

  let inner: React.ReactNode = null;
  if (s.kind === 'circle') {
    inner = <div style={{ ...plastic, width: '100%', height: '100%', borderRadius: '50%' }} />;
  } else if (s.kind === 'capsule') {
    inner = <div style={{ ...plastic, width: '100%', height: '54%', borderRadius: 999, marginTop: '23%' }} />;
  } else if (s.kind === 'squircle') {
    inner = <div style={{ ...plastic, width: '100%', height: '100%', borderRadius: '32%' }} />;
  } else if (s.kind === 'ring') {
    inner = (
      <div style={{
        width: '100%', height: '100%', borderRadius: '50%',
        border: `${edge * 1.6}px solid ${s.color.fill}`,
        boxShadow: `inset 0 0 0 ${Math.round(edge * 0.4)}px ${s.color.edge}55`,
      }} />
    );
  } else {
    inner = (
      <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
        <path d={SUIT_PATHS[s.suit!]} fill={s.color.fill} />
        <path d={SUIT_PATHS[s.suit!]} fill={s.color.edge} opacity=".45"
              transform="translate(0, 0.9)" style={{ mixBlendMode: 'multiply' }} />
      </svg>
    );
  }

  return (
    <div
      className="u-ambient"
      style={{
        position: 'absolute',
        left: `${s.x}%`,
        top: `${s.y}%`,
        width: s.size,
        height: s.size,
        opacity,
        transform: `rotate(${s.rot}deg)`,
        animation: `u-drift ${s.dur}s ease-in-out ${s.delay}s infinite`,
        // @ts-expect-error - custom properties consumed by the keyframes
        '--u-dx': `${s.dx}px`,
        '--u-dy': `${s.dy}px`,
        willChange: 'transform',
      }}
    >
      {inner}
    </div>
  );
}

function Bunting() {
  // Two overlapping strings so the row never looks mechanically even.
  const rows = [
    { y: 0, count: 15, drop: 26, dur: 5.4, opacity: 0.95 },
    { y: 12, count: 13, drop: 20, dur: 6.8, opacity: 0.5 },
  ];
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 90, pointerEvents: 'none' }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ position: 'absolute', top: row.y, left: '-4%', width: '108%', opacity: row.opacity }}>
          {/* the string itself — a shallow arc */}
          <svg viewBox="0 0 100 12" preserveAspectRatio="none"
               style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 22 }}>
            <path d="M0 1 Q 50 11 100 1" fill="none" stroke="rgba(255,255,255,.34)" strokeWidth=".7" />
          </svg>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '0 2%' }}>
            {Array.from({ length: row.count }, (_, i) => {
              const t = i / (row.count - 1);
              const sag = Math.sin(t * Math.PI) * 9;   // follow the string's curve
              return (
                <div
                  key={i}
                  className="u-ambient"
                  style={{
                    width: 0, height: 0,
                    borderLeft: `${row.drop * 0.32}px solid transparent`,
                    borderRight: `${row.drop * 0.32}px solid transparent`,
                    borderTop: `${row.drop}px solid ${BUNTING_COLORS[i % BUNTING_COLORS.length]}`,
                    marginTop: sag,
                    transformOrigin: '50% 0%',
                    animation: `u-sway ${row.dur}s ease-in-out ${(i * 0.13).toFixed(2)}s infinite`,
                    filter: 'drop-shadow(0 2px 0 rgba(52,36,110,.28))',
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Confetti({ count }: { count: number }) {
  const bits = useMemo(() => {
    const rand = rng(99001);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: rand() * 100,
      w: 5 + rand() * 6,
      h: 8 + rand() * 8,
      color: BUNTING_COLORS[Math.floor(rand() * BUNTING_COLORS.length)],
      dur: 9 + rand() * 9,
      delay: -rand() * 18,
      round: rand() > 0.55,
    }));
  }, [count]);

  return (
    <>
      {bits.map(b => (
        <div
          key={b.id}
          className="u-ambient"
          style={{
            position: 'absolute',
            left: `${b.x}%`,
            top: 0,
            width: b.w,
            height: b.round ? b.w : b.h,
            borderRadius: b.round ? '50%' : 2,
            background: b.color,
            opacity: 0,
            animation: `u-confetti-fall ${b.dur}s linear ${b.delay}s infinite`,
            willChange: 'transform',
          }}
        />
      ))}
    </>
  );
}

/** Soft rounded hills along the bottom — the thing that makes a Fall Guys
 *  menu feel like a place rather than a gradient. */
function Hills() {
  return (
    <svg
      viewBox="0 0 400 120"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 190, opacity: .5 }}
    >
      <path d="M0 78 Q 60 40 122 70 T 250 62 T 400 84 L400 120 L0 120Z" fill="#7B5CFF" opacity=".42" />
      <path d="M0 94 Q 80 58 168 88 T 320 80 T 400 98 L400 120 L0 120Z" fill="#5B37B0" opacity=".55" />
      <path d="M0 108 Q 100 84 210 104 T 400 108 L400 120 L0 120Z" fill="#34246E" opacity=".6" />
    </svg>
  );
}

export function UtsavBackground({ variant = 'menu' }: { variant?: Variant }) {
  const shapes = useMemo(() => buildShapes(variant), [variant]);
  const isMenu = variant === 'menu';

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        // The candy gradient. Deep enough at the top that white cards and
        // white text keep their contrast, warm at the bottom so it feels lit.
        background: isMenu
          ? `linear-gradient(178deg,
               #34246E 0%, #4A2C97 18%, #6B39BC 38%,
               #9B48CE 58%, #DE4FA2 80%, #FF7FA8 100%)`
          : `linear-gradient(178deg,
               #2C1F5E 0%, #40287F 22%, #5B37B0 48%,
               #7B3FBE 72%, #A8459F 100%)`,
      }}
    >
      {/* Soft coloured light. Radial-gradients, not blurred elements. */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(58% 42% at 18% 12%, rgba(255,201,60,.20), transparent 70%),
          radial-gradient(52% 40% at 84% 26%, rgba(37,201,245,.20), transparent 70%),
          radial-gradient(64% 46% at 50% 96%, rgba(255,127,168,.26), transparent 72%)`,
      }} />

      {shapes.map(s => <ShapeEl key={s.id} s={s} variant={variant} />)}

      {isMenu && <Hills />}
      {isMenu && <Bunting />}

      {/* Confetti is the first thing to go on a weak device. */}
      <div className="u-tier-high">
        <Confetti count={isMenu ? 22 : 12} />
      </div>

      {/* Vignette. On the table this is what protects card contrast; the
          middle darkens so a white card always has something to sit against. */}
      <div style={{
        position: 'absolute', inset: 0,
        background: isMenu
          ? 'radial-gradient(120% 90% at 50% 40%, transparent 52%, rgba(30,16,60,.42) 100%)'
          : 'radial-gradient(88% 74% at 50% 50%, rgba(24,12,52,.44) 0%, rgba(24,12,52,.16) 46%, rgba(30,16,60,.52) 100%)',
      }} />
    </div>
  );
}
