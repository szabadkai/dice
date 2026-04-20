/**
 * AudioManager.js
 * All sounds synthesized via Web Audio API oscillators.
 * No audio files required.
 */

'use strict';

/** @type {AudioContext|null} */
let ctx = null;

/** @type {boolean} */
let muted = false;

/**
 * Lazily creates (or returns) the shared AudioContext.
 * Must be called from a user-gesture handler on first use.
 * @returns {AudioContext}
 */
export function init() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

/**
 * Toggles mute state.
 * @returns {boolean} New muted state.
 */
export function toggle() {
  muted = !muted;
  return muted;
}

/** @returns {boolean} Whether audio is currently muted. */
export function isMuted() {
  return muted;
}

/**
 * Creates a transient oscillator burst.
 * @param {OscillatorType} type
 * @param {number} freq  - Start frequency (Hz)
 * @param {number} endFreq - End frequency (Hz) for frequency ramp
 * @param {number} gain  - Peak gain (0–1)
 * @param {number} start - Start time (AudioContext.currentTime offset)
 * @param {number} dur   - Duration (seconds)
 */
function tone(type, freq, endFreq, gain, start, dur) {
  if (!ctx || muted) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + start + dur);

  amp.gain.setValueAtTime(0, ctx.currentTime + start);
  amp.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);

  osc.connect(amp);
  amp.connect(ctx.destination);

  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.05);
}

/**
 * Simulates the clatter of rolling dice.
 * Multiple short-burst oscillators with random pitches.
 */
export function playRoll() {
  if (muted) return;
  init();
  const count = 4 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    const startOff = i * 0.06;
    const freq = 200 + Math.random() * 400;
    tone('sawtooth', freq, freq * 0.5, 0.15, startOff, 0.07);
    // Add a brief noise-like component via a second oscillator
    tone('square', freq * 1.5, freq * 0.8, 0.05, startOff + 0.01, 0.05);
  }
}

/**
 * Plays a bright ascending chime for success.
 */
export function playSuccess() {
  if (muted) return;
  init();
  // Three ascending notes
  tone('sine', 523, 660, 0.25, 0,    0.15);
  tone('sine', 660, 784, 0.20, 0.12, 0.15);
  tone('sine', 784, 988, 0.18, 0.24, 0.25);
}

/**
 * Plays a descending dissonant tone for failure.
 */
export function playFail() {
  if (muted) return;
  init();
  tone('sawtooth', 220, 110, 0.25, 0,    0.25);
  tone('square',   185, 100, 0.15, 0.05, 0.30);
}
