import { useMemo, useEffect } from 'react';
import { Trophy, Home, RotateCcw } from 'lucide-react';
import { Sounds } from '../utils/sounds';

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

export function GameOver({ winnerTeam, finalScores, targetPoints, players, teamMindis, teamTricks, onPlayAgain, onHome }: GameOverProps) {
  useEffect(() => { Sounds.bigWin(); }, []);

  const sparks = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: 1.5 + Math.random() * 3, delay: Math.random() * 3, dur: 1.5 + Math.random(),
    })), []
  );

  const teamPlayers = (teamId: 0 | 1) => players.filter(p => p.teamId === teamId);

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6 z-50 animate-fade-in" style={{ background: 'linear-gradient(160deg, #1a0505, #2d0a0a, #1e0808)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {sparks.map(s => (
          <div key={s.id} className="absolute rounded-full animate-twinkle"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, background: '#d4a843', boxShadow: `0 0 ${s.size * 2}px rgba(212,168,67,0.4)`, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s` }} />
        ))}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full animate-gold-pulse"
          style={{ background: 'radial-gradient(circle, rgba(212,168,67,0.06), transparent 70%)' }} />
      </div>

      <div className="relative z-10 royal-glass rounded-2xl p-8 max-w-md w-full animate-slide-in-up overflow-y-auto max-h-[90vh]" style={{ boxShadow: '0 0 60px rgba(212,168,67,0.08)' }}>
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-xl" style={{ background: 'rgba(212,168,67,0.15)' }} />
            <div className="relative w-22 h-22 rounded-2xl flex items-center justify-center" style={{ width: 88, height: 88, background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.25)' }}>
              <Trophy className="w-11 h-11" style={{ color: '#d4a843', filter: 'drop-shadow(0 0 10px rgba(212,168,67,0.5))' }} />
            </div>
          </div>
        </div>

        <h2 className="font-cinzel text-3xl text-center tracking-wider mb-1 text-gold">VICTORY!</h2>
        <p className="text-center text-xs mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>Game Complete</p>

        <div className="rounded-xl p-5 mb-4 text-center" style={{ background: 'rgba(212,168,67,0.04)', border: '1px solid rgba(212,168,67,0.12)' }}>
          <div className="text-xs tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>CHAMPION</div>
          <div className="font-cinzel text-2xl text-white tracking-wider mb-1">Team {winnerTeam === 0 ? 'A' : 'B'}</div>
          <div className="text-sm" style={{ color: 'rgba(212,168,67,0.6)' }}>Reached {targetPoints} points</div>
        </div>

        {/* Team breakdown with player names and stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {([0, 1] as const).map(t => {
            const isW = winnerTeam === t;
            const c = t === 0 ? '96,165,250' : '248,113,113';
            const members = teamPlayers(t);
            return (
              <div key={t} className="rounded-lg p-3" style={{
                background: `rgba(${c},${isW ? 0.08 : 0.03})`,
                border: `1px solid rgba(${c},${isW ? 0.2 : 0.06})`,
                boxShadow: isW ? `0 0 15px rgba(${c},0.06)` : 'none',
              }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs uppercase tracking-wider" style={{ color: `rgba(${c},0.7)` }}>Team {t === 0 ? 'A' : 'B'}</div>
                  <div className="font-cinzel text-lg text-white">{finalScores[t]}</div>
                </div>
                {isW && <div className="text-xs mb-2 text-gold font-semibold">Winner</div>}
                <div className="space-y-1 mb-2">
                  {members.map((p, i) => (
                    <div key={i} className="text-xs text-white truncate">{p.name}</div>
                  ))}
                </div>
                <div className="pt-1.5" style={{ borderTop: `1px solid rgba(${c},0.1)` }}>
                  <div className="flex justify-between text-xs" style={{ color: `rgba(${c},0.6)` }}>
                    <span>Tricks: {teamTricks[t]}</span>
                    <span>Mindis: {teamMindis[t]}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { Sounds.click(); onPlayAgain(); }}
            className="rounded-xl p-[1px] transition-all hover:scale-[1.03]"
            style={{ background: 'linear-gradient(135deg, rgba(212,168,67,0.5), rgba(180,120,40,0.3))' }}>
            <div className="rounded-xl py-3 flex items-center justify-center gap-2" style={{ background: '#2a0f0f' }}>
              <RotateCcw className="w-4 h-4" style={{ color: '#d4a843' }} />
              <span className="font-cinzel text-xs tracking-wider text-white">PLAY AGAIN</span>
            </div>
          </button>
          <button onClick={() => { Sounds.click(); onHome(); }}
            className="rounded-xl py-3 flex items-center justify-center gap-2 transition-all hover:scale-[1.03]"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,168,67,0.08)' }}>
            <Home className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <span className="font-cinzel text-xs tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>HOME</span>
          </button>
        </div>
      </div>
    </div>
  );
}
