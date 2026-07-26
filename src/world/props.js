import * as THREE from 'three';
import {
  concreteMaterial, metalMaterial, woodMaterial, sandbagMaterial,
  corrugatedMaterial, flatMaterial,
} from './materials.js';
import { makeRNG } from '../core/utils.js';

// ===========================================================================
// Prop library. Every builder returns a Group; caller positions it and
// registers collision boxes. Props aim for silhouette-first realism:
// good proportions + PBR materials + grime beats poly count.
// ===========================================================================

const rng = makeRNG(31415);

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// --- Jersey barrier (concrete highway divider) ------------------------------
export function jerseyBarrier() {
  const g = new THREE.Group();
  const mat = concreteMaterial(31, 0.94);
  const shape = new THREE.Shape();
  shape.moveTo(-0.35, 0); shape.lineTo(0.35, 0);
  shape.lineTo(0.24, 0.28); shape.lineTo(0.12, 0.82);
  shape.lineTo(-0.12, 0.82); shape.lineTo(-0.24, 0.28);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.0, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
  geo.translate(0, 0, -1.0);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  g.userData.collider = { w: 0.7, h: 0.85, d: 2.05 };
  return g;
}

// --- Sandbag emplacement ------------------------------------------------------
export function sandbagWall(rows = 3, cols = 4) {
  const g = new THREE.Group();
  const mat = sandbagMaterial();
  const bagGeo = new THREE.SphereGeometry(0.5, 10, 8);
  bagGeo.scale(0.62, 0.28, 0.4);
  const r = makeRNG(rows * 100 + cols);
  for (let y = 0; y < rows; y++) {
    const n = cols - (y % 2 === 1 ? 0 : 0);
    for (let x = 0; x < n; x++) {
      const bag = new THREE.Mesh(bagGeo, mat);
      bag.position.set(
        (x - (n - 1) / 2) * 0.58 + (y % 2) * 0.28 + r.range(-0.03, 0.03),
        0.14 + y * 0.24,
        r.range(-0.05, 0.05)
      );
      bag.rotation.y = r.range(-0.25, 0.25);
      bag.rotation.z = r.range(-0.08, 0.08);
      bag.castShadow = true; bag.receiveShadow = true;
      g.add(bag);
    }
  }
  g.userData.collider = { w: cols * 0.58 + 0.3, h: rows * 0.24 + 0.18, d: 0.55 };
  return g;
}

// --- Oil barrel -----------------------------------------------------------------
export function barrel(color = 0x5a6b46) {
  const g = new THREE.Group();
  const mat = metalMaterial(color, 61 + color % 97);
  const b = cyl(0.3, 0.3, 0.9, mat, 0, 0.45, 0, 16);
  g.add(b);
  for (const y of [0.18, 0.45, 0.72]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.012, 6, 20), mat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    ring.castShadow = true;
    g.add(ring);
  }
  g.userData.collider = { w: 0.62, h: 0.92, d: 0.62 };
  return g;
}

// --- Ammo / supply crate ---------------------------------------------------------
export function crate(size = 0.75) {
  const g = new THREE.Group();
  const mat = woodMaterial();
  const c = box(size, size * 0.72, size, mat, 0, size * 0.36, 0);
  g.add(c);
  const edge = flatMaterial(0x4a3a26, 0.9);
  const t = 0.035;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.add(box(t * 2, size * 0.74, t * 2, edge, x * (size / 2 - t), size * 0.36, z * (size / 2 - t)));
  }
  g.userData.collider = { w: size + 0.02, h: size * 0.74, d: size + 0.02 };
  return g;
}

// --- Wrecked / burned car ----------------------------------------------------------
export function wreckedCar(burned = true, hue = 0x6b7a8c) {
  const g = new THREE.Group();
  const bodyMat = burned
    ? new THREE.MeshStandardMaterial({ color: 0x1d1a17, roughness: 0.95, metalness: 0.25 })
    : metalMaterial(hue, 400 + hue % 89);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0c0f12, roughness: 0.25, metalness: 0.6, envMapIntensity: 1.4 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.95 });

  // Lower body with slight crumple
  const lower = box(1.85, 0.55, 4.4, bodyMat, 0, 0.55, 0);
  lower.rotation.z = 0.015;
  g.add(lower);
  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.7, 0.55, 2.2);
  const pos = cabinGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0) { pos.setX(i, pos.getX(i) * 0.82); pos.setZ(i, pos.getZ(i) * 0.78); }
  }
  cabinGeo.computeVertexNormals();
  const cabin = new THREE.Mesh(cabinGeo, bodyMat);
  cabin.position.set(0, 1.08, -0.25);
  cabin.castShadow = true; cabin.receiveShadow = true;
  g.add(cabin);
  // Windows (dark, partially broken look)
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.4, 2.05), glassMat);
  win.position.set(0, 1.08, -0.25);
  g.add(win);
  // Hood dent
  const hood = box(1.7, 0.1, 1.1, bodyMat, 0, 0.86, 1.45);
  hood.rotation.x = -0.06;
  g.add(hood);
  // Wheels (some flat)
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const r = makeRNG(hue + 5);
  for (const [x, z] of [[-0.92, 1.45], [0.92, 1.45], [-0.92, -1.45], [0.92, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    const flat = r.chance(0.5);
    w.position.set(x, flat ? 0.26 : 0.36, z);
    if (flat) w.scale.y = 0.72;
    w.castShadow = true; w.receiveShadow = true;
    g.add(w);
  }
  g.userData.collider = { w: 2.0, h: 1.45, d: 4.5 };
  return g;
}

// --- Power / telephone pole ----------------------------------------------------------
export function powerPole() {
  const g = new THREE.Group();
  const mat = woodMaterial(83);
  const pole = cyl(0.09, 0.13, 7.5, mat, 0, 3.75, 0, 8);
  g.add(pole);
  const cross = box(1.9, 0.09, 0.09, mat, 0, 6.9, 0);
  g.add(cross);
  const cross2 = box(1.5, 0.08, 0.08, mat, 0, 6.3, 0);
  g.add(cross2);
  const insMat = flatMaterial(0x3b4a42, 0.5);
  for (const x of [-0.85, -0.3, 0.3, 0.85]) g.add(cyl(0.035, 0.045, 0.12, insMat, x, 7.0, 0, 6));
  g.userData.collider = { w: 0.3, h: 7.5, d: 0.3 };
  return g;
}

// Sagging wire between two points (catenary-ish curve)
export function wire(from, to, sag = 0.9) {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  mid.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const geo = new THREE.TubeGeometry(curve, 14, 0.012, 4);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.7 }));
  m.castShadow = true;
  return m;
}

// --- Tire stack -----------------------------------------------------------------------
export function tireStack(n = 3) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.95 });
  const geo = new THREE.TorusGeometry(0.34, 0.13, 8, 18);
  geo.rotateX(Math.PI / 2);
  const r = makeRNG(n * 77);
  for (let i = 0; i < n; i++) {
    const t = new THREE.Mesh(geo, mat);
    t.position.set(r.range(-0.05, 0.05), 0.13 + i * 0.25, r.range(-0.05, 0.05));
    t.rotation.y = r.range(0, Math.PI);
    t.castShadow = true; t.receiveShadow = true;
    g.add(t);
  }
  g.userData.collider = { w: 0.9, h: n * 0.25 + 0.15, d: 0.9 };
  return g;
}

// --- Rubble pile ------------------------------------------------------------------------
export function rubblePile(radius = 1.6, seed = 1) {
  const g = new THREE.Group();
  const mat = concreteMaterial(31, 0.85);
  const brickish = concreteMaterial(35, 0.7);
  const r = makeRNG(seed * 991);
  const n = Math.floor(radius * 9);
  for (let i = 0; i < n; i++) {
    const s = r.range(0.14, 0.55) * radius * 0.5;
    const geo = new THREE.BoxGeometry(s, s * r.range(0.4, 0.8), s * r.range(0.6, 1.3));
    const m = new THREE.Mesh(geo, r.chance(0.7) ? mat : brickish);
    const ang = r() * Math.PI * 2;
    const dist = Math.pow(r(), 0.6) * radius;
    m.position.set(Math.cos(ang) * dist, s * 0.3 * (1 - dist / radius) + 0.05, Math.sin(ang) * dist);
    m.rotation.set(r.range(-0.5, 0.5), r() * Math.PI, r.range(-0.5, 0.5));
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }
  // Rebar sticking out
  const rebarMat = new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 0.8, metalness: 0.6 });
  for (let i = 0; i < Math.floor(radius * 2); i++) {
    const bar = cyl(0.015, 0.015, r.range(0.6, 1.3), rebarMat, r.range(-radius * 0.5, radius * 0.5), 0.3, r.range(-radius * 0.5, radius * 0.5), 5);
    bar.rotation.set(r.range(-0.9, 0.9), 0, r.range(-0.9, 0.9));
    g.add(bar);
  }
  g.userData.collider = { w: radius * 1.4, h: radius * 0.4, d: radius * 1.4 };
  return g;
}

// --- Corrugated metal fence panel ----------------------------------------------------------
export function metalFence(length = 3, height = 2.2) {
  const g = new THREE.Group();
  const mat = corrugatedMaterial();
  const panel = box(length, height, 0.05, mat, 0, height / 2, 0);
  g.add(panel);
  const postMat = metalMaterial(0x333a40, 641);
  g.add(cyl(0.04, 0.04, height + 0.15, postMat, -length / 2, (height + 0.15) / 2, 0, 8));
  g.add(cyl(0.04, 0.04, height + 0.15, postMat, length / 2, (height + 0.15) / 2, 0, 8));
  g.userData.collider = { w: length, h: height, d: 0.2 };
  return g;
}

// --- Street light ---------------------------------------------------------------------------
export function streetLight() {
  const g = new THREE.Group();
  const mat = metalMaterial(0x3d4348, 733);
  g.add(cyl(0.06, 0.1, 6.4, mat, 0, 3.2, 0, 10));
  const arm = box(1.6, 0.07, 0.07, mat, 0.75, 6.3, 0);
  g.add(arm);
  const head = box(0.55, 0.1, 0.22, mat, 1.45, 6.26, 0);
  g.add(head);
  g.userData.collider = { w: 0.25, h: 6.4, d: 0.25 };
  return g;
}

// --- Market awning ----------------------------------------------------------------------------
// Pivot at the wall attachment edge; cloth extends toward local +z, sloping
// down. Rotate the group so +z points away from the wall face.
export function awning(width = 2.6, color = 0x8c3b2e) {
  const g = new THREE.Group();
  const clothMat = new THREE.MeshStandardMaterial({ color, roughness: 0.92, side: THREE.DoubleSide });
  const depth = 1.35;
  const geo = new THREE.PlaneGeometry(width, depth, 10, 4);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    // Scalloped sag between rib lines + slight belly toward the outer edge
    const sag = Math.abs(Math.sin((x / width + 0.5) * Math.PI * 4)) * 0.045 + (0.5 - y / depth) * 0.02;
    pos.setZ(i, -sag * (0.5 - y / depth + 0.5));
  }
  geo.translate(0, -depth / 2, 0); // pivot at back (wall) edge
  geo.computeVertexNormals();
  const cloth = new THREE.Mesh(geo, clothMat);
  cloth.rotation.x = -Math.PI / 2 + 0.42;
  cloth.castShadow = true; cloth.receiveShadow = true;
  g.add(cloth);
  // Support struts from outer corners back to the wall
  const strutMat = new THREE.MeshStandardMaterial({ color: 0x4a4640, roughness: 0.6, metalness: 0.7 });
  for (const sx of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.55, 6), strutMat);
    strut.position.set(sx * (width / 2 - 0.06), 0.28, 0.55);
    strut.rotation.x = 0.75;
    strut.castShadow = true;
    g.add(strut);
  }
  return g;
}

// --- AC unit (for walls/roofs) -------------------------------------------------------------------
export function acUnit() {
  const g = new THREE.Group();
  const mat = metalMaterial(0x9aa2a6, 811);
  const b = box(0.85, 0.55, 0.4, mat, 0, 0, 0);
  g.add(b);
  const grill = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), flatMaterial(0x2b2f31, 0.6, 0.4));
  grill.position.set(0, 0, 0.201);
  g.add(grill);
  return g;
}

// --- Water tank (rooftop) ---------------------------------------------------------------------------
export function waterTank() {
  const g = new THREE.Group();
  const mat = metalMaterial(0xb8b0a0, 911);
  g.add(cyl(0.7, 0.7, 1.3, mat, 0, 0.85, 0, 14));
  const legMat = flatMaterial(0x4d4a44, 0.8, 0.5);
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
    g.add(cyl(0.035, 0.035, 0.5, legMat, x, 0.25, z, 6));
  }
  return g;
}
