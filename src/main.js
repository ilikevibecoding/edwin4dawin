// Entry point: builds the scene, wires every subsystem together and owns the
// game loop and scenario state machine.

import * as THREE from 'three';
import { WORLD, PLAYER, QUALITY, BATTERIES, BATTERY_BY_ID, SCENARIOS, SCENARIO_BY_ID, TOD } from './config.js';
import { state, bus, PHASE, BATTERY_STATE, resetBatteryState, pushMessage, setPhase } from './state.js';
import { RNG } from './util/rng.js';
import { setTextureAnisotropy } from './util/textures.js';
import { materials, updateAtmosphere, atmosphere } from './util/materials.js';
import { CollisionWorld } from './physics.js';
import { Weather } from './weather.js';
import { Base, terrainHeight } from './base.js';
import { Player } from './player.js';
import { Effects } from './effects.js';
import { ThreatManager } from './threats.js';
import { InterceptorManager } from './interceptors.js';
import { BatteryManager } from './batteries.js';
import { RadarSystem, ConsoleRig } from './radar.js';
import { AudioEngine } from './audio.js';
import { Post } from './post.js';
import { UI } from './ui.js';

const params = new URLSearchParams(location.search);
const TEST = params.get('test') === '1';
const SEED = Number(params.get('seed') || 20260805);
const FIXED_DT = 1 / 60;

state.testMode = TEST;
state.seed = SEED;

function pickQuality() {
  const q = params.get('quality');
  if (q && QUALITY[q]) return q;
  if (TEST) return 'high';
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 8;
  if (cores >= 8 && mem >= 8) return 'ultra';
  if (cores >= 4) return 'high';
  return 'medium';
}

class Game {
  constructor() {
    state.quality = pickQuality();
    this.quality = QUALITY[state.quality];
    this.rng = new RNG(SEED);

    // ---- renderer ----------------------------------------------------
    this.canvas = document.getElementById('view');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
      stencil: false,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5) * this.quality.pixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    // Accumulate stats across every composer pass instead of only the last one.
    this.renderer.info.autoReset = false;
    setTextureAnisotropy(Math.min(this.quality.anisotropy, this.renderer.capabilities.getMaxAnisotropy()));

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, WORLD.cameraNear, WORLD.cameraFar);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    // ---- world -------------------------------------------------------
    materials();
    this.weather = new Weather(this.renderer, this.scene, this.quality);
    this.base = new Base(this.scene, this.quality, SEED);
    this.effects = new Effects(this.scene, this.quality, this.weather);
    this.effects.terrainFn = terrainHeight;

    this.collision = new CollisionWorld();
    this.scene.updateMatrixWorld(true);

    this.interceptors = new InterceptorManager(this.scene, this.effects, 8);
    this.threats = new ThreatManager(this.scene, this.effects, 12);
    this.batteries = new BatteryManager(this.scene, this.effects, this.interceptors, SEED);
    this.batteries.camera = this.camera;

    this.consoleRig = new ConsoleRig(this.scene, this.base.consoleAnchor, this.base.consoleYaw);
    this.radar = new RadarSystem(this.rng.fork('radar'));

    this.scene.updateMatrixWorld(true);
    this.base.registerColliders(this.collision);
    this.batteries.registerColliders(this.collision);
    this.collision.addFromObject(this.consoleRig.group);

    this.player = new Player(this.camera, this.collision, this.canvas);
    this.player.pos.set(PLAYER.spawn[0], terrainHeight(PLAYER.spawn[0], PLAYER.spawn[2]), PLAYER.spawn[2]);

    this.audio = new AudioEngine();
    this.post = new Post(this.renderer, this.scene, this.camera, this.quality);
    this.ui = new UI(document.getElementById('hud'), { action: (a, v) => this.action(a, v) });

    // ---- loop state --------------------------------------------------
    this.lastFrameTime = 0;
    this.elapsed = 0;
    this.frame = 0;
    this.fpsAccum = 0;
    this.fpsFrames = 0;
    this.paused = false;
    this.docked = false;
    this.scenarioActive = false;
    this.scenarioTime = 0;
    this.scenarioEndTimer = 0;
    this.record = [];
    this.lastResult = null;
    this.selectedTrackId = null;
    this.assignedTrackId = null;
    this.lookTrack = null;
    this.hoverButton = null;
    this._tmpV = new THREE.Vector3();
    this._tmpV2 = new THREE.Vector3();
    this._markers = [];

    this.applyTimeOfDay(state.todId);
    this.bindEvents();
    this.bindInput();

    this.ui.setOverlay('briefing');
    this.ui.updateSelections();
    this.ui.setHint(
      `<span class="kbd">WASD</span> MOVE &middot; <span class="kbd">SHIFT</span> SPRINT &middot; <span class="kbd">Q</span> CONSOLE &middot; <span class="kbd">TAB</span> NEXT TRACK &middot; <span class="kbd">E</span> ASSIGN &middot; <span class="kbd">F</span> AUTHORIZE &middot; <span class="kbd">R</span> RESTART &middot; <span class="kbd">ESC</span> MENU`
    );
    setPhase(PHASE.BRIEFING);

    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  }

  /* ------------------------------------------------------------- events */

  bindEvents() {
    bus.on('track:new', (tr) => {
      pushMessage(`NEW TRACK ${tr.id} — BRG ${Math.round((tr.bearing * 180) / Math.PI)}° RNG ${(tr.range / 1000).toFixed(1)}KM`, 'warn');
      this.audio.ping();
    });
    bus.on('track:firm', (tr) => {
      pushMessage(`${tr.id} FIRM — ${tr.classified}`, 'warn');
      if (!this.selectedTrackId) this.selectTrack(tr.id, false);
      if (this.firstAlarm !== this.scenarioRunId) {
        this.firstAlarm = this.scenarioRunId;
        this.audio.alarm(3);
        this.ui.showBanner('INBOUND BALLISTIC', 'RADAR HOLDS FIRM TRACK — COMMIT A BATTERY', '#ff5c47', 2.6);
      }
    });
    bus.on('track:lost', (tr) => {
      if (this.selectedTrackId === tr.id) this.selectedTrackId = null;
      if (this.assignedTrackId === tr.id) this.assignedTrackId = null;
    });

    bus.on('interceptor:launch', (m) => {
      pushMessage(`${m.cfg.codeName} AWAY — ${m.label} TO ${m.trackId || 'BALLISTIC'}`, 'good');
      this.audio.launch(m.pos, m.cfg);
      const d = m.pos.distanceTo(this.camera.position);
      this.player.addShake(THREE.MathUtils.clamp(2.2 - d / 90, 0.12, 1.1));
    });

    bus.on('interceptor:detonate', ({ interceptor, hit, dist, reason }) => {
      const cfg = interceptor.cfg;
      this.audio.explosion(interceptor.pos, hit ? 26 : 14, 'air');
      const d = interceptor.pos.distanceTo(this.camera.position);
      this.player.addShake(THREE.MathUtils.clamp(1.4 - d / 900, 0.05, 0.8));
      const target = interceptor.target;
      if (hit && target && target.alive) {
        const decoy = target.kind === 'DECOY';
        this.threats.destroyThreat(target, decoy ? 'DECOY' : 'INTERCEPT', this.camera, true);
        if (decoy) {
          state.stats.decoysWasted++;
          this.setResult('DECOY', `${interceptor.label} KILLED DECOY ${interceptor.trackId} — MISS DISTANCE ${dist.toFixed(0)}M`, 'amber');
          this.ui.showBanner('DECOY DESTROYED', 'NON-WARHEAD OBJECT — ROUND EXPENDED', '#ffc846');
        } else {
          state.stats.intercepted++;
          this.setResult('INTERCEPTED', `${cfg.short} KILLED ${interceptor.trackId} AT ${(target.pos.y / 1000).toFixed(1)}KM — MISS DISTANCE ${dist.toFixed(0)}M`, 'green');
          this.ui.showBanner('TARGET DESTROYED', `${cfg.label} · MISS DISTANCE ${dist.toFixed(0)} M`, '#5cff9d');
        }
      } else {
        const why =
          reason === 'MISS_ENERGY' ? 'INTERCEPTOR ENERGY DEPLETED BEFORE CLOSURE' :
          reason === 'MISS_GROUND' ? 'ROUND FLEW INTO TERRAIN' :
          reason === 'NO_TARGET' ? 'TRACK LOST — ROUND SCUTTLED' :
          reason === 'MISS_PASSED' ? `PASSED TARGET — CLOSEST APPROACH ${Number.isFinite(dist) ? dist.toFixed(0) : '—'}M` :
          `FUZED OUTSIDE LETHAL RADIUS — ${Number.isFinite(dist) ? dist.toFixed(0) : '—'}M`;
        this.setResult('MISSED', `${cfg.short} ${interceptor.label}: ${why}`, 'red');
        this.ui.showBanner('MISS', why, '#ff5c47');
      }
      // free the battery assignment when its round is done
      const bat = this.batteries.get(interceptor.batteryId);
      if (bat && bat.assignedTrack && bat.assignedTrack.id === interceptor.trackId && (!target || !target.alive)) {
        bat.clearAssignment();
        if (this.assignedTrackId === interceptor.trackId) this.assignedTrackId = null;
      }
    });

    bus.on('threat:impact', (t) => {
      state.stats.leakers++;
      this.audio.explosion(t.pos, 40, 'ground');
      const d = t.pos.distanceTo(this.camera.position);
      this.player.addShake(THREE.MathUtils.clamp(2.6 - d / 220, 0.2, 1.5));
      this.setResult('IMPACT', `${t.label} IMPACTED THE SITE — NO SUCCESSFUL INTERCEPT`, 'red');
      this.ui.showBanner('IMPACT', 'LEAKER REACHED THE PAD', '#ff5c47', 3.2);
      pushMessage(`IMPACT — ${t.label} STRUCK ${Math.round(Math.hypot(t.pos.x, t.pos.z))}M FROM CENTRE`, 'bad');
    });

    bus.on('threat:decoyDown', (t) => {
      this.audio.explosion(t.pos, 12, 'ground');
      pushMessage(`${t.label} DECOY BURNED IN — NO WARHEAD`, 'info');
    });

    bus.on('threat:phase', (t) => {
      if (t.phase === 'TERMINAL' && t.kind !== 'DECOY') {
        pushMessage(`${t.label} TERMINAL PHASE — ${(t.pos.y / 1000).toFixed(1)}KM`, 'warn');
        this.audio.sonicBoom(t.pos);
      }
    });

    bus.on('footstep', ({ sprinting }) => this.audio.footstep(sprinting));

    bus.on('battery:state', (b) => {
      if (b.state === BATTERY_STATE.EXPENDED) pushMessage(`${b.cfg.codeName} EXPENDED — NO ROUNDS REMAIN`, 'bad');
    });
  }

  bindInput() {
    this.canvas.addEventListener('click', () => {
      this.audio.resume();
      if (state.phase === PHASE.BRIEFING || this.ui.overlay === 'settings') return;
      if (this.docked) {
        this.consoleClick();
      } else if (!this.player.locked && !TEST) {
        this.player.requestLock();
      } else {
        this.designateLooked();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.code;
      if (k === 'Escape') {
        e.preventDefault();
        this.toggleMenu();
        return;
      }
      if (this.ui.overlay) return;
      switch (k) {
        case 'KeyQ':
          this.toggleConsole();
          break;
        case 'KeyE':
          if (this.docked && this.hoverButton) this.pressConsole(this.hoverButton);
          else this.assign();
          break;
        case 'KeyF':
          this.authorize();
          break;
        case 'Tab':
          e.preventDefault();
          this.cycleTrack();
          break;
        case 'KeyR':
          this.startScenario();
          break;
        case 'KeyT':
          this.startScenario();
          break;
        case 'Digit1':
          this.selectBattery('PATRIOT');
          break;
        case 'Digit2':
          this.selectBattery('THAAD');
          break;
        case 'Digit3':
          this.selectBattery('SENTINEL');
          break;
        case 'KeyP':
          this.paused = !this.paused;
          pushMessage(this.paused ? 'SIMULATION PAUSED' : 'SIMULATION RESUMED');
          break;
        case 'F1':
        case 'Backquote':
          e.preventDefault();
          this.ui.togglePerf();
          break;
        default:
          break;
      }
    });
  }

  /* -------------------------------------------------------------- actions */

  action(a, value) {
    this.audio.resume();
    if (a.startsWith('tod:')) {
      this.applyTimeOfDay(a.slice(4));
      this.audio.ui('click');
    } else if (a.startsWith('scenario:')) {
      state.scenarioId = a.slice(9);
      const scn = SCENARIO_BY_ID[state.scenarioId];
      if (scn && this.ui.overlay === 'briefing') this.applyTimeOfDay(scn.tod);
      this.audio.ui('click');
      pushMessage(`SCENARIO SET — ${SCENARIO_BY_ID[state.scenarioId].label}`);
    } else if (a.startsWith('battery:')) {
      this.selectBattery(a.slice(8));
    } else if (a.startsWith('quality:')) {
      this.setQuality(a.slice(8));
    } else if (a.startsWith('toggle:')) {
      const key = a.slice(7);
      if (key === 'perf') this.ui.togglePerf();
      else {
        state[key] = !state[key];
        if (key === 'reducedMotion') this.post.setReducedMotion(state.reducedMotion);
        pushMessage(`${key === 'reducedMotion' ? 'REDUCED MOTION' : 'SUBTITLES'} ${state[key] ? 'ON' : 'OFF'}`);
      }
      this.ui.updateSelections();
    } else if (a === 'volume') {
      this.audio.setVolume(value);
    } else {
      switch (a) {
        case 'deploy':
          this.ui.setOverlay(null);
          setPhase(PHASE.ACTIVE);
          if (!TEST) this.player.requestLock();
          pushMessage('SITE ACTIVE — TAKE THE CONSOLE IN THE C2 SHELTER (Q)', 'good');
          this.ui.showBanner('AEGIS RIDGE', 'WALK THE SITE — TAKE THE CONSOLE WITH Q', '#8ff2dc', 3.4);
          break;
        case 'settings':
          this.ui.setOverlay('settings');
          break;
        case 'closeSettings':
          this.ui.setOverlay(state.phase === PHASE.BRIEFING ? 'briefing' : null);
          break;
        case 'briefing':
          this.resetScenario();
          this.ui.setOverlay('briefing');
          setPhase(PHASE.BRIEFING);
          break;
        case 'restart':
          this.ui.setOverlay(null);
          this.startScenario();
          break;
        case 'walk':
          this.ui.setOverlay(null);
          setPhase(PHASE.ACTIVE);
          if (!TEST) this.player.requestLock();
          break;
        case 'start':
          this.startScenario();
          break;
        case 'assign':
          this.assign();
          break;
        case 'authorize':
          this.authorize();
          break;
        case 'track:next':
          this.cycleTrack();
          break;
        default:
          break;
      }
    }
    this.ui.updateSelections();
  }

  setQuality(id) {
    if (!QUALITY[id] || id === state.quality) return;
    state.quality = id;
    pushMessage(`QUALITY PRESET ${QUALITY[id].label} — RELOADING`);
    const url = new URL(location.href);
    url.searchParams.set('quality', id);
    location.href = url.toString();
  }

  applyTimeOfDay(id) {
    state.todId = id;
    const tod = TOD[id];
    this.weather.setTimeOfDay(id);
    this.base.setTimeOfDay(id);
    this.post.setTimeOfDay(tod);
    this.renderer.toneMappingExposure = tod.exposure;
    updateAtmosphere(tod, tod.sunElev < 0 ? this.weather.moonDir : this.weather.sunDir);
    this.ui.updateSelections();
  }

  selectBattery(id) {
    if (!BATTERY_BY_ID[id]) return;
    state.selectedBatteryId = id;
    this.audio.ui('click');
    pushMessage(`BATTERY SELECTED — ${BATTERY_BY_ID[id].label}`);
    this.ui.updateSelections();
  }

  selectTrack(id, sound = true) {
    const tr = this.radar.find(id);
    if (!tr) return false;
    this.selectedTrackId = id;
    state.selectedTrackId = id;
    if (sound) this.audio.ui('click');
    return true;
  }

  cycleTrack() {
    const firm = this.radar.firmTracks();
    if (!firm.length) {
      this.audio.ui('deny');
      pushMessage('NO FIRM TRACKS TO DESIGNATE', 'warn');
      return;
    }
    const i = firm.findIndex((t) => t.id === this.selectedTrackId);
    const next = firm[(i + 1) % firm.length];
    this.selectTrack(next.id);
    pushMessage(`DESIGNATED ${next.id}`);
  }

  designateLooked() {
    if (this.lookTrack) {
      this.selectTrack(this.lookTrack.id);
      pushMessage(`DESIGNATED ${this.lookTrack.id} (VISUAL)`);
    }
  }

  assign() {
    const bat = this.batteries.get(state.selectedBatteryId);
    let tr = this.radar.find(this.selectedTrackId);
    if (!tr && this.lookTrack) tr = this.lookTrack;
    if (!tr) {
      this.audio.ui('deny');
      pushMessage('ASSIGN FAILED — NO TRACK DESIGNATED', 'warn');
      return;
    }
    if (bat.state === BATTERY_STATE.EXPENDED) {
      this.audio.ui('deny');
      pushMessage(`ASSIGN FAILED — ${bat.cfg.codeName} EXPENDED`, 'bad');
      return;
    }
    const win = this.radar.evaluateWindow(tr, bat.cfg, bat.position);
    bat.assign(tr, win.point);
    this.selectedTrackId = tr.id;
    this.assignedTrackId = tr.id;
    state.assignedTrackId = tr.id;
    this.audio.ui('confirm');
    this.audio.servo(true);
    pushMessage(
      `${bat.cfg.codeName} ASSIGNED ${tr.id} — CUE ${(win.alt / 1000).toFixed(1)}KM / ${(win.range / 1000).toFixed(1)}KM${win.okAlt && win.okRange ? '' : ' (OUTSIDE BASKET)'}`,
      win.okAlt && win.okRange ? 'good' : 'warn'
    );
  }

  authorize() {
    const bat = this.batteries.get(state.selectedBatteryId);
    const res = bat.authorize();
    if (!res.ok) {
      this.audio.ui('deny');
      const why =
        res.why === 'NO_ASSIGNMENT' ? 'NO TARGET ASSIGNED' :
        res.why === 'NO_ROUNDS' ? 'NO ROUNDS REMAIN' : 'BATTERY RELOADING';
      pushMessage(`LAUNCH DENIED — ${why}`, 'bad');
      return;
    }
    this.audio.ui('confirm');
    pushMessage(res.why === 'QUEUED' ? `LAUNCH AUTHORIZED — ${bat.cfg.codeName} STILL PREPARING` : `LAUNCH AUTHORIZED — ${bat.cfg.codeName}`, 'good');
  }

  toggleConsole() {
    if (this.docked) {
      this.docked = false;
      this.player.setDocked(false);
      state.consoleFocus = false;
      this.ui.setConsoleMode(false);
      this.consoleRig.setHover(null);
      this.hoverButton = null;
      pushMessage('CONSOLE RELEASED');
      return;
    }
    const d = this.player.pos.distanceTo(this.base.consoleAnchor);
    if (d > 4.2) {
      this.audio.ui('deny');
      pushMessage('MOVE TO THE C2 CONSOLE FIRST', 'warn');
      return;
    }
    this.docked = true;
    state.consoleFocus = true;
    this.player.setDocked(true, this.consoleRig.dockPose);
    this.ui.setConsoleMode(true);
    this.audio.ui('confirm');
    pushMessage('CONSOLE ONLINE — SELECT TRACK, ASSIGN, AUTHORIZE');
  }

  consoleClick() {
    const pick = this.consoleRig.pick(this.camera, this.radar);
    if (!pick) return;
    if (pick.buttonId) this.pressConsole(pick.buttonId);
    else if (pick.trackId) {
      this.selectTrack(pick.trackId);
      pushMessage(`DESIGNATED ${pick.trackId} (CONSOLE)`);
    }
  }

  pressConsole(id) {
    this.consoleRig.press(id);
    if (id === 'START') this.startScenario();
    else if (id === 'ASSIGN') this.assign();
    else if (id === 'AUTHORIZE') this.authorize();
    else if (id === 'NEXT_TRACK') this.cycleTrack();
    else if (id.startsWith('BAT_')) this.selectBattery(id.slice(4));
    else if (id.startsWith('SCN_')) this.action(`scenario:${id.slice(4)}`);
    else if (id.startsWith('TOD_')) this.applyTimeOfDay(id.slice(4));
  }

  /* ------------------------------------------------------------ scenario */

  resetScenario() {
    this.threats.clear();
    this.interceptors.clear();
    this.batteries.reset();
    this.effects.clear();
    this.radar.reset();
    resetBatteryState();
    state.stats.launched = 0;
    state.stats.intercepted = 0;
    state.stats.leakers = 0;
    state.stats.decoysWasted = 0;
    state.stats.spawned = 0;
    this.selectedTrackId = null;
    this.assignedTrackId = null;
    this.record.length = 0;
    this.lastResult = null;
    this.scenarioActive = false;
    this.scenarioTime = 0;
    this.scenarioEndTimer = 0;
  }

  startScenario() {
    const scn = SCENARIO_BY_ID[state.scenarioId];
    this.resetScenario();
    this.ui.setOverlay(null);
    setPhase(PHASE.ACTIVE);
    this.scenarioRunId = (this.scenarioRunId || 0) + 1;
    // Each run gets a fresh stream so arcs vary while staying seed-reproducible.
    const runRng = new RNG(`${SEED}:${state.scenarioId}:${this.scenarioRunId}`);
    const planned = this.threats.startScenario(state.scenarioId, runRng, 0);
    this.base.setSearchlights(!!scn.searchlights);
    this.scenarioActive = true;
    this.scenarioTime = 0;
    this.plannedCount = planned;
    this.maxDuration = scn.targetDuration[1] + 45;
    pushMessage(`${scn.label} RUNNING — ${planned} OBJECTS PLANNED`, 'warn');
    this.ui.showBanner(scn.label, 'BALLISTIC LAUNCH DETECTED — STAND BY FOR TRACKS', '#ffc846', 3.2);
    this.audio.alarm(2);
    this.firstAlarm = null;
  }

  setResult(kind, text, cls) {
    this.lastResult = { text: kind, cls, detail: text };
    state.lastResult = this.lastResult;
    this.record.push({ text: `${kind}`, cls, detail: text });
    pushMessage(text, cls === 'green' ? 'good' : cls === 'red' ? 'bad' : 'warn');
  }

  endScenario() {
    this.scenarioActive = false;
    setPhase(PHASE.DEBRIEF);
    const s = state.stats;
    const scored = s.intercepted;
    const total = s.spawned;
    const success = s.leakers === 0 && scored > 0;
    this.ui.showDebrief({
      title: success ? 'SITE HELD' : s.leakers > 0 ? 'LEAKERS THROUGH' : 'SCENARIO COMPLETE',
      color: success ? '#5cff9d' : '#ff5c47',
      sub: `${SCENARIO_BY_ID[state.scenarioId].label} · ${TOD[state.todId].label} · ${this.scenarioTime.toFixed(1)}s ELAPSED · SEED ${SEED}`,
      scores: [
        { label: 'OBJECTS TRACKED', value: total },
        { label: 'INTERCEPTED', value: scored },
        { label: 'LEAKERS', value: s.leakers },
        { label: 'ROUNDS FIRED', value: s.launched },
        { label: 'DECOYS ENGAGED', value: s.decoysWasted },
      ],
      record: this.record.map((r) => ({ text: r.text, cls: r.cls, detail: r.detail })),
    });
    if (!TEST) this.player.releaseLock();
  }

  /* ---------------------------------------------------------------- loop */

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    const size = this.renderer.getSize(new THREE.Vector2());
    this.post.setSize(size.x, size.y);
  }

  /** Angular search for the tracked threat closest to the crosshair. */
  findLookTrack() {
    const dir = this.camera.getWorldDirection(this._tmpV);
    let best = null;
    let bestDot = Math.cos(0.13);
    for (const tr of this.radar.tracks) {
      if (!tr.threat.alive) continue;
      const to = this._tmpV2.subVectors(tr.threat.pos, this.camera.position).normalize();
      const d = to.dot(dir);
      if (d > bestDot) {
        bestDot = d;
        best = tr;
      }
    }
    return best;
  }

  buildMarkers() {
    const out = this._markers;
    out.length = 0;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const project = (p) => {
      const v = this._tmpV.copy(p).project(this.camera);
      return {
        x: (v.x * 0.5 + 0.5) * w,
        y: (-v.y * 0.5 + 0.5) * h,
        visible: v.z > -1 && v.z < 1,
      };
    };
    for (const tr of this.radar.tracks) {
      if (!tr.threat.alive) continue;
      const s = project(tr.threat.pos);
      if (!s.visible) continue;
      const inFrame = s.x > -60 && s.x < w + 60 && s.y > -60 && s.y < h + 60;
      if (!inFrame) continue;
      const decoy = tr.classified.includes('DECOY');
      const dist = tr.threat.pos.distanceTo(this.camera.position);
      out.push({
        key: tr.id,
        x: s.x,
        y: s.y,
        cls: `${tr.id === this.assignedTrackId ? 'assigned' : decoy ? 'decoy' : ''} ${tr.firm ? '' : 'tentative'}`.trim(),
        label: `${tr.id}<br>${(tr.alt / 1000).toFixed(1)}km · ${Math.round(tr.speed)}m/s<br>${(dist / 1000).toFixed(1)}km`,
        scale: THREE.MathUtils.clamp(1.6 - dist / 26000, 0.7, 1.6),
        opacity: tr.firm ? 1 : 0.7,
      });
    }
    for (const m of this.interceptors.active) {
      const s = project(m.pos);
      if (!s.visible) continue;
      if (s.x < -40 || s.x > w + 40 || s.y < -40 || s.y > h + 40) continue;
      out.push({
        key: m.label,
        x: s.x,
        y: s.y,
        cls: 'inter',
        label: `${m.label}<br>${m.flight}`,
        scale: 0.7,
        opacity: 0.9,
      });
    }
    return out;
  }

  /**
   * Advance one frame. `render` can be disabled so the test harness can
   * fast-forward the simulation without paying for a draw, which matters a lot
   * on software rasterisers.
   */
  step(dt, render = true) {
    const t0 = performance.now();
    this.elapsed += dt;
    this.frame++;
    state.time = this.elapsed;

    const simDt = this.paused ? 0 : dt;

    // ---- player + camera --------------------------------------------
    this.player.allowKeyboard = !this.ui.overlay && state.phase !== PHASE.BRIEFING;
    this.player.update(dt);
    this.audio.update(dt, this.camera.position);

    // ---- world ------------------------------------------------------
    this.weather.update(simDt, this.camera);
    this.effects.setWind(this.weather.wind);

    let searchTarget = null;
    if (this.threats.active.length) {
      let best = null;
      let bestD = Infinity;
      for (const t of this.threats.active) {
        const d = t.pos.lengthSq();
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      }
      if (best) searchTarget = best.pos;
    }
    this.base.update(simDt, this.radar.angle, searchTarget);

    if (this.scenarioActive) {
      this.scenarioTime += simDt;
      state.scenarioTime = this.scenarioTime;
      this.threats.update(simDt, this.camera);
      this.radar.update(simDt, this.threats.active);
      this.interceptors.update(simDt, this.camera);
      this.batteries.update(simDt);

      const done =
        this.threats.remaining() === 0 &&
        this.threats.active.length === 0 &&
        this.interceptors.active.length === 0;
      if (done) {
        this.scenarioEndTimer += simDt;
        if (this.scenarioEndTimer > 2.6) this.endScenario();
      } else {
        this.scenarioEndTimer = 0;
      }
      if (this.scenarioTime > this.maxDuration) this.endScenario();
    } else {
      this.radar.update(simDt, this.threats.active);
      this.batteries.update(simDt);
    }

    this.effects.update(simDt, this.camera);

    // servo sound while any launcher slews
    const anyMoving = this.batteries.list.some((b) => b.moving);
    this.audio.servo(anyMoving);

    // rocket burn loop
    let burning = null;
    for (const m of this.interceptors.active) {
      if (m.thrustNow > 1) {
        const d = m.pos.distanceTo(this.camera.position);
        if (!burning || d < burning.d) burning = { m, d };
      }
    }
    this.audio.thrust(!!burning, burning ? burning.d : 5000, burning ? 1 : 1);

    // ---- interaction ------------------------------------------------
    this.lookTrack = this.docked ? null : this.findLookTrack();
    if (this.docked) {
      const pick = this.consoleRig.pick(this.camera, this.radar);
      const hover = pick && pick.buttonId ? pick.buttonId : null;
      if (hover !== this.hoverButton) {
        this.hoverButton = hover;
        this.consoleRig.setHover(hover);
      }
      if (pick && pick.trackId) this.consoleTrackHover = pick.trackId;
      else this.consoleTrackHover = null;
    }

    if (!render) {
      state.perf.cpuMs = performance.now() - t0;
      return;
    }

    // ---- console + HUD ----------------------------------------------
    const bat = this.batteries.get(state.selectedBatteryId);
    const selTrack = this.radar.find(this.selectedTrackId);
    const win = selTrack ? this.radar.evaluateWindow(selTrack, bat.cfg, bat.position) : null;
    const consoleOpts = {
      selectedTrackId: this.selectedTrackId,
      assignedTrackId: this.assignedTrackId,
      selectedBatteryId: state.selectedBatteryId,
      accent: bat.cfg.accent,
      interceptors: this.interceptors.active,
      frame: this.frame,
      mode: this.scenarioActive ? 'TRACK WHILE SCAN' : 'AUTO SEARCH',
    };
    this.consoleRig.update(dt, this.radar, this.camera, consoleOpts);
    this.consoleRig.setActive({
      [`BAT_${state.selectedBatteryId}`]: true,
      [`SCN_${state.scenarioId}`]: true,
      [`TOD_${state.todId}`]: true,
    });

    this.ui.updateThreats(this.radar.tracks, this.selectedTrackId, this.assignedTrackId);
    this.ui.updateBatteries();
    this.ui.updateEngagement({
      battery: bat.cfg,
      selected: selTrack,
      assigned: this.radar.find(this.assignedTrackId),
      window: win,
      lastResult: this.lastResult,
    });
    this.ui.updateMission({
      title: this.scenarioActive ? SCENARIO_BY_ID[state.scenarioId].label : state.phase === PHASE.DEBRIEF ? 'DEBRIEF' : 'SITE STANDBY',
      tod: TOD[state.todId].label,
      time: this.scenarioTime,
      active: state.stats.active,
      killed: state.stats.intercepted,
      leaks: state.stats.leakers,
    });
    this.ui.updateMarkers(this.buildMarkers());
    this.ui.tick(dt);

    // contextual prompt
    let prompt = null;
    if (this.docked) {
      if (this.hoverButton) prompt = `<span class="key">E</span> ${this.hoverButton.replace(/_/g, ' ')} &nbsp; <span class="key">CLICK</span> PRESS`;
      else if (this.consoleTrackHover) prompt = `<span class="key">CLICK</span> DESIGNATE ${this.consoleTrackHover}`;
      else prompt = `<span class="key">Q</span> RELEASE CONSOLE &nbsp; <span class="key">E</span> ASSIGN &nbsp; <span class="key">F</span> AUTHORIZE`;
    } else if (this.lookTrack) {
      const tr = this.lookTrack;
      prompt = `${tr.id} · ${tr.firm ? tr.classified : 'ACQUIRING'} · ${(tr.alt / 1000).toFixed(1)}KM<br><span class="key">E</span> ASSIGN ${bat.cfg.short} &nbsp; <span class="key">F</span> AUTHORIZE`;
    } else if (this.player.pos.distanceTo(this.base.consoleAnchor) < 4.2) {
      prompt = `<span class="key">Q</span> TAKE C2 CONSOLE`;
    }
    this.ui.setPrompt(prompt);

    this.ui.setConsoleEnabled({
      assign: !!(selTrack || this.lookTrack),
      authorize: !!bat.assignedTrack,
      'track:next': this.radar.firmTracks().length > 0,
      start: true,
    });

    // ---- render -----------------------------------------------------
    const cpuMs = performance.now() - t0;
    this.renderer.info.reset();
    this.post.render(dt, this.elapsed);

    const info = this.renderer.info;
    state.perf.drawCalls = info.render.calls;
    state.perf.triangles = info.render.triangles;
    state.perf.particles = this.effects.particleCount || 0;
    state.perf.cpuMs = cpuMs;
    state.perf.scale = this.post.scale;

    const frameMs = performance.now() - t0;
    state.perf.frameMs = frameMs;
    this.fpsAccum += dt;
    this.fpsFrames++;
    if (this.fpsAccum > 0.5) {
      state.perf.fps = this.fpsFrames / this.fpsAccum;
      this.fpsAccum = 0;
      this.fpsFrames = 0;
      this.ui.updatePerf(state.perf);
    }
    if (!TEST) this.post.adapt(frameMs);
  }

  toggleMenu() {
    if (this.ui.overlay === 'settings') {
      this.action('closeSettings');
      return;
    }
    if (this.ui.overlay) {
      this.ui.setOverlay(null);
      if (!TEST) this.player.requestLock();
      return;
    }
    this.ui.setOverlay('settings');
    if (!TEST) this.player.releaseLock();
  }

  start() {
    if (TEST) return;
    this.lastFrameTime = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, Math.max(1e-4, (now - this.lastFrameTime) / 1000));
      this.lastFrameTime = now;
      this.step(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame((t) => {
      this.lastFrameTime = t - 16;
      loop(t);
    });
  }
}

const game = new Game();
game.start();

/* ------------------------------------------------------------ test harness */

if (TEST) {
  const api = {
    game,
    state,
    step(dt = FIXED_DT, render = true) {
      game.step(dt, render);
    },
    /** Fast-forward the simulation without drawing. */
    runFor(seconds, dt = FIXED_DT, render = false) {
      const n = Math.max(1, Math.round(seconds / dt));
      for (let i = 0; i < n; i++) game.step(dt, render);
      return n;
    },
    /** Run until the predicate is satisfied or the budget expires. */
    runUntil(predicate, maxSeconds = 30, dt = FIXED_DT) {
      const n = Math.round(maxSeconds / dt);
      for (let i = 0; i < n; i++) {
        game.step(dt, false);
        if (predicate(api.snapshot())) return true;
      }
      return false;
    },
    /** Draw one full frame including HUD; call before screenshots. */
    render(frames = 1, dt = FIXED_DT) {
      for (let i = 0; i < frames; i++) game.step(dt, true);
    },
    /** Measure per-frame cost with rendering enabled. */
    measure(frames = 40, dt = FIXED_DT) {
      const samples = [];
      for (let i = 0; i < frames; i++) {
        const t = performance.now();
        game.step(dt, true);
        samples.push(performance.now() - t);
      }
      samples.sort((a, b) => a - b);
      return {
        frames,
        medianMs: samples[Math.floor(frames / 2)],
        p95Ms: samples[Math.floor(frames * 0.95)],
        minMs: samples[0],
        maxMs: samples[frames - 1],
        drawCalls: state.perf.drawCalls,
        triangles: state.perf.triangles,
        particles: state.perf.particles,
        simMs: state.perf.cpuMs,
      };
    },
    /** CPU-only simulation cost, the meaningful number on a software GPU. */
    measureSim(frames = 120, dt = FIXED_DT) {
      const samples = [];
      for (let i = 0; i < frames; i++) {
        const t = performance.now();
        game.step(dt, false);
        samples.push(performance.now() - t);
      }
      samples.sort((a, b) => a - b);
      return { frames, medianMs: samples[Math.floor(frames / 2)], p95Ms: samples[Math.floor(frames * 0.95)], maxMs: samples[frames - 1] };
    },
    action(a, v) {
      game.action(a, v);
    },
    key(code) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
    },
    dock() {
      game.player.pos.copy(game.base.consoleAnchor);
      game.player.pos.y = 0.44;
      game.player.pos.z += 1.2;
      game.toggleConsole();
      return game.docked;
    },
    undock() {
      if (game.docked) game.toggleConsole();
    },
    teleport(x, y, z, yaw, pitch) {
      game.player.pos.set(x, y !== undefined ? y : game.collision.surfaceHeight(x, z), z);
      if (yaw !== undefined) game.player.yaw = yaw;
      if (pitch !== undefined) game.player.pitch = pitch;
      game.player.vel.set(0, 0, 0);
      // Settle the camera so a following lookAt() uses the new eye position.
      game.player.update(1 / 60);
    },
    lookAt(x, y, z) {
      const eye = game.docked ? game.consoleRig.dockPose.pos : game.camera.position;
      const d = new THREE.Vector3(x, y, z).sub(eye).normalize();
      game.player.yaw = Math.atan2(-d.x, -d.z);
      game.player.pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
      game.player.update(1 / 60);
    },
    /**
     * Pick the battery with the best cued solution for each unengaged firm RV
     * track and commit a round. Returns what it committed.
     */
    autoEngage(maxRounds = 3) {
      const out = [];
      const engaged = new Set(game.batteries.list.map((b) => (b.assignedTrack ? b.assignedTrack.id : null)));
      for (const tr of game.radar.firmTracks()) {
        if (out.length >= maxRounds) break;
        if (tr.classified.includes('DECOY')) continue;
        if (engaged.has(tr.id)) continue;
        let best = null;
        for (const b of game.batteries.list) {
          if (b.state === 'EXPENDED' || b.assignedTrack) continue;
          if (b.ammo <= 0) continue;
          const w = game.radar.evaluateWindow(tr, b.cfg, b.position);
          if (!best || w.quality > best.w.quality) best = { b, w };
        }
        if (!best) continue;
        game.selectBattery(best.b.id);
        game.selectTrack(tr.id);
        game.assign();
        game.authorize();
        engaged.add(tr.id);
        out.push({ track: tr.id, battery: best.b.id, quality: Number(best.w.quality.toFixed(2)), alt: Math.round(best.w.alt), tti: Number(best.w.tti.toFixed(1)) });
      }
      return out;
    },
    lookAtTrack(id) {
      const tr = id ? game.radar.find(id) : game.radar.firmTracks()[0];
      if (!tr) return false;
      api.lookAt(tr.threat.pos.x, tr.threat.pos.y, tr.threat.pos.z);
      return true;
    },
    startScenario(scenarioId, todId, batteryId) {
      if (todId) game.applyTimeOfDay(todId);
      if (scenarioId) state.scenarioId = scenarioId;
      if (batteryId) state.selectedBatteryId = batteryId;
      game.startScenario();
    },
    assignFirstFirm() {
      const firm = game.radar.firmTracks().filter((t) => !t.classified.includes('DECOY'));
      if (!firm.length) return null;
      game.selectTrack(firm[0].id);
      game.assign();
      return firm[0].id;
    },
    authorize() {
      game.authorize();
    },
    hideHud(on = true) {
      document.getElementById('hud').style.display = on ? 'none' : '';
    },
    snapshot() {
      return {
        phase: state.phase,
        scenarioTime: game.scenarioTime,
        tracks: game.radar.tracks.map((t) => ({ id: t.id, firm: t.firm, alt: t.alt, kind: t.threat.kind, cls: t.classified })),
        firm: game.radar.firmTracks().length,
        threats: game.threats.active.length,
        interceptors: game.interceptors.active.map((m) => ({ id: m.label, battery: m.batteryId, flight: m.flight, alt: m.pos.y })),
        stats: { ...state.stats },
        batteries: JSON.parse(JSON.stringify(state.batteries)),
        selectedTrackId: game.selectedTrackId,
        assignedTrackId: game.assignedTrackId,
        docked: game.docked,
        record: game.record.map((r) => ({ text: r.text, detail: r.detail })),
        perf: { ...state.perf },
        player: game.player.pos.toArray(),
        camera: game.camera.position.toArray(),
        particles: state.perf.particles,
        lastResult: game.lastResult ? { ...game.lastResult } : null,
      };
    },
  };
  window.__GAME = api;
  window.__READY = true;
}

export default game;
