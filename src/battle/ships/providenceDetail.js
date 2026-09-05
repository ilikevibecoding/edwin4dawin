// Detail pass for the Providence-class model: turret emplacements (hardpoints), the stern engine
// cluster (nozzle depth, glow cores, additive plumes), and greebles — seam rings, dorsal spine, raised
// plate groups, hatch rows, sensor domes, antennas, dishes, window rows on the hull, fin and bridge pod,
// the fin insignia. Everything is placed on the analytic hull surface via hullFrame().
import * as THREE from "three";
import { box, cylY, cylZ } from "./shipKit.js";
import {
  HULL,
  colorize,
  frameMatrix,
  hash,
  hullFrame,
  loftRings,
  placeOn,
  podRadius,
  rgb,
  ringCap,
  ringFromStation,
  rng,
  smoothstep,
  stationAt,
  tubeRings,
} from "./providenceGeo.js";
import { PAL, FINS, POD, barAlong } from "./providenceSpec.js";

const UP = new THREE.Vector3(0, 1, 0);
const FWD = new THREE.Vector3(0, 0, -1);

export function addDetails(ctx) {
  const hardpoints = [];
  addTurrets(ctx, hardpoints);
  const engines = addEngines(ctx);
  addGreebles(ctx);
  addWindows(ctx);
  addFinDetail(ctx);
  addPodDetail(ctx);
  return { hardpoints, engines };
}

// ---------------------------------------------------------------------------
// turrets
// ---------------------------------------------------------------------------
// local space: origin at the base centre, up +Y, barrels toward -Z
function turretPieces(kind, lod, s = 1) {
  const out = [];
  const push = (geo, mat, color, texel) => {
    if (s !== 1) geo.scale(s, s, s);
    out.push({ geo, mat, color, texel });
  };
  if (kind === "heavy") {
    if (lod === 0) {
      push(
        cylY(7.6, 8.2, 2.2, 12).translate(0, 1.1, 0),
        "hull",
        PAL.belly,
        1 / 6,
      );
      push(
        cylY(6.2, 7.0, 4.6, 8).translate(0, 4.5, 0),
        "dark",
        PAL.darkLit,
        1 / 5,
      );
      push(box(0, 5.4, -4.5, 9.5, 4.2, 6.5), "dark", PAL.darkLit, 1 / 5);
      push(box(0, 7.6, 1.5, 5, 1.6, 5), "dark", PAL.dark, 1 / 4);
      for (const x of [-3.6, -1.3, 1.3, 3.6]) {
        push(
          cylZ(0.7, 0.85, 24, 6).translate(x, 5.6, -18),
          "dark",
          PAL.dark,
          1 / 3,
        );
        push(
          cylZ(1.15, 1.15, 3.2, 6).translate(x, 5.6, -8.5),
          "dark",
          PAL.darkLit,
          1 / 3,
        );
      }
    } else if (lod === 1) {
      push(
        cylY(7, 7.6, 5.5, 8).translate(0, 2.7, 0),
        "dark",
        PAL.darkLit,
        1 / 5,
      );
      push(box(0, 5.4, -14, 8.5, 2.2, 22), "dark", PAL.dark, 1 / 4);
    }
  } else if (lod === 0) {
    push(
      cylY(3.6, 4.0, 1.4, 10).translate(0, 0.7, 0),
      "hull",
      PAL.belly,
      1 / 5,
    );
    push(
      new THREE.SphereGeometry(
        3.1,
        10,
        6,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.55,
      ).translate(0, 1.5, 0),
      "dark",
      PAL.darkLit,
      1 / 4,
    );
    for (const x of [-1.15, 1.15])
      push(
        cylZ(0.42, 0.5, 13, 6).translate(x, 3.2, -8),
        "dark",
        PAL.dark,
        1 / 3,
      );
  } else if (lod === 1) {
    push(box(0, 2.2, -2, 6, 4.4, 10), "dark", PAL.darkLit, 1 / 4);
  }
  return out;
}

function addTurret(
  { add },
  hardpoints,
  kind,
  frame,
  { scale = 1, range } = {},
) {
  const m = frameMatrix(frame.p, frame.n, FWD);
  for (const lod of [0, 1]) {
    for (const piece of turretPieces(kind, lod, scale)) {
      piece.geo.applyMatrix4(m);
      add(piece.geo, piece.mat, {
        color: piece.color,
        texel: piece.texel,
        lod,
      });
    }
  }
  const muzzle = new THREE.Vector3(
    0,
    kind === "heavy" ? 5.6 : 3.2,
    kind === "heavy" ? -31 : -15,
  )
    .multiplyScalar(scale)
    .applyMatrix4(m);
  const up = frame.n.clone().normalize();
  const fwd = FWD.clone()
    .sub(up.clone().multiplyScalar(FWD.dot(up)))
    .normalize();
  const dir = up.multiplyScalar(0.55).add(fwd.multiplyScalar(0.85)).normalize();
  hardpoints.push({
    pos: muzzle.toArray(),
    dir: dir.toArray(),
    kind,
    range: range ?? (kind === "heavy" ? 12500 : 7000),
  });
}

function addTurrets(ctx, hardpoints) {
  // heavy quad turbolasers in a row along the dorsal ridge ahead of the fins (smaller toward the bow)
  for (const z of [-392, -314, -236, -158, -80, -2]) {
    const f = hullFrame(z, 0, 0.0, 1, { hangar: false });
    f.n.x = 0;
    f.n.normalize();
    addTurret(ctx, hardpoints, "heavy", f, {
      scale: z < -250 ? 0.72 : z < -100 ? 0.88 : 1,
    });
  }
  // heavy pairs on the upper flanks beside the command fin
  for (const z of [330, 430])
    for (const side of [-1, 1])
      addTurret(
        ctx,
        hardpoints,
        "heavy",
        hullFrame(z, 2, 0.35, side, { hangar: false }),
        { scale: 0.9 },
      );
  // light emplacements: staggered rows along the upper flanks and a row on the lower flank
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const z = -340 + i * 60 + (side > 0 ? 0 : 22);
      addTurret(
        ctx,
        hardpoints,
        "light",
        hullFrame(z, 2, 0.5, side, { hangar: false }),
      );
    }
    for (let i = 0; i < 4; i++)
      addTurret(
        ctx,
        hardpoints,
        "light",
        hullFrame(200 + i * 88, 3, 0.4, side, { hangar: false }),
      );
    for (let i = 0; i < 5; i++)
      addTurret(
        ctx,
        hardpoints,
        "light",
        hullFrame(-130 + i * 125, 9, 0.5, side, { hangar: false }),
      );
  }
  // bow point-defence pair
  for (const side of [-1, 1])
    addTurret(
      ctx,
      hardpoints,
      "light",
      hullFrame(-470, 1, 0.5, side, { hangar: false }),
      { scale: 0.75 },
    );
}

// ---------------------------------------------------------------------------
// engines: nozzle shroud with a flared lip, sooty inner wall (inverted), glow throat, additive plume
// ---------------------------------------------------------------------------
function addEngines({ add }) {
  const engines = [];
  const zS = HULL.zStern;
  const layout = [
    [-46, -14, 19, 0],
    [0, -14, 19, 0],
    [46, -14, 19, 0],
    [-24, 24, 12, 1],
    [24, 24, 12, 1],
    [-30, -47, 11, 1],
    [30, -47, 11, 1],
    [-73, 1, 7, 2],
    [73, 1, 7, 2],
  ];
  const plumeColor = (zMouth, len, k) => (x, y, z) => {
    const t = smoothstep(zMouth - 2, zMouth + len, z);
    return rgb(PAL.plume, Math.pow(1 - t, 2.6) * k);
  };
  for (const [ex, ey, r, tier] of layout) {
    const len = r * 1.35;
    const z0 = zS - 6;
    const mouth = z0 + len;
    for (const lod of [0, 1, 2]) {
      if (lod === 2 && tier === 2) continue;
      const seg = lod === 0 ? 18 : lod === 1 ? 12 : 8;
      if (lod < 2) {
        // outer shroud + flared lip
        add(
          loftRings(
            tubeRings(
              ex,
              ey,
              [
                [z0 - 1, r * 1.04],
                [z0 + len * 0.55, r * 0.98],
                [mouth - 2.5, r * 0.9],
                [mouth, r * 0.97],
                [mouth + 1.2, r * 0.9],
              ],
              seg,
            ),
            { sharp: null, faceColor: () => rgb(0x4d525b), texel: 1 / 6 },
          ),
          "dark",
          { lod, keepColor: true },
        );
        // inner wall (faces inward), sooty toward the throat
        add(
          loftRings(
            tubeRings(
              ex,
              ey,
              [
                [mouth + 1.2, r * 0.9],
                [mouth - 3, r * 0.84],
                [z0 + len * 0.35, r * 0.7],
                [z0 + 2.5, r * 0.5],
              ],
              seg,
            ),
            {
              invert: true,
              faceColor: (i) => rgb(0x2a2d33, 1 - i * 0.22),
              texel: 1 / 5,
            },
          ),
          "dark",
          { lod, keepColor: true },
        );
      }
      // throat glow: bright core and a softer halo disc
      add(
        ringCap(tubeRings(ex, ey, [[z0 + 3, r * 0.42]], seg)[0], [0, 0, 1], {
          color: rgb(PAL.engineCore, 1.1),
        }),
        "engineGlow",
        { lod, keepColor: true },
      );
      if (lod < 2)
        add(
          ringCap(tubeRings(ex, ey, [[z0 + 5, r * 0.7]], seg)[0], [0, 0, 1], {
            color: rgb(PAL.engineGlow, 0.55),
          }),
          "engineGlow",
          { lod, keepColor: true },
        );
      // additive plume: a short outer haze cone fading to black plus a thin hot core cone
      const plen = r * 3.0;
      const seg2 = lod === 0 ? 14 : lod === 1 ? 10 : 6;
      const outer = tubeRings(
        ex,
        ey,
        lod === 2
          ? [
              [mouth - 1, r * 0.72],
              [mouth + plen * 0.4, r * 0.48],
              [mouth + plen, r * 0.08],
            ]
          : [
              [mouth - 1, r * 0.72],
              [mouth + plen * 0.22, r * 0.62],
              [mouth + plen * 0.55, r * 0.38],
              [mouth + plen, r * 0.08],
            ],
        seg2,
      );
      add(
        colorize(loftRings(outer), plumeColor(mouth, plen, 0.2)),
        "plumeAdd",
        {
          lod,
          keepColor: true,
        },
      );
      if (lod < 2) {
        const core = tubeRings(
          ex,
          ey,
          [
            [mouth - 2, r * 0.38],
            [mouth + plen * 0.3, r * 0.26],
            [mouth + plen * 0.7, r * 0.05],
          ],
          seg2,
        );
        add(
          colorize(loftRings(core), plumeColor(mouth, plen * 0.7, 0.45)),
          "plumeAdd",
          {
            lod,
            keepColor: true,
          },
        );
      }
    }
    engines.push({ pos: [ex, ey, mouth], r });
  }
  // engine glow spill: a faint additive disc over the stern wall
  for (const lod of [0, 1])
    add(
      colorize(
        ringCap(tubeRings(0, -12, [[zS + 2.5, 96]], 24)[0], [0, 0, 1]),
        () => rgb(0x0a1a34, 0.9),
      ),
      "plumeAdd",
      { lod, keepColor: true },
    );
  // stern machinery between the nozzles: fuel manifolds, pump housings and a raised rim ring
  for (const [x, y, w, h, d] of [
    [-23, -14, 8, 10, 9],
    [23, -14, 8, 10, 9],
    [0, 8, 26, 5, 7],
    [0, -36, 22, 5, 6],
    [-52, 10, 9, 7, 6],
    [52, 10, 9, 7, 6],
    [-50, -38, 8, 6, 6],
    [50, -38, 8, 6, 6],
  ])
    add(box(x, y, zS + d / 2 - 1, w, h, d), "dark", {
      color: PAL.darkLit,
      texel: 1 / 3,
      lod: 0,
    });
  for (const [x, y] of [
    [-14, -14],
    [14, -14],
    [-36, -14],
    [36, -14],
  ])
    add(cylZ(1.4, 1.4, 12, 6).translate(x, y, zS + 5), "dark", {
      color: 0x2e3238,
      texel: 1 / 2,
      lod: 0,
    });
  const rim = (dz, k) => {
    const s = stationAt(zS + dz, { hangar: false });
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
        faceColor: () => rgb(PAL.dorsal, 0.8),
        texel: 1 / 8,
      }),
      "hull",
      { lod, keepColor: true },
    );
  return engines;
}

// ---------------------------------------------------------------------------
// greebles
// ---------------------------------------------------------------------------
function addGreebles({ add }) {
  const rand = rng(4021);
  const st = (z) => stationAt(z, { hangar: false });
  // transverse seam rings (thin dark bands hugging the hull) outside the hangar range
  for (const z of [-440, -350, -262, -188, 296, 372, 452, 516]) {
    const mk = (zz) => {
      const s = st(zz);
      return ringFromStation({
        ...s,
        w: s.w + 0.45,
        yTop: s.yTop + 0.45,
        yBot: s.yBot - 0.45,
      });
    };
    for (const lod of [0, 1])
      add(
        loftRings([mk(z - 1.3), mk(z + 1.3)], {
          faceColor: () => rgb(0x2c3037),
          texel: 1 / 8,
        }),
        "dark",
        { lod, keepColor: true },
      );
  }
  // dark-blue painted bands near the bow and one ahead of the fin (colour accents, LOD 0/1)
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
  // dorsal spine along the ridge ahead of the fins, ridge-edge rails
  const zsSpine = [];
  for (let z = -474; z <= 60; z += 30) zsSpine.push(z);
  for (const lod of [0, 1])
    add(
      barAlong(
        zsSpine,
        (z) => [0, st(z).yTop + 0.55],
        lod === 0 ? 3.6 : 4,
        1.3,
        { color: rgb(PAL.dorsal, 0.85), texel: 1 / 6 },
      ),
      "hull",
      { lod, keepColor: true },
    );
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
        {
          color: rgb(0x33373e),
          texel: 1 / 5,
        },
      ),
      "dark",
      { lod: 0, keepColor: true },
    );
  }
  // raised plate groups: dorsal/upper flank (darker), belly (paler); aligned to the local surface
  const plate = (z, m, t, side, lz, lw, colorHex, tone) => {
    const f = hullFrame(z, m, t, side, { hangar: false });
    const g = box(0, 0.45, 0, lw, 0.9, lz);
    placeOn(g, f.p, f.n, FWD);
    add(g, "hull", {
      color: new THREE.Color(colorHex).multiplyScalar(tone),
      texel: 1 / 12,
      lod: 0,
    });
  };
  for (let i = 0; i < 44; i++) {
    const z = -470 + rand() * 990;
    const side = rand() < 0.5 ? -1 : 1;
    const m = rand() < 0.35 ? 2 : 3;
    // keep clear of the hangar lips
    plate(
      z,
      m,
      0.2 + rand() * 0.5,
      side,
      12 + rand() * 30,
      4 + rand() * 7,
      PAL.dorsal,
      0.8 + rand() * 0.35,
    );
  }
  for (let i = 0; i < 16; i++) {
    const z = -420 + rand() * 900;
    plate(
      z,
      0,
      0.35 + rand() * 0.5,
      rand() < 0.5 ? -1 : 1,
      10 + rand() * 24,
      3 + rand() * 4,
      PAL.dorsal,
      0.85 + rand() * 0.3,
    );
  }
  // darker dorsal panel groups: large low plates on the ridge shoulders (both sides)
  for (let i = 0; i < 14; i++) {
    const z = -300 + i * 58 + rand() * 20;
    for (const side of [-1, 1])
      plate(
        z + (side > 0 ? 0 : 16),
        1,
        0.3 + rand() * 0.3,
        side,
        22 + rand() * 20,
        9 + rand() * 6,
        PAL.dorsal,
        0.66 + rand() * 0.2,
      );
  }
  // exhaust vents near the stern on the upper flanks (dark louvred rectangles, origin of the soot)
  for (const side of [-1, 1])
    for (const z of [476, 500, 524]) {
      const f = hullFrame(z, 2, 0.5, side, { hangar: false });
      const g = box(0, 0.4, 0, 6, 0.8, 12);
      placeOn(g, f.p, f.n, FWD);
      add(g, "dark", { color: 0x25282e, texel: 1 / 3, lod: 0 });
    }
  for (let i = 0; i < 26; i++) {
    const z = -380 + rand() * 900;
    const m = rand() < 0.5 ? 9 : 10;
    plate(
      z,
      m,
      0.2 + rand() * 0.6,
      rand() < 0.5 ? -1 : 1,
      10 + rand() * 26,
      3 + rand() * 5,
      PAL.belly,
      0.85 + rand() * 0.3,
    );
  }
  // hatch rows: short rows of small dark hatches on the ridge and the flanks
  const hatchRow = (z, m, t, side, n, pitch, along = "z") => {
    for (let k = 0; k < n; k++) {
      const zz = along === "z" ? z + k * pitch : z;
      const tt = along === "z" ? t : t + k * 0.09;
      const f = hullFrame(zz, m, tt, side, { hangar: false });
      const g = box(0, 0.3, 0, 2.2, 0.6, 2.2);
      placeOn(g, f.p, f.n, FWD);
      add(g, "dark", { color: 0x2e3238, texel: 1 / 2, lod: 0 });
    }
  };
  for (let i = 0; i < 12; i++) {
    const z = -440 + rand() * 480;
    const side = rand() < 0.5 ? -1 : 1;
    hatchRow(z, 0, 0.5 + rand() * 0.3, side, 4 + Math.floor(rand() * 4), 4.2);
  }
  for (let i = 0; i < 16; i++) {
    const z = -400 + rand() * 900;
    const side = rand() < 0.5 ? -1 : 1;
    hatchRow(
      z,
      rand() < 0.5 ? 2 : 3,
      0.15 + rand() * 0.6,
      side,
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
  // closed secondary bay doors along the lower flank (below the hangar) with a lit sliver
  for (const side of [-1, 1])
    for (let i = 0; i < 6; i++) {
      const z = -110 + i * 62;
      const f = hullFrame(z, 8, 0.5, side, { hangar: false });
      const g = box(0, 0.35, 0, 7, 0.7, 13);
      placeOn(g, f.p, f.n, FWD);
      add(g, "dark", { color: PAL.darkLit, texel: 1 / 4, lod: 0 });
      const w = box(0, 0.8, 0, 6.2, 0.2, 0.4);
      placeOn(w, f.p, f.n, FWD);
      add(w, "windows", { color: 0xffb070, lod: 0, uv: "keep" });
    }
  // sensor domes
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
  dome(new THREE.Vector3(0, st(-470).yTop + 1.0, -470), 3.2, "hull", PAL.belly);
  dome(
    new THREE.Vector3(0, st(-120).yTop + 0.5, -120),
    4.5,
    "dark",
    PAL.darkLit,
  );
  for (const side of [-1, 1]) {
    dome(
      new THREE.Vector3(side * 15, st(150).yTop - 1.5, 150),
      5,
      "dark",
      PAL.darkLit,
      [0, 1],
    );
    dome(
      new THREE.Vector3(side * 17, st(470).yTop - 2, 470),
      4,
      "hull",
      PAL.belly,
    );
  }
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
  mast(0, -184 - 5.5 - 14, 340, 14, 0.4);
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
  dish(new THREE.Vector3(8, st(-60).yTop + 6, -40), 5, 0.7);
  dish(new THREE.Vector3(-12, st(40).yTop + 5, 30), 4, 0.9);
  dish(new THREE.Vector3(0, st(505).yTop + 5, 512), 6, -1.1);
  // bow sensor tip (dark cone) and keel strake
  for (const lod of [0, 1])
    add(cylZ(0.5, 3.3, 34, 8).translate(0, 0, HULL.zBow + 18), "dark", {
      color: 0x3a3e46,
      texel: 1 / 4,
      lod,
    });
  const zsKeel = [];
  for (let z = -380; z <= 250; z += 30) zsKeel.push(z);
  add(
    barAlong(zsKeel, (z) => [0, st(z).yBot - 0.4], 2.6, 1.0, {
      color: rgb(PAL.belly, 0.9),
      texel: 1 / 6,
    }),
    "hull",
    { lod: 0, keepColor: true },
  );
}

// window rows on the upper flanks (warm) — scale cues; LOD 0 only
function addWindows({ add }) {
  for (const side of [-1, 1]) {
    for (let z = -330; z <= 520; z += 14) {
      if (hash(Math.round(z), side + 3, 51) < 0.28) continue;
      const f = hullFrame(z, 2, 0.14, side, { hangar: false });
      const g = box(0, 0.25, 0, 1.6, 0.5, 1.0);
      placeOn(g, f.p, f.n, FWD);
      add(g, "windows", { color: PAL.windowWarm, lod: 0, uv: "keep" });
    }
    // a second, sparser row lower on the flank
    for (let z = -240; z <= 480; z += 22) {
      if (hash(Math.round(z), side + 9, 53) < 0.4) continue;
      const f = hullFrame(z, 3, 0.55, side, { hangar: false });
      const g = box(0, 0.25, 0, 1.4, 0.5, 0.9);
      placeOn(g, f.p, f.n, FWD);
      add(g, "windows", { color: PAL.windowCool, lod: 0, uv: "keep" });
    }
  }
}

// ---------------------------------------------------------------------------
// fin detail: vertical strips, equipment panels, window rows near the top, insignia, masts
// ---------------------------------------------------------------------------
function addFinDetail({ add }) {
  const fin = FINS.main;
  const lean = Math.atan((9.5 - 4.6) / 226); // faces tilt inward with height
  const faceN = (side) =>
    new THREE.Vector3(side * Math.cos(lean), Math.sin(lean), 0);
  const onFace = (side, y, z, geo, out = 0.45) => {
    const p = new THREE.Vector3(side * (fin.halfT(y) + out), y, z);
    placeOn(geo, p, faceN(side), UP);
    return geo;
  };
  const rand = rng(77);
  for (const side of [-1, 1]) {
    // raised vertical strips, kept inside the outline at both ends of the strip
    for (let i = 0; i < 9; i++) {
      const y = 70 + rand() * 120;
      const h = 30 + rand() * 70;
      const zMin = Math.max(fin.zLead(y), fin.zLead(y + h)) + 12;
      const zMax = Math.min(fin.zTrail(y), fin.zTrail(y + h)) - 16;
      const z = zMin + rand() * Math.max(1, zMax - zMin);
      // box local: x along z (width), y out (thickness), z along -up => height
      add(
        onFace(side, y + h / 2, z, box(0, 0.5, 0, 3 + rand() * 2.5, 1.0, h)),
        "hull",
        {
          color: new THREE.Color(PAL.dorsal).multiplyScalar(0.9 + rand() * 0.3),
          texel: 1 / 10,
          lod: 0,
        },
      );
    }
    // dark equipment panels near the base, a lit sensor slit on each
    for (const [y, z, w, h] of [
      [86, 300, 26, 22],
      [120, 372, 18, 16],
      [70, 210, 14, 14],
    ]) {
      add(onFace(side, y, z, box(0, 0.4, 0, w, 0.8, h)), "dark", {
        color: PAL.darkLit,
        texel: 1 / 4,
        lod: 0,
      });
      add(
        onFace(side, y + h * 0.3, z, box(0, 0.9, 0, w * 0.7, 0.3, 0.6)),
        "windows",
        { color: PAL.windowCool, lod: 0, uv: "keep" },
      );
    }
    // insignia: dark hexagon with a rust outline ring (paint) on both faces, LOD 0/1
    for (const lod of [0, 1]) {
      const hex = new THREE.CylinderGeometry(15, 15, 0.5, 6);
      hex.rotateY(Math.PI / 6);
      add(onFace(side, 150, 332, hex, 0.55), "paint", {
        color: PAL.insignia,
        lod,
        uv: "keep",
      });
      add(
        onFace(side, 150, 332, flatRing(19.5, 16.5, 6, Math.PI / 6), 0.6),
        "paint",
        { color: PAL.rust, lod, uv: "keep" },
      );
    }
    // horizontal panel lines across the blade (thin dark bars), a few small equipment boxes
    for (const y of [98, 132, 168, 198, 232]) {
      const za = fin.zLead(y) + 9;
      const zb = fin.zTrail(y) - 12;
      add(
        onFace(side, y, (za + zb) / 2, box(0, 0.25, 0, zb - za, 0.5, 1.1)),
        "dark",
        {
          color: 0x2c3037,
          texel: 1 / 4,
          lod: 0,
        },
      );
    }
    for (let i = 0; i < 7; i++) {
      const y = 62 + rand() * 90;
      const z =
        fin.zLead(y) + 16 + rand() * (fin.zTrail(y) - fin.zLead(y) - 40);
      add(
        onFace(side, y, z, box(0, 0.8, 0, 2 + rand() * 4, 1.6, 2 + rand() * 3)),
        "dark",
        {
          color: PAL.darkLit,
          texel: 1 / 3,
          lod: 0,
        },
      );
    }
    // window rows on the fin just under the pod and along the upper blade
    for (let z = 196; z <= 250; z += 3.6) {
      const y = 252;
      add(onFace(side, y, z, box(0, 0.25, 0, 1.6, 0.5, 1.2)), "windows", {
        color: PAL.windowWarm,
        lod: 0,
        uv: "keep",
      });
    }
    for (const [y, z0w, z1w, skip] of [
      [214, 190, 300, 0.35],
      [240, 192, 270, 0.5],
      [150, 176, 260, 0.6],
    ])
      for (let z = z0w; z <= z1w; z += 4) {
        if (hash(Math.round(z), side + y, 3) < skip) continue;
        add(onFace(side, y, z, box(0, 0.25, 0, 1.4, 0.5, 1.0)), "windows", {
          color: PAL.windowWarm,
          lod: 0,
          uv: "keep",
        });
      }
    // LOD 1: continuous bands stand in for the rows
    add(onFace(side, 252, 223, box(0, 0.25, 0, 54, 0.5, 1.2)), "windows", {
      color: PAL.windowWarm,
      lod: 1,
      uv: "keep",
    });
  }
  // masts on the fin top behind the pod and on the trailing slope
  const mast = (x, y, z, h, lod = 0) =>
    add(cylY(0.3, 0.5, h, 5).translate(x, y + h / 2, z), "dark", {
      color: 0x3a3e46,
      texel: 1 / 2,
      lod,
    });
  mast(0, 230, 290, 26);
  mast(0, 186, 330, 20);
  // forward sensor fin: two masts and a dark panel; ventral fin: a panel
  mast(0, 142 + 5.5, 104, 18);
  mast(0, 142 + 5.5, 128, 10);
  const foreN = (side) => new THREE.Vector3(side, 0, 0);
  for (const side of [-1, 1]) {
    const g = box(0, 0.4, 0, 20, 0.8, 22);
    placeOn(
      g,
      new THREE.Vector3(side * (FINS.fore.halfT(90) + 0.4), 90, 130),
      foreN(side),
      UP,
    );
    add(g, "dark", { color: PAL.darkLit, texel: 1 / 4, lod: 0 });
    const v = box(0, 0.4, 0, 30, 0.8, 24);
    placeOn(
      v,
      new THREE.Vector3(side * (FINS.ventral.halfT(-120) + 0.4), -120, 400),
      foreN(side),
      UP,
    );
    add(v, "dark", { color: PAL.darkLit, texel: 1 / 4, lod: 0 });
  }
}

// ---------------------------------------------------------------------------
// bridge pod detail: window rows (discrete at LOD 0, bands at LOD 1/2), sensor band, chin, spars, dish
// ---------------------------------------------------------------------------
function addPodDetail({ add }) {
  const { cx, cy, z0, rx, ry } = POD;
  const R = (z) => podRadius(POD, z);
  // window rows at two heights around the sides, forward two thirds of the pod
  const rows = [
    { f: 0.05, color: PAL.windowWarm },
    { f: 0.32, color: PAL.windowWarm },
    { f: -0.22, color: PAL.windowCool },
  ];
  for (const side of [-1, 1]) {
    for (const row of rows) {
      const y = cy + row.f * ry;
      const xAt = (z) => {
        const r = R(z);
        const yy = row.f * ry; // height in the pod section
        const q = Math.max(0, 1 - (yy / (ry * r)) ** 2);
        return side * (rx * r * Math.sqrt(q));
      };
      // discrete windows (LOD 0)
      for (let z = z0 + 10; z <= z0 + 76; z += 2.9) {
        if (hash(Math.round(z * 10), side + 4, 61) < 0.15) continue;
        const r = R(z);
        const x = xAt(z);
        const n = new THREE.Vector3(
          x / (rx * rx * r * r),
          (y - cy) / (ry * ry * r * r),
          0,
        ).normalize();
        const g = box(0, 0.22, 0, 1.6, 0.45, 1.1);
        placeOn(g, new THREE.Vector3(x, y, z), n, UP);
        add(g, "windows", { color: row.color, lod: 0, uv: "keep" });
      }
      // bands (LOD 1/2)
      for (const lod of [1, 2]) {
        const zs = [z0 + 10, z0 + 30, z0 + 52, z0 + 76];
        add(
          barAlong(zs, (z) => [xAt(z) + side * 0.2, y], 0.5, 1.0, {
            color: rgb(row.color, 1),
          }),
          "windows",
          { lod, keepColor: true },
        );
      }
    }
    // dark sill band under the main window row
    const zsSill = [z0 + 6, z0 + 26, z0 + 48, z0 + 80];
    const ySill = cy - 0.12 * ry;
    add(
      barAlong(
        zsSill,
        (z) => {
          const r = R(z);
          const q = Math.max(0, 1 - (-0.12 / r) ** 2);
          return [side * (rx * r * Math.sqrt(q) + 0.15), ySill];
        },
        0.4,
        1.6,
        { color: rgb(0x2e3238), texel: 1 / 4 },
      ),
      "dark",
      { lod: 0, keepColor: true },
    );
  }
  // chin under the pod nose, sensor blister on the top rear, spars and a dish
  add(box(cx, cy - ry * 0.86, z0 + 22, 9, 3.2, 16), "dark", {
    color: PAL.darkLit,
    texel: 1 / 4,
    lod: 0,
  });
  add(box(cx, cy + ry * 0.95, z0 + 66, 12, 2.6, 22), "dark", {
    color: PAL.darkLit,
    texel: 1 / 4,
    lod: 0,
  });
  for (const lod of [0, 1]) {
    add(cylY(0.35, 0.6, 30, 5).translate(cx, cy + ry + 14, z0 + 44), "dark", {
      color: 0x3a3e46,
      texel: 1 / 2,
      lod,
    });
    add(
      cylY(0.3, 0.45, 18, 5).translate(cx + 3, cy + ry + 8, z0 + 78),
      "dark",
      { color: 0x3a3e46, texel: 1 / 2, lod },
    );
  }
  const dish = cylY(4.2, 1.5, 1.0, 12);
  dish.rotateX(-0.75);
  dish.translate(cx - 4, cy + ry + 3, z0 + 84);
  add(dish, "dark", { color: 0x50555e, texel: 1 / 3, lod: 0 });
  // running lights: one red (port) and one green (starboard) at the pod's widest point
  for (const side of [-1, 1])
    add(box(side * (rx + 0.2), cy, z0 + 46, 0.5, 1.2, 1.2), "windows", {
      color: side < 0 ? 0xff3030 : 0x30ff60,
      lod: 0,
      uv: "keep",
    });
}

// flat polygonal annulus in the XZ plane facing +Y (local space for placeOn)
function flatRing(rOut, rIn, n, phase = 0) {
  const pos = [];
  const nor = [];
  const uvs = [];
  const col = [];
  const pt = (r, k) => {
    const a = phase + (k / n) * Math.PI * 2;
    return [Math.cos(a) * r, 0, Math.sin(a) * r];
  };
  for (let k = 0; k < n; k++) {
    const o0 = pt(rOut, k);
    const o1 = pt(rOut, k + 1);
    const i0 = pt(rIn, k);
    const i1 = pt(rIn, k + 1);
    for (const p of [o0, i1, o1, o0, i0, i1]) {
      pos.push(p[0], p[1], p[2]);
      nor.push(0, 1, 0);
      uvs.push(p[0] * 0.1, p[2] * 0.1);
      col.push(1, 1, 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return g;
}
