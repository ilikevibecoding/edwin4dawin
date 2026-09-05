// Shared spec for the Providence-class model: palette, tower/fin tier outlines, bridge heads, the hangar
// bay / hull seam layout, and the hull-following bar helpers used by the hull, bay and detail builders.
import * as THREE from "three";
import { lerp, loftRings, ringCap } from "./providenceGeo.js";

// palette (sRGB hex; converted to linear vertex tints where used). Hull tints are chosen so sunlit
// plating measures ~sRGB 150-185 through the shared `hull` material (x1.4 plating map) while the
// planet-lit belly stays in the 40-65 band; the belly is the palest tint, the dorsal the darkest.
export const PAL = {
  dorsal: 0x7d8798,
  flank: 0x939fb1,
  belly: 0x97a0ab,
  finFace: 0x9aa7ba,
  dark: 0x363a42,
  darkLit: 0x4a5059,
  rust: 0x6a4630,
  trim: 0x8a4a28,
  insignia: 0x25304d,
  windowWarm: 0xffd8a6,
  windowCool: 0xbfe0ff,
  hangarLight: 0xa9d0ff,
  hangarDim: 0x4a6a96,
  engineCore: 0xe8f6ff,
  engineGlow: 0x8fc4ff,
  soot: 0x2a2320,
};

// ---------------------------------------------------------------------------
// Command tower and secondary fins: stepped slab tiers (y0 -> y1, set back at every tier) topped by a
// bridge head. Outline values are [at y0, at y1]; ledges are the exposed tier tops.
// ---------------------------------------------------------------------------
export const TOWER = {
  dir: 1,
  tiers: [
    {
      y0: 44,
      y1: 100,
      halfT: [36, 30],
      zLead: [150, 160],
      zTrail: [468, 420],
      tail: 0.34,
    },
    {
      y0: 100,
      y1: 165,
      halfT: [26, 21],
      zLead: [165, 178],
      zTrail: [400, 350],
      tail: 0.34,
    },
    {
      y0: 165,
      y1: 225,
      halfT: [17, 13],
      zLead: [182, 190],
      zTrail: [335, 300],
      tail: 0.36,
    },
    {
      y0: 225,
      y1: 268,
      halfT: [10.5, 10],
      zLead: [193, 197],
      zTrail: [290, 270],
      tail: 0.4,
    },
  ],
  head: {
    cy: 281,
    z0: 150,
    z1: 278,
    halfW: 24,
    halfH: 19,
    r: 7,
    band: [-2.5, 3],
    inset: 2.4,
    nose: 0.28,
    tail: 0.42,
    noseK: 0.62,
    tailK: 0.6,
  },
};
export const FORE_FIN = {
  dir: 1,
  tiers: [
    {
      y0: 44,
      y1: 96,
      halfT: [11, 9],
      zLead: [66, 84],
      zTrail: [172, 168],
      tail: 0.4,
    },
    {
      y0: 96,
      y1: 140,
      halfT: [8, 6.5],
      zLead: [88, 104],
      zTrail: [162, 150],
      tail: 0.45,
    },
  ],
  head: {
    cy: 143,
    z0: 84,
    z1: 148,
    halfW: 9,
    halfH: 5.5,
    r: 2.5,
    band: [-1, 1.2],
    inset: 0.9,
    nose: 0.3,
    tail: 0.4,
    noseK: 0.55,
    tailK: 0.55,
  },
};
export const VENTRAL_FIN = {
  dir: -1,
  tiers: [
    {
      y0: -66,
      y1: -120,
      halfT: [11, 9],
      zLead: [258, 286],
      zTrail: [518, 440],
      tail: 0.36,
    },
    {
      y0: -120,
      y1: -184,
      halfT: [8, 5.5],
      zLead: [292, 322],
      zTrail: [420, 356],
      tail: 0.4,
    },
  ],
  head: {
    cy: -186,
    z0: 306,
    z1: 374,
    halfW: 8,
    halfH: 5.5,
    r: 2.5,
    band: null,
    nose: 0.3,
    tail: 0.4,
    noseK: 0.55,
    tailK: 0.55,
  },
};
// outline functions of height for a tier
export function tierFns(t) {
  const u = (y) => (y - t.y0) / (t.y1 - t.y0);
  return {
    zLead: (y) => lerp(t.zLead[0], t.zLead[1], u(y)),
    zTrail: (y) => lerp(t.zTrail[0], t.zTrail[1], u(y)),
    halfT: (y) => lerp(t.halfT[0], t.halfT[1], u(y)),
  };
}

// ---------------------------------------------------------------------------
// Hangar bays cut into the flank band (7 per side, 40 m long, 56 m pitch), the ventral hangar mouth
// under the bow, shallow recessed belly bays, and the transverse raised seams that frame the 40-60 m
// armour plates (placed in the gaps between bays).
// ---------------------------------------------------------------------------
export const BAY_LEN = 40;
export const BAY_PITCH = 56;
export const BAY_Z0 = -150;
export const BAY_COUNT = 7;
export const BAY_DEPTH = 18;
export const DOOR_DEPTH = 3;
export const bayOpen = (k, side) => (side > 0 ? k % 2 === 0 : k % 2 === 1);
export const VENTRAL_MOUTH = { z0: -296, z1: -238, depth: 16 };
export const BELLY_BAYS = [
  { zc: -74, side: 1, len: 30 },
  { zc: 38, side: -1, len: 30 },
  { zc: 94, side: 1, len: 30 },
  { zc: 206, side: -1, len: 30 },
];
export const BELLY_BAY_DEPTH = 5;
export const SEAMS = [
  -500, -446, -392, -346, -304, -230, -196, -158, -102, -46, 10, 66, 122, 178,
  234, 290, 348, 404, 462, 514,
];
// raised plate groups straddling the dorsal ridge: [zc, length]
export const RIDGE_SLABS = [
  [-470, 24],
  [-213, 26],
  [-136, 36],
  [-72, 40],
];
// heavy tracking turrets: dorsal ridge row + flank pairs beside the tower
export const HEAVY_RIDGE_Z = [-330, -255, -180, -105, -30, 45];
export const HEAVY_FLANK_Z = [330, 430];

// index of the seam interval (large plate) containing z: -1 ahead of the first seam
export function seamCell(z) {
  let c = -1;
  for (let i = 0; i < SEAMS.length; i++) if (z >= SEAMS[i]) c = i;
  return c;
}

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
