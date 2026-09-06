// Recusant forward hull (0 .. 0.68 of the length), matched to the film model's side view (grey plate)
// and the Clone Wars / Fact File renders. All values are metres with the spine axis at y = 0, bow at
// z = -593.5. The body is a flat spade: a needle tip slightly below the axis, a blade whose top ramps
// up to a raised deck (+24 at 0.10 L, +43 at 0.30 L) carrying a low dark platform with spike forests
// and the port-side bridge pod, the widest point (157 m) under a ribbed tent dome that runs from
// 0.30 L to 0.60 L with its crest at +83, a dark skeletal flank under the dome hem with a light-grey
// lower module, an underslung hangar block (0.16 .. 0.36 L) and a dark exposed-truss tail that
// narrows into the spine at 0.68 L. Markings: two slanted bow stripes, the roundel, the wide chevron
// band with the white zigzag and two bands over the dome.
import * as THREE from "three";
import {
  bar,
  loftZ,
  openBoxInterior,
  quadAt,
  ringZ,
  smoothstep,
  superellipse,
  surfaceStrip,
  table,
} from "./munificentGeo.js";
import { hatch, slotWindow } from "./munificentDetail.js";
import {
  archOpen,
  archProfile,
  domeSurface,
  octagonAt,
  offsetPoly,
  polyRange,
  roundel,
  sectionLoft,
  spike,
} from "./recusantGeo.js";

// body stations: W half width at the shoulder edge, Wu upper-flank width at the panel groove, yT
// deck, yE shoulder edge, yG groove height, Wm / yM knuckle (bottom of the light flank), Wb / yB
// belly, ridge = centre crown of the deck. Near-duplicate stations give crisp tint changes at the
// start of the dark lower band (-400), the dome region (-218) and the skeletal tail (120).
export const BODY = [
  {
    z: -593.5,
    W: 0.5,
    Wu: 0.45,
    yT: -7.6,
    yE: -7.9,
    yG: -8.2,
    Wm: 0.4,
    yM: -8.6,
    Wb: 0.25,
    yB: -9,
    ridge: 0.2,
  },
  {
    z: -558,
    W: 7,
    Wu: 6.7,
    yT: -1,
    yE: -3.5,
    yG: -8,
    Wm: 5.6,
    yM: -13,
    Wb: 3.5,
    yB: -18,
    ridge: 1.2,
  },
  {
    z: -534,
    W: 12,
    Wu: 11.6,
    yT: 4.5,
    yE: 1.5,
    yG: -5,
    Wm: 9.6,
    yM: -12,
    Wb: 6.5,
    yB: -22,
    ridge: 1.6,
  },
  {
    z: -498,
    W: 20,
    Wu: 19.5,
    yT: 14,
    yE: 10,
    yG: -1,
    Wm: 16,
    yM: -14,
    Wb: 11,
    yB: -27,
    ridge: 1.6,
  },
  {
    z: -475,
    W: 25,
    Wu: 24.5,
    yT: 24,
    yE: 19.5,
    yG: 3,
    Wm: 20.5,
    yM: -16,
    Wb: 14,
    yB: -30,
    ridge: 1.4,
  },
  {
    z: -415,
    W: 37,
    Wu: 36.4,
    yT: 32,
    yE: 27,
    yG: 7,
    Wm: 30,
    yM: -19,
    Wb: 20,
    yB: -33,
    ridge: 1,
  },
  {
    z: -401,
    W: 39.5,
    Wu: 38.9,
    yT: 32.8,
    yE: 27.8,
    yG: 7.3,
    Wm: 32,
    yM: -19.3,
    Wb: 21.5,
    yB: -33.8,
    ridge: 0.9,
  },
  {
    z: -399,
    W: 39.8,
    Wu: 39.2,
    yT: 32.9,
    yE: 27.9,
    yG: 7.3,
    Wm: 32.3,
    yM: -19.3,
    Wb: 21.7,
    yB: -33.9,
    ridge: 0.9,
  },
  {
    z: -356,
    W: 47,
    Wu: 46.4,
    yT: 35,
    yE: 30,
    yG: 8,
    Wm: 38,
    yM: -20,
    Wb: 26,
    yB: -36,
    ridge: 0.6,
  },
  {
    z: -297,
    W: 58,
    Wu: 57.4,
    yT: 38,
    yE: 33,
    yG: 8,
    Wm: 46,
    yM: -20,
    Wb: 32,
    yB: -38,
    ridge: 0.4,
  },
  {
    z: -237,
    W: 66,
    Wu: 65.4,
    yT: 43,
    yE: 38,
    yG: 9,
    Wm: 52,
    yM: -20,
    Wb: 36,
    yB: -40,
    ridge: 0.3,
  },
  {
    z: -219,
    W: 68.5,
    Wu: 67.9,
    yT: 42.7,
    yE: 37.7,
    yG: 9,
    Wm: 54,
    yM: -20,
    Wb: 37.3,
    yB: -40.6,
    ridge: 0.2,
  },
  {
    z: -217,
    W: 68.7,
    Wu: 65.2,
    yT: 42.7,
    yE: 37.7,
    yG: 9,
    Wm: 54.2,
    yM: -20,
    Wb: 37.5,
    yB: -40.7,
    ridge: 0.2,
  },
  {
    z: -178,
    W: 73,
    Wu: 69.5,
    yT: 42,
    yE: 37,
    yG: 9,
    Wm: 58,
    yM: -20,
    Wb: 40,
    yB: -42,
    ridge: 0,
  },
  {
    z: -95,
    W: 78.5,
    Wu: 75,
    yT: 40,
    yE: 36,
    yG: 8,
    Wm: 62,
    yM: -20,
    Wb: 44,
    yB: -42,
    ridge: 0,
  },
  {
    z: 0,
    W: 76,
    Wu: 72.5,
    yT: 37,
    yE: 33,
    yG: 7,
    Wm: 60,
    yM: -20,
    Wb: 42,
    yB: -42,
    ridge: 0,
  },
  {
    z: 59,
    W: 68,
    Wu: 64.5,
    yT: 34,
    yE: 30,
    yG: 6,
    Wm: 54,
    yM: -20,
    Wb: 38,
    yB: -40,
    ridge: 0,
  },
  {
    z: 119,
    W: 50,
    Wu: 46.5,
    yT: 32,
    yE: 28,
    yG: 5,
    Wm: 40,
    yM: -20,
    Wb: 28,
    yB: -36,
    ridge: 0,
  },
  {
    z: 121,
    W: 49.5,
    Wu: 46,
    yT: 31.8,
    yE: 27.8,
    yG: 5,
    Wm: 39.6,
    yM: -19.9,
    Wb: 27.7,
    yB: -35.8,
    ridge: 0,
  },
  {
    z: 154,
    W: 40,
    Wu: 37,
    yT: 28,
    yE: 24,
    yG: 3,
    Wm: 32,
    yM: -18,
    Wb: 24,
    yB: -34,
    ridge: 0,
  },
  {
    z: 190,
    W: 28,
    Wu: 26,
    yT: 22,
    yE: 19,
    yG: 1,
    Wm: 23,
    yM: -15,
    Wb: 17,
    yB: -28,
    ridge: 0,
  },
  {
    z: 214,
    W: 13,
    Wu: 12.5,
    yT: 11,
    yE: 10,
    yG: 0,
    Wm: 12,
    yM: -10,
    Wb: 9,
    yB: -13,
    ridge: 0,
  },
];
export const TAIL_Z = 214;
// z ranges of the tint regions
const Z_BAND = -400; // dark lower band starts (film / TCW: 0.16 L)
const Z_DOME = -218; // dome region: dark flank from the hem down to Y_BAND, light module below
const Z_TAIL = 120; // exposed truss tail
const Y_BAND = -8;

const field = (k) => (z) =>
  table(
    BODY.map((s) => [s.z, s[k]]),
    z,
  );
export const halfW = field("W");
const upperW = field("Wu");
export const deckY = field("yT");
export const shoulderY = field("yE");
export const grooveY = field("yG");
export const midW = field("Wm");
export const midY = field("yM");
export const botW = field("Wb");
export const bottomY = field("yB");
const ridgeAt = field("ridge");
// panel groove on the upper flank: depth and lip half-height scale down with the blade width so the
// needle tip stays a clean point
const grooveDepth = (z) => Math.min(2.2, 0.12 * halfW(z));
const lipH = (z) => Math.min(1.2, 0.08 * halfW(z));
const bandEdgeY = (z) =>
  z >= Z_DOME && z < Z_TAIL ? Y_BAND : (grooveY(z) - lipH(z) + midY(z)) / 2;

// top surface height at (x, z): flat deck inside 0.62 W, bevel down to the shoulder edge outside
export function topAt(x, z) {
  const W = halfW(z);
  const ax = Math.abs(x);
  const flat = 0.62 * W;
  if (ax <= flat)
    return deckY(z) + ridgeAt(z) * (1 - ax / Math.max(1e-3, flat));
  const t = Math.min(1, (ax - flat) / Math.max(1e-3, W - flat));
  return deckY(z) + t * (shoulderY(z) - deckY(z));
}

// starboard flank polyline at z from the knuckle up to the shoulder: [x, y] pairs
function flankLine(z) {
  const W = halfW(z);
  const Wu = upperW(z);
  const yG = grooveY(z);
  const yM = midY(z);
  const yD = bandEdgeY(z);
  const Wm = midW(z);
  const g = grooveDepth(z);
  const lh = lipH(z);
  const t = Math.min(
    1,
    Math.max(0, (yG - lh - yD) / Math.max(1e-3, yG - lh - yM)),
  );
  const Wd = Wu - g - (Wu - g - Wm) * t;
  return [
    [Wm, yM],
    [Wd, yD],
    [Wu - g, yG - lh],
    [Wu, yG + lh],
    [W, shoulderY(z)],
  ];
}

// the 16-point section at z (CCW seen from +z)
export function bodySection(z) {
  const W = halfW(z);
  const yT = deckY(z);
  const yB = bottomY(z);
  const Wb = botW(z);
  const keel = Math.min(2.2, W * 0.08);
  const f = flankLine(z);
  const mir = (p) => [-p[0], p[1]];
  return [
    f[4],
    [0.62 * W, yT],
    [0, yT + ridgeAt(z)],
    [-0.62 * W, yT],
    mir(f[4]),
    mir(f[3]),
    mir(f[2]),
    mir(f[1]),
    mir(f[0]),
    [-Wb, yB],
    [0, yB - keel],
    [Wb, yB],
    f[0],
    f[1],
    f[2],
    f[3],
  ];
}

/** Point and outward normal on the flank at height y (clamped to knuckle .. shoulder). */
export function flankAt(z, y, side = 1, lift = 0) {
  const f = flankLine(z);
  const yc = Math.min(f[4][1], Math.max(f[0][1], y));
  let i = 0;
  while (i < f.length - 2 && yc > f[i + 1][1]) i++;
  const [x0, y0] = f[i];
  const [x1, y1] = f[i + 1];
  const t = (yc - y0) / Math.max(1e-6, y1 - y0);
  const x = x0 + (x1 - x0) * t;
  const n = new THREE.Vector3(y1 - y0, -(x1 - x0), 0).normalize();
  return {
    p: [side * (x + n.x * lift), yc + n.y * lift, z],
    n: [side * n.x, n.y, 0],
  };
}
/** Lower flank (belly knuckle .. knuckle): t = 0 at the belly edge, 1 at the knuckle. */
export function lowerFlankAt(z, t, side = 1, lift = 0) {
  const x0 = botW(z);
  const y0 = bottomY(z);
  const x1 = midW(z);
  const y1 = midY(z);
  const n = new THREE.Vector3(y1 - y0, -(x1 - x0), 0).normalize();
  return {
    p: [
      side * (x0 + (x1 - x0) * t + n.x * lift),
      y0 + (y1 - y0) * t + n.y * lift,
      z,
    ],
    n: [side * n.x, n.y, 0],
  };
}

// dome stations: hem on the shoulder line, crest heights in metres
const DOME_RAW = [
  { z: -237, sx: 2, crest: 40.5 },
  { z: -215, sx: 22, crest: 49 },
  { z: -190, sx: 42, crest: 58 },
  { z: -160, sx: 58, crest: 70 },
  { z: -130, sx: 66, crest: 78 },
  { z: -95, sx: 71, crest: 80.5 },
  { z: -40, sx: 71, crest: 81 },
  { z: -20, sx: 70, crest: 80 },
  { z: 20, sx: 67, crest: 75 },
  { z: 60, sx: 60, crest: 64 },
  { z: 90, sx: 51, crest: 51 },
  { z: 110, sx: 42, crest: 41 },
  { z: 119, sx: 35, crest: 33 },
];
export const DOME = DOME_RAW.map((d) => {
  const y = shoulderY(d.z) + 0.8;
  return {
    z: d.z,
    sx: Math.min(d.sx, halfW(d.z) - 1),
    sy: Math.max(1.5, d.crest - y),
    y,
  };
});
export const DOME_P = 3.0;
export const domeAt = (a, z, lift = 0) => domeSurface(DOME, a, z, lift, DOME_P);
const domeField = (k) => (z) =>
  table(
    DOME.map((d) => [d.z, d[k]]),
    z,
  );
export const domeSX = domeField("sx");
export const domeSY = domeField("sy");
export const domeBase = domeField("y");
export const domeCrest = (z) => domeBase(z) + domeSY(z);

// deck platform: low dark superstructure on the forward deck
export const PLATFORM = { z0: -430, z1: -237 };
export const platformTop = (z) => Math.max(deckY(z) + 4, 37);
export const platformHalfW = (z) => 0.36 * halfW(z);
// underslung hangar module
export const MODULE = { z0: -403, z1: -166, bottom: -57 };

const hash = (i) => {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * Build the forward hull. ctx: { add, rand, colours }. Surfaces for turret placement are exported.
 */
export function buildBody({ add, rand, colours: K }) {
  const TEX = 1 / 34;
  const FRAME = K.FRAME;

  // ---------------------------------------------------------------------------
  // main body loft with region tints (light blade / dark lower band / dark flank under the dome
  // with a light module / dark truss tail); belly and keel dark grey
  // ---------------------------------------------------------------------------
  const bodyTint = (x, y, z, o) => {
    const band = 1 + (hash(Math.floor((z + 600) / 26)) - 0.5) * 0.08;
    const yM = midY(z);
    const yB = bottomY(z);
    const light = () => {
      o.copy(K.LIGHT).multiplyScalar(band);
      if (y < shoulderY(z) - 0.5) o.multiplyScalar(0.94); // flank a touch darker than the deck
      if (y < grooveY(z) - 0.5) o.multiplyScalar(0.96); // lower panel row
    };
    if (z >= Z_TAIL) {
      o.copy(K.MID).multiplyScalar(0.72 * band);
      if (y < yB + 0.5) o.copy(K.LOW).multiplyScalar(0.8);
    } else if (z >= Z_DOME) {
      if (y > Y_BAND + 0.5) o.copy(K.LOW).multiplyScalar(0.9 * band);
      else if (y > yB + 0.5) o.copy(K.LIGHT).multiplyScalar(0.88 * band);
      else o.copy(K.LOW).multiplyScalar(0.75);
    } else if (z >= Z_BAND) {
      if (y > yM + 0.5) light();
      else if (y > yB + 0.5) o.copy(K.LOW).multiplyScalar(0.82 * band);
      else o.copy(K.LOW).multiplyScalar(0.7);
    } else {
      if (y > yB + 0.5) {
        light();
        if (y < yM + 0.5) o.multiplyScalar(0.9);
      } else o.copy(K.LOW).multiplyScalar(0.85);
    }
    return o;
  };
  const stationsFor = (lod) => {
    let list = BODY;
    if (lod === 2)
      list = BODY.filter((s, i) => i % 2 === 0 || i === BODY.length - 1);
    return list.map((s) => ({ z: s.z, pts: bodySection(s.z) }));
  };
  for (const lod of [0, 1, 2])
    add(sectionLoft(stationsFor(lod), { texel: TEX, capEnd: true }), "hull", {
      uv: "keep",
      lod,
      tint:
        lod === 2
          ? (x, y, z, o) => bodyTint(x, y, z, o).multiplyScalar(1.1)
          : bodyTint,
    });
  // prow turbolaser muzzle in the tip
  for (const lod of [0, 1])
    add(
      loftZ(superellipse(8, 2), [
        { z: -592, sx: 0.7, sy: 0.7, y: -7.8 },
        { z: -572, sx: 2.6, sy: 2.4, y: -7 },
      ]),
      "dark",
      { color: K.MACH_DK, texel: 1 / 2, lod },
    );
  // shoulder gutter: dark groove line along the deck edge (blade and deck region)
  for (const lod of [0, 1])
    for (const side of [-1, 1]) {
      const secs = [];
      for (const z of [-560, -498, -415, -356, -297, -237, -219]) {
        const W = halfW(z);
        const y = shoulderY(z);
        const a = [side * (W - 0.4), y + 0.5];
        const b = [side * (W - 2.6), y + 0.9];
        secs.push({ z, pts: side > 0 ? [a, b] : [b, a] });
      }
      add(sectionLoft(secs, { closed: false, texel: 1 / 6 }), "dark", {
        uv: "keep",
        lod,
        color: K.MACH_DK,
      });
    }

  // ---------------------------------------------------------------------------
  // dome: tent shell on the shoulder line, radial ribs from its front point, rim rings, hem shadow
  // ---------------------------------------------------------------------------
  const domeTint = (x, y, z, o) => {
    const band = 1 + (hash(Math.floor((z + 300) / 31) + 7) - 0.5) * 0.07;
    o.copy(K.LIGHT).multiplyScalar(band);
    const t = Math.min(1, Math.abs(x) / Math.max(1, domeSX(z)));
    o.multiplyScalar(1 - 0.1 * t * t);
    o.lerp(K.LOW, 0.12 * smoothstep(40, 125, z));
    return o;
  };
  for (const lod of [0, 1, 2]) {
    const n = lod === 0 ? 24 : lod === 1 ? 12 : 8;
    const st =
      lod === 2
        ? DOME.filter((d, i) => i % 2 === 0 || i === DOME.length - 1)
        : DOME;
    add(
      loftZ(archProfile(n, DOME_P), st, { capEnd: true, texel: TEX }),
      "hull",
      {
        uv: "keep",
        lod,
        tint:
          lod === 2
            ? (x, y, z, o) => domeTint(x, y, z, o).multiplyScalar(1.1)
            : domeTint,
      },
    );
  }
  for (let k = 1; k <= 15; k++) {
    const a = (Math.PI * k) / 16;
    const pts = [];
    const nrm = [];
    for (let z = -232; z <= 116; z += 12) {
      const s = domeAt(a, z, 0);
      pts.push(s.p);
      nrm.push(s.n);
    }
    add(surfaceStrip(pts, nrm, 1.1, 0.6, 3), "hull", {
      texel: 1 / 6,
      lod: 0,
      tint: (x, y, z, o) => domeTint(x, y, z, o).multiplyScalar(0.55),
    });
  }
  for (const lod of [0, 1])
    for (const zc of [-176, -60, 44, 96])
      add(
        loftZ(
          archOpen(lod === 0 ? 24 : 12, DOME_P),
          [
            {
              z: zc - 1.0,
              sx: domeSX(zc) + 0.5,
              sy: domeSY(zc) + 0.5,
              y: domeBase(zc),
            },
            {
              z: zc + 1.0,
              sx: domeSX(zc) + 0.5,
              sy: domeSY(zc) + 0.5,
              y: domeBase(zc),
            },
          ],
          { closed: false },
        ),
        "hull",
        {
          texel: 1 / 6,
          lod,
          tint: (x, yy, z, o) => domeTint(x, yy, z, o).multiplyScalar(0.86),
        },
      );
  // hem shadow: dark strip under the shell's overhang on both flanks
  for (const lod of [0, 1])
    for (const side of [-1, 1]) {
      const secs = [];
      for (const z of [-217, -178, -95, 0, 59, 119]) {
        const top = flankAt(z, shoulderY(z) - 0.2, side, 0.4).p;
        const bot = flankAt(z, shoulderY(z) - 3.2, side, 0.4).p;
        secs.push({
          z,
          pts:
            side > 0
              ? [
                  [bot[0], bot[1]],
                  [top[0], top[1]],
                ]
              : [
                  [top[0], top[1]],
                  [bot[0], bot[1]],
                ],
        });
      }
      add(sectionLoft(secs, { closed: false, texel: 1 / 6 }), "dark", {
        uv: "keep",
        lod,
        color: 0x22242a,
      });
    }
  // crest platform (dark) with the tallest spike forest
  for (const lod of [0, 1]) {
    const secs = [];
    for (const z of [-172, -160, -70, -56]) {
      const end = z === -172 || z === -56;
      const w = end ? 8 : 15;
      const h = end ? 2 : 5.5;
      const yb = domeCrest(z) - 1.5;
      secs.push({
        z,
        pts: [
          [w, yb],
          [w, yb + h],
          [-w, yb + h],
          [-w, yb],
        ],
      });
    }
    add(
      sectionLoft(secs, { capStart: true, capEnd: true, texel: 1 / 6 }),
      "dark",
      { uv: "keep", lod, color: K.MACH },
    );
  }

  // ---------------------------------------------------------------------------
  // deck platform (dark, low) with greebles; bridge pod on the port deck edge ahead of it
  // ---------------------------------------------------------------------------
  for (const lod of [0, 1, 2]) {
    const secs = [];
    for (const z of [
      PLATFORM.z0,
      PLATFORM.z0 + 10,
      -380,
      -320,
      -260,
      PLATFORM.z1,
    ]) {
      const end = z === PLATFORM.z0 || z === PLATFORM.z1;
      const w = end ? platformHalfW(z) * 0.6 : platformHalfW(z);
      const yb = deckY(z) - 0.5;
      const yt = end ? deckY(z) + 1.5 : platformTop(z);
      secs.push({ z, pts: octagonAt(w, (yt - yb) / 2, 0, (yt + yb) / 2, 0.7) });
    }
    add(
      sectionLoft(secs, { capStart: true, capEnd: true, texel: 1 / 8 }),
      "dark",
      {
        uv: "keep",
        lod,
        tint: (x, y, z, o) =>
          o.copy(K.MACH_C).multiplyScalar(y > platformTop(z) - 1 ? 1.15 : 1),
      },
    );
  }
  // greeble city on the platform (LOD 0) and light-grey edge coamings (LOD 0/1)
  for (let i = 0; i < 72; i++) {
    const z = -418 + rand() * 170;
    const hw = platformHalfW(z);
    const x = (rand() - 0.5) * 2 * (hw - 3);
    const w = 1.6 + rand() * 3.4;
    const h = 1 + rand() * 4;
    const l = 2 + rand() * 5;
    add(
      new THREE.BoxGeometry(w, h, l).translate(
        x,
        platformTop(z) + h / 2 - 0.2,
        z,
      ),
      i % 3 ? "dark" : "hull",
      {
        color: i % 3 ? (i % 2 ? K.MACH : K.MACH_DK) : K.MID.getHex(),
        texel: 1 / 3,
        lod: 0,
      },
    );
  }
  for (const lod of [0, 1])
    for (const side of [-1, 1]) {
      const secs = [];
      for (const z of [-418, -380, -320, -260, -240]) {
        const x = side * (platformHalfW(z) - 0.6);
        const y = platformTop(z);
        secs.push({ z, pts: octagonAt(1.1, 0.9, x, y + 0.6, 0.5) });
      }
      add(
        sectionLoft(secs, { capStart: true, capEnd: true, texel: 1 / 3 }),
        "hull",
        { uv: "keep", lod, color: FRAME },
      );
    }
  // bridge pod: port side, on the deck ahead of the platform, green-lit
  const POD = { z0: -495, z1: -432, x: -15, y: 30 };
  for (const lod of [0, 1, 2]) {
    const prof = superellipse(lod === 0 ? 14 : 8, 2.6);
    add(
      loftZ(
        prof,
        [
          { z: POD.z0, sx: 2.5, sy: 2.2, x: POD.x, y: POD.y },
          { z: POD.z0 + 7, sx: 6, sy: 5.4, x: POD.x, y: POD.y + 0.6 },
          { z: POD.z0 + 24, sx: 7.2, sy: 7, x: POD.x, y: POD.y },
          { z: POD.z1 - 8, sx: 6.8, sy: 6.6, x: POD.x, y: POD.y - 0.4 },
          { z: POD.z1, sx: 4.2, sy: 4, x: POD.x, y: POD.y - 1.2 },
        ],
        { capStart: true, capEnd: true, texel: 1 / 8 },
      ),
      "hull",
      {
        uv: "keep",
        lod,
        tint: (x, y, z, o) =>
          o.copy(K.LIGHT).multiplyScalar(y < POD.y - 3 ? 0.86 : 1.02),
      },
    );
    if (lod < 2) {
      for (const side of [-1, 1])
        slotWindow(add, {
          c: [POD.x + side * 7.1, POD.y + 2.2, POD.z0 + 14],
          n: [side * 0.88, 0.48, -0.05],
          along: [0, 0, 1],
          len: 12,
          h: 1.7,
          lod,
          panes: 4,
          glow: K.WINDOW_GREEN,
          rim: K.MACH_DK,
        });
      slotWindow(add, {
        c: [POD.x, POD.y + 4.2, POD.z0 + 3.5],
        n: [0, 0.62, -0.78],
        along: [1, 0, 0],
        len: 7,
        h: 1.6,
        lod,
        panes: 3,
        glow: K.WINDOW_GREEN,
        rim: K.MACH_DK,
      });
      // dark equipment saddle behind the pod and a small dish mast
      add(
        new THREE.BoxGeometry(9, 3, 10).translate(POD.x, POD.y + 3, POD.z1 - 2),
        "dark",
        { color: K.MACH_DK, texel: 1 / 3, lod },
      );
    }
  }

  // ---------------------------------------------------------------------------
  // markings (paint): slanted bow stripes, roundel, thin stripes and the wide chevron band with the
  // white zigzag, two bands over the dome
  // ---------------------------------------------------------------------------
  // flank stroke from (z0, y0) to (z1, y1) of width w: split at the flank kinks so it hugs the surface
  const stroke = (
    z0,
    y0,
    z1,
    y1,
    w,
    side,
    color,
    lod,
    lift = 0.5,
    mat = "paint",
  ) => {
    if (Math.abs(y1 - y0) < 0.05) {
      // level stroke along z: one quad on the local flank plane
      const A = new THREE.Vector3(...flankAt(z0, y0, side, lift).p);
      const B = new THREE.Vector3(...flankAt(z1, y0, side, lift).p);
      const c = A.clone().add(B).multiplyScalar(0.5);
      add(
        quadAt(
          c.toArray(),
          flankAt((z0 + z1) / 2, y0, side, 0).n,
          [0, 0, 1],
          A.distanceTo(B) + w * 0.6,
          w,
          0,
        ),
        mat,
        { color, lod, uv: "keep" },
      );
      return;
    }
    const kinks = [
      midY(z0),
      bandEdgeY(z0),
      grooveY(z0) - lipH(z0),
      grooveY(z0) + lipH(z0),
      shoulderY(z0),
    ];
    const ys = [
      y0,
      y1,
      ...kinks.filter(
        (k) => k > Math.min(y0, y1) + 0.2 && k < Math.max(y0, y1) - 0.2,
      ),
    ];
    ys.sort((a, b) => (y0 < y1 ? a - b : b - a));
    for (let i = 0; i + 1 < ys.length; i++) {
      const ya = ys[i];
      const yb = ys[i + 1];
      const f = (y) => (y - y0) / (y1 - y0);
      const za = z0 + (z1 - z0) * f(ya);
      const zb = z0 + (z1 - z0) * f(yb);
      const A = new THREE.Vector3(...flankAt(za, ya, side, lift).p);
      const B = new THREE.Vector3(...flankAt(zb, yb, side, lift).p);
      const c = A.clone().add(B).multiplyScalar(0.5);
      const n = flankAt((za + zb) / 2, (ya + yb) / 2, side, 0).n;
      const dir = B.clone().sub(A);
      const len = dir.length() + w * 0.6;
      add(quadAt(c.toArray(), n, dir.normalize().toArray(), len, w, 0), mat, {
        color,
        lod,
        uv: "keep",
      });
    }
  };
  // dark panel seams on the blade flank (lean aft going up, like the stripes)
  for (const side of [-1, 1])
    for (const z of [-540, -520, -496, -472, -392, -378])
      stroke(
        z,
        midY(z) + 0.5,
        z + 8,
        shoulderY(z + 8) - 0.4,
        0.9,
        side,
        K.MACH_DK,
        0,
        0.35,
        "dark",
      );
  for (const lod of [0, 1, 2])
    for (const side of [-1, 1]) {
      // two slanted bow stripes (lean aft going up)
      for (const z of [-451, -419])
        stroke(
          z,
          midY(z) + 1,
          z + 9,
          shoulderY(z + 9) - 0.6,
          5.5,
          side,
          K.BLUE,
          lod,
        );
      // thin double stripe ahead of the band
      if (lod < 2)
        for (const z of [-362, -355])
          stroke(
            z,
            bandEdgeY(z) + 2,
            z + 3,
            shoulderY(z + 3) - 0.6,
            2.2,
            side,
            K.BLUE,
            lod,
          );
    }
  // wide chevron band wrapping the deck and both flanks down to the knuckle
  const BAND = [-344, -297];
  const wrap = (z0, z1, lift, color, lod, range = [12, 8]) => {
    const secs = [];
    for (const z of [z0, (z0 + z1) / 2, z1])
      secs.push({
        z,
        pts: polyRange(offsetPoly(bodySection(z), lift), range[0], range[1]),
      });
    add(sectionLoft(secs, { closed: false, texel: 1 / 8 }), "paint", {
      color,
      lod,
      uv: "keep",
    });
  };
  for (const lod of [0, 1, 2]) wrap(BAND[0], BAND[1], 0.45, K.BLUE, lod);
  for (const lod of [0, 1])
    for (const side of [-1, 1]) {
      // the glyph: a white bar along the top of the band with two V's hanging from it
      stroke(-341, 29.5, -302, 29.5, 4.4, side, K.WHITE, lod, 0.8);
      const zig = [
        [-340, -2],
        [-331, 29],
        [-322, -2],
        [-313, 29],
        [-303, -2],
      ];
      for (let i = 0; i + 1 < zig.length; i++)
        stroke(
          zig[i][0],
          zig[i][1],
          zig[i + 1][0],
          zig[i + 1][1],
          4.4,
          side,
          K.WHITE,
          lod,
          0.8,
        );
      // roundel on the mid flank ahead of the band
      const r = flankAt(-386, 1, side, 0);
      roundel(add, {
        c: r.p,
        n: r.n,
        r: 9.5,
        lod,
        white: K.WHITE,
        hull: K.LIGHT.getHex(),
      });
    }
  for (const lod of [0, 1, 2])
    for (const [z0, z1] of [
      [-108, -96],
      [-86, -76],
    ]) {
      const secs = [];
      for (const z of [z0, (z0 + z1) / 2, z1])
        secs.push({
          z,
          sx: domeSX(z) + 0.5,
          sy: domeSY(z) + 0.5,
          y: domeBase(z),
        });
      add(
        loftZ(archOpen(lod === 0 ? 24 : lod === 1 ? 12 : 8, DOME_P), secs, {
          closed: false,
        }),
        "paint",
        {
          color: K.BLUE,
          lod,
          uv: "keep",
        },
      );
    }

  // ---------------------------------------------------------------------------
  // sensor spike forests: deck platform, deck shoulders, dome crest platform, dome aft slope
  // ---------------------------------------------------------------------------
  const spikes = [];
  for (let i = 0; i < 18; i++) {
    const z = -418 + rand() * 150;
    const x = (rand() - 0.5) * 2 * (platformHalfW(z) - 4);
    spikes.push([
      x,
      platformTop(z) + 0.2,
      z,
      16 + rand() * 34,
      0.9 + rand() * 0.7,
    ]);
  }
  for (const side of [-1, 1])
    for (let i = 0; i < 6; i++) {
      const z = -382 + rand() * 70;
      const x = side * (0.62 * halfW(z) + 2 + rand() * (0.3 * halfW(z) - 3));
      spikes.push([
        x,
        topAt(x, z) + 0.2,
        z,
        14 + rand() * 26,
        0.8 + rand() * 0.6,
      ]);
    }
  for (let i = 0; i < 18; i++) {
    const z = -160 + rand() * 90;
    const x = (rand() - 0.5) * 22;
    spikes.push([
      x,
      domeCrest(z) + 4.0,
      z,
      26 + rand() * 36,
      1.0 + rand() * 0.8,
    ]);
  }
  for (let i = 0; i < 7; i++) {
    const z = 30 + rand() * 70;
    const a = Math.PI / 2 + (rand() - 0.5) * 0.6;
    const s = domeAt(a, z, 0);
    spikes.push([s.p[0], s.p[1] - 0.3, z, 9 + rand() * 14, 0.8 + rand() * 0.5]);
  }
  spikes.forEach(([x, y, z, h, w], i) => {
    spike(add, {
      x,
      y,
      z,
      h,
      w,
      lod: 0,
      mast: K.MACH,
      base: K.MACH_DK,
      cross: i % 3 === 0,
    });
    if (i % 3 === 0)
      spike(add, {
        x,
        y,
        z,
        h,
        w: w * 1.8,
        lod: 1,
        mast: K.MACH,
        base: K.MACH_DK,
        cross: false,
      });
  });

  // ---------------------------------------------------------------------------
  // underslung hangar module (light, angular) with lit hangar mouths, the keel spar and antennas
  // ---------------------------------------------------------------------------
  const modSec = (z, hw, top) => {
    const bottom = MODULE.bottom;
    return {
      z,
      pts: octagonAt(hw, (top - bottom) / 2, 0, (top + bottom) / 2, 0.62),
    };
  };
  for (const lod of [0, 1, 2])
    add(
      sectionLoft(
        [
          modSec(MODULE.z0, 8, -40),
          modSec(MODULE.z0 + 12, 20, bottomY(MODULE.z0 + 12) + 1),
          modSec(-300, 22, bottomY(-300) + 1),
          modSec(MODULE.z1 - 14, 26, bottomY(MODULE.z1 - 14) + 1),
          modSec(MODULE.z1, 14, -46),
        ],
        { capStart: true, capEnd: true, texel: 1 / 10 },
      ),
      "hull",
      {
        uv: "keep",
        lod,
        tint: (x, y, z, o) =>
          o
            .copy(K.LIGHT)
            .multiplyScalar(
              y < MODULE.bottom + 1 ? 0.7 : Math.abs(x) > 19 ? 0.86 : 0.95,
            ),
      },
    );
  for (const lod of [0, 1])
    for (const side of [-1, 1])
      for (const [zc, hw] of [
        [-340, 20.6],
        [-262, 22.4],
      ]) {
        const cy = -47;
        add(
          openBoxInterior(
            [side * (hw - 4.5), cy, zc],
            [4.6, 5.5, 15],
            side > 0 ? "+x" : "-x",
          ),
          "dark",
          {
            color: 0x14151a,
            texel: 1 / 4,
            lod,
          },
        );
        add(
          quadAt(
            [side * (hw - 2.2), cy - 4.6, zc],
            [side, 0, 0],
            [0, 0, 1],
            28,
            0.8,
            0,
          ),
          "windows",
          {
            color: K.WINDOW,
            lod,
            uv: "keep",
          },
        );
        if (lod === 0)
          for (const dz of [-15.5, 15.5])
            add(
              bar(
                [side * (hw + 0.4), cy - 6.2, zc + dz],
                [side * (hw + 0.4), cy + 6.2, zc + dz],
                1.6,
                1.6,
              ),
              "hull",
              {
                color: K.MID.getHex(),
                texel: 1 / 4,
                lod,
              },
            );
      }
  // keel spar with fins, forward antennas under the module
  for (const lod of [0, 1]) {
    add(bar([0, -60, -392], [0, -63, -232], 2.4, 2.4), "dark", {
      color: K.MACH_DK,
      texel: 1 / 3,
      lod,
    });
    for (const z of [-372, -300])
      add(quadAt([0, -66.5, z], [1, 0, 0], [0, 0, 1], 26, 7, 0), "dark", {
        color: K.MACH_DK,
        texel: 1 / 4,
        lod,
      });
    for (const [x, y] of [
      [-9, -50],
      [0, -55],
      [9, -50],
    ])
      add(
        bar([x, y, MODULE.z0 + 2], [x * 1.3, y - 3, MODULE.z0 - 36], 1.1, 1.1),
        "dark",
        {
          color: K.MACH,
          texel: 1 / 3,
          lod,
        },
      );
  }

  // ---------------------------------------------------------------------------
  // exposed structure: frames, rails, recessed panels and lit slots on the dark regions
  // ---------------------------------------------------------------------------
  // rail: small octagonal tube following a list of [x, y, z] points
  const rail = (pts, r, color, lod, mat = "hull") =>
    add(
      sectionLoft(
        pts.map((p) => ({ z: p[2], pts: octagonAt(r, r, p[0], p[1], 0.45) })),
        { capStart: true, capEnd: true, texel: 1 / 3 },
      ),
      mat,
      { uv: "keep", lod, color },
    );
  const panelColour = (i) => [K.MACH_DK, 0x2a2c30, K.RUST, K.MACH_DK][i % 4];
  for (const lod of [0, 1])
    for (const side of [-1, 1]) {
      // (a) forward lower band: frames down the lower flank, knuckle rail, inset panels with lit slots
      for (let z = Z_BAND + 10, i = 0; z < -222; z += 24, i++) {
        if (lod === 1 && i % 2) continue;
        add(
          bar(
            lowerFlankAt(z, 0.05, side, 0.9).p,
            lowerFlankAt(z, 1.0, side, 0.9).p,
            2,
            2,
          ),
          "hull",
          {
            color: FRAME,
            texel: 1 / 3,
            lod,
          },
        );
        if (lod === 0 && z + 24 < -222) {
          const zc = z + 12;
          const a = new THREE.Vector3(...lowerFlankAt(zc, 0.15, side, 0.4).p);
          const b = new THREE.Vector3(...lowerFlankAt(zc, 0.85, side, 0.4).p);
          const mid = lowerFlankAt(zc, 0.5, side, 0.4);
          add(quadAt(mid.p, mid.n, [0, 0, 1], 18, a.distanceTo(b), 0), "dark", {
            color: panelColour(i),
            texel: 1 / 4,
            lod,
          });
          if (i % 2 === 0)
            add(
              quadAt(
                lowerFlankAt(zc, 0.5, side, 0.6).p,
                mid.n,
                [0, 0, 1],
                12,
                1.3,
                0,
              ),
              "windows",
              {
                color: K.WINDOW,
                lod,
                uv: "keep",
              },
            );
        }
      }
      rail(
        [-530, -475, -415, -356, -297, -237, -222].map(
          (z) => lowerFlankAt(z, 1.0, side, 1.0).p,
        ),
        1.1,
        FRAME,
        lod,
      );
      // (b) dark flank under the dome: frames from the hem down to the band edge, two rails,
      //     recessed panels in two rows, lit slots and the big lit bay
      // irregular frame spacing (18 .. 34 m) so the machinery does not read as a window row
      for (let z = Z_DOME + 10, i = 0; z < Z_TAIL - 8; i++) {
        const gap = 18 + hash(i * 3 + 11) * 16;
        const zn = Math.min(z + gap, Z_TAIL - 4);
        if (lod === 0 || i % 2 === 0)
          add(
            bar(
              flankAt(z, Y_BAND + 0.5, side, 1.0).p,
              flankAt(z, shoulderY(z) - 3.4, side, 1.0).p,
              2.4,
              2.4,
            ),
            "hull",
            {
              color: FRAME,
              texel: 1 / 3,
              lod,
            },
          );
        if (lod === 0 && zn - z > 14) {
          const zc = (z + zn) / 2;
          const split = 6 + hash(i * 7 + 3) * 10; // height of the row boundary varies per bay
          for (const [y0, y1] of [
            [shoulderY(zc) - 4.6, split + 2.5],
            [split - 1, Y_BAND + 1.6],
          ]) {
            const row = y0 > split ? 0 : 1;
            const k = i * 2 + row;
            const A = new THREE.Vector3(...flankAt(zc, y0, side, 0.35).p);
            const B = new THREE.Vector3(...flankAt(zc, y1, side, 0.35).p);
            const m = flankAt(zc, (y0 + y1) / 2, side, 0.35);
            add(
              quadAt(
                m.p,
                m.n,
                [0, 0, 1],
                zn - z - 6,
                A.distanceTo(B) * 0.92,
                0,
              ),
              "dark",
              {
                color: panelColour(k),
                texel: 1 / 4,
                lod,
              },
            );
            // vertical pipe pairs on some bays
            if (k % 4 === 2)
              for (const dz of [-4, 4])
                add(
                  bar(
                    flankAt(zc + dz, y1 + 1, side, 1.3).p,
                    flankAt(zc + dz, y0 - 1, side, 1.3).p,
                    1.2,
                    1.2,
                  ),
                  "dark",
                  { color: K.MACH, texel: 1 / 3, lod },
                );
            if (k % 3 === 1)
              add(
                quadAt(
                  flankAt(zc, (y0 + y1) / 2 - 2, side, 0.55).p,
                  m.n,
                  [0, 0, 1],
                  13,
                  1.3,
                  0,
                ),
                "windows",
                {
                  color: k % 2 ? K.WINDOW_GREEN : K.WINDOW,
                  lod,
                  uv: "keep",
                },
              );
          }
        }
        z = zn;
      }
      for (const y of [22, 5])
        rail(
          [-217, -178, -95, 0, 59, 116].map((z) => flankAt(z, y, side, 1.1).p),
          1.1,
          FRAME,
          lod,
        );
      // lit bay (blue-white) on the aft flank under the dome
      slotWindow(add, {
        c: flankAt(38, 0, side, 0.9).p,
        n: flankAt(38, 0, side, 0).n,
        along: [0, 0, 1],
        len: 22,
        h: 6,
        lod,
        panes: 4,
        glow: 0xdce8ff,
        rim: K.MACH_DK,
      });
      // (c) skeletal tail: full frames every 16 m, longitudinal stringers, lit row under the box
      for (let z = Z_TAIL + 8, i = 0; z < TAIL_Z - 4; z += 16, i++) {
        if (lod === 1 && i % 2) continue;
        if (side < 0) continue; // frames are symmetric: build once
        const sec = bodySection(z);
        add(
          ringZ(offsetPoly(sec, 1.4), offsetPoly(sec, -0.2), z - 1.1, z + 1.1),
          "hull",
          {
            color: FRAME,
            texel: 1 / 3,
            lod,
          },
        );
      }
      for (const t of [0.35, 1.0])
        rail(
          [Z_TAIL + 2, 154, 190, TAIL_Z - 2].map(
            (z) => lowerFlankAt(z, t, side, 1.2).p,
          ),
          1.0,
          FRAME,
          lod,
        );
      rail(
        [Z_TAIL + 2, 154, 190, TAIL_Z - 2].map(
          (z) => flankAt(z, shoulderY(z) - 1, side, 1.2).p,
        ),
        1.0,
        FRAME,
        lod,
      );
      if (lod === 0)
        for (let z = 128; z < 200; z += 12)
          add(
            quadAt(
              flankAt(z, (grooveY(z) + midY(z)) / 2, side, 0.6).p,
              flankAt(z, (grooveY(z) + midY(z)) / 2, side, 0).n,
              [0, 0, 1],
              6,
              1.6,
              0,
            ),
            "windows",
            {
              color: K.WINDOW,
              lod,
              uv: "keep",
            },
          );
    }
  // light box on the skeletal tail with a row of lit windows, and the pylon foot for the top pod
  for (const lod of [0, 1, 2]) {
    const yb = deckY(165) - 1;
    add(
      sectionLoft(
        [
          { z: 140, pts: octagonAt(9, 3, 0, yb + 3, 0.6) },
          { z: 148, pts: octagonAt(13, 5, 0, yb + 5, 0.6) },
          { z: 184, pts: octagonAt(13, 5, 0, yb + 5, 0.6) },
          { z: 192, pts: octagonAt(9, 3, 0, yb + 3, 0.6) },
        ],
        { capStart: true, capEnd: true, texel: 1 / 6 },
      ),
      "hull",
      { uv: "keep", lod, color: K.LIGHT.getHex() },
    );
    if (lod < 2)
      for (const side of [-1, 1])
        for (let z = 152; z <= 180; z += 7)
          add(
            quadAt(
              [side * 13.3, yb + 4.2, z],
              [side, 0, 0],
              [0, 0, 1],
              4,
              1.6,
              0,
            ),
            "windows",
            {
              color: K.WINDOW,
              lod,
              uv: "keep",
            },
          );
  }
  // small greeble boxes on the dark flank and the tail (LOD 0)
  for (let i = 0; i < 150; i++) {
    const side = i % 2 ? 1 : -1;
    const z = Z_DOME + 6 + rand() * (TAIL_Z - Z_DOME - 12);
    const yLo = z < Z_TAIL ? Y_BAND + 2 : midY(z) + 1;
    const yHi = shoulderY(z) - 5;
    const y = yLo + rand() * (yHi - yLo);
    const f = flankAt(z, y, side, 0);
    const d = 1 + rand() * 1.8;
    const p0 = new THREE.Vector3(...f.p);
    const p1 = p0.clone().addScaledVector(new THREE.Vector3(...f.n), d);
    add(
      bar(p0.toArray(), p1.toArray(), 2 + rand() * 4, 1.5 + rand() * 3),
      "dark",
      {
        color: i % 5 ? K.MACH : K.RUST,
        texel: 1 / 3,
        lod: 0,
      },
    );
  }

  // dark machinery chin under the blade (between the tip and the hangar module)
  for (const lod of [0, 1]) {
    const secs = [];
    for (const z of [-548, -530, -500, -460, -420, MODULE.z0 + 6]) {
      const w = z === -548 ? 1.5 : botW(z) * 0.72;
      const yb = bottomY(z);
      const d = z === -548 ? 0.6 : 3.5 + 1.5 * smoothstep(-548, -470, z);
      secs.push({
        z,
        pts: octagonAt(w, d / 2 + 0.6, 0, yb - d / 2 + 0.6, 0.6),
      });
    }
    add(
      sectionLoft(secs, { capStart: true, capEnd: true, texel: 1 / 6 }),
      "dark",
      { uv: "keep", lod, color: K.MACH_DK },
    );
  }
  for (let i = 0; i < 26; i++) {
    const z = -535 + rand() * 125;
    const w = botW(z) * 0.72;
    const x = (rand() - 0.5) * 2 * (w - 2);
    const h = 1 + rand() * 2.5;
    add(
      new THREE.BoxGeometry(1.5 + rand() * 3, h, 2 + rand() * 6).translate(
        x,
        bottomY(z) - 4.2 - h / 2,
        z,
      ),
      "dark",
      { color: i % 4 ? K.MACH : K.RUST, texel: 1 / 3, lod: 0 },
    );
  }

  // ---------------------------------------------------------------------------
  // belly: pipes, hatches; deck hatches ahead of the platform
  // ---------------------------------------------------------------------------
  for (const lod of [0, 1])
    for (const x of [-13, 13])
      rail(
        [-160, -95, 0, 59, 115].map((z) => [x, bottomY(z) - 1.3, z]),
        1.4,
        K.MACH,
        lod,
        "dark",
      );
  for (const [x, z] of [
    [0, -470],
    [-14, -120],
    [14, -120],
    [0, -40],
    [14, 30],
    [-14, 30],
    [0, 90],
  ])
    hatch(add, {
      c: [x, bottomY(z) - 0.8, z],
      n: [0, -1, 0],
      along: [0, 0, 1],
      w: 7,
      h: 9,
      lod: 0,
      color: K.MID.getHex(),
      rimColor: K.MACH_DK,
      big: true,
    });
  for (let i = 0; i < 12; i++) {
    const z = -530 + rand() * 90;
    const x = (rand() - 0.5) * 2 * (0.55 * halfW(z) - 3);
    hatch(add, {
      c: [x, topAt(x, z) + 0.2, z],
      n: [0, 1, 0],
      along: [0, 0, 1],
      w: 3 + rand() * 3,
      h: 4 + rand() * 4,
      lod: 0,
      color: K.LIGHT.getHex(),
      rimColor: K.MACH_DK,
    });
  }
}
