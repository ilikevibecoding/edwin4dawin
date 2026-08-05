// main.js — composition root: renderer, fixed-step simulation, game state machine,
// engagement logic, outdoor targeting, C2 screens, and the deterministic test API.
import * as THREE from 'three';
import { TEST_MODE, SEED, clamp, lerp, fmtKm } from './utils.js';
import { Weather, Searchlights, CONDITIONS } from './weather.js';
import { Base } from './base.js';
import { BatteryManager, BATTERY_DEFS } from './batteries.js';
import { ThreatManager, SCENARIOS } from './threats.js';
import { InterceptorManager } from './interceptors.js';
import { Radar } from './radar.js';
import { Effects } from './effects.js';
import { Player } from './player.js';
import { AudioSys } from './audio.js';
import { UI } from './ui.js';
import { Post } from './post.js';

const FIXED_DT = 1 / 60;

// ---------------------------------------------------------------- renderer & scene
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 30000);
camera.rotation.order = 'YXZ';

// ---------------------------------------------------------------- systems
const weather = new Weather(scene, renderer);
const base = new Base(scene);
const radar = new Radar(scene, base);
const batteries = new BatteryManager(scene, base);
const effects = new Effects(scene, camera);
const threats = new ThreatManager(scene, effects, base);
const interceptors = new InterceptorManager(scene, effects);
const searchlights = new Searchlights(scene, [
  new THREE.Vector3(-90, 0, 80), new THREE.Vector3(95, 0, -70),
]);
const audio = new AudioSys();
const player = new Player(camera, renderer.domElement, base.colliders);
player.teleport(base.playerSpawn.pos.x, base.playerSpawn.pos.z, base.playerSpawn.yaw, 0.02);
const post = new Post(renderer, scene, camera);

// ---------------------------------------------------------------- game state
const game = {
  mode: 'start',              // start | fps | console | paused
  scenarioState: 'idle',      // idle | running | debrief
  condition: 'day',
  scenarioKey: 'single',
  simTime: 0,
  results: { threats: 0, hits: 0, decoys: 0, impacts: 0, shots: 0, misses: 0 },
  selectedTrackId: null,
  reducedMotion: localStorage.getItem('aw-reduced') === '1',
  quality: localStorage.getItem('aw-quality') !== 'low',
  alarm: false,
  endTimer: -1,
  autoDefend: false,
  cine: false,
  fpsSamples: [],
  fpsText: '',
};
player.reducedMotion = game.reducedMotion;
document.body.classList.toggle('reduced-motion', game.reducedMotion);
post.setQuality(game.quality ? 'high' : 'low');

// ambient colors used to tint smoke per condition
const SMOKE_AMBIENT = {
  day: new THREE.Color(0.98, 0.97, 0.94),
  sunset: new THREE.Color(0.95, 0.68, 0.5),
  night: new THREE.Color(0.16, 0.19, 0.26),
};

// ---------------------------------------------------------------- engagement plumbing
for (const b of batteries.list) {
  b.onReadyToFire = (bat, info) => {
    const track = info.track;
    if (!track || !track.threat || !track.threat.alive) return;
    interceptors.launch(bat.key, bat.def.interceptor, { pos: info.pos, dir: info.dir }, track, game.simTime);
    track.engagedBy = (track.engagedBy || 0) + 1;
    game.results.shots += 1;
    const d = camera.position.distanceTo(info.pos);
    audio.launch(d, bat.def.interceptor.plume);
    ui.log(`${bat.def.name} — BIRD AWAY ▸ TRK ${track.callsign}`, 'warn');
    ui.toast(`${bat.def.name}: BIRD AWAY ▸ ${track.callsign}`);
  };
}

interceptors.onResult = (res) => {
  const cs = res.threat ? trackCallsign(res.threat.id) : '?';
  if (res.type === 'hit') {
    game.results.hits += 1;
    ui.showResult('ok', 'INTERCEPTED', `${cs} destroyed at ${fmtKm(res.alt)} altitude — proximity kill (${res.missDist.toFixed(0)} m)`);
    ui.log(`INTERCEPT ▸ ${cs} killed at ${fmtKm(res.alt)}`, '');
  } else if (res.type === 'decoy') {
    game.results.decoys += 1;
    ui.showResult('neutral', 'DECOY NEUTRALIZED', `${cs} carried no warhead — interceptor expended on a lure`);
    ui.log(`DECOY KILL ▸ ${cs} was a lure`, 'warn');
  } else if (res.type === 'miss') {
    game.results.misses += 1;
    ui.showResult('bad', 'MISS', `${cs} evaded by ${res.missDist.toFixed(0)} m — ${res.reason}`);
    ui.log(`MISS ▸ ${cs} (${res.reason})`, 'crit');
    const tr = res.threat ? radar.tracks.get(res.threat.id) : null;
    if (tr) tr.engagedBy = Math.max(0, (tr.engagedBy || 1) - 1);
  }
};

threats.onEvent = (ev) => {
  if (ev.type === 'spawn') {
    ui.log(`LAUNCH PLUME — bearing ${Math.round(((Math.atan2(ev.threat.pos.z, ev.threat.pos.x) * 180 / Math.PI) + 360) % 360)}°`, 'warn');
  } else if (ev.type === 'impact') {
    game.results.impacts += 1;
    const inBase = Math.abs(ev.pos.x) < 155 && Math.abs(ev.pos.z) < 140;
    ui.showResult('bad', 'GROUND IMPACT', inBase ? `${trackCallsign(ev.threat.id)} struck the base perimeter` : `${trackCallsign(ev.threat.id)} impacted the desert floor`);
    ui.log(`IMPACT ▸ ${trackCallsign(ev.threat.id)} ${inBase ? 'INSIDE PERIMETER' : 'open desert'}`, 'crit');
  } else if (ev.type === 'decoyBurnup') {
    game.results.decoys += 1;
    ui.toast(`${trackCallsign(ev.threat.id)} BURNED UP — DECOY`, 'amber');
    ui.log(`${trackCallsign(ev.threat.id)} burned up — decoy confirmed`, 'warn');
  }
};

radar.onNewTrack = (track) => {
  audio.newTrackAlert();
  ui.toast(`NEW TRACK ${track.callsign}`, 'red');
  ui.log(`NEW BALLISTIC TRACK ▸ ${track.callsign}`, 'crit');
  if (!game.selectedTrackId) game.selectedTrackId = track.id;
};

effects.onShake = (amount) => player.addTrauma(amount);
effects.onBoom = (pos, size, kind) => {
  const d = camera.position.distanceTo(pos);
  if (kind !== 'launch') audio.boom(d, size, kind);
};
player.onFootstep = (sprint) => audio.footstep(sprint);

const trackCallsign = (threatId) => {
  const tr = radar.tracks.get(threatId);
  return tr ? tr.callsign : 'UNKNOWN';
};

// ---------------------------------------------------------------- api (UI + tests share this)
const api = {
  beginPlay() {
    if (game.mode !== 'start') return;
    game.mode = 'fps';
    ui.setMode('fps');
    audio.resume();
    if (!TEST_MODE) player.requestLock();
  },
  enterConsole() {
    game.mode = 'console';
    player.enabled = false;
    player.exitLock();
    ui.setMode('console');
    audio.uiClick();
  },
  exitConsole() {
    game.mode = 'fps';
    player.enabled = true;
    ui.setMode('fps');
    if (!TEST_MODE) player.requestLock();
  },
  pause() {
    if (game.mode === 'console') return api.exitConsole();
    game.mode = 'paused';
    player.enabled = false;
    player.exitLock();
    ui.setMode('paused');
  },
  resume() {
    game.mode = 'fps';
    player.enabled = true;
    ui.setMode('fps');
    if (!TEST_MODE) player.requestLock();
  },
  setCondition(name) {
    if (!CONDITIONS[name]) return;
    game.condition = name;
    weather.setCondition(name, TEST_MODE);
    renderer.toneMappingExposure = CONDITIONS[name].exposure;
    ui.log(`CONDITIONS SET ▸ ${name.toUpperCase()}`);
  },
  selectScenario(key) {
    if (SCENARIOS[key]) { game.scenarioKey = key; ui.log(`SCENARIO STAGED ▸ ${SCENARIOS[key].name}`); }
  },
  selectBattery(key) {
    batteries.select(key);
  },
  selectTrack(id) {
    game.selectedTrackId = id;
  },
  startScenario() {
    if (game.scenarioState === 'running') return;
    const sc = SCENARIOS[game.scenarioKey];
    if (sc.forceNight && game.condition !== 'night') api.setCondition('night');
    effects.reset();
    interceptors.reset();
    batteries.resetForScenario();
    radar.startScenario();
    const n = threats.startScenario(game.scenarioKey);
    game.scenarioState = 'running';
    game.results = { threats: n, hits: 0, decoys: 0, impacts: 0, shots: 0, misses: 0 };
    game.selectedTrackId = null;
    game.endTimer = -1;
    ui.log(`SCENARIO ACTIVE ▸ ${sc.name} — ${n} inbound`, 'crit');
    ui.toast(`${sc.name} — ${n} INBOUND`, 'red');
    audio.radarPing();
  },
  resetScenario() {
    threats.reset();
    interceptors.reset();
    effects.reset();
    batteries.resetForScenario();
    radar.startScenario();
    game.scenarioState = 'idle';
    game.alarm = false;
    base.setAlarm(false);
    audio.alarm(false);
    ui.log('SCENARIO RESET');
  },
  restartScenario() {
    api.resetScenario();
    api.startScenario();
  },
  assign(trackId, batteryKey) {
    const tr = radar.tracks.get(trackId);
    const bat = batteries.batteries[batteryKey || batteries.selectedKey];
    if (!tr || !tr.threat.alive || !bat) { audio.uiDeny(); return false; }
    // clear battery's previous assignment
    for (const [, t] of radar.tracks) if (t.assignedBattery === bat.key) t.assignedBattery = null;
    tr.assignedBattery = bat.key;
    bat.assignedTrackId = trackId;
    game.selectedTrackId = trackId;
    audio.uiClick();
    ui.log(`ASSIGN ▸ ${tr.callsign} → ${bat.def.name}`);
    ui.toast(`${tr.callsign} ASSIGNED → ${bat.def.name}`);
    return true;
  },
  assignSelected() {
    if (game.selectedTrackId) return api.assign(game.selectedTrackId, batteries.selectedKey);
    audio.uiDeny();
    return false;
  },
  authorize(batteryKey) {
    const bat = batteries.batteries[batteryKey || batteries.selectedKey];
    if (!bat || !bat.assignedTrackId) { audio.uiDeny(); ui.toast('NO TARGET ASSIGNED', 'amber'); return false; }
    const tr = radar.tracks.get(bat.assignedTrackId);
    if (!tr || !tr.threat.alive) { audio.uiDeny(); ui.toast('TARGET LOST', 'amber'); bat.assignedTrackId = null; return false; }
    if (!bat.canEngage()) {
      audio.uiDeny();
      ui.toast(`${bat.def.name}: ${bat.statusText}`, 'amber');
      return false;
    }
    bat.requestLaunch(tr);
    audio.uiClick();
    ui.log(`AUTHORIZED ▸ ${bat.def.name} on ${tr.callsign} — prepping`, 'warn');
    return true;
  },
  toggleReducedMotion() {
    game.reducedMotion = !game.reducedMotion;
    player.reducedMotion = game.reducedMotion;
    localStorage.setItem('aw-reduced', game.reducedMotion ? '1' : '0');
    document.body.classList.toggle('reduced-motion', game.reducedMotion);
    return game.reducedMotion;
  },
  toggleMute() {
    audio.setMuted(!audio.muted);
    return audio.muted;
  },
  toggleQuality() {
    game.quality = !game.quality;
    localStorage.setItem('aw-quality', game.quality ? 'high' : 'low');
    post.setQuality(game.quality ? 'high' : 'low');
    effects.quality = game.quality ? 1 : 0.55;
    return game.quality;
  },
  onKey(code) {
    if (game.mode === 'start') {
      if (code === 'Enter' || code === 'Space') api.beginPlay();
      return;
    }
    if (code === 'Escape') {
      if (game.mode === 'console') api.exitConsole();
      else if (game.mode === 'paused') api.resume();
      else if (game.mode === 'fps') api.pause();
      return;
    }
    if (game.mode !== 'fps' && game.mode !== 'console') return;
    if (code === 'Digit1') { api.selectBattery('patriot'); audio.uiClick(); }
    if (code === 'Digit2') { api.selectBattery('thaad'); audio.uiClick(); }
    if (code === 'Digit3') { api.selectBattery('sentinel'); audio.uiClick(); }
    if (code === 'KeyM') api.toggleMute();
    if (code === 'KeyR' && game.scenarioState === 'debrief') api.restartScenario();
    if (code === 'Tab') {
      const list = radar.trackList();
      if (list.length) {
        const idx = list.findIndex((t) => t.id === game.selectedTrackId);
        game.selectedTrackId = list[(idx + 1) % list.length].id;
        audio.uiClick();
      }
    }
    if (game.mode === 'fps') {
      if (code === 'KeyE') {
        if (isConsoleNear()) api.enterConsole();
        else if (lookTarget) api.assign(lookTarget.id, batteries.selectedKey);
        else if (game.selectedTrackId && game.scenarioState === 'running') api.assignSelected();
      }
      if (code === 'KeyF') api.authorize();
    }
  },
  // test helpers
  teleport(x, z, yaw, pitch) { player.teleport(x, z, yaw, pitch); },
  cine(px, py, pz, tx, ty, tz) {
    game.cine = true;
    camera.position.set(px, py, pz);
    camera.lookAt(tx, ty, tz);
  },
  cineOff() { game.cine = false; },
  setAutoDefend(v) { game.autoDefend = v; },
};

// pointer-lock loss → pause (unless intentional)
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && game.mode === 'fps' && !TEST_MODE) {
    // small delay so intentional transitions (console) don't trigger pause
    setTimeout(() => {
      if (game.mode === 'fps' && !document.pointerLockElement) api.pause();
    }, 60);
  }
});
renderer.domElement.addEventListener('mousedown', () => {
  if (game.mode === 'fps' && !TEST_MODE && !player.pointerLocked) player.requestLock();
  audio.resume();
});

// ---------------------------------------------------------------- outdoor targeting
let lookTarget = null;
const _proj = new THREE.Vector3();
function computeLookTarget() {
  lookTarget = null;
  if (game.mode !== 'fps') return;
  let best = null, bestD = 0.085;
  for (const tr of radar.trackList()) {
    _proj.copy(tr.threat.pos).project(camera);
    if (_proj.z > 1 || _proj.z < -1) continue;
    const d = Math.hypot(_proj.x, _proj.y * 0.8);
    if (d < bestD) { bestD = d; best = tr; }
  }
  if (best) {
    const sx = (_proj.copy(best.threat.pos).project(camera).x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-_proj.y * 0.5 + 0.5) * window.innerHeight;
    lookTarget = {
      id: best.id,
      callsign: best.callsign,
      range: camera.position.distanceTo(best.threat.pos),
      alt: best.threat.pos.y,
      decoyKnown: best.classified,
      terminal: best.threat.phase === 'terminal',
      assignedBattery: best.assignedBattery,
      screen: { x: sx, y: sy },
    };
  }
}

function isConsoleNear() {
  const cz = base.consoleZone;
  const dx = player.pos.x - cz.pos.x, dz = player.pos.z - cz.pos.z;
  return dx * dx + dz * dz < cz.r * cz.r;
}

// ---------------------------------------------------------------- auto defense (tests/demo)
function autoDefendTick() {
  if (!game.autoDefend || game.scenarioState !== 'running') return;
  for (const tr of radar.trackList()) {
    if (tr.classified) continue; // ignore known decoys
    if (tr.assignedBattery && tr.engagedBy > 0) continue;
    if (tr.assignedBattery) {
      const bat = batteries.batteries[tr.assignedBattery];
      if (bat && bat.canEngage() && bat.assignedTrackId === tr.id) api.authorize(bat.key);
      continue;
    }
    // pick a battery by altitude band
    const alt = tr.threat.pos.y;
    const order = alt > 5200 ? ['sentinel', 'thaad', 'patriot'] : alt > 2200 ? ['thaad', 'patriot', 'sentinel'] : ['patriot', 'thaad', 'sentinel'];
    for (const key of order) {
      const bat = batteries.batteries[key];
      if (bat.canEngage() && !bat.assignedTrackId) {
        api.assign(tr.id, key);
        api.authorize(key);
        break;
      }
    }
  }
}

// ---------------------------------------------------------------- C2 interior screens
let screenTimer = 0;
function drawScreens(dt) {
  screenTimer -= dt;
  if (screenTimer > 0) return;
  screenTimer = 0.25;
  const [c0, c1, c2] = base.screenCanvases;
  // mini radar
  {
    const ctx = c0.getContext('2d');
    const w = c0.width, h = c0.height;
    ctx.fillStyle = '#04140b'; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 8;
    ctx.strokeStyle = 'rgba(120,240,160,0.25)';
    for (let r = R / 3; r <= R; r += R / 3) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
    const a = radar.sweepAngle;
    const grd = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    grd.addColorStop(0, 'rgba(140,255,180,0.0)');
    grd.addColorStop(1, 'rgba(140,255,180,0.8)');
    ctx.strokeStyle = grd; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#ff6a5a';
    for (const tr of radar.trackList()) {
      const x = cx + (tr.threat.pos.x / 9000) * R;
      const y = cy + (tr.threat.pos.z / 9000) * R;
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
    base.screens[0].needsUpdate = true;
  }
  // battery status
  {
    const ctx = c1.getContext('2d');
    ctx.fillStyle = '#0a1006'; ctx.fillRect(0, 0, c1.width, c1.height);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#8affb1';
    ctx.fillText('BATTERY STATUS', 10, 18);
    let y = 40;
    for (const b of batteries.list) {
      ctx.fillStyle = b.state === 'ready' ? '#4f6' : (b.state === 'empty' || b.state === 'reloading' ? '#f66' : '#fb4');
      ctx.fillRect(10, y - 9, 8, 8);
      ctx.fillStyle = '#9fdcb2';
      ctx.fillText(`${b.def.name.slice(0, 14)} ${b.ammo}/${b.def.ammo}`, 26, y);
      y += 24;
    }
    ctx.fillStyle = '#5c8a6b';
    ctx.fillText(`T+${game.simTime.toFixed(0)}s  ${game.condition.toUpperCase()}`, 10, 140);
    base.screens[1].needsUpdate = true;
  }
  // diagnostics / scenario
  {
    const ctx = c2.getContext('2d');
    ctx.fillStyle = '#0b0d06'; ctx.fillRect(0, 0, c2.width, c2.height);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#ffb454';
    ctx.fillText(game.scenarioState === 'running' ? '▲ ENGAGEMENT ACTIVE' : 'SYSTEM NOMINAL', 10, 20);
    ctx.fillStyle = '#8fae97';
    const lines = [
      `THREATS ALIVE  ${threats.aliveCount}`,
      `TRACKS         ${radar.liveTrackCount}`,
      `BIRDS OUT      ${interceptors.flyingCount}`,
      `HITS/MISS      ${game.results.hits}/${game.results.misses}`,
      `IMPACTS        ${game.results.impacts}`,
    ];
    lines.forEach((l, i) => ctx.fillText(l, 10, 44 + i * 19));
    base.screens[2].needsUpdate = true;
  }
}

// ---------------------------------------------------------------- state snapshot for UI/tests
function buildState() {
  const trackArr = radar.trackList().map((tr) => ({
    id: tr.id,
    callsign: tr.callsign,
    x: tr.threat.pos.x, z: tr.threat.pos.z,
    vx: tr.threat.vel.x, vz: tr.threat.vel.z,
    alt: tr.threat.pos.y,
    range: Math.hypot(tr.threat.pos.x, tr.threat.pos.y, tr.threat.pos.z),
    speed: tr.threat.vel.length(),
    quality: tr.quality,
    decoyKnown: tr.classified,
    terminal: tr.threat.phase === 'terminal',
    assignedBattery: tr.assignedBattery,
    engagedBy: tr.engagedBy || 0,
    selected: tr.id === game.selectedTrackId,
    impactX: tr.predImpact ? tr.predImpact.x : null,
    impactZ: tr.predImpact ? tr.predImpact.z : null,
    impactT: tr.predImpactT || 0,
  }));
  const batArr = batteries.list.map((b) => ({
    key: b.key,
    name: b.def.name,
    state: b.state,
    statusText: b.statusText,
    ammo: b.ammo, ammoMax: b.def.ammo,
    selected: b.key === batteries.selectedKey,
    assignedCallsign: b.assignedTrackId ? (radar.tracks.get(b.assignedTrackId) || {}).callsign : null,
    x: b.group.position.x, z: b.group.position.z,
  }));
  const selBat = batteries.selected;
  return {
    mode: game.mode,
    scenarioState: game.scenarioState,
    running: game.scenarioState === 'running',
    condition: game.condition,
    conditionName: game.condition,
    scenarioKey: game.scenarioKey,
    scenarioName: SCENARIOS[game.scenarioKey].name,
    simTime: game.simTime,
    threatsAlive: threats.aliveCount,
    threatsPending: threats.pendingCount,
    interceptorsFlying: interceptors.flyingCount,
    tracks: trackArr,
    batteries: batArr,
    interceptors: interceptors.active.map((i) => ({ x: i.pos.x, z: i.pos.z, alt: i.pos.y })),
    sweepAngle: radar.sweepAngle,
    alarm: game.alarm,
    consoleNear: game.mode === 'fps' && isConsoleNear(),
    lookTarget,
    selectedBatteryAssigned: selBat && selBat.assignedTrackId ? (radar.tracks.get(selBat.assignedTrackId) || {}).callsign : null,
    results: game.results,
    fpsText: game.fpsText,
  };
}

// ---------------------------------------------------------------- simulation step
function step(dt) {
  game.simTime += dt;
  const t = game.simTime;

  weather.update(dt);
  base.update(dt, t);
  base.setFloodAmount(weather.floodAmount ?? 0);
  batteries.update(dt, t);
  threats.update(dt, t);
  radar.update(dt, t, threats.active);
  interceptors.update(dt, t);
  searchlights.setEnabled(weather.isNight && game.scenarioState === 'running');
  searchlights.update(dt, t);

  // environment for particles
  const amb = SMOKE_AMBIENT[game.condition] || SMOKE_AMBIENT.day;
  effects.setEnvironment({
    ambient: amb,
    fogColor: scene.fog.color,
    fogDensity: scene.fog.density,
    wind: _windVec.copy(weather.windDir).multiplyScalar(weather.windSpeed),
  });
  effects.update(dt, t);

  if (!game.cine) player.update(dt, t);

  // alarm: any live hostile below 2400 m
  const danger = threats.active.some((th) => th.alive && !th.decoy && th.pos.y < 2400);
  if (danger !== game.alarm) {
    game.alarm = danger;
    base.setAlarm(danger);
    audio.alarm(danger && game.mode !== 'console');
  }

  computeLookTarget();
  autoDefendTick();

  // scenario end detection
  if (game.scenarioState === 'running') {
    const done = threats.aliveCount === 0 && threats.pendingCount === 0 && interceptors.flyingCount === 0;
    if (done) {
      if (game.endTimer < 0) game.endTimer = 2.4;
      game.endTimer -= dt;
      if (game.endTimer <= 0) {
        game.scenarioState = 'debrief';
        game.alarm = false;
        base.setAlarm(false);
        audio.alarm(false);
        ui.log(`ENGAGEMENT COMPLETE — ${game.results.hits} killed, ${game.results.impacts} impacts`, 'warn');
      }
    } else game.endTimer = -1;
  }

  audio.update(dt);
  audio.setWind(clamp(weather.windSpeed / 4, 0, 1) * (weather.isNight ? 0.7 : 1));
  drawScreens(dt);
  ui.update(dt);
}
const _windVec = new THREE.Vector3();

// ---------------------------------------------------------------- render loop
let last = performance.now();
let acc = 0;
let frameCount = 0;

renderer.info.autoReset = false;
function render() {
  renderer.info.reset();
  effects.setPointScale(renderer.getSize(_size2).y, camera);
  post.render(FIXED_DT, game.simTime);
}
const _size2 = new THREE.Vector2();

function loop(now) {
  requestAnimationFrame(loop);
  const rawDt = Math.min((now - last) / 1000, 0.1);
  last = now;

  // fps meter
  game.fpsSamples.push(rawDt);
  if (game.fpsSamples.length > 40) game.fpsSamples.shift();
  frameCount++;
  if (frameCount % 20 === 0) {
    const avg = game.fpsSamples.reduce((a, b) => a + b, 0) / game.fpsSamples.length;
    game.fpsText = `${(1 / avg).toFixed(0)} FPS · ${renderer.info.render.calls} DC · ${(renderer.info.render.triangles / 1000).toFixed(0)}k TRI`;
  }

  if (!TEST_MODE) {
    if (game.mode !== 'paused') {
      acc += rawDt;
      let steps = 0;
      while (acc >= FIXED_DT && steps < 4) {
        step(FIXED_DT);
        acc -= FIXED_DT;
        steps++;
      }
      if (steps === 4) acc = 0;
    } else {
      ui.update(rawDt);
    }
  }
  render();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  post.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------- UI + boot
const gameFacade = {
  get state() { return uiState; },
  api,
  audio,
};
let uiState = null;
const ui = new UI(gameFacade);
// rebuild state before each ui.update via wrapper
const uiUpdateOrig = ui.update.bind(ui);
ui.update = (dt) => { uiState = buildState(); uiUpdateOrig(dt); };

ui.setMode('start');
step(FIXED_DT); // prime one step so everything has valid state
requestAnimationFrame(loop);

// ---------------------------------------------------------------- test API
window.__game = {
  seed: SEED,
  testMode: TEST_MODE,
  api,
  step(n = 1, dt = FIXED_DT) {
    for (let i = 0; i < n; i++) step(dt);
    render();
  },
  state() { return JSON.parse(JSON.stringify(buildState())); },
  perf() {
    return {
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      programs: renderer.info.programs ? renderer.info.programs.length : 0,
    };
  },
  measureFps(seconds = 3) {
    return new Promise((resolve) => {
      const samples = [];
      let lastT = performance.now();
      let stop = false;
      setTimeout(() => (stop = true), seconds * 1000);
      const tick = (t) => {
        samples.push(t - lastT);
        lastT = t;
        if (!stop) requestAnimationFrame(tick);
        else {
          samples.sort((a, b) => a - b);
          const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
          resolve({
            frames: samples.length,
            avgMs: avg,
            fps: 1000 / avg,
            p95Ms: samples[Math.floor(samples.length * 0.95)] || 0,
          });
        }
      };
      requestAnimationFrame(tick);
    });
  },
  three: { renderer, scene, camera },
};
