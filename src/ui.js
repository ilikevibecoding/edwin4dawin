// All DOM interface: heads-up display, world-space threat markers, the command
// console overlay, the title card, settings and accessibility options.

const KEYCAPS = [
  ['WASD', 'MOVE'],
  ['SHIFT', 'SPRINT'],
  ['MOUSE', 'LOOK'],
  ['T', 'CYCLE TRACK'],
  ['B', 'CYCLE BATTERY'],
  ['E', 'ASSIGN'],
  ['F', 'AUTHORIZE'],
  ['TAB', 'CONSOLE'],
  ['R', 'RESTART'],
  ['ESC', 'RELEASE MOUSE'],
];

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export class UI {
  constructor(handlers = {}) {
    this.h = handlers;
    this.markerPool = [];
    this.logLines = [];
    this.lastText = new Map();
    this.consoleOpen = false;
    this.captionTimer = 0;
  }

  mount(root) {
    this.root = root;
    this._buildTitle();
    this._buildHud();
    this._buildConsole();
    this._buildMisc();
    return this;
  }

  _set(node, text) {
    if (this.lastText.get(node) === text) return;
    this.lastText.set(node, text);
    node.textContent = text;
  }

  _setCls(node, cls) {
    if (node.className !== cls) node.className = cls;
  }

  // -------------------------------------------------------------------- title

  _buildTitle() {
    const t = el('div');
    t.id = 'title';
    const inner = el('div', 'inner');
    inner.appendChild(el('h1', null, 'AEGIS LINE'));
    inner.appendChild(el('div', 'tag', 'FICTIONAL AIR DEFENCE SITE / INTERCEPT DEMONSTRATOR'));
    inner.appendChild(el('div', 'desc',
      'You are the duty operator at a fictional interceptor range. Walk the site, '
      + 'inspect the launchers, then take the command console and defend the pad '
      + 'against inbound ballistic targets.<br>Three batteries, three scenarios, '
      + 'three lighting conditions.'));
    const keys = el('div', 'keys');
    for (const [k, v] of KEYCAPS) keys.appendChild(el('div', 'keycap', `<b>${k}</b> ${v}`));
    inner.appendChild(keys);
    const btn = el('button', 'start', 'ENTER THE SITE');
    btn.addEventListener('click', () => this.h.onStart?.());
    inner.appendChild(btn);
    inner.appendChild(el('div', 'disclaimer',
      'Entertainment demonstration only. Every system, range, speed, radar behaviour, '
      + 'guidance law and procedure in this build is invented and balanced for gameplay. '
      + 'Names such as PALISADE, HALBERD and SENTINEL are fictional. Nothing here represents '
      + 'real hardware performance, real doctrine or real operating procedure.'));
    t.appendChild(inner);
    this.root.appendChild(t);
    this.title = t;
    this.startButton = btn;
  }

  showTitle() {
    this.title.classList.remove('off');
  }

  hideTitle() {
    this.title.classList.add('off');
  }

  // ---------------------------------------------------------------------- hud

  _buildHud() {
    const hud = el('div');
    hud.id = 'hud';

    // top status strip
    const top = el('div', 'panel bracket');
    top.id = 'topbar';
    this.topCells = {};
    for (const [key, label] of [
      ['scenario', 'SCENARIO'], ['condition', 'CONDITION'], ['clock', 'MISSION'],
      ['inbound', 'INBOUND'], ['flight', 'IN FLIGHT'], ['killed', 'DESTROYED'], ['leak', 'IMPACTS'],
    ]) {
      const cell = el('div', 'cell');
      cell.appendChild(el('div', 'k', label));
      const v = el('div', 'v', '--');
      cell.appendChild(v);
      top.appendChild(cell);
      this.topCells[key] = v;
    }
    hud.appendChild(top);

    // compass
    const compass = el('div');
    compass.id = 'compass';
    const strip = el('div', 'strip');
    compass.appendChild(strip);
    compass.appendChild(el('div', 'center'));
    this.compassStrip = strip;
    this.compassTicks = [];
    for (let deg = -180; deg <= 180; deg += 15) {
      const card = { 0: 'N', 90: 'E', 180: 'S', '-180': 'S', '-90': 'W' }[deg];
      const tick = el('div', 'tick' + (card ? ' card' : ''), card || String(((deg % 360) + 360) % 360));
      strip.appendChild(tick);
      this.compassTicks.push({ deg, node: tick });
    }
    hud.appendChild(compass);

    // battery panel
    const bp = el('div', 'panel bracket');
    bp.id = 'battery-panel';
    const bpTitle = el('div', 'panel-title');
    bpTitle.appendChild(el('span', null, 'SELECTED BATTERY'));
    this.batterySelHint = el('span', null, '[B]');
    bpTitle.appendChild(this.batterySelHint);
    bp.appendChild(bpTitle);
    const bpBody = el('div', 'body');
    this.batteryName = el('div', 'name', '--');
    this.batteryRole = el('div', 'role', '--');
    bpBody.appendChild(this.batteryName);
    bpBody.appendChild(this.batteryRole);
    this.batteryRows = {};
    for (const [key, label] of [['status', 'STATUS'], ['rounds', 'ROUNDS'], ['band', 'OPT. BAND'], ['assigned', 'ASSIGNED']]) {
      const row = el('div', 'row');
      row.appendChild(el('span', 'lbl', label));
      const v = el('span', 'val', '--');
      row.appendChild(v);
      bpBody.appendChild(row);
      this.batteryRows[key] = v;
    }
    this.ammoBar = el('div', 'ammo-bar');
    bpBody.appendChild(this.ammoBar);
    this.batteryProgress = el('div', 'progress', '<i></i>');
    bpBody.appendChild(this.batteryProgress);
    bp.appendChild(bpBody);
    hud.appendChild(bp);

    // track list
    const tp = el('div', 'panel bracket');
    tp.id = 'tracks-panel';
    const tpTitle = el('div', 'panel-title');
    tpTitle.appendChild(el('span', null, 'AIR PICTURE'));
    this.trackCountLabel = el('span', null, '0');
    tpTitle.appendChild(this.trackCountLabel);
    tp.appendChild(tpTitle);
    this.trackList = el('div', 'body');
    tp.appendChild(this.trackList);
    hud.appendChild(tp);

    // event log
    const lp = el('div', 'panel bracket');
    lp.id = 'log-panel';
    lp.appendChild(el('div', 'panel-title', '<span>ENGAGEMENT LOG</span>'));
    this.logBody = el('div', 'body');
    lp.appendChild(this.logBody);
    hud.appendChild(lp);

    // summary
    const sp = el('div', 'panel bracket');
    sp.id = 'summary';
    sp.appendChild(el('div', 'panel-title', '<span>ROUNDS</span>'));
    const spBody = el('div', 'body');
    this.summaryRows = {};
    for (const [key, label] of [['launched', 'LAUNCHED'], ['hits', 'INTERCEPTS'], ['misses', 'MISSES'], ['decoys', 'DECOYS HIT']]) {
      const row = el('div', 'row');
      row.appendChild(el('span', 'lbl', label));
      const v = el('span', 'val', '0');
      row.appendChild(v);
      spBody.appendChild(row);
      this.summaryRows[key] = v;
    }
    sp.appendChild(spBody);
    hud.appendChild(sp);

    // reticle, prompt, markers, lead cue
    const ret = el('div', null, '<div class="h"></div><div class="v"></div><div class="dot"></div>');
    ret.id = 'reticle';
    hud.appendChild(ret);
    this.reticle = ret;

    const prompt = el('div', 'panel');
    prompt.id = 'target-prompt';
    this.promptTid = el('div', 'tid', '');
    this.promptHint = el('div', 'hint', '');
    prompt.appendChild(this.promptTid);
    prompt.appendChild(this.promptHint);
    hud.appendChild(prompt);
    this.prompt = prompt;

    const markers = el('div');
    markers.id = 'markers';
    hud.appendChild(markers);
    this.markers = markers;

    const lead = el('div', null, '<div class="ring"></div><div class="txt"></div>');
    lead.id = 'lead-cue';
    hud.appendChild(lead);
    this.leadCue = lead;
    this.leadText = lead.querySelector('.txt');

    // banner
    const banner = el('div', 'panel');
    banner.id = 'banner';
    this.bannerHead = el('div', 'head', '');
    this.bannerSub = el('div', 'sub', '');
    banner.appendChild(this.bannerHead);
    banner.appendChild(this.bannerSub);
    hud.appendChild(banner);
    this.banner = banner;

    // action hints
    const actions = el('div');
    actions.id = 'actions';
    this.actionNodes = {};
    for (const [key, html] of [
      ['assign', '<b>E</b> ASSIGN'],
      ['authorize', '<b>F</b> AUTHORIZE LAUNCH'],
      ['track', '<b>T</b> NEXT TRACK'],
      ['battery', '<b>B</b> NEXT BATTERY'],
      ['console', '<b>TAB</b> CONSOLE'],
      ['restart', '<b>R</b> RESTART'],
    ]) {
      const a = el('div', 'act', html);
      actions.appendChild(a);
      this.actionNodes[key] = a;
    }
    hud.appendChild(actions);

    this.root.appendChild(hud);
    this.hud = hud;
  }

  // ------------------------------------------------------------------ console

  _buildConsole() {
    const c = el('div');
    c.id = 'console';
    const frame = el('div', 'frame');

    const head = el('div', 'panel head-bar bracket');
    const hl = el('div');
    hl.appendChild(el('div', 'title', 'FIRE CONTROL CONSOLE'));
    hl.appendChild(el('div', 'sub', 'AEGIS LINE / SECTOR 1 / FICTIONAL TRAINING ARTICLE'));
    head.appendChild(hl);
    const hr = el('div');
    this.consoleClock = el('div', 'title', '00:00');
    hr.appendChild(this.consoleClock);
    this.consoleState = el('div', 'sub', 'STANDBY');
    hr.appendChild(this.consoleState);
    head.appendChild(hr);
    frame.appendChild(head);

    // ---- left column: conditions, scenario, settings ----
    const left = el('div', 'col');

    const condGroup = el('div', 'panel group bracket');
    condGroup.appendChild(el('div', 'glabel', '1 / Conditions'));
    const condOpts = el('div', 'opts');
    this.condButtons = {};
    for (const [id, label] of [['day', 'DAY'], ['sunset', 'SUNSET'], ['night', 'NIGHT']]) {
      const b = el('button', 'opt', label);
      b.addEventListener('click', () => this.h.onCondition?.(id));
      condOpts.appendChild(b);
      this.condButtons[id] = b;
    }
    condGroup.appendChild(condOpts);
    left.appendChild(condGroup);

    const scenGroup = el('div', 'panel group bracket');
    scenGroup.appendChild(el('div', 'glabel', '2 / Threat scenario'));
    this.scenButtons = {};
    const scenOpts = el('div', 'opts');
    for (const [id, label] of [['single', 'SINGLE TRACK'], ['saturation', 'SATURATION'], ['night', 'NIGHT RAID']]) {
      const b = el('button', 'opt', label);
      b.style.flexBasis = '100%';
      b.addEventListener('click', () => this.h.onScenario?.(id));
      scenOpts.appendChild(b);
      this.scenButtons[id] = b;
    }
    scenGroup.appendChild(scenOpts);
    this.scenBlurb = el('div', 'bb', '');
    this.scenBlurb.style.cssText = 'font-size:0.78em;color:#7fa899;margin-top:8px;line-height:1.5';
    scenGroup.appendChild(this.scenBlurb);
    left.appendChild(scenGroup);

    const setGroup = el('div', 'panel group bracket');
    setGroup.appendChild(el('div', 'glabel', 'Options / Accessibility'));
    this.toggles = {};
    for (const [key, label] of [
      ['reducedMotion', 'REDUCED MOTION'],
      ['highContrast', 'HIGH CONTRAST HUD'],
      ['captions', 'AUDIO CAPTIONS'],
      ['perf', 'PERFORMANCE READOUT'],
    ]) {
      const row = el('div', 'settings-row');
      row.appendChild(el('span', 'lbl', label));
      const t = el('div', 'toggle');
      t.addEventListener('click', () => this.h.onToggle?.(key));
      row.appendChild(t);
      setGroup.appendChild(row);
      this.toggles[key] = t;
    }
    const qRow = el('div', 'settings-row');
    qRow.appendChild(el('span', 'lbl', 'QUALITY'));
    const qOpts = el('div', 'opts');
    qOpts.style.gap = '4px';
    this.qualityButtons = {};
    for (const q of ['low', 'medium', 'high']) {
      const b = el('button', 'opt', q.toUpperCase());
      b.style.cssText = 'padding:4px 7px;font-size:0.74em';
      b.addEventListener('click', () => this.h.onQuality?.(q));
      qOpts.appendChild(b);
      this.qualityButtons[q] = b;
    }
    qRow.appendChild(qOpts);
    setGroup.appendChild(qRow);
    const volRow = el('div', 'settings-row');
    volRow.appendChild(el('span', 'lbl', 'VOLUME'));
    const vol = el('input');
    vol.type = 'range';
    vol.min = '0';
    vol.max = '100';
    vol.value = '70';
    vol.addEventListener('input', () => this.h.onVolume?.(Number(vol.value) / 100));
    volRow.appendChild(vol);
    setGroup.appendChild(volRow);
    const sensRow = el('div', 'settings-row');
    sensRow.appendChild(el('span', 'lbl', 'LOOK SENSITIVITY'));
    const sens = el('input');
    sens.type = 'range';
    sens.min = '20';
    sens.max = '300';
    sens.value = '100';
    sens.addEventListener('input', () => this.h.onSensitivity?.(Number(sens.value) / 100));
    sensRow.appendChild(sens);
    setGroup.appendChild(sensRow);
    left.appendChild(setGroup);
    frame.appendChild(left);

    // ---- centre column: scope ----
    const centre = el('div', 'col');
    const scopePanel = el('div', 'panel bracket');
    scopePanel.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0';
    const scopeTitle = el('div', 'panel-title');
    scopeTitle.appendChild(el('span', null, 'SURVEILLANCE PICTURE'));
    this.scopeHint = el('span', null, 'CLICK A TRACK TO SELECT');
    scopeTitle.appendChild(this.scopeHint);
    scopePanel.appendChild(scopeTitle);
    this.scopeWrap = el('div', 'scope-wrap');
    scopePanel.appendChild(this.scopeWrap);
    centre.appendChild(scopePanel);
    frame.appendChild(centre);

    // ---- right column: batteries + tracks ----
    const right = el('div', 'col');
    const battGroup = el('div', 'panel group bracket');
    battGroup.appendChild(el('div', 'glabel', '3 / Interceptor battery'));
    this.battCards = {};
    battGroup.appendChild((this.battCardHost = el('div')));
    right.appendChild(battGroup);

    const trkPanel = el('div', 'panel bracket');
    trkPanel.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column';
    trkPanel.appendChild(el('div', 'panel-title', '<span>TRACK LIST</span><span>PRIORITY ORDER</span>'));
    this.consoleTrackList = el('div', 'body console-tracks');
    trkPanel.appendChild(this.consoleTrackList);
    right.appendChild(trkPanel);
    frame.appendChild(right);

    // ---- footer: the big controls ----
    const foot = el('div', 'panel foot-bar bracket');
    this.startBtn = el('button', 'big-btn hazard', 'START BALLISTIC MISSILES');
    this.startBtn.addEventListener('click', () => this.h.onStartScenario?.());
    foot.appendChild(this.startBtn);
    this.assignBtn = el('button', 'act-btn', 'ASSIGN');
    this.assignBtn.addEventListener('click', () => this.h.onAssign?.());
    foot.appendChild(this.assignBtn);
    this.authorizeBtn = el('button', 'act-btn blue', 'AUTHORIZE LAUNCH');
    this.authorizeBtn.addEventListener('click', () => this.h.onAuthorize?.());
    foot.appendChild(this.authorizeBtn);
    this.restartBtn = el('button', 'act-btn', 'RESTART');
    this.restartBtn.addEventListener('click', () => this.h.onRestart?.());
    foot.appendChild(this.restartBtn);
    this.closeBtn = el('button', 'act-btn', 'STEP OUTSIDE [TAB]');
    this.closeBtn.addEventListener('click', () => this.h.onCloseConsole?.());
    foot.appendChild(this.closeBtn);
    frame.appendChild(foot);

    c.appendChild(frame);
    this.root.appendChild(c);
    this.console = c;
  }

  attachScope(canvas) {
    this.scopeWrap.appendChild(canvas);
    this.scopeCanvas = canvas;
    canvas.addEventListener('click', (ev) => {
      const r = canvas.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * 2 - 1;
      const y = ((ev.clientY - r.top) / r.height) * 2 - 1;
      this.h.onScopeClick?.(x, y);
    });
  }

  buildBatteryCards(batteries) {
    this.battCardHost.innerHTML = '';
    this.battCards = {};
    for (const b of batteries) {
      const card = el('button', 'batt-card');
      card.appendChild(el('div', 'bn', b.spec.name));
      card.appendChild(el('div', 'br', b.spec.role));
      card.appendChild(el('div', 'bb', b.spec.blurb));
      const st = el('div', 'bs');
      const status = el('span', 'st', 'READY');
      const rounds = el('span', null, '');
      st.appendChild(status);
      st.appendChild(rounds);
      card.appendChild(st);
      card.addEventListener('click', () => this.h.onBattery?.(b.id));
      this.battCardHost.appendChild(card);
      this.battCards[b.id] = { card, status, rounds };
    }
  }

  // -------------------------------------------------------------------- misc

  _buildMisc() {
    const p = el('div', 'panel');
    p.id = 'pause-hint';
    p.appendChild(el('div', 'big', 'MOUSE RELEASED'));
    p.appendChild(el('div', 'small', 'Click anywhere to resume look control'));
    this.root.appendChild(p);
    this.pauseHint = p;

    const perf = el('div');
    perf.id = 'perf';
    perf.className = 'hidden';
    this.root.appendChild(perf);
    this.perf = perf;

    const cap = el('div');
    cap.id = 'captions';
    this.root.appendChild(cap);
    this.captions = cap;
  }

  setPointerHint(show) {
    this.pauseHint.classList.toggle('on', show);
  }

  caption(text, seconds = 2.2) {
    if (!this.captionsEnabled) return;
    this.captions.textContent = text;
    this.captions.classList.add('on');
    this.captionTimer = seconds;
  }

  log(message, cls = '') {
    const line = el('div', 'log-line ' + cls, message);
    this.logBody.appendChild(line);
    this.logLines.push(line);
    while (this.logLines.length > 9) {
      const old = this.logLines.shift();
      old.remove();
    }
  }

  clearLog() {
    this.logBody.innerHTML = '';
    this.logLines.length = 0;
  }

  showBanner(head, sub, cls = '', seconds = 3.2) {
    this.bannerHead.textContent = head;
    this.bannerSub.textContent = sub || '';
    this.banner.className = 'panel on ' + cls;
    this.bannerTimer = seconds;
  }

  openConsole() {
    this.consoleOpen = true;
    this.console.classList.add('on');
    this.hud.classList.add('hidden');
  }

  closeConsole() {
    this.consoleOpen = false;
    this.console.classList.remove('on');
    this.hud.classList.remove('hidden');
  }

  // ------------------------------------------------------------------ update

  update(dt, s) {
    // banner + caption timers
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.banner.classList.remove('on');
    }
    if (this.captionTimer > 0) {
      this.captionTimer -= dt;
      if (this.captionTimer <= 0) this.captions.classList.remove('on');
    }

    const mm = Math.floor(s.elapsed / 60);
    const ss = Math.floor(s.elapsed % 60);
    const clock = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

    this._set(this.topCells.scenario, s.scenarioName);
    this._set(this.topCells.condition, s.conditionName);
    this._set(this.topCells.clock, clock);
    this._set(this.topCells.inbound, String(s.inbound));
    this._setCls(this.topCells.inbound, 'v ' + (s.inbound > 0 ? 'alert' : 'ok'));
    this._set(this.topCells.flight, String(s.inFlight));
    this._setCls(this.topCells.flight, 'v ' + (s.inFlight > 0 ? 'warn' : ''));
    this._set(this.topCells.killed, String(s.stats.intercepted));
    this._setCls(this.topCells.killed, 'v ok');
    this._set(this.topCells.leak, String(s.stats.impacted));
    this._setCls(this.topCells.leak, 'v ' + (s.stats.impacted > 0 ? 'alert' : ''));

    // battery panel
    const b = s.battery;
    if (b) {
      this._set(this.batteryName, b.spec.name);
      this._set(this.batteryRole, `${b.spec.role} / ${b.spec.tubes} TUBES`);
      this._set(this.batteryRows.status, b.status);
      this._setCls(this.batteryRows.status, 'val ' + (b.status === 'READY' ? 'ready' : b.status === 'EMPTY' ? 'bad' : 'busy'));
      this._set(this.batteryRows.rounds, `${b.loaded} LOADED / ${b.ammo} TOTAL`);
      const band = b.spec.idealAltitude;
      this._set(this.batteryRows.band, `${(band[0] / 1000).toFixed(0)}-${(band[1] / 1000).toFixed(0)} KM`);
      this._set(this.batteryRows.assigned, s.assignedTrackId || 'NONE');
      this._setCls(this.batteryRows.assigned, 'val ' + (s.assignedTrackId ? 'ready' : ''));

      if (this.ammoBar.children.length !== b.maxAmmo) {
        this.ammoBar.innerHTML = '';
        for (let i = 0; i < b.maxAmmo; i++) this.ammoBar.appendChild(el('div', 'ammo-cell'));
      }
      for (let i = 0; i < b.maxAmmo; i++) {
        const cell = this.ammoBar.children[i];
        const cls = i < b.loaded ? 'ammo-cell full' : i < b.ammo ? 'ammo-cell spare' : 'ammo-cell';
        this._setCls(cell, cls);
      }
      const bar = this.batteryProgress.firstChild;
      let pct = 0;
      if (b.status === 'PREPARING') pct = 100 * (1 - b.prepTimer / b.spec.prepTime);
      else if (b.status === 'RELOADING') pct = 100 * (1 - b.reloadTimer / b.spec.reloadTime);
      bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    }

    // track list
    this._set(this.trackCountLabel, String(s.tracks.length));
    this._renderTrackRows(this.trackList, s, false);
    if (this.consoleOpen) this._renderTrackRows(this.consoleTrackList, s, true);

    // summary
    this._set(this.summaryRows.launched, String(s.rounds.launched));
    this._set(this.summaryRows.hits, String(s.rounds.hits));
    this._set(this.summaryRows.misses, String(s.rounds.misses));
    this._set(this.summaryRows.decoys, String(s.rounds.decoyHits));

    // compass
    const yawDeg = ((-s.yaw * 180 / Math.PI) % 360 + 360) % 360;
    for (const t of this.compassTicks) {
      let rel = t.deg - yawDeg;
      while (rel > 180) rel -= 360;
      while (rel < -180) rel += 360;
      t.node.style.left = `${210 + rel * 2.2}px`;
      t.node.style.opacity = Math.abs(rel) > 92 ? '0' : '1';
    }

    // action affordances
    this.actionNodes.assign.className = 'act' + (s.canAssign ? '' : ' dim');
    this.actionNodes.authorize.className = 'act' + (s.canAuthorize ? ' hot' : ' dim');

    // prompt
    if (s.prompt) {
      this.prompt.classList.add('on');
      this._set(this.promptTid, s.prompt.title);
      this.promptHint.innerHTML = s.prompt.hint;
    } else {
      this.prompt.classList.remove('on');
    }

    // console-only text
    if (this.consoleOpen) {
      this._set(this.consoleClock, clock);
      this._set(this.consoleState, s.stateLabel);
      for (const [id, btn] of Object.entries(this.condButtons)) btn.classList.toggle('on', id === s.conditionId);
      for (const [id, btn] of Object.entries(this.scenButtons)) btn.classList.toggle('on', id === s.scenarioId);
      this._set(this.scenBlurb, s.scenarioBlurb || '');
      for (const [id, refs] of Object.entries(this.battCards)) {
        const bb = s.batteries.find((x) => x.id === id);
        refs.card.classList.toggle('on', s.battery && s.battery.id === id);
        this._set(refs.status, bb.status);
        refs.status.style.color = bb.status === 'READY' ? 'var(--green)' : bb.status === 'EMPTY' ? 'var(--red)' : 'var(--amber)';
        this._set(refs.rounds, `${bb.loaded}/${bb.ammo} ROUNDS`);
      }
      this.startBtn.classList.toggle('disabled', !s.canStart);
      this.startBtn.classList.toggle('armed', s.canStart && !s.running);
      this._set(this.startBtn, s.running ? 'SCENARIO RUNNING' : 'START BALLISTIC MISSILES');
      this.assignBtn.classList.toggle('disabled', !s.canAssign);
      this.authorizeBtn.classList.toggle('disabled', !s.canAuthorize);
      for (const [q, btn] of Object.entries(this.qualityButtons)) btn.classList.toggle('on', q === s.settings.quality);
      for (const [k, t] of Object.entries(this.toggles)) t.classList.toggle('on', !!s.settings[k]);
    }
  }

  _renderTrackRows(host, s, clickable) {
    const rows = s.tracks;
    while (host.children.length > rows.length) host.lastChild.remove();
    if (!rows.length) {
      if (!host.querySelector('.empty-note')) {
        host.innerHTML = '';
        host.appendChild(el('div', 'empty-note', '-- NO CONTACTS --'));
      }
      return;
    }
    const note = host.querySelector('.empty-note');
    if (note) note.remove();
    while (host.children.length < rows.length) {
      const row = el('div', 'track-row');
      row.appendChild(el('span', 'tid'));
      row.appendChild(el('span', 'cls'));
      row.appendChild(el('span', 'alt'));
      row.appendChild(el('span', 'tti'));
      if (clickable) {
        row.addEventListener('click', () => {
          const idx = Array.prototype.indexOf.call(host.children, row);
          this.h.onSelectTrackIndex?.(idx);
        });
      }
      host.appendChild(row);
    }
    for (let i = 0; i < rows.length; i++) {
      const tr = rows[i];
      const row = host.children[i];
      const decoy = tr.classification === 'DECOY';
      let cls = 'track-row';
      if (decoy) cls += ' decoy';
      if (tr.engaged) cls += ' eng';
      if (s.selectedTrack === tr) cls += ' sel';
      this._setCls(row, cls);
      this._set(row.children[0], tr.id);
      this._set(row.children[1], decoy ? 'DECOY' : tr.classification);
      this._set(row.children[2], `${(tr.altitude / 1000).toFixed(0)}km`);
      this._set(row.children[3], `${tr.timeToImpact.toFixed(0)}s`);
    }
  }

  /** Position the world-space threat brackets. `items` come from main.js. */
  updateMarkers(items) {
    while (this.markerPool.length < items.length) {
      const m = el('div', 'marker');
      m.appendChild(el('div', 'box'));
      m.appendChild(el('div', 'tick'));
      const lbl = el('div', 'lbl');
      m.appendChild(lbl);
      this.markers.appendChild(m);
      this.markerPool.push({ node: m, label: lbl });
    }
    for (let i = 0; i < this.markerPool.length; i++) {
      const slot = this.markerPool[i];
      const item = items[i];
      if (!item) {
        slot.node.style.display = 'none';
        continue;
      }
      slot.node.style.display = 'block';
      let cls = 'marker';
      if (item.decoy) cls += ' decoy';
      if (item.engaged) cls += ' eng';
      if (item.selected) cls += ' sel';
      if (item.offscreen) cls += ' offscreen';
      this._setCls(slot.node, cls);
      slot.node.style.transform = `translate(${item.x}px, ${item.y}px) translate(-50%, -50%) scale(${item.scale.toFixed(2)})`;
      slot.label.innerHTML = item.label;
    }
  }

  updateLeadCue(cue) {
    if (!cue) {
      this.leadCue.classList.remove('on');
      return;
    }
    this.leadCue.classList.add('on');
    this.leadCue.style.left = `${cue.x}px`;
    this.leadCue.style.top = `${cue.y}px`;
    this._set(this.leadText, cue.text);
  }

  setPerf(text, visible) {
    this.perf.classList.toggle('hidden', !visible);
    if (visible) this.perf.textContent = text;
  }

  setHighContrast(on) {
    document.body.classList.toggle('high-contrast', on);
  }

  setCaptionsEnabled(on) {
    this.captionsEnabled = on;
    if (!on) this.captions.classList.remove('on');
  }

  setReticleVisible(v) {
    this.reticle.classList.toggle('hidden', !v);
  }
}
