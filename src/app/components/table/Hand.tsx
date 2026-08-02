import { useState } from 'react';
import { Card as CardType } from '../../types';
import { Card } from '../Card';

interface Props {
  cards: CardType[];
  width: number;
  playableIds: Set<string>;
  interactive: boolean;
  dealing: boolean;
  onPlay: (cardId: string) => void;
  size: 'sm' | 'md';
  /** Tour mode dims every card that isn't called out. */
  highlightIds?: Set<string> | null;
}

const DIMS = {
  sm: { w: 64, h: 90 },
  md: { w: 84, h: 118 },
};

/** Below this much visible width per card, a single row stops being tappable. */
const MIN_COMFORTABLE_STEP = 34;

/**
 * The hand.
 *
 * Fifteen cards on a 375px phone is the hard problem here. A single row gives
 * each card about a 20px sliver — too small to read and too small to hit
 * reliably, and a mis-tap in this game can hand the opponents a Mindi.
 *
 * Every shipped Indian trick-taking app I looked at lays the hand out as a
 * straight overlapping row rather than the Western fan, and the one modern
 * portrait implementation (Court Piece) splits thirteen cards into **two
 * staggered rows**. That's what happens here: wide enough for one comfortable
 * row and it stays one row; too narrow and it splits, which roughly doubles the
 * per-card target instead of halving the card.
 *
 * Touching a card also pushes its neighbours aside, so you get a clear look at
 * what you're about to play before you commit.
 */
export function Hand({
  cards, width, playableIds, interactive, dealing, onPlay, size, highlightIds,
}: Props) {
  const [active, setActive] = useState<string | null>(null);
  const d = DIMS[size];
  const n = cards.length;

  if (n === 0) return null;

  const pad = 10;
  const avail = Math.max(200, width - pad * 2);

  const stepFor = (count: number) =>
    count > 1 ? Math.min(d.w * 0.72, Math.max(18, (avail - d.w) / (count - 1))) : 0;

  // Split only when a single row would be uncomfortably tight.
  const twoRows = n >= 8 && stepFor(n) < MIN_COMFORTABLE_STEP;
  const rows: CardType[][] = twoRows
    ? [cards.slice(0, Math.ceil(n / 2)), cards.slice(Math.ceil(n / 2))]
    : [cards];

  const rowOverlap = Math.round(d.h * 0.42);   // how much row 2 rides over row 1
  const totalH = twoRows ? d.h * 2 - rowOverlap + 16 : d.h + 16;

  return (
    <div
      style={{ position: 'relative', width, height: totalH }}
      onPointerLeave={() => setActive(null)}
    >
      {rows.map((row, rowIdx) => {
        const count = row.length;
        const step = stepFor(count);
        const legal = (c: CardType) => interactive && playableIds.has(c.id);

        /* Open a gap around the cards you're actually allowed to play.
           Shipped trick-takers do this — Hearts runs a 75-79px base step but
           sits its two legal spades 112-122px apart, so the hand physically
           parts around your options. It converts a dense row into a short
           menu at the exact moment you have to choose, and it's the cheapest
           mis-tap fix available short of a confirm step.
           The bonus is whatever slack is left after the base layout, so the
           row can never grow past its container. */
        const gapCount = count - 1;
        const wide = new Set<number>();
        for (let i = 1; i < count; i++) if (legal(row[i]) || legal(row[i - 1])) wide.add(i);

        // Width is conserved: the legal gaps are widened and the illegal ones
        // are squeezed to pay for it, so the row never grows. Illegal steps are
        // floored at 24px — WCAG 2.5.8's minimum target on the narrow axis, and
        // a card's hit area is step x cardHeight, so 24 x 90 still passes.
        const budget = step * gapCount;
        let wideStep = step, narrowStep = step;
        if (wide.size > 0 && wide.size < gapCount) {
          wideStep = step * 1.75;
          narrowStep = (budget - wideStep * wide.size) / (gapCount - wide.size);
          if (narrowStep < 24) {
            narrowStep = 24;
            wideStep = Math.max(step, (budget - narrowStep * (gapCount - wide.size)) / wide.size);
          }
        }

        const xs: number[] = [];
        let cursor = 0;
        for (let i = 0; i < count; i++) {
          if (i > 0) cursor += wide.has(i) ? wideStep : narrowStep;
          xs.push(cursor);
        }
        const innerW = xs[count - 1] + d.w;

        // Offset the lower row by half a step so the two rows interlock rather
        // than sitting in a grid.
        const stagger = twoRows && rowIdx === 1 ? step / 2 : 0;
        const startX = (width - innerW) / 2 + stagger;
        const bottom = twoRows && rowIdx === 0 ? d.h - rowOverlap : 0;

        return row.map((card, i) => {
          const isActive = active === card.id;

          let nudge = 0;
          if (active) {
            const activeIdx = row.findIndex(c => c.id === active);
            if (activeIdx >= 0 && !isActive) {
              const dist = i - activeIdx;
              const falloff = Math.max(0, 3 - Math.abs(dist)) / 3;
              nudge = Math.sign(dist) * falloff * 16;
            }
          }

          const playable = legal(card);
          const dim = highlightIds ? !highlightIds.has(card.id) : false;

          // Row 1 sits behind row 2; an active card beats both.
          const z = isActive ? 300 : rowIdx * 100 + i;

          return (
            <div
              key={card.id}
              onPointerEnter={() => setActive(card.id)}
              onFocus={() => setActive(card.id)}
              style={{
                position: 'absolute',
                left: startX + xs[i] + nudge,
                bottom,
                zIndex: z,
                transition: 'left .2s cubic-bezier(.34,1.56,.64,1)',
                opacity: dim ? 0.26 : 1,
                filter: dim ? 'saturate(.35)' : undefined,
              }}
            >
              <Card
                card={card}
                faceUp
                playable={playable}
                onClick={() => onPlay(card.id)}
                size={size}
                bobIndex={rowIdx * 7 + i}
                glowColor={playable ? 'rgba(255,201,60,.55)' : undefined}
                dealDelay={dealing ? (rowIdx * row.length + i) * 50 : undefined}
              />
            </div>
          );
        });
      })}
    </div>
  );
}
