import { useEffect, useState, CSSProperties } from 'react';

const AVATARS = ['🦁', '🦅', '🐘', '🦚', '🐅', '🐍', '🦎', '🐎', '🐒', '🦜'];

interface ShufflePlayer {
  name: string;
  teamId: 0 | 1;
  seatIndex: number;
}

interface TeamShuffleAnimationProps {
  players: ShufflePlayer[];
  onComplete: () => void;
}

type Phase = 'pile' | 'flying' | 'glow';

export function TeamShuffleAnimation({ players, onComplete }: TeamShuffleAnimationProps) {
  const [phase, setPhase] = useState<Phase>('pile');
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());

  const teamA = players.filter(p => p.teamId === 0);
  const teamB = players.filter(p => p.teamId === 1);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Stagger each card flying to its column
    players.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setRevealedCards(prev => new Set([...prev, i]));
      }, 800 + i * 150));
    });

    // Glow phase after all cards have flown
    const glowTime = 800 + players.length * 150;
    timers.push(setTimeout(() => setPhase('glow'), glowTime));

    // Trigger completion
    timers.push(setTimeout(() => onComplete(), glowTime + 1100));

    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getCardStyle = (player: ShufflePlayer, index: number, isRevealed: boolean): CSSProperties => {
    if (!isRevealed) {
      // Stacked in center with slight rotation
      const rotation = (index - players.length / 2) * 3.5;
      const yOffset = index * 1.5;
      return {
        position: 'absolute',
        transform: `translateX(0px) translateY(${yOffset}px) rotate(${rotation}deg)`,
        transition: 'transform 650ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease',
        zIndex: players.length - index,
        opacity: 1,
      };
    }

    // Fly to team column
    const isTeamA = player.teamId === 0;
    const teamMembers = isTeamA ? teamA : teamB;
    const posInTeam = teamMembers.findIndex(p => p.seatIndex === player.seatIndex);
    const targetX = isTeamA ? -170 : 170;
    const targetY = -((teamMembers.length - 1) * 24) + posInTeam * 48;

    return {
      position: 'absolute',
      transform: `translateX(${targetX}px) translateY(${targetY}px) rotate(0deg)`,
      transition: 'transform 650ms cubic-bezier(0.22, 1, 0.36, 1)',
      zIndex: players.length - index,
      opacity: 1,
    };
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #1a0505, #2d0a0a, #1e0808)' }}
    >
      {/* Title */}
      <div className="mb-12 text-center animate-fade-in">
        <h1 className="font-cinzel text-2xl tracking-[0.25em] mb-1" style={{ color: '#d4a843' }}>
          FORMING TEAMS
        </h1>
        <div className="h-px w-24 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,168,67,0.4), transparent)' }} />
      </div>

      {/* Arena: columns + center pile */}
      <div className="relative flex items-center justify-center w-full max-w-xl" style={{ height: 280 }}>

        {/* Team A column (left) */}
        <div
          className={`absolute left-4 flex flex-col items-center gap-1 transition-all duration-500 ${phase === 'glow' ? 'animate-glow-blue' : ''}`}
          style={{
            width: 140,
            padding: '10px 8px',
            borderRadius: 12,
            background: phase === 'glow' ? 'rgba(96,165,250,0.08)' : 'rgba(96,165,250,0.03)',
            border: `1px solid ${phase === 'glow' ? 'rgba(96,165,250,0.4)' : 'rgba(96,165,250,0.12)'}`,
            transition: 'background 0.5s, border-color 0.5s',
          }}
        >
          <span
            className="font-cinzel text-[10px] tracking-widest mb-1"
            style={{ color: phase === 'glow' ? 'rgba(96,165,250,0.9)' : 'rgba(96,165,250,0.4)' }}
          >
            TEAM A
          </span>
          <div className="w-8 h-px mb-1" style={{ background: 'rgba(96,165,250,0.2)' }} />
          {/* Placeholder slots */}
          {teamA.map(p => {
            const isLanded = revealedCards.has(players.findIndex(pl => pl.seatIndex === p.seatIndex));
            return (
              <div
                key={p.seatIndex}
                className="w-full flex items-center gap-2 px-2 py-1 rounded-lg transition-all duration-500"
                style={{
                  background: isLanded ? 'rgba(96,165,250,0.1)' : 'rgba(96,165,250,0.02)',
                  border: `1px solid ${isLanded ? 'rgba(96,165,250,0.3)' : 'rgba(96,165,250,0.08)'}`,
                  opacity: isLanded ? 1 : 0.3,
                }}
              >
                <span style={{ fontSize: 14 }}>{isLanded ? AVATARS[p.seatIndex] : '·'}</span>
                <span className="text-xs truncate" style={{ color: isLanded ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)' }}>
                  {isLanded ? p.name : ''}
                </span>
              </div>
            );
          })}
        </div>

        {/* Center card pile */}
        <div className="relative flex items-center justify-center" style={{ width: 120, height: 200 }}>
          {players.map((player, i) => (
            <div key={player.seatIndex} style={getCardStyle(player, i, revealedCards.has(i))}>
              <PlayerCard
                name={player.name}
                seatIndex={player.seatIndex}
                teamId={player.teamId}
                revealed={revealedCards.has(i)}
              />
            </div>
          ))}
        </div>

        {/* Team B column (right) */}
        <div
          className={`absolute right-4 flex flex-col items-center gap-1 transition-all duration-500 ${phase === 'glow' ? 'animate-glow-red' : ''}`}
          style={{
            width: 140,
            padding: '10px 8px',
            borderRadius: 12,
            background: phase === 'glow' ? 'rgba(248,113,113,0.08)' : 'rgba(248,113,113,0.03)',
            border: `1px solid ${phase === 'glow' ? 'rgba(248,113,113,0.4)' : 'rgba(248,113,113,0.12)'}`,
            transition: 'background 0.5s, border-color 0.5s',
          }}
        >
          <span
            className="font-cinzel text-[10px] tracking-widest mb-1"
            style={{ color: phase === 'glow' ? 'rgba(248,113,113,0.9)' : 'rgba(248,113,113,0.4)' }}
          >
            TEAM B
          </span>
          <div className="w-8 h-px mb-1" style={{ background: 'rgba(248,113,113,0.2)' }} />
          {teamB.map(p => {
            const isLanded = revealedCards.has(players.findIndex(pl => pl.seatIndex === p.seatIndex));
            return (
              <div
                key={p.seatIndex}
                className="w-full flex items-center gap-2 px-2 py-1 rounded-lg transition-all duration-500"
                style={{
                  background: isLanded ? 'rgba(248,113,113,0.1)' : 'rgba(248,113,113,0.02)',
                  border: `1px solid ${isLanded ? 'rgba(248,113,113,0.3)' : 'rgba(248,113,113,0.08)'}`,
                  opacity: isLanded ? 1 : 0.3,
                }}
              >
                <span style={{ fontSize: 14 }}>{isLanded ? AVATARS[p.seatIndex] : '·'}</span>
                <span className="text-xs truncate" style={{ color: isLanded ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)' }}>
                  {isLanded ? p.name : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status text */}
      <p className="mt-10 font-cinzel text-xs tracking-widest animate-gold-pulse" style={{ color: 'rgba(212,168,67,0.6)' }}>
        {phase === 'glow' ? 'TEAMS REVEALED' : 'SHUFFLING TEAMS...'}
      </p>
    </div>
  );
}

// ── Inner card component ────────────────────────────────────────────

interface PlayerCardProps {
  name: string;
  seatIndex: number;
  teamId: 0 | 1;
  revealed: boolean;
}

function PlayerCard({ name, seatIndex, teamId, revealed }: PlayerCardProps) {
  const teamColor = teamId === 0 ? '96,165,250' : '248,113,113';

  return (
    <div
      style={{
        width: 96,
        height: 44,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 10px',
        background: revealed
          ? `rgba(${teamColor},0.12)`
          : 'rgba(30,10,10,0.9)',
        border: `1px solid ${revealed ? `rgba(${teamColor},0.5)` : 'rgba(212,168,67,0.15)'}`,
        boxShadow: revealed ? `0 2px 12px rgba(${teamColor},0.25)` : '0 2px 8px rgba(0,0,0,0.5)',
        transition: 'background 0.4s, border-color 0.4s, box-shadow 0.4s',
        overflow: 'hidden',
      }}
    >
      {revealed ? (
        <>
          <span style={{ fontSize: 16, flexShrink: 0 }}>{AVATARS[seatIndex]}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </span>
        </>
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 18, opacity: 0.3 }}>🂠</span>
        </div>
      )}
    </div>
  );
}
