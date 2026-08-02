import { UtsavBackground } from './UtsavBackground';

interface LoadingScreenProps { message?: string; }

const SUITS = [
  { d: 'M12 20.9 4.1 13a5.2 5.2 0 0 1 7.3-7.4l.6.6.6-.6A5.2 5.2 0 0 1 19.9 13z', c: '#FF3B6B' },
  { d: 'M12 2.2 21.2 12 12 21.8 2.8 12z', c: '#FF8A00' },
  { d: 'M12 2.2C12 2.2 4.1 8.4 4.1 13.2a4.7 4.7 0 0 0 7.3 3.9c-.3 2-1.2 3.5-2.4 4.4h6a6.4 6.4 0 0 1-2.4-4.4 4.7 4.7 0 0 0 7.3-3.9c0-4.8-7.9-11-7.9-11z', c: '#8B7BFF' },
  { d: 'M12 2.1a4.1 4.1 0 0 0-2.7 7.2A4.1 4.1 0 1 0 7 16.8a4 4 0 0 0 3.4-1.9c-.2 2.1-1.1 3.7-2.3 4.6h7.8c-1.2-.9-2.1-2.5-2.3-4.6a4 4 0 0 0 3.4 1.9 4.1 4.1 0 1 0-2.3-7.5A4.1 4.1 0 0 0 12 2.1z', c: '#38E08A' },
];

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ overflow: 'hidden' }}>
      <UtsavBackground variant="menu" />

      <div className="relative z-10 text-center">
        {/* Four suits bouncing in sequence — reads as "dealing" rather than
            "waiting", and it's four transforms rather than a spinner. */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 26 }}>
          {SUITS.map((s, i) => (
            <div
              key={i}
              className="u-ambient"
              style={{
                width: 42, height: 42, borderRadius: 14,
                background: '#fff',
                border: `3px solid ${s.c}`,
                boxShadow: `0 4px 0 ${s.c}`,
                display: 'grid', placeItems: 'center',
                animation: `u-bob 1.1s ease-in-out ${i * 0.13}s infinite`,
                // @ts-expect-error custom property read by the keyframes
                '--u-bob-y': '-13px',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d={s.d} fill={s.c} />
              </svg>
            </div>
          ))}
        </div>

        <div className="u-title" style={{ fontSize: 'clamp(22px,5vw,30px)' }}>{message}</div>
      </div>
    </div>
  );
}
