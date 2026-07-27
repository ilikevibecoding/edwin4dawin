/**
 * Suppressed. Rounds are landing close enough that the man has stopped fighting
 * and started hiding.
 *
 * Suppression is only worth simulating if the player can tell it happened, so
 * five things change at once and all of them are visible from across a street:
 *
 *  - The agent crouches and gets behind something, and it will not advance.
 *  - `Animator.suppression` drives a flinch-and-cower additive layer, so the
 *    posture itself changes even before the position does.
 *  - Fire becomes blind and occasional: short bursts thrown over the top of cover
 *    in bad directions, because `Combatant` multiplies aim error by 5.5 while
 *    suppressed and halves the convergence rate.
 *  - Movement speed drops (`Enemy.updateMovement` scales it by suppression).
 *  - It shouts.
 *
 * The entry threshold is `pinned` (one full unit of suppression, applied by
 * `Behavior` before any state runs) and the exit threshold is a third of that, so
 * there is real hysteresis and an agent does not flicker in and out of cowering
 * while a machinegunner walks rounds past it.
 */
import type { AIStateHandler } from '../Behavior';
import { COVER, FIGHT, VOICE } from '../Tuning';
import {
  contactStale,
  faceThreat,
  fallbackPoint,
  shouldReload,
  takeCover,
  targetGone,
} from './Common';

/** Suppression below this and the agent gets back in the fight. */
const RECOVER = FIGHT.suppressionPinned;

export const SuppressedState: AIStateHandler = {
  id: 'suppressed',

  enter(self, bb) {
    self.wantWeaponUp = 0.7;
    self.wantCrouch = true;
    self.allowFire = false;
    self.peeking = false;
    self.say(bb, VOICE.suppressed, 1);
    // Next window in which a burst gets thrown back.
    self.behavior.timer = bb.rng.range(0.6, 1.5);
    self.behavior.flag = false;

    if (self.hasCover) {
      self.behavior.point.copy(self.cover.position);
      self.behavior.flag = true;
      return;
    }
    // Anything close will do; a suppressed man is not shopping for a firing
    // position, he is looking for a wall.
    if (takeCover(self, bb, { radius: COVER.searchRadius * 0.5, minThreatDistance: 2.5 })) {
      self.behavior.point.copy(self.cover.position);
      self.behavior.flag = true;
    } else if (fallbackPoint(self, bb, 3.5, self.behavior.point)) {
      self.behavior.flag = true;
    }
  },

  update(self, bb, dt) {
    if (self.suppression <= RECOVER) {
      if (!bb.target.alive) return targetGone(self);
      if (contactStale(self, bb)) return 'search';
      return self.hasCover ? 'cover' : 'combat';
    }
    if (self.combatant.empty) return 'reload';

    self.wantCrouch = true;
    self.wantWeaponUp = 0.7;

    if (self.behavior.flag && !self.near(self.behavior.point, 0.5)) {
      // Crouch-run the last few metres to the wall.
      self.stepTo(self.behavior.point, 'crouch');
      if (self.pathStuck) self.behavior.flag = false;
      self.allowFire = false;
      faceThreat(self, bb);
      return null;
    }

    self.stopMoving();
    faceThreat(self, bb);

    // Blind fire. Not continuous — a burst, then the head goes back down, which
    // is both what suppression looks like and what keeps the agent dangerous
    // enough that the player cannot simply walk up to it.
    self.behavior.timer -= dt;
    if (self.behavior.timer <= 0) {
      self.behavior.phase = self.behavior.phase > 0 ? 0 : 1;
      self.behavior.timer =
        self.behavior.phase > 0 ? bb.rng.range(0.35, 0.8) : bb.rng.range(1.1, 2.6);
    }
    const willing = self.archetype.suppressiveFire > 0.25 || self.perception.visible;
    self.allowFire = self.behavior.phase > 0 && willing && !shouldReload(self, bb);
    return null;
  },

  exit(self) {
    self.wantCrouch = false;
    self.behavior.phase = 0;
  },
};
