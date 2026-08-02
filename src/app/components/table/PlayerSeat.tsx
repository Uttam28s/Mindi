import { Crown } from 'lucide-react';

export const AVATARS = ['🦁', '🦅', '🐘', '🦚', '🐅', '🐍', '🦎', '🐎', '🐒', '🦜'];

export const TEAM = [
  { key: '#25C9F5', dark: '#0B87AC', soft: 'rgba(37,201,245,.18)', label: 'A' },
  { key: '#FF6B8A', dark: '#C2334F', soft: 'rgba(255,107,138,.18)', label: 'B' },
] as const;

export interface SeatProps {
  seatIndex: number;
  name: string;
  teamId: 0 | 1;
  tricks: number;
  size: number;
  isTurn: boolean;
  isMe: boolean;
  isDealer: boolean;
  hasPlayed: boolean;
  isWinner: boolean;
  /** Tour dimming — everything that isn't the highlighted seat drops back. */
  dimmed?: boolean;
  highlighted?: boolean;
}

/**
 * A seat at the table.
 *
 * State has to be readable at a glance and from the corner of your eye, so each
 * one is carried by a different channel rather than all by colour:
 *   whose turn  -> a pulsing marigold ring and a lift
 *   has played  -> the avatar desaturates and a tick appears
 *   team        -> the border colour and the plate tint
 *   won the trick -> a crown drops in and the whole seat pops
 */
export function PlayerSeat({
  seatIndex, name, teamId, tricks, size, isTurn, isMe, isDealer,
  hasPlayed, isWinner, dimmed, highlighted,
}: SeatProps) {
  const t = TEAM[teamId];
  const ring = isWinner ? '#FFC93C' : isTurn ? '#FFC93C' : t.key;
  const ringDark = isWinner ? '#C98A00' : isTurn ? '#C98A00' : t.dark;

  return (
    <div
      data-seat={seatIndex}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        opacity: dimmed ? 0.3 : 1,
        filter: dimmed ? 'saturate(.4)' : undefined,
        transform: `scale(${isWinner ? 1.14 : isTurn ? 1.06 : 1})`,
        transition: 'transform .34s cubic-bezier(.34,1.56,.64,1), opacity .3s ease',
        pointerEvents: 'none',
      }}
    >
      <div style={{ position: 'relative' }}>
        {/* Turn pulse — an expanding ring, so it reads in peripheral vision. */}
        {isTurn && !isWinner && (
          <span className="u-ambient" style={{
            position: 'absolute', inset: -5, borderRadius: '50%',
            border: '2.5px solid rgba(255,201,60,.85)',
            animation: 'u-turn-ping 1.5s ease-out infinite',
          }} />
        )}

        {/* Avatar disc */}
        <div style={{
          width: size, height: size, borderRadius: '50%',
          display: 'grid', placeItems: 'center',
          fontSize: Math.round(size * 0.46),
          background: isWinner
            ? 'linear-gradient(168deg,#FFE9A8,#FFC93C)'
            : isTurn
              ? 'linear-gradient(168deg,#FFF0C0,#FFD75E)'
              : `linear-gradient(168deg, ${t.soft}, rgba(30,16,60,.72))`,
          border: `3px solid ${ring}`,
          boxShadow: `0 4px 0 ${ringDark}, 0 8px 16px rgba(18,8,44,.5),
                      inset 0 2px 0 rgba(255,255,255,.4)`,
          filter: hasPlayed && !isTurn && !isWinner ? 'saturate(.55) brightness(.9)' : undefined,
          transition: 'all .28s cubic-bezier(.34,1.56,.64,1)',
        }}>
          <span style={{ transform: 'translateY(1px)' }}>{AVATARS[seatIndex % AVATARS.length]}</span>
        </div>

        {/* Played tick */}
        {hasPlayed && !isWinner && (
          <span className="u-anim-pop-in" style={{
            position: 'absolute', right: -3, bottom: -1,
            width: 19, height: 19, borderRadius: '50%',
            background: '#38E08A', border: '2px solid #17A05C',
            display: 'grid', placeItems: 'center',
            fontSize: 11, color: '#04351D', fontWeight: 900, lineHeight: 1,
          }}>✓</span>
        )}

        {/* Trick crown */}
        {isWinner && (
          <span className="u-anim-drop-in" style={{
            position: 'absolute', left: '50%', top: -Math.round(size * 0.44),
            transform: 'translateX(-50%)',
          }}>
            <Crown style={{ width: 22, height: 22, color: '#FFC93C',
                            filter: 'drop-shadow(0 2px 0 #C98A00)' }} />
          </span>
        )}

        {/* Dealer chip */}
        {isDealer && !isWinner && (
          <span style={{
            position: 'absolute', left: -5, bottom: -2,
            width: 17, height: 17, borderRadius: '50%',
            background: '#fff', border: '2px solid #7B5CFF',
            display: 'grid', placeItems: 'center',
            fontSize: 9, fontWeight: 900, color: '#4B32C0', lineHeight: 1,
          }}>D</span>
        )}

        {highlighted && (
          <span style={{
            position: 'absolute', inset: -8, borderRadius: '50%',
            border: '3px solid #FFC93C', animation: 'u-turn-pulse 1.2s ease-in-out infinite',
          }} />
        )}
      </div>

      {/* Name plate */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '2px 8px 3px', borderRadius: 999,
        background: isTurn ? 'rgba(255,201,60,.92)' : 'rgba(20,10,44,.78)',
        border: `1.5px solid ${isTurn ? '#C98A00' : 'rgba(255,255,255,.16)'}`,
        maxWidth: size * 2.1,
      }}>
        <span style={{
          fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 700,
          fontSize: Math.max(10, Math.round(size * 0.21)),
          color: isTurn ? '#3B2200' : '#fff',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          lineHeight: 1.3,
        }}>
          {isMe ? 'You' : name}
        </span>
        <span style={{
          fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 800,
          fontSize: Math.max(9, Math.round(size * 0.19)),
          color: isTurn ? '#7A4A00' : t.key,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {tricks}
        </span>
      </div>
    </div>
  );
}
