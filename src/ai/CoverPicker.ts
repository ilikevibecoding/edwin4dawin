/**
 * Choosing a cover slot.
 *
 * The world hands over 1821 slots with a normal and up to two peek offsets. Four
 * things decide which one an agent runs to, in the order they are cheap:
 *
 *  1. **Close.** Distance, in metres, straight off the spatial hash.
 *  2. **Protects.** The dot product of the slot normal against the direction of
 *     the threat. `CoverIndex` rejects anything below `COVER.minProtection`, so
 *     everything that survives is at least side-on to the incoming fire.
 *  3. **Shoots back.** A slot with no firing angle is a hiding place, not a
 *     fighting position. This is the expensive test — a line of sight from each
 *     peek offset to the target — so it only runs on the handful of candidates
 *     that survived the arithmetic.
 *  4. **Unclaimed.** Enforced by the claim registry, because two men diving for
 *     the same doorway is the most obvious possible sign of four independent
 *     agents rather than a squad.
 *
 * A slot that is genuinely occluded from the target scores higher than one that
 * merely faces the right way, which is what stops agents "taking cover" behind
 * a knee-high bollard in an open street.
 */
import * as THREE from 'three';
import type { Blackboard } from './Blackboard';
import type { CoverCandidate } from './CoverIndex';
import { BODY, COVER } from './Tuning';

export interface CoverChoice {
  /** Index into the world's cover point array; also the claim key. */
  index: number;
  /** Where the agent stands. */
  readonly position: THREE.Vector3;
  /** Direction the slot protects from. */
  readonly normal: THREE.Vector3;
  /** Where the agent leans out to shoot from. */
  readonly peek: THREE.Vector3;
  low: boolean;
  hasPeek: boolean;
  /** True when the slot itself is occluded from the threat. */
  occluded: boolean;
  /** True when there is a firing line from the peek position. */
  canFire: boolean;
  score: number;
}

export interface CoverRequest {
  /** Where the threat is; cover is chosen against this, not against the agent. */
  threat: THREE.Vector3;
  /** Point the agent is looking to shoot at, usually the threat's eyes. */
  aim: THREE.Vector3;
  radius?: number;
  minThreatDistance?: number;
  /** -1..1 pushes the choice to one side of the threat axis; used when flanking. */
  lateralBias?: number;
  allowLow?: boolean;
  allowStanding?: boolean;
}

export function makeCoverChoice(): CoverChoice {
  return {
    index: -1,
    position: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    peek: new THREE.Vector3(),
    low: false,
    hasPeek: false,
    occluded: false,
    canFire: false,
    score: -Infinity,
  };
}

const candidates: CoverCandidate[] = [];
const slotEye = /* @__PURE__ */ new THREE.Vector3();
const peekEye = /* @__PURE__ */ new THREE.Vector3();

/**
 * Fills `out` with the best slot found, or returns false.
 *
 * Does not claim anything: the caller decides whether it is committing, because
 * an agent that claims on every evaluation locks slots it never runs to.
 */
export function pickCover(
  bb: Blackboard,
  ownerId: number,
  from: THREE.Vector3,
  request: CoverRequest,
  out: CoverChoice,
): boolean {
  const found = bb.cover.query(from, request.threat, ownerId, bb.now, candidates, {
    radius: request.radius,
    minThreatDistance: request.minThreatDistance,
    lateralBias: request.lateralBias,
    allowLow: request.allowLow,
    allowStanding: request.allowStanding,
    variety: ownerId * 7919,
  });
  if (found === 0) return false;

  let best = -1;
  let bestScore = -Infinity;
  let bestOccluded = false;
  let bestCanFire = false;
  let bestPeekLeft = false;

  const tests = Math.min(found, COVER.losTests);
  for (let i = 0; i < found; i++) {
    const candidate = candidates[i];
    const point = candidate.point;
    let score = candidate.score;
    let occluded = false;
    let canFire = false;
    let peekLeft = false;

    if (i < tests) {
      const eyeHeight = point.low ? BODY.crouchEyeHeight : BODY.eyeHeight;
      slotEye.set(point.position.x, point.position.y + eyeHeight, point.position.z);
      // Cover that does not actually break the line is not cover. Low slots are
      // judged from the crouched eye height, which is the point of them.
      occluded = !bb.lineOfSight(slotEye, request.aim);
      if (occluded) score += COVER.wProtection * 0.6;

      // A firing line from either shoulder. Left is tried first only so the
      // choice is deterministic; the peek side is re-picked while fighting.
      for (let side = 0; side < 2; side++) {
        const peek = side === 0 ? point.peekLeft : point.peekRight;
        if (!peek) continue;
        peekEye.set(peek.x, peek.y + BODY.eyeHeight, peek.z);
        if (!bb.lineOfSight(peekEye, request.aim)) continue;
        canFire = true;
        peekLeft = side === 0;
        break;
      }
      if (canFire) score += COVER.wFiring;
      else if (!occluded) score -= COVER.wFiring * 0.5;
    }

    if (score > bestScore) {
      bestScore = score;
      best = i;
      bestOccluded = occluded;
      bestCanFire = canFire;
      bestPeekLeft = peekLeft;
    }
  }

  if (best < 0) return false;
  const chosen = candidates[best];
  const point = chosen.point;
  out.index = chosen.index;
  out.position.copy(point.position);
  out.normal.copy(point.normal);
  out.low = point.low;
  out.occluded = bestOccluded;
  out.canFire = bestCanFire;
  out.score = bestScore;

  const peek = bestCanFire
    ? bestPeekLeft
      ? point.peekLeft
      : point.peekRight
    : (point.peekLeft ?? point.peekRight);
  if (peek) {
    out.peek.copy(peek);
    out.hasPeek = true;
  } else {
    // No authored offset: step out along the slot's own tangent, which is still
    // better than standing up into the fire.
    out.peek.set(
      point.position.x - point.normal.z * 0.55,
      point.position.y,
      point.position.z + point.normal.x * 0.55,
    );
    out.hasPeek = false;
  }
  return true;
}

/**
 * Whether a slot still protects against a threat that has moved.
 *
 * Cover is directional, so a target that flanks it turns it into an obstacle the
 * agent is standing in front of. Checked on a slow timer while an agent holds a
 * position; failing it is what makes a squad give ground.
 */
export function coverStillValid(
  choice: CoverChoice,
  threat: THREE.Vector3,
  minimum = COVER.minProtection * 0.6,
): boolean {
  if (choice.index < 0) return false;
  const tx = threat.x - choice.position.x;
  const tz = threat.z - choice.position.z;
  const length = Math.hypot(tx, tz);
  if (length < 1e-3) return false;
  return (tx * choice.normal.x + tz * choice.normal.z) / length >= minimum;
}
