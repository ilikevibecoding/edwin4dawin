// Providence-class carrier/destroyer (Separatist), 1088 m. Original procedural geometry after the film's
// design language: a long slender dagger hull with a rounded-triangular section, a tall stepped rear
// command tower carrying a wide bridge head, a smaller forward sensor tower, a ventral fin under the
// stern, discrete recessed hangar bays along both flanks, tracking heavy turrets on the dorsal ridge, a
// clustered stern engine array. Blue-grey plating at three scales (raised 40-60 m plate seams, 10 m
// sub-panels in the plating map, hatch rows), darker dorsal panels, paler belly, soot aft, rust-brown
// trims on the tower edges. Three complete LODs, five materials.
import * as THREE from "three";
import { assemble, part } from "./shipKit.js";
import {
  HULL,
  RING_SHARP,
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

export const PROVIDENCE = { length: 1088, width: 236, height: 404 };

// hull stations per LOD (dense at LOD 0; every cut edge is a station so the bay openings are exact)
function hullStations(lod, cuts) {
  const step = lod === 0 ? 32 : lod === 1 ? 84 : 150;
  let zs = [];
  for (let z = HULL.zBow + 2.5; z < HULL.zStern - step * 0.5; z += step)
    zs.push(z);
  zs.push(HULL.zStern);
  if (lod < 2) {
    const edges = [...new Set(cuts.flatMap((c) => [c.z0, c.z1]))];
    zs = zs.filter((z) => edges.every((e) => Math.abs(z - e) > 6));
    zs.push(...edges);
  }
  zs.sort((a, b) => a - b);
  return zs.map((z) => stationAt(z));
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
      bounds: { radius: 640 },
    },
    mats,
  );
}

// ---------------------------------------------------------------------------
// hull: one loft per LOD with per-face plate tints and per-plate UV rotation/offset; bay openings are
// dropped from the loft (their interiors are built in providenceBays.js)
// ---------------------------------------------------------------------------
const DORSAL = rgb(PAL.dorsal);
const FLANK = rgb(PAL.flank);
const BELLY = rgb(PAL.belly);

// plate tint for a hull face: base by facing (dorsal / flank / belly), large-plate tone per seam cell,
// darker inset plates, repainted plates, grime at the creases and warm soot streaks toward the stern
function plateColor(lodGain, i, j, c, n) {
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
  let tone = lodGain * (1 + (g - 0.5) * 0.16);
  const r = hash(cell, m + s, 5);
  let desat = 0;
  if (r < 0.12) tone *= 0.72;
  else if (r > 0.9) {
    tone *= 1.1;
    desat = 0.35;
  }
  tone *= 1 + (hash(i, j, 9) - 0.5) * 0.06;
  if (m === 1 || m === 4 || m === 7) tone *= 0.9;
  if (m >= 11) tone *= 0.93;
  // soot: darker, warmer bands 100-250 m forward of the nozzles, streaked per hull segment, heaviest
  // at the stern wall (baked into every LOD's tint)
  const t = (z - HULL.zBow) / HULL.length;
  const streak = 0.45 + 0.55 * hash(m + s, 77, 2);
  const soot =
    smoothstep(0.74, 0.98, t) * streak * 0.7 + smoothstep(0.93, 1.0, t) * 0.3;
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
// one plating scale for the whole ship (hull faces, tower tiers, ledges, heads): see PLATE_TEXEL
const texelFor = () => PLATE_TEXEL;

function buildHull({ add, cuts, stationsByLod }) {
  for (const lod of [0, 1, 2]) {
    const stations = stationsByLod[lod];
    const rings = stations.map(ringFromStation);
    // the same tint at every LOD: a ship must not change grey when it drops a LOD
    const gain = 1;
    // each (plate cell, face) gets its own UV rotation and offset so the plating grid never lines up
    // across faces and the tile never reads as a repeating pattern along the hull
    const uv = (i, j, p, arc, fi, fj) => {
      const m = segMirror(fj);
      const s = segSide(fj) < 0 ? 20 : 0;
      const cell = seamCell((stations[fi].z + stations[fi + 1].z) / 2);
      const rot = hash(cell + 3, m + s, 23) < 0.5;
      const o0 = hash(cell, m + s, 21);
      const o1 = hash(cell, m + s, 22);
      const tx = texelFor(m);
      return rot
        ? [p[2] * tx + o0, arc * tx + o1]
        : [arc * tx + o0, p[2] * tx + o1];
    };
    add(
      loftRings(rings, {
        sharp: RING_SHARP,
        faceFilter: lod < 2 ? (i, j) => !faceInCut(cuts, stations, i, j) : null,
        faceColor: (i, j, c, n) => plateColor(gain, i, j, c, n),
        uv,
      }),
      "hull",
      { lod, keepColor: true },
    );
    // bow cap and the stern engine wall (dark, sooty)
    add(ringCap(rings[0], [0, 0, -1], { color: FLANK }), "hull", {
      lod,
      keepColor: true,
    });
    add(
      ringCap(rings[rings.length - 1], [0, 0, 1], {
        texel: 1 / 9,
        color: rgb(PAL.dark, 0.7),
      }),
      "dark",
      { lod, keepColor: true },
    );
  }
}
