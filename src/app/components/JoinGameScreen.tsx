import { useState } from 'react';
import { ArrowLeft, LogIn, User } from 'lucide-react';
import { Sounds } from '../utils/sounds';

interface JoinGameScreenProps {
  onBack: () => void;
  onJoin: (roomCode: string, playerName: string) => void;
}

export function JoinGameScreen({ onBack, onJoin }: JoinGameScreenProps) {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('mindi_player_name') || '');
  const [error, setError] = useState('');

  const handleJoin = () => {
    if (!playerName.trim()) { setError('Enter your name'); return; }
    if (roomCode.length !== 6) { setError('Enter a valid 6-char code'); return; }
    Sounds.click();
    localStorage.setItem('mindi_player_name', playerName.trim());
    onJoin(roomCode.toUpperCase(), playerName.trim());
  };

  const canJoin = playerName.trim().length > 0 && roomCode.length === 6;

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: 'linear-gradient(160deg, #1a0505, #2d0a0a, #1e0808)' }}>
      <div className="relative w-full max-w-md animate-fade-in">
        <button onClick={onBack} className="flex items-center gap-2 mb-6" style={{ color: 'rgba(212,168,67,0.4)' }}>
          <ArrowLeft className="w-4 h-4" /> <span className="text-sm">Back</span>
        </button>

        <div className="royal-glass rounded-2xl p-7">
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-3" style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)' }}>
              <LogIn className="w-7 h-7" style={{ color: '#d4a843' }} />
            </div>
            <h1 className="font-cinzel text-lg text-gold tracking-wider mb-1">JOIN GAME</h1>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={{ color: 'rgba(212,168,67,0.4)' }}>Your Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(212,168,67,0.25)' }} />
                <input type="text" placeholder="Enter your name" value={playerName}
                  onChange={(e) => { setPlayerName(e.target.value); setError(''); }} maxLength={20}
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-sm text-white placeholder:opacity-20 focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,168,67,0.1)' }} />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider mb-1.5 block" style={{ color: 'rgba(212,168,67,0.4)' }}>Room Code</label>
              <input type="text" placeholder="ABC123" value={roomCode}
                onChange={(e) => { setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)); setError(''); }}
                maxLength={6}
                className="w-full py-4 text-center font-cinzel text-2xl tracking-[0.3em] text-white uppercase placeholder:opacity-10 focus:outline-none rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(212,168,67,0.1)' }} />
            </div>

            {error && (
              <div className="text-center text-xs py-2 rounded-lg animate-fade-in" style={{ color: '#f87171', background: 'rgba(220,50,50,0.08)', border: '1px solid rgba(220,50,50,0.15)' }}>
                {error}
              </div>
            )}

            <button onClick={handleJoin} disabled={!canJoin}
              className="w-full rounded-xl p-[1px] transition-all"
              style={{ background: canJoin ? 'linear-gradient(135deg, rgba(212,168,67,0.5), rgba(180,120,40,0.3))' : 'rgba(255,255,255,0.03)', opacity: canJoin ? 1 : 0.4 }}>
              <div className="rounded-xl py-3.5 flex items-center justify-center gap-2" style={{ background: '#2a0f0f' }}>
                <LogIn className="w-4 h-4" style={{ color: '#d4a843' }} />
                <span className="font-cinzel tracking-wider text-white">JOIN</span>
              </div>
            </button>
          </div>

          <div className="mt-5 pt-4 text-center" style={{ borderTop: '1px solid rgba(212,168,67,0.08)' }}>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              No code? <button onClick={onBack} className="underline" style={{ color: 'rgba(212,168,67,0.5)' }}>Create a game</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
