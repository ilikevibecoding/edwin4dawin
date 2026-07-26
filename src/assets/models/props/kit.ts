import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { SurfaceKind } from '../../../game/types';
import type { CollisionWorld } from '../../../world/collision';
import { bevelBoxGeo } from '../../../world/kit/geo';

/**
 * Prop framework (Fable 3). Props are authored as part lists in local space
 * (origin at floor-center, +Z = front). Placement bakes parts into global
 * per-material merged meshes, so hundreds of props cost ~a couple dozen draw
 * calls. Collision boxes are axis-aligned (props place at 90° steps; other
 * angles get conservative bounds).
 */

export interface PropPart {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
}

export interface PropCol {
  min: THREE.Vector3;
  max: THREE.Vector3;
  surface: SurfaceKind;
}

export interface PropProto {
  id: string;
  parts: PropPart[];
  cols: PropCol[];
  /** separate live objects (emissive screens with unique behavior, etc.) */
  dynamic?: THREE.Object3D[];
}

const geoCache = new Map<string, THREE.BufferGeometry>();

export function boxGeo(w: number, h: number, d: number, bevel = 0): THREE.BufferGeometry {
  const key = `b${w.toFixed(3)}/${h.toFixed(3)}/${d.toFixed(3)}/${bevel.toFixed(3)}`;
  let g = geoCache.get(key);
  if (!g) {
    g = bevel > 0.001 ? bevelBoxGeo(w, h, d, bevel) : new THREE.BoxGeometry(w, h, d);
    geoCache.set(key, g);
  }
  return g;
}

export function cylGeo(r0: number, r1: number, h: number, seg = 12): THREE.BufferGeometry {
  const key = `c${r0.toFixed(3)}/${r1.toFixed(3)}/${h.toFixed(3)}/${seg}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(r0, r1, h, seg);
    geoCache.set(key, g);
  }
  return g;
}

/** Prop assembler: collects parts + collision in local space. */
export class P {
  parts: PropPart[] = [];
  cols: PropCol[] = [];
  dynamic: THREE.Object3D[] = [];

  /** box: x,z = center, y = BOTTOM. */
  box(mat: THREE.Material, w: number, h: number, d: number, x = 0, y = 0, z = 0, opts: { bevel?: number; ry?: number; rx?: number; rz?: number } = {}): this {
    const g = boxGeo(w, h, d, opts.bevel ?? 0).clone();
    if (opts.rx) g.rotateX(opts.rx);
    if (opts.rz) g.rotateZ(opts.rz);
    if (opts.ry) g.rotateY(opts.ry);
    g.translate(x, y + h / 2, z);
    this.parts.push({ geo: g, mat });
    return this;
  }

  /** cylinder along Y: y = BOTTOM. */
  cyl(mat: THREE.Material, r: number, h: number, x = 0, y = 0, z = 0, opts: { seg?: number; rx?: number; rz?: number; r1?: number } = {}): this {
    const g = cylGeo(r, opts.r1 ?? r, h, opts.seg ?? 12).clone();
    if (opts.rx) g.rotateX(opts.rx);
    if (opts.rz) g.rotateZ(opts.rz);
    g.translate(x, y + (opts.rx || opts.rz ? 0 : h / 2), z);
    this.parts.push({ geo: g, mat });
    return this;
  }

  sphere(mat: THREE.Material, r: number, x = 0, y = 0, z = 0, opts: { sy?: number; sx?: number; sz?: number; seg?: number } = {}): this {
    const g = new THREE.SphereGeometry(r, opts.seg ?? 12, Math.max(6, (opts.seg ?? 12) - 2));
    g.scale(opts.sx ?? 1, opts.sy ?? 1, opts.sz ?? 1);
    g.translate(x, y, z);
    this.parts.push({ geo: g, mat });
    return this;
  }

  geo(mat: THREE.Material, g: THREE.BufferGeometry): this {
    this.parts.push({ geo: g, mat });
    return this;
  }

  /** collision box: x,z center, y bottom */
  col(surface: SurfaceKind, w: number, h: number, d: number, x = 0, y = 0, z = 0): this {
    this.cols.push({
      min: new THREE.Vector3(x - w / 2, y, z - d / 2),
      max: new THREE.Vector3(x + w / 2, y + h, z + d / 2),
      surface,
    });
    return this;
  }

  proto(id: string): PropProto {
    return { id, parts: this.parts, cols: this.cols, dynamic: this.dynamic };
  }
}

/** Global batcher for placed props: merges by material. */
export class PropBatcher {
  private byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  readonly liveGroup = new THREE.Group();
  private colWorld: CollisionWorld;
  private counter = 0;

  constructor(colWorld: CollisionWorld) {
    this.colWorld = colWorld;
    this.liveGroup.name = 'props-live';
  }

  /**
   * Place a prop prototype. x,z = position, ry = yaw (radians; 90° steps keep
   * tight colliders). y = floor height.
   */
  place(proto: PropProto, x: number, y: number, z: number, ry = 0, tagPrefix = 'prop'): void {
    const m4 = new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z);
    for (const part of proto.parts) {
      const g = part.geo.clone().applyMatrix4(m4);
      let list = this.byMat.get(part.mat);
      if (!list) {
        list = [];
        this.byMat.set(part.mat, list);
      }
      list.push(g);
    }
    for (const c of proto.cols) {
      // transform AABB (conservative under rotation)
      const corners = [
        new THREE.Vector3(c.min.x, c.min.y, c.min.z), new THREE.Vector3(c.max.x, c.min.y, c.min.z),
        new THREE.Vector3(c.min.x, c.min.y, c.max.z), new THREE.Vector3(c.max.x, c.min.y, c.max.z),
        new THREE.Vector3(c.min.x, c.max.y, c.min.z), new THREE.Vector3(c.max.x, c.max.y, c.max.z),
      ];
      const min = new THREE.Vector3(Infinity, Infinity, Infinity);
      const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
      for (const corner of corners) {
        corner.applyMatrix4(m4);
        min.min(corner);
        max.max(corner);
      }
      this.colWorld.addStatic({
        id: `${tagPrefix}:${proto.id}:${this.counter}`,
        min, max,
        surface: c.surface,
        tag: `${tagPrefix}:${proto.id}`,
      });
    }
    if (proto.dynamic) {
      for (const d of proto.dynamic) {
        const clone = d.clone(true);
        clone.applyMatrix4(m4);
        this.liveGroup.add(clone);
      }
    }
    this.counter++;
  }

  build(parent: THREE.Group): void {
    for (const [mat, geosRaw] of this.byMat) {
      if (geosRaw.length === 0) continue;
      // normalize: mergeGeometries requires uniform indexing
      const geos = geosRaw.map((g) => {
        if (g.index) {
          const ni = g.toNonIndexed();
          g.dispose();
          return ni;
        }
        return g;
      });
      // strip non-shared attributes (uv2 etc.) for compatibility
      for (const g of geos) {
        for (const key of Object.keys(g.attributes)) {
          if (key !== 'position' && key !== 'normal' && key !== 'uv') g.deleteAttribute(key);
        }
      }
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.name = `props:${(mat as THREE.MeshStandardMaterial).name || 'mat'}`;
      parent.add(mesh);
      for (const g of geos) g.dispose();
    }
    this.byMat.clear();
    parent.add(this.liveGroup);
  }
}
