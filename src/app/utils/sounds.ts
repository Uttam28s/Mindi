/**
 * Sound effects using Web Audio API oscillators - no external files needed
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export const Sounds = {
  /** Short click when a card is played */
  cardPlay() {
    playTone(800, 0.08, 'triangle', 0.12);
    setTimeout(() => playTone(600, 0.06, 'triangle', 0.08), 30);
  },

  /** Upward chime when it's your turn */
  yourTurn() {
    playTone(523, 0.12, 'sine', 0.1);
    setTimeout(() => playTone(659, 0.12, 'sine', 0.1), 100);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.08), 200);
  },

  /** Winning flourish when a trick is won */
  trickWin() {
    playTone(440, 0.1, 'triangle', 0.1);
    setTimeout(() => playTone(554, 0.1, 'triangle', 0.1), 80);
    setTimeout(() => playTone(659, 0.15, 'triangle', 0.12), 160);
  },

  /** Grand fanfare for Mendikot / Whitewash */
  bigWin() {
    [0, 100, 200, 300, 400].forEach((delay, i) => {
      const freq = [523, 659, 784, 988, 1047][i];
      setTimeout(() => playTone(freq, 0.2, 'sine', 0.1), delay);
    });
  },

  /** Soft dealing sound */
  deal() {
    playTone(300, 0.04, 'triangle', 0.06);
  },

  /** Button click */
  click() {
    playTone(700, 0.04, 'triangle', 0.08);
  },
};
