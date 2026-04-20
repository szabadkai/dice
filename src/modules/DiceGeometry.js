/**
 * DiceGeometry.js
 * Die geometries + face-normal tables for snapping the settled die
 * to show a predetermined numeric result.
 *
 * For each die type we compute local-space face normals (unit vectors
 * pointing out from the die centre through each face centroid). After
 * physics settles, we pick whichever face is most "up" (normal · +Y
 * is maximal) and, if it doesn't match the target value, rotate the
 * mesh so the target face's normal points to +Y.
 */

'use strict';

import * as THREE from 'three';

const { Vector3, Quaternion } = THREE;

/* ─── Geometry builders ──────────────────────────────────────── */

/** Regular tetrahedron (D4). */
export function tetraGeometry(radius = 1) {
  return new THREE.TetrahedronGeometry(radius, 0);
}

/** Cube (D6). Subtle bevel via small chamfer wouldn't fit default BoxGeometry; use Box. */
export function cubeGeometry(size = 1) {
  return new THREE.BoxGeometry(size, size, size);
}

/** Octahedron (D8). */
export function octaGeometry(radius = 1) {
  return new THREE.OctahedronGeometry(radius, 0);
}

/** Dodecahedron (D12) — pentagons (3 tris per face). */
export function dodecaGeometry(radius = 1) {
  return new THREE.DodecahedronGeometry(radius, 0);
}

/** Icosahedron (D20). */
export function icosaGeometry(radius = 1) {
  return new THREE.IcosahedronGeometry(radius, 0);
}

/**
 * Pentagonal trapezohedron (D10). 10 congruent kite faces, arranged as
 * two staggered rings of 5 around an equator.
 * We build it as an indexed geometry with per-face material groups so
 * each kite can receive its own texture.
 */
export function trapezohedronGeometry(radius = 1) {
  const geom = new THREE.BufferGeometry();
  const top = [0, radius * 1.05, 0];
  const bot = [0, -radius * 1.05, 0];

  const R = radius;
  const ring = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const y = (i % 2 === 0 ? 1 : -1) * R * 0.35;
    const x = Math.cos(angle) * R * 0.9;
    const z = Math.sin(angle) * R * 0.9;
    ring.push([x, y, z]);
  }

  const vertices = [];
  const indices = [];
  // Each face is a kite: top (or bot) apex + two ring vertices + mid.
  // Easier: split each kite into 2 triangles sharing the ring edge.
  for (let i = 0; i < 10; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % 10];
    // Alternate: kite at even i uses top apex, at odd uses bot apex.
    const apex = (i % 2 === 0) ? top : bot;
    const opp  = (i % 2 === 0) ? bot : top;
    // Previous ring vertex — closes the kite on the equator side.
    const prev = ring[(i - 1 + 10) % 10];

    // Use triangle (apex, a, b) and (opp, b, a) to approximate the kite.
    // (This gives 20 triangles total → 10 faces of 2 triangles each.)
    const base = vertices.length / 3;
    vertices.push(...apex, ...a, ...b);
    vertices.push(...opp,  ...b, ...a);
    indices.push(base, base + 1, base + 2);
    indices.push(base + 3, base + 4, base + 5);
    geom.addGroup(indices.length - 6, 6, i); // material group = face index
  }
  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

/* ─── Face normal tables (local space, unit vectors) ─────────── */
/**
 * The order MUST match the order in which we assign material textures.
 * i.e. faceNormals[0] = normal of the face showing value 1, etc.
 */

// D4 — tetrahedron. Three.js TetrahedronGeometry vertices:
// (1,1,1), (-1,-1,1), (-1,1,-1), (1,-1,-1).
// The 4 faces have normals pointing opposite to the vertex not in the face.
// Sorted clockwise as drawn:
export const D4_NORMALS = [
  new Vector3( 1, 1, 1).normalize(),    // value 1
  new Vector3(-1,-1, 1).normalize(),    // value 2
  new Vector3(-1, 1,-1).normalize(),    // value 3
  new Vector3( 1,-1,-1).normalize(),    // value 4
];

// D6 — cube face normals. BoxGeometry material index order: +X,-X,+Y,-Y,+Z,-Z.
// Standard die: opposite faces sum to 7, so:
// +X=1, -X=6, +Y=2, -Y=5, +Z=3, -Z=4.
export const D6_FACE_TO_VALUE = [1, 6, 2, 5, 3, 4];
export const D6_NORMALS = [
  new Vector3( 1, 0, 0),  // material idx 0 → value 1
  new Vector3(-1, 0, 0),  // idx 1 → 6
  new Vector3( 0, 1, 0),  // idx 2 → 2
  new Vector3( 0,-1, 0),  // idx 3 → 5
  new Vector3( 0, 0, 1),  // idx 4 → 3
  new Vector3( 0, 0,-1),  // idx 5 → 4
];

// D8 — octahedron. 8 face normals: all permutations of ±1 in three coordinates
// where exactly one is nonzero? No — each face has equal components.
// Octahedron faces: normals point to (±1,±1,±1)/√3 — 8 combinations.
export const D8_NORMALS = [
  new Vector3( 1, 1, 1).normalize(),  // 1
  new Vector3(-1, 1, 1).normalize(),  // 2
  new Vector3( 1,-1, 1).normalize(),  // 3
  new Vector3(-1,-1, 1).normalize(),  // 4
  new Vector3( 1, 1,-1).normalize(),  // 5
  new Vector3(-1, 1,-1).normalize(),  // 6
  new Vector3( 1,-1,-1).normalize(),  // 7
  new Vector3(-1,-1,-1).normalize(),  // 8
];

// D12 — dodecahedron. 12 pentagonal face normals. Use the canonical set.
const PHI = (1 + Math.sqrt(5)) / 2;
const INV_PHI = 1 / PHI;
function d12Normals() {
  // Dodecahedron face centres (also normals) — 12 vectors.
  const raw = [
    [ 0,  1,  PHI], [ 0, -1,  PHI],
    [ 0,  1, -PHI], [ 0, -1, -PHI],
    [ PHI, 0,  1], [-PHI, 0,  1],
    [ PHI, 0, -1], [-PHI, 0, -1],
    [ 1,  PHI, 0], [-1,  PHI, 0],
    [ 1, -PHI, 0], [-1, -PHI, 0],
  ];
  return raw.map(v => new Vector3(...v).normalize());
}
export const D12_NORMALS = d12Normals();

// D20 — icosahedron, 20 triangular face normals.
function d20Normals() {
  // Compute from vertices of standard icosahedron.
  // Standard icosahedron vertices scaled:
  const V = [
    [-1,  PHI, 0], [ 1,  PHI, 0], [-1, -PHI, 0], [ 1, -PHI, 0],
    [ 0, -1,  PHI], [ 0,  1,  PHI], [ 0, -1, -PHI], [ 0,  1, -PHI],
    [ PHI, 0, -1], [ PHI, 0,  1], [-PHI, 0, -1], [-PHI, 0,  1],
  ];
  // Triangle indices (canonical icosahedron triangulation):
  const F = [
    [0,11, 5], [0, 5, 1], [0, 1, 7], [0, 7,10], [0,10,11],
    [1, 5, 9], [5,11, 4], [11,10, 2], [10,7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4,11], [6, 2,10], [8, 6, 7], [9, 8, 1],
  ];
  return F.map(([a, b, c]) => {
    const va = new Vector3(...V[a]);
    const vb = new Vector3(...V[b]);
    const vc = new Vector3(...V[c]);
    return va.add(vb).add(vc).divideScalar(3).normalize();
  });
}
export const D20_NORMALS = d20Normals();

// D10 — the pentagonal trapezohedron geometry we build. 10 faces alternate top/bottom rings.
function d10Normals() {
  const R = 1;
  const out = [];
  const top = new Vector3(0, R * 1.05, 0);
  const bot = new Vector3(0, -R * 1.05, 0);
  const ring = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const y = (i % 2 === 0 ? 1 : -1) * R * 0.35;
    const x = Math.cos(angle) * R * 0.9;
    const z = Math.sin(angle) * R * 0.9;
    ring.push(new Vector3(x, y, z));
  }
  for (let i = 0; i < 10; i++) {
    const apex = (i % 2 === 0) ? top : bot;
    const a = ring[i];
    const b = ring[(i + 1) % 10];
    const centroid = new Vector3()
      .add(apex).add(a).add(b)
      .divideScalar(3);
    out.push(centroid.normalize());
  }
  return out;
}
export const D10_NORMALS = d10Normals();

/* ─── Helpers ────────────────────────────────────────────────── */

/**
 * Returns the index of the face whose current world-space normal is
 * most aligned with world +Y.
 * @param {THREE.Mesh} mesh
 * @param {Vector3[]} localNormals
 */
export function indexOfUpFace(mesh, localNormals) {
  const q = mesh.quaternion;
  let bestIdx = 0;
  let bestDot = -Infinity;
  const up = new Vector3(0, 1, 0);
  const tmp = new Vector3();
  for (let i = 0; i < localNormals.length; i++) {
    tmp.copy(localNormals[i]).applyQuaternion(q);
    const d = tmp.dot(up);
    if (d > bestDot) { bestDot = d; bestIdx = i; }
  }
  return bestIdx;
}

/**
 * Returns a quaternion that, left-multiplied onto the mesh's current
 * quaternion, rotates `localNormal` to point at world +Y.
 *
 * correction = Quaternion( currentWorldNormal → +Y )
 * newQuaternion = correction * currentQuaternion
 */
export function correctionQuaternion(mesh, localNormal) {
  const current = localNormal.clone().applyQuaternion(mesh.quaternion);
  const target = new Vector3(0, 1, 0);
  return new Quaternion().setFromUnitVectors(current.normalize(), target);
}

/**
 * Returns the local-normal table for a given die type.
 * @param {string} type - 'D4'|'D6'|'D8'|'D10'|'D12'|'D20'|'D100'|'Custom'|'UW_ATK'|'UW_DEF'|'UW_MAG'
 */
export function normalsFor(type) {
  switch (type) {
    case 'D3': case 'D4': return D4_NORMALS;
    case 'D6': case 'UW_ATK': case 'UW_DEF': case 'UW_MAG': case 'Custom':
      return D6_NORMALS;
    case 'D8':  return D8_NORMALS;
    case 'D10': case 'D100': return D10_NORMALS;
    case 'D12': return D12_NORMALS;
    case 'D20': return D20_NORMALS;
    default:    return D6_NORMALS;
  }
}
