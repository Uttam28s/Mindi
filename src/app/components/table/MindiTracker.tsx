import { TEAM } from './PlayerSeat';

const SUITS = ['hearts', 'diamonds', 'spades', 'clubs'] as const;

const PATH: Record<string, string> = {
  hearts:  'M12 20.9 4.1 13a5.2 5.2 0 0 1 7.3-7.4l.6.6.6-.6A5.2 5.2 0 0 1 19.9 13z',
  diamonds:'M12 2.2 21.2 12 12 21.8 2.8 12z',
  spades:  'M12 2.2C12 2.2 4.1 8.4 4.1 13.2a4.7 4.7 0 0 0 7.3 3.9c-.3 2-1.2 3.5-2.4 4.4h6a6.4 6.4 0 0 1-2.4-4.4 4.7 4.7 0 0 0 7.3-3.9c0-4.8-7.9-11-7.9-11z',
  clubs:   'M12 2.1a4.1 4.1 0 0 0-2.7 7.2A4.1 4.1 0 1 0 7 16.8a4 4 0 0 0 3.4-1.9c-.2 2.1-1.1 3.7-2.3 4.6h7.8c-1.2-.9-2.1-2.5-2.3-4.6a4 4 0 0 0 3.4 1.9 4.1 4.1 0 1 0-2.3-7.5A4.1 4.1 0 0 0 12 2.1z',
};
const COL: Record<string, string> = {
  hearts: '#FF3B6B', diamonds: '#FF8A00', spades: '#8B7BFF', clubs: '#38E08A',
};

interface Props {
  /** Per team, how many tens of each suit have been captured. */
  captured: [Record<string, number>, Record<string, number>];
  teamId: 0 | 1;
  total: number;
  compact: boolean;
}

/**
 * Which tens each team has taken.
 *
 * Mindi Kot is entirely about capturing the four tens, and until now the only
 * way to know the state of that race was a bare number in the HUD. The shipped
 * Indian Mindi apps all solve it the same way — a row of the four ten-cards
 * with a per-suit counter — because "we still need the ten of spades" is the
 * thought the player is actually having.
 *
 * Counts can exceed one per suit: at 6+ players the game uses multiple decks.
 */
export function MindiTracker({ captured, teamId, total, compact }: Props) {
  const t = TEAM[teamId];
  const mine = captured[teamId];
  const pip = compact ? 11 : 13;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: compact ? 5 : 7,
      padding: compact ? '4px 7px' : '6px 10px',
      borderRadius: 999,
      background: 'rgba(20,10,44,.72)',
      border: `2px solid ${t.key}`,
      boxShadow: `0 3px 0 ${t.dark}`,
    }}>
      <span className="u-display" style={{ fontSize: compact ? 10 : 11.5, color: t.key, letterSpacing: '.06em' }}>
        {t.label}
      </span>

      {SUITS.map(s => {
        const got = mine[s] ?? 0;
        return (
          <span key={s} style={{
            position: 'relative',
            display: 'grid', placeItems: 'center',
            width: pip + 6, height: pip + 6, borderRadius: 5,
            background: got ? '#fff' : 'rgba(255,255,255,.08)',
            border: `1.5px solid ${got ? COL[s] : 'rgba(255,255,255,.14)'}`,
            transition: 'all .3s cubic-bezier(.34,1.56,.64,1)',
          }}>
            <svg width={pip} height={pip} viewBox="0 0 24 24" aria-hidden="true"
              style={{ opacity: got ? 1 : 0.3 }}>
              <path d={PATH[s]} fill={got ? COL[s] : '#fff'} />
            </svg>
            {got > 1 && (
              <span style={{
                position: 'absolute', right: -4, top: -5,
                minWidth: 13, height: 13, borderRadius: 999, padding: '0 2px',
                background: '#FFC93C', color: '#3B2200',
                fontSize: 9, fontWeight: 900, lineHeight: '13px', textAlign: 'center',
                fontFamily: "'Baloo 2', system-ui, sans-serif",
              }}>{got}</span>
            )}
          </span>
        );
      })}

      <span style={{
        minWidth: compact ? 17 : 20, textAlign: 'center',
        fontFamily: "'Baloo 2', system-ui, sans-serif", fontWeight: 800,
        fontSize: compact ? 13 : 15, color: '#FFC93C',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {total}
      </span>
    </div>
  );
}
