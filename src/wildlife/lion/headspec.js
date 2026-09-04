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

import { EYE_LIDS, HEAD_JOINTS } from './spec.js';

/**
 * [z, cy, rx, ryTop, ryBot, n, taper, bot]: `taper` narrows the upper half
 * toward the top (the width at the crown is rx × (1 − taper)), so across the
 * orbits the section is a forehead narrower than the cheeks under it; `bot`
 * narrows the lower half the same way, so the jaw is narrower than the muzzle
 * and the cheeks (see topTaper).
 */
export const HEAD_ROWS = [
  [-0.085, 0.035, 0.03, 0.03, 0.03, 2.0, 0, 0],
  // (the lower halves of the rear rows reach down into the neck loft: shallower
  // and the ground shows between throat and chest from the front)
  [-0.06, 0.038, 0.08, 0.064, 0.08, 2.3, 0.05, 0],
  [-0.02, 0.04, 0.1, 0.074, 0.1, 2.6, 0.08, 0],
  // the crown runs level from the occiput to the brow (a lion's skull is flat
  // on top; a dome over the braincase is the bear), its highest point the brow
  [0.03, 0.042, 0.106, 0.074, 0.11, 2.7, 0.07, 0.05], // braincase: a broad, low, flat forehead
  [0.08, 0.04, 0.116, 0.074, 0.114, 2.7, 0.09, 0.1], // zygomatic arches: the widest point of the head, a wide low oval from the front
  [0.125, 0.036, 0.114, 0.077, 0.104, 2.6, 0.12, 0.12], // the temples fall in toward the brow
  [0.165, 0.03, 0.1, 0.08, 0.074, 2.6, 0.1, 0.15], // eye plane: the orbit rims stand wide, the eyes tucked inside them
  // the muzzle rows carry the lower jaw too: the mouth line is painted across
  // the lower half (FACE.lipY), so what hangs below it is jaw and chin — made
  // narrower than the muzzle over it by the bottom taper — and the jaw loft
  // only adds the chin's point
  // (round 4: the cheek narrows into the muzzle root over four rows with the
  // exponent held, not a 2.6/2.7 step at the stop — the step read as a
  // boundary between pasted-on cheek pads and the muzzle)
  [0.18, 0.029, 0.09, 0.074, 0.072, 2.62, 0.1, 0.18], // the brow's front edge
  // the muzzle is a block, not a snout: boxy sections, the lower jaw nearly as
  // wide as the upper lip (the jowls hang over it; only the chin narrows), the
  // bridge sloping gently from a stop of two to three centimetres, and the
  // underside deep to the front so the muzzle ends in a blunt face under the
  // nose with the lip and chin dropping nearly vertical
  [0.2, 0.025, 0.078, 0.056, 0.072, 2.65, 0.07, 0.13], // the stop
  [0.215, 0.023, 0.07, 0.05, 0.07, 2.68, 0.06, 0.12], // root of the muzzle, a smaller rounded block hung under the eyes
  [0.255, 0.02, 0.063, 0.045, 0.064, 2.7, 0.04, 0.16], // muzzle: 55 % of the cheek width, 62 % with the whisker pads; bridge to chin about half the skull's depth; the bridge broad and flat
  // (round 4: the lower jaw tucks under the whisker pads toward the front —
  // the bottom taper grows to the nose end — so from the front the chin is a
  // small knob under the pads and not a second slab as wide as the lip, which
  // with the pale chin read as a grin)
  [0.285, 0.018, 0.062, 0.04, 0.06, 2.45, 0.03, 0.2], // whisker pads (rounder sections here: a boxy one folds into a shelf under the lip)
  [0.305, 0.016, 0.055, 0.034, 0.05, 2.3, 0.02, 0.22], // the lip recedes a little under the nose
  // the bridge falls about 17 degrees from the stop to the nose, so from the
  // front the nose sits well under the eyes, the mouth close under the nose
  [0.318, 0.012, 0.04, 0.028, 0.042, 2.2, 0, 0.24], // blunt nose end: the front is a face, not a point
];

export const HEAD_Z0 = HEAD_ROWS[0][0];
export const HEAD_Z1 = HEAD_ROWS[HEAD_ROWS.length - 1][0];
/** The loft changes atlas region here: skull behind, muzzle ahead. */
export const HEAD_SPLIT = 0.2;

/** The lower jaw, on the jaw bone: [z, cy, rx, ryTop, ryBot]. Chin at the end. */
export const JAW_ROWS = [
  // behind the mouth corner the jaw sits inside the head (the cheek and jowl
  // are the upper loft's), so nothing of it bulges under the cheek
  [0.04, -0.03, 0.05, 0.026, 0.016],
  [0.12, -0.028, 0.05, 0.024, 0.016],
  // ahead of the corner it is hidden under the upper lip (well inside the
  // tapered underside of the muzzle loft, so no edge of it shows under the
  // cheek as a tusk) but for the small chin at the front, under the nose
  [0.2, -0.034, 0.038, 0.016, 0.012],
  [0.26, -0.036, 0.03, 0.012, 0.012],
  [0.29, -0.032, 0.024, 0.01, 0.014], // the chin's point, half a centimetre under the loft's bottom
  [0.305, -0.03, 0.014, 0.008, 0.012],
];

/** Where the features are, in head metres (mirrored in x). */
export const FACE = {
  // the lid joints (spec.js HEAD_JOINTS): the ball's centre sits 14 mm under
  // the unsculpted skin along its gaze, so the cornea stands just proud of the
  // face between the brow and the cheek once the socket is carved
  eye: [0.047, 0.058, 0.19], // a lion's eyes are close set: 9.4 cm apart on a 23 cm skull, under the brow ridge at the root of the muzzle, the ball's centre 0.97 radii under the unsculpted skin along its gaze (traced through rowsAt + headBump; 70 % of the iris disc is unoccluded from straight ahead)
  eyeR: 0.0273, // EYE.r × EYE_LIDS.scale (spec.js): the ball head.js builds
  eyeSkin: 0.0306, // radius of the sphere the skin around the eye is kept outside of (1.12 × the ball)
  nose: [0, 0.02, 0.306], // centre of the nose leather, its top level with the bridge
  noseW: 0.09,
  noseH: 0.05,
  // the mouth ends in the jowl under the front corner of the eye, no further back
  mouthCorner: [0.06, -0.03, 0.205],
  // height of the mouth line along the muzzle: the corner, and at the nose
  // end — the line slopes down from under the nose to the corner
  lipY: [-0.03, -0.014],
  whiskerPad: [0.054, 0.0, 0.275],
};

/**
 * The right eye's frame in head space, from the lid joint's direction in
 * spec.js: gaze `g`, the up vector `u` square to it, the lateral axis `l`, and
 * the outward normals of the two lid-rim planes (each holds the lateral axis;
 * a direction's angle off `up` is positive under the upper lid, off `down`
 * positive above the lower). The left eye is the mirror.
 */
export const EYE_FRAME = (() => {
  const norm = (v) => {
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const g = norm(HEAD_JOINTS.lidL.dir);
  const u = norm([-g[0] * g[1], 1 - g[1] * g[1], -g[2] * g[1]]);
  const l = norm(cross(g, u));
  const rim = (pitch) => {
    const c = Math.cos(pitch);
    const s = Math.sin(pitch);
    const r = [g[0] * c + u[0] * s, g[1] * c + u[1] * s, g[2] * c + u[2] * s];
    let n = norm(cross(l, r));
    if ((n[0] * u[0] + n[1] * u[1] + n[2] * u[2]) * Math.sign(pitch) < 0) n = [-n[0], -n[1], -n[2]];
    return n;
  };
  return { g, u, l, up: rim(EYE_LIDS.up), down: rim(-EYE_LIDS.down) };
})();

/**
 * How open the skin is at a point (dx, dy, dz) from the right eye's centre
 * (mirror x for the left): 1 inside the almond between the lid rims — where
 * the skin dips into the ball and the iris shows — reaching 1 at `start`
 * radians outside each rim plane and falling to 0 over the next `soft`
 * radians (positive `start` grows the almond past the lid rims, for the
 * eyeline the painter draws on the skin around it). The almond pinches to its
 * corners short of the lateral axis: the skin keeps the ball covered
 * beyond about 55 degrees to the side (so the eye shows from the side too). Used by the head loft to carve the
 * socket and by the face painter to line the edge.
 */
export function almondOpen(dx, dy, dz, soft = 0.14, start = 0.02) {
  const id = 1 / Math.max(Math.hypot(dx, dy, dz), 1e-4);
  const F = EYE_FRAME;
  const dg = (dx * F.g[0] + dy * F.g[1] + dz * F.g[2]) * id;
  if (dg <= 0) return 0;
  const aUp = Math.asin(Math.max(-1, Math.min(1, (dx * F.up[0] + dy * F.up[1] + dz * F.up[2]) * id)));
  const aDn = Math.asin(Math.max(-1, Math.min(1, (dx * F.down[0] + dy * F.down[1] + dz * F.down[2]) * id)));
  const aL = Math.abs(Math.asin(Math.max(-1, Math.min(1, (dx * F.l[0] + dy * F.l[1] + dz * F.l[2]) * id))));
  return sstep(start + soft, start, aUp) * sstep(start + soft, start, aDn) * sstep(1.15 + start, 0.85 + start, aL);
}

function sstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

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
  const [cy, rx, ryTop, ryBot, n, taper, bot = 0] = rowsAt(HEAD_ROWS, z);
  const ca = Math.sin(a);
  const sa = -Math.cos(a);
  const e = 2 / n;
  const ry = sa >= 0 ? ryTop : ryBot;
  out[0] = rx * Math.sign(ca) * Math.pow(Math.abs(ca), e) * topTaper(sa, taper, bot);
  out[1] = cy + ry * Math.sign(sa) * Math.pow(Math.abs(sa), e);
  out[2] = z;
  return out;
}

/**
 * Width factor of a section at height fraction `sa` (−1 bottom, 1 top): the
 * upper half narrows toward the crown by `taper`, the lower half toward the
 * jaw's underside by `bot` (the lower jaw is narrower than the muzzle over it,
 * so the jowls hang over it and the mouth line turns under).
 */
export function topTaper(sa, taper, bot = 0) {
  return sa > 0 ? 1 - taper * Math.pow(sa, 1.6) : 1 - bot * Math.pow(-sa, 1.8);
}

/**
 * Sculpt over the loft: soft bumps in head metres, mirrored in x,
 * [cx, cy, cz, rx, ry, rz, amount]. The brow ridge shades the socket, the
 * zygomatic arch and masseter make the cheek the widest part of the face, the
 * whisker pads swell the muzzle ahead of the tear line; the stop and the
 * temple are hollows.
 */
export const HEAD_BUMPS = [
  [0.044, 0.09, 0.165, 0.04, 0.018, 0.032, 0.007], // brow ridge: a ledge on the top edge over the socket
  [0.0, 0.09, 0.15, 0.012, 0.015, 0.05, -0.005], // the groove between the brows
  [0.0, 0.1, 0.14, 0.05, 0.03, 0.04, 0.004], // frontal boss: the forehead a little domed just over the brows
  [0.0, 0.066, 0.21, 0.03, 0.02, 0.02, -0.005], // the stop
  [0.104, 0.0, 0.125, 0.036, 0.04, 0.065, 0.009], // zygomatic arch (broad and soft, so it tapers into the muzzle root)
  [0.086, -0.05, 0.1, 0.04, 0.045, 0.06, 0.009], // masseter / jowl
  [0.054, 0.006, 0.272, 0.03, 0.026, 0.04, 0.009], // whisker pad: a real swell, the follicle rows sit on it
  // the lower lip and chin fill in under the pads, so the pads do not
  // overhang a dark recess that reads as an open mouth from the front
  [0.02, -0.032, 0.285, 0.035, 0.018, 0.03, 0.006],
  [0.0, 0.06, 0.25, 0.036, 0.02, 0.05, 0.003], // the flat nose bridge
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
