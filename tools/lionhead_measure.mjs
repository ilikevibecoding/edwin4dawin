#!/usr/bin/env node
// Skull proportions of the tier-0 head mesh, in unit head metres, against the
// adult-lioness targets (round 5 brief), straight from the generator in node.
//
//   node tools/lionhead_measure.mjs                 # lioness, tier 0
//   node tools/lionhead_measure.mjs --kind male --tier 1
//   node tools/lionhead_measure.mjs --json          # machine-readable
//
// Everything is measured on the vertices head.js emits, classified by the
// atlas tile their UVs land in (skull, muzzle, nose, jaw, ears, eyes, lids),
// after transforming them back into head space (head joint at the origin,
// forward +z, up +y) and dividing by the kind's head scale. L is the nose tip
// to the occiput (the rear pole of the upper loft); every ratio is over L.
import * as THREE from 'three';
import { buildSkeleton } from '../src/wildlife/lion/rig.js';
import { EYE, EYE_LIDS, KINDS } from '../src/wildlife/lion/spec.js';
import { DETAIL, SkinBuilder } from '../src/wildlife/lion/geometry.js';
import { addHead } from '../src/wildlife/lion/head.js';
import { ATLAS } from '../src/wildlife/lion/textures.js';
import { FACE, EYE_FRAME, almondOpen } from '../src/wildlife/lion/headspec.js';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const kind = arg('kind', 'lioness');
const tier = Number(arg('tier', '0'));
const json = argv.includes('--json');

const skel = buildSkeleton(kind);
const K = KINDS[kind];
const s = K.scale * K.head;
const body = new SkinBuilder();
const alpha = new SkinBuilder();
addHead(body, alpha, skel, K, DETAIL[tier]);

// head space: undo the head bone's frame (bone +Y forward, +Z down)
const hr = skel.rest.get('head');
const frame = new THREE.Matrix4().compose(hr.pos, hr.quat, new THREE.Vector3(1, 1, 1));
const headFrame = new THREE.Matrix4().multiplyMatrices(frame, new THREE.Matrix4().makeRotationX(-Math.PI / 2));
const toHead = headFrame.clone().invert();
const boneFrame = (name) => {
  const r = skel.rest.get(name);
  return new THREE.Matrix4().compose(r.pos, r.quat, new THREE.Vector3(1, 1, 1));
};
const inHead = (m) => {
  const p = new THREE.Vector3().setFromMatrixPosition(m).applyMatrix4(toHead).multiplyScalar(1 / s);
  return [p.x, p.y, p.z];
};

// the tile a vertex's uv lands in, by the deepest margin inside a rect (a
// vertex on a seam shared by two tiles — the eye's u = 0 column lies on the
// nose tile's edge — goes to the eye by proximity to the ball)
const eyeC = (() => {
  const r = skel.rest.get('lidL');
  const p = r.pos.clone().applyMatrix4(toHead).multiplyScalar(1 / s);
  return [p.x, p.y, p.z];
})();
const eyeRad = EYE.r * EYE_LIDS.scale;
const boneTile = new Map([
  [skel.index.get('earL'), 'earOut'],
  [skel.index.get('earR'), 'earOut'],
  [skel.index.get('lidL'), 'lid'],
  [skel.index.get('lidR'), 'lid'],
  [skel.index.get('jaw'), 'jaw'],
]);
const tileOf = (u, v, x, y, z, bone) => {
  // parts on their own bones first (a jaw vertex can land on the corner the
  // nose tile shares with it), then the eye by proximity, then the tile
  if (boneTile.has(bone)) return boneTile.get(bone);
  if (Math.hypot(Math.abs(x) - eyeC[0], y - eyeC[1], z - eyeC[2]) < eyeRad * 1.13) return 'eye';
  let best = 'none';
  let bm = -1;
  let bd = Infinity;
  for (const [name, r] of Object.entries(ATLAS)) {
    const m = Math.min(u - r[0], r[2] - u, v - r[1], r[3] - v);
    // a vertex on a tile corner (the ear cup's centre lands on one) goes to
    // the tile whose centre is nearest
    const d = Math.hypot(u - (r[0] + r[2]) / 2, v - (r[1] + r[3]) / 2);
    if (m >= 0 && (m > bm + 1e-9 || (Math.abs(m - bm) <= 1e-9 && d < bd))) {
      bm = m;
      bd = d;
      best = name;
    }
  }
  return best;
};
const verts = [];
const v3 = new THREE.Vector3();
for (let i = 0; i < body.count; i++) {
  v3.set(body.pos[i * 3], body.pos[i * 3 + 1], body.pos[i * 3 + 2]).applyMatrix4(toHead).multiplyScalar(1 / s);
  verts.push({ x: v3.x, y: v3.y, z: v3.z, tile: tileOf(body.uv[i * 2], body.uv[i * 2 + 1], v3.x, v3.y, v3.z, body.si[i * 4]) });
}
const of = (...tiles) => verts.filter((v) => tiles.includes(v.tile));
const max = (arr, f) => arr.reduce((m, v) => Math.max(m, f(v)), -Infinity);
const min = (arr, f) => arr.reduce((m, v) => Math.min(m, f(v)), Infinity);

const upper = of('skull', 'muzzle');
const jaw = of('jaw');
const ears = of('earOut', 'earIn');
const nose = of('nose');

// --- length and the crown ----------------------------------------------------
const noseTip = max([...upper, ...nose], (v) => v.z);
const occiput = min(upper, (v) => v.z);
const L = noseTip - occiput;
const crownY = max(upper, (v) => v.y);
const crownZ = upper.find((v) => v.y === crownY).z;
// the top line along the head, for the profile
const topAt = (z, w = 0.006) => max(upper.filter((v) => Math.abs(v.z - z) < w && Math.abs(v.x) < 0.02), (v) => v.y);
const widthAt = (z, w = 0.006) => 2 * max(upper.filter((v) => Math.abs(v.z - z) < w), (v) => Math.abs(v.x));

// --- width ------------------------------------------------------------------------
const zygX = max(upper, (v) => Math.abs(v.x));
const zygV = upper.find((v) => Math.abs(v.x) === zygX);
const zyg = 2 * zygX;

// --- eyes -----------------------------------------------------------------------------
const eyeL = inHead(boneFrame('lidL'));
const eyeR = EYE.r * EYE_LIDS.scale;
const ipd = 2 * Math.abs(eyeL[0]);
// the almond's medial corner: on the socket sphere, ~50 degrees off the gaze
// toward the midline about the eye's up axis (almondOpen pinches at 0.85 + start rad)
const F = EYE_FRAME;
const corner = (sideSign) => {
  const a = 0.85 + 0.05;
  const d = [F.g[0] * Math.cos(a) + sideSign * F.l[0] * Math.sin(a), F.g[1] * Math.cos(a) + sideSign * F.l[1] * Math.sin(a), F.g[2] * Math.cos(a) + sideSign * F.l[2] * Math.sin(a)];
  const r = eyeR * 1.12;
  return [eyeL[0] + d[0] * r, eyeL[1] + d[1] * r, eyeL[2] + d[2] * r];
};
// FACE.eye is the +x eye: the medial corner is whichever lies nearer the midline
const cA = corner(-1);
const cB = corner(+1);
const inner = Math.abs(cA[0]) < Math.abs(cB[0]) ? cA : cB;
const outer = inner === cA ? cB : cA;
const muzzleLen = noseTip - inner[2];

// --- muzzle box --------------------------------------------------------------------
const padZ = FACE.whiskerPad[2];
const muzzleBand = upper.filter((v) => v.z > padZ - 0.025 && v.z < padZ + 0.02);
const muzzleW = 2 * max(muzzleBand, (v) => Math.abs(v.x));
const midZ = padZ - 0.015;
const bridgeY = topAt(midZ, 0.01);
const chinY = min([...upper, ...jaw].filter((v) => Math.abs(v.z - midZ) < 0.03), (v) => v.y);
const muzzleDepth = bridgeY - chinY;
const chinFront = min([...upper, ...jaw].filter((v) => v.z > 0.2), (v) => v.y);
const faceH = crownY - chinFront;
const eyeLine = (eyeL[1] - chinFront) / faceH;
const cranium = crownY - eyeL[1];

// --- ears -------------------------------------------------------------------------------
const earBase = inHead(boneFrame('earL'));
const earFrame = boneFrame('earL');
const earAxis = new THREE.Vector3(0, 1, 0).transformDirection(earFrame).transformDirection(toHead);
const earSide = new THREE.Vector3(1, 0, 0).transformDirection(earFrame).transformDirection(toHead);
const earL = ears.filter((v) => v.x > 0);
const along = earL.map((v) => (v.x - earBase[0]) * earAxis.x + (v.y - earBase[1]) * earAxis.y + (v.z - earBase[2]) * earAxis.z);
const earH = Math.max(...along) - Math.min(...along);
// width: the widest extent of the ear across its axis, whatever way the cup
// is yawed (the dish is turned about its own axis to face forward-out)
const radial = earL.map((v, i) => {
  const d = [v.x - earBase[0] - earAxis.x * along[i], v.y - earBase[1] - earAxis.y * along[i], v.z - earBase[2] - earAxis.z * along[i]];
  return d;
});
let earW = 0;
for (let i = 0; i < radial.length; i++) {
  for (let j = i + 1; j < radial.length; j++) {
    const d = Math.hypot(radial[i][0] - radial[j][0], radial[i][1] - radial[j][1], radial[i][2] - radial[j][2]);
    if (d > earW) earW = d;
  }
}
void earSide;
const earTipY = max(earL, (v) => v.y);
const earLean = (Math.acos(Math.abs(earAxis.y)) * 180) / Math.PI;
const earForward = (Math.atan2(earAxis.z, earAxis.y) * 180) / Math.PI;

// --- iris visibility from straight ahead -----------------------------------------------
// the iris is the ball's cap within 52 degrees of the gaze (textures.js); the
// fraction of its area, projected along the animal's forward axis, that lies
// between the lid rims and inside the skin's almond (almondOpen with a hard
// edge) is what a viewer in front sees of it
let irisSeen = 0;
let irisAll = 0;
{
  const N = 400;
  const cap = (52 * Math.PI) / 180;
  const base = [F.g, F.u, F.l];
  for (let i = 0; i < N; i++) {
    const t = Math.acos(1 - (1 - Math.cos(cap)) * ((i + 0.5) / N));
    const m = Math.max(8, Math.round(64 * Math.sin(t)));
    for (let j = 0; j < m; j++) {
      const ph = ((j + 0.5) / m) * Math.PI * 2;
      const d = [0, 0, 0];
      for (let k = 0; k < 3; k++) d[k] = base[0][k] * Math.cos(t) + (base[1][k] * Math.cos(ph) + base[2][k] * Math.sin(ph)) * Math.sin(t);
      const w = Math.max(0, d[2]) * Math.sin(t) / m; // projected area toward a viewer ahead
      irisAll += w;
      if (almondOpen(d[0], d[1], d[2], 0.001, 0) > 0.5) irisSeen += w;
    }
  }
}
const irisFrac = irisSeen / irisAll;

// --- nose leather -------------------------------------------------------------------
const noseW = nose.length ? 2 * max(nose, (v) => Math.abs(v.x)) : FACE.noseW;
const noseH = nose.length ? max(nose, (v) => v.y) - min(nose, (v) => v.y) : FACE.noseH;

// --- profile: the top line from the nose to the occiput ---------------------------------
const profile = [];
for (let z = Math.round(occiput * 100) / 100; z <= noseTip; z += 0.02) {
  const t = topAt(z, 0.011);
  if (Number.isFinite(t)) profile.push([Number(z.toFixed(2)), Number(t.toFixed(3)), Number(widthAt(z, 0.011).toFixed(3))]);
}

const r = (v) => Number((v / L).toFixed(3));
const rows = [
  ['head length L (nose tip to occiput)', L.toFixed(3), '1', '1'],
  ['zygomatic width / L', zyg.toFixed(3), r(zyg), '0.62-0.68'],
  ['muzzle length (nose tip to inner eye corner) / L', muzzleLen.toFixed(3), r(muzzleLen), '0.33'],
  ['muzzle width across the whisker pads / L', muzzleW.toFixed(3), r(muzzleW), '0.32-0.35'],
  ['muzzle depth (bridge to chin) / L', muzzleDepth.toFixed(3), r(muzzleDepth), '0.33'],
  ['interpupillary / L', ipd.toFixed(3), r(ipd), '0.29'],
  ['interpupillary / zygomatic', '', (ipd / zyg).toFixed(3), '0.45'],
  ['eye line, fraction of face height from the chin', '', eyeLine.toFixed(3), '~0.60'],
  ['cranium height above the eye line / L', cranium.toFixed(3), r(cranium), '0.33'],
  ['face height (chin to crown) / L', faceH.toFixed(3), r(faceH), '~0.65-0.70'],
  ['ear height / L', earH.toFixed(3), r(earH), '0.25'],
  ['ear width / L', earW.toFixed(3), r(earW), '0.20'],
  ['ear base y above eye line / L', (earBase[1] - eyeL[1]).toFixed(3), r(earBase[1] - eyeL[1]), 'near brow (~0.1)'],
  ['ear base x / (zygomatic/2)', earBase[0].toFixed(3), (earBase[0] / zygX).toFixed(3), '~0.8 (skull corner)'],
  ['ear axis lean out from vertical (deg)', '', earLean.toFixed(0), '~30'],
  ['ear axis pitch (+ forward) (deg)', '', earForward.toFixed(0), '0 to -15'],
  ['iris disc visible from straight ahead (fraction)', '', irisFrac.toFixed(2), '>= 0.60'],
  ['nose leather width / L', noseW.toFixed(3), r(noseW), '0.15'],
  ['nose leather height / L', noseH.toFixed(3), r(noseH), '~0.1'],
];

const out = {
  kind,
  tier,
  L,
  noseTip,
  occiput,
  crown: [crownY, crownZ],
  zygomatic: { width: zyg, y: zygV.y, z: zygV.z },
  eye: { centre: eyeL, inner, outer, r: eyeR },
  muzzle: { len: muzzleLen, width: muzzleW, depth: muzzleDepth, bridgeY, chinY },
  chinFront,
  faceH,
  eyeLine,
  cranium,
  ear: { base: earBase, h: earH, w: earW, tipY: earTipY, lean: earLean, pitch: earForward },
  nose: { w: noseW, h: noseH },
  irisFrac,
  profile,
  tris: body.idx.length / 3,
};
if (json) {
  console.log(JSON.stringify(out, null, 1));
} else {
  console.log(`${kind} tier ${tier}: L = ${L.toFixed(3)} head metres (nose tip z ${noseTip.toFixed(3)}, occiput z ${occiput.toFixed(3)}), crown y ${crownY.toFixed(3)} at z ${crownZ.toFixed(2)}, chin y ${chinFront.toFixed(3)}, eye centre (${eyeL.map((v) => v.toFixed(3)).join(', ')}); head tris ${out.tris}`);
  console.log(`widest at y ${zygV.y.toFixed(3)} z ${zygV.z.toFixed(3)}; ear base (${earBase.map((v) => v.toFixed(3)).join(', ')}), tip y ${earTipY.toFixed(3)}`);
  const w = [52, 9, 9, 16];
  const line = (c) => c.map((x, i) => String(x).padEnd(w[i])).join(' ');
  console.log(line(['measure', 'head m', 'ratio', 'target']));
  for (const row of rows) console.log(line(row));
  console.log('profile [z, top y, width]: ' + profile.map((p) => `${p[0]}:${p[1]}/${p[2]}`).join(' '));
}
