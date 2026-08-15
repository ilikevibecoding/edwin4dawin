import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function beveledBox(w, h, d, bevel = 0.012, segs = 1) {
  const hw = w * 0.5;
  const hh = h * 0.5;
  const shape = new THREE.Shape();
  const b = Math.min(bevel, hw * 0.45, hh * 0.45);
  const x0 = -hw;
  const y0 = -hh;
  const x1 = hw;
  const y1 = hh;
  shape.moveTo(x0 + b, y0);
  shape.lineTo(x1 - b, y0);
  shape.quadraticCurveTo(x1, y0, x1, y0 + b);
  shape.lineTo(x1, y1 - b);
  shape.quadraticCurveTo(x1, y1, x1 - b, y1);
  shape.lineTo(x0 + b, y1);
  shape.quadraticCurveTo(x0, y1, x0, y1 - b);
  shape.lineTo(x0, y0 + b);
  shape.quadraticCurveTo(x0, y0, x0 + b, y0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: false,
    curveSegments: Math.max(2, segs + 1),
  });
  geo.translate(0, 0, -d * 0.5);
  geo.computeVertexNormals();
  return geo;
}

export function roundedPanel(w, h, depth = 0.03, radius = 0.03) {
  const shape = new THREE.Shape();
  const hw = w * 0.5;
  const hh = h * 0.5;
  const r = Math.min(radius, hw, hh);
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.absarc(hw - r, -hh + r, r, -Math.PI / 2, 0);
  shape.lineTo(hw, hh - r);
  shape.absarc(hw - r, hh - r, r, 0, Math.PI / 2);
  shape.lineTo(-hw + r, hh);
  shape.absarc(-hw + r, hh - r, r, Math.PI / 2, Math.PI);
  shape.lineTo(-hw, -hh + r);
  shape.absarc(-hw + r, -hh + r, r, Math.PI, Math.PI * 1.5);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 1,
    curveSegments: 6,
  });
  geo.translate(0, 0, -depth * 0.5);
  geo.computeVertexNormals();
  return geo;
}

export function torusRing(radius, tube, radial = 40, tubular = 10) {
  return new THREE.TorusGeometry(radius, tube, tubular, radial);
}

export function latheProfile(points, segments = 28) {
  const vecs = points.map((p) => new THREE.Vector2(p[0], p[1]));
  const geo = new THREE.LatheGeometry(vecs, segments);
  geo.computeVertexNormals();
  return geo;
}

export function merge(geos) {
  const cleaned = geos.filter(Boolean).map((g) => {
    g.deleteAttribute?.('normal');
    return g;
  });
  if (!cleaned.length) return new THREE.BufferGeometry();
  const merged = mergeGeometries(cleaned, false);
  merged.computeVertexNormals();
  return merged;
}

export function mesh(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function addCollider(colliders, x, y, z, w, h, d) {
  colliders.push({
    min: new THREE.Vector3(x - w * 0.5, y - h * 0.5, z - d * 0.5),
    max: new THREE.Vector3(x + w * 0.5, y + h * 0.5, z + d * 0.5),
  });
}

export function colliderFromBox(colliders, object, pad = 0) {
  const box = new THREE.Box3().setFromObject(object);
  box.expandByScalar(pad);
  colliders.push({ min: box.min.clone(), max: box.max.clone() });
}

export function instanceBolts(positions, material, radius = 0.012, height = 0.016) {
  const geo = new THREE.CylinderGeometry(radius, radius, height, 8);
  const cap = new THREE.CylinderGeometry(radius * 1.35, radius * 1.35, height * 0.35, 8);
  cap.translate(0, height * 0.4, 0);
  const merged = merge([geo, cap]);
  const inst = new THREE.InstancedMesh(merged, material, positions.length);
  inst.castShadow = true;
  inst.receiveShadow = true;
  const dummy = new THREE.Object3D();
  positions.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
    dummy.scale.setScalar(p.s || 1);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  });
  inst.instanceMatrix.needsUpdate = true;
  return inst;
}

export function pathCurve(points) {
  const vecs = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  return new THREE.CatmullRomCurve3(vecs, false, 'catmullrom', 0.15);
}
