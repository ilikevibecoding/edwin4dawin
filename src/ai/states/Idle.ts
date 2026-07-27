/**
 * Idle. Standing about, weapon at low ready, looking around.
 *
 * The only interesting thing an idle soldier does is not stand perfectly still:
 * the head sweep in `Enemy.updateFacing` runs off the same awareness value this
 * state is waiting on, so an unaware enemy is genuinely scanning and genuinely
 * possible to walk behind.
 */
import type { AIStateHandler } from '../Behavior';
import { engaging } from './Common';

export const IdleState: AIStateHandler = {
  id: 'idle',

  enter(self, bb) {
    self.stopMoving();
    self.wantWeaponUp = 0.12;
    self.wantCrouch = false;
    self.allowFire = false;
    self.faceIdle();
    self.homeYaw = self.bodyYaw;
    self.behavior.timer = bb.rng.range(2.5, 7);
  },

  update(self, bb, dt) {
    if (engaging(self, bb)) return 'combat';
    if (self.perception.alerted) return 'alert';

    self.behavior.timer -= dt;
    if (self.behavior.timer <= 0) return 'patrol';
    return null;
  },
};
