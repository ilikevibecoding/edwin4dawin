// AEGIS LINE - fictional first-person ballistic missile interceptor demo.
// This module owns the renderer, the game state machine, input handling and the
// deterministic test hooks.
import * as THREE from 'three';
import './style.css';

import { Rng } from './core/rng.js';
import { buildMaterials, mats } from './core/materials.js';
import { setTextureAnisotropy } from './core/textures.js';
import { CollisionWorld } from './physics.js';
import { Base, PLAYER_SPAWN, PAD_POSITIONS, SHELTER_ORIGIN } from './base.js';
import { createBattery, BATTERY_SPECS } from './batteries.js';
import { ThreatManager, SCENARIOS } from './threats.js';
import { InterceptorManager, INTERCEPTOR_SPECS } from './interceptors.js';
import { Effects } from './effects.js';
import { Weather, CONDITIONS } from './weather.js';
import { Radar } from './radar.js';
import { Player } from './player.js';
import { Audio } from './audio.js';
import { Post } from './post.js';
import { UI } from './ui.js';
import { predictInterceptPoint } from './physics.js';

const params = new URLSearchParams(location.search);
const TEST_MODE = params.get('test') === '1';
const SEED = Number(params.get('seed') || 20260805);

const FIXED_DT = 1 / 60;
const MAX_STEPS = 5;
const _solveVec = new THREE.Vector3();

class Game {
  constructor() {
    this.rng = new Rng(SEED);
    this.settings = {
      reducedMotion: false,
      highContrast: false,
      captions: false,
      perf: TEST_MODE ? false : false,
      quality: 'high',
      volume: 0.7,
      sensitivity: 1,
    };
    this.state = 'title';
    this.elapsed = 0;
    this.simTime = 0;
    this.frameCount = 0;
    this.fps = 0;
    this._fpsAcc = 0;
    this._fpsFrames = 0;
    this.results = [];
    this.pendingComplete = 0;
  }

  // ---------------------------------------------------------------- bootstrap

  init(root) {
    this.root = root;
    const canvas = document.createElement('canvas');
    canvas.id = 'view';
    root.appendChild(canvas);
    this.canvas = canvas;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
      stencil: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, TEST_MODE ? 1 : 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.4;
    renderer.info.autoReset = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = renderer;
    setTextureAnisotropy(renderer.capabilities.getMaxAnisotropy());

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.15, 260000);
    this.camera.position.set(PLAYER_SPAWN.x, 1.7, PLAYER_SPAWN.z);

    buildMaterials();

    this.collision = new CollisionWorld();
    this.weather = new Weather(this.scene, renderer, this.rng.fork('weather'));
    this.base = new Base(this.scene, this.rng.fork('base'), this.collision).build();
    this.effects = new Effects(this.scene, this.rng.fork('fx'));

    // batteries, oriented so their launchers face the threat axis (north)
    this.batteries = [
      createBattery('patriot', PAD_POSITIONS.patriot, 0.22, this.rng.fork('bat1'), this.collision),
      createBattery('thaad', PAD_POSITIONS.thaad, -0.1, this.rng.fork('bat2'), this.collision),
      createBattery('sentinel', PAD_POSITIONS.sentinel, -0.34, this.rng.fork('bat3'), this.collision),
    ];
    for (const b of this.batteries) this.scene.add(b.group);
    this.selectedBattery = this.batteries[0];
    this.batteries[0].selected = true;

    this.threats = new ThreatManager(this.scene, this.rng.fork('threats'), this.effects);
    this.interceptors = new InterceptorManager(this.scene, this.rng.fork('int'), this.effects);
    this.radar = new Radar(this.scene, this.base.consoleAnchor, { rng: this.rng.fork('radar') });

    // wire the console table + wall monitors to the radar canvases
    if (this.base.scopeMaterial) {
      this.base.scopeMaterial.map = this.radar.texture;
      this.base.scopeMaterial.color.set(0xffffff);
      this.base.scopeMaterial.needsUpdate = true;
    }
    for (let i = 0; i < this.base.screens.length; i++) {
      const s = this.base.screens[i];
      s.material.map = i === 0 ? this.radar.sideTexture : this.radar.texture;
      s.material.color.set(0xffffff);
      s.material.needsUpdate = true;
    }

    this.audio = new Audio();
    this.player = new Player(this.camera, this.collision, {
      getGroundHeight: (x, z) => this.base.terrainHeight(x, z),
      onFootstep: (i) => this.audio.footstep(i),
    }).attach(canvas);
    this.player.teleport(PLAYER_SPAWN.x, this.base.terrainHeight(PLAYER_SPAWN.x, PLAYER_SPAWN.z), PLAYER_SPAWN.z, 0.28, -0.02);

    this.post = new Post(renderer, this.scene, this.camera, { quality: this.settings.quality });

    this.ui = new UI(this._handlers()).mount(root);
    this.ui.attachScope(this.radar.canvas);
    this.ui.buildBatteryCards(this.batteries);
    this.ui.setCaptionsEnabled(false);

    this.conditionId = 'day';
    this.scenarioId = 'single';
    this._applyCondition('day', 0);
    this.ui.log('<b>SITE READY.</b> Fictional range article on standby.', 'info');
    this.ui.log('Walk the site or take the console to begin.', '');

    this._bindEvents();
    this._bindTestApi();

    this.threats.onImpact = (t) => this._onImpact(t);
    this.threats.onSpawn = (t) => this._onThreatSpawn(t);
    this.interceptors.onResult = (r) => this._onResult(r);
    this.interceptors.onKill = (target) => this.threats.kill(target, 'INTERCEPTED');
    this.interceptors.onDecoyDestroyed = (target) => this.threats.kill(target, 'DECOY');

    this.ready = true;
    if (!TEST_MODE) {
      this.ui.showTitle();
      this._loop();
    } else {
      this.ui.hideTitle();
      this.state = 'idle';
      this.player.locked = true; // allow scripted movement without pointer lock
      // draw one frame so the canvas has content immediately
      this._render(FIXED_DT);
    }
  }

  // ------------------------------------------------------------------- events

  _handlers() {
    return {
      onStart: () => this._begin(),
      onCondition: (id) => {
        this._applyCondition(id, 1.2);
        this.audio.click(900);
      },
      onScenario: (id) => {
        this.scenarioId = id;
        this.audio.click(1100);
        if (SCENARIOS[id].timeOfDayHint && this.conditionId !== SCENARIOS[id].timeOfDayHint) {
          this._applyCondition(SCENARIOS[id].timeOfDayHint, 1.2);
          this.ui.log(`Conditions set to <b>${CONDITIONS[this.conditionId].name}</b> for ${SCENARIOS[id].name}.`, 'info');
        }
      },
      onBattery: (id) => {
        this._selectBattery(this.batteries.find((b) => b.id === id));
        this.audio.click(1250);
      },
      onStartScenario: () => this.startScenario(),
      onAssign: () => this.assign(),
      onAuthorize: () => this.authorize(),
      onRestart: () => this.restart(),
      onCloseConsole: () => this._setConsole(false),
      onSelectTrackIndex: (i) => {
        const tr = this.radar.tracks[i];
        if (tr) {
          this.radar.selectTrack(tr);
          this.audio.radarPing();
        }
      },
      onScopeClick: (nx, ny) => this._scopeClick(nx, ny),
      onToggle: (key) => this._toggle(key),
      onQuality: (q) => this._setQuality(q),
      onVolume: (v) => {
        this.settings.volume = v;
        this.audio.setVolume(v);
      },
      onSensitivity: (v) => {
        this.settings.sensitivity = v;
        this.player.mouseSensitivity = 0.0022 * v;
      },
    };
  }

  _bindEvents() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.post.setSize(w, h);
    });

    this.canvas.addEventListener('mousedown', () => {
      if (this.state === 'title') return;
      this.audio.init();
      this.audio.setVolume(this.settings.volume);
      if (!this.ui.consoleOpen) this.player.requestLock();
    });

    this.player.onLockChange = (locked) => {
      this.ui.setPointerHint(!locked && !this.ui.consoleOpen && this.state !== 'title');
    };

    window.addEventListener('keydown', (e) => {
      if (this.state === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') this._begin();
        return;
      }
      switch (e.code) {
        case 'Tab':
          e.preventDefault();
          this._setConsole(!this.ui.consoleOpen);
          break;
        case 'KeyE':
          if (!this.ui.consoleOpen && this.nearConsole) this._setConsole(true);
          else this.assign();
          break;
        case 'KeyF':
          this.authorize();
          break;
        case 'KeyT':
          this.radar.selectNext();
          this.audio.radarPing();
          break;
        case 'KeyB':
          this._cycleBattery();
          break;
        case 'KeyR':
          this.restart();
          break;
        case 'KeyP':
          this._toggle('perf');
          break;
        case 'KeyM':
          this.audio.setMuted(!this.audio.muted);
          this.ui.log(this.audio.muted ? 'Audio muted.' : 'Audio unmuted.', '');
          break;
        case 'Escape':
          if (this.ui.consoleOpen) this._setConsole(false);
          break;
        default:
          break;
      }
    });
  }

  _begin() {
    this.ui.hideTitle();
    this.state = 'idle';
    this.audio.init();
    this.audio.setVolume(this.settings.volume);
    this.player.requestLock();
  }

  _toggle(key) {
    this.settings[key] = !this.settings[key];
    if (key === 'reducedMotion') {
      this.player.reducedMotion = this.settings[key];
      this.post.setReducedMotion(this.settings[key]);
      this.effects.reducedMotion = this.settings[key];
      this.ui.log(`Reduced motion <b>${this.settings[key] ? 'ON' : 'OFF'}</b>.`, 'info');
    } else if (key === 'highContrast') {
      this.ui.setHighContrast(this.settings[key]);
    } else if (key === 'captions') {
      this.ui.setCaptionsEnabled(this.settings[key]);
    }
    this.audio.click(760);
  }

  _setQuality(q) {
    this.settings.quality = q;
    this.post.setQuality(q);
    const pr = q === 'low' ? 0.75 : q === 'medium' ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(TEST_MODE ? 1 : pr);
    this.renderer.shadowMap.enabled = q !== 'low';
    this.weather.sun.shadow.mapSize.set(q === 'high' ? 2048 : 1024, q === 'high' ? 2048 : 1024);
    if (this.weather.sun.shadow.map) {
      this.weather.sun.shadow.map.dispose();
      this.weather.sun.shadow.map = null;
    }
    this.scene.traverse((o) => {
      if (o.isMesh && o.material) o.material.needsUpdate = true;
    });
    this.ui.log(`Render quality set to <b>${q.toUpperCase()}</b>.`, 'info');
  }

  _setConsole(open) {
    if (open) {
      this.ui.openConsole();
      this.player.frozen = true;
      this.player.releaseLock();
      this.ui.setPointerHint(false);
      this.audio.setAmbience(true);
      this.audio.click(1400);
    } else {
      this.ui.closeConsole();
      this.player.frozen = false;
      this.audio.setAmbience(false);
      this.audio.click(700);
      if (!TEST_MODE) this.player.requestLock();
    }
  }

  _applyCondition(id, blend = 0) {
    this.conditionId = id;
    const c = this.weather.setCondition(id, blend);
    this.post.applyCondition(c);
    this.base.setNight(id === 'night', 1);
    if (id === 'sunset') {
      for (const f of this.base.floodlights) f.spot.intensity = 220;
    }
    this.effects.setLightingMood(
      new THREE.Color(...c.smokeLight),
      new THREE.Color(...c.smokeShadow),
    );
    this.condition = c;
  }

  _selectBattery(b) {
    if (!b) return;
    for (const x of this.batteries) x.selected = x === b;
    this.selectedBattery = b;
    this.ui.log(`Battery <b>${b.spec.name}</b> selected. ${b.spec.role} band ${(b.spec.idealAltitude[0] / 1000).toFixed(0)}-${(b.spec.idealAltitude[1] / 1000).toFixed(0)} km.`, 'info');
  }

  _cycleBattery() {
    const i = this.batteries.indexOf(this.selectedBattery);
    this._selectBattery(this.batteries[(i + 1) % this.batteries.length]);
    this.audio.click(1150);
  }

  _scopeClick(nx, ny) {
    // scope pixels -> world XZ -> nearest track
    const wx = nx * this.radar.range;
    const wz = ny * this.radar.range;
    let best = null;
    let bestD = Infinity;
    for (const tr of this.radar.tracks) {
      const d = Math.hypot(tr.threat.pos.x - wx, tr.threat.pos.z - wz);
      if (d < bestD) {
        bestD = d;
        best = tr;
      }
    }
    if (best && bestD < this.radar.range * 0.09) {
      this.radar.selectTrack(best);
      this.audio.radarPing();
      this.ui.caption(`Track ${best.id} selected`);
    }
  }

  // ------------------------------------------------------------- game control

  startScenario() {
    if (this.state === 'running') return false;
    const scenario = SCENARIOS[this.scenarioId];
    this.restart(true);
    this.state = 'running';
    this.simTime = 0;
    this.elapsed = 0;
    this.threats.startScenario(scenario);
    this.base.setSearchlightsActive(scenario.id === 'night');
    this.ui.clearLog();
    this.ui.log(`<b>${scenario.name}</b> initiated. ${scenario.blurb}`, 'warn');
    this.ui.showBanner('INBOUND DETECTED', scenario.name, 'warn', 2.6);
    this.audio.startAlarm();
    setTimeoutSafe(() => this.audio.stopAlarm(), 4200);
    return true;
  }

  restart(silent = false) {
    this.threats.reset();
    this.interceptors.reset();
    this.effects.clear();
    this.radar.tracks.length = 0;
    this.radar.selected = null;
    this.results.length = 0;
    this.pendingComplete = 0;
    for (const b of this.batteries) {
      b.ammo = b.spec.ammo;
      b.loaded = b.spec.tubes;
      b.autoTarget = null;
      b.status = 'READY';
      b.armed = false;
      b.prepTimer = 0;
      b.reloadTimer = 0;
      b.cooldown = 0;
      b.stow();
      for (const t of b.tubes) {
        t.loaded = true;
        if (t.cover) t.cover.visible = true;
      }
    }
    this.state = 'idle';
    this.simTime = 0;
    this.elapsed = 0;
    this.audio.stopAlarm();
    if (!silent) {
      this.ui.clearLog();
      this.ui.log('<b>SCENARIO RESET.</b> Batteries reloaded, picture cleared.', 'info');
      this.ui.showBanner('READY', 'Press START BALLISTIC MISSILES', '', 2.0);
    }
  }

  /** Assign the selected battery to the selected track. */
  assign() {
    const tr = this.radar.selected;
    const b = this.selectedBattery;
    if (!tr || !b) {
      this.audio.deny();
      this.ui.caption('No track selected');
      return false;
    }
    if (b.status === 'EMPTY') {
      this.audio.deny();
      this.ui.log(`<b>${b.spec.name}</b> has no rounds remaining.`, 'bad');
      return false;
    }
    if (b.status === 'RELOADING') {
      this.audio.deny();
      this.ui.log(`<b>${b.spec.name}</b> is reloading - ${b.reloadTimer.toFixed(0)}s.`, 'warn');
      return false;
    }
    const sol = this._solveEngagement(b, tr.threat);
    if (!sol.ok) {
      this.audio.deny();
      this.ui.log(`<b>${b.spec.name}</b> cannot engage <b>${tr.id}</b>: ${sol.reason}. Try another battery <b>[B]</b>.`, 'bad');
      this.ui.caption(`${b.spec.name} has no window on ${tr.id}`);
      return false;
    }
    this.assignedTrack = tr;
    this.assignedBattery = b;
    tr.threat.assignedTo = b;
    b.prepare();
    b.aimAt(this._leadPoint(b, tr.threat) || tr.threat.pos);
    this.audio.confirm();
    this.audio.servo(b.group.position, 1.2);
    this.ui.log(`<b>${b.spec.name}</b> assigned to <b>${tr.id}</b>. Launcher slewing. Predicted intercept ${(sol.altitude / 1000).toFixed(0)} km in ${sol.flightTime.toFixed(0)}s.`, 'info');
    if (sol.quality === 'MARGINAL') {
      this.ui.log(`Window is <b>MARGINAL</b>: ${sol.reason}.`, 'warn');
    }
    this.ui.caption(`${b.spec.name} assigned to ${tr.id}`);
    return true;
  }

  /** Authorize launch against the current assignment. */
  authorize() {
    const b = this.assignedBattery || this.selectedBattery;
    const tr = this.assignedTrack && this.assignedTrack.threat.alive ? this.assignedTrack : this.radar.selected;
    if (!tr || !tr.threat.alive) {
      this.audio.deny();
      this.ui.caption('No valid assignment');
      return false;
    }
    if (!b || !this.assignedBattery) {
      this.audio.deny();
      this.ui.log('Assign a battery to the track before authorising launch. <b>[E]</b>', 'warn');
      return false;
    }
    if (b.status === 'PREPARING') {
      this.audio.deny();
      this.ui.log(`<b>${b.spec.name}</b> still preparing - ${b.prepTimer.toFixed(1)}s.`, 'warn');
      return false;
    }
    if (!b.canFire) {
      this.audio.deny();
      this.ui.log(`<b>${b.spec.name}</b> cannot fire: ${b.status}.`, 'bad');
      return false;
    }
    const groundY = this.base.terrainHeight(b.group.position.x, b.group.position.z);
    const it = this.interceptors.launch(b, tr.threat, groundY);
    if (!it) {
      this.audio.deny();
      return false;
    }
    this.audio.launch(it.pos, b.spec.plumeScale);
    this.ui.caption(`${b.spec.name} away at ${tr.id}`);
    const d = this.camera.position.distanceTo(it.pos);
    this.player.addShake(Math.max(0.1, 1.4 * Math.exp(-d / 90)));
    this.post.addFlash(0.12 * Math.exp(-d / 120));
    this.ui.log(`<b>LAUNCH</b> ${b.spec.name} -> ${tr.id}. ${INTERCEPTOR_SPECS[b.spec.interceptor].label} in flight.`, 'good');
    return true;
  }

  /**
   * Work out whether a battery has a usable engagement window against a threat,
   * and where the meeting point would be. This is a deliberately simplified
   * gameplay abstraction, not a fire-control solution: it iterates a
   * constant-velocity target against an average round speed a few times and
   * then compares the result with the battery's fictional preferred band.
   *
   * @returns {{ok:boolean, reason:string, quality:string, altitude:number,
   *            flightTime:number, timeToImpact:number, point:THREE.Vector3}}
   */
  _solveEngagement(battery, threat) {
    const spec = INTERCEPTOR_SPECS[battery.spec.interceptor];
    // average speed over the whole flight, well below the peak: the round starts
    // from rest, loses energy to drag in the dense lower air and coasts at the end
    const avgSpeed = spec.maxSpeed * 0.42;
    const from = battery.group.position;
    let t = from.distanceTo(threat.pos) / avgSpeed;
    const point = _solveVec;
    for (let i = 0; i < 4; i++) {
      point.copy(threat.vel).multiplyScalar(t).add(threat.pos);
      t = from.distanceTo(point) / avgSpeed;
    }
    // add the time the launcher still needs before the round can leave the tube
    const readyDelay = battery.status === 'PREPARING' ? battery.prepTimer
      : battery.status === 'RELOADING' ? battery.reloadTimer : 0;
    const flightTime = t + readyDelay;
    point.copy(threat.vel).multiplyScalar(flightTime).add(threat.pos);
    const altitude = point.y;

    const vy = -threat.vel.y;
    const g = 9.81;
    const disc = vy * vy + 2 * g * Math.max(0, threat.pos.y);
    const timeToImpact = disc > 0 ? (-vy + Math.sqrt(disc)) / g : 0;

    const [lo, hi] = battery.spec.idealAltitude;
    let ok = true;
    let reason = '';
    let quality = 'OPTIMAL';
    if (battery.ammo <= 0) {
      ok = false;
      reason = 'NO ROUNDS REMAINING';
    } else if (flightTime > timeToImpact - 3.0) {
      ok = false;
      reason = 'NO WINDOW - TARGET IMPACTS BEFORE THE ROUND ARRIVES';
    } else if (altitude < 1200) {
      ok = false;
      reason = 'MEETING POINT TOO LOW - TARGET IS ALREADY IN ITS TERMINAL DIVE';
    } else if (altitude < lo * 0.35) {
      ok = false;
      reason = 'TARGET WILL BE BELOW THIS BATTERY\'S FLOOR';
    } else if (altitude > hi * 1.6) {
      ok = false;
      reason = 'TARGET WILL BE ABOVE THIS BATTERY\'S CEILING';
    } else if (from.distanceTo(point) > spec.reach) {
      ok = false;
      reason = 'TARGET BEYOND THIS BATTERY\'S REACH';
    } else if (altitude < lo || altitude > hi) {
      quality = 'MARGINAL';
      reason = `INTERCEPT AT ${(altitude / 1000).toFixed(0)} KM IS OUTSIDE THE OPTIMUM BAND`;
    }
    return { ok, reason, quality, altitude, flightTime, timeToImpact, point };
  }

  /**
   * One decision tick of the demonstration autopilot. Every battery works its
   * own engagement, so a saturation raid is met by all three at once instead of
   * one at a time. Used by the headless tests to play the game.
   * @returns {string} what it decided to do
   */
  autoPilot() {
    const acts = [];

    // retire finished engagements
    for (const b of this.batteries) {
      const t = b.autoTarget;
      if (!t) continue;
      if (!t.threat.alive || t.threat.engagedBy || b.status === 'EMPTY') {
        b.autoTarget = null;
        if (b === this.assignedBattery) {
          this.assignedBattery = null;
          this.assignedTrack = null;
        }
        b.stow();
        acts.push('RELEASE');
      }
    }

    // fire the batteries that are ready and on target
    for (const b of this.batteries) {
      if (!b.autoTarget) continue;
      if (b.canFire && b.aimError < 0.16) {
        this.assignedBattery = b;
        this.assignedTrack = b.autoTarget;
        if (this.authorize()) {
          b.autoTarget = null;
          acts.push('FIRE');
        } else {
          acts.push('FIRE_FAILED');
        }
      } else {
        b.aimAt(this._leadPoint(b, b.autoTarget.threat));
        acts.push(b.status === 'PREPARING' ? 'PREPARING' : 'SLEWING');
      }
    }

    // hand every idle battery the most urgent track it can actually reach
    const taken = new Set(this.batteries.map((b) => b.autoTarget).filter(Boolean));
    const candidates = this.radar.tracks.filter(
      (t) => t.threat.alive && !t.engaged && !taken.has(t) && t.classification !== 'DECOY',
    );
    candidates.sort((a, b) => a.timeToImpact - b.timeToImpact);
    for (const tr of candidates) {
      let best = null;
      let bestScore = -Infinity;
      for (const b of this.batteries) {
        if (b.autoTarget || b.status !== 'READY' || b.loaded <= 0) continue;
        const sol = this._solveEngagement(b, tr.threat);
        if (!sol.ok) continue;
        const score = (sol.quality === 'OPTIMAL' ? 1000 : 0) + b.loaded * 2 - sol.flightTime;
        if (score > bestScore) {
          bestScore = score;
          best = b;
        }
      }
      if (!best) continue;
      this.radar.selectTrack(tr);
      this._selectBattery(best);
      best.autoTarget = tr;
      if (this.assign()) acts.push('ASSIGN');
      else {
        best.autoTarget = null;
        acts.push('ASSIGN_FAILED');
      }
    }

    if (!acts.length) return this.radar.tracks.length ? 'NO_WINDOW' : 'NO_TARGET';
    return acts.join('+');
  }

  /** Convenience used by the tests and by the auto-cue: best available battery. */
  autoEngage() {
    if (!this.radar.tracks.length) return false;
    // prefer a track that nothing is engaging yet
    const tr = this.radar.tracks.find((x) => !x.engaged && x.classification !== 'DECOY') || this.radar.tracks[0];
    this.radar.selectTrack(tr);
    const alt = tr.altitude;
    const candidates = this.batteries.filter((b) => b.canFire || b.status === 'READY');
    let best = null;
    let bestScore = -Infinity;
    for (const b of candidates) {
      const [lo, hi] = b.spec.idealAltitude;
      const inBand = alt >= lo && alt <= hi;
      const score = (inBand ? 100 : -Math.min(Math.abs(alt - lo), Math.abs(alt - hi)) / 1000) + b.loaded;
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }
    if (!best) return false;
    this._selectBattery(best);
    return this.assign();
  }

  _leadPoint(battery, threat) {
    const spec = INTERCEPTOR_SPECS[battery.spec.interceptor];
    const out = new THREE.Vector3();
    const t = predictInterceptPoint(out, battery.group.position, spec.maxSpeed * 0.62, threat.pos, threat.vel, 0);
    out.__tti = t;
    return out;
  }

  // ------------------------------------------------------------------- events

  _onThreatSpawn(t) {
    this.ui.log(`New contact <b>${t.trackId}</b> at ${(t.pos.y / 1000).toFixed(0)} km, bearing ${bearingOf(t.pos).toFixed(0)}deg.`, 'warn');
    this.audio.radarPing();
    this.ui.caption(`New contact ${t.trackId}`);
  }

  _onImpact(t) {
    const d = this.camera.position.distanceTo(t.pos);
    this.player.addShake(Math.max(0.2, 1.8 * Math.exp(-d / 160)));
    this.post.addFlash(0.3 * Math.exp(-d / 200));
    this.audio.explosion(t.pos, 1.7);
    this.ui.log(`<b>IMPACT</b> ${t.trackId} struck the site.`, 'bad');
    this.ui.showBanner('IMPACT', `${t.trackId} was not intercepted`, 'bad', 3.4);
    this.ui.caption(`Impact - ${t.trackId} struck the site`);
    this.results.push({ result: 'IMPACT', id: t.trackId });
  }

  _onResult(r) {
    const pos = r.interceptor.pos.clone();
    const d = this.camera.position.distanceTo(pos);
    if (r.result === 'INTERCEPT') {
      this.audio.explosion(pos, 1.5);
      this.player.addShake(Math.max(0.05, 0.9 * Math.exp(-d / 300)));
      this.post.addFlash(0.34 * Math.exp(-d / 1400));
      this.ui.log(`<b>INTERCEPT</b> ${r.message}`, 'good');
      this.ui.showBanner('INTERCEPTED', r.message, 'good', 3.4);
      this.ui.caption('Intercept - target destroyed');
    } else if (r.result === 'DECOY') {
      this.audio.explosion(pos, 1.1);
      this.post.addFlash(0.2 * Math.exp(-d / 1400));
      this.ui.log(`<b>DECOY</b> ${r.message}`, 'warn');
      this.ui.showBanner('DECOY', r.message, 'warn', 3.4);
      this.ui.caption('Decoy destroyed - round wasted');
    } else {
      this.audio.explosion(pos, 0.8);
      this.post.addFlash(0.14 * Math.exp(-d / 1400));
      this.ui.log(`<b>MISS</b> ${r.message}`, 'bad');
      this.ui.showBanner('MISSED', r.message, 'bad', 3.4);
      this.ui.caption('Miss - round failed to intercept');
    }
    this.results.push({ result: r.result, message: r.message });
    if (this.assignedTrack && r.target === this.assignedTrack.threat) {
      this.assignedTrack = null;
      this.assignedBattery?.stow();
      this.assignedBattery = null;
    }
  }

  // --------------------------------------------------------------------- loop

  _loop() {
    let last = performance.now();
    let acc = 0;
    const tick = (now) => {
      this._raf = requestAnimationFrame(tick);
      const rawDt = Math.min(0.25, (now - last) / 1000);
      last = now;
      this._fpsAcc += rawDt;
      this._fpsFrames++;
      if (this._fpsAcc >= 0.5) {
        this.fps = this._fpsFrames / this._fpsAcc;
        this._fpsAcc = 0;
        this._fpsFrames = 0;
      }
      acc += rawDt;
      let steps = 0;
      while (acc >= FIXED_DT && steps < MAX_STEPS) {
        this.stepSim(FIXED_DT);
        acc -= FIXED_DT;
        steps++;
      }
      if (steps === MAX_STEPS) acc = 0;
      this._render(rawDt);
    };
    this._raf = requestAnimationFrame(tick);
  }

  /** One fixed simulation step. */
  stepSim(dt) {
    this.simTime += dt;
    if (this.state === 'running') this.elapsed += dt;

    this.player.update(dt);
    this.base.update(dt, this.simTime);
    for (const b of this.batteries) b.update(dt);

    const groundAt = (x, z) => this.base.terrainHeight(x, z);
    this.threats.update(dt, this.camera, groundAt);
    this.interceptors.update(dt, this.camera, groundAt);
    this.effects.simulate(dt);
    this.weather.update(dt, this.simTime, this.player.pos);

    // keep an assigned launcher tracking its target
    if (this.assignedBattery && this.assignedTrack && this.assignedTrack.threat.alive) {
      this.assignedBattery.aimAt(this._leadPoint(this.assignedBattery, this.assignedTrack.threat));
    }

    this.radar.update(dt, { threats: this.threats.active });
    this.audio.setListener(this.camera.position);

    // sonic rumble of bodies passing near the site
    for (const t of this.threats.active) {
      if (!t._whooshed && t.pos.y < 6000 && Math.hypot(t.pos.x, t.pos.z) < 4000) {
        t._whooshed = true;
        this.audio.whoosh(t.pos, 1.4);
      }
    }

    this._updateAssignmentValidity();
    this._checkCompletion(dt);
  }

  _updateAssignmentValidity() {
    if (this.assignedTrack && !this.assignedTrack.threat.alive) {
      this.assignedTrack = null;
      if (this.assignedBattery) this.assignedBattery.stow();
      this.assignedBattery = null;
    }
    if (this.radar.selected && !this.radar.selected.threat.alive) this.radar.selected = null;
    // auto-select the highest priority track so the HUD is never empty
    if (!this.radar.selected && this.radar.tracks.length) this.radar.selectTrack(this.radar.tracks[0]);
  }

  _checkCompletion(dt) {
    if (this.state !== 'running') return;
    const done = this.threats.allSpawned && this.threats.active.length === 0 && this.interceptors.active.length === 0;
    if (done) {
      this.pendingComplete += dt;
      if (this.pendingComplete > 2.2) {
        this.state = 'complete';
        const s = this.threats.stats;
        const grade = s.impacted === 0 ? 'SITE INTACT' : `${s.impacted} IMPACT${s.impacted > 1 ? 'S' : ''}`;
        this.ui.showBanner('SCENARIO COMPLETE',
          `${s.intercepted} intercepted / ${s.impacted} impacts / ${this.interceptors.stats.launched} rounds fired - ${grade}`,
          s.impacted === 0 ? 'good' : 'warn', 6.5);
        this.ui.log(`<b>SCENARIO COMPLETE.</b> ${s.intercepted} intercepted, ${s.impacted} impacts, ${this.interceptors.stats.launched} rounds fired. Press <b>R</b> to run again.`,
          s.impacted === 0 ? 'good' : 'warn');
        this.audio.stopAlarm();
        this.base.setSearchlightsActive(false);
      }
    } else {
      this.pendingComplete = 0;
    }
  }

  /** Per-frame presentation work (no simulation). */
  _render(dt) {
    this.frameCount++;
    this.renderer.info.reset();
    this.effects.present(this.camera);
    this.radar.present(dt, {
      interceptors: this.interceptors.active,
      batteries: this.batteries,
      selectedBattery: this.selectedBattery,
      gameState: this.state,
    });
    this._updateHudProjection();
    this.ui.update(dt, this._snapshot());
    if (this.settings.perf) {
      const fx = this.effects.stats;
      const info = this.renderer.info.render;
      this.ui.setPerf(
        `fps ${this.fps.toFixed(0)}  draws ${info.calls}  tris ${(info.triangles / 1000).toFixed(0)}k\n` +
        `smoke ${fx.smoke}  fire ${fx.fire}  spark ${fx.sparks}  trails ${fx.trails}  debris ${fx.debris}\n` +
        `threats ${this.threats.active.length}  rounds ${this.interceptors.active.length}  state ${this.state}`,
        true,
      );
    } else {
      this.ui.setPerf('', false);
    }
    this.post.render(dt, this.simTime, this.player.shake);
  }

  /** Project threats to screen space for the HUD brackets and prompt. */
  _updateHudProjection() {
    const cam = this.camera;
    cam.updateMatrixWorld();
    const w = window.innerWidth;
    const h = window.innerHeight;
    const v = new THREE.Vector3();
    const items = [];
    let bestPrompt = null;
    let bestDist = Infinity;

    for (const tr of this.radar.tracks) {
      const t = tr.threat;
      v.copy(t.pos).project(cam);
      const behind = v.z > 1;
      let x = (v.x * 0.5 + 0.5) * w;
      let y = (-v.y * 0.5 + 0.5) * h;
      const onScreen = !behind && x > -60 && x < w + 60 && y > -60 && y < h + 60;
      if (!onScreen) {
        // clamp to the frame edge so the player can find the contact
        const cx = w / 2;
        const cy = h / 2;
        let dx = x - cx;
        let dy = y - cy;
        if (behind) {
          dx = -dx;
          dy = -dy;
        }
        const m = Math.max(Math.abs(dx) / (w / 2 - 40), Math.abs(dy) / (h / 2 - 40)) || 1;
        x = cx + dx / m;
        y = cy + dy / m;
      }
      const decoy = tr.classification === 'DECOY';
      const dist = Math.hypot(x - w / 2, y - h / 2);
      const scale = onScreen ? Math.max(0.62, Math.min(1.35, 1600 / Math.max(400, tr.slant / 12))) : 0.7;
      items.push({
        x, y, scale,
        decoy,
        engaged: tr.engaged,
        selected: this.radar.selected === tr,
        offscreen: !onScreen,
        label: `${tr.id}<small>${decoy ? 'DECOY' : tr.classification} ${(tr.altitude / 1000).toFixed(0)}km ${tr.timeToImpact.toFixed(0)}s</small>`,
      });
      if (onScreen && dist < 170 && dist < bestDist) {
        bestDist = dist;
        bestPrompt = tr;
      }
    }
    this.ui.updateMarkers(items);

    // centre-screen engagement prompt
    if (bestPrompt && !this.ui.consoleOpen) {
      if (this.radar.selected !== bestPrompt && !this.lookLock) this.radar.selectTrack(bestPrompt);
      const b = this.selectedBattery;
      const assignedHere = this.assignedTrack === bestPrompt;
      const hint = assignedHere
        ? `<span class="key">F</span> AUTHORIZE LAUNCH - ${b.spec.name} ${b.status}`
        : `<span class="key">E</span> ASSIGN ${b.spec.name}`;
      this.promptTrack = bestPrompt;
      this._prompt = {
        title: `${bestPrompt.id} / ${bestPrompt.classification} / ${(bestPrompt.altitude / 1000).toFixed(0)} KM / IMPACT IN ${bestPrompt.timeToImpact.toFixed(0)}S`,
        hint,
      };
    } else {
      this.promptTrack = null;
      this._prompt = null;
    }

    // predicted intercept cue
    if (this.assignedBattery && this.assignedTrack && this.assignedTrack.threat.alive) {
      const lead = this._leadPoint(this.assignedBattery, this.assignedTrack.threat);
      const sol = this._solveEngagement(this.assignedBattery, this.assignedTrack.threat);
      v.copy(lead).project(cam);
      if (v.z <= 1) {
        this.ui.updateLeadCue({
          x: (v.x * 0.5 + 0.5) * w,
          y: (-v.y * 0.5 + 0.5) * h,
          text: `PREDICTED INTERCEPT ${(sol.altitude / 1000).toFixed(0)} KM / ~${(lead.__tti || 0).toFixed(0)}s / ${sol.ok ? sol.quality : 'NO WINDOW'} (ESTIMATE)`,
          quality: sol.ok ? sol.quality : 'NONE',
        });
      } else {
        this.ui.updateLeadCue(null);
      }
    } else {
      this.ui.updateLeadCue(null);
    }

    // console proximity
    const cp = this.base.consoleAnchor.position;
    const near = Math.hypot(this.camera.position.x - cp.x, this.camera.position.z - cp.z) < 4.2
      && Math.abs(this.camera.position.y - cp.y) < 3.5;
    this.nearConsole = near && !this.ui.consoleOpen;
    if (this.nearConsole && !this._prompt) {
      this._prompt = { title: 'FIRE CONTROL CONSOLE', hint: '<span class="key">E</span> TAKE THE CONSOLE' };
    }
  }

  _snapshot() {
    const b = this.selectedBattery;
    const scenario = SCENARIOS[this.scenarioId];
    const tracksAlive = this.threats.active.length;
    return {
      elapsed: this.elapsed,
      scenarioId: this.scenarioId,
      scenarioName: scenario.name,
      scenarioBlurb: scenario.blurb,
      conditionId: this.conditionId,
      conditionName: CONDITIONS[this.conditionId].name,
      inbound: tracksAlive,
      inFlight: this.interceptors.active.length,
      stats: this.threats.stats,
      rounds: this.interceptors.stats,
      battery: b,
      batteries: this.batteries,
      tracks: this.radar.tracks,
      selectedTrack: this.radar.selected,
      assignedTrackId: this.assignedTrack ? this.assignedTrack.id : null,
      yaw: this.player.yaw,
      prompt: this._prompt,
      canAssign: !!(this.radar.selected && b && b.status !== 'EMPTY'),
      canAuthorize: !!(this.assignedBattery && this.assignedBattery.canFire && this.assignedTrack),
      canStart: this.state !== 'running',
      running: this.state === 'running',
      stateLabel: this.state === 'running' ? 'ENGAGEMENT ACTIVE' : this.state === 'complete' ? 'SCENARIO COMPLETE' : 'STANDBY',
      settings: this.settings,
    };
  }

  // ----------------------------------------------------------------- test api

  _bindTestApi() {
    const api = {
      get ready() {
        return true;
      },
      testMode: TEST_MODE,
      configure: ({ condition, scenario, battery } = {}) => {
        if (condition) this._applyCondition(condition, 0);
        if (scenario) this.scenarioId = scenario;
        if (battery) this._selectBattery(this.batteries.find((x) => x.id === battery));
        return true;
      },
      start: () => this.startScenario(),
      restart: () => this.restart(),
      /** Advance the simulation by n fixed steps and render once. */
      step: (steps = 1) => {
        for (let i = 0; i < steps; i++) this.stepSim(FIXED_DT);
        this._render(FIXED_DT);
        return this.simTime;
      },
      /** Advance the simulation only - no rendering, so tests stay fast. */
      sim: (steps = 1) => {
        for (let i = 0; i < steps; i++) this.stepSim(FIXED_DT);
        return this.simTime;
      },
      render: () => this._render(FIXED_DT),
      freezePlayer: (v) => {
        this.player.enabled = !v;
      },
      teleport: (x, y, z, yaw = 0, pitch = 0) => {
        const gy = y === null || y === undefined ? this.base.terrainHeight(x, z) : y;
        this.player.teleport(x, gy, z, yaw, pitch);
        this.player.applyToCamera(0);
        return true;
      },
      lookAt: (x, y, z) => {
        this.player.lookAt(new THREE.Vector3(x, y, z));
        this.player.applyToCamera(0);
        return true;
      },
      /**
       * Aim the view at whatever is most interesting right now: the round in
       * flight, otherwise the highest-priority track. Used by the capture tools
       * to frame the action without hand-authored camera moves.
       */
      watch: () => {
        const it = this.interceptors.active[0];
        let target = null;
        if (it) target = it.target && it.target.alive ? it.target.pos : it.pos;
        else if (this.threats.active.length) target = this.threats.active[0].pos;
        if (!target) return false;
        this.player.lookAt(target);
        this.player.applyToCamera(0);
        return true;
      },
      openConsole: () => this._setConsole(true),
      closeConsole: () => this._setConsole(false),
      selectTrack: (i) => {
        const tr = this.radar.tracks[i];
        if (tr) this.radar.selectTrack(tr);
        return !!tr;
      },
      lockSelection: (v) => {
        this.lookLock = v;
      },
      assign: () => this.assign(),
      authorize: () => this.authorize(),
      autoEngage: () => this.autoEngage(),
      autoPilot: () => this.autoPilot(),
      /**
       * Play the scenario headlessly: steps the sim and lets the autopilot make
       * a decision every 0.35 s. Returns the decision histogram.
       */
      autoPlay: (seconds = 90, decisionInterval = 0.35) => {
        const total = Math.round(seconds / FIXED_DT);
        const every = Math.max(1, Math.round(decisionInterval / FIXED_DT));
        const decisions = {};
        for (let i = 0; i < total; i++) {
          this.stepSim(FIXED_DT);
          if (i % every === 0) {
            const d = this.autoPilot();
            decisions[d] = (decisions[d] || 0) + 1;
          }
          if (this.state === 'complete') break;
        }
        return decisions;
      },
      selectBattery: (id) => {
        this._selectBattery(this.batteries.find((x) => x.id === id));
        return true;
      },
      setSetting: (k, v) => {
        this.settings[k] = v;
        if (k === 'reducedMotion') {
          this.player.reducedMotion = v;
          this.post.setReducedMotion(v);
        }
        if (k === 'quality') this._setQuality(v);
        if (k === 'perf') this.settings.perf = v;
        return true;
      },
      hideHud: (v) => {
        this.ui.hud.classList.toggle('hidden', !!v);
      },
      setPostEnabled: (v) => {
        this.post.enabled = v;
      },
      setBloom: (strength, threshold, radius) => {
        if (strength !== undefined) this.post.bloom.strength = strength;
        if (threshold !== undefined) this.post.bloom.threshold = threshold;
        if (radius !== undefined) this.post.bloom.radius = radius;
      },
      debugLight: () => ({
        shadowsEnabled: this.renderer.shadowMap.enabled,
        castShadow: this.weather.sun.castShadow,
        hasShadowMap: !!this.weather.sun.shadow.map,
        sunPos: this.weather.sun.position.toArray(),
        sunTarget: this.weather.sun.target.position.toArray(),
        sunIntensity: this.weather.sun.intensity,
        hemi: this.weather.hemi.intensity,
        envIntensity: this.scene.environmentIntensity,
        exposure: this.renderer.toneMappingExposure,
      }),
      state: () => ({
        state: this.state,
        simTime: this.simTime,
        elapsed: this.elapsed,
        condition: this.conditionId,
        scenario: this.scenarioId,
        selectedBattery: this.selectedBattery.id,
        threatsActive: this.threats.active.length,
        threatStats: { ...this.threats.stats },
        roundStats: { ...this.interceptors.stats },
        tracks: this.radar.tracks.map((t) => ({
          id: t.id,
          altitude: t.altitude,
          range: t.range,
          tti: t.timeToImpact,
          classification: t.classification,
          engaged: t.engaged,
        })),
        interceptors: this.interceptors.active.map((i) => ({
          spec: i.spec.id, phase: i.phase, altitude: i.pos.y, speed: i.vel.length(),
        })),
        batteries: this.batteries.map((b) => ({
          id: b.id, status: b.status, loaded: b.loaded, ammo: b.ammo,
          azimuth: b.azimuth, elevation: b.elevation,
        })),
        results: this.results.slice(),
        assigned: this.assignedTrack ? this.assignedTrack.id : null,
        fps: this.fps,
        draws: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        effects: this.effects.stats,
      }),
      perfProbe: (frames = 120) => {
        // Measure frame cost. gl.finish() forces the driver to complete work so
        // the number reflects real rasterisation, not just queued commands.
        const gl = this.renderer.getContext();
        this._render(FIXED_DT);
        gl.finish();
        const tSim0 = performance.now();
        for (let i = 0; i < frames; i++) this.stepSim(FIXED_DT);
        const simMs = (performance.now() - tSim0) / frames;
        const t0 = performance.now();
        for (let i = 0; i < frames; i++) {
          this._render(FIXED_DT);
        }
        gl.finish();
        const total = performance.now() - t0;
        return {
          frames,
          simMsPerStep: +simMs.toFixed(3),
          renderMsPerFrame: +(total / frames).toFixed(2),
          drawCalls: this.renderer.info.render.calls,
          triangles: this.renderer.info.render.triangles,
          programs: this.renderer.info.programs?.length ?? 0,
        };
      },
    };
    window.__GAME = api;
  }
}

function bearingOf(pos) {
  const b = (Math.atan2(pos.x, -pos.z) * 180) / Math.PI;
  return (b + 360) % 360;
}

function setTimeoutSafe(fn, ms) {
  if (TEST_MODE) return;
  setTimeout(fn, ms);
}

const game = new Game();
window.__gameInstance = game;
try {
  game.init(document.getElementById('app'));
} catch (err) {
  console.error(err);
  const pre = document.createElement('pre');
  pre.style.cssText = 'position:fixed;inset:20px;color:#ff8a72;background:#0a0f0e;padding:16px;overflow:auto;z-index:999;font:12px monospace';
  pre.textContent = 'AEGIS LINE failed to start:\n\n' + (err && err.stack ? err.stack : String(err));
  document.body.appendChild(pre);
}
