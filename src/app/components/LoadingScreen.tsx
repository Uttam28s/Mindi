interface LoadingScreenProps { message?: string; }

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'linear-gradient(160deg, #1a0505, #2d0a0a, #1e0808)' }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full animate-gold-pulse pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(212,168,67,0.06), transparent 70%)' }} />

      <div className="relative text-center animate-fade-in">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full animate-spin-slow" style={{ border: '2px solid transparent', borderTopColor: 'rgba(212,168,67,0.5)' }} />
          <div className="absolute inset-3 rounded-full animate-spin-slow" style={{ border: '1px solid transparent', borderBottomColor: 'rgba(212,168,67,0.25)', animationDirection: 'reverse', animationDuration: '15s' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl" style={{ color: '#d4a843', filter: 'drop-shadow(0 0 8px rgba(212,168,67,0.4))' }}>♠</span>
          </div>
        </div>
        <h2 className="font-cinzel text-lg text-gold tracking-wider mb-3">{message}</h2>
        <div className="flex gap-1.5 justify-center">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce-subtle"
              style={{ background: '#d4a843', animationDelay: `${i * 150}ms`, boxShadow: '0 0 4px rgba(212,168,67,0.4)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
