import { C } from '../lego/palette.js';
import { Minifig, Lightsaber } from '../lego/minifig.js';
import { FACE_OBIWAN, TORSO_OBIWAN_FRONT, TORSO_OBIWAN_BACK } from './prints.js';
import { obiwanHood } from './headgear.js';
import { figGroup, setHeldPitch, num } from './util.js';

/**
 * Ben Kenobi, the hermit of the Jundland Wastes: layered tan/brown robes, heavy
 * cowl overhanging the face, white beard printed into the face itself.
 *
 * @param {{ saber?: number, pose?: string }} [opts]
 */
export function buildObiwan(opts = {}) {
  const fig = new Minifig({
    name: 'obiwan',
    skin: C.yellow,
    torso: C.brown,
    arms: C.reddishBrown,
    hands: C.yellow,
    hips: C.reddishBrown,
    legs: C.darkTan,
    collar: C.reddishBrown,
    face: FACE_OBIWAN,
    torsoFront: TORSO_OBIWAN_FRONT,
    torsoBack: TORSO_OBIWAN_BACK,
    torsoSide: TORSO_OBIWAN_BACK,
    headgear: (f) => obiwanHood(f),
  });

  const saber = new Lightsaber({ color: C.transLightBlue, coreColor: 0xffffff, len: 4.1 });
  fig.setPose(opts.pose || 'saber_guard');
  fig.attach('R', saber.object3D);
  setHeldPitch(fig, 'R', saber.object3D, 0.30);
  saber.setExtension(num(opts.saber, 1));

  return figGroup(fig, {
    name: 'obiwan',
    extras: [(t, dt) => saber.update(dt, t)],
    userData: { saber },
  });
}
