import { Card as CardType } from '../types';

interface CardProps {
  card: CardType;
  faceUp?: boolean;
  selected?: boolean;
  playable?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  glowColor?: string;
  dealDelay?: number;
}

const suitColors: Record<string, { main: string; accent: string }> = {
  hearts:   { main: '#c0181a', accent: 'rgba(192,24,26,0.15)' },
  diamonds: { main: '#c2410c', accent: 'rgba(194,65,12,0.15)' },
  spades:   { main: '#1a1a2e', accent: 'rgba(26,26,46,0.1)'   },
  clubs:    { main: '#14532d', accent: 'rgba(20,83,45,0.1)'   },
};

// ── SVG Suit Icons ────────────────────────────────────────────────────────────
// Paths extracted from vecteezy_card-suits-icon-set-with-gold-border_8312600.svg
// Each suit is isolated via viewBox from the 4000×4000 source canvas.

function SuitIcon({ suit, size, color, style }: {
  suit: string; size: number; color: string; style?: { filter?: string };
}) {
  switch (suit) {
    case 'hearts':
      // Top-left quadrant of source: x 235–2066, y 264–1809
      return (
        <svg width={size} height={size} viewBox="235 264 1832 1545" style={style}>
          <path fill={color} d="M 1893.53125 409.800781 C 1799.539062 315.828125 1674.589844 264.078125 1541.691406 264.078125 C 1408.789062 264.078125 1283.839844 315.828125 1189.851562 409.800781 L 1150.71875 448.929688 L 1111.601562 409.800781 C 1017.628906 315.828125 892.65625 264.078125 759.753906 264.078125 C 626.855469 264.078125 501.90625 315.828125 407.941406 409.800781 C 277.855469 539.878906 234.988281 724.621094 279.332031 890.710938 C 288.183594 923.828125 300.480469 956.230469 316.273438 987.300781 C 339.390625 1032.820312 369.9375 1075.46875 407.941406 1113.480469 L 1069.570312 1775.140625 C 1091.269531 1796.800781 1120.070312 1808.738281 1150.71875 1808.738281 C 1181.378906 1808.738281 1210.199219 1796.800781 1231.871094 1775.140625 L 1893.53125 1113.480469 C 1931.539062 1075.46875 1962.078125 1032.820312 1985.199219 987.300781 C 2000.988281 956.230469 2013.289062 923.828125 2022.140625 890.710938 C 2066.460938 724.621094 2023.589844 539.878906 1893.53125 409.800781 Z" />
        </svg>
      );
    case 'diamonds':
      // Bottom-right quadrant of source: x 2397–3616, y 2285–3644
      return (
        <svg width={size} height={size} viewBox="2395 2283 1222 1363" style={style}>
          <path fill={color} d="M 3003.78125 3643.539062 L 2398.980469 2968.339844 C 2397.441406 2966.621094 2397.441406 2964.011719 2398.980469 2962.28125 L 3003.78125 2287.089844 C 3005.578125 2285.070312 3008.738281 2285.070312 3010.539062 2287.089844 L 3615.339844 2962.28125 C 3616.878906 2964.011719 3616.878906 2966.621094 3615.339844 2968.339844 L 3010.539062 3643.539062 C 3008.738281 3645.550781 3005.578125 3645.550781 3003.78125 3643.539062 Z" />
        </svg>
      );
    case 'spades':
      // Bottom-left quadrant of source: x 426–1875, y 2301–3619
      return (
        <svg width={size} height={size} viewBox="426 2301 1450 1318" style={style}>
          <path fill={color} d="M 1740.640625 2889.25 L 1637.46875 2786.089844 L 1154.980469 2303.589844 C 1152.691406 2301.308594 1148.980469 2301.308594 1146.691406 2303.589844 L 664.199219 2786.089844 L 561.03125 2889.25 C 426.652344 3023.628906 426.652344 3241.511719 561.03125 3375.890625 C 695.414062 3510.269531 913.289062 3510.269531 1047.671875 3375.890625 L 1094.949219 3328.609375 C 1102.019531 3321.539062 1113.488281 3329.859375 1109 3338.789062 C 1063.648438 3428.960938 1024.761719 3521.089844 951.679688 3610.058594 C 948.507812 3613.910156 950.074219 3618.71875 954.597656 3618.71875 C 1085.421875 3618.71875 1216.25 3618.71875 1347.078125 3618.71875 C 1351.601562 3618.71875 1353.160156 3613.921875 1349.988281 3610.058594 C 1276.910156 3521.089844 1238.019531 3428.960938 1192.671875 3338.789062 C 1188.179688 3329.859375 1199.648438 3321.539062 1206.71875 3328.609375 L 1254 3375.890625 C 1388.378906 3510.269531 1606.261719 3510.269531 1740.640625 3375.890625 C 1875.019531 3241.511719 1875.019531 3023.628906 1740.640625 2889.25 Z" />
        </svg>
      );
    case 'clubs':
      // Top-right quadrant of source: x 2378–3636, y 367–1704
      return (
        <svg width={size} height={size} viewBox="2378 367 1258 1338" style={style}>
          <path fill={color} d="M 3631.53125 1220.101562 C 3629.28125 1052.628906 3493.179688 915.589844 3325.71875 912.25 C 3285.160156 911.441406 3246.328125 918.378906 3210.578125 931.679688 C 3206.019531 933.371094 3202.621094 927.460938 3206.371094 924.351562 C 3274.460938 867.859375 3318.171875 782.988281 3319.339844 687.871094 C 3321.429688 516.5 3182.96875 374.199219 3011.609375 371.808594 C 2837.148438 369.378906 2694.960938 510.078125 2694.960938 683.980469 C 2694.960938 780.710938 2738.949219 867.140625 2808.019531 924.410156 C 2811.75 927.5 2808.308594 933.378906 2803.78125 931.691406 C 2768.03125 918.390625 2729.179688 911.449219 2688.621094 912.25 C 2521.160156 915.578125 2385.050781 1052.601562 2382.789062 1220.058594 C 2380.429688 1394.46875 2521.089844 1536.589844 2694.960938 1536.589844 C 2793.578125 1536.589844 2881.5 1490.851562 2938.699219 1419.429688 C 2944.019531 1412.789062 2954.679688 1417.769531 2952.921875 1426.089844 C 2936.480469 1504.140625 2904.78125 1579.050781 2858.730469 1646.160156 C 2848.140625 1661.601562 2836.691406 1676.96875 2824.148438 1692.238281 C 2821.230469 1695.78125 2822.671875 1700.199219 2826.828125 1700.199219 C 2947.050781 1700.199219 3067.269531 1700.199219 3187.488281 1700.199219 C 3191.640625 1700.199219 3193.078125 1695.789062 3190.171875 1692.238281 C 3177.628906 1676.96875 3166.179688 1661.601562 3155.589844 1646.160156 C 3109.539062 1579.050781 3077.839844 1504.128906 3061.390625 1426.089844 C 3059.640625 1417.769531 3070.300781 1412.789062 3075.621094 1419.429688 C 3132.808594 1490.851562 3220.730469 1536.589844 3319.359375 1536.589844 C 3493.210938 1536.589844 3633.871094 1394.488281 3631.53125 1220.101562 Z" />
        </svg>
      );
    default:
      return null;
  }
}

const isFace = (rank: string) => ['J', 'Q', 'K'].includes(rank);

const faceEmoji: Record<string, Record<string, string>> = {
  J: { hearts: '🤴', diamonds: '🤴', spades: '🗡️', clubs: '🗡️' },
  Q: { hearts: '👸', diamonds: '👸', spades: '👑', clubs: '👑' },
  K: { hearts: '🤴', diamonds: '🤴', spades: '⚔️', clubs: '⚔️' },
};

// ── Card component ────────────────────────────────────────────────────────────

export function Card({ card, faceUp = true, selected = false, playable = true, onClick, size = 'md', glowColor, dealDelay }: CardProps) {
  const d = {
    sm: { w: 64,  h: 90,  rank: 13, corner: 9,  pip: 9,  center: 22 },
    md: { w: 84,  h: 118, rank: 16, corner: 11, pip: 13, center: 28 },
    lg: { w: 110, h: 154, rank: 20, corner: 14, pip: 16, center: 36 },
  }[size];

  const sc = suitColors[card.suit];
  const isMindi = card.rank === '10';

  // ── Card back ──────────────────────────────────────────────────────────────
  if (!faceUp) {
    return (
      <div onClick={onClick} style={{ width: d.w, height: d.h }} className="cursor-pointer transition-transform duration-200 hover:scale-105">
        <div className="w-full h-full rounded-lg relative overflow-hidden" style={{
          background: 'linear-gradient(145deg, #3b0a0a 0%, #5c1a1a 40%, #4a1010 100%)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
          border: '1px solid rgba(212,168,67,0.25)',
        }}>
          <div className="absolute inset-[3px] rounded-md" style={{ border: '1px solid rgba(212,168,67,0.2)' }}>
            <div className="absolute inset-[3px] rounded" style={{ border: '1px solid rgba(212,168,67,0.1)' }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="w-5 h-5 rotate-45" style={{ border: '1.5px solid rgba(212,168,67,0.4)' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rotate-45" style={{ border: '1px solid rgba(212,168,67,0.25)', background: 'rgba(212,168,67,0.08)' }} />
              </div>
            </div>
          </div>
          <div className="absolute top-2 left-2 w-1 h-1 rounded-full" style={{ background: 'rgba(212,168,67,0.4)' }} />
          <div className="absolute bottom-2 right-2 w-1 h-1 rounded-full" style={{ background: 'rgba(212,168,67,0.4)' }} />
        </div>
      </div>
    );
  }

  const face = isFace(card.rank);

  return (
    <div
      onClick={playable ? onClick : undefined}
      style={{
        width: d.w,
        height: d.h,
        cursor: playable ? 'pointer' : 'default',
        transform: selected ? 'translateY(-20px) scale(1.08)' : undefined,
        transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        filter: !playable ? 'brightness(0.45) saturate(0.3) grayscale(0.3)' : undefined,
        animationDelay: dealDelay ? `${dealDelay}ms` : undefined,
      }}
      className={`group relative ${dealDelay != null ? 'animate-card-deal' : ''} ${playable ? 'hover:-translate-y-2 hover:scale-105' : ''}`}
    >
      {/* Glow for playable */}
      {playable && glowColor && (
        <div className="absolute -inset-2 rounded-xl opacity-40 animate-gold-pulse" style={{ background: glowColor, filter: 'blur(10px)', zIndex: -1 }} />
      )}

      {/* Card face */}
      <div className="absolute inset-0 rounded-lg overflow-hidden" style={{
        background: isMindi
          ? 'linear-gradient(170deg, #fffdf5 0%, #fef3c7 30%, #fde68a 100%)'
          : 'linear-gradient(170deg, #fffef8 0%, #faf8f0 40%, #f5f0e4 100%)',
        boxShadow: selected
          ? '0 10px 35px rgba(0,0,0,0.5), 0 0 20px rgba(212,168,67,0.4)'
          : '0 2px 6px rgba(0,0,0,0.2), 0 6px 20px rgba(0,0,0,0.12)',
        border: selected ? '2px solid rgba(212,168,67,0.7)' : isMindi ? '1.5px solid rgba(212,168,67,0.4)' : '1px solid rgba(0,0,0,0.08)',
      }}>
        {/* Corner filigree */}
        <div className="absolute top-[1px] left-[1px] w-4 h-4 pointer-events-none" style={{
          borderTop: '1px solid rgba(212,168,67,0.2)', borderLeft: '1px solid rgba(212,168,67,0.2)', borderTopLeftRadius: 6,
        }} />
        <div className="absolute bottom-[1px] right-[1px] w-4 h-4 pointer-events-none" style={{
          borderBottom: '1px solid rgba(212,168,67,0.2)', borderRight: '1px solid rgba(212,168,67,0.2)', borderBottomRightRadius: 6,
        }} />

        {/* Top-left corner: rank + suit icon */}
        <div className="absolute top-[3px] left-[4px] flex flex-col items-center leading-none select-none" style={{ gap: 1 }}>
          <span style={{ fontSize: d.rank, color: sc.main, fontWeight: 800, lineHeight: 1, fontFamily: "'Cinzel', serif" }}>
            {card.rank}
          </span>
          <SuitIcon suit={card.suit} size={d.corner} color={sc.main} />
        </div>

        {/* Bottom-right corner: rotated rank + suit icon */}
        <div className="absolute bottom-[3px] right-[4px] flex flex-col items-center leading-none select-none rotate-180" style={{ gap: 1 }}>
          <span style={{ fontSize: d.rank, color: sc.main, fontWeight: 800, lineHeight: 1, fontFamily: "'Cinzel', serif" }}>
            {card.rank}
          </span>
          <SuitIcon suit={card.suit} size={d.corner} color={sc.main} />
        </div>

        {/* Center area: pips, face, or ace */}
        <div className="absolute inset-0 pointer-events-none">
          {card.rank === 'A' ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <SuitIcon
                suit={card.suit}
                size={Math.round(d.center * 1.5)}
                color={sc.main}
                style={{ filter: `drop-shadow(0 1px 3px ${sc.accent})` }}
              />
            </div>
          ) : face ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span style={{ fontSize: d.center * 0.85 }}>{faceEmoji[card.rank]?.[card.suit] || '👤'}</span>
              <span style={{ fontSize: d.center * 0.5, color: sc.main, fontFamily: "'Cinzel', serif", fontWeight: 700, lineHeight: 1, marginTop: 2 }}>
                {card.rank}
              </span>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <SuitIcon
                suit={card.suit}
                size={Math.round(d.center * 1.1)}
                color={sc.main}
                style={{ filter: `drop-shadow(0 1px 3px ${sc.accent})` }}
              />
            </div>
          )}
        </div>

        {/* Mindi shimmer */}
        {isMindi && (
          <div className="absolute inset-0 rounded-lg pointer-events-none" style={{
            background: 'linear-gradient(135deg, transparent 30%, rgba(212,168,67,0.1) 50%, transparent 70%)',
          }} />
        )}

        {/* Selected border */}
        {selected && (
          <div className="absolute inset-0 rounded-lg pointer-events-none animate-border-glow-gold" style={{
            border: '2px solid rgba(212,168,67,0.7)',
            boxShadow: 'inset 0 0 12px rgba(212,168,67,0.15)',
          }} />
        )}
      </div>
    </div>
  );
}
