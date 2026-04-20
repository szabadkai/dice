/**
 * WH40KHelper.js
 * Warhammer 40K wound chart and save-throw calculations.
 */

'use strict';

/**
 * Calculates the wound roll target number per the WH40K wound chart.
 *
 * Chart:
 *   S >= 2×T  → 2+
 *   S >  T    → 3+
 *   S == T    → 4+
 *   S <  T    → 5+
 *   S <= T/2  → 6+
 *
 * @param {number} strength   - Attacker's Strength characteristic.
 * @param {number} toughness  - Target's Toughness characteristic.
 * @returns {number} Target number (2–6).
 */
export function woundThreshold(strength, toughness) {
  if (strength >= toughness * 2) return 2;
  if (strength > toughness)      return 3;
  if (strength === toughness)    return 4;
  if (strength * 2 <= toughness) return 6;
  return 5; // S < T (but not ≤ T/2)
}

/**
 * Calculates the effective save value considering AP modifier and invulnerable save.
 * A save of 7+ is considered a failed save (no protection).
 *
 * @param {number} saveValue   - Armour save value (e.g. 3 for 3+).
 * @param {number} ap          - Armour Penetration modifier (0 or negative, e.g. -1, -2).
 * @param {number} invulnSave  - Invulnerable save (0 = none, 4 = 4+, etc.).
 * @returns {{ effectiveSave: number, source: 'armour'|'invuln'|'none' }}
 */
export function effectiveSave(saveValue, ap, invulnSave) {
  const modifiedArmour = saveValue - ap; // ap is ≤ 0, so this makes it worse
  const hasInvuln = invulnSave > 0 && invulnSave <= 6;

  if (modifiedArmour > 6 && !hasInvuln) {
    return { effectiveSave: 7, source: 'none' };
  }

  if (hasInvuln && invulnSave < modifiedArmour) {
    return { effectiveSave: invulnSave, source: 'invuln' };
  }

  if (modifiedArmour <= 6) {
    return { effectiveSave: modifiedArmour, source: 'armour' };
  }

  return { effectiveSave: invulnSave, source: 'invuln' };
}

/**
 * Summarises the wound/save situation as a human-readable string.
 *
 * @param {number} strength
 * @param {number} toughness
 * @param {number} saveValue
 * @param {number} ap
 * @param {number} invulnSave
 * @returns {string}
 */
export function summarise(strength, toughness, saveValue, ap, invulnSave) {
  const wt = woundThreshold(strength, toughness);
  const { effectiveSave: es, source } = effectiveSave(saveValue, ap, invulnSave);
  const saveStr = es <= 6
    ? `${es}+ (${source})`
    : 'no save';
  return `Wound on ${wt}+  |  Save: ${saveStr}`;
}
