/**
 * Shared AI state.
 *
 * One instance, owned by the system, read by every agent. Two jobs:
 *
 *  - Dependency resolution. `fx`, `audio`, `ui` and `render` may not exist yet when
 *    the AI initialises and are allowed to never exist at all, so every one of them
 *    is optional and re-resolved until it appears. Nothing in this module may throw
 *    because a sibling module has not landed.
 *
 *  - The target snapshot. Twenty agents asking the player system for its eye
 *    position, stance and firing state twenty times a frame is twenty times the
 *    work for one answer, and worse, it lets two agents see slightly different
 *    worlds within a frame. The snapshot is taken once at the top of the update
 *    and is what every agent reads.
 */
import * as THREE from 'three';
import type {
  AudioSystem,
  CombatSystem,
  FXSystem,
  PhysicsSystem,
  PlayerSystem,
  ProcgenSystem,
  RenderSystem,
  Stance,
  UISystem,
  WeaponSystem,
} from '../core/Contracts';
import type { Damageable } from '../core/GameTypes';
import { COLLISION_GROUP } from '../core/GameTypes';
import type { EngineContext } from '../core/System';
import { Rng, saturate } from '../core/MathUtils';
import { CoverIndex } from './CoverIndex';
import { GrenadeManager } from './Grenade';
import { resolveNav, type NavView, type WorldExtras } from './Nav';
import { PathPlanner } from './Pathfinding';
import { DIFFICULTIES, type Difficulty, type DifficultyProfile } from './Tuning';

/** Methods `CombatSystemImpl` exposes beyond the contract. Resolved defensively. */
export interface CombatExtras extends CombatSystem {
  setHitboxHeight?(entity: Damageable, height: number): void;
  setDisplayName?(entity: Damageable, name: string): void;
}

/** What every agent knows about the thing it is trying to kill. */
export interface TargetSnapshot {
  entity: Damageable | null;
  alive: boolean;
  /** Where the target looks from — the point an agent must be able to see. */
  readonly eye: THREE.Vector3;
  /** Feet, matching the enemy convention. */
  readonly feet: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  speed: number;
  stance: Stance;
  /** True in the second after the target fired. */
  firing: boolean;
  /** Standing height of the target, for sight sampling. */
  height: number;
  /** 0..1 how brightly lit the target is; shade and interiors hide people. */
  exposure: number;
  /** Seconds the target has been within half a metre of where it was. */
  stationaryTime: number;
}

/** Sight rays are blocked by the world and by props, not by other characters. */
export const SIGHT_MASK = COLLISION_GROUP.STATIC | COLLISION_GROUP.DYNAMIC;

const DOWN = /* @__PURE__ */ new THREE.Vector3(0, -1, 0);

export class Blackboard {
  ctx!: EngineContext;

  physics: PhysicsSystem | null = null;
  world: WorldExtras | null = null;
  combat: CombatExtras | null = null;
  player: PlayerSystem | null = null;
  weapons: WeaponSystem | null = null;
  procgen: ProcgenSystem | null = null;
  fx: FXSystem | null = null;
  audio: AudioSystem | null = null;
  render: RenderSystem | null = null;
  ui: UISystem | null = null;

  nav: NavView | null = null;
  readonly cover = new CoverIndex();
  /** The one path searcher every agent queues against. */
  readonly planner = new PathPlanner();
  readonly grenades = new GrenadeManager();
  readonly rng = new Rng(0x5eed1234);

  difficulty: DifficultyProfile = DIFFICULTIES.regular;

  /** Engine elapsed time, refreshed once per update. */
  now = 0;
  /** Frame counter, used to stagger per-agent work. */
  frame = 0;
  /** Main camera position, for level-of-detail decisions. */
  readonly cameraPosition = new THREE.Vector3();

  /**
   * Ragdolls the module is still allowed to create this frame.
   *
   * Building two inside one frame — a grenade or a burst killing a pair at once —
   * inserts both sets of bodies before the physics step that would settle the
   * broad-phase between them, and the step that follows panics on the Rust side,
   * which takes the physics world down for the rest of the session. One per frame
   * costs at most a few frames of delay on a multiple kill, and the second body
   * spends them in the procedural collapse rather than standing up.
   */
  ragdollBudget = 1;

  readonly target: TargetSnapshot = {
    entity: null,
    alive: false,
    eye: new THREE.Vector3(),
    feet: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    speed: 0,
    stance: 'stand',
    firing: false,
    height: 1.78,
    exposure: 1,
    stationaryTime: 0,
  };

  /** Landmarks, cached because the map's map is rebuilt on every call. */
  readonly landmarks: THREE.Vector3[] = [];
  readonly landmarkNames: string[] = [];

  private coverBuilt = false;
  private lastFireAt = -100;
  private readonly lastTargetPosition = new THREE.Vector3();
  private exposureTimer = 0;
  private readonly sunProbe = new THREE.Vector3();

  attach(ctx: EngineContext): void {
    this.ctx = ctx;
    this.resolve();
    this.rng.next();
  }

  /** Re-resolves anything still missing. Cheap, and idempotent. */
  resolve(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.physics ??= ctx.tryGet<PhysicsSystem>('physics') ?? null;
    this.world ??= (ctx.tryGet<WorldExtras>('world') as WorldExtras | undefined) ?? null;
    this.combat ??= (ctx.tryGet<CombatExtras>('combat') as CombatExtras | undefined) ?? null;
    this.player ??= ctx.tryGet<PlayerSystem>('player') ?? null;
    this.weapons ??= ctx.tryGet<WeaponSystem>('weapons') ?? null;
    this.procgen ??= ctx.tryGet<ProcgenSystem>('procgen') ?? null;
    this.fx ??= ctx.tryGet<FXSystem>('fx') ?? null;
    this.audio ??= ctx.tryGet<AudioSystem>('audio') ?? null;
    this.render ??= ctx.tryGet<RenderSystem>('render') ?? null;
    this.ui ??= ctx.tryGet<UISystem>('ui') ?? null;

    this.nav ??= resolveNav(this.world);
    if (this.nav) this.planner.attach(this.nav);
    if (!this.coverBuilt && this.world) {
      try {
        const points = this.world.getCoverPoints();
        if (points.length > 0) {
          this.cover.build(points);
          this.coverBuilt = true;
        }
      } catch {
        /* map still building */
      }
    }
    if (this.landmarks.length === 0 && this.world) {
      try {
        for (const [name, position] of this.world.getLandmarks()) {
          this.landmarkNames.push(name);
          this.landmarks.push(position);
        }
      } catch {
        /* map still building */
      }
    }
  }

  setDifficulty(id: Difficulty): void {
    this.difficulty = DIFFICULTIES[id];
  }

  /** Called from `update`, before any agent runs. */
  beginFrame(dt: number, ctx: EngineContext): void {
    this.resolve();
    this.now = ctx.time.elapsed;
    this.frame = ctx.time.frame;
    this.ragdollBudget = 1;
    this.cameraPosition.setFromMatrixPosition(ctx.camera.matrixWorld);

    const player = this.player;
    const target = this.target;
    if (!player) {
      target.alive = false;
      target.entity = null;
      return;
    }

    target.entity = player.entity;
    target.alive = player.entity.isAlive;
    player.getEyePosition(target.eye);
    target.feet.copy(player.position);
    target.velocity.copy(player.velocity);
    target.speed = player.speed;
    target.stance = player.stance;
    target.firing = this.now - this.lastFireAt < 0.85;
    target.height = target.eye.y - target.feet.y + 0.15;

    const moved = this.lastTargetPosition.distanceToSquared(target.feet);
    if (moved > 0.25) {
      target.stationaryTime = 0;
      this.lastTargetPosition.copy(target.feet);
    } else {
      target.stationaryTime += dt;
    }

    // Light exposure changes slowly and costs a raycast, so it is sampled a few
    // times a second and shared by everyone.
    this.exposureTimer -= dt;
    if (this.exposureTimer <= 0) {
      this.exposureTimer = 0.25;
      target.exposure = this.sampleExposure();
    }
  }

  /** Called by the system when it sees the player fire. */
  noteTargetFired(): void {
    this.lastFireAt = this.now;
  }

  /**
   * How exposed the target is to the sun, 0..1.
   *
   * A short ray towards the sun answers whether the target is in shade, and the
   * world's own interior test answers whether it is in a building. Both matter:
   * a man in a doorway is genuinely hard to pick out from a sunlit street.
   */
  private sampleExposure(): number {
    const world = this.world;
    const physics = this.physics;
    const target = this.target;
    let exposure = 1;

    if (world && typeof world.isIndoors === 'function') {
      try {
        if (world.isIndoors(target.eye)) exposure *= 0.45;
      } catch {
        /* not available */
      }
    }
    if (physics && physics.ready && world) {
      this.sunProbe.copy(world.sunDirection);
      if (!physics.lineOfSight(target.eye, this.sunProbe.multiplyScalar(30).add(target.eye), SIGHT_MASK)) {
        exposure *= 0.62;
      }
    }
    return saturate(exposure);
  }

  /** Ground height under a world XZ near `y`, or null. */
  surfaceAt(x: number, z: number, y: number): number | null {
    const world = this.world;
    if (!world) return null;
    if (typeof world.sampleSurface === 'function') {
      const h = world.sampleSurface(x, z, y);
      if (h !== null) return h;
    }
    const nav = this.nav;
    if (nav) {
      const h = nav.heightAt(x, z, y);
      if (h !== null) return h;
    }
    return world.sampleGround(x, z);
  }

  /** Ground height under a point using a physics ray. Accurate but not free. */
  traceGround(x: number, y: number, z: number, maxDistance = 3): number | null {
    const physics = this.physics;
    if (!physics || !physics.ready) return null;
    SCRATCH_ORIGIN.set(x, y, z);
    const hit = physics.raycast(SCRATCH_ORIGIN, DOWN, {
      maxDistance,
      groups: SIGHT_MASK,
    });
    return hit ? hit.point.y : null;
  }

  lineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const physics = this.physics;
    if (!physics || !physics.ready) return true;
    return physics.lineOfSight(from, to, SIGHT_MASK);
  }

  play(id: string, position: THREE.Vector3, volume = 1, pitch = 1): void {
    this.audio?.play(id, position, { volume, pitch });
  }
}

const SCRATCH_ORIGIN = /* @__PURE__ */ new THREE.Vector3();
