import * as THREE from 'three';
import { profile } from '../lib/geo.js';
import { lump, Obj, slackLine } from './kit.js';
import { gable, guy } from './tents.js';
import { chair, crate, drum, extinguisher, jerry, lantern, radioSet, table, tyre } from './props.js';

// ---------------------------------------------------------------------------
// Built things: the ranger cabin and the store hut on plinths, the shower and
// latrine block, the lookout, the radio mast, the solar frame, the water tank
// on its stand, the fuel store, fences, the gate, signs.
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2;

/** Vertical board-and-batten wall with a belly so it is not one flat plane. */
function boardWall(o, w, h, { pos, rot, key = 'timber' }) {
  const g = new THREE.BoxGeometry(w, h, 0.03, Math.max(2, Math.round(w * 2)), 2, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const fx = 1 - Math.abs(p.getX(i) / (w * 0.5));
    p.setZ(i, p.getZ(i) + 0.012 * Math.sin(fx * Math.PI));
  }
  o.add(key, g, { pos, rot }, { swap: true });
  // battens every 0.4 m
  const n = Math.floor(w / 0.4);
  for (let i = 0; i <= n; i++) {
    const x = -w * 0.5 + (w / n) * i;
    const g2 = new THREE.BoxGeometry(0.05, h - 0.02, 0.025);
    g2.translate(x, 0, 0.026);
    o.add(key, g2, { pos, rot });
  }
}

/** Corrugated roof: overlapping 1.2 m sheets on purlins, both slopes. */
function sheetRoof(o, w, d, eaveY, ridgeY, { overhang = 0.45, rnd }) {
  const rise = ridgeY - eaveY;
  const slope = Math.atan2(rise, d * 0.5);
  const L = (d * 0.5 + overhang) / Math.cos(slope);
  for (const s of [-1, 1]) {
    const zc = s * (d * 0.5 + overhang) * 0.5;
    const yc = ridgeY - (rise * (d * 0.5 + overhang)) / d;
    for (let i = 0; i < 3; i++) {
      o.box('timber', w + overhang * 2, 0.06, 0.05, { pos: [0, yc - 0.06 + (i - 1) * (rise * 0.33) * -s, zc + (i - 1) * (L * 0.33) * Math.cos(slope)], rot: [0, 0, 0] });
    }
    const sheets = Math.ceil((w + overhang * 2) / 1.15);
    for (let i = 0; i < sheets; i++) {
      const x = -(w + overhang * 2) * 0.5 + 0.6 + i * 1.15;
      o.box('galv', 1.2, 0.012, L, { pos: [x, yc + i * 0.004, zc], rot: [s * slope, 0, (rnd() - 0.5) * 0.008] });
    }
  }
  // ridge capping
  o.box('galv', w + overhang * 2 + 0.05, 0.015, 0.36, { pos: [0, ridgeY + 0.04, 0] });
}

/**
 * Ranger cabin. 5.2 x 4.2 on nine concrete plinths 0.6 m high, timber floor,
 * board-and-batten walls, a sheet roof with a deep overhang, a veranda across
 * the front with steps, a door and shuttered windows. Dressed as the radio
 * room: a table with the set and a whip aerial, a chair, a lantern on a hook,
 * a notice by the door, a water filter, spare tyre under the floor.
 */
export function cabin(rnd, { w = 5.2, d = 4.2, wallH = 2.4, plinth = 0.6, veranda = 1.6, sign = 'signOffice' } = {}) {
  const o = new Obj();
  const lamps = [];
  const floorY = plinth + 0.08;
  const D = d + veranda; // full depth including the veranda, front at +z
  const zBack = -D * 0.5;
  const zFront = D * 0.5;
  const zWall = zFront - veranda; // front wall
  // plinths
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const x = -w * 0.5 + 0.15 + (i * (w - 0.3)) / 2;
      const z = zBack + 0.15 + (j * (D - 0.3)) / 2;
      o.box('rock', 0.3, plinth, 0.3, { pos: [x + (rnd() - 0.5) * 0.04, plinth * 0.5, z + (rnd() - 0.5) * 0.04], rot: [0, (rnd() - 0.5) * 0.1, 0] }, { r: 0.02 });
    }
  }
  // bearers and floor
  for (let j = 0; j < 3; j++) o.box('timber', w + 0.1, 0.12, 0.1, { pos: [0, plinth + 0.06, zBack + 0.15 + (j * (D - 0.3)) / 2] });
  const boards = Math.round(D / 0.15);
  for (let i = 0; i < boards; i++) {
    o.box('timber', w + 0.06, 0.03, 0.14, { pos: [0, floorY - 0.015, zBack + 0.075 + i * (D / boards)] });
  }
  // walls
  boardWall(o, w, wallH, { pos: [0, floorY + wallH * 0.5, zBack + 0.015] });
  boardWall(o, d, wallH, { pos: [-w * 0.5 + 0.015, floorY + wallH * 0.5, zBack + d * 0.5], rot: [0, Math.PI / 2, 0] });
  boardWall(o, d, wallH, { pos: [w * 0.5 - 0.015, floorY + wallH * 0.5, zBack + d * 0.5], rot: [0, Math.PI / 2, 0] });
  // front wall in two pieces around the door
  const doorW = 0.9;
  const doorX = -0.9;
  boardWall(o, doorX - doorW * 0.5 + w * 0.5, wallH, { pos: [(-w * 0.5 + doorX - doorW * 0.5) * 0.5, floorY + wallH * 0.5, zWall - 0.015] });
  boardWall(o, w * 0.5 - (doorX + doorW * 0.5), wallH, { pos: [(w * 0.5 + doorX + doorW * 0.5) * 0.5, floorY + wallH * 0.5, zWall - 0.015] });
  o.box('timber', doorW + 0.1, 0.35, 0.03, { pos: [doorX, floorY + wallH - 0.17, zWall - 0.015] });
  // door, open inward a little
  const hinge = doorX - doorW * 0.5 + 0.02;
  const leaf = (doorW - 0.04) * 0.5;
  o.box('timberWarm', doorW - 0.04, wallH - 0.4, 0.04, { pos: [hinge + leaf * Math.cos(0.5), floorY + (wallH - 0.4) * 0.5, zWall - 0.05 - leaf * Math.sin(0.5)], rot: [0, 0.5, 0] });
  // windows: openings with shutters propped open on the side walls and the front
  const windowAt = (pos, rot) => {
    o.box('polyBlack', 0.9, 0.8, 0.04, { pos, rot });
    o.box('timberWarm', 1.0, 0.06, 0.06, { pos: [pos[0], pos[1] + 0.43, pos[2]], rot });
    o.box('timberWarm', 1.0, 0.06, 0.06, { pos: [pos[0], pos[1] - 0.43, pos[2]], rot });
    // shutter hinged at the top, propped out
    const g = new THREE.BoxGeometry(0.92, 0.82, 0.03);
    g.translate(0, -0.41, 0);
    o.add('timber', g, { pos: [pos[0], pos[1] + 0.43, pos[2]], rot: [rot[0] + 0.0, rot[1], rot[2]] });
    const g2 = new THREE.BoxGeometry(0.92, 0.82, 0.03);
    g2.translate(0, -0.41, 0.02);
    g2.rotateX(-1.1);
    o.add('timber', g2, { pos: [pos[0], pos[1] + 0.43, pos[2]], rot });
  };
  windowAt([0.9, floorY + 1.5, zWall - 0.02], [0, 0, 0]);
  windowAt([-w * 0.5 + 0.02, floorY + 1.5, zBack + d * 0.4], [0, -Math.PI / 2, 0]);
  windowAt([w * 0.5 - 0.02, floorY + 1.5, zBack + d * 0.4], [0, Math.PI / 2, 0]);
  // roof over the whole footprint including the veranda
  const eaveY = floorY + wallH;
  const ridgeY = eaveY + 1.0;
  sheetRoof(o, w, D, eaveY, ridgeY, { overhang: 0.5, rnd });
  // gable ends
  for (const s of [-1, 1]) {
    const g = profile(
      [
        [-D * 0.5 - 0.05, eaveY],
        [D * 0.5 + 0.05, eaveY],
        [0, ridgeY],
      ],
      0.03,
      { bevel: 0 },
    );
    o.add('timber', g, { pos: [s * (w * 0.5 - 0.02), 0, 0], rot: [0, Math.PI / 2, 0] });
  }
  // veranda posts, rail, steps
  for (const x of [-w * 0.5 + 0.1, 0.2, w * 0.5 - 0.1]) o.cyl('pole', 0.06, 0.07, wallH + 0.02, 8, { pos: [x, floorY, zFront - 0.12] });
  o.box('timber', w, 0.08, 0.08, { pos: [0, floorY + 0.95, zFront - 0.12] });
  o.box('timber', 0.08, 0.08, veranda - 0.2, { pos: [w * 0.5 - 0.1, floorY + 0.95, zWall + veranda * 0.5] });
  const stepsX = doorX + 0.3;
  for (let i = 0; i < 3; i++) {
    o.box('timber', 1.1, 0.05, 0.3, { pos: [stepsX, (floorY / 3) * (i + 1) - 0.025, zFront + 0.15 + (2 - i) * 0.3] });
    o.box('timber', 0.05, (floorY / 3) * (i + 1), 0.3, { pos: [stepsX - 0.52, (floorY / 3) * (i + 1) * 0.5, zFront + 0.15 + (2 - i) * 0.3] });
    o.box('timber', 0.05, (floorY / 3) * (i + 1), 0.3, { pos: [stepsX + 0.52, (floorY / 3) * (i + 1) * 0.5, zFront + 0.15 + (2 - i) * 0.3] });
  }
  // dressing
  o.merge(chair(rnd), { pos: [1.4, floorY, zWall + 0.7], rot: [0, 0.4, 0] });
  o.merge(table(rnd, 0.9, 0.6, 0.74), { pos: [-w * 0.5 + 0.6, floorY, zWall + 0.6], rot: [0, 0.05, 0] });
  o.merge(radioSet(rnd), { pos: [-w * 0.5 + 0.6, floorY + 0.74, zWall + 0.6], rot: [0, 0.2, 0] });
  o.box('poly', 0.3, 0.5, 0.3, { pos: [w * 0.5 - 0.4, floorY + 0.25, zWall + 0.3] }, { r: 0.04 }); // water filter
  o.cyl('steelBlack', 0.02, 0.02, 0.1, 6, { pos: [w * 0.5 - 0.4, floorY + 0.5, zWall + 0.3] });
  const ln = lantern(rnd);
  o.box('steel', 0.02, 0.02, 0.15, { pos: [0.2, eaveY - 0.25, zFront - 0.05] });
  o.merge(ln.obj, { pos: [0.2, eaveY - 0.62, zFront + 0.02] });
  lamps.push({ x: 0.2, y: eaveY - 0.62 + ln.lamp.y, z: zFront + 0.02, kind: 'lantern' });
  o.box(sign, 0.8, 0.25, 0.02, { pos: [doorX + 0.95, floorY + 1.95, zWall - 0.04] }, { uv: false });
  o.merge(tyre(rnd, 0.42), { pos: [0.8, 0, zBack + 1.0], rot: [0, 0.3, 0] });
  o.merge(crate(rnd, 0.6, 0.4, 0.4), { pos: [w * 0.5 - 0.6, 0, zBack + 2.0], rot: [0, 0.2, 0] });
  // rainwater tank off the back corner with a downpipe
  o.cyl('polyBlack', 0.55, 0.55, 1.6, 20, { pos: [w * 0.5 + 0.8, 0, zBack + 0.3] });
  o.cyl('polyBlack', 0.4, 0.55, 0.15, 20, { pos: [w * 0.5 + 0.8, 1.6, zBack + 0.3] });
  o.tube('galv', [[w * 0.5 + 0.4, eaveY + 0.05, zBack - 0.3], [w * 0.5 + 0.8, eaveY - 0.2, zBack + 0.1], [w * 0.5 + 0.8, 1.75, zBack + 0.3]], 0.04, 8);
  return { obj: o, lamps, eaveY, ridgeY };
}

/** Store hut: same construction, smaller, closed up, crates stacked by it. */
export function storeHut(rnd) {
  const c = cabin(rnd, { w: 4.2, d: 3.2, wallH: 2.2, plinth: 0.45, veranda: 0.6, sign: 'signRadio' });
  const o = c.obj;
  for (let i = 0; i < 3; i++) o.merge(crate(rnd, 0.7, 0.45, 0.5, i === 2), { pos: [-2.9, i < 2 ? i * 0.47 : 0, -0.6 + (i === 2 ? 0.8 : 0)], rot: [0, (rnd() - 0.5) * 0.3, 0] });
  o.merge(crate(rnd, 0.9, 0.5, 0.6), { pos: [-2.5, 0, 0.8], rot: [0, 0.6, 0] });
  return { obj: o, lamps: c.lamps.slice(0, 0) };
}

/**
 * Shower and latrine block: two cubicles and a shower stall of khaki canvas on
 * a steel frame, timber duckboards, a bucket shower hoisted on a rope, screened
 * on the camp side by a reed fence.
 */
export function latrineBlock(rnd) {
  const o = new Obj();
  const lamps = [];
  const cw = 1.2;
  const H = 2.1;
  const frame = 'steelGreen';
  for (let c = 0; c < 3; c++) {
    const x = -cw * 1.05 + c * cw * 1.05;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.cyl(frame, 0.02, 0.02, H, 8, { pos: [x + sx * cw * 0.5, 0, sz * cw * 0.5] });
    for (const sz of [-1, 1]) o.cyl(frame, 0.018, 0.018, cw, 8, { pos: [x - cw * 0.5, H, sz * cw * 0.5], rot: [0, 0, -Math.PI / 2] });
    for (const sx of [-1, 1]) o.cyl(frame, 0.018, 0.018, cw, 8, { pos: [x + sx * cw * 0.5, H, -cw * 0.5], rot: [Math.PI / 2, 0, 0] });
    // canvas on three sides and a door flap on the front
    o.box('canvas', 0.012, H - 0.15, cw, { pos: [x - cw * 0.5, H * 0.5, 0] });
    o.box('canvas', 0.012, H - 0.15, cw, { pos: [x + cw * 0.5, H * 0.5, 0] });
    o.box('canvas', cw, H - 0.15, 0.012, { pos: [x, H * 0.5, -cw * 0.5] });
    o.box('canvas', cw * 0.9, H - 0.3, 0.012, { pos: [x + (c === 1 ? 0.35 : 0), H * 0.5 - 0.05, cw * 0.5 + 0.01], rot: [0, c === 1 ? 0.9 : 0, 0] });
    // duckboards
    for (let i = 0; i < 6; i++) o.box('timber', cw - 0.1, 0.03, 0.12, { pos: [x, 0.05, -cw * 0.5 + 0.15 + i * 0.18] });
    o.box('timber', 0.06, 0.05, cw - 0.1, { pos: [x - 0.4, 0.02, 0] });
    o.box('timber', 0.06, 0.05, cw - 0.1, { pos: [x + 0.4, 0.02, 0] });
  }
  // the shower: pole and pulley, a bucket hanging, a rose
  const sx = cw * 1.05;
  o.cyl('pole', 0.04, 0.05, H + 0.9, 8, { pos: [sx + cw * 0.5 + 0.15, 0, 0] });
  o.box('timber', 0.06, 0.06, cw * 0.8, { pos: [sx + cw * 0.5 + 0.15, H + 0.85, -cw * 0.3] });
  o.cyl('steel', 0.15, 0.12, 0.3, 12, { pos: [sx, H - 0.35, 0] });
  o.cyl('steel', 0.05, 0.05, 0.02, 10, { pos: [sx, H - 0.38, 0] });
  o.tube('rope', [[sx, H - 0.05, 0], [sx, H + 0.85, 0], [sx + cw * 0.5 + 0.15, H + 0.85, 0], [sx + cw * 0.5 + 0.15, 1.1, 0.1]], 0.007, 5);
  // seats in the loos, a roll on a stick
  for (const c of [0, 1]) {
    const x = -cw * 1.05 + c * cw * 1.05;
    o.box('timber', 0.6, 0.42, 0.5, { pos: [x, 0.25, -cw * 0.5 + 0.3] });
    o.cyl('poly', 0.06, 0.06, 0.1, 10, { pos: [x + 0.45, 0.75, -cw * 0.5 + 0.1], rot: [0, 0, Math.PI / 2] }, { centre: true });
  }
  // wash stand with two basins and a mirror on the end
  o.merge(table(rnd, 1.2, 0.5, 0.85), { pos: [-cw * 1.05 - cw * 0.5 - 0.75, 0, 0], rot: [0, Math.PI / 2, 0] });
  o.cyl('poly', 0.18, 0.14, 0.12, 14, { pos: [-cw * 1.05 - cw * 0.5 - 0.75, 0.86, 0.25] });
  o.cyl('poly', 0.18, 0.14, 0.12, 14, { pos: [-cw * 1.05 - cw * 0.5 - 0.75, 0.86, -0.25] });
  o.box('alu', 0.02, 0.4, 0.3, { pos: [-cw * 1.05 - cw * 0.5 - 0.02, 1.5, 0] });
  for (let i = 0; i < 2; i++) o.merge(jerry(rnd, 'polyBlue'), { pos: [-cw * 1.05 - cw * 0.5 - 0.9 + i * 0.4, 0, 0.9], rot: [0, rnd(), 0] });
  // reed screen on the camp side (+z), 1.8 m, on three poles
  const screenW = cw * 3.15 + 2.6;
  for (let i = 0; i < 4; i++) o.cyl('pole', 0.035, 0.04, 1.9, 7, { pos: [-cw * 1.05 - cw * 0.5 - 1.3 + (screenW / 3) * i, 0, cw * 0.5 + 1.2] });
  const g = new THREE.BoxGeometry(screenW, 1.75, 0.04, 12, 2, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + 0.03 * Math.sin(p.getX(i) * 2.1) * Math.sin(p.getY(i) * 1.7));
  o.add('canvasOlive', g, { pos: [-cw * 1.05 - cw * 0.5 - 1.3 + screenW * 0.5, 0.95, cw * 0.5 + 1.2] });
  o.box('signLatrine', 1.0, 0.36, 0.02, { pos: [-cw * 1.05 - cw * 0.5 - 1.3 + screenW * 0.5, 1.6, cw * 0.5 + 1.24] }, { uv: false });
  const ln = lantern(rnd);
  o.merge(ln.obj, { pos: [0, H + 0.02, cw * 0.5 + 0.05] });
  lamps.push({ x: 0, y: H + 0.02 + ln.lamp.y, z: cw * 0.5 + 0.05, kind: 'lantern' });
  return { obj: o, lamps };
}

/** Lookout: four poles, a 3 x 3 deck at `height`, a rail, a ladder, a thatch of canvas. */
export function lookout(rnd, height = 4.6) {
  const o = new Obj();
  const s = 1.45;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      o.cyl('pole', 0.08, 0.11, height + 1.9, 9, { pos: [sx * s, 0, sz * s], rot: [-sz * 0.03, 0, sx * 0.03] });
    }
    // cross bracing on two sides
    const L = Math.hypot(s * 2, height * 0.6);
    o.box('timber', 0.08, L, 0.06, { pos: [sx * (s + 0.06), height * 0.5, 0], rot: [Math.atan2(s * 2, height * 0.6), 0, 0] });
    o.box('timber', 0.08, L, 0.06, { pos: [sx * (s + 0.06), height * 0.5, 0], rot: [-Math.atan2(s * 2, height * 0.6), 0, 0] });
  }
  for (const sx of [-1, 1]) o.box('timber', 0.1, 0.16, s * 2 + 0.3, { pos: [sx * s, height - 0.1, 0] });
  for (let i = 0; i < 12; i++) o.box('timber', s * 2 + 0.4, 0.035, 0.22, { pos: [0, height + 0.02, -s - 0.1 + i * 0.25], rot: [0, 0, (rnd() - 0.5) * 0.004] });
  // rail
  for (const sx of [-1, 1]) {
    o.box('timber', 0.05, 0.05, s * 2 + 0.2, { pos: [sx * (s + 0.1), height + 1.05, 0] });
    o.box('timber', 0.05, 0.05, s * 2 + 0.2, { pos: [sx * (s + 0.1), height + 0.55, 0] });
    o.box('timber', s * 2 + 0.2, 0.05, 0.05, { pos: [0, height + 1.05, sx * (s + 0.1)] });
    o.box('timber', s * 2 + 0.2, 0.05, 0.05, { pos: [0, height + 0.55, sx * (s + 0.1)] });
    for (const sz of [-1, 1]) o.cyl('pole', 0.035, 0.035, 1.1, 7, { pos: [sx * (s + 0.1), height, sz * (s + 0.1)] });
  }
  // canvas roof on the pole tops
  gable(o, 'canvasSand', s * 2 + 0.6, s * 2 + 0.6, height + 1.9, height + 2.6, { overhang: 0.2, sag: 0.05, belly: 0.04, edge: 0.03, wrinkle: 0.02, seg: 2.2, seed: 5.1 });
  for (const sx of [-1, 1]) o.cyl('pole', 0.04, 0.04, s * 2 + 0.9, 7, { pos: [sx * (s + 0.3), height + 1.9, -s - 0.45], rot: [Math.PI / 2, 0, 0] });
  o.cyl('pole', 0.04, 0.04, s * 2 + 0.9, 7, { pos: [0, height + 2.55, -s - 0.45], rot: [Math.PI / 2, 0, 0] });
  // ladder up the front
  for (const sx of [-1, 1]) o.cyl('pole', 0.035, 0.04, height + 1.2, 7, { pos: [sx * 0.3, 0, s + 0.9], rot: [-0.24, 0, 0] });
  const rungs = Math.round(height / 0.3);
  for (let i = 1; i <= rungs; i++) {
    const t = (i / rungs) * (height + 1.0);
    o.cyl('pole', 0.02, 0.02, 0.62, 6, { pos: [-0.31, t * Math.cos(0.24), s + 0.9 - t * Math.sin(0.24)], rot: [0, 0, -Math.PI / 2] });
  }
  // someone left a chair and a pair of binoculars' case up there
  o.merge(chair(rnd), { pos: [0.5, height + 0.04, -0.4], rot: [0, Math.PI + 0.3, 0] });
  o.box('canvasGreen', 0.3, 0.2, 0.15, { pos: [-0.8, height + 0.14, 0.6], rot: [0, 0.5, 0] }, { r: 0.03 });
  // the askari's lamp hangs from the roof pole
  const ln = lantern(rnd);
  o.tube('rope', [[0, height + 1.9, 0.2], [0, height + 1.55, 0.2]], 0.006, 5);
  o.merge(ln.obj, { pos: [0, height + 1.25, 0.2] });
  return { obj: o, lamps: [{ x: 0, y: height + 1.25 + ln.lamp.y, z: 0.2, kind: 'lantern' }] };
}

/**
 * Radio mast: a lattice of three tubes with cross bracing, guyed at two
 * heights, a whip and a yagi at the top, a solar panel and equipment box at
 * the base. The tallest thing in the camp and the one you see from the road.
 */
export function radioMast(rnd, height = 12.5) {
  const o = new Obj();
  const r = 0.22;
  const legs = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    legs.push([Math.cos(a) * r, Math.sin(a) * r]);
    o.cyl('galv', 0.032, 0.038, height, 7, { pos: [Math.cos(a) * r, 0.5, Math.sin(a) * r] });
  }
  // aviation bands: the top third of each leg is painted red and white in turn
  for (let k = 0; k < 4; k++) {
    const y0 = 0.5 + height * (0.55 + k * 0.11);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      o.cyl(k % 2 ? 'steelWhite' : 'steelRed', 0.04, 0.04, height * 0.11, 7, { pos: [Math.cos(a) * r, y0, Math.sin(a) * r] });
    }
  }
  const bays = Math.round(height / 0.9);
  for (let b = 0; b < bays; b++) {
    const y0 = 0.5 + b * (height / bays);
    const y1 = y0 + height / bays;
    for (let i = 0; i < 3; i++) {
      const A = legs[i];
      const B = legs[(i + 1) % 3];
      o.tube('galv', [[A[0], y0, A[1]], [B[0], y0, B[1]]], 0.01, 4);
      o.tube('galv', [[A[0], y0, A[1]], [B[0], y1, B[1]]], 0.01, 4);
    }
  }
  // concrete base block and the guy anchors
  o.box('rock', 1.0, 0.5, 1.0, { pos: [0, 0.25, 0] }, { r: 0.03 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + Math.PI / 6;
    const ax = Math.cos(a) * height * 0.5;
    const az = Math.sin(a) * height * 0.5;
    o.box('rock', 0.5, 0.3, 0.5, { pos: [ax, 0.12, az], rot: [0, a, 0] }, { r: 0.02 });
    o.tube('wire', [[ax, 0.3, az], [Math.cos(a) * r * 0.5, height * 0.62, Math.sin(a) * r * 0.5]], 0.006, 3, undefined, { density: 1 });
    o.tube('wire', [[ax, 0.3, az], [Math.cos(a) * r * 0.5, height * 0.98, Math.sin(a) * r * 0.5]], 0.006, 3, undefined, { density: 1 });
  }
  // antennae
  o.cyl('wire', 0.008, 0.008, 3.2, 5, { pos: [0, height + 0.4, 0] });
  o.box('alu', 1.6, 0.03, 0.03, { pos: [0.5, height + 0.6, 0.3] });
  for (let i = 0; i < 6; i++) o.box('alu', 0.03, 0.02, 0.6 - i * 0.05, { pos: [-0.25 + i * 0.3, height + 0.6, 0.3] });
  o.cyl('poly', 0.18, 0.18, 0.5, 10, { pos: [-0.3, height - 1.2, 0.3] }); // an omni in a radome
  // obstruction beacon on the whip's base: the one red light above the camp at night
  o.cyl('steelBlack', 0.06, 0.07, 0.08, 8, { pos: [0, height + 0.32, 0] });
  o.add('beacon', new THREE.SphereGeometry(0.075, 8, 6), { pos: [0, height + 0.46, 0] }, { uv: false });
  // VSAT dish on its own post beside the mast, aimed up over the road at the satellite
  o.cyl('galv', 0.045, 0.05, 2.0, 8, { pos: [-1.3, 0, -0.9] });
  o.box('rock', 0.7, 0.3, 0.7, { pos: [-1.3, 0.12, -0.9] }, { r: 0.02 });
  // a shallow cap of a sphere, concave side up, then tilted toward the road (+z)
  const dish = new THREE.SphereGeometry(1.2, 18, 6, 0, TAU, Math.PI - 0.5, 0.5);
  dish.translate(0, 1.2 * Math.cos(0.5), 0);
  const aim = 0.95;
  const dc = [-1.3, 2.35, -0.9];
  o.add('steelWhite', dish, { pos: dc, rot: [aim, 0, 0] }, { uv: false });
  o.cyl('galv', 0.02, 0.02, 0.6, 6, { pos: dc, rot: [aim, 0, 0] });
  o.box('steelBlack', 0.1, 0.16, 0.1, { pos: [dc[0], dc[1] + Math.cos(aim) * 0.6, dc[2] + Math.sin(aim) * 0.6] });
  // equipment cabinet and a small panel at the base
  o.box('steelGreen', 0.7, 1.0, 0.5, { pos: [0.9, 0.5, -0.4] }, { r: 0.01 });
  o.box('solar', 0.7, 0.02, 1.1, { pos: [0.9, 1.3, -0.35], rot: [-0.5, 0, 0] }, { uv: false });
  o.box('alu', 0.74, 0.03, 1.14, { pos: [0.9, 1.29, -0.35], rot: [-0.5, 0, 0] });
  o.tube('rubber', [[0.9, 1.0, -0.4], [0.7, 0.8, -0.1], [0.2, 0.7, 0.05], [0.1, 1.5, 0.1]], 0.012, 5);
  o.box('signRadio', 0.5, 0.36, 0.02, { pos: [0.9, 0.7, -0.14] }, { uv: false });
  return { obj: o, lamps: [] };
}

/** Solar array: six panels on a tilted galvanised frame, battery box, inverter cabinet, cable trench. */
export function solarArray(rnd) {
  const o = new Obj();
  const tilt = 0.42;
  const W = 3.4;
  const D = 2.1;
  for (const sx of [-1, 0, 1]) {
    o.cyl('galv', 0.03, 0.03, 0.8, 8, { pos: [sx * W * 0.45, 0, D * 0.4] });
    o.cyl('galv', 0.03, 0.03, 1.7, 8, { pos: [sx * W * 0.45, 0, -D * 0.4] });
  }
  o.box('galv', W + 0.1, 0.05, 0.05, { pos: [0, 0.8, D * 0.4] });
  o.box('galv', W + 0.1, 0.05, 0.05, { pos: [0, 1.7, -D * 0.4] });
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      const x = -W * 0.5 + 0.56 + i * 1.12;
      const along = -0.5 + j * 1.0;
      const y = 1.25 + Math.sin(tilt) * along * 1.0;
      const z = -Math.cos(tilt) * along * 1.0;
      o.box('alu', 1.08, 0.04, 1.0, { pos: [x, y, z], rot: [-tilt, 0, 0] });
      o.box('solar', 1.02, 0.02, 0.94, { pos: [x, y + 0.02, z], rot: [-tilt, 0, 0] }, { uv: false });
    }
  }
  // battery box on a pallet, inverter cabinet, cable
  o.box('timberWarm', 1.2, 0.12, 0.9, { pos: [0, 0.06, D * 0.4 + 1.2] });
  o.box('steelGreen', 1.0, 0.6, 0.7, { pos: [0, 0.42, D * 0.4 + 1.2] }, { r: 0.015 });
  o.box('steelWhite', 0.5, 0.7, 0.3, { pos: [-W * 0.45, 0.85, -D * 0.4 - 0.2] }, { r: 0.01 });
  o.tube('rubber', [[0.5, 0.7, D * 0.4 + 1.2], [0.4, 0.1, D * 0.4 + 0.6], [-W * 0.45, 0.05, -D * 0.4 - 0.2], [-W * 0.45, 0.5, -D * 0.4 - 0.2]], 0.012, 5);
  return { obj: o, lamps: [] };
}

/** 1000 l poly tank on a 1.6 m stand of angle steel, with a tap, hose and a drip pan. */
export function waterTank(rnd) {
  const o = new Obj();
  const H = 1.6;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.box('steelGreen', 0.06, H, 0.06, { pos: [sx * 0.6, H * 0.5, sz * 0.6], rot: [-sz * 0.04, 0, sx * 0.04] });
  for (const y of [0.5, H]) {
    for (const sx of [-1, 1]) {
      o.box('steelGreen', 0.05, 0.05, 1.3, { pos: [sx * 0.62, y, 0] });
      o.box('steelGreen', 1.3, 0.05, 0.05, { pos: [0, y, sx * 0.62] });
    }
  }
  for (let i = 0; i < 7; i++) o.box('timber', 1.3, 0.04, 0.16, { pos: [0, H + 0.04, -0.55 + i * 0.18] });
  o.box('poly', 1.05, 1.1, 1.05, { pos: [0, H + 0.62, 0] }, { r: 0.08 });
  o.cyl('polyBlack', 0.18, 0.18, 0.06, 14, { pos: [0, H + 1.16, 0] });
  o.cyl('steel', 0.025, 0.025, 0.3, 8, { pos: [0, H + 0.12, 0.55], rot: [Math.PI / 2, 0, 0] });
  o.cyl('steelRed', 0.05, 0.05, 0.04, 8, { pos: [0, H + 0.15, 0.85], rot: [0, 0, Math.PI / 2] }, { centre: true });
  o.tube('rubber', [[0, H + 0.1, 0.86], [0.1, 0.9, 1.0], [0.5, 0.15, 1.4], [1.3, 0.06, 1.6], [1.8, 0.05, 1.3]], 0.016, 6);
  o.cyl('steel', 0.3, 0.3, 0.06, 14, { pos: [0, 0, 0.9] });
  o.merge(jerry(rnd, 'polyBlue'), { pos: [0.7, 0, 1.0], rot: [0, 0.3, 0] });
  o.merge(jerry(rnd, 'poly'), { pos: [-0.7, 0, 1.0], rot: [0, -0.6, 0] });
  return { obj: o, lamps: [] };
}

/**
 * Fuel store: drums and cans on a pallet under a sheet lean-to, a bund of
 * timber round them, a fire extinguisher and the warning sign. The one thing
 * in the camp that has to be a long way from the fire.
 */
export function fuelStore(rnd) {
  const o = new Obj();
  for (const sx of [-1, 1]) {
    o.cyl('pole', 0.05, 0.06, 2.4, 8, { pos: [sx * 1.5, 0, -1.0] });
    o.cyl('pole', 0.05, 0.06, 2.0, 8, { pos: [sx * 1.5, 0, 1.0] });
  }
  const slope = Math.atan2(0.4, 2.0);
  for (const sx of [-1, 1]) o.box('timber', 0.06, 0.08, 2.6, { pos: [sx * 1.5, 2.22, 0], rot: [slope, 0, 0] });
  for (let i = 0; i < 3; i++) {
    const x = -1.2 + i * 1.18;
    o.box('galv', 1.2, 0.012, 2.8, { pos: [x, 2.28 + i * 0.004, 0], rot: [slope, 0, 0] });
  }
  // bund
  for (const sz of [-1, 1]) o.box('timber', 3.0, 0.2, 0.08, { pos: [0, 0.1, sz * 1.1] });
  for (const sx of [-1, 1]) o.box('timber', 0.08, 0.2, 2.2, { pos: [sx * 1.5, 0.1, 0] });
  o.box('timberWarm', 2.4, 0.12, 1.4, { pos: [0, 0.06, -0.3] });
  o.merge(drum(rnd, 'steelRed'), { pos: [-0.7, 0.12, -0.4] });
  o.merge(drum(rnd, 'steelBlue'), { pos: [0.0, 0.12, -0.45], rot: [0, 0.4, 0] });
  o.merge(drum(rnd, 'steelRed'), { pos: [0.7, 0.12, -0.3], rot: [0, -0.2, 0] });
  for (let i = 0; i < 5; i++) o.merge(jerry(rnd, i < 3 ? 'polyRed' : 'steelYellow'), { pos: [-1.0 + i * 0.42, 0.12, 0.45], rot: [0, (rnd() - 0.5) * 0.5, 0] });
  o.merge(extinguisher(rnd), { pos: [1.3, 0, 1.3] });
  o.box('signFuel', 0.9, 0.45, 0.02, { pos: [0, 1.7, 1.04] }, { uv: false });
  o.cyl('steel', 0.03, 0.03, 0.6, 8, { pos: [0.9, 0.2, 0.9] }); // hand pump
  o.box('steel', 0.3, 0.03, 0.03, { pos: [1.0, 0.82, 0.9] });
  o.tube('rubber', [[0.9, 0.7, 0.9], [1.1, 0.5, 0.6], [0.7, 0.65, -0.4]], 0.012, 6);
  return { obj: o, lamps: [] };
}

/** Post-and-wire fence along a polyline, posts every 3 m, three strands, a strainer at each corner. */
export function fenceLine(rnd, pts, ground = () => 0) {
  const o = new Obj();
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const L = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.round(L / 3));
    const posts = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      const y = ground(x, z);
      posts.push([x, y, z]);
      if (k === n && i < pts.length - 2) continue;
      const corner = k === 0 || k === n;
      o.cyl('pole', corner ? 0.07 : 0.045, corner ? 0.08 : 0.055, corner ? 1.5 : 1.3, 7, { pos: [x, y - 0.05, z], rot: [(rnd() - 0.5) * 0.06, 0, (rnd() - 0.5) * 0.06] });
    }
    for (const h of [0.35, 0.75, 1.15]) {
      const line = [];
      for (let k = 0; k < posts.length; k++) {
        const [x, y, z] = posts[k];
        line.push([x, y + h, z]);
        if (k < posts.length - 1) {
          const [x2, y2, z2] = posts[k + 1];
          line.push([(x + x2) * 0.5, (y + y2) * 0.5 + h - 0.035, (z + z2) * 0.5]);
        }
      }
      o.tube('wire', line, 0.004, 3, undefined, { tension: 0.1, density: 0.8 });
    }
  }
  return o;
}

/**
 * Thorn boma: cut acacia piled along the inside of the road fence, the way a
 * camp keeps elephants and hyena out of the kitchen. Also the one thing that
 * gives the camp a solid edge from the road — three strands of wire are
 * invisible at fifty metres and the tents behind them float.
 *
 * Each 1.3 m of line gets a few bent dead limbs laid roughly along it, piled
 * knee to chest high, with a fringe of twigs poking out. Low-poly tubes; the
 * deadwood map does the rest.
 */
export function bomaLine(rnd, pts, ground = () => 0, { height = 1.1, gaps = [] } = {}) {
  const o = new Obj();
  const inGap = (x, z) => gaps.some((g) => Math.hypot(x - g[0], z - g[1]) < g[2]);
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const L = Math.hypot(bx - ax, bz - az);
    const dx = (bx - ax) / L;
    const dz = (bz - az) / L;
    const n = Math.ceil(L / 1.3);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const cx = ax + (bx - ax) * t;
      const cz = az + (bz - az) * t;
      if (inGap(cx, cz)) continue;
      const y = ground(cx, cz);
      const limbs = 2 + Math.floor(rnd() * 2);
      for (let j = 0; j < limbs; j++) {
        const len = 1.6 + rnd() * 1.4;
        const yaw = (rnd() - 0.5) * 0.9;
        const pitch = (rnd() - 0.5) * 0.5;
        const ex = dx * Math.cos(yaw) - dz * Math.sin(yaw);
        const ez = dx * Math.sin(yaw) + dz * Math.cos(yaw);
        const lift = 0.15 + rnd() * (height - 0.3);
        const side = (rnd() - 0.5) * 0.9;
        const p0 = [cx - ex * len * 0.5 - dz * side, y + lift - Math.sin(pitch) * len * 0.5, cz - ez * len * 0.5 + dx * side];
        const p1 = [cx + ex * len * 0.5 - dz * side, y + lift + Math.sin(pitch) * len * 0.5, cz + ez * len * 0.5 + dx * side];
        const mid = [(p0[0] + p1[0]) * 0.5 + (rnd() - 0.5) * 0.3, (p0[1] + p1[1]) * 0.5 + (rnd() - 0.3) * 0.25, (p0[2] + p1[2]) * 0.5 + (rnd() - 0.5) * 0.3];
        o.tube('deadwood', [p0, mid, p1], 0.035 + rnd() * 0.03, 5, undefined, { density: 1.5 });
        // a fork of twigs off one end, sticking up and out toward the road side
        if (rnd() < 0.7) {
          const e = rnd() < 0.5 ? p0 : p1;
          const up = 0.4 + rnd() * 0.5;
          o.tube('deadwood', [e, [e[0] - dz * 0.3 * (rnd() - 0.2), e[1] + up * 0.6, e[2] + dx * 0.3 * (rnd() - 0.2)], [e[0] - dz * 0.5, e[1] + up, e[2] + dx * 0.5]], 0.014, 4, undefined, { density: 2 });
        }
      }
    }
  }
  return o;
}

/** The gate: two heavy posts, a timber-framed wire gate swung open, the camp sign beside it. */
export function gate(rnd, width = 5.2) {
  const o = new Obj();
  for (const s of [-1, 1]) o.cyl('pole', 0.12, 0.14, 2.2, 9, { pos: [s * width * 0.5, -0.1, 0] });
  o.box('timber', width + 0.3, 0.14, 0.14, { pos: [0, 2.15, 0] });
  o.box('signGate', 2.6, 1.3, 0.04, { pos: [0, 2.9, -0.02] }, { uv: false });
  o.box('timber', 2.8, 0.08, 0.08, { pos: [0, 3.6, 0] });
  for (const s of [-1, 1]) o.box('timber', 0.08, 1.5, 0.08, { pos: [s * 1.35, 2.9, 0.06] });
  // the gate itself, hinged on the -x post, open 80 degrees inward
  const gw = width * 0.5 - 0.15;
  const ang = -1.4;
  const gateObj = new Obj();
  gateObj.box('timber', gw, 0.07, 0.05, { pos: [gw * 0.5, 1.3, 0] });
  gateObj.box('timber', gw, 0.07, 0.05, { pos: [gw * 0.5, 0.35, 0] });
  gateObj.box('timber', 0.06, 1.05, 0.05, { pos: [0.03, 0.82, 0] });
  gateObj.box('timber', 0.06, 1.05, 0.05, { pos: [gw - 0.03, 0.82, 0] });
  gateObj.box('timber', 0.05, Math.hypot(gw, 0.95), 0.04, { pos: [gw * 0.5, 0.82, 0], rot: [0, 0, Math.atan2(gw, 0.95)] });
  for (let i = 0; i < 6; i++) gateObj.tube('wire', [[0.05, 0.4 + i * 0.16, 0.0], [gw - 0.05, 0.4 + i * 0.16, 0.0]], 0.003, 3, undefined, { density: 1 });
  o.merge(gateObj, { pos: [-width * 0.5 + 0.15, 0, 0], rot: [0, ang, 0] });
  // a second leaf, propped open the other way against a stone
  o.merge(gateObj, { pos: [width * 0.5 - 0.15, 0, 0], rot: [0, Math.PI - ang + 0.3, 0], scale: [1, 1, 1] });
  o.add('rock', lump(0.25, 0.2, 0.22, rnd, { flat: 0.9 }), { pos: [width * 0.5 - 1.2, 0.05, 1.8] });
  // a hurricane lamp on a bracket off each post: the gate is lit all night so
  // a late vehicle finds the turn and the askari sees what is coming in
  const lamps = [];
  for (const s of [-1, 1]) {
    const ln = lantern(rnd);
    o.box('steel', 0.02, 0.02, 0.3, { pos: [s * width * 0.5, 2.0, 0.15] });
    o.merge(ln.obj, { pos: [s * width * 0.5, 1.62, 0.3] });
    lamps.push({ x: s * width * 0.5, y: 1.62 + ln.lamp.y, z: 0.3, kind: 'lantern' });
  }
  return { obj: o, lamps };
}

/** A sign on two posts, any of the sign materials. */
export function signPost(key, w = 1.0, h = 0.5, postH = 1.6) {
  const o = new Obj();
  for (const s of [-1, 1]) o.cyl('pole', 0.04, 0.05, postH + h, 7, { pos: [s * (w * 0.5 - 0.05), -0.05, 0] });
  o.box(key, w, h, 0.03, { pos: [0, postH + h * 0.5, 0.03] }, { uv: false });
  o.box('timber', w + 0.1, 0.05, 0.05, { pos: [0, postH + h + 0.03, 0] });
  return o;
}

/** The notice board: a map under a little galv roof, on two posts. */
export function noticeBoard() {
  const o = new Obj();
  for (const s of [-1, 1]) o.cyl('pole', 0.05, 0.06, 2.2, 7, { pos: [s * 0.95, -0.05, 0] });
  o.box('timber', 2.0, 1.2, 0.05, { pos: [0, 1.4, 0] });
  o.box('mapBoard', 1.8, 1.0, 0.02, { pos: [0, 1.4, 0.035] }, { uv: false });
  o.box('galv', 2.3, 0.012, 0.6, { pos: [0, 2.15, 0.1], rot: [0.35, 0, 0] });
  o.box('timber', 2.1, 0.06, 0.06, { pos: [0, 2.05, -0.1] });
  return o;
}

/** Flag pole, with the flag as a separate cloth mesh the update flaps. */
export function flagPole(height = 6.0) {
  const o = new Obj();
  o.cyl('steelWhite', 0.035, 0.05, height, 10);
  o.add('alu', new THREE.SphereGeometry(0.07, 10, 6), { pos: [0, height + 0.05, 0] });
  o.box('rock', 0.5, 0.25, 0.5, { pos: [0, 0.12, 0] }, { r: 0.02 });
  o.tube('rope', [[0.04, 0.9, 0.0], [0.05, height - 0.1, 0.02]], 0.005, 4);
  return o;
}

/** Fire pit: ring of stones, a bed of ash and charred logs, a tripod and grill, cooking pot. */
export function firePit(rnd, radius = 1.15, { small = false } = {}) {
  const o = new Obj();
  const n = small ? 9 : 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (rnd() - 0.5) * 0.25;
    const r = radius + (rnd() - 0.5) * 0.08;
    const s = (small ? 0.16 : 0.22) * (0.8 + rnd() * 0.5);
    o.add('rock', lump(s, s * 0.7, s * 0.9, rnd, { detail: 1, rough: 0.2, flat: 0.8 }), { pos: [Math.cos(a) * r, s * 0.35, Math.sin(a) * r], rot: [0, rnd() * TAU, 0] });
  }
  // ash bed, slightly domed, and the charred logs
  const ash = new THREE.CircleGeometry(radius - 0.12, 20);
  ash.rotateX(-Math.PI / 2);
  const p = ash.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const r = Math.hypot(p.getX(i), p.getZ(i));
    p.setY(i, 0.04 + (1 - r / radius) * 0.08);
  }
  o.add('ash', ash, {}, { uv: false });
  // The logs: laid in a star with their burnt ends in the coals and the thick
  // ends resting on the ring, so they stick out past the flames and read as
  // logs rather than as a glow with a texture in it. Two of them propped up
  // across the others.
  const logs = small ? 3 : 5;
  for (let i = 0; i < logs; i++) {
    const a = (i / logs) * TAU + rnd() * 0.5;
    const len = radius * (1.15 + rnd() * 0.35);
    const rIn = 0.055 + rnd() * 0.02;
    const rOut = rIn * (1.25 + rnd() * 0.25);
    // inner end near the centre at coal height, outer end up on the stones
    const inner = radius * 0.12;
    const outer = inner + len;
    const yIn = 0.12 + (i % 2) * 0.05;
    const yOut = i < 2 ? 0.34 + rnd() * 0.06 : 0.2 + rnd() * 0.05;
    const cx = Math.cos(a) * (inner + outer) * 0.5;
    const cz = Math.sin(a) * (inner + outer) * 0.5;
    const dir = new THREE.Vector3(Math.cos(a) * len, yOut - yIn, Math.sin(a) * len).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    o.cyl('charLog', rIn, rOut, Math.hypot(len, yOut - yIn), 8, { pos: [cx, (yIn + yOut) * 0.5, cz], quat: q }, { centre: true });
  }
  // a couple of unburnt rounds dropped by the ring, ready to go on
  if (!small) {
    for (const [x, z, yaw, len] of [
      [radius * 1.35, radius * 0.5, 0.4, radius * 0.9],
      [radius * 1.5, radius * 0.15, 1.2, radius * 0.8],
    ]) {
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw)));
      o.cyl('deadwood', 0.055, 0.065, len, 8, { pos: [x, 0.06, z], quat: q }, { centre: true });
    }
  }
  if (!small) {
    // tripod and hanging pot, grill on two stones
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.5;
      o.cyl('steelBlack', 0.014, 0.016, 1.9, 7, { pos: [Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9], rot: [Math.sin(a) * 0.48, 0, -Math.cos(a) * 0.48] });
    }
    o.tube('wire', [[0, 1.68, 0], [0, 0.85, 0]], 0.005, 4);
    o.cyl('steelBlack', 0.17, 0.14, 0.22, 14, { pos: [0, 0.62, 0] });
    o.tube('wire', slackLine([-0.16, 0.84, 0], [0.16, 0.84, 0], -0.1, 5), 0.006, 5);
    o.box('steel', 0.6, 0.02, 0.45, { pos: [radius * 0.55, 0.3, -radius * 0.2] });
    for (let i = 0; i < 7; i++) o.box('steel', 0.6, 0.015, 0.015, { pos: [radius * 0.55, 0.32, -radius * 0.2 - 0.2 + i * 0.065] });
    o.cyl('alu', 0.11, 0.1, 0.16, 12, { pos: [radius * 0.5, 0.33, -radius * 0.15] });
  }
  return o;
}

/** Laundry line between two poles with towels and shirts pegged on it. */
export function laundryLine(rnd, L = 7) {
  const o = new Obj();
  for (const s of [-1, 1]) o.cyl('pole', 0.035, 0.045, 2.0, 7, { pos: [s * L * 0.5, 0, 0], rot: [0, 0, -s * 0.05] });
  o.tube('rope', slackLine([-L * 0.5, 1.9, 0], [L * 0.5, 1.9, 0], 0.18, 8), 0.006, 5);
  const items = Math.round(L * 1.2);
  const cols = ['canvasChair', 'poly', 'canvasGreen', 'canvasSand', 'polyBlue'];
  for (let i = 0; i < items; i++) {
    const t = (i + 0.6) / (items + 0.2);
    const x = -L * 0.5 + L * t;
    const y = 1.9 - 0.18 * Math.sin(t * Math.PI);
    const w = 0.35 + rnd() * 0.35;
    const h = 0.4 + rnd() * 0.5;
    const g = new THREE.BoxGeometry(w, h, 0.02, 3, 3, 1);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) p.setZ(k, p.getZ(k) + 0.06 * Math.sin(((p.getY(k) + h * 0.5) / h) * Math.PI) * Math.sin(((p.getX(k) + w * 0.5) / w) * Math.PI));
    o.add(cols[i % cols.length], g, { pos: [x, y - h * 0.5, 0.01], rot: [0.04, 0, (rnd() - 0.5) * 0.08] });
  }
  return o;
}

export { boardWall, sheetRoof };
