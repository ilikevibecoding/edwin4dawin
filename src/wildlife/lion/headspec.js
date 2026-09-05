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
// below the centre. Lengthwise it runs from the occiput to the nose.
//
// Round 5 is proportions by number (tools/lionhead_measure.mjs reads them off
// the built mesh). With L the head length, nose tip to occiput (0.404 here):
// zygomatic width 0.65 L; muzzle length (nose tip to the eyes' inner corners)
// 0.33 L, width across the whisker pads 0.33 L, depth (bridge to chin) 0.33 L;
// interpupillary 0.29 L (0.45 of the cheek width); face height chin to crown
// about 0.6 L with the eye line at 63 % of it; ears 0.25 L by 0.2 L on the
// upper corners of the skull; nose leather 0.15 L. The round-4 head measured
// 0.59 / 0.30 / 0.35 / 0.28 / 0.23 / 0.41 / 0.37: a wide, low oval of a head
// with a huge nose and close-set eyes, which is a bear from the side and a
// hippo from the front.
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
  // the occiput: a rounded skull back, its pole a little above the head joint
  [-0.085, 0.045, 0.04, 0.045, 0.06, 2.0, 0, 0],
  // (the lower halves of the rear rows reach down into the neck loft: shallower
  // and the ground shows between throat and chest from the front)
  [-0.06, 0.05, 0.088, 0.075, 0.1, 2.4, 0.06, 0.05],
  // the crown: broad and flat between the ears, 0.16 over the head joint — the
  // cranium above the eye line is 0.22 L, which is what a lion skull gives
  // with its fur (the brief's 0.33 L was built twice, at 0.17 and 0.185, and
  // read as a bear's dome both times; the rest of the face is to the brief). The section is a tall box — flat
  // cheeks, a flat top, the corners square where the ears root (a crown that
  // narrows to a dome is the bear) — with its widest point just under the eye
  // line and the lower half drawing in toward the jaw, so from the front the
  // face is a wedge that narrows to the chin, not an oval widest at the jowls.
  [-0.02, 0.06, 0.112, 0.095, 0.125, 3.4, 0.08, 0.06],
  [0.03, 0.065, 0.118, 0.093, 0.135, 3.7, 0.08, 0.06], // braincase
  [0.08, 0.065, 0.122, 0.093, 0.14, 3.7, 0.08, 0.07], // zygomatic arches: the widest point of the head, 0.63 L across with the cheek sculpt
  [0.125, 0.06, 0.12, 0.085, 0.13, 3.4, 0.08, 0.08], // the forehead starts down toward the brow
  // the forehead falls in a straight line from the crown through the brow to
  // the stop, about 35 degrees: the eyes sit in that fall, under the brow
  // ledge and over the muzzle box, well inside the cheeks' outline (the eye
  // centre 3 cm in from the skin; round 4 had the balls on the skull's top
  // corners)
  [0.165, 0.046, 0.106, 0.06, 0.114, 2.9, 0.08, 0.08], // brow
  [0.18, 0.04, 0.09, 0.052, 0.11, 2.9, 0.08, 0.08], // eye plane: boxy, so the skin stands out to the ball's front at the eye's height
  // the muzzle rows carry the lower jaw too: the mouth line is painted across
  // the lower half (FACE.lipY), so what hangs below it is jaw and chin — made
  // only a little narrower than the muzzle over it (a bottom taper under 0.1:
  // the round-5 draft's 0.2 tapered the jaw to a hippo's rounded chin), so
  // the lower jaw fills the muzzle box — and the jaw loft adds the broad chin
  [0.2, 0.03, 0.08, 0.052, 0.104, 2.9, 0.06, 0.07], // the stop: a shallow step down to the bridge
  [0.215, 0.022, 0.073, 0.05, 0.1, 2.8, 0.04, 0.05], // root of the muzzle
  // the muzzle is a short deep box, not a snout: 0.33 L long, wide and deep;
  // the bridge broad, flat and high — the nose's top level with the eye's
  // lower rim, so the bridge falls only 2 cm from the stop to the nose — and
  // the underside as deep as the top is high, so the muzzle ends in a squared
  // face under the nose with the lip and chin dropping vertical
  [0.255, 0.0, 0.062, 0.056, 0.078, 2.7, 0.02, 0.03], // muzzle: 0.34 L across with the whisker pads, half the cheek width
  [0.285, -0.008, 0.058, 0.052, 0.07, 2.6, 0.01, 0.04], // whisker pads (rounder sections here: a boxy one folds into a shelf under the lip)
  [0.303, -0.008, 0.05, 0.046, 0.064, 2.4, 0, 0.06], // the lip recedes a little under the nose
  [0.315, -0.004, 0.036, 0.036, 0.054, 2.3, 0, 0.08], // blunt nose end: the front is a face, not a point; the leather stands 4 mm proud of it
];

export const HEAD_Z0 = HEAD_ROWS[0][0];
export const HEAD_Z1 = HEAD_ROWS[HEAD_ROWS.length - 1][0];
/** The loft changes atlas region here: skull behind, muzzle ahead. */
export const HEAD_SPLIT = 0.2;

/** The lower jaw, on the jaw bone: [z, cy, rx, ryTop, ryBot]. Chin at the end. */
export const JAW_ROWS = [
  // behind the mouth corner the jaw sits inside the head (the cheek and jowl
  // are the upper loft's), so nothing of it bulges under the cheek
  [0.04, -0.05, 0.05, 0.026, 0.02],
  [0.12, -0.052, 0.05, 0.024, 0.02],
  // ahead of the corner it is hidden under the upper lip (well inside the
  // tapered underside of the muzzle loft, so no edge of it shows under the
  // cheek as a tusk) but for the chin at the front, under the nose
  [0.2, -0.066, 0.04, 0.016, 0.014],
  [0.26, -0.066, 0.042, 0.012, 0.014],
  [0.29, -0.066, 0.038, 0.011, 0.014], // the chin: broad and squared, half a centimetre under the loft's bottom
  [0.305, -0.06, 0.026, 0.008, 0.01],
];

/** Where the features are, in head metres (mirrored in x). */
export const FACE = {
  // the lid joints (spec.js HEAD_JOINTS): the ball's centre sits about a
  // radius under the unsculpted skin along its gaze, so the cornea stands
  // just proud of the face between the brow and the cheek once the socket is
  // carved
  // round 5: 11.7 cm apart on a 40 cm head (0.29 L, 0.45 of the cheek width),
  // the eye line at 63 % of the face height from the chin — the ball's
  // bottom level with the top of the muzzle box at the stop, the nose leather
  // 6 cm under the eye's centre (the draft that had the bridge level with the
  // eye's lower rim was the hippo) — and the inner corners 0.32 L behind the
  // nose tip; the ball's centre 3.4 cm inside the cheek's
  // skin, so the eyes sit in the face rather than on its corners
  eye: [0.0585, 0.07, 0.168],
  eyeR: 0.0261, // EYE.r × EYE_LIDS.scale (spec.js): the ball head.js builds
  eyeSkin: 0.0293, // radius of the sphere the skin around the eye is kept outside of (1.12 × the ball)
  // centre of the nose leather at the squared front of the muzzle, its top
  // level with the bridge; 0.15 L wide (round 4's 0.09 was 0.37 L: a hippo's)
  nose: [0, 0.012, 0.308],
  noseW: 0.066,
  noseH: 0.04,
  // the mouth ends in the jowl under the front corner of the eye, no further back
  mouthCorner: [0.062, -0.064, 0.2],
  // height of the mouth line along the muzzle: the corner, and at the nose
  // end — the line runs nearly level from under the nose to the corner (a
  // slope of more than a centimetre read as a smile) and only the corner
  // itself turns down into the jowl; the chin hangs 4 cm under it
  lipY: [-0.064, -0.044],
  whiskerPad: [0.05, -0.02, 0.275],
};

/**
 * The right eye's frame in head space, from the lid joint's direction in
 * spec.js: gaze `g`, the up vector `u` square to it, the lateral axis `l`, and
 * the outward normals of the two lid-rim planes (each holds the lateral axis;
 * a direction's angle off `up` is positive under the upper lid, off `down`
 * positive above the lower). `u` is rolled EYE_LIDS.roll about the gaze
 * toward the outside of the face, so the almond's outer corner sits a little
 * higher than the inner one (a cat's eye slants up and out); head.js rolls
 * the lid caps the same way. The left eye is the mirror.
 */
export const EYE_FRAME = (() => {
  const norm = (v) => {
    const l = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / l, v[1] / l, v[2] / l];
  };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const g = norm(HEAD_JOINTS.lidL.dir);
  const u0 = norm([-g[0] * g[1], 1 - g[1] * g[1], -g[2] * g[1]]);
  const l0 = norm(cross(g, u0));
  // the lateral direction is the one with positive x (the right eye's frame)
  const lat = l0[0] >= 0 ? l0 : [-l0[0], -l0[1], -l0[2]];
  const roll = EYE_LIDS.roll ?? 0;
  const u = norm([u0[0] * Math.cos(roll) + lat[0] * Math.sin(roll), u0[1] * Math.cos(roll) + lat[1] * Math.sin(roll), u0[2] * Math.cos(roll) + lat[2] * Math.sin(roll)]);
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
 * beyond about 60 degrees to the side (so the eye shows from the side too);
 * with the lids at 34 / 30 degrees the opening is 1.6 times as wide as it is
 * tall, a cat's almond and not a round button. Used by the head loft to carve the
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
  return sstep(start + soft, start, aUp) * sstep(start + soft, start, aDn) * sstep(1.25 + start, 0.95 + start, aL);
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
  [0.06, 0.095, 0.168, 0.045, 0.02, 0.034, 0.012], // brow ridge: a straight ledge over the socket
  [0.0, 0.09, 0.17, 0.02, 0.022, 0.05, -0.006], // the groove between the brows: the forehead is a shallow trough between the two orbital ridges
  [0.0, 0.078, 0.205, 0.03, 0.02, 0.025, -0.01], // the stop
  [0.122, 0.035, 0.13, 0.036, 0.045, 0.065, 0.008], // zygomatic arch (broad and soft, so it tapers into the muzzle root)
  [0.105, -0.04, 0.1, 0.04, 0.05, 0.06, 0.008], // masseter
  [0.08, -0.05, 0.19, 0.03, 0.03, 0.04, 0.008], // jowl: the cheek hangs out over the mouth corner, so the corner is under it from the front
  [0.048, -0.022, 0.274, 0.026, 0.026, 0.04, 0.016], // whisker pad: a real swell, the follicle rows sit on it
  // the lower lip and chin fill in under the pads, so the pads do not
  // overhang a dark recess that reads as an open mouth from the front
  [0.02, -0.068, 0.285, 0.035, 0.02, 0.03, 0.005],
  [0.0, 0.045, 0.25, 0.036, 0.02, 0.05, 0.003], // the flat nose bridge
  [0.1, 0.09, 0.09, 0.03, 0.04, 0.045, -0.006], // temple: the hollow over the arch behind the eye
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
