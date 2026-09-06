// Providence-class carrier/destroyer (Separatist), 1088 m. Original procedural geometry matched to the
// reference views of the Invisible Hand: a long slender dagger whose section is taller than it is wide
// (flat dorsal ridge, egg shoulders, a vertical flank belt, a deep forward chin), a narrow dorsal spine
// with mast clusters running into the wide citadel block, a thin command tower raked 30° aft carrying
// the hammerhead bridge pod ~240 m above the datum with a forward comms spar, a swept ventral fin, a
// recessed hangar trough with square bay openings along the aft flanks, and a small blunt stern with a
// tall array of seven engine bells. Blue-grey plating with dark slate rectangles and yellow hazard
// patches, rust trims on the tower edges. Three complete LODs, five materials.
import * as THREE from "three";
import { assemble, part } from "./shipKit.js";
import {
  HULL,
  RING_SHARP,
  TROUGH,
  fromRef,
  hash,
  lerp,
  loftRings,
  mixRgb,
  rgb,
  ringCap,
  ringFromStation,
  segMirror,
  segSide,
  smoothstep,
  stationAt,
} from "./providenceGeo.js";
import { PAL, PLATE_TEXEL, seamCell } from "./providenceSpec.js";
import { buildTower } from "./providenceTower.js";
import { buildBays, hullCuts, faceInCut } from "./providenceBays.js";
import { buildTurrets } from "./providenceTurrets.js";
import { addDetails } from "./providenceDetail.js";

export const PROVIDENCE = { length: 1088, width: 118, height: 382 };

// hull stations per LOD (dense at the bow and the stern taper at LOD 0; the trough ends and every open
// bay edge are stations so the recess walls meet the hull exactly)
function hullStations(lod, cuts) {
  const stepAt = (r) => {
    if (lod === 2) return r < 60 ? 20 : r < 200 ? 50 : r > 900 ? 50 : 110;
    if (lod === 1) return r < 60 ? 12 : r < 220 ? 24 : r > 900 ? 24 : 44;
    return r < 60 ? 7 : r < 220 ? 12 : r > 880 ? 12 : 22;
  };
  let rs = [];
  for (let r = 0; r < 1046 - 4; r += stepAt(r)) rs.push(r);
  rs.push(1046);
  // LOD 2 skips the trough edge stations (a 6 m recess is sub-pixel at that range)
  const edges =
    lod === 2 ? [] : [TROUGH.r0 - 4, TROUGH.r0, TROUGH.r1, TROUGH.r1 + 4];
  if (lod === 0)
    for (const c of cuts) if (c.kind === "bay") edges.push(c.r0, c.r1);
  rs = rs.filter((r) => edges.every((e) => Math.abs(r - e) > 2.5));
  rs.push(...new Set(edges));
  rs.sort((a, b) => a - b);
  return rs.map((r) => stationAt(fromRef(r)));
}

export function buildProvidence(mats) {
  const L = PROVIDENCE.length;
  const parts = [];
  // add a geometry; keepColor preserves per-vertex colours produced by the loft/colorize helpers.
  // `color` may be a hex, a THREE.Color or a linear [r, g, b] triple from rgb() (three's Color
  // constructor ignores arrays, so triples are converted here).
  const add = (
    geo,
    mat,
    {
      color = 0xffffff,
      texel = 1 / 16,
      lod = 0,
      uv = "planar",
      keepColor = false,
    } = {},
  ) => {
    if (keepColor && geo.index) geo = geo.toNonIndexed();
    const saved = keepColor ? geo.attributes.color : null;
    const p = part(geo, mat, {
      color: Array.isArray(color)
        ? new THREE.Color().setRGB(color[0], color[1], color[2])
        : color,
      texel,
      lod,
      uv: keepColor ? "keep" : uv,
    });
    if (saved) p.geo.setAttribute("color", saved);
    parts.push(p);
    return p;
  };
  const cuts = hullCuts();
  const stationsByLod = [0, 1, 2].map((lod) => hullStations(lod, cuts));
  const ctx = { parts, add, mats, L, cuts, stationsByLod };

  buildHull(ctx);
  buildTower(ctx);
  buildBays(ctx);
  const { turretTypes, turrets, hardpoints } = buildTurrets(ctx);
  const engines = addDetails(ctx);

  return assemble(
    {
      id: "providence",
      side: "separatist",
      length: L,
      parts,
      hardpoints,
      engines,
      turretTypes,
      turrets,
      bounds: { radius: 620 },
    },
    mats,
  );
}

// ---------------------------------------------------------------------------
// hull: one loft per LOD with per-face plate tints and per-plate UV rotation/offset; the open bays are
// dropped from the trough back wall (their interiors are built in providenceBays.js)
// ---------------------------------------------------------------------------
const DORSAL = rgb(PAL.dorsal);
const FLANK = rgb(PAL.flank);
const BELLY = rgb(PAL.belly);

// plate tint for a hull face: base by facing (dorsal / flank / belly), large-plate tone per seam cell,
// darker inset plates, repainted plates, the shadowed trough, and warm soot streaks toward the stern
function plateColor(i, j, c, n, st) {
  const m = segMirror(j);
  const s = segSide(j) < 0 ? 20 : 0;
  const up = n[1];
  const base =
    up > 0
      ? mixRgb(FLANK, DORSAL, smoothstep(0.08, 0.75, up))
      : mixRgb(FLANK, BELLY, smoothstep(0.05, 0.7, -up));
  const z = c[2];
  const cell = seamCell(z);
  const g = hash(cell + 11, m * 7 + 3 + s, 1);
  let tone = 1 + (g - 0.5) * 0.16;
  const r = hash(cell, m + s, 5);
  let desat = 0;
  if (r < 0.12) tone *= 0.72;
  else if (r > 0.9) {
    tone *= 1.1;
    desat = 0.35;
  }
  tone *= 1 + (hash(i, j, 9) - 0.5) * 0.06;
  if (m === 2 || m === 4 || m === 13) tone *= 0.92;
  if (m >= 12) tone *= 0.95;
  // the recessed trough (back wall and its lips) sits in shadow
  if (st.d > 0 && m >= 7 && m <= 10) tone *= m === 8 ? 0.5 : 0.62;
  // the reference beak is charcoal blue-grey: sRGB ~40 against ~110 on the lit shoulder plating aft
  // of it (a ~0.2 linear tint after gamma); the light plating starts abruptly at r ~280-310 on the
  // upper hull, later (r ~330-400) on the belt and the chin
  const beakEnd = m >= 11 ? [330, 400] : m >= 6 ? [275, 310] : [265, 300];
  // (the lower hull already sits in the belly shadow, so its beak tint stops at 0.35)
  tone *= lerp(
    m >= 11 ? 0.35 : 0.16,
    1,
    smoothstep(beakEnd[0], beakEnd[1], st.r),
  );
  // the lower hull stays a little darker than the flank along the whole length
  if (m >= 11) tone *= lerp(0.82, 0.95, smoothstep(300, 600, st.r));
  // and the belt itself reads as a dark band along the whole flank
  if (m >= 6 && m <= 10) tone *= 0.8;
  // soot: darker, warmer bands forward of the nozzles, streaked per hull segment, heaviest at the stern
  const t = (z - HULL.zBow) / HULL.length;
  const streak = 0.45 + 0.55 * hash(m + s, 77, 2);
  const soot =
    smoothstep(0.8, 0.97, t) * streak * 0.6 + smoothstep(0.93, 0.97, t) * 0.25;
  let col = [base[0] * tone, base[1] * tone, base[2] * tone];
  if (desat) {
    const l = (col[0] + col[1] + col[2]) / 3;
    col = col.map((v) => lerp(v, l, desat));
  }
  return [
    col[0] * (1 - soot * 0.5),
    col[1] * (1 - soot * 0.56),
    col[2] * (1 - soot * 0.66),
  ];
}

function buildHull({ add, cuts, stationsByLod }) {
  for (const lod of [0, 1, 2]) {
    const stations = stationsByLod[lod];
    const rings = stations.map(ringFromStation);
    // each (plate cell, face) gets its own UV rotation and offset so the plating grid never lines up
    // across faces and the tile never reads as a repeating pattern along the hull
    const uv = (i, j, p, arc, fi, fj) => {
      const m = segMirror(fj);
      const s = segSide(fj) < 0 ? 20 : 0;
      const cell = seamCell((stations[fi].z + stations[fi + 1].z) / 2);
      const rot = hash(cell + 3, m + s, 23) < 0.5;
      const o0 = hash(cell, m + s, 21);
      const o1 = hash(cell, m + s, 22);
      const tx = PLATE_TEXEL;
      return rot
        ? [p[2] * tx + o0, arc * tx + o1]
        : [arc * tx + o0, p[2] * tx + o1];
    };
    add(
      loftRings(rings, {
        sharp: RING_SHARP,
        faceFilter:
          lod === 0 ? (i, j) => !faceInCut(cuts, stations, i, j) : null,
        faceColor: (i, j, c, n) => plateColor(i, j, c, n, stations[i]),
        uv,
      }),
      "hull",
      { lod, keepColor: true },
    );
    // bow tip cap and the stern face (dark, sooty; the bells stand on it)
    add(ringCap(rings[0], [0, 0, -1], { color: rgb(PAL.dark) }), "dark", {
      lod,
      keepColor: true,
    });
    add(
      ringCap(rings[rings.length - 1], [0, 0, 1], {
        texel: 1 / 9,
        color: rgb(PAL.dark, 0.75),
      }),
      "dark",
      { lod, keepColor: true },
    );
  }
}
