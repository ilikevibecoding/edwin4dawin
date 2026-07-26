/**
 * MENU SYSTEM — Northstar Rescue
 * Owner: Fable 1.
 *
 * Thirteen screens: title, settings, controls, difficulty, briefing, loadout,
 * loading, pause, victory, defeat, restartConfirm, gallery, credits.
 *
 * Design rules (visual bible): cold navy/cyan, red reserved for danger,
 * letter-spaced display type from web-safe stacks, zero network requests.
 * Full keyboard navigation: arrows / Tab move focus, Enter activates,
 * Esc always goes back (and always closes the pause menu).
 */

import { settings as settingsSingleton, DEFAULTS, QUALITY_PRESETS } from '../core/settings.js';
import { CONTROL_REFERENCE } from '../core/input.js';
import { WEAPONS, LOADOUT_PRESETS } from '../weapons/defs.js';
import { HOSTAGE_SPOTS, EXTRACTION_ZONE, CHECKPOINTS } from '../map/layout.js';
import { bus, EV } from '../core/events.js';
import { assets as assetRegistry } from '../core/assets.js';
import { icon, iconMarkup, weaponIcon, keycap, pips, titleMark, applyUiPrefs, registerUiManifest } from './icons.js';
import { Minimap } from './minimap.js';

registerUiManifest();

/* ------------------------------------------------------------------ */
/* DOM helper                                                          */
/* ------------------------------------------------------------------ */

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'onclick') el.addEventListener('click', v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === undefined || c === null || c === false) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/* ------------------------------------------------------------------ */
/* Static content                                                      */
/* ------------------------------------------------------------------ */

const SUBTITLE_LINE = 'Northstar Administrative Center · Winter Response';

const DIFFICULTIES = [
  {
    id: 'recruit', name: 'Recruit', pips: 1, tag: 'Learn the building.',
    points: [
      'Hostiles react slowly and miss often',
      'You take substantially reduced damage',
      'Health regenerates between fights',
      'Generous utility supply',
    ],
  },
  {
    id: 'operator', name: 'Operator', pips: 2, tag: 'The intended experience.',
    points: [
      'Standard hostile reaction times and damage',
      'Health regenerates only partially',
      'Standard utility supply',
    ],
  },
  {
    id: 'veteran', name: 'Veteran', pips: 3, tag: 'Accurate, aggressive hostiles.',
    points: [
      'Hostiles flank, push and hold cover',
      'Full damage, no health regeneration',
      'Reduced utility supply',
      'Alerts spread through the building faster',
    ],
  },
  {
    id: 'blackout', name: 'Blackout', pips: 4, tag: 'Power is cut. No second chances.',
    points: [
      'Emergency lighting only',
      'Deadliest hostiles, near-instant alerts',
      'No tactical minimap during play',
      'One attempt — death ends the operation',
    ],
  },
];

const TIPS = [
  'Lean with Q and Z to check a corridor before you commit to it.',
  'A flash device will not injure hostages. Smoke will not stop bullets.',
  'Hostiles investigate noise. A suppressed pace — Shift — keeps you quiet.',
  'Secured hostages follow you. Tell them to hold with E before a fight.',
  'The building is a double loop: every objective room has two approaches.',
  'Glass breaks loudly and permanently. Sound travels through the hole.',
  'Armor absorbs most body hits but nothing aimed at your head.',
  'The extraction garage is on the east side. The van will not wait forever.',
  'Doors can be opened quietly or shoved. Only one of these is polite.',
  'Check the mission timer. Overtime is when hostage takers get nervous.',
];

const MISSION_TEXT = [
  'At 05:12 this morning an armed cell seized the Northstar Administrative '
  + 'Center during a scheduled maintenance window. Two staff members did not '
  + 'make it out before the doors were chained.',
  'A winter storm has closed the air corridor: no drone cover, no thermal '
  + 'overwatch, no second team. You insert alone through the north courtyard, '
  + 'locate both hostages, and walk them out through the east garage.',
];

const OBJECTIVE_LIST = [
  'Insert through the north courtyard and breach the security vestibule.',
  'Locate and secure Dana Reyes — last seen in the Aurora conference room, ground floor.',
  'Locate and secure Milo Chen — last seen in the executive office, upper floor.',
  'Escort both hostages to the extraction garage on the east side.',
  'Hold the extraction zone until the vehicle arrives.',
];

const ROE_LIST = [
  'Hostage safety overrides every other consideration. A hostage injured by your fire ends the operation.',
  'Positive identification before every shot — both hostages are dressed as office staff.',
  'Flash devices are cleared for rooms containing hostages; fragmentation is not carried on this operation.',
  'Minimise structural noise until first contact. After first contact, speed is your cover.',
];

const CREDITS_ROLES = [
  ['Opus 1', 'Lead architect & integrator'],
  ['Opus 2', 'Player & combat systems'],
  ['Opus 3', 'AI, objectives & round systems'],
  ['Opus 4', 'Testing, performance & release quality'],
  ['Fable 1', 'Art direction, visual bible & interface'],
  ['Fable 2', 'Map architecture & environmental composition'],
  ['Fable 3', 'Props, materials, decals & storytelling'],
  ['Fable 4', 'Characters, weapons, animation & effects'],
];

/* Settings screen specification — every key in DEFAULTS appears exactly once. */
const pct = (v) => `${Math.round(v * 100)}%`;
const SETTINGS_TABS = [
  {
    id: 'audio', label: 'Audio', icon: 'audio',
    rows: [
      { key: 'masterVolume', label: 'Master volume', type: 'slider', min: 0, max: 1, step: 0.01, fmt: pct },
      { key: 'sfxVolume', label: 'Effects volume', type: 'slider', min: 0, max: 1, step: 0.01, fmt: pct },
      { key: 'musicVolume', label: 'Music volume', type: 'slider', min: 0, max: 1, step: 0.01, fmt: pct },
    ],
  },
  {
    id: 'input', label: 'Controls', icon: 'mouse',
    rows: [
      { key: 'mouseSensitivity', label: 'Mouse sensitivity', type: 'slider', min: 0.02, max: 0.5, step: 0.005, fmt: (v) => Number(v).toFixed(3) },
      { key: 'adsSensitivityScale', label: 'Aim-down-sights sensitivity', type: 'slider', min: 0.2, max: 1.5, step: 0.05, fmt: pct },
      { key: 'invertY', label: 'Invert vertical look', type: 'toggle' },
      { key: 'toggleCrouch', label: 'Crouch as toggle', type: 'toggle', hint: 'Off: hold to crouch' },
      { key: 'toggleAds', label: 'Aim as toggle', type: 'toggle', hint: 'Off: hold to aim' },
      { type: 'link', label: 'Key reference', button: 'View all controls', testid: 'btn-view-controls', screen: 'controls' },
    ],
  },
  {
    id: 'video', label: 'Video', icon: 'graphics',
    rows: [
      { key: 'quality', label: 'Quality preset', type: 'segmented', options: Object.entries(QUALITY_PRESETS).map(([v, p]) => ({ value: v, label: p.label })) },
      { key: 'fov', label: 'Field of view', type: 'slider', min: 60, max: 110, step: 1, fmt: (v) => `${Math.round(v)}°` },
      { key: 'resolutionScale', label: 'Resolution scale', type: 'slider', min: 0.5, max: 1.5, step: 0.05, fmt: pct },
      { key: 'motionBlur', label: 'Motion blur', type: 'toggle' },
    ],
  },
  {
    id: 'access', label: 'Accessibility', icon: 'access',
    rows: [
      { key: 'crosshairVisible', label: 'Show crosshair', type: 'toggle' },
      {
        key: 'crosshairStyle', label: 'Crosshair style', type: 'segmented', iconed: true,
        options: [
          { value: 'dynamic', label: 'Dynamic', icon: 'crosshair-dynamic' },
          { value: 'cross', label: 'Cross', icon: 'crosshair-cross' },
          { value: 'dot', label: 'Dot', icon: 'crosshair-dot' },
          { value: 'none', label: 'None', icon: 'crosshair-none' },
        ],
      },
      { key: 'uiScale', label: 'Interface scale', type: 'slider', min: 0.8, max: 1.4, step: 0.05, fmt: pct, live: 'uiScale' },
      { key: 'subtitles', label: 'Subtitles', type: 'toggle' },
      { key: 'showMinimap', label: 'Tactical minimap', type: 'toggle' },
      { key: 'showHitmarkers', label: 'Hit markers', type: 'toggle' },
      { key: 'reducedCameraMotion', label: 'Reduced camera motion', type: 'toggle', hint: 'Softens bob, sway and shake' },
      { key: 'reducedBlood', label: 'Reduced blood', type: 'toggle' },
      {
        key: 'colorBlindMode', label: 'Colour-blind mode', type: 'segmented',
        options: [
          { value: 'off', label: 'Off' },
          { value: 'protanopia', label: 'Protan' },
          { value: 'deuteranopia', label: 'Deutan' },
          { value: 'tritanopia', label: 'Tritan' },
        ],
      },
    ],
  },
];

/* Fallback Esc targets when a screen was opened directly by the lead. */
const ESC_FALLBACK = {
  settings: 'title',
  controls: 'title',
  gallery: 'title',
  credits: 'title',
  difficulty: 'title',
  loadout: 'difficulty',
  briefing: 'loadout',
  restartConfirm: 'pause',
};

/* ------------------------------------------------------------------ */
/* Loadout stat derivation from WEAPONS numbers                        */
/* ------------------------------------------------------------------ */

function rawWeaponStats(w) {
  const adsSpread = w.adsPelletSpread ?? w.spreadAds ?? 0.1;
  return {
    damage: Math.sqrt((w.damage ?? 0) * (w.pellets ?? 1)),
    rof: w.rpm ?? 0,
    accuracy: 1 - clamp01(adsSpread / 1.8),
    control: (w.recoilRecovery ?? 8) / (2 + (w.recoilPitch ?? 1) * 2 + (w.recoilYaw ?? 0.5)),
    mobility: (w.moveSpeedScale ?? 1) - (w.weight ?? 3) * 0.018,
  };
}

function loadoutStatBars(primaryId) {
  const all = LOADOUT_PRESETS.map((p) => rawWeaponStats(WEAPONS[p.primary]));
  const mine = rawWeaponStats(WEAPONS[primaryId]);
  const norm = (key, floor = 0) => {
    const max = Math.max(...all.map((s) => s[key]));
    const min = Math.min(...all.map((s) => s[key]));
    const span = Math.max(1e-6, max - min);
    return clamp01(floor + (1 - floor) * ((mine[key] - min) / span));
  };
  return [
    { label: 'Damage', v: norm('damage', 0.18) },
    { label: 'Rate of fire', v: norm('rof', 0.08) },
    { label: 'Accuracy', v: mine.accuracy },
    { label: 'Control', v: norm('control', 0.1) },
    { label: 'Mobility', v: norm('mobility', 0.15) },
  ];
}

/* ------------------------------------------------------------------ */
/* MenuSystem                                                          */
/* ------------------------------------------------------------------ */

export class MenuSystem {
  constructor(rootEl, game) {
    this.root = rootEl;
    this.game = game ?? {};
    this._active = null;
    this._stack = [];
    this._disposers = [];
    this._snow = null;
    this._tipIdx = Math.floor(Math.random() * TIPS.length);
    this._tipTimer = 0;
    this._extUpdateAt = 0;
    this._loadState = { fraction: 0, label: 'Preparing…' };

    this.layer = h('div', { class: 'menu-layer', 'data-testid': 'menu-layer' });
    rootEl.appendChild(this.layer);
    applyUiPrefs(this._settings());

    this._onKeyBound = (e) => this._onKey(e);
    window.addEventListener('keydown', this._onKeyBound, true);
    this._onClickBound = (e) => {
      if (e.target.closest('button, a, input, select')) bus.emit(EV.UI_SOUND, { id: 'ui.click' });
    };
    this.layer.addEventListener('click', this._onClickBound);
  }

  get active() {
    return this._active;
  }

  _settings() {
    return this.game?.settings ?? settingsSingleton;
  }

  /** Defensive bridge to the game object. */
  _call(name, ...args) {
    const fn = this.game?.[name];
    if (typeof fn === 'function') {
      try {
        return { ok: true, value: fn.apply(this.game, args) };
      } catch (err) {
        console.warn(`[menus] game.${name}() threw`, err);
        return { ok: false };
      }
    }
    console.warn(`[menus] game.${name} is not available`);
    return { ok: false };
  }

  /* ---------------- navigation ---------------- */

  show(screenId, opts = {}) {
    const builder = this._builders()[screenId];
    if (!builder) {
      console.warn(`[menus] unknown screen "${screenId}"`);
      return;
    }
    if (!opts._internal) this._stack = [];
    this._teardown();
    this._active = screenId;
    this.layer.classList.add('open');
    const el = builder.call(this, opts);
    el.classList.add('screen');
    el.setAttribute('data-testid', `screen-${screenId}`);
    this.layer.replaceChildren(el);
    this._focus(el.querySelector('[data-autofocus]') ?? this._focusables()[0]);
    this._startAnim();
  }

  hide() {
    this._teardown();
    this._active = null;
    this._stack = [];
    this.layer.classList.remove('open');
    this.layer.replaceChildren();
  }

  _nav(screenId, opts = {}) {
    if (this._active) this._stack.push(this._active);
    this.show(screenId, { ...opts, _internal: true });
  }

  _back() {
    const prev = this._stack.pop();
    if (prev) {
      this.show(prev, { _internal: true });
      return;
    }
    if (this._active === 'pause') {
      this.hide();
      this._call('resume');
      return;
    }
    const fb = ESC_FALLBACK[this._active];
    if (fb) this.show(fb, { _internal: true });
  }

  _teardown() {
    for (const fn of this._disposers.splice(0)) {
      try { fn(); } catch { /* already gone */ }
    }
    this._stopAnim();
  }

  /* ---------------- per-frame ---------------- */

  update(dt) {
    this._extUpdateAt = performance.now();
    this._advance(dt || 0.016);
  }

  _advance(dt) {
    if (!this._active) return;
    this._tipTimer += dt;
    if (this._tipTimer > 6 && this._tipEl) {
      this._tipTimer = 0;
      this._tipIdx = (this._tipIdx + 1) % TIPS.length;
      this._tipEl.textContent = TIPS[this._tipIdx];
    }
    if (this._snow) this._drawSnow(dt);
  }

  _startAnim() {
    this._stopAnim();
    let last = performance.now();
    const loop = (now) => {
      this._rafId = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      // If the lead is driving update(dt) every frame, do not double-step.
      if (now - this._extUpdateAt > 250) this._advance(dt);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  _stopAnim() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this._snow = null;
    this._tipEl = null;
  }

  /* ---------------- keyboard navigation ---------------- */

  _focusables() {
    return Array.from(this.layer.querySelectorAll(
      'button, input, select, [tabindex="0"]',
    )).filter((el) => !el.disabled && el.offsetParent !== null);
  }

  _focus(el) {
    if (!el) return;
    try { el.focus({ preventScroll: false }); } catch { /* detached */ }
  }

  _onKey(e) {
    if (!this._active || e.__nsMenuHandled) return;

    if (e.code === 'Escape') {
      if (['title', 'loading', 'victory', 'defeat'].includes(this._active)) return;
      e.__nsMenuHandled = true;
      e.preventDefault();
      this._back();
      return;
    }

    const items = this._focusables();
    if (!items.length) return;
    const idx = items.indexOf(document.activeElement);
    const move = (dir) => {
      e.preventDefault();
      e.__nsMenuHandled = true;
      const next = items[(idx + dir + items.length) % items.length] ?? items[0];
      this._focus(next);
      bus.emit(EV.UI_SOUND, { id: 'ui.move' });
    };

    const tag = document.activeElement?.tagName;
    const type = document.activeElement?.getAttribute?.('type');
    const isRange = tag === 'INPUT' && type === 'range';
    const isSelect = tag === 'SELECT';
    const isTextInput = tag === 'INPUT' && (type === 'text' || type === 'search');

    switch (e.code) {
      case 'Tab':
        move(e.shiftKey ? -1 : 1);
        break;
      case 'ArrowDown':
        if (!isSelect) move(1);
        break;
      case 'ArrowUp':
        if (!isSelect) move(-1);
        break;
      case 'ArrowRight':
        if (!isRange && !isTextInput) move(1);
        break;
      case 'ArrowLeft':
        if (!isRange && !isTextInput) move(-1);
        break;
      default:
        break;
    }
  }

  /* ---------------- shared chrome ---------------- */

  _frame({ title, kicker, wide = false, back = true, backLabel = 'Back' } = {}) {
    const body = h('div', { class: 'panel-body' });
    const foot = h('footer', { class: 'panel-foot' });
    if (back) {
      foot.appendChild(h('button', {
        class: 'btn btn-ghost', 'data-testid': 'btn-back', text: `‹ ${backLabel}`,
        onclick: () => this._back(),
      }));
    }
    const root = h('div', { class: `screen-shell${wide ? ' wide' : ''}` },
      h('div', { class: 'panel' },
        h('header', { class: 'panel-head' },
          kicker ? h('div', { class: 'kicker', text: kicker }) : null,
          h('h2', { class: 'panel-title', text: title })),
        body, foot));
    return { root, body, foot };
  }

  /* ---------------- screen builders ---------------- */

  _builders() {
    return {
      title: this._screenTitle,
      settings: this._screenSettings,
      controls: this._screenControls,
      difficulty: this._screenDifficulty,
      briefing: this._screenBriefing,
      loadout: this._screenLoadout,
      loading: this._screenLoading,
      pause: this._screenPause,
      victory: (o) => this._screenEnd('victory', o),
      defeat: (o) => this._screenEnd('defeat', o),
      restartConfirm: this._screenRestartConfirm,
      gallery: this._screenGallery,
      credits: this._screenCredits,
    };
  }

  /* --- 1. Title -------------------------------------------------- */

  _screenTitle() {
    const snow = h('canvas', { class: 'snow', 'aria-hidden': 'true' });
    this._initSnow(snow);

    const menu = h('nav', { class: 'title-menu' },
      h('button', { class: 'btn btn-primary btn-lg', 'data-testid': 'btn-begin', 'data-autofocus': '1', text: 'Begin Operation', onclick: () => this._nav('difficulty') }),
      h('button', { class: 'btn', 'data-testid': 'btn-settings', text: 'Settings', onclick: () => this._nav('settings') }),
      h('button', { class: 'btn', 'data-testid': 'btn-controls', text: 'Controls', onclick: () => this._nav('controls') }),
      h('button', { class: 'btn', 'data-testid': 'btn-gallery', text: 'Asset Gallery', onclick: () => this._nav('gallery') }),
      h('button', { class: 'btn', 'data-testid': 'btn-credits', text: 'Credits', onclick: () => this._nav('credits') }));

    return h('div', { class: 'screen-title-root' },
      snow,
      h('div', { class: 'title-block' },
        titleMark(104),
        h('h1', { class: 'title-name' },
          h('span', { class: 'tn-main', text: 'NORTHSTAR' }),
          h('span', { class: 'tn-sub', text: 'RESCUE' })),
        h('div', { class: 'title-tag', text: SUBTITLE_LINE })),
      menu,
      h('footer', { class: 'title-foot', text: 'A single-operator hostage rescue · all assets generated in code · runs fully offline' }));
  }

  _initSnow(canvas) {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      || this._settings().get('reducedCameraMotion');
    const flakes = [];
    const N = 110;
    for (let i = 0; i < N; i++) {
      flakes.push({
        x: Math.random(), y: Math.random(),
        r: 0.6 + Math.random() * 1.7,
        v: 9 + Math.random() * 18,
        sway: Math.random() * Math.PI * 2,
        a: 0.14 + Math.random() * 0.42,
      });
    }
    this._snow = { canvas, ctx: canvas.getContext('2d'), flakes, t: 0, reduced };
    this._drawSnow(0);
  }

  _drawSnow(dt) {
    const s = this._snow;
    if (!s || !s.canvas.isConnected) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = s.canvas.clientWidth || window.innerWidth;
    const hh = s.canvas.clientHeight || window.innerHeight;
    if (s.canvas.width !== Math.round(w * dpr)) {
      s.canvas.width = Math.round(w * dpr);
      s.canvas.height = Math.round(hh * dpr);
    }
    const ctx = s.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hh);
    s.t += dt;
    ctx.fillStyle = '#d6ecfa';
    for (const f of s.flakes) {
      if (!s.reduced) {
        f.y += (f.v * dt) / hh;
        f.x += Math.sin(s.t * 0.5 + f.sway) * 0.00006 * f.v;
        if (f.y > 1.02) { f.y = -0.02; f.x = Math.random(); }
      }
      ctx.globalAlpha = f.a;
      ctx.beginPath();
      ctx.arc(f.x * w, f.y * hh, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* --- 2. Settings ------------------------------------------------ */

  _screenSettings(opts = {}) {
    const s = this._settings();
    const tabId = opts.tab ?? this._settingsTab ?? 'audio';
    this._settingsTab = tabId;

    const { root, body, foot } = this._frame({ title: 'Settings', kicker: 'System Configuration' });
    root.querySelector('.panel').classList.add('panel-settings');

    const tabBar = h('div', { class: 'tabs', role: 'tablist' });
    const pane = h('div', { class: 'settings-pane' });

    const renderPane = (tid) => {
      this._settingsTab = tid;
      for (const b of tabBar.children) b.classList.toggle('active', b.dataset.tab === tid);
      const tab = SETTINGS_TABS.find((t) => t.id === tid) ?? SETTINGS_TABS[0];
      pane.replaceChildren(...tab.rows.map((row) => this._settingRow(row, s)));
    };

    for (const tab of SETTINGS_TABS) {
      tabBar.appendChild(h('button', {
        class: 'tab', role: 'tab', 'data-tab': tab.id, 'data-testid': `tab-${tab.id}`,
        html: iconMarkup(tab.icon, { size: 15 }),
        onclick: () => renderPane(tab.id),
      }, h('span', { text: tab.label })));
    }
    renderPane(tabId);

    body.append(tabBar, pane);
    foot.appendChild(h('button', {
      class: 'btn btn-ghost', 'data-testid': 'btn-reset-defaults', text: 'Reset to defaults',
      onclick: () => {
        if (typeof s.reset === 'function') s.reset();
        else s.patch?.({ ...DEFAULTS });
        applyUiPrefs(s);
        this.show('settings', { _internal: true, tab: this._settingsTab });
      },
    }));
    return root;
  }

  _settingRow(row, s) {
    if (row.type === 'link') {
      return h('div', { class: 'set-row' },
        h('label', { class: 'set-label', text: row.label }),
        h('button', { class: 'btn btn-sm', 'data-testid': row.testid, text: row.button, onclick: () => this._nav(row.screen) }));
    }

    const label = h('label', { class: 'set-label', text: row.label, for: `set-${row.key}` });
    const rowEl = h('div', { class: 'set-row' }, label);
    if (row.hint) label.appendChild(h('small', { text: row.hint }));

    const commit = (value) => {
      try {
        s.set(row.key, value);
      } catch (err) {
        console.warn(`[menus] could not set "${row.key}"`, err);
      }
      if (row.key === 'uiScale' || row.key === 'colorBlindMode' || row.key === 'reducedCameraMotion') applyUiPrefs(s);
    };

    if (row.type === 'slider') {
      const val = Number(s.get(row.key) ?? DEFAULTS[row.key]);
      const out = h('output', { class: 'set-value', text: row.fmt(val) });
      const input = h('input', {
        type: 'range', id: `set-${row.key}`, 'data-testid': `set-${row.key}`,
        min: row.min, max: row.max, step: row.step, value: val,
      });
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        out.textContent = row.fmt(v);
        commit(v);
      });
      rowEl.append(input, out);
    } else if (row.type === 'toggle') {
      const on = !!s.get(row.key);
      const btn = h('button', {
        class: `switch${on ? ' on' : ''}`, id: `set-${row.key}`, 'data-testid': `set-${row.key}`,
        role: 'switch', 'aria-checked': String(on),
      }, h('span', { class: 'switch-knob' }), h('span', { class: 'switch-word', text: on ? 'On' : 'Off' }));
      btn.addEventListener('click', () => {
        const now = !btn.classList.contains('on');
        btn.classList.toggle('on', now);
        btn.setAttribute('aria-checked', String(now));
        btn.querySelector('.switch-word').textContent = now ? 'On' : 'Off';
        commit(now);
      });
      rowEl.appendChild(btn);
    } else if (row.type === 'segmented') {
      const cur = s.get(row.key) ?? DEFAULTS[row.key];
      const seg = h('div', { class: 'seg', 'data-testid': `set-${row.key}` });
      for (const opt of row.options) {
        const b = h('button', {
          class: `seg-item${opt.value === cur ? ' active' : ''}`,
          'data-testid': `set-${row.key}-${opt.value}`,
          html: opt.icon ? iconMarkup(opt.icon, { size: 16 }) : '',
        }, h('span', { text: opt.label }));
        b.addEventListener('click', () => {
          for (const c of seg.children) c.classList.toggle('active', c === b);
          commit(opt.value);
        });
        seg.appendChild(b);
      }
      rowEl.appendChild(seg);
    }
    return rowEl;
  }

  /* --- 3. Controls reference -------------------------------------- */

  _screenControls() {
    const { root, body } = this._frame({ title: 'Controls', kicker: 'Key Reference' });
    const table = h('div', { class: 'ctrl-table' });
    for (const row of CONTROL_REFERENCE) {
      table.appendChild(h('div', { class: 'ctrl-row' },
        h('span', { class: 'ctrl-keys' }, keycap(row.keys)),
        h('span', { class: 'ctrl-label', text: row.label })));
    }
    body.appendChild(table);
    body.appendChild(h('p', { class: 'fine-print', text: 'Bindings are fixed for this operation. Sensitivity, invert and toggle behaviours are in Settings › Controls.' }));
    return root;
  }

  /* --- 4. Difficulty ---------------------------------------------- */

  _screenDifficulty() {
    const { root, body } = this._frame({ title: 'Select Difficulty', kicker: 'Operation Parameters', wide: true });
    const current = this.game?.difficulty ?? 'operator';
    const grid = h('div', { class: 'card-grid cards-4' });
    for (const d of DIFFICULTIES) {
      const card = h('button', {
        class: `card diff-card${d.id === current ? ' selected' : ''}`,
        'data-testid': `btn-difficulty-${d.id}`,
        ...(d.id === current ? { 'data-autofocus': '1' } : {}),
        onclick: () => {
          this._call('setDifficulty', d.id);
          this._nav('loadout');
        },
      },
        pips(d.pips),
        h('h3', { text: d.name }),
        h('p', { class: 'card-tag', text: d.tag }),
        h('ul', { class: 'card-points' }, d.points.map((p) => h('li', { text: p }))));
      grid.appendChild(card);
    }
    body.appendChild(grid);
    return root;
  }

  /* --- 6. Loadout -------------------------------------------------- */

  _screenLoadout() {
    const { root, body } = this._frame({ title: 'Select Loadout', kicker: 'Equipment Issue', wide: true });
    const current = this.game?.loadout ?? 'assault';
    const grid = h('div', { class: 'card-grid cards-4' });

    for (const preset of LOADOUT_PRESETS) {
      const primary = WEAPONS[preset.primary];
      const secondary = WEAPONS[preset.secondary];
      const bars = loadoutStatBars(preset.primary);

      const card = h('button', {
        class: `card loadout-card${preset.id === current ? ' selected' : ''}`,
        'data-testid': `btn-loadout-${preset.id}`,
        ...(preset.id === current ? { 'data-autofocus': '1' } : {}),
        onclick: () => {
          this._call('setLoadout', preset.id);
          this._nav('briefing');
        },
      },
        h('div', { class: 'card-head' },
          h('h3', { text: preset.name }),
          preset.recommended ? h('span', { class: 'chip chip-gold', text: 'Recommended' }) : null),
        h('p', { class: 'card-tag', text: preset.summary }),
        h('div', { class: 'lo-weapon' }, weaponIcon(primary?.hudIcon ?? 'rifle', { size: 52 }),
          h('div', { class: 'lo-weapon-names' },
            h('b', { text: primary?.name ?? preset.primary }),
            h('small', { text: primary?.fullName ?? '' }))),
        h('div', { class: 'stat-bars' }, bars.map((b) =>
          h('div', { class: 'stat-bar' },
            h('span', { class: 'sb-label', text: b.label }),
            h('span', { class: 'sb-track' }, h('span', { class: 'sb-fill', style: `width:${Math.round(b.v * 100)}%` }))))),
        h('div', { class: 'lo-extras' },
          h('span', { class: 'lo-extra' }, weaponIcon(secondary?.hudIcon ?? 'pistol', { size: 30 }), h('small', { text: secondary?.name ?? '' })),
          h('span', { class: 'lo-extra' }, ...(preset.utility ?? []).map((u) => icon(WEAPONS[u]?.hudIcon ?? 'flash', { size: 15 }))),
          h('span', { class: 'lo-extra lo-armor' }, icon('armor', { size: 14 }), h('small', { text: `Armor ${preset.armor}` })),
          preset.speedBonus ? h('span', { class: 'lo-extra' }, icon('footstep', { size: 14 }), h('small', { text: `+${Math.round(preset.speedBonus * 100)}% speed` })) : null));
      grid.appendChild(card);
    }
    body.appendChild(grid);
    return root;
  }

  /* --- 5. Briefing -------------------------------------------------- */

  _screenBriefing() {
    const { root, body, foot } = this._frame({ title: 'Mission Briefing', kicker: 'Operation Northstar Rescue', wide: true });

    const left = h('div', { class: 'brief-col brief-text' },
      h('h4', { text: 'Situation' }),
      ...MISSION_TEXT.map((p) => h('p', { text: p })),
      h('h4', { text: 'Objectives' }),
      h('ol', { class: 'brief-objectives' }, OBJECTIVE_LIST.map((o) => h('li', { text: o }))),
      h('h4', { text: 'Hostages' }),
      h('div', { class: 'brief-hostages' }, HOSTAGE_SPOTS.map((hs) =>
        h('div', { class: 'brief-hostage' },
          icon('hostage', { size: 18 }),
          h('div', {},
            h('b', { text: hs.name }),
            h('small', { text: `Last known: ${hs.hint}` }))))),
      h('h4', { text: 'Rules of Engagement' }),
      h('ul', { class: 'brief-roe' }, ROE_LIST.map((r) => h('li', { text: r }))));

    // Floor plan drawn from the ROOMS data via the Minimap renderer.
    const planCanvas = h('canvas', { class: 'brief-plan-canvas' });
    const plan = new Minimap(planCanvas);
    plan.setExpanded(true);
    const spawn = CHECKPOINTS.spawn?.pos ?? [0, 0, -27.5];
    const planData = (floor) => ({
      playerPos: spawn,
      playerYaw: 0,
      floor,
      hostages: HOSTAGE_SPOTS.map((hs) => ({ pos: hs.pos, floor: hs.floor, state: 'located' })),
      objectives: [],
      enemies: [],
      extraction: EXTRACTION_ZONE,
    });
    this._disposers.push(() => plan.dispose());

    const floorBtns = h('div', { class: 'seg plan-floors' });
    const setFloor = (floor) => {
      for (const b of floorBtns.children) b.classList.toggle('active', b.dataset.floor === floor);
      requestAnimationFrame(() => plan.update(planData(floor)));
    };
    floorBtns.append(
      h('button', { class: 'seg-item active', 'data-floor': 'ground', 'data-testid': 'btn-plan-ground', text: 'Ground Floor', onclick: () => setFloor('ground') }),
      h('button', { class: 'seg-item', 'data-floor': 'upper', 'data-testid': 'btn-plan-upper', text: 'Upper Floor', onclick: () => setFloor('upper') }));

    const legend = h('div', { class: 'plan-legend' },
      h('span', {}, h('i', { class: 'lg lg-player' }), 'Insertion'),
      h('span', {}, h('i', { class: 'lg lg-hostage' }), 'Hostage (last known)'),
      h('span', {}, h('i', { class: 'lg lg-ext' }), 'Extraction'),
      h('span', {}, h('i', { class: 'lg lg-door' }), 'Door'));

    const controlsSummary = h('div', { class: 'brief-controls' },
      h('h4', { text: 'Control Summary' }),
      h('div', { class: 'ctrl-mini' }, CONTROL_REFERENCE.slice(0, 10).map((c) =>
        h('span', { class: 'ctrl-mini-item' }, keycap(c.keys), h('small', { text: c.label })))));

    const right = h('div', { class: 'brief-col brief-plan' },
      floorBtns,
      h('div', { class: 'brief-plan-frame' }, planCanvas),
      legend, controlsSummary);

    body.appendChild(h('div', { class: 'brief-grid' }, left, right));
    requestAnimationFrame(() => plan.update(planData('ground')));

    foot.appendChild(h('div', { class: 'foot-spacer' }));
    foot.appendChild(h('button', {
      class: 'btn btn-primary btn-lg', 'data-testid': 'btn-deploy', 'data-autofocus': '1', text: 'Deploy',
      onclick: () => {
        this._call('start', { difficulty: this.game?.difficulty, loadout: this.game?.loadout });
      },
    }));
    return root;
  }

  /* --- 7. Loading -------------------------------------------------- */

  _screenLoading() {
    this._loadState = { fraction: 0, label: 'Preparing…' };
    this._loadFill = h('span', { class: 'load-fill' });
    this._loadLabel = h('div', { class: 'load-label', text: this._loadState.label });
    this._loadPct = h('span', { class: 'load-pct', text: '0%' });
    this._tipEl = h('p', { class: 'load-tip', text: TIPS[this._tipIdx] });
    this._tipTimer = 0;

    return h('div', { class: 'screen-loading-root' },
      h('div', { class: 'load-block' },
        titleMark(72),
        h('div', { class: 'load-title', text: 'NORTHSTAR RESCUE' }),
        h('div', { class: 'load-sub', text: SUBTITLE_LINE }),
        h('div', { class: 'load-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100' }, this._loadFill),
        h('div', { class: 'load-row' }, this._loadLabel, this._loadPct),
        h('div', { class: 'load-tip-box' },
          h('span', { class: 'load-tip-kicker', text: 'Tactical note' }), this._tipEl)));
  }

  /** Drives the loading screen. Safe to call before/without show('loading'). */
  setProgress(fraction, label) {
    const f = clamp01(Number(fraction) || 0);
    this._loadState = { fraction: f, label: label ?? this._loadState.label };
    if (this._active !== 'loading' || !this._loadFill?.isConnected) return;
    this._loadFill.style.width = `${(f * 100).toFixed(1)}%`;
    this._loadPct.textContent = `${Math.round(f * 100)}%`;
    if (label) this._loadLabel.textContent = label;
    this._loadFill.closest('.load-bar')?.setAttribute('aria-valuenow', String(Math.round(f * 100)));
  }

  /* --- 8. Pause ----------------------------------------------------- */

  _screenPause() {
    const resume = () => {
      this.hide();
      this._call('resume');
    };
    return h('div', { class: 'screen-shell dim' },
      h('div', { class: 'panel panel-narrow' },
        h('header', { class: 'panel-head' },
          h('div', { class: 'kicker', text: 'Operation Paused' }),
          h('h2', { class: 'panel-title', text: 'Northstar Rescue' })),
        h('div', { class: 'panel-body menu-stack' },
          h('button', { class: 'btn btn-primary', 'data-testid': 'btn-resume', 'data-autofocus': '1', text: 'Resume', onclick: resume }),
          h('button', { class: 'btn', 'data-testid': 'btn-settings', text: 'Settings', onclick: () => this._nav('settings') }),
          h('button', { class: 'btn', 'data-testid': 'btn-controls', text: 'Controls', onclick: () => this._nav('controls') }),
          h('button', { class: 'btn', 'data-testid': 'btn-restart', text: 'Restart Mission', onclick: () => this._nav('restartConfirm') }),
          h('button', { class: 'btn btn-ghost', 'data-testid': 'btn-menu', text: 'Return to Menu', onclick: () => this._returnToMenu() })),
        h('footer', { class: 'panel-foot' },
          h('span', { class: 'fine-print' }, keycap('Esc'), ' resume'))));
  }

  _returnToMenu() {
    const r = this._call('returnToMenu');
    if (!r.ok) this.show('title');
  }

  /* --- 9. Victory / Defeat ------------------------------------------ */

  _stats() {
    const g = this.game;
    const raw = typeof g?.stats === 'function' ? g.stats() : g?.stats ?? {};
    const num = (...keys) => {
      for (const k of keys) if (raw?.[k] != null && !Number.isNaN(Number(raw[k]))) return Number(raw[k]);
      return null;
    };
    const timeRaw = num('time', 'missionTime', 'elapsed', 'timeSeconds', 'duration');
    const timeSec = timeRaw == null ? null : timeRaw >= 1000 ? timeRaw / 1000 : timeRaw;
    const shots = num('shotsFired', 'shots');
    const hits = num('shotsHit', 'hits');
    let accuracy = num('accuracy');
    if (accuracy == null && shots && hits != null) accuracy = hits / shots;
    if (accuracy != null && accuracy <= 1) accuracy *= 100;
    return {
      time: timeSec == null ? '—' : `${Math.floor(timeSec / 60)}:${String(Math.floor(timeSec % 60)).padStart(2, '0')}`,
      hostages: `${num('hostagesExtracted', 'hostagesSecured', 'hostagesRescued', 'hostages') ?? 0} / ${HOSTAGE_SPOTS.length}`,
      accuracy: accuracy == null ? '—' : `${Math.round(accuracy)}%`,
      shots: shots ?? '—',
      kills: num('enemiesKilled', 'enemiesNeutralised', 'enemiesNeutralized', 'kills') ?? '—',
      damage: num('damageTaken', 'damage') ?? '—',
    };
  }

  _screenEnd(kind, opts = {}) {
    const victory = kind === 'victory';
    const st = this._stats();
    const tiles = [
      ['Mission time', st.time, 'timer'],
      ['Hostages recovered', st.hostages, 'hostage'],
      ['Accuracy', st.accuracy, 'crosshair-dynamic'],
      ['Shots fired', st.shots, 'ammo'],
      ['Hostiles neutralised', st.kills, 'skull'],
      ['Damage taken', st.damage, 'health'],
    ];
    return h('div', { class: `screen-shell dim end-${kind}` },
      h('div', { class: 'panel panel-end' },
        h('header', { class: 'panel-head end-head' },
          h('div', { class: 'kicker', text: victory ? 'Operation Complete' : 'Operation Failed' }),
          h('h2', { class: `panel-title end-title ${victory ? 'ok' : 'bad'}`, text: victory ? 'MISSION ACCOMPLISHED' : 'MISSION FAILED' }),
          h('p', { class: 'end-sub', text: opts.reason ?? (victory ? 'Both hostages recovered. Extraction confirmed.' : 'Command has lost your signal. The operation is over.') })),
        h('div', { class: 'panel-body' },
          h('div', { class: 'stat-grid' }, tiles.map(([label, value, glyph]) =>
            h('div', { class: 'stat-tile' },
              icon(glyph, { size: 17 }),
              h('b', { text: String(value) }),
              h('small', { text: label }))))),
        h('footer', { class: 'panel-foot center' },
          h('button', { class: 'btn btn-primary', 'data-testid': 'btn-restart', 'data-autofocus': '1', text: 'Restart Mission', onclick: () => this._call('restart') }),
          h('button', { class: 'btn', 'data-testid': 'btn-menu', text: 'Return to Menu', onclick: () => this._returnToMenu() }))));
  }

  /* --- 10. Restart confirmation ------------------------------------- */

  _screenRestartConfirm() {
    return h('div', { class: 'screen-shell dim' },
      h('div', { class: 'panel panel-dialog', role: 'alertdialog' },
        h('header', { class: 'panel-head' },
          h('div', { class: 'kicker warn', text: 'Confirm' }),
          h('h2', { class: 'panel-title', text: 'Restart the mission?' })),
        h('div', { class: 'panel-body' },
          h('p', { class: 'dialog-text', text: 'Progress on the current attempt — secured hostages included — will be lost. The building state resets to insertion.' })),
        h('footer', { class: 'panel-foot center' },
          h('button', { class: 'btn btn-danger', 'data-testid': 'btn-confirm-restart', text: 'Restart', onclick: () => this._call('restart') }),
          h('button', { class: 'btn', 'data-testid': 'btn-cancel-restart', 'data-autofocus': '1', text: 'Cancel', onclick: () => this._back() }))));
  }

  /* --- 11. Asset gallery --------------------------------------------- */

  _screenGallery() {
    const { root, body } = this._frame({ title: 'Asset Gallery', kicker: 'Production Registry', wide: true });
    let all = [];
    try {
      all = this.game?.assets?.all?.() ?? assetRegistry.all();
    } catch (err) {
      console.warn('[menus] asset registry unavailable', err);
    }
    const categories = Array.from(new Set(all.map((a) => a.category))).sort();

    const search = h('input', {
      type: 'search', class: 'field', placeholder: 'Filter by id or name…',
      'data-testid': 'input-gallery-search', 'aria-label': 'Filter assets',
    });
    const catSel = h('select', { class: 'field', 'data-testid': 'select-gallery-category', 'aria-label': 'Category filter' },
      h('option', { value: '', text: `All categories (${all.length})` }),
      categories.map((c) => h('option', { value: c, text: c })));
    const count = h('span', { class: 'gallery-count' });
    const list = h('div', { class: 'gallery-list', role: 'listbox' });

    const shortOwner = (o) => String(o ?? '').split('—')[0].trim() || '—';
    const renderList = () => {
      const q = search.value.trim().toLowerCase();
      const cat = catSel.value;
      const rows = all.filter((a) =>
        (!cat || a.category === cat)
        && (!q || a.id?.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q)));
      count.textContent = `${rows.length} asset${rows.length === 1 ? '' : 's'}`;
      list.replaceChildren(
        h('div', { class: 'gallery-row gallery-head' },
          h('span', { text: 'ID' }), h('span', { text: 'Name' }), h('span', { text: 'Category' }),
          h('span', { text: 'Owner' }), h('span', { text: 'Status' })),
        ...rows.map((a) => h('button', {
          class: 'gallery-row', role: 'option', 'data-testid': `gallery-item-${a.id}`,
          onclick: (e) => {
            for (const r of list.querySelectorAll('.gallery-row.selected')) r.classList.remove('selected');
            e.currentTarget.classList.add('selected');
            const qa = this.game?.qa;
            if (typeof qa?.openGallery === 'function') qa.openGallery(a.id);
            else console.warn('[menus] game.qa.openGallery unavailable');
          },
        },
          h('span', { class: 'mono', text: a.id }),
          h('span', { text: a.name ?? '' }),
          h('span', { class: 'dim', text: a.category ?? '' }),
          h('span', { class: 'dim', text: shortOwner(a.owner) }),
          h('span', { class: `chip chip-${a.status === 'accepted' ? 'ok' : a.status === 'production' ? 'info' : 'warn'}`, text: a.status ?? '?' }))));
    };
    search.addEventListener('input', renderList);
    catSel.addEventListener('change', renderList);
    renderList();

    body.appendChild(h('div', { class: 'gallery-tools' }, search, catSel, count));
    body.appendChild(list);
    return root;
  }

  /* --- 12. Credits ---------------------------------------------------- */

  _screenCredits() {
    const { root, body } = this._frame({ title: 'Credits', kicker: 'Northstar Rescue' });
    body.appendChild(h('div', { class: 'credits' },
      titleMark(64),
      h('p', { class: 'credits-lede', text: 'Built by a team of eight agents, each owning one discipline.' }),
      h('div', { class: 'credits-roles' }, CREDITS_ROLES.map(([who, role]) =>
        h('div', { class: 'credits-role' }, h('b', { text: who }), h('span', { text: role })))),
      h('hr'),
      h('p', {
        class: 'credits-legal',
        text: 'All architecture, characters, weapons, textures, audio and code in Northstar Rescue are '
          + 'original works generated procedurally in code for this project. No Counter-Strike or Valve '
          + 'asset, nor any other third-party game asset, was used, extracted or referenced.',
      }),
      h('p', { class: 'fine-print', text: 'Open-source libraries: Three.js (r171), Vite, three-mesh-bvh. Fonts are system web-safe stacks; the game performs zero network requests.' })));
    return root;
  }

  /* ---------------- lifecycle ---------------- */

  dispose() {
    this._teardown();
    window.removeEventListener('keydown', this._onKeyBound, true);
    this.layer.removeEventListener('click', this._onClickBound);
    this.layer.remove();
    this._active = null;
  }
}
