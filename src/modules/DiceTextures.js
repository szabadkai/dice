/**
 * DiceTextures.js
 * Canvas-generated face textures for the 3D dice. Each face is rendered
 * as a single square texture applied to the corresponding polygon face
 * of the die geometry.
 */

'use strict';

import * as THREE from 'three';

const SIZE   = 256;
const BG     = '#12121e';
const BG_2   = '#1c1c2e';
const GOLD   = '#e2b714';
const BONE   = '#f5efdd';
const BLOOD  = '#8a1c1c';
const STEEL  = '#1e3560';
const PURPLE = '#3a1e60';

const cache = new Map();

function canvas() {
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  return c;
}

/** Linear top-down gradient background. */
function paintBg(ctx, a = BG_2, b = BG) {
  const g = ctx.createLinearGradient(0, 0, 0, SIZE);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

/** Gilded border around the face. */
function paintBorder(ctx, colour = GOLD, width = 10) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.strokeRect(width / 2, width / 2, SIZE - width, SIZE - width);
}

/** Numeric-label face. */
export function numericFace(n, opts = {}) {
  const key = `num-${n}-${opts.bg ?? ''}-${opts.fg ?? ''}`;
  if (cache.has(key)) return cache.get(key);
  const c = canvas();
  const ctx = c.getContext('2d');
  paintBg(ctx, opts.bg ?? BG_2, opts.bgDark ?? BG);
  paintBorder(ctx, opts.border ?? GOLD, 8);
  ctx.fillStyle = opts.fg ?? BONE;
  ctx.font = `bold ${opts.fontSize ?? 140}px 'Cinzel', 'Times New Roman', serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 6;
  const label = String(n);
  ctx.fillText(label, SIZE / 2, SIZE / 2 + 8);
  // underline for 6/9 distinction
  if (n === 6 || n === 9) {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = opts.fg ?? BONE;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(SIZE * 0.35, SIZE * 0.78);
    ctx.lineTo(SIZE * 0.65, SIZE * 0.78);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

/** D6 pip face (1–6). */
export function pipFace(n) {
  const key = `pip-${n}`;
  if (cache.has(key)) return cache.get(key);
  const c = canvas();
  const ctx = c.getContext('2d');
  paintBg(ctx);
  paintBorder(ctx, GOLD, 8);

  ctx.fillStyle = BONE;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  const r = 22;
  const grid = [
    [0.28, 0.28], [0.5, 0.28], [0.72, 0.28],
    [0.28, 0.5],  [0.5, 0.5],  [0.72, 0.5],
    [0.28, 0.72], [0.5, 0.72], [0.72, 0.72],
  ].map(([u, v]) => [u * SIZE, v * SIZE]);
  const layouts = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  for (const idx of layouts[n] ?? []) {
    const [x, y] = grid[idx];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

/** Blank face for a given colour. */
export function blankFace(tint = BG) {
  const key = `blank-${tint}`;
  if (cache.has(key)) return cache.get(key);
  const c = canvas();
  const ctx = c.getContext('2d');
  paintBg(ctx, tint, BG);
  paintBorder(ctx, GOLD, 6);
  const tex = new THREE.CanvasTexture(c);
  cache.set(key, tex);
  return tex;
}

/* ─── UW Attack ───────────────────────────────────────────────── */

function drawCrossedSwords(ctx) {
  ctx.strokeStyle = BONE;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(SIZE * 0.28, SIZE * 0.28);
  ctx.lineTo(SIZE * 0.72, SIZE * 0.72);
  ctx.moveTo(SIZE * 0.72, SIZE * 0.28);
  ctx.lineTo(SIZE * 0.28, SIZE * 0.72);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, 12, 0, Math.PI * 2);
  ctx.fill();
}

function drawHammer(ctx) {
  ctx.fillStyle = GOLD;
  ctx.strokeStyle = '#5a4410';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(SIZE * 0.22, SIZE * 0.28, SIZE * 0.56, SIZE * 0.22, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8a6a1a';
  ctx.fillRect(SIZE * 0.46, SIZE * 0.50, SIZE * 0.08, SIZE * 0.30);
}

function drawStarburst(ctx, colour = GOLD) {
  ctx.fillStyle = colour;
  ctx.strokeStyle = BONE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const cx = SIZE / 2, cy = SIZE / 2, R = 90, r = 38;
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : r;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawDagger(ctx) {
  ctx.strokeStyle = BONE;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(SIZE / 2, SIZE * 0.22);
  ctx.lineTo(SIZE / 2, SIZE * 0.78);
  ctx.moveTo(SIZE * 0.32, SIZE * 0.42);
  ctx.lineTo(SIZE * 0.68, SIZE * 0.42);
  ctx.stroke();
}

export function uwAttackFace(face) {
  const key = `uw-atk-${face}`;
  if (cache.has(key)) return cache.get(key);
  const c = canvas();
  const ctx = c.getContext('2d');
  paintBg(ctx, '#8a1c1c', '#3b0a0a');
  paintBorder(ctx, GOLD, 10);

  switch (face) {
    case 'Sword':   drawCrossedSwords(ctx); break;
    case 'Smash':   drawHammer(ctx); break;
    case 'Support': drawDagger(ctx); break;
    case 'Fury':    drawStarburst(ctx, '#ff9244'); break;
    default: // Blank
      ctx.strokeStyle = '#5a3030';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(SIZE * 0.32, SIZE / 2);
      ctx.lineTo(SIZE * 0.68, SIZE / 2);
      ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

/* ─── UW Defence ──────────────────────────────────────────────── */

function drawShield(ctx) {
  ctx.strokeStyle = BONE;
  ctx.lineWidth = 10;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(SIZE * 0.5, SIZE * 0.22);
  ctx.lineTo(SIZE * 0.78, SIZE * 0.34);
  ctx.lineTo(SIZE * 0.78, SIZE * 0.58);
  ctx.lineTo(SIZE * 0.5, SIZE * 0.78);
  ctx.lineTo(SIZE * 0.22, SIZE * 0.58);
  ctx.lineTo(SIZE * 0.22, SIZE * 0.34);
  ctx.closePath();
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(SIZE * 0.5, SIZE * 0.30);
  ctx.lineTo(SIZE * 0.5, SIZE * 0.70);
  ctx.moveTo(SIZE * 0.30, SIZE * 0.50);
  ctx.lineTo(SIZE * 0.70, SIZE * 0.50);
  ctx.stroke();
}

function drawDodge(ctx) {
  ctx.strokeStyle = '#a8d4ff';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(SIZE * 0.5, SIZE * 0.22);
  ctx.lineTo(SIZE * 0.78, SIZE * 0.5);
  ctx.lineTo(SIZE * 0.5, SIZE * 0.78);
  ctx.lineTo(SIZE * 0.22, SIZE * 0.5);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = '#a8d4ff';
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, 22, 0, Math.PI * 2);
  ctx.fill();
}

export function uwDefenceFace(face) {
  const key = `uw-def-${face}`;
  if (cache.has(key)) return cache.get(key);
  const c = canvas();
  const ctx = c.getContext('2d');
  paintBg(ctx, STEEL, '#0a1426');
  paintBorder(ctx, '#7090b0', 10);

  switch (face) {
    case 'Shield': drawShield(ctx); break;
    case 'Dodge':  drawDodge(ctx); break;
    default:
      ctx.strokeStyle = '#3a4a66';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(SIZE * 0.32, SIZE / 2);
      ctx.lineTo(SIZE * 0.68, SIZE / 2);
      ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

/* ─── UW Magic ────────────────────────────────────────────────── */

function drawLightning(ctx) {
  ctx.fillStyle = BONE;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(SIZE * 0.56, SIZE * 0.20);
  ctx.lineTo(SIZE * 0.36, SIZE * 0.52);
  ctx.lineTo(SIZE * 0.52, SIZE * 0.52);
  ctx.lineTo(SIZE * 0.44, SIZE * 0.82);
  ctx.lineTo(SIZE * 0.64, SIZE * 0.48);
  ctx.lineTo(SIZE * 0.50, SIZE * 0.48);
  ctx.lineTo(SIZE * 0.60, SIZE * 0.20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawFocus(ctx) {
  ctx.strokeStyle = BONE;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(SIZE / 2, SIZE / 2, SIZE * 0.30, SIZE * 0.18, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(SIZE / 2, SIZE / 2, SIZE * 0.15, SIZE * 0.09, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = BONE;
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, 10, 0, Math.PI * 2);
  ctx.fill();
}

export function uwMagicFace(face) {
  const key = `uw-mag-${face}`;
  if (cache.has(key)) return cache.get(key);
  const c = canvas();
  const ctx = c.getContext('2d');
  paintBg(ctx, PURPLE, '#140826');
  paintBorder(ctx, '#9070c0', 10);

  switch (face) {
    case 'Channel': drawLightning(ctx); break;
    case 'Focus':   drawFocus(ctx); break;
    case 'Crit':    drawStarburst(ctx, GOLD); break;
    default:
      ctx.strokeStyle = '#4a3866';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(SIZE * 0.32, SIZE / 2);
      ctx.lineTo(SIZE * 0.68, SIZE / 2);
      ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

export const COLOURS = { GOLD, BONE, BLOOD, STEEL, PURPLE, BG };
