// Entry point: renderer, module wiring, game state machine, engagement
// logic, input, fixed-timestep loop and deterministic Playwright hooks.
import * as THREE from 'three';
import { RNG } from './rng.js';
import { EventBus } from './events.js';
import { SCENARIOS, BATTERIES, RESULT } from './constants.js';
import { Weather } from './weather.js';
import { Effects } from './effects.js';
import { Base } from './base.js';
import { Batteries, BSTATE } from './batteries.js';
import { Threats } from './threats.js';
import { Interceptors } from './interceptors.js';
import { Radar } from './radar.js';
import { Player } from './player.js';
import { GameAudio } from './audio.js';
import { Post } from './post.js';
import { UI } from './ui.js';

// ------------------------------------------------------------- URL params
const params = new URLSearchParams(location.search);
const SEED = parseInt(params.get('seed') ?? '1337', 10);
const MANUAL = params.get('manual') === '1';
const TEST_MODE = MANUAL || params.get('test') === '1';
const NO_POST = params.get('nopost') === '1';
const HIDE_HUD = params.get('hidehud') === '1';
const START_TOD = params.get('tod') ?? 'day';
const START_SCENARIO = params.get('scenario') ?? 'single';
const AUTOSTART = params.get('autostart') === '1';
const STEP = 1 / 120;

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(71, window.innerWidth / window.innerHeight, 0.1, 30000);
camera.position.set(-26, 1.7, 2);

// ---------------------------------------------------------------- modules
const rng = new RNG(SEED);
const events = new EventBus();
const weather = new Weather({ scene, renderer, events, rng });
const effects = new Effects({ scene, events, rng, weather });
const base = new Base({ scene, events, rng });
const threats = new Threats({ scene, events, rng, effects });
const interceptors = new Interceptors({ scene, events, rng, effects, threats });
const batteries = new Batteries({ scene, events, rng, base, effects, interceptors });
const radar = new Radar({ scene, events, rng, base, threats });
const player = new Player({ camera, dom: renderer.domElement, events, base });
const audio = new GameAudio({ events });
const ui = new UI();
const post = NO_POST ? null : new Post(renderer, scene, camera);

// ------------------------------------------------------------- game state
const game = {
  phase: 'idle',            // idle | active | debrief-pending | debrief
  scenario: SCENARIOS[START_SCENARIO] ? START_SCENARIO : 'single',
  tod: ['day', 'sunset', 'night'].includes(START_TOD) ? START_TOD : 'day',
  selectedBattery: 'rampart',
  selectedTrack: null,
  aimTrack: null,
  consoleMode: false,
  results: [],
  stats: { intercepted: 0, impacts: 0, missed: 0, decoysHit: 0, decoysExpired: 0, fired: 0 },
  endTimer: 0,
  time: 0,
  freeCam: false,           // test viewpoints
};
weather.setTimeOfDay(game.tod, true);

function resetStats() {
  game.results = [];
  game.stats = { intercepted: 0, impacts: 0, missed: 0, decoysHit: 0, decoysExpired: 0, fired: 0 };
}

function trackForThreat(threat) {
  return radar.tracks.find(t => t.threat === threat && !t.closed) ?? null;
}

// ------------------------------------------------------------ engagement
function setTod(tod) {
  game.tod = tod;
  weather.setTimeOfDay(tod);
  audio.click();
  ui.log(`CONDITIONS SET — ${tod.toUpperCase()}`);
}

function setScenario(id) {
  if (!SCENARIOS[id]) return;
  game.scenario = id;
  audio.click();
  ui.log(`SCENARIO SELECTED — ${SCENARIOS[id].name}`);
}

function selectBattery(id) {
  if (!batteries.get(id)) return;
  game.selectedBattery = id;
  audio.click();
}

function selectTrack(idOrTrack) {
  const t = typeof idOrTrack === 'string' ? radar.getTrackById(idOrTrack) : idOrTrack;
  if (!t) return;
  game.selectedTrack = t;
  radar.selection = t;
  audio.ping(1240, 0.05, 0.18);
}

function assign(trackArg = null) {
  const track = trackArg ?? game.selectedTrack;
  if (!track || track.closed) { ui.log('ASSIGN FAILED — no track selected', 'warn'); audio.deny(); return false; }
  track.assignedBattery = game.selectedBattery;
  const def = BATTERIES[game.selectedBattery];
  ui.log(`${track.id} ASSIGNED → ${def.name}`, 'cyan');
  audio.click();
  return true;
}

function authorize(trackArg = null) {
  const track = trackArg ?? game.selectedTrack;
  if (!track || track.closed) { ui.log('AUTHORIZE FAILED — no track selected', 'warn'); audio.deny(); return false; }
  if (!track.assignedBattery) { ui.log(`AUTHORIZE FAILED — assign a battery to ${track.id} first [E]`, 'warn'); audio.deny(); return false; }
  const bat = batteries.get(track.assignedBattery);
  const res = bat.requestLaunch(track);
  if (!res.ok) { ui.log(`LAUNCH REFUSED — ${res.reason}`, 'warn'); audio.deny(); return false; }
  track.engaged = true;
  ui.log(`${bat.def.name} AUTHORIZED → ${track.id} (prep ${bat.def.prepTime.toFixed(1)}s)`, 'ok');
  audio.chime([440, 554]);
  return true;
}

function startScenario() {
  if (game.phase === 'active') return;
  resetStats();
  radar.reset();
  threats.stop();
  interceptors.stopAll();
  batteries.resetAll();
  game.selectedTrack = null;
  radar.selection = null;
  if (game.scenario === 'nightraid' && game.tod !== 'night') {
    setTod('night');
    ui.log('NIGHT RAID enforces NIGHT conditions', 'warn');
  }
  threats.startScenario(game.scenario);
  game.phase = 'active';
  game.endTimer = 0;
  events.emit('scenario-start', { scenario: game.scenario });
  ui.showBanner(`${SCENARIOS[game.scenario].name} — WEAPONS FREE`, 'warn');
  ui.log(`SCENARIO START — ${SCENARIOS[game.scenario].name}`, 'warn');
  ui.hideDebrief();
  if (game.scenario === 'nightraid') audio.alarmStart();
}

function abortScenario() {
  threats.stop();
  interceptors.stopAll();
  for (const b of batteries.list) b.cancelPending('scenario aborted');
  game.phase = 'idle';
  events.emit('scenario-end', {});
  ui.showBanner('SCENARIO ABORTED', '');
  ui.log('SCENARIO ABORTED');
  audio.alarmStop();
}

function startOrAbort() {
  if (game.phase === 'active') abortScenario();
  else startScenario();
}

function endScenario() {
  game.phase = 'debrief';
  events.emit('scenario-end', {});
  audio.alarmStop();
  const s = game.stats;
  let rating;
  if (s.impacts === 0 && s.missed === 0 && s.decoysHit === 0 && s.intercepted > 0) {
    rating = { text: 'CLEAN SWEEP', cls: 'ok' };
  } else if (s.impacts === 0) rating = { text: 'AREA DEFENDED', cls: 'ok' };
  else if (s.impacts <= 1) rating = { text: 'PARTIAL DEFENSE', cls: 'warn' };
  else rating = { text: 'DEFENSE OVERRUN', cls: 'bad' };
  ui.showDebrief({ results: game.results, stats: s, rating });
  if (game.consoleMode) closeConsole(false);
}

// console mode ------------------------------------------------------------
function openConsole() {
  if (game.consoleMode) return;
  game.consoleMode = true;
  player.releaseLock();
  player.setConsoleMode(true);
  ui.setConsoleVisible(true);
  ui.showStart(false);
  audio.click();
}
function closeConsole(relock = true) {
  if (!game.consoleMode) return;
  game.consoleMode = false;
  player.setConsoleMode(false);
  ui.setConsoleVisible(false);
  if (relock && !TEST_MODE) player.requestLock();
  audio.click();
}

// ------------------------------------------------------------ event wires
let firstTrackAnnounced = false;
events.on('scenario-start', () => { firstTrackAnnounced = false; });
events.on('track-new', ({ track }) => {
  ui.log(`NEW CONTACT ${track.id} — bearing ${Math.round((Math.atan2(track.estPos.z, track.estPos.x) * 57.3 + 360) % 360)}°`, 'warn');
  if (!firstTrackAnnounced) {
    firstTrackAnnounced = true;
    ui.showBanner('RADAR CONTACT — INBOUND BALLISTIC', 'bad');
  }
});
events.on('track-classified', ({ track }) => {
  ui.log(`${track.id} CLASSIFIED — ${track.classification}`, track.classification === 'HOSTILE' ? 'bad' : '');
});
events.on('track-dropped', ({ track, why }) => {
  if (why === 'LOST') ui.log(`${track.id} TRACK LOST`, 'warn');
});
events.on('battery-fired', ({ battery, track }) => {
  game.stats.fired++;
  ui.log(`BIRD AWAY — ${battery.def.name} → ${track?.id ?? '???'}`, 'cyan');
});
events.on('intercept-hit', ({ threat, decoy, reason, missile }) => {
  const track = missile.track;
  if (decoy) {
    game.stats.decoysHit++;
    game.results.push({ type: RESULT.DECOY, text: `${track?.id ?? 'track'} — ${reason}` });
    ui.showBanner('DECOY NEUTRALIZED — ROUND WASTED', 'warn');
    ui.log(`${track?.id} was a DECOY — interceptor wasted`, 'warn');
  } else {
    game.stats.intercepted++;
    game.results.push({ type: RESULT.INTERCEPTED, text: `${track?.id ?? 'track'} — ${reason} (${missile.def.name})` });
    ui.showBanner(`INTERCEPT — ${track?.id ?? 'TARGET'} DESTROYED`, 'ok');
    ui.log(`SPLASH ${track?.id} — ${reason}`, 'ok');
  }
});
events.on('intercept-miss', ({ threat, reason, missile }) => {
  game.stats.missed++;
  const track = missile.track;
  game.results.push({ type: RESULT.MISSED, text: `${track?.id ?? 'interceptor'} — ${reason}` });
  if (threat) ui.showBanner('INTERCEPT MISSED', 'warn');
  ui.log(`MISS — ${reason}`, 'warn');
});
events.on('threat-impact', ({ threat }) => {
  const track = trackForThreat(threat);
  game.stats.impacts++;
  game.results.push({ type: RESULT.IMPACT, text: `${track?.id ?? 'untracked threat'} struck the base area` });
  ui.showBanner('IMPACT — BASE AREA HIT', 'bad');
  ui.log(`IMPACT — ${track?.id ?? 'threat'} hit the deck`, 'bad');
});
events.on('threat-burnout', ({ threat }) => {
  const track = trackForThreat(threat);
  game.stats.decoysExpired++;
  game.results.push({ type: 'INFO', text: `${track?.id ?? 'contact'} was a decoy — burned out harmlessly` });
  ui.log(`${track?.id ?? 'contact'} burned out — decoy`, '');
});
events.on('battery-ready', ({ battery }) => {
  ui.log(`${battery.def.name} READY`, 'ok');
});

// ---------------------------------------------------------------- UI init
ui.init({
  setTod,
  setScenario,
  selectBattery,
  selectTrack: (id) => selectTrack(id),
  assign: () => assign(),
  authorize: () => authorize(),
  startOrAbort,
  restart: () => { ui.hideDebrief(); startScenario(); },
  exitConsole: () => closeConsole(),
  openConsole,
  enterRange: () => {
    ui.showStart(false);
    if (!TEST_MODE) player.requestLock();
  },
  setReducedMotion: (v) => { player.reducedMotion = v; },
  setMuted: (v) => audio.setMuted(v),
  setQuality: (q) => setQuality(q),
});
player.reducedMotion = ui.initialSettings.reduced;
audio.setMuted(ui.initialSettings.mute || params.get('mute') === '1');

function setQuality(q) {
  post?.setQuality(q);
  renderer.setPixelRatio(q >= 2 ? Math.min(window.devicePixelRatio, 1.75) : (q === 1 ? 1 : 0.85));
  renderer.shadowMap.enabled = q >= 1;
  weather.sun.castShadow = q >= 1;
  onResize();
}
if (params.get('quality') !== null) setQuality(+params.get('quality'));
else setQuality(ui.initialSettings.quality);

if (HIDE_HUD) ui.root.style.display = 'none';
if (TEST_MODE) ui.showStart(false);

// ------------------------------------------------------------------ input
window.addEventListener('keydown', (e) => {
  if (e.code === 'Tab') { e.preventDefault(); game.consoleMode ? closeConsole() : openConsole(); return; }
  if (e.code === 'Escape' && game.consoleMode) { closeConsole(false); return; }
  if (e.repeat) return;
  switch (e.code) {
    case 'Digit1': selectBattery('rampart'); break;
    case 'Digit2': selectBattery('zenith'); break;
    case 'Digit3': selectBattery('sentinel'); break;
    case 'KeyR': if (game.phase !== 'idle' || ui.debriefVisible) { ui.hideDebrief(); startScenario(); } break;
    case 'KeyH': ui.toggleHelp(); break;
    case 'KeyM': audio.setMuted(!audio.muted); ui.log(audio.muted ? 'AUDIO MUTED' : 'AUDIO ON'); break;
    case 'F3': e.preventDefault(); perfVisible = !perfVisible; if (!perfVisible) ui.setPerf(null); break;
    case 'KeyE': {
      if (game.consoleMode) break;
      // console interaction?
      if (nearConsole()) { openConsole(); break; }
      if (game.aimTrack) { selectTrack(game.aimTrack); assign(game.aimTrack); }
      break;
    }
    case 'KeyF': {
      if (game.consoleMode) break;
      const t = game.aimTrack ?? game.selectedTrack;
      if (t) authorize(t);
      break;
    }
    default: break;
  }
});

renderer.domElement.addEventListener('click', (e) => {
  if (game.consoleMode) {
    // pick a holo blip
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, camera);
    const t = radar.pick(rc);
    if (t) selectTrack(t);
  } else if (!player.locked && !TEST_MODE && !ui.debriefVisible && startHidden()) {
    player.requestLock();
  }
});
function startHidden() { return ui.startEl.classList.contains('hidden'); }

events.on('lock-changed', ({ locked }) => {
  if (!locked && !game.consoleMode && !TEST_MODE && !ui.debriefVisible) {
    ui.showStart(true);
  } else if (locked) {
    ui.showStart(false);
  }
});

function nearConsole() {
  return player.pos.distanceTo(base.console.interactPos) < 3.4;
}

// --------------------------------------------------------- outdoor aiming
const aimRay = new THREE.Raycaster();
aimRay.far = 25000;
function updateAim() {
  game.aimTrack = null;
  if (game.consoleMode || game.freeCam) { ui.setAimPrompt(null); return; }
  const picks = threats.active.map(t => t.pick);
  if (picks.length) {
    aimRay.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = aimRay.intersectObjects(picks, false);
    if (hits.length) {
      const threat = hits[0].object.userData.threat;
      const track = trackForThreat(threat);
      if (track) {
        game.aimTrack = track;
        const def = BATTERIES[game.selectedBattery];
        const assigned = track.assignedBattery
          ? `→ ${track.assignedBattery.toUpperCase()}` : '';
        ui.setAimPrompt(
          `<b>${track.id}</b> ${track.classification} · ${(track.estPos.y / 1000).toFixed(1)} km ${assigned}<br>` +
          `<span class="key">E</span> assign ${def.name} · <span class="key">F</span> authorize`,
        );
        return;
      }
      ui.setAimPrompt('UNKNOWN CONTACT — awaiting radar track');
      return;
    }
  }
  ui.setAimPrompt(null);
}

// ------------------------------------------------------------- simulation
function simStep(dt) {
  game.time += dt;
  weather.update(dt);
  base.update(dt);
  player.update(dt);
  batteries.update(dt);
  threats.update(dt);
  interceptors.update(dt);
  radar.update(dt);
  radar.updateInterceptorDots(interceptors.pool);
  effects.update(dt);
  audio.update(dt, camera.position);

  // scenario end detection
  if (game.phase === 'active' && threats.allResolved() && interceptors.active.length === 0) {
    game.endTimer += dt;
    if (game.endTimer > 1.8) endScenario();
  } else {
    game.endTimer = 0;
  }
}

// ------------------------------------------------------------- HUD sync
function hudSnapshot() {
  return {
    phase: game.phase,
    scenario: game.scenario,
    tod: game.tod,
    threatsActive: threats.active.length,
    inFlight: interceptors.active.length,
    selectedTrackId: game.selectedTrack && !game.selectedTrack.closed ? game.selectedTrack.id : null,
    selectedBattery: game.selectedBattery,
    tracks: radar.liveTracks.map(t => ({
      id: t.id,
      state: t.state,
      classification: t.classification,
      alt: t.estPos.y,
      assignedBattery: t.assignedBattery,
      selected: game.selectedTrack === t,
    })),
    batteries: batteries.list.map((b, i) => ({
      id: b.id,
      name: b.def.name,
      blurb: b.def.blurb,
      uiColor: b.def.uiColor,
      state: b.state,
      ammo: b.ammo,
      maxAmmo: b.def.ammo,
      selected: game.selectedBattery === b.id,
      key: i + 1,
    })),
  };
}

let uiTimer = 0;
function syncUI(dt, force = false) {
  uiTimer -= dt;
  if (uiTimer > 0 && !force) return;
  uiTimer = 0.12;
  const snap = hudSnapshot();
  ui.updateHUD(snap);
  if (game.consoleMode) ui.updateConsole(snap);
  // interact prompt
  if (!game.consoleMode && nearConsole()) {
    ui.setInteractPrompt('<span class="key">E</span> COMMAND CONSOLE');
  } else {
    ui.setInteractPrompt(null);
  }
  ui.setHints(game.consoleMode
    ? 'click holo blips or track rows · <b>ESC</b> exit console'
    : '<b>TAB</b> console · <b>E</b> assign · <b>F</b> authorize · <b>1·2·3</b> battery · <b>H</b> help');
}

// --------------------------------------------------------------- perf HUD
let perfVisible = false;
const fpsSamples = new Float32Array(90);
let fpsIdx = 0, fpsCount = 0;
function trackFps(dt) {
  if (dt <= 0) return;
  fpsSamples[fpsIdx] = dt;
  fpsIdx = (fpsIdx + 1) % fpsSamples.length;
  fpsCount = Math.min(fpsCount + 1, fpsSamples.length);
}
function fpsStats() {
  let sum = 0, worst = 0;
  for (let i = 0; i < fpsCount; i++) { sum += fpsSamples[i]; worst = Math.max(worst, fpsSamples[i]); }
  const avg = fpsCount ? sum / fpsCount : 0;
  return { fps: avg ? 1 / avg : 0, ms: avg * 1000, worstMs: worst * 1000 };
}

// -------------------------------------------------------- test viewpoints
const VIEWS = {
  overview: { pos: [178, 96, 178], look: [0, 8, 0] },
  gate: { pos: [3, 2.2, 210], look: [0, 6, 0] },
  apron: { pos: [16, 1.8, 18], look: [-38, 3, -10] },
  shelter: null, // filled below (console view)
  rampart: { pos: [40, 2.4, -22], look: [52, 4, -34] },
  zenith: { pos: [48, 2.6, 28], look: [60, 5, 38] },
  sentinel: { pos: [-3, 3, 68], look: [-16, 7, 84] },
  sky: { pos: [10, 2, 10], look: [900, 2600, -700] },
  launchwatch: { pos: [30, 2.0, -10], look: [52, 30, -34] },
};
function setView(name) {
  const v = name === 'shelter'
    ? { pos: base.console.viewPos.toArray(), look: base.console.viewLook.toArray() }
    : VIEWS[name];
  if (!v) return false;
  game.freeCam = true;
  player.enabled = false;
  camera.position.set(...v.pos);
  camera.lookAt(new THREE.Vector3(...v.look));
  return true;
}
function lookAtWorld(x, y, z) {
  camera.lookAt(new THREE.Vector3(x, y, z));
}

// ------------------------------------------------------------- main loop
let last = -1;
let acc = 0;
let firstFrame = true;
renderer.info.autoReset = false;

function frame(now) {
  requestAnimationFrame(frame);
  // first RAF timestamp can predate module evaluation — never trust it
  const dt = last < 0 ? 0 : Math.max(0, Math.min(0.1, (now - last) / 1000));
  last = now;
  trackFps(dt);
  renderer.info.reset();

  if (!MANUAL) {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 10) { simStep(STEP); acc -= STEP; n++; }
    if (n === 10) acc = 0; // dropped frames — don't spiral
  }

  updateAim();
  syncUI(dt);

  if (perfVisible) {
    const f = fpsStats();
    const st = effects.stats();
    ui.setPerf(
      `FPS ${f.fps.toFixed(0)}  ms ${f.ms.toFixed(1)} (worst ${f.worstMs.toFixed(0)})\n` +
      `draws ${renderer.info.render.calls}  tris ${(renderer.info.render.triangles / 1000).toFixed(0)}k\n` +
      `smoke ${st.smoke}  fire ${st.fire}  trails ${st.trails}`,
    );
  }

  effects.renderPrep(camera, renderer, MANUAL ? 0 : dt);
  if (post) post.render(dt);
  else renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    window.__game.ready = true;
    if (AUTOSTART) startScenario();
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  post?.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

// --------------------------------------------------------------- test API
window.__game = {
  ready: false,
  version: 1,
  seed: SEED,
  manual: MANUAL,
  step(dt = STEP, n = 1) {
    for (let i = 0; i < n; i++) simStep(dt);
    effects.renderPrep(camera, renderer, dt * n);
    syncUI(0, true);
  },
  /** advance N seconds of simulation deterministically */
  advance(seconds) {
    const steps = Math.round(seconds / STEP);
    for (let i = 0; i < steps; i++) simStep(STEP);
    effects.renderPrep(camera, renderer, 1 / 60);
    syncUI(0, true);
  },
  getState() {
    const f = fpsStats();
    return {
      phase: game.phase,
      scenario: game.scenario,
      tod: game.tod,
      time: game.time,
      threats: threats.active.map(t => ({
        id: t.id, decoy: t.isDecoy,
        pos: t.pos.toArray().map(v => Math.round(v)),
        speed: Math.round(t.vel.length()),
      })),
      tracks: radar.liveTracks.map(t => ({
        id: t.id, state: t.state, cls: t.classification,
        assigned: t.assignedBattery, alt: Math.round(t.estPos.y),
      })),
      batteries: batteries.list.map(b => ({ id: b.id, state: b.state, ammo: b.ammo })),
      interceptors: interceptors.active.map(m => ({
        battery: m.batteryId, age: +m.age.toFixed(1),
        pos: m.pos.toArray().map(v => Math.round(v)),
        speed: Math.round(m.vel.length()),
      })),
      results: game.results.slice(),
      stats: { ...game.stats },
      consoleMode: game.consoleMode,
      selectedBattery: game.selectedBattery,
      selectedTrack: game.selectedTrack?.id ?? null,
      fps: +f.fps.toFixed(1),
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      effects: effects.stats(),
      lastBurst: effects.lastBurst
        ? { pos: effects.lastBurst.pos.toArray().map(v => Math.round(v)), type: effects.lastBurst.type }
        : null,
    };
  },
  setTod, setScenario, selectBattery,
  start: (scenario, tod) => {
    if (scenario) setScenario(scenario);
    if (tod) setTod(tod);
    startScenario();
  },
  abort: abortScenario,
  restart: () => { ui.hideDebrief(); startScenario(); },
  selectFirstTrack: () => {
    const t = radar.liveTracks[0];
    if (t) selectTrack(t);
    return t?.id ?? null;
  },
  selectTrack: (id) => { selectTrack(id); },
  assign: (batteryId) => {
    if (batteryId) selectBattery(batteryId);
    return assign();
  },
  authorize: () => authorize(),
  openConsole, closeConsole,
  setView,
  lookAt: lookAtWorld,
  views: Object.keys(VIEWS),
  setQuality,
  setReducedMotion: (v) => { player.reducedMotion = v; },
  hideUI: (v) => { ui.root.style.display = v ? 'none' : ''; },
  perf: fpsStats,
  camera, // handy for custom shots in tests
  scene,
  renderer,
};

requestAnimationFrame(frame);
