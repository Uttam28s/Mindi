import { useState } from 'react';
import { ArrowLeft, LogIn } from 'lucide-react';
import { Sounds } from '../utils/sounds';
import { haptic } from '../utils/juice';
import { loadData, saveData } from '../utils/storage';
import { UtsavBackground } from './UtsavBackground';

interface JoinGameScreenProps {
  onBack: () => void;
  onJoin: (roomCode: string, playerName: string) => void;
  /** Pre-filled room code, e.g. when a code is shared directly */
  defaultRoomCode?: string;
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 15px',
  borderRadius: 16,
  background: 'rgba(20,10,44,.5)',
  border: '2.5px solid rgba(255,255,255,.22)',
  color: '#fff',
  fontFamily: "'Baloo 2', system-ui, sans-serif",
  fontWeight: 600,
  fontSize: 16,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontFamily: "'Baloo 2', system-ui, sans-serif",
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: '.09em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,.6)',
};

export function JoinGameScreen({ onBack, onJoin, defaultRoomCode }: JoinGameScreenProps) {
  const [roomCode, setRoomCode] = useState(defaultRoomCode ?? '');
  const [playerName, setPlayerName] = useState(() => loadData('mindi_player_name') || '');
  const [error, setError] = useState('');

  const handleJoin = () => {
    if (!playerName.trim()) { setError('We need a name to seat you at the table.'); return; }
    if (roomCode.length !== 6) { setError('Room codes are 6 characters — check and try again.'); return; }
    Sounds.click();
    haptic(12);
    saveData('mindi_player_name', playerName.trim());
    onJoin(roomCode.toUpperCase(), playerName.trim());
  };

  const canJoin = playerName.trim().length > 0 && roomCode.length === 6;

  return (
    <div className="min-h-screen flex items-center justify-center p-5 relative" style={{ overflow: 'hidden' }}>
      <UtsavBackground variant="menu" />

      <div className="relative z-10 w-full u-anim-pop-in" style={{ maxWidth: 400 }}>
        <button
          onClick={() => { Sounds.click(); onBack(); }}
          className="u-btn"
          style={{
            marginBottom: 14, padding: '8px 15px', fontSize: 13.5,
            background: 'rgba(255,255,255,.16)',
            boxShadow: '0 3px 0 rgba(30,16,60,.5)',
            display: 'inline-flex', alignItems: 'center', gap: 7,
          }}
        >
          <ArrowLeft style={{ width: 15, height: 15, position: 'relative', zIndex: 1 }} />
          <span style={{ position: 'relative', zIndex: 1 }}>Back</span>
        </button>

        <div className="u-panel" style={{ padding: 22, background: 'rgba(46,26,96,.9)' }}>
          <div className="u-title" style={{ fontSize: 34, textAlign: 'center', marginBottom: 18 }}>
            JOIN A GAME
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div>
              <label htmlFor="join-name" style={labelStyle}>Your name</label>
              <input
                id="join-name"
                type="text"
                placeholder="What should we call you?"
                value={playerName}
                onChange={e => { setPlayerName(e.target.value); setError(''); }}
                maxLength={20}
                style={fieldStyle}
              />
            </div>

            <div>
              <label htmlFor="join-code" style={labelStyle}>Room code</label>
              <input
                id="join-code"
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                placeholder="ABC123"
                value={roomCode}
                onChange={e => {
                  setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                  setError('');
                }}
                maxLength={6}
                style={{
                  ...fieldStyle,
                  textAlign: 'center',
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: '.24em',
                  textIndent: '.24em',
                  padding: '13px 10px',
                }}
              />
            </div>

            {error && (
              <div className="u-anim-pop-in u-body" role="alert" style={{
                fontSize: 13, textAlign: 'center', padding: '9px 12px', borderRadius: 14,
                color: '#fff', background: 'rgba(255,92,92,.22)', border: '2px solid #FF5C5C',
              }}>
                {error}
              </div>
            )}

            <button
              className="u-btn u-btn--mint"
              onClick={handleJoin}
              disabled={!canJoin}
              style={{ width: '100%', fontSize: 17 }}
            >
              <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <LogIn style={{ width: 18, height: 18 }} /> Join game
              </span>
            </button>
          </div>

          <div className="u-body" style={{
            marginTop: 16, paddingTop: 13, textAlign: 'center', fontSize: 12.5,
            color: 'rgba(255,255,255,.5)', borderTop: '2px solid rgba(255,255,255,.12)',
          }}>
            No code?{' '}
            <button onClick={() => { Sounds.click(); onBack(); }}
              style={{ color: '#FFC93C', textDecoration: 'underline', background: 'none', border: 0, cursor: 'pointer', font: 'inherit' }}>
              Host your own
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
