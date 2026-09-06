// Tracking laser turret for the Consular-class (Charger c70) frigate, consumed by shipKit.assemble's
// `turretTypes`. Turret space: up +Y, rest aim -Z, the base ring sits on y = 0 and the barrel group is
// built around its elevation pivot at the origin (the framework places it at (0, pivotY, 0) in the
// yawed body frame). Body: base ring, tall round drum, domed cap with a trim ring and a sensor box.
// Barrels: dark mantlet block, twin tubes with muzzle collars. Vertex colours carry the tints.
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
 * Build the turret type. S = base radius (m). `hull` / `trim` / `dark` are THREE.Colors: hull for the
 * drum, trim for the cap ring, dark for the base, mantlet and barrels. Returns the descriptor fields
 * shipKit.assemble expects.
 */
export function laserTurret(S, hull, trim, dark, opts = {}) {
  const seg = opts.seg || 14;
  const k = (c, f) => c.clone().multiplyScalar(f);
  const parts = [];
  // base ring
  {
    const g = new THREE.CylinderGeometry(1.0 * S, 1.1 * S, 0.18 * S, seg);
    g.translate(0, 0.09 * S, 0);
    parts.push(tinted(g, k(dark, 1.1)));
  }
  // tall drum (the design's turrets stand about as high as they are wide)
  {
    const g = new THREE.CylinderGeometry(0.86 * S, 0.9 * S, 0.75 * S, seg);
    g.translate(0, 0.18 * S + 0.375 * S, 0);
    parts.push(tinted(g, hull));
  }
  // trim ring between the drum and the dome
  {
    const g = new THREE.CylinderGeometry(0.88 * S, 0.88 * S, 0.1 * S, seg);
    g.translate(0, 0.98 * S, 0);
    parts.push(tinted(g, trim));
  }
  // domed cap
  {
    const g = new THREE.SphereGeometry(
      0.84 * S,
      seg,
      6,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    );
    g.scale(1, 0.5, 1);
    g.translate(0, 1.03 * S, 0);
    parts.push(tinted(g, k(hull, 1.04)));
  }
  // sensor box and a small aerial on the cap
  {
    const g = new THREE.BoxGeometry(0.3 * S, 0.18 * S, 0.34 * S);
    g.translate(0.36 * S, 1.45 * S, 0.2 * S);
    parts.push(tinted(g, k(dark, 1.2)));
    const a = new THREE.CylinderGeometry(0.03 * S, 0.03 * S, 0.5 * S, 4);
    a.translate(-0.3 * S, 1.7 * S, 0.25 * S);
    parts.push(tinted(a, dark));
  }
  const body = mergeParts(parts);
  faceUV(body, opts.texel || 1 / 4);

  // barrels around the pivot (0, 0, 0)
  const bp = [];
  {
    const g = new THREE.BoxGeometry(0.78 * S, 0.42 * S, 0.7 * S);
    g.translate(0, 0, 0.02 * S);
    bp.push(tinted(g, k(dark, 1.15)));
  }
  const tubeLen = 2.6 * S;
  const z0 = -0.3 * S;
  for (const s of [-1, 1]) {
    const x = s * 0.2 * S;
    const g = new THREE.CylinderGeometry(
      0.075 * S,
      0.1 * S,
      tubeLen,
      6,
      1,
      true,
    );
    g.rotateX(Math.PI / 2);
    g.translate(x, 0.02 * S, z0 - tubeLen / 2);
    bp.push(tinted(g, dark));
    const m = new THREE.CylinderGeometry(0.13 * S, 0.13 * S, 0.3 * S, 6);
    m.rotateX(Math.PI / 2);
    m.translate(x, 0.02 * S, z0 - tubeLen + 0.18 * S);
    bp.push(tinted(m, k(dark, 0.8)));
    const c = new THREE.CylinderGeometry(0.12 * S, 0.12 * S, 0.24 * S, 6);
    c.rotateX(Math.PI / 2);
    c.translate(x, 0.02 * S, z0 - tubeLen * 0.45);
    bp.push(tinted(c, k(dark, 0.85)));
  }
  const barrels = mergeParts(bp);
  faceUV(barrels, opts.texel || 1 / 3);
  return {
    body,
    barrels,
    bodyMaterial: "hull",
    barrelMaterial: "dark",
    planarUV: false, // colours and UVs are baked per vertex
    texel: opts.texel || 1 / 4,
    pivotY: 0.9 * S,
    barrelLen: -z0 + tubeLen + 0.05 * S,
    yawLimit: opts.yawLimit ?? 2.7,
    pitchMin: opts.pitchMin ?? -0.06,
    pitchMax: opts.pitchMax ?? 1.25,
    rate: opts.rate ?? 1.1,
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
