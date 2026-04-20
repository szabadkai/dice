/**
 * dice-svgs.js
 * Inline SVG templates for all die faces.
 * No external assets required.
 */

'use strict';

/**
 * Builds a generic numbered die SVG.
 * @param {string} shape - 'square'|'diamond'|'hexagon'|'circle'|'triangle'
 * @param {string|number} label - Text to display in centre.
 * @param {string} [fill='#16213e']
 * @param {string} [stroke='#e2b714']
 * @returns {string} SVG markup string.
 */
function buildSVG(shape, label, fill = '#16213e', stroke = '#e2b714') {
  const w = 80;
  const h = 80;
  let shapePath = '';

  switch (shape) {
    case 'triangle': // D4
      shapePath = `<polygon points="40,6 74,70 6,70" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
      break;
    case 'square':   // D6
      shapePath = `<rect x="5" y="5" width="70" height="70" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
      break;
    case 'diamond':  // D8 / D10
      shapePath = `<polygon points="40,4 76,40 40,76 4,40" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
      break;
    case 'hexagon':  // D12
      shapePath = `<polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
      break;
    case 'circle':   // D20 / D100
      shapePath = `<circle cx="40" cy="40" r="36" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
      break;
    default:
      shapePath = `<rect x="5" y="5" width="70" height="70" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="Die showing ${label}">
  ${shapePath}
  <text x="40" y="47" text-anchor="middle" dominant-baseline="middle"
    font-family="system-ui,sans-serif" font-size="22" font-weight="bold"
    fill="${stroke}">${label}</text>
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
  return buildSVG('hexagon', label, '#1a1a2e', '#a78bfa');
}

/**
 * Warhammer Underworlds Attack die face SVG.
 * @param {string} face - e.g. 'Blank', 'Smash', 'Sword', 'Support', 'Fury'
 * @param {number} numeric - raw numeric result (1–6)
 * @returns {string}
 */
export function svgUWAttack(face, numeric) {
  const icons = {
    Blank:   '—',
    Support: '🗡',
    Sword:   '⚔',
    Smash:   '💥',
    Fury:    '✦',
  };
  const colours = {
    Blank:   '#555',
    Support: '#e2b714',
    Sword:   '#e2b714',
    Smash:   '#ff4444',
    Fury:    '#a78bfa',
  };
  const icon  = icons[face]   ?? face ?? numeric;
  const color = colours[face] ?? '#e2b714';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" role="img" aria-label="UW Attack: ${face}">
  <rect x="5" y="5" width="70" height="70" rx="14" fill="#1a1a2e" stroke="#e2b714" stroke-width="3"/>
  <text x="40" y="30" text-anchor="middle" dominant-baseline="middle"
    font-size="11" font-family="system-ui,sans-serif" font-weight="bold" fill="#888">ATK</text>
  <text x="40" y="52" text-anchor="middle" dominant-baseline="middle"
    font-size="22" fill="${color}">${icon}</text>
</svg>`;
}

/**
 * Warhammer Underworlds Defence die face SVG.
 * @param {string} face - e.g. 'Blank', 'Shield', 'Dodge'
 * @param {number} numeric - raw numeric result (1–6)
 * @returns {string}
 */
export function svgUWDefence(face, numeric) {
  const icons = {
    Blank:  '—',
    Shield: '🛡',
    Dodge:  '◈',
  };
  const colours = {
    Blank:  '#555',
    Shield: '#4ade80',
    Dodge:  '#60a5fa',
  };
  const icon  = icons[face]   ?? face ?? numeric;
  const color = colours[face] ?? '#4ade80';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" role="img" aria-label="UW Defence: ${face}">
  <rect x="5" y="5" width="70" height="70" rx="14" fill="#16213e" stroke="#4ade80" stroke-width="3"/>
  <text x="40" y="30" text-anchor="middle" dominant-baseline="middle"
    font-size="11" font-family="system-ui,sans-serif" font-weight="bold" fill="#888">DEF</text>
  <text x="40" y="52" text-anchor="middle" dominant-baseline="middle"
    font-size="22" fill="${color}">${icon}</text>
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
    case 'D3':    return svgD3(numeric);
    case 'D4':    return svgD4(numeric);
    case 'D6':    return svgD6(numeric);
    case 'D8':    return svgD8(numeric);
    case 'D10':   return svgD10(numeric);
    case 'D12':   return svgD12(numeric);
    case 'D20':   return svgD20(numeric);
    case 'D100':  return svgD100(numeric);
    case 'Custom':return svgCustom(numeric, sides);
    case 'UW_ATK':return svgUWAttack(face, numeric);
    case 'UW_DEF':return svgUWDefence(face, numeric);
    default:      return svgD6(numeric);
  }
}
