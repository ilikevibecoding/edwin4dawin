/**
 * Vehicles.ts — abandoned and burnt-out vehicles that break the street's
 * sightlines and give the map its "something happened here" storytelling.
 *
 * Each vehicle is assembled from chamfered boxes (body, greenhouse, bumpers,
 * wheel arches) plus cylinder wheels, merged into two meshes (charred body +
 * rubber) so a whole car is two draw calls. Vehicles are solid colliders and
 * seed low cover on both flanks.
 */

import * as THREE from 'three';
import type { Rng } from '../core/MathX';
import type { Build, LevelPlan } from './Blockout';
import { chamferedBox, worldCylinder, placed, mergeAll, tagSurface, freeze } from './GeometryKit';

interface CarStyle {
  length: number;
  width: number;
  bodyH: number;
  cabinH: number;
  cabinFrac: number;
  burnt: boolean;
  tint: number;
}

export function buildVehicles(env: Build, plan: LevelPlan): void {
  const rng = env.rng;
  void plan;

  // Burnt sedan half in the crater lip — foreground drama for the street shot.
  addCar(env, -2.6, -3.2, 0.5, sedan(true, 0x3b342d), rng, true);
  // Overturned wreck blocking the north lane.
  addCar(env, 2.4, -19, 1.9, sedan(true, 0x423a32), rng, true, Math.PI * 0.06);
  // Foreground burnt wreck at the near-right frame edge (street/gameplay depth).
  addCar(env, 4.4, 12, -1.15, sedan(true, 0x30302b), rng, true, Math.PI * 0.05);
  // Abandoned (not burnt) car on the west sidewalk near spawn.
  addCar(env, -7.4, 30, -0.25, sedan(false, 0x7a3b32), rng, false);
  // A hatchback in the market approach.
  addCar(env, 12.5, 30, 0.8, sedan(false, 0xb9b2a4), rng, false);
  // Box truck near the north checkpoint — a big silhouette landmark.
  addTruck(env, -3.0, -40, 0.2, rng);
}

function sedan(burnt: boolean, tint: number): CarStyle {
  return { length: 4.3, width: 1.85, bodyH: 0.7, cabinH: 0.72, cabinFrac: 0.52, burnt, tint };
}

function addCar(env: Build, x: number, z: number, yaw: number, s: CarStyle, rng: Rng, burnt: boolean, roll = 0): void {
  const bodyGeos: THREE.BufferGeometry[] = [];
  const uv = env.uv('metal_painted');
  const L = s.length;
  const W = s.width;
  // Lower body
  const lower = chamferedBox(L, s.bodyH, W, { chamfer: 0.08, uvScale: uv });
  bodyGeos.push(placed(lower, 0, 0.55, 0));
  lower.dispose();
  // Hood + trunk taper (slightly lower boxes front/back)
  const hood = chamferedBox(L * 0.32, 0.28, W * 0.92, { chamfer: 0.06, uvScale: uv });
  bodyGeos.push(placed(hood, L * 0.3, 0.85, 0));
  hood.dispose();
  const trunk = chamferedBox(L * 0.28, 0.3, W * 0.92, { chamfer: 0.06, uvScale: uv });
  bodyGeos.push(placed(trunk, -L * 0.33, 0.86, 0));
  trunk.dispose();
  // Greenhouse / cabin
  const cabin = chamferedBox(L * s.cabinFrac, s.cabinH, W * 0.86, { chamfer: 0.1, uvScale: uv });
  bodyGeos.push(placed(cabin, -L * 0.02, 0.55 + s.bodyH / 2 + s.cabinH / 2 - 0.05, 0));
  cabin.dispose();
  // Bumpers
  for (const bx of [L / 2 - 0.05, -L / 2 + 0.05]) {
    const bump = chamferedBox(0.2, 0.28, W * 0.98, { chamfer: 0.05, uvScale: uv });
    bodyGeos.push(placed(bump, bx, 0.5, 0));
    bump.dispose();
  }
  // Wheel arches (dark)
  const bodyMat = burnt
    ? env.mat('metal_rusted', { tint: s.tint, rough: 1, key: 'burnt' })
    : env.mat('metal_painted', { tint: s.tint, key: 'car_' + s.tint.toString(16) });

  const bodyGeo = mergeAll(bodyGeos);
  for (const g of bodyGeos) g.dispose();
  const bodyMesh = new THREE.Mesh(placed(bodyGeo, x, 0, z, yaw, 0, roll), bodyMat);
  bodyGeo.dispose();
  bodyMesh.name = 'car_body';
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  tagSurface(bodyMesh, 'metal', true, { destructible: true });
  freeze(bodyMesh);
  env.root.add(bodyMesh);
  env.own(bodyMesh.geometry);
  env.colliders.push(bodyMesh);

  // Wheels
  const wheelGeos: THREE.BufferGeometry[] = [];
  const wr = 0.36;
  const wy = 0.36;
  for (const wx of [L * 0.33, -L * 0.33]) {
    for (const wz of [W / 2 - 0.05, -W / 2 + 0.05]) {
      const flat = burnt && rng.chance(0.5) ? 0.6 : 1;
      const w = worldCylinder(wr, wr, 0.28, 12, uv);
      wheelGeos.push(placed(w, wx, wy * flat, wz, 0, 0, Math.PI / 2, 1));
      w.dispose();
    }
  }
  const wheelMat = env.mat('gun_polymer', { tint: 0x18191c, key: 'rubber' });
  const wheelGeo = mergeAll(wheelGeos);
  for (const g of wheelGeos) g.dispose();
  const wheelMesh = new THREE.Mesh(placed(wheelGeo, x, 0, z, yaw, 0, roll), wheelMat);
  wheelGeo.dispose();
  wheelMesh.name = 'car_wheels';
  wheelMesh.castShadow = true;
  tagSurface(wheelMesh, 'metal');
  freeze(wheelMesh);
  env.root.add(wheelMesh);
  env.own(wheelMesh.geometry);

  // Low cover on both flanks.
  const s1 = Math.sin(yaw);
  const c1 = Math.cos(yaw);
  for (const side of [1, -1]) {
    env.covers.push({
      pos: new THREE.Vector3(x - s1 * side * (W / 2 + 0.4), 0, z + c1 * side * (W / 2 + 0.4)),
      normal: new THREE.Vector3(-s1 * side, 0, c1 * side).normalize(),
      low: true,
    });
  }
}

function addTruck(env: Build, x: number, z: number, yaw: number, rng: Rng): void {
  void rng;
  const uv = env.uv('metal_painted');
  const geos: THREE.BufferGeometry[] = [];
  // Cargo box
  const box = chamferedBox(3.4, 2.3, 2.3, { chamfer: 0.06, uvScale: uv });
  geos.push(placed(box, -0.9, 1.7, 0));
  box.dispose();
  // Cab
  const cab = chamferedBox(1.6, 1.7, 2.2, { chamfer: 0.08, uvScale: uv });
  geos.push(placed(cab, 1.7, 1.25, 0));
  cab.dispose();
  // Chassis
  const chassis = chamferedBox(5.4, 0.5, 2.0, { chamfer: 0.05, uvScale: uv });
  geos.push(placed(chassis, 0, 0.75, 0));
  chassis.dispose();
  const bodyMat = env.mat('metal_painted', { tint: 0x5a6a52, key: 'truck' });
  const bodyGeo = mergeAll(geos);
  for (const g of geos) g.dispose();
  const mesh = new THREE.Mesh(placed(bodyGeo, x, 0, z, yaw), bodyMat);
  bodyGeo.dispose();
  mesh.name = 'truck';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  tagSurface(mesh, 'metal', true);
  freeze(mesh);
  env.root.add(mesh);
  env.own(mesh.geometry);
  env.colliders.push(mesh);

  // Wheels
  const wheelGeos: THREE.BufferGeometry[] = [];
  for (const wx of [1.8, -0.6, -1.9]) {
    for (const wz of [1.0, -1.0]) {
      const w = worldCylinder(0.5, 0.5, 0.35, 12, uv);
      wheelGeos.push(placed(w, wx, 0.5, wz, 0, 0, Math.PI / 2));
      w.dispose();
    }
  }
  const wheelGeo = mergeAll(wheelGeos);
  for (const g of wheelGeos) g.dispose();
  const wheelMesh = new THREE.Mesh(placed(wheelGeo, x, 0, z, yaw), env.mat('gun_polymer', { tint: 0x18191c, key: 'rubber' }));
  wheelGeo.dispose();
  wheelMesh.castShadow = true;
  tagSurface(wheelMesh, 'metal');
  freeze(wheelMesh);
  env.root.add(wheelMesh);
  env.own(wheelMesh.geometry);

  env.covers.push({ pos: new THREE.Vector3(x, 0, z + 1.6), normal: new THREE.Vector3(0, 0, 1), low: false });
  env.covers.push({ pos: new THREE.Vector3(x, 0, z - 1.6), normal: new THREE.Vector3(0, 0, -1), low: false });
}
