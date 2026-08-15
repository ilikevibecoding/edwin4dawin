import * as THREE from 'three';
import { mesh } from './geom.js';
import { createValveAssembly, createGauge } from './machinery.js';

export function pipeSegment(mats, length, radius = 0.03, material = null) {
  return mesh(new THREE.CylinderGeometry(radius, radius, length, 10), material || mats.pipe, 0, 0, 0, Math.PI / 2, 0, 0);
}

export function pipeElbow(mats, radius = 0.03, bend = 0.06, material = null) {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, bend),
    new THREE.Vector3(bend, 0, bend),
  );
  return mesh(new THREE.TubeGeometry(curve, 8, radius, 8, false), material || mats.pipe);
}

export function pipeFlange(mats, radius = 0.03) {
  return mesh(new THREE.CylinderGeometry(radius * 1.7, radius * 1.7, 0.012, 12), mats.gunmetal, 0, 0, 0, Math.PI / 2, 0, 0);
}

export function pipeClamp(mats, radius = 0.03) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.TorusGeometry(radius + 0.004, 0.006, 6, 12), mats.brushedMetal, 0, 0, 0, Math.PI / 2, 0, 0));
  g.add(mesh(beveledBoxSmall(0.03, 0.02, 0.012), mats.gunmetal, 0, radius + 0.02, 0));
  return g;
}

function beveledBoxSmall(w, h, d) {
  return new THREE.BoxGeometry(w, h, d);
}

/**
 * Place a straight pipe along Z (or arbitrary Euler) with optional flanges.
 */
export function runPipe(parent, mats, { x, y, z, length, radius = 0.03, rot = [Math.PI / 2, 0, 0], material, flanges = true }) {
  const g = new THREE.Group();
  const cyl = mesh(new THREE.CylinderGeometry(radius, radius, length, 10), material || mats.pipe);
  cyl.rotation.set(rot[0], rot[1], rot[2]);
  g.add(cyl);
  if (flanges && length > 0.4) {
    const along = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
    const f1 = pipeFlange(mats, radius);
    const f2 = pipeFlange(mats, radius);
    f1.position.copy(along.clone().multiplyScalar(-length * 0.45));
    f2.position.copy(along.clone().multiplyScalar(length * 0.45));
    f1.rotation.copy(cyl.rotation);
    f2.rotation.copy(cyl.rotation);
    g.add(f1, f2);
  }
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

export function tubeAlong(parent, mats, points, radius = 0.028, material = null) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  const geo = new THREE.TubeGeometry(curve, Math.max(8, points.length * 6), radius, 8, false);
  const m = mesh(geo, material || mats.pipe);
  parent.add(m);
  return m;
}

export function decoratePipeRun(parent, mats, z0, z1, x, y, radius = 0.028, material = null) {
  const length = z1 - z0;
  runPipe(parent, mats, { x, y, z: (z0 + z1) * 0.5, length, radius, material, flanges: true });
  const clamps = Math.max(1, Math.floor(length / 0.9));
  for (let i = 0; i < clamps; i++) {
    const t = (i + 0.5) / clamps;
    const c = pipeClamp(mats, radius);
    c.position.set(x, y, z0 + t * length);
    parent.add(c);
  }
}

export function valveOnPipe(parent, mats, x, y, z, scale = 1, rotY = 0) {
  const v = createValveAssembly(mats, scale);
  v.position.set(x, y, z);
  v.rotation.y = rotY;
  parent.add(v);
  return v;
}

export function gaugeOnPipe(parent, mats, x, y, z, seed, label) {
  const g = createGauge(mats, seed, label);
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

export function buildOverheadPipeBank(parent, mats, z0, z1, baseX = 0.55, baseY = 2.02) {
  const specs = [
    { x: baseX, y: baseY, r: 0.032, mat: mats.pipe },
    { x: baseX + 0.1, y: baseY + 0.04, r: 0.022, mat: mats.pipeBlue },
    { x: baseX + 0.2, y: baseY - 0.02, r: 0.018, mat: mats.pipeCopper },
    { x: -baseX, y: baseY, r: 0.03, mat: mats.pipe },
    { x: -baseX - 0.12, y: baseY + 0.03, r: 0.02, mat: mats.pipeRed },
  ];
  specs.forEach((s) => decoratePipeRun(parent, mats, z0, z1, s.x, s.y, s.r, s.mat));
}
