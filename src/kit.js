import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { createGaugeFace, createWarningPlate, createStencil } from './textures.js';

export class InstanceBatch {
  constructor(geometry, material, maxCount = 400) {
    this.geometry = geometry;
    this.material = material;
    this.maxCount = maxCount;
    this.dummy = new THREE.Object3D();
    this.mesh = new THREE.InstancedMesh(geometry, material, maxCount);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.count = 0;
  }

  add(position, rotation = null, scale = 1) {
    if (this.count >= this.maxCount) return;
    this.dummy.position.copy(position);
    if (rotation) this.dummy.rotation.copy(rotation);
    else this.dummy.rotation.set(0, 0, 0);
    if (scale.isVector3) this.dummy.scale.copy(scale);
    else this.dummy.scale.setScalar(scale);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(this.count, this.dummy.matrix);
    this.count++;
  }

  finalize(parent) {
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    parent.add(this.mesh);
    return this.mesh;
  }
}

export function mergeGroup(geometries, material) {
  const filtered = geometries.filter(Boolean);
  if (!filtered.length) return null;
  const merged = BufferGeometryUtils.mergeGeometries(filtered, false);
  if (!merged) return null;
  const mesh = new THREE.Mesh(merged, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function boxGeo(w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.rotateX(rx);
  g.rotateY(ry);
  g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

export function cylGeo(rTop, rBot, h, segs, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, segs);
  g.rotateX(rx);
  g.rotateY(ry);
  g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

export function torusGeo(r, tube, rs, ts, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.TorusGeometry(r, tube, rs, ts);
  g.rotateX(rx);
  g.rotateY(ry);
  g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

export function beveledBox(w, h, d, bevel = 0.012) {
  const hw = w / 2 - bevel;
  const hh = h / 2 - bevel;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -d / 2 + bevel);
  return geo;
}

export function createFlange(radius, mats) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.02, 0.016, 8, 20), mats.steel);
  ring.rotation.y = Math.PI / 2;
  ring.castShadow = true;
  group.add(ring);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.045, radius + 0.045, 0.018, 16), mats.steel);
  plate.rotation.z = Math.PI / 2;
  group.add(plate);
  return group;
}

export function addBoltRing(batch, origin, axis, radius, count, scale = 0.7) {
  const rot = new THREE.Euler();
  if (axis === 'z') rot.set(Math.PI / 2, 0, 0);
  if (axis === 'x') rot.set(0, 0, Math.PI / 2);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const p = origin.clone();
    if (axis === 'z') {
      p.x += Math.cos(a) * radius;
      p.y += Math.sin(a) * radius;
    } else if (axis === 'x') {
      p.y += Math.cos(a) * radius;
      p.z += Math.sin(a) * radius;
    } else {
      p.x += Math.cos(a) * radius;
      p.z += Math.sin(a) * radius;
    }
    batch.add(p, rot, scale);
  }
}

export function createPipeRun(points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.1);
  const tubular = Math.max(8, points.length * 6);
  const geo = new THREE.TubeGeometry(curve, tubular, radius, 8, false);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createStraightPipe(length, radius, material, axis = 'z') {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), material);
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createElbow(radius, bendRadius, material) {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, bendRadius),
    new THREE.Vector3(bendRadius, 0, bendRadius),
  );
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, radius, 8, false), material);
  mesh.castShadow = true;
  return mesh;
}

export function createValveWheel(size, mats) {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(size, size * 0.1, 8, 18), mats.safetyOrange ? mats.machine : mats.machine);
  rim.material = mats.machine;
  g.add(rim);
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(size * 1.7, size * 0.1, size * 0.12), mats.steel);
    spoke.rotation.z = (i / 4) * Math.PI;
    g.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.22, size * 0.22, size * 0.22, 10), mats.steel);
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

export function createValveAssembly(mats, size = 0.09) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(beveledBox(size * 1.6, size * 1.5, size * 1.6, 0.01), mats.machine);
  body.position.y = 0;
  g.add(body);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.12, size * 0.12, size * 1.1, 8), mats.steel);
  stem.position.y = size * 1.1;
  g.add(stem);
  const wheel = createValveWheel(size * 0.7, mats);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.y = size * 1.65;
  g.add(wheel);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.28, size * 0.32, size * 0.7, 10), mats.steel);
  neck.rotation.z = Math.PI / 2;
  g.add(neck);
  g.userData.kind = 'valve';
  return g;
}

export function createGauge(mats, label = 'HYD', value = 0.4) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.04, 16), mats.steel);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.046, 20), mats.label(createGaugeFace(label, value)));
  face.position.z = 0.022;
  g.add(face);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.048, 20), mats.glass);
  glass.position.z = 0.024;
  g.add(glass);
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), mats.steel);
  mount.position.y = -0.045;
  g.add(mount);
  return g;
}

export function createJunctionBox(mats, w = 0.22, h = 0.18, d = 0.08) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(beveledBox(w, h, d, 0.008), mats.plastic);
  g.add(body);
  const lid = new THREE.Mesh(beveledBox(w * 0.92, h * 0.88, 0.012, 0.004), mats.machine);
  lid.position.z = d * 0.45;
  g.add(lid);
  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), mats.steel);
  latch.position.set(0, -h * 0.32, d * 0.52);
  g.add(latch);
  return g;
}

export function createCableTray(length, mats) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.016, length), mats.steel);
  g.add(base);
  const l = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.05, length), mats.steel);
  l.position.set(-0.1, 0.025, 0);
  const r = l.clone();
  r.position.x = 0.1;
  g.add(l, r);
  return g;
}

export function createCableBundle(length, mats, sag = 0.04) {
  const pts = [];
  const segs = 8;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    pts.push(new THREE.Vector3(0, -Math.sin(t * Math.PI) * sag, (t - 0.5) * length));
  }
  const a = createPipeRun(pts, 0.012, mats.plastic);
  const b = createPipeRun(pts.map((p) => p.clone().add(new THREE.Vector3(0.016, 0.004, 0))), 0.009, mats.bakelite);
  const c = createPipeRun(pts.map((p) => p.clone().add(new THREE.Vector3(-0.014, 0.006, 0))), 0.008, mats.oily);
  const g = new THREE.Group();
  g.add(a, b, c);
  return g;
}

export function createVent(mats, w = 0.28, h = 0.16) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(beveledBox(w, h, 0.03, 0.006), mats.steel);
  g.add(frame);
  for (let i = 0; i < 5; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.012, 0.03), mats.brushed);
    slat.position.y = -h * 0.32 + i * (h * 0.14);
    slat.rotation.x = 0.4;
    g.add(slat);
  }
  return g;
}

export function createHandrail(length, mats) {
  const g = new THREE.Group();
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, length, 8), mats.steel);
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.9;
  g.add(rail);
  for (const z of [-length * 0.4, 0, length * 0.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 8), mats.steel);
    post.position.set(0, 0.45, z);
    g.add(post);
  }
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

export function createGrate(w, d, mats) {
  const geos = [];
  const bar = 0.018;
  const gap = 0.038;
  for (let x = -w / 2; x <= w / 2; x += bar + gap) {
    geos.push(boxGeo(bar, 0.016, d, x, 0, 0));
  }
  for (let z = -d / 2; z <= d / 2; z += bar + gap) {
    geos.push(boxGeo(w, 0.012, bar, 0, -0.004, z));
  }
  const mesh = mergeGroup(geos, mats.steel);
  if (mesh) mesh.receiveShadow = true;
  return mesh;
}

export function createAccessPanel(w, h, mats, label = 'ACCESS') {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(beveledBox(w, h, 0.025, 0.006), mats.chippedPaint);
  g.add(plate);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.006, 6, 12, Math.PI), mats.steel);
  handle.position.set(w * 0.28, 0, 0.02);
  g.add(handle);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.04), mats.label(createStencil(label, '#8a806c', '#1a1814')));
  tag.position.set(-w * 0.2, h * 0.28, 0.014);
  g.add(tag);
  return g;
}

export function createLightFixture(mats, kind = 'warm') {
  const g = new THREE.Group();
  const housing = new THREE.Mesh(beveledBox(0.22, 0.06, 0.34, 0.008), mats.steel);
  g.add(housing);
  const lens = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.26), kind === 'warm' ? mats.lightWarm : mats.lightCool);
  lens.position.y = -0.028;
  g.add(lens);
  const cage = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.004), mats.steel);
  cage.position.set(0, -0.04, 0.08);
  const cage2 = cage.clone();
  cage2.position.z = -0.08;
  g.add(cage, cage2);
  return g;
}

export function createSwitchBank(mats, count = 6) {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(beveledBox(0.04 + count * 0.032, 0.08, 0.03, 0.004), mats.plastic);
  g.add(plate);
  for (let i = 0; i < count; i++) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.028, 0.014), mats.bakelite);
    sw.position.set(-count * 0.016 + i * 0.032, 0.01, 0.016);
    sw.rotation.x = i % 2 === 0 ? -0.4 : 0.35;
    g.add(sw);
  }
  return g;
}

export function createWarning(mats, text, color) {
  const g = new THREE.Group();
  const map = createWarningPlate(text, color);
  const plate = new THREE.Mesh(beveledBox(0.18, 0.18, 0.02, 0.003), mats.steel);
  g.add(plate);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), mats.label(map));
  face.position.z = 0.012;
  g.add(face);
  return g;
}

export function invisibleHitbox(w, h, d) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    }),
  );
}

export function createFan(mats, radius = 0.12) {
  const g = new THREE.Group();
  const shroud = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012, 6, 16), mats.steel);
  g.add(shroud);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 10), mats.steel);
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  const blades = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.85, 0.012, 0.04), mats.brushed);
    blade.position.x = radius * 0.38;
    const wrap = new THREE.Group();
    wrap.rotation.z = (i / 5) * Math.PI * 2;
    wrap.add(blade);
    blades.add(wrap);
  }
  g.add(blades);
  g.userData.blades = blades;
  g.userData.kind = 'fan';
  return g;
}

export function markShadows(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return root;
}
