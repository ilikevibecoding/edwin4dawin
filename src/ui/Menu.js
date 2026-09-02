import { setText, clamp } from './dom.js';
import { SOLDIER, SKULL } from './icons.js';

const QUALITIES = ['low', 'medium', 'high', 'ultra'];
const STORAGE_KEY = 'seaside.settings.v1';

const CONTROLS = [
  ['W A S D', 'MOVE'],
  ['SHIFT', 'SPRINT'],
  ['CTRL / C', 'CROUCH'],
  ['SPACE', 'JUMP'],
  ['LMB', 'FIRE'],
  ['RMB', 'AIM DOWN SIGHTS'],
  ['R', 'RELOAD'],
  ['1 / 2', 'SWITCH WEAPON'],
  ['X / 4', 'AIR STRIKE'],
  ['E', 'MELEE'],
  ['G', 'GRENADE'],
  ['F', 'INTERACT'],
  ['V', 'INSPECT WEAPON'],
  ['TAB', 'SCOREBOARD'],
  ['F1', 'TOGGLE HUD'],
  ['ESC', 'PAUSE'],
];

/**
 * Main menu / pause / death / end-of-match screens (DOM, styled in src/styles/menu.css).
 *
 * Flow: DEPLOY / RESUME button → game.setState('playing') (Game requests pointer lock);
 *       pointer-lock loss while playing → 'paused'; MAIN MENU → 'menu'; PLAY AGAIN → location.reload().
 * Menus render in shot mode too whenever state !== 'playing' so they can be reviewed with
 *   node tools/shot.mjs --view menu_main --exec "game.setState('menu')"
 */
export class Menu {
  constructor(game) {
    this.game = game;
    this.root = game.menuRoot;
    this.state = null;
    this.panel = null; // 'settings' | 'controls' | null (brief / match status)
    this.result = null;
    this._respawnText = null;
    this._killerText = null;
    this._statusKey = '';

    this.settings = this._loadSettings();
    if (!game.settings.shotMode) this._applySettings(this.settings, false);

    this._render(game.state);
    game.events.on('game:state', ({ state }) => this._render(state));
    game.events.on('match:end', (e) => {
      this.result = e;
      if (this.game.state === 'ended') this._render('ended', true);
    });
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && game.state === 'playing' && !game.settings.shotMode) game.setState('paused');
    });
    this.root.addEventListener('click', (e) => this._onClick(e));
    this.root.addEventListener('input', (e) => this._onInput(e));
    this.root.addEventListener('change', (e) => this._onInput(e));
  }

  // ------------------------------------------------------------------ settings

  _loadSettings() {
    const g = this.game;
    const def = {
      quality: g.settings.qualityName,
      fov: g.render?.baseFov ?? g.settings.fov ?? 62,
      sens: Math.round((g.settings.mouseSensitivity / 0.00044) * 2) / 2,
      invertY: !!g.settings.invertY,
    };
    if (g.settings.shotMode) return def;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return def;
      const saved = JSON.parse(raw);
      return {
        quality: QUALITIES.includes(saved.quality) ? saved.quality : def.quality,
        fov: clamp(Number(saved.fov) || def.fov, 50, 80),
        sens: clamp(Number(saved.sens) || def.sens, 1, 20),
        invertY: !!saved.invertY,
      };
    } catch {
      return def;
    }
  }

  _saveSettings() {
    if (this.game.settings.shotMode) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      /* storage unavailable */
    }
  }

  _applySettings(s, includeQuality = true) {
    const g = this.game;
    if (includeQuality && s.quality && s.quality !== g.settings.qualityName) {
      g.settings.setQuality(s.quality);
      g.render?.setQuality?.(s.quality);
    }
    if (g.render) g.render.baseFov = s.fov;
    g.settings.fov = s.fov;
    g.settings.mouseSensitivity = s.sens * 0.00044;
    g.settings.invertY = !!s.invertY;
  }

  // ------------------------------------------------------------------ rendering

  _render(state, force = false) {
    if (state === this.state && !force) return;
    const prev = this.state;
    this.state = state;
    if (state === 'playing' || state === 'loading') {
      this.root.innerHTML = '';
      this.panel = null;
      this.root.className = 'menu';
      return;
    }
    if (prev === 'playing' || prev === 'loading') this.panel = null;
    this.root.className = `menu menu--${state}`;
    switch (state) {
      case 'menu':
        this.root.innerHTML = this._mainMenu();
        break;
      case 'paused':
        this.root.innerHTML = this._pauseMenu();
        break;
      case 'dead':
        this.root.innerHTML = this._deathScreen();
        break;
      case 'ended':
        this.root.innerHTML = this._endScreen();
        break;
      default:
        this.root.innerHTML = '';
    }
    this._respawnText = null;
    this._killerText = null;
    this._statusKey = '';
    this._syncPanelButtons();
  }

  _mainMenu() {
    return `
      <div class="menu__screen menu__screen--main">
        <div class="menu__bg"></div>
        <div class="menu__frame">
          <header class="menu__header">
            <div class="menu__kicker">SEASIDE STRIKE · MEDITERRANEAN THEATRE</div>
            <h1 class="menu__title">SEASIDE <span>STRIKE</span></h1>
            <div class="menu__subtitle">DOMINATION · SEASIDE PLAZA · SOLO OPS</div>
          </header>
          <div class="menu__columns">
            <nav class="menu__nav">
              <button class="menu__btn menu__btn--primary" data-action="play">DEPLOY</button>
              <button class="menu__btn" data-action="panel" data-panel="settings">SETTINGS</button>
              <button class="menu__btn" data-action="panel" data-panel="controls">CONTROLS</button>
            </nav>
            <aside class="menu__panel" data-ref="panel">${this._panelContent('brief')}</aside>
          </div>
          <footer class="menu__footer">
            <span>PRE-ALPHA BUILD</span>
            <span>WASD MOVE · SHIFT SPRINT · RMB AIM · R RELOAD · X AIR STRIKE</span>
          </footer>
        </div>
      </div>`;
  }

  _pauseMenu() {
    return `
      <div class="menu__screen menu__screen--pause">
        <div class="menu__bg menu__bg--dim"></div>
        <div class="menu__frame">
          <header class="menu__header">
            <div class="menu__kicker">DOMINATION · SEASIDE PLAZA</div>
            <h1 class="menu__title menu__title--sm">PAUSED</h1>
          </header>
          <div class="menu__columns">
            <nav class="menu__nav">
              <button class="menu__btn menu__btn--primary" data-action="play">RESUME</button>
              <button class="menu__btn" data-action="panel" data-panel="settings">SETTINGS</button>
              <button class="menu__btn" data-action="panel" data-panel="controls">CONTROLS</button>
              <button class="menu__btn menu__btn--quiet" data-action="mainmenu">MAIN MENU</button>
            </nav>
            <aside class="menu__panel" data-ref="panel">${this._panelContent('status')}</aside>
          </div>
          <footer class="menu__footer"><span>PRE-ALPHA BUILD</span><span>ESC RELEASES THE MOUSE · CLICK RESUME TO CONTINUE</span></footer>
        </div>
      </div>`;
  }

  _deathScreen() {
    const st = this.game.hud?.stats || {};
    const killer = st.killedBy || 'ENEMY';
    return `
      <div class="menu__screen menu__screen--dead">
        <div class="menu__bg menu__bg--dead"></div>
        <div class="menu__death">
          <div class="menu__kia">KILLED IN ACTION</div>
          <div class="menu__killedby">KILLED BY <b data-ref="killer">${escape(killer)}</b></div>
          <div class="menu__respawn">RESPAWNING IN <b data-ref="respawn">4</b></div>
          <div class="menu__stats">
            <div class="menu__stat"><span>${st.kills ?? 0}</span><label>KILLS</label></div>
            <div class="menu__stat"><span>${st.headshots ?? 0}</span><label>HEADSHOTS</label></div>
            <div class="menu__stat"><span>${st.bestStreak ?? 0}</span><label>BEST STREAK</label></div>
            <div class="menu__stat"><span>${st.score ?? 0}</span><label>SCORE</label></div>
          </div>
        </div>
      </div>`;
  }

  _endScreen() {
    const g = this.game;
    const st = g.hud?.stats || {};
    const gm = g.gameMode;
    const res = this.result || {};
    const team = res.teamScore || gm?.teamScore || { blue: 0, red: 0 };
    const winner = res.winner || (team.blue >= team.red ? 'blue' : 'red');
    const win = winner === 'blue';
    const score = res.score ?? gm?.score ?? st.score ?? 0;
    return `
      <div class="menu__screen menu__screen--end">
        <div class="menu__bg menu__bg--dim"></div>
        <div class="menu__frame menu__frame--center">
          <div class="menu__kicker">MATCH OVER · DOMINATION</div>
          <h1 class="menu__title menu__title--result ${win ? 'menu__title--win' : 'menu__title--loss'}">${win ? 'VICTORY' : 'DEFEAT'}</h1>
          <div class="menu__teams">
            <div class="menu__team menu__team--blue ${win ? 'menu__team--winner' : ''}"><i>${SOLDIER}</i><span class="menu__team-name">BLUE</span><span class="menu__team-score">${team.blue ?? 0}</span></div>
            <div class="menu__vs">VS</div>
            <div class="menu__team menu__team--red ${!win ? 'menu__team--winner' : ''}"><i>${SOLDIER}</i><span class="menu__team-name">RED</span><span class="menu__team-score">${team.red ?? 0}</span></div>
          </div>
          <div class="menu__scoreboard">
            <div class="menu__sb-row menu__sb-row--head"><span>PLAYER</span><span>SCORE</span><span>KILLS</span><span>HS</span><span>DEATHS</span><span>STREAK</span></div>
            <div class="menu__sb-row"><span class="menu__sb-name">PLAYER</span><span>${score}</span><span>${st.kills ?? 0}</span><span>${st.headshots ?? 0}</span><span>${st.deaths ?? 0}</span><span>${st.bestStreak ?? 0}</span></div>
          </div>
          <div class="menu__actions">
            <button class="menu__btn menu__btn--primary" data-action="reload">PLAY AGAIN</button>
          </div>
        </div>
      </div>`;
  }

  _panelContent(kind) {
    const g = this.game;
    if (kind === 'settings') {
      const s = this.settings;
      const opts = QUALITIES.map((q) => `<option value="${q}" ${q === s.quality ? 'selected' : ''}>${q.toUpperCase()}</option>`).join('');
      const liveQuality = typeof g.render?.setQuality === 'function';
      return `
        <h2 class="menu__h2">SETTINGS</h2>
        <label class="menu__row">
          <span class="menu__row-label">GRAPHICS QUALITY</span>
          <select class="menu__select" data-setting="quality">${opts}</select>
          <small class="menu__hint">${liveQuality ? 'APPLIES IMMEDIATELY' : 'APPLIES ON NEXT RESTART'}</small>
        </label>
        <label class="menu__row">
          <span class="menu__row-label">FIELD OF VIEW <b data-ref="fovVal">${s.fov}</b></span>
          <input class="menu__range" type="range" min="50" max="80" step="1" value="${s.fov}" data-setting="fov">
        </label>
        <label class="menu__row">
          <span class="menu__row-label">MOUSE SENSITIVITY <b data-ref="sensVal">${s.sens.toFixed(1)}</b></span>
          <input class="menu__range" type="range" min="1" max="20" step="0.5" value="${s.sens}" data-setting="sens">
        </label>
        <label class="menu__row menu__row--toggle">
          <span class="menu__row-label">INVERT Y AXIS</span>
          <input class="menu__check" type="checkbox" data-setting="invertY" ${s.invertY ? 'checked' : ''}>
          <i class="menu__switch"></i>
        </label>`;
    }
    if (kind === 'controls') {
      const rows = CONTROLS.map(([k, a]) => `<div class="menu__ctl"><kbd>${k}</kbd><span>${a}</span></div>`).join('');
      return `<h2 class="menu__h2">CONTROLS</h2><div class="menu__ctls">${rows}</div>`;
    }
    if (kind === 'status') {
      const st = g.hud?.stats || {};
      const gm = g.gameMode;
      const t = gm?.timeRemaining ?? 0;
      const ts = gm?.teamScore || { blue: 0, red: 0 };
      const objName = escape(g.world?.getObjective?.()?.name || 'B');
      const owner = gm?.owner;
      const prog = Math.round(Math.abs(gm?.captureProgress ?? 0) * 100);
      const objState = owner === 'blue' ? 'HELD BY BLUE' : owner === 'red' ? 'HELD BY RED' : prog > 0 ? `NEUTRAL · ${prog}%` : 'NEUTRAL';
      const objTone = owner === 'blue' ? 'menu__val--blue' : owner === 'red' ? 'menu__val--red' : '';
      const ks = g.killstreaks;
      const streak = ks?.airstrike?.available ? 'AIR STRIKE READY' : `AIR STRIKE ${ks?.kills ?? 0}/${ks?.killsRequired ?? 5}`;
      return `
        <h2 class="menu__h2">MATCH STATUS</h2>
        <div class="menu__teams menu__teams--compact">
          <div class="menu__team menu__team--blue"><i>${SOLDIER}</i><span class="menu__team-name">BLUE</span><span class="menu__team-score">${ts.blue}</span></div>
          <div class="menu__vs">${fmt(t)}</div>
          <div class="menu__team menu__team--red"><i>${SOLDIER}</i><span class="menu__team-name">RED</span><span class="menu__team-score">${ts.red}</span></div>
        </div>
        <div class="menu__stats menu__stats--compact">
          <div class="menu__stat"><span>${st.score ?? 0}</span><label>SCORE</label></div>
          <div class="menu__stat"><span>${st.kills ?? 0}</span><label>KILLS</label></div>
          <div class="menu__stat"><span>${st.headshots ?? 0}</span><label>HEADSHOTS</label></div>
          <div class="menu__stat"><span>${st.deaths ?? 0}</span><label>DEATHS</label></div>
        </div>
        <div class="menu__brief">
          <div class="menu__brief-row"><label>OBJECTIVE ${objName}</label><span class="${objTone}">${objState}</span></div>
          <div class="menu__brief-row"><label>WAVE</label><span>${gm?.wave ?? 0}</span></div>
          <div class="menu__brief-row"><label>STREAK</label><span>${st.streak ?? 0} · BEST ${st.bestStreak ?? 0}</span></div>
          <div class="menu__brief-row"><label>SUPPORT</label><span class="${ks?.airstrike?.available ? 'menu__val--gold' : ''}">${streak}</span></div>
        </div>`;
    }
    // Mission brief
    const obj = g.world?.getObjective?.();
    return `
      <h2 class="menu__h2">MISSION BRIEF</h2>
      <div class="menu__brief">
        <div class="menu__brief-row"><label>MODE</label><span>DOMINATION</span></div>
        <div class="menu__brief-row"><label>MAP</label><span>SEASIDE PLAZA</span></div>
        <div class="menu__brief-row"><label>OBJECTIVE</label><span>HOLD ${escape(obj?.name || 'B')} · SCORE 1/S</span></div>
        <div class="menu__brief-row"><label>OPFOR</label><span>WAVES · ESCALATING</span></div>
        <div class="menu__brief-row"><label>SUPPORT</label><span>AIR STRIKE · 5 KILLS</span></div>
      </div>
      <p class="menu__brief-text">Capture the plaza fountain and hold it against escalating enemy waves. Score ticks every second you own the objective. Chain five kills to call in an air strike.</p>
      <div class="menu__brief-icon">${SKULL}<span>HIGH THREAT</span></div>`;
  }

  _setPanel(kind) {
    const panel = this.root.querySelector('[data-ref="panel"]');
    if (!panel) return;
    this.panel = kind;
    const base = this.state === 'paused' ? 'status' : 'brief';
    panel.innerHTML = this._panelContent(kind || base);
    this._syncPanelButtons();
  }

  _syncPanelButtons() {
    for (const b of this.root.querySelectorAll('[data-action="panel"]')) {
      b.classList.toggle('is-active', b.dataset.panel === this.panel);
    }
  }

  // ------------------------------------------------------------------ interaction

  _onClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const g = this.game;
    switch (btn.dataset.action) {
      case 'play':
        if (g.state === 'menu' || g.state === 'paused') g.setState('playing');
        break;
      case 'panel':
        this._setPanel(this.panel === btn.dataset.panel ? null : btn.dataset.panel);
        break;
      case 'mainmenu':
        g.setState('menu');
        break;
      case 'reload':
        location.reload();
        break;
    }
  }

  _onInput(e) {
    const input = e.target.closest('[data-setting]');
    if (!input) return;
    const s = this.settings;
    switch (input.dataset.setting) {
      case 'quality':
        s.quality = input.value;
        break;
      case 'fov': {
        s.fov = clamp(parseFloat(input.value) || 62, 50, 80);
        const v = this.root.querySelector('[data-ref="fovVal"]');
        if (v) setText(v, s.fov);
        break;
      }
      case 'sens': {
        s.sens = clamp(parseFloat(input.value) || 5, 1, 20);
        const v = this.root.querySelector('[data-ref="sensVal"]');
        if (v) setText(v, s.sens.toFixed(1));
        break;
      }
      case 'invertY':
        s.invertY = !!input.checked;
        break;
    }
    this._applySettings(s, true);
    this._saveSettings();
  }

  update() {
    if (this.state === 'dead') {
      const n = Math.max(1, Math.ceil(this.game.gameMode?.respawnTimer ?? 0));
      if (n !== this._respawnText) {
        this._respawnText = n;
        const node = this.root.querySelector('[data-ref="respawn"]');
        if (node) setText(node, n);
      }
      // GameMode flips to 'dead' inside the same player:died dispatch, before the HUD has resolved the killer.
      const killer = this.game.hud?.stats?.killedBy;
      if (killer && killer !== this._killerText) {
        this._killerText = killer;
        const node = this.root.querySelector('[data-ref="killer"]');
        if (node) setText(node, killer);
      }
    } else if (this.state === 'paused' && !this.panel) {
      // Match status is static while paused; only refresh if something changed (e.g. HUD stats).
      const st = this.game.hud?.stats;
      const key = st ? `${st.score}|${st.kills}|${st.deaths}` : '';
      if (key !== this._statusKey) {
        this._statusKey = key;
        const panel = this.root.querySelector('[data-ref="panel"]');
        if (panel) panel.innerHTML = this._panelContent('status');
      }
    }
  }
}

function fmt(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function escape(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
