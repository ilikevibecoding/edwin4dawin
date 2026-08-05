import * as THREE from 'three';
import { settings, updateSettings, onSettingsChange } from './settings.js';
import { Weather, SKY_PRESETS } from './weather.js';
import { PostPipeline } from './post.js';
import { Effects } from './effects.js';
import { MilitaryBase } from './base.js';
import { BatteryPark } from './batteries.js';
import { ThreatManager, SCENARIOS, SCENARIO_LIST } from './threats.js';
import { InterceptorManager } from './interceptors.js';
import { RadarSystem, HoloRadar, TRACK_STATE, CLASSIFICATION } from './radar.js';
import { Player, MODE } from './player.js';
import { CollisionWorld } from './physics.js';
import { UI } from './ui.js';
import { audio } from './audio.js';
import { clamp, saturate, lerp, formatRange } from './util/mathx.js';

/**
 * AEGIS LINE - game shell.
 *
 * Owns the renderer, the fixed-step simulation, the engagement state machine
 * and the glue between every subsystem. Also exposes `window.__GAME`, the
 * deterministic control surface the Playwright suite drives.
 */

const PHASE = {
  IDLE: 'STANDBY',
  RUNNING: 'RUNNING',
  DEBRIEF: 'DEBRIEF'
};

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _ray = new THREE.Raycaster();
const _pointer = new THREE.Vector2();

class Game {
  constructor() {
    this.canvas = document.getElementById('viewport');
    this.uiRoot = document.getElementById('ui-root');

    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.scenarioElapsed = 0;
    this.frameTimes = [];
    this.fps = 60;
    this.frameMs = 16.7;

    this.phase = PHASE.IDLE;
    this.skyId = 'day';
    this.scenarioId = 'single';
    this.assignedTrack = null;
    this.started = false;
    this.stats = { intercepted: 0, leakers: 0, rounds: 0, decoysHit: 0, misses: 0 };
    this.resultLines = [];
    this.pendingIntro = true;

    this._initRenderer();
    this._initUI();
    this._initScene();
    this._initInput();
    this._initHooks();

    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  }

  /* ================================================================ *
   * Boot
   * ================================================================ */

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      stencil: false,
      depth: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.quality.pixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = settings.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.info.autoReset = false;

    // A wide depth range with a modest near plane: the whole engagement volume
    // fits without needing a logarithmic buffer (which the custom particle
    // shaders would otherwise all have to opt into).
    this.camera = new THREE.PerspectiveCamera(settings.fov, 16 / 9, 0.4, 120000);
    this.camera.position.set(0, 1.7, 40);
  }

  _initScene() {
    const marks = (window.__BOOT_MARKS = []);
    const t0 = performance.now();
    const step = (label, fraction, fn) => {
      this.ui.setLoadProgress(fraction, label);
      const s = performance.now();
      fn();
      marks.push({ label, ms: +(performance.now() - s).toFixed(1) });
    };

    this.scene = new THREE.Scene();
    this.scene.name = 'site';
    this.collision = new CollisionWorld();

    step('ATMOSPHERE', 0.1, () => {
      this.weather = new Weather(this.scene, this.renderer);
    });
    step('PARTICLE SYSTEMS', 0.22, () => {
      this.effects = new Effects(this.scene, this.camera);
    });
    step('SITE GEOMETRY', 0.45, () => {
      this.base = new MilitaryBase(this.scene, this.collision).build();
    });
    step('LAUNCHER BATTERIES', 0.68, () => {
      this.batteries = new BatteryPark(this.scene, this.collision, this.base.anchors);
      this.collision.build();
    });
    step('SENSORS AND ROUNDS', 0.82, () => {
      this.threats = new ThreatManager(this.scene, this.effects);
      this.interceptors = new InterceptorManager(this.scene, this.effects);
      this.radar = new RadarSystem(this.base);
      this.holo = new HoloRadar(this.scene, this.base.holoAnchor);
    });
    step('CONTROLS', 0.9, () => {
      this.player = new Player(this.camera, this.canvas, this.collision);
      this.player.setSpawn(this.base.playerSpawn, this.base.playerSpawnYaw);
      this.player.setConsole(this.base.consoleSeat, this.base.consoleFocus);
    });
    step('POST PROCESSING', 0.97, () => {
      this.post = new PostPipeline(this.renderer, this.scene, this.camera);
    });

    this._wireEvents();
    this.setSky('day', true);
    marks.push({ label: 'TOTAL', ms: +(performance.now() - t0).toFixed(1) });
  }

  _initUI() {
    this.ui = new UI(this.uiRoot, {
      onStart: () => this.startSession(),
      onSky: (id) => this.setSky(id),
      onScenario: (id) => this.setScenario(id),
      onBattery: (i) => this.selectBattery(i),
      onBegin: () => this.beginEngagement(),
      onAssign: () => this.assign(),
      onAuthorize: () => this.authorize(),
      onRestart: () => this.restart(),
      onSelectTrack: (id) => this.selectTrackById(id),
      onVolume: (v) => audio.setVolume(v),
      onFov: (f) => {
        this.camera.fov = f;
        this.camera.updateProjectionMatrix();
      },
      onQuality: () => this.applyQuality()
    });
    if (settings.skipIntro) this.ui.hideTitle();
  }

  _wireEvents() {
    this.player.on('footstep', ({ sprinting }) => audio.footstep(sprinting));

    this.radar.on('detect', (track) => {
      audio.ui('detect');
      this.ui.log(`RADAR CONTACT ${track.id} &mdash; BRG ${Math.round(this._bearingOf(track))}°`, 'warn');
    });
    this.radar.on('classify', (track) => {
      if (track.classification === CLASSIFICATION.DECOY) {
        this.ui.log(`${track.id} CLASSIFIED PROBABLE DECOY`, '');
      } else {
        this.ui.log(`${track.id} CLASSIFIED ${track.classification}`, 'warn');
      }
    });

    this.threats.on('impact', ({ threat, cause }) => {
      const track = this.radar.trackFor(threat);
      const dist = this.camera.position.distanceTo(threat.pos);
      if (cause === 'impact') {
        this.stats.leakers++;
        audio.explosion(dist, 1.5);
        this.effects.addShake(clamp(2.6 - dist / 220, 0, 1.1));
        this.post.addFlash(clamp(0.5 - dist / 900, 0, 0.4));
        this.ui.showResult('IMPACT', `${threat.id} REACHED THE SITE`, '#ff5f4a', 3);
        this.ui.log(`${threat.id} IMPACT ON SITE`, 'bad');
        this.resultLines.push(`${threat.id} &mdash; <span style="color:#ff5f4a">IMPACT</span> at ${formatRange(Math.hypot(threat.pos.x, threat.pos.z))} from centre.`);
      } else if (cause === 'decoy-ground') {
        audio.explosion(dist, 0.5);
        this.ui.log(`${threat.id} (decoy) burned out`, '');
      }
      if (track) track.resolved = cause;
    });

    this.interceptors.on('launch', ({ shot, battery }) => {
      const dist = this.camera.position.distanceTo(shot.pos);
      audio.launch(dist, battery.spec.interceptor.plumeScale);
      this.post.addFlash(clamp(0.55 - dist / 220, 0, 0.5));
      this.stats.rounds++;
      this.ui.log(`${battery.spec.name} ROUND ${shot.id} AWAY`, 'warn');
    });

    this.interceptors.on('result', ({ shot, target, outcome, missDistance, note, position }) => {
      const dist = this.camera.position.distanceTo(position);
      audio.explosion(dist, outcome === 'hit' ? 1.2 : 0.7);
      const track = target ? this.radar.trackFor(target) : null;
      if (outcome === 'hit') {
        this.stats.intercepted++;
        this.threats.kill(target, 'intercept', shot);
        audio.ui('success');
        this.ui.showResult('INTERCEPTED', `${target.id} DESTROYED BY ${shot.id}`, '#6bffb0', 2.8);
        this.ui.log(`INTERCEPT &mdash; ${shot.id} destroyed ${target.id}`, 'good');
        this.resultLines.push(`${target.id} &mdash; <span style="color:#6bffb0">INTERCEPTED</span> by ${shot.id} at ${(position.y / 1000).toFixed(1)} km.`);
      } else if (outcome === 'decoy') {
        this.stats.decoysHit++;
        this.threats.kill(target, 'intercept', shot);
        audio.ui('deny');
        this.ui.showResult('DECOY', `${shot.id} EXPENDED ON A DECOY`, '#6fc7ff', 2.8);
        this.ui.log(`${shot.id} destroyed ${target.id} &mdash; decoy, round wasted`, 'warn');
        this.resultLines.push(`${target.id} &mdash; <span style="color:#6fc7ff">DECOY</span> engaged by ${shot.id}.`);
      } else {
        this.stats.misses++;
        audio.ui('fail');
        const reason = note || `MISS DISTANCE ${Math.round(missDistance)} m`;
        this.ui.showResult('MISS', reason, '#ffc247', 2.4);
        this.ui.log(`${shot.id} failed to intercept &mdash; ${reason.toLowerCase()}`, 'bad');
        if (target) {
          this.resultLines.push(`${shot.id} &mdash; <span style="color:#ffc247">MISS</span> on ${target.id} (${Math.round(missDistance)} m).`);
        }
      }
      if (track) {
        track.engaged = false;
        const i = track.assignedShots.indexOf(shot);
        if (i >= 0) track.assignedShots.splice(i, 1);
      }
      if (this.assignedTrack && !this.assignedTrack.alive) this.assignedTrack = null;
    });
  }

  _initInput() {
    this._onKey = (e) => this.handleKey(e);
    window.addEventListener('keydown', this._onKey);

    this.canvas.addEventListener('mousedown', (e) => {
      audio.init();
      audio.resume();
      if (this.ui.titleVisible) return;
      if (this.player.mode === MODE.CONSOLE) {
        this.handleConsoleClick(e);
      } else if (!this.ui.settingsOpen && !this.ui.debriefOpen) {
        this.player.requestLock();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.player.mode === MODE.CONSOLE) this.ui.setCursor(e.clientX, e.clientY);
    });
  }

  handleKey(e) {
    if (this.ui.titleVisible) {
      if (e.code === 'Enter' || e.code === 'Space') {
        this.ui.hideTitle();
        this.startSession();
      }
      return;
    }
    audio.init();
    audio.resume();

    switch (e.code) {
      case 'KeyC':
        this.toggleConsole();
        break;
      case 'Digit1':
        this.selectBattery(0);
        break;
      case 'Digit2':
        this.selectBattery(1);
        break;
      case 'Digit3':
        this.selectBattery(2);
        break;
      case 'KeyE':
        if (this.player.mode === MODE.FREE && this.player.distanceToConsole() < 2.6 && !this.radar.selected) {
          this.toggleConsole();
        } else {
          this.assign();
        }
        break;
      case 'KeyF':
        this.authorize();
        break;
      case 'Tab':
        e.preventDefault();
        this.cycleTrack(e.shiftKey ? -1 : 1);
        break;
      case 'KeyR':
        this.restart();
        break;
      case 'KeyO':
        this.ui.toggleSettings();
        break;
      case 'Enter':
        if (this.phase !== PHASE.RUNNING) this.beginEngagement();
        break;
      case 'Escape':
        if (this.ui.settingsOpen) this.ui.toggleSettings(false);
        else if (this.ui.debriefOpen) this.ui.hideDebrief();
        break;
      default:
        break;
    }
  }

  handleConsoleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    _pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    _ray.setFromCamera(_pointer, this.camera);
    const track = this.holo.pick(_ray, this.radar);
    if (track) {
      this.radar.select(track);
      audio.ui('select');
      this.ui.log(`TRACK ${track.id} SELECTED`, '');
    }
  }

  _initHooks() {
    const g = {
      get ready() {
        return true;
      },
      state: () => this.snapshotForTests(),
      setSky: (id) => this.setSky(id),
      setScenario: (id) => this.setScenario(id),
      selectBattery: (i) => this.selectBattery(i),
      begin: () => this.beginEngagement(),
      assign: () => this.assign(),
      authorize: () => this.authorize(),
      restart: () => this.restart(),
      enterConsole: () => this.enterConsole(),
      exitConsole: () => this.exitConsole(),
      startSession: () => this.startSession(),
      teleport: (x, z, yaw = Math.PI, pitch = 0) => {
        this.player.exitConsole(0.001);
        this.player.setSpawn(new THREE.Vector3(x, 0, z), yaw);
        this.player.pitch = pitch;
      },
      lookAt: (x, y, z) => {
        _v.set(x, y, z).sub(this.camera.position).normalize();
        this.player.yaw = Math.atan2(-_v.x, -_v.z);
        this.player.pitch = Math.asin(clamp(_v.y, -1, 1));
      },
      selectTrackIndex: (i) => {
        const firm = this.radar.firmTracks();
        if (firm[i]) this.radar.select(firm[i]);
        return !!firm[i];
      },
      /** Advance the simulation deterministically without waiting on rAF. */
      fastForward: (seconds, step = 1 / 60) => {
        let t = 0;
        while (t < seconds) {
          const dt = Math.min(step, seconds - t);
          this.simulate(dt);
          t += dt;
        }
        return this.snapshotForTests();
      },
      /** Assign + authorize the best available engagement right now. */
      autoEngage: () => this.autoEngage(),
      setQuality: (q) => {
        updateSettings({ qualityName: q });
        this.applyQuality();
      },
      setReducedMotion: (on) => updateSettings({ reducedMotion: !!on }),
      stats: () => ({ ...this.stats }),
      counts: () => ({
        threats: this.threats.active.length,
        tracks: this.radar.tracks.length,
        firm: this.radar.firmTracks().length,
        interceptors: this.interceptors.active.length,
        drawCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        particles: this.effects.stats
      })
    };
    window.__GAME = g;
  }

  /* ================================================================ *
   * Session control
   * ================================================================ */

  startSession() {
    if (this.started) return;
    this.started = true;
    audio.init();
    audio.resume();
    this.player.requestLock();
    this.ui.log('SITE 07 ONLINE &mdash; ALL BATTERIES REPORT READY', 'good');
    this.ui.log('WALK THE PAD OR PRESS <b>C</b> FOR THE COMMAND CONSOLE', '');
  }

  setSky(id, instant = false) {
    if (!SKY_PRESETS[id]) return;
    this.skyId = id;
    const preset = this.weather.applyPreset(id, instant);
    const night = id !== 'day';
    this.base.setNight(night, id === 'night' ? 1 : 0.65);
    this.ui.log(`CONDITIONS SET TO ${preset.label}`, '');
    audio.ui('click');
  }

  setScenario(id) {
    if (!SCENARIOS[id]) return;
    this.scenarioId = id;
    audio.ui('click');
    this.ui.log(`SCENARIO ARMED: ${SCENARIOS[id].name}`, '');
    if (SCENARIOS[id].preferredSky && this.skyId !== SCENARIOS[id].preferredSky) {
      this.setSky(SCENARIOS[id].preferredSky);
    }
  }

  selectBattery(index) {
    const b = this.batteries.select(index);
    audio.ui('select');
    this.ui.log(`BATTERY ${b.spec.name} SELECTED`, '');
    return b;
  }

  selectTrackById(id) {
    const track = this.radar.tracks.find((t) => t.id === id);
    if (track) {
      this.radar.select(track);
      audio.ui('select');
    }
  }

  cycleTrack(dir) {
    const t = this.radar.cycleSelection(dir);
    if (t) audio.ui('select');
  }

  toggleConsole() {
    if (this.player.mode === MODE.CONSOLE) this.exitConsole();
    else this.enterConsole();
  }

  enterConsole() {
    this.player.enterConsole();
    this.ui.showConsole(true);
    this.post.setConsoleTint(true);
    audio.ui('confirm');
  }

  exitConsole() {
    this.player.exitConsole();
    this.ui.showConsole(false);
    this.post.setConsoleTint(false);
    audio.ui('click');
  }

  beginEngagement() {
    if (this.phase === PHASE.RUNNING) return;
    this.resetEngagement(false);
    this.phase = PHASE.RUNNING;
    this.scenarioElapsed = 0;
    this.runSeed = (this.runSeed || 0) + 1;
    const scn = this.threats.start(this.scenarioId, this.runSeed);
    this.ui.hideDebrief();
    this.ui.setAlert('BALLISTIC LAUNCH DETECTED');
    this.ui.showResult('LAUNCH DETECTED', scn.name, '#ff5f4a', 2.6);
    this.ui.log(`&gt;&gt; ${scn.name} &mdash; ${this.threats.totalPlanned} OBJECTS INBOUND`, 'bad');
    audio.startAlarm();
    audio.ui('confirm');
  }

  resetEngagement(clearVisuals = true) {
    this.threats.reset();
    this.interceptors.reset();
    this.radar.reset();
    this.batteries.reset();
    this.assignedTrack = null;
    this.stats = { intercepted: 0, leakers: 0, rounds: 0, decoysHit: 0, misses: 0 };
    this.resultLines = [];
    if (clearVisuals) this.effects.reset();
    this.ui.setAlert(null);
    audio.stopAlarm();
  }

  restart() {
    this.resetEngagement(true);
    this.phase = PHASE.IDLE;
    this.ui.hideDebrief();
    this.ui.log('SCENARIO RESET', '');
    this.beginEngagement();
  }

  finishEngagement() {
    if (this.phase !== PHASE.RUNNING) return;
    this.phase = PHASE.DEBRIEF;
    this.ui.setAlert(null);
    audio.stopAlarm();
    const lines = this.resultLines.slice(-8);
    if (this.stats.misses > 0) {
      lines.push(`${this.stats.misses} round(s) failed to achieve a lethal miss distance.`);
    }
    if (this.stats.decoysHit > 0) {
      lines.push(`${this.stats.decoysHit} round(s) expended on decoys.`);
    }
    lines.push(
      this.stats.leakers === 0
        ? '<span style="color:#6bffb0">Site defended. No leakers.</span>'
        : `<span style="color:#ff5f4a">${this.stats.leakers} leaker(s) reached the site.</span>`
    );
    this.ui.showDebrief({
      scenario: SCENARIOS[this.scenarioId].name,
      intercepted: this.stats.intercepted,
      leakers: this.stats.leakers,
      rounds: this.stats.rounds,
      lines
    });
    this.ui.log('ENGAGEMENT COMPLETE', 'good');
  }

  /* ================================================================ *
   * Engagement actions
   * ================================================================ */

  get engagementTarget() {
    return this.lookedAtTrack || this.radar.selected;
  }

  assign() {
    const track = this.engagementTarget;
    const battery = this.batteries.selected;
    if (!track || !track.alive) {
      audio.ui('deny');
      this.ui.log('ASSIGN REJECTED &mdash; NO TRACK SELECTED', 'bad');
      return false;
    }
    const check = battery.canEngage(track.threat);
    if (!check.ok) {
      audio.ui('deny');
      this.ui.log(`ASSIGN REJECTED &mdash; ${battery.spec.name}: ${check.reason}`, 'bad');
      return false;
    }
    if (!battery.beginEngagement(track)) {
      audio.ui('deny');
      this.ui.log(`ASSIGN REJECTED &mdash; ${battery.spec.name} NOT READY`, 'bad');
      return false;
    }
    this.assignedTrack = track;
    this.radar.select(track);
    audio.ui('confirm');
    audio.servo(battery.spec.prepTime);
    this.ui.log(`${battery.spec.name} ASSIGNED TO ${track.id} &mdash; PREPARING`, 'warn');
    return true;
  }

  authorize() {
    const battery = this.batteries.selected;
    const track = this.assignedTrack && this.assignedTrack.alive ? this.assignedTrack : null;
    if (!track) {
      audio.ui('deny');
      this.ui.log('LAUNCH REJECTED &mdash; NOTHING ASSIGNED', 'bad');
      return false;
    }
    if (!battery.armed) {
      audio.ui('deny');
      this.ui.log(`LAUNCH REJECTED &mdash; ${battery.spec.name} ${battery.statusText}`, 'bad');
      return false;
    }
    const tube = battery.consumeTube();
    if (tube < 0) {
      audio.ui('deny');
      this.ui.log(`LAUNCH REJECTED &mdash; ${battery.spec.name} HAS NO ROUNDS`, 'bad');
      return false;
    }
    const shot = this.interceptors.launch(battery, track.threat, tube);
    battery.onFired();
    if (shot) {
      track.engaged = true;
      track.assignedShots.push(shot);
    }
    return true;
  }

  /** Test/demo convenience: pick the best pairing and fire it. */
  autoEngage() {
    const firm = this.radar
      .firmTracks()
      .filter((t) => !t.engaged && t.classification !== CLASSIFICATION.DECOY);
    if (firm.length === 0) return false;
    for (const track of firm) {
      for (let i = 0; i < this.batteries.list.length; i++) {
        const b = this.batteries.list[i];
        if (!b.ready) continue;
        if (!b.canEngage(track.threat).ok) continue;
        this.batteries.select(i);
        this.radar.select(track);
        this.lookedAtTrack = null;
        if (this.assign()) {
          this._pendingAuto = { battery: b, track };
          return true;
        }
      }
    }
    return false;
  }

  /* ================================================================ *
   * Simulation
   * ================================================================ */

  simulate(dt) {
    this.elapsed += dt;

    this.weather.update(dt, this.camera);
    this.post.applyLook({
      bloomStrength: this.weather.preset.bloomStrength,
      exposure: this.weather.preset.exposure,
      vignette: 0.4,
      night: this.weather.preset.night
    });

    this.player.update(dt, { effects: this.effects, elapsed: this.elapsed });
    this.base.update(dt, { weather: this.weather });

    if (this.phase === PHASE.RUNNING) this.scenarioElapsed += dt;

    this.threats.update(dt, {
      onThreatTerminal: (t) => {
        this.ui.log(`${t.id} ENTERING TERMINAL PHASE`, 'bad');
        audio.overflight(this.camera.position.distanceTo(t.pos));
      }
    });
    this.interceptors.update(dt, {});
    this.radar.update(dt, this.threats.active);
    this.batteries.update(dt);

    // Keep every assigned launcher tracking its target.
    for (const b of this.batteries.list) {
      const track = b.assignedTrack;
      if (track && track.alive && (b.state === 'preparing' || b.state === 'armed' || b.state === 'firing')) {
        b.aimAt(track.pos);
      } else if (b.state === 'ready' || b.state === 'empty') {
        b.aimAt(null);
      }
      if (track && !track.alive && b.state !== 'firing' && b.state !== 'reloading') {
        b.assignedTrack = null;
        if (b.state === 'armed' || b.state === 'preparing') b.state = 'ready';
      }
    }

    // A queued auto-engagement fires as soon as the battery finishes preparing.
    if (this._pendingAuto) {
      const { battery, track } = this._pendingAuto;
      if (!track.alive) {
        this._pendingAuto = null;
      } else if (battery.armed) {
        this.assignedTrack = track;
        this.authorize();
        this._pendingAuto = null;
      }
    }

    this.effects.update(dt, {
      camera: this.camera,
      weather: this.weather,
      pixelRatio: this.renderer.getPixelRatio(),
      viewportHeight: this.renderer.domElement.clientHeight || 900
    });

    this.holo.update(dt, {
      radar: this.radar,
      base: this.base,
      batteries: this.batteries,
      interceptors: this.interceptors
    });

    this.post.update(dt);
    this._updateLookedAt();
    this._updateAlerts();

    if (
      this.phase === PHASE.RUNNING &&
      this.threats.running &&
      this.threats.waveIndex >= this.threats.scenario.waves.length &&
      this.threats.active.length === 0 &&
      this.interceptors.active.length === 0
    ) {
      this.finishEngagement();
    }
  }

  _updateLookedAt() {
    this.lookedAtTrack = null;
    if (this.player.mode !== MODE.FREE) return;
    this.player.getLookDirection(_v);
    let best = null;
    let bestDot = Math.cos(THREE.MathUtils.degToRad(6.5));
    for (const t of this.radar.tracks) {
      if (!t.alive || t.state === TRACK_STATE.SEARCH) continue;
      _v2.copy(t.pos).sub(this.camera.position).normalize();
      const d = _v.dot(_v2);
      if (d > bestDot) {
        bestDot = d;
        best = t;
      }
    }
    this.lookedAtTrack = best;
  }

  _updateAlerts() {
    if (this.phase !== PHASE.RUNNING) return;
    const terminal = this.threats.active.filter((t) => t.alive && !t.isDecoy && t.pos.y < 3000).length;
    const live = this.threats.liveThreats;
    if (terminal > 0) this.ui.setAlert(`${terminal} THREAT${terminal > 1 ? 'S' : ''} IN TERMINAL PHASE`);
    else if (live > 0) this.ui.setAlert(`${live} INBOUND`);
    else this.ui.setAlert(null);
  }

  _bearingOf(track) {
    return (THREE.MathUtils.radToDeg(Math.atan2(track.pos.x, -track.pos.z)) + 360) % 360;
  }

  /* ================================================================ *
   * Frame
   * ================================================================ */

  applyQuality() {
    const q = settings.quality;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatio));
    this.renderer.shadowMap.enabled = q.shadows;
    this.weather.sun.castShadow = q.shadows;
    this.scene.traverse((o) => {
      if (o.isMesh && o.name && o.name.startsWith('battery')) o.castShadow = q.shadows;
    });
    this.onResize();
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.fov = settings.fov;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h);
  }

  buildUiState() {
    const bat = this.batteries.selected;
    const target = this.engagementTarget;
    return {
      phase: this.phase,
      elapsed: this.scenarioElapsed,
      scenarioId: this.scenarioId,
      scenarioName: SCENARIOS[this.scenarioId].name,
      skyId: this.skyId,
      skyLabel: SKY_PRESETS[this.skyId].label,
      tracks: this.radar.tracks,
      selectedTrack: this.radar.selected,
      lookedAtTrack: this.lookedAtTrack,
      assignedTrack: this.assignedTrack,
      batteries: this.batteries.list,
      selectedBatteryIndex: this.batteries.selectedIndex,
      selectedBatteryName: bat.spec.name,
      engagementCheck: target ? bat.canEngage(target.threat) : null,
      canAuthorize: bat.armed,
      interceptors: this.interceptors.active,
      activeThreats: this.threats.liveThreats,
      inFlight: this.interceptors.active.length,
      intercepted: this.stats.intercepted,
      leakers: this.stats.leakers,
      decoysHit: this.stats.decoysHit,
      camera: this.camera,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      fps: this.fps,
      frameMs: this.frameMs,
      drawCalls: this.renderer.info.render.calls
    };
  }

  snapshotForTests() {
    return {
      phase: this.phase,
      sky: this.skyId,
      scenario: this.scenarioId,
      mode: this.player.mode,
      elapsed: this.scenarioElapsed,
      stats: { ...this.stats },
      threats: this.threats.active.length,
      liveThreats: this.threats.liveThreats,
      tracks: this.radar.tracks.length,
      firmTracks: this.radar.firmTracks().length,
      selectedTrack: this.radar.selected?.id ?? null,
      assignedTrack: this.assignedTrack?.id ?? null,
      interceptors: this.interceptors.active.length,
      batteries: this.batteries.list.map((b) => ({
        id: b.id,
        state: b.state,
        ammo: b.ammo,
        loaded: b.loaded
      })),
      selectedBattery: this.batteries.selected.id,
      player: {
        x: +this.player.position.x.toFixed(2),
        y: +this.player.position.y.toFixed(2),
        z: +this.player.position.z.toFixed(2)
      },
      fps: +this.fps.toFixed(1),
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles
    };
  }

  frame() {
    const raw = this.clock.getDelta();
    // Clamp so a background tab or a long GC pause cannot teleport the sim.
    const dt = clamp(raw, 0, 0.1);

    // Fixed-step simulation with a bounded number of catch-up steps.
    this._accumulator = (this._accumulator || 0) + dt;
    const step = settings.fixedStep;
    let steps = 0;
    while (this._accumulator >= step && steps < settings.maxSubSteps) {
      this.simulate(step);
      this._accumulator -= step;
      steps++;
    }
    if (steps === settings.maxSubSteps) this._accumulator = 0;

    this.renderer.info.reset();
    this.post.render(dt);

    // Frame timing.
    const ms = dt * 1000;
    this.frameTimes.push(ms);
    if (this.frameTimes.length > 60) this.frameTimes.shift();
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameMs = avg;
    this.fps = 1000 / Math.max(0.001, avg);

    this.ui.update(this.buildUiState(), dt);
  }

  run() {
    const loop = () => {
      requestAnimationFrame(loop);
      try {
        this.frame();
      } catch (err) {
        console.error('[frame]', err);
        this._errors = (this._errors || 0) + 1;
        if (this._errors > 40) throw err;
      }
    };
    loop();
  }
}

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

function boot() {
  const game = new Game();
  window.__gameInstance = game;
  game.ui.hideLoading();
  game.run();

  if (settings.skipIntro) {
    game.startSession();
    if (settings.testMode) {
      // Tests drive the simulation explicitly; keep the world quiet until then.
      audio.setEnabled(false);
    }
  }

  onSettingsChange((s, patch) => {
    if ('reducedMotion' in patch || 'qualityName' in patch) game.applyQuality();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
