import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { prepareForMerge, cylinder } from './geo.js';
import { STRING_LIGHTS } from './layout.js';

/**
 * Festoon lighting across the plaza: sagging cables (parabolic catenary approximation, TubeGeometry,
 * merged) with hanging bulbs every ~0.65 m as two InstancedMeshes (emissive bulbs > 1.0 bloom, dark sockets).
 */
export function buildStringLights(ctx) {
  const { mats, batch, root } = ctx;
  const bulbs = [];
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _s = new THREE.Vector3(1, 1, 1);

  for (const s of STRING_LIGHTS) {
    const a = new THREE.Vector3(...s.a);
    const b = new THREE.Vector3(...s.b);
    const pts = [];
    const N = 40;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const p = a.clone().lerp(b, t);
      p.y -= 4 * s.sag * t * (1 - t);
      pts.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.TubeGeometry(curve, 56, 0.013, 5, false);
    batch.add(mats.iron, tube, [0.35, 0.35, 0.35]);
    const len = curve.getLength();
    const nb = Math.floor(len / 0.65);
    for (let k = 1; k < nb; k++) {
      const p = curve.getPointAt(k / nb);
      bulbs.push([p.x, p.y, p.z]);
    }
  }
  if (!bulbs.length) return;

  // Bulbs are ~5 cm at 6 m: 6×5 sphere segments (60 tris) is plenty; the bloom does the rest.
  const bulbGeo = new THREE.SphereGeometry(0.048, 6, 5);
  bulbGeo.translate(0, -0.16, 0);
  const socketGeo = mergeGeometries([prepareForMerge(cylinder(0.02, 0.026, 0.07, 6, { y: -0.1, open: true })), prepareForMerge(cylinder(0.004, 0.004, 0.08, 3, { y: -0.03, open: true }))]);
  const bulbMesh = new THREE.InstancedMesh(bulbGeo, mats.bulb, bulbs.length);
  const socketMesh = new THREE.InstancedMesh(socketGeo, mats.iron, bulbs.length);
  bulbMesh.name = 'StringLightBulbs';
  socketMesh.name = 'StringLightSockets';
  bulbs.forEach((p, i) => {
    _m.compose(new THREE.Vector3(p[0], p[1], p[2]), _q, _s);
    bulbMesh.setMatrixAt(i, _m);
    socketMesh.setMatrixAt(i, _m);
  });
  bulbMesh.instanceMatrix.needsUpdate = true;
  socketMesh.instanceMatrix.needsUpdate = true;
  bulbMesh.castShadow = false;
  socketMesh.castShadow = false;
  bulbMesh.frustumCulled = false;
  socketMesh.frustumCulled = false;
  root.add(bulbMesh, socketMesh);
}
