import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  concreteMaterial, metalMaterial, woodMaterial, sandbagMaterial,
  corrugatedMaterial, flatMaterial, carPaintMaterial, charredMaterial,
  awningMaterial, contactShadowMaterial, cardboardMaterial,
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

// Soft dark ellipse decal that glues a prop to the ground. w/d = footprint in
// meters (the blob renders slightly larger); parented to the prop group so it
// follows placement rotation.
export function contactShadow(w, d, opacity = 0.42, x = 0, z = 0) {
  const base = contactShadowMaterial();
  let mat = base;
  if (Math.abs(opacity - base.opacity) > 0.001) {
    mat = base.clone(); // clone shares the canvas texture
    mat.opacity = opacity;
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.35, d * 1.35), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.06, z);
  m.renderOrder = 6;
  m.userData.isContactShadow = true;
  return m;
}

// --- Jersey barrier (concrete highway divider) ------------------------------
export function jerseyBarrier() {
  const g = new THREE.Group();
  const mat = concreteMaterial(31, 0.82);
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
  g.add(contactShadow(0.8, 2.1, 0.38));
  g.userData.collider = { w: 0.7, h: 0.85, d: 2.05 };
  return g;
}

// --- Sandbag emplacement ------------------------------------------------------
// All bags baked into a single merged mesh (one draw call per wall).
export function sandbagWall(rows = 3, cols = 4) {
  const g = new THREE.Group();
  const mat = sandbagMaterial();
  const bagGeo = new THREE.SphereGeometry(0.5, 10, 8);
  bagGeo.scale(0.62, 0.28, 0.4);
  const r = makeRNG(rows * 100 + cols);
  const parts = [];
  for (let y = 0; y < rows; y++) {
    const n = cols - (y % 2 === 1 ? 0 : 0);
    for (let x = 0; x < n; x++) {
      const jx = r.range(-0.03, 0.03);
      const jz = r.range(-0.05, 0.05);
      const ry = r.range(-0.25, 0.25);
      const rz = r.range(-0.08, 0.08);
      const geo = bagGeo.clone();
      geo.rotateZ(rz);
      geo.rotateY(ry);
      geo.translate((x - (n - 1) / 2) * 0.58 + (y % 2) * 0.28 + jx, 0.14 + y * 0.24, jz);
      parts.push(geo);
    }
  }
  const m = new THREE.Mesh(mergeGeometries(parts), mat);
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  g.add(contactShadow(cols * 0.58 + 0.3, 0.75, 0.4));
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
  g.add(contactShadow(0.68, 0.68, 0.4));
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
  g.add(contactShadow(size, size, 0.4));
  g.userData.collider = { w: size + 0.02, h: size * 0.74, d: size + 0.02 };
  return g;
}

// --- Stacked market crates (shopfront clutter) ----------------------------------
export function stackedCrates(seed = 7) {
  const g = new THREE.Group();
  const r = makeRNG(seed * 137);
  const n = r.int(2, 3);
  let y = 0;
  const s0 = r.range(0.62, 0.8);
  for (let i = 0; i < n; i++) {
    const s = s0 * (1 - i * 0.12);
    const c = crate(s);
    c.position.set(i === 0 ? 0 : r.range(-0.08, 0.08), y, i === 0 ? 0 : r.range(-0.08, 0.08));
    c.rotation.y = r.range(-0.3, 0.3);
    // only the bottom crate keeps its blob shadow
    if (i > 0) c.children.forEach((ch) => { if (ch.userData.isContactShadow) ch.visible = false; });
    g.add(c);
    y += s * 0.72;
  }
  const side = crate(s0 * 0.7);
  side.position.set(r.range(0.55, 0.75) * (r.chance(0.5) ? 1 : -1), 0, r.range(-0.2, 0.2));
  side.rotation.y = r.range(0, 1.2);
  g.add(side);
  g.userData.collider = { w: s0 + 0.9, h: y + 0.1, d: s0 + 0.5 };
  return g;
}

// --- Wrecked / burned car ----------------------------------------------------------
// Sedan built from distinct panels so it reads at a glance: body sides, hood,
// trunk, dark greenhouse with pillars, black wheel wells, tires + rims.
// Panels are baked into one merged mesh per material (~6 draw calls per car).
export function wreckedCar(burned = true, hue = 0x6b7a8c) {
  const g = new THREE.Group();
  const r = makeRNG(hue + 5);
  const bodyMat = burned ? charredMaterial() : carPaintMaterial(hue, 400 + (hue % 89));
  const darkTrim = flatMaterial(0x1b1a18, 0.85, 0.2, 0.5);
  const glassMat = burned
    ? flatMaterial(0x0b0a09, 0.9, 0.1, 0.3) // glass gone -> sooty cavity
    : new THREE.MeshStandardMaterial({ color: 0x3a444c, roughness: 0.12, metalness: 0.85, envMapIntensity: 1.9 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111110, roughness: 0.96 });
  const rimMat = burned ? flatMaterial(0x242220, 0.85, 0.3, 0.4) : flatMaterial(0x53565a, 0.5, 0.75, 1.0);

  const body = [], trim = [], tires = [], rims = [], rearLights = [];
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  // Main body tub (slight list) + rocker/skirt shadow line under the body
  body.push(B(1.84, 0.52, 4.35).rotateZ(0.012).translate(0, 0.58, 0));
  trim.push(B(1.6, 0.24, 3.7).translate(0, 0.24, 0));
  // Hood (slightly popped) and trunk as separate planes -> visible panel lines
  body.push(B(1.66, 0.09, 1.24).rotateX(-0.07 - r.range(0, 0.05)).translate(0, 0.88, 1.48));
  body.push(B(1.66, 0.09, 0.95).rotateX(0.04).translate(0, 0.87, -1.62));
  // Bumpers
  trim.push(B(1.88, 0.17, 0.2).translate(0, 0.42, 2.22));
  trim.push(B(1.88, 0.17, 0.2).translate(0, 0.42, -2.22));
  // Greenhouse: tapered glass volume (tilted panes catch the sky) + roof
  const glassGeo = new THREE.BoxGeometry(1.52, 0.5, 2.0);
  {
    const pos = glassGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) > 0) { pos.setX(i, pos.getX(i) * 0.92); pos.setZ(i, pos.getZ(i) * 0.78); }
    }
    glassGeo.computeVertexNormals();
  }
  glassGeo.translate(0, 1.1, -0.28);
  body.push(B(1.58, 0.07, 2.04).translate(0, 1.39, -0.28));
  // A/C pillars (slanted)
  for (const [z, tilt] of [[0.76, 0.45], [-1.3, -0.4]]) {
    for (const sx of [-1, 1]) {
      body.push(B(0.06, 0.6, 0.09).rotateX(tilt).translate(sx * 0.74, 1.1, z - 0.28));
    }
  }
  // Wheel wells (dark boxes) + wheels with rims
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.26, 12);
  rimGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.83, 1.42], [0.83, 1.42], [-0.83, -1.42], [0.83, -1.42]]) {
    trim.push(B(0.3, 0.42, 0.86).translate(x, 0.44, z));
    const flat = r.chance(0.5);
    const y = flat ? 0.24 : 0.34;
    const w = wheelGeo.clone();
    if (flat) w.scale(1, 0.7, 1);
    w.translate(x * 1.12, y, z);
    tires.push(w);
    const rim = rimGeo.clone();
    if (flat) rim.scale(1, 0.85, 1);
    rim.translate(x * 1.12, y, z);
    rims.push(rim);
  }
  // Lights: dark sockets (rear keeps faded red lenses on unburned cars)
  for (const sx of [-1, 1]) {
    trim.push(B(0.34, 0.13, 0.06).translate(sx * 0.62, 0.72, 2.19));
    (burned ? trim : rearLights).push(B(0.3, 0.12, 0.05).translate(sx * 0.6, 0.72, -2.19));
  }
  const addMerged = (geos, mat) => {
    if (!geos.length) return;
    const m = new THREE.Mesh(mergeGeometries(geos), mat);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  };
  addMerged(body, bodyMat);
  addMerged(trim, darkTrim);
  addMerged([glassGeo], glassMat);
  addMerged(tires, tireMat);
  addMerged(rims, rimMat);
  if (rearLights.length) addMerged(rearLights, flatMaterial(0x4a1f18, 0.5, 0.2, 0.8));
  g.add(contactShadow(2.0, 4.4, 0.5));
  g.userData.collider = { w: 2.0, h: 1.35, d: 4.5 };
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
  g.add(contactShadow(0.5, 0.5, 0.35));
  g.userData.collider = { w: 0.3, h: 7.5, d: 0.3 };
  return g;
}

// --- Snapped power pole, leaning into the street ------------------------------------
// Hinged at the ground, tipping toward local +z; rotate the group to aim the
// fall direction. userData.topLocal gives the tip for wire attachment.
export function leaningPowerPole(lean = 0.46) {
  const g = new THREE.Group();
  const mat = woodMaterial(83);
  const wood = [];
  // Pole shaft, pivoted at the base
  wood.push(new THREE.CylinderGeometry(0.09, 0.13, 7.5, 8).translate(0, 3.75, 0).rotateX(lean));
  // Splintered stump it tore away from
  wood.push(new THREE.CylinderGeometry(0.115, 0.14, 0.55, 8).rotateZ(0.14).translate(0.06, 0.24, -0.18));
  wood.push(new THREE.BoxGeometry(0.09, 0.62, 0.07).rotateX(lean * 0.5).translate(-0.05, 0.3, 0.1));
  // Cross arms: main one askew, second swinging loose
  wood.push(new THREE.BoxGeometry(1.9, 0.09, 0.09).rotateZ(-0.22).translate(0, 6.9, 0).rotateX(lean));
  wood.push(new THREE.BoxGeometry(1.5, 0.08, 0.08).rotateZ(1.18).translate(0.62, 5.9, 0).rotateX(lean));
  const woodMesh = new THREE.Mesh(mergeGeometries(wood), mat);
  woodMesh.castShadow = true; woodMesh.receiveShadow = true;
  g.add(woodMesh);
  // Insulators still riding the askew arm
  const insMat = flatMaterial(0x3b4a42, 0.5);
  const ins = [];
  for (const x of [-0.85, -0.3, 0.3]) {
    ins.push(new THREE.CylinderGeometry(0.035, 0.045, 0.12, 6)
      .translate(x * 0.98, 6.96 - 0.218 * x, 0).rotateX(lean));
  }
  const insMesh = new THREE.Mesh(mergeGeometries(ins), insMat);
  insMesh.castShadow = true;
  g.add(insMesh);
  g.add(contactShadow(0.6, 1.5, 0.35, 0, 0.6));
  g.userData.collider = { w: 0.35, h: 2.2, d: 0.35 };
  g.userData.topLocal = new THREE.Vector3(0, Math.cos(lean) * 7.4, Math.sin(lean) * 7.4);
  return g;
}

// --- Cluster of dumped cardboard boxes (market trash) --------------------------------
// Merged into a single mesh; small enough to walk over, so no collider.
export function cardboardCluster(seed = 5, n = 3) {
  const g = new THREE.Group();
  const r = makeRNG(seed * 811 + 7);
  const parts = [];
  for (let i = 0; i < n; i++) {
    const s = r.range(0.36, 0.6);
    const crushed = i === 0 && r.chance(0.4);
    const hh = s * (crushed ? r.range(0.22, 0.38) : r.range(0.7, 1.05));
    const bx = r.range(-0.6, 0.6), bz = r.range(-0.6, 0.6);
    const rot = r.range(0, Math.PI);
    parts.push(new THREE.BoxGeometry(s, hh, s * r.range(0.8, 1.2)).rotateY(rot).translate(bx, hh / 2, bz));
    if (!crushed) {
      // Open flaps folded outward from the top edges
      for (const sxx of [-1, 1]) {
        if (r.chance(0.25)) continue;
        parts.push(new THREE.BoxGeometry(s * 0.46, 0.016, s * 0.86)
          .translate(s * 0.23 * sxx, 0, 0)
          .rotateZ(sxx * -r.range(0.5, 1.15))
          .translate(sxx * s * 0.27, hh - 0.02, 0)
          .rotateY(rot)
          .translate(bx, 0, bz));
      }
    }
  }
  const m = new THREE.Mesh(mergeGeometries(parts), cardboardMaterial());
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  g.add(contactShadow(1.6, 1.6, 0.3));
  return g;
}

// --- String of small flags / cloth scraps between facades ------------------------
export function flagLine(from, to, seed = 3, sag = 0.9) {
  const g = new THREE.Group();
  const r = makeRNG(seed * 313);
  const mid = from.clone().add(to).multiplyScalar(0.5);
  mid.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const line = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 16, 0.008, 4),
    new THREE.MeshStandardMaterial({ color: 0x14120f, roughness: 0.8 })
  );
  line.castShadow = true;
  g.add(line);
  const cols = [0x8c3b2e, 0x3e6b63, 0xb8ab90, 0x7a6232, 0x5a6c8a];
  const n = 9 + r.int(0, 4);
  const flagGeo = new THREE.PlaneGeometry(0.3, 0.42);
  flagGeo.translate(0, -0.24, 0); // hang below the wire
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const p = curve.getPoint(t);
    const mat = new THREE.MeshStandardMaterial({
      color: cols[(i + seed) % cols.length], roughness: 0.95,
      side: THREE.DoubleSide, envMapIntensity: 0.4,
    });
    const f = new THREE.Mesh(flagGeo, mat);
    f.position.copy(p);
    const dir = curve.getTangent(t);
    f.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI / 2 + r.range(-0.25, 0.25);
    f.rotation.x = r.range(-0.12, 0.12);
    f.castShadow = true;
    g.add(f);
  }
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
  g.add(contactShadow(0.95, 0.95, 0.42));
  g.userData.collider = { w: 0.9, h: n * 0.25 + 0.15, d: 0.9 };
  return g;
}

// --- Rubble pile ------------------------------------------------------------------------
// Chunks merged per material (grey concrete / warm brickish) + merged rebar:
// 4 draw calls per pile instead of one mesh per chunk.
export function rubblePile(radius = 1.6, seed = 1) {
  const g = new THREE.Group();
  const mat = concreteMaterial(31, 0.76);
  const brickish = concreteMaterial(35, 0.62);
  const r = makeRNG(seed * 991);
  const n = Math.floor(radius * 9);
  const grey = [], warm = [];
  for (let i = 0; i < n; i++) {
    const s = r.range(0.14, 0.55) * radius * 0.5;
    const geo = new THREE.BoxGeometry(s, s * r.range(0.4, 0.8), s * r.range(0.6, 1.3));
    const isGrey = r.chance(0.7);
    const ang = r() * Math.PI * 2;
    const dist = Math.pow(r(), 0.6) * radius;
    const rx = r.range(-0.5, 0.5), ry = r() * Math.PI, rz = r.range(-0.5, 0.5);
    geo.rotateZ(rz); geo.rotateY(ry); geo.rotateX(rx);
    geo.translate(Math.cos(ang) * dist, s * 0.3 * (1 - dist / radius) + 0.05, Math.sin(ang) * dist);
    (isGrey ? grey : warm).push(geo);
  }
  for (const [geos, m2] of [[grey, mat], [warm, brickish]]) {
    if (!geos.length) continue;
    const m = new THREE.Mesh(mergeGeometries(geos), m2);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }
  // Rebar sticking out
  const rebarMat = new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 0.8, metalness: 0.6 });
  const bars = [];
  for (let i = 0; i < Math.floor(radius * 2); i++) {
    const len = r.range(0.6, 1.3);
    const bx = r.range(-radius * 0.5, radius * 0.5);
    const bz = r.range(-radius * 0.5, radius * 0.5);
    const rx = r.range(-0.9, 0.9), rz = r.range(-0.9, 0.9);
    bars.push(new THREE.CylinderGeometry(0.015, 0.015, len, 5).rotateZ(rz).rotateX(rx).translate(bx, 0.3, bz));
  }
  if (bars.length) {
    const bm = new THREE.Mesh(mergeGeometries(bars), rebarMat);
    bm.castShadow = true;
    g.add(bm);
  }
  g.add(contactShadow(radius * 1.7, radius * 1.7, 0.34));
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
  g.add(contactShadow(length, 0.5, 0.3));
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
  g.add(contactShadow(0.45, 0.45, 0.35));
  g.userData.collider = { w: 0.25, h: 6.4, d: 0.25 };
  return g;
}

// --- Market awning ----------------------------------------------------------------------------
// Pivot at the wall attachment edge; cloth extends toward local +z, sloping
// down. Rotate the group so +z points away from the wall face.
export function awning(width = 2.6, color = 0x8c3b2e) {
  const g = new THREE.Group();
  const clothMat = awningMaterial(color);
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
