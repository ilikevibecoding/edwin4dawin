// ui.js — DOM HUD, console panel, debrief + settings modals, event feed.
// Everything is driven by game state snapshots + events from main.js.
import { Vector3 } from 'three';
import { fmtKm, clamp } from './util.js';
import { timeToGround } from './physics.js';
import { SCENARIOS } from './threats.js';
import { BATTERY_DEFS } from './batteries.js';

const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

// colorblind-safe pairing: every color code ships with a shape/text glyph
const GLYPH = { hostile: '◆', decoy: '◇', interceptor: '■' };
const FEED_ICONS = { good: '✓', bad: '✗', warn: '▲', info: '◆' };
const BANNER_ICONS = { good: '✓ ', bad: '✗ ', warn: '◆ ' };

export function createUI(ctx) {
  const root = el('div');
  root.id = 'hud';
  document.body.appendChild(root);

  // ---------- HUD scaffolding ----------
  root.innerHTML = `
    <div id="threat-board" class="hud-panel"><h3>AIR PICTURE</h3><div id="threat-rows"></div></div>
    <div id="battery-board"></div>
    <div id="crosshair"></div>
    <div id="aim-bracket" aria-hidden="true">
      <span class="c tl"></span><span class="c tr"></span><span class="c bl"></span><span class="c br"></span>
      <span class="ab-id"></span><span class="ab-data"></span>
    </div>
    <div id="target-prompt"></div>
    <div id="feed" role="log" aria-label="Event feed"></div>
    <div id="status-strip"></div>
    <div id="keyhelp">
      <b>WASD</b> move &nbsp;<b>SHIFT</b> sprint &nbsp;<b>E</b> assign &nbsp;<b>F</b> fire / salvo<br/>
      <b>Q</b> tablet &nbsp;<b>V</b> missile cam &nbsp;<b>1·2·3</b> battery &nbsp;<b>TAB</b> console &nbsp;<b>H</b> settings
    </div>
    <div id="banner" aria-live="polite"></div>
    <div id="impact-flash"></div>
  `;

  const threatRows = root.querySelector('#threat-rows');
  const batteryBoard = root.querySelector('#battery-board');
  const prompt = root.querySelector('#target-prompt');
  const feed = root.querySelector('#feed');
  const statusStrip = root.querySelector('#status-strip');
  const banner = root.querySelector('#banner');
  const impactFlash = root.querySelector('#impact-flash');
  const aimBracket = root.querySelector('#aim-bracket');
  const abId = aimBracket.querySelector('.ab-id');
  const abData = aimBracket.querySelector('.ab-data');

  // ---------- console panel ----------
  const consolePanel = el('div');
  consolePanel.id = 'console-panel';
  consolePanel.setAttribute('role', 'dialog');
  consolePanel.setAttribute('aria-label', 'Fire direction console');
  consolePanel.innerHTML = `
    <header>
      <div>
        <div class="title">FIRE DIRECTION CENTER — IRONVEIL RANGE</div>
        <div class="subtitle">FICTIONAL TRAINING DEMO · ALL PARAMETERS SIMULATED</div>
      </div>
      <button id="btn-exit-console" aria-label="Exit console (Tab)">EXIT [TAB]</button>
    </header>
    <div class="console-grid">
      <div class="console-section">
        <h4>CONDITIONS</h4>
        <div class="opt-row" id="opt-time" role="group" aria-label="Time of day"></div>
      </div>
      <div class="console-section">
        <h4>THREAT SCENARIO</h4>
        <div class="opt-row" id="opt-scenario" role="group" aria-label="Threat scenario"></div>
      </div>
      <div class="console-section">
        <h4>BATTERY SELECT</h4>
        <div class="opt-row" id="opt-battery" role="group" aria-label="Battery select"></div>
        <button id="btn-start" aria-label="Start scenario">▶ START BALLISTIC MISSILES</button>
      </div>
      <div class="console-section">
        <h4>ENGAGEMENT — SELECT TRACK ON DISPLAY OR LIST</h4>
        <div id="track-list" role="group" aria-label="Detected tracks"></div>
        <div class="engage-actions">
          <button id="btn-assign" aria-label="Assign selected track to battery">ASSIGN</button>
          <button id="btn-authorize" aria-label="Authorize launch">AUTHORIZE LAUNCH</button>
        </div>
        <div id="engage-status" aria-live="polite"></div>
      </div>
    </div>
  `;
  document.body.appendChild(consolePanel);

  // ---------- tactical tablet (handheld TACOM pad, toggled with Q) ----------
  const BAT_TAG = { patriot: 'RMP', thaad: 'HLB', sentinel: 'SNT' };
  const BAT_COL = { patriot: '#ffd257', thaad: '#4fd8ff', sentinel: '#c99bff' };
  const tablet = el('div');
  tablet.id = 'tablet';
  tablet.setAttribute('role', 'dialog');
  tablet.setAttribute('aria-label', 'Tactical command tablet');
  tablet.innerHTML = `
    <div class="t-case">
      <div class="t-screw tl"></div><div class="t-screw tr"></div>
      <div class="t-screw bl"></div><div class="t-screw br"></div>
      <div class="t-screen">
        <div class="t-head">
          <span class="t-title">■ TACOM PAD <span class="t-dim">·</span> IRONVEIL C2 DATALINK</span>
          <span class="t-net"><span class="t-net-dot"></span>NET</span>
          <button id="t-close" aria-label="Stow tablet (Q)">STOW [Q]</button>
        </div>
        <div class="t-body">
          <div class="t-left">
            <canvas id="t-radar" width="340" height="340" aria-label="Tactical radar plot"></canvas>
            <div class="t-cap">TAP TRACK TO SELECT · RINGS 3 KM</div>
          </div>
          <div class="t-right">
            <div id="t-batts" role="group" aria-label="Batteries"></div>
            <div id="t-tracks" role="group" aria-label="Tracks"></div>
            <div class="t-actions">
              <button id="t-engage-all" aria-label="Engage all hostile tracks">⚑ ENGAGE ALL HOSTILE</button>
            </div>
            <div id="t-hint" aria-live="polite"></div>
          </div>
        </div>
        <div class="t-foot" id="t-foot"></div>
      </div>
    </div>
  `;
  document.body.appendChild(tablet);
  const tRadar = tablet.querySelector('#t-radar');
  const tRadarG = tRadar.getContext('2d');
  const tBatts = tablet.querySelector('#t-batts');
  const tTracks = tablet.querySelector('#t-tracks');
  const tHint = tablet.querySelector('#t-hint');
  const tFoot = tablet.querySelector('#t-foot');

  // ---------- cinematic chase-cam letterbox ----------
  const cinema = el('div');
  cinema.id = 'cinema';
  cinema.setAttribute('aria-hidden', 'true');
  cinema.innerHTML = `
    <div class="bar top"></div><div class="bar bot"></div>
    <div class="c-tag"><span class="rec"></span><span id="cinema-label">INTERCEPTOR CAM</span><span class="c-keys">V NEXT · ESC EXIT</span></div>
  `;
  document.body.appendChild(cinema);
  const cinemaLabel = cinema.querySelector('#cinema-label');

  // ---------- debrief modal ----------
  const debrief = el('div', 'modal');
  debrief.setAttribute('role', 'dialog');
  debrief.setAttribute('aria-label', 'Engagement debrief');
  debrief.innerHTML = `
    <div class="box">
      <h2 id="db-title">ENGAGEMENT COMPLETE</h2>
      <div class="grade" id="db-grade">A</div>
      <table id="db-table"></table>
      <div class="row-buttons">
        <button id="db-restart" class="primary" aria-label="Restart scenario">RESTART SCENARIO</button>
        <button id="db-console" aria-label="Back to console">BACK TO CONSOLE</button>
        <button id="db-close" aria-label="Close and free roam">FREE ROAM</button>
      </div>
    </div>
  `;
  document.body.appendChild(debrief);

  // ---------- settings modal ----------
  const settings = el('div', 'modal');
  settings.setAttribute('role', 'dialog');
  settings.setAttribute('aria-label', 'Settings');
  settings.innerHTML = `
    <div class="box">
      <h2>SETTINGS</h2>
      <label>Reduced motion (no head bob / heavy shake / flash effects)
        <input type="checkbox" id="set-reduced"></label>
      <label>Master volume
        <input type="range" id="set-volume" min="0" max="1" step="0.05"></label>
      <label>Mute audio
        <input type="checkbox" id="set-mute"></label>
      <label>Render quality
        <select id="set-quality">
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select></label>
      <div class="row-buttons"><button id="set-close" class="primary" aria-label="Close settings">CLOSE</button></div>
      <div class="hint">Fictional entertainment demo. Systems are visually inspired by public
      imagery but all behavior, ranges and procedures are invented for gameplay.</div>
    </div>
  `;
  document.body.appendChild(settings);

  // ---------- intro overlay ----------
  const intro = el('div');
  intro.id = 'intro';
  intro.setAttribute('role', 'button');
  intro.setAttribute('aria-label', 'Click to take post');
  intro.innerHTML = `
    <h1>IRONVEIL RANGE</h1>
    <div class="tagline">INTEGRATED AIR-DEFENSE TEST SITE · FICTIONAL DEMO</div>
    <div class="enter">CLICK TO TAKE POST</div>
    <div class="controls">
      WASD move · SHIFT sprint · mouse look<br/>
      Q raises the TACOM pad — start raids and direct fire from anywhere<br/>
      Look at a track: E assign · F fire — F again salvos, 1·2·3 ripples batteries<br/>
      V rides the interceptor out — missile cam
    </div>
    <div class="safety">ENTERTAINMENT ONLY — ALL SYSTEM BEHAVIOR IS FICTIONALIZED</div>
  `;
  document.body.appendChild(intro);

  // ---------- option buttons ----------
  const times = [
    ['day', 'DAY', 'full visibility'],
    ['sunset', 'SUNSET', 'low sun, long shadows'],
    ['night', 'NIGHT', 'floodlights + searchlights'],
  ];
  const optTime = consolePanel.querySelector('#opt-time');
  for (const [id, name, d] of times) {
    const b = el('button', 'copt', `${name}<span class="d">${d}</span>`);
    b.dataset.id = id;
    b.setAttribute('aria-label', `${name} — ${d}`);
    b.addEventListener('click', () => { handlers.setTimeOfDay?.(id); ctx.events.emit('ui-click'); });
    optTime.appendChild(b);
  }
  const optScenario = consolePanel.querySelector('#opt-scenario');
  for (const s of Object.values(SCENARIOS)) {
    const b = el('button', 'copt', `${s.name}<span class="d">${s.desc}</span>`);
    b.dataset.id = s.id;
    b.setAttribute('aria-label', `${s.name} — ${s.desc}`);
    b.addEventListener('click', () => { handlers.selectScenario?.(s.id); ctx.events.emit('ui-click'); });
    optScenario.appendChild(b);
  }
  const optBattery = consolePanel.querySelector('#opt-battery');
  for (const def of Object.values(BATTERY_DEFS)) {
    const b = el('button', 'copt', `${def.name}<span class="d">${def.kind} · ${def.desc}</span>`);
    b.dataset.id = def.id;
    b.setAttribute('aria-label', `${def.name} — ${def.kind}`);
    b.addEventListener('click', () => { handlers.selectBattery?.(def.id); ctx.events.emit('ui-click'); });
    optBattery.appendChild(b);
  }

  const btnStart = consolePanel.querySelector('#btn-start');
  const btnAssign = consolePanel.querySelector('#btn-assign');
  const btnAuthorize = consolePanel.querySelector('#btn-authorize');
  const btnExit = consolePanel.querySelector('#btn-exit-console');
  const trackList = consolePanel.querySelector('#track-list');
  const engageStatus = consolePanel.querySelector('#engage-status');

  btnStart.addEventListener('click', () => { handlers.start?.(); ctx.events.emit('ui-click'); });
  btnAssign.addEventListener('click', () => { handlers.assign?.(); ctx.events.emit('ui-click'); });
  btnAuthorize.addEventListener('click', () => { handlers.authorize?.(); ctx.events.emit('ui-click'); });
  btnExit.addEventListener('click', () => { handlers.exitConsole?.(); ctx.events.emit('ui-click'); });

  debrief.querySelector('#db-restart').addEventListener('click', () => { hideDebrief(); handlers.restart?.(); });
  debrief.querySelector('#db-console').addEventListener('click', () => { hideDebrief(); handlers.enterConsole?.(); });
  debrief.querySelector('#db-close').addEventListener('click', () => { hideDebrief(); handlers.closeToRoam?.(); });

  // ---------- tablet wiring ----------
  tablet.querySelector('#t-close').addEventListener('click', () => handlers.closeTablet?.());
  tablet.querySelector('#t-engage-all').addEventListener('click', () => { handlers.engageAll?.(); ctx.events.emit('ui-click'); });
  tBatts.addEventListener('click', (e) => {
    const c = e.target.closest('[data-bat]');
    if (c) { handlers.selectBattery?.(c.dataset.bat); ctx.events.emit('ui-click'); }
  });
  tTracks.addEventListener('click', (e) => {
    const row = e.target.closest('[data-track]');
    if (!row) return;
    const act = e.target.closest('button[data-act]')?.dataset.act;
    const id = row.dataset.track;
    if (act === 'assign') handlers.assignTrack?.(id);
    else if (act === 'fire') handlers.fireTrack?.(id);
    else handlers.selectTrack?.(id);
    ctx.events.emit('ui-click');
  });
  tFoot.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tf]');
    if (!b) return;
    const [kind, id] = b.dataset.tf.split(':');
    if (kind === 'time') handlers.setTimeOfDay?.(id);
    else if (kind === 'scn') handlers.selectScenario?.(id);
    else if (kind === 'start') handlers.start?.();
    else if (kind === 'restart') handlers.restart?.();
    ctx.events.emit('ui-click');
  });
  // tap a blip on the plot to select that track
  const T_RANGE = 9000, T_CX = 170, T_CY = 170, T_R = 156;
  tRadar.addEventListener('click', (e) => {
    const r = tRadar.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * 340;
    const my = ((e.clientY - r.top) / r.height) * 340;
    let best = null, bestD = 18;
    for (const tr of ctx.radar.activeTracks()) {
      const px = T_CX + (tr.threat.pos.x / T_RANGE) * T_R;
      const py = T_CY + (tr.threat.pos.z / T_RANGE) * T_R;
      const d = Math.hypot(px - mx, py - my);
      if (d < bestD) { bestD = d; best = tr.id; }
    }
    if (best) { handlers.selectTrack?.(best); ctx.events.emit('ui-click'); }
  });

  const setReduced = settings.querySelector('#set-reduced');
  const setVolume = settings.querySelector('#set-volume');
  const setMute = settings.querySelector('#set-mute');
  const setQuality = settings.querySelector('#set-quality');
  setReduced.addEventListener('change', () => handlers.setReducedMotion?.(setReduced.checked));
  setVolume.addEventListener('input', () => handlers.setVolume?.(parseFloat(setVolume.value)));
  setMute.addEventListener('change', () => handlers.setMuted?.(setMute.checked));
  setQuality.addEventListener('change', () => handlers.setQuality?.(setQuality.value));
  settings.querySelector('#set-close').addEventListener('click', () => api.showSettings(false));

  intro.addEventListener('click', () => {
    intro.classList.add('hidden');
    handlers.enterGame?.();
  });

  // ---------- feed + banner ----------
  function toast(text, kind = 'info', ttl = 6) {
    const m = el('div', `msg ${kind}`, `<span class="ico">${FEED_ICONS[kind] ?? '◆'}</span><span class="txt">${text}</span>`);
    feed.appendChild(m);
    while (feed.children.length > 5) feed.removeChild(feed.firstChild);
    setTimeout(() => m.classList.add('fading'), ttl * 1000);
    setTimeout(() => m.remove(), ttl * 1000 + 900);
  }

  let bannerTimer = null;
  function showBanner(text, kind = 'good', sub = '', ttl = 2.6) {
    banner.className = kind;
    banner.innerHTML = `<span class="b-ico">${BANNER_ICONS[kind] ?? ''}</span>${text}${sub ? `<span class="sub">${sub}</span>` : ''}`;
    banner.style.opacity = '1';
    // retrigger entrance pop (suppressed by body.reduced-motion in CSS)
    void banner.offsetWidth;
    banner.classList.add('pop');
    if (bannerTimer) clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { banner.style.opacity = '0'; }, ttl * 1000);
  }

  function flashImpact() {
    impactFlash.style.opacity = '1';
    setTimeout(() => { impactFlash.style.opacity = '0'; }, 260);
  }

  // ---------- battery cards ----------
  const battCards = new Map();
  let keyIdx = 1;
  for (const def of Object.values(BATTERY_DEFS)) {
    const card = el('div', 'batt-card');
    card.innerHTML = `
      <div class="name"><span>${def.name}</span><span class="key">[${keyIdx++}]</span></div>
      <div class="sub"><span class="state">READY</span><span class="pips"></span></div>
    `;
    batteryBoard.appendChild(card);
    battCards.set(def.id, card);
  }

  // ---------- debrief ----------
  function showDebrief(stats) {
    const success = stats.impactsOnBase === 0 && stats.intercepted > 0;
    const title = debrief.querySelector('#db-title');
    title.textContent = success ? 'RAID DEFEATED' : stats.impactsOnBase > 0 ? 'BASE HIT' : 'ENGAGEMENT COMPLETE';
    title.className = success ? 'good' : 'bad';
    let grade;
    const total = Math.max(stats.threatsTotal, 1);
    const allWarheadsKilled = stats.intercepted >= stats.warheads;
    if (allWarheadsKilled && stats.impactsOnBase === 0 && stats.wastedOnDecoys === 0 && stats.misses === 0) grade = 'S';
    else if (allWarheadsKilled && stats.impactsOnBase === 0) grade = 'A';
    else if (stats.impactsOnBase === 0 && stats.intercepted > 0) grade = 'B';
    else if (stats.intercepted > 0) grade = 'C';
    else grade = 'D';
    debrief.querySelector('#db-grade').textContent = grade;
    debrief.querySelector('#db-grade').style.color = grade === 'S' || grade === 'A' ? 'var(--hud-green)' : grade === 'B' ? 'var(--hud-amber)' : 'var(--hud-red)';
    debrief.querySelector('#db-table').innerHTML = `
      <tr><td>Threats presented</td><td>${stats.threatsTotal} (${stats.warheads} warheads, ${stats.decoys} decoys)</td></tr>
      <tr><td>Intercepted</td><td>${stats.intercepted}</td></tr>
      <tr><td>Ground impacts</td><td>${stats.impacts} (${stats.impactsOnBase} on base)</td></tr>
      <tr><td>Interceptors expended</td><td>${stats.launches}</td></tr>
      ${stats.safed ? `<tr><td>Rounds safed (target already down)</td><td>${stats.safed}</td></tr>` : ''}
      <tr><td>Spent on decoys</td><td>${stats.wastedOnDecoys}</td></tr>
      <tr><td>Elapsed</td><td>${stats.elapsed.toFixed(0)} s</td></tr>
    `;
    debrief.style.display = 'flex';
    void total;
  }
  function hideDebrief() { debrief.style.display = 'none'; }

  // ---------- handlers registry ----------
  const handlers = {};

  // ---------- per-frame HUD update (signature-diffed to avoid DOM churn) ----------
  // struct signatures gate element rebuilds (membership/order/state classes);
  // value signatures gate in-place textContent updates, so elements stay stable
  // while data merely ticks.
  const sig = { threatsStruct: '', threatsVals: '', batts: '', strip: '', console: '', trackStruct: '', trackVals: '' };
  const q100 = (v) => Math.round(v / 100) * 100;
  let threatRowRefs = [];
  let trackBtnRefs = [];

  // event delegation: track list buttons survive rebuilds
  trackList.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (b) { handlers.selectTrack?.(b.dataset.id); ctx.events.emit('ui-click'); }
  });

  // ---------- tablet rendering ----------
  const tsig = { batts: '', trackStruct: '', trackVals: '', foot: '', hint: '' };
  let tTrackRefs = [];

  function drawTabletRadar(snapshot) {
    const g = tRadarG;
    g.clearRect(0, 0, 340, 340);
    // scope well
    const bg = g.createRadialGradient(T_CX, T_CY, 18, T_CX, T_CY, T_R + 14);
    bg.addColorStop(0, '#08150d');
    bg.addColorStop(0.82, '#051009');
    bg.addColorStop(1, '#030a06');
    g.fillStyle = bg;
    g.beginPath(); g.arc(T_CX, T_CY, T_R + 10, 0, Math.PI * 2); g.fill();

    g.font = '9px "Consolas","Menlo","DejaVu Sans Mono",monospace';
    g.strokeStyle = 'rgba(110,220,150,0.16)';
    g.fillStyle = 'rgba(140,235,170,0.45)';
    g.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const rr = (i * 3000 / T_RANGE) * T_R;
      g.beginPath(); g.arc(T_CX, T_CY, rr, 0, Math.PI * 2); g.stroke();
      g.fillText(`${i * 3}`, T_CX + rr - 11, T_CY - 4);
    }
    g.beginPath();
    g.moveTo(T_CX - T_R, T_CY); g.lineTo(T_CX + T_R, T_CY);
    g.moveTo(T_CX, T_CY - T_R); g.lineTo(T_CX, T_CY + T_R);
    g.stroke();
    g.fillStyle = 'rgba(150,240,180,0.8)';
    g.fillText('N', T_CX - 3, T_CY - T_R + 11);

    // sweep synced to the physical rotating dish
    const az = ctx.base?.radarHead ? ctx.base.radarHead.rotation.y : 0;
    const a = -az;
    if (g.createConicGradient) {
      const cg = g.createConicGradient(a, T_CX, T_CY);
      cg.addColorStop(0, 'rgba(120,255,170,0.20)');
      cg.addColorStop(0.14, 'rgba(120,255,170,0)');
      cg.addColorStop(1, 'rgba(120,255,170,0)');
      g.fillStyle = cg;
      g.beginPath(); g.arc(T_CX, T_CY, T_R, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = 'rgba(150,255,190,0.45)';
    g.beginPath(); g.moveTo(T_CX, T_CY);
    g.lineTo(T_CX + Math.cos(a) * T_R, T_CY + Math.sin(a) * T_R);
    g.stroke();

    const toPx = (x, z) => [T_CX + (x / T_RANGE) * T_R, T_CY + (z / T_RANGE) * T_R];
    g.save();
    g.beginPath(); g.arc(T_CX, T_CY, T_R, 0, Math.PI * 2); g.clip();

    // base + batteries
    g.strokeStyle = 'rgba(150,240,180,0.7)';
    g.strokeRect(T_CX - 4, T_CY - 4, 8, 8);
    for (const b of ctx.batteries.list) {
      const [px, py] = toPx(b.rig.group.position.x, b.rig.group.position.z);
      g.fillStyle = BAT_COL[b.id];
      g.fillRect(px - 2, py - 2, 4, 4);
    }

    const snapById = new Map(snapshot.tracks.map((t) => [t.id, t]));

    // engagement pairing lines battery -> track
    g.lineWidth = 1;
    for (const tr of ctx.radar.activeTracks()) {
      const st = snapById.get(tr.id);
      if (!st?.assignedBattery) continue;
      const bat = ctx.batteries.get(st.assignedBattery);
      if (!bat) continue;
      const [bx, by] = toPx(bat.rig.group.position.x, bat.rig.group.position.z);
      const [px, py] = toPx(tr.threat.pos.x, tr.threat.pos.z);
      g.strokeStyle = `${BAT_COL[st.assignedBattery]}44`;
      g.setLineDash([3, 4]);
      g.beginPath(); g.moveTo(bx, by); g.lineTo(px, py); g.stroke();
      g.setLineDash([]);
    }

    // threat tracks
    for (const tr of ctx.radar.activeTracks()) {
      const t = tr.threat;
      const st = snapById.get(tr.id);
      const [px, py] = toPx(t.pos.x, t.pos.z);
      const isDecoy = tr.classified.startsWith('DECOY');
      const col = isDecoy ? '#ffd257' : '#ff5340';

      // predicted impact ×
      const tImp = timeToGround(t.pos, t.vel, 0);
      if (!isDecoy && tImp > 0) {
        const [ix, iy] = toPx(t.pos.x + t.vel.x * tImp, t.pos.z + t.vel.z * tImp);
        g.strokeStyle = 'rgba(255,83,64,0.55)';
        g.beginPath();
        g.moveTo(ix - 4, iy - 4); g.lineTo(ix + 4, iy + 4);
        g.moveTo(ix + 4, iy - 4); g.lineTo(ix - 4, iy + 4);
        g.stroke();
      }
      // 10 s leader
      const [lx, ly] = toPx(t.pos.x + t.vel.x * 10, t.pos.z + t.vel.z * 10);
      g.strokeStyle = `${col}88`;
      g.beginPath(); g.moveTo(px, py); g.lineTo(lx, ly); g.stroke();
      // heading-oriented wedge
      const hd = Math.atan2(t.vel.z, t.vel.x);
      g.fillStyle = col;
      g.save();
      g.translate(px, py); g.rotate(hd);
      g.beginPath(); g.moveTo(5, 0); g.lineTo(-4, 3.4); g.lineTo(-4, -3.4); g.closePath(); g.fill();
      g.restore();
      // state rings
      if (tr.id === snapshot.selectedTrackId) {
        g.strokeStyle = '#ffffff';
        g.lineWidth = 1.4;
        g.beginPath(); g.arc(px, py, 9.5, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 1;
      } else if (st?.assignedBattery) {
        g.strokeStyle = `${BAT_COL[st.assignedBattery]}cc`;
        g.beginPath(); g.arc(px, py, 8, 0, Math.PI * 2); g.stroke();
      }
      if (st?.queued) {
        g.strokeStyle = 'rgba(255,255,255,0.75)';
        g.setLineDash([2.5, 3]);
        g.beginPath(); g.arc(px, py, 12, 0, Math.PI * 2); g.stroke();
        g.setLineDash([]);
      }
      // label
      g.fillStyle = `${col}dd`;
      g.fillText(tr.id, px + 8, py + 3);
    }

    // interceptors: cyan darts + 4 s leader
    for (const it of ctx.interceptors.active) {
      const [px, py] = toPx(it.pos.x, it.pos.z);
      const [lx, ly] = toPx(it.pos.x + it.vel.x * 4, it.pos.z + it.vel.z * 4);
      g.strokeStyle = 'rgba(79,216,255,0.8)';
      g.beginPath(); g.moveTo(px, py); g.lineTo(lx, ly); g.stroke();
      g.fillStyle = '#4fd8ff';
      g.fillRect(px - 1.5, py - 1.5, 3, 3);
    }
    g.restore();
  }

  function updateTablet(snapshot) {
    // battery chips
    const bsig = snapshot.batteries
      .map((b) => `${b.id}:${b.state}:${b.ammo}:${b.queued}:${b.id === snapshot.selectedBatteryId ? 1 : 0}:${Math.ceil(b.readyIn)}`)
      .join('|');
    if (bsig !== tsig.batts) {
      tsig.batts = bsig;
      tBatts.innerHTML = snapshot.batteries.map((b, i) => `
        <div class="t-bat ${b.id === snapshot.selectedBatteryId ? 'sel' : ''}" data-bat="${b.id}" style="--bc:${BAT_COL[b.id]}" role="button" aria-label="Select ${BATTERY_DEFS[b.id].name}">
          <span class="t-bat-key">${i + 1}</span>
          <span class="t-bat-name">${BAT_TAG[b.id]}</span>
          <span class="t-bat-state">${b.state}${b.state === 'RELOADING' ? ` ${Math.ceil(b.readyIn)}s` : ''}</span>
          <span class="t-bat-ammo">${'▮'.repeat(b.ammo)}${'▯'.repeat(Math.max(0, b.maxAmmo - b.ammo))}</span>
          ${b.queued ? `<span class="t-bat-q">Q${b.queued}</span>` : ''}
        </div>`).join('');
    }

    // track rows
    let struct = snapshot.tracks
      .map((tr) => `${tr.id}:${tr.classified.startsWith('DECOY') ? 1 : 0}:${tr.id === snapshot.selectedTrackId ? 1 : 0}:${tr.assignedBattery ?? ''}:${tr.queued}:${tr.engagedBy}`)
      .join('|');
    if (!snapshot.tracks.length) struct = `none:${snapshot.phase}`;
    if (struct !== tsig.trackStruct) {
      tsig.trackStruct = struct;
      tsig.trackVals = '';
      if (!snapshot.tracks.length) {
        tTracks.innerHTML = `<div class="t-none">${snapshot.phase === 'active' ? 'RADAR SEARCHING…' : 'NO AIR PICTURE — START A RAID BELOW'}</div>`;
        tTrackRefs = [];
      } else {
        tTracks.innerHTML = snapshot.tracks.map((tr) => {
          const decoy = tr.classified.startsWith('DECOY');
          const cls = ['t-row', decoy ? 'decoy' : '', tr.id === snapshot.selectedTrackId ? 'sel' : ''].join(' ');
          const asg = tr.assignedBattery
            ? `<span class="t-asg" style="color:${BAT_COL[tr.assignedBattery]}">→${BAT_TAG[tr.assignedBattery]}${tr.engagedBy ? ` ×${tr.engagedBy}` : ''}${tr.queued ? ` Q${tr.queued}` : ''}</span>`
            : '<span class="t-asg dim">UNASSIGNED</span>';
          return `<div class="${cls}" data-track="${tr.id}" role="button" aria-label="Track ${tr.id}">
            <span class="glyph">${decoy ? GLYPH.decoy : GLYPH.hostile}</span><b>${tr.id}</b>
            <span class="t-meta"></span>${asg}
            <button data-act="assign" aria-label="Assign ${tr.id} to selected battery">ASGN</button>
            <button data-act="fire" class="fire" aria-label="Fire on ${tr.id}">FIRE</button>
          </div>`;
        }).join('');
        tTrackRefs = [...tTracks.children].map((r) => r.querySelector('.t-meta'));
      }
    }
    if (snapshot.tracks.length) {
      const vals = snapshot.tracks.map((tr) => `${tr.classified}:${q100(tr.alt)}:${Math.round(tr.impactIn)}`).join('|');
      if (vals !== tsig.trackVals) {
        tsig.trackVals = vals;
        for (let i = 0; i < snapshot.tracks.length; i++) {
          const tr = snapshot.tracks[i];
          if (!tTrackRefs[i]) continue;
          tTrackRefs[i].textContent =
            `${tr.classified} · ALT ${fmtKm(q100(tr.alt))}${tr.impactIn > 0 && tr.impactIn < 999 ? ` · TTI ${Math.round(tr.impactIn)}s` : ''}`;
        }
      }
    }

    // hint line
    if ((snapshot.engageHint ?? '') !== tsig.hint) {
      tsig.hint = snapshot.engageHint ?? '';
      tHint.textContent = tsig.hint;
    }

    // footer: raid setup when idle, live status when active
    const fsig = `${snapshot.phase}:${snapshot.timeOfDay}:${snapshot.scenario}:${snapshot.threatsRemaining}:${snapshot.inFlight}:${snapshot.queueCount}`;
    if (fsig !== tsig.foot) {
      tsig.foot = fsig;
      if (snapshot.phase === 'active') {
        tFoot.innerHTML = `<span class="t-stat">RAID LIVE — THREATS ${snapshot.threatsRemaining} · IN FLIGHT ${snapshot.inFlight}${snapshot.queueCount ? ` · QUEUED ${snapshot.queueCount}` : ''}</span>`;
      } else {
        const times = [['day', 'DAY'], ['sunset', 'SUNSET'], ['night', 'NIGHT']];
        tFoot.innerHTML = `
          <span class="t-seg">${times.map(([id, nm]) =>
            `<button data-tf="time:${id}" class="${snapshot.timeOfDay === id ? 'on' : ''}" aria-pressed="${snapshot.timeOfDay === id}">${nm}</button>`).join('')}</span>
          <span class="t-seg">${Object.values(SCENARIOS).map((s) =>
            `<button data-tf="scn:${s.id}" class="${snapshot.scenario === s.id ? 'on' : ''}" aria-pressed="${snapshot.scenario === s.id}">${s.name}</button>`).join('')}</span>
          <button class="t-start" data-tf="start" ${snapshot.scenario ? '' : 'disabled'}>▶ ${snapshot.phase === 'debrief' ? 'RUN AGAIN' : 'START RAID'}</button>`;
      }
    }

    drawTabletRadar(snapshot);
  }

  // ---------- screen-space aim bracket (presentation only) ----------
  const _proj = new Vector3();
  let abShown = false, abAssigned = false, abIdText = '', abDataText = '';
  function updateAimBracket(snapshot) {
    let track = null;
    if (snapshot.mode !== 'console' && ctx.game) {
      const id = ctx.game.aimTrackId ?? snapshot.assignment?.trackId ?? null;
      if (id) track = ctx.radar.getTrack(id);
    }
    let visible = false;
    if (track && !track.gone) {
      ctx.camera.updateMatrixWorld();
      _proj.copy(track.threat.pos).project(ctx.camera);
      if (_proj.z < 1 && Math.abs(_proj.x) < 1.02 && Math.abs(_proj.y) < 1.02) {
        visible = true;
        const x = (_proj.x * 0.5 + 0.5) * innerWidth;
        const y = (-_proj.y * 0.5 + 0.5) * innerHeight;
        const d = track.threat.pos.distanceTo(ctx.camera.position);
        const s = clamp(1.45 - d / 12000, 0.72, 1.3);
        aimBracket.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${s.toFixed(3)})`;
        const assigned = !!track.assignedBattery || snapshot.assignment?.trackId === track.id;
        const decoy = track.classified.startsWith('DECOY');
        const idText = `${decoy ? GLYPH.decoy : GLYPH.hostile} ${track.id}`;
        const dataText = assigned ? `${track.classified} · ASSIGNED` : track.classified;
        if (assigned !== abAssigned) { abAssigned = assigned; aimBracket.classList.toggle('assigned', assigned); }
        if (idText !== abIdText) { abIdText = idText; abId.textContent = idText; }
        if (dataText !== abDataText) { abDataText = dataText; abData.textContent = dataText; }
      }
    }
    if (visible !== abShown) {
      abShown = visible;
      aimBracket.classList.toggle('on', visible);
    }
  }

  function update(snapshot) {
    // presentation flag for CSS (disables banner/feed/pulse animation)
    document.body.classList.toggle('reduced-motion', !!ctx.settings.reducedMotion);

    // ---- threat rows: rebuild only on membership/state change; tick values in place
    const inbound = snapshot.inboundUndetected;
    let struct = snapshot.tracks
      .map((tr) => `${tr.id}:${tr.classified.startsWith('DECOY') ? 1 : 0}:${tr.assignedBattery ?? ''}:${tr.id === snapshot.selectedTrackId ? 1 : 0}`)
      .join('|');
    if (!snapshot.tracks.length) struct = `empty:${snapshot.phase}:${inbound > 0 ? 1 : 0}`;
    if (struct !== sig.threatsStruct) {
      sig.threatsStruct = struct;
      sig.threatsVals = '';
      if (!snapshot.tracks.length) {
        threatRows.innerHTML = `<div class="empty">${snapshot.phase === 'active' ? (inbound > 0 ? '▲ RADAR SEARCHING — LAUNCH DETECTED' : 'NO ACTIVE TRACKS') : 'NO ACTIVE TRACKS — START A SCENARIO AT THE CONSOLE'}</div>`;
        threatRowRefs = [];
      } else {
        threatRows.innerHTML = snapshot.tracks.map((tr) => {
          const decoy = tr.classified.startsWith('DECOY');
          const cls = ['row', decoy ? 'decoy' : '', tr.assignedBattery ? 'assigned' : '', tr.id === snapshot.selectedTrackId ? 'selected' : ''].join(' ');
          return `<div class="${cls}"><span class="glyph">${decoy ? GLYPH.decoy : GLYPH.hostile}</span><span class="tid">${tr.id}</span><span class="cls"></span><span class="alt"></span><span class="rng"></span>${tr.assignedBattery ? `<span class="asg">→${tr.assignedBattery.slice(0, 4).toUpperCase()}</span>` : ''}</div>`;
        }).join('');
        threatRowRefs = [...threatRows.children].map((r) => ({
          cls: r.querySelector('.cls'), alt: r.querySelector('.alt'), rng: r.querySelector('.rng'),
        }));
      }
    }
    if (snapshot.tracks.length) {
      const vals = snapshot.tracks.map((tr) => `${tr.classified}:${q100(tr.alt)}:${q100(tr.range)}`).join('|');
      if (vals !== sig.threatsVals) {
        sig.threatsVals = vals;
        for (let i = 0; i < snapshot.tracks.length; i++) {
          const tr = snapshot.tracks[i];
          const ref = threatRowRefs[i];
          if (!ref) continue;
          ref.cls.textContent = tr.classified;
          ref.alt.textContent = fmtKm(q100(tr.alt));
          ref.rng.textContent = fmtKm(q100(tr.range));
        }
      }
    }

    // battery cards
    const battSig = snapshot.batteries.map((b) => `${b.id}:${b.state}:${b.ammo}:${Math.ceil(b.readyIn)}`).join('|') + snapshot.selectedBatteryId;
    if (battSig !== sig.batts) {
      sig.batts = battSig;
      for (const b of snapshot.batteries) {
        const card = battCards.get(b.id);
        if (!card) continue;
        card.classList.toggle('selected', b.id === snapshot.selectedBatteryId);
        card.querySelector('.state').textContent = b.state + (b.state === 'RELOADING' ? ` ${Math.ceil(b.readyIn)}s` : '');
        card.querySelector('.state').className = 'state ' + b.state.split(' ')[0];
        card.querySelector('.pips').textContent = '▮'.repeat(b.ammo) + '▯'.repeat(Math.max(0, b.maxAmmo - b.ammo));
      }
    }

    // status strip
    const chips = [];
    chips.push(`<span class="chip batt"><span class="lbl">BTRY</span>${snapshot.selectedBatteryName}</span>`);
    if (snapshot.assignment) {
      chips.push(`<span class="chip asg"><span class="lbl">ASSIGNED</span>${snapshot.assignment.trackId} → ${snapshot.assignment.batteryName}</span>`);
    }
    if (snapshot.inFlight > 0) {
      chips.push(`<span class="chip flight"><span class="lbl">IN FLIGHT</span>${GLYPH.interceptor} ${snapshot.inFlight} INTERCEPTOR${snapshot.inFlight > 1 ? 'S' : ''}</span>`);
    }
    if (snapshot.phase === 'active') {
      chips.push(`<span class="chip"><span class="lbl">THREATS</span>${snapshot.threatsRemaining} REMAIN</span>`);
    }
    const stripHtml = chips.join('');
    if (stripHtml !== sig.strip) {
      sig.strip = stripHtml;
      statusStrip.innerHTML = stripHtml;
    }

    // console panel state
    if (snapshot.mode === 'console') {
      const cSig = `${snapshot.timeOfDay}|${snapshot.scenario}|${snapshot.selectedBatteryId}|${snapshot.phase}|${snapshot.selectedTrackId}|${snapshot.selectedBatteryReady}|${!!snapshot.assignment}|${snapshot.engageHint}`;
      if (cSig !== sig.console) {
        sig.console = cSig;
        for (const b of optTime.children) {
          const on = b.dataset.id === snapshot.timeOfDay;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on);
        }
        for (const b of optScenario.children) {
          const on = b.dataset.id === snapshot.scenario;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on);
        }
        for (const b of optBattery.children) {
          const on = b.dataset.id === snapshot.selectedBatteryId;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', on);
        }
        btnStart.disabled = snapshot.phase === 'active' || !snapshot.scenario;
        btnStart.textContent = snapshot.phase === 'active' ? '… RAID IN PROGRESS …' : '▶ START BALLISTIC MISSILES';
        btnAssign.disabled = !snapshot.selectedTrackId || !snapshot.selectedBatteryReady;
        btnAuthorize.disabled = !snapshot.assignment;
        engageStatus.textContent = snapshot.engageHint ?? '';
      }

      // track list: rebuild only when membership/selection/classes change
      let tStruct = snapshot.tracks
        .map((tr) => `${tr.id}:${tr.classified.startsWith('DECOY') ? 1 : 0}:${tr.id === snapshot.selectedTrackId ? 1 : 0}:${tr.assignedBattery ? 1 : 0}`)
        .join('|');
      if (!snapshot.tracks.length) tStruct = `none:${snapshot.phase}`;
      if (tStruct !== sig.trackStruct) {
        sig.trackStruct = tStruct;
        sig.trackVals = '';
        if (!snapshot.tracks.length) {
          trackList.innerHTML = `<div class="none">No detected tracks. ${snapshot.phase === 'active' ? 'Radar searching…' : 'Press START.'}</div>`;
          trackBtnRefs = [];
        } else {
          trackList.innerHTML = snapshot.tracks.map((tr) => {
            const decoy = tr.classified.startsWith('DECOY');
            const c = ['', decoy ? 'decoy' : '', tr.id === snapshot.selectedTrackId ? 'selected' : '', tr.assignedBattery ? 'assigned' : ''].join(' ');
            return `<button data-id="${tr.id}" class="${c}" aria-label="Select track ${tr.id}" aria-pressed="${tr.id === snapshot.selectedTrackId}"><span class="glyph">${decoy ? GLYPH.decoy : GLYPH.hostile}</span><b>${tr.id}</b><span class="cls"></span><span class="alt"></span><span class="rng"></span></button>`;
          }).join('');
          trackBtnRefs = [...trackList.children].map((b) => ({
            cls: b.querySelector('.cls'), alt: b.querySelector('.alt'), rng: b.querySelector('.rng'),
          }));
        }
      }
      if (snapshot.tracks.length) {
        const vals = snapshot.tracks.map((tr) => `${tr.classified}:${q100(tr.alt)}:${q100(tr.range)}`).join('|');
        if (vals !== sig.trackVals) {
          sig.trackVals = vals;
          for (let i = 0; i < snapshot.tracks.length; i++) {
            const tr = snapshot.tracks[i];
            const ref = trackBtnRefs[i];
            if (!ref) continue;
            ref.cls.textContent = tr.classified;
            ref.alt.textContent = `ALT ${fmtKm(q100(tr.alt))}`;
            ref.rng.textContent = `RNG ${fmtKm(q100(tr.range))}`;
          }
        }
      }
    }

    if (snapshot.tabletOpen) updateTablet(snapshot);
    updateAimBracket(snapshot);
  }

  const api = {
    handlers,
    toast,
    showBanner,
    flashImpact,
    showDebrief,
    hideDebrief,
    update,
    showTablet(v) {
      tablet.classList.toggle('open', !!v);
      document.body.classList.toggle('tablet-on', !!v);
      if (v) { tsig.batts = ''; tsig.trackStruct = ''; tsig.foot = ''; tsig.hint = '\u0000'; }
    },
    setCinema(on, label = '') {
      cinema.classList.toggle('on', !!on);
      document.body.classList.toggle('cinema-on', !!on);
      if (label) cinemaLabel.textContent = label;
    },
    setPrompt(html, interact = false) {
      if (!html) {
        prompt.style.display = 'none';
      } else {
        prompt.style.display = 'block';
        prompt.classList.toggle('interact', interact);
        prompt.innerHTML = html;
      }
    },
    showConsole(v) {
      consolePanel.style.display = v ? 'block' : 'none';
    },
    showSettings(v) {
      settings.style.display = v ? 'flex' : 'none';
      if (v) {
        setReduced.checked = ctx.settings.reducedMotion;
        setVolume.value = String(ctx.settings.volume);
        setMute.checked = ctx.audio?.muted ?? false;
        setQuality.value = ctx.settings.quality;
      }
    },
    get settingsOpen() { return settings.style.display === 'flex'; },
    hideIntro() { intro.classList.add('hidden'); },
    crosshair(v) { root.querySelector('#crosshair').style.display = v ? 'block' : 'none'; },
  };

  // event-driven feed messages
  ctx.events.on('threat-tracked', ({ track }) => toast(`NEW TRACK ${track.id} — ACQUIRING`, 'warn'));
  ctx.events.on('scenario-started', ({ name }) => {
    showBanner('RAID WARNING', 'warn', SCENARIOS[name]?.name ?? '', 3);
    toast(`SCENARIO ${SCENARIOS[name]?.name ?? name} — INBOUND FIRE DETECTED`, 'bad', 8);
  });
  ctx.events.on('track-assigned', ({ track, battery }) => toast(`${track.id} ASSIGNED → ${battery.def.name}`, 'info'));
  ctx.events.on('launch-authorized', ({ track, battery }) => toast(`LAUNCH AUTHORIZED — ${battery.def.name} vs ${track.id}`, 'warn'));
  ctx.events.on('interceptor-launched', ({ battery }) => toast(`BIRD AWAY — ${battery.def.name}`, 'info', 4));
  ctx.events.on('intercept-success', ({ threat, decoy }) => {
    const tr = ctx.radar.trackFor?.(threat);
    if (decoy) {
      showBanner('DECOY DESTROYED', 'warn', 'ROUND EXPENDED ON DECOY');
      toast(`${tr?.id ?? 'TRACK'} WAS A DECOY — ROUND WASTED`, 'warn', 7);
    } else {
      showBanner('INTERCEPT', 'good', `${tr?.id ?? 'TRACK'} DESTROYED`);
      toast(`${tr?.id ?? 'TRACK'} INTERCEPTED`, 'good', 7);
    }
  });
  ctx.events.on('intercept-miss', ({ threat, reason }) => {
    // target already destroyed by a sibling salvo round: quiet self-destruct
    if (!threat || !threat.alive) {
      toast('ROUND SAFED — TARGET ALREADY DOWN', 'info', 4);
      return;
    }
    const tr = ctx.radar.trackFor?.(threat);
    showBanner('MISS', 'bad', reason, 2.2);
    toast(`INTERCEPT FAILED vs ${tr?.id ?? '?'} — ${reason}`, 'bad', 7);
  });
  ctx.events.on('threat-impact', ({ onBase, threat }) => {
    const tr = ctx.radar?.trackFor?.(threat);
    if (onBase) {
      showBanner('IMPACT — BASE STRUCK', 'bad', tr?.id ?? '', 3);
      flashImpact();
      toast(`${tr?.id ?? 'THREAT'} IMPACTED INSIDE PERIMETER`, 'bad', 8);
    } else {
      toast(`${tr?.id ?? 'THREAT'} IMPACT OFF-BASE`, 'warn', 6);
    }
  });
  ctx.events.on('battery-ready', ({ battery }) => toast(`${battery.def.name} READY`, 'good', 3));

  return api;
}
