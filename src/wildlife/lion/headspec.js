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
 * [z, cy, rx, ryTop, ryBot, n, taper, bot, nBot, tp]: `taper` narrows the
 * upper half toward the top (the width at the crown is rx × (1 − taper)), so
 * across the orbits the section is a forehead narrower than the cheeks under
 * it; `bot` narrows the lower half the same way, so the jaw is narrower than
 * the muzzle and the cheeks (see topTaper). Round 8: `nBot` is the lower
 * half's own superellipse exponent, where `n` is the upper half's (the
 * muzzle's upper half is a rounded ridge, its lower half a broader lip), and
 * `tp` is the power the taper grows with up the half (topTaper: 1.6 bites
 * only near the crown, a ridge; 1.0 is a straight lean from the widest row
 * up, a trapezoid).
 */
export const HEAD_ROWS = [
  // the occiput: a rounded skull back, its pole a little above the head joint
  [-0.085, 0.045, 0.04, 0.045, 0.06, 2.0, 0, 0, 2.0, 1.6],
  // (the lower halves of the rear rows reach down into the neck loft: shallower
  // and the ground shows between throat and chest from the front)
  [-0.06, 0.04, 0.088, 0.085, 0.09, 2.6, 0.14, 0.05, 2.4, 1.2],
  // the crown: broad and flat between the ears, 0.16 over the head joint — the
  // cranium above the eye line is 0.22 L, which is what a lion skull gives
  // with its fur (the brief's 0.33 L was built twice, at 0.17 and 0.185, and
  // read as a bear's dome both times; the rest of the face is to the brief).
  // Round 8: the section is a trapezoid widest at the zygomatic arches, 3 cm
  // UNDER the eye line (cy 0.036-0.04, where rounds 5-7 had the widest row at
  // the eye line itself), its sides leaning straight in from there to the
  // ear roots (taper 0.2-0.28 at power 1.0: 0.83 of the arches' width 3 cm
  // over the eye line, 0.77 at the ear roots, where round 7's box was 0.91
  // and 0.87 — every critic's flat-browed bear from the front) with a flat
  // crown between the ears (exponent 4-4.5: the corners square where the
  // ears root; a crown that narrows to a dome is the bear) and the lower
  // half drawing in toward the jaw (bot 0.1-0.15), so from the front the
  // face is a wedge widest at the cheekbones. The rx and the bottom line are
  // unchanged, so the zygomatic width (0.63 L) and every ratio measured on it
  // hold; HEAD_BUMPS hollows the temple between the brow and the ear.
  [-0.02, 0.04, 0.112, 0.115, 0.105, 4.0, 0.2, 0.1, 3.0, 1.0],
  [0.03, 0.038, 0.118, 0.12, 0.108, 4.4, 0.2, 0.12, 3.0, 1.0], // braincase
  [0.08, 0.036, 0.122, 0.122, 0.111, 4.5, 0.22, 0.13, 3.0, 1.0], // zygomatic arches: the widest point of the head, 0.63 L across with the cheek sculpt
  [0.125, 0.04, 0.12, 0.105, 0.11, 4.0, 0.28, 0.15, 2.8, 1.0], // the forehead starts down toward the brow
  // the forehead falls in a straight line from the crown through the brow to
  // the stop, about 35 degrees: the eyes sit in that fall, under the brow
  // ledge and over the muzzle box, well inside the cheeks' outline (the eye
  // centre 3 cm in from the skin; round 4 had the balls on the skull's top
  // corners). Round 8: the forehead over the eyes is 1.4 interpupillary
  // distances wide at the brow's top (taper 0.24; round 7's 0.1 gave 1.6, a
  // plateau from temple to temple).
  [0.165, 0.044, 0.106, 0.062, 0.112, 3.0, 0.26, 0.14, 2.6, 1.3], // brow
  // round 7: the cheek arch — the zygomatic's width is held forward under
  // the eye (0.85 of the skull half-width at z 0.178, where round 6 had
  // already tapered to 0.74) and the section's widest point sits low, at the
  // arch, so the eye looks out over a shelf of cheek and the muzzle is a
  // narrower volume stepping in from it over the next two rows (critic A:
  // "no zygomatic shelf"; the round-6 fold crease alone did not read)
  // Round 8: under the arch the section draws in toward the jaw line (bot
  // 0.08 → 0.15-0.2, nBot 2.4-2.5): the lower face at the mouth corner is a
  // wedge from the cheeks to the jaw, not a box as wide at the lip as at the
  // cheek (critic B's "rectangular muzzle block").
  [0.178, 0.04, 0.1, 0.052, 0.112, 2.8, 0.26, 0.15, 2.5, 1.6], // cheek arch: eye plane, the cheek widest under the eye
  // The stop is a real step: the top of these three rows drops a centimetre
  // and a half (0.052 → 0.038 / 0.036 / 0.042 over the centre line), so the
  // forehead's fall ends at a plane level with the eye's centre and the
  // eyes look out over the bridge (round 6: with the round-5 heights the
  // muzzle's top corner at the eye's x hid the lower half of the iris from
  // the face camera — raycast 0.46 of the disc; 0.62 with this).
  [0.19, 0.036, 0.09, 0.038, 0.108, 2.7, 0.28, 0.18, 2.4, 1.6],
  // Round 8: the muzzle rows carry the upper lip only. Round 7's rows ran on
  // down to y −0.078 past the mouth line (painted at FACE.lipY and creased
  // in), so the "lower lip" was 2.8 cm of the same loft under a groove and
  // the mouth read as a line drawn across a loaf; now the loft's underside
  // sits 6-7 mm under the lip line and IS the upper lip's edge, broad and
  // flat (nBot 2.6), and the lower lip and chin are the jaw loft (JAW_ROWS)
  // hanging under it 8-9 mm inside its width — an upper lip that overhangs.
  // The bottom taper draws the sides in under the whisker pads toward that
  // edge (0.78 of the pad width at the lip), so the section is a rounded
  // block widest at the pads, not a box with vertical sides.
  [0.2, 0.03, 0.08, 0.036, 0.104, 2.6, 0.32, 0.18, 2.4, 1.6], // the stop: the step down to the bridge
  [0.215, 0.022, 0.073, 0.042, 0.09, 2.5, 0.38, 0.14, 2.5, 1.6], // root of the muzzle: the lip edge starts to lift toward the pads
  // Round 7: the muzzle's cross-section is round. Round 6 built it as a box
  // (exponents 3.1-3.2 through the stop and root, no top taper), and at 1280
  // every critic read a loaf with a flat top and a flat front. The rows are
  // now a superellipse of exponent 2.5 whose upper half narrows hard toward
  // the top (`taper` 0.38-0.45: the width a third of the way up the upper
  // half is 0.9 of the pad width, two thirds up 0.75), which is the nasal
  // bridge as a rounded ridge falling to the whisker pads at the sides — the
  // pads are the widest part of a lion's muzzle, the bridge a hand's width
  // over them. Top line and pad width are unchanged, so the muzzle ratios
  // (0.33 L long, 0.34 L across, 0.34 L deep — the depth now to the jaw's
  // chin) hold. Round 8: the centre line sits at the pads' height (the
  // section's widest row is the pads), upper exponent 2.3.
  [0.255, -0.01, 0.062, 0.066, 0.05, 2.3, 0.42, 0.12, 2.0, 1.6], // muzzle: 0.34 L across with the whisker pads, half the cheek width; lip edge y −0.06
  [0.285, -0.016, 0.058, 0.06, 0.038, 2.3, 0.42, 0.12, 2.0, 1.6], // whisker pads; lip edge y −0.054
  // the front rounds off over the last two centimetres instead of ending in
  // a flat disc (round 6's cap at z 0.315 was 7 by 9 cm of vertical plane
  // under the nose): the pads draw in to the nose end in plan, the lip
  // drops nearly vertical under the leather and the leather block stands
  // on the rounded top. The last row is a 2.4 cm sliver — the front of the
  // philtrum and lip — so the head length (nose tip z 0.321) is unchanged.
  [0.303, -0.014, 0.05, 0.052, 0.042, 2.3, 0.4, 0.12, 2.3, 1.6], // the lip hangs on under the nose, its edge over the chin (the underside squarer toward the front, so the chin sits under it and not out past a keel)
  [0.312, -0.012, 0.04, 0.044, 0.041, 2.2, 0.36, 0.14, 2.5, 1.6],
  [0.318, -0.01, 0.026, 0.034, 0.04, 2.2, 0.3, 0.16, 2.6, 1.6],
  [0.321, -0.008, 0.012, 0.019, 0.04, 2.0, 0.2, 0.2, 2.6, 1.6], // nose end: the philtrum's front under the leather
];

export const HEAD_Z0 = HEAD_ROWS[0][0];
export const HEAD_Z1 = HEAD_ROWS[HEAD_ROWS.length - 1][0];
/** The loft changes atlas region here: skull behind, muzzle ahead. */
export const HEAD_SPLIT = 0.2;

/**
 * The lower jaw, on the jaw bone: [z, cy, rx, ryTop, ryBot]. Chin at the end.
 * Round 8: ahead of the mouth corner its top sits 8-10 mm up inside the upper
 * loft (whose underside is now the upper lip's edge, HEAD_ROWS) and it is 0.5
 * of the pads' width, so what shows under the lip edge in profile and from
 * the front is a lower lip and chin narrower than the upper lip hanging
 * over them; its bottom line is where round 7's was, so the muzzle depth to
 * the chin (0.34 L) holds.
 */
export const JAW_ROWS = [
  // behind the mouth corner the jaw sits inside the head (the cheek and jowl
  // are the upper loft's), so nothing of it bulges under the cheek
  [0.04, -0.05, 0.05, 0.026, 0.02],
  [0.12, -0.052, 0.05, 0.024, 0.02],
  // ahead of the corner it is hidden under the upper lip (well inside the
  // tapered underside of the muzzle loft, so no edge of it shows under the
  // cheek as a tusk) but for the chin at the front, under the nose
  [0.2, -0.062, 0.038, 0.014, 0.016],
  [0.26, -0.068, 0.025, 0.018, 0.013],
  [0.285, -0.067, 0.022, 0.016, 0.012], // the chin: its top 8 mm up inside the lip, 0.8 of the lip's width there, so no shelf of it shows from above
  [0.298, -0.067, 0.014, 0.01, 0.01], // and rounded off to the front and down, under the lip's edge, no flat disc under the nose (a squared pale chin read as teeth)
  [0.304, -0.066, 0.005, 0.004, 0.005],
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
  // (round 6: sunk 6 mm back into the skull — HEAD_JOINTS.lidL less HEAD_REF;
  // round 7: 4 mm more, to 10 mm, with the lids opened to 0.55 / 0.68 rad
  // so the rims sit at the limbus and no lid cap shows over the iris)
  eye: [0.0585, 0.07, 0.158],
  eyeR: 0.0248, // EYE.r × EYE_LIDS.scale (spec.js): the ball head.js builds
  eyeSkin: 0.0277, // radius of the sphere the skin around the eye is kept outside of (1.12 × the ball)
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
 * beyond about 50 degrees to the side (so the eye shows from the side too);
 * with the lids at 34 / 30 degrees the opening is 1.5 times as wide as it is
 * tall, a cat's almond and not a round button. Round 8: the corners closed
 * from 54-72 degrees to 46-60 — the lid caps' rims are great circles through
 * the lateral axis, so between them the ball was bare out to 90 degrees, and
 * in the near-profile face view its lower outer quarter stood out of the
 * face as a sphere with no lid over it (critic: "the eyeball is still
 * proud"); now the skin, hugging the ball, closes over that quarter. Used by
 * the head loft to carve the socket and by the face painter to line the edge.
 */
export function almondOpen(dx, dy, dz, soft = 0.14, start = 0.02) {
  const id = 1 / Math.max(Math.hypot(dx, dy, dz), 1e-4);
  const F = EYE_FRAME;
  const dg = (dx * F.g[0] + dy * F.g[1] + dz * F.g[2]) * id;
  if (dg <= 0) return 0;
  const aUp = Math.asin(Math.max(-1, Math.min(1, (dx * F.up[0] + dy * F.up[1] + dz * F.up[2]) * id)));
  const aDn = Math.asin(Math.max(-1, Math.min(1, (dx * F.down[0] + dy * F.down[1] + dz * F.down[2]) * id)));
  const aL = Math.abs(Math.asin(Math.max(-1, Math.min(1, (dx * F.l[0] + dy * F.l[1] + dz * F.l[2]) * id))));
  return sstep(start + soft, start, aUp) * sstep(start + soft, start, aDn) * sstep(1.05 + start, 0.8 + start, aL);
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
  const [cy, rx, ryTop, ryBot, n, taper, bot = 0, nBot = n, tp = 1.6] = rowsAt(HEAD_ROWS, z);
  const ca = Math.sin(a);
  const sa = -Math.cos(a);
  const e = 2 / (sa >= 0 ? n : nBot);
  const ry = sa >= 0 ? ryTop : ryBot;
  out[0] = rx * Math.sign(ca) * Math.pow(Math.abs(ca), e) * topTaper(sa, taper, bot, tp);
  out[1] = cy + ry * Math.sign(sa) * Math.pow(Math.abs(sa), e);
  out[2] = z;
  return out;
}

/**
 * Where the head loft's `around` samples fall on a section (round 7). Angle
 * `a` runs from straight down under the lip (0) over the right side (π/2)
 * and the crown (π) and back; `um` is the texel column the painter draws
 * with (a / π, folded: both sides read the same column). The samples are
 * not evenly spaced: the density is 1.9× along the mouth line (a lion's lip
 * line sits 38-60 degrees off straight down through the muzzle rows, and the
 * 9 mm crease cut there needs three samples across it) and 1.35× over the
 * bridge's crest, and correspondingly thinner over the flat cheeks. The
 * texel coordinate follows the angle, not the sample index, so the painter's
 * linear a = u·π mapping still puts a mark where the geometry is.
 */
export function ringAngles(around) {
  const M = 720;
  const cdf = new Float64Array(M + 1);
  for (let i = 0; i < M; i++) {
    const a = ((i + 0.5) / M) * Math.PI;
    const lip = Math.exp(-Math.pow((a - 0.85) / 0.28, 2));
    const crest = Math.exp(-Math.pow((a - Math.PI) / 0.45, 2));
    cdf[i + 1] = cdf[i] + 1 + 0.9 * lip + 0.35 * crest;
  }
  const total = cdf[M];
  const invert = (t) => {
    // t in [0, 1] -> angle in [0, π]
    const target = t * total;
    let lo = 0;
    let hi = M;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] <= target) lo = mid;
      else hi = mid;
    }
    const f = (target - cdf[lo]) / Math.max(cdf[lo + 1] - cdf[lo], 1e-9);
    return ((lo + f) / M) * Math.PI;
  };
  const out = [];
  for (let k = 0; k <= around; k++) {
    const u = k / around;
    if (u <= 0.5) {
      const a = invert(u * 2);
      out.push({ a, um: a / Math.PI });
    } else {
      const a = invert((1 - u) * 2);
      out.push({ a: Math.PI * 2 - a, um: a / Math.PI });
    }
  }
  return out;
}

/**
 * Width factor of a section at height fraction `sa` (−1 bottom, 1 top): the
 * upper half narrows toward the crown by `taper`, growing with the power `tp`
 * (1.6: a ridge, the lean all near the top; 1.0: a straight-sided trapezoid
 * from the widest row up), the lower half toward the jaw's underside by `bot`
 * (the lower jaw is narrower than the muzzle over it, so the jowls hang over
 * it and the mouth line turns under).
 */
export function topTaper(sa, taper, bot = 0, tp = 1.6) {
  return sa > 0 ? 1 - taper * Math.pow(sa, tp) : 1 - bot * Math.pow(-sa, 1.8);
}

/**
 * Sculpt over the loft: soft bumps in head metres, mirrored in x,
 * [cx, cy, cz, rx, ry, rz, amount]. The brow ridge shades the socket, the
 * zygomatic arch and masseter make the cheek the widest part of the face, the
 * whisker pads swell the muzzle ahead of the tear line; the stop and the
 * temple are hollows.
 */
export const HEAD_BUMPS = [
  // the brow: round 6 makes it one flat ledge across the forehead from
  // temple to temple (a plateau, `flat` 0.5: full over the inner half of its
  // footprint, off over the outer) instead of round 5's two Gaussian ridges
  // with a trough between them — a lion's forehead between the eyes is a
  // plane, and the two-mound version was the "brow of a plush" from the front
  [0.0, 0.095, 0.166, 0.115, 0.02, 0.032, 0.009, 0.5],
  [0.0, 0.078, 0.205, 0.03, 0.02, 0.025, -0.01], // the stop
  [0.122, 0.035, 0.13, 0.036, 0.045, 0.065, 0.009], // zygomatic arch (broad and soft, so it tapers into the muzzle root)
  [0.105, -0.04, 0.1, 0.04, 0.05, 0.06, 0.008], // masseter
  [0.08, -0.05, 0.19, 0.03, 0.03, 0.04, 0.008], // jowl: the cheek hangs out over the mouth corner, so the corner is under it from the front
  // round 6: the fold where the muzzle box meets the cheek — a vertical
  // crease from under the eye's outer corner down toward the mouth corner
  // (critic B), so the muzzle is a volume set into the face and not a loaf
  // tapering out of it
  [0.079, 0.0, 0.19, 0.016, 0.05, 0.012, -0.007],
  // round 6: the cheek ruff — the lower cheek behind the mouth corner and
  // over the jaw angle swells, so from the side the jaw line reads as a
  // square cheek under the eye instead of a bear's rounded cheek falling
  // straight into the neck — with the jowl fold under it, a crease between
  // the ruff and the throat
  [0.1, -0.048, 0.075, 0.03, 0.045, 0.05, 0.011],
  [0.085, -0.088, 0.06, 0.03, 0.018, 0.05, -0.007],
  [0.046, -0.022, 0.28, 0.026, 0.026, 0.04, 0.019], // whisker pad: a real swell, the follicle rows sit on it (round 8: 3 mm more, and 6 mm further forward, so the two lobes stand either side of the philtrum from the front)
  // the lower lip and chin fill in under the pads, so the pads do not
  // overhang a dark recess that reads as an open mouth from the front
  [0.02, -0.068, 0.285, 0.035, 0.02, 0.03, 0.005],
  // round 7: the bridge is a ridge (HEAD_ROWS taper), not a plate — the
  // round-6 flat-bridge bump is gone; in its place a soft rounding of the
  // ridge's crest so the top of the muzzle is a dome and not a keel
  [0.0, 0.05, 0.25, 0.02, 0.015, 0.05, 0.002],
  // round 8: the temporal fossa — a hollow a centimetre deep over the arch
  // behind the brow's outer end, from the eye's z back to the ear root, at
  // the brow's height (round 7's 6 mm dish sat lower, on the arch itself, and
  // the head-on silhouette ran straight from the arches to the ears); the
  // brow's outer end stands out over it as the postorbital corner, so from
  // the front the brow line ends in two corners with the temple dished behind
  // them, the way a lion's brow does
  [0.1, 0.1, 0.118, 0.032, 0.022, 0.028, -0.014],
  [0.09, 0.1, 0.158, 0.018, 0.016, 0.02, 0.009],
  // round 7: the zygomatic shelf — a plateau along the arch from under the
  // eye's outer corner back toward the ear root, 6 mm proud with a rim, so
  // the cheek under the eye is a bone with an edge and the masseter hollow
  // below it reads (critic A: "no zygomatic shelf"); set below and ahead of
  // the arch's widest point so the zygomatic width (0.63 L) is unchanged
  [0.1, 0.03, 0.15, 0.026, 0.018, 0.045, 0.006, 0.45],
  // (round 7 cut the mouth as a crease along the lip line here; round 8's
  // mouth is the upper loft's own lower edge over the jaw loft, and the
  // crease, which ran along that edge, notched it — gone)
  // and the philtrum: a groove down the front of the upper lip from the
  // leather to the lip line, 5 mm half-width
  [0.0, -0.024, 0.315, 0.006, 0.016, 0.018, -0.0045],
];

/**
 * Sum of the sculpt at a head-space point. A row's optional eighth value
 * `flat` makes it a plateau — full inside `flat` of its radius and falling
 * to nothing at the edge — where the default is a Gaussian mound; an optional
 * ninth `tilt` shears the footprint in y along z (dy per dz), for a feature
 * that runs along the head at a slope, like the mouth line.
 */
export function headBump(x, y, z) {
  let o = 0;
  const ax = Math.abs(x);
  for (const [cx, cy, cz, rx, ry, rz, amt, flat = 0, tilt = 0] of HEAD_BUMPS) {
    const dx = (ax - cx) / rx;
    const dy = (y - cy - tilt * (z - cz)) / ry;
    const dz = (z - cz) / rz;
    const d = dx * dx + dy * dy + dz * dz;
    if (flat > 0) {
      const r = Math.sqrt(d);
      if (r < 1) o += amt * (1 - sstep(flat, 1, r));
    } else if (d < 9) o += amt * Math.exp(-d * 1.6);
  }
  return o;
}
