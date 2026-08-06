// AEGIS POINT — entry point. Owns the renderer, game state machine,
// engagement rules, input routing and the deterministic test API.
import * as THREE from 'three';
import { RNG } from './rng.js';
import { Bus } from './bus.js';
import { Weather } from './weather.js';
import { Effects } from './effects.js';
import { Base } from './base.js';
import { Batteries } from './batteries.js';
import { Threats, SCENARIOS } from './threats.js';
import { Interceptors } from './interceptors.js';
import { Radar } from './radar.js';
import { GameAudio } from './audio.js';
import { Player } from './player.js';
import { UI } from './ui.js';
import { Post } from './post.js';

const params = new URLSearchParams(location.search);
const TEST_MODE = params.get('test') === '1';
const SEED = parseInt(params.get('seed') || '20260805', 10);

class Game {
  constructor() {
    // ---------- renderer / scene / camera
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.info.autoReset = false; // we reset once per frame to count all passes
    document.getElementById('app').appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.12, 22000);
    camera.position.set(0, 1.7, 0);

    // ---------- shared context
    const ctx = this.ctx = {
      scene, camera, renderer,
      rng: new RNG(SEED),         // gameplay determinism
      vrng: new RNG(999),         // visual-only randomness
      bus: new Bus(),
      colliders: [],
      testMode: TEST_MODE,
    };

    // ---------- modules
    ctx.weather = this.weather = new Weather(ctx);
    ctx.effects = this.effects = new Effects(ctx);
    ctx.base = this.base = new Base(ctx);
    ctx.colliders.push(...this.base.colliders);
    ctx.batteries = this.batteries = new Batteries(ctx);
    ctx.threats = this.threats = new Threats(ctx);
    ctx.interceptors = this.interceptors = new Interceptors(ctx);
    ctx.radar = this.radar = new Radar(ctx);
    ctx.audio = this.audio = new GameAudio(ctx);
    ctx.player = this.player = new Player(ctx);
    this.post = new Post(renderer, scene, camera);

    // in-world console screens show live radar canvases
    const scr = this.base.consoleScreens;
    if (scr.radar) scr.radar.material = new THREE.MeshBasicMaterial({ map: this.radar.texture, toneMapped: false });
    if (scr.status) scr.status.material = new THREE.MeshBasicMaterial({ map: this.radar.statusTexture, toneMapped: false });
    if (scr.map) scr.map.material = new THREE.MeshBasicMaterial({ map: this.radar.mapTexture, toneMapped: false });

    // ---------- game state
    this.mode = 'menu';
    this.consoleMode = false;
    this.selectedBattery = 'patriot';
    this.selectedScenario = 'single';
    this.conditionState = 'GREEN';
    this.log = [];
    this.completeTimer = -1;
    this.aimedTrack = null;
    this.hudTimer = 0;
    this.simTime = 0;
    this.autoEngageOn = false;
    this.autoTimer = 0;
    this.lastScenario = null;

    // ---------- UI
    this.ui = new UI(ctx, {
      onDeploy: () => this.deploy(),
      onStart: () => this.startScenario(this.selectedScenario),
      onSelectTime: (t) => this.setTime(t),
      onSelectScenario: (s) => this.selectScenario(s),
      onSelectBattery: (b) => this.selectBattery(b),
      onAssign: () => this.assign(),
      onAuthorize: () => this.authorize(),
      onRestart: () => this.restart(),
      onExitConsole: () => this.exitConsole(),
      onCloseSummary: () => { this.ui.hideSummary(); },
      onRadarClick: (x, y) => {
        const t = this.radar.pick(x, y);
        if (t) { this.radar.select(t.id); }
      },
      onReducedMotion: (v) => { this.player.reducedMotion = v; },
      onAudioToggle: (v) => this.audio.setEnabled(v),
      onQuality: (q) => this.setQuality(q),
    });
    this.ui.setActive('time-btns', 'time', 'day');
    this.ui.setActive('scenario-btns', 'scenario', this.selectedScenario);
    this.ui.setActive('battery-btns', 'battery', this.selectedBattery);

    this._wireEvents();
    this._wireInput();
    this.prevCondition = 'GREEN';
    this.redAlertCooldown = 0;
    // ambient wind level follows the weather preset
    ctx.bus.on('weather:preset', () => {
      this.audio.setWind(this.weather.wind.length() / 2.6);
    });

    // resize
    const resize = () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
      this.post.setSize(innerWidth, innerHeight);
    };
    window.addEventListener('resize', resize);
    resize();

    // loop
    this.clock = new THREE.Clock();
    this.accum = 0;
    this.fpsEMA = 60;
    renderer.setAnimationLoop(() => this.frame());

    this.ui.clearFade();
    if (TEST_MODE) {
      this.deploy(); // skip menu for deterministic tests
      this._exposeTestAPI();
    }
  }

  // ================================================== state transitions
  deploy() {
    this.mode = 'play';
    this.ui.hideMenu();
    this.player.enabled = true;
    this.audio.start();
    if (!TEST_MODE) document.body.requestPointerLock?.();
    this.ui.setObjective('ENTER THE COMMAND SHELTER — USE THE CONSOLE TO BEGIN');
    this.ui.feed('COBALT MESA ONLINE — ALL BATTERIES STANDING BY', 'info');
  }

  enterConsole() {
    if (this.consoleMode) return;
    this.consoleMode = true;
    this.player.frozen = true;
    if (document.pointerLockElement) document.exitPointerLock();
    this.ui.enterConsole();
    this.ui.setObjective('');
    this.audio.uiBeep(660);
  }

  exitConsole() {
    if (!this.consoleMode) return;
    this.consoleMode = false;
    this.player.frozen = false;
    this.ui.exitConsole();
    if (!TEST_MODE && this.mode === 'play') document.body.requestPointerLock?.();
  }

  setTime(t) {
    this.weather.setPreset(t, false);
    this.ui.setActive('time-btns', 'time', t);
    this.ui.consoleMsg(`CONDITIONS SET: ${t.toUpperCase()}`);
    this.audio.uiBeep();
  }

  selectScenario(s) {
    this.selectedScenario = s;
    this.ui.setActive('scenario-btns', 'scenario', s);
    this.ui.consoleMsg(`SCENARIO: ${SCENARIOS[s].name}`);
    this.audio.uiBeep();
  }

  selectBattery(b) {
    this.selectedBattery = b;
    this.ui.setActive('battery-btns', 'battery', b);
    const bat = this.batteries.get(b);
    this.ui.feed(`BATTERY SELECTED: ${bat.def.name}`, 'info');
    this.audio.uiBeep();
  }

  startScenario(id, reseed = null) {
    if (reseed !== null) this.ctx.rng.reseed(reseed);
    const sc = SCENARIOS[id];
    if (!sc) return;
    if (sc.forcedTime) this.setTime(sc.forcedTime);
    this.ui.hideSummary();
    this.interceptors.clearAll();
    this.radar.reset();
    this.batteries.resetAll();
    this.batteries.deployAll();
    this.threats.startScenario(id);
    this.threats.stats.startSim = this.simTime;
    this.lastScenario = id;
    this.completeTimer = -1;
    this.log = [];
    this.ui.feed(`SCENARIO START: ${sc.name}`, 'warn');
    this.ui.banner('BALLISTIC MISSILE ALERT', 'bad', `${sc.name} — TRACKING COMMENCED`, 3.2);
    this.ui.consoleMsg('LAUNCH DETECTED — BATTERIES DEPLOYING');
    this.ui.setObjective('');
    this.audio.klaxon();
    this._log(`SCENARIO START — ${sc.name}`, 'warn');
  }

  restart() {
    if (this.lastScenario) this.startScenario(this.lastScenario);
    else this.startScenario(this.selectedScenario);
  }

  setQuality(q) {
    this.post.setQuality(q);
    this.effects.quality = q === 'high' ? 1 : q === 'medium' ? 0.7 : 0.45;
    const sun = this.weather.sun;
    if (q === 'low') { sun.castShadow = false; }
    else {
      sun.castShadow = true;
      sun.shadow.mapSize.setScalar(q === 'high' ? 2048 : 1024);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    }
  }

  // ================================================== engagement
  _resolveAssignTarget() {
    // explicit radar selection wins; outdoors fall back to the aimed track
    return this.radar.selected || this.aimedTrack;
  }

  assign() {
    const bat = this.batteries.get(this.selectedBattery);
    const track = this._resolveAssignTarget();
    if (!bat || !track) { this.ui.consoleMsg('NO TRACK SELECTED', true); this.audio.uiDeny(); return false; }
    const chk = bat.engagementCheck(track);
    if (!chk.ok) {
      this.ui.consoleMsg(`${bat.def.short}: ${chk.reason}`, true);
      this.ui.feed(`${bat.def.short} CANNOT ENGAGE ${track.id} — ${chk.reason}`, 'warn');
      this.audio.uiDeny();
      return false;
    }
    bat.assigned = track.id;
    this.ui.feed(`${track.id} ASSIGNED TO ${bat.def.name}`, 'info');
    this.ui.consoleMsg(`${track.id} ASSIGNED — AWAITING AUTHORIZATION`);
    this.audio.uiBeep(990);
    return true;
  }

  authorize() {
    const bat = this.batteries.get(this.selectedBattery);
    if (!bat) return false;
    if (!bat.assigned) { this.ui.consoleMsg('NO ASSIGNMENT — ASSIGN A TRACK FIRST', true); this.audio.uiDeny(); return false; }
    if (!bat.ready) {
      this.ui.consoleMsg(`${bat.def.short} NOT READY — ${bat.state}`, true);
      this.audio.uiDeny();
      return false;
    }
    const track = this.radar.tracks.find(t => t.id === bat.assigned);
    if (!track || !track.threat.alive) {
      this.ui.consoleMsg('TRACK LOST', true);
      bat.assigned = null;
      this.audio.uiDeny();
      return false;
    }
    const chk = bat.engagementCheck(track);
    if (!chk.ok) {
      this.ui.consoleMsg(`${bat.def.short}: ${chk.reason}`, true);
      this.ui.feed(`LAUNCH REFUSED — ${chk.reason}`, 'warn');
      this.audio.uiDeny();
      return false;
    }
    const missile = this.interceptors.fireAt(bat, track.threat);
    if (!missile) { this.ui.consoleMsg('LAUNCHER FAULT', true); this.audio.uiDeny(); return false; }
    track.assignedBy = bat.id;
    bat.assigned = null;
    this.threats.stats.roundsFired++;
    this.ui.feed(`BIRD AWAY — ${bat.def.short} ▶ ${track.id}`, 'good');
    this.ui.consoleMsg(`LAUNCH AUTHORIZED — ${bat.def.short} ENGAGING ${track.id}`);
    this._log(`${bat.def.short} launched at ${track.id}`, 'info');
    return true;
  }

  // simple auto-engagement (demo/tests): assign best battery to every track
  _autoEngage(dt) {
    this.autoTimer -= dt;
    if (this.autoTimer > 0) return;
    this.autoTimer = 0.6;
    for (const track of this.radar.tracks) {
      if (track.assignedBy || track.classification === 'DECOY PROBABLE') continue;
      if (!track.threat.alive) continue;
      // does anyone already fly at it?
      const engaged = this.interceptors.list.some(m => m.target === track.threat);
      if (engaged) continue;
      for (const bat of this.batteries.list) {
        if (!bat.ready) continue;
        const chk = bat.engagementCheck(track);
        if (!chk.ok) continue;
        bat.assigned = track.id;
        this.selectedBattery = bat.id;
        this.authorize();
        break;
      }
    }
  }

  // ================================================== events
  _wireEvents() {
    const bus = this.ctx.bus;
    bus.on('threat:spawn', (t) => {
      this.ui.feed(`RADAR CONTACT — INBOUND BALLISTIC TRACK`, 'warn');
    });
    bus.on('radar:newtrack', (id) => {
      this.ui.feed(`TRACK ESTABLISHED: ${id}`, 'info');
      this._log(`Track ${id} established`, 'info');
    });
    bus.on('interceptor:hit', ({ interceptor, threat }) => {
      const track = interceptor.battery.def.short;
      if (threat.isDecoy) {
        this.ui.banner('DECOY DESTROYED', 'warn', `${threat.id} WAS A DECOY — ROUND EXPENDED`, 3);
        this.ui.feed(`${threat.id} was a DECOY — interceptor wasted`, 'warn');
        this._log(`${threat.id} intercepted — was a decoy`, 'warn');
      } else {
        this.ui.banner('INTERCEPT', 'good', `${threat.id} DESTROYED BY ${interceptor.battery.def.name}`, 2.8);
        this.ui.feed(`SPLASH ${threat.id} — ${track} intercept confirmed`, 'good');
        this._log(`${threat.id} intercepted by ${track}`, 'good');
      }
      this.audio.stinger(true);
      this._clearTrackAssign(threat);
    });
    bus.on('interceptor:miss', ({ interceptor, reason, target }) => {
      this.threats.stats.missed++;
      this.ui.banner('INTERCEPT FAILED', 'warn', reason, 2.6);
      this.ui.feed(`MISS on ${target?.id ?? '??'} — ${reason}`, 'bad');
      this._log(`Miss on ${target?.id ?? '??'} — ${reason}`, 'bad');
      this.audio.stinger(false);
      if (target) this._clearTrackAssign(target);
    });
    bus.on('threat:impact', ({ threat, onBase }) => {
      if (onBase) {
        this.ui.banner('BASE STRUCK', 'bad', `${threat.id} IMPACT INSIDE PERIMETER`, 3.2);
        this.ui.feed(`IMPACT — ${threat.id} struck the base`, 'bad');
        this.ui.damageFlash();
        this.audio.klaxon();
        this._log(`${threat.id} impacted INSIDE the base`, 'bad');
      } else {
        this.ui.feed(`${threat.id} impact outside perimeter`, 'warn');
        this._log(`${threat.id} impacted outside the perimeter`, 'warn');
      }
      this.audio.explosion(threat.pos, 'ground');
      this._clearTrackAssign(threat);
    });
    bus.on('threat:burnout', (t) => {
      this.ui.feed(`${t.id} faded — decoy burnout`, 'info');
      this._log(`${t.id} burned out (decoy)`, 'info');
      this._clearTrackAssign(t);
    });
  }

  _clearTrackAssign(threat) {
    for (const t of this.radar.tracks) if (t.threat === threat) t.assignedBy = null;
    for (const b of this.batteries.list) if (b.assigned === threat.id) b.assigned = null;
  }

  _log(text, cls) {
    this.log.push({ text: `[${this.simTime.toFixed(0).padStart(3, '0')}s] ${text}`, cls });
  }

  // ================================================== input
  _wireInput() {
    window.addEventListener('keydown', (e) => {
      if (this.mode !== 'play') return;
      switch (e.code) {
        case 'KeyE': {
          if (this.consoleMode) { this.exitConsole(); break; }
          const it = this.player.getInteract(this.base.interactables, this.ctx.camera);
          if (it && it.id === 'console') { this.enterConsole(); break; }
          if (this.aimedTrack) {
            this.radar.select(this.aimedTrack.id);
            this.assign();
          }
          break;
        }
        case 'KeyF':
          if (!this.consoleMode) this.authorize();
          break;
        case 'KeyR':
          if (this.threats.scenario || this.lastScenario) this.restart();
          break;
        case 'Digit1': this.selectBattery('patriot'); break;
        case 'Digit2': this.selectBattery('thaad'); break;
        case 'Digit3': this.selectBattery('sentinel'); break;
        case 'KeyG': this.autoEngageOn = !this.autoEngageOn;
          this.ui.feed(`AUTO-ENGAGE ${this.autoEngageOn ? 'ENABLED' : 'DISABLED'}`, 'info');
          break;
        case 'Escape':
          if (this.consoleMode) this.exitConsole();
          break;
      }
    });
    // click to (re)acquire pointer lock
    document.addEventListener('click', (e) => {
      if (TEST_MODE || this.mode !== 'play' || this.consoleMode || this.ui.summaryOpen) return;
      if (e.target.closest('#console-ui') || e.target.closest('#summary')) return;
      if (!document.pointerLockElement) document.body.requestPointerLock?.();
    });
  }

  // ================================================== per-frame
  simStep(dt) {
    this.simTime += dt;
    this.player.update(dt);
    this.threats.update(dt);
    this.interceptors.update(dt);
    this.radar.update(dt);
    this.batteries.update(dt, this.weather.nightFactor);
    this.base.update(dt, this.weather.nightFactor, this.threats.list);
    this.weather.update(dt);
    this.effects.update(dt, this.ctx.camera);
    if (this.autoEngageOn) this._autoEngage(dt);

    // condition state
    const anyTerminal = this.threats.list.some(t => t.alive && t.pos.y < 1600 && !t.isDecoy);
    this.conditionState = !this.threats.scenario ? 'GREEN'
      : anyTerminal ? 'RED'
        : (this.threats.aliveCount + this.threats.pendingCount) > 0 ? 'AMBER' : 'GREEN';
    this.redAlertCooldown -= dt;
    if (this.conditionState === 'RED' && this.prevCondition !== 'RED' && this.redAlertCooldown <= 0) {
      this.redAlertCooldown = 12;
      this.ui.banner('TERMINAL PHASE', 'bad', 'THREAT DESCENDING — ENGAGE NOW', 2.4);
      this.audio.klaxon();
    }
    this.prevCondition = this.conditionState;

    // completion
    if (this.threats.scenario && this.threats.isComplete(this.interceptors.inFlight)) {
      if (this.completeTimer < 0) this.completeTimer = 4.6;
      this.completeTimer -= dt;
      if (this.completeTimer <= 0) {
        const stats = this.threats.stats;
        stats.duration = this.simTime - (stats.startSim ?? this.simTime);
        this.threats.scenario = null;
        this.ui.showSummary(stats, this.log);
        this.audio.stinger(stats.impactsBase === 0);
        this.ui.setObjective('');
      }
    }
  }

  frame() {
    this.ctx.renderer.info.reset();
    const rawDt = Math.min(this.clock.getDelta(), 0.12);
    const dt = TEST_MODE ? 1 / 60 : rawDt;

    if (this.mode === 'play') {
      // fixed-step simulation
      if (TEST_MODE) {
        this.simStep(1 / 60);
      } else {
        this.accum += dt;
        const step = 1 / 60;
        let n = 0;
        while (this.accum >= step && n < 5) {
          this.simStep(step);
          this.accum -= step;
          n++;
        }
      }
    } else {
      // menu: advance ambient world slowly
      this.weather.update(dt);
      this.base.update(dt, this.weather.nightFactor, []);
      this.effects.update(dt, this.ctx.camera);
    }

    // camera
    if (this.freeCam) {
      this.ctx.camera.position.set(this.freeCam.x, this.freeCam.y, this.freeCam.z);
      this.ctx.camera.lookAt(this.freeCam.tx, this.freeCam.ty, this.freeCam.tz);
    } else {
      this.player.applyCamera(this.ctx.camera, this.simTime);
    }

    // outdoor aim-target detection
    this.aimedTrack = null;
    if (this.mode === 'play' && !this.consoleMode) {
      const cam = this.ctx.camera;
      const fwd = new THREE.Vector3();
      cam.getWorldDirection(fwd);
      let bestDot = 0.9986; // ~3 deg
      for (const t of this.radar.tracks) {
        const to = new THREE.Vector3().copy(t.threat.pos).sub(cam.position).normalize();
        const d = to.dot(fwd);
        if (d > bestDot) { bestDot = d; this.aimedTrack = t; }
      }
    }

    // HUD
    this.hudTimer -= dt;
    if (this.hudTimer <= 0 && this.mode === 'play') {
      this.hudTimer = 0.1;
      this.ui.updateHUD(this);
      // interact prompt
      const it = this.consoleMode ? null : this.player.getInteract(this.base.interactables, this.ctx.camera);
      if (it) this.ui.showInteract(it.label); else this.ui.hideInteract();
      // objective hint cleanup once console used
      if (this.consoleMode || this.threats.scenario) this.ui.setObjective('');
    }
    if (this.mode === 'play') {
      this.ui.updateMarkers(this.ctx.camera, this);
      if (this.aimedTrack) {
        const bat = this.batteries.get(this.selectedBattery);
        this.ui.showTargetPrompt(this.aimedTrack, bat ? bat.engagementCheck(this.aimedTrack) : null, bat ? bat.def.short : '');
      } else {
        this.ui.hideTargetPrompt();
      }
    }

    // light tint for smoke sprites
    const tint = this.weather.sun.color.clone().multiplyScalar(0.35 + this.weather.sun.intensity * 0.16);
    tint.add(this.weather.hemi.color.clone().multiplyScalar(0.4));
    this.effects.setLightTint(tint);

    // positional generator hum
    this.audio.updateProximity(this.player.pos, this.base.gensetPositions);

    this.post.update(rawDt, this.weather, this.weather.nightFactor);
    this.post.render();
    // capture render stats right after the frame is drawn
    const info = this.ctx.renderer.info.render;
    this.lastDrawCalls = info.calls;
    this.lastTriangles = info.triangles;

    const fps = 1 / Math.max(rawDt, 1e-4);
    this.fpsEMA = this.fpsEMA * 0.95 + fps * 0.05;
  }

  // ================================================== test API
  _exposeTestAPI() {
    const self = this;
    window.__game = {
      ready: true,
      version: 1,
      state() {
        return {
          mode: self.mode,
          console: self.consoleMode,
          scenario: self.threats.scenario ? self.threats.scenario.id : null,
          threats: self.threats.aliveCount,
          pending: self.threats.pendingCount,
          tracks: self.radar.tracks.map(t => ({
            id: t.id, cls: t.classification, alt: Math.round(t.est.y),
            assignedBy: t.assignedBy,
          })),
          birds: self.interceptors.inFlight,
          batteries: self.batteries.list.map(b => b.status()),
          selectedBattery: self.selectedBattery,
          condition: self.conditionState,
          stats: self.threats.stats,
          summaryOpen: self.ui.summaryOpen,
          log: self.log.slice(-10),
          fps: Math.round(self.fpsEMA),
          drawCalls: self.lastDrawCalls || 0, triangles: self.lastTriangles || 0,
          player: { x: +self.player.pos.x.toFixed(2), y: +self.player.pos.y.toFixed(2), z: +self.player.pos.z.toFixed(2) },
          time: +self.simTime.toFixed(2),
          birdPositions: self.interceptors.list.map(m => ({
            x: +m.pos.x.toFixed(1), y: +m.pos.y.toFixed(1), z: +m.pos.z.toFixed(1),
            state: m.state,
            tx: m.target ? +m.target.pos.x.toFixed(1) : 0,
            ty: m.target ? +m.target.pos.y.toFixed(1) : 0,
            tz: m.target ? +m.target.pos.z.toFixed(1) : 0,
          })),
          threatPositions: self.threats.list.filter(t => t.alive).map(t => ({
            id: t.id, x: +t.pos.x.toFixed(1), y: +t.pos.y.toFixed(1), z: +t.pos.z.toFixed(1),
          })),
        };
      },
      step(seconds = 1) {
        const n = Math.round(seconds * 60);
        for (let i = 0; i < n; i++) self.simStep(1 / 60);
        return window.__game.state();
      },
      startScenario(id, seed = null) { self.startScenario(id, seed); return true; },
      setTime(t) { self.weather.setPreset(t, true); return true; },
      selectBattery(id) { self.selectBattery(id); return true; },
      selectTrack(id) {
        const t = id ? self.radar.tracks.find(t => t.id === id) : self.radar.tracks[0];
        if (t) self.radar.select(t.id);
        return !!t;
      },
      assign() { return self.assign(); },
      authorize() { return self.authorize(); },
      autoEngage(on) { self.autoEngageOn = on; return on; },
      enterConsole() { self.enterConsole(); return true; },
      exitConsole() { self.exitConsole(); return true; },
      restart() { self.restart(); return true; },
      teleport(x, y, z, yaw = 0, pitch = 0) { self.player.teleport(x, y, z, yaw, pitch); return true; },
      flyCam(x, y, z, tx, ty, tz) { self.freeCam = { x, y, z, tx, ty, tz }; return true; },
      clearFlyCam() { self.freeCam = null; return true; },
      deployBatteries() { self.batteries.deployAll(); return true; },
      closeSummary() { self.ui.hideSummary(); return true; },
      lookAt(x, y, z) {
        const cam = self.ctx.camera;
        const dx = x - cam.position.x, dy = y - cam.position.y, dz = z - cam.position.z;
        self.player.yaw = Math.atan2(-dx, -dz);
        self.player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
        return true;
      },
      hideHud(hide) {
        document.getElementById('hud').style.visibility = hide ? 'hidden' : 'visible';
        return true;
      },
      setQuality(q) { self.setQuality(q); return true; },
      weatherPreset() { return self.weather.presetName; },
    };
  }
}

new Game();
