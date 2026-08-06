// main.js — bootstraps renderer + modules, owns the game state machine,
// engagement logic, input, console mode, and the deterministic test API.
import * as THREE from 'three';
import './ui.css';
import { Rand, Events, clamp, fmtKm } from './util.js';
import { createTextures } from './textures.js';
import { predictIntercept } from './physics.js';
import { createWeather } from './weather.js';
import { createBase } from './base.js';
import { createPlayer } from './player.js';
import { createBatteries, BATTERY_DEFS } from './batteries.js';
import { createThreats, SCENARIOS } from './threats.js';
import { createInterceptors } from './interceptors.js';
import { createEffects } from './effects.js';
import { createRadar } from './radar.js';
import { createAudio } from './audio.js';
import { createUI } from './ui.js';
import { createPost } from './post.js';

const VERSION = '0.1.0';

// ============================================================ renderer/scene
const canvas = document.getElementById('app-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: 'high-performance',
  stencil: false,
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.info.autoReset = false; // accumulate per-frame stats across composer passes

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.15, 26000);
camera.position.set(0, 1.7, 14);

// ============================================================ shared context
const settingsStored = (() => {
  try { return JSON.parse(localStorage.getItem('ironveil-settings') || '{}'); } catch { return {}; }
})();
const ctx = {
  scene, camera, renderer, canvas,
  time: { now: 0, dt: 0, unscaledDt: 0, timeScale: 1, frame: 0 },
  rng: new Rand(20260805),
  vrng: new Rand(97531),
  settings: {
    reducedMotion: settingsStored.reducedMotion ?? false,
    volume: settingsStored.volume ?? 0.8,
    quality: settingsStored.quality ?? 'high',
  },
  events: new Events(),
  world: {
    colliders: [],
    wind: new THREE.Vector3(2.4, 0, 0.8),
    sunDir: new THREE.Vector3(0, 1, 0),
  },
};
function persistSettings() {
  try { localStorage.setItem('ironveil-settings', JSON.stringify(ctx.settings)); } catch { /* ignore */ }
}

// ============================================================ modules
ctx.textures = createTextures();
ctx.weather = createWeather(ctx);
ctx.base = createBase(ctx);
ctx.effects = createEffects(ctx);
ctx.player = createPlayer(ctx);
ctx.batteries = createBatteries(ctx);
ctx.threats = createThreats(ctx);
ctx.interceptors = createInterceptors(ctx);
ctx.radar = createRadar(ctx);
ctx.audio = createAudio(ctx);
ctx.ui = createUI(ctx);
ctx.post = createPost(ctx);

// ============================================================ game state
const game = {
  mode: 'freeroam', // freeroam | console
  phase: 'idle',    // idle | active | debrief
  scenario: null,
  seed: null,
  scenarioStartedAt: 0,
  selectedBatteryId: 'patriot',
  assignment: null, // { trackId, batteryId }
  engageHint: '',
  endTimer: -1,
  autoplay: false,
  autoplayTimer: 0,
  stats: null,
  aimTrackId: null,
  nearConsole: false,
  nearBattery: null,
  consoleTransition: 0, // 0..1
  savedCam: { pos: new THREE.Vector3(), quat: new THREE.Quaternion() },
};
ctx.game = game;

function freshStats() {
  return {
    threatsTotal: 0, warheads: 0, decoys: 0,
    intercepted: 0, misses: 0, impacts: 0, impactsOnBase: 0,
    launches: 0, wastedOnDecoys: 0, elapsed: 0,
  };
}
game.stats = freshStats();

// ---- stats via events
ctx.events.on('threat-spawned', ({ threat }) => {
  game.stats.threatsTotal++;
  if (threat.isDecoy) game.stats.decoys++; else game.stats.warheads++;
});
ctx.events.on('interceptor-launched', () => { game.stats.launches++; });
ctx.events.on('intercept-success', ({ decoy }) => {
  if (decoy) game.stats.wastedOnDecoys++;
  else game.stats.intercepted++;
});
ctx.events.on('intercept-miss', ({ threat }) => {
  game.stats.misses++;
  // allow re-engagement of the surviving threat
  const tr = threat ? ctx.radar.trackFor(threat) : null;
  if (tr) tr.engagedBy = Math.max(0, tr.engagedBy - 1);
});
ctx.events.on('intercept-success', ({ point }) => {
  game.lastIntercept = { x: point.x, y: point.y, z: point.z, t: ctx.time.now };
});
ctx.events.on('threat-impact', ({ onBase, threat }) => {
  game.stats.impacts++;
  if (onBase && !threat.isDecoy) {
    game.stats.impactsOnBase++;
    ctx.player.addShake(0.95);
    ctx.ui.flashImpact();
  }
});
// clear assignment when its track dies
ctx.events.on('threat-destroyed', ({ threat }) => {
  const tr = ctx.radar.trackFor(threat);
  if (tr && game.assignment?.trackId === tr.id) game.assignment = null;
});
ctx.events.on('threat-impact', ({ threat }) => {
  const tr = ctx.radar.trackFor(threat);
  if (tr && game.assignment?.trackId === tr.id) game.assignment = null;
});

// ============================================================ engagement API
function selectScenario(id) {
  if (game.phase === 'active') return;
  if (!SCENARIOS[id]) return;
  game.scenario = id;
  if (SCENARIOS[id].forceTime && ctx.weather.timeOfDay !== SCENARIOS[id].forceTime) {
    setTimeOfDay(SCENARIOS[id].forceTime);
    ctx.ui.toast(`CONDITIONS SET TO ${SCENARIOS[id].forceTime.toUpperCase()} FOR ${SCENARIOS[id].name}`, 'info', 4);
  }
}
function selectBattery(id) {
  if (!BATTERY_DEFS[id]) return;
  game.selectedBatteryId = id;
  ctx.events.emit('battery-selected', { id });
}
function setTimeOfDay(t) {
  ctx.weather.setTimeOfDay(t);
  updateSearchlights();
}
function updateSearchlights() {
  ctx.base.setSearchlights(game.phase === 'active' && ctx.weather.timeOfDay === 'night');
}

function startScenario(opts = {}) {
  if (game.phase === 'active') return false;
  if (!game.scenario) { ctx.ui.toast('SELECT A THREAT SCENARIO FIRST', 'warn'); return false; }
  const seed = opts.seed ?? game.seed ?? ((Math.random() * 1e9) | 0);
  game.seed = null; // one-shot seeds
  ctx.rng.reseed(seed);
  ctx.vrng.reseed(seed ^ 0x5f3759df);
  ctx.radar.clear();
  ctx.interceptors.clear();
  ctx.batteries.resetAll();
  game.stats = freshStats();
  game.assignment = null;
  game.endTimer = -1;
  game.phase = 'active';
  game.scenarioStartedAt = ctx.time.now;
  ctx.ui.hideDebrief();
  ctx.threats.startScenario(game.scenario, ctx.rng);
  updateSearchlights();
  ctx.events.emit('scenario-started', { name: game.scenario, seed });
  return true;
}

function restartScenario() {
  ctx.threats.clear();
  ctx.interceptors.clear();
  game.phase = 'idle';
  startScenario();
}

/** validate + assign track to battery (defaults: selected track/battery) */
function assign(trackId = ctx.radar.selectedTrackId ?? game.aimTrackId, batteryId = game.selectedBatteryId) {
  const track = ctx.radar.getTrack(trackId);
  if (!track || track.gone) { game.engageHint = 'NO TRACK SELECTED'; return false; }
  const battery = ctx.batteries.get(batteryId);
  if (!battery) return false;
  if (battery.ammo <= 0) {
    game.engageHint = `${battery.def.name} IS WINCHESTER (NO AMMO)`;
    ctx.ui.toast(game.engageHint, 'warn');
    return false;
  }
  const sol = predictIntercept(battery.rig.group.position, track.threat.pos, track.threat.vel, battery.def.interceptor.avgSpeed);
  if (!sol) {
    game.engageHint = `CANNOT ACHIEVE INTERCEPT — ${battery.def.name} TOO SLOW / TOO LATE`;
    ctx.ui.toast(game.engageHint, 'warn');
    return false;
  }
  const env = battery.def.envelope;
  const alt = sol.point.y;
  const rng2 = Math.hypot(sol.point.x, sol.point.z);
  let hint = `PREDICT INTERCEPT ALT ${fmtKm(alt)} RNG ${fmtKm(rng2)} — NOMINAL`;
  if (alt < env.minAlt || alt > env.maxAlt || rng2 > env.maxRange) {
    hint = `WARNING: PREDICTED POINT OUTSIDE ${battery.def.name} ENVELOPE — LOW PK`;
  } else if (alt < env.sweetLow || alt > env.sweetHigh) {
    hint = `MARGINAL GEOMETRY FOR ${battery.def.name} — REDUCED PK`;
  }
  game.assignment = { trackId: track.id, batteryId };
  track.assignedBattery = batteryId;
  battery.pointAt(sol.point);
  game.engageHint = hint;
  ctx.events.emit('track-assigned', { track, battery, sol });
  return true;
}

function authorize() {
  const a = game.assignment;
  if (!a) { game.engageHint = 'NO ASSIGNMENT — ASSIGN A TRACK FIRST'; return false; }
  const track = ctx.radar.getTrack(a.trackId);
  const battery = ctx.batteries.get(a.batteryId);
  if (!track || track.gone) { game.assignment = null; return false; }
  if (!battery.canAccept()) {
    game.engageHint = `${battery.def.name} NOT READY (${battery.displayState})`;
    return false;
  }
  const ok = battery.launch(track);
  if (ok) {
    track.engagedBy++;
    game.engageHint = `${battery.def.name} FIRING ON ${track.id}`;
    ctx.events.emit('launch-authorized', { track, battery });
    game.assignment = null;
    track.assignedBattery = null;
  }
  return ok;
}

/** pick best battery for a track (used by autoplay/tests) */
function bestBatteryFor(track) {
  const order = ['sentinel', 'thaad', 'patriot'];
  let fallback = null;
  for (const id of order) {
    const b = ctx.batteries.get(id);
    if (!b.canAccept()) continue;
    const sol = predictIntercept(b.rig.group.position, track.threat.pos, track.threat.vel, b.def.interceptor.avgSpeed);
    if (!sol) continue;
    const env = b.def.envelope;
    const alt = sol.point.y;
    const r = Math.hypot(sol.point.x, sol.point.z);
    if (alt >= env.minAlt && alt <= env.maxAlt && r <= env.maxRange) {
      if (alt >= env.sweetLow && alt <= env.sweetHigh) return id;
      fallback ??= id;
    }
  }
  return fallback;
}

// ============================================================ console mode
const consoleView = {
  pos: new THREE.Vector3(),
  look: new THREE.Vector3(),
};
{
  // frame both the PPI screen (left) and the holo table (right)
  const c = ctx.base.consolePos;
  consoleView.pos.set(c.x + 2.1, 1.92, c.z + 3.1);
  consoleView.look.set(c.x + 1.85, 1.22, c.z - 0.9);
}

function enterConsole() {
  if (game.mode === 'console') return;
  game.mode = 'console';
  game.consoleTransition = 0;
  game.savedCam.pos.copy(camera.position);
  game.savedCam.quat.copy(camera.quaternion);
  ctx.player.setEnabled(false);
  ctx.player.unlockPointer();
  ctx.ui.showConsole(true);
  ctx.ui.crosshair(false);
  ctx.ui.setPrompt(null);
}
function exitConsole() {
  if (game.mode !== 'console') return;
  game.mode = 'freeroam';
  ctx.player.setEnabled(true);
  ctx.ui.showConsole(false);
  ctx.ui.crosshair(true);
  if (!isTestDriver) ctx.player.lockPointer();
}

// click-to-select tracks on the holo display
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
canvas.addEventListener('pointerdown', (e) => {
  if (game.mode !== 'console') return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const id = ctx.radar.pickTrack(raycaster);
  if (id) {
    ctx.radar.selectTrack(id);
    ctx.events.emit('ui-click');
  }
});

// ============================================================ input
window.addEventListener('keydown', (e) => {
  if (e.code === 'Tab') e.preventDefault();
  if (ctx.ui.settingsOpen && e.code !== 'KeyH' && e.code !== 'Escape') return;
  switch (e.code) {
    case 'Digit1': selectBattery('patriot'); break;
    case 'Digit2': selectBattery('thaad'); break;
    case 'Digit3': selectBattery('sentinel'); break;
    case 'KeyH': ctx.ui.showSettings(!ctx.ui.settingsOpen); break;
    case 'Escape':
      if (ctx.ui.settingsOpen) ctx.ui.showSettings(false);
      else if (game.mode === 'console') exitConsole();
      break;
    case 'Tab':
      if (game.mode === 'console') exitConsole();
      else if (game.nearConsole || game.phase === 'active' || game.phase === 'debrief') enterConsole();
      else ctx.ui.toast('FIRE DIRECTION CONSOLE IS IN THE C2 SHELTER (FOLLOW THE LIT DOOR)', 'info', 4);
      break;
    case 'KeyE':
      if (game.mode === 'console') { exitConsole(); break; }
      if (game.nearConsole) enterConsole();
      else if (game.aimTrackId) { ctx.radar.selectTrack(game.aimTrackId); assign(game.aimTrackId); }
      break;
    case 'KeyF':
      if (game.mode === 'freeroam') {
        if (!game.assignment && game.aimTrackId) assign(game.aimTrackId);
        authorize();
      }
      break;
    case 'KeyR':
      if (game.phase === 'debrief') { ctx.ui.hideDebrief(); restartScenario(); }
      break;
  }
});

canvas.addEventListener('pointerdown', () => {
  if (game.mode === 'freeroam' && !isTestDriver && !ctx.ui.settingsOpen) {
    ctx.player.lockPointer();
    ctx.audio.unlock();
  }
});

// ============================================================ UI handlers
Object.assign(ctx.ui.handlers, {
  setTimeOfDay: (t) => setTimeOfDay(t),
  selectScenario: (id) => selectScenario(id),
  selectBattery: (id) => selectBattery(id),
  selectTrack: (id) => ctx.radar.selectTrack(id),
  start: () => startScenario(),
  assign: () => assign(),
  authorize: () => authorize(),
  exitConsole: () => exitConsole(),
  enterConsole: () => enterConsole(),
  restart: () => restartScenario(),
  closeToRoam: () => { game.phase = 'idle'; exitConsole(); },
  enterGame: () => {
    if (!isTestDriver) { ctx.player.lockPointer(); }
    ctx.audio.unlock();
  },
  setReducedMotion: (v) => { ctx.settings.reducedMotion = v; persistSettings(); },
  setVolume: (v) => { ctx.audio.setVolume(v); persistSettings(); },
  setMuted: (v) => ctx.audio.setMuted(v),
  setQuality: (q) => { setQuality(q); persistSettings(); },
});

// ============================================================ aiming / prompts
const _aimDir = new THREE.Vector3();
const _rel = new THREE.Vector3();
function updateAim() {
  game.aimTrackId = null;
  game.nearConsole = ctx.player.position.distanceTo(ctx.base.consolePos) < 3.2;
  // nearest battery for inspection prompt
  game.nearBattery = null;
  for (const b of ctx.batteries.list) {
    if (ctx.player.position.distanceTo(b.rig.group.position) < 9) { game.nearBattery = b; break; }
  }
  if (game.mode !== 'freeroam') return;

  camera.getWorldDirection(_aimDir);
  let bestAngle = 0.06; // ~3.4° cone
  let best = null;
  for (const tr of ctx.radar.activeTracks()) {
    _rel.copy(tr.threat.pos).sub(camera.position);
    const d = _rel.length();
    if (d < 40) continue;
    _rel.normalize();
    const ang = _rel.angleTo(_aimDir);
    if (ang < bestAngle) { bestAngle = ang; best = tr; }
  }
  if (best) game.aimTrackId = best.id;

  // prompt text
  if (game.nearConsole) {
    ctx.ui.setPrompt(`<span class="tp-title">FIRE DIRECTION CONSOLE</span>\n[E] TAKE CONSOLE`, true);
  } else if (game.aimTrackId) {
    const tr = ctx.radar.getTrack(game.aimTrackId);
    const t = tr.threat;
    const bat = ctx.batteries.get(game.selectedBatteryId);
    const assigned = game.assignment?.trackId === tr.id;
    ctx.ui.setPrompt(
      `<span class="tp-title">${tr.id} · ${tr.classified}</span>\n` +
      `ALT ${fmtKm(t.pos.y)} · RNG ${fmtKm(Math.hypot(t.pos.x, t.pos.z))} · SPD ${Math.round(t.vel.length())} m/s\n` +
      (assigned
        ? `ASSIGNED TO ${ctx.batteries.get(game.assignment.batteryId).def.name} — [F] AUTHORIZE LAUNCH`
        : `[E] ASSIGN ${bat.def.name} · [F] QUICK FIRE`)
    );
  } else if (game.nearBattery) {
    const b = game.nearBattery;
    ctx.ui.setPrompt(`<span class="tp-title">${b.def.name}</span>\n${b.def.kind} · ${b.displayState} · ${b.ammo}/${b.def.ammo} ROUNDS`, true);
  } else {
    ctx.ui.setPrompt(null);
  }
}

// ============================================================ autoplay (demo/tests)
function autoplayTick() {
  if (!game.autoplay || game.phase !== 'active') return;
  game.autoplayTimer -= ctx.time.dt;
  if (game.autoplayTimer > 0) return;
  game.autoplayTimer = 0.5;
  // engage the lowest-time-to-impact unengaged, non-decoy track
  const tracks = ctx.radar.activeTracks()
    .filter((tr) => !tr.classified.startsWith('DECOY') && tr.engagedBy === 0 && tr.threat.alive)
    .sort((a, b) => a.threat.pos.y - b.threat.pos.y);
  for (const tr of tracks) {
    const bid = bestBatteryFor(tr);
    if (!bid) continue;
    if (assign(tr.id, bid)) {
      authorize();
      break;
    }
  }
}

// ============================================================ scenario end check
function updateScenarioEnd(dt) {
  if (game.phase !== 'active') return;
  game.stats.elapsed = ctx.time.now - game.scenarioStartedAt;
  const done = ctx.threats.allSpawned && ctx.threats.active.length === 0 && ctx.interceptors.active.length === 0;
  if (done) {
    if (game.endTimer < 0) game.endTimer = 2.2;
    game.endTimer -= dt;
    if (game.endTimer <= 0) {
      game.phase = 'debrief';
      updateSearchlights();
      ctx.events.emit('scenario-ended', { stats: { ...game.stats } });
      ctx.ui.showDebrief(game.stats);
    }
  } else {
    game.endTimer = -1;
  }
}

// ============================================================ snapshot for HUD
function buildSnapshot() {
  const tracks = [];
  for (const tr of ctx.radar.activeTracks()) {
    tracks.push({
      id: tr.id,
      classified: tr.classified,
      alt: tr.threat.pos.y,
      range: Math.hypot(tr.threat.pos.x, tr.threat.pos.z),
      assignedBattery: tr.assignedBattery,
    });
  }
  const batteries = ctx.batteries.list.map((b) => ({
    id: b.id, state: b.displayState, ammo: b.ammo, maxAmmo: b.def.ammo, readyIn: Math.max(0, b.readyIn),
  }));
  const selBat = ctx.batteries.get(game.selectedBatteryId);
  return {
    mode: game.mode,
    phase: game.phase,
    scenario: game.scenario,
    timeOfDay: ctx.weather.timeOfDay,
    tracks,
    batteries,
    selectedBatteryId: game.selectedBatteryId,
    selectedBatteryName: selBat.def.name,
    selectedBatteryReady: selBat.canAccept(),
    selectedTrackId: ctx.radar.selectedTrackId,
    assignment: game.assignment
      ? { trackId: game.assignment.trackId, batteryName: ctx.batteries.get(game.assignment.batteryId).def.name }
      : null,
    inFlight: ctx.interceptors.active.length,
    threatsRemaining: ctx.threats.active.length + ctx.threats.pendingCount,
    inboundUndetected: ctx.threats.active.length - tracks.length,
    engageHint: game.engageHint,
  };
}

// ============================================================ quality / resize
let pixelRatioCap = 1.75;
function setQuality(q) {
  ctx.settings.quality = q;
  pixelRatioCap = q === 'high' ? 1.75 : q === 'medium' ? 1.25 : 1.0;
  ctx.post.setQuality(q);
  onResize();
}
function onResize() {
  const w = innerWidth, h = innerHeight;
  const pr = Math.min(devicePixelRatio || 1, pixelRatioCap);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  ctx.post.setSize(w, h, pr);
  ctx.effects.setViewport(h * pr, camera.fov);
}
window.addEventListener('resize', onResize);

// ============================================================ perf monitor
const perf = { emaMs: 16.6, samples: 0, degradeCooldown: 0, fps: 60 };
function updatePerf(unscaledDt) {
  const ms = unscaledDt * 1000;
  perf.emaMs = perf.emaMs * 0.95 + ms * 0.05;
  perf.fps = 1000 / Math.max(perf.emaMs, 0.001);
  perf.degradeCooldown -= unscaledDt;
  if (!isTestDriver && perf.fps < 46 && perf.degradeCooldown <= 0 && ctx.time.now > 6) {
    if (ctx.settings.quality === 'high') { setQuality('medium'); perf.degradeCooldown = 10; ctx.ui.toast('RENDER QUALITY → MEDIUM (AUTO)', 'info', 3); }
    else if (ctx.settings.quality === 'medium') { setQuality('low'); perf.degradeCooldown = 10; ctx.ui.toast('RENDER QUALITY → LOW (AUTO)', 'info', 3); }
  }
}

// ============================================================ main loop
let isTestDriver = false;
let paused = false;
const _camTargetPos = new THREE.Vector3();
const _camTargetQuat = new THREE.Quaternion();
const _lookM = new THREE.Matrix4();

function update(dt) {
  ctx.time.dt = dt;
  ctx.time.frame++;

  ctx.weather.update(dt);
  ctx.player.update(game.mode === 'freeroam' ? dt : 0);

  // console camera
  if (game.mode === 'console') {
    game.consoleTransition = Math.min(1, game.consoleTransition + dt * 2.4);
    const k = game.consoleTransition;
    const e = k * k * (3 - 2 * k);
    _camTargetPos.copy(consoleView.pos);
    _lookM.lookAt(consoleView.pos, consoleView.look, camera.up);
    _camTargetQuat.setFromRotationMatrix(_lookM);
    camera.position.lerpVectors(game.savedCam.pos, _camTargetPos, e);
    camera.quaternion.slerpQuaternions(game.savedCam.quat, _camTargetQuat, e);
  }

  // simulation substeps keep guidance/fuzing stable at large scaled dt
  const steps = dt > 0.034 ? Math.min(12, Math.ceil(dt / 0.034)) : 1;
  const sub = dt / steps;
  for (let i = 0; i < steps; i++) {
    ctx.time.now += sub;
    ctx.base.update(sub, ctx.time.now);
    ctx.batteries.update(sub);
    ctx.threats.update(sub);
    ctx.interceptors.update(sub);
    ctx.radar.update(sub);
    ctx.effects.update(sub, ctx.time.now);
  }
  ctx.audio.update(dt);

  updateAim();
  autoplayTick();
  updateScenarioEnd(dt);
  ctx.ui.update(buildSnapshot());
}

let lastT = performance.now();
function frame() {
  const nowMs = performance.now();
  let unscaled = (nowMs - lastT) / 1000;
  lastT = nowMs;
  unscaled = clamp(unscaled, 0, 0.1);
  ctx.time.unscaledDt = unscaled;
  const dt = paused ? 0 : unscaled * ctx.time.timeScale;
  update(dt);
  renderer.info.reset();
  ctx.post.render(dt);
  updatePerf(unscaled);
}
renderer.setAnimationLoop(frame);
onResize();
setQuality(ctx.settings.quality);

// ============================================================ test/debug API
window.__game = {
  ready: true,
  version: VERSION,
  ctx,
  state() {
    return {
      mode: game.mode,
      phase: game.phase,
      scenario: game.scenario,
      timeOfDay: ctx.weather.timeOfDay,
      time: ctx.time.now,
      player: { x: ctx.player.position.x, y: ctx.player.position.y, z: ctx.player.position.z },
      tracks: ctx.radar.activeTracks().map((t) => ({
        id: t.id, classified: t.classified, alt: Math.round(t.threat.pos.y),
        range: Math.round(Math.hypot(t.threat.pos.x, t.threat.pos.z)),
        x: Math.round(t.threat.pos.x), z: Math.round(t.threat.pos.z),
        decoy: t.threat.isDecoy, assigned: t.assignedBattery, engagedBy: t.engagedBy,
      })),
      threatsActive: ctx.threats.active.length,
      threatsPending: ctx.threats.pendingCount,
      interceptors: ctx.interceptors.active.map((i) => ({
        id: i.id, phase: i.phase, alt: Math.round(i.pos.y),
        x: Math.round(i.pos.x), z: Math.round(i.pos.z),
      })),
      batteries: ctx.batteries.list.map((b) => ({ id: b.id, state: b.displayState, ammo: b.ammo })),
      assignment: game.assignment,
      stats: { ...game.stats },
      autoplay: game.autoplay,
      engageHint: game.engageHint,
      lastIntercept: game.lastIntercept ?? null,
      nearConsole: game.nearConsole,
    };
  },
  perf() {
    return {
      fps: Math.round(perf.fps * 10) / 10,
      ms: Math.round(perf.emaMs * 100) / 100,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      programs: renderer.info.programs?.length ?? 0,
      quality: ctx.settings.quality,
    };
  },
  testMode() {
    isTestDriver = true;
    ctx.ui.hideIntro();
    ctx.audio.setMuted(true);
    return true;
  },
  seed(n) { game.seed = n; return n; },
  start(scenario, opts = {}) {
    selectScenario(scenario);
    if (opts.timeOfDay) setTimeOfDay(opts.timeOfDay);
    return startScenario(opts);
  },
  restart() { restartScenario(); },
  stopScenario() { ctx.threats.clear(); ctx.interceptors.clear(); ctx.ui.hideDebrief(); game.phase = 'idle'; updateSearchlights(); },
  selectBattery(id) { selectBattery(id); },
  selectTrack(id) { ctx.radar.selectTrack(id); },
  assign(trackId, batteryId) { return assign(trackId, batteryId); },
  authorize() { return authorize(); },
  autoplay(v = true) { game.autoplay = v; return v; },
  openConsole() { enterConsole(); game.consoleTransition = 0.999; },
  closeConsole() { exitConsole(); },
  setTimeOfDay(t) { setTimeOfDay(t); },
  teleport(x, y, z, yaw = 0, pitch = 0) { ctx.player.teleport(x, y, z, yaw, pitch); },
  lookAt(x, y, z) {
    const p = ctx.player.state;
    const dx = x - camera.position.x, dy = y - camera.position.y, dz = z - camera.position.z;
    p.yaw = Math.atan2(-dx, -dz);
    p.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    ctx.player.update(0);
  },
  timeScale(x) { ctx.time.timeScale = x; return x; },
  pause(v = true) { paused = v; return paused; },
  step(frames = 1, dtMs = 16.667) {
    // deterministic fixed stepping (use with pause(true))
    for (let i = 0; i < frames; i++) {
      update(dtMs / 1000);
    }
    renderer.info.reset();
    ctx.post.render(dtMs / 1000);
    return ctx.time.now;
  },
  setReducedMotion(v) { ctx.settings.reducedMotion = v; },
  setQuality(q) { setQuality(q); },
  mute() { ctx.audio.setMuted(true); },
};

console.info('[IRONVEIL] ready — fictional interceptor base demo v' + VERSION);
