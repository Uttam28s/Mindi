import { useEffect } from 'react';
import { Trophy, Zap, Star } from 'lucide-react';
import { Sounds } from '../utils/sounds';

interface RoundResultProps {
  winnerTeam: 0 | 1;
  category: 'normal' | 'mendikot' | 'whitewash';
  pointsAwarded: number;
  teamScores: [number, number];
  teamMindis?: [number, number];
  teamTricks?: [number, number];
  onNextRound: () => void;
}

export function RoundResult({ winnerTeam, category, pointsAwarded, teamScores, teamMindis, teamTricks, onNextRound }: RoundResultProps) {
  useEffect(() => {
    if (category === 'mendikot' || category === 'whitewash') Sounds.bigWin();
    else Sounds.trickWin();
  }, [category]);

  const info = {
    normal: { title: 'Round Won!', icon: Trophy, accent: '#d4a843' },
    mendikot: { title: 'MENDIKOT!', icon: Zap, accent: '#a855f7' },
    whitewash: { title: 'WHITEWASH!', icon: Star, accent: '#f59e0b' },
  }[category];
  const Icon = info.icon;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 z-50 animate-fade-in" style={{ background: 'rgba(10,3,3,0.9)', backdropFilter: 'blur(12px)' }}>
      <div className="royal-glass rounded-2xl p-5 max-w-md w-full animate-slide-in-up overflow-y-auto" style={{ boxShadow: `0 0 50px ${info.accent}15`, maxHeight: '90vh' }}>
        <div className="flex justify-center mb-5">
          <div className="w-18 h-18 rounded-2xl flex items-center justify-center" style={{ width: 72, height: 72, background: `${info.accent}12`, border: `1px solid ${info.accent}30` }}>
            <Icon className="w-9 h-9" style={{ color: info.accent, filter: `drop-shadow(0 0 8px ${info.accent})` }} />
          </div>
        </div>

        <h2 className="font-cinzel text-2xl text-center mb-1 tracking-wider" style={{ color: info.accent, textShadow: `0 0 15px ${info.accent}40` }}>{info.title}</h2>
        <p className="text-center text-[10px] mb-5" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {category === 'mendikot' ? 'All Mindis captured!' : category === 'whitewash' ? 'All tricks won!' : 'Majority Mindis captured'}
        </p>

        <div className="rounded-xl p-4 mb-4 text-center" style={{ background: `${info.accent}08`, border: `1px solid ${info.accent}18` }}>
          <div className="text-[9px] tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>WINNER</div>
          <div className="font-cinzel text-xl text-white tracking-wider">Team {winnerTeam === 0 ? 'A' : 'B'}</div>
          <div className="font-rajdhani text-lg" style={{ color: info.accent }}>+{pointsAwarded} pt{pointsAwarded > 1 ? 's' : ''}</div>
        </div>

        {/* Round stats */}
        {(teamMindis || teamTricks) && (
          <div className="rounded-xl p-3 mb-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-[8px] uppercase tracking-widest text-center mb-3" style={{ color: 'rgba(255,255,255,0.2)' }}>Round Stats</div>
            <div className="grid grid-cols-2 gap-2">
              {([0, 1] as const).map(t => {
                const teamColor = t === 0 ? { c: 'rgba(96,165,250', text: '#6fa3d4' } : { c: 'rgba(248,113,113', text: '#d47070' };
                const isWinner = t === winnerTeam;
                return (
                  <div key={t} className="rounded-lg p-2.5" style={{ background: `${teamColor.c},0.06)`, border: `1px solid ${teamColor.c},${isWinner ? '0.25' : '0.1'})` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[8px] uppercase tracking-wider font-bold" style={{ color: teamColor.text }}>Team {t === 0 ? 'A' : 'B'}</span>
                      {isWinner && <span className="text-[7px] px-1.5 py-0.5 rounded-full" style={{ background: `${info.accent}20`, color: info.accent }}>Winner</span>}
                    </div>
                    {teamMindis && (
                      <div className="flex items-center justify-between">
                        <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Mindis</span>
                        <span className="text-sm font-bold text-white">{teamMindis[t]}</span>
                      </div>
                    )}
                    {teamTricks && (
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Haath</span>
                        <span className="text-sm font-bold text-white">{teamTricks[t]}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Game scores */}
        <div className="text-[8px] uppercase tracking-widest text-center mb-2" style={{ color: 'rgba(255,255,255,0.15)' }}>Game Score</div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[0, 1].map(t => (
            <div key={t} className="rounded-lg p-3 text-center" style={{ background: t === 0 ? 'rgba(96,165,250,0.05)' : 'rgba(248,113,113,0.05)', border: `1px solid ${t === 0 ? 'rgba(96,165,250,0.1)' : 'rgba(248,113,113,0.1)'}` }}>
              <div className="text-[8px] uppercase tracking-wider" style={{ color: t === 0 ? 'rgba(96,165,250,0.5)' : 'rgba(248,113,113,0.5)' }}>Team {t === 0 ? 'A' : 'B'}</div>
              <div className="font-cinzel text-xl text-white">{teamScores[t as 0 | 1]}</div>
            </div>
          ))}
        </div>

        <button onClick={() => { Sounds.click(); onNextRound(); }}
          className="w-full rounded-xl p-[1px] transition-all hover:scale-[1.02]"
          style={{ background: `linear-gradient(135deg, ${info.accent}80, ${info.accent}40)` }}>
          <div className="rounded-xl py-3 flex items-center justify-center" style={{ background: '#2a0f0f' }}>
            <span className="font-cinzel tracking-wider text-white">NEXT ROUND</span>
          </div>
        </button>
      </div>
    </div>
  );
}
