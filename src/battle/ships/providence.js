// Providence-class carrier/destroyer (Separatist), 1088 m. Original procedural geometry after the film's
// design language: a long slender dagger hull with a rounded-triangular section, a very tall thin rear
// command fin carrying a bulbous bridge pod, a smaller forward sensor fin, a long ventral fin under the
// stern, lit hangar slots along both flanks, many small turrets on the dorsal ridge and flanks, a
// clustered stern engine array. Blue-grey plating: darker dorsal panels, paler belly, soot aft, rust-brown
// fin edges. Three complete LODs, six materials.
import { assemble, box, part } from "./shipKit.js";
import {
  HULL,
  RING_SHARP,
  HANGAR_SEGS,
  BLADE_SHARP,
  bladeRings,
  colorize,
  hash,
  loftRings,
  mixRgb,
  podRings,
  rgb,
  ringCap,
  ringFromStation,
  segMirror,
  smoothstep,
  stationAt,
} from "./providenceGeo.js";
import { PAL, FINS, POD, barAlong } from "./providenceSpec.js";
import { addDetails } from "./providenceDetail.js";

export const PROVIDENCE = { length: 1088, width: 236, height: 404 };

// hull stations per LOD (dense at LOD 0; hangar end walls as paired stations 1.5 m apart)
function hullStations(lod) {
  const step = lod === 0 ? 32 : lod === 1 ? 84 : 150;
  let zs = [];
  for (let z = HULL.zBow + 2.5; z < HULL.zStern - step * 0.5; z += step)
    zs.push(z);
  zs.push(HULL.zStern);
  const hangar = lod < 2;
  if (hangar) {
    const ends = [
      HULL.hangar.z0 - 1.5,
      HULL.hangar.z0 + 0.01,
      HULL.hangar.z1 - 0.01,
      HULL.hangar.z1 + 1.5,
    ];
    zs = zs.filter((z) => ends.every((e) => Math.abs(z - e) > 7));
    zs.push(...ends);
  }
  zs.sort((a, b) => a - b);
  return zs.map((z) => stationAt(z, { hangar }));
}

export function buildProvidence(mats) {
  const L = PROVIDENCE.length;
  const parts = [];
  // add a geometry; keepColor preserves per-vertex colours produced by the loft/colorize helpers
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
      color,
      texel,
      lod,
      uv: keepColor ? "keep" : uv,
    });
    if (saved) p.geo.setAttribute("color", saved);
    parts.push(p);
    return p;
  };
  const ctx = { parts, add, mats, L };

  buildHull(ctx);
  buildFins(ctx);
  buildHangars(ctx);
  const { hardpoints, engines } = addDetails(ctx);

  return assemble(
    {
      id: "providence",
      side: "separatist",
      length: L,
      parts,
      hardpoints,
      engines,
      bounds: { radius: 640 },
    },
    mats,
  );
}

// ---------------------------------------------------------------------------
// hull: one loft per LOD with per-face tints; hangar recess faces split off to the dark material
// ---------------------------------------------------------------------------
function buildHull({ add }) {
  const DORSAL = rgb(PAL.dorsal);
  const FLANK = rgb(PAL.flank);
  const BELLY = rgb(PAL.belly);
  // far LODs lose the specular breakup and read darker: compensate slightly
  const hullColor = (lodGain) => (i, j, c, n) => {
    const m = segMirror(j);
    const up = n[1];
    const base =
      up > 0
        ? mixRgb(FLANK, DORSAL, smoothstep(0.08, 0.75, up))
        : mixRgb(FLANK, BELLY, smoothstep(0.05, 0.7, -up));
    // panel groups (2 stations x 1 segment share a tone), a few repainted plates
    const g = hash(Math.floor(i / 2) + 11, m * 7 + 3, 1);
    let tone = lodGain * (1 + (g - 0.5) * 0.2);
    if (hash(i, m, 5) < 0.14) tone *= 0.84 + hash(i, m, 9) * 0.3;
    // soot streaks running forward from the engines
    const t = (c[2] - HULL.zBow) / HULL.length;
    const streak = 0.35 + 0.65 * hash(m, 77, 2);
    tone *= 1 - 0.55 * smoothstep(0.8, 1.0, t) * streak;
    // grime in the hangar lips and along the keel
    if (m === 4 || m === 7) tone *= 0.9;
    if (m >= 11) tone *= 0.94;
    return [base[0] * tone, base[1] * tone, base[2] * tone];
  };
  for (const lod of [0, 1, 2]) {
    const stations = hullStations(lod);
    const rings = stations.map(ringFromStation);
    const isRecess = (i, j) =>
      (stations[i].hangar || stations[i + 1].hangar) &&
      HANGAR_SEGS.has(segMirror(j));
    const texel = lod === 0 ? 1 / 22 : 1 / 26;
    // plating streaks run lengthwise (v along z); each panel group gets its own UV offset so the
    // 22 m tile never reads as a repeating pattern across the hull
    const uvOff = (i, j) => {
      const gi = Math.floor(i / 2);
      const m = segMirror(j);
      return [hash(gi, m, 21), hash(gi, m, 22)];
    };
    add(
      loftRings(rings, {
        sharp: RING_SHARP,
        faceFilter: (i, j) => !isRecess(i, j),
        faceColor: hullColor(lod === 0 ? 1 : lod === 1 ? 1.06 : 1.14),
        uv: (i, j, p, arc, fi, fj) => {
          const o = uvOff(fi, fj);
          return [arc * texel + o[0], p[2] * texel + o[1]];
        },
      }),
      "hull",
      { lod, keepColor: true },
    );
    if (lod < 2)
      add(
        loftRings(rings, {
          sharp: RING_SHARP,
          faceFilter: isRecess,
          faceColor: () => rgb(PAL.dark, 0.9),
          texel: 1 / 7,
        }),
        "dark",
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
        color: rgb(PAL.dark, 0.75),
      }),
      "dark",
      { lod, keepColor: true },
    );
  }
}

// ---------------------------------------------------------------------------
// fins and pods: main command fin, forward sensor fin, ventral fin, rust edge sleeves, bridge pod
// ---------------------------------------------------------------------------
function buildFins({ add }) {
  const finColor = (baseHex) => (i, j, c, n) => {
    const base = rgb(baseHex);
    const g = hash(i * 3 + 1, j * 5 + 2, 7);
    let tone = 1 + (g - 0.5) * 0.12;
    tone *= 0.9 + 0.1 * smoothstep(0.5, 1.0, Math.abs(n[0]));
    return [base[0] * tone, base[1] * tone, base[2] * tone];
  };
  const finRibs = (lod) => (lod === 0 ? 11 : lod === 1 ? 6 : 4);
  for (const lod of [0, 1, 2]) {
    for (const [key, spec] of Object.entries(FINS)) {
      const n = key === "main" ? finRibs(lod) : Math.max(3, finRibs(lod) - 2);
      add(
        loftRings(bladeRings({ ...spec, n }), {
          sharp: BLADE_SHARP(4),
          faceColor: finColor(PAL.finFace),
          uv: (i, j, p) => [p[2] / 14, p[1] / 14],
        }),
        "hull",
        { lod, keepColor: true },
      );
      // base fairing: a thicker, longer skirt blending the blade into the hull
      if (lod < 2) {
        const dir = Math.sign(spec.y1 - spec.y0);
        const h = key === "main" ? 34 : key === "fore" ? 22 : 30;
        const u = (y) => Math.min(1, Math.max(0, ((y - spec.y0) * dir) / h));
        add(
          loftRings(
            bladeRings({
              y0: spec.y0,
              y1: spec.y0 + h * dir,
              n: lod === 0 ? 5 : 3,
              zLead: (y) => spec.zLead(y) - 14 * (1 - u(y)),
              zTrail: (y) => spec.zTrail(y) + 12 * (1 - u(y)),
              halfT: (y) =>
                spec.halfT(y) + (key === "main" ? 12 : 7) * (1 - u(y)) + 0.4,
              chord: [0.1, 0.3, 0.6, 0.85],
              thick: (f) =>
                f < 0.1 ? 0.6 + 4 * f : f > 0.8 ? 1 - (f - 0.8) * 2 : 1,
            }),
            {
              sharp: BLADE_SHARP(4),
              faceColor: finColor(PAL.dorsal),
              uv: (i, j, p) => [p[2] / 12, p[1] / 12],
            },
          ),
          "hull",
          { lod, keepColor: true },
        );
      }
      if (lod === 2 && key !== "main") continue;
      // rust-brown leading and trailing edge sleeves (paint)
      for (const edge of ["lead", "trail"]) {
        const lead = edge === "lead";
        const sleeve = bladeRings({
          ...spec,
          n: Math.max(3, n - 3),
          zLead: lead
            ? (y) => spec.zLead(y) - 0.35
            : (y) => spec.zTrail(y) - 4.5,
          zTrail: lead
            ? (y) => spec.zLead(y) + 4.5
            : (y) => spec.zTrail(y) + 0.35,
          halfT: (y) => spec.halfT(y) * (lead ? 0.62 : 0.55) + 0.3,
          chord: [0.5],
          thick: () => 1,
        });
        add(
          loftRings(sleeve, {
            sharp: new Set([0, 2]),
            faceColor: () => rgb(PAL.rust),
          }),
          "paint",
          { lod, keepColor: true },
        );
      }
    }
    // bridge pod (bulbous, overhanging forward) and the small pods on the other fins
    const podColor = finColor(PAL.flank);
    add(
      loftRings(
        podRings({
          ...POD,
          nZ: lod === 0 ? 14 : lod === 1 ? 8 : 5,
          nP: lod === 0 ? 20 : lod === 1 ? 12 : 8,
        }),
        {
          faceColor: podColor,
          uv: (i, j, p, arc) => [p[2] / 8, arc / 8],
        },
      ),
      "hull",
      { lod, keepColor: true },
    );
    if (lod < 2) {
      for (const p of [
        { cx: 0, cy: 142, z0: 92, z1: 140, rx: 6.5, ry: 5.5 },
        { cx: 0, cy: -184, z0: 312, z1: 372, rx: 7, ry: 5.5 },
      ])
        add(
          loftRings(
            podRings({
              ...p,
              nZ: lod === 0 ? 8 : 5,
              nP: lod === 0 ? 12 : 8,
              frontPow: 2.2,
              backPow: 1.6,
            }),
            { faceColor: podColor, texel: 1 / 6 },
          ),
          "hull",
          { lod, keepColor: true },
        );
    }
  }
}

// ---------------------------------------------------------------------------
// hangar slots along both flanks: light strips, bay dividers, lit interiors / closed doors, haze
// ---------------------------------------------------------------------------
function buildHangars({ add }) {
  const { z0, z1, depth } = HULL.hangar;
  const st = (z) => stationAt(z, { hangar: false });
  const wallX = (z) => st(z).w - depth;
  const slotTop = (z) => {
    const s = st(z);
    return s.yWide + (s.yTop - s.yWide) * 0.12;
  };
  const slotBot = (z) => {
    const s = st(z);
    return s.yWide - (s.yWide - s.yBot) * 0.12;
  };
  const zList = (step) => {
    const zs = [];
    for (let z = z0 + 1; z < z1; z += step) zs.push(z);
    zs.push(z1 - 1);
    return zs;
  };
  // a box against the (slanted, in plan) inner wall: rotated to follow the local wall angle
  const wallBox = (side, zc, xOff, yc, w, h, len) => {
    const slope = (wallX(zc + 1) - wallX(zc - 1)) / 2;
    const g = box(0, 0, 0, w, h, len);
    g.rotateY(side * Math.atan(slope));
    g.translate(side * (wallX(zc) + xOff), yc, zc);
    return g;
  };
  for (const side of [-1, 1]) {
    for (const lod of [0, 1]) {
      const zs = zList(lod === 0 ? 24 : 60);
      // light strip under the top lip along the inner wall
      add(
        barAlong(
          zs,
          (z) => [side * (wallX(z) + 0.9), slotTop(z) - 1.2],
          1.4,
          0.9,
          { color: rgb(PAL.hangarLight, 1.6) },
        ),
        "windows",
        { lod, keepColor: true },
      );
      // deck edge lights along the lower shelf
      add(
        barAlong(
          zs,
          (z) => [side * (st(z).w - 2.2), slotBot(z) + 0.4],
          1.2,
          0.6,
          { color: rgb(PAL.hangarLight, 0.9) },
        ),
        "windows",
        { lod, keepColor: true },
      );
      // faint additive haze filling the slot mouth
      add(
        barAlong(
          [z0 + 2, (z0 + z1) / 2, z1 - 2],
          (z) => [
            side * (wallX(z) + depth * 0.45),
            (slotTop(z) + slotBot(z)) / 2,
          ],
          depth * 0.8,
          slotTop(z0) - slotBot(z0) - 2,
          { color: rgb(0x1c3a66, 0.9), caps: false },
        ),
        "plumeAdd",
        { lod, keepColor: true },
      );
    }
    // bays every 36 m: lit interiors (colour gradient) or closed blast doors, dividers and clutter
    const bayLen = 36;
    let k = 0;
    for (let z = z0 + 6; z + bayLen <= z1 - 4; z += bayLen, k++) {
      const zc = z + bayLen / 2;
      const yc = (slotTop(zc) + slotBot(zc)) / 2;
      const h = slotTop(zc) - slotBot(zc);
      const open = hash(k, side + 2, 31) > 0.3;
      for (const lod of [0, 1]) {
        if (open) {
          const g = wallBox(
            side,
            zc,
            0.5,
            yc + h * 0.05,
            0.6,
            h * 0.66,
            bayLen - 7,
          ).toNonIndexed();
          add(
            colorize(g, (x, y) =>
              rgb(
                PAL.hangarDim,
                1.0 + smoothstep(yc - h * 0.3, yc + h * 0.3, y) * 0.9,
              ),
            ),
            "windows",
            { lod, keepColor: true },
          );
        } else if (lod === 0) {
          add(wallBox(side, zc, 1.6, yc, 1.4, h * 0.78, bayLen - 7), "dark", {
            color: PAL.darkLit,
            texel: 1 / 5,
            lod,
          });
          add(wallBox(side, zc, 2.4, yc, 0.3, 0.5, bayLen - 9), "windows", {
            color: 0xffb070,
            lod,
            uv: "keep",
          });
        }
      }
      // divider pillar at the bay start; ceiling machinery and deck clutter inside open bays
      add(wallBox(side, z, 2.2, yc, 4.2, h * 0.94, 2.8), "dark", {
        color: PAL.darkLit,
        texel: 1 / 4,
        lod: 0,
      });
      // open bays: a lowered door leaf hinged at the lower lip, swung 55 degrees down and out
      if (open && hash(k, side + 5, 37) < 0.6) {
        const s = st(zc);
        const leaf = box(0, -h * 0.28, 0, 0.8, h * 0.56, bayLen - 10);
        leaf.rotateZ(side * 0.96);
        leaf.rotateY(side * Math.atan((wallX(zc + 1) - wallX(zc - 1)) / 2));
        leaf.translate(side * (s.w * 0.985 + 0.3), slotBot(zc) - 0.6, zc);
        add(leaf, "hull", { color: PAL.flank, texel: 1 / 6, lod: 0 });
      }
      if (open) {
        add(
          wallBox(side, zc, 4.5, slotTop(zc) - 2.0, 8, 1.6, bayLen - 12),
          "dark",
          { color: PAL.dark, texel: 1 / 3, lod: 0 },
        );
        add(wallBox(side, zc - 6, 5, slotBot(zc) + 1.2, 6, 2.4, 9), "dark", {
          color: PAL.darkLit,
          texel: 1 / 3,
          lod: 0,
        });
      }
    }
    // LOD 2: one glowing bar reads as the lit hangar strip from afar
    add(
      barAlong(
        [z0 + 4, (z0 + z1) / 2, z1 - 4],
        (z) => [side * (st(z).w - 1.0), (slotTop(z) + slotBot(z)) / 2 + 2],
        1.2,
        3.5,
        { color: rgb(PAL.hangarLight, 1.1) },
      ),
      "windows",
      { lod: 2, keepColor: true },
    );
  }
}
