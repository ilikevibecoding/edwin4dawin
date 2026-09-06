// Detail pass for the Providence-class model: the stern engine array (seven bells with a lit liner
// gradient baked into vertex colours; plumes and glow discs come from the shared engine-plume system),
// the plating framework at the large scale (raised transverse seams, longitudinal rails), the painted
// markings (dark slate rectangles, yellow hazard patches), greebles (hatch rows, plates, secondary bay
// doors, domes, masts, dishes, the bow sensor tip), window rows and weathering (scorch rings, soot
// streaks). Everything sits on the hull surface via hullFrame() / surfaceAtY().
import * as THREE from "three";
import { box, cylY, cylZ } from "./shipKit.js";
import {
  HULL,
  fromRef,
  halfProfile,
  hash,
  hullFrame,
  lerp,
  loftRings,
  placeOn,
  rgb,
  ringCap,
  ringFromStation,
  ringSlab,
  rng,
  smoothstep,
  stationAt,
  toRef,
  tubeRings,
} from "./providenceGeo.js";
import {
  CHIN_GRILLE,
  ENGINES,
  HAZARD_MARKS,
  PAL,
  SEAMS,
  SLATE_MARKS,
  barAlong,
} from "./providenceSpec.js";
import { inCut } from "./providenceBays.js";

const FWD = new THREE.Vector3(0, 0, -1);

export function addDetails(ctx) {
  const engines = addEngines(ctx);
  addPlating(ctx);
  addMarkings(ctx);
  addGreebles(ctx);
  addWindows(ctx);
  addWeathering(ctx);
  return engines;
}

// outer surface point (x >= 0) and its outward normal (xy-plane) at height y on the station at z; the
// belt is treated as the vertical line x = w so decals never fall into the trough
export function surfaceAtY(z, yIn, side = 1) {
  const st = stationAt(z);
  const h = halfProfile(st);
  // clamp into the section so a mark that overruns the ridge or keel at a fine station never extrapolates
  const y = Math.min(st.yTop - 0.05, Math.max(st.yBot + 0.05, yIn));
  const outer = [
    h[0],
    h[1],
    h[2],
    h[3],
    h[4],
    h[5],
    h[6],
    h[11],
    h[12],
    h[13],
    h[14],
    h[15],
  ];
  let a = outer[0];
  let b = outer[1];
  for (let k = 0; k + 1 < outer.length; k++) {
    a = outer[k];
    b = outer[k + 1];
    if (y <= a[1] && y >= b[1]) break;
  }
  const t = a[1] === b[1] ? 0.5 : (a[1] - y) / (a[1] - b[1]);
  const x = lerp(a[0], b[0], t);
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  // outward normal of the profile segment (rotate the ridge->keel tangent by -90°)
  const n = new THREE.Vector3(-dy, dx, 0).normalize();
  if (n.x < 0) n.negate();
  if (dx === 0 && dy === 0) n.set(1, 0, 0);
  n.x *= side;
  return { p: new THREE.Vector3(side * x, y, z), n };
}

// conforming decal strip: a thin slab following the hull between heights y0..y1 over r0..r1
function decal(
  add,
  side,
  r0,
  r1,
  y0,
  y1,
  color,
  mat,
  lod,
  lift = 0.12,
  thick = 0.28,
) {
  const n = Math.max(2, Math.round((r1 - r0) / 8) + 1);
  const rings = [];
  for (let k = 0; k < n; k++) {
    const z = fromRef(lerp(r0, r1, k / (n - 1)));
    const a = surfaceAtY(z, y1, side);
    const b = surfaceAtY(z, y0, side);
    const a0 = a.p.clone().addScaledVector(a.n, lift);
    const b0 = b.p.clone().addScaledVector(b.n, lift);
    rings.push([
      a0.toArray(),
      b0.toArray(),
      b0.clone().addScaledVector(b.n, thick).toArray(),
      a0.clone().addScaledVector(a.n, thick).toArray(),
    ]);
  }
  add(
    loftRings(rings, {
      sharp: new Set([0, 1, 2, 3]),
      faceColor: () => color,
      texel: 1 / 8,
    }),
    mat,
    { lod, keepColor: true },
  );
}

// thin strip conforming to the hull along z on segment m at fraction t (side ±1)
function surfaceStrip(
  m,
  t,
  side,
  z0,
  z1,
  w,
  h,
  { lift = 0.05, step = 40 } = {},
) {
  const rings = [];
  const zs = [];
  for (let z = z0; z < z1; z += step) zs.push(z);
  zs.push(z1);
  for (const z of zs) {
    const f = hullFrame(z, m, t, side);
    const across = new THREE.Vector3().crossVectors(f.n, f.tz).normalize();
    const base = f.p.clone().addScaledVector(f.n, lift);
    const a = base.clone().addScaledVector(across, -w / 2);
    const b = base.clone().addScaledVector(across, w / 2);
    const c = b.clone().addScaledVector(f.n, h);
    const d = a.clone().addScaledVector(f.n, h);
    rings.push([a.toArray(), b.toArray(), c.toArray(), d.toArray()]);
  }
  return rings;
}

// ---------------------------------------------------------------------------
// engines: dark shroud with a flared lip and cooling bands, a lit liner (blue rim -> white throat) and a
// white core disc; `engines[]` carries the mouth position and exit radius for the plume system
// ---------------------------------------------------------------------------
function addEngines({ add }) {
  const engines = [];
  const zF = HULL.zFace;
  const LINER = [
    rgb(0x3a4a60, 0.9),
    rgb(PAL.engineGlow, 0.3),
    rgb(PAL.engineGlow, 0.7),
    rgb(0xc8e4ff, 1.05),
  ];
  ENGINES.forEach(([ex, ey, r, len], idx) => {
    const big = idx === 0;
    const z0 = zF - 3;
    const mouth = z0 + len;
    for (const lod of [0, 1, 2]) {
      if (lod === 2 && r < 7) continue;
      const seg = lod === 0 ? (big ? 28 : 18) : lod === 1 ? (big ? 16 : 10) : 8;
      add(
        loftRings(
          tubeRings(
            ex,
            ey,
            lod < 2
              ? [
                  [z0 - 1, r * 0.9],
                  [z0 + len * 0.3, r * 0.94],
                  [z0 + len * 0.62, r * 1.0],
                  [mouth - r * 0.25, r * 1.08],
                  [mouth, r * 1.15],
                  [mouth, r * 1.0],
                ]
              : [
                  [z0 - 1, r * 0.9],
                  [mouth, r * 1.12],
                ],
            seg,
          ),
          {
            sharpRings: new Set(lod < 2 ? [4, 5] : []),
            faceColor: (i, j, c) => rgb(0x4d525b, c[2] > mouth - 0.5 ? 0.7 : 1),
            texel: 1 / 6,
          },
        ),
        "dark",
        { lod, keepColor: true },
      );
      if (lod === 0)
        for (const f of [0.22, 0.52]) {
          const za = z0 + len * f;
          const rr = r * (0.93 + 0.07 * f);
          add(
            loftRings(
              tubeRings(
                ex,
                ey,
                [
                  [za - 1.1, rr],
                  [za - 0.9, rr * 1.09],
                  [za + 0.9, rr * 1.09],
                  [za + 1.1, rr],
                ],
                seg,
              ),
              {
                sharpRings: new Set([1, 2]),
                faceColor: () => rgb(0x3c4048),
                texel: 1 / 4,
              },
            ),
            "dark",
            { lod, keepColor: true },
          );
        }
      // lit liner (faces inward): from the lip down to the throat at the stern wall
      add(
        loftRings(
          tubeRings(
            ex,
            ey,
            lod < 2
              ? [
                  [mouth, r * 1.0],
                  [mouth - len * 0.22, r * 0.9],
                  [mouth - len * 0.55, r * 0.72],
                  [z0 + 2.5, r * 0.45],
                ]
              : [
                  [mouth, r * 1.0],
                  [z0 + 2.5, r * 0.45],
                ],
            seg,
          ),
          {
            invert: true,
            faceColor: (i) => (lod < 2 ? LINER[i] : LINER[i === 0 ? 0 : 3]),
          },
        ),
        "engineGlow",
        { lod, keepColor: true },
      );
      if (lod === 0) {
        const zl = mouth - len * 0.36;
        const rl = r * 0.82;
        add(
          loftRings(
            tubeRings(
              ex,
              ey,
              [
                [zl - 0.6, rl * 1.02],
                [zl - 0.6, rl * 0.94],
                [zl + 0.6, rl * 0.94],
                [zl + 0.6, rl * 1.02],
              ],
              seg,
            ),
            {
              invert: true,
              sharpRings: new Set([1, 2]),
              faceColor: () => rgb(0x2a3140),
            },
          ),
          "dark",
          { lod, keepColor: true },
        );
      }
      add(
        ringCap(tubeRings(ex, ey, [[z0 + 2.5, r * 0.45]], seg)[0], [0, 0, 1], {
          color: rgb(PAL.engineCore, 1.3),
        }),
        "engineGlow",
        { lod, keepColor: true },
      );
    }
    // glow disc / plume radius: 0.7 x the mouth keeps the shared glow inside the liner with the dark rim
    engines.push({
      pos: [ex, ey, +mouth.toFixed(1)],
      r: +(r * 0.7).toFixed(1),
    });
  });
  // stern face furniture: a raised rim around the face, vent grilles and manifolds between the bells
  const rim = (dz, k) => {
    const s = stationAt(zF - 0.5);
    return ringFromStation({
      ...s,
      z: zF + dz,
      w: s.w + k,
      yTop: s.yTop + k,
      yBot: s.yBot - k,
    });
  };
  for (const lod of [0, 1])
    add(
      loftRings([rim(-6, 0), rim(-5, 1.2), rim(0.5, 1.4), rim(1.5, 0.4)], {
        sharpRings: new Set([1, 2]),
        faceColor: () => rgb(PAL.dorsal, 0.7),
        texel: 1 / 8,
      }),
      "hull",
      { lod, keepColor: true },
    );
  const vent = (x, y, w, h) => {
    add(box(x, y, zF + 0.4, w + 1.2, h + 1.2, 0.8), "hull", {
      color: new THREE.Color(PAL.dorsal).multiplyScalar(0.8),
      texel: 1 / 8,
      lod: 0,
    });
    add(box(x, y, zF + 0.9, w, h, 0.5), "dark", {
      color: 0x22262c,
      texel: 1 / 4,
      lod: 0,
    });
    for (let yy = y - h / 2 + 1.2; yy < y + h / 2 - 0.6; yy += 1.8)
      add(box(x, yy, zF + 1.25, w - 0.6, 0.5, 0.3), "dark", {
        color: PAL.darkLit,
        texel: 1 / 3,
        lod: 0,
      });
  };
  // the gaps in the nozzle ring sit at ±30° / ±90° / ±150° around the centre drum (0, 6.5)
  vent(-15, 36, 4, 5);
  vent(15, 36, 4, 5);
  vent(-16, -23, 4, 4);
  vent(16, -23, 4, 4);
  for (const [x, y, w, h, d] of [
    [-32, 6.5, 4, 9, 6],
    [32, 6.5, 4, 9, 6],
  ])
    add(box(x, y, zF + d / 2 - 1, w, h, d), "dark", {
      color: PAL.darkLit,
      texel: 1 / 3,
      lod: 0,
    });
  for (const x of [-32, 32])
    add(cylY(0.9, 0.9, 13, 6).translate(x, 6.5, zF + 3), "dark", {
      color: 0x2e3238,
      texel: 1 / 2,
      lod: 0,
    });
  return engines;
}

// ---------------------------------------------------------------------------
// plating at the large scale: raised transverse seams and longitudinal rails on the big faces
// ---------------------------------------------------------------------------
function addPlating({ add }) {
  const ring = (zz, k) => {
    const s = stationAt(zz);
    return ringFromStation({
      ...s,
      w: s.w + k,
      yTop: s.yTop + k,
      yBot: s.yBot - k,
    });
  };
  for (const z of SEAMS) {
    // seams on the charcoal beak darken with it (the hull's beak tint is 0.3 forward of r ~285)
    const SEAM = rgb(
      PAL.dorsal,
      0.78 * lerp(0.25, 1, smoothstep(275, 310, toRef(z))),
    );
    add(
      loftRings(
        [
          ring(z - 1.7, 0.02),
          ring(z - 1.4, 0.5),
          ring(z + 1.4, 0.5),
          ring(z + 1.7, 0.02),
        ],
        {
          sharpRings: new Set([1, 2]),
          faceColor: () => SEAM,
          texel: 1 / 8,
        },
      ),
      "hull",
      { lod: 0, keepColor: true },
    );
    add(
      loftRings([ring(z - 1.6, 0.4), ring(z + 1.6, 0.4)], {
        faceColor: () => SEAM,
        texel: 1 / 8,
      }),
      "hull",
      { lod: 1, keepColor: true },
    );
  }
  // longitudinal rails on the shoulders and the belly (LOD 0)
  const RAIL = rgb(PAL.dorsal, 0.85);
  for (const side of [-1, 1])
    for (const [m, t, r0, r1] of [
      [2, 0.5, 300, 1000],
      [4, 0.3, 300, 1010],
      [13, 0.5, 340, 1000],
      [12, 0.7, 420, 1010],
    ])
      add(
        loftRings(
          surfaceStrip(m, t, side, fromRef(r0), fromRef(r1), 1.6, 0.5),
          {
            sharp: new Set([0, 1, 2, 3]),
            faceColor: () => RAIL,
            texel: 1 / 6,
          },
        ),
        "hull",
        { lod: 0, keepColor: true },
      );
}

// ---------------------------------------------------------------------------
// painted markings: dark slate rectangles on both flanks, yellow hazard patches near the bow, a dark
// slate band around the nose
// ---------------------------------------------------------------------------
function addMarkings({ add }) {
  const SLATE = rgb(PAL.slate, 1.1);
  const HAZ = rgb(PAL.hazard);
  for (const side of [-1, 1]) {
    for (const lod of [0, 1]) {
      for (const [r0, r1, y0, y1] of SLATE_MARKS)
        decal(add, side, r0, r1, y0, y1, SLATE, "paint", lod);
      for (const [r0, r1, y0, y1] of HAZARD_MARKS) {
        if (lod === 1) {
          decal(add, side, r0, r1, y0, y1, HAZ, "paint", lod);
          continue;
        }
        // the reference paints each hazard mark as a ladder of four thin vertical bars
        const pitch = (r1 - r0) / 4;
        for (let k = 0; k < 4; k++) {
          const a = r0 + k * pitch;
          decal(add, side, a, a + pitch * 0.55, y0, y1, HAZ, "paint", lod);
        }
      }
    }
    // hazard sill under the chin grille
    decal(
      add,
      side,
      CHIN_GRILLE.r0 - 4,
      CHIN_GRILLE.r1 + 4,
      CHIN_GRILLE.y0 - 3.5,
      CHIN_GRILLE.y0 - 1,
      HAZ,
      "paint",
      0,
    );
  }
}

// ---------------------------------------------------------------------------
// greebles
// ---------------------------------------------------------------------------
function addGreebles({ add, cuts }) {
  const rand = rng(4021);
  const st = (z) => stationAt(z);
  // raised plates on the shoulders (darker) and the belly (paler), aligned to the surface, clear of the bays
  const plate = (r, m, t, side, lz, lw, colorHex, tone) => {
    const z = fromRef(r);
    if (inCut(cuts, z, m, side, lz / 2 + 3)) return;
    const f = hullFrame(z, m, t, side);
    const g = box(0, 0.45, 0, lw, 0.9, lz);
    placeOn(g, f.p, f.n, FWD);
    // plates on the charcoal beak darken with it
    const beak = lerp(0.25, 1, smoothstep(275, 310, r));
    add(g, "hull", {
      color: new THREE.Color(colorHex).multiplyScalar(tone * beak),
      texel: 1 / 12,
      lod: 0,
    });
  };
  for (let i = 0; i < 26; i++) {
    const r = 170 + rand() * 850;
    const side = rand() < 0.5 ? -1 : 1;
    const m = rand() < 0.5 ? 2 : 3;
    plate(
      r,
      m,
      0.2 + rand() * 0.6,
      side,
      14 + rand() * 24,
      5 + rand() * 6,
      PAL.dorsal,
      0.78 + rand() * 0.35,
    );
  }
  for (let i = 0; i < 14; i++) {
    const r = 200 + rand() * 820;
    const m = rand() < 0.5 ? 12 : 13;
    plate(
      r,
      m,
      0.15 + rand() * 0.7,
      rand() < 0.5 ? -1 : 1,
      12 + rand() * 24,
      4 + rand() * 5,
      PAL.belly,
      0.85 + rand() * 0.3,
    );
  }
  // hatch rows: short rows of small dark hatches on the shoulders, the belt and the belly
  const hatchRow = (r, m, t, side, n, pitch) => {
    for (let k = 0; k < n; k++) {
      const z = fromRef(r + k * pitch);
      if (inCut(cuts, z, m, side, 3)) continue;
      const f = hullFrame(z, m, t, side);
      const g = box(0, 0.3, 0, 2.2, 0.6, 2.2);
      placeOn(g, f.p, f.n, FWD);
      add(g, "dark", { color: 0x2e3238, texel: 1 / 2, lod: 0 });
    }
  };
  for (let i = 0; i < 12; i++)
    hatchRow(
      120 + rand() * 880,
      rand() < 0.5 ? 2 : 3,
      0.15 + rand() * 0.6,
      rand() < 0.5 ? -1 : 1,
      3 + Math.floor(rand() * 5),
      4.4,
    );
  for (let i = 0; i < 8; i++)
    hatchRow(
      180 + rand() * 800,
      13,
      0.2 + rand() * 0.5,
      rand() < 0.5 ? -1 : 1,
      3 + Math.floor(rand() * 4),
      4.4,
    );
  // closed secondary bay doors along the belt forward of the trough, with a lit sliver
  for (const side of [-1, 1])
    for (let i = 0; i < 5; i++) {
      const z = fromRef(380 + i * 44);
      const f = hullFrame(z, 8, 0.5, side);
      const g = box(0, 0.35, 0, 9, 0.7, 12);
      placeOn(g, f.p, f.n, FWD);
      add(g, "dark", { color: PAL.darkLit, texel: 1 / 4, lod: 0 });
      const w = box(0, 0.8, -4.2, 8, 0.2, 0.4);
      placeOn(w, f.p, f.n, FWD);
      add(w, "windows", { color: 0xffb070, lod: 0, uv: "keep" });
    }
  // sensor domes on the hull
  const dome = (p, r, mat, colorHex, lods = [0]) => {
    for (const lod of lods) {
      const seg = lod === 0 ? 12 : 8;
      add(
        new THREE.SphereGeometry(r, seg, Math.ceil(seg * 0.6)).translate(
          p.x,
          p.y,
          p.z,
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
  dome(
    new THREE.Vector3(0, st(fromRef(126)).yTop + 0.5, fromRef(126)),
    2.6,
    "hull",
    PAL.belly,
  );
  for (const side of [-1, 1]) {
    const f = hullFrame(fromRef(1015), 2, 0.5, side);
    dome(f.p.clone().addScaledVector(f.n, -1), 3.5, "hull", PAL.belly);
  }
  dome(
    new THREE.Vector3(0, st(fromRef(1025)).yTop + 0.5, fromRef(1025)),
    4.5,
    "hull",
    PAL.belly,
    [0, 1],
  );
  // small masts on the forward ridge and the aft deck
  const mast = (x, y, z, h, r = 0.45, lod = 0) =>
    add(cylY(r * 0.7, r, h, 5).translate(x, y + h / 2, z), "dark", {
      color: 0x3a3e46,
      texel: 1 / 2,
      lod,
    });
  mast(0, st(fromRef(140)).yTop, fromRef(140), 16, 0.45);
  mast(-6, st(fromRef(112)).yTop - 1, fromRef(112), 10, 0.4);
  for (const side of [-1, 1])
    mast(side * 9, st(fromRef(1018)).yTop - 1, fromRef(1018), 14, 0.45);
  // dishes: thin discs on short stalks
  const dish = (p, r, tilt) => {
    const g = cylY(r, r * 0.35, 1.2, 12);
    g.rotateX(-tilt);
    g.translate(p.x, p.y, p.z);
    add(g, "dark", { color: 0x50555e, texel: 1 / 3, lod: 0 });
    add(cylY(0.5, 0.7, 5, 5).translate(p.x, p.y - 2.5, p.z), "dark", {
      color: 0x3a3e46,
      texel: 1 / 2,
      lod: 0,
    });
  };
  dish(
    new THREE.Vector3(0, st(fromRef(1035)).yTop + 4.5, fromRef(1035)),
    4.5,
    -1.1,
  );
  const fA = hullFrame(fromRef(180), 1, 0.5, -1);
  dish(fA.p.clone().addScaledVector(fA.n, 4), 3, 0.8);
  // bow sensor tip: dark cone with a dished end
  for (const lod of [0, 1])
    add(cylZ(0.5, 2.6, 26, 8).translate(0, -0.6, HULL.zBow + 12), "dark", {
      color: 0x3a3e46,
      texel: 1 / 4,
      lod,
    });
}

// window rows along the flanks (scale cues); LOD 0 only, with LOD-1 bars for the long aft rows
function addWindows({ add, cuts }) {
  const win = (f, color, w = 1.5) => {
    const g = box(0, 0.25, 0, w, 0.5, 1.0);
    placeOn(g, f.p, f.n, FWD);
    add(g, "windows", { color, lod: 0, uv: "keep" });
  };
  for (const side of [-1, 1]) {
    // upper row just under the ridge edge, aft half
    for (let r = 600; r <= 1000; r += 6) {
      if (hash(r, side + 3, 51) < 0.28) continue;
      win(hullFrame(fromRef(r), 1, 0.55, side), PAL.windowWarm);
    }
    // shoulder row at ~+20 above the trough
    for (let r = 600; r <= 880; r += 7) {
      if (hash(r, side + 5, 52) < 0.35) continue;
      win(hullFrame(fromRef(r), 5, 0.45, side), PAL.windowWarm);
    }
    // belt row (mid flank) along the forward half
    for (let r = 200; r <= 596; r += 5) {
      const z = fromRef(r);
      if (hash(r, side + 7, 53) < 0.3 || inCut(cuts, z, 8, side, 6)) continue;
      win(hullFrame(z, 8, 0.25, side), PAL.windowWarm, 1.2);
    }
    // lower row near the bottom of the aft half of the forward body
    for (let r = 430; r <= 600; r += 8) {
      if (hash(r, side + 9, 54) < 0.3) continue;
      win(hullFrame(fromRef(r), 13, 0.56, side), PAL.windowCool, 1.2);
    }
    // LOD 1 bars for the two long rows
    for (const [m, t, r0, r1, color] of [
      [1, 0.55, 600, 1000, PAL.windowWarm],
      [8, 0.25, 200, 596, PAL.windowWarm],
    ]) {
      const zs = [];
      for (let r = r0; r <= r1; r += 60) zs.push(fromRef(r));
      add(
        barAlong(
          zs,
          (z) => {
            const f = hullFrame(z, m, t, side);
            return [f.p.x + f.n.x * 0.2, f.p.y + f.n.y * 0.2];
          },
          0.4,
          0.4,
          { color: rgb(color, 0.8) },
        ),
        "windows",
        { lod: 1, keepColor: true },
      );
    }
  }
}

// ---------------------------------------------------------------------------
// weathering decals: scorch rings around a few fixed points (dark ring + ash core) and long soot
// streaks running forward from the stern
// ---------------------------------------------------------------------------
function addWeathering({ add, cuts }) {
  const SCORCH = [
    [330, 2, 0.5, 1, 7],
    [560, 3, 0.3, -1, 9],
    [820, 13, 0.5, 1, 6],
    [480, 12, 0.6, -1, 5.5],
    [960, 3, 0.6, -1, 8],
  ];
  for (const [r, m, t, side, rad] of SCORCH) {
    const f = hullFrame(fromRef(r), m, t, side);
    const ring = ringSlab(rad, rad * 0.55, 18, 0.2, 0, {
      color: rgb(0x1a1614),
    });
    placeOn(ring, f.p.clone().addScaledVector(f.n, 0.04), f.n, FWD);
    add(ring, "paint", { lod: 0, keepColor: true });
    const ash = ringSlab(rad * 0.55, rad * 0.15, 12, 0.2, 0, {
      color: rgb(0x55514c),
    });
    placeOn(ash, f.p.clone().addScaledVector(f.n, 0.04), f.n, FWD);
    add(ash, "paint", { lod: 0, keepColor: true });
  }
  const rand = rng(913);
  const SOOT = rgb(PAL.soot);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const m = i < 5 ? 2 : i < 7 ? 3 : 13;
      const t = 0.1 + rand() * 0.8;
      const z1 = fromRef(1000 + rand() * 30);
      const z0 = z1 - 60 - rand() * 90;
      if (inCut(cuts, (z0 + z1) / 2, m, side, (z1 - z0) / 2)) continue;
      add(
        loftRings(
          surfaceStrip(m, t, side, z0, z1, 1.4 + rand() * 1.8, 0.18, {
            lift: 0.08,
            step: 30,
          }),
          {
            sharp: new Set([0, 1, 2, 3]),
            faceColor: (ii, j, c) =>
              SOOT.map((v) => v * (0.75 + (0.5 * (c[2] - z0)) / (z1 - z0))),
          },
        ),
        "paint",
        { lod: 0, keepColor: true },
      );
    }
  }
}
