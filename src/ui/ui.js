// UI layer: all screens (title, settings, difficulty, briefing, loadout,
// loading, pause, victory, defeat) and the in-game HUD. DOM-based overlay on
// top of the single game canvas; resolution independent.
import { bus } from '../core/events.js';
import { settings, QUALITY_PRESETS } from '../core/settings.js';
import { WEAPON_DEFS, PRIMARY_CHOICES } from '../player/weapons.js';
import { DIFFICULTIES } from '../game/difficulty.js';
import { Minimap } from './minimap.js';

const logoSvg = (size = 72) => `
<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="29.5" stroke="#3d6b94" stroke-width="1.2"/>
  <circle cx="32" cy="32" r="23" stroke="#23415c" stroke-width="1"/>
  <path d="M32 1.5v5M32 57.5v5M1.5 32h5M57.5 32h5" stroke="#3d6b94" stroke-width="1.2"/>
  <path d="M32 6 L36.2 27.8 L58 32 L36.2 36.2 L32 58 L27.8 36.2 L6 32 L27.8 27.8 Z" fill="#8fd8ff"/>
  <path d="M32 20 L34 30 L44 32 L34 34 L32 44 L30 34 L20 32 L30 30 Z" fill="#0b1521"/>
</svg>`;

// ---------------------------------------------------------------------------
// Weapon silhouettes for the loadout cards. Side profiles, muzzle right.
// ---------------------------------------------------------------------------
const WEAPON_SVGS = {
  vesper: `<svg viewBox="0 0 220 70" class="wep">
    <g fill="currentColor">
      <path d="M12 25h5v20h-5z"/>
      <path d="M17 28h28v4H17z"/>
      <path d="M17 39h28v3H17z"/>
      <path d="M45 24h62l6 3v14l-4 3H45z"/>
      <path d="M45 20h64v4H45z"/>
      <path d="M52 15h8v5h-8z"/>
      <path d="M98 15h6v5h-6z"/>
      <path d="M76 44h13l-4 17H74z"/>
      <path d="M93 44h13l-2.5 15H91z"/>
      <path d="M111 24h43a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-43z"/>
      <path d="M158 27h14v10h-14z"/>
      <path d="M172 30h8v4h-8z"/>
    </g>
    <g fill="#0c1928">
      <circle cx="122" cy="32" r="1.8"/><circle cx="132" cy="32" r="1.8"/><circle cx="142" cy="32" r="1.8"/>
      <path d="M60 29h30v2H60z" opacity="0.5"/>
    </g>
    <path d="M67 44q0 9 8 9" stroke="currentColor" stroke-width="2.4" fill="none"/>
  </svg>`,
  bdr15: `<svg viewBox="0 0 220 70" class="wep">
    <g fill="currentColor">
      <path d="M8 24h7v20H8z"/>
      <path d="M15 24h14v18l-8 2h-6z"/>
      <path d="M29 27h16v8H29z"/>
      <path d="M45 22h56v18H45z"/>
      <path d="M45 18h88v4H45z"/>
      <path d="M50 12h9v6h-9z"/>
      <path d="M66 40h13l-5 16H63z"/>
      <path d="M86 40h16l-2 10q-1 7-9 8l-7-1q2-9 2-17z"/>
      <path d="M101 21h48v14h-48z"/>
      <path d="M138 11h5v7h-5z"/>
      <path d="M149 25h44v6h-44z"/>
      <path d="M193 22h13v12h-13z"/>
    </g>
    <g fill="#0c1928">
      <path d="M106 26h8v3h-8z"/><path d="M118 26h8v3h-8z"/><path d="M130 26h8v3h-8z"/>
      <path d="M196 25h2v6h-2z"/><path d="M200 25h2v6h-2z"/>
      <path d="M48 30h20v2H48z" opacity="0.5"/>
    </g>
    <path d="M59 40q0 9 9 9" stroke="currentColor" stroke-width="2.4" fill="none"/>
  </svg>`,
  havelock: `<svg viewBox="0 0 220 70" class="wep">
    <g fill="currentColor">
      <path d="M8 26q-3 8 1 16l3 4h12l6-10V26z"/>
      <path d="M30 26h14v14h-8z"/>
      <path d="M44 22h44v18H44z"/>
      <path d="M88 25h108v5H88z"/>
      <path d="M88 32h84v5H88z"/>
      <path d="M100 27a4 4 0 0 1 4-4h26a4 4 0 0 1 4 4v13a4 4 0 0 1-4 4h-26a4 4 0 0 1-4-4z"/>
      <path d="M193 21h3v4h-3z"/>
    </g>
    <g fill="#0c1928">
      <path d="M107 27h2v14h-2z"/><path d="M113 27h2v14h-2z"/><path d="M119 27h2v14h-2z"/><path d="M125 27h2v14h-2z"/>
      <path d="M48 26h36v2H48z" opacity="0.5"/>
    </g>
    <path d="M52 40q1 8 9 8" stroke="currentColor" stroke-width="2.4" fill="none"/>
  </svg>`,
  meridian: `<svg viewBox="0 0 220 70" class="wep">
    <g fill="currentColor">
      <path d="M8 22h7v26H8z"/>
      <path d="M15 24h30v20l-22 4-8-6z"/>
      <path d="M20 17h20v7H20z"/>
      <path d="M45 24h72v14H45z"/>
      <path d="M74 38h13l-5 15H72z"/>
      <path d="M92 38h17v9H94z"/>
      <path d="M56 12h8v9h-8z"/>
      <path d="M64 14h40v6H64z"/>
      <path d="M104 10h16v13h-16z"/>
      <path d="M70 20h6v5h-6z"/><path d="M96 20h6v5h-6z"/>
      <path d="M117 26h76v6h-76z"/>
      <path d="M193 23h14v12h-14z"/>
      <circle cx="116" cy="43" r="3.2"/>
    </g>
    <g fill="#0c1928">
      <path d="M196 26h2v6h-2z"/><path d="M200 26h2v6h-2z"/><path d="M204 26h2v6h-2z"/>
      <path d="M50 28h60v2H50z" opacity="0.5"/>
    </g>
    <path d="M111 37l5 5" stroke="currentColor" stroke-width="2.4" fill="none"/>
  </svg>`,
};

// small glyphs for the standard-kit strip
const KIT_SVGS = {
  ad9: `<svg viewBox="0 0 48 24"><g fill="currentColor">
    <path d="M8 6h34v6H8z"/>
    <path d="M8 12h26v3H8z"/>
    <path d="M10 12h11l-3 10h-9z"/>
    <path d="M40 8h3v3h-3z"/>
  </g><path d="M23 15q0 5 5 5" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>`,
  knife: `<svg viewBox="0 0 48 24"><g fill="currentColor">
    <rect x="4" y="9" width="12" height="6" rx="2"/>
    <rect x="16" y="7" width="3" height="10"/>
    <path d="M19 8h8q12 0 17 3.5-5 4.5-17 4.5h-8z"/>
  </g></svg>`,
  flash: `<svg viewBox="0 0 48 24"><g fill="currentColor">
    <rect x="18" y="8" width="12" height="13" rx="2"/>
    <rect x="20" y="5" width="8" height="3"/>
    <path d="M28 5q8 1 9 8h-2.6q-1-5.4-6.4-5.5z"/>
  </g><circle cx="34" cy="6" r="2.4" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>`,
  smoke: `<svg viewBox="0 0 48 24"><g fill="currentColor">
    <rect x="16" y="7" width="16" height="14" rx="2"/>
    <rect x="19" y="4" width="10" height="3"/>
  </g><g stroke="currentColor" stroke-width="1.4" fill="none">
    <path d="M20 11v6"/><path d="M24 11v6"/><path d="M28 11v6"/>
  </g></svg>`,
  vest: `<svg viewBox="0 0 48 24"><g fill="currentColor">
    <path d="M15 3q4 4 9 4t9-4l5 5-4 4v9q-10 4-20 0v-9l-4-4z"/>
  </g><path d="M19 12h10M19 16h10" stroke="#0c1928" stroke-width="1.4"/></svg>`,
};

// chevron rank glyph for difficulty cards (1..3 chevrons)
const rankSvg = (n) => {
  let rows = '';
  for (let i = 0; i < n; i++) {
    const y = 8 + i * 9;
    rows += `<path d="M7 ${y + 8} L20 ${y} L33 ${y + 8}"/>`;
  }
  return `<svg viewBox="0 0 40 ${10 + n * 9}" class="rank">
    <g stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="square">${rows}</g>
  </svg>`;
};

const CORNERS = '<i class="pc pc-tl"></i><i class="pc pc-tr"></i><i class="pc pc-bl"></i><i class="pc pc-br"></i>';

const TIPS = [
  'Hold SHIFT to walk silently. Running is heard through doors.',
  'Frosted glass blocks enemy vision until it breaks.',
  'Order a secured hostage to hold position with E before clearing a room.',
  'Interior walls stop movement, not rifle rounds. Neither do office doors.',
  'The Dazzler flash device blinds anyone with line of sight to it.',
  'Crouching tightens your spread and makes you harder to notice.',
  'Enemies investigate gunfire. Reposition after every engagement.',
  'The dock shutter panel only works once every hostage is secured.',
];

const COMPASS_PPD = 2.2;  // tape pixels per degree
const COMPASS_W = 320;    // visible tape window width (kept in sync via JS)

export class UI {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('ui-root');
    this.screens = {};
    this.selectedDifficulty = 'operative';
    this.selectedPrimary = 'bdr15';
    this._hudCache = {};
    this._buildAll();
    this._wire();
  }

  // ------------------------------------------------------------- structure
  _buildAll() {
    this.root.innerHTML = '';
    this._buildBoot();
    this._buildTitle();
    this._buildSettings();
    this._buildDifficulty();
    this._buildBriefing();
    this._buildLoadout();
    this._buildLoading();
    this._buildPause();
    this._buildResult('victory');
    this._buildResult('defeat');
    this._buildHUD();
    this.showScreen('boot');
  }

  _screen(id, cls, html) {
    const el = document.createElement('div');
    el.className = 'screen ' + (cls || '');
    el.id = 'screen-' + id;
    el.hidden = true;
    el.innerHTML = html;
    this.root.appendChild(el);
    this.screens[id] = el;
    return el;
  }

  _panelHtml(kicker, title, body, style = '') {
    return `
      <div class="panel-wrap"${style ? ` style="${style}"` : ''}>
        ${CORNERS}
        <div class="panel">
          <div class="panel-head">
            <div class="kicker">${kicker}</div>
            <h2>${title}</h2>
          </div>
          ${body}
        </div>
      </div>`;
  }

  showScreen(name) {
    for (const [id, el] of Object.entries(this.screens)) el.hidden = id !== name;
    this.hud.hidden = name !== null;
    if (name === null) this.hud.hidden = false;
    else this.hud.hidden = true;
    this.current = name;
  }

  // ------------------------------------------------------------- screens
  _buildBoot() {
    this._screen('boot', 'overlay-solid', `
      <div class="brand">${logoSvg(84)}</div>
      <div class="title-main">NORTHSTAR <b>RESCUE</b></div>
      <div class="title-sub">Initializing tactical systems</div>
      <div class="load-bar"><i id="boot-bar"></i></div>
    `);
  }

  bootProgress(f, label) {
    const bar = document.getElementById('boot-bar');
    if (bar) bar.style.width = Math.round(f * 100) + '%';
    const sub = this.screens.boot.querySelector('.title-sub');
    if (sub && label) sub.textContent = label;
  }

  _buildTitle() {
    const el = this._screen('title', 'overlay-dim screen-title', `
      <div class="title-backdrop" aria-hidden="true">
        <div class="tb-sweep"></div>
        <div class="tb-snow snow-a"></div>
        <div class="tb-snow snow-b"></div>
        <div class="tb-vignette"></div>
      </div>
      <div class="title-lockup">
        <div class="brand">${logoSvg(96)}</div>
        <div class="title-main">NORTHSTAR <b>RESCUE</b></div>
        <div class="title-rule"><i></i><span class="title-sub">A single-operator tactical response</span><i></i></div>
      </div>
      <div class="menu title-menu">
        <button class="btn btn-primary" id="btn-play">Begin Operation</button>
        <button class="btn" id="btn-settings">Settings &amp; Controls</button>
        <button class="btn" id="btn-credits-quality">Graphics: <span id="quality-label"></span></button>
      </div>
      <div class="hint-bar">Northstar Logistics Group HQ &mdash; Hollow Pines, 06:40 &mdash; blizzard conditions</div>
      <div class="version-tag">Vertical Slice 1.0</div>
    `);
    el.querySelector('#btn-play').onclick = () => { bus.emit('ui-select'); this.game.flowTo('difficulty'); };
    el.querySelector('#btn-settings').onclick = () => { bus.emit('ui-select'); this._settingsReturn = 'title'; this.game.flowTo('settings'); };
    el.querySelector('#btn-credits-quality').onclick = () => {
      const order = ['low', 'medium', 'high', 'ultra'];
      const next = order[(order.indexOf(settings.get('quality')) + 1) % order.length];
      settings.set('quality', next);
      this._syncQualityLabel();
      bus.emit('ui-move');
    };
    this._syncQualityLabel();
  }

  _syncQualityLabel() {
    const el = document.getElementById('quality-label');
    if (el) el.textContent = settings.get('quality').toUpperCase();
  }

  _buildSettings() {
    const rows = [
      { section: 'Audio', key: 'masterVolume', label: 'Master Volume', type: 'range', min: 0, max: 1, step: 0.05, fmt: (v) => Math.round(v * 100) + '%' },
      { key: 'sfxVolume', label: 'Effects Volume', type: 'range', min: 0, max: 1, step: 0.05, fmt: (v) => Math.round(v * 100) + '%' },
      { key: 'musicVolume', label: 'Music Volume', type: 'range', min: 0, max: 1, step: 0.05, fmt: (v) => Math.round(v * 100) + '%' },
      { section: 'Controls', key: 'mouseSens', label: 'Mouse Sensitivity', type: 'range', min: 0.05, max: 2, step: 0.05, fmt: (v) => (+v).toFixed(2) },
      { key: 'invertY', label: 'Invert Y Axis', type: 'check' },
      { section: 'Video', key: 'fov', label: 'Field of View', type: 'range', min: 60, max: 100, step: 1, fmt: (v) => Math.round(v) + '\u00b0' },
      { key: 'quality', label: 'Graphics Quality', type: 'select', options: Object.keys(QUALITY_PRESETS) },
      { key: 'renderScale', label: 'Resolution Scale', type: 'range', min: 0.5, max: 1, step: 0.05, fmt: (v) => Math.round(v * 100) + '%' },
      { section: 'Interface', key: 'crosshair', label: 'Show Crosshair', type: 'check' },
      { key: 'minimap', label: 'Tactical Minimap', type: 'check', fallback: true },
      { key: 'subtitles', label: 'Subtitles', type: 'check' },
      { section: 'Comfort', key: 'reducedMotion', label: 'Reduce Motion', type: 'check' },
      { key: 'reducedBlood', label: 'Reduce Blood Effects', type: 'check' },
    ];
    const rowsHtml = rows.map((r) => {
      const head = r.section ? `<div class="setting-section">${r.section}</div>` : '';
      if (r.type === 'range') {
        return head + `<div class="setting-row"><label>${r.label}</label>
          <input type="range" data-key="${r.key}" min="${r.min}" max="${r.max}" step="${r.step}">
          <span class="value" data-val="${r.key}"></span></div>`;
      }
      if (r.type === 'check') {
        return head + `<div class="setting-row"><label>${r.label}</label>
          <input type="checkbox" data-key="${r.key}"><span class="value" data-val="${r.key}"></span></div>`;
      }
      return head + `<div class="setting-row"><label>${r.label}</label>
        <select data-key="${r.key}">${r.options.map((o) => `<option value="${o}">${o.toUpperCase()}</option>`).join('')}</select>
        <span class="value" data-val="${r.key}"></span></div>`;
    }).join('');

    const controls = [
      ['W A S D', 'Move'], ['Mouse', 'Look'], ['Left Click', 'Fire'], ['Right Click', 'Aim down sights'],
      ['Shift', 'Walk (quiet)'], ['C / Ctrl', 'Crouch'], ['Space', 'Jump'], ['R', 'Reload'],
      ['E', 'Interact / command hostage'], ['1-5', 'Weapon slots'], ['Mouse Wheel', 'Cycle weapons'],
      ['F', 'Toggle fullscreen'], ['Esc / P', 'Pause'],
    ];
    const el = this._screen('settings', 'overlay-solid', this._panelHtml(
      'System Configuration', 'Settings &amp; Controls', `
      <div class="settings-cols">
        <div class="settings-list">${rowsHtml}</div>
        <div class="settings-side">
          <h3>Control Reference</h3>
          <table class="controls-table">${controls.map((c) => `<tr><td>${c[0]}</td><td>${c[1]}</td></tr>`).join('')}</table>
        </div>
      </div>
      <div class="panel-actions">
        <button class="btn btn-small" id="btn-settings-back">Back</button>
        <button class="btn btn-small" id="btn-settings-reset">Reset Defaults</button>
      </div>`, 'width: 860px;'));

    for (const r of rows) {
      const input = el.querySelector(`[data-key="${r.key}"]`);
      const valEl = el.querySelector(`[data-val="${r.key}"]`);
      const current = () => {
        const v = settings.get(r.key);
        return v === undefined ? r.fallback : v;
      };
      const sync = () => {
        const v = current();
        if (r.type === 'check') {
          input.checked = !!v;
          if (valEl) valEl.textContent = v ? 'ON' : 'OFF';
        } else if (r.type === 'range') {
          input.value = v;
          input.style.setProperty('--fill', (((v - r.min) / (r.max - r.min)) * 100).toFixed(1) + '%');
          if (valEl) valEl.textContent = r.fmt ? r.fmt(v) : v;
        } else {
          input.value = v;
          if (valEl) valEl.textContent = '';
        }
      };
      sync();
      input.addEventListener('input', () => {
        let v = r.type === 'check' ? input.checked : input.value;
        if (r.type === 'range') v = parseFloat(v);
        settings.set(r.key, v);
        sync();
        this._syncQualityLabel();
      });
      bus.on('settings-changed', sync);
    }
    el.querySelector('#btn-settings-back').onclick = () => {
      bus.emit('ui-back');
      this.game.flowTo(this._settingsReturn || 'title');
    };
    el.querySelector('#btn-settings-reset').onclick = () => { settings.reset(); bus.emit('ui-select'); };
  }

  _buildDifficulty() {
    const pips = { recruit: 1, operative: 2, veteran: 3 };
    const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const el = this._screen('difficulty', 'overlay-solid', this._panelHtml(
      'Mission Setup — 01 / 03', 'Select Response Protocol', `
      <div class="cards">
        ${Object.values(DIFFICULTIES).map((d) => `
          <div class="card" data-diff="${d.id}">
            <div class="card-glyph">${rankSvg(pips[d.id])}</div>
            <h4>${d.name}</h4>
            <p>${d.tagline}</p>
            <div class="card-meta">CLOCK ${clock(d.missionTime)} &nbsp;&middot;&nbsp; ARMOR ${d.playerArmor}</div>
            <div class="pips">${[1, 2, 3].map((i) => `<span class="${i <= pips[d.id] ? 'on' : ''}"></span>`).join('')}</div>
          </div>`).join('')}
      </div>
      <div class="panel-actions">
        <button class="btn btn-small" id="btn-diff-back">Back</button>
        <button class="btn btn-small btn-primary" id="btn-diff-next">Continue</button>
      </div>`));
    const sync = () => el.querySelectorAll('.card').forEach((c) =>
      c.classList.toggle('selected', c.dataset.diff === this.selectedDifficulty));
    el.querySelectorAll('.card').forEach((c) => {
      c.onclick = () => { this.selectedDifficulty = c.dataset.diff; sync(); bus.emit('ui-move'); };
    });
    sync();
    el.querySelector('#btn-diff-back').onclick = () => { bus.emit('ui-back'); this.game.flowTo('title'); };
    el.querySelector('#btn-diff-next').onclick = () => { bus.emit('ui-select'); this.game.flowTo('briefing'); };
  }

  _buildBriefing() {
    const el = this._screen('briefing', 'overlay-solid', this._panelHtml(
      'Mission Setup — 02 / 03', 'Briefing — Operation Northstar', `
      <div class="briefing-body">
        <div class="briefing-text">
          <p><span class="callsign">CONTROL:</span> At 05:12 an armed cell of the Kestrel Syndicate seized the
          Northstar Logistics Group headquarters during a blizzard. Local response is grounded.
          You are the only operator on site.</p>
          <p><span class="callsign">SITUATION:</span> Two employees are confirmed held inside:
          <b>K. Serrano</b> (dispatch analyst, believed held in the Aurora conference room) and
          <b>D. Okafor</b> (operations director, likely in the executive suite upstairs).</p>
          <p><span class="callsign">TASKING:</span></p>
          <ul class="objective-list">
            <li>Infiltrate through the staff entrance on the west courtyard.</li>
            <li>Locate and secure both hostages.</li>
            <li>Escort them to the fleet garage on the east side.</li>
            <li>Raise the dock shutter and hold until the evac vehicle arrives.</li>
          </ul>
          <p><span class="callsign">NOTES:</span> Hostiles patrol all floors. Fire discipline near the
          hostages. The building's badge system is down &mdash; some security doors may need a keycard
          carried by the syndicate's technicians.</p>
        </div>
        <div class="intel-box">
          <h3>Site Intel</h3>
          <svg viewBox="0 0 300 196" class="intel-map">
            <defs>
              <pattern id="intel-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M20 0H0v20" fill="none" stroke="rgba(143,216,255,0.06)" stroke-width="1"/>
              </pattern>
            </defs>
            <rect width="300" height="196" fill="#0a141e"/>
            <rect width="300" height="196" fill="url(#intel-grid)"/>
            <g stroke="#2b4258" fill="rgba(16,31,48,0.85)" stroke-width="1.5">
              <rect x="22" y="34" width="70" height="118"/>
              <rect x="92" y="34" width="118" height="118"/>
              <rect x="210" y="62" width="68" height="72"/>
            </g>
            <g stroke="#23415c" stroke-width="1">
              <path d="M92 60h118M92 126h118"/>
            </g>
            <g fill="#7fa8c7" font-size="8.5" font-family="Consolas,monospace" letter-spacing="1">
              <text x="26" y="28">WEST WING</text>
              <text x="120" y="28">OFFICE FLOOR</text>
              <text x="214" y="56">GARAGE</text>
            </g>
            <path d="M6 90l12 6-12 6z" fill="#6fd08c"/>
            <text x="4" y="112" fill="#6fd08c" font-size="8" font-family="Consolas,monospace">ENTRY</text>
            <g fill="none" stroke="#e8a33d" stroke-width="1.4">
              <path d="M146 42l6 6-6 6-6-6z"/>
              <path d="M48 46l6 6-6 6-6-6z"/>
            </g>
            <text x="158" y="52" fill="#e8a33d" font-size="8" font-family="Consolas,monospace">HOSTAGE A</text>
            <text x="60" y="56" fill="#e8a33d" font-size="8" font-family="Consolas,monospace">B (FL2)</text>
            <rect x="238" y="84" width="30" height="28" fill="rgba(111,208,140,0.08)" stroke="#6fd08c" stroke-dasharray="4 3" stroke-width="1.2"/>
            <text x="228" y="126" fill="#6fd08c" font-size="8" font-family="Consolas,monospace">EXTRACTION</text>
            <g transform="translate(276,22)">
              <path d="M0 8L4 -2 8 8 4 5z" fill="#8fd8ff"/>
              <text x="1" y="20" fill="#8fd8ff" font-size="8" font-family="Consolas,monospace">N</text>
            </g>
            <g stroke="#23415c" stroke-width="1">
              <path d="M8 178h284"/>
            </g>
            <g font-size="7.5" font-family="Consolas,monospace" fill="#7fa8c7">
              <text x="10" y="190">GRID 20M</text>
              <text x="236" y="190">REV 06:31</text>
            </g>
          </svg>
          <h3>Rules of Engagement</h3>
          <p class="roe">Weapons free on Kestrel personnel. Civilian casualties will abort the operation.</p>
        </div>
      </div>
      <div class="panel-actions">
        <button class="btn btn-small" id="btn-brief-back">Back</button>
        <button class="btn btn-small btn-primary" id="btn-brief-next">Proceed to Loadout</button>
      </div>`, 'width: 1040px;'));
    el.querySelector('#btn-brief-back').onclick = () => { bus.emit('ui-back'); this.game.flowTo('difficulty'); };
    el.querySelector('#btn-brief-next').onclick = () => { bus.emit('ui-select'); this.game.flowTo('loadout'); };
  }

  _buildLoadout() {
    const stats = {
      vesper: { DMG: 0.35, ROF: 0.9, RNG: 0.4, CTL: 0.8 },
      bdr15: { DMG: 0.55, ROF: 0.75, RNG: 0.7, CTL: 0.6 },
      havelock: { DMG: 0.95, ROF: 0.15, RNG: 0.2, CTL: 0.35 },
      meridian: { DMG: 1.0, ROF: 0.08, RNG: 1.0, CTL: 0.3 },
    };
    const cls = { vesper: 'Compact SMG', bdr15: 'Tactical Carbine', havelock: 'Pump Shotgun', meridian: 'Precision Rifle' };
    const kit = [
      { svg: KIT_SVGS.ad9, name: 'AD-9', sub: 'Sidearm' },
      { svg: KIT_SVGS.knife, name: 'K2 Knife', sub: 'Field blade' },
      { svg: KIT_SVGS.flash, name: '2\u00d7 MK2 Dazzler', sub: 'Flash device' },
      { svg: KIT_SVGS.smoke, name: '1\u00d7 Cirrus', sub: 'Smoke screen' },
      { svg: KIT_SVGS.vest, name: 'Ballistic Vest', sub: 'Torso armor' },
    ];
    const el = this._screen('loadout', 'overlay-solid', this._panelHtml(
      'Mission Setup — 03 / 03', 'Loadout Selection', `
      <h3>Primary Weapon</h3>
      <div class="loadout-grid">
        ${PRIMARY_CHOICES.map((id) => {
          const d = WEAPON_DEFS[id];
          const s = stats[id];
          return `<div class="weapon-card" data-weapon="${id}">
            <div class="wep-fig">${WEAPON_SVGS[id]}</div>
            <h4>${d.name}</h4>
            <div class="wclass">${cls[id]}</div>
            <div class="wep-meta">${d.mag} RND MAG &nbsp;&middot;&nbsp; ${d.rpm} RPM</div>
            ${Object.entries(s).map(([k, v]) => `<div class="stat-bar"><span>${k}</span><span class="bar"><i style="width:${v * 100}%"></i></span></div>`).join('')}
          </div>`;
        }).join('')}
      </div>
      <h3>Standard Kit &mdash; always carried</h3>
      <div class="kit-row">
        ${kit.map((k) => `<span class="kit-chip">${k.svg}<span class="kit-txt"><b>${k.name}</b><i>${k.sub}</i></span></span>`).join('')}
      </div>
      <div class="panel-actions">
        <button class="btn btn-small" id="btn-load-back">Back</button>
        <button class="btn btn-small btn-primary" id="btn-load-start">Deploy</button>
      </div>`));
    const sync = () => el.querySelectorAll('.weapon-card').forEach((c) =>
      c.classList.toggle('selected', c.dataset.weapon === this.selectedPrimary));
    el.querySelectorAll('.weapon-card').forEach((c) => {
      c.onclick = () => { this.selectedPrimary = c.dataset.weapon; sync(); bus.emit('ui-move'); };
    });
    sync();
    el.querySelector('#btn-load-back').onclick = () => { bus.emit('ui-back'); this.game.flowTo('briefing'); };
    el.querySelector('#btn-load-start').onclick = () => { bus.emit('ui-select'); this.game.beginMission(); };
  }

  _buildLoading() {
    this._screen('loading', 'overlay-solid', `
      <div class="brand">${logoSvg(72)}</div>
      <div class="title-sub loading-sub">Deploying to Northstar Administrative Center</div>
      <div class="load-bar"><i id="load-bar"></i></div>
      <div class="load-tip" id="load-tip"></div>
    `);
  }

  loadingProgress(f) {
    const bar = document.getElementById('load-bar');
    if (bar) bar.style.width = Math.round(f * 100) + '%';
  }

  showLoadingTip() {
    const tip = document.getElementById('load-tip');
    if (tip) {
      tip.innerHTML = `<span class="tip-label">FIELD NOTE</span><span class="tip-text">${TIPS[Math.floor(Math.random() * TIPS.length)]}</span>`;
    }
  }

  _buildPause() {
    const el = this._screen('pause', 'overlay-dim', this._panelHtml(
      'Mission Clock Held', 'Operation Paused', `
      <div class="menu">
        <button class="btn btn-primary" id="btn-resume">Resume</button>
        <button class="btn" id="btn-pause-settings">Settings &amp; Controls</button>
        <button class="btn" id="btn-restart">Restart Mission</button>
        <button class="btn btn-danger" id="btn-quit">Abort to Main Menu</button>
      </div>`));
    el.querySelector('#btn-resume').onclick = () => { bus.emit('ui-select'); this.game.resume(); };
    el.querySelector('#btn-pause-settings').onclick = () => { bus.emit('ui-select'); this._settingsReturn = 'pause'; this.game.flowTo('settings'); };
    el.querySelector('#btn-restart').onclick = () => {
      if (this._confirmRestart) { this._confirmRestart = false; bus.emit('ui-select'); this.game.restartMission(); }
      else {
        this._confirmRestart = true;
        el.querySelector('#btn-restart').textContent = 'Confirm restart?';
        setTimeout(() => { this._confirmRestart = false; const b = el.querySelector('#btn-restart'); if (b) b.textContent = 'Restart Mission'; }, 2500);
        bus.emit('ui-move');
      }
    };
    el.querySelector('#btn-quit').onclick = () => { bus.emit('ui-back'); this.game.quitToMenu(); };
  }

  _buildResult(kind) {
    const el = this._screen(kind, 'overlay-dim screen-result', `
      <div class="result-backdrop" aria-hidden="true"></div>
      <div class="result-kicker">After-Action Report</div>
      <div class="result-title ${kind}">${kind === 'victory' ? 'Hostages Recovered' : 'Operation Failed'}</div>
      <div class="result-rule ${kind}"><i></i><b></b><i></i></div>
      <div class="result-reason" id="${kind}-reason">${kind === 'victory' ? 'All personnel extracted from the Northstar Administrative Center.' : ''}</div>
      <div class="stats-grid" id="${kind}-stats"></div>
      <div class="menu result-menu">
        <button class="btn btn-primary" data-act="restart">${kind === 'victory' ? 'Run It Again' : 'Retry Mission'}</button>
        <button class="btn" data-act="menu">Return to Main Menu</button>
      </div>
    `);
    el.querySelector('[data-act="restart"]').onclick = () => { bus.emit('ui-select'); this.game.restartMission(); };
    el.querySelector('[data-act="menu"]').onclick = () => { bus.emit('ui-back'); this.game.quitToMenu(); };
  }

  showResult(kind, stats, reason) {
    const grid = document.getElementById(kind + '-stats');
    if (grid) {
      const acc = stats.shots > 0 ? Math.round((stats.hits / stats.shots) * 100) : 0;
      const t = Math.round(stats.time || 0);
      grid.innerHTML = `
        <div class="stat"><b>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</b><span>Mission time</span></div>
        <div class="stat"><b>${stats.kills}</b><span>Hostiles neutralized</span></div>
        <div class="stat"><b>${stats.secured}/2</b><span>Hostages secured</span></div>
        <div class="stat"><b>${stats.shots}</b><span>Shots fired</span></div>
        <div class="stat"><b>${acc}%</b><span>Accuracy</span></div>
        <div class="stat"><b>${Math.round(stats.damageTaken)}</b><span>Damage taken</span></div>`;
    }
    if (reason) {
      const r = document.getElementById(kind + '-reason');
      if (r) r.textContent = reason;
    }
    this.showScreen(kind);
  }

  // ------------------------------------------------------------- HUD
  _buildHUD() {
    this.hud = document.createElement('div');
    this.hud.id = 'hud';
    this.hud.hidden = true;
    this.hud.innerHTML = `
      <div id="damage-vignette"></div>
      <div id="flash-overlay"></div>
      <div id="scope-overlay"><div class="ring"></div><div class="cross-h"></div><div class="cross-v"></div></div>
      <div id="crosshair">
        <div class="line l-t"></div><div class="line l-b"></div>
        <div class="line l-l"></div><div class="line l-r"></div>
        <div class="dot"></div>
      </div>
      <div id="hitmarker"><span></span><span></span><span></span><span></span></div>
      <div id="damage-dir"><div class="arc"></div></div>
      <div id="interact-prompt" hidden></div>
      <div id="subtitle-line" hidden></div>
      <div id="toast"></div>
      <div id="compass">
        <div class="compass-caret"></div>
        <div class="compass-window"><div id="compass-tape"></div></div>
        <div id="compass-heading">000</div>
      </div>
      <div class="hud-corner" id="hud-vitals">
        <div class="vital-row">
          <span class="vital-label">HP</span>
          <div class="vital-bar" id="hp-bar"><i></i></div><span class="vital-num" id="hp-num">100</span>
        </div>
        <div class="vital-row">
          <span class="vital-label">AV</span>
          <div class="vital-bar armor" id="armor-bar"><i></i></div><span class="vital-num" id="armor-num">50</span>
        </div>
      </div>
      <div class="hud-corner" id="hud-ammo">
        <div id="weapon-state"></div>
        <div id="weapon-name">BDR-15 CARBINE</div>
        <div id="ammo-count">30 <span class="reserve">/ 90</span></div>
        <div id="slot-strip"></div>
      </div>
      <div class="hud-corner" id="hud-mission">
        <div id="mission-timer">12:00</div>
        <div class="mission-label">Mission Clock</div>
        <div id="objective-lines"></div>
      </div>
      <div class="hud-corner" id="hostage-strip"></div>
      <div id="minimap"></div>
    `;
    this.root.appendChild(this.hud);
    this.el = {
      hpBar: this.hud.querySelector('#hp-bar'),
      hpFill: this.hud.querySelector('#hp-bar i'),
      hpNum: this.hud.querySelector('#hp-num'),
      armorFill: this.hud.querySelector('#armor-bar i'),
      armorNum: this.hud.querySelector('#armor-num'),
      ammo: this.hud.querySelector('#ammo-count'),
      weaponName: this.hud.querySelector('#weapon-name'),
      weaponState: this.hud.querySelector('#weapon-state'),
      slots: this.hud.querySelector('#slot-strip'),
      timer: this.hud.querySelector('#mission-timer'),
      objectives: this.hud.querySelector('#objective-lines'),
      hostages: this.hud.querySelector('#hostage-strip'),
      crosshair: this.hud.querySelector('#crosshair'),
      hitmarker: this.hud.querySelector('#hitmarker'),
      prompt: this.hud.querySelector('#interact-prompt'),
      subtitle: this.hud.querySelector('#subtitle-line'),
      toast: this.hud.querySelector('#toast'),
      vignette: this.hud.querySelector('#damage-vignette'),
      flash: this.hud.querySelector('#flash-overlay'),
      scope: this.hud.querySelector('#scope-overlay'),
      dmgArc: this.hud.querySelector('#damage-dir .arc'),
      compassWindow: this.hud.querySelector('.compass-window'),
      compassTape: this.hud.querySelector('#compass-tape'),
      compassHeading: this.hud.querySelector('#compass-heading'),
      minimap: this.hud.querySelector('#minimap'),
    };
    this.el.compassWindow.style.width = COMPASS_W + 'px';
    this._buildCompassTape();
    this.minimap = new Minimap(this.el.minimap);
    if (settings.get('minimap') === false) this.el.minimap.style.display = 'none';
  }

  _buildCompassTape() {
    const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
    let html = '';
    for (let d = -90; d <= 450; d += 5) {
      const a = ((d % 360) + 360) % 360;
      const x = (d + 90) * COMPASS_PPD;
      if (a % 45 === 0) {
        html += `<span class="ct-lbl ${a % 90 === 0 ? 'card' : ''}" style="left:${x}px">${names[a]}</span>`;
        html += `<i class="ct-tick major" style="left:${x}px"></i>`;
      } else {
        html += `<i class="ct-tick ${a % 15 === 0 ? 'mid' : ''}" style="left:${x}px"></i>`;
      }
    }
    this.el.compassTape.innerHTML = html;
  }

  updateHUD() {
    const g = this.game;
    const p = g.player, w = g.weapons, m = g.mission;
    if (!p || !w) return;
    const c = this._hudCache;

    if (c.hp !== p.health) {
      c.hp = p.health;
      this.el.hpFill.style.width = Math.max(0, p.health) + '%';
      this.el.hpNum.textContent = Math.max(0, Math.round(p.health));
      this.el.hpBar.classList.toggle('low', p.health <= 30);
    }
    if (c.armor !== p.armor) {
      c.armor = p.armor;
      this.el.armorFill.style.width = Math.max(0, p.armor) + '%';
      this.el.armorNum.textContent = Math.max(0, Math.round(p.armor));
    }
    const ws = w.summary();
    const ammoKey = ws.mag + '/' + ws.reserve + ws.id + ws.state;
    if (c.ammo !== ammoKey) {
      c.ammo = ammoKey;
      if (ws.kind === 'melee') this.el.ammo.innerHTML = '&mdash;';
      else this.el.ammo.innerHTML = `${ws.mag} <span class="reserve">/ ${ws.reserve}</span>`;
      this.el.weaponName.textContent = ws.name.toUpperCase();
      this.el.weaponState.textContent =
        ws.state === 'reload' ? 'RELOADING' : ws.state === 'bolt' ? 'CYCLING' : ws.state === 'pump' ? 'PUMPING' :
        (ws.kind === 'gun' && ws.mag === 0 && ws.reserve === 0) ? 'NO AMMO' : '';
      this.el.slots.innerHTML = [1, 2, 3, 4, 5].map((s) => {
        const slot = ws.slots[s];
        if (!slot) return '';
        const label = { 1: 'PRI', 2: 'SEC', 3: 'KNF', 4: 'FLS', 5: 'SMK' }[s];
        const empty = (s >= 4 && slot.reserve <= 0);
        return `<span class="slot-chip ${slot.id === ws.id ? 'active' : ''} ${empty ? 'empty' : ''}"><b>${s}</b>${label}</span>`;
      }).join('');
    }

    if (m) {
      const t = Math.max(0, Math.round(m.timer));
      if (c.timer !== t) {
        c.timer = t;
        this.el.timer.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
        this.el.timer.classList.toggle('urgent', t <= 90);
      }
      if (m._objectiveDirty || c.holdT !== Math.ceil(m.holdT)) {
        m._objectiveDirty = false;
        c.holdT = Math.ceil(m.holdT);
        this.el.objectives.innerHTML = m.objectives()
          .filter((o) => o.state !== 'pending')
          .map((o) => `<div class="hud-objective ${o.state}">${o.text}</div>`).join('');
      }
      const hs = g.ai.hostages.map((h) => `${h.id}${h.state}${h.found}`).join('|');
      if (c.hostages !== hs) {
        c.hostages = hs;
        this.el.hostages.innerHTML = g.ai.hostages.map((h) => {
          const st = !h.alive ? 'dead' : h.state === 'captive' ? (h.found ? 'found' : '') : h.state;
          const label = !h.alive ? 'KIA' : h.state === 'captive' ? (h.found ? 'LOCATED' : 'MISSING') : h.state.toUpperCase();
          return `<div class="hostage-chip ${st}"><span class="dot"></span><span class="hc-name">${h.name}</span><span class="hc-state">${label}</span></div>`;
        }).join('');
      }
    }

    // compass strip: tape slides by yaw, north-up readout
    const heading = ((-p.yaw * 180 / Math.PI) % 360 + 360) % 360;
    this.el.compassTape.style.transform =
      `translate3d(${(COMPASS_W / 2 - (heading + 90) * COMPASS_PPD).toFixed(2)}px,0,0)`;
    const hInt = Math.round(heading) % 360;
    if (c.heading !== hInt) {
      c.heading = hInt;
      this.el.compassHeading.textContent = String(hInt).padStart(3, '0');
    }

    // minimap
    const mmOn = settings.get('minimap') !== false;
    if (c.mmOn !== mmOn) {
      c.mmOn = mmOn;
      this.el.minimap.style.display = mmOn ? '' : 'none';
    }
    if (mmOn && !this.hud.hidden) this.minimap.update(g);

    // crosshair spread + visibility
    const spread = w.effectiveSpreadDeg(p);
    const gap = 6 + spread * 5;
    const scoped = w.currentDef().scoped && w.adsFactor() > 0.7;
    this.el.crosshair.style.display = settings.get('crosshair') && !scoped ? 'block' : 'none';
    const lt = this.el.crosshair.querySelector('.l-t');
    const lb = this.el.crosshair.querySelector('.l-b');
    const ll = this.el.crosshair.querySelector('.l-l');
    const lr = this.el.crosshair.querySelector('.l-r');
    lt.style.top = -(gap + 7) + 'px';
    lb.style.top = gap + 'px';
    ll.style.left = -(gap + 7) + 'px';
    lr.style.left = gap + 'px';
    this.el.scope.style.opacity = scoped ? 1 : 0;

    // interact prompt
    const target = p.interactTarget;
    const promptKey = target?.prompt || '';
    if (c.prompt !== promptKey) {
      c.prompt = promptKey;
      if (promptKey) {
        this.el.prompt.hidden = false;
        this.el.prompt.innerHTML = `<b>E</b><span>${promptKey}</span>`;
      } else this.el.prompt.hidden = true;
    }

    // overlays
    this.el.flash.style.opacity = p.flashAmount > 0 ? Math.min(1, p.flashAmount * 1.15) : 0;
    this.el.vignette.style.opacity = p.health <= 35 ? 0.5 + 0.25 * Math.sin(performance.now() / 300) : (this._dmgPulse > 0 ? this._dmgPulse : 0);
    if (this._dmgPulse > 0) this._dmgPulse = Math.max(0, this._dmgPulse - 0.03);

    // damage direction
    if (p.lastDamageDir && p.lastDamageDir.t > 0) {
      p.lastDamageDir.t -= 0.02;
      const d = p.lastDamageDir;
      const ang = Math.atan2(d.x, d.z) - p.yaw + Math.PI;
      this.el.dmgArc.style.opacity = Math.max(0, d.t);
      this.el.dmgArc.style.transform = `rotate(${ang}rad)`;
    } else this.el.dmgArc.style.opacity = 0;
  }

  hitmarker(kill) {
    const el = this.el.hitmarker;
    el.classList.remove('pop', 'kill');
    void el.offsetWidth;
    if (kill) el.classList.add('kill');
    el.classList.add('pop');
  }

  damagePulse() { this._dmgPulse = 0.7; }

  subtitle(text) {
    if (!settings.get('subtitles')) return;
    this.el.subtitle.hidden = false;
    this.el.subtitle.textContent = text;
    clearTimeout(this._subT);
    this._subT = setTimeout(() => { this.el.subtitle.hidden = true; }, 3200);
  }

  toast(text) {
    this.el.toast.textContent = text;
    this.el.toast.classList.remove('show');
    void this.el.toast.offsetWidth;
    this.el.toast.classList.add('show');
  }

  // ------------------------------------------------------------- events
  _wire() {
    const syncMotion = () =>
      this.root.classList.toggle('reduced-motion', !!settings.get('reducedMotion'));
    syncMotion();
    bus.on('settings-changed', (k) => { if (k === 'reducedMotion' || k === '*') syncMotion(); });

    bus.on('subtitle', (t) => this.subtitle(t));
    bus.on('enemy-damaged', (e) => this.hitmarker(e.remaining <= 0));
    bus.on('player-damaged', () => this.damagePulse());
    bus.on('hostage-secured', (e) => { this.toast(`${e.name} secured`); this.subtitle(`${e.name}: "Okay... I'm with you."`); });
    bus.on('hostage-found', (e) => { this.toast(`Hostage located — ${e.name}`); });
    bus.on('hostage-extracted', (e) => this.toast(`${e.name} reached the evac vehicle`));
    bus.on('objective-updated', () => {
      if (this.game.mission) {
        const active = this.game.mission.objectives().find((o) => o.state === 'active');
        if (active) this.toast('Objective — ' + active.text.replace(/\(\d+s\)/, '').trim());
      }
    });
    bus.on('door-locked', (d) => this.subtitle(`${d.name} is locked${d.keycard === 'server' ? ' — find a keycard' : ''}.`));
  }
}
