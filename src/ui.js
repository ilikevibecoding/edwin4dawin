// DOM HUD + command console overlay + menu + summary. Reads game state via
// ctx; writes user intent through the handlers object provided by main.js.
import * as THREE from 'three';

const _v = new THREE.Vector3();
const _fwd = new THREE.Vector3();

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(ctx, handlers) {
    this.ctx = ctx;
    this.h = handlers;
    this.els = {
      hud: $('hud'), menu: $('menu'), consoleUi: $('console-ui'), summary: $('summary'),
      fade: $('fade'),
      scenario: $('hud-scenario'), threats: $('hud-threats'), tracked: $('hud-tracked'),
      birds: $('hud-birds'), condition: $('hud-condition'),
      batteries: $('hud-batteries'), feed: $('hud-feed'),
      selbat: $('hud-selbat'), assign: $('hud-assign'), flight: $('hud-flight'),
      targetPrompt: $('target-prompt'), tpId: $('tp-id'), tpInfo: $('tp-info'), tpKeys: $('tp-keys'),
      markers: $('markers'), banner: $('alert-banner'), objective: $('objective'),
      interact: $('interact-prompt'), ipText: $('ip-text'), damage: $('damage-flash'),
      trackinfo: $('console-trackinfo'), consoleMsg: $('console-msg'),
      batStatus: $('console-batstatus'),
      btnAssign: $('btn-assign'), btnAuthorize: $('btn-authorize'), btnStart: $('btn-start'),
      summaryGrade: $('summary-grade'), summaryStats: $('summary-stats'), summaryLog: $('summary-log'),
    };
    this.markerPool = [];
    for (let i = 0; i < 14; i++) {
      const m = document.createElement('div');
      m.className = 'mark hidden';
      m.innerHTML = '<div class="diamond"></div><div class="arrow hidden"></div><div class="mlabel"></div>';
      this.els.markers.appendChild(m);
      this.markerPool.push(m);
    }
    this.batCards = new Map();
    this.bannerTimer = null;
    this.feedCount = 0;

    this._wire();
  }

  _wire() {
    const h = this.h;
    $('btn-deploy').addEventListener('click', () => h.onDeploy());
    $('btn-exit-console').addEventListener('click', () => h.onExitConsole());
    $('btn-restart').addEventListener('click', () => h.onRestart());
    $('btn-close-summary').addEventListener('click', () => h.onCloseSummary());
    this.els.btnAssign.addEventListener('click', () => h.onAssign());
    this.els.btnAuthorize.addEventListener('click', () => h.onAuthorize());
    this.els.btnStart.addEventListener('click', () => h.onStart());
    document.querySelectorAll('#time-btns .cbtn').forEach(b =>
      b.addEventListener('click', () => h.onSelectTime(b.dataset.time)));
    document.querySelectorAll('#scenario-btns .cbtn').forEach(b =>
      b.addEventListener('click', () => h.onSelectScenario(b.dataset.scenario)));
    document.querySelectorAll('#battery-btns .cbtn').forEach(b =>
      b.addEventListener('click', () => h.onSelectBattery(b.dataset.battery)));
    $('radar-canvas').addEventListener('click', (e) => {
      const rect = e.target.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * e.target.width;
      const y = (e.clientY - rect.top) / rect.height * e.target.height;
      h.onRadarClick(x, y);
    });
    $('opt-reduced-motion').addEventListener('change', (e) => h.onReducedMotion(e.target.checked));
    $('opt-audio').addEventListener('change', (e) => h.onAudioToggle(e.target.checked));
    $('opt-quality').addEventListener('change', (e) => h.onQuality(e.target.value));
  }

  // ---------------- shell
  clearFade() { this.els.fade.classList.add('clear'); }
  showMenu() { this.els.menu.classList.remove('hidden'); this.els.hud.classList.add('hidden'); }
  hideMenu() { this.els.menu.classList.add('hidden'); this.els.hud.classList.remove('hidden'); }

  enterConsole() { this.els.consoleUi.classList.remove('hidden'); }
  exitConsole() { this.els.consoleUi.classList.add('hidden'); }
  get consoleOpen() { return !this.els.consoleUi.classList.contains('hidden'); }

  setActive(groupId, dataKey, value) {
    document.querySelectorAll(`#${groupId} .cbtn`).forEach(b => {
      b.classList.toggle('active', b.dataset[dataKey] === value);
    });
  }

  consoleMsg(text, deny = false) {
    this.els.consoleMsg.textContent = text;
    this.els.consoleMsg.style.color = deny ? 'var(--red)' : 'var(--cyan)';
    clearTimeout(this._cmT);
    this._cmT = setTimeout(() => { this.els.consoleMsg.textContent = ''; }, 3200);
  }

  // ---------------- feed / banner / prompts
  feed(msg, cls = 'info') {
    const div = document.createElement('div');
    div.className = `feed-item ${cls}`;
    div.textContent = msg;
    this.els.feed.prepend(div);
    while (this.els.feed.children.length > 6) this.els.feed.lastChild.remove();
    setTimeout(() => { div.style.opacity = '0'; div.style.transition = 'opacity 0.6s'; }, 6200);
    setTimeout(() => div.remove(), 7000);
  }

  banner(text, cls = 'good', sub = '', dur = 2.6) {
    const b = this.els.banner;
    b.className = cls;
    b.innerHTML = text + (sub ? `<span class="sub">${sub}</span>` : '');
    b.classList.remove('hidden');
    clearTimeout(this.bannerTimer);
    if (dur > 0) this.bannerTimer = setTimeout(() => b.classList.add('hidden'), dur * 1000);
  }

  hideBanner() { this.els.banner.classList.add('hidden'); }

  setObjective(text) {
    if (!text) { this.els.objective.classList.add('hidden'); return; }
    this.els.objective.textContent = text;
    this.els.objective.classList.remove('hidden');
  }

  showInteract(label) {
    this.els.ipText.textContent = label;
    this.els.interact.classList.remove('hidden');
  }
  hideInteract() { this.els.interact.classList.add('hidden'); }

  showTargetPrompt(track, engage, batShort = '') {
    this.els.targetPrompt.classList.remove('hidden');
    this.els.tpId.textContent = `${track.id} — ${track.classification}`;
    const rng = Math.hypot(track.est.x, track.est.z) / 1000;
    let info = `RNG ${rng.toFixed(1)}km  ALT ${(track.est.y / 1000).toFixed(1)}km`;
    if (engage) info += engage.ok ? '  ● IN WINDOW' : `  ✕ ${engage.reason}`;
    this.els.tpInfo.textContent = info;
    this.els.tpInfo.style.color = engage && !engage.ok ? 'var(--red)' : 'var(--grn-dim)';
    this.els.tpKeys.innerHTML = `<span class="key">E</span> ASSIGN${batShort ? ' → ' + batShort : ''} <span class="key">F</span> LAUNCH`;
  }
  hideTargetPrompt() { this.els.targetPrompt.classList.add('hidden'); }

  damageFlash() {
    this.els.damage.style.opacity = '1';
    setTimeout(() => { this.els.damage.style.opacity = '0'; }, 160);
  }

  // ---------------- HUD refresh (called ~10 Hz)
  updateHUD(game) {
    const { threats, radar, interceptors, batteries } = this.ctx;
    const scen = threats.scenario;
    this.els.scenario.textContent = scen ? `${scen.name} — LIVE` : 'STANDBY';
    const totalIncoming = threats.aliveCount + threats.pendingCount;
    this.els.threats.textContent = String(totalIncoming);
    this.els.threats.className = 'val ' + (totalIncoming > 0 ? 'warn' : 'ok');
    this.els.tracked.textContent = String(radar.tracks.length);
    this.els.birds.textContent = String(interceptors.inFlight);
    const cond = game.conditionState;
    this.els.condition.textContent = cond;
    this.els.condition.className = 'val ' + (cond === 'GREEN' ? 'ok' : cond === 'AMBER' ? 'warn' : 'bad');

    // battery cards
    for (const b of batteries.list) {
      const st = b.status();
      let card = this.batCards.get(st.id);
      if (!card) {
        card = document.createElement('div');
        card.className = 'bat-card';
        card.innerHTML = `
          <div class="bat-head"><span class="bat-name"></span><span class="bat-state"></span></div>
          <div class="bat-ammo"></div>
          <div class="bat-assigned"></div>`;
        this.els.batteries.appendChild(card);
        this.batCards.set(st.id, card);
      }
      card.classList.toggle('selected', game.selectedBattery === st.id);
      card.querySelector('.bat-name').textContent = `[${st.id === 'patriot' ? '1' : st.id === 'thaad' ? '2' : '3'}] ${st.name}`;
      const stEl = card.querySelector('.bat-state');
      let stateText = st.state;
      if (st.state === 'CYCLING' || st.state === 'RELOADING') stateText += ` ${Math.ceil(st.timer)}s`;
      stEl.textContent = stateText;
      stEl.className = 'bat-state ' + st.state.toLowerCase();
      const ammoEl = card.querySelector('.bat-ammo');
      if (ammoEl.children.length !== st.ammoMax) {
        ammoEl.innerHTML = '';
        for (let i = 0; i < st.ammoMax; i++) ammoEl.appendChild(document.createElement('i'));
      }
      [...ammoEl.children].forEach((pip, i) => pip.classList.toggle('spent', i >= st.ammo));
      card.querySelector('.bat-assigned').textContent = st.assigned ? `ASSIGNED: ${st.assigned}` : '';
    }

    // bottom bar
    const sel = batteries.get(game.selectedBattery);
    this.els.selbat.textContent = `BTRY: ${sel ? sel.def.short : '—'}`;
    this.els.assign.textContent = `ASSIGNED: ${sel && sel.assigned ? sel.assigned : '—'}`;
    const inFlight = interceptors.inFlight;
    this.els.flight.textContent = inFlight > 0 ? `● ${inFlight} INTERCEPTOR${inFlight > 1 ? 'S' : ''} IN FLIGHT` : '';

    // console panels (if open)
    if (this.consoleOpen) this._updateConsole(game);
  }

  _updateConsole(game) {
    const { radar, batteries } = this.ctx;
    this.els.btnStart.textContent = this.ctx.threats.scenario ? 'RESTART SCENARIO' : 'START BALLISTIC MISSILES';
    // battery status lines
    let lines = '';
    for (const b of batteries.list) {
      const st = b.status();
      lines += `${st.short.padEnd(6)} ${st.state.padEnd(10)} ${st.ammo}/${st.ammoMax} RDS${st.assigned ? '  → ' + st.assigned : ''}\n`;
    }
    this.els.batStatus.textContent = lines;

    // selected track panel
    const t = radar.selected;
    const sel = batteries.get(game.selectedBattery);
    if (!t) {
      this.els.trackinfo.textContent = 'NO TRACK SELECTED\nCLICK A CONTACT ON THE SCOPE';
      this.els.btnAssign.disabled = true;
      this.els.btnAuthorize.disabled = !sel || !sel.assigned || !sel.ready;
    } else {
      const rng = Math.hypot(t.est.x, t.est.z) / 1000;
      const spd = t.vel.length();
      let info = `TRACK ${t.id}  [${t.classification}]\n`;
      info += `RNG ${rng.toFixed(1)}km  ALT ${(t.est.y / 1000).toFixed(1)}km  SPD ${Math.round(spd)}m/s\n`;
      if (sel) {
        const chk = sel.engagementCheck(t);
        info += chk.ok
          ? `${sel.def.short}: IN WINDOW — PREDICTED INTERCEPT ${(chk.sol.point.y / 1000).toFixed(1)}km`
          : `${sel.def.short}: ${chk.reason}`;
      }
      this.els.trackinfo.textContent = info;
      this.els.btnAssign.disabled = !sel;
      this.els.btnAuthorize.disabled = !sel || !sel.assigned || !sel.ready;
    }
  }

  // ---------------- world-space markers (every frame)
  updateMarkers(camera, game) {
    const { radar, batteries } = this.ctx;
    const w = window.innerWidth, h = window.innerHeight;
    camera.getWorldDirection(_fwd);
    let i = 0;
    for (const t of radar.tracks) {
      if (i >= this.markerPool.length) break;
      const m = this.markerPool[i++];
      _v.copy(t.threat.pos);
      const toTarget = _v.clone().sub(camera.position).normalize();
      const behind = toTarget.dot(_fwd) < 0.02;
      _v.project(camera);
      const assigned = !!t.assignedBy;
      const decoy = t.classification === 'DECOY PROBABLE';
      m.className = `mark${assigned ? ' assigned' : ''}${decoy ? ' decoy' : ''}`;
      const diamond = m.children[0], arrow = m.children[1], label = m.children[2];
      if (!behind && Math.abs(_v.x) < 0.98 && Math.abs(_v.y) < 0.98) {
        const x = (_v.x * 0.5 + 0.5) * w, y = (-_v.y * 0.5 + 0.5) * h;
        m.style.left = `${x.toFixed(1)}px`;
        m.style.top = `${y.toFixed(1)}px`;
        diamond.classList.remove('hidden');
        arrow.classList.add('hidden');
        const rngKm = camera.position.distanceTo(t.threat.pos) / 1000;
        label.textContent = `${t.id} ${rngKm.toFixed(1)}km`;
      } else {
        // edge arrow
        m.classList.add('edge');
        let ex = _v.x, ey = -_v.y;
        if (behind) { ex = -ex; ey = 1; }
        const len = Math.max(Math.abs(ex), Math.abs(ey), 1e-4);
        ex /= len; ey /= len;
        const px = (ex * 0.44 + 0.5) * w, py = (ey * 0.42 + 0.5) * h;
        m.style.left = `${px.toFixed(1)}px`;
        m.style.top = `${py.toFixed(1)}px`;
        diamond.classList.add('hidden');
        arrow.classList.remove('hidden');
        arrow.style.transform = `rotate(${Math.atan2(ex, -ey)}rad)`;
        label.textContent = t.id;
      }
    }
    for (; i < this.markerPool.length; i++) this.markerPool[i].className = 'mark hidden';
  }

  // ---------------- summary
  showSummary(stats, log) {
    const el = this.els.summary;
    el.classList.remove('hidden');
    const score = stats.intercepted * 100 - stats.impactsBase * 120 - stats.decoysEngaged * 40 - stats.missed * 20;
    const grade = stats.impactsBase === 0 && stats.missed === 0 ? 'S'
      : stats.impactsBase === 0 ? 'A'
        : stats.impactsBase === 1 ? 'B'
          : stats.impactsBase === 2 ? 'C' : 'D';
    const gcol = { S: 'var(--cyan)', A: 'var(--grn)', B: 'var(--grn)', C: 'var(--amber)', D: 'var(--red)' }[grade];
    this.els.summaryGrade.textContent = `GRADE ${grade}`;
    this.els.summaryGrade.style.color = gcol;
    const rows = [
      ['SCENARIO', stats.scenario],
      ['DURATION', `${Math.round((performance.now() - stats.startTime) / 1000)}s`],
      ['THREATS LAUNCHED', stats.launched - stats.decoysTotal],
      ['DECOYS', stats.decoysTotal],
      ['INTERCEPTED', stats.intercepted],
      ['MISSES', stats.missed],
      ['DECOYS ENGAGED', stats.decoysEngaged],
      ['BASE IMPACTS', stats.impactsBase],
      ['OFF-BASE IMPACTS', stats.impactsOutside],
      ['ROUNDS EXPENDED', stats.roundsFired],
      ['SCORE', score],
    ];
    this.els.summaryStats.innerHTML = rows.map(([l, v]) =>
      `<div class="srow"><span class="lbl">${l}</span><span>${v}</span></div>`).join('');
    this.els.summaryLog.innerHTML = log.map(e => `<div class="${e.cls}">${e.text}</div>`).join('');
  }

  hideSummary() { this.els.summary.classList.add('hidden'); }
  get summaryOpen() { return !this.els.summary.classList.contains('hidden'); }
}
