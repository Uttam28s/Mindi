import { TrickEntry, Suit } from '../types';
import { Card } from './Card';

const AVATARS = ['🦁', '🦅', '🐘', '🦚', '🐅', '🐍', '🦎', '🐎', '🐒', '🦜'];

const TEAM_COLORS = [
  { bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.4)', glow: 'rgba(96,165,250,0.15)' },
  { bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.4)', glow: 'rgba(248,113,113,0.15)' },
];

interface TrickAreaProps {
  currentTrick: { cards: TrickEntry[]; ledSuit: Suit | null };
  playerCount: number;
  currentTurnIndex: number;
  playerNames?: string[];
  playerTeams?: number[];
  size?: number;
}

export function TrickArea({ currentTrick, playerCount, currentTurnIndex, playerNames, playerTeams, size = 400 }: TrickAreaProps) {
  const r = size / 380; // scale ratio relative to original 380 design
  const radius      = Math.round(90  * r); // card placement radius
  const ringSize    = Math.round(280 * r); // outer decorative ring
  const feltSize    = Math.round(180 * r); // inner felt circle
  const avatarDist  = Math.round(162 * r); // seat indicator distance from center

  const getPos = (seat: number, dist: number) => {
    const angle = (360 / playerCount) * seat - 90;
    const rad = (angle * Math.PI) / 180;
    return { x: Math.cos(rad) * dist, y: Math.sin(rad) * dist };
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer ring */}
      <div className="absolute rounded-full" style={{
        width: ringSize, height: ringSize,
        left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        border: '1px solid rgba(212,168,67,0.06)',
        background: 'radial-gradient(circle, rgba(212,168,67,0.02) 0%, transparent 70%)',
      }} />

      {/* Inner felt */}
      <div className="absolute rounded-full flex items-center justify-center" style={{
        width: feltSize, height: feltSize,
        left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle at 40% 35%, rgba(212,168,67,0.04), rgba(30,8,8,0.4))',
        border: '1px solid rgba(212,168,67,0.08)',
        boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.3)',
      }}>
        {currentTrick.cards.length === 0 && (
          <span className="text-[10px] tracking-wider" style={{ color: 'rgba(212,168,67,0.2)' }}>PLAY</span>
        )}
      </div>

      {/* Played cards */}
      {currentTrick.cards.map((entry, i) => {
        const pos = getPos(entry.seatIndex, radius);
        const isLatest = i === currentTrick.cards.length - 1;
        return (
          <div key={`${entry.seatIndex}-${entry.card.id}`}
            className="absolute transition-all duration-300 ease-out"
            style={{ left: '50%', top: '50%', transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`, zIndex: 10 + i }}>
            <div style={{ filter: isLatest ? 'drop-shadow(0 0 8px rgba(212,168,67,0.3))' : undefined }}>
              <Card card={entry.card} faceUp={true} size="md" />
            </div>
          </div>
        );
      })}

      {/* Seat indicators with avatars */}
      {[...Array(playerCount)].map((_, i) => {
        const pos = getPos(i, avatarDist);
        const isCurrent = i === currentTurnIndex;
        const hasPlayed = currentTrick.cards.some(e => e.seatIndex === i);
        return (
          <div key={`seat-${i}`} className="absolute" style={{
            left: '50%', top: '50%',
            transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`, zIndex: 5,
          }}>
            <div className="flex flex-col items-center gap-0.5">
              <div className="relative">
                {/* Expanding outer ring */}
                {isCurrent && (
                  <div className="absolute animate-turn-outer pointer-events-none"
                    style={{ inset: -4 }} />
                )}
                {/* Avatar circle */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base transition-all duration-300 ${isCurrent ? 'animate-turn-ring' : ''}`}
                  style={(() => {
                    const team = playerTeams?.[i];
                    const tc = team !== undefined ? TEAM_COLORS[team] : null;
                    return {
                      background: isCurrent ? 'rgba(212,168,67,0.2)' : tc ? tc.bg : 'rgba(255,255,255,0.03)',
                      border: `2px solid ${isCurrent ? 'rgba(212,168,67,0.8)' : tc ? tc.border : 'rgba(255,255,255,0.06)'}`,
                    };
                  })()}>
                  {AVATARS[i]}
                </div>
              </div>
              <span className="text-[8px] font-bold" style={{
                color: isCurrent ? '#d4a843' : hasPlayed ? 'rgba(34,197,94,0.6)' : 'rgba(255,255,255,0.2)',
                textShadow: isCurrent ? '0 0 6px rgba(212,168,67,0.5)' : 'none',
              }}>
                {playerNames?.[i]?.slice(0, 5) || `P${i + 1}`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
