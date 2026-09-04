// Navigation / running lights: one InstancedMesh of small emissive spheres driven by the runLight shader
// (per-instance colour, blink rate and phase; rate 0 = steady). Port red / starboard green along the trench
// lips, white strobes on the extremities (bow, mast, globes, stern corners), steady amber position lights on
// the terrace and tower corners, blue formation lights on the belly plate.
import * as THREE from "three";
import { HULL, CITY, TOWER, BELLY_PLATE, halfWidth, topY } from "../core/layout.js";
import { BOW, TR, rayPoint } from "./common.js";

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

export function buildRunLights(group, M, rand) {
  const items = [];
  const add = (x, y, z, color, rate, size = 1.6, phase = rand() * Math.PI * 2) => items.push({ x, y, z, color, rate, phase, size });
  const RED = 0xff0a08; // deep red so it never reads as amber after bloom + tone mapping
  const GREEN = 0x27ff6a;
  const WHITE = 0xffffff;
  const AMBER = 0xffb040;
  const BLUE = 0x4f8cff;

  // port / starboard lights along the trench lips (top and bottom), slow alternate blink
  for (let u = 0.1; u < 0.985; u += 0.075) {
    for (const side of [-1, 1]) {
      const [, z] = rayPoint(side, u);
      const x = side * (halfWidth(z) - 1.4);
      const col = side < 0 ? RED : GREEN;
      add(x, TR.y1 + 1.6, z, col, 1.8, 1.7, u * 9);
      add(x, TR.y0 - 1.6, z, col, 1.8, 1.7, u * 9 + Math.PI);
    }
  }
  // white strobes on the extremities
  add(0, TR.y1 + 1.5, BOW + 6, WHITE, 3.1, 2.2);
  add(0, TR.y0 - 1.5, BOW + 6, WHITE, 3.1, 2.2, 1.5);
  add(TOWER.mast.x, TOWER.mast.tipY + 1.5, TOWER.mast.z, WHITE, 2.6, 2.4);
  for (const side of [-1, 1]) {
    add(side * TOWER.globes.x, TOWER.globes.y + TOWER.globes.r + 8.2, TOWER.globes.z, side < 0 ? RED : GREEN, 0, 1.6);
    add(side * (HULL.halfWidthStern - 3), TR.y1 + 1.5, HULL.sternCornerZ - 4, WHITE, 3.1, 2.0, side);
    add(side * (HULL.halfWidthStern - 3), TR.y0 - 1.5, HULL.sternCornerZ - 4, WHITE, 3.1, 2.0, side + 2);
  }
  // steady amber position lights on the terrace corners and the bridge block corners
  for (const lv of CITY.levels) {
    const z1 = CITY.z1 - lv.inset * 0.5;
    for (const z of [lv.z0 + 2, z1 - 2]) {
      const hw = Math.max(8, CITY.halfWidthAt(z) - lv.inset);
      for (const side of [-1, 1]) add(side * (hw - 1.5), lv.y1 + 1.0, z, AMBER, 0, 1.1);
    }
  }
  const B = TOWER.bridge;
  for (const side of [-1, 1]) {
    add(side * (B.x - 1.5), B.y1 + 1.2, B.z0 + 1, AMBER, 0, 1.2);
    add(side * (B.x - 1.5), B.y1 + 1.2, B.z1 - 1, AMBER, 0, 1.2);
    add(side * (B.x + 0.6), B.y0 + 3, B.z1 - 6, side < 0 ? RED : GREEN, 0, 1.3);
  }
  // blue formation / landing lights along the belly plate edges (steady) and a slow strobe at each well
  {
    const P = BELLY_PLATE;
    for (let z = P.z0 + 12; z < P.z1 - 6; z += 32) {
      add(P.x0 + 3, P.y - 1.2, z, BLUE, 0, 1.2);
      add(P.x1 - 3, P.y - 1.2, z, BLUE, 0, 1.2);
    }
  }
  // a few strobes along the dorsal plateau ridge (aft plateau, where the hull is widest)
  for (const [s, u] of [
    [0.55, 0.75],
    [-0.55, 0.75],
    [0.8, 0.9],
    [-0.8, 0.9],
  ]) {
    const [x, z] = rayPoint(s, u);
    add(x, topY(x, z) + 2.2, z, WHITE, 2.2, 1.6);
  }

  const n = items.length;
  const geo = new THREE.SphereGeometry(1, 8, 6);
  const phase = new Float32Array(n);
  const rate = new Float32Array(n);
  const im = new THREE.InstancedMesh(geo, M.runLight, n);
  im.name = "inst_runLights";
  const col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const it = items[i];
    _m.compose(_p.set(it.x, it.y, it.z), _q.identity(), _s.set(it.size, it.size, it.size));
    im.setMatrixAt(i, _m);
    im.setColorAt(i, col.set(it.color));
    phase[i] = it.phase;
    rate[i] = it.rate;
  }
  geo.setAttribute("phase", new THREE.InstancedBufferAttribute(phase, 1));
  geo.setAttribute("rate", new THREE.InstancedBufferAttribute(rate, 1));
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = false;
  im.receiveShadow = false;
  im.frustumCulled = false;
  im.computeBoundingSphere();
  group.add(im);
  return [im];
}
