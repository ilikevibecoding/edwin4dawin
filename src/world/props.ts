import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp01, Rng } from '../core/math';

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

const TRUNK_COLOR = 0x6b4c31;
const TRUNK_SHADE = 0x4a3521;
const FROND_COLOR = 0x4f8a3c;
const FROND_DARK = 0x2f5d27;

/** A single drooping palm frond, built from a tapered strip. */
function frondGeometry(length: number, width: number, droop: number): THREE.BufferGeometry {
  const segments = 6;
  const positions: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];
  const uvs: number[] = [];
  const light = new THREE.Color(FROND_COLOR);
  const dark = new THREE.Color(FROND_DARK);
  const c = new THREE.Color();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const z = t * length;
    const y = -droop * t * t * length;
    const w = width * (0.35 + 0.9 * Math.sin(Math.PI * clamp01(t * 0.92 + 0.06)));
    positions.push(-w, y, z, 0, y + w * 0.22, z, w, y, z);
    c.copy(dark).lerp(light, 0.35 + 0.65 * (1 - t));
    for (let k = 0; k < 3; k++) colors.push(c.r, c.g, c.b);
    uvs.push(0, t, 0.5, t, 1, t);
  }
  for (let i = 0; i < segments; i++) {
    const a = i * 3;
    const b = (i + 1) * 3;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
    indices.push(a + 1, b + 1, a + 2, b + 1, b + 2, a + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
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
    radii.push(0.26 - 0.13 * t + Math.sin(t * 9) * 0.01);
  }
  parts.push(tubeAlongCurve(spine, radii, 8, TRUNK_COLOR, TRUNK_SHADE));

  const top = spine[spine.length - 1].clone();
  const crownTilt = new THREE.Vector3()
    .subVectors(spine[segments], spine[segments - 2])
    .normalize();

  const frondCount = rng.int(11, 15);
  for (let i = 0; i < frondCount; i++) {
    const angle = (i / frondCount) * Math.PI * 2 + rng.float(-0.18, 0.18);
    // Outer fronds arch over, inner ones still point up.
    const pitch = i % 3 === 0 ? rng.float(-0.75, -0.35) : rng.float(-0.25, 0.35);
    const frond = frondGeometry(rng.float(3.0, 4.6), rng.float(0.8, 1.15), rng.float(0.3, 0.6));
    const euler = new THREE.Euler(pitch, angle, 0, 'YXZ');
    parts.push(transformed(frond, top, euler));
  }

  // A short stub of dead fronds under the crown.
  for (let i = 0; i < 3; i++) {
    const angle = rng.float(0, Math.PI * 2);
    const frond = frondGeometry(1.5, 0.4, 0.9);
    paint(frond, 0x7a6435);
    parts.push(transformed(frond, top, new THREE.Euler(-1.15, angle, 0, 'YXZ')));
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
  const geometry = new THREE.IcosahedronGeometry(size, rng.bool(0.5) ? 1 : 2);
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const squash = rng.float(0.45, 0.85);
  for (let i = 0; i < pos.count; i++) {
    const n = 1 + rng.float(-0.24, 0.24);
    pos.setXYZ(i, pos.getX(i) * n, pos.getY(i) * n * squash, pos.getZ(i) * n);
  }
  geometry.computeVertexNormals();
  const moss = new THREE.Color(0x4b6b3a);
  const stone = new THREE.Color(0x6d6a60);
  const dark = new THREE.Color(0x3d3b36);
  return paintBy(geometry, (_x, y, _z, out) => {
    const up = clamp01(y / (size * squash) * 0.5 + 0.5);
    out.copy(dark).lerp(stone, up * 0.9 + 0.1);
    out.lerp(moss, clamp01((up - 0.72) * 3) * 0.6);
  });
}

export function bushGeometry(rng: Rng): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const blobs = rng.int(2, 5);
  for (let i = 0; i < blobs; i++) {
    const r = rng.float(0.5, 1.05);
    const blob = new THREE.DodecahedronGeometry(r, 0);
    roughen(blob, r * 0.16, rng);
    paint(blob, i % 2 === 0 ? 0x3f7434 : 0x54903c);
    parts.push(
      transformed(blob, {
        x: rng.float(-0.6, 0.6),
        y: r * 0.55 + rng.float(0, 0.3),
        z: rng.float(-0.6, 0.6),
      }),
    );
  }
  return mergeParts(parts);
}

/** Tall grass tuft: a few crossed blades, cheap enough to scatter densely. */
export function grassTuftGeometry(rng: Rng): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const h = rng.float(0.32, 0.62);
    const blade = new THREE.ConeGeometry(0.045, h, 3, 1);
    // Darker at the root, drier towards the tips, and close enough to the
    // terrain palette that a tuft reads as part of the ground.
    paint(blade, [0x4c6b32, 0x3f5d2b, 0x5c7538][i % 3]);
    parts.push(
      transformed(
        blade,
        { x: rng.float(-0.16, 0.16), y: h * 0.5, z: rng.float(-0.16, 0.16) },
        new THREE.Euler(rng.float(-0.45, 0.45), rng.float(0, 3), rng.float(-0.45, 0.45)),
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
