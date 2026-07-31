/**
 * Cover. Holding a slot, ducking and leaning out to shoot.
 *
 * The peek cycle is where a firefight either reads as soldiers or as targets on a
 * fairground rail, and the thing that decides which is the timing. Both halves of
 * the cycle are randomised around their tuning values every time, so no two peeks
 * are the same length and the player cannot metronome them. Suppression cuts a
 * peek short, an empty magazine cuts it short, and a target at knife range stops
 * the agent ducking at all.
 *
 * The slot itself is re-validated as the fight moves. Cover is directional: a
 * target that works around the flank turns a wall into an obstacle the agent is
 * standing in front of, and noticing that is what makes a squad give ground.
 */
import * as THREE from 'three';
import type { AIStateHandler } from '../Behavior';
import type { Blackboard } from '../Blackboard';
import { coverStillValid } from '../CoverPicker';
import type { Enemy } from '../Enemy';
import { FIGHT } from '../Tuning';
import { contactStale, faceThreat, shouldReload, targetGone, threatPoint } from './Common';

const THREAT = /* @__PURE__ */ new THREE.Vector3();

/** Distance at which ducking behind cover stops being the right idea. */
const KNIFE_RANGE = 6.5;

function duck(self: Enemy, bb: Blackboard): void {
  self.peeking = false;
  self.peekNextAt = bb.now + FIGHT.peekInterval + bb.rng.range(0, FIGHT.peekIntervalJitter);
}

function pop(self: Enemy, bb: Blackboard): void {
  self.peeking = true;
  self.peekUntil = bb.now + FIGHT.peekDuration + bb.rng.range(0, FIGHT.peekDurationJitter);
}

export const CoverState: AIStateHandler = {
  id: 'cover',

  enter(self, bb) {
    self.wantWeaponUp = 1;
    self.allowFire = false;
    self.peeking = false;
    self.peekNextAt = bb.now + bb.rng.range(0.15, 0.7);
    // Nobody holds one wall for a whole firefight.
    self.behavior.timer = bb.rng.range(9, 17);
    self.behavior.flag = false;
    if (self.hasCover) {
      self.moveTo(bb, self.cover.position, 'combat', 2);
      self.faceTravel();
    }
  },

  update(self, bb, dt) {
    // The claim is renewed once a frame before any state runs, so losing it to a
    // squadmate shows up here as simply not having cover any more.
    if (!self.hasCover) return 'combat';
    if (!bb.target.alive) {
      self.releaseCover(bb);
      return targetGone(self);
    }
    if (shouldReload(self, bb)) return 'reload';
    if (contactStale(self, bb) && self.behavior.timeInState > 3.5) {
      self.releaseCover(bb);
      return 'search';
    }

    threatPoint(self, bb, THREAT);
    if (!coverStillValid(self.cover, THREAT)) {
      self.releaseCover(bb);
      return 'combat';
    }
    if (self.combatant.wantsGrenade(bb, self)) self.combatant.beginGrenade(bb, self);

    // Still running to the slot.
    if (!self.behavior.flag) {
      const there = self.near(self.cover.position, 0.55) || (self.arrived && self.near(self.cover.position, 1.1));
      if (!there) {
        self.moveTo(bb, self.cover.position, 'combat', 2);
        self.wantCrouch = false;
        self.allowFire =
          self.perception.visible && self.perception.distance < self.archetype.maxRange;
        if (self.allowFire) faceThreat(self, bb);
        else self.faceTravel();
        if (self.pathStuck) {
          self.releaseCover(bb);
          return 'combat';
        }
        return null;
      }
      self.behavior.flag = true;
      self.stopMoving();
    }

    faceThreat(self, bb);
    self.behavior.timer -= dt;
    if (self.behavior.timer <= 0) {
      // Reposition: drop the claim and let combat pick somewhere new.
      self.releaseCover(bb);
      return 'combat';
    }

    const close = self.perception.distance < KNIFE_RANGE;
    if (self.peeking) {
      self.allowFire = true;
      self.wantCrouch = false;
      self.stepTo(self.cover.peek, 'crouch');
      const spent = bb.now > self.peekUntil;
      if (spent || self.combatant.empty || (self.pinned && !close)) duck(self, bb);
      return null;
    }

    // Ducked. Low cover means crouching; standing cover means staying behind it.
    self.allowFire = close;
    self.wantCrouch = self.cover.low && !close;
    self.stepTo(self.cover.position, 'crouch');

    const ready = !self.combatant.reloading && !self.combatant.empty;
    const exposed = self.perception.visible && self.perception.visibility > 0.5;
    if (ready && (close || exposed || bb.now >= self.peekNextAt)) pop(self, bb);
    return null;
  },

  exit(self) {
    self.peeking = false;
  },
};
