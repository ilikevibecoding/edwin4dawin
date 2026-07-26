import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MatId } from '../layout';
import { getMaterial } from '../../assets/materials';

/**
 * Geometry kit (Fable 2): world-space boxes with meter-scale UVs so tiled
 * architectural materials stay continuous across merged pieces.
 */

/** Box positioned in world space (min corner + size) with world-planar UVs. */
export function worldBoxGeo(
  x: number, y: number, z: number, w: number, h: number, d: number,
): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(x + w / 2, y + h / 2, z + d / 2);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const nor = geo.getAttribute('normal') as THREE.BufferAttribute;
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
    if (nx > 0.5) uv.setXY(i, pz, py);
    else if (ny > 0.5) uv.setXY(i, px, pz);
    else uv.setXY(i, px, py);
  }
  uv.needsUpdate = true;
  return geo;
}

/** Static geometry batcher: one merged mesh per material. */
export class Batcher {
  private lists = new Map<MatId, THREE.BufferGeometry[]>();

  box(mat: MatId, x: number, y: number, z: number, w: number, h: number, d: number): void {
    this.geo(mat, worldBoxGeo(x, y, z, w, h, d));
  }

  /** Box by min/max corners. */
  boxMM(mat: MatId, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): void {
    this.box(mat, Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  }

  geo(mat: MatId, g: THREE.BufferGeometry): void {
    let list = this.lists.get(mat);
    if (!list) {
      list = [];
      this.lists.set(mat, list);
    }
    list.push(g);
  }

  build(parent: THREE.Group, opts: { shadows?: boolean; name?: string } = {}): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    for (const [mat, list] of this.lists) {
      if (list.length === 0) continue;
      const merged = mergeGeometries(list, false);
      if (!merged) continue;
      const built = getMaterial(mat);
      const mesh = new THREE.Mesh(merged, built.mat);
      mesh.castShadow = opts.shadows !== false;
      mesh.receiveShadow = true;
      mesh.name = `${opts.name ?? 'static'}:${mat}`;
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
      meshes.push(mesh);
      for (const g of list) g.dispose();
    }
    this.lists.clear();
    return meshes;
  }
}

/** Chamfered box for props/trim (centered at origin unless offset given). */
export function bevelBoxGeo(w: number, h: number, d: number, bevel = 0.02): THREE.BufferGeometry {
  const b = Math.min(bevel, w / 3, h / 3, d / 3);
  const shape = new THREE.Shape();
  const hw = w / 2, hd = d / 2;
  shape.moveTo(-hw + b, -hd);
  shape.lineTo(hw - b, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + b);
  shape.lineTo(hw, hd - b);
  shape.quadraticCurveTo(hw, hd, hw - b, hd);
  shape.lineTo(-hw + b, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - b);
  shape.lineTo(-hw, -hd + b);
  shape.quadraticCurveTo(-hw, -hd, -hw + b, -hd);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h - b * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b * 0.99, bevelSegments: 1, curveSegments: 2,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, h / 2 - b, 0); // center at half height... shape extrudes along +Z→+Y after rotate; adjust:
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  geo.translate(0, -(bb.min.y + bb.max.y) / 2, 0);
  return geo;
}
