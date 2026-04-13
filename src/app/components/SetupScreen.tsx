import { useState } from 'react';
import { ArrowLeft, Users, Bot, Settings, Target, Zap } from 'lucide-react';
import { TrumpMethod } from '../types';
import { Sounds } from '../utils/sounds';

const INDIAN_AI_NAMES = ['Arjun', 'Priya', 'Vikram', 'Kavita', 'Rahul', 'Deepa', 'Amit', 'Sunita', 'Ravi', 'Meena'];

interface SetupScreenProps {
  onBack: () => void;
  onStart: (config: GameSetup) => void;
}

export interface PlayerConfig {
  name: string;
  isAI: boolean;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
}

export interface GameSetup {
  playerCount: 4 | 6 | 8 | 10;
  trumpMethod: TrumpMethod;
  gamePointsTarget: 3 | 5 | 7 | 10;
  playerNames: string[];
  players: PlayerConfig[];
}

const AVATARS = ['🦁', '🦅', '🐘', '🦚', '🐅', '🐍', '🦎', '🐎', '🐒', '🦜'];

export function SetupScreen({ onBack, onStart }: SetupScreenProps) {
  const [playerCount, setPlayerCount] = useState<4 | 6 | 8 | 10>(4);
  const [trumpMethod, setTrumpMethod] = useState<TrumpMethod>('random');
  const [gamePointsTarget, setGamePointsTarget] = useState<3 | 5 | 7 | 10>(5);
  const [myName, setMyName] = useState(() => localStorage.getItem('mindi_player_name') || '');
  const [players, setPlayers] = useState<PlayerConfig[]>(
    Array(4).fill(null).map((_, i) => ({
      name: i === 0 ? 'You' : `Player ${i + 1}`,
      isAI: false,
      aiDifficulty: undefined
    }))
  );

  const handlePlayerCountChange = (count: 4 | 6 | 8 | 10) => {
    Sounds.click();
    setPlayerCount(count);
    setPlayers(Array(count).fill(null).map((_, i) => {
      if (i < players.length) return players[i];
      return { name: `Player ${i + 1}`, isAI: false, aiDifficulty: undefined };
    }));
  };

  const setPlayerType = (index: number, isAI: boolean) => {
    Sounds.click();
    const np = [...players];
    np[index] = { ...np[index], isAI, name: isAI ? (INDIAN_AI_NAMES[index - 1] ?? `Player ${index + 1}`) : `Player ${index + 1}`, aiDifficulty: isAI ? 'medium' : undefined };
    setPlayers(np);
  };

  const setAIDifficulty = (index: number, d: 'easy' | 'medium' | 'hard') => {
    const np = [...players]; np[index] = { ...np[index], aiDifficulty: d }; setPlayers(np);
  };

  const hasAI = players.some(p => p.isAI);
  // Solo = all non-host seats are AI → start locally; mixed/all-human → go to lobby
  const isSoloAI = hasAI && players.slice(1).every(p => p.isAI);

  const trumpOptions: { value: TrumpMethod; label: string; desc: string }[] = [
    { value: 'random', label: 'Random Draw', desc: 'Trump revealed before play' },
    { value: 'band_hukum_a', label: 'Band Hukum A', desc: 'Hidden, auto-reveal' },
    { value: 'band_hukum_b', label: 'Band Hukum B', desc: 'Optional reveal' },
    { value: 'cut_hukum', label: 'Cut Hukum', desc: 'Set on first void' },
  ];

  const diffColors: Record<string, { bg: string; b: string; t: string }> = {
    easy: { bg: 'rgba(34,197,94,0.08)', b: 'rgba(34,197,94,0.25)', t: '#22c55e' },
    medium: { bg: 'rgba(212,168,67,0.08)', b: 'rgba(212,168,67,0.25)', t: '#d4a843' },
    hard: { bg: 'rgba(220,50,50,0.08)', b: 'rgba(220,50,50,0.25)', t: '#dc3232' },
  };

  return (
    <div className="min-h-screen overflow-y-auto" style={{ background: 'linear-gradient(160deg, #1a0505, #2d0a0a, #1e0808)' }}>
      <div className="relative z-10 max-w-2xl mx-auto p-5 pb-10">
        <div className="mb-7">
          <button onClick={onBack} className="flex items-center gap-2 mb-4" style={{ color: 'rgba(212,168,67,0.4)' }}>
            <ArrowLeft className="w-4 h-4" /> <span className="text-sm">Back</span>
          </button>
          <h1 className="font-cinzel text-xl text-gold tracking-wider mb-1">GAME SETUP</h1>
          <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, rgba(212,168,67,0.4), transparent)' }} />
        </div>

        <div className="space-y-5">
          {/* Player Count */}
          <div className="royal-glass rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4" style={{ color: '#d4a843' }} />
              <h3 className="font-cinzel text-sm text-white tracking-wide">Players</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {([4, 6, 8, 10] as const).map(c => (
                <button key={c} onClick={() => handlePlayerCountChange(c)}
                  className="py-3 rounded-lg font-rajdhani text-lg transition-all"
                  style={{
                    background: playerCount === c ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${playerCount === c ? 'rgba(212,168,67,0.4)' : 'rgba(255,255,255,0.05)'}`,
                    color: playerCount === c ? '#d4a843' : 'rgba(255,255,255,0.3)',
                  }}>{c}</button>
              ))}
            </div>
          </div>

          {/* Players */}
          <div className="royal-glass rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4" style={{ color: '#d4a843' }} />
              <h3 className="font-cinzel text-sm text-white tracking-wide">Seats</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {players.map((player, i) => (
                <div key={i} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(212,168,67,0.08)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{AVATARS[i]}</span>
                      <span className="text-white text-sm">{i === 0 ? 'You' : `Seat ${i + 1}`}</span>
                    </div>
                    {i !== 0 && (
                      <div className="flex rounded overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                        <button onClick={() => setPlayerType(i, false)}
                          className="px-2.5 py-0.5 text-[9px] font-bold tracking-wider transition-all"
                          style={{
                            background: !player.isAI ? 'rgba(34,197,94,0.15)' : 'transparent',
                            borderRight: '1px solid rgba(255,255,255,0.08)',
                            color: !player.isAI ? '#22c55e' : 'rgba(255,255,255,0.25)',
                          }}>HUMAN</button>
                        <button onClick={() => setPlayerType(i, true)}
                          className="px-2.5 py-0.5 text-[9px] font-bold tracking-wider transition-all"
                          style={{
                            background: player.isAI ? 'rgba(212,168,67,0.15)' : 'transparent',
                            color: player.isAI ? '#d4a843' : 'rgba(255,255,255,0.25)',
                          }}>AI</button>
                      </div>
                    )}
                  </div>
                  {i === 0 && (
                    <input
                      type="text"
                      placeholder="Your name (optional)"
                      value={myName}
                      onChange={e => setMyName(e.target.value)}
                      maxLength={20}
                      className="w-full px-2 py-1.5 rounded text-xs text-white placeholder:opacity-30 focus:outline-none mb-1.5"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,168,67,0.12)' }}
                    />
                  )}
                  {player.isAI && (
                    <div className="flex gap-1.5">
                      {(['easy', 'medium', 'hard'] as const).map(d => (
                        <button key={d} onClick={() => setAIDifficulty(i, d)}
                          className="flex-1 py-1.5 rounded text-[9px] font-bold tracking-wider transition-all"
                          style={{
                            background: player.aiDifficulty === d ? diffColors[d].bg : 'transparent',
                            border: `1px solid ${player.aiDifficulty === d ? diffColors[d].b : 'rgba(255,255,255,0.04)'}`,
                            color: player.aiDifficulty === d ? diffColors[d].t : 'rgba(255,255,255,0.2)',
                          }}>{d.toUpperCase()}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Trump */}
          <div className="royal-glass rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4" style={{ color: '#d4a843' }} />
              <h3 className="font-cinzel text-sm text-white tracking-wide">Trump Method (Hukum)</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {trumpOptions.map(o => (
                <button key={o.value} onClick={() => { Sounds.click(); setTrumpMethod(o.value); }}
                  className="text-left p-3 rounded-lg transition-all"
                  style={{
                    background: trumpMethod === o.value ? 'rgba(212,168,67,0.08)' : 'rgba(255,255,255,0.01)',
                    border: `1px solid ${trumpMethod === o.value ? 'rgba(212,168,67,0.3)' : 'rgba(255,255,255,0.04)'}`,
                  }}>
                  <div className="text-sm" style={{ color: trumpMethod === o.value ? '#d4a843' : 'rgba(255,255,255,0.5)' }}>{o.label}</div>
                  <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)' }}>{o.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Points */}
          <div className="royal-glass rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4" style={{ color: '#d4a843' }} />
              <h3 className="font-cinzel text-sm text-white tracking-wide">Points to Win</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {([3, 5, 7, 10] as const).map(pts => (
                <button key={pts} onClick={() => { Sounds.click(); setGamePointsTarget(pts); }}
                  className="py-3 rounded-lg font-rajdhani text-lg transition-all"
                  style={{
                    background: gamePointsTarget === pts ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${gamePointsTarget === pts ? 'rgba(212,168,67,0.4)' : 'rgba(255,255,255,0.05)'}`,
                    color: gamePointsTarget === pts ? '#d4a843' : 'rgba(255,255,255,0.3)',
                  }}>{pts}</button>
              ))}
            </div>
          </div>

          {/* Start */}
          <button onClick={() => {
            Sounds.click();
            const resolvedName = myName.trim() || 'You';
            localStorage.setItem('mindi_player_name', resolvedName);
            const finalPlayers = players.map((p, i) => i === 0 ? { ...p, name: resolvedName } : p);
            onStart({ playerCount, trumpMethod, gamePointsTarget, playerNames: finalPlayers.map(p => p.name), players: finalPlayers });
          }}
            className="w-full rounded-xl p-[1px] transition-all duration-300 hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, rgba(212,168,67,0.6), rgba(180,120,40,0.3))' }}>
            <div className="rounded-xl py-4 flex items-center justify-center gap-3" style={{ background: '#2a0f0f' }}>
              <Zap className="w-5 h-5" style={{ color: '#d4a843' }} />
              <span className="font-cinzel text-lg tracking-wider text-white">{isSoloAI ? 'START GAME' : 'CONTINUE'}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
