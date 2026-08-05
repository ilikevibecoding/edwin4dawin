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
    this.threats.innerHTML = `<h3><span>THREAT BOARD</span><span class="dim" data-count>0</span></h3><div data-list></div>`;
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
        <div class="row"><span class="name" style="color:${b.accent}">${b.short}</span><span data-state>READY</span></div>
        <div class="row dim"><span data-code>${b.codeName}</span><span class="pips" data-ammo></span></div>
        <div class="bar"><i data-bar></i></div>`;
      this.batteryList.appendChild(row);
      this.batteryRows[b.id] = {
        row,
        stateEl: row.querySelector('[data-state]'),
        ammoEl: row.querySelector('[data-ammo]'),
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
          <span class="dim">Mouse look after clicking &middot; <span class="kbd">WASD</span> move &middot; <span class="kbd">SHIFT</span> sprint &middot; <span class="kbd">E</span> assign &middot; <span class="kbd">F</span> authorize</span>
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
      <div class="card">
        <h1 data-title>SCENARIO COMPLETE</h1>
        <h2 data-sub></h2>
        <div class="scores" data-scores></div>
        <h4>ENGAGEMENT RECORD</h4>
        <div data-record></div>
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
    this.bannerS.textContent = sub || '';
    this.banner.classList.add('on');
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

  setConsoleMode(on) {
    this.console.classList.toggle('on', on);
    this.engMode.textContent = on ? 'CONSOLE' : 'OBSERVE';
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
    for (const tr of tracks) {
      seen.add(tr.id);
      let row = this.threatList.querySelector(`[data-id="${tr.id}"]`);
      if (!row) {
        row = el('div', 'trk');
        row.dataset.id = tr.id;
        row.innerHTML = `<span data-id2></span><span data-cls></span><span data-alt></span><span data-spd></span>`;
        this.threatList.appendChild(row);
      }
      const decoy = tr.classified.includes('DECOY');
      row.className = `trk${tr.id === selectedId ? ' sel' : ''}${tr.id === assignedId ? ' assigned' : ''}${decoy ? ' decoy' : ''}${tr.firm ? '' : ' tentative'}`;
      row.querySelector('[data-id2]').textContent = tr.id;
      row.querySelector('[data-cls]').textContent = tr.firm ? (decoy ? 'DECOY?' : 'BALLISTIC') : 'ACQUIRING';
      row.querySelector('[data-alt]').textContent = `${fmtKm(tr.alt)}km`;
      row.querySelector('[data-spd]').textContent = `${Math.round(tr.speed)}`;
    }
    for (const row of Array.from(this.threatList.children)) {
      if (!seen.has(row.dataset.id)) row.remove();
    }
    if (!tracks.length) {
      if (!this.threatList.querySelector('.empty')) {
        const e = el('div', 'empty dim', 'NO TRACKS — SEARCH');
        this.threatList.appendChild(e);
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
      ui.stateEl.className = cls;
      ui.ammoEl.textContent = `${'|'.repeat(st.ammo)}${'.'.repeat(Math.max(0, b.ammo - st.ammo))} ${st.ammo}/${b.ammo}`;
      const frac =
        st.state === BATTERY_STATE.RELOAD ? 1 - st.timer / b.reloadTime :
        st.state === BATTERY_STATE.PREP ? 1 - st.timer / b.prepTime : 1;
      ui.barEl.style.width = `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`;
      ui.barEl.style.background = cls === 'red' ? 'var(--red)' : cls === 'amber' ? 'var(--amber)' : b.accent;
    }
  }

  updateEngagement(info) {
    const rows = [];
    rows.push(`<div class="row"><span class="dim">BATTERY</span><span style="color:${info.battery.accent}">${info.battery.label}</span></div>`);
    rows.push(`<div class="row"><span class="dim">SEL TRACK</span><span class="white">${info.selected ? info.selected.id : '—'}</span></div>`);
    rows.push(`<div class="row"><span class="dim">ASSIGNED</span><span class="amber">${info.assigned ? info.assigned.id : '—'}</span></div>`);
    if (info.window) {
      const w = info.window;
      rows.push(`<div class="row"><span class="dim">CUED INTERCEPT</span><span>${fmtKm(w.alt)}km / ${fmtKm(w.range)}km</span></div>`);
      rows.push(`<div class="row"><span class="dim">TIME TO INTERCEPT</span><span>${w.tti.toFixed(1)}s</span></div>`);
      const pct = Math.round(w.quality * 100);
      const col = w.quality > 0.7 ? 'var(--green)' : w.quality > 0.35 ? 'var(--amber)' : 'var(--red)';
      rows.push(`<div class="row"><span class="dim">SOLUTION (CUE)</span><span style="color:${col}">${pct}%</span></div>`);
      rows.push(`<div class="bar"><i style="width:${pct}%;background:${col}"></i></div>`);
      if (!w.okAlt) rows.push(`<div class="row red"><span>ALT OUTSIDE BASKET</span><span></span></div>`);
      if (!w.okRange) rows.push(`<div class="row red"><span>RANGE OUTSIDE BASKET</span><span></span></div>`);
    }
    rows.push(`<div class="row"><span class="dim">IN FLIGHT</span><span>${state.stats.inFlight}</span></div>`);
    if (info.lastResult) {
      rows.push(`<div class="row" style="margin-top:4px"><span class="dim">LAST</span><span class="${info.lastResult.cls}">${info.lastResult.text}</span></div>`);
    }
    this.engBody.innerHTML = rows.join('');
  }

  updateMission(info) {
    this.mission.innerHTML = `
      <div class="big">${info.title}</div>
      <div class="row" style="justify-content:center;gap:16px;margin-top:3px">
        <span class="dim">${info.tod}</span>
        <span>T+${info.time.toFixed(1)}s</span>
        <span class="dim">INBOUND</span><span class="${info.active > 0 ? 'red' : 'dim'}">${info.active}</span>
        <span class="dim">DOWN</span><span class="green">${info.killed}</span>
        <span class="dim">LEAK</span><span class="${info.leaks > 0 ? 'red' : 'dim'}">${info.leaks}</span>
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

  updateMarkers(items) {
    const seen = new Set();
    for (const it of items) {
      seen.add(it.key);
      let m = this.markers.get(it.key);
      if (!m) {
        m = el('div', 'marker');
        m.innerHTML = `<div class="box"></div><div class="lbl"></div>`;
        this.markerLayer.appendChild(m);
        this.markers.set(it.key, { node: m, lbl: m.querySelector('.lbl'), box: m.querySelector('.box') });
      }
      const rec = this.markers.get(it.key);
      rec.node.className = `marker ${it.cls || ''}${it.offscreen ? ' offscreen' : ''}`;
      rec.node.style.transform = `translate(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px) translate(-50%,-50%)`;
      rec.node.style.opacity = String(it.opacity !== undefined ? it.opacity : 1);
      const scale = it.scale || 1;
      rec.box.style.width = `${Math.round(26 * scale)}px`;
      rec.box.style.height = `${Math.round(26 * scale)}px`;
      if (rec.lbl.dataset.txt !== it.label) {
        rec.lbl.innerHTML = it.label;
        rec.lbl.dataset.txt = it.label;
      }
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
    card.querySelector('[data-title]').textContent = data.title;
    card.querySelector('[data-title]').style.color = data.color;
    card.querySelector('[data-sub]').textContent = data.sub;
    card.querySelector('[data-scores]').innerHTML = data.scores
      .map((s) => `<div class="score"><b>${s.value}</b><span>${s.label}</span></div>`)
      .join('');
    card.querySelector('[data-record]').innerHTML = data.record.length
      ? data.record.map((r) => `<div class="row"><span class="${r.cls}">${r.text}</span><span class="dim">${r.detail}</span></div>`).join('')
      : '<div class="row dim"><span>NO ENGAGEMENTS RECORDED</span><span></span></div>';
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
