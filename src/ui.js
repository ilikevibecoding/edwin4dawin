// ui.js — DOM HUD, console panel, debrief + settings modals, event feed.
// Everything is driven by game state snapshots + events from main.js.
import { Vector3 } from 'three';
import { fmtKm, clamp } from './util.js';
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
      <b>WASD</b> move &nbsp;<b>SHIFT</b> sprint &nbsp;<b>E</b> interact / assign<br/>
      <b>F</b> authorize launch &nbsp;<b>1·2·3</b> battery &nbsp;<b>TAB</b> console &nbsp;<b>H</b> settings
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
      TAB or walk to the C2 shelter console to start a raid<br/>
      Look at a track: E assign battery · F authorize launch
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
