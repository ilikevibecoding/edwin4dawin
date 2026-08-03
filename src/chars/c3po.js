import { C } from '../lego/palette.js';
import { Minifig } from '../lego/minifig.js';
import { FACE_C3PO, TORSO_C3PO_FRONT, TORSO_C3PO_BACK } from './prints.js';
import { c3poHead } from './headgear.js';
import { figGroup, temperMetal } from './util.js';

/**
 * C-3PO: pearl gold from head to foot, brick-built droid dome over a printed
 * face plate, exposed wiring at the midriff, and the stiff-kneed protocol-droid
 * stance -- legs locked, arms never quite relaxed.
 *
 * @param {{ pose?: string }} [opts]
 */
export function buildC3po(opts = {}) {
  const fig = new Minifig({
    name: 'c3po',
    skin: C.pearlGold,
    torso: C.pearlGold,
    arms: C.pearlGold,
    hands: C.pearlGold,
    hips: C.pearlGold,
    legs: C.pearlGold,
    // gold, not copper: the collar sits right under the chin and copper there
    // blew out to pink in close-up. c3poHead keeps the copper neck rings.
    collar: C.pearlGold,
    face: FACE_C3PO,
    torsoFront: TORSO_C3PO_FRONT,
    torsoBack: TORSO_C3PO_BACK,
    headgear: (f) => c3poHead(f),
  });

  fig.setPose(opts.pose || 'idle');
  // stiff-legged, elbows out, palms turned forward
  fig.legs.L.rotation.set(0, 0, 0.02);
  fig.legs.R.rotation.set(0, 0, -0.02);
  fig.arms.L.rotation.set(-0.30, 0, 0.22);
  fig.arms.R.rotation.set(-0.30, 0, -0.22);

  // he is pearl gold everywhere, and at metalness 0.9 each panel reflected a
  // different part of the room instead of reading as one plated droid; prints
  // are included so the printed torso plating matches the moulded limbs
  return temperMetal(figGroup(fig, { name: 'c3po' }), { prints: true });
}
