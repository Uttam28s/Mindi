import { Menu, Zap } from 'lucide-react';
import { Suit } from '../../types';
import { TEAM } from './PlayerSeat';

const SUIT_PATH: Record<string, string> = {
  hearts:  'M12 20.9 4.1 13a5.2 5.2 0 0 1 7.3-7.4l.6.6.6-.6A5.2 5.2 0 0 1 19.9 13z',
  diamonds:'M12 2.2 21.2 12 12 21.8 2.8 12z',
  spades:  'M12 2.2C12 2.2 4.1 8.4 4.1 13.2a4.7 4.7 0 0 0 7.3 3.9c-.3 2-1.2 3.5-2.4 4.4h6a6.4 6.4 0 0 1-2.4-4.4 4.7 4.7 0 0 0 7.3-3.9c0-4.8-7.9-11-7.9-11z',
  clubs:   'M12 2.1a4.1 4.1 0 0 0-2.7 7.2A4.1 4.1 0 1 0 7 16.8a4 4 0 0 0 3.4-1.9c-.2 2.1-1.1 3.7-2.3 4.6h7.8c-1.2-.9-2.1-2.5-2.3-4.6a4 4 0 0 0 3.4 1.9 4.1 4.1 0 1 0-2.3-7.5A4.1 4.1 0 0 0 12 2.1z',
};
const SUIT_COL: Record<string, string> = {
  hearts: '#FF3B6B', diamonds: '#FF8A00', spades: '#8B7BFF', clubs: '#38E08A',
};

function SuitGlyph({ suit, size }: { suit: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={SUIT_PATH[suit]} fill={SUIT_COL[suit]} />
    </svg>
  );
}

interface Props {
  trumpSuit: Suit | null;
  trumpPending: boolean;
  scores: [number, number];
  target: number;
  mindis: [number, number];
  tricks: [number, number];
  trickNumber: number;
  totalTricks: number;
  compact: boolean;
  onMenu: () => void;
  highlightTrump?: boolean;
}

/**
 * The persistent HUD.
 *
 * Kept to the four things a trick-taking player actually needs at all times:
 * what's trump, the match score, how many Mindis each side holds, and how far
 * through the round we are. Whose turn it is lives on the table itself, where
 * you're already looking — putting it up here too would just be noise.
 */
export function TableHUD({
  trumpSuit, trumpPending, scores, target, mindis, tricks,
  trickNumber, totalTricks, compact, onMenu, highlightTrump,
}: Props) {
  const chip = (teamId: 0 | 1) => {
    const t = TEAM[teamId];
    return (
      <div key={teamId} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: compact ? '3px 8px' : '4px 11px',
        borderRadius: 999,
        background: t.soft,
        border: `2px solid ${t.key}`,
        boxShadow: `0 2px 0 ${t.dark}`,
      }}>
        <span style={{
          fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 800,
          fontSize: compact ? 18 : 21, lineHeight: 1, color: t.key,
          fontVariantNumeric: 'tabular-nums',
        }}>{scores[teamId]}</span>
        <span style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,.62)' }}>
            {mindis[teamId]}
          </span>
          <svg width="9" height="9" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="#FFC93C" />
          </svg>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,.42)', marginLeft: 2 }}>
            {tricks[teamId]}
          </span>
        </span>
      </div>
    );
  };

  return (
    <div style={{
      position: 'relative', zIndex: 30, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10,
      padding: compact ? '7px 10px' : '10px 16px',
      background: 'linear-gradient(180deg, rgba(26,13,58,.9), rgba(26,13,58,.68))',
      borderBottom: '2px solid rgba(255,255,255,.14)',
    }}>
      {/* Trump — the single most consulted piece of information in the game,
          so it gets the loudest treatment on the bar. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {trumpSuit ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: compact ? '4px 10px 4px 7px' : '5px 13px 5px 9px',
            borderRadius: 999,
            background: 'linear-gradient(168deg, rgba(255,255,255,.22), rgba(255,255,255,.08))',
            border: `2px solid ${SUIT_COL[trumpSuit]}`,
            boxShadow: highlightTrump
              ? `0 0 0 3px rgba(255,201,60,.6), 0 3px 0 rgba(18,8,44,.5)`
              : '0 3px 0 rgba(18,8,44,.5)',
          }}>
            <SuitGlyph suit={trumpSuit} size={compact ? 20 : 24} />
            {!compact && (
              <span style={{
                fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 700,
                fontSize: 12.5, color: '#fff', letterSpacing: '.03em',
              }}>Hukum</span>
            )}
          </div>
        ) : trumpPending ? (
          <div className="u-anim-breathe" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 999,
            background: 'rgba(255,255,255,.1)',
            border: '2px dashed rgba(255,201,60,.55)',
          }}>
            <Zap style={{ width: 14, height: 14, color: '#FFC93C' }} />
            <span style={{
              fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 700,
              fontSize: 12, color: '#FFC93C',
            }}>{compact ? 'Hukum?' : 'Cut Hukum'}</span>
          </div>
        ) : null}
      </div>

      {/* Score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {chip(0)}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', fontWeight: 700 }}>
          to {target}
        </span>
        {chip(1)}
      </div>

      {/* Trick progress + menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        {!compact && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
            <span style={{
              fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 700,
              fontSize: 11.5, color: 'rgba(255,255,255,.62)', lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              Trick {trickNumber}/{totalTricks}
            </span>
            <div style={{ width: 74, height: 5, borderRadius: 999, background: 'rgba(255,255,255,.14)', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, (trickNumber / totalTricks) * 100)}%`, height: '100%',
                borderRadius: 999, background: 'linear-gradient(90deg,#FFC93C,#FF8A3D)',
                transition: 'width .45s cubic-bezier(.34,1.56,.64,1)',
              }} />
            </div>
          </div>
        )}
        <button
          onClick={onMenu}
          aria-label="Game menu"
          style={{
            width: 38, height: 38, borderRadius: 999, border: '2px solid rgba(255,255,255,.24)',
            background: 'rgba(255,255,255,.12)', display: 'grid', placeItems: 'center',
            cursor: 'pointer', boxShadow: '0 3px 0 rgba(18,8,44,.5)', flexShrink: 0,
          }}
        >
          <Menu style={{ width: 18, height: 18, color: '#fff' }} />
        </button>
      </div>
    </div>
  );
}
