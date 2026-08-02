import { useState } from 'react';
import { Copy, Check, Crown, Play, ArrowLeft, Pencil, X } from 'lucide-react';
import { Sounds } from '../utils/sounds';

const AVATARS = ['🦁', '🦅', '🐘', '🦚', '🐅', '🐍', '🦎', '🐎', '🐒', '🦜'];

interface LobbyPlayer { name: string; seatIndex: number; teamId: 0 | 1; isHost: boolean; isAI?: boolean; aiDifficulty?: string; }
interface LobbyScreenProps {
  roomCode: string; players: LobbyPlayer[]; maxPlayers: number; isHost: boolean;
  mySeatIndex: number;
  gameSettings: { playerCount: number; trumpMethod: string; gamePointsTarget: number };
  onStartGame: () => void; onBack: () => void;
  onRenamePlayer?: (newName: string) => void;
}

export function LobbyScreen({ roomCode, players, maxPlayers, isHost, mySeatIndex, gameSettings, onStartGame, onBack, onRenamePlayer }: LobbyScreenProps) {
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const startEditName = () => {
    const me = players.find(p => p.seatIndex === mySeatIndex);
    setNameInput(me?.name ?? '');
    setEditingName(true);
  };

  const saveEditName = () => {
    const trimmed = nameInput.trim();
    if (trimmed && onRenamePlayer) onRenamePlayer(trimmed);
    setEditingName(false);
  };

  const handleCopy = () => {
    try { navigator.clipboard?.writeText(roomCode); } catch {
      try { const t = document.createElement('textarea'); t.value = roomCode; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); } catch {}
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // Two separate conditions, and they fail for different reasons. Seats can be
  // full while the room is still effectively single-player, because AI seats
  // are occupied from the moment the room is created. The server enforces both
  // — this just explains the wait instead of letting the button dead-click.
  const MIN_HUMANS = 2;
  const seatsFull = players.length === maxPlayers;
  const humanCount = players.filter(p => !p.isAI).length;
  const humansNeeded = Math.max(0, MIN_HUMANS - humanCount);

  const canStart = seatsFull && humansNeeded === 0;
  const waitingCount = maxPlayers - players.length;

  const startLabel =
    canStart ? 'START GAME'
    : humansNeeded > 0 ? `NEED ${humansNeeded} MORE PLAYER${humansNeeded === 1 ? '' : 'S'}`
    : `WAITING (${waitingCount} more)`;
  const trumpLabels: Record<string, string> = { random: 'Random', band_hukum_a: 'Band A', band_hukum_b: 'Band B', cut_hukum: 'Cut Hukum' };
  const sortedPlayers = [...players].sort((a, b) => a.seatIndex - b.seatIndex);

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: 'linear-gradient(178deg,#34246E 0%,#5B37B0 42%,#9B48CE 74%,#DE4FA2 100%)' }}>
      <div className="relative w-full max-w-2xl animate-fade-in">
        <button onClick={onBack} className="flex items-center gap-2 mb-6" style={{ color: 'rgba(255,201,60,0.4)' }}>
          <ArrowLeft className="w-4 h-4" /> <span className="text-sm">Leave</span>
        </button>

        <div className="royal-glass rounded-2xl p-6">
          <div className="text-center mb-5">
            <h1 className="u-display text-lg text-gold tracking-wider mb-3">GAME LOBBY</h1>
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-xl" style={{ background: 'rgba(255,201,60,0.05)', border: '1px solid rgba(255,201,60,0.15)' }}>
              <span className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,201,60,0.4)' }}>Room</span>
              <span className="u-display text-xl tracking-[0.2em] text-gold">{roomCode}</span>
              <button onClick={handleCopy} className="p-1 rounded" style={{ background: 'rgba(255,201,60,0.08)' }}>
                {copied ? <Check className="w-3.5 h-3.5" style={{ color: '#FFC93C' }} /> : <Copy className="w-3.5 h-3.5" style={{ color: 'rgba(255,201,60,0.4)' }} />}
              </button>
            </div>
          </div>

          {/* Teams will be revealed when the game starts */}
          <div className="mb-2 px-1">
            <span className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,201,60,0.35)' }}>Players</span>
          </div>

          <div className="space-y-1.5 mb-5">
            {sortedPlayers.map((p) => {
              const isMe = p.seatIndex === mySeatIndex;
              const isEditing = isMe && editingName;
              return (
                <div key={p.seatIndex} className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                  style={{
                    background: isMe ? 'rgba(255,201,60,0.05)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isMe ? 'rgba(255,201,60,0.22)' : 'rgba(255,255,255,0.06)'}`
                  }}>
                  <span className="text-lg">{AVATARS[p.seatIndex]}</span>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          type="text"
                          value={nameInput}
                          onChange={e => setNameInput(e.target.value.slice(0, 20))}
                          onKeyDown={e => { if (e.key === 'Enter') saveEditName(); if (e.key === 'Escape') setEditingName(false); }}
                          className="flex-1 px-2 py-0.5 rounded text-xs text-white focus:outline-none min-w-0"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,201,60,0.35)' }}
                        />
                        <button onClick={saveEditName}
                          className="text-[10px] px-2 py-0.5 rounded font-bold"
                          style={{ background: 'rgba(255,201,60,0.15)', color: '#FFC93C', border: '1px solid rgba(255,201,60,0.3)', flexShrink: 0 }}>
                          Save
                        </button>
                        <button onClick={() => setEditingName(false)} style={{ flexShrink: 0 }}>
                          <X className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-white truncate">{p.name}</span>
                        {isMe && (
                          <>
                            <span className="text-[8px] px-1 rounded" style={{ background: 'rgba(255,201,60,0.12)', color: '#FFC93C', border: '1px solid rgba(255,201,60,0.25)', flexShrink: 0 }}>You</span>
                            {onRenamePlayer && (
                              <button onClick={startEditName} className="ml-0.5 flex-shrink-0">
                                <Pencil className="w-3 h-3" style={{ color: 'rgba(255,201,60,0.5)' }} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {p.isAI && <div className="text-[8px]" style={{ color: 'rgba(255,201,60,0.4)' }}>AI · {p.aiDifficulty}</div>}
                  </div>
                  {p.isHost && !isEditing && <Crown className="w-3 h-3" style={{ color: '#FFC93C' }} />}
                </div>
              );
            })}

            {/* Empty seat placeholders */}
            {Array.from({ length: waitingCount }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.06)' }}>
                <span className="text-lg" style={{ opacity: 0.2 }}>?</span>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.2)' }}>Waiting for player...</span>
              </div>
            ))}
          </div>

          {/* Teams revealed hint */}
          <div className="flex items-center justify-center gap-2 py-2 mb-4 rounded-lg"
            style={{ background: 'rgba(255,201,60,0.03)', border: '1px solid rgba(255,201,60,0.08)' }}>
            <span className="text-[10px] tracking-wide" style={{ color: 'rgba(255,201,60,0.4)' }}>
              Teams will be revealed when the game starts
            </span>
          </div>

          <div className="flex items-center justify-center gap-6 py-2.5 mb-5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,201,60,0.06)' }}>
            {[
              { l: 'Players', v: String(gameSettings.playerCount) },
              { l: 'Target', v: `${gameSettings.gamePointsTarget} pts` },
              { l: 'Trump', v: trumpLabels[gameSettings.trumpMethod] || gameSettings.trumpMethod },
            ].map((s, i) => (
              <div key={s.l} className="flex items-center gap-3">
                {i > 0 && <div className="w-px h-5" style={{ background: 'rgba(255,201,60,0.1)' }} />}
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
              style={{ background: canStart ? 'linear-gradient(135deg, rgba(255,201,60,0.5), rgba(180,120,40,0.3))' : 'rgba(255,255,255,0.03)', opacity: canStart ? 1 : 0.4 }}>
              <div className="rounded-xl py-3.5 flex items-center justify-center gap-2" style={{ background: '#40287F' }}>
                <Play className="w-4 h-4" style={{ color: '#FFC93C' }} />
                <span className="u-display tracking-wider text-white">{startLabel}</span>
              </div>
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
