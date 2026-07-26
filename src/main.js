// ============================================================================
// NORTHSTAR RESCUE - entry point & game orchestrator (Opus 1 ownership)
// Single-player tactical FPS. Stack: Three.js WebGL2 + vanilla ES modules.
// ============================================================================
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { bus } from './core/events.js';
import { Rng } from './core/rng.js';
import { settings } from './core/settings.js';
import { Input } from './core/input.js';
import { GameLoop } from './core/loop.js';
import { installTestHooks } from './core/testhooks.js';
import { World } from './world/world.js';
import { Lighting } from './world/lighting.js';
import { SPAWN } from './world/layout.js';
import { Player } from './player/player.js';
import { WeaponSystem } from './player/weapons.js';
import { AIManager } from './ai/aimanager.js';
import { Mission } from './game/mission.js';
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from './game/difficulty.js';
import { FX } from './fx/fx.js';
import { AudioSys } from './audio/audio.js';
import { UI } from './ui/ui.js';
import { installQA } from './dev/qa.js';
import { installCharacters } from './assets/characters.js';
import { installViewmodel } from './player/viewmodel.js';
// prop libraries register themselves with the asset registry on import
import './assets/props_office.js';
import './assets/props_facility.js';
import './assets/props_clutter.js';

const Game = {
  state: 'boot',
  rng: new Rng(20260101),
  tickTimers: [],
  pickups: [],
  characters: null,   // installed by the character module (Fable 4)
  viewmodel: null,    // installed by the viewmodel module (Fable 4)

  async init() {
    // test/CI helper: force cheap rendering without persisting settings
    const params = new URLSearchParams(location.search);
    if (params.has('lowspec')) {
      settings.data.quality = 'low';
      settings.data.renderScale = 0.5;
    }
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas, antialias: true, powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(settings.get('fov'), 16 / 9, 0.05, 260);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;
    this.scene.environmentIntensity = 0.32;

    this.input = new Input(this.canvas);
    this.ui = new UI(this);
    this.audio = new AudioSys(this);
    this.loop = new GameLoop((dt) => this.update(dt), (a) => this.render(a));

    this._applySize();
    window.addEventListener('resize', () => this._applySize());
    bus.on('settings-changed', (k) => {
      if (k === 'fov' || k === 'renderScale') this._applySize();
      if (k === 'quality') { this.lighting?.applyQuality(); this._applySize(); }
    });

    // boot sequence with progress
    const step = async (f, label) => { this.ui.bootProgress(f, label); await nextFrame(); };
    await step(0.08, 'Compiling materials');
    this.world = new World(this);
    await step(0.16, 'Building Northstar Administrative Center');
    this.world.build();
    await step(0.55, 'Baking navigation');
    this.ai = new AIManager(this);
    this.ai.buildNav();
    await step(0.72, 'Lighting pass');
    this.lighting = new Lighting(this);
    this.lighting.setFixtures(this.world.lights);
    this.fx = new FX(this);
    await step(0.86, 'Arming systems');
    this.player = new Player(this);
    this.weapons = new WeaponSystem(this);
    installCharacters(this);
    installViewmodel(this);
    this.mission = null;
    this.difficultyName = DEFAULT_DIFFICULTY;
    this.difficulty = DIFFICULTIES[DEFAULT_DIFFICULTY];

    installTestHooks(this);
    const qaMode = new URLSearchParams(location.search).has('qa');
    installQA(this, qaMode);

    this._wireGlobalEvents();
    await step(1, 'Ready');
    this.loop.start();
    this.flowTo('title');

    // unlock audio on first interaction
    const unlock = () => { this.audio.ensure(); this.audio.setMusic(this.state === 'title' ? 'menu' : null); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  },

  _applySize() {
    const w = window.innerWidth, h = window.innerHeight;
    const scale = settings.get('renderScale');
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * scale);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.baseFov = settings.get('fov');
    this.camera.fov = this.baseFov;
    this.camera.updateProjectionMatrix();
  },

  // ------------------------------------------------------------- state flow
  flowTo(state) {
    this.state = state;
    if (state === 'title') {
      this.ui.showScreen('title');
      this.input.exitLock();
      this.audio.setMusic('menu');
      this._menuCamT = 0;
    } else if (['settings', 'difficulty', 'briefing', 'loadout', 'pause'].includes(state)) {
      this.ui.showScreen(state === 'pause' ? 'pause' : state);
      if (state === 'pause') this.state = 'paused';
    }
  },

  async beginMission() {
    this.state = 'loading';
    this.ui.showScreen('loading');
    this.ui.showLoadingTip();
    this.ui.loadingProgress(0.1);
    this.audio.setMusic(null);
    await nextFrame();

    this.difficultyName = this.ui.selectedDifficulty;
    this.difficulty = DIFFICULTIES[this.difficultyName] || DIFFICULTIES[DEFAULT_DIFFICULTY];

    // reset dynamic world state
    this.world.resetDynamic();
    this.fx.reset();
    this.tickTimers = [];
    this._clearPickups();
    this.ui.loadingProgress(0.35);
    await nextFrame();

    this.ai.spawnRoster(this.difficultyName);
    this.ui.loadingProgress(0.6);
    await nextFrame();

    this.player.reset(SPAWN.pos, SPAWN.yaw);
    this.player.armor = this.difficulty.playerArmor;
    this.weapons.reset([this.ui.selectedPrimary]);
    this.mission = new Mission(this);
    this.mission.start(this.difficulty);
    this._spawnInitialPickups();
    this.ui.loadingProgress(0.9);
    await nextFrame();

    this.ui.loadingProgress(1);
    await nextFrame();
    this.state = 'playing';
    this.ui.showScreen(null);
    this.ui._hudCache = {};
    if (this.mission) this.mission._objectiveDirty = true;
    this.input.requestLock();
    bus.emit('subtitle', 'Reach the staff entrance and get inside.');
  },

  restartMission() { this.beginMission(); },

  quitToMenu() {
    this.mission = null;
    this.ai.clear();
    this._clearPickups();
    this.flowTo('title');
  },

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.ui.showScreen('pause');
    this.input.exitLock();
  },

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.showScreen(null);
    this.input.requestLock();
  },

  _wireGlobalEvents() {
    bus.on('pointerlock', (locked) => {
      if (!locked && this.state === 'playing' && !this.galleryActive && !this._suppressAutoPause) this.pause();
    });
    bus.on('action-press', (a) => {
      if (a === 'pause') {
        if (this.state === 'playing') this.pause();
        else if (this.state === 'paused' && this.ui.current === 'pause') this.resume();
      }
    });
    this.canvas.addEventListener('mousedown', () => {
      if (this.state === 'playing' && !this.input.pointerLocked) this.input.requestLock();
    });
    bus.on('mission-victory', (stats) => {
      this.state = 'victory';
      this.input.exitLock();
      setTimeout(() => this.ui.showResult('victory', stats), 900);
    });
    bus.on('mission-defeat', (info) => {
      this.state = 'defeat';
      this.input.exitLock();
      setTimeout(() => this.ui.showResult('defeat', info, info.reason), 1200);
    });
    bus.on('weapon-fired', (e) => {
      // first-person fire feedback at the real viewmodel muzzle
      const p = this.player;
      const dir = p.lookDir();
      const eye = p.eyePos();
      const right = p.right();
      let muzzle = this.viewmodel?.getMuzzleWorld?.();
      if (!muzzle) {
        muzzle = {
          x: eye.x + dir.x * 0.5 + right.x * 0.12,
          y: eye.y + dir.y * 0.5 - 0.14,
          z: eye.z + dir.z * 0.5 + right.z * 0.12,
        };
      }
      this.fx.muzzleFlash(muzzle, dir);
      this.fx.shellEject({ x: muzzle.x, y: muzzle.y + 0.05, z: muzzle.z }, right);
    });
  },

  // ------------------------------------------------------------- combat api
  hitscan(origin, dir, maxDist, opts = {}) {
    const wall = this.world.collision.raycast(origin, dir, maxDist, { mode: 'bullet' });
    const ent = this.ai.raycastEntities(origin, dir, maxDist);
    if (ent && (!wall || ent.dist < wall.dist)) {
      return { entity: ent.entity, part: ent.part, dist: ent.dist, point: pAt(origin, dir, ent.dist) };
    }
    if (wall) return { box: wall.box, dist: wall.dist, point: wall.point, normal: wall.normal };
    return null;
  },

  // full penetration-aware hitscan used by player weapons
  hitscanPenetrating(origin, dir, maxDist, weaponDef) {
    const results = [];
    let o = { ...origin };
    let remaining = maxDist;
    let pen = weaponDef.penetration ?? 0;
    let dmgMult = 1;
    let guard = 0;
    let traveled = 0;
    while (guard++ < 6 && remaining > 0.1) {
      const wall = this.world.collision.raycast(o, dir, remaining, { mode: 'bullet' });
      const ent = this.ai.raycastEntities(o, dir, remaining);
      const entFirst = ent && (!wall || ent.dist < wall.dist);
      if (entFirst) {
        const point = pAt(o, dir, ent.dist);
        const dist = traveled + ent.dist;
        const damage = this._weaponDamageAt(weaponDef, dist) * dmgMult;
        this.damageEntity(ent.entity, damage, { part: ent.part, dir, point, weapon: weaponDef.id, headMult: weaponDef.headMult });
        results.push({ kind: 'entity', id: ent.entity.id, part: ent.part, point });
        // bullets can pass through a body once
        if (pen > 0) {
          pen--;
          dmgMult *= 0.45;
          traveled += ent.dist + 0.4;
          o = pAt(o, dir, ent.dist + 0.4);
          remaining -= ent.dist + 0.4;
          continue;
        }
        break;
      }
      if (!wall) {
        this.fx.tracerMaybe?.(origin, pAt(origin, dir, maxDist));
        break;
      }
      const point = wall.point;
      if (wall.box.tag === 'glass' && wall.box.ref) {
        wall.box.ref.onShot(point);
        results.push({ kind: 'glass', point });
        traveled += wall.dist + 0.12;
        o = pAt(o, dir, wall.dist + 0.12);
        remaining -= wall.dist + 0.12;
        continue; // glass barely slows bullets
      }
      this.fx.impact(point, wall.normal, wall.box.material);
      results.push({ kind: 'world', material: wall.box.material, point });
      if (wall.box.penetrable && pen > 0) {
        const thickness = 0.28;
        pen--;
        dmgMult *= 0.5;
        traveled += wall.dist + thickness;
        o = pAt(o, dir, wall.dist + thickness);
        remaining -= wall.dist + thickness;
        // exit puff
        this.fx.impact(pAt(point, dir, thickness), { x: dir.x, y: dir.y, z: dir.z }, wall.box.material);
        continue;
      }
      break;
    }
    // tracer to final point
    const last = results[results.length - 1];
    const end = last ? last.point : pAt(origin, dir, Math.min(maxDist, 60));
    this.fx.tracer({ x: origin.x + dir.x * 0.9, y: origin.y + dir.y * 0.9 - 0.1, z: origin.z + dir.z * 0.9 }, end);
    return results;
  },

  _weaponDamageAt(def, dist) {
    if (!def.falloffStart) return def.damage;
    if (dist <= def.falloffStart) return def.damage;
    const t = Math.min(1, (dist - def.falloffStart) / Math.max(1, def.falloffEnd - def.falloffStart));
    return def.damage * (1 - t * (1 - def.falloffMin));
  },

  damageEntity(entity, amount, info) {
    if (info.part === 'head' && info.headMult) {
      entity.takeDamage(amount * (info.headMult / 3.2), info); // enemy applies 3.2 internally
    } else {
      entity.takeDamage(amount, info);
    }
  },

  onDetonate(proj) {
    if (proj.effect === 'flash') {
      this.ai.flashAt({ x: proj.pos.x, y: proj.pos.y + 0.4, z: proj.pos.z });
      this.audio.play('flashbang', { pos: proj.pos, vol: 1 });
      this.fx.muzzleFlash(proj.pos, { x: 0, y: 1, z: 0 });
    } else if (proj.effect === 'smoke') {
      this.fx.smokeVolume(proj.pos);
      this.audio.play('smoke_pop', { pos: proj.pos });
    }
  },

  // ------------------------------------------------------------- interaction
  queryInteract(eye, dir, range) {
    // doors via ray
    const hit = this.world.collision.raycast(eye, dir, range, { mode: 'solid' });
    if (hit && hit.box.tag === 'door' && hit.box.ref) {
      const door = hit.box.ref;
      if (door.id === 'shutter_exit') return null; // mission-controlled
      return { type: 'door', ref: door, prompt: door.interactPrompt(), pos: door.center() };
    }
    // hostages: proximity + facing
    for (const h of this.ai.hostages) {
      if (!h.alive) continue;
      const d = dist3(eye, { x: h.pos.x, y: h.pos.y + 1, z: h.pos.z });
      if (d < 2.4) {
        const to = norm3({ x: h.pos.x - eye.x, y: h.pos.y + 1 - eye.y, z: h.pos.z - eye.z });
        const dot = to.x * dir.x + to.y * dir.y + to.z * dir.z;
        if (dot > 0.5) {
          const prompt = h.interactPrompt();
          if (prompt) return { type: 'hostage', ref: h, prompt, pos: h.pos };
        }
      }
    }
    // pickups
    for (const k of this.pickups) {
      const d = dist3(eye, { x: k.pos.x, y: k.pos.y + 0.3, z: k.pos.z });
      if (d < 2.0) return { type: 'pickup', ref: k, prompt: k.prompt, pos: k.pos };
    }
    // extraction panel
    for (const it of this.world.interactables) {
      if (it.type !== 'panel') continue;
      const d = dist3(eye, it.pos);
      if (d < it.radius + 0.6) {
        const ready = this.ai.hostages.every((h) => h.state !== 'captive' && h.alive);
        return {
          type: 'panel', ref: it,
          prompt: this.mission?.panelUsed ? 'Evac inbound — hold the garage' : (ready ? 'Activate dock shutter (call evac)' : 'Dock panel — secure all hostages first'),
          pos: it.pos,
        };
      }
    }
    return null;
  },

  doInteract(target) {
    if (target.type === 'door') target.ref.toggle(this.player.pos);
    else if (target.type === 'hostage') {
      const h = target.ref;
      if (h.state === 'captive') h.secure();
      else h.toggleFollow();
    } else if (target.type === 'pickup') this._applyPickup(target.ref);
    else if (target.type === 'panel') this.mission?.usePanel();
  },

  // ------------------------------------------------------------- pickups
  spawnPickup(kind, pos, data = {}) {
    const colors = { ammo: 0xc8a648, medkit: 0xd05548, armor: 0x4d8fc4, keycard: 0x8fd8ff };
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(kind === 'keycard' ? 0.16 : 0.3, kind === 'keycard' ? 0.03 : 0.16, kind === 'keycard' ? 0.1 : 0.22),
      new THREE.MeshStandardMaterial({ color: colors[kind] || 0xffffff, roughness: 0.5, emissive: colors[kind] || 0, emissiveIntensity: 0.25 }));
    mesh.position.set(pos.x, pos.y + 0.14, pos.z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    const prompts = { ammo: 'Take ammunition', medkit: 'Take first-aid kit', armor: 'Take armor vest', keycard: 'Take security keycard' };
    const p = {
      id: kind + '_' + (this.pickups.length + 1) + '_' + Math.floor(this.loop.tick),
      kind, pos: { ...pos }, mesh, data, prompt: prompts[kind] || 'Take item',
      baseY: pos.y + 0.14,
    };
    this.pickups.push(p);
    return p;
  },

  _applyPickup(p) {
    if (p.kind === 'ammo') {
      for (const s of Object.values(this.weapons.slots)) {
        if (s.def.kind === 'gun') s.reserve = Math.min(s.def.reserve * 2, s.reserve + Math.ceil(s.def.mag * 1.5));
      }
      bus.emit('subtitle', 'Ammunition restocked.');
    } else if (p.kind === 'medkit') {
      if (this.player.health >= 100) { bus.emit('subtitle', 'Health already full.'); return; }
      this.player.heal(45);
    } else if (p.kind === 'armor') {
      this.player.armor = Math.min(100, this.player.armor + 50);
    } else if (p.kind === 'keycard') {
      for (const id of p.data.unlocks || []) this.world.doorById(id)?.unlock();
      bus.emit('subtitle', 'Keycard acquired — server room access granted.');
    }
    this.audio.play('keycard', { vol: 0.6 });
    this.scene.remove(p.mesh);
    this.pickups = this.pickups.filter((x) => x !== p);
  },

  _spawnInitialPickups() {
    this.spawnPickup('medkit', { x: -35.5, y: 0, z: -6.5 });       // first aid room
    this.spawnPickup('medkit', { x: 10.5, y: 0, z: -20.5 });       // breakroom counter area
    this.spawnPickup('armor', { x: 25.5, y: 0, z: -9 });           // security office
    this.spawnPickup('ammo', { x: 15, y: 0, z: 5.5 });             // loading area
    this.spawnPickup('ammo', { x: -25, y: 3.6, z: -10.5 });        // upper landing
    this.spawnPickup('keycard', { x: 27.5, y: 0, z: -8.5, }, { unlocks: ['d_server_corr'] }); // security desk
  },

  _clearPickups() {
    for (const p of this.pickups) this.scene.remove(p.mesh);
    this.pickups = [];
  },

  // ------------------------------------------------------------- main loop
  update(dt) {
    // scheduled tick callbacks
    if (this.tickTimers.length) {
      const now = this.loop.tick;
      const due = this.tickTimers.filter((t) => t.at <= now);
      this.tickTimers = this.tickTimers.filter((t) => t.at > now);
      for (const t of due) t.fn();
    }

    if (this.state === 'playing') {
      this.player.update(dt, this.input, this.world);
      this.weapons.update(dt, this.input, this.player, this.world);
      this.world.update(dt);
      this.ai.update(dt);
      this.mission?.update(dt);
      this.fx.update(dt);
      const room = this.world.roomAt(this.player.pos.x, this.player.pos.z, this.player.pos.y);
      this.audio.updateAmbience(room?.style, dt);
      // pickup bob
      for (const p of this.pickups) {
        p.mesh.position.y = p.baseY + Math.sin(this.loop.simTime * 2 + p.baseY) * 0.03;
        p.mesh.rotation.y += dt * 1.2;
      }
    } else if (this.state === 'victory' || this.state === 'defeat') {
      this.fx.update(dt);
      this.ai.update(dt); // let deaths finish animating
    }
    this.input.endTick();
  },

  render(elapsed) {
    // camera
    if (this.state === 'playing' || this.state === 'paused' || this.state === 'victory' || this.state === 'defeat') {
      const pose = this.player.cameraPose();
      this.camera.position.set(pose.x, pose.y, pose.z);
      this.camera.rotation.set(pose.pitch, pose.yaw, pose.roll);
      // ADS fov blend
      const def = this.weapons.currentDef();
      const zoom = def.adsZoom || 1;
      const target = this.baseFov / (1 + (zoom - 1) * this.weapons.adsFactor());
      if (Math.abs(this.camera.fov - target) > 0.05) {
        this.camera.fov += (target - this.camera.fov) * 0.35;
        this.camera.updateProjectionMatrix();
      }
    } else if (this.state === 'title' || ['settings', 'difficulty', 'briefing', 'loadout'].includes(this.state)) {
      // slow menu pan through the lobby
      this._menuCamT = (this._menuCamT || 0) + elapsed * 0.05;
      const t = this._menuCamT;
      this.camera.position.set(-26 + Math.sin(t) * 3.5, 2.2 + Math.sin(t * 0.7) * 0.4, 1 + Math.cos(t * 0.8) * 3.5);
      this.camera.rotation.set(-0.06 + Math.sin(t * 0.5) * 0.04, Math.PI / 2 + Math.sin(t * 0.33) * 0.5, 0);
      if (this.camera.fov !== this.baseFov) { this.camera.fov = this.baseFov; this.camera.updateProjectionMatrix(); }
    }

    this.lighting?.update(elapsed);
    if (this.state === 'playing' || this.state === 'paused') this.ui.updateHUD();
    this.renderer.render(this.scene, this.camera);
    // first-person viewmodel overlay (own scene, rendered over the frame)
    if (this.viewmodel && (this.state === 'playing' || this.state === 'paused')) {
      this.viewmodel.update(elapsed || 1 / 60);
      this.viewmodel.renderPass(this.renderer);
    }
  },
};

window.NSR = Game;

function nextFrame() { return new Promise((r) => requestAnimationFrame(() => r())); }
function pAt(o, d, t) { return { x: o.x + d.x * t, y: o.y + d.y * t, z: o.z + d.z * t }; }
function dist3(a, b) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }
function norm3(v) { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; }

Game.init().catch((e) => {
  console.error('[boot] fatal init error', e);
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#e0554a;background:#0b1521;font-family:monospace;z-index:99';
  el.textContent = 'Failed to start: ' + e.message;
  document.body.appendChild(el);
});
