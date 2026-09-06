// Tracking turret geometry for the Republic Carrack (consumed by shipKit.assemble's `turretTypes`).
// Turret space: up +Y, rest aim -Z, base ring on y = 0, barrel group built around its elevation pivot
// at the origin (the framework places it at (0, pivotY, 0) in the yawed body frame). Body: base ring,
// truncated-pyramid armoured housing with a flat roof plate, dark mantlet and a sensor blister; barrels:
// breech block, twin tubes with muzzle collars. Vertex colours carry the tints (light hull plating on
// the body, dark machinery on the barrels).
import * as THREE from "three";
import { mergeParts } from "../fleet.js";
import { faceUV, tintBy } from "./munificentGeo.js";

function tinted(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  tintBy(g, (x, y, z, o) => o.copy(color));
  return g;
}

/**
 * Build a turret type. S = base radius (m); `base` the hull tint (THREE.Color); `dark` the machinery
 * tint (THREE.Color). detail 1 = heavy (more segments, longer tubes), 0 = light.
 */
export function carrackTurret(S, base, dark, detail = 1, opts = {}) {
  const segRing = detail ? 14 : 8;
  const segTube = detail ? 8 : 6;
  const tint = (k) => base.clone().multiplyScalar(k);
  const parts = [];
  // base ring
  {
    const g = new THREE.CylinderGeometry(1.0 * S, 1.1 * S, 0.2 * S, segRing);
    g.translate(0, 0.1 * S, 0);
    parts.push(tinted(g, tint(0.8)));
  }
  // housing: truncated square pyramid (faces aligned to the axes)
  {
    const r2 = Math.SQRT2;
    const g = new THREE.CylinderGeometry(
      0.6 * S * r2,
      0.82 * S * r2,
      0.7 * S,
      4,
    );
    g.rotateY(Math.PI / 4);
    g.translate(0, 0.2 * S + 0.35 * S, 0.05 * S);
    parts.push(tinted(g, tint(1.0)));
    // roof plate and sensor blister
    const roof = new THREE.BoxGeometry(1.0 * S, 0.08 * S, 1.0 * S);
    roof.translate(0, 0.94 * S, 0.05 * S);
    parts.push(tinted(roof, tint(0.88)));
    const d = new THREE.SphereGeometry(
      0.16 * S,
      detail ? 10 : 6,
      detail ? 5 : 3,
    );
    d.scale(1, 0.6, 1);
    d.translate(0.3 * S, 0.98 * S, 0.25 * S);
    parts.push(tinted(d, tint(0.7)));
  }
  // mantlet: dark block the barrels emerge from
  {
    const g = new THREE.BoxGeometry(0.9 * S, 0.5 * S, 0.45 * S);
    g.translate(0, 0.62 * S, -0.9 * S);
    parts.push(tinted(g, tint(0.45)));
  }
  // flank equipment boxes
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(0.14 * S, 0.3 * S, 0.5 * S);
    g.translate(s * 0.8 * S, 0.55 * S, 0.15 * S);
    parts.push(tinted(g, tint(0.62)));
  }
  const body = mergeParts(parts);
  faceUV(body, opts.texel || 1 / 4);

  // barrels around the pivot (0, 0, 0)
  const bp = [];
  {
    const g = new THREE.BoxGeometry(0.8 * S, 0.4 * S, 0.7 * S);
    g.translate(0, 0, 0.05 * S);
    bp.push(tinted(g, dark.clone().multiplyScalar(1.1)));
  }
  const tubeLen = (detail ? 3.2 : 2.7) * S;
  const z0 = -0.3 * S;
  for (const s of [-1, 1]) {
    const x = s * 0.22 * S;
    const g = new THREE.CylinderGeometry(
      0.09 * S,
      0.12 * S,
      tubeLen,
      segTube,
      1,
      true,
    );
    g.rotateX(Math.PI / 2);
    g.translate(x, 0, z0 - tubeLen / 2);
    bp.push(tinted(g, dark));
    const m = new THREE.CylinderGeometry(0.14 * S, 0.14 * S, 0.3 * S, segTube);
    m.rotateX(Math.PI / 2);
    m.translate(x, 0, z0 - tubeLen + 0.18 * S);
    bp.push(tinted(m, dark.clone().multiplyScalar(0.8)));
  }
  const barrels = mergeParts(bp);
  faceUV(barrels, opts.texel || 1 / 3);
  return {
    body,
    barrels,
    bodyMaterial: "hull",
    barrelMaterial: "dark",
    // colours are baked per vertex; leaving bodyColor/barrelColor undefined keeps them
    planarUV: false,
    texel: opts.texel || 1 / 4,
    pivotY: 0.62 * S,
    barrelLen: -z0 + tubeLen + 0.03 * S,
    yawLimit: opts.yawLimit ?? 2.6,
    pitchMin: opts.pitchMin ?? -0.05,
    pitchMax: opts.pitchMax ?? 1.25,
    rate: opts.rate ?? (detail ? 0.55 : 1.0),
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
