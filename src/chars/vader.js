import { C } from '../lego/palette.js';
import { Minifig, Lightsaber } from '../lego/minifig.js';
import { FACE_VADER, TORSO_VADER_FRONT, TORSO_VADER_BACK } from './prints.js';
import { vaderHelmet, vaderMantle } from './headgear.js';
import { figGroup, setHeldPitch, num } from './util.js';

/**
 * Darth Vader. Black on black, so all the read comes from the print's silver and
 * dark-bluish-grey detail plus the helmet silhouette. He stands ~8% taller than
 * a stock minifig and the helmet adds another half brick on top of that.
 *
 * @param {{ saber?: number, pose?: string, scale?: number }} [opts]
 */
export function buildVader(opts = {}) {
  const fig = new Minifig({
    name: 'vader',
    skin: C.black,
    torso: C.black,
    arms: C.black,
    hands: C.black,
    hips: C.black,
    legs: C.black,
    collar: C.darkBluishGray,
    face: FACE_VADER,
    torsoFront: TORSO_VADER_FRONT,
    torsoBack: TORSO_VADER_BACK,
    headgear: (f) => vaderHelmet(f),
    cape: { color: C.black, w: 2.0, h: 3.4 },
  });

  fig.torso.add(vaderMantle());
  fig.root.scale.setScalar(num(opts.scale, 1.08));

  const saber = new Lightsaber({ color: C.transRed, coreColor: 0xffd8cf, len: 4.2 });
  fig.setPose(opts.pose || 'saber_guard');
  fig.attach('R', saber.object3D);
  setHeldPitch(fig, 'R', saber.object3D, 0.42);
  // Sheathed unless a scene asks for it: a lit blade is the brightest thing in
  // any frame it appears in, and he spends most of this film not using it.
  saber.setExtension(num(opts.saber, 0));

  return figGroup(fig, {
    name: 'vader',
    extras: [(t, dt) => saber.update(dt, t)],
    userData: { saber },
  });
}
