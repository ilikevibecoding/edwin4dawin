// Game orchestration: rendering, fixed-step simulation, interaction, HUD, audio.
import * as THREE from 'three';
import { buildAtlas, atlasTexture, tileUV, TILES, addSignTiles, finalizeAtlas } from './textures.js';
import { initBlocks, B, BLOCKS, SHAPE, DOOR_SETS, WHEAT_STAGES } from './blocks.js';
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
import { Inventory, ItemDrops, initItems, I, foodOf, cookedOf, isItem, displayName } from './items.js';
import { DoorController } from './doors.js';
import { RNG, hash3 } from './rng.js';
import { Particles } from './particles.js';
import { GameAudio } from './audio.js';
import { Hand } from './hand.js';
import { SHARED, makeEntityMaterial } from './entityMaterial.js';
import { TICK_DT, REACH, FLY_HAIL_REACH, PLAYER_EYE } from './constants.js';
import { PerfMonitor } from './perf.js';
import { EventBus } from './events.js';
import { BUILD } from './build.js';
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
import { FarLOD } from './render/farlod.js';
import { Economy } from './economy/economy.js';
import { Signs } from './coruscant/signs.js';
import { Senate } from './senate/senate.js';

const WORLD_SEED = 1337;

const MOUSE_SENS = 0.15 * Math.PI / 180; // radians per pixel (Minecraft default sensitivity)

const CHEST_SLOTS = 27;
const CROP_STAGE_TICKS = 400;   // 20 s per wheat growth stage (3 stages), deterministic per crop
const COOK_TICKS = 60;          // 3 s of sizzling on a furnace
const ATTACK_COOLDOWN = 0.3;    // s between melee hits
const AUTOSAVE_TICKS = 20;      // player state / inventory snapshot cadence (writes are debounced in SaveManager)
// Deterministic loot of never-opened town chests: [item, min, max, chance]
const CHEST_LOOT = [
  [I.BREAD, 1, 3, 0.65], [I.APPLE, 1, 4, 0.5], [I.SEEDS, 2, 6, 0.5], [I.WHEAT, 1, 4, 0.4], [I.STICK, 2, 8, 0.5],
  [I.LEATHER, 1, 2, 0.3], [I.BONE, 1, 3, 0.3], [I.FEATHER, 1, 3, 0.25], [I.BEEF_COOKED, 1, 2, 0.15],
  [B.TORCH, 2, 6, 0.4], [B.OAK_PLANKS, 4, 12, 0.3],
];

export class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.hudCanvas = document.getElementById('hud');
    this.events = new EventBus();   // cross-system bus: economy, Senate, population, factions (src/events.js)
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
    this.tickCount = 0;
    this.cooking = null;       // {x, y, z, out, n, ticks} while a furnace is busy
    this.attackCooldown = 0;
    this.cropStageTicks = CROP_STAGE_TICKS;
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
    initItems(); // non-block items (ids >= 1000) get block-like entries so icons / hand / drops render them
    this.permissions = new Permissions();
    this.save = new SaveManager(WORLD_SEED);
    if (new URLSearchParams(location.search).has('fresh')) this.save.clear(); // ?fresh=1: start from an empty save
    this.setLoading('Planning the frontier town...', 0.02);
    await this.nextFrame();

    this.gen = new WorldGen(WORLD_SEED);
    await this.setupTown();
    this.world = new World(this.gen);
    for (const [x, y, z, tile] of this.signAssignments) this.world.signTiles.set(World.posKey(x, y, z), tile);
    this.save.restoreEntities(this.world); // chest contents / crop timers (global, independent of chunk loading)
    this.world.onBlockEntityLost = (x, y, z, ent, newId) => this.onBlockEntityLost(x, y, z, ent, newId);
    this.atlas = atlasTexture;
    this.terrain = new Terrain(this.world, this.scene, atlasTexture);
    // generated doors are two copies of the bottom id: give the upper half its own id, then overlay saved edits
    this.terrain.onChunkGenerated = (c) => { this.world.normalizeDoors(c); this.save.applyToChunk(c); };
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
    this.drops.canPickup = (id, count) => this.inventory.canAdd(id, count); // full inventory: items stay on the ground
    this.doors = new DoorController(this.world, this.audio);
    this.doors.onChange = () => this.terrain.remeshDirtyNear(this.player.pos.x, this.player.pos.z);
    this.hand.resize(window.innerWidth, window.innerHeight);
    this.particles.setCamera(this.camera, window.innerHeight * renderer.getPixelRatio());

    // spawn (URL params ?x=&z=&time=&yaw= allow starting elsewhere, handy for demos)
    const params = new URLSearchParams(location.search);
    // a saved player state is resumed unless the URL pins the position (demos / tests)
    const savedPlayer = !params.has('x') && !params.has('z') && !params.has('y') ? this.save.player : null;
    // inventory: saved stacks, otherwise the starting kit
    if (!this.inventory.deserialize(this.save.inventory)) {
      const kit = [[B.OAK_PLANKS, 64], [B.COBBLESTONE, 64], [B.SPRUCE_PLANKS, 64], [B.GLASS, 32], [B.OAK_LOG, 32], [B.BRICKS, 64], [B.LANTERN, 16], [B.OAK_FENCE, 32], [B.TORCH, 32]];
      kit.forEach(([id, n], i) => this.inventory.set(i, id, n));
    }
    const sx = params.has('x') ? parseFloat(params.get('x')) : savedPlayer ? savedPlayer.x : SPAWN.x;
    const sz = params.has('z') ? parseFloat(params.get('z')) : savedPlayer ? savedPlayer.z : SPAWN.z;
    if (params.has('time')) this.sky.time = parseFloat(params.get('time'));
    if (params.has('rd')) this.terrain.setRenderDistance(parseInt(params.get('rd'), 10));
    this.debugLog = params.has('debuglog');
    this.startYaw = params.has('yaw') ? parseFloat(params.get('yaw')) * Math.PI / 180 : savedPlayer ? savedPlayer.yaw : -Math.PI / 2;
    this.setLoading('Building terrain...', 0.05);
    const pre = this.terrain.preload(sx, sz);
    let last = performance.now();
    for (const p of pre) {
      if (performance.now() - last > 40) { this.setLoading('Building terrain...', 0.05 + p * 0.9); await this.nextFrame(); last = performance.now(); }
    }
    this.setLoading('Painting the horizon...', 0.95);
    await this.nextFrame();
    this.farLod = new FarLOD(this, { x: sx, z: sz, prebuildMs: 700 });   // far-LOD terrain beyond the near chunk ring (render/farlod.js)
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
    const sy = params.has('y') ? parseFloat(params.get('y')) : savedPlayer ? savedPlayer.y : this.world.surfaceY(Math.floor(sx), Math.floor(sz)) + 1;
    this.player.teleport(sx, sy, sz);
    this.player.yaw = this.startYaw; // default: face east toward town
    this.player.pitch = params.has('pitch') ? parseFloat(params.get('pitch')) * Math.PI / 180 : savedPlayer ? savedPlayer.pitch : -0.08;
    if (savedPlayer) {
      if (savedPlayer.vehicleTick > 0 && this.vehicles && !(this.net && this.net.connected)) this.vehicles.tickCount = savedPlayer.vehicleTick | 0;
      this.player.health = Math.max(1, Math.min(20, savedPlayer.health | 0));
      this.player.food = Math.max(0, Math.min(20, savedPlayer.food | 0));
      this.player.saturation = Math.max(0, Math.min(this.player.food, +savedPlayer.saturation || 0));
    }
    // game mode: URL ?mode= wins, then the save, then creative (the mode the world has always played in)
    const modeParam = params.get('mode');
    this.setMode(modeParam === 'survival' || modeParam === 'creative' ? modeParam : (savedPlayer && savedPlayer.mode === 'survival' ? 'survival' : 'creative'), { persist: false, announce: false });
    if (params.get('fly') === '1') { this.player.allowFlight = true; this.player.flying = true; } // start airborne (observer / demo vantage)
    // respawn point: the world spawn when resuming a saved game, otherwise where this session started
    this.spawnPoint = savedPlayer ? { x: SPAWN.x, y: sy, z: SPAWN.z } : { x: sx, y: sy, z: sz };

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
    // vehicles take their timetable pose now (twice, so prev == cur): a rider restored from the save is standing on
    // the train, not in mid-air where it used to be
    if (this.vehicles && this.vehicles.tickCount > 0) for (const v of this.vehicles.list) if (v.tick) { v.tick(this.vehicles.tickCount); v.tick(this.vehicles.tickCount); }
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
    this.animals.onDeath = (a) => this.onAnimalDeath(a);
    this.train = new Train(this.scene, this.world, this.audio, this.particles);
    // disasters: deterministic, journaled, admin-controlled
    this.vehicles = new VehicleManager(this);
    this.world.vehicles = this.vehicles;
    this.disasters = new DisasterManager(this);
    this.blockDefs = BLOCKS;   // read-only handle for tooling (test scripts normalise dynamic blocks such as doors and crops)
    {
      const qp = new URLSearchParams(location.search);
      applyQuality(this, loadQualityName(qp, this.renderer), { persist: false, renderDistance: !qp.has('rd') });
      if (!qp.has('rd')) { try { const rd = parseInt(localStorage.getItem('frontier-craft:rd'), 10); if (rd >= 2) this.terrain.setRenderDistance(rd); } catch (e) { /* ignore */ } }
    }
    this.disasters.register(Tsunami);
    this.disasters.register(Tornado);
    this.disasters.register(OrbitalBeam);
    this.adminPanel = new AdminPanel(this);
    this.economy = new Economy(this);   // wallet, vendors, jobs, housing, ships (src/economy/economy.js)
    this.signs = new Signs(this);       // entrance signs + enter/leave toasts (src/coruscant/signs.js)
    this.senate = new Senate(this);     // sessions, scenarios, votes, the session board (src/senate/senate.js)
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
    // the save is flushed when the tab is hidden / closed (writes are otherwise debounced)
    window.addEventListener('beforeunload', () => this.persistNow());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') this.persistNow(); });
    this.input.onKeyDown = (e) => {
      if (this.loading) return;
      if (e.code === 'Escape') {
        if (this.hud.screen === 'admin') { this.closeScreen(); return; }
        if (this.hud.screen === 'pause' || this.hud.screen === 'inventory' || this.hud.screen === 'chest') this.closeScreen();
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
      if (e.code === 'KeyE') { if (this.hud.screen === 'inventory' || this.hud.screen === 'chest') this.closeScreen(); else if (!this.hud.screen) this.openScreen('inventory'); }
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
    if ((this.hud.screen === 'shop' || this.hud.screen === 'jobs') && this.economy) this.economy.closeUI();
    if (this.hud.screen === 'chest') this.closeChest();
    // a stack still on the cursor goes back into the inventory (or onto the ground when that is full), like Minecraft
    const cur = this.hud.cursorItem;
    if (cur && cur.count > 0 && (this.hud.screen === 'chest' || this.hud.screen === 'inventory')) {
      const left = this.inventory.addStack(cur.id, cur.count);
      if (left > 0) this.dropInFront(cur.id, left);
    }
    this.hud.screen = null;
    this.hud.cursorItem = null;
    this.input.requestLock();
  }
  // How much of each far region's look applies at this position (soft bands so the sky never snaps).
  regionMix(x, z) {
    const sp = REGIONS.space, co = REGIONS.coruscant;
    const dS = Math.max(Math.abs(x - sp.cx), Math.abs(z - sp.cz)) - sp.half;        // <0 inside the void box
    const dP = Math.max(Math.abs(x - co.cx), Math.abs(z - co.cz)) - co.half;        // <0 on the plateau
    const dC = dP - (co.reach || 0);                                                // <0 anywhere over the lower city too
    // the lower-city look (cooler haze, no clouds) is full over the basin, fades in over the last 40 blocks of the rim
    // and out over 120 blocks of sea beyond the wall; the Coruscant smog holds over the whole basin
    const lower = dP <= -40 ? 0 : dP <= 0 ? (dP + 40) / 40 : dC <= 0 ? 1 : Math.max(0, 1 - dC / 120);
    return { space: Math.max(0, Math.min(1, (200 - dS) / 400)), coruscant: Math.max(Math.max(0, Math.min(1, (160 - dC) / 320)), lower), lower };
  }
  // 'creative' | 'survival' (docs/ROUND6_PLAN.md): creative = flight, frozen hunger, no damage, infinite stacks,
  // instant break; survival = the Minecraft rules. Flight granted by ?fly=1 or the admin panel survives a switch.
  get mode() { return this.player ? this.player.mode : 'creative'; }
  setMode(mode, { persist = true, announce = true } = {}) {
    const p = this.player;
    if (!p || (mode !== 'creative' && mode !== 'survival')) return false;
    const was = p.mode;
    p.mode = mode;
    this.inventory.infinite = mode === 'creative';
    if (mode === 'survival' && p.flying && !p.allowFlight) { p.flying = false; p.fallDistance = 0; }
    if (announce && was !== mode && this.hud && this.hud.addMessage) this.hud.addMessage(mode === 'creative' ? 'Creative mode: flight, no hunger, infinite blocks.' : `Survival mode: hunger and damage are on${p.allowFlight ? '' : ', flight is off'}.`);
    if (persist && this.save) this.persistState();
    return true;
  }
  cycleRenderDistance() {
    const opts = [4, 6, 8, 10, 12, 16, 24, 32];   // above the preset's near cap the far-LOD layer (render/farlod.js) takes over
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
    const surface = this.world.surfaceY(Math.floor(s.x), Math.floor(s.z));
    this.player.respawn(s.x, surface >= 0 ? surface + 1 : s.y, s.z);
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
    if (this.farLod) this.farLod.update(dt, this.player.pos, this.sky.fogFar);   // far tiles stream (<= 2 ms/frame) and follow the near ring

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
    this.poseHeldItem(held);
    this.animateEating();

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
    this.tickCount++;
    this.updateEating(playing);
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
    if (this.doors && this.npcs) this.doors.update(this.npcs.list, this.player); // NPCs open doors ahead, close behind
    if (this.economy) this.economy.tick();
    if (this.signs) this.signs.update(this.player);
    if (this.senate) this.senate.tick();
    this.tickCrops();
    this.tickCooking();
    // online, the network client steps the disaster clock against the server tick instead
    if (this.disasters && !(this.net && this.net.connected && this.net.drivesDisasterClock)) this.disasters.simTick();
    if (this.net) this.net.tick();
    if (this.breakCooldown > 0) this.breakCooldown -= TICK_DT;
    if (this.placeCooldown > 0) this.placeCooldown -= TICK_DT;
    if (this.attackCooldown > 0) this.attackCooldown -= TICK_DT;
    if (this.tickCount % AUTOSAVE_TICKS === 0) this.persistState();
  }

  // ---------------------------------------------------------------------------
  // Gameplay systems: eating, crops, cooking, chests, animal drops, persistence
  // ---------------------------------------------------------------------------
  // Holding the use key with food selected eats it (1.6 s, chewing every 0.3 s); blocks with their own use action
  // (doors, chests, a furnace that can cook the held item) take priority, and eating is impossible at full hunger.
  updateEating(playing) {
    const p = this.player, held = this.inventory.held;
    const food = held ? foodOf(held.id) : null;
    const blockHasUse = this.lastHit && this.blockUseAction(this.lastHit, held);
    if (playing && !p.dead && food && this.input.mouseDown[2] && !blockHasUse) {
      if (p.food >= 20) {
        if (this.input.mouseClicked[2] && this.time - (this.notHungryAt || -9) > 3) { this.notHungryAt = this.time; this.hud.addMessage('You are not hungry.'); }
        p.stopEating();
        return;
      }
      const r = p.eatTick(held.id, food);
      if (r === 'done') { this.inventory.consume(this.inventory.selected, 1); this.hud.xp = Math.min(1, this.hud.xp + 0.005); }
    } else p.stopEating();
  }
  // Non-block items are flat quads without the pixel thickness Minecraft extrudes, so the oblique flat-block pose of
  // hand.js shows them edge-on; turn them towards the camera at a slight angle so the icon reads in first person.
  poseHeldItem(held) {
    const m = this.hand.blockMesh;
    if (!m || !held || !isItem(held.id)) return;
    m.rotation.set(-0.2, -0.35, 0.12);
    m.position.x -= 0.06; m.position.y += 0.06;
  }
  // Eating animation: the held item is pulled towards the mouth and bobs with each bite (applied on top of hand.js).
  animateEating() {
    const e = this.player.eating, m = this.hand.blockMesh;
    if (!e || !m) return;
    const k = Math.min(1, e.ticks / 4);
    const bite = Math.abs(Math.cos(this.time * Math.PI / 0.2)); // one bob every 4 ticks, like Minecraft's eat transform
    m.position.x -= 0.38 * k; m.position.y += (0.26 + bite * 0.08) * k; m.position.z += 0.1 * k;
    m.rotation.x += 0.45 * k; m.rotation.z += 0.3 * k;
  }

  // Crops advance one stage every cropStageTicks (age is kept in the crop's block entity so growth survives reloads).
  tickCrops() {
    const world = this.world;
    if (!world.blockEntities.size || this.tickCount % 10 !== 0) return;
    for (const ent of world.blockEntities.values()) {
      if (ent.type !== 'crop') continue;
      ent.age = (ent.age || 0) + 10;
      if (ent.age < this.cropStageTicks) continue;
      const def = BLOCKS[world.getBlock(ent.x, ent.y, ent.z)];
      const next = def.growth >= 0 ? WHEAT_STAGES[def.growth + 1] : undefined;
      if (next === undefined) { // mature (or the crop is gone): nothing left to grow
        if (world.isLoaded(ent.x, ent.z)) { world.removeBlockEntity(ent.x, ent.y, ent.z); this.save.setEntity(ent.x, ent.y, ent.z, null); }
        continue;
      }
      if (!world.setBlock(ent.x, ent.y, ent.z, next)) continue; // chunk not loaded: retry later
      ent.age = 0;
      this.save.recordEdit(ent.x, ent.y, ent.z, next);
      if (BLOCKS[next].growth === WHEAT_STAGES.length - 1) { world.removeBlockEntity(ent.x, ent.y, ent.z); this.save.setEntity(ent.x, ent.y, ent.z, null); }
      else this.save.setEntity(ent.x, ent.y, ent.z, ent);
      this.terrain.remeshDirtyNear(this.player.pos.x, this.player.pos.z);
    }
  }

  // Furnace: right-click with raw meat cooks one piece, with wheat bakes bread from 3 wheat (3 s each; see report)
  startCooking(x, y, z, held) {
    const cooked = cookedOf(held.id);
    const bakes = held.id === I.WHEAT;
    if (!cooked && !bakes) return false;
    if (this.cooking) { this.hud.addMessage('The furnace is busy.'); return true; }
    if (bakes && this.inventory.count(I.WHEAT) < 3) { this.hud.addMessage('Baking bread takes 3 wheat.'); return true; }
    if (bakes) this.inventory.remove(I.WHEAT, 3); else this.inventory.consume(this.inventory.selected, 1);
    this.cooking = { x, y, z, out: bakes ? I.BREAD : cooked, n: 1, ticks: COOK_TICKS };
    this.audio.sizzle({ x: x + 0.5, y: y + 0.5, z: z + 0.5 });
    this.hud.addMessage(bakes ? 'Baking bread...' : `Cooking ${displayName(held.id)}...`);
    return true;
  }
  tickCooking() {
    const c = this.cooking;
    if (!c) return;
    c.ticks--;
    if (c.ticks % 20 === 10) this.audio.sizzle({ x: c.x + 0.5, y: c.y + 0.5, z: c.z + 0.5 });
    if (c.ticks % 5 === 0) this.particles.smoke(c.x + 0.5, c.y + 1.05, c.z + 0.5);
    if (c.ticks > 0) return;
    this.cooking = null;
    const left = this.inventory.addStack(c.out, c.n);
    if (left > 0) this.drops.spawn(c.out, c.x + 0.5, c.y + 1.2, c.z + 0.5, left);
    this.audio.pop();
    this.hud.addMessage(`${displayName(c.out)} is ready.`);
  }

  // Chests: contents live in world.blockEntities and the save; town chests get deterministic loot on first use.
  chestEntity(x, y, z) {
    let ent = this.world.getBlockEntity(x, y, z);
    if (ent && ent.type === 'chest' && Array.isArray(ent.slots)) return ent;
    ent = this.world.setBlockEntity(x, y, z, { type: 'chest', slots: this.chestLoot(x, y, z) });
    this.save.setEntity(x, y, z, ent);
    return ent;
  }
  chestLoot(x, y, z) {
    const rng = new RNG(Math.floor(hash3(x, y, z, WORLD_SEED) * 0xffffffff));
    const slots = new Array(CHEST_SLOTS).fill(null);
    for (const [id, lo, hi, p] of CHEST_LOOT) {
      if (!rng.chance(p)) continue;
      let s = rng.int(0, CHEST_SLOTS - 1);
      while (slots[s]) s = (s + 1) % CHEST_SLOTS;
      slots[s] = { id, count: rng.int(lo, hi) };
    }
    return slots;
  }
  openChest(x, y, z) {
    const ent = this.chestEntity(x, y, z);
    this.hud.chest = { x, y, z, entity: ent };
    this.openScreen('chest');
    this.audio.chestOpen({ x: x + 0.5, y: y + 0.5, z: z + 0.5 });
  }
  closeChest() {
    const c = this.hud.chest;
    if (!c) return;
    this.hud.chest = null;
    if (this.world.getBlockEntity(c.x, c.y, c.z) === c.entity) this.save.setEntity(c.x, c.y, c.z, c.entity);
    this.audio.chestClose({ x: c.x + 0.5, y: c.y + 0.5, z: c.z + 0.5 });
  }
  onChestChanged() { const c = this.hud.chest; if (c) this.save.setEntity(c.x, c.y, c.z, c.entity); }
  // A block carrying an entity was replaced (player, NPC or disaster): chest contents spill out as item entities.
  onBlockEntityLost(x, y, z, ent) {
    this.world.removeBlockEntity(x, y, z);
    this.save.setEntity(x, y, z, null);
    if (ent.type === 'chest' && Array.isArray(ent.slots)) {
      for (const s of ent.slots) if (s && s.count > 0) this.drops.spawn(s.id, x + 0.5, y + 0.5, z + 0.5, s.count, { x: (Math.random() - 0.5) * 0.15, y: 0.2, z: (Math.random() - 0.5) * 0.15 });
      if (this.hud.chest && this.hud.chest.x === x && this.hud.chest.y === y && this.hud.chest.z === z && this.hud.screen === 'chest') this.closeScreen();
    }
  }

  // Animal drops (Minecraft loot): cow 1-3 beef + 0-2 leather, pig 1-3 porkchop, chicken 1 chicken + 0-2 feathers,
  // horse 0-2 leather.
  onAnimalDeath(a) {
    const rng = a.rng;
    const loot = a.type === 'cow' ? [[I.BEEF_RAW, rng.int(1, 3)], [I.LEATHER, rng.int(0, 2)]]
      : a.type === 'pig' ? [[I.PORKCHOP_RAW, rng.int(1, 3)]]
      : a.type === 'chicken' ? [[I.CHICKEN_RAW, 1], [I.FEATHER, rng.int(0, 2)]]
      : a.type === 'horse' ? [[I.LEATHER, rng.int(0, 2)]] : [];
    for (const [id, n] of loot) {
      if (n <= 0) continue;
      this.drops.spawn(id, a.pos.x, a.pos.y + 0.4, a.pos.z, n, { x: rng.range(-0.08, 0.08), y: 0.18, z: rng.range(-0.08, 0.08) });
    }
    this.hud.xp = Math.min(1, this.hud.xp + 0.02);
  }
  attackAnimal(ah) {
    if (this.attackCooldown > 0) return;
    this.attackCooldown = ATTACK_COOLDOWN;
    this.animals.hit(ah.animal, this.player.pos, 1);
  }

  // Drops a stack in front of the player (inventory overflow when closing a screen)
  dropInFront(id, count) {
    const d = this.player.forwardDir(new THREE.Vector3());
    const p = this.player.pos;
    this.drops.spawn(id, p.x + d.x * 0.6, p.y + 1.2, p.z + d.z * 0.6, count, { x: d.x * 0.15, y: 0.1, z: d.z * 0.15 });
  }

  // Player state + inventory snapshots (debounced writes); flushed immediately when the page hides / unloads.
  persistState(force = false) {
    if (!this.save || !this.player || this.player.dead) return;
    const p = this.player;
    // the vehicle tick goes with the player so a reload puts the space train where it was (a rider is not stranded)
    this.save.setPlayer({ x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw, pitch: p.pitch, health: p.health, food: p.food, saturation: p.saturation, mode: p.mode, vehicleTick: this.vehicles ? this.vehicles.tickCount : 0 });
    this.save.setInventory(this.inventory.serialize());
    // the economy blob (the whole city) is written when dirty on the 1 Hz path and always on a flush-now
    if (this.economy) this.economy.persist(force);
  }
  persistNow() {
    if (!this.save) return;
    this.persistState(true);
    const c = this.hud && this.hud.chest;
    if (c) this.save.setEntity(c.x, c.y, c.z, c.entity);
    this.save.flush();
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
      case 'chew': this.audio.chew(); break;
      case 'eat': this.audio.burp(); break;
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
    let animalHit = null;
    if (!entityHit && this.animals && playing) {
      const ah = this.animals.raycast(eye, dir, hit ? hit.dist : REACH + 1.5);
      if (ah) { this.lookingAtName = ah.name; animalHit = ah; if (hit && ah.dist < hit.dist) hit = null; }
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
          this.breakProgress += p.creative ? 1 : dt / def.hardness;   // creative breaks instantly (with the normal cooldown)
          this.hitSoundTimer -= dt;
          if (this.hitSoundTimer <= 0) { this.hitSoundTimer = 0.25; this.audio.hit(def.sound, hit.point); this.particles.blockHit(hit, hit.id); }
          if (this.breakProgress >= 1) this.breakBlock(hit);
        }
      } else {
        this.breakTarget = null; this.breakProgress = 0;
        if (this.input.mouseClicked[0]) {
          this.hand.startSwing();
          if (entityHit) this.npcs.poke(entityHit.npc, this);
          else if (animalHit) this.attackAnimal(animalHit); // melee: 1 damage, knockback, flee
        }
      }
    } else {
      this.breakTarget = null; this.breakProgress = 0;
    }
    this.crack.show(this.breakTarget ? hit : null, this.breakProgress);

    // placing / interacting (doors, chests, furnace and planting are "use" actions that come before placement)
    const useClick = this.input.mouseClicked[2];
    if (playing && !p.dead && (useClick || (this.input.mouseDown[2] && this.placeCooldown <= 0))) {
      // vehicles (ships) take the click when they are the nearest thing under the crosshair; a flyer can hail a
      // passing ship from further out (ships cruise at 20-46 blocks/s, faster than anyone flies) and board it
      // through the airlock - see ShipVehicle.onUse
      const vReach = p.flying && !hit ? FLY_HAIL_REACH : REACH;
      const vhit = useClick && this.vehicles ? this.vehicles.raycast(eye, dir, vReach) : null;
      if (vhit && (!hit || vhit.dist < hit.dist)) { if (vhit.vehicle.onUse(p, this, vhit)) { this.hand.startSwing(); this.placeCooldown = 0.5; } }
      else if (entityHit && !hit) { this.npcs.talk(entityHit.npc, this); this.hand.startSwing(); this.placeCooldown = 0.5; }
      else if (useClick && this.economy && this.economy.onUseClick(eye, dir, hit)) { this.hand.startSwing(); this.placeCooldown = 0.5; } // shop consoles, job boards, repair markers, your bed
      else if (hit && this.useBlock(hit, useClick)) { this.hand.startSwing(); }
      else if (hit && !p.eating) this.placeBlock(hit);
      this.placeCooldown = useClick ? 0.25 : 0.2;
    }
  }

  // What right-clicking `hit` with `held` would do (besides placing): 'door' | 'chest' | 'cook' | 'plant' | null
  blockUseAction(hit, held) {
    const def = BLOCKS[hit.id];
    if (def.door) return 'door';
    if (def.blockEntity === 'chest') return 'chest';
    if (hit.id === B.FURNACE && held && (cookedOf(held.id) || held.id === I.WHEAT)) return 'cook';
    if (hit.id === B.FARMLAND && hit.face === 2 && held && held.id === I.SEEDS) return 'plant';
    return null;
  }
  // Performs the use action; returns true when the click was consumed (nothing gets placed then).
  useBlock(hit, click) {
    const held = this.inventory.held;
    const action = this.blockUseAction(hit, held);
    if (!action) return false;
    if (action === 'plant') return this.plantSeeds(hit.x, hit.y + 1, hit.z);
    if (!click) return true; // doors / chests / cooking react to clicks, not to a held button
    if (action === 'door') {
      const r = this.doors.toggle(hit.x, hit.y, hit.z);
      if (r) {
        this.onPlayerEdit(r.x, r.y, r.z, this.world.getBlock(r.x, r.y, r.z));
        this.onPlayerEdit(r.x, r.y + 1, r.z, this.world.getBlock(r.x, r.y + 1, r.z));
        this.terrain.remeshDirtyNear(this.player.pos.x, this.player.pos.z);
      }
      return true;
    }
    if (action === 'chest') { this.openChest(hit.x, hit.y, hit.z); return true; }
    if (action === 'cook') return this.startCooking(hit.x, hit.y, hit.z, held);
    return false;
  }
  plantSeeds(x, y, z) {
    const world = this.world;
    if (world.getBlock(x, y, z) !== B.AIR || !world.isLoaded(x, z)) return false;
    world.setBlock(x, y, z, WHEAT_STAGES[0]);
    const ent = world.setBlockEntity(x, y, z, { type: 'crop', age: 0 });
    this.save.setEntity(x, y, z, ent);
    this.inventory.consume(this.inventory.selected, 1);
    this.audio.placeBlock('grass', new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5));
    this.hand.startSwing();
    this.terrain.remeshDirtyNear(this.player.pos.x, this.player.pos.z);
    this.onPlayerEdit(x, y, z, WHEAT_STAGES[0]);
    return true;
  }
  // Drops for a broken block: crops give wheat + seeds when mature (a seed otherwise), oak leaves an apple 1/200,
  // everything else its `drop` id.
  spawnBlockDrops(id, x, y, z) {
    const def = BLOCKS[id];
    const at = (item, n = 1) => this.drops.spawn(item, x + 0.5, y + 0.3, z + 0.5, n);
    if (def.growth >= 0) {
      if (def.growth === WHEAT_STAGES.length - 1) { at(I.WHEAT, 1); at(I.SEEDS, 1 + Math.floor(Math.random() * 3)); }
      else at(I.SEEDS, 1);
      return;
    }
    if (def.drop) at(def.drop);
    if (id === B.OAK_LEAVES && Math.random() < 1 / 200) at(I.APPLE);
  }

  breakBlock(hit) {
    const def = BLOCKS[hit.id];
    const world = this.world;
    this.particles.blockBreak(hit.x, hit.y, hit.z, hit.id);
    this.audio.breakBlock(def.sound, hit.point);
    if (def.blockEntity === 'chest') this.chestEntity(hit.x, hit.y, hit.z); // never-opened town chest: roll its loot so it spills
    world.setBlock(hit.x, hit.y, hit.z, B.AIR); // block entities (chest contents) spill via onBlockEntityLost
    // multi-block structures
    if (def.door) { // the other half: closed doors know which half they are, open halves share one id
      let other;
      if (def.doorTop) other = hit.y - 1;
      else if (!def.doorOpen) other = hit.y + 1;
      else other = BLOCKS[world.getBlock(hit.x, hit.y - 1, hit.z)].doorOpen ? hit.y - 1 : hit.y + 1;
      if (BLOCKS[world.getBlock(hit.x, other, hit.z)].door === def.door) { world.setBlock(hit.x, other, hit.z, B.AIR); this.onPlayerEdit(hit.x, other, hit.z, B.AIR); }
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
      this.spawnBlockDrops(above, hit.x, hit.y + 1, hit.z);
      this.onPlayerEdit(hit.x, hit.y + 1, hit.z, B.AIR);
    }
    this.spawnBlockDrops(hit.id, hit.x, hit.y, hit.z);
    this.terrain.remeshDirtyNear(this.player.pos.x, this.player.pos.z);
    this.breakProgress = 0;
    this.breakTarget = null;
    this.breakCooldown = 0.25;
    this.hud.xp = Math.min(1, this.hud.xp + 0.004);
    if (this.npcs) this.npcs.onWorldChanged(hit.x, hit.y, hit.z);
    if (this.economy) this.economy.onBlockBroken(hit.x, hit.y, hit.z); // cleanup jobs count broken debris
    this.onPlayerEdit(hit.x, hit.y, hit.z, B.AIR);
  }

  // Player edits persist to the save (unless the cell belongs to an active disaster) and replicate online.
  onPlayerEdit(x, y, z, id) {
    if (this.save) this.save.recordEdit(x, y, z, id);
    if (this.net && this.net.connected) this.net.sendBlock(x, y, z, id);
  }

  placeBlock(hit) {
    const held = this.inventory.held;
    if (!held || isItem(held.id)) return; // items (food, wheat, ...) are never placed as blocks
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
    if (def.door) {
      if (!canReplace(world, x, y + 1, z)) return;
      const set = DOOR_SETS[def.door];
      world.setBlock(x, y, z, set.bottom);   // doors are placed closed
      world.setBlock(x, y + 1, z, set.top);
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
    if (def.blockEntity === 'chest') { const ent = world.setBlockEntity(x, y, z, { type: 'chest', slots: new Array(CHEST_SLOTS).fill(null) }); this.save.setEntity(x, y, z, ent); }
    this.inventory.consume(this.inventory.selected, 1);
    this.audio.placeBlock(def.sound, new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5));
    this.hand.startSwing();
    this.terrain.remeshDirtyNear(this.player.pos.x, this.player.pos.z);
    if (this.npcs) this.npcs.onWorldChanged(x, y, z);
    this.onPlayerEdit(x, y, z, this.world.getBlock(x, y, z));
    if (def.door) this.onPlayerEdit(x, y + 1, z, this.world.getBlock(x, y + 1, z));
  }

  debugLines() {
    const p = this.player.pos;
    const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
    const facing = ['south (+z)', 'west (-x)', 'north (-z)', 'east (+x)'][Math.round(((this.player.yaw % (Math.PI * 2)) + Math.PI * 2) / (Math.PI / 2)) % 4];
    const lines = [
      `Frontier Craft  build ${BUILD}  ${this.fps} fps  (js ${(this.jsMs || 0).toFixed(1)} ms)  T: ${this.terrain.stats.meshed} meshes / ${this.terrain.stats.chunks} chunks`,
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
