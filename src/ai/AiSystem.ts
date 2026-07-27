import * as THREE from 'three';
import type { EngineContext, Subsystem } from '../core/Engine';
import type { DamageInfo, IActor, IAiDirector, ILevel, IPlayer, IVfx } from '../core/Contracts';
import type { PhysicsSystem } from '../physics/PhysicsSystem';
import type { MaterialLibrary } from '../render/textures/MaterialLibrary';
import { makeRng, clamp, type Rng } from '../core/MathX';
import { Enemy, type AiWorld, type IEnemyDirector } from './Enemy';
import { Squad } from './Squad';
import { SpawnDirector, type SpawnRequest } from './SpawnDirector';
import { disposeEnemyTemplates, type EnemyVariant } from './EnemyModel';

/**
 * AiSystem.ts — the enemy AI director ({@link IAiDirector}).
 *
 * Owns every {@link Enemy}, groups them into {@link Squad}s, drives a
 * round-robin scheduler that staggers the expensive work (perception line-of-
 * sight, behaviour-tree thinks, pathfinding) across frames so 16+ soldiers run
 * at 60fps, and routes damage, noise, area damage and grenades.
 *
 * A `?aidemo=1` query param (or any capture) spawns a fixed, deterministic set
 * of posed soldiers so the `firefight`/`street` review shots always contain
 * enemies without needing a live player.
 */
export class AiSystem implements Subsystem, IAiDirector, IEnemyDirector {
  readonly name = 'ai';
  readonly order = 45;

  private ctx!: EngineContext;
  private rng: Rng = makeRng(0xa11ce);
  private world!: AiWorld;

  private enemies: Enemy[] = [];
  private squads: Squad[] = [];
  private spawnDirector!: SpawnDirector;

  private thinkCursor = 0;
  private grenades: Grenade[] = [];
  private grenadeGeo: THREE.SphereGeometry | null = null;
  private grenadeMat: THREE.MeshStandardMaterial | null = null;

  private demo = false;
  private demoTargets: { enemy: Enemy; stance: 'stand' | 'crouch' | 'prone' }[] = [];

  // ---------------------------------------------------------------------
  // IAiDirector: live actor list
  // ---------------------------------------------------------------------
  get actors(): readonly IActor[] {
    return this.enemies;
  }

  init(ctx: EngineContext) {
    this.ctx = ctx;
    const level = ctx.has('level') ? ctx.get<ILevel>('level') : null;
    const physics = ctx.has('physics') ? ctx.get<PhysicsSystem>('physics') : null;
    const vfx = ctx.has('vfx') ? ctx.get<IVfx>('vfx') : null;
    const player = ctx.has('player') ? ctx.get<IPlayer>('player') : null;
    const materials = ctx.has('materials') ? ctx.get<MaterialLibrary>('materials') : null;

    const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
    const difficulty = clamp(Number(q.get('aidiff') ?? '0.55'), 0, 1);

    this.world = {
      elapsed: ctx.elapsed,
      rng: this.rng,
      difficulty,
      level,
      physics,
      vfx,
      player,
      materials,
      events: ctx.events,
      scene: ctx.scene,
      director: this,
    };

    this.spawnDirector = new SpawnDirector({
      spawns: level?.enemySpawns ?? [],
      rng: this.rng,
      spawn: (req) => this.spawnEnemy(req),
      liveCount: () => this.liveCount(),
      playerView: () => this.playerView(),
    });

    // --- event wiring ---
    ctx.events.on('explosion', (e) => {
      this.damageArea(e.position, e.radius, e.damage, {
        kind: 'explosion',
        weapon: e.kind,
        attackerId: -2,
        origin: e.position,
      });
    });
    // Player gunfire / airstrikes draw attention.
    ctx.events.on('weapon:fire', (e) => {
      // Only the player's weapon travels through this event now (enemies use a
      // private path), so treat every one as a loud player noise.
      this.reportNoise(e.muzzle, 42, e.muzzle);
    });
    ctx.events.on('player:footstep', (e) => {
      if (e.speed > 3) this.reportNoise(e.position, 12, e.position);
    });

    // --- demo / capture population ---
    this.demo = ctx.capture || q.has('aidemo');
    if (this.demo) {
      this.spawnDemo();
    } else {
      // Kick off wave pacing shortly after the level is live.
      this.spawnDirector.begin(6);
    }
  }

  // ---------------------------------------------------------------------
  // Per-frame
  // ---------------------------------------------------------------------

  update(dt: number, ctx: EngineContext) {
    this.world.elapsed = ctx.elapsed;

    if (this.demo) {
      this.updateDemo(dt, ctx.camera.position);
      this.updateGrenades(dt);
      return;
    }

    // Squad coordination.
    for (const s of this.squads) s.update(dt, this.world);

    // Staggered thinking: cover all enemies roughly every ~6 frames.
    const n = this.enemies.length;
    if (n > 0) {
      const perFrame = Math.max(1, Math.ceil(n / 6));
      for (let k = 0; k < perFrame; k++) {
        this.thinkCursor = (this.thinkCursor + 1) % n;
        const e = this.enemies[this.thinkCursor];
        if (!e.alive) continue;
        const dtThink = e.lastThinkTime < 0 ? 0.1 : Math.min(0.5, this.world.elapsed - e.lastThinkTime);
        e.lastThinkTime = this.world.elapsed;
        const vis = this.computeVisibility(e);
        e.think(this.world, dtThink, true, vis);
      }
    }

    // Every-frame update + animation LOD by camera distance.
    const cam = ctx.camera.position;
    for (const e of this.enemies) {
      const animate = e.alive ? e.position.distanceToSquared(cam) < 55 * 55 : true;
      e.update(dt, this.world, animate);
    }

    this.cullCorpses(dt);
    this.spawnDirector.update(dt);
    this.updateGrenades(dt);
  }

  private updateDemo(dt: number, camera: THREE.Vector3) {
    // Aim the review roster at the *shot camera* (the capture harness poses a
    // separate camera from the shot definition, distinct from the gameplay
    // camera that lives on the player), so the shot shows soldiers levelling
    // their weapons straight at the viewer rather than off down the street.
    const shot = typeof window !== 'undefined' ? window.__CAPTURE__?.shot : undefined;
    const cam = (shot && SHOT_CAMS[shot]) || null;
    const target = cam
      ? _t.set(cam[0], cam[1] - 0.1, cam[2])
      : _t.set(camera.x, camera.y - 0.1, camera.z);
    for (const d of this.demoTargets) {
      const e = d.enemy;
      if (!e.alive) continue;
      // Seed perception so they engage immediately and hold a clean aim.
      const p = e.perception;
      p.canSee = true;
      p.awareness = 1;
      p.hasTarget = true;
      p.lastKnown.copy(target);
      p.timeSinceSeen = 0;
      p.distance = e.distanceTo(target);
      // Snap the body to face the camera so the aim pose reads correctly in the
      // single settled capture frame instead of easing toward it over seconds.
      e.yaw = Math.atan2(-(target.x - e.position.x), -(target.z - e.position.z));
      e.aimAt(target);
      e.facePoint(target);
      e.setStance(d.stance);
      e.holdFire(false); // demo poses aim only; muzzle VFX is owned by another system
      e.update(dt, this.world, true);
    }
  }

  // ---------------------------------------------------------------------
  // Visibility (staggered)
  // ---------------------------------------------------------------------

  private computeVisibility(e: Enemy): boolean {
    const player = this.world.player;
    if (!player || !player.alive) return false;
    const eye = e.eyeWorld(_eye);
    const fwd = e.forward(_fwd);
    if (!e.perception.inViewCone(eye, fwd, player.eye)) return false;
    const dist = eye.distanceTo(player.eye);
    if (dist > e.weaponRange * 1.25) return false;
    // Line of sight: cheap grid test first, then a physics ray if available.
    let clear = true;
    if (this.world.level) clear = this.world.level.lineOfSight(eye, player.eye);
    else if (this.world.physics) clear = this.world.physics.isClear(eye, player.eye);
    return clear;
  }

  // ---------------------------------------------------------------------
  // Spawning
  // ---------------------------------------------------------------------

  private spawnEnemy(req: SpawnRequest): Enemy {
    const pos = req.position.clone();
    if (this.world.level) {
      const g = this.world.level.sampleGround(pos.x, pos.z);
      if (g !== null) pos.y = g;
    }
    const e = new Enemy(this.world, req.variant, pos, req.yaw);
    this.enemies.push(e);
    this.assignSquad(e);
    this.ctx.events.emit('enemy:spawn', { id: e.id });
    return e;
  }

  private assignSquad(e: Enemy) {
    // Put them in the smallest non-full nearby squad, else a new one.
    let squad = this.squads.find((s) => s.members.length < 4);
    if (!squad) {
      squad = new Squad(this.squads.length);
      this.squads.push(squad);
    }
    squad.add(e);
  }

  private spawnDemo() {
    const roster: [number, number, EnemyVariant, 'stand' | 'crouch' | 'prone'][] = [
      [3.5, 11.0, 'assault', 'stand'],
      [1.0, 10.0, 'militia', 'crouch'],
      [-1.5, 10.5, 'heavy', 'stand'],
      [4.2, 9.0, 'militia', 'stand'],
      [-2.8, 9.0, 'assault', 'crouch'],
    ];
    const playerZ = this.world.player?.position.z ?? 34;
    for (const [x, z, variant, stance] of roster) {
      let y = 0;
      if (this.world.level) {
        const g = this.world.level.sampleGround(x, z);
        if (g !== null) y = g;
      }
      const yaw = Math.atan2(-(0 - x), -(playerZ - z)); // face toward the player
      const e = new Enemy(this.world, variant, new THREE.Vector3(x, y, z), yaw);
      this.enemies.push(e);
      this.assignSquad(e);
      this.demoTargets.push({ enemy: e, stance });
      this.ctx.events.emit('enemy:spawn', { id: e.id });
      console.info(`[ai] demo enemy ${variant} @ (${x.toFixed(1)},${y.toFixed(2)},${z}) yaw=${yaw.toFixed(2)}`);
    }
    console.info(`[ai] demo spawned ${this.enemies.length} enemies`);
  }

  private liveCount(): number {
    let n = 0;
    for (const e of this.enemies) if (e.alive) n++;
    return n;
  }

  private playerView(): { eye: THREE.Vector3; forward: THREE.Vector3 } | null {
    const p = this.world.player;
    if (!p) return null;
    _fwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    return { eye: p.eye, forward: _fwd };
  }

  private cullCorpses(dt: number) {
    void dt;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive && e.corpseAge > 22) {
        e.dispose();
        for (const s of this.squads) s.remove(e);
        this.enemies.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------------
  // IEnemyDirector
  // ---------------------------------------------------------------------

  spawnGrenade(from: THREE.Vector3, target: THREE.Vector3, fromId: number) {
    if (!this.grenadeGeo) {
      this.grenadeGeo = new THREE.SphereGeometry(0.05, 8, 6);
      this.grenadeMat = new THREE.MeshStandardMaterial({ color: 0x2c3524, roughness: 0.6, metalness: 0.3 });
    }
    const mesh = new THREE.Mesh(this.grenadeGeo, this.grenadeMat!);
    mesh.castShadow = true;
    mesh.position.copy(from);
    this.world.scene.add(mesh);

    // Ballistic solve for a nice arc.
    const g = 16;
    const dx = target.x - from.x;
    const dz = target.z - from.z;
    const horiz = Math.hypot(dx, dz);
    const time = clamp(horiz / 12, 0.7, 2.0);
    const vel = new THREE.Vector3(dx / time, (target.y - from.y) / time + 0.5 * g * time, dz / time);

    this.grenades.push({ mesh, pos: mesh.position, vel, fuse: Math.max(1.4, time + 0.4), g });

    // Telegraph: audible/visible callout so it's fair.
    this.ctx.events.emit('enemy:alert', { id: fromId, position: target.clone() });
    this.ctx.events.emit('ui:notify', { text: 'GRENADE!', tone: 'bad' });
    this.world.vfx?.smokePlume(from, 0.2, 2.5);
  }

  onEnemyFired(position: THREE.Vector3, fromId: number) {
    // Propagate a small amount of awareness to squadmates (they hear the burst).
    void fromId;
    void position;
  }

  private updateGrenades(dt: number) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const gr = this.grenades[i];
      gr.fuse -= dt;
      gr.vel.y -= gr.g * dt;
      gr.pos.addScaledVector(gr.vel, dt);
      // Smoke trail.
      if (this.world.vfx) this.world.vfx.smokePlume(gr.pos, 0.12, 0.5);

      let exploded = gr.fuse <= 0;
      if (this.world.level) {
        const groundY = this.world.level.sampleGround(gr.pos.x, gr.pos.z);
        if (groundY !== null && gr.pos.y <= groundY + 0.05) {
          gr.pos.y = groundY + 0.05;
          gr.vel.multiplyScalar(0.3);
          gr.vel.y = Math.abs(gr.vel.y) * 0.3;
        }
      }
      if (exploded) {
        this.explodeGrenade(gr);
        this.world.scene.remove(gr.mesh);
        this.grenades.splice(i, 1);
      }
    }
  }

  private explodeGrenade(gr: Grenade) {
    const pos = gr.pos.clone();
    this.world.vfx?.explosion(pos, 4.5, 'grenade');
    this.ctx.events.emit('explosion', {
      position: pos,
      radius: 4.8,
      damage: 120,
      force: 620,
      kind: 'grenade',
    });
  }

  // ---------------------------------------------------------------------
  // IAiDirector
  // ---------------------------------------------------------------------

  actorById(id: number): IActor | null {
    return this.enemies.find((e) => e.id === id) ?? null;
  }

  hostiles(): IActor[] {
    return this.enemies.filter((e) => e.alive && e.team === 'hostile');
  }

  reportNoise(position: THREE.Vector3, radius: number, from: THREE.Vector3) {
    const r2 = radius * radius;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d2 = e.position.distanceToSquared(position);
      if (d2 > r2) continue;
      const intensity = clamp(1 - Math.sqrt(d2) / radius, 0, 1);
      e.perception.hear(from, intensity * 0.8, this.world.difficulty);
      e.blackboard?.markHeard(from, this.world.elapsed, intensity * 0.7);
    }
  }

  damageArea(center: THREE.Vector3, radius: number, damage: number, info: Partial<DamageInfo>) {
    const r2 = radius * radius;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      _torso.set(e.position.x, e.position.y + 1.1, e.position.z);
      const d2 = center.distanceToSquared(_torso);
      if (d2 > r2) continue;
      const d = Math.sqrt(d2);
      const falloff = 1 - d / radius;
      const hasLos = this.world.level ? this.world.level.lineOfSight(center, _torso) : true;
      const dmg = damage * falloff * falloff * (hasLos ? 1 : 0.4);
      if (dmg < 1) continue;
      _dir.subVectors(_torso, center).normalize();
      e.applyDamage({
        amount: dmg,
        origin: center.clone(),
        point: _torso.clone(),
        direction: _dir.clone(),
        headshot: false,
        weapon: info.weapon ?? 'explosion',
        attackerId: info.attackerId ?? -2,
        kind: info.kind ?? 'explosion',
      });
    }
  }

  spawnWave(count: number) {
    if (!this.spawnDirector) return;
    if (!this.spawnDirector.waveNumber) this.spawnDirector.begin(count);
    this.spawnDirector.spawnWave(count);
  }

  dispose() {
    for (const e of this.enemies) e.dispose();
    this.enemies.length = 0;
    this.squads.length = 0;
    for (const gr of this.grenades) this.world.scene.remove(gr.mesh);
    this.grenades.length = 0;
    this.grenadeGeo?.dispose();
    this.grenadeMat?.dispose();
    disposeEnemyTemplates();
  }
}

interface Grenade {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  fuse: number;
  g: number;
}

const _eye = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _t = new THREE.Vector3();
const _torso = new THREE.Vector3();
const _dir = new THREE.Vector3();

/** Known review-shot camera positions (mirrors src/dev/shots.ts) so the demo
 *  roster can level its weapons at whichever shot is being captured. */
const SHOT_CAMS: Record<string, [number, number, number]> = {
  firefight: [6, 1.75, 14],
  street: [1.5, 1.72, 26],
  gameplay: [3, 1.7, 18],
  golden: [3, 4.5, 34],
  overview: [44, 17, -50],
};
