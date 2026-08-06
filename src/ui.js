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

// The console walks the operator through a fixed sequence; the rail at the top
// of the overlay and the numbered controls below both key off this list.
const STEPS = [
  ['CONDITIONS', 'Pick the lighting'],
  ['SCENARIO', 'Pick the threat'],
  ['BATTERY', 'Pick the shooter'],
  ['START', 'Launch the inbounds'],
  ['SELECT', 'Choose a track'],
  ['ASSIGN', 'Slew the battery'],
  ['AUTHORIZE', 'Release the round'],
  ['RESULT', 'Read the outcome'],
];

const HUD_SCALES = [['S', 0.88], ['M', 1], ['L', 1.14], ['XL', 1.3]];

// Banners double as alerts ("INBOUND DETECTED") and as engagement outcomes. Only
// the latter should stick in the LAST RESULT box, otherwise an alert buries the
// reason the previous round hit or missed.
const RESULT_HEADS = new Set(['INTERCEPTED', 'MISSED', 'IMPACT', 'DECOY', 'SCENARIO COMPLETE']);

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function btn(cls, html, onClick, label) {
  const b = el('button', cls, html);
  b.type = 'button';
  if (label) b.setAttribute('aria-label', label);
  b.addEventListener('click', onClick);
  return b;
}

export class UI {
  constructor(handlers = {}) {
    this.h = handlers;
    this.markerPool = [];
    this.logLines = [];
    this.lastText = new Map();
    this.consoleOpen = false;
    this.captionTimer = 0;
    this.captionLines = [];
    this.hudScale = 1;
    this.clock = '00:00';
  }

  mount(root) {
    this.root = root;
    this._buildTitle();
    this._buildHud();
    this._buildConsole();
    this._buildMisc();
    this.setHudScale(this.hudScale);
    return this;
  }

  _set(node, text) {
    if (this.lastText.get(node) === text) return;
    this.lastText.set(node, text);
    node.textContent = text;
  }

  _setHtml(node, html) {
    if (this.lastText.get(node) === html) return;
    this.lastText.set(node, html);
    node.innerHTML = html;
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
    const flow = el('div', 'flow');
    for (const [i, [name]] of STEPS.entries()) {
      flow.appendChild(el('span', 'st', `<b>${i + 1}</b> ${name}`));
    }
    inner.appendChild(flow);
    const keys = el('div', 'keys');
    for (const [k, v] of KEYCAPS) keys.appendChild(el('div', 'keycap', `<b>${k}</b> ${v}`));
    inner.appendChild(keys);
    const b = btn('start', 'ENTER THE SITE', () => this.h.onStart?.());
    inner.appendChild(b);
    inner.appendChild(el('div', 'disclaimer',
      'Entertainment demonstration only. Every system, range, speed, radar behaviour, '
      + 'guidance law and procedure in this build is invented and balanced for gameplay. '
      + 'Names such as PALISADE, HALBERD and SENTINEL are fictional. Nothing here represents '
      + 'real hardware performance, real doctrine or real operating procedure.'));
    t.appendChild(inner);
    this.root.appendChild(t);
    this.title = t;
    this.startButton = b;
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

    // ---- top status strip ----
    const top = el('div', 'panel bracket');
    top.id = 'topbar';
    this.topCells = {};
    for (const [key, label] of [
      ['scenario', 'SCENARIO'], ['condition', 'CONDITION'], ['clock', 'MISSION'],
      ['inbound', 'INBOUND'], ['tracked', 'TRACKED'], ['flight', 'IN FLIGHT'],
      ['killed', 'DESTROYED'], ['leak', 'IMPACTS'],
    ]) {
      const cell = el('div', 'cell');
      cell.appendChild(el('div', 'k', label));
      const v = el('div', 'v', '--');
      cell.appendChild(v);
      top.appendChild(cell);
      this.topCells[key] = v;
    }
    hud.appendChild(top);

    // ---- compass ----
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

    // Side stacks: absolutely positioned columns so the panels inside them can
    // never overlap each other, whatever the HUD scale or window size.
    const leftCol = el('div');
    leftCol.id = 'hud-left';
    const rightCol = el('div');
    rightCol.id = 'hud-right';

    // ---- battery / engagement panel ----
    const bp = el('div', 'panel bracket');
    bp.id = 'battery-panel';
    const bpTitle = el('div', 'panel-title');
    bpTitle.appendChild(el('span', null, 'SELECTED BATTERY'));
    this.batterySelHint = el('span', 'kbd', 'B');
    bpTitle.appendChild(this.batterySelHint);
    bp.appendChild(bpTitle);
    const bpBody = el('div', 'body');
    this.batteryName = el('div', 'name', '--');
    this.batteryRole = el('div', 'role', '--');
    bpBody.appendChild(this.batteryName);
    bpBody.appendChild(this.batteryRole);
    this.batteryRows = {};
    for (const [key, label] of [['status', 'STATUS'], ['rounds', 'ROUNDS'], ['band', 'OPT. BAND']]) {
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

    const eng = el('div', 'engagement');
    eng.appendChild(el('div', 'ehead', 'ENGAGEMENT'));
    this.engRows = {};
    for (const [key, label] of [['assigned', 'ASSIGNED'], ['flight', 'IN FLIGHT']]) {
      const row = el('div', 'row');
      row.appendChild(el('span', 'lbl', label));
      const v = el('span', 'val', '--');
      row.appendChild(v);
      eng.appendChild(row);
      this.engRows[key] = v;
    }
    bpBody.appendChild(eng);
    bp.appendChild(bpBody);

    // ---- air picture ----
    const tp = el('div', 'panel bracket');
    tp.id = 'tracks-panel';
    const tpTitle = el('div', 'panel-title');
    tpTitle.appendChild(el('span', null, 'AIR PICTURE'));
    this.trackCountLabel = el('span', 'count', '0 TRACKED');
    tpTitle.appendChild(this.trackCountLabel);
    tp.appendChild(tpTitle);
    const tpHead = el('div', 'track-row head');
    for (const c of ['TRACK', 'CLASS', 'ALT', 'T-IMP', 'STATE']) tpHead.appendChild(el('span', null, c));
    tp.appendChild(tpHead);
    this.trackList = el('div', 'body');
    tp.appendChild(this.trackList);

    // ---- event log + last result ----
    const lp = el('div', 'panel bracket');
    lp.id = 'log-panel';
    lp.appendChild(el('div', 'panel-title', '<span>ENGAGEMENT LOG</span>'));
    this.logBody = el('div', 'body');
    lp.appendChild(this.logBody);
    const res = el('div', 'result');
    this.resultHead = el('div', 'rh', 'NO ENGAGEMENT YET');
    this.resultSub = el('div', 'rs', 'Results and the reason for them appear here.');
    res.appendChild(el('div', 'rk', 'LAST RESULT'));
    res.appendChild(this.resultHead);
    res.appendChild(this.resultSub);
    lp.appendChild(res);
    this.resultBox = res;

    leftCol.appendChild(lp);
    leftCol.appendChild(bp);
    hud.appendChild(leftCol);

    // ---- rounds summary ----
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

    rightCol.appendChild(tp);
    rightCol.appendChild(sp);
    hud.appendChild(rightCol);

    // ---- reticle, prompt, markers, lead cue ----
    const ret = el('div', null, '<div class="h"></div><div class="v"></div><div class="dot"></div>');
    ret.id = 'reticle';
    hud.appendChild(ret);
    this.reticle = ret;

    const prompt = el('div', 'panel bracket');
    prompt.id = 'target-prompt';
    this.promptTid = el('div', 'tid', '');
    this.promptHint = el('div', 'hint', '');
    this.promptSub = el('div', 'sub', '');
    prompt.appendChild(this.promptTid);
    prompt.appendChild(this.promptHint);
    prompt.appendChild(this.promptSub);
    hud.appendChild(prompt);
    this.prompt = prompt;

    const markers = el('div');
    markers.id = 'markers';
    hud.appendChild(markers);
    this.markers = markers;

    const lead = el('div', null, '<div class="ring"></div><div class="cross"></div><div class="txt"></div>');
    lead.id = 'lead-cue';
    hud.appendChild(lead);
    this.leadCue = lead;
    this.leadText = lead.querySelector('.txt');

    // ---- result banner ----
    const banner = el('div', 'panel');
    banner.id = 'banner';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    this.bannerHead = el('div', 'head', '');
    this.bannerSub = el('div', 'sub', '');
    banner.appendChild(this.bannerHead);
    banner.appendChild(this.bannerSub);
    hud.appendChild(banner);
    this.banner = banner;

    // ---- sequence rail + action hints ----
    const seq = el('div');
    seq.id = 'sequence';
    this.seqNodes = {};
    for (const [key, label, keycap] of [
      ['start', 'START MISSILES', 'TAB'],
      ['select', 'SELECT TRACK', 'T'],
      ['assign', 'ASSIGN BATTERY', 'E'],
      ['authorize', 'AUTHORIZE LAUNCH', 'F'],
      ['result', 'READ RESULT', ''],
    ]) {
      const s = el('div', 'step');
      s.appendChild(el('span', 'n', String(Object.keys(this.seqNodes).length + 1)));
      s.appendChild(el('span', 'l', label));
      if (keycap) s.appendChild(el('span', 'kbd', keycap));
      seq.appendChild(s);
      this.seqNodes[key] = s;
    }
    hud.appendChild(seq);
    this.sequence = seq;

    // The sequence rail above already carries T / E / F, so this row only lists
    // the keys it does not cover. `assign` and `authorize` stay in the map
    // (detached) because the update pass still reflects their availability.
    const actions = el('div');
    actions.id = 'actions';
    this.actionNodes = {};
    for (const [key, html, attach] of [
      ['assign', '<b>E</b> ASSIGN', false],
      ['authorize', '<b>F</b> AUTHORIZE LAUNCH', false],
      ['battery', '<b>B</b> NEXT BATTERY', true],
      ['console', '<b>TAB</b> CONSOLE', true],
      ['restart', '<b>R</b> RESTART', true],
      ['mute', '<b>M</b> MUTE', true],
    ]) {
      const a = el('div', 'act', html);
      if (attach) actions.appendChild(a);
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

    // ---- header with the step rail ----
    const head = el('div', 'panel head-bar bracket');
    const hl = el('div');
    hl.appendChild(el('div', 'title', 'FIRE CONTROL CONSOLE'));
    hl.appendChild(el('div', 'sub', 'AEGIS LINE / SECTOR 1 / FICTIONAL TRAINING ARTICLE'));
    head.appendChild(hl);

    const rail = el('div', 'steprail');
    this.railNodes = [];
    for (const [i, [name, hint]] of STEPS.entries()) {
      const s = el('div', 'rs');
      s.appendChild(el('span', 'n', String(i + 1)));
      const t = el('span', 'tx');
      t.appendChild(el('b', null, name));
      t.appendChild(el('i', null, hint));
      s.appendChild(t);
      rail.appendChild(s);
      this.railNodes.push(s);
    }
    head.appendChild(rail);

    const hr = el('div', 'hr');
    this.consoleClock = el('div', 'title', '00:00');
    hr.appendChild(this.consoleClock);
    this.consoleState = el('div', 'sub', 'STANDBY');
    hr.appendChild(this.consoleState);
    head.appendChild(hr);
    frame.appendChild(head);

    // ---- left column: conditions, scenario, settings ----
    const left = el('div', 'col');

    const condGroup = el('div', 'panel group bracket');
    condGroup.appendChild(groupLabel(1, 'CONDITIONS', 'Lighting for the run'));
    const condOpts = el('div', 'opts');
    this.condButtons = {};
    for (const [id, label] of [['day', 'DAY'], ['sunset', 'SUNSET'], ['night', 'NIGHT']]) {
      const b = btn('opt', label, () => this.h.onCondition?.(id));
      condOpts.appendChild(b);
      this.condButtons[id] = b;
    }
    condGroup.appendChild(condOpts);
    left.appendChild(condGroup);

    const scenGroup = el('div', 'panel group bracket');
    scenGroup.appendChild(groupLabel(2, 'THREAT SCENARIO', 'What gets launched at you'));
    this.scenButtons = {};
    const scenOpts = el('div', 'opts col');
    for (const [id, label] of [['single', 'SINGLE TRACK'], ['saturation', 'SATURATION'], ['night', 'NIGHT RAID']]) {
      const b = btn('opt wide', label, () => this.h.onScenario?.(id));
      scenOpts.appendChild(b);
      this.scenButtons[id] = b;
    }
    scenGroup.appendChild(scenOpts);
    this.scenBlurb = el('div', 'blurb', '');
    scenGroup.appendChild(this.scenBlurb);
    left.appendChild(scenGroup);

    const setGroup = el('div', 'panel group bracket');
    setGroup.appendChild(groupLabel(null, 'OPTIONS / ACCESSIBILITY', 'Applies immediately'));
    this.toggles = {};
    for (const [key, label] of [
      ['reducedMotion', 'REDUCED MOTION'],
      ['highContrast', 'HIGH CONTRAST HUD'],
      ['captions', 'AUDIO CAPTIONS'],
      ['perf', 'PERFORMANCE READOUT'],
    ]) {
      const row = el('div', 'settings-row');
      row.appendChild(el('span', 'lbl', label));
      const t = btn('toggle', '<i></i>', () => this.h.onToggle?.(key), label);
      t.setAttribute('aria-pressed', 'false');
      row.appendChild(t);
      setGroup.appendChild(row);
      this.toggles[key] = t;
    }

    const scaleRow = el('div', 'settings-row');
    scaleRow.appendChild(el('span', 'lbl', 'HUD SCALE'));
    const scaleOpts = el('div', 'opts tight');
    this.scaleButtons = {};
    for (const [label, v] of HUD_SCALES) {
      const b = btn('opt mini', label, () => this.setHudScale(v), `HUD scale ${label}`);
      scaleOpts.appendChild(b);
      this.scaleButtons[label] = { node: b, value: v };
    }
    scaleRow.appendChild(scaleOpts);
    setGroup.appendChild(scaleRow);

    const qRow = el('div', 'settings-row');
    qRow.appendChild(el('span', 'lbl', 'QUALITY'));
    const qOpts = el('div', 'opts tight');
    this.qualityButtons = {};
    for (const q of ['low', 'medium', 'high']) {
      const b = btn('opt mini', q.toUpperCase(), () => this.h.onQuality?.(q));
      qOpts.appendChild(b);
      this.qualityButtons[q] = b;
    }
    qRow.appendChild(qOpts);
    setGroup.appendChild(qRow);

    setGroup.appendChild(this._slider('VOLUME', 0, 100, 70, (v) => this.h.onVolume?.(v / 100), (v) => `${v}%`));
    setGroup.appendChild(this._slider('LOOK SENSITIVITY', 20, 300, 100, (v) => this.h.onSensitivity?.(v / 100), (v) => `${(v / 100).toFixed(2)}x`));
    left.appendChild(setGroup);
    frame.appendChild(left);

    // ---- centre column: scope ----
    const centre = el('div', 'col centre');
    const scopePanel = el('div', 'panel bracket scope-panel');
    const scopeTitle = el('div', 'panel-title');
    scopeTitle.appendChild(el('span', null, 'SURVEILLANCE PICTURE'));
    this.scopeHint = el('span', 'count', 'STEP 5 / CLICK A TRACK TO SELECT');
    scopeTitle.appendChild(this.scopeHint);
    scopePanel.appendChild(scopeTitle);
    this.scopeWrap = el('div', 'scope-wrap');
    scopePanel.appendChild(this.scopeWrap);
    const sel = el('div', 'scope-readout');
    this.scopeSelTid = el('span', 'tid', 'NO TRACK SELECTED');
    this.scopeSelInfo = el('span', 'info', 'Click a contact on the scope, or a row in the track list.');
    sel.appendChild(this.scopeSelTid);
    sel.appendChild(this.scopeSelInfo);
    scopePanel.appendChild(sel);
    centre.appendChild(scopePanel);
    frame.appendChild(centre);

    // ---- right column: batteries + tracks ----
    const right = el('div', 'col');
    const battGroup = el('div', 'panel group bracket');
    battGroup.appendChild(groupLabel(3, 'INTERCEPTOR BATTERY', 'Who takes the shot'));
    this.battCards = {};
    battGroup.appendChild((this.battCardHost = el('div')));
    right.appendChild(battGroup);

    const trkPanel = el('div', 'panel bracket track-panel');
    const trkTitle = el('div', 'panel-title');
    trkTitle.appendChild(el('span', null, 'TRACK LIST'));
    this.consoleTrackCount = el('span', 'count', 'PRIORITY ORDER');
    trkTitle.appendChild(this.consoleTrackCount);
    trkPanel.appendChild(trkTitle);
    const trkHead = el('div', 'track-row head');
    for (const c of ['TRACK', 'CLASS', 'ALT', 'T-IMP', 'STATE']) trkHead.appendChild(el('span', null, c));
    trkPanel.appendChild(trkHead);
    this.consoleTrackList = el('div', 'body console-tracks');
    trkPanel.appendChild(this.consoleTrackList);
    right.appendChild(trkPanel);
    frame.appendChild(right);

    // ---- footer: the big controls ----
    const foot = el('div', 'panel foot-bar bracket');
    this.startBtn = btn('big-btn hazard', '', () => this.h.onStartScenario?.(), 'Start ballistic missiles');
    this.startBtn.appendChild(el('span', 'n', '4'));
    this.startBtnLabel = el('span', 'lb', 'START BALLISTIC MISSILES');
    this.startBtn.appendChild(this.startBtnLabel);
    this.startBtnSub = el('span', 'sb', 'Launches the selected scenario');
    this.startBtn.appendChild(this.startBtnSub);
    foot.appendChild(this.startBtn);

    const mk = (cls, n, label, sub, fn) => {
      const b = btn(`act-btn ${cls}`, '', fn, label);
      b.appendChild(el('span', 'n', n));
      const lb = el('span', 'lb', label);
      b.appendChild(lb);
      const sb = el('span', 'sb', sub);
      b.appendChild(sb);
      foot.appendChild(b);
      return { node: b, label: lb, sub: sb };
    };
    this.assignBtn = mk('', '5', 'ASSIGN', 'Selected battery to track', () => this.h.onAssign?.());
    this.authorizeBtn = mk('blue', '6', 'AUTHORIZE LAUNCH', 'Release one round', () => this.h.onAuthorize?.());
    this.restartBtn = mk('quiet', 'R', 'RESTART', 'Reset the picture', () => this.h.onRestart?.());
    this.closeBtn = mk('quiet', 'TAB', 'STEP OUTSIDE', 'Return to the site', () => this.h.onCloseConsole?.());
    frame.appendChild(foot);

    c.appendChild(frame);
    this.root.appendChild(c);
    this.console = c;
  }

  _slider(label, min, max, value, onInput, fmt) {
    const row = el('div', 'settings-row');
    row.appendChild(el('span', 'lbl', label));
    const wrap = el('div', 'slider');
    const input = el('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.value = String(value);
    input.setAttribute('aria-label', label);
    const out = el('span', 'out', fmt(value));
    input.addEventListener('input', () => {
      const v = Number(input.value);
      out.textContent = fmt(v);
      onInput(v);
    });
    wrap.appendChild(input);
    wrap.appendChild(out);
    row.appendChild(wrap);
    return row;
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
      const card = btn('batt-card', '', () => this.h.onBattery?.(b.id), `Select ${b.spec.name}`);
      const top = el('div', 'bt');
      top.appendChild(el('span', 'bn', b.spec.name));
      top.appendChild(el('span', 'br', b.spec.role));
      card.appendChild(top);
      const band = b.spec.idealAltitude;
      card.appendChild(el('div', 'bband',
        `OPTIMUM BAND ${(band[0] / 1000).toFixed(0)}-${(band[1] / 1000).toFixed(0)} KM / ${b.spec.tubes} TUBES`));
      card.appendChild(el('div', 'bb', b.spec.blurb));
      const st = el('div', 'bs');
      const status = el('span', 'st', 'READY');
      const rounds = el('span', 'rd', '');
      st.appendChild(status);
      st.appendChild(rounds);
      card.appendChild(st);
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
    cap.setAttribute('role', 'status');
    cap.setAttribute('aria-live', 'polite');
    cap.appendChild(el('span', 'cc', 'CC'));
    this.captionBody = el('span', 'txt', '');
    cap.appendChild(this.captionBody);
    this.root.appendChild(cap);
    this.captions = cap;
  }

  setPointerHint(show) {
    this.pauseHint.classList.toggle('on', show);
  }

  /** Audio captions: keeps the two most recent lines so short cues are readable. */
  caption(text, seconds = 2.6) {
    if (!this.captionsEnabled) return;
    const last = this.captionLines[this.captionLines.length - 1];
    if (last !== text) this.captionLines.push(text);
    while (this.captionLines.length > 2) this.captionLines.shift();
    this._setHtml(this.captionBody, this.captionLines.map((l, i) => (
      `<span class="${i === this.captionLines.length - 1 ? 'now' : 'prev'}">${l}</span>`
    )).join(''));
    this.captions.classList.add('on');
    this.captionTimer = seconds;
  }

  log(message, cls = '') {
    const line = el('div', 'log-line ' + cls);
    line.appendChild(el('i', 't', this.clock));
    line.appendChild(el('span', 'm', message));
    // newest first in the DOM: the body is a column-reverse flex box, so the
    // latest entry sits at the bottom and older ones scroll off the top
    this.logBody.prepend(line);
    this.logLines.push(line);
    while (this.logLines.length > 8) {
      const old = this.logLines.shift();
      old.remove();
    }
  }

  clearLog() {
    this.logBody.innerHTML = '';
    this.logLines.length = 0;
    this.resultBox.className = 'result';
    this._set(this.resultHead, 'NO ENGAGEMENT YET');
    this._set(this.resultSub, 'Results and the reason for them appear here.');
  }

  showBanner(head, sub, cls = '', seconds = 3.2) {
    this.bannerHead.textContent = head;
    this.bannerSub.textContent = sub || '';
    this.banner.className = 'panel bracket on ' + cls;
    this.bannerTimer = seconds;
    // the banner is transient, so an outcome is also parked in the log panel
    if (cls === 'good' || cls === 'bad' || RESULT_HEADS.has(String(head).toUpperCase())) {
      this.resultBox.className = 'result ' + cls;
      this._set(this.resultHead, head);
      this._set(this.resultSub, sub || '--');
    }
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

  /** Accessibility: scales every HUD panel through the --hud-scale custom property. */
  setHudScale(v) {
    this.hudScale = v;
    document.documentElement.style.setProperty('--hud-scale', String(v));
    for (const [label, ref] of Object.entries(this.scaleButtons || {})) {
      ref.node.classList.toggle('on', ref.value === v);
      ref.node.setAttribute('aria-pressed', ref.value === v ? 'true' : 'false');
      void label;
    }
    this.h.onHudScale?.(v);
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
      if (this.captionTimer <= 0) {
        this.captions.classList.remove('on');
        this.captionLines.length = 0;
      }
    }

    const mm = Math.floor(s.elapsed / 60);
    const ss = Math.floor(s.elapsed % 60);
    const clock = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    this.clock = clock;

    // the assigning battery is carried on the track, not on the snapshot
    const assignedTrack = s.tracks.find((t) => t.assigned) || null;
    const assignedBattery = assignedTrack ? assignedTrack.assigned : null;

    this._set(this.topCells.scenario, s.scenarioName);
    this._set(this.topCells.condition, s.conditionName);
    this._set(this.topCells.clock, clock);
    this._set(this.topCells.inbound, String(s.inbound));
    this._setCls(this.topCells.inbound, 'v ' + (s.inbound > 0 ? 'alert' : 'ok'));
    this._set(this.topCells.tracked, String(s.tracks.length));
    this._setCls(this.topCells.tracked, 'v ' + (s.tracks.length ? 'warn' : ''));
    this._set(this.topCells.flight, String(s.inFlight));
    this._setCls(this.topCells.flight, 'v ' + (s.inFlight > 0 ? 'blue' : ''));
    this._set(this.topCells.killed, String(s.stats.intercepted));
    this._setCls(this.topCells.killed, 'v ok');
    this._set(this.topCells.leak, String(s.stats.impacted));
    this._setCls(this.topCells.leak, 'v ' + (s.stats.impacted > 0 ? 'alert' : ''));

    // ---- battery panel ----
    const b = s.battery;
    if (b) {
      this._set(this.batteryName, b.spec.name);
      this._set(this.batteryRole, `${b.spec.role} / ${b.spec.tubes} TUBES`);
      const statusText = b.status === 'RELOADING' ? `RELOADING ${Math.ceil(b.reloadTimer)}s`
        : b.status === 'PREPARING' ? `PREPARING ${Math.max(0, b.prepTimer).toFixed(1)}s`
          : b.status === 'EMPTY' ? 'NO ROUNDS' : b.status;
      this._set(this.batteryRows.status, statusText);
      this._setCls(this.batteryRows.status, 'val ' + (b.status === 'READY' ? 'ready' : b.status === 'EMPTY' ? 'bad' : 'busy'));
      this._set(this.batteryRows.rounds, `${b.loaded} LOADED / ${b.ammo} TOTAL`);
      const band = b.spec.idealAltitude;
      this._set(this.batteryRows.band, `${(band[0] / 1000).toFixed(0)}-${(band[1] / 1000).toFixed(0)} KM`);

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
      this.batteryProgress.classList.toggle('on', pct > 0);
    }

    const assignText = assignedTrack
      ? `${assignedBattery ? assignedBattery.spec.name.split(' ')[0] : 'BATTERY'} > ${assignedTrack.id}`
      : s.assignedTrackId ? s.assignedTrackId : 'NONE';
    this._set(this.engRows.assigned, assignText);
    this._setCls(this.engRows.assigned, 'val ' + (assignedTrack || s.assignedTrackId ? 'ready' : 'dimmed'));
    this._set(this.engRows.flight, s.inFlight ? `${s.inFlight} ROUND${s.inFlight > 1 ? 'S' : ''}` : 'NONE');
    this._setCls(this.engRows.flight, 'val ' + (s.inFlight ? 'info' : 'dimmed'));

    // ---- track lists ----
    this._set(this.trackCountLabel, `${s.tracks.length} TRACKED`);
    this._renderTrackRows(this.trackList, s, false);
    if (this.consoleOpen) this._renderTrackRows(this.consoleTrackList, s, true);

    // ---- summary ----
    this._set(this.summaryRows.launched, String(s.rounds.launched));
    this._set(this.summaryRows.hits, String(s.rounds.hits));
    this._set(this.summaryRows.misses, String(s.rounds.misses));
    this._set(this.summaryRows.decoys, String(s.rounds.decoyHits));

    // ---- compass ----
    const yawDeg = ((-s.yaw * 180 / Math.PI) % 360 + 360) % 360;
    for (const t of this.compassTicks) {
      let rel = t.deg - yawDeg;
      while (rel > 180) rel -= 360;
      while (rel < -180) rel += 360;
      t.node.style.left = `${210 + rel * 2.2}px`;
      t.node.style.opacity = Math.abs(rel) > 92 ? '0' : '1';
    }

    // ---- action affordances + sequence rail ----
    this.actionNodes.assign.className = 'act' + (s.canAssign ? '' : ' dim');
    this.actionNodes.authorize.className = 'act' + (s.canAuthorize ? ' hot' : ' dim');
    this._updateSequence(s, assignedTrack);

    // ---- centre prompt ----
    if (s.prompt) {
      this.prompt.classList.add('on');
      this._set(this.promptTid, s.prompt.title);
      this._setHtml(this.promptHint, s.prompt.hint);
      this._setHtml(this.promptSub, this._promptSub(s, assignedTrack));
    } else {
      this.prompt.classList.remove('on');
    }

    // ---- console-only text ----
    if (this.consoleOpen) this._updateConsole(s, clock, assignedTrack, assignedBattery);
  }

  _promptSub(s, assignedTrack) {
    const b = s.battery;
    if (!b) return '';
    if (s.inFlight && assignedTrack && assignedTrack.engaged) {
      return `<em class="info">ROUND IN FLIGHT</em> against ${assignedTrack.id} - watch for the result`;
    }
    if (b.status === 'RELOADING') return `<em class="warn">${b.spec.name} RELOADING</em> ${Math.ceil(b.reloadTimer)}s`;
    if (b.status === 'PREPARING') return `<em class="warn">${b.spec.name} SLEWING</em> ${Math.max(0, b.prepTimer).toFixed(1)}s`;
    if (b.status === 'EMPTY') return `<em class="bad">${b.spec.name} OUT OF ROUNDS</em> - press B for another battery`;
    return `${b.spec.name} - ${b.loaded} LOADED - BAND ${(b.spec.idealAltitude[0] / 1000).toFixed(0)}-${(b.spec.idealAltitude[1] / 1000).toFixed(0)} KM`;
  }

  /** Highlight where the operator is in the select / assign / authorize loop. */
  _updateSequence(s, assignedTrack) {
    const engaged = !!(assignedTrack && assignedTrack.engaged) || s.inFlight > 0;
    let active = 'start';
    if (s.stateLabel === 'SCENARIO COMPLETE') active = 'result';
    else if (!s.running && !s.tracks.length) active = 'start';
    else if (engaged) active = 'result';
    else if (s.canAuthorize || assignedTrack) active = 'authorize';
    else if (s.selectedTrack) active = 'assign';
    else if (s.tracks.length) active = 'select';
    const order = ['start', 'select', 'assign', 'authorize', 'result'];
    const ai = order.indexOf(active);
    for (let i = 0; i < order.length; i++) {
      const node = this.seqNodes[order[i]];
      this._setCls(node, 'step' + (i === ai ? ' on' : i < ai ? ' done' : ''));
    }
  }

  _updateConsole(s, clock, assignedTrack, assignedBattery) {
    this._set(this.consoleClock, clock);
    this._set(this.consoleState, s.stateLabel);
    this.consoleState.className = 'sub ' + (s.running ? 'live' : '');

    for (const [id, node] of Object.entries(this.condButtons)) {
      const on = id === s.conditionId;
      node.classList.toggle('on', on);
      node.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    for (const [id, node] of Object.entries(this.scenButtons)) {
      const on = id === s.scenarioId;
      node.classList.toggle('on', on);
      node.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    this._set(this.scenBlurb, s.scenarioBlurb || '');

    for (const [id, refs] of Object.entries(this.battCards)) {
      const bb = s.batteries.find((x) => x.id === id);
      if (!bb) continue;
      const on = !!(s.battery && s.battery.id === id);
      const assignedHere = assignedBattery === bb;
      refs.card.className = 'batt-card' + (on ? ' on' : '') + (assignedHere ? ' assigned' : '')
        + (bb.status === 'EMPTY' ? ' out' : '');
      refs.card.setAttribute('aria-pressed', on ? 'true' : 'false');
      const st = bb.status === 'RELOADING' ? `RELOADING ${Math.ceil(bb.reloadTimer)}s` : bb.status;
      this._set(refs.status, assignedHere ? `${st} / ASSIGNED ${assignedTrack.id}` : st);
      refs.status.className = 'st ' + (bb.status === 'READY' ? 'ok' : bb.status === 'EMPTY' ? 'bad' : 'warn');
      this._set(refs.rounds, `${bb.loaded}/${bb.ammo} ROUNDS`);
    }

    // footer controls, with the reason a control is unavailable spelled out
    this.startBtn.classList.toggle('disabled', !s.canStart);
    this.startBtn.classList.toggle('armed', s.canStart && !s.running);
    this._set(this.startBtnLabel, s.running ? 'SCENARIO RUNNING' : 'START BALLISTIC MISSILES');
    this._set(this.startBtnSub, s.running
      ? 'Inbounds are already in the air'
      : `Launches ${s.scenarioName} - ${s.conditionName.toUpperCase()}`);

    this.assignBtn.node.classList.toggle('disabled', !s.canAssign);
    this._set(this.assignBtn.sub, s.canAssign
      ? `${s.battery ? s.battery.spec.name : 'BATTERY'} to ${s.selectedTrack ? s.selectedTrack.id : 'track'}`
      : s.tracks.length ? 'Select a track first' : 'No tracks yet - start the scenario');
    this.authorizeBtn.node.classList.toggle('disabled', !s.canAuthorize);
    this._set(this.authorizeBtn.sub, s.canAuthorize
      ? `Fire ${assignedBattery ? assignedBattery.spec.name : 'battery'} at ${assignedTrack ? assignedTrack.id : 'target'}`
      : assignedTrack ? 'Battery still slewing' : 'Assign a battery first');

    for (const [q, node] of Object.entries(this.qualityButtons)) {
      const on = q === s.settings.quality;
      node.classList.toggle('on', on);
      node.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    for (const [k, node] of Object.entries(this.toggles)) {
      const on = !!s.settings[k];
      node.classList.toggle('on', on);
      node.setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    // scope readout + step rail
    const tr = s.selectedTrack;
    if (tr) {
      const decoy = tr.classification === 'DECOY';
      this._set(this.scopeSelTid, `${tr.id} / ${decoy ? 'DECOY' : tr.classification}`);
      this.scopeSelTid.className = 'tid' + (decoy ? ' decoy' : '');
      this._set(this.scopeSelInfo,
        `ALT ${(tr.altitude / 1000).toFixed(1)} KM  ·  SPD ${tr.speed.toFixed(0)} M/S  ·  RANGE ${(tr.range / 1000).toFixed(0)} KM  ·  `
        + `IMPACT IN ${tr.timeToImpact.toFixed(0)} S  ·  `
        + (tr.engaged ? 'ROUND IN FLIGHT' : tr.assigned ? `ASSIGNED ${tr.assigned.spec.name}` : 'UNASSIGNED'));
    } else {
      this._set(this.scopeSelTid, 'NO TRACK SELECTED');
      this.scopeSelTid.className = 'tid none';
      this._set(this.scopeSelInfo, 'Click a contact on the scope, or a row in the track list.');
    }
    this._set(this.scopeHint, !s.tracks.length ? 'WAITING FOR CONTACTS'
      : !tr ? 'STEP 5 / CLICK A TRACK TO SELECT'
        : s.canAuthorize ? 'STEP 7 / AUTHORIZE LAUNCH'
          : tr.assigned ? 'STEP 6 / BATTERY SLEWING' : 'STEP 6 / PRESS ASSIGN');
    this._set(this.consoleTrackCount, s.tracks.length ? `${s.tracks.length} TRACKED / PRIORITY ORDER` : 'PRIORITY ORDER');

    // 0-based rail index: conditions, scenario, battery, start, select, assign, authorize, result
    let step = 3;
    if (s.running || s.tracks.length) {
      const engaged = !!(assignedTrack && assignedTrack.engaged) || s.inFlight > 0;
      if (engaged) step = 7;
      else if (s.canAuthorize) step = 6;
      else if (s.selectedTrack) step = 5;
      else step = 4;
    }
    if (s.stateLabel === 'SCENARIO COMPLETE') step = 7;
    for (let i = 0; i < this.railNodes.length; i++) {
      this._setCls(this.railNodes[i], 'rs' + (i === step ? ' on' : i < step ? ' done' : ''));
    }
  }

  _renderTrackRows(host, s, clickable) {
    const rows = s.tracks;
    while (host.children.length > rows.length) host.lastChild.remove();
    if (!rows.length) {
      if (!host.querySelector('.empty-note')) {
        host.innerHTML = '';
        host.appendChild(el('div', 'empty-note', clickable
          ? 'NO CONTACTS - PRESS START BALLISTIC MISSILES'
          : 'NO CONTACTS'));
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
      row.appendChild(el('span', 'sta'));
      if (clickable) {
        row.tabIndex = 0;
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
      else if (tr.assigned) cls += ' asg';
      if (s.selectedTrack === tr) cls += ' sel';
      if (tr.timeToImpact < 20 && !decoy) cls += ' urgent';
      this._setCls(row, cls);
      this._set(row.children[0], tr.id);
      this._set(row.children[1], decoy ? 'DECOY' : tr.classification);
      this._set(row.children[2], `${(tr.altitude / 1000).toFixed(0)}km`);
      this._set(row.children[3], `${tr.timeToImpact.toFixed(0)}s`);
      this._set(row.children[4], tr.engaged ? 'ENGAGED' : tr.assigned ? 'ASSIGNED' : '--');
    }
  }

  /** Position the world-space threat brackets. `items` come from main.js. */
  updateMarkers(items) {
    while (this.markerPool.length < items.length) {
      const m = el('div', 'marker');
      m.appendChild(el('div', 'box'));
      m.appendChild(el('div', 'arrow'));
      const lbl = el('div', 'lbl');
      m.appendChild(lbl);
      this.markers.appendChild(m);
      this.markerPool.push({ node: m, label: lbl, lastLabel: '' });
    }
    // stack labels apart when contacts bunch up so nothing overlaps
    const placed = [];
    const w = window.innerWidth;
    for (let i = 0; i < this.markerPool.length; i++) {
      const slot = this.markerPool[i];
      const item = items[i];
      if (!item) {
        if (slot.node.style.display !== 'none') slot.node.style.display = 'none';
        continue;
      }
      slot.node.style.display = 'block';
      const flip = item.x > w - 260;
      let cls = 'marker';
      if (item.decoy) cls += ' decoy';
      if (item.engaged) cls += ' eng';
      if (item.selected) cls += ' sel';
      if (item.offscreen) cls += ' offscreen';
      if (flip) cls += ' flip';
      this._setCls(slot.node, cls);
      slot.node.style.transform =
        `translate(${item.x.toFixed(1)}px, ${item.y.toFixed(1)}px) translate(-50%, -50%) scale(${item.scale.toFixed(2)})`;

      let dy = 0;
      for (const p of placed) {
        if (Math.abs(p.x - item.x) < 210 && Math.abs((p.y + p.dy) - (item.y + dy)) < 34) {
          dy += 36;
        }
      }
      placed.push({ x: item.x, y: item.y, dy });
      const off = `translateY(calc(-50% + ${dy}px))`;
      if (slot.label.style.transform !== off) slot.label.style.transform = off;
      if (slot.lastLabel !== item.label) {
        slot.lastLabel = item.label;
        slot.label.innerHTML = item.label;
      }
      if (item.offscreen) {
        // point the chevron back towards the contact
        const a = Math.atan2(item.y - window.innerHeight / 2, item.x - w / 2) * 180 / Math.PI;
        slot.node.style.setProperty('--arrow', `${a.toFixed(0)}deg`);
      }
    }
  }

  updateLeadCue(cue) {
    if (!cue) {
      this.leadCue.classList.remove('on');
      return;
    }
    this.leadCue.classList.add('on');
    this.leadCue.style.left = `${cue.x.toFixed(1)}px`;
    this.leadCue.style.top = `${cue.y.toFixed(1)}px`;
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
    if (!on) {
      this.captions.classList.remove('on');
      this.captionLines.length = 0;
    } else {
      this.caption('Audio captions on');
    }
  }

  setReticleVisible(v) {
    this.reticle.classList.toggle('hidden', !v);
  }
}

function groupLabel(n, title, hint) {
  const g = el('div', 'glabel');
  if (n !== null) g.appendChild(el('span', 'gn', String(n)));
  g.appendChild(el('span', 'gt', title));
  if (hint) g.appendChild(el('span', 'gh', hint));
  return g;
}
