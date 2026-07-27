/**
 * Flank. Going the long way round while the rest of the squad holds the target's
 * attention.
 *
 * The decision to flank is not made here — `Squad.assignRoles` grants exactly one
 * flanker token, and only once the target has been pinned for a couple of seconds,
 * because a flank against a target who is still manoeuvring is just an agent
 * running away. This state is the execution: pick a position off the axis the
 * squad is shooting down, get there at a run, and rejoin the fight from there.
 */
import * as THREE from 'three';
import type { AIStateHandler } from '../Behavior';
import type { Blackboard } from '../Blackboard';
import type { Enemy } from '../Enemy';
import { VOICE } from '../Tuning';
import {
  contactStale,
  preferredRange,
  shouldReload,
  snapToNav,
  takeCover,
  targetGone,
  threatPoint,
} from './Common';

const THREAT = /* @__PURE__ */ new THREE.Vector3();

/** Seconds before a flank is abandoned as a bad idea. */
const TIME_LIMIT = 11;

/**
 * A position on an arc around the target, roughly 70 degrees off the direction the
 * agent is currently approaching from.
 */
function circlePoint(self: Enemy, bb: Blackboard, side: number, out: THREE.Vector3): boolean {
  threatPoint(self, bb, THREAT);
  let dx = self.feet.x - THREAT.x;
  let dz = self.feet.z - THREAT.z;
  const length = Math.hypot(dx, dz);
  if (length < 1e-3) return false;
  dx /= length;
  dz /= length;
  const angle = side * bb.rng.range(1.0, 1.5);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const radius = Math.max(7, Math.min(length, preferredRange(self)));
  const rx = dx * cos - dz * sin;
  const rz = dx * sin + dz * cos;
  return snapToNav(bb, THREAT.x + rx * radius, THREAT.z + rz * radius, self.feet.y, out);
}

export const FlankState: AIStateHandler = {
  id: 'flank',

  enter(self, bb) {
    self.wantWeaponUp = 1;
    self.wantCrouch = false;
    self.allowFire = false;
    self.releaseCover(bb);
    self.say(bb, VOICE.flanking, 1);

    const side = (self.id & 1) === 0 ? 1 : -1;
    // A cover slot off to one side is the ideal end point; an arc position will do.
    if (takeCover(self, bb, { radius: 30, minThreatDistance: 8, lateralBias: side * 1.3 })) {
      self.behavior.point.copy(self.cover.position);
      self.behavior.flag = true;
    } else if (circlePoint(self, bb, side, self.behavior.point)) {
      self.behavior.flag = true;
    } else {
      self.behavior.flag = false;
    }
  },

  update(self, bb) {
    if (!bb.target.alive) return targetGone(self);
    if (!self.behavior.flag) return 'combat';
    if (self.role !== 'flanker') return 'combat';
    if (shouldReload(self, bb)) return 'reload';
    if (contactStale(self, bb) && self.behavior.timeInState > 6) return 'search';

    if (
      self.near(self.behavior.point, 1.3) ||
      self.behavior.timeInState > TIME_LIMIT ||
      self.pathStuck
    ) {
      return self.hasCover ? 'cover' : 'combat';
    }

    self.moveTo(bb, self.behavior.point, 'run', 1.6);
    // Shooting on the move is allowed but deliberately poor; the point of a flank
    // is the angle, not the rounds spent getting there.
    const shooting = self.perception.visible && self.perception.distance < self.archetype.maxRange;
    self.allowFire = shooting;
    if (shooting) self.lookAt(bb.target.eye);
    else self.faceTravel();
    return null;
  },

  exit(self, bb) {
    self.squad?.releaseMove(self);
    void bb;
  },
};
