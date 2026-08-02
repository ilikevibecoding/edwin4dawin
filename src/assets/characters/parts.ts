import * as THREE from 'three';
import { box, capsuleGeo, cyl, merge, sphere, type Placement } from '../geometry';
import { CHAR_MATS } from '../materials';

/** Shared building blocks for the figure meshes. */

export function attach(
  joint: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name = '',
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  joint.add(mesh);
  return mesh;
}

/** A limb segment hanging from the joint origin down to -length. */
export function limb(radius: number, length: number, taper = 1): THREE.BufferGeometry {
  const geo = capsuleGeo(radius, Math.max(0.001, length - radius * 2), { pos: [0, -length / 2, 0] }, 4, 8);
  if (taper !== 1) {
    const pos = geo.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = THREE.MathUtils.clamp((-y) / length, 0, 1);
      const s = 1 + (taper - 1) * t;
      pos.setX(i, pos.getX(i) * s);
      pos.setZ(i, pos.getZ(i) * s);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }
  return geo;
}

/** Armour shell that wraps a limb segment. */
export function plate(radius: number, from: number, to: number, thickness = 1.16): THREE.BufferGeometry {
  const len = Math.abs(to - from);
  return cyl(radius * thickness, radius * thickness * 0.94, len, 10, {
    pos: [0, -(from + len / 2), 0],
  });
}

export function boot(size = 1): THREE.BufferGeometry {
  return merge([
    box(0.1 * size, 0.07 * size, 0.24 * size, { pos: [0, -0.035 * size, 0.045 * size] }),
    box(0.11 * size, 0.05 * size, 0.1 * size, { pos: [0, -0.02 * size, -0.04 * size] }),
  ]);
}

/** Compact blaster carbine held in the right hand. */
export function blasterCarbine(scale = 1): { geometry: THREE.BufferGeometry; muzzle: THREE.Vector3 } {
  const s = scale;
  const geometry = merge([
    box(0.045 * s, 0.055 * s, 0.34 * s, { pos: [0, -0.02 * s, 0.09 * s] }),
    cyl(0.014 * s, 0.016 * s, 0.2 * s, 8, { pos: [0, -0.005 * s, 0.3 * s], rot: [Math.PI / 2, 0, 0] }),
    box(0.03 * s, 0.09 * s, 0.05 * s, { pos: [0, -0.075 * s, -0.01 * s], rot: [0.25, 0, 0] }),
    box(0.026 * s, 0.05 * s, 0.11 * s, { pos: [0, 0.04 * s, 0.02 * s] }),
    box(0.02 * s, 0.02 * s, 0.09 * s, { pos: [0, 0.06 * s, 0.16 * s] }),
    box(0.05 * s, 0.03 * s, 0.07 * s, { pos: [0, -0.05 * s, -0.11 * s] }),
  ]);
  return { geometry, muzzle: new THREE.Vector3(0, -0.005 * s, 0.4 * s) };
}

/** Sidearm-scale blaster pistol. */
export function blasterPistol(scale = 1): { geometry: THREE.BufferGeometry; muzzle: THREE.Vector3 } {
  const s = scale;
  const geometry = merge([
    box(0.035 * s, 0.05 * s, 0.19 * s, { pos: [0, -0.01 * s, 0.05 * s] }),
    cyl(0.012 * s, 0.013 * s, 0.1 * s, 8, { pos: [0, 0.0, 0.17 * s], rot: [Math.PI / 2, 0, 0] }),
    box(0.028 * s, 0.085 * s, 0.045 * s, { pos: [0, -0.065 * s, -0.02 * s], rot: [0.22, 0, 0] }),
    box(0.02 * s, 0.03 * s, 0.06 * s, { pos: [0, 0.035 * s, 0.03 * s] }),
  ]);
  return { geometry, muzzle: new THREE.Vector3(0, 0, 0.24 * s) };
}

/** Simple utility belt with pouches. */
export function utilityBelt(radius: number, mat = CHAR_MATS.trooperUnder()): THREE.Mesh {
  const geo = merge([
    cyl(radius * 1.04, radius * 1.04, 0.075, 14, { pos: [0, 0, 0] }),
    box(0.09, 0.09, 0.05, { pos: [radius * 0.75, -0.03, radius * 0.55] }),
    box(0.07, 0.08, 0.05, { pos: [-radius * 0.8, -0.03, radius * 0.4] }),
    box(0.06, 0.06, 0.05, { pos: [0, -0.02, -radius * 1.0] }),
  ]);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

export function eyeLens(w: number, h: number, d: number, p: Placement): THREE.BufferGeometry {
  return box(w, h, d, p);
}

export function domeShell(radius: number, p: Placement = {}): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(radius, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const m = new THREE.Matrix4();
  const pos = Array.isArray(p.pos) ? new THREE.Vector3(...p.pos) : (p.pos ?? new THREE.Vector3());
  const scale =
    typeof p.scale === 'number'
      ? new THREE.Vector3(p.scale, p.scale, p.scale)
      : Array.isArray(p.scale)
        ? new THREE.Vector3(...p.scale)
        : (p.scale ?? new THREE.Vector3(1, 1, 1));
  m.compose(pos, new THREE.Quaternion(), scale);
  g.applyMatrix4(m);
  return g;
}

export { box, cyl, sphere, merge };
