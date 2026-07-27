import * as THREE from 'three';
import type { DamageInfo, IActor, ILevel, IPlayer, IVfx } from '../core/Contracts';
import type { EventBus } from '../core/Events';
import type { PhysicsSystem } from '../physics/PhysicsSystem';
import type { MaterialLibrary } from '../render/textures/MaterialLibrary';
import type { Rng } from '../core/MathX';
import { clamp, damp, dampAngle, DEG, TAU } from '../core/MathX';
import { createEnemyModel, hitboxCapsules, type EnemyModelParts, type EnemyVariant } from './EnemyModel';
import { EnemyAnimator, type Stance } from './EnemyAnimator';
import { Perception } from './Perception';
import { CombatBrain, type EnemyStateName } from './BehaviorTree';
import type { Blackboard, CombatRole } from './Blackboard';

/** What an {@link Enemy} needs from the rest of the game, guarded/nullable. */
export interface AiWorld {
  elapsed: number;
  readonly rng: Rng;
  /** 0 easy .. 1 hard. */
  difficulty: number;
  level: ILevel | null;
  physics: PhysicsSystem | null;
  vfx: IVfx | null;
  player: IPlayer | null;
  materials: MaterialLibrary | null;
  events: EventBus;
  scene: THREE.Scene;
  director: IEnemyDirector;
}

/** Callbacks an enemy makes back into the director. */
export interface IEnemyDirector {
  /** Throw a visible, telegraphed grenade from `fromId`. */
  spawnGrenade(from: THREE.Vector3, target: THREE.Vector3, fromId: number): void;
  /** A soldier just made noise (its own gunfire) — cheap squad propagation. */
  onEnemyFired(position: THREE.Vector3, fromId: number): void;
}

interface WeaponProfile {
  rpm: number;
  magSize: number;
  damage: number;
  /** Base cone half-angle, degrees. */
  spread: number;
  burstMin: number;
  burstMax: number;
  range: number;
  reloadTime: number;
  fireSound: string;
  weaponName: string;
}

const PROFILES: Record<EnemyVariant, WeaponProfile> = {
  assault: { rpm: 680, magSize: 30, damage: 16, spread: 1.1, burstMin: 3, burstMax: 6, range: 90, reloadTime: 2.2, fireSound: 'ar', weaponName: 'ar_wolverine' },
  militia: { rpm: 600, magSize: 30, damage: 18, spread: 2.1, burstMin: 3, burstMax: 5, range: 70, reloadTime: 2.6, fireSound: 'ak', weaponName: 'ak_militia' },
  heavy: { rpm: 780, magSize: 100, damage: 13, spread: 2.4, burstMin: 8, burstMax: 14, range: 100, reloadTime: 4.5, fireSound: 'lmg', weaponName: 'lmg_bulwark' },
};

const BODY_MULT: Record<'head' | 'torso' | 'limb', number> = { head: 3.4, torso: 1.0, limb: 0.72 };

let _nextId = 1;

export class Enemy implements IActor {
  readonly id: number;
  readonly team = 'hostile' as const;
  readonly variant: EnemyVariant;
  readonly maxHealth: number;
  health: number;

  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  /** Patrol anchor / spawn point. */
  readonly home = new THREE.Vector3();
  yaw = 0;

  readonly model: EnemyModelParts;
  readonly animator: EnemyAnimator;
  readonly perception = new Perception();
  readonly brain: CombatBrain;

  /** Set by the Squad each think tick. */
  blackboard: Blackboard | null = null;
  role: CombatRole = 'hold';
  squadId = -1;

  state: EnemyStateName = 'Idle';
  stance: Stance = 'stand';
  suppressed = 0; // seconds remaining of suppression
  /** Engine time this enemy last ran its (staggered) think. */
  lastThinkTime = -1;

  // --- intents, filled by the brain, consumed by update() ---
  private desiredMove: THREE.Vector3 | null = null;
  private desiredRun = false;
  private aimTarget: THREE.Vector3 | null = null;
  private faceDir: THREE.Vector3 | null = null;
  private fireHeld = false;

  // --- movement ---
  private path: THREE.Vector3[] = [];
  private pathIdx = 0;
  private lastPathGoal = new THREE.Vector3(NaN, NaN, NaN);
  private lastPathTime = -100;
  private curSpeed = 0;

  // --- combat ---
  private profile: WeaponProfile;
  magAmmo: number;
  reserveAmmo = 240;
  private fireCooldown = 0;
  private burstLeft = 0;
  private burstPause = 0;
  private engageStart = -100;
  reloading = false;
  private reloadEnd = 0;

  // --- lifecycle ---
  alive = true;
  private deathTimer = 0;
  corpseAge = 0;
  private registeredStance: Stance | null = null;
  private ragdollSpawned = false;

  private world: AiWorld;

  constructor(world: AiWorld, variant: EnemyVariant, spawnPos: THREE.Vector3, yaw: number) {
    this.id = _nextId++;
    this.world = world;
    this.variant = variant;
    this.profile = PROFILES[variant];
    this.maxHealth = variant === 'heavy' ? 220 : variant === 'militia' ? 80 : 110;
    this.health = this.maxHealth;
    this.magAmmo = this.profile.magSize;

    this.model = createEnemyModel({ variant, rng: world.rng, materials: world.materials });
    this.animator = new EnemyAnimator(this.model);
    this.brain = new CombatBrain();

    this.position.copy(spawnPos);
    this.home.copy(spawnPos);
    this.yaw = yaw;
    this.model.root.position.copy(this.position);
    this.model.root.rotation.y = yaw;
    world.scene.add(this.model.root);

    this.registerHitboxes();
  }

  // Provide the materials at construction via a setter to keep createEnemyModel
  // call above simple; overridden by the factory in AiSystem.
  static create(world: AiWorld, variant: EnemyVariant, pos: THREE.Vector3, yaw: number): Enemy {
    return new Enemy(world, variant, pos, yaw);
  }

  // -------------------------------------------------------------------------
  // Queries used by the behaviour tree
  // -------------------------------------------------------------------------

  eyeWorld(out: THREE.Vector3): THREE.Vector3 {
    const drop = this.stance === 'crouch' ? 0.55 : this.stance === 'prone' ? 1.3 : 0;
    return out.set(this.position.x, this.position.y + 1.55 * this.model.heightScale - drop, this.position.z);
  }

  forward(out: THREE.Vector3): THREE.Vector3 {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  distanceTo(p: THREE.Vector3): number {
    return this.position.distanceTo(p);
  }

  get atPathEnd(): boolean {
    return this.pathIdx >= this.path.length;
  }

  get magFraction(): number {
    return this.magAmmo / this.profile.magSize;
  }
  get outOfAmmo(): boolean {
    return this.magAmmo <= 0;
  }
  get weaponRange(): number {
    return this.profile.range;
  }

  // -------------------------------------------------------------------------
  // Intent API (called by the brain)
  // -------------------------------------------------------------------------

  setState(s: EnemyStateName) {
    this.state = s;
  }
  moveTo(target: THREE.Vector3 | null, run = false) {
    this.desiredMove = target;
    this.desiredRun = run;
  }
  stop() {
    this.desiredMove = null;
  }
  aimAt(target: THREE.Vector3 | null) {
    this.aimTarget = target;
  }
  facePoint(p: THREE.Vector3 | null) {
    this.faceDir = p;
  }
  setStance(s: Stance) {
    this.stance = s;
  }
  holdFire(on: boolean) {
    this.fireHeld = on;
  }
  requestReload() {
    if (this.reloading || this.magAmmo >= this.profile.magSize || this.reserveAmmo <= 0) return;
    this.reloading = true;
    this.reloadEnd = this.world.elapsed + this.profile.reloadTime;
    this.animator.reload(this.profile.reloadTime);
    this.world.events.emit('enemy:alert', { id: this.id, position: this.position.clone() });
  }
  throwGrenadeAt(p: THREE.Vector3) {
    this.animator.throwGrenade();
    const from = new THREE.Vector3();
    this.eyeWorld(from);
    this.world.director.spawnGrenade(from, p, this.id);
  }
  addSuppression(seconds: number) {
    this.suppressed = Math.max(this.suppressed, seconds);
  }

  // -------------------------------------------------------------------------
  // Think (staggered, low rate) — perception + behaviour tree
  // -------------------------------------------------------------------------

  think(world: AiWorld, dtThink: number, sensed: boolean, visible: boolean) {
    if (!this.alive) return;
    // Perception feed (visibility already resolved by the scheduler).
    if (sensed && world.player) {
      const eye = world.player.eye;
      const dist = this.position.distanceTo(eye);
      const alarm = this.blackboard?.alarm ?? 0;
      this.perception.feedVision(visible, eye, dist, alarm, dtThink, world.difficulty);
      if (visible && this.blackboard) this.blackboard.markSeen(eye, world.elapsed);
    } else {
      this.perception.idleDecay(dtThink);
    }
    this.brain.tick(this, world, dtThink);
  }

  // -------------------------------------------------------------------------
  // Update (every frame) — movement, shooting, animation
  // -------------------------------------------------------------------------

  update(dt: number, world: AiWorld, animate = true) {
    if (!this.alive) {
      this.updateDead(dt);
      return;
    }
    if (this.suppressed > 0) this.suppressed = Math.max(0, this.suppressed - dt);
    if (this.reloading && world.elapsed >= this.reloadEnd) {
      this.reloading = false;
      const need = this.profile.magSize - this.magAmmo;
      const take = Math.min(need, this.reserveAmmo);
      this.magAmmo += take;
      this.reserveAmmo -= take;
    }

    this.updateMovement(dt, world);
    this.updateFacingAndAim(dt);
    this.updateShooting(dt, world);

    // Drive the model.
    this.model.root.position.copy(this.position);
    this.model.root.rotation.y = this.yaw;
    if (animate) {
      this.animator.setLocomotion(this.curSpeed);
      this.animator.setStance(this.stance);
      this.animator.update(dt, world.level ? (x, z) => world.level!.sampleGround(x, z) : null);
    } else {
      // Distant/off-screen: keep the world matrix current for shadows/hitboxes
      // but skip the expensive pose solve.
      this.model.root.updateMatrixWorld(true);
    }

    this.updateHitboxes();
  }

  private updateMovement(dt: number, world: AiWorld) {
    const level = world.level;
    if (this.desiredMove) {
      // Recompute the path if the goal moved or it's stale.
      const goalMoved = this.lastPathGoal.distanceToSquared(this.desiredMove) > 4;
      const stale = world.elapsed - this.lastPathTime > 1.2;
      if ((goalMoved || this.atPathEnd) && stale) {
        this.recomputePath(this.desiredMove, world);
      }
    } else {
      this.path.length = 0;
      this.pathIdx = 0;
    }

    let moving = false;
    if (this.pathIdx < this.path.length) {
      const wp = this.path[this.pathIdx];
      _tmp.subVectors(wp, this.position);
      _tmp.y = 0;
      const d = _tmp.length();
      if (d < 0.5) {
        this.pathIdx++;
      } else {
        _tmp.multiplyScalar(1 / d);
        const maxSpeed = this.desiredRun ? 4.3 : this.stance === 'crouch' ? 1.4 : 2.2;
        this.curSpeed = damp(this.curSpeed, maxSpeed, 0.002, dt);
        this.position.addScaledVector(_tmp, this.curSpeed * dt);
        this.velocity.copy(_tmp).multiplyScalar(this.curSpeed);
        moving = true;
        // Face travel direction unless we have an explicit aim/face override.
        if (!this.aimTarget && !this.faceDir) {
          this.yaw = dampAngle(this.yaw, Math.atan2(-_tmp.x, -_tmp.z), 0.001, dt);
        }
      }
    }
    if (!moving) {
      this.curSpeed = damp(this.curSpeed, 0, 0.0001, dt);
      this.velocity.multiplyScalar(0.1);
    }

    // Clamp to ground.
    if (level) {
      const g = level.sampleGround(this.position.x, this.position.z);
      if (g !== null) this.position.y = damp(this.position.y, g, 0.0001, dt);
    }
  }

  private recomputePath(goal: THREE.Vector3, world: AiWorld) {
    this.lastPathTime = world.elapsed;
    this.lastPathGoal.copy(goal);
    if (!world.level) {
      // No nav: head straight there.
      this.path = [goal.clone()];
      this.pathIdx = 0;
      return;
    }
    const p = world.level.findPath(this.position, goal);
    if (p && p.length) {
      this.path = p;
      this.pathIdx = 0;
    } else {
      this.path = [goal.clone()];
      this.pathIdx = 0;
    }
  }

  private updateFacingAndAim(dt: number) {
    const face = this.aimTarget ?? this.faceDir;
    if (face) {
      const targetYaw = Math.atan2(-(face.x - this.position.x), -(face.z - this.position.z));
      this.yaw = dampAngle(this.yaw, targetYaw, 0.0005, dt);
    }
    // Feed the animator aim (yaw residual + pitch to target).
    if (this.aimTarget) {
      const dx = this.aimTarget.x - this.position.x;
      const dz = this.aimTarget.z - this.position.z;
      const horiz = Math.hypot(dx, dz) || 0.001;
      const eyeY = this.position.y + 1.5 * this.model.heightScale;
      const pitch = Math.atan2(this.aimTarget.y - eyeY, horiz);
      let relYaw = Math.atan2(-dx, -dz) - this.yaw;
      relYaw = ((relYaw + Math.PI) % TAU) - Math.PI;
      this.animator.setAim(clamp(relYaw, -0.9, 0.9), clamp(pitch, -0.8, 0.8), 1);
    } else {
      this.animator.setAim(0, 0, 0.3);
    }
  }

  private updateShooting(dt: number, world: AiWorld) {
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.burstPause > 0) this.burstPause -= dt;

    const canFire =
      this.fireHeld &&
      !this.reloading &&
      this.magAmmo > 0 &&
      this.suppressed <= 0 &&
      this.aimTarget !== null &&
      this.perception.canSee;

    if (!canFire) return;
    if (this.burstPause > 0 || this.fireCooldown > 0) return;

    if (this.burstLeft <= 0) {
      this.burstLeft = world.rng.int(this.profile.burstMin, this.profile.burstMax);
    }
    this.fireOneRound(world);
    this.burstLeft--;
    this.fireCooldown = 60 / this.profile.rpm;
    if (this.burstLeft <= 0 || this.magAmmo <= 0) {
      this.burstPause = world.rng.range(0.5, 1.3);
    }
  }

  private fireOneRound(world: AiWorld) {
    this.magAmmo--;
    if (this.engageStart < 0) this.engageStart = world.elapsed;
    this.animator.fire();

    const muzzle = _muzzle;
    this.model.rifle.muzzle.getWorldPosition(muzzle);
    const player = world.player;
    if (!player) return;
    const targetEye = player.eye;

    // --- accuracy model: wide at first contact, converging over time ---
    const engaged = clamp(world.elapsed - this.engageStart, 0, 3);
    const firstContact = 1 + (1 - clamp(engaged / 1.5, 0, 1)) * 3.5;
    const dist = muzzle.distanceTo(targetEye);
    const distFactor = 1 + dist / 45;
    const moving = player.velocity.lengthSq() > 4 ? 1.5 : 1;
    const diff = 1.7 - world.difficulty * 1.0;
    const spreadRad = this.profile.spread * DEG * firstContact * distFactor * moving * diff;

    // Aim direction + gaussian jitter within the cone.
    _dir.subVectors(targetEye, muzzle).normalize();
    const jx = world.rng.gauss(0, spreadRad);
    const jy = world.rng.gauss(0, spreadRad);
    // Build a small basis to offset the direction.
    _right.crossVectors(_dir, _WORLD_UP).normalize();
    _upv.crossVectors(_right, _dir).normalize();
    _dir.addScaledVector(_right, Math.tan(jx)).addScaledVector(_upv, Math.tan(jy)).normalize();

    // Closest approach of the ray to the player eye → hit test.
    _w.subVectors(targetEye, muzzle);
    const t = _w.dot(_dir);
    let hitPlayer = false;
    let headshot = false;
    _closest.copy(muzzle).addScaledVector(_dir, Math.max(0, t));
    const miss = _closest.distanceTo(targetEye);
    if (t > 0 && miss < 0.28) {
      hitPlayer = true;
      headshot = miss < 0.12 && _closest.y > targetEye.y - 0.05;
    }

    // Tracer + muzzle flash.
    const vfx = world.vfx;
    const flashScale = this.model.rifle.flashScale;
    if (vfx) vfx.muzzleFlash(muzzle, _dir, flashScale);

    if (hitPlayer) {
      const dmg = this.damageAtRange(dist) * (headshot ? 2 : 1);
      const info: DamageInfo = {
        amount: dmg,
        origin: this.position.clone(),
        point: targetEye.clone(),
        direction: _dir.clone(),
        headshot,
        weapon: this.profile.weaponName,
        attackerId: this.id,
        kind: 'bullet',
      };
      player.applyDamage(info);
      if (vfx) vfx.tracer(muzzle, targetEye, 900, 0.02);
    } else {
      // Miss: land the round near the player on real geometry so the player is
      // suppressed and sees impacts. Prefer a physics raycast for a real point.
      let point = _impact.copy(muzzle).addScaledVector(_dir, Math.min(dist + 2, this.profile.range));
      let normal = _WORLD_UP;
      let surface = 'concrete';
      if (world.physics) {
        const hit = world.physics.raycast(muzzle, _dir, this.profile.range, { ignoreActorId: this.id });
        if (hit) {
          point = _impact.copy(hit.point);
          normal = hit.normal;
          surface = hit.surface;
        }
      }
      if (vfx) vfx.tracer(muzzle, point, 900, 0.02);
      world.events.emit('hit:surface', {
        point: point.clone(),
        normal: (normal as THREE.Vector3).clone(),
        surface,
        incoming: _dir.clone(),
      });
    }

    world.director.onEnemyFired(this.position, this.id);
  }

  private damageAtRange(dist: number): number {
    const base = this.profile.damage;
    const t = clamp((dist - 20) / (this.profile.range - 20), 0, 1);
    return base * (1 - t * 0.5);
  }

  // -------------------------------------------------------------------------
  // Damage / death
  // -------------------------------------------------------------------------

  applyDamage(info: DamageInfo) {
    if (!this.alive) return;
    const part = info.headshot ? 'head' : info.kind === 'explosion' ? 'torso' : 'torso';
    const mult = info.headshot ? BODY_MULT.head : BODY_MULT[part];
    const dmg = info.amount * mult;
    this.health -= dmg;

    // Blood VFX.
    if (this.world.vfx && info.point) {
      const inc = info.direction ?? _dir.subVectors(this.position, info.origin).normalize();
      this.world.vfx.bloodImpact(info.point, inc.clone().negate(), inc);
    }

    // Flinch (directional) + alert the squad to the shooter.
    if (this.alive) {
      const rel = this.relativeDir(info.origin);
      this.animator.flinch(rel);
      this.perception.hear(info.origin, 0.9, this.world.difficulty);
      if (this.blackboard) this.blackboard.markSeen(info.origin, this.world.elapsed);
    }

    if (this.health <= 0) this.kill(info);
  }

  private relativeDir(from: THREE.Vector3): number {
    const ang = Math.atan2(-(from.x - this.position.x), -(from.z - this.position.z));
    let rel = ang - this.yaw;
    rel = ((rel + Math.PI) % TAU) - Math.PI;
    return rel < 0 ? -1 : 1;
  }

  private kill(info: DamageInfo) {
    this.alive = false;
    this.health = 0;
    this.state = 'Dead';
    this.animator.die();
    this.deathTimer = 0;

    const dist = this.world.player ? this.position.distanceTo(this.world.player.position) : 0;
    this.world.events.emit('enemy:death', {
      id: this.id,
      headshot: !!info.headshot,
      distance: dist,
      weapon: info.weapon,
    });
    this.world.events.emit('ui:killfeed', {
      killer: info.attackerId === -1 ? 'PLAYER' : `enemy_${info.attackerId}`,
      victim: `${this.variant}_${this.id}`,
      weapon: info.weapon,
      headshot: !!info.headshot,
    });

    // Hand off to the physics ragdoll for the killing impulse.
    if (this.world.physics && !this.ragdollSpawned) {
      this.ragdollSpawned = true;
      const impulse = (info.direction ?? _dir.subVectors(this.position, info.origin).normalize())
        .clone()
        .multiplyScalar(info.headshot ? 26 : 16);
      const pelvis = new THREE.Vector3(this.position.x, this.position.y + 0.95, this.position.z);
      const hit = info.point ?? pelvis;
      const q = new THREE.Quaternion().setFromAxisAngle(_WORLD_UP, this.yaw);
      this.world.physics.spawnRagdoll({ position: pelvis, quaternion: q }, impulse, hit);
    }

    this.unregisterHitboxes();
  }

  private updateDead(dt: number) {
    this.deathTimer += dt;
    this.corpseAge += dt;
    // Canned collapse on our own mesh (the physics ragdoll is invisible; this
    // keeps a convincing body on the ground).
    this.animator.update(dt, null);
    this.model.root.position.copy(this.position);
    this.model.root.rotation.y = this.yaw;
  }

  // -------------------------------------------------------------------------
  // Physics hitboxes
  // -------------------------------------------------------------------------

  private registerHitboxes() {
    if (!this.world.physics) return;
    const caps = hitboxCapsules(this.stance, this.model.heightScale);
    this.world.physics.registerActor(this.id, caps, this.model.root);
    this.registeredStance = this.stance;
    this.updateHitboxes();
  }

  private updateHitboxes() {
    if (!this.world.physics) return;
    if (this.registeredStance !== this.stance) {
      // Stance changed → re-register with the right capsule layout so headshots
      // stay accurate when crouched/prone.
      this.world.physics.registerActor(this.id, hitboxCapsules(this.stance, this.model.heightScale), this.model.root);
      this.registeredStance = this.stance;
    }
    _hbQuat.setFromAxisAngle(_WORLD_UP, this.yaw);
    this.world.physics.updateActor(this.id, this.position, _hbQuat);
  }

  private unregisterHitboxes() {
    this.world.physics?.unregisterActor(this.id);
    this.registeredStance = null;
  }

  // -------------------------------------------------------------------------

  dispose() {
    this.unregisterHitboxes();
    this.model.dispose();
  }
}

const _tmp = new THREE.Vector3();
const _muzzle = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _upv = new THREE.Vector3();
const _w = new THREE.Vector3();
const _closest = new THREE.Vector3();
const _impact = new THREE.Vector3();
const _WORLD_UP = new THREE.Vector3(0, 1, 0);
const _hbQuat = new THREE.Quaternion();
