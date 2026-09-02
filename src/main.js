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
import { InstanceRegistry } from './instancing.js';

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
    this.maxPixelScale = Math.min(window.devicePixelRatio || 1, 1.5);
    this.pixelScale = this.maxPixelScale;
    this.renderer.setPixelRatio(this.pixelScale);
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
    if (params.get('mute') === '1') this.audio.enabled = false;
    this.input = new Input(this.canvas);
    if (params.get('rawmouse') === '0') this.input.rawMouse = false;

    // ---- world ----
    const gen = generateWorld(this.seed);
    this.terrain = gen.terrain;
    this.towns = gen.towns;
    this.mapImage = gen.mapImage;
    this.world = new World((x, z) => Math.max(this.terrain.heightAt(x, z), WATER_Y - 0.9));
    this.scene.add(gen.terrainMesh, gen.waterMesh);

    this.instances = new InstanceRegistry(this.scene, this.world);
    this.effects = new Effects(this.scene, this.camera);
    this.hud = new HUD(this);
    this.loot = new LootSystem(this);
    this.building = new Building(this);
    for (const s of gen.structures) this.building.addStructure(s);
    for (const p of gen.props) this.spawnSolid(p);
    for (const c of gen.containers) {
      const solid = c.type === 'chest' ? createChest(c.x, c.y, c.z, c.yaw) : createAmmoBox(c.x, c.y, c.z, c.yaw);
      this.spawnSolid(solid);
      this.loot.addContainer(solid);
    }
    this.cullables = this.loot.containers.map((c) => c.mesh);
    this.cullTimer = 0;
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
    this.menuTown = this.towns.slice().sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z))[0];
    requestAnimationFrame((t) => this.loop(t));
  }

  buildSky() {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 256;
    const ctx = c.getContext('2d', { willReadFrequently: true });
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
    this.input.onUnlockedClick = () => {
      if (this.state === 'drop' || this.state === 'play') this.resume();
    };
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

  /** Registers a solid for collision/raycasts and shows it (instanced parts or a regular mesh). */
  spawnSolid(solid) {
    this.world.addSolid(solid);
    if (solid.parts) this.instances.addSolid(solid);
    if (solid.mesh) {
      this.scene.add(solid.mesh);
      solid.mesh.updateMatrixWorld(true);
    }
    return solid;
  }

  despawnSolid(solid) {
    this.world.removeSolid(solid);
    if (solid.parts) this.instances.removeSolid(solid);
    if (solid.mesh) this.scene.remove(solid.mesh);
  }

  damageSolid(solid, dmg, source, point) {
    if (!solid || solid.hp === Infinity || !this.world.solids.has(solid)) return;
    solid.hp -= dmg;
    if (solid.hp <= 0) this.destroySolid(solid, 'destroyed', true);
  }

  destroySolid(solid, cause, checkSupport = true) {
    if (!this.world.solids.has(solid)) return;
    const neighbors = solid.kind === 'structure' && checkSupport ? this.building.neighbors(solid) : [];
    if (solid.kind === 'structure') this.building.removeStructure(solid);
    else this.despawnSolid(solid);
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

  /** Hides small far-away objects (they are lost in the fog anyway) to save draw calls. */
  updateCulling(dt) {
    this.cullTimer -= dt;
    if (this.cullTimer > 0) return;
    this.cullTimer = 0.4;
    const cp = this.camera.position;
    for (const c of this.loot.containers) {
      const dx = c.centerX - cp.x;
      const dz = c.centerZ - cp.z;
      c.mesh.visible = dx * dx + dz * dz < 160 * 160;
    }
    for (const p of this.loot.pickups) {
      const dx = p.pos.x - cp.x;
      const dz = p.pos.z - cp.z;
      const d2 = dx * dx + dz * dz;
      p.group.visible = d2 < 120 * 120; // beams are visible from afar...
      p.mesh.visible = d2 < 45 * 45; // ...the item model only up close
    }
    for (const b of this.bots.bots) {
      if (!b.alive) continue;
      const dx = b.pos.x - cp.x;
      const dz = b.pos.z - cp.z;
      const d2 = dx * dx + dz * dz;
      const vis = d2 < 240 * 240;
      b.char.group.visible = vis;
      b.weaponModel.visible = d2 < 80 * 80;
      b.glider.visible = vis && b.phase === 'glide';
    }
  }

  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;
    if (dt <= 0) dt = 0.001;

    if (this.state === 'menu') {
      // slow orbit around the most central town
      this.menuAngle += dt * 0.06;
      const t = this.menuTown;
      const r = 95;
      this.camera.position.set(t.x + Math.cos(this.menuAngle) * r, t.h + 42, t.z + Math.sin(this.menuAngle) * r);
      this.camera.lookAt(t.x, t.h + 4, t.z);
      this.sky.position.set(t.x, 0, t.z);
      this.sun.position.set(t.x + 80, t.h + 120, t.z + 50);
      this.sun.target.position.set(t.x, t.h, t.z);
      this.sun.target.updateMatrixWorld();
      this.effects.update(dt);
      this.updateCulling(dt);
      this.renderer.render(this.scene, this.camera);
      this.input.endFrame();
      this.adaptQuality(dt);
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
    this.updateCulling(dt);
    this.hud.update(dt);
    if (this.debug) this.hud.el.storm.textContent += `  |  ${Math.round(1 / dt)} fps`;

    this.renderer.render(this.scene, this.camera);
    input.endFrame();

    this.adaptQuality(dt);
  }

  /** Drops shadows and then render resolution on machines that can't keep up; scales back up when they can. */
  adaptQuality(dt) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 60) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (avg > 0.04) {
      if (this.shadows) {
        this.setShadows(false);
      } else if (this.pixelScale > 0.4) {
        this.setPixelScale(Math.max(0.4, this.pixelScale - 0.15));
      }
    } else if (avg < 0.02 && this.pixelScale < this.maxPixelScale) {
      this.setPixelScale(Math.min(this.maxPixelScale, this.pixelScale + 0.1));
    }
  }

  setPixelScale(scale) {
    this.pixelScale = scale;
    this.renderer.setPixelRatio(scale);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
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
