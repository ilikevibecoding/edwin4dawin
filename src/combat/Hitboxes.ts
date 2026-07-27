/**
 * Character hitboxes.
 *
 * Two jobs, both of which have to work whether or not the AI module registers
 * per-bone colliders with physics:
 *
 *  1. Resolve a body part from an impact point, used as the fallback when a
 *     physics hit arrives without `userData.bodyPart`.
 *  2. Answer ray queries analytically, so `raycastEntities` and shrapnel find
 *     bodies even against an AI that only owns a movement capsule.
 *
 * The model is deliberately facing-independent: a single vertical capsule wide
 * enough to contain the arms, plus a head sphere on top, with the body part
 * classified from the impact height and its radial distance from the spine. A
 * facing-dependent limb rig would be more accurate and would also mean the
 * crosshair sitting on a shoulder sometimes registers nothing, which is the
 * worse failure. Registration is generous on purpose; you hit what you aim at.
 *
 * Heights are normalised by the entity's standing height so crouch and prone
 * scale for free once the AI reports them through `setHitboxHeight`.
 */
import * as THREE from 'three';
import { GAMEPLAY } from '../core/Config';
import { COLLISION_GROUP, type BodyPart, type Damageable } from '../core/GameTypes';
import type { PhysicsSystem } from '../core/Contracts';
import { clamp } from '../core/MathUtils';

export const REF_HEIGHT = GAMEPLAY.player.height;

/** Normalised band boundaries, as a fraction of standing height. */
const HEAD_TOP = 1.04;
const HEAD_CENTRE = 0.958;
const HEAD_BOTTOM = 0.9;
const NECK_BOTTOM = 0.845;
const CHEST_BOTTOM = 0.655;
const STOMACH_BOTTOM = 0.494;
const FOOT_TOP = 0.075;
/** Extent of the torso-and-limbs capsule. */
const BODY_TOP = 0.9;
const BODY_BOTTOM = 0.04;

/** Radii at reference height, in metres. */
const HEAD_RADIUS = 0.148;
const BODY_RADIUS = 0.32;
/** Inside this radius a torso-height hit is a torso hit rather than an arm. */
const CORE_RADIUS = 0.215;

/** Vertical probe budget when working out where an entity's feet are. */
const FEET_PROBE_NEAR = 0.55;
const FEET_PROBE_FAR = 2.4;
const FEET_PROBE_GROUPS = COLLISION_GROUP.STATIC | COLLISION_GROUP.DYNAMIC;
/** Seconds before an inconclusive calibration is retried. */
const RECALIBRATE_AFTER = 3;

export interface HitboxProfile {
  /** Standing height in metres. */
  height: number;
  /**
   * Metres between `Damageable.getPosition()` and the soles. Zero for the usual
   * feet-anchored convention, ~1.64 for an eye-anchored one.
   */
  feetOffset: number;
  calibratedAt: number;
  calibrated: boolean;
}

export interface HitboxHit {
  /** Distance along the (normalised) ray direction. */
  t: number;
  part: BodyPart;
  /** Distance from the spine measured across the line of flight. */
  offAxis: number;
  normalX: number;
  normalY: number;
  normalZ: number;
}

export const createHitboxProfile = (): HitboxProfile => ({
  height: REF_HEIGHT,
  feetOffset: 0,
  calibratedAt: -1e9,
  calibrated: false,
});

export const createHitboxHit = (): HitboxHit => ({
  t: 0,
  part: 'chest',
  offAxis: 0,
  normalX: 0,
  normalY: 1,
  normalZ: 0,
});

/** Radial extent scales sub-linearly with height: a crouched body is stockier. */
const radiusScale = (height: number): number => 0.62 + 0.38 * (height / REF_HEIGHT);

/** Widest horizontal reach of the model. */
export const hitboxRadius = (profile: HitboxProfile): number =>
  BODY_RADIUS * radiusScale(profile.height);

/** Vertical extent above the feet. */
export const hitboxTop = (profile: HitboxProfile): number => profile.height * HEAD_TOP;

/** Reference point closest-approach distances are measured to. */
export const CENTRE_OF_MASS = 0.55;

/**
 * Radius of a sphere about the centre of mass that contains the whole model.
 *
 * This is the only correct bound for rejecting a ray by its closest approach: the
 * approach distance is measured to a single point at 55% of standing height, so a
 * head shot on a standing man passes three quarters of a metre from it. Comparing
 * that against the *horizontal* body radius throws away every hit that is not
 * level with the sternum.
 */
export function hitboxBound(profile: HitboxProfile): number {
  const height = profile.height;
  const scale = radiusScale(height);
  const below = height * (CENTRE_OF_MASS - BODY_BOTTOM);
  const above = height * (HEAD_CENTRE - CENTRE_OF_MASS) + HEAD_RADIUS * scale;
  return Math.hypot(Math.max(below, above), BODY_RADIUS * scale);
}

/**
 * Works out whether `getPosition()` reports the feet or something higher up.
 *
 * One downward ray answers it: a feet position stands on the floor, an eye or
 * centre position is a metre and a half above it. Contracts do not pin this down
 * and the two conventions are both in use, so it is measured rather than assumed.
 */
export function calibrateProfile(
  profile: HitboxProfile,
  entity: Damageable,
  physics: PhysicsSystem | null,
  now: number,
  scratch: THREE.Vector3,
): void {
  if (profile.calibrated && now - profile.calibratedAt < RECALIBRATE_AFTER) return;
  profile.calibratedAt = now;
  if (!physics || !physics.ready) return;

  entity.getPosition(scratch);
  scratch.y += 0.1;
  const near = physics.raycast(scratch, DOWN, {
    maxDistance: FEET_PROBE_NEAR,
    groups: FEET_PROBE_GROUPS,
    exclude: EXCLUDE_NONE,
  });
  if (near) {
    profile.feetOffset = 0;
    profile.calibrated = true;
    return;
  }

  entity.getPosition(scratch);
  const far = physics.raycast(scratch, DOWN, {
    maxDistance: FEET_PROBE_FAR,
    groups: FEET_PROBE_GROUPS,
    exclude: EXCLUDE_NONE,
  });
  if (!far) {
    // Airborne, or standing on something physics does not know about. Assume the
    // feet convention and try again shortly.
    profile.feetOffset = 0;
    return;
  }
  profile.feetOffset = clamp(far.distance, 0, REF_HEIGHT * 1.1);
  profile.calibrated = true;
}

/** World-space height of the soles. */
export const feetY = (profile: HitboxProfile, positionY: number): number =>
  positionY - profile.feetOffset;

/**
 * Body part for an impact, from its height above the feet and how far off the
 * spine the round passed.
 *
 * `offAxis` is the distance from the spine measured across the line of flight,
 * not from the impact point to the spine: a round entering the front of the chest
 * lands on the surface of the torso capsule and so is a full body radius from the
 * spine, while having passed dead through the middle. Pass a negative value when
 * the flight direction is unknown, which biases the answer towards the torso.
 */
export function partFromHeight(
  profile: HitboxProfile,
  heightAboveFeet: number,
  offAxis: number,
): BodyPart {
  const u = heightAboveFeet / Math.max(0.4, profile.height);
  if (u >= HEAD_BOTTOM) return 'head';
  if (u >= NECK_BOTTOM) return 'neck';
  const core = CORE_RADIUS * radiusScale(profile.height);
  const outboard = offAxis > core;
  if (u >= CHEST_BOTTOM) return outboard ? 'arm' : 'chest';
  if (u >= STOMACH_BOTTOM) return outboard ? 'arm' : 'stomach';
  if (u >= FOOT_TOP) return 'leg';
  return 'foot';
}

/**
 * Body part for a world-space impact point. The vertical reference is the
 * calibrated sole height, so this stays correct for entities on stairs, roofs
 * and ladders as long as their reported position tracks them.
 *
 * `direction` is the travel direction of whatever arrived. Supplying it is what
 * separates a chest shot from an arm shot; without it every torso-height hit on
 * the surface of the body reads as a limb.
 */
export function partFromPoint(
  profile: HitboxProfile,
  entityPosition: THREE.Vector3,
  point: THREE.Vector3,
  direction?: THREE.Vector3 | null,
): BodyPart {
  const base = feetY(profile, entityPosition.y);
  const dx = point.x - entityPosition.x;
  const dz = point.z - entityPosition.z;
  let offAxis = -1;
  if (direction) {
    const horizontal = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
    offAxis =
      horizontal > 1e-4
        ? Math.abs((dx * direction.z - dz * direction.x) / horizontal)
        : Math.sqrt(dx * dx + dz * dz);
  }
  return partFromHeight(profile, point.y - base, offAxis);
}

/**
 * Nearest intersection of a ray with the hitbox model.
 *
 * `direction` must be unit length. Returns false when the ray misses or the hit
 * lies beyond `maxT`.
 */
export function rayHitbox(
  profile: HitboxProfile,
  entityPosition: THREE.Vector3,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  maxT: number,
  out: HitboxHit,
): boolean {
  const scale = radiusScale(profile.height);
  const bodyRadius = BODY_RADIUS * scale;
  const base = feetY(profile, entityPosition.y);
  const cx = entityPosition.x;
  const cz = entityPosition.z;

  const bodyBottom = base + profile.height * BODY_BOTTOM + bodyRadius;
  const bodyTop = base + profile.height * BODY_TOP - bodyRadius;
  let t = rayVerticalCapsule(
    origin,
    direction,
    cx,
    cz,
    Math.min(bodyBottom, bodyTop),
    Math.max(bodyBottom, bodyTop),
    bodyRadius,
    maxT,
  );

  const headY = base + profile.height * HEAD_CENTRE;
  const headRadius = HEAD_RADIUS * scale;
  const th = raySphere(origin, direction, cx, headY, cz, headRadius, maxT);
  const headWins = th >= 0 && (t < 0 || th < t);
  if (headWins) t = th;
  if (t < 0) return false;

  const px = origin.x + direction.x * t;
  const py = origin.y + direction.y * t;
  const pz = origin.z + direction.z * t;
  const dx = px - cx;
  const dz = pz - cz;
  const radial = Math.sqrt(dx * dx + dz * dz);

  // How far off the spine the round actually flew, which is what separates a
  // chest hit from an arm hit. The impact point is always a full body radius from
  // the spine on a frontal shot, so it cannot answer this on its own.
  const mx0 = origin.x - cx;
  const mz0 = origin.z - cz;
  const flat = direction.x * direction.x + direction.z * direction.z;
  const along = mx0 * direction.x + mz0 * direction.z;
  const offAxis = Math.sqrt(
    Math.max(0, mx0 * mx0 + mz0 * mz0 - (flat > 1e-9 ? (along * along) / flat : 0)),
  );

  out.t = t;
  out.offAxis = offAxis;
  if (headWins) {
    const nx = dx;
    const ny = py - headY;
    const nz = dz;
    const len = Math.max(1e-5, Math.sqrt(nx * nx + ny * ny + nz * nz));
    out.normalX = nx / len;
    out.normalY = ny / len;
    out.normalZ = nz / len;
    out.part = 'head';
    return true;
  }

  // Radial normal off the spine, which is what a blood spray wants to face.
  if (radial > 1e-4) {
    out.normalX = dx / radial;
    out.normalY = 0;
    out.normalZ = dz / radial;
  } else {
    out.normalX = -direction.x;
    out.normalY = -direction.y;
    out.normalZ = -direction.z;
  }
  out.part = partFromHeight(profile, py - base, offAxis);
  return true;
}

/**
 * Occlusion sample points, spread over the body and staggered across `perp` so a
 * wall edge produces a partial reading rather than all-or-nothing. Fills
 * `SAMPLE_COUNT * 3` floats and returns the number of points written.
 */
export const SAMPLE_COUNT = 6;
const SAMPLE_U = [0.055, 0.3, 0.53, 0.72, 0.88, 0.96];
const SAMPLE_LATERAL = [0, 0.16, -0.2, 0.2, -0.14, 0];

export function fillOcclusionSamples(
  profile: HitboxProfile,
  entityPosition: THREE.Vector3,
  perpX: number,
  perpZ: number,
  out: Float32Array,
): number {
  const base = feetY(profile, entityPosition.y);
  const scale = radiusScale(profile.height);
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const lateral = SAMPLE_LATERAL[i] * scale;
    const o = i * 3;
    out[o] = entityPosition.x + perpX * lateral;
    out[o + 1] = base + profile.height * SAMPLE_U[i];
    out[o + 2] = entityPosition.z + perpZ * lateral;
  }
  return SAMPLE_COUNT;
}

/** Distance from `point` to the entity's body axis, not to its origin. */
export function distanceToBody(
  profile: HitboxProfile,
  entityPosition: THREE.Vector3,
  point: THREE.Vector3,
): number {
  const base = feetY(profile, entityPosition.y);
  const top = base + profile.height * BODY_TOP;
  const y = clamp(point.y, base, top);
  const dx = point.x - entityPosition.x;
  const dy = point.y - y;
  const dz = point.z - entityPosition.z;
  return Math.max(0, Math.sqrt(dx * dx + dy * dy + dz * dz) - hitboxRadius(profile) * 0.5);
}

// ---------------------------------------------------------------------------
// Analytic primitives. Direction is assumed unit length throughout.
// ---------------------------------------------------------------------------

function raySphere(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  sx: number,
  sy: number,
  sz: number,
  radius: number,
  maxT: number,
): number {
  const mx = origin.x - sx;
  const my = origin.y - sy;
  const mz = origin.z - sz;
  const b = mx * direction.x + my * direction.y + mz * direction.z;
  const c = mx * mx + my * my + mz * mz - radius * radius;
  if (c > 0 && b > 0) return -1;
  const disc = b * b - c;
  if (disc < 0) return -1;
  const root = Math.sqrt(disc);
  let t = -b - root;
  if (t < 0) t = -b + root;
  if (t < 0 || t > maxT) return -1;
  return t;
}

/** Capsule whose axis runs from (cx, y0, cz) to (cx, y1, cz). */
function rayVerticalCapsule(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  cx: number,
  cz: number,
  y0: number,
  y1: number,
  radius: number,
  maxT: number,
): number {
  const mx = origin.x - cx;
  const mz = origin.z - cz;
  const a = direction.x * direction.x + direction.z * direction.z;
  const b = mx * direction.x + mz * direction.z;
  const c = mx * mx + mz * mz - radius * radius;

  let t = -1;
  if (a > 1e-9) {
    const disc = b * b - a * c;
    if (disc >= 0) {
      const root = Math.sqrt(disc);
      let candidate = (-b - root) / a;
      if (candidate < 0) candidate = (-b + root) / a;
      if (candidate >= 0 && candidate <= maxT) {
        const y = origin.y + direction.y * candidate;
        if (y >= y0 && y <= y1) t = candidate;
      }
    }
  } else if (c <= 0) {
    // Fired straight down (or up) the axis: the caps below handle the ends, the
    // side is only reachable if the origin already sits inside the cylinder.
    if (direction.y > 1e-6 && origin.y < y0) t = (y0 - origin.y) / direction.y;
    else if (direction.y < -1e-6 && origin.y > y1) t = (y1 - origin.y) / direction.y;
    else if (origin.y >= y0 && origin.y <= y1) t = 0;
    if (t > maxT) t = -1;
  }

  const tTop = raySphere(origin, direction, cx, y1, cz, radius, maxT);
  if (tTop >= 0 && (t < 0 || tTop < t)) t = tTop;
  const tBottom = raySphere(origin, direction, cx, y0, cz, radius, maxT);
  if (tBottom >= 0 && (t < 0 || tBottom < t)) t = tBottom;
  return t;
}

const DOWN = /* @__PURE__ */ new THREE.Vector3(0, -1, 0);
const EXCLUDE_NONE: readonly unknown[] = [];
