/**
 * ParticleSystem.js
 * Canvas-based particle effect overlay.
 */

'use strict';

/** @type {HTMLCanvasElement|null} */
let canvas = null;
/** @type {CanvasRenderingContext2D|null} */
let ctx = null;
/** @type {Particle[]} */
let particles = [];
/** @type {number|null} */
let rafId = null;

/** Whether the user prefers reduced motion. */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * @typedef {Object} Particle
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} gravity
 * @property {number} alpha
 * @property {number} alphaDecay
 * @property {number} radius
 * @property {string} color
 * @property {number} spin
 * @property {number} rotation
 */

/**
 * Initialises the particle system with the canvas element.
 * @param {HTMLCanvasElement} canvasEl
 */
export function init(canvasEl) {
  canvas = canvasEl;
  ctx    = canvasEl.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

/** Resizes canvas to match its CSS bounding box. */
function resize() {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  canvas.width  = rect.width  || canvas.offsetWidth;
  canvas.height = rect.height || canvas.offsetHeight;
}

/**
 * Emits a burst of particles from the given canvas coordinates.
 *
 * @param {number} x          - X position in canvas pixels.
 * @param {number} y          - Y position in canvas pixels.
 * @param {Object} [opts]
 * @param {number} [opts.count=20]
 * @param {string} [opts.color='#e2b714']
 * @param {number} [opts.speed=4]
 * @param {number} [opts.gravity=0.15]
 * @param {number} [opts.lifetime=60]  - Frames before fully transparent.
 */
export function burst(x, y, { count = 20, color = '#e2b714', speed = 4, gravity = 0.15, lifetime = 60 } = {}) {
  if (prefersReducedMotion || !ctx) return;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const s     = speed * (0.5 + Math.random());
    particles.push({
      x,
      y,
      vx:         Math.cos(angle) * s,
      vy:         Math.sin(angle) * s - speed * 0.5,
      gravity,
      alpha:      1,
      alphaDecay: 1 / lifetime,
      radius:     2 + Math.random() * 3,
      color,
      spin:       (Math.random() - 0.5) * 0.3,
      rotation:   Math.random() * Math.PI * 2,
    });
  }

  if (!rafId) rafId = requestAnimationFrame(tick);
}

/** Animation loop. */
function tick() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles = particles.filter(p => p.alpha > 0.01);

  for (const p of particles) {
    p.vy       += p.gravity;
    p.x        += p.vx;
    p.y        += p.vy;
    p.alpha    -= p.alphaDecay;
    p.rotation += p.spin;

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (particles.length > 0) {
    rafId = requestAnimationFrame(tick);
  } else {
    rafId = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}
