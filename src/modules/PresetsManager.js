/**
 * PresetsManager.js
 * Manages named dice pool presets with localStorage persistence.
 */

'use strict';

const STORAGE_KEY = 'dice_presets';

/**
 * @typedef {Object} Preset
 * @property {string} name
 * @property {Array<{type:string,count:number,sides?:number}>} pool
 * @property {boolean} builtin - true for factory presets (non-deletable display)
 */

/** Default factory presets. */
const DEFAULT_PRESETS = [
  { name: 'WH Shooting',  pool: [{ type: 'D6',     count: 10 }],                                   builtin: true },
  { name: 'WH Wound Roll',pool: [{ type: 'D6',     count: 6  }],                                   builtin: true },
  { name: 'UW Attack',    pool: [{ type: 'UW_ATK', count: 3  }],                                   builtin: true },
  { name: 'UW Defence',   pool: [{ type: 'UW_DEF', count: 2  }],                                   builtin: true },
  { name: "D&D Attack",   pool: [{ type: 'D20',    count: 1  }, { type: 'D8', count: 1 }],         builtin: true },
];

/**
 * Loads all presets from localStorage, merging defaults.
 * @returns {Preset[]}
 */
export function getAll() {
  let stored = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    stored = raw ? JSON.parse(raw) : [];
  } catch {
    stored = [];
  }

  // Merge: defaults first, then user presets (user can override default names)
  const userNames = new Set(stored.map(p => p.name));
  const merged = [
    ...DEFAULT_PRESETS.filter(p => !userNames.has(p.name)),
    ...stored,
  ];
  return merged;
}

/**
 * Saves only user-defined presets to localStorage.
 * @param {Preset[]} presets
 */
function persist(presets) {
  const userOnly = presets.filter(p => !p.builtin);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userOnly));
  } catch {
    // Quota exceeded or unavailable
  }
}

/**
 * Saves a new preset (or overwrites an existing one with the same name).
 * @param {string} name
 * @param {Array<{type:string,count:number,sides?:number}>} pool
 */
export function save(name, pool) {
  const all = getAll();
  const idx = all.findIndex(p => p.name === name);
  const preset = { name, pool: [...pool], builtin: false };
  if (idx !== -1) {
    all[idx] = preset;
  } else {
    all.push(preset);
  }
  persist(all);
}

/**
 * Loads a preset by name.
 * @param {string} name
 * @returns {Preset|undefined}
 */
export function load(name) {
  return getAll().find(p => p.name === name);
}

/**
 * Deletes a preset by name (does not delete builtin presets).
 * @param {string} name
 */
export function deletePreset(name) {
  const all = getAll().filter(p => p.builtin || p.name !== name);
  persist(all);
}

/**
 * Renames a user preset.
 * @param {string} oldName
 * @param {string} newName
 */
export function rename(oldName, newName) {
  const all = getAll();
  const preset = all.find(p => p.name === oldName && !p.builtin);
  if (preset) {
    preset.name = newName;
    persist(all);
  }
}
