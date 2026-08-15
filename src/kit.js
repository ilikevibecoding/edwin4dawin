import {
  CircleGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import {
  box,
  cyl,
  flangeRing,
  mergeGeoms,
  pipeElbow,
  placed,
  roundedBox,
  sphere,
  torus,
  valveWheel,
} from './geom.js';
import { makeLabelTexture } from './materials.js';

const _m = new Matrix4();
const _o = new Object3D();
const _q = new Quaternion();
const _x = new Vector3(1, 0, 0);
const _y = new Vector3(0, 1, 0);
const _z = new Vector3(0, 0, 1);

function mesh(geo, mat) {
  const m = new Mesh(geo, mat);
  m.castShadow = false;
  m.receiveShadow = true;
  return m;
}

export function addBoltRing(parent, materials, radius, count, y, z, axis = 'z') {
  const geo = cyl(0.007, 0.007, 0.016, 6);
  const inst = new InstancedMesh(geo, materials.brushed, count);
  inst.castShadow = true;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const s = Math.sin(a) * radius;
    if (axis === 'z') {
      _o.position.set(x, y + s, z);
      _o.rotation.set(Math.PI * 0.5, 0, 0);
    } else if (axis === 'y') {
      _o.position.set(x, y, z + s);
      _o.rotation.set(0, 0, 0);
    } else {
      _o.position.set(y, s, z + x);
      _o.rotation.set(0, 0, Math.PI * 0.5);
    }
    _o.updateMatrix();
    inst.setMatrixAt(i, _o.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  parent.add(inst);
  return inst;
}

export function makePipeRun(mats, path, radius = 0.035, color = 'pipe') {
  const g = new Group();
  const mat = mats[color] || mats.pipe;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-4) continue;
    const body = mesh(cyl(radius, radius, len, 10), mat);
    body.position.set((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
    body.quaternion.setFromUnitVectors(_y, new Vector3(dx, dy, dz).normalize());
    g.add(body);

    if (i === 0 || i === path.length - 2) {
      const fl = mesh(flangeRing(radius * 0.92, radius * 1.55, 0.016, 14), mats.brushed);
      fl.quaternion.copy(body.quaternion);
      const t = i === 0 ? 0.08 : 0.92;
      fl.position.set(a[0] + dx * t, a[1] + dy * t, a[2] + dz * t);
      g.add(fl);
    }
  }
  for (let i = 1; i < path.length - 1; i++) {
    const p = path[i];
    const prev = path[i - 1];
    const next = path[i + 1];
    const d0 = new Vector3(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]).normalize();
    const d1 = new Vector3(next[0] - p[0], next[1] - p[1], next[2] - p[2]).normalize();
    if (d0.dot(d1) < 0.92) {
      const joint = mesh(sphere(radius * 1.15, 10, 8), mat);
      joint.position.set(p[0], p[1], p[2]);
      g.add(joint);
    }
  }
  return g;
}

export function makeStraightPipe(mats, x, y, z, length, radius, axis = 'z', color = 'pipe') {
  const g = new Group();
  const mat = mats[color] || mats.pipe;
  const body = mesh(cyl(radius, radius, length, 10), mat);
  if (axis === 'z') body.rotation.x = Math.PI * 0.5;
  if (axis === 'x') body.rotation.z = Math.PI * 0.5;
  body.position.set(x, y, z);
  g.add(body);
  const flA = mesh(flangeRing(radius * 0.9, radius * 1.5, 0.014, 10), mats.brushed);
  const flB = flA.clone();
  if (axis === 'z') {
    flA.rotation.x = Math.PI * 0.5;
    flB.rotation.x = Math.PI * 0.5;
    flA.position.set(x, y, z - length * 0.5 + 0.02);
    flB.position.set(x, y, z + length * 0.5 - 0.02);
  } else if (axis === 'x') {
    flA.rotation.z = Math.PI * 0.5;
    flB.rotation.z = Math.PI * 0.5;
    flA.position.set(x - length * 0.5 + 0.02, y, z);
    flB.position.set(x + length * 0.5 - 0.02, y, z);
  } else {
    flA.position.set(x, y - length * 0.5 + 0.02, z);
    flB.position.set(x, y + length * 0.5 - 0.02, z);
  }
  g.add(flA, flB);
  return g;
}

export function makeClamp(mats, radius) {
  const g = new Group();
  g.add(mesh(placed(box(radius * 2.4, 0.016, 0.028), 0, 0, 0), mats.brushed));
  g.add(mesh(placed(box(0.012, 0.03, 0.012), radius * 1.15, -0.02, 0), mats.brushed));
  g.add(mesh(placed(box(0.012, 0.03, 0.012), -radius * 1.15, -0.02, 0), mats.brushed));
  return g;
}

export function makeValve(mats, radius = 0.032, wheelR = 0.08) {
  const g = new Group();
  const body = mesh(sphere(radius * 1.35, 12, 10), mats.oily);
  g.add(body);
  const stem = mesh(cyl(0.01, 0.01, 0.08, 8), mats.brushed);
  stem.position.y = radius * 1.2 + 0.03;
  g.add(stem);
  const wheel = mesh(valveWheel(wheelR, 0.009, 5), mats.chipped);
  wheel.position.y = radius * 1.2 + 0.08;
  wheel.rotation.x = Math.PI * 0.5;
  g.add(wheel);
  const inP = mesh(cyl(radius, radius, 0.08, 10), mats.pipe);
  inP.rotation.z = Math.PI * 0.5;
  inP.position.x = -0.06;
  const outP = inP.clone();
  outP.position.x = 0.06;
  g.add(inP, outP);
  return g;
}

export function makeGauge(mats, faceTexture, size = 0.07) {
  const g = new Group();
  const housing = mesh(cyl(size, size * 0.92, 0.028, 16), mats.brushed);
  housing.rotation.x = Math.PI * 0.5;
  g.add(housing);
  const bezel = mesh(torus(size * 0.92, 0.006, 8, 16), mats.brushed);
  g.add(bezel);
  const face = mesh(cyl(size * 0.82, size * 0.82, 0.004, 16), mats.plastic);
  if (faceTexture) {
    const fm = mats.plastic.clone();
    fm.map = faceTexture;
    fm.color.set(0xffffff);
    fm.roughness = 0.35;
    face.material = fm;
  }
  face.rotation.x = Math.PI * 0.5;
  face.position.z = 0.012;
  g.add(face);
  const glass = mesh(cyl(size * 0.8, size * 0.8, 0.006, 16), mats.glass);
  glass.rotation.x = Math.PI * 0.5;
  glass.position.z = 0.016;
  glass.castShadow = false;
  g.add(glass);
  const needle = mesh(box(0.004, size * 0.62, 0.003), mats.oily);
  needle.position.set(0, size * 0.12, 0.015);
  needle.rotation.z = -0.4;
  g.add(needle);
  g.userData.needle = needle;
  return g;
}

export function makeCableTray(mats, length, width = 0.16) {
  const g = new Group();
  const tray = mesh(roundedBox(width, 0.018, length, 0.004, 1), mats.hullGreen);
  g.add(tray);
  const lipL = mesh(box(0.01, 0.03, length), mats.brushed);
  lipL.position.set(-width * 0.5, 0.02, 0);
  const lipR = lipL.clone();
  lipR.position.x = width * 0.5;
  g.add(lipL, lipR);
  const cables = mesh(cyl(0.012, 0.012, length * 0.96, 6), mats.plastic);
  cables.rotation.x = Math.PI * 0.5;
  cables.position.set(-0.03, 0.02, 0);
  const c2 = cables.clone();
  c2.position.x = 0.01;
  c2.material = mats.bakelite;
  const c3 = cables.clone();
  c3.position.x = 0.04;
  c3.scale.set(0.7, 1, 0.7);
  g.add(cables, c2, c3);
  return g;
}

export function makeJunctionBox(mats, w = 0.18, h = 0.22, d = 0.08) {
  const g = new Group();
  g.add(mesh(roundedBox(w, h, d, 0.008, 1), mats.hullGreen));
  const door = mesh(roundedBox(w * 0.86, h * 0.8, 0.012, 0.006, 1), mats.chipped);
  door.position.z = d * 0.5 + 0.004;
  g.add(door);
  const latch = mesh(box(0.018, 0.04, 0.016), mats.brushed);
  latch.position.set(w * 0.32, 0, d * 0.5 + 0.014);
  g.add(latch);
  const conduit = mesh(cyl(0.016, 0.016, 0.1, 8), mats.pipe);
  conduit.position.set(0, h * 0.5 + 0.04, 0);
  g.add(conduit);
  return g;
}

export function makeVent(mats, w = 0.22, h = 0.1) {
  const g = new Group();
  g.add(mesh(roundedBox(w, h, 0.03, 0.006, 1), mats.brushed));
  for (let i = 0; i < 5; i++) {
    const slat = mesh(box(w * 0.86, 0.006, 0.02), mats.oily);
    slat.position.set(0, -h * 0.32 + i * 0.018, 0.01);
    slat.rotation.x = -0.35;
    g.add(slat);
  }
  return g;
}

export function makeFan(mats, radius = 0.09) {
  const g = new Group();
  const housing = mesh(cyl(radius * 1.08, radius * 1.08, 0.04, 16, 1, true), mats.brushed);
  housing.rotation.x = Math.PI * 0.5;
  g.add(housing);
  const ring = mesh(torus(radius, 0.008, 8, 16), mats.brushed);
  g.add(ring);
  const hub = mesh(cyl(0.018, 0.018, 0.03, 10), mats.oily);
  hub.rotation.x = Math.PI * 0.5;
  g.add(hub);
  const blades = new Group();
  for (let i = 0; i < 5; i++) {
    const blade = mesh(box(radius * 0.85, 0.018, 0.006), mats.plastic);
    blade.position.x = radius * 0.38;
    const wrap = new Group();
    wrap.rotation.z = (i / 5) * Math.PI * 2;
    wrap.add(blade);
    blades.add(wrap);
  }
  g.add(blades);
  g.userData.rotor = blades;
  return g;
}

export function makeHandrail(mats, length, height = 0.92) {
  const g = new Group();
  const rail = mesh(cyl(0.014, 0.014, length, 8), mats.brushed);
  rail.rotation.x = Math.PI * 0.5;
  rail.position.y = height;
  g.add(rail);
  const posts = Math.max(2, Math.floor(length / 0.7) + 1);
  for (let i = 0; i < posts; i++) {
    const t = posts === 1 ? 0 : i / (posts - 1);
    const z = -length * 0.5 + t * length;
    const post = mesh(cyl(0.012, 0.012, height, 8), mats.brushed);
    post.position.set(0, height * 0.5, z);
    g.add(post);
    const base = mesh(cyl(0.03, 0.03, 0.012, 10), mats.chipped);
    base.position.set(0, 0.006, z);
    g.add(base);
  }
  return g;
}

export function makeWarningPlate(mats, text, sub = '') {
  const g = new Group();
  const tex = makeLabelTexture(text, { sub, w: 256, h: 128, bg: '#b49a4a', fg: '#1c1608' });
  const plate = mesh(roundedBox(0.16, 0.08, 0.006, 0.003, 1), mats.plastic);
  const m = mats.plastic.clone();
  m.map = tex;
  m.color.set(0xffffff);
  m.roughness = 0.45;
  plate.material = m;
  g.add(plate);
  return g;
}

export function makeAccessPanel(mats, w = 0.28, h = 0.2) {
  const g = new Group();
  g.add(mesh(roundedBox(w, h, 0.018, 0.006, 1), mats.chipped));
  for (const [x, y] of [
    [-w * 0.4, h * 0.36],
    [w * 0.4, h * 0.36],
    [-w * 0.4, -h * 0.36],
    [w * 0.4, -h * 0.36],
  ]) {
    const bolt = mesh(cyl(0.008, 0.008, 0.012, 6), mats.brushed);
    bolt.rotation.x = Math.PI * 0.5;
    bolt.position.set(x, y, 0.012);
    g.add(bolt);
  }
  return g;
}

export function makeFloorGrate(mats, w, d) {
  const g = new Group();
  const frame = mesh(roundedBox(w, 0.02, d, 0.004, 1), mats.grate);
  g.add(frame);
  const bars = [];
  const n = Math.max(4, Math.floor(d / 0.045));
  for (let i = 0; i < n; i++) {
    const z = -d * 0.45 + (i / (n - 1)) * d * 0.9;
    bars.push(placed(box(w * 0.92, 0.012, 0.012), 0, 0.004, z));
  }
  const cross = Math.max(2, Math.floor(w / 0.12));
  for (let i = 0; i < cross; i++) {
    const x = -w * 0.4 + (i / Math.max(1, cross - 1)) * w * 0.8;
    bars.push(placed(box(0.01, 0.01, d * 0.9), x, 0.002, 0));
  }
  const merged = mesh(mergeGeoms(bars), mats.grate);
  g.add(merged);
  return g;
}

export function makeUnderfloor(mats, w, d) {
  const g = new Group();
  const dark = mesh(box(w, 0.4, d), mats.blackout);
  dark.position.y = -0.28;
  g.add(dark);
  const beam = mesh(box(w * 0.9, 0.04, 0.04), mats.oily);
  beam.position.y = -0.08;
  g.add(beam);
  const p = makeStraightPipe(mats, 0, -0.16, 0, d * 0.8, 0.025, 'z', 'pipeOrange');
  g.add(p);
  return g;
}

export function makeLightFixture(mats, length = 0.42) {
  const g = new Group();
  const housing = mesh(roundedBox(0.07, 0.04, length, 0.008, 1), mats.brushed);
  g.add(housing);
  const lens = mesh(roundedBox(0.05, 0.018, length * 0.86, 0.006, 1), mats.emissiveAmber);
  lens.position.y = -0.018;
  lens.castShadow = false;
  g.add(lens);
  const cage = mesh(box(0.002, 0.03, length * 0.8), mats.brushed);
  cage.position.set(0.028, -0.01, 0);
  const cage2 = cage.clone();
  cage2.position.x = -0.028;
  g.add(cage, cage2);
  return g;
}

export function makeSwitchBank(mats, count = 8) {
  const g = new Group();
  g.add(mesh(roundedBox(count * 0.028 + 0.04, 0.05, 0.04, 0.004, 1), mats.plastic));
  for (let i = 0; i < count; i++) {
    const sw = mesh(box(0.012, 0.02, 0.01), mats.bakelite);
    sw.position.set(-count * 0.014 + i * 0.028, 0.02, 0.01);
    sw.rotation.x = i % 3 === 0 ? -0.4 : 0.35;
    g.add(sw);
  }
  return g;
}

export function makeDoorWheel(mats, radius = 0.16) {
  const g = new Group();
  const wheel = mesh(valveWheel(radius, 0.014, 6), mats.chipped);
  wheel.rotation.x = Math.PI * 0.5;
  g.add(wheel);
  const hub = mesh(cyl(0.03, 0.03, 0.04, 10), mats.brushed);
  hub.rotation.x = Math.PI * 0.5;
  g.add(hub);
  return g;
}

export function makeHatchDoor(mats, width, height) {
  const g = new Group();
  const door = mesh(roundedBox(width * 0.96, height * 0.96, 0.05, 0.02, 2), mats.hull);
  g.add(door);
  const rim = mesh(roundedBox(width * 0.88, height * 0.88, 0.02, 0.018, 1), mats.chipped);
  rim.position.z = 0.02;
  g.add(rim);
  const wheel = makeDoorWheel(mats, 0.13);
  wheel.position.z = 0.05;
  g.add(wheel);
  const hinge = mesh(cyl(0.018, 0.018, height * 0.7, 8), mats.brushed);
  hinge.position.set(-width * 0.5, 0, 0);
  g.add(hinge);
  return g;
}

export function makePorthole(mats, radius = 0.16) {
  const g = new Group();
  const frame = mesh(cyl(radius + 0.05, radius + 0.055, 0.08, 20), mats.chipped);
  frame.rotation.x = Math.PI * 0.5;
  g.add(frame);
  const inner = mesh(cyl(radius + 0.02, radius + 0.02, 0.03, 18), mats.brushed);
  inner.rotation.x = Math.PI * 0.5;
  inner.position.z = 0.02;
  g.add(inner);
  const water = new Mesh(
    new CircleGeometry(radius * 0.96, 20),
    new MeshBasicMaterial({ color: 0x3d7a82, fog: false })
  );
  water.position.z = -0.02;
  water.castShadow = false;
  water.receiveShadow = false;
  water.userData.noMerge = true;
  g.add(water);
  const glass = mesh(cyl(radius, radius, 0.024, 18), mats.glassThick);
  glass.rotation.x = Math.PI * 0.5;
  glass.position.z = 0.01;
  glass.castShadow = false;
  glass.renderOrder = 3;
  g.add(glass);
  const seal = mesh(torus(radius + 0.012, 0.008, 8, 18), mats.rubber);
  g.add(seal);
  addBoltRing(g, mats, radius + 0.042, 10, 0, 0.03, 'z');
  return g;
}

export function makeSeat(mats) {
  const g = new Group();
  const seat = mesh(roundedBox(0.38, 0.06, 0.36, 0.02, 2), mats.leather);
  seat.position.y = 0.46;
  g.add(seat);
  const back = mesh(roundedBox(0.38, 0.42, 0.07, 0.02, 2), mats.leather);
  back.position.set(0, 0.7, -0.16);
  back.rotation.x = -0.12;
  g.add(back);
  const base = mesh(cyl(0.07, 0.09, 0.42, 10), mats.brushed);
  base.position.y = 0.22;
  g.add(base);
  const foot = mesh(roundedBox(0.28, 0.03, 0.28, 0.01, 1), mats.oily);
  foot.position.y = 0.02;
  g.add(foot);
  const belt = mesh(box(0.04, 0.012, 0.3), mats.rubber);
  belt.position.set(0.12, 0.5, 0);
  const belt2 = belt.clone();
  belt2.position.x = -0.12;
  g.add(belt, belt2);
  return g;
}

export { mesh };
