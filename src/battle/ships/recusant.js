// Recusant-class light destroyer (Separatist), 1187 m. Original procedural geometry after the film's
// design language: an extremely thin skeletal ship — a spear-like spinal gun tapering in three stepped
// sections with ring collars and a dark sensor tip, a long forward spine of armour plates over a dark
// core inside an open cage of frames, stringers and braces, a small command pod mid-spine, and a broad
// flat aft slab (~490 m across, 1.6× the spine cage) with thin swept tips, a raised central ridge running
// into a tiered superstructure (two set-back tiers, recessed window bands, comm dish and antenna
// cluster), tracking heavy turrets on the slab shoulders and belly, light turrets on the tiers and at
// the spine-to-slab junction, a row of seven deep engine bells across the stern, plating at three scales
// (lipped plates on the slab, ribbed tip panels, hatches), ±8 % per-plate tone, paint fade toward the
// tips, soot aft of the turrets and forward of the nozzles, seam grime, scorch rings and a dark blue
// accent stripe with hex insignia so the grey hull is not monotone. Three LODs.
import * as THREE from "three";
import { assemble } from "./shipKit.js";
import {
  bar,
  col,
  jitter,
  loftZ,
  mix,
  mpart,
  octagon,
  plateZ,
  quadAt,
  ringZ,
  rng,
  roundedRect,
  smoothstep,
  superellipse,
  superellipseU,
  table,
  tubeZ,
  wingProfile,
} from "./munificentGeo.js";
import { turretType } from "./munificentTurrets.js";
import { nozzleBell, sootStreak, sternSpill } from "./munificentEngines.js";
import {
  antennaCluster,
  dishMast,
  hatch,
  scorchRing,
  slotRow,
  slotWindow,
} from "./munificentDetail.js";

export const RECUSANT = { length: 1187, width: 490, height: 150 };

// palette: vertex tints over the shared plating (albedo ~0.62 before tint). A darker cool grey
// (gunmetal) calibrated so sunlit plating lands near sRGB 135-150 and shadow faces near 40, a clear step
// below the paler blue-grey Providence and well apart from the tan Munificent at 2-10 km.
const GREY = col(0x9a9fa8);
const GREY_LT = GREY.clone().multiplyScalar(1.07);
const GREY_DK = GREY.clone().multiplyScalar(0.86);
const GREY_FADE = col(0xb0b1b3); // paint fade toward the slab tips: lighter, flatter
const SOOT = col(0x2a2a2e);
const MACH = 0x7a7c82; // machinery tint on the dark texture
const MACH_DK = 0x50525a;
const CORE = 0x3e4046;
const WINDOW = 0xd6e6ff;
const WINDOW_WARM = 0xffe6c4;
const ACCENT = 0x34405c; // Separatist blue-grey stripe
const EMBLEM = 0xd9c58c;
const SHELL = col(0x6a6c72); // nozzle bells
const SHELL_DK = col(0x3a3c42);
const PLATE = col(0x484a50); // stern plate

export function buildRecusant(mats) {
  const L = RECUSANT.length;
  const parts = [];
  const hardpoints = [];
  const engines = [];
  const turrets = [];
  const add = (geo, mat, opts) => parts.push(mpart(geo, mat, opts));
  const rand = rng(4421);
  const zBow = -L / 2;
  const zStern = L / 2;
  const TEX = 1 / 38; // large plating scale on the slab (plates 5-11 m)

  // ---------------------------------------------------------------------------
  // spear tip / spinal gun: dark sensor tip, three stepped sections, ring collars, root collar
  // ---------------------------------------------------------------------------
  const tipEnd = zBow + 16;
  const stepA = zBow + 70;
  const stepB = zBow + 130;
  const rootZ = zBow + 186;
  const spikeR = (z) =>
    table(
      [
        [zBow, 1.5],
        [tipEnd, 3.4],
        [stepA, 5.4],
        [stepA + 0.01, 6.6],
        [stepB, 8.6],
        [stepB + 0.01, 10.2],
        [rootZ, 12.8],
      ],
      z,
    );
  for (const lod of [0, 1, 2]) {
    const seg = lod === 0 ? 12 : 8;
    const prof = superellipse(seg, 2);
    // LOD 2 (beyond 9 km) carries the spike 1.6x thicker so the spear does not vanish to sub-pixel
    const k2 = lod === 2 ? 1.6 : 1;
    add(
      loftZ(
        prof,
        [
          { z: zBow, sx: 1.5 * k2, sy: 1.5 * k2 },
          { z: tipEnd, sx: 3.4 * k2, sy: 3.4 * k2 },
        ],
        { capStart: true, flat: true },
      ),
      "dark",
      { color: MACH_DK, texel: 1 / 3, lod },
    );
    // each section's start cap is the visible step face
    [
      [tipEnd, stepA],
      [stepA, stepB],
      [stepB, rootZ],
    ].forEach(([z0, z1], i) => {
      const r0 = spikeR(z0 + 0.02) * k2;
      const r1 = spikeR(z1 - 0.01) * k2;
      add(
        loftZ(
          prof,
          [
            { z: z0, sx: r0, sy: r0 },
            { z: z1, sx: r1, sy: r1 },
          ],
          { capStart: true, flat: true, texel: 1 / 10 },
        ),
        "hull",
        {
          uv: "keep",
          lod,
          tint: (x, y, z, o) =>
            o
              .copy(i === 1 ? GREY_DK : GREY)
              .multiplyScalar(1 - 0.14 * smoothstep(z1 - 8, z1, z)),
        },
      );
    });
    // ring collars at the steps and the heavy root collar where the spike meets the spine
    add(tubeZ(7.6 * k2, 7.6 * k2, 6, seg, 0, 0, stepA, false), "dark", {
      color: MACH,
      texel: 1 / 3,
      lod,
    });
    add(tubeZ(11.2 * k2, 11.2 * k2, 7, seg, 0, 0, stepB, false), "dark", {
      color: MACH,
      texel: 1 / 3,
      lod,
    });
    add(tubeZ(15.8 * k2, 14.6 * k2, 16, seg, 0, 0, rootZ + 6, false), "dark", {
      color: MACH,
      texel: 1 / 4,
      lod,
    });
    if (lod < 2) {
      add(tubeZ(4.3, 4.3, 2.4, 8, 0, 0, zBow + 42, false), "dark", {
        color: MACH_DK,
        texel: 1 / 3,
        lod,
      });
      add(tubeZ(9.4, 9.4, 3, 8, 0, 0, zBow + 102, false), "dark", {
        color: MACH_DK,
        texel: 1 / 3,
        lod,
      });
      // red sensor light in the tip
      add(
        new THREE.BoxGeometry(1.2, 1.2, 2.4).translate(0, 0, zBow + 1.6),
        "windows",
        {
          color: 0xff6a4a,
          lod,
          uv: "keep",
        },
      );
    }
  }
  // four longitudinal gun ribs on the root section (LOD 0)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const at = (z, r) => [Math.cos(a) * r, Math.sin(a) * r, z];
    add(bar(at(stepB + 6, 10.4), at(rootZ - 3, 13.2), 2.2, 2.2), "hull", {
      color: GREY_LT,
      texel: 1 / 3,
      lod: 0,
    });
  }
  hardpoints.push({
    pos: [0, 0, zBow - 6],
    dir: [0, 0, -1],
    kind: "heavy",
    range: 15000,
  });

  // ---------------------------------------------------------------------------
  // spine core and armour plates: Z0 .. Z1, section grows aft
  // ---------------------------------------------------------------------------
  const Z0 = rootZ + 4;
  const Z1 = 262;
  const coreS = (z) => 12 + ((z - Z0) / (Z1 - Z0)) * 8;
  const coreProf = roundedRect(2, 0.3, 0.3);
  for (const lod of [0, 1])
    add(
      loftZ(coreProf, [
        { z: Z0, sx: coreS(Z0) * 0.86, sy: coreS(Z0) * 0.86 },
        { z: Z1, sx: coreS(Z1) * 0.86, sy: coreS(Z1) * 0.86 },
      ]),
      "dark",
      { color: CORE, texel: 1 / 5, lod },
    );
  // frame (rib) stations along the spine; frames are skipped where the command pod sits
  const NF = 27;
  const FZ = [];
  for (let i = 0; i < NF; i++)
    FZ.push(Z0 + 10 + i * ((Z1 - 34 - Z0 - 10) / (NF - 1)));
  const frameW = (z) => 21 + ((z - Z0) / (Z1 - Z0)) * 16;
  const frameH = (z) => 18.5 + ((z - Z0) / (Z1 - Z0)) * 13;
  const podZ = -92;
  const podFrames = new Set();
  for (let i = 0; i < NF; i++)
    if (Math.abs(FZ[i] - podZ) < 58) podFrames.add(i);
  // armour plates over the dark core: one per pair of bays, per-plate tone, grimy seams, lip rings
  for (const lod of [0, 1]) {
    for (let i = 0; i + 2 < NF; i += 2) {
      const za = FZ[i] + 3;
      const zb = FZ[i + 2] - 9;
      const zc = (za + zb) / 2;
      const k = i % 4 ? 1 : 1.04;
      const tone = jitter(
        i % 6 === 0 ? GREY_LT : i % 6 === 2 ? GREY : GREY_DK,
        rand,
        0.08,
      );
      add(
        loftZ(
          coreProf,
          [
            { z: za, sx: coreS(za) * k, sy: coreS(za) * k },
            { z: zb, sx: coreS(zb) * k, sy: coreS(zb) * k },
          ],
          { capStart: true, capEnd: true, texel: 1 / 12 },
        ),
        "hull",
        {
          uv: "keep",
          lod,
          tint: (x, y, z, o) =>
            o
              .copy(tone)
              .multiplyScalar(
                1 - 0.16 * (1 - smoothstep(0, 3, Math.min(z - za, zb - z))),
              ),
        },
      );
      if (lod === 0)
        for (const ze of [za + 1.4, zb - 1.4])
          add(
            loftZ(
              coreProf,
              [
                {
                  z: ze - 0.9,
                  sx: coreS(ze) * k * 1.035,
                  sy: coreS(ze) * k * 1.035,
                },
                {
                  z: ze + 0.9,
                  sx: coreS(ze) * k * 1.035,
                  sy: coreS(ze) * k * 1.035,
                },
              ],
              { capStart: true, capEnd: true },
            ),
            "dark",
            { color: MACH_DK, texel: 1 / 4, lod },
          );
      // recessed window slots on alternate plates, a hatch on top of the others
      if (i % 4 === 0)
        for (const side of [-1, 1])
          slotRow(add, {
            c: [side * (coreS(zc) * k + 0.05), 1.5, zc],
            n: [side, 0, 0],
            along: [0, 0, 1],
            count: 3,
            len: 4.6,
            gap: 2.2,
            h: 1.5,
            lod,
            panes: 1,
            glow: WINDOW,
            rim: MACH_DK,
          });
      else
        hatch(add, {
          c: [0, coreS(zc) * k, zc],
          n: [0, 1, 0],
          along: [0, 0, 1],
          w: 5,
          h: 7,
          lod,
          color: GREY_DK,
          rimColor: MACH_DK,
          big: true,
        });
    }
    // exposed conduits along the core in the gaps
    for (const [px, py] of [
      [0.55, 0.55],
      [-0.55, -0.55],
    ])
      add(
        loftZ(superellipse(6, 2), [
          {
            z: Z0 + 4,
            sx: 1.4,
            sy: 1.4,
            x: px * coreS(Z0) * 0.86,
            y: py * coreS(Z0) * 0.86,
          },
          {
            z: Z1 - 6,
            sx: 1.4,
            sy: 1.4,
            x: px * coreS(Z1) * 0.86,
            y: py * coreS(Z1) * 0.86,
          },
        ]),
        "dark",
        { color: MACH, texel: 1 / 2, lod },
      );
  }

  // ---------------------------------------------------------------------------
  // structural cage: octagonal ring frames, corner stringers, diagonal braces, struts to the core
  // ---------------------------------------------------------------------------
  const CH = 0.6; // chamfer fraction of the octagon frames
  const frame = (z, lod) => {
    const w = frameW(z);
    const h = frameH(z);
    const t = 4.4 + ((z - Z0) / (Z1 - Z0)) * 1.8; // radial depth of the rib
    const d = 2.6; // thickness along z
    add(
      ringZ(octagon(w, h, CH), octagon(w - t, h - t, CH), z - d / 2, z + d / 2),
      "hull",
      {
        texel: 1 / 3,
        lod,
        tint: (x, y, zz, o) => o.copy(GREY_LT).multiplyScalar(y < -4 ? 0.9 : 1),
      },
    );
    if (lod === 0) {
      const c = coreS(z) * 0.86;
      for (const sx of [-1, 1])
        for (const sy of [-1, 1]) {
          const fx = sx * w * 0.86;
          const fy = sy * h * 0.86;
          add(
            bar([sx * c * 0.75, sy * c * 0.75, z], [fx, fy, z], 1.6, 1.6),
            "dark",
            {
              color: MACH,
              texel: 1 / 2,
              lod,
            },
          );
          add(
            new THREE.BoxGeometry(t * 1.2, t * 1.2, d * 2.4).translate(
              fx,
              fy,
              z,
            ),
            "dark",
            {
              color: MACH_DK,
              texel: 1 / 3,
              lod,
            },
          );
        }
      for (const sy of [-1, 1])
        add(bar([0, sy * c, z], [0, sy * h, z], 1.6, 1.6), "dark", {
          color: MACH,
          texel: 1 / 2,
          lod,
        });
    }
  };
  for (const lod of [0, 1])
    for (let i = 0; i < NF; i++) {
      if (podFrames.has(i)) continue;
      frame(FZ[i], lod);
    }
  // LOD 2 (beyond 9 km): the open cage would thin to a sub-pixel line, so the spine is a solid octagonal
  // hull filling the frame envelope (lit grey, darker below), with the pod gap bridged by the same loft
  add(
    loftZ(
      octagon(1, 1, CH),
      [
        { z: Z0, sx: frameW(Z0) * 0.96, sy: frameH(Z0) * 0.96 },
        { z: Z1, sx: frameW(Z1) * 0.96, sy: frameH(Z1) * 0.96 },
      ],
      { capStart: true, texel: 1 / 12 },
    ),
    "hull",
    {
      uv: "keep",
      lod: 2,
      tint: (x, y, z, o) => o.copy(GREY).multiplyScalar(y < -4 ? 0.86 : 1),
    },
  );
  // stringers along the octagon vertices: the four chamfer-side runs span the whole spine (and the pod
  // gap), the top/bottom runs stop either side of the pod
  const kept = [];
  for (let i = 0; i < NF; i++) if (!podFrames.has(i)) kept.push(i);
  const stringer = (fx, fy, z0, z1, w, lod) =>
    add(
      bar(
        [fx * frameW(z0), fy * frameH(z0), z0],
        [fx * frameW(z1), fy * frameH(z1), z1],
        w,
        w,
      ),
      "hull",
      {
        color: GREY,
        texel: 1 / 3,
        lod,
      },
    );
  for (const lod of [0, 1, 2]) {
    const zA = FZ[0];
    const zB = FZ[NF - 1];
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        stringer(sx, sy * CH, zA, zB, lod === 2 ? 3.4 : 2.8, lod);
    if (lod === 2) continue;
    const before = kept.filter((i) => FZ[i] < podZ);
    const after = kept.filter((i) => FZ[i] > podZ);
    for (const run of [before, after]) {
      if (run.length < 2) continue;
      const z0 = FZ[run[0]];
      const z1 = FZ[run[run.length - 1]];
      for (const sx of [-1, 1])
        for (const sy of [-1, 1]) stringer(sx * CH, sy, z0, z1, 2.2, lod);
    }
  }
  // bays: two bays in three carry recessed dark equipment cladding (alternating top/bottom and sides) so
  // the truss reads as a hull with cut-outs; a few open bays get a single side diagonal
  for (let k = 0; k + 1 < kept.length; k++) {
    if (kept[k + 1] - kept[k] !== 1) continue;
    const z0 = FZ[kept[k]];
    const z1 = FZ[kept[k + 1]];
    const zc = (z0 + z1) / 2;
    const len = z1 - z0 - 3.4;
    const w = frameW(zc);
    const h = frameH(zc);
    const mode = k % 3;
    if (mode === 0) {
      for (const lod of [0, 1])
        for (const sy of [-1, 1])
          add(
            new THREE.BoxGeometry(2 * w * CH, 1.2, len).translate(
              0,
              sy * (h - 2.2),
              zc,
            ),
            "dark",
            {
              color: k % 2 ? MACH : MACH_DK,
              texel: 1 / 5,
              lod,
            },
          );
    } else if (mode === 1) {
      for (const lod of [0, 1])
        for (const sx of [-1, 1])
          add(
            new THREE.BoxGeometry(1.2, 2 * h * CH, len).translate(
              sx * (w - 2.2),
              0,
              zc,
            ),
            "dark",
            {
              color: k % 2 ? MACH_DK : MACH,
              texel: 1 / 5,
              lod,
            },
          );
    } else if (k % 4 === 2) {
      const dir = k % 8 === 2 ? 1 : -1;
      for (const sx of [-1, 1])
        add(
          bar(
            [sx * w, dir * frameH(z0) * CH, z0],
            [sx * w, -dir * frameH(z1) * CH, z1],
            1.4,
            1.4,
          ),
          "dark",
          {
            color: MACH,
            texel: 1 / 2,
            lod: 0,
          },
        );
    }
  }
  // equipment hung inside the open bays (LOD 0): tanks on the lower stringers, boxes under the top
  for (let k = 2; k + 1 < kept.length; k += 3) {
    if (kept[k + 1] - kept[k] !== 1) continue;
    const z = (FZ[kept[k]] + FZ[kept[k + 1]]) / 2;
    const side = k % 2 ? 1 : -1;
    const w = frameW(z);
    const h = frameH(z);
    add(tubeZ(2.6, 2.6, 14, 8, side * (w - 4.5), -h + 4, z, false), "dark", {
      color: MACH,
      texel: 1 / 3,
      lod: 0,
    });
    add(
      new THREE.BoxGeometry(5, 3.5, 8).translate(-side * (w - 5.5), h - 3.2, z),
      "hull",
      {
        color: GREY_DK,
        texel: 1 / 3,
        lod: 0,
      },
    );
  }

  // ---------------------------------------------------------------------------
  // command pod mid-spine: capsule on a short pylon, recessed window slots, bridge slit, dishes, boom
  // ---------------------------------------------------------------------------
  const POD = [
    { z: podZ - 52, sx: 3, sy: 2.5 },
    { z: podZ - 44, sx: 10, sy: 9 },
    { z: podZ - 22, sx: 14.5, sy: 13.5 },
    { z: podZ + 6, sx: 15, sy: 14 },
    { z: podZ + 30, sx: 13, sy: 12 },
    { z: podZ + 48, sx: 7, sy: 7 },
  ];
  const podY = 27;
  const collarZ = podZ - 2; // heavy collar station (see pod framing below)
  const podSX = (z) =>
    table(
      POD.map((p) => [p.z, p.sx]),
      z,
    );
  const podSY = (z) =>
    table(
      POD.map((p) => [p.z, p.sy]),
      z,
    );
  for (const lod of [0, 1, 2]) {
    const prof = superellipse(lod === 0 ? 18 : lod === 1 ? 12 : 8, 2.4);
    // LOD 2 carries the pod 1.3x fatter (and a bigger pylon) so it still reads as a bulge at 10 km
    const podK = lod === 2 ? 1.3 : 1;
    add(
      loftZ(
        prof,
        (lod === 2 ? [POD[0], POD[2], POD[3], POD[5]] : POD).map((p) => ({
          ...p,
          sx: p.sx * podK,
          sy: p.sy * podK,
          y: podY,
        })),
        { capStart: true, capEnd: true, texel: 1 / 12 },
      ),
      "hull",
      {
        uv: "keep",
        lod,
        tint: (x, y, z, o) =>
          o.copy(GREY_LT).multiplyScalar(y < podY - 4 ? 0.9 : 1),
      },
    );
    // pylon and dark underside fairing
    add(
      new THREE.BoxGeometry(12 * podK, 18 * podK, 46 * podK).translate(
        0,
        podY - 12,
        podZ - 4,
      ),
      "dark",
      {
        color: MACH_DK,
        texel: 1 / 4,
        lod,
      },
    );
    if (lod < 2) {
      // recessed window slots around the pod's front half
      for (const side of [-1, 1])
        for (let z = podZ - 38; z <= podZ + 22; z += 8) {
          if (Math.abs(z - collarZ) < 10) continue; // under the collar rings
          const v = 3.6 / podSY(z);
          slotWindow(add, {
            c: [
              side * (podSX(z) * superellipseU(v, 2.4) + 0.05),
              podY + 3.6,
              z,
            ],
            n: [side * 0.95, 0.3, 0],
            along: [0, 0, 1],
            len: 5,
            h: 1.6,
            lod,
            panes: 1,
            glow: WINDOW,
            rim: MACH_DK,
          });
        }
      // forward-facing bridge slit on the nose slope
      slotWindow(add, {
        c: [0, podY + 7.6, podZ - 43.5],
        n: [0, 0.55, -0.83],
        along: [1, 0, 0],
        len: 12,
        h: 1.7,
        lod,
        panes: 3,
        glow: WINDOW,
        rim: MACH_DK,
      });
      // dark ring seam, concave dishes on braced masts, antenna cluster
      add(
        loftZ(
          prof,
          [
            {
              z: podZ + 8,
              sx: podSX(podZ + 8) * 1.03,
              sy: podSY(podZ + 8) * 1.03,
              y: podY,
            },
            {
              z: podZ + 12,
              sx: podSX(podZ + 12) * 1.03,
              sy: podSY(podZ + 12) * 1.03,
              y: podY,
            },
          ],
          { capStart: true, capEnd: true },
        ),
        "dark",
        { color: MACH, texel: 1 / 4, lod },
      );
      dishMast(add, {
        base: [-6, podY + podSY(podZ - 6) - 0.5, podZ - 6],
        up: [0, 1, 0],
        height: 8,
        aim: [-0.35, 0.7, -0.62],
        r: 4.6,
        lod,
        mast: MACH,
        dish: GREY_LT,
        braceSpan: 0.5,
      });
      dishMast(add, {
        base: [6, podY + podSY(podZ + 16) - 0.5, podZ + 16],
        up: [0, 1, 0],
        height: 6,
        aim: [0.5, 0.6, -0.62],
        r: 3.4,
        lod,
        mast: MACH,
        dish: GREY_LT,
        braceSpan: 0.5,
      });
      antennaCluster(add, {
        base: [-2, podY + podSY(podZ + 30) - 0.6, podZ + 30],
        up: [0, 1, 0],
        scale: 0.5,
        lod,
        mast: MACH,
        plate: GREY_DK,
      });
    }
  }
  // pod framing, so the capsule is not a bare tank on a post:
  //  - a heavy collar at the pylon station: two raised rings with a dark channel between them and four
  //    lugs (LOD 2 keeps one ring);
  //  - a girder frame cradling the pod: flank girders at mid height, braces down to the chamfer
  //    stringers, ties into the adjacent frames, two arches over the top;
  //  - sensor clusters: a dorsal array plate with lit slits, ear pods on the collar, whip aerials.
  const podTop = (z) => podY + podSY(z);
  for (const lod of [0, 1, 2]) {
    const prof = superellipse(lod === 0 ? 18 : lod === 1 ? 12 : 8, 2.4);
    const ring = (za, zb, k, mat, color) =>
      add(
        loftZ(
          prof,
          [
            { z: za, sx: podSX(za) * k, sy: podSY(za) * k, y: podY },
            { z: zb, sx: podSX(zb) * k, sy: podSY(zb) * k, y: podY },
          ],
          { capStart: true, capEnd: true },
        ),
        mat,
        { color, texel: 1 / 4, lod },
      );
    if (lod === 2) {
      // over the 1.3x LOD 2 pod
      ring(collarZ - 8, collarZ + 8, 1.3 * 1.12, "hull", GREY.getHex());
      continue;
    }
    ring(collarZ - 8.5, collarZ - 2.5, 1.09, "hull", GREY.getHex());
    ring(collarZ + 2.5, collarZ + 8.5, 1.09, "hull", GREY.getHex());
    ring(collarZ - 3, collarZ + 3, 1.035, "dark", MACH_DK);
    for (let q = 0; q < 4; q++) {
      const a = Math.PI / 4 + (q * Math.PI) / 2;
      const g = new THREE.BoxGeometry(5, 3.4, 15);
      g.rotateZ(a - Math.PI / 2);
      g.translate(
        Math.cos(a) * podSX(collarZ) * 1.07,
        podY + Math.sin(a) * podSY(collarZ) * 1.07,
        collarZ,
      );
      add(g, "dark", { color: MACH, texel: 1 / 3, lod });
    }
  }
  {
    const gx = podSX(podZ) + 4.5;
    const gy = podY - 2;
    const zA = podZ - 48;
    const zB = podZ + 44;
    const zPre = Math.max(...FZ.filter((z) => z < podZ - 58));
    const zPost = Math.min(...FZ.filter((z) => z > podZ + 58));
    for (const lod of [0, 1])
      for (const s of [-1, 1]) {
        add(bar([s * gx, gy, zA], [s * gx, gy, zB], 2.4, 2.4), "hull", {
          color: GREY_LT,
          texel: 1 / 3,
          lod,
        });
        // ties from the girder ends into the top corners of the neighbouring cage frames
        add(
          bar(
            [s * gx, gy, zA],
            [s * CH * frameW(zPre), frameH(zPre) - 1.5, zPre],
            2.0,
            2.0,
          ),
          "hull",
          { color: GREY_LT, texel: 1 / 3, lod },
        );
        add(
          bar(
            [s * gx, gy, zB],
            [s * CH * frameW(zPost), frameH(zPost) - 1.5, zPost],
            2.0,
            2.0,
          ),
          "hull",
          { color: GREY_LT, texel: 1 / 3, lod },
        );
        // braces from the chamfer stringers up to the girder
        for (const z of [zA + 4, podZ - 16, podZ + 12, zB - 4])
          add(
            bar([s * frameW(z), CH * frameH(z), z], [s * gx, gy, z], 1.6, 1.6),
            "dark",
            { color: MACH, texel: 1 / 2, lod },
          );
        // arches over the pod (girder -> shoulder -> crown), standing clear of the skin and windows
        for (const z of [podZ - 36, podZ + 20]) {
          const top = podTop(z) + 3;
          const sh = [s * (podSX(z) + 2.5), podY + podSY(z) * 0.8, z];
          add(bar([s * gx, gy, z], sh, 1.8, 1.8), "hull", {
            color: GREY_LT,
            texel: 1 / 3,
            lod,
          });
          add(bar(sh, [s * 7, top, z], 1.8, 1.8), "hull", {
            color: GREY_LT,
            texel: 1 / 3,
            lod,
          });
          if (s > 0)
            add(bar([-7.5, top, z], [7.5, top, z], 1.8, 1.8), "hull", {
              color: GREY_LT,
              texel: 1 / 3,
              lod,
            });
        }
        // ear pods: sensor cylinders on short stalks either side of the collar
        const ex = s * (podSX(collarZ) + 5.5);
        const ey = podY + 5;
        add(
          tubeZ(2.2, 2.2, 10, lod === 0 ? 10 : 6, ex, ey, collarZ, false),
          "dark",
          {
            color: MACH,
            texel: 1 / 3,
            lod,
          },
        );
        add(
          bar(
            [s * podSX(collarZ) * 0.98, ey - 1, collarZ],
            [ex, ey, collarZ],
            1.4,
            1.4,
          ),
          "dark",
          { color: MACH_DK, texel: 1 / 3, lod },
        );
        if (lod === 0)
          add(
            new THREE.BoxGeometry(1.2, 1.2, 1.2).translate(
              ex,
              ey,
              collarZ + 5.6,
            ),
            "windows",
            { color: 0xff6a4a, lod, uv: "keep" },
          );
      }
    // dorsal sensor array plate on the pod's forward top, with lit slits and short rods (LOD 0/1)
    for (const lod of [0, 1]) {
      const z = podZ - 26;
      const y = podTop(z);
      add(new THREE.BoxGeometry(10, 1.2, 12).translate(0, y + 0.4, z), "dark", {
        color: MACH_DK,
        texel: 1 / 4,
        lod,
      });
      for (const dz of [-3.5, 0, 3.5])
        add(
          quadAt([0, y + 1.05, z + dz], [0, 1, 0], [1, 0, 0], 7, 0.7),
          "windows",
          { color: WINDOW, lod, uv: "keep" },
        );
      if (lod === 0)
        for (const [dx, dz] of [
          [-4, -5],
          [4, -5],
          [-4, 5],
          [4, 5],
        ])
          add(bar([dx, y + 1, z + dz], [dx, y + 5, z + dz], 0.5, 0.5), "dark", {
            color: MACH,
            texel: 1 / 3,
            lod,
          });
      // whip aerials aft on the pod top
      for (const dx of [-3, 3])
        add(
          bar(
            [dx, podTop(podZ + 40), podZ + 40],
            [dx, podTop(podZ + 40) + 14, podZ + 41],
            0.5,
            0.5,
          ),
          "dark",
          { color: MACH, texel: 1 / 3, lod },
        );
    }
  }
  // long sensor boom off the pod (LOD 0/1)
  for (const lod of [0, 1])
    add(
      bar([0, podY + 6, podZ + 44], [0, podY + 30, podZ + 86], 1.2, 1.2),
      "dark",
      { color: MACH, texel: 1 / 3, lod },
    );

  // ---------------------------------------------------------------------------
  // aft slab: broad flat wing section with thin swept tips, raised centre ridge, lipped plates, ribs
  // ---------------------------------------------------------------------------
  // arrowhead plan: the leading edge sweeps from the spine out to the stern corners, so the class reads
  // as a broad T from behind and above (widest just forward of the stern; thin swept rear tips)
  const SLAB = [
    { z: 228, sx: 22, sy: 20 },
    { z: 262, sx: 64, sy: 26 },
    { z: 330, sx: 128, sy: 29 },
    { z: 400, sx: 182, sy: 30 },
    { z: 470, sx: 222, sy: 30 },
    { z: 540, sx: 245, sy: 29 },
    { z: zStern, sx: 232, sy: 26 },
  ];
  const slabSX = (z) =>
    table(
      SLAB.map((s) => [s.z, s.sx]),
      z,
    );
  const slabSY = (z) =>
    table(
      SLAB.map((s) => [s.z, s.sy]),
      z,
    );
  const WING_TIP = 0.12;
  const WING_SH = 0.7;
  const slabProf = wingProfile(WING_TIP, WING_SH);
  // section height fraction at |u| (matches wingProfile) and the top-surface slope
  const wingV = (u) => {
    const a = Math.abs(u);
    if (a <= 0.32) return 1;
    if (a <= WING_SH) return 1 - ((a - 0.32) / (WING_SH - 0.32)) * 0.22;
    return 0.78 - ((a - WING_SH) / (1 - WING_SH)) * (0.78 - WING_TIP);
  };
  const wingDV = (u) => {
    const a = Math.abs(u);
    if (a <= 0.32) return 0;
    if (a <= WING_SH) return -0.22 / (WING_SH - 0.32);
    return -(0.78 - WING_TIP) / (1 - WING_SH);
  };
  // point on the slab's top (up = 1) or bottom (up = -1) surface at (x, z) plus its outward normal
  const slabSurf = (x, z, up = 1, lift = 0) => {
    const sx = slabSX(z);
    const sy = slabSY(z);
    const u = x / sx;
    const slope = ((wingDV(u) * sy) / sx) * Math.sign(u);
    const n = new THREE.Vector3(-slope, up, 0).normalize();
    const p = new THREE.Vector3(x, up * wingV(u) * sy, z).addScaledVector(
      n,
      lift,
    );
    return { p: p.toArray(), n: n.toArray() };
  };
  // open strip of the wing section between uLo and uHi lifted dv (fraction of sy); counter-clockwise so
  // it faces outward on the top (up = 1) or bottom (up = -1)
  const wingStrip = (uLo, uHi, dv, up = 1) => {
    const us = [uHi];
    for (const b of [WING_SH, 0.32, -0.32, -WING_SH])
      if (b < uHi - 1e-6 && b > uLo + 1e-6) us.push(b);
    us.push(uLo);
    const pts = us.map((u) => [u, up * (wingV(u) + dv)]);
    return up > 0 ? pts : pts.reverse();
  };
  const slabStations = (z0, z1, n) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const z = z0 + ((z1 - z0) * i) / (n - 1);
      out.push({ z, sx: slabSX(z), sy: slabSY(z) });
    }
    return out;
  };
  const tipFade = (x, z) => 0.5 * smoothstep(0.5, 1, Math.abs(x) / slabSX(z));
  // darker warm band over the last ~150 m of the slab, heaviest at the stern wall
  const sternSoot = (z) => 0.6 * smoothstep(440, zStern, z);
  const slabTint = (x, y, z, o) => {
    mix(GREY, GREY_FADE, tipFade(x, z), o);
    o.lerp(SOOT, sternSoot(z));
    // the base slab shows between the plates as darker seams
    o.multiplyScalar(0.8 * (y < 0 ? 0.92 : 1));
    return o;
  };
  for (const lod of [0, 1, 2])
    add(loftZ(slabProf, SLAB, { capEnd: true, flat: true }), "hull", {
      texel: TEX,
      lod,
      tint:
        lod === 2
          ? (x, y, z, o) => slabTint(x, y, z, o).multiplyScalar(1.2)
          : slabTint,
    });
  // dark neck where the spine enters the slab, with two light emplacements and equipment boxes
  for (const lod of [0, 1, 2])
    add(
      loftZ(roundedRect(lod === 2 ? 1 : 2, 0.3, 0.3), [
        { z: 232, sx: 21, sy: 20 },
        { z: 268, sx: 34, sy: 24 },
      ]),
      "dark",
      { color: MACH_DK, texel: 1 / 5, lod },
    );
  // raised central ridge along the slab top and a keel ridge below (both run into the centre block)
  const ridgeProf = roundedRect(2, 0.5, 0.5);
  for (const lod of [0, 1, 2]) {
    for (const [z0, z1] of [
      [262, 302],
      [518, zStern - 4],
    ])
      add(
        loftZ(
          ridgeProf,
          slabStations(z0, z1, 3).map((s) => ({
            z: s.z,
            sx: 11,
            sy: 5.5,
            y: s.sy + 3.2,
          })),
          { capStart: true, capEnd: true, texel: 1 / 8 },
        ),
        "hull",
        {
          uv: "keep",
          lod,
          tint: (x, y, z, o) => o.copy(GREY_LT).lerp(SOOT, sternSoot(z)),
        },
      );
    add(
      loftZ(
        ridgeProf,
        slabStations(262, zStern - 4, 4).map((s) => ({
          z: s.z,
          sx: 8,
          sy: 4.5,
          y: -s.sy - 2.4,
        })),
        { capStart: true, capEnd: true, texel: 1 / 8 },
      ),
      "hull",
      {
        uv: "keep",
        lod,
        tint: (x, y, z, o) => o.copy(GREY_DK).lerp(SOOT, sternSoot(z)),
      },
    );
  }
  // lipped plates over the top flat and shoulder facets: rows along z, bands in u, staggered edges,
  // ±8 % tone per plate; a few bands are left as dark inset machinery bays
  const plateTint = (base) => (x, y, z, o) => {
    o.copy(base);
    o.lerp(GREY_FADE, tipFade(x, z));
    o.lerp(SOOT, sternSoot(z));
    if (y < 0) o.multiplyScalar(0.92);
    return o;
  };
  const ROWS = [
    [266, 296],
    [300, 340],
    [346, 392],
    [398, 446],
    [452, 500],
    [506, 548],
    [554, 588],
  ];
  const BANDS = [
    [0.245, 0.31],
    [0.34, 0.455],
    [0.475, 0.59],
    [0.61, 0.69],
  ];
  const plateStrip = (uLo, uHi, z0, z1, up, lod, base, dark = false) => {
    const nSt = z1 - z0 > 60 ? 4 : 3;
    const st = slabStations(z0, z1, nSt);
    if (!dark) {
      add(
        loftZ(wingStrip(uLo - 0.006, uHi + 0.006, 0.011, up), st, {
          closed: false,
        }),
        "dark",
        {
          color: MACH_DK,
          texel: 1 / 6,
          lod,
        },
      );
      add(
        loftZ(wingStrip(uLo, uHi, 0.022, up), st, { closed: false }),
        "hull",
        {
          texel: TEX,
          lod,
          tint: plateTint(base),
        },
      );
    } else
      add(
        loftZ(wingStrip(uLo, uHi, 0.006, up), st, { closed: false }),
        "dark",
        {
          color: MACH_DK,
          texel: 1 / 5,
          lod,
        },
      );
  };
  // plates whose inner edge would run into the centre block (|x| < 49 over z 296..524) are skipped
  const clearOfBlock = (uLo, z0, z1) => {
    for (const z of [z0, (z0 + z1) / 2, z1]) {
      if (z < 296 || z > 524) continue;
      if (uLo * slabSX(z) < 49.5) return false;
    }
    return true;
  };
  for (const lod of [0, 1])
    ROWS.forEach(([z0, z1], ri) => {
      BANDS.forEach(([b0, b1], bi) => {
        const stag = ri % 2 ? 0.008 : -0.008;
        const uLo = b0 + (bi ? stag : 0);
        const uHi = b1 + (bi < BANDS.length - 1 ? stag : 0);
        if (!clearOfBlock(uLo - 0.006, z0, z1)) return;
        if (z1 < 298 && bi < 2) return; // the forward row sits outboard of the neck fairing
        for (const side of [-1, 1]) {
          const lo = side > 0 ? uLo : -uHi;
          const hi = side > 0 ? uHi : -uLo;
          // dark inset bays: one shoulder band on two rows
          const inset =
            (ri === 2 && bi === 2 && side > 0) ||
            (ri === 3 && bi === 1 && side < 0);
          const base = jitter((ri + bi) % 3 === 1 ? GREY_LT : GREY, rand, 0.08);
          plateStrip(lo, hi, z0, z1, 1, lod, base, inset);
          // underside: shoulder bands only, alternating plates and dark bays
          if (bi === 1 || bi === 2)
            plateStrip(
              lo,
              hi,
              z0,
              z1,
              -1,
              lod,
              jitter(GREY_DK, rand, 0.08),
              (ri + bi) % 3 === 0,
            );
        }
      });
    });
  // ribbed tip panels: narrow raised strips following the thin swept tips
  for (const lod of [0, 1])
    for (const side of [-1, 1])
      for (let i = 0; i < (lod === 0 ? 6 : 3); i++) {
        const u = lod === 0 ? 0.735 + i * 0.04 : 0.75 + i * 0.08;
        const lo = side > 0 ? u - 0.009 : -u - 0.009;
        const hi = lo + 0.018;
        add(
          loftZ(wingStrip(lo, hi, 0.03, 1), slabStations(342, 552, 5), {
            closed: false,
          }),
          "hull",
          {
            texel: 1 / 6,
            lod,
            tint: plateTint(i % 2 ? GREY_DK : GREY_LT),
          },
        );
        if (lod === 0)
          add(
            loftZ(wingStrip(lo, hi, 0.03, -1), slabStations(350, 540, 4), {
              closed: false,
            }),
            "hull",
            {
              texel: 1 / 6,
              lod,
              tint: plateTint(GREY_DK),
            },
          );
      }
  // accent stripes: dark blue lines along the flat/shoulder break and the tip break
  for (const lod of [0, 1])
    for (const side of [-1, 1])
      for (const [u0, u1, z0, z1] of [
        [0.318, 0.33, 372, 552],
        [0.698, 0.706, 350, 540],
      ]) {
        const lo = side > 0 ? u0 : -u1;
        const hi = side > 0 ? u1 : -u0;
        add(
          loftZ(wingStrip(lo, hi, 0.026, 1), slabStations(z0, z1, 4), {
            closed: false,
          }),
          "paint",
          {
            color: ACCENT,
            lod,
            uv: "keep",
          },
        );
      }
  // hatches at two scales on the flat and shoulder plates (big ones also at LOD 1)
  for (const side of [-1, 1]) {
    for (const [u, z, w, h] of [
      [0.28, 420, 8, 10],
      [0.28, 476, 8, 10],
      [0.4, 370, 9, 11],
      [0.53, 424, 9, 11],
      [0.4, 526, 8, 10],
    ])
      for (const lod of [0, 1]) {
        const q = slabSurf(side * u * slabSX(z), z, 1, 0.66);
        hatch(add, {
          c: q.p,
          n: q.n,
          along: [0, 0, 1],
          w,
          h,
          lod,
          color: GREY_LT,
          rimColor: MACH_DK,
          big: true,
        });
      }
    for (let i = 0; i < 16; i++) {
      const z = 350 + rand() * 195;
      const u = 0.25 + rand() * 0.42;
      if (z < 524 && u * slabSX(z) < 54) continue; // block footprint
      const q = slabSurf(side * u * slabSX(z), z, 1, 0.66);
      hatch(add, {
        c: q.p,
        n: q.n,
        along: [0, 0, 1],
        w: 3 + rand() * 1.5,
        h: 3.5 + rand() * 1.5,
        lod: 0,
        color: rand() < 0.5 ? GREY_LT : GREY_DK,
        rimColor: MACH_DK,
      });
    }
    // vents along the shoulder (LOD 0)
    for (let z = 356; z < 540; z += 22 + rand() * 12) {
      const q = slabSurf(side * 0.465 * slabSX(z), z, 1, 0.5);
      add(quadAt(q.p, q.n, [0, 0, 1], 5 + rand() * 4, 1.8, 0.2), "dark", {
        color: rand() < 0.5 ? MACH : MACH_DK,
        texel: 1 / 3,
        lod: 0,
      });
    }
  }
  // underside: machinery bays, pipe runs (LOD 0/1)
  for (const lod of [0, 1]) {
    for (const x of [-40, -24, 24, 40])
      add(
        tubeZ(
          1.6,
          1.6,
          236,
          lod === 0 ? 6 : 4,
          x,
          -slabSY(430) - 1.7,
          430,
          false,
        ),
        "dark",
        {
          color: MACH,
          texel: 1 / 2,
          lod,
        },
      );
    for (const z of [330, 400, 470, 540])
      add(
        new THREE.BoxGeometry(70, 2.2, 3).translate(0, -slabSY(z) - 1.2, z),
        "dark",
        { color: MACH_DK, texel: 1 / 3, lod },
      );
  }
  // hex insignia on both slab tips (paint)
  for (const side of [-1, 1])
    for (const lod of [0, 1]) {
      const q = slabSurf(side * 0.86 * slabSX(470), 470, 1, 0.3);
      const n = new THREE.Vector3(...q.n);
      const qq = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        n,
      );
      const outer = new THREE.CircleGeometry(16, 6)
        .applyQuaternion(qq)
        .translate(...q.p);
      add(outer, "paint", { color: EMBLEM, lod, uv: "keep" });
      const inner = new THREE.CircleGeometry(11, 6)
        .applyQuaternion(qq)
        .translate(...slabSurf(side * 0.86 * slabSX(470), 470, 1, 0.42).p);
      add(inner, "paint", { lod, uv: "keep", tint: plateTint(GREY) });
    }

  // ---------------------------------------------------------------------------
  // centre block: two set-back tiers plus a bridge cap, recessed window bands, dish and antennas
  // ---------------------------------------------------------------------------
  const T1 = [
    { z: 298, sx: 30, y: 27 + 10, sy: 10 },
    { z: 326, sx: 47, y: 27 + 22, sy: 22 },
    { z: 484, sx: 47, y: 27 + 23, sy: 23 },
    { z: 522, sx: 40, y: 27 + 16, sy: 16 },
  ];
  const T2 = [
    { z: 352, sx: 20, y: 72 + 4, sy: 4 },
    { z: 372, sx: 28, y: 72 + 15, sy: 15 },
    { z: 482, sx: 28, y: 72 + 15, sy: 15 },
    { z: 504, sx: 22, y: 72 + 7, sy: 7 },
  ];
  const T3 = [
    { z: 392, sx: 12, y: 101 + 3, sy: 3 },
    { z: 404, sx: 15, y: 101 + 6, sy: 6 },
    { z: 452, sx: 15, y: 101 + 6, sy: 6 },
    { z: 464, sx: 12, y: 101 + 3, sy: 3 },
  ];
  const t1SX = (z) =>
    table(
      T1.map((t) => [t.z, t.sx]),
      z,
    );
  const t1Top = (z) =>
    table(
      T1.map((t) => [t.z, t.y + t.sy]),
      z,
    );
  const tierTint = (base) => (x, y, z, o) =>
    o.copy(base).multiplyScalar(1 - 0.06 * smoothstep(80, 120, y));
  for (const lod of [0, 1, 2]) {
    const prof = roundedRect(lod === 0 ? 2 : 1, 0.18, 0.18);
    add(
      loftZ(prof, T1, { capStart: true, capEnd: true, texel: 1 / 20 }),
      "hull",
      { uv: "keep", lod, tint: tierTint(GREY) },
    );
    add(
      loftZ(prof, T2, { capStart: true, capEnd: true, texel: 1 / 16 }),
      "hull",
      { uv: "keep", lod, tint: tierTint(GREY_LT) },
    );
    if (lod < 2)
      add(
        loftZ(prof, T3, { capStart: true, capEnd: true, texel: 1 / 10 }),
        "hull",
        { color: GREY, uv: "keep", lod },
      );
  }
  for (const lod of [0, 1]) {
    for (const side of [-1, 1]) {
      // recessed window bands on both tiers: dark band with slot rows inside (tier flanks are at x = 47 / 28)
      add(
        new THREE.BoxGeometry(0.5, 4.2, 132).translate(side * 47.25, 56, 410),
        "dark",
        { color: MACH_DK, texel: 1 / 4, lod },
      );
      slotRow(add, {
        c: [side * 47.55, 56, 410],
        n: [side, 0, 0],
        along: [0, 0, 1],
        count: 8,
        len: 8,
        gap: 6.5,
        h: 1.8,
        lod,
        panes: 2,
        glow: WINDOW,
        rim: MACH_DK,
      });
      if (lod === 0)
        slotRow(add, {
          c: [side * 47.1, 44, 420],
          n: [side, 0, 0],
          along: [0, 0, 1],
          count: 5,
          len: 8,
          gap: 10,
          h: 1.6,
          lod,
          panes: 2,
          glow: WINDOW_WARM,
          rim: MACH_DK,
        });
      add(
        new THREE.BoxGeometry(0.5, 3.6, 92).translate(side * 28.25, 86, 425),
        "dark",
        { color: MACH_DK, texel: 1 / 4, lod },
      );
      slotRow(add, {
        c: [side * 28.55, 86, 425],
        n: [side, 0, 0],
        along: [0, 0, 1],
        count: 6,
        len: 7,
        gap: 7.5,
        h: 1.6,
        lod,
        panes: 2,
        glow: WINDOW,
        rim: MACH_DK,
      });
      // accent stripe on tier 1 and the hex insignia
      add(
        new THREE.BoxGeometry(0.3, 2.2, 150).translate(side * 47.1, 63, 405),
        "paint",
        { color: ACCENT, lod, uv: "keep" },
      );
      const qq = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(side, 0, 0),
      );
      add(
        new THREE.CircleGeometry(6, 6)
          .applyQuaternion(qq)
          .translate(side * 47.2, 37, 468),
        "paint",
        { color: EMBLEM, lod, uv: "keep" },
      );
      add(
        new THREE.CircleGeometry(4, 6)
          .applyQuaternion(qq)
          .translate(side * 47.3, 37, 468),
        "paint",
        { color: GREY.getHex(), lod, uv: "keep" },
      );
      // ribs on the tier 1 flank aft of the window band, a dark inset panel forward
      if (lod === 0)
        for (const z of [486, 494, 502, 510])
          add(
            new THREE.BoxGeometry(0.6, 22, 1.6).translate(
              side * (t1SX(z) + 0.2),
              44,
              z,
            ),
            "hull",
            { color: GREY_DK, texel: 1 / 4, lod },
          );
      add(
        new THREE.BoxGeometry(0.5, 14, 22).translate(side * 47.2, 42, 340),
        "dark",
        { color: MACH_DK, texel: 1 / 4, lod },
      );
    }
    // bridge slit on the tier 2 nose slope (80 m at z 352 -> 102 m at z 372) and sensor slots on the
    // tier 1 ramp (47 m at z 298 -> 71 m at z 326)
    slotWindow(add, {
      c: [0, 89.9, 361],
      n: [0, 0.67, -0.74],
      along: [1, 0, 0],
      len: 30,
      h: 1.8,
      lod,
      panes: 5,
      glow: WINDOW,
      rim: MACH_DK,
    });
    add(bar([0, 53.9, 305.3], [0, 69.6, 323.8], 24, 0.6), "dark", {
      color: MACH_DK,
      texel: 1 / 4,
      lod,
    });
    for (const dx of [-7, 7])
      slotWindow(add, {
        c: [dx, 62.4, 316],
        n: [0, 0.76, -0.65],
        along: [1, 0, 0],
        len: 8,
        h: 1.6,
        lod,
        panes: 2,
        glow: WINDOW,
        rim: MACH_DK,
      });
    // comm dish, antenna cluster and masts on top
    dishMast(add, {
      base: [0, 113, 446],
      up: [0, 1, 0],
      height: 10,
      aim: [0, 0.62, -0.78],
      r: 9,
      lod,
      mast: MACH,
      dish: GREY_LT,
      braceSpan: 0.5,
    });
    antennaCluster(add, {
      base: [-8, 113, 412],
      up: [0, 1, 0],
      scale: 0.9,
      lod,
      mast: MACH,
      plate: GREY_DK,
    });
    add(
      new THREE.CylinderGeometry(0.8, 1.2, 38, 6).translate(9, 113 + 19, 424),
      "dark",
      { color: MACH, texel: 1 / 3, lod },
    );
    for (const side of [-1, 1])
      add(
        new THREE.CylinderGeometry(0.6, 0.8, 22, 6).translate(
          side * 36,
          t1Top(504) + 11,
          504,
        ),
        "dark",
        { color: MACH, texel: 1 / 3, lod },
      );
    // domes on the tier 2 roof
    for (const [x, z, r] of [
      [-18, 386, 4.5],
      [0, 478, 3.8],
    ])
      add(new THREE.SphereGeometry(r, 10, 6).translate(x, 102, z), "hull", {
        color: GREY_LT,
        texel: 1 / 3,
        lod,
      });
  }
  for (let i = 0; i < 14; i++) {
    const z = 396 + rand() * 66;
    const x = (rand() < 0.5 ? -1 : 1) * (16.5 + rand() * 8);
    add(
      new THREE.BoxGeometry(
        3 + rand() * 3,
        1.5 + rand() * 2.5,
        3 + rand() * 5,
      ).translate(x, 102.5, z),
      "dark",
      {
        color: rand() < 0.6 ? MACH : MACH_DK,
        texel: 1 / 3,
        lod: 0,
      },
    );
  }

  // ---------------------------------------------------------------------------
  // tracking turrets: heavy on the slab shoulders (top and belly), light on the tiers and the neck
  // ---------------------------------------------------------------------------
  const heavy = turretType(9, GREY, MACH_DK, 1, { rate: 0.5 });
  const light = turretType(4.4, GREY, MACH_DK, 0, { rate: 0.9, yawLimit: 2.8 });
  const pad = (p, n, r, lod) => {
    const g = new THREE.CylinderGeometry(r, r * 1.08, 1.2, lod === 0 ? 14 : 10);
    g.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(...n),
      ),
    );
    g.translate(...p);
    add(g, "hull", { color: GREY_DK, texel: 1 / 5, lod });
  };
  const place = (type, p, n, r, hpKind, range) => {
    const nn = new THREE.Vector3(...n).normalize();
    const base = new THREE.Vector3(...p).addScaledVector(nn, 0.4);
    for (const lod of [0, 1]) pad(base.toArray(), n, r, lod);
    const k = turrets.length;
    turrets.push({
      type,
      pos: base.clone().addScaledVector(nn, 0.6).toArray(),
      up: nn.toArray(),
      forward: [0, 0, -1],
    });
    hardpoints.push({
      pos: base
        .clone()
        .addScaledVector(nn, r)
        .add(new THREE.Vector3(0, 0, -2 * r))
        .toArray(),
      dir: [Math.sign(p[0]) * 0.4, nn.y * 0.5, -0.75],
      kind: hpKind,
      range,
      turret: k,
    });
    return base.toArray();
  };
  for (const side of [-1, 1]) {
    // top heavies: one on the flat beside the block, one on the shoulder slope
    for (const [x, z] of [
      [side * 66, 338],
      [side * 126, 472],
    ]) {
      const q = slabSurf(x, z, 1, 0);
      place("heavy", q.p, q.n, 12, "heavy", 13000);
      // soot streak aft of the turret
      const pts = [];
      const nrm = [];
      for (let zz = z + 16; zz <= z + 58; zz += 7) {
        const s = slabSurf(x, zz, 1, 0);
        pts.push(s.p);
        nrm.push(s.n);
      }
      sootStreak(add, {
        points: pts,
        normals: nrm,
        halfW: (i) => 6 + i * 1.1,
        base: plateTint(GREY),
        soot: SOOT,
        strength: (i) => 0.72 * (1 - i / pts.length) ** 1.1,
        lod: 0,
        texel: TEX,
        lift: 1.1,
      });
    }
    // belly heavy
    {
      const q = slabSurf(side * 96, 410, -1, 0);
      place("heavy", q.p, q.n, 12, "heavy", 13000);
    }
    // lights on the tier 1 roof beside tier 2, on the tier 2 roof fore and aft of the bridge cap, and
    // the emplacements at the spine-to-slab junction (neck top is at y = 22.7 there)
    for (const [x, y, z] of [
      [side * 39, t1Top(400), 400],
      [side * 39, t1Top(456), 456],
      [side * 20, 102, 380],
      [side * 20, 102, 474],
    ])
      place("light", [x, y, z], [0, 1, 0], 6, "light", 7000);
    place("light", [side * 13, 22.7, 256], [0, 1, 0], 6, "light", 7000);
    // neck equipment boxes and a dark vent
    for (const lod of [0, 1]) {
      add(
        new THREE.BoxGeometry(4, 6, 14).translate(side * 30, -4, 250),
        "dark",
        { color: MACH, texel: 1 / 3, lod },
      );
      add(
        new THREE.BoxGeometry(6, 3, 10).translate(side * 22, 22.5, 240),
        "hull",
        { color: GREY_DK, texel: 1 / 3, lod },
      );
    }
  }
  // scorch rings at fixed points: slab top (two), tier 1 flank, belly
  for (const [x, z, up, r] of [
    [-150, 380, 1, 10],
    [118, 524, 1, 8],
    [70, 456, -1, 9],
  ]) {
    const q = slabSurf(x, z, up, 0.2);
    scorchRing(add, {
      c: q.p,
      n: q.n,
      r,
      base: plateTint(GREY),
      soot: SOOT,
      strength: 0.82,
      lod: 0,
    });
  }
  scorchRing(add, {
    c: [47.3, 34, 372],
    n: [1, 0, 0],
    r: 6,
    base: tierTint(GREY),
    soot: SOOT,
    strength: 0.8,
    lod: 0,
    seg: 12,
  });

  // ---------------------------------------------------------------------------
  // engines: dark stern plate (the slab section at 0.88) inside the sooty stern face, seven deep nozzle
  // bells, glow spill on the plate, soot forward of every mouth
  // ---------------------------------------------------------------------------
  const zS = zStern;
  for (const lod of [0, 1, 2])
    add(plateZ(slabProf, 176, 22, zS - 0.2, zS + 1.2), "dark", {
      color: PLATE.getHex(),
      texel: 1 / 5,
      lod,
    });
  const NOZ = [];
  for (let i = 0; i < 7; i++)
    NOZ.push({ x: -132 + i * 44, y: -1, r: i === 3 ? 15 : 13 });
  // the bells stand 22 m proud of the stern plate (mouth at zS + 20) so they read as bells with depth
  // rather than glow discs on a flat plate
  const MOUTH = zS + 20;
  for (const { x, y, r } of NOZ) {
    let entry;
    for (const lod of [0, 1, 2]) {
      entry = nozzleBell(add, {
        x,
        y,
        zMouth: MOUTH,
        r,
        depth: 28,
        protrude: 22,
        lod,
        shell: SHELL,
        shellDark: SHELL_DK,
      });
      if (lod < 2)
        sternSpill(add, {
          x,
          y,
          zPlate: zS + 1.2,
          r: r + 5.5,
          plate: PLATE,
          lod,
        });
    }
    engines.push(entry);
    // soot streaks on the slab top and bottom forward of the nozzle: ~140 m long, narrow and faint at
    // the head, wide and dense at the stern edge
    for (const lod of [0, 1])
      for (const up of [1, -1]) {
        const pts = [];
        const nrm = [];
        for (let z = 450; z <= 590; z += 10) {
          const s = slabSurf(x, z, up, 0);
          pts.push(s.p);
          nrm.push(s.n);
        }
        sootStreak(add, {
          points: pts,
          normals: nrm,
          halfW: (i) => 3.5 + i * 0.85,
          base: (px, py, pz, o) => slabTint(px, py, pz, o).multiplyScalar(1.25),
          soot: SOOT,
          strength: (i) => 0.85 * smoothstep(0, pts.length - 1, i) ** 0.8,
          lod,
          texel: TEX,
          lift: 1.0,
        });
      }
  }
  // stern structure around the bells: a pylon between every pair of bells and outboard of the end
  // ones (LOD 0/1), a manifold beam across the top and a pipe run along the bottom (LOD 0/1), clamps
  // and pipework between the nozzles (LOD 0)
  for (const lod of [0, 1]) {
    for (let i = 0; i <= NOZ.length; i++) {
      const xp = -154 + i * 44;
      add(
        new THREE.BoxGeometry(5, 34, 15).translate(xp, -1, zS + 7.5),
        "hull",
        { color: GREY_DK.getHex(), texel: 1 / 6, lod },
      );
      add(new THREE.BoxGeometry(3, 30, 2).translate(xp, -1, zS + 16), "dark", {
        color: MACH_DK,
        texel: 1 / 3,
        lod,
      });
    }
    add(bar([-158, 17.5, zS + 9], [158, 17.5, zS + 9], 3.2, 3.2), "dark", {
      color: MACH,
      texel: 1 / 2,
      lod,
    });
    add(bar([-158, -19, zS + 6], [158, -19, zS + 6], 2.4, 2.4), "dark", {
      color: MACH_DK,
      texel: 1 / 2,
      lod,
    });
  }
  for (let i = 0; i + 1 < NOZ.length; i++) {
    const a = NOZ[i];
    const b = NOZ[i + 1];
    add(
      bar(
        [a.x + a.r + 2.5, a.y + 8, zS + 3.4],
        [b.x - b.r - 2.5, b.y + 8, zS + 3.4],
        1.6,
        1.6,
      ),
      "dark",
      { color: MACH, texel: 1 / 2, lod: 0 },
    );
    add(
      new THREE.BoxGeometry(6, 5, 4).translate(
        (a.x + b.x) / 2,
        a.y - 8,
        zS + 3.2,
      ),
      "dark",
      { color: MACH_DK, texel: 1 / 3, lod: 0 },
    );
    for (const yy of [-12, 10])
      add(
        new THREE.BoxGeometry(3.4, 1.6, 12).translate(
          (a.x + b.x) / 2,
          yy,
          zS + 9,
        ),
        "dark",
        { color: MACH, texel: 1 / 2, lod: 0 },
      );
  }

  return assemble(
    {
      id: "recusant",
      side: "separatist",
      length: L,
      parts,
      hardpoints,
      engines,
      bounds: { radius: 640 },
      turretTypes: { heavy, light },
      turrets,
    },
    mats,
  );
}
