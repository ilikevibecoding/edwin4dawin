// UI manager (Fable 1 domain): all DOM screens + HUD. One screen visible at a time; HUD is the
// 'playing' screen. Buttons carry data-action attributes for Playwright.
import { settings, DEFAULTS } from '../core/settings.js';
import { audio } from '../core/audio.js';
import { bus } from '../core/events.js';
import { registerAsset } from '../core/assets.js';
import { cosmeticRng } from '../core/rng.js';
import { WEAPONS, PRIMARIES } from '../weapons/defs.js';
import { weaponIcon, starLogo, titleLogotype, difficultyInsignia, chipGlyph } from './icons.js';
import { drawBriefingMap, HudMinimap } from './minimap.js';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../game/difficulty.js';

const TIPS = [
  'Crouch (C) tightens your spread and quiets your footsteps.',
  'Shift-walk to move silently past patrols.',
  'Glass carries sound: breaking a window alerts everyone nearby.',
  'The FB-3 Dazzler blinds anyone with line of sight — including you. Look away.',
  'Hostages follow you when secured. Press E again to have them hold position.',
  'Rifles punch through drywall and doors. Nowhere to hide.',
  'Hostiles investigate gunshots. Reposition after every engagement.',
  'The SG-2 Veil blocks enemy vision. Use it to cross the lobby atrium.',
  'Aim down sights (right mouse) for precision at range.',
  'Check the minimap: secured hostages and the exfil garage are marked.',
];

const DIFF_SUB = {
  recruit: 'Training rotation',
  operator: 'Standard deployment',
  veteran: 'No support expected',
};

// Cosmetic snow drift rendered in the UI layer over the live title scene.
class SnowField {
  constructor(parent) {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'snow-layer';
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.flakes = [];
    for (let i = 0; i < 110; i++) {
      this.flakes.push({
        x: cosmeticRng.next(), y: cosmeticRng.next(),
        r: 0.7 + cosmeticRng.next() * 1.7,
        vy: 14 + cosmeticRng.next() * 30,
        drift: 6 + cosmeticRng.next() * 16,
        phase: cosmeticRng.next() * Math.PI * 2,
        a: 0.25 + cosmeticRng.next() * 0.5,
      });
    }
    this.running = false;
    this._raf = 0;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running || settings.get('reducedMotion')) return;
    this.running = true;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
    const c = this.canvas;
    if (c.width) this.ctx.clearRect(0, 0, c.width, c.height);
  }

  _tick(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    const c = this.canvas;
    const w = c.clientWidth, h = c.clientHeight;
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#eaf2f8';
    for (const f of this.flakes) {
      f.y += (f.vy * dt) / Math.max(1, h);
      f.phase += dt * 0.7;
      const x = (f.x + Math.sin(f.phase) * (f.drift / w)) * w;
      if (f.y > 1.02) { f.y = -0.02; f.x = cosmeticRng.next(); }
      ctx.globalAlpha = f.a;
      ctx.beginPath();
      ctx.arc(x, f.y * h, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    this._raf = requestAnimationFrame(this._tick);
  }
}

export class UI {
  constructor(game, root) {
    this.game = game;
    this.root = root;
    this.screens = {};
    this.hudEls = {};
    this.minimap = new HudMinimap(190);
    this.hudAcc = 0;
    this._buildAll();
    this._wireBus();
    const vig = document.createElement('div');
    vig.id = 'prod-vignette';
    document.body.appendChild(vig);
    // automation runs with static UI (see styles.css body.ui-static)
    if (new URLSearchParams(location.search).has('test')) document.body.classList.add('ui-static');
    // mirror the reduced-motion setting onto <body> so CSS can gate animation
    const applyRM = () => {
      document.body.classList.toggle('reduced-motion', !!settings.get('reducedMotion'));
      if (settings.get('reducedMotion')) this.snow.stop();
      else if (this.screens.title.classList.contains('visible')) this.snow.start();
    };
    settings.onChange((k) => { if (k === 'reducedMotion') applyRM(); });
    applyRM();
    this._registerAssets();
  }

  _el(tag, cls, parent, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    if (parent) parent.appendChild(el);
    return el;
  }

  _btn(parent, label, action, cb, cls = 'btn') {
    const b = this._el('button', cls, parent, `<span class="lbl">${label}</span>`);
    b.dataset.action = action;
    b.addEventListener('click', () => { audio.ensure(); audio.ui('click'); cb(); });
    b.addEventListener('mouseenter', () => audio.ui('hover'));
    return b;
  }

  _screen(name, cls = 'screen menu-screen') {
    const s = this._el('div', cls, this.root);
    s.id = 'screen-' + name;
    s.dataset.screen = name;
    this.screens[name] = s;
    return s;
  }

  show(name) {
    for (const [k, s] of Object.entries(this.screens)) {
      s.classList.toggle('visible', k === name || (name === 'hud' && k === 'hud'));
    }
    if (name === 'briefing') this._refreshBriefing();
    if (name === 'loadout') this._refreshLoadout();
    if (name === 'settings') this._refreshSettings();
    if (name === 'victory' || name === 'defeat') this._refreshEnd(name);
    if (name === 'loading') this._rotateTip();
    if (name === 'title') this.snow.start();
    else this.snow.stop();
  }

  // ---------------------------------------------------------------- screens
  _buildAll() {
    this._buildBoot();
    this._buildTitle();
    this._buildSettings();
    this._buildDifficulty();
    this._buildBriefing();
    this._buildLoadout();
    this._buildLoading();
    this._buildHud();
    this._buildPause();
    this._buildEnd('victory');
    this._buildEnd('defeat');
  }

  _buildBoot() {
    const s = this._screen('boot', 'screen menu-screen solid');
    const wrap = this._el('div', 'loading-center', s);
    const star = starLogo(64);
    star.classList.add('spin');
    wrap.appendChild(star);
    this._el('div', 'loading-title', wrap, 'NORTHSTAR RESCUE');
    const bar = this._el('div', 'boot-progress', wrap);
    this.bootBar = this._el('i', '', bar);
    this.bootLabel = this._el('div', 'boot-label', wrap, 'INITIALIZING');
  }

  bootProgress(pct, label) {
    if (this.bootBar) this.bootBar.style.width = pct + '%';
    if (this.bootLabel && label) this.bootLabel.textContent = label.toUpperCase();
  }

  _buildTitle() {
    const s = this._screen('title');
    this.snow = new SnowField(s);
    this._el('div', 'cine-bar top', s);
    this._el('div', 'cine-bar bottom', s);
    const brand = this._el('div', 'brand', s);
    brand.appendChild(titleLogotype());
    const list = this._el('div', 'menu-list', s);
    this._btn(list, 'Start Mission', 'start', () => this.game.startMissionFlow(), 'btn primary');
    this._btn(list, 'Settings & Controls', 'settings', () => this.game.openSettings('title'));
    this._el('div', 'footer-note', s, 'An original work. Northstar Dynamics and all assets are fictional. — v1.0');
    this._el('div', 'corner-tag', s, 'NORTHSTAR ADMINISTRATIVE CENTER<br/>44.98° N — SNOW ADVISORY IN EFFECT');
  }

  _buildSettings() {
    const s = this._screen('settings');
    const panel = this._el('div', 'panel', s);
    panel.style.maxWidth = '960px';
    panel.style.width = 'min(94vw, 960px)';
    this._el('div', 'kicker', panel, 'Configuration');
    this._el('h2', '', panel, 'Settings');
    this._el('div', 'head-rule', panel);
    const scroll = this._el('div', 'panel-scroll', panel);
    this.settingControls = {};

    let grid = null;
    const section = (label) => {
      this._el('div', 'section-title', scroll, label);
      grid = this._el('div', 'settings-grid', scroll);
    };
    const row = (label) => {
      const r = this._el('div', 'setting-row', grid);
      this._el('label', '', r, label);
      return r;
    };
    const slider = (key, label, min, max, step, fmt = (v) => v.toFixed(2)) => {
      const r = row(label);
      const val = this._el('span', 'val', r);
      const inp = this._el('input', '', r);
      inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step;
      inp.dataset.setting = key;
      inp.value = settings.get(key);
      val.textContent = fmt(+inp.value);
      r.insertBefore(inp, val);
      inp.addEventListener('input', () => {
        settings.set(key, +inp.value);
        val.textContent = fmt(+inp.value);
      });
      this.settingControls[key] = () => { inp.value = settings.get(key); val.textContent = fmt(+inp.value); };
    };
    const toggle = (key, label) => {
      const r = row(label);
      const inp = this._el('input', '', r);
      inp.type = 'checkbox';
      inp.dataset.setting = key;
      inp.checked = settings.get(key);
      inp.addEventListener('change', () => settings.set(key, inp.checked));
      this.settingControls[key] = () => { inp.checked = settings.get(key); };
    };
    const select = (key, label, opts) => {
      const r = row(label);
      const sel = this._el('select', '', r);
      sel.dataset.setting = key;
      for (const o of opts) {
        const op = this._el('option', '', sel, o[1]);
        op.value = o[0];
      }
      sel.value = settings.get(key);
      sel.addEventListener('change', () => settings.set(key, sel.value));
      this.settingControls[key] = () => { sel.value = settings.get(key); };
    };

    section('Controls');
    slider('sensitivity', 'Mouse sensitivity', 0.1, 3, 0.05);
    toggle('invertY', 'Invert Y axis');

    section('Video');
    slider('fov', 'Field of view', 60, 100, 1, (v) => v.toFixed(0) + '°');
    select('quality', 'Graphics quality', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['ultra', 'Ultra']]);
    slider('resolutionScale', 'Resolution scale', 0.5, 1, 0.05, (v) => Math.round(v * 100) + '%');
    toggle('crosshair', 'Show crosshair');

    section('Accessibility');
    toggle('reducedMotion', 'Reduce camera & UI motion');
    toggle('reducedBlood', 'Reduce blood effects');
    toggle('subtitles', 'Subtitles / captions');

    section('Audio');
    slider('volMaster', 'Master volume', 0, 1, 0.05, (v) => Math.round(v * 100) + '%');
    slider('volEffects', 'Effects volume', 0, 1, 0.05, (v) => Math.round(v * 100) + '%');
    slider('volMusic', 'Music volume', 0, 1, 0.05, (v) => Math.round(v * 100) + '%');
    slider('volUI', 'UI volume', 0, 1, 0.05, (v) => Math.round(v * 100) + '%');

    this._el('div', 'section-title', scroll, 'Control reference');
    const ctl = this._el('div', 'controls-list', scroll);
    const CONTROLS = [
      ['Move', 'W A S D'], ['Look / Aim', 'Mouse'], ['Fire', 'Left Mouse'], ['Aim down sights', 'Right Mouse'],
      ['Walk quietly', 'Shift'], ['Crouch', 'C'], ['Jump', 'Space'], ['Interact', 'E'],
      ['Reload', 'R'], ['Weapons', '1 – 5'], ['Last weapon', 'Q'], ['Pause', 'P / Esc'],
      ['Fullscreen', 'F'], ['Exit fullscreen', 'Esc'],
    ];
    for (const [a, k] of CONTROLS) {
      this._el('div', 'ctl', ctl, `<span>${a}</span><kbd>${k}</kbd>`);
    }
    const foot = this._el('div', 'panel-footer', panel);
    this._btn(foot, 'Reset Defaults', 'reset-defaults', () => {
      settings.resetToDefaults();
      this._refreshSettings();
    });
    this._btn(foot, 'Back', 'back', () => this.game.onEscape(), 'btn primary');
  }

  _refreshSettings() {
    if (!this.settingControls) return;
    for (const k of Object.keys(this.settingControls)) this.settingControls[k]();
  }

  _buildDifficulty() {
    const s = this._screen('difficulty');
    const panel = this._el('div', 'panel', s);
    this._el('div', 'kicker', panel, 'Mission setup — 1 of 3');
    this._el('h2', '', panel, 'Select Difficulty');
    this._el('div', 'head-rule', panel);
    const rowEl = this._el('div', 'card-row', panel);
    DIFFICULTY_ORDER.forEach((id, i) => {
      const d = DIFFICULTIES[id];
      const card = this._el('div', `diff-card ${i === 1 ? 'warm' : i === 2 ? 'hot' : ''}`, rowEl);
      card.dataset.action = 'difficulty-' + id;
      card.tabIndex = 0;
      const top = this._el('div', 'card-top', card);
      top.appendChild(difficultyInsignia(id));
      const tw = this._el('div', '', top);
      this._el('h3', '', tw, d.name);
      this._el('div', 'card-sub', tw, DIFF_SUB[id] || '');
      this._el('div', 'blurb', card, d.blurb);
      const pips = this._el('div', 'pips', card);
      this._el('span', 'plabel', pips, 'THREAT');
      for (let p = 0; p < 3; p++) this._el('span', 'pip' + (p <= i ? ' on' : ''), pips);
      card.addEventListener('mouseenter', () => audio.ui('hover'));
      card.addEventListener('click', () => {
        audio.ui('confirm');
        this.game.chosen.difficulty = id;
        this.game.setState('briefing');
      });
    });
    const foot = this._el('div', 'panel-footer', panel);
    this._btn(foot, 'Back', 'back', () => this.game.setState('title'));
  }

  _buildBriefing() {
    const s = this._screen('briefing');
    const panel = this._el('div', 'panel', s);
    panel.style.maxWidth = '1030px';
    panel.style.width = 'min(94vw, 1030px)';
    this._el('div', 'dossier-head', panel, `
      <span>Northstar Dynamics — incident dossier</span>
      <span>REF 26-0119 · COPY 1 OF 1</span>
      <span class="classified">Classified</span>`);
    this._el('div', 'kicker', panel, 'Mission setup — 2 of 3');
    this._el('h2', '', panel, 'Operation Northstar');
    this._el('div', 'head-rule', panel);
    const layout = this._el('div', 'brief-layout', panel);
    const text = this._el('div', 'brief-text', layout);
    text.innerHTML = `
      <p><strong>SITUATION —</strong> At 05:10 this morning an armed cell calling itself the
      <strong>Kestrel Syndicate</strong> seized the Northstar Dynamics administrative headquarters
      during a severe snowstorm. Two employees did not make it out:
      <strong>D.&nbsp;Okafor</strong> (systems analyst) and <strong>M.&nbsp;Lindqvist</strong> (operations director).</p>
      <p><strong>MISSION —</strong> You will enter alone through the south employee entrance,
      locate both hostages, secure them, and escort them to the parking garage on the
      building's north-west corner. A response van is pre-positioned inside.</p>
      <p><strong>EXECUTION —</strong> Hostiles patrol both floors. They respond to gunfire,
      breaking glass, and open doors. Weather has degraded their communications: engagements
      stay local unless you make noise.</p>
      <p><strong>ROE —</strong> Hostage casualties are unacceptable. Your armor is rated for
      small arms; do not trade fire in the open.</p>`;
    const objBox = this._el('div', 'brief-objectives', text);
    const objs = ['Infiltrate the administrative center', 'Locate both hostages', 'Secure and escort them to the garage', 'Hold the extraction zone'];
    objs.forEach((o, i) => this._el('div', 'obj', objBox, `<span class="idx">OBJ-0${i + 1}</span><span>${o}</span>`));
    const mapBox = this._el('div', 'brief-map', layout);
    this.briefCanvas = this._el('canvas', '', mapBox);
    this.briefCanvas.width = 920;
    this.briefCanvas.height = 500;
    this._el('div', 'cap', mapBox, '<span>Floor schematics — admin center</span><span>REF 26-0119</span>');
    const foot = this._el('div', 'panel-footer', panel);
    this._btn(foot, 'Back', 'back', () => this.game.setState('difficulty'));
    this._btn(foot, 'Continue to Loadout', 'to-loadout', () => this.game.setState('loadout'), 'btn primary');
  }

  _refreshBriefing() {
    if (this.briefCanvas) drawBriefingMap(this.briefCanvas);
  }

  _buildLoadout() {
    const s = this._screen('loadout');
    const panel = this._el('div', 'panel', s);
    panel.style.maxWidth = '1000px';
    panel.style.width = 'min(94vw, 1000px)';
    this._el('div', 'kicker', panel, 'Mission setup — 3 of 3');
    this._el('h2', '', panel, 'Loadout');
    this._el('div', 'head-rule', panel);
    this._el('div', 'section-title', panel, 'Primary weapon');
    this.loadoutGrid = this._el('div', 'loadout-grid', panel);
    this._el('div', 'section-title', panel, 'Standard equipment');
    const side = this._el('div', 'side-row', panel);
    this._el('div', 'side-item', side, '<span>Sidearm</span><b>KARST P9</b>');
    this._el('div', 'side-item', side, '<span>Blade</span><b>FIELDMAN CQ</b>');
    this._el('div', 'side-item', side, '<span>Slot 4</span><b>FB-3 DAZZLER ×2</b>');
    this._el('div', 'side-item', side, '<span>Slot 5</span><b>SG-2 VEIL ×2</b>');
    const foot = this._el('div', 'panel-footer', panel);
    this._btn(foot, 'Back', 'back', () => this.game.setState('briefing'));
    this._btn(foot, 'Deploy', 'deploy', () => this.game.deploy(), 'btn primary');
  }

  _refreshLoadout() {
    const grid = this.loadoutGrid;
    grid.innerHTML = '';
    for (const id of PRIMARIES) {
      const def = WEAPONS[id];
      const card = this._el('div', 'wpn-card' + (this.game.chosen.loadout.primary === id ? ' selected' : ''), grid);
      card.dataset.action = 'select-' + id;
      card.tabIndex = 0;
      this._el('div', 'sel-flag', card, 'EQUIPPED');
      const stage = this._el('div', 'wpn-stage', card);
      stage.appendChild(weaponIcon(def.hud));
      this._el('div', 'mk', card, def.maker);
      this._el('h4', '', card, def.name);
      const stats = [
        ['DMG', Math.min(1, (def.damage * (def.pellets ?? 1)) / 95)],
        ['ROF', Math.min(1, def.rpm / 900)],
        ['RNG', Math.min(1, def.range / 200)],
      ];
      for (const [k, v] of stats) {
        const st = this._el('div', 'stat', card, `<span>${k}</span>`);
        const bar = this._el('div', 'bar', st);
        this._el('i', '', bar).style.width = Math.round(v * 100) + '%';
      }
      const action = def.auto ? 'AUTO' : def.class === 'shotgun' ? 'PUMP' : def.class === 'sniper' ? 'BOLT' : 'SEMI';
      this._el('div', 'wpn-meta', card, `<span>MAG ${def.magSize}</span><span>${action}</span>`);
      card.addEventListener('mouseenter', () => audio.ui('hover'));
      card.addEventListener('click', () => {
        audio.ui('click');
        this.game.chosen.loadout.primary = id;
        this._refreshLoadout();
      });
    }
  }

  _buildLoading() {
    const s = this._screen('loading', 'screen menu-screen solid');
    const wrap = this._el('div', 'loading-center', s);
    const star = starLogo(56);
    star.classList.add('spin');
    wrap.appendChild(star);
    this._el('div', 'loading-title', wrap, 'DEPLOYING');
    const bar = this._el('div', 'loading-bar', wrap);
    this._el('i', '', bar);
    const tipbox = this._el('div', 'loading-tipbox', wrap);
    this._el('div', 'tip-k', tipbox, 'Field note');
    this.tipEl = this._el('div', 'loading-tip', tipbox, TIPS[0]);
  }

  _rotateTip() {
    if (this.tipEl) this.tipEl.textContent = cosmeticRng.pick(TIPS);
  }

  _buildPause() {
    const s = this._screen('paused');
    this._el('div', 'screen-paused-veil', s);
    const brand = this._el('div', 'brand', s);
    this._el('h1', '', brand, 'PAUSED');
    this._el('div', 'sub', brand, 'Simulation halted');
    this._el('div', 'rule', brand);
    const list = this._el('div', 'menu-list', s);
    this._btn(list, 'Resume', 'resume', () => this.game.resumeGame(), 'btn primary');
    this._btn(list, 'Restart Mission', 'restart', () => this.game.restartMission());
    this._btn(list, 'Settings', 'settings', () => this.game.openSettings('paused'));
    this._btn(list, 'Return to Title', 'to-title', () => this.game.returnToTitle(), 'btn danger');
  }

  _buildEnd(kind) {
    const s = this._screen(kind);
    this._el('div', 'end-wash', s);
    const wrap = this._el('div', 'loading-center', s);
    this._el('div', 'end-kicker', wrap, 'Operation Northstar — Debrief');
    this._el('div', `end-banner ${kind}`, wrap, kind === 'victory' ? 'MISSION COMPLETE' : 'MISSION FAILED');
    this._el('div', 'end-rule', wrap);
    this[kind + 'Msg'] = this._el('div', 'end-message', wrap, '');
    const stats = this._el('div', 'stats-row', wrap);
    this[kind + 'Stats'] = stats;
    const list = this._el('div', 'menu-list', wrap);
    this._btn(list, kind === 'victory' ? 'Run It Again' : 'Retry Mission', 'restart', () => this.game.restartMission(), 'btn primary');
    this._btn(list, 'Return to Title', 'to-title', () => this.game.returnToTitle());
  }

  _refreshEnd(kind) {
    const m = this.game.mission;
    const r = m.result || { message: '', time: m.timer, stats: m.stats };
    this[kind + 'Msg'].textContent = r.message || '';
    const acc = r.stats.shots > 0 ? Math.round((r.stats.hits / r.stats.shots) * 100) : 0;
    const mins = Math.floor(r.time / 60);
    const secs = Math.floor(r.time % 60).toString().padStart(2, '0');
    this[kind + 'Stats'].innerHTML = `
      <div class="stat-cell"><span class="k">Time</span><span class="v">${mins}:${secs}</span></div>
      <div class="stat-cell"><span class="k">Hostiles Down</span><span class="v">${r.stats.kills}</span></div>
      <div class="stat-cell"><span class="k">Shots</span><span class="v">${r.stats.shots}</span></div>
      <div class="stat-cell"><span class="k">Accuracy</span><span class="v">${acc}%</span></div>`;
  }

  // ---------------------------------------------------------------- HUD
  _buildHud() {
    const s = this._screen('hud', 'screen');
    s.id = 'hud';
    const E = this.hudEls;

    // vitals bottom-left
    const bl = this._el('div', 'hud-corner hud-bl', s);
    E.hostChips = this._el('div', 'hostage-chips', bl);
    const vit = this._el('div', 'vitals hud-block', bl);
    E.vitals = vit;
    const hp = this._el('div', 'vital-row health', vit, '<span class="tag">Vitals</span>');
    const hpBar = this._el('div', 'bar', hp);
    E.hpBar = this._el('i', '', hpBar);
    E.hpNum = this._el('span', 'num', hp, '100');
    const ar = this._el('div', 'vital-row armor', vit, '<span class="tag">Armor</span>');
    const arBar = this._el('div', 'bar', ar);
    E.arBar = this._el('i', '', arBar);
    E.arNum = this._el('span', 'num', ar, '0');

    // ammo bottom-right
    const br = this._el('div', 'hud-corner hud-br', s);
    const ammo = this._el('div', 'ammo-block hud-block', br);
    E.wpnState = this._el('div', 'wpn-state', ammo, '');
    const line = this._el('div', 'ammo-line', ammo);
    E.ammoMag = this._el('span', 'ammo-mag', line, '30');
    E.ammoRes = this._el('span', 'ammo-res', line, '/ 90');
    const wid = this._el('div', 'wpn-id', ammo);
    E.wpnIconBox = wid;
    E.wpnIcon = weaponIcon('carbine');
    wid.appendChild(E.wpnIcon);
    E.wpnName = this._el('div', 'wpn-name', wid, 'HALCYON HC-4');
    this._wpnIconKey = 'carbine';
    E.slotDots = this._el('div', 'slot-dots', ammo);
    for (let i = 1; i <= 5; i++) {
      const d = this._el('span', 'slot-dot', E.slotDots);
      d.dataset.slot = i;
    }

    // objectives top-left
    const tl = this._el('div', 'hud-corner hud-tl', s);
    const objBox = this._el('div', 'objectives hud-block', tl);
    this._el('div', 'head', objBox, 'Objectives');
    E.objList = this._el('div', '', objBox);

    // minimap top-right
    const tr = this._el('div', 'hud-corner hud-tr', s);
    const mmWrap = this._el('div', 'minimap-wrap', tr);
    mmWrap.appendChild(this.minimap.canvas);
    const mmFoot = this._el('div', 'minimap-foot', mmWrap);
    this._el('div', 'minimap-label', mmFoot, 'Tac-Map');
    E.floorBadge = this._el('div', 'floor-badge', mmFoot, 'FL G');

    // clock top-center
    E.clock = this._el('div', 'mission-clock', s, '00:00');

    // crosshair + hitmarker
    const ch = this._el('div', '', s);
    ch.id = 'crosshair';
    E.crossLines = [];
    for (const c of ['l1', 'l2', 'l3', 'l4']) E.crossLines.push(this._el('div', 'line ' + c, ch));
    this._el('div', 'cdot', ch);
    E.crosshair = ch;
    const hm = this._el('div', '', s);
    hm.id = 'hitmarker';
    for (const c of ['h1', 'h2', 'h3', 'h4']) this._el('div', 'hm ' + c, hm);
    E.hitmarker = hm;

    // prompts / subtitles / overlays
    E.prompt = this._el('div', 'interact-prompt', s, '');
    E.prompt.style.display = 'none';
    E.subtitle = this._el('div', 'subtitles', s, '');
    E.subtitle.style.display = 'none';
    E.dmgVignette = this._el('div', '', s);
    E.dmgVignette.id = 'damage-vignette';
    E.dmgDir = this._el('div', '', s);
    E.dmgDir.id = 'damage-dir';
    E.dmgArc = this._el('div', 'arc', E.dmgDir);
    E.flash = this._el('div', '', s);
    E.flash.id = 'flash-overlay';
    const scope = this._el('div', '', s);
    scope.id = 'scope-overlay';
    this._el('div', 'ring', scope);
    this._el('div', 'ring2', scope);
    const ret = this._el('div', 'reticle', scope);
    ret.innerHTML = this._scopeReticleSvg();
    E.scope = scope;

    // capture hint (click to re-lock pointer)
    E.capture = this._el('div', 'capture-hint', s);
    E.capture.style.display = 'none';
    this._el('div', 'inner', E.capture, 'Click to take control');
    E.capture.addEventListener('click', () => {
      this.game.input.requestPointerLock();
    });
  }

  // LR-8 reticle: fine cross + mil marks, drawn once as inline SVG.
  _scopeReticleSvg() {
    const S = 1000, C = S / 2;
    let mils = '';
    for (let m = 1; m <= 7; m++) {
      const d = m * 34;
      const len = m % 2 === 0 ? 11 : 6.5;
      mils += `<line class="ret-mil" x1="${C + d}" y1="${C - len}" x2="${C + d}" y2="${C + len}" stroke-width="1.4"/>`;
      mils += `<line class="ret-mil" x1="${C - d}" y1="${C - len}" x2="${C - d}" y2="${C + len}" stroke-width="1.4"/>`;
      mils += `<line class="ret-mil" x1="${C - len}" y1="${C + d}" x2="${C + len}" y2="${C + d}" stroke-width="1.4"/>`;
      if (m % 2 === 0) {
        mils += `<text class="ret-num" x="${C + d - 4}" y="${C + 22}">${m}</text>`;
        mils += `<text class="ret-num" x="${C - d - 4}" y="${C + 22}">${m}</text>`;
      }
    }
    return `<svg viewBox="0 0 ${S} ${S}">
      <line class="ret-line" x1="0" y1="${C}" x2="${C - 26}" y2="${C}" stroke-width="2.6"/>
      <line class="ret-line" x1="${C + 26}" y1="${C}" x2="${S}" y2="${C}" stroke-width="2.6"/>
      <line class="ret-line" x1="${C}" y1="0" x2="${C}" y2="${C - 26}" stroke-width="2.6"/>
      <line class="ret-line" x1="${C}" y1="${C + 26}" x2="${C}" y2="${S}" stroke-width="2.6"/>
      <line class="ret-line" x1="${C - 26}" y1="${C}" x2="${C + 26}" y2="${C}" stroke-width="1"/>
      <line class="ret-line" x1="${C}" y1="${C - 26}" x2="${C}" y2="${C + 26}" stroke-width="1"/>
      ${mils}
      <circle cx="${C}" cy="${C}" r="1.6" fill="rgba(12,16,20,0.95)"/>
    </svg>`;
  }

  setCaptureHint(show) {
    if (this.hudEls.capture) this.hudEls.capture.style.display = show ? 'flex' : 'none';
  }

  _wireBus() {
    bus.on('subtitle', ({ text, ms }) => {
      if (!settings.get('subtitles')) return;
      const el = this.hudEls.subtitle;
      el.textContent = text;
      el.style.display = 'block';
      clearTimeout(this._subT);
      this._subT = setTimeout(() => { el.style.display = 'none'; }, ms || 2500);
    });
    bus.on('player-hit-entity', ({ kind, region }) => {
      const hm = this.hudEls.hitmarker;
      hm.classList.remove('show', 'kill');
      void hm.offsetWidth;
      if (region === 'head') hm.classList.add('kill');
      hm.classList.add('show');
    });
    bus.on('player-damaged', ({ dir }) => {
      const v = this.hudEls.dmgVignette;
      v.style.opacity = '1';
      clearTimeout(this._dmgT);
      this._dmgT = setTimeout(() => { v.style.opacity = '0'; }, 350);
      if (dir != null) {
        const arc = this.hudEls.dmgArc;
        arc.style.transform = `rotate(${dir}rad)`;
        arc.style.opacity = '1';
        clearTimeout(this._dirT);
        this._dirT = setTimeout(() => { arc.style.opacity = '0'; }, 900);
      }
    });
    bus.on('objective-changed', () => { this._objDirty = true; });
    bus.on('mission-reset', () => { this._objDirty = true; });
  }

  updateHud(mission, dt) {
    this.hudAcc += dt;
    const E = this.hudEls;
    const p = mission.player;

    // flash overlay follows sim (every step for correctness)
    E.flash.style.opacity = p.flash > 0 ? String(Math.min(1, p.flash * 1.15)) : '0';

    if (this.hudAcc < 1 / 30) return;
    this.hudAcc = 0;

    // vitals
    E.hpBar.style.width = Math.max(0, p.health) + '%';
    E.hpNum.textContent = Math.max(0, Math.round(p.health));
    E.arBar.style.width = Math.max(0, p.armor) + '%';
    E.arNum.textContent = Math.max(0, Math.round(p.armor));
    E.vitals.classList.toggle('hurt', p.health <= 35);

    // ammo
    const w = p.arsenal.current;
    if (w) {
      const mag = w.mag === Infinity ? '—' : w.mag;
      E.ammoMag.textContent = mag;
      E.ammoMag.className = 'ammo-mag' + (w.mag !== Infinity && w.mag === 0 ? ' crit' : w.mag <= w.def.magSize * 0.25 ? ' low' : '');
      E.ammoRes.textContent = w.reserve === Infinity ? '' : '/ ' + w.reserve;
      E.wpnName.textContent = w.def.name.toUpperCase();
      if (this._wpnIconKey !== w.def.hud) {
        this._wpnIconKey = w.def.hud;
        const fresh = weaponIcon(w.def.hud);
        E.wpnIconBox.replaceChild(fresh, E.wpnIcon);
        E.wpnIcon = fresh;
      }
      const stateLabel = { reload: 'RELOADING', draw: '', holster: '', pump: '', throw: '', melee: '' }[p.arsenal.state] ?? '';
      E.wpnState.textContent = stateLabel;
      for (const d of E.slotDots.children) {
        const slot = +d.dataset.slot;
        d.className = 'slot-dot' + (mission.player.arsenal.slots[slot] ? (slot === p.arsenal.active ? ' on' : '') : '');
        d.style.opacity = mission.player.arsenal.slots[slot] ? '1' : '0.25';
      }
    }

    // crosshair spread + visibility
    const showCh = settings.get('crosshair') && !(w && w.def.scope && p.arsenal.isAiming);
    E.crosshair.style.display = showCh ? 'block' : 'none';
    if (showCh) {
      const spreadDeg = p.arsenal.spreadDeg(Math.hypot(p.vel.x, p.vel.z), p.crouched);
      const px = 6 + spreadDeg * 5.5;
      E.crossLines[0].style.top = (-px - 7) + 'px';
      E.crossLines[1].style.top = px + 'px';
      E.crossLines[2].style.left = (-px - 7) + 'px';
      E.crossLines[3].style.left = px + 'px';
    }
    // scope overlay
    const scopeK = mission.viewModel ? mission.viewModel.scopeBlend : 0;
    E.scope.style.opacity = scopeK > 0.85 ? '1' : '0';

    // clock
    const t = mission.timer;
    E.clock.textContent = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

    // objectives
    if (this._objDirty || mission.extractCountdown != null || true) {
      let html = '';
      for (const o of mission.objectives) {
        html += `<div class="obj-row ${o.state}"><span class="box"></span><span>${o.label}</span></div>`;
      }
      if (E.objList.innerHTML !== html) E.objList.innerHTML = html;
      this._objDirty = false;
    }

    // hostage chips (shape-coded states, never colour-only)
    let chips = '';
    for (const h of mission.hostages) {
      const cls = !h.alive ? 'dead' : h.state === 'extracted' ? 'extracted' : h.secured ? 'secured' : h.discovered ? 'located' : '';
      const glyphKey = !h.alive ? 'dead' : h.state === 'extracted' ? 'extracted'
        : h.secured ? (h.state === 'waiting' ? 'holding' : 'secured') : h.discovered ? 'located' : 'unknown';
      const label = !h.alive ? 'LOST' : h.state === 'extracted' ? 'SAFE' : h.secured ? (h.state === 'waiting' ? 'HOLDING' : 'WITH YOU') : h.discovered ? 'LOCATED' : 'UNKNOWN';
      chips += `<div class="chip ${cls}">${chipGlyph(glyphKey).outerHTML}<span class="cname">${h.name}</span><span class="cstate">${label}</span></div>`;
    }
    if (E.hostChips.innerHTML !== chips) E.hostChips.innerHTML = chips;

    // interact prompt
    const it = mission.interactTarget;
    if (it) {
      E.prompt.innerHTML = `<kbd>E</kbd><span>${it.label}</span>`;
      E.prompt.style.display = 'flex';
    } else {
      E.prompt.style.display = 'none';
    }

    // minimap + floor badge
    this.minimap.render(mission);
    E.floorBadge.textContent = p.pos.y > 2.4 ? 'FL 1' : 'FL G';
  }

  _registerAssets() {
    const reg = (id, name) => registerAsset(id, { name, category: 'ui', agent: 'Fable 1' });
    reg('UI-LOGOTYPE-NORTHSTAR', 'Northstar Rescue title logotype (SVG lockup)');
    reg('UI-EMBLEM-STAR', 'Star/compass emblem (boot, loading spinner)');
    reg('UI-FX-SNOW', 'Title-screen drifting snow layer (canvas, cosmetic RNG)');
    reg('UI-SCREEN-BOOT', 'Boot screen');
    reg('UI-SCREEN-TITLE', 'Title screen (logotype, scrims, cine bars, menu)');
    reg('UI-SCREEN-SETTINGS', 'Settings panel (grouped sections, value chips)');
    reg('UI-SCREEN-DIFFICULTY', 'Difficulty select (insignia cards)');
    reg('UI-SCREEN-BRIEFING', 'Mission briefing dossier + floor schematic');
    reg('UI-SCREEN-LOADOUT', 'Loadout screen (weapon cards, equipment chips)');
    reg('UI-SCREEN-LOADING', 'Loading screen (compass spinner, field note)');
    reg('UI-SCREEN-PAUSE', 'Pause overlay (vignette veil)');
    reg('UI-SCREEN-VICTORY', 'Victory debrief (cold-blue treatment)');
    reg('UI-SCREEN-DEFEAT', 'Defeat debrief (red-washed treatment)');
    reg('UI-HUD-VITALS', 'HUD vitals block (health/armor, hurt state)');
    reg('UI-HUD-AMMO', 'HUD ammo block (mag counter, weapon id, slot dots)');
    reg('UI-HUD-OBJECTIVES', 'HUD objectives tracker');
    reg('UI-HUD-HOSTAGE-CHIPS', 'HUD hostage status chips (shape-coded)');
    reg('UI-HUD-CLOCK', 'HUD mission clock');
    reg('UI-HUD-MINIMAP', 'HUD tac-map panel + floor badge');
    reg('UI-HUD-CROSSHAIR', 'Dynamic-spread crosshair');
    reg('UI-HUD-HITMARKER', 'Hit/kill markers');
    reg('UI-HUD-DAMAGE', 'Damage vignette + direction arc');
    reg('UI-HUD-SCOPE-LR8', 'Meridian LR-8 scope overlay (mil reticle)');
    reg('UI-HUD-PROMPT', 'Interaction prompt (key glyph + label)');
    reg('UI-HUD-SUBTITLES', 'Subtitle bar');
    reg('UI-ICONSET-WEAPONS', 'Weapon side-profile icon set (8 originals)');
    reg('UI-ICONSET-INSIGNIA', 'Difficulty insignia set (3 shields)');
    reg('UI-ICONSET-CHIP-GLYPHS', 'Hostage state glyph set (6 shapes)');
    reg('UI-MAP-BRIEFING', 'Briefing floor-plan schematic style');
    reg('UI-MAP-TACMAP', 'HUD minimap render style');
  }
}
