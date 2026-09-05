// Recusant-class light destroyer (Separatist), 1187 m. Original procedural geometry after the film's
// design language: an extremely thin skeletal ship — a long forward spine of armour plates over a dark
// core ending in a spear-like spinal gun, an open cage of structural frames, stringers and braces around
// the spine that light passes through, a small command pod mid-spine, a wide flat bevelled aft slab with a
// raised two-tier centre block, a row of engines across the stern, turret emplacements on the aft block,
// light grey hull with dark machinery, plating groups, seams and window strips. Three LODs.
import * as THREE from "three";
import { assemble } from "./shipKit.js";
import {
  bar,
  col,
  discZ,
  flipFaces,
  loftZ,
  mix,
  mpart,
  octagon,
  plateZ,
  ringZ,
  rng,
  roundedRect,
  slabProfile,
  smoothstep,
  superellipse,
  superellipseU,
  table,
  tubeZ,
} from "./munificentGeo.js";

export const RECUSANT = { length: 1187, width: 304, height: 130 };

const GREY = col(0x9a9b9e);
const GREY_LT = col(0xacadb0);
const GREY_DK = col(0x84858a);
const SOOT = col(0x3a3a3e);
const MACH = 0x7a7c82; // machinery tint on the dark texture
const MACH_DK = 0x50525a;
const CORE = 0x3e4046;
const WINDOW = 0xd6e6ff;
const GLOW = 0xa8dcff;
const PLUME = col(0x5aa8ff);

export function buildRecusant(mats) {
  const L = RECUSANT.length;
  const parts = [];
  const hardpoints = [];
  const engines = [];
  const add = (geo, mat, opts) => parts.push(mpart(geo, mat, opts));
  const rand = rng(4421);
  const zBow = -L / 2;
  const zStern = L / 2;

  // ---------------------------------------------------------------------------
  // spear tip / spinal gun: tapered spike with muzzle rings and a heavy collar at the spine root
  // ---------------------------------------------------------------------------
  const SPIKE = [
    { z: zBow, sx: 1.4, sy: 1.4 },
    { z: zBow + 10, sx: 3.2, sy: 3.2 },
    { z: zBow + 40, sx: 5.4, sy: 5.4 },
    { z: zBow + 90, sx: 7.6, sy: 7.6 },
    { z: zBow + 140, sx: 9.6, sy: 9.6 },
    { z: zBow + 178, sx: 12, sy: 12 },
  ];
  for (const lod of [0, 1, 2]) {
    const prof = superellipse(lod === 0 ? 12 : 8, 2);
    add(
      loftZ(prof, lod === 2 ? [SPIKE[0], SPIKE[2], SPIKE[5]] : SPIKE, {
        capStart: true,
      }),
      "hull",
      {
        color: GREY,
        texel: 1 / 8,
        lod,
      },
    );
    // barrel collar where the spike meets the spine
    add(
      tubeZ(15, 13.5, 16, lod === 0 ? 12 : 8, 0, 0, zBow + 184, false),
      "dark",
      {
        color: MACH,
        texel: 1 / 4,
        lod,
      },
    );
    if (lod < 2) {
      add(tubeZ(9.2, 9.2, 4, 10, 0, 0, zBow + 56, false), "dark", {
        color: MACH_DK,
        texel: 1 / 3,
        lod,
      });
      add(tubeZ(10.8, 10.8, 5, 10, 0, 0, zBow + 118, false), "dark", {
        color: MACH_DK,
        texel: 1 / 3,
        lod,
      });
      add(tubeZ(4.6, 4.6, 3, 8, 0, 0, zBow + 26, false), "dark", {
        color: MACH_DK,
        texel: 1 / 3,
        lod,
      });
    }
  }
  // four longitudinal gun ribs (LOD 0)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const at = (z, r) => [Math.cos(a) * r, Math.sin(a) * r, z];
    add(bar(at(zBow + 60, 9.2), at(zBow + 176, 12.6), 2.4, 2.4), "hull", {
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
  const Z0 = zBow + 176;
  const Z1 = 262;
  const coreS = (z) => 12 + ((z - Z0) / (Z1 - Z0)) * 8;
  const coreProf = roundedRect(2, 0.3, 0.3);
  for (const lod of [0, 1, 2])
    add(
      loftZ(lod === 2 ? roundedRect(1, 0.3, 0.3) : coreProf, [
        { z: Z0, sx: coreS(Z0) * 0.86, sy: coreS(Z0) * 0.86 },
        { z: Z1, sx: coreS(Z1) * 0.86, sy: coreS(Z1) * 0.86 },
      ]),
      lod === 2 ? "hull" : "dark",
      { color: lod === 2 ? GREY_DK : CORE, texel: 1 / 5, lod },
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
  // armour plates over the dark core: one per pair of bays, leaving exposed core gaps
  for (const lod of [0, 1]) {
    for (let i = 0; i + 2 < NF; i += 2) {
      const za = FZ[i] + 3;
      const zb = FZ[i + 2] - 9;
      const k = i % 4 ? 1 : 1.04;
      const tone = i % 6 === 0 ? GREY_LT : i % 6 === 2 ? GREY : GREY_DK;
      add(
        loftZ(
          coreProf,
          [
            { z: za, sx: coreS(za) * k, sy: coreS(za) * k },
            { z: zb, sx: coreS(zb) * k, sy: coreS(zb) * k },
          ],
          { capStart: true, capEnd: true },
        ),
        "hull",
        { color: tone, texel: 1 / 8, lod },
      );
      // lit slots and a dark hatch on alternate plates
      if (i % 4 === 0)
        for (const side of [-1, 1])
          for (let w = 0; w < 3; w++)
            add(
              new THREE.BoxGeometry(0.6, 0.9, 3.2).translate(
                side * (coreS(za) * k + 0.3),
                1.5,
                za + 8 + w * 7,
              ),
              "windows",
              { color: WINDOW, lod, uv: "keep" },
            );
      if (lod === 0)
        add(
          new THREE.BoxGeometry(6, 0.5, 8).translate(
            0,
            coreS((za + zb) / 2) * k + 0.2,
            (za + zb) / 2,
          ),
          "dark",
          { color: MACH, texel: 1 / 3, lod },
        );
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
  // structural cage: rectangular frames, corner stringers, diagonal braces, struts to the core
  // ---------------------------------------------------------------------------
  // a rib: deep flat octagonal ring frame, joint blocks at the chamfers, struts to the core
  const CH = 0.6; // chamfer fraction of the octagon frames
  const frame = (z, lod) => {
    const w = frameW(z);
    const h = frameH(z);
    const t = 4.4 + ((z - Z0) / (Z1 - Z0)) * 1.8; // radial depth of the rib
    const d = lod === 2 ? 3.6 : 2.6; // thickness along z
    add(
      ringZ(octagon(w, h, CH), octagon(w - t, h - t, CH), z - d / 2, z + d / 2),
      "hull",
      {
        color: lod === 2 ? GREY : GREY_LT,
        texel: 1 / 3,
        lod,
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
  for (const lod of [0, 1, 2])
    for (let i = 0; i < NF; i++) {
      if (podFrames.has(i)) continue;
      if (lod === 2 && i % 3) continue;
      frame(FZ[i], lod);
    }
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
      { color: GREY, texel: 1 / 3, lod },
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
          { color: MACH, texel: 1 / 2, lod: 0 },
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
  // command pod mid-spine: capsule on a short pylon, window band, sensor dishes, dark underside
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
    add(
      loftZ(
        prof,
        (lod === 2 ? [POD[0], POD[2], POD[3], POD[5]] : POD).map((p) => ({
          ...p,
          y: podY,
        })),
        {
          capStart: true,
          capEnd: true,
        },
      ),
      "hull",
      { color: GREY_LT, texel: 1 / 7, lod },
    );
    // pylon and dark underside fairing
    add(
      new THREE.BoxGeometry(12, 18, 46).translate(0, podY - 12, podZ - 4),
      "dark",
      {
        color: MACH_DK,
        texel: 1 / 4,
        lod,
      },
    );
    if (lod < 2) {
      // window band around the pod's front half
      for (const side of [-1, 1])
        for (let z = podZ - 40; z <= podZ + 20; z += 5.5) {
          const v = 3.5 / podSY(z);
          add(
            new THREE.BoxGeometry(0.6, 1.0, 3.4).translate(
              side * (podSX(z) * superellipseU(v, 2.4) + 0.3),
              podY + 3.5,
              z,
            ),
            "windows",
            { color: WINDOW, lod, uv: "keep" },
          );
        }
      // forward-facing bridge slit
      add(
        new THREE.BoxGeometry(12, 1.2, 0.6).translate(0, podY + 3, podZ - 45.5),
        "windows",
        {
          color: WINDOW,
          lod,
          uv: "keep",
        },
      );
      // dark ring seam and two dishes on top
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
      for (const [dx, dz, r] of [
        [-7, podZ - 6, 4.2],
        [6, podZ + 16, 3.2],
      ]) {
        add(
          new THREE.CylinderGeometry(0.7, 0.9, 9, 6).translate(
            dx,
            podY + podSY(dz) + 4,
            dz,
          ),
          "dark",
          {
            color: MACH,
            texel: 1 / 3,
            lod,
          },
        );
        add(
          new THREE.CylinderGeometry(r, r * 0.4, 1.6, 10).translate(
            dx,
            podY + podSY(dz) + 8.5,
            dz,
          ),
          "hull",
          {
            color: GREY_LT,
            texel: 1 / 3,
            lod,
          },
        );
      }
    }
  }
  // long sensor boom off the pod (LOD 0/1)
  for (const lod of [0, 1])
    add(
      bar([0, podY + 6, podZ + 44], [0, podY + 30, podZ + 86], 1.2, 1.2),
      "dark",
      {
        color: MACH,
        texel: 1 / 3,
        lod,
      },
    );

  // ---------------------------------------------------------------------------
  // aft slab: wide flat bevelled body, plating seams, underside machinery, keel
  // ---------------------------------------------------------------------------
  const SLAB = [
    { z: 228, sx: 20, sy: 19 },
    { z: 262, sx: 58, sy: 24 },
    { z: 330, sx: 150, sy: 28 },
    { z: 470, sx: 152, sy: 29 },
    { z: 556, sx: 146, sy: 27 },
    { z: zStern, sx: 128, sy: 23 },
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
  const slabTint = (x, y, z, o) => {
    mix(GREY, SOOT, 0.7 * smoothstep(535, zStern, z), o);
    if (y < 0) o.multiplyScalar(0.93);
  };
  const slabProf = slabProfile(0.12, 0.5);
  for (const lod of [0, 1, 2])
    add(loftZ(slabProf, SLAB, { capEnd: true, flat: true }), "hull", {
      texel: 1 / 14,
      lod,
      tint: slabTint,
    });
  // dark neck where the spine enters the slab
  for (const lod of [0, 1])
    add(
      loftZ(roundedRect(2, 0.3, 0.3), [
        { z: 232, sx: 21, sy: 20 },
        { z: 268, sx: 34, sy: 24 },
      ]),
      "dark",
      { color: MACH_DK, texel: 1 / 5, lod },
    );
  // top plating: raised plate groups, cross seams, longitudinal grooves
  for (const lod of [0, 1]) {
    const top = (z) => slabSY(z) + 0.01;
    const groups = [
      [-136, -70, 342, 420],
      [-136, -70, 428, 520],
      [70, 136, 342, 420],
      [70, 136, 428, 520],
      [-62, -28, 300, 380],
      [28, 62, 300, 380],
      [-62, 62, 528, 566],
    ];
    groups.forEach(([x0, x1, z0, z1], gi) => {
      const zc = (z0 + z1) / 2;
      add(
        new THREE.BoxGeometry(x1 - x0, 1.4, z1 - z0).translate(
          (x0 + x1) / 2,
          top(zc) + 0.6,
          zc,
        ),
        "hull",
        { color: gi % 2 ? GREY_LT : GREY_DK, texel: 1 / 12, lod },
      );
    });
    // raised armour lips along the slab's outer edges
    for (const side of [-1, 1]) {
      add(
        new THREE.BoxGeometry(7, 1.8, 216).translate(
          side * (slabSX(450) - 5),
          top(450) + 0.7,
          450,
        ),
        "hull",
        {
          color: GREY_LT,
          texel: 1 / 6,
          lod,
        },
      );
      // sloped forward edge lip following the flare
      add(
        bar(
          [side * 26, top(268) + 0.8, 268],
          [side * (slabSX(330) - 5), top(330) + 0.8, 332],
          7,
          1.8,
        ),
        "hull",
        {
          color: GREY_LT,
          texel: 1 / 6,
          lod,
        },
      );
    }
    for (const z of [336, 424, 524])
      add(
        new THREE.BoxGeometry(2 * slabSX(z) * 0.94, 0.5, 1.6).translate(
          0,
          top(z) + 0.2,
          z,
        ),
        "dark",
        {
          color: MACH_DK,
          texel: 1 / 3,
          lod,
        },
      );
    for (const x of [-66, 66])
      add(
        new THREE.BoxGeometry(1.6, 0.5, 250).translate(x, top(440) + 0.2, 440),
        "dark",
        {
          color: MACH_DK,
          texel: 1 / 3,
          lod,
        },
      );
    // underside: machinery bays, pipe runs, keel ridge
    for (const [x, z, w, l] of [
      [-95, 400, 70, 120],
      [95, 400, 70, 120],
      [0, 470, 60, 150],
    ])
      add(
        new THREE.BoxGeometry(w, 1.6, l).translate(x, -slabSY(z) - 0.5, z),
        "dark",
        {
          color: MACH_DK,
          texel: 1 / 6,
          lod,
        },
      );
    add(
      new THREE.BoxGeometry(14, 6, 290).translate(0, -slabSY(430) - 2.5, 430),
      "hull",
      {
        color: GREY_DK,
        texel: 1 / 6,
        lod,
      },
    );
    if (lod === 0)
      for (const x of [-40, -24, 24, 40])
        add(
          tubeZ(1.6, 1.6, 240, 6, x, -slabSY(430) - 1.6, 430, false),
          "dark",
          {
            color: MACH,
            texel: 1 / 2,
            lod,
          },
        );
  }
  // greebles across the slab top (LOD 0): hatches, vents, small boxes
  for (let i = 0; i < 40; i++) {
    const z = 300 + rand() * 260;
    const x = (rand() - 0.5) * 2 * (slabSX(z) - 20);
    if (Math.abs(x) < 56 && z > 296 && z < 526) continue; // centre block footprint
    const w = 3 + rand() * 7;
    const d = 3 + rand() * 7;
    const dark = rand() < 0.55;
    add(
      new THREE.BoxGeometry(w, 1 + rand() * 2.5, d).translate(
        x,
        slabSY(z) + 1.4 + 0.8,
        z,
      ),
      dark ? "dark" : "hull",
      {
        color: dark ? MACH : rand() < 0.5 ? GREY_LT : GREY_DK,
        texel: 1 / 3,
        lod: 0,
      },
    );
  }
  // flank recess bands and window strips along the slab sides
  for (const lod of [0, 1])
    for (const side of [-1, 1]) {
      add(
        new THREE.BoxGeometry(0.6, 5, 200).translate(
          side * (slabSX(440) + 0.2),
          4,
          440,
        ),
        "dark",
        {
          color: MACH_DK,
          texel: 1 / 4,
          lod,
        },
      );
      for (let z = 350; z <= 540; z += 12)
        add(
          new THREE.BoxGeometry(0.6, 1.0, 5).translate(
            side * (slabSX(z) + 0.35),
            -6,
            z,
          ),
          "windows",
          {
            color: WINDOW,
            lod,
            uv: "keep",
          },
        );
    }

  // ---------------------------------------------------------------------------
  // raised centre block: two tiers with a sloped bridge face, window rows, greebles
  // ---------------------------------------------------------------------------
  const T1 = [
    { z: 298, sx: 30, y: 27 + 11, sy: 11 },
    { z: 328, sx: 46, y: 27 + 22, sy: 22 },
    { z: 480, sx: 48, y: 27 + 23, sy: 23 },
    { z: 522, sx: 40, y: 27 + 17, sy: 17 },
  ];
  const T2 = [
    { z: 348, sx: 20, y: 72 + 4, sy: 4 },
    { z: 370, sx: 28, y: 72 + 14, sy: 14 },
    { z: 462, sx: 28, y: 72 + 15, sy: 15 },
    { z: 492, sx: 22, y: 72 + 7, sy: 7 },
  ];
  for (const lod of [0, 1, 2]) {
    const prof = roundedRect(lod === 0 ? 2 : 1, 0.18, 0.18);
    add(loftZ(prof, T1, { capStart: true, capEnd: true }), "hull", {
      color: GREY,
      texel: 1 / 10,
      lod,
    });
    add(loftZ(prof, T2, { capStart: true, capEnd: true }), "hull", {
      color: GREY_LT,
      texel: 1 / 8,
      lod,
    });
  }
  for (const lod of [0, 1]) {
    for (const side of [-1, 1]) {
      // window rows on both tiers' flanks
      for (let z = 340; z <= 470; z += 9)
        add(
          new THREE.BoxGeometry(0.6, 1.1, 5).translate(side * 48.4, 56, z),
          "windows",
          {
            color: WINDOW,
            lod,
            uv: "keep",
          },
        );
      if (lod === 0)
        for (let z = 344; z <= 466; z += 9)
          add(
            new THREE.BoxGeometry(0.6, 0.9, 4).translate(side * 48.4, 66, z),
            "windows",
            {
              color: WINDOW,
              lod,
              uv: "keep",
            },
          );
      for (let z = 380; z <= 450; z += 8)
        add(
          new THREE.BoxGeometry(0.6, 1.1, 4.5).translate(side * 28.4, 84, z),
          "windows",
          {
            color: WINDOW,
            lod,
            uv: "keep",
          },
        );
      // dark recess bands on tier 1
      add(
        new THREE.BoxGeometry(0.6, 4, 120).translate(side * 48.3, 40, 410),
        "dark",
        {
          color: MACH_DK,
          texel: 1 / 4,
          lod,
        },
      );
    }
    // front bridge slit on tier 2 and a dark sensor panel on the tier 1 ramp
    add(
      new THREE.BoxGeometry(34, 1.4, 0.6).translate(0, 84, 369.6),
      "windows",
      {
        color: WINDOW,
        lod,
        uv: "keep",
      },
    );
    add(bar([0, 44, 306], [0, 66, 326], 26, 0.6), "dark", {
      color: MACH_DK,
      texel: 1 / 4,
      lod,
    });
    // roof greebles: domes, masts, boxes
    for (const [x, z, r] of [
      [-16, 400, 5],
      [14, 440, 4],
    ])
      add(new THREE.SphereGeometry(r, 10, 6).translate(x, 87, z), "hull", {
        color: GREY_LT,
        texel: 1 / 3,
        lod,
      });
    add(
      new THREE.CylinderGeometry(0.9, 1.3, 40, 6).translate(0, 87 + 20, 476),
      "dark",
      {
        color: MACH,
        texel: 1 / 3,
        lod,
      },
    );
    add(
      new THREE.CylinderGeometry(6, 6, 0.9, 10).translate(0, 127, 476),
      "hull",
      { color: GREY_LT, texel: 1 / 3, lod },
    );
    for (const side of [-1, 1])
      add(
        new THREE.CylinderGeometry(0.6, 0.8, 22, 6).translate(
          side * 36,
          50 + 11,
          500,
        ),
        "dark",
        {
          color: MACH,
          texel: 1 / 3,
          lod,
        },
      );
  }
  for (let i = 0; i < 14; i++) {
    const z = 380 + rand() * 90;
    const x = (rand() - 0.5) * 40;
    add(
      new THREE.BoxGeometry(
        3 + rand() * 5,
        1.5 + rand() * 3,
        3 + rand() * 6,
      ).translate(x, 87.5, z),
      "dark",
      {
        color: rand() < 0.6 ? MACH : MACH_DK,
        texel: 1 / 3,
        lod: 0,
      },
    );
  }

  // ---------------------------------------------------------------------------
  // turrets: heavy on the slab shoulders and belly, light on the block roofs
  // ---------------------------------------------------------------------------
  const turret = (x, y, z, size, up, lod, tint = GREY) => {
    const seg = lod === 0 ? 12 : 8;
    const base = new THREE.CylinderGeometry(
      size * 1.1,
      size * 1.2,
      size * 0.8,
      seg,
    );
    base.translate(x, y + up * size * 0.2, z);
    add(base, "hull", { color: tint, texel: 1 / 5, lod });
    const h = new THREE.BoxGeometry(size * 1.7, size * 0.8, size * 1.9);
    h.translate(x, y + up * size * 0.95, z + size * 0.15);
    add(h, "dark", { color: MACH, texel: 1 / 4, lod });
    if (lod === 0) {
      const dome = new THREE.SphereGeometry(size * 0.6, 10, 6);
      dome.scale(1, 0.6, 1.1);
      dome.translate(x, y + up * size * 1.35, z + size * 0.1);
      add(dome, "hull", { color: tint, texel: 1 / 4, lod });
    }
    const len = size * 4.4;
    const nb = lod === 0 ? 2 : 1;
    for (let b = 0; b < nb; b++) {
      const bx = x + (nb === 2 ? (b ? 0.34 : -0.34) * size : 0);
      add(
        tubeZ(
          size * 0.15,
          size * 0.19,
          len,
          lod === 0 ? 7 : 5,
          bx,
          y + up * size * 1.0,
          z - size * 0.8 - len / 2,
          false,
        ),
        "dark",
        { color: MACH_DK, texel: 1 / 3, lod },
      );
    }
    return [x, y + up * size, z - size * 0.8 - len];
  };
  for (const side of [-1, 1]) {
    for (const [x, z] of [
      [104, 314],
      [122, 468],
    ]) {
      let m;
      for (const lod of [0, 1]) m = turret(side * x, slabSY(z), z, 8, 1, lod);
      hardpoints.push({
        pos: m,
        dir: [side * 0.45, 0.4, -0.8],
        kind: "heavy",
        range: 13000,
      });
    }
    {
      let m;
      for (const lod of [0, 1])
        m = turret(side * 92, -slabSY(400), 400, 7.5, -1, lod, GREY_DK);
      hardpoints.push({
        pos: m,
        dir: [side * 0.4, -0.6, -0.7],
        kind: "heavy",
        range: 13000,
      });
    }
    for (const [x, y, z] of [
      [20, 87, 392],
      [20, 87, 456],
      [40, 72, 502],
    ]) {
      let m;
      for (const lod of [0, 1]) m = turret(side * x, y, z, 4.5, 1, lod);
      hardpoints.push({
        pos: m,
        dir: [side * 0.5, 0.5, -0.7],
        kind: "light",
        range: 7000,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // engines: a row of seven across the stern face, depth, glow discs and additive plumes
  // ---------------------------------------------------------------------------
  const zS = zStern;
  for (const lod of [0, 1, 2])
    add(plateZ(slabProf, 128 * 0.96, 23 * 0.9, zS - 0.4, zS + 1.2), "dark", {
      color: 0x5e6066,
      texel: 1 / 5,
      lod,
    });
  // soft engine glow spill across the stern plate behind the nozzle row, fading toward the slab edges
  for (const lod of [0, 1])
    add(
      new THREE.PlaneGeometry(292, 40, 1, 4).translate(0, -1, zS + 1.9),
      "plumeAdd",
      {
        lod,
        uv: "keep",
        tint: (px, py, pz, o) =>
          o
            .copy(PLUME)
            .multiplyScalar(
              0.24 * (1 - Math.min(1, Math.abs(py + 1) / 20)) ** 1.5,
            ),
      },
    );
  for (let i = 0; i < 7; i++) {
    const x = -132 + i * 44;
    const y = -1;
    const r = i === 3 ? 15.5 : 14;
    for (const lod of [0, 1, 2]) {
      const seg = lod === 0 ? 16 : lod === 1 ? 10 : 7;
      if (lod < 2) {
        add(tubeZ(r + 1.8, r + 0.4, 24, seg, x, y, zS + 13), "dark", {
          texel: 1 / 4,
          lod,
          tint: (px, py, pz, o) =>
            o
              .setHex(0x6a6c72)
              .multiplyScalar(1 - 0.45 * smoothstep(zS + 4, zS + 25, pz)),
        });
        add(
          flipFaces(tubeZ(r + 0.4, r * 0.42, 22, seg, x, y, zS + 14)),
          "dark",
          {
            color: 0x34363a,
            texel: 1 / 4,
            lod,
          },
        );
        if (lod === 0)
          add(
            tubeZ(r + 2.4, r + 2.4, 1.6, seg, x, y, zS + 24.4, false),
            "dark",
            {
              color: 0x8a8c92,
              texel: 1 / 3,
              lod,
            },
          );
      } else {
        add(tubeZ(r + 1.8, r + 0.4, 12, seg, x, y, zS + 7), "dark", {
          color: 0x5a5c62,
          texel: 1 / 4,
          lod,
        });
      }
      add(discZ(r * 0.48, seg, x, y, zS + 4), "engineGlow", {
        color: GLOW,
        lod,
        uv: "keep",
      });
      if (lod < 2)
        add(discZ(r * 0.24, 8, x, y, zS + 4.6), "engineGlow", {
          lod,
          uv: "keep",
          tint: (px, py, pz, o) => o.setRGB(1.6, 1.7, 1.8),
        });
      const len = r * 8;
      add(
        tubeZ(
          r * 0.12,
          r * 0.9,
          len,
          lod === 0 ? 12 : 8,
          x,
          y,
          zS + 25 + len / 2,
        ),
        "plumeAdd",
        {
          lod,
          uv: "keep",
          tint: (px, py, pz, o) => {
            const k = Math.min(1, Math.max(0, (pz - (zS + 25)) / len));
            o.copy(PLUME).multiplyScalar(1.5 * (1 - k) ** 1.7);
          },
        },
      );
    }
    engines.push({ pos: [x, y, zS + 4], r });
  }

  return assemble(
    {
      id: "recusant",
      side: "separatist",
      length: L,
      parts,
      hardpoints,
      engines,
      bounds: { radius: 610 },
    },
    mats,
  );
}
