import * as THREE from 'three';
import { addWheel, bend, bolt, cyl, cylX, cylZ, decal, gbox, jit, paneGeo, pbox, roundLamp, tube } from './parts.js';
import { grime, hash3 } from './kit.js';

// ---------------------------------------------------------------------------
// Bolt-on gear: racks, cans, plates, ladders, spares, aerials, light bars,
// snorkels, awnings, roof tents, tanks, drums, crates, nets, hitches, panniers.
// This is where "somebody owns this and lives out of it" comes from.
// ---------------------------------------------------------------------------

const STEEL = grime(0x3a3e42, { up: 0.5, down: 0.4, jitter: 0.08 });
const ALU = grime(0x8d9398, { dust: 0x736a58, up: 0.4, down: 0.2, jitter: 0.1 });

/** Welded rack: two-tier rails, uprights, slatted floor, feet. */
export function roofRack(k, { x, z0, z1, y, h = 0.12, slats = true, legs = [], legH = 0.1, mesh = false, tint = null }) {
  const cz = (z0 + z1) * 0.5;
  const len = z0 - z1;
  const shade = tint ? grime(tint, { up: 0.5, down: 0.4, jitter: 0.08 }) : STEEL;
  for (const s of [-1, 1]) {
    for (const yy of [y, y + h]) {
      // in welded lengths, not one extrusion
      const segs = Math.max(2, Math.round(len / 1.1));
      let at = z1;
      for (let i = 0; i < segs; i++) {
        const l = len / segs - 0.012;
        k.add('steel', gbox(0.045, 0.05, l, 0.01), { pos: [s * x + (jit(i, s) - 0.5) * 0.003, yy + (jit(i, 3) - 0.5) * 0.003, at + l * 0.5 + 0.006], shade });
        at += len / segs;
      }
    }
    const n = Math.max(3, Math.round(len / 0.45));
    for (let i = 0; i <= n; i++) {
      const z = z1 + 0.04 + (i / n) * (len - 0.08);
      k.add('steel', gbox(0.032, h - 0.03, 0.032, 0.006), { pos: [s * x, y + h * 0.5, z], shade });
    }
  }
  for (const z of [z0, z1]) {
    for (const yy of [y, y + h]) k.add('steel', gbox(x * 2 + 0.045, 0.05, 0.045, 0.01), { pos: [0, yy, z], shade });
  }
  if (slats) {
    const n = Math.max(4, Math.round(len / 0.24));
    for (let i = 0; i < n; i++) {
      const z = z1 + 0.1 + (i / (n - 1)) * (len - 0.2);
      k.add('steel', gbox(x * 2 - 0.06, 0.018, 0.05, 0.004), { pos: [0, y + 0.02, z], shade });
    }
  }
  if (mesh) {
    const g = new THREE.PlaneGeometry(x * 2 - 0.08, len - 0.1);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x * 2 * 8), uv.getY(i) * (len * 8));
    k.add('mesh', g, { pos: [0, y + 0.005, cz], rot: [-Math.PI / 2, 0, 0], tint: 0x9a9c98 });
  }
  for (const z of legs) {
    k.addMirrored('steel', gbox(0.05, legH, 0.05, 0.01), { pos: [x, y - legH * 0.5 - 0.02, z], shade });
    k.addMirrored('alu', gbox(0.1, 0.014, 0.12, 0.004), { pos: [x, y - legH - 0.03, z], shade: ALU });
  }
  return { deckY: y + 0.04 };
}

/** 20 l jerry can: stamped X on both faces, triple handle, cap, stencil. */
export function jerryCan(k, { x, y, z, rot = 0, tint = 0x5a5d3a, label = 'diesel', key = 'paint', paint = null }) {
  const w = 0.345;
  const h = 0.46;
  const d = 0.17;
  const shade = paint ?? grime(tint, { up: 0.45, dust: 0x9a8b6b, jitter: 0.1 });
  k.add(key, gbox(w, h, d, 0.03), { pos: [x, y + h * 0.5, z], rot: [0, rot, 0], shade });
  const sx = Math.sin(rot);
  const cx = Math.cos(rot);
  for (const dz of [-1, 1]) {
    const fx = x + sx * dz * (d * 0.5 + 0.005);
    const fz = z + cx * dz * (d * 0.5 + 0.005);
    k.add(key, gbox(w - 0.05, h - 0.07, 0.012, 0.005), { pos: [fx, y + h * 0.5, fz], rot: [0, rot, 0], shade });
    for (const s of [-1, 1]) {
      k.add(key, gbox(Math.hypot(w * 0.7, h * 0.7), 0.028, 0.012, 0.004), { pos: [fx + sx * dz * 0.006, y + h * 0.5, fz + cx * dz * 0.006], rot: [0, rot, s * Math.atan2(h * 0.7, w * 0.7)], shade });
    }
    if (label && dz > 0) decal(k, label, { w: 0.2, h: 0.1, pos: [fx + sx * 0.014, y + h * 0.26, fz + cx * 0.014], rot: [0, rot, 0], tint: 0xffffff });
  }
  k.add('steel', gbox(w + 0.006, 0.026, d + 0.006, 0.008), { pos: [x, y + h + 0.008, z], rot: [0, rot, 0], shade: STEEL });
  for (let i = -1; i <= 1; i++) {
    k.add('steel', gbox(0.026, 0.05, d - 0.03, 0.008), { pos: [x + cx * i * 0.1, y + h + 0.04, z - sx * i * 0.1], rot: [0, rot, 0], shade: STEEL });
  }
  k.add('steel', gbox(w - 0.03, 0.024, 0.03, 0.008), { pos: [x, y + h + 0.06, z], rot: [0, rot, 0], shade: STEEL });
  k.add('trim', cyl(0.036, 0.038, 0.03, 12), { pos: [x + sx * 0.055, y + h + 0.03, z + cx * 0.055], tint: 0x32363b });
}

/** A row of cans in a holder, strapped. */
export function canRack(k, { x, y, z, n = 2, rot = 0, along = 'z', tints = [0x5a5d3a, 0x3a3a3a], labels = ['diesel', 'water'], paint = null }) {
  const step = 0.37;
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2) * step;
    const px = along === 'x' ? x + o : x;
    const pz = along === 'z' ? z + o : z;
    jerryCan(k, { x: px, y, z: pz, rot, tint: tints[i % tints.length], label: labels[i % labels.length], paint: paint ? paint[i % paint.length] : null });
  }
  // holder: base tray, two uprights, strap over the top
  const L = n * step + 0.06;
  const bw = along === 'z' ? [0.2, L] : [L, 0.2];
  k.add('steel', gbox(bw[0], 0.03, bw[1], 0.006), { pos: [x, y - 0.01, z], shade: STEEL });
  k.add('steel', gbox(along === 'z' ? 0.02 : L, 0.5, along === 'z' ? L : 0.02, 0.005), { pos: [along === 'z' ? x + 0.1 : x, y + 0.25, along === 'z' ? z : z - 0.1], shade: STEEL });
  k.add('trim', gbox(along === 'z' ? 0.24 : L + 0.02, 0.012, along === 'z' ? L + 0.02 : 0.24, 0.003), { pos: [x, y + 0.36, z], tint: 0x433d34 });
}

/** Sand ladder / recovery board, dished, with lugs and end holes. */
export function sandPlate(k, { x, y, z, rot = [0, 0, 0], tint = 0xd4671f, len = 1.1, w = 0.32, key = 'paint' }) {
  const shade = grime(tint, { up: 0.4, dust: 0x9a8b6b, jitter: 0.1 });
  const g = gbox(w, 0.028, len, 0.01);
  k.add(key, g, { pos: [x, y, z], rot, shade });
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
  const local = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyQuaternion(q).add(new THREE.Vector3(x, y, z)).toArray();
  for (let r = 0; r < 3; r++) {
    for (let j = 0; j < 9; j++) {
      const u = ((j + (r % 2) * 0.5) / 8.5) * 2 - 1;
      k.add('trim', pbox(0.026, 0.022, 0.026), { pos: local(-w * 0.32 + r * w * 0.32, 0.02, u * (len * 0.5 - 0.1)), quat: q, tint: 0x32363b });
    }
  }
  for (const dz of [-0.36, 0.36]) k.add('gap', cyl(0.035, 0.035, 0.04, 10), { pos: local(0, 0, dz * len * 0.5 + dz * 0.1), quat: q, tint: 0x0c0d0e });
  for (const s of [-1, 1]) k.add(key, gbox(0.02, 0.02, len - 0.02, 0.005), { pos: local(s * (w * 0.5 - 0.01), 0.02, 0), quat: q, shade });
}

/** Ladder up the back of a box body. */
export function ladder(k, { x, y0, y1, z, w = 0.36, key = 'alu', tint = 0x8d9398, tilt = 0 }) {
  const h = y1 - y0;
  const shade = grime(tint, { dust: 0x736a58, up: 0.4, down: 0.2, jitter: 0.1 });
  for (const s of [-1, 1]) k.add(key, gbox(0.03, h, 0.03, 0.006), { pos: [x + s * w * 0.5, (y0 + y1) * 0.5, z], rot: [tilt, 0, 0], shade });
  const n = Math.max(2, Math.round(h / 0.3));
  for (let i = 0; i <= n; i++) {
    const t = (i + 0.4) / (n + 0.8);
    k.add(key, cylX(0.012, 0.012, w, 8), { pos: [x, y0 + h * t, z - Math.sin(tilt) * (h * t - h * 0.5)], shade });
  }
  for (const yy of [y0 + 0.12, y1 - 0.12]) k.addMirrored('steel', gbox(0.03, 0.03, 0.1, 0.005), { pos: [x + w * 0.5, yy, z - 0.05], shade: STEEL });
}

/** Spare wheel. `axis` 'z' hangs it on a tailgate, 'y' lays it flat. */
export function spare(k, proto, { x, y, z, axis = 'z', side = 1, spin = 0.7, carrier = true }) {
  // the proto's dish faces +X; `side` -1 hangs it facing -Z (a tailgate), 'y' lays it dish-up
  const rot = axis === 'z' ? [spin, -side * Math.PI / 2, 0] : axis === 'y' ? [0, spin, Math.PI / 2] : [spin, 0, 0];
  for (const piece of proto.pieces) {
    k.add(piece.key, piece.geo, { pos: [x, y, z], rot, tint: piece.tint, shade: piece.shade });
  }
  if (carrier && axis === 'z') {
    k.add('steel', gbox(0.4, 0.06, 0.05, 0.01), { pos: [x, y - proto.r - 0.02, z - side * 0.1], shade: STEEL });
    k.add('steel', gbox(0.06, proto.r * 1.7, 0.05, 0.01), { pos: [x, y, z - side * 0.1], shade: STEEL });
    k.add('steel', cylZ(0.04, 0.04, proto.w * 0.4 + 0.05, 10), { pos: [x, y, z + side * (proto.w * 0.2)], shade: STEEL });
  }
  if (carrier && axis === 'y') {
    k.add('steel', gbox(0.06, 0.04, proto.r * 2.1, 0.01), { pos: [x, y - proto.w * 0.5 - 0.02, z], shade: STEEL });
    k.add('steel', cyl(0.035, 0.035, proto.w + 0.06, 10), { pos: [x, y + 0.02, z], shade: STEEL });
  }
}

/** Whip aerial with a spring base; the whip sways in the shader. */
export function aerial(k, { x, y, z, h = 1.4, phase = 0, amp = 0.05 }) {
  k.add('steel', cyl(0.02, 0.028, 0.08, 10), { pos: [x, y + 0.04, z], shade: STEEL });
  k.add('steel', cyl(0.016, 0.016, 0.12, 8), { pos: [x, y + 0.14, z], tint: 0x3c4045 });
  const g = cyl(0.003, 0.007, h, 5);
  g.translate(0, h * 0.5, 0);
  k.add('whip', g, { pos: [x, y + 0.2, z], tint: 0x3c4045, flap: (px, py) => [amp * ((py - y - 0.2) / h) ** 2, phase] });
}

/** LED / halogen light bar on the roof edge. */
export function lightBar(k, { x = 0, y, z, len = 1.2, on = false, n = 8 }) {
  k.add('trim', gbox(len, 0.09, 0.09, 0.02), { pos: [x, y, z], tint: 0x32363b });
  k.add('alu', gbox(len + 0.02, 0.025, 0.1, 0.008), { pos: [x, y - 0.055, z], shade: ALU });
  for (let i = 0; i < n; i++) {
    const lx = x + (i - (n - 1) / 2) * (len / n);
    k.add('reflector', cylZ(0.03, 0.024, 0.04, 12, true), { pos: [lx, y, z + 0.04], tint: 0xffffff });
    k.add(on ? 'headOn' : 'headOff', cylZ(0.02, 0.02, 0.01, 10), { pos: [lx, y, z + 0.06], tint: 0xffffff });
  }
  k.add('lensClear', gbox(len - 0.02, 0.07, 0.01, 0.004), { pos: [x, y, z + 0.068], tint: 0xffffff });
  k.addMirrored('steel', gbox(0.04, 0.12, 0.05, 0.008), { pos: [x + len * 0.42, y - 0.09, z], shade: STEEL });
}

/** Ranger / police style roof beacon bar: amber and blue cells. */
export function beaconBar(k, { y, z, len = 1.1, on = false }) {
  k.add('trim', gbox(len, 0.1, 0.22, 0.02), { pos: [0, y, z], tint: 0x32363b });
  const cells = ['amber', 'blue', 'amber', 'blue', 'amber'];
  for (const [i, c] of cells.entries()) {
    const lx = (i - 2) * (len / 5.2);
    const key = c === 'amber' ? (on ? 'amberOn' : 'amber') : on ? 'lampBlueOn' : 'lampBlue';
    k.add(key, gbox(len / 5.6, 0.08, 0.2, 0.01), { pos: [lx, y + 0.02, z], tint: 0xffffff });
  }
  k.addMirrored('steel', gbox(0.05, 0.1, 0.06, 0.01), { pos: [len * 0.42, y - 0.09, z], shade: STEEL });
}

/** Spotlight pods, roof or bar mounted. */
export function spots(k, { xs, y, z, r = 0.08, on = false }) {
  for (const x of xs) {
    k.add('trim', gbox(0.05, 0.08, 0.04, 0.01), { pos: [x, y - 0.06, z - 0.03], tint: 0x32363b });
    roundLamp(k, { pos: [x, y, z], r, on, kind: 'spot', depth: 0.09 });
    k.add('trim', cylZ(r + 0.012, r + 0.012, 0.1, 16), { pos: [x, y, z - 0.07], tint: 0x32363b });
  }
}

/** Snorkel up the A pillar with a ram head. */
export function snorkel(k, { side = 1, x, y0, y1, z0, z1, r = 0.05 }) {
  const shade = grime(0x3c4045, { up: 0.5, jitter: 0.06 });
  k.add('trim', tube([[side * x, y0, z0], [side * (x + 0.02), y0 + 0.15, z0 - 0.06], [side * (x + 0.01), y1 - 0.2, z1 + 0.12], [side * x, y1, z1]], r, 12), { shade });
  for (const t of [0.3, 0.75]) {
    const y = y0 + (y1 - y0) * t;
    const z = z0 + (z1 - z0) * t;
    k.add('chrome', cyl(r + 0.008, r + 0.008, 0.02, 14, true), { pos: [side * (x + 0.012), y, z], rot: [0.5, 0, 0], tint: 0xb4b8bb });
    k.add('steel', gbox(0.08, 0.012, 0.03, 0.003), { pos: [side * (x - 0.04), y, z], shade: STEEL });
  }
  // ram head, mouth forward
  k.add('trim', gbox(0.11, 0.2, 0.1, 0.03), { pos: [side * x, y1 + 0.06, z1 - 0.02], shade });
  k.add('gap', pbox(0.09, 0.14, 0.03), { pos: [side * x, y1 + 0.06, z1 + 0.04], tint: 0x0a0b0c });
  for (let i = 0; i < 4; i++) k.add('trim', gbox(0.09, 0.012, 0.03, 0.003), { pos: [side * x, y1 + 0.0 + i * 0.035, z1 + 0.05], rot: [-0.5, 0, 0], shade });
  k.add('trim', gbox(0.12, 0.03, 0.14, 0.012), { pos: [side * x, y1 + 0.17, z1], rot: [-0.15, 0, 0], shade });
  // wing elbow
  k.add('trim', cylX(r, r, 0.06, 12), { pos: [side * (x - 0.04), y0, z0], shade });
  k.add('trim', gbox(0.02, 0.16, 0.2, 0.01), { pos: [side * (x - 0.07), y0, z0], shade });
}

/** Rolled awning in its bag along the rack, or opened out on two poles. */
export function awning(k, { side = 1, x, y, z0, z1, open = false, out = 2.2, tint = 0x8b8064, sway = 0.02, seed = 1 }) {
  const cz = (z0 + z1) * 0.5;
  const len = z0 - z1;
  const canvasShade = grime(tint, { up: 0.3, dust: 0x9a8e70, jitter: 0.06 });
  // housing
  k.add('trim', gbox(0.12, 0.12, len, 0.03), { pos: [side * x, y, cz], tint: 0x32363b });
  k.addMirrored('steel', gbox(0.03, 0.06, 0.05, 0.006), { pos: [x - 0.09, y + 0.02, cz + len * 0.35], shade: STEEL });
  if (!open) {
    k.add('canvas', cylZ(0.05, 0.05, len - 0.04, 12), { pos: [side * (x + 0.05), y - 0.02, cz], shade: canvasShade });
    return;
  }
  // sheet: from the housing out to the front bar, sagging in the middle
  const g = new THREE.PlaneGeometry(out, len, 8, 6);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = (p.getX(i) + out * 0.5) / out; // 0 at housing, 1 at the bar
    const v = p.getZ(i) / (len * 0.5);
    const sag = Math.sin(u * Math.PI) * 0.09 * (1 - v * v * 0.6);
    p.setY(i, y + 0.02 - u * 0.25 - sag);
  }
  g.translate(side * (x + 0.06 + out * 0.5), 0, cz);
  g.computeVertexNormals();
  k.add('canvas', g, {
    shade: canvasShade,
    flap: (px) => {
      const u = Math.abs(px - side * (x + 0.06)) / out;
      return [sway * u * u, seed + px];
    },
  });
  // front bar, two poles to the ground, guy lines
  const bx = side * (x + 0.06 + out);
  const by = y - 0.23;
  k.add('alu', cylZ(0.016, 0.016, len, 8), { pos: [bx, by, cz], shade: ALU });
  for (const z of [z0 - 0.05, z1 + 0.05]) {
    k.add('alu', cyl(0.013, 0.013, by, 8), { pos: [bx, by * 0.5, z], shade: ALU });
    k.add('alu', cyl(0.05, 0.05, 0.02, 8), { pos: [bx, 0.01, z], shade: ALU });
    // guy line and peg
    const pegZ = z + Math.sign(z - cz) * 0.9;
    k.add('canvas', tube([[bx, by - 0.02, z], [bx + side * 0.4, 0.02, pegZ]], 0.004, 4), { tint: 0xd8d0b8 });
    k.add('steel', cyl(0.008, 0.008, 0.16, 6), { pos: [bx + side * 0.4, 0.06, pegZ], rot: [0.5 * Math.sign(z - cz), 0, 0], shade: STEEL });
  }
  // side arms back to the body
  for (const z of [z0 - 0.05, z1 + 0.05]) k.add('alu', tube([[side * (x + 0.08), y, z], [bx, by, z]], 0.012, 6), { shade: ALU });
}

/** Roof tent: closed (a hard shell with a cover) or opened as a wedge. */
export function roofTent(k, { x0, x1, z0, z1, y, open = false, tint = 0x6f6a55, shellTint = 0x3c4045, sway = 0.015, ladderSide = 1 }) {
  const w = x1 - x0;
  const len = z0 - z1;
  const cx = (x0 + x1) * 0.5;
  const cz = (z0 + z1) * 0.5;
  const canvasShade = grime(tint, { up: 0.3, dust: 0x9a8e70, jitter: 0.06 });
  k.add('trim', gbox(w, 0.22, len, 0.05), { pos: [cx, y + 0.11, cz], shade: grime(shellTint, { up: 0.45, dust: 0x8a7c5e, jitter: 0.06 }) });
  k.addMirrored('steel', gbox(0.05, 0.05, len - 0.2, 0.01), { pos: [cx + w * 0.4, y + 0.02, cz], shade: STEEL });
  if (!open) {
    k.add('canvas', gbox(w + 0.04, 0.16, len + 0.04, 0.05), { pos: [cx, y + 0.3, cz], shade: canvasShade });
    for (const z of [cz - len * 0.3, cz + len * 0.3]) k.add('trim', gbox(w + 0.08, 0.02, 0.05, 0.005), { pos: [cx, y + 0.3, z], tint: 0x433d34 });
    return;
  }
  // open: the lid hinged up at the rear, a canvas wedge under it, a ladder down
  const lidH = 0.95;
  const ang = Math.atan2(lidH, len);
  k.add('trim', gbox(w, 0.06, Math.hypot(len, lidH), 0.03), { pos: [cx, y + 0.22 + lidH * 0.5, cz], rot: [-ang, 0, 0], shade: grime(shellTint, { up: 0.45, dust: 0x8a7c5e }) });
  // triangular canvas walls
  const wall = (s) => {
    const shape = [[z0, y + 0.22], [z1, y + 0.22], [z1, y + 0.22 + lidH]];
    const g = new THREE.BufferGeometry();
    const v = new Float32Array([shape[0][0], shape[0][1], 0, shape[1][0], shape[1][1], 0, shape[2][0], shape[2][1], 0]);
    // z along x-of-shape: build directly in vehicle space, plane at x = s*w/2
    const pos = new Float32Array([
      s * w * 0.5 + cx, shape[0][1], shape[0][0],
      s * w * 0.5 + cx, shape[1][1], shape[1][0],
      s * w * 0.5 + cx, shape[2][1], shape[2][0],
    ]);
    void v;
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1]), 2));
    g.computeVertexNormals();
    return g;
  };
  for (const s of [-1, 1]) k.add('canvas', wall(s), { shade: canvasShade, flap: (px, py) => [sway * ((py - y - 0.22) / lidH), px * 3] });
  // front wall with a rolled-up door and mesh window
  k.add('canvas', paneGeo(w - 0.02, 0.2), { pos: [cx, y + 0.32, z0 + 0.005], shade: canvasShade });
  k.add('canvas', cylX(0.06, 0.06, w - 0.04, 10), { pos: [cx, y + 0.45, z0 + 0.03], shade: canvasShade });
  const rear = paneGeo(w - 0.02, lidH - 0.02);
  k.add('canvas', rear, { pos: [cx, y + 0.22 + lidH * 0.5, z1 - 0.005], rot: [0, Math.PI, 0], shade: canvasShade, flap: (px, py) => [sway * ((py - y - 0.22) / lidH), px * 2 + 1] });
  const win = new THREE.PlaneGeometry(0.5, 0.36);
  const uv = win.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 10, uv.getY(i) * 7);
  k.add('mesh', win, { pos: [cx, y + 0.22 + lidH * 0.5, z1 - 0.02], rot: [0, Math.PI, 0], tint: 0x2e3135 });
  k.add('canvas', gbox(0.56, 0.42, 0.02, 0.006), { pos: [cx, y + 0.22 + lidH * 0.5, z1 - 0.012], shade: canvasShade });
  ladder(k, { x: cx + ladderSide * (w * 0.5 + 0.2), y0: 0.2, y1: y + 0.2, z: z0 - 0.3, key: 'alu', tilt: 0.25 });
}

/** Horizontal tank: a drum on saddles with straps and a tap. */
export function tank(k, { x, y, z, r = 0.25, len = 1.2, axis = 'z', tint = 0xd8d4c4, key = 'trim', tap = true }) {
  const shade = grime(tint, { up: 0.45, dust: 0x9a8b6b, jitter: 0.06 });
  const body = axis === 'z' ? cylZ(r, r, len, 20) : cylX(r, r, len, 20);
  k.add(key, body, { pos: [x, y, z], shade });
  for (const s of [-1, 1]) {
    const cap = new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const rot = axis === 'z' ? [s > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0] : [0, 0, s > 0 ? -Math.PI / 2 : Math.PI / 2];
    k.add(key, cap, { pos: axis === 'z' ? [x, y, z + s * len * 0.5] : [x + s * len * 0.5, y, z], rot, scale: [1, 0.35, 1], shade });
  }
  for (const t of [-0.3, 0.3]) {
    const p = axis === 'z' ? [x, y, z + t * len] : [x + t * len, y, z];
    const ring = new THREE.TorusGeometry(r + 0.008, 0.012, 6, 24);
    k.add('steel', ring, { pos: p, rot: axis === 'z' ? [0, 0, 0] : [0, Math.PI / 2, 0], shade: STEEL });
    k.add('steel', gbox(axis === 'z' ? r * 2.2 : 0.08, 0.06, axis === 'z' ? 0.08 : r * 2.2, 0.01), { pos: [p[0], y - r - 0.02, p[2]], shade: STEEL });
  }
  k.add('trim', cyl(0.06, 0.06, 0.04, 12), { pos: [x, y + r, z], tint: 0x32363b });
  if (tap) {
    k.add('chrome', cyl(0.012, 0.012, 0.12, 8), { pos: axis === 'z' ? [x, y - r + 0.06, z + len * 0.5 + 0.06] : [x + len * 0.5 + 0.06, y - r + 0.06, z], rot: [Math.PI / 2, 0, 0], tint: 0xb4b8bb });
  }
}

/** 200 l drum with rolling hoops and two bungs. */
export function drum(k, { x, y, z, r = 0.29, h = 0.88, tint = 0x3a5a7a, axis = 'y', rust = 0.3, seed = 1 }) {
  const shade = (px, py, pz, nx, ny) => {
    const base = grime(tint, { up: 0.4, dust: 0x9a8b6b, jitter: 0.1, seed })(px, py, pz, nx, ny);
    const hsh = hash3(Math.round(px * 30), Math.round(py * 30), Math.round(pz * 30), seed);
    const rr = rust * Math.max(0, 1 - Math.abs((py - y) / (h * 0.5)) * 0.4) * (hsh > 0.55 ? (hsh - 0.55) * 2.2 : 0);
    const R = [0.32, 0.17, 0.09];
    return [base[0] + (R[0] - base[0]) * rr, base[1] + (R[1] - base[1]) * rr, base[2] + (R[2] - base[2]) * rr];
  };
  const body = axis === 'y' ? cyl(r, r, h, 20) : cylZ(r, r, h, 20);
  k.add('paint', body, { pos: [x, y, z], shade });
  for (const t of [-0.27, 0.27]) {
    const ring = new THREE.TorusGeometry(r + 0.006, 0.014, 6, 22);
    k.add('paint', ring, { pos: axis === 'y' ? [x, y + t * h, z] : [x, y, z + t * h], rot: axis === 'y' ? [Math.PI / 2, 0, 0] : [0, 0, 0], shade });
  }
  const top = axis === 'y' ? [x, y + h * 0.5 + 0.004, z] : [x, y, z + h * 0.5 + 0.004];
  k.add('paint', axis === 'y' ? cyl(r - 0.02, r - 0.02, 0.01, 20) : cylZ(r - 0.02, r - 0.02, 0.01, 20), { pos: top, shade });
  k.add('rust', axis === 'y' ? cyl(0.035, 0.035, 0.02, 8) : cylZ(0.035, 0.035, 0.02, 8), { pos: axis === 'y' ? [x + r * 0.55, top[1] + 0.01, z] : [x + r * 0.55, y, top[2] + 0.01], tint: 0x6a5a48 });
  k.add('rust', axis === 'y' ? cyl(0.022, 0.022, 0.02, 8) : cylZ(0.022, 0.022, 0.02, 8), { pos: axis === 'y' ? [x - r * 0.55, top[1] + 0.01, z] : [x - r * 0.55, y, top[2] + 0.01], tint: 0x6a5a48 });
}

/** Timber crate with slats and steel corner straps. */
export function crate(k, { x, y, z, w = 0.6, h = 0.5, d = 0.6, tint = 0x8a7250, rot = 0, seed = 1 }) {
  const wood = grime(tint, { up: 0.4, dust: 0xa89a78, jitter: 0.14, seed });
  k.add('rust', gbox(w, h, d, 0.01), { pos: [x, y + h * 0.5, z], rot: [0, rot, 0], shade: wood });
  const n = Math.max(2, Math.round(h / 0.12));
  for (let i = 0; i < n; i++) {
    const yy = y + (i + 0.5) * (h / n);
    k.add('rust', gbox(w + 0.02, h / n - 0.018, 0.016, 0.003), { pos: [x + Math.sin(rot) * (d * 0.5 + 0.006), yy, z + Math.cos(rot) * (d * 0.5 + 0.006)], rot: [0, rot, 0], shade: wood });
    k.add('rust', gbox(0.016, h / n - 0.018, d + 0.02, 0.003), { pos: [x + Math.cos(rot) * (w * 0.5 + 0.006), yy, z - Math.sin(rot) * (w * 0.5 + 0.006)], rot: [0, rot, 0], shade: wood });
  }
  for (const s of [-1, 1]) k.add('steel', gbox(w + 0.03, 0.03, d + 0.03, 0.004), { pos: [x, y + h * 0.5 + s * (h * 0.4), z], rot: [0, rot, 0], shade: STEEL });
}

/** Ratchet strap over a load: band, side runs, buckle, loose tail. */
export function lashing(k, { x, z, y0, y1, halfW, along = 'x', buckle = 1, tint = 0x433d34 }) {
  const h = y1 - y0;
  const band = along === 'x' ? gbox(halfW * 2 + 0.03, 0.012, 0.05, 0.004) : gbox(0.05, 0.012, halfW * 2 + 0.03, 0.004);
  k.add('trim', band, { pos: [x, y1 + 0.008, z], tint });
  for (const s of [-1, 1]) {
    const run = along === 'x' ? gbox(0.014, h, 0.05, 0.004) : gbox(0.05, h, 0.014, 0.004);
    k.add('trim', run, { pos: along === 'x' ? [x + s * (halfW + 0.012), y0 + h * 0.5, z] : [x, y0 + h * 0.5, z + s * (halfW + 0.012)], tint });
  }
  const bp = along === 'x' ? [x + buckle * (halfW + 0.02), y0 + h * 0.34, z] : [x, y0 + h * 0.34, z + buckle * (halfW + 0.02)];
  k.add('alu', gbox(0.04, 0.06, 0.07, 0.008), { pos: bp, shade: ALU });
  k.add('trim', gbox(along === 'x' ? 0.012 : 0.046, 0.12, along === 'x' ? 0.046 : 0.012, 0.003), { pos: [bp[0], bp[1] - 0.1, bp[2]], rot: along === 'x' ? [0, 0, buckle * 0.2] : [buckle * 0.2, 0, 0], tint });
}

/** Cargo net draped over a load, following `heightAt(x, z)`. */
export function cargoNet(k, { x0, x1, z0, z1, heightAt, tint = 0x2a2c28, cells = 7 }) {
  const w = x1 - x0;
  const len = z0 - z1;
  const g = new THREE.PlaneGeometry(w, len, 12, 12);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) * 0.5, 0, (z0 + z1) * 0.5);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)) + 0.015);
  g.computeVertexNormals();
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * cells, uv.getY(i) * len * cells);
  k.add('mesh', g, { tint });
  // hooks along the rail
  for (let i = 0; i < 5; i++) {
    const z = z1 + (i + 0.5) * (len / 5);
    for (const x of [x0, x1]) k.add('steel', bend(0.02, 0.005, Math.PI * 1.4, 8), { pos: [x, heightAt(x, z) - 0.02, z], rot: [0, Math.PI / 2, 0], shade: STEEL });
  }
}

/** Tow hitch: receiver, ball, safety chain loops, socket. */
export function hitch(k, { y, z, ball = true }) {
  k.add('steel', gbox(0.06, 0.06, 0.3, 0.008), { pos: [0, y, z - 0.1], shade: STEEL });
  k.add('steel', gbox(0.09, 0.1, 0.05, 0.01), { pos: [0, y - 0.02, z - 0.22], shade: STEEL });
  if (ball) k.add('chrome', new THREE.SphereGeometry(0.03, 10, 8), { pos: [0, y + 0.06, z - 0.22], tint: 0xb4b8bb });
  k.addMirrored('steel', new THREE.TorusGeometry(0.025, 0.006, 6, 10), { pos: [0.1, y - 0.04, z - 0.16], rot: [Math.PI / 2, 0, 0], shade: STEEL });
  k.add('trim', gbox(0.06, 0.08, 0.06, 0.01), { pos: [0.16, y + 0.02, z - 0.14], tint: 0x32363b });
}

/** Trailer drawbar: A-frame, coupler, jockey wheel, breakaway chain. */
export function drawbar(k, { y, z0, z1, hw, hitched = false }) {
  const len = z0 - z1;
  const tip = [0, y, z0];
  for (const s of [-1, 1]) k.add('steel', tube([[s * hw, y, z1], [s * 0.06, y, z0 - 0.1]], 0.03, 8), { shade: STEEL });
  k.add('steel', gbox(0.12, 0.08, 0.5, 0.01), { pos: [0, y, z0 - 0.3], shade: STEEL });
  k.add('steel', gbox(0.09, 0.12, 0.18, 0.02), { pos: [0, y + 0.02, z0 - 0.02], shade: STEEL });
  k.add('steel', gbox(0.05, 0.04, 0.16, 0.008), { pos: [0, y + 0.1, z0 - 0.06], rot: [0.5, 0, 0], shade: STEEL });
  // jockey wheel: post, clamp, handle, wheel
  const jz = z0 - 0.5;
  k.add('steel', gbox(0.07, 0.14, 0.07, 0.01), { pos: [0.1, y + 0.02, jz], shade: STEEL });
  const post = hitched ? y + 0.6 : y + 0.25;
  k.add('chrome', cyl(0.024, 0.024, hitched ? 0.5 : 0.7, 10), { pos: [0.1, hitched ? y + 0.3 : y - 0.05, jz], tint: 0xb4b8bb });
  k.add('steel', cyl(0.03, 0.03, 0.34, 10), { pos: [0.1, post + 0.05, jz], shade: STEEL });
  k.add('steel', bend(0.07, 0.008, Math.PI * 1.5, 10), { pos: [0.1, post + 0.25, jz], rot: [Math.PI / 2, 0, 0], shade: STEEL });
  if (!hitched) {
    k.add('rubber', cylX(0.1, 0.1, 0.07, 14), { pos: [0.1, 0.1, jz], tint: 0x262b34 });
    k.add('alu', cylX(0.05, 0.05, 0.08, 10), { pos: [0.1, 0.1, jz], shade: ALU });
    k.add('steel', gbox(0.02, 0.22, 0.05, 0.005), { pos: [0.16, 0.22, jz], shade: STEEL });
  }
  // chain hanging from the coupler
  k.add('steel', tube([[0.05, y - 0.02, z0 - 0.05], [0.09, y - 0.22, z0 + 0.08], [0.02, y - 0.1, z0 + 0.22]], 0.008, 5), { tint: 0x55595d });
  return tip;
}

/** Aluminium pannier box, lid strap and a sticker. */
export function pannier(k, { x, y, z, side, w = 0.42, h = 0.4, d = 0.28, tint = 0x9a9ea2 }) {
  k.add('alu', gbox(d, h, w, 0.015), { pos: [x + side * d * 0.5, y, z], shade: grime(tint, { dust: 0x736a58, up: 0.4, down: 0.2, jitter: 0.08 }) });
  k.add('alu', gbox(d + 0.02, 0.03, w + 0.02, 0.006), { pos: [x + side * d * 0.5, y + h * 0.5 - 0.02, z], shade: ALU });
  for (const dz of [-w * 0.3, w * 0.3]) k.add('trim', gbox(d + 0.03, h - 0.06, 0.03, 0.004), { pos: [x + side * d * 0.5, y, z + dz], tint: 0x433d34 });
  k.add('steel', gbox(0.04, h * 0.7, 0.05, 0.008), { pos: [x + side * 0.02, y, z], shade: STEEL });
}

/** Mud flap hanging behind a wheel. */
export function mudFlap(k, { x, z, y = 0.55, w = 0.3, h = 0.36 }) {
  k.add('trim', gbox(w, h, 0.02, 0.006), { pos: [x, y - h * 0.5, z], rot: [0.1, 0, 0], tint: 0x32363b });
  k.add('steel', gbox(w + 0.02, 0.04, 0.03, 0.006), { pos: [x, y + 0.01, z], shade: STEEL });
}

/** Water / fuel filler, a pair of hooks, tiny greebles that say "used". */
export function stowedRope(k, { x, y, z, r = 0.1 }) {
  k.add('canvas', new THREE.TorusGeometry(r, r * 0.4, 8, 16), { pos: [x, y, z], rot: [Math.PI / 2, 0.2, 0], tint: 0x9c8f70 });
}

export { addWheel, bolt, roundLamp, paneGeo };
