/**
 * main.js — Entry point for Warhammer Dice Forge
 * Wires together all modules, manages appState, and sets up all UI events.
 */

'use strict';

import './style.css';
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import { rollPool }                              from './modules/DiceEngine.js';
import { renderPool, renderResults, renderStats,
         renderHistory, renderPresets,
         renderWH40KHelpers, showToast }         from './modules/UIRenderer.js';
import { animateRoll, celebrateCritical,
         celebrateFail, celebrateAllSuccess,
         celebrateAllFail }                      from './modules/AnimationManager.js';
import * as Audio                                from './modules/AudioManager.js';
import * as History                              from './modules/HistoryManager.js';
import * as Presets                              from './modules/PresetsManager.js';
import { woundThreshold, effectiveSave }         from './modules/WH40KHelper.js';
import * as Particles                            from './modules/ParticleSystem.js';
import * as Dice3D                               from './modules/Dice3DRenderer.js';

/* ═══════════════════════════════════════════════════════════════
   App State (quasi-Redux)
═══════════════════════════════════════════════════════════════ */
/** @type {{
 *   pool: Array<{type:string,count:number,sides?:number}>,
 *   results: Array<{type:string,numeric:number,face:string|null,sides?:number,locked?:boolean,selected?:boolean}>,
 *   history: Array,
 *   presets: Array,
 *   threshold: number,
 *   stats: {rollCount:number,totalDice:number,totalSum:number,criticals:number,fumbles:number},
 *   theme: 'dark'|'light',
 *   audioMuted: boolean,
 *   historyOpen: boolean,
 *   statsOpen: boolean,
 *   presetsOpen: boolean,
 * }} */
const appState = {
  pool:        [],
  results:     [],
  history:     History.getAll(),
  presets:     Presets.getAll(),
  threshold:   0,
  stats:       { rollCount: 0, totalDice: 0, totalSum: 0, criticals: 0, fumbles: 0 },
  theme:       'dark',
  audioMuted:  false,
  historyOpen: false,
  statsOpen:   false,
  presetsOpen: false,
  use3D:       false,
};

/* ═══════════════════════════════════════════════════════════════
   Render dispatcher
═══════════════════════════════════════════════════════════════ */
function render() {
  // Pool
  renderPool(appState.pool, handleAdjustPool, handleRemoveFromPool);

  // Results (SVG fallback — always rendered for accessibility; hidden
  // visually when 3D active).
  const diceEls = renderResults(
    appState.results,
    appState.threshold,
    handleToggleLock,
    handleToggleSelect
  );
  window._lastDiceEls = diceEls; // used by fallback animations

  // 3D tray highlights (for selected/locked state after renders).
  if (appState.use3D) {
    Dice3D.refreshHighlights(appState.results, appState.threshold);
  }

  // Stats
  renderStats({
    rollCount:  appState.stats.rollCount,
    totalDice:  appState.stats.totalDice,
    avgRoll:    appState.stats.totalDice > 0
                  ? appState.stats.totalSum / appState.stats.totalDice
                  : 0,
    criticals:  appState.stats.criticals,
    fumbles:    appState.stats.fumbles,
  });

  // History
  renderHistory(appState.history, handleLoadHistory);

  // Presets
  renderPresets(appState.presets, handleLoadPreset, handleDeletePreset);

  // Re-roll button enabled when something is selected
  const rerollBtn = document.getElementById('btn-reroll');
  if (rerollBtn) {
    rerollBtn.disabled = !appState.results.some(r => r.selected);
  }

  // WH40K helpers
  updateWHHelpers();
}

/* ═══════════════════════════════════════════════════════════════
   Pool handlers
═══════════════════════════════════════════════════════════════ */

/**
 * Adds a die type to the pool (or increments its count).
 * @param {string} type
 * @param {number} [sides] - only for Custom dice
 */
function handleAddDie(type, sides) {
  const key  = type === 'Custom' ? `${type}-${sides}` : type;
  const existing = appState.pool.find(e =>
    e.type === type && (type !== 'Custom' || e.sides === sides)
  );
  if (existing) {
    existing.count++;
  } else {
    appState.pool.push({ type, count: 1, ...(sides ? { sides } : {}) });
  }
  render();
}

/**
 * Increments or decrements a pool entry. Removes when count reaches 0.
 * @param {string} type
 * @param {number} delta
 * @param {number} [sides]
 */
function handleAdjustPool(type, delta, sides) {
  const idx = appState.pool.findIndex(e =>
    e.type === type && (type !== 'Custom' || e.sides === sides)
  );
  if (idx === -1) return;
  appState.pool[idx].count += delta;
  if (appState.pool[idx].count <= 0) appState.pool.splice(idx, 1);
  render();
}

/**
 * Removes all dice of a type from the pool.
 * @param {string} type
 * @param {number} [sides]
 */
function handleRemoveFromPool(type, sides) {
  appState.pool = appState.pool.filter(e =>
    !(e.type === type && (type !== 'Custom' || e.sides === sides))
  );
  render();
}

/* ═══════════════════════════════════════════════════════════════
   Roll
═══════════════════════════════════════════════════════════════ */

/** Executes a full roll of the current pool. */
async function handleRoll() {
  if (!appState.pool.length) {
    showToast('Add some dice first!', 'error');
    return;
  }

  // Initialise audio on first gesture
  Audio.init();

  // Re-roll locked dice using their existing results
  const poolToRoll = appState.pool;
  const freshResults = rollPool(poolToRoll);

  // Preserve locked results
  appState.results = freshResults.map((r, i) => {
    const old = appState.results[i];
    if (old && old.locked) return { ...old };
    return { ...r, locked: false, selected: false };
  });

  // Stats
  appState.stats.rollCount++;
  appState.stats.totalDice   += appState.results.length;
  appState.stats.totalSum    += appState.results.reduce((s, r) => s + r.numeric, 0);
  appState.stats.criticals   += appState.results.filter(r => r.numeric === r.sides && r.sides).length;
  appState.stats.fumbles     += appState.results.filter(r => r.numeric === 1 && r.sides && r.sides > 1).length;

  // History
  const total      = appState.results.reduce((s, r) => s + r.numeric, 0);
  const successes  = appState.threshold > 0
    ? appState.results.filter(r => r.numeric >= appState.threshold).length
    : 0;
  History.add({
    pool:         appState.pool.map(e => ({ ...e })),
    results:      appState.results.map(r => ({ type: r.type, numeric: r.numeric, face: r.face })),
    successCount: successes,
    total,
  });
  appState.history = History.getAll();

  render();

  // Animations & audio
  Audio.playRoll();
  if (navigator.vibrate) navigator.vibrate([30, 20, 30]);

  const diceEls = window._lastDiceEls ?? [];

  if (appState.use3D) {
    await Dice3D.rollAll(appState.results, appState.threshold, {
      onToggleSelect: handleToggleSelect,
      onToggleLock:   handleToggleLock,
    });
  } else {
    await animateRoll(diceEls);
  }

  // Per-die celebrations
  appState.results.forEach((r, i) => {
    if (!r) return;
    const isCrit = r.numeric === r.sides && r.sides;
    if (isCrit && !appState.use3D) celebrateCritical(diceEls[i]);
    if (!isCrit && r.numeric === 1 && r.sides > 1 && !appState.use3D) celebrateFail(diceEls[i]);

    // Particle burst on crit — works for both modes.
    if (isCrit) {
      const canvas = document.getElementById('particle-canvas');
      if (!canvas) return;
      const cr = canvas.getBoundingClientRect();
      let cx, cy;
      if (appState.use3D) {
        const pt = Dice3D.worldToTrayPx(i);
        if (!pt) return;
        cx = pt.x; cy = pt.y;
      } else if (diceEls[i]) {
        const rect = diceEls[i].getBoundingClientRect();
        cx = rect.left - cr.left + rect.width / 2;
        cy = rect.top  - cr.top  + rect.height / 2;
      } else {
        return;
      }
      Particles.burst(cx, cy, { count: 22, color: '#e2b714', speed: 5 });
    }
  });

  // Threshold summary
  if (appState.threshold > 0) {
    const all = appState.results.filter(r => r.sides);
    const succ = all.filter(r => r.numeric >= appState.threshold).length;
    if (succ === all.length && all.length > 0) {
      if (!appState.use3D) celebrateAllSuccess(diceEls);
      Audio.playSuccess();
    } else if (succ === 0 && all.length > 0) {
      if (!appState.use3D) celebrateAllFail(diceEls);
      else Dice3D.shakeCamera(500);
      Audio.playFail();
    }
  }
}

/** Re-rolls only the selected dice. */
function handleReroll() {
  if (!appState.results.some(r => r.selected)) return;
  const selectedIndices = appState.results
    .map((r, i) => r.selected ? i : -1)
    .filter(i => i !== -1);

  // Build a mini pool from selected dice types
  for (const i of selectedIndices) {
    const r = appState.results[i];
    const freshPool = [{ type: r.type, count: 1, ...(r.sides ? { sides: r.sides } : {}) }];
    const [newResult] = rollPool(freshPool);
    appState.results[i] = { ...newResult, locked: false, selected: false };
  }
  render();
  Audio.init();
  Audio.playRoll();
}

/* ═══════════════════════════════════════════════════════════════
   Die lock / select
═══════════════════════════════════════════════════════════════ */

/** @param {number} index */
function handleToggleLock(index) {
  if (!appState.results[index]) return;
  appState.results[index].locked = !appState.results[index].locked;
  if (appState.results[index].locked) {
    showToast('Die locked — it will keep its value on next roll', 'info');
  }
  render();
}

/** @param {number} index */
function handleToggleSelect(index) {
  if (!appState.results[index]) return;
  appState.results[index].selected = !appState.results[index].selected;
  render();
}

/* ═══════════════════════════════════════════════════════════════
   History / Presets
═══════════════════════════════════════════════════════════════ */

/** @param {import('./modules/HistoryManager.js').HistoryEntry} entry */
function handleLoadHistory(entry) {
  appState.pool = entry.pool.map(e => ({ ...e }));
  render();
  showToast('Pool loaded from history', 'success');
}

/** @param {{name:string,pool:Array}} preset */
function handleLoadPreset(preset) {
  appState.pool = preset.pool.map(e => ({ ...e }));
  render();
  showToast(`Preset "${preset.name}" loaded`, 'success');
}

/** @param {string} name */
function handleDeletePreset(name) {
  Presets.deletePreset(name);
  appState.presets = Presets.getAll();
  render();
}

/* ═══════════════════════════════════════════════════════════════
   WH40K helpers
═══════════════════════════════════════════════════════════════ */
function updateWHHelpers() {
  const s  = parseInt(document.getElementById('wh-strength')?.value  ?? '4', 10);
  const t  = parseInt(document.getElementById('wh-toughness')?.value ?? '4', 10);
  const sv = parseInt(document.getElementById('wh-save')?.value      ?? '3', 10);
  const ap = parseInt(document.getElementById('wh-ap')?.value        ?? '0', 10);
  const inv= parseInt(document.getElementById('wh-invuln')?.value    ?? '0', 10);

  const wt = woundThreshold(s, t);
  const { effectiveSave: es, source } = effectiveSave(sv, ap, inv);
  const saveStr = es <= 6 ? `${es}+ (${source})` : 'no save';

  renderWH40KHelpers(`Wound on ${wt}+`, `Effective save: ${saveStr}`);
}

/* ═══════════════════════════════════════════════════════════════
   Theme
═══════════════════════════════════════════════════════════════ */
function applyTheme(theme) {
  appState.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
}

/* ═══════════════════════════════════════════════════════════════
   Panel helpers
═══════════════════════════════════════════════════════════════ */
/**
 * @param {'stats'|'presets'} name
 * @param {boolean} open
 */
function setPanel(name, open) {
  const panel = document.getElementById(`panel-${name}`);
  const btn   = document.getElementById(`btn-${name}`);
  if (!panel || !btn) return;
  panel.hidden = !open;
  btn.setAttribute('aria-pressed', String(open));
  appState[`${name}Open`] = open;
}

/* ═══════════════════════════════════════════════════════════════
   Custom die row
═══════════════════════════════════════════════════════════════ */
function showCustomRow() {
  const row = document.getElementById('custom-die-row');
  if (row) row.hidden = false;
}
function hideCustomRow() {
  const row = document.getElementById('custom-die-row');
  if (row) row.hidden = true;
}

/* ═══════════════════════════════════════════════════════════════
   Shake to roll (DeviceMotionEvent)
═══════════════════════════════════════════════════════════════ */
let lastShake = 0;

function setupShakeToRoll() {
  const THRESHOLD = 20; // m/s²
  const COOLDOWN  = 1200; // ms

  function onMotion(e) {
    const ag = e.accelerationIncludingGravity;
    if (!ag) return;
    const mag = Math.sqrt(ag.x ** 2 + ag.y ** 2 + ag.z ** 2);
    const now = Date.now();
    if (mag > THRESHOLD && (now - lastShake) > COOLDOWN) {
      lastShake = now;
      handleRoll();
    }
  }

  // iOS 13+ requires explicit permission
  if (typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function') {
    // Request on first tap of roll button
    const rollBtn = document.getElementById('btn-roll');
    if (rollBtn) {
      rollBtn.addEventListener('click', async () => {
        try {
          const perm = await DeviceMotionEvent.requestPermission();
          if (perm === 'granted') {
            window.addEventListener('devicemotion', onMotion);
          }
        } catch (_) { /* permission denied or not available */ }
      }, { once: true });
    }
  } else if (typeof DeviceMotionEvent !== 'undefined') {
    window.addEventListener('devicemotion', onMotion);
  }
}

/* ═══════════════════════════════════════════════════════════════
   Service Worker registration
═══════════════════════════════════════════════════════════════ */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/dice/sw.js')
        .catch(() => { /* SW registration failure is non-fatal */ });
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   Event wiring
═══════════════════════════════════════════════════════════════ */
function wireEvents() {

  // ── Die chips
  document.getElementById('die-chips')?.addEventListener('click', e => {
    const chip = e.target.closest('.die-chip');
    if (!chip) return;

    // Ripple effect
    const rect = chip.getBoundingClientRect();
    chip.style.setProperty('--ripple-x', `${e.clientX - rect.left}px`);
    chip.style.setProperty('--ripple-y', `${e.clientY - rect.top}px`);
    chip.classList.remove('rippling');
    void chip.offsetWidth;
    chip.classList.add('rippling');
    chip.addEventListener('animationend', () => chip.classList.remove('rippling'), { once: true });

    const dieType = chip.dataset.die;
    if (dieType === 'Custom') {
      showCustomRow();
    } else {
      handleAddDie(dieType);
    }
  });

  // ── Custom die
  const customSides = document.getElementById('custom-sides');
  const customLabel = document.getElementById('custom-label');
  customSides?.addEventListener('input', () => {
    if (customLabel) customLabel.textContent = customSides.value;
  });
  document.getElementById('btn-add-custom')?.addEventListener('click', () => {
    const sides = parseInt(customSides?.value ?? '6', 10);
    if (isNaN(sides) || sides < 2) {
      showToast('Enter a valid number of sides (2+)', 'error');
      return;
    }
    handleAddDie('Custom', sides);
    hideCustomRow();
  });
  document.getElementById('btn-cancel-custom')?.addEventListener('click', hideCustomRow);

  // ── Roll
  document.getElementById('btn-roll')?.addEventListener('click', handleRoll);
  document.addEventListener('keydown', e => {
    if ((e.key === ' ' || e.key === 'Enter') && e.target === document.body) {
      e.preventDefault();
      handleRoll();
    }
  });

  // ── Re-roll selected
  document.getElementById('btn-reroll')?.addEventListener('click', handleReroll);

  // ── Clear pool
  document.getElementById('btn-clear')?.addEventListener('click', () => {
    appState.pool    = [];
    appState.results = [];
    render();
  });

  // ── Threshold
  document.getElementById('threshold-input')?.addEventListener('change', e => {
    appState.threshold = parseInt(e.target.value, 10);
    render();
  });

  // ── WH40K helpers (live update)
  ['wh-strength','wh-toughness','wh-save','wh-ap','wh-invuln'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateWHHelpers);
  });

  // ── Theme toggle
  document.getElementById('btn-theme')?.addEventListener('click', () => {
    applyTheme(appState.theme === 'dark' ? 'light' : 'dark');
  });

  // ── Audio toggle
  document.getElementById('btn-audio')?.addEventListener('click', () => {
    const muted = Audio.toggle();
    appState.audioMuted = muted;
    const btn = document.getElementById('btn-audio');
    if (btn) {
      btn.textContent = muted ? '🔇' : '🔊';
      btn.setAttribute('aria-pressed', String(!muted));
    }
  });

  // ── Stats panel
  document.getElementById('btn-stats')?.addEventListener('click', () => {
    setPanel('stats', !appState.statsOpen);
    if (appState.presetsOpen) setPanel('presets', false);
  });

  // ── Presets panel
  document.getElementById('btn-presets')?.addEventListener('click', () => {
    setPanel('presets', !appState.presetsOpen);
    if (appState.statsOpen) setPanel('stats', false);
  });

  // ── Panel close buttons
  document.querySelectorAll('.panel-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.panel;
      setPanel(name, false);
    });
  });

  // ── Save preset
  document.getElementById('btn-save-preset')?.addEventListener('click', () => {
    const input = document.getElementById('preset-name-input');
    const name  = input?.value?.trim();
    if (!name) {
      showToast('Enter a name for the preset', 'error');
      return;
    }
    if (!appState.pool.length) {
      showToast('Add dice to the pool first', 'error');
      return;
    }
    Presets.save(name, appState.pool);
    appState.presets = Presets.getAll();
    render();
    if (input) input.value = '';
    showToast(`Preset "${name}" saved`, 'success');
  });

  // ── History drawer
  document.getElementById('history-handle')?.addEventListener('click', () => {
    appState.historyOpen = !appState.historyOpen;
    const drawer  = document.getElementById('history-drawer');
    const handle  = document.getElementById('history-handle');
    drawer?.classList.toggle('open', appState.historyOpen);
    handle?.setAttribute('aria-expanded', String(appState.historyOpen));
  });

  // ── Clear history
  document.getElementById('btn-clear-history')?.addEventListener('click', () => {
    History.clear();
    appState.history = [];
    render();
    showToast('History cleared', 'info');
  });

  // ── Close panels on outside click
  document.addEventListener('click', e => {
    ['stats','presets'].forEach(name => {
      const panel = document.getElementById(`panel-${name}`);
      const btn   = document.getElementById(`btn-${name}`);
      if (panel && !panel.hidden && !panel.contains(e.target) && e.target !== btn) {
        setPanel(name, false);
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   Bootstrap
═══════════════════════════════════════════════════════════════ */
function init() {
  // Apply system or stored theme preference
  const storedTheme = localStorage.getItem('dice_theme');
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(storedTheme ?? systemTheme);

  // Save theme on change
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('dice_theme')) applyTheme(e.matches ? 'dark' : 'light');
  });

  // Initialise particle system
  const canvas = document.getElementById('particle-canvas');
  if (canvas) Particles.init(canvas);

  // Initialise 3D dice renderer (if supported)
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas3d = document.getElementById('dice-3d-canvas');
  const tray     = document.getElementById('dice-tray');
  if (canvas3d && tray && !reduced && Dice3D.isWebGLAvailable()) {
    try {
      Dice3D.init(canvas3d, tray);
      appState.use3D = true;
      document.body.classList.add('dice-3d');
    } catch (err) {
      console.warn('3D dice renderer failed to init; falling back to SVG.', err);
      appState.use3D = false;
    }
  }

  // Wire up all events
  wireEvents();

  // Initial render
  render();

  // Shake to roll
  setupShakeToRoll();

  // PWA service worker
  registerServiceWorker();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
