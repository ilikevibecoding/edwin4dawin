// Recusant-class light destroyer (Separatist), 1187 m: a spindly skeletal ship — a long thin forward
// spine ending in a spear tip, a wide flat aft block with the engines, exposed frames. Original geometry.
import * as THREE from "three";
import {
  assemble,
  box,
  boxMM,
  cylZ,
  cylY,
  lofted,
  part,
  COLORS,
} from "./shipKit.js";

export const RECUSANT = { length: 1187, width: 300 };

export function buildRecusant(mats) {
  const L = RECUSANT.length;
  const parts = [];
  const col = COLORS.separatistGrey;
  const zBow = -L / 2;
  const zStern = L / 2;
  for (const lod of [0, 1, 2]) {
    // forward spine with a spear tip
    parts.push(
      part(
        lofted(
          [
            { z: zBow, halfW: 3, yBottom: -3, yTop: 3 },
            { z: zBow + 120, halfW: 14, yBottom: -12, yTop: 12 },
            { z: zStern - 380, halfW: 22, yBottom: -20, yTop: 24 },
          ],
          2,
        ),
        "hull",
        { color: col, texel: 1 / 12, lod },
      ),
    );
    // aft block: wide flat, with a raised centre
    parts.push(
      part(
        lofted(
          [
            { z: zStern - 380, halfW: 40, yBottom: -20, yTop: 24 },
            { z: zStern - 300, halfW: 150, yBottom: -30, yTop: 40 },
            { z: zStern - 40, halfW: 150, yBottom: -34, yTop: 44 },
            { z: zStern, halfW: 120, yBottom: -26, yTop: 36 },
          ],
          3,
        ),
        "hull",
        { color: col, texel: 1 / 14, lod },
      ),
    );
    parts.push(
      part(box(0, 70, zStern - 180, 60, 60, 200), "hull", {
        color: col,
        texel: 1 / 10,
        lod,
      }),
    );
    // command pod near the middle of the spine and a forward bulge
    parts.push(
      part(box(0, 32, zStern - 470, 40, 28, 70), "hull", {
        color: col,
        texel: 1 / 8,
        lod,
      }),
    );
    parts.push(
      part(cylZ(18, 18, 90, 12).translate(0, -4, zBow + 380), "hull", {
        color: col,
        texel: 1 / 8,
        lod,
      }),
    );
    if (lod < 2) {
      parts.push(
        part(box(0, 32, zStern - 505.3, 30, 3, 0.6), "windows", {
          color: 0xd0e0ff,
          lod,
          uv: "keep",
        }),
      );
      parts.push(
        part(box(0, 86, zStern - 281, 40, 3, 0.6), "windows", {
          color: 0xd0e0ff,
          lod,
          uv: "keep",
        }),
      );
    }
  }
  // exposed frame ribs along the spine (lod 0/1)
  for (const lod of [0, 1]) {
    for (let i = 0; i < 9; i++) {
      const rz = zBow + 200 + i * 70;
      parts.push(
        part(box(0, 0, rz, 70 + i * 4, 6, 6), "dark", {
          color: 0x4a4d54,
          texel: 1 / 4,
          lod,
        }),
      );
      parts.push(
        part(box(0, 0, rz, 6, 60 + i * 3, 6), "dark", {
          color: 0x4a4d54,
          texel: 1 / 4,
          lod,
        }),
      );
    }
    parts.push(
      part(boxMM([-150, 44, zStern - 300], [150, 46, zStern - 40]), "dark", {
        color: 0x3c3f45,
        texel: 1 / 6,
        lod,
      }),
    );
  }
  // engines: a row of four across the aft block
  const engines = [];
  for (const ex of [-105, -35, 35, 105]) {
    for (const lod of [0, 1, 2]) {
      parts.push(
        part(cylZ(20, 16, 40, 14, true).translate(ex, 4, zStern + 10), "dark", {
          color: 0x44474e,
          texel: 1 / 5,
          lod,
        }),
      );
      parts.push(
        part(cylZ(12, 12, 2, 14).translate(ex, 4, zStern + 2), "engineGlow", {
          color: 0x9fd4ff,
          lod,
          uv: "keep",
        }),
      );
    }
    engines.push({ pos: [ex, 4, zStern + 2], r: 20 });
  }
  const hardpoints = [];
  for (let i = 0; i < 5; i++) {
    const tz = zStern - 300 + i * 55;
    for (const s of [-1, 1]) {
      parts.push(
        part(box(s * 120, 46, tz, 10, 6, 12), "dark", {
          color: 0x50535a,
          texel: 1 / 3,
          lod: 0,
        }),
      );
      hardpoints.push({
        pos: [s * 120, 50, tz],
        dir: [s * 0.4, 0.3, -1],
        kind: i % 2 ? "heavy" : "light",
        range: 12000,
      });
    }
  }
  hardpoints.push({
    pos: [0, 0, zBow + 10],
    dir: [0, 0, -1],
    kind: "heavy",
    range: 14000,
  }); // spinal gun
  return assemble(
    {
      id: "recusant",
      side: "separatist",
      length: L,
      parts,
      hardpoints,
      engines,
      bounds: { radius: 620 },
    },
    mats,
  );
}
