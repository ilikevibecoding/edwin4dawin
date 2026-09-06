// Turrets of the Providence-class. The ten heavy turbolasers are the fleet's tracking turrets: one
// shared body + barrel geometry (turret space: up +Y, rest aim -Z, base at y = 0; the barrels' elevation
// pivot at their origin, mounted `pivotY` above the base) instanced per mount, aimed by the Fleet at the
// ship's target; their hardpoints fire from the barrel tips. A static barbette is baked under each
// mount (sunk into the hull so its rim never floats off the curved shoulder). The light emplacements
// stay baked with a proper housing (skirted base, faceted body, mantlet, twin barrels, sensor dome).
import * as THREE from "three";
import { box, cylY, cylZ } from "./shipKit.js";
import { mergeParts } from "../fleet.js";
import {
  CITADEL_UPPER,
  HEAVY_CITADEL_R,
  HEAVY_CITADEL_X,
  HEAVY_SHOULDER_R,
  HEAVY_SHOULDER_SEG,
  LIGHT_MOUNTS,
  PAL,
} from "./providenceSpec.js";
import {
  frameMatrix,
  fromRef,
  hullFrame,
  loftRings,
  ringCap,
} from "./providenceGeo.js";

const FWD = new THREE.Vector3(0, 0, -1);
const HEAVY = { pivotY: 5.6, barrelLen: 26.5, baseR: 8.0 };

// faceted frustum stack: polygon rings at [y, radius], flat facets, capped on top
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

// heavy turret: armoured faceted body on the (static) barbette, sensor box, hatches, aerial
function heavyBody() {
  return mergeParts([
    octLoft([
      [1.1, 7.0],
      [3.9, 6.8],
      [6.6, 5.8],
      [8.2, 4.1],
    ]),
    box(0, 8.7, 1.4, 3.4, 1.2, 3.4),
    box(-4.4, 7.3, 3.0, 2.0, 1.0, 2.6),
    box(4.4, 7.5, 2.6, 1.7, 1.4, 2.0),
    cylY(0.25, 0.4, 4.3, 5).translate(3.0, 10.7, 2.7),
  ]);
}
// mantlet + twin barrels with recoil sleeves and muzzle collars, aim -Z, pivot at the origin
function heavyBarrels() {
  const g = [box(0, 0, -2.9, 8.7, 3.9, 4.6), box(0, 1.6, -5.5, 1.9, 1.0, 5.1)];
  for (const x of [-2.2, 2.2]) {
    g.push(cylZ(1.25, 1.25, 4.7, 10).translate(x, 0, -7.0));
    g.push(cylZ(0.85, 0.63, 18, 10).translate(x, 0, -17.4));
    g.push(cylZ(0.95, 0.95, 2.0, 10).translate(x, 0, -25.4));
  }
  return mergeParts(g);
}

// light emplacement pieces in local space (base at y = 0, aim -Z); the base skirt reaches 2 m into
// the hull so the housing sits cleanly on the curved plating
function lightPieces(lod, s = 1) {
  const out = [];
  const push = (geo, mat, color, texel) => {
    if (s !== 1) geo.scale(s, s, s);
    out.push({ geo, mat, color, texel });
  };
  if (lod === 0) {
    push(
      cylY(3.9, 4.4, 3.0, 12).translate(0, -0.5, 0),
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
      cylY(3.4, 4.0, 5.0, 6).translate(0, 0.5, 0),
      "dark",
      PAL.darkLit,
      1 / 4,
    );
    push(box(0, 3.0, -7, 2.8, 1.6, 12), "dark", PAL.dark, 1 / 4);
  }
  return out;
}

export function buildTurrets({ add }) {
  const turrets = [];
  const hardpoints = [];
  // heavy mount: static barbette in the hull parts, a tracking turret entry and its hardpoint
  const mount = (p, n) => {
    const up = n.clone().normalize();
    const fwd = FWD.clone().addScaledVector(up, -FWD.dot(up)).normalize();
    const m = frameMatrix(p, up, fwd);
    for (const lod of [0, 1]) {
      // barbette: y -4 .. 1.4 so the downhill rim on the tilted shoulder is still buried
      const skirt = cylY(
        HEAVY.baseR,
        HEAVY.baseR + 0.5,
        5.4,
        lod === 0 ? 18 : 10,
      )
        .translate(0, -1.3, 0)
        .applyMatrix4(m);
      add(skirt, "hull", { color: PAL.belly, texel: 1 / 6, lod });
      if (lod === 0) {
        // mounting collar / ammunition ring around the base
        const collar = cylY(HEAVY.baseR + 1.2, HEAVY.baseR + 1.9, 0.6, 18)
          .translate(0, 0.3, 0)
          .applyMatrix4(m);
        add(collar, "dark", { color: PAL.darkLit, texel: 1 / 4, lod });
      }
    }
    const k = turrets.length;
    turrets.push({
      type: "heavy",
      pos: p.toArray(),
      up: up.toArray(),
      forward: fwd.toArray(),
    });
    const tip = p
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
  // shoulder pairs beside the spine, flush on the curved shoulder (they aim slightly outboard at rest)
  const [segS, tS] = HEAVY_SHOULDER_SEG;
  for (const r of HEAVY_SHOULDER_R)
    for (const side of [-1, 1]) {
      const f = hullFrame(fromRef(r), segS, tS, side);
      mount(f.p, f.n);
    }
  // citadel pairs on the flat top of the upper block
  for (const r of HEAVY_CITADEL_R)
    for (const side of [-1, 1])
      mount(
        new THREE.Vector3(side * HEAVY_CITADEL_X, CITADEL_UPPER.y1, fromRef(r)),
        new THREE.Vector3(0, 1, 0),
      );

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
  for (const row of LIGHT_MOUNTS)
    for (const side of [-1, 1])
      for (const r of row.r)
        light(hullFrame(fromRef(r), row.m, row.t, side), row.scale);

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
