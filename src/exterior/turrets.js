// Weapons: eight heavy dual turbolaser turrets on the superstructure flanks (rotating drum + housing,
// plus a separately instanced gun assembly so every turret has its own elevation) and sixteen light
// emplacements along the trench edges. All geometry is original kit-bash of primitives.
import * as THREE from "three";
import { HULL } from "../config/shipSpec.js";
import { rng } from "../kit.js";
import { UP, dorsal, surfaceNormal, frameQuat, merge, box, bevelBox, cylX, cylZ, macroTint, layerMesh } from "./util.js";

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);
const _n = new THREE.Vector3();
const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const X = new THREE.Vector3(1, 0, 0);

// Heavy batteries stay in two rows flanking the superstructure (the recognisable Imperial layout) with a
// little stagger; the light emplacements cluster in twos and threes along the trench edges with random
// gaps and insets, so no fixed-interval lattice appears on the slopes. Deterministic (seeded).
const trand = rng(7701);
export const HEAVY_SPOTS = [];
for (const side of [-1, 1]) for (let i = 0; i < 4; i++) HEAVY_SPOTS.push([side * (176 + (i % 2) * 7), 208 + i * 75 + (trand() - 0.5) * 16]);
export const LIGHT_SPOTS = []; // [side, z, inset from the trench edge]
for (const side of [-1, 1]) {
  let z = -560 + trand() * 80;
  while (z < 690) {
    const n = 1 + Math.floor(trand() * 3);
    const inset = 22 + trand() * 16;
    for (let i = 0; i < n && z < 690; i++) {
      LIGHT_SPOTS.push([side, z, inset + (trand() - 0.5) * 4]);
      z += 30 + trand() * 26;
    }
    z += 70 + trand() * 190;
  }
}

export function turretRects() {
  const rects = HEAVY_SPOTS.map(([x, z]) => ({ x0: x - 18, x1: x + 18, z0: z - 18, z1: z + 18 }));
  for (const [side, z, inset] of LIGHT_SPOTS) {
    const x = side * (HULL.halfWidthAt(z) - inset);
    rects.push({ x0: x - 8, x1: x + 8, z0: z - 8, z1: z + 8 });
  }
  return rects;
}

function heavyBaseGeometry() {
  return merge([
    new THREE.CylinderGeometry(11.5, 12.2, 1.6, 28).translate(0, 0.8, 0),
    new THREE.CylinderGeometry(9.2, 9.9, 4.6, 28).translate(0, 3.9, 0),
    bevelBox(16, 7.6, 15, 0.9).translate(0, 6.0, 0.5),
    bevelBox(10, 3.2, 8, 0.6).translate(0, 13.5, -1.0),
    box(-8.9, 9.6, 1.5, 2.8, 4.2, 6.5),
    box(8.9, 9.6, 1.5, 2.8, 4.2, 6.5),
    box(0, 16.9, -2.5, 3.2, 0.6, 3.2),
    box(0, 10.2, 8.6, 12, 5.2, 1.4),
    new THREE.CylinderGeometry(0.22, 0.4, 5.5, 8).translate(3.6, 19.2, 2.6),
    new THREE.SphereGeometry(1.4, 12, 8).translate(-3.6, 17.6, 2.2),
    box(-6.5, 12.2, -4, 2, 1.2, 4),
    box(6.5, 12.2, -4, 2, 1.2, 4),
  ]);
}

// gun assembly, local origin at the trunnion (rotates about local X for elevation); barrels along -Z
function heavyGunGeometry() {
  return merge([
    cylX(2.7, 2.7, 11.2, 18),
    box(0, 0.4, -9.6, 8.4, 1.8, 1.4),
    cylZ(1.3, 1.08, 30, 12).translate(-3.4, 0.7, -18),
    cylZ(1.3, 1.08, 30, 12).translate(3.4, 0.7, -18),
    cylZ(1.95, 1.95, 8.5, 12).translate(-3.4, 0.7, -7),
    cylZ(1.95, 1.95, 8.5, 12).translate(3.4, 0.7, -7),
    new THREE.TorusGeometry(1.55, 0.38, 8, 18).translate(-3.4, 0.7, -32.5),
    new THREE.TorusGeometry(1.55, 0.38, 8, 18).translate(3.4, 0.7, -32.5),
    new THREE.TorusGeometry(1.6, 0.3, 8, 18).translate(-3.4, 0.7, -24),
    new THREE.TorusGeometry(1.6, 0.3, 8, 18).translate(3.4, 0.7, -24),
    box(0, 0.7, -16, 7.8, 0.8, 1.0),
  ]);
}
const HEAVY_PIVOT = new THREE.Vector3(0, 9.6, -6.6);

function lightTurretGeometry() {
  const barrels = merge([
    cylX(1.05, 1.05, 4.6, 10),
    cylZ(0.44, 0.36, 11, 8).translate(-1.1, 0.2, -6.5),
    cylZ(0.44, 0.36, 11, 8).translate(1.1, 0.2, -6.5),
    cylZ(0.7, 0.7, 3, 8).translate(-1.1, 0.2, -2.6),
    cylZ(0.7, 0.7, 3, 8).translate(1.1, 0.2, -2.6),
    box(0, 0.2, -5.5, 2.9, 0.4, 0.5),
  ]);
  barrels.rotateX(0.2);
  barrels.translate(0, 4.9, -1.9);
  return merge([
    new THREE.CylinderGeometry(3.5, 3.9, 1.2, 18).translate(0, 0.6, 0),
    new THREE.CylinderGeometry(2.6, 2.85, 2.2, 18).translate(0, 2.3, 0),
    bevelBox(5.4, 3.0, 5.2, 0.4).translate(0, 3.4, 0.3),
    box(0, 6.6, 0.8, 2.6, 0.5, 2.6),
    new THREE.SphereGeometry(0.6, 8, 6).translate(1.4, 7.1, 1.2),
    new THREE.CylinderGeometry(0.1, 0.16, 2.8, 6).translate(-1.4, 8.0, 1.0),
    barrels,
  ]);
}

export function buildTurrets(ctx) {
  const { rand, mats, detail } = ctx;
  const bases = [];
  const guns = [];
  const lights = [];
  for (const [x, z] of HEAVY_SPOTS) {
    surfaceNormal(x, z, true, _n);
    frameQuat(_n, _q);
    // turrets on the port side tend to face outboard-forward, starboard likewise (mirrored), with scatter
    const yaw = (x < 0 ? 0.55 : -0.55) + (rand() - 0.5) * 1.4;
    _q2.setFromAxisAngle(UP, yaw);
    _q.multiply(_q2);
    _p.set(x, dorsal(x, z), z);
    macroTint(x, _p.y, z, 1, _c);
    _c.multiplyScalar(0.98);
    bases.push({ m: new THREE.Matrix4().compose(_p, _q, _s), c: _c.clone() });
    // gun pivot in world space, then elevate
    _m.compose(_p, _q, _s);
    const pivot = HEAVY_PIVOT.clone().applyMatrix4(_m);
    _q2.setFromAxisAngle(X, 0.06 + rand() * 0.4);
    const gq = _q.clone().multiply(_q2);
    guns.push({ m: new THREE.Matrix4().compose(pivot, gq, _s), c: _c.clone() });
  }
  for (const [side, z, inset] of LIGHT_SPOTS) {
    const x = side * (HULL.halfWidthAt(z) - inset);
    surfaceNormal(x, z, true, _n);
    frameQuat(_n, _q);
    _q2.setFromAxisAngle(UP, side * -0.6 + (rand() - 0.5) * 1.2);
    _q.multiply(_q2);
    _p.set(x, dorsal(x, z), z);
    macroTint(x, _p.y, z, 1, _c);
    lights.push({ m: new THREE.Matrix4().compose(_p, _q, _s), c: _c.clone() });
  }
  // one mesh (and one shadow pass) for every weapon on the ship
  layerMesh(
    [
      { geo: heavyBaseGeometry(), list: bases },
      { geo: heavyGunGeometry(), list: guns },
      { geo: lightTurretGeometry(), list: lights },
    ],
    mats.greeble,
    detail.mid,
    "turrets",
  );
}
