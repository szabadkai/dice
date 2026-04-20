/**
 * HistoryManager.js
 * Manages roll history with sessionStorage persistence.
 * Keeps the last 50 entries.
 */

'use strict';

const STORAGE_KEY = 'dice_history';
const MAX_ENTRIES = 50;

/**
 * @typedef {Object} HistoryEntry
 * @property {number} timestamp
 * @property {Array<{type:string,count:number}>} pool
 * @property {Array<{type:string,numeric:number,face:string|null}>} results
 * @property {number} successCount
 * @property {number} total
 */

/**
 * Loads history from sessionStorage.
 * @returns {HistoryEntry[]}
 */
function load() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Persists history to sessionStorage.
 * @param {HistoryEntry[]} entries
 */
function save(entries) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage might be unavailable (private browsing quotas, etc.)
  }
}

/**
 * Adds a new roll entry to history.
 * @param {HistoryEntry} entry
 */
export function add(entry) {
  const history = load();
  history.unshift({ ...entry, timestamp: Date.now() });
  // Trim to max
  if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
  save(history);
}

/**
 * Returns the full history array (most recent first).
 * @returns {HistoryEntry[]}
 */
export function getAll() {
  return load();
}

/**
 * Clears all history.
 */
export function clear() {
  sessionStorage.removeItem(STORAGE_KEY);
}
