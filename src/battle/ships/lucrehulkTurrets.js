// Tracking turret geometry for the Lucrehulk (consumed by shipKit.assemble's `turretTypes`). Turret
// space: up +Y, rest aim -Z, the body's base ring on y = 0, the barrel group built around its
// elevation pivot at the origin (the framework places it at (0, pivotY, 0) in the yawed body frame).
// Light type: a quad laser battery (squat drum, boxy housing, four short tubes in a 2 × 2 block).
// Heavy type: a twin turbolaser (wide base, faceted housing with a sloped mantlet, two long tubes).
// Vertex colours carry the tints; bodies sit on the shared plating material, barrels on `dark`.
import * as THREE from "three";
import { mergeParts } from "../fleet.js";
import { faceUV, tintBy } from "./lucrehulkGeo.js";

function tinted(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  tintBy(g, (x, y, z, o) => o.copy(color));
  return g;
}
const box = (sx, sy, sz, x, y, z) => {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate(x, y, z);
  return g;
};
const cylY = (r0, r1, h, seg, x, y, z) => {
  const g = new THREE.CylinderGeometry(r0, r1, h, seg);
  g.translate(x, y, z);
  return g;
};
const tubeZ = (r0, r1, len, seg, x, y, zc) => {
  const g = new THREE.CylinderGeometry(r0, r1, len, seg, 1, true);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, zc);
  return g;
};

/** Quad laser battery. S = base radius (m). base: THREE.Color hull tint; dark: hex or Color. */
export function quadLaser(S, base, dark, opts = {}) {
  const tint = (k) => base.clone().multiplyScalar(k);
  const darkC = dark instanceof THREE.Color ? dark : new THREE.Color(dark);
  const parts = [];
  parts.push(tinted(cylY(1.05 * S, 1.15 * S, 0.24 * S, 10, 0, 0.12 * S, 0), tint(0.8)));
  parts.push(tinted(cylY(0.86 * S, 0.9 * S, 0.5 * S, 10, 0, 0.49 * S, 0), tint(1.0)));
  parts.push(tinted(box(1.3 * S, 0.5 * S, 1.2 * S, 0, 0.95 * S, 0.05 * S), tint(0.96)));
  parts.push(tinted(box(0.5 * S, 0.14 * S, 0.5 * S, 0.25 * S, 1.27 * S, 0.2 * S), tint(0.72)));
  parts.push(tinted(box(0.86 * S, 0.44 * S, 0.34 * S, 0, 0.92 * S, -0.72 * S), tint(0.42)));
  for (const s of [-1, 1])
    parts.push(tinted(box(0.14 * S, 0.3 * S, 0.7 * S, s * 0.72 * S, 0.8 * S, 0.1 * S), tint(0.6)));
  const body = mergeParts(parts);
  faceUV(body, opts.texel || 1 / 4);

  const bp = [];
  bp.push(tinted(box(0.7 * S, 0.5 * S, 0.5 * S, 0, 0, 0.05 * S), darkC.clone().multiplyScalar(1.1)));
  const tubeLen = 1.9 * S;
  const z0 = -0.28 * S;
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const x = sx * 0.2 * S;
      const y = sy * 0.14 * S;
      bp.push(tinted(tubeZ(0.07 * S, 0.085 * S, tubeLen, 6, x, y, z0 - tubeLen / 2), darkC));
      bp.push(
        tinted(
          tubeZ(0.1 * S, 0.1 * S, 0.22 * S, 6, x, y, z0 - tubeLen + 0.14 * S),
          darkC.clone().multiplyScalar(0.8),
        ),
      );
    }
  const barrels = mergeParts(bp);
  faceUV(barrels, opts.texel || 1 / 3);
  return {
    body,
    barrels,
    bodyMaterial: "hull",
    barrelMaterial: "dark",
    planarUV: false,
    texel: opts.texel || 1 / 4,
    pivotY: 0.92 * S,
    barrelLen: -z0 + tubeLen + 0.03 * S,
    yawLimit: opts.yawLimit ?? Math.PI,
    pitchMin: opts.pitchMin ?? -0.05,
    pitchMax: opts.pitchMax ?? 1.35,
    rate: opts.rate ?? 1.1,
    size: S,
  };
}

/** Twin heavy turbolaser. S = base radius (m). */
export function twinTurbolaser(S, base, dark, opts = {}) {
  const tint = (k) => base.clone().multiplyScalar(k);
  const darkC = dark instanceof THREE.Color ? dark : new THREE.Color(dark);
  const parts = [];
  parts.push(tinted(cylY(1.1 * S, 1.22 * S, 0.22 * S, 14, 0, 0.11 * S, 0), tint(0.8)));
  {
    const g = new THREE.CylinderGeometry(0.78 * S, 0.98 * S, 0.8 * S, 8);
    g.rotateY(Math.PI / 8);
    g.translate(0, 0.62 * S, 0);
    parts.push(tinted(g, tint(1.0)));
  }
  parts.push(tinted(box(0.9 * S, 0.12 * S, 0.9 * S, 0, 1.08 * S, 0.1 * S), tint(0.9)));
  parts.push(tinted(box(0.34 * S, 0.14 * S, 0.34 * S, -0.26 * S, 1.2 * S, 0.22 * S), tint(0.7)));
  {
    // sloped mantlet the tubes emerge from
    const g = new THREE.BoxGeometry(1.06 * S, 0.62 * S, 0.5 * S);
    g.rotateX(0.35);
    g.translate(0, 0.72 * S, -0.9 * S);
    parts.push(tinted(g, tint(0.44)));
  }
  for (const s of [-1, 1])
    parts.push(tinted(box(0.18 * S, 0.36 * S, 0.56 * S, s * 0.94 * S, 0.62 * S, 0.12 * S), tint(0.62)));
  const body = mergeParts(parts);
  faceUV(body, opts.texel || 1 / 5);

  const bp = [];
  bp.push(tinted(box(0.92 * S, 0.46 * S, 0.7 * S, 0, 0, 0.02 * S), darkC.clone().multiplyScalar(1.1)));
  const tubeLen = 3.2 * S;
  const z0 = -0.32 * S;
  for (const s of [-1, 1]) {
    const x = s * 0.27 * S;
    bp.push(tinted(tubeZ(0.1 * S, 0.14 * S, tubeLen, 8, x, 0, z0 - tubeLen / 2), darkC));
    bp.push(
      tinted(
        tubeZ(0.19 * S, 0.19 * S, 0.6 * S, 8, x, 0, z0 - 0.5 * S),
        darkC.clone().multiplyScalar(0.85),
      ),
    );
    bp.push(
      tinted(
        tubeZ(0.16 * S, 0.16 * S, 0.3 * S, 8, x, 0, z0 - tubeLen + 0.18 * S),
        darkC.clone().multiplyScalar(0.8),
      ),
    );
  }
  const barrels = mergeParts(bp);
  faceUV(barrels, opts.texel || 1 / 4);
  return {
    body,
    barrels,
    bodyMaterial: "hull",
    barrelMaterial: "dark",
    planarUV: false,
    texel: opts.texel || 1 / 5,
    pivotY: 0.72 * S,
    barrelLen: -z0 + tubeLen + 0.03 * S,
    yawLimit: opts.yawLimit ?? Math.PI,
    pitchMin: opts.pitchMin ?? -0.05,
    pitchMax: opts.pitchMax ?? 1.2,
    rate: opts.rate ?? 0.45,
    size: S,
  };
}

// triangle count of a type (for budget reports)
export function turretTris(def) {
  return (
    def.body.attributes.position.count / 3 +
    def.barrels.attributes.position.count / 3
  );
}
