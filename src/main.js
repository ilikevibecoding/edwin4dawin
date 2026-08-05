/**
 * AEGIS LINE - entry point and game loop.
 *
 * A fictional first-person air-defence range. This module wires the renderer,
 * the site, the batteries, the threat and interceptor simulations, the weather,
 * the interface and the audio together, and owns the engagement flow:
 *
 *   select condition -> select scenario -> select battery -> START ->
 *   radar acquires -> ASSIGN -> AUTHORIZE -> flight -> result -> restart
 *
 * Nothing in this project models real weapon performance, real procedures or
 * real sensor behaviour. It is built for spectacle.
 */

import * as THREE from 'three';
import { WORLD, PLAYER, BATTERIES, SCENARIOS, CONDITIONS, QUALITY, RESULT, RADAR } from './config.js';
import { state, PHASE } from './state.js';
import { Random } from './util/rng.js';
import { clamp, clamp01, lerp, DEG, RAD, fmtRange, fmtAlt } from './util/mathx.js';
import { Effects } from './effects.js';
import { Weather } from './weather.js';
import { Base } from './base.js';
import { createBatteries, BATTERY_STATE } from './batteries.js';
import { ThreatSystem, planScenario, THREAT_PHASE } from './threats.js';
import { InterceptorSystem, OUTCOME, PHASE as MPHASE } from './interceptors.js';
import { Radar, bearingOf } from './radar.js';
import { Player } from './player.js';
import { PostFX } from './post.js';
import { UI } from './ui.js';
import { audio } from './audio.js';
import { estimateInterceptPoint, computeLaunchAttitude } from './physics.js';
import { ScreenSurface } from './util/textures.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Quality auto-selection
// ---------------------------------------------------------------------------

function pickQuality() {
  const params = new URLSearchParams(location.search);
  const forced = params.get('quality');
  if (forced && QUALITY[forced]) return forced;
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 4;
  // Software rasterisers (headless CI, no GPU) report as SwiftShader.
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
    const rend = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
    if (/swiftshader|software|llvmpipe/i.test(rend || '')) return 'medium';
  } catch (e) { /* ignore */ }
  if (cores <= 4 || mem <= 4) return 'medium';
  return 'high';
}

// ===========================================================================
// Game
// ===========================================================================

class Game {
  constructor() {
    this.qualityId = pickQuality();
    this.quality = QUALITY[this.qualityId];
    state.settings.quality = this.qualityId;

    this.canvas = document.getElementById('scene');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.quality.ssaa,
      powerPreference: 'high-performance',
      stencil: false,
      logarithmicDepthBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = this.quality.shadowsEnabled;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // The composer renders several passes per frame; manual reset lets the perf
    // readout report the whole frame instead of just the last fullscreen quad.
    this.renderer.info.autoReset = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      64, window.innerWidth / window.innerHeight, WORLD.cameraNear, WORLD.cameraFar,
    );
    this.scene.add(this.camera);

    this.clock = new THREE.Clock();
    this.rng = new Random(state.seed);
    this.timeScale = 1;
    this.accumulator = 0;
    this.frameTimes = [];
    this.showPerf = false;
    this.consoleOpen = false;
    this.lookTarget = null;
    this.pendingResults = [];
    this.lastResultText = '';
    this._alarmOn = false;
    this._scopeTexClock = 0;
    this._screenClock = 0;
    this.paused = false;
  }

  // --------------------------------------------------------------- bootstrap

  async boot() {
    this.ui = new UI();
    this.effects = new Effects(this.scene, this.camera, this.qualityId);
    this.weather = new Weather(this.scene, this.renderer, this.camera, this.qualityId);
    this.weather.attachEffects(this.effects);

    this.base = new Base(this.scene, this.qualityId);
    const bats = createBatteries(this.scene, this.effects);
    this.batteries = bats.list;
    this.batteryById = bats.byId;

    this.threats = new ThreatSystem(this.scene, this.effects, this.camera);
    this.interceptors = new InterceptorSystem(this.scene, this.effects, this.camera);
    this.radar = new Radar();

    this.player = new Player(this.camera, this.canvas);
    const colliders = [...this.base.colliders];
    for (const b of this.batteries) colliders.push(...b.colliders);
    this.player.setColliders(colliders);
    this.player.setTerrain((x, z) => this.base.heightAt(x, z));
    this.player.teleport(PLAYER.spawn.x, PLAYER.spawn.z, PLAYER.spawn.yaw);
    this.player.onFootstep = (info) => {
      audio.footstep(info);
      this.effects.footDust(info.position, info.sprinting ? 1.6 : 1);
    };

    this.post = new PostFX(this.renderer, this.scene, this.camera, this.qualityId);
    this.post.applyCondition(CONDITIONS[state.condition]);

    // The shelter's centre display mirrors the live scope canvas; the two side
    // displays get persistent CRT surfaces that are redrawn in place.
    this.base.bindScopeCanvas(this.ui.el.scopeCanvas);
    this.statusSurface = new ScreenSurface(256);
    this.batterySurface = new ScreenSurface(256);
    this.base.setScreenTexture(0, this.statusSurface.texture);
    this.base.setScreenTexture(2, this.batterySurface.texture);

    this._wireUI();
    this._wireKeys();
    window.addEventListener('resize', () => this._onResize());

    this.weather.setCondition(state.condition, true);
    this.base.update(0.016, { nightFactor: 0, floodOn: false, radarSweep: 0 });

    // Warm the shader cache before the first visible frame so the opening
    // moments never hitch while programs compile.
    this.renderer.compile(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);

    state.setPhase(PHASE.MENU);
    this.ui.hideLoader();
    this.ui.showMenu(true);
    this.ready = true;
    this._installTestApi();
    this.loop();
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.maxPixelRatio));
    this.renderer.setSize(w, h);
    this.post.setSize(w, h);
  }

  // ------------------------------------------------------------------- input

  _wireUI() {
    const ui = this.ui;
    ui.on('enter', () => this.enterRange());
    ui.on('setReducedMotion', (v) => {
      state.settings.reducedMotion = v;
      this.player.reducedMotion = v;
    });
    ui.on('setAudio', (v) => { state.settings.audio = v; audio.setEnabled(v); });
    ui.on('setCondition', (id) => this.setCondition(id));
    ui.on('setScenario', (id) => this.setScenario(id));
    ui.on('selectBattery', (id) => this.selectBattery(id));
    ui.on('selectTrack', (id) => { this.radar.select(id); audio.blip('select'); });
    ui.on('cycleTrack', (d) => { this.radar.cycle(d); audio.blip('select'); });
    ui.on('scopePick', (nx, ny) => {
      const t = this.radar.pickAt(nx, ny, RADAR.displayRange);
      if (t) { this.radar.select(t.id); audio.blip('select'); }
    });
    ui.on('start', () => this.startScenario());
    ui.on('restart', () => this.restartScenario());
    ui.on('assign', () => this.assign());
    ui.on('authorize', () => this.authorize());
    ui.on('closeConsole', () => this.closeConsole());
  }

  _wireKeys() {
    window.addEventListener('keydown', (e) => {
      if (state.phase === PHASE.LOADING) return;
      if (state.phase === PHASE.MENU) {
        if (e.code === 'Enter' || e.code === 'Space') this.enterRange();
        return;
      }
      switch (e.code) {
        case 'KeyE':
          if (this.consoleOpen) break;
          if (this.lookTarget) this.assign(this.lookTarget.id);
          else if (this.nearConsole) this.openConsole();
          break;
        case 'KeyF':
          if (!this.consoleOpen) this.authorize();
          break;
        case 'KeyC':
          this.consoleOpen ? this.closeConsole() : this.openConsole();
          break;
        case 'KeyR':
          this.restartScenario();
          break;
        case 'Tab':
          e.preventDefault();
          this.radar.cycle(e.shiftKey ? -1 : 1);
          audio.blip('select');
          break;
        case 'Digit1': this.selectBattery(BATTERIES[0].id); break;
        case 'Digit2': this.selectBattery(BATTERIES[1].id); break;
        case 'Digit3': this.selectBattery(BATTERIES[2].id); break;
        case 'KeyQ': {
          const i = BATTERIES.findIndex((b) => b.id === state.selectedBatteryId);
          this.selectBattery(BATTERIES[(i + 1) % BATTERIES.length].id);
          break;
        }
        case 'Escape':
          if (this.consoleOpen) this.closeConsole();
          else this.player.releaseLock();
          break;
        case 'F3':
        case 'KeyP':
          e.preventDefault();
          this.showPerf = !this.showPerf;
          this.ui.setPerfVisible(this.showPerf);
          break;
        default: break;
      }
    });

    // Clicking the world re-acquires pointer lock.
    this.canvas.addEventListener('mousedown', () => {
      if (state.phase !== PHASE.MENU && !this.consoleOpen) this.player.requestLock();
    });
    this.player.onPointerLockChange = (locked) => {
      if (!locked && !this.consoleOpen && state.phase !== PHASE.MENU) {
        this.ui.setConsoleStatus('POINTER RELEASED - CLICK THE VIEW TO RESUME MOUSE LOOK');
      }
    };
  }

  // ------------------------------------------------------------- game flow

  enterRange() {
    audio.init();
    audio.resume();
    audio.setEnabled(state.settings.audio);
    this.ui.showMenu(false);
    state.setPhase(PHASE.STANDBY);
    this.player.enabled = true;
    this.player.requestLock();
    state.logEvent('SITE ACTIVE. WALK THE PAD OR USE THE CONSOLE IN THE SHELTER.', 'info');
    this.ui.log(state.log[state.log.length - 1]);
  }

  setCondition(id, silent = false) {
    if (!CONDITIONS[id]) return;
    state.set('condition', id);
    this.weather.setCondition(id);
    this.post.applyCondition(CONDITIONS[id]);
    if (!silent) {
      audio.blip('select');
      state.logEvent(`LIGHT CONDITION SET: ${CONDITIONS[id].name}`, 'info');
      this.ui.log(state.log[state.log.length - 1]);
    }
  }

  setScenario(id) {
    const scen = SCENARIOS.find((s) => s.id === id);
    if (!scen) return;
    state.set('scenarioId', id);
    audio.blip('select');
    if (scen.forceCondition) this.setCondition(scen.forceCondition, true);
    state.logEvent(`SCENARIO ARMED: ${scen.name} — ${scen.briefing}`, 'info');
    this.ui.log(state.log[state.log.length - 1]);
    this.ui.setConsoleStatus(`${scen.name} SELECTED · ${scen.blurb.toUpperCase()}`);
  }

  selectBattery(id) {
    if (!this.batteryById[id]) return;
    state.set('selectedBatteryId', id);
    audio.blip('select');
  }

  get selectedBattery() { return this.batteryById[state.selectedBatteryId]; }

  startScenario(seed) {
    this.restartScenario(seed, true);
  }

  restartScenario(seed, fromStart = false) {
    // Full teardown so a restart is always clean and repeatable.
    this.threats.reset();
    this.interceptors.reset();
    this.radar.reset();
    this.effects.clear();
    for (const b of this.batteries) b.reset();
    this.ui.clearLog();
    this.ui.hideResult();
    state.resetRun(seed);
    this.rng = new Random(state.seed);
    this.pendingResults.length = 0;

    const plan = planScenario(state.scenarioId, this.rng.stream('scenario'));
    this.plan = plan;
    this.threats.load(plan.plan);
    state.stats.spawned = plan.count;
    state.stats.decoysSpawned = plan.decoys;
    state.setPhase(PHASE.INBOUND);

    const scen = plan.scenario;
    state.logEvent(`${scen.name}: ${plan.count} BALLISTIC TRACK${plan.count > 1 ? 'S' : ''}`
      + `${plan.decoys ? ` + ${plan.decoys} UNCONFIRMED` : ''} INBOUND`, 'warn');
    this.ui.log(state.log[state.log.length - 1]);
    audio.blip('alert');
    this.ui.showResult('THREAT INBOUND', scen.briefing.toUpperCase(), 'warn', 3.0);
    this.ui.setConsoleStatus(`RUN ${state.runIndex} · SEED ${state.seed} · ${scen.name}`);
  }

  /** Assign the selected battery to a track. */
  assign(trackId) {
    const id = trackId ?? this.radar.selectedId
      ?? (this.lookTarget ? this.lookTarget.id : null);
    if (!id) {
      this._deny('NO TRACK SELECTED');
      return false;
    }
    const track = this.radar.tracks.get(id);
    if (!track || !track.threat.alive) { this._deny('TRACK LOST'); return false; }
    const bat = this.selectedBattery;
    if (!bat) return false;
    if (bat.state === BATTERY_STATE.RELOAD) {
      this._deny(`${bat.def.name} RELOADING`);
      return false;
    }
    if (bat.ammo <= 0) { this._deny(`${bat.def.name} OUT OF ROUNDS`); return false; }

    const env = bat.envelopeCheck(track.threat);
    if (!env.ok) {
      this._deny(`${bat.def.name}: ${env.reason}`);
      return false;
    }

    this.radar.select(id);
    bat.assignedTrackId = id;
    // Aim at the predicted intercept point, not the current position: the
    // erector visibly slews and elevates onto the solution during prep.
    const f = bat.def.flight;
    const sol = estimateInterceptPoint(
      bat.worldPosition, track.threat.pos, track.threat.vel,
      f.designSpeed, { maxTime: f.fuelTime },
    );
    const att = computeLaunchAttitude(bat.worldPosition, sol.point, f);
    bat.prepare(att.bearing, att.pitchDeg);
    audio.blip('assign');
    state.logEvent(`${bat.def.name} ASSIGNED TO ${id} · PREP ${bat.def.prepTime.toFixed(1)}s`, 'info');
    this.ui.log(state.log[state.log.length - 1]);
    return true;
  }

  authorize() {
    const bat = this.selectedBattery;
    if (!bat) return false;
    if (!bat.assignedTrackId) { this._deny('NO ASSIGNMENT'); return false; }
    if (bat.state === BATTERY_STATE.PREP) {
      this._deny(`${bat.def.name} STILL PREPARING`);
      return false;
    }
    if (!bat.canFire) {
      this._deny(`${bat.def.name} ${bat.statusLabel}`);
      return false;
    }
    const track = this.radar.tracks.get(bat.assignedTrackId);
    if (!track || !track.threat.alive) { this._deny('TRACK LOST'); return false; }

    const shot = bat.fire(this.rng.stream(`shot${state.stats.roundsFired}`));
    if (!shot) { this._deny('NO ROUND AVAILABLE'); return false; }

    const m = this.interceptors.launch({
      def: bat.def,
      position: shot.position,
      direction: shot.direction,
      target: track.threat,
      rng: this.rng.stream(`guid${state.stats.roundsFired}`),
      batteryId: bat.def.id,
    });
    state.stats.roundsFired++;
    this.effects.launchBlast(shot.position, shot.direction, bat.def, 0);
    audio.launch(shot.position, { scale: bat.def.plume.size });
    this.post.punch(0.16 * bat.def.plume.size, bat.def.plume.colour);
    state.logEvent(`LAUNCH · ${bat.def.name} TUBE ${shot.tube + 1} → ${track.id}`, 'good');
    this.ui.log(state.log[state.log.length - 1]);
    return true;
  }

  _deny(reason) {
    audio.blip('deny');
    state.logEvent(reason, 'bad');
    this.ui.log(state.log[state.log.length - 1]);
    this.ui.setConsoleStatus(reason);
  }

  openConsole() {
    if (this.consoleOpen) return;
    this.consoleOpen = true;
    state.set('consoleOpen', true);
    this.player.frozen = true;
    this.player.releaseLock();
    this.ui.showConsole(true);
    this.post.setConsoleMode(true);
    audio.blip('confirm');
  }

  closeConsole() {
    if (!this.consoleOpen) return;
    this.consoleOpen = false;
    state.set('consoleOpen', false);
    this.player.frozen = false;
    this.ui.showConsole(false);
    this.post.setConsoleMode(false);
    this.player.requestLock();
  }

  // -------------------------------------------------------------- outcomes

  _resolveKill({ interceptor, threat, point, dist }) {
    const def = interceptor.def;
    const rel = _v1.copy(threat.vel).sub(interceptor.vel);
    const power = def.id === 'sentinel' ? 1.8 : def.id === 'highlance' ? 1.4 : 1.0;
    this.effects.airburst(point, rel, { power, colour: 0xffe0a8 });
    this.effects.breakup(point, threat.vel, {
      count: 16, size: 1.0, smoky: true, spread: 90,
    });
    audio.explosion(point, { scale: power, altitude: point.y });
    const camDist = this.camera.position.distanceTo(point);
    this.post.punch(clamp01(1 - camDist / 9000) * 0.5, 0xfff0d0);
    this.player.shake = Math.max(this.player.shake, clamp01(1 - camDist / 6000) * 1.2);

    const wasDecoy = threat.isDecoy;
    this.threats.destroy(threat);
    if (wasDecoy) {
      state.stats.decoysDestroyed++;
      this._announce(RESULT.DECOY, 'DECOY',
        `${interceptor.def.name} DESTROYED A LIGHT DECOY · ROUND WASTED`, 'warn');
    } else {
      state.stats.intercepted++;
      state.stats.bestIntercept = Math.max(state.stats.bestIntercept, point.y);
      this._announce(RESULT.INTERCEPT, 'INTERCEPTED',
        `${interceptor.def.name} · ${fmtAlt(point.y)} ALT · MISS DISTANCE ${dist.toFixed(0)} M`, 'good');
    }
  }

  _resolveMiss({ interceptor, threat, outcome, minRange }) {
    // Terminate the round with a small self-destruct so misses read clearly.
    this.effects.airburst(interceptor.pos, null, { power: 0.45, colour: 0xffd0a0 });
    audio.explosion(interceptor.pos, { scale: 0.5, altitude: interceptor.pos.y });

    if (outcome === OUTCOME.ABORT) {
      state.logEvent(`${interceptor.def.name} ROUND SELF-DESTRUCT · TARGET ALREADY RESOLVED`, 'info');
      this.ui.log(state.log[state.log.length - 1]);
      return;
    }
    state.stats.misses++;
    let why = 'GUIDANCE ERROR';
    if (outcome === OUTCOME.MISS_FUEL) why = 'ROUND EXHAUSTED BEFORE INTERCEPT';
    else if (outcome === OUTCOME.MISS_GROUND) why = 'ROUND RAN OUT OF ALTITUDE';
    else if (outcome === OUTCOME.MISS_PASS) why = `PASSED TARGET AT ${minRange.toFixed(0)} M`;
    if (threat && threat.alive) {
      const env = this.batteryById[interceptor.batteryId]?.envelopeCheck(threat);
      if (env && !env.ok) why += ` · ${env.reason}`;
    }
    this._announce(RESULT.MISS, 'MISSED', `${interceptor.def.name} · ${why}`, 'bad');
  }

  _resolveImpact(threat) {
    if (threat.isDecoy) {
      // Spent decoys burn out harmlessly.
      this.effects.airburst(_v1.copy(threat.pos).setY(6), null, { power: 0.4, colour: 0xffcf80 });
      audio.explosion(threat.pos, { scale: 0.5 });
      state.logEvent(`${threat.id} BURNED OUT ON THE DECK · NO WARHEAD`, 'info');
      this.ui.log(state.log[state.log.length - 1]);
      this.threats.retire(threat);
      return;
    }
    this.effects.groundImpact(threat.pos, threat.vel, { power: 1.6 });
    audio.explosion(threat.pos, { scale: 1.9 });
    const camDist = this.camera.position.distanceTo(threat.pos);
    this.post.punch(clamp01(1 - camDist / 2600) * 0.7, 0xffcf90);
    this.player.shake = Math.max(this.player.shake, clamp01(1 - camDist / 2200) * 1.8);
    state.stats.impacted++;
    this.threats.retire(threat);
    this._announce(RESULT.IMPACT, 'IMPACT',
      `${threat.id} REACHED THE SITE · ${fmtRange(Math.hypot(threat.pos.x, threat.pos.z))} FROM CENTRE`, 'bad');
  }

  _announce(code, big, sub, kind) {
    state.lastResult = { code, big, sub };
    this.lastResultText = `${big} — ${sub}`;
    this.ui.showResult(big, sub, kind, 3.6);
    state.logEvent(`${big}: ${sub}`, kind);
    this.ui.log(state.log[state.log.length - 1]);
    audio.result(code);
  }

  _finishScenario() {
    const s = state.stats;
    const total = s.spawned;
    const kind = s.impacted > 0 ? 'bad' : (s.intercepted >= total ? 'good' : 'warn');
    const big = s.impacted > 0 ? 'SITE HIT' : (s.intercepted >= total ? 'ALL THREATS DOWN' : 'ENGAGEMENT OVER');
    const sub = `${s.intercepted}/${total} INTERCEPTED · ${s.impacted} IMPACT`
      + ` · ${s.roundsFired} ROUNDS · ${s.decoysDestroyed} DECOY`
      + ` · ${state.clock.toFixed(0)}s   [R] RESTART`;
    this.ui.showResult(big, sub, kind, 8);
    state.logEvent(`${big} · ${sub}`, kind);
    this.ui.log(state.log[state.log.length - 1]);
    this.ui.setConsoleStatus(`SCENARIO COMPLETE · ${sub}`);
  }

  // ---------------------------------------------------------------- targeting

  /** Find the tracked threat closest to the centre of the player's view. */
  _updateLookTarget() {
    if (this.consoleOpen || state.phase === PHASE.MENU) { this.lookTarget = null; return; }
    const dir = this.player.lookDirection(_v1);
    let best = null, bestDot = Math.cos(5.5 * DEG);
    for (const t of this.radar.trackList) {
      if (!t.threat.alive) continue;
      _v2.subVectors(t.threat.pos, this.camera.position).normalize();
      const d = _v2.dot(dir);
      if (d > bestDot) { bestDot = d; best = t; }
    }
    this.lookTarget = best;
  }

  _feasibility() {
    const bat = this.selectedBattery;
    const track = this.radar.selected ?? this.lookTarget;
    if (!bat || !track || !track.threat.alive) return { ok: false, text: '--' };
    const env = bat.envelopeCheck(track.threat);
    if (!env.ok) return { ok: false, text: env.reason };
    const avg = bat.def.flight.maxSpeed * 0.6;
    const sol = estimateInterceptPoint(bat.worldPosition, track.threat.pos, track.threat.vel, avg);
    if (!sol.feasible) return { ok: false, text: 'NO SOLUTION' };
    return {
      ok: true,
      text: `T+${sol.time.toFixed(0)}s @ ${fmtAlt(sol.point.y)}`,
      point: sol.point,
    };
  }

  // -------------------------------------------------------------------- loop

  loop() {
    this._raf = requestAnimationFrame(() => this.loop());
    const raw = this.clock.getDelta();
    const dt = Math.min(raw, 1 / 20) * this.timeScale;
    const t0 = performance.now();
    if (!this.paused) this.step(dt);
    this.render(dt);
    const t1 = performance.now();
    this.frameTimes.push(t1 - t0);
    if (this.frameTimes.length > 90) this.frameTimes.shift();
    if (this.showPerf) this._updatePerf(raw);
  }

  /**
   * One simulation step. Kept separate so tests can drive it deterministically.
   * `skipUI` suppresses DOM and canvas work during batch advances; the caller
   * does a single interface update at the end.
   */
  step(dt, skipUI = false) {
    state.wallClock += dt;
    if (state.phase === PHASE.INBOUND) state.clock += dt;

    // --- world -------------------------------------------------------------
    this.weather.update(dt);
    this.player.update(dt, this.effects.shakeImpulse);

    const nightFactor = clamp01(this.weather.live.stars);
    const alarm = state.phase === PHASE.INBOUND
      && this.radar.trackList.some((t) => t.threat.alive);
    if (alarm !== this._alarmOn) {
      this._alarmOn = alarm;
      audio.setAlarm(alarm && state.settings.audio);
    }
    const indoor = clamp01(1 - this.base.consoleDistance(this.player.position) / 9);
    audio.setListener(this.camera.position);
    audio.setAmbience({ windLevel: 1, indoor });

    this.base.update(dt, {
      nightFactor,
      floodOn: this.weather.floodlightsOn,
      searchlightsOn: nightFactor > 0.4 && state.phase === PHASE.INBOUND,
      radarSweep: this.radar.sweep,
      playerPos: this.player.position,
      alarm,
    });

    // --- simulation --------------------------------------------------------
    if (state.phase === PHASE.INBOUND || this.threats.activeCount || this.interceptors.activeCount) {
      const { spawned, impacted } = this.threats.update(dt, state.clock);
      for (const t of spawned) {
        state.logEvent(`NEW RETURN · BEARING ${Math.round(((bearingOf(t.pos.x, t.pos.z) * RAD) + 360) % 360)
          .toString().padStart(3, '0')} · ${fmtAlt(t.pos.y)}`, 'warn');
        this.ui.log(state.log[state.log.length - 1]);
        audio.radarPing();
      }
      const { kills, misses } = this.interceptors.update(dt, this.camera);
      for (const k of kills) this._resolveKill(k);
      for (const m of misses) this._resolveMiss(m);
      for (const t of impacted) this._resolveImpact(t);
    }

    this.radar.update(dt, this.threats.active, this.interceptors);
    // Announce newly classified tracks once.
    for (const t of this.radar.trackList) {
      if (t.isNew) {
        t.isNew = false;
        audio.radarPing();
      }
      if (t.justClassified) {
        t.justClassified = false;
        state.logEvent(`${t.id} CLASSIFIED ${t.label} · TTI ${t.tti.toFixed(0)}s`, 'warn');
        this.ui.log(state.log[state.log.length - 1]);
      }
    }
    // Auto-select the most urgent track when the player has none.
    if (!this.radar.selectedId) {
      const live = this.radar.trackList.filter((t) => t.threat.alive);
      if (live.length) {
        live.sort((a, b) => a.tti - b.tti);
        this.radar.select(live[0].id);
      }
    }

    for (const b of this.batteries) {
      b.update(dt, b.def.id === state.selectedBatteryId);
      // Drop an assignment whose track is gone so the UI never lies.
      if (b.assignedTrackId) {
        const tr = this.radar.tracks.get(b.assignedTrackId);
        if (!tr || !tr.threat.alive) {
          b.assignedTrackId = null;
          if (b.state === BATTERY_STATE.READY || b.state === BATTERY_STATE.PREP) b.stow();
        } else {
          // Keep following the solution while assigned - the launcher tracks
          // the target instead of freezing on the attitude it started with.
          const f = b.def.flight;
          const sol = estimateInterceptPoint(
            b.worldPosition, tr.threat.pos, tr.threat.vel, f.designSpeed,
            { maxTime: f.fuelTime },
          );
          const att = computeLaunchAttitude(b.worldPosition, sol.point, f);
          b.retarget(att.bearing, att.pitchDeg);
        }
      }
    }

    this._updateLookTarget();
    this.effects.update(dt, window.innerHeight || 800);

    // --- completion --------------------------------------------------------
    if (state.phase === PHASE.INBOUND) {
      const done = state.checkComplete(
        this.threats.activeCount, this.threats.pendingCount, this.interceptors.activeCount,
      );
      if (done) this._finishScenario();
    }

    this.post.update(dt);

    // --- interface ---------------------------------------------------------
    this.nearConsole = this.base.consoleDistance(this.player.position) < 3.2;
    state.set('nearConsole', this.nearConsole);
    if (skipUI) {
      // Keep the refresh clocks running so the interface catches up in one go.
      this._scopeTexClock += dt;
      this._screenClock += dt;
      return;
    }
    this.updateInterface(dt);
  }

  updateInterface(dt) {
    const alarm = state.phase === PHASE.INBOUND
      && this.radar.trackList.some((t) => t.threat.alive);
    this.ui.update(dt, {
      state,
      radar: this.radar,
      batteries: this.batteries,
      threats: this.threats.active,
      interceptors: this.interceptors.active,
      phase: state.phase,
      selectedBattery: this.selectedBattery,
      selectedTrack: this.radar.selected ?? this.lookTarget,
      lookTarget: this.lookTarget,
      nearConsole: this.nearConsole,
      consoleOpen: this.consoleOpen,
      alarm,
      inFlight: this.interceptors.activeCount,
      threatCount: this.threats.activeCount,
      condition: state.condition,
      scenario: state.scenarioId,
      feasibility: this._feasibility(),
    });

    // In-world screens refresh at a lower rate than the frame loop.
    this._scopeTexClock += dt;
    if (this._scopeTexClock > 0.1) {
      this._scopeTexClock = 0;
      if (!this.consoleOpen) {
        this.ui.scope.draw(this.radar, null, {
          batteries: this.batteries,
          interceptors: this.interceptors.active,
          condition: state.condition,
          selectedBatteryId: state.selectedBatteryId,
        });
      }
      this.base.refreshScopeTexture();
    }
    this._screenClock += dt;
    if (this._screenClock > 0.5) {
      this._screenClock = 0;
      this._updateShelterScreens();
    }
  }

  _updateShelterScreens() {
    const s = state.stats;
    this.statusSurface.draw([
      `COND  ${CONDITIONS[state.condition].name}`,
      `SCEN  ${SCENARIOS.find((x) => x.id === state.scenarioId).name}`,
      `STATE ${state.phase.toUpperCase()}`,
      `T+    ${state.clock.toFixed(1)}`,
      `TRK   ${this.radar.activeTrackCount}`,
      `FLT   ${this.interceptors.activeCount}`,
      '',
      'FICTIONAL RANGE',
    ], { title: 'SITE STATUS' });
    this.batterySurface.draw([
      ...this.batteries.map((b) =>
        `${b.def.name.slice(0, 9).padEnd(9)} ${b.statusLabel.padEnd(6)} ${b.ammo}/${b.maxAmmo}`),
      '',
      `FIRED ${s.roundsFired}`,
      `KILL  ${s.intercepted}`,
      `MISS  ${s.misses}`,
      `HIT   ${s.impacted}`,
    ], { title: 'BATTERY STATUS' });
  }

  render(dt) {
    this.renderer.info.reset();
    this.post.render(dt);
  }

  _updatePerf(raw) {
    const info = this.renderer.info;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / Math.max(1, this.frameTimes.length);
    const fps = 1 / Math.max(raw, 0.0001);
    const e = this.effects.stats;
    this.ui.setPerfText(
      `${fps.toFixed(0)} FPS  cpu ${avg.toFixed(1)}ms  q:${this.qualityId}\n`
      + `draws ${info.render.calls}  tris ${(info.render.triangles / 1000).toFixed(0)}k  prog ${info.programs?.length ?? 0}\n`
      + `smoke ${e.smoke} dust ${e.dust} hot ${e.hot} spark ${e.sparks} deb ${e.debris} trails ${e.trails}\n`
      + `threats ${this.threats.activeCount} flight ${this.interceptors.activeCount}`,
    );
  }

  // ----------------------------------------------------------------- test API

  _installTestApi() {
    const g = this;
    window.__GAME = {
      get ready() { return !!g.ready; },
      /**
       * Deterministically advance the sim without waiting on rAF.
       * Rendering is opt-in: on a software rasteriser a frame costs far more
       * than the whole simulation step, so tests only draw before a capture.
       */
      advance(seconds, stepMs = 1000 / 60, render = false) {
        const dt = stepMs / 1000;
        const n = Math.max(1, Math.round(seconds / dt));
        // Interface work is skipped until the final step so a long advance is
        // dominated by simulation cost rather than DOM churn.
        for (let i = 0; i < n - 1; i++) g.step(dt, true);
        g.step(dt, false);
        if (render) g.render(dt);
        return g.snapshot();
      },
      renderOnce() { g.render(1 / 60); },
      setPaused(p) { g.paused = !!p; },
      setTimeScale(s) { g.timeScale = s; },
      enter() { g.enterRange(); },
      setCondition(id) { g.setCondition(id); },
      setScenario(id) { g.setScenario(id); },
      selectBattery(id) { g.selectBattery(id); },
      start(seed) { g.startScenario(seed); },
      restart(seed) { g.restartScenario(seed); },
      assign(trackId) { return g.assign(trackId); },
      authorize() { return g.authorize(); },
      selectTrack(id) { g.radar.select(id); },
      cycleTrack(d = 1) { g.radar.cycle(d); },
      openConsole() { g.openConsole(); },
      closeConsole() { g.closeConsole(); },
      setReducedMotion(v) {
        state.settings.reducedMotion = v; g.player.reducedMotion = v;
        g.ui.el.optReduced.checked = v;
      },
      setAudio(v) { state.settings.audio = v; audio.setEnabled(v); },
      teleport(x, z, yaw, pitch) {
        g.player.teleport(x, z, yaw);
        if (pitch !== undefined) g.player.pitch = pitch;
        g.player.update(1 / 60, 0);
      },
      lookAt(x, y, z) {
        const d = _v1.set(x, y, z).sub(g.camera.position).normalize();
        g.player.yaw = Math.atan2(-d.x, -d.z);
        g.player.pitch = Math.asin(clamp(d.y, -1, 1));
        g.player.update(1 / 60, 0);
      },
      /** Look at the currently selected track, if any. */
      lookAtTrack() {
        const t = g.radar.selected;
        if (!t) return false;
        window.__GAME.lookAt(t.threat.pos.x, t.threat.pos.y, t.threat.pos.z);
        return true;
      },
      /** Assign + authorize the best available shot. Returns a description. */
      autoEngage(batteryId) {
        if (batteryId) g.selectBattery(batteryId);
        const bat = g.selectedBattery;
        const live = g.radar.trackList.filter((t) => t.threat.alive);
        if (!live.length || !bat) return null;
        // Prefer a classified ballistic track that is inside the envelope.
        const scored = live.map((t) => ({
          t, env: bat.envelopeCheck(t.threat), real: t.symbolKind === 'threat',
        })).filter((x) => x.env.ok);
        if (!scored.length) return null;
        scored.sort((a, b) => (b.real - a.real) || (a.t.tti - b.t.tti));
        const pick = scored[0].t;
        g.radar.select(pick.id);
        const ok = g.assign(pick.id);
        return ok ? { track: pick.id, battery: bat.def.id } : null;
      },
      /**
       * Run one complete engagement head-to-tail inside the page with no
       * rendering: start the scenario, wait for a track, engage as soon as the
       * battery will accept it, authorize when ready, and fly to a result.
       * Used to measure hit rates without paying for hundreds of frames.
       */
      runTrial({
        battery = 'highlance', scenario = 'single', seed = 1,
        engageAfter = 6, maxTime = 140,
      } = {}) {
        g.setScenario(scenario);
        g.selectBattery(battery);
        g.restartScenario(seed);
        const dt = 1 / 60;
        let t = 0;
        let assigned = false;
        let fired = false;
        let nextTry = engageAfter;
        let killAlt = 0;
        const before = { i: 0, m: 0, h: 0 };
        while (t < maxTime) {
          g.step(dt, true);
          t += dt;
          if (!assigned && t >= nextTry) {
            assigned = !!window.__GAME.autoEngage(battery);
            if (!assigned) nextTry = t + 0.5;
          }
          if (assigned && !fired) fired = g.authorize();
          const s = state.stats;
          if (fired && (s.intercepted + s.misses + s.impacted
              + s.decoysDestroyed > before.i + before.m + before.h)) {
            killAlt = s.bestIntercept;
            break;
          }
          // Nothing left to wait for.
          if (fired && g.interceptors.activeCount === 0 && g.threats.activeCount === 0) break;
        }
        const s = { ...state.stats };
        return {
          battery, scenario, seed, assigned, fired, t: +t.toFixed(1),
          killAlt: Math.round(killAlt),
          outcome: s.intercepted ? 'KILL' : s.decoysDestroyed ? 'DECOY'
            : s.impacted ? 'IMPACT' : s.misses ? 'MISS' : 'NONE',
          stats: s,
        };
      },

      /** Repeat `runTrial` over a seed range and summarise. */
      runTrials(n = 10, opts = {}) {
        const rows = [];
        for (let i = 0; i < n; i++) {
          rows.push(window.__GAME.runTrial({ ...opts, seed: (opts.seed ?? 1000) + i * 37 }));
        }
        const kills = rows.filter((r) => r.outcome === 'KILL');
        return {
          n, kills: kills.length,
          hitRate: +(kills.length / n).toFixed(3),
          medKillAlt: kills.length
            ? kills.map((r) => r.killAlt).sort((a, b) => a - b)[Math.floor(kills.length / 2)] : 0,
          outcomes: rows.map((r) => r.outcome),
          fired: rows.filter((r) => r.fired).length,
        };
      },

      snapshot() { return g.snapshot(); },
      perf() {
        const info = g.renderer.info;
        const avg = g.frameTimes.reduce((a, b) => a + b, 0) / Math.max(1, g.frameTimes.length);
        return {
          quality: g.qualityId,
          cpuMs: +avg.toFixed(2),
          calls: info.render.calls,
          triangles: info.render.triangles,
          programs: info.programs?.length ?? 0,
          geometries: info.memory.geometries,
          textures: info.memory.textures,
          particles: g.effects.stats,
        };
      },
      colliderCount() { return g.player.colliders.length; },
      playerPos() {
        const p = g.player.position;
        return { x: +p.x.toFixed(2), y: +g.player.groundY.toFixed(2), z: +p.z.toFixed(2) };
      },
      pressKey(code, down = true) { g.player.keys[code] = down; },
    };
  }

  snapshot() {
    return {
      ready: !!this.ready,
      phase: state.phase,
      clock: +state.clock.toFixed(2),
      seed: state.seed,
      condition: state.condition,
      scenario: state.scenarioId,
      selectedBattery: state.selectedBatteryId,
      selectedTrack: this.radar.selectedId,
      consoleOpen: this.consoleOpen,
      nearConsole: !!this.nearConsole,
      lookTarget: this.lookTarget?.id ?? null,
      stats: { ...state.stats },
      lastResult: this.lastResultText,
      threats: this.threats.active.map((t) => ({
        id: t.id, decoy: t.isDecoy, phase: t.phase,
        alt: Math.round(t.pos.y), range: Math.round(Math.hypot(t.pos.x, t.pos.z)),
        speed: Math.round(t.speed), tti: +t.timeToImpact.toFixed(1),
      })),
      tracks: this.radar.trackList.map((t) => ({
        id: t.id, label: t.label, classified: t.classified,
        engaged: t.engagedCount, alt: Math.round(t.altitude),
      })),
      interceptors: this.interceptors.active.map((m) => ({
        battery: m.batteryId, phase: m.phase, target: m.targetId,
        alt: Math.round(m.pos.y), speed: Math.round(m.speed),
        minRange: Number.isFinite(m.minRange) ? Math.round(m.minRange) : null,
        // Flight diagnostics: these make a bad engagement legible in a log.
        range: m.target ? Math.round(m.pos.distanceTo(m.target.pos)) : null,
        aimAlt: Math.round(m.aimPoint.y),
        solTime: +(m.solutionTime ?? 0).toFixed(1),
        fuel: +(m.fuelLeft ?? 0).toFixed(1),
        cut: !!m.sustainCut,
        age: +m.age.toFixed(1),
      })),
      batteries: this.batteries.map((b) => ({
        id: b.def.id, state: b.state, status: b.statusLabel,
        ammo: b.ammo, assigned: b.assignedTrackId,
        elevation: +b.elevation.toFixed(1), train: +b.train.toFixed(2),
      })),
      player: {
        x: +this.player.position.x.toFixed(2),
        z: +this.player.position.z.toFixed(2),
        y: +this.player.groundY.toFixed(2),
        yaw: +this.player.yaw.toFixed(3),
      },
    };
  }
}

// ---------------------------------------------------------------------------

const game = new Game();
window.__AEGIS = game;
game.boot().catch((err) => {
  console.error('[AEGIS LINE] boot failed', err);
  const loader = document.querySelector('#loader .loader-text');
  if (loader) loader.textContent = 'BOOT FAILED: ' + err.message;
});
