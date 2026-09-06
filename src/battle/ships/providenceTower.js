// Superstructure of the Providence-class, matched to the reference views: the narrow dorsal spine with
// its blocks and mast clusters, the wide citadel block and aft deck, the thin command tower raked 30°
// aft (vertical trailing edge, filleted root, dark centre rib, rust edge trims), the hammerhead bridge
// pod with its window band and comms spar, the swept ventral fin with its keel pod, and the small
// detail on all of them (windows, panels, domes, dishes, hatches, rust streaks).
import * as THREE from "three";
import { box, boxMM, cylY, cylZ } from "./shipKit.js";
import {
  clamp01,
  fromRef,
  hash,
  headRings,
  headScale,
  lerp,
  loftRings,
  podRings,
  rgb,
  ringCap,
  rng,
} from "./providenceGeo.js";
import {
  AFT_DECK,
  CITADEL_FORE,
  CITADEL_LOWER,
  CITADEL_SLATE,
  CITADEL_UPPER,
  MASTS,
  PAL,
  PLATE_TEXEL,
  POD,
  POD_DECK,
  SPAR,
  SPINE,
  SPINE_BLOCKS,
  TOWER,
  TOWER_HAZARD,
  TOWER_LEDGE,
  VFIN,
  VFIN_HAZARD,
  VFIN_POD,
  barAlong,
  barAlongY,
  towerHalf,
  towerLead,
  towerTrail,
  vfinHalf,
  vfinLead,
  vfinTrail,
} from "./providenceSpec.js";

const SUPER = rgb(PAL.super);
const FIN = rgb(PAL.finFace);
const SEAM = rgb(PAL.dorsal, 0.78);

export function buildTower(ctx) {
  buildSpine(ctx);
  buildCitadel(ctx);
  buildBlade(ctx);
  buildPod(ctx);
  buildVentralFin(ctx);
  buildMasts(ctx);
  superDetail(ctx);
}

const faceTint =
  (base, seed, spread = 0.12) =>
  (i, j) => {
    const g = hash(i * 3 + 1, j * 5 + 2, seed);
    const tone = 1 - spread / 2 + g * spread;
    return [base[0] * tone, base[1] * tone, base[2] * tone];
  };

// ---------------------------------------------------------------------------
// blade sections: a horizontal ring at height y from the leading edge zl to the trailing edge zt with
// half thickness `half`; elliptical nose (1.5 x half long) and tail (1.2 x half), flat sides. Point 0 is
// the nose, point nE * 2 the tail.
// ---------------------------------------------------------------------------
const NE = 4;
function bladeRing(y, zl, zt, half, xOff = 0) {
  const nose = Math.min(half * 1.5, (zt - zl) * 0.45);
  const tail = Math.min(half * 1.2, (zt - zl) * 0.4);
  const stbd = [];
  for (let k = 0; k <= NE; k++) {
    const a = ((k / NE) * Math.PI) / 2;
    stbd.push([xOff + half * Math.sin(a), y, zl + nose * (1 - Math.cos(a))]);
  }
  for (let k = 1; k <= NE; k++) {
    const a = ((k / NE) * Math.PI) / 2;
    stbd.push([xOff + half * Math.cos(a), y, zt - tail + tail * Math.sin(a)]);
  }
  const ring = stbd.slice();
  for (let k = stbd.length - 2; k >= 1; k--)
    ring.push([2 * xOff - stbd[k][0], y, stbd[k][2]]);
  return ring;
}
const BLADE_TAIL = NE * 2;
// chord fraction (0 nose .. 1 tail) of ring point index j
function bladeChordFrac(j) {
  const n = NE * 4;
  const k = j <= BLADE_TAIL ? j : n - j;
  return k / BLADE_TAIL;
}

// rounded-rectangle plan outline at height y (corner radius rc) for the superstructure blocks
function roundBoxRing(y, z0, z1, half, rc, nC = 3) {
  const pts = [];
  const corner = (cx, cz, a0, a1) => {
    for (let k = 0; k <= nC; k++) {
      const a = lerp(a0, a1, k / nC);
      pts.push([cx + rc * Math.cos(a), y, cz + rc * Math.sin(a)]);
    }
  };
  // starboard side, from the front centre clockwise (looking down): front-right, back-right, back-left, front-left
  pts.push([0, y, z0]);
  corner(half - rc, z0 + rc, -Math.PI / 2, 0);
  corner(half - rc, z1 - rc, 0, Math.PI / 2);
  pts.push([0, y, z1]);
  corner(-half + rc, z1 - rc, Math.PI / 2, Math.PI);
  corner(-half + rc, z0 + rc, Math.PI, Math.PI * 1.5);
  return pts;
}

// ---------------------------------------------------------------------------
// dorsal spine: a narrow slab with a pointed nose from r 160 to the citadel front, plus its blocks
// ---------------------------------------------------------------------------
function spineRing(y) {
  const u = clamp01((y - SPINE.y0) / (SPINE.y1 - SPINE.y0));
  const half = lerp(SPINE.half0, SPINE.half1, u);
  const z0 = fromRef(SPINE.r0 + u * 6);
  const z1 = fromRef(SPINE.r1 + 2);
  const nose = SPINE.nose;
  const pts = [[0, y, z0]];
  const stbd = [];
  for (let k = 1; k <= 4; k++) {
    const f = k / 4;
    stbd.push([half * Math.sqrt(f), y, z0 + nose * f]);
  }
  stbd.push([half, y, z1]);
  pts.push(...stbd);
  pts.push([0, y, z1 + 0.01]);
  for (let k = stbd.length - 1; k >= 0; k--)
    pts.push([-stbd[k][0], y, stbd[k][2]]);
  return pts;
}
function buildSpine({ add }) {
  for (const lod of [0, 1, 2]) {
    const rings = [spineRing(SPINE.y0), spineRing(SPINE.y1)];
    add(
      loftRings(rings, {
        sharp: new Set([0, 5, 6, 7]),
        faceColor: faceTint(SUPER, 3),
        uv: (i, j, p) => [p[2] * PLATE_TEXEL, p[1] * PLATE_TEXEL],
      }),
      "hull",
      { lod, keepColor: true },
    );
    add(
      ringCap(rings[1], [0, 1, 0], {
        color: rgb(PAL.dorsal, 0.92),
        texel: PLATE_TEXEL,
      }),
      "hull",
      { lod, keepColor: true },
    );
    if (lod === 2) continue;
    for (const [r0, r1, y0, y1, half] of SPINE_BLOCKS) {
      add(
        boxMM([-half, y0 - 0.5, fromRef(r0)], [half, y1, fromRef(r1)]),
        "hull",
        {
          color: new THREE.Color(PAL.super).multiplyScalar(0.96),
          texel: PLATE_TEXEL,
          lod,
        },
      );
    }
  }
}

// ---------------------------------------------------------------------------
// citadel: forward step block (r 540-604, +70), the broad lower block (r 596-952, +60), the narrower
// aft deck (r 940-1040, +60) and the main upper block (r 596-940, +88) the tower rises from; rounded
// plan corners
// ---------------------------------------------------------------------------
function buildCitadel({ add }) {
  const blocks = [
    [CITADEL_FORE, 7],
    [CITADEL_LOWER, 9],
    [AFT_DECK, 8],
    [CITADEL_UPPER, 7],
  ];
  // LOD 2 merges the aft deck into the lower block (one slab instead of two)
  const blocksFar = [
    [CITADEL_FORE, 7],
    [{ ...CITADEL_LOWER, r1: AFT_DECK.r1 }, 9],
    [CITADEL_UPPER, 7],
  ];
  for (const lod of [0, 1, 2]) {
    for (const [b, rc] of lod === 2 ? blocksFar : blocks) {
      const ring = (y) =>
        roundBoxRing(y, fromRef(b.r0), fromRef(b.r1), b.half, rc);
      const rings = [ring(b.y0), ring(b.y1)];
      add(
        loftRings(rings, {
          faceColor: faceTint(SUPER, 5),
          uv: (i, j, p) => [p[2] * PLATE_TEXEL, p[1] * PLATE_TEXEL],
        }),
        "hull",
        { lod, keepColor: true },
      );
      add(
        ringCap(rings[1], [0, 1, 0], {
          color: rgb(PAL.dorsal, 0.9),
          texel: PLATE_TEXEL,
        }),
        "hull",
        { lod, keepColor: true },
      );
    }
    // seam band around the upper block waist (LOD 0/1)
    if (lod < 2) {
      const b = CITADEL_UPPER;
      const band = (dy, k) =>
        roundBoxRing(
          b.y0 + 14 + dy,
          fromRef(b.r0) - k,
          fromRef(b.r1) + k,
          b.half + k,
          7,
        );
      add(
        loftRings(
          [band(-1.2, 0.02), band(-1, 0.45), band(1, 0.45), band(1.2, 0.02)],
          {
            sharpRings: new Set([1, 2]),
            faceColor: () => SEAM,
            texel: 1 / 8,
          },
        ),
        "hull",
        { lod, keepColor: true },
      );
    }
  }
}

// ---------------------------------------------------------------------------
// command tower blade
// ---------------------------------------------------------------------------
function towerRing(y) {
  return bladeRing(
    y,
    fromRef(towerLead(y)),
    fromRef(towerTrail(y)),
    towerHalf(y),
  );
}
// heights of the tower rings: start 2 m inside the citadel top, dense through the root fillet, then
// even to the pod
function towerHeights(lod) {
  const y0 = TOWER.yBase - 2;
  if (lod === 2) return [y0, 96, 130, 175, TOWER.yTop];
  if (lod === 1) return [y0, 91, 95, 102, 120, 150, 185, TOWER.yTop];
  return [
    y0,
    89.5,
    91,
    93,
    95.5,
    98.5,
    102,
    108,
    118,
    132,
    150,
    170,
    190,
    205,
    TOWER.yTop,
  ];
}
function buildBlade({ add }) {
  const RIB = rgb(PAL.finFace, 0.78);
  for (const lod of [0, 1, 2]) {
    const rings = towerHeights(lod).map(towerRing);
    add(
      loftRings(rings, {
        faceColor: (i, j) => {
          const f = bladeChordFrac(j);
          // dark centre rib down both faces, light nose and tail
          const tint = faceTint(FIN, 11)(i, j);
          return f > 0.32 && f < 0.6 ? RIB : tint;
        },
        uv: (i, j, p) => [p[2] * PLATE_TEXEL, p[1] * PLATE_TEXEL],
      }),
      "hull",
      { lod, keepColor: true },
    );
    // rust trims down the leading and trailing edges (they still read at 10 km)
    const ys =
      lod === 0 ? [100, 120, 140, 165, 190, 216] : [100, 140, 180, 216];
    add(
      barAlongY(ys, (y) => [0, fromRef(towerLead(y)) - 0.35], 2.6, 1.1, {
        color: rgb(PAL.trim),
        texel: 1 / 6,
      }),
      "paint",
      { lod, keepColor: true },
    );
    add(
      barAlongY(ys, (y) => [0, fromRef(towerTrail(y)) + 0.35], 2.6, 1.1, {
        color: rgb(PAL.trim),
        texel: 1 / 6,
      }),
      "paint",
      { lod, keepColor: true },
    );
    // yellow hazard ladder on both flanks (four bars at LOD 0, one patch at LOD 1)
    if (lod < 2) {
      const hz = TOWER_HAZARD;
      const bars = lod === 0 ? 4 : 1;
      const pitch = (hz.y1 - hz.y0) / bars;
      for (const side of [-1, 1])
        for (let k = 0; k < bars; k++) {
          const y = hz.y0 + (k + 0.5) * pitch;
          const { p, n } = towerSurface(side, y, hz.f);
          add(
            box(
              p.x + n.x * 0.2,
              y,
              p.z,
              0.4,
              pitch * (lod === 0 ? 0.55 : 0.9),
              hz.w,
            ),
            "paint",
            {
              color: PAL.hazard,
              lod,
              uv: "keep",
            },
          );
        }
      // equipment ledge on the trailing edge just under the pod
      const lg = TOWER_LEDGE;
      const yl = (lg.y0 + lg.y1) / 2;
      add(
        boxMM(
          [-lg.half, lg.y0, fromRef(towerTrail(yl)) - 3],
          [lg.half, lg.y1, fromRef(towerTrail(yl)) + lg.depth],
        ),
        "hull",
        {
          color: new THREE.Color(PAL.super).multiplyScalar(0.9),
          texel: PLATE_TEXEL,
          lod,
        },
      );
    }
  }
}
// surface point + outward normal on a tower face at height y and chord fraction f (side ±1)
export function towerSurface(side, y, f) {
  const zl = fromRef(towerLead(y));
  const zt = fromRef(towerTrail(y));
  const h = towerHalf(y);
  const p = new THREE.Vector3(side * h, y, lerp(zl, zt, f));
  const zl2 = fromRef(towerLead(y + 1));
  const zt2 = fromRef(towerTrail(y + 1));
  const ty = new THREE.Vector3(0, 1, lerp(zl2, zt2, f) - p.z);
  const n = new THREE.Vector3()
    .crossVectors(ty, new THREE.Vector3(0, 0, 1))
    .normalize();
  if (n.x * side < 0) n.negate();
  return { p, n };
}

// ---------------------------------------------------------------------------
// hammerhead bridge pod: rounded-rectangle loft with a recessed window band, bridge windows across the
// nose, a chin block under the forward end, the comms spar
// ---------------------------------------------------------------------------
function podSpec() {
  return { ...POD, z0: fromRef(POD.r0), z1: fromRef(POD.r1) };
}
function buildPod({ add }) {
  const head = podSpec();
  const DARK = rgb(0x1a1d22);
  for (const lod of [0, 1, 2]) {
    const nZ = lod === 0 ? 10 : lod === 1 ? 6 : 3;
    const { rings, sharp, bandSegs } = headRings({ ...head, nZ });
    const tint = faceTint(rgb(PAL.flank), 31);
    add(
      loftRings(rings, {
        sharp,
        faceColor: (i, j) => (bandSegs.has(j) ? DARK : tint(i, j)),
        uv: (i, j, p, arc) => [p[2] * PLATE_TEXEL, arc * PLATE_TEXEL],
      }),
      "hull",
      { lod, keepColor: true },
    );
    add(
      ringCap(rings[0], [0, 0, -1], {
        color: rgb(PAL.flank, 0.92),
        texel: PLATE_TEXEL,
      }),
      "hull",
      { lod, keepColor: true },
    );
    add(
      ringCap(rings[rings.length - 1], [0, 0, 1], {
        color: rgb(PAL.flank, 0.85),
        texel: PLATE_TEXEL,
      }),
      "hull",
      { lod, keepColor: true },
    );
    // upper deck slab on the pod roof (its top carries the masts); LOD 0/1
    if (lod < 2) {
      const d = POD_DECK;
      const ring = (y) =>
        roundBoxRing(y, fromRef(d.r0), fromRef(d.r1), d.half, 4);
      const drings = [ring(d.y0 - 1), ring(d.y1)];
      add(
        loftRings(drings, {
          faceColor: faceTint(rgb(PAL.flank), 33),
          uv: (i, j, p) => [p[2] * PLATE_TEXEL, p[1] * PLATE_TEXEL],
        }),
        "hull",
        { lod, keepColor: true },
      );
      add(
        ringCap(drings[1], [0, 1, 0], {
          color: rgb(PAL.dorsal, 0.9),
          texel: PLATE_TEXEL,
        }),
        "hull",
        { lod, keepColor: true },
      );
    }
    // rust trim along the pod's upper edges
    if (lod < 2)
      for (const side of [-1, 1])
        add(
          barAlong(
            [head.z0 + 6, head.z0 + 40, head.z0 + 70, head.z1 - 10],
            (z) => {
              const k = headScale(head, z);
              return [
                side * (head.halfW - head.r * 0.4) * k,
                head.cy + head.halfH * k - 0.3,
              ];
            },
            1.2,
            0.8,
            { color: rgb(PAL.trim) },
          ),
          "paint",
          { lod, keepColor: true },
        );
    // comms spar: forward and up from the pod nose
    const dz = fromRef(SPAR.r1) - fromRef(SPAR.r0);
    const dy = SPAR.y1 - SPAR.y0;
    const len = Math.hypot(dz, dy);
    const spar = cylZ(SPAR.rad0, SPAR.rad1, len, lod === 0 ? 8 : 5);
    spar.rotateX(Math.atan2(dy, -dz));
    spar.translate(
      0,
      (SPAR.y0 + SPAR.y1) / 2,
      (fromRef(SPAR.r0) + fromRef(SPAR.r1)) / 2,
    );
    add(spar, "dark", { color: 0x3a3e46, texel: 1 / 2, lod });
    if (lod === 0) {
      // spar root bracket and a pair of small dishes at its tip
      add(box(0, SPAR.y0 - 1.2, fromRef(SPAR.r0) + 2, 3, 3.2, 6), "dark", {
        color: PAL.darkLit,
        texel: 1 / 3,
        lod,
      });
      const d = cylY(1.6, 0.5, 0.5, 10);
      d.rotateX(-1.2);
      d.translate(0, SPAR.y1 - 0.4, fromRef(SPAR.r1) + 2);
      add(d, "dark", { color: 0x50555e, texel: 1 / 3, lod });
    }
  }
  // windows: recessed band along both sides and across the nose (discrete at LOD 0, bars at LOD 1/2)
  const { cy, z0, z1, halfW, inset } = head;
  const yb = (k) => cy + ((head.band[0] + head.band[1]) / 2) * k;
  const xb = (k) => (halfW - inset) * k + 0.18;
  const wh = Math.min(1.6, (head.band[1] - head.band[0]) * 0.65);
  const pitch = 2.7;
  for (const side of [-1, 1])
    for (let z = z0 + 4; z <= z1 - 10; z += pitch) {
      if (hash(Math.round(z * 10), side + 4, 61) < 0.12) continue;
      const k = headScale(head, z);
      add(box(side * xb(k), yb(k), z, 0.3, wh, pitch * 0.55), "windows", {
        color: PAL.windowWarm,
        lod: 0,
        uv: "keep",
      });
    }
  const k0 = headScale(head, z0);
  const xMax = (halfW - head.r) * k0;
  for (let x = -xMax; x <= xMax + 0.01; x += pitch)
    add(box(x, yb(k0), z0 - 0.15, pitch * 0.55, wh, 0.3), "windows", {
      color: PAL.windowWarm,
      lod: 0,
      uv: "keep",
    });
  for (const lod of [1, 2]) {
    const zs = [z0 + 3, z0 + (z1 - z0) * 0.3, z0 + (z1 - z0) * 0.6, z1 - 10];
    for (const side of [-1, 1])
      add(
        barAlong(
          zs,
          (z) => [side * xb(headScale(head, z)), yb(headScale(head, z))],
          0.3,
          wh,
          {
            color: rgb(PAL.windowWarm, 0.95),
          },
        ),
        "windows",
        { lod, keepColor: true },
      );
    add(box(0, yb(k0), z0 - 0.15, xMax * 2, wh, 0.3), "windows", {
      color: PAL.windowWarm,
      lod,
      uv: "keep",
    });
  }
  // chin block under the nose, sensor blister on top, running lights
  add(box(0, cy - head.halfH * 0.85, z0 + 22, 14, 5, 26), "dark", {
    color: PAL.darkLit,
    texel: 1 / 4,
    lod: 0,
  });
  add(box(0, cy - head.halfH * 0.85, z0 + 22, 14, 5, 26), "dark", {
    color: PAL.darkLit,
    texel: 1 / 4,
    lod: 1,
  });
  add(
    new THREE.SphereGeometry(3.2, 12, 8).translate(
      6,
      POD_DECK.y1,
      fromRef(975),
    ),
    "hull",
    {
      color: PAL.belly,
      texel: 1 / 4,
      lod: 0,
    },
  );
  const dish = cylY(3.4, 1.0, 1.0, 12);
  dish.rotateX(-0.8);
  dish.translate(-7, POD_DECK.y1 + 2.4, fromRef(930));
  add(dish, "dark", { color: 0x50555e, texel: 1 / 3, lod: 0 });
  add(
    cylY(0.4, 0.6, 4, 6).translate(-7, POD_DECK.y1 + 1, fromRef(930)),
    "dark",
    {
      color: 0x3a3e46,
      texel: 1 / 2,
      lod: 0,
    },
  );
  for (const side of [-1, 1])
    add(box(side * (halfW + 0.2), cy - 5, z0 + 50, 0.5, 1.2, 1.2), "windows", {
      color: side < 0 ? 0xff3030 : 0x30ff60,
      lod: 0,
      uv: "keep",
    });
}

// ---------------------------------------------------------------------------
// ventral fin: vertical leading edge, swept trailing edge, filleted root, slim pod along the bottom
// ---------------------------------------------------------------------------
function vfinRing(y) {
  return bladeRing(y, fromRef(vfinLead(y)), fromRef(vfinTrail(y)), vfinHalf(y));
}
function buildVentralFin({ add }) {
  const heights = {
    0: [-46, -52, -54.5, -57, -60, -64, -70, -78, -86, -92, -96.5],
    1: [-46, -54, -58, -66, -80, -96.5],
    2: [-46, -58, -96.5],
  };
  for (const lod of [0, 1, 2]) {
    const rings = heights[lod].map(vfinRing);
    add(
      loftRings(rings, {
        faceColor: faceTint(FIN, 17),
        uv: (i, j, p) => [p[2] * PLATE_TEXEL, p[1] * PLATE_TEXEL],
      }),
      "hull",
      { lod, keepColor: true },
    );
    add(
      ringCap(rings[rings.length - 1], [0, -1, 0], {
        color: rgb(PAL.belly, 0.9),
        texel: PLATE_TEXEL,
      }),
      "hull",
      { lod, keepColor: true },
    );
    // keel pod along the bottom edge
    const pod = podRings({
      cy: VFIN_POD.cy,
      z0: fromRef(VFIN_POD.r0),
      z1: fromRef(VFIN_POD.r1),
      rx: VFIN_POD.rx,
      ry: VFIN_POD.ry,
      nZ: lod === 0 ? 10 : lod === 1 ? 6 : 3,
      nP: lod === 0 ? 14 : 8,
      frontPow: 2.2,
      backPow: 1.8,
    });
    add(
      loftRings(pod, {
        faceColor: faceTint(rgb(PAL.belly), 19),
        texel: 1 / 8,
      }),
      "hull",
      { lod, keepColor: true },
    );
    if (lod < 2) {
      const ys = lod === 0 ? [-57, -66, -76, -86, -95] : [-57, -76, -95];
      add(
        barAlongY(ys, (y) => [0, fromRef(vfinLead(y)) - 0.3], 2.2, 1.0, {
          color: rgb(PAL.trim),
          texel: 1 / 6,
        }),
        "paint",
        { lod, keepColor: true },
      );
      add(
        barAlongY(ys, (y) => [0, fromRef(vfinTrail(y)) + 0.3], 2.2, 1.0, {
          color: rgb(PAL.trim),
          texel: 1 / 6,
        }),
        "paint",
        { lod, keepColor: true },
      );
      // yellow hazard ladder down the trailing edge (stern reference), both faces
      const [hy0, hy1] = VFIN_HAZARD;
      const bars = lod === 0 ? 5 : 1;
      const pitch = (hy0 - hy1) / bars;
      for (const side of [-1, 1])
        for (let k = 0; k < bars; k++) {
          const y = hy0 - (k + 0.5) * pitch;
          const z = fromRef(vfinTrail(y)) - 4;
          add(
            box(
              side * (vfinHalf(y) + 0.2),
              y,
              z,
              0.4,
              pitch * (lod === 0 ? 0.5 : 0.9),
              5,
            ),
            "paint",
            {
              color: PAL.hazard,
              lod,
              uv: "keep",
            },
          );
        }
    }
  }
  // window rows and a sensor dish on the fin
  for (const side of [-1, 1]) {
    for (let r = 785; r <= 832; r += 4) {
      if (hash(r, side + 5, 3) < 0.3) continue;
      const y = -74;
      const h = vfinHalf(y);
      add(box(side * (h + 0.1), y, fromRef(r), 0.3, 0.5, 1.2), "windows", {
        color: PAL.windowCool,
        lod: 0,
        uv: "keep",
      });
    }
    add(
      box(side * (vfinHalf(-84) + 0.3), -84, fromRef(802), 0.8, 9, 22),
      "dark",
      {
        color: PAL.darkLit,
        texel: 1 / 4,
        lod: 0,
      },
    );
    // yellow lit strips on the pod flanks (the stern reference shows them on the fin tip)
    for (const r of [770, 784, 798])
      add(
        box(
          side * (VFIN_POD.rx + 0.1),
          VFIN_POD.cy + 1,
          fromRef(r),
          0.3,
          1.6,
          6,
        ),
        "windows",
        {
          color: PAL.hazard,
          lod: 0,
          uv: "keep",
        },
      );
  }
  const d = cylY(3.0, 1.0, 1.0, 12);
  d.rotateX(Math.PI - 0.7);
  d.translate(0, VFIN_POD.cy - VFIN_POD.ry - 1.5, fromRef(770));
  add(d, "dark", { color: 0x50555e, texel: 1 / 3, lod: 0 });
}

// ---------------------------------------------------------------------------
// masts: thin tapered spars (LOD 0; the tall ones also at LOD 1) with small platforms
// ---------------------------------------------------------------------------
function buildMasts({ add }) {
  // the reference masts are light lattice spars that read pale against space, so they use the flat
  // paint material in the fin-face grey rather than dark machinery
  const SPAR_GREY = rgb(PAL.finFace, 0.95);
  for (const [x, r, y0, y1, rad] of MASTS) {
    const h = y1 - y0;
    const lods = h > 24 ? [0, 1] : [0];
    for (const lod of lods)
      add(
        cylY(rad * 0.55, rad, h, lod === 0 ? 6 : 4).translate(
          x,
          y0 + h / 2,
          fromRef(r),
        ),
        "paint",
        {
          color: SPAR_GREY,
          lod,
          uv: "keep",
        },
      );
    if (h > 24) {
      add(box(x, y0 + h * 0.62, fromRef(r), rad * 5, 0.5, rad * 5), "paint", {
        color: SPAR_GREY,
        lod: 0,
        uv: "keep",
      });
      add(
        box(x, y0 + h * 0.3, fromRef(r), rad * 3.5, 0.4, rad * 3.5),
        "paint",
        {
          color: SPAR_GREY,
          lod: 0,
          uv: "keep",
        },
      );
      add(box(x, y1 - 0.3, fromRef(r), 0.4, 0.4, 0.4), "windows", {
        color: 0xff4040,
        lod: 0,
        uv: "keep",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// detail on the spine, citadel and tower: window rows, equipment panels, hatches, domes, dishes, rust
// ---------------------------------------------------------------------------
function superDetail({ add }) {
  const rand = rng(77);
  const cl = CITADEL_LOWER;
  const cu = CITADEL_UPPER;
  // window rows along the citadel sides (upper block +65, lower block +52) and the spine (+42)
  const row = (x, y, r0, r1, pitch, skip, side, color, lodBar = true) => {
    for (let r = r0; r <= r1; r += pitch) {
      if (hash(Math.round(r), side + y, 3) < skip) continue;
      add(box(side * x, y, fromRef(r), 0.3, 0.6, 1.4), "windows", {
        color,
        lod: 0,
        uv: "keep",
      });
    }
    if (lodBar)
      add(
        box(side * x, y, fromRef((r0 + r1) / 2), 0.3, 0.55, r1 - r0),
        "windows",
        {
          color: rgb(color, 0.85),
          lod: 1,
          keepColor: false,
          uv: "keep",
        },
      );
  };
  const ad = AFT_DECK;
  // side wall the lower tier presents at r (broad lower block, then the narrower aft deck)
  const lowerHalf = (r) => (r > cl.r1 - 4 ? ad.half : cl.half);
  for (const side of [-1, 1]) {
    row(cu.half + 0.05, 66, 616, 934, 4.2, 0.25, side, PAL.windowWarm);
    row(cu.half + 0.05, 80.5, 640, 900, 4.2, 0.3, side, PAL.windowWarm);
    row(cl.half + 0.05, 55.5, 606, 940, 4.6, 0.3, side, PAL.windowWarm);
    row(ad.half + 0.05, 55.5, 960, 1030, 4.6, 0.3, side, PAL.windowWarm);
    row(SPINE.half1 + 0.05, 51.5, 226, 500, 5.0, 0.35, side, PAL.windowCool);
    // dark slate rectangles painted on the lower citadel wall (reference: beside the hangar row)
    for (const [r0, r1, y0, y1] of CITADEL_SLATE)
      for (const lod of [0, 1])
        add(
          box(
            side * (cl.half + 0.2),
            (y0 + y1) / 2,
            fromRef((r0 + r1) / 2),
            0.35,
            y1 - y0,
            r1 - r0,
          ),
          "paint",
          { color: PAL.slate, lod, uv: "keep" },
        );
    // equipment panels with a raised frame on the citadel sides
    for (const [r, y, w, h] of [
      [720, 56, 30, 7],
      [790, 55, 18, 6],
      [870, 56, 24, 7],
      [960, 55, 16, 6],
      [740, 74, 20, 4],
      [840, 73, 16, 4],
    ]) {
      const x = (y > cl.y1 ? cu.half : lowerHalf(r)) + 0.3;
      add(box(side * x, y, fromRef(r), 0.6, h + 1.4, w + 1.4), "hull", {
        color: new THREE.Color(PAL.dorsal).multiplyScalar(0.85),
        texel: 1 / 8,
        lod: 0,
      });
      add(box(side * (x + 0.3), y, fromRef(r), 0.6, h, w), "dark", {
        color: 0x1c1f24,
        texel: 1 / 6,
        lod: 0,
      });
      for (let yy = y - h / 2 + 1.2; yy < y + h / 2 - 0.6; yy += 1.8)
        add(
          box(side * (x + 0.55), yy, fromRef(r), 0.3, 0.44, w - 0.6),
          "dark",
          {
            color: PAL.darkLit,
            texel: 1 / 3,
            lod: 0,
          },
        );
    }
    // hatch rows along the exposed base of the citadel wall and the spine wall
    for (let r = 610; r < 1030; r += 4.6) {
      if (hash(Math.round(r), side + 1, 3) < 0.3) continue;
      if (r > 700 && r < 900 && hash(Math.round(r), side + 9, 4) < 0.5)
        continue;
      if (r > cl.r1 - 8 && r < ad.r0 + 8) continue;
      add(
        box(side * (lowerHalf(r) + 0.2), 58, fromRef(r), 0.5, 1.6, 2.2),
        "dark",
        {
          color: 0x2e3238,
          texel: 1 / 2,
          lod: 0,
        },
      );
    }
    for (let r = 200; r < 540; r += 6.2) {
      if (hash(Math.round(r), side + 2, 3) < 0.4) continue;
      add(
        box(side * (SPINE.half0 - 0.6), 54, fromRef(r), 0.5, 1.6, 1.8),
        "dark",
        {
          color: 0x2e3238,
          texel: 1 / 2,
          lod: 0,
        },
      );
    }
    // small equipment boxes on the citadel deck edge and the spine top
    for (let i = 0; i < 10; i++) {
      const r = 615 + rand() * 370;
      add(
        box(
          side * (cu.half - 3 - rand() * 6),
          cu.y1 + 0.9,
          fromRef(r),
          2 + rand() * 4,
          1.8,
          2 + rand() * 4,
        ),
        "dark",
        { color: PAL.darkLit, texel: 1 / 3, lod: 0 },
      );
    }
    for (let i = 0; i < 8; i++) {
      const r = 200 + rand() * 380;
      add(
        box(
          side * (rand() * 5),
          SPINE.y1 + 0.7,
          fromRef(r),
          1.5 + rand() * 3,
          1.4,
          2 + rand() * 4,
        ),
        "dark",
        {
          color: PAL.darkLit,
          texel: 1 / 3,
          lod: 0,
        },
      );
    }
    // tower faces: window rows near the top, a dark panel in the rib, hatches near the root
    for (const [y, f0, f1, pitch] of [
      [193, 0.15, 0.85, 3.2],
      [202, 0.15, 0.85, 3.2],
      [150, 0.2, 0.8, 4.0],
    ])
      for (
        let f = f0;
        f <= f1;
        f += pitch / (fromRef(towerTrail(y)) - fromRef(towerLead(y)))
      ) {
        if (hash(Math.round(f * 100), side + y, 7) < 0.2) continue;
        const { p, n } = towerSurface(side, y, f);
        add(box(p.x + n.x * 0.15, y, p.z, 0.3, 0.55, 1.3), "windows", {
          color: PAL.windowWarm,
          lod: 0,
          uv: "keep",
        });
      }
    for (const y of [193, 202])
      add(
        box(
          side * (towerHalf(y) + 0.1),
          y,
          fromRef((towerLead(y) + towerTrail(y)) / 2),
          0.3,
          0.55,
          (towerTrail(y) - towerLead(y)) * 0.7,
        ),
        "windows",
        { color: PAL.windowWarm, lod: 1, uv: "keep" },
      );
    for (const [y, f, w, h] of [
      [130, 0.46, 12, 14],
      [104, 0.5, 18, 9],
    ]) {
      const { p, n } = towerSurface(side, y, f);
      add(box(p.x + n.x * 0.6, y, p.z, 1.2, h, w), "dark", {
        color: 0x1c1f24,
        texel: 1 / 6,
        lod: 0,
      });
      add(
        box(p.x + n.x * 1.0, y - h / 2 + 1.2, p.z, 0.4, 0.4, w * 0.7),
        "windows",
        {
          color: PAL.windowCool,
          lod: 0,
          uv: "keep",
        },
      );
    }
    // rust streaks running down the tower and citadel faces
    for (let i = 0; i < 8; i++) {
      const y = 100 + rand() * 100;
      const len = 6 + rand() * 12;
      const f = 0.1 + rand() * 0.8;
      const { p, n } = towerSurface(side, y, f);
      add(
        box(p.x + n.x * 0.1, y - len / 2, p.z, 0.2, len, 0.6 + rand() * 0.6),
        "paint",
        {
          color: new THREE.Color(PAL.rust).multiplyScalar(0.75),
          lod: 0,
          uv: "keep",
        },
      );
    }
    for (let i = 0; i < 6; i++) {
      const r = 620 + rand() * 360;
      const len = 4 + rand() * 8;
      add(
        box(
          side * (cu.half + 0.1),
          cu.y1 - 0.5 - len / 2,
          fromRef(r),
          0.2,
          len,
          0.6 + rand() * 0.6,
        ),
        "paint",
        {
          color: new THREE.Color(PAL.rust).multiplyScalar(0.7),
          lod: 0,
          uv: "keep",
        },
      );
    }
  }
  // domes and dishes on the citadel deck and the spine
  const dome = (x, y, z, r, mat, colorHex, lods = [0, 1]) => {
    for (const lod of lods) {
      const seg = lod === 0 ? 14 : 8;
      add(
        new THREE.SphereGeometry(r, seg, Math.ceil(seg * 0.6)).translate(
          x,
          y,
          z,
        ),
        mat,
        {
          color: colorHex,
          texel: 1 / 4,
          lod,
        },
      );
    }
  };
  dome(0, cu.y1, fromRef(700), 6, "hull", PAL.belly);
  dome(-16, cu.y1, fromRef(770), 4.5, "dark", PAL.darkLit);
  dome(12, cl.y1, fromRef(975), 4, "hull", PAL.belly);
  dome(0, SPINE.y1 + 3, fromRef(400), 4, "hull", PAL.belly, [0]);
  dome(0, 63, fromRef(478), 3.2, "dark", PAL.darkLit, [0]);
  const dish = (x, y, z, r, tilt) => {
    const g = cylY(r, r * 0.3, 1.1, 14);
    g.rotateX(-tilt);
    g.translate(x, y, z);
    add(g, "dark", { color: 0x50555e, texel: 1 / 3, lod: 0 });
    add(cylY(0.5, 0.7, 5, 6).translate(x, y - 2.5, z), "dark", {
      color: 0x3a3e46,
      texel: 1 / 2,
      lod: 0,
    });
  };
  dish(14, cu.y1 + 5, fromRef(640), 5, -1.0);
  dish(-12, cu.y1 + 5, fromRef(760), 4, 0.9);
  dish(0, SPINE.y1 + 5, fromRef(350), 3.5, 0.8);
  // lit slit across the front face of the forward step block
  add(box(0, 64, fromRef(CITADEL_FORE.r0) - 0.1, 30, 0.5, 0.3), "windows", {
    color: PAL.windowCool,
    lod: 0,
    uv: "keep",
  });
}
