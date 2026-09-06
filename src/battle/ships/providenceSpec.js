// Shared spec for the Providence-class model: palette, and the reference-measured layout of the dorsal
// spine and citadel, the raked command tower with its hammerhead bridge pod, the ventral fin, the stern
// engine array, the hangar trough openings, markings and seams. All longitudinal positions are given in
// `r` = metres aft of the bow tip (convert with fromRef); heights in metres above the hull datum (the
// bow tip sits at y = 0). Also the hull-following bar helpers used by the hull, bay and detail builders.
import * as THREE from "three";
import { clamp01, fromRef, lerp, loftRings, ringCap } from "./providenceGeo.js";

// palette (sRGB hex; converted to linear vertex tints where used). Hull tints are chosen so sunlit
// plating measures ~sRGB 140-175 through the shared `hull` material (x1.4 plating map); the reference
// hull is darkest on the lower body and chin, so the belly tint is the darkest of the three and the
// forward lower hull is darkened further in plateColor. The same constants tint every LOD (no per-LOD
// gain), so a ship keeps its grey when it drops to LOD 1/2.
export const PAL = {
  dorsal: 0x6e7889,
  flank: 0x808c9e,
  belly: 0x5e6673,
  finFace: 0x8592a5,
  super: 0x737d8d,
  dark: 0x363a42,
  darkLit: 0x4a5059,
  rust: 0x6a4630,
  trim: 0x8a4a28,
  slate: 0x2a3552, // the dark blue-grey painted rectangles on the flanks
  hazard: 0xb99a2c, // yellow hazard markings near the bow
  windowWarm: 0xffd8a6,
  windowCool: 0xbfe0ff,
  hangarLight: 0xa9d0ff,
  hangarDim: 0x4a6a96,
  engineCore: 0xe8f6ff,
  engineGlow: 0x8fc4ff,
  soot: 0x2a2320,
};
// one plating scale for the whole ship (hull faces, tower, ledges, heads): 36 m tiles with ~9 m
// sub-panels, so no face changes plate size where it meets its neighbour
export const PLATE_TEXEL = 1 / 36;

// ---------------------------------------------------------------------------
// Dorsal superstructure (side-view reference, heights above the datum; the aft keel sits at -52): the
// spine deck (r 160-545, top +56, blocks to +62) with mast clusters, a forward step block (+70), the
// broad citadel block (r 604-940, top +88) the tower rises from, and the narrower aft deck behind it
// (+60 to r 1040). Slabs are [r0, r1, y0, y1, half] (y0 is buried in the hull so nothing shows
// underneath). Widths come from the ROTS still: the citadel deck spans ~60 % of the beam under the
// tower (half 36 on a 59 half-beam), the spine deck ~40 % of the beam over the forward body.
// ---------------------------------------------------------------------------
export const SPINE = {
  r0: 135,
  r1: 545,
  y0: 24,
  y1: 56,
  half0: 15,
  half1: 14,
  nose: 40,
};
export const SPINE_BLOCKS = [
  [182, 232, 56, 60, 10],
  [262, 302, 56, 61, 11],
  [440, 540, 56, 62, 12],
];
export const CITADEL_FORE = { r0: 540, r1: 604, y0: 30, y1: 70, half: 30 };
export const CITADEL_LOWER = { r0: 596, r1: 952, y0: 30, y1: 60, half: 36 };
export const AFT_DECK = { r0: 940, r1: 1040, y0: 30, y1: 60, half: 27 };
export const CITADEL_UPPER = { r0: 596, r1: 940, y0: 56, y1: 88, half: 36 };
// masts: [x, r, yBase, yTop, radius]; the tall citadel and spine masts are heavy lattice-like spars,
// the bridge pod carries a forward mast and the tall aft lattice mast on its roof deck (+238)
export const MASTS = [
  [0, 266, 60, 76, 0.9],
  [0, 280, 60, 84, 1.1],
  [0, 296, 60, 78, 0.9],
  [5, 288, 60, 70, 0.6],
  [-5, 288, 60, 70, 0.6],
  [0, 462, 62, 76, 0.8],
  [0, 500, 62, 80, 0.9],
  [0, 540, 62, 74, 0.7],
  [0, 650, 88, 116, 1.3],
  [0, 668, 88, 120, 1.4],
  [0, 690, 88, 114, 1.3],
  [9, 660, 88, 106, 0.9],
  [-9, 660, 88, 106, 0.9],
  [9, 682, 88, 108, 0.9],
  [-9, 682, 88, 108, 0.9],
  [0, 976, 238, 262, 1.1],
  [0, 986, 238, 254, 0.7],
  [5, 962, 238, 250, 0.5],
  [-5, 962, 238, 250, 0.5],
  [0, 914, 238, 254, 0.6],
];

// ---------------------------------------------------------------------------
// Command tower: a thin blade leaning aft as a whole (leading edge raked 0.62, trailing edge 0.31;
// measured row by row on the side reference: chord 62 m at +108 narrowing to 27 m where it meets the
// pod at +218), filleted into the citadel top (+88) where the root spans r 825-946; it carries the
// hammerhead bridge pod at +218..+234 with a roof deck to +238.
// ---------------------------------------------------------------------------
export const TOWER = {
  yBase: 88,
  yTop: 218,
  yRef: 104,
  rLead: 865.5,
  rTrail: 928,
  rakeLead: 0.62,
  rakeTrail: 0.31,
  fillet: 22,
};
// small equipment ledge on the trailing edge just under the pod (side reference)
export const TOWER_LEDGE = { y0: 197, y1: 203, depth: 5, half: 6 };
export function towerLead(y) {
  const f = clamp01(1 - (y - TOWER.yBase) / TOWER.fillet);
  return TOWER.rLead + (y - TOWER.yRef) * TOWER.rakeLead - 30 * f * f;
}
export function towerTrail(y) {
  const f = clamp01(1 - (y - TOWER.yBase) / TOWER.fillet);
  return TOWER.rTrail + (y - TOWER.yRef) * TOWER.rakeTrail + 24 * f * f;
}
export function towerHalf(y) {
  const f = clamp01(1 - (y - TOWER.yBase) / TOWER.fillet);
  return (
    lerp(14, 9, clamp01((y - TOWER.yBase) / (TOWER.yTop - TOWER.yBase))) +
    5 * f * f
  );
}
// bridge pod (headRings spec in ref metres, converted where built): a flat 96 m hammerhead slab
// (r 897-993 at +218..+234, measured on the side reference: 16 m tall) overhanging the tower top
// ~39 m forward and ~30 m aft, with a low roof deck (+234..+238) carrying the masts
export const POD = {
  cy: 226,
  r0: 897,
  r1: 993,
  halfW: 20,
  halfH: 8,
  r: 3,
  band: [-4.6, -1.4],
  inset: 1.6,
  nose: 0.22,
  tail: 0.3,
  noseK: 0.7,
  tailK: 0.62,
};
export const POD_DECK = { r0: 907, r1: 987, y0: 234, y1: 238, half: 14 };
// communications spar projecting forward and up from the pod nose
export const SPAR = {
  r0: 905,
  y0: 236,
  r1: 858,
  y1: 258,
  rad0: 0.8,
  rad1: 0.3,
};

// ---------------------------------------------------------------------------
// Ventral fin: vertical leading edge at r 780, trailing edge swept forward going down (855 at -65 to
// 820 at -92), 44 m deep below the keel, with a 62 m pod along its tip (-96..-115) that protrudes
// ahead of the leading edge; filleted into the keel.
// ---------------------------------------------------------------------------
export const VFIN = {
  yRoot: -52,
  yTip: -96,
  rLead: 780,
  rTrailRoot: 858,
  yTrailRef: -60,
  sweep: 1.28,
};
export function vfinLead(y) {
  // the root fillet runs the leading edge forward to r ~755 at the keel (reference row at -56: 755-867)
  const f = clamp01(1 - (VFIN.yRoot - y) / 12);
  return VFIN.rLead - 40 * f * f;
}
export function vfinTrail(y) {
  const f = clamp01(1 - (VFIN.yRoot - y) / 10);
  return (
    VFIN.rTrailRoot + Math.min(0, y - VFIN.yTrailRef) * VFIN.sweep + 12 * f * f
  );
}
export function vfinHalf(y) {
  const f = clamp01(1 - (VFIN.yRoot - y) / 10);
  return (
    lerp(7, 5, clamp01((VFIN.yRoot - y) / (VFIN.yRoot - VFIN.yTip))) + 4 * f * f
  );
}
export const VFIN_POD = { r0: 755, r1: 817, cy: -104, rx: 6, ry: 11 };

// ---------------------------------------------------------------------------
// Stern: one large centre drum (measured on the side reference: 49 m across, spanning -19..+32 and
// protruding to r ~1080) ringed by six 14 m nozzles at 33 m from its axis on the 70 x 76 m stern face
// at r 1046; the ring nozzles reach r ~1075, the lower ones a little less so the side silhouette
// matches. [x, y, radius, length] (lengths from r 1043)
// ---------------------------------------------------------------------------
export const ENGINES = [
  [0, 6.5, 24.5, 37],
  [0, 39.5, 7, 32],
  [28.6, 23, 7, 32],
  [-28.6, 23, 7, 32],
  [28.6, -10, 7, 26],
  [-28.6, -10, 7, 26],
  [0, -25.5, 7, 24],
];

// ---------------------------------------------------------------------------
// Hangar trough openings (13 m wide at 21.5 m pitch along the back wall of the flank trough); open
// bays show a lit interior, the others a closed blast door.
// ---------------------------------------------------------------------------
export const BAY_R0 = 612;
export const BAY_W = 13;
export const BAY_PITCH = 21.5;
export const BAY_COUNT = 12;
export const BAY_DEPTH = 12;
export const bayOpen = (k, side) => (side > 0 ? k % 3 === 1 : k % 3 === 2);
// louvred ventral hangar door on both flanks of the chin (r range, y range), just under the belt
// (reference: r 260-313, 16-37 m above the aft keel)
export const CHIN_GRILLE = { r0: 262, r1: 312, y0: -35, y1: -16 };

// ---------------------------------------------------------------------------
// Markings: dark slate rectangles [r0, r1, y0, y1] on the hull flanks and on the citadel side walls,
// yellow hazard patches on the forward upper shoulder
// ---------------------------------------------------------------------------
export const SLATE_MARKS = [
  // the aft-body bands (side reference): each is a pair of 8 m stripes running from the citadel wall
  // down the shoulder to the trough top (r 630-651 and 689-710, continued on the wall by CITADEL_SLATE),
  // lower-hull pairs under the trough at r 603-619, 645-664 and 870-892, and a single band at r 905
  [630, 638, 15, 46],
  [643, 651, 15, 46],
  [689, 697, 15, 46],
  [702, 710, 15, 46],
  [905, 915, 15, 46],
  [603, 610, -40, -7],
  [613, 619, -40, -7],
  [645, 653, -40, -7],
  [656, 664, -40, -7],
  [870, 878, -40, -7],
  [884, 892, -40, -7],
  // forward shoulder rectangle at r 293-310 (bow reference)
  [293, 310, 32, 47],
];
export const CITADEL_SLATE = [
  [630, 638, 45, 74],
  [643, 651, 45, 74],
  [689, 697, 45, 74],
  [702, 710, 45, 74],
];
export const HAZARD_MARKS = [
  [163, 175, 18, 33],
  [245, 255, 13, 28],
  [287, 300, 16, 33],
];
// yellow hazard ladders: one patch on each tower flank (reference: r ~928 at +148, i.e. 0.6 of the
// chord) and a ladder down the ventral fin's trailing edge (stern reference) between two heights
export const TOWER_HAZARD = { f: 0.6, y0: 142, y1: 154, w: 8 };
export const VFIN_HAZARD = [-66, -90];

// raised transverse seams (ref metres): forward hull and aft body only (the trough region is broken up
// by the bay row and the painted rectangles instead)
export const SEAMS_R = [
  62, 120, 176, 232, 288, 344, 400, 456, 512, 568, 900, 950, 1000,
];
export const SEAMS = SEAMS_R.map(fromRef);
// index of the seam interval (large plate) containing z: -1 ahead of the first seam
export function seamCell(z) {
  let c = -1;
  for (let i = 0; i < SEAMS.length; i++) if (z >= SEAMS[i]) c = i;
  return c;
}

// heavy tracking turrets: three pairs on the shoulders beside the spine (shoulder segment 2, fraction
// 0.35 down from the ridge edge) and two pairs on the citadel top, ahead of the tower fillet (r 842)
export const HEAVY_SHOULDER_R = [215, 345, 475];
export const HEAVY_SHOULDER_SEG = [2, 0.35];
export const HEAVY_CITADEL_R = [722, 800];
export const HEAVY_CITADEL_X = 22;
// baked light emplacements: rows of { r: [...], m: profile segment, t: fraction, scale } on both sides
export const LIGHT_MOUNTS = [
  { r: [280, 410, 540], m: 3, t: 0.5, scale: 1 }, // dorsal shoulder, between the heavies
  { r: [975, 1015], m: 3, t: 0.45, scale: 1 }, // aft body beside the aft deck
  { r: [330, 390, 450, 570], m: 4, t: 0.55, scale: 1 }, // upper flank above the belt
  { r: [380, 470, 560, 650, 740, 830, 920], m: 12, t: 0.6, scale: 1 }, // lower body
  { r: [250], m: 13, t: 0.55, scale: 0.8 }, // chin
];

// A bar that follows the hull along z: rectangular rings at each z from centre(z) -> [x, y].
export function barAlong(
  zList,
  centre,
  w,
  h,
  { color = [1, 1, 1], texel = 1 / 6, caps = true } = {},
) {
  const rings = zList.map((z) => {
    const [x, y] = centre(z);
    return [
      [x - w / 2, y - h / 2, z],
      [x + w / 2, y - h / 2, z],
      [x + w / 2, y + h / 2, z],
      [x - w / 2, y + h / 2, z],
    ];
  });
  const g = loftRings(rings, {
    sharp: new Set([0, 1, 2, 3]),
    faceColor: () => color,
    texel,
  });
  if (!caps) return g;
  return mergeGeos([
    g,
    ringCap(rings[0], [0, 0, -1], { color, texel }),
    ringCap(rings[rings.length - 1], [0, 0, 1], { color, texel }),
  ]);
}

// A bar that runs vertically: rectangular rings (w across x, d across z) at each y from centre(y) -> [x, z].
export function barAlongY(
  yList,
  centre,
  w,
  d,
  { color = [1, 1, 1], texel = 1 / 6, caps = true } = {},
) {
  const rings = yList.map((y) => {
    const [x, z] = centre(y);
    return [
      [x - w / 2, y, z - d / 2],
      [x + w / 2, y, z - d / 2],
      [x + w / 2, y, z + d / 2],
      [x - w / 2, y, z + d / 2],
    ];
  });
  const g = loftRings(rings, {
    sharp: new Set([0, 1, 2, 3]),
    faceColor: () => color,
    texel,
  });
  if (!caps) return g;
  const up = yList[yList.length - 1] > yList[0] ? 1 : -1;
  return mergeGeos([
    g,
    ringCap(rings[0], [0, -up, 0], { color, texel }),
    ringCap(rings[rings.length - 1], [0, up, 0], { color, texel }),
  ]);
}

export function mergeGeos(geos) {
  const list = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0;
  for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  const col = new Float32Array(n * 3);
  let o = 0;
  for (const g of list) {
    const c = g.attributes.position.count;
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    col.set(
      g.attributes.color
        ? g.attributes.color.array
        : new Float32Array(c * 3).fill(1),
      o * 3,
    );
    o += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return out;
}
