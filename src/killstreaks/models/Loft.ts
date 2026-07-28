/**
 * Geometry builders for airframes.
 *
 * Aircraft are seen against the sky at two hundred metres, where surface detail
 * is invisible and silhouette is everything. Two shapes carry that silhouette and
 * neither can be faked with a box:
 *
 * `loftSections` sweeps a superellipse along a spine. The exponent is what makes
 * it useful: 2 gives a circular section for a nose radome, 3.4 gives the
 * flat-bottomed rounded-square of a strike fuselage, and interpolating between
 * stations transitions from one to the other the way a real mould line does. The
 * profile can also be offset vertically per station, which is what puts the
 * spine of the fuselage above the thrust line and gives the shape its dropped
 * nose.
 *
 * `airfoilWing` builds a wing from a NACA four-digit symmetric thickness
 * distribution, lofted between a root and tip section with real sweep, taper and
 * dihedral. A wing plate reads as paper from any angle because its leading edge
 * is a line rather than a rounded curve catching a highlight, and because it has
 * no thickness gradient for the light to run along. Six percent thickness on a
 * five metre chord is only 300 mm, so this costs almost nothing in silhouette
 * terms and buys the entire read.
 */
import * as THREE from 'three';

export interface LoftStation {
  /** Position along the spine, +Z is forward (nose). */
  z: number;
  /** Half-width and half-height of the section. */
  halfWidth: number;
  halfHeight: number;
  /** Section centre offset from the spine. */
  offsetY?: number;
  offsetX?: number;
  /** Superellipse exponent: 2 = ellipse, 4 = nearly square. */
  exponent?: number;
  /** Extra flattening of the lower half, 0..1. Fuselage bellies are flatter. */
  bellyFlatten?: number;
}

const TAU = Math.PI * 2;

/**
 * Sweeps a superellipse through the supplied stations.
 *
 * Sections with a zero radius collapse to a point, so a nose or a tail cone is
 * expressed as a station rather than as a separate cap.
 */
export function loftSections(
  stations: readonly LoftStation[],
  radialSegments = 14,
  capEnds = true,
): THREE.BufferGeometry {
  const rings = stations.length;
  if (rings < 2) throw new Error('[killstreaks] a loft needs at least two stations');

  const segments = Math.max(4, radialSegments);
  const vertsPerRing = segments + 1; // duplicated seam for clean UVs
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  let spineLength = 0;
  const arc: number[] = [0];
  for (let i = 1; i < rings; i++) {
    spineLength += Math.abs(stations[i].z - stations[i - 1].z);
    arc.push(spineLength);
  }

  for (let r = 0; r < rings; r++) {
    const s = stations[r];
    const exponent = s.exponent ?? 2;
    const power = 2 / exponent;
    const belly = s.bellyFlatten ?? 0;
    const v = spineLength > 1e-6 ? arc[r] / spineLength : r / (rings - 1);

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * TAU;
      const c = Math.cos(theta);
      const sn = Math.sin(theta);
      const sx = Math.sign(c) * Math.pow(Math.abs(c), power);
      let sy = Math.sign(sn) * Math.pow(Math.abs(sn), power);
      if (sy < 0 && belly > 0) sy *= 1 - belly;

      positions.push(
        (s.offsetX ?? 0) + sx * s.halfWidth,
        (s.offsetY ?? 0) + sy * s.halfHeight,
        s.z,
      );
      uvs.push(i / segments, v);
    }
  }

  for (let r = 0; r < rings - 1; r++) {
    const a = r * vertsPerRing;
    const b = (r + 1) * vertsPerRing;
    const degenerateA = stations[r].halfWidth < 1e-5 && stations[r].halfHeight < 1e-5;
    const degenerateB =
      stations[r + 1].halfWidth < 1e-5 && stations[r + 1].halfHeight < 1e-5;
    for (let i = 0; i < segments; i++) {
      if (!degenerateA) indices.push(a + i, b + i, a + i + 1);
      if (!degenerateB) indices.push(a + i + 1, b + i, b + i + 1);
    }
  }

  if (capEnds) {
    for (const end of [0, rings - 1]) {
      const s = stations[end];
      if (s.halfWidth < 1e-5 && s.halfHeight < 1e-5) continue;
      const centre = positions.length / 3;
      positions.push(s.offsetX ?? 0, s.offsetY ?? 0, s.z);
      uvs.push(0.5, 0.5);
      const base = end * vertsPerRing;
      for (let i = 0; i < segments; i++) {
        if (end === 0) indices.push(centre, base + i + 1, base + i);
        else indices.push(centre, base + i, base + i + 1);
      }
    }
  }

  return assemble(positions, uvs, indices, 'ks:loft');
}

export interface WingOptions {
  rootChord: number;
  tipChord: number;
  /** Semi-span, measured out along the spanwise axis. */
  span: number;
  /** Leading-edge sweep, radians. */
  sweep: number;
  /** Thickness as a fraction of local chord. */
  thickness: number;
  /** Dihedral, radians. Negative for anhedral. */
  dihedral?: number;
  /** Tip washout, radians. Nose-down at the tip is positive. */
  twist?: number;
  /** Root leading-edge position. Chord runs toward -Z from here. */
  rootLeadingEdgeZ?: number;
  /** Spanwise start offset, e.g. the fuselage half-width. */
  rootOffset?: number;
  /** Mirror to the -X side, with the winding fixed. */
  mirror?: boolean;
  /** Chordwise samples per surface. */
  chordPoints?: number;
  /** Spanwise stations. */
  spanPoints?: number;
  /** Round the tip in instead of leaving a flat cut. */
  taperTip?: boolean;
}

/** NACA four-digit symmetric half-thickness at fractional chord `x`. */
function nacaThickness(x: number, tc: number): number {
  const c = Math.min(1, Math.max(0, x));
  return (
    5 *
    tc *
    (0.2969 * Math.sqrt(c) - 0.126 * c - 0.3516 * c * c + 0.2843 * c * c * c - 0.1015 * c * c * c * c)
  );
}

/**
 * A lofted wing panel. Spanwise axis is +X, chord runs aft along -Z, thickness
 * in Y. Both surfaces plus a tip cap; the root is left open because it is buried
 * in the fuselage.
 */
export function airfoilWing(options: WingOptions): THREE.BufferGeometry {
  const {
    rootChord,
    tipChord,
    span,
    sweep,
    thickness,
    dihedral = 0,
    twist = 0,
    rootLeadingEdgeZ = 0,
    rootOffset = 0,
    mirror = false,
    chordPoints = 16,
    spanPoints = 6,
    taperTip = true,
  } = options;

  const nx = Math.max(6, chordPoints);
  const ny = Math.max(2, spanPoints);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Cosine chordwise spacing: packs samples into the leading edge, which is the
  // only part of the section with real curvature.
  const chordFractions: number[] = [];
  for (let i = 0; i < nx; i++) {
    chordFractions.push(0.5 * (1 - Math.cos((i / (nx - 1)) * Math.PI)));
  }

  const sx = mirror ? -1 : 1;
  const ringSize = nx * 2;

  for (let j = 0; j < ny; j++) {
    const t = j / (ny - 1);
    // Elliptical tip rounding on the last 12% of span, so the tip is a curve
    // rather than a cut-off plate.
    let chordScale = 1;
    if (taperTip && t > 0.88) {
      const u = (t - 0.88) / 0.12;
      chordScale = Math.sqrt(Math.max(0, 1 - u * u));
    }
    const chord = (rootChord + (tipChord - rootChord) * t) * chordScale;
    const stationX = rootOffset + span * t;
    const leadingZ = rootLeadingEdgeZ - Math.tan(sweep) * (span * t);
    const stationY = Math.tan(dihedral) * (span * t);
    const alpha = twist * t;
    const cosA = Math.cos(alpha);
    const sinA = Math.sin(alpha);

    for (let surface = 0; surface < 2; surface++) {
      const sign = surface === 0 ? 1 : -1;
      for (let i = 0; i < nx; i++) {
        const f = chordFractions[i];
        const half = nacaThickness(f, thickness) * chord;
        // Local chord frame: cz aft of the leading edge, cy normal to it.
        const cz = -f * chord;
        const cy = sign * half;
        positions.push(
          sx * stationX,
          stationY + cy * cosA - cz * sinA,
          leadingZ + cz * cosA + cy * sinA,
        );
        uvs.push(f, t * 0.5 + surface * 0.5);
      }
    }
  }

  for (let j = 0; j < ny - 1; j++) {
    for (let surface = 0; surface < 2; surface++) {
      const a = j * ringSize + surface * nx;
      const b = (j + 1) * ringSize + surface * nx;
      for (let i = 0; i < nx - 1; i++) {
        // Upper and lower surfaces wind opposite ways, and mirroring flips both.
        const flip = surface === 1 ? !mirror : mirror;
        if (flip) {
          indices.push(a + i, a + i + 1, b + i);
          indices.push(a + i + 1, b + i + 1, b + i);
        } else {
          indices.push(a + i, b + i, a + i + 1);
          indices.push(a + i + 1, b + i, b + i + 1);
        }
      }
    }
  }

  // Tip cap: stitch the two surfaces together across the last station.
  const tipBase = (ny - 1) * ringSize;
  for (let i = 0; i < nx - 1; i++) {
    const upper = tipBase + i;
    const lower = tipBase + nx + i;
    if (mirror) {
      indices.push(upper, upper + 1, lower);
      indices.push(upper + 1, lower + 1, lower);
    } else {
      indices.push(upper, lower, upper + 1);
      indices.push(upper + 1, lower, lower + 1);
    }
  }

  // Trailing edge closure between the two surfaces along the span.
  for (let j = 0; j < ny - 1; j++) {
    const upperA = j * ringSize + (nx - 1);
    const lowerA = j * ringSize + nx + (nx - 1);
    const upperB = (j + 1) * ringSize + (nx - 1);
    const lowerB = (j + 1) * ringSize + nx + (nx - 1);
    if (mirror) {
      indices.push(upperA, lowerA, upperB);
      indices.push(upperB, lowerA, lowerB);
    } else {
      indices.push(upperA, upperB, lowerA);
      indices.push(upperB, lowerB, lowerA);
    }
  }

  return assemble(positions, uvs, indices, 'ks:wing');
}

/** A cruciform of four thin swept fins, as used on every free-fall bomb. */
export function finCluster(
  count: number,
  rootChord: number,
  tipChord: number,
  height: number,
  sweep: number,
  thickness: number,
  innerRadius: number,
  z: number,
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const fin = airfoilWing({
      rootChord,
      tipChord,
      span: height,
      sweep,
      thickness,
      rootLeadingEdgeZ: 0,
      rootOffset: innerRadius,
      chordPoints: 8,
      spanPoints: 2,
      taperTip: false,
    });
    fin.rotateZ((i / count) * TAU);
    fin.translate(0, 0, z);
    parts.push(fin);
  }
  const merged = mergeAll(parts);
  merged.name = 'ks:fins';
  return merged;
}

/** Simple tube, used for pylons, booms, struts and rotor masts. */
export function tube(
  radius: number,
  length: number,
  segments = 10,
  taper = 1,
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(radius * taper, radius, length, segments, 1, false);
  g.rotateX(Math.PI / 2);
  return g;
}

/**
 * Merges geometries that share an attribute layout. Written here rather than
 * pulled from three's BufferGeometryUtils so the inputs can be disposed as they
 * are consumed — these are all throwaway build-time parts.
 */
export function mergeAll(parts: readonly THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (parts.length === 0) return new THREE.BufferGeometry();
  if (parts.length === 1) return parts[0];

  let vertexCount = 0;
  let indexCount = 0;
  for (const p of parts) {
    vertexCount += p.attributes.position.count;
    const index = p.getIndex();
    indexCount += index ? index.count : p.attributes.position.count;
  }

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);

  let vOffset = 0;
  let iOffset = 0;
  for (const p of parts) {
    if (!p.hasAttribute('normal')) p.computeVertexNormals();
    const pos = p.attributes.position as THREE.BufferAttribute;
    const nor = p.attributes.normal as THREE.BufferAttribute;
    const uv = p.getAttribute('uv') as THREE.BufferAttribute | undefined;
    positions.set(pos.array as Float32Array, vOffset * 3);
    normals.set(nor.array as Float32Array, vOffset * 3);
    if (uv) uvs.set(uv.array as Float32Array, vOffset * 2);
    const index = p.getIndex();
    if (index) {
      for (let i = 0; i < index.count; i++) indices[iOffset + i] = index.getX(i) + vOffset;
      iOffset += index.count;
    } else {
      for (let i = 0; i < pos.count; i++) indices[iOffset + i] = i + vOffset;
      iOffset += pos.count;
    }
    vOffset += pos.count;
    p.dispose();
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  out.setIndex(new THREE.BufferAttribute(indices, 1));
  out.computeBoundingSphere();
  out.computeBoundingBox();
  return out;
}

function assemble(
  positions: number[],
  uvs: number[],
  indices: number[],
  name: string,
): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.name = name;
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

/** Triangle count of a built geometry, for the model budget log. */
export function triangleCount(object: THREE.Object3D): number {
  let total = 0;
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const index = mesh.geometry.getIndex();
    const count = index ? index.count : (mesh.geometry.attributes.position?.count ?? 0);
    total += count / 3;
  });
  return Math.round(total);
}
