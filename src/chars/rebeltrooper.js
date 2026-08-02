import { C } from '../lego/palette.js';
import { Minifig } from '../lego/minifig.js';
import { FACE_REBEL, TORSO_REBEL_FRONT } from './prints.js';
import { rebelHelmet } from './headgear.js';
import { dh17Blaster } from './weapons.js';
import { figGroup, setHeldPitch } from './util.js';

/**
 * Rebel fleet trooper: blue-grey uniform, tan flak vest, the tall open-crowned
 * combat helmet, moustache, DH-17 blaster.
 *
 * @param {{ pose?: string }} [opts]
 */
export function buildRebelTrooper(opts = {}) {
  const fig = new Minifig({
    name: 'rebeltrooper',
    skin: C.yellow,
    torso: C.sandBlue,
    arms: C.sandBlue,
    hands: C.yellow,
    hips: C.sandBlue,
    legs: C.sandBlue,
    boots: C.darkBrown,
    collar: C.darkTan,
    face: FACE_REBEL,
    torsoFront: TORSO_REBEL_FRONT,
    torsoBack: TORSO_REBEL_FRONT,
    headgear: (f) => rebelHelmet(f),
  });

  fig.setPose(opts.pose || 'hold_right');
  const blaster = dh17Blaster();
  fig.attach('R', blaster);
  setHeldPitch(fig, 'R', blaster, -1.45);

  return figGroup(fig, { name: 'rebeltrooper', userData: { blaster } });
}
