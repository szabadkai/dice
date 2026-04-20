/**
 * Dice3DRenderer.js
 * WebGL dice renderer powered by Three.js + cannon-es physics.
 *
 * Flow:
 *   1. init(canvas, tray) — set up scene, camera, lights, physics world,
 *      floor + walls sized to match the tray.
 *   2. rollAll(results, threshold, callbacks) — spawn a die mesh + body
 *      per result, drop them with random velocity/torque, simulate until
 *      they settle, then snap each die's orientation so the predetermined
 *      face is upward.
 *   3. highlightDice(results) — updates emissive outlines for
 *      locked/selected/critical/fumble states.
 */

'use strict';

import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import {
  cubeGeometry, tetraGeometry, octaGeometry,
  dodecaGeometry, icosaGeometry, trapezohedronGeometry,
  D6_NORMALS, D8_NORMALS, D12_NORMALS, D20_NORMALS, D10_NORMALS, D4_NORMALS,
  indexOfUpFace, correctionQuaternion, normalsFor,
} from './DiceGeometry.js';

import {
  numericFace, pipFace, blankFace,
  uwAttackFace, uwDefenceFace, uwMagicFace,
  COLOURS,
} from './DiceTextures.js';

/* ─── State ──────────────────────────────────────────────────── */

let renderer, scene, camera, world;
let floorMesh, floorBody;
let wallBodies = [];
let trayEl, canvasEl;
let dice = [];           // { mesh, body, result, index }
let raycaster, pointer;
let animId = null;
let resizeObserver = null;
let onSelect = null;
let onLock = null;
let threshold = 0;

const TRAY_DEPTH = 6;      // world units
const DIE_SIZE   = 0.8;
const GRAVITY    = -28;
const SETTLE_MS  = 2200;
const SNAP_MS    = 260;

/* ─── Public API ─────────────────────────────────────────────── */

export function isWebGLAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

/**
 * Initialises the 3D tray. Safe to call multiple times; rebuilds if
 * the canvas element changes.
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} tray - the wrapper element (for size).
 */
export function init(canvas, tray) {
  if (renderer) dispose();
  canvasEl = canvas;
  trayEl = tray;

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = null;

  const { width, height } = sizeFromTray();
  const aspect = width / Math.max(1, height);
  camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 100);
  camera.position.set(0, 9, 0.1);
  camera.lookAt(0, 0, 0);

  /* ── Lights ── */
  const hemi = new THREE.HemisphereLight(0xbfbfff, 0x101020, 0.35);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffe8b0, 1.1);
  key.position.set(-3, 8, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4466aa, 0.4);
  rim.position.set(4, 6, -4);
  scene.add(rim);

  /* ── Floor (visible) ── */
  const floorGeom = new THREE.PlaneGeometry(TRAY_DEPTH * 2, TRAY_DEPTH * 2);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x15131a,
    roughness: 0.95,
    metalness: 0.1,
  });
  floorMesh = new THREE.Mesh(floorGeom, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // decorative gilded ring
  const ringGeom = new THREE.RingGeometry(TRAY_DEPTH * 0.95, TRAY_DEPTH * 1.0, 64);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xe2b714,
    emissive: 0x2a1c00,
    metalness: 0.9,
    roughness: 0.35,
    side: THREE.DoubleSide,
  });
  const ringMesh = new THREE.Mesh(ringGeom, ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.001;
  scene.add(ringMesh);

  /* ── Physics world ── */
  world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0) });
  world.broadphase = new CANNON.NaiveBroadphase();
  world.defaultContactMaterial.friction = 0.35;
  world.defaultContactMaterial.restitution = 0.3;
  world.allowSleep = true;

  // Floor body
  floorBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
  });
  floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floorBody);

  // Walls
  buildWalls();

  /* ── Raycaster for selection ── */
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);

  /* ── Resize handling ── */
  handleResize();
  resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(tray);

  // Start render loop
  loop();
}

export function dispose() {
  if (animId) cancelAnimationFrame(animId);
  animId = null;
  clearDice();
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null; }
  if (canvasEl) {
    canvasEl.removeEventListener('pointerdown', onPointerDown);
    canvasEl.removeEventListener('pointerup', onPointerUp);
  }
  if (renderer) renderer.dispose();
  renderer = null;
  scene = null;
  world = null;
}

/**
 * Rolls all dice.
 * @param {Array} results - roll results from DiceEngine.rollPool
 * @param {number} thresh - success threshold (for emissive coloring)
 * @param {{onToggleLock: Function, onToggleSelect: Function}} callbacks
 * @returns {Promise<void>} resolves once all dice have settled + snapped
 */
export async function rollAll(results, thresh, callbacks = {}) {
  if (!renderer) return;
  threshold = thresh;
  onSelect = callbacks.onToggleSelect || null;
  onLock   = callbacks.onToggleLock   || null;

  clearDice();
  for (let i = 0; i < results.length; i++) {
    spawnDie(results[i], i);
  }

  // Simulate until settle or timeout
  await waitForSettle();

  // Snap each die so its target face is up
  for (const d of dice) {
    snapTargetFaceUp(d);
  }

  // Apply per-die highlights now that orientation is final
  highlightAll();
}

/**
 * Updates emissive outlines to reflect current result state
 * (selected / locked / critical / fumble / success / fail).
 * Call this from main.js on every render pass that isn't a roll.
 * @param {Array} results
 * @param {number} thresh
 */
export function refreshHighlights(results, thresh) {
  if (!renderer || !results) return;
  threshold = thresh;
  for (let i = 0; i < dice.length; i++) {
    if (results[i]) dice[i].result = results[i];
  }
  highlightAll();
}

/** Particle burst centre coordinates in CSS pixels relative to tray. */
export function worldToTrayPx(dieIndex) {
  const d = dice[dieIndex];
  if (!d || !trayEl) return null;
  const v = d.mesh.position.clone().project(camera);
  const rect = trayEl.getBoundingClientRect();
  return {
    x: (v.x * 0.5 + 0.5) * rect.width,
    y: (-v.y * 0.5 + 0.5) * rect.height,
  };
}

/* ─── Internals: rendering loop ──────────────────────────────── */

function loop() {
  animId = requestAnimationFrame(loop);
  if (world) world.step(1 / 60);
  for (const d of dice) {
    d.mesh.position.copy(d.body.position);
    d.mesh.quaternion.copy(d.body.quaternion);
  }
  if (renderer && scene && camera) renderer.render(scene, camera);
}

/* ─── Internals: tray walls ─────────────────────────────────── */

function buildWalls() {
  for (const b of wallBodies) world.removeBody(b);
  wallBodies = [];
  const h = 3; // wall height
  const pad = 0.15;
  const halfW = TRAY_DEPTH * 0.95;
  const halfD = TRAY_DEPTH * 0.6;

  const walls = [
    { pos: [ 0, h / 2,  halfD], rot: [0, 0, 0] },
    { pos: [ 0, h / 2, -halfD], rot: [0, Math.PI, 0] },
    { pos: [ halfW, h / 2, 0], rot: [0, -Math.PI / 2, 0] },
    { pos: [-halfW, h / 2, 0], rot: [0,  Math.PI / 2, 0] },
  ];
  for (const w of walls) {
    const body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    body.position.set(...w.pos);
    body.quaternion.setFromEuler(...w.rot);
    world.addBody(body);
    wallBodies.push(body);
  }
  void pad;
}

/* ─── Internals: die factory ─────────────────────────────────── */

function materialsFor(result) {
  const { type, sides } = result;
  const pal = palette(type);

  switch (type) {
    case 'D6':
      return [1, 6, 2, 5, 3, 4].map(v => new THREE.MeshStandardMaterial({
        map: pipFace(v), roughness: 0.55, metalness: 0.2, color: 0xffffff,
      }));
    case 'D4':
    case 'D3':
      return makeNumericMats(4, pal);
    case 'D8':
      return makeNumericMats(8, pal);
    case 'D10':
      return makeNumericMats(10, pal, { zero: true });
    case 'D100':
      return makeD100Mats(pal);
    case 'D12':
      return makeNumericMats(12, pal);
    case 'D20':
      return makeNumericMats(20, pal);
    case 'Custom': {
      const n = sides || 6;
      return makeNumericMats(Math.min(n, 20), { bg: '#2a1a4a', border: '#a78bfa' });
    }
    case 'UW_ATK':
      return uwFaces('atk');
    case 'UW_DEF':
      return uwFaces('def');
    case 'UW_MAG':
      return uwFaces('mag');
    default:
      return makeNumericMats(sides || 6, pal);
  }
}

function palette(type) {
  switch (type) {
    case 'UW_ATK': return { bg: '#8a1c1c', border: '#e2b714' };
    case 'UW_DEF': return { bg: '#1e3560', border: '#7090b0' };
    case 'UW_MAG': return { bg: '#3a1e60', border: '#9070c0' };
    default:       return { bg: '#1c1c2e', border: '#e2b714' };
  }
}

function makeNumericMats(n, pal, opts = {}) {
  const mats = [];
  for (let v = 1; v <= n; v++) {
    const label = opts.zero && v === 10 ? '0' : String(v);
    mats.push(new THREE.MeshStandardMaterial({
      map: numericFace(label, { bg: pal.bg, border: pal.border, fontSize: 140 }),
      roughness: 0.55, metalness: 0.25, color: 0xffffff,
    }));
  }
  return mats;
}

function makeD100Mats(pal) {
  const mats = [];
  for (let v = 0; v < 10; v++) {
    const label = v === 0 ? '00' : `${v * 10}`;
    mats.push(new THREE.MeshStandardMaterial({
      map: numericFace(label, { bg: pal.bg, border: pal.border, fontSize: 100 }),
      roughness: 0.55, metalness: 0.25, color: 0xffffff,
    }));
  }
  return mats;
}

function uwFaces(kind) {
  // UW dice are cubes — six faces. Use the actual face labels.
  const palettes = {
    atk: { faces: ['Sword', 'Blank', 'Smash', 'Support', 'Fury', 'Blank'], tex: uwAttackFace },
    def: { faces: ['Shield', 'Blank', 'Dodge', 'Shield', 'Blank', 'Dodge'], tex: uwDefenceFace },
    mag: { faces: ['Channel', 'Blank', 'Focus', 'Crit', 'Blank', 'Channel'], tex: uwMagicFace },
  };
  const p = palettes[kind];
  return p.faces.map(f => new THREE.MeshStandardMaterial({
    map: p.tex(f), roughness: 0.55, metalness: 0.25, color: 0xffffff,
  }));
}

/** Assigns `group` indices to a BufferGeometry so each triangle's
 *  closest-matching face normal gets its own material slot. Handles
 *  both indexed and non-indexed geometry. */
function groupifyGeometry(geom, normals) {
  if (geom.groups && geom.groups.length) return;

  const pos = geom.attributes.position;
  const idx = geom.index;

  const tmp = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();

  const triangles = idx ? (idx.count / 3) : (pos.count / 3);
  const get = (t, k) => {
    const i = idx ? idx.getX(t * 3 + k) : (t * 3 + k);
    return i;
  };

  geom.clearGroups();
  for (let t = 0; t < triangles; t++) {
    a.fromBufferAttribute(pos, get(t, 0));
    b.fromBufferAttribute(pos, get(t, 1));
    c.fromBufferAttribute(pos, get(t, 2));
    tmp.copy(a).add(b).add(c).divideScalar(3).normalize();
    let best = 0, bestDot = -Infinity;
    for (let n = 0; n < normals.length; n++) {
      const d = tmp.dot(normals[n]);
      if (d > bestDot) { bestDot = d; best = n; }
    }
    geom.addGroup(t * 3, 3, best);
  }
}

function buildMesh(result) {
  const materials = materialsFor(result);
  let geom;
  const size = DIE_SIZE;
  switch (result.type) {
    case 'D4': case 'D3': geom = tetraGeometry(size);   groupifyGeometry(geom, D4_NORMALS);  break;
    case 'D8':            geom = octaGeometry(size);    groupifyGeometry(geom, D8_NORMALS);  break;
    case 'D10':           geom = trapezohedronGeometry(size * 0.9); break;
    case 'D100':          geom = trapezohedronGeometry(size * 0.95); break;
    case 'D12':           geom = dodecaGeometry(size * 0.85); groupifyGeometry(geom, D12_NORMALS); break;
    case 'D20':           geom = icosaGeometry(size * 0.9);   groupifyGeometry(geom, D20_NORMALS); break;
    case 'Custom':        geom = cubeGeometry(size); break;
    default:              geom = cubeGeometry(size); break; // D6 + UW
  }
  geom.computeVertexNormals();
  const mesh = new THREE.Mesh(geom, materials);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  return mesh;
}

function buildBody(result) {
  const s = DIE_SIZE;
  let shape;
  switch (result.type) {
    case 'D4': case 'D3':
      shape = tetraShape(s); break;
    case 'D8':
      shape = new CANNON.Sphere(s * 0.65); break; // octa approx by sphere for stable physics
    case 'D10': case 'D100':
      shape = new CANNON.Sphere(s * 0.75); break;
    case 'D12':
      shape = new CANNON.Sphere(s * 0.85); break;
    case 'D20':
      shape = new CANNON.Sphere(s * 0.9); break;
    default: // D6, Custom, UW
      shape = new CANNON.Box(new CANNON.Vec3(s / 2, s / 2, s / 2));
  }
  const body = new CANNON.Body({ mass: 1, shape, allowSleep: true, sleepSpeedLimit: 0.18, sleepTimeLimit: 0.4 });
  return body;
}

function tetraShape(s) {
  const v = [
    new CANNON.Vec3( s,  s,  s),
    new CANNON.Vec3(-s, -s,  s),
    new CANNON.Vec3(-s,  s, -s),
    new CANNON.Vec3( s, -s, -s),
  ];
  const faces = [
    [0, 1, 2],
    [0, 3, 1],
    [0, 2, 3],
    [1, 3, 2],
  ];
  return new CANNON.ConvexPolyhedron({ vertices: v, faces });
}

/* ─── Internals: spawn / clear ──────────────────────────────── */

function spawnDie(result, index) {
  const mesh = buildMesh(result);
  const body = buildBody(result);

  // Random start — above and to one side
  const startX = (Math.random() - 0.5) * 3;
  const startZ = -2 + (Math.random() - 0.5) * 2;
  const startY = 4 + Math.random() * 1.2;
  body.position.set(startX, startY, startZ);
  body.velocity.set(
    (Math.random() - 0.5) * 3,
    -4 - Math.random() * 2,
    4 + Math.random() * 3,  // launch toward centre
  );
  body.angularVelocity.set(
    (Math.random() - 0.5) * 18,
    (Math.random() - 0.5) * 18,
    (Math.random() - 0.5) * 18,
  );
  body.quaternion.setFromEuler(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
  );

  world.addBody(body);
  scene.add(mesh);
  dice.push({ mesh, body, result, index });
}

function clearDice() {
  for (const d of dice) {
    world.removeBody(d.body);
    scene.remove(d.mesh);
    d.mesh.geometry.dispose();
    (Array.isArray(d.mesh.material) ? d.mesh.material : [d.mesh.material]).forEach(m => m.dispose());
    if (d.outline) scene.remove(d.outline);
  }
  dice = [];
}

/* ─── Internals: settle + snap ──────────────────────────────── */

function waitForSettle() {
  return new Promise(resolve => {
    const t0 = performance.now();
    function check() {
      const allSleeping = dice.every(d => d.body.sleepState === CANNON.Body.SLEEPING);
      const elapsed = performance.now() - t0;
      if (allSleeping || elapsed > SETTLE_MS) return resolve();
      requestAnimationFrame(check);
    }
    check();
  });
}

function snapTargetFaceUp(d) {
  const { mesh, result } = d;
  const normals = normalsFor(result.type);
  if (!normals || !result) return;

  // Compute which local-face-index we want pointing up. For D6 we have
  // a numeric→face mapping via opposite-sides-sum-to-7; for everything
  // else we treat value `numeric` as face index `numeric - 1` (since
  // material groups were assigned in value order).
  let targetFaceIdx;
  if (result.type === 'D6') {
    // D6_FACE_TO_VALUE[materialIdx] = value, so we need inverse.
    const valueToIdx = { 1: 0, 6: 1, 2: 2, 5: 3, 3: 4, 4: 5 };
    targetFaceIdx = valueToIdx[result.numeric] ?? 0;
  } else if (result.type === 'UW_ATK' || result.type === 'UW_DEF' || result.type === 'UW_MAG') {
    // UW dice don't need a target snap — any face is fine; face textures
    // already include the drawn face result. Skip snap.
    return;
  } else if (result.type === 'D100') {
    targetFaceIdx = Math.floor(result.numeric / 10) % 10;
  } else {
    targetFaceIdx = Math.max(0, Math.min(normals.length - 1, result.numeric - 1));
  }

  const local = normals[targetFaceIdx];
  if (!local) return;
  const correction = correctionQuaternion(mesh, local);
  const startQ = mesh.quaternion.clone();
  const endQ = correction.multiply(startQ.clone());

  // Freeze the physics body during snap so it doesn't wake up mid-tween.
  d.body.type = CANNON.Body.STATIC;
  d.body.velocity.setZero();
  d.body.angularVelocity.setZero();

  const t0 = performance.now();
  function tween() {
    const t = Math.min(1, (performance.now() - t0) / SNAP_MS);
    const q = new THREE.Quaternion().copy(startQ).slerp(endQ, smoothstep(t));
    mesh.quaternion.copy(q);
    d.body.quaternion.copy(q);
    if (t < 1) requestAnimationFrame(tween);
  }
  tween();
}

function smoothstep(t) { return t * t * (3 - 2 * t); }

/* ─── Internals: highlights (emissive outlines) ─────────────── */

function highlightAll() {
  for (const d of dice) {
    const r = d.result;
    if (!r) continue;
    const isUW = r.type === 'UW_ATK' || r.type === 'UW_DEF' || r.type === 'UW_MAG';
    const isMax = !isUW && r.sides && r.numeric === r.sides;
    const isMin = !isUW && r.sides && r.sides > 1 && r.numeric === 1;
    const isSuccess = threshold > 0 && r.numeric >= threshold;
    const isFail    = threshold > 0 && !isUW && r.numeric < threshold;

    let colour = 0x000000;
    if (r.locked)       colour = 0xa78bfa;
    else if (r.selected) colour = 0xe2b714;
    else if (isMax)     colour = 0xe2b714;
    else if (isMin)     colour = 0xf87171;
    else if (isSuccess) colour = 0x4ade80;
    else if (isFail)    colour = 0x7a2020;

    applyEmissive(d.mesh, colour, (r.locked || r.selected || isMax) ? 0.45 : 0.22);
  }
}

function applyEmissive(mesh, colour, intensity) {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const m of mats) {
    if (!m.emissive) continue;
    m.emissive.setHex(colour);
    m.emissiveIntensity = colour === 0 ? 0 : intensity;
  }
}

/* ─── Internals: selection raycasting ────────────────────────── */

let pointerDown = null;
let pointerDownAt = 0;
let longPressTimer = null;

function onPointerDown(e) {
  pointerDown = { x: e.clientX, y: e.clientY };
  pointerDownAt = performance.now();
  const idx = pickDieIndex(e);
  if (idx === -1) return;
  longPressTimer = setTimeout(() => {
    longPressTimer = null;
    if (onLock) onLock(idx);
  }, 500);
}

function onPointerUp(e) {
  if (!pointerDown) return;
  if (longPressTimer) clearTimeout(longPressTimer);
  longPressTimer = null;
  const dx = e.clientX - pointerDown.x;
  const dy = e.clientY - pointerDown.y;
  const dist2 = dx * dx + dy * dy;
  pointerDown = null;
  if (dist2 < 64 && performance.now() - pointerDownAt < 450) {
    const idx = pickDieIndex(e);
    if (idx !== -1 && onSelect) onSelect(idx);
  }
}

function pickDieIndex(e) {
  if (!canvasEl || !camera) return -1;
  const rect = canvasEl.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(dice.map(d => d.mesh), false);
  if (!hits.length) return -1;
  const hit = hits[0].object;
  return dice.findIndex(d => d.mesh === hit);
}

/* ─── Internals: resize ─────────────────────────────────────── */

function sizeFromTray() {
  if (!trayEl) return { width: 600, height: 300 };
  const rect = trayEl.getBoundingClientRect();
  return { width: rect.width || 600, height: rect.height || 300 };
}

function handleResize() {
  if (!renderer || !camera) return;
  const { width, height } = sizeFromTray();
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
}

/* ─── Celebrations ───────────────────────────────────────────── */

let shakeT = 0;
export function shakeCamera(ms = 500) {
  shakeT = ms;
  const t0 = performance.now();
  (function tick() {
    const elapsed = performance.now() - t0;
    const remaining = Math.max(0, ms - elapsed);
    const strength = (remaining / ms) * 0.25;
    if (camera) {
      camera.position.x = (Math.random() - 0.5) * strength;
      camera.position.z = 0.1 + (Math.random() - 0.5) * strength;
      camera.lookAt(0, 0, 0);
    }
    if (remaining > 0) requestAnimationFrame(tick);
    else if (camera) { camera.position.set(0, 9, 0.1); camera.lookAt(0, 0, 0); }
  })();
  void shakeT;
}

export { COLOURS };
