import * as THREE from 'three';
import type { IPhysics } from '../core/Interfaces';
import { Groups } from '../core/GameContext';
import { angleDelta, clamp, damp, dampAngle, lerp, saturate, smoothstep } from '../core/MathUtils';
import { B, BONES, BONE_COUNT, bindDir, boneLength } from './SoldierSkeleton';
import { GRIP_L, GRIP_R, MUZZLE_LOCAL, type SoldierInstance } from './SoldierMesh';

/**
 * Procedural animation for the soldier.
 *
 * There are no clips, so every pose is solved from first principles each frame.
 * Three decisions carry most of the quality:
 *
 * **Feet are planted, not swung.** A footprint is chosen in world space when a
 * foot enters its swing, and during the stance half of the cycle the ankle is
 * held at that exact world point while the body moves past it. Sliding is
 * therefore impossible by construction rather than tuned away, and the stride
 * length is whatever the body's actual speed makes it.
 *
 * **The weapon is placed first and the arms follow it.** The rifle's world
 * transform comes straight from the aim direction; both hands are then pulled
 * onto grip points on the gun with two-bone IK. Animating the arms and hoping
 * the gun ends up somewhere sensible is what makes procedural characters look
 * like they are miming.
 *
 * **The spine distributes the aim.** Residual yaw between where the body faces
 * and where the soldier is looking is spread across four joints with the head
 * leading, so an enemy visibly turns to look at what he is engaging instead of
 * snapping his whole body round.
 *
 * Forward kinematics is done here into scratch arrays rather than through
 * `updateMatrixWorld`, because the IK needs world joint positions mid-solve and
 * the renderer is going to walk the hierarchy for skinning anyway.
 */

export const STANCE_STAND = 0;
export const STANCE_CROUCH = 1;
export const STANCE_PRONE = 2;

/** Everything the agent tells the rig each frame. All fields are read-only here. */
export interface RigDrive {
  /** Feet position in world space. */
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  /** Desired body facing, radians, 0 = +Z. */
  heading: number;
  /** 0 stand, 1 crouch, 2 prone; fractional values blend. */
  stance: number;
  /** World point the soldier is looking at and shooting toward. */
  readonly aim: THREE.Vector3;
  /** 0 = weapon carried at the low ready, 1 = shouldered. */
  aimWeight: number;
  /** 0 = eyes front, 1 = head fully tracking `aim`. */
  lookWeight: number;
  /** -1 leans left out of cover, +1 right. */
  lean: number;
  /** 0..1 progress through a reload; negative when not reloading. */
  reload: number;
  /** 0..1 progress through a grenade throw; negative when not throwing. */
  grenade: number;
  /** 0..1 progress through a vault; negative when not vaulting. */
  vault: number;
  /** Set to 1 on the frame a round leaves the barrel; the rig decays it. */
  fireKick: number;
  /** Set on a hit; the rig decays it. */
  flinch: number;
  /** Bone index that was struck, so the flinch reads on the right limb. */
  flinchBone: number;
  /** True when the agent is dead and the rig should stop driving the pose. */
  dead: boolean;
  /** 0 near, 1 mid, 2 far. Controls IK cost and update rate. */
  lod: number;
}

export function makeDrive(): RigDrive {
  return {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    heading: 0,
    stance: STANCE_STAND,
    aim: new THREE.Vector3(),
    aimWeight: 0,
    lookWeight: 1,
    lean: 0,
    reload: -1,
    grenade: -1,
    vault: -1,
    fireKick: 0,
    flinch: 0,
    flinchBone: -1,
    dead: false,
    lod: 0,
  };
}

/* ------------------------------- scratch --------------------------------- */

const wp: THREE.Vector3[] = [];
const wq: THREE.Quaternion[] = [];
for (let i = 0; i < BONE_COUNT; i++) {
  wp.push(new THREE.Vector3());
  wq.push(new THREE.Quaternion());
}

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _target = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qi = new THREE.Quaternion();
const _qt = new THREE.Quaternion();
const _e = new THREE.Euler();
const _hitOrigin = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const GROUND_MASK = Groups.WORLD | Groups.PROP;

/** Cached bind directions; identity rest rotations make these world vectors. */
const DIR_THIGH_L = bindDir(B.thighL, B.calfL, new THREE.Vector3());
const DIR_CALF_L = bindDir(B.calfL, B.footL, new THREE.Vector3());
const DIR_FOOT_L = bindDir(B.footL, B.toeL, new THREE.Vector3());
const DIR_THIGH_R = bindDir(B.thighR, B.calfR, new THREE.Vector3());
const DIR_CALF_R = bindDir(B.calfR, B.footR, new THREE.Vector3());
const DIR_FOOT_R = bindDir(B.footR, B.toeR, new THREE.Vector3());
const DIR_ARM_L = bindDir(B.armL, B.foreL, new THREE.Vector3());
const DIR_FORE_L = bindDir(B.foreL, B.handL, new THREE.Vector3());
const DIR_ARM_R = bindDir(B.armR, B.foreR, new THREE.Vector3());
const DIR_FORE_R = bindDir(B.foreR, B.handR, new THREE.Vector3());

const LEN_THIGH = boneLength(B.thighL, B.calfL);
const LEN_CALF = boneLength(B.calfL, B.footL);
const LEN_UPPER_ARM = boneLength(B.armL, B.foreL);
const LEN_FOREARM = boneLength(B.foreL, B.handL);

/** Bind height of the pelvis, which every stance offset is measured against. */
const PELVIS_BIND_Y = BONES[B.pelvis].y;

/**
 * How far the pelvis sits below its bind height when standing.
 *
 * The bind pose has the hip exactly one leg-length above the ankle, so a
 * soldier standing at bind height has locked knees — a mannequin tell — and the
 * two-bone solver is saturated before it starts, with nowhere to go but down.
 * Two and a half centimetres buys a soft knee and some headroom in the IK.
 */
const STAND_FLEX = 0.025;

/** Furthest the hips will sink to keep a low foot planted. */
const MAX_PELVIS_DIP = 0.22;
/** Height difference a single footfall is allowed to span. */
const MAX_STEP_UP = 0.45;
const MAX_STEP_DOWN = 0.42;

interface Foot {
  /** World point the foot is standing on, held fixed through stance. */
  plant: THREE.Vector3;
  next: THREE.Vector3;
  normal: THREE.Vector3;
  /** Facing the print was laid down with. */
  heading: number;
  /** True while the foot is on the ground. */
  down: boolean;
}

function makeFoot(): Foot {
  return {
    plant: new THREE.Vector3(),
    next: new THREE.Vector3(),
    normal: new THREE.Vector3(0, 1, 0),
    heading: 0,
    down: true,
  };
}

/* --------------------------------- rig ----------------------------------- */

export class SoldierRig {
  readonly bones: THREE.Bone[];
  private root: THREE.Group;
  private h: number;

  /** Live world transforms, published for hitboxes, muzzles and eyes. */
  readonly muzzle = new THREE.Vector3();
  readonly muzzleDir = new THREE.Vector3(0, 0, 1);
  readonly eye = new THREE.Vector3();
  readonly chest = new THREE.Vector3();

  /** Locomotion phase in radians; the left foot leads. */
  private phase = 0;
  private feet: [Foot, Foot] = [makeFoot(), makeFoot()];
  private bodyYaw = 0;
  private spineYaw = 0;
  private spinePitch = 0;
  private headYaw = 0;
  private headPitch = 0;
  private leanSmooth = 0;
  private stanceSmooth = 0;
  private aimSmooth = 0;
  private pelvisDrop = 0;
  private breath = 0;
  private strideScale = 1;
  private lastFootstep = -1;

  /** Set by the rig whenever a foot lands, for the audio and dust hooks. */
  footstepPending = 0;

  constructor(
    instance: SoldierInstance,
    private physics: IPhysics | null,
  ) {
    this.bones = instance.bones;
    this.root = instance.root;
    this.h = instance.variant.spec.height;
  }

  /** Places the rig without any interpolation, for a spawn or a teleport. */
  reset(position: THREE.Vector3, heading: number): void {
    this.root.position.copy(position);
    this.root.rotation.set(0, heading, 0);
    this.bodyYaw = heading;
    this.spineYaw = 0;
    this.spinePitch = 0;
    this.headYaw = 0;
    this.headPitch = 0;
    this.phase = 0;
    this.leanSmooth = 0;
    this.stanceSmooth = 0;
    this.aimSmooth = 0;
    this.pelvisDrop = 0;
    const cos = Math.cos(heading);
    const sin = Math.sin(heading);
    for (let i = 0; i < 2; i++) {
      const lateral = (i === 0 ? 1 : -1) * 0.1 * this.h;
      const foot = this.feet[i];
      foot.plant.set(position.x + cos * lateral, position.y, position.z - sin * lateral);
      foot.next.copy(foot.plant);
      foot.normal.set(0, 1, 0);
      foot.heading = heading;
      foot.down = true;
    }
    for (const bone of this.bones) bone.quaternion.identity();
  }

  /* -------------------------------- update ------------------------------- */

  update(dt: number, d: RigDrive): void {
    if (dt <= 0) return;
    this.root.position.copy(d.position);

    const speed = Math.hypot(d.velocity.x, d.velocity.z);
    const stanceTarget = d.stance;
    this.stanceSmooth = damp(this.stanceSmooth, stanceTarget, 7, dt);
    this.aimSmooth = damp(this.aimSmooth, d.aimWeight, 9, dt);
    this.leanSmooth = damp(this.leanSmooth, clamp(d.lean, -1, 1), 8, dt);
    this.breath += dt * (1.3 + speed * 0.35);

    // Body yaw chases the requested heading; the spine covers the rest so the
    // soldier can shoot to the side of where he is walking.
    const turnRate = 3.2 + Math.min(speed, 5) * 0.85;
    this.bodyYaw = dampAngle(this.bodyYaw, d.heading, turnRate, dt);
    this.root.rotation.set(0, this.bodyYaw, 0);

    this.solveAim(dt, d);
    this.pose(dt, d, speed);
    this.forward();
    this.solveLegs(dt, d, speed);
    this.solveWeapon(dt, d);
    this.solveArms(d);
    this.publish();
  }

  /* --------------------------------- aim --------------------------------- */

  private solveAim(dt: number, d: RigDrive): void {
    _dir.copy(d.aim).sub(this.eye.lengthSq() > 0 ? this.eye : d.position);
    if (_dir.lengthSq() < 1e-6) _dir.set(Math.sin(this.bodyYaw), 0, Math.cos(this.bodyYaw));
    _dir.normalize();
    const wantYaw = Math.atan2(_dir.x, _dir.z);
    const wantPitch = Math.asin(clamp(_dir.y, -1, 1));

    const residual = clamp(angleDelta(this.bodyYaw, wantYaw), -1.35, 1.35);
    this.spineYaw = dampAngle(this.spineYaw, residual, 11, dt);
    this.spinePitch = dampAngle(this.spinePitch, clamp(wantPitch, -0.9, 0.75), 10, dt);
    // The head leads: it reaches the target well before the shoulders do, which
    // is the single clearest read that the AI has noticed something.
    const lookScale = saturate(d.lookWeight);
    this.headYaw = dampAngle(this.headYaw, residual * lookScale, 17, dt);
    this.headPitch = dampAngle(this.headPitch, clamp(wantPitch, -0.75, 0.62) * lookScale, 15, dt);
  }

  /* -------------------------------- pose --------------------------------- */

  /** Pelvis, spine, neck and head. Everything that does not need world data. */
  private pose(dt: number, d: RigDrive, speed: number): void {
    const bones = this.bones;
    const crouch = saturate(this.stanceSmooth);
    const prone = saturate(this.stanceSmooth - 1);

    // Stride phase advances with distance covered, so the cycle cannot drift
    // out of step with the ground however the speed changes.
    this.strideScale = lerp(1, 0.62, crouch) * lerp(1, 0.4, prone);
    const stride = this.strideLength(speed);
    if (speed > 0.08) this.phase += ((speed * dt) / stride) * Math.PI * 2;
    else this.phase = damp(this.phase % (Math.PI * 2), Math.PI * 0.5, 4, dt);
    if (this.phase > Math.PI * 4) this.phase -= Math.PI * 4;
    const gait = saturate(speed / 2.4);

    const vaulting = d.vault >= 0;
    const vaultLean = vaulting ? Math.sin(saturate(d.vault) * Math.PI) : 0;

    // Pelvis: stance height, stride bob, lateral sway and the drop the leg IK
    // asks for when the ground is further away than the legs can reach.
    const standY = PELVIS_BIND_Y - STAND_FLEX;
    const crouchY = PELVIS_BIND_Y - 0.32;
    const proneY = 0.26;
    let py = lerp(lerp(standY, crouchY, crouch), proneY, prone);
    py += Math.cos(this.phase * 2) * 0.022 * gait;
    py -= this.pelvisDrop / this.h;
    py -= vaultLean * 0.12;
    const sway = Math.sin(this.phase) * 0.02 * gait;
    bones[B.pelvis].position.set(sway, py, Math.sin(this.phase * 2) * 0.008 * gait);

    // Pelvis orientation: hips counter-rotate against the shoulders, roll into
    // the stride, and pitch hard forward when prone.
    const pelvisPitch = lerp(0, -1.25, prone) + vaultLean * 0.5 + crouch * 0.12;
    const pelvisRoll = Math.sin(this.phase) * 0.05 * gait - this.leanSmooth * 0.1;
    const pelvisYaw = -this.spineYaw * 0.12 + Math.sin(this.phase) * 0.09 * gait;
    _e.set(pelvisPitch, pelvisYaw, pelvisRoll, 'YXZ');
    bones[B.pelvis].quaternion.setFromEuler(_e);

    // Flinch and recoil, both expressed as a shove through the spine.
    const kick = saturate(d.fireKick);
    const flinch = saturate(d.flinch);
    const flinchSide = this.flinchLean(d.flinchBone);
    const breathe = Math.sin(this.breath) * 0.012 * (1 - saturate(this.aimSmooth) * 0.6);

    // Spine chain. The yaw is distributed so the twist reads across the whole
    // torso; loading it all onto the chest snaps the shoulders round.
    const proneUp = prone * 1.05;
    const spineShare: ReadonlyArray<readonly [number, number, number]> = [
      [B.spine1, 0.18, 0.14],
      [B.spine2, 0.28, 0.24],
      [B.chest, 0.34, 0.34],
    ];
    let usedYaw = 0;
    let usedPitch = 0;
    for (const [bone, yawShare, pitchShare] of spineShare) {
      const yaw = this.spineYaw * yawShare;
      const pitch =
        -this.spinePitch * pitchShare * this.aimSmooth +
        proneUp * pitchShare * 0.55 +
        breathe * pitchShare +
        crouch * 0.09 * pitchShare * 3 +
        vaultLean * 0.28 * pitchShare * 2 -
        kick * 0.07 * pitchShare * 2 -
        flinch * 0.22 * pitchShare * 2;
      const roll =
        this.leanSmooth * 0.16 +
        -Math.sin(this.phase) * 0.045 * gait * (bone === B.chest ? 1.4 : 0.7) +
        flinch * flinchSide * 0.2;
      usedYaw += yaw;
      usedPitch += pitch;
      _e.set(pitch, yaw, roll, 'YXZ');
      bones[bone].quaternion.setFromEuler(_e);
    }

    // Clavicles lift with the shoulders and shrug on a flinch.
    for (const side of [1, -1]) {
      const bone = side > 0 ? B.clavL : B.clavR;
      const shrug = flinch * (Math.sign(flinchSide) === side ? 0.28 : 0.1);
      _e.set(-shrug * 0.5, side * this.spineYaw * 0.06, side * (0.05 + shrug), 'YXZ');
      bones[bone].quaternion.setFromEuler(_e);
    }

    // Neck and head: whatever the spine did not take, plus the lead.
    const neckYaw = (this.headYaw - usedYaw) * 0.45;
    const neckPitch = (-this.headPitch - usedPitch) * 0.4 + proneUp * 0.5;
    _e.set(neckPitch, neckYaw, 0, 'YXZ');
    bones[B.neck].quaternion.setFromEuler(_e);
    _e.set(
      -this.headPitch - usedPitch - neckPitch + proneUp * 0.5 - flinch * 0.25,
      this.headYaw - usedYaw - neckYaw,
      -this.leanSmooth * 0.12 + Math.sin(this.phase) * 0.02 * gait,
      'YXZ',
    );
    bones[B.head].quaternion.setFromEuler(_e);
  }

  /** Which way a hit on this bone should throw the torso. */
  private flinchLean(bone: number): number {
    if (bone === B.armL || bone === B.foreL || bone === B.clavL) return 1;
    if (bone === B.armR || bone === B.foreR || bone === B.clavR) return -1;
    if (bone === B.head) return 0.4;
    return 0;
  }

  /* ------------------------- forward kinematics -------------------------- */

  /** World transform of every bone, from the root down. Parents come first. */
  private forward(): void {
    const rootQ = _qt.setFromAxisAngle(UP, this.bodyYaw);
    const h = this.h;
    const bones = this.bones;
    wq[0].copy(rootQ).multiply(bones[0].quaternion);
    wp[0]
      .copy(bones[0].position)
      .multiplyScalar(h)
      .applyQuaternion(rootQ)
      .add(this.root.position);
    for (let i = 1; i < BONE_COUNT; i++) {
      const p = BONES[i].parent;
      wq[i].copy(wq[p]).multiply(bones[i].quaternion);
      wp[i].copy(bones[i].position).multiplyScalar(h).applyQuaternion(wq[p]).add(wp[p]);
    }
  }

  /** Recomputes one chain after its locals changed, without redoing the rest. */
  private forwardFrom(indices: readonly number[]): void {
    const h = this.h;
    const bones = this.bones;
    for (const i of indices) {
      const p = BONES[i].parent;
      wq[i].copy(wq[p]).multiply(bones[i].quaternion);
      wp[i].copy(bones[i].position).multiplyScalar(h).applyQuaternion(wq[p]).add(wp[p]);
    }
  }

  /* --------------------------------- legs -------------------------------- */

  private solveLegs(dt: number, d: RigDrive, speed: number): void {
    void dt;
    const prone = saturate(this.stanceSmooth - 1);
    const cycle = ((this.phase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const cos = Math.cos(this.bodyYaw);
    const sin = Math.sin(this.bodyYaw);
    let drop = 0;

    for (let i = 0; i < 2; i++) {
      const left = i === 0;
      const foot = this.feet[i];
      const hipBone = left ? B.thighL : B.thighR;
      const t = (((left ? cycle : cycle + Math.PI) % (Math.PI * 2)) / (Math.PI * 2));
      const lateral = (left ? 1 : -1) * 0.1 * this.h;

      // Stance for the first half of the cycle, swing for the second. The plant
      // is committed at the moment of touchdown so the next stance uses it.
      const swinging = t >= 0.5 && speed > 0.12;
      if (swinging && foot.down) {
        foot.down = false;
        this.chooseFootprint(foot, lateral, cos, sin, d, speed);
      } else if (!swinging && !foot.down) {
        foot.down = true;
        foot.plant.copy(foot.next);
        this.footstepPending = left ? 1 : 2;
        this.lastFootstep = t;
      } else if (!swinging && speed <= 0.12) {
        // Standing: only re-plant when the body has genuinely moved away.
        _v.set(d.position.x + cos * lateral, 0, d.position.z - sin * lateral);
        if (
          Math.hypot(_v.x - foot.plant.x, _v.z - foot.plant.z) > 0.34 ||
          Math.abs(angleDelta(foot.heading, this.bodyYaw)) > 0.7
        ) {
          this.chooseFootprint(foot, lateral, cos, sin, d, 0);
          foot.plant.copy(foot.next);
        }
      }

      _target.copy(foot.plant);
      if (swinging) {
        const u = saturate((t - 0.5) * 2);
        const ease = smoothstep(0, 1, u);
        _target.copy(foot.plant).lerp(foot.next, ease);
        // Lift arc, higher at speed and flattened when crouched or prone.
        const lift = (0.055 + Math.min(speed, 5.5) * 0.026) * (1 - prone * 0.7);
        _target.y += Math.sin(u * Math.PI) * lift;
      }
      // The ankle sits a little above the sole contact point.
      _target.y += 0.085 * this.h;
      if (prone > 0.01) {
        // Legs trail straight back on the ground rather than standing.
        _v2.set(d.position.x - sin * 0.62 * this.h + cos * lateral * 1.6, 0, d.position.z - cos * 0.62 * this.h - sin * lateral * 1.6);
        _v2.y = d.position.y + 0.07 * this.h;
        _target.lerp(_v2, prone);
      }

      const hip = wp[hipBone];
      const reach = (LEN_THIGH + LEN_CALF) * this.h * 0.985;
      const need = hip.distanceTo(_target);
      // Dipping the hips to reach a low foot is how a character walks down a
      // ramp without floating. Past a crouch's worth of dip it stops being that
      // and becomes a man sinking into the pavement, so the leg is allowed to
      // come up short instead.
      if (need > reach) drop = Math.min(MAX_PELVIS_DIP, Math.max(drop, need - reach));

      // Knee points along the direction of travel, kicked outboard a touch so
      // the legs never cross and the knee cannot invert.
      _pole.set(sin, 0.42, cos).normalize();
      _pole.x += (left ? 0.28 : -0.28) * cos;
      _pole.z -= (left ? 0.28 : -0.28) * sin;
      _pole.normalize();

      solveTwoBone(hip, _target, LEN_THIGH * this.h, LEN_CALF * this.h, _pole, _mid);

      const thigh = this.bones[hipBone];
      const calfBone = left ? B.calfL : B.calfR;
      const footBone = left ? B.footL : B.footR;
      aimBone(thigh, wq[BONES[hipBone].parent], left ? DIR_THIGH_L : DIR_THIGH_R, _dir.copy(_mid).sub(hip).normalize());
      this.forwardFrom(left ? CHAIN_LEG_L0 : CHAIN_LEG_R0);
      aimBone(
        this.bones[calfBone],
        wq[hipBone],
        left ? DIR_CALF_L : DIR_CALF_R,
        _dir.copy(_target).sub(_mid).normalize(),
      );
      this.forwardFrom(left ? CHAIN_LEG_L1 : CHAIN_LEG_R1);

      // Foot: heel strike into toe-off through the stance, flat while airborne.
      const roll = swinging ? -0.35 + saturate((t - 0.5) * 2) * 0.5 : lerp(-0.28, 0.55, saturate(t * 2));
      _dir
        .set(sin, 0, cos)
        .applyAxisAngle(_axis.set(cos, 0, -sin), roll * (speed > 0.2 ? 1 : 0.15))
        .normalize();
      // Sole follows the ground it is standing on, so a foot on a ramp tilts.
      if (foot.down && foot.normal.y < 0.999) {
        _v3.copy(_dir).addScaledVector(foot.normal, -_dir.dot(foot.normal)).normalize();
        if (_v3.lengthSq() > 0.5) _dir.lerp(_v3, 0.7).normalize();
      }
      aimBone(this.bones[footBone], wq[calfBone], left ? DIR_FOOT_L : DIR_FOOT_R, _dir);
      this.forwardFrom(left ? CHAIN_LEG_L2 : CHAIN_LEG_R2);
    }

    this.pelvisDrop = damp(this.pelvisDrop, drop, 12, Math.max(1e-4, dt));
  }

  /**
   * Metres the body covers in one full gait cycle, which is to say two steps.
   *
   * Stride grows with speed because a man does not sprint by taking walking
   * steps faster; holding it constant gives a walk with a half-second cadence
   * and a sprint that looks like a cartoon. The phase integrator and the
   * footprint spacing both read this, and they have to agree exactly — the
   * whole planted-foot scheme rests on the print being where the body will be.
   */
  private strideLength(speed: number): number {
    return (0.95 + Math.min(speed, 6) * 0.3) * this.h * this.strideScale;
  }

  /**
   * Picks where the next footprint goes and asks the world how high it is.
   * One ray per step per foot, which at a run is about three rays a second.
   */
  private chooseFootprint(
    foot: Foot,
    lateral: number,
    cos: number,
    sin: number,
    d: RigDrive,
    speed: number,
  ): void {
    // This runs at the *start* of the swing, half a cycle before touchdown, so
    // the print has to lead the body by the ground it will cover in that time
    // (half a stride) plus the quarter-stride the foot spends out in front of
    // the hips during stance. A standing man plants under his hips instead:
    // leading a stationary body is what put the first draft of this soldier in
    // a deck chair, legs out front and pelvis dropped to reach them.
    const ahead = speed > 0.12 ? this.strideLength(speed) * 0.75 : 0;
    const vx = speed > 0.12 ? d.velocity.x / speed : sin;
    const vz = speed > 0.12 ? d.velocity.z / speed : cos;
    foot.next.set(
      d.position.x + cos * lateral + vx * ahead,
      d.position.y,
      d.position.z - sin * lateral + vz * ahead,
    );
    foot.heading = this.bodyYaw;
    foot.normal.set(0, 1, 0);
    if (!this.physics || d.lod > 1) return;
    _hitOrigin.set(foot.next.x, d.position.y + 0.75, foot.next.z);
    const hit = this.physics.raycast(_hitOrigin, DOWN, 1.7, GROUND_MASK);
    if (hit) {
      // A print at the top of a stairwell finds the floor below through the
      // gap; taking it at face value folds the man in half. He can only step
      // as far up or down as a man can, and the body's own ground is the
      // authority on where he actually is.
      foot.next.y = clamp(hit.point.y, d.position.y - MAX_STEP_DOWN, d.position.y + MAX_STEP_UP);
      foot.normal.copy(hit.normal);
    }
  }

  /* -------------------------------- weapon -------------------------------- */

  private solveWeapon(dt: number, d: RigDrive): void {
    void dt;
    const chest = wp[B.chest];
    const aimed = saturate(this.aimSmooth);
    const crouch = saturate(this.stanceSmooth);
    const prone = saturate(this.stanceSmooth - 1);

    _dir.copy(d.aim).sub(this.eye.lengthSq() > 0 ? this.eye : chest);
    if (_dir.lengthSq() < 1e-6) _dir.set(Math.sin(this.bodyYaw), 0, Math.cos(this.bodyYaw));
    _dir.normalize();

    // Recoil throws the muzzle up and back, and a reload or a throw takes the
    // gun off the shoulder entirely.
    const kick = saturate(d.fireKick);
    const reload = d.reload >= 0 ? saturate(d.reload) : -1;
    const grenade = d.grenade >= 0 ? saturate(d.grenade) : -1;
    const busy = Math.max(reload >= 0 ? 1 : 0, grenade >= 0 ? 1 : 0);
    const shoulder = aimed * (1 - busy * 0.85);

    // Frame the offsets in the body's own axes rather than the chest bone's, so
    // breathing and stride do not wobble the gun off the target.
    const fwdX = Math.sin(this.bodyYaw);
    const fwdZ = Math.cos(this.bodyYaw);
    const rightX = -fwdZ;
    const rightZ = fwdX;

    const readyRight = -0.1;
    const readyUp = -0.055;
    const readyFwd = 0.24;
    // On the firing shoulder, not on the breastbone.
    //
    // This was two centimetres off centre, which put the pistol grip on the
    // body's midline and the firing hand directly under the chin. The arm then
    // has to fold to a fifth of its reach across the front of the chest, and
    // the elbow — placed on the far side of the shoulder-to-hand axis by the
    // pole, as it must be — ends up *through* the torso and invisible. A
    // portrait at three metres showed a soldier with one arm.
    //
    // And far enough forward that the buttplate is in the shoulder pocket. At
    // 0.12 it was 8 cm *behind* the chest bone — the stock sunk through the
    // ribcage — which left the pistol grip 13.6 cm from the shoulder joint. An
    // arm 59 cm long folded into 13.6 cm closes the elbow to 26°, past the 35°
    // a real one stops at, and the two segments come out stacked on each other
    // as one rounded mass with the elbow inboard of the shoulder and so behind
    // the chest in silhouette. At 0.235 the buttplate sits just proud of the
    // sternum, the grip is 24 cm out, the elbow swings 3 cm outboard of the
    // shoulder where it reads against the sky, and the joint closes to 48°.
    //
    // The barrel is not affected: its direction comes from the eye-to-target
    // vector below, and the bullet from the muzzle's own world position, so
    // moving the gun onto the shoulder changes the pose and nothing else.
    const aimRight = 0.095;
    const aimUp = 0.215;
    const aimFwd = 0.235;
    const ox = lerp(readyRight, aimRight, shoulder);
    const oy = lerp(readyUp, aimUp, shoulder) - crouch * 0.03 - prone * 0.18;
    const oz = lerp(readyFwd, aimFwd, shoulder);

    _v.copy(chest);
    _v.x += rightX * ox + fwdX * oz;
    _v.y += oy;
    _v.z += rightZ * ox + fwdZ * oz;
    // Recoil pushes the whole gun back into the shoulder.
    _v.x -= fwdX * kick * 0.05;
    _v.z -= fwdZ * kick * 0.05;

    // Direction: on target when shouldered, angled down at the low ready.
    _v2.copy(_dir);
    if (shoulder < 0.999) {
      const droop = (1 - shoulder) * 0.55;
      _v2.y -= droop;
      _v2.x += rightX * (1 - shoulder) * 0.16;
      _v2.z += rightZ * (1 - shoulder) * 0.16;
      _v2.normalize();
    }
    _v2.y += kick * 0.09;
    if (reload >= 0) {
      // Rolled inboard so the magazine well faces the support hand.
      const s = Math.sin(reload * Math.PI);
      _v2.y -= s * 0.32;
      _v2.x += rightX * s * 0.22;
      _v2.z += rightZ * s * 0.22;
    }
    if (grenade >= 0) {
      const s = Math.sin(grenade * Math.PI);
      _v2.y -= s * 0.5;
    }
    _v2.normalize();

    // Compose the weapon's world rotation: +Z down the barrel, with a small
    // cant so it does not look like it is on a tripod.
    _axis.set(0, 1, 0);
    _v3.crossVectors(_axis, _v2);
    if (_v3.lengthSq() < 1e-8) _v3.set(1, 0, 0);
    _v3.normalize();
    _axis.crossVectors(_v2, _v3).normalize();
    _m.makeBasis(_v3, _axis, _v2);
    _q.setFromRotationMatrix(_m);
    _qi.setFromAxisAngle(_v2, -0.09 - kick * 0.05 + this.leanSmooth * 0.12);
    _q.premultiply(_qi);

    // Convert the world transform into the weapon bone's local frame.
    const parent = BONES[B.weapon].parent;
    _qt.copy(wq[parent]).invert();
    this.bones[B.weapon].quaternion.copy(_qt).multiply(_q);
    _v.sub(wp[parent]).applyQuaternion(_qt).multiplyScalar(1 / this.h);
    this.bones[B.weapon].position.copy(_v);
    this.forwardFrom(CHAIN_WEAPON);
  }

  /* --------------------------------- arms --------------------------------- */

  private solveArms(d: RigDrive): void {
    const reload = d.reload >= 0 ? saturate(d.reload) : -1;
    const grenade = d.grenade >= 0 ? saturate(d.grenade) : -1;
    const vault = d.vault >= 0 ? saturate(d.vault) : -1;

    // Right hand stays on the pistol grip except during a throw.
    _target.copy(GRIP_R).multiplyScalar(this.h).applyQuaternion(wq[B.weapon]).add(wp[B.weapon]);
    if (grenade >= 0) {
      const back = Math.sin(saturate(grenade / 0.55) * Math.PI * 0.5);
      const fwd = grenade > 0.55 ? smoothstep(0.55, 0.95, grenade) : 0;
      const fx = Math.sin(this.bodyYaw);
      const fz = Math.cos(this.bodyYaw);
      _v.copy(wp[B.chest]);
      _v.x += -fz * -0.22 + fx * (-0.34 + fwd * 1.0);
      _v.y += 0.34 - fwd * 0.12;
      _v.z += fx * -0.22 + fz * (-0.34 + fwd * 1.0);
      _target.lerp(_v, back * (1 - fwd * 0.1));
    }
    this.solveArm(false, _target);

    // Left hand: handguard by default, and a scripted path through a reload.
    _target.copy(GRIP_L).multiplyScalar(this.h).applyQuaternion(wq[B.weapon]).add(wp[B.weapon]);
    if (reload >= 0) {
      _v.copy(this.reloadHand(reload));
      _target.lerp(_v, reloadBlend(reload));
    } else if (grenade >= 0) {
      // Support hand comes off the gun and the rifle hangs on the strong side.
      _v.copy(wp[B.chest]);
      _v.y -= 0.16;
      _v.x += Math.sin(this.bodyYaw) * 0.18;
      _v.z += Math.cos(this.bodyYaw) * 0.18;
      _target.lerp(_v, Math.sin(saturate(grenade) * Math.PI));
    } else if (vault >= 0) {
      // Plant the support hand on whatever is being vaulted.
      _v.copy(d.position);
      _v.y += 1.0 * this.h;
      _v.x += Math.sin(this.bodyYaw) * 0.55;
      _v.z += Math.cos(this.bodyYaw) * 0.55;
      _target.lerp(_v, Math.sin(saturate(vault) * Math.PI));
    }
    this.solveArm(true, _target);
  }

  /** Where the support hand goes at each moment of a reload. */
  private reloadHand(t: number): THREE.Vector3 {
    const chest = wp[B.chest];
    const fx = Math.sin(this.bodyYaw);
    const fz = Math.cos(this.bodyYaw);
    const rx = -fz;
    const rz = fx;
    // magwell -> down and away with the old magazine -> pouch -> magwell again
    let up: number;
    let fwd: number;
    let side: number;
    if (t < 0.3) {
      const u = t / 0.3;
      up = lerp(-0.06, -0.13, u);
      fwd = lerp(0.24, 0.12, u);
      side = lerp(-0.06, -0.1, u);
    } else if (t < 0.58) {
      const u = (t - 0.3) / 0.28;
      up = lerp(-0.13, -0.02, u);
      fwd = lerp(0.12, 0.2, u);
      side = lerp(-0.1, 0.14, u);
    } else {
      const u = (t - 0.58) / 0.42;
      up = lerp(-0.02, -0.09, u);
      fwd = lerp(0.2, 0.16, u);
      side = lerp(0.14, -0.08, u);
    }
    return _v3.set(
      chest.x + rx * side + fx * fwd,
      chest.y + up,
      chest.z + rz * side + fz * fwd,
    );
  }

  private solveArm(left: boolean, target: THREE.Vector3): void {
    const shoulderBone = left ? B.armL : B.armR;
    const foreBone = left ? B.foreL : B.foreR;
    const handBone = left ? B.handL : B.handR;
    const shoulder = wp[shoulderBone];

    // Elbows hang down, back, and outboard. Anchoring the pole to the body
    // frame is what stops them flipping through the torso when the aim crosses
    // centre.
    //
    // "Outboard" was the wrong way round on both arms: the body's right is
    // (-sin yaw rotated, ...) = (-fz, 0, fx), and the left arm was being given
    // +that and the right arm -that, so each pole pointed across the chest
    // instead of away from it. Both elbows were driven inboard and, on a folded
    // arm — which is what a shouldered rifle gives you — inboard means inside
    // the ribcage. The legs a hundred lines up have always had this right,
    // which is why a crouch read correctly while an aim did not.
    const fx = Math.sin(this.bodyYaw);
    const fz = Math.cos(this.bodyYaw);
    const outX = left ? fz : -fz;
    const outZ = left ? -fx : fx;
    _pole.set(outX * 0.55, -1, outZ * 0.55).normalize();
    _pole.x -= fx * 0.22;
    _pole.z -= fz * 0.22;
    _pole.normalize();

    solveTwoBone(shoulder, target, LEN_UPPER_ARM * this.h, LEN_FOREARM * this.h, _pole, _mid);
    aimBone(
      this.bones[shoulderBone],
      wq[BONES[shoulderBone].parent],
      left ? DIR_ARM_L : DIR_ARM_R,
      _dir.copy(_mid).sub(shoulder).normalize(),
    );
    this.forwardFrom(left ? CHAIN_ARM_L0 : CHAIN_ARM_R0);
    aimBone(
      this.bones[foreBone],
      wq[shoulderBone],
      left ? DIR_FORE_L : DIR_FORE_R,
      _dir.copy(target).sub(_mid).normalize(),
    );
    this.forwardFrom(left ? CHAIN_ARM_L1 : CHAIN_ARM_R1);
    this.bones[handBone].quaternion.identity();
    this.forwardFrom(left ? CHAIN_ARM_L2 : CHAIN_ARM_R2);
  }

  /* ------------------------------- outputs -------------------------------- */

  private publish(): void {
    this.muzzle
      .copy(MUZZLE_LOCAL)
      .multiplyScalar(this.h)
      .applyQuaternion(wq[B.weapon])
      .add(wp[B.weapon]);
    this.muzzleDir.set(0, 0, 1).applyQuaternion(wq[B.weapon]).normalize();
    this.eye.copy(wp[B.head]);
    this.eye.y += 0.115 * this.h;
    _v.set(0, 0, 0.075 * this.h).applyQuaternion(wq[B.head]);
    this.eye.add(_v);
    this.chest.copy(wp[B.chest]);
  }

  /** World position of a bone, from the last solve. */
  bonePosition(index: number, out: THREE.Vector3): THREE.Vector3 {
    return out.copy(wp[index]);
  }

  boneRotation(index: number, out: THREE.Quaternion): THREE.Quaternion {
    return out.copy(wq[index]);
  }

  /** Reads the current world transforms into caller-supplied arrays. */
  snapshot(positions: THREE.Vector3[], rotations: THREE.Quaternion[]): void {
    for (let i = 0; i < BONE_COUNT; i++) {
      positions[i].copy(wp[i]);
      rotations[i].copy(wq[i]);
    }
  }

  get heightScale(): number {
    return this.h;
  }

  get yaw(): number {
    return this.bodyYaw;
  }
}

/* ------------------------------- helpers --------------------------------- */

const _m = new THREE.Matrix4();

/** Chains recomputed after each IK stage, in parent-first order. */
const CHAIN_LEG_L0 = [B.thighL];
const CHAIN_LEG_L1 = [B.calfL];
const CHAIN_LEG_L2 = [B.footL, B.toeL];
const CHAIN_LEG_R0 = [B.thighR];
const CHAIN_LEG_R1 = [B.calfR];
const CHAIN_LEG_R2 = [B.footR, B.toeR];
const CHAIN_ARM_L0 = [B.armL];
const CHAIN_ARM_L1 = [B.foreL];
const CHAIN_ARM_L2 = [B.handL];
const CHAIN_ARM_R0 = [B.armR];
const CHAIN_ARM_R1 = [B.foreR];
const CHAIN_ARM_R2 = [B.handR];
const CHAIN_WEAPON = [B.weapon];

const _localDir = new THREE.Vector3();
const _invQ = new THREE.Quaternion();

/**
 * Rotates a bone so that a direction fixed in its bind frame points along a
 * world direction. Rest rotations are identity, so the bind direction is
 * already a world vector and no rest correction is needed.
 */
function aimBone(
  bone: THREE.Bone,
  parentWorld: THREE.Quaternion,
  bind: THREE.Vector3,
  worldDir: THREE.Vector3,
): void {
  if (!Number.isFinite(worldDir.x) || worldDir.lengthSq() < 1e-9) return;
  _invQ.copy(parentWorld).invert();
  _localDir.copy(worldDir).applyQuaternion(_invQ).normalize();
  bone.quaternion.setFromUnitVectors(bind, _localDir);
}

const _ax = new THREE.Vector3();
const _dn = new THREE.Vector3();
const _perp = new THREE.Vector3();

/**
 * Two-bone IK by the law of cosines. Writes the joint position into `outMid`.
 * An unreachable target extends the limb toward it rather than snapping, and
 * the pole vector is projected perpendicular so the joint can never invert.
 */
export function solveTwoBone(
  root: THREE.Vector3,
  target: THREE.Vector3,
  l1: number,
  l2: number,
  pole: THREE.Vector3,
  outMid: THREE.Vector3,
): void {
  _ax.copy(target).sub(root);
  let d = _ax.length();
  const max = (l1 + l2) * 0.995;
  const min = Math.abs(l1 - l2) * 1.02 + 1e-3;
  if (d < 1e-5) {
    _ax.set(0, -1, 0);
    d = 1e-5;
  }
  _dn.copy(_ax).multiplyScalar(1 / d);
  const dd = clamp(d, min, max);
  const cos = clamp((dd * dd + l1 * l1 - l2 * l2) / (2 * dd * l1), -1, 1);
  const along = l1 * cos;
  const perp = l1 * Math.sqrt(Math.max(0, 1 - cos * cos));

  _perp.copy(pole).addScaledVector(_dn, -pole.dot(_dn));
  if (_perp.lengthSq() < 1e-8) {
    _perp.set(-_dn.y, _dn.x, 0);
    if (_perp.lengthSq() < 1e-8) _perp.set(1, 0, 0);
  }
  _perp.normalize();
  outMid.copy(root).addScaledVector(_dn, along).addScaledVector(_perp, perp);
}

/** How strongly the scripted reload path overrides the handguard grip. */
function reloadBlend(t: number): number {
  if (t < 0.12) return smoothstep(0, 0.12, t);
  if (t > 0.9) return 1 - smoothstep(0.9, 1, t);
  return 1;
}
