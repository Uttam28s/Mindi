/**
 * Background music. Two beds, and they come from different places:
 *
 *   menu — the supplied recorded theme, looped. Covers every screen outside a
 *          hand: home, setup, lobby, results.
 *   game — synthesised: a sparse lounge shuffle in A minor, deliberately low in
 *          the mix because it runs underneath fifteen tricks and anything
 *          busier becomes wallpaper you want to switch off. Kept synthesised on
 *          purpose so the table costs no extra download.
 *
 * There is also a synthesised menu bed. It is not normally heard — it exists as
 * the fallback for when the recorded theme fails to load, so the menus are
 * never silent on a bad connection.
 *
 * The synth notes are scheduled ahead of the audio clock rather than fired from
 * a timer. A `setInterval` runs whenever the main thread gets around to it,
 * which on a mid-range Android mid-render means audibly uneven timing; the
 * interval only *queues* notes into the future and the audio clock places them.
 */

import { getAudioGraph } from './sounds';
import { loadData, saveData } from './storage';
import menuThemeUrl from '../../assets/music/menu-theme.mp3';

export type Track = 'menu' | 'game' | null;

const PREF_KEY = 'mindi_music_on';

/* ═══════════════════════════════════════════════════════════════════════════
   MENU — a real recorded track, streamed from an <audio> element.

   Streaming rather than decodeAudioData: a ~105s stereo track decoded to PCM
   would sit in memory as roughly 35MB, which is not a thing to do on the
   phones this targets. An <audio> element streams it and stays tiny.

   It's still routed through the Web Audio graph via createMediaElementSource,
   so it lands on the same music bus as everything else and keeps working with
   the mute toggle and the SFX ducking. That node can only be created once per
   element, hence the module-level handles.
   ═══════════════════════════════════════════════════════════════════════════ */

const MENU_FILE_GAIN = 0.42;

let menuEl: HTMLAudioElement | null = null;
let menuNode: MediaElementAudioSourceNode | null = null;
let menuGain: GainNode | null = null;
let pendingGesture = false;

function ensureMenuAudio(ctx: AudioContext, dest: GainNode) {
  if (menuEl) return;
  menuEl = new Audio(menuThemeUrl);
  menuEl.loop = true;
  menuEl.preload = 'auto';
  menuEl.crossOrigin = 'anonymous';
  menuEl.volume = 1;                    // level is handled on the gain node

  menuGain = ctx.createGain();
  menuGain.gain.value = 0.0001;
  menuGain.connect(dest);

  menuNode = ctx.createMediaElementSource(menuEl);
  menuNode.connect(menuGain);

  // If the file can't load — flaky connection, cache miss, blocked request —
  // fall back to the synthesised menu bed rather than leaving the menus silent.
  menuEl.addEventListener('error', () => {
    menuFileBroken = true;
    if (current === 'menu') startSynth('menu');
  });
}

/** Set when the recorded theme fails to load; makes `menu` use the synth bed. */
let menuFileBroken = false;

/** Spin up the note scheduler for one of the synthesised beds. */
function startSynth(track: 'menu' | 'game') {
  const graph = getAudioGraph();
  if (!graph) return;
  const { ctx, music } = graph;

  if (timer !== null) { window.clearInterval(timer); timer = null; }
  if (trackGain) { try { trackGain.disconnect(); } catch { /* gone */ } }

  trackGain = ctx.createGain();
  trackGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  trackGain.connect(music);
  ramp(trackGain, enabled ? TRACKS[track].gain : 0.0001, ctx, 0.8);

  synthTrack = track;
  step = 0;
  nextNoteTime = ctx.currentTime + 0.08;
  timer = window.setInterval(tick, LOOKAHEAD_MS);
}

/** Which pattern set the scheduler is currently running. */
let synthTrack: 'menu' | 'game' = 'game';

/**
 * Browsers refuse to start audio without a user gesture, and the home screen
 * paints before the player has touched anything. Try, and if we're refused,
 * arm a one-shot listener so it starts on the very next tap.
 */
function tryPlayMenu() {
  if (!menuEl) return;
  const p = menuEl.play();
  if (!p) return;
  p.catch(() => {
    if (pendingGesture) return;
    pendingGesture = true;
    const go = () => {
      pendingGesture = false;
      if (current === 'menu') void menuEl?.play().catch(() => { /* still blocked */ });
    };
    window.addEventListener('pointerdown', go, { once: true });
    window.addEventListener('keydown', go, { once: true });
  });
}

/* ── Scheduler constants ─────────────────────────────────────────────────── */
const LOOKAHEAD_MS = 25;      // how often we wake up to queue notes
const SCHEDULE_AHEAD = 0.18;  // how far ahead of the clock we queue, in seconds

/* ── Music theory helpers ────────────────────────────────────────────────── */
const mtof = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** A step in a pattern. `d` is duration in 16ths. */
interface Note { m: number; d: number; v: number }
type Bar = (Note | null)[];   // 16 slots per bar

const N = (m: number, d = 2, v = 1): Note => ({ m, d, v });

/* ═══════════════════════════════════════════════════════════════════════════
   MENU — C major, 118bpm, I-V-vi-IV. Bouncy and unembarrassed.
   ═══════════════════════════════════════════════════════════════════════════ */

const MENU_BPM = 118;
// C3 G2 A2 F2 roots, one bar each
const MENU_BASS: Bar[] = [
  [N(48, 2), null, N(48, 1), null, N(55, 2), null, N(48, 1), null, N(48, 2), null, N(48, 1), null, N(55, 2), null, N(52, 1), null],
  [N(43, 2), null, N(43, 1), null, N(50, 2), null, N(43, 1), null, N(43, 2), null, N(43, 1), null, N(50, 2), null, N(47, 1), null],
  [N(45, 2), null, N(45, 1), null, N(52, 2), null, N(45, 1), null, N(45, 2), null, N(45, 1), null, N(52, 2), null, N(48, 1), null],
  [N(41, 2), null, N(41, 1), null, N(48, 2), null, N(41, 1), null, N(41, 2), null, N(41, 1), null, N(48, 2), null, N(45, 1), null],
];
// Marimba-ish lead, C major pentatonic
const MENU_LEAD: Bar[] = [
  [N(72, 2), null, N(76, 2), null, N(79, 3), null, null, null, N(76, 2), null, N(72, 4), null, null, null, null, null],
  [N(74, 2), null, N(79, 2), null, N(78, 3), null, null, null, N(74, 2), null, N(71, 4), null, null, null, null, null],
  [N(72, 2), null, N(76, 2), null, N(81, 3), null, null, null, N(79, 2), null, N(76, 4), null, null, null, null, null],
  [N(77, 2), null, N(74, 2), null, N(72, 3), null, null, null, N(71, 2), null, N(72, 4), null, null, null, null, null],
];
// Chord pad, one stab per half bar
const MENU_PAD: Bar[] = [
  [N(60, 6, .7), null, null, null, null, null, null, null, N(64, 6, .55), null, null, null, null, null, null, null],
  [N(59, 6, .7), null, null, null, null, null, null, null, N(62, 6, .55), null, null, null, null, null, null, null],
  [N(60, 6, .7), null, null, null, null, null, null, null, N(64, 6, .55), null, null, null, null, null, null, null],
  [N(57, 6, .7), null, null, null, null, null, null, null, N(60, 6, .55), null, null, null, null, null, null, null],
];

/* ═══════════════════════════════════════════════════════════════════════════
   GAME — A minor lounge, 84bpm, Am7-Dm7-E7-Am7. Walking bass, brushed hat,
   occasional Rhodes stab. Sits well under the table.
   ═══════════════════════════════════════════════════════════════════════════ */

const GAME_BPM = 84;
const GAME_BASS: Bar[] = [
  [N(45, 4), null, null, null, N(48, 4), null, null, null, N(52, 4), null, null, null, N(55, 4), null, null, null],
  [N(50, 4), null, null, null, N(53, 4), null, null, null, N(57, 4), null, null, null, N(53, 4), null, null, null],
  [N(52, 4), null, null, null, N(56, 4), null, null, null, N(59, 4), null, null, null, N(56, 4), null, null, null],
  [N(45, 4), null, null, null, N(48, 4), null, null, null, N(52, 4), null, null, null, N(43, 4), null, null, null],
];
const GAME_PAD: Bar[] = [
  [null, null, null, null, N(64, 5, .5), null, null, null, null, null, N(67, 4, .4), null, null, null, null, null],
  [null, null, null, null, N(65, 5, .5), null, null, null, null, null, N(69, 4, .4), null, null, null, null, null],
  [null, null, null, null, N(68, 5, .5), null, null, null, null, null, N(71, 4, .4), null, null, null, null, null],
  [null, null, null, null, N(64, 5, .5), null, null, null, null, null, N(72, 4, .35), null, null, null, null, null],
];
const GAME_LEAD: Bar[] = [
  [null, null, null, null, null, null, null, null, null, null, null, null, N(76, 2, .35), null, N(74, 2, .3), null],
  [null, null, null, null, null, null, null, null, null, null, null, null, N(72, 2, .35), null, N(69, 2, .3), null],
  [null, null, null, null, null, null, null, null, null, null, null, null, N(71, 2, .35), null, N(68, 2, .3), null],
  [null, null, null, null, null, null, null, null, null, null, null, null, N(69, 3, .35), null, null, null],
];

interface TrackDef {
  bpm: number;
  bass: Bar[];
  pad: Bar[];
  lead: Bar[];
  /** 16th slots that get a kick / hat. */
  kick: number[];
  hat: number[];
  gain: number;
  leadWave: OscillatorType;
}

const TRACKS: Record<'menu' | 'game', TrackDef> = {
  menu: {
    bpm: MENU_BPM, bass: MENU_BASS, pad: MENU_PAD, lead: MENU_LEAD,
    kick: [0, 8], hat: [2, 6, 10, 14], gain: 0.5, leadWave: 'triangle',
  },
  game: {
    bpm: GAME_BPM, bass: GAME_BASS, pad: GAME_PAD, lead: GAME_LEAD,
    kick: [0], hat: [4, 12], gain: 0.34, leadWave: 'sine',
  },
};

/* ── Engine state ────────────────────────────────────────────────────────── */
let current: Track = null;
let enabled = loadData(PREF_KEY) !== '0';
let timer: number | null = null;
let trackGain: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let nextNoteTime = 0;
let step = 0;   // running 16th counter

function getNoise(ctx: AudioContext): AudioBuffer {
  if (!noiseBuf) {
    const len = Math.floor(ctx.sampleRate * 0.4);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function startVoice(
  ctx: AudioContext, dest: GainNode, freq: number, at: number, dur: number,
  wave: OscillatorType, vol: number, detuneCents = 0
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, at);
  if (detuneCents) osc.detune.setValueAtTime(detuneCents, at);

  // Plucked envelope: fast attack, exponential decay. Sounds like something
  // struck rather than a synth pad holding a note.
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);

  osc.connect(g);
  g.connect(dest);
  osc.start(at);
  osc.stop(at + dur + 0.03);
}

function perc(ctx: AudioContext, dest: GainNode, at: number, kind: 'kick' | 'hat') {
  if (kind === 'kick') {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, at);
    osc.frequency.exponentialRampToValueAtTime(44, at + 0.11);
    g.gain.setValueAtTime(0.28, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    osc.connect(g); g.connect(dest);
    osc.start(at); osc.stop(at + 0.19);
  } else {
    const src = ctx.createBufferSource();
    src.buffer = getNoise(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.055, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    src.connect(hp); hp.connect(g); g.connect(dest);
    src.start(at); src.stop(at + 0.07);
  }
}

function scheduleStep(ctx: AudioContext, dest: GainNode, def: TrackDef, s: number, at: number) {
  const bar = Math.floor(s / 16) % def.bass.length;
  const slot = s % 16;
  const beat = (60 / def.bpm) / 4;   // one 16th, in seconds

  const play = (b: Bar[], wave: OscillatorType, oct: number, vol: number, detune = 0) => {
    const n = b[bar][slot];
    if (n) startVoice(ctx, dest, mtof(n.m + oct * 12), at, n.d * beat * 0.95, wave, vol * n.v, detune);
  };

  play(def.bass, 'triangle', 0, 0.19);
  play(def.pad, 'sine', 0, 0.085);
  play(def.pad, 'sine', 0, 0.05, 8);      // a second, slightly detuned voice widens the pad
  play(def.lead, def.leadWave, 0, 0.10);

  if (def.kick.includes(slot)) perc(ctx, dest, at, 'kick');
  if (def.hat.includes(slot)) perc(ctx, dest, at, 'hat');
}

function tick() {
  const graph = getAudioGraph();
  if (!graph || !trackGain) return;
  const def = TRACKS[synthTrack];
  const sixteenth = (60 / def.bpm) / 4;

  while (nextNoteTime < graph.ctx.currentTime + SCHEDULE_AHEAD) {
    scheduleStep(graph.ctx, trackGain, def, step, nextNoteTime);
    nextNoteTime += sixteenth;
    step++;
  }
}

function stopEngine() {
  if (timer !== null) { window.clearInterval(timer); timer = null; }
  current = null;
  step = 0;
}

/** Level the currently-playing bed should sit at right now. */
function targetGain(track: Exclude<Track, null>): number {
  if (!enabled) return 0.0001;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return 0.0001;
  if (track === 'game') return TRACKS.game.gain;
  return menuFileBroken ? TRACKS.menu.gain : MENU_FILE_GAIN;
}

function ramp(g: GainNode, to: number, ctx: AudioContext, secs = 0.6) {
  const now = ctx.currentTime;
  g.gain.cancelScheduledValues(now);
  g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), now);
  g.gain.linearRampToValueAtTime(Math.max(0.0001, to), now + secs);
}

export const Music = {
  /**
   * Start (or switch to) a bed. Crossfades between them; calling it with the
   * current track is a no-op, so it's safe to call on every render.
   *
   * `menu` is the recorded theme and covers every screen outside a hand — home,
   * setup, lobby, results. `game` is the synthesised lounge bed and plays only
   * at the table, so the menu track never intrudes on a round.
   */
  play(track: Exclude<Track, null>) {
    if (current === track) return;
    const graph = getAudioGraph();
    if (!graph) return;

    const { ctx, music } = graph;
    ensureMenuAudio(ctx, music);
    current = track;

    if (track === 'menu') {
      // stop the synth
      if (timer !== null) { window.clearInterval(timer); timer = null; }
      if (trackGain) {
        const old = trackGain;
        ramp(old, 0.0001, ctx, 0.45);
        window.setTimeout(() => { try { old.disconnect(); } catch { /* gone */ } }, 800);
        trackGain = null;
      }
      if (menuFileBroken) { startSynth('menu'); return; }
      if (menuGain) ramp(menuGain, targetGain('menu'), ctx, 0.9);
      tryPlayMenu();
      return;
    }

    // → game: fade the file out and pause it once silent, so it isn't
    //   decoding in the background for the whole round.
    if (menuGain) ramp(menuGain, 0.0001, ctx, 0.5);
    window.setTimeout(() => {
      if (current !== 'menu') menuEl?.pause();
    }, 700);

    startSynth('game');
  },

  stop() {
    const graph = getAudioGraph();
    if (graph) {
      if (trackGain) {
        const old = trackGain;
        ramp(old, 0.0001, graph.ctx, 0.4);
        window.setTimeout(() => { try { old.disconnect(); } catch { /* gone */ } }, 700);
        trackGain = null;
      }
      if (menuGain) ramp(menuGain, 0.0001, graph.ctx, 0.4);
    }
    window.setTimeout(() => menuEl?.pause(), 500);
    stopEngine();
  },

  isEnabled: () => enabled,

  setEnabled(on: boolean) {
    enabled = on;
    saveData(PREF_KEY, on ? '1' : '0');
    const graph = getAudioGraph();
    if (!graph || !current) return;
    const to = targetGain(current);
    if (current === 'menu') {
      if (menuGain) ramp(menuGain, to, graph.ctx, 0.3);
      if (on) tryPlayMenu(); else window.setTimeout(() => menuEl?.pause(), 400);
    } else if (trackGain) {
      ramp(trackGain, to, graph.ctx, 0.3);
    }
  },

  /** Silence while the tab is hidden. A card game left in a background tab
   *  still playing a loop is an uninstall. */
  bindVisibility() {
    const onVis = () => {
      const graph = getAudioGraph();
      if (!graph || !current) return;
      const visible = document.visibilityState === 'visible';
      const to = targetGain(current);

      if (current === 'menu') {
        if (menuGain) ramp(menuGain, to, graph.ctx, 0.25);
        if (visible && enabled) tryPlayMenu();
        else window.setTimeout(() => { if (document.visibilityState !== 'visible') menuEl?.pause(); }, 350);
      } else if (trackGain) {
        ramp(trackGain, to, graph.ctx, 0.25);
      }
      if (visible) void graph.ctx.resume();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  },
};
