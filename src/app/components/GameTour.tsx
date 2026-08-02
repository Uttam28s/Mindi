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
      className={`fixed left-1/2 -translate-x-1/2 ${posClass} z-[500] w-[92vw] max-w-sm u-anim-pop-in`}
      style={{
        background: 'rgba(46,26,96,.96)',
        border: '3px solid rgba(255,255,255,.22)',
        borderRadius: 22,
        padding: '16px 16px 14px',
        boxShadow: '0 8px 0 rgba(30,16,60,.55), 0 20px 44px rgba(14,6,36,.6)',
      }}
    >
      {/* Progress + skip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 6,
                width: i === stepIndex ? 22 : 6,
                borderRadius: 99,
                background: i <= stepIndex ? '#FFC93C' : 'rgba(255,255,255,.2)',
                transition: 'width .3s cubic-bezier(.34,1.56,.64,1), background .3s',
              }}
            />
          ))}
        </div>
        <button
          onClick={onSkip}
          className="u-body"
          style={{
            fontSize: 11.5, color: 'rgba(255,255,255,.6)',
            padding: '4px 11px', borderRadius: 99,
            border: '2px solid rgba(255,255,255,.18)',
            background: 'rgba(255,255,255,.08)', cursor: 'pointer',
          }}
        >
          Skip
        </button>
      </div>

      <div className="u-display" style={{ fontSize: 19, color: '#FFC93C', marginBottom: 5 }}>
        {step.title}
      </div>

      <div className="u-body" style={{
        fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,.82)',
        lineHeight: 1.55, marginBottom: 13,
      }}>
        {step.description}
      </div>

      {canAdvance ? (
        <button className="u-btn u-btn--marigold" style={{ width: '100%', fontSize: 15 }} onClick={onNext}>
          <span style={{ position: 'relative', zIndex: 1 }}>
            {stepIndex === totalSteps - 1 ? "Let's play!" : 'Next'}
          </span>
        </button>
      ) : (
        <div className="u-anim-breathe u-body" style={{
          textAlign: 'center', fontSize: 12.5, color: '#FFC93C',
          padding: '9px 0', borderRadius: 14,
          background: 'rgba(255,201,60,.12)', border: '2px dashed rgba(255,201,60,.4)',
        }}>
          Tap the glowing card to continue
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
      {/* Dim overlay — tinted toward the table's own colour rather than flat
          black, so the board still reads as the same place underneath. */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'rgba(20,10,44,.55)', zIndex: 200 }}
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
