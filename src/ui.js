import * as THREE from 'three';
import './ui.css';
import { settings, updateSettings, setQuality, QUALITY_TIERS } from './settings.js';
import { clamp, saturate, formatTime, formatRange, bearingDeg } from './util/mathx.js';
import { TRACK_STATE, CLASSIFICATION } from './radar.js';
import { SCENARIO_LIST } from './threats.js';
import { SKY_PRESETS } from './weather.js';

/**
 * All 2D interface: title screen, outdoor HUD, the command-console overlay,
 * settings and the debrief. The 3D holographic radar lives in radar.js; this
 * module frames it and provides the buttons around it.
 */

const _v = new THREE.Vector3();

const KEYMAP = [
  ['W A S D', 'Move'],
  ['Shift', 'Sprint'],
  ['Mouse', 'Look'],
  ['C', 'Command console'],
  ['1 2 3', 'Select battery'],
  ['E', 'Assign battery'],
  ['F', 'Authorize launch'],
  ['Tab', 'Cycle track'],
  ['R', 'Restart scenario'],
  ['O', 'Options'],
  ['Esc', 'Release cursor']
];

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export class UI {
  constructor(root, hooks = {}) {
    this.root = root;
    this.hooks = hooks;
    this.logLines = [];
    this.markerPool = [];
    this.resultTimer = 0;
    this.mode = 'FREE';
    this.lastTrackSignature = '';
    this._build();
  }

  /* ================================================================ *
   * Construction
   * ================================================================ */

  _build() {
    this.root.innerHTML = '';

    this.loading = el(`
      <div id="loading">
        <div style="letter-spacing:.4em;font-size:18px;color:#dcfff4">AEGIS LINE</div>
        <div style="font-size:10px;color:#4c9c88;letter-spacing:.28em">BUILDING SITE GEOMETRY</div>
        <div class="bar-outer"><div class="bar-inner"></div></div>
      </div>`);
    this.root.appendChild(this.loading);

    this._buildTitle();
    this._buildHud();
    this._buildConsole();
    this._buildSettings();
    this._buildDebrief();

    this.cursor = el('<div id="cursor" class="hidden"></div>');
    this.root.appendChild(this.cursor);

    this.fpsEl = el('<div id="fps" class="hidden">--</div>');
    this.root.appendChild(this.fpsEl);
    if (settings.showFps) this.fpsEl.classList.remove('hidden');
  }

  setLoadProgress(p, label) {
    if (!this.loading) return;
    this.loading.querySelector('.bar-inner').style.width = `${Math.round(saturate(p) * 100)}%`;
    if (label) this.loading.querySelectorAll('div')[1].textContent = label;
  }

  hideLoading() {
    this.loading?.classList.add('hidden');
  }

  /* ---------------------------------------------------- title */

  _buildTitle() {
    this.title = el(`
      <div id="title">
        <div>
          <h1>AEGIS LINE</h1>
          <div class="sub">FORWARD AIR-DEFENCE SITE 07 &mdash; INTERCEPTOR DEMONSTRATION</div>
        </div>
        <div class="blurb">
          You are the duty officer at a fictional interceptor site. Walk the pad, inspect three
          imaginary batteries, then work an inbound ballistic raid from the command console or
          from the open air.
        </div>
        <div class="keymap">
          ${KEYMAP.map(([k, d]) => `<div><kbd>${k}</kbd><span>${d}</span></div>`).join('')}
        </div>
        <div class="btn-row">
          <button class="btn go big-btn" data-act="start">ENTER SITE</button>
          <button class="btn" data-act="options">OPTIONS</button>
        </div>
        <div class="disclaimer">
          Entertainment demonstration only. Systems, ranges, radar behaviour, guidance and
          procedures are invented and balanced for gameplay. Nothing here reflects any real
          weapon system's capabilities or operation.
        </div>
      </div>`);
    this.root.appendChild(this.title);
    this.title.querySelector('[data-act="start"]').addEventListener('click', () => {
      this.hideTitle();
      this.hooks.onStart?.();
    });
    this.title.querySelector('[data-act="options"]').addEventListener('click', () => this.toggleSettings(true));
  }

  hideTitle() {
    this.title.classList.add('hidden');
  }

  showTitle() {
    this.title.classList.remove('hidden');
  }

  get titleVisible() {
    return !this.title.classList.contains('hidden');
  }

  /* ---------------------------------------------------- hud */

  _buildHud() {
    this.hud = el(`
      <div id="hud">
        <div id="markers"></div>
        <div id="crosshair"></div>
        <div id="center-prompt" class="hidden">
          <div class="pt-id">--</div>
          <div class="pt-meta"></div>
          <div class="pt-action"></div>
        </div>
        <div id="alert" class="hidden">THREAT INBOUND</div>
        <div id="result-toast" class="hidden">
          <div class="rt-main"></div>
          <div class="rt-sub"></div>
        </div>

        <div id="hud-status" class="hud-corner panel">
          <div class="panel-title"><span>SITE STATUS</span><span class="ss-clock">00:00</span></div>
          <div class="panel-body">
            <div class="row"><span class="k">SCENARIO</span><span class="v ss-scenario">--</span></div>
            <div class="row"><span class="k">CONDITIONS</span><span class="v ss-sky">--</span></div>
            <div class="row"><span class="k">TRACKS ACTIVE</span><span class="v ss-tracks">0</span></div>
            <div class="row"><span class="k">IN FLIGHT</span><span class="v ss-flight">0</span></div>
            <div class="row"><span class="k">INTERCEPTED</span><span class="v ss-kills">0</span></div>
            <div class="row"><span class="k">LEAKERS</span><span class="v ss-leaks">0</span></div>
          </div>
        </div>

        <div id="hud-tracks" class="hud-corner panel">
          <div class="panel-title"><span>TRACK FILE</span><span class="tf-count">0</span></div>
          <div class="panel-body" id="track-list"></div>
        </div>

        <div id="hud-log" class="hud-corner panel">
          <div class="panel-title"><span>EVENT LOG</span></div>
          <div class="panel-body"><div id="log-list"></div></div>
        </div>

        <div id="hud-help">
          <div><kbd>C</kbd> console &nbsp; <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> battery</div>
          <div><kbd>Tab</kbd> cycle track &nbsp; <kbd>E</kbd> assign &nbsp; <kbd>F</kbd> launch</div>
          <div><kbd>R</kbd> restart &nbsp; <kbd>O</kbd> options</div>
        </div>

        <div id="hud-batteries"></div>
      </div>`);
    this.root.appendChild(this.hud);

    this.markers = this.hud.querySelector('#markers');
    this.centerPrompt = this.hud.querySelector('#center-prompt');
    this.alertEl = this.hud.querySelector('#alert');
    this.resultToast = this.hud.querySelector('#result-toast');
    this.trackList = this.hud.querySelector('#track-list');
    this.logList = this.hud.querySelector('#log-list');
    this.batteryStrip = this.hud.querySelector('#hud-batteries');
    this.statusEls = {
      clock: this.hud.querySelector('.ss-clock'),
      scenario: this.hud.querySelector('.ss-scenario'),
      sky: this.hud.querySelector('.ss-sky'),
      tracks: this.hud.querySelector('.ss-tracks'),
      flight: this.hud.querySelector('.ss-flight'),
      kills: this.hud.querySelector('.ss-kills'),
      leaks: this.hud.querySelector('.ss-leaks'),
      trackCount: this.hud.querySelector('.tf-count')
    };
  }

  _ensureBatteryCards(batteries) {
    if (this.batteryCards && this.batteryCards.length === batteries.length) return;
    this.batteryStrip.innerHTML = '';
    this.batteryCards = batteries.map((b, i) => {
      const card = el(`
        <div class="bat-card" style="--accent:${b.spec.accent}">
          <div class="bc-top">
            <span class="bc-name">${b.spec.name}</span>
            <span class="bc-key">[${i + 1}]</span>
          </div>
          <div class="bc-sub">${b.spec.subtitle}</div>
          <div class="bc-status">
            <span class="dot"></span><span class="st">READY</span>
            <span class="bc-ammo">0/0</span>
          </div>
          <div class="bar"><i style="width:100%"></i></div>
        </div>`);
      card.addEventListener('click', () => this.hooks.onBattery?.(i));
      this.batteryStrip.appendChild(card);
      return card;
    });
  }

  /* ---------------------------------------------------- console */

  _buildConsole() {
    this.console = el(`
      <div id="console-ui" class="hidden">
        <div id="console-hint">COMMAND CONSOLE &mdash; CLICK A TRACK IN THE VOLUME, OR USE THE LIST &mdash; <kbd>C</kbd> TO STAND UP</div>

        <div id="console-left" class="side">
          <div class="panel">
            <div class="panel-title"><span>CONDITIONS</span></div>
            <div class="panel-body"><div class="opt-grid" id="sky-opts"></div></div>
          </div>
          <div class="panel">
            <div class="panel-title"><span>THREAT SCENARIO</span></div>
            <div class="panel-body"><div class="opt-grid" id="scenario-opts"></div></div>
          </div>
          <div class="panel" style="flex:1;overflow:hidden">
            <div class="panel-title"><span>TRACK FILE</span><span class="ctf-count">0</span></div>
            <div class="panel-body" id="console-track-list" style="overflow:auto;max-height:100%"></div>
          </div>
        </div>

        <div id="console-right" class="side">
          <div class="panel">
            <div class="panel-title"><span>BATTERY SELECT</span></div>
            <div class="panel-body"><div class="opt-grid" id="battery-opts"></div></div>
          </div>
          <div class="panel">
            <div class="panel-title"><span>ENGAGEMENT</span></div>
            <div class="panel-body assign-state" id="engagement-state"></div>
          </div>
          <div class="panel">
            <div class="panel-title"><span>SITE</span></div>
            <div class="panel-body" id="console-site"></div>
          </div>
        </div>

        <div id="console-bottom">
          <button class="btn primary big-btn" data-act="begin">START BALLISTIC MISSILES</button>
          <button class="btn big-btn" data-act="assign">ASSIGN <kbd>E</kbd></button>
          <button class="btn go big-btn" data-act="authorize">AUTHORIZE LAUNCH <kbd>F</kbd></button>
          <button class="btn big-btn" data-act="restart">RESTART <kbd>R</kbd></button>
        </div>
      </div>`);
    this.root.appendChild(this.console);

    this.skyOpts = this.console.querySelector('#sky-opts');
    this.scenarioOpts = this.console.querySelector('#scenario-opts');
    this.batteryOpts = this.console.querySelector('#battery-opts');
    this.consoleTrackList = this.console.querySelector('#console-track-list');
    this.engagementState = this.console.querySelector('#engagement-state');
    this.consoleSite = this.console.querySelector('#console-site');
    this.consoleTrackCount = this.console.querySelector('.ctf-count');

    for (const [id, preset] of Object.entries(SKY_PRESETS)) {
      const b = el(`<button class="btn opt" data-sky="${id}">
          <span class="o-name">${preset.label}</span>
        </button>`);
      b.addEventListener('click', () => this.hooks.onSky?.(id));
      this.skyOpts.appendChild(b);
    }

    for (const s of SCENARIO_LIST) {
      const b = el(`<button class="btn opt" data-scenario="${s.id}">
          <span class="o-name">${s.name}</span>
          <span class="o-desc">${s.brief}</span>
        </button>`);
      b.addEventListener('click', () => this.hooks.onScenario?.(s.id));
      this.scenarioOpts.appendChild(b);
    }

    this.consoleButtons = {
      begin: this.console.querySelector('[data-act="begin"]'),
      assign: this.console.querySelector('[data-act="assign"]'),
      authorize: this.console.querySelector('[data-act="authorize"]'),
      restart: this.console.querySelector('[data-act="restart"]')
    };
    this.consoleButtons.begin.addEventListener('click', () => this.hooks.onBegin?.());
    this.consoleButtons.assign.addEventListener('click', () => this.hooks.onAssign?.());
    this.consoleButtons.authorize.addEventListener('click', () => this.hooks.onAuthorize?.());
    this.consoleButtons.restart.addEventListener('click', () => this.hooks.onRestart?.());
  }

  _ensureBatteryOpts(batteries) {
    if (this.batteryOptEls && this.batteryOptEls.length === batteries.length) return;
    this.batteryOpts.innerHTML = '';
    this.batteryOptEls = batteries.map((b, i) => {
      const node = el(`<button class="btn opt" style="border-left:3px solid ${b.spec.accent}">
          <span class="o-name">${b.spec.name} &nbsp;<span style="opacity:.6">[${i + 1}]</span></span>
          <span class="o-desc">${b.spec.description}</span>
        </button>`);
      node.addEventListener('click', () => this.hooks.onBattery?.(i));
      this.batteryOpts.appendChild(node);
      return node;
    });
  }

  showConsole(on) {
    this.console.classList.toggle('hidden', !on);
    this.hud.querySelector('#crosshair').classList.toggle('hidden', on);
    this.hud.querySelector('#hud-batteries').classList.toggle('hidden', on);
    this.hud.querySelector('#hud-help').classList.toggle('hidden', on);
    this.hud.querySelector('#hud-tracks').classList.toggle('hidden', on);
    this.cursor.classList.toggle('hidden', !on);
    this.mode = on ? 'CONSOLE' : 'FREE';
  }

  /* ---------------------------------------------------- settings */

  _buildSettings() {
    const tiers = Object.keys(QUALITY_TIERS);
    this.settings = el(`
      <div id="settings" class="panel hidden">
        <div class="panel-title"><span>OPTIONS</span><span>ESC / O</span></div>
        <div class="panel-body">
          <div class="set-row">
            <span class="lbl">Quality</span>
            <span class="seg" id="set-quality">
              ${tiers.map((t) => `<button class="btn" data-q="${t}">${t.toUpperCase()}</button>`).join('')}
            </span>
          </div>
          <div class="set-row">
            <span class="lbl">Reduced motion</span>
            <span class="seg" id="set-motion">
              <button class="btn" data-rm="0">OFF</button>
              <button class="btn" data-rm="1">ON</button>
            </span>
          </div>
          <div class="set-row">
            <span class="lbl">High contrast HUD</span>
            <span class="seg" id="set-contrast">
              <button class="btn" data-hc="0">OFF</button>
              <button class="btn" data-hc="1">ON</button>
            </span>
          </div>
          <div class="set-row">
            <span class="lbl">Master volume</span>
            <input type="range" id="set-volume" min="0" max="100" value="80" />
          </div>
          <div class="set-row">
            <span class="lbl">Sensitivity</span>
            <input type="range" id="set-sens" min="20" max="220" value="100" />
          </div>
          <div class="set-row">
            <span class="lbl">Field of view</span>
            <input type="range" id="set-fov" min="55" max="95" value="68" />
          </div>
          <div class="set-row">
            <span class="lbl">Show FPS</span>
            <span class="seg" id="set-fps">
              <button class="btn" data-fps="0">OFF</button>
              <button class="btn" data-fps="1">ON</button>
            </span>
          </div>
          <div class="btn-row" style="margin-top:12px;justify-content:flex-end">
            <button class="btn" data-act="close">CLOSE</button>
          </div>
        </div>
      </div>`);
    this.root.appendChild(this.settings);

    this.settings.querySelectorAll('#set-quality .btn').forEach((b) =>
      b.addEventListener('click', () => {
        setQuality(b.dataset.q);
        this.hooks.onQuality?.(b.dataset.q);
        this._syncSettings();
      })
    );
    this.settings.querySelectorAll('#set-motion .btn').forEach((b) =>
      b.addEventListener('click', () => {
        updateSettings({ reducedMotion: b.dataset.rm === '1' });
        this._syncSettings();
      })
    );
    this.settings.querySelectorAll('#set-contrast .btn').forEach((b) =>
      b.addEventListener('click', () => {
        updateSettings({ highContrastHud: b.dataset.hc === '1' });
        document.body.classList.toggle('hc', settings.highContrastHud);
        this._syncSettings();
      })
    );
    this.settings.querySelectorAll('#set-fps .btn').forEach((b) =>
      b.addEventListener('click', () => {
        updateSettings({ showFps: b.dataset.fps === '1' });
        this.fpsEl.classList.toggle('hidden', !settings.showFps);
        this._syncSettings();
      })
    );
    this.settings.querySelector('#set-volume').addEventListener('input', (e) => {
      this.hooks.onVolume?.(Number(e.target.value) / 100);
    });
    this.settings.querySelector('#set-sens').addEventListener('input', (e) => {
      updateSettings({ mouseSensitivity: Number(e.target.value) / 100 });
    });
    this.settings.querySelector('#set-fov').addEventListener('input', (e) => {
      updateSettings({ fov: Number(e.target.value) });
      this.hooks.onFov?.(Number(e.target.value));
    });
    this.settings.querySelector('[data-act="close"]').addEventListener('click', () => this.toggleSettings(false));
    this._syncSettings();
  }

  _syncSettings() {
    const s = this.settings;
    s.querySelectorAll('#set-quality .btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.q === settings.qualityName)
    );
    s.querySelectorAll('#set-motion .btn').forEach((b) =>
      b.classList.toggle('active', (b.dataset.rm === '1') === settings.reducedMotion)
    );
    s.querySelectorAll('#set-contrast .btn').forEach((b) =>
      b.classList.toggle('active', (b.dataset.hc === '1') === settings.highContrastHud)
    );
    s.querySelectorAll('#set-fps .btn').forEach((b) =>
      b.classList.toggle('active', (b.dataset.fps === '1') === settings.showFps)
    );
    s.querySelector('#set-volume').value = String(Math.round(settings.masterVolume * 100));
    s.querySelector('#set-sens').value = String(Math.round(settings.mouseSensitivity * 100));
    s.querySelector('#set-fov').value = String(Math.round(settings.fov));
  }

  toggleSettings(force) {
    const show = force === undefined ? this.settings.classList.contains('hidden') : force;
    this.settings.classList.toggle('hidden', !show);
    if (show) this._syncSettings();
    return show;
  }

  get settingsOpen() {
    return !this.settings.classList.contains('hidden');
  }

  /* ---------------------------------------------------- debrief */

  _buildDebrief() {
    this.debrief = el(`
      <div id="debrief" class="panel hidden">
        <div class="panel-title"><span>ENGAGEMENT SUMMARY</span><span class="db-scn">--</span></div>
        <div class="panel-body">
          <div class="score-grid">
            <div class="score-cell"><div class="n db-kills">0</div><div class="l">INTERCEPTED</div></div>
            <div class="score-cell"><div class="n db-leaks">0</div><div class="l">LEAKERS</div></div>
            <div class="score-cell"><div class="n db-rounds">0</div><div class="l">ROUNDS FIRED</div></div>
          </div>
          <div class="db-detail" style="font-size:11px;line-height:1.8;color:#9fd8c9"></div>
          <div class="btn-row" style="margin-top:14px;justify-content:flex-end">
            <button class="btn go" data-act="again">RUN AGAIN <kbd>R</kbd></button>
            <button class="btn" data-act="close">DISMISS</button>
          </div>
        </div>
      </div>`);
    this.root.appendChild(this.debrief);
    this.debrief.querySelector('[data-act="again"]').addEventListener('click', () => {
      this.hideDebrief();
      this.hooks.onRestart?.();
    });
    this.debrief.querySelector('[data-act="close"]').addEventListener('click', () => this.hideDebrief());
  }

  showDebrief(summary) {
    this.debrief.querySelector('.db-scn').textContent = summary.scenario;
    this.debrief.querySelector('.db-kills').textContent = summary.intercepted;
    this.debrief.querySelector('.db-leaks').textContent = summary.leakers;
    this.debrief.querySelector('.db-rounds').textContent = summary.rounds;
    this.debrief.querySelector('.db-detail').innerHTML = summary.lines.map((l) => `<div>${l}</div>`).join('');
    this.debrief.classList.remove('hidden');
  }

  hideDebrief() {
    this.debrief.classList.add('hidden');
  }

  get debriefOpen() {
    return !this.debrief.classList.contains('hidden');
  }

  /* ================================================================ *
   * Runtime
   * ================================================================ */

  log(message, kind = '') {
    const line = el(`<div class="log-line ${kind}"><span class="t">${new Date().toLocaleTimeString('en-GB', {
      hour12: false
    })}</span><span class="m">${message}</span></div>`);
    this.logList.prepend(line);
    this.logLines.push(line);
    while (this.logLines.length > 7) {
      const old = this.logLines.shift();
      old.remove();
    }
  }

  showResult(main, sub, color = '#6bffb0', duration = 2.6) {
    this.resultToast.querySelector('.rt-main').textContent = main;
    this.resultToast.querySelector('.rt-main').style.color = color;
    this.resultToast.querySelector('.rt-sub').textContent = sub || '';
    this.resultToast.classList.remove('hidden');
    this.resultTimer = duration;
  }

  setAlert(text) {
    if (!text) {
      this.alertEl.classList.add('hidden');
      return;
    }
    this.alertEl.textContent = text;
    this.alertEl.classList.remove('hidden');
  }

  setCursor(x, y) {
    this.cursor.style.transform = `translate(${x}px, ${y}px)`;
  }

  /** Main per-frame refresh. `state` is assembled by the game each frame. */
  update(state, dt) {
    if (this.resultTimer > 0) {
      this.resultTimer -= dt;
      if (this.resultTimer <= 0) this.resultToast.classList.add('hidden');
    }

    const s = this.statusEls;
    s.clock.textContent = formatTime(state.elapsed);
    s.scenario.textContent = state.scenarioName;
    s.sky.textContent = state.skyLabel;
    s.tracks.textContent = String(state.activeThreats);
    s.flight.textContent = String(state.inFlight);
    s.kills.textContent = String(state.intercepted);
    s.leaks.textContent = String(state.leakers);
    s.trackCount.textContent = String(state.tracks.length);
    this.consoleTrackCount.textContent = String(state.tracks.length);

    this._updateBatteries(state);
    this._updateTrackList(state);
    this._updateCenterPrompt(state);
    this._updateMarkers(state);
    if (this.mode === 'CONSOLE') this._updateConsolePanels(state);

    if (settings.showFps && state.fps !== undefined) {
      this.fpsEl.textContent = `${state.fps.toFixed(0)} FPS  |  ${state.frameMs.toFixed(1)} ms  |  ${state.drawCalls} draws  |  ${settings.qualityName}`;
    }
  }

  _updateBatteries(state) {
    this._ensureBatteryCards(state.batteries);
    state.batteries.forEach((b, i) => {
      const card = this.batteryCards[i];
      card.classList.toggle('selected', i === state.selectedBatteryIndex);
      const st = card.querySelector('.st');
      const dot = card.querySelector('.dot');
      st.textContent = b.statusText;
      card.querySelector('.bc-status').style.color = b.statusColor;
      dot.style.color = b.statusColor;
      card.querySelector('.bc-ammo').textContent = `${b.ammo}/${b.maxAmmo}`;
      const bar = card.querySelector('.bar > i');
      bar.style.width = `${clamp(b.progress, 0, 1) * 100}%`;
    });
  }

  _trackRowHtml(t, selected) {
    const cls = [
      'track-row',
      selected ? 'sel' : '',
      t.classification === CLASSIFICATION.DECOY ? 'decoy' : '',
      t.engaged ? 'engaged' : ''
    ].join(' ');
    const range = t.alive ? formatRange(Math.hypot(t.pos.x, t.pos.z)) : '--';
    const alt = t.alive ? `${(t.pos.y / 1000).toFixed(1)} km` : '--';
    const tti = t.alive && isFinite(t.threat.timeToImpact) ? `${t.threat.timeToImpact.toFixed(0)}s` : '--';
    const stateTxt = !t.alive
      ? 'GONE'
      : t.state === TRACK_STATE.TRACKED
        ? t.engaged ? 'ENGAGED' : 'TRACKED'
        : t.state;
    return `<div class="${cls}" data-track="${t.id}">
        <span class="tid">${t.id}</span>
        <span class="tmeta">${alt} &nbsp; ${range} &nbsp; T-${tti}</span>
        <span class="tstate">${stateTxt}</span>
      </div>`;
  }

  _updateTrackList(state) {
    const sig = state.tracks
      .map((t) => `${t.id}${t.state}${t.engaged}${t.classification}${t.alive}${t === state.selectedTrack}${Math.round(t.pos.y / 200)}`)
      .join('|');
    if (sig === this.lastTrackSignature) return;
    this.lastTrackSignature = sig;

    const html = state.tracks.length
      ? state.tracks.map((t) => this._trackRowHtml(t, t === state.selectedTrack)).join('')
      : '<div style="color:#4c9c88;font-size:10.5px;padding:6px 2px">NO TRACKS</div>';
    this.trackList.innerHTML = html;
    this.consoleTrackList.innerHTML = html;
    for (const list of [this.trackList, this.consoleTrackList]) {
      list.querySelectorAll('.track-row').forEach((row) => {
        row.addEventListener('click', () => this.hooks.onSelectTrack?.(row.dataset.track));
      });
    }
  }

  _updateCenterPrompt(state) {
    if (this.mode === 'CONSOLE' || !state.lookedAtTrack) {
      this.centerPrompt.classList.add('hidden');
      return;
    }
    const t = state.lookedAtTrack;
    this.centerPrompt.classList.remove('hidden');
    this.centerPrompt.querySelector('.pt-id').textContent = `${t.id}  ${t.classification}`;
    const range = Math.hypot(t.pos.x, t.pos.z);
    this.centerPrompt.querySelector('.pt-meta').textContent =
      `ALT ${(t.pos.y / 1000).toFixed(1)} km   RNG ${formatRange(range)}   BRG ${Math.round(bearingDeg(t.pos.x, t.pos.z))}°   ${t.threat.phase}`;
    const action = this.centerPrompt.querySelector('.pt-action');
    if (t.engaged) {
      action.innerHTML = `<span style="color:#ffc247">ENGAGED &mdash; ${state.selectedBatteryName}</span>`;
    } else if (state.engagementCheck && !state.engagementCheck.ok) {
      action.innerHTML = `<span style="color:#ff5f4a">${state.engagementCheck.reason}</span>`;
    } else if (state.assignedTrack === t) {
      action.innerHTML = `<kbd>F</kbd> AUTHORIZE LAUNCH`;
    } else {
      action.innerHTML = `<kbd>E</kbd> ASSIGN ${state.selectedBatteryName}`;
    }
  }

  /* ---------------------------------------------------- markers */

  _marker(i) {
    while (this.markerPool.length <= i) {
      const m = el('<div class="marker"><div class="box"></div><div class="lbl"></div></div>');
      this.markers.appendChild(m);
      this.markerPool.push(m);
    }
    return this.markerPool[i];
  }

  _updateMarkers(state) {
    if (this.mode === 'CONSOLE') {
      for (const m of this.markerPool) m.style.display = 'none';
      return;
    }
    const cam = state.camera;
    const w = state.viewport.width;
    const h = state.viewport.height;
    let i = 0;

    const place = (pos, label, cls, sizeHint) => {
      const m = this._marker(i++);
      _v.copy(pos).project(cam);
      const behind = _v.z > 1;
      let x = (_v.x * 0.5 + 0.5) * w;
      let y = (-_v.y * 0.5 + 0.5) * h;
      let off = behind || x < 12 || x > w - 12 || y < 12 || y > h - 12;
      if (behind) {
        x = w - x;
        y = h - y;
      }
      x = clamp(x, 16, w - 16);
      y = clamp(y, 16, h - 16);
      m.style.display = '';
      m.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      m.className = `marker ${cls}${off ? ' offscreen' : ''}`;
      m.querySelector('.lbl').textContent = label;
      const box = m.querySelector('.box');
      if (!off && sizeHint) {
        const px = clamp(sizeHint, 14, 90);
        box.style.width = `${px}px`;
        box.style.height = `${px}px`;
      } else {
        box.style.width = '';
        box.style.height = '';
      }
    };

    for (const t of state.tracks) {
      if (!t.alive) continue;
      if (t.state === TRACK_STATE.SEARCH) continue;
      const dist = cam.position.distanceTo(t.pos);
      const cls = [
        t.classification === CLASSIFICATION.DECOY ? 'decoy' : '',
        t.engaged ? 'engaged' : '',
        t === state.selectedTrack ? 'selected' : ''
      ].join(' ');
      const tti = isFinite(t.threat.timeToImpact) ? ` T-${t.threat.timeToImpact.toFixed(0)}` : '';
      place(t.pos, `${t.id} ${(t.pos.y / 1000).toFixed(1)}km${tti}`, cls, 2600 / Math.max(60, dist * 0.06));
    }
    for (const shot of state.interceptors) {
      place(shot.pos, shot.id, 'interceptor', 0);
    }
    for (; i < this.markerPool.length; i++) this.markerPool[i].style.display = 'none';
  }

  /* ---------------------------------------------------- console panels */

  _updateConsolePanels(state) {
    this._ensureBatteryOpts(state.batteries);

    this.skyOpts.querySelectorAll('[data-sky]').forEach((b) =>
      b.classList.toggle('active', b.dataset.sky === state.skyId)
    );
    this.scenarioOpts.querySelectorAll('[data-scenario]').forEach((b) =>
      b.classList.toggle('active', b.dataset.scenario === state.scenarioId)
    );
    this.batteryOptEls.forEach((b, i) => b.classList.toggle('active', i === state.selectedBatteryIndex));

    const t = state.selectedTrack;
    const bat = state.batteries[state.selectedBatteryIndex];
    const check = state.engagementCheck;
    this.engagementState.innerHTML = `
      <div><span class="lbl">TRACK</span> <span class="val">${t ? t.id : '---'}</span></div>
      <div><span class="lbl">CLASS</span> <span class="val">${t ? t.classification : '---'}</span></div>
      <div><span class="lbl">BATTERY</span> <span class="val">${bat.spec.name}</span></div>
      <div><span class="lbl">STATUS</span> <span class="val" style="color:${bat.statusColor}">${bat.statusText}</span></div>
      <div><span class="lbl">ENVELOPE</span> <span class="${check?.ok ? 'ok' : 'bad'}">${check ? check.reason : '---'}</span></div>
      <div><span class="lbl">ASSIGNED</span> <span class="val">${state.assignedTrack ? state.assignedTrack.id : 'NONE'}</span></div>
      <div><span class="lbl">IN FLIGHT</span> <span class="val">${state.inFlight}</span></div>`;

    this.consoleSite.innerHTML = `
      <div class="row"><span class="k">STATE</span><span class="v">${state.phase}</span></div>
      <div class="row"><span class="k">CLOCK</span><span class="v">${formatTime(state.elapsed)}</span></div>
      <div class="row"><span class="k">INBOUND</span><span class="v">${state.activeThreats}</span></div>
      <div class="row"><span class="k">INTERCEPTED</span><span class="v">${state.intercepted}</span></div>
      <div class="row"><span class="k">LEAKERS</span><span class="v">${state.leakers}</span></div>
      <div class="row"><span class="k">DECOYS HIT</span><span class="v">${state.decoysHit}</span></div>`;

    this.consoleButtons.begin.disabled = state.phase === 'RUNNING';
    this.consoleButtons.begin.textContent =
      state.phase === 'RUNNING' ? 'ENGAGEMENT IN PROGRESS' : 'START BALLISTIC MISSILES';
    this.consoleButtons.assign.disabled = !t || !check?.ok;
    this.consoleButtons.authorize.disabled = !state.assignedTrack || !state.canAuthorize;
  }
}
