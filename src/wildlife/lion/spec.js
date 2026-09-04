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

export const KINDS = {
  male: { scale: 1.0, mane: true, head: 1.06, bulk: 1.0, leg: 1.0, tuft: 1.0, spots: false, walk: 0.95 },
  lioness: { scale: 0.83, mane: false, head: 1.0, bulk: 0.93, leg: 0.98, tuft: 0.9, spots: false, walk: 1.0 },
  // a cub is squat: legs short for its body, so heights are scaled down on their own
  cub: { scale: 0.46, mane: false, head: 1.3, bulk: 1.05, leg: 1.25, tuft: 0.7, spots: true, walk: 1.05, squat: 0.86 },
};

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
  { name: 'neck1', parent: 'chest', pos: [0, 1.155, 0.61], to: 'neck2' },
  { name: 'neck2', parent: 'neck1', pos: [0, 1.18, 0.77], to: 'head' },
  // a short, heavy neck: the skull sits close over the shoulders
  { name: 'head', parent: 'neck2', pos: [0, 1.2, 0.91], dir: [0, 0, 1] },
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
  { name: 'shoulderL', parent: 'chest', pos: [0.16, 0.86, 0.42], to: 'elbowL' },
  { name: 'elbowL', parent: 'shoulderL', pos: [0.17, 0.58, 0.35], to: 'wristL' },
  { name: 'wristL', parent: 'elbowL', pos: [0.17, 0.22, 0.42], to: 'pawFL' },
  { name: 'pawFL', parent: 'wristL', pos: [0.17, 0.05, 0.48], to: 'toeFL' },
  { name: 'toeFL', parent: 'pawFL', pos: [0.17, 0.02, 0.6], end: true },
  { name: 'shoulderR', parent: 'chest', pos: [-0.16, 0.86, 0.42], to: 'elbowR' },
  { name: 'elbowR', parent: 'shoulderR', pos: [-0.17, 0.58, 0.35], to: 'wristR' },
  { name: 'wristR', parent: 'elbowR', pos: [-0.17, 0.22, 0.42], to: 'pawFR' },
  { name: 'pawFR', parent: 'wristR', pos: [-0.17, 0.05, 0.48], to: 'toeFR' },
  { name: 'toeFR', parent: 'pawFR', pos: [-0.17, 0.02, 0.6], end: true },
  // hind legs: hip, knee (stifle), hock, paw
  // the stifle sits a little ahead of the hip, the hock well behind it, so the
  // leg zigzags the way a cat's does instead of standing as a column
  { name: 'hipL', parent: 'pelvis', pos: [0.15, 0.95, -0.6], to: 'kneeL' },
  { name: 'kneeL', parent: 'hipL', pos: [0.16, 0.6, -0.49], to: 'hockL' },
  { name: 'hockL', parent: 'kneeL', pos: [0.16, 0.3, -0.73], to: 'pawHL' },
  { name: 'pawHL', parent: 'hockL', pos: [0.16, 0.05, -0.65], to: 'toeHL' },
  { name: 'toeHL', parent: 'pawHL', pos: [0.16, 0.02, -0.53], end: true },
  { name: 'hipR', parent: 'pelvis', pos: [-0.15, 0.95, -0.6], to: 'kneeR' },
  { name: 'kneeR', parent: 'hipR', pos: [-0.16, 0.6, -0.49], to: 'hockR' },
  { name: 'hockR', parent: 'kneeR', pos: [-0.16, 0.3, -0.73], to: 'pawHR' },
  { name: 'pawHR', parent: 'hockR', pos: [-0.16, 0.05, -0.65], to: 'toeHR' },
  { name: 'toeHR', parent: 'pawHR', pos: [-0.16, 0.02, -0.53], end: true },
];

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
 * How far the underside hangs below the spine at each trunk joint, for a unit
 * male (the torso loft's lower half-heights). The poser will not put a joint
 * closer to the ground than this, so a lying animal rests on its belly instead
 * of sinking through it. `bulkFactor` is how a kind's bulk scales the depth.
 */
export const BELLY = { pelvis: 0.34, spine1: 0.49, spine2: 0.57, chest: 0.58, drop: 0.04 };
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
      // ears, lids and jaw ride on the head's own scale so a cub's big head keeps its features
      const hs = s * k.head;
      return { ...j, pos: [head[0] * s + (j.pos[0] - head[0]) * hs, head[1] * sy + (j.pos[1] - head[1]) * hs, head[2] * s + (j.pos[2] - head[2]) * hs] };
    }
    return { ...j, pos: [j.pos[0] * s, j.pos[1] * sy, j.pos[2] * s] };
  });
}
