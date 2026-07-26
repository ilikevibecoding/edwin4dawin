// UI layer: all screens (title, settings, difficulty, briefing, loadout,
// loading, pause, victory, defeat) and the in-game HUD. DOM-based overlay on
// top of the single game canvas; resolution independent.
import { bus } from '../core/events.js';
import { settings, QUALITY_PRESETS } from '../core/settings.js';
import { WEAPON_DEFS, PRIMARY_CHOICES } from '../player/weapons.js';
import { DIFFICULTIES } from '../game/difficulty.js';

const LOGO_SVG = `
<svg width="72" height="72" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="32" cy="32" r="29" stroke="#3d6b94" stroke-width="1.5"/>
  <circle cx="32" cy="32" r="23" stroke="#23415c" stroke-width="1"/>
  <path d="M32 6 L36.2 27.8 L58 32 L36.2 36.2 L32 58 L27.8 36.2 L6 32 L27.8 27.8 Z" fill="#8fd8ff"/>
  <path d="M32 20 L34 30 L44 32 L34 34 L32 44 L30 34 L20 32 L30 30 Z" fill="#0b1521"/>
</svg>`;

const WEAPON_SVGS = {
  vesper: `<svg viewBox="0 0 200 60"><g fill="#9fc0d8"><rect x="30" y="22" width="105" height="12" rx="2"/><rect x="135" y="24" width="40" height="7" rx="2"/><rect x="52" y="34" width="12" height="18" transform="skewX(-8)"/><rect x="88" y="34" width="10" height="14" rx="2"/><rect x="20" y="24" width="12" height="8"/><rect x="60" y="16" width="30" height="6" rx="2"/></g></svg>`,
  bdr15: `<svg viewBox="0 0 200 60"><g fill="#9fc0d8"><rect x="24" y="22" width="120" height="10" rx="2"/><rect x="144" y="24" width="42" height="6" rx="2"/><rect x="58" y="32" width="12" height="20" transform="skewX(-10)"/><rect x="96" y="32" width="14" height="18" rx="2"/><rect x="10" y="20" width="16" height="14" rx="2"/><rect x="70" y="14" width="44" height="6" rx="2"/><rect x="160" y="20" width="4" height="8"/></g></svg>`,
  havelock: `<svg viewBox="0 0 200 60"><g fill="#9fc0d8"><rect x="26" y="24" width="150" height="9" rx="3"/><rect x="60" y="33" width="46" height="8" rx="3"/><path d="M26 24 L10 38 L20 42 L36 33 Z"/><rect x="112" y="33" width="12" height="16" transform="skewX(-8)"/></g></svg>`,
  meridian: `<svg viewBox="0 0 200 60"><g fill="#9fc0d8"><rect x="18" y="26" width="160" height="7" rx="2"/><rect x="52" y="16" width="40" height="8" rx="3"/><rect x="60" y="33" width="12" height="18" transform="skewX(-10)"/><path d="M18 26 L6 40 L16 42 L30 33 Z"/><rect x="100" y="33" width="10" height="12"/><rect x="178" y="27" width="8" height="4"/></g></svg>`,
};

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

  showScreen(name) {
    for (const [id, el] of Object.entries(this.screens)) el.hidden = id !== name;
    this.hud.hidden = name !== null;
    if (name === null) this.hud.hidden = false;
    else this.hud.hidden = true;
    this.current = name;
  }

  // ------------------------------------------------------------- screens
  _buildBoot() {
    const el = this._screen('boot', 'overlay-solid', `
      <div class="brand">${LOGO_SVG}</div>
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
    const el = this._screen('title', 'overlay-dim', `
      <div class="brand">${LOGO_SVG}</div>
      <div class="title-main">NORTHSTAR <b>RESCUE</b></div>
      <div class="title-sub">A single-operator tactical response</div>
      <div class="menu">
        <button class="btn btn-primary" id="btn-play">Begin Operation</button>
        <button class="btn" id="btn-settings">Settings &amp; Controls</button>
        <button class="btn" id="btn-credits-quality">Graphics: <span id="quality-label"></span></button>
      </div>
      <div class="hint-bar">Northstar Logistics Group HQ &mdash; Hollow Pines, 06:40 &mdash; blizzard conditions</div>
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
      { key: 'masterVolume', label: 'Master Volume', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'sfxVolume', label: 'Effects Volume', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'musicVolume', label: 'Music Volume', type: 'range', min: 0, max: 1, step: 0.05 },
      { key: 'mouseSens', label: 'Mouse Sensitivity', type: 'range', min: 0.05, max: 2, step: 0.05 },
      { key: 'invertY', label: 'Invert Y Axis', type: 'check' },
      { key: 'fov', label: 'Field of View', type: 'range', min: 60, max: 100, step: 1 },
      { key: 'quality', label: 'Graphics Quality', type: 'select', options: Object.keys(QUALITY_PRESETS) },
      { key: 'renderScale', label: 'Resolution Scale', type: 'range', min: 0.5, max: 1, step: 0.05 },
      { key: 'crosshair', label: 'Show Crosshair', type: 'check' },
      { key: 'reducedMotion', label: 'Reduce Camera Motion', type: 'check' },
      { key: 'reducedBlood', label: 'Reduce Blood Effects', type: 'check' },
      { key: 'subtitles', label: 'Subtitles & Announcements', type: 'check' },
    ];
    const rowsHtml = rows.map((r) => {
      if (r.type === 'range') {
        return `<div class="setting-row"><label>${r.label}</label>
          <input type="range" data-key="${r.key}" min="${r.min}" max="${r.max}" step="${r.step}">
          <span class="value" data-val="${r.key}"></span></div>`;
      }
      if (r.type === 'check') {
        return `<div class="setting-row"><label>${r.label}</label>
          <input type="checkbox" data-key="${r.key}"><span class="value"></span></div>`;
      }
      return `<div class="setting-row"><label>${r.label}</label>
        <select data-key="${r.key}">${r.options.map((o) => `<option value="${o}">${o.toUpperCase()}</option>`).join('')}</select>
        <span class="value"></span></div>`;
    }).join('');

    const controls = [
      ['W A S D', 'Move'], ['Mouse', 'Look'], ['Left Click', 'Fire'], ['Right Click', 'Aim down sights'],
      ['Shift', 'Walk (quiet)'], ['C / Ctrl', 'Crouch'], ['Space', 'Jump'], ['R', 'Reload'],
      ['E', 'Interact / command hostage'], ['1-5', 'Weapon slots'], ['Mouse Wheel', 'Cycle weapons'],
      ['F', 'Toggle fullscreen'], ['Esc / P', 'Pause'],
    ];
    const el = this._screen('settings', 'overlay-solid', `
      <div class="panel" style="width: 720px;">
        <h2>Settings &amp; Controls</h2>
        <div style="display:flex; gap:36px;">
          <div style="flex:1.2">${rowsHtml}</div>
          <div style="flex:1">
            <h3>Control Reference</h3>
            <table class="controls-table">${controls.map((c) => `<tr><td>${c[0]}</td><td>${c[1]}</td></tr>`).join('')}</table>
          </div>
        </div>
        <div style="margin-top:22px; display:flex; gap:12px;">
          <button class="btn btn-small" id="btn-settings-back">Back</button>
          <button class="btn btn-small" id="btn-settings-reset">Reset Defaults</button>
        </div>
      </div>
    `);
    el.querySelectorAll('[data-key]').forEach((input) => {
      const key = input.dataset.key;
      const sync = () => {
        if (input.type === 'checkbox') input.checked = settings.get(key);
        else input.value = settings.get(key);
        const val = el.querySelector(`[data-val="${key}"]`);
        if (val) {
          const v = settings.get(key);
          val.textContent = typeof v === 'number' ? (v <= 2 ? v.toFixed(2) : Math.round(v)) : '';
        }
      };
      sync();
      input.addEventListener('input', () => {
        let v = input.type === 'checkbox' ? input.checked : input.value;
        if (input.type === 'range') v = parseFloat(v);
        settings.set(key, v);
        sync();
        this._syncQualityLabel();
      });
      bus.on('settings-changed', sync);
    });
    el.querySelector('#btn-settings-back').onclick = () => {
      bus.emit('ui-back');
      this.game.flowTo(this._settingsReturn || 'title');
    };
    el.querySelector('#btn-settings-reset').onclick = () => { settings.reset(); bus.emit('ui-select'); };
  }

  _buildDifficulty() {
    const pips = { recruit: 1, operative: 2, veteran: 3 };
    const el = this._screen('difficulty', 'overlay-solid', `
      <div class="panel">
        <h2>Select Response Protocol</h2>
        <div class="cards">
          ${Object.values(DIFFICULTIES).map((d) => `
            <div class="card" data-diff="${d.id}">
              <h4>${d.name}</h4>
              <p>${d.tagline}</p>
              <div class="pips">${[1, 2, 3].map((i) => `<span class="${i <= pips[d.id] ? 'on' : ''}"></span>`).join('')}</div>
            </div>`).join('')}
        </div>
        <div style="margin-top:24px; display:flex; gap:12px;">
          <button class="btn btn-small" id="btn-diff-back">Back</button>
          <button class="btn btn-small btn-primary" id="btn-diff-next">Continue</button>
        </div>
      </div>
    `);
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
    const el = this._screen('briefing', 'overlay-solid', `
      <div class="panel" style="max-width:1020px;">
        <h2>Mission Briefing &mdash; Operation Northstar</h2>
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
            <svg viewBox="0 0 300 190" style="background:#0a141e">
              <g stroke="#2b4258" fill="none" stroke-width="1.5">
                <rect x="20" y="30" width="72" height="120"/>
                <rect x="92" y="30" width="120" height="120"/>
                <rect x="212" y="60" width="70" height="70"/>
              </g>
              <g fill="#8fd8ff" font-size="9" font-family="monospace">
                <text x="26" y="24">WEST WING</text>
                <text x="120" y="24">OFFICE FLOOR</text>
                <text x="216" y="54">GARAGE</text>
              </g>
              <circle cx="14" cy="94" r="5" fill="#6fd08c"/>
              <text x="6" y="112" fill="#6fd08c" font-size="8" font-family="monospace">ENTRY</text>
              <rect x="140" y="38" width="10" height="10" fill="#e8a33d"/>
              <rect x="42" y="44" width="10" height="10" fill="#e8a33d"/>
              <text x="150" y="34" fill="#e8a33d" font-size="8" font-family="monospace">HOSTAGES</text>
              <circle cx="262" cy="96" r="6" fill="#e0554a"/>
              <text x="238" y="116" fill="#e0554a" font-size="8" font-family="monospace">EXTRACTION</text>
            </svg>
            <h3>Rules of Engagement</h3>
            <p style="font-size:12px; color:var(--text-dim); line-height:1.6;">Weapons free on Kestrel
            personnel. Civilian casualties will abort the operation.</p>
          </div>
        </div>
        <div style="margin-top:22px; display:flex; gap:12px;">
          <button class="btn btn-small" id="btn-brief-back">Back</button>
          <button class="btn btn-small btn-primary" id="btn-brief-next">Proceed to Loadout</button>
        </div>
      </div>
    `);
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
    const el = this._screen('loadout', 'overlay-solid', `
      <div class="panel">
        <h2>Loadout Selection</h2>
        <h3>Primary Weapon</h3>
        <div class="loadout-grid">
          ${PRIMARY_CHOICES.map((id) => {
            const d = WEAPON_DEFS[id];
            const s = stats[id];
            return `<div class="weapon-card" data-weapon="${id}">
              ${WEAPON_SVGS[id]}
              <h4>${d.name}</h4>
              <div class="wclass">${cls[id]}</div>
              ${Object.entries(s).map(([k, v]) => `<div class="stat-bar"><span>${k}</span><span class="bar"><i style="width:${v * 100}%"></i></span></div>`).join('')}
            </div>`;
          }).join('')}
        </div>
        <h3>Standard Kit (always carried)</h3>
        <div style="font-size:13px; color:var(--text-dim); letter-spacing:0.04em; line-height:1.9;">
          AD-9 Sidearm &nbsp;&middot;&nbsp; K2 Field Knife &nbsp;&middot;&nbsp; 2&times; MK2 Dazzler flash &nbsp;&middot;&nbsp; 1&times; Cirrus smoke screen &nbsp;&middot;&nbsp; ballistic vest
        </div>
        <div style="margin-top:24px; display:flex; gap:12px;">
          <button class="btn btn-small" id="btn-load-back">Back</button>
          <button class="btn btn-small btn-primary" id="btn-load-start">Deploy</button>
        </div>
      </div>
    `);
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
      <div class="brand">${LOGO_SVG}</div>
      <div class="title-sub" style="margin-bottom:10px">Deploying to Northstar Administrative Center</div>
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
    if (tip) tip.textContent = 'TIP — ' + TIPS[Math.floor(Math.random() * TIPS.length)];
  }

  _buildPause() {
    const el = this._screen('pause', 'overlay-dim', `
      <div class="panel">
        <h2>Operation Paused</h2>
        <div class="menu">
          <button class="btn btn-primary" id="btn-resume">Resume</button>
          <button class="btn" id="btn-pause-settings">Settings &amp; Controls</button>
          <button class="btn" id="btn-restart">Restart Mission</button>
          <button class="btn btn-danger" id="btn-quit">Abort to Main Menu</button>
        </div>
      </div>
    `);
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
    const el = this._screen(kind, 'overlay-dim', `
      <div class="result-title ${kind}">${kind === 'victory' ? 'Hostages Recovered' : 'Operation Failed'}</div>
      <div class="result-reason" id="${kind}-reason">${kind === 'victory' ? 'All personnel extracted from the Northstar Administrative Center.' : ''}</div>
      <div class="stats-grid" id="${kind}-stats"></div>
      <div class="menu" style="min-width:300px;">
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
        <div class="stat"><span>Mission time</span><b>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</b></div>
        <div class="stat"><span>Hostiles neutralized</span><b>${stats.kills}</b></div>
        <div class="stat"><span>Shots fired</span><b>${stats.shots}</b></div>
        <div class="stat"><span>Accuracy</span><b>${acc}%</b></div>
        <div class="stat"><span>Damage taken</span><b>${Math.round(stats.damageTaken)}</b></div>
        <div class="stat"><span>Hostages secured</span><b>${stats.secured}/2</b></div>`;
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
      <div class="hud-corner" id="hud-vitals">
        <div class="vital-row">
          <svg class="icon" viewBox="0 0 24 24" fill="#8fe0a8"><path d="M12 21C7 16.5 3 13 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 4-4 7.5-9 12z"/></svg>
          <div class="vital-bar" id="hp-bar"><i></i></div><span class="vital-num" id="hp-num">100</span>
        </div>
        <div class="vital-row">
          <svg class="icon" viewBox="0 0 24 24" fill="#86c2ea"><path d="M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5z"/></svg>
          <div class="vital-bar" id="armor-bar"><i></i></div><span class="vital-num" id="armor-num">50</span>
        </div>
      </div>
      <div class="hud-corner" id="hud-ammo">
        <div id="weapon-state"></div>
        <div id="ammo-count">30 <span class="reserve">/ 90</span></div>
        <div id="weapon-name">BDR-15 CARBINE</div>
        <div id="slot-strip"></div>
      </div>
      <div class="hud-corner" id="hud-mission">
        <div id="mission-timer">12:00</div>
        <div id="objective-lines"></div>
      </div>
      <div class="hud-corner" id="hostage-strip"></div>
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
    };
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
        return `<span class="slot-chip ${slot.id === ws.id ? 'active' : ''} ${empty ? 'empty' : ''}">${s}&thinsp;${label}</span>`;
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
          return `<div class="hostage-chip ${st}"><span class="dot"></span>${h.name} &mdash; ${label}</div>`;
        }).join('');
      }
    }

    // crosshair spread + visibility
    const spread = w.effectiveSpreadDeg(p);
    const gap = 6 + spread * 5;
    const scoped = w.currentDef().scoped && w.adsFactor() > 0.7;
    const showCross = settings.get('crosshair') && !scoped && w.currentDef().kind !== 'melee' || w.currentDef().kind === 'melee';
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
    if (target?.prompt) {
      this.el.prompt.hidden = false;
      this.el.prompt.innerHTML = `<b>E</b> &nbsp;${target.prompt}`;
    } else this.el.prompt.hidden = true;

    // overlays
    this.el.flash.style.opacity = p.flashAmount > 0 ? Math.min(1, p.flashAmount * 1.15) : 0;
    this.el.vignette.style.opacity = p.health <= 35 ? 0.45 + 0.25 * Math.sin(performance.now() / 300) : (this._dmgPulse > 0 ? this._dmgPulse : 0);
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
