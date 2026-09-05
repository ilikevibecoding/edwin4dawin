// Dreadnaught-class heavy cruiser (Republic), 600 m long, 116 m wide, ~118 m tall. Original procedural
// geometry after the Rendili design, measured off the cutaway front and side views: one continuous hull
// loft through a single section family (flat deck, rounded corners, flanks slanting out to a chine, a
// chamfered dark shoulder, belly sides slanting in to a flat keel). The hammerhead bow is the widest
// part: a 80 m forehead arc from a chisel nose lip at chine height up to the deck, a cargo-hold belly
// deepest at 27 % of the length, rounded aft corners rolling down onto the narrower mid-hull. The
// mid-hull carries five egg-shaped deflector pods per flank (two on the deck shoulders), a low hangar
// band, an open-topped dorsal machinery box with a big cylinder, the bridge tower with its wide sensor
// head and a ventral mast. The stern block flares out and up (taller above the centreline than below)
// into three stacked engine housings ending in three large pentagonal nozzles over two smaller ones.
// Grey plating with dark panel bands, red fleet roundel; twin heavies and quad batteries in dorsal,
// ventral and flank rows.
import * as THREE from "three";
import { assemble } from "./shipKit.js";
import {
  col,
  flipFaces,
  frameAt,
  loftZ,
  mix,
  mpart,
  openBoxInterior,
  quadAt,
  ringZ,
  rng,
  smoothstep,
} from "./munificentGeo.js";
import { dishMast, hatch, slotRow, slotWindow } from "./munificentDetail.js";
import { bellGradient } from "./munificentEngines.js";
import {
  annulusAt,
  cornerFall,
  hullSection,
  loftSections,
  placeOnSurface,
  plateWithHoles,
  podGeo,
  polygonProfile,
  rampLin,
  ringAtY,
  smooth01,
  surfaceBox,
  table,
} from "./dreadnoughtGeo.js";
import { heavyTwin, quadTurret } from "./dreadnoughtTurrets.js";

export const DREADNOUGHT = { length: 600, width: 116, height: 118 };

// palette: vertex tints over the shared plating (albedo ~0.62 before tint). Neutral grey a step
// darker than the Venator's cream so the old cruisers read as a different generation in the line.
const GREY = col(0x868581);
const GREY_LT = GREY.clone().multiplyScalar(1.12);
const GREY_DK = GREY.clone().multiplyScalar(0.72);
const BAND = GREY.clone().multiplyScalar(0.42); // dark panel bands
const SOOT = col(0x2a2826);
const RECESS = 0x7c7a78; // machinery grey
const RECESS_DK = 0x4c4a48;
const CORE = 0x3a3836;
const RED = 0x9c2a22;
const WINDOW = 0xffe2b0;
const WINDOW_COOL = 0x9ad4ff;
const TEX = 1 / 30; // plating tiles on the big hull surfaces

// ---------------------------------------------------------------------------
// hull stations (metres, forward -z, origin at the mid-hull centre)
// ---------------------------------------------------------------------------
const Z_NOSE = -300;
const Z_STERN = 300;
const L_FORE = 80; // forehead arc, nose lip to deck crest
const R_NOSE = 24; // plan-view nose corner radius
const Z_CORNER0 = -118; // hammerhead aft corners (plan) start rounding
const Z_CORNER1 = -94; // ... and reach the mid-hull width
const Z_ROLL0 = -117; // deck rolls down onto the mid deck
const Z_ROLL1 = -83;
const Z_BAY0 = -60;
const Z_BAY1 = 45;
const BAY_Y = [-28, -16];
const Z_FLARE0 = 115;
const Z_HOU = 265;
const Z_BOXF = 55; // dorsal machinery box
const Z_BOXA = 122;

// section parameter sets; `slant` = flank inward lean per metre of height (hwV = hwC - slant * h)
const BOW = {
  hwC: 58,
  yC: -5.6,
  yT: 48.5,
  slant: 0.296,
  cr: 8,
  chX: 15,
  chY: 9.6,
  slope: 0.64,
  rB: 6,
};
const MID = {
  hwC: 31,
  yC: -8,
  yT: 38.7,
  slant: 0.054,
  cr: 10,
  chX: 4,
  chY: 4,
  slope: 0.28,
  yB: -38.7,
  rB: 8,
};
const BLK = {
  hwC: 55,
  yC: 10,
  yT: 68,
  slant: 0.034,
  cr: 8,
  chX: 6,
  chY: 6,
  slope: 0.3,
  yB: -49,
  rB: 10,
};
const HOU = {
  hwC: 58,
  yC: 10,
  yT: 71,
  slant: 0.016,
  cr: 7,
  chX: 6,
  chY: 6,
  slope: 0.3,
  yB: -47,
  rB: 10,
};
// cargo-hold belly under the bow (side view of the cutaway), z -> keel height
const BOW_KEEL = [
  [-300, -7.1],
  [-264, -7.1],
  [-262, -8],
  [-257, -10.3],
  [-252.5, -14],
  [-248, -17.2],
  [-243, -20.5],
  [-238.5, -23.3],
  [-234, -26],
  [-229, -28.4],
  [-224.5, -30.8],
  [-215, -35],
  [-206, -38.2],
  [-196.5, -41],
  [-187, -43],
  [-178, -44.7],
  [-168.6, -45.7],
  [-159, -46],
  [-150, -44.7],
  [-140.6, -42],
  [-131.3, MID.yB],
];
const lerpK = (A, B, t, keys) => {
  const o = {};
  for (const k of keys) o[k] = A[k] + (B[k] - A[k]) * t;
  return o;
};
const SHAPE_KEYS = ["cr", "chX", "chY", "slope", "rB", "slant"];

// full section parameters at station z
export function hullParams(z) {
  let p;
  if (z < Z_FLARE0) {
    const fore =
      1 - Math.pow(1 - Math.min(1, Math.max(0, (z - Z_NOSE) / L_FORE)), 2.3);
    const zc = Z_NOSE + R_NOSE;
    const nose =
      z < zc ? Math.sqrt(Math.max(0, 1 - ((zc - z) / R_NOSE) ** 2)) : 1;
    const hwBow = BOW.hwC - R_NOSE + R_NOSE * nose;
    const tC = cornerFall(z, Z_CORNER0, Z_CORNER1); // 1 on the hammerhead, 0 aft of the corners
    const tS = smooth01((z + 125) / 31); // shape blend
    const hwC = MID.hwC + (hwBow - MID.hwC) * tC;
    const yC =
      BOW.yC +
      (MID.yC - BOW.yC) * smooth01((z - Z_CORNER0) / (Z_CORNER1 - Z_CORNER0));
    const deckBow = BOW.yC + (BOW.yT - BOW.yC) * fore;
    const yT =
      deckBow +
      (MID.yT - deckBow) * smooth01((z - Z_ROLL0) / (Z_ROLL1 - Z_ROLL0));
    const yB = z <= -131.3 ? table(BOW_KEEL, z) : MID.yB;
    p = { hwC, yC, yT, yB, ...lerpK(BOW, MID, tS, SHAPE_KEYS) };
  } else if (z < Z_HOU) {
    const tW = rampLin(z, 118, 192, 0.25);
    const tT = rampLin(z, Z_FLARE0, 225, 0.2);
    const tB = rampLin(z, 113, 180, 0.25);
    const tS = rampLin(z, 118, 195, 0.25);
    p = {
      hwC: MID.hwC + (BLK.hwC - MID.hwC) * tW,
      yC: MID.yC + (BLK.yC - MID.yC) * tS,
      yT: MID.yT + (BLK.yT - MID.yT) * tT,
      yB: MID.yB + (BLK.yB - MID.yB) * tB,
      ...lerpK(MID, BLK, tS, SHAPE_KEYS),
    };
  } else {
    p = { ...HOU };
  }
  p.hwV = p.hwC - p.slant * Math.max(0, p.yT - p.yC);
  return p;
}
const secAt = (z, kC = 6, kB = 6, cuts = BAY_Y) =>
  hullSection({ ...hullParams(z), kC, kB, cuts });
// point + outward normal on the hull surface at height y, side +1 starboard (3-D arrays)
function flank(z, y, side) {
  const r = ringAtY(secAt(z).pts, y, side);
  if (!r) return { p: [0, hullParams(z).yT, z], n: [0, 1, 0] };
  return { p: [r.p[0], r.p[1], z], n: [r.n[0], r.n[1], 0] };
}
// midpoint of the belly slant at z (for ventral flank fittings)
function slantMid(z, side) {
  const s = secAt(z);
  return flank(z, (s.shoulder[1] + s.slantEnd[1]) / 2, side);
}

// transverse dark panel bands: [z, half-width, strength]
const BANDS = [
  [-244, 1.5, 0.32],
  [-212, 1.5, 0.32],
  [-170, 1.2, 0.3],
  [-124, 1.8, 0.5],
  [-80, 1.2, 0.6],
  [-30, 1.2, 0.6],
  [30, 1.2, 0.6],
  [80, 1.2, 0.6],
  [112, 1.4, 0.7],
  [155, 1.2, 0.5],
  [196, 1.4, 0.6],
];
// per-vertex hull tint; `across` = 1 marks the chamfered shoulder faces (set by markChamfer)
function hullTint(x, y, z, o, across) {
  const p = hullParams(z);
  o.copy(GREY);
  if (y > p.yT - 2.5) o.multiplyScalar(1.05);
  if (y < p.yC - p.chY + 0.3) o.multiplyScalar(0.86);
  if (across > 0.5) o.lerp(BAND, 0.55);
  let band = 0;
  for (const [zb, w, k] of BANDS)
    band +=
      smoothstep(zb - w - 1.2, zb - w, z) *
      (1 - smoothstep(zb + w, zb + w + 1.2, z)) *
      k;
  if (z > 200 && z < Z_HOU)
    for (let zb = 206; zb < Z_HOU; zb += 14)
      band +=
        smoothstep(zb - 1.6, zb - 0.6, z) *
        (1 - smoothstep(zb + 0.6, zb + 1.6, z)) *
        (zb % 28 === 10 ? 0.9 : 0.5);
  if (z > Z_HOU - 0.5) {
    const dy = Math.min(Math.abs(y - 32), Math.abs(y + 7));
    band += (1 - smoothstep(0.9, 2.0, dy)) * 0.95;
    band += (1 - smoothstep(0.4, 1.4, Math.abs(z - Z_HOU - 2.5))) * 0.6;
  }
  o.lerp(BAND, Math.min(1, band));
  o.lerp(SOOT, 0.35 * smoothstep(262, 300, z));
}
// flag the chamfer faces (all three vertices within the chine..shoulder band, facing down-outward)
function markChamfer(g) {
  const pos = g.attributes.position;
  const arr = new Float32Array(pos.count);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let t = 0; t + 2 < pos.count; t += 3) {
    a.fromBufferAttribute(pos, t);
    b.fromBufferAttribute(pos, t + 1);
    c.fromBufferAttribute(pos, t + 2);
    n.crossVectors(b.clone().sub(a), c.clone().sub(a));
    if (n.y >= -0.45 * n.length()) continue;
    const p = hullParams((a.z + b.z + c.z) / 3);
    const lo = p.yC - Math.min(p.chY, (p.yC - p.yB) * 0.5) - 0.35;
    const hi = p.yC + 0.35;
    if (
      [a, b, c].every(
        (v) => v.y > lo && v.y < hi && Math.abs(v.x) > p.hwC - p.chX - 1.5,
      )
    ) {
      arr[t] = arr[t + 1] = arr[t + 2] = 1;
    }
  }
  g.setAttribute("across", new THREE.BufferAttribute(arr, 1));
  return g;
}

export function buildDreadnought(mats) {
  const L = DREADNOUGHT.length;
  const parts = [];
  const hardpoints = [];
  const engines = [];
  const turrets = [];
  const add = (geo, mat, opts) => parts.push(mpart(geo, mat, opts));
  const rand = rng(6001);

  // ---------------------------------------------------------------------------
  // hull: one section family lofted nose to stern (three runs so the hangar band can stay open)
  // ---------------------------------------------------------------------------
  const foreZ = (us) => us.map((u) => Z_NOSE + L_FORE * u);
  const range = (z0, z1, step) => {
    const out = [];
    for (let z = z0; z < z1 - 1e-6; z += step) out.push(z);
    return out;
  };
  const STATIONS = {
    0: [
      ...foreZ([
        0, 0.01, 0.025, 0.045, 0.07, 0.1, 0.14, 0.19, 0.25, 0.32, 0.4, 0.5, 0.6,
        0.72, 0.85, 1,
      ]),
      ...range(-212, -136, 8),
      -136,
      -132,
      -128,
      -124,
      -120,
      -116,
      -112,
      -108,
      -104,
      -100,
      -96,
      -92,
      -84,
      -72,
      Z_BAY0,
    ],
    1: [
      ...foreZ([0, 0.02, 0.06, 0.12, 0.2, 0.32, 0.48, 0.7, 1]),
      -205,
      -190,
      -175,
      -160,
      -145,
      -134,
      -128,
      -120,
      -112,
      -104,
      -96,
      -80,
      Z_BAY0,
    ],
    2: [
      ...foreZ([0, 0.04, 0.12, 0.3, 0.6, 1]),
      -190,
      -160,
      -134,
      -120,
      -108,
      -96,
      Z_BAY0,
    ],
  };
  const AFT = {
    0: [
      Z_BAY1,
      80,
      105,
      Z_FLARE0,
      121,
      127,
      133,
      140,
      147,
      154,
      161,
      168,
      175,
      182,
      190,
      198,
      206,
      215,
      227,
      240,
      252,
      Z_HOU,
      Z_HOU + 0.01,
      282,
      Z_STERN,
    ],
    1: [
      Z_BAY1,
      Z_FLARE0,
      135,
      155,
      175,
      195,
      227,
      Z_HOU,
      Z_HOU + 0.01,
      Z_STERN,
    ],
    2: [Z_BAY1, Z_FLARE0, 155, 195, Z_HOU, Z_HOU + 0.01, Z_STERN],
  };
  for (const lod of [0, 1, 2]) {
    const kC = lod === 0 ? 6 : lod === 1 ? 4 : 2;
    const kB = kC;
    const sec = (z) => ({ z, pts: secAt(z, kC, kB).pts });
    const cut = secAt(0, kC, kB).cutIdx;
    const runs = [
      [STATIONS[lod], null, { capStart: true }],
      [[Z_BAY0, Z_BAY1], lod === 2 ? null : new Set([cut.left, cut.right]), {}],
      [AFT[lod], null, {}],
    ];
    for (const [zs, omit, extra] of runs) {
      const g = loftSections(zs.map(sec), {
        texel: TEX,
        omit,
        seam: "crease",
        ...extra,
      });
      add(markChamfer(g), "hull", { uv: "keep", lod, tint: hullTint });
    }
  }

  // ---------------------------------------------------------------------------
  // bow details
  // ---------------------------------------------------------------------------
  const Y_DECK = BOW.yT;
  // raised plate groups on the bow deck (the heavy rectangular plating of the paintings)
  {
    const cols = [
      [-33, -12],
      [-10, 10],
      [12, 33],
    ];
    let z0 = -216;
    let row = 0;
    while (z0 < -118) {
      const len = 9 + rand() * 8;
      const z1 = Math.min(-118, z0 + len);
      cols.forEach(([xa, xb], ci) => {
        if (rand() < 0.22) return;
        const shade = 0.92 + rand() * 0.18;
        const tone = (ci + row) % 3 === 0 ? GREY_LT : GREY;
        add(
          new THREE.BoxGeometry(xb - xa - 1.2, 0.55, z1 - z0 - 1.2).translate(
            (xa + xb) / 2,
            Y_DECK + 0.27,
            (z0 + z1) / 2,
          ),
          "hull",
          { color: tone.clone().multiplyScalar(shade), texel: 1 / 12, lod: 0 },
        );
      });
      z0 = z1 + 0.4;
      row++;
    }
  }
  // Republic red deck stripes along the bow deck edges and the red fleet roundel on each flank
  for (const lod of [0, 1])
    for (const s of [-1, 1]) {
      add(
        new THREE.BoxGeometry(1.6, 0.2, 84).translate(
          s * 30.5,
          Y_DECK + 0.62,
          -168,
        ),
        "paint",
        { color: RED, lod, uv: "keep" },
      );
      const f = flank(-190, 31, s);
      add(annulusAt(f.p, f.n, 5.2, 8, 24, 0.2), "paint", {
        color: RED,
        lod,
        uv: "keep",
      });
      add(surfaceBox(f.p, f.n, [0, 0, 1], 3, 1.6, 0.2, 0.15), "paint", {
        color: RED,
        lod,
        uv: "keep",
      });
    }
  // command-deck window row across the forehead, crew-station slots and window dots along the flanks
  for (const lod of [0, 1]) {
    {
      const z = -268;
      const dz = 0.5;
      const slope = (hullParams(z + dz).yT - hullParams(z - dz).yT) / (2 * dz);
      const n = new THREE.Vector3(0, 1, -slope).normalize();
      slotRow(add, {
        c: [0, hullParams(z).yT, z],
        n: n.toArray(),
        along: [1, 0, 0],
        count: lod === 0 ? 8 : 4,
        len: lod === 0 ? 4.5 : 9.6,
        gap: 1.2,
        h: 2.0,
        lod,
        panes: 2,
        glow: WINDOW,
        rim: RECESS_DK,
      });
    }
    for (const s of [-1, 1]) {
      const nSlots = lod === 0 ? 12 : 6;
      const len = lod === 0 ? 8 : 17;
      const total = nSlots * len + (nSlots - 1) * 2.6;
      for (let i = 0; i < nSlots; i++) {
        const z = -208 - total / 2 + len / 2 + i * (len + 2.6);
        const f = flank(z, 18, s);
        slotWindow(add, {
          c: f.p,
          n: f.n,
          along: [0, 0, 1],
          len,
          h: 2.4,
          lod,
          panes: 2,
          glow: WINDOW,
          rim: RECESS_DK,
        });
      }
      if (lod === 0)
        for (const [yy, n, z0, z1] of [
          [25, 14, -262, -140],
          [0.5, 16, -270, -140],
        ])
          for (let i = 0; i < n; i++) {
            const z = z0 + (i / (n - 1)) * (z1 - z0) + (rand() - 0.5) * 2;
            if (yy > 20 && z > -258 && z < -212) continue; // upper blister
            const f = flank(z, yy, s);
            add(quadAt(f.p, f.n, [0, 0, 1], 1.8, 1.1, 0.12), "windows", {
              color: WINDOW,
              lod,
              uv: "keep",
            });
          }
    }
  }
  // turbolaser battery blisters on the bow flanks (two per side)
  for (const lod of [0, 1, 2])
    for (const s of [-1, 1])
      for (const [yy, z, len, wid, hgt] of [
        [30, -235, 44, 16, 7],
        [9, -175, 30, 10, 4.5],
      ]) {
        if (lod === 2 && hgt < 5) continue;
        const f = flank(z, yy, s);
        const seg = lod === 0 ? 14 : lod === 1 ? 10 : 6;
        const ringsN = lod === 0 ? 6 : lod === 1 ? 4 : 2;
        add(
          placeOnSurface(
            podGeo(len, wid, hgt, seg, ringsN, 0.2),
            f.p,
            f.n,
            [0, 0, 1],
            0.8,
          ),
          "hull",
          {
            texel: 1 / 8,
            lod,
            color: GREY_LT.clone().multiplyScalar(0.96),
          },
        );
      }
  // deck hatches and cargo-hold doors on the keel
  for (const lod of [0, 1]) {
    for (const [x, z] of [
      [-8, -178],
      [10, -128],
      [24, -180],
    ])
      hatch(add, {
        c: [x, Y_DECK + 0.55, z],
        n: [0, 1, 0],
        along: [0, 0, 1],
        w: 7,
        h: 9,
        lod,
        color: GREY_LT,
        rimColor: RECESS_DK,
        big: true,
      });
    for (const z of [-206, -182, -158])
      hatch(add, {
        c: [0, hullParams(z).yB, z],
        n: [0, -1, 0],
        along: [0, 0, 1],
        w: 14,
        h: 18,
        lod,
        color: GREY_DK,
        rimColor: RECESS_DK,
        big: true,
      });
  }
  // sensor domes: primary on the forehead crest, secondary under the cargo hold
  for (const lod of [0, 1]) {
    const d = new THREE.SphereGeometry(
      3.2,
      lod === 0 ? 14 : 8,
      lod === 0 ? 8 : 4,
    );
    d.scale(1, 0.55, 1);
    d.translate(0, hullParams(-236).yT + 0.2, -236);
    add(d, "dark", { color: RECESS, texel: 1 / 3, lod });
    const d2 = new THREE.SphereGeometry(
      3.6,
      lod === 0 ? 14 : 8,
      lod === 0 ? 8 : 4,
    );
    d2.scale(1, 0.55, 1);
    d2.translate(0, hullParams(-165).yB - 0.2, -165);
    add(d2, "dark", { color: RECESS, texel: 1 / 3, lod });
  }

  // ---------------------------------------------------------------------------
  // mid-hull details: hangar band, deflector pods, windows, panels
  // ---------------------------------------------------------------------------
  {
    const midSec = secAt(0);
    const yc = (BAY_Y[0] + BAY_Y[1]) / 2;
    const hh = (BAY_Y[1] - BAY_Y[0]) / 2;
    const zc = (Z_BAY0 + Z_BAY1) / 2;
    const len = Z_BAY1 - Z_BAY0;
    const top = ringAtY(midSec.pts, BAY_Y[1], 1).p[0]; // hull x at the top of the opening
    const xIn = 14;
    for (const lod of [0, 1])
      for (const s of [-1, 1]) {
        const f = flank(zc, yc, s);
        add(
          openBoxInterior(
            [s * ((xIn + top) / 2), yc, zc],
            [(top - xIn) / 2, hh, len / 2],
            s > 0 ? "+x" : "-x",
          ),
          "dark",
          {
            color: CORE,
            texel: 1 / 4,
            lod,
          },
        );
        add(
          frameAt(f.p, f.n, [0, 0, 1], len + 3, 2 * hh + 3, 1.4, 0.7, 0.1),
          "hull",
          { color: GREY_DK, texel: 1 / 6, lod },
        );
        // lit ceiling strip and pad lights
        add(
          quadAt(
            [s * ((xIn + top) / 2), BAY_Y[1] - 0.15, zc],
            [0, -1, 0],
            [0, 0, 1],
            len - 6,
            2.2,
            0,
          ),
          "windows",
          {
            color: 0xffd9a0,
            lod,
            uv: "keep",
          },
        );
        const nP = 5;
        for (let i = 1; i <= nP; i++) {
          const z = Z_BAY0 + (len * i) / (nP + 1);
          const g = flank(z, yc, s);
          add(
            surfaceBox(g.p, g.n, [0, 0, 1], 2.4, 2 * hh + 0.4, 1.4, -1.2),
            "hull",
            { color: GREY_DK, texel: 1 / 4, lod },
          );
        }
        if (lod === 0)
          for (let i = 0; i <= nP; i++) {
            const z = Z_BAY0 + (len * (i + 0.5)) / (nP + 1);
            add(
              new THREE.BoxGeometry(4, 3, 6 + rand() * 6).translate(
                s * (xIn + 3),
                BAY_Y[0] + 1.5,
                z + (rand() - 0.5) * 6,
              ),
              "dark",
              {
                color: RECESS,
                texel: 1 / 3,
                lod,
              },
            );
            add(
              new THREE.BoxGeometry(0.5, 0.5, 5).translate(
                s * (top - 1.5),
                BAY_Y[0] + 0.3,
                z,
              ),
              "windows",
              { color: 0xff9a60, lod, uv: "keep" },
            );
          }
      }
  }
  // deflector projector pods: five eggs per flank at the cutaway's positions, two riding the deck shoulder
  const PODS = [
    [36, -78, 54, 21.6],
    [12, -82, 43, 17.3],
    [36, -30, 37, 16.2],
    [21, 15, 60, 22.7],
    [4.5, -42, 50, 22.7],
  ];
  for (const lod of [0, 1, 2])
    for (const s of [-1, 1])
      for (const [yy, z, len, wid] of PODS) {
        const f = flank(z, yy, s);
        const seg = lod === 0 ? 16 : lod === 1 ? 10 : 6;
        const ringsN = lod === 0 ? 7 : lod === 1 ? 4 : 2;
        const nx = f.n[0];
        const ny = f.n[1];
        const px = f.p[0];
        const py = f.p[1];
        add(
          placeOnSurface(
            podGeo(len, wid, wid * 0.56, seg, ringsN, 0.32),
            f.p,
            f.n,
            [0, 0, 1],
            1.6,
          ),
          "hull",
          {
            texel: 1 / 9,
            lod,
            // lighter dome with a dark seam band where it meets the hull
            tint: (qx, qy, qz, o) => {
              const h = (qx - px) * nx + (qy - py) * ny;
              o.copy(GREY).multiplyScalar(1.04);
              o.lerp(BAND, 0.6 * (1 - smoothstep(0.3, 2.6, h)));
            },
          },
        );
        if (lod < 2) {
          const g = new THREE.TorusGeometry(
            wid / 2 + 0.4,
            0.55,
            6,
            lod === 0 ? 20 : 12,
          );
          g.scale(1, 1, len / wid);
          add(
            placeOnSurface(g.rotateX(Math.PI / 2), f.p, f.n, [0, 0, 1], -0.2),
            "dark",
            { color: RECESS_DK, texel: 1 / 3, lod },
          );
        }
      }
  // flank window rows above the chine, framed power panels and the docking port aft of the band
  for (const lod of [0, 1])
    for (const s of [-1, 1]) {
      const f = flank(-40, -3, s);
      slotRow(add, {
        c: f.p,
        n: f.n,
        along: [0, 0, 1],
        count: lod === 0 ? 8 : 4,
        len: lod === 0 ? 9 : 20,
        gap: 5,
        h: 2.2,
        lod,
        panes: 3,
        glow: WINDOW,
        rim: RECESS_DK,
      });
      for (const z of [62, 84, 106]) {
        const g = slantMid(z, s);
        add(frameAt(g.p, g.n, [0, 0, 1], 16, 15, 1.2, 0.6, 0.05), "hull", {
          color: GREY_DK,
          texel: 1 / 5,
          lod,
        });
        add(quadAt(g.p, g.n, [0, 0, 1], 13.6, 12.6, 0.08), "dark", {
          color: RECESS_DK,
          texel: 1 / 3,
          lod,
          uv: "keep",
        });
        if (lod === 0)
          add(surfaceBox(g.p, g.n, [0, 1, 0], 10, 3, 0.5, 0.1), "dark", {
            color: RECESS,
            texel: 1 / 3,
            lod,
          });
      }
      const d = flank(72, 16, s);
      hatch(add, {
        c: d.p,
        n: d.n,
        along: [0, 1, 0],
        w: 7,
        h: 7,
        lod,
        color: GREY_DK,
        rimColor: RECESS_DK,
        big: true,
      });
      if (lod === 0)
        for (const z of [-118, 40, 138])
          hatch(add, {
            c: [s * 12, hullParams(z).yT + 0.1, z],
            n: [0, 1, 0],
            along: [0, 0, 1],
            w: 5,
            h: 6,
            lod,
            color: GREY_LT,
            rimColor: RECESS_DK,
          });
      // dark machinery recess on the belly slant forward of the band
      const r = slantMid(-78, s);
      add(surfaceBox(r.p, r.n, [0, 0, 1], 30, 7, 0.7, -0.5), "dark", {
        color: RECESS_DK,
        texel: 1 / 4,
        lod,
      });
    }
  // raised spine strip along the mid deck, ventral machinery housing aft
  for (const lod of [0, 1]) {
    add(
      new THREE.BoxGeometry(12, 0.9, 128).translate(0, MID.yT + 0.4, -14),
      "hull",
      { color: GREY_LT.clone().multiplyScalar(0.98), texel: 1 / 12, lod },
    );
    add(
      new THREE.BoxGeometry(24, 4.5, 64).translate(0, MID.yB - 1.6, 86),
      "hull",
      { color: GREY_DK, texel: 1 / 8, lod },
    );
  }

  // ---------------------------------------------------------------------------
  // dorsal machinery box with the big cylinder, the bridge tower with its wide head, the ventral mast
  // ---------------------------------------------------------------------------
  {
    const by0 = MID.yT + 1.2;
    const by1 = 58;
    const bhw = 15;
    for (const lod of [0, 1, 2]) {
      for (const s of [-1, 1])
        add(
          new THREE.BoxGeometry(2.4, by1 - by0, Z_BOXA - Z_BOXF).translate(
            s * (bhw - 1.2),
            (by0 + by1) / 2,
            (Z_BOXF + Z_BOXA) / 2,
          ),
          "hull",
          {
            color: GREY,
            texel: 1 / 10,
            lod,
          },
        );
      add(
        new THREE.BoxGeometry(2 * bhw, by1 - by0, 3).translate(
          0,
          (by0 + by1) / 2,
          Z_BOXA - 1.5,
        ),
        "hull",
        { color: GREY, texel: 1 / 10, lod },
      );
      // partial roof over the aft third
      add(
        new THREE.BoxGeometry(2 * bhw, 1.6, 26).translate(
          0,
          by1 - 0.8,
          Z_BOXA - 13,
        ),
        "hull",
        { color: GREY_LT, texel: 1 / 10, lod },
      );
      // the cylinder (reactor housing / docking tunnel) inside, poking out of the open front
      const seg = lod === 0 ? 20 : lod === 1 ? 12 : 8;
      const cyl = new THREE.CylinderGeometry(10.5, 10.5, 86, seg);
      cyl.rotateX(Math.PI / 2);
      cyl.translate(0, by0 + 10.7, 78);
      add(cyl, "dark", { color: 0x8c8a86, texel: 1 / 6, lod });
      if (lod < 2) {
        const cap = new THREE.CylinderGeometry(8.5, 10.5, 4, seg);
        cap.rotateX(Math.PI / 2);
        cap.translate(0, by0 + 10.7, 33);
        add(cap, "dark", { color: 0x6a6866, texel: 1 / 6, lod });
        for (const r of [-0.55, 0.15, 0.85]) {
          const ring = new THREE.TorusGeometry(10.8, 0.5, 6, seg);
          ring.translate(0, by0 + 10.7, 78 + r * 40);
          add(ring, "dark", { color: RECESS_DK, texel: 1 / 3, lod });
        }
        for (const s of [-1, 1]) {
          const pipe = new THREE.CylinderGeometry(1.1, 1.1, 60, 8);
          pipe.rotateX(Math.PI / 2);
          pipe.translate(s * 12.6, by0 + 1.6, 88);
          add(pipe, "dark", { color: RECESS, texel: 1 / 3, lod });
          slotRow(add, {
            c: [s * bhw, 48, 100],
            n: [s, 0, 0],
            along: [0, 0, 1],
            count: 4,
            len: 7,
            gap: 3,
            h: 2,
            lod,
            panes: 2,
            glow: WINDOW,
            rim: RECESS_DK,
          });
        }
      }
    }
    for (let i = 0; i < 6; i++)
      add(
        new THREE.BoxGeometry(
          3 + rand() * 3,
          2 + rand() * 2,
          3 + rand() * 4,
        ).translate((rand() - 0.5) * 20, by0 + 1.5, 60 + i * 9),
        "dark",
        {
          color: i % 2 ? RECESS : RECESS_DK,
          texel: 1 / 3,
          lod: 0,
        },
      );
    // bridge tower on the box roof: tapered shaft, wide sensor head, dish looking forward
    const zt = 104;
    for (const lod of [0, 1, 2]) {
      const shaft = new THREE.CylinderGeometry(
        2.6,
        4.2,
        16,
        lod === 0 ? 10 : 6,
      );
      shaft.translate(0, by1 + 8, zt);
      add(shaft, "hull", { color: GREY, texel: 1 / 4, lod });
      add(new THREE.BoxGeometry(26, 4, 7).translate(0, by1 + 18, zt), "hull", {
        color: GREY_LT,
        texel: 1 / 4,
        lod,
      });
      if (lod < 2) {
        add(
          new THREE.BoxGeometry(28, 0.8, 8).translate(0, by1 + 20.4, zt),
          "dark",
          { color: RECESS_DK, texel: 1 / 3, lod },
        );
        for (const s of [-1, 1])
          add(
            new THREE.BoxGeometry(1.2, 4, 1.2).translate(
              s * 12.2,
              by1 + 22.8,
              zt,
            ),
            "dark",
            { color: RECESS, texel: 1 / 3, lod },
          );
        slotRow(add, {
          c: [0, by1 + 18, zt - 3.5],
          n: [0, 0, -1],
          along: [1, 0, 0],
          count: 5,
          len: 3.8,
          gap: 0.9,
          h: 1.6,
          lod,
          panes: 1,
          glow: WINDOW,
          rim: RECESS_DK,
        });
      }
    }
    for (const lod of [0, 1]) {
      dishMast(add, {
        base: [0, by1 + 20.8, zt],
        up: [0, 1, 0],
        height: 5,
        aim: [0, 0.35, -0.94],
        r: 4.5,
        lod,
        mast: RECESS,
        dish: GREY_LT,
        braceSpan: 0.4,
      });
      dishMast(add, {
        base: [0, MID.yB - 3.8, 78],
        up: [0, -1, 0],
        height: 14,
        aim: [0, -0.6, -0.8],
        r: 4,
        lod,
        mast: RECESS,
        dish: GREY_LT,
        braceSpan: 0.4,
      });
      add(
        annulusAt([0, MID.yB - 18.5, 78], [0, -0.6, -0.8], 0, 2.2, 12, 0.5),
        "windows",
        { color: WINDOW_COOL, lod, uv: "keep" },
      );
    }
  }

  // ---------------------------------------------------------------------------
  // stern block details: flank strips and slots, flare blisters, hatches, plating, housing notches
  // ---------------------------------------------------------------------------
  for (const lod of [0, 1])
    for (const s of [-1, 1]) {
      for (const z of [210, 224, 238, 252]) {
        const f = flank(z, 36, s);
        add(surfaceBox(f.p, f.n, [0, 1, 0], 44, 2.2, 0.6, -0.4), "dark", {
          color: RECESS_DK,
          texel: 1 / 4,
          lod,
        });
      }
      for (const z of [217, 231, 245]) {
        const f = flank(z, 24, s);
        slotWindow(add, {
          c: f.p,
          n: f.n,
          along: [0, 1, 0],
          len: 20,
          h: 2.4,
          lod,
          panes: 4,
          glow: WINDOW,
          rim: RECESS_DK,
        });
      }
      // flank blister on the flare (reserve power generators)
      const b = flank(172, hullParams(172).yC + 8, s);
      add(surfaceBox(b.p, b.n, [0, 0, 1], 34, 20, 4, -0.5), "hull", {
        color: GREY_DK,
        texel: 1 / 8,
        lod,
      });
      if (lod === 0)
        for (const [x, z] of [
          [s * 18, 210],
          [s * 38, 236],
        ])
          hatch(add, {
            c: [x, BLK.yT + 0.1, z],
            n: [0, 1, 0],
            along: [0, 0, 1],
            w: 6,
            h: 8,
            lod,
            color: GREY_LT,
            rimColor: RECESS_DK,
            big: true,
          });
      // housing notch grooves and access hatches (one per housing, as in the cutaway)
      for (const yy of [32, -7]) {
        const g = flank(282, yy, s);
        add(
          surfaceBox(g.p, g.n, [0, 0, 1], Z_STERN - Z_HOU - 2, 2.6, 0.8, -0.6),
          "dark",
          { color: RECESS_DK, texel: 1 / 4, lod },
        );
      }
      for (const yy of [52, 12, -28]) {
        const g = flank(283, yy, s);
        hatch(add, {
          c: g.p,
          n: g.n,
          along: [0, 0, 1],
          w: 8,
          h: 8,
          lod,
          color: GREY_DK,
          rimColor: RECESS_DK,
          big: true,
        });
        add(
          surfaceBox(flank(276, yy, s).p, g.n, [0, 0, 1], 6, 12, 0.3, 0.1),
          "dark",
          { color: RECESS, texel: 1 / 3, lod },
        );
      }
    }
  {
    let z0 = 204;
    while (z0 < 258) {
      const z1 = Math.min(258, z0 + 10 + rand() * 8);
      for (const [xa, xb] of [
        [-44, -18],
        [-14, 14],
        [18, 44],
      ]) {
        if (rand() < 0.25) continue;
        add(
          new THREE.BoxGeometry(xb - xa - 1.4, 0.5, z1 - z0 - 1.4).translate(
            (xa + xb) / 2,
            BLK.yT + 0.25,
            (z0 + z1) / 2,
          ),
          "hull",
          {
            color: (rand() < 0.5 ? GREY_LT : GREY)
              .clone()
              .multiplyScalar(0.92 + rand() * 0.16),
            texel: 1 / 12,
            lod: 0,
          },
        );
      }
      z0 = z1 + 0.5;
    }
  }

  // ---------------------------------------------------------------------------
  // stern face: three large pentagonal nozzles over two smaller ones, hyperdrive grille between
  // ---------------------------------------------------------------------------
  const NOZ = [];
  for (const x of [-37, 0, 37]) NOZ.push({ x, y: 48, r: 17, rot: Math.PI / 2 });
  for (const x of [-19, 19])
    NOZ.push({ x, y: -27, r: 14.5, rot: -Math.PI / 2 });
  const RIM = 1.8;
  const sternTint = (x, y, z, o) => mix(GREY_DK, SOOT, 0.55, o);
  for (const lod of [0, 1, 2]) {
    const kC = lod === 0 ? 6 : lod === 1 ? 4 : 2;
    const contour = secAt(Z_STERN, kC, kC).pts;
    const holes = NOZ.map(({ x, y, r, rot }) =>
      polygonProfile(5, rot).map(([u, v]) => [
        x + u * (r + RIM),
        y + v * (r + RIM),
      ]),
    );
    add(plateWithHoles(contour, holes, Z_STERN, 1, 1 / 8), "hull", {
      uv: "keep",
      lod,
      tint: sternTint,
    });
    for (const { x, y, r, rot } of NOZ) {
      const prof = polygonProfile(5, rot);
      const outer = prof.map(([u, v]) => [
        x + u * (r + RIM),
        y + v * (r + RIM),
      ]);
      const inner = prof.map(([u, v]) => [x + u * r, y + v * r]);
      add(ringZ(outer, inner, Z_STERN - 0.2, Z_STERN + 3), "dark", {
        texel: 1 / 4,
        lod,
        tint: (px, py, pz, o) =>
          mix(
            col(0x5a5654),
            col(0x2c2a28),
            smoothstep(Z_STERN - 0.2, Z_STERN + 3, pz),
            o,
          ),
      });
      const depth = 30;
      const st =
        lod === 2
          ? [0, 0.5, 1]
          : lod === 1
            ? [0, 0.3, 0.6, 1]
            : [0, 0.12, 0.3, 0.5, 0.7, 0.88, 1];
      add(
        flipFaces(
          loftZ(
            prof,
            st.map((t) => ({
              z: Z_STERN + 2.5 - t * depth,
              sx: r * (1 - 0.72 * t ** 0.8),
              sy: r * (1 - 0.72 * t ** 0.8),
              x,
              y,
            })),
            { capStart: true },
          ),
        ),
        "engineGlow",
        {
          lod,
          uv: "keep",
          tint: (px, py, pz, o) =>
            bellGradient((Z_STERN + 2.5 - pz) / depth, o),
        },
      );
      if (lod === 0)
        engines.push({ pos: [x, y, Z_STERN + 2.5], r: +(r * 0.72).toFixed(1) });
    }
  }
  for (const lod of [0, 1]) {
    // recessed hyperdrive grille across the middle housing, slatted; vent strip along the keel
    add(
      new THREE.BoxGeometry(92, 22, 1.2).translate(0, 11, Z_STERN - 0.3),
      "dark",
      { color: CORE, texel: 1 / 4, lod },
    );
    for (let i = 0; i < 5; i++)
      add(
        new THREE.BoxGeometry(90, 1.2, 1.4).translate(
          0,
          2 + i * 4.5,
          Z_STERN - 0.2,
        ),
        "dark",
        { color: RECESS, texel: 1 / 3, lod },
      );
    for (const x of [-30, 30])
      add(
        new THREE.BoxGeometry(1.8, 22, 1.5).translate(x, 11, Z_STERN - 0.1),
        "dark",
        { color: RECESS_DK, texel: 1 / 3, lod },
      );
    add(
      new THREE.BoxGeometry(56, 3.5, 1.0).translate(0, -44, Z_STERN + 0.4),
      "dark",
      { color: RECESS_DK, texel: 1 / 2, lod },
    );
  }

  // ---------------------------------------------------------------------------
  // tracking turrets: twin heavies fore and aft, quads along the flanks, deck and keel
  // ---------------------------------------------------------------------------
  const heavy = heavyTwin(7, GREY, RECESS_DK, { rate: 0.45 });
  const light = quadTurret(3.6, GREY, RECESS_DK, { rate: 1.0 });
  const mount = (type, pos, up, S, kind, range, dir) => {
    const upV = new THREE.Vector3(...up).normalize();
    for (const lod of [0, 1]) {
      const pad = new THREE.CylinderGeometry(
        1.45 * S,
        1.6 * S,
        1.2,
        lod === 0 ? 16 : 10,
      );
      pad.translate(0, 0.6, 0);
      add(placeOnSurface(pad, pos, up, [0, 0, -1], 0.3), "hull", {
        color: GREY_DK,
        texel: 1 / 5,
        lod,
      });
    }
    const k = turrets.length;
    const p = [pos[0] + upV.x, pos[1] + upV.y, pos[2] + upV.z];
    turrets.push({ type, pos: p, up: upV.toArray(), forward: [0, 0, -1] });
    const d = new THREE.Vector3(...dir).normalize();
    hardpoints.push({
      pos: [
        p[0] + upV.x * S * 0.7,
        p[1] + upV.y * S * 0.7,
        p[2] + upV.z * S * 0.7,
      ],
      dir: d.toArray().map((v) => +v.toFixed(3)),
      kind,
      range,
      turret: k,
    });
  };
  const HV = (pos, up, dir) => mount("heavy", pos, up, 7, "heavy", 13000, dir);
  const LT = (pos, up, dir) => mount("light", pos, up, 3.6, "light", 6500, dir);
  const LTS = (f, dir) => LT(f.p, f.n, dir);
  for (const s of [-1, 1]) {
    HV([s * 14, Y_DECK + 0.6, -205], [0, 1, 0], [s * 0.2, 0.45, -1]);
    HV([s * 22, Y_DECK + 0.6, -150], [0, 1, 0], [s * 0.45, 0.5, -0.8]);
    HV([s * 30, BLK.yT, 226], [0, 1, 0], [s * 0.5, 0.5, -0.6]);
    HV([s * 13, BLK.yB, 226], [0, -1, 0], [s * 0.5, -0.5, -0.6]);
  }
  HV([0, MID.yT + 0.9, -70], [0, 1, 0], [0, 0.5, -1]);
  HV([0, MID.yT + 0.9, 8], [0, 1, 0], [0, 0.6, -0.8]);
  HV([0, hullParams(-180).yB, -180], [0, -1, 0], [0, -0.5, -1]);
  HV([0, MID.yB, 50], [0, -1, 0], [0, -0.6, -0.8]);
  for (const s of [-1, 1]) {
    for (const z of [-262, -228, -200, -140])
      LTS(flank(z, 9, s), [s * 0.7, 0.35, -0.6]);
    for (const z of [-222, -196, -170, -144])
      LTS(slantMid(z, s), [s * 0.5, -0.6, -0.6]);
    for (const z of [-55, -15, 30, 140])
      LT(
        [s * 12, hullParams(z).yT + 0.1, z],
        [0, 1, 0],
        [s * 0.7, 0.45, -0.55],
      );
    for (const z of [214, 246]) LTS(flank(z, 46, s), [s * 0.8, 0.3, -0.5]);
    for (const z of [-60, 20])
      LT([s * 8, MID.yB, z], [0, -1, 0], [s * 0.6, -0.55, -0.6]);
    LTS(slantMid(200, s), [s * 0.6, -0.5, -0.6]);
  }

  return assemble(
    {
      id: "dreadnought",
      side: "republic",
      length: L,
      parts,
      hardpoints,
      engines,
      bounds: { radius: 330 },
      turretTypes: { heavy, light },
      turrets,
    },
    mats,
  );
}
