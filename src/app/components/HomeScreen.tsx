import { useState } from 'react';
import { Play, Users, Zap, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Sounds } from '../utils/sounds';

interface HomeScreenProps {
  onCreateGame: () => void;
  onJoinGame: () => void;
  onQuickPlay?: () => void;
}

export function HomeScreen({ onCreateGame, onJoinGame, onQuickPlay }: HomeScreenProps) {
  const [showInfo, setShowInfo] = useState(false);

  const btn = (fn: () => void) => () => { Sounds.click(); fn(); };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #1a0505 0%, #2d0a0a 30%, #1e0808 60%, #120404 100%)' }}>
      {/* Ornamental top arch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-[0.06]">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-t-full border-t-2 border-l-2 border-r-2" style={{ borderColor: 'rgba(212,168,67,0.5)' }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[440px] h-[220px] rounded-t-full border-t border-l border-r" style={{ borderColor: 'rgba(212,168,67,0.3)' }} />
      </div>

      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,168,67,0.06), transparent 70%)' }} />

      {/* Floating card silhouettes */}
      {[{ x: '12%', y: '20%', r: -15, d: '8s' }, { x: '82%', y: '30%', r: 10, d: '10s' }, { x: '8%', y: '65%', r: -8, d: '9s' }].map((c, i) => (
        <div key={i} className="absolute opacity-[0.04] animate-float" style={{ left: c.x, top: c.y, transform: `rotate(${c.r}deg)`, animationDuration: c.d, animationDelay: `${i}s` }}>
          <div className="w-12 h-18 rounded-md" style={{ border: '1.5px solid rgba(212,168,67,0.6)', width: 48, height: 68 }} />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6 max-w-lg mx-auto">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-in">
          {/* Decorative mandala ring */}
          <div className="inline-block mb-4 relative w-24 h-24">
            <div className="absolute inset-0 rounded-full animate-spin-slow" style={{ border: '1px solid rgba(212,168,67,0.15)' }} />
            <div className="absolute inset-2 rounded-full" style={{ border: '1px solid rgba(212,168,67,0.1)' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl" style={{ color: '#d4a843', filter: 'drop-shadow(0 0 12px rgba(212,168,67,0.4))' }}>♠</span>
            </div>
          </div>

          <h1 className="gujarati-text text-5xl md:text-6xl mb-2" style={{ color: '#d4a843', fontWeight: 700, textShadow: '0 0 20px rgba(212,168,67,0.3)' }}>
            મીંડી
          </h1>
          <div className="font-cinzel text-2xl md:text-3xl mb-3 tracking-[0.15em]" style={{ color: '#e8d5a8' }}>
            MINDI
          </div>
          <div className="flex items-center justify-center gap-4 mb-1">
            <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,168,67,0.4))' }} />
            <p className="text-xs tracking-[0.1em]" style={{ color: 'rgba(212,168,67,0.5)' }}>
              The Royal Gujarati Card Game
            </p>
            <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, rgba(212,168,67,0.4), transparent)' }} />
          </div>
          <p className="text-[10px] tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Mendikot • મીંડીકોટ
          </p>
        </div>

        {/* Buttons */}
        <div className="w-full space-y-4 mb-8">
          {/* Quick Play */}
          {onQuickPlay && (
            <button onClick={btn(onQuickPlay)}
              className="group w-full relative overflow-hidden rounded-2xl p-[1px] transition-all duration-300 hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, rgba(212,168,67,0.6), rgba(180,120,40,0.3), rgba(212,168,67,0.6))' }}>
              <div className="relative rounded-2xl px-6 py-5 overflow-hidden" style={{ background: 'linear-gradient(135deg, #2a0f0f, #3d1515)' }}>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.25)' }}>
                      <Zap className="w-6 h-6" style={{ color: '#d4a843' }} />
                    </div>
                    <div className="text-left">
                      <div className="font-cinzel text-lg text-white tracking-wide">Quick Play</div>
                      <div className="text-[11px]" style={{ color: 'rgba(212,168,67,0.5)' }}>Instant match vs AI</div>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full text-[9px] font-bold tracking-wider animate-bounce-subtle"
                    style={{ background: 'rgba(212,168,67,0.12)', color: '#d4a843', border: '1px solid rgba(212,168,67,0.25)' }}>
                    PLAY
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Create & Join */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={btn(onCreateGame)}
              className="group rounded-xl p-[1px] transition-all duration-300 hover:scale-[1.03]"
              style={{ background: 'linear-gradient(135deg, rgba(212,168,67,0.3), rgba(120,80,20,0.15))' }}>
              <div className="rounded-xl px-4 py-5" style={{ background: '#1e0a0a' }}>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.15)' }}>
                    <Play className="w-5 h-5" style={{ color: '#d4a843' }} />
                  </div>
                  <div className="font-cinzel text-sm text-white text-center">Create Game</div>
                  <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Host a room</div>
                </div>
              </div>
            </button>

            <button onClick={btn(onJoinGame)}
              className="group rounded-xl p-[1px] transition-all duration-300 hover:scale-[1.03]"
              style={{ background: 'linear-gradient(135deg, rgba(212,168,67,0.3), rgba(120,80,20,0.15))' }}>
              <div className="rounded-xl px-4 py-5" style={{ background: '#1e0a0a' }}>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.15)' }}>
                    <Users className="w-5 h-5" style={{ color: '#d4a843' }} />
                  </div>
                  <div className="font-cinzel text-sm text-white text-center">Join Game</div>
                  <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Enter code</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* How to Play */}
        <button onClick={() => setShowInfo(!showInfo)} className="flex items-center gap-2 mb-4" style={{ color: 'rgba(212,168,67,0.4)' }}>
          <Info className="w-3.5 h-3.5" />
          <span className="text-[10px] tracking-wider uppercase">How to Play</span>
          {showInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showInfo && (
          <div className="w-full royal-glass rounded-xl p-5 mb-6 animate-fade-in">
            <h4 className="font-cinzel text-sm text-gold mb-3">Rules of Mindi</h4>
            <ul className="space-y-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <li>▸ Capture the most 10-rank cards (Mindis) to win</li>
              <li>▸ Play with 4, 6, 8, or 10 players in two teams</li>
              <li>▸ Trump suit (Hukum / હુકમ) beats all other suits</li>
              <li>▸ Mendikot = all Mindis (3pts) · Whitewash = all tricks (2pts)</li>
              <li>▸ You must follow the led suit if you have cards of that suit</li>
            </ul>
          </div>
        )}

        <div className="text-[9px] tracking-widest" style={{ color: 'rgba(255,255,255,0.1)' }}>
          A Royal Gujarati Tradition
        </div>
      </div>
    </div>
  );
}
