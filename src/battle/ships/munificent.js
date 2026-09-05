// Munificent-class star frigate (Separatist), 825 m: a long thin spine ending in a wide forward pincer
// prow, a bulbous aft section with the engine ring, tan hull with dark recesses. Original geometry.
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

export const MUNIFICENT = { length: 825, width: 426 };

export function buildMunificent(mats) {
  const L = MUNIFICENT.length;
  const parts = [];
  const col = COLORS.separatistTan;
  const zBow = -L / 2;
  const zStern = L / 2;
  // spine
  for (const lod of [0, 1, 2]) {
    parts.push(
      part(
        lofted(
          [
            { z: zBow + 200, halfW: 30, yBottom: -20, yTop: 20 },
            { z: zStern - 220, halfW: 44, yBottom: -30, yTop: 30 },
            { z: zStern - 120, halfW: 70, yBottom: -50, yTop: 50 },
            { z: zStern, halfW: 60, yBottom: -40, yTop: 40 },
          ],
          2,
        ),
        "hull",
        { color: col, texel: 1 / 14, lod },
      ),
    );
    // forward pincers: two swept prongs from the spine head to the bow tips
    for (const s of [-1, 1]) {
      const g = lofted(
        [
          { z: zBow + 240, halfW: 40, yBottom: -22, yTop: 22 },
          { z: zBow + 80, halfW: 30, yBottom: -16, yTop: 16 },
          { z: zBow, halfW: 8, yBottom: -6, yTop: 6 },
        ],
        1,
      );
      // shear the prong outward toward the bow
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        const t = Math.max(0, (zBow + 240 - z) / 240);
        pos.setX(i, pos.getX(i) + s * t * 180);
      }
      g.computeVertexNormals();
      parts.push(part(g, "hull", { color: col, texel: 1 / 12, lod }));
    }
    // dorsal and ventral fins on the aft bulb, sensor mast
    parts.push(
      part(
        lofted(
          [
            { z: zStern - 200, halfW: 4, yBottom: 30, yTop: 34 },
            { z: zStern - 120, halfW: 6, yBottom: 50, yTop: 120 },
            { z: zStern - 40, halfW: 4, yBottom: 40, yTop: 90 },
          ],
          1,
        ),
        "hull",
        { color: col, texel: 1 / 10, lod },
      ),
    );
    parts.push(
      part(
        lofted(
          [
            { z: zStern - 200, halfW: 4, yBottom: -34, yTop: -30 },
            { z: zStern - 120, halfW: 6, yBottom: -110, yTop: -50 },
            { z: zStern - 40, halfW: 4, yBottom: -80, yTop: -40 },
          ],
          1,
        ),
        "hull",
        { color: col, texel: 1 / 10, lod },
      ),
    );
    if (lod < 2)
      for (let i = 0; i < 8; i++)
        parts.push(
          part(
            box(0, 14 - (i % 2) * 6, zBow + 260 + i * 60, 60.8, 1.2, 8),
            "windows",
            { color: 0xffe0b0, lod, uv: "keep" },
          ),
        );
  }
  // dark recess bands along the spine
  for (const lod of [0, 1])
    for (const s of [-1, 1])
      parts.push(
        part(
          boxMM(
            [s > 0 ? 30 : -34, -10, zBow + 260],
            [s > 0 ? 34 : -30, 10, zStern - 240],
          ),
          "dark",
          { color: 0x3a3a40, texel: 1 / 5, lod },
        ),
      );
  // engine ring: six nozzles around the aft bulb
  const engines = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const ex = Math.cos(a) * 34;
    const ey = Math.sin(a) * 26;
    for (const lod of [0, 1, 2]) {
      parts.push(
        part(cylZ(11, 9, 30, 12, true).translate(ex, ey, zStern + 8), "dark", {
          color: 0x44474e,
          texel: 1 / 5,
          lod,
        }),
      );
      parts.push(
        part(
          cylZ(6.5, 6.5, 2, 12).translate(ex, ey, zStern + 2),
          "engineGlow",
          { color: 0x9fd4ff, lod, uv: "keep" },
        ),
      );
    }
    engines.push({ pos: [ex, ey, zStern + 2], r: 11 });
  }
  const hardpoints = [];
  for (let i = 0; i < 6; i++) {
    const tz = zBow + 280 + i * 70;
    for (const s of [-1, 1]) {
      parts.push(
        part(box(s * 24, 24, tz, 8, 6, 10), "dark", {
          color: 0x50535a,
          texel: 1 / 3,
          lod: 0,
        }),
      );
      hardpoints.push({
        pos: [s * 24, 28, tz],
        dir: [s * 0.6, 0.4, -0.5],
        kind: i < 2 ? "heavy" : "light",
        range: 11000,
      });
    }
  }
  // prow tips carry heavy guns
  for (const s of [-1, 1])
    hardpoints.push({
      pos: [s * 190, 0, zBow + 40],
      dir: [0, 0, -1],
      kind: "heavy",
      range: 13000,
    });
  return assemble(
    {
      id: "munificent",
      side: "separatist",
      length: L,
      parts,
      hardpoints,
      engines,
      bounds: { radius: 460 },
    },
    mats,
  );
}
