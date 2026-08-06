// DOM heads-up display: threat board, battery status, engagement readout, world
// markers, briefing/debrief cards, console control bar, settings and subtitles.
// All gameplay-relevant state is mirrored here so the player is never guessing.

import { BATTERIES, SCENARIOS, TOD, QUALITY } from './config.js';
import { state, bus, PHASE, BATTERY_STATE } from './state.js';

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

const fmtKm = (m) => `${(m / 1000).toFixed(1)}`;

/** Rough on-screen footprint of a marker caption, used to keep them apart. */
const MARKER_LABEL_W = 104;
const MARKER_LABEL_H = 34;
const MARKER_CHIP_H = 15;

export class UI {
  constructor(root, api) {
    this.root = root;
    this.api = api;
    this.markers = new Map();
    this.logEntries = [];
    this.bannerTimer = 0;
    this.subTimer = 0;
    this.build();
    this.bind();
  }

  build() {
    const r = this.root;

    // ---- mission strip ------------------------------------------------
    this.mission = el('div', 'panel', '');
    this.mission.id = 'mission';
    r.appendChild(this.mission);

    // ---- threat board -------------------------------------------------
    this.threats = el('div', 'panel');
    this.threats.id = 'threats';
    this.threats.innerHTML = `
      <h3><span>THREAT BOARD</span><span class="dim" data-count>0 TRK</span></h3>
      <div class="thead"><span>TRACK</span><span>CLASS</span><span>ALT</span><span>SPD</span></div>
      <div data-list></div>
      <div class="key">
        <span class="k firm">RV</span><span class="k tentative">ACQ</span><span class="k decoy">DECOY</span><span class="k assigned">ASSIGNED</span>
      </div>`;
    r.appendChild(this.threats);
    this.threatList = this.threats.querySelector('[data-list]');
    this.threatCount = this.threats.querySelector('[data-count]');

    // ---- battery status ----------------------------------------------
    this.batteries = el('div', 'panel');
    this.batteries.id = 'batteries';
    this.batteries.innerHTML = `<h3><span>BATTERY STATUS</span><span class="dim">1-3 SELECT</span></h3><div data-list></div>`;
    r.appendChild(this.batteries);
    this.batteryList = this.batteries.querySelector('[data-list]');
    this.batteryRows = {};
    for (const b of BATTERIES) {
      const row = el('div', 'bat');
      row.innerHTML = `
        <div class="row top"><span class="name" style="color:${b.accent}">${b.short}</span><span class="pill" data-state>READY</span></div>
        <div class="row sub"><span class="dim">${b.codeName}</span><span data-tgt class="dim">NO TARGET</span></div>
        <div class="row sub"><span class="pips" data-ammo></span><span class="dim" data-rds></span></div>
        <div class="bar"><i data-bar></i></div>`;
      this.batteryList.appendChild(row);
      this.batteryRows[b.id] = {
        row,
        stateEl: row.querySelector('[data-state]'),
        ammoEl: row.querySelector('[data-ammo]'),
        rdsEl: row.querySelector('[data-rds]'),
        tgtEl: row.querySelector('[data-tgt]'),
        barEl: row.querySelector('[data-bar]'),
      };
    }

    // ---- engagement ---------------------------------------------------
    this.engagement = el('div', 'panel');
    this.engagement.id = 'engagement';
    this.engagement.innerHTML = `<h3><span>ENGAGEMENT</span><span class="dim" data-mode>OBSERVE</span></h3><div data-body></div>`;
    r.appendChild(this.engagement);
    this.engBody = this.engagement.querySelector('[data-body]');
    this.engMode = this.engagement.querySelector('[data-mode]');

    // ---- log ----------------------------------------------------------
    this.log = el('div', 'panel');
    this.log.id = 'log';
    this.log.innerHTML = `<h3><span>EVENT LOG</span><span class="dim">C2</span></h3><div data-list></div>`;
    r.appendChild(this.log);
    this.logList = this.log.querySelector('[data-list]');

    // ---- reticle ------------------------------------------------------
    this.reticle = el('div');
    this.reticle.id = 'reticle';
    this.reticle.innerHTML = `
      <div class="cross"></div>
      <div class="tick" style="left:50%;top:calc(50% - 16px);width:1px;height:8px;transform:translateX(-50%)"></div>
      <div class="tick" style="left:50%;top:calc(50% + 8px);width:1px;height:8px;transform:translateX(-50%)"></div>
      <div class="tick" style="top:50%;left:calc(50% - 16px);height:1px;width:8px;transform:translateY(-50%)"></div>
      <div class="tick" style="top:50%;left:calc(50% + 8px);height:1px;width:8px;transform:translateY(-50%)"></div>
      <div class="prompt"></div>`;
    r.appendChild(this.reticle);
    this.prompt = this.reticle.querySelector('.prompt');

    this.markerLayer = el('div');
    this.markerLayer.id = 'markers';
    r.appendChild(this.markerLayer);

    // ---- banner / hint / subtitles ------------------------------------
    this.banner = el('div', '', `<div class="t"></div><div class="s"></div>`);
    this.banner.id = 'banner';
    r.appendChild(this.banner);
    this.bannerT = this.banner.querySelector('.t');
    this.bannerS = this.banner.querySelector('.s');

    this.hint = el('div');
    this.hint.id = 'hint';
    r.appendChild(this.hint);

    this.subtitles = el('div');
    this.subtitles.id = 'subtitles';
    r.appendChild(this.subtitles);

    this.perf = el('div');
    this.perf.id = 'perf';
    r.appendChild(this.perf);

    // ---- console bar --------------------------------------------------
    this.console = el('div');
    this.console.id = 'console';
    const group = (label, buttons) => {
      const g = el('div', 'cgroup');
      g.appendChild(el('label', '', label));
      const wrap = el('div', 'btns');
      for (const b of buttons) wrap.appendChild(b);
      g.appendChild(wrap);
      return g;
    };
    const mk = (id, label, cls = '') => {
      const b = el('button', `hud ${cls}`.trim(), label);
      b.dataset.action = id;
      b.type = 'button';
      return b;
    };
    this.consoleButtons = {};
    const reg = (b) => {
      this.consoleButtons[b.dataset.action] = b;
      return b;
    };
    this.console.appendChild(
      group(
        'CONDITIONS',
        Object.keys(TOD).map((k) => reg(mk(`tod:${k}`, TOD[k].label)))
      )
    );
    this.console.appendChild(
      group(
        'SCENARIO',
        SCENARIOS.map((s) => reg(mk(`scenario:${s.id}`, s.label)))
      )
    );
    this.console.appendChild(
      group(
        'BATTERY',
        BATTERIES.map((b) => reg(mk(`battery:${b.id}`, b.short)))
      )
    );
    this.console.appendChild(
      group('TRACK', [reg(mk('track:next', 'NEXT')), reg(mk('assign', 'ASSIGN', 'go'))])
    );
    this.console.appendChild(
      group('FIRE CONTROL', [reg(mk('authorize', 'AUTHORIZE LAUNCH', 'danger')), reg(mk('start', 'START BALLISTIC MISSILES', 'danger big'))])
    );
    r.appendChild(this.console);

    // ---- briefing overlay --------------------------------------------
    this.briefing = el('div', 'overlay');
    this.briefing.id = 'briefing';
    this.briefing.innerHTML = `
      <div class="card">
        <h1>AEGIS RIDGE</h1>
        <h2>FICTIONAL AIR-DEFENCE DEMONSTRATOR &middot; ENTERTAINMENT USE ONLY</h2>
        <p>You are the duty controller at a fictional interceptor site. Walk the pad, inspect the launchers,
        then take the console in the C2 shelter, start the scenario, track the inbounds and commit rounds.
        Every performance figure in this demo is invented and balanced for spectacle.</p>
        <h4>CONDITIONS</h4>
        <div class="opts" data-tod></div>
        <h4>THREAT SCENARIO</h4>
        <div class="opts" data-scn></div>
        <h4>PRIMARY BATTERY</h4>
        <div class="opts" data-bat></div>
        <div class="actions">
          <button class="hud go big" data-action="deploy">DEPLOY TO SITE</button>
          <button class="hud" data-action="settings">SETTINGS</button>
        </div>
        <div class="keys">
          <span><span class="kbd">WASD</span> move</span>
          <span><span class="kbd">SHIFT</span> sprint</span>
          <span><span class="kbd">Q</span> take console</span>
          <span><span class="kbd">E</span> assign</span>
          <span><span class="kbd">F</span> authorize</span>
          <span><span class="kbd">TAB</span> next track</span>
          <span><span class="kbd">1-3</span> battery</span>
          <span><span class="kbd">R</span> start wave</span>
        </div>
      </div>`;
    r.appendChild(this.briefing);
    this.todOpts = this.briefing.querySelector('[data-tod]');
    this.scnOpts = this.briefing.querySelector('[data-scn]');
    this.batOpts = this.briefing.querySelector('[data-bat]');
    for (const k of Object.keys(TOD)) {
      const b = el('button', 'hud opt', `<span class="t">${TOD[k].label}</span><span class="d">${k === 'day' ? 'High visibility, hard shadows.' : k === 'sunset' ? 'Long shadows, heavy haze, orange sky.' : 'Searchlights, star field, muzzle glare.'}</span>`);
      b.dataset.action = `tod:${k}`;
      this.todOpts.appendChild(b);
    }
    for (const s of SCENARIOS) {
      const b = el('button', 'hud opt', `<span class="t">${s.label}</span><span class="d">${s.desc}</span>`);
      b.dataset.action = `scenario:${s.id}`;
      this.scnOpts.appendChild(b);
    }
    for (const b0 of BATTERIES) {
      const b = el('button', 'hud opt', `<span class="t" style="color:${b0.accent}">${b0.label}</span><span class="d">${b0.desc} ${b0.ammo} rounds.</span>`);
      b.dataset.action = `battery:${b0.id}`;
      this.batOpts.appendChild(b);
    }

    // ---- debrief overlay ---------------------------------------------
    this.debrief = el('div', 'overlay');
    this.debrief.id = 'debrief';
    this.debrief.innerHTML = `
      <div class="card outcome">
        <div class="ribbon"></div>
        <h1 data-title>SCENARIO COMPLETE</h1>
        <h2 data-sub></h2>
        <div class="scores" data-scores></div>
        <h4>ENGAGEMENT RECORD</h4>
        <div class="record" data-record></div>
        <div class="actions">
          <button class="hud go big" data-action="restart">RESTART SCENARIO</button>
          <button class="hud" data-action="briefing">CHANGE SETUP</button>
          <button class="hud" data-action="walk">WALK THE SITE</button>
        </div>
      </div>`;
    r.appendChild(this.debrief);

    // ---- settings overlay --------------------------------------------
    this.settings = el('div', 'overlay');
    this.settings.id = 'settings';
    this.settings.innerHTML = `
      <div class="card">
        <h1>SETTINGS</h1>
        <h2>ACCESSIBILITY &amp; PERFORMANCE</h2>
        <div class="set-row"><span>Reduced motion (no head bob, damped shake)</span><button class="hud" data-action="toggle:reducedMotion">OFF</button></div>
        <div class="set-row"><span>Audio cue subtitles</span><button class="hud" data-action="toggle:subtitles">ON</button></div>
        <div class="set-row"><span>Master volume</span><input type="range" min="0" max="1" step="0.05" data-action="volume"></div>
        <div class="set-row"><span>Quality preset</span><span data-quality></span></div>
        <div class="set-row"><span>Performance overlay</span><button class="hud" data-action="toggle:perf">OFF</button></div>
        <div class="actions"><button class="hud go" data-action="closeSettings">CLOSE</button></div>
      </div>`;
    r.appendChild(this.settings);
    const qWrap = this.settings.querySelector('[data-quality]');
    for (const k of Object.keys(QUALITY)) {
      const b = el('button', 'hud', QUALITY[k].label);
      b.dataset.action = `quality:${k}`;
      qWrap.appendChild(b);
    }
    this.volume = this.settings.querySelector('[data-action="volume"]');
    this.volume.value = String(state.masterVolume);
  }

  bind() {
    this.root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      this.api.action(btn.dataset.action);
    });
    this.volume.addEventListener('input', () => this.api.action('volume', Number(this.volume.value)));
    bus.on('message', (m) => this.pushLog(m));
    bus.on('audioCue', ({ text }) => this.showSubtitle(text));
  }

  /* ---------------------------------------------------------------- log */

  pushLog(m) {
    const kind = m.kind === 'warn' ? 'warn' : m.kind === 'bad' ? 'bad' : m.kind === 'good' ? 'good' : '';
    const e = el('div', `entry ${kind}`.trim(), `<span class="dim">${m.t.toFixed(1).padStart(5, '0')}</span> ${m.text}`);
    this.logList.appendChild(e);
    while (this.logList.children.length > 10) this.logList.removeChild(this.logList.firstChild);
  }

  showSubtitle(text) {
    this.subtitles.textContent = text;
    this.subtitles.classList.add('on');
    this.subTimer = 2.6;
  }

  showBanner(title, sub, color = '#eafffb', seconds = 2.8) {
    this.bannerT.textContent = title;
    this.bannerT.style.color = color;
    this.banner.style.setProperty('--bc', color);
    this.bannerS.textContent = sub || '';
    this.banner.classList.add('on');
    // Restart the sweep-in so back-to-back results still register as new.
    this.banner.classList.remove('pop');
    void this.banner.offsetWidth;
    this.banner.classList.add('pop');
    this.bannerTimer = seconds;
  }

  /* --------------------------------------------------------------- panels */

  setOverlay(name) {
    for (const [key, node] of [
      ['briefing', this.briefing],
      ['debrief', this.debrief],
      ['settings', this.settings],
    ]) {
      node.classList.toggle('on', key === name);
    }
    this.overlay = name;
  }

  /**
   * At the console the in-world hardware is the interface, so the overlay steps
   * back: `#hud.docked` in the stylesheet retires the panels the two screens
   * already carry and packs the rest into the margins the console leaves free.
   */
  setConsoleMode(on) {
    this.console.classList.toggle('on', on);
    this.root.classList.toggle('docked', on);
    if (this.engMode) this.engMode.textContent = on ? 'CONSOLE' : 'OBSERVE';
  }

  updateSelections() {
    const map = {
      [`tod:${state.todId}`]: true,
      [`scenario:${state.scenarioId}`]: true,
      [`battery:${state.selectedBatteryId}`]: true,
      [`quality:${state.quality}`]: true,
    };
    for (const b of this.root.querySelectorAll('[data-action]')) {
      const a = b.dataset.action;
      if (a.startsWith('tod:') || a.startsWith('scenario:') || a.startsWith('battery:') || a.startsWith('quality:')) {
        b.classList.toggle('on', !!map[a]);
      }
    }
    const rm = this.root.querySelector('[data-action="toggle:reducedMotion"]');
    if (rm) {
      rm.textContent = state.reducedMotion ? 'ON' : 'OFF';
      rm.classList.toggle('on', state.reducedMotion);
    }
    const sub = this.root.querySelector('[data-action="toggle:subtitles"]');
    if (sub) {
      sub.textContent = state.subtitles ? 'ON' : 'OFF';
      sub.classList.toggle('on', state.subtitles);
    }
    const pf = this.root.querySelector('[data-action="toggle:perf"]');
    if (pf) {
      pf.textContent = this.perf.classList.contains('on') ? 'ON' : 'OFF';
      pf.classList.toggle('on', this.perf.classList.contains('on'));
    }
    this.root.classList.toggle('reduced', state.reducedMotion);
  }

  updateThreats(tracks, selectedId, assignedId) {
    this.threatCount.textContent = `${tracks.length} TRK`;
    const seen = new Set();
    // Closest first: the board should read top-down as "deal with this next".
    const ordered = tracks.slice().sort((a, b) => a.range - b.range);
    ordered.forEach((tr, i) => {
      seen.add(tr.id);
      let row = this.threatList.querySelector(`[data-id="${tr.id}"]`);
      if (!row) {
        row = el('div', 'trk');
        row.dataset.id = tr.id;
        row.innerHTML = `<span class="tid" data-id2></span><span class="tcls" data-cls></span><span class="num" data-alt></span><span class="num" data-spd></span>`;
        this.threatList.appendChild(row);
      }
      if (this.threatList.children[i] !== row) this.threatList.insertBefore(row, this.threatList.children[i] || null);
      const decoy = tr.classified.includes('DECOY');
      const kind = !tr.firm ? 'tentative' : decoy ? 'decoy' : 'firm';
      row.className = `trk ${kind}${tr.id === selectedId ? ' sel' : ''}${tr.id === assignedId ? ' assigned' : ''}`;
      row.querySelector('[data-id2]').textContent = tr.id;
      row.querySelector('[data-cls]').textContent = tr.firm
        ? decoy
          ? 'DECOY'
          : tr.ambiguous
            ? 'RV UNRESOLVED'
            : 'BALLISTIC RV'
        : 'ACQUIRING';
      row.querySelector('[data-alt]').textContent = `${fmtKm(tr.alt)}km`;
      row.querySelector('[data-spd]').textContent = `${Math.round(tr.speed)}`;
    });
    for (const row of Array.from(this.threatList.children)) {
      if (!seen.has(row.dataset.id)) row.remove();
    }
    if (!tracks.length) {
      if (!this.threatList.querySelector('.empty')) {
        this.threatList.appendChild(el('div', 'empty dim', 'NO TRACKS \u2014 SEARCHING'));
      }
    } else {
      const e = this.threatList.querySelector('.empty');
      if (e) e.remove();
    }
  }

  updateBatteries() {
    for (const b of BATTERIES) {
      const st = state.batteries[b.id];
      const ui = this.batteryRows[b.id];
      ui.row.classList.toggle('sel', b.id === state.selectedBatteryId);
      ui.row.style.setProperty('--accent', b.accent);
      let label = st.state;
      let cls = 'green';
      if (st.state === BATTERY_STATE.RELOAD) {
        label = `RELOAD ${st.timer.toFixed(1)}s`;
        cls = 'amber';
      } else if (st.state === BATTERY_STATE.PREP) {
        label = st.timer > 0 ? `PREP ${st.timer.toFixed(1)}s` : 'READY TO FIRE';
        cls = st.timer > 0 ? 'amber' : 'green';
      } else if (st.state === BATTERY_STATE.EXPENDED) {
        label = 'EXPENDED';
        cls = 'red';
      }
      ui.stateEl.textContent = label;
      ui.stateEl.className = `pill ${cls}`;
      ui.ammoEl.innerHTML = Array.from({ length: b.ammo }, (_, i) => `<i class="${i < st.ammo ? 'on' : ''}"></i>`).join('');
      ui.rdsEl.textContent = `${st.ammo}/${b.ammo} RDS`;
      ui.rdsEl.className = st.ammo ? 'dim' : 'red';
      ui.tgtEl.textContent = st.assignedTrackId ? `\u25B6 ${st.assignedTrackId}` : 'NO TARGET';
      ui.tgtEl.className = st.assignedTrackId ? 'amber' : 'dim';
      const frac =
        st.state === BATTERY_STATE.RELOAD ? 1 - st.timer / b.reloadTime :
        st.state === BATTERY_STATE.PREP ? 1 - st.timer / b.prepTime : 1;
      ui.barEl.style.width = `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`;
      ui.barEl.style.background = cls === 'red' ? 'var(--red)' : cls === 'amber' ? 'var(--amber)' : b.accent;
    }
  }

  updateEngagement(info) {
    const w = info.window;
    const sel = info.selected;
    const bstate = state.batteries[info.battery.id];
    const ready = bstate && bstate.ammo > 0 && bstate.state !== BATTERY_STATE.RELOAD;

    // Headline: one line that answers "can I shoot, and at what".
    let verdict = 'NO TRACK SELECTED';
    let vcls = 'idle';
    if (info.assigned) {
      verdict = ready ? `CLEARED \u2014 AUTHORIZE ${info.assigned.id}` : 'BATTERY NOT READY';
      vcls = ready ? 'go' : 'warn';
    } else if (sel && w) {
      if (!w.okAlt || !w.okRange) {
        verdict = 'OUT OF BASKET';
        vcls = 'bad';
      } else if (!ready) {
        verdict = 'BATTERY NOT READY';
        vcls = 'warn';
      } else {
        verdict = `ASSIGN ${sel.id} TO ${info.battery.short}`;
        vcls = 'go';
      }
    }

    const rows = [];
    rows.push(`<div class="verdict ${vcls}">${verdict}</div>`);
    rows.push(`<div class="grid2">
      <div><label>SELECTED</label><b class="white">${sel ? sel.id : '\u2014\u2014'}</b><span class="dim">${sel ? (sel.firm ? sel.classified : 'ACQUIRING') : 'none'}</span></div>
      <div><label>ASSIGNED</label><b class="amber">${info.assigned ? info.assigned.id : '\u2014\u2014'}</b><span class="dim">${info.assigned ? 'ready to commit' : 'no commitment'}</span></div>
    </div>`);
    rows.push(
      `<div class="row"><span class="dim">BATTERY</span><span style="color:${info.battery.accent}">${info.battery.label}</span></div>`
    );
    if (w) {
      const pct = Math.round(w.quality * 100);
      const col = w.quality > 0.7 ? 'var(--green)' : w.quality > 0.35 ? 'var(--amber)' : 'var(--red)';
      rows.push(`<div class="row"><span class="dim">CUED INTERCEPT</span><span>${fmtKm(w.alt)}km ALT / ${fmtKm(w.range)}km OUT</span></div>`);
      rows.push(`<div class="row"><span class="dim">TIME TO INTERCEPT</span><span class="white">${w.tti.toFixed(1)}s</span></div>`);
      rows.push(`<div class="row"><span class="dim">SOLUTION (CUE)</span><span style="color:${col}">${pct}%</span></div>`);
      rows.push(`<div class="bar"><i style="width:${pct}%;background:${col}"></i></div>`);
      if (!w.okAlt) rows.push(`<div class="flag red">ALT OUTSIDE ${info.battery.short} BASKET</div>`);
      if (!w.okRange) rows.push(`<div class="flag red">RANGE OUTSIDE ${info.battery.short} BASKET</div>`);
    }
    rows.push(
      `<div class="row"><span class="dim">INTERCEPTORS IN FLIGHT</span><span class="${state.stats.inFlight ? 'amber' : 'dim'}">${state.stats.inFlight}</span></div>`
    );
    if (info.lastResult) {
      rows.push(
        `<div class="last ${info.lastResult.cls}"><label>LAST ENGAGEMENT</label><b>${info.lastResult.text}</b><span>${info.lastResult.detail || ''}</span></div>`
      );
    }
    this.engBody.innerHTML = rows.join('');
  }

  updateMission(info) {
    this.mission.innerHTML = `
      <div class="big">${info.title}</div>
      <div class="strip">
        <span class="tag">${info.tod}</span>
        <span class="tag">T+${info.time.toFixed(1)}s</span>
        <span class="stat ${info.active > 0 ? 'red' : ''}"><b>${info.active}</b><i>INBOUND</i></span>
        <span class="stat ${info.killed > 0 ? 'green' : ''}"><b>${info.killed}</b><i>DOWN</i></span>
        <span class="stat ${info.leaks > 0 ? 'red' : ''}"><b>${info.leaks}</b><i>LEAKERS</i></span>
      </div>`;
  }

  setHint(text) {
    this.hint.innerHTML = text;
  }

  setPrompt(text) {
    if (text) {
      this.prompt.innerHTML = text;
      this.prompt.classList.add('on');
    } else {
      this.prompt.classList.remove('on');
    }
  }

  updatePerf(p) {
    this.perf.innerHTML = `
      FPS ${p.fps.toFixed(0)}<br>
      FRAME ${p.frameMs.toFixed(2)}ms<br>
      SIM ${p.cpuMs.toFixed(2)}ms<br>
      DRAW ${p.drawCalls}<br>
      TRIS ${(p.triangles / 1000).toFixed(0)}k<br>
      PARTS ${p.particles}<br>
      SCALE ${(p.scale * 100).toFixed(0)}%`;
  }

  /* --------------------------------------------------------- 3D markers */

  /**
   * World-space target markers. The caller supplies a `<br>`-joined label; the
   * first line becomes a solid ID chip so it survives a bright sky, and the
   * remainder becomes a smaller readout under the symbol.
   */
  updateMarkers(items) {
    const seen = new Set();
    // Nearest first — marker scale falls off with range, so it stands in for
    // depth — which lets the closest track keep the uncluttered slot.
    const ordered = items.slice().sort((a, b) => (b.scale || 1) - (a.scale || 1));
    const placed = [];
    for (const it of ordered) {
      seen.add(it.key);
      let rec = this.markers.get(it.key);
      if (!rec) {
        const m = el('div', 'marker');
        m.innerHTML = `<div class="sym"><i></i></div><div class="lbl"><b class="id"></b><span class="ro"></span></div>`;
        this.markerLayer.appendChild(m);
        rec = { node: m, lbl: m.querySelector('.lbl'), id: m.querySelector('.id'), ro: m.querySelector('.ro'), sym: m.querySelector('.sym') };
        this.markers.set(it.key, rec);
      }
      const cls = it.cls || '';
      const kind = cls.includes('inter') ? 'inter' : cls.includes('assigned') ? 'assigned' : cls.includes('decoy') ? 'decoy' : cls.includes('tentative') ? 'tentative' : 'firm';
      rec.node.className = `marker ${kind}${cls.includes('tentative') && kind !== 'tentative' ? ' tentative' : ''}${it.offscreen ? ' offscreen' : ''}`;
      rec.node.style.transform = `translate(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px) translate(-50%,-50%)`;
      rec.node.style.opacity = String(it.opacity !== undefined ? it.opacity : 1);
      const size = Math.round(24 * (it.scale || 1));
      rec.sym.style.width = `${size}px`;
      rec.sym.style.height = `${size}px`;
      if (rec.lbl.dataset.txt !== it.label) {
        rec.lbl.dataset.txt = it.label;
        const parts = String(it.label).split(/<br\s*\/?>/i);
        rec.id.textContent = parts[0] || '';
        rec.ro.innerHTML = parts.slice(1).join('<br>');
      }

      // Two inbounds on a similar bearing interleave their readouts into one
      // unreadable block. Slide the caption clear if there is room below, and
      // if there is not, drop the readout and keep the identity chip: knowing
      // which track is which matters more than its altitude to a tenth.
      const half = size / 2;
      let top = it.y + half + 9;
      let height = MARKER_LABEL_H;
      let terse = false;
      for (let pass = 0; pass < 3; pass++) {
        const hit = placed.find(
          (p) => Math.abs(p.x - it.x) < MARKER_LABEL_W && top < p.bottom && top + height > p.top
        );
        if (!hit) break;
        if (pass < 2) {
          top = hit.bottom + 3;
        } else {
          terse = true;
          height = MARKER_CHIP_H;
        }
      }
      rec.lbl.style.marginTop = `${Math.round(top - it.y - half)}px`;
      rec.node.classList.toggle('terse', terse);
      placed.push({ x: it.x, top, bottom: top + height });
    }
    for (const [key, rec] of this.markers) {
      if (!seen.has(key)) {
        rec.node.remove();
        this.markers.delete(key);
      }
    }
  }

  showDebrief(data) {
    const card = this.debrief.querySelector('.card');
    const title = card.querySelector('[data-title]');
    title.textContent = data.title;
    title.style.color = data.color;
    card.style.setProperty('--outcome', data.color);
    card.querySelector('[data-sub]').textContent = data.sub;
    card.querySelector('[data-scores]').innerHTML = data.scores
      .map((s, i) => `<div class="score${i === 1 ? ' hero' : ''}"><b>${s.value}</b><span>${s.label}</span></div>`)
      .join('');
    card.querySelector('[data-record]').innerHTML = data.record.length
      ? data.record
          .map(
            (r, i) =>
              `<div class="rec ${r.cls}"><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="verdict">${r.text}</span><span class="detail">${r.detail}</span></div>`
          )
          .join('')
      : '<div class="rec"><span class="n">\u2014</span><span class="verdict dim">NO ENGAGEMENTS RECORDED</span><span class="detail dim">no rounds were committed</span></div>';
    this.setOverlay('debrief');
  }

  tick(dt) {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.banner.classList.remove('on');
    }
    if (this.subTimer > 0) {
      this.subTimer -= dt;
      if (this.subTimer <= 0) this.subtitles.classList.remove('on');
    }
  }

  setConsoleEnabled(map) {
    for (const [action, enabled] of Object.entries(map)) {
      const b = this.consoleButtons[action];
      if (b) b.disabled = !enabled;
    }
  }

  togglePerf() {
    this.perf.classList.toggle('on');
    this.updateSelections();
  }
}
