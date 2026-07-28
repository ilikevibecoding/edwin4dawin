import * as THREE from 'three';

/**
 * A minimal lofting kit, which is how every hard-surface model in this package
 * is built.
 *
 * Everything an aircraft is made of is a swept cross-section: the fuselage is a
 * superellipse whose width, height and corner sharpness change down its length;
 * a wing is an aerofoil whose chord, thickness and stagger change across its
 * span; an engine nozzle is a circle that steps in and out for the petals. One
 * lofter that takes a list of equal-length rings covers all of them, and the
 * alternative — assembling an aircraft out of boxes and cylinders — is exactly
 * what makes a model read as a paper dart from four hundred metres.
 *
 * Rings are supplied nose-first. Vertex normals are computed from the finished
 * surface rather than analytically, because the interesting parts are the
 * creases where a chine meets a belly and those want the averaged answer.
 */

export interface LoftOptions {
  /** Collapse the first ring to a point at this position. */
  noseTip?: THREE.Vector3 | [number, number, number];
  /** Collapse the last ring to a point at this position. */
  tailTip?: THREE.Vector3 | [number, number, number];
  /** Close the first ring with a flat fan. */
  capNose?: boolean;
  /** Close the last ring with a flat fan. */
  capTail?: boolean;
  /** Metres of surface one UV unit spans; keeps texel density honest. */
  uvScale?: number;
  /** Reverses winding, for surfaces built inside-out. */
  flip?: boolean;
}

/** One cross-section: a flat array of x,y,z triples, all rings the same length. */
export type Ring = Float32Array | number[];

export function loft(rings: Ring[], opts: LoftOptions = {}): THREE.BufferGeometry {
  const ringCount = rings.length;
  if (ringCount < 2) throw new Error('loft needs at least two rings');
  const pointCount = rings[0].length / 3;
  const uvScale = opts.uvScale ?? 1;

  const extra =
    (opts.noseTip ? 1 : 0) + (opts.tailTip ? 1 : 0) + (opts.capNose ? 1 : 0) + (opts.capTail ? 1 : 0);
  const vertexCount = ringCount * pointCount + extra;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices: number[] = [];

  // Cumulative arc length down the loft, so the texture does not stretch where
  // the sections are far apart.
  let run = 0;
  for (let r = 0; r < ringCount; r++) {
    const ring = rings[r];
    if (r > 0) {
      const prev = rings[r - 1];
      let dx = 0;
      let dy = 0;
      let dz = 0;
      for (let p = 0; p < pointCount; p++) {
        dx += ring[p * 3] - prev[p * 3];
        dy += ring[p * 3 + 1] - prev[p * 3 + 1];
        dz += ring[p * 3 + 2] - prev[p * 3 + 2];
      }
      run += Math.hypot(dx, dy, dz) / pointCount;
    }
    // Arc length around the ring, for the same reason.
    let around = 0;
    for (let p = 0; p < pointCount; p++) {
      const i = r * pointCount + p;
      positions[i * 3] = ring[p * 3];
      positions[i * 3 + 1] = ring[p * 3 + 1];
      positions[i * 3 + 2] = ring[p * 3 + 2];
      if (p > 0) {
        around += Math.hypot(
          ring[p * 3] - ring[(p - 1) * 3],
          ring[p * 3 + 1] - ring[(p - 1) * 3 + 1],
          ring[p * 3 + 2] - ring[(p - 1) * 3 + 2],
        );
      }
      uvs[i * 2] = around / uvScale;
      uvs[i * 2 + 1] = run / uvScale;
    }
  }

  const flip = opts.flip === true;
  const quad = (a: number, b: number, c: number, d: number): void => {
    if (flip) indices.push(a, c, b, a, d, c);
    else indices.push(a, b, c, a, c, d);
  };

  for (let r = 0; r < ringCount - 1; r++) {
    for (let p = 0; p < pointCount; p++) {
      const p1 = (p + 1) % pointCount;
      const a = r * pointCount + p;
      const b = r * pointCount + p1;
      const c = (r + 1) * pointCount + p1;
      const d = (r + 1) * pointCount + p;
      quad(a, b, c, d);
    }
  }

  let next = ringCount * pointCount;
  const addTip = (
    tip: THREE.Vector3 | [number, number, number],
    ringIndex: number,
    forward: boolean,
  ): void => {
    const idx = next++;
    const x = Array.isArray(tip) ? tip[0] : tip.x;
    const y = Array.isArray(tip) ? tip[1] : tip.y;
    const z = Array.isArray(tip) ? tip[2] : tip.z;
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    uvs[idx * 2] = 0.5;
    uvs[idx * 2 + 1] = forward ? 0 : run / uvScale;
    for (let p = 0; p < pointCount; p++) {
      const p1 = (p + 1) % pointCount;
      const a = ringIndex * pointCount + p;
      const b = ringIndex * pointCount + p1;
      if (forward !== flip) indices.push(idx, b, a);
      else indices.push(idx, a, b);
    }
  };

  if (opts.noseTip) addTip(opts.noseTip, 0, true);
  if (opts.tailTip) addTip(opts.tailTip, ringCount - 1, false);
  if (opts.capNose) addTip(ringCentre(rings[0], pointCount), 0, true);
  if (opts.capTail) addTip(ringCentre(rings[ringCount - 1], pointCount), ringCount - 1, false);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function ringCentre(ring: Ring, pointCount: number): [number, number, number] {
  let x = 0;
  let y = 0;
  let z = 0;
  for (let p = 0; p < pointCount; p++) {
    x += ring[p * 3];
    y += ring[p * 3 + 1];
    z += ring[p * 3 + 2];
  }
  return [x / pointCount, y / pointCount, z / pointCount];
}

/**
 * A superellipse ring in the XY plane at a given Z.
 *
 * `power` is the exponent: 2 is a plain ellipse, 4 a rounded rectangle, 8 close
 * to a box with filleted corners. Separate upper and lower half-heights, since
 * a fuselage is never symmetric about its own waterline.
 */
export function ellipseRing(
  count: number,
  z: number,
  cy: number,
  halfWidth: number,
  halfUp: number,
  halfDown: number,
  power = 2,
  out?: Float32Array,
): Float32Array {
  const ring = out ?? new Float32Array(count * 3);
  const e = 2 / power;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const x = Math.sign(c) * Math.pow(Math.abs(c), e) * halfWidth;
    const half = s >= 0 ? halfUp : halfDown;
    const y = Math.sign(s) * Math.pow(Math.abs(s), e) * half;
    ring[i * 3] = x;
    ring[i * 3 + 1] = cy + y;
    ring[i * 3 + 2] = z;
  }
  return ring;
}

/**
 * A four-digit NACA thickness distribution, which is what gives a wing section
 * its round nose and sharp trailing edge. Both are visible in silhouette from
 * anywhere the aircraft passes close, and a wing built as a flat plate is the
 * single most obvious tell that a model was assembled out of boxes.
 */
export function airfoilHalfThickness(s: number, thickness: number): number {
  const t = Math.min(1, Math.max(0, s));
  return (
    5 *
    thickness *
    (0.2969 * Math.sqrt(t) - 0.126 * t - 0.3516 * t * t + 0.2843 * t * t * t - 0.1015 * t * t * t * t)
  );
}

/**
 * A closed aerofoil ring for a span station, in the plane x = `span`.
 *
 * Points run from the leading edge over the top to the trailing edge and back
 * underneath, clustered toward the leading edge where the curvature is.
 */
export function airfoilRing(
  count: number,
  span: number,
  leadingZ: number,
  trailingZ: number,
  cy: number,
  thickness: number,
  camber = 0,
  out?: Float32Array,
): Float32Array {
  const ring = out ?? new Float32Array(count * 3);
  const chord = trailingZ - leadingZ;
  const half = count / 2;
  for (let i = 0; i < count; i++) {
    const upper = i < half;
    // Cosine spacing packs samples where the section is doing something.
    const k = upper ? i / half : (count - i) / half;
    const s = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, k));
    const yt = airfoilHalfThickness(s, thickness / Math.max(chord, 1e-3)) * chord;
    const yc = camber * chord * 4 * s * (1 - s);
    ring[i * 3] = span;
    ring[i * 3 + 1] = cy + yc + (upper ? yt : -yt);
    ring[i * 3 + 2] = leadingZ + chord * s;
  }
  return ring;
}

/** Applies a transform to every vertex of a geometry, in place. */
export function transformGeometry(
  geo: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
): THREE.BufferGeometry {
  geo.applyMatrix4(matrix);
  return geo;
}

/** A mirrored copy about the YZ plane, with winding fixed. */
export function mirrorX(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const copy = geo.clone();
  copy.scale(-1, 1, 1);
  const index = copy.getIndex();
  if (index) {
    const a = index.array as Uint16Array | Uint32Array;
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i + 1];
      a[i + 1] = a[i + 2];
      a[i + 2] = t;
    }
    index.needsUpdate = true;
  }
  copy.computeVertexNormals();
  return copy;
}
