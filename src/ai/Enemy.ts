/**
 * One soldier.
 *
 * This is the class that owns everything an individual enemy is: its model and
 * its animator, its capsule, its senses, its weapon, and the state machine that
 * decides what it does. The subsystems it composes are all deliberately ignorant
 * of each other — perception does not know what combat does with awareness, and
 * the animator does not know why the aim point moved — and this file is where
 * they are wired together and where the per-frame budget is spent or saved.
 *
 * Three things here matter more than the rest.
 *
 * **Level of detail is scheduled, not switched.** Distance to the camera picks an
 * animation quality (0/1/2), an animation rate (every frame / 30 Hz / 10 Hz), a
 * perception rate (20 Hz / 8 Hz / 4 Hz), a behaviour decision rate, and whether
 * the capsule is moved every frame or every second frame with double the
 * displacement. A soldier a metre from the player's face costs roughly twelve
 * times what one at seventy metres does, and neither of them looks wrong.
 *
 * **The state machine only decides.** States set intent — a gait, a destination,
 * whether the weapon is up, whether firing is allowed — and this class executes
 * it every frame regardless of when the last decision was made. That is what lets
 * behaviour run at 7 Hz on a distant agent without their walk stuttering.
 *
 * **Damage is never applied here.** `applyDamage` is the combat module calling in;
 * every round this soldier fires goes out through `combat.fireBullet`.
 */
import * as THREE from 'three';
import type {
  CharacterControllerHandle,
  RagdollHandle,
} from '../core/Contracts';
import { allocEntityId, type Damageable, type DamageInfo, type Team } from '../core/GameTypes';
import { angleDelta, clamp, damp, lerp, Rng, saturate, smoothstep, TAU } from '../core/MathUtils';
import { archetypeOf, aiWeapon, ARCHETYPES, type Archetype } from './Archetypes';
import { Behavior } from './Behavior';
import type { Blackboard } from './Blackboard';
import { Combatant } from './Combatant';
import { makeCoverChoice, type CoverChoice } from './CoverPicker';
import { Locomotion, type AvoidanceField, type MoveGait } from './Locomotion';
import type { PathClient } from './Pathfinding';
import { Perception, type Sensing } from './Perception';
import type { Squad, SquadRole } from './Squad';
import { BODY, DIRECTOR, FIGHT, LOD, MOVE, PATH, SFX, SIGHT, VOICE } from './Tuning';
import { Animator, type AnimQuality, type GroundProbe } from './model/Animator';
import type { SoldierMesh } from './model/Factory';
import { B, restOffset } from './model/Rig';
import type { WeaponShape } from './model/Weapon';

export type EnemyStance = 'stand' | 'crouch';

/** How the body decides which way to point. */
export type FaceMode = 'path' | 'point' | 'idle';

const SCRATCH = /* @__PURE__ */ new THREE.Vector3();
const SCRATCH_B = /* @__PURE__ */ new THREE.Vector3();
const SCRATCH_A = /* @__PURE__ */ new THREE.Vector3();
const ZERO = /* @__PURE__ */ new THREE.Vector3();

/** Nothing non-finite is allowed to cross into the physics world. */
function finiteVector(v: THREE.Vector3): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}

/** Seconds a death keeps trying to claim the frame's ragdoll slot. */
const RAGDOLL_WAIT = 0.35;

/** Bones reset to bind before a ragdoll is built. See `openArmsForRagdoll`. */
const RAGDOLL_SAFE_BONES: readonly number[] = [
  B.shoulderL,
  B.armL,
  B.foreArmL,
  B.handL,
  B.shoulderR,
  B.armR,
  B.foreArmR,
  B.handR,
];

/** Yaw where 0 faces -Z, matching the player and the rig. */
export function yawTowards(from: THREE.Vector3, to: THREE.Vector3): number {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

/** How far the head may turn off the shoulders before the body has to follow. */
const HEAD_YAW_LIMIT = 0.95;

export class Enemy implements Damageable, PathClient, Sensing {
  readonly id = allocEntityId();
  readonly team: Team = 'enemy';

  health = 100;
  maxHealth = 100;

  archetype: Archetype = ARCHETYPES.rifleman;
  variantIndex = 0;
  weaponShape: WeaponShape = 'rifle';

  /** True while this instance occupies the world, corpse included. */
  live = false;
  /** True once dead; the corpse is still being simulated or faded. */
  dying = false;
  /** Set when the director may hand this instance back to the pool. */
  recyclable = false;

  readonly feet = new THREE.Vector3();
  bodyYaw = 0;
  /** Yaw the eyes look along; the head may lead the shoulders. */
  lookYaw = 0;
  stance: EnemyStance = 'stand';

  suppression = 0;
  role: SquadRole = 'support';
  squad: Squad | null = null;

  readonly perception = new Perception();
  readonly locomotion = new Locomotion();
  readonly combatant: Combatant;
  readonly behavior = new Behavior();

  model!: SoldierMesh;
  animator!: Animator;
  controller: CharacterControllerHandle | null = null;
  ragdoll: RagdollHandle | null = null;

  // --- Intent, written by the behaviour states ------------------------------
  gait: MoveGait = 'walk';
  /** 0 = weapon slung at low ready, 1 = shouldered. */
  wantWeaponUp = 0.15;
  wantCrouch = false;
  allowFire = false;
  faceMode: FaceMode = 'idle';
  readonly facePoint = new THREE.Vector3();
  /** Yaw the agent returns to when it has nothing to look at. */
  homeYaw = 0;
  /**
   * Held for inspection: senses and decisions are skipped and the weapon is safe,
   * but the animator, the stance blends and the aim solver all keep running. Used
   * by the model line-up the headless capture photographs, where a soldier that
   * decides to run for cover is a soldier that cannot be looked at.
   */
  posed = false;

  // --- Cover ---------------------------------------------------------------
  readonly cover: CoverChoice = makeCoverChoice();
  hasCover = false;
  /** True while leaning out of cover to shoot. */
  peeking = false;
  peekUntil = 0;
  peekNextAt = 0;

  /**
   * True while this agent holds one of the director's engagement tokens, meaning
   * it is the one allowed to shoot to kill. Everyone else keeps firing on a much
   * wider cone: see `FIGHT.maxEngaging`.
   */
  focused = false;

  // --- Scratch and bookkeeping ---------------------------------------------
  /** Last value published through `ai:alerted`, so the edge fires once. */
  private announcedAlert = false;
  private bb: Blackboard;
  private readonly rng: Rng;
  private readonly probe: GroundProbe;
  private readonly displacement = new THREE.Vector3();
  private readonly directPath = new Float32Array(6);
  private readonly pathGoal = new THREE.Vector3();

  private crouchBlend = 0;
  private weaponUpBlend = 0.15;
  private eyeHeight: number = BODY.eyeHeight;
  /** Last height handed to combat, so the blend only pushes real changes. */
  private reportedHeight: number = BODY.standHeight;

  private perceptionAccum = 0;
  private animAccum = 0;
  private moveAccum = 0;
  private cameraDistance = 0;
  private quality: AnimQuality = 0;

  private pathPending = false;
  private lastPathAt = -100;
  private pathFailures = 0;
  private scanOffset = 0;
  private scanGoal = 0;
  private scanTimer = 0;
  private lastVoiceAt = -100;
  private voicePitch = 1;
  private lastFootstepAt = -100;
  private corpseUntil = 0;
  private diedAt = 0;
  private sink = 0;
  private deathTilt = 0;
  private deathTiltGoal = 0;
  /** The killing shot, kept because the ragdoll may be built a frame or two later. */
  private readonly deathImpulse = new THREE.Vector3();
  private readonly deathPoint = new THREE.Vector3();
  private ragdollDeadline = -1;
  private lastHurtAt = -100;
  private frameOffset = 0;

  constructor(bb: Blackboard) {
    this.bb = bb;
    this.rng = new Rng((this.id * 2654435761) >>> 0);
    this.voicePitch = this.rng.range(0.92, 1.08);
    this.combatant = new Combatant(aiWeapon(ARCHETYPES.rifleman.weaponId));
    this.frameOffset = this.id & 15;
    // A cheap surface query for foot planting. Near agents upgrade to a real ray
    // in `groundAt`, which is where the accuracy actually shows.
    this.probe = (x, z, y) => this.groundAt(x, z, y);
  }

  // =========================================================================
  // Damageable
  // =========================================================================

  get isAlive(): boolean {
    return this.live && !this.dying && this.health > 0;
  }

  getPosition(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.feet);
  }

  applyDamage(info: DamageInfo): void {
    if (!this.isAlive) return;
    const bb = this.bb;
    this.health -= info.amount;

    this.animator.notifyHit(info.direction, info.bodyPart);
    // Where the round came from, which is all an agent needs to face the fight.
    SCRATCH.copy(this.feet).addScaledVector(info.direction, -12);
    this.perception.noteThreatFrom(SCRATCH, this.feet);

    const source = info.source;
    if (source && source.team !== this.team) {
      // Being hit is positive identification of a direction, if not of a man.
      this.perception.awareness = Math.max(
        this.perception.awareness,
        SIGHT.engageThreshold * 0.97,
      );
      if (!this.perception.everSeen) {
        source.getPosition(SCRATCH_B);
        this.perception.receiveContact(SCRATCH_B, ZERO, bb.now);
      }
    }
    this.suppression = Math.min(FIGHT.maxSuppression, this.suppression + 0.75);

    if (this.health <= 0) {
      this.die(bb, info);
      return;
    }
    if (bb.now - this.lastHurtAt > 2.4) {
      this.lastHurtAt = bb.now;
      this.say(bb, VOICE.hit, 0.9);
    }
  }

  // =========================================================================
  // Sensing (Perception's host interface)
  // =========================================================================

  eyePosition(out: THREE.Vector3): THREE.Vector3 {
    return this.eye(out);
  }

  eye(out: THREE.Vector3): THREE.Vector3 {
    return out.set(this.feet.x, this.feet.y + this.eyeHeight, this.feet.z);
  }

  // =========================================================================
  // PathClient
  // =========================================================================

  get pathOwnerId(): number {
    return this.id;
  }

  onPathReady(points: Float32Array, count: number, partial: boolean): void {
    this.pathPending = false;
    this.pathFailures = 0;
    if (count <= 1) {
      this.locomotion.clearPath();
      return;
    }
    this.locomotion.setPath(points, count, partial);
  }

  onPathFailed(): void {
    this.pathPending = false;
    this.pathFailures++;
    // Off-mesh or unreachable. A short straight line is still worth trying: most
    // failures are a doorway threshold the rasteriser called blocked, and the
    // capsule can walk through it perfectly well.
    if (this.feet.distanceToSquared(this.pathGoal) < 49) this.moveDirect(this.pathGoal);
    else this.locomotion.clearPath();
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /** Attaches a freshly built (or recycled) model. Rebuilds the animator. */
  attachModel(model: SoldierMesh, variantIndex: number, shape: WeaponShape): void {
    this.model = model;
    this.variantIndex = variantIndex;
    this.weaponShape = shape;
    this.animator = new Animator(model, (this.id * 48271) >>> 0);
  }

  /** True when the attached model is already the one a spawn request wants. */
  modelMatches(variantIndex: number, shape: WeaponShape): boolean {
    return this.variantIndex === variantIndex && this.weaponShape === shape;
  }

  spawn(
    bb: Blackboard,
    position: THREE.Vector3,
    yaw: number,
    archetypeId: string | undefined,
  ): void {
    this.bb = bb;
    const archetype = archetypeOf(archetypeId);
    this.archetype = archetype;
    this.maxHealth = Math.round(archetype.health * bb.difficulty.healthScale);
    this.health = this.maxHealth;

    this.live = true;
    this.dying = false;
    this.recyclable = false;
    this.ragdoll = null;
    this.sink = 0;
    this.deathTilt = 0;
    this.deathTiltGoal = 0;
    this.ragdollDeadline = -1;

    this.feet.copy(position);
    this.bodyYaw = yaw;
    this.lookYaw = yaw;
    this.homeYaw = yaw;
    this.stance = 'stand';
    this.crouchBlend = 0;
    this.weaponUpBlend = 0.15;
    this.wantWeaponUp = 0.15;
    this.wantCrouch = false;
    this.allowFire = false;
    this.faceMode = 'idle';
    this.gait = 'walk';
    this.posed = false;
    this.eyeHeight = BODY.eyeHeight;
    this.reportedHeight = BODY.standHeight;
    this.suppression = 0;
    this.role = 'support';
    this.perceptionAccum = 0;
    this.animAccum = 0;
    this.moveAccum = 0;
    this.pathPending = false;
    this.pathFailures = 0;
    this.lastPathAt = -100;
    this.lastVoiceAt = -100;
    this.lastHurtAt = -100;
    this.hasCover = false;
    this.cover.index = -1;
    this.peeking = false;
    this.peekUntil = 0;
    this.peekNextAt = bb.now + this.rng.range(0.4, 1.6);
    this.announcedAlert = false;
    this.focused = false;

    this.perception.reset();
    this.locomotion.clearPath();
    this.locomotion.velocity.set(0, 0, 0);
    this.combatant.reset(aiWeapon(archetype.weaponId), archetype.grenades);
    this.behavior.reset();

    const model = this.model;
    model.setDetail(0);
    model.root.visible = true;
    model.root.position.copy(position);
    model.root.rotation.set(0, yaw, 0);
    model.root.scale.set(1, 1, 1);
    // The weapon may still be parented to a hand from the previous death.
    if (model.weaponHolder.parent !== model.root) model.root.add(model.weaponHolder);
    this.animator.reset(position, yaw);

    const physics = bb.physics;
    if (physics && physics.ready) {
      this.controller = physics.createCharacter(position, BODY.standHeight, BODY.radius, {
        kind: 'character',
        entity: this,
        surface: 'flesh',
        object3D: model.root,
      });
    }

    const combat = bb.combat;
    if (combat) {
      combat.register(this);
      combat.setDisplayName?.(this, archetype.label);
      combat.setHitboxHeight?.(this, BODY.standHeight);
    }
  }

  /** Tears down world presence. The model and its animator are kept for reuse. */
  despawn(bb: Blackboard): void {
    if (!this.live) return;
    this.live = false;
    this.dying = false;
    this.recyclable = false;
    this.releaseCover(bb);
    this.squad?.releaseMove(this);
    bb.planner.cancel(this);
    bb.combat?.unregister(this);
    this.controller?.destroy();
    this.controller = null;
    this.ragdoll?.destroy();
    this.ragdoll = null;
    this.locomotion.clearPath();
    this.model.root.visible = false;
  }

  /**
   * Opens the arms out to their bind offsets before the ragdoll takes over.
   *
   * The ragdoll's capsules only have their contacts filtered across a joint, and a
   * soldier dies holding a weapon across his chest, which leaves both forearms
   * inside the torso capsule they are not jointed to. Starting a contact solver
   * from a 10 cm penetration between two heavy bodies is how a corpse ends up
   * kicking itself across the street. The bind pose has the clearance the death
   * pose does not.
   *
   * Only the arms are reset. The legs and spine keep the pose the man died in, so a
   * body that was crouched still collapses from a crouch, and the arms are being
   * thrown by the impulse on the same frame anyway.
   */
  private openArmsForRagdoll(): void {
    const bones = this.model.bones;
    for (const index of RAGDOLL_SAFE_BONES) {
      const bone = bones[index];
      restOffset(index, SCRATCH_A);
      bone.position.copy(SCRATCH_A);
      bone.quaternion.identity();
      bone.scale.set(1, 1, 1);
    }
  }

  /**
   * True when every bone's world transform is finite and the figure is roughly the
   * right size. Cheap: 22 bones, three reads each, once per death.
   */
  private poseIsSound(): boolean {
    const bones = this.model.bones;
    for (let i = 0; i < bones.length; i++) {
      const e = bones[i].matrixWorld.elements;
      for (let k = 0; k < 16; k++) if (!Number.isFinite(e[k])) return false;
    }
    // A collapsed or exploded hierarchy passes the finite test and still produces
    // nonsense capsules, so check the one span the ragdoll layout keys off.
    SCRATCH_A.setFromMatrixPosition(bones[B.hips].matrixWorld);
    SCRATCH_B.setFromMatrixPosition(bones[B.head].matrixWorld);
    const span = SCRATCH_A.distanceTo(SCRATCH_B);
    return span > 0.2 && span < 3;
  }

  private die(bb: Blackboard, info: DamageInfo): void {
    this.health = 0;
    this.dying = true;
    this.allowFire = false;
    this.diedAt = bb.now;
    this.releaseCover(bb);
    this.squad?.releaseMove(this);
    bb.planner.cancel(this);
    this.locomotion.clearPath();
    bb.combat?.unregister(this);
    this.controller?.destroy();
    this.controller = null;
    this.behavior.force(this, bb, 'dead');

    this.say(bb, VOICE.death, 1);
    bb.play(SFX.bodyFall, this.feet, 0.75, this.rng.range(0.9, 1.1));

    // Remember the shot that killed him: the ragdoll may not be built until a
    // later frame, and by then the pooled damage record will have been reused.
    this.deathImpulse.copy(info.direction).multiplyScalar(clamp(info.impulse, 12, 220));
    if (!finiteVector(this.deathImpulse)) this.deathImpulse.set(0, 1, 0);
    this.deathPoint.copy(info.point);
    if (!finiteVector(this.deathPoint)) this.deathPoint.copy(this.feet).setY(this.feet.y + 1.1);
    this.ragdollDeadline = bb.now + RAGDOLL_WAIT;
    this.startCollapse(bb);
    this.tryRagdoll(bb);
  }

  /**
   * Builds the ragdoll if the frame's budget allows it. Returns true on success.
   *
   * Retried from `updateCorpse` while the deadline holds, so a pair killed by one
   * grenade both end up as ragdolls a frame apart rather than one ragdoll and one
   * procedural collapse.
   */
  private tryRagdoll(bb: Blackboard): boolean {
    const physics = bb.physics;
    if (!physics || !physics.ready || bb.ragdollBudget <= 0) return false;
    bb.ragdollBudget--;

    // Deliberately built from proportions rather than from our skeleton.
    //
    // Passing the skeleton is the better-looking option — the capsules then match
    // the body they came from — and it is what this did first. It also reproducibly
    // panics Rapier inside `world.step()` a frame or two after a death, which is
    // not a bad-looking corpse but an unrecoverable physics world: the panic leaves
    // the Rust side borrowed, and from then on every step throws and nothing in the
    // game moves. Handing over `null` runs the physics module's synthesised
    // humanoid instead, which is clean under the same test and costs nothing here
    // because every soldier this module builds is the same 1.8 m figure the
    // synthesised layout assumes. See the module report for the reproduction.
    //
    // The pose still has to be sound and up to date: the layout reads
    // `root.matrixWorld`, which three.js only refreshes at render time, and a death
    // resolved mid-frame would otherwise be built from last frame's transform.
    const model = this.model;
    this.openArmsForRagdoll();
    model.root.updateWorldMatrix(false, true);
    if (!this.poseIsSound()) return false;
    this.ragdoll = physics.createRagdoll(null, model.root, {
      impulse: this.deathImpulse,
      impulsePoint: this.deathPoint,
    });
    if (!this.ragdoll) return false;

    // Hand the pose back to physics and let the weapon fall with the hand that was
    // holding it.
    this.deathTiltGoal = 0;
    this.deathTilt = 0;
    model.root.rotation.x = 0;
    this.corpseUntil = bb.now + DIRECTOR.corpseLifetime;
    model.bones[B.handR].attach(model.weaponHolder);
    return true;
  }

  /** The no-ragdoll death: fold at the waist and topple about the feet. */
  private startCollapse(bb: Blackboard): void {
    this.deathTiltGoal = this.rng.bool() ? 1.45 : -1.35;
    this.deathTilt = 0;
    // Shorter than a ragdoll's stay: a procedural corpse does not stand up to
    // being looked at for twenty seconds.
    this.corpseUntil = bb.now + 6;
  }

  // =========================================================================
  // Per-frame update
  // =========================================================================

  update(dt: number, bb: Blackboard, field: AvoidanceField | null): void {
    if (!this.live) return;
    this.bb = bb;

    const dx = this.feet.x - bb.cameraPosition.x;
    const dy = this.feet.y - bb.cameraPosition.y;
    const dz = this.feet.z - bb.cameraPosition.z;
    this.cameraDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this.quality =
      this.cameraDistance < LOD.nearDistance ? 0 : this.cameraDistance < LOD.midDistance ? 1 : 2;
    this.model.setDetail(this.quality === 2 ? 1 : 0);

    if (this.dying) {
      this.updateCorpse(dt, bb);
      return;
    }

    if (!this.posed) {
      this.updateSenses(dt, bb);
      // Assert the cover claim before the state runs, not inside whichever states
      // remember to. Any state can hold a slot across a frame — reloading, moving,
      // suppressed — and only one place can be trusted to renew it every one.
      this.refreshCover(bb);
      this.behavior.update(this, bb, dt, this.quality);
    }
    this.combatant.update(dt, bb, this, this.allowFire && !this.posed);
    if (this.combatant.throwPending) this.combatant.tickGrenade(bb, this);

    this.updateFacing(dt);
    this.updateStance(dt, bb);
    this.updateMovement(dt, bb, field);
    this.updateAnimation(dt, bb);
  }

  private updateSenses(dt: number, bb: Blackboard): void {
    this.perceptionAccum += dt;
    const rate =
      this.quality === 0
        ? LOD.perceptionNear
        : this.quality === 1
          ? LOD.perceptionMid
          : LOD.perceptionFar;
    if (this.perceptionAccum >= rate) {
      this.perception.update(this.perceptionAccum, bb, this);
      this.perceptionAccum = 0;
    }
    this.perception.advanceMemory(dt, bb);

    // The contract's alert event, on the rising edge only: the UI and the audio
    // mix want to know the moment a man goes from unaware to hunting, and would
    // rather not be told again every frame he stays that way.
    const alerted = this.perception.alerted;
    if (alerted !== this.announcedAlert) {
      this.announcedAlert = alerted;
      if (alerted) {
        bb.ctx.events.emit('ai:alerted', {
          enemyId: this.id,
          position: this.perception.everSeen ? this.perception.lastKnown : this.feet,
        });
      }
    }

    if (this.suppression > 0) {
      this.suppression = Math.max(0, this.suppression - FIGHT.suppressionDecay * dt);
    }

    // Radio. The delay between one man seeing you and his squad knowing is what
    // makes taking the first shot worth anything.
    const perception = this.perception;
    if (perception.radioPending && bb.now >= perception.radioAt) {
      perception.radioPending = false;
      perception.radioAt = -1;
      const squad = this.squad;
      if (squad) {
        squad.report(this, perception.lastKnown, perception.lastVelocity, bb);
        squad.callout(bb, this, VOICE.contact);
      } else {
        this.say(bb, VOICE.contact, 1);
      }
    }
  }

  /**
   * Body yaw, head yaw and the idle scan.
   *
   * The body turns at a rate, never instantly, and the head is allowed to lead it
   * by up to about 55 degrees — which is also the perception cone's axis, so an
   * agent whose attention is elsewhere genuinely cannot see you.
   */
  private updateFacing(dt: number): void {
    let target = this.bodyYaw;
    switch (this.faceMode) {
      case 'point':
        target = yawTowards(this.feet, this.facePoint);
        break;
      case 'path': {
        const v = this.locomotion.velocity;
        if (v.x * v.x + v.z * v.z > 0.36) target = Math.atan2(-v.x, -v.z);
        else if (this.locomotion.hasPath) target = yawTowards(this.feet, this.locomotion.steerTarget);
        break;
      }
      default:
        target = this.homeYaw + this.scanOffset;
    }

    const error = angleDelta(this.bodyYaw, target);
    const rate = this.weaponUpBlend > 0.5 ? MOVE.aimTurnRate : MOVE.turnRate;
    const step = clamp(error, -rate * dt, rate * dt);
    this.bodyYaw += step;
    if (this.bodyYaw > Math.PI) this.bodyYaw -= TAU;
    else if (this.bodyYaw < -Math.PI) this.bodyYaw += TAU;

    // Idle scanning. Only while genuinely unaware, so it never fights with a
    // deliberate look at something.
    if (!this.posed && this.perception.awareness < SIGHT.alertThreshold) {
      this.scanTimer -= dt;
      if (this.scanTimer <= 0) {
        this.scanTimer = this.rng.range(1.5, 3.8);
        this.scanGoal = this.rng.range(-0.85, 0.85);
      }
      this.scanOffset = damp(this.scanOffset, this.scanGoal, 2.2, dt);
    } else {
      this.scanOffset = damp(this.scanOffset, 0, 6, dt);
    }

    // The head follows whatever the weapon is tracking, clamped to the neck.
    const attention = yawTowards(this.feet, this.combatant.aimGoal);
    const lead = clamp(angleDelta(this.bodyYaw, attention), -HEAD_YAW_LIMIT, HEAD_YAW_LIMIT);
    this.lookYaw = this.bodyYaw + lead + (this.faceMode === 'idle' ? this.scanOffset * 0.6 : 0);
  }

  private updateStance(dt: number, bb: Blackboard): void {
    const controller = this.controller;
    const wantCrouch = this.wantCrouch || this.suppression > FIGHT.suppressionPinned * 2;
    const target: EnemyStance = wantCrouch ? 'crouch' : 'stand';
    if (target !== this.stance) {
      const height = target === 'crouch' ? BODY.crouchHeight : BODY.standHeight;
      const ok = !controller || controller.setHeight(height);
      if (ok) {
        this.stance = target;
        bb.play(SFX.gearShift, this.feet, 0.25, this.rng.range(0.95, 1.1));
      }
    }
    this.crouchBlend = damp(this.crouchBlend, this.stance === 'crouch' ? 1 : 0, 9, dt);
    this.weaponUpBlend = damp(this.weaponUpBlend, this.wantWeaponUp, 7, dt);
    this.eyeHeight = lerp(BODY.eyeHeight, BODY.crouchEyeHeight, this.crouchBlend);

    // Combat scales its analytic capsule by whatever height it was last told, so that
    // height has to follow the visible blend rather than the stance flag. Snapping it
    // on the flag leaves a third of a second at the start of every duck where the
    // capsule is half a metre shorter than the soldier on screen, and a head shot
    // aimed during that window hits air.
    const blended = lerp(BODY.standHeight, BODY.crouchHeight, this.crouchBlend);
    if (Math.abs(blended - this.reportedHeight) > 0.02) {
      this.reportedHeight = blended;
      bb.combat?.setHitboxHeight?.(this, blended);
    }
  }

  private updateMovement(dt: number, bb: Blackboard, field: AvoidanceField | null): void {
    const locomotion = this.locomotion;
    locomotion.gait = this.gait;

    // Turn before walking when the path doubles back, so nobody strafes at full
    // speed sideways down an alley.
    let gate = 1;
    if (this.faceMode === 'path' && locomotion.hasPath) {
      const error = Math.abs(angleDelta(this.bodyYaw, yawTowards(this.feet, locomotion.steerTarget)));
      gate = 1 - 0.8 * smoothstep(MOVE.turnInPlaceAngle * 0.55, MOVE.turnInPlaceAngle, error);
    }
    const suppressed = saturate(this.suppression / FIGHT.maxSuppression);
    locomotion.speedScale = this.archetype.speedScale * gate * (1 - suppressed * 0.45);
    locomotion.aiming = this.weaponUpBlend > 0.5;

    this.moveAccum += dt;
    const stride = this.cameraDistance > LOD.moveStrideDistance ? 2 : 1;
    if ((bb.frame + this.frameOffset) % stride !== 0) return;
    const step = this.moveAccum;
    this.moveAccum = 0;

    const controller = this.controller;
    locomotion.step(step, this.feet, controller?.grounded ?? true, field, this.id, this.displacement);
    if (controller) {
      const applied = controller.move(this.displacement, step);
      locomotion.commit(applied, step);
      this.feet.copy(controller.position);
    } else {
      this.feet.add(this.displacement);
      const ground = bb.surfaceAt(this.feet.x, this.feet.z, this.feet.y);
      if (ground !== null) this.feet.y = ground;
    }
  }

  private updateAnimation(dt: number, bb: Blackboard): void {
    const animator = this.animator;
    animator.velocity.copy(this.locomotion.velocity);
    animator.bodyYaw = this.bodyYaw;
    animator.crouch = this.crouchBlend;
    animator.weaponUp = this.weaponUpBlend;
    animator.suppression = saturate(this.suppression / 1.6) * (this.hasCover ? 1 : 0.6);
    animator.reloadProgress = this.combatant.reloadProgress;
    animator.sprinting = this.gait === 'sprint' && this.weaponUpBlend < 0.4;
    animator.aimPoint.copy(this.combatant.aimPoint);

    this.animAccum += dt;
    const rate =
      this.quality === 0 ? LOD.nearRate : this.quality === 1 ? LOD.midRate : LOD.farRate;
    if (this.animAccum < rate) return;
    const step = this.animAccum;
    this.animAccum = 0;
    animator.update(step, this.feet, this.quality, this.quality === 2 ? null : this.probe);

    if (animator.footstep && bb.now - this.lastFootstepAt > 0.12) {
      this.lastFootstepAt = bb.now;
      const surface = this.controller?.groundSurface ?? 'concrete';
      bb.play(
        `${SFX.footstep}_${surface}`,
        this.feet,
        animator.footstepLoud * (this.stance === 'crouch' ? 0.45 : 1),
        this.rng.range(0.92, 1.08),
      );
    }
  }

  /**
   * Corpses. A ragdoll runs until it settles, then lingers, then sinks away.
   *
   * The sink only starts after the ragdoll is destroyed: while it exists it is
   * writing world-space bone transforms every frame and moving the group they
   * hang off achieves nothing.
   */
  private updateCorpse(dt: number, bb: Blackboard): void {
    const model = this.model;
    if (!this.ragdoll && bb.now < this.ragdollDeadline && this.tryRagdoll(bb)) return;
    if (this.ragdoll) {
      if (bb.now < this.corpseUntil) return;
      this.ragdoll.destroy();
      this.ragdoll = null;
    } else if (this.deathTiltGoal !== 0) {
      // Procedural collapse: fold at the waist and topple about the feet.
      this.deathTilt = damp(this.deathTilt, this.deathTiltGoal, 3.4, dt);
      this.animator.crouch = 1;
      this.animator.weaponUp = 0;
      this.animator.suppression = 0;
      this.animator.velocity.set(0, 0, 0);
      this.animator.reloadProgress = -1;
      this.animator.update(dt, this.feet, 2, null);
      model.root.rotation.x = this.deathTilt;
      model.root.position.y = this.feet.y + Math.abs(Math.sin(this.deathTilt)) * 0.42;
      if (bb.now < this.corpseUntil) return;
    }

    this.sink += dt;
    model.root.position.y -= dt * 0.9;
    if (this.sink > 1.6) this.recyclable = true;
  }

  // =========================================================================
  // Intent helpers, called by the behaviour states
  // =========================================================================

  /**
   * Walks to `goal`. Safe to call every tick: the request is rate-limited and
   * only reissued when the destination has actually moved, the path ran out, or
   * the agent is wedged.
   */
  moveTo(bb: Blackboard, goal: THREE.Vector3, gait: MoveGait, priority = 1): void {
    this.gait = gait;
    const locomotion = this.locomotion;
    const moved = this.pathGoal.distanceToSquared(goal) > PATH.repathDistance * PATH.repathDistance;
    const idle = !locomotion.hasPath && !this.near(goal, MOVE.waypointRadius * 2);
    if (!this.pathPending && (moved || idle || locomotion.blocked)) {
      if (bb.now - this.lastPathAt >= PATH.repathCooldown) {
        this.lastPathAt = bb.now;
        this.pathGoal.copy(goal);
        locomotion.blocked = false;
        if (!bb.planner.request(this, this.feet, goal, priority, bb.now)) this.pathFailures++;
        else this.pathPending = true;
      }
    }
  }

  /** A two-point path straight to `goal`; for peeking and other short steps. */
  moveDirect(goal: THREE.Vector3): void {
    this.directPath[0] = this.feet.x;
    this.directPath[1] = this.feet.y;
    this.directPath[2] = this.feet.z;
    this.directPath[3] = goal.x;
    this.directPath[4] = goal.y;
    this.directPath[5] = goal.z;
    this.pathGoal.copy(goal);
    this.locomotion.setPath(this.directPath, 2, false);
  }

  /**
   * A short deliberate step to somewhere nearby: peeking out, ducking back,
   * sidestepping. Skips the planner and will not re-issue a path it is already
   * following, so it is safe to call every tick.
   */
  stepTo(point: THREE.Vector3, gait: MoveGait = 'combat'): void {
    this.gait = gait;
    if (this.near(point, 0.22)) {
      if (this.locomotion.hasPath) this.stopMoving();
      return;
    }
    if (this.locomotion.hasPath && this.pathGoal.distanceToSquared(point) < 0.04) return;
    this.moveDirect(point);
  }

  stopMoving(): void {
    this.locomotion.clearPath();
    this.pathGoal.copy(this.feet);
  }

  get moving(): boolean {
    return this.locomotion.hasPath;
  }

  get arrived(): boolean {
    return this.locomotion.arrived;
  }

  get blocked(): boolean {
    return this.locomotion.blocked;
  }

  get pathStuck(): boolean {
    return this.pathFailures >= 3;
  }

  get speed(): number {
    return Math.hypot(this.locomotion.velocity.x, this.locomotion.velocity.z);
  }

  near(point: THREE.Vector3, radius: number): boolean {
    const dx = point.x - this.feet.x;
    const dz = point.z - this.feet.z;
    return dx * dx + dz * dz <= radius * radius;
  }

  lookAt(point: THREE.Vector3): void {
    this.faceMode = 'point';
    this.facePoint.copy(point);
  }

  faceTravel(): void {
    this.faceMode = 'path';
  }

  faceIdle(): void {
    this.faceMode = 'idle';
  }

  say(bb: Blackboard, id: string, volume = 1): void {
    if (bb.now - this.lastVoiceAt < 1.1) return;
    this.lastVoiceAt = bb.now;
    SCRATCH.set(this.feet.x, this.feet.y + this.eyeHeight * 0.94, this.feet.z);
    bb.play(id, SCRATCH, volume, this.voicePitch);
  }

  /** Called by the director for near misses, explosions and airstrikes. */
  applySuppression(amount: number, position: THREE.Vector3): void {
    if (!this.isAlive) return;
    this.suppression = Math.min(FIGHT.maxSuppression, this.suppression + amount);
    this.perception.noteThreatFrom(position, this.feet);
    if (this.perception.awareness < SIGHT.alertThreshold) {
      this.perception.awareness = SIGHT.alertThreshold * 1.05;
    }
  }

  get pinned(): boolean {
    return this.suppression >= 1;
  }

  // --- Cover ---------------------------------------------------------------

  claimCover(bb: Blackboard): boolean {
    if (this.cover.index < 0) return false;
    if (!bb.cover.claim(this.cover.index, this.id, bb.now)) return false;
    this.hasCover = true;
    return true;
  }

  /**
   * Re-asserts the claim and reports whether we still hold the slot.
   *
   * Claims lapse on a timeout, so an agent that stops asserting one — pinned,
   * mid-reload, halfway along a long path — can find its slot taken by a
   * squadmate. `claim` renews it when the slot is free or already ours and fails
   * when someone else owns it, at which point the local state has to go with it:
   * a cached `hasCover` that outlives the reservation is exactly how two men end
   * up peeking from the same doorway.
   */
  refreshCover(bb: Blackboard): boolean {
    if (!this.hasCover) return false;
    if (this.cover.index >= 0 && bb.cover.claim(this.cover.index, this.id, bb.now)) return true;
    this.releaseCover(bb);
    return false;
  }

  releaseCover(bb: Blackboard): void {
    if (this.cover.index >= 0) bb.cover.release(this.cover.index, this.id);
    bb.cover.releaseAll(this.id);
    this.cover.index = -1;
    this.hasCover = false;
    this.peeking = false;
  }

  /** True when standing on the claimed slot. */
  get inCover(): boolean {
    return this.hasCover && this.near(this.cover.position, 0.75);
  }

  // --- Ground --------------------------------------------------------------

  /**
   * Surface height for foot planting.
   *
   * Near agents get a real downward ray, because a foot on a kerb an inch below
   * the pavement is exactly the sort of thing the eye picks up at three metres.
   * Everyone else gets the nav raster, which is free and within a few centimetres.
   */
  private groundAt(x: number, z: number, y: number): number | null {
    if (this.quality === 0) {
      const traced = this.bb.traceGround(x, y + 0.6, z, 1.6);
      if (traced !== null) return traced;
    }
    return this.bb.surfaceAt(x, z, y);
  }

  /** Seconds since this body hit the floor. Used by the corpse budget. */
  deathAge(now: number): number {
    return this.dying ? now - this.diedAt : -1;
  }

  get lodDistance(): number {
    return this.cameraDistance;
  }

  get animQuality(): AnimQuality {
    return this.quality;
  }

  get stateName(): string {
    return this.behavior.state;
  }

  get triangles(): number {
    return this.model ? this.model.liveTriangles : 0;
  }

  dispose(bb: Blackboard): void {
    this.despawn(bb);
  }
}
