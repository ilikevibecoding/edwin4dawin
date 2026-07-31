/**
 * Alert. Something was heard, or a squadmate called something in.
 *
 * The order matters: orient first, then move. An agent that starts walking towards
 * a noise in the same frame it hears it looks scripted; one that stops, turns its
 * head, brings the weapon up and then advances looks like it is thinking. The
 * orient beat is a few hundred milliseconds, which is also the window in which a
 * player who made the noise on purpose can get somewhere else.
 */
import * as THREE from 'three';
import type { AIStateHandler } from '../Behavior';
import { VOICE } from '../Tuning';
import { engaging, forgotten, hasLead } from './Common';

const POINT = /* @__PURE__ */ new THREE.Vector3();

export const AlertState: AIStateHandler = {
  id: 'alert',

  enter(self, bb) {
    self.stopMoving();
    self.wantWeaponUp = 1;
    self.wantCrouch = false;
    // Firing is allowed, but the combatant will not shoot without positive
    // identification, so this only matters if the contact turns into a fight.
    self.allowFire = true;
    self.behavior.timer = bb.rng.range(0.35, 0.85);
    self.say(bb, VOICE.spot, 0.8);
  },

  update(self, bb, dt) {
    if (engaging(self, bb)) return 'combat';

    const perception = self.perception;
    const behavior = self.behavior;
    if (!hasLead(self)) {
      if (forgotten(self)) return 'patrol';
      return behavior.timeInState > 4 ? 'search' : null;
    }

    // Somewhere worth looking: the heard position if there is one, otherwise the
    // predicted position of a target somebody has seen.
    if (perception.investigate) POINT.copy(perception.investigate);
    else POINT.copy(perception.predicted);
    POINT.y += 1.35;
    self.lookAt(POINT);

    if (behavior.timer > 0) {
      behavior.timer -= dt;
      self.stopMoving();
      return null;
    }

    POINT.y -= 1.35;
    if (self.near(POINT, 2.6) || self.pathStuck) return 'search';
    if (behavior.timeInState > 16) return 'search';
    self.moveTo(bb, POINT, 'combat', 0.9);
    if (!perception.visible && self.speed > 1.4) self.faceTravel();
    return null;
  },
};
