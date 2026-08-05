// Kit-bash library: small reusable procedural components (bolts, cables,
// ladders, hydraulics, crates, generators, trucks, floodlights, barriers,
// antennas). Everything here is built from primitives and shared materials.
import * as THREE from 'three';
import { mats } from './materials.js';
import * as T from './textures.js';

const _v = new THREE.Vector3();

export function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function cyl(rt, rb, h, seg, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function sphere(r, material, x = 0, y = 0, z = 0, seg = 16) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg / 2)), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Rounded box via bevelled extrude-free approach (cheap chamfer look). */
export function chamferBox(w, h, d, material, bevel = 0.04) {
  const g = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    pos.setXYZ(
      i,
      x - Math.sign(x) * bevel * Math.min(w, 1),
      y - Math.sign(y) * bevel * Math.min(h, 1),
      z - Math.sign(z) * bevel * Math.min(d, 1),
    );
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Ring of bolt heads on a face - reads as machined hardware up close. */
export function boltRing(radius, count, material, boltR = 0.028) {
  const g = new THREE.CylinderGeometry(boltR, boltR * 1.1, boltR * 1.4, 6);
  const inst = new THREE.InstancedMesh(g, material, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    m.compose(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0), q, new THREE.Vector3(1, 1, 1));
    inst.setMatrixAt(i, m);
  }
  inst.castShadow = true;
  return inst;
}

/** Row of rivets along a line - used on launcher rails and shelter seams. */
export function rivetRow(length, count, material, r = 0.022) {
  const g = new THREE.SphereGeometry(r, 6, 4);
  const inst = new THREE.InstancedMesh(g, material, count);
  const m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    m.setPosition((i / (count - 1) - 0.5) * length, 0, 0);
    inst.setMatrixAt(i, m);
  }
  return inst;
}

/**
 * Sagging cable between two points. Optionally routed through mid points.
 * Uses a tube along a Catmull-Rom curve; cheap and reads beautifully.
 */
export function cable(from, to, {
  sag = 0.35,
  radius = 0.035,
  segments = 22,
  material = null,
  extra = [],
} = {}) {
  const a = from.clone();
  const b = to.clone();
  const pts = [a];
  const n = 3 + extra.length;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    pts.push(p);
  }
  for (const e of extra) pts.push(e.clone());
  pts.push(b);
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
  const g = new THREE.TubeGeometry(curve, segments, radius, 6, false);
  const m = new THREE.Mesh(g, material || mats().rubber);
  m.castShadow = true;
  return m;
}

/** Coiled cable loop lying on the ground next to equipment. */
export function cableCoil(radius = 0.5, turns = 3, material = null) {
  const pts = [];
  const steps = turns * 26;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * turns;
    const r = radius * (1 - t * 0.22);
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0.045 + t * 0.09, Math.sin(a) * r));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curve, steps, 0.032, 6, false);
  const m = new THREE.Mesh(g, material || mats().rubber);
  m.castShadow = true;
  return m;
}

/** Hydraulic ram: outer barrel + polished inner rod, extendable at runtime. */
export function hydraulicRam(length = 1.6, barrelR = 0.075) {
  const g = new THREE.Group();
  const M = mats();
  const barrel = cyl(barrelR, barrelR, length * 0.62, 12, M.darkMetal, 0, length * 0.31, 0);
  const rod = cyl(barrelR * 0.55, barrelR * 0.55, length * 0.6, 10, M.hydraulic, 0, length * 0.62, 0);
  const eyeA = new THREE.Mesh(new THREE.TorusGeometry(barrelR * 0.9, barrelR * 0.4, 6, 10), M.steel);
  eyeA.rotation.y = Math.PI / 2;
  const eyeB = eyeA.clone();
  eyeB.position.y = length * 0.92;
  g.add(barrel, rod, eyeA, eyeB);
  g.userData.rod = rod;
  g.userData.length = length;
  return g;
}

/** Ladder with rungs and side rails. */
export function ladder(height = 2.4, width = 0.42) {
  const g = new THREE.Group();
  const M = mats();
  const railGeo = new THREE.BoxGeometry(0.045, height, 0.055);
  for (const s of [-1, 1]) {
    const r = new THREE.Mesh(railGeo, M.galvanised);
    r.position.set(s * width * 0.5, height / 2, 0);
    r.castShadow = true;
    g.add(r);
  }
  const rungCount = Math.max(2, Math.floor(height / 0.3));
  const rungGeo = new THREE.CylinderGeometry(0.017, 0.017, width, 6);
  const inst = new THREE.InstancedMesh(rungGeo, M.galvanised, rungCount);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  for (let i = 0; i < rungCount; i++) {
    m.compose(new THREE.Vector3(0, 0.2 + i * 0.3, 0), q, new THREE.Vector3(1, 1, 1));
    inst.setMatrixAt(i, m);
  }
  inst.castShadow = true;
  g.add(inst);
  return g;
}

/** Handrail run along +X with stanchions. */
export function handrail(length = 3, height = 1.05) {
  const g = new THREE.Group();
  const M = mats();
  const top = cyl(0.026, 0.026, length, 8, M.galvanised);
  top.rotation.z = Math.PI / 2;
  top.position.y = height;
  const mid = top.clone();
  mid.position.y = height * 0.55;
  g.add(top, mid);
  const n = Math.max(2, Math.round(length / 1.1));
  for (let i = 0; i <= n; i++) {
    const p = cyl(0.024, 0.024, height, 6, M.galvanised, (i / n - 0.5) * length, height / 2, 0);
    g.add(p);
  }
  return g;
}

/** Grated walkway platform. */
export function grating(w, d) {
  const M = mats();
  const g = new THREE.Group();
  const plate = box(w, 0.04, d, M.darkMetal);
  g.add(plate);
  const barGeo = new THREE.BoxGeometry(w, 0.05, 0.02);
  const count = Math.max(2, Math.floor(d / 0.09));
  const inst = new THREE.InstancedMesh(barGeo, M.galvanised, count);
  const m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    m.setPosition(0, 0.03, (i / (count - 1) - 0.5) * d);
    inst.setMatrixAt(i, m);
  }
  inst.castShadow = true;
  g.add(inst);
  return g;
}

/** Pelican-style equipment case. */
export function equipmentCase(w = 0.8, h = 0.42, d = 0.55, tint = null) {
  const M = mats();
  const g = new THREE.Group();
  const body = chamferBox(w, h, d, tint || M.olivePlain, 0.05);
  body.position.y = h / 2;
  g.add(body);
  const lid = chamferBox(w * 1.02, 0.05, d * 1.02, M.blackMetal, 0.05);
  lid.position.y = h - 0.01;
  g.add(lid);
  for (const s of [-1, 1]) {
    const latch = box(0.09, 0.06, 0.03, M.steel, s * w * 0.3, h * 0.72, d / 2 + 0.01);
    g.add(latch);
  }
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.016, 5, 10, Math.PI), M.blackMetal);
  handle.rotation.set(Math.PI / 2, 0, 0);
  handle.position.set(0, h + 0.02, 0);
  g.add(handle);
  return g;
}

/** Stack of crates with stencils. */
export function crateStack(rng) {
  const M = mats();
  const g = new THREE.Group();
  const n = 2 + Math.floor(rng.float() * 3);
  let y = 0;
  for (let i = 0; i < n; i++) {
    const w = 1.1 + rng.float() * 0.5;
    const h = 0.42 + rng.float() * 0.2;
    const d = 0.7 + rng.float() * 0.3;
    const c = chamferBox(w, h, d, rng.bool(0.6) ? M.olivePlain : M.sandPlain, 0.03);
    c.position.set((rng.float() - 0.5) * 0.16, y + h / 2, (rng.float() - 0.5) * 0.16);
    c.rotation.y = (rng.float() - 0.5) * 0.12;
    g.add(c);
    // banding straps
    for (const s of [-0.28, 0.28]) {
      const strap = box(w * 1.01, h * 0.12, d * 1.01, M.blackMetal, c.position.x, y + h / 2 + s * h, c.position.z);
      strap.rotation.y = c.rotation.y;
      g.add(strap);
    }
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.7, h * 0.5),
      new THREE.MeshBasicMaterial({ map: T.stencil(rng.pick(['MK-4', 'AGL-2', 'FCU', 'SPARES', 'CBL-7']), { w: 256, h: 96 }), transparent: true }),
    );
    label.position.set(c.position.x, y + h * 0.55, c.position.z + d / 2 + 0.012);
    label.rotation.y = c.rotation.y;
    g.add(label);
    y += h;
  }
  return g;
}

/** Diesel generator set with radiator grille, exhaust and status panel. */
export function generator(rng, { scale = 1 } = {}) {
  const M = mats();
  const g = new THREE.Group();
  const w = 2.6 * scale;
  const h = 1.5 * scale;
  const d = 1.3 * scale;

  const skid = box(w + 0.16, 0.16, d + 0.14, M.darkMetal, 0, 0.08, 0);
  g.add(skid);
  const body = chamferBox(w, h, d, M.corrugated, 0.03);
  body.position.y = 0.16 + h / 2;
  g.add(body);

  // radiator grille
  const grilleGroup = new THREE.Group();
  const slat = new THREE.BoxGeometry(0.06, h * 0.62, d * 0.86);
  const slats = new THREE.InstancedMesh(slat, M.blackMetal, 9);
  const mm = new THREE.Matrix4();
  for (let i = 0; i < 9; i++) {
    mm.setPosition(0, 0, 0);
    mm.makeRotationX(0.35);
    mm.setPosition((i - 4) * 0.075, 0, 0);
    slats.setMatrixAt(i, mm);
  }
  grilleGroup.add(slats);
  grilleGroup.position.set(-w / 2 + 0.06, 0.16 + h * 0.55, 0);
  g.add(grilleGroup);

  // exhaust stack with heat discolouration
  const stack = cyl(0.085, 0.1, h * 0.85, 10, M.heatSteel, w * 0.32, 0.16 + h + h * 0.4, -d * 0.3);
  g.add(stack);
  const cap = cyl(0.11, 0.11, 0.05, 10, M.blackMetal, w * 0.32, 0.16 + h + h * 0.85, -d * 0.3);
  g.add(cap);

  // control panel with LEDs
  const panel = box(0.5 * scale, 0.42 * scale, 0.06, M.panelGrey, w * 0.2, 0.16 + h * 0.62, d / 2 + 0.02);
  g.add(panel);
  const leds = [];
  for (let i = 0; i < 3; i++) {
    const led = cyl(0.022, 0.022, 0.02, 8, [M.ledGreen, M.ledAmber, M.ledRed][i], w * 0.2 - 0.14 + i * 0.14, 0.16 + h * 0.72, d / 2 + 0.055);
    led.rotation.x = Math.PI / 2;
    g.add(led);
    leds.push(led);
  }
  // fuel drum + line
  const drum = cyl(0.29 * scale, 0.29 * scale, 0.82 * scale, 14, M.rusted, w * 0.5 + 0.4, 0.41 * scale, d * 0.35);
  g.add(drum);
  for (let i = 0; i < 3; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.295 * scale, 0.018, 5, 14), M.darkMetal);
    rib.rotation.x = Math.PI / 2;
    rib.position.set(drum.position.x, 0.16 + i * 0.26 * scale, drum.position.z);
    g.add(rib);
  }
  g.add(cable(
    new THREE.Vector3(drum.position.x, 0.7 * scale, drum.position.z),
    new THREE.Vector3(w / 2 - 0.1, 0.5 * scale, d * 0.2),
    { sag: 0.18, radius: 0.024 },
  ));
  g.userData.leds = leds;
  g.userData.footprint = { w: w + 0.9, d: d + 0.3 };
  return g;
}

/** Antenna mast with cross members, dipoles and guy wires. */
export function antennaMast(height = 9, { dish = false, rng = null } = {}) {
  const M = mats();
  const g = new THREE.Group();
  const legR = 0.045;
  const spread = 0.32;
  const legs = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = cyl(legR, legR, height, 6, M.galvanised, Math.cos(a) * spread, height / 2, Math.sin(a) * spread);
    legs.push(leg);
    g.add(leg);
  }
  // lattice cross braces
  const braceGeo = new THREE.CylinderGeometry(0.016, 0.016, spread * 1.9, 5);
  const rows = Math.floor(height / 0.7);
  const inst = new THREE.InstancedMesh(braceGeo, M.galvanised, rows * 3);
  const m = new THREE.Matrix4();
  let k = 0;
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < 3; i++) {
      const a0 = (i / 3) * Math.PI * 2;
      const a1 = ((i + 1) / 3) * Math.PI * 2;
      const p0 = new THREE.Vector3(Math.cos(a0) * spread, 0.35 + r * 0.7, Math.sin(a0) * spread);
      const p1 = new THREE.Vector3(Math.cos(a1) * spread, 0.35 + r * 0.7 + 0.35, Math.sin(a1) * spread);
      const mid = p0.clone().add(p1).multiplyScalar(0.5);
      const dir = p1.clone().sub(p0);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      m.compose(mid, q, new THREE.Vector3(1, dir.length() / (spread * 1.9), 1));
      inst.setMatrixAt(k++, m);
    }
  }
  inst.castShadow = true;
  g.add(inst);

  // top hardware
  const whip = cyl(0.012, 0.02, 2.2, 5, M.steel, 0, height + 1.1, 0);
  g.add(whip);
  const beacon = sphere(0.075, M.ledRed, 0, height + 2.24, 0, 10);
  g.add(beacon);
  g.userData.beacon = beacon;

  for (let i = 0; i < 2; i++) {
    const yagi = new THREE.Group();
    const boom = cyl(0.02, 0.02, 1.3, 5, M.steel);
    boom.rotation.z = Math.PI / 2;
    yagi.add(boom);
    for (let e = 0; e < 6; e++) {
      const el = cyl(0.011, 0.011, 0.85 - e * 0.07, 5, M.steel, -0.6 + e * 0.22, 0, 0);
      yagi.add(el);
    }
    yagi.position.set(0, height * (0.62 + i * 0.22), 0);
    yagi.rotation.y = i * 1.1;
    g.add(yagi);
  }

  if (dish) {
    const d = new THREE.Group();
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), M.panelWhite);
    bowl.rotation.x = -Math.PI / 2 + 0.2;
    bowl.castShadow = true;
    d.add(bowl);
    const feed = cyl(0.03, 0.03, 0.6, 6, M.steel, 0, 0, 0.3);
    feed.rotation.x = Math.PI / 2;
    d.add(feed);
    d.add(sphere(0.07, M.blackMetal, 0, 0, 0.6, 8));
    d.position.set(0.55, height * 0.8, 0);
    d.rotation.y = -0.6;
    g.add(d);
    g.userData.dish = d;
  }

  // guy wires
  if (rng) {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      g.add(cable(
        new THREE.Vector3(0, height * 0.88, 0),
        new THREE.Vector3(Math.cos(a) * height * 0.42, 0.05, Math.sin(a) * height * 0.42),
        { sag: 0.25, radius: 0.014, material: mats().steel },
      ));
    }
  }
  g.userData.footprint = { r: 0.55 };
  return g;
}

/** Floodlight mast: 4 lamp heads on a crossbar, tilt-adjustable. */
export function floodlightMast(height = 7.5) {
  const M = mats();
  const g = new THREE.Group();
  const base = box(0.9, 0.22, 0.9, M.concreteDark, 0, 0.11, 0);
  g.add(base);
  const pole = cyl(0.09, 0.13, height, 10, M.galvanised, 0, height / 2 + 0.2, 0);
  g.add(pole);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const stay = cyl(0.03, 0.03, 1.5, 5, M.galvanised);
    stay.position.set(Math.cos(a) * 0.32, 0.9, Math.sin(a) * 0.32);
    stay.rotation.set(Math.sin(a) * 0.42, 0, -Math.cos(a) * 0.42);
    g.add(stay);
  }
  const head = new THREE.Group();
  head.position.y = height + 0.2;
  const bar = box(2.5, 0.11, 0.11, M.darkMetal);
  head.add(bar);
  const lamps = [];
  for (let i = 0; i < 4; i++) {
    const lx = (i - 1.5) * 0.62;
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.3, 12), M.darkMetal);
    housing.rotation.x = Math.PI / 2 + 0.62;
    housing.position.set(lx, -0.16, 0.06);
    housing.castShadow = true;
    head.add(housing);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.26, 14), M.lampGlassOff);
    lens.position.set(lx, -0.3, 0.2);
    lens.rotation.x = -Math.PI / 2 - 0.62 + Math.PI;
    head.add(lens);
    lamps.push(lens);
  }
  g.add(head);
  g.userData.lamps = lamps;
  g.userData.head = head;
  g.userData.height = height;
  return g;
}

/** Jersey concrete barrier. */
export function jerseyBarrier(length = 3) {
  const M = mats();
  const shape = new THREE.Shape();
  shape.moveTo(-0.32, 0);
  shape.lineTo(0.32, 0);
  shape.lineTo(0.22, 0.16);
  shape.lineTo(0.1, 0.62);
  shape.lineTo(0.1, 0.95);
  shape.lineTo(-0.1, 0.95);
  shape.lineTo(-0.1, 0.62);
  shape.lineTo(-0.22, 0.16);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 });
  g.translate(0, 0, -length / 2);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, M.concreteDark);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** HESCO-style gabion wall segment. */
export function gabionWall(length = 4, height = 1.4) {
  const M = mats();
  const g = new THREE.Group();
  const cells = Math.max(1, Math.round(length / 1.1));
  for (let i = 0; i < cells; i++) {
    const w = length / cells;
    const cell = box(w * 0.98, height, 1.05, M.sandbag, (i - (cells - 1) / 2) * w, height / 2, 0);
    g.add(cell);
    // wire mesh cage edges
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.99, height * 1.01, 1.06),
      new THREE.MeshStandardMaterial({ color: 0x6a6f68, roughness: 0.6, metalness: 0.7, wireframe: true }),
    );
    edge.position.copy(cell.position);
    g.add(edge);
  }
  return g;
}

/** Sandbag revetment ring (stacked rows, slightly randomised). */
export function sandbagRing(rng, radiusX = 4, radiusZ = 3, rows = 3) {
  const M = mats();
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(0.3, 8, 6);
  geo.scale(1.35, 0.62, 0.9);
  let total = 0;
  const layout = [];
  for (let r = 0; r < rows; r++) {
    const count = Math.round((2 * Math.PI * ((radiusX + radiusZ) / 2)) / 0.62);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + r * 0.14;
      layout.push({ a, r, rx: radiusX - r * 0.09, rz: radiusZ - r * 0.09 });
      total++;
    }
  }
  const inst = new THREE.InstancedMesh(geo, M.sandbag, total);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  let k = 0;
  for (const l of layout) {
    const x = Math.cos(l.a) * l.rx;
    const z = Math.sin(l.a) * l.rz;
    e.set((rng.float() - 0.5) * 0.2, -l.a + (rng.float() - 0.5) * 0.2, (rng.float() - 0.5) * 0.16);
    q.setFromEuler(e);
    m.compose(
      new THREE.Vector3(x, 0.19 + l.r * 0.35, z),
      q,
      new THREE.Vector3(0.95 + rng.float() * 0.16, 0.95 + rng.float() * 0.12, 0.95 + rng.float() * 0.16),
    );
    inst.setMatrixAt(k++, m);
  }
  inst.castShadow = true;
  inst.receiveShadow = true;
  g.add(inst);
  return g;
}

/** Chain-link fence run along +X with posts, top rail and barbed wire. */
export function fenceRun(length, { height = 2.6, postEvery = 3 } = {}) {
  const M = mats();
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(length, height), M.chainLink.clone());
  mesh.material.map = M.chainLink.map.clone();
  mesh.material.map.wrapS = mesh.material.map.wrapT = THREE.RepeatWrapping;
  mesh.material.map.repeat.set(length / 1.2, height / 1.2);
  mesh.material.map.needsUpdate = true;
  mesh.position.y = height / 2;
  g.add(mesh);
  const rail = cyl(0.032, 0.032, length, 6, M.galvanised, 0, height - 0.06, 0);
  rail.rotation.z = Math.PI / 2;
  g.add(rail);
  const n = Math.max(2, Math.round(length / postEvery));
  for (let i = 0; i <= n; i++) {
    const p = cyl(0.055, 0.06, height + 0.35, 7, M.galvanised, (i / n - 0.5) * length, (height + 0.35) / 2, 0);
    g.add(p);
    // barbed-wire arm
    const arm = cyl(0.024, 0.024, 0.4, 5, M.galvanised, (i / n - 0.5) * length, height + 0.28, 0.1);
    arm.rotation.x = 0.7;
    g.add(arm);
  }
  for (let w = 0; w < 3; w++) {
    const wire = cyl(0.012, 0.012, length, 4, M.steel, 0, height + 0.2 + w * 0.11, 0.06 + w * 0.05);
    wire.rotation.z = Math.PI / 2;
    g.add(wire);
  }
  return g;
}

/** Heavy support truck (cab + cargo bed + tarp option). */
export function supportTruck(rng, { tarp = true, color = null } = {}) {
  const M = mats();
  const g = new THREE.Group();
  const paint = color || (rng.bool(0.5) ? M.panelOlive : M.panelSand);

  const chassis = box(2.4, 0.26, 7.4, M.darkMetal, 0, 0.82, 0);
  g.add(chassis);

  // cab
  const cab = chamferBox(2.42, 1.6, 2.3, paint, 0.04);
  cab.position.set(0, 1.72, 2.3);
  g.add(cab);
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.95), M.darkGlass);
  windshield.position.set(0, 2.02, 3.44);
  windshield.rotation.x = -0.16;
  g.add(windshield);
  for (const s of [-1, 1]) {
    const sideWin = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), M.darkGlass);
    sideWin.position.set(s * 1.22, 2.0, 2.5);
    sideWin.rotation.y = s * Math.PI / 2;
    g.add(sideWin);
  }
  const bumper = box(2.5, 0.28, 0.28, M.darkMetal, 0, 0.9, 3.62);
  g.add(bumper);
  const grille = box(1.7, 0.7, 0.1, M.blackMetal, 0, 1.35, 3.5);
  g.add(grille);
  for (const s of [-1, 1]) {
    const lamp = cyl(0.16, 0.16, 0.1, 12, M.lampGlassOff, s * 0.95, 1.42, 3.52);
    lamp.rotation.x = Math.PI / 2;
    g.add(lamp);
  }
  // cargo bed
  const bed = box(2.4, 0.9, 4.3, paint, 0, 1.4, -1.6);
  g.add(bed);
  if (tarp) {
    const hoop = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 4.3, 14, 1, true, 0, Math.PI),
      M.canvasTarp,
    );
    hoop.rotation.set(Math.PI / 2, 0, 0);
    hoop.position.set(0, 1.85, -1.6);
    hoop.castShadow = true;
    hoop.receiveShadow = true;
    g.add(hoop);
    const rear = new THREE.Mesh(new THREE.CircleGeometry(1.2, 14, 0, Math.PI), M.canvasTarp);
    rear.position.set(0, 1.85, -3.75);
    rear.rotation.z = 0;
    g.add(rear);
  } else {
    for (let i = 0; i < 3; i++) g.add(equipmentCase(0.9, 0.5, 0.7, M.olivePlain).translateX((i - 1) * 0.75).translateY(1.85).translateZ(-1.6));
  }
  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.42, 16);
  const hubGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.44, 10);
  const positions = [[-1.22, 2.35], [1.22, 2.35], [-1.22, -0.9], [1.22, -0.9], [-1.22, -2.35], [1.22, -2.35]];
  for (const [x, z] of positions) {
    const w = new THREE.Mesh(wheelGeo, M.rubber);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.62, z);
    w.castShadow = true;
    g.add(w);
    const h = new THREE.Mesh(hubGeo, M.steel);
    h.rotation.z = Math.PI / 2;
    h.position.set(x * 1.02, 0.62, z);
    g.add(h);
  }
  // exhaust + mirrors + antenna
  const ex = cyl(0.06, 0.07, 1.5, 8, M.heatSteel, 1.3, 2.3, 1.6);
  g.add(ex);
  for (const s of [-1, 1]) {
    const arm = cyl(0.02, 0.02, 0.5, 5, M.blackMetal, s * 1.45, 2.3, 3.0);
    arm.rotation.z = Math.PI / 2;
    g.add(arm);
    const mirror = box(0.06, 0.3, 0.16, M.blackMetal, s * 1.7, 2.3, 3.0);
    g.add(mirror);
  }
  const ant = cyl(0.01, 0.014, 2.2, 4, M.blackMetal, -1.2, 3.0, 2.6);
  g.add(ant);
  g.userData.footprint = { w: 2.7, d: 7.6, h: 3.1 };
  return g;
}

/** Small utility 4x4 (lighter silhouette variety). */
export function utilityTruck(rng) {
  const M = mats();
  const g = new THREE.Group();
  const paint = rng.bool(0.5) ? M.panelOlive : M.panelSand;
  const body = chamferBox(2.0, 1.05, 4.6, paint, 0.05);
  body.position.y = 1.15;
  g.add(body);
  const cab = chamferBox(1.9, 0.85, 1.9, paint, 0.05);
  cab.position.set(0, 2.0, 0.5);
  g.add(cab);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.62), M.darkGlass);
  glass.position.set(0, 2.05, 1.47);
  glass.rotation.x = -0.12;
  g.add(glass);
  const bed = box(1.9, 0.5, 1.9, M.darkMetal, 0, 1.6, -1.4);
  g.add(bed);
  const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.32, 14);
  for (const [x, z] of [[-1.0, 1.5], [1.0, 1.5], [-1.0, -1.5], [1.0, -1.5]]) {
    const w = new THREE.Mesh(wheelGeo, M.rubber);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.46, z);
    w.castShadow = true;
    g.add(w);
  }
  const bar = cyl(0.04, 0.04, 1.6, 6, M.blackMetal, 0, 2.5, 0.4);
  bar.rotation.z = Math.PI / 2;
  g.add(bar);
  for (let i = 0; i < 3; i++) {
    const l = cyl(0.11, 0.11, 0.08, 10, M.lampGlassOff, (i - 1) * 0.45, 2.5, 0.48);
    l.rotation.x = Math.PI / 2;
    g.add(l);
  }
  g.userData.footprint = { w: 2.2, d: 4.8, h: 2.6 };
  return g;
}

/** Rotating warning beacon (returns object with update(t)). */
export function warningBeacon(color = 0xffb029) {
  const M = mats();
  const g = new THREE.Group();
  const base = cyl(0.09, 0.11, 0.07, 10, M.darkMetal);
  g.add(base);
  const domeMat = new THREE.MeshPhysicalMaterial({
    color, emissive: color, emissiveIntensity: 1.2, transparent: true, opacity: 0.6, roughness: 0.25,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), domeMat);
  dome.position.y = 0.06;
  g.add(dome);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.1), new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
  inner.position.y = 0.1;
  g.add(inner);
  g.userData.rotor = inner;
  g.userData.dome = domeMat;
  return g;
}

/** Pipe / conduit run with elbows along a polyline. */
export function conduit(points, radius = 0.05, material = null) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => p.clone()), false, 'catmullrom', 0.05);
  const g = new THREE.TubeGeometry(curve, Math.max(8, points.length * 6), radius, 8, false);
  const m = new THREE.Mesh(g, material || mats().galvanised);
  m.castShadow = true;
  return m;
}

/** Text plate that can be bolted to equipment. */
export function labelPlate(text, w = 0.6, h = 0.18, color = '#dfe4d8') {
  const mat = new THREE.MeshStandardMaterial({
    map: T.stencil(text, { w: 512, h: 128, color, font: 'bold 64px "Arial Narrow", Impact, sans-serif', wear: 0.2 }),
    transparent: true,
    roughness: 0.7,
    metalness: 0.1,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return m;
}

export { _v };
