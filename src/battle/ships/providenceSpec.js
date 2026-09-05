// Shared spec for the Providence-class model: palette, fin outlines, bridge pod, and the hull-following
// bar helper used by both the hull/hangar builder and the detail pass.
import * as THREE from "three";
import { lerp, loftRings, ringCap } from "./providenceGeo.js";

// palette (sRGB hex; converted to linear vertex tints where used)
export const PAL = {
  dorsal: 0x5a6371,
  flank: 0x7e8798,
  belly: 0xa2a9b3,
  finFace: 0x77808f,
  dark: 0x363a42,
  darkLit: 0x4a5059,
  rust: 0x5f4232,
  insignia: 0x25304d,
  windowWarm: 0xffd8a6,
  windowCool: 0xbfe0ff,
  hangarLight: 0xa9d0ff,
  hangarDim: 0x4a6a96,
  engineCore: 0xe8f6ff,
  engineGlow: 0x8fc4ff,
  plume: 0x86b8ff,
};

// fin outlines (side view: z along the hull, y up)
export const FINS = {
  main: {
    y0: 44,
    y1: 270,
    zLead: (y) => 150 + ((y - 44) / 226) * 42,
    zTrail: (y) => 468 - 204 * Math.pow((y - 44) / 226, 1.04),
    halfT: (y) => lerp(9.5, 4.6, (y - 44) / 226),
  },
  fore: {
    y0: 44,
    y1: 140,
    zLead: (y) => 66 + ((y - 44) / 96) * 44,
    zTrail: (y) => 172 + ((y - 44) / 96) * 8,
    halfT: (y) => lerp(7, 4, (y - 44) / 96),
  },
  ventral: {
    y0: -66,
    y1: -184,
    zLead: (y) => 258 + ((-66 - y) / 118) * 64,
    zTrail: (y) => 518 - 164 * Math.pow((-66 - y) / 118, 1.1),
    halfT: (y) => lerp(6.5, 3.4, (-66 - y) / 118),
  },
};
// bridge pod on top of the main fin (overhangs the leading edge)
export const POD = {
  cx: 0,
  cy: 287,
  z0: 156,
  z1: 268,
  rx: 24,
  ry: 18.5,
  frontPow: 2.3,
  backPow: 1.7,
  flatTop: 0.12,
};

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

export function mergeGeos(geos) {
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  const col = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    uv.set(g.attributes.uv.array, o * 2);
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
