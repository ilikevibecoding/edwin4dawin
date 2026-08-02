/**
 * Reusable geometry constructors.
 *
 * These are the primitives the ship and interior factories are assembled from:
 * wedge prisms, lofted hulls, greeble fields, trenches and antenna clusters.
 * Everything is built from seeded randomness so hulls are reproducible.
 */

import * as THREE from 'three';
import { Rng } from '../core/rng';

/**
 * A convex prism defined by a 2D outline swept along Y with independent
 * scaling and offset at each end. The destroyer's dagger hull, its ventral
 * keel and the runner's hammerhead are all built with this.
 *
 * `outline` is given in the XZ plane wound *clockwise* in maths orientation,
 * which is counter-clockwise as seen from above in Three's coordinate system —
 * that is what makes the generated face normals point outward.
 */
export function prismGeometry(
  outline: Array<[number, number]>,
  height: number,
  topScale: [number, number] = [1, 1],
  topOffset: [number, number] = [0, 0],
  bottomScale: [number, number] = [1, 1],
  bottomOffset: [number, number] = [0, 0],
): THREE.BufferGeometry {
  const n = outline.length;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const halfH = height / 2;

  const bottom = outline.map(
    ([x, z]) => new THREE.Vector3(x * bottomScale[0] + bottomOffset[0], -halfH, z * bottomScale[1] + bottomOffset[1]),
  );
  const top = outline.map(([x, z]) => new THREE.Vector3(x * topScale[0] + topOffset[0], halfH, z * topScale[1] + topOffset[1]));

  const pushTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, uvA: [number, number], uvB: [number, number], uvC: [number, number]) => {
    const nrm = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    for (const [v, uv] of [[a, uvA], [b, uvB], [c, uvC]] as const) {
      positions.push((v as THREE.Vector3).x, (v as THREE.Vector3).y, (v as THREE.Vector3).z);
      normals.push(nrm.x, nrm.y, nrm.z);
      uvs.push((uv as [number, number])[0], (uv as [number, number])[1]);
    }
  };

  // Side walls
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const u0 = i / n;
    const u1 = (i + 1) / n;
    pushTri(bottom[i], bottom[j], top[j], [u0, 0], [u1, 0], [u1, 1]);
    pushTri(bottom[i], top[j], top[i], [u0, 0], [u1, 1], [u0, 1]);
  }

  // Caps (fan from centroid)
  const cB = new THREE.Vector3();
  const cT = new THREE.Vector3();
  bottom.forEach((v) => cB.add(v));
  top.forEach((v) => cT.add(v));
  cB.divideScalar(n);
  cT.divideScalar(n);
  const bounds = outline.reduce(
    (acc, [x, z]) => ({
      minX: Math.min(acc.minX, x), maxX: Math.max(acc.maxX, x),
      minZ: Math.min(acc.minZ, z), maxZ: Math.max(acc.maxZ, z),
    }),
    { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
  );
  const uvOf = (v: THREE.Vector3): [number, number] => [
    (v.x - bounds.minX) / Math.max(1e-5, bounds.maxX - bounds.minX),
    (v.z - bounds.minZ) / Math.max(1e-5, bounds.maxZ - bounds.minZ),
  ];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    pushTri(cB, bottom[j], bottom[i], uvOf(cB), uvOf(bottom[j]), uvOf(bottom[i]));
    pushTri(cT, top[i], top[j], uvOf(cT), uvOf(top[i]), uvOf(top[j]));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

/**
 * A lofted tube: circular cross-sections of varying radius along the Z axis,
 * centred on the local origin. `profile` maps t∈[0,1] — nose (−Z) to tail
 * (+Z) — to a radius multiplier.
 */
export function loftedHull(
  length: number,
  radius: number,
  profile: (t: number) => number,
  radialSegments = 24,
  lengthSegments = 40,
  squash = 1,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= lengthSegments; i++) {
    const t = i / lengthSegments;
    const r = radius * Math.max(0.0001, profile(t));
    const z = -length / 2 + t * length;
    for (let j = 0; j <= radialSegments; j++) {
      const a = (j / radialSegments) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * squash;
      positions.push(x, y, z);
      normals.push(Math.cos(a), Math.sin(a), 0);
      uvs.push(j / radialSegments, t);
    }
  }
  for (let i = 0; i < lengthSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = a + radialSegments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/** Box with softened edges — the workhorse for readable low-poly forms. */
const roundedCache = new Map<string, THREE.BufferGeometry>();
export function roundedBox(w: number, h: number, d: number, r = 0.06, seg = 2): THREE.BufferGeometry {
  const key = `${w},${h},${d},${r},${seg}`;
  const hit = roundedCache.get(key);
  if (hit) return hit;
  const radius = Math.min(r, w / 2.05, h / 2.05, d / 2.05);
  // Build from a subdivided box pushed onto a rounded-cuboid surface.
  const geo = new THREE.BoxGeometry(w, h, d, seg, seg, seg);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const hw = w / 2 - radius;
  const hh = h / 2 - radius;
  const hd = d / 2 - radius;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const cx = THREE.MathUtils.clamp(v.x, -hw, hw);
    const cy = THREE.MathUtils.clamp(v.y, -hh, hh);
    const cz = THREE.MathUtils.clamp(v.z, -hd, hd);
    const dir = new THREE.Vector3(v.x - cx, v.y - cy, v.z - cz);
    if (dir.lengthSq() > 1e-9) dir.setLength(radius);
    pos.setXYZ(i, cx + dir.x, cy + dir.y, cz + dir.z);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  roundedCache.set(key, geo);
  return geo;
}

export interface GreebleOptions {
  count: number;
  /** Local-space bounds the blocks are scattered inside. */
  area: { x: [number, number]; z: [number, number] };
  /** Y placement of the block base. */
  y: number;
  minSize: number;
  maxSize: number;
  maxHeight: number;
  seed: string;
  /** Bias block placement toward these X lines (trenches, spines). */
  lanes?: number[];
  laneWeight?: number;
  /** Occasional taller "tower" blocks. */
  towerChance?: number;
  /**
   * Rejects candidate positions that fall off the real surface. Without this,
   * blocks scattered over a triangular deck end up hovering in empty space
   * beyond the hull edge.
   */
  mask?: (x: number, z: number) => boolean;
}

/**
 * A field of small extruded blocks — the surface detail that sells hull scale.
 * Returned as a single InstancedMesh so a thousand blocks cost one draw call.
 */
export function greebleField(
  material: THREE.Material,
  o: GreebleOptions,
): THREE.InstancedMesh {
  const rng = new Rng(o.seed);
  const geo = roundedBox(1, 1, 1, 0.08, 1);
  const mesh = new THREE.InstancedMesh(geo, material, Math.max(1, o.count));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < o.count; i++) {
    let x = 0;
    let z = 0;
    let sx = 0;
    let sz = 0;
    let placed = false;
    // Rejection-sample until the block (and its footprint) sits on the surface.
    for (let attempt = 0; attempt < 12 && !placed; attempt++) {
      x = rng.range(o.area.x[0], o.area.x[1]);
      if (o.lanes && o.lanes.length && rng.chance(o.laneWeight ?? 0.55)) {
        x = rng.pick(o.lanes) + rng.normal() * (o.maxSize * 0.9);
      }
      z = rng.range(o.area.z[0], o.area.z[1]);
      sx = rng.range(o.minSize, o.maxSize);
      sz = rng.range(o.minSize, o.maxSize) * rng.range(0.6, 2.4);
      placed =
        !o.mask ||
        (o.mask(x - sx / 2, z - sz / 2) &&
          o.mask(x + sx / 2, z - sz / 2) &&
          o.mask(x - sx / 2, z + sz / 2) &&
          o.mask(x + sx / 2, z + sz / 2));
    }
    if (!placed) {
      mesh.setMatrixAt(i, zeroMatrix);
      continue;
    }
    const tall = o.towerChance && rng.chance(o.towerChance);
    const sy = tall ? rng.range(o.maxHeight * 1.4, o.maxHeight * 2.4) : rng.range(o.maxHeight * 0.18, o.maxHeight);
    pos.set(x, o.y + sy / 2, z);
    scl.set(sx, sy, sz);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.chance(0.8) ? 0 : rng.range(-0.16, 0.16));
    m.compose(pos, q, scl);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/** A recessed channel: two side walls plus a darker floor. */
export function trenchGroup(
  length: number,
  width: number,
  depth: number,
  wallMat: THREE.Material,
  floorMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, length), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -depth;
  g.add(floor);
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(length, depth), wallMat);
    wall.rotation.y = (s * Math.PI) / 2;
    wall.rotation.z = Math.PI / 2;
    wall.position.set((s * width) / 2, -depth / 2, 0);
    g.add(wall);
  }
  return g;
}

/** Thin masts and dishes for the top of an Imperial superstructure. */
export function antennaCluster(seed: string, material: THREE.Material, count = 7, scale = 1): THREE.Group {
  const rng = new Rng(seed);
  const g = new THREE.Group();
  const shaft = new THREE.CylinderGeometry(0.35 * scale, 0.5 * scale, 1, 6);
  for (let i = 0; i < count; i++) {
    const h = rng.range(4, 15) * scale;
    const mast = new THREE.Mesh(shaft, material);
    mast.scale.set(1, h, 1);
    mast.position.set(rng.range(-6, 6) * scale, h / 2, rng.range(-8, 8) * scale);
    g.add(mast);
    if (rng.chance(0.4)) {
      const dish = new THREE.Mesh(new THREE.SphereGeometry(rng.range(1.1, 2.4) * scale, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), material);
      dish.rotation.x = rng.range(-0.9, -0.2);
      dish.position.set(mast.position.x, h, mast.position.z);
      g.add(dish);
    }
  }
  return g;
}

/**
 * A ring of radial fins — used for engine bells and the destroyer's
 * ventral reactor bulb.
 */
export function finRing(
  count: number,
  innerR: number,
  outerR: number,
  thickness: number,
  height: number,
  material: THREE.Material,
): THREE.InstancedMesh {
  const geo = new THREE.BoxGeometry(outerR - innerR, height, thickness);
  const mesh = new THREE.InstancedMesh(geo, material, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    p.set(Math.cos(a) * (innerR + outerR) * 0.5, 0, Math.sin(a) * (innerR + outerR) * 0.5);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

/** Merge a list of meshes sharing one material into a single draw call. */
export function mergeMeshes(meshes: THREE.Mesh[], material: THREE.Material): THREE.Mesh | null {
  if (!meshes.length) return null;
  const geos: THREE.BufferGeometry[] = [];
  for (const mesh of meshes) {
    const g = mesh.geometry.clone();
    mesh.updateMatrix();
    g.applyMatrix4(mesh.matrix);
    // Normalise attributes so merging never fails on a stray extra channel.
    for (const key of Object.keys(g.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv') g.deleteAttribute(key);
    }
    if (!g.attributes.uv) {
      const count = g.attributes.position.count;
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    }
    geos.push(g.index ? g.toNonIndexed() : g);
  }
  const merged = mergeBufferGeometries(geos);
  geos.forEach((g) => g.dispose());
  if (!merged) return null;
  merged.computeBoundingSphere();
  return new THREE.Mesh(merged, material);
}

/** Minimal geometry merge (avoids pulling in the addons BufferGeometryUtils). */
function mergeBufferGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (!geos.length) return null;
  const attrNames = ['position', 'normal', 'uv'] as const;
  const totals: Record<string, number> = {};
  for (const name of attrNames) {
    let total = 0;
    for (const g of geos) {
      const a = g.attributes[name];
      if (!a) return null;
      total += a.array.length;
    }
    totals[name] = total;
  }
  const out = new THREE.BufferGeometry();
  for (const name of attrNames) {
    const itemSize = geos[0].attributes[name].itemSize;
    const arr = new Float32Array(totals[name]);
    let offset = 0;
    for (const g of geos) {
      arr.set(g.attributes[name].array as Float32Array, offset);
      offset += g.attributes[name].array.length;
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, itemSize));
  }
  return out;
}

/** Flat card that always faces the camera, sized in world units. */
export function billboard(width: number, height: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.onBeforeRender = (_r, _s, camera) => {
    mesh.quaternion.copy(camera.quaternion);
  };
  return mesh;
}
