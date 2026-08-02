import { useState } from 'react';
import { Volume2, VolumeX, Music as MusicIcon } from 'lucide-react';
import { Sounds } from '../utils/sounds';
import { Music } from '../utils/music';
import { haptic } from '../utils/juice';

/**
 * Sound controls.
 *
 * Music and effects are separate switches on purpose. Plenty of people want the
 * clicks and the trick fanfare but not a loop running for an hour, and folding
 * both into one button means those players just mute the whole game — which
 * costs you every piece of audio feedback the interface relies on.
 */
export function SoundToggle({ compact = false }: { compact?: boolean }) {
  const [music, setMusic] = useState(Music.isEnabled());
  const [sfx, setSfx] = useState(!Sounds.isMuted());

  const size = compact ? 34 : 40;
  const icon = compact ? 15 : 17;

  const btn = (
    on: boolean,
    onClick: () => void,
    label: string,
    children: React.ReactNode,
  ) => (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={on}
      title={label}
      style={{
        width: size, height: size, borderRadius: 999, cursor: 'pointer',
        display: 'grid', placeItems: 'center', flexShrink: 0,
        background: on ? 'rgba(255,201,60,.92)' : 'rgba(255,255,255,.12)',
        border: `2px solid ${on ? '#C98A00' : 'rgba(255,255,255,.24)'}`,
        boxShadow: `0 3px 0 ${on ? '#A86F00' : 'rgba(18,8,44,.5)'}`,
        color: on ? '#3B2200' : 'rgba(255,255,255,.75)',
        transition: 'all .18s cubic-bezier(.34,1.56,.64,1)',
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {btn(
        music,
        () => {
          const next = !music;
          setMusic(next);
          Music.setEnabled(next);
          Sounds.click();
          haptic(10);
        },
        next(music, 'music'),
        <MusicIcon style={{ width: icon, height: icon }} />
      )}
      {btn(
        sfx,
        () => {
          const next = !sfx;
          setSfx(next);
          Sounds.setMuted(!next);
          if (next) Sounds.click();   // only audible when turning back on
          haptic(10);
        },
        next(sfx, 'sound effects'),
        sfx
          ? <Volume2 style={{ width: icon, height: icon }} />
          : <VolumeX style={{ width: icon, height: icon }} />
      )}
    </div>
  );
}

/** Labels describe what the tap will do, not the current state. */
function next(on: boolean, what: string) {
  return `${on ? 'Turn off' : 'Turn on'} ${what}`;
}
