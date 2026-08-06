// main.js — bootstraps renderer + modules, owns the game state machine,
// engagement logic, input, console mode, and the deterministic test API.
import * as THREE from 'three';
import './ui.css';
import { Rand, Events, clamp, fmtKm } from './util.js';
import { createTextures } from './textures.js';
import { predictIntercept, timeToGround } from './physics.js';
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
  assignments: new Map(), // trackId -> batteryId: every live engagement intent
  fireQueue: [],          // [{ trackId, batteryId }] authorized rounds waiting on a battery cycle
  focusTrackId: null,     // track driving the one-key flow + HUD focus chip
  engageHint: '',
  viewMode: 'fp',         // fp | missile | threat — cinematic chase cams on V
  camTarget: null,        // followed interceptor / threat object
  camHold: 0,             // linger timer after the followed object dies
  tabletOpen: false,      // handheld TACOM pad (Q)
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

/** focused assignment (compat shape used by HUD chip + tests) */
function focusAssignment() {
  if (game.focusTrackId && game.assignments.has(game.focusTrackId)) {
    return { trackId: game.focusTrackId, batteryId: game.assignments.get(game.focusTrackId) };
  }
  // fall back to any live assignment so the chip never lies
  for (const [trackId, batteryId] of game.assignments) return { trackId, batteryId };
  return null;
}

function freshStats() {
  return {
    threatsTotal: 0, warheads: 0, decoys: 0,
    intercepted: 0, misses: 0, safed: 0, impacts: 0, impactsOnBase: 0,
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
  // salvo doctrine: a round whose target was already killed (or already hit
  // the ground) safes itself — that is not a miss against a live threat
  if (!threat || !threat.alive) { game.stats.safed++; return; }
  game.stats.misses++;
  // allow re-engagement of the surviving threat
  const tr = ctx.radar.trackFor(threat);
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
// tear down a track's engagement when it dies (destroyed or impacted)
function dropEngagement(threat) {
  const tr = ctx.radar.trackFor(threat);
  if (!tr) return;
  game.assignments.delete(tr.id);
  if (game.fireQueue.length) game.fireQueue = game.fireQueue.filter((q) => q.trackId !== tr.id);
  if (game.focusTrackId === tr.id) game.focusTrackId = null;
}
ctx.events.on('threat-destroyed', ({ threat }) => dropEngagement(threat));
ctx.events.on('threat-impact', ({ threat }) => dropEngagement(threat));

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
  // mid-engagement battery switch re-points the new battery at the focused
  // threat, so 1/2/3 + F puts interceptors from several batteries on one bomb
  if (game.phase === 'active' && game.focusTrackId && game.assignments.get(game.focusTrackId) !== id) {
    assign(game.focusTrackId, id);
  }
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
  game.assignments.clear();
  game.fireQueue.length = 0;
  game.focusTrackId = null;
  setView('fp');
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

/** validate + assign track to battery (defaults: selected track/battery).
 *  If the requested battery can't make the shot, automatically falls back to
 *  the best battery that can (keeps the engage flow to a single keypress). */
function assign(trackId = ctx.radar.selectedTrackId ?? game.aimTrackId, batteryId = game.selectedBatteryId) {
  const track = ctx.radar.getTrack(trackId);
  if (!track || track.gone) { game.engageHint = 'NO TRACK SELECTED'; return false; }
  let battery = ctx.batteries.get(batteryId);
  if (!battery) return false;

  const tryValidate = (b) => {
    if (b.ammo <= 0) return null;
    return predictIntercept(b.rig.group.position, track.threat.pos, track.threat.vel, b.def.interceptor.avgSpeed);
  };

  let sol = tryValidate(battery);
  let auto = false;
  if (!sol) {
    const fallbackId = bestBatteryFor(track);
    const fb = fallbackId ? ctx.batteries.get(fallbackId) : null;
    const fbSol = fb ? tryValidate(fb) : null;
    if (fb && fbSol) {
      battery = fb; sol = fbSol; auto = true;
      game.selectedBatteryId = battery.id;
      ctx.events.emit('battery-selected', { id: battery.id });
    } else {
      game.engageHint = battery.ammo <= 0
        ? `${battery.def.name} IS WINCHESTER (NO AMMO)`
        : `CANNOT ACHIEVE INTERCEPT — ${battery.def.name} TOO SLOW / TOO LATE`;
      ctx.ui.toast(game.engageHint, 'warn');
      return false;
    }
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
  if (auto) hint = `AUTO: ${battery.def.name} TAKES ${track.id} — ${hint}`;
  // per-track assignment: engaging a new track never drops other engagements,
  // and one battery may be assigned to several tracks at once
  game.assignments.set(track.id, battery.id);
  game.focusTrackId = track.id;
  track.assignedBattery = battery.id;
  battery.pointAt(sol.point);
  game.engageHint = hint;
  ctx.events.emit('track-assigned', { track, battery, sol });
  return true;
}

function authorize(trackId = game.focusTrackId ?? ctx.radar.selectedTrackId ?? game.aimTrackId) {
  const track = trackId ? ctx.radar.getTrack(trackId) : null;
  if (!track || track.gone) { game.engageHint = 'NO ASSIGNMENT — ASSIGN A TRACK FIRST'; return false; }
  if (!game.assignments.has(track.id) && !assign(track.id)) return false;
  game.focusTrackId = track.id;
  let battery = ctx.batteries.get(game.assignments.get(track.id));
  if (!battery.canAccept()) {
    // salvo roll: another ready battery takes the shot immediately…
    const altId = bestBatteryFor(track);
    if (altId && altId !== battery.id && assign(track.id, altId)) {
      battery = ctx.batteries.get(altId);
    } else {
      // …or the round queues on the assigned battery and fires the moment it cycles
      return queueRound(track, battery);
    }
  }
  const ok = battery.launch(track);
  if (ok) {
    track.engagedBy++;
    game.engageHint = `${battery.def.name} FIRING ON ${track.id} — F: FIRE AGAIN  E: NEW TARGET`;
    ctx.events.emit('launch-authorized', { track, battery });
    // assignment stays: pressing F again ripple-fires at the same threat
  }
  return ok;
}

/** queue an authorized round on a busy battery (fires automatically when ready) */
function queueRound(track, battery) {
  const queuedForBattery = game.fireQueue.filter((q) => q.batteryId === battery.id).length;
  if (battery.ammo - queuedForBattery <= 0) {
    game.engageHint = `${battery.def.name} HAS NO ROUNDS LEFT TO QUEUE`;
    ctx.ui.toast(game.engageHint, 'warn');
    return false;
  }
  if (game.fireQueue.length >= 12) {
    game.engageHint = 'FIRE QUEUE FULL';
    return false;
  }
  game.fireQueue.push({ trackId: track.id, batteryId: battery.id });
  const n = game.fireQueue.filter((q) => q.trackId === track.id).length;
  game.engageHint = `${battery.def.name} CYCLING — ROUND QUEUED ON ${track.id}${n > 1 ? ` (${n} WAITING)` : ''}`;
  ctx.ui.toast(`ROUND QUEUED — ${battery.def.name} WILL FIRE ON ${track.id} WHEN READY`, 'info', 4);
  ctx.events.emit('launch-queued', { track, battery });
  return true;
}

/** drain the fire queue: launch every queued round whose battery has cycled.
 *  Stale geometry re-rolls to the best available battery or drops the round. */
function processFireQueue() {
  if (!game.fireQueue.length) return;
  const kept = [];
  const firedThisPass = new Set();
  for (const q of game.fireQueue) {
    const track = ctx.radar.getTrack(q.trackId);
    if (!track || track.gone) continue; // target already dead — drop silently
    let battery = ctx.batteries.get(q.batteryId);
    if (firedThisPass.has(battery.id) || !battery.canAccept()) { kept.push(q); continue; }
    let sol = predictIntercept(battery.rig.group.position, track.threat.pos, track.threat.vel, battery.def.interceptor.avgSpeed);
    if (!sol) {
      // waited too long for this battery — see if any other can still make the shot
      const altId = bestBatteryFor(track);
      const alt = altId ? ctx.batteries.get(altId) : null;
      sol = alt ? predictIntercept(alt.rig.group.position, track.threat.pos, track.threat.vel, alt.def.interceptor.avgSpeed) : null;
      if (alt && sol && alt.canAccept() && !firedThisPass.has(alt.id)) {
        battery = alt;
        game.assignments.set(track.id, battery.id);
        track.assignedBattery = battery.id;
      } else if (alt && sol) {
        kept.push({ trackId: q.trackId, batteryId: alt.id }); // re-queue on the viable battery
        continue;
      } else {
        ctx.ui.toast(`QUEUED SHOT LOST — ${track.id} LEFT THE ENGAGEMENT ENVELOPE`, 'warn', 5);
        continue;
      }
    }
    battery.pointAt(sol.point);
    if (battery.launch(track)) {
      track.engagedBy++;
      firedThisPass.add(battery.id);
      ctx.events.emit('launch-authorized', { track, battery, queued: true });
    } else {
      kept.push(q);
    }
  }
  game.fireQueue = kept;
}

/** assign + authorize every live hostile track, most urgent first (tablet button) */
function engageAll() {
  const tracks = ctx.radar.activeTracks()
    .filter((tr) => !tr.classified.startsWith('DECOY'))
    .sort((a, b) => timeToGround(a.threat.pos, a.threat.vel, 0) - timeToGround(b.threat.pos, b.threat.vel, 0));
  let engaged = 0;
  for (const tr of tracks) {
    if (tr.engagedBy > 0 || game.fireQueue.some((q) => q.trackId === tr.id)) continue; // already covered
    const bid = game.assignments.get(tr.id) ?? bestBatteryFor(tr) ?? game.selectedBatteryId;
    if (!assign(tr.id, bid)) continue;
    if (authorize(tr.id)) engaged++;
  }
  if (engaged > 0) ctx.ui.toast(`BATCH ENGAGEMENT — ${engaged} TRACK${engaged > 1 ? 'S' : ''} UNDER FIRE`, 'warn', 5);
  else ctx.ui.toast('NO UNENGAGED HOSTILE TRACKS', 'info', 3);
  return engaged;
}

/** most urgent live track: shortest time-to-impact, deprioritizing
 *  classified decoys (radar knows once classification completes) */
function mostUrgentTrack() {
  let best = null;
  let bestT = Infinity;
  for (const tr of ctx.radar.activeTracks()) {
    const tImpact = timeToGround(tr.threat.pos, tr.threat.vel, 0);
    let t = tImpact > 0 ? tImpact : 1e6;
    if (tr.classified && tr.threat.isDecoy) t += 1e7; // engage decoys last
    if (t < bestT) { bestT = t; best = tr; }
  }
  return best;
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
  // (pose per console specialist: PPI readable, full holo disc clickable)
  const c = ctx.base.consolePos;
  consoleView.pos.set(c.x + 2.05, 1.84, c.z + 2.95);
  consoleView.look.set(c.x + 1.7, 1.18, c.z - 1.0);
}

function enterConsole() {
  if (game.mode === 'console') return;
  closeTablet();
  setView('fp');
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

// ============================================================ tactical tablet
// handheld TACOM pad: full engagement authority from anywhere on the base,
// so the player never has to walk back to the C2 shelter mid-raid.
function openTablet() {
  if (game.tabletOpen || game.mode === 'console') return;
  game.tabletOpen = true;
  ctx.player.setEnabled(false);
  ctx.player.unlockPointer();
  ctx.ui.showTablet(true);
  ctx.ui.crosshair(false);
  ctx.ui.setPrompt(null);
  ctx.events.emit('ui-click');
}
function closeTablet() {
  if (!game.tabletOpen) return;
  game.tabletOpen = false;
  ctx.ui.showTablet(false);
  if (game.viewMode === 'fp') {
    ctx.player.setEnabled(true);
    ctx.ui.crosshair(true);
    if (!isTestDriver) ctx.player.lockPointer();
  }
}
function toggleTablet() { game.tabletOpen ? closeTablet() : openTablet(); }

// ============================================================ chase views (V)
// cinematic follow cams: ride the newest interceptor out, or track the most
// urgent inbound threat. Zero extra render cost — same camera, new transform.
const chase = {
  pos: new THREE.Vector3(),
  look: new THREE.Vector3(),
  lastTargetPos: new THREE.Vector3(),
  lastVel: new THREE.Vector3(0, 1, 0),
  snapped: false,
};
function setView(mode, target = null) {
  if (mode !== 'fp' && !target) mode = 'fp';
  if (game.viewMode === mode && game.camTarget === target) return;
  game.viewMode = mode;
  game.camTarget = target;
  game.camHold = 0;
  chase.snapped = false;
  const fp = mode === 'fp';
  ctx.player.setEnabled(fp && !game.tabletOpen && game.mode === 'freeroam');
  ctx.ui.setCinema(!fp, mode === 'missile' ? 'INTERCEPTOR CAM' : 'THREAT TRACK CAM');
  if (game.mode === 'freeroam' && !game.tabletOpen) ctx.ui.crosshair(fp);
}
function cycleView() {
  if (game.mode === 'console') return;
  const ints = ctx.interceptors.active;
  const urgent = mostUrgentTrack();
  if (game.viewMode === 'fp') {
    if (ints.length) setView('missile', ints[ints.length - 1]);
    else if (urgent) setView('threat', urgent.threat);
    else ctx.ui.toast('NO AIRBORNE CAMERA TARGETS', 'info', 2.5);
  } else if (game.viewMode === 'missile') {
    if (urgent) setView('threat', urgent.threat);
    else setView('fp');
  } else {
    setView('fp');
  }
}
const _chaseVel = new THREE.Vector3();
const _chaseDesired = new THREE.Vector3();
const _chaseSide = new THREE.Vector3();
function updateChaseCam(dt) {
  if (game.viewMode === 'fp') return;
  const t = game.camTarget;
  const alive = t && (game.viewMode === 'missile'
    ? ctx.interceptors.active.includes(t)
    : ctx.threats.active.includes(t));
  if (alive) {
    if (t.vel.lengthSq() > 1) chase.lastVel.copy(t.vel).normalize();
    chase.lastTargetPos.copy(t.pos);
    const dist = game.viewMode === 'missile' ? 26 : 52;
    // 3/4 side chase: offset laterally out of the exhaust plume so the
    // missile reads against the sky instead of filling the frame with smoke
    _chaseSide.crossVectors(chase.lastVel, camera.up);
    if (_chaseSide.lengthSq() < 0.05) _chaseSide.set(1, 0, 0);
    _chaseSide.normalize();
    _chaseDesired.copy(t.pos)
      .addScaledVector(chase.lastVel, -dist * 0.62)
      .addScaledVector(_chaseSide, dist * 0.78)
      .addScaledVector(camera.up, dist * 0.30);
    _chaseDesired.y = Math.max(_chaseDesired.y, 3);
    if (!chase.snapped) { chase.pos.copy(_chaseDesired); chase.snapped = true; }
    else chase.pos.lerp(_chaseDesired, 1 - Math.exp(-dt * 4.0));
    chase.look.copy(t.pos).addScaledVector(_chaseVel.copy(chase.lastVel), 55);
  } else {
    // target just died — hold on the fireball for a beat, then move on
    game.camHold += dt;
    chase.look.copy(chase.lastTargetPos);
    if (game.camHold > 1.6) {
      const ints = ctx.interceptors.active;
      if (game.viewMode === 'missile' && ints.length) setView('missile', ints[ints.length - 1]);
      else if (game.viewMode === 'threat' && mostUrgentTrack()) setView('threat', mostUrgentTrack().threat);
      else setView('fp');
      return;
    }
  }
  camera.position.copy(chase.pos);
  _lookM.lookAt(chase.pos, chase.look, camera.up);
  camera.quaternion.setFromRotationMatrix(_lookM);
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
      else if (game.tabletOpen) closeTablet();
      else if (game.viewMode !== 'fp') setView('fp');
      else if (game.mode === 'console') exitConsole();
      break;
    case 'Tab':
      // works from anywhere: the camera flies to the console seat and the
      // player's outdoor position is restored on exit (walk-up + E still works)
      if (game.mode === 'console') exitConsole();
      else enterConsole();
      break;
    case 'KeyQ':
      // handheld TACOM pad — full engagement authority without leaving the pad
      if (game.mode !== 'console') toggleTablet();
      break;
    case 'KeyV':
      cycleView();
      break;
    case 'KeyE':
      if (game.mode === 'console') { exitConsole(); break; }
      if (game.nearConsole && !game.tabletOpen) enterConsole();
      else if (game.aimTrackId) { ctx.radar.selectTrack(game.aimTrackId); assign(game.aimTrackId); }
      break;
    case 'KeyF': {
      // one-key engagement everywhere. Priority: aimed threat -> selected
      // track -> focused engagement -> most urgent track. authorize()
      // self-assigns, ripple-fires and queues rounds as needed.
      const tid = (game.mode === 'freeroam' && !game.tabletOpen && game.aimTrackId)
        || ctx.radar.selectedTrackId
        || game.focusTrackId
        || mostUrgentTrack()?.id;
      if (tid) authorize(tid);
      else game.engageHint = 'NO TRACKS TO ENGAGE';
      break;
    }
    case 'KeyR':
      if (game.phase === 'debrief') { ctx.ui.hideDebrief(); restartScenario(); }
      break;
  }
});

canvas.addEventListener('pointerdown', () => {
  if (game.mode !== 'freeroam' || isTestDriver || ctx.ui.settingsOpen) return;
  if (game.tabletOpen) { closeTablet(); return; } // click past the pad = stow it
  ctx.player.lockPointer();
  ctx.audio.unlock();
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
  assignTrack: (trackId, batteryId) => assign(trackId, batteryId ?? game.selectedBatteryId),
  fireTrack: (trackId) => authorize(trackId),
  engageAll: () => engageAll(),
  closeTablet: () => closeTablet(),
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
  let bestAngle = 0.12; // ~7° cone — generous aim assist, threats are distant dots
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
    const assignedTo = game.assignments.get(tr.id);
    ctx.ui.setPrompt(
      `<span class="tp-title">${tr.id} · ${tr.classified}</span>\n` +
      `ALT ${fmtKm(t.pos.y)} · RNG ${fmtKm(Math.hypot(t.pos.x, t.pos.z))} · SPD ${Math.round(t.vel.length())} m/s\n` +
      (assignedTo
        ? `ASSIGNED TO ${ctx.batteries.get(assignedTo).def.name} — [F] FIRE / SALVO`
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
      setView('fp');
      closeTablet();
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
    const tImpact = timeToGround(tr.threat.pos, tr.threat.vel, 0);
    tracks.push({
      id: tr.id,
      classified: tr.classified,
      alt: tr.threat.pos.y,
      range: Math.hypot(tr.threat.pos.x, tr.threat.pos.z),
      assignedBattery: game.assignments.get(tr.id) ?? tr.assignedBattery,
      engagedBy: tr.engagedBy,
      queued: game.fireQueue.reduce((n, q) => n + (q.trackId === tr.id ? 1 : 0), 0),
      impactIn: tImpact > 0 ? tImpact : 0,
    });
  }
  const batteries = ctx.batteries.list.map((b) => ({
    id: b.id, state: b.displayState, ammo: b.ammo, maxAmmo: b.def.ammo, readyIn: Math.max(0, b.readyIn),
    queued: game.fireQueue.reduce((n, q) => n + (q.batteryId === b.id ? 1 : 0), 0),
    tracks: [...game.assignments].filter(([, bid]) => bid === b.id).map(([tid]) => tid),
  }));
  const selBat = ctx.batteries.get(game.selectedBatteryId);
  const focusA = focusAssignment();
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
    assignment: focusA
      ? { trackId: focusA.trackId, batteryName: ctx.batteries.get(focusA.batteryId).def.name }
      : null,
    assignments: [...game.assignments].map(([tid, bid]) => ({ trackId: tid, batteryId: bid })),
    queueCount: game.fireQueue.length,
    viewMode: game.viewMode,
    tabletOpen: game.tabletOpen,
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

  processFireQueue();
  updateChaseCam(dt);
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
      assignment: focusAssignment(),
      assignments: [...game.assignments].map(([tid, bid]) => ({ trackId: tid, batteryId: bid })),
      fireQueue: game.fireQueue.map((q) => ({ ...q })),
      viewMode: game.viewMode,
      tabletOpen: game.tabletOpen,
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
    document.body.classList.add('test-driver'); // kills CSS transitions/animations
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
  stopScenario() {
    ctx.threats.clear(); ctx.interceptors.clear(); ctx.ui.hideDebrief();
    game.assignments.clear(); game.fireQueue.length = 0; game.focusTrackId = null;
    setView('fp'); game.phase = 'idle'; updateSearchlights();
  },
  selectBattery(id) { selectBattery(id); },
  selectTrack(id) { ctx.radar.selectTrack(id); },
  assign(trackId, batteryId) { return assign(trackId, batteryId); },
  authorize(trackId) { return authorize(trackId); },
  engageAll() { return engageAll(); },
  openTablet() { openTablet(); },
  closeTablet() { closeTablet(); },
  setView(mode) {
    if (mode === 'fp') setView('fp');
    else if (mode === 'missile') setView('missile', ctx.interceptors.active.at(-1) ?? null);
    else if (mode === 'threat') setView('threat', mostUrgentTrack()?.threat ?? null);
    return game.viewMode;
  },
  cycleView() { cycleView(); return game.viewMode; },
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
