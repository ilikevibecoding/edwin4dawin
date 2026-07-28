import * as THREE from 'three';
import { Groups } from '../core/GameContext';
import type { EventBus } from '../core/EventBus';
import type { CharacterMoveResult, IPhysics, IWorld } from '../core/Interfaces';
import { Rng, angleDelta, clamp, damp, lerp, saturate } from '../core/MathUtils';
import { BTState } from './Behavior';
import { CoverField, type CoverChoice } from './Cover';
import { Hitboxes } from './Hitboxes';
import { NavGrid, NavPath, NAV_CELL } from './NavGrid';
import { CONTACT_CONFIRMED, Perception } from './Perception';
import { RagdollBody, RagdollPool, particleForBone } from './Ragdoll';
import { createSoldier, type SoldierAssets, type SoldierInstance } from './SoldierMesh';
import { B, BONE_COUNT } from './SoldierSkeleton';
import { SoldierRig, STANCE_CROUCH, STANCE_PRONE, STANCE_STAND, makeDrive, type RigDrive } from './SoldierRig';
import { ROLE_FLANK, ROLE_IDLE, ROLE_SUPPRESS, type Squad } from './Squad';
import { AI, DIFFICULTY, type DifficultyProfile } from './Tuning';

/**
 * One enemy soldier: a body that moves, a rig that draws it, a weapon that
 * fires, and the state the behaviour tree reads and writes.
 *
 * The split is deliberate. Nothing in this file decides *what* to do — that is
 * the tree's job — and nothing in the tree knows how a capsule is swept or how
 * a burst is timed. What lives here is a set of verbs (`pathTo`, `fireAt`,
 * `takeCover`, `startReload`) with the property that calling one repeatedly is
 * safe and calling a different one cancels the last. That is what lets the tree
 * change its mind mid-frame without leaving a half-finished action behind.
 *
 * The shooting model is the part worth reading. Aim error is an angle that
 * starts wide and walks in over the seconds an agent spends engaging, and the
 * scatter within a burst is a single offset that shrinks rather than fresh
 * randomness per round. The two together produce the thing a firefight needs:
 * the first burst goes past you, the second is closer, and by the third you
 * have either moved or you deserve it. Purely random spread cannot do this —
 * it either kills instantly or never, and both feel unfair.
 */

/* ------------------------------ the target -------------------------------- */

/**
 * What the AI shoots at. The player implements this; the showcase substitutes a
 * scripted stand-in so a firefight can be photographed without a human.
 */
export interface AITarget {
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  readonly eye: THREE.Vector3;
  readonly alive: boolean;
  readonly crouched: boolean;
  readonly radius: number;
  readonly height: number;
  damage(amount: number, from: THREE.Vector3, headshot: boolean): void;
}

/** Everything an agent needs from the rest of the game. */
export interface AgentDeps {
  physics: IPhysics | null;
  world: IWorld | null;
  events: EventBus | null;
  nav: NavGrid;
  cover: CoverField;
  ragdolls: RagdollPool;
  /** False when this frame's cover-scoring budget is already spent. */
  canScoreCover(): boolean;
  /** Called when the agent wants a grenade in the air. */
  throwGrenade(agent: Agent, from: THREE.Vector3, to: THREE.Vector3): boolean;
  /** Rounds fired, so the system can drive squad awareness of gunfire. */
  onFire(agent: Agent, origin: THREE.Vector3, direction: THREE.Vector3): void;
  onDeath(agent: Agent, headshot: boolean, impulse: THREE.Vector3, weapon: string): void;
}

/* --------------------------------- state ---------------------------------- */

export const PATH_IDLE = 0;
export const PATH_PENDING = 1;
export const PATH_FOLLOW = 2;
export const PATH_FAILED = 3;

const MOVE_MASK = Groups.WORLD | Groups.PROP;
const SHOT_MASK = Groups.WORLD | Groups.PROP | Groups.GLASS | Groups.ENEMY;

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _way = new THREE.Vector3();
const _muzzle = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _end = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _choice: CoverChoice = { index: -1, score: 0 };

/** Shared event payloads; emission is synchronous so one copy is enough. */
const _fireEvt = { id: 0, origin: new THREE.Vector3(), direction: new THREE.Vector3() };
const _flashEvt = {
  position: new THREE.Vector3(),
  direction: new THREE.Vector3(),
  scale: 1,
};
const _tracerEvt = {
  origin: new THREE.Vector3(),
  end: new THREE.Vector3(),
  speed: 780,
  caliber: 0.00762,
  fromPlayer: false,
};
const _impactEvt = {
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(0, 1, 0),
  surface: 'concrete' as const,
  direction: new THREE.Vector3(),
  energy: 0.7,
  target: undefined as THREE.Object3D | undefined,
};
const _audioEvt = { id: '', position: new THREE.Vector3(), volume: 1, rate: 1 };

export class Agent {
  /* ------------------------------ identity ------------------------------- */

  id = -1;
  active = false;
  alive = false;
  name = 'Insurgent';
  variantIndex = 0;
  profile: DifficultyProfile = DIFFICULTY.regular;
  /** Per-agent stream, seeded from the id so a run is reproducible. */
  rng = new Rng(1);

  /* -------------------------------- body --------------------------------- */

  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  heading = 0;
  /** Facing the agent wants; the rig damps toward it. */
  desiredHeading = 0;
  stance = STANCE_STAND;
  /** Fractional stance the rig is actually at, for capsule sizing. */
  private stanceBlend = 0;
  grounded = true;
  health: number = AI.maxHealth;

  /* ------------------------------- visual -------------------------------- */

  instance: SoldierInstance | null = null;
  rig: SoldierRig | null = null;
  readonly drive: RigDrive = makeDrive();
  hitboxes: Hitboxes | null = null;
  ragdoll: RagdollBody | null = null;
  /** 0 near, 1 mid, 2 far. Drives IK cost and which mesh is drawn. */
  lod = 0;
  private lodPhase = 0;
  private lodAccum = 0;

  /* ------------------------------ knowledge ------------------------------- */

  readonly perception = new Perception();
  /** Seconds since this agent's turn came round on the perception schedule. */
  sinceLook = 0;
  squad: Squad | null = null;
  role = ROLE_IDLE;
  flankSide = 1;
  suppression = 0;
  /** Seconds this agent has been continuously engaging, for aim convergence. */
  engageTime = 0;
  /** Counts down from the profile's reaction time when a contact appears. */
  reaction = 0;

  bt: BTState;

  /* ------------------------------ navigation ------------------------------ */

  readonly path = new NavPath();
  pathState = PATH_IDLE;
  pathWhy = 'init';
  pathIndex = 0;
  private pathRevision = -1;
  private pathRequest = -1;
  readonly goal = new THREE.Vector3();
  hasGoal = false;
  /** Metres from the goal at which the agent considers itself arrived. */
  arriveRadius = 0.6;
  /** Speed cap for this move, so an agent can walk while investigating. */
  moveSpeed: number = AI.runSpeed;
  private repath = 0;
  private stuck = 0;
  /** Stall recoveries since the agent was last somewhere else entirely. */
  private stalls = 0;
  /** Where the first stall of this run happened, so escapes can be judged. */
  private readonly stallOrigin = new THREE.Vector3();
  /** Seconds left of a sideways shove out of whatever the capsule is caught on. */
  private escape = 0;
  private escapeX = 0;
  private escapeZ = 0;
  private readonly lastProgress = new THREE.Vector3();

  /** Separation push from neighbours, written by the system each frame. */
  readonly avoid = new THREE.Vector3();

  /* -------------------------------- cover --------------------------------- */

  coverIndex = -1;
  coverSide = 1;
  inCover = false;
  /** Seconds the agent has been leaning out; drives "get back in". */
  peekTime = 0;
  private coverCheck = 0;

  /* ------------------------------- weapon --------------------------------- */

  magazine: number = AI.weapon.magSize;
  reloadLeft = -1;
  private burstLeft = 0;
  private nextShot = 0;
  private burstPause = 0;
  /** 2D aim error carried through a burst, in metres at the target. */
  private errorX = 0;
  private errorY = 0;
  private errorPhase = 0;
  grenadeCooldown = 6;
  grenadeThrow = -1;
  vaultTime = -1;
  private vaultFrom = new THREE.Vector3();
  private vaultTo = new THREE.Vector3();

  /** Set by the tree; the agent aims and fires at this point. */
  readonly aimPoint = new THREE.Vector3();
  wantsFire = false;
  aiming = false;
  lookWeight = 1;
  /** Rounds sent since spawn. Debug readout only. */
  shots = 0;

  /* ------------------------- behaviour scratch ----------------------------- */

  /** Where the agent believes the target is, chest height. Refreshed per frame. */
  readonly believed = new THREE.Vector3();
  patrolTimer = 0;
  lookTimer = 0;
  /** Seconds the agent has been tucked in behind cover between peeks. */
  duckTimer = 0;
  strafeTimer = 0;
  strafeSign = 1;
  /** Home position an idle agent returns to, so a patrol does not wander off. */
  readonly anchor = new THREE.Vector3();
  /**
   * Suspends the behaviour tree for this agent, so a debug hook can drive him
   * somewhere without patrol immediately deciding otherwise. Cleared as soon as
   * the ordered move ends.
   */
  scripted = false;
  /**
   * Holds him where he is: scripted, but with nowhere to go, so the tree stays
   * suspended instead of resuming the moment the order runs out.
   *
   * A pose can only be inspected — by eye or by measurement — on a man who is
   * standing still, and left alone none of these men ever is. Patrol picks a
   * waypoint within a frame or two of anything that clears the tree.
   */
  hold = false;

  /* -------------------------------- output -------------------------------- */

  /** Filled by the rig each frame; hitbox and ragdoll code reads it. */
  readonly bonePos: THREE.Vector3[] = [];
  readonly boneRot: THREE.Quaternion[] = [];
  readonly eye = new THREE.Vector3();

  private deps: AgentDeps;
  private readonly move: CharacterMoveResult = {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    grounded: false,
    groundNormal: new THREE.Vector3(0, 1, 0),
    groundSurface: 'concrete',
    hitWall: false,
    slope: 0,
    hitCeiling: false,
    stepUp: 0,
  };
  private readonly ignore: THREE.Object3D[] = [];

  constructor(deps: AgentDeps, btState: BTState) {
    this.deps = deps;
    this.bt = btState;
    for (let i = 0; i < BONE_COUNT; i++) {
      this.bonePos.push(new THREE.Vector3());
      this.boneRot.push(new THREE.Quaternion());
    }
  }

  /* ------------------------------- lifetime -------------------------------- */

  /** Builds the mesh once. Reused for every soldier this slot ever holds. */
  build(assets: SoldierAssets, variantIndex: number, parent: THREE.Object3D): void {
    this.variantIndex = variantIndex;
    this.instance = createSoldier(assets, variantIndex);
    this.instance.root.visible = false;
    parent.add(this.instance.root);
    this.rig = new SoldierRig(this.instance, this.deps.physics);
    this.hitboxes = new Hitboxes(this.id);
    this.hitboxes.attach(this.instance.bones);
    this.ignore.length = 0;
    this.ignore.push(this.instance.root);
  }

  spawn(position: THREE.Vector3, heading: number, difficulty: DifficultyProfile, name: string): void {
    this.active = true;
    this.alive = true;
    this.health = AI.maxHealth;
    this.profile = difficulty;
    this.name = name;
    this.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.heading = heading;
    this.desiredHeading = heading;
    this.stance = STANCE_STAND;
    this.stanceBlend = 0;
    this.magazine = AI.weapon.magSize;
    this.reloadLeft = -1;
    this.burstLeft = 0;
    this.burstPause = 0;
    this.suppression = 0;
    this.engageTime = 0;
    this.reaction = 0;
    this.grenadeCooldown = 4 + this.rng.next() * difficulty.grenadeCooldown;
    this.grenadeThrow = -1;
    this.vaultTime = -1;
    this.role = ROLE_IDLE;
    this.peekTime = 0;
    this.inCover = false;
    this.coverIndex = -1;
    this.coverCheck = 0;
    this.lodAccum = 0;
    this.wantsFire = false;
    this.aiming = false;
    this.patrolTimer = 0;
    this.lookTimer = 0;
    this.duckTimer = 0;
    this.strafeTimer = 0;
    this.strafeSign = this.rng.next() < 0.5 ? -1 : 1;
    this.shots = 0;
    this.scripted = false;
    this.hold = false;
    this.anchor.copy(position);
    this.believed.copy(position);
    this.perception.reset();
    this.bt.reset();
    this.clearPath();
    this.lastProgress.copy(position);
    this.stuck = 0;
    this.stalls = 0;
    this.escape = 0;
    this.ragdoll = null;

    this.drive.dead = false;
    this.drive.reload = -1;
    this.drive.grenade = -1;
    this.drive.vault = -1;
    this.drive.fireKick = 0;
    this.drive.flinch = 0;
    this.drive.aimWeight = 0;
    this.drive.lean = 0;
    this.drive.stance = STANCE_STAND;
    this.drive.position.copy(position);
    this.drive.velocity.set(0, 0, 0);
    this.drive.aim.set(position.x + Math.sin(heading) * 10, position.y + 1.5, position.z + Math.cos(heading) * 10);
    this.aimPoint.copy(this.drive.aim);

    if (this.instance) {
      this.instance.root.visible = true;
      this.instance.near.visible = true;
      this.instance.far.visible = false;
    }
    this.rig?.reset(position, heading);
    this.rig?.snapshot(this.bonePos, this.boneRot);
    // The rig only publishes a head position when it solves, which is a frame
    // away. Until then `eye` still holds wherever the last man in this pooled
    // slot was standing when he died, and anything asked before the first
    // update — a cover score, a sight test, a shot — is answered from a dead
    // soldier's eye socket somewhere else on the map.
    this.eye.copy(position);
    this.eye.y += this.eyeHeight;
    this.hitboxes?.setEntityId(this.id);
    this.hitboxes?.register(this.deps.physics);
  }

  despawn(): void {
    this.releaseCover();
    this.clearPath();
    this.hitboxes?.unregister(this.deps.physics);
    if (this.instance) this.instance.root.visible = false;
    this.squad?.remove(this);
    this.squad = null;
    this.active = false;
    this.alive = false;
    this.ragdoll = null;
  }

  /* -------------------------------- update --------------------------------- */

  /**
   * One frame. `perceive` is true only for the agents whose turn it is on the
   * rotating schedule; everything else here is cheap enough for all of them.
   */
  update(dt: number, target: AITarget | null, cameraDistance: number): void {
    if (!this.active) return;

    this.lod = cameraDistance > AI.lodFarDistance ? 2 : cameraDistance > AI.lodDistance ? 1 : 0;

    if (!this.alive) {
      this.updateDead(dt);
      return;
    }

    // Hold the claim for as long as the point is his. The timeout exists to
    // free cover belonging to somebody who was shot on the way to it, not to
    // evict a man who is standing behind it and shooting.
    if (this.coverIndex >= 0) this.deps.cover.refresh(this.coverIndex, this.id);

    this.suppression = Math.max(0, this.suppression - AI.suppressDecay * dt);
    this.sinceLook += dt;
    this.perception.age(dt);
    if (this.grenadeCooldown > 0) this.grenadeCooldown -= dt;
    if (this.reaction > 0) this.reaction -= dt;
    if (this.coverCheck > 0) this.coverCheck -= dt;
    if (this.repath > 0) this.repath -= dt;

    if (this.perception.visible && this.perception.contact === CONTACT_CONFIRMED) {
      this.engageTime += dt;
    } else {
      this.engageTime = Math.max(0, this.engageTime - dt * 0.4);
    }

    this.tickReload(dt);
    this.tickVault(dt);
    this.pollPath();
    this.steer(dt);
    this.tickWeapon(dt, target);
    this.applyDrive(dt);
  }

  /**
   * Where the agent thinks the target is, at chest height.
   *
   * Perception runs on a rotating schedule, so between checks the belief is
   * extrapolated from the last observed velocity — capped, because a soldier
   * who extrapolates for a second and a half is a soldier who shoots at where
   * you would have been if you had kept running, which is exactly the tell we
   * want and exactly the amount of it we want.
   */
  updateBelief(): void {
    const p = this.perception;
    this.believed.copy(p.lastKnown);
    const lead = Math.min(p.lastKnownAge, p.visible ? 0.25 : 0.6);
    if (lead > 0) this.believed.addScaledVector(p.lastKnownVel, lead);
    this.believed.y = p.lastKnown.y + 1.05;
  }

  private updateDead(dt: number): void {
    const rag = this.ragdoll;
    if (!rag || !rag.active) return;
    if (this.instance) rag.pose(this.instance.root, this.instance.bones);
    void dt;
  }

  /* ----------------------------- rig plumbing ------------------------------ */

  private applyDrive(dt: number): void {
    const rig = this.rig;
    if (!rig) return;
    const d = this.drive;
    d.position.copy(this.position);
    d.velocity.copy(this.velocity);
    d.heading = this.desiredHeading;
    d.stance = this.stance;
    d.aim.copy(this.aimPoint);
    d.aimWeight = this.aiming ? 1 : 0;
    d.lookWeight = this.lookWeight;
    d.lod = this.lod;
    d.fireKick = Math.max(0, d.fireKick - dt * 7);
    d.flinch = Math.max(0, d.flinch - dt * 2.6);
    d.lean = this.inCover && this.peekTime > 0 ? this.coverSide * 0.85 : 0;

    // Distant soldiers animate at a lower rate; the pose is held between
    // updates, which nobody can see at thirty-five metres and which is most of
    // the per-agent cost.
    const interval = this.lod === 2 ? 1 / 12 : this.lod === 1 ? 1 / 24 : 0;
    if (interval > 0) {
      this.lodAccum += dt;
      if (this.lodAccum < interval) return;
      dt = this.lodAccum;
      this.lodAccum = 0;
    }

    rig.update(dt, d);
    rig.snapshot(this.bonePos, this.boneRot);
    this.eye.copy(rig.eye);
    if (this.instance) {
      const far = this.lod === 2;
      if (this.instance.near.visible === far) {
        this.instance.near.visible = !far;
        this.instance.far.visible = far;
      }
    }
  }

  /* ------------------------------- navigation ------------------------------ */

  /** Asks for a path. Safe to call every frame with the same destination. */
  pathTo(destination: THREE.Vector3, speed: number = AI.runSpeed, arrive = 0.7): void {
    this.moveSpeed = speed;
    this.arriveRadius = arrive;
    if (this.hasGoal && this.goal.distanceToSquared(destination) < 0.45 && this.pathState !== PATH_FAILED) {
      return;
    }
    this.goal.copy(destination);
    this.hasGoal = true;
    this.stalls = 0;
    this.escape = 0;
    this.requestPath();
  }

  private requestPath(): void {
    // The cooldown is unconditional. Without it an agent whose path has run out
    // a metre short of an unreachable cover point asks for a new one every
    // frame, and sixteen of those is the pathfinder's entire budget spent on
    // searches nobody uses.
    if (this.repath > 0) return;
    this.repath = AI.repathInterval;
    this.pathRevision = this.path.revision;
    this.pathRequest = this.deps.nav.request(this.id, this.position, this.goal, this.path);
    this.pathState = this.pathRequest >= 0 ? PATH_PENDING : PATH_FAILED;
    this.pathWhy = 'requestPath';
    if (this.pathRequest < 0) this.pathIndex = 0;
  }

  private pollPath(): void {
    if (this.pathState !== PATH_PENDING) return;
    if (this.path.revision === this.pathRevision) return;
    this.pathIndex = 0;
    if (this.path.count === 0) {
      this.pathState = PATH_FAILED;
      this.pathWhy = 'pollPath:empty';
      return;
    }
    this.pathState = PATH_FOLLOW;
    this.pathWhy = 'pollPath:ok';
    // Skip the first waypoint when it is behind us: it is the cell the agent is
    // already standing in and walking back to its centre reads as a stumble.
    this.path.point(0, _way);
    if (this.path.count > 1 && _way.distanceToSquared(this.position) < NAV_CELL * NAV_CELL) {
      this.pathIndex = 1;
    }
  }

  clearPath(): void {
    if (this.pathState === PATH_PENDING) this.deps.nav.cancel(this.id);
    this.path.clear();
    this.pathState = PATH_IDLE;
    this.pathWhy = 'clearPath';
    this.pathIndex = 0;
    this.hasGoal = false;
    this.pathRequest = -1;
  }

  stop(): void {
    this.hasGoal = false;
    this.pathState = PATH_IDLE;
    this.pathWhy = 'stop';
  }

  /** Metres still to walk, or Infinity when there is no usable path. */
  get distanceToGoal(): number {
    if (!this.hasGoal) return Infinity;
    return this.position.distanceTo(this.goal);
  }

  get arrived(): boolean {
    return this.hasGoal && this.distanceToGoal <= this.arriveRadius;
  }

  get pathFailed(): boolean {
    return this.pathState === PATH_FAILED;
  }

  /** Seconds the capsule has been asked to move without making progress. */
  get stuckFor(): number {
    return this.stuck;
  }

  /**
   * Steering and the actual capsule move.
   *
   * Path following is pure pursuit against the smoothed polyline, with three
   * corrections layered on: separation from neighbours so a squad arriving at
   * one doorway spreads out, a whisker on each shoulder so an agent slides
   * along a wall instead of grinding into it, and a stuck timer that asks for a
   * fresh path when the capsule has stopped making progress.
   */
  private steer(dt: number): void {
    const physics = this.deps.physics;
    const speedCap = this.speedForStance();
    let wantX = 0;
    let wantZ = 0;
    let moving = false;

    if (this.vaultTime >= 0) {
      this.velocity.set(0, 0, 0);
      return;
    }

    if (this.hasGoal) {
      if (this.pathState === PATH_FOLLOW && this.pathIndex < this.path.count) {
        this.path.point(this.pathIndex, _way);
        const dx = _way.x - this.position.x;
        const dz = _way.z - this.position.z;
        const flat = Math.hypot(dx, dz);
        const last = this.pathIndex === this.path.count - 1;
        const reach = last ? this.arriveRadius : NAV_CELL * 0.62;
        if (flat < reach && Math.abs(_way.y - this.position.y) < 1.6) {
          this.pathIndex++;
          if (this.pathIndex >= this.path.count) {
            this.pathState = PATH_IDLE;
            this.pathWhy = 'steer:exhausted';
          }
        } else if (flat > 1e-4) {
          wantX = dx / flat;
          wantZ = dz / flat;
          moving = true;
        }
      } else if (this.pathState === PATH_IDLE) {
        // The route ran out. Either that is arrival, or the search only got
        // part of the way and it is worth asking again in a moment.
        if (!this.arrived) this.requestPath();
      } else if (this.pathState === PATH_PENDING || this.pathState === PATH_FAILED) {
        // Walk straight at it while the search runs, or when there is no route:
        // standing still waiting for a path is the most visible AI failure there
        // is, and the capsule will slide along whatever it meets.
        const dx = this.goal.x - this.position.x;
        const dz = this.goal.z - this.position.z;
        const flat = Math.hypot(dx, dz);
        if (flat > this.arriveRadius) {
          wantX = dx / flat;
          wantZ = dz / flat;
          moving = true;
        } else if (this.pathState === PATH_FAILED) {
          this.hasGoal = false;
        }
      }
    }

    // A stall recovery in progress overrides the path: the whole point is to
    // go somewhere the path did not ask for.
    if (this.escape > 0) {
      this.escape -= dt;
      wantX = this.escapeX;
      wantZ = this.escapeZ;
      moving = true;
    }

    if (moving) {
      // Neighbour separation. Written by the system before update.
      wantX += this.avoid.x;
      wantZ += this.avoid.z;

      if (physics && this.lod < 2) {
        // Whiskers. Two short rays off the shoulders; whichever is blocked
        // pushes the desired direction the other way.
        const len = 1.15;
        const eyeY = this.position.y + 0.9;
        for (let s = -1; s <= 1; s += 2) {
          _dir.set(wantX, 0, wantZ).normalize();
          _v.set(_dir.x * 0.9 - _dir.z * 0.44 * s, 0, _dir.z * 0.9 + _dir.x * 0.44 * s).normalize();
          _v2.set(this.position.x, eyeY, this.position.z);
          const hit = physics.raycast(_v2, _v, len, MOVE_MASK, this.ignore);
          if (hit) {
            const push = (1 - hit.distance / len) * 0.9;
            wantX -= _v.x * push;
            wantZ -= _v.z * push;
          }
        }
      }

      const mag = Math.hypot(wantX, wantZ);
      if (mag > 1e-4) {
        wantX /= mag;
        wantZ /= mag;
      }
    }

    const targetSpeed = moving ? Math.min(this.moveSpeed, speedCap) : 0;
    const rate = moving ? AI.accel : AI.brake;
    this.velocity.x = damp(this.velocity.x, wantX * targetSpeed, rate * 0.4, dt);
    this.velocity.z = damp(this.velocity.z, wantZ * targetSpeed, rate * 0.4, dt);
    this.velocity.y -= 9.81 * dt;

    if (physics) {
      const height = lerp(
        lerp(AI.standHeight, AI.crouchHeight, saturate(this.stanceBlend)),
        AI.proneHeight,
        saturate(this.stanceBlend - 1),
      );
      physics.moveCharacterInto(
        this.position,
        this.velocity,
        AI.radius,
        height,
        dt,
        this.move,
        AI.stepHeight,
      );
      this.position.copy(this.move.position);
      this.velocity.copy(this.move.velocity);
      this.grounded = this.move.grounded;
      if (this.grounded && this.velocity.y < 0) this.velocity.y = 0;
      // A man standing on a slope does not slide down it.
      //
      // The controller projects gravity along the ground it finds, so a soldier
      // who wants to stand still on the cobbles gets a downhill component back
      // out of the move. Damping that towards zero is not enough, because the
      // next frame's gravity is added to whatever survived, and it compounds up
      // to a steady creep — eight centimetres a second in the market, which is
      // a man drifting five metres out of his cover during a firefight. His feet
      // are planted; his legs hold him.
      if (!moving && this.grounded) {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    } else {
      this.position.addScaledVector(this.velocity, dt);
      this.velocity.y = 0;
      this.grounded = true;
    }

    this.stanceBlend = damp(this.stanceBlend, this.stance, 7, dt);

    // Stall detection and recovery.
    //
    // A capsule that has been asked to move and has not moved is against
    // something the path did not know about, wedged behind a squadmate, or
    // standing on a ledge the grid thinks is continuous. Asking for the same
    // path again produces the same path, so the response escalates: vault it,
    // then repath, then shove sideways for half a second and repath from
    // wherever that ends up, alternating shoulders. A soldier who stands in a
    // doorway for the rest of the match is the most damning bug the AI can
    // have, and it is invisible in every screenshot.
    if (moving) {
      const progress = this.position.distanceTo(this.lastProgress);
      if (progress < 0.09) {
        this.stuck += dt;
        if (this.stuck > 0.7) {
          this.stuck = 0;
          this.lastProgress.copy(this.position);
          if (this.stalls === 0) this.stallOrigin.copy(this.position);
          this.stalls++;
          if (this.move.hitWall && this.stalls <= 2) this.tryVault();
          if (this.vaultTime < 0) {
            if (this.stalls >= 2) {
              // Perpendicular to whatever we were trying to do, flipping side
              // each time so a wedge between two walls resolves either way.
              const mag = Math.hypot(wantX, wantZ) || 1;
              const side = this.stalls % 2 === 0 ? 1 : -1;
              this.escapeX = (-wantZ / mag) * side;
              this.escapeZ = (wantX / mag) * side;
              this.escape = 0.55;
            }
            if (this.stalls >= 3) {
              // Genuinely wedged — inside a doorframe, on a ledge the mover
              // will not let him off, behind a prop that spawned on top of him.
              // Put him back on the graph and start again. It is a teleport of
              // a metre or so and it is preferable in every way to a soldier
              // frozen in a wall for the rest of the match.
              this.unwedge();
              this.stalls = 0;
            }
            this.repath = 0;
            if (this.hasGoal) this.requestPath();
          }
        }
      } else {
        this.stuck = 0;
        // The count only resets once the agent is genuinely somewhere else. A
        // sideways shove that frees him for one step and lets him walk straight
        // back into the same corner must not read as a recovery, or he
        // oscillates in and out of it forever without ever escalating.
        if (this.stalls > 0 && this.position.distanceToSquared(this.stallOrigin) > 6.25) {
          this.stalls = 0;
        }
        this.lastProgress.copy(this.position);
      }
    } else {
      this.stuck = 0;
      this.stalls = 0;
      this.escape = 0;
      this.lastProgress.copy(this.position);
    }

    // Facing: look where you shoot when engaged, where you walk otherwise.
    if (this.aiming || this.perception.engaged) {
      _v.copy(this.aimPoint).sub(this.position);
      if (_v.lengthSq() > 1e-4) this.desiredHeading = Math.atan2(_v.x, _v.z);
    } else if (moving && (this.velocity.x !== 0 || this.velocity.z !== 0)) {
      const speed = Math.hypot(this.velocity.x, this.velocity.z);
      if (speed > 0.25) this.desiredHeading = Math.atan2(this.velocity.x, this.velocity.z);
    }
    this.heading = this.rig ? this.rig.yaw : this.desiredHeading;
  }

  /** Puts a wedged capsule back on the nearest node the graph can leave from. */
  private unwedge(): void {
    _v2.copy(this.hasGoal ? this.goal : this.anchor);
    if (!this.deps.nav.escapeSpot(this.position, _v2, _v)) return;
    if (_v.distanceToSquared(this.position) > 36) return;
    this.position.copy(_v);
    this.position.y += 0.05;
    this.velocity.set(0, 0, 0);
    this.escape = 0;
    this.stallOrigin.copy(this.position);
    this.lastProgress.copy(this.position);
  }

  private speedForStance(): number {
    if (this.stance === STANCE_PRONE) return AI.proneSpeed;
    if (this.stance === STANCE_CROUCH) return AI.crouchSpeed;
    return AI.sprintSpeed;
  }

  /* --------------------------------- vault --------------------------------- */

  /** Starts a vault when the wall in front is low and there is floor beyond. */
  private tryVault(): boolean {
    const physics = this.deps.physics;
    if (!physics || this.vaultTime >= 0 || this.stance !== STANCE_STAND) return false;
    const fx = Math.sin(this.desiredHeading);
    const fz = Math.cos(this.desiredHeading);

    _v.set(this.position.x, this.position.y + 0.35, this.position.z);
    _dir.set(fx, 0, fz);
    const low = physics.raycast(_v, _dir, 0.85, MOVE_MASK, this.ignore);
    if (!low) return false;
    _v.set(this.position.x, this.position.y + 1.25, this.position.z);
    if (physics.raycast(_v, _dir, 1.1, MOVE_MASK, this.ignore)) return false;

    // Somewhere to land, within a stride and a half.
    const landX = this.position.x + fx * 1.45;
    const landZ = this.position.z + fz * 1.45;
    _v.set(landX, this.position.y + 1.6, landZ);
    _v2.set(0, -1, 0);
    const floor = physics.raycast(_v, _v2, 2.6, MOVE_MASK, this.ignore);
    if (!floor || Math.abs(floor.point.y - this.position.y) > 1.15) return false;

    this.vaultFrom.copy(this.position);
    this.vaultTo.set(landX, floor.point.y, landZ);
    this.vaultTime = 0;
    this.drive.vault = 0;
    this.deps.events?.emit('audio:play', audio('enemy_vault', this.position, 0.7));
    return true;
  }

  private tickVault(dt: number): void {
    if (this.vaultTime < 0) return;
    this.vaultTime += dt / 0.62;
    const t = saturate(this.vaultTime);
    this.drive.vault = t;
    this.position.lerpVectors(this.vaultFrom, this.vaultTo, t);
    this.position.y += Math.sin(t * Math.PI) * 0.42;
    if (t >= 1) {
      this.vaultTime = -1;
      this.drive.vault = -1;
      this.velocity.set(0, 0, 0);
      this.repath = 0;
      if (this.hasGoal) this.requestPath();
    }
  }

  /* --------------------------------- cover --------------------------------- */

  /**
   * Picks and claims cover. Rate limited: cover scoring is the second most
   * expensive thing the AI does and the answer rarely changes inside a second.
   */
  takeCover(threat: THREE.Vector3, flank: number): boolean {
    if (this.coverCheck > 0 && this.coverIndex >= 0) {
      this.deps.cover.refresh(this.coverIndex, this.id);
      return true;
    }

    // A point that still faces the threat and is still ours is worth keeping;
    // hopping between equally good positions looks like indecision.
    if (this.coverIndex >= 0 && this.deps.cover.stillValid(this.coverIndex, threat)) {
      this.coverCheck = AI.coverRefresh;
      this.deps.cover.refresh(this.coverIndex, this.id);
      return true;
    }

    // Scoring is line-of-sight tests against a few dozen points, so only a
    // couple of agents may do it on any one frame. Everybody else waits a
    // frame, which nobody can see and which is most of the saving.
    if (!this.deps.canScoreCover()) return this.coverIndex >= 0;
    this.coverCheck = AI.coverRefresh;

    const found = this.deps.cover.best(
      this.deps.physics,
      this.id,
      this.position,
      threat,
      AI.coverSearchRadius,
      flank,
      this.ignore,
      this.deps.nav.regionAt(this.position.x, this.position.y, this.position.z),
      _choice,
    );
    if (!found) return false;
    if (_choice.index === this.coverIndex) return true;
    this.releaseCover();
    if (!this.deps.cover.claim(_choice.index, this.id)) return false;
    this.coverIndex = _choice.index;
    this.inCover = false;
    return true;
  }

  releaseCover(): void {
    if (this.coverIndex >= 0) this.deps.cover.release(this.coverIndex, this.id);
    this.coverIndex = -1;
    this.inCover = false;
    this.peekTime = 0;
  }

  /** True once the agent is standing on its claimed point. */
  atCover(): boolean {
    return this.coverDistance <= AI.coverArrive;
  }

  /** Metres from the claimed cover point, or Infinity when there is none. */
  get coverDistance(): number {
    const point = this.deps.cover.at(this.coverIndex);
    if (!point) return Infinity;
    const dx = this.position.x - point.position.x;
    const dz = this.position.z - point.position.z;
    // Height is checked separately and loosely: standing on the kerb beside a
    // low wall is still standing at it.
    if (Math.abs(this.position.y - point.position.y) > 1.2) return Infinity;
    return Math.hypot(dx, dz);
  }

  coverPosition(out: THREE.Vector3): boolean {
    const point = this.deps.cover.at(this.coverIndex);
    if (!point) return false;
    out.copy(point.position);
    return true;
  }

  coverIsLow(): boolean {
    return this.deps.cover.at(this.coverIndex)?.low ?? false;
  }

  /* -------------------------------- weapon --------------------------------- */

  startReload(): boolean {
    if (this.reloadLeft >= 0 || this.magazine >= AI.weapon.magSize) return false;
    this.reloadLeft = AI.weapon.reloadTime;
    this.drive.reload = 0;
    this.burstLeft = 0;
    this.squad?.callout(this.deps.events, 'reloading', this.position);
    this.deps.events?.emit('audio:play', audio('enemy_reload', this.position, 0.6));
    return true;
  }

  get reloading(): boolean {
    return this.reloadLeft >= 0;
  }

  private tickReload(dt: number): void {
    if (this.reloadLeft < 0) return;
    this.reloadLeft -= dt;
    this.drive.reload = saturate(1 - this.reloadLeft / AI.weapon.reloadTime);
    if (this.reloadLeft <= 0) {
      this.reloadLeft = -1;
      this.drive.reload = -1;
      this.magazine = AI.weapon.magSize;
    }
  }

  /** The tree calls this to hold the trigger; the agent decides the cadence. */
  fireAt(point: THREE.Vector3): void {
    this.aimPoint.copy(point);
    this.aiming = true;
    this.wantsFire = true;
  }

  holdFire(): void {
    this.wantsFire = false;
    this.burstLeft = 0;
  }

  /**
   * Cadence, aim error and the shot itself.
   *
   * Reaction time gates the first round of an engagement, burst discipline
   * gates the rest, and everything about where the round goes comes out of
   * `aimSpread` — which is the one number to move if getting shot ever stops
   * feeling fair.
   */
  private tickWeapon(dt: number, target: AITarget | null): void {
    const now = this.nextShot;
    if (now > 0) this.nextShot -= dt;
    if (this.burstPause > 0) this.burstPause -= dt;
    this.errorPhase += dt;

    if (!this.wantsFire || !this.alive || this.reloading || this.vaultTime >= 0) return;
    if (this.grenadeThrow >= 0) return;
    if (this.magazine <= 0) return;
    if (this.reaction > 0) return;
    if (this.nextShot > 0 || this.burstPause > 0) return;

    if (this.burstLeft <= 0) {
      const p = this.profile;
      this.burstLeft = Math.round(lerp(p.burstMin, p.burstMax, this.rng.next()));
      // One offset for the whole burst, resampled each time. Within the burst
      // it shrinks, so the rounds walk toward the target instead of scattering.
      const spread = this.aimSpread();
      const angle = this.rng.next() * Math.PI * 2;
      const radius = Math.sqrt(this.rng.next()) * spread;
      this.errorX = Math.cos(angle) * radius;
      this.errorY = Math.sin(angle) * radius * 0.55;
    }

    this.shoot(target);
    this.burstLeft--;
    this.nextShot = 60 / AI.weapon.rpm;
    if (this.burstLeft <= 0) {
      const p = this.profile;
      this.burstPause = lerp(p.burstPauseMin, p.burstPauseMax, this.rng.next());
      if (this.suppression > 0.3) this.burstPause *= 1 + this.suppression;
    }
  }

  /**
   * Half-angle of the shot cone, in radians. Everything that should make an
   * enemy worse at shooting lives here so it can be read in one place.
   */
  aimSpread(): number {
    const p = this.profile;
    const settle = saturate(this.engageTime / p.aimSettleTime);
    let spread = lerp(p.aimErrorFirst, p.aimErrorSettled, settle) * (Math.PI / 180);
    spread *= 1 + this.suppression * (p.suppressedAccuracy - 1);
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    spread *= 1 + saturate(speed / AI.runSpeed) * 0.85;
    if (this.stance === STANCE_CROUCH) spread *= 0.82;
    if (this.stance === STANCE_PRONE) spread *= 0.7;
    if (this.magazine < 5) spread *= 1.15;
    return spread;
  }

  private shoot(target: AITarget | null): void {
    const rig = this.rig;
    const events = this.deps.events;
    const physics = this.deps.physics;

    _muzzle.copy(rig ? rig.muzzle : this.position);
    if (!rig) _muzzle.y += AI.eyeHeightStand;

    // Aim at the target with lead, then displace by the burst's error, scaled
    // by range so the cone is an angle rather than a fixed metre offset.
    _v.copy(this.aimPoint);
    const distance = Math.max(0.5, _muzzle.distanceTo(_v));
    if (target) {
      _v.addScaledVector(target.velocity, this.profile.leadFactor * (distance / AI.weapon.muzzleVelocity));
    }
    _dir.copy(_v).sub(_muzzle).normalize();

    // Perpendicular basis for the error offset.
    _v2.crossVectors(_dir, _up);
    if (_v2.lengthSq() < 1e-6) _v2.set(1, 0, 0);
    _v2.normalize();
    _v3.crossVectors(_v2, _dir).normalize();

    // Within a burst the offset shrinks toward the aim point.
    const burstT = 1 - this.burstLeft / Math.max(1, this.profile.burstMax);
    const converge = lerp(1, 0.28, saturate(burstT));
    const jitter = this.aimSpread() * 0.22;
    const ox = (this.errorX * converge + (this.rng.next() - 0.5) * jitter) * distance;
    const oy = (this.errorY * converge + (this.rng.next() - 0.5) * jitter) * distance;
    _dir.addScaledVector(_v2, ox).addScaledVector(_v3, oy).normalize();

    this.magazine--;
    this.shots++;
    this.drive.fireKick = 1;
    _end.copy(_muzzle).addScaledVector(_dir, 220);

    // Resolve against the world first; a round that hits a wall cannot also
    // hit the man behind it.
    let travel = 220;
    let impact: THREE.Object3D | undefined;
    if (physics) {
      const hit = physics.raycast(_muzzle, _dir, 220, SHOT_MASK, this.ignore);
      if (hit) {
        travel = hit.distance;
        _hitPoint.copy(hit.point);
        impact = hit.object;
        _end.copy(hit.point);
        if (events) {
          _impactEvt.point.copy(hit.point);
          _impactEvt.normal.copy(hit.normal);
          _impactEvt.direction.copy(_dir);
          _impactEvt.energy = 0.65;
          _impactEvt.target = impact;
          (_impactEvt as { surface: string }).surface = hit.surface;
          events.emit('fx:impact', _impactEvt);
        }
      }
    }

    if (target && target.alive) {
      const t = closestApproach(_muzzle, _dir, target, travel);
      if (t >= 0) {
        const headshot = t > target.height * 0.86;
        const range = _muzzle.distanceTo(target.position);
        const falloff =
          range <= AI.weapon.falloffStart
            ? 1
            : lerp(
                1,
                AI.weapon.falloffMin,
                saturate((range - AI.weapon.falloffStart) / (AI.weapon.falloffEnd - AI.weapon.falloffStart)),
              );
        const amount =
          AI.weapon.damage *
          falloff *
          this.profile.damageScale *
          (headshot ? AI.weapon.headshotMultiplier : 1);
        target.damage(amount, _muzzle, headshot);
      }
    }

    if (events) {
      _fireEvt.id = this.id;
      _fireEvt.origin.copy(_muzzle);
      _fireEvt.direction.copy(_dir);
      events.emit('enemy:fire', _fireEvt);

      _flashEvt.position.copy(_muzzle);
      _flashEvt.direction.copy(_dir);
      _flashEvt.scale = 0.85;
      events.emit('fx:muzzleflash', _flashEvt);

      _tracerEvt.origin.copy(_muzzle);
      _tracerEvt.end.copy(_end);
      _tracerEvt.speed = AI.weapon.muzzleVelocity;
      _tracerEvt.caliber = AI.weapon.caliber;
      _tracerEvt.fromPlayer = false;
      events.emit('fx:tracer', _tracerEvt);

      events.emit('audio:play', audio('enemy_rifle', _muzzle, 1, 0.94 + this.rng.next() * 0.12));
    }

    this.deps.onFire(this, _muzzle, _dir);
  }

  /* -------------------------------- grenades ------------------------------- */

  canThrowGrenade(target: THREE.Vector3): boolean {
    if (this.grenadeCooldown > 0 || this.grenadeThrow >= 0 || this.reloading) return false;
    const d = this.position.distanceTo(target);
    return d >= AI.grenade.minRange && d <= AI.grenade.maxRange;
  }

  startGrenade(target: THREE.Vector3): void {
    this.grenadeThrow = 0;
    this.drive.grenade = 0;
    this.aimPoint.copy(target);
    this.squad?.callout(this.deps.events, 'grenade', this.position);
  }

  /** Advances the throw animation and releases at the top of the arc. */
  tickGrenade(dt: number, target: THREE.Vector3): boolean {
    if (this.grenadeThrow < 0) return false;
    const before = this.grenadeThrow;
    this.grenadeThrow += dt / 1.25;
    this.drive.grenade = saturate(this.grenadeThrow);
    if (before < 0.55 && this.grenadeThrow >= 0.55) {
      _v.copy(this.rig ? this.rig.muzzle : this.position);
      _v.y = this.position.y + 1.45;
      this.deps.throwGrenade(this, _v, target);
      this.grenadeCooldown = this.profile.grenadeCooldown;
    }
    if (this.grenadeThrow >= 1) {
      this.grenadeThrow = -1;
      this.drive.grenade = -1;
      return true;
    }
    return false;
  }

  /* --------------------------------- damage -------------------------------- */

  /** Returns true when this was the killing hit. */
  takeDamage(amount: number, from: THREE.Vector3, headshot: boolean, weapon: string): boolean {
    if (!this.alive) return false;
    this.health -= amount;
    this.suppression = Math.min(1.4, this.suppression + 0.3);

    const bone = this.hitboxes?.nearestTo(from, this.bonePos[B.chest], headshot) ?? B.chest;
    this.drive.flinch = Math.min(1, this.drive.flinch + (headshot ? 0.9 : 0.65));
    this.drive.flinchBone = bone;

    // Being shot at from somewhere unseen is information: face it.
    this.perception.hear(from, 0.9, 0, 0);
    if (this.perception.contact < CONTACT_CONFIRMED) {
      this.perception.lastKnown.copy(from);
      this.perception.lastKnownAge = 0;
      this.perception.investigated = false;
    }

    if (this.health <= 0) {
      this.kill(from, headshot, weapon, bone);
      return true;
    }
    return false;
  }

  kill(from: THREE.Vector3, headshot: boolean, weapon: string, bone: number): void {
    if (!this.alive) return;
    this.alive = false;
    this.health = 0;
    this.wantsFire = false;
    this.aiming = false;
    this.drive.dead = true;
    this.releaseCover();
    this.clearPath();
    this.hitboxes?.unregister(this.deps.physics);
    this.squad?.callout(this.deps.events, 'man-down', this.position);

    _v.copy(this.position).sub(from);
    _v.y = 0;
    if (_v.lengthSq() < 1e-6) _v.set(0, 0, 1);
    _v.normalize();
    _v.y = 0.22;
    _v.normalize().multiplyScalar(headshot ? 340 : 210);

    const rag = this.deps.ragdolls.acquire();
    if (rag && this.instance) {
      rag.begin(
        this.deps.physics,
        this.instance.root.parent ?? this.instance.root,
        this.bonePos,
        this.velocity,
        this.rig?.heightScale ?? 1,
        0,
      );
      rag.hit(this.deps.physics, particleForBone(bone), _v);
      this.ragdoll = rag;
      // The corpse is posed in world space, so the model must stop being a
      // child transform that the rig is also driving.
      this.instance.root.rotation.set(0, 0, 0);
    } else if (this.instance) {
      this.instance.root.visible = false;
    }

    this.deps.onDeath(this, headshot, _v, weapon);
  }

  /** Rounds passing close make an agent duck and shoot worse. */
  suppress(amount: number): void {
    this.suppression = Math.min(1.6, this.suppression + amount);
  }

  get pinned(): boolean {
    return this.suppression >= AI.suppressPinned;
  }

  /* -------------------------------- readout -------------------------------- */

  /** Distance to the current threat, or Infinity. */
  distanceTo(point: THREE.Vector3): number {
    return this.position.distanceTo(point);
  }

  get eyeHeight(): number {
    return this.stance === STANCE_PRONE
      ? AI.eyeHeightProne
      : this.stance === STANCE_CROUCH
        ? AI.eyeHeightCrouch
        : AI.eyeHeightStand;
  }

  eyePosition(out: THREE.Vector3): THREE.Vector3 {
    if (this.rig && this.eye.lengthSq() > 0) return out.copy(this.eye);
    return out.copy(this.position).setY(this.position.y + this.eyeHeight);
  }

  get isFlanker(): boolean {
    return this.role === ROLE_FLANK;
  }

  get isSuppressor(): boolean {
    return this.role === ROLE_SUPPRESS;
  }

  get ignoreList(): THREE.Object3D[] {
    return this.ignore;
  }
}

/* -------------------------------- helpers ---------------------------------- */

function audio(id: string, position: THREE.Vector3, volume: number, rate = 1) {
  _audioEvt.id = id;
  _audioEvt.position.copy(position);
  _audioEvt.volume = volume;
  _audioEvt.rate = rate;
  return _audioEvt;
}

/**
 * Where a round passes a target capsule. Returns the height up the capsule it
 * struck, or -1 for a miss. Used instead of a collider because the player is
 * not registered as one: the capsule is the authority on where he is, and
 * asking it directly is both cheaper and impossible to get out of sync.
 */
function closestApproach(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  target: AITarget,
  maxDistance: number,
): number {
  const bottom = target.position.y + target.radius;
  const top = target.position.y + target.height - target.radius;
  // Closest point between the ray and the vertical capsule segment.
  const px = target.position.x - origin.x;
  const pz = target.position.z - origin.z;
  const dxz = direction.x * direction.x + direction.z * direction.z;
  if (dxz < 1e-8) return -1;
  let t = (px * direction.x + pz * direction.z) / dxz;
  if (t < 0 || t > maxDistance) return -1;

  const hx = origin.x + direction.x * t - target.position.x;
  const hz = origin.z + direction.z * t - target.position.z;
  const lateral = Math.hypot(hx, hz);
  if (lateral > target.radius) return -1;

  // Height at which the round crosses the capsule axis, accounting for the
  // chord actually spent inside the cylinder.
  const chord = Math.sqrt(Math.max(0, target.radius * target.radius - lateral * lateral));
  const enter = Math.max(0, t - chord / Math.sqrt(dxz));
  const y = origin.y + direction.y * enter;
  if (y < bottom - target.radius || y > top + target.radius) return -1;
  return clamp(y - target.position.y, 0, target.height);
}

export { angleDelta };
