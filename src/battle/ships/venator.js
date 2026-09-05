// Venator-class attack cruiser (Republic), 1137 m. Original geometry after the film's language: long
// arrowhead wedge, wide flat dorsal flight deck with two long door halves and maroon edge stripes, a raised
// rear block carrying two slender bridge towers, forward split prow with a ventral hangar, a stern engine
// cluster, eight heavy dual turbolaser turrets on the dorsal shoulders. Three LODs.
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

export const VENATOR = { length: 1137, width: 548, height: 268 };

export function buildVenator(mats) {
  const L = VENATOR.length;
  const parts = [];
  const hullColor = COLORS.republicHull;
  const zBow = -L / 2;
  const zStern = L / 2;

  // ---- main hull: sections from the bow to the stern (halfW, bottom, top)
  const sections = [
    { z: zBow, halfW: 12, yBottom: -8, yTop: 6 },
    { z: zBow + 120, halfW: 70, yBottom: -28, yTop: 16 },
    { z: zBow + 300, halfW: 150, yBottom: -46, yTop: 30 },
    { z: zBow + 520, halfW: 230, yBottom: -60, yTop: 40 },
    { z: zBow + 760, halfW: 274, yBottom: -68, yTop: 44 },
    { z: zStern - 60, halfW: 274, yBottom: -70, yTop: 44 },
    { z: zStern, halfW: 250, yBottom: -60, yTop: 40 },
  ];
  for (const lod of [0, 1, 2])
    parts.push(
      part(lofted(sections, 4), "hull", {
        color: hullColor,
        texel: 1 / 18,
        lod,
      }),
    );

  // ---- dorsal flight deck: two door halves with a centre seam, raised 10 m above the deck
  const deckZ0 = zBow + 230;
  const deckZ1 = zBow + 720;
  for (const lod of [0, 1, 2]) {
    for (const s of [-1, 1]) {
      parts.push(
        part(
          boxMM([s > 0 ? 3 : -98, 40, deckZ0], [s > 0 ? 98 : -3, 52, deckZ1]),
          "hull",
          { color: hullColor, texel: 1 / 14, lod },
        ),
      );
      // maroon stripes along the outer door edges and a thinner one at the seam
      parts.push(
        part(
          boxMM(
            [s > 0 ? 80 : -98, 52, deckZ0 + 10],
            [s > 0 ? 98 : -80, 52.6, deckZ1 - 10],
          ),
          "paint",
          { color: COLORS.maroon, lod, uv: "keep" },
        ),
      );
      parts.push(
        part(
          boxMM(
            [s > 0 ? 3 : -12, 52, deckZ0 + 10],
            [s > 0 ? 12 : -3, 52.6, deckZ1 - 10],
          ),
          "paint",
          { color: COLORS.maroon, lod, uv: "keep" },
        ),
      );
    }
    // seam groove (dark)
    parts.push(
      part(boxMM([-3, 39, deckZ0], [3, 52.2, deckZ1]), "dark", {
        color: 0x33353a,
        texel: 1 / 6,
        lod,
      }),
    );
    // bow wedge stripe (maroon triangle read: two tapered plates)
    parts.push(
      part(
        lofted(
          [
            { z: zBow + 60, halfW: 12, yBottom: 10, yTop: 12 },
            { z: deckZ0, halfW: 96, yBottom: 34, yTop: 36 },
          ],
          2,
        ),
        "paint",
        { color: COLORS.maroon, lod, uv: "keep" },
      ),
    );
  }

  // ---- shoulder wings (the flat outer decks either side of the flight deck) with red trim lines
  for (const lod of [0, 1]) {
    for (const s of [-1, 1]) {
      parts.push(
        part(
          boxMM(
            [s > 0 ? 100 : -262, 44, deckZ0 + 40],
            [s > 0 ? 262 : -100, 47, deckZ1],
          ),
          "hull",
          { color: hullColor, texel: 1 / 16, lod },
        ),
      );
      parts.push(
        part(
          boxMM(
            [s > 0 ? 240 : -262, 47, deckZ0 + 60],
            [s > 0 ? 262 : -240, 47.6, deckZ1 - 40],
          ),
          "paint",
          { color: COLORS.redTrim, lod, uv: "keep" },
        ),
      );
    }
  }

  // ---- rear block and twin bridge towers
  const blockZ0 = deckZ1;
  const blockZ1 = zStern - 40;
  for (const lod of [0, 1, 2]) {
    parts.push(
      part(
        lofted(
          [
            { z: blockZ0, halfW: 120, yBottom: 40, yTop: 70 },
            { z: blockZ0 + 80, halfW: 150, yBottom: 40, yTop: 110 },
            { z: blockZ1, halfW: 160, yBottom: 40, yTop: 112 },
          ],
          2,
        ),
        "hull",
        { color: hullColor, texel: 1 / 16, lod },
      ),
    );
    for (const s of [-1, 1]) {
      const tx = s * 62;
      const tz = blockZ0 + 170;
      parts.push(
        part(box(tx, 175, tz, 26, 130, 30), "hull", {
          color: hullColor,
          texel: 1 / 10,
          lod,
        }),
      );
      parts.push(
        part(box(tx, 246, tz - 6, 64, 26, 44), "hull", {
          color: hullColor,
          texel: 1 / 8,
          lod,
        }),
      ); // bridge head
      parts.push(
        part(box(tx, 262, tz, 30, 8, 22), "dark", {
          color: 0x3c3f45,
          texel: 1 / 4,
          lod,
        }),
      );
      if (lod < 2) {
        // window rows on the bridge heads and tower shafts
        parts.push(
          part(box(tx, 246, tz - 28.3, 56, 3, 0.6), "windows", {
            color: COLORS.windowWarm,
            lod,
            uv: "keep",
          }),
        );
        for (const dy of [130, 150, 170, 190, 210])
          parts.push(
            part(box(tx, dy, tz - 15.3, 18, 1.4, 0.6), "windows", {
              color: COLORS.windowWarm,
              lod,
              uv: "keep",
            }),
          );
      }
    }
    // connecting deck between the towers and a sensor spar
    parts.push(
      part(box(0, 200, blockZ0 + 170, 100, 10, 24), "hull", {
        color: hullColor,
        texel: 1 / 8,
        lod,
      }),
    );
    parts.push(
      part(cylY(2, 3, 70, 8).translate(0, 240, blockZ0 + 176), "dark", {
        color: 0x50535a,
        texel: 1 / 4,
        lod,
      }),
    );
  }

  // ---- ventral hangar mouth at the bow and belly bays
  for (const lod of [0, 1]) {
    parts.push(
      part(boxMM([-40, -30, zBow + 140], [40, -6, zBow + 320]), "dark", {
        color: 0x26282c,
        texel: 1 / 6,
        lod,
      }),
    );
    parts.push(
      part(boxMM([-38, -8, zBow + 150], [38, -6.5, zBow + 310]), "windows", {
        color: 0xfff0d0,
        lod,
        uv: "keep",
      }),
    ); // lit hangar ceiling glow
    for (const s of [-1, 1])
      parts.push(
        part(
          boxMM(
            [s > 0 ? 120 : -240, -66, zBow + 560],
            [s > 0 ? 240 : -120, -60, zBow + 760],
          ),
          "dark",
          { color: 0x2c2e33, texel: 1 / 8, lod },
        ),
      );
  }

  // ---- engines: 4 main + 4 auxiliary on the stern face
  const engines = [];
  const enginePositions = [
    [-150, -10, 30],
    [-50, -14, 34],
    [50, -14, 34],
    [150, -10, 30],
    [-210, 12, 14],
    [-100, 18, 14],
    [100, 18, 14],
    [210, 12, 14],
  ];
  for (const [ex, ey, r] of enginePositions) {
    for (const lod of [0, 1, 2]) {
      parts.push(
        part(
          cylZ(r, r * 0.8, 40, 16, true).translate(ex, ey, zStern + 10),
          "dark",
          { color: 0x4a4d54, texel: 1 / 6, lod },
        ),
      );
      parts.push(
        part(
          cylZ(r * 0.62, r * 0.62, 2, 16).translate(ex, ey, zStern + 2),
          "engineGlow",
          { color: 0x8fc8ff, lod, uv: "keep" },
        ),
      );
    }
    parts.push(
      part(
        cylZ(r * 0.3, r * 0.3, 2, 12).translate(ex, ey, zStern + 3),
        "engineGlow",
        { color: 0xffffff, lod: 0, uv: "keep" },
      ),
    );
    engines.push({ pos: [ex, ey, zStern + 2], r });
  }

  // ---- heavy dual turbolaser turrets on the dorsal shoulders (lod 0/1), hardpoints for firing
  const hardpoints = [];
  const turretZ = [deckZ0 + 90, deckZ0 + 200, deckZ0 + 310, deckZ0 + 420];
  for (const s of [-1, 1]) {
    for (const tz of turretZ) {
      const tx = s * 200;
      for (const lod of [0, 1]) {
        parts.push(
          part(cylY(14, 15, 8, 14).translate(tx, 51, tz), "hull", {
            color: hullColor,
            texel: 1 / 6,
            lod,
          }),
        );
        parts.push(
          part(box(tx, 60, tz, 26, 12, 22), "dark", {
            color: 0x55585f,
            texel: 1 / 5,
            lod,
          }),
        );
        if (lod === 0) {
          parts.push(
            part(cylZ(1.8, 2.2, 40, 8).translate(tx - 6, 62, tz - 28), "dark", {
              color: 0x40434a,
              texel: 1 / 3,
              lod,
            }),
          );
          parts.push(
            part(cylZ(1.8, 2.2, 40, 8).translate(tx + 6, 62, tz - 28), "dark", {
              color: 0x40434a,
              texel: 1 / 3,
              lod,
            }),
          );
        }
      }
      hardpoints.push({
        pos: [tx, 62, tz - 40],
        dir: [s * 0.35, 0.25, -1],
        kind: "heavy",
        range: 14000,
      });
    }
    // light emplacements along the flank edges
    for (let i = 0; i < 6; i++) {
      const tz = zBow + 380 + i * 90;
      const tx = s * (255 + (tz - zBow) * 0.0);
      parts.push(
        part(box(tx, 46, tz, 8, 6, 10), "dark", {
          color: 0x50535a,
          texel: 1 / 3,
          lod: 0,
        }),
      );
      hardpoints.push({
        pos: [tx, 50, tz],
        dir: [s, 0.3, 0],
        kind: "light",
        range: 6000,
      });
    }
  }

  // ---- greebles on the rear block (lod 0): sensor domes, hatch rows, antenna masts
  for (let i = 0; i < 14; i++) {
    const gx = -140 + (i % 7) * 46 + (i > 6 ? 20 : 0);
    const gz = blockZ0 + 60 + Math.floor(i / 7) * 120;
    parts.push(
      part(box(gx, 116, gz, 14 + (i % 3) * 6, 8 + (i % 2) * 6, 18), "dark", {
        color: 0x5a5d64,
        texel: 1 / 4,
        lod: 0,
      }),
    );
  }
  for (const [gx, gz, r] of [
    [-120, blockZ1 - 40, 9],
    [120, blockZ1 - 40, 9],
    [0, blockZ0 + 40, 12],
  ])
    parts.push(
      part(new THREE.SphereGeometry(r, 14, 10).translate(gx, 112, gz), "hull", {
        color: hullColor,
        texel: 1 / 4,
        lod: 0,
      }),
    );
  for (const [gx, gz] of [
    [-150, blockZ1 - 90],
    [150, blockZ1 - 90],
    [-90, blockZ0 + 30],
  ])
    parts.push(
      part(cylY(1, 1.6, 40, 6).translate(gx, 132, gz), "dark", {
        color: 0x50535a,
        texel: 1 / 3,
        lod: 0,
      }),
    );

  return assemble(
    {
      id: "venator",
      side: "republic",
      length: L,
      parts,
      hardpoints,
      engines,
      bounds: { radius: 600 },
    },
    mats,
  );
}
