import { C } from '../lego/palette.js';
import { Minifig } from '../lego/minifig.js';
import { FACE_OFFICER, TORSO_OFFICER_FRONT } from './prints.js';
import { officerCap } from './headgear.js';
import { figGroup } from './util.js';

/**
 * Imperial officer: olive-grey tunic with the rank plaque and code cylinders,
 * flat-topped cap, and an expression that has never approved a requisition.
 *
 * @param {{ pose?: string }} [opts]
 */
export function buildImperialOfficer(opts = {}) {
  const fig = new Minifig({
    name: 'imperialofficer',
    skin: C.yellow,
    torso: C.darkGray,
    arms: C.darkGray,
    hands: C.yellow,
    hips: C.black,
    legs: C.black,
    boots: C.trueBlack,
    collar: C.darkGray,
    face: FACE_OFFICER,
    torsoFront: TORSO_OFFICER_FRONT,
    torsoBack: TORSO_OFFICER_FRONT,
    headgear: (f) => officerCap(f),
  });

  fig.setPose(opts.pose || 'idle');
  // hands clasped behind the back: arms swung back and inward
  fig.arms.L.rotation.x = 0.55;
  fig.arms.R.rotation.x = 0.55;
  fig.arms.L.rotation.z = 0.30;
  fig.arms.R.rotation.z = -0.30;

  return figGroup(fig, { name: 'imperialofficer' });
}
