// Openings in the Providence hull: the square hangar bays along the back wall of the flank trough (open
// bays with a lit interior box, closed bays with a blast door set into the wall), and the louvred
// ventral hangar doors on the flanks of the forward chin. `hullCuts()` lists the open bays the hull loft
// drops; the LOD-0 stations include every cut edge so the interior lofts meet the hull exactly.
import * as THREE from "three";
import { box } from "./shipKit.js";
import {
  WALL_SEG,
  fromRef,
  hullFrame,
  loftRings,
  placeOn,
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
  BAY_PITCH,
  BAY_R0,
  BAY_W,
  CHIN_GRILLE,
  PAL,
  barAlong,
  bayOpen,
} from "./providenceSpec.js";

export function hullCuts() {
  const cuts = [];
  for (let k = 0; k < BAY_COUNT; k++) {
    const r0 = BAY_R0 + k * BAY_PITCH;
    for (const side of [-1, 1]) {
      const open = bayOpen(k, side);
      cuts.push({
        r0,
        r1: r0 + BAY_W,
        z0: fromRef(r0),
        z1: fromRef(r0 + BAY_W),
        seg: WALL_SEG,
        side,
        depth: BAY_DEPTH,
        kind: open ? "bay" : "door",
        k,
      });
    }
  }
  return cuts;
}

// hull loft face (stations i..i+1, ring segment j) lies inside one of the open bays
export function faceInCut(cuts, stations, i, j) {
  const m = segMirror(j);
  const side = segSide(j);
  const za = stations[i].z;
  const zb = stations[i + 1].z;
  for (const c of cuts)
    if (
      c.kind === "bay" &&
      c.seg === m &&
      c.side === side &&
      za >= c.z0 - 0.5 &&
      zb <= c.z1 + 0.5
    )
      return true;
  return false;
}
// a surface point (z, starboard segment m, side) falls inside a bay (open or closed), with a margin
export function inCut(cuts, z, m, side, margin = 4) {
  for (const c of cuts)
    if (
      c.seg === m &&
      c.side === side &&
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

export function buildBays({ add, cuts, stationsByLod }) {
  const zsAll = stationsByLod[0].map((s) => s.z);
  for (const c of cuts) {
    if (c.kind === "bay") {
      const zs = zsAll.filter((z) => z >= c.z0 - 0.01 && z <= c.z1 + 0.01);
      openBay(add, c, zs);
      // LOD 1: a dim lit rectangle stands in for the open bay (sub-pixel at LOD 2)
      const zc = (c.z0 + c.z1) / 2;
      const [x, y] = wallCentre(c.side, zc);
      add(box(x + c.side * 0.3, y, zc, 0.4, 11, BAY_W - 2), "windows", {
        color: rgb(PAL.hangarLight, 0.45),
        lod: 1,
        uv: "keep",
      });
    } else closedBay(add, c);
  }
  chinGrilles(add);
}

// centre of the trough back wall (x, y) at z for a side
function wallCentre(side, z) {
  const a = profilePoint(z, 8, side);
  const b = profilePoint(z, 9, side);
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
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

// open bay (LOD 0): recess behind the dropped wall faces, deck lights, lit rooms on the back wall, a dim
// ceiling strip and deck clutter so the bay reads as a lit interior, not a black slot
function openBay(add, c, zs) {
  const s = c.side;
  const top = zs.map((z) => profilePoint(z, 8, s));
  const bot = zs
    .slice()
    .reverse()
    .map((z) => profilePoint(z, 9, s));
  const outer = [...top, ...bot];
  const inner = outer.map(([x, y, z]) => [x - s * c.depth, y, z]);
  recess(add, outer, inner, [s, 0, 0], 0);
  const zc = (c.z0 + c.z1) / 2;
  const yTop = profilePoint(zc, 8, s)[1];
  const yBot = profilePoint(zc, 9, s)[1];
  const h = yTop - yBot;
  const xWall = profilePoint(zc, 8, s)[0];
  const xIn = (f) => xWall - s * c.depth * f;
  add(
    barAlong(
      [c.z0 + 1.5, zc, c.z1 - 1.5],
      (z) => [profilePoint(z, 8, s)[0] - s * c.depth * 0.45, yTop - 0.5],
      0.8,
      0.4,
      { color: rgb(PAL.hangarLight, 0.4) },
    ),
    "windows",
    { lod: 0, keepColor: true },
  );
  for (const dz of [-3.5, 3.5])
    add(box(xIn(0.55), yBot + 0.2, zc + dz, 1.4, 0.4, 1.4), "windows", {
      color: rgb(PAL.hangarLight, 1.0),
      lod: 0,
      uv: "keep",
    });
  for (let k = 0; k < 3; k++)
    add(
      box(xIn(1) + s * 0.25, yBot + h * 0.6, c.z0 + 3 + k * 3.5, 0.3, 1.0, 1.0),
      "windows",
      { color: rgb(PAL.windowWarm, 0.6), lod: 0, uv: "keep" },
    );
  // a glow panel low on the back wall (deck lights spilling onto the far bulkhead)
  add(box(xIn(1) + s * 0.15, yBot + 2.2, zc, 0.2, 3.2, BAY_W - 4), "windows", {
    color: rgb(PAL.hangarDim, 0.55),
    lod: 0,
    uv: "keep",
  });
  add(box(xIn(0.7), yBot + 1.2, zc - 2.5, 3, 2.4, 4), "dark", {
    color: PAL.darkLit,
    texel: 1 / 3,
    lod: 0,
  });
  add(box(xIn(0.4), yTop - 1.4, zc, 0.6, 1.0, BAY_W - 3), "dark", {
    color: PAL.dark,
    texel: 1 / 3,
    lod: 0,
  });
}

// closed bay (LOD 0/1): a plated blast door 1.2 m into the wall with a split seam and a warm sliver
function closedBay(add, c) {
  const s = c.side;
  const zc = (c.z0 + c.z1) / 2;
  const [x, y] = wallCentre(s, zc);
  const yTop = profilePoint(zc, 8, s)[1];
  const yBot = profilePoint(zc, 9, s)[1];
  const h = yTop - yBot;
  for (const lod of [0, 1]) {
    add(box(x - s * 0.5, y, zc, 0.9, h - 0.6, BAY_W - 0.6), "hull", {
      color: new THREE.Color(PAL.flank).multiplyScalar(0.62),
      texel: 1 / 14,
      lod,
    });
  }
  add(box(x + s * 0.05, y, zc, 0.3, 0.5, BAY_W - 1.4), "dark", {
    color: 0x1c1e22,
    texel: 1 / 3,
    lod: 0,
  });
  add(box(x + s * 0.05, y, zc, 0.3, h - 1.6, 0.5), "dark", {
    color: 0x1c1e22,
    texel: 1 / 3,
    lod: 0,
  });
  add(box(x + s * 0.1, yTop - 1.0, zc, 0.25, 0.3, BAY_W - 3), "windows", {
    color: rgb(0xffb070, 0.4),
    lod: 0,
    uv: "keep",
  });
}

// louvred ventral hangar doors on the chin flanks: a dark recessed panel with pale vertical bars
function chinGrilles(add) {
  const { r0, r1, y0, y1 } = CHIN_GRILLE;
  const zc = fromRef((r0 + r1) / 2);
  const len = r1 - r0;
  const hgt = y1 - y0;
  for (const side of [-1, 1]) {
    // frame on the lower body where the surface passes the panel's centre height
    const st = stationAt(zc);
    const fr = (y1 + y0) / 2;
    const u = (fr - st.yB1) / (st.yBot - st.yB1);
    const m = u < 0.25 ? 12 : u < 0.5 ? 13 : 14;
    const t = (u - (m - 12) * 0.25) / 0.25;
    const f = hullFrame(zc, m, Math.min(0.95, Math.max(0.05, t)), side);
    const place = (g, out) =>
      placeOn(g, f.p.clone().addScaledVector(f.n, out), f.n);
    for (const lod of [0, 1]) {
      add(place(box(0, 0, 0, hgt + 2, 1.2, len + 2), 0.2), "dark", {
        color: 0x1e2126,
        texel: 1 / 4,
        lod,
      });
      const n = lod === 0 ? 9 : 4;
      for (let k = 0; k < n; k++) {
        const dz = -len / 2 + 3 + ((len - 6) * k) / (n - 1);
        add(
          place(box(0, 0.9, dz, hgt - 2, 1.4, lod === 0 ? 2.0 : 4.5), 0.2),
          "hull",
          {
            color: new THREE.Color(PAL.flank).multiplyScalar(0.85),
            texel: 1 / 6,
            lod,
          },
        );
      }
    }
    // dim glow between the louvres and a hazard sill
    add(place(box(0, 0.6, 0, hgt - 3, 0.2, len - 4), 0.2), "windows", {
      color: rgb(PAL.hangarDim, 0.5),
      lod: 0,
      uv: "keep",
    });
    add(place(box(-hgt / 2 - 1.6, 0.5, 0, 1.2, 0.6, len + 2), 0.2), "paint", {
      color: PAL.hazard,
      lod: 0,
    });
  }
}
