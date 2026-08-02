import { useEffect, useState } from 'react';
import { TrickEntry } from '../../types';
import { Card } from '../Card';
import { TableGeom, cardPos, cardTilt, seatPos } from './geometry';

type Phase = 'idle' | 'gather' | 'fly';

/* ── Timing budget ────────────────────────────────────────────────────────
   These have to stay under the engine's trick pause, or cards get cut off
   mid-flight when the trick clears. Total = GATHER + stagger + FLY.
   With 4 players: 340 + 3x40 + 400 = 860ms, inside a 950ms pause.

   Board Game Arena's own studio guidance caps regular animations at 0.5s
   (0.8s absolute), and Nielsen Norman put 500ms as the point where animation
   "starts to feel like a real drag" — with the explicit note that anything
   seen frequently should be shorter still. This one fires fifteen times a
   round, so it stays lean. ── */
const GATHER_MS = 340;
const STAGGER_MS = 40;
const FLY_MS = 400;
/** What the engine's trick pause must be at least. Exported so it can't drift. */
export const TRICK_COLLECT_MS = GATHER_MS + STAGGER_MS * 3 + FLY_MS;

interface Props {
  entries: TrickEntry[];
  playerCount: number;
  myPlayerIndex: number;
  g: TableGeom;
  /** Set the moment the trick resolves. Null while the trick is still being played. */
  collectTo: { winnerSeatIndex: number; mindisWon: number } | null;
  dimmed?: boolean;
}

/**
 * The four played cards, and the trick collection.
 *
 * The old design stopped the game and threw up a full-screen panel listing who
 * won. That reads as a modal interruption, and it happens fifteen times a
 * round. Here the board never leaves the screen: the cards gather toward the
 * middle, the winner's card lifts, and then the whole pack flies into the
 * winner's seat and shrinks away. You learn who won by watching where the
 * cards went, which is how it works at a real table.
 *
 * Timeline, from the moment the trick resolves:
 *    0ms  gather  — all four slide 12% toward centre, scale 0.94
 *  120ms  the winning card lifts and brightens
 *  520ms  fly     — staggered by play order, 45ms apart, into the winner's seat
 *  ~1.0s  gone
 * The game's own 2s trick pause is unchanged, so no logic moves.
 */
export function TrickPile({ entries, playerCount, myPlayerIndex, g, collectTo, dimmed }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    if (!collectTo) { setPhase('idle'); return; }
    setPhase('gather');
    const t = window.setTimeout(() => setPhase('fly'), GATHER_MS);
    return () => window.clearTimeout(t);
  }, [collectTo]);

  const rel = (seat: number) => (seat - myPlayerIndex + playerCount) % playerCount;

  return (
    <>
      {entries.map((entry, i) => {
        const r = rel(entry.seatIndex);
        const base = cardPos(g, r, playerCount);
        const tilt = cardTilt(r, playerCount);
        const isWinner = collectTo?.winnerSeatIndex === entry.seatIndex;
        const isMindi = entry.card.rank === '10';

        let x = base.x;
        let y = base.y;
        let scale = 1;
        let rot = tilt;
        let opacity = 1;
        let z = 10 + i;
        // Delay is baked into the shorthand rather than set as a separate
        // transitionDelay — mixing shorthand and longhand for the same property
        // makes React's style diffing drop one of them between renders.
        let transition = 'transform .34s cubic-bezier(.34,1.56,.64,1) 0ms, opacity .3s ease 0ms';

        if (phase === 'gather') {
          // Pull in toward the middle. This is what makes the next move read as
          // one pack rather than four cards leaving independently.
          x *= 0.72;
          y *= 0.72;
          scale = isWinner ? 1.06 : 0.94;
          if (isWinner) { z = 40; rot = 0; }
        } else if (phase === 'fly') {
          const dest = seatPos(g, rel(collectTo!.winnerSeatIndex), playerCount);
          x = dest.x;
          y = dest.y;
          scale = 0.3;
          rot = tilt * 0.4 + (i - entries.length / 2) * 7;
          opacity = 0;
          const delay = i * STAGGER_MS;   // staggered by play order
          transition = `transform ${FLY_MS}ms cubic-bezier(.5,0,.75,.4) ${delay}ms,` +
                       ` opacity ${FLY_MS - 90}ms ease-in ${delay + 110}ms`;
        }

        return (
          <div
            key={`${entry.seatIndex}-${entry.card.id}`}
            data-played-seat={entry.seatIndex}
            style={{
              position: 'absolute',
              left: g.cx, top: g.cy,
              transform: `translate(-50%,-50%) translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`,
              transition,
              zIndex: z,
              opacity: dimmed ? 0.32 : opacity,
              pointerEvents: 'none',
              willChange: phase === 'idle' ? undefined : 'transform, opacity',
            }}
          >
            <div style={{
              // The winning card gets a marigold halo while the pack gathers,
              // so the answer to "who won?" lands before the cards move.
              filter: isWinner && phase !== 'idle'
                ? 'drop-shadow(0 0 12px rgba(255,201,60,.95)) drop-shadow(0 0 26px rgba(255,201,60,.5))'
                : isMindi
                  ? 'drop-shadow(0 0 8px rgba(255,201,60,.5))'
                  : 'drop-shadow(0 6px 10px rgba(14,6,36,.55))',
              transition: 'filter .3s ease',
            }}>
              <Card card={entry.card} faceUp inert size={g.cardScale} />
            </div>
          </div>
        );
      })}
    </>
  );
}
