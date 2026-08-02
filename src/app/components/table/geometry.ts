/**
 * Table geometry.
 *
 * Everything on the table is placed on one ellipse, by angle. Seats sit on the
 * rim, played cards sit on a smaller concentric ellipse at the same angle, so a
 * card always appears directly in front of whoever played it. That single rule
 * is what makes the board readable at 4 players and still readable at 10.
 *
 * Angle convention: degrees, measured from +x, with **y pointing down** (screen
 * coordinates). 90deg is the bottom of the table, which is always the local
 * player. Seats advance anticlockwise from there, matching the game's turn order.
 */

export interface TableGeom {
  /** Ellipse radii of the felt surface, in px. */
  rx: number;
  ry: number;
  /** Bounding box of the whole table block, including seats hanging off the rim. */
  width: number;
  height: number;
  /** Centre of the ellipse within that bounding box. */
  cx: number;
  cy: number;
  /** Seat pill size. */
  seatSize: number;
  /** Card size on the table. */
  cardScale: 'sm' | 'md';
}

/** Where a seat sits, as a fraction of the felt radius. >1 = outside the rim. */
const SEAT_RING = 1.0;
/** Where a played card sits. Comfortably inside, clear of the centre badge. */
const CARD_RING = 0.52;

export function seatAngleDeg(relIndex: number, playerCount: number): number {
  return 90 - (360 / playerCount) * relIndex;
}

export function onEllipse(rx: number, ry: number, angleDeg: number) {
  const r = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(r) * rx, y: Math.sin(r) * ry };
}

/** Seat centre, relative to the ellipse centre. */
export function seatPos(g: TableGeom, relIndex: number, playerCount: number) {
  return onEllipse(g.rx * SEAT_RING, g.ry * SEAT_RING, seatAngleDeg(relIndex, playerCount));
}

/** Played-card centre, relative to the ellipse centre. */
export function cardPos(g: TableGeom, relIndex: number, playerCount: number) {
  return onEllipse(g.rx * CARD_RING, g.ry * CARD_RING, seatAngleDeg(relIndex, playerCount));
}

/**
 * A played card leans slightly toward its owner — a few degrees is enough to
 * read as "thrown from over there" without making the rank hard to scan.
 */
export function cardTilt(relIndex: number, playerCount: number): number {
  if (relIndex === 0) return 0;
  const a = seatAngleDeg(relIndex, playerCount);
  // map the seat's horizontal offset to a small lean
  return Math.round(-Math.cos((a * Math.PI) / 180) * 9);
}

export interface Viewport {
  w: number;
  h: number;
  hudH: number;
  handH: number;
}

/**
 * Fit the table to the space between the HUD and the hand.
 *
 * The two failure modes this exists to prevent:
 *  - on a wide desktop the ellipse stretching into a runway, so it's capped and
 *    centred with the background filling the sides;
 *  - on a short landscape phone the table eating the hand, so height wins.
 */
export function computeGeometry(v: Viewport, playerCount: number): TableGeom {
  const availW = v.w;
  const availH = Math.max(180, v.h - v.hudH - v.handH);

  // Seats hang off the rim, so the felt has to sit inside a margin.
  const seatSize = playerCount >= 8 ? 46 : playerCount >= 6 ? 52 : 58;
  const marginX = seatSize * 0.85 + 8;
  const marginY = seatSize * 0.75 + 8;

  // Cap the felt so a 21:9 monitor doesn't produce a runway.
  const MAX_RX = 430;
  const MAX_RY = 300;

  let rx = Math.min((availW - marginX * 2) / 2, MAX_RX);
  let ry = Math.min((availH - marginY * 2) / 2, MAX_RY);

  // Keep it recognisably a table: never narrower than tall, never more than
  // 2.1x wider. Outside that range it stops reading as an oval table.
  const MIN_RATIO = 0.95;
  const MAX_RATIO = 2.1;
  if (rx / ry < MIN_RATIO) ry = rx / MIN_RATIO;
  if (rx / ry > MAX_RATIO) rx = ry * MAX_RATIO;

  rx = Math.max(120, rx);
  ry = Math.max(110, ry);

  const width = rx * 2 + marginX * 2;
  const height = ry * 2 + marginY * 2;

  return {
    rx, ry, width, height,
    cx: width / 2,
    cy: height / 2,
    seatSize,
    cardScale: rx < 250 || playerCount >= 8 ? 'sm' : 'md',
  };
}
