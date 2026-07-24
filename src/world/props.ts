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

/** A leaning palm: bent tapered trunk, ring of fronds, a couple of coconuts. */
export function palmGeometry(rng: Rng): THREE.BufferGeometry {
  const height = rng.float(5.5, 9.5);
  const lean = rng.float(0.1, 0.42);
  const leanDir = rng.float(0, Math.PI * 2);
  const segments = 9;
  const parts: THREE.BufferGeometry[] = [];

  const top = new THREE.Vector3();
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const y0 = t0 * height;
    const y1 = t1 * height;
    const bend0 = lean * y0 * t0;
    const bend1 = lean * y1 * t1;
    const r0 = 0.42 - 0.22 * t0;
    const r1 = 0.42 - 0.22 * t1;
    const seg = new THREE.CylinderGeometry(r1, r0, y1 - y0, 6, 1);
    paint(seg, i % 2 === 0 ? TRUNK_COLOR : TRUNK_SHADE);
    const mid = new THREE.Vector3(
      Math.cos(leanDir) * (bend0 + bend1) * 0.5,
      (y0 + y1) * 0.5,
      Math.sin(leanDir) * (bend0 + bend1) * 0.5,
    );
    parts.push(transformed(seg, mid));
    if (i === segments - 1) top.set(Math.cos(leanDir) * bend1, y1, Math.sin(leanDir) * bend1);
  }

  const frondCount = rng.int(6, 9);
  for (let i = 0; i < frondCount; i++) {
    const angle = (i / frondCount) * Math.PI * 2 + rng.float(-0.2, 0.2);
    const pitch = rng.float(-0.5, 0.12);
    const frond = frondGeometry(rng.float(2.6, 4.2), rng.float(0.42, 0.62), rng.float(0.25, 0.5));
    const euler = new THREE.Euler(pitch, angle, 0, 'YXZ');
    parts.push(transformed(frond, top, euler));
  }

  for (let i = 0; i < rng.int(0, 4); i++) {
    const nut = new THREE.IcosahedronGeometry(0.22, 0);
    paint(nut, 0x4a3b1e);
    const angle = rng.float(0, Math.PI * 2);
    parts.push(
      transformed(nut, {
        x: top.x + Math.cos(angle) * 0.35,
        y: top.y - 0.35,
        z: top.z + Math.sin(angle) * 0.35,
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
  for (let i = 0; i < 3; i++) {
    const h = rng.float(0.5, 1.0);
    const blade = new THREE.ConeGeometry(0.09, h, 3, 1);
    paint(blade, i % 2 === 0 ? 0x6ea143 : 0x54833a);
    parts.push(
      transformed(blade, { x: rng.float(-0.2, 0.2), y: h * 0.5, z: rng.float(-0.2, 0.2) }, new THREE.Euler(rng.float(-0.3, 0.3), rng.float(0, 3), rng.float(-0.3, 0.3))),
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
