/**
 * Patrol. Walking a route between named areas of the map, with pauses.
 *
 * The route is not authored. The world names 38 areas, and a patrolling soldier
 * picks one in the 8 to 75 metre band, walks to it, stands and looks around for a
 * few seconds, then picks another. That produces traffic across the whole map
 * without anybody having to lay down waypoints, and because the pauses are where
 * the head sweep happens, a patrol reads as a man checking his surroundings
 * rather than a man on rails.
 */
import * as THREE from 'three';
import { TAU } from '../../core/MathUtils';
import type { AIStateHandler } from '../Behavior';
import type { Blackboard } from '../Blackboard';
import type { Enemy } from '../Enemy';
import { engaging, snapToNav } from './Common';

/** Picks somewhere to walk. Returns false when nowhere sensible was found. */
function pickGoal(self: Enemy, bb: Blackboard, out: THREE.Vector3): boolean {
  const landmarks = bb.landmarks;
  if (landmarks.length > 0) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const index = bb.rng.int(0, landmarks.length - 1);
      // `phase` remembers the last landmark used, so a patrol does not shuttle
      // back and forth between the same two doorways.
      if (index + 1 === self.behavior.phase) continue;
      const point = landmarks[index];
      const distance = self.feet.distanceTo(point);
      if (distance < 8 || distance > 75) continue;
      self.behavior.phase = index + 1;
      if (snapToNav(bb, point.x, point.z, point.y, out)) return true;
      out.copy(point);
      return true;
    }
  }
  // No landmarks yet, or none in range: wander.
  const angle = bb.rng.range(0, TAU);
  const radius = bb.rng.range(7, 18);
  return snapToNav(
    bb,
    self.feet.x + Math.cos(angle) * radius,
    self.feet.z + Math.sin(angle) * radius,
    self.feet.y,
    out,
  );
}

export const PatrolState: AIStateHandler = {
  id: 'patrol',

  enter(self, bb) {
    self.wantWeaponUp = 0.15;
    self.wantCrouch = false;
    self.allowFire = false;
    self.behavior.flag = pickGoal(self, bb, self.behavior.point);
    self.behavior.timer = 0;
    if (self.behavior.flag) {
      self.moveTo(bb, self.behavior.point, 'walk', 0.4);
      self.faceTravel();
    }
  },

  update(self, bb, dt) {
    if (engaging(self, bb)) return 'combat';
    if (self.perception.alerted) return 'alert';

    const behavior = self.behavior;
    if (behavior.timer > 0) {
      // Standing at the end of a leg, having a look around.
      behavior.timer -= dt;
      self.faceIdle();
      self.stopMoving();
      if (behavior.timer <= 0) {
        behavior.flag = pickGoal(self, bb, behavior.point);
        if (behavior.flag) self.faceTravel();
      }
      return null;
    }

    if (!behavior.flag) {
      behavior.flag = pickGoal(self, bb, behavior.point);
      if (!behavior.flag) return 'idle';
      return null;
    }

    if (self.near(behavior.point, 1.4) || self.arrived || self.pathStuck) {
      behavior.timer = bb.rng.range(2, 5.5);
      self.homeYaw = self.bodyYaw + bb.rng.range(-0.8, 0.8);
      self.stopMoving();
      return null;
    }

    self.moveTo(bb, behavior.point, 'walk', 0.4);
    self.faceTravel();
    return null;
  },
};
