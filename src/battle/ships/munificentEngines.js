// Engine nozzles and weathering strips for the Separatist Munificent and Recusant. The framework
// (enginePlumes.js) draws the plume and the nozzle glow disc for every `engines[]` entry, so the hull
// only carries the physical nozzle: a bell with 20–30 m of depth whose interior is an unlit vertex-colour
// gradient (dark blue steel at the mouth, blue-white at the throat, bloom in the core), a rim ring with
// a glow-spill tint, a spill disc on the stern plate, and soot streaks on the hull forward of the mouth.
import * as THREE from "three";
import {
  col,
  discAt,
  flipFaces,
  loftZ,
  mix,
  ringZ,
  smoothstep,
  superellipse,
  surfaceStrip,
  tubeZ,
} from "./munificentGeo.js";

const RIM_MOUTH = col(0x0a1220);
const RIM_INNER = col(0x1d3a70);
const MID = col(0x4d80c8);
const HOT = col(0xb8d8ff);
const CORE = new THREE.Color(1.7, 1.85, 2.0);

// interior gradient by depth fraction t (0 mouth .. 1 throat)
export function bellGradient(t, out) {
  if (t < 0.3) return mix(RIM_MOUTH, RIM_INNER, t / 0.3, out);
  if (t < 0.65) return mix(RIM_INNER, MID, (t - 0.3) / 0.35, out);
  if (t < 0.88) return mix(MID, HOT, (t - 0.65) / 0.23, out);
  return mix(HOT, CORE, (t - 0.88) / 0.12, out);
}

/**
 * One nozzle. add(geo, mat, opts) is the model's part adder. Mouth centre (x, y, zMouth) facing +z,
 * mouth radius r, bell depth (into the hull), protrude = how far the bell stands out of the stern plate.
 * shell / shellDark are the outer bell tints. Returns the engines[] entry.
 */
export function nozzleBell(
  add,
  { x, y, zMouth, r, depth = 26, protrude = 7, lod = 0, shell, shellDark, seg },
) {
  const n = seg || (lod === 0 ? 18 : lod === 1 ? 12 : 8);
  const prof = superellipse(n, 2);
  // outer bell: a near-cylindrical body from the stern wall, then a flared lip over the last 35 % so
  // the bell reads as a bell (not a disc on a plate); sooty toward the lip
  const flare = Math.min(protrude * 0.35, r * 0.6);
  const body = protrude - flare;
  const shellTint = (px, py, pz, o) =>
    mix(shell, shellDark, smoothstep(zMouth - protrude, zMouth, pz), o);
  if (body > 0.5)
    add(
      tubeZ(r + 1.3, r + 0.9, body, n, x, y, zMouth - flare - body / 2, true),
      "dark",
      { texel: 1 / 4, lod, tint: shellTint },
    );
  add(
    tubeZ(
      r + 2.2 + r * 0.06,
      r + 1.3,
      flare,
      n,
      x,
      y,
      zMouth - flare / 2,
      true,
    ),
    "dark",
    { texel: 1 / 4, lod, tint: shellTint },
  );
  // cooling bands around the body (LOD 0)
  if (lod === 0 && body > 8)
    for (const f of [0.3, 0.68]) {
      const zb = zMouth - flare - body * (1 - f);
      add(
        tubeZ(r + 1.9, r + 1.9, Math.min(2.2, body * 0.12), n, x, y, zb, true),
        "dark",
        { texel: 1 / 4, lod, tint: (px, py, pz, o) => o.copy(shellDark) },
      );
    }
  // interior: lit gradient shell seen from behind
  const st =
    lod === 2
      ? [0, 0.45, 1]
      : lod === 1
        ? [0, 0.25, 0.55, 0.8, 1]
        : [0, 0.12, 0.28, 0.45, 0.62, 0.78, 0.9, 1];
  const radiusAt = (t) => r * (1 - 0.72 * t ** 0.8);
  add(
    flipFaces(
      loftZ(
        prof,
        st.map((t) => ({
          z: zMouth - t * depth,
          sx: radiusAt(t),
          sy: radiusAt(t),
        })),
        { capStart: true },
      ),
    ),
    "engineGlow",
    {
      lod,
      uv: "keep",
      tint: (px, py, pz, o) => bellGradient((zMouth - pz) / depth, o),
    },
  );
  // rim lip: annulus between the bell interior and the outer shell, tinted with glow spill
  if (lod < 2) {
    const ro = r + 2.2 + r * 0.06;
    const outer = prof.map(([u, v]) => [x + u * ro, y + v * ro]);
    const inner = prof.map(([u, v]) => [x + u * (r + 0.1), y + v * (r + 0.1)]);
    add(ringZ(outer, inner, zMouth - 1.2, zMouth), "dark", {
      texel: 1 / 3,
      lod,
      tint: (px, py, pz, o) => mix(shell, MID, 0.38, o),
    });
  }
  // glow disc / plume radius for the framework: the disc reads out to ~0.8 x this and the plume flares
  // to 1.3 x, so 0.7 x the mouth keeps the glow inside the bell with the rim and lip visible around it
  return { pos: [x, y, zMouth], r: +(r * 0.7).toFixed(1) };
}

/**
 * Glow spill onto the stern plate around a nozzle: a disc slightly proud of the plate at zPlate whose
 * tint blends from a blue-lit centre to the plate colour at the edge.
 */
export function sternSpill(add, { x, y, zPlate, r, plate, lod = 0 }) {
  add(discAt([x, y, zPlate], [0, 0, 1], r, lod === 0 ? 16 : 10, 0.25), "dark", {
    texel: 1 / 4,
    lod,
    tint: (px, py, pz, o, across) =>
      mix(plate, MID, 0.42 * (1 - across) ** 1.4, o),
  });
}

/**
 * Soot streak hugging a surface: points/normals along the streak; `base(x, y, z, out)` writes the
 * hull tint under the streak; strength(i) in [0, 1] scales the soot along the strip; the soot fades
 * to the base tint at the strip edges so the plating shows no seam.
 */
export function sootStreak(
  add,
  {
    points,
    normals,
    halfW,
    base,
    soot,
    strength,
    lod = 0,
    texel = 1 / 12,
    lift = 0.35,
    mat = "hull",
  },
) {
  const g = surfaceStrip(points, normals, halfW, lift, 5);
  // the strip is non-indexed after construction, so the row index is recovered from the nearest point
  const strengthAt = (x, y, z) => {
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const d = (p[0] - x) ** 2 + (p[1] - y) ** 2 + (p[2] - z) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return strength(best);
  };
  add(g, mat, {
    texel,
    lod,
    tint: (x, y, z, o, across) => {
      base(x, y, z, o);
      const k = strengthAt(x, y, z) * (1 - across * across) ** 1.6;
      o.lerp(soot, k);
    },
  });
}
