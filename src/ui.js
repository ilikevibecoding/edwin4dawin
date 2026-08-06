// All DOM UI: HUD (crosshair, statuses, ticker, prompts), the command
// console side panel, start overlay with settings, debrief screen.
// Pure DOM + CSS, no frameworks. main.js wires the actions.
import { SCENARIOS, BATTERIES } from './constants.js';

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

const stateCls = (st) => (st === 'READY' ? 'ok' : (st === 'EMPTY' ? 'bad' : 'warn'));

/** thin battery readiness bar; PREP/RELOAD animate a fill timed from the
 *  battery constants (state transitions arrive within one UI tick) */
function batBarHtml(b) {
  const def = BATTERIES[b.id];
  if (b.state === 'PREP') return `<div class="cb-bar st-prep"><i style="animation-duration:${def.prepTime}s"></i></div>`;
  if (b.state === 'RELOAD') return `<div class="cb-bar st-reload"><i style="animation-duration:${def.reloadTime}s"></i></div>`;
  if (b.state === 'EMPTY') return '<div class="cb-bar st-empty"><i></i></div>';
  return '<div class="cb-bar st-ready"><i></i></div>';
}

function ammoPips(b) {
  return '▮'.repeat(b.ammo) + '▯'.repeat(Math.max(0, b.maxAmmo - b.ammo));
}

export class UI {
  constructor() {
    this.actions = null;
    this.root = el('div', 'ui-root');
    document.body.appendChild(this.root);
    this._tickerLines = [];
    this._bannerTimer = null;
    this._lastHudSig = null;
    this._aimHtml = null;
    this._interactHtml = null;
    this._altPrev = new Map();
  }

  init(actions) {
    this.actions = actions;
    this._buildHUD();
    this._buildConsole();
    this._buildStart();
    this._buildDebrief();
    this._buildHelp();
  }

  /** per-row signature-guarded list sync: rows are only rewritten when their
   *  own signature changes, so CSS bar animations on other rows keep running */
  _syncList(container, sigs, htmlFn, bindFn) {
    const prev = container._sigs;
    if (!prev || prev.length !== sigs.length) {
      container.innerHTML = sigs.map((_, i) => htmlFn(i)).join('');
      for (let i = 0; i < container.children.length; i++) bindFn(container.children[i], i);
    } else {
      for (let i = 0; i < sigs.length; i++) {
        if (prev[i] === sigs[i]) continue;
        const old = container.children[i];
        old.insertAdjacentHTML('beforebegin', htmlFn(i));
        const fresh = old.previousElementSibling;
        old.remove();
        bindFn(fresh, i);
      }
    }
    container._sigs = sigs;
  }

  // ------------------------------------------------------------------ HUD
  _buildHUD() {
    const hud = el('div', 'hud');
    this.hud = hud;
    this.root.appendChild(hud);

    this.crosshair = el('div', 'crosshair', '<div class="ch-dot"></div>');
    hud.appendChild(this.crosshair);
    this.aimPrompt = el('div', 'aim-prompt hidden');
    hud.appendChild(this.aimPrompt);

    this.topLeft = el('div', 'panel top-left');
    hud.appendChild(this.topLeft);
    this.topRight = el('div', 'panel top-right');
    hud.appendChild(this.topRight);
    this.ticker = el('div', 'ticker');
    hud.appendChild(this.ticker);
    this.hintBar = el('div', 'hint-bar');
    hud.appendChild(this.hintBar);
    this.banner = el('div', 'banner hidden');
    hud.appendChild(this.banner);
    this.interactPrompt = el('div', 'interact-prompt hidden');
    hud.appendChild(this.interactPrompt);
    this.perfBox = el('div', 'perf hidden');
    hud.appendChild(this.perfBox);

    // compact mid-session pause overlay (pointer lock lost via ESC)
    this.pauseEl = el('div', 'pause-overlay hidden');
    this.pauseEl.innerHTML = '<div class="pause-box"><div class="pause-title">PAUSED</div><div class="pause-sub">CLICK TO RE-ENTER THE RANGE</div></div>';
    this.pauseEl.addEventListener('click', () => this.actions.enterRange());
    this.root.appendChild(this.pauseEl);
  }

  showPause(v) { this.pauseEl.classList.toggle('hidden', !v); }

  setPerf(text) {
    if (text === null) { this.perfBox.classList.add('hidden'); return; }
    this.perfBox.classList.remove('hidden');
    this.perfBox.textContent = text;
  }

  showBanner(text, cls = '', dur = 3.2) {
    this.banner.textContent = text;
    this.banner.className = 'banner hidden';
    void this.banner.offsetWidth;           // restart slide/flash animation
    this.banner.className = `banner ${cls}`;
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => this.banner.classList.add('hidden'), dur * 1000);
  }

  log(text, cls = '') {
    const stamp = new Date().toISOString().substr(14, 5);
    this._tickerLines.push({ text: `${stamp} ${text}`, cls });
    if (this._tickerLines.length > 7) this._tickerLines.shift();
    this.ticker.innerHTML = this._tickerLines
      .map((l, i) => `<div class="tk ${l.cls}" style="opacity:${0.4 + 0.6 * (i / this._tickerLines.length)}">${l.text}</div>`)
      .join('');
  }

  setAimPrompt(html) {
    if (!html) {
      this.aimPrompt.classList.add('hidden');
      this._aimHtml = null;
      return;
    }
    if (html !== this._aimHtml) {
      this._aimHtml = html;
      this.aimPrompt.innerHTML = html;
      // classification tint for the target box (content comes from main.js)
      const cls = html.includes('HOSTILE') ? 'hostile'
        : html.includes('DECOY') ? 'decoy'
          : html.includes('AMBIG') ? 'ambig' : 'unknown';
      this.aimPrompt.className = `aim-prompt cls-${cls}`;
    }
    this.aimPrompt.classList.remove('hidden');
  }

  setInteractPrompt(html) {
    if (!html) {
      this.interactPrompt.classList.add('hidden');
      this._interactHtml = null;
      return;
    }
    if (html !== this._interactHtml) {
      this._interactHtml = html;
      this.interactPrompt.innerHTML = html;
    }
    this.interactPrompt.classList.remove('hidden');
  }

  /** cheap-to-call every frame; DOM only rewritten when content changes */
  updateHUD(s) {
    const trackedN = s.tracks.filter(t => t.state === 'TRACK').length;
    const sig = [s.phase, s.scenario, s.tod, s.threatsActive, s.tracks.length, trackedN, s.inFlight, s.selectedTrackId, s.selectedBattery].join('|');
    if (sig !== this._lastHudSig) {
      this._lastHudSig = sig;
      const sc = SCENARIOS[s.scenario];
      this.topLeft.innerHTML = `
        <div class="hd">CASTELLAN RIDGE — AIR DEFENSE SIM</div>
        <div class="row"><span>SCENARIO</span><b>${sc.name}</b></div>
        <div class="row"><span>CONDITION</span><b>${s.tod.toUpperCase()}</b></div>
        <div class="row"><span>PHASE</span><b class="${s.phase === 'active' ? 'warn' : ''}">${s.phase.toUpperCase()}</b></div>
        <div class="row"><span>THREATS ACTIVE</span><b class="${s.threatsActive ? 'bad' : ''}">${s.threatsActive}</b></div>
        <div class="row"><span>TRACKS</span><b>${trackedN}/${s.tracks.length}</b></div>
        <div class="row"><span>INTERCEPTORS</span><b class="${s.inFlight ? 'cyan' : ''}">${s.inFlight ? s.inFlight + ' IN FLIGHT' : 'NONE'}</b></div>
        ${s.selectedTrackId ? `<div class="row"><span>TARGET</span><b class="warn">◈ ${s.selectedTrackId}</b></div>` : ''}
      `;
    }
    const bsigs = s.batteries.map(b => `${b.id}|${b.state}|${b.ammo}`);
    this._syncList(this.topRight, bsigs, (i) => {
      const b = s.batteries[i];
      return `
        <div class="bat-card" data-id="${b.id}" style="--c:${b.uiColor}">
          <div class="bc-top"><span class="bc-name">${b.name}</span><span class="bc-key">[${b.key}]</span></div>
          <div class="bc-mid"><span class="bc-state ${stateCls(b.state)}">${b.state}</span><span class="bc-count">${b.ammo}/${b.maxAmmo}</span></div>
          <div class="bc-ammo">${ammoPips(b)}</div>
          ${batBarHtml(b)}
        </div>`;
    }, () => {});
    for (const n of this.topRight.children) {
      n.classList.toggle('sel', n.dataset.id === s.selectedBattery);
    }
  }

  setHints(html) { this.hintBar.innerHTML = html; }

  // -------------------------------------------------------------- console
  _buildConsole() {
    const c = el('div', 'console hidden');
    this.consoleEl = c;
    this.root.appendChild(c);
    c.innerHTML = `
      <div class="con-head">
        <div class="con-title">FIRE DIRECTION CONSOLE</div>
        <div class="con-sub">CASTELLAN RIDGE — FICTIONAL TRAINING SIM</div>
      </div>
      <div class="con-section" id="con-setup">
        <div class="sec-label">CONDITIONS</div>
        <div class="seg" id="seg-tod"></div>
        <div class="sec-label">SCENARIO</div>
        <div class="seg" id="seg-scenario"></div>
        <button class="btn-start" id="btn-start">▶ START BALLISTIC MISSILES</button>
      </div>
      <div class="con-section">
        <div class="sec-label">BATTERIES</div>
        <div id="con-batteries"></div>
      </div>
      <div class="con-section">
        <div class="sec-label">TRACKS <span class="dim">(click blip or row)</span></div>
        <div class="track-head"><b>ID</b><span>CLASS</span><span>ALT</span><span>STATE</span><span class="asg">ASG</span></div>
        <div id="con-tracks" class="track-list">
          <div class="no-tracks">NO TRACKS — radar sweeping…</div>
        </div>
        <div class="con-actions">
          <button class="btn" id="btn-assign">ASSIGN</button>
          <button class="btn warn" id="btn-authorize">AUTHORIZE LAUNCH</button>
        </div>
      </div>
      <div class="con-foot">
        <button class="btn ghost" id="btn-exit">EXIT CONSOLE [ESC]</button>
      </div>
    `;
    // segmented buttons
    const segTod = c.querySelector('#seg-tod');
    for (const t of ['day', 'sunset', 'night']) {
      const b = el('button', 'seg-btn', t.toUpperCase());
      b.dataset.v = t;
      b.onclick = () => this.actions.setTod(t);
      segTod.appendChild(b);
    }
    const segSc = c.querySelector('#seg-scenario');
    for (const s of Object.values(SCENARIOS)) {
      const b = el('button', 'seg-btn', s.name);
      b.dataset.v = s.id;
      b.title = s.blurb;
      b.onclick = () => this.actions.setScenario(s.id);
      segSc.appendChild(b);
    }
    c.querySelector('#btn-start').onclick = () => this.actions.startOrAbort();
    c.querySelector('#btn-assign').onclick = () => this.actions.assign();
    c.querySelector('#btn-authorize').onclick = () => this.actions.authorize();
    c.querySelector('#btn-exit').onclick = () => this.actions.exitConsole();
    this._conBatteries = c.querySelector('#con-batteries');
    this._conTracks = c.querySelector('#con-tracks');
    this._btnStart = c.querySelector('#btn-start');
  }

  setConsoleVisible(v) {
    this.consoleEl.classList.toggle('hidden', !v);
    this.crosshair.classList.toggle('hidden', v);
  }

  updateConsole(s) {
    // segmented states
    for (const b of this.consoleEl.querySelectorAll('#seg-tod .seg-btn')) {
      b.classList.toggle('on', b.dataset.v === s.tod);
    }
    for (const b of this.consoleEl.querySelectorAll('#seg-scenario .seg-btn')) {
      b.classList.toggle('on', b.dataset.v === s.scenario);
    }
    this._btnStart.textContent = s.phase === 'active' ? '■ ABORT SCENARIO' : '▶ START BALLISTIC MISSILES';
    this._btnStart.classList.toggle('running', s.phase === 'active');

    // batteries — selection is applied as a class so rows never rebuild for it
    const bsigs = s.batteries.map(b => `${b.id}|${b.state}|${b.ammo}`);
    this._syncList(this._conBatteries, bsigs, (i) => {
      const b = s.batteries[i];
      return `
        <div class="con-bat" data-id="${b.id}" style="--c:${b.uiColor}">
          <div class="cb-main">
            <div class="cb-name">${b.name} <span class="cb-key">[${b.key}]</span></div>
            <div class="cb-desc">${b.blurb}</div>
            ${batBarHtml(b)}
          </div>
          <div class="cb-right">
            <div class="bc-state ${stateCls(b.state)}">${b.state}</div>
            <div class="cb-pips">${ammoPips(b)}</div>
            <div class="cb-count">${b.ammo}/${b.maxAmmo}</div>
          </div>
        </div>`;
    }, (node) => { node.onclick = () => this.actions.selectBattery(node.dataset.id); });
    for (const n of this._conBatteries.children) {
      n.classList.toggle('sel', n.dataset.id === s.selectedBattery);
    }

    // tracks
    if (!s.tracks.length) {
      if (this._conTracks._sigs !== null || !this._conTracks.querySelector('.no-tracks')) {
        this._conTracks.innerHTML = '<div class="no-tracks">NO TRACKS — radar sweeping…</div>';
        this._conTracks._sigs = null;
      }
    } else {
      const prevAlt = this._altPrev;
      const tsigs = s.tracks.map(t => `${t.id}|${t.state}|${t.classification}|${Math.round(t.alt / 100)}|${t.assignedBattery}`);
      this._syncList(this._conTracks, tsigs, (i) => {
        const t = s.tracks[i];
        const pa = prevAlt.get(t.id);
        const trend = pa === undefined ? ''
          : (t.alt < pa - 1 ? '<em class="tr-dn">▼</em>' : (t.alt > pa + 1 ? '<em class="tr-up">▲</em>' : ''));
        return `
          <div class="track-row cls-${t.classification.toLowerCase()}" data-id="${t.id}">
            <b>${t.id}</b>
            <span class="chip cls">${t.classification}</span>
            <span class="alt">${(t.alt / 1000).toFixed(1)}<i>km</i>${trend}</span>
            <span class="chip st${t.state === 'DETECT' ? ' pulse' : ''}">${t.state}</span>
            <span class="asg">${t.assignedBattery ? '→' + t.assignedBattery.slice(0, 3).toUpperCase() : ''}</span>
          </div>`;
      }, (node) => { node.onclick = () => this.actions.selectTrack(node.dataset.id); });
      for (const n of this._conTracks.children) {
        n.classList.toggle('sel', n.dataset.id === s.selectedTrackId);
      }
    }
    // remember altitudes for the closing-trend arrows
    this._altPrev = new Map(s.tracks.map(t => [t.id, t.alt]));
  }

  // ---------------------------------------------------------------- start
  _buildStart() {
    const s = el('div', 'start-overlay');
    this.startEl = s;
    this.root.appendChild(s);
    s.innerHTML = `
      <div class="start-box">
        <div class="st-kicker">FICTIONAL ENTERTAINMENT SIMULATION</div>
        <h1>CASTELLAN RIDGE</h1>
        <div class="st-sub">BALLISTIC MISSILE INTERCEPTOR RANGE</div>
        <p class="st-note">All systems, ranges and behaviors are invented and balanced for gameplay.
        Inspired by the look of real air-defense hardware — not how any of it works.</p>
        <div class="st-controls">
          <div><b>WASD</b> move</div><div><b>SHIFT</b> sprint</div>
          <div><b>MOUSE</b> look</div><div><b>E</b> interact / assign</div>
          <div><b>F</b> authorize launch</div><div><b>1·2·3</b> select battery</div>
          <div><b>TAB</b> command console</div><div><b>R</b> restart scenario</div>
          <div><b>H</b> help</div><div><b>M</b> mute</div>
        </div>
        <div class="st-settings">
          <label><input type="checkbox" id="opt-reduced"> Reduced motion (no head-bob / shake)</label>
          <label><input type="checkbox" id="opt-mute"> Mute audio</label>
          <label>Quality
            <select id="opt-quality">
              <option value="2">High</option>
              <option value="1">Medium</option>
              <option value="0">Low</option>
            </select>
          </label>
        </div>
        <button class="btn-enter" id="btn-enter">ENTER THE RANGE</button>
        <div class="st-tip">Walk to the command shelter and press <b>TAB</b> (or E at the console) to begin a scenario.</div>
      </div>
    `;
    s.querySelector('#btn-enter').onclick = () => this.actions.enterRange();
    const red = s.querySelector('#opt-reduced');
    const mute = s.querySelector('#opt-mute');
    const qual = s.querySelector('#opt-quality');
    red.checked = localStorage.getItem('cr-reduced') === '1';
    mute.checked = localStorage.getItem('cr-mute') === '1';
    qual.value = localStorage.getItem('cr-quality') ?? '2';
    red.onchange = () => { localStorage.setItem('cr-reduced', red.checked ? '1' : '0'); this.actions.setReducedMotion(red.checked); };
    mute.onchange = () => { localStorage.setItem('cr-mute', mute.checked ? '1' : '0'); this.actions.setMuted(mute.checked); };
    qual.onchange = () => { localStorage.setItem('cr-quality', qual.value); this.actions.setQuality(+qual.value); };
    this.initialSettings = { reduced: red.checked, mute: mute.checked, quality: +qual.value };
  }

  showStart(v) { this.startEl.classList.toggle('hidden', !v); }

  // -------------------------------------------------------------- debrief
  _buildDebrief() {
    const d = el('div', 'debrief hidden');
    this.debriefEl = d;
    this.root.appendChild(d);
  }

  showDebrief(data) {
    const { results, stats, rating } = data;
    this.debriefEl.classList.remove('hidden');
    this.debriefEl.innerHTML = `
      <div class="db-box">
        <div class="db-head">ENGAGEMENT DEBRIEF</div>
        <div class="db-rating ${rating.cls}">${rating.text}</div>
        <div class="db-stats">
          <div><b>${stats.intercepted}</b><span>INTERCEPTED</span></div>
          <div><b>${stats.impacts}</b><span>IMPACTS</span></div>
          <div><b>${stats.missed}</b><span>MISSES</span></div>
          <div><b>${stats.decoysHit}</b><span>DECOYS HIT</span></div>
          <div><b>${stats.fired}</b><span>ROUNDS FIRED</span></div>
        </div>
        <div class="db-list">
          ${results.map(r => `<div class="db-row db-${r.type.toLowerCase()}"><b>${r.type}</b><span>${r.text}</span></div>`).join('')}
          <div class="db-row db-total"><b>TOTALS</b><span>${results.length} ${results.length === 1 ? 'event' : 'events'} · ${stats.fired} ${stats.fired === 1 ? 'round' : 'rounds'} expended · ${stats.intercepted} killed · ${stats.impacts} leaked</span></div>
        </div>
        <div class="db-actions">
          <button class="btn warn" id="db-restart">RESTART SCENARIO [R]</button>
          <button class="btn" id="db-console">CHANGE SETUP</button>
          <button class="btn ghost" id="db-close">CLOSE</button>
        </div>
      </div>
    `;
    this.debriefEl.querySelector('#db-restart').onclick = () => this.actions.restart();
    this.debriefEl.querySelector('#db-console').onclick = () => { this.hideDebrief(); this.actions.openConsole(); };
    this.debriefEl.querySelector('#db-close').onclick = () => this.hideDebrief();
  }
  hideDebrief() { this.debriefEl.classList.add('hidden'); }
  get debriefVisible() { return !this.debriefEl.classList.contains('hidden'); }

  // ----------------------------------------------------------------- help
  _buildHelp() {
    const h = el('div', 'help hidden');
    this.helpEl = h;
    this.root.appendChild(h);
    h.innerHTML = `
      <div class="help-box">
        <div class="db-head">FIELD MANUAL</div>
        <ol>
          <li>Open the <b>command console</b> (TAB, or walk to the shelter and press E).</li>
          <li>Pick <b>conditions</b> and a <b>scenario</b>, then press <b>START BALLISTIC MISSILES</b>.</li>
          <li>Watch the radar detect inbound tracks (red = hostile, amber = unclassified, grey = decoy).</li>
          <li>Select a track (click the holo blip or list row) and a battery, press <b>ASSIGN</b>, then <b>AUTHORIZE LAUNCH</b>.</li>
          <li>Outdoors: look at a track, press <b>E</b> to assign your selected battery, <b>F</b> to authorize.</li>
          <li>RAMPART kills low, ZENITH kills high, SENTINEL reaches far — match the battery to the threat.</li>
        </ol>
        <div class="st-note">Fictional demo. Numbers are gameplay values, not real system data.</div>
        <button class="btn" id="help-close">CLOSE [H]</button>
      </div>
    `;
    h.querySelector('#help-close').onclick = () => this.toggleHelp(false);
  }
  toggleHelp(force) {
    const want = force !== undefined ? !force : !this.helpEl.classList.contains('hidden');
    this.helpEl.classList.toggle('hidden', want);
  }
}
