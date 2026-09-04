import * as THREE from 'three';
import { profile } from '../lib/geo.js';
import { Obj, slackLine } from './kit.js';
import { boots, chair, cot, crate, duffel, lantern, table, washStand } from './props.js';

// ---------------------------------------------------------------------------
// Canvas. Safari tents on steel frames under separate flysheets, the mess
// marquee, staff ridge tents. All built front = +z so the door faces whatever
// the plan says it faces.
//
// A tent is mostly two things a demo gets wrong: the canvas is never a flat
// plane (it sags between the frame members and bellies where the guys pull),
// and it has a lot of hardware — poles, guys, pegs, toggles, a rolled door.
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;

/**
 * Two sloped canvas panels meeting at a ridge, with a little sag baked in as a
 * bend along the eave direction. `sag` is how far the middle of each panel
 * drops below the straight line.
 */
function gable(o, key, w, d, eaveY, ridgeY, { overhang = 0, sag = 0.04, t = 0.014 } = {}) {
  const half = w * 0.5 + overhang;
  const rise = ridgeY - eaveY;
  const slope = Math.atan2(rise, w * 0.5);
  const panelW = Math.hypot(half, (rise * half) / (w * 0.5));
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(panelW, t, d + overhang * 2, 6, 1, 8);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      // belly between the frame members, pinned at the ridge and at the eave ends
      const along = 1 - Math.abs(z / ((d + overhang * 2) * 0.5));
      const across = 1 - Math.abs(x / (panelW * 0.5));
      p.setY(i, p.getY(i) - sag * Math.sin(along * Math.PI * 0.5) * Math.sin(across * Math.PI));
    }
    const xc = s * half * 0.5;
    const yc = ridgeY - (rise * half) / w;
    o.add(key, g, { pos: [xc, yc, 0], rot: [0, 0, -s * slope] });
  }
}

/** Triangle to fill a gable end. */
function gableEnd(o, key, w, eaveY, ridgeY, z, t = 0.014) {
  const g = profile(
    [
      [-w * 0.5, eaveY],
      [w * 0.5, eaveY],
      [0, ridgeY],
    ],
    t,
    { bevel: 0 },
  );
  o.add(key, g, { pos: [0, 0, z] });
}

/** A rectangle of cloth with a belly in it. */
function wall(o, key, w, h, t, { pos, rot, belly = 0.03 } = {}) {
  const g = new THREE.BoxGeometry(w, h, t, 6, 4, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const fx = 1 - Math.abs(x / (w * 0.5));
    const fy = 1 - Math.abs(y / (h * 0.5));
    p.setZ(i, p.getZ(i) + belly * Math.sin(fx * Math.PI) * Math.sin(fy * Math.PI));
  }
  o.add(key, g, { pos, rot });
}

function peg(o, x, z, toward) {
  o.cyl('steel', 0.008, 0.012, 0.28, 6, { pos: [x, -0.05, z], rot: [-toward[1] * 0.45, 0, toward[0] * 0.45] });
}

/** Guy line from a point on the fly to a peg on the ground. */
function guy(o, from, dir, len) {
  const px = from[0] + dir[0] * len;
  const pz = from[2] + dir[1] * len;
  o.tube('rope', slackLine(from, [px, 0.12, pz], 0.06, 5), 0.006, 5);
  peg(o, px, pz, dir);
  // a tensioner slider a third of the way down
  o.box('timber', 0.06, 0.02, 0.025, { pos: [from[0] + dir[0] * len * 0.35, from[1] + (0.12 - from[1]) * 0.35, from[2] + dir[1] * len * 0.35] });
}

/**
 * Safari tent. 4 x 5 m inner tent on a steel frame with 1.75 m walls and a
 * 2.6 m ridge, a sand flysheet 25 cm above it overhanging half a metre all
 * round and running two metres forward over a veranda on two more poles. Door
 * rolled up, mesh windows on the sides, ground sheet, and the veranda dressed:
 * two chairs, a table with a lantern on it, a wash stand, boots by the door.
 */
export function safariTent(rnd, kind = 'khaki') {
  const o = new Obj();
  const lamps = [];
  const W = 4.0;
  const D = 5.0;
  const wallH = 1.75;
  const ridgeH = 2.6;
  // inner tent in the pale cloth, fly in the dark: a green fly over a sand
  // tent is the classic Kenyan outfit, and it is what separates a tent from
  // the ground at fifty metres
  const key = kind === 'sand' ? 'canvasSand' : 'canvas';
  const flyKey = kind === 'sand' ? 'canvasOlive' : 'canvasGreen';
  const frame = 'steelGreen';
  const zf = D * 0.5; // front edge
  const veranda = 2.0;

  // --- frame ---------------------------------------------------------------
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) o.cyl(frame, 0.022, 0.022, wallH, 8, { pos: [sx * W * 0.5, 0, sz * D * 0.5] });
    o.cyl(frame, 0.02, 0.02, D, 8, { pos: [sx * W * 0.5, wallH, -D * 0.5], rot: [Math.PI / 2, 0, 0] });
  }
  o.cyl(frame, 0.022, 0.022, D + 0.1, 8, { pos: [0, ridgeH, -D * 0.5 - 0.05], rot: [Math.PI / 2, 0, 0] });
  for (const sz of [-1, 1]) {
    const L = Math.hypot(W * 0.5, ridgeH - wallH);
    const a = Math.atan2(ridgeH - wallH, W * 0.5);
    o.cyl(frame, 0.018, 0.018, L, 8, { pos: [-W * 0.5, wallH, sz * D * 0.5], rot: [0, 0, -(Math.PI / 2 - a)] });
    o.cyl(frame, 0.018, 0.018, L, 8, { pos: [W * 0.5, wallH, sz * D * 0.5], rot: [0, 0, Math.PI / 2 - a] });
  }
  // veranda poles hold the fly out front
  for (const sx of [-1, 1]) o.cyl(frame, 0.022, 0.022, wallH + 0.5, 8, { pos: [sx * (W * 0.5 + 0.3), 0, zf + veranda - 0.1], rot: [0.03, 0, -sx * 0.02] });

  // --- inner tent ----------------------------------------------------------
  gable(o, key, W, D, wallH, ridgeH, { sag: 0.05 });
  for (const sx of [-1, 1]) {
    wall(o, key, D, wallH, 0.012, { pos: [sx * W * 0.5, wallH * 0.5, 0], rot: [0, Math.PI / 2, 0], belly: 0.04 * sx });
    // mesh window, zipped storm flap rolled above it
    // the walls belly outward 4 cm, so anything on them sits clear of the bulge
    o.box('polyBlack', 0.012, 0.7, 1.4, { pos: [sx * (W * 0.5 + 0.055), 1.15, -0.4] });
    o.cyl(key, 0.05, 0.05, 1.5, 8, { pos: [sx * (W * 0.5 + 0.09), 1.56, -1.15], rot: [Math.PI / 2, 0, 0] });
  }
  wall(o, key, W, wallH, 0.012, { pos: [0, wallH * 0.5, -D * 0.5], belly: -0.04 });
  // rear window with its storm flap rolled up, and a vent under the ridge
  o.box('polyBlack', 1.6, 0.6, 0.012, { pos: [0, 1.2, -D * 0.5 - 0.055] });
  o.cyl(key, 0.05, 0.05, 1.7, 8, { pos: [-0.85, 1.56, -D * 0.5 - 0.09], rot: [0, 0, -Math.PI / 2] });
  o.box('polyBlack', 0.5, 0.25, 0.012, { pos: [0, ridgeH - 0.35, -D * 0.5 - 0.03] });
  gableEnd(o, key, W, wallH, ridgeH, -D * 0.5);
  gableEnd(o, key, W, wallH, ridgeH, D * 0.5);
  // front: two panels either side of the door, the door rolled up above it
  const doorW = 1.0;
  for (const sx of [-1, 1]) {
    const pw = (W - doorW) * 0.5;
    wall(o, key, pw, wallH, 0.012, { pos: [sx * (doorW * 0.5 + pw * 0.5), wallH * 0.5, D * 0.5], belly: 0.03 });
  }
  o.cyl(key, 0.09, 0.09, doorW + 0.1, 10, { pos: [0, wallH - 0.1, D * 0.5 + 0.06], rot: [0, 0, Math.PI / 2] }, { centre: true });
  // ground sheet inside and a coir mat on the veranda
  o.box('canvasGreen', W - 0.05, 0.02, D - 0.05, { pos: [0, 0.01, 0] });
  o.box('canvasChair', 1.6, 0.02, 1.1, { pos: [0.1, 0.012, zf + 0.75], rot: [0, 0.04, 0] });

  // --- flysheet ------------------------------------------------------------
  const flyLift = 0.25;
  gable(o, flyKey, W, D + veranda, wallH + flyLift, ridgeH + flyLift, { overhang: 0.5, sag: 0.08, t: 0.012 });
  // shift the fly forward over the veranda: rebuild is simpler than moving, so
  // instead translate the last two parts
  for (let i = o.parts.length - 2; i < o.parts.length; i++) o.parts[i][1].translate(0, 0, veranda * 0.5);
  o.cyl(frame, 0.02, 0.02, D + veranda + 1.0, 8, { pos: [0, ridgeH + flyLift - 0.03, -D * 0.5 - 0.5], rot: [Math.PI / 2, 0, 0] });
  // guys off the fly corners and the veranda poles
  guy(o, [-W * 0.5 - 0.5, wallH + flyLift, -D * 0.5 - 0.5], [-0.6, -0.8], 1.4);
  guy(o, [W * 0.5 + 0.5, wallH + flyLift, -D * 0.5 - 0.5], [0.6, -0.8], 1.4);
  guy(o, [-W * 0.5 - 0.5, wallH + flyLift, zf + veranda + 0.5], [-0.8, 0.6], 1.3);
  guy(o, [W * 0.5 + 0.5, wallH + flyLift, zf + veranda + 0.5], [0.8, 0.6], 1.3);
  guy(o, [-W * 0.5 - 0.5, wallH + flyLift, 0], [-1, 0], 1.2);
  guy(o, [W * 0.5 + 0.5, wallH + flyLift, 0], [1, 0], 1.2);

  // --- veranda dressing ----------------------------------------------------
  const ch1 = chair(rnd);
  const ch2 = chair(rnd);
  o.merge(ch1, { pos: [-1.1, 0, zf + 1.1], rot: [0, 0.5 + rnd() * 0.3, 0] });
  o.merge(ch2, { pos: [1.0, 0, zf + 1.2], rot: [0, -0.6 - rnd() * 0.3, 0] });
  const tb = table(rnd, 0.6, 0.6, 0.55);
  o.merge(tb, { pos: [0.0, 0, zf + 1.5], rot: [0, rnd() * 0.3, 0] });
  const ln = lantern(rnd);
  o.merge(ln.obj, { pos: [0.1, 0.55, zf + 1.45] });
  lamps.push({ x: 0.1, y: 0.55 + ln.lamp.y, z: zf + 1.45, kind: 'lantern' });
  // a second lantern hangs off the veranda pole hook
  const ln2 = lantern(rnd);
  o.merge(ln2.obj, { pos: [W * 0.5 + 0.3, wallH + 0.15, zf + veranda - 0.1] });
  o.box('steel', 0.02, 0.02, 0.1, { pos: [W * 0.5 + 0.3, wallH + 0.45, zf + veranda - 0.06] });
  lamps.push({ x: W * 0.5 + 0.3, y: wallH + 0.15 + ln2.lamp.y, z: zf + veranda - 0.1, kind: 'lantern' });
  o.merge(washStand(rnd), { pos: [-W * 0.5 + 0.2, 0, zf + 0.5] });
  o.merge(boots(rnd), { pos: [0.65, 0, zf + 0.25], rot: [0, 0.4, 0] });
  // inside, visible through the door
  o.merge(cot(rnd), { pos: [-1.2, 0, -0.6], rot: [0, 0.02, 0] });
  o.merge(cot(rnd), { pos: [1.2, 0, -0.6], rot: [0, -0.03, 0] });
  o.merge(crate(rnd, 0.7, 0.4, 0.45), { pos: [1.2, 0, 1.6], rot: [0, 0.1, 0] });
  o.merge(duffel(rnd), { pos: [-0.9, 0, 1.5] });
  return { obj: o, lamps };
}

/**
 * Mess marquee: 9 x 6 m, open on three sides, the fourth rolled to head
 * height. Six perimeter poles, two king poles, a valance at the eave, and a
 * cross of string lights hung inside the roof. Set for dinner.
 */
export function messTent(rnd, { w = 9, d = 6, ridge = 3.3, eave = 2.3 } = {}) {
  const o = new Obj();
  const lamps = [];
  const key = 'canvasOlive';
  const poleKey = 'steelWhite';
  // ridge runs along x; front (+z) and back are the long sides
  gable(o, key, d, w, eave, ridge, { overhang: 0.35, sag: 0.1, t: 0.014 });
  // the gable built along z; turn it so the ridge runs along x
  for (let i = o.parts.length - 2; i < o.parts.length; i++) o.parts[i][1].rotateY(Math.PI / 2);
  // gable ends
  for (const s of [-1, 1]) {
    const g = profile(
      [
        [-d * 0.5, eave],
        [d * 0.5, eave],
        [0, ridge],
      ],
      0.014,
      { bevel: 0 },
    );
    o.add(key, g, { pos: [s * w * 0.5, 0, 0], rot: [0, Math.PI / 2, 0] });
  }
  // valance: a 30 cm skirt hanging from every eave, scalloped at the bottom edge
  const skirt = (len, pos, rot) => {
    const g = new THREE.BoxGeometry(len, 0.3, 0.012, Math.max(4, Math.round(len * 3)), 2, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) < -0.1) p.setY(i, p.getY(i) + 0.06 * Math.sin((p.getX(i) / len) * Math.PI * len * 2));
    }
    o.add(key, g, { pos, rot });
  };
  skirt(w + 0.7, [0, eave - 0.14, d * 0.5 + 0.35], [0, 0, 0]);
  skirt(w + 0.7, [0, eave - 0.14, -d * 0.5 - 0.35], [0, 0, 0]);
  skirt(d + 0.7, [w * 0.5 + 0.35, eave - 0.14, 0], [0, Math.PI / 2, 0]);
  skirt(d + 0.7, [-w * 0.5 - 0.35, eave - 0.14, 0], [0, Math.PI / 2, 0]);
  // poles
  const poles = [];
  for (const sx of [-1, 0, 1]) {
    for (const sz of [-1, 1]) poles.push([sx * w * 0.5, sz * d * 0.5]);
  }
  for (const [x, z] of poles) {
    o.cyl(poleKey, 0.03, 0.035, eave + 0.05, 10, { pos: [x, 0, z] });
    // each perimeter pole is guyed outwards
    const dir = [x === 0 ? 0 : Math.sign(x) * 0.6, Math.sign(z) * 0.8];
    const n = Math.hypot(dir[0], dir[1]);
    guy(o, [x, eave, z], [dir[0] / n, dir[1] / n], 1.6);
  }
  for (const sx of [-1, 1]) o.cyl(poleKey, 0.035, 0.04, ridge, 10, { pos: [sx * w * 0.25, 0, 0] });
  o.cyl(poleKey, 0.02, 0.02, w + 0.4, 8, { pos: [-w * 0.5 - 0.2, ridge - 0.02, 0], rot: [0, 0, -Math.PI / 2] });
  // back wall rolled up under the eave
  o.cyl(key, 0.12, 0.12, w - 0.1, 10, { pos: [-w * 0.5 + 0.05, eave - 0.15, -d * 0.5 + 0.06], rot: [0, 0, -Math.PI / 2] });
  // ground sheet
  o.box('canvasChair', w - 0.4, 0.02, d - 0.4, { pos: [0, 0.01, 0] });

  // string lights: two catenaries between the king poles and along the front eave
  const bulbs = (a, b, n, sag) => {
    o.tube('wire', slackLine(a, b, sag, 8), 0.004, 4);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const s = Math.sin(t * Math.PI);
      lamps.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t - sag * s - 0.06, z: a[2] + (b[2] - a[2]) * t, kind: 'bulb' });
    }
  };
  bulbs([-w * 0.25, ridge - 0.35, 0], [w * 0.25, ridge - 0.35, 0], 10, 0.25);
  bulbs([-w * 0.5, eave + 0.1, d * 0.5], [w * 0.5, eave + 0.1, d * 0.5], 16, 0.3);
  bulbs([-w * 0.5, eave + 0.1, -d * 0.5], [-w * 0.5, eave + 0.1, d * 0.5], 10, 0.2);
  // a lantern over each table
  for (const x of [-2.2, 2.2]) {
    o.tube('rope', [[x, ridge - 0.1, 0], [x, ridge - 0.9, 0]], 0.006, 5);
    const ln = lantern(rnd);
    o.merge(ln.obj, { pos: [x, ridge - 1.2, 0] });
    lamps.push({ x, y: ridge - 1.2 + ln.lamp.y, z: 0, kind: 'lantern' });
  }
  // two long tables, chairs round them, a serving table at the back
  for (const x of [-2.2, 2.2]) {
    o.merge(table(rnd, 2.4, 0.9, 0.76), { pos: [x, 0, 0.1] });
    for (let i = 0; i < 3; i++) {
      const cx = x - 0.8 + i * 0.8;
      o.merge(chair(rnd), { pos: [cx + (rnd() - 0.5) * 0.1, 0, 0.1 + 0.85], rot: [0, Math.PI + (rnd() - 0.5) * 0.5, 0] });
      o.merge(chair(rnd), { pos: [cx + (rnd() - 0.5) * 0.1, 0, 0.1 - 0.85], rot: [0, (rnd() - 0.5) * 0.5, 0] });
    }
    // a couple of things on the table: a lantern base, a stack of plates, a jug
    o.cyl('poly', 0.1, 0.1, 0.06, 12, { pos: [x - 0.6, 0.76, 0.2] });
    o.cyl('alu', 0.06, 0.05, 0.22, 10, { pos: [x + 0.5, 0.76, -0.1] });
    o.cyl('poly', 0.11, 0.1, 0.04, 12, { pos: [x + 0.1, 0.76, 0.25] });
  }
  o.merge(table(rnd, 1.6, 0.7, 0.8), { pos: [0, 0, -d * 0.5 + 0.7], rot: [0, 0.02, 0] });
  o.merge(crate(rnd, 0.5, 0.35, 0.4), { pos: [-0.4, 0.8, -d * 0.5 + 0.7] });
  o.merge(crate(rnd, 0.5, 0.35, 0.4, true), { pos: [0.5, 0.8, -d * 0.5 + 0.7], rot: [0, 0.2, 0] });
  // and a hurricane lantern on the serving table
  const ln3 = lantern(rnd);
  o.merge(ln3.obj, { pos: [0.05, 0.8, -d * 0.5 + 0.6] });
  lamps.push({ x: 0.05, y: 0.8 + ln3.lamp.y, z: -d * 0.5 + 0.6, kind: 'lantern' });
  return { obj: o, lamps };
}

/** Staff ridge tent, 2.2 x 2.6, green, pegged straight to the ground. */
export function ridgeTent(rnd) {
  const o = new Obj();
  const W = 2.2;
  const D = 2.6;
  const H = 1.7;
  const key = 'canvasGreen';
  for (const sz of [-1, 1]) o.cyl('pole', 0.025, 0.03, H, 7, { pos: [0, 0, sz * D * 0.5] });
  o.cyl('pole', 0.02, 0.02, D + 0.3, 7, { pos: [0, H, -D * 0.5 - 0.15], rot: [Math.PI / 2, 0, 0] });
  gable(o, key, W, D, 0.25, H, { overhang: 0.1, sag: 0.05, t: 0.012 });
  wall(o, key, W - 0.1, 0.27, 0.012, { pos: [0, 0.13, -D * 0.5], belly: -0.02 });
  gableEnd(o, key, W - 0.1, 0.25, H - 0.02, -D * 0.5 + 0.01);
  // front flap tied open to one side
  const flap = profile(
    [
      [0, 0.25],
      [W * 0.5, 0.25],
      [0, H - 0.05],
    ],
    0.012,
    { bevel: 0 },
  );
  o.add(key, flap, { pos: [0, 0, D * 0.5 + 0.02], rot: [0, 0.35, 0] });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) guy(o, [sx * (W * 0.5 + 0.1), 0.28, sz * (D * 0.5 + 0.1)], [sx * 0.7, sz * 0.7], 0.6);
    guy(o, [0, H, sx * (D * 0.5 + 0.15)], [0, sx], 1.3);
  }
  o.merge(cot(rnd), { pos: [0, 0, -0.1], rot: [0, 0.02, 0] });
  o.merge(duffel(rnd), { pos: [-0.7, 0, D * 0.5 + 0.3] });
  return { obj: o, lamps: [] };
}

/**
 * Kitchen shelter: a lean-to of galvanised sheet on timber poles, half-walled
 * with timber slats on the weather side. Under it: worktable, gas rings and a
 * bottle, pots, wash basins, water cans, a bin, crates of stores.
 */
export function kitchenShelter(rnd, { w = 5.5, d = 4.2, ridge = 3.0, eave = 2.2 } = {}, props) {
  const o = new Obj();
  const lamps = [];
  const { gasBottle, jerry, crate: crateF, bucket, cooler, bin } = props;
  // poles: tall at the back (-z), short at the front
  for (const sx of [-1, 0, 1]) {
    o.cyl('pole', 0.06, 0.07, ridge, 8, { pos: [sx * w * 0.5, 0, -d * 0.5], rot: [0.01 * sx, 0, 0] });
    o.cyl('pole', 0.055, 0.065, eave, 8, { pos: [sx * w * 0.5, 0, d * 0.5], rot: [-0.01, 0, 0.01 * sx] });
  }
  // purlins and the sheet roof
  const slope = Math.atan2(ridge - eave, d);
  const L = Math.hypot(d, ridge - eave);
  for (const sx of [-1, 0, 1]) o.box('timber', 0.06, 0.1, L + 0.5, { pos: [sx * w * 0.5, (ridge + eave) * 0.5 + 0.05, 0], rot: [slope, 0, 0] });
  for (let i = 0; i < 4; i++) {
    const t = -0.45 + i * 0.3;
    o.box('timber', w + 0.4, 0.06, 0.06, { pos: [0, (ridge + eave) * 0.5 + 0.12 - t * (ridge - eave), t * d] });
  }
  // sheets overlap: five 1.2 m sheets with a lip each
  for (let i = 0; i < 5; i++) {
    const x = -w * 0.5 - 0.15 + i * 1.18 + 0.59;
    o.box('galv', 1.2, 0.012, L + 0.7, { pos: [x, (ridge + eave) * 0.5 + 0.17 + i * 0.004, 0.05], rot: [slope, 0, (rnd() - 0.5) * 0.01] });
  }
  // half wall of slats on the back and the west end
  for (let i = 0; i < 6; i++) {
    o.box('timber', w, 0.11, 0.025, { pos: [0, 0.2 + i * 0.16, -d * 0.5 + 0.03], rot: [0, 0, (rnd() - 0.5) * 0.004] });
    o.box('timber', 0.025, 0.11, d * 0.55, { pos: [-w * 0.5 + 0.03, 0.2 + i * 0.16, -d * 0.22] });
  }
  // work table along the back, a second across the west end
  o.merge(table(rnd, 3.0, 0.75, 0.85), { pos: [-0.6, 0, -d * 0.5 + 0.55] });
  o.merge(table(rnd, 1.6, 0.7, 0.85), { pos: [-w * 0.5 + 0.55, 0, 0.4], rot: [0, Math.PI / 2, 0] });
  // two-burner on the table, gas bottle under it
  o.box('steelBlack', 0.6, 0.08, 0.36, { pos: [-1.4, 0.89, -d * 0.5 + 0.55] }, { r: 0.01 });
  for (const x of [-1.55, -1.25]) o.cyl('steel', 0.09, 0.09, 0.02, 12, { pos: [x, 0.93, -d * 0.5 + 0.55] });
  o.cyl('alu', 0.14, 0.12, 0.16, 14, { pos: [-1.55, 0.94, -d * 0.5 + 0.55] });
  o.cyl('steelBlack', 0.11, 0.1, 0.1, 14, { pos: [-1.25, 0.94, -d * 0.5 + 0.55] });
  o.merge(gasBottle(rnd), { pos: [-1.4, 0, -d * 0.5 + 0.45] });
  o.tube('rubber', [[-1.4, 0.78, -d * 0.5 + 0.45], [-1.42, 0.86, -d * 0.5 + 0.55], [-1.4, 0.9, -d * 0.5 + 0.55]], 0.008, 6);
  // wash basins, a stack of plates, a chopping board, a kettle
  o.cyl('poly', 0.22, 0.17, 0.14, 16, { pos: [0.2, 0.86, -d * 0.5 + 0.55] });
  o.cyl('poly', 0.22, 0.17, 0.14, 16, { pos: [0.7, 0.86, -d * 0.5 + 0.55] });
  o.cyl('poly', 0.12, 0.12, 0.08, 14, { pos: [-0.5, 0.86, -d * 0.5 + 0.45] });
  o.box('timberWarm', 0.4, 0.02, 0.28, { pos: [-0.5, 0.87, -d * 0.5 + 0.7], rot: [0, 0.2, 0] });
  o.cyl('alu', 0.1, 0.09, 0.18, 14, { pos: [-w * 0.5 + 0.55, 0.86, 0.1] });
  // stores: water cans, cooler, crates, a drum for a bin
  for (let i = 0; i < 4; i++) o.merge(jerry(rnd, 'polyBlue'), { pos: [-w * 0.5 + 0.35 + i * 0.4, 0, d * 0.5 - 0.4], rot: [0, (rnd() - 0.5) * 0.4, 0] });
  o.merge(cooler(rnd, 'polyBlue'), { pos: [1.2, 0, -d * 0.5 + 1.4], rot: [0, 0.3, 0] });
  o.merge(cooler(rnd, 'poly'), { pos: [1.9, 0, -d * 0.5 + 1.3], rot: [0, -0.2, 0] });
  o.merge(crateF(rnd, 0.6, 0.45, 0.45), { pos: [2.2, 0, -d * 0.5 + 0.5] });
  o.merge(crateF(rnd, 0.6, 0.45, 0.45), { pos: [2.2, 0.47, -d * 0.5 + 0.5], rot: [0, 0.1, 0] });
  o.merge(crateF(rnd, 0.6, 0.4, 0.45, true), { pos: [1.55, 0, -d * 0.5 + 0.5], rot: [0, -0.05, 0] });
  o.merge(bin(rnd), { pos: [w * 0.5 - 0.4, 0, d * 0.5 - 0.5] });
  o.merge(bucket(rnd), { pos: [-w * 0.5 + 1.1, 0, d * 0.5 - 0.6] });
  // a lantern hung from the front purlin
  const ln = lantern(rnd);
  o.tube('wire', [[0.3, eave + 0.05, d * 0.5 - 0.2], [0.3, eave - 0.25, d * 0.5 - 0.2]], 0.004, 4);
  o.merge(ln.obj, { pos: [0.3, eave - 0.55, d * 0.5 - 0.2] });
  lamps.push({ x: 0.3, y: eave - 0.55 + ln.lamp.y, z: d * 0.5 - 0.2, kind: 'lantern' });
  // string of bulbs along the front eave
  o.tube('wire', slackLine([-w * 0.5, eave + 0.05, d * 0.5 + 0.1], [w * 0.5, eave + 0.05, d * 0.5 + 0.1], 0.2, 8), 0.004, 4);
  for (let i = 1; i < 10; i++) {
    const t = i / 10;
    lamps.push({ x: -w * 0.5 + w * t, y: eave + 0.05 - 0.2 * Math.sin(t * Math.PI) - 0.06, z: d * 0.5 + 0.1, kind: 'bulb' });
  }
  return { obj: o, lamps };
}

export { gable, gableEnd, wall, guy, peg };
