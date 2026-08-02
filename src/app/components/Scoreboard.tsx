import { GameState } from '../types';
import { Trophy, Target, Zap } from 'lucide-react';

interface ScoreboardProps { gameState: GameState; }

const suitSymbols: Record<string, string> = { hearts: '♥', diamonds: '♦', spades: '♠', clubs: '♣' };
const suitCols: Record<string, string> = { hearts: '#b91c1c', diamonds: '#c2410c', spades: '#475569', clubs: '#475569' };

export function Scoreboard({ gameState }: ScoreboardProps) {
  const { gamePoints, round } = gameState;

  return (
    <div className="royal-glass rounded-xl p-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-2"><Trophy className="w-3.5 h-3.5" style={{ color: '#FFC93C' }} /><span className="text-[9px] tracking-wider" style={{ color: 'rgba(255,201,60,0.4)' }}>GAME</span></div>
          <div className="grid grid-cols-2 gap-2">
            {[0, 1].map(t => (
              <div key={t} className="rounded-lg p-2 text-center" style={{ background: t === 0 ? 'rgba(37,201,245,0.05)' : 'rgba(255,107,138,0.05)', border: `1px solid ${t === 0 ? 'rgba(37,201,245,0.1)' : 'rgba(255,107,138,0.1)'}` }}>
                <div className="text-[8px]" style={{ color: t === 0 ? 'rgba(37,201,245,0.5)' : 'rgba(255,107,138,0.5)' }}>{t === 0 ? 'A' : 'B'}</div>
                <div className="u-display text-lg text-white">{gamePoints[t as 0 | 1]}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2"><Target className="w-3.5 h-3.5" style={{ color: '#FFC93C' }} /><span className="text-[9px] tracking-wider" style={{ color: 'rgba(255,201,60,0.4)' }}>MINDIS</span></div>
          <div className="grid grid-cols-2 gap-2">
            {[0, 1].map(t => (
              <div key={t} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,201,60,0.06)' }}>
                <div className="u-display text-lg text-white">{round.teamMindis[t as 0 | 1]}</div>
                <div className="text-[8px]" style={{ color: 'rgba(255,255,255,0.15)' }}>{round.teamTricks[t as 0 | 1]}T</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2"><Zap className="w-3.5 h-3.5" style={{ color: '#FFC93C' }} /><span className="text-[9px] tracking-wider" style={{ color: 'rgba(255,201,60,0.4)' }}>TRUMP</span></div>
          <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,201,60,0.03)', border: '1px solid rgba(255,201,60,0.08)' }}>
            {round.trumpSuit ? (
              <div className="flex flex-col items-center">
                <span className="text-2xl" style={{ color: suitCols[round.trumpSuit] }}>{suitSymbols[round.trumpSuit]}</span>
                <span className="text-[8px] capitalize" style={{ color: 'rgba(255,255,255,0.2)' }}>{round.trumpSuit}</span>
              </div>
            ) : (
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.15)' }}>Hidden</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
