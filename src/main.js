import * as THREE from 'three';
import './style.css';
import { RNG, formatTime } from './utils.js';
import { BOT_COUNT, MATERIALS, HALF } from './config.js';
import { World } from './physics.js';
import { generateWorld, createChest, createAmmoBox, WATER_Y } from './world.js';
import { Player } from './player.js';
import { Combat } from './combat.js';
import { Building } from './building.js';
import { BotManager } from './bots.js';
import { Storm } from './storm.js';
import { LootSystem, rollFloorLoot } from './loot.js';
import { Effects } from './effects.js';
import { HUD } from './hud.js';
import { AudioSys } from './audio.js';
import { Input } from './input.js';

class Game {
  constructor() {
    const params = new URLSearchParams(location.search);
    this.seed = parseInt(params.get('seed'), 10) || ((Math.random() * 1e9) | 0);
    this.rng = new RNG((this.seed ^ 0x9e3779b9) >>> 0);
    this.debug = params.get('debug') === '1';
    this.time = 0;
    this.state = 'menu';
    this.paused = false;
    this.startTime = 0;

    this.canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.shadows = params.get('shadows') !== '0';
    this.renderer.shadowMap.enabled = this.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9fcfff);
    this.scene.fog = new THREE.Fog(0xa9d3ff, 180, 720);
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1600);
    this.buildSky();
    this.buildLights();

    this.audio = new AudioSys();
    this.input = new Input(this.canvas);

    // ---- world ----
    const gen = generateWorld(this.seed);
    this.terrain = gen.terrain;
    this.towns = gen.towns;
    this.mapImage = gen.mapImage;
    this.world = new World((x, z) => Math.max(this.terrain.heightAt(x, z), WATER_Y - 0.9));
    this.scene.add(gen.terrainMesh, gen.waterMesh);

    this.effects = new Effects(this.scene, this.camera);
    this.hud = new HUD(this);
    this.loot = new LootSystem(this);
    this.building = new Building(this);
    for (const s of gen.structures) this.building.addStructure(s);
    for (const p of gen.props) {
      this.world.addSolid(p);
      this.scene.add(p.mesh);
      p.mesh.updateMatrixWorld(true);
    }
    for (const c of gen.containers) {
      const solid = c.type === 'chest' ? createChest(c.x, c.y, c.z, c.yaw) : createAmmoBox(c.x, c.y, c.z, c.yaw);
      this.world.addSolid(solid);
      this.scene.add(solid.mesh);
      solid.mesh.updateMatrixWorld(true);
      this.loot.addContainer(solid);
    }
    for (const f of gen.floorLoot) this.loot.spawnPickup(rollFloorLoot(this.rng), f.x, f.y, f.z);

    this.player = new Player(this);
    this.combat = new Combat(this);
    this.bots = new BotManager(this);
    this.bots.spawnAll(gen.botSpawns, BOT_COUNT);
    this.storm = new Storm(this);

    this.setupUI();
    window.addEventListener('resize', () => this.onResize());

    this.last = performance.now();
    this.frameTimes = [];
    this.menuAngle = 0;
    requestAnimationFrame((t) => this.loop(t));
  }

  buildSky() {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#2f7fdc');
    g.addColorStop(0.45, '#7fb8f5');
    g.addColorStop(0.62, '#cfe6ff');
    g.addColorStop(1, '#d9e8ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1400, 24, 12),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false }),
    );
    sky.renderOrder = -10;
    this.sky = sky;
    this.scene.add(sky);
  }

  buildLights() {
    const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5f6f45, 0.75);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.9);
    sun.position.set(80, 120, 50);
    sun.castShadow = this.shadows;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -70;
    sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70;
    sun.shadow.camera.bottom = -70;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    this.sun = sun;
    this.scene.add(sun);
    this.scene.add(sun.target);
    const ambient = new THREE.AmbientLight(0xffffff, 0.15);
    this.scene.add(ambient);
  }

  setShadows(on) {
    if (this.shadows === on) return;
    this.shadows = on;
    this.renderer.shadowMap.enabled = on;
    this.sun.castShadow = on;
    this.scene.traverse((o) => {
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m.needsUpdate = true;
      }
    });
  }

  setupUI() {
    const hud = this.hud;
    hud.setupDropMap();
    document.getElementById('btn-drop').addEventListener('click', () => this.start());
    document.getElementById('btn-resume').addEventListener('click', () => this.resume());
    document.getElementById('btn-again').addEventListener('click', () => {
      const url = new URL(location.href);
      url.searchParams.delete('seed');
      location.href = url.toString();
    });
    this.canvas.addEventListener('click', () => {
      if ((this.state === 'drop' || this.state === 'play') && !this.input.locked) this.resume();
    });
    this.input.onLockChange = (locked) => {
      if (!locked && (this.state === 'drop' || this.state === 'play')) {
        this.paused = true;
        hud.el.pause.classList.remove('hidden');
      } else if (locked) {
        this.paused = false;
        hud.el.pause.classList.add('hidden');
      }
    };
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && (this.state === 'play' || this.state === 'drop')) hud.toggleBigMap();
    });
  }

  randomLandPoint() {
    for (let i = 0; i < 200; i++) {
      const x = this.rng.range(-250, 250);
      const z = this.rng.range(-250, 250);
      if (this.terrain.heightAt(x, z) > WATER_Y + 2) return { x, z };
    }
    return { x: 0, z: 0 };
  }

  start() {
    this.audio.ensure();
    const dp = this.hud.dropPoint || this.randomLandPoint();
    this.hud.dropPoint = dp;
    this.player.startDrop(dp.x, dp.z);
    this.state = 'drop';
    this.startTime = this.time;
    this.hud.el.menu.classList.add('hidden');
    this.hud.show();
    this.input.requestLock();
    this.hud.announce('DROP IN', 'Steer with WASD · SPACE opens the glider early', 3.2);
    this.hud.killFeed(`${BOT_COUNT + 1} players have entered the island`);
  }

  resume() {
    this.audio.ensure();
    this.input.requestLock();
  }

  onLanded() {
    if (this.state === 'drop') {
      this.state = 'play';
      this.hud.announce('LOOT UP', 'Open chests, harvest materials and stay inside the circle', 3);
    }
  }

  onPlayerDeath(source, kind) {
    if (this.state !== 'play' && this.state !== 'drop') return;
    this.state = 'over';
    const killer = source ? source.name : kind === 'storm' ? 'the storm' : null;
    this.hud.killFeed(killer ? `You were eliminated by ${killer}` : 'You were eliminated', 'death');
    this.audio.play('defeat');
    this.player.mode = 'combat';
    this.building.ghost.group.visible = false;
    this.player.char.parts.torso.rotation.x = Math.PI / 2;
    this.player.char.group.position.y += 0.4;
    const placement = this.bots.aliveCount + 1;
    setTimeout(() => {
      document.exitPointerLock?.();
      this.hud.toggleBigMap(false);
      this.hud.showGameOver(false, placement, this.stats(killer));
    }, 1800);
  }

  checkVictory() {
    if (this.state !== 'play' || !this.player.alive) return;
    if (this.bots.aliveCount > 0) return;
    this.state = 'over';
    this.audio.play('victory');
    this.hud.announce('VICTORY', 'Last one standing', 5);
    this.effects.burst(this.player.pos.clone().setY(this.player.pos.y + 2.5), 0xffd23f, 80, 6, 4, 1.6);
    setTimeout(() => {
      document.exitPointerLock?.();
      this.hud.toggleBigMap(false);
      this.hud.showGameOver(true, 1, this.stats(null));
    }, 2600);
  }

  stats(killer) {
    return {
      kills: this.player.kills,
      damage: this.player.damageDealt,
      built: this.building.builtCount,
      time: formatTime(this.time - this.startTime),
      killer,
    };
  }

  // ---------- solids ----------

  damageSolid(solid, dmg, source, point) {
    if (!solid || solid.hp === Infinity || !this.world.solids.has(solid)) return;
    solid.hp -= dmg;
    if (solid.hp <= 0) this.destroySolid(solid, 'destroyed', true);
  }

  destroySolid(solid, cause, checkSupport = true) {
    if (!this.world.solids.has(solid)) return;
    const neighbors = solid.kind === 'structure' && checkSupport ? this.building.neighbors(solid) : [];
    if (solid.kind === 'structure') this.building.removeStructure(solid);
    else {
      this.world.removeSolid(solid);
      this.scene.remove(solid.mesh);
    }
    const b = solid.bounds;
    const center = new THREE.Vector3((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, (b.minZ + b.maxZ) / 2);
    const color = solid.material ? MATERIALS[solid.material].color : 0x999999;
    const dist = center.distanceTo(this.player.pos);
    if (dist < 120) {
      this.effects.burst(center, color, solid.kind === 'prop' ? 22 : 16, 4.5, 9, 0.8);
      this.audio.play('destroy', Math.max(0.1, 1 - dist / 120));
    }
    if (neighbors.length) this.building.checkSupport(neighbors);
  }

  // ---------- loop ----------

  onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  updateSun() {
    const p = this.player.pos;
    this.sun.position.set(p.x + 80, p.y + 120, p.z + 50);
    this.sun.target.position.set(p.x, p.y, p.z);
    this.sun.target.updateMatrixWorld();
    this.sky.position.set(p.x, 0, p.z);
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    if (dt <= 0) dt = 0.001;

    if (this.state === 'menu') {
      this.menuAngle += dt * 0.08;
      const r = 300;
      this.camera.position.set(Math.cos(this.menuAngle) * r, 150, Math.sin(this.menuAngle) * r);
      this.camera.lookAt(0, 10, 0);
      this.sky.position.set(0, 0, 0);
      this.sun.position.set(80, 120, 50);
      this.effects.update(dt);
      this.renderer.render(this.scene, this.camera);
      this.input.endFrame();
      return;
    }

    if (this.paused) {
      this.renderer.render(this.scene, this.camera);
      this.input.endFrame();
      return;
    }

    this.time += dt;
    const input = this.input;
    this.player.update(dt, input);
    this.building.update(dt, input);
    this.combat.update(dt, input);
    this.bots.update(dt);
    this.storm.update(dt);
    this.loot.update(dt, this.player);
    this.effects.update(dt);
    this.updateSun();
    this.hud.update(dt);
    if (this.debug) this.hud.el.storm.textContent += `  |  ${Math.round(1 / dt)} fps`;

    this.renderer.render(this.scene, this.camera);
    input.endFrame();

    // auto-disable shadows on weak machines
    if (this.shadows) {
      this.frameTimes.push(dt);
      if (this.frameTimes.length >= 90) {
        const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        this.frameTimes.length = 0;
        if (avg > 0.045) this.setShadows(false);
      }
    }
  }
}

function showFatal(msg) {
  let el = document.getElementById('fatal');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fatal';
    el.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:100;background:#b3122e;color:#fff;font:13px monospace;padding:8px 12px;white-space:pre-wrap';
    document.body.appendChild(el);
  }
  el.textContent = `Error: ${msg}`;
}
window.addEventListener('error', (e) => showFatal(e.message));
window.addEventListener('unhandledrejection', (e) => showFatal(e.reason && e.reason.message ? e.reason.message : String(e.reason)));

window.game = new Game();
