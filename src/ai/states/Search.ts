/**
 * Search. The target was here a moment ago and now is not.
 *
 * Two things make a search feel like being hunted rather than being looked for.
 *
 * The first is that the sectors are assigned at squad level. `Squad.searchAnchor`
 * hands each member a different bearing off the last known position, so four men
 * fan out across a building instead of four men following each other through the
 * same door.
 *
 * The second is that the search expands. The first anchor is close to where the
 * target was last seen, and each subsequent one is further out, so an agent
 * sweeps outward through the space you could plausibly have reached rather than
 * standing on the spot you left.
 */
import * as THREE from 'three';
import { TAU } from '../../core/MathUtils';
import type { AIStateHandler } from '../Behavior';
import type { Blackboard } from '../Blackboard';
import type { Enemy } from '../Enemy';
import { VOICE } from '../Tuning';
import { engaging, snapToNav } from './Common';

const CENTRE = /* @__PURE__ */ new THREE.Vector3();
const ANCHOR = /* @__PURE__ */ new THREE.Vector3();

/** Seconds of fruitless searching before the squad gives up and goes back to work. */
const GIVE_UP = 21;

function nextAnchor(self: Enemy, bb: Blackboard, out: THREE.Vector3): boolean {
  self.perception.bestGuess(bb, CENTRE);
  const step = self.behavior.phase;
  const radius = 3.5 + step * 5.5;
  const squad = self.squad;
  if (squad) squad.searchAnchor(self, CENTRE, radius, ANCHOR);
  else {
    const angle = bb.rng.range(0, TAU);
    ANCHOR.set(CENTRE.x + Math.cos(angle) * radius, CENTRE.y, CENTRE.z + Math.sin(angle) * radius);
  }
  if (snapToNav(bb, ANCHOR.x, ANCHOR.z, CENTRE.y, out)) return true;
  // The sector is off-mesh; take the centre instead, which always was walkable.
  return snapToNav(bb, CENTRE.x, CENTRE.z, CENTRE.y, out);
}

export const SearchState: AIStateHandler = {
  id: 'search',

  enter(self, bb) {
    self.wantWeaponUp = 1;
    self.wantCrouch = false;
    self.allowFire = true;
    self.behavior.phase = 0;
    self.behavior.flag = nextAnchor(self, bb, self.behavior.point);
    self.behavior.timer = 0;
  },

  update(self, bb, dt) {
    if (engaging(self, bb)) return 'combat';

    const behavior = self.behavior;
    if (behavior.timeInState > GIVE_UP) {
      self.say(bb, VOICE.lostHim, 0.9);
      return 'patrol';
    }

    // Standing at an anchor, checking the corners.
    if (behavior.timer > 0) {
      behavior.timer -= dt;
      self.stopMoving();
      self.faceIdle();
      if (behavior.timer <= 0) {
        behavior.phase++;
        behavior.flag = nextAnchor(self, bb, behavior.point);
      }
      return null;
    }

    if (!behavior.flag) {
      behavior.phase++;
      behavior.flag = nextAnchor(self, bb, behavior.point);
      if (!behavior.flag) return 'patrol';
      return null;
    }

    if (self.near(behavior.point, 1.6) || self.arrived || self.pathStuck) {
      behavior.timer = bb.rng.range(1.1, 2.6);
      self.homeYaw = self.bodyYaw + bb.rng.range(-1.1, 1.1);
      self.stopMoving();
      return null;
    }

    self.moveTo(bb, behavior.point, 'combat', 0.8);
    self.faceTravel();
    return null;
  },
};
