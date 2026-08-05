// ui.js — DOM HUD (crosshair, prompts, status, battery cards, track list, toasts, results),
// the full-screen C2 console with a stylized radar scope, pause/settings and debrief panels.
import { clamp, lerp, fmtKm, fmtAlt } from './utils.js';

const $ = (sel, root = document) => root.querySelector(sel);

export class UI {
  constructor(game) {
    this.game = game;              // facade with api + state getters
    this.hud = document.getElementById('hud');
    this.mode = 'start';
    this.selectedTrackId = null;
    this.scopeTrails = new Map();  // trackId -> [{x,z,t}]
    this.lastListRefresh = 0;
    this.toasts = [];
    this._buildHud();
    this._buildStartOverlay();
    this._buildConsole();
    this._buildPause();
    this._buildDebrief();
    this._bindKeys();
    this.resultTimer = 0;
  }

  // ================================================================ DOM scaffolding
  _buildHud() {
    this.hud.innerHTML = `
      <div id="fps-meter"></div>
      <div id="crosshair"></div>
      <div id="target-box"><div class="tb-label"></div></div>
      <div id="center-prompt" class="panel hidden"></div>
      <div id="status-strip">
        <div class="cell panel">THREATS<b id="st-threats">—</b></div>
        <div class="cell panel">TRACKED<b id="st-tracked">—</b></div>
        <div class="cell panel">BIRDS OUT<b id="st-birds">—</b></div>
        <div class="cell panel">SCENARIO<b id="st-scenario">STANDBY</b></div>
      </div>
      <div id="alert-banner" class="panel hidden">■ INBOUND THREAT — TAKE ACTION ■</div>
      <div id="battery-bar"></div>
      <div id="track-list"></div>
      <div id="hint-bar" class="panel">
        <span class="k">WASD</span> MOVE · <span class="k">SHIFT</span> SPRINT · <span class="k">1/2/3</span> BATTERY<br/>
        <span class="k">E</span> ASSIGN TARGET / USE CONSOLE · <span class="k">F</span> AUTHORIZE LAUNCH<br/>
        <span class="k">TAB</span> CYCLE TRACKS · <span class="k">ESC</span> MENU
      </div>
      <div id="toast-stack"></div>
      <div id="result-banner" class="panel hidden"></div>
    `;
    this.els = {
      fps: $('#fps-meter'),
      crosshair: $('#crosshair'),
      targetBox: $('#target-box'),
      targetLabel: $('#target-box .tb-label'),
      prompt: $('#center-prompt'),
      stThreats: $('#st-threats'),
      stTracked: $('#st-tracked'),
      stBirds: $('#st-birds'),
      stScenario: $('#st-scenario'),
      alert: $('#alert-banner'),
      batteryBar: $('#battery-bar'),
      trackList: $('#track-list'),
      toastStack: $('#toast-stack'),
      result: $('#result-banner'),
      hintBar: $('#hint-bar'),
    };
  }

  _buildStartOverlay() {
    const div = document.createElement('div');
    div.id = 'start-overlay';
    div.innerHTML = `
      <div class="inner">
        <h1>ARC WARDEN</h1>
        <h2>FORWARD BASE "CASTLE ROCK" — BALLISTIC DEFENSE DEMO</h2>
        <p>
          You hold the watch at a fictional interceptor base. Walk the pads, man the C2 console,
          bring up a threat scenario and put interceptors on inbound ballistic tracks.<br/><br/>
          <span class="k">WASD</span> move · <span class="k">SHIFT</span> sprint · <span class="k">MOUSE</span> look ·
          <span class="k">E</span> console / assign · <span class="k">F</span> authorize · <span class="k">1/2/3</span> batteries
        </p>
        <div class="go">▸ CLICK TO TAKE POST ◂</div>
        <div class="disclaimer">
          FICTIONAL ENTERTAINMENT EXPERIENCE. All systems, ranges, speeds and procedures are invented
          and balanced for gameplay. Not a simulator. Inspired-by visual references only.
        </div>
      </div>`;
    document.body.appendChild(div);
    this.startOverlay = div;
    div.addEventListener('click', () => this.game.api.beginPlay());
  }

  _buildConsole() {
    const div = document.createElement('div');
    div.id = 'console-ui';
    div.classList.add('hidden');
    div.innerHTML = `
      <header class="panel">
        <span>C2 TERMINAL — IRIS-9 ENGAGEMENT DIRECTOR</span>
        <span class="sysid">FB CASTLE ROCK · 173rd ADA "SKYWARD"<br/>MODE: <span id="con-mode">SURVEILLANCE</span></span>
      </header>
      <div id="scope-wrap" class="panel crt-corner">
        <canvas id="scope-canvas"></canvas>
        <div id="scope-hint">CLICK TRACK TO SELECT · SCOPE RANGE 9 KM</div>
      </div>
      <div id="console-right">
        <div class="con-section panel">
          <h4>CONDITIONS</h4>
          <div class="seg-row" id="cond-row">
            <button class="btn" data-cond="day">DAY</button>
            <button class="btn" data-cond="sunset">SUNSET</button>
            <button class="btn" data-cond="night">NIGHT</button>
          </div>
        </div>
        <div class="con-section panel">
          <h4>THREAT SCENARIO</h4>
          <div class="seg-row" id="scen-row">
            <button class="btn" data-scen="single">SINGLE<br/>TRACK</button>
            <button class="btn" data-scen="saturation">SATUR-<br/>ATION</button>
            <button class="btn" data-scen="nightRaid">NIGHT<br/>RAID</button>
          </div>
        </div>
        <div class="con-section panel">
          <h4>BATTERIES</h4>
          <div id="con-batteries"></div>
          <div id="engage-row" style="margin-top:8px">
            <button class="btn" id="btn-assign">ASSIGN</button>
            <button class="btn" id="btn-authorize">AUTHORIZE LAUNCH</button>
          </div>
        </div>
        <div class="con-section panel">
          <button id="btn-start-scenario">▶ START BALLISTIC MISSILES</button>
        </div>
        <div class="con-section panel" style="flex:1;display:flex;flex-direction:column;min-height:60px">
          <h4>EVENT LOG</h4>
          <div id="con-log"></div>
        </div>
      </div>
      <footer class="panel">
        <span>ESC / EXIT — RETURN TO POST</span>
        <span id="con-clock">—</span>
        <button class="btn" id="btn-exit-console">EXIT CONSOLE</button>
      </footer>
    `;
    document.body.appendChild(div);
    this.consoleEl = div;
    this.scope = $('#scope-canvas');
    this.scopeCtx = this.scope.getContext('2d');

    $('#cond-row').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cond]');
      if (b) { this.game.api.setCondition(b.dataset.cond); this.game.audio.uiClick(); }
    });
    $('#scen-row').addEventListener('click', (e) => {
      const b = e.target.closest('[data-scen]');
      if (b) { this.game.api.selectScenario(b.dataset.scen); this.game.audio.uiClick(); }
    });
    $('#con-batteries').addEventListener('click', (e) => {
      const b = e.target.closest('[data-bat]');
      if (b) { this.game.api.selectBattery(b.dataset.bat); this.game.audio.uiClick(); }
    });
    $('#btn-assign').addEventListener('click', () => this.game.api.assignSelected());
    $('#btn-authorize').addEventListener('click', () => this.game.api.authorize());
    $('#btn-start-scenario').addEventListener('click', () => this.game.api.startScenario());
    $('#btn-exit-console').addEventListener('click', () => this.game.api.exitConsole());
    this.scope.addEventListener('mousedown', (e) => this._scopeClick(e));
  }

  _buildPause() {
    const div = document.createElement('div');
    div.id = 'pause-menu';
    div.classList.add('hidden');
    div.innerHTML = `
      <div class="inner panel">
        <h3>— PAUSED —</h3>
        <div class="opt-row"><span>REDUCED MOTION (head bob / shake)</span><button id="opt-motion">OFF</button></div>
        <div class="opt-row"><span>AUDIO</span><button id="opt-audio">ON</button></div>
        <div class="opt-row"><span>BLOOM / POST FX</span><button id="opt-quality">HIGH</button></div>
        <div class="opt-row"><span>RESET SCENARIO</span><button id="opt-reset">RESET</button></div>
        <button class="btn resume" id="opt-resume">RESUME — TAKE POST</button>
      </div>`;
    document.body.appendChild(div);
    this.pauseEl = div;
    $('#opt-motion').addEventListener('click', () => {
      const v = this.game.api.toggleReducedMotion();
      $('#opt-motion').textContent = v ? 'ON' : 'OFF';
    });
    $('#opt-audio').addEventListener('click', () => {
      const v = this.game.api.toggleMute();
      $('#opt-audio').textContent = v ? 'OFF' : 'ON';
    });
    $('#opt-quality').addEventListener('click', () => {
      const v = this.game.api.toggleQuality();
      $('#opt-quality').textContent = v ? 'HIGH' : 'LOW';
    });
    $('#opt-reset').addEventListener('click', () => { this.game.api.resetScenario(); this.game.api.resume(); });
    $('#opt-resume').addEventListener('click', () => this.game.api.resume());
  }

  _buildDebrief() {
    const div = document.createElement('div');
    div.id = 'debrief';
    div.classList.add('panel', 'hidden');
    div.innerHTML = `
      <h3 id="db-title">ENGAGEMENT COMPLETE</h3>
      <div class="row"><span>THREATS PRESENTED</span><b id="db-threats">0</b></div>
      <div class="row"><span>INTERCEPTED</span><b id="db-hits">0</b></div>
      <div class="row"><span>DECOYS NEUTRALIZED / BURNED OUT</span><b id="db-decoys">0</b></div>
      <div class="row"><span>GROUND IMPACTS</span><b id="db-impacts">0</b></div>
      <div class="row"><span>INTERCEPTORS EXPENDED</span><b id="db-shots">0</b></div>
      <div class="row"><span>ASSESSMENT</span><b id="db-grade">—</b></div>
      <div class="btns">
        <button class="btn primary" id="db-restart">RESTART SCENARIO (R)</button>
        <button class="btn" id="db-console">NEW MISSION — CONSOLE</button>
      </div>`;
    document.body.appendChild(div);
    this.debriefEl = div;
    $('#db-restart').addEventListener('click', () => this.game.api.restartScenario());
    $('#db-console').addEventListener('click', () => this.game.api.enterConsole());
  }

  _bindKeys() {
    window.addEventListener('keydown', (e) => {
      this.game.api.onKey(e.code);
    });
  }

  // ================================================================ helpers
  toast(text, cls = '') {
    const el = document.createElement('div');
    el.className = `toast panel ${cls}`;
    el.textContent = text;
    this.els.toastStack.appendChild(el);
    while (this.els.toastStack.children.length > 4) this.els.toastStack.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3300);
  }

  log(text, cls = '') {
    const el = document.createElement('div');
    const t = this.game.state.simTime;
    const mm = String(Math.floor(t / 60)).padStart(2, '0');
    const ss = String(Math.floor(t % 60)).padStart(2, '0');
    el.innerHTML = `<span class="t">${mm}:${ss}Z</span><span class="${cls}">${text}</span>`;
    const log = $('#con-log');
    log.appendChild(el);
    while (log.children.length > 60) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
  }

  showResult(kind, title, why) {
    const el = this.els.result;
    el.classList.remove('hidden', 'ok', 'bad', 'neutral');
    el.classList.add(kind);
    el.innerHTML = `${title}<span class="why">${why}</span>`;
    this.resultTimer = 3.2;
  }

  setMode(mode) {
    this.mode = mode;
    this.startOverlay.classList.toggle('hidden', mode !== 'start');
    this.consoleEl.classList.toggle('hidden', mode !== 'console');
    this.pauseEl.classList.toggle('hidden', mode !== 'paused');
    const fps = mode === 'fps';
    this.els.crosshair.style.display = fps ? 'block' : 'none';
    this.els.hintBar.style.display = fps ? 'block' : 'none';
  }

  // ================================================================ per-frame update
  update(dt) {
    const s = this.game.state;
    // status strip
    this.els.stThreats.textContent = s.running ? `${s.threatsAlive}${s.threatsPending ? ' +' + s.threatsPending : ''}` : '—';
    this.els.stTracked.textContent = s.running ? s.tracks.length : '—';
    this.els.stBirds.textContent = s.interceptorsFlying || '—';
    this.els.stScenario.textContent = s.running ? s.scenarioName : (s.scenarioState === 'debrief' ? 'COMPLETE' : 'STANDBY');
    this.els.alert.classList.toggle('hidden', !s.alarm);
    this.els.fps.textContent = s.fpsText || '';

    // result banner
    if (this.resultTimer > 0) {
      this.resultTimer -= dt;
      if (this.resultTimer <= 0) this.els.result.classList.add('hidden');
    }

    // battery cards + track list (throttled)
    this.lastListRefresh -= dt;
    if (this.lastListRefresh <= 0) {
      this.lastListRefresh = 0.18;
      this._renderBatteries(s);
      this._renderTracks(s);
      if (this.mode === 'console') this._renderConsoleControls(s);
    }

    // center prompt & 3D target box
    this._renderPrompts(s);

    // scope
    if (this.mode === 'console') {
      this._drawScope(s);
      $('#con-clock').textContent = `SIM T+${s.simTime.toFixed(1)}s · ${s.conditionName.toUpperCase()}`;
      $('#con-mode').textContent = s.running ? 'ENGAGEMENT' : 'SURVEILLANCE';
    }

    // debrief
    this.debriefEl.classList.toggle('hidden', !(s.scenarioState === 'debrief' && this.mode === 'fps'));
    if (s.scenarioState === 'debrief') {
      $('#db-threats').textContent = s.results.threats;
      $('#db-hits').textContent = s.results.hits;
      $('#db-decoys').textContent = s.results.decoys;
      $('#db-impacts').textContent = s.results.impacts;
      $('#db-shots').textContent = s.results.shots;
      $('#db-grade').textContent = s.results.impacts === 0 ? (s.results.hits > 0 ? 'BASE DEFENDED' : 'NO ENGAGEMENT') :
        (s.results.hits >= s.results.impacts ? 'PARTIAL DEFENSE' : 'BASE OVERRUN');
    }
  }

  _renderBatteries(s) {
    const bb = this.els.batteryBar;
    const html = s.batteries.map((b, i) => {
      const lampCls = b.state === 'ready' ? '' : (b.state === 'prep' || b.state === 'cycle' ? 'prep' : (b.state === 'reloading' ? 'reload' : 'empty'));
      const pips = '▮'.repeat(b.ammo) + '<span style="opacity:.25">' + '▮'.repeat(Math.max(0, b.ammoMax - b.ammo)) + '</span>';
      return `<div class="bat-card panel ${b.selected ? 'selected' : ''}">
        <div class="lamp ${lampCls}"></div>
        <div class="name">${b.name}</div>
        <div class="key">[${i + 1}]</div>
        <div class="sub"><span>${b.statusText}${b.assignedCallsign ? ' · TGT ' + b.assignedCallsign : ''}</span><span class="ammo">${pips}</span></div>
      </div>`;
    }).join('');
    if (bb._last !== html) { bb.innerHTML = html; bb._last = html; }
  }

  _renderTracks(s) {
    const tl = this.els.trackList;
    if (!s.running && s.tracks.length === 0) {
      if (tl._last !== '') { tl.innerHTML = ''; tl._last = ''; }
      return;
    }
    const html = s.tracks.map((t) => {
      const cls = `${t.terminal ? 'terminal' : ''} ${t.assignedBattery ? 'assigned' : ''}`;
      const tag = t.decoyKnown ? '<span class="amber">DECOY</span>' : (t.terminal ? '<span class="red">TERMINAL</span>' : 'TRACK');
      const eng = t.engagedBy > 0 ? ` · <span class="cyan">${t.engagedBy} BIRD</span>` : '';
      const sel = t.selected ? '▶ ' : '';
      return `<div class="trk panel ${cls}">
        <div>
          <div class="id">${sel}${t.callsign}</div>
          <div class="stat">${tag}${t.assignedBattery ? ' · ' + t.assignedBattery.toUpperCase() : ''}${eng}</div>
        </div>
        <div class="stat">RNG ${fmtKm(t.range)}<br/>ALT ${fmtAlt(t.alt)} · Q${Math.round(t.quality * 100)}</div>
      </div>`;
    }).join('');
    if (tl._last !== html) { tl.innerHTML = html; tl._last = html; }
  }

  _renderPrompts(s) {
    const p = this.els.prompt;
    const tb = this.els.targetBox;
    if (this.mode !== 'fps') { p.classList.add('hidden'); tb.style.display = 'none'; return; }

    // 3D target box on looked-at track
    if (s.lookTarget && s.lookTarget.screen) {
      tb.style.display = 'block';
      tb.style.left = `${s.lookTarget.screen.x}px`;
      tb.style.top = `${s.lookTarget.screen.y}px`;
      const lt = s.lookTarget;
      const tag = lt.decoyKnown ? 'CLASSIFIED: DECOY' : (lt.terminal ? 'TERMINAL PHASE' : 'BALLISTIC TRACK');
      this.els.targetLabel.textContent = `${lt.callsign} · ${tag}\nRNG ${fmtKm(lt.range)} · ALT ${fmtAlt(lt.alt)}`;
    } else {
      tb.style.display = 'none';
    }

    // center prompt text
    let txt = null;
    if (s.consoleNear) {
      txt = `[E] MAN THE C2 CONSOLE`;
    } else if (s.lookTarget) {
      const bat = s.batteries.find((b) => b.selected);
      const assigned = s.lookTarget.assignedBattery;
      if (assigned) {
        txt = `${s.lookTarget.callsign} ASSIGNED → ${assigned.toUpperCase()}\n[F] AUTHORIZE LAUNCH`;
      } else {
        txt = `[E] ASSIGN ${s.lookTarget.callsign} → ${bat ? bat.name : ''}`;
      }
    } else if (s.running && s.selectedBatteryAssigned) {
      txt = `${s.selectedBatteryAssigned} ASSIGNED\n[F] AUTHORIZE LAUNCH`;
    }
    if (txt) {
      p.textContent = txt;
      p.classList.remove('hidden');
    } else p.classList.add('hidden');
    this.els.crosshair.classList.toggle('interact', !!(s.consoleNear || s.lookTarget));
  }

  _renderConsoleControls(s) {
    for (const b of this.consoleEl.querySelectorAll('[data-cond]')) {
      b.classList.toggle('active', b.dataset.cond === s.condition);
    }
    for (const b of this.consoleEl.querySelectorAll('[data-scen]')) {
      b.classList.toggle('active', b.dataset.scen === s.scenarioKey);
    }
    const cb = $('#con-batteries');
    const html = s.batteries.map((b) => {
      const lampCls = b.state === 'ready' ? '' : (b.state === 'prep' || b.state === 'cycle' ? 'prep' : (b.state === 'reloading' ? 'reload' : 'empty'));
      return `<div class="con-bat ${b.selected ? 'active' : ''}" data-bat="${b.key}">
        <div class="lamp ${lampCls}"></div>
        <div class="nm">${b.name}</div>
        <div class="dim">${b.ammo}/${b.ammoMax} · ${b.statusText}</div>
      </div>`;
    }).join('');
    if (cb._last !== html) { cb.innerHTML = html; cb._last = html; }
    const selTrack = s.tracks.find((t) => t.selected);
    const bat = s.batteries.find((b) => b.selected);
    $('#btn-assign').disabled = !(selTrack && bat && s.running);
    $('#btn-authorize').disabled = !(bat && bat.assignedCallsign && (bat.state === 'ready'));
    $('#btn-start-scenario').disabled = s.running;
    $('#btn-start-scenario').textContent = s.running ? '… SCENARIO IN PROGRESS …' : '▶ START BALLISTIC MISSILES';
  }

  // ================================================================ scope
  _scopeClick(e) {
    const rect = this.scope.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.scope.width / rect.width);
    const y = (e.clientY - rect.top) * (this.scope.height / rect.height);
    const s = this.game.state;
    let best = null, bestD = 30;
    for (const t of s.tracks) {
      const p = this._scopeProject(t.x, t.z);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) { bestD = d; best = t; }
    }
    if (best) {
      this.game.api.selectTrack(best.id);
      this.game.audio.uiClick();
    }
  }

  _scopeProject(wx, wz) {
    const w = this.scope.width, h = this.scope.height;
    const cx = w / 2, cy = h / 2;
    const scale = (Math.min(w, h) / 2 - 26) / 9000;
    return { x: cx + wx * scale, y: cy + wz * scale };
  }

  _drawScope(s) {
    const c = this.scope, ctx = this.scopeCtx;
    const wrap = c.parentElement;
    if (c.width !== wrap.clientWidth || c.height !== wrap.clientHeight) {
      c.width = wrap.clientWidth; c.height = wrap.clientHeight;
    }
    const w = c.width, h = c.height, cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) / 2 - 26;
    const scale = R / 9000;
    ctx.clearRect(0, 0, w, h);

    // bg
    const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, R);
    bg.addColorStop(0, 'rgba(8, 26, 16, 0.95)');
    bg.addColorStop(1, 'rgba(3, 10, 7, 0.98)');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

    // range rings
    ctx.strokeStyle = 'rgba(120, 240, 160, 0.16)';
    ctx.fillStyle = 'rgba(120, 240, 160, 0.4)';
    ctx.font = '10px monospace';
    ctx.lineWidth = 1;
    for (let km = 3; km <= 9; km += 3) {
      ctx.beginPath(); ctx.arc(cx, cy, km * 1000 * scale, 0, Math.PI * 2); ctx.stroke();
      ctx.fillText(`${km}`, cx + km * 1000 * scale - 12, cy - 4);
    }
    // bearing spokes
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14);
      ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      ctx.strokeStyle = 'rgba(120, 240, 160, 0.06)';
      ctx.stroke();
    }

    // sweep with smooth afterglow wedge (trailing behind the beam)
    const sweep = s.sweepAngle;
    if (ctx.createConicGradient) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      // flip vertically so the gradient trails behind the clockwise-moving beam
      ctx.scale(1, -1); ctx.translate(0, -2 * cy);
      const grad = ctx.createConicGradient(-sweep, cx, cy);
      grad.addColorStop(0, 'rgba(140,255,180,0.32)');
      grad.addColorStop(0.09, 'rgba(140,255,180,0.05)');
      grad.addColorStop(0.2, 'rgba(140,255,180,0.0)');
      grad.addColorStop(1, 'rgba(140,255,180,0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(160,255,195,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R);
    ctx.stroke();

    // base + batteries
    ctx.fillStyle = 'rgba(160, 255, 190, 0.9)';
    ctx.fillRect(cx - 3, cy - 3, 6, 6);
    ctx.font = '9px monospace';
    ctx.fillText('C2', cx + 6, cy + 3);
    for (const b of s.batteries) {
      const p = this._scopeProject(b.x, b.z);
      ctx.strokeStyle = b.selected ? 'rgba(160,255,190,0.95)' : 'rgba(160,255,190,0.4)';
      ctx.lineWidth = b.selected ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 5); ctx.lineTo(p.x + 5, p.y + 4); ctx.lineTo(p.x - 5, p.y + 4);
      ctx.closePath(); ctx.stroke();
    }

    // impact prediction + tracks
    const now = s.simTime;
    for (const t of s.tracks) {
      const p = this._scopeProject(t.x, t.z);
      // trail memory
      let trail = this.scopeTrails.get(t.id);
      if (!trail) { trail = []; this.scopeTrails.set(t.id, trail); }
      if (!trail.length || now - trail[trail.length - 1].t > 0.5) {
        trail.push({ x: t.x, z: t.z, t: now });
        if (trail.length > 16) trail.shift();
      }
      for (let i = 0; i < trail.length; i++) {
        const tp = this._scopeProject(trail[i].x, trail[i].z);
        const a = (i / trail.length) * 0.5;
        ctx.fillStyle = t.decoyKnown ? `rgba(255,180,84,${a})` : `rgba(255,110,90,${a})`;
        ctx.fillRect(tp.x - 1, tp.y - 1, 2, 2);
      }
      // predicted impact
      if (t.impactX !== null && !t.decoyKnown) {
        const ip = this._scopeProject(t.impactX, t.impactZ);
        ctx.strokeStyle = 'rgba(255, 110, 90, 0.5)';
        ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ip.x, ip.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(ip.x - 4, ip.y - 4); ctx.lineTo(ip.x + 4, ip.y + 4);
        ctx.moveTo(ip.x + 4, ip.y - 4); ctx.lineTo(ip.x - 4, ip.y + 4);
        ctx.stroke();
      }
      // velocity leader
      const sp = Math.hypot(t.vx, t.vz) || 1;
      ctx.strokeStyle = t.decoyKnown ? 'rgba(255,180,84,0.85)' : 'rgba(255,110,90,0.9)';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + (t.vx / sp) * 14, p.y + (t.vz / sp) * 14);
      ctx.stroke();
      // symbol: hostile diamond
      ctx.lineWidth = t.selected ? 2 : 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 6); ctx.lineTo(p.x + 6, p.y); ctx.lineTo(p.x, p.y + 6); ctx.lineTo(p.x - 6, p.y);
      ctx.closePath();
      ctx.stroke();
      if (t.selected) {
        ctx.strokeStyle = 'rgba(180,255,210,0.8)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 12, 0, Math.PI * 2); ctx.stroke();
      }
      // label
      ctx.fillStyle = t.decoyKnown ? 'rgba(255,180,84,0.9)' : 'rgba(255,140,120,0.95)';
      ctx.font = '10px monospace';
      ctx.fillText(`${t.callsign}${t.decoyKnown ? ' DCY' : ''}`, p.x + 9, p.y - 8);
      ctx.fillStyle = 'rgba(160,255,190,0.55)';
      ctx.fillText(`${(t.alt / 1000).toFixed(1)}km`, p.x + 9, p.y + 3);
      if (t.assignedBattery) {
        ctx.fillStyle = 'rgba(122,223,255,0.9)';
        ctx.fillText(`→${t.assignedBattery.slice(0, 3).toUpperCase()}`, p.x + 9, p.y + 14);
      }
    }

    // interceptors
    ctx.fillStyle = 'rgba(122,223,255,0.95)';
    for (const it of s.interceptors) {
      const p = this._scopeProject(it.x, it.z);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // selected track data block
    const sel = s.tracks.find((t) => t.selected);
    if (sel) {
      ctx.fillStyle = 'rgba(140,255,180,0.85)';
      ctx.font = '11px monospace';
      const lines = [
        `TRK ${sel.callsign}  ${sel.decoyKnown ? '[DECOY]' : '[HOSTILE]'}`,
        `RNG ${fmtKm(sel.range)}  ALT ${fmtAlt(sel.alt)}`,
        `SPD ${Math.round(sel.speed)} m/s  Q ${Math.round(sel.quality * 100)}%`,
        `IMPACT T-${Math.max(0, sel.impactT).toFixed(0)}s`,
      ];
      lines.forEach((ln, i) => ctx.fillText(ln, 14, 22 + i * 15));
    }

    // cleanup stale scope trails
    for (const [id, trail] of this.scopeTrails) {
      if (!s.tracks.find((t) => t.id === id) && trail.length && now - trail[trail.length - 1].t > 6) {
        this.scopeTrails.delete(id);
      }
    }
  }
}
