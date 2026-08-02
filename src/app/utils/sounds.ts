/**
 * Sound — synthesised, so it ships zero audio assets.
 *
 * The old version played six fixed oscillator beeps. Three things make the
 * difference between that and something that reads as a game:
 *
 *  1. Layering. A card landing is a paper whoosh + a soft body thud + a tonal
 *     pip, not one sine wave.
 *  2. Pitch variation. The same sound at the same pitch fifteen times a round
 *     is the single clearest "cheap game" tell. Every call jitters rate and
 *     gain slightly.
 *  3. A musical reward curve. Consecutive tricks step up a semitone, so a
 *     streak resolves upward instead of repeating.
 *
 * When real samples arrive, swap the bodies for one Howler audio sprite and
 * keep this exact surface — every call site stays as it is.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;
let unlocked = false;

const SEMITONE = 1.0594630943592953;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();

      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);

      // Two buses so music can be ducked, muted and mixed independently of
      // effects. Web Audio has no sidechain, so ducking is a hand-driven gain
      // envelope on the music bus — see `duckMusic`.
      sfxBus = ctx.createGain();
      sfxBus.gain.value = 1;
      sfxBus.connect(master);

      musicBus = ctx.createGain();
      musicBus.gain.value = 1;
      musicBus.connect(master);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Shared graph, for the music engine. Creates the context on first call. */
export function getAudioGraph(): { ctx: AudioContext; music: GainNode } | null {
  const c = getCtx();
  if (!c || !musicBus) return null;
  return { ctx: c, music: musicBus };
}

/**
 * Pull the music down under an effect, then let it back up.
 *
 * Fast attack, slow release — that asymmetry is what a real compressor does and
 * it's why this reads as the music getting out of the way rather than as the
 * volume jumping around. Overlapping effects extend the duck instead of
 * fighting each other, because each call re-anchors from the current value.
 */
let duckDepth = 1;
export function duckMusic(depth = 0.45, holdMs = 220) {
  const c = getCtx();
  if (!c || !musicBus) return;
  const now = c.currentTime;
  const g = musicBus.gain;
  duckDepth = Math.min(duckDepth, depth);
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);                       // anchor — avoids a click
  g.setTargetAtTime(duckDepth, now, 0.04);              // attack
  g.setTargetAtTime(1, now + holdMs / 1000, 0.22);      // release
  window.setTimeout(() => { duckDepth = 1; }, holdMs + 400);
}

/** One shared noise buffer — regenerating it per sound is wasteful. */
function getNoise(c: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    const len = Math.floor(c.sampleRate * 0.5);
    noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

const jitter = (amount = 0.06) => 1 + (Math.random() * 2 - 1) * amount;

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  attack?: number;
  delay?: number;
  glideTo?: number;
}

function tone(freq: number, dur: number, o: ToneOpts = {}) {
  const c = getCtx();
  if (!c || muted || !master) return;
  const { type = 'sine', vol = 0.14, attack = 0.006, delay = 0, glideTo } = o;

  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq * jitter(0.02), t);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t + dur);

  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(g);
  g.connect(sfxBus ?? master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Filtered noise — paper slides, whooshes, powder. */
function noise(dur: number, o: { freq?: number; q?: number; vol?: number; delay?: number; sweepTo?: number } = {}) {
  const c = getCtx();
  if (!c || muted || !master) return;
  const { freq = 2200, q = 1.1, vol = 0.1, delay = 0, sweepTo } = o;

  const t = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = getNoise(c);
  src.playbackRate.value = jitter(0.1);

  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(freq * jitter(0.08), t);
  if (sweepTo) bp.frequency.exponentialRampToValueAtTime(Math.max(60, sweepTo), t + dur);
  bp.Q.value = q;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol * jitter(0.12), t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  src.connect(bp);
  bp.connect(g);
  g.connect(sfxBus ?? master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/* ─── Streak tracking: each consecutive trick resolves a semitone higher ── */
let streak = 0;
export const resetStreak = () => { streak = 0; };

/* ─── Public API ────────────────────────────────────────────────────────── */

export const Sounds = {
  /** Call once from a real user gesture. iOS needs a sound started inside the
   *  tap itself, not just a resume(). */
  unlock() {
    if (unlocked) return;
    const c = getCtx();
    if (!c) return;
    try {
      const b = c.createBuffer(1, 1, 22050);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
      unlocked = true;
    } catch { /* nothing we can do */ }
  },

  setMuted(v: boolean) {
    muted = v;
    if (master) master.gain.value = v ? 0 : 0.9;
  },
  isMuted: () => muted,

  /** Pointer crossing a control. Deliberately tiny — this fires constantly, so
   *  it has to register without ever becoming something you notice. */
  hover() {
    tone(1560 * jitter(0.05), 0.028, { type: 'sine', vol: 0.022 });
  },

  /** UI tap: a click transient over a short body, so it reads as a physical
   *  key rather than a beep. */
  click() {
    noise(0.022, { freq: 5200, vol: 0.05, q: 0.6 });
    tone(920 * jitter(0.04), 0.055, { type: 'triangle', vol: 0.07, glideTo: 660 });
    tone(300 * jitter(0.05), 0.06, { type: 'sine', vol: 0.045, delay: 0.012 });
  },

  /** A chunky button bottoming out. Lower and rounder than `click`. */
  press() {
    tone(420 * jitter(0.04), 0.05, { type: 'triangle', vol: 0.08, glideTo: 250 });
    noise(0.035, { freq: 1700, vol: 0.045, sweepTo: 600 });
  },

  /** Panel / modal opening — a short upward swell. */
  swoosh() {
    noise(0.22, { freq: 700, vol: 0.055, sweepTo: 3600, q: 0.7 });
    tone(330, 0.16, { type: 'sine', vol: 0.05, glideTo: 620 });
  },

  /** Panel / modal closing. */
  swooshOut() {
    noise(0.18, { freq: 3200, vol: 0.045, sweepTo: 600, q: 0.7 });
    tone(560, 0.14, { type: 'sine', vol: 0.04, glideTo: 280 });
  },

  /** A value ticking up — score digits, counters. */
  tick(step = 0) {
    tone(680 * Math.pow(SEMITONE, Math.min(step, 12)), 0.045, { type: 'triangle', vol: 0.05 });
  },

  /** Toggle flipped on / off. */
  toggle(on: boolean) {
    tone(on ? 620 : 480, 0.06, { type: 'triangle', vol: 0.06, glideTo: on ? 880 : 350 });
  },

  /** Card lifted / selected in hand — a soft upward blip. */
  cardSelect() {
    tone(520 * jitter(0.03), 0.09, { type: 'sine', vol: 0.07, glideTo: 760 });
    noise(0.05, { freq: 3000, vol: 0.03, sweepTo: 5200 });
  },

  /** Card put back down. */
  cardDeselect() {
    tone(620 * jitter(0.03), 0.07, { type: 'sine', vol: 0.05, glideTo: 430 });
  },

  /** Illegal move — a short, flat, unmistakably negative buzz. */
  invalid() {
    tone(150, 0.13, { type: 'square', vol: 0.055 });
    tone(112, 0.16, { type: 'square', vol: 0.04, delay: 0.055 });
  },

  /** Card played to the table: whoosh, body thud, tonal pip. */
  cardPlay() {
    noise(0.14, { freq: 2600, vol: 0.075, sweepTo: 700, q: 0.8 });   // slide through air
    tone(196 * jitter(0.05), 0.1, { type: 'sine', vol: 0.1, delay: 0.055, glideTo: 120 }); // contact
    tone(720 * jitter(0.05), 0.06, { type: 'triangle', vol: 0.05, delay: 0.055 });         // pip
  },

  /** One card during the deal — short paper flick. */
  deal() {
    noise(0.075, { freq: 3400 * jitter(0.14), vol: 0.055, sweepTo: 1100, q: 0.7 });
    tone(240 * jitter(0.09), 0.05, { type: 'sine', vol: 0.04, delay: 0.02 });
  },

  /** The whole hand has landed. */
  dealComplete() {
    tone(392, 0.1, { type: 'triangle', vol: 0.06 });
    tone(587, 0.14, { type: 'triangle', vol: 0.055, delay: 0.07 });
  },

  /** Your turn — a short rising figure. */
  yourTurn() {
    tone(523, 0.11, { type: 'sine', vol: 0.075 });
    tone(659, 0.11, { type: 'sine', vol: 0.075, delay: 0.09 });
    tone(784, 0.16, { type: 'sine', vol: 0.065, delay: 0.18 });
  },

  /** Trick won. Steps up a semitone per consecutive win, capped so it stays
   *  musical rather than turning into a whistle.
   *  Ducks the music — only the moments that matter do, so the duck itself
   *  still reads as significant rather than as constant pumping. */
  trickWin() {
    duckMusic(0.5, 260);
    const step = Math.pow(SEMITONE, Math.min(streak, 7));
    streak++;
    const root = 440 * step;
    tone(root, 0.1, { type: 'triangle', vol: 0.085 });
    tone(root * 1.26, 0.1, { type: 'triangle', vol: 0.08, delay: 0.07 });
    tone(root * 1.5, 0.17, { type: 'triangle', vol: 0.09, delay: 0.14 });
    noise(0.2, { freq: 1600, vol: 0.03, sweepTo: 4200 });
  },

  /** A ten captured — the trick sound plus a bright ka-ching on top. */
  mindiCapture() {
    duckMusic(0.32, 420);
    tone(1318, 0.09, { type: 'sine', vol: 0.075 });
    tone(1760, 0.16, { type: 'sine', vol: 0.07, delay: 0.06 });
    tone(2637, 0.14, { type: 'sine', vol: 0.04, delay: 0.06 });
    noise(0.24, { freq: 5200, vol: 0.035, sweepTo: 9000 });
  },

  /** Trick lost — a soft downward figure, never a harsh buzz. */
  trickLose() {
    streak = 0;
    tone(392, 0.11, { type: 'sine', vol: 0.05 });
    tone(311, 0.16, { type: 'sine', vol: 0.045, delay: 0.08 });
  },

  /** Mendikot / whitewash. Fanfare plus a bass hit — the bass is reserved for
   *  this moment only, so it still lands after two hours of play. */
  bigWin() {
    duckMusic(0.18, 1400);
    streak = 0;
    [523, 659, 784, 1047].forEach((f, i) => {
      tone(f, 0.22, { type: 'triangle', vol: 0.085, delay: i * 0.09 });
      tone(f * 2, 0.16, { type: 'sine', vol: 0.03, delay: i * 0.09 });
    });
    tone(65, 0.55, { type: 'sine', vol: 0.14, delay: 0.1, glideTo: 42 });
    noise(0.6, { freq: 900, vol: 0.035, sweepTo: 6000 });
  },
};
