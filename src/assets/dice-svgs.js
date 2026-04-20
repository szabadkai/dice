/**
 * dice-svgs.js
 * Isometric pseudo-3D SVG templates used for die chips and the
 * non-WebGL fallback. Each die renders as the correct polyhedron
 * silhouette with gilded edges and top-down shading.
 *
 * Public API (unchanged): svgForResult + per-type exports.
 */

'use strict';

/* ─── Shared styling ─────────────────────────────────────────── */

const GOLD   = '#e2b714';
const GOLD_D = '#8a6a0a';
const METAL  = '#a8a097';
const INK    = '#0b0b14';
const BONE   = '#f5efdd';

const DEFS = `
  <defs>
    <linearGradient id="g-face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2d2d42"/>
      <stop offset="1" stop-color="#12121e"/>
    </linearGradient>
    <linearGradient id="g-side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1b1b2c"/>
      <stop offset="1" stop-color="#07070e"/>
    </linearGradient>
    <linearGradient id="g-edge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GOLD}"/>
      <stop offset="1" stop-color="${GOLD_D}"/>
    </linearGradient>
    <radialGradient id="g-hi" cx="0.35" cy="0.25" r="0.8">
      <stop offset="0" stop-color="rgba(255,255,255,0.22)"/>
      <stop offset="0.6" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    <linearGradient id="g-uw-atk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8a1c1c"/>
      <stop offset="1" stop-color="#3b0a0a"/>
    </linearGradient>
    <linearGradient id="g-uw-def" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1e3560"/>
      <stop offset="1" stop-color="#0a1426"/>
    </linearGradient>
    <linearGradient id="g-uw-mag" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a1e60"/>
      <stop offset="1" stop-color="#140826"/>
    </linearGradient>
  </defs>
`;

function wrap(inner, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" role="img" aria-label="${label}">${DEFS}${inner}</svg>`;
}

function labelText(label, size = 22, y = 48, fill = BONE) {
  return `<text x="40" y="${y}" text-anchor="middle" dominant-baseline="middle"
    font-family="'Cinzel', 'Times New Roman', serif" font-size="${size}" font-weight="700"
    fill="${fill}" style="paint-order:stroke;stroke:#000;stroke-width:0.6px;">${label}</text>`;
}

/* ─── Polyhedron silhouettes ─────────────────────────────────── */

/** Isometric tetrahedron (D4). Two visible faces + gold wireframe. */
function tetrahedron(label) {
  const front = `<polygon points="40,8 72,66 8,66" fill="url(#g-face)" stroke="url(#g-edge)" stroke-width="2" stroke-linejoin="round"/>`;
  const innerL = `<polygon points="40,8 40,52 8,66" fill="url(#g-side)" opacity="0.85"/>`;
  const innerR = `<polygon points="40,8 40,52 72,66" fill="url(#g-face)" opacity="0.55"/>`;
  const edges = `<line x1="40" y1="8" x2="40" y2="52" stroke="${GOLD}" stroke-width="1" opacity="0.6"/>
    <line x1="40" y1="52" x2="8" y2="66" stroke="${GOLD}" stroke-width="1" opacity="0.6"/>
    <line x1="40" y1="52" x2="72" y2="66" stroke="${GOLD}" stroke-width="1" opacity="0.6"/>`;
  const hi = `<polygon points="40,8 72,66 8,66" fill="url(#g-hi)"/>`;
  return front + innerL + innerR + edges + hi + labelText(label, 20, 56);
}

/** Isometric cube (D6). Three visible faces with pips or numbers. */
function cubeBody() {
  const top   = `<polygon points="40,6 70,18 40,30 10,18" fill="url(#g-face)" stroke="url(#g-edge)" stroke-width="1.8" stroke-linejoin="round"/>`;
  const left  = `<polygon points="10,18 40,30 40,72 10,60" fill="url(#g-side)" stroke="url(#g-edge)" stroke-width="1.8" stroke-linejoin="round"/>`;
  const right = `<polygon points="70,18 40,30 40,72 70,60" fill="url(#g-face)" stroke="url(#g-edge)" stroke-width="1.8" stroke-linejoin="round" opacity="0.92"/>`;
  return top + left + right;
}

/** Returns pip coordinates (cx, cy) mapped onto the top face of the iso cube. */
function pipsTop(n) {
  // Top-face corners: (40,6) top, (70,18) right, (40,30) bottom, (10,18) left.
  // Use a 3×3 grid in the rhombus, parameterised by u,v ∈ {0.25,0.5,0.75}.
  const P = (u, v) => {
    const x = 10 + (70 - 10) * ((u + v) / 2);
    const y = 6 + 24 * ((1 - u + v) / 2);
    return [x, y];
  };
  const layouts = {
    1: [[0.5, 0.5]],
    2: [[0.25, 0.25], [0.75, 0.75]],
    3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
    4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
    5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    6: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.5], [0.75, 0.5], [0.25, 0.75], [0.75, 0.75]],
  };
  return (layouts[n] ?? []).map(([u, v]) => P(u, v));
}

function cubeFaceWithPips(n) {
  const pips = pipsTop(n).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${BONE}"/>`).join('');
  return cubeBody() + pips;
}

function cubeFaceWithLabel(label) {
  return cubeBody() +
    `<text x="40" y="20" text-anchor="middle" dominant-baseline="middle"
      font-family="'Cinzel',serif" font-size="12" font-weight="700"
      fill="${BONE}" transform="skewX(-30) translate(11,0)">${label}</text>`;
}

/** Isometric octahedron (D8). Two triangular faces + ridge. */
function octahedron(label) {
  const top   = `<polygon points="40,6 72,40 40,40 8,40" fill="url(#g-face)" stroke="url(#g-edge)" stroke-width="1.8" stroke-linejoin="round"/>`;
  const bot   = `<polygon points="8,40 40,40 72,40 40,74" fill="url(#g-side)" stroke="url(#g-edge)" stroke-width="1.8" stroke-linejoin="round"/>`;
  const ridge = `<line x1="8" y1="40" x2="72" y2="40" stroke="${GOLD}" stroke-width="1" opacity="0.7"/>
    <line x1="40" y1="6" x2="40" y2="74" stroke="${GOLD}" stroke-width="0.8" opacity="0.5"/>`;
  const hi    = `<polygon points="40,6 72,40 40,40 8,40" fill="url(#g-hi)"/>`;
  return top + bot + ridge + hi + labelText(label, 20, 32);
}

/** Pentagonal trapezohedron (D10). Approximated by kite silhouette. */
function trapezohedron(label) {
  const upper = `<polygon points="40,4 68,30 40,44 12,30" fill="url(#g-face)" stroke="url(#g-edge)" stroke-width="1.8" stroke-linejoin="round"/>`;
  const lower = `<polygon points="12,30 40,44 68,30 54,70 26,70" fill="url(#g-side)" stroke="url(#g-edge)" stroke-width="1.8" stroke-linejoin="round"/>`;
  const edges = `<line x1="40" y1="4"  x2="40" y2="44" stroke="${GOLD}" stroke-width="0.8" opacity="0.5"/>
    <line x1="12" y1="30" x2="26" y2="70" stroke="${GOLD}" stroke-width="0.8" opacity="0.5"/>
    <line x1="68" y1="30" x2="54" y2="70" stroke="${GOLD}" stroke-width="0.8" opacity="0.5"/>`;
  const hi    = `<polygon points="40,4 68,30 40,44 12,30" fill="url(#g-hi)"/>`;
  return upper + lower + edges + hi + labelText(label, 18, 30);
}

/** Isometric dodecahedron (D12). Pentagon facing viewer + two hint sides. */
function dodecahedron(label) {
  const front = `<polygon points="40,6 72,28 60,68 20,68 8,28" fill="url(#g-face)" stroke="url(#g-edge)" stroke-width="1.8" stroke-linejoin="round"/>`;
  const hintL = `<polygon points="8,28 20,68 4,50" fill="url(#g-side)" opacity="0.7"/>`;
  const hintR = `<polygon points="72,28 60,68 76,50" fill="url(#g-side)" opacity="0.7"/>`;
  const hi    = `<polygon points="40,6 72,28 60,68 20,68 8,28" fill="url(#g-hi)"/>`;
  return front + hintL + hintR + hi + labelText(label, 20, 44);
}

/** Isometric icosahedron (D20). Front triangle + six surrounding triangles. */
function icosahedron(label) {
  const outer  = `<polygon points="40,4 74,24 74,56 40,76 6,56 6,24" fill="url(#g-side)" stroke="url(#g-edge)" stroke-width="1.8" stroke-linejoin="round"/>`;
  const center = `<polygon points="40,22 62,40 40,58 18,40" fill="url(#g-face)" stroke="${GOLD}" stroke-width="1.2" stroke-linejoin="round"/>`;
  const tris = `
    <line x1="40" y1="4"  x2="40" y2="22" stroke="${GOLD}" stroke-width="0.7" opacity="0.55"/>
    <line x1="40" y1="4"  x2="18" y2="40" stroke="${GOLD}" stroke-width="0.7" opacity="0.55"/>
    <line x1="40" y1="4"  x2="62" y2="40" stroke="${GOLD}" stroke-width="0.7" opacity="0.55"/>
    <line x1="6"  y1="24" x2="18" y2="40" stroke="${GOLD}" stroke-width="0.7" opacity="0.55"/>
    <line x1="74" y1="24" x2="62" y2="40" stroke="${GOLD}" stroke-width="0.7" opacity="0.55"/>
    <line x1="6"  y1="56" x2="18" y2="40" stroke="${GOLD}" stroke-width="0.7" opacity="0.55"/>
    <line x1="74" y1="56" x2="62" y2="40" stroke="${GOLD}" stroke-width="0.7" opacity="0.55"/>
    <line x1="40" y1="76" x2="40" y2="58" stroke="${GOLD}" stroke-width="0.7" opacity="0.55"/>
    <line x1="40" y1="76" x2="18" y2="40" stroke="${GOLD}" stroke-width="0.7" opacity="0.55"/>
    <line x1="40" y1="76" x2="62" y2="40" stroke="${GOLD}" stroke-width="0.7" opacity="0.55"/>`;
  const hi = `<polygon points="40,4 74,24 74,56 40,76 6,56 6,24" fill="url(#g-hi)"/>`;
  return outer + tris + center + hi + labelText(label, 18, 42);
}

/* ─── Exports: standard dice ─────────────────────────────────── */

export function svgD3(value)  { return wrap(tetrahedron(value ?? 'D3'),  `D3 showing ${value ?? 'D3'}`); }
export function svgD4(value)  { return wrap(tetrahedron(value ?? 'D4'),  `D4 showing ${value ?? 'D4'}`); }
export function svgD6(value)  {
  // pips if value is 1–6, otherwise label
  if (typeof value === 'number' && value >= 1 && value <= 6) {
    return wrap(cubeFaceWithPips(value), `D6 showing ${value}`);
  }
  return wrap(cubeFaceWithLabel(value ?? 'D6'), `D6 showing ${value ?? 'D6'}`);
}
export function svgD8(value)  { return wrap(octahedron(value ?? 'D8'),   `D8 showing ${value ?? 'D8'}`); }
export function svgD10(value) { return wrap(trapezohedron(value ?? 'D10'), `D10 showing ${value ?? 'D10'}`); }
export function svgD12(value) { return wrap(dodecahedron(value ?? 'D12'),  `D12 showing ${value ?? 'D12'}`); }
export function svgD20(value) { return wrap(icosahedron(value ?? 'D20'),   `D20 showing ${value ?? 'D20'}`); }
export function svgD100(value){ return wrap(trapezohedron(value ?? 'D%'),  `D100 showing ${value ?? 'D%'}`); }

/** Custom die — hexagonal silhouette with purple tint. */
export function svgCustom(value, sides) {
  const label = value ?? `D${sides ?? '?'}`;
  const body = `<polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="url(#g-face)" stroke="#a78bfa" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="url(#g-hi)"/>`;
  return wrap(body + labelText(label, 18, 44, '#e0d0ff'), `Custom die showing ${label}`);
}

/* ─── UW Attack (red body, gilded edge) ─────────────────────── */

function uwBody(gradId, edge) {
  return `<polygon points="40,6 70,18 40,30 10,18" fill="url(${gradId})" stroke="${edge}" stroke-width="1.8" stroke-linejoin="round"/>
    <polygon points="10,18 40,30 40,72 10,60" fill="url(${gradId})" stroke="${edge}" stroke-width="1.8" stroke-linejoin="round" opacity="0.8"/>
    <polygon points="70,18 40,30 40,72 70,60" fill="url(${gradId})" stroke="${edge}" stroke-width="1.8" stroke-linejoin="round" opacity="0.65"/>
    <polygon points="40,6 70,18 40,30 10,18" fill="url(#g-hi)"/>`;
}

function uwAtkSymbol(face) {
  // Drawn centred on the right face of the isometric cube (x≈55, y≈50).
  switch (face) {
    case 'Sword':
      return `<g transform="translate(55 50) skewY(26) scale(0.75)">
        <line x1="-10" y1="-12" x2="10" y2="12" stroke="${BONE}" stroke-width="2.2" stroke-linecap="round"/>
        <line x1="10" y1="-12" x2="-10" y2="12" stroke="${BONE}" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="0" cy="0" r="2" fill="${GOLD}"/>
      </g>`;
    case 'Smash':
      return `<g transform="translate(55 50) skewY(26) scale(0.8)">
        <rect x="-10" y="-6" width="20" height="8" rx="1.5" fill="${GOLD}" stroke="${INK}" stroke-width="0.6"/>
        <rect x="-1.5" y="2" width="3" height="11" fill="${GOLD}"/>
      </g>`;
    case 'Support':
      return `<g transform="translate(55 50) skewY(26) scale(0.75)">
        <line x1="0" y1="-14" x2="0" y2="12" stroke="${BONE}" stroke-width="2.4" stroke-linecap="round"/>
        <line x1="-7" y1="-4" x2="7" y2="-4" stroke="${BONE}" stroke-width="2" stroke-linecap="round"/>
        <polygon points="-3,-14 3,-14 0,-18" fill="${BONE}"/>
      </g>`;
    case 'Fury':
      return `<g transform="translate(55 50) skewY(26) scale(0.85)">
        <polygon points="0,-12 3.5,-3.5 13,-3.5 5.5,3 8.5,13 0,7 -8.5,13 -5.5,3 -13,-3.5 -3.5,-3.5" fill="#ff9244" stroke="${GOLD}" stroke-width="0.6"/>
      </g>`;
    default: // Blank
      return `<line x1="46" y1="54" x2="64" y2="46" stroke="#5a3030" stroke-width="2" stroke-linecap="round"/>`;
  }
}

export function svgUWAttack(face) {
  const body = uwBody('#g-uw-atk', '#c9a020');
  const mark = uwAtkSymbol(face);
  const tag = `<text x="40" y="18" text-anchor="middle" font-family="'Cinzel',serif" font-size="8" letter-spacing="1.5" font-weight="700" fill="#f3c050">ATK</text>`;
  return wrap(body + tag + mark, `UW Attack: ${face}`);
}

/* ─── UW Defence (blue body) ─────────────────────────────────── */

function uwDefSymbol(face) {
  switch (face) {
    case 'Shield':
      return `<g transform="translate(55 50) skewY(26) scale(0.8)">
        <path d="M0,-14 L12,-8 L12,4 L0,14 L-12,4 L-12,-8 Z" fill="none" stroke="${BONE}" stroke-width="2" stroke-linejoin="round"/>
        <line x1="0" y1="-10" x2="0" y2="10" stroke="${BONE}" stroke-width="1.2"/>
        <line x1="-8" y1="-2" x2="8" y2="-2" stroke="${BONE}" stroke-width="1.2"/>
      </g>`;
    case 'Dodge':
      return `<g transform="translate(55 50) skewY(26) scale(0.8)">
        <polygon points="0,-12 10,0 0,12 -10,0" fill="none" stroke="#a8d4ff" stroke-width="2"/>
        <circle cx="0" cy="0" r="3" fill="#a8d4ff"/>
      </g>`;
    default:
      return `<line x1="46" y1="54" x2="64" y2="46" stroke="#3a4a66" stroke-width="2" stroke-linecap="round"/>`;
  }
}

export function svgUWDefence(face) {
  const body = uwBody('#g-uw-def', '#7090b0');
  const mark = uwDefSymbol(face);
  const tag = `<text x="40" y="18" text-anchor="middle" font-family="'Cinzel',serif" font-size="8" letter-spacing="1.5" font-weight="700" fill="#a8c4e0">DEF</text>`;
  return wrap(body + tag + mark, `UW Defence: ${face}`);
}

/* ─── UW Magic (purple body) ─────────────────────────────────── */

function uwMagSymbol(face) {
  switch (face) {
    case 'Channel':
      return `<g transform="translate(55 50) skewY(26) scale(0.8)">
        <polygon points="2,-12 -6,2 -1,2 -4,12 6,-2 1,-2 4,-12" fill="${BONE}" stroke="${GOLD}" stroke-width="0.5"/>
      </g>`;
    case 'Focus':
      return `<g transform="translate(55 50) skewY(26) scale(0.8)">
        <ellipse cx="0" cy="0" rx="14" ry="8" fill="none" stroke="${BONE}" stroke-width="1.6"/>
        <ellipse cx="0" cy="0" rx="7"  ry="4" fill="none" stroke="${BONE}" stroke-width="1.2"/>
        <circle cx="0" cy="0" r="2.5" fill="${BONE}"/>
      </g>`;
    case 'Crit':
      return `<g transform="translate(55 50) skewY(26) scale(0.85)">
        <polygon points="0,-12 3.5,-3.5 13,-3.5 5.5,3 8.5,13 0,7 -8.5,13 -5.5,3 -13,-3.5 -3.5,-3.5" fill="${GOLD}" stroke="#fff7cc" stroke-width="0.6"/>
      </g>`;
    default:
      return `<line x1="46" y1="54" x2="64" y2="46" stroke="#4a3866" stroke-width="2" stroke-linecap="round"/>`;
  }
}

export function svgUWMagic(face) {
  const body = uwBody('#g-uw-mag', '#9070c0');
  const mark = uwMagSymbol(face);
  const tag = `<text x="40" y="18" text-anchor="middle" font-family="'Cinzel',serif" font-size="8" letter-spacing="1.5" font-weight="700" fill="#c4a0f0">MAG</text>`;
  return wrap(body + tag + mark, `UW Magic: ${face}`);
}

/* ─── Dispatcher ─────────────────────────────────────────────── */

/**
 * Returns the appropriate SVG string for a roll result.
 * @param {{type: string, numeric: number, face: string|null, sides?: number}} result
 * @returns {string}
 */
export function svgForResult(result) {
  const { type, numeric, face, sides } = result;
  switch (type) {
    case 'D3':     return svgD3(numeric);
    case 'D4':     return svgD4(numeric);
    case 'D6':     return svgD6(numeric);
    case 'D8':     return svgD8(numeric);
    case 'D10':    return svgD10(numeric);
    case 'D12':    return svgD12(numeric);
    case 'D20':    return svgD20(numeric);
    case 'D100':   return svgD100(numeric);
    case 'Custom': return svgCustom(numeric, sides);
    case 'UW_ATK': return svgUWAttack(face);
    case 'UW_DEF': return svgUWDefence(face);
    case 'UW_MAG': return svgUWMagic(face);
    default:       return svgD6(numeric);
  }
}
