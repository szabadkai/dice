/**
 * DiceEngine.js
 * Core roll logic using crypto.getRandomValues for true randomness.
 */

'use strict';

/**
 * Warhammer Underworlds Attack die faces (6-sided).
 * @type {string[]}
 */
const UW_ATK_FACES = [
  'Blank',
  'Blank',
  'Support',   // single sword (support hit)
  'Smash',     // ⚔ — critical
  'Sword',     // 🗡 — one hit
  'Fury',      // ✦ — wild / re-roll
];

/**
 * Warhammer Underworlds Defence die faces (6-sided).
 * @type {string[]}
 */
const UW_DEF_FACES = [
  'Blank',
  'Blank',
  'Blank',
  'Shield',    // 🛡 — block
  'Shield',    // 🛡 — block
  'Dodge',     // ◈ — dodge / wild block
];

/**
 * Returns a cryptographically random integer in the range [1, sides].
 * @param {number} sides - Number of die faces (must be ≥ 2).
 * @returns {number} Random integer between 1 and sides (inclusive).
 */
export function rollDie(sides) {
  if (!Number.isInteger(sides) || sides < 2) {
    throw new RangeError(`rollDie: sides must be an integer ≥ 2, got ${sides}`);
  }

  // Use rejection sampling to avoid modulo bias.
  const maxUnbiased = Math.floor(0x100000000 / sides) * sides;
  const buf = new Uint32Array(1);
  let r;
  do {
    crypto.getRandomValues(buf);
    r = buf[0];
  } while (r >= maxUnbiased);

  return (r % sides) + 1;
}

/**
 * Rolls a single Warhammer Underworlds Attack die.
 * @returns {{ numeric: number, face: string }}
 */
export function rollUWAttack() {
  const n = rollDie(6);
  return { numeric: n, face: UW_ATK_FACES[n - 1] };
}

/**
 * Rolls a single Warhammer Underworlds Defence die.
 * @returns {{ numeric: number, face: string }}
 */
export function rollUWDefence() {
  const n = rollDie(6);
  return { numeric: n, face: UW_DEF_FACES[n - 1] };
}

/**
 * Rolls an entire pool of dice entries.
 *
 * @param {Array<{type: string, count: number, sides?: number}>} pool
 *   Each entry has a `type` (e.g. 'D6', 'D20', 'UW_ATK', 'Custom')
 *   and a `count`. Custom dice also carry a `sides` field.
 *
 * @returns {Array<{type: string, sides: number, numeric: number, face: string|null}>}
 *   Flat array of individual roll results.
 */
export function rollPool(pool) {
  /** @type {Array<{type: string, sides: number, numeric: number, face: string|null}>} */
  const results = [];

  for (const entry of pool) {
    const count = Math.max(0, Math.floor(entry.count));

    for (let i = 0; i < count; i++) {
      if (entry.type === 'UW_ATK') {
        const r = rollUWAttack();
        results.push({ type: 'UW_ATK', sides: 6, numeric: r.numeric, face: r.face });
      } else if (entry.type === 'UW_DEF') {
        const r = rollUWDefence();
        results.push({ type: 'UW_DEF', sides: 6, numeric: r.numeric, face: r.face });
      } else {
        const sides = getSides(entry);
        const numeric = rollDie(sides);
        results.push({ type: entry.type, sides, numeric, face: null });
      }
    }
  }

  return results;
}

/**
 * Resolves the number of sides for a pool entry.
 * @param {{type: string, sides?: number}} entry
 * @returns {number}
 */
function getSides(entry) {
  if (entry.type === 'Custom' && entry.sides) return entry.sides;
  const map = { D3: 3, D4: 4, D6: 6, D8: 8, D10: 10, D12: 12, D20: 20, D100: 100 };
  return map[entry.type] ?? 6;
}

/**
 * Maps a die type string to its number of sides.
 * @param {string} type
 * @returns {number}
 */
export function sidesForType(type) {
  if (type === 'UW_ATK' || type === 'UW_DEF') return 6;
  const map = { D3: 3, D4: 4, D6: 6, D8: 8, D10: 10, D12: 12, D20: 20, D100: 100 };
  return map[type] ?? 6;
}
