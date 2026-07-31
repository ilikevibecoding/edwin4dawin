/**
 * Procedural animation.
 *
 * There are no clips. Every pose is synthesised from the agent's own state, which
 * is the only way to get a soldier who is simultaneously walking north-east,
 * aiming west and flinching from a round that just went past their ear without
 * authoring the cross product of those things.
 *
 * The structure is four layers evaluated in order:
 *
 *  1. **Gait.** A per-foot step machine, not a global sine wave. Each foot is
 *     either planted at a world position it does not leave, or swinging along an
 *     arc to a predicted landing point. A cadence clock decides when to hand off.
 *     Feet that hold a world position while the body moves over them are the
 *     single largest difference between animation that reads as animation and
 *     animation that reads as a person; a foot that slides is the first thing a
 *     player notices and the last thing they forgive.
 *  2. **Spine.** Pelvis bob, sway and counter-rotation from the gait, then the
 *     spine chain twists the chest onto the aim direction and leans into
 *     acceleration. Lower body goes where the agent is walking, upper body goes
 *     where the agent is looking, and the twist between them is distributed over
 *     three joints so nothing creases.
 *  3. **Weapon and arms.** The weapon leads: its transform is derived from the
 *     aim ray so the muzzle points exactly where the AI decided to shoot, and
 *     both hands are then IK-solved onto its grips. Doing it the other way round —
 *     animating the arms and hanging the gun off a hand — is why AI in a lot of
 *     games visibly shoots past you.
 *  4. **Additive.** Recoil, reload, hit flinch and suppression cowering, each a
 *     decaying spring on top of everything above.
 *
 * Cost scales with `quality`: 0 solves four IK chains and a look-at, 1 drops the
 * head and hand refinement, 2 drops IK entirely for canned joint angles. A
 * soldier at sixty metres is a dozen pixels tall and cannot tell you which one it
 * got.
 */
import * as THREE from 'three';
import type { BodyPart } from '../../core/GameTypes';
import { clamp, damp, lerp, Rng, saturate, smoothstep, TAU } from '../../core/MathUtils';
import { makeChain, lookAtLimited, setWorldRotation, solveLimb, type LimbChain } from './IK';
import { B } from './Rig';
import type { SoldierMesh } from './Factory';

export type AnimQuality = 0 | 1 | 2;

/** Ground query the gait uses to plant a foot. Allowed to return null. */
export type GroundProbe = (x: number, z: number, y: number) => number | null;

const UP = /* @__PURE__ */ new THREE.Vector3(0, 1, 0);

/** Ankle height above the sole in the bind pose. */
const ANKLE = 0.104;
/** Lateral half-spacing of the feet at rest. */
const STANCE_WIDTH = 0.115;
/** Lateral half-spacing of the hip joints in the bind pose. */
const HIP_HALF_WIDTH = 0.096;
/** How far the hips bone sits above the hip joints in the bind pose. */
const PELVIS_ABOVE_HIP = 0.038;
/** Knee flexion kept at full stand, so the joint never reaches its singularity. */
const KNEE_KEEP = 0.012;
/**
 * Pelvis height standing and fully crouched.
 *
 * The standing value is the tallest the legs can hold with `KNEE_KEEP` of bend
 * left in them, which is what makes the crown land on the 1.8 m the rig was
 * authored at and combat registers as the hitbox. Lowering it shortens the
 * soldier without making him look any more relaxed.
 */
const PELVIS_STAND = 0.978;
/**
 * Crouched pelvis height.
 *
 * A deeper squat than this drops the crown further but the knees have to go
 * somewhere, and at 55 cm they end up out to the sides in a sumo stance. The
 * height comes out of the spine instead: the crouch pitches the pelvis and leans
 * the chest forward, which lowers the head without splaying the legs.
 */
const PELVIS_CROUCH = 0.63;
/** How far the leading foot steps forward in a crouch, to break the squat. */
const CROUCH_STAGGER = 0.12;
/** Fraction of a step cycle the foot spends on the ground. */
const DUTY = 0.62;
/**
 * Lowest the pelvis may ride at speed before the stride is shortened to keep it
 * up, walking and running.
 *
 * Foot separation and pelvis height are the same number seen two ways: a leg is
 * a rigid pair of bones, so the further apart the feet are planted the lower the
 * hips have to sit for both of them to reach the floor. Choosing a cadence
 * without reference to that is what produces the Groucho walk, and at these
 * proportions it bottomed the pelvis out on its hard floor — a soldier who
 * patrolled the entire map in a full squat with both arms pulled straight off
 * his weapon. Fixing the floor first and deriving the stride from it inverts the
 * dependency, and the stride is the parameter that can afford to give.
 */
const HIP_FLOOR_WALK = 0.9;
/**
 * Sprinting is the one gait this trade cannot be won at. A real sprint clears
 * the ground entirely between steps and this step machine never lets both feet
 * leave it, so the stride a 6.4 m/s sprint needs has to come out of pelvis
 * height instead of out of a flight phase. Dropping into a hard forward-leaning
 * run is the honest version of that; the alternative at this leg length is a
 * ten-hertz shuffle.
 */
const HIP_FLOOR_RUN = 0.71;
/** Cadence ceiling. Past this the legs blur and the feet start to skate. */
const MAX_CADENCE = 7;

interface Foot {
  side: number;
  /** World ankle position the foot is committed to while planted. */
  readonly plant: THREE.Vector3;
  readonly liftFrom: THREE.Vector3;
  readonly target: THREE.Vector3;
  readonly current: THREE.Vector3;
  swinging: boolean;
  /** 0..1 through the swing. */
  t: number;
  duration: number;
  yaw: number;
  targetYaw: number;
  groundY: number;
  toe: number;
}

export class Animator {
  // --- Written by the owner every frame -----------------------------------
  /** World point the upper body aims at. */
  readonly aimPoint = new THREE.Vector3(0, 1.5, -10);
  /** World planar velocity. */
  readonly velocity = new THREE.Vector3();
  bodyYaw = 0;
  /** 0..1 crouch blend. */
  crouch = 0;
  /** 0..1 weapon shouldered versus carried at low ready. */
  weaponUp = 0;
  /** 0..1 suppression cowering. */
  suppression = 0;
  /** 0..1 reload progress, or -1 when not reloading. */
  reloadProgress = -1;
  /** Set while the agent is sprinting with the weapon down. */
  sprinting = false;

  // --- Read by the owner ---------------------------------------------------
  /** World muzzle position after the current pose. */
  readonly muzzle = new THREE.Vector3();
  /** World muzzle direction after the current pose. */
  readonly muzzleDir = new THREE.Vector3(0, 0, -1);
  /** True on the frame a foot touched down, for footstep audio. */
  footstep = false;
  /** Surface-relative loudness of that footstep. */
  footstepLoud = 0;

  private readonly mesh: SoldierMesh;
  private readonly bones: THREE.Bone[];
  private readonly rng: Rng;
  private readonly legL: LimbChain;
  private readonly legR: LimbChain;
  private readonly armL: LimbChain;
  private readonly armR: LimbChain;
  private readonly legReach: number;

  /**
   * Per-instance build.
   *
   * Geometry and materials are shared, so the only place two soldiers of the same
   * kit can differ is in how they stand. A centimetre or two of pelvis height and
   * a slightly narrower or wider stance is enough to break the copy-paste read in
   * a line-up, and neither costs anything. The height bias is one-sided: the
   * nominal stand is already the tallest these legs can hold with bend left in the
   * knees, so the variation goes down from it.
   */
  private readonly standHeight: number;
  private readonly stanceWidth: number;

  private readonly feet: [Foot, Foot];
  private cadencePhase = 0;
  private nextFoot = 0;
  private speed = 0;
  private smoothedSpeed = 0;
  /** Model-space movement direction, smoothed. */
  private moveX = 0;
  private moveZ = -1;

  private pelvisY = PELVIS_STAND;
  private breath = 0;
  private idleSeed: number;
  private lastYaw = 0;
  private yawRate = 0;
  private accelForward = 0;
  private accelRight = 0;
  private lastSpeedForward = 0;
  private lastSpeedRight = 0;

  private recoil = 0;
  private recoilVel = 0;
  private flinchPitch = 0;
  private flinchYaw = 0;
  private flinchVel = 0;
  private flinchYawVel = 0;
  private headTurn = 0;
  private scanPhase = 0;
  private scanTarget = 0;

  private readonly aimLocal = new THREE.Vector3();
  private readonly gunOrigin = new THREE.Vector3();
  /** Shoulder pocket the butt pad is held against, in model space. */
  private readonly pocket = new THREE.Vector3();
  private readonly gunDir = new THREE.Vector3(0, 0, -1);
  private readonly basis = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly quatB = new THREE.Quaternion();
  private readonly vecA = new THREE.Vector3();
  private readonly vecB = new THREE.Vector3();
  private readonly vecC = new THREE.Vector3();
  private readonly pole = new THREE.Vector3();
  private readonly gripL = new THREE.Vector3();
  private readonly gripR = new THREE.Vector3();
  private readonly euler = new THREE.Euler();

  constructor(mesh: SoldierMesh, seed: number) {
    this.mesh = mesh;
    this.bones = mesh.bones;
    this.rng = new Rng(seed);
    this.idleSeed = this.rng.next() * TAU;
    this.standHeight = PELVIS_STAND - this.rng.next() * 0.03;
    this.stanceWidth = STANCE_WIDTH * this.rng.range(0.88, 1.12);

    const b = this.bones;
    this.legL = makeChain(b[B.upLegL], b[B.legL], b[B.footL]);
    this.legR = makeChain(b[B.upLegR], b[B.legR], b[B.footR]);
    this.armL = makeChain(b[B.armL], b[B.foreArmL], b[B.handL]);
    this.armR = makeChain(b[B.armR], b[B.foreArmR], b[B.handR]);
    this.legReach = this.legL.upperLength + this.legL.lowerLength;

    this.feet = [makeFoot(-1), makeFoot(1)];
  }

  /** Places both feet under a fresh spawn so the first frame is not a lurch. */
  reset(feet: THREE.Vector3, yaw: number): void {
    this.bodyYaw = yaw;
    this.lastYaw = yaw;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    for (const foot of this.feet) {
      // Body right in world space for yaw where 0 faces -Z.
      const rx = cos;
      const rz = -sin;
      foot.plant.set(
        feet.x + rx * foot.side * this.stanceWidth,
        feet.y + ANKLE,
        feet.z + rz * foot.side * this.stanceWidth,
      );
      foot.current.copy(foot.plant);
      foot.target.copy(foot.plant);
      foot.liftFrom.copy(foot.plant);
      foot.groundY = feet.y;
      foot.yaw = yaw;
      foot.targetYaw = yaw;
      foot.swinging = false;
      foot.t = 1;
      foot.toe = 0;
    }
    this.pelvisY = this.standHeight;
    this.recoil = 0;
    this.recoilVel = 0;
  }

  notifyShot(strength: number): void {
    this.recoilVel += strength * 26;
    this.flinchVel += strength * 1.4;
  }

  /** Torso flinch away from an impact. `direction` is the round's travel. */
  notifyHit(direction: THREE.Vector3, part: BodyPart): void {
    const local = this.vecA.copy(direction);
    const cos = Math.cos(-this.bodyYaw);
    const sin = Math.sin(-this.bodyYaw);
    const lx = local.x * cos - local.z * sin;
    const lz = local.x * sin + local.z * cos;
    const scale = part === 'head' || part === 'neck' ? 1.5 : part === 'leg' ? 0.5 : 1;
    this.flinchVel += -lz * 9 * scale;
    this.flinchYawVel += lx * 7 * scale;
  }

  /** Aim direction the weapon is currently pointing, before recoil. */
  getAimDir(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.gunDir);
  }

  update(
    dt: number,
    feet: THREE.Vector3,
    quality: AnimQuality,
    probe: GroundProbe | null,
  ): void {
    this.footstep = false;
    const root = this.mesh.root;

    this.speed = Math.hypot(this.velocity.x, this.velocity.z);
    this.smoothedSpeed = damp(this.smoothedSpeed, this.speed, 9, dt);
    this.yawRate = damp(this.yawRate, shortestDelta(this.lastYaw, this.bodyYaw) / Math.max(dt, 1e-4), 8, dt);
    this.lastYaw = this.bodyYaw;
    this.breath = (this.breath + dt * 0.62) % 1;
    this.scanPhase -= dt;

    // Body basis in world space. Yaw 0 faces -Z, so forward is
    // (-sin, 0, -cos) and right is (cos, 0, -sin).
    const cosY = Math.cos(this.bodyYaw);
    const sinY = Math.sin(this.bodyYaw);
    const fx = -sinY;
    const fz = -cosY;
    const rx = cosY;
    const rz = -sinY;

    const forwardSpeed = this.velocity.x * fx + this.velocity.z * fz;
    const rightSpeed = this.velocity.x * rx + this.velocity.z * rz;
    this.accelForward = damp(this.accelForward, (forwardSpeed - this.lastSpeedForward) / Math.max(dt, 1e-4), 6, dt);
    this.accelRight = damp(this.accelRight, (rightSpeed - this.lastSpeedRight) / Math.max(dt, 1e-4), 6, dt);
    this.lastSpeedForward = forwardSpeed;
    this.lastSpeedRight = rightSpeed;

    this.updateGait(dt, feet, fx, fz, rx, rz, probe);
    this.integrateAdditive(dt);

    // Model-space aim, so the whole upper body can be posed without a matrix
    // round trip through the scene graph.
    this.toModelSpace(this.aimPoint, feet, cosY, sinY, this.aimLocal);

    const crouchAmount = saturate(this.crouch + this.suppression * 0.45);
    this.poseSpine(dt, crouchAmount);
    this.poseWeapon(crouchAmount);

    root.position.copy(feet);
    root.quaternion.setFromAxisAngle(UP, this.bodyYaw);
    root.updateMatrixWorld(true);

    if (quality < 2) {
      this.solveLegs(fx, fz, rx, rz);
      this.solveArms(fx, fz, rx, rz, quality);
    } else {
      this.cannedLegs();
    }
    if (quality === 0) this.poseHead();

    this.readMuzzle(feet, cosY, sinY);
  }

  // -------------------------------------------------------------------------
  // Gait
  // -------------------------------------------------------------------------

  private updateGait(
    dt: number,
    feet: THREE.Vector3,
    fx: number,
    fz: number,
    rx: number,
    rz: number,
    probe: GroundProbe | null,
  ): void {
    const speed = this.speed;
    const moving = speed > 0.22;

    // Furthest a planted foot may sit from its own hip without pulling the pelvis
    // below the floor set for this gait. Everything about the step derives from
    // this, because it is the one number the skeleton does not negotiate.
    const hipFloor = lerp(
      lerp(HIP_FLOOR_WALK, HIP_FLOOR_RUN, saturate((speed - 2.8) / 3.6)),
      PELVIS_CROUCH,
      saturate(this.crouch + this.suppression * 0.4),
    );
    const hipRise = clamp(hipFloor - PELVIS_ABOVE_HIP - ANKLE, 0.12, this.legReach - 0.02);
    const maxOffset = Math.sqrt(this.legReach * this.legReach - hipRise * hipRise);

    // Stride grows with speed but sub-linearly, so a run is a higher cadence and
    // a longer step rather than either alone — then it is capped by the leg. A
    // foot lands `1 - DUTY/2` of a step ahead of the body, so invert that to turn
    // the reach limit into the longest step that respects it.
    const stride = Math.min(
      clamp(0.62 + speed * 0.15, 0.6, 1.42),
      maxOffset / (1 - DUTY * 0.5),
    );
    const cadence = moving ? clamp(speed / stride, 0.4, MAX_CADENCE) : 0;

    if (moving) {
      const dirLen = Math.max(1e-4, Math.hypot(this.velocity.x, this.velocity.z));
      this.moveX = damp(this.moveX, this.velocity.x / dirLen, 10, dt);
      this.moveZ = damp(this.moveZ, this.velocity.z / dirLen, 10, dt);
    } else {
      this.moveX = damp(this.moveX, fx, 6, dt);
      this.moveZ = damp(this.moveZ, fz, 6, dt);
    }
    const mLen = Math.max(1e-4, Math.hypot(this.moveX, this.moveZ));
    const mx = this.moveX / mLen;
    const mz = this.moveZ / mLen;

    this.cadencePhase += dt * cadence;
    let handoff = this.cadencePhase >= 1;
    if (handoff) this.cadencePhase -= Math.floor(this.cadencePhase);

    // Idle re-planting. A soldier who turns on the spot has to pick their feet up;
    // rotating a planted foot in place is the other classic tell.
    if (!moving) {
      for (let i = 0; i < 2; i++) {
        const foot = this.feet[i];
        if (foot.swinging) continue;
        this.restingPlace(feet, foot, rx, rz, this.vecA);
        const drift = Math.hypot(foot.plant.x - this.vecA.x, foot.plant.z - this.vecA.z);
        const twist = Math.abs(shortestDelta(foot.yaw, this.bodyYaw));
        if (drift > 0.2 || twist > 0.42) {
          if (!this.feet[1 - i].swinging) this.beginSwing(foot, feet, mx, mz, rx, rz, 0, 0.3, probe);
        }
      }
    } else if (handoff) {
      const foot = this.feet[this.nextFoot];
      const other = this.feet[1 - this.nextFoot];
      // Never leave the ground entirely; if the other foot is still airborne,
      // wait for it rather than making the soldier hop.
      if (!other.swinging || other.t > 0.6) {
        const swingTime = Math.min(0.36, DUTY / Math.max(cadence, 0.3));
        // Land the foot as far in front of the body as it will be behind it when
        // it next lifts. Anything else is a lunge the following leg has to pay
        // for, and it is paid for out of pelvis height.
        const half = Math.min(maxOffset, Math.max(0, stride - speed * swingTime * 0.5));
        // The body keeps moving while the foot is in the air, so aim at where it
        // needs to be on touchdown rather than where it would be now.
        this.beginSwing(foot, feet, mx, mz, rx, rz, speed * swingTime + half, swingTime, probe);
        this.nextFoot = 1 - this.nextFoot;
      }
      handoff = false;
    }

    for (const foot of this.feet) {
      if (!foot.swinging) {
        foot.current.copy(foot.plant);
        foot.toe = damp(foot.toe, 0, 14, dt);
        continue;
      }
      foot.t += dt / foot.duration;
      if (foot.t >= 1) {
        foot.t = 1;
        foot.swinging = false;
        foot.plant.copy(foot.target);
        foot.current.copy(foot.target);
        foot.yaw = foot.targetYaw;
        this.footstep = true;
        this.footstepLoud = saturate(0.25 + this.smoothedSpeed * 0.16);
        continue;
      }
      const t = foot.t;
      const ease = smoothstep(0, 1, t);
      foot.current.lerpVectors(foot.liftFrom, foot.target, ease);
      // Arc height falls off with cadence: a jog lifts the foot, a shuffle does not.
      const lift = 0.055 + clamp(this.smoothedSpeed * 0.028, 0, 0.09);
      foot.current.y += Math.sin(Math.PI * t) * lift;
      foot.yaw = foot.yaw + shortestDelta(foot.yaw, foot.targetYaw) * ease * 0.6;
      // Toe down as it leaves, toe up as it reaches for the ground.
      foot.toe = Math.sin(t * Math.PI * 2) * 0.34;
    }

    // Pelvis height: the lower of the pose height and whatever both legs can
    // actually reach, so a soldier stepping onto a kerb does not detach a leg.
    const stand = lerp(this.standHeight, PELVIS_CROUCH, saturate(this.crouch + this.suppression * 0.4));
    let target = stand;
    const bobPhase = this.cadencePhase * TAU;
    if (this.speed > 0.22) target -= (0.5 + 0.5 * Math.cos(bobPhase * 2)) * 0.026 * clamp(this.smoothedSpeed / 3, 0.3, 1.4);
    else target -= Math.sin(this.breath * TAU + this.idleSeed) * 0.004;

    for (const foot of this.feet) {
      // Reach is measured from the hip joint, not from the body centre. The two
      // differ by the width of the pelvis, and using the centre treats the 11 cm
      // the stance is wide as leg length spent going sideways when almost all of
      // it is just the gap between the hips — which drops the pelvis 7 cm and
      // locks both knees straight to reach the floor.
      const dx = foot.current.x - (feet.x + rx * foot.side * HIP_HALF_WIDTH);
      const dz = foot.current.z - (feet.z + rz * foot.side * HIP_HALF_WIDTH);
      const flat = Math.hypot(dx, dz);
      const vertical = Math.sqrt(Math.max(0.0025, this.legReach * this.legReach - flat * flat));
      // The hips bone rides above the joints it swings from, so the pelvis clears
      // the reachable hip height rather than sitting at it.
      const limit = foot.current.y - feet.y + vertical + PELVIS_ABOVE_HIP - KNEE_KEEP;
      if (limit < target) target = limit;
    }
    // Damped with the real step, not a nominal frame: the animator runs at the
    // agent's LOD rate, so a hard-coded 1/60 makes a distant soldier's pelvis take
    // seconds to reach a crouch it should hit in a fifth of one.
    this.pelvisY = damp(this.pelvisY, clamp(target, 0.42, this.standHeight), 16, dt);
  }

  /**
   * Where a foot wants to be when the agent is standing still.
   *
   * Crouching widens the stance and staggers it — the left foot forward, the right
   * back under the hips. A symmetric crouch with both feet under the pelvis reads
   * as sitting on an invisible chair; a staggered one reads as a man ready to move.
   */
  private restingPlace(
    feet: THREE.Vector3,
    foot: Foot,
    rx: number,
    rz: number,
    out: THREE.Vector3,
  ): THREE.Vector3 {
    const crouch = saturate(this.crouch);
    const spread = this.stanceWidth * (1 + crouch * 0.3);
    const lead = foot.side < 0 ? CROUCH_STAGGER * crouch : -CROUCH_STAGGER * 0.45 * crouch;
    // Body forward is (rz, -rx) for right = (rx, rz) at yaw where 0 faces -Z.
    return out.set(
      feet.x + rx * foot.side * spread + rz * lead,
      feet.y + ANKLE,
      feet.z + rz * foot.side * spread - rx * lead,
    );
  }

  private beginSwing(
    foot: Foot,
    feet: THREE.Vector3,
    mx: number,
    mz: number,
    rx: number,
    rz: number,
    reach: number,
    duration: number,
    probe: GroundProbe | null,
  ): void {
    foot.liftFrom.copy(foot.current);
    let x: number;
    let z: number;
    if (reach > 0.1) {
      // Land ahead of the body along the direction of travel, offset to this foot's
      // side, with a little inward crossover at speed so a run is not a waddle.
      const spread = this.stanceWidth * (1 + this.crouch * 0.35) * 0.82;
      x = feet.x + mx * reach + rx * foot.side * spread;
      z = feet.z + mz * reach + rz * foot.side * spread;
    } else {
      // Re-planting on the spot. It has to use the same target the drift test uses,
      // or the two disagree and the agent shuffles its feet forever.
      this.restingPlace(feet, foot, rx, rz, this.vecB);
      x = this.vecB.x;
      z = this.vecB.z;
    }
    let groundY = feet.y;
    if (probe) {
      const sampled = probe(x, z, feet.y);
      if (sampled !== null && Math.abs(sampled - feet.y) < 0.75) groundY = sampled;
      else {
        // No surface there: pull the step back under the body instead of
        // planting a foot in mid-air over a ledge.
        this.restingPlace(feet, foot, rx, rz, this.vecB);
        x = this.vecB.x;
        z = this.vecB.z;
      }
    }
    foot.target.set(x, groundY + ANKLE, z);
    foot.groundY = groundY;
    foot.targetYaw =
      reach > 0.1 ? Math.atan2(-mx, -mz) + foot.side * 0.07 : this.bodyYaw + foot.side * 0.09;
    foot.swinging = true;
    foot.t = 0;
    foot.duration = Math.max(0.14, duration);
  }

  // -------------------------------------------------------------------------
  // Spine
  // -------------------------------------------------------------------------

  private poseSpine(dt: number, crouchAmount: number): void {
    const b = this.bones;
    const phase = this.cadencePhase * TAU;
    const gaitWeight = clamp(this.smoothedSpeed / 2.6, 0, 1.15);

    // Pelvis: height, lateral sway, counter-rotation and roll.
    const pelvis = b[B.hips];
    pelvis.position.set(
      Math.sin(phase) * 0.022 * gaitWeight,
      this.pelvisY,
      lerp(0, 0.05, crouchAmount) + Math.cos(phase * 2) * 0.008 * gaitWeight,
    );
    const pelvisYaw = -Math.sin(phase) * 0.16 * gaitWeight;
    const pelvisRoll = Math.sin(phase) * 0.07 * gaitWeight - clamp(this.accelRight * 0.012, -0.1, 0.1);
    // Sign convention for the whole spine: bone +Y runs up the chain, so a positive
    // rotation about local X tips it towards +Z, and the character faces -Z. Every
    // lean here is therefore expressed as a positive "forward" amount and negated
    // on the way into the Euler. Getting this backwards is not subtle — it is the
    // difference between a soldier hunched over his weapon and one reclining.
    const pelvisLean = crouchAmount * 0.3 + clamp(this.accelForward * 0.008, -0.09, 0.05);
    this.euler.set(-pelvisLean, pelvisYaw, pelvisRoll, 'YXZ');
    pelvis.quaternion.setFromEuler(this.euler);

    // Chest twist onto the aim, distributed up the spine. Anything the spine
    // cannot supply is left to the weapon and the head.
    const aimYaw = Math.atan2(-this.aimLocal.x, -this.aimLocal.z);
    const horizontal = Math.hypot(this.aimLocal.x, this.aimLocal.z);
    const aimPitch = Math.atan2(this.aimLocal.y - 1.42, Math.max(0.2, horizontal));

    const twist = clamp(aimYaw - pelvisYaw, -1.0, 1.0) * lerp(0.45, 0.85, this.weaponUp);
    // Aiming down folds the chest over the weapon; aiming up opens it out.
    const pitch = clamp(-aimPitch, -0.5, 0.55) * lerp(0.2, 0.42, this.weaponUp);

    const lean =
      clamp(this.accelForward * 0.013, -0.06, 0.14) +
      crouchAmount * 0.22 +
      this.weaponUp * 0.06 +
      this.suppression * 0.22 +
      (this.sprinting ? 0.14 : 0);
    const roll = -Math.sin(phase) * 0.05 * gaitWeight + clamp(this.yawRate * 0.03, -0.12, 0.12);

    // Squaring up. A right-handed shooter rotates the chest so the support
    // shoulder leads, and it is not cosmetic: with the shoulders square to the
    // target the support hand is 60 cm from its own shoulder and the arm is 49 cm
    // long, so without this rotation the hand cannot reach the weapon at all.
    const squareUp = -0.34 * lerp(0.4, 1, this.weaponUp);

    const share: readonly number[] = [0.22, 0.34, 0.44];
    const spineBones = [B.spine, B.spine1, B.spine2];
    for (let i = 0; i < 3; i++) {
      const w = share[i];
      this.euler.set(
        -(pitch + lean * (i === 0 ? 0.5 : 1)) * w * 1.9 + this.flinchPitch * w * 1.6,
        twist * w * 1.7 + squareUp * w + this.flinchYaw * w,
        roll * w * 1.6,
        'YXZ',
      );
      b[spineBones[i]].quaternion.setFromEuler(this.euler);
    }

    // Clavicles: shrug into recoil, lift with the weapon, and protract the support
    // side so the shoulder itself reaches forward with the arm.
    const shrug = this.recoil * 0.06 + this.weaponUp * 0.05;
    this.euler.set(0, this.weaponUp * 0.07, -shrug, 'YXZ');
    b[B.shoulderR].quaternion.setFromEuler(this.euler);
    this.euler.set(0, this.weaponUp * -0.13, shrug * 0.6, 'YXZ');
    b[B.shoulderL].quaternion.setFromEuler(this.euler);

    // Neck takes a third of the residual look angle; the head takes the rest. Its
    // pitch has to undo most of the chest lean, or a soldier hunched over his
    // weapon is staring at the ground three feet in front of him.
    const residual = aimYaw - twist;
    this.headTurn = damp(this.headTurn, clamp(residual, -1.3, 1.3), 7, dt);
    const neckLift = clamp((pitch + lean) * 0.62 + aimPitch * 0.3, -0.45, 0.5);
    this.euler.set(neckLift, this.headTurn * 0.35, 0, 'YXZ');
    b[B.neck].quaternion.setFromEuler(this.euler);
    this.euler.set(
      clamp((pitch + lean) * 0.3 + aimPitch * 0.3, -0.4, 0.45) - this.suppression * 0.22,
      this.headTurn * 0.55,
      this.flinchYaw * 0.3,
      'YXZ',
    );
    b[B.head].quaternion.setFromEuler(this.euler);
  }

  /**
   * Head look-at, run after the world matrices exist so the neck limit is
   * measured in world space rather than approximated in Euler angles.
   */
  private poseHead(): void {
    const head = this.bones[B.head];
    // Idle scanning: when there is nothing to look at, the head drifts to a new
    // point every few seconds instead of staring dead ahead.
    if (this.weaponUp < 0.35 && this.scanPhase <= 0) {
      this.scanPhase = this.rng.range(1.6, 4.2);
      this.scanTarget = this.rng.range(-0.7, 0.7);
    }
    const scan = this.weaponUp < 0.35 ? this.scanTarget : 0;
    this.vecA.copy(this.aimPoint);
    if (scan !== 0) {
      const cos = Math.cos(scan);
      const sin = Math.sin(scan);
      const dx = this.vecA.x - head.matrixWorld.elements[12];
      const dz = this.vecA.z - head.matrixWorld.elements[14];
      this.vecA.x = head.matrixWorld.elements[12] + dx * cos - dz * sin;
      this.vecA.z = head.matrixWorld.elements[14] + dx * sin + dz * cos;
    }
    // The head bone's local +Y runs up the skull, so the face is -Z.
    this.vecB.set(0, 0, -1);
    lookAtLimited(head, this.vecB, this.vecA, 1.05, saturate(0.55 + this.weaponUp * 0.4));
  }

  // -------------------------------------------------------------------------
  // Weapon
  // -------------------------------------------------------------------------

  private poseWeapon(crouchAmount: number): void {
    const holder = this.mesh.weaponHolder;
    const up = this.weaponUp;

    // The shoulder pocket: inboard of and just below the right shoulder joint when
    // shouldered, dropping onto the chest as the weapon comes down to low ready.
    const pocketY = lerp(1.3, 1.395, up) - crouchAmount * 0.3 - this.suppression * 0.08;
    this.pocket.set(lerp(0.128, 0.106, up), pocketY, lerp(-0.028, 0.006, up));
    // Provisional origin, only used to get a direction to aim along; the real one
    // is derived from it below once the aim is known.
    this.gunOrigin.copy(this.pocket);

    // Aim direction. Low ready points the muzzle down and slightly inboard.
    this.gunDir.subVectors(this.aimLocal, this.gunOrigin);
    if (this.gunDir.lengthSq() < 1e-6) this.gunDir.set(0, 0, -1);
    this.gunDir.normalize();
    if (up < 0.999) {
      this.vecA.set(-0.18, -0.52, -0.84).normalize();
      if (this.sprinting) this.vecA.set(-0.42, -0.3, -0.86).normalize();
      this.gunDir.lerp(this.vecA, 1 - up).normalize();
    }
    if (this.suppression > 0.01) {
      // Cowering: the weapon comes up over the cover, not down the sights.
      this.vecA.set(this.gunDir.x, this.gunDir.y + 0.55, this.gunDir.z).normalize();
      this.gunDir.lerp(this.vecA, this.suppression * 0.5).normalize();
    }

    // Reload: the weapon rolls inboard and dips while the magazine changes.
    let reloadRoll = 0;
    let reloadDip = 0;
    const r = this.reloadProgress;
    if (r >= 0) {
      const shape = Math.sin(saturate(r) * Math.PI);
      reloadRoll = shape * 0.75;
      reloadDip = shape * 0.34;
      this.vecA.set(this.gunDir.x - 0.2 * shape, this.gunDir.y - reloadDip, this.gunDir.z).normalize();
      this.gunDir.copy(this.vecA);
    }

    // Build the holder basis. Object3D looks down -Z, so -Z gets the aim.
    this.vecB.copy(this.gunDir).multiplyScalar(-1);
    this.vecA.set(0, 1, 0);
    this.vecC.crossVectors(this.vecA, this.vecB);
    if (this.vecC.lengthSq() < 1e-6) this.vecC.set(1, 0, 0);
    this.vecC.normalize();
    this.vecA.crossVectors(this.vecB, this.vecC);
    this.basis.makeBasis(this.vecC, this.vecA, this.vecB);
    holder.quaternion.setFromRotationMatrix(this.basis);

    // Cant the weapon: a real rifle is never perfectly upright in the hands.
    const cant = 0.075 + reloadRoll + this.recoil * 0.05;
    this.quat.setFromAxisAngle(FORWARD_LOCAL, -cant);
    holder.quaternion.multiply(this.quat);
    // Recoil rise about the weapon's own lateral axis.
    this.quat.setFromAxisAngle(RIGHT_LOCAL, this.recoil * 0.055);
    holder.quaternion.multiply(this.quat);

    // Place the weapon so its butt pad lands in the shoulder pocket. The pad is
    // behind the origin along the bore, so the origin goes forward by that much,
    // which is what puts the grip at arm's length instead of against the chest.
    // Less than 1: the pad sinks into the shoulder rather than resting on its
    // surface, and the shorter moment arm keeps the firing elbow tucked. Shorter
    // still at low ready, where the whole weapon is drawn in towards the chest.
    this.gunOrigin
      .copy(this.pocket)
      .addScaledVector(this.gunDir, this.mesh.prop.buttPad.z * lerp(0.62, 0.82, up))
      .addScaledVector(UP, -this.mesh.prop.buttPad.y);
    holder.position.copy(this.gunOrigin);
    // Kick straight back along the bore, which is what the shoulder absorbs.
    holder.position.addScaledVector(this.gunDir, -this.recoil * 0.05);
    holder.position.y -= reloadDip * 0.05;
    holder.updateMatrix();
  }

  private readMuzzle(feet: THREE.Vector3, cosY: number, sinY: number): void {
    const prop = this.mesh.prop;
    const holder = this.mesh.weaponHolder;
    this.vecA.copy(prop.muzzle).applyMatrix4(holder.matrix);
    // Holder matrix is model space; lift it into the world by hand rather than
    // forcing another matrixWorld pass.
    this.muzzle.set(
      feet.x + this.vecA.x * cosY + this.vecA.z * sinY,
      feet.y + this.vecA.y,
      feet.z - this.vecA.x * sinY + this.vecA.z * cosY,
    );
    this.muzzleDir.set(
      this.gunDir.x * cosY + this.gunDir.z * sinY,
      this.gunDir.y,
      -this.gunDir.x * sinY + this.gunDir.z * cosY,
    );
  }

  // -------------------------------------------------------------------------
  // IK passes
  // -------------------------------------------------------------------------

  private solveLegs(fx: number, fz: number, rx: number, rz: number): void {
    for (let i = 0; i < 2; i++) {
      const foot = this.feet[i];
      const chain = i === 0 ? this.legL : this.legR;
      // Knees forward and a touch outboard.
      this.pole.set(fx * 1.0 + rx * foot.side * 0.1, -0.15, fz * 1.0 + rz * foot.side * 0.1);
      solveLimb(chain, foot.current, this.pole);

      // The tip's local rotation is meaningless until its parents' world matrices
      // reflect the solve, so refresh the chain before planting the sole.
      chain.root.updateMatrixWorld(false);
      this.euler.set(foot.toe, foot.yaw, 0, 'YXZ');
      this.quatB.setFromEuler(this.euler);
      setWorldRotation(chain.tip, this.quatB);
    }
  }

  /**
   * Sinusoidal joint angles for distant agents. No IK, no ground contact.
   *
   * Leg bones run down the chain, so a positive rotation about local X swings the
   * joint below forwards: thigh positive is a knee lifted in front, shin positive
   * is a knee bending the wrong way, which is why the knee term is negated.
   */
  private cannedLegs(): void {
    const b = this.bones;
    const phase = this.cadencePhase * TAU;
    const swing = clamp(this.smoothedSpeed * 0.13, 0, 0.62);
    const bend = 0.25 + this.crouch * 1.1;
    for (let i = 0; i < 2; i++) {
      const s = Math.sin(phase + (i === 0 ? 0 : Math.PI));
      this.euler.set(s * swing + this.crouch * 0.9, 0, 0, 'YXZ');
      b[i === 0 ? B.upLegL : B.upLegR].quaternion.setFromEuler(this.euler);
      this.euler.set(-(Math.max(0, s) * swing * 0.9 + bend), 0, 0, 'YXZ');
      b[i === 0 ? B.legL : B.legR].quaternion.setFromEuler(this.euler);
      this.euler.set(bend * 0.5, 0, 0, 'YXZ');
      b[i === 0 ? B.footL : B.footR].quaternion.setFromEuler(this.euler);
    }
  }

  private solveArms(fx: number, fz: number, rx: number, rz: number, quality: AnimQuality): void {
    const holder = this.mesh.weaponHolder;
    const prop = this.mesh.prop;
    const root = this.mesh.root;

    // Holder is a child of the root and its local matrix is already written, so
    // one multiply gives the world grip points.
    this.basis.multiplyMatrices(root.matrixWorld, holder.matrix);
    this.gripR.copy(prop.gripRear).applyMatrix4(this.basis);
    // The support hand slides back to the magazine well as the weapon comes down.
    // It is a real carry, and it is also the only way the hand stays on the weapon:
    // at low ready the handguard is further from the support shoulder than the arm
    // is long, and an unreachable target leaves the hand floating in space.
    this.vecC.copy(prop.gripFront).lerp(prop.magazine, 1 - this.weaponUp);
    this.gripL.copy(this.vecC).applyMatrix4(this.basis);

    // During a reload the support hand leaves the handguard for the mag pouch.
    const r = this.reloadProgress;
    if (r >= 0) {
      const grab = smoothstep(0.02, 0.3, r) * (1 - smoothstep(0.62, 0.92, r));
      if (grab > 0.001) {
        this.vecA.set(0, 0, 0);
        // Pouch on the front of the carrier, in model space.
        this.vecB.set(-0.06, 1.14, -0.19);
        const pouch = this.vecA.set(
          root.position.x + this.vecB.x * Math.cos(this.bodyYaw) + this.vecB.z * Math.sin(this.bodyYaw),
          root.position.y + this.vecB.y,
          root.position.z - this.vecB.x * Math.sin(this.bodyYaw) + this.vecB.z * Math.cos(this.bodyYaw),
        );
        this.gripL.lerp(pouch, grab);
      }
    }

    // Elbows down, not out. The support elbow tucks almost under the weapon and
    // the firing elbow sits a little wider; flaring either one is the single most
    // obvious sign of an arm being driven by a solver rather than by a shooter.
    this.pole.set(-fx * 0.3 + rx * -0.34, -0.92, -fz * 0.3 + rz * -0.34).normalize();
    solveLimb(this.armL, this.gripL, this.pole);
    this.pole.set(-fx * 0.42 + rx * 0.46, -0.86, -fz * 0.42 + rz * 0.46).normalize();
    solveLimb(this.armR, this.gripR, this.pole);

    if (quality > 0) return;
    // Wrap the hands onto the grips: the fingers (local -Y) follow the grip axis.
    // Both hands need their forearm's post-solve world rotation to be current.
    this.armR.root.updateMatrixWorld(false);
    this.armL.root.updateMatrixWorld(false);

    this.quatB.setFromRotationMatrix(this.basis);
    this.euler.set(-1.15, 0, 0, 'YXZ');
    this.quat.setFromEuler(this.euler);
    setWorldRotation(this.armR.tip, this.quatB.multiply(this.quat));

    this.quatB.setFromRotationMatrix(this.basis);
    this.euler.set(-1.9, 0, 0.5, 'YXZ');
    this.quat.setFromEuler(this.euler);
    setWorldRotation(this.armL.tip, this.quatB.multiply(this.quat));
  }

  // -------------------------------------------------------------------------

  private integrateAdditive(dt: number): void {
    // Recoil: stiff spring, heavily damped, so it snaps and settles rather than
    // wobbling like a spring-loaded toy.
    const accel = -this.recoil * 620 - this.recoilVel * 34;
    this.recoilVel += accel * dt;
    this.recoil += this.recoilVel * dt;
    if (this.recoil < 0) {
      this.recoil = 0;
      if (this.recoilVel < 0) this.recoilVel *= 0.4;
    }

    const fa = -this.flinchPitch * 90 - this.flinchVel * 13;
    this.flinchVel += fa * dt;
    this.flinchPitch += this.flinchVel * dt;
    const fy = -this.flinchYaw * 90 - this.flinchYawVel * 13;
    this.flinchYawVel += fy * dt;
    this.flinchYaw += this.flinchYawVel * dt;
    this.flinchPitch = clamp(this.flinchPitch, -0.5, 0.5);
    this.flinchYaw = clamp(this.flinchYaw, -0.5, 0.5);
  }

  private toModelSpace(
    world: THREE.Vector3,
    feet: THREE.Vector3,
    cosY: number,
    sinY: number,
    out: THREE.Vector3,
  ): THREE.Vector3 {
    const dx = world.x - feet.x;
    const dy = world.y - feet.y;
    const dz = world.z - feet.z;
    // Inverse of a yaw rotation about +Y.
    return out.set(dx * cosY - dz * sinY, dy, dx * sinY + dz * cosY);
  }
}

const FORWARD_LOCAL = /* @__PURE__ */ new THREE.Vector3(0, 0, 1);
const RIGHT_LOCAL = /* @__PURE__ */ new THREE.Vector3(1, 0, 0);

function makeFoot(side: number): Foot {
  return {
    side,
    plant: new THREE.Vector3(),
    liftFrom: new THREE.Vector3(),
    target: new THREE.Vector3(),
    current: new THREE.Vector3(),
    swinging: false,
    t: 1,
    duration: 0.3,
    yaw: 0,
    targetYaw: 0,
    groundY: 0,
    toe: 0,
  };
}

function shortestDelta(from: number, to: number): number {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
