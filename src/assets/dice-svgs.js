/**
 * dice-svgs.js
 * Inline SVG templates for all die faces.
 * Faithful to Warhammer dice aesthetics:
 * - Standard dice: black body, white numbers (like GW box dice)
 * - UW Attack dice: dark red body, gold edge, clean SVG symbols
 * - UW Defence dice: dark blue body, steel edge, clean SVG symbols
 * - UW Magic dice: purple body, silver edge, clean SVG symbols
 */

'use strict';

/**
 * Builds a generic numbered die SVG.
 * Warhammer-faithful defaults: black body, white numbers.
 * @param {string} shape - 'square'|'diamond'|'hexagon'|'circle'|'triangle'
 * @param {string|number} label - Text to display in centre.
 * @param {string} [fill='#111111'] - Shape fill colour.
 * @param {string} [stroke='#444444'] - Shape stroke colour.
 * @param {string} [textFill='#ffffff'] - Text fill colour.
 * @returns {string} SVG markup string.
 */
function buildSVG(shape, label, fill = '#111111', stroke = '#444444', textFill = '#ffffff') {
  const w = 80;
  const h = 80;
  let shapePath = '';

  switch (shape) {
    case 'triangle': // D4
      shapePath = `<polygon points="40,6 74,70 6,70" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`;
      break;
    case 'square':   // D6
      shapePath = `<rect x="5" y="5" width="70" height="70" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`;
      break;
    case 'diamond':  // D8 / D10
      shapePath = `<polygon points="40,4 76,40 40,76 4,40" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`;
      break;
    case 'hexagon':  // D12
      shapePath = `<polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`;
      break;
    case 'circle':   // D20 / D100
      shapePath = `<circle cx="40" cy="40" r="36" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`;
      break;
    default:
      shapePath = `<rect x="5" y="5" width="70" height="70" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Die showing ${label}">
  ${shapePath}
  <text x="40" y="47" text-anchor="middle" dominant-baseline="middle"
    font-family="system-ui,sans-serif" font-size="22" font-weight="bold"
    fill="${textFill}">${label}</text>
</svg>`;
}

/** D3 die SVG (triangle, 3 sides). */
export function svgD3(value) {
  return buildSVG('triangle', value ?? 'D3');
}

/** D4 die SVG. */
export function svgD4(value) {
  return buildSVG('triangle', value ?? 'D4');
}

/** D6 die SVG. */
export function svgD6(value) {
  return buildSVG('square', value ?? 'D6');
}

/** D8 die SVG. */
export function svgD8(value) {
  return buildSVG('diamond', value ?? 'D8');
}

/** D10 die SVG. */
export function svgD10(value) {
  return buildSVG('diamond', value ?? 'D10');
}

/** D12 die SVG. */
export function svgD12(value) {
  return buildSVG('hexagon', value ?? 'D12');
}

/** D20 die SVG. */
export function svgD20(value) {
  return buildSVG('circle', value ?? 'D20');
}

/** D100 die SVG. */
export function svgD100(value) {
  return buildSVG('circle', value ?? 'D%');
}

/** Custom die SVG. */
export function svgCustom(value, sides) {
  const label = value ?? `D${sides ?? '?'}`;
  return buildSVG('hexagon', label, '#1a1a2e', '#7c5cbf', '#d4b8ff');
}

/* ─── UW Attack Die SVG Symbols ──────────────────────────────── */

/**
 * Returns SVG elements for a UW Attack symbol.
 * Uses proper SVG paths instead of emoji for reliable cross-platform rendering.
 */
function uwAtkSymbol(face) {
  switch (face) {
    case 'Sword':
      // Crossed swords
      return `<line x1="30" y1="36" x2="50" y2="58" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="50" y1="36" x2="30" y2="58" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        <polygon points="28,34 32,30 34,36" fill="#ffffff"/>
        <polygon points="48,34 52,30 46,36" fill="#ffffff"/>`;
    case 'Smash':
      // Hammer
      return `<rect x="29" y="36" width="22" height="8" rx="2" fill="#ffcc00"/>
        <line x1="40" y1="44" x2="40" y2="58" stroke="#ffcc00" stroke-width="4" stroke-linecap="round"/>`;
    case 'Support':
      // Single sword / dagger
      return `<line x1="40" y1="34" x2="40" y2="58" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="33" y1="46" x2="47" y2="46" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
        <polygon points="38,34 40,30 42,34" fill="#ffffff"/>`;
    case 'Fury':
      // 5-pointed starburst
      return `<polygon points="40,32 43,43 54,43 46,50 49,60 40,54 31,60 34,50 26,43 37,43" fill="#ff8844"/>`;
    default: // Blank
      return `<line x1="30" y1="48" x2="50" y2="48" stroke="#666666" stroke-width="2.5" stroke-linecap="round"/>`;
  }
}

/**
 * Warhammer Underworlds Attack die face SVG.
 * Dark red body with gold edge — faithful to the original red UW attack dice.
 * @param {string} face - e.g. 'Blank', 'Smash', 'Sword', 'Support', 'Fury'
 * @param {number} numeric - raw numeric result (1–6)
 * @returns {string}
 */
export function svgUWAttack(face, numeric) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" role="img" aria-label="UW Attack: ${face}">
  <rect x="5" y="5" width="70" height="70" rx="12" fill="#6e1818" stroke="#c9a020" stroke-width="2.5"/>
  <text x="40" y="26" text-anchor="middle" dominant-baseline="middle"
    font-size="10" font-family="system-ui,sans-serif" font-weight="bold"
    letter-spacing="0.08em" fill="#cc9920">ATK</text>
  ${uwAtkSymbol(face)}
</svg>`;
}

/* ─── UW Defence Die SVG Symbols ─────────────────────────────── */

/**
 * Returns SVG elements for a UW Defence symbol.
 */
function uwDefSymbol(face) {
  switch (face) {
    case 'Shield':
      // Shield shape with cross
      return `<path d="M40,34 L54,40 L54,50 L40,60 L26,50 L26,40 Z" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
        <line x1="40" y1="38" x2="40" y2="56" stroke="#ffffff" stroke-width="1.5"/>
        <line x1="30" y1="46" x2="50" y2="46" stroke="#ffffff" stroke-width="1.5"/>`;
    case 'Dodge':
      // Diamond with inner dot
      return `<polygon points="40,34 52,47 40,60 28,47" fill="none" stroke="#88ccff" stroke-width="2.5"/>
        <circle cx="40" cy="47" r="3.5" fill="#88ccff"/>`;
    default: // Blank
      return `<line x1="30" y1="48" x2="50" y2="48" stroke="#445566" stroke-width="2.5" stroke-linecap="round"/>`;
  }
}

/**
 * Warhammer Underworlds Defence die face SVG.
 * Dark blue body with steel edge — faithful to the original blue/grey UW defence dice.
 * @param {string} face - e.g. 'Blank', 'Shield', 'Dodge'
 * @param {number} numeric - raw numeric result (1–6)
 * @returns {string}
 */
export function svgUWDefence(face, numeric) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" role="img" aria-label="UW Defence: ${face}">
  <rect x="5" y="5" width="70" height="70" rx="12" fill="#152848" stroke="#7090b0" stroke-width="2.5"/>
  <text x="40" y="26" text-anchor="middle" dominant-baseline="middle"
    font-size="10" font-family="system-ui,sans-serif" font-weight="bold"
    letter-spacing="0.08em" fill="#7090b0">DEF</text>
  ${uwDefSymbol(face)}
</svg>`;
}

/* ─── UW Magic Die SVG Symbols ───────────────────────────────── */

/**
 * Returns SVG elements for a UW Magic symbol.
 */
function uwMagSymbol(face) {
  switch (face) {
    case 'Channel':
      // Lightning bolt
      return `<polygon points="42,32 36,46 41,46 38,60 48,44 43,44 46,32" fill="#ffffff"/>`;
    case 'Focus':
      // Swirling eye / concentric arcs with dot
      return `<ellipse cx="40" cy="47" rx="14" ry="10" fill="none" stroke="#ffffff" stroke-width="2"/>
        <ellipse cx="40" cy="47" rx="7" ry="5" fill="none" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="40" cy="47" r="2.5" fill="#ffffff"/>`;
    case 'Crit':
      // Starburst / critical success symbol
      return `<polygon points="40,32 43,43 54,43 46,50 49,60 40,54 31,60 34,50 26,43 37,43" fill="#ffdd44"/>`;
    default: // Blank
      return `<line x1="30" y1="48" x2="50" y2="48" stroke="#554466" stroke-width="2.5" stroke-linecap="round"/>`;
  }
}

/**
 * Warhammer Underworlds Magic die face SVG.
 * Purple body with silver edge — faithful to the original blue/purple UW magic dice.
 * @param {string} face - e.g. 'Blank', 'Channel', 'Focus', 'Crit'
 * @param {number} numeric - raw numeric result (1–6)
 * @returns {string}
 */
export function svgUWMagic(face, numeric) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" role="img" aria-label="UW Magic: ${face}">
  <rect x="5" y="5" width="70" height="70" rx="12" fill="#2a1548" stroke="#9070c0" stroke-width="2.5"/>
  <text x="40" y="26" text-anchor="middle" dominant-baseline="middle"
    font-size="10" font-family="system-ui,sans-serif" font-weight="bold"
    letter-spacing="0.08em" fill="#9070c0">MAG</text>
  ${uwMagSymbol(face)}
</svg>`;
}

/**
 * Returns the appropriate SVG string for a roll result.
 * @param {{type: string, numeric: number, face: string|null, sides?: number}} result
 * @param {boolean} [isSuccess]
 * @param {boolean} [isFail]
 * @returns {string} SVG markup.
 */
export function svgForResult(result, isSuccess, isFail) {
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
    case 'UW_ATK': return svgUWAttack(face, numeric);
    case 'UW_DEF': return svgUWDefence(face, numeric);
    case 'UW_MAG': return svgUWMagic(face, numeric);
    default:       return svgD6(numeric);
  }
}
