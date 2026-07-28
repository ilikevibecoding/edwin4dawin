/**
 * Procedural ordnance.
 *
 * A general purpose bomb is a boring shape and that is exactly why it has to be
 * right: an ogive nose, a parallel mid body, a boat-tailed aft end and four swept
 * fins on a ring. Every one of those features exists for a reason, and a viewer
 * reads a capsule with paddles glued on as a suppository. 3.3 m on a 0.36 m body
 * is a 900 kg class weapon, which is the size that matches a 14 m damage radius.
 *
 * The hazard band and the stencils are the only concession to legibility: a real
 * live weapon is almost uniformly olive drab, but on screen at 200 m a single
 * yellow ring is what separates a falling bomb from a falling piece of debris.
 */
import * as THREE from 'three';
import type { AirframeMaterials } from './Materials';
import { finCluster, loftSections, mergeAll, tube } from './Loft';
import { bevelBox } from '../../procgen/GeometryUtils';

const DEG = Math.PI / 180;

export interface OrdnanceModel {
  root: THREE.Group;
  dispose(): void;
}

/** General purpose bomb, nose along +Z. 3.32 m long, 0.36 m body. */
export function buildBomb(m: AirframeMaterials): OrdnanceModel {
  const root = new THREE.Group();
  root.name = 'ks:bomb';

  const body = loftSections(
    [
      // Ogive nose: the radius grows as a fractional power of length, which is
      // what makes it a bullet nose rather than a cone.
      { z: 1.66, halfWidth: 0.03, halfHeight: 0.03, exponent: 2 },
      { z: 1.55, halfWidth: 0.075, halfHeight: 0.075, exponent: 2 },
      { z: 1.36, halfWidth: 0.128, halfHeight: 0.128, exponent: 2 },
      { z: 1.1, halfWidth: 0.166, halfHeight: 0.166, exponent: 2 },
      { z: 0.82, halfWidth: 0.18, halfHeight: 0.18, exponent: 2 },
      // Parallel mid body.
      { z: 0.1, halfWidth: 0.18, halfHeight: 0.18, exponent: 2 },
      { z: -0.5, halfWidth: 0.18, halfHeight: 0.18, exponent: 2 },
      // Boat tail.
      { z: -0.95, halfWidth: 0.163, halfHeight: 0.163, exponent: 2 },
      { z: -1.3, halfWidth: 0.132, halfHeight: 0.132, exponent: 2 },
      { z: -1.5, halfWidth: 0.12, halfHeight: 0.12, exponent: 2 },
    ],
    14,
    true,
  );
  root.add(new THREE.Mesh(body, m.olive));

  // Four swept fins on a conical tail ring, plus the ring itself.
  const finParts: THREE.BufferGeometry[] = [
    finCluster(4, 0.62, 0.3, 0.29, 34 * DEG, 0.07, 0.11, -1.02),
  ];
  const ring = tube(0.235, 0.1, 12, 1);
  ring.translate(0, 0, -1.5);
  finParts.push(ring);
  root.add(new THREE.Mesh(mergeAll(finParts), m.panel));

  // Suspension lugs on top: the detail that says this hung off a rack.
  const lugParts: THREE.BufferGeometry[] = [];
  for (const z of [0.45, -0.31]) {
    const lug = bevelBox(0.07, 0.1, 0.11, 0.014, 1);
    lug.translate(0, 0.21, z);
    lugParts.push(lug);
  }
  root.add(new THREE.Mesh(mergeAll(lugParts), m.metal));

  // Hazard band and the fuze cap.
  const band = tube(0.183, 0.13, 14, 1);
  band.translate(0, 0, 0.66);
  root.add(new THREE.Mesh(band, m.band));
  const fuze = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 6), m.metal);
  fuze.position.set(0, 0, 1.68);
  root.add(fuze);

  finishOrdnance(root);
  return { root, dispose: () => disposeOrdnance(root) };
}

/** Cluster canister, nose along +Z. 3.9 m long, 0.42 m body. */
export function buildCanister(m: AirframeMaterials): OrdnanceModel {
  const root = new THREE.Group();
  root.name = 'ks:canister';

  const body = loftSections(
    [
      { z: 1.95, halfWidth: 0.04, halfHeight: 0.04, exponent: 2 },
      { z: 1.78, halfWidth: 0.1, halfHeight: 0.1, exponent: 2 },
      { z: 1.5, halfWidth: 0.16, halfHeight: 0.16, exponent: 2 },
      { z: 1.15, halfWidth: 0.2, halfHeight: 0.2, exponent: 2 },
      { z: 0.6, halfWidth: 0.21, halfHeight: 0.21, exponent: 2 },
      { z: -0.6, halfWidth: 0.21, halfHeight: 0.21, exponent: 2 },
      { z: -1.35, halfWidth: 0.2, halfHeight: 0.2, exponent: 2 },
      { z: -1.7, halfWidth: 0.19, halfHeight: 0.19, exponent: 2 },
    ],
    14,
    true,
  );
  root.add(new THREE.Mesh(body, m.olive));

  const finParts: THREE.BufferGeometry[] = [
    finCluster(4, 0.78, 0.42, 0.34, 28 * DEG, 0.06, 0.12, -1.28),
  ];
  // Longitudinal split lines: this casing is designed to come apart.
  for (let i = 0; i < 3; i++) {
    const seam = tube(0.215, 0.035, 14, 1);
    seam.translate(0, 0, -0.4 + i * 0.6);
    finParts.push(seam);
  }
  root.add(new THREE.Mesh(mergeAll(finParts), m.panel));

  const band = tube(0.214, 0.14, 14, 1);
  band.translate(0, 0, 0.95);
  root.add(new THREE.Mesh(band, m.band));

  finishOrdnance(root);
  return { root, dispose: () => disposeOrdnance(root) };
}

export interface BombletModel extends OrdnanceModel {
  /** Drogue canopy, scaled up when it deploys. */
  drogue: THREE.Object3D;
}

/** Submunition with a ribbon drogue. 0.34 m body, canopy 0.5 m across. */
export function buildBomblet(m: AirframeMaterials): BombletModel {
  const root = new THREE.Group();
  root.name = 'ks:bomblet';

  const body = loftSections(
    [
      { z: 0.18, halfWidth: 0.015, halfHeight: 0.015, exponent: 2 },
      { z: 0.14, halfWidth: 0.045, halfHeight: 0.045, exponent: 2 },
      { z: 0.05, halfWidth: 0.062, halfHeight: 0.062, exponent: 2 },
      { z: -0.1, halfWidth: 0.062, halfHeight: 0.062, exponent: 2 },
      { z: -0.16, halfWidth: 0.05, halfHeight: 0.05, exponent: 2 },
    ],
    10,
    true,
  );
  root.add(new THREE.Mesh(body, m.olive));

  const drogue = new THREE.Group();
  drogue.name = 'ks:drogue';
  // A ribbon drogue is a shallow cone open at the base, not a parachute dome.
  const canopy = new THREE.ConeGeometry(0.25, 0.3, 10, 1, true);
  canopy.rotateX(-Math.PI / 2);
  canopy.translate(0, 0, -0.32);
  drogue.add(new THREE.Mesh(canopy, m.canvas));
  const riser = tube(0.006, 0.2, 4, 1);
  riser.translate(0, 0, -0.28);
  drogue.add(new THREE.Mesh(riser, m.canvas));
  drogue.scale.setScalar(0.01);
  root.add(drogue);

  finishOrdnance(root);
  return { root, drogue, dispose: () => disposeOrdnance(root) };
}

export interface CratePackModel extends OrdnanceModel {
  crate: THREE.Object3D;
  /** Parachute assembly, hidden once the crate is down. */
  chute: THREE.Object3D;
  /** Half extents of the crate collider. */
  halfExtents: THREE.Vector3;
}

/** Care package: a 1.15 m crate under a 4.4 m canopy. */
export function buildCratePack(m: AirframeMaterials): CratePackModel {
  const root = new THREE.Group();
  root.name = 'ks:carePackage';

  const crate = new THREE.Group();
  crate.name = 'ks:crate';
  const shell = bevelBox(1.15, 0.86, 1.15, 0.045, 1);
  crate.add(new THREE.Mesh(shell, m.olive));

  const trimParts: THREE.BufferGeometry[] = [];
  // Corner castings and lifting straps.
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const post = bevelBox(0.1, 0.9, 0.1, 0.018, 1);
      post.translate(sx * 0.535, 0, sz * 0.535);
      trimParts.push(post);
    }
  }
  for (const sx of [0.3, -0.3]) {
    const strap = new THREE.BoxGeometry(0.11, 0.9, 1.19);
    strap.translate(sx, 0, 0);
    trimParts.push(strap);
  }
  const lid = new THREE.BoxGeometry(1.19, 0.06, 1.19);
  lid.translate(0, 0.45, 0);
  trimParts.push(lid);
  crate.add(new THREE.Mesh(mergeAll(trimParts), m.metal));

  // Landing marker canister strapped to the lid.
  const flare = tube(0.06, 0.26, 8, 1);
  flare.rotateX(Math.PI / 2);
  flare.translate(0.38, 0.55, 0.0);
  crate.add(new THREE.Mesh(flare, m.band));

  crate.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  root.add(crate);

  // Canopy: a lathed dome with a vent at the apex, plus eight rigging lines.
  const chute = new THREE.Group();
  chute.name = 'ks:chute';
  const profile: THREE.Vector2[] = [];
  const segments = 10;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Flattened hemisphere with an apex vent, which is what a real canopy
    // inflates to: pressure escapes through the top rather than oscillating.
    const angle = 0.14 + t * (Math.PI / 2 - 0.14);
    profile.push(new THREE.Vector2(Math.sin(angle) * 2.2, Math.cos(angle) * 1.35));
  }
  const canopy = new THREE.LatheGeometry(profile, 16);
  canopy.translate(0, 3.2, 0);
  const canopyMesh = new THREE.Mesh(canopy, m.canvas);
  canopyMesh.name = 'ks:canopy';
  chute.add(canopyMesh);

  const lineParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * 2.15;
    const z = Math.sin(a) * 2.15;
    const line = tube(0.014, 2.4, 4, 1);
    line.rotateX(Math.PI / 2);
    const mat = new THREE.Matrix4();
    const from = new THREE.Vector3(x, 3.2, z);
    const to = new THREE.Vector3(0, 0.52, 0);
    const mid = from.clone().add(to).multiplyScalar(0.5);
    const dir = to.clone().sub(from).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    mat.compose(mid, q, new THREE.Vector3(1, from.distanceTo(to) / 2.4, 1));
    line.applyMatrix4(mat);
    lineParts.push(line);
  }
  chute.add(new THREE.Mesh(mergeAll(lineParts), m.canvas));
  root.add(chute);

  finishOrdnance(root);
  return {
    root,
    crate,
    chute,
    halfExtents: new THREE.Vector3(0.575, 0.43, 0.575),
    dispose: () => disposeOrdnance(root),
  };
}

function finishOrdnance(root: THREE.Object3D): void {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.geometry.boundingSphere) mesh.geometry.boundingSphere.radius *= 1.4;
  });
}

function disposeOrdnance(root: THREE.Object3D): void {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) mesh.geometry?.dispose();
  });
  root.removeFromParent();
}
