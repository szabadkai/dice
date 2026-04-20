/**
 * UIRenderer.js
 * Handles all DOM mutation — no innerHTML for user-supplied content.
 */

'use strict';

import { svgForResult } from '../assets/dice-svgs.js';

/* ─── Helpers ─────────────────────────────────────────────────── */

/**
 * Removes all children from an element.
 * @param {Element} el
 */
function empty(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/**
 * Creates an element with optional class list and attributes.
 * @param {string} tag
 * @param {string[]} [classes]
 * @param {Object}  [attrs]
 * @returns {HTMLElement}
 */
function el(tag, classes = [], attrs = {}) {
  const node = document.createElement(tag);
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'aria-label' || k.startsWith('data-') || k === 'role' || k === 'type' || k === 'disabled' || k === 'aria-pressed') {
      node.setAttribute(k, v);
    } else {
      node[k] = v;
    }
  }
  return node;
}

/* ─── Pool ─────────────────────────────────────────────────────── */

/**
 * Renders the current dice pool as adjustable rows.
 * @param {Array<{type:string,count:number,sides?:number}>} pool
 * @param {Function} onAdjust - callback(type, delta, sides?)
 * @param {Function} onRemove - callback(type, sides?)
 */
export function renderPool(pool, onAdjust, onRemove) {
  const container = document.getElementById('pool-display');
  if (!container) return;
  empty(container);

  if (!pool.length) {
    const hint = el('p', ['pool-empty-hint']);
    hint.textContent = 'Tap a die chip above to add dice.';
    container.appendChild(hint);
    return;
  }

  for (const entry of pool) {
    const row = el('div', ['pool-row']);
    row.setAttribute('data-type', entry.type);

    const label = el('span', ['pool-row-label']);
    label.textContent = entry.type === 'Custom'
      ? `D${entry.sides}`
      : entry.type === 'UW_ATK' ? '⚔ UW Atk'
      : entry.type === 'UW_DEF' ? '🛡 UW Def'
      : entry.type;

    const controls = el('div', ['pool-row-controls']);

    const btnMinus = el('button', ['pool-adj-btn'], { 'aria-label': `Remove one ${entry.type}` });
    btnMinus.textContent = '−';
    btnMinus.addEventListener('click', () => onAdjust(entry.type, -1, entry.sides));

    const countSpan = el('span', ['pool-row-count'], { 'aria-live': 'polite' });
    countSpan.textContent = String(entry.count);

    const btnPlus = el('button', ['pool-adj-btn'], { 'aria-label': `Add one ${entry.type}` });
    btnPlus.textContent = '+';
    btnPlus.addEventListener('click', () => onAdjust(entry.type, +1, entry.sides));

    const btnDel = el('button', ['pool-del-btn'], { 'aria-label': `Remove all ${entry.type}` });
    btnDel.textContent = '🗑';
    btnDel.addEventListener('click', () => onRemove(entry.type, entry.sides));

    controls.appendChild(btnMinus);
    controls.appendChild(countSpan);
    controls.appendChild(btnPlus);
    controls.appendChild(btnDel);

    row.appendChild(label);
    row.appendChild(controls);
    container.appendChild(row);
  }
}

/* ─── Results ──────────────────────────────────────────────────── */

/**
 * Renders roll result dice in the tray.
 * @param {Array<{type:string,numeric:number,face:string|null,sides?:number,locked?:boolean,selected?:boolean}>} results
 * @param {number} threshold - Success target (0 = no threshold)
 * @param {Function} onToggleLock   - callback(index)
 * @param {Function} onToggleSelect - callback(index)
 * @returns {HTMLElement[]} Array of rendered die elements.
 */
export function renderResults(results, threshold, onToggleLock, onToggleSelect) {
  const container   = document.getElementById('results-container');
  const placeholder = document.getElementById('tray-placeholder');
  const summary     = document.getElementById('roll-summary');
  if (!container) return [];

  empty(container);

  if (!results.length) {
    if (placeholder) placeholder.hidden = false;
    if (summary)     summary.hidden = true;
    return [];
  }

  if (placeholder) placeholder.hidden = true;

  const diceEls = [];

  results.forEach((r, i) => {
    const isUW     = r.type === 'UW_ATK' || r.type === 'UW_DEF';
    const isMax    = !isUW && r.numeric === r.sides;
    const isMin    = !isUW && r.numeric === 1;
    const isSuccess = threshold > 0 && r.numeric >= threshold;
    const isFail    = threshold > 0 && !isUW && r.numeric < threshold;

    const wrapper = el('div', ['die-result'], {
      'data-index':   String(i),
      'data-type':    r.type,
      'aria-label':   `${r.type} rolled ${r.face ?? r.numeric}${isMax ? ', critical' : isMin ? ', fumble' : ''}`,
      'role':         'button',
      'aria-pressed': r.selected ? 'true' : 'false',
    });
    wrapper.tabIndex = 0;

    if (isMax)     wrapper.classList.add('die--critical');
    if (isMin)     wrapper.classList.add('die--fumble');
    if (isSuccess) wrapper.classList.add('die--success');
    if (isFail)    wrapper.classList.add('die--fail');
    if (r.locked)  wrapper.classList.add('die--locked');
    if (r.selected)wrapper.classList.add('die--selected');

    // SVG face — safe: it's from our own templates, not user input
    wrapper.innerHTML = svgForResult(r, isSuccess, isFail);

    // Tap → select
    wrapper.addEventListener('click', () => onToggleSelect(i));

    // Long-press → lock
    let lockTimer;
    const startLock = () => { lockTimer = setTimeout(() => onToggleLock(i), 500); };
    const cancelLock = () => clearTimeout(lockTimer);
    wrapper.addEventListener('pointerdown', startLock);
    wrapper.addEventListener('pointerup',   cancelLock);
    wrapper.addEventListener('pointerleave',cancelLock);

    // Keyboard accessibility
    wrapper.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggleSelect(i); }
      if (e.key === 'l' || e.key === 'L')     { onToggleLock(i); }
    });

    container.appendChild(wrapper);
    diceEls.push(wrapper);
  });

  // Summary bar
  if (summary) {
    summary.hidden = false;
    empty(summary);

    const total = results.reduce((s, r) => s + r.numeric, 0);
    const successes = threshold > 0 ? results.filter(r => r.numeric >= threshold).length : null;

    const totalEl = el('span', ['summary-total']);
    totalEl.textContent = `Total: ${total}`;
    summary.appendChild(totalEl);

    if (successes !== null) {
      const sep = document.createTextNode(' · ');
      summary.appendChild(sep);
      const succEl = el('span', ['summary-successes']);
      succEl.textContent = `Successes: ${successes}/${results.length}`;
      summary.appendChild(succEl);
    }
  }

  return diceEls;
}

/* ─── Stats ────────────────────────────────────────────────────── */

/**
 * Renders the statistics panel.
 * @param {{ rollCount:number, totalDice:number, avgRoll:number, criticals:number, fumbles:number }} stats
 */
export function renderStats(stats) {
  const container = document.getElementById('stats-content');
  if (!container) return;
  empty(container);

  const rows = [
    ['Rolls this session', stats.rollCount],
    ['Dice rolled',        stats.totalDice],
    ['Average result',     stats.avgRoll ? stats.avgRoll.toFixed(2) : '—'],
    ['Criticals (max)',    stats.criticals],
    ['Fumbles (1)',        stats.fumbles],
  ];

  const dl = el('dl', ['stats-list']);
  for (const [label, value] of rows) {
    const dt = el('dt', ['stats-dt']);
    dt.textContent = label;
    const dd = el('dd', ['stats-dd']);
    dd.textContent = String(value);
    dl.appendChild(dt);
    dl.appendChild(dd);
  }
  container.appendChild(dl);
}

/* ─── History ──────────────────────────────────────────────────── */

/**
 * Renders the history list.
 * @param {Array<{timestamp:number,pool:Array,results:Array,successCount:number,total:number}>} history
 * @param {Function} onLoad - callback(entry) to reload a roll
 */
export function renderHistory(history, onLoad) {
  const container = document.getElementById('history-list');
  if (!container) return;
  empty(container);

  if (!history.length) {
    const hint = el('p', ['history-empty']);
    hint.textContent = 'No rolls yet.';
    container.appendChild(hint);
    return;
  }

  for (const entry of history) {
    const item = el('div', ['history-item'], { role: 'listitem' });

    const time = el('time', ['history-time']);
    time.dateTime = new Date(entry.timestamp).toISOString();
    time.textContent = new Date(entry.timestamp).toLocaleTimeString();

    const poolSummary = el('span', ['history-pool']);
    poolSummary.textContent = entry.pool
      .map(p => `${p.count}×${p.type === 'Custom' ? `D${p.sides}` : p.type}`)
      .join(' + ');

    const total = el('span', ['history-total']);
    total.textContent = `→ ${entry.total}`;

    const btn = el('button', ['history-reload-btn'], { 'aria-label': 'Reload this roll pool' });
    btn.textContent = '↺';
    btn.addEventListener('click', () => onLoad(entry));

    item.appendChild(time);
    item.appendChild(poolSummary);
    item.appendChild(total);
    item.appendChild(btn);
    container.appendChild(item);
  }
}

/* ─── Presets ──────────────────────────────────────────────────── */

/**
 * Renders the presets panel.
 * @param {Array<{name:string,pool:Array,builtin?:boolean}>} presets
 * @param {Function} onLoad   - callback(preset)
 * @param {Function} onDelete - callback(name)
 */
export function renderPresets(presets, onLoad, onDelete) {
  const container = document.getElementById('presets-content');
  if (!container) return;
  empty(container);

  for (const preset of presets) {
    const card = el('div', ['preset-card']);

    const name = el('span', ['preset-name']);
    name.textContent = preset.name;

    const loadBtn = el('button', ['preset-load-btn'], { 'aria-label': `Load preset ${preset.name}` });
    loadBtn.textContent = 'Load';
    loadBtn.addEventListener('click', () => onLoad(preset));

    card.appendChild(name);
    card.appendChild(loadBtn);

    if (!preset.builtin) {
      const delBtn = el('button', ['preset-del-btn'], { 'aria-label': `Delete preset ${preset.name}` });
      delBtn.textContent = '🗑';
      delBtn.addEventListener('click', () => onDelete(preset.name));
      card.appendChild(delBtn);
    }

    container.appendChild(card);
  }
}

/* ─── WH40K Helpers ────────────────────────────────────────────── */

/**
 * Updates the WH40K helper result areas.
 * @param {string} woundText
 * @param {string} saveText
 */
export function renderWH40KHelpers(woundText, saveText) {
  const woundEl = document.getElementById('wound-result');
  const saveEl  = document.getElementById('save-result');
  if (woundEl) woundEl.textContent = woundText;
  if (saveEl)  saveEl.textContent  = saveText;
}

/* ─── Toast ────────────────────────────────────────────────────── */

/** @type {number|null} */
let toastTimer = null;

/**
 * Shows a brief toast notification.
 * @param {string} message
 * @param {'info'|'success'|'error'} [type='info']
 */
export function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast toast--${type}`;
  toast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
}
