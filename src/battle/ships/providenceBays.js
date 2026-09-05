// Recesses cut into the Providence hull: the hangar bays in the flank band (open bays with a dark
// interior box, floor lights and a dim ceiling strip; closed bays with a blast door set into a shallow
// recess), the ventral hangar mouth under the bow with a lit ceiling, shallow belly bays, and the keel
// strake with lit slots. `hullCuts()` lists the openings the hull loft drops; the stations of each LOD
// include every cut edge so the interior lofts meet the hull exactly.
import * as THREE from "three";
import { box } from "./shipKit.js";
import {
  BAND_SEG,
  hullFrame,
  loftRings,
  profilePoint,
  rgb,
  ringCap,
  segMirror,
  segSide,
  stationAt,
} from "./providenceGeo.js";
import {
  BAY_COUNT,
  BAY_DEPTH,
  BAY_LEN,
  BAY_PITCH,
  BAY_Z0,
  BELLY_BAYS,
  BELLY_BAY_DEPTH,
  DOOR_DEPTH,
  PAL,
  VENTRAL_MOUTH,
  barAlong,
  bayOpen,
} from "./providenceSpec.js";

export function hullCuts() {
  const cuts = [];
  for (let k = 0; k < BAY_COUNT; k++) {
    const z0 = BAY_Z0 + k * BAY_PITCH;
    for (const side of [-1, 1]) {
      const open = bayOpen(k, side);
      cuts.push({
        z0,
        z1: z0 + BAY_LEN,
        seg: BAND_SEG,
        side,
        depth: open ? BAY_DEPTH : DOOR_DEPTH,
        kind: open ? "bay" : "door",
        k,
      });
    }
  }
  cuts.push({ ...VENTRAL_MOUTH, seg: 11, side: 0, kind: "mouth" });
  for (const b of BELLY_BAYS)
    cuts.push({
      z0: b.zc - b.len / 2,
      z1: b.zc + b.len / 2,
      seg: 9,
      side: b.side,
      depth: BELLY_BAY_DEPTH,
      kind: "belly",
    });
  return cuts;
}

// hull loft face (stations i..i+1, ring segment j) lies inside one of the cuts
export function faceInCut(cuts, stations, i, j) {
  const m = segMirror(j);
  const side = segSide(j);
  const za = stations[i].z;
  const zb = stations[i + 1].z;
  for (const c of cuts)
    if (
      c.seg === m &&
      (c.side === 0 || c.side === side) &&
      za >= c.z0 - 0.5 &&
      zb <= c.z1 + 0.5
    )
      return true;
  return false;
}
// a surface point (z, starboard segment m, side) falls inside a cut, with a margin
export function inCut(cuts, z, m, side, margin = 4) {
  for (const c of cuts)
    if (
      c.seg === m &&
      (c.side === 0 || c.side === side) &&
      z > c.z0 - margin &&
      z < c.z1 + margin
    )
      return true;
  return false;
}

const WALL = rgb(0x3a3f47);
const CEIL = rgb(0x2a2e35);
const FLOOR = rgb(0x4a5059);
const BACK = rgb(0x4e545d);

// vertical quad on a bay's back wall with a bottom-to-top colour gradient (light spill from the deck
// lights): x fixed, facing side * +X, z from za to zb, y from yb (colour cb) to yt (colour ct)
function spillQuad(x, side, za, zb, yb, yt, cb, ct) {
  const g = new THREE.BufferGeometry();
  const v = [
    [x, yb, za, cb],
    [x, yb, zb, cb],
    [x, yt, zb, ct],
    [x, yt, za, ct],
  ];
  const tri = side < 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
  const pos = [];
  const col = [];
  const uv = [];
  for (const i of tri) {
    pos.push(v[i][0], v[i][1], v[i][2]);
    col.push(...v[i][3]);
    uv.push(i === 1 || i === 2 ? 1 : 0, i >= 2 ? 1 : 0);
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

export function buildBays({ add, cuts, stationsByLod }) {
  for (const lod of [0, 1]) {
    const zsAll = stationsByLod[lod].map((s) => s.z);
    for (const c of cuts) {
      const zs = zsAll.filter((z) => z >= c.z0 - 0.01 && z <= c.z1 + 0.01);
      if (c.kind === "bay" || c.kind === "door") flankBay(add, c, zs, lod);
      else if (c.kind === "mouth") ventralMouth(add, c, zs, lod);
      else bellyBay(add, c, zs, lod);
    }
  }
  // LOD 2: dim lit rectangles stand in for the open bays and the mouth
  for (const c of cuts) {
    if (c.kind === "bay") {
      const zc = (c.z0 + c.z1) / 2;
      const s = stationAt(zc);
      const [x, y] = [c.side * (s.w - 0.4), s.yWide];
      add(box(x, y, zc, 0.6, 9, BAY_LEN * 0.6), "windows", {
        color: rgb(PAL.hangarLight, 0.5),
        lod: 2,
        uv: "keep",
        keepColor: false,
      });
    }
  }
  keelStrake(add);
}

// interior box behind an opening outline on the hull: side walls (facing in) + back wall
function recess(add, outer, inner, backNormal, lod, colors = {}) {
  const wall = colors.wall || WALL;
  const floor = colors.floor || FLOOR;
  const ceil = colors.ceil || CEIL;
  add(
    loftRings([outer, inner], {
      invert: true,
      faceColor: (i, j, c, n) =>
        n[1] > 0.5 ? floor : n[1] < -0.5 ? ceil : wall,
      texel: 1 / 8,
    }),
    "dark",
    { lod, keepColor: true },
  );
  add(
    ringCap(inner, backNormal, {
      color: colors.back || BACK,
      texel: colors.backTexel || 1 / 8,
    }),
    colors.backMat || "dark",
    { lod, keepColor: true },
  );
}

function flankBay(add, c, zs, lod) {
  const s = c.side;
  const top = zs.map((z) => profilePoint(z, 5, s));
  const bot = zs
    .slice()
    .reverse()
    .map((z) => profilePoint(z, 6, s));
  const outer = [...top, ...bot];
  const inner = outer.map(([x, y, z]) => [x - s * c.depth, y, z]);
  const zc = (c.z0 + c.z1) / 2;
  const st = stationAt(zc);
  const y5 = profilePoint(zc, 5, s)[1];
  const y6 = profilePoint(zc, 6, s)[1];
  const h = y5 - y6;
  const xIn = (f) => s * (st.w - c.depth * f);
  if (c.kind === "door") {
    // blast door: a plated slab (hull material, a shade darker than the band) set 3 m into the flank
    recess(add, outer, inner, [s, 0, 0], lod, {
      back: rgb(PAL.flank, 0.78),
      backMat: "hull",
      backTexel: 1 / 14,
    });
    if (lod === 0) {
      // door seams (two leaves, a horizontal split), a hazard-striped sill and a dim warm sliver
      // under the top lip
      add(box(xIn(0.9), y6 + h * 0.5, zc, 0.5, 0.5, BAY_LEN - 3), "dark", {
        color: 0x1c1e22,
        texel: 1 / 3,
        lod,
      });
      add(box(xIn(0.9), y6 + h * 0.5, zc, 0.5, h - 1.2, 0.5), "dark", {
        color: 0x1c1e22,
        texel: 1 / 3,
        lod,
      });
      for (const dz of [-1, 1])
        add(
          box(
            xIn(0.8),
            y6 + h * 0.5,
            zc + dz * BAY_LEN * 0.24,
            0.35,
            h * 0.55,
            6,
          ),
          "hull",
          {
            color: new THREE.Color(PAL.flank).multiplyScalar(0.7),
            texel: 1 / 8,
            lod,
          },
        );
      add(box(xIn(0.4), y6 + 0.35, zc, 0.5, 0.6, BAY_LEN - 4), "paint", {
        color: PAL.trim,
        lod,
      });
      add(box(xIn(0.35), y5 - 0.6, zc, 0.3, 0.3, BAY_LEN - 5), "windows", {
        color: rgb(0xffb070, 0.4),
        lod,
        uv: "keep",
        keepColor: false,
      });
    }
    return;
  }
  recess(add, outer, inner, [s, 0, 0], lod);
  // dim ceiling strip along the bay and a faint glow panel low on the back wall (the deck lighting
  // spilling onto the far bulkhead) so the bay reads as a lit interior, not a black slot
  add(
    barAlong(
      [c.z0 + 3, zc, c.z1 - 3],
      (z) => [s * (stationAt(z).w - c.depth * 0.45), y5 - 0.6],
      1.0,
      0.5,
      { color: rgb(PAL.hangarLight, 0.4) },
    ),
    "windows",
    { lod, keepColor: true },
  );
  add(
    spillQuad(
      xIn(1) + s * 0.15,
      s,
      c.z0 + 2.5,
      c.z1 - 2.5,
      y6 + 0.3,
      y6 + h * 0.75,
      rgb(PAL.hangarDim, 0.7),
      [0, 0, 0],
    ),
    "windows",
    { lod, keepColor: true },
  );
  if (lod !== 0) return;
  // floor lights, lit rooms on the back wall, deck clutter and a ceiling gantry
  for (const dz of [-11, 0, 11])
    add(box(xIn(0.5), y6 + 0.2, zc + dz, 1.8, 0.4, 1.8), "windows", {
      color: rgb(PAL.hangarLight, 1.0),
      lod,
      uv: "keep",
    });
  for (let k = 0; k < 4; k++)
    add(
      box(xIn(1) + s * 0.25, y6 + h * 0.62, c.z0 + 8 + k * 8, 0.3, 1.1, 1.1),
      "windows",
      { color: rgb(PAL.windowWarm, 0.6), lod, uv: "keep" },
    );
  add(box(xIn(0.75), y6 + 1.5, zc - 8, 5, 3, 7), "dark", {
    color: PAL.darkLit,
    texel: 1 / 3,
    lod,
  });
  add(box(xIn(0.6), y6 + 1.0, zc + 12, 3, 2, 4), "dark", {
    color: PAL.darkLit,
    texel: 1 / 3,
    lod,
  });
  add(box(xIn(0.4), y5 - 1.8, zc, 0.8, 1.2, BAY_LEN - 8), "dark", {
    color: PAL.dark,
    texel: 1 / 3,
    lod,
  });
}

function ventralMouth(add, c, zs, lod) {
  const stbd = zs.map((z) => profilePoint(z, 11, 1));
  const port = zs
    .slice()
    .reverse()
    .map((z) => profilePoint(z, 11, -1));
  const outer = [
    ...stbd,
    profilePoint(c.z1, 12, 1),
    ...port,
    profilePoint(c.z0, 12, 1),
  ];
  const inner = outer.map(([x, y, z]) => [x, y + c.depth, z]);
  recess(add, outer, inner, [0, -1, 0], lod, {
    wall: rgb(0x2e3239),
    back: rgb(0x2a2e35),
  });
  const zc = (c.z0 + c.z1) / 2;
  const yCeil = stationAt(zc).yBot + c.depth;
  // lit ceiling: two dim cool strips and a row of warm work lights
  for (const x of [-5, 5])
    add(
      barAlong(
        [c.z0 + 4, zc, c.z1 - 4],
        (z) => [x, stationAt(z).yBot + c.depth - 0.5],
        0.7,
        0.35,
        { color: rgb(PAL.hangarLight, 0.3) },
      ),
      "windows",
      { lod, keepColor: true },
    );
  if (lod !== 0) return;
  for (let k = 0; k < 5; k++)
    add(box(0, yCeil - 0.5, c.z0 + 8 + k * 10.5, 1.2, 0.3, 1.2), "windows", {
      color: rgb(PAL.windowWarm, 0.7),
      lod,
      uv: "keep",
    });
  // gantries and a docking cradle hanging in the mouth
  for (const x of [-9, 9])
    add(box(x, yCeil - 2.5, zc, 1.4, 3, c.z1 - c.z0 - 10), "dark", {
      color: PAL.darkLit,
      texel: 1 / 3,
      lod,
    });
  add(box(0, yCeil - 4, zc + 6, 12, 2.4, 9), "dark", {
    color: PAL.darkLit,
    texel: 1 / 3,
    lod,
  });
}

function bellyBay(add, c, zs, lod) {
  const s = c.side;
  const a = zs.map((z) => profilePoint(z, 9, s));
  const b = zs
    .slice()
    .reverse()
    .map((z) => profilePoint(z, 10, s));
  const outer = [...a, ...b];
  const zc = (c.z0 + c.z1) / 2;
  const n = hullFrame(zc, 9, 0.5, s).n;
  const inner = outer.map(([x, y, z]) => [
    x - n.x * c.depth,
    y - n.y * c.depth,
    z - n.z * c.depth,
  ]);
  recess(add, outer, inner, [n.x, n.y, n.z], lod, { back: rgb(0x2a2e35) });
  if (lod !== 0) return;
  // machinery in the recess and one dim work light
  const f = hullFrame(zc, 9, 0.5, s);
  const p = f.p.clone().addScaledVector(f.n, -c.depth + 1.2);
  add(box(p.x, p.y, p.z - 6, 6, 2.4, 8), "dark", {
    color: PAL.darkLit,
    texel: 1 / 3,
    lod,
  });
  const q = f.p.clone().addScaledVector(f.n, -c.depth + 0.4);
  add(box(q.x, q.y, q.z + 8, 1.0, 0.6, 1.0), "windows", {
    color: rgb(PAL.windowWarm, 0.5),
    lod,
    uv: "keep",
  });
}

// keel strake: a raised spine under the belly (split around the ventral mouth) with lit slots
function keelStrake(add) {
  const runs = [
    [-420, -306],
    [-228, 290],
  ];
  for (const lod of [0, 1]) {
    for (const [za, zb] of runs) {
      const zs = [];
      const step = lod === 0 ? 24 : 60;
      for (let z = za; z < zb; z += step) zs.push(z);
      zs.push(zb);
      add(
        barAlong(zs, (z) => [0, stationAt(z).yBot - 1.0], 4.4, 2.2, {
          color: rgb(PAL.belly, 0.92),
          texel: 1 / 8,
        }),
        "hull",
        { lod, keepColor: true },
      );
    }
  }
  for (const [za, zb] of runs)
    for (let z = za + 8; z < zb - 4; z += 16)
      for (const side of [-1, 1])
        add(
          box(side * 2.3, stationAt(z).yBot - 1.0, z, 0.25, 0.7, 3.2),
          "windows",
          { color: rgb(PAL.windowCool, 0.55), lod: 0, uv: "keep" },
        );
}
