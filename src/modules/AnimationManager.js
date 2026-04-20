/**
 * AnimationManager.js
 * Multi-stage dice roll animations and celebration effects.
 * Respects prefers-reduced-motion.
 */

'use strict';

/** True when the user prefers reduced motion. */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Applies a CSS class temporarily, then removes it.
 * @param {Element} el
 * @param {string} cls
 * @param {number} duration - ms
 * @returns {Promise<void>}
 */
function tempClass(el, cls, duration) {
  return new Promise(resolve => {
    el.classList.add(cls);
    setTimeout(() => {
      el.classList.remove(cls);
      resolve();
    }, duration);
  });
}

/**
 * Runs the full multi-stage roll animation on each die element.
 * Stages: wind-up → launch → tumble → land → bounce.
 * @param {Element[]} diceElements - Array of .die-result elements.
 * @returns {Promise<void>} Resolves when all animations complete.
 */
export async function animateRoll(diceElements) {
  if (prefersReducedMotion || !diceElements.length) return;

  // Assign random per-die CSS variables for variety
  diceElements.forEach((el, i) => {
    el.style.setProperty('--i', String(i));
    el.style.setProperty('--dx', `${(Math.random() * 60 - 30).toFixed(1)}px`);
    el.style.setProperty('--dy', `${(Math.random() * -60 - 20).toFixed(1)}px`);
    el.style.setProperty('--rot', `${(Math.random() * 720 - 360).toFixed(0)}deg`);
  });

  // Wind-up
  await Promise.all(diceElements.map(el => tempClass(el, 'anim-windup', 200)));
  // Launch
  await Promise.all(diceElements.map(el => tempClass(el, 'anim-launch', 350)));
  // Tumble
  await Promise.all(diceElements.map(el => tempClass(el, 'anim-tumble', 400)));
  // Land + bounce
  await Promise.all(diceElements.map(el => tempClass(el, 'anim-land', 500)));
}

/**
 * Plays gold-glow pop animation for a critical (max) result.
 * @param {Element} el - The die element.
 */
export function celebrateCritical(el) {
  if (prefersReducedMotion) return;
  el.classList.remove('anim-critical');
  void el.offsetWidth; // force reflow
  el.classList.add('anim-critical');
  setTimeout(() => el.classList.remove('anim-critical'), 1000);
}

/**
 * Plays dim + red-tint + shake animation for a fumble (value 1).
 * @param {Element} el - The die element.
 */
export function celebrateFail(el) {
  if (prefersReducedMotion) return;
  el.classList.remove('anim-fail');
  void el.offsetWidth;
  el.classList.add('anim-fail');
  setTimeout(() => el.classList.remove('anim-fail'), 800);
}

/**
 * Screen-wide shimmer + victory hop for all-success rolls.
 * @param {Element[]} diceElements
 */
export function celebrateAllSuccess(diceElements) {
  if (prefersReducedMotion) return;
  const tray = document.getElementById('dice-tray');
  if (tray) {
    tray.classList.add('anim-shimmer');
    setTimeout(() => tray.classList.remove('anim-shimmer'), 1200);
  }
  diceElements.forEach((el, i) => {
    setTimeout(() => tempClass(el, 'anim-victory-hop', 500), i * 50);
  });
}

/**
 * Screen shake + desaturate for all-fail rolls.
 * @param {Element[]} diceElements
 */
export function celebrateAllFail(diceElements) {
  if (prefersReducedMotion) return;
  const tray = document.getElementById('dice-tray');
  if (tray) {
    tray.classList.add('anim-screen-shake');
    setTimeout(() => tray.classList.remove('anim-screen-shake'), 800);
  }
  diceElements.forEach(el => {
    el.classList.add('anim-desaturate');
    setTimeout(() => el.classList.remove('anim-desaturate'), 1200);
  });
}
