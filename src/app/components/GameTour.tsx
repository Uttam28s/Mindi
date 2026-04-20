import { TourStep, TourHighlight, TourSeatHL, TourAreaHL } from '../utils/tourScript';

export interface GameTourProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  highlightedCardIds: Set<string>;
  highlightedAreaId: string | null;
  highlightedSeatIndex: number | null;
  canAdvance: boolean;
}

function TourTooltip({
  step, stepIndex, totalSteps, onNext, onSkip, canAdvance,
}: Pick<GameTourProps, 'step' | 'stepIndex' | 'totalSteps' | 'onNext' | 'onSkip' | 'canAdvance'>) {
  const posClass =
    step.tooltipPosition === 'top'    ? 'top-24' :
    step.tooltipPosition === 'center' ? 'top-1/2 -translate-y-1/2' :
                                        'bottom-48';

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 ${posClass} z-[500] w-[92vw] max-w-sm`}
      style={{
        background: 'rgba(10,4,2,0.97)',
        border: '1px solid rgba(212,168,67,0.35)',
        borderRadius: 20,
        padding: '18px 18px 14px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.85), 0 0 0 1px rgba(212,168,67,0.08)',
        animation: 'tourFadeIn 0.25s ease',
      }}
    >
      {/* Header row: dots + skip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 5,
                width: i === stepIndex ? 20 : 5,
                borderRadius: 99,
                background: i === stepIndex ? '#d4a843' : 'rgba(212,168,67,0.2)',
                transition: 'width 0.3s ease',
              }}
            />
          ))}
        </div>
        <button
          onClick={onSkip}
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.35)',
            padding: '4px 10px',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 99,
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Skip Tour
        </button>
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontWeight: 700,
          fontSize: 14,
          color: '#e8d5a8',
          marginBottom: 8,
          letterSpacing: '0.03em',
        }}
      >
        {step.title}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.72)',
          lineHeight: 1.65,
          marginBottom: 14,
        }}
      >
        {step.description}
      </div>

      {/* Action area */}
      {canAdvance ? (
        <button
          onClick={onNext}
          style={{
            width: '100%',
            padding: '11px 0',
            borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(212,168,67,0.2), rgba(180,120,40,0.1))',
            border: '1px solid rgba(212,168,67,0.35)',
            color: '#d4a843',
            fontSize: 13,
            fontFamily: "'Cinzel', serif",
            letterSpacing: '0.05em',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background =
              'linear-gradient(135deg, rgba(212,168,67,0.3), rgba(180,120,40,0.18))';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background =
              'linear-gradient(135deg, rgba(212,168,67,0.2), rgba(180,120,40,0.1))';
          }}
        >
          {stepIndex === totalSteps - 1 ? 'Start Playing!' : 'Next →'}
        </button>
      ) : (
        <div
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'rgba(212,168,67,0.85)',
            animation: 'goldPulse 1.4s ease-in-out infinite',
            letterSpacing: '0.04em',
          }}
        >
          ✦ Play the highlighted card to continue
        </div>
      )}
    </div>
  );
}

export function GameTour({
  step, stepIndex, totalSteps, onNext, onSkip, canAdvance,
}: GameTourProps) {
  return (
    <>
      {/* Dim overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.52)', zIndex: 200 }}
      />

      {/* Tooltip — pointer-events on so buttons work */}
      <TourTooltip
        step={step}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        onNext={onNext}
        onSkip={onSkip}
        canAdvance={canAdvance}
      />
    </>
  );
}

// Keep type imports happy (used by GameTable when deriving highlights)
export type { TourHighlight, TourSeatHL, TourAreaHL };
