import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp01, Rng } from '../core/math';

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Tilts a leaf card's normals towards the sky. Flat cards pointing every which
 * way leave half of any clump edge-on to the sun, which reads as black plastic;
 * biasing upwards lights foliage the way real foliage is lit, from above.
 *
 * Kept well short of straight up. Bias it too far and every leaf in a crown
 * takes the sun full on at the same angle, which trades black plastic for a
 * flat sheet of acid green with no shape to it at all.
 */
function skyBiasNormals(geometry: THREE.BufferGeometry, amount: number): void {
  const normals = geometry.attributes.normal as THREE.BufferAttribute;
  const n = new THREE.Vector3();
  for (let i = 0; i < normals.count; i++) {
    n.fromBufferAttribute(normals, i).lerp(UP, amount).normalize();
    normals.setXYZ(i, n.x, n.y, n.z);
  }
  normals.needsUpdate = true;
}

/**
 * Geometry builders for everything scattered across the world. Each returns a
 * geometry that already carries vertex colours, so a whole island's worth of
 * palms, rocks and crates can share one material (and one draw call via
 * InstancedMesh).
 */

/**
 * Merges prop parts and disposes the sources. Throws loudly instead of
 * returning null, because a silent failure here shows up much later as a
 * mysterious "cannot read id of null" during rendering.
 */
export function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // Three's polyhedra (icosahedron, dodecahedron) come out non-indexed while
  // cylinders and boxes are indexed, and merging refuses to mix the two.
  const anyNonIndexed = parts.some((p) => p.index === null);
  const normalized = anyNonIndexed
    ? parts.map((p) => {
        if (p.index === null) return p;
        const flat = p.toNonIndexed();
        p.dispose();
        return flat;
      })
    : parts;

  const merged = mergeGeometries(normalized, false);
  if (!merged) {
    const attributes = normalized.map((p) => Object.keys(p.attributes).sort().join('+'));
    throw new Error(`mergeParts failed - mismatched attributes: ${[...new Set(attributes)].join(' vs ')}`);
  }
  normalized.forEach((p) => p.dispose());
  return merged;
}

/** Adds a flat vertex colour attribute to a geometry. */
export function paint(geometry: THREE.BufferGeometry, color: THREE.ColorRepresentation): THREE.BufferGeometry {
  const c = new THREE.Color(color);
  const count = geometry.attributes.position.count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** Vertex colour with a per-vertex tint callback, for gradients like mossy rock. */
export function paintBy(
  geometry: THREE.BufferGeometry,
  fn: (x: number, y: number, z: number, out: THREE.Color) => void,
): THREE.BufferGeometry {
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    fn(pos.getX(i), pos.getY(i), pos.getZ(i), c);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export function transformed(
  geometry: THREE.BufferGeometry,
  position: THREE.Vector3Like,
  rotation?: THREE.Euler,
  scale?: THREE.Vector3Like | number,
): THREE.BufferGeometry {
  const m = new THREE.Matrix4();
  const q = rotation ? new THREE.Quaternion().setFromEuler(rotation) : new THREE.Quaternion();
  const s =
    typeof scale === 'number'
      ? new THREE.Vector3(scale, scale, scale)
      : scale
        ? new THREE.Vector3(scale.x, scale.y, scale.z)
        : new THREE.Vector3(1, 1, 1);
  m.compose(new THREE.Vector3(position.x, position.y, position.z), q, s);
  geometry.applyMatrix4(m);
  return geometry;
}

/** Randomly nudges vertices to break up the machined look of primitives. */
export function roughen(geometry: THREE.BufferGeometry, amount: number, rng: Rng): THREE.BufferGeometry {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) + rng.float(-amount, amount),
      pos.getY(i) + rng.float(-amount, amount),
      pos.getZ(i) + rng.float(-amount, amount),
    );
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

// A coconut trunk weathers to pale grey-brown, not the red-brown of freshly cut
// timber. At the saturation this used to carry, a stand of palms read as a row of
// rusty scaffold poles.
const TRUNK_COLOR = 0x8b7c66;
const TRUNK_SHADE = 0x5d5344;
// Coconut fronds seen against a tropical sky are much lighter than the green
// they look on the ground: a dark leaf reads as a silhouette from any distance,
// which is what turned the palms on these islands into black sticks.
const FROND_COLOR = 0x6fa348;
const FROND_DARK = 0x3f6b2c;

/**
 * A palm frond: a drooping rib with a comb of narrow leaflets down each side.
 *
 * What the eye reads on a palm is the *outline* — against a bright sky a frond
 * is a feather, and the thing that says so is a row of fine teeth along each
 * edge. Twenty broad blades, which is what this used to be, is a fern, and the
 * palms on these islands duly read as ferns nailed to poles. So the count
 * matters far more than the detail of any one leaflet: each is a single tapered
 * triangle, which is the shape a leaflet actually is, and the budget goes on
 * having plenty of them.
 */
function frondGeometry(length: number, width: number, droop: number, rng?: Rng): THREE.BufferGeometry {
  const stations = 24;
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const light = new THREE.Color(FROND_COLOR);
  const dark = new THREE.Color(FROND_DARK);
  const c = new THREE.Color();
  const jitter = (amount: number) => (rng ? rng.float(-amount, amount) : 0);

  /** Point on the rib at 0..1 along its length. */
  const ribAt = (t: number) => ({
    y: -droop * t * t * length,
    z: t * length,
    // The rib itself lifts slightly before it arcs over.
    lift: Math.sin(t * Math.PI) * length * 0.05,
  });

  // Midrib: a narrow strip so the frond still reads from directly below, where
  // every leaflet is edge-on.
  for (let i = 0; i < stations; i++) {
    const t = i / (stations - 1);
    const p = ribAt(t);
    const halfRib = width * 0.05 * (1 - t * 0.75);
    c.copy(dark).lerp(light, 0.4 + 0.3 * (1 - t));
    positions.push(-halfRib, p.y + p.lift, p.z, halfRib, p.y + p.lift, p.z);
    colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
    uvs.push(0, t, 1, t);
    if (i > 0) {
      const a = (i - 1) * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }

  let vertex = stations * 2;
  const step = length / (stations - 1);
  for (let i = 1; i < stations; i++) {
    const t = i / (stations - 1);
    const p = ribAt(t);
    // Longest around the middle of the frond, stubby at the base and tapering
    // to nothing at the tip.
    const span = width * (0.3 + 0.95 * Math.sin(Math.PI * clamp01(t * 0.9 + 0.07)));
    const rootY = p.y + p.lift;
    for (const side of [-1, 1]) {
      // Swept back towards the tip, more so the further out along the rib.
      const sweep = 0.55 + t * 0.75 + jitter(0.12);
      // A frond is folded along its rib: basal leaflets stand up out of it in a
      // shallow V, and by the tip they are hanging well below. Getting that
      // sign change right is most of why a crown catches light on one face and
      // falls into shadow on the other.
      const rise = span * (0.34 - 1.05 * t + jitter(0.1));
      const half = step * (0.55 + jitter(0.12));

      c.copy(dark).lerp(light, 0.28 + 0.55 * (1 - t) + jitter(0.14));
      positions.push(0, rootY, p.z - half);
      positions.push(0, rootY, p.z + half);
      positions.push(side * span, rootY + rise, p.z + span * sweep);
      for (let k = 0; k < 3; k++) colors.push(c.r, c.g, c.b);
      uvs.push(0, 0, 0, 1, 1, 0.5);
      // Wound so the upper face is the front one on both sides of the rib.
      if (side < 0) indices.push(vertex, vertex + 1, vertex + 2);
      else indices.push(vertex + 1, vertex, vertex + 2);
      vertex += 3;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  skyBiasNormals(geometry, 0.3);
  return geometry;
}

/**
 * Smooth tapered tube swept along a poly-line. Used for palm trunks, where
 * stacking cylinders leaves visible steps at every joint.
 */
function tubeAlongCurve(
  points: THREE.Vector3[],
  radii: number[],
  radialSegments: number,
  colorA: THREE.ColorRepresentation,
  colorB: THREE.ColorRepresentation,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const tangent = new THREE.Vector3();
  // Carry the reference direction along the curve so the tube does not twist.
  let normal = new THREE.Vector3(1, 0, 0);
  const binormal = new THREE.Vector3();
  const a = new THREE.Color(colorA);
  const b = new THREE.Color(colorB);
  const c = new THREE.Color();

  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    tangent.subVectors(next, prev).normalize();
    normal = normal.clone().sub(tangent.clone().multiplyScalar(normal.dot(tangent)));
    if (normal.lengthSq() < 1e-5) normal.set(tangent.y > 0.9 ? 1 : 0, 0, tangent.y > 0.9 ? 0 : 1);
    normal.normalize();
    binormal.crossVectors(tangent, normal).normalize();

    const t = i / (points.length - 1);
    for (let s = 0; s < radialSegments; s++) {
      const angle = (s / radialSegments) * Math.PI * 2;
      const offset = normal
        .clone()
        .multiplyScalar(Math.cos(angle) * radii[i])
        .add(binormal.clone().multiplyScalar(Math.sin(angle) * radii[i]));
      positions.push(points[i].x + offset.x, points[i].y + offset.y, points[i].z + offset.z);
      // Alternating bands read as the ringed bark of a palm.
      c.copy(a).lerp(b, (Math.sin(t * 26) * 0.5 + 0.5) * 0.7 + Math.cos(angle * 2) * 0.12);
      colors.push(c.r, c.g, c.b);
      uvs.push(s / radialSegments, t);
    }
  }

  for (let i = 0; i < points.length - 1; i++) {
    for (let s = 0; s < radialSegments; s++) {
      const next = (s + 1) % radialSegments;
      const i0 = i * radialSegments + s;
      const i1 = i * radialSegments + next;
      const i2 = (i + 1) * radialSegments + next;
      const i3 = (i + 1) * radialSegments + s;
      indices.push(i0, i1, i2, i0, i2, i3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A leaning palm: smoothly bent tapered trunk, crown of fronds, coconuts. */
export function palmGeometry(rng: Rng): THREE.BufferGeometry {
  const height = rng.float(6, 10.5);
  const lean = rng.float(0.12, 0.4);
  const leanDir = rng.float(0, Math.PI * 2);
  const segments = 12;
  const parts: THREE.BufferGeometry[] = [];

  const spine: THREE.Vector3[] = [];
  const radii: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const y = t * height;
    // The bend accelerates towards the crown, like a palm reaching for light.
    const bend = lean * height * t * t;
    spine.push(new THREE.Vector3(Math.cos(leanDir) * bend, y, Math.sin(leanDir) * bend));
    // Flared at the foot, where the root mass swells out, then near-parallel all
    // the way up with the ring scars showing as a slight ripple.
    radii.push(0.17 - 0.04 * t + Math.pow(1 - t, 7) * 0.16 + Math.sin(t * 11) * 0.008);
  }
  parts.push(tubeAlongCurve(spine, radii, 8, TRUNK_COLOR, TRUNK_SHADE));

  const top = spine[spine.length - 1].clone();
  const crownTilt = new THREE.Vector3()
    .subVectors(spine[segments], spine[segments - 2])
    .normalize();

  // The crown boot: the swollen mass of old frond bases the head sits on. Without
  // it the fronds appear to sprout out of the end of a broomstick.
  const boot = new THREE.CylinderGeometry(0.3, 0.19, 0.55, 9, 1, true);
  paintBy(boot, (_x, y, _z, out) => {
    out.set(0x5c4a33).lerp(new THREE.Color(0x7d6a4a), y > 0 ? 0.65 : 0.15);
  });
  parts.push(transformed(boot, { x: top.x, y: top.y - 0.18, z: top.z }));

  const frondCount = rng.int(16, 21);
  for (let i = 0; i < frondCount; i++) {
    // Phyllotaxis, not a fan. Fronds leave the meristem at the golden angle;
    // dividing the circle evenly by index is what makes a procedural palm look
    // like a patio umbrella.
    const angle = i * 2.39996 + rng.float(-0.12, 0.12);
    // Each new frond pushes the older ones outward and down, so a crown is a
    // fountain: spears standing near-vertical in the middle, and a skirt of old
    // fronds hanging almost straight down round the outside.
    const age = (i + rng.float(0, 0.8)) / frondCount;
    const pitch = -0.95 + Math.pow(age, 1.15) * 2.15;
    const length = rng.float(3.1, 4.5) * (0.6 + 0.4 * Math.min(1, age * 4));
    const frond = frondGeometry(length, rng.float(0.62, 0.86), rng.float(0.28, 0.5), rng);
    // A little roll, so no two fronds present the same face to the sun.
    const euler = new THREE.Euler(pitch, angle, rng.float(-0.3, 0.3), 'YXZ');
    parts.push(transformed(frond, top, euler));
  }

  // Dead fronds still hanging on under the crown, collapsed against the trunk.
  for (let i = 0; i < 3; i++) {
    const angle = rng.float(0, Math.PI * 2);
    const frond = frondGeometry(1.7, 0.34, 1.0);
    paint(frond, 0x7a6435);
    parts.push(transformed(frond, top, new THREE.Euler(1.38, angle, 0, 'YXZ')));
  }

  for (let i = 0; i < rng.int(2, 6); i++) {
    const nut = new THREE.IcosahedronGeometry(0.2, 0);
    paint(nut, 0x4a3b1e);
    const angle = rng.float(0, Math.PI * 2);
    parts.push(
      transformed(nut, {
        x: top.x + Math.cos(angle) * 0.3 + crownTilt.x * 0.2,
        y: top.y - 0.32,
        z: top.z + Math.sin(angle) * 0.3 + crownTilt.z * 0.2,
      }),
    );
  }

  return mergeParts(parts);
}

export function rockGeometry(rng: Rng, size = 1): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(size, 2);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const squash = rng.float(0.45, 0.85);
  // Two scales of lumpiness: broad boulder shape, then a chipped surface.
  const warp = { x: rng.float(0.6, 1.5), y: rng.float(0.6, 1.5), z: rng.float(0.6, 1.5) };
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const broad = 1 + 0.22 * Math.sin(x * warp.x * 2.1) * Math.cos(z * warp.z * 1.7) + 0.14 * Math.sin(y * warp.y * 3.3);
    const chip = 1 + rng.float(-0.07, 0.07);
    pos.setXYZ(i, x * broad * chip, y * broad * chip * squash, z * broad * chip);
  }
  geometry.computeVertexNormals();

  // Triplanar UVs in metres: the polyhedron is non-indexed, so every vertex
  // already carries its face normal and can pick the axis it faces.
  const normals = geometry.attributes.normal as THREE.BufferAttribute;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(normals.getX(i));
    const ny = Math.abs(normals.getY(i));
    const nz = Math.abs(normals.getZ(i));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (ny >= nx && ny >= nz) {
      uvs[i * 2] = x;
      uvs[i * 2 + 1] = z;
    } else if (nx >= nz) {
      uvs[i * 2] = z;
      uvs[i * 2 + 1] = y;
    } else {
      uvs[i * 2] = x;
      uvs[i * 2 + 1] = y;
    }
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

  const moss = new THREE.Color(0x5c7a44);
  const stone = new THREE.Color(0xb0aca0);
  const dark = new THREE.Color(0x6f6c64);
  return paintBy(geometry, (_x, y, _z, out) => {
    const up = clamp01((y / (size * squash)) * 0.5 + 0.5);
    out.copy(dark).lerp(stone, up * 0.9 + 0.1);
    out.lerp(moss, clamp01((up - 0.74) * 3.4) * 0.5);
  });
}

/**
 * Tropical scrub: a couple of rough masses for the body of the bush, then a
 * scatter of leaf cards around the outside so the silhouette has leaves in it
 * instead of reading as a faceted ball.
 */
export function bushGeometry(rng: Rng): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const blobs = rng.int(2, 4);
  const radii: number[] = [];
  const centres: THREE.Vector3[] = [];

  for (let i = 0; i < blobs; i++) {
    const r = rng.float(0.45, 0.9);
    const centre = new THREE.Vector3(rng.float(-0.5, 0.5), r * 0.5 + rng.float(0, 0.25), rng.float(-0.5, 0.5));
    const blob = new THREE.DodecahedronGeometry(r, 0);
    roughen(blob, r * 0.2, rng);
    paint(blob, i % 2 === 0 ? 0x2f5626 : 0x3d6a2c);
    parts.push(transformed(blob, centre));
    radii.push(r);
    centres.push(centre);
  }

  const leafColors = [0x3f6d2c, 0x315c22, 0x4d7a31, 0x2a4f20];
  for (let i = 0; i < 26; i++) {
    const pick = rng.int(0, blobs);
    const centre = centres[pick];
    const r = radii[pick];
    const theta = rng.float(0, Math.PI * 2);
    const phi = rng.float(-0.35, 1.15);
    const leaf = new THREE.PlaneGeometry(rng.float(0.16, 0.3), rng.float(0.22, 0.42));
    paint(leaf, leafColors[i % leafColors.length]);
    parts.push(
      transformed(
        leaf,
        {
          x: centre.x + Math.cos(theta) * Math.cos(phi) * r * 0.95,
          y: centre.y + Math.sin(phi) * r * 0.95,
          z: centre.z + Math.sin(theta) * Math.cos(phi) * r * 0.95,
        },
        new THREE.Euler(rng.float(-1.2, 1.2), theta + rng.float(-0.5, 0.5), rng.float(-0.6, 0.6)),
      ),
    );
  }

  const bush = mergeParts(parts);
  skyBiasNormals(bush, 0.28);
  return bush;
}

/**
 * Tall grass tuft: blades that taper and arch over, rather than the spikes a
 * cone gives you. Two triangles per segment, so a hillside can still be
 * carpeted in them through one instanced draw.
 */
export function grassTuftGeometry(rng: Rng): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const tint = new THREE.Color();
  const root = new THREE.Color();
  const tip = new THREE.Color();
  // Four blades to a tuft rather than six. Ground cover reads by how many
  // separate clumps the eye can pick out, not by how full each one is, so the
  // triangles are better spent on more tufts.
  const blades = 4;
  const segments = 2;
  let vertex = 0;

  for (let b = 0; b < blades; b++) {
    const height = rng.float(0.3, 0.66);
    const width = rng.float(0.022, 0.04);
    const lean = rng.float(0, Math.PI * 2);
    const arch = rng.float(0.35, 0.95);
    const dx = Math.cos(lean);
    const dz = Math.sin(lean);
    const ox = rng.float(-0.14, 0.14);
    const oz = rng.float(-0.14, 0.14);
    root.setHex([0x445a24, 0x3d521f, 0x4c6528, 0x506126][b % 4]);
    tip.setHex([0x88a04b, 0x94a456, 0x778f41, 0x9aa35d][b % 4]);

    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      // The blade leans away from vertical and curls down at the tip.
      const y = height * Math.sin((t * Math.PI) / 2);
      const reach = height * arch * t * t;
      const w = width * (1 - t * 0.85);
      tint.copy(root).lerp(tip, t);
      // Blades are flat cards; the material is double sided.
      positions.push(ox + dx * reach - dz * w, y, oz + dz * reach + dx * w);
      positions.push(ox + dx * reach + dz * w, y, oz + dz * reach - dx * w);
      colors.push(tint.r, tint.g, tint.b, tint.r, tint.g, tint.b);
      uvs.push(0, t, 1, t);
      if (s > 0) {
        const a = vertex + (s - 1) * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    vertex += (segments + 1) * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  skyBiasNormals(geometry, 0.55);
  return geometry;
}

/** Driftwood: a bleached, broken log for the tideline. */
export function driftwoodGeometry(rng: Rng): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const length = rng.float(1.8, 3.4);
  const radius = rng.float(0.12, 0.22);
  const trunk = new THREE.CylinderGeometry(radius * rng.float(0.6, 0.9), radius, length, 7, 3);
  roughen(trunk, radius * 0.18, rng);
  paintBy(trunk, (_x, y, _z, out) => {
    // Bleached grey on top, damp and darker underneath.
    out.setHex(0x9a8f7c).lerp(new THREE.Color(0x5c4f3c), clamp01(0.5 - y / length));
  });
  parts.push(transformed(trunk, { x: 0, y: radius * 0.9, z: 0 }, new THREE.Euler(0, 0, Math.PI / 2)));

  for (let i = 0; i < rng.int(1, 4); i++) {
    const branchLength = rng.float(0.4, 1.0);
    const branch = new THREE.CylinderGeometry(0.03, 0.06, branchLength, 5, 1);
    paint(branch, 0x86795f);
    parts.push(
      transformed(
        branch,
        { x: rng.float(-length * 0.4, length * 0.4), y: radius * 1.1, z: 0 },
        new THREE.Euler(rng.float(-0.5, 0.5), rng.float(0, 3.14), rng.float(0.7, 1.4)),
      ),
    );
  }
  return mergeParts(parts);
}

export function barrelGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.0, -0.55),
      new THREE.Vector2(0.34, -0.55),
      new THREE.Vector2(0.42, -0.2),
      new THREE.Vector2(0.44, 0.1),
      new THREE.Vector2(0.36, 0.5),
      new THREE.Vector2(0.34, 0.55),
      new THREE.Vector2(0.0, 0.55),
    ],
    12,
  );
  paint(body, 0x6b4a2c);
  parts.push(body);
  for (const y of [-0.34, 0.05, 0.42]) {
    const hoop = new THREE.TorusGeometry(0.41, 0.035, 5, 14);
    paint(hoop, 0x3a3a3d);
    parts.push(transformed(hoop, { x: 0, y, z: 0 }, new THREE.Euler(Math.PI / 2, 0, 0)));
  }
  return mergeParts(parts);
}

export function crateGeometry(rng: Rng): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const s = rng.float(0.6, 0.9);
  const box = new THREE.BoxGeometry(s, s, s);
  paint(box, 0x7a5732);
  parts.push(transformed(box, { x: 0, y: s / 2, z: 0 }));
  // Corner battens.
  for (const [dx, dz] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    const batten = new THREE.BoxGeometry(0.07, s * 1.02, 0.07);
    paint(batten, 0x54391f);
    parts.push(transformed(batten, { x: (dx * s) / 2, y: s / 2, z: (dz * s) / 2 }));
  }
  return mergeParts(parts);
}

/** Cracked-open treasure chest lid shape, also used for the sellable chest. */
export function chestGeometry(gold = false): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const bodyColor = gold ? 0x7a4f1c : 0x5c3f22;
  const trim = gold ? 0xd9a63c : 0x8a8071;

  const body = new THREE.BoxGeometry(1.05, 0.6, 0.7);
  paint(body, bodyColor);
  parts.push(transformed(body, { x: 0, y: 0.3, z: 0 }));

  const lid = new THREE.CylinderGeometry(0.35, 0.35, 1.05, 10, 1, false, 0, Math.PI);
  paint(lid, bodyColor);
  parts.push(transformed(lid, { x: 0, y: 0.6, z: 0 }, new THREE.Euler(0, 0, Math.PI / 2)));

  for (const x of [-0.34, 0.34]) {
    const band = new THREE.BoxGeometry(0.1, 0.64, 0.73);
    paint(band, trim);
    parts.push(transformed(band, { x, y: 0.3, z: 0 }));
    const bandTop = new THREE.CylinderGeometry(0.37, 0.37, 0.1, 10, 1, false, 0, Math.PI);
    paint(bandTop, trim);
    parts.push(transformed(bandTop, { x, y: 0.6, z: 0 }, new THREE.Euler(0, 0, Math.PI / 2)));
  }

  const lock = new THREE.BoxGeometry(0.2, 0.22, 0.1);
  paint(lock, trim);
  parts.push(transformed(lock, { x: 0, y: 0.52, z: 0.35 }));

  return mergeParts(parts);
}

/** Weathered wooden post-and-plank sign. */
export function signGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const post = new THREE.CylinderGeometry(0.09, 0.11, 2.2, 6);
  paint(post, 0x5a3f24);
  parts.push(transformed(post, { x: 0, y: 1.1, z: 0 }));
  const board = new THREE.BoxGeometry(1.6, 0.5, 0.08);
  paint(board, 0x7d5a33);
  parts.push(transformed(board, { x: 0, y: 1.85, z: 0 }, new THREE.Euler(0, 0, -0.06)));
  return mergeParts(parts);
}

/** Half-buried wreck: ribs of a hull poking out of the sand. */
export function wreckGeometry(rng: Rng): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const keel = new THREE.BoxGeometry(9, 0.5, 0.7);
  paint(keel, 0x4a3520);
  parts.push(transformed(keel, { x: 0, y: 0.2, z: 0 }, new THREE.Euler(0, 0, 0.06)));

  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = -4 + t * 8;
    const height = 1.6 + Math.sin(t * Math.PI) * 2.1;
    const rib = new THREE.BoxGeometry(0.28, height, 0.24);
    paint(rib, i % 2 === 0 ? 0x533c24 : 0x624627);
    const tilt = 0.35 + rng.float(-0.12, 0.12);
    for (const side of [-1, 1]) {
      parts.push(
        transformed(
          rib.clone(),
          { x, y: height * 0.42, z: side * (0.6 + Math.sin(t * Math.PI) * 0.9) },
          new THREE.Euler(side * tilt, 0, rng.float(-0.1, 0.1)),
        ),
      );
    }
    rib.dispose();
  }

  const mast = new THREE.CylinderGeometry(0.18, 0.26, 6.5, 7);
  paint(mast, 0x4f3a22);
  parts.push(transformed(mast, { x: 1.2, y: 1.6, z: 0 }, new THREE.Euler(0.9, 0.3, 0.2)));

  return mergeParts(parts);
}

/** Shared material for all vertex-coloured scatter props. */
export function propMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.02,
  });
}

/** Shared time and wind for every swaying plant on every island. */
export const foliageUniforms = {
  uTime: { value: 0 },
  uWind: { value: new THREE.Vector2(1, 0) },
};

/**
 * Grass and scrub, bent over by the wind. The sway is keyed off each instance's
 * world position so a hillside ripples rather than moving as one piece, and it
 * scales with height above the root so the base stays planted.
 */
export function foliageMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = foliageUniforms.uTime;
    shader.uniforms.uWind = foliageUniforms.uWind;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform vec2 uWind;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 root = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
        #else
          vec2 root = vec2(0.0);
        #endif
        float phase = uTime * 1.9 + root.x * 0.35 + root.y * 0.27;
        float gust = 0.6 + 0.4 * sin(uTime * 0.4 + root.x * 0.05);
        float bend = (sin(phase) + 0.35 * sin(phase * 2.3)) * 0.11 * gust;
        transformed.xz += uWind * bend * max(0.0, transformed.y);`,
      );
  };

  return material;
}

/**
 * Palms, which need two things nothing else in the world does.
 *
 * Double-sided, because a frond is a sheet one triangle thick: with backface
 * culling on, every leaflet on one side of each rib is simply absent, and half
 * of every crown on every island was being thrown away.
 *
 * And a sway of their own. A ten-metre trunk is stiff at the foot and limber at
 * the head, and it moves on a period of several seconds - nothing like the
 * flutter that suits grass. The leaflets do flutter at that quicker rate on top
 * of it, since they have the leverage for it and the trunk has not.
 */
export function palmMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.86,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = foliageUniforms.uTime;
    shader.uniforms.uWind = foliageUniforms.uWind;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform vec2 uWind;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec2 palmRoot = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
        #else
          vec2 palmRoot = vec2(0.0);
        #endif
        float palmPhase = uTime * 0.72 + palmRoot.x * 0.21 + palmRoot.y * 0.17;
        float palmGust = 0.62 + 0.38 * sin(uTime * 0.21 + palmRoot.x * 0.04);
        float stalk = pow(max(0.0, transformed.y) * 0.11, 1.7);
        float lean = (sin(palmPhase) + 0.3 * sin(palmPhase * 2.1)) * 0.42 * palmGust;
        // Reach out from the trunk axis, taken before the trunk is displaced so
        // that the two motions do not feed into one another.
        float reach = length(transformed.xz);
        transformed.xz += uWind * lean * stalk;
        transformed.y += sin(palmPhase * 4.1 + reach * 1.9) * 0.03 * palmGust * reach;`,
      );
  };

  return material;
}
