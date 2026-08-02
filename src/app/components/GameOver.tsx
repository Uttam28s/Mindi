import { useEffect } from 'react';
import { Home, RotateCcw, Crown } from 'lucide-react';
import { UtsavBackground } from './UtsavBackground';
import { AVATARS, TEAM } from './table/PlayerSeat';
import { Sounds } from '../utils/sounds';
import { celebrate, shake, haptic } from '../utils/juice';

interface GameOverProps {
  winnerTeam: 0 | 1;
  finalScores: [number, number];
  targetPoints: number;
  players: { name: string; teamId: 0 | 1 }[];
  teamMindis: [number, number];
  teamTricks: [number, number];
  onPlayAgain: () => void;
  onHome: () => void;
}

export function GameOver({
  winnerTeam, finalScores, targetPoints, players, teamMindis, teamTricks,
  onPlayAgain, onHome,
}: GameOverProps) {
  useEffect(() => {
    Sounds.bigWin();
    shake('lg');
    celebrate();
    haptic([30, 70, 30, 70, 50]);
    // A second wave, so the moment has a shape rather than one burst.
    const t = window.setTimeout(celebrate, 900);
    return () => window.clearTimeout(t);
  }, []);

  const win = TEAM[winnerTeam];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ overflow: 'hidden' }}>
      <UtsavBackground variant="menu" />

      <div className="relative z-10 w-full u-anim-pop-in" style={{ maxWidth: 430 }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div className="u-anim-breathe" style={{
            width: 74, height: 74, margin: '0 auto 10px', borderRadius: '50%',
            display: 'grid', placeItems: 'center',
            background: 'linear-gradient(168deg,#FFF0C0,#FFC93C)',
            border: '4px solid #fff',
            boxShadow: '0 6px 0 #C98A00, 0 12px 26px rgba(18,8,44,.55)',
          }}>
            <Crown style={{ width: 36, height: 36, color: '#7A4A00' }} />
          </div>
          <div className="u-title" style={{ fontSize: 'clamp(34px,9vw,52px)' }}>
            TEAM {win.label} WINS
          </div>
          <div className="u-body" style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>
            First to {targetPoints} points
          </div>
        </div>

        <div className="u-panel" style={{ padding: 18, background: 'rgba(46,26,96,.92)' }}>
          {/* Final score */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {([0, 1] as const).map(t => {
              const tm = TEAM[t];
              const won = t === winnerTeam;
              return (
                <div key={t} style={{
                  padding: '12px 12px 13px', borderRadius: 16, textAlign: 'center',
                  background: won ? tm.soft : 'rgba(255,255,255,.05)',
                  border: `2.5px solid ${won ? tm.key : 'rgba(255,255,255,.12)'}`,
                  boxShadow: won ? `0 4px 0 ${tm.dark}` : undefined,
                }}>
                  <div className="u-display" style={{ fontSize: 12.5, color: tm.key }}>TEAM {tm.label}</div>
                  <div style={{
                    fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 800,
                    fontSize: 40, lineHeight: 1.05, color: '#fff', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {finalScores[t]}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 9, marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
                      <b style={{ color: '#FFC93C' }}>{teamMindis[t]}</b> mindi
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
                      <b style={{ color: '#fff' }}>{teamTricks[t]}</b> tricks
                    </span>
                  </div>

                  {/* Who was on it */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginTop: 9 }}>
                    {players.map((p, i) => p.teamId === t && (
                      <span key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '2px 7px 3px', borderRadius: 999,
                        background: 'rgba(255,255,255,.12)',
                        fontSize: 10.5, color: '#fff', fontWeight: 600,
                        maxWidth: 92, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      }}>
                        <span style={{ fontSize: 11 }}>{AVATARS[i % AVATARS.length]}</span>
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="u-btn" style={{ flex: 1 }}
              onClick={() => { Sounds.click(); haptic(12); onPlayAgain(); }}>
              <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center' }}>
                <RotateCcw style={{ width: 16, height: 16 }} /> Play again
              </span>
            </button>
            <button className="u-btn u-btn--jamun" style={{ flex: '0 0 auto', paddingInline: 18 }}
              onClick={() => { Sounds.click(); haptic(12); onHome(); }}>
              <span style={{ position: 'relative', zIndex: 1, display: 'grid', placeItems: 'center' }}>
                <Home style={{ width: 17, height: 17 }} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
