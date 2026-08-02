/**
 * Juice — the feedback layer.
 *
 * Impact is a stack, not an effect. A captured Mindi fires a squash, a freeze,
 * a flash, a shake, a particle burst and a sound, in that order, across ~900ms.
 * No single line is impressive; the stack is what reads as a moment.
 *
 * Everything here degrades through one device tier so the same call sites work
 * on a flagship and on a ₹12,000 Android.
 */

import confetti from 'canvas-confetti';

export type Tier = 'low' | 'medium' | 'high';

let tier: Tier = 'medium';
let reducedMotion = false;

export const getTier = () => tier;
export const prefersReduced = () => reducedMotion;

/* ─────────────────────────────────────────────────────────────
   DEVICE TIER
   Guess on boot from the cheap hints, then let a frame-time probe
   correct it. Start conservative: upgrading is invisible, but
   stuttering for three seconds is not.
   ───────────────────────────────────────────────────────────── */

function applyTier(next: Tier) {
  if (next === tier) return;
  tier = next;
  document.documentElement.dataset.tier = next;
}

function initialGuess(): Tier {
  type NavExtras = {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const nav = navigator as Navigator & NavExtras;

  if (nav.connection?.saveData) return 'low';

  const mem = nav.deviceMemory;              // Chromium only — undefined elsewhere
  const cores = navigator.hardwareConcurrency ?? 4;

  if (mem !== undefined) {
    if (mem <= 2) return 'low';
    if (mem <= 4) return 'medium';
    return cores >= 8 ? 'high' : 'medium';
  }
  return 'medium';                            // Safari/Firefox: let the probe decide
}

/**
 * Rolling frame-time probe. Downgrades fast, upgrades slowly, and keeps
 * running — a 20-minute session on a mid-range Android will thermally
 * throttle, so a tier chosen once at load is wrong by the third round.
 */
function startProbe() {
  let frames = 0;
  let t0 = performance.now();
  let bad = 0;
  let good = 0;
  let warmup = 2;                             // skip JIT warm-up samples

  const tick = (t: number) => {
    frames++;
    if (t - t0 >= 1000) {
      const fps = (frames * 1000) / (t - t0);
      frames = 0;
      t0 = t;

      if (warmup > 0) {
        warmup--;
      } else if (document.visibilityState === 'visible') {
        if (fps < 45) { bad++; good = 0; } else if (fps > 57) { good++; bad = 0; } else { bad = 0; good = 0; }

        if (bad >= 1) {
          bad = 0;
          applyTier(tier === 'high' ? 'medium' : 'low');
        }
        if (good >= 6) {
          good = 0;
          applyTier(tier === 'low' ? 'medium' : 'high');
        }
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function initJuice() {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion = mq.matches;
  mq.addEventListener?.('change', e => { reducedMotion = e.matches; });

  tier = 'medium';
  applyTier(initialGuess());
  startProbe();
}

/* ─────────────────────────────────────────────────────────────
   SCREEN SHAKE — scaled to the stakes. Using the same shake for
   everything just trains people to stop noticing it.
   ───────────────────────────────────────────────────────────── */

export type ShakeLevel = 'sm' | 'md' | 'lg';

export function shake(level: ShakeLevel = 'sm', el?: HTMLElement | null) {
  if (reducedMotion || tier === 'low') return;
  const target = el ?? document.getElementById('u-shake-root');
  if (!target) return;

  // Medium tier never gets the biggest shake.
  const lv: ShakeLevel = tier === 'medium' && level === 'lg' ? 'md' : level;
  const cls = `u-shake-${lv}`;
  target.classList.remove('u-shake-sm', 'u-shake-md', 'u-shake-lg');
  void target.offsetWidth;                    // restart the animation
  target.classList.add(cls);
  window.setTimeout(() => target.classList.remove(cls), 620);
}

/* ─────────────────────────────────────────────────────────────
   HIT-STOP — freeze everything for a beat on impact. One of the
   cheapest things on this list and one of the most effective.
   ───────────────────────────────────────────────────────────── */

let stopTimer: number | null = null;

export function hitStop(ms = 70) {
  if (reducedMotion || tier === 'low') return;
  const root = document.documentElement;
  root.classList.add('u-frozen');
  if (stopTimer) window.clearTimeout(stopTimer);
  stopTimer = window.setTimeout(() => {
    root.classList.remove('u-frozen');
    stopTimer = null;
  }, ms);
}

/* ─────────────────────────────────────────────────────────────
   FLASH — a brief white wash over the whole board.
   ───────────────────────────────────────────────────────────── */

export function flash(color = 'rgba(255,255,255,.34)', ms = 90) {
  if (reducedMotion) return;
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed', inset: '0', background: color,
    pointerEvents: 'none', zIndex: '9998', opacity: '1',
  } as CSSStyleDeclaration);
  document.body.appendChild(el);
  el.animate([{ opacity: 0.34 }, { opacity: 0 }], { duration: ms, easing: 'ease-out' })
    .onfinish = () => el.remove();
}

/* ─────────────────────────────────────────────────────────────
   IMPACT RING — expanding circle at a screen point.
   ───────────────────────────────────────────────────────────── */

export function ring(x: number, y: number, color = '#FFC93C', size = 30) {
  if (reducedMotion || tier === 'low') return;
  const el = document.createElement('span');
  Object.assign(el.style, {
    position: 'fixed', left: `${x}px`, top: `${y}px`,
    width: `${size}px`, height: `${size}px`, marginLeft: `${-size / 2}px`, marginTop: `${-size / 2}px`,
    border: `3px solid ${color}`, borderRadius: '999px',
    pointerEvents: 'none', zIndex: '9997',
  } as CSSStyleDeclaration);
  document.body.appendChild(el);
  el.animate(
    [{ transform: 'scale(.3)', opacity: 0.9 }, { transform: 'scale(3.2)', opacity: 0 }],
    { duration: 560, easing: 'cubic-bezier(.2,.8,.3,1)' }
  ).onfinish = () => el.remove();
}

/* ─────────────────────────────────────────────────────────────
   PARTICLES — gulal, not glitter. Soft round powder drifting down
   and lingering, never stars or gold sparkle.
   ───────────────────────────────────────────────────────────── */

const GULAL = ['#FF1F8A', '#FF3B1F', '#FFC400', '#38E08A', '#2D5BFF', '#7B4BFF'];

function particleCount(base: number) {
  if (tier === 'low') return 0;
  return tier === 'medium' ? Math.round(base * 0.5) : base;
}

/** Small puff where a card lands. */
export function puff(x: number, y: number, color?: string) {
  const count = particleCount(14);
  if (!count || reducedMotion) return;
  confetti({
    particleCount: count,
    startVelocity: 16,
    spread: 360,
    ticks: 55,
    gravity: 0.55,
    decay: 0.93,
    scalar: 0.6,
    shapes: ['circle'],
    colors: color ? [color] : GULAL,
    origin: { x: x / window.innerWidth, y: y / window.innerHeight },
    disableForReducedMotion: true,
    useWorker: true,
  });
}

/** Burst when a trick is won. */
export function burst(x: number, y: number, big = false) {
  const count = particleCount(big ? 110 : 55);
  if (!count || reducedMotion) return;
  confetti({
    particleCount: count,
    startVelocity: big ? 42 : 30,
    spread: big ? 110 : 75,
    ticks: big ? 160 : 110,
    gravity: 0.62,
    decay: 0.94,
    scalar: big ? 1 : 0.8,
    shapes: ['circle'],
    colors: GULAL,
    origin: { x: x / window.innerWidth, y: y / window.innerHeight },
    disableForReducedMotion: true,
    useWorker: true,
  });
}

/** The full-screen moment: Mendikot or a whitewash. */
export function celebrate() {
  const count = particleCount(120);
  if (!count || reducedMotion) return;
  const shots = tier === 'high' ? 3 : 2;
  for (let i = 0; i < shots; i++) {
    window.setTimeout(() => {
      confetti({
        particleCount: Math.round(count / shots),
        startVelocity: 46,
        spread: 130,
        ticks: 190,
        gravity: 0.6,
        decay: 0.94,
        shapes: ['circle'],
        colors: GULAL,
        origin: { x: 0.2 + 0.3 * i, y: 0.55 },
        disableForReducedMotion: true,
        useWorker: true,
      });
    }, i * 180);
  }
}

/* ─────────────────────────────────────────────────────────────
   HAPTICS — free on Android, silently ignored on iOS Safari.
   ───────────────────────────────────────────────────────────── */

export function haptic(pattern: number | number[] = 12) {
  if (reducedMotion) return;
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
}

/** Centre point of an element, in viewport coordinates. */
export function centerOf(el: Element | null): { x: number; y: number } | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
