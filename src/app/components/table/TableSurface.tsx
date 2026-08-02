import { TableGeom } from './geometry';

/**
 * The felt.
 *
 * This component exists because the previous design had no table at all —
 * avatars floated at cardinal points and cards were played into empty
 * background, which is why it never read as a card game.
 *
 * Four things make a shape read as a physical surface rather than a coloured
 * blob, and all four are here:
 *   1. a rim with its own thickness and a solid darker underside, so it has an
 *      edge you could put your hand on;
 *   2. a light pool — brighter in the upper middle, falling off to the rim, as
 *      if lit from above;
 *   3. ambient occlusion where the felt meets the rim, so the felt sits *in*
 *      the table rather than on top of it;
 *   4. a contact shadow underneath, anchoring the whole thing to the room.
 */
export function TableSurface({ g, dim = false }: { g: TableGeom; dim?: boolean }) {
  const rimW = Math.max(10, Math.round(Math.min(g.rx, g.ry) * 0.055));

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: g.cx,
        top: g.cy,
        width: g.rx * 2,
        height: g.ry * 2,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        opacity: dim ? 0.42 : 1,
        transition: 'opacity .3s ease',
      }}
    >
      {/* Contact shadow — sits under everything, slightly offset down. */}
      <div style={{
        position: 'absolute', inset: '6% -2% -8% -2%',
        borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(18,8,44,.55), rgba(18,8,44,0) 78%)',
        filter: 'none',
      }} />

      {/* Rim — bright moulded plastic with a solid darker underside. */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: 'linear-gradient(178deg, #FFD563 0%, #FFC12F 40%, #E8A013 72%, #C98A00 100%)',
        boxShadow: `0 ${Math.round(rimW * 0.55)}px 0 #A86F00,
                    0 ${Math.round(rimW * 0.55 + 10)}px 26px rgba(18,8,44,.5),
                    inset 0 3px 0 rgba(255,255,255,.55)`,
      }} />

      {/* Felt well */}
      <div style={{
        position: 'absolute', inset: rimW, borderRadius: '50%', overflow: 'hidden',
        background: `
          radial-gradient(72% 62% at 50% 34%, #5B37B0 0%, #43269090 42%, transparent 72%),
          radial-gradient(120% 110% at 50% 42%, #402780 0%, #311D66 52%, #241448 100%)`,
        boxShadow: `inset 0 ${Math.round(rimW * 0.7)}px ${Math.round(rimW * 1.5)}px rgba(14,6,36,.65),
                    inset 0 -2px 0 rgba(255,255,255,.06)`,
      }}>
        {/* Block-print buti repeat — the cheapest way to make the surface read
            as Indian cloth rather than casino baize. Kept under 5% so it never
            competes with a card. */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.055,
          backgroundImage: `radial-gradient(circle at 50% 50%, #fff 1.6px, transparent 1.7px),
                            radial-gradient(circle at 50% 50%, #fff 1.1px, transparent 1.2px)`,
          backgroundSize: '46px 46px, 46px 46px',
          backgroundPosition: '0 0, 23px 23px',
        }} />

        {/* Light pool from above. */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(58% 44% at 50% 26%, rgba(255,236,180,.16), transparent 72%)',
        }} />

        {/* Centre guide — a soft ring that tells you where cards land. */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          width: Math.round(g.rx * 0.72), height: Math.round(g.ry * 0.72),
          transform: 'translate(-50%,-50%)', borderRadius: '50%',
          border: '2px dashed rgba(255,255,255,.07)',
        }} />
      </div>

      {/* Inner highlight on the rim's top edge — sells the roundness. */}
      <div style={{
        position: 'absolute', inset: Math.round(rimW * 0.35), borderRadius: '50%',
        border: '1.5px solid rgba(255,255,255,.22)',
        borderBottomColor: 'rgba(120,70,0,.28)',
      }} />
    </div>
  );
}
