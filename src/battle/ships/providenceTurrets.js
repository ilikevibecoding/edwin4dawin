// Turrets of the Providence-class. The ten heavy turbolasers are the fleet's tracking turrets: one
// shared body + barrel geometry (turret space: up +Y, rest aim -Z, base at y = 0; the barrels' elevation
// pivot at their origin, mounted `pivotY` above the base) instanced per mount, aimed by the Fleet at the
// ship's target; their hardpoints fire from the barrel tips. A static base ring is baked under each
// mount. The light emplacements stay baked with a proper housing (base ring, faceted body, mantlet,
// twin barrels, sensor dome).
import * as THREE from "three";
import { box, cylY, cylZ } from "./shipKit.js";
import { mergeParts } from "../fleet.js";
import { frameMatrix, hullFrame, loftRings, ringCap } from "./providenceGeo.js";
import { HEAVY_FLANK_Z, HEAVY_RIDGE_Z, PAL } from "./providenceSpec.js";
import { inCut } from "./providenceBays.js";

const FWD = new THREE.Vector3(0, 0, -1);
const HEAVY = { pivotY: 6.6, barrelLen: 31, baseR: 9.4 };

// faceted frustum stack: octagon rings at [y, radius], flat facets, capped on top
function octLoft(list, cap = true, sides = 8) {
  const rings = list.map(([y, r]) => {
    const ring = [];
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2 + Math.PI / sides;
      ring.push([Math.cos(a) * r, y, Math.sin(a) * r]);
    }
    return ring;
  });
  const g = loftRings(rings, {
    sharp: new Set(Array.from({ length: sides }, (_, k) => k)),
    sharpRings: new Set(rings.map((_, i) => i)),
  });
  if (!cap) return g;
  return mergeParts([g, ringCap(rings[rings.length - 1], [0, 1, 0])]);
}

// heavy turret: armoured faceted body on the (static) base ring, sensor box, hatch, aerial
function heavyBody() {
  return mergeParts([
    octLoft([
      [1.3, 8.3],
      [4.6, 8.0],
      [7.8, 6.8],
      [9.6, 4.8],
    ]),
    box(0, 10.2, 1.6, 4, 1.4, 4),
    box(-5.2, 8.6, 3.6, 2.4, 1.2, 3),
    box(5.2, 8.8, 3.0, 2.0, 1.6, 2.4),
    cylY(0.3, 0.45, 5, 5).translate(3.6, 12.6, 3.2),
  ]);
}
// mantlet + twin barrels with recoil sleeves and muzzle collars, aim -Z, pivot at the origin
function heavyBarrels() {
  const g = [box(0, 0, -3.4, 10.2, 4.6, 5.4), box(0, 1.9, -6.5, 2.2, 1.2, 6)];
  for (const x of [-2.6, 2.6]) {
    g.push(cylZ(1.45, 1.45, 5.5, 10).translate(x, 0, -8.2));
    g.push(cylZ(1.0, 0.74, 21, 10).translate(x, 0, -20.5));
    g.push(cylZ(1.1, 1.1, 2.4, 10).translate(x, 0, -29.8));
  }
  return mergeParts(g);
}

// light emplacement pieces in local space (base at y = 0, aim -Z)
function lightPieces(lod, s = 1) {
  const out = [];
  const push = (geo, mat, color, texel) => {
    if (s !== 1) geo.scale(s, s, s);
    out.push({ geo, mat, color, texel });
  };
  if (lod === 0) {
    push(
      cylY(3.9, 4.3, 1.0, 12).translate(0, 0.5, 0),
      "hull",
      PAL.flank,
      1 / 5,
    );
    push(
      octLoft(
        [
          [1.0, 3.3],
          [2.6, 3.15],
          [3.9, 2.3],
        ],
        true,
        6,
      ),
      "dark",
      PAL.darkLit,
      1 / 4,
    );
    push(box(0, 3.0, -3.1, 3.6, 1.9, 2.4), "dark", PAL.darkLit, 1 / 3);
    for (const x of [-0.95, 0.95]) {
      push(
        cylZ(0.44, 0.34, 11, 6).translate(x, 3.0, -8.7),
        "dark",
        PAL.dark,
        1 / 3,
      );
      push(
        cylZ(0.52, 0.52, 1.0, 6).translate(x, 3.0, -13.6),
        "dark",
        PAL.darkLit,
        1 / 3,
      );
    }
    push(
      new THREE.SphereGeometry(0.9, 8, 6).translate(0, 4.0, 0.8),
      "dark",
      PAL.darkLit,
      1 / 3,
    );
  } else if (lod === 1) {
    push(
      cylY(3.4, 3.9, 3.6, 6).translate(0, 1.8, 0),
      "dark",
      PAL.darkLit,
      1 / 4,
    );
    push(box(0, 3.0, -7, 2.8, 1.6, 12), "dark", PAL.dark, 1 / 4);
  }
  return out;
}

export function buildTurrets({ add, cuts }) {
  const turrets = [];
  const hardpoints = [];
  // heavy mount: static base ring in the hull parts, a tracking turret entry and its hardpoint
  const mount = (frame) => {
    const up = frame.n.clone().normalize();
    const fwd = FWD.clone().addScaledVector(up, -FWD.dot(up)).normalize();
    const m = frameMatrix(frame.p, up, fwd);
    for (const lod of [0, 1]) {
      const ring = cylY(
        HEAVY.baseR,
        HEAVY.baseR + 0.6,
        1.4,
        lod === 0 ? 18 : 10,
      )
        .translate(0, 0.7, 0)
        .applyMatrix4(m);
      add(ring, "hull", { color: PAL.belly, texel: 1 / 6, lod });
      if (lod === 0) {
        // mounting collar / ammunition ring around the base
        const collar = cylY(HEAVY.baseR + 1.4, HEAVY.baseR + 2.2, 0.6, 18)
          .translate(0, 0.3, 0)
          .applyMatrix4(m);
        add(collar, "dark", { color: PAL.darkLit, texel: 1 / 4, lod });
      }
    }
    const k = turrets.length;
    turrets.push({
      type: "heavy",
      pos: frame.p.toArray(),
      up: up.toArray(),
      forward: fwd.toArray(),
    });
    const tip = frame.p
      .clone()
      .addScaledVector(up, HEAVY.pivotY)
      .addScaledVector(fwd, HEAVY.barrelLen);
    const dir = up
      .clone()
      .multiplyScalar(0.8)
      .addScaledVector(fwd, 0.3)
      .normalize();
    hardpoints.push({
      turret: k,
      pos: tip.toArray().map((v) => +v.toFixed(2)),
      dir: dir.toArray().map((v) => +v.toFixed(3)),
      kind: "heavy",
      range: 12500,
    });
  };
  for (const z of HEAVY_RIDGE_Z) {
    const f = hullFrame(z, 0, 0, 1);
    f.n.set(0, 1, 0);
    mount(f);
  }
  for (const z of HEAVY_FLANK_Z)
    for (const side of [-1, 1]) mount(hullFrame(z, 2, 0.7, side));

  // light emplacements (baked): frame on the hull, pieces per LOD, hardpoint at the muzzle
  const light = (frame, scale = 1) => {
    const m = frameMatrix(frame.p, frame.n, FWD);
    for (const lod of [0, 1])
      for (const piece of lightPieces(lod, scale)) {
        piece.geo.applyMatrix4(m);
        add(piece.geo, piece.mat, {
          color: piece.color,
          texel: piece.texel,
          lod,
        });
      }
    const muzzle = new THREE.Vector3(0, 3.0, -14.2)
      .multiplyScalar(scale)
      .applyMatrix4(m);
    const up = frame.n.clone().normalize();
    const fwd = FWD.clone().addScaledVector(up, -FWD.dot(up)).normalize();
    const dir = up.multiplyScalar(0.55).addScaledVector(fwd, 0.85).normalize();
    hardpoints.push({
      pos: muzzle.toArray().map((v) => +v.toFixed(2)),
      dir: dir.toArray().map((v) => +v.toFixed(3)),
      kind: "light",
      range: 7000,
    });
  };
  const clear = (z, m, side) => (inCut(cuts, z, m, side, 8) ? z + 22 : z);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++)
      light(hullFrame(-340 + i * 60 + (side > 0 ? 0 : 22), 2, 0.5, side));
    for (let i = 0; i < 4; i++) light(hullFrame(200 + i * 88, 3, 0.4, side));
    for (let i = 0; i < 5; i++) {
      const z = clear(-130 + i * 125, 9, side);
      light(hullFrame(z, 9, 0.5, side));
    }
    light(hullFrame(-470, 1, 0.5, side), 0.75);
  }

  return {
    turretTypes: {
      heavy: {
        body: heavyBody(),
        barrels: heavyBarrels(),
        bodyMaterial: "hull",
        barrelMaterial: "dark",
        bodyColor: PAL.flank,
        barrelColor: PAL.darkLit,
        texel: 1 / 5,
        pivotY: HEAVY.pivotY,
        barrelLen: HEAVY.barrelLen,
        yawLimit: 2.6,
        pitchMin: -0.05,
        pitchMax: 1.2,
        rate: 0.5,
      },
    },
    turrets,
    hardpoints,
  };
}
