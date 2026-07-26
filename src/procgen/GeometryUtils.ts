import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export { mergeGeometries };

/**
 * Geometry helpers the rest of the engine needs in order to make procedural
 * materials look right.
 *
 * The important one is `bevelBox`. Sharp ninety-degree edges everywhere are one
 * of the biggest amateur tells in real-time rendering: every manufactured object
 * has a chamfer or a fillet, and that chamfer is what catches a highlight and
 * separates the object's silhouette from whatever is behind it.
 */

interface Builder {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

const UV_AXES: ReadonlyArray<readonly [number, number]> = [
  [2, 1],
  [0, 2],
  [0, 1],
];

function dominantAxis(n: THREE.Vector3): number {
  const ax = Math.abs(n.x);
  const ay = Math.abs(n.y);
  const az = Math.abs(n.z);
  if (ax >= ay && ax >= az) return 0;
  return ay >= az ? 1 : 2;
}

/** Appends a convex polygon as a triangle fan, fixing winding against `normal`. */
function pushPolygon(
  builder: Builder,
  verts: readonly THREE.Vector3[],
  normal: THREE.Vector3,
  uvScale: number,
): void {
  const ordered = verts.slice();
  if (ordered.length >= 3) {
    const e1 = ordered[1].clone().sub(ordered[0]);
    const e2 = ordered[2].clone().sub(ordered[0]);
    if (e1.cross(e2).dot(normal) < 0) ordered.reverse();
  }

  const [uAxis, vAxis] = UV_AXES[dominantAxis(normal)];
  const base = builder.positions.length / 3;
  for (const v of ordered) {
    builder.positions.push(v.x, v.y, v.z);
    builder.normals.push(normal.x, normal.y, normal.z);
    builder.uvs.push(
      v.getComponent(uAxis) * uvScale + 0.5,
      v.getComponent(vAxis) * uvScale + 0.5,
    );
  }
  for (let i = 2; i < ordered.length; i++) {
    builder.indices.push(base, base + i - 1, base + i);
  }
}

function finish(builder: Builder, name: string): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.name = name;
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(builder.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(builder.normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(builder.uvs, 2));
  geometry.setIndex(builder.indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Box with flat chamfers on all twelve edges and eight corner facets.
 *
 * UVs are world-projected: one UV tile per `1 / uvScale` world units on every
 * face, so a tiled material lines up across adjacent boxes without per-object
 * tweaking.
 */
export function bevelBox(
  width: number,
  height: number,
  depth: number,
  bevel: number,
  uvScale = 1,
): THREE.BufferGeometry {
  const half = [width / 2, height / 2, depth / 2];
  const b = Math.max(1e-4, Math.min(bevel, Math.min(half[0], half[1], half[2]) * 0.9));
  const inner = [half[0] - b, half[1] - b, half[2] - b];

  const builder: Builder = { positions: [], normals: [], uvs: [], indices: [] };
  const at = (a: number, av: number, b1: number, bv: number, c: number, cv: number) => {
    const p = new THREE.Vector3();
    p.setComponent(a, av);
    p.setComponent(b1, bv);
    p.setComponent(c, cv);
    return p;
  };

  // Six inset faces.
  for (let axis = 0; axis < 3; axis++) {
    const a1 = (axis + 1) % 3;
    const a2 = (axis + 2) % 3;
    for (const s of [-1, 1]) {
      const normal = new THREE.Vector3();
      normal.setComponent(axis, s);
      const corners: THREE.Vector3[] = [
        at(axis, s * half[axis], a1, -inner[a1], a2, -inner[a2]),
        at(axis, s * half[axis], a1, inner[a1], a2, -inner[a2]),
        at(axis, s * half[axis], a1, inner[a1], a2, inner[a2]),
        at(axis, s * half[axis], a1, -inner[a1], a2, inner[a2]),
      ];
      pushPolygon(builder, corners, normal, uvScale);
    }
  }

  // Twelve edge chamfers.
  for (let along = 0; along < 3; along++) {
    const a1 = (along + 1) % 3;
    const a2 = (along + 2) % 3;
    for (const s1 of [-1, 1]) {
      for (const s2 of [-1, 1]) {
        const normal = new THREE.Vector3();
        normal.setComponent(a1, s1);
        normal.setComponent(a2, s2);
        normal.normalize();
        const corners: THREE.Vector3[] = [
          at(along, -inner[along], a1, s1 * half[a1], a2, s2 * inner[a2]),
          at(along, inner[along], a1, s1 * half[a1], a2, s2 * inner[a2]),
          at(along, inner[along], a1, s1 * inner[a1], a2, s2 * half[a2]),
          at(along, -inner[along], a1, s1 * inner[a1], a2, s2 * half[a2]),
        ];
        pushPolygon(builder, corners, normal, uvScale);
      }
    }
  }

  // Eight corner facets.
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const normal = new THREE.Vector3(sx, sy, sz).normalize();
        const corners = [
          new THREE.Vector3(sx * half[0], sy * inner[1], sz * inner[2]),
          new THREE.Vector3(sx * inner[0], sy * half[1], sz * inner[2]),
          new THREE.Vector3(sx * inner[0], sy * inner[1], sz * half[2]),
        ];
        pushPolygon(builder, corners, normal, uvScale);
      }
    }
  }

  return finish(builder, 'bevelBox');
}

/**
 * Box with filleted edges. `segments` controls how many quads span each fillet;
 * 1 gives a chamfer with rounded shading, 3 or more a convincing soft edge.
 */
export function roundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  segments = 3,
): THREE.BufferGeometry {
  const limit = Math.min(width, height, depth) / 2 - 1e-4;
  const r = Math.max(1e-4, Math.min(radius, limit));
  const divisions = Math.max(1, Math.round(segments)) + 1;

  const geometry = new THREE.BoxGeometry(width, height, depth, divisions, divisions, divisions);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const normal = geometry.attributes.normal as THREE.BufferAttribute;

  const inner = new THREE.Vector3(width / 2 - r, height / 2 - r, depth / 2 - r);
  const p = new THREE.Vector3();
  const core = new THREE.Vector3();
  const offset = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i);
    core.set(
      THREE.MathUtils.clamp(p.x, -inner.x, inner.x),
      THREE.MathUtils.clamp(p.y, -inner.y, inner.y),
      THREE.MathUtils.clamp(p.z, -inner.z, inner.z),
    );
    offset.subVectors(p, core);
    const length = offset.length();
    if (length > 1e-6) {
      offset.multiplyScalar(r / length);
      p.addVectors(core, offset);
      position.setXYZ(i, p.x, p.y, p.z);
      offset.normalize();
      normal.setXYZ(i, offset.x, offset.y, offset.z);
    }
  }

  position.needsUpdate = true;
  normal.needsUpdate = true;
  geometry.name = 'roundedBox';
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Ensures a tangent attribute so normal maps resolve in a stable frame rather
 * than from screen-space derivatives, which is what makes normal-mapped detail
 * hold still under camera motion.
 */
export function computeTangents(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  if (geometry.hasAttribute('tangent')) return geometry;
  if (!geometry.hasAttribute('position') || !geometry.hasAttribute('uv')) return geometry;
  if (!geometry.hasAttribute('normal')) geometry.computeVertexNormals();

  if (!geometry.getIndex()) {
    const count = geometry.attributes.position.count;
    const array = count > 65535 ? new Uint32Array(count) : new Uint16Array(count);
    for (let i = 0; i < count; i++) array[i] = i;
    geometry.setIndex(new THREE.BufferAttribute(array, 1));
  }

  geometry.computeTangents();
  return geometry;
}

/**
 * Duplicates `uv` into a second UV set. three names the second set `uv1`
 * (selected with `texture.channel = 1`); pass `channel = 2` for `uv2` if a
 * consumer specifically wants the third slot.
 *
 * The procgen materials sample ambient occlusion from channel 0, so meshes do
 * not need this for AO to work — it is here for lightmaps and for meshes that
 * want independent detail and macro UV scales.
 */
export function addUV2(geometry: THREE.BufferGeometry, channel = 1): THREE.BufferGeometry {
  const name = channel === 1 ? 'uv1' : `uv${channel}`;
  if (geometry.hasAttribute(name) || !geometry.hasAttribute('uv')) return geometry;

  const uv = geometry.attributes.uv;
  const array = new Float32Array(uv.count * 2);
  for (let i = 0; i < uv.count; i++) {
    array[i * 2] = uv.getX(i);
    array[i * 2 + 1] = uv.getY(i);
  }
  geometry.setAttribute(name, new THREE.BufferAttribute(array, 2));
  return geometry;
}

/**
 * Rewrites UVs as a triplanar world-space projection at `unitsPerTile` metres
 * per tile. Level geometry built this way gets consistent texture scale across
 * every wall and floor without hand-authored UVs, which is the whole reason the
 * material library ships seamless tiles.
 */
export function applyWorldUv(
  geometry: THREE.BufferGeometry,
  unitsPerTile = 2,
  offset = new THREE.Vector3(),
): THREE.BufferGeometry {
  const position = geometry.attributes.position;
  if (!position) return geometry;
  if (!geometry.hasAttribute('normal')) geometry.computeVertexNormals();
  const normal = geometry.attributes.normal;

  const uvs = new Float32Array(position.count * 2);
  const scale = 1 / Math.max(unitsPerTile, 1e-4);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i).add(offset);
    n.fromBufferAttribute(normal, i);
    const [uAxis, vAxis] = UV_AXES[dominantAxis(n)];
    uvs[i * 2] = p.getComponent(uAxis) * scale;
    uvs[i * 2 + 1] = p.getComponent(vAxis) * scale;
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geometry;
}
