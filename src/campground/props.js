import * as THREE from 'three';
import { profile } from '../lib/geo.js';
import { lump, Obj, slackLine } from './kit.js';

// ---------------------------------------------------------------------------
// Small things. Each factory returns an Obj in its own frame (front = +z, feet
// at y = 0) that a scene builder merges into a larger object or places on the
// ground directly. Nothing here is a perfect box: legs splay, lids sit a little
// open, cans lean, because two identical boxes side by side is the fastest way
// to make a camp look like a demo.
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;

/** Director's chair: two X-frames of timber, a cloth seat and back. */
export function chair(rnd, cloth = 'chairCloth') {
  const o = new Obj();
  const w = 0.52;
  const leg = 0.025;
  const lean = 0.06 + rnd() * 0.05;
  for (const s of [-1, 1]) {
    // X legs on each side
    o.box('timber', leg, 0.86, leg, { pos: [s * w * 0.5, 0.36, 0.0], rot: [0.62, 0, 0] });
    o.box('timber', leg, 0.86, leg, { pos: [s * w * 0.5, 0.36, 0.0], rot: [-0.62, 0, 0] });
    // back upright and arm rest
    o.box('timber', leg, 0.5, leg, { pos: [s * w * 0.5, 0.72, -0.25], rot: [-lean, 0, 0] });
    o.box('timber', leg, leg, 0.5, { pos: [s * w * 0.5, 0.6, -0.02] });
  }
  o.box('timber', w + 0.02, leg, leg, { pos: [0, 0.6, -0.27] });
  o.box('timber', w + 0.02, leg, leg, { pos: [0, 0.6, 0.23] });
  // seat rails the cloth slings from
  o.box('timber', w - 0.02, leg, leg, { pos: [0, 0.47, -0.21] });
  o.box('timber', w - 0.02, leg, leg, { pos: [0, 0.47, 0.21] });
  // the seat is a sling: it hangs between the rails and the sides, deepest
  // where the last person sat; the back panel bows out between the uprights
  const seat = new THREE.PlaneGeometry(w - 0.02, 0.44, 4, 4);
  seat.rotateX(-Math.PI / 2);
  const sp = seat.attributes.position;
  const drop = 0.05 + rnd() * 0.03;
  for (let i = 0; i < sp.count; i++) {
    const fx = 1 - Math.abs(sp.getX(i) / ((w - 0.02) * 0.5));
    const fz = 1 - Math.abs(sp.getZ(i) / 0.22);
    sp.setY(i, sp.getY(i) - drop * Math.sin(fx * Math.PI * 0.5) * Math.sin(fz * Math.PI * 0.5));
  }
  o.add(cloth, seat, { pos: [0, 0.48, 0.0] });
  const back = new THREE.PlaneGeometry(w - 0.02, 0.24, 4, 2);
  const bp = back.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const fx = 1 - Math.abs(bp.getX(i) / ((w - 0.02) * 0.5));
    bp.setZ(i, bp.getZ(i) - 0.03 * Math.sin(fx * Math.PI));
  }
  o.add(cloth, back, { pos: [0, 0.86, -0.26 - lean * 0.15], rot: [-lean, 0, 0] });
  return o;
}

/** Folding camp table: aluminium frame, slatted timber top. */
export function table(rnd, w = 1.2, d = 0.7, h = 0.74) {
  const o = new Obj();
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      o.cyl('alu', 0.013, 0.013, h - 0.03, 8, { pos: [sx * (w * 0.5 - 0.06), 0, sz * (d * 0.5 - 0.06)], rot: [sz * 0.03, 0, -sx * 0.02] });
    }
    o.box('alu', 0.02, 0.02, d - 0.14, { pos: [sx * (w * 0.5 - 0.06), h * 0.45, 0] });
  }
  o.box('alu', w - 0.06, 0.03, d - 0.06, { pos: [0, h - 0.035, 0] });
  const slats = 6;
  for (let i = 0; i < slats; i++) {
    const z = -d * 0.5 + (d / slats) * (i + 0.5);
    o.box('timberWarm', w, 0.018, d / slats - 0.01, { pos: [0, h - 0.01, z] });
  }
  return o;
}

/** Picnic table: A-frame bench, the fixed-together kind, heavy sawn timber. */
export function picnicTable(rnd) {
  const o = new Obj();
  const L = 1.8 + rnd() * 0.2;
  for (const s of [-1, 1]) {
    const x = s * (L * 0.5 - 0.22);
    o.box('timber', 0.09, 0.85, 0.045, { pos: [x, 0.4, 0.0], rot: [0.55, 0, 0] });
    o.box('timber', 0.09, 0.85, 0.045, { pos: [x, 0.4, 0.0], rot: [-0.55, 0, 0] });
    o.box('timber', 0.09, 0.045, 1.5, { pos: [x, 0.42, 0] });
    o.box('timber', 0.09, 0.045, 0.8, { pos: [x, 0.72, 0] });
  }
  for (let i = 0; i < 4; i++) o.box('timber', L, 0.04, 0.16, { pos: [0, 0.76, -0.27 + i * 0.18] });
  for (const s of [-1, 1]) {
    o.box('timber', L, 0.04, 0.15, { pos: [0, 0.46, s * 0.68] });
    o.box('timber', L, 0.04, 0.15, { pos: [0, 0.46, s * 0.52] });
  }
  return o;
}

/** Log bench: a split log on two short rounds. */
export function logBench(rnd) {
  const o = new Obj();
  const L = 1.6 + rnd() * 0.5;
  o.cyl('deadwood', 0.13, 0.15, L, 10, { pos: [-L * 0.5, 0.36, 0], rot: [0, 0, -Math.PI / 2] });
  o.cyl('deadwood', 0.16, 0.18, 0.28, 10, { pos: [-L * 0.35, 0, 0] });
  o.cyl('deadwood', 0.15, 0.17, 0.28, 10, { pos: [L * 0.35, 0, 0] });
  return o;
}

/**
 * A slatted timber crate, lid nailed on or slid half off. The body is one box
 * carrying the crate map — three planks, battens, stencil and edge wear per
 * face — with real battens standing proud at the corners and a plank lid.
 */
export function crate(rnd, w = 0.6, h = 0.45, d = 0.45, open = false) {
  const o = new Obj();
  const t = 0.02;
  o.box('crate', w, h, d, { pos: [0, h * 0.5, 0], rot: [0, 0, (rnd() - 0.5) * 0.01] }, { uv: false, r: 0 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.box('timber', 0.035, h + 0.01, 0.035, { pos: [sx * (w * 0.5 - 0.005), h * 0.5, sz * (d * 0.5 - 0.005)] });
  if (open) {
    o.box('crate', w, t, d, { pos: [w * 0.18, h + t, d * 0.12], rot: [0.05, 0.1, 0.12] }, { uv: false, r: 0 });
  } else {
    o.box('crate', w + 0.01, t, d + 0.01, { pos: [0, h + t * 0.5, 0] }, { uv: false, r: 0 });
  }
  return o;
}

/** Roto-moulded cooler: box with a lid, a lip, and rope handles. */
export function cooler(rnd, key = 'poly', w = 0.62, h = 0.42, d = 0.4) {
  const o = new Obj();
  o.box(key, w, h * 0.72, d, { pos: [0, h * 0.36, 0] }, { r: 0.03 });
  o.box(key, w + 0.02, h * 0.28, d + 0.02, { pos: [0, h * 0.86, 0], rot: [0, 0, rnd() < 0.3 ? 0.15 : 0] }, { r: 0.03 });
  o.box('polyBlack', w * 0.4, 0.02, 0.05, { pos: [0, h * 0.75, d * 0.5 + 0.01] });
  for (const s of [-1, 1]) o.tube('rope', slackLine([s * (w * 0.5 + 0.01), h * 0.5, -0.08], [s * (w * 0.5 + 0.01), h * 0.5, 0.08], -0.07, 4), 0.008, 6);
  return o;
}

/** Jerry can, 20 l. `key` picks the plastic or the painted steel. */
export function jerry(rnd, key = 'polyGreen') {
  const o = new Obj();
  const lean = (rnd() - 0.5) * 0.08;
  o.box(key, 0.34, 0.42, 0.17, { pos: [0, 0.21, 0], rot: [0, 0, lean] }, { r: 0.025 });
  o.box(key, 0.3, 0.05, 0.13, { pos: [0, 0.445, 0], rot: [0, 0, lean] }, { r: 0.015 });
  // three-handle top and the cap
  for (const x of [-0.07, 0, 0.07]) o.box(key, 0.05, 0.025, 0.03, { pos: [x, 0.485, 0], rot: [0, 0, lean] });
  o.box(key, 0.19, 0.012, 0.03, { pos: [0, 0.505, 0], rot: [0, 0, lean] });
  o.cyl(key === 'polyRed' || key === 'steelRed' ? 'steelBlack' : 'polyBlack', 0.03, 0.03, 0.03, 10, { pos: [0.12, 0.47, 0], rot: [0, 0, lean] });
  return o;
}

/** 200 l steel drum, on end. Ribs at thirds, a bung on the lid. */
export function drum(rnd, key = 'steelRed') {
  const o = new Obj();
  o.cyl(key, 0.29, 0.29, 0.88, 20);
  for (const y of [0.3, 0.58]) o.cyl(key, 0.3, 0.3, 0.035, 20, { pos: [0, y, 0] });
  o.cyl(key, 0.3, 0.3, 0.03, 20, { pos: [0, 0.865, 0] });
  o.cyl('steelBlack', 0.035, 0.035, 0.02, 10, { pos: [0.16, 0.89, 0] });
  return o;
}

/** Gas bottle with a regulator. */
export function gasBottle(rnd, key = 'steelBlue') {
  const o = new Obj();
  o.cyl(key, 0.15, 0.15, 0.55, 18, { pos: [0, 0.03, 0] });
  o.add(key, new THREE.SphereGeometry(0.15, 18, 8, 0, TAU, 0, Math.PI * 0.5), { pos: [0, 0.58, 0] });
  o.cyl(key, 0.16, 0.14, 0.03, 18);
  o.cyl(key, 0.1, 0.1, 0.08, 12, { pos: [0, 0.68, 0], rot: [0, 0, 0] }, { open: true });
  o.cyl('steel', 0.02, 0.02, 0.07, 8, { pos: [0, 0.7, 0] });
  o.box('steel', 0.09, 0.05, 0.05, { pos: [0, 0.78, 0] });
  return o;
}

/** Hurricane lantern; the glass is the emitter and lights.js drives it. */
export function lantern(rnd) {
  const o = new Obj();
  o.cyl('steelBlack', 0.075, 0.08, 0.06, 12);
  o.cyl('steelBlack', 0.035, 0.07, 0.03, 12, { pos: [0, 0.06, 0] });
  o.cyl('lampGlass', 0.045, 0.035, 0.12, 12, { pos: [0, 0.09, 0] }, { uv: false });
  o.cyl('steelBlack', 0.05, 0.03, 0.03, 12, { pos: [0, 0.21, 0] });
  o.cyl('steelBlack', 0.03, 0.05, 0.03, 12, { pos: [0, 0.24, 0] });
  for (const s of [-1, 1]) o.cyl('wire', 0.004, 0.004, 0.2, 5, { pos: [s * 0.065, 0.06, 0] });
  o.tube('wire', slackLine([-0.05, 0.27, 0], [0.05, 0.27, 0], -0.05, 5), 0.004, 5);
  return { obj: o, lamp: { x: 0, y: 0.15, z: 0 } };
}

/** A tyre off a truck, lying flat or leaning. */
export function tyre(rnd, r = 0.4) {
  const o = new Obj();
  o.add('rubber', new THREE.TorusGeometry(r * 0.75, r * 0.27, 8, 18), { pos: [0, r * 0.27, 0], rot: [Math.PI / 2, 0, 0] });
  return o;
}

/** Wheelbarrow, parked with its nose down. */
export function wheelbarrow(rnd) {
  const o = new Obj();
  const pitch = -0.08;
  const body = profile(
    [
      [-0.32, 0.0],
      [0.32, 0.0],
      [0.4, 0.28],
      [-0.4, 0.28],
    ],
    0.85,
    { bevel: 0.01 },
  );
  o.add('steelGreen', body, { pos: [0, 0.4, 0], rot: [pitch, 0, 0] });
  for (const s of [-1, 1]) {
    o.cyl('steelBlack', 0.014, 0.014, 1.5, 8, { pos: [s * 0.28, 0.32, -0.3], rot: [Math.PI / 2 + 0.06, 0, 0] });
    o.cyl('steelBlack', 0.012, 0.012, 0.32, 8, { pos: [s * 0.26, 0.0, -0.55], rot: [0, 0, 0] });
  }
  o.add('rubber', new THREE.TorusGeometry(0.16, 0.05, 8, 16), { pos: [0, 0.2, 0.62], rot: [0, Math.PI / 2, 0] });
  o.cyl('steel', 0.03, 0.03, 0.12, 8, { pos: [0, 0.2, 0.62], rot: [0, 0, Math.PI / 2] }, { centre: true });
  return o;
}

/** Tool cart: a steel frame on two wheels with shovels, a rake and a pick stood in it. */
export function toolCart(rnd) {
  const o = new Obj();
  o.box('steelGreen', 0.7, 0.5, 0.5, { pos: [0, 0.55, 0] }, { r: 0.01 });
  for (const s of [-1, 1]) {
    o.add('rubber', new THREE.TorusGeometry(0.2, 0.06, 8, 16), { pos: [s * 0.42, 0.26, 0], rot: [0, Math.PI / 2, 0] });
    o.cyl('steelBlack', 0.015, 0.015, 0.9, 8, { pos: [s * 0.3, 0.15, -0.45], rot: [-0.45, 0, 0] });
  }
  o.cyl('steel', 0.02, 0.02, 0.9, 8, { pos: [0, 0.26, 0], rot: [0, 0, Math.PI / 2] }, { centre: true });
  // handles standing up out of the cart
  const tools = [
    ['timberWarm', 0.1, 1.4, 0.05],
    ['timberWarm', -0.12, 1.5, -0.1],
    ['timberWarm', 0.22, 1.3, -0.14],
    ['timberWarm', -0.02, 1.45, 0.14],
  ];
  for (const [key, x, h, z] of tools) {
    o.cyl(key, 0.017, 0.017, h, 7, { pos: [x, 0.35, z], rot: [(rnd() - 0.5) * 0.2, 0, (rnd() - 0.5) * 0.25] });
  }
  o.box('steel', 0.22, 0.28, 0.015, { pos: [0.1, 1.72, 0.05], rot: [0.1, 0.3, 0] }); // shovel blade
  o.box('steel', 0.3, 0.05, 0.02, { pos: [-0.12, 1.86, -0.1], rot: [0, 0.2, 0] }); // rake head
  o.box('steel', 0.4, 0.04, 0.04, { pos: [0.22, 1.66, -0.14], rot: [0, -0.4, 0] }); // pick head
  return o;
}

/** A stack of split firewood between two stakes. */
export function woodpile(rnd, L = 2.0, H = 0.9) {
  const o = new Obj();
  for (const s of [-1, 1]) o.cyl('pole', 0.04, 0.05, H + 0.2, 8, { pos: [s * (L * 0.5 + 0.03), 0, 0], rot: [0, 0, -s * 0.05] });
  const rows = Math.round(H / 0.13);
  for (let r = 0; r < rows; r++) {
    const y = 0.065 + r * 0.13;
    let x = -L * 0.5 + 0.07;
    while (x < L * 0.5 - 0.06) {
      const rad = 0.05 + rnd() * 0.035;
      const len = 0.38 + rnd() * 0.08;
      o.cyl('deadwood', rad, rad * (0.85 + rnd() * 0.3), len, 7, { pos: [x, y, -len * 0.5 + (rnd() - 0.5) * 0.06], rot: [Math.PI / 2 + (rnd() - 0.5) * 0.08, 0, (rnd() - 0.5) * 0.12] });
      x += rad * 2 + 0.01;
    }
  }
  return o;
}

/** A chopping block: a stump on end with the axe left in it. */
export function choppingBlock(rnd) {
  const o = new Obj();
  o.cyl('deadwood', 0.19, 0.22, 0.45, 12, { rot: [0.02, 0, 0.03] });
  // the axe: haft leaning back, head bitten into the top
  const lean = -0.35;
  o.cyl('timberWarm', 0.017, 0.02, 0.8, 7, { pos: [0.02, 0.44, -0.03], rot: [lean, 0, 0.1] });
  o.box('steel', 0.05, 0.16, 0.02, { pos: [0.02 - Math.sin(0.1) * 0.06, 0.5, -0.03 - Math.sin(lean) * 0.04], rot: [lean, 0, 0.1] });
  o.box('steel', 0.18, 0.09, 0.03, { pos: [0.02, 0.44, -0.03 + 0.06], rot: [0.1, 0, 0.1] });
  return o;
}

/** Split wood dropped in a loose heap: quarter rounds at all angles. */
export function splitWood(rnd, count = 6) {
  const o = new Obj();
  for (let i = 0; i < count; i++) {
    const ang = rnd() * TAU;
    const r = Math.sqrt(rnd()) * 0.5;
    const len = 0.32 + rnd() * 0.12;
    const yaw = rnd() * TAU;
    const dir = new THREE.Vector3(Math.cos(yaw), (rnd() - 0.5) * 0.25, Math.sin(yaw)).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const rad = 0.045 + rnd() * 0.02;
    const lift = i < count * 0.6 ? rad : rad * 2.4;
    o.cyl('deadwood', rad, rad * 1.1, len, 6, { pos: [Math.cos(ang) * r, lift, Math.sin(ang) * r], quat: q }, { centre: true });
  }
  return o;
}

/** Camp bed: a folding cot with a sleeping bag thrown on it. */
export function cot(rnd) {
  const o = new Obj();
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) o.box('alu', 0.02, 0.42, 0.02, { pos: [sx * 0.36, 0.21, sz * 0.9], rot: [0, 0, -sx * 0.45] });
  }
  o.box('canvasGreen', 0.76, 0.03, 1.9, { pos: [0, 0.42, 0] });
  o.box('poly', 0.6, 0.14, 1.5, { pos: [0.02, 0.5, 0.1], rot: [0, 0.03, 0] }, { r: 0.06 });
  o.box('poly', 0.4, 0.1, 0.3, { pos: [0, 0.48, -0.75] }, { r: 0.04 });
  return o;
}

/** A pile of kit under a tarp, roped down. */
export function tarpPile(rnd, w = 1.8, h = 0.9, d = 1.4) {
  const o = new Obj();
  o.add('tarp', lump(w * 0.5, h, d * 0.5, rnd, { detail: 2, rough: 0.14, flat: 0.98 }), { pos: [0, 0.02, 0] });
  for (let i = 0; i < 3; i++) {
    const x = -w * 0.35 + i * w * 0.35;
    o.tube('rope', slackLine([x, 0.02, -d * 0.62], [x, h * 0.9, 0], -0.03, 6), 0.007, 5);
    o.tube('rope', slackLine([x, h * 0.9, 0], [x, 0.02, d * 0.62], -0.03, 6), 0.007, 5);
  }
  return o;
}

/** A boulder, flat underneath, of the savanna granite. */
export function rock(rnd, r = 0.6) {
  const o = new Obj();
  const g = lump(r * (0.8 + rnd() * 0.5), r * (0.5 + rnd() * 0.4), r * (0.8 + rnd() * 0.5), rnd, {
    detail: r > 1.2 ? 3 : 2,
    rough: 0.16 + rnd() * 0.1,
    flat: 0.9,
  });
  o.add('rock', g, { pos: [0, -r * 0.05, 0], rot: [0, rnd() * TAU, 0] });
  return o;
}

/** A fallen branch: a tapering tube with two side limbs, lying on the ground. */
export function branch(rnd, L = 3.0) {
  const o = new Obj();
  const pts = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([-L * 0.5 + L * t, 0.08 + Math.sin(t * Math.PI) * 0.12 + (rnd() - 0.5) * 0.05, (rnd() - 0.5) * 0.25 * t]);
  }
  o.tube('deadwood', pts, 0.07, 7);
  for (let k = 0; k < 2; k++) {
    const t = 0.35 + k * 0.35;
    const base = pts[Math.round(t * n)];
    const side = rnd() < 0.5 ? -1 : 1;
    o.tube(
      'deadwood',
      [base, [base[0] + 0.4, base[1] + 0.35, base[2] + side * 0.6], [base[0] + 0.7, base[1] + 0.5, base[2] + side * 1.1]],
      0.035,
      6,
    );
  }
  return o;
}

/** Termite mound: a chimney of red earth at the edge of the clearing. */
export function termiteMound(rnd) {
  const o = new Obj();
  o.add('rock', lump(0.9, 1.6, 0.8, rnd, { detail: 2, rough: 0.2, flat: 1 }), { pos: [0, 0, 0] });
  o.add('rock', lump(0.45, 0.9, 0.4, rnd, { detail: 1, rough: 0.2 }), { pos: [0.1, 1.3, 0.05] });
  return o;
}

/** A pair of boots left outside a tent. */
export function boots(rnd) {
  const o = new Obj();
  for (const s of [-1, 1]) {
    o.box('rubber', 0.1, 0.1, 0.28, { pos: [s * 0.08, 0.05, 0], rot: [0, s * 0.15 * rnd(), 0] }, { r: 0.03 });
    o.box('rubber', 0.09, 0.12, 0.1, { pos: [s * 0.08, 0.12, -0.08], rot: [0, s * 0.15 * rnd(), 0] }, { r: 0.03 });
  }
  return o;
}

/** Wash stand: tripod of poles with an enamel basin. */
export function washStand(rnd) {
  const o = new Obj();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    o.cyl('pole', 0.02, 0.025, 0.95, 7, { pos: [Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22], rot: [Math.sin(a) * 0.24, 0, -Math.cos(a) * 0.24] });
  }
  o.cyl('poly', 0.2, 0.13, 0.12, 16, { pos: [0, 0.78, 0] });
  o.tube('rope', [[0.15, 0.85, 0.0], [0.2, 0.7, 0.05], [0.24, 0.5, 0.08]], 0.02, 6); // a towel hanging
  return o;
}

/** Bucket, either upright or knocked over. */
export function bucket(rnd, key = 'steel') {
  const o = new Obj();
  o.cyl(key, 0.15, 0.12, 0.3, 14);
  o.tube('wire', slackLine([-0.15, 0.3, 0], [0.15, 0.3, 0], -0.16, 6), 0.005, 5);
  return o;
}

/** Radio set with a whip aerial, on a table. */
export function radioSet(rnd) {
  const o = new Obj();
  o.box('steelBlack', 0.36, 0.14, 0.26, { pos: [0, 0.07, 0] }, { r: 0.008 });
  o.box('alu', 0.3, 0.02, 0.02, { pos: [0, 0.15, -0.05] });
  o.cyl('wire', 0.004, 0.003, 1.1, 5, { pos: [-0.14, 0.14, -0.1], rot: [0.1, 0, 0.08] });
  o.box('steelBlack', 0.08, 0.05, 0.03, { pos: [0.1, 0.05, 0.14] }); // handset
  return o;
}

/** A hand-pump sprayer / fire extinguisher, red, by the fuel store. */
export function extinguisher(rnd) {
  const o = new Obj();
  o.cyl('steelRed', 0.08, 0.08, 0.5, 14);
  o.add('steelRed', new THREE.SphereGeometry(0.08, 14, 6, 0, TAU, 0, Math.PI * 0.5), { pos: [0, 0.5, 0] });
  o.cyl('steelBlack', 0.02, 0.02, 0.1, 8, { pos: [0, 0.56, 0] });
  o.box('steelBlack', 0.12, 0.03, 0.03, { pos: [0.03, 0.66, 0] });
  o.tube('rubber', [[0.05, 0.62, 0], [0.12, 0.5, 0.02], [0.1, 0.3, 0.06]], 0.01, 6);
  return o;
}

/** Folded tarps and duffel bags: soft lumps in canvas. */
export function duffel(rnd, key = 'canvasGreen') {
  const o = new Obj();
  o.add(key, lump(0.36, 0.2, 0.22, rnd, { detail: 1, rough: 0.1, flat: 0.95 }), { pos: [0, 0.0, 0], rot: [0, rnd() * TAU, 0] });
  return o;
}

/**
 * Litter where people sit. `kind` is 'cap' (a bottle cap, face up or down),
 * 'peg' (a tent peg pulled and kicked loose), 'bottle' (an empty on its side)
 * or 'glove' (a dropped work glove). Each is a few triangles in an existing
 * material bucket, so a dozen of them cost no draw call.
 */
export function litter(rnd, kind = 'cap') {
  const o = new Obj();
  if (kind === 'cap') {
    const key = ['steelRed', 'steelYellow', 'alu', 'steelBlue'][Math.floor(rnd() * 4)];
    o.cyl(key, 0.015, 0.016, 0.006, 10, { pos: [0, 0.002, 0], rot: [(rnd() - 0.5) * 0.15, 0, 0] });
  } else if (kind === 'peg') {
    // rot [pi/2, 0, yaw] lays the cylinder's axis along (-sin yaw, 0, cos yaw)
    const yaw = rnd() * TAU;
    const ax = -Math.sin(yaw);
    const az = Math.cos(yaw);
    o.cyl('steel', 0.005, 0.007, 0.26, 6, { pos: [0, 0.008, 0], rot: [Math.PI / 2, 0, yaw] }, { centre: true });
    o.box('steel', 0.03, 0.006, 0.006, { pos: [ax * 0.12, 0.012, az * 0.12], rot: [0, -yaw, 0] });
  } else if (kind === 'bottle') {
    const yaw = rnd() * TAU;
    const ax = -Math.sin(yaw);
    const az = Math.cos(yaw);
    o.cyl('glass', 0.03, 0.032, 0.2, 10, { pos: [0, 0.031, 0], rot: [Math.PI / 2, 0, yaw] }, { centre: true, uv: false });
    o.cyl('glass', 0.013, 0.026, 0.06, 10, { pos: [ax * 0.13, 0.031, az * 0.13], rot: [Math.PI / 2, 0, yaw] }, { centre: true, uv: false });
    o.cyl('steelBlack', 0.014, 0.014, 0.02, 10, { pos: [ax * 0.165, 0.031, az * 0.165], rot: [Math.PI / 2, 0, yaw] }, { centre: true });
  } else {
    // a glove: the palm as a flat lump, thumb and fingers curled under
    o.add('canvasSand', lump(0.055, 0.02, 0.09, rnd, { detail: 1, rough: 0.12, flat: 0.95 }), { pos: [0, 0.0, 0] });
    for (let i = 0; i < 4; i++) o.cyl('canvasSand', 0.011, 0.012, 0.07, 6, { pos: [-0.033 + i * 0.022, 0.012, 0.08], rot: [Math.PI / 2 + 0.25 + rnd() * 0.2, 0, 0] });
    o.cyl('canvasSand', 0.012, 0.013, 0.06, 6, { pos: [0.06, 0.012, 0.01], rot: [Math.PI / 2, 0, -0.9] });
  }
  return o;
}

/** A woven mat put down under a table: sand canvas with a lift at the corners. */
export function mat(rnd, w = 3.0, d = 2.2) {
  const o = new Obj();
  const g = new THREE.PlaneGeometry(w, d, 6, 5);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const fx = Math.abs(p.getX(i) / (w * 0.5));
    const fz = Math.abs(p.getZ(i) / (d * 0.5));
    // corners curl up a little, and the middle undulates on the dirt beneath
    p.setY(i, 0.012 + Math.pow(fx * fz, 3) * 0.05 + Math.sin(p.getX(i) * 3.1 + p.getZ(i) * 2.3) * 0.004);
  }
  g.computeVertexNormals();
  o.add('canvasSand', g, { rot: [0, (rnd() - 0.5) * 0.06, 0] });
  return o;
}

/** Rubbish bin: half a drum with a lid propped on it. */
export function bin(rnd) {
  const o = new Obj();
  o.cyl('steelBlack', 0.26, 0.25, 0.6, 16);
  o.cyl('steelBlack', 0.27, 0.27, 0.02, 16, { pos: [0.08, 0.62, 0], rot: [0, 0, 0.35] });
  return o;
}
