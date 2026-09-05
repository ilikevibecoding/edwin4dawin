// Detail pass for the Providence-class model: the stern engine cluster (nozzle bells with a lit interior
// gradient baked into vertex colours; plumes and glow discs come from the shared engine-plume system),
// the plating framework at the large scale (raised transverse seams framing 40-60 m plates, longitudinal
// rails, raised plate groups on the dorsal ridge), greebles (hatch rows, plates, bay doors, domes, masts,
// dishes, window rows) and weathering (scorch rings, soot streak decals). Everything sits on the analytic
// hull surface via hullFrame().
import * as THREE from "three";
import { box, cylY, cylZ } from "./shipKit.js";
import {
  HULL,
  hash,
  hullFrame,
  loftRings,
  placeOn,
  rgb,
  ringCap,
  ringFromStation,
  ringSlab,
  rng,
  stationAt,
  tubeRings,
} from "./providenceGeo.js";
import { PAL, RIDGE_SLABS, SEAMS, barAlong } from "./providenceSpec.js";
import { inCut } from "./providenceBays.js";

const FWD = new THREE.Vector3(0, 0, -1);

export function addDetails(ctx) {
  const engines = addEngines(ctx);
  addPlating(ctx);
  addGreebles(ctx);
  addWindows(ctx);
  addWeathering(ctx);
  return engines;
}

// thin strip conforming to the hull along z on segment m at fraction t (side ±1): rings are rectangles in
// the local surface frame, `lift` above the surface, `h` thick, `w` wide across the surface
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
  const zS = HULL.zStern;
  const layout = [
    [-46, -12, 19, 0],
    [0, -12, 19, 0],
    [46, -12, 19, 0],
    [-24, 26, 11, 1],
    [24, 26, 11, 1],
    [-30, -46, 11, 1],
    [30, -46, 11, 1],
    [-74, 0, 7.5, 2],
    [74, 0, 7.5, 2],
  ];
  // liner gradient rim -> throat: dark blue-grey at the lip, dim blue, brighter blue, white throat
  const LINER = [
    rgb(0x3a4a60, 0.9),
    rgb(PAL.engineGlow, 0.3),
    rgb(PAL.engineGlow, 0.7),
    rgb(0xc8e4ff, 1.05),
  ];
  for (const [ex, ey, r, tier] of layout) {
    // bells stand 1.8 r proud of the stern wall and flare at the mouth; the liner recedes from the lip to
    // a throat at the wall, so the bell has real depth around the (smaller) shared glow disc
    const len = r * 1.8;
    const z0 = zS - 3;
    const mouth = z0 + len;
    for (const lod of [0, 1, 2]) {
      if (lod === 2 && tier === 2) continue;
      const seg = lod === 0 ? 20 : lod === 1 ? 12 : 8;
      // outer shroud: slight waist, flared lip
      add(
        loftRings(
          tubeRings(
            ex,
            ey,
            lod < 2
              ? [
                  [z0 - 1, r * 0.94],
                  [z0 + len * 0.3, r * 0.96],
                  [z0 + len * 0.62, r * 1.0],
                  [mouth - r * 0.25, r * 1.08],
                  [mouth, r * 1.15],
                  [mouth, r * 1.0],
                ]
              : [
                  [z0 - 1, r * 0.94],
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
        for (const f of [0.2, 0.5]) {
          const za = z0 + len * f;
          const rr = r * (0.95 + 0.06 * f);
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
      // lit liner (faces inward): from the lip down to the throat at the stern wall (a plain cone at
      // LOD 2, where the tri budget is tight)
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
      // stiffening ledge inside the liner (LOD 0)
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
    // glow disc / plume radius: the shared disc reads out to ~0.8 x this and the plume flares to 1.3 x,
    // so 0.7 x the mouth keeps the glow inside the liner with the dark rim and lip visible around it
    engines.push({
      pos: [ex, ey, +mouth.toFixed(1)],
      r: +(r * 0.7).toFixed(1),
    });
  }
  // stern wall furniture: vent grilles and hatches between the bells (LOD 0), two tall louvred vents
  // beside the outer bells (LOD 0/1)
  const vent = (x, y, w, h, lod = 0) => {
    add(box(x, y, zS + 0.4, w + 1.2, h + 1.2, 0.8), "hull", {
      color: new THREE.Color(PAL.dorsal).multiplyScalar(0.8),
      texel: 1 / 8,
      lod,
    });
    add(box(x, y, zS + 0.9, w, h, 0.5), "dark", {
      color: 0x22262c,
      texel: 1 / 4,
      lod,
    });
    if (lod === 0)
      for (let yy = y - h / 2 + 1.2; yy < y + h / 2 - 0.6; yy += 1.8)
        add(box(x, yy, zS + 1.25, w - 0.6, 0.5, 0.3), "dark", {
          color: PAL.darkLit,
          texel: 1 / 3,
          lod,
        });
  };
  for (const lod of [0, 1]) {
    vent(-66, -20, 8, 16, lod);
    vent(66, -20, 8, 16, lod);
  }
  vent(0, 42, 20, 6);
  for (const [x, y] of [
    [-64, -34],
    [64, -34],
    [-10, -62],
    [10, -62],
    [-46, 14],
    [46, 14],
  ])
    add(box(x, y, zS + 0.6, 3.2, 3.2, 1.2), "dark", {
      color: 0x2e3238,
      texel: 1 / 2,
      lod: 0,
    });
  // stern machinery between the nozzles: pump housings, manifolds, vertical fuel pipes, a raised rim
  for (const [x, y, w, h, d] of [
    [-23, -14, 7, 10, 9],
    [23, -14, 7, 10, 9],
    [0, 10, 26, 5, 7],
    [0, -36, 22, 5, 6],
    [-56, 12, 9, 7, 6],
    [56, 12, 9, 7, 6],
    [-50, -38, 8, 6, 6],
    [50, -38, 8, 6, 6],
  ])
    add(box(x, y, zS + d / 2 - 1, w, h, d), "dark", {
      color: PAL.darkLit,
      texel: 1 / 3,
      lod: 0,
    });
  for (const x of [-23, 23])
    add(cylY(1.2, 1.2, 30, 6).translate(x, -12, zS + 4), "dark", {
      color: 0x2e3238,
      texel: 1 / 2,
      lod: 0,
    });
  const rim = (dz, k) => {
    const s = stationAt(zS + dz);
    return ringFromStation({
      ...s,
      z: zS + dz,
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
  return engines;
}

// ---------------------------------------------------------------------------
// plating at the large scale: raised transverse seams (40-60 m plates), longitudinal rails on the big
// faces, raised plate groups straddling the dorsal ridge
// ---------------------------------------------------------------------------
function addPlating({ add }) {
  const st = (z) => stationAt(z);
  const ring = (zz, k) => {
    const s = st(zz);
    return ringFromStation({
      ...s,
      w: s.w + k,
      yTop: s.yTop + k,
      yBot: s.yBot - k,
    });
  };
  const SEAM = rgb(PAL.dorsal, 0.78);
  for (const z of SEAMS) {
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
  // longitudinal rails on the upper flanks and the belly (LOD 0)
  const RAIL = rgb(PAL.dorsal, 0.85);
  for (const side of [-1, 1])
    for (const [m, t, z0, z1] of [
      [2, 0.25, -470, 520],
      [3, 0.75, -420, 530],
      [10, 0.5, -400, 500],
      [8, 0.2, -300, 510],
    ])
      add(
        loftRings(surfaceStrip(m, t, side, z0, z1, 1.6, 0.5), {
          sharp: new Set([0, 1, 2, 3]),
          faceColor: () => RAIL,
          texel: 1 / 6,
        }),
        "hull",
        { lod: 0, keepColor: true },
      );
  // raised plate groups straddling the dorsal ridge: low chamfered slabs with a darker top
  for (const [zc, len] of RIDGE_SLABS) {
    const s = st(zc);
    const w = s.wTop * 1.7;
    const y = s.yTop;
    const slab = (dz, dw, dy) => [
      [-w / 2 + dw, y + dy, zc - len / 2 + dz],
      [w / 2 - dw, y + dy, zc - len / 2 + dz],
      [w / 2 - dw, y + dy, zc + len / 2 - dz],
      [-w / 2 + dw, y + dy, zc + len / 2 - dz],
    ];
    for (const lod of [0, 1]) {
      add(
        loftRings([slab(0, 0, -0.6), slab(1.6, 1.6, 1.3)], {
          sharp: new Set([0, 1, 2, 3]),
          faceColor: () => rgb(PAL.dorsal, 0.9),
          texel: 1 / 8,
        }),
        "hull",
        { lod, keepColor: true },
      );
      add(
        ringCap(slab(1.6, 1.6, 1.3), [0, 1, 0], {
          color: rgb(PAL.dorsal, 0.82),
          texel: 1 / 10,
        }),
        "hull",
        { lod, keepColor: true },
      );
    }
    if (len > 30)
      for (const x of [-w * 0.3, w * 0.3])
        add(box(x, y + 1.9, zc, 3, 1.2, len * 0.5), "dark", {
          color: PAL.darkLit,
          texel: 1 / 3,
          lod: 0,
        });
  }
}

// ---------------------------------------------------------------------------
// greebles
// ---------------------------------------------------------------------------
function addGreebles({ add, cuts }) {
  const rand = rng(4021);
  const st = (z) => stationAt(z);
  // dark-blue painted bands near the bow (colour accents, LOD 0/1)
  for (const [z, w] of [
    [-486, 7],
    [-402, 9],
    [-236, 5],
  ]) {
    const mk = (zz) => {
      const s = st(zz);
      return ringFromStation({
        ...s,
        w: s.w + 0.25,
        yTop: s.yTop + 0.25,
        yBot: s.yBot - 0.25,
      });
    };
    for (const lod of [0, 1])
      add(
        loftRings([mk(z - w / 2), mk(z + w / 2)], {
          faceColor: () => rgb(PAL.insignia, 1.1),
        }),
        "paint",
        { lod, keepColor: true },
      );
  }
  // ridge-edge rails
  for (const side of [-1, 1]) {
    const zs = [];
    for (let z = -430; z <= 520; z += 34) zs.push(z);
    add(
      barAlong(
        zs,
        (z) => [
          side * (st(z).wTop - 0.4),
          st(z).yTop - (st(z).yTop - st(z).yWide) * 0.02 + 0.3,
        ],
        1.3,
        0.7,
        { color: rgb(0x33373e), texel: 1 / 5 },
      ),
      "dark",
      { lod: 0, keepColor: true },
    );
  }
  // raised plates: upper flanks (darker), belly (paler); aligned to the local surface, clear of the cuts
  const plate = (z, m, t, side, lz, lw, colorHex, tone) => {
    if (inCut(cuts, z, m, side, lz / 2 + 3)) return;
    const f = hullFrame(z, m, t, side);
    const g = box(0, 0.45, 0, lw, 0.9, lz);
    placeOn(g, f.p, f.n, FWD);
    add(g, "hull", {
      color: new THREE.Color(colorHex).multiplyScalar(tone),
      texel: 1 / 12,
      lod: 0,
    });
  };
  for (let i = 0; i < 26; i++) {
    const z = -470 + rand() * 990;
    const side = rand() < 0.5 ? -1 : 1;
    const m = rand() < 0.5 ? 2 : 3;
    plate(
      z,
      m,
      m === 2 ? 0.35 + rand() * 0.25 : 0.1 + rand() * 0.25,
      side,
      14 + rand() * 24,
      5 + rand() * 6,
      PAL.dorsal,
      0.78 + rand() * 0.35,
    );
  }
  for (let i = 0; i < 14; i++) {
    const z = -380 + rand() * 900;
    const m = rand() < 0.5 ? 9 : 10;
    plate(
      z,
      m,
      m === 9 ? 0.1 + rand() * 0.3 : 0.2 + rand() * 0.6,
      rand() < 0.5 ? -1 : 1,
      12 + rand() * 24,
      4 + rand() * 5,
      PAL.belly,
      0.85 + rand() * 0.3,
    );
  }
  // hatch rows: short rows of small dark hatches on the ridge shoulders and the flanks
  const hatchRow = (z, m, t, side, n, pitch) => {
    for (let k = 0; k < n; k++) {
      const zz = z + k * pitch;
      if (inCut(cuts, zz, m, side, 3)) continue;
      const f = hullFrame(zz, m, t, side);
      const g = box(0, 0.3, 0, 2.2, 0.6, 2.2);
      placeOn(g, f.p, f.n, FWD);
      add(g, "dark", { color: 0x2e3238, texel: 1 / 2, lod: 0 });
    }
  };
  for (let i = 0; i < 10; i++) {
    const z = -440 + rand() * 480;
    hatchRow(
      z,
      1,
      0.3 + rand() * 0.4,
      rand() < 0.5 ? -1 : 1,
      4 + Math.floor(rand() * 4),
      4.2,
    );
  }
  for (let i = 0; i < 16; i++) {
    const z = -400 + rand() * 900;
    hatchRow(
      z,
      rand() < 0.5 ? 2 : 3,
      0.15 + rand() * 0.6,
      rand() < 0.5 ? -1 : 1,
      3 + Math.floor(rand() * 5),
      4.4,
    );
  }
  for (let i = 0; i < 10; i++) {
    const z = -300 + rand() * 780;
    hatchRow(
      z,
      10,
      0.2 + rand() * 0.5,
      rand() < 0.5 ? -1 : 1,
      3 + Math.floor(rand() * 4),
      4.4,
    );
  }
  // closed secondary bay doors along the lower flank with a lit sliver
  for (const side of [-1, 1])
    for (let i = 0; i < 6; i++) {
      const z = -110 + i * 62;
      const f = hullFrame(z, 8, 0.55, side);
      const g = box(0, 0.35, 0, 7, 0.7, 13);
      placeOn(g, f.p, f.n, FWD);
      add(g, "dark", { color: PAL.darkLit, texel: 1 / 4, lod: 0 });
      const w = box(0, 0.8, 0, 6.2, 0.2, 0.4);
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
        { color: colorHex, texel: 1 / 4, lod },
      );
    }
  };
  dome(new THREE.Vector3(0, st(-470).yTop + 1.0, -470), 3.2, "hull", PAL.belly);
  dome(new THREE.Vector3(0, st(-72).yTop + 2.2, -72), 4.5, "dark", PAL.darkLit);
  for (const side of [-1, 1])
    dome(
      new THREE.Vector3(side * 17, st(478).yTop - 2, 478),
      4,
      "hull",
      PAL.belly,
    );
  dome(
    new THREE.Vector3(0, st(500).yTop + 0.8, 500),
    6.5,
    "hull",
    PAL.belly,
    [0, 1],
  );
  // antennas and masts
  const mast = (x, y, z, h, r = 0.45, lod = 0) =>
    add(cylY(r * 0.7, r, h, 5).translate(x, y + h / 2, z), "dark", {
      color: 0x3a3e46,
      texel: 1 / 2,
      lod,
    });
  mast(0, st(-500).yTop, -500, 26, 0.5);
  mast(6, st(-60).yTop, -60, 18, 0.4);
  mast(-9, st(-200).yTop, -200, 14, 0.4);
  for (const side of [-1, 1]) mast(side * 7, st(486).yTop, 486, 20, 0.45);
  // dishes: thin discs on short stalks, tilted forward-up
  const dish = (p, r, tilt, lod = 0) => {
    const g = cylY(r, r * 0.35, 1.2, 12);
    g.rotateX(-tilt);
    g.translate(p.x, p.y, p.z);
    add(g, "dark", { color: 0x50555e, texel: 1 / 3, lod });
    add(cylY(0.5, 0.7, 5, 5).translate(p.x, p.y - 2.5, p.z), "dark", {
      color: 0x3a3e46,
      texel: 1 / 2,
      lod,
    });
  };
  const fA = hullFrame(-250, 1, 0.5, -1);
  dish(fA.p.clone().addScaledVector(fA.n, 5), 4, 0.8);
  dish(new THREE.Vector3(12, st(30).yTop + 5, 30), 4, 0.9);
  dish(new THREE.Vector3(0, st(516).yTop + 5, 516), 6, -1.1);
  // bow sensor tip (dark cone)
  for (const lod of [0, 1])
    add(cylZ(0.5, 3.3, 34, 8).translate(0, 0, HULL.zBow + 18), "dark", {
      color: 0x3a3e46,
      texel: 1 / 4,
      lod,
    });
}

// window rows on the upper flanks (warm) — scale cues; LOD 0 only
function addWindows({ add }) {
  for (const side of [-1, 1]) {
    for (let z = -330; z <= 520; z += 14) {
      if (hash(Math.round(z), side + 3, 51) < 0.28) continue;
      const f = hullFrame(z, 2, 0.14, side);
      const g = box(0, 0.25, 0, 1.6, 0.5, 1.0);
      placeOn(g, f.p, f.n, FWD);
      add(g, "windows", { color: PAL.windowWarm, lod: 0, uv: "keep" });
    }
    for (let z = -240; z <= 480; z += 22) {
      if (hash(Math.round(z), side + 9, 53) < 0.4) continue;
      const f = hullFrame(z, 3, 0.62, side);
      const g = box(0, 0.25, 0, 1.4, 0.5, 0.9);
      placeOn(g, f.p, f.n, FWD);
      add(g, "windows", { color: PAL.windowCool, lod: 0, uv: "keep" });
    }
  }
}

// ---------------------------------------------------------------------------
// weathering decals: scorch rings around a few fixed points (dark ring + ash core) and long soot
// streaks running forward from the stern vents
// ---------------------------------------------------------------------------
function addWeathering({ add, cuts }) {
  const SCORCH = [
    [-210, 2, 0.5, 1, 7],
    [60, 3, 0.3, -1, 9],
    [300, 9, 0.5, 1, 6],
    [-60, 0, 0.6, -1, 5.5],
    [470, 3, 0.6, -1, 8],
  ];
  for (const [z, m, t, side, r] of SCORCH) {
    const f = hullFrame(z, m, t, side);
    const ring = ringSlab(r, r * 0.55, 18, 0.2, 0, { color: rgb(0x1a1614) });
    placeOn(ring, f.p.clone().addScaledVector(f.n, 0.04), f.n, FWD);
    add(ring, "paint", { lod: 0, keepColor: true });
    const ash = ringSlab(r * 0.55, r * 0.15, 12, 0.2, 0, {
      color: rgb(0x55514c),
    });
    placeOn(ash, f.p.clone().addScaledVector(f.n, 0.04), f.n, FWD);
    add(ash, "paint", { lod: 0, keepColor: true });
  }
  // soot streaks: dark warm strips 60-150 m long trailing forward of the stern, on the flanks and belly
  const rand = rng(913);
  const SOOT = rgb(PAL.soot);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const m = i < 5 ? 2 : i < 7 ? 3 : 9;
      const t = 0.1 + rand() * 0.8;
      const z1 = 500 + rand() * 30;
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
