import { useEffect, useState } from 'react';
import { UtsavBackground } from './UtsavBackground';
import { AVATARS, TEAM } from './table/PlayerSeat';
import { Sounds } from '../utils/sounds';
import { burst, haptic } from '../utils/juice';

interface ShufflePlayer {
  name: string;
  teamId: 0 | 1;
  seatIndex: number;
}

interface Props {
  players: ShufflePlayer[];
  onComplete: () => void;
}

/**
 * Team reveal.
 *
 * The old version was two faint outlined columns that filled in with text rows.
 * This treats it as the moment it actually is: players are dealt into two
 * camps, one at a time, each landing with a pop and a sound, and the two panels
 * square off across a VS badge.
 */
export function TeamShuffleAnimation({ players, onComplete }: Props) {
  const [landed, setLanded] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);

  const teams: [ShufflePlayer[], ShufflePlayer[]] = [
    players.filter(p => p.teamId === 0),
    players.filter(p => p.teamId === 1),
  ];

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const START = 620;
    const STEP = 210;

    players.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setLanded(prev => new Set(prev).add(i));
        Sounds.deal();
        haptic(10);
      }, START + i * STEP));
    });

    const end = START + players.length * STEP;
    timers.push(setTimeout(() => {
      setDone(true);
      Sounds.dealComplete();
      burst(window.innerWidth / 2, window.innerHeight * 0.42, false);
    }, end));
    timers.push(setTimeout(onComplete, end + 1250));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panel = (teamId: 0 | 1) => {
    const t = TEAM[teamId];
    const list = teams[teamId];
    return (
      <div
        className="u-anim-drop-in"
        style={{
          animationDelay: `${teamId * 110}ms`,
          flex: 1, minWidth: 0, maxWidth: 260,
          display: 'flex', flexDirection: 'column', gap: 8,
          padding: '14px 12px 16px',
          borderRadius: 22,
          background: `linear-gradient(178deg, ${t.soft}, rgba(20,10,44,.5))`,
          border: `3px solid ${t.key}`,
          boxShadow: done
            ? `0 6px 0 ${t.dark}, 0 0 30px ${t.key}66, inset 0 2px 0 rgba(255,255,255,.24)`
            : `0 6px 0 ${t.dark}, inset 0 2px 0 rgba(255,255,255,.18)`,
          transition: 'box-shadow .5s ease',
        }}
      >
        <div style={{
          alignSelf: 'center', padding: '3px 16px', borderRadius: 999,
          background: t.key, boxShadow: `0 3px 0 ${t.dark}`,
        }}>
          <span className="u-display" style={{ fontSize: 15, color: teamId === 0 ? '#04313F' : '#fff' }}>
            TEAM {t.label}
          </span>
        </div>

        {list.map(p => {
          const idx = players.findIndex(x => x.seatIndex === p.seatIndex);
          const isIn = landed.has(idx);
          return (
            <div
              key={p.seatIndex}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 10px', borderRadius: 14,
                background: isIn ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.04)',
                border: `2px solid ${isIn ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.08)'}`,
                opacity: isIn ? 1 : 0.25,
                transform: isIn ? 'scale(1)' : 'scale(.82)',
                transition: 'all .42s cubic-bezier(.34,1.56,.64,1)',
              }}
            >
              <span style={{
                width: 32, height: 32, borderRadius: '50%', flex: 'none',
                display: 'grid', placeItems: 'center', fontSize: 17,
                background: isIn ? `linear-gradient(168deg, rgba(255,255,255,.3), ${t.soft})` : 'rgba(255,255,255,.06)',
                border: `2px solid ${isIn ? t.key : 'rgba(255,255,255,.12)'}`,
              }}>
                {isIn ? AVATARS[p.seatIndex % AVATARS.length] : '?'}
              </span>
              <span className="u-body" style={{
                fontSize: 14, color: '#fff', whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {isIn ? p.name : '···'}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ overflow: 'hidden' }}>
      <UtsavBackground variant="menu" />

      <div className="relative z-10 w-full flex flex-col items-center px-4" style={{ maxWidth: 620 }}>
        <div className="u-title u-anim-pop-in" style={{ fontSize: 'clamp(30px,8vw,46px)', marginBottom: 6 }}>
          {done ? 'TEAMS SET' : 'FORMING TEAMS'}
        </div>
        <div className="u-body u-anim-pop-in" style={{
          fontSize: 12.5, color: 'rgba(255,255,255,.62)', letterSpacing: '.08em', marginBottom: 22,
        }}>
          {done ? 'PARTNERS SIT OPPOSITE' : 'DEALING PLAYERS'}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%', justifyContent: 'center' }}>
          {panel(0)}

          <div className="u-anim-breathe" style={{
            alignSelf: 'center', flex: 'none',
            width: 50, height: 50, borderRadius: '50%',
            display: 'grid', placeItems: 'center',
            background: 'linear-gradient(168deg,#FFE9A8,#FFC93C)',
            border: '3px solid #fff',
            boxShadow: '0 4px 0 #C98A00, 0 8px 18px rgba(18,8,44,.5)',
          }}>
            <span className="u-display" style={{ fontSize: 17, color: '#7A4A00' }}>VS</span>
          </div>

          {panel(1)}
        </div>
      </div>
    </div>
  );
}
