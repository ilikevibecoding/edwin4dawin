// Tracking turret geometry for the Dreadnaught-class heavy cruiser (consumed by shipKit.assemble's
// `turretTypes`). Turret space: up +Y, rest aim -Z, the body's base ring on y = 0, the barrel group
// built around its elevation pivot at the origin (the framework places it at (0, pivotY, 0) in the
// yawed body frame). Old-style Rendili guns: a heavy twin turbolaser in a squat armoured drum with a
// sloped glacis and a rear bustle, and a quad turbolaser in a boxy housing with four short tubes.
// Vertex colours carry the tints (body on the shared plating material, barrels on `dark`).
import * as THREE from "three";
import { mergeParts } from "../fleet.js";
import { faceUV, tintBy } from "./munificentGeo.js";

function tinted(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  tintBy(g, (x, y, z, o) => o.copy(color));
  return g;
}
const cylZ = (r0, r1, len, seg, open = false) => {
  const g = new THREE.CylinderGeometry(r0, r1, len, seg, 1, open);
  g.rotateX(Math.PI / 2);
  return g;
};

/**
 * Heavy twin turbolaser. S = drum radius (m); `base` the hull tint (THREE.Color); `dark` the machinery
 * tint. Returns the descriptor fields shipKit.assemble expects.
 */
export function heavyTwin(S, base, dark, opts = {}) {
  const t = (k) => base.clone().multiplyScalar(k);
  const darkC = dark instanceof THREE.Color ? dark : new THREE.Color(dark);
  const parts = [];
  // base ring and drum
  parts.push(
    tinted(
      new THREE.CylinderGeometry(1.2 * S, 1.3 * S, 0.24 * S, 14).translate(
        0,
        0.12 * S,
        0,
      ),
      t(0.8),
    ),
  );
  parts.push(
    tinted(
      new THREE.CylinderGeometry(S, 1.06 * S, 0.7 * S, 14).translate(
        0,
        0.24 * S + 0.35 * S,
        0,
      ),
      t(1.0),
    ),
  );
  // sloped glacis ring up to the roof
  parts.push(
    tinted(
      new THREE.CylinderGeometry(0.66 * S, S, 0.34 * S, 14).translate(
        0,
        0.94 * S + 0.17 * S,
        0,
      ),
      t(0.94),
    ),
  );
  // roof hatch, periscope dome, rear bustle (ammunition/coolant), flank vents
  parts.push(
    tinted(
      new THREE.BoxGeometry(0.4 * S, 0.1 * S, 0.4 * S).translate(
        0.2 * S,
        1.13 * S,
        0.15 * S,
      ),
      t(0.7),
    ),
  );
  {
    const d = new THREE.SphereGeometry(0.15 * S, 10, 6);
    d.scale(1, 0.6, 1);
    d.translate(-0.28 * S, 1.11 * S, 0.22 * S);
    parts.push(tinted(d, t(0.88)));
  }
  parts.push(
    tinted(
      new THREE.BoxGeometry(0.9 * S, 0.5 * S, 0.5 * S).translate(
        0,
        0.6 * S,
        0.95 * S,
      ),
      t(0.86),
    ),
  );
  for (const s of [-1, 1])
    parts.push(
      tinted(
        new THREE.BoxGeometry(0.14 * S, 0.3 * S, 0.5 * S).translate(
          s * 1.0 * S,
          0.55 * S,
          -0.1 * S,
        ),
        t(0.5),
      ),
    );
  // mantlet slot block at the front of the drum
  parts.push(
    tinted(
      new THREE.BoxGeometry(1.0 * S, 0.5 * S, 0.4 * S).translate(
        0,
        0.7 * S,
        -0.95 * S,
      ),
      t(0.45),
    ),
  );
  const body = mergeParts(parts);
  faceUV(body, opts.texel || 1 / 5);

  // barrels around the pivot: breech, two tubes with recoil sleeves and muzzle collars
  const bp = [];
  bp.push(
    tinted(
      new THREE.BoxGeometry(0.92 * S, 0.42 * S, 0.7 * S).translate(
        0,
        0,
        0.05 * S,
      ),
      darkC.clone().multiplyScalar(1.15),
    ),
  );
  const tubeLen = 3.1 * S;
  const z0 = -0.3 * S;
  for (const s of [-1, 1]) {
    const x = s * 0.26 * S;
    bp.push(
      tinted(
        cylZ(0.1 * S, 0.14 * S, tubeLen, 8, true).translate(
          x,
          0,
          z0 - tubeLen / 2,
        ),
        darkC,
      ),
    );
    bp.push(
      tinted(
        cylZ(0.2 * S, 0.2 * S, 0.7 * S, 8).translate(x, 0, z0 - 0.35 * S),
        darkC.clone().multiplyScalar(0.85),
      ),
    );
    bp.push(
      tinted(
        cylZ(0.15 * S, 0.15 * S, 0.3 * S, 8).translate(
          x,
          0,
          z0 - tubeLen + 0.15 * S,
        ),
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
    pivotY: 0.7 * S,
    barrelLen: -z0 + tubeLen + 0.05 * S,
    yawLimit: opts.yawLimit ?? 2.7,
    pitchMin: opts.pitchMin ?? -0.05,
    pitchMax: opts.pitchMax ?? 1.2,
    rate: opts.rate ?? 0.5,
    size: S,
  };
}

/** Quad turbolaser: low base ring, boxy housing with a stepped roof, four short tubes in a 2 x 2 block. */
export function quadTurret(S, base, dark, opts = {}) {
  const t = (k) => base.clone().multiplyScalar(k);
  const darkC = dark instanceof THREE.Color ? dark : new THREE.Color(dark);
  const parts = [];
  parts.push(
    tinted(
      new THREE.CylinderGeometry(1.15 * S, 1.25 * S, 0.2 * S, 10).translate(
        0,
        0.1 * S,
        0,
      ),
      t(0.8),
    ),
  );
  parts.push(
    tinted(
      new THREE.BoxGeometry(1.7 * S, 0.7 * S, 1.5 * S).translate(
        0,
        0.2 * S + 0.35 * S,
        0.1 * S,
      ),
      t(1.0),
    ),
  );
  parts.push(
    tinted(
      new THREE.BoxGeometry(1.1 * S, 0.3 * S, 1.0 * S).translate(
        0,
        0.9 * S + 0.15 * S,
        0.2 * S,
      ),
      t(0.9),
    ),
  );
  parts.push(
    tinted(
      new THREE.BoxGeometry(1.3 * S, 0.44 * S, 0.3 * S).translate(
        0,
        0.6 * S,
        -0.8 * S,
      ),
      t(0.45),
    ),
  );
  const body = mergeParts(parts);
  faceUV(body, opts.texel || 1 / 3);
  const bp = [];
  bp.push(
    tinted(
      new THREE.BoxGeometry(1.1 * S, 0.5 * S, 0.6 * S),
      darkC.clone().multiplyScalar(1.15),
    ),
  );
  const tubeLen = 2.3 * S;
  const z0 = -0.28 * S;
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) {
      const x = sx * 0.3 * S;
      const y = sy * 0.13 * S;
      bp.push(
        tinted(
          cylZ(0.065 * S, 0.09 * S, tubeLen, 6, true).translate(
            x,
            y,
            z0 - tubeLen / 2,
          ),
          darkC,
        ),
      );
      bp.push(
        tinted(
          cylZ(0.1 * S, 0.1 * S, 0.2 * S, 6).translate(
            x,
            y,
            z0 - tubeLen + 0.1 * S,
          ),
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
    texel: opts.texel || 1 / 3,
    pivotY: 0.6 * S,
    barrelLen: -z0 + tubeLen + 0.05 * S,
    yawLimit: opts.yawLimit ?? 2.6,
    pitchMin: opts.pitchMin ?? -0.08,
    pitchMax: opts.pitchMax ?? 1.25,
    rate: opts.rate ?? 1.0,
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
