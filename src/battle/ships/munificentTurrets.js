// Tracking turret geometry for the Separatist Munificent and Recusant (consumed by shipKit.assemble's
// `turretTypes`). Turret space: up +Y, rest aim -Z, the body's base ring sits on y = 0 and the barrel
// group is built around its elevation pivot at the origin (the framework places it at (0, pivotY, 0)
// in the yawed body frame). Body: base ring, faceted housing, roof hatch, dark mantlet, flank blisters.
// Barrels: breech block, twin tubes with mid and muzzle collars. Vertex colours carry the tints (the
// body keeps a darker mantlet and base on the shared plating material; barrels are uniform on `dark`).
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
 * Build a turret type. S = base radius (m); `base` is the hull tint (THREE.Color); `dark` the machinery
 * tint (hex or Color). Returns the descriptor fields shipKit.assemble expects plus the muzzle offset.
 * detail: 1 (heavy, 12/8-sided) or 0 (light: fewer segments, shorter tubes).
 */
export function turretType(S, base, dark, detail = 1, opts = {}) {
  const segRing = detail ? 14 : 8;
  const segTube = detail ? 8 : 6;
  const tint = (k) => base.clone().multiplyScalar(k);
  const parts = [];
  // base ring
  {
    const g = new THREE.CylinderGeometry(1.12 * S, 1.22 * S, 0.22 * S, segRing);
    g.translate(0, 0.11 * S, 0);
    parts.push(tinted(g, tint(0.82)));
  }
  // faceted housing (a flat face toward -Z)
  {
    const g = new THREE.CylinderGeometry(0.8 * S, 0.96 * S, 0.86 * S, 8);
    g.rotateY(Math.PI / 8);
    g.translate(0, 0.22 * S + 0.43 * S, 0);
    parts.push(tinted(g, tint(1.0)));
  }
  // roof hatch and a dome sensor
  {
    const g = new THREE.BoxGeometry(0.36 * S, 0.1 * S, 0.36 * S);
    g.translate(0.22 * S, 1.1 * S, 0.12 * S);
    parts.push(tinted(g, tint(0.7)));
    const d = new THREE.SphereGeometry(
      0.16 * S,
      detail ? 10 : 6,
      detail ? 6 : 4,
    );
    d.scale(1, 0.7, 1);
    d.translate(-0.28 * S, 1.1 * S, 0.2 * S);
    parts.push(tinted(d, tint(0.9)));
  }
  // mantlet: dark block the barrels emerge from
  {
    const g = new THREE.BoxGeometry(1.02 * S, 0.56 * S, 0.5 * S);
    g.translate(0, 0.7 * S, -0.92 * S);
    parts.push(tinted(g, tint(0.42)));
    // mantlet lip
    const l = new THREE.BoxGeometry(1.1 * S, 0.1 * S, 0.3 * S);
    l.translate(0, 1.0 * S, -0.95 * S);
    parts.push(tinted(l, tint(0.9)));
  }
  // flank blisters (equipment boxes)
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(0.16 * S, 0.34 * S, 0.5 * S);
    g.translate(s * 0.92 * S, 0.62 * S, 0.1 * S);
    parts.push(tinted(g, tint(0.62)));
  }
  const body = mergeParts(parts);
  faceUV(body, opts.texel || 1 / 5);

  // barrels around the pivot (0, 0, 0)
  const darkC = dark instanceof THREE.Color ? dark : new THREE.Color(dark);
  const bp = [];
  {
    const g = new THREE.BoxGeometry(0.9 * S, 0.44 * S, 0.72 * S);
    g.translate(0, 0, 0.02 * S);
    bp.push(tinted(g, darkC.clone().multiplyScalar(1.1)));
  }
  const tubeLen = (detail ? 3.0 : 2.6) * S;
  const z0 = -0.3 * S;
  for (const s of [-1, 1]) {
    const x = s * (detail ? 0.27 : 0.24) * S;
    const g = new THREE.CylinderGeometry(
      0.105 * S,
      0.135 * S,
      tubeLen,
      segTube,
      1,
      true,
    );
    g.rotateX(Math.PI / 2);
    g.translate(x, 0, z0 - tubeLen / 2);
    bp.push(tinted(g, darkC));
    const m = new THREE.CylinderGeometry(
      0.165 * S,
      0.165 * S,
      0.34 * S,
      segTube,
    );
    m.rotateX(Math.PI / 2);
    m.translate(x, 0, z0 - tubeLen + 0.2 * S);
    bp.push(tinted(m, darkC.clone().multiplyScalar(0.8)));
    if (detail) {
      const c = new THREE.CylinderGeometry(
        0.16 * S,
        0.16 * S,
        0.26 * S,
        segTube,
      );
      c.rotateX(Math.PI / 2);
      c.translate(x, 0, z0 - tubeLen * 0.5);
      bp.push(tinted(c, darkC.clone().multiplyScalar(0.85)));
    }
  }
  const barrels = mergeParts(bp);
  faceUV(barrels, opts.texel || 1 / 4);
  return {
    body,
    barrels,
    bodyMaterial: "hull",
    barrelMaterial: "dark",
    // colours are baked per vertex; leaving bodyColor/barrelColor undefined keeps them
    planarUV: false,
    texel: opts.texel || 1 / 5,
    pivotY: 0.7 * S,
    barrelLen: -z0 + tubeLen + 0.03 * S,
    yawLimit: opts.yawLimit ?? 2.6,
    pitchMin: opts.pitchMin ?? -0.05,
    pitchMax: opts.pitchMax ?? 1.2,
    rate: opts.rate ?? (detail ? 0.5 : 0.9),
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
