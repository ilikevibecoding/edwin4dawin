import { C } from '../lego/palette.js';
import { Minifig } from '../lego/minifig.js';
import { FACE_PILOT, TORSO_PILOT_FRONT, TORSO_PILOT_BACK } from './prints.js';
import { pilotHelmet } from './headgear.js';
import { figGroup } from './util.js';

/**
 * Rebel Alliance X-wing pilot: orange flight suit, white harness, life-support
 * chest box, white helmet with the squadron markings and the visor flipped up.
 * `buildLuke({ pilot: true })` comes straight here with `luke: true`.
 *
 * @param {{ luke?: boolean, pose?: string, name?: string }} [opts]
 */
export function buildRebelPilot(opts = {}) {
  const name = opts.name || (opts.luke ? 'luke_pilot' : 'rebelpilot');
  const fig = new Minifig({
    name,
    skin: C.yellow,
    torso: C.orange,
    arms: C.orange,
    hands: C.yellow,
    hips: C.darkBluishGray,
    legs: C.orange,
    boots: C.darkGray,
    collar: C.veryLightGray,
    face: FACE_PILOT,
    torsoFront: TORSO_PILOT_FRONT,
    torsoBack: TORSO_PILOT_BACK,
    headgear: (f) => pilotHelmet(f),
  });

  fig.setPose(opts.pose || 'idle');
  fig.arms.L.rotation.x = -0.22;
  fig.arms.R.rotation.x = -0.22;

  return figGroup(fig, { name });
}
