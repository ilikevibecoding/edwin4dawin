// Game orchestration: rendering, fixed-step simulation, interaction, HUD, audio.
import * as THREE from 'three';
import { buildAtlas, atlasTexture, tileUV, TILES, addSignTiles, finalizeAtlas } from './textures.js';
import { initBlocks, B, BLOCKS, SHAPE } from './blocks.js';
import { WorldGen, SPAWN, REGIONS } from './worldgen.js';
import { World } from './world.js';
import { buildTown } from './town/town.js';
import { NPCManager } from './npc/npc.js';
import { AnimalManager } from './entities/animals.js';
import { Train } from './entities/train.js';
import { Terrain } from './terrain.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
import { Sky } from './sky.js';
import { raycastBlocks, BlockHighlight, CrackOverlay, FACE_NORMALS, placementVariant, placementBlocked, canReplace } from './interaction.js';
import { Inventory, ItemDrops } from './items.js';
import { Particles } from './particles.js';
import { GameAudio } from './audio.js';
import { Hand } from './hand.js';
import { SHARED, makeEntityMaterial } from './entityMaterial.js';
import { TICK_DT, REACH, PLAYER_EYE } from './constants.js';
import { PerfMonitor } from './perf.js';
import { Permissions } from './permissions.js';
import { SaveManager } from './save.js';
import { DisasterManager } from './disasters/manager.js';
import { VehicleManager } from './vehicles/manager.js';
import { registerAllStructures } from './structures/index.js';
import { applyQuality, loadQualityName } from './quality.js';
import { Tsunami } from './disasters/tsunami.js';
import { Tornado } from './disasters/tornado.js';
import { OrbitalBeam } from './disasters/orbitalBeam.js';
import { AdminPanel } from './ui/adminPanel.js';
import { NetClient } from './net/client.js';
import { RenderPipeline } from './render/pipeline.js';

const WORLD_SEED = 1337;

const MOUSE_SENS = 0.15 * Math.PI / 180; // radians per pixel (Minecraft default sensitivity)

export class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.hudCanvas = document.getElementById('hud');
    this.loading = true;
    this.viewBobbing = true;
    this.lookingAtName = null;
    this.breakProgress = 0;
    this.breakTarget = null;
    this.breakCooldown = 0;
    this.placeCooldown = 0;
    this.hitSoundTimer = 0;
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fpsTimer = 0;
    this.fps = 0;
    this.fov = 70;
    this.fovCurrent = 70;
    this.time = 0;
    this.smokeSources = [];
    this.npcs = null;
    this.animals = null;
    this.train = null;
    this.town = null;
  }

  async start() {
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.autoClear = false;
    this.renderer = renderer;
    this.perf = new PerfMonitor(renderer);
    this.startedAt = performance.now();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 1000);
    this.camera.rotation.order = 'YXZ';

    const atlas = buildAtlas();
    initBlocks();
    this.permissions = new Permissions();
    this.save = new SaveManager(WORLD_SEED);
    this.setLoading('Planning the frontier town...', 0.02);
    await this.nextFrame();

    this.gen = new WorldGen(WORLD_SEED);
    await this.setupTown();
    this.world = new World(this.gen);
    for (const [x, y, z, tile] of this.signAssignments) this.world.signTiles.set(World.posKey(x, y, z), tile);
    this.atlas = atlasTexture;
    this.terrain = new Terrain(this.world, this.scene, atlasTexture);
    this.terrain.onChunkGenerated = (c) => this.save.applyToChunk(c);
    this.terrain.pinRegion(this.town.bounds.x0, this.town.bounds.z0, this.town.bounds.x1, this.town.bounds.z1);
    this.sky = new Sky(this.scene, this.camera);
    this.player = new Player(this.world);
    this.input = new Input(this.canvas);
    this.hud = new HUD(this.hudCanvas, this);
    this.inventory = new Inventory();
    this.highlight = new BlockHighlight(this.scene);
    const destroyTiles = []; for (let i = 0; i < 10; i++) destroyTiles.push(TILES['destroy_' + i]);
    this.crack = new CrackOverlay(this.scene, atlasTexture, tileUV, destroyTiles);
    this.particles = new Particles(this.scene, this.world, atlasTexture);
    this.audio = new GameAudio();
    this.hand = new Hand(atlasTexture);
    this.entityMaterial = makeEntityMaterial(atlasTexture);
    this.drops = new ItemDrops(this.scene, this.world, this.entityMaterial);
    this.hand.resize(window.innerWidth, window.innerHeight);
    this.particles.setCamera(this.camera, window.innerHeight * renderer.getPixelRatio());

    // starting kit
    const kit = [[B.OAK_PLANKS, 64], [B.COBBLESTONE, 64], [B.SPRUCE_PLANKS, 64], [B.GLASS, 32], [B.OAK_LOG, 32], [B.BRICKS, 64], [B.LANTERN, 16], [B.OAK_FENCE, 32], [B.TORCH, 32]];
    kit.forEach(([id, n], i) => this.inventory.set(i, id, n));

    // spawn (URL params ?x=&z=&time=&yaw= allow starting elsewhere, handy for demos)
    const params = new URLSearchParams(location.search);
    const sx = params.has('x') ? parseFloat(params.get('x')) : SPAWN.x;
    const sz = params.has('z') ? parseFloat(params.get('z')) : SPAWN.z;
    if (params.has('time')) this.sky.time = parseFloat(params.get('time'));
    if (params.has('rd')) this.terrain.setRenderDistance(parseInt(params.get('rd'), 10));
    this.debugLog = params.has('debuglog');
    this.startYaw = params.has('yaw') ? parseFloat(params.get('yaw')) * Math.PI / 180 : -Math.PI / 2;
    this.setLoading('Building terrain...', 0.05);
    const pre = this.terrain.preload(sx, sz);
    let last = performance.now();
    for (const p of pre) {
      if (performance.now() - last > 40) { this.setLoading('Building terrain...', 0.05 + p * 0.9); await this.nextFrame(); last = performance.now(); }
    }
    this.setLoading('Waking up the town...', 0.96);
    await this.nextFrame();
    await this.setupEntities();
    this.pipeline = new RenderPipeline(this.renderer, this); // shadows, HDR post, sun uniforms (Light preset = direct path)
    // pre-compile shader programs that would otherwise stall on first use (name tags, debris)
    if (this.npcs && this.npcs.list.length) {
      const tag = this.npcs.list[0].tag; tag.visible = true;
      try { this.renderer.compile(this.scene, this.camera); } catch (e) { /* ignore */ }
      tag.visible = false;
    }
    const sy = params.has('y') ? parseFloat(params.get('y')) : this.world.surfaceY(Math.floor(sx), Math.floor(sz)) + 1;
    this.player.teleport(sx, sy, sz);
    this.player.yaw = this.startYaw; // default: face east toward town
    this.player.pitch = params.has('pitch') ? parseFloat(params.get('pitch')) * Math.PI / 180 : -0.08;
    if (params.get('fly') === '1') this.player.flying = true; // start airborne (observer / demo vantage)
    this.spawnPoint = { x: sx, y: sy, z: sz };

    this.bindEvents();
    this.loading = false;
    this.perf.loadTimeMs = performance.now() - this.startedAt;
    document.getElementById('loading').style.display = 'none';
    this.hud.addMessage('Welcome to the frontier. Click to grab the mouse.');
    this.hud.addMessage('WASD to move, Space to jump, double-tap W to sprint, double-tap Space to fly, E for blocks.');
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  async setupTown() {
    const town = buildTown();
    this.town = town;
    this.gen.addOverlay(town.overlay());
    await registerAllStructures(this.gen, this); // Coruscant, Death Star, hyperlane, stations (lazy per-chunk fills)
    const sb = town.saloon.bounds;
    town.saloonPos = { x: (sb.x0 + sb.x1) / 2, z: (sb.z0 + sb.z1) / 2 };
    this.smokeSources = town.smoke;
    // sign text tiles are baked into the atlas, then the atlas texture is rebuilt
    this.signAssignments = [];
    for (const sign of town.signs) {
      const tiles = addSignTiles(sign.text, sign.order.length);
      sign.order.forEach(([x, z], i) => this.signAssignments.push([x, sign.y, z, tiles[i]]));
    }
    finalizeAtlas();
  }

  async setupEntities() {
    this.npcs = new NPCManager(this.scene, this.world, this.town, this.audio, this.hud);
    this.npcs.game = this;
    await this.nextFrame();
    this.animals = new AnimalManager(this.scene, this.world, this.town, this.audio);
    this.animals.particles = this.particles;
    this.train = new Train(this.scene, this.world, this.audio, this.particles);
    // disasters: deterministic, journaled, admin-controlled
    this.vehicles = new VehicleManager(this);
    this.world.vehicles = this.vehicles;
    this.disasters = new DisasterManager(this);
    {
      const qp = new URLSearchParams(location.search);
      applyQuality(this, loadQualityName(qp, this.renderer), { persist: false, renderDistance: !qp.has('rd') });
      if (!qp.has('rd')) { try { const rd = parseInt(localStorage.getItem('frontier-craft:rd'), 10); if (rd >= 2) this.terrain.setRenderDistance(rd); } catch (e) { /* ignore */ } }
    }
    this.disasters.register(Tsunami);
    this.disasters.register(Tornado);
    this.disasters.register(OrbitalBeam);
    this.adminPanel = new AdminPanel(this);
    // multiplayer (optional): ?server=ws://host:port
    const params = new URLSearchParams(location.search);
    const serverUrl = params.get('server');
    if (serverUrl) {
      this.net = new NetClient(this, serverUrl);
      this.disasters.net = this.net;
      this.net.connect();
    }
  }

  nextFrame() { return new Promise((r) => requestAnimationFrame(r)); }
  setLoading(text, p) {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('bar-fill').style.width = Math.round(p * 100) + '%';
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.hand.resize(window.innerWidth, window.innerHeight);
      this.hud.resize();
      this.particles.setCamera(this.camera, window.innerHeight * this.renderer.getPixelRatio());
      if (this.pipeline) this.pipeline.setSize(window.innerWidth, window.innerHeight);
    });
    this.input.onMouseDown = (e) => {
      if (this.loading) return;
      this.audio.resume();
      if (!this.input.locked && !this.hud.screen) { this.input.requestLock(); }
    };
    this.input.onLockChange = (locked) => {
      if (!locked && !this.hud.screen) this.openScreen('pause');
    };
    this.input.onKeyDown = (e) => {
      if (this.loading) return;
      if (e.code === 'Escape') {
        if (this.hud.screen === 'admin') { this.closeScreen(); return; }
        if (this.hud.screen === 'pause' || this.hud.screen === 'inventory') this.closeScreen();
        return;
      }
      if (e.code === 'F4' || e.code === 'Backquote') {
        e.preventDefault();
        if (this.hud.screen === 'admin') this.closeScreen();
        else if (!this.hud.screen || this.hud.screen === 'pause') { if (this.permissions.isAdmin()) this.openScreen('admin'); else this.hud.addMessage('Disaster controls require administrator permission.'); }
        return;
      }
      if (this.hud.screen === 'admin') return;
      if (this.hud.screen === 'death') return;
      if (e.code === 'KeyE') { if (this.hud.screen === 'inventory') this.closeScreen(); else if (!this.hud.screen) this.openScreen('inventory'); }
      if (this.hud.screen) return;
      if (e.code === 'KeyW') {
        const now = performance.now();
        if (now - (this.lastWPress || 0) < 300) this.doubleTapSprint = true;
        this.lastWPress = now;
      }
      if (e.code === 'F3') this.hud.debug = !this.hud.debug;
      if (e.code === 'KeyT') { this.sky.time = (this.sky.time + 1 / 12) % 1; this.hud.addMessage('Time set to ' + this.sky.clockString()); }
      if (e.code.startsWith('Digit')) { const n = parseInt(e.code.slice(5), 10); if (n >= 1 && n <= 9) { this.inventory.selected = n - 1; this.audio.click(); } }
    };
  }

  openScreen(name) {
    this.hud.screen = name;
    this.input.releaseLock();
    this.hudCanvas.style.cursor = 'default';
    if (name === 'admin' && this.adminPanel) { this.adminPanel.open(); this.hudCanvas.style.pointerEvents = 'none'; }
  }
  closeScreen() {
    if (this.hud.screen === 'admin' && this.adminPanel) { this.adminPanel.close(); this.hudCanvas.style.pointerEvents = ''; }
    this.hud.screen = null;
    this.hud.cursorItem = null;
    this.input.requestLock();
  }
  // How much of each far region's look applies at this position (soft bands so the sky never snaps).
  regionMix(x, z) {
    const sp = REGIONS.space, co = REGIONS.coruscant;
    const dS = Math.max(Math.abs(x - sp.cx), Math.abs(z - sp.cz)) - sp.half;        // <0 inside the void box
    const dC = Math.max(Math.abs(x - co.cx), Math.abs(z - co.cz)) - co.half;
    return { space: Math.max(0, Math.min(1, (200 - dS) / 400)), coruscant: Math.max(0, Math.min(1, (160 - dC) / 320)) };
  }
  cycleRenderDistance() {
    const opts = [4, 6, 8, 10, 12, 16, 24];
    const i = opts.indexOf(this.terrain.renderDistance);
    this.setRenderDistance(opts[(i + 1) % opts.length]);
  }
  // explicit choice (pause menu / admin panel): remembered, and quality presets no longer override it
  setRenderDistance(r) {
    this.terrain.setRenderDistance(r);
    try { localStorage.setItem('frontier-craft:rd', String(this.terrain.renderDistance)); } catch (e) { /* ignore */ }
  }
  respawn() {
    const s = this.spawnPoint;
    const y = this.world.surfaceY(Math.floor(s.x), Math.floor(s.z)) + 1;
    this.player.respawn(s.x, y, s.z);
  }

  // ---------------------------------------------------------------------------
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    this.perf.beginFrame(now);
    const frameStart = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.25) dt = 0.25;
    this.time += dt;
    this.frameCount++; this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) { this.fps = Math.round(this.frameCount / this.fpsTimer); this.frameCount = 0; this.fpsTimer = 0; this.jsMs = this.jsAccum / Math.max(1, this.jsFrames); this.jsAccum = 0; this.jsFrames = 0; }

    const playing = this.input.locked && !this.hud.screen;
    // mouse look
    if (playing) {
      this.player.yaw -= this.input.mouseDX * MOUSE_SENS;
      this.player.pitch -= this.input.mouseDY * MOUSE_SENS;
      const lim = Math.PI / 2 - 0.001;
      if (this.player.pitch > lim) this.player.pitch = lim;
      if (this.player.pitch < -lim) this.player.pitch = -lim;
      if (this.input.wheel !== 0) { this.inventory.selected = (this.inventory.selected + this.input.wheel + 9) % 9; this.audio.click(); }
    }

    // fixed-step simulation
    this.accumulator += dt;
    let ticks = 0;
    while (this.accumulator >= TICK_DT && ticks < 5) {
      this.vehicles.tick();
      this.tick(playing);
      this.accumulator -= TICK_DT;
      ticks++;
    }
    if (ticks === 5) this.accumulator = 0;
    const alpha = this.accumulator / TICK_DT;

    // interaction (per frame for smooth breaking)
    this.updateInteraction(dt, playing);

    // camera
    const eye = this.player.eyePos(alpha, new THREE.Vector3());
    const bob = this.player.viewBob(alpha, { tx: 0, ty: 0, roll: 0, pitch: 0 });
    this.camera.position.copy(eye);
    this.camera.rotation.set(this.player.pitch, this.player.yaw, 0);
    if (this.viewBobbing) {
      // apply bob translation in camera space
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
      this.camera.position.addScaledVector(right, bob.tx).addScaledVector(up, bob.ty);
      this.camera.rotation.z = bob.roll;
      this.camera.rotation.x += bob.pitch;
    }
    // disasters: visuals, debris, chunk relight/remesh, camera shake
    if (this.disasters) {
      this.vehicles.update(dt, alpha, this.camera);
      this.disasters.update(dt, alpha, this.camera);
      const fx = this.disasters.effects;
      if (fx.shakeAmp > 0.001) { this.camera.position.add(fx.shakeOffset); this.camera.rotation.z += fx.shakeRot; }
    }
    const targetFov = this.player.sprinting ? 70 * 1.15 : this.player.sneaking ? 70 * 0.97 : 70;
    this.fovCurrent += (targetFov - this.fovCurrent) * Math.min(1, dt * 10);
    if (Math.abs(this.camera.fov - this.fovCurrent) > 0.01) { this.camera.fov = this.fovCurrent; this.camera.updateProjectionMatrix(); this.hand.setFov(this.fovCurrent); }

    // world streaming
    this.terrain.update(this.player.pos.x, this.player.pos.z, 7);

    // sky & lighting (+ disaster overrides: darkening, dust tint, flashes, denser fog)
    this.sky.update(dt, this.camera.position, this.terrain.renderDistance, this.player.eyeUnderwater);
    this.sky.applyRegion(this.regionMix(this.player.pos.x, this.player.pos.z));
    if (this.disasters) this.sky.applyOverride(this.disasters.effects.override, this.player.eyeUnderwater);
    let skyLight = this.sky.skyLight, fogNear = this.sky.fogNear, fogFar = this.sky.fogFar, flash = 0;
    const skyTint = new THREE.Vector3().copy(this.sky.skyTint);
    const fogColor = this.sky.fogColor.clone();
    if (this.disasters) {
      const ov = this.disasters.effects.override;
      skyLight *= ov.skyLightMul;
      skyTint.multiply(ov.tint);
      fogNear *= ov.fogNearMul; fogFar *= ov.fogFarMul;
      if (ov.fogColor) fogColor.lerp(ov.fogColor, 1 - ov.fogFarMul * 0.5 > 0.2 ? 0.8 : 0.5);
      flash = ov.flash;
      if (flash > 0) fogColor.lerp(new THREE.Color(ov.flashColor.x, ov.flashColor.y, ov.flashColor.z), Math.min(1, flash));
      if (Math.abs(ov.skyLightMul - 1) > 0.01) fogColor.multiplyScalar(0.55 + 0.45 * ov.skyLightMul);
    }
    const fogCol = new THREE.Vector3(fogColor.r, fogColor.g, fogColor.b);
    this.terrain.setLighting(skyLight, skyTint, fogCol, fogNear, fogFar, flash);
    SHARED.uSkyLight.value = skyLight;
    SHARED.uSkyTint.value.copy(skyTint);
    SHARED.uFogColor.value.copy(fogCol);
    SHARED.uFogNear.value = fogNear;
    SHARED.uFogFar.value = fogFar;
    SHARED.uFlash.value = flash;
    this.renderer.setClearColor(fogColor);

    // entities
    this.particles.update(dt);
    this.drops.render(alpha, this.time, (x, y, z) => this.world.sampleLight(x, y, z));
    this.updateEntitiesFrame(dt, alpha);
    this.updateSmoke(dt);

    // audio listener + ambience
    this.audio.setListener(eye.x, eye.y, eye.z, this.player.yaw);
    const saloonDist = this.town ? Math.hypot(eye.x - this.town.saloonPos.x, eye.z - this.town.saloonPos.z) : 999;
    this.audio.update(dt, this.sky.dayFactor, saloonDist);

    // hand
    const handLight = this.world.sampleLight(eye.x, eye.y, eye.z);
    const held = this.inventory.held;
    this.hand.update(dt, held ? held.id : 0, handLight, bob, this.viewBobbing);

    // render (shadow pass + HDR post on Balanced/Cinematic; the Light preset renders directly like before)
    this.pipeline.render(this.scene, this.camera, this.hand.scene, this.hand.camera);
    this.perf.endRender();
    this.hud.fps = this.fps;
    this.hud.render(this);
    this.input.endFrame();
    this.jsAccum = (this.jsAccum || 0) + (performance.now() - frameStart);
    this.jsFrames = (this.jsFrames || 0) + 1;
    this.perf.setCounters({
      npcs: this.npcs ? this.npcs.list.length : 0, animals: this.animals ? this.animals.list.length : 0,
      particles: this.particles.count, drops: this.drops.items.length, chunks: this.terrain.stats.chunks, meshes: this.terrain.stats.meshed,
      debris: this.disasters ? this.disasters.debris.count : 0, journal: this.disasters ? this.disasters.journal.size : 0,
      disaster: this.disasters ? `${this.disasters.state}${this.disasters.activeType ? ':' + this.disasters.activeType : ''}` : 'n/a',
      remotePlayers: this.net ? this.net.stats.players : 0,
    });
    if (this.net) Object.assign(this.perf.net, { bytesIn: this.net.stats.bytesIn, bytesOut: this.net.stats.bytesOut, msgsIn: this.net.stats.msgsIn, msgsOut: this.net.stats.msgsOut });
    this.perf.endFrame();
    if (this.debugLog) this.logDebug(dt);
  }

  // Periodic console summary used for automated verification (?debuglog)
  logDebug(dt) {
    this.logTimer = (this.logTimer || 0) + dt;
    if (this.logTimer < 5) return;
    this.logTimer = 0;
    if (!this.npcs) return;
    const states = {};
    let moved = 0;
    for (const n of this.npcs.list) {
      states[n.state] = (states[n.state] || 0) + 1;
      if (n._lastLog) { const d = Math.hypot(n.pos.x - n._lastLog.x, n.pos.z - n._lastLog.z); if (d > 1) moved++; }
      n._lastLog = { x: n.pos.x, z: n.pos.z };
    }
    const sample = this.npcs.list.slice(0, 4).map((n) => `${n.name}@${n.pos.x.toFixed(1)},${n.pos.y.toFixed(1)},${n.pos.z.toFixed(1)}:${n.state}${n.target ? '->' + n.target.kind : ''}`).join(' | ');
    console.log(`[dbg] t=${this.sky.clockString()} fps=${this.fps} js=${(this.jsMs || 0).toFixed(1)}ms chunks=${this.terrain.stats.chunks} meshes=${this.terrain.stats.meshed} npcs=${JSON.stringify(states)} moved5s=${moved} pathQ=${this.npcs.pathQueue.length} train=${this.train ? this.train.state + '@' + this.train.x.toFixed(0) : '-'} | ${sample}`);
  }

  updateEntitiesFrame(dt, alpha) {
    if (this.npcs) this.npcs.render(alpha, dt, this.camera);
    if (this.animals) this.animals.render(alpha, dt, this.camera);
    if (this.train) this.train.render(alpha, dt);
    if (this.net) this.net.update(dt, alpha);
    if (this.adminPanel && this.adminPanel.isOpen) this.adminPanel.update();
  }

  updateSmoke(dt) {
    this.smokeTimer = (this.smokeTimer || 0) + dt;
    if (this.smokeTimer < 0.12) return;
    this.smokeTimer = 0;
    const p = this.player.pos;
    for (const s of this.smokeSources) {
      const d2 = (s.x - p.x) ** 2 + (s.z - p.z) ** 2;
      if (d2 > 120 * 120) continue;
      if (Math.random() < 0.7) this.particles.smoke(s.x + 0.5, s.y + 1.0, s.z + 0.5);
    }
    // wind-blown dust over dirt/mud streets during the day
    if (this.sky.dayFactor > 0.3 && Math.random() < 0.6) {
      const x = Math.floor(p.x + (Math.random() - 0.5) * 30), z = Math.floor(p.z + (Math.random() - 0.5) * 30);
      const y = this.world.surfaceY(x, z);
      const id = this.world.getBlock(x, y, z);
      if (id === B.MUD || id === B.DIRT_PATH || id === B.COARSE_DIRT || id === B.SAND) this.particles.dust(x + Math.random(), y + 1, z + Math.random());
    }
  }

  tick(playing) {
    const inp = this.input;
    const ctrl = { forward: 0, strafe: 0, jump: false, sneak: false, sprint: false };
    if (playing) {
      if (inp.isDown('KeyW')) ctrl.forward += 1;
      if (inp.isDown('KeyS')) ctrl.forward -= 1;
      if (inp.isDown('KeyA')) ctrl.strafe -= 1;
      if (inp.isDown('KeyD')) ctrl.strafe += 1;
      ctrl.jump = inp.isDown('Space') || inp.takePress('Space');
      ctrl.sneak = inp.isDown('ShiftLeft') || inp.isDown('ShiftRight');
      // Sprint: hold R, or double-tap W (Minecraft's alternate binding). Ctrl is avoided because
      // Ctrl+W closes the browser tab.
      if (!inp.isDown('KeyW')) this.doubleTapSprint = false;
      ctrl.sprint = inp.isDown('KeyR') || this.doubleTapSprint;
    }
    this.player.tick(ctrl);
    for (const ev of this.player.events) this.handlePlayerEvent(ev);
    // first time the player is held under water for a while: one hint (Minecraft sinks you unless you hold jump)
    if (this.player.eyeUnderwater && !this.player.flying) { this.underwaterTicks = (this.underwaterTicks || 0) + 1; if (this.underwaterTicks === 50 && !this.swimHintShown) { this.swimHintShown = true; this.hud.addMessage('Hold Space to swim up.'); } } else this.underwaterTicks = 0;
    this.player.events.length = 0;
    if (this.player.dead && this.hud.screen !== 'death') this.openScreen('death');

    // item pickup
    const picked = this.drops.tick(this.player.box, this.player.pos);
    for (const it of picked) { this.inventory.add(it.id, it.count); this.audio.pop(); this.hud.xp = Math.min(1, this.hud.xp + 0.01); }

    if (this.npcs) this.npcs.tick(this.player, this.sky);
    if (this.animals) this.animals.tick(this.player, this.sky);
    if (this.train) this.train.tick(this.player);
    // online, the network client steps the disaster clock against the server tick instead
    if (this.disasters && !(this.net && this.net.connected && this.net.drivesDisasterClock)) this.disasters.simTick();
    if (this.net) this.net.tick();
    if (this.breakCooldown > 0) this.breakCooldown -= TICK_DT;
    if (this.placeCooldown > 0) this.placeCooldown -= TICK_DT;
  }

  handlePlayerEvent(ev) {
    switch (ev.type) {
      case 'step': if (!ev.inWater) this.audio.step(BLOCKS[ev.block].sound); else this.audio.swim(); break;
      case 'land': this.audio.step(BLOCKS[ev.block].sound, null, 1.3); break;
      case 'fallhurt': this.audio.hurt(); this.audio.step('stone', null, 1.4); break;
      case 'burn': this.audio.hurt(); break;
      case 'fly': this.hud.addMessage(ev.flying ? 'Flying: Space rises, Shift descends, double-tap Space or land to stop.' : 'Flight off.'); break;
      case 'hurt': this.audio.hurt(); break;
      case 'death': this.hud.addMessage('You died!'); break;
      default: break;
    }
  }

  // ---------------------------------------------------------------------------
  updateInteraction(dt, playing) {
    const p = this.player;
    const eye = p.eyePos(1, new THREE.Vector3());
    const dir = p.forwardDir(new THREE.Vector3());
    let hit = playing && !p.dead ? raycastBlocks(this.world, eye, dir, REACH) : null;
    // entity targeting (NPCs) for name display
    this.lookingAtName = null;
    let entityHit = null;
    if (this.npcs && playing) {
      entityHit = this.npcs.raycast(eye, dir, hit ? hit.dist : REACH + 1.5);
      if (entityHit) { this.lookingAtName = entityHit.npc.name; if (hit && entityHit.dist < hit.dist) hit = null; else if (!hit) { /* keep entity */ } }
    }
    if (!entityHit && this.animals && playing) {
      const ah = this.animals.raycast(eye, dir, hit ? hit.dist : REACH + 1.5);
      if (ah) { this.lookingAtName = ah.name; }
    }
    this.highlight.update(this.world, hit);
    this.lastHit = hit; // exposed for admin tools ("use crosshair target")

    // breaking
    if (playing && this.input.mouseDown[0] && !p.dead) {
      if (hit) {
        const def = BLOCKS[hit.id];
        if (!this.breakTarget || this.breakTarget.x !== hit.x || this.breakTarget.y !== hit.y || this.breakTarget.z !== hit.z) {
          this.breakTarget = { x: hit.x, y: hit.y, z: hit.z };
          this.breakProgress = 0;
          this.hitSoundTimer = 0;
        }
        this.hand.startSwing();
        if (this.breakCooldown <= 0 && def.hardness !== Infinity) {
          this.breakProgress += dt / def.hardness;
          this.hitSoundTimer -= dt;
          if (this.hitSoundTimer <= 0) { this.hitSoundTimer = 0.25; this.audio.hit(def.sound, hit.point); this.particles.blockHit(hit, hit.id); }
          if (this.breakProgress >= 1) this.breakBlock(hit);
        }
      } else {
        this.breakTarget = null; this.breakProgress = 0;
        if (this.input.mouseClicked[0]) {
          this.hand.startSwing();
          if (entityHit) this.npcs.poke(entityHit.npc, this);
        }
      }
    } else {
      this.breakTarget = null; this.breakProgress = 0;
    }
    this.crack.show(this.breakTarget ? hit : null, this.breakProgress);

    // placing / interacting
    if (playing && !p.dead && (this.input.mouseClicked[2] || (this.input.mouseDown[2] && this.placeCooldown <= 0))) {
      if (entityHit && !hit) { this.npcs.talk(entityHit.npc, this); this.hand.startSwing(); this.placeCooldown = 0.5; }
      else if (hit) this.placeBlock(hit);
      this.placeCooldown = this.input.mouseClicked[2] ? 0.25 : 0.2;
    }
  }

  breakBlock(hit) {
    const def = BLOCKS[hit.id];
    const world = this.world;
    this.particles.blockBreak(hit.x, hit.y, hit.z, hit.id);
    this.audio.breakBlock(def.sound, hit.point);
    world.setBlock(hit.x, hit.y, hit.z, B.AIR);
    // multi-block structures
    if (def.shape === SHAPE.DOOR) {
      if (BLOCKS[world.getBlock(hit.x, hit.y + 1, hit.z)].shape === SHAPE.DOOR) world.setBlock(hit.x, hit.y + 1, hit.z, B.AIR);
      if (BLOCKS[world.getBlock(hit.x, hit.y - 1, hit.z)].shape === SHAPE.DOOR) world.setBlock(hit.x, hit.y - 1, hit.z, B.AIR);
    }
    if (def.shape === SHAPE.BED) {
      const other = hit.id === B.BED_HEAD ? B.BED_FOOT : B.BED_HEAD;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (world.getBlock(hit.x + dx, hit.y, hit.z + dz) === other) { world.setBlock(hit.x + dx, hit.y, hit.z + dz, B.AIR); break; }
    }
    // plants on top fall
    const above = world.getBlock(hit.x, hit.y + 1, hit.z);
    const ad = BLOCKS[above];
    if (ad.shape === SHAPE.CROSS || ad.shape === SHAPE.TORCH || (ad.shape === SHAPE.LANTERN && !BLOCKS[world.getBlock(hit.x, hit.y + 2, hit.z)].solid)) {
      world.setBlock(hit.x, hit.y + 1, hit.z, B.AIR);
      if (ad.drop) this.drops.spawn(ad.drop, hit.x + 0.5, hit.y + 1.2, hit.z + 0.5);
    }
    if (def.drop) this.drops.spawn(def.drop, hit.x + 0.5, hit.y + 0.3, hit.z + 0.5);
    this.terrain.remeshDirtyNear(this.player.pos.x, this.player.pos.z);
    this.breakProgress = 0;
    this.breakTarget = null;
    this.breakCooldown = 0.25;
    this.hud.xp = Math.min(1, this.hud.xp + 0.004);
    if (this.npcs) this.npcs.onWorldChanged(hit.x, hit.y, hit.z);
    this.onPlayerEdit(hit.x, hit.y, hit.z, B.AIR);
  }

  // Player edits persist to the save (unless the cell belongs to an active disaster) and replicate online.
  onPlayerEdit(x, y, z, id) {
    if (this.save) this.save.recordEdit(x, y, z, id);
    if (this.net && this.net.connected) this.net.sendBlock(x, y, z, id);
  }

  placeBlock(hit) {
    const held = this.inventory.held;
    if (!held) return;
    const world = this.world;
    const targetDef = BLOCKS[hit.id];
    let x = hit.x, y = hit.y, z = hit.z;
    if (!targetDef.replaceable) { const n = FACE_NORMALS[hit.face]; x += n[0]; y += n[1]; z += n[2]; }
    if (!canReplace(world, x, y, z)) return;
    if (!world.isLoaded(x, z)) return;
    const id = placementVariant(held.id, hit);
    const def = BLOCKS[id];
    const boxes = [this.player.box];
    if (this.npcs) this.npcs.collectBoxes(boxes, x, z);
    if (this.animals) this.animals.collectBoxes(boxes, x, z);
    if (placementBlocked(id, x, y, z, boxes)) return;
    // shape-specific placement rules
    if (def.shape === SHAPE.DOOR) {
      if (!canReplace(world, x, y + 1, z)) return;
      world.setBlock(x, y, z, id);
      world.setBlock(x, y + 1, z, id);
    } else if (def.shape === SHAPE.BED) {
      const fwd = this.player.forwardDir(new THREE.Vector3());
      const dx = Math.abs(fwd.x) > Math.abs(fwd.z) ? Math.sign(fwd.x) : 0, dz = dx === 0 ? Math.sign(fwd.z) || 1 : 0;
      if (!canReplace(world, x + dx, y, z + dz) || placementBlocked(B.BED_FOOT, x + dx, y, z + dz, boxes)) return;
      world.setBlock(x, y, z, B.BED_FOOT);
      world.setBlock(x + dx, y, z + dz, B.BED_HEAD);
    } else if (def.shape === SHAPE.TORCH || def.shape === SHAPE.CROSS) {
      if (!BLOCKS[world.getBlock(x, y - 1, z)].solid) return;
      world.setBlock(x, y, z, id);
    } else if (def.shape === SHAPE.LANTERN) {
      if (!BLOCKS[world.getBlock(x, y - 1, z)].solid && !BLOCKS[world.getBlock(x, y + 1, z)].solid) return;
      world.setBlock(x, y, z, id);
    } else if (def.shape === SHAPE.WALL_SIGN) {
      let ok = false;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (BLOCKS[world.getBlock(x + dx, y, z + dz)].solid) ok = true;
      if (!ok) return;
      world.setBlock(x, y, z, id);
    } else {
      world.setBlock(x, y, z, id);
    }
    this.inventory.consume(this.inventory.selected, 1);
    this.audio.placeBlock(def.sound, new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5));
    this.hand.startSwing();
    this.terrain.remeshDirtyNear(this.player.pos.x, this.player.pos.z);
    if (this.npcs) this.npcs.onWorldChanged(x, y, z);
    this.onPlayerEdit(x, y, z, this.world.getBlock(x, y, z));
    if (def.shape === SHAPE.DOOR) this.onPlayerEdit(x, y + 1, z, this.world.getBlock(x, y + 1, z));
  }

  debugLines() {
    const p = this.player.pos;
    const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
    const facing = ['south (+z)', 'west (-x)', 'north (-z)', 'east (+x)'][Math.round(((this.player.yaw % (Math.PI * 2)) + Math.PI * 2) / (Math.PI / 2)) % 4];
    const lines = [
      `Frontier Craft  ${this.fps} fps  (js ${(this.jsMs || 0).toFixed(1)} ms)  T: ${this.terrain.stats.meshed} meshes / ${this.terrain.stats.chunks} chunks`,
      `XYZ: ${p.x.toFixed(3)} / ${p.y.toFixed(3)} / ${p.z.toFixed(3)}`,
      `Block: ${bx} ${by} ${bz}   Chunk: ${bx >> 4} ${bz >> 4}`,
      `Facing: ${facing}  (yaw ${(this.player.yaw * 180 / Math.PI).toFixed(1)} / pitch ${(this.player.pitch * 180 / Math.PI).toFixed(1)})`,
      `Light: sky ${this.world.getSky(bx, by, bz)} block ${this.world.getLight(bx, by, bz)}   Time: ${this.sky.clockString()}`,
      `Speed: ${(Math.hypot(this.player.vel.x, this.player.vel.z) * 20).toFixed(2)} m/s  ground ${this.player.onGround} sprint ${this.player.sprinting}`,
    ];
    if (this.npcs) lines.push(`NPCs: ${this.npcs.list.length}  Animals: ${this.animals ? this.animals.list.length : 0}  Particles: ${this.particles.count}`);
    lines.push(...this.perf.lines());
    return lines;
  }
}
