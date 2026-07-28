/**
 * Helpers shared by the behaviour states.
 *
 * Everything here is either a question several states need to ask ("do I know
 * where the target is?", "is this a good moment to reload?") or an action several
 * states need to take ("get behind something"). Keeping them in one place is what
 * stops the same decision being made two slightly different ways in two states,
 * which is how AI ends up with a personality per state instead of per agent.
 */
import * as THREE from 'three';
import type { Blackboard } from '../Blackboard';
import { pickCover, type CoverRequest } from '../CoverPicker';
import type { Enemy } from '../Enemy';
import { yawTowards } from '../Enemy';
import { COVER, FIGHT, SIGHT } from '../Tuning';

/** Seconds without contact after which a fight becomes a search. */
export const CONTACT_LOST = 5.5;

const THREAT = /* @__PURE__ */ new THREE.Vector3();
const AIM = /* @__PURE__ */ new THREE.Vector3();
const AWAY = /* @__PURE__ */ new THREE.Vector3();

/** Feet position of whatever the agent is fighting, known or guessed. */
export function threatPoint(self: Enemy, bb: Blackboard, out: THREE.Vector3): THREE.Vector3 {
  if (self.perception.visible && bb.target.alive) return out.copy(bb.target.feet);
  return self.perception.bestGuess(bb, out);
}

/** Where the agent would have to see to have a shot: the threat's upper chest. */
export function threatAim(self: Enemy, bb: Blackboard, out: THREE.Vector3): THREE.Vector3 {
  threatPoint(self, bb, out);
  out.y += Math.max(0.9, bb.target.height) * 0.72;
  return out;
}

/** True while the target is positively identified and worth shooting at. */
export function engaging(self: Enemy, bb: Blackboard): boolean {
  return bb.target.alive && self.perception.engaged;
}

/** True when the agent has somewhere to look even if it cannot see anything. */
export function hasLead(self: Enemy): boolean {
  return self.perception.everSeen || self.perception.investigate !== null;
}

/**
 * Where to go when the target stops existing — killed, or despawned on a level
 * change.
 *
 * Never straight to patrol from a firefight: a man who was shooting a second ago
 * and is now strolling a route with his weapon down is the single most obvious
 * seam in a shooter's AI. Sweep the ground you were fighting over first, and let
 * `search` time itself out into patrol the way it does for a target that merely
 * got away.
 */
export function targetGone(self: Enemy): 'search' | 'patrol' {
  return self.perception.everSeen ? 'search' : 'patrol';
}

/**
 * Whether now is the moment to change magazines.
 *
 * Empty is not a choice. Otherwise an agent tops up when it is low and something
 * is covering it — either a squadmate shooting, or its own cover, or simply not
 * being looked at.
 */
export function shouldReload(self: Enemy, bb: Blackboard): boolean {
  const combatant = self.combatant;
  if (combatant.reloading) return false;
  if (combatant.empty) return true;
  if (!combatant.wantsReload) return false;
  if (!self.perception.visible) return true;
  if (self.inCover && !self.peeking) return true;
  const squad = self.squad;
  return !!squad && squad.coveringFire(bb, self) > 0;
}

/** Points the body and the weapon at the fight. */
export function faceThreat(self: Enemy, bb: Blackboard): void {
  self.lookAt(threatAim(self, bb, AIM));
}

/**
 * Finds and claims a cover slot. Returns false when there is nothing worth
 * running to, which is the caller's cue to fight from where it stands.
 */
export function takeCover(
  self: Enemy,
  bb: Blackboard,
  overrides?: Partial<Omit<CoverRequest, 'threat' | 'aim'>>,
): boolean {
  if (bb.cover.count === 0) return false;
  threatPoint(self, bb, THREAT);
  threatAim(self, bb, AIM);
  // A garrisoned soldier uses the cover on his own position, not the best slot
  // within twenty metres, which would take him off it.
  const reach = self.anchored
    ? Math.min(overrides?.radius ?? COVER.searchRadius, self.anchorRadius)
    : (overrides?.radius ?? COVER.searchRadius);
  const request: CoverRequest = {
    threat: THREAT,
    aim: AIM,
    radius: reach,
    minThreatDistance: overrides?.minThreatDistance ?? COVER.minThreatDistance,
    lateralBias: overrides?.lateralBias ?? 0,
    allowLow: overrides?.allowLow ?? true,
    allowStanding: overrides?.allowStanding ?? true,
  };
  if (!pickCover(bb, self.id, self.feet, request, self.cover)) return false;
  if (self.anchored && self.cover.position.distanceTo(self.anchor) > self.anchorRadius) return false;
  return self.claimCover(bb);
}

/**
 * A point to fall back to when the fight is too close and there is no cover.
 *
 * Straight back from the threat, snapped onto the navigation raster so the agent
 * does not try to reverse into a wall.
 */
export function fallbackPoint(
  self: Enemy,
  bb: Blackboard,
  distance: number,
  out: THREE.Vector3,
): boolean {
  threatPoint(self, bb, THREAT);
  AWAY.set(self.feet.x - THREAT.x, 0, self.feet.z - THREAT.z);
  if (AWAY.lengthSq() < 1e-4) AWAY.set(Math.sin(self.bodyYaw), 0, Math.cos(self.bodyYaw));
  AWAY.normalize();
  return snapToNav(bb, self.feet.x + AWAY.x * distance, self.feet.z + AWAY.z * distance, self.feet.y, out);
}

/**
 * A lateral step, used to keep a firefight moving.
 *
 * Two metres or so to one side of the current position, perpendicular to the
 * threat, so the agent is strafing across the enemy's aim rather than towards it.
 */
export function sidestepPoint(
  self: Enemy,
  bb: Blackboard,
  sign: number,
  distance: number,
  out: THREE.Vector3,
): boolean {
  threatPoint(self, bb, THREAT);
  AWAY.set(self.feet.x - THREAT.x, 0, self.feet.z - THREAT.z);
  if (AWAY.lengthSq() < 1e-4) return false;
  AWAY.normalize();
  const x = self.feet.x - AWAY.z * sign * distance;
  const z = self.feet.z + AWAY.x * sign * distance;
  return snapToNav(bb, x, z, self.feet.y, out);
}

/** Writes the nearest walkable surface at (x, z) into `out`, or returns false. */
export function snapToNav(
  bb: Blackboard,
  x: number,
  z: number,
  y: number,
  out: THREE.Vector3,
): boolean {
  const height = bb.surfaceAt(x, z, y);
  if (height === null || Math.abs(height - y) > 2.2) return false;
  out.set(x, height, z);
  return true;
}

/** Distance band the archetype wants to fight at, tightened while suppressed. */
export function preferredRange(self: Enemy): number {
  return self.archetype.preferredRange * (self.suppression > 1 ? 1.25 : 1);
}

/** True when the agent has lost the fight and should start looking again. */
export function contactStale(self: Enemy, bb: Blackboard): boolean {
  return !self.perception.visible && self.perception.timeSinceSeen(bb.now) > CONTACT_LOST;
}

/** Awareness has decayed far enough that the agent gives up entirely. */
export function forgotten(self: Enemy): boolean {
  return self.perception.awareness < SIGHT.alertThreshold * 0.6;
}

/** Yaw offset used by the idle and search sweeps. */
export function sweepYaw(self: Enemy, centre: THREE.Vector3, offset: number): number {
  return yawTowards(self.feet, centre) + offset;
}

/** True when the agent is willing to leave cover to close the distance. */
export function wantsToPush(self: Enemy, bb: Blackboard): boolean {
  const archetype = self.archetype;
  if (self.suppression > FIGHT.suppressionPinned) return false;
  if (archetype.aggression >= 0.85) return true;
  const squad = self.squad;
  // Bounding overwatch: nobody advances unless somebody else is shooting.
  return !!squad && squad.coveringFire(bb, self) > 0 && archetype.aggression > 0.3;
}
