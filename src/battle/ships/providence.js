// Providence-class carrier/destroyer (Separatist), 1088 m: long slender dagger, tall rear command fin
// and a ventral fin, dull blue-grey with a few lit ports. Original geometry.
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

export const PROVIDENCE = { length: 1088, width: 260 };

export function buildProvidence(mats) {
  const L = PROVIDENCE.length;
  const parts = [];
  const col = COLORS.separatistBlue;
  const zBow = -L / 2;
  const zStern = L / 2;
  const sections = [
    { z: zBow, halfW: 6, yBottom: -6, yTop: 6 },
    { z: zBow + 200, halfW: 40, yBottom: -26, yTop: 22 },
    { z: zBow + 500, halfW: 90, yBottom: -46, yTop: 40 },
    { z: zBow + 800, halfW: 130, yBottom: -56, yTop: 52 },
    { z: zStern - 80, halfW: 120, yBottom: -50, yTop: 50 },
    { z: zStern, halfW: 80, yBottom: -36, yTop: 40 },
  ];
  for (const lod of [0, 1, 2])
    parts.push(
      part(lofted(sections, 3), "hull", { color: col, texel: 1 / 16, lod }),
    );
  // rear command fin (tall, thin) with the bridge pod on top; ventral fin
  for (const lod of [0, 1, 2]) {
    parts.push(
      part(
        lofted(
          [
            { z: zStern - 380, halfW: 10, yBottom: 40, yTop: 60 },
            { z: zStern - 260, halfW: 14, yBottom: 40, yTop: 210 },
            { z: zStern - 120, halfW: 12, yBottom: 40, yTop: 250 },
            { z: zStern - 60, halfW: 8, yBottom: 40, yTop: 200 },
          ],
          1,
        ),
        "hull",
        { color: col, texel: 1 / 12, lod },
      ),
    );
    parts.push(
      part(box(0, 252, zStern - 150, 48, 22, 90), "hull", {
        color: col,
        texel: 1 / 8,
        lod,
      }),
    );
    parts.push(
      part(
        lofted(
          [
            { z: zStern - 420, halfW: 8, yBottom: -60, yTop: -46 },
            { z: zStern - 200, halfW: 10, yBottom: -150, yTop: -46 },
            { z: zStern - 80, halfW: 6, yBottom: -110, yTop: -36 },
          ],
          1,
        ),
        "hull",
        { color: col, texel: 1 / 12, lod },
      ),
    );
    if (lod < 2) {
      parts.push(
        part(box(0, 252, zStern - 196, 40, 4, 0.6), "windows", {
          color: 0xffd9a8,
          lod,
          uv: "keep",
        }),
      );
      for (let i = 0; i < 6; i++)
        parts.push(
          part(
            box(0, 70 + i * 26, zStern - 200 + i * 10, 26, 1.2, 0.6),
            "windows",
            { color: 0xffd9a8, lod, uv: "keep" },
          ),
        );
    }
  }
  // hangar arm: a long lit bay along the port flank; dark recessed flank trench
  for (const lod of [0, 1]) {
    parts.push(
      part(boxMM([-140, -20, zBow + 420], [-126, 12, zBow + 760]), "dark", {
        color: 0x30333a,
        texel: 1 / 6,
        lod,
      }),
    );
    parts.push(
      part(boxMM([-141, -12, zBow + 440], [-140.4, 4, zBow + 740]), "windows", {
        color: 0xbfd8ff,
        lod,
        uv: "keep",
      }),
    );
    parts.push(
      part(boxMM([126, -20, zBow + 420], [140, 12, zBow + 760]), "dark", {
        color: 0x30333a,
        texel: 1 / 6,
        lod,
      }),
    );
  }
  // engines: five nozzles across the stern
  const engines = [];
  for (const [ex, ey, r] of [
    [-56, 4, 16],
    [-28, -6, 12],
    [0, 6, 20],
    [28, -6, 12],
    [56, 4, 16],
  ]) {
    for (const lod of [0, 1, 2]) {
      parts.push(
        part(
          cylZ(r, r * 0.8, 36, 14, true).translate(ex, ey, zStern + 10),
          "dark",
          { color: 0x44474e, texel: 1 / 5, lod },
        ),
      );
      parts.push(
        part(
          cylZ(r * 0.6, r * 0.6, 2, 14).translate(ex, ey, zStern + 2),
          "engineGlow",
          { color: 0x8fd0ff, lod, uv: "keep" },
        ),
      );
    }
    engines.push({ pos: [ex, ey, zStern + 2], r });
  }
  // turrets: many light emplacements along the dorsal spine and flanks
  const hardpoints = [];
  for (let i = 0; i < 8; i++) {
    const tz = zBow + 260 + i * 90;
    for (const s of [-1, 1]) {
      const tx = s * (30 + i * 9);
      parts.push(
        part(box(tx, 44 + i * 2, tz, 10, 6, 12), "dark", {
          color: 0x50535a,
          texel: 1 / 3,
          lod: 0,
        }),
      );
      parts.push(
        part(cylZ(1.2, 1.4, 22, 6).translate(tx, 47 + i * 2, tz - 14), "dark", {
          color: 0x40434a,
          texel: 1 / 3,
          lod: 0,
        }),
      );
      hardpoints.push({
        pos: [tx, 47 + i * 2, tz - 20],
        dir: [s * 0.4, 0.3, -1],
        kind: i % 2 ? "heavy" : "light",
        range: 12000,
      });
    }
  }
  return assemble(
    {
      id: "providence",
      side: "separatist",
      length: L,
      parts,
      hardpoints,
      engines,
      bounds: { radius: 580 },
    },
    mats,
  );
}
