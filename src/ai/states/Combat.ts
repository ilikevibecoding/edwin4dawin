/**
 * Combat. Fighting a target the agent can see, or saw a moment ago.
 *
 * This state is a dispatcher more than a behaviour: within a second or two of
 * contact most agents should be somewhere else — in `cover`, or `flank`, or
 * `reload` — and what is left here is the case where fighting from the current
 * position is the right answer.
 *
 * The rule it exists to enforce is that nobody stands in the open trading shots.
 * Three mechanisms do that: a cover roll per engagement decided by difficulty and
 * archetype, a distance band the agent tries to hold, and a periodic sidestep so
 * that an agent with nowhere to hide is at least a moving target. The cover roll
 * is made once on entry rather than every tick, so one man reads as a soldier who
 * uses cover and another as one who pushes, instead of both flickering between the
 * two.
 */
import * as THREE from 'three';
import type { AIStateHandler } from '../Behavior';
import { FIGHT } from '../Tuning';
import {
  contactStale,
  faceThreat,
  fallbackPoint,
  preferredRange,
  shouldReload,
  sidestepPoint,
  takeCover,
  targetGone,
  threatPoint,
  wantsToPush,
} from './Common';

const GOAL = /* @__PURE__ */ new THREE.Vector3();

export const CombatState: AIStateHandler = {
  id: 'combat',

  enter(self, bb) {
    self.wantWeaponUp = 1;
    self.wantCrouch = false;
    self.allowFire = true;
    self.peeking = false;
    // One roll for the whole engagement: is this man a cover fighter or a pusher?
    self.behavior.flag =
      bb.rng.next() < bb.difficulty.coverDiscipline * (1 - self.archetype.aggression * 0.55);
    self.behavior.timer = bb.rng.range(0.5, 1.8);
    self.behavior.phase = bb.now + bb.rng.range(0.2, 0.9);
  },

  update(self, bb, dt) {
    const perception = self.perception;
    if (!bb.target.alive) return targetGone(self);
    if (shouldReload(self, bb)) return 'reload';
    if (contactStale(self, bb)) return 'search';

    self.wantWeaponUp = 1;
    self.allowFire = true;
    faceThreat(self, bb);

    // A flank is by definition a long move off the current position, so a man
    // holding a post never takes the token.
    if (self.role === 'flanker' && perception.everSeen && self.squad && !self.anchored) {
      return 'flank';
    }
    if (self.combatant.wantsGrenade(bb, self)) self.combatant.beginGrenade(bb, self);

    // Do not hold a grenade and run at the same time: the throw needs a moment.
    if (self.combatant.throwPending) {
      self.stopMoving();
      return null;
    }

    const distance = perception.distance;
    const range = preferredRange(self);

    // Cover, when this man is the sort who uses it and has not got any.
    if (self.behavior.flag && !self.hasCover && bb.now >= self.behavior.phase) {
      self.behavior.phase = bb.now + 1.6;
      if (takeCover(self, bb)) return 'cover';
    }

    // Too far to be useful: close the distance, but only under covering fire
    // unless the archetype is the sort that charges regardless.
    if (distance > range * 1.35 && wantsToPush(self, bb)) {
      const squad = self.squad;
      const cleared =
        !squad || self.archetype.aggression >= 0.85 || squad.requestMove(self, bb);
      if (cleared) {
        threatPoint(self, bb, GOAL);
        // A man holding a post advances within it and no further; if the target
        // is well outside, he fights from where he is rather than abandoning it.
        if (self.clampToAnchor(GOAL, 1.5)) {
          const sprint = distance > range * 2.4 && !perception.visible;
          self.moveTo(bb, GOAL, sprint ? 'run' : 'combat', 1.1);
          if (sprint || (!perception.visible && self.speed > 2)) self.faceTravel();
          return null;
        }
      }
    }

    // Too close for this weapon: give ground rather than be knifed.
    if (distance < range * 0.45 && self.archetype.aggression < 0.6) {
      if (fallbackPoint(self, bb, 5, GOAL)) {
        self.clampToAnchor(GOAL);
        self.moveTo(bb, GOAL, 'combat', 1.2);
        return null;
      }
    }

    // Holding. Never statue-still: step across the enemy's aim every couple of
    // seconds, which is both harder to hit and much more alive to look at.
    self.behavior.timer -= dt;
    if (self.behavior.timer <= 0) {
      self.behavior.timer = bb.rng.range(1.7, 3.4);
      const sign = bb.rng.bool() ? 1 : -1;
      if (
        perception.visible &&
        self.suppression < FIGHT.suppressionPinned &&
        sidestepPoint(self, bb, sign, bb.rng.range(1.5, 3), GOAL)
      ) {
        self.clampToAnchor(GOAL);
        self.behavior.point.copy(GOAL);
      } else {
        self.behavior.point.copy(self.feet);
      }
    }
    self.stepTo(self.behavior.point, 'combat');
    return null;
  },
};
