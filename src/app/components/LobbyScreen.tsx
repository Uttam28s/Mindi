import { useState } from 'react';
import { Copy, Check, Crown, Play, ArrowLeft, Bot, User } from 'lucide-react';
import { Sounds } from '../utils/sounds';

const AVATARS = ['🦁', '🦅', '🐘', '🦚', '🐅', '🐍', '🦎', '🐎', '🐒', '🦜'];

interface LobbyPlayer { name: string; seatIndex: number; teamId: 0 | 1; isHost: boolean; isAI?: boolean; aiDifficulty?: string; }
interface LobbyScreenProps {
  roomCode: string; players: LobbyPlayer[]; maxPlayers: number; isHost: boolean;
  mySeatIndex: number;
  gameSettings: { playerCount: number; trumpMethod: string; gamePointsTarget: number };
  onStartGame: () => void; onBack: () => void;
}

export function LobbyScreen({ roomCode, players, maxPlayers, isHost, mySeatIndex, gameSettings, onStartGame, onBack }: LobbyScreenProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    try { navigator.clipboard?.writeText(roomCode); } catch {
      try { const t = document.createElement('textarea'); t.value = roomCode; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); } catch {}
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const canStart = players.length === maxPlayers;
  const waitingCount = maxPlayers - players.length; // human seats still empty (AI pre-filled)
  const teamA = players.filter(p => p.teamId === 0);
  const teamB = players.filter(p => p.teamId === 1);
  const trumpLabels: Record<string, string> = { random: 'Random', band_hukum_a: 'Band A', band_hukum_b: 'Band B', cut_hukum: 'Cut Hukum' };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: 'linear-gradient(160deg, #1a0505, #2d0a0a, #1e0808)' }}>
      <div className="relative w-full max-w-2xl animate-fade-in">
        <button onClick={onBack} className="flex items-center gap-2 mb-6" style={{ color: 'rgba(212,168,67,0.4)' }}>
          <ArrowLeft className="w-4 h-4" /> <span className="text-sm">Leave</span>
        </button>

        <div className="royal-glass rounded-2xl p-6">
          <div className="text-center mb-5">
            <h1 className="font-cinzel text-lg text-gold tracking-wider mb-3">GAME LOBBY</h1>
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-xl" style={{ background: 'rgba(212,168,67,0.05)', border: '1px solid rgba(212,168,67,0.15)' }}>
              <span className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(212,168,67,0.4)' }}>Room</span>
              <span className="font-cinzel text-xl tracking-[0.2em] text-gold">{roomCode}</span>
              <button onClick={handleCopy} className="p-1 rounded" style={{ background: 'rgba(212,168,67,0.08)' }}>
                {copied ? <Check className="w-3.5 h-3.5" style={{ color: '#d4a843' }} /> : <Copy className="w-3.5 h-3.5" style={{ color: 'rgba(212,168,67,0.4)' }} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {[{ team: teamA, label: 'Team A', color: '96,165,250' }, { team: teamB, label: 'Team B', color: '248,113,113' }].map(({ team, label, color }) => (
              <div key={label}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: `rgb(${color})` }} />
                  <span className="text-[10px] tracking-wider" style={{ color: `rgba(${color},0.7)` }}>{label.toUpperCase()}</span>
                </div>
                <div className="space-y-1.5">
                  {team.map((p) => (
                    <div key={p.seatIndex} className="flex items-center gap-2.5 px-3 py-2 rounded-lg" style={{ background: `rgba(${color},0.04)`, border: `1px solid rgba(${color},0.1)` }}>
                      <span className="text-lg">{AVATARS[p.seatIndex]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-white truncate">{p.name}</span>
                          {p.seatIndex === mySeatIndex && (
                            <span className="text-[8px] px-1 rounded" style={{ background: 'rgba(212,168,67,0.12)', color: '#d4a843', border: '1px solid rgba(212,168,67,0.25)', flexShrink: 0 }}>You</span>
                          )}
                        </div>
                        {p.isAI && <div className="text-[8px]" style={{ color: 'rgba(212,168,67,0.4)' }}>AI · {p.aiDifficulty}</div>}
                      </div>
                      {p.isHost && <Crown className="w-3 h-3" style={{ color: '#d4a843' }} />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-6 py-2.5 mb-5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,168,67,0.06)' }}>
            {[
              { l: 'Players', v: String(gameSettings.playerCount) },
              { l: 'Target', v: `${gameSettings.gamePointsTarget} pts` },
              { l: 'Trump', v: trumpLabels[gameSettings.trumpMethod] || gameSettings.trumpMethod },
            ].map((s, i) => (
              <div key={s.l} className="flex items-center gap-3">
                {i > 0 && <div className="w-px h-5" style={{ background: 'rgba(212,168,67,0.1)' }} />}
                <div className="text-center">
                  <div className="text-[8px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.2)' }}>{s.l}</div>
                  <div className="font-rajdhani text-sm text-gold">{s.v}</div>
                </div>
              </div>
            ))}
          </div>

          {isHost && (
            <button onClick={() => { Sounds.click(); onStartGame(); }} disabled={!canStart}
              className="w-full rounded-xl p-[1px] transition-all hover:scale-[1.02]"
              style={{ background: canStart ? 'linear-gradient(135deg, rgba(212,168,67,0.5), rgba(180,120,40,0.3))' : 'rgba(255,255,255,0.03)', opacity: canStart ? 1 : 0.4 }}>
              <div className="rounded-xl py-3.5 flex items-center justify-center gap-2" style={{ background: '#2a0f0f' }}>
                <Play className="w-4 h-4" style={{ color: '#d4a843' }} />
                <span className="font-cinzel tracking-wider text-white">{canStart ? 'START GAME' : `WAITING (${waitingCount} more)`}</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
