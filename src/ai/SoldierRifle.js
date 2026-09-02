import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Compact procedural AK-pattern rifle for the AI soldiers (~330 triangles, two materials).
 * Rifle frame: barrel points along local -Z, +Y up, +X right; origin at the receiver centre.
 *
 *   const rifle = createSoldierRifle();       // Group with .sockets { muzzle, grip, foregrip, stock }
 *
 * Geometry and materials are shared between instances; call disposeRifleAssets() on teardown.
 */

export const RIFLE_SOCKETS = {
  muzzle: new THREE.Vector3(0, 0.012, -0.505),
  grip: new THREE.Vector3(0, -0.085, 0.115), // pistol grip, where the right palm sits
  foregrip: new THREE.Vector3(0, -0.03, -0.135), // rear of the lower handguard, left hand (the rig's arms are short)
  stock: new THREE.Vector3(0, -0.02, 0.42), // butt plate centre (rests at the shoulder)
  ejection: new THREE.Vector3(0.025, 0.01, 0.0),
};

let _shared = null;

function box(w, h, d, x, y, z, rotX = 0, rotY = 0, rotZ = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rotX || rotY || rotZ) g.rotateX(rotX).rotateY(rotY).rotateZ(rotZ);
  g.translate(x, y, z);
  return g;
}

function cyl(r1, r2, len, seg, x, y, z, { open = false, rotX = Math.PI / 2 } = {}) {
  const g = new THREE.CylinderGeometry(r1, r2, len, seg, 1, open);
  g.rotateX(rotX); // along Z
  g.translate(x, y, z);
  return g;
}

function buildShared() {
  const metal = [];
  const furniture = [];

  // --- Receiver + dust cover + rear sight block -------------------------------------------------
  metal.push(box(0.04, 0.058, 0.29, 0, 0, 0.035));
  metal.push(box(0.034, 0.018, 0.25, 0, 0.036, 0.03));
  metal.push(box(0.032, 0.026, 0.032, 0, 0.05, -0.085));
  metal.push(box(0.006, 0.012, 0.014, 0, 0.068, -0.09)); // rear sight leaf
  // Trigger guard + trigger + selector lever
  metal.push(box(0.008, 0.006, 0.07, 0, -0.04, 0.085));
  metal.push(box(0.008, 0.03, 0.006, 0, -0.045, 0.07, 0.35));
  metal.push(box(0.004, 0.012, 0.075, 0.022, 0.0, 0.06, -0.2));
  // Charging handle knob (right side)
  metal.push(box(0.014, 0.014, 0.018, 0.028, 0.02, 0.0));
  // Gas tube (upper handguard sits around it), gas block, barrel, front sight, muzzle brake
  metal.push(cyl(0.011, 0.011, 0.11, 8, 0, 0.038, -0.24, { open: true }));
  metal.push(box(0.032, 0.05, 0.03, 0, 0.018, -0.305));
  metal.push(cyl(0.0095, 0.0095, 0.235, 10, 0, 0.012, -0.37, { open: true }));
  metal.push(box(0.03, 0.026, 0.022, 0, 0.03, -0.43)); // front sight base
  metal.push(box(0.006, 0.05, 0.006, 0, 0.062, -0.43)); // sight post
  metal.push(box(0.004, 0.03, 0.02, -0.014, 0.06, -0.43)); // sight ears
  metal.push(box(0.004, 0.03, 0.02, 0.014, 0.06, -0.43));
  metal.push(cyl(0.0135, 0.013, 0.06, 10, 0, 0.012, -0.482));
  metal.push(box(0.024, 0.02, 0.022, 0, 0.004, -0.486)); // brake port block
  // Magazine: three curved segments (30 rd, forward curve)
  {
    const segLen = 0.075;
    let p = new THREE.Vector3(0, -0.03, -0.02);
    let angle = 0.12;
    for (let i = 0; i < 3; i++) {
      const dir = new THREE.Vector3(0, -Math.cos(angle), -Math.sin(angle));
      const mid = p.clone().addScaledVector(dir, segLen * 0.5);
      metal.push(box(0.028, segLen + 0.008, 0.06, mid.x, mid.y, mid.z, -angle));
      p = p.addScaledVector(dir, segLen);
      angle += 0.3;
    }
    metal.push(box(0.03, 0.012, 0.064, p.x, p.y + 0.003, p.z, -angle + 0.3)); // floor plate
  }
  // Butt plate
  metal.push(box(0.04, 0.095, 0.014, 0, -0.022, 0.428, -0.05));
  // Sling loops
  metal.push(box(0.004, 0.02, 0.012, -0.024, -0.02, 0.2));

  // --- Furniture: lower handguard, upper handguard, pistol grip, stock -------------------------------
  furniture.push(box(0.046, 0.044, 0.15, 0, -0.008, -0.2));
  furniture.push(box(0.038, 0.03, 0.13, 0, 0.038, -0.205));
  furniture.push(box(0.03, 0.105, 0.036, 0, -0.078, 0.128, -0.32));
  furniture.push(box(0.036, 0.052, 0.235, 0, -0.012, 0.3, 0.06));
  furniture.push(box(0.034, 0.03, 0.06, 0, 0.018, 0.185)); // stock tang cap

  const metalGeo = mergeGeometries(metal, false);
  const furnitureGeo = mergeGeometries(furniture, false);
  metalGeo.computeBoundingSphere();
  furnitureGeo.computeBoundingSphere();

  const metalMat = new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.42, metalness: 0.85, envMapIntensity: 0.9, name: 'SoldierRifleMetal' });
  const furnitureMat = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.62, metalness: 0.02, name: 'SoldierRifleFurniture' });

  const tris = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
  _shared = { metalGeo, furnitureGeo, metalMat, furnitureMat, triangles: tris(metalGeo) + tris(furnitureGeo) };
  return _shared;
}

export function getRifleAssets() {
  return _shared || buildShared();
}

/** Fresh rifle instance (shares geometry + materials). `sockets` are Object3D children in rifle space. */
export function createSoldierRifle() {
  const s = getRifleAssets();
  const group = new THREE.Group();
  group.name = 'SoldierRifle';
  const metal = new THREE.Mesh(s.metalGeo, s.metalMat);
  const furniture = new THREE.Mesh(s.furnitureGeo, s.furnitureMat);
  for (const m of [metal, furniture]) {
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false; // rifles move with the skeleton; bounds are tiny anyway
    group.add(m);
  }
  const sockets = {};
  for (const [name, pos] of Object.entries(RIFLE_SOCKETS)) {
    const o = new THREE.Object3D();
    o.name = `socket_${name}`;
    o.position.copy(pos);
    group.add(o);
    sockets[name] = o;
  }
  group.sockets = sockets;
  return group;
}

export function disposeRifleAssets() {
  if (!_shared) return;
  _shared.metalGeo.dispose();
  _shared.furnitureGeo.dispose();
  _shared.metalMat.dispose();
  _shared.furnitureMat.dispose();
  _shared = null;
}
