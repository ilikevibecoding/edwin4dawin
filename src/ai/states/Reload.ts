/**
 * Reload. Changing a magazine, which is the one thing an enemy does that hands
 * the player a free window.
 *
 * That window is the point. An agent that reloads while standing in the open
 * shooting at nothing is not fighting, it is waiting to be killed, so this state
 * spends the reload getting the agent's body out of the line: behind the cover it
 * already holds if it has one, behind something nearby if it does not, and
 * backwards away from the threat if there is nothing at all. The callout is fired
 * from `Combatant.beginReload` so the player hears it, which is a deliberate
 * trade — telling the player you are vulnerable is worth more in readability than
 * it costs in difficulty.
 */
import type { AIStateHandler } from '../Behavior';
import { COVER } from '../Tuning';
import { contactStale, faceThreat, fallbackPoint, takeCover, targetGone } from './Common';

export const ReloadState: AIStateHandler = {
  id: 'reload',

  enter(self, bb) {
    self.wantWeaponUp = 0.55;
    self.allowFire = false;
    self.peeking = false;
    self.combatant.beginReload(bb, self);

    if (self.hasCover) {
      self.behavior.point.copy(self.cover.position);
      self.behavior.flag = true;
      return;
    }
    // No slot held. Somewhere close is worth a couple of seconds of walking;
    // straight backwards is the last resort.
    if (takeCover(self, bb, { radius: COVER.searchRadius * 0.55 })) {
      self.behavior.point.copy(self.cover.position);
      self.behavior.flag = true;
    } else if (fallbackPoint(self, bb, 4, self.behavior.point)) {
      self.behavior.flag = true;
    } else {
      self.behavior.flag = false;
    }
  },

  update(self, bb) {
    const combatant = self.combatant;

    // Finished, or interrupted by something that cancelled the reload.
    if (!combatant.reloading) {
      if (!bb.target.alive) return targetGone(self);
      if (contactStale(self, bb)) return 'search';
      return self.hasCover ? 'cover' : 'combat';
    }

    self.wantWeaponUp = 0.55;
    self.allowFire = false;

    if (self.behavior.flag) {
      self.stepTo(self.behavior.point, 'combat');
      if (self.pathStuck) self.behavior.flag = false;
    } else {
      self.stopMoving();
    }

    // Keep the head on the threat throughout: a man loading a magazine while
    // watching the doorway he was shooting through reads as competent, and it
    // means the first round after the reload does not need a fresh acquisition.
    if (self.perception.everSeen || self.perception.investigate) faceThreat(self, bb);
    else self.faceTravel();

    // Crouch behind low cover, but not while still walking to it.
    self.wantCrouch = self.hasCover && self.cover.low && self.near(self.cover.position, 0.9);
    return null;
  },
};
