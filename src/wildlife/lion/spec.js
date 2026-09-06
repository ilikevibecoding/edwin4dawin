// ---------------------------------------------------------------------------
// Proportions and the rest skeleton.
//
// Everything is expressed for a unit adult male and scaled per animal: the
// same rig, the same geometry generator, the same solver. Units are metres,
// the animal faces +Z, stands on y = 0, and +X is its right.
//
// A lion is long and low: the shoulder sits a little above the hip, the chest
// reaches down to the elbow, and the back is nearly straight from withers to
// rump. Hind legs are the heavy pair. Joint heights below are from a 1.2 m
// shoulder male.
// ---------------------------------------------------------------------------

// (round 4: the head is 8 % larger on the adults — it read small against the
// round-2 trunk in the walk strip; the cub keeps its own proportion)
export const KINDS = {
  male: { scale: 1.0, mane: true, head: 1.14, bulk: 1.0, leg: 1.0, tuft: 1.0, spots: false, walk: 0.95 },
  lioness: { scale: 0.83, mane: false, head: 1.08, bulk: 0.95, leg: 1.0, tuft: 0.9, spots: false, walk: 1.0 },
  // a cub is not a small lion: the head is near half the length of the trunk,
  // the legs are short and thick for the body, and the belly is round. `squat`
  // scales heights on their own, `leg` the limb thickness, `bulk` the trunk.
  cub: { scale: 0.46, mane: false, head: 1.5, bulk: 1.22, leg: 1.55, tuft: 0.7, spots: true, walk: 1.05, squat: 0.78 },
};

/**
 * The head children (jaw, ears, lids) are laid out for a skull based here.
 * Moving the head joint itself moves them with it, so the neck can be
 * shortened or lengthened without re-deriving every feature position.
 */
export const HEAD_REF = [0, 1.2, 0.91];

/**
 * Rest-pose joints. `dir` overrides the bone's pointing direction where the
 * bone has no chain child (head, jaw, ears, lids, ribs). `end` joints are not
 * bones; they exist to give the last bone of a chain a direction and a length.
 */
export const JOINTS = [
  { name: 'pelvis', parent: null, pos: [0, 1.08, -0.6], to: 'spine1' },
  { name: 'spine1', parent: 'pelvis', pos: [0, 1.105, -0.27], to: 'spine2' },
  { name: 'spine2', parent: 'spine1', pos: [0, 1.125, 0.06], to: 'chest' },
  { name: 'chest', parent: 'spine2', pos: [0, 1.14, 0.42], to: 'neck1' },
  { name: 'neck1', parent: 'chest', pos: [0, 1.155, 0.56], to: 'neck2' },
  { name: 'neck2', parent: 'neck1', pos: [0, 1.18, 0.70], to: 'head' },
  // a short, heavy neck: the skull sits close over the shoulders, the occiput
  // about a head's length ahead of the withers (the children below are laid
  // out for HEAD_REF and follow this joint)
  { name: 'head', parent: 'neck2', pos: [0, 1.2, 0.82], dir: [0, 0, 1] },
  // head children are laid out for a unit head and scaled by the kind's head factor
  { name: 'jaw', parent: 'head', pos: [0, 1.14, 1.0], dir: [0, -0.12, 1] },
  // ears root on the upper-back corners of the skull and stand up and out
  { name: 'earL', parent: 'head', pos: [0.088, 1.284, 0.93], dir: [0.6, 1, -0.2] },
  { name: 'earR', parent: 'head', pos: [-0.088, 1.284, 0.93], dir: [-0.6, 1, -0.2] },
  // eyes sit on the front corners of the skull, above the root of the muzzle,
  // and look forward with a little divergence; the socket holds the back
  // third of the ball, the lids frame the front
  { name: 'lidL', parent: 'head', pos: [0.058, 1.258, 1.066], dir: [0.36, 0.1, 1] },
  { name: 'lidR', parent: 'head', pos: [-0.058, 1.258, 1.066], dir: [-0.36, 0.1, 1] },
  { name: 'ribs', parent: 'spine2', pos: [0, 0.78, 0.14], dir: [0, -1, 0] },
  // the tail hangs: it leaves the rump going down and back and is near
  // vertical by its middle, the tip turning a little forward
  { name: 'tail1', parent: 'pelvis', pos: [0, 1.06, -0.72], to: 'tail2' },
  { name: 'tail2', parent: 'tail1', pos: [0, 0.95, -0.84], to: 'tail3' },
  { name: 'tail3', parent: 'tail2', pos: [0, 0.8, -0.93], to: 'tail4' },
  { name: 'tail4', parent: 'tail3', pos: [0, 0.62, -0.98], to: 'tail5' },
  { name: 'tail5', parent: 'tail4', pos: [0, 0.43, -1.0], to: 'tailTip' },
  { name: 'tailTip', parent: 'tail5', pos: [0, 0.25, -0.99], end: true },
  // front legs: shoulder joint (humerus head), elbow, wrist, paw
  { name: 'shoulderL', parent: 'chest', pos: [0.17, 0.86, 0.42], to: 'elbowL' },
  { name: 'elbowL', parent: 'shoulderL', pos: [0.18, 0.58, 0.35], to: 'wristL' },
  { name: 'wristL', parent: 'elbowL', pos: [0.175, 0.22, 0.42], to: 'pawFL' },
  { name: 'pawFL', parent: 'wristL', pos: [0.175, 0.05, 0.48], to: 'toeFL' },
  { name: 'toeFL', parent: 'pawFL', pos: [0.175, 0.02, 0.6], end: true },
  { name: 'shoulderR', parent: 'chest', pos: [-0.17, 0.86, 0.42], to: 'elbowR' },
  { name: 'elbowR', parent: 'shoulderR', pos: [-0.18, 0.58, 0.35], to: 'wristR' },
  { name: 'wristR', parent: 'elbowR', pos: [-0.175, 0.22, 0.42], to: 'pawFR' },
  { name: 'pawFR', parent: 'wristR', pos: [-0.175, 0.05, 0.48], to: 'toeFR' },
  { name: 'toeFR', parent: 'pawFR', pos: [-0.175, 0.02, 0.6], end: true },
  // hind legs: hip, knee (stifle), hock, paw
  // the stifle sits a little ahead of the hip, the hock well behind it, so the
  // leg zigzags the way a cat's does instead of standing as a column. The hips
  // are set wide (0.4 m across on a male) so the hind legs pass one another
  // with daylight between them instead of crossing in a side view.
  { name: 'hipL', parent: 'pelvis', pos: [0.2, 0.95, -0.6], to: 'kneeL' },
  { name: 'kneeL', parent: 'hipL', pos: [0.2, 0.6, -0.49], to: 'hockL' },
  { name: 'hockL', parent: 'kneeL', pos: [0.19, 0.3, -0.73], to: 'pawHL' },
  { name: 'pawHL', parent: 'hockL', pos: [0.185, 0.05, -0.65], to: 'toeHL' },
  { name: 'toeHL', parent: 'pawHL', pos: [0.185, 0.02, -0.53], end: true },
  { name: 'hipR', parent: 'pelvis', pos: [-0.2, 0.95, -0.6], to: 'kneeR' },
  { name: 'kneeR', parent: 'hipR', pos: [-0.2, 0.6, -0.49], to: 'hockR' },
  { name: 'hockR', parent: 'kneeR', pos: [-0.19, 0.3, -0.73], to: 'pawHR' },
  { name: 'pawHR', parent: 'hockR', pos: [-0.185, 0.05, -0.65], to: 'toeHR' },
  { name: 'toeHR', parent: 'pawHR', pos: [-0.185, 0.02, -0.53], end: true },
];

/**
 * A hind foot never lands closer to the sagittal plane than this fraction of
 * its rest lateral offset, and the poser keeps the stifle and hock outside it
 * too, so the hind legs cannot cross into an X under the hips.
 */
export const HIND_LATERAL_MIN = 0.55;

export const LEGS = [
  { name: 'FL', side: 1, front: true, root: 'shoulderL', mid: 'elbowL', low: 'wristL', paw: 'pawFL', toe: 'toeFL' },
  { name: 'FR', side: -1, front: true, root: 'shoulderR', mid: 'elbowR', low: 'wristR', paw: 'pawFR', toe: 'toeFR' },
  { name: 'HL', side: 1, front: false, root: 'hipL', mid: 'kneeL', low: 'hockL', paw: 'pawHL', toe: 'toeHL' },
  { name: 'HR', side: -1, front: false, root: 'hipR', mid: 'kneeR', low: 'hockR', paw: 'pawHR', toe: 'toeHR' },
];

/**
 * Eye: ball radius for a unit head, and where the lid rims sit off the gaze
 * axis (radians) when open. A blink closes the upper lid through the sum.
 */
export const EYE = { r: 0.0195, lidUp: 0.46, lidDown: 0.46 };

/**
 * The lid rims above and below the gaze when the eye is open, read by head.js:
 * wider than EYE.lidUp/lidDown so the almond shows a lion's share of the ball
 * (a cat's opening is about 60 % of the ball's height, not a slit in a dark
 * ring). pose.js closes the upper lid through up + down for the blink.
 * `scale` enlarges the ball, lids and socket over EYE.r (a lion's eye is large
 * for its head); index.js's cornea takes the same scale so the wet highlight
 * sits on the ball rather than inside it.
 */
// Round 4: opened from 0.6/0.6 (34 degrees, which with the dark lid rims and
// the painted eyeline read as a slit in every gauntlet frame) to 39/34
// degrees, so the almond shows about 80 % of the iris disc from the front.
// `roll` (round 5) turns the lid rims' axis about the gaze so the almond's
// outer corner sits 8 degrees higher than the inner (headspec.js EYE_FRAME and
// the lid caps in head.js; the blink axis in pose.js is unchanged).
// Round 5: 31 / 33 degrees (the round-4 39 / 34 with the wider round-5
// almond showed the ball as a round button), the upper rim the lower of the
// two so the eye is hooded under the brow the way a cat's is, and the ball
// 1.34 × EYE.r rather than 1.4 (a 5.5 cm ball on a 40 cm head was a cub's
// eye); about 65 % of the iris disc shows from the front.
// Round 6: the upper lid comes down to 26 degrees over the gaze so it hoods
// the top fifth of the iris disc (critic A: "full spheres with a visible
// sclera ring head-on"), and the lower rim drops to 36 so the opening stays
// a lion's; with the ball sunk a quarter of its radius into the skull
// (HEAD_JOINTS below) and the stop lowered under it (headspec.js HEAD_ROWS)
// the raycast from the face camera sees 0.62 / 0.59 of the two iris discs
// (round 5's head: 0.62 / 0.57), inside the 0.60-0.70 the brief holds.
// (24 degrees with the ball 8 mm back measured 0.46 / 0.39 by the same
// raycast: the skin ahead of the eye, not the lids, was what hid the iris.)
// Round 7: 31.5 / 39 degrees with the ball sunk 4 mm further (10 mm in all,
// HEAD_JOINTS below). At 26 / 36 with the ball 6 mm in, the lid caps' rims
// lay inside the iris disc and the caps — face-coloured, 2 mm proud of the
// ball — read as a pale ring round the iris from the face camera (critic A:
// 78 pale pixels round the left iris at 512); with the rims moved out to the
// limbus and the ball deeper, what shows between the lids is iris, and the
// caps sit under the skin. The almond's height is still under the ball's.
export const EYE_LIDS = { up: 0.55, down: 0.68, scale: 1.34, roll: 0.14 };

/**
 * Head-child joints re-placed for the head in head.js, laid out like JOINTS
 * for HEAD_REF and applied over the JOINTS entry of the same name by
 * scaledJoints: the ears lean a little further back, the eyes face a little
 * more forward.
 */
export const HEAD_JOINTS = {
  // ears on the upper corners of the skull (round 5: the crown is 0.16 over
  // the head joint and the corner where the flat top meets the flat cheek is
  // at about x 0.098, y 0.125), a hand behind the eye, the base on the
  // corner itself, the axis leaning out about 33 degrees and back a touch,
  // so from the front the ears stand wide off the corners (their inner edges
  // half the head's width apart) with the crown level between them — not on
  // top of a dome, not low on its sides
  // (round 6: 4 mm further out and 6 mm lower on the corner — the base was
  // measuring 0.77 of the half-zygomatic and 0.13 L over the eye line
  // against a lion's ~0.8 and ~0.1; ears high and inboard on a round crown
  // are the bear's, seen from the side)
  earL: { pos: [0.102, 1.316, 0.97], dir: [0.64, 1.0, 0.02] },
  earR: { pos: [-0.102, 1.316, 0.97], dir: [-0.64, 1.0, 0.02] },
  // eyes on the face under the brow ridge, over the muzzle box (round 5:
  // 11.7 cm apart, 0.29 of the head length and 0.45 of the cheek width, up
  // 1.2 cm and back 2.2 cm from round 4 so the inner corners sit 0.33 L behind
  // the nose tip and the ball's bottom is level with the bridge), the ball's
  // centre about a radius under the skin along its gaze so the cornea stands
  // just proud between brow and cheek, forward-facing with about 17 degrees
  // of divergence; headspec.js FACE.eye is this offset
  // (round 6: 6 mm — a quarter of the ball's radius — further back into the
  // skull, so the ball sits in the socket under the brow ledge with the skin
  // meeting it at the lid rims instead of a hemisphere standing proud of the
  // face; straight back rather than along the gaze, so the interpupillary
  // distance the round-5 head was measured to is unchanged. The brief's 30 %
  // (8 mm) put the muzzle root's top corner across the lower half of the
  // iris from the face camera — 0.46 of the disc seen against 0.62 before —
  // so the stop was lowered under the eye instead and the sink held at 6 mm)
  // (round 7: 4 mm further back, 10 mm in all, with the lids opened to
  // 0.55 / 0.68 rad — headspec.js FACE.eye follows)
  lidL: { pos: [0.0585, 1.27, 1.068], dir: [0.3, 0.08, 1] },
  lidR: { pos: [-0.0585, 1.27, 1.068], dir: [-0.3, 0.08, 1] },
};

/**
 * Head shape by kind, read by head.js: `muzzle` scales the face ahead of the
 * stop (a cub's muzzle is short for its skull). Keyed by KINDS name.
 */
export const HEAD_KINDS = {
  male: { muzzle: 1.0 },
  lioness: { muzzle: 1.0 },
  cub: { muzzle: 0.8 },
};

/**
 * How far the underside hangs below the spine at each trunk joint, for a unit
 * male (the torso loft's lower half-heights). The poser will not put a joint
 * closer to the ground than this, so a lying animal rests on its belly instead
 * of sinking through it. `bulkFactor` is how a kind's bulk scales the depth.
 */
// A lion is barrel-bodied: the underline runs nearly level from the brisket at
// the elbow back past the middle of the trunk, sags a little at the mid-belly,
// and only rises to the groin in the last third. Chest depth is about 1.2× the
// depth at the groin, not twice it.
export const BELLY = { pelvis: 0.44, spine1: 0.57, spine2: 0.61, chest: 0.6, drop: 0.04 };
export const bellyFactor = (bulk) => 0.45 + 0.55 * bulk;

/** Where the pad meets the ground, in the paw bone's frame (+Y along the bone, toward the toes). */
export const PAD_OFFSET = { front: [0, 0.06, 0.036], hind: [0, 0.06, 0.036] };

/**
 * Scale the unit skeleton for a kind. Head and leg thickness are handled by
 * the geometry; here only the joint positions change, so a cub is a smaller
 * lion with a proportionally larger head sitting on the same joint layout.
 */
export function scaledJoints(kind) {
  const k = KINDS[kind];
  const s = k.scale;
  const sy = s * (k.squat ?? 1);
  const head = JOINTS.find((j) => j.name === 'head').pos;
  return JOINTS.map((j) => {
    if (j.parent === 'head') {
      // ears, lids and jaw ride on the head's own scale so a cub's big head
      // keeps its features; their offsets are taken from HEAD_REF and hung on
      // the head joint wherever the neck puts it
      const hs = s * k.head;
      const o = HEAD_JOINTS[j.name] || j;
      return { ...j, dir: o.dir || j.dir, pos: [head[0] * s + (o.pos[0] - HEAD_REF[0]) * hs, head[1] * sy + (o.pos[1] - HEAD_REF[1]) * hs, head[2] * s + (o.pos[2] - HEAD_REF[2]) * hs] };
    }
    return { ...j, pos: [j.pos[0] * s, j.pos[1] * sy, j.pos[2] * s] };
  });
}
