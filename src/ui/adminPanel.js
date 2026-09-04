// Administrator / debug control panel for disasters (DOM + CSS).
//
// Interface contract used by game.js: new AdminPanel(game); panel.open(); panel.close(); panel.toggle();
// panel.isOpen; panel.update() called every frame while open. game.js owns the F4 / ` / Esc bindings, releases
// pointer lock and disables the HUD canvas pointer events while the panel is open.
//
// Everything the panel does goes through the DisasterManager command API (game.disasters.command({...})), so
// the console command shown in the panel reproduces exactly what the buttons do. Status is read from
// game.disasters.status() (refreshed at ~5 Hz from update() and immediately on manager change events).
import './adminPanel.css';
import * as THREE from 'three';
import { raycastBlocks } from '../interaction.js';

const STORAGE_KEY = 'frontier-craft:admin';
const STATUS_REFRESH_MS = 200;   // 5 Hz DOM refresh of status while open
const PERF_REFRESH_MS = 500;     // 2 Hz perf readout
const LIVE_DEBOUNCE_MS = 150;    // live intensity slider -> {type:'set'}
const PREVIEW_DEBOUNCE_MS = 400; // re-issue preview while editing params during a preview
const SAVE_DEBOUNCE_MS = 250;    // localStorage writes
const CROSSHAIR_REACH = 160;     // fallback raycast length for "Use crosshair target"
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const START_NOTICE = 'This modifies the world; damage is journaled and can be restored with Reset; it is NOT written to your save unless you commit it.';

// ---------------------------------------------------------------- small DOM helpers
function h(tag, attrs, ...children) {
  const e = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (typeof v === 'boolean') e[k] = v;
      else e.setAttribute(k, v);
    }
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
function setText(el, text) { if (el.textContent !== text) el.textContent = text; }
function clampNum(v, min, max) { if (Number.isFinite(min) && v < min) v = min; if (Number.isFinite(max) && v > max) v = max; return v; }
function decimalsFor(step) {
  if (!Number.isFinite(step) || step <= 0) return 0;
  const s = String(step);
  if (s.includes('e-')) return Math.min(6, parseInt(s.split('e-')[1], 10) || 0);
  const i = s.indexOf('.');
  return i < 0 ? 0 : Math.min(6, s.length - i - 1);
}
function fmtNum(v, step) { return Number.isFinite(v) ? Number(v).toFixed(decimalsFor(step)) : '?'; }
function compassLabel(deg) { const d = ((Number(deg) % 360) + 360) % 360; return COMPASS[Math.round(d / 45) % 8]; }
function isTextTarget(t) { return !!t && ((t.tagName === 'INPUT' && !['range', 'checkbox', 'button'].includes(t.type)) || t.tagName === 'TEXTAREA' || t.isContentEditable); }
// JS object literal in the compact style used in the docs: {type:'start',disaster:'tornado',seed:7,params:{...}}
function jsLiteral(v) {
  if (Array.isArray(v)) return '[' + v.map(jsLiteral).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.entries(v).map(([k, x]) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ':' + jsLiteral(x)).join(',') + '}';
  if (typeof v === 'string') return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  return String(v);
}

export class AdminPanel {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.selectedType = null;   // disaster type shown in the form
    this.builtType = null;      // type the parameter form is currently built for
    this.fields = [];           // field controllers of the built form: {key, schema, el, get(), set(v)}
    this.store = { selected: null, byType: {} }; // persisted (localStorage) last-used params/seed per type
    this.status = null;
    this.dialogOpen = false;
    this.lastStatusAt = 0;
    this.lastPerfAt = 0;
    this.saveTimer = null;
    this.liveTimer = null;
    this.previewTimer = null;
    this.noteTimer = null;
    this.copyTimer = null;
    this.tabsSignature = '';
    this.lastLog = null;
    this.unsubscribe = [];
    this._build();
    this._subscribe();
    this._load();
  }

  get manager() { return this.game.disasters || null; }

  // ---------------------------------------------------------------- public interface (game.js)
  open() {
    this.isOpen = true;
    this.root.hidden = false;
    this._subscribe();
    if (this.saveTimer) this._flushSave();
    this._load();
    this._refreshPermission();
    this.lastStatusAt = 0;
    this.lastPerfAt = 0;
    this._refreshStatus();
    this._refreshPerf();
    if (!this.root.contains(document.activeElement)) this.root.focus({ preventScroll: true });
  }

  close() {
    this.isOpen = false;
    this._closeDialog();
    if (this.previewTimer) { clearTimeout(this.previewTimer); this.previewTimer = null; }
    this._flushSave();
    if (this.root.contains(document.activeElement) && document.activeElement.blur) document.activeElement.blur();
    this.root.hidden = true;
  }

  toggle() { if (this.isOpen) this.close(); else this.open(); }

  // Called every frame while open: throttled DOM writes only.
  update() {
    if (!this.isOpen) return;
    const now = performance.now();
    if (now - this.lastStatusAt >= STATUS_REFRESH_MS) { this.lastStatusAt = now; this._refreshStatus(); }
    if (now - this.lastPerfAt >= PERF_REFRESH_MS) { this.lastPerfAt = now; this._refreshPerf(); }
  }

  // ---------------------------------------------------------------- construction
  _build() {
    const root = this.root = h('div', { id: 'admin-panel', role: 'dialog', 'aria-label': 'Disaster control panel', tabindex: '-1', hidden: true });

    // header: title, close, badges
    this.badgeOnline = h('span', { class: 'ap-badge', id: 'ap-badge-online', text: 'offline' });
    this.badgeAdmin = h('span', { class: 'ap-badge', id: 'ap-badge-admin', text: 'admin' });
    this.badgeState = h('span', { class: 'ap-badge ap-state', id: 'ap-badge-state', text: 'idle' });
    this.badges = h('div', { class: 'ap-badges' }, this.badgeOnline, this.badgeAdmin, this.badgeState);
    const header = h('div', { class: 'ap-header' },
      h('div', { class: 'ap-title-row' },
        h('div', { class: 'ap-title' }, 'DISASTER CONTROL', h('small', { text: 'Administrator panel  -  F4 / ` / Esc to close' })),
        h('button', { class: 'ap-btn ap-close', id: 'ap-close', type: 'button', title: 'Close (Esc / F4)', 'aria-label': 'Close panel', text: '\u00d7', onclick: () => this._requestClose() })),
      this.badges);

    // status section
    this.stType = h('dd', { text: '\u2014' });
    this.stElapsed = h('dd', { text: '0.0 s' });
    this.stSeed = h('dd', { text: '\u2014' });
    this.stJournal = h('dd', { id: 'ap-st-journal', text: '0' });
    this.stDebris = h('dd', { id: 'ap-st-debris', text: '0' });
    this.stEdits = h('dd', { text: '0 / 0' });
    this.progressFill = h('div');
    this.progressLabel = h('span', { text: '0%' });
    this.restoreFill = h('div');
    this.restoreLabel = h('span', { text: '0%' });
    this.restoreBox = h('div', { class: 'ap-restore', id: 'ap-restore', hidden: true }, 'Restoring the world\u2026', h('div', { class: 'ap-bar ap-bar-restore' }, this.restoreFill, this.restoreLabel));
    this.logEl = h('div', { class: 'ap-log', id: 'ap-log', 'aria-live': 'polite' }, h('div', { class: 'ap-empty', text: 'No messages yet.' }));
    const statusSection = h('section', { class: 'ap-section', id: 'ap-status' },
      h('h3', {}, 'Status'),
      h('dl', { class: 'ap-kv' },
        h('dt', { text: 'Disaster' }), this.stType,
        h('dt', { text: 'Elapsed' }), this.stElapsed,
        h('dt', { text: 'Seed' }), this.stSeed,
        h('dt', { text: 'Journal' }), this.stJournal,
        h('dt', { text: 'Debris' }), this.stDebris,
        h('dt', { text: 'Edits / restored' }), this.stEdits),
      h('div', { class: 'ap-bar', id: 'ap-progress', title: 'Disaster progress' }, this.progressFill, this.progressLabel),
      this.restoreBox,
      this.logEl);

    // disaster selector
    this.tabsEl = h('div', { class: 'ap-tabs', id: 'ap-tabs', role: 'tablist', 'aria-label': 'Disaster type' });
    this.descEl = h('div', { class: 'ap-desc', id: 'ap-desc' });
    const disasterSection = h('section', { class: 'ap-section', id: 'ap-disaster' }, h('h3', {}, 'Disaster'), this.tabsEl, this.descEl);

    // parameter form
    this.formEl = h('div', { class: 'ap-form', id: 'ap-form' });
    this.seedInput = h('input', { type: 'number', id: 'ap-seed', min: '0', step: '1', value: '1', 'aria-label': 'Seed' });
    this.seedInput.addEventListener('input', () => this._onFieldInput());
    this.seedInput.addEventListener('change', () => { this.seedInput.value = String(this._readSeed()); this._onFieldInput(); });
    const paramsSection = h('section', { class: 'ap-section', id: 'ap-params' },
      h('h3', {}, 'Parameters', h('span', { class: 'ap-h-actions' }, h('button', { class: 'ap-btn ap-mini', id: 'ap-defaults', type: 'button', text: 'Defaults', title: 'Reset parameters to the schema defaults', onclick: () => this._resetDefaults() }))),
      this.formEl,
      h('div', { class: 'ap-seed-row' },
        h('label', { for: 'ap-seed', text: 'Seed' }), this.seedInput,
        h('button', { class: 'ap-btn ap-mini', id: 'ap-seed-random', type: 'button', text: 'Randomize', onclick: () => this._randomizeSeed() }),
        h('span', { class: 'ap-hint', text: 'same seed = same run' })));

    // controls
    this.btnPreview = h('button', { class: 'ap-btn', id: 'ap-btn-preview', type: 'button', text: 'Preview', onclick: () => this._onPreview() });
    this.btnStart = h('button', { class: 'ap-btn ap-danger', id: 'ap-btn-start', type: 'button', text: 'Start\u2026', onclick: () => this._onStart() });
    this.btnPause = h('button', { class: 'ap-btn', id: 'ap-btn-pause', type: 'button', text: 'Pause', onclick: () => this._onPauseResume() });
    this.btnStop = h('button', { class: 'ap-btn', id: 'ap-btn-stop', type: 'button', text: 'Stop', onclick: () => this._cmd({ type: 'stop' }) });
    this.btnReset = h('button', { class: 'ap-btn', id: 'ap-btn-reset', type: 'button', text: 'Reset / Restore\u2026', onclick: () => this._onReset() });
    this.btnReplay = h('button', { class: 'ap-btn', id: 'ap-btn-replay', type: 'button', text: 'Replay\u2026', onclick: () => this._onReplay() });
    this.liveSlider = h('input', { type: 'range', id: 'ap-live-intensity', min: '0', max: '1', step: '0.05', value: '0.7', 'aria-label': 'Live intensity' });
    this.liveVal = h('span', { class: 'ap-val', id: 'ap-live-value', text: '\u2014' });
    this.liveSlider.addEventListener('input', () => this._onLiveIntensity());
    this.liveBox = h('div', { class: 'ap-live', id: 'ap-live', 'data-enabled': 'false' },
      h('label', { class: 'ap-label', for: 'ap-live-intensity' }, h('span', {}, 'Live intensity ', h('span', { class: 'ap-unit', text: '(running disaster, 0\u20131)' })), this.liveVal),
      h('div', { class: 'ap-row' }, this.liveSlider));
    this.noteEl = h('div', { class: 'ap-hint', id: 'ap-note', 'aria-live': 'polite' });
    const controlsSection = h('section', { class: 'ap-section', id: 'ap-controls' },
      h('h3', {}, 'Controls'),
      h('div', { class: 'ap-btn-grid' }, this.btnPreview, this.btnStart, this.btnPause, this.btnStop, this.btnReset, this.btnReplay),
      this.liveBox, this.noteEl);

    // save section
    this.saveHint = h('div', { class: 'ap-hint', id: 'ap-save-hint', text: 'Journal: 0 cells' });
    this.btnCommit = h('button', { class: 'ap-btn', id: 'ap-btn-commit', type: 'button', text: 'Commit damage to save\u2026', onclick: () => this._onCommit() });
    this.btnDiscard = h('button', { class: 'ap-btn', id: 'ap-btn-discard', type: 'button', text: 'Discard (reset)\u2026', onclick: () => this._onDiscard() });
    const saveSection = h('section', { class: 'ap-section', id: 'ap-save' },
      h('h3', {}, 'Save'), this.saveHint, h('div', { class: 'ap-btn-grid' }, this.btnCommit, this.btnDiscard));

    // console command
    this.copiedEl = h('span', { class: 'ap-copied', id: 'ap-copied' });
    this.cmdArea = h('textarea', { id: 'ap-command', readOnly: true, spellcheck: 'false', 'aria-label': 'Console command for the current configuration', wrap: 'soft' });
    this.cmdArea.addEventListener('focus', () => this.cmdArea.select());
    const cmdSection = h('section', { class: 'ap-section', id: 'ap-cmd' },
      h('h3', {}, 'Console command', h('span', { class: 'ap-h-actions' }, this.copiedEl, h('button', { class: 'ap-btn ap-mini', id: 'ap-copy', type: 'button', text: 'Copy', onclick: () => this._copyCommand() }))),
      h('div', { class: 'ap-hint', text: 'Paste in the devtools console to reproduce this exact configuration.' }),
      this.cmdArea);

    this.denied = h('div', { class: 'ap-denied', id: 'ap-denied', hidden: true }, 'Administrator permission required', h('small', { text: 'Single player: remove ?admin=0 from the URL. Multiplayer: join with the admin token (?admin=<token>).' }));
    this.main = h('div', { class: 'ap-main', id: 'ap-main' }, statusSection, disasterSection, paramsSection, controlsSection, saveSection, cmdSection);
    this.body = h('div', { class: 'ap-body' }, this.denied, this.main);
    this.perfEl = h('div', { class: 'ap-footer', id: 'ap-perf', text: 'perf: n/a' });
    this.overlay = h('div', { class: 'ap-overlay', id: 'ap-overlay', hidden: true, onclick: (e) => { if (e.target === this.overlay) this._closeDialog(); } });

    root.append(header, this.body, this.perfEl, this.overlay);
    // Keyboard focus inside the panel must never reach the game's document-level key handlers (WASD in a
    // field must not move the player). Esc / F4 still propagate so game.js can close the panel.
    root.addEventListener('keydown', (e) => this._onKeyDown(e));
    root.addEventListener('keyup', (e) => { if (!this._keyPropagates(e)) e.stopPropagation(); });
    root.addEventListener('keypress', (e) => e.stopPropagation());
    document.body.appendChild(root);
  }

  _keyPropagates(e) { return e.code === 'Escape' || e.code === 'F4' || (e.code === 'Backquote' && !isTextTarget(e.target)); }
  _onKeyDown(e) {
    if (e.code === 'Escape' && this.dialogOpen) { e.stopPropagation(); e.preventDefault(); this._closeDialog(); return; }
    if (this._keyPropagates(e)) return;
    e.stopPropagation();
  }
  _requestClose() { if (this.game.closeScreen && this.game.hud && this.game.hud.screen === 'admin') this.game.closeScreen(); else this.close(); }

  _subscribe() {
    if (this.subscribed) return;
    const m = this.manager;
    if (!m) return;
    this.subscribed = true;
    this.unsubscribe.push(m.onChange((s) => { if (this.isOpen) this._refreshStatus(s); }));
    if (this.game.permissions && this.game.permissions.onChange) this.unsubscribe.push(this.game.permissions.onChange(() => { if (this.isOpen) { this._refreshPermission(); this._refreshStatus(); } }));
  }

  dispose() { for (const u of this.unsubscribe) u(); this.unsubscribe = []; this.subscribed = false; this.root.remove(); }

  // ---------------------------------------------------------------- permission / selector
  _refreshPermission() {
    const admin = this.game.permissions ? this.game.permissions.isAdmin() : true;
    this.denied.hidden = admin;
    this.main.hidden = !admin;
    this.badges.hidden = !admin;
    this.perfEl.hidden = !admin;
    if (!admin) { if (this.game.hud) this.game.hud.addMessage('Administrator permission required.'); return; }
    this._syncTabs();
  }

  _syncTabs() {
    const m = this.manager;
    if (!m) return;
    const types = m.types();
    if (!types.length) return;
    if (!this.selectedType || !m.registry.has(this.selectedType)) this.selectedType = m.registry.has(this.store.selected) ? this.store.selected : types[0];
    const sig = types.join(',');
    if (sig !== this.tabsSignature) {
      this.tabsSignature = sig;
      this.tabsEl.replaceChildren(...types.map((type) => {
        const cls = m.registry.get(type);
        return h('button', { class: 'ap-btn ap-tab', type: 'button', role: 'tab', 'data-type': type, id: 'ap-tab-' + type, title: cls.description || '', text: cls.label || type, onclick: () => this.selectType(type) });
      }));
    }
    this._applySelection();
  }

  selectType(type) {
    const m = this.manager;
    if (!m || !m.registry.has(type)) return;
    if (this.builtType === type && this.selectedType === type) return;
    if (this.builtType && this.builtType !== type) this._storeCurrent();
    this.selectedType = type;
    this.store.selected = type;
    this._applySelection();
    this._scheduleSave();
    if (this.status && this.status.state === 'preview') this._schedulePreviewRefresh();
    this._refreshStatus();
  }

  _applySelection() {
    const m = this.manager, type = this.selectedType;
    for (const b of this.tabsEl.children) b.setAttribute('aria-selected', String(b.dataset.type === type));
    const cls = m.registry.get(type);
    setText(this.descEl, cls ? (cls.description || '') : '');
    if (this.builtType !== type) this._buildForm(type);
    this._refreshCommand();
  }

  // ---------------------------------------------------------------- parameter form (auto-generated from schema)
  _buildForm(type) {
    const m = this.manager;
    const cls = m.registry.get(type);
    const stored = this.store.byType[type];
    const params = cls.clampParams(stored && stored.params ? stored.params : {});
    this.fields = [];
    this.formEl.replaceChildren();
    for (const s of m.schema(type)) {
      const f = this._makeField(s, params[s.key]);
      this.fields.push(f);
      this.formEl.append(f.el);
    }
    if (!this.fields.length) this.formEl.append(h('div', { class: 'ap-hint', text: 'This disaster has no parameters.' }));
    this.seedInput.value = String(stored && Number.isFinite(Number(stored.seed)) ? Math.max(0, Math.floor(Number(stored.seed))) : 1);
    this.builtType = type;
  }

  _makeField(s, value) {
    switch (s.type) {
      case 'number': return this._fieldNumber(s, value, false);
      case 'angle': return this._fieldNumber(s, value, true);
      case 'select': return this._fieldSelect(s, value);
      case 'boolean': return this._fieldBoolean(s, value);
      case 'position': return this._fieldPosition(s, value);
      default: return this._fieldText(s, value);
    }
  }

  _fieldNumber(s, value, angle) {
    const id = 'ap-f-' + s.key;
    const min = Number.isFinite(s.min) ? s.min : (angle ? 0 : undefined), max = Number.isFinite(s.max) ? s.max : (angle ? 360 : undefined);
    const unit = angle ? '\u00b0' : (s.unit ? ' ' + s.unit : '');
    const step = Number.isFinite(s.step) && s.step > 0 ? s.step : (angle ? 1 : 'any');
    const val = h('span', { class: 'ap-val' });
    const compass = angle ? h('span', { class: 'ap-compass', id: 'ap-c-' + s.key, title: 'Compass heading (0 = north, 90 = east)' }) : null;
    const range = h('input', { type: 'range', id: 'ap-s-' + s.key, min: String(min ?? 0), max: String(max ?? 100), step: String(step), 'aria-label': s.label + ' slider' });
    const num = h('input', { type: 'number', id, min: min !== undefined ? String(min) : undefined, max: max !== undefined ? String(max) : undefined, step: String(step) });
    const el = h('div', { class: 'ap-field', 'data-key': s.key },
      h('label', { for: id }, h('span', {}, s.label, s.unit ? h('span', { class: 'ap-unit', text: ` (${s.unit})` }) : null), val),
      h('div', { class: 'ap-row' }, range, compass, num),
      h('div', { class: 'ap-minmax' }, h('span', { text: `min ${min ?? '\u2212\u221e'}${unit}` }), h('span', { text: `max ${max ?? '\u221e'}${unit}` })));
    let cur = Number(value);
    const show = () => { setText(val, fmtNum(cur, s.step) + unit); if (compass) setText(compass, compassLabel(cur)); };
    // snap committed values to the schema step grid so the slider, the number input and the sent params agree
    const snap = (v) => { if (typeof step !== 'number') return v; const base = Number.isFinite(min) ? min : 0; return Number((Math.round((v - base) / step) * step + base).toFixed(decimalsFor(step))); };
    const set = (v) => {
      v = Number(v);
      if (!Number.isFinite(v)) v = Number(s.default) || 0;
      cur = clampNum(snap(v), min, max);
      range.value = String(cur);
      num.value = fmtNum(cur, s.step);
      show();
    };
    range.addEventListener('input', () => { set(range.value); this._onFieldInput(); });
    num.addEventListener('input', () => { const v = Number(num.value); if (num.value !== '' && Number.isFinite(v)) { cur = clampNum(v, min, max); range.value = String(cur); show(); this._onFieldInput(); } });
    num.addEventListener('change', () => { set(num.value); this._onFieldInput(); });
    set(value);
    return { key: s.key, schema: s, el, get: () => cur, set };
  }

  _fieldSelect(s, value) {
    const id = 'ap-f-' + s.key;
    const options = Array.isArray(s.options) ? s.options : [];
    const sel = h('select', { id, 'aria-label': s.label }, options.map((o) => h('option', { value: String(o), text: String(o) })));
    const el = h('div', { class: 'ap-field', 'data-key': s.key }, h('label', { for: id }, h('span', { text: s.label })), h('div', { class: 'ap-row' }, sel));
    const set = (v) => { sel.value = options.includes(v) ? String(v) : String(s.default); };
    sel.addEventListener('change', () => this._onFieldInput());
    set(value);
    return { key: s.key, schema: s, el, get: () => sel.value, set };
  }

  _fieldBoolean(s, value) {
    const id = 'ap-f-' + s.key;
    const cb = h('input', { type: 'checkbox', id });
    const el = h('div', { class: 'ap-field', 'data-key': s.key }, h('label', { class: 'ap-check', for: id }, cb, h('span', { text: s.label })));
    cb.addEventListener('change', () => this._onFieldInput());
    const set = (v) => { cb.checked = !!v; };
    set(value);
    return { key: s.key, schema: s, el, get: () => cb.checked, set };
  }

  _fieldPosition(s, value) {
    const idX = `ap-f-${s.key}-x`, idZ = `ap-f-${s.key}-z`;
    const x = h('input', { type: 'number', id: idX, step: '1', 'aria-label': s.label + ' x' });
    const z = h('input', { type: 'number', id: idZ, step: '1', 'aria-label': s.label + ' z' });
    const useMe = h('button', { class: 'ap-btn ap-mini ap-use-me', type: 'button', text: 'Use my position', title: 'Player position (game.player.pos)' });
    const useHit = h('button', { class: 'ap-btn ap-mini ap-use-hit', type: 'button', text: 'Use crosshair target', title: 'Block under the crosshair (game.lastHit)' });
    const el = h('div', { class: 'ap-field', 'data-key': s.key },
      h('div', { class: 'ap-label' }, h('span', { text: s.label }), h('span', { class: 'ap-unit', text: '(blocks, \u00b14000)' })),
      h('div', { class: 'ap-pos' }, h('label', { class: 'ap-axis', for: idX, text: 'x' }), x, h('label', { class: 'ap-axis', for: idZ, text: 'z' }), z),
      h('div', { class: 'ap-pos' }, useMe, useHit));
    const num = (inp, fallback) => { const v = Number(inp.value); return inp.value !== '' && Number.isFinite(v) ? clampNum(v, -4000, 4000) : fallback; };
    const def = Array.isArray(s.default) ? s.default : [0, 0];
    const set = (v) => { const p = Array.isArray(v) && v.length >= 2 ? v : def; x.value = String(Number(p[0]) || 0); z.value = String(Number(p[1]) || 0); };
    for (const inp of [x, z]) { inp.addEventListener('input', () => this._onFieldInput()); inp.addEventListener('change', () => { set([num(x, def[0]), num(z, def[1])]); this._onFieldInput(); }); }
    useMe.addEventListener('click', () => {
      const p = this.game.player && this.game.player.pos;
      if (!p) { this._note('Player position unavailable.'); return; }
      set([Math.round(p.x), Math.round(p.z)]);
      this._onFieldInput();
      this._note(`${s.label}: set to your position (${Math.round(p.x)}, ${Math.round(p.z)}).`);
    });
    useHit.addEventListener('click', () => {
      const hit = this._crosshairTarget();
      if (!hit) { this._note('No block under the crosshair.'); return; }
      set([hit.x, hit.z]);
      this._onFieldInput();
      this._note(`${s.label}: set to crosshair target (${hit.x}, ${hit.y}, ${hit.z}).`);
    });
    set(value);
    return { key: s.key, schema: s, el, get: () => [num(x, def[0]), num(z, def[1])], set };
  }

  _fieldText(s, value) {
    const id = 'ap-f-' + s.key;
    const inp = h('input', { type: 'text', id, class: 'ap-input' });
    const el = h('div', { class: 'ap-field', 'data-key': s.key }, h('label', { for: id }, h('span', { text: s.label }), h('span', { class: 'ap-unit', text: s.type })), h('div', { class: 'ap-row' }, inp));
    const set = (v) => { inp.value = v === undefined || v === null ? '' : (typeof v === 'string' ? v : JSON.stringify(v)); };
    inp.addEventListener('input', () => this._onFieldInput());
    set(value);
    return { key: s.key, schema: s, el, get: () => { try { return JSON.parse(inp.value); } catch (e) { return inp.value; } }, set };
  }

  // The game only raycasts while playing (pointer locked), so game.lastHit is usually null while the panel is
  // open; fall back to a long raycast along the current view direction.
  _crosshairTarget() {
    const g = this.game;
    if (g.lastHit) return g.lastHit;
    if (!g.player || !g.world) return null;
    try {
      const eye = g.player.eyePos(1, new THREE.Vector3());
      const dir = g.player.forwardDir(new THREE.Vector3());
      return raycastBlocks(g.world, eye, dir, CROSSHAIR_REACH) || null;
    } catch (e) { return null; }
  }

  _readParams() {
    const m = this.manager, cls = m && m.registry.get(this.selectedType);
    const p = {};
    for (const f of this.fields) p[f.key] = f.get();
    return cls ? cls.clampParams(p) : p;
  }
  _readSeed() { const v = Math.floor(Number(this.seedInput.value)); return Number.isFinite(v) && v >= 0 ? v >>> 0 : 1; }

  _onFieldInput() {
    this._storeCurrent();
    this._refreshCommand();
    if (this.status && this.status.state === 'preview') this._schedulePreviewRefresh();
  }
  _resetDefaults() {
    for (const f of this.fields) f.set(f.schema.default);
    this._onFieldInput();
    this._note('Parameters reset to defaults.');
  }
  _randomizeSeed() {
    this.seedInput.value = String(Math.floor(Math.random() * 1e6));
    this._onFieldInput();
  }
  _schedulePreviewRefresh() {
    if (this.previewTimer) clearTimeout(this.previewTimer);
    this.previewTimer = setTimeout(() => {
      this.previewTimer = null;
      const m = this.manager;
      if (this.isOpen && m && m.state === 'preview') this._cmd({ type: 'preview', disaster: this.selectedType, params: this._readParams(), seed: this._readSeed() }, true);
    }, PREVIEW_DEBOUNCE_MS);
  }

  // ---------------------------------------------------------------- persistence (localStorage)
  _load() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { data = null; }
    if (data && typeof data === 'object') {
      if (data.byType && typeof data.byType === 'object') this.store.byType = data.byType;
      if (typeof data.selected === 'string') this.store.selected = data.selected;
    }
    const m = this.manager;
    if (m && m.registry.has(this.store.selected)) this.selectedType = this.store.selected;
    // restore the stored values into an already built form (rebuild when the stored type differs)
    if (m && this.selectedType && this.tabsSignature) {
      if (this.builtType !== this.selectedType) this._applySelection();
      else {
        const stored = this.store.byType[this.selectedType];
        if (stored) {
          const cls = m.registry.get(this.selectedType);
          const params = cls.clampParams(stored.params || {});
          for (const f of this.fields) f.set(params[f.key]);
          if (Number.isFinite(Number(stored.seed))) this.seedInput.value = String(Math.max(0, Math.floor(Number(stored.seed))));
        }
        this._applySelection();
      }
    }
  }
  _storeCurrent() {
    if (!this.builtType) return;
    this.store.byType[this.builtType] = { params: this._readParams(), seed: this._readSeed() };
    this.store.selected = this.selectedType;
    this._scheduleSave();
  }
  _scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this._flushSave(), SAVE_DEBOUNCE_MS);
  }
  _flushSave() {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, selected: this.store.selected, byType: this.store.byType })); } catch (e) { /* storage unavailable */ }
  }

  // ---------------------------------------------------------------- commands
  _cmd(cmd, quiet = false) {
    const m = this.manager;
    if (!m) return { ok: false, reason: 'no disaster manager' };
    let r;
    try { r = m.command(cmd); } catch (e) { console.error('disaster command failed', e); r = { ok: false, reason: e.message }; }
    if (r && r.ok === false && !quiet) this._note(r.reason || 'Command rejected.');
    else if (r && r.pending && !quiet) this._note('Command sent to the server\u2026');
    this._refreshStatus();
    return r;
  }
  _currentCommand(type = 'start') { return { type, disaster: this.selectedType, seed: this._readSeed(), params: this._readParams() }; }

  _onPreview() {
    const m = this.manager;
    if (!m) return;
    if (m.state === 'preview') { this._cmd({ type: 'stop' }); return; }
    if (m.state === 'running' || m.state === 'paused' || m.state === 'restoring') { this._note('Stop the current disaster before previewing.'); return; }
    this._cmd(this._currentCommand('preview'));
  }

  _onStart() {
    const m = this.manager;
    if (!m || !this.selectedType) return;
    if (m.state === 'running' || m.state === 'paused') { this._note('A disaster is already running - stop it first.'); return; }
    if (m.state === 'restoring') { this._note('Wait for the restore to finish.'); return; }
    const cmd = this._currentCommand('start');
    const cls = m.registry.get(cmd.disaster);
    let warnings = [];
    try { const probe = new cls(m, cmd.params, cmd.seed); warnings = (probe.warnings() || []).map(String); }
    catch (e) { warnings = ['Could not compute warnings: ' + (e && e.message ? e.message : e)]; }
    const paramSummary = Object.entries(cmd.params).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`).join('   ');
    this._confirm({
      title: `Start ${cls.label}?`,
      text: `Seed ${cmd.seed}.  ${paramSummary}`,
      warnings: warnings.length ? warnings : ['No specific warnings for this configuration.'],
      notice: START_NOTICE,
      confirmLabel: 'I understand, start',
      danger: true,
      onConfirm: () => this._cmd(cmd),
    });
  }

  _onPauseResume() {
    const m = this.manager;
    if (!m) return;
    if (m.state === 'running') this._cmd({ type: 'pause' });
    else if (m.state === 'paused') this._cmd({ type: 'resume' });
  }

  _onReset() {
    const m = this.manager;
    if (!m) return;
    const n = m.journal.size;
    this._confirm({
      title: 'Reset / restore the world?',
      text: n ? `Restores ${n} journaled block${n === 1 ? '' : 's'} to their original state (newest damage first), clears debris and ends the current disaster.` : 'Ends the current disaster and clears debris (the journal is empty, nothing to restore).',
      confirmLabel: 'Restore world',
      onConfirm: () => this._cmd({ type: 'reset' }),
    });
  }

  _onReplay() {
    const m = this.manager;
    if (!m || !m.lastCommand) { this._note('Nothing to replay yet - start a disaster first.'); return; }
    const last = m.lastCommand, cls = m.registry.get(last.disaster);
    this._confirm({
      title: 'Replay last disaster?',
      text: `Restores the world (${m.journal.size} journaled blocks), then re-runs ${cls ? cls.label : last.disaster} with the same seed (${last.seed}) and parameters: ${Object.entries(last.params || {}).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`).join('   ')}`,
      notice: START_NOTICE,
      confirmLabel: 'Replay',
      danger: true,
      onConfirm: () => this._cmd({ type: 'replay' }),
    });
  }

  _onCommit() {
    const m = this.manager, save = this.game.save;
    if (!m || !save) return;
    if (!(m.state === 'finished' || m.state === 'idle') || m.journal.size === 0) { this._note('Commit is only possible after a disaster has finished, with a non-empty journal.'); return; }
    const changes = m.journal.changes(this.game.world);
    this._confirm({
      title: 'Commit damage to save?',
      text: `Bakes ${changes.length} changed block${changes.length === 1 ? '' : 's'} (${m.journal.size} journaled cells) into your persistent save. After this the damage can no longer be restored with Reset.`,
      confirmLabel: 'Commit to save',
      danger: true,
      onConfirm: () => {
        if (!(m.state === 'finished' || m.state === 'idle') || m.journal.size === 0) { this._note('State changed - commit cancelled.'); return; }
        const list = m.journal.changes(this.game.world);
        save.commitDisaster(list);
        m.journal.clear();
        if (m.say) m.say(`Committed ${list.length} block changes to the save.`); else if (this.game.hud) this.game.hud.addMessage(`Committed ${list.length} block changes to the save.`);
        this._refreshStatus();
      },
    });
  }

  _onDiscard() {
    const m = this.manager;
    if (!m) return;
    this._confirm({
      title: 'Discard disaster damage?',
      text: `Restores ${m.journal.size} journaled blocks to their pre-disaster state and clears debris. Nothing is written to the save.`,
      confirmLabel: 'Discard & restore',
      onConfirm: () => this._cmd({ type: 'reset' }),
    });
  }

  _onLiveIntensity() {
    const v = Number(this.liveSlider.value);
    setText(this.liveVal, fmtNum(v, 0.05));
    if (this.liveTimer) clearTimeout(this.liveTimer);
    this.liveTimer = setTimeout(() => {
      this.liveTimer = null;
      const m = this.manager;
      if (m && (m.state === 'running' || m.state === 'paused')) this._cmd({ type: 'set', params: { intensity: v } }, true);
    }, LIVE_DEBOUNCE_MS);
  }

  // ---------------------------------------------------------------- confirmation dialog (inside the panel)
  _confirm({ title, text, warnings = [], notice, confirmLabel = 'Confirm', danger = false, onConfirm }) {
    const box = h('div', { class: 'ap-dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'ap-dialog-title' },
      h('h4', { id: 'ap-dialog-title', text: title }),
      text ? h('p', { text }) : null,
      warnings.length ? h('div', { class: 'ap-warnings', id: 'ap-dialog-warnings' }, warnings.map((w) => h('div', { text: w }))) : null,
      notice ? h('div', { class: 'ap-notice', text: notice }) : null,
      h('div', { class: 'ap-dialog-buttons' },
        h('button', { class: 'ap-btn', type: 'button', id: 'ap-dialog-cancel', text: 'Cancel', onclick: () => this._closeDialog() }),
        h('button', { class: 'ap-btn ' + (danger ? 'ap-danger' : 'ap-primary'), type: 'button', id: 'ap-dialog-confirm', text: confirmLabel, onclick: () => { this._closeDialog(); onConfirm(); } })));
    this.overlay.replaceChildren(box);
    this.overlay.hidden = false;
    this.dialogOpen = true;
    box.querySelector('#ap-dialog-cancel').focus({ preventScroll: true });
  }
  _closeDialog() {
    if (!this.dialogOpen) return;
    this.dialogOpen = false;
    this.overlay.hidden = true;
    this.overlay.replaceChildren();
    if (this.isOpen) this.root.focus({ preventScroll: true });
  }

  _note(text) {
    setText(this.noteEl, text);
    if (this.noteTimer) clearTimeout(this.noteTimer);
    this.noteTimer = setTimeout(() => { this.noteTimer = null; setText(this.noteEl, ''); }, 4000);
  }

  // ---------------------------------------------------------------- console command
  _refreshCommand() {
    if (!this.selectedType) { this.cmdArea.value = ''; return; }
    const str = `game.disasters.command(${jsLiteral(this._currentCommand('start'))})`;
    if (this.cmdArea.value !== str) this.cmdArea.value = str;
  }
  async _copyCommand() {
    const text = this.cmdArea.value;
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; } } catch (e) { ok = false; }
    if (!ok) { try { this.cmdArea.focus(); this.cmdArea.select(); ok = document.execCommand('copy'); } catch (e) { ok = false; } }
    setText(this.copiedEl, ok ? 'Copied!' : 'Copy failed - select the text and press Ctrl+C');
    if (this.copyTimer) clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => { this.copyTimer = null; setText(this.copiedEl, ''); }, 2500);
  }

  // ---------------------------------------------------------------- status / perf readouts
  _refreshStatus(s) {
    const m = this.manager;
    if (!m) return;
    if (!s) s = m.status();
    this.status = s;
    const cls = s.type ? m.registry.get(s.type) : null;
    setText(this.badgeState, s.state);
    this.badgeState.dataset.state = s.state;
    setText(this.badgeOnline, s.online ? 'online' : 'offline');
    this.badgeOnline.dataset.on = String(!!s.online);
    setText(this.badgeAdmin, s.admin ? 'admin' : 'no admin');
    this.badgeAdmin.dataset.admin = String(!!s.admin);

    setText(this.stType, cls ? `${cls.label} (${s.type})` : '\u2014');
    setText(this.stElapsed, `${s.elapsed.toFixed(1)} s` + (s.tick ? `  (tick ${s.tick})` : ''));
    setText(this.stSeed, s.seed === null || s.seed === undefined ? '\u2014' : String(s.seed));
    setText(this.stJournal, `${s.journal} cell${s.journal === 1 ? '' : 's'}`);
    setText(this.stDebris, String(s.debris));
    setText(this.stEdits, `${s.edits} / ${s.restored}`);
    const pct = Math.round(Math.max(0, Math.min(1, s.progress || 0)) * 100);
    const w = pct + '%';
    if (this.progressFill.style.width !== w) this.progressFill.style.width = w;
    setText(this.progressLabel, s.state === 'idle' ? '' : w);
    const restoring = s.state === 'restoring';
    if (this.restoreBox.hidden === restoring) this.restoreBox.hidden = !restoring;
    if (restoring) {
      const rw = Math.round((s.restoreProgress || 0) * 100) + '%';
      if (this.restoreFill.style.width !== rw) this.restoreFill.style.width = rw;
      setText(this.restoreLabel, rw);
    }
    const lines = (s.messages || []).slice(-4);
    const joined = lines.join('\n');
    if (joined !== this.lastLog) {
      this.lastLog = joined;
      this.logEl.replaceChildren(...(lines.length ? lines.map((t) => h('div', { text: t })) : [h('div', { class: 'ap-empty', text: 'No messages yet.' })]));
    }

    // button validity per state
    const running = s.state === 'running', paused = s.state === 'paused', preview = s.state === 'preview', finished = s.state === 'finished';
    const admin = !!s.admin;
    const setDisabled = (b, d) => { if (b.disabled !== d) b.disabled = d; };
    setDisabled(this.btnPreview, !admin || restoring || running || paused || !this.selectedType);
    setText(this.btnPreview, preview ? 'Stop preview' : 'Preview');
    this.btnPreview.classList.toggle('ap-active', preview);
    setDisabled(this.btnStart, !admin || restoring || running || paused || !this.selectedType);
    setDisabled(this.btnPause, !admin || !(running || paused));
    setText(this.btnPause, paused ? 'Resume' : 'Pause');
    setDisabled(this.btnStop, !admin || !(running || paused || preview));
    setDisabled(this.btnReset, !admin || restoring || (s.state === 'idle' && s.journal === 0));
    setDisabled(this.btnReplay, !admin || restoring || !m.lastCommand);
    const replayTitle = m.lastCommand ? `Restore, then re-run ${(m.registry.get(m.lastCommand.disaster) || {}).label || m.lastCommand.disaster} with seed ${m.lastCommand.seed}` : 'Nothing to replay yet';
    if (this.btnReplay.title !== replayTitle) this.btnReplay.title = replayTitle;
    setDisabled(this.btnCommit, !admin || !((finished || s.state === 'idle') && s.journal > 0));
    setDisabled(this.btnDiscard, !admin || restoring || s.journal === 0);
    const liveOk = admin && (running || paused) && !!s.params && typeof s.params.intensity === 'number';
    setDisabled(this.liveSlider, !liveOk);
    if (this.liveBox.dataset.enabled !== String(liveOk)) this.liveBox.dataset.enabled = String(liveOk);
    if (liveOk && document.activeElement !== this.liveSlider && !this.liveTimer) {
      const v = String(s.params.intensity);
      if (this.liveSlider.value !== v) this.liveSlider.value = v;
      setText(this.liveVal, fmtNum(s.params.intensity, 0.05));
    } else if (!liveOk) setText(this.liveVal, s.params && typeof s.params.intensity === 'number' ? fmtNum(s.params.intensity, 0.05) : '\u2014');

    const save = this.game.save;
    setText(this.saveHint, `Journal: ${s.journal} cell${s.journal === 1 ? '' : 's'}` + (save ? `  \u00b7  saved edits: ${save.count}${save.dirty ? ' (writing\u2026)' : ''}` : '') + (s.journal > 0 && !(finished || s.state === 'idle') ? '  \u00b7  stop the disaster to commit' : ''));
  }

  _refreshPerf() {
    const p = this.game.perf;
    if (!p || !this.isOpen) return;
    let text;
    try {
      const s = p.summary();
      const mem = s.memoryMB ? `${s.memoryMB.used.toFixed(0)} MB` : 'mem n/a';
      const gpu = s.gpuMs ? ` \u00b7 gpu ${s.gpuMs.avg.toFixed(1)} ms` : '';
      text = `${s.fps.toFixed(0)} fps \u00b7 js ${s.jsMs.avg.toFixed(1)} ms${gpu} \u00b7 ${s.draw.calls} draws \u00b7 ${mem}`;
      const title = `frame ${s.frameMs.avg.toFixed(1)} ms (p95 ${s.frameMs.p95.toFixed(1)}, max ${s.frameMs.max.toFixed(0)}) \u00b7 js p95 ${s.jsMs.p95.toFixed(1)} ms \u00b7 ${(s.draw.triangles / 1000).toFixed(0)}k tris \u00b7 geometries ${s.geometries} \u00b7 textures ${s.textures} \u00b7 long tasks ${s.longTasks}`;
      if (this.perfEl.title !== title) this.perfEl.title = title;
    } catch (e) { text = 'perf: n/a'; }
    setText(this.perfEl, text);
  }
}
