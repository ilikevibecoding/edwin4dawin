import * as THREE from 'three';
import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { AudioEngine } from './core/audio.js';
import { ColliderSet, NavGrid, clamp } from './core/math.js';
import { getMaterialLib } from './world/textures.js';
import { createAtmosphere } from './world/sky.js';
import { buildMap } from './world/map.js';
import { FX } from './fx/particles.js';
import { DecalSystem } from './fx/decals.js';
import { TracerSystem, CasingSystem } from './fx/tracers.js';
import { ExplosionSystem } from './fx/explosions.js';
import { Player } from './player/player.js';
import { WeaponSystem } from './weapons/weapons.js';
import { EnemyManager } from './ai/enemies.js';
import { AirstrikeSystem } from './killstreaks/airstrike.js';
import { HUD } from './ui/hud.js';
import { MenuSystem } from './ui/menu.js';
import { PhotoDirector } from './photo/photomode.js';

const params = new URLSearchParams(location.search);
const PHOTO = params.get('photo');

class Game {
  constructor() {
    this.state = 'loading';
    this.canvas = document.getElementById('game-canvas');
    this.time = 0;
    this.kills = 0;
    this.killsThisLife = 0;
    this.score = 0;
    this.uavReady = false;
    this.uavTimer = 0;
    this.menuCamT = 0;
  }

  async init() {
    const loaderFill = document.getElementById('loader-fill');
    const loaderTip = document.getElementById('loader-tip');
    const step = async (pct, tip) => {
      loaderFill.style.width = pct + '%';
      loaderTip.textContent = tip;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    };

    await step(6, 'INITIALIZING RENDERER...');
    const quality = params.get('q') ?? 'high';
    this.engine = new Engine(this.canvas, quality);
    this.scene = this.engine.scene;
    this.camera = this.engine.camera;

    await step(16, 'COMPILING SURFACE SHADERS...');
    getMaterialLib();

    await step(30, 'BUILDING ATMOSPHERICS...');
    this.atmosphere = createAtmosphere(this.scene, this.engine.renderer, quality);

    await step(46, 'CONSTRUCTING DUST LINE...');
    this.colliders = new ColliderSet();
    this.map = buildMap(this.scene, this.colliders);

    await step(62, 'BAKING NAVIGATION MESH...');
    this.nav = new NavGrid(this.map.halfSize, 1.0);
    this.nav.bake(this.colliders, 0.45);

    await step(72, 'LOADING COMBAT SYSTEMS...');
    this.audio = new AudioEngine();
    this.input = new Input(this.canvas);
    this.hud = new HUD(this.camera);
    this.hud.buildMinimap(this.map.minimapShapes, this.map.halfSize);
    this.fx = new FX(this.scene, quality);
    this.decals = new DecalSystem(this.scene);
    this.tracers = new TracerSystem(this.scene);
    this.casings = new CasingSystem(this.scene);
    this.casings.onBounce = () => this.audio.casing();
    this.explosions = new ExplosionSystem(this.scene, this.fx, this.decals);

    await step(82, 'DEPLOYING OPERATOR...');
    this.player = new Player({ camera: this.camera, input: this.input, colliders: this.colliders, audio: this.audio, hud: this.hud });
    this.player.onDeath = () => this.onPlayerDeath();

    this.enemies = new EnemyManager({
      scene: this.scene, colliders: this.colliders, nav: this.nav,
      fx: this.fx, decals: this.decals, tracers: this.tracers, audio: this.audio,
      coverPoints: this.map.coverPoints, spawnPoints: this.map.enemySpawns,
    });
    this.enemies.onKill = (e) => this.onKill(e);
    this.enemies.onPlayerHit = (dmg, fromPos) => this.player.takeDamage(dmg, fromPos);
    this.enemies.getPlayerSpeed = () => this.player.moveFrac;
    this.enemies.onWave = (n, count) => {
      this.hud.waveBanner(`WAVE ${n}`, 'HOSTILES INBOUND');
      this.audio.radio();
    };
    this.enemies.playerWeaponLabel = () => (this.weapons.current === 'rifle' ? 'M4A1' : 'P320');

    this.weapons = new WeaponSystem({
      camera: this.camera, scene: this.scene, colliders: this.colliders,
      fx: this.fx, decals: this.decals, tracers: this.tracers, casings: this.casings,
      explosions: this.explosions, audio: this.audio, hud: this.hud,
      enemies: this.enemies,
      onRecoil: (p, y) => this.player.applyRecoil(p, y),
    });
    this.weapons.onExplosionDamage = (pos, radius, dmg) => {
      this.enemies.damageInRadius(pos, radius, dmg, true, 'FRAG');
      const d = pos.distanceTo(this.player.pos);
      if (d < radius * 0.8) this.player.takeDamage(Math.max(8, dmg * (1 - d / radius) * 0.5), pos);
    };

    this.fx.onShake = (pos, strength) => {
      const d = pos.distanceTo(this.player.pos);
      const prox = clamp(1 - d / 55, 0, 1);
      this.player.addShake(strength * prox * 0.035);
      if (d < 40) {
        // Asymmetric first-frame kick toward the blast + overpressure grade pulse
        this.player.blastKick(strength * prox);
        this.engine.blastPulse(clamp(strength * prox * 0.75, 0, 0.9));
      }
    };

    await step(92, 'ARMING CAS-9 STRIKE PACKAGE...');
    this.airstrike = new AirstrikeSystem({
      scene: this.scene, fx: this.fx, explosions: this.explosions, decals: this.decals,
      audio: this.audio, enemies: this.enemies, hud: this.hud,
      getPlayerPos: () => this.player.pos,
      onPlayerDamage: (dmg, pos) => this.player.takeDamage(dmg, pos),
      minimapShapes: this.map.minimapShapes, halfSize: this.map.halfSize,
    });
    this.airstrike.onClose = (confirmed) => {
      if (this.state === 'playing') this.input.requestLock();
      if (confirmed) this.hud.strikeMarker = this.airstrike.target.clone();
      this.updateStreakHud();
    };
    this.airstrike.onKillsScored = () => {};

    this.menu = new MenuSystem({
      audio: this.audio,
      onDeploy: () => this.deploy(),
      onResume: () => this.resume(),
      onQuit: () => this.showMenu(),
      onSettings: (s) => {
        this.player.sensitivity = s.sensitivity;
        this.player.baseFov = s.fov;
        this.engine.setQuality(s.quality);
      },
    });

    this._bindInput();

    await step(100, 'UPLINK ESTABLISHED');
    document.getElementById('loader').classList.add('done');

    if (PHOTO) {
      window.__PHOTO_MODE = true;
      this.photo = new PhotoDirector(this, PHOTO);
    } else {
      this.showMenu();
    }

    this._loop();
  }

  _bindInput() {
    this.input.onFireDown = () => { if (this.state === 'playing') this.weapons.onTriggerDown(); };
    this.input.onFireUp = () => this.weapons.onTriggerUp();
    this.input.onAdsDown = () => { if (this.state === 'playing') this.weapons.wantAds = true; };
    this.input.onAdsUp = () => { this.weapons.wantAds = false; };
    this.input.onKeyDown = (code) => {
      if (this.state !== 'playing') return;
      switch (code) {
        case 'KeyR': this.weapons.reload(); break;
        case 'Digit1': this.weapons.switchWeapon('rifle'); break;
        case 'Digit2': this.weapons.switchWeapon('pistol'); break;
        case 'KeyG': this.weapons.throwGrenade(); break;
        case 'Digit3': this.activateUAV(); break;
        case 'Digit4': this.tryAirstrike(); break;
        case 'KeyQ': if (this.airstrike.state === 'targeting') { this.airstrike.cancelTargeting(); } break;
      }
    };
    this.input.onLockChange = (locked) => {
      if (!locked && this.state === 'playing' && this.airstrike.state !== 'targeting') {
        this.pause();
      }
    };
    this.canvas.addEventListener('mousedown', () => {
      if (this.state === 'playing' && !this.input.locked && this.airstrike.state !== 'targeting') {
        this.input.requestLock();
      }
    });
  }

  /* ------------------------------ states ------------------------------ */

  showMenu() {
    this.state = 'menu';
    this.input.exitLock();
    this.hud.hide();
    this.menu.show('main');
    document.getElementById('tablet').classList.add('hidden');
    this.weapons.root.visible = false;
    if (!this.menuFill) {
      this.menuFill = new THREE.HemisphereLight(0xcfd9e4, 0x6b5a42, 0.4);
      this.scene.add(this.menuFill);
    }
    this.menuFill.visible = true;
  }

  deploy() {
    this.menu.hideAll();
    this.hud.show();
    this.state = 'playing';
    this.audio.ensure();
    this.input.requestLock();
    this.weapons.root.visible = true;
    if (this.menuFill) this.menuFill.visible = false;

    // Reset world
    for (const e of [...this.enemies.enemies]) this.enemies.removeEnemy(e);
    this.player.spawnAt(this.map.playerSpawn.pos.clone(), this.map.playerSpawn.yaw);
    this.hud.setHealth(1);
    this.kills = 0;
    this.killsThisLife = 0;
    this.uavReady = false;
    this.uavTimer = 0;
    this.hud.uavActive = false;
    this.hud.strikeMarker = null;
    this.airstrike.charges = 1;
    this.enemies.frozen = false;
    this.enemies.waveBreakT = 2.5;
    this.enemies.startWave(1);
    this.updateStreakHud();
    this.hud.centerMessage('AIR STRIKE READY — PRESS [4]', 3.2);
    this.hud.setObjective('ELIMINATE ALL HOSTILES');
  }

  deployForPhoto() {
    this.menu.hideAll();
    this.hud.show();
    this.state = 'playing';
    this.player.spawnAt(this.map.playerSpawn.pos.clone(), this.map.playerSpawn.yaw);
    this.hud.setHealth(1);
    this.airstrike.charges = 2;
    this.enemies.wave = 1;
    this.weapons.root.visible = true;
    if (this.menuFill) this.menuFill.visible = false;
    this.updateStreakHud();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.menu.show('pause');
  }

  resume() {
    this.menu.hideAll();
    this.state = 'playing';
    this.input.requestLock();
  }

  onPlayerDeath() {
    this.state = 'dead';
    this.input.exitLock();
    this.weapons.onTriggerUp();
    this.menu.showDeath(`SGT. VANCE WAS KILLED IN ACTION — WAVE ${this.enemies.wave}`);
  }

  /* --------------------------- killstreaks ---------------------------- */

  onKill(enemy) {
    this.kills++;
    this.killsThisLife++;
    const headshot = enemy.killCause === 'HEADSHOT';
    this.score += 100;
    this.hud.scorePopup(100, null);
    this.hud.killfeed('VANCE', enemy.name, false, enemy.killCause ?? 'M4A1');

    if (this.killsThisLife === 4 && !this.uavReady) {
      this.uavReady = true;
      this.audio.killstreakReady();
      this.hud.centerMessage('UAV READY — PRESS [3]', 2.4);
    }
    if (this.killsThisLife >= 7) {
      this.killsThisLife = 0;
      this.airstrike.charges++;
      this.audio.killstreakReady();
      this.hud.centerMessage('AIR STRIKE READY — PRESS [4]', 2.6);
    }
    this.updateStreakHud();
    void headshot;
  }

  updateStreakHud() {
    this.hud.setStreaks(this.killsThisLife, this.uavReady, this.airstrike.charges > 0);
  }

  activateUAV() {
    if (!this.uavReady) return;
    this.uavReady = false;
    this.uavTimer = 24;
    this.hud.uavActive = true;
    this.audio.radio();
    this.hud.centerMessage('UAV ONLINE — ENEMIES REVEALED', 2.2);
    this.hud.killfeed('OVERLORD', 'UAV SWEEP ACTIVE', true);
    this.updateStreakHud();
  }

  tryAirstrike() {
    if (this.airstrike.state === 'targeting') return;
    if (!this.airstrike.ready) {
      this.audio.dryFire();
      return;
    }
    this.input.exitLock();
    this.airstrike.openTargeting();
  }

  /* ------------------------------- loop -------------------------------- */

  _loop() {
    let last = performance.now();
    const tick = () => {
      requestAnimationFrame(tick);
      if (this.photo) {
        // Batch sim steps without rendering; render only near the capture
        // frame so software GL captures stay fast. Once the capture frame is
        // rendered, STOP re-rendering: on SwiftShader a heavy frame can take
        // >30s, and continuous re-renders starve Playwright's screenshot of
        // an idle compositor slot.
        if (window.__PHOTO_READY) return;
        const BATCH = 30;
        let n = 0;
        while (!this.photo.done && n++ < BATCH) {
          this.time += 1 / 60;
          this.update(1 / 60);
          this.photo.frame();
        }
        this.engine.render(this.time);
        if (this.photo.done) window.__PHOTO_READY = true;
        return;
      }
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.time += dt;
      this.update(dt);
      this.engine.render(this.time);
    };
    tick();
  }

  update(dt) {
    const t = this.time;

    if (this.state === 'menu') {
      // Street-level art-directed dolly down the market corridor
      this.menuCamT += dt;
      const a = this.menuCamT * 0.03;
      this.camera.position.set(-26 + Math.sin(a) * 2.5, 2.7, 4.6 + Math.cos(a * 0.7) * 0.8);
      this.camera.lookAt(30, 3.4, -2);
      this.camera.rotation.z += Math.sin(this.menuCamT * 0.2) * 0.008;
    }

    const playing = this.state === 'playing';
    if (playing) {
      const targeting = this.airstrike.state === 'targeting';
      this.player.sprintBlock = this.weapons.triggerHeld || this.weapons.reloadT >= 0;
      this.player.adsFrac = this.weapons.adsFrac;
      this.player.update(dt, !targeting);
      this.weapons.update(dt, {
        speed: this.player.moveFrac,
        sprinting: this.player.sprinting,
        sprintFrac: this.player.sprintFrac,
        grounded: this.player.grounded,
        lookDX: this.player.lookDX,
        lookDY: this.player.lookDY,
      });
      this.enemies.update(dt, this.player.pos, t);
      this.hud.updateCompass(this.player.yaw);
      this.hud.updateMinimap(this.player.pos, this.player.yaw, this.enemies.enemies);

      if (this.uavTimer > 0) {
        this.uavTimer -= dt;
        if (this.uavTimer <= 0) this.hud.uavActive = false;
      }

      const remaining = this.enemies.aliveCount + this.enemies.pendingSpawns;
      this.hud.setObjective(`WAVE ${this.enemies.wave} — ${remaining} HOSTILE${remaining === 1 ? '' : 'S'} REMAINING`);
    }

    // World FX always tick (menus show the live scene)
    this.airstrike.update(dt);
    this.fx.update(dt, t);
    this.tracers.update(dt);
    this.casings.update(dt);
    this.explosions.update(dt);
    this.atmosphere.update(t, this.camera.position);
  }
}

const game = new Game();
game.init().catch((err) => {
  console.error(err);
  window.__PHOTO_FAIL = String(err && err.stack || err);
  const tip = document.getElementById('loader-tip');
  if (tip) tip.textContent = 'BOOT FAILURE: ' + err.message;
});
window.__game = game;
