// ---------------------------------------------------------------------------
// The lion's head profile, shared by the head geometry (head.js) and the face
// painter (textures.js) so a mark placed in head metres lands on the animal
// in head metres.
//
// Head space: the head joint at the origin, forward +z, up +y, +x the animal's
// right, unit head metres (a male is 1.06 of this, a lioness 0.83, a cub 0.6).
// The upper head — braincase, brow, cheeks, muzzle and upper lip — is one loft
// along z, each section a superellipse (exponent n: 2 is an ellipse, higher is
// boxier) with its own centre height and separate half-heights above and
// below the centre. Lengthwise it runs from the occiput to the nose; the
// muzzle from the eye to the nose tip is about 0.2, some 45 % of the head.
// ---------------------------------------------------------------------------

/**
 * [z, cy, rx, ryTop, ryBot, n, taper]: `taper` narrows the upper half toward
 * the top (the width at the crown is rx × (1 − taper)), so across the orbits
 * the section is a forehead narrower than the cheeks under it — the eyes then
 * sit on the front-facing slope between the two instead of under a box corner.
 */
export const HEAD_ROWS = [
  [-0.085, 0.035, 0.03, 0.03, 0.03, 2.0, 0],
  [-0.06, 0.038, 0.08, 0.07, 0.08, 2.3, 0.05],
  [-0.02, 0.04, 0.1, 0.09, 0.1, 2.8, 0.1],
  [0.03, 0.04, 0.104, 0.097, 0.11, 3.0, 0.14], // braincase: the crown 0.137 up and flat, narrower than the cheeks below
  [0.08, 0.036, 0.114, 0.092, 0.116, 2.9, 0.22], // zygomatic arches and the cheek ruff: the widest point of the face
  [0.125, 0.03, 0.114, 0.086, 0.108, 2.7, 0.2], // the temples fall in toward the brow
  [0.165, 0.024, 0.096, 0.074, 0.084, 2.4, 0.25], // eye plane: the forehead between the orbits narrower than the cheeks; the ball's front flush with the skin
  [0.2, 0.018, 0.076, 0.06, 0.064, 2.7, 0.18], // the stop, root of the muzzle
  [0.26, 0.014, 0.07, 0.056, 0.058, 3.0, 0.12], // muzzle: a deep box about 60 % of the cheek width, the bridge level, the upper lip hanging below the centre
  [0.32, 0.016, 0.068, 0.053, 0.056, 3.0, 0.08], // whisker pads
  [0.345, 0.02, 0.062, 0.05, 0.052, 2.8, 0.05],
  [0.353, 0.026, 0.046, 0.04, 0.044, 2.2, 0], // blunt nose end: the front is a face, not a point
];

export const HEAD_Z0 = HEAD_ROWS[0][0];
export const HEAD_Z1 = HEAD_ROWS[HEAD_ROWS.length - 1][0];
/** The loft changes atlas region here: skull behind, muzzle ahead. */
export const HEAD_SPLIT = 0.2;

/** The lower jaw, on the jaw bone: [z, cy, rx, ryTop, ryBot]. Chin at the end. */
export const JAW_ROWS = [
  // behind the mouth corner the jaw sits inside the head (the cheek and jowl
  // are the upper loft's), so nothing of it bulges under the cheek
  [0.04, -0.05, 0.06, 0.03, 0.016],
  [0.12, -0.05, 0.06, 0.03, 0.022],
  // ahead of the corner it hangs about 2.5 cm under the upper lip, its top
  // inside the lip's box and narrower than the muzzle, so no pale sliver of it
  // pokes through the lip
  [0.2, -0.052, 0.052, 0.024, 0.02],
  [0.26, -0.05, 0.044, 0.02, 0.018],
  [0.29, -0.05, 0.034, 0.014, 0.015], // chin, tucked behind the upper lip
  [0.302, -0.048, 0.014, 0.008, 0.008],
];

/** Where the features are, in head metres (mirrored in x). */
export const FACE = {
  // the lid joints (spec.js HEAD_JOINTS): the ball's centre sits 14 mm under
  // the unsculpted skin along its gaze, so the cornea stands just proud of the
  // face between the brow and the cheek once the socket is carved
  eye: [0.058, 0.06, 0.165],
  eyeR: 0.0195,
  nose: [0, 0.04, 0.342], // centre of the nose leather, its top level with the bridge
  noseW: 0.072,
  noseH: 0.048,
  mouthCorner: [0.068, -0.046, 0.18],
  whiskerPad: [0.054, -0.008, 0.3],
};

/** Monotone cubic (Catmull-Rom) interpolation of a row table in its first column. */
export function rowsAt(rows, z) {
  const n = rows.length;
  if (z <= rows[0][0]) return rows[0].slice(1);
  if (z >= rows[n - 1][0]) return rows[n - 1].slice(1);
  let i = 0;
  while (i < n - 2 && z > rows[i + 1][0]) i++;
  const p0 = rows[Math.max(0, i - 1)];
  const p1 = rows[i];
  const p2 = rows[i + 1];
  const p3 = rows[Math.min(n - 1, i + 2)];
  const h = p2[0] - p1[0];
  const t = (z - p1[0]) / h;
  const out = [];
  for (let k = 1; k < p1.length; k++) {
    // tangents from the neighbours, scaled to this interval's width
    const m1 = (p2[k] - p0[k]) / (p2[0] - p0[0]) * h;
    const m2 = (p3[k] - p1[k]) / (p3[0] - p1[0]) * h;
    const t2 = t * t;
    const t3 = t2 * t;
    out.push((2 * t3 - 3 * t2 + 1) * p1[k] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[k] + (t3 - t2) * m2);
  }
  return out;
}

/**
 * A point on the (unsculpted) upper-head section at z, at angle `a` around the
 * section from straight down (a = 0 under the lip, π/2 the right side, π the
 * crown). Superellipse parametrisation, so a boxy section stays boxy.
 */
export function headPoint(z, a, out = [0, 0, 0]) {
  const [cy, rx, ryTop, ryBot, n, taper] = rowsAt(HEAD_ROWS, z);
  const ca = Math.sin(a);
  const sa = -Math.cos(a);
  const e = 2 / n;
  const ry = sa >= 0 ? ryTop : ryBot;
  out[0] = rx * Math.sign(ca) * Math.pow(Math.abs(ca), e) * topTaper(sa, taper);
  out[1] = cy + ry * Math.sign(sa) * Math.pow(Math.abs(sa), e);
  out[2] = z;
  return out;
}

/** Width factor of a section at height fraction `sa` (−1 bottom, 1 top) for a row's taper. */
export function topTaper(sa, taper) {
  return sa > 0 ? 1 - taper * Math.pow(sa, 1.6) : 1;
}

/**
 * Sculpt over the loft: soft bumps in head metres, mirrored in x,
 * [cx, cy, cz, rx, ry, rz, amount]. The brow ridge shades the socket, the
 * zygomatic arch and masseter make the cheek the widest part of the face, the
 * whisker pads swell the muzzle ahead of the tear line; the stop and the
 * temple are hollows.
 */
export const HEAD_BUMPS = [
  [0.045, 0.104, 0.15, 0.04, 0.018, 0.03, 0.01], // brow ridge: a ledge on the top edge over the socket
  [0.0, 0.1, 0.1, 0.04, 0.03, 0.045, 0.005], // frontal boss
  [0.0, 0.078, 0.205, 0.035, 0.02, 0.03, -0.01], // the stop
  [0.106, 0.0, 0.12, 0.03, 0.035, 0.05, 0.012], // zygomatic arch
  [0.088, -0.056, 0.1, 0.036, 0.04, 0.05, 0.012], // masseter / jowl
  [0.054, -0.008, 0.3, 0.03, 0.03, 0.042, 0.009], // whisker pad
  [0.0, 0.064, 0.28, 0.042, 0.02, 0.06, 0.004], // the flat nose bridge
  [0.1, 0.07, 0.06, 0.03, 0.035, 0.04, -0.006], // temple
];

export function headBump(x, y, z) {
  let o = 0;
  const ax = Math.abs(x);
  for (const [cx, cy, cz, rx, ry, rz, amt] of HEAD_BUMPS) {
    const dx = (ax - cx) / rx;
    const dy = (y - cy) / ry;
    const dz = (z - cz) / rz;
    const d = dx * dx + dy * dy + dz * dz;
    if (d < 9) o += amt * Math.exp(-d * 1.6);
  }
  return o;
}
