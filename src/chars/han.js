import { C } from '../lego/palette.js';
import { Minifig } from '../lego/minifig.js';
import { FACE_HAN, TORSO_HAN_FRONT, TORSO_HAN_BACK } from './prints.js';
import { hanHair } from './headgear.js';
import { dh17Blaster } from './weapons.js';
import { figGroup, setHeldPitch, flag } from './util.js';

/*
 * C.darkBlue (0x0a3463) as the rig's solid parts actually render it.
 *
 * Two colour paths meet on a minifig and they disagree by one sRGB to linear
 * conversion. Anything drawn into the torso atlas -- the prints and the flat
 * backgrounds behind them -- gets one, because the texture declares
 * SRGBColorSpace. Anything solid gets two, because mat() calls
 * convertSRGBToLinear on a Color three.js had already decoded from hex. Near
 * white the two land within a level or two of each other, which is why Luke's
 * printed tunic matches his plain sleeves and nobody has had to care. At
 * C.darkBlue the gap is a factor of twelve.
 *
 * Han is the first figure in the kit dark enough for that to show, and it shows
 * twice. A vest drawn in 0x0a3463 came back mid periwinkle over near-black
 * legs, so he read as a blue bib and black trousers; darkening only the print
 * then left the torso's own unprinted flanks -- still atlas background -- bright,
 * so in profile he had a royal blue panel bolted to a navy body. The hips and
 * legs are the parts that cannot move, since mat() owns them, so everything on
 * the atlas path comes down to meet them instead. This is C.darkBlue's linear
 * value written back out as sRGB, and it has to stay in step with the vest fill
 * in TORSO_HAN_FRONT and TORSO_HAN_BACK.
 */
const VEST = 0x010920;

/**
 * Han Solo as he stands at the Yavin ceremony: white shirt with the collar open
 * under a dark blue vest, dark blue trousers, boots, brown hair parted to one
 * side. `{ blaster: 1 }` puts the sidearm in his right fist.
 *
 * @param {{ pose?: string, blaster?: boolean }} [opts]
 */
export function buildHan(opts = {}) {
  const fig = new Minifig({
    name: 'han',
    skin: C.yellow,
    // The vest is the torso's own colour and the shirt is printed on top of it,
    // not the other way round. He carries no torsoSide print, so the base colour
    // is what shows on his flanks, and a white torso would leave the vest
    // stopping dead at the side seam.
    torso: VEST,
    arms: C.white,
    hands: C.yellow,
    // The trousers carry no Corellian bloodstripe. A leg is an extruded prism
    // with a solid material on it, and the only per-leg control the rig has is
    // legsLeft, which colours a whole leg.
    hips: C.darkBlue,
    legs: C.darkBlue,
    boots: C.darkBrown,
    // collar paints the top face of the torso, the ring of it that shows around
    // the neck. With the vest open at the throat, that ring is shirt.
    collar: C.veryLightGray,
    face: FACE_HAN,
    torsoFront: TORSO_HAN_FRONT,
    torsoBack: TORSO_HAN_BACK,
    headgear: (f) => hanHair(f),
  });

  fig.setPose(opts.pose || 'idle');

  let blaster = null;
  if (flag(opts.blaster)) {
    // There is no DL-44 in weapons.js. The DH-17 is the kit's only sidearm and
    // at minifig scale it is the same short-barrelled silhouette.
    blaster = dh17Blaster();
    fig.attach('R', blaster);
    setHeldPitch(fig, 'R', blaster, -1.45);
  } else if (!opts.pose) {
    // Idle hangs both arms dead straight; a little forward pitch is what makes
    // it read as a man standing rather than as a mannequin. Skipped whenever the
    // caller asked for a pose of its own, since this would overwrite it.
    fig.arms.L.rotation.x = -0.16;
    fig.arms.R.rotation.x = -0.16;
  }

  return figGroup(fig, { name: 'han', userData: blaster ? { blaster } : {} });
}
