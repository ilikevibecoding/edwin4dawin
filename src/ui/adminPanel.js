// Administrator / debug control panel for disasters (DOM + CSS).
//
// Interface contract used by game.js: new AdminPanel(game); panel.open(); panel.close(); panel.toggle();
// panel.isOpen; panel.update() called every frame while open. game.js owns the F4 / ` / Esc bindings, releases
// pointer lock and disables the HUD canvas pointer events while the panel is open.
//
// Everything the panel does goes through the DisasterManager command API (game.disasters.command({...})), so
// the console command shown in the Developer section reproduces exactly what the buttons do. Status is read from
// game.disasters.status() (refreshed at ~5 Hz from update() and immediately on manager change events).
//
// Layout: sticky header (title, badges, close) - scrollable body (disaster cards, parameters with a collapsible
// "Advanced" group, quality presets + view distance, collapsible "Developer" footer) - sticky dock (status strip, big primary
// Start/Pause/Resume button, Preview / Stop / Reset / Replay, live intensity while running).
import './adminPanel.css';
import * as THREE from 'three';
import { raycastBlocks } from '../interaction.js';
import { QUALITY, applyQuality } from '../quality.js';
import { pixelIcon, disasterIcon } from './adminIcons.js';

const STORAGE_KEY = 'frontier-craft:admin';
const STATUS_REFRESH_MS = 200;   // 5 Hz DOM refresh of status while open
const PERF_REFRESH_MS = 500;     // 2 Hz perf readout
const LIVE_DEBOUNCE_MS = 150;    // live intensity slider -> {type:'set'}
const PREVIEW_DEBOUNCE_MS = 400; // re-issue preview while editing params during a preview
const SAVE_DEBOUNCE_MS = 250;    // localStorage writes
const NOTE_MS = 4000;            // transient notes in the dock
const CROSSHAIR_REACH = 160;     // fallback raycast length for "Use crosshair target"
const SKY_HEIGHT = 40;           // a target this far above the player is "high in the sky"
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const COMPASS16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const START_NOTICE = 'This changes the world. Every damaged block is recorded so Reset can undo it. Nothing is written to your save unless you commit it from the Developer section.';
const STATE_LABEL = { idle: 'Idle', preview: 'Previewing', running: 'Running', paused: 'Paused', finished: 'Finished', restoring: 'Restoring\u2026' };
// Internal simulation phases -> words a player understands (unknown phases are not shown).
const PHASE_LABEL = {
  'rope-out': 'winding down', wave: 'wave', hold: 'flooded', recede: 'draining', ending: 'draining',
  arrival: 'approaching', approach: 'approaching', charge: 'charging', descent: 'descending', fire: 'firing', impact: 'impact', aftermath: 'aftermath', cancel: 'winding down',
};
const FOCUSABLE = 'button, input, select, textarea, summary, a[href], [tabindex]';
// View distance presets (chunks). game.setRenderDistance(n) is preferred (it persists); older builds only have
// terrain.setRenderDistance(n), so the panel persists the choice itself under the same localStorage key.
const VIEW_DISTANCES = [8, 12, 16, 24];

// Travel destinations (world is 4000+ blocks across: frontier town at the origin, Coruscant plateau at x 3000, the
// Death Star in the space region at z -4000). `air` destinations start in creative flight at the given height;
// ground ones land on the terrain surface. yaw/pitch in degrees (yaw 0 faces -z, 90 faces -x, -90 faces +x).
const DESTINATIONS = [
  { id: 'town', label: 'Frontier town', hint: 'Dustwater main street', x: -8, z: 2, yaw: -90, pitch: -5 },
  { id: 'station', label: 'Frontier station', hint: 'Space train platform + mini spaceport roof deck', x: 262, y: 100, z: 8, yaw: 90, pitch: -12, air: true },
  { id: 'spaceport', label: 'Spaceport', hint: 'Coruscant spaceport terminal + landing pads', x: 2621, y: 98, z: 44, yaw: 0, pitch: -6, air: true },
  { id: 'senate', label: 'Senate', hint: 'Galactic Senate dome and plaza', x: 2975, y: 120, z: 120, yaw: 0, pitch: -18, air: true },
  { id: 'monument', label: 'Monument Plaza', hint: 'Umate rock, pavilions and rotundas', x: 3227, y: 110, z: 90, yaw: 0, pitch: -25, air: true },
  { id: 'skyline', label: 'Coruscant skyline (air)', hint: 'Aerial view over the city', x: 3000, y: 235, z: 330, yaw: 0, pitch: -16, air: true },
  { id: 'deathstar', label: 'Death Star (exterior)', hint: 'Exterior, 260 blocks out', x: 60, y: 170, z: -3720, yaw: 10, pitch: -8, air: true },
  { id: 'hangar', label: 'Death Star hangar', hint: 'Hangar mouth in the equatorial trench', x: 0, y: 130, z: -3880, yaw: 0, pitch: -4, air: true },
];
const VIEW_DISTANCE_HELP = '24 chunks loads ~2000 chunks (~550 MB) and needs a strong GPU.';
const RD_KEY = 'frontier-craft:rd';

// Parameters shown up front (in this order); everything else goes under "Advanced". Disasters without an entry
// get a heuristic pick: location, size, duration, intensity.
const PRIMARY_KEYS = {
  tornado: ['start', 'radius', 'duration', 'intensity'],
  tsunami: ['center', 'waterHeight', 'duration', 'intensity'],
  beam: ['target', 'destructionRadius', 'duration', 'intensity'],
};
// One-line blurbs for the disaster cards (the full schema description is shown under the cards).
const CARD_BLURB = {
  tsunami: 'A wall of water floods the town',
  tornado: 'A funnel tears along a path',
  beam: 'A sky beam carves a crater',
};

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
function setHidden(el, hidden) { if (el.hidden !== hidden) el.hidden = hidden; }
function setAttr(el, name, value) { if (el.getAttribute(name) !== value) el.setAttribute(name, value); }
function setTitle(el, title) { if (el.title !== title) el.title = title; }
function srText(text) { return h('span', { class: 'ap-sr', text }); }
function clampNum(v, min, max) { if (Number.isFinite(min) && v < min) v = min; if (Number.isFinite(max) && v > max) v = max; return v; }
function decimalsFor(step) {
  if (!Number.isFinite(step) || step <= 0) return 0;
  const s = String(step);
  if (s.includes('e-')) return Math.min(6, parseInt(s.split('e-')[1], 10) || 0);
  const i = s.indexOf('.');
  return i < 0 ? 0 : Math.min(6, s.length - i - 1);
}
function fmtNum(v, step) { return Number.isFinite(v) ? Number(v).toFixed(decimalsFor(step)) : '?'; }
function fmtInt(n) { return Number(n || 0).toLocaleString('en-US'); }
function plural(n, word) { return `${fmtInt(n)} ${word}${n === 1 ? '' : 's'}`; }
function compassLabel(deg) { const d = ((Number(deg) % 360) + 360) % 360; return COMPASS[Math.round(d / 45) % 8]; }
// World axes: north is -z, east is +x (a tornado heading of 0 travels towards -z, 90 towards +x).
function compass16(dx, dz) { const deg = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360; return COMPASS16[Math.round(deg / 22.5) % 16]; }
// "95 blocks WNW of you", "190 blocks SW, high in the sky", "right where you stand"
function bearingText(from, to) {
  if (!from || !to || ![from.x, from.z, to.x, to.z].every(Number.isFinite)) return '';
  const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz);
  const high = Number.isFinite(to.y) && Number.isFinite(from.y) && to.y - from.y > SKY_HEIGHT;
  if (d < 2) return high ? 'right above you, high in the sky' : 'right where you stand';
  return `${fmtInt(Math.round(d))} blocks ${compass16(dx, dz)}${high ? ', high in the sky' : ' of you'}`;
}
function isTextTarget(t) { return !!t && ((t.tagName === 'INPUT' && !['range', 'checkbox', 'button'].includes(t.type)) || t.tagName === 'TEXTAREA' || t.isContentEditable); }
// Visible, enabled, tabbable elements inside a scope, in DOM (= Tab) order.
function focusables(scope) {
  return [...scope.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled && el.tabIndex >= 0 && el.offsetParent !== null);
}
// "Flood height (blocks above ground)" -> ['Flood height', 'blocks above ground']
function splitLabel(label) {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(label || '');
  return m ? [m[1], m[2]] : [label || '', ''];
}
function primaryKeys(type, schema) {
  if (PRIMARY_KEYS[type]) return PRIMARY_KEYS[type].filter((k) => schema.some((s) => s.key === k));
  const pick = [];
  const pos = schema.find((s) => s.type === 'position');
  if (pos) pick.push(pos.key);
  const size = schema.find((s) => s.type === 'number' && /radius|height|size/i.test(s.key));
  if (size) pick.push(size.key);
  for (const k of ['duration', 'intensity']) if (schema.some((s) => s.key === k)) pick.push(k);
  return pick.slice(0, 4);
}
// Internal phase of the active disaster (tsunami exposes a phase string, the beam a getter; the tornado only
// has its rope-out ramp).
function phaseOf(active) {
  if (!active) return '';
  if (typeof active.phase === 'string') return active.phase;
  if (Number.isFinite(active.ropeStart) && active.ropeStart >= 0) return 'rope-out';
  return '';
}
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
    this.store = { selected: null, byType: {}, ui: { advanced: false, developer: false } }; // persisted (localStorage)
    this.status = null;
    this.dialogOpen = false;
    this.dialogOpener = null;   // element that opened the confirmation dialog (focus returns to it)
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
    this._refreshQuality();
    this._refreshViewDistance();
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

    // header: title, badges, close
    this.badgeOnline = h('span', { class: 'ap-badge', id: 'ap-badge-online', text: 'Offline' });
    this.badgeAdmin = h('span', { class: 'ap-badge', id: 'ap-badge-admin', text: 'Admin' });
    this.badges = h('div', { class: 'ap-badges' }, this.badgeOnline, this.badgeAdmin);
    const header = h('header', { class: 'ap-header' },
      h('div', { class: 'ap-title' }, h('h2', { text: 'Disaster Control' }), h('small', { text: 'Administrator \u00b7 Esc closes' })),
      this.badges,
      h('button', { class: 'ap-close', id: 'ap-close', type: 'button', title: 'Close (Esc / F4)', 'aria-label': 'Close panel', text: '\u00d7', onclick: () => this._requestClose() }));

    // disaster cards
    this.tabsEl = h('div', { class: 'ap-cards', id: 'ap-tabs', role: 'tablist', 'aria-label': 'Disaster type' });
    this.tabsEl.addEventListener('keydown', (e) => this._onTabsKey(e));
    this.descEl = h('p', { class: 'ap-desc', id: 'ap-desc' });
    const disasterSection = h('section', { class: 'ap-section', id: 'ap-disaster', 'aria-label': 'Disaster' }, this.tabsEl, this.descEl);

    // parameters: header row (title, seed, defaults), primary fields, collapsible advanced group
    this.primaryEl = h('div', { class: 'ap-fields', id: 'ap-form' });
    this.advancedEl = h('div', { class: 'ap-fields ap-disclosure-body', id: 'ap-form-advanced' });
    this.advancedAside = h('span', { class: 'ap-summary-aside' });
    this.advanced = h('details', { class: 'ap-disclosure', id: 'ap-advanced' },
      h('summary', {}, h('span', { text: 'Advanced' }), this.advancedAside),
      this.advancedEl);
    this.advanced.addEventListener('toggle', () => { if (this.store.ui.advanced !== this.advanced.open) { this.store.ui.advanced = this.advanced.open; this._scheduleSave(); } });
    this.seedInput = h('input', { type: 'number', id: 'ap-seed', min: '0', step: '1', value: '1', inputmode: 'numeric', title: 'Seed - the same seed always gives the same run' });
    this.seedInput.addEventListener('input', () => this._onFieldInput());
    this.seedInput.addEventListener('change', () => { this.seedInput.value = String(this._readSeed()); this._onFieldInput(); });
    const seedGroup = h('div', { class: 'ap-seed' },
      h('label', { for: 'ap-seed', text: 'Seed' }), this.seedInput,
      h('button', { class: 'ap-btn ap-icon-btn', id: 'ap-seed-random', type: 'button', title: 'Randomize seed', 'aria-label': 'Randomize seed', onclick: () => this._randomizeSeed() }, pixelIcon('dice', 18), srText('Randomize')));
    const paramsSection = h('section', { class: 'ap-section', id: 'ap-params', 'aria-labelledby': 'ap-params-title' },
      h('div', { class: 'ap-section-head' },
        h('h3', { id: 'ap-params-title', text: 'Parameters' }),
        seedGroup,
        h('button', { class: 'ap-btn ap-mini', id: 'ap-defaults', type: 'button', text: 'Defaults', title: 'Put every parameter back to its default value', onclick: () => this._resetDefaults() })),
      this.primaryEl, this.advanced);

    // quality presets: segmented control in the header row, one-line description below
    this.qualityBtns = {};
    const qualityGroup = h('div', { class: 'ap-seg', id: 'ap-quality', role: 'radiogroup', 'aria-label': 'Quality preset' });
    for (const [name, q] of Object.entries(QUALITY)) {
      const b = h('button', { class: 'ap-seg-btn', id: 'ap-quality-' + name, type: 'button', role: 'radio', 'aria-checked': 'false', text: q.label, title: q.description, onclick: () => this._setQuality(name) });
      this.qualityBtns[name] = b;
      qualityGroup.append(b);
    }
    this.qualityDesc = h('p', { class: 'ap-help ap-one-line', id: 'ap-quality-desc' });
    // view distance: second segmented row right under the quality presets
    this.viewBtns = {};
    this.viewGroup = h('div', { class: 'ap-seg ap-seg-4', id: 'ap-view-distance', role: 'radiogroup', 'aria-labelledby': 'ap-view-title' });
    for (const n of VIEW_DISTANCES) {
      const b = h('button', { class: 'ap-seg-btn', id: 'ap-view-' + n, type: 'button', role: 'radio', 'aria-checked': 'false', text: n === 24 ? '24 (strong PC)' : String(n), title: n === 24 ? VIEW_DISTANCE_HELP : `${n} chunks`, onclick: () => this._setViewDistance(n) });
      this.viewBtns[n] = b;
      this.viewGroup.append(b);
    }
    this.viewHelp = h('p', { class: 'ap-help ap-one-line', id: 'ap-view-help', text: VIEW_DISTANCE_HELP, title: VIEW_DISTANCE_HELP });
    const qualitySection = h('section', { class: 'ap-section', id: 'ap-quality-section', 'aria-labelledby': 'ap-quality-title' },
      h('div', { class: 'ap-section-head' }, h('h3', { id: 'ap-quality-title', text: 'Quality' }), qualityGroup),
      this.qualityDesc,
      h('div', { class: 'ap-section-head ap-subhead' }, h('span', { class: 'ap-sub-title', id: 'ap-view-title', text: 'View distance' }), this.viewGroup),
      this.viewHelp);

    // travel: teleport to the world's regions (flight for aerial vantage points)
    this.travelBtns = {};
    const travelGrid = h('div', { class: 'ap-travel', id: 'ap-travel', role: 'group', 'aria-label': 'Travel destinations' });
    for (const d of DESTINATIONS) {
      const b = h('button', { class: 'ap-btn ap-travel-btn', id: 'ap-travel-' + d.id, type: 'button', text: d.label, title: d.hint, onclick: () => this._travel(d) });
      this.travelBtns[d.id] = b;
      travelGrid.append(b);
    }
    const travelSection = h('section', { class: 'ap-section', id: 'ap-travel-section', 'aria-labelledby': 'ap-travel-title' },
      h('div', { class: 'ap-section-head' }, h('h3', { id: 'ap-travel-title', text: 'Travel' })),
      h('p', { class: 'ap-help ap-one-line', text: 'Jump to a region; aerial spots start you flying (double-tap Space to land).' }),
      travelGrid);

    // developer footer: console command, save, counters, perf
    this.perfEl = h('span', { class: 'ap-summary-aside', id: 'ap-perf', text: 'perf: n/a' });
    this.copiedEl = h('span', { class: 'ap-copied', id: 'ap-copied', 'aria-live': 'polite' });
    this.cmdArea = h('textarea', { id: 'ap-command', readOnly: true, spellcheck: 'false', 'aria-label': 'Console command for the current configuration', wrap: 'soft', rows: '4' });
    this.cmdArea.addEventListener('focus', () => this.cmdArea.select());
    this.saveHint = h('p', { class: 'ap-help', id: 'ap-save-hint', text: 'Recorded damage: 0 blocks' });
    this.btnCommit = h('button', { class: 'ap-btn', id: 'ap-btn-commit', type: 'button', text: 'Commit damage to save', onclick: () => this._onCommit() });
    this.btnDiscard = h('button', { class: 'ap-btn', id: 'ap-btn-discard', type: 'button', text: 'Discard damage', onclick: () => this._onDiscard() });
    this.statsEl = h('p', { class: 'ap-help', id: 'ap-stats', text: '' });
    this.developer = h('details', { class: 'ap-disclosure', id: 'ap-developer' },
      h('summary', {}, h('span', { text: 'Developer' }), this.perfEl),
      h('div', { class: 'ap-disclosure-body' },
        h('div', { class: 'ap-dev-block' },
          h('div', { class: 'ap-dev-head' }, h('label', { for: 'ap-command', text: 'Console command' }), this.copiedEl,
            h('button', { class: 'ap-btn ap-mini', id: 'ap-copy', type: 'button', title: 'Copy the command to the clipboard', onclick: () => this._copyCommand() }, pixelIcon('copy', 18), 'Copy')),
          this.cmdArea,
          h('p', { class: 'ap-help', text: 'Paste it in the devtools console to reproduce this exact configuration.' })),
        h('div', { class: 'ap-dev-block' },
          h('div', { class: 'ap-dev-head' }, h('span', { class: 'ap-dev-title', text: 'Save' })),
          this.saveHint,
          h('div', { class: 'ap-btn-row' }, this.btnCommit, this.btnDiscard)),
        this.statsEl));
    this.developer.addEventListener('toggle', () => { if (this.store.ui.developer !== this.developer.open) { this.store.ui.developer = this.developer.open; this._scheduleSave(); } });

    this.denied = h('div', { class: 'ap-denied', id: 'ap-denied', hidden: true },
      pixelIcon('lock', 48),
      h('h3', { text: 'Administrator permission required' }),
      h('p', { text: 'Single player: remove ?admin=0 from the URL. Multiplayer: join with the admin token (?admin=<token>).' }));
    this.main = h('div', { class: 'ap-main', id: 'ap-main' }, disasterSection, paramsSection, qualitySection, travelSection, this.developer);
    this.body = h('div', { class: 'ap-body' }, this.denied, this.main);

    // dock: status strip + actions (always visible, never scrolls away)
    this.badgeState = h('span', { class: 'ap-state', id: 'ap-badge-state', text: 'Idle', 'data-state': 'idle' });
    this.stPhase = h('span', { class: 'ap-phase', id: 'ap-phase' });
    this.stWho = h('span', { class: 'ap-who' });
    this.stWhere = h('div', { class: 'ap-where', id: 'ap-where', hidden: true });
    this.progressFill = h('div', { class: 'ap-bar-fill' });
    this.progressLabel = h('span', { class: 'ap-bar-label' });
    this.progressBar = h('div', { class: 'ap-bar', id: 'ap-progress', role: 'progressbar', 'aria-label': 'Disaster progress', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0', hidden: true }, this.progressFill, this.progressLabel);
    this.stElapsed = h('span', { class: 'ap-elapsed', title: 'Simulation time since the start' });
    this.stSeed = h('b', { text: '\u2014' });
    this.stJournal = h('b', { id: 'ap-st-journal', text: '0' });
    this.stDebris = h('b', { id: 'ap-st-debris', text: '0' });
    this.logEl = h('div', { class: 'ap-log', id: 'ap-log', 'aria-live': 'polite', hidden: true });
    this.noteEl = h('div', { class: 'ap-note', id: 'ap-note', 'aria-live': 'polite', hidden: true });
    this.countsEl = h('div', { class: 'ap-counts', hidden: true },
      h('span', { title: 'Seed of the running disaster' }, 'Seed ', this.stSeed),
      h('span', { title: 'Damaged blocks recorded so Reset can undo them' }, 'Damage ', this.stJournal),
      h('span', { title: 'Debris pieces in flight' }, 'Debris ', this.stDebris));
    const statusStrip = h('section', { class: 'ap-status', id: 'ap-status', 'aria-label': 'Status' },
      h('div', { class: 'ap-status-row' }, h('span', { class: 'ap-status-left' }, this.badgeState, this.stPhase), h('span', { class: 'ap-status-right' }, this.stWho, this.stElapsed)),
      this.stWhere,
      this.progressBar,
      this.countsEl,
      this.logEl);

    this.btnStart = h('button', { class: 'ap-btn ap-big', id: 'ap-btn-start', type: 'button', text: 'Start', 'data-mode': 'start', 'data-sub': '', onclick: () => this._onPrimary() });
    this.btnPreview = h('button', { class: 'ap-btn', id: 'ap-btn-preview', type: 'button', text: 'Preview', 'aria-pressed': 'false', title: 'Show where the disaster will hit, without changing the world', onclick: () => this._onPreview() });
    this.btnStop = h('button', { class: 'ap-btn', id: 'ap-btn-stop', type: 'button', text: 'Stop', title: 'End the running disaster or preview (damage stays until you Reset)', onclick: () => this._cmd({ type: 'stop' }) });
    this.btnReset = h('button', { class: 'ap-btn', id: 'ap-btn-reset', type: 'button', text: 'Reset', title: 'Restore the world to the state before the disaster', onclick: () => this._onReset() });
    this.btnReplay = h('button', { class: 'ap-btn', id: 'ap-btn-replay', type: 'button', text: 'Replay', title: 'Nothing to replay yet', onclick: () => this._onReplay() });
    this.liveSlider = h('input', { type: 'range', id: 'ap-live-intensity', min: '0', max: '1', step: '0.05', value: '0.7' });
    this.liveVal = h('output', { class: 'ap-val', id: 'ap-live-value', for: 'ap-live-intensity', text: '\u2014' });
    this.liveSlider.addEventListener('input', () => this._onLiveIntensity());
    this.liveBox = h('div', { class: 'ap-live', id: 'ap-live', 'data-enabled': 'false', hidden: true },
      h('label', { for: 'ap-live-intensity', text: 'Live intensity' }), this.liveSlider, this.liveVal);
    this.dock = h('div', { class: 'ap-dock', id: 'ap-controls' },
      statusStrip, this.noteEl, this.liveBox,
      this.btnStart,
      h('div', { class: 'ap-secondary' }, this.btnPreview, this.btnStop, this.btnReset, this.btnReplay));

    this.overlay = h('div', { class: 'ap-overlay', id: 'ap-overlay', hidden: true, onclick: (e) => { if (e.target === this.overlay) this._closeDialog(); } });

    root.append(header, this.body, this.dock, this.overlay);
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
    if (e.key === 'Tab') { this._trapTab(e); e.stopPropagation(); return; }
    if (this._keyPropagates(e)) return;
    e.stopPropagation();
  }
  // Tab cycles inside the open dialog, or inside the panel (last dock button -> close button -> ...).
  _trapTab(e) {
    const scope = this.dialogOpen ? this.overlay.firstElementChild : this.root;
    const items = focusables(scope);
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1], cur = document.activeElement;
    const inside = scope.contains(cur) && cur !== scope;
    if (e.shiftKey ? (!inside || cur === first) : (!inside || cur === last)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
  }
  // Arrow keys move between the disaster cards (WAI-ARIA tabs pattern).
  _onTabsKey(e) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.code)) return;
    const tabs = [...this.tabsEl.children];
    if (!tabs.length) return;
    let i = tabs.findIndex((t) => t.dataset.type === this.selectedType);
    if (e.code === 'ArrowLeft') i = (i - 1 + tabs.length) % tabs.length;
    else if (e.code === 'ArrowRight') i = (i + 1) % tabs.length;
    else i = e.code === 'Home' ? 0 : tabs.length - 1;
    e.preventDefault();
    this.selectType(tabs[i].dataset.type);
    tabs[i].focus();
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

  dispose() {
    for (const u of this.unsubscribe) u();
    this.unsubscribe = [];
    this.subscribed = false;
    this._flushSave();
    for (const t of ['liveTimer', 'previewTimer', 'noteTimer', 'copyTimer']) if (this[t]) { clearTimeout(this[t]); this[t] = null; }
    this.root.remove();
  }

  // ---------------------------------------------------------------- permission / selector
  _refreshPermission() {
    const admin = this.game.permissions ? this.game.permissions.isAdmin() : true;
    setHidden(this.denied, admin);
    setHidden(this.main, !admin);
    setHidden(this.badges, !admin);
    setHidden(this.dock, !admin);
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
        const blurb = CARD_BLURB[type] || (cls.description || '').split(/[,.;]/)[0];
        return h('button', { class: 'ap-card', type: 'button', role: 'tab', 'data-type': type, id: 'ap-tab-' + type, 'aria-selected': 'false', 'aria-controls': 'ap-params', title: cls.description || blurb, onclick: () => this.selectType(type) },
          disasterIcon(type, 48),
          h('span', { class: 'ap-card-name', text: cls.label || type }),
          h('span', { class: 'ap-card-desc', text: blurb }));
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
    for (const b of this.tabsEl.children) {
      const sel = b.dataset.type === type;
      setAttr(b, 'aria-selected', String(sel));
      setAttr(b, 'tabindex', sel ? '0' : '-1');
    }
    const cls = m.registry.get(type);
    const desc = cls ? (cls.description || '') : '';
    setText(this.descEl, desc);
    setTitle(this.descEl, desc);
    if (this.builtType !== type) this._buildForm(type);
    this._refreshCommand();
  }

  // ---------------------------------------------------------------- parameter form (auto-generated from schema)
  _buildForm(type) {
    const m = this.manager;
    const cls = m.registry.get(type);
    const stored = this.store.byType[type];
    const params = cls.clampParams(stored && stored.params ? stored.params : {});
    const schema = m.schema(type);
    const primary = primaryKeys(type, schema);
    this.fields = [];
    this.primaryEl.replaceChildren();
    this.advancedEl.replaceChildren();
    // primary fields first, in the configured order, then the rest in schema order
    const ordered = [...primary.map((k) => schema.find((s) => s.key === k)), ...schema.filter((s) => !primary.includes(s.key))];
    let advancedCount = 0;
    for (const s of ordered) {
      const f = this._makeField(s, params[s.key]);
      this.fields.push(f);
      if (primary.includes(s.key)) this.primaryEl.append(f.el);
      else { this.advancedEl.append(f.el); advancedCount++; }
    }
    if (!this.fields.length) this.primaryEl.append(h('p', { class: 'ap-help', text: 'This disaster has no parameters.' }));
    setHidden(this.advanced, advancedCount === 0);
    setText(this.advancedAside, advancedCount ? `${advancedCount} more setting${advancedCount === 1 ? '' : 's'}` : '');
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

  _fieldHead(s, forId) {
    const [name, hint] = splitLabel(s.label);
    const label = h(forId ? 'label' : 'span', { class: 'ap-field-name', for: forId || undefined, id: forId ? undefined : 'ap-l-' + s.key },
      name, hint ? h('small', { text: hint }) : null);
    return { name, hint, label };
  }

  _fieldNumber(s, value, angle) {
    const id = 'ap-f-' + s.key;
    const min = Number.isFinite(s.min) ? s.min : (angle ? 0 : undefined), max = Number.isFinite(s.max) ? s.max : (angle ? 360 : undefined);
    const unit = angle ? '\u00b0' : (s.unit || '');
    const step = Number.isFinite(s.step) && s.step > 0 ? s.step : (angle ? 1 : 'any');
    const { name, label } = this._fieldHead(s, id);
    const unitEl = h('span', { class: 'ap-unit', text: unit });
    const range = h('input', { type: 'range', id: 'ap-s-' + s.key, min: String(min ?? 0), max: String(max ?? 100), step: String(step), 'aria-label': name + ' slider' });
    const num = h('input', { type: 'number', id, min: min !== undefined ? String(min) : undefined, max: max !== undefined ? String(max) : undefined, step: String(step), inputmode: 'decimal' });
    const el = h('div', { class: 'ap-field', 'data-key': s.key, title: `${name}: ${min ?? '\u2212\u221e'} to ${max ?? '\u221e'}${unit ? ' ' + unit : ''}` },
      h('div', { class: 'ap-field-head' }, label),
      h('div', { class: 'ap-field-row' }, range, num, unitEl));
    let cur = Number(value);
    const show = () => { setText(unitEl, angle ? `\u00b0 ${compassLabel(cur)}` : unit); };
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
    const { label } = this._fieldHead(s, id);
    const sel = h('select', { id }, options.map((o) => h('option', { value: String(o), text: String(o) })));
    const el = h('div', { class: 'ap-field', 'data-key': s.key }, h('div', { class: 'ap-field-head' }, label), h('div', { class: 'ap-field-row' }, sel));
    const set = (v) => { sel.value = options.includes(v) ? String(v) : String(s.default); };
    sel.addEventListener('change', () => this._onFieldInput());
    set(value);
    return { key: s.key, schema: s, el, get: () => sel.value, set };
  }

  _fieldBoolean(s, value) {
    const id = 'ap-f-' + s.key;
    const cb = h('input', { type: 'checkbox', id });
    const [name, hint] = splitLabel(s.label);
    const el = h('div', { class: 'ap-field', 'data-key': s.key }, h('label', { class: 'ap-check', for: id }, cb, h('span', { class: 'ap-field-name' }, name, hint ? h('small', { text: hint }) : null)));
    cb.addEventListener('change', () => this._onFieldInput());
    const set = (v) => { cb.checked = !!v; };
    set(value);
    return { key: s.key, schema: s, el, get: () => cb.checked, set };
  }

  // x / z inputs, "use my position" / "use crosshair target" icon buttons and a bearing line relative to the player
  // ("95 blocks WNW of you"), refreshed on edits and with the status (the player may be drifting).
  _fieldPosition(s, value) {
    const idX = `ap-f-${s.key}-x`, idZ = `ap-f-${s.key}-z`;
    const [name] = splitLabel(s.label);
    const x = h('input', { type: 'number', id: idX, step: '1', min: '-4000', max: '4000', 'aria-label': name + ' x', inputmode: 'numeric' });
    const z = h('input', { type: 'number', id: idZ, step: '1', min: '-4000', max: '4000', 'aria-label': name + ' z', inputmode: 'numeric' });
    const useMe = h('button', { class: 'ap-btn ap-icon-btn ap-use-me', type: 'button', title: 'Use my position', 'aria-label': 'Use my position' }, pixelIcon('me', 16), srText('Use my position'));
    const useHit = h('button', { class: 'ap-btn ap-icon-btn ap-use-hit', type: 'button', title: 'Use crosshair target (block under the crosshair)', 'aria-label': 'Use crosshair target' }, pixelIcon('target', 18), srText('Use crosshair target'));
    const bearing = h('span', { class: 'ap-bearing', id: 'ap-b-' + s.key, title: 'Distance and direction from where you stand' });
    const el = h('div', { class: 'ap-field ap-field-pos', 'data-key': s.key, title: `${name}: world coordinates in blocks (\u00b14000)` },
      h('div', { class: 'ap-field-head' }, h('span', { class: 'ap-field-name', id: 'ap-l-' + s.key, text: name }), bearing),
      h('div', { class: 'ap-field-row ap-pos' },
        h('label', { class: 'ap-axis', for: idX, text: 'x' }), x,
        h('label', { class: 'ap-axis', for: idZ, text: 'z' }), z,
        h('span', { class: 'ap-pos-tools' }, useMe, useHit)));
    const num = (inp, fallback) => { const v = Number(inp.value); return inp.value !== '' && Number.isFinite(v) ? clampNum(v, -4000, 4000) : fallback; };
    const def = Array.isArray(s.default) ? s.default : [0, 0];
    const get = () => [num(x, def[0]), num(z, def[1])];
    const refresh = () => {
      const p = this.game.player && this.game.player.pos;
      const [px, pz] = get();
      setText(bearing, p ? bearingText(p, { x: px, z: pz }) : '');
    };
    const set = (v) => { const p = Array.isArray(v) && v.length >= 2 ? v : def; x.value = String(Number(p[0]) || 0); z.value = String(Number(p[1]) || 0); refresh(); };
    for (const inp of [x, z]) { inp.addEventListener('input', () => { refresh(); this._onFieldInput(); }); inp.addEventListener('change', () => { set(get()); this._onFieldInput(); }); }
    useMe.addEventListener('click', () => {
      const p = this.game.player && this.game.player.pos;
      if (!p) { this._note('Player position unavailable.'); return; }
      set([Math.round(p.x), Math.round(p.z)]);
      this._onFieldInput();
      this._note(`${name} set to your position (${Math.round(p.x)}, ${Math.round(p.z)}).`);
    });
    useHit.addEventListener('click', () => {
      const hit = this._crosshairTarget();
      if (!hit) { this._note('No block under the crosshair.'); return; }
      set([hit.x, hit.z]);
      this._onFieldInput();
      this._note(`${name} set to the crosshair target (${hit.x}, ${hit.y}, ${hit.z}).`);
    });
    set(value);
    return { key: s.key, schema: s, el, get, set, refresh };
  }

  _fieldText(s, value) {
    const id = 'ap-f-' + s.key;
    const { label } = this._fieldHead(s, id);
    const inp = h('input', { type: 'text', id, class: 'ap-input' });
    const el = h('div', { class: 'ap-field', 'data-key': s.key }, h('div', { class: 'ap-field-head' }, label, h('span', { class: 'ap-unit', text: s.type })), h('div', { class: 'ap-field-row' }, inp));
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
    this._note('Parameters reset to their defaults.');
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

  // ---------------------------------------------------------------- quality presets
  _setQuality(name) {
    if (!QUALITY[name]) return;
    try { applyQuality(this.game, name); }
    catch (e) { console.error('quality preset failed', e); this._note('Could not apply the quality preset.'); return; }
    this._refreshQuality();
    this._note(`${QUALITY[name].label} quality applied.`);
  }
  _refreshQuality() {
    const cur = QUALITY[this.game.quality] ? this.game.quality : 'cinematic';
    for (const [name, b] of Object.entries(this.qualityBtns)) {
      setAttr(b, 'aria-checked', String(name === cur));
      setAttr(b, 'tabindex', name === cur ? '0' : '-1');
    }
    const q = QUALITY[cur];
    setText(this.qualityDesc, `${q.description}.`);
    setTitle(this.qualityDesc, `${q.description}. View distance ${q.renderDistance} chunks, up to ${fmtInt(q.maxDebris)} debris pieces.`);
    this._refreshViewDistance();
  }

  // ---------------------------------------------------------------- view distance
  // Teleports the player to a destination: the target chunk column is generated first so the player never lands
  // inside unloaded terrain; aerial spots switch to creative flight, ground spots land on the surface.
  _travel(d) {
    const g = this.game, p = g.player;
    if (!p || !g.world || !g.terrain) { this._note('Travel is not available here.'); return; }
    try {
      const cx = Math.floor(d.x / 16), cz = Math.floor(d.z / 16);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) g.terrain.ensureChunk(cx + dx, cz + dz);
      let y = d.y;
      if (!d.air) { const s = g.world.surfaceY(Math.floor(d.x), Math.floor(d.z)); y = (s > 0 ? s : 64) + 1; }
      p.flying = !!d.air;
      p.teleport(d.x + 0.5, y, d.z + 0.5);
      p.yaw = (d.yaw || 0) * Math.PI / 180;
      p.pitch = (d.pitch || 0) * Math.PI / 180;
      if (g.terrain.lastCx !== undefined) g.terrain.lastCx = null;   // force the streamer to re-evaluate visibility
      if (g.hud && typeof g.hud.addMessage === 'function') g.hud.addMessage(`Travelled to ${d.label}${d.air ? ' (flying)' : ''}.`);
    } catch (e) { console.error('travel failed', e); this._note('Could not travel there.'); return; }
    this._note(`Travelled to ${d.label}.`);
    this.close();
  }

  _setViewDistance(n) {
    const g = this.game;
    try {
      if (typeof g.setRenderDistance === 'function') g.setRenderDistance(n);
      else if (g.terrain && typeof g.terrain.setRenderDistance === 'function') {
        g.terrain.setRenderDistance(n);
        try { localStorage.setItem(RD_KEY, String(g.terrain.renderDistance)); } catch (e) { /* storage unavailable */ }
      } else { this._note('View distance cannot be changed here.'); return; }
    } catch (e) { console.error('view distance failed', e); this._note('Could not change the view distance.'); return; }
    this._refreshViewDistance();
    const actual = g.terrain ? Number(g.terrain.renderDistance) : n;
    this._note(actual === n ? `View distance set to ${n} chunks.` : `View distance set to ${actual} chunks (this build caps it at ${actual}).`);
  }
  // Highlights the option nearest to the live value (the pause menu and quality presets change it too).
  _refreshViewDistance() {
    const cur = this.game.terrain ? Number(this.game.terrain.renderDistance) : NaN;
    const nearest = Number.isFinite(cur) ? VIEW_DISTANCES.reduce((a, b) => (Math.abs(b - cur) < Math.abs(a - cur) ? b : a)) : null;
    for (const [n, b] of Object.entries(this.viewBtns)) {
      const on = Number(n) === nearest;
      setAttr(b, 'aria-checked', String(on));
      setAttr(b, 'tabindex', on ? '0' : '-1');
    }
    setAttr(this.viewGroup, 'data-exact', String(nearest !== null && nearest === cur));
    setTitle(this.viewGroup, Number.isFinite(cur) ? `View distance: ${cur} chunks${nearest === cur ? '' : ` (nearest option highlighted)`}` : 'View distance in chunks');
  }

  // ---------------------------------------------------------------- persistence (localStorage)
  _load() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { data = null; }
    if (data && typeof data === 'object') {
      if (data.byType && typeof data.byType === 'object') this.store.byType = data.byType;
      if (typeof data.selected === 'string') this.store.selected = data.selected;
      if (data.ui && typeof data.ui === 'object') this.store.ui = { advanced: !!data.ui.advanced, developer: !!data.ui.developer };
    }
    if (this.advanced.open !== this.store.ui.advanced) this.advanced.open = this.store.ui.advanced;
    if (this.developer.open !== this.store.ui.developer) this.developer.open = this.store.ui.developer;
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
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, selected: this.store.selected, byType: this.store.byType, ui: this.store.ui })); } catch (e) { /* storage unavailable */ }
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

  // Friendly "label: value" pairs for a parameter set (confirmation dialogs).
  _paramDetails(cls, params) {
    if (!cls || !params) return [];
    const me = this.game.player && this.game.player.pos;
    return cls.schema.map((s) => {
      const v = params[s.key];
      if (v === undefined) return null;
      const [name] = splitLabel(s.label);
      let value;
      switch (s.type) {
        case 'position': {
          value = Array.isArray(v) ? `${v[0]}, ${v[1]}` : String(v);
          const b = Array.isArray(v) && me ? bearingText(me, { x: Number(v[0]), z: Number(v[1]) }) : '';
          if (b) value += ` (${b})`;
          break;
        }
        case 'angle': value = `${fmtNum(Number(v), s.step)}\u00b0 ${compassLabel(v)}`; break;
        case 'number': value = fmtNum(Number(v), s.step) + (s.unit ? ' ' + s.unit : ''); break;
        case 'boolean': value = v ? 'yes' : 'no'; break;
        default: value = Array.isArray(v) ? v.join(', ') : String(v);
      }
      return { label: name, value };
    }).filter(Boolean);
  }

  _onPrimary() {
    const m = this.manager;
    if (!m) return;
    if (m.state === 'running' || m.state === 'paused') this._onPauseResume();
    else this._onStart();
  }

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
    const start = () => this._cmd(cmd);
    this._confirm({
      title: `Start ${cls.label}?`,
      text: `Seed ${cmd.seed} - the same seed always gives the same run.`,
      details: this._paramDetails(cls, cmd.params),
      warnings: warnings.length ? warnings : ['No specific warnings for this configuration.'],
      notice: START_NOTICE,
      confirmLabel: 'I understand, start',
      danger: true,
      onConfirm: start,
      // "Start & watch": same command, then the panel closes so the player is back in the world.
      secondary: { label: 'Start & watch', title: 'Start, then close the panel so you can watch it happen', onConfirm: () => { const r = start(); if (!r || r.ok !== false) this._requestClose(); } },
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
      title: 'Restore the world?',
      text: n ? `Puts ${plural(n, 'recorded block')} back the way ${n === 1 ? 'it was' : 'they were'} (newest damage first), clears the debris and ends the current disaster.` : 'Ends the current disaster and clears the debris. No damage has been recorded, so there is nothing to restore.',
      confirmLabel: 'Restore world',
      onConfirm: () => this._cmd({ type: 'reset' }),
    });
  }

  _onReplay() {
    const m = this.manager;
    if (!m || !m.lastCommand) { this._note('Nothing to replay yet - start a disaster first.'); return; }
    const last = m.lastCommand, cls = m.registry.get(last.disaster);
    this._confirm({
      title: 'Replay the last disaster?',
      text: `Restores the world first (${plural(m.journal.size, 'recorded block')}), then runs ${cls ? cls.label : last.disaster} again with seed ${last.seed} and the same parameters.`,
      details: this._paramDetails(cls, last.params),
      notice: START_NOTICE,
      confirmLabel: 'Replay',
      danger: true,
      onConfirm: () => this._cmd({ type: 'replay' }),
    });
  }

  _onCommit() {
    const m = this.manager, save = this.game.save;
    if (!m || !save) return;
    if (!(m.state === 'finished' || m.state === 'idle') || m.journal.size === 0) { this._note('Commit is only possible after a disaster has finished and damage has been recorded.'); return; }
    const changes = m.journal.changes(this.game.world);
    this._confirm({
      title: 'Commit the damage to your save?',
      text: `Bakes ${plural(changes.length, 'changed block')} (${plural(m.journal.size, 'recorded cell')}) into your persistent save. Afterwards Reset can no longer undo them.`,
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
      title: 'Discard the damage?',
      text: `Restores ${plural(m.journal.size, 'recorded block')} to their pre-disaster state and clears the debris. Nothing is written to your save.`,
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
  // `secondary` adds a second confirm button ({label, title, onConfirm}); #ap-dialog-confirm stays the first one.
  _confirm({ title, text, details = [], warnings = [], notice, confirmLabel = 'Confirm', danger = false, onConfirm, secondary = null }) {
    const opener = document.activeElement;
    this.dialogOpener = opener && opener !== this.root && this.root.contains(opener) ? opener : null;
    const box = h('div', { class: 'ap-dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'ap-dialog-title', 'data-danger': String(!!danger) },
      h('h4', { id: 'ap-dialog-title', text: title }),
      text ? h('p', { text }) : null,
      details.length ? h('div', { class: 'ap-chips', id: 'ap-dialog-details' }, details.map((d) => h('span', { class: 'ap-chip' }, h('b', { text: d.label }), d.value))) : null,
      warnings.length ? h('div', { class: 'ap-warnings', id: 'ap-dialog-warnings' }, warnings.map((w) => h('div', { text: w }))) : null,
      notice ? h('div', { class: 'ap-notice', text: notice }) : null,
      h('div', { class: 'ap-dialog-buttons', 'data-count': secondary ? '3' : '2' },
        h('button', { class: 'ap-btn ap-cancel', type: 'button', id: 'ap-dialog-cancel', text: 'Cancel', onclick: () => this._closeDialog() }),
        h('button', { class: 'ap-btn ' + (danger ? 'ap-danger' : 'ap-primary'), type: 'button', id: 'ap-dialog-confirm', text: confirmLabel, onclick: () => { this._closeDialog(); onConfirm(); } }),
        secondary ? h('button', { class: 'ap-btn ap-go', type: 'button', id: 'ap-dialog-watch', text: secondary.label, title: secondary.title, onclick: () => { this._closeDialog(); secondary.onConfirm(); } }) : null));
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
    const back = this.dialogOpener;
    this.dialogOpener = null;
    if (!this.isOpen) return;
    if (back && back.isConnected && !back.disabled && back.offsetParent !== null) back.focus({ preventScroll: true });
    else this.root.focus({ preventScroll: true });
  }

  _note(text) {
    setText(this.noteEl, text);
    setHidden(this.noteEl, !text);
    if (this.noteTimer) clearTimeout(this.noteTimer);
    this.noteTimer = setTimeout(() => { this.noteTimer = null; setText(this.noteEl, ''); setHidden(this.noteEl, true); }, NOTE_MS);
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

  // ---------------------------------------------------------------- where is it?
  // Where the active disaster is right now as {label, x, z, y?}: the live simulation position when the disaster
  // exposes one (tornado funnel, tsunami wave front, beam station on approach), otherwise its position parameter.
  _disasterSpot(a, s) {
    const type = s.type, params = a.params || s.params || {};
    if (type === 'tornado' && a.position && Number.isFinite(a.position.x)) return { label: 'Funnel', x: a.position.x, z: a.position.z };
    if (type === 'tsunami') {
      const g = a.g, p = this.game.player.pos;
      if (a.phase === 'wave' && g && Number.isFinite(a.s) && Number.isFinite(g.dx) && Number.isFinite(g.r)) {
        // point of the wave front closest to the player (the front is a line across the travel direction)
        const ahead = ((p.x - g.cx) * g.dx + (p.z - g.cz) * g.dz + g.r) - a.s;
        return { label: 'Wave front', x: p.x - g.dx * ahead, z: p.z - g.dz * ahead };
      }
      if (Array.isArray(params.center)) return { label: 'Flood center', x: params.center[0], z: params.center[1] };
    }
    if (type === 'beam') {
      const ph = a.phase, st = a.stationPos;
      if (s.state !== 'preview' && (ph === 'arrival' || ph === 'approach') && st && Number.isFinite(st.x)) return { label: 'Station', x: st.x, y: st.y, z: st.z };
      if (Array.isArray(params.target)) return { label: 'Beam target', x: params.target[0], z: params.target[1] };
    }
    const schema = (a.constructor && a.constructor.schema) || [];
    const pos = schema.find((f) => f.type === 'position');
    if (pos && Array.isArray(params[pos.key])) return { label: splitLabel(pos.label)[0], x: params[pos.key][0], z: params[pos.key][1] };
    return null;
  }
  _whereText(s) {
    const m = this.manager, a = m && m.active, p = this.game.player && this.game.player.pos;
    if (!a || !p) return '';
    try {
      const spot = this._disasterSpot(a, s);
      const b = spot ? bearingText(p, spot) : '';
      return b ? `${spot.label} ${b}` : '';
    } catch (e) { return ''; }
  }

  // ---------------------------------------------------------------- status / perf readouts
  _refreshStatus(s) {
    const m = this.manager;
    if (!m) return;
    if (!s) s = m.status();
    this.status = s;
    const cls = s.type ? m.registry.get(s.type) : null;
    const selected = this.selectedType ? m.registry.get(this.selectedType) : null;
    const idle = s.state === 'idle', running = s.state === 'running', paused = s.state === 'paused', preview = s.state === 'preview', finished = s.state === 'finished', restoring = s.state === 'restoring';
    const stopped = finished && !!(m.active && m.active.stopping); // Stop pressed (a natural end leaves stopping unset)
    const admin = !!s.admin;
    const last = (s.messages || []).slice(-1)[0] || '';

    // header badges
    setText(this.badgeOnline, s.online ? 'Online' : 'Offline');
    this.badgeOnline.dataset.on = String(!!s.online);
    setText(this.badgeAdmin, admin ? 'Admin' : 'No admin');
    this.badgeAdmin.dataset.admin = String(admin);

    // status strip: idle is a single chip line; the bar, counts and log only appear once something happens
    setText(this.badgeState, stopped ? 'Stopped' : (STATE_LABEL[s.state] || s.state));
    this.badgeState.dataset.state = s.state;
    const phase = (running || paused || finished) ? (PHASE_LABEL[phaseOf(m.active)] || '') : '';
    setText(this.stPhase, idle ? (last || 'Nothing is running') : phase ? `\u00b7 ${phase}` : '');
    const who = cls && !idle ? cls.label : '';
    setText(this.stWho, restoring ? `${Math.round((s.restoreProgress || 0) * 100)}%` : who);
    setText(this.stElapsed, (running || paused || finished) ? `${s.elapsed.toFixed(1)} s` : '');
    setTitle(this.stElapsed, s.tick ? `Simulation time since the start (tick ${s.tick})` : 'Simulation time since the start');
    const where = (running || paused || preview) ? this._whereText(s) : '';
    setText(this.stWhere, where);
    setHidden(this.stWhere, !where);
    const pct = Math.round(Math.max(0, Math.min(1, (restoring ? s.restoreProgress : s.progress) || 0)) * 100);
    const w = pct + '%';
    if (this.progressFill.style.width !== w) this.progressFill.style.width = w;
    setAttr(this.progressBar, 'aria-valuenow', String(pct));
    setAttr(this.progressBar, 'data-mode', restoring ? 'restore' : 'run');
    setText(this.progressLabel, restoring ? '' : w); // while restoring the percentage is shown once, next to the chip
    setHidden(this.progressBar, idle || preview);
    setText(this.stSeed, s.seed === null || s.seed === undefined ? '\u2014' : String(s.seed));
    setText(this.stJournal, plural(s.journal, 'block'));
    setText(this.stDebris, fmtInt(s.debris));
    setHidden(this.countsEl, idle);
    if (last !== this.lastLog) { this.lastLog = last; setText(this.logEl, last); }
    setHidden(this.logEl, idle || !last);
    for (const f of this.fields) if (f.refresh) f.refresh();
    this._refreshViewDistance();

    // primary button: Start (idle / preview / finished) -> Pause (running) -> Resume (paused)
    const mode = running ? 'pause' : paused ? 'resume' : 'start';
    if (this.btnStart.dataset.mode !== mode) {
      this.btnStart.dataset.mode = mode;
      setText(this.btnStart, mode === 'pause' ? 'Pause' : mode === 'resume' ? 'Resume' : 'Start');
    }
    const sub = mode === 'start' ? (selected ? selected.label : '') : who;
    if (this.btnStart.dataset.sub !== sub) this.btnStart.dataset.sub = sub;
    const setDisabled = (b, d) => { if (b.disabled !== d) b.disabled = d; };
    setDisabled(this.btnStart, !admin || restoring || (mode === 'start' && !this.selectedType));
    setTitle(this.btnStart, mode === 'pause' ? 'Pause the simulation (the world keeps its damage)' : mode === 'resume' ? 'Continue the paused disaster' : selected ? `Start ${selected.label} with these parameters (asks for confirmation)` : 'Select a disaster first');

    // secondary buttons
    setDisabled(this.btnPreview, !admin || restoring || running || paused || !this.selectedType);
    setAttr(this.btnPreview, 'aria-pressed', String(preview));
    setTitle(this.btnPreview, preview ? 'Stop the preview' : 'Show where the disaster will hit, without changing the world');
    setDisabled(this.btnStop, !admin || !(running || paused || preview));
    setDisabled(this.btnReset, !admin || restoring || ((idle || preview) && s.journal === 0)); // nothing to undo yet
    setTitle(this.btnReset, (idle || preview) && s.journal === 0 ? 'Nothing to restore yet' : 'Restore the world to the state before the disaster');
    setDisabled(this.btnReplay, !admin || restoring || !m.lastCommand);
    setTitle(this.btnReplay, m.lastCommand ? `Restore the world, then run ${(m.registry.get(m.lastCommand.disaster) || {}).label || m.lastCommand.disaster} again with seed ${m.lastCommand.seed}` : 'Nothing to replay yet');

    // live intensity (only while a disaster with an intensity parameter runs)
    const liveOk = admin && (running || paused) && !!s.params && typeof s.params.intensity === 'number';
    setDisabled(this.liveSlider, !liveOk);
    setHidden(this.liveBox, !liveOk);
    if (this.liveBox.dataset.enabled !== String(liveOk)) this.liveBox.dataset.enabled = String(liveOk);
    if (liveOk && document.activeElement !== this.liveSlider && !this.liveTimer) {
      const v = String(s.params.intensity);
      if (this.liveSlider.value !== v) this.liveSlider.value = v;
      setText(this.liveVal, fmtNum(s.params.intensity, 0.05));
    } else if (!liveOk) setText(this.liveVal, s.params && typeof s.params.intensity === 'number' ? fmtNum(s.params.intensity, 0.05) : '\u2014');

    // developer section
    setDisabled(this.btnCommit, !admin || !((finished || idle) && s.journal > 0));
    setDisabled(this.btnDiscard, !admin || restoring || s.journal === 0);
    const save = this.game.save;
    setText(this.saveHint, `Recorded damage: ${plural(s.journal, 'block')}` + (save ? `  \u00b7  saved edits: ${save.count}${save.dirty ? ' (writing\u2026)' : ''}` : '') + (s.journal > 0 && !(finished || idle) ? '  \u00b7  stop the disaster to commit' : ''));
    setText(this.statsEl, `Edits ${fmtInt(s.edits)} \u00b7 restored ${fmtInt(s.restored)} \u00b7 tick ${fmtInt(s.tick)}` + (s.type && !idle ? ` \u00b7 ${s.type}` : ''));
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
      setTitle(this.perfEl, `frame ${s.frameMs.avg.toFixed(1)} ms (p95 ${s.frameMs.p95.toFixed(1)}, max ${s.frameMs.max.toFixed(0)}) \u00b7 js p95 ${s.jsMs.p95.toFixed(1)} ms \u00b7 ${(s.draw.triangles / 1000).toFixed(0)}k tris \u00b7 geometries ${s.geometries} \u00b7 textures ${s.textures} \u00b7 long tasks ${s.longTasks}`);
    } catch (e) { text = 'perf: n/a'; }
    setText(this.perfEl, text);
  }
}
