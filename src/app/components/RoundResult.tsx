import { useEffect, useState } from 'react';
import { UtsavBackground } from './UtsavBackground';
import { TEAM } from './table/PlayerSeat';
import { Sounds } from '../utils/sounds';
import { celebrate, shake, haptic } from '../utils/juice';

interface RoundResultProps {
  winnerTeam: 0 | 1;
  category: 'normal' | 'mendikot' | 'whitewash';
  pointsAwarded: number;
  teamScores: [number, number];
  teamMindis?: [number, number];
  teamTricks?: [number, number];
  onNextRound: () => void;
}

const KIND = {
  normal:    { title: 'ROUND WON', sub: 'Majority of the Mindis',  color: '#38E08A', dark: '#17A05C', big: false },
  mendikot:  { title: 'MENDIKOT!', sub: 'All four Mindis captured', color: '#FFC93C', dark: '#C98A00', big: true  },
  whitewash: { title: 'WHITEWASH!', sub: 'Every single trick',      color: '#FF4D8D', dark: '#C41F5E', big: true  },
} as const;

/** Counts up to a value with an overshoot pop — cheap, and it makes a score
 *  change feel earned rather than just appearing. */
function useCountUp(to: number, delay: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now() + delay;
    const dur = 520;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / dur));
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(eased * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay]);
  return n;
}

export function RoundResult({
  winnerTeam, category, pointsAwarded, teamScores, teamMindis, teamTricks, onNextRound,
}: RoundResultProps) {
  const k = KIND[category];

  useEffect(() => {
    if (k.big) {
      Sounds.bigWin();
      shake('lg');
      celebrate();
      haptic([26, 60, 26, 60, 40]);
    } else {
      Sounds.trickWin();
      haptic(20);
    }
  }, [k.big]);

  const scoreA = useCountUp(teamScores[0], 420);
  const scoreB = useCountUp(teamScores[1], 420);
  const shown: [number, number] = [scoreA, scoreB];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ overflow: 'hidden' }}>
      <UtsavBackground variant="menu" />

      <div className="relative z-10 w-full u-anim-pop-in" style={{ maxWidth: 420 }}>
        {/* Banner */}
        <div style={{
          textAlign: 'center', marginBottom: 16,
        }}>
          <div className="u-title" style={{
            fontSize: k.big ? 'clamp(38px,10vw,58px)' : 'clamp(30px,8vw,44px)',
            color: k.color,
            textShadow: `0 3px 0 ${k.dark}, 0 6px 0 rgba(52,36,110,.5), 0 10px 22px rgba(30,16,60,.5)`,
          }}>
            {k.title}
          </div>
          <div className="u-body" style={{ fontSize: 13, color: 'rgba(255,255,255,.72)', marginTop: 2 }}>
            {k.sub}
          </div>
        </div>

        <div className="u-panel" style={{ padding: 18, background: 'rgba(46,26,96,.9)' }}>
          {/* Who won, and what they got */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            padding: '11px 14px', borderRadius: 16, marginBottom: 14,
            background: TEAM[winnerTeam].soft,
            border: `2.5px solid ${TEAM[winnerTeam].key}`,
            boxShadow: `0 4px 0 ${TEAM[winnerTeam].dark}`,
          }}>
            <span className="u-display" style={{ fontSize: 21, color: '#fff' }}>
              Team {TEAM[winnerTeam].label}
            </span>
            <span className="u-anim-breathe" style={{
              padding: '3px 13px', borderRadius: 999,
              background: k.color, color: '#2B1A4A',
              fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 800, fontSize: 16,
              boxShadow: `0 3px 0 ${k.dark}`,
            }}>
              +{pointsAwarded}
            </span>
          </div>

          {/* Round breakdown + running score, side by side per team */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {([0, 1] as const).map(t => {
              const tm = TEAM[t];
              const won = t === winnerTeam;
              return (
                <div key={t} style={{
                  padding: '11px 12px', borderRadius: 16,
                  background: won ? tm.soft : 'rgba(255,255,255,.05)',
                  border: `2px solid ${won ? tm.key : 'rgba(255,255,255,.12)'}`,
                }}>
                  <div className="u-display" style={{ fontSize: 13, color: tm.key, marginBottom: 6 }}>
                    TEAM {tm.label}
                  </div>
                  <div style={{
                    fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 800,
                    fontSize: 34, lineHeight: 1, color: '#fff',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {shown[t]}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 7 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
                      <b style={{ color: '#FFC93C' }}>{teamMindis?.[t] ?? 0}</b> mindi
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
                      <b style={{ color: '#fff' }}>{teamTricks?.[t] ?? 0}</b> tricks
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="u-btn u-btn--marigold"
            style={{ width: '100%', marginTop: 16, fontSize: 17 }}
            onClick={() => { Sounds.click(); haptic(12); onNextRound(); }}
          >
            <span style={{ position: 'relative', zIndex: 1 }}>Next round</span>
          </button>
        </div>
      </div>
    </div>
  );
}
