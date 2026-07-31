/**
 * Dead.
 *
 * The work of dying happens in `Enemy.die` — the controller is destroyed, the
 * combat registration is dropped, the cover claim and the squad's movement token
 * are released, the ragdoll is created and the weapon is reparented to the hand
 * that was holding it so it falls with the body. From then on `Enemy.update`
 * short-circuits into `updateCorpse` and this handler stops being ticked.
 *
 * It still has to exist and it still has to be correct, because a kill is not the
 * only way health reaches zero: `Behavior` forces this state whenever `isAlive`
 * goes false, and if that ever happens without going through `die` the agent must
 * end up inert rather than continuing to walk about with no health.
 */
import type { AIStateHandler } from '../Behavior';

export const DeadState: AIStateHandler = {
  id: 'dead',

  enter(self, bb) {
    self.allowFire = false;
    self.wantWeaponUp = 0;
    self.wantCrouch = false;
    self.peeking = false;
    self.stopMoving();
    self.releaseCover(bb);
    self.squad?.releaseMove(self);
    self.locomotion.velocity.set(0, 0, 0);
  },

  update() {
    return null;
  },
};
