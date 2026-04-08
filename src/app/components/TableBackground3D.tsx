import { useMemo } from 'react';

export function TableBackground3D() {
  const particles = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      delay: Math.random() * 4,
      dur: 3 + Math.random() * 3,
    })), []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Warm ambient orbs */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full animate-gold-pulse"
        style={{ background: 'radial-gradient(circle, rgba(212,168,67,0.04) 0%, transparent 70%)', animationDuration: '6s' }} />
      <div className="absolute -bottom-40 -right-40 w-[550px] h-[550px] rounded-full animate-gold-pulse"
        style={{ background: 'radial-gradient(circle, rgba(160,60,40,0.04) 0%, transparent 70%)', animationDuration: '8s', animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(212,168,67,0.02) 0%, transparent 70%)' }} />

      {/* Paisley/Mandala-inspired corner ornaments */}
      <div className="absolute top-4 left-4 w-20 h-20 opacity-[0.04]">
        <div className="absolute inset-0 rounded-full border border-amber-400/60" />
        <div className="absolute inset-3 rounded-full border border-amber-400/40" />
        <div className="absolute inset-6 rounded-full border border-amber-400/20" />
      </div>
      <div className="absolute bottom-4 right-4 w-20 h-20 opacity-[0.04]">
        <div className="absolute inset-0 rounded-full border border-amber-400/60" />
        <div className="absolute inset-3 rounded-full border border-amber-400/40" />
        <div className="absolute inset-6 rounded-full border border-amber-400/20" />
      </div>

      {/* Floating gold dust */}
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-full animate-twinkle"
          style={{
            top: `${p.y}%`, left: `${p.x}%`,
            width: p.size, height: p.size,
            background: 'rgba(212,168,67,0.3)',
            boxShadow: `0 0 ${p.size * 2}px rgba(212,168,67,0.2)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
