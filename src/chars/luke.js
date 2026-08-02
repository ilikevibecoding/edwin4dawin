import { C } from '../lego/palette.js';
import { Minifig, Lightsaber } from '../lego/minifig.js';
import { FACE_LUKE, TORSO_LUKE_FRONT } from './prints.js';
import { lukeHair } from './headgear.js';
import { buildRebelPilot } from './rebelpilot.js';
import { figGroup, setHeldPitch, flag, num } from './util.js';

/**
 * Luke Skywalker, moisture-farm issue: cream tunic wrap, tan trousers, boots,
 * tousled sandy hair. `{ pilot: true }` swaps the whole figure for the orange
 * flight suit and the X-wing helmet.
 *
 * @param {{ pilot?: boolean, saber?: number, pose?: string }} [opts]
 */
export function buildLuke(opts = {}) {
  if (flag(opts.pilot)) return buildRebelPilot({ ...opts, luke: true });

  const fig = new Minifig({
    name: 'luke',
    skin: C.yellow,
    torso: C.veryLightGray,
    arms: C.veryLightGray,
    hands: C.yellow,
    hips: C.darkTan,
    legs: C.tan,
    boots: C.reddishBrown,
    collar: C.veryLightGray,
    face: FACE_LUKE,
    torsoFront: TORSO_LUKE_FRONT,
    torsoBack: TORSO_LUKE_FRONT,
    headgear: (f) => lukeHair(f),
  });

  const saberOn = num(opts.saber, 0);
  fig.setPose(opts.pose || (saberOn > 0 ? 'saber_guard' : 'idle'));

  let saber = null;
  if (saberOn > 0 || flag(opts.saber, false)) {
    saber = new Lightsaber({ color: C.transLightBlue, coreColor: 0xffffff, len: 4.0 });
    fig.attach('R', saber.object3D);
    setHeldPitch(fig, 'R', saber.object3D, 0.35);
    saber.setExtension(saberOn > 0 ? saberOn : 1);
  } else {
    fig.arms.L.rotation.x = -0.16;
    fig.arms.R.rotation.x = -0.16;
  }

  return figGroup(fig, {
    name: 'luke',
    extras: saber ? [(t, dt) => saber.update(dt, t)] : [],
    userData: saber ? { saber } : {},
  });
}
