// Engine pods of the Consular-class (Charger c70) frigate: three 19.5 m Dyne 577 cylinders in a row
// across the stern. Each pod is a plated cylinder (18.5 m) ending in a deep recessed nozzle with a lit
// gradient interior and a trim ring round the mouth, a cream ring / blue-grey "ion generator" band /
// cream ring group ahead of the body, a 4.5 m forward cone with a dark atomizer nub, raised grille
// panels top and bottom, a hatch plate, seam rings, flank greebles, a sensor bulb on the outboard
// flank and soot toward the mouth. Aft of the radiator wing a flat machinery plate with a grille box
// and pipes bridges each gap between neighbouring pods. The framework draws the plume and glow disc
// for every `engines[]` entry; the hull only carries the bell.
import * as THREE from "three";
import { bellGradient } from "./munificentEngines.js";
import {
  bar,
  flipFaces,
  loftZ,
  mix,
  ringZ,
  smoothstep,
  superellipse,
  tubeZ,
} from "./munificentGeo.js";

export const POD = {
  r: 9.75, // body radius
  ringR: 10.0, // cream rings
  bandR: 10.1, // ion generator band
  mouthR: 8.2, // nozzle mouth (inside the rim)
  coneR: 6.0, // forward cap radius
  zCone: 110, // from the nose: forward cap
  zRing0: 114.5,
  zBand0: 116,
  zBand1: 119.2,
  zRing1: 120.5, // body begins
  zAft: 139, // stern face
  zTrim: 136.4, // trim ring begins
};

/**
 * One pod at (x, y). Z(zn) maps nose-relative metres onto ship z. `pal` supplies THREE.Colors: hull,
 * hullDark, hullLight, trim (plated cream), trimP (painted cream), band, soot, and hex `dark`,
 * `darkDeep`. `bulb` (-1 | 0 | 1) puts the sensor bulb on that flank (outboard side of the outer
 * pods). Returns the engines[] entry.
 */
export function enginePod(add, { x, y, Z, lod, pal, texel, bulb = 0 }) {
  const n = lod === 0 ? 24 : lod === 1 ? 14 : 12;
  const prof = superellipse(n, 2);
  const st = (zn, r) => ({ z: Z(zn), sx: r, sy: r, x, y });
  const R = POD.r;
  // body: soot rises toward the mouth, the last 2.6 m are the trim ring, the belly is a touch darker
  const bodyTint = (px, py, pz, o) => {
    if (pz > Z(POD.zTrim) - 0.01) return o.copy(pal.trim);
    mix(pal.hull, pal.soot, 0.45 * smoothstep(Z(126), Z(136), pz), o);
    if (py < y - 4) o.multiplyScalar(0.92);
    return o;
  };
  const bodyStations =
    lod === 2
      ? [st(POD.zRing1, R), st(POD.zAft, R)]
      : [
          st(POD.zRing1, R),
          st(129, R),
          st(POD.zTrim, R),
          st(POD.zTrim + 0.02, R),
          st(POD.zAft, R),
        ];
  add(loftZ(prof, bodyStations, { texel }), "hull", {
    uv: "keep",
    lod,
    tint: lod === 2 ? (px, py, pz, o) => o.copy(pal.hull) : bodyTint,
  });
  // cream ring, blue-grey ion band, cream ring (all slightly proud of the body)
  add(
    loftZ(prof, [st(POD.zBand0, POD.bandR), st(POD.zBand1, POD.bandR)], {
      capStart: true,
      capEnd: true,
      texel: texel * 1.5,
    }),
    "hull",
    { uv: "keep", lod, color: pal.band },
  );
  if (lod < 2) {
    for (const [z0, z1] of [
      [POD.zRing0, POD.zBand0],
      [POD.zBand1, POD.zRing1],
    ])
      add(
        loftZ(prof, [st(z0, POD.ringR), st(z1, POD.ringR)], {
          capStart: true,
          capEnd: true,
          texel: 1 / 6,
        }),
        "paint",
        { uv: "keep", lod, color: pal.trimP },
      );
  } else {
    add(
      loftZ(prof, [st(POD.zRing0, POD.ringR), st(POD.zRing1, POD.ringR)], {
        capStart: true,
        texel,
      }),
      "hull",
      { uv: "keep", lod, color: pal.trim },
    );
  }
  // forward cone and its cap
  add(
    loftZ(prof, [st(POD.zCone, POD.coneR), st(POD.zRing0, R)], {
      capStart: true,
      texel,
    }),
    "hull",
    { uv: "keep", lod, color: pal.hullDark },
  );
  if (lod < 2) {
    const nub = new THREE.SphereGeometry(3.2, lod === 0 ? 12 : 8, 6);
    nub.scale(1, 1, 0.55);
    nub.translate(x, y, Z(POD.zCone) - 0.3);
    add(nub, "dark", { color: pal.dark, texel: 1 / 3, lod });
  }
  // stern: rim annulus and the recessed bell interior (lit gradient seen from behind)
  const zM = Z(POD.zAft);
  const outer = prof.map(([u, v]) => [x + u * R, y + v * R]);
  const inner = prof.map(([u, v]) => [x + u * POD.mouthR, y + v * POD.mouthR]);
  add(ringZ(outer, inner, zM - 1.0, zM), "hull", {
    texel: 1 / 4,
    lod,
    color: pal.trim,
  });
  const depth = lod === 2 ? 5 : 9;
  const ts =
    lod === 2
      ? [0, 0.5, 1]
      : lod === 1
        ? [0, 0.3, 0.6, 0.85, 1]
        : [0, 0.14, 0.3, 0.48, 0.66, 0.82, 0.92, 1];
  const radiusAt = (t) => POD.mouthR * (1 - 0.7 * t ** 0.85);
  add(
    flipFaces(
      loftZ(
        prof,
        ts.map((t) => ({
          z: zM - t * depth,
          sx: radiusAt(t),
          sy: radiusAt(t),
          x,
          y,
        })),
        { capStart: true },
      ),
    ),
    "engineGlow",
    {
      lod,
      uv: "keep",
      tint: (px, py, pz, o) => bellGradient((zM - pz) / depth, o),
    },
  );
  if (lod < 2) {
    // raised grille panels on the top and bottom of the body (cream frame, dark grille)
    for (const s of [1, -1]) {
      const yy = y + s * (R + 0.2);
      add(
        new THREE.BoxGeometry(7.4, 0.4, 8.4).translate(x, yy, Z(125)),
        "paint",
        { color: pal.trimP, lod, texel: 1 / 6 },
      );
      add(
        new THREE.BoxGeometry(6.2, 0.7, 7.2).translate(x, yy, Z(125)),
        "dark",
        { color: pal.darkDeep, texel: 1 / 3, lod },
      );
      if (lod === 0)
        for (let i = -3; i <= 3; i++)
          add(
            new THREE.BoxGeometry(6.0, 0.9, 0.4).translate(
              x,
              yy,
              Z(125) + i * 1.0,
            ),
            "dark",
            { color: pal.dark, texel: 1 / 3, lod },
          );
    }
  }
  if (lod === 0) {
    // hatch plate aft of the grille, seam rings on the body, flank greebles, the sensor bulb
    for (const s of [1, -1])
      add(
        new THREE.BoxGeometry(5.0, 0.3, 6.0).translate(
          x,
          y + s * (R + 0.1),
          Z(133.5),
        ),
        "hull",
        { color: pal.hullLight, texel: 1 / 4, lod },
      );
    for (const zn of [123, 130.5])
      add(tubeZ(R + 0.1, R + 0.1, 0.35, n, x, y, Z(zn), true), "dark", {
        color: pal.darkDeep,
        texel: 1 / 3,
        lod,
      });
    const sides = bulb ? [-bulb] : [-1, 1];
    for (const s of sides) {
      const xx = x + s * (R + 0.35);
      add(
        new THREE.BoxGeometry(0.7, 2.4, 4.2).translate(xx, y + 2.2, Z(127)),
        "hull",
        { color: pal.hullDark, texel: 1 / 3, lod },
      );
      add(
        new THREE.BoxGeometry(0.6, 1.6, 6).translate(xx, y - 2.4, Z(131)),
        "dark",
        { color: pal.dark, texel: 1 / 3, lod },
      );
      add(
        new THREE.BoxGeometry(0.5, 0.6, 1.2).translate(xx, y + 0.2, Z(134)),
        "windows",
        { color: 0xffe0b8, lod, uv: "keep" },
      );
    }
  }
  if (bulb && lod < 2) {
    const b = new THREE.SphereGeometry(1.8, lod === 0 ? 12 : 8, 8);
    b.translate(x + bulb * (R - 0.4), y - 2.0, Z(126.5));
    add(b, "hull", { color: pal.hullLight, texel: 1 / 4, lod });
  }
  // glow disc / plume radius for the framework: ~0.7 x the mouth keeps the rim visible round it
  return { pos: [x, y, zM + 0.3], r: 5.8 };
}

/**
 * Machinery plate between two neighbouring pods aft of the wing's trailing edge (gap from x0 to x1,
 * wing plane at y): a flat deck 1.5 m thick with a grille box, pipes and a hatch on top.
 */
export function podConnector(add, { x0, x1, y, Z, lod, pal, texel }) {
  const cx = (x0 + x1) / 2;
  const w = Math.abs(x1 - x0);
  add(
    new THREE.BoxGeometry(w, 1.5, 19.5).translate(cx, y - 0.3, Z(126.75)),
    "hull",
    { color: pal.hullDark, texel, lod },
  );
  if (lod < 2) {
    add(
      new THREE.BoxGeometry(8, 3.6, 6).translate(cx, y + 2.25, Z(121)),
      "dark",
      { color: pal.dark, texel: 1 / 4, lod },
    );
    add(
      new THREE.BoxGeometry(8.4, 0.3, 6.4).translate(cx, y + 4.1, Z(121)),
      "paint",
      { color: pal.trimP, lod, texel: 1 / 6 },
    );
    add(
      new THREE.BoxGeometry(6.4, 0.5, 4.6).translate(cx, y + 4.15, Z(121)),
      "dark",
      { color: pal.darkDeep, texel: 1 / 3, lod },
    );
  }
  if (lod === 0) {
    for (const dx of [-2.6, 0, 2.6])
      add(
        bar(
          [cx + dx, y + 0.9, Z(124.5)],
          [cx + dx, y + 0.9, Z(135.5)],
          0.7,
          0.7,
        ),
        "dark",
        { color: pal.dark, texel: 1 / 3, lod },
      );
    add(
      new THREE.BoxGeometry(3.4, 1.4, 3.6).translate(cx, y + 1.1, Z(133)),
      "dark",
      { color: pal.darkDeep, texel: 1 / 3, lod },
    );
    add(
      new THREE.BoxGeometry(2.6, 0.3, 2.6).translate(cx - 4.2, y + 0.6, Z(130)),
      "paint",
      { color: pal.trimP, lod, texel: 1 / 6 },
    );
  }
}
