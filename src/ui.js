/**
 * Interface layer.
 *
 * Owns every DOM overlay: the menu, the head-up display, the command console,
 * the scope canvases and the event log. It reads game state and publishes
 * intents back through callbacks, so gameplay logic never touches the DOM.
 *
 * Readability rules the design: at any moment the player can see how many
 * threats are up, which are tracked, which battery is selected and what it is
 * doing, what is assigned, what is in flight, and why the last engagement
 * ended the way it did.
 */

import { BATTERIES, SCENARIOS, CONDITIONS, RESULT } from './config.js';
import { ScopeRenderer } from './radar.js';
import { fmtRange, fmtAlt, clamp01 } from './util/mathx.js';
import { BATTERY_STATE } from './batteries.js';

const $ = (sel) => document.querySelector(sel);

export class UI {
  constructor() {
    this.el = {
      hud: $('#hud'),
      menu: $('#menu'),
      loader: $('#loader'),
      consoleUI: $('#console-ui'),
      reticle: $('#reticle'),
      prompt: $('#target-prompt'),
      cond: $('#s-cond'),
      scenario: $('#s-scenario'),
      stateBlock: $('#s-defcon'),
      state: $('#s-state'),
      threats: $('#s-threats'),
      inflight: $('#s-inflight'),
      clock: $('#s-clock'),
      batteryList: $('#battery-list'),
      trackList: $('#track-list'),
      miniCanvas: $('#mini-radar-canvas'),
      mrRange: $('#mr-range'),
      ebAssign: $('#eb-assign'),
      ebLaunch: $('#eb-launch'),
      ebConsole: $('#eb-console'),
      log: $('#event-log'),
      result: $('#result-banner'),
      alarm: $('#alarm-flash'),
      scopeCanvas: $('#scope-canvas'),
      scopeMode: $('#scope-mode'),
      condSeg: $('#cond-seg'),
      scenSeg: $('#scen-seg'),
      batSeg: $('#bat-seg'),
      cTrack: $('#c-track'),
      cBat: $('#c-bat'),
      cSol: $('#c-sol'),
      btnAssign: $('#btn-assign'),
      btnAuthorize: $('#btn-authorize'),
      btnStart: $('#btn-start'),
      btnRestart: $('#btn-restart'),
      btnEnter: $('#btn-enter'),
      consoleExit: $('#console-exit'),
      consoleStatus: $('#console-status'),
      optReduced: $('#opt-reduced'),
      optAudio: $('#opt-audio'),
      perf: $('#perf'),
    };

    this.callbacks = {};
    this.scope = new ScopeRenderer(this.el.scopeCanvas, { compact: false });
    this.mini = new ScopeRenderer(this.el.miniCanvas, { compact: true });
    this._logRows = [];
    this._resultTimer = 0;
    this._promptState = null;
    this._batteryRows = new Map();
    this._trackRows = new Map();
    this._buildBatteryUI();
    this._wire();
  }

  on(name, fn) { this.callbacks[name] = fn; return this; }
  _fire(name, ...args) { this.callbacks[name]?.(...args); }

  // ---------------------------------------------------------------- setup

  _buildBatteryUI() {
    // HUD rail
    this.el.batteryList.innerHTML = '';
    BATTERIES.forEach((def, i) => {
      const row = document.createElement('div');
      row.className = 'bat-row';
      row.dataset.id = def.id;
      row.innerHTML = `
        <span class="idx">${i + 1}</span>
        <span class="nm">${def.name}<small>${def.role} &middot; ${def.blurb}</small>
          <span class="bat-ammo"></span></span>
        <span class="st">--</span>`;
      row.addEventListener('click', () => this._fire('selectBattery', def.id));
      this.el.batteryList.appendChild(row);
      this._batteryRows.set(def.id, row);
    });

    // Console segmented control
    this.el.batSeg.innerHTML = '';
    BATTERIES.forEach((def, i) => {
      const btn = document.createElement('button');
      btn.className = 'seg-btn';
      btn.dataset.bat = def.id;
      btn.innerHTML = `<b>${i + 1}. ${def.name}</b><i>${def.role} &middot; ${def.blurb}</i>
        <span class="tag ready" data-tag>--</span>`;
      btn.addEventListener('click', () => this._fire('selectBattery', def.id));
      this.el.batSeg.appendChild(btn);
    });
  }

  _wire() {
    this.el.btnEnter.addEventListener('click', () => this._fire('enter'));
    this.el.optReduced.addEventListener('change', (e) =>
      this._fire('setReducedMotion', e.target.checked));
    this.el.optAudio.addEventListener('change', (e) =>
      this._fire('setAudio', e.target.checked));

    for (const btn of this.el.condSeg.querySelectorAll('[data-cond]')) {
      btn.addEventListener('click', () => this._fire('setCondition', btn.dataset.cond));
    }
    for (const btn of this.el.scenSeg.querySelectorAll('[data-scen]')) {
      btn.addEventListener('click', () => this._fire('setScenario', btn.dataset.scen));
    }
    this.el.btnStart.addEventListener('click', () => this._fire('start'));
    this.el.btnRestart.addEventListener('click', () => this._fire('restart'));
    this.el.btnAssign.addEventListener('click', () => this._fire('assign'));
    this.el.btnAuthorize.addEventListener('click', () => this._fire('authorize'));
    this.el.consoleExit.addEventListener('click', () => this._fire('closeConsole'));

    // Scope interaction: click to select, arrow keys to cycle.
    const pick = (ev) => {
      const rect = this.el.scopeCanvas.getBoundingClientRect();
      const nx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
      // Scope space: radius 0.92 of the half-extent.
      this._fire('scopePick', nx / 0.92, ny / 0.92);
    };
    this.el.scopeCanvas.addEventListener('click', pick);
    this.el.scopeCanvas.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') {
        ev.preventDefault(); this._fire('cycleTrack', 1);
      } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
        ev.preventDefault(); this._fire('cycleTrack', -1);
      } else if (ev.key === 'Enter') {
        ev.preventDefault(); this._fire('assign');
      }
    });
  }

  // --------------------------------------------------------------- layers

  hideLoader() {
    this.el.loader.classList.add('done');
    setTimeout(() => this.el.loader.classList.add('hidden'), 600);
  }

  showMenu(show) {
    this.el.menu.classList.toggle('hidden', !show);
  }

  showConsole(show) {
    this.el.consoleUI.classList.toggle('hidden', !show);
    this.el.hud.classList.toggle('hidden', show);
    if (show) setTimeout(() => this.el.scopeCanvas.focus(), 30);
  }

  setPerfVisible(on) { this.el.perf.classList.toggle('hidden', !on); }
  setPerfText(txt) { this.el.perf.textContent = txt; }

  // ------------------------------------------------------------------ log

  log(entry) {
    const row = document.createElement('div');
    row.className = 'ev ' + (entry.kind || 'info');
    row.innerHTML = `<span class="t">T+${entry.t.toFixed(1)}</span>${entry.text}`;
    this.el.log.appendChild(row);
    this._logRows.push(row);
    while (this._logRows.length > 7) {
      const old = this._logRows.shift();
      old.remove();
    }
  }

  clearLog() {
    this.el.log.innerHTML = '';
    this._logRows.length = 0;
  }

  // --------------------------------------------------------------- result

  showResult(big, sub, kind = 'good', hold = 3.4) {
    const el = this.el.result;
    el.className = kind;
    el.innerHTML = `<div class="big">${big}</div><div class="sub">${sub}</div>`;
    el.classList.remove('hidden');
    this._resultTimer = hold;
  }

  hideResult() {
    this.el.result.classList.add('hidden');
    this._resultTimer = 0;
  }

  // --------------------------------------------------------------- update

  /**
   * @param {number} dt
   * @param {object} ctx everything the interface needs to render a frame
   */
  update(dt, ctx) {
    const {
      state, radar, batteries, threats, interceptors, phase,
      selectedBattery, selectedTrack, lookTarget, nearConsole, consoleOpen,
      alarm, inFlight, condition, scenario, feasibility,
    } = ctx;

    if (this._resultTimer > 0) {
      this._resultTimer -= dt;
      if (this._resultTimer <= 0) this.hideResult();
    }

    // Status strip
    this.el.cond.textContent = CONDITIONS[condition].name;
    this.el.scenario.textContent = SCENARIOS.find((s) => s.id === scenario).name;
    const stateLabel = {
      standby: 'STANDBY', inbound: 'INBOUND', complete: 'SECURED', menu: 'STANDBY', loading: 'BOOT',
    }[phase] ?? phase.toUpperCase();
    this.el.state.textContent = stateLabel;
    this.el.stateBlock.classList.toggle('hot', alarm);
    this.el.threats.textContent = String(ctx.threatCount);
    this.el.inflight.textContent = String(inFlight);
    this.el.clock.textContent = state.clock.toFixed(1);
    this.el.alarm.classList.toggle('on', alarm);

    // Battery rail
    for (const b of batteries) {
      const row = this._batteryRows.get(b.def.id);
      if (!row) continue;
      row.classList.toggle('sel', b.def.id === selectedBattery?.def.id);
      const st = row.querySelector('.st');
      st.textContent = b.statusLabel;
      st.className = 'st ' + b.statusClass;
      const ammo = row.querySelector('.bat-ammo');
      if (ammo.childElementCount !== b.maxAmmo) {
        ammo.innerHTML = Array.from({ length: b.maxAmmo }, () => '<i></i>').join('');
      }
      const pips = ammo.children;
      for (let i = 0; i < pips.length; i++) {
        pips[i].className = i < b.ammo ? '' : 'used';
      }
      // Console segment
      const seg = this.el.batSeg.querySelector(`[data-bat="${b.def.id}"]`);
      if (seg) {
        seg.classList.toggle('on', b.def.id === selectedBattery?.def.id);
        const tag = seg.querySelector('[data-tag]');
        tag.textContent = `${b.statusLabel} ${b.ammo}/${b.maxAmmo}`;
        tag.className = 'tag ' + b.statusClass;
      }
    }

    // Track list
    const tracks = radar.trackList.filter((t) => t.threat.alive);
    if (!tracks.length) {
      if (this.el.trackList.dataset.empty !== '1') {
        this.el.trackList.innerHTML = '<div class="empty">NO TRACKS</div>';
        this.el.trackList.dataset.empty = '1';
        this._trackRows.clear();
      }
    } else {
      this.el.trackList.dataset.empty = '0';
      const seen = new Set();
      for (const t of tracks) {
        seen.add(t.id);
        let row = this._trackRows.get(t.id);
        if (!row) {
          row = document.createElement('div');
          row.className = 'trk-row';
          row.innerHTML = '<span><span class="id"></span><span class="meta"></span></span><span class="rng"></span>';
          row.addEventListener('click', () => this._fire('selectTrack', t.id));
          if (this.el.trackList.dataset.built !== '1') {
            this.el.trackList.innerHTML = '';
            this.el.trackList.dataset.built = '1';
          }
          this.el.trackList.appendChild(row);
          this._trackRows.set(t.id, row);
        }
        row.classList.toggle('sel', t.id === radar.selectedId);
        row.classList.toggle('decoy', t.symbolKind !== 'threat');
        row.classList.toggle('engaged', t.engagedCount > 0);
        row.querySelector('.id').textContent = t.id;
        row.querySelector('.meta').textContent = ` ${t.label} · ${t.threat.phase}`;
        row.querySelector('.rng').innerHTML =
          `${fmtRange(t.range)}<small>${fmtAlt(t.altitude)} · TTI ${t.tti.toFixed(0)}s</small>`;
      }
      for (const [id, row] of [...this._trackRows.entries()]) {
        if (!seen.has(id)) { row.remove(); this._trackRows.delete(id); }
      }
      if (this.el.trackList.querySelector('.empty')) {
        this.el.trackList.querySelector('.empty').remove();
      }
    }

    // Engage bar
    const canAssign = !!lookTarget || (!!selectedTrack && !consoleOpen);
    this.el.ebAssign.classList.toggle('on', canAssign);
    const armed = selectedBattery && selectedBattery.state === BATTERY_STATE.READY
      && selectedBattery.assignedTrackId;
    this.el.ebLaunch.classList.toggle('hot', !!armed);
    this.el.ebLaunch.classList.toggle('on', !!selectedBattery?.assignedTrackId);
    this.el.ebConsole.classList.toggle('on', nearConsole);

    // Reticle / world-space prompt
    this.el.reticle.classList.toggle('locked', !!lookTarget);
    if (lookTarget) {
      const t = lookTarget;
      const key = selectedBattery?.assignedTrackId === t.id ? 'F' : 'E';
      const action = key === 'F' ? 'AUTHORIZE' : 'ASSIGN';
      this.el.prompt.innerHTML =
        `${t.id} ${t.label}<span class="sub">${fmtAlt(t.altitude)} · ${fmtRange(t.range)} · TTI ${t.tti.toFixed(0)}s</span>`
        + `<span class="key">${key}</span> ${action}`;
      this.el.prompt.classList.remove('hidden');
    } else if (nearConsole && !consoleOpen) {
      this.el.prompt.innerHTML = 'ENGAGEMENT CONSOLE<span class="key">E</span> USE';
      this.el.prompt.classList.remove('hidden');
    } else {
      this.el.prompt.classList.add('hidden');
    }

    // Console readouts
    this.el.cTrack.textContent = selectedTrack
      ? `${selectedTrack.id} ${selectedTrack.label}` : '--';
    this.el.cBat.textContent = selectedBattery
      ? `${selectedBattery.def.name} ${selectedBattery.statusLabel}` : '--';
    this.el.cSol.textContent = feasibility?.text ?? '--';
    this.el.cSol.style.color = feasibility?.ok ? 'var(--green)' : 'var(--amber)';
    this.el.btnAssign.disabled = !(selectedTrack && selectedBattery && feasibility?.ok
      && selectedBattery.state !== BATTERY_STATE.RELOAD && selectedBattery.ammo > 0);
    this.el.btnAuthorize.disabled = !(selectedBattery?.assignedTrackId && selectedBattery.canFire);
    this.el.btnStart.disabled = phase === 'inbound';
    this.el.btnStart.textContent = phase === 'inbound'
      ? 'SCENARIO RUNNING' : 'START BALLISTIC MISSILES';
    this.el.scopeMode.textContent = phase === 'inbound' ? 'TRACK' : 'SEARCH';

    for (const btn of this.el.condSeg.querySelectorAll('[data-cond]')) {
      btn.classList.toggle('on', btn.dataset.cond === condition);
    }
    for (const btn of this.el.scenSeg.querySelectorAll('[data-scen]')) {
      btn.classList.toggle('on', btn.dataset.scen === scenario);
    }

    // Scopes
    const scopeOpts = {
      batteries, interceptors, condition,
      selectedBatteryId: selectedBattery?.def.id ?? null,
    };
    if (consoleOpen) this.scope.draw(radar, null, scopeOpts);
    this.mini.draw(radar, null, scopeOpts);
    this.el.mrRange.textContent = `RNG ${(this.mini.displayRange / 1000).toFixed(0)} KM`;
  }

  setConsoleStatus(text) {
    this.el.consoleStatus.textContent = text;
  }

  setHudScale(scale) {
    document.documentElement.style.setProperty('--hud-scale', String(scale));
  }
}
