import * as THREE from 'three';
import type { LevelSystem } from './Level';
import { scaleBoxUV, applyCylinderUV } from './Level';
import type { RNG } from '../render/Noise';

/**
 * Set dressing and cover props.
 *
 * Everything here is placed against the authored street layout rather than
 * scattered randomly: sandbag emplacements sit at the ends of long sightlines,
 * market stalls break up the main street into fightable pockets, and burnt-out
 * vehicles provide the hard cover that anchors each engagement.
 */

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const s = new THREE.Vector3(1, 1, 1);
const p = new THREE.Vector3();
const yAxis = new THREE.Vector3(0, 1, 0);

function place(level: LevelSystem, key: Parameters<LevelSystem['box']>[0], geo: THREE.BufferGeometry, x: number, y: number, z: number, rot = 0): void {
  q.setFromAxisAngle(yAxis, rot);
  m.compose(p.set(x, y, z), q, s);
  level.push(key, geo, m);
}

export function buildProps(level: LevelSystem, rng: RNG): void {
  buildSandbags(level, rng);
  buildBarriers(level, rng);
  buildCrates(level, rng);
  buildBarrels(level, rng);
  buildMarketStalls(level, rng);
  buildVehicles(level, rng);
  buildPalms(level, rng);
  buildDebris(level, rng);
  buildStreetFurniture(level, rng);
}

// ------------------------------------------------------------- sandbags ----

function sandbagGeometry(w: number, h: number, d: number): THREE.BufferGeometry {
  // A squashed, slightly irregular sphere reads as a filled bag far better
  // than a rounded box, and costs the same at this vertex count.
  const geo = new THREE.SphereGeometry(0.5, 10, 6);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Flatten top and bottom where the bag is compressed by its neighbours.
    const flat = 1 - Math.pow(Math.abs(y * 2), 3) * 0.25;
    pos.setXYZ(i, x * w * 2 * flat, y * h * 2, z * d * 2 * flat);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function buildSandbags(level: LevelSystem, rng: RNG): void {
  const emplacements: Array<[number, number, number, number]> = [
    [-9.5, -16, 0, 6],
    [9.5, -16, 0, 6],
    [0, -34, Math.PI / 2, 5],
    [-13, 12, Math.PI / 2, 4],
    [13, 18, Math.PI / 2, 4],
    [0, 24, 0, 7],
    [-32, -2, 0, 4],
    [32, 6, 0, 4],
  ];

  const bag = sandbagGeometry(0.46, 0.17, 0.26);

  for (const [x, z, rot, len] of emplacements) {
    const rows = 4;
    for (let r = 0; r < rows; r++) {
      const y = 0.16 + r * 0.28;
      const inset = r * 0.05;
      const count = len - Math.floor(r * 0.4);
      for (let i = 0; i < count; i++) {
        const off = (i - (count - 1) / 2) * 0.52 + (r % 2) * 0.26;
        const lx = Math.cos(rot) * off;
        const lz = -Math.sin(rot) * off;
        const jitterRot = rot + rng.range(-0.12, 0.12);
        q.setFromAxisAngle(yAxis, jitterRot);
        q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rng.range(-0.08, 0.08)));
        m.compose(
          p.set(x + lx + rng.range(-0.03, 0.03), y, z + lz + inset * Math.sin(rot)),
          q,
          s.set(rng.range(0.92, 1.08), 1, rng.range(0.92, 1.08)),
        );
        level.push('fabricSandbag', bag, m);
      }
    }
    s.set(1, 1, 1);
  }
  bag.dispose();
}

// ------------------------------------------------------------- barriers ----

function buildBarriers(level: LevelSystem, rng: RNG): void {
  // Jersey barriers: trapezoid profile extruded along the road.
  const shape = new THREE.Shape();
  shape.moveTo(-0.3, 0);
  shape.lineTo(0.3, 0);
  shape.lineTo(0.19, 0.24);
  shape.lineTo(0.11, 0.95);
  shape.lineTo(-0.11, 0.95);
  shape.lineTo(-0.19, 0.24);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.0, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -1.0);
  geo.computeVertexNormals();
  scaleUVFromPosition(geo, 1.5);

  const rows: Array<[number, number, number, number]> = [
    [-6.6, -30, 0, 4],
    [6.6, -30, 0, 4],
    [0, 34, Math.PI / 2, 5],
    [-20, -14, Math.PI / 2, 3],
    [20, -14, Math.PI / 2, 3],
  ];

  for (const [x, z, rot, count] of rows) {
    for (let i = 0; i < count; i++) {
      const off = (i - (count - 1) / 2) * 2.06;
      const lx = Math.cos(rot) * off;
      const lz = -Math.sin(rot) * off;
      const knocked = rng.next() < 0.16;
      q.setFromAxisAngle(yAxis, rot + rng.range(-0.05, 0.05));
      if (knocked) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), rng.range(0.9, 1.4)));
      m.compose(p.set(x + lx, knocked ? 0.3 : 0.02, z + lz), q, s);
      level.push('concrete', geo, m);
    }
  }
  geo.dispose();
}

// --------------------------------------------------------------- crates ----

function buildCrates(level: LevelSystem, rng: RNG): void {
  const clusters: Array<[number, number]> = [
    [-11, -8], [11, -6], [-16, 20], [17, 22], [-30, 30], [30, -30],
    [4, -40], [-4, 12], [-36, -16], [36, 16], [0, 6], [-24, 44],
  ];

  for (const [cx, cz] of clusters) {
    const count = rng.int(2, 6);
    const stack: Array<[number, number, number]> = [];
    for (let i = 0; i < count; i++) {
      const size = rng.range(0.55, 1.0);
      let x = cx + rng.range(-1.4, 1.4);
      let z = cz + rng.range(-1.4, 1.4);
      let y = size / 2;
      // Try to stack on an existing crate.
      if (i > 0 && rng.next() < 0.45) {
        const base = stack[rng.int(0, stack.length - 1)];
        x = base[0] + rng.range(-0.15, 0.15);
        z = base[2] + rng.range(-0.15, 0.15);
        y = base[1] + size;
      }
      stack.push([x, y, z]);

      const geo = new THREE.BoxGeometry(size, size, size);
      scaleBoxUV(geo, size, size, size, 1.1);
      place(level, rng.next() < 0.75 ? 'woodCrate' : 'paintedMetalGreen', geo, x, y, z, rng.range(0, Math.PI * 2));
      geo.dispose();

      // Batten frame on wooden crates.
      if (rng.next() < 0.6) {
        const t = 0.05;
        for (const [ox, oy, oz, bw, bh, bd] of [
          [0, size / 2 - t / 2, 0, size + 0.01, t, size + 0.01],
          [0, -size / 2 + t / 2, 0, size + 0.01, t, size + 0.01],
        ] as Array<[number, number, number, number, number, number]>) {
          const b = new THREE.BoxGeometry(bw, bh, bd);
          scaleBoxUV(b, bw, bh, bd, 1.1);
          place(level, 'wood', b, x + ox, y + oy, z + oz);
          b.dispose();
        }
      }
    }
  }
}

// -------------------------------------------------------------- barrels ----

function buildBarrels(level: LevelSystem, rng: RNG): void {
  const spots: Array<[number, number]> = [
    [-10, 2], [10, 8], [-19, -26], [19, -28], [-28, 12], [28, 18],
    [2, 30], [-6, -22], [7, -12], [-40, 4], [40, -2], [14, 42],
  ];

  const geo = new THREE.CylinderGeometry(0.29, 0.29, 0.88, 18, 1);
  applyCylinderUV(geo, 0.29, 0.88, 1.2);
  // Rolling hoops.
  const hoop = new THREE.TorusGeometry(0.295, 0.022, 6, 20);
  hoop.rotateX(Math.PI / 2);

  for (const [cx, cz] of spots) {
    const count = rng.int(1, 4);
    for (let i = 0; i < count; i++) {
      const x = cx + rng.range(-0.9, 0.9);
      const z = cz + rng.range(-0.9, 0.9);
      const tipped = rng.next() < 0.2;
      const key = rng.next() < 0.45 ? 'paintedMetalRed' : rng.next() < 0.6 ? 'paintedMetalGreen' : 'paintedMetalTan';
      if (tipped) {
        q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        q.premultiply(new THREE.Quaternion().setFromAxisAngle(yAxis, rng.range(0, Math.PI * 2)));
        m.compose(p.set(x, 0.29, z), q, s);
      } else {
        q.setFromAxisAngle(yAxis, rng.range(0, Math.PI * 2));
        m.compose(p.set(x, 0.44, z), q, s);
      }
      level.push(key, geo, m);
      for (const hy of [-0.22, 0.22]) {
        const hm = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, hy, 0));
        level.push(key, hoop, hm);
      }
    }
  }
  geo.dispose();
  hoop.dispose();
}

// -------------------------------------------------------- market stalls ----

function buildMarketStalls(level: LevelSystem, rng: RNG): void {
  const stalls: Array<[number, number, number]> = [
    [-6.2, 16, 0], [6.2, 12, Math.PI], [-6.2, 4, 0], [6.2, -2, Math.PI],
    [-6.2, 28, 0], [6.2, 26, Math.PI], [-6.2, -6, 0],
  ];

  for (const [x, z, rot] of stalls) {
    const w = rng.range(2.2, 3.0);
    const d = rng.range(1.5, 2.0);
    const hgt = 2.2;

    // Posts
    for (const [ox, oz] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) {
      const post = new THREE.BoxGeometry(0.08, hgt, 0.08);
      scaleBoxUV(post, 0.08, hgt, 0.08, 0.8);
      const c = Math.cos(rot);
      const sn = Math.sin(rot);
      place(level, 'wood', post, x + ox * c - oz * sn, hgt / 2, z + ox * sn + oz * c, rot);
      post.dispose();
    }

    // Canopy: a shallow catenary sag makes cloth read as cloth.
    const canopy = new THREE.PlaneGeometry(w + 0.5, d + 0.5, 8, 6);
    const cp = canopy.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < cp.count; i++) {
      const u = cp.getX(i) / (w + 0.5);
      const v = cp.getY(i) / (d + 0.5);
      // Clamp before the fractional power: floating-point error at the plane
      // edge makes the base fractionally negative, and a negative base with a
      // fractional exponent is NaN, which then poisons the merged batch.
      const su = Math.max(0, 1 - Math.abs(u * 2));
      const sv = Math.max(0, 1 - Math.abs(v * 2));
      cp.setZ(i, -(0.28 * su * Math.pow(sv, 0.6)));
    }
    cp.needsUpdate = true;
    canopy.computeVertexNormals();
    canopy.rotateX(-Math.PI / 2);
    scaleUVFromPosition(canopy, 2.5);
    q.setFromAxisAngle(yAxis, rot);
    m.compose(p.set(x, hgt, z), q, s);
    level.push('fabricTarp', canopy, m);
    canopy.dispose();

    // Counter
    const counter = new THREE.BoxGeometry(w, 0.08, d * 0.7);
    scaleBoxUV(counter, w, 0.08, d * 0.7, 2.2);
    place(level, 'wood', counter, x, 0.92, z, rot);
    counter.dispose();

    const legPanel = new THREE.BoxGeometry(w, 0.9, 0.06);
    scaleBoxUV(legPanel, w, 0.9, 0.06, 2.2);
    place(level, 'wood', legPanel, x - Math.sin(rot) * (d * 0.35), 0.45, z - Math.cos(rot) * (d * 0.35), rot);
    legPanel.dispose();

    // Goods on the counter.
    for (let i = 0; i < rng.int(2, 5); i++) {
      const bs = rng.range(0.12, 0.26);
      const bx = x + rng.range(-w / 2 + 0.2, w / 2 - 0.2);
      const bz = z + rng.range(-d * 0.25, d * 0.25);
      const g = new THREE.BoxGeometry(bs, bs * 0.7, bs);
      scaleBoxUV(g, bs, bs * 0.7, bs, 0.5);
      place(level, rng.next() < 0.5 ? 'woodCrate' : 'fabricSandbag', g, bx, 0.96 + bs * 0.35, bz, rng.range(0, 3));
      g.dispose();
    }
  }
}

// ------------------------------------------------------------- vehicles ----

function buildVehicles(level: LevelSystem, rng: RNG): void {
  const spots: Array<[number, number, number, number]> = [
    [-4.5, -8, 0.2, 0],
    [5.2, 20, 3.0, 1],
    [-30, -34, 1.2, 0],
    [33, 36, 2.1, 1],
    [-3, 36, 0.1, 0],
  ];

  for (const [x, z, rot, kind] of spots) {
    if (kind === 0) buildBurntCar(level, x, z, rot, rng);
    else buildTruck(level, x, z, rot, rng);
  }
}

function buildBurntCar(level: LevelSystem, x: number, z: number, rot: number, rng: RNG): void {
  const parts: Array<[number, number, number, number, number, number]> = [
    // [w, h, d, ox, oy, oz]
    [1.72, 0.52, 4.0, 0, 0.55, 0],       // body
    [1.6, 0.46, 1.9, 0, 1.02, -0.15],    // cabin
    [1.68, 0.12, 1.1, 0, 0.86, 1.6],     // bonnet
    [1.68, 0.12, 0.9, 0, 0.86, -1.75],   // boot
  ];
  for (const [w, h, d, ox, oy, oz] of parts) {
    const g = new THREE.BoxGeometry(w, h, d);
    scaleBoxUV(g, w, h, d, 1.8);
    place(level, 'paintedMetalRed', g, x + ox, oy, z + oz, rot);
    g.dispose();
  }

  // Wheels — some burnt off their rims.
  const wheel = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 14);
  wheel.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-0.82, 1.3], [0.82, 1.3], [-0.82, -1.3], [0.82, -1.3]]) {
    if (rng.next() < 0.25) continue;
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    q.setFromAxisAngle(yAxis, rot);
    m.compose(p.set(x + wx * c - wz * sn, 0.3, z + wx * sn + wz * c), q, s);
    level.push('polymerBlack', wheel, m);
  }
  wheel.dispose();
}

function buildTruck(level: LevelSystem, x: number, z: number, rot: number, rng: RNG): void {
  const parts: Array<[Parameters<LevelSystem['box']>[0], number, number, number, number, number, number]> = [
    ['paintedMetalTan', 2.2, 0.7, 5.6, 0, 0.85, 0],
    ['paintedMetalTan', 2.1, 1.4, 1.9, 0, 1.6, 1.9],
    ['corrugated', 2.3, 1.9, 3.4, 0, 1.9, -1.1],
    ['paintedMetalTan', 2.3, 0.18, 3.4, 0, 2.9, -1.1],
  ];
  for (const [key, w, h, d, ox, oy, oz] of parts) {
    const g = new THREE.BoxGeometry(w, h, d);
    scaleBoxUV(g, w, h, d, 2.2);
    place(level, key, g, x + ox, oy, z + oz, rot);
    g.dispose();
  }

  const wheel = new THREE.CylinderGeometry(0.48, 0.48, 0.3, 16);
  wheel.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-1.05, 1.7], [1.05, 1.7], [-1.05, -1.4], [1.05, -1.4]]) {
    const c = Math.cos(rot);
    const sn = Math.sin(rot);
    q.setFromAxisAngle(yAxis, rot);
    m.compose(p.set(x + wx * c - wz * sn, 0.46, z + wx * sn + wz * c), q, s);
    level.push('polymerBlack', wheel, m);
  }
  wheel.dispose();
  void rng;
}

// ---------------------------------------------------------------- palms ----

function buildPalms(level: LevelSystem, rng: RNG): void {
  const spots: Array<[number, number]> = [
    [-11.5, 32], [11.5, 36], [-11.5, -2], [11.5, 2], [-11.5, 48],
    [11.5, 50], [-42, 28], [42, 32], [-44, -24], [44, -20],
  ];

  for (const [x, z] of spots) {
    const h = rng.range(4.5, 7.5);
    const lean = rng.range(-0.09, 0.09);
    const segs = 7;

    // Trunk: tapered, leaning, with ring texture from the material.
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs;
      const t1 = (i + 1) / segs;
      const r0 = 0.22 * (1 - t0 * 0.45);
      const r1 = 0.22 * (1 - t1 * 0.45);
      const segH = h / segs;
      const g = new THREE.CylinderGeometry(r1, r0, segH, 9, 1);
      applyCylinderUV(g, r0, segH, 0.7);
      const bend = lean * t0 * t0 * h;
      q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), lean * t0 * 1.4);
      m.compose(p.set(x + bend, segH * (i + 0.5), z), q, s);
      level.push('wood', g, m);
      g.dispose();
    }

    // Fronds: long tapered wedges drooping from the crown.
    const crownY = h;
    const crownX = x + lean * h;
    const fronds = rng.int(9, 14);
    for (let i = 0; i < fronds; i++) {
      const ang = (i / fronds) * Math.PI * 2 + rng.range(-0.2, 0.2);
      const len = rng.range(1.5, 2.6);
      const droop = rng.range(0.4, 1.1);

      const frond = new THREE.BufferGeometry();
      const w0 = 0.13;
      const segments = 5;
      const verts: number[] = [];
      const norms: number[] = [];
      const uvs: number[] = [];
      const idx: number[] = [];
      for (let k = 0; k <= segments; k++) {
        const t = k / segments;
        const wl = w0 * (1 - t * 0.85);
        const px = Math.cos(ang) * len * t;
        const pz = Math.sin(ang) * len * t;
        const py = -droop * t * t;
        verts.push(px - Math.sin(ang) * wl, py, pz + Math.cos(ang) * wl);
        verts.push(px + Math.sin(ang) * wl, py, pz - Math.cos(ang) * wl);
        norms.push(0, 1, 0, 0, 1, 0);
        uvs.push(0, t * 2, 1, t * 2);
        if (k < segments) {
          const b = k * 2;
          idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
        }
      }
      frond.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      frond.setAttribute('normal', new THREE.Float32BufferAttribute(norms, 3));
      frond.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      frond.setIndex(idx);
      frond.computeVertexNormals();

      m.compose(p.set(crownX, crownY, z), new THREE.Quaternion(), s);
      level.push('fabricTarp', frond, m);
      frond.dispose();
    }
  }
}

// --------------------------------------------------------------- debris ----

function buildDebris(level: LevelSystem, rng: RNG): void {
  // Rubble piles at building corners and blast sites.
  const piles: Array<[number, number, number]> = [
    [-14, -30, 2.6], [15, -32, 2.0], [-33, 20, 2.4], [34, 8, 1.8],
    [0, -12, 1.6], [-8, 44, 2.2], [9, -46, 2.0], [-46, -30, 2.8],
  ];

  for (const [cx, cz, radius] of piles) {
    const count = Math.floor(radius * 9);
    for (let i = 0; i < count; i++) {
      const a = rng.next() * Math.PI * 2;
      const r = Math.sqrt(rng.next()) * radius;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      const sz = rng.range(0.12, 0.45) * (1 - r / radius * 0.5);
      const g = new THREE.BoxGeometry(sz * rng.range(0.7, 1.6), sz * rng.range(0.4, 1.0), sz * rng.range(0.7, 1.6));
      scaleBoxUV(g, sz, sz, sz, 0.9);
      q.setFromEuler(new THREE.Euler(rng.range(-0.5, 0.5), rng.range(0, 6.28), rng.range(-0.5, 0.5)));
      m.compose(p.set(x, sz * 0.35 + (1 - r / radius) * 0.3, z), q, s);
      level.push(rng.next() < 0.6 ? 'rubble' : 'concrete', g, m);
      g.dispose();
    }
  }

  // Loose bricks and boards scattered across the streets.
  for (let i = 0; i < 220; i++) {
    const x = rng.range(-52, 52);
    const z = rng.range(-52, 52);
    if (Math.abs(x) > 48 || Math.abs(z) > 48) continue;
    const isBoard = rng.next() < 0.3;
    const g = isBoard
      ? new THREE.BoxGeometry(rng.range(0.6, 1.5), 0.035, rng.range(0.1, 0.2))
      : new THREE.BoxGeometry(0.2, 0.09, 0.1);
    q.setFromEuler(new THREE.Euler(0, rng.range(0, 6.28), 0));
    m.compose(p.set(x, 0.05, z), q, s);
    level.push(isBoard ? 'wood' : 'brick', g, m);
    g.dispose();
  }
}

// ----------------------------------------------------- street furniture ----

function buildStreetFurniture(level: LevelSystem, rng: RNG): void {
  // Lamp posts down the main street.
  for (let i = -4; i <= 4; i++) {
    for (const x of [-9.4, 9.4]) {
      const z = i * 11;
      const pole = new THREE.CylinderGeometry(0.07, 0.09, 5.2, 10);
      applyCylinderUV(pole, 0.08, 5.2, 1.2);
      place(level, 'paintedMetalGreen', pole, x, 2.6, z);
      pole.dispose();

      const arm = new THREE.BoxGeometry(1.0, 0.07, 0.07);
      scaleBoxUV(arm, 1.0, 0.07, 0.07, 0.8);
      place(level, 'paintedMetalGreen', arm, x + (x < 0 ? 0.5 : -0.5), 5.15, z);
      arm.dispose();

      const head = new THREE.BoxGeometry(0.34, 0.14, 0.22);
      scaleBoxUV(head, 0.34, 0.14, 0.22, 0.5);
      place(level, 'paintedMetalGreen', head, x + (x < 0 ? 1.0 : -1.0), 5.05, z);
      head.dispose();
    }
  }

  // Utility poles with slack cable runs — the sagging lines add a lot of
  // depth cues across the skyline for very little geometry.
  const poles: Array<[number, number]> = [];
  for (let i = -3; i <= 3; i++) poles.push([-13.5, i * 16]);
  for (const [x, z] of poles) {
    const pole = new THREE.CylinderGeometry(0.11, 0.15, 8.0, 8);
    applyCylinderUV(pole, 0.13, 8.0, 1.0);
    place(level, 'wood', pole, x, 4.0, z);
    pole.dispose();

    const cross = new THREE.BoxGeometry(1.6, 0.1, 0.1);
    scaleBoxUV(cross, 1.6, 0.1, 0.1, 0.9);
    place(level, 'wood', cross, x, 7.4, z);
    cross.dispose();
  }

  for (let i = 0; i < poles.length - 1; i++) {
    const [x0, z0] = poles[i];
    const [x1, z1] = poles[i + 1];
    for (const off of [-0.6, 0, 0.6]) {
      const pts: THREE.Vector3[] = [];
      const segs = 10;
      for (let k = 0; k <= segs; k++) {
        const t = k / segs;
        const sag = Math.sin(t * Math.PI) * 0.85;
        pts.push(new THREE.Vector3(
          THREE.MathUtils.lerp(x0 + off, x1 + off, t),
          7.35 - sag,
          THREE.MathUtils.lerp(z0, z1, t),
        ));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const tube = new THREE.TubeGeometry(curve, 12, 0.022, 5, false);
      m.identity();
      level.push('polymerBlack', tube, m);
      tube.dispose();
    }
  }
  void rng;
}

/** Generates planar UVs from world position for geometries with no UVs. */
function scaleUVFromPosition(geo: THREE.BufferGeometry, tile: number): void {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const existing = geo.getAttribute('uv') as THREE.BufferAttribute | undefined;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    if (existing) {
      uvs[i * 2] = existing.getX(i) * (1 / tile) * 2;
      uvs[i * 2 + 1] = existing.getY(i) * (1 / tile) * 2;
    } else {
      uvs[i * 2] = pos.getX(i) / tile;
      uvs[i * 2 + 1] = pos.getZ(i) / tile;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
}
