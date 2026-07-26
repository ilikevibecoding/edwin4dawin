import * as THREE from 'three';
import { Engine } from '../core/engine';
import { clock } from '../core/clock';
import { input } from '../core/input';
import { events } from '../core/events';
import { settings } from '../core/settings';
import { audio } from '../core/audio';
import { Rng } from '../core/rng';
import { buildWorld, type WorldModel } from '../world/mapbuilder';
import { LightingRig } from '../world/lighting';
import { SnowEnvironment } from '../world/snow';
import { NavGrid } from './nav';
import { Player } from './player';
import { CombatSystem } from './combat';
import { WeaponRig } from './weapons/weapons';
import { WEAPONS } from './weapons/defs';
import { ViewModel } from '../assets/models/weapons/viewmodel';
import { AISystem, type AIContext } from './ai/ai';
import { Hostage } from './hostage';
import { Mission } from './mission';
import { InteractSystem } from './interact';
import { FxSystem } from '../fx/fx';
import { Hud } from '../ui/hud';
import { Menus } from '../ui/menus';
import { DIFFICULTIES } from './difficulty';
import { SPAWNS, CHECKPOINTS, ROOMS, roomAt } from '../world/layout';
import type { DifficultyId, GameMode, WeaponId } from './types';
import type { Door } from '../world/doors';
import { placeProps } from '../world/propplacement';

interface Throwable {
  kind: 'flash' | 'smoke';
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  fuse: number;
  mesh: THREE.Mesh;
}

export class Game {
  readonly engine: Engine;
  world!: WorldModel;
  nav!: NavGrid;
  player!: Player;
  combat!: CombatSystem;
  rig!: WeaponRig;
  viewModel!: ViewModel;
  ai!: AISystem;
  hostages: Hostage[] = [];
  mission: Mission | null = null;
  interact = new InteractSystem();
  fx!: FxSystem;
  lighting!: LightingRig;
  snowEnv!: SnowEnvironment;
  hud!: Hud;
  menus!: Menus;
  mode: GameMode = 'boot';
  difficulty = DIFFICULTIES.operator;
  rng: Rng;
  testMode = false;
  qaMode = false;
  time = 0;
  private throwables: Throwable[] = [];
  private titleCamT = 0;
  private endTransitionT = -1;
  private pendingEnd: 'victory' | 'defeat' | null = null;
  private interactPromptText: string | null = null;
  private fpsSamples: number[] = [];
  fpsAvg = 0;
  /** QA gallery / cinematic camera override — player camera suppressed */
  cameraOverride = false;

  constructor(canvas: HTMLCanvasElement, opts: { seed: number; testMode: boolean; qaMode: boolean }) {
    this.engine = new Engine(canvas);
    this.rng = new Rng(opts.seed);
    this.testMode = opts.testMode;
    this.qaMode = opts.qaMode;
    clock.testMode = opts.testMode;
  }

  async init(onProgress: (p: number, label: string) => void): Promise<void> {
    const stage = async (p: number, label: string): Promise<void> => {
      onProgress(p, label);
      await new Promise((r) => requestAnimationFrame(r));
    };

    await stage(0.05, 'Building architecture');
    this.world = buildWorld();
    this.engine.scene.add(this.world.group, this.world.labels);

    await stage(0.35, 'Furnishing offices');
    placeProps(this.world, this.engine.scene);

    await stage(0.55, 'Computing navigation');
    this.nav = new NavGrid(this.world.collision);

    await stage(0.68, 'Painting the blizzard');
    this.snowEnv = new SnowEnvironment();
    this.snowEnv.applyTo(this.engine);
    this.lighting = new LightingRig();
    this.lighting.attach(this.engine);
    this.lighting.applyQuality(this.engine.profile.maxLights);

    await stage(0.8, 'Preparing systems');
    this.player = new Player(this.world.collision);
    this.combat = new CombatSystem(this.world.collision, this.world.glass);
    this.rig = new WeaponRig(this.player, this.combat, this.rng.fork(7));
    this.viewModel = new ViewModel(this.engine.vmScene, this.engine.vmCamera);
    this.fx = new FxSystem(this.world.collision);
    this.fx.particleScale = this.engine.profile.particleScale;
    this.engine.scene.add(this.fx.group);
    this.ai = new AISystem(this.rng.fork(23));
    this.engine.scene.add(this.ai.group);

    await stage(0.9, 'Interface');
    const uiRoot = document.getElementById('ui-root')!;
    this.hud = new Hud(uiRoot);
    this.menus = new Menus(uiRoot, {
      onStartMission: () => this.setMode('difficulty'),
      onSelectDifficulty: (d: DifficultyId) => {
        this.difficulty = DIFFICULTIES[d];
        this.setMode('briefing');
      },
      onDeploy: (primary: WeaponId) => this.deploy(primary),
      onResume: () => this.resume(),
      onRestart: () => this.restartMission(),
      onQuitToMenu: () => this.quitToMenu(),
      onSettingsChanged: () => this.applySettings(),
    });

    this.bindInput();
    this.bindCombat();
    this.bindAudio();
    clock.onStep((dt) => this.step(dt));

    await stage(1, 'Ready');
  }

  // ------------------------------------------------------------------
  // Mode management
  // ------------------------------------------------------------------
  setMode(mode: GameMode): void {
    const prev = this.mode;
    this.mode = mode;
    clock.paused = mode !== 'playing';
    this.hud.setVisible(mode === 'playing');
    switch (mode) {
      case 'title':
        this.menus.showTitle();
        if (audio.ready) audio.playMenuPad();
        audio.setAmbience('wind');
        break;
      case 'difficulty':
        this.menus.showDifficulty();
        break;
      case 'briefing':
        this.menus.showBriefing(() => this.setMode('loadout'));
        break;
      case 'loadout':
        this.menus.showLoadout();
        break;
      case 'playing':
        this.menus.clear();
        audio.stopMusic();
        if (!this.testMode) input.requestPointerLock();
        break;
      case 'paused':
        this.menus.showPause();
        input.exitPointerLock();
        break;
      case 'victory':
      case 'defeat': {
        input.exitPointerLock();
        const stats = this.mission?.stats ?? { kills: 0, elapsed: 0, shots: 0, hits: 0, damageTaken: 0 };
        this.menus.showEnd(mode === 'victory', this.mission?.loseReason ?? '', stats);
        audio.stinger(mode === 'victory' ? 'victory' : 'defeat');
        break;
      }
      default:
        break;
    }
    if (prev === 'playing' && mode !== 'playing' && mode !== 'paused') {
      input.releaseAll();
    }
  }

  private deploy(primary: WeaponId): void {
    const loader = this.menus.showLoading();
    const start = performance.now();
    const tick = (): void => {
      const p = Math.min(1, (performance.now() - start) / 700);
      loader.setProgress(p);
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        this.startMission(primary);
      }
    };
    if (this.testMode) {
      this.startMission(primary);
    } else {
      this.setMode('loading');
      tick();
    }
  }

  startMission(primary: WeaponId): void {
    // full clean state
    this.disposeMissionState();
    this.player.spawnAt(SPAWNS.player.pos, SPAWNS.player.yaw);
    this.player.armor = this.difficulty.playerArmor;
    this.rig.setLoadout(primary);
    this.viewModel.setWeapon(this.rig.def.id);
    this.ai.spawn({ nav: this.nav, difficulty: this.difficulty });
    this.ai.bindNoise(() => this.aiContext());

    this.hostages = [
      new Hostage('A', 'M. HALVORSEN', 0, SPAWNS.hostageA.pos, SPAWNS.hostageA.yaw),
      new Hostage('B', 'R. BEK', 1, SPAWNS.hostageB.pos, SPAWNS.hostageB.yaw),
    ];
    for (const h of this.hostages) {
      this.engine.scene.add(h.group);
      this.interact.add(h.interactable());
    }
    for (const door of this.world.doors) {
      door.reset();
      this.registerDoorInteractable(door);
    }
    this.world.glass.reset();
    for (const s of this.world.shutters) s.reset();
    this.fx.reset();
    this.hud.reset();
    this.mission = new Mission(this.player, this.hostages, this.ai, this.world.shutters[0] ?? null, this.difficulty);
    this.endTransitionT = -1;
    this.pendingEnd = null;
    this.throwables.forEach((t) => this.engine.scene.remove(t.mesh));
    this.throwables = [];
    this.time = 0;
    this.setMode('playing');
    events.emit('announce', { text: 'Reach the employee entrance on the north face', kind: 'objective' });
  }

  private disposeMissionState(): void {
    this.mission?.dispose();
    this.mission = null;
    this.ai.dispose();
    for (const h of this.hostages) {
      this.engine.scene.remove(h.group);
      this.interact.remove(`hostage:${h.id}`);
    }
    this.hostages = [];
  }

  restartMission(): void {
    const primary = this.menus.selectedPrimary;
    this.startMission(primary);
  }

  quitToMenu(): void {
    this.disposeMissionState();
    this.fx.reset();
    this.setMode('title');
  }

  resume(): void {
    if (this.mode !== 'paused') return;
    this.setMode('playing');
  }

  applySettings(): void {
    this.engine.applyQuality(settings.get('quality'));
    this.engine.resize();
    this.fx.particleScale = this.engine.profile.particleScale;
    this.lighting.applyQuality(this.engine.profile.maxLights);
    this.lighting.sun.shadow.mapSize.set(this.engine.profile.shadowMapSize, this.engine.profile.shadowMapSize);
    this.lighting.sun.shadow.map?.dispose();
    (this.lighting.sun.shadow as { map: unknown }).map = null;
    audio.applyVolumes();
  }

  // ------------------------------------------------------------------
  // Input & events
  // ------------------------------------------------------------------
  private bindInput(): void {
    input.onUiKey = (action, code) => {
      if (action === 'fullscreen' && !this.testMode) {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => undefined);
      }
      if (action === 'pause') {
        if (this.mode === 'playing') this.setMode('paused');
        else if (this.mode === 'paused') this.resume();
      }
    };
    input.onPointerLockChange = (locked) => {
      if (!locked && this.mode === 'playing' && !this.testMode) {
        this.setMode('paused');
      }
    };
    // click canvas to (re)acquire lock while playing
    this.engine.canvas.addEventListener('click', () => {
      if (this.mode === 'playing' && !this.testMode) input.requestPointerLock();
    });
  }

  private registerDoorInteractable(door: Door): void {
    this.interact.add({
      id: `door:${door.id}`,
      getPos: () => door.center.clone(),
      radius: 0.9,
      prompt: () => (door.isFullyClosed ? 'Open door' : door.state === 'open' ? 'Close door' : 'Door'),
      enabled: () => this.mode === 'playing',
      interact: (from) => door.toggle(from),
    });
  }

  private bindCombat(): void {
    this.combat.onCharacterHit = (id, part, damage, from, dir) => {
      if (id.startsWith('hostage:')) {
        const h = this.hostages.find((hh) => `hostage:${hh.id}` === id);
        h?.damage(damage);
        return;
      }
      const enemy = this.ai.byId(id);
      if (enemy) {
        const wasAlive = enemy.alive;
        enemy.damage(damage, part, this.player.pos, dir);
        if (this.mission) this.mission.stats.hits++;
        events.emit('ui:hitmarker', { kill: wasAlive && !enemy.alive });
      }
    };

    this.rig.onFire = ({ weapon, origin, outcomes }) => {
      if (this.mission) this.mission.stats.shots += 1;
      const muzzle = this.viewModel.muzzleWorld(this.player);
      this.viewModel.onFire();
      if (weapon.category !== 'knife') {
        this.fx.muzzleFlash(muzzle, weapon.category === 'shotgun' || weapon.category === 'dmr');
        const right = new THREE.Vector3(Math.cos(this.player.yaw), 0.2, -Math.sin(this.player.yaw));
        this.fx.ejectCasing(muzzle.clone().addScaledVector(right, 0.08), right);
      }
      let n = 0;
      for (const o of outcomes) {
        if (o.point) {
          if (weapon.tracerEvery > 0 && (n++ % weapon.tracerEvery) === 0) {
            this.fx.tracer(muzzle, o.point);
          }
          if (o.kind === 'character') {
            const dir = o.point.clone().sub(origin).normalize();
            this.fx.bloodBurst(o.point, dir);
            audio.play('impact-flesh', { pos: o.point, vol: 0.7 });
          }
        } else if (weapon.tracerEvery > 0) {
          const far = origin.clone().addScaledVector(this.player.forward(), 60);
          this.fx.tracer(muzzle, far);
        }
      }
    };

    this.rig.onThrow = (kind, origin, dir) => {
      const geo = new THREE.CylinderGeometry(0.03, 0.03, 0.115, 10);
      const mat = new THREE.MeshStandardMaterial({ color: kind === 'flash' ? 0x6e7478 : 0x51584a, roughness: 0.5, metalness: 0.4 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.position.copy(origin).addScaledVector(dir, 0.4);
      this.engine.scene.add(mesh);
      this.throwables.push({
        kind,
        pos: mesh.position.clone(),
        vel: dir.clone().multiplyScalar(11).add(new THREE.Vector3(0, 2.4, 0)),
        fuse: 1.7,
        mesh,
      });
    };
  }

  private bindAudio(): void {
    const V3 = (p: [number, number, number]): THREE.Vector3 => new THREE.Vector3(p[0], p[1], p[2]);
    events.on('weapon:fired', ({ weaponId, pos, loudness }) => {
      const p = V3(pos);
      const isEnemy = weaponId.startsWith('enemy:');
      const id = (isEnemy ? weaponId.slice(6) : weaponId) as WeaponId;
      const cat = WEAPONS[id]?.category ?? 'carbine';
      const patch = cat === 'pistol' ? 'fire-pistol' : cat === 'smg' ? 'fire-smg' : cat === 'shotgun' ? 'fire-shotgun'
        : cat === 'dmr' ? 'fire-dmr' : cat === 'knife' ? 'knife-swing' : cat === 'flash' || cat === 'smoke' ? 'interact' : 'fire-carbine';
      const d = p.distanceTo(this.player.eyePos());
      if (d > 26) audio.play('fire-distant', { pos: p, vol: 0.8, range: loudness * 2.2 });
      else audio.play(patch, { pos: isEnemy ? p : undefined, vol: isEnemy ? 0.85 : 0.62, range: loudness * 2 });
    });
    events.on('weapon:reload', ({ stage }) => {
      if (stage === 'start' || stage === 'empty-start') audio.play('reload-magout', { vol: 0.6 });
      else if (stage === 'done') audio.play('reload-chamber', { vol: 0.6 });
      else if (stage === 'dryfire') audio.play('dryfire', { vol: 0.65 });
    });
    events.on('weapon:switched', () => audio.play('reload-magin', { vol: 0.45 }));
    events.on('impact', ({ surface, pos }) => {
      const p = V3(pos);
      const patch = surface === 'metal' ? 'impact-metal' : surface === 'wood' ? 'impact-wood'
        : surface === 'drywall' ? 'impact-drywall' : surface === 'carpet' || surface === 'fabric' ? 'impact-soft'
        : surface === 'glass' ? 'glass-crack' : surface === 'flesh' ? 'impact-flesh' : 'impact-concrete';
      audio.play(patch, { pos: p, vol: 0.55, range: 24 });
      if (surface === 'metal' || surface === 'concrete') {
        if (Math.random() < 0.2) audio.play('ricochet', { pos: p, vol: 0.4, range: 30 });
      }
    });
    events.on('glass:broken', ({ id }) => {
      if (!id.endsWith(':crack')) audio.play('glass-break', { vol: 0.8 });
    });
    events.on('door:state', ({ id, state }) => {
      const door = this.world.doorById.get(id);
      const pos = door?.center;
      if (state === 'opening') audio.play(door && (door.kind === 'fire' || door.kind === 'security' || door.kind === 'loading' || door.kind === 'server') ? 'door-metal' : 'door-open', { pos, vol: 0.7, range: 22 });
      else if (state === 'closed') audio.play('door-close', { pos, vol: 0.6, range: 20 });
      else if (state === 'locked') audio.play('door-locked', { pos, vol: 0.7, range: 10 });
    });
    events.on('noise', ({ pos, kind }) => {
      if (kind.startsWith('footstep:')) {
        const [, surface, state] = kind.split(':');
        const patch = `step-${surface === 'tile' ? 'tile' : surface === 'carpet' ? 'carpet' : surface === 'vinyl' ? 'vinyl'
          : surface === 'metal' ? 'metal' : surface === 'wood' ? 'wood' : surface === 'snow' ? 'snow' : surface === 'glass' ? 'glass' : 'concrete'}`;
        const p = V3(pos);
        const isPlayer = p.distanceTo(this.player.pos) < 0.8;
        audio.play(patch, { pos: isPlayer ? undefined : p, vol: (isPlayer ? 0.4 : 0.5) * (state === 'crouch' ? 0.5 : state === 'walk' ? 0.7 : 1), rate: state === 'crouch' ? 0.8 : 1, range: 14 });
      } else if (kind === 'casing') {
        audio.play('casing', { pos: V3(pos), vol: 0.35, range: 8 });
      }
    });
    events.on('player:damaged', () => audio.play('hurt', { vol: 0.7 }));
    events.on('ui:hitmarker', ({ kill }) => audio.play(kill ? 'killmarker' : 'hitmarker', { vol: 0.5 }));
    events.on('enemy:alerted', ({ id }) => {
      if (!id.endsWith(':standdown')) audio.play('radio', { vol: 0.4 });
    });
    events.on('announce', ({ kind }) => {
      if (kind === 'objective' || kind === 'success') audio.play('objective', { vol: 0.5 });
    });
    events.on('hostage:state', ({ state }) => {
      if (state === 'following') audio.play('zip-cut', { vol: 0.7 });
    });
    events.on('mission:state', ({ state }) => {
      if (state === 'extracting') audio.play('shutter-motor', { vol: 0.3 });
      if (state === 'won') this.queueEnd('victory');
      if (state === 'lost') this.queueEnd('defeat');
    });
  }

  private queueEnd(kind: 'victory' | 'defeat'): void {
    if (this.pendingEnd) return;
    this.pendingEnd = kind;
    this.endTransitionT = kind === 'victory' ? 1.6 : 2.2;
  }

  private aiContext(): AIContext {
    return {
      player: this.player,
      col: this.world.collision,
      nav: this.nav,
      difficulty: this.difficulty,
      doors: this.world.doors,
      time: this.time,
      frozen: this.ai.frozen,
      visionBlockers: this.fx.visionBlockers,
      onEnemyFire: (from, to) => {
        this.fx.muzzleFlash(from, false);
        this.fx.tracer(from, to);
        for (const h of this.hostages) {
          if (h.pos.distanceTo(from) < 12) h.scare();
        }
      },
    };
  }

  // ------------------------------------------------------------------
  // Simulation step (fixed dt, deterministic)
  // ------------------------------------------------------------------
  step(dt: number): void {
    input.drain();
    if (this.mode !== 'playing') return;
    this.time += dt;

    this.player.step(dt);
    this.rig.step(dt);
    this.viewModel.setWeapon(this.rig.def.id);

    // interact key
    const eye = this.player.eyePos();
    const fwd = this.player.forward();
    const nearest = this.interact.nearest(eye, fwd);
    this.interactPromptText = nearest ? nearest.prompt() : null;
    if (nearest && input.wasPressed('interact')) {
      audio.play('interact', { vol: 0.5 });
      nearest.interact(this.player.pos);
    }

    for (const door of this.world.doors) door.step(dt);
    for (const s of this.world.shutters) s.step(dt);

    // AI & hostages
    const ctx = this.aiContext();
    this.ai.step(dt, ctx);
    this.combat.hitVolumes = [...this.ai.hitVolumes(), ...this.hostages.flatMap((h) => h.hitVolumes())];
    for (const h of this.hostages) {
      h.step(dt, { player: this.player, col: this.world.collision, nav: this.nav, doors: this.world.doors, time: this.time });
    }

    // throwables
    for (let i = this.throwables.length - 1; i >= 0; i--) {
      const t = this.throwables[i];
      t.vel.y -= 12 * dt;
      const move = t.vel.clone().multiplyScalar(dt);
      const dist = move.length();
      if (dist > 1e-5) {
        const hit = this.world.collision.raycast(t.pos, move.clone().normalize(), dist + 0.04, {});
        if (hit) {
          const n = hit.normal;
          const dot = t.vel.dot(n);
          t.vel.addScaledVector(n, -1.7 * dot).multiplyScalar(0.42);
          t.pos.copy(hit.point).addScaledVector(n, 0.05);
          if (Math.abs(dot) > 2) audio.play('grenade-bounce', { pos: t.pos, vol: 0.5 });
        } else {
          t.pos.add(move);
        }
      }
      t.mesh.position.copy(t.pos);
      t.mesh.rotation.x += dt * 7;
      t.fuse -= dt;
      if (t.fuse <= 0) {
        this.detonate(t);
        this.engine.scene.remove(t.mesh);
        this.throwables.splice(i, 1);
      }
    }

    this.fx.step(dt, this.time);
    this.mission?.step(dt);
    this.snowEnv.step(dt, this.time);
    audio.step(dt);

    // end transition delay (lets death/extraction read before screen change)
    if (this.endTransitionT > 0) {
      this.endTransitionT -= dt;
      if (this.endTransitionT <= 0 && this.pendingEnd) {
        this.setMode(this.pendingEnd);
        this.pendingEnd = null;
      }
    }
  }

  private detonate(t: Throwable): void {
    if (t.kind === 'flash') {
      this.fx.flashBurst(t.pos);
      audio.play('flash-bang', { pos: t.pos, vol: 1 });
      audio.muffle(2.5);
      events.emit('noise', { pos: [t.pos.x, t.pos.y, t.pos.z], radius: 42, kind: 'gunshot' });
      // stun enemies with LOS
      for (const e of this.ai.enemies) {
        if (!e.alive) continue;
        const d = e.pos.distanceTo(t.pos);
        if (d < 13 && this.world.collision.hasLineOfSight(e.eye(), t.pos.clone().add(new THREE.Vector3(0, 0.2, 0)))) {
          e.stun(Math.max(1.2, 4.4 - d * 0.3));
        }
      }
      // player flash if looking at it with LOS
      const eye = this.player.eyePos();
      const d = eye.distanceTo(t.pos);
      if (d < 16 && this.world.collision.hasLineOfSight(eye, t.pos.clone().add(new THREE.Vector3(0, 0.2, 0)))) {
        const toward = t.pos.clone().sub(eye).normalize();
        const facing = toward.dot(this.player.forward());
        if (facing > -0.2) this.hud.flash(Math.min(1.6, (1 - d / 18) * (0.6 + facing)));
      }
    } else {
      this.fx.smokeVolume(t.pos, this.time + 16);
      audio.play('smoke-pop', { pos: t.pos, vol: 0.8 });
    }
  }

  // ------------------------------------------------------------------
  // Render frame (RAF)
  // ------------------------------------------------------------------
  frame(realDt: number): void {
    // fps tracking
    if (realDt > 0) {
      this.fpsSamples.push(1 / realDt);
      if (this.fpsSamples.length > 40) this.fpsSamples.shift();
      this.fpsAvg = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
    }

    if (this.cameraOverride) {
      this.viewModel.group.visible = false;
      this.engine.render();
      return;
    }
    if (this.mode === 'playing' || this.mode === 'paused' || this.mode === 'victory' || this.mode === 'defeat') {
      this.player.applyToCamera(this.engine.camera);
      // ADS FOV
      const baseFov = settings.get('fov');
      const targetFov = baseFov * THREE.MathUtils.lerp(1, this.rig.def.adsZoom, this.rig.aimT);
      if (Math.abs(this.engine.camera.fov - targetFov) > 0.05) {
        this.engine.camera.fov = THREE.MathUtils.damp(this.engine.camera.fov, targetFov, 14, realDt);
        this.engine.camera.updateProjectionMatrix();
      }
      const look = { dx: 0, dy: 0 };
      this.viewModel.update(realDt, this.player, this.rig, look.dx, look.dy);
      this.viewModel.group.visible = this.mode === 'playing' || this.mode === 'paused';
    } else {
      // title/menu cinematic camera: slow drift in the lobby
      this.titleCamT += realDt * 0.05;
      const t = this.titleCamT;
      const cam = this.engine.camera;
      cam.position.set(19 + Math.sin(t) * 4, 2.4 + Math.sin(t * 0.7) * 0.5, 12 + Math.cos(t * 0.8) * 3);
      cam.lookAt(19 + Math.sin(t + 1.2) * 6, 1.6, 8);
      this.viewModel.group.visible = false;
      this.snowEnv.step(realDt, performance.now() / 1000);
    }

    // HUD update
    if (this.mode === 'playing' && this.mission) {
      const snap = this.rig.snapshot();
      const floor: 0 | 1 = this.player.pos.y > 2 ? 1 : 0;
      this.hud.update(realDt, {
        health: this.player.health,
        armor: this.player.armor,
        mag: snap.mag,
        reserve: snap.reserve,
        weaponName: snap.name,
        weaponSlot: this.rig.activeSlot,
        phase: snap.phase,
        spread: this.rig.currentSpread(),
        timeLeft: this.mission.timeLeft,
        extractCountdown: (this.mission.snapshot() as { extractCountdown: number | null }).extractCountdown,
        hostages: this.hostages.map((h) => ({ id: h.id, name: h.name, state: h.state })),
        playerPos: { x: this.player.pos.x, z: this.player.pos.z, floor, yaw: this.player.yaw },
        markers: [
          { x: this.player.pos.x, z: this.player.pos.z, floor, kind: 'player', yaw: this.player.yaw },
          ...this.hostages.filter((h) => h.alive && h.state !== 'extracted').map((h) => ({
            x: h.pos.x, z: h.pos.z, floor: (h.pos.y > 2 ? 1 : 0) as 0 | 1, kind: 'hostage' as const,
          })),
          { x: 42.3, z: 35, floor: 0, kind: 'extract' },
        ],
        interactPrompt: this.interactPromptText,
        urgentTimer: this.mission.timeLeft < 60,
      });
      // ambience by room
      const room = roomAt(this.player.pos.x, this.player.pos.y, this.player.pos.z);
      const def = ROOMS.find((r) => r.id === room);
      audio.setAmbience(def?.amb ?? (room ? 'hvac' : 'wind'));
      audio.setListener(this.player.eyePos(), this.player.yaw);
    }

    this.engine.render();
  }
}
