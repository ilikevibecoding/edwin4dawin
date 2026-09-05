import * as THREE from 'three';
import { addWheel, addWheels, archCut, bend, chassis, coil, cyl, cylX, cylZ, decal, gbox, insideOut, jit, lampPool, lathe, paneGeo, pbox, rectLamp, roundLamp, sidePanel, transform, tube, wheelProto } from './parts.js';
import { benchTiers, bonnetBody, boxBody, cabOverCab, edgeBolts, flatDeck, rollCage } from './bodies.js';
import { aerial, awning, beaconBar, canRack, cargoNet, crate, drawbar, drum, hitch, jerryCan, ladder, lashing, lightBar, mudFlap, pannier, roofRack, roofTent, sandPlate, snorkel, spare, spots, stowedRope, tank } from './gear.js';
import { grime } from './kit.js';
import { PALETTE, paintShade, shade, twoTone } from './wear.js';

// ---------------------------------------------------------------------------
// The ten kinds. Each builder assembles one vehicle from the part library in
// vehicle space (+Z nose, +Y up, wheels touching y = 0) and returns the contact
// patches the placer needs to sit it on the ground. `v` is the instance variant
// from wear.js; `o` carries the tier and whether this one was left lit.
// ---------------------------------------------------------------------------

const STEEL = grime(0x3a3e42, { up: 0.5, down: 0.4, jitter: 0.08 });
/** Parking lamps: on for the vehicle left with its markers on, and for the one still arriving. */
const mk = (o) => !!(o.lightsOn || o.markers);
const SEATS = [0x4a4438, 0x5b4f3a, 0x3a3f36, 0x6a5a48, 0x2f3438];

/** Wheel set for a variant, sized for the kind. */
function tyres(v, { r, w, rimR, style = null, lugs = 22 }) {
  const st = style ?? v.tyres;
  const tint = st === 'steel' ? (v.old ? shade(v.paint, 0.8) : 0x8a8f94) : v.old ? 0x7a7c78 : 0x9a9ea2;
  return wheelProto({ r, w, rimR, style: st, lugs, seed: v.seed, tint, dust: v.dust });
}

// --- 1. expedition truck ---------------------------------------------------

export function expeditionTruck(k, v, o) {
  const r = 0.58;
  const track = 1.0;
  const front = 2.0;
  const rear = -2.0;
  const hw = 1.15;
  const nose = 3.5;
  const tail = -3.45;
  const railY = r + 0.3;
  const proto = tyres(v, { r, w: 0.42, rimR: 0.3, style: 'truck', lugs: 24 });
  addWheels(k, proto, { front, rear, track, steer: v.steer, seed: v.seed });
  chassis(k, { front, rear, track, r, railHW: 0.5, railY, nose: nose - 0.2, tail: tail + 0.1, leaf: true, coilFront: false, heavy: true, tankSide: 1 });

  const cabFloor = railY + 0.22;
  const roof = 3.05;
  const P = paintShade(v, { fixings: [[hw, 1.6, 2.9], [-hw, 1.6, 2.9], [hw, 1.6, 1.4], [-hw, 1.6, 1.4]], floorY: 0.72 });
  cabOverCab(k, { hw, floorY: cabFloor, roof, front: nose - 0.1, rear: 1.25, wheelZ: front, r, paintKey: v.paintKey, paint: P, glassKey: v.glassKey, lightsOn: o.lightsOn, markersOn: mk(o), brokenPane: v.brokenPane, missingPanel: v.missingPanel, crackedLens: v.crackedLens, seatTint: v.pick(SEATS) });
  decal(k, v.ordinal % 2 ? 'unit2' : 'unit', { w: 0.3, h: 0.3, pos: [hw + 0.03, cabFloor + 0.45, 2.6], rot: [0, Math.PI / 2, 0] });
  decal(k, v.ordinal % 2 ? 'unit2' : 'unit', { w: 0.3, h: 0.3, pos: [-hw - 0.03, cabFloor + 0.45, 2.6], rot: [0, -Math.PI / 2, 0] });

  // the living box: a shade lighter than the cab on most of them
  const bx = 1.2;
  const by0 = railY + 0.2;
  const bh = 2.15;
  const z0 = 1.1;
  const z1 = tail + 0.1;
  const boxTint = v.chance(0.6) ? shade(v.paint, 1.12) : PALETTE.white;
  const PB = paintShade(v, { tint: boxTint, fixings: [[bx, by0 + 0.1, 0.5], [-bx, by0 + 0.1, 0.5], [bx, by0 + 0.1, -2.5], [-bx, by0 + 0.1, -2.5]], floorY: by0 });
  const { top } = boxBody(k, {
    hw: bx, y0: by0, h: bh, z0, z1, key: v.paintKey, paint: PB, glassKey: 'glassDark',
    windows: [
      { y: by0 + 1.45, z: -0.4, w: 0.8, h: 0.5, lit: o.cabin },
      { y: by0 + 1.45, z: -2.3, w: 0.5, h: 0.5, sides: [1] },
    ],
    doorZ: z1,
    hatches: [
      { y: by0 + 0.5, z: -0.3, w: 0.9, h: 0.55 },
      { y: by0 + 0.5, z: -1.7, w: 0.6, h: 0.55, sides: [1] },
    ],
    roofRail: false,
    seams: 4,
  });
  decal(k, 'camp', { w: 1.9, h: 0.48, pos: [-bx - 0.012, by0 + 0.98, -1.2], rot: [0, -Math.PI / 2, 0] });
  decal(k, 'camp', { w: 1.9, h: 0.48, pos: [bx + 0.012, by0 + 0.98, -0.5], rot: [0, Math.PI / 2, 0] });
  // living-box roof: rack, tent, spare, solar
  const { deckY } = roofRack(k, { x: bx - 0.08, z0: z0 - 0.1, z1: z1 + 0.1, y: top + 0.04, h: 0.14, slats: false, legs: [z0 - 0.4, -1.1, z1 + 0.4], legH: 0.04 });
  roofTent(k, { x0: -0.75, x1: 0.75, z0: 0.7, z1: -1.5, y: deckY, open: o.tentOpen, tint: v.pick([0x6f6a55, 0x5c6a4a, 0x8b8064]), ladderSide: 1 });
  spare(k, proto, { x: -0.55, y: deckY + proto.w * 0.5 + 0.02, z: -2.6, axis: 'y' });
  k.add('trimGloss', gbox(0.9, 0.03, 0.6, 0.006), { pos: [0.6, deckY + 0.03, -2.6], tint: 0x1c2436 });
  k.add('alu', gbox(0.94, 0.02, 0.64, 0.004), { pos: [0.6, deckY + 0.012, -2.6], tint: 0x9a9ea2 });
  // rear: ladder up the wall, spare cans, sand plates along the flank
  ladder(k, { x: -0.8, y0: by0 + 0.1, y1: top + 0.18, z: z1 - 0.06 });
  canRack(k, { x: -(bx + 0.12), y: by0 + 0.75, z: 0.55, n: 2, rot: Math.PI / 2, along: 'z', tints: [0x5a5d3a, 0x3a3a3a] });
  for (let i = 0; i < 2; i++) sandPlate(k, { x: bx + 0.04 + i * 0.035, y: by0 + 1.15, z: -1.95, rot: [0, 0, Math.PI / 2], tint: i ? 0xc95f1c : 0xd4671f });
  k.addMirrored('steel', gbox(0.05, 0.06, 0.4, 0.008), { pos: [bx + 0.06, by0 + 1.15, -1.95], shade: STEEL });
  awning(k, { side: -1, x: bx + 0.08, y: top - 0.12, z0: 0.4, z1: -2.4, open: false, tint: 0x8b8064 });
  // exhaust stack behind the cab, spots and an aerial on the cab roof
  k.add('rust', cyl(0.055, 0.055, 2.0, 12), { pos: [1.02, railY + 1.0, 1.18], tint: 0x5e5048 });
  k.add('steel', cyl(0.07, 0.06, 0.2, 12), { pos: [1.02, railY + 2.05, 1.18], rot: [0.3, 0, 0], shade: STEEL });
  spots(k, { xs: [-0.55, 0.55], y: roof + 0.1, z: nose - 0.25, r: 0.085, on: false });
  aerial(k, { x: -hw + 0.1, y: roof, z: 1.5, h: 1.3, phase: v.seed });
  for (const s of [-1, 1]) mudFlap(k, { x: s * track, z: rear - r - 0.12, y: railY - 0.05, w: 0.42, h: 0.42 });
  // winch bumper
  k.add('steel', gbox(0.4, 0.2, 0.2, 0.03), { pos: [0, railY - 0.02, nose + 0.05], shade: STEEL });
  k.add('steel', cylX(0.07, 0.07, 0.3, 12), { pos: [0, railY + 0.02, nose + 0.06], tint: 0x3c4045 });
  if (o.lightsOn) lampPool(k, { z: nose, w: 3.2, len: 5.5 });
  return { wheels: [{ x: track, z: front, r }, { x: -track, z: front, r }, { x: track, z: rear, r }, { x: -track, z: rear, r }], track, length: [tail - 0.3, nose + 0.2], height: deckY + 1.2 };
}

// --- 2. open safari jeep --------------------------------------------------------

export function safariJeep(k, v, o) {
  const r = 0.42;
  const track = 0.8;
  const front = 1.7;
  const rear = -1.5;
  const hw = 0.9;
  const nose = 2.55;
  const tail = -2.5;
  const sill = 0.52;
  const belt = 1.02;
  const hood = 0.98;
  const cabFront = 0.9;
  const proto = tyres(v, { r, w: 0.28, rimR: 0.215 });
  addWheels(k, proto, { front, rear, track, steer: v.steer, seed: v.seed });
  chassis(k, { front, rear, track, r, railHW: 0.42, nose, tail, leaf: true, coilFront: v.chance(0.5), tankSide: -1 });
  const tone = v.chance(0.4) ? twoTone(v, v.paint, shade(v.paint, 0.72), sill + (belt - 0.22 - sill) * 0.42) : paintShade(v, { fixings: [[hw, 0.7, 0.85], [-hw, 0.7, 0.85], [hw, 0.7, -2.3], [-hw, 0.7, -2.3]], floorY: sill });
  const b = bonnetBody(k, {
    hw, sill, belt, roof: 0, hood, nose, cabFront, cabRear: -0.35, tail, front, rear, r,
    style: 'open', doors: 2, paintKey: v.paintKey, paint: tone, glassKey: v.glassKey, brokenPane: v.brokenPane, missingPanel: v.missingPanel, crackedLens: v.crackedLens,
    lightsOn: o.lightsOn, markersOn: mk(o), rake: 0.22, bullbar: true, seatTint: v.pick(SEATS),
  });
  const seatTint = v.pick(SEATS);
  benchTiers(k, { hw, rows: [{ z: -0.95, y: b.floorY + 0.12 }, { z: -1.85, y: b.floorY + 0.3 }], tint: seatTint });
  const cageTop = 1.95;
  rollCage(k, { hw, y0: b.floorY, top: cageTop, hoops: [0.55, -0.4, -1.35, -2.25], canvas: o.canvas ?? true, canvasTint: v.pick([0x8b8064, 0x6f6a55, 0x5c6a4a]), seed: v.seed });
  spots(k, { xs: [-0.45, 0.45], y: cageTop + 0.1, z: 0.5, r: 0.07, on: false });
  // spotter's seat out on the bull bar
  k.add('steel', gbox(0.5, 0.05, 0.4, 0.01), { pos: [0.2, sill + 0.28, nose + 0.32], shade: STEEL });
  k.add('fabric', gbox(0.44, 0.08, 0.36, 0.03), { pos: [0.2, sill + 0.34, nose + 0.32], shade: grime(seatTint, { up: 0.4 }) });
  k.add('fabric', gbox(0.44, 0.34, 0.06, 0.03), { pos: [0.2, sill + 0.55, nose + 0.12], rot: [0.1, 0, 0], shade: grime(seatTint, { up: 0.4 }) });
  k.add('steel', tube([[-0.02, sill + 0.28, nose + 0.32], [0.42, sill + 0.28, nose + 0.32], [0.42, sill + 0.7, nose + 0.1], [-0.02, sill + 0.7, nose + 0.1]], 0.018, 8), { shade: STEEL });
  k.add('steel', tube([[0.05, sill + 0.2, nose + 0.1], [0.2, sill - 0.05, nose + 0.25], [0.35, sill + 0.2, nose + 0.1]], 0.016, 8), { shade: STEEL });
  // tail: spare on the back, can on a bracket, grab rails
  spare(k, proto, { x: 0.32, y: sill + 0.5, z: tail - proto.w * 0.5 - 0.06, axis: 'z', side: -1 });
  jerryCan(k, { x: -0.62, y: sill + 0.06, z: tail - 0.14, rot: Math.PI, tint: v.chance(0.5) ? 0x5a5d3a : 0xb43a2a, label: 'diesel' });
  k.add('steel', gbox(0.4, 0.03, 0.24, 0.006), { pos: [-0.62, sill + 0.04, tail - 0.14], shade: STEEL });
  k.addMirrored('steel', gbox(0.03, 0.03, 1.6, 0.006), { pos: [hw + 0.02, belt - 0.22 + 0.02, -1.2], shade: STEEL });
  decal(k, 'tour', { w: 0.5, h: 0.5, pos: [0, hood + 0.008, 1.55], rot: [-Math.PI / 2, 0, 0] });
  decal(k, 'plate', { w: 0.42, h: 0.1, pos: [-0.12, sill + 0.22, tail - 0.04], rot: [0, Math.PI, 0] });
  aerial(k, { x: hw - 0.12, y: b.flankTop, z: -2.3, h: 1.6, phase: v.seed + 2 });
  stowedRope(k, { x: -0.5, y: b.flankTop + 0.02, z: -2.3, r: 0.12 });
  if (o.lightsOn) lampPool(k, { z: nose });
  return { wheels: [{ x: track, z: front, r }, { x: -track, z: front, r }, { x: track, z: rear, r }, { x: -track, z: rear, r }], track, length: [tail - 0.4, nose + 0.5], height: cageTop + 0.2 };
}

// --- 3. off-road SUV ---------------------------------------------------------

export function suv(k, v, o) {
  const r = 0.4;
  const track = 0.82;
  const front = 1.45;
  const rear = -1.4;
  const hw = 0.93;
  const nose = 2.35;
  const tail = -2.25;
  const sill = 0.5;
  const belt = 1.15;
  const roof = 1.98;
  const hood = 1.05;
  const cabFront = 0.85;
  const cabRear = -1.1;
  const proto = tyres(v, { r, w: 0.27, rimR: 0.215 });
  addWheels(k, proto, { front, rear, track, steer: v.steer, seed: v.seed });
  chassis(k, { front, rear, track, r, railHW: 0.42, nose, tail, leaf: false, coilFront: true, tankSide: 1 });
  const P = paintShade(v, { fixings: [[hw, belt - 0.16, 0.3], [-hw, belt - 0.16, 0.3], [hw, belt - 0.16, -0.9], [-hw, belt - 0.16, -0.9]], floorY: sill });
  bonnetBody(k, {
    hw, sill, belt, roof, hood, nose, cabFront, cabRear, tail, front, rear, r,
    style: 'wagon', doors: 4, paintKey: v.paintKey, paint: P, glassKey: v.glassKey, brokenPane: v.brokenPane, missingPanel: v.missingPanel, crackedLens: v.crackedLens,
    lightsOn: o.lightsOn, markersOn: mk(o), dome: o.dome, rake: 0.3, bullbar: v.chance(0.7), roundLamps: v.chance(0.5), seatTint: v.pick(SEATS),
  });
  // roof: full-length rack and what rides on it
  const { deckY } = roofRack(k, { x: hw - 0.14, z0: cabFront - 0.5, z1: tail + 0.2, y: roof + 0.1, h: 0.13, legs: [cabFront - 0.7, -0.4, tail + 0.4], legH: 0.1 });
  if (v.chance(0.7)) spare(k, proto, { x: -0.35, y: deckY + proto.w * 0.5 + 0.02, z: tail + 0.9, axis: 'y' });
  else canRack(k, { x: -0.4, y: deckY + 0.02, z: tail + 0.9, n: 2, along: 'x' });
  jerryCan(k, { x: 0.45, y: deckY + 0.02, z: tail + 0.7, rot: 0.1, tint: 0x5a5d3a });
  if (v.chance(0.6)) sandPlate(k, { x: 0.45, y: deckY + 0.04, z: -0.3, rot: [0, 0.02, 0], len: 1.1 });
  else crate(k, { x: 0.35, y: deckY, z: -0.2, w: 0.6, h: 0.35, d: 0.7, seed: v.seed });
  awning(k, { side: 1, x: hw - 0.02, y: roof + 0.04, z0: -0.2, z1: tail + 0.35, open: false, tint: 0x6f6a55 });
  snorkel(k, { side: 1, x: hw - 0.06, y0: hood - 0.08, y1: roof - 0.04, z0: cabFront + 0.3, z1: cabFront - 0.25 });
  if (v.chance(0.8)) spots(k, { xs: [-0.35, 0.35], y: hood + 0.14, z: nose + 0.14, r: 0.07, on: false });
  if (v.chance(0.7)) lightBar(k, { y: roof + 0.28, z: cabFront - 0.42, len: 1.1, on: false });
  spare(k, proto, { x: 0.3, y: sill + 0.72, z: tail - proto.w * 0.5 - 0.05, axis: 'z', side: -1 });
  aerial(k, { x: -hw + 0.2, y: hood - 0.05, z: cabFront + 0.25, h: 1.2, phase: v.seed + 1, amp: 0.04 });
  for (const s of [-1, 1]) mudFlap(k, { x: s * track, z: rear - r - 0.12, y: sill - 0.02, w: 0.34, h: 0.3 });
  hitch(k, { y: sill - 0.12, z: tail - 0.06 });
  if (o.lightsOn) lampPool(k, { z: nose });
  return { wheels: [{ x: track, z: front, r }, { x: -track, z: front, r }, { x: track, z: rear, r }, { x: -track, z: rear, r }], track, length: [tail - 0.5, nose + 0.3], height: deckY + 0.6 };
}

// --- 4. pickup -----------------------------------------------------------------

export function pickup(k, v, o) {
  const r = 0.41;
  const track = 0.84;
  const front = 1.62;
  const rear = -1.6;
  const hw = 0.94;
  const nose = 2.6;
  const tail = -2.75;
  const sill = 0.52;
  const belt = 1.16;
  const roof = 1.92;
  const hood = 1.06;
  const cabFront = 0.9;
  const doubleCab = o.doubleCab ?? v.chance(0.55);
  const cabRear = doubleCab ? -0.55 : 0.15;
  const proto = tyres(v, { r, w: 0.27, rimR: 0.215 });
  addWheels(k, proto, { front, rear, track, steer: v.steer, seed: v.seed });
  chassis(k, { front, rear, track, r, railHW: 0.44, nose, tail, leaf: true, coilFront: true, tankSide: -1 });
  const P = paintShade(v, { fixings: [[hw, belt - 0.16, 0.35], [-hw, belt - 0.16, 0.35], [hw, belt - 0.2, tail + 0.3], [-hw, belt - 0.2, tail + 0.3]], floorY: sill });
  const b = bonnetBody(k, {
    hw, sill, belt, roof, hood, nose, cabFront, cabRear, tail, front, rear, r,
    style: 'pickup', doors: doubleCab ? 4 : 2, paintKey: v.paintKey, paint: P, glassKey: v.glassKey, brokenPane: v.brokenPane, missingPanel: v.missingPanel, crackedLens: v.crackedLens,
    lightsOn: o.lightsOn, markersOn: mk(o), dome: o.dome, rake: 0.32, bullbar: v.chance(0.5), roundLamps: v.chance(0.4), seatTint: v.pick(SEATS),
  });
  // the load: crates, a drum, cans, a rolled tent, all under a net
  const bf = b.bedFloor;
  const bedStart = cabRear - 0.1;
  const bedMid = (bedStart + tail) * 0.5;
  const items = [];
  const put = (fn, x, z, h, w, d) => {
    fn();
    items.push({ x, z, h, w, d });
  };
  put(() => crate(k, { x: -0.35, y: bf, z: bedMid + 0.5, w: 0.7, h: 0.5, d: 0.6, seed: v.seed }), -0.35, bedMid + 0.5, 0.5, 0.7, 0.6);
  put(() => crate(k, { x: 0.35, y: bf, z: bedMid + 0.45, w: 0.55, h: 0.36, d: 0.55, rot: 0.15, tint: 0x9a8058, seed: v.seed + 1 }), 0.35, bedMid + 0.45, 0.36, 0.55, 0.55);
  put(() => drum(k, { x: 0.38, y: bf + 0.44, z: bedMid - 0.35, tint: v.pick([0x3a5a7a, 0x8c3b22, 0x2b4530]), rust: v.age, seed: v.seed }), 0.38, bedMid - 0.35, 0.88, 0.58, 0.58);
  put(() => canRack(k, { x: -0.42, y: bf, z: bedMid - 0.4, n: 2, along: 'z', rot: Math.PI / 2 }), -0.42, bedMid - 0.4, 0.5, 0.4, 0.8);
  k.add('canvas', cylZ(0.16, 0.16, 1.2, 12), { pos: [-0.3, bf + 0.66, bedMid + 0.3], rot: [0, 0, 0.1], shade: grime(0x6f6a55, { up: 0.3, dust: 0x9a8e70 }) });
  items.push({ x: -0.3, z: bedMid + 0.3, h: 0.82, w: 0.32, d: 1.2 });
  const heightAt = (x, z) => {
    let y = bf + 0.02;
    for (const it of items) {
      const dx = Math.abs(x - it.x) / (it.w * 0.5 + 0.08);
      const dz = Math.abs(z - it.z) / (it.d * 0.5 + 0.08);
      const d = Math.max(dx, dz);
      if (d < 1.25) y = Math.max(y, bf + it.h * (1 - Math.max(0, d - 1) * 3));
    }
    return Math.max(y, b.bedTop - 0.05);
  };
  cargoNet(k, { x0: -hw + 0.1, x1: hw - 0.1, z0: bedStart - 0.05, z1: tail + 0.12, heightAt });
  lashing(k, { x: 0, z: bedMid - 0.35, y0: b.bedTop - 0.02, y1: bf + 0.88, halfW: hw - 0.12, along: 'x' });
  if (v.chance(0.5)) lightBar(k, { y: roof + 0.12, z: cabFront - 0.5, len: 0.9, on: false });
  else roofRack(k, { x: hw - 0.16, z0: cabFront - 0.45, z1: cabRear + 0.1, y: roof + 0.1, h: 0.12, legs: [cabFront - 0.6, cabRear + 0.25], legH: 0.08 });
  if (v.chance(0.6)) snorkel(k, { side: 1, x: hw - 0.06, y0: hood - 0.08, y1: roof - 0.06, z0: cabFront + 0.3, z1: cabFront - 0.25 });
  aerial(k, { x: hw - 0.2, y: hood - 0.05, z: cabFront + 0.3, h: 1.0, phase: v.seed + 3, amp: 0.03 });
  for (const s of [-1, 1]) mudFlap(k, { x: s * track, z: rear - r - 0.12, y: sill - 0.02, w: 0.34, h: 0.3 });
  hitch(k, { y: sill - 0.12, z: tail - 0.06 });
  if (o.lightsOn) lampPool(k, { z: nose });
  return { wheels: [{ x: track, z: front, r }, { x: -track, z: front, r }, { x: track, z: rear, r }, { x: -track, z: rear, r }], track, length: [tail - 0.4, nose + 0.3], height: roof + 0.4 };
}

// --- 5. ranger vehicle ---------------------------------------------------------

export function ranger(k, v, o) {
  const r = 0.4;
  const track = 0.8;
  const front = 1.32;
  const rear = -1.1;
  const hw = 0.9;
  const nose = 2.2;
  const tail = -1.95;
  const sill = 0.52;
  const belt = 1.14;
  const roof = 2.0;
  const hood = 1.04;
  const cabFront = 0.72;
  const cabRear = -0.75;
  const proto = tyres(v, { r, w: 0.27, rimR: 0.215, style: 'steel' });
  addWheels(k, proto, { front, rear, track, steer: v.steer, seed: v.seed });
  chassis(k, { front, rear, track, r, railHW: 0.42, nose, tail, leaf: false, coilFront: true, tankSide: -1 });
  // livery: green body, white roof and pillars, gold stripe on the doors
  const P = twoTone(v, PALETTE.rangerWhite, PALETTE.rangerGreen, belt + 0.04);
  bonnetBody(k, {
    hw, sill, belt, roof, hood, nose, cabFront, cabRear, tail, front, rear, r,
    style: 'wagon', doors: 2, paintKey: 'paint', paint: P, glassKey: v.glassKey, brokenPane: v.brokenPane, missingPanel: v.missingPanel, crackedLens: v.crackedLens,
    lightsOn: o.lightsOn, markersOn: mk(o), dome: o.dome, rake: 0.28, bullbar: true, roundLamps: true, seatTint: 0x3a3f36,
  });
  for (const s of [-1, 1]) {
    decal(k, 'rangerStripe', { w: cabFront - tail - 0.3, h: 0.14, pos: [s * (hw + 0.012), sill + (belt - sill) * 0.66, (cabFront + tail) * 0.5 - 0.05], rot: [0, s * Math.PI / 2, 0] });
    decal(k, 'ranger', { w: 1.05, h: 0.2, pos: [s * (hw + 0.014), sill + (belt - sill) * 0.66 + 0.2, (cabFront + cabRear) * 0.5 - 0.05], rot: [0, s * Math.PI / 2, 0] });
  }
  decal(k, 'parks', { w: 1.0, h: 0.18, pos: [0, belt - 0.22, tail - 0.045], rot: [0, Math.PI, 0] });
  decal(k, 'unit', { w: 0.34, h: 0.34, pos: [-0.45, hood + 0.008, 1.3], rot: [-Math.PI / 2, 0, 0] });
  // spare on the bonnet, beacon bar, aerials, spots
  spare(k, proto, { x: 0.3, y: hood + proto.w * 0.5 + 0.04, z: 1.45, axis: 'y' });
  beaconBar(k, { y: roof + 0.12, z: cabFront - 0.55, len: 1.1, on: false });
  aerial(k, { x: hw - 0.15, y: roof, z: tail + 0.35, h: 1.8, phase: v.seed + 4, amp: 0.06 });
  aerial(k, { x: -hw + 0.18, y: hood - 0.04, z: cabFront + 0.3, h: 1.1, phase: v.seed + 5, amp: 0.03 });
  spots(k, { xs: [-0.55, 0.55], y: roof + 0.1, z: cabFront - 0.3, r: 0.07, on: false });
  k.add('steel', gbox(0.04, 0.05, 1.0, 0.008), { pos: [0, roof + 0.03, cabFront - 0.9], shade: STEEL });
  spots(k, { xs: [-0.3, 0.3], y: hood + 0.14, z: nose + 0.14, r: 0.06, on: false });
  // shovel and a hi-lift jack strapped along the flank
  k.add('rust', gbox(0.03, 0.06, 1.2, 0.006), { pos: [hw + 0.03, belt + 0.03, -0.6], tint: 0x5a4a3c });
  k.add('rust', gbox(0.03, 0.14, 0.2, 0.01), { pos: [hw + 0.03, belt + 0.03, -1.3], tint: 0x5a4a3c });
  k.add('steel', gbox(0.03, 0.12, 1.1, 0.006), { pos: [-hw - 0.03, belt + 0.05, -0.5], shade: grime(0x8c3b22, { up: 0.4 }) });
  for (const s of [-1, 1]) mudFlap(k, { x: s * track, z: rear - r - 0.12, y: sill - 0.02, w: 0.34, h: 0.3 });
  hitch(k, { y: sill - 0.12, z: tail - 0.06 });
  if (o.lightsOn) lampPool(k, { z: nose });
  return { wheels: [{ x: track, z: front, r }, { x: -track, z: front, r }, { x: track, z: rear, r }, { x: -track, z: rear, r }], track, length: [tail - 0.4, nose + 0.3], height: roof + 0.3 };
}

// --- 6. camp utility: a little flat-deck workhorse -------------------------------

export function utility(k, v, o) {
  const r = 0.3;
  const track = 0.62;
  const front = 1.15;
  const rear = -1.0;
  const hw = 0.72;
  const nose = 1.75;
  const tail = -2.1;
  const railY = r + 0.14;
  const proto = tyres(v, { r, w: 0.19, rimR: 0.17, style: 'steel', lugs: 16 });
  addWheels(k, proto, { front, rear, track, steer: v.steer, seed: v.seed });
  chassis(k, { front, rear, track, r, railHW: 0.32, railY, nose: nose - 0.15, tail: tail + 0.1, leaf: true, coilFront: false, tankSide: -1, exhaust: true });
  const floorY = railY + 0.06;
  const roof = 1.76;
  // A work truck: the cab in the fleet colour with a white roof, a heavier
  // edge-wear pass than anything else in the camp, and the deck in the
  // galvanised grey it was delivered in.
  const P = paintShade(v, { fixings: [[hw, floorY + 0.3, 1.2], [-hw, floorY + 0.3, 1.2]], floorY: floorY - 0.15, edge: 0.45 + v.age * 0.5 });
  const PR = paintShade(v, { tint: PALETTE.white, edge: 0.3 });
  const PD = paintShade(v, { tint: 0x9a9c96, edge: 0.6 });
  cabOverCab(k, {
    hw, floorY, roof, front: nose, rear: 0.3, wheelZ: front, r, paintKey: v.paintKey, paint: P, roofPaint: PR, glassKey: v.glassKey, lightsOn: o.lightsOn, markersOn: mk(o),
    skirt: 0.16, bumperY: floorY - 0.1, beltUp: 0.6, brokenPane: v.brokenPane, missingPanel: v.missingPanel, crackedLens: v.crackedLens, big: false, seatTint: v.pick(SEATS),
    bevel: 0.025,
  });
  const { deckY } = flatDeck(k, { hw: hw + 0.03, y: railY + 0.12, z0: 0.25, z1: tail, sides: 0.28, headboard: 0.55, key: 'paint', paint: PD });
  // the day's load: gas bottles, a water tank, a toolbox, a coil of hose
  tank(k, { x: -0.25, y: deckY + 0.24, z: -0.6, r: 0.23, len: 0.9, axis: 'z', tint: 0xd8d4c4, tap: true });
  for (const [i, x] of [0.28, 0.5].entries()) {
    k.add('paint', cyl(0.12, 0.12, 0.6, 14), { pos: [x, deckY + 0.3, -0.45 + i * 0.05], shade: grime(i ? 0xb8b0a0 : 0xc9741f, { up: 0.4, jitter: 0.06 }) });
    k.add('steel', cyl(0.04, 0.05, 0.08, 8), { pos: [x, deckY + 0.64, -0.45 + i * 0.05], shade: STEEL });
    k.add('steel', new THREE.TorusGeometry(0.1, 0.01, 6, 14), { pos: [x, deckY + 0.66, -0.45 + i * 0.05], rot: [Math.PI / 2, 0, 0], shade: STEEL });
  }
  k.add('trim', gbox(0.7, 0.28, 0.4, 0.02), { pos: [0.1, deckY + 0.14, -1.5], shade: grime(0x3c4045, { up: 0.4 }) });
  k.add('chrome', gbox(0.2, 0.03, 0.04, 0.005), { pos: [0.1, deckY + 0.29, -1.3], tint: 0xb4b8bb });
  stowedRope(k, { x: -0.4, y: deckY + 0.05, z: -1.6, r: 0.18 });
  lashing(k, { x: 0, z: -0.5, y0: deckY + 0.28, y1: deckY + 0.48, halfW: hw - 0.05, along: 'x' });
  decal(k, 'hazard', { w: 1.3, h: 0.12, pos: [0, deckY - 0.1, tail - 0.045], rot: [0, Math.PI, 0] });
  for (const s of [-1, 1]) rectLamp(k, { pos: [s * (hw - 0.14), deckY - 0.12, tail - 0.05], w: 0.12, h: 0.09, dir: -1, on: mk(o) });
  aerial(k, { x: -hw + 0.1, y: roof, z: 0.6, h: 0.8, phase: v.seed + 6, amp: 0.03 });
  k.add('amber', gbox(0.12, 0.08, 0.12, 0.02), { pos: [0, roof + 0.05, 1.2], tint: 0xffffff });
  if (o.lightsOn) lampPool(k, { z: nose, w: 2.0, len: 3.6 });
  return { wheels: [{ x: track, z: front, r }, { x: -track, z: front, r }, { x: track, z: rear, r }, { x: -track, z: rear, r }], track, length: [tail - 0.2, nose + 0.2], height: roof + 0.1 };
}

/** The other utility: a quad with front and rear racks. */
export function quad(k, v, o) {
  const r = 0.3;
  const track = 0.5;
  const front = 0.62;
  const rear = -0.62;
  const proto = tyres(v, { r, w: 0.24, rimR: 0.14, style: 'quad', lugs: 14 });
  addWheels(k, proto, { front, rear, track, steer: v.steer, seed: v.seed, camber: 0 });
  const P = paintShade(v);
  // frame and body
  k.add('steel', gbox(0.36, 0.08, 1.5, 0.02), { pos: [0, 0.34, 0], shade: STEEL });
  for (const [z, isFront] of [[front, true], [rear, false]]) {
    k.add('steel', cylX(0.03, 0.03, track * 2 - 0.1, 8), { pos: [0, r, z], shade: STEEL });
    k.addMirrored('steel', gbox(0.05, 0.05, 0.4, 0.01), { pos: [track - 0.2, r + 0.02, z + (isFront ? -0.2 : 0.2)], rot: [isFront ? 0.15 : -0.15, 0, 0], shade: STEEL });
    k.addMirrored('steel', coil(0.04, 0.22, 5, 0.01), { pos: [track - 0.18, r + 0.04, z], rot: [0, 0, 0.3], shade: grime(0x8c3b22, { up: 0.4 }) });
  }
  k.add(v.paintKey, gbox(0.9, 0.16, 1.0, 0.06), { pos: [0, 0.5, 0.1], shade: P });
  k.add(v.paintKey, gbox(0.84, 0.16, 0.5, 0.08), { pos: [0, 0.6, 0.55], rot: [-0.2, 0, 0], shade: P });
  for (const s of [-1, 1]) {
    k.add(v.paintKey, bend(r + 0.08, 0.05, Math.PI * 0.8, 10), { pos: [s * (track + 0.02), r - 0.02, front], rot: [0, Math.PI / 2, 0.35], shade: P });
    k.add(v.paintKey, bend(r + 0.08, 0.05, Math.PI * 0.8, 10), { pos: [s * (track + 0.02), r - 0.02, rear], rot: [0, Math.PI / 2, 0.35], shade: P });
    k.add('trim', gbox(0.12, 0.03, 0.9, 0.008), { pos: [s * (track - 0.08), 0.28, 0], tint: 0x32363b });
  }
  k.add('steel', gbox(0.3, 0.3, 0.36, 0.04), { pos: [0, 0.42, -0.05], shade: grime(0x555a5e, { up: 0.6 }) });
  k.add('vinyl', gbox(0.36, 0.14, 0.62, 0.05), { pos: [0, 0.74, -0.3], shade: grime(0x2b2926, { up: 0.5, dust: 0x8d7f63 }) });
  k.add(v.paintKey, gbox(0.34, 0.2, 0.36, 0.06), { pos: [0, 0.72, 0.16], shade: P });
  // steering column, bars, headlamps, racks
  k.add('steel', cyl(0.02, 0.02, 0.4, 8), { pos: [0, 0.9, 0.35], rot: [-0.4, 0, 0], shade: STEEL });
  k.add('steel', cylX(0.014, 0.014, 0.74, 8), { pos: [0, 1.06, 0.28], shade: STEEL });
  k.addMirrored('rubber', cylX(0.02, 0.02, 0.12, 8), { pos: [0.32, 1.06, 0.28], tint: 0x262b34 });
  for (const s of [-1, 1]) roundLamp(k, { pos: [s * 0.2, 0.76, 0.82], r: 0.05, on: o.lightsOn, depth: 0.05 });
  roundLamp(k, { pos: [0, 0.68, -0.72], r: 0.04, dir: -1, kind: 'tail', on: o.lightsOn, depth: 0.03 });
  roofRack(k, { x: 0.32, z0: 0.92, z1: 0.62, y: 0.7, h: 0.05, slats: true });
  roofRack(k, { x: 0.36, z0: -0.4, z1: -0.86, y: 0.7, h: 0.05, slats: true });
  jerryCan(k, { x: -0.1, y: 0.73, z: -0.62, rot: Math.PI / 2, tint: 0x5a5d3a, label: 'diesel' });
  crate(k, { x: 0.22, y: 0.73, z: -0.6, w: 0.28, h: 0.24, d: 0.3, seed: v.seed });
  k.add('steel', tube([[-0.3, 0.32, 0.9], [-0.3, 0.42, 0.98], [0.3, 0.42, 0.98], [0.3, 0.32, 0.9]], 0.018, 8), { shade: STEEL });
  k.add('steel', tube([[-0.3, 0.32, -0.9], [-0.3, 0.42, -0.98], [0.3, 0.42, -0.98], [0.3, 0.32, -0.9]], 0.018, 8), { shade: STEEL });
  return { wheels: [{ x: track, z: front, r }, { x: -track, z: front, r }, { x: track, z: rear, r }, { x: -track, z: rear, r }], track, length: [-1.1, 1.1], height: 1.1 };
}

// --- 7. supply truck -----------------------------------------------------------

export function supplyTruck(k, v, o) {
  const r = 0.5;
  const track = 0.95;
  const front = 2.35;
  const rear = -1.75;
  const hw = 1.12;
  const nose = 3.45;
  const cabFront = 1.7;
  const cabRear = 0.4;
  const tail = -3.95;
  const sill = 0.78;
  const belt = 1.6;
  const roof = 2.62;
  const hood = 1.55;
  const proto = tyres(v, { r, w: 0.3, rimR: 0.26, style: 'truck', lugs: 22 });
  addWheels(k, proto, { front, rear, track, steer: v.steer, seed: v.seed, dual: true });
  const railY = r + 0.42;
  chassis(k, { front, rear, track, r, railHW: 0.46, railY, nose: nose - 0.2, tail: tail + 0.15, leaf: true, coilFront: false, heavy: true, tankSide: 1 });
  const P = paintShade(v, { fixings: [[hw, belt - 0.2, 1.4], [-hw, belt - 0.2, 1.4], [hw, sill + 0.1, 0.6], [-hw, sill + 0.1, 0.6]], floorY: sill });
  bonnetBody(k, {
    hw, sill, belt, roof, hood, nose, cabFront, cabRear, tail: cabRear - 0.05, front, rear, r,
    style: 'truck', doors: 2, paintKey: v.paintKey, paint: P, glassKey: v.glassKey, brokenPane: v.brokenPane, missingPanel: v.missingPanel, crackedLens: v.crackedLens,
    lightsOn: o.lightsOn, markersOn: mk(o), rake: 0.18, bullbar: false, roundLamps: true, interior: true, seatTint: v.pick(SEATS),
  });
  // the deck and its load
  const deckHW = hw + 0.04;
  const { deckY } = flatDeck(k, { hw: deckHW, y: railY + 0.2, z0: cabRear - 0.15, z1: tail, sides: 0.45, headboard: 1.05, key: v.paintKey, paint: P });
  const drumTints = [0x3a5a7a, 0x8c3b22, 0x2b4530, 0xd0a134, 0x6e747a];
  const drumZ0 = cabRear - 0.75;
  let n = 0;
  for (let row = 0; row < 2; row++) {
    for (let c = 0; c < 3; c++) {
      if (jit(row * 3 + c, v.seed) < 0.15) continue;
      drum(k, { x: (c - 1) * 0.66, y: deckY + 0.44, z: drumZ0 - row * 0.66, tint: drumTints[(n + v.ordinal) % drumTints.length], rust: v.age * 0.8 + 0.1, seed: v.seed + n });
      n++;
    }
  }
  lashing(k, { x: 0, z: drumZ0 - 0.33, y0: deckY + 0.45, y1: deckY + 0.88, halfW: deckHW, along: 'x' });
  crate(k, { x: -0.45, y: deckY, z: -2.55, w: 0.9, h: 0.7, d: 0.9, seed: v.seed + 7 });
  crate(k, { x: 0.5, y: deckY, z: -2.5, w: 0.7, h: 0.5, d: 0.8, rot: 0.08, tint: 0x9a8058, seed: v.seed + 8 });
  crate(k, { x: 0.45, y: deckY + 0.5, z: -2.5, w: 0.6, h: 0.4, d: 0.6, rot: -0.1, tint: 0x7a6a4a, seed: v.seed + 9 });
  lashing(k, { x: 0, z: -2.55, y0: deckY + 0.45, y1: deckY + 0.9, halfW: deckHW, along: 'x' });
  canRack(k, { x: 0, y: deckY, z: -3.55, n: 3, along: 'x', tints: [0x5a5d3a, 0x3a3a3a, 0x5a5d3a] });
  // exhaust stack, mirrors are in the cab, spare under the deck tail, hazard board
  k.add('rust', cyl(0.05, 0.05, 1.5, 12), { pos: [-hw + 0.1, railY + 1.3, cabRear - 0.1], tint: 0x5e5048 });
  k.add('steel', cyl(0.065, 0.055, 0.18, 12), { pos: [-hw + 0.1, railY + 2.1, cabRear - 0.1], rot: [0.3, 0, 0], shade: STEEL });
  spare(k, proto, { x: 0.2, y: railY - 0.02, z: tail + 0.55, axis: 'y', carrier: false });
  k.add('steel', gbox(0.08, 0.05, 1.2, 0.01), { pos: [0.2, railY - 0.02 - proto.w * 0.5 - 0.03, tail + 0.55], shade: STEEL });
  decal(k, 'hazard', { w: 2.0, h: 0.16, pos: [0, railY + 0.06, tail - 0.06], rot: [0, Math.PI, 0] });
  for (const s of [-1, 1]) rectLamp(k, { pos: [s * (deckHW - 0.2), railY - 0.08, tail - 0.06], w: 0.22, h: 0.1, dir: -1, on: mk(o) });
  decal(k, 'plate2', { w: 0.42, h: 0.1, pos: [0, railY - 0.1, tail - 0.07], rot: [0, Math.PI, 0] });
  for (const s of [-1, 1]) mudFlap(k, { x: s * track, z: rear - r - 0.16, y: railY, w: 0.6, h: 0.42 });
  k.addMirrored('steel', gbox(0.06, 0.05, 0.5, 0.01), { pos: [hw - 0.1, sill - 0.25, cabFront - 0.2], shade: STEEL });
  k.addMirrored('plate', gbox(0.3, 0.03, 0.4, 0.006), { pos: [hw + 0.02, sill - 0.3, (cabFront + cabRear) * 0.5], tint: 0x8a8d88 });
  aerial(k, { x: hw - 0.15, y: roof, z: cabRear + 0.2, h: 1.0, phase: v.seed + 7, amp: 0.03 });
  if (o.lightsOn) lampPool(k, { z: nose, w: 3.0, len: 5.0 });
  return { wheels: [{ x: track, z: front, r }, { x: -track, z: front, r }, { x: track + 0.15, z: rear, r }, { x: -track - 0.15, z: rear, r }], track, length: [tail - 0.3, nose + 0.2], height: roof + 0.3 };
}

// --- 8. overland camper -----------------------------------------------------------

export function camper(k, v, o) {
  const r = 0.42;
  const track = 0.84;
  const front = 1.62;
  const rear = -1.55;
  const hw = 0.95;
  const nose = 2.6;
  const cabFront = 0.9;
  const cabRear = -0.45;
  const tail = -3.05;
  const sill = 0.54;
  const belt = 1.18;
  const roof = 1.96;
  const hood = 1.08;
  const proto = tyres(v, { r, w: 0.28, rimR: 0.215 });
  addWheels(k, proto, { front, rear, track, steer: v.steer, seed: v.seed });
  chassis(k, { front, rear, track, r, railHW: 0.44, nose, tail, leaf: true, coilFront: true, tankSide: 1 });
  const P = paintShade(v, { fixings: [[hw, belt - 0.16, 0.3], [-hw, belt - 0.16, 0.3]], floorY: sill });
  bonnetBody(k, {
    hw, sill, belt, roof, hood, nose, cabFront, cabRear, tail: cabRear - 0.05, front, rear, r,
    style: 'truck', doors: 2, paintKey: v.paintKey, paint: P, glassKey: v.glassKey, brokenPane: v.brokenPane, missingPanel: v.missingPanel, crackedLens: v.crackedLens,
    lightsOn: o.lightsOn, markersOn: mk(o), rake: 0.3, bullbar: v.chance(0.6), roundLamps: false, seatTint: v.pick(SEATS),
  });
  // the habitation box: wider than the cab, an alcove out over the cab roof
  const bx = 1.08;
  const by0 = sill + 0.36;
  const bh = 1.5;
  const z0 = cabRear - 0.12;
  const z1 = tail + 0.05;
  const PB = paintShade(v, { tint: PALETTE.cream, fixings: [], floorY: by0 });
  const { top } = boxBody(k, {
    hw: bx, y0: by0, h: bh, z0, z1, key: 'paint', paint: PB, glassKey: 'glassDark',
    windows: [
      { y: by0 + 0.95, z: -1.25, w: 0.8, h: 0.45, lit: o.cabin },
      { y: by0 + 0.95, z: -2.35, w: 0.55, h: 0.45, sides: [1], lit: o.cabin },
    ],
    doorZ: z1,
    hatches: [{ y: by0 + 0.3, z: -2.3, w: 0.7, h: 0.4, sides: [-1] }],
    roofRail: false,
    seams: 3,
  });
  // skirt down over the rear wheels between box and frame
  const ar = r + 0.11;
  const skirtPts = [[z0, sill - 0.02], ...archCut(rear, ar, sill - 0.02), [z1, sill - 0.02], [z1, by0 + 0.02], [z0, by0 + 0.02]];
  k.addMirrored('paint', sidePanel(skirtPts, 0.04, 0.008), { pos: [bx - 0.05, 0, 0], shade: PB });
  k.addMirrored('gap', cylX(ar - 0.005, ar - 0.005, 0.5, 18, true), { pos: [bx - 0.3, ar * 0.98, rear], tint: 0x0b0c0d });
  k.addMirrored('trim', bend(ar + 0.02, 0.028, Math.PI, 14), { pos: [bx - 0.04, ar * 0.98, rear], rot: [0, Math.PI / 2, 0], tint: 0x383c41 });
  // alcove over the cab
  k.add('paint', gbox(bx * 2, 0.5, 1.15, 0.08), { pos: [0, top - 0.25, cabRear + 0.45], shade: PB });
  k.add('paint', gbox(bx * 2 - 0.1, 0.14, 0.3, 0.05), { pos: [0, top - 0.55, cabRear + 0.9], rot: [0.5, 0, 0], shade: PB });
  // pop-top: the lid lifted on canvas walls
  const lift = o.popUp ? 0.6 : 0.0;
  const lidY = top + lift;
  const lidZ0 = z0 - 0.1;
  const lidZ1 = z1 + 0.1;
  k.add('trim', gbox(bx * 2 - 0.05, 0.12, lidZ0 - lidZ1, 0.05), { pos: [0, lidY + 0.06, (lidZ0 + lidZ1) * 0.5], shade: grime(0xd8d2c0, { up: 0.4, dust: 0x9a8b6b }) });
  if (lift > 0) {
    const cs = grime(0x8b8064, { up: 0.3, dust: 0x9a8e70, jitter: 0.06 });
    const flap = (px, py) => [0.012 * Math.sin(((py - top) / lift) * Math.PI), px * 2 + v.seed];
    for (const s of [-1, 1]) k.add('canvas', paneGeo(lidZ0 - lidZ1 - 0.1, lift), { pos: [s * (bx - 0.04), top + lift * 0.5, (lidZ0 + lidZ1) * 0.5], rot: [0, s * Math.PI / 2, 0], shade: cs, flap });
    for (const [z, rot] of [[lidZ0 - 0.04, 0], [lidZ1 + 0.04, Math.PI]]) k.add('canvas', paneGeo(bx * 2 - 0.1, lift), { pos: [0, top + lift * 0.5, z], rot: [0, rot, 0], shade: cs, flap });
    // mesh windows in the canvas
    const win = new THREE.PlaneGeometry(0.7, 0.3);
    const uv = win.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 12, uv.getY(i) * 5);
    for (const s of [-1, 1]) k.add('mesh', win, { pos: [s * (bx - 0.03), top + lift * 0.55, -1.5], rot: [0, s * Math.PI / 2, 0], tint: 0x2e3135 });
  }
  // roof: solar, vent, rack for a box
  k.add('trimGloss', gbox(1.2, 0.03, 0.8, 0.006), { pos: [0.3, lidY + 0.14, -1.4], tint: 0x1c2436 });
  k.add('alu', gbox(1.24, 0.02, 0.84, 0.004), { pos: [0.3, lidY + 0.12, -1.4], tint: 0x9a9ea2 });
  k.add('trim', gbox(0.4, 0.08, 0.4, 0.02), { pos: [-0.5, lidY + 0.16, -2.4], tint: 0xd8d2c0 });
  // awning out on the shade side, ladder to the roof, spare and cans on the back
  awning(k, { side: -1, x: bx + 0.04, y: top - 0.08, z0: -0.7, z1: -2.8, open: o.awningOpen ?? true, out: 2.0, tint: v.pick([0x8b8064, 0x6f6a55, 0xb0a482]), seed: v.seed });
  ladder(k, { x: -0.7, y0: by0 + 0.1, y1: lidY + 0.15, z: z1 - 0.06 });
  spare(k, proto, { x: 0.55, y: by0 + 0.72, z: z1 - proto.w * 0.5 - 0.06, axis: 'z', side: -1 });
  for (const s of [-1, 1]) rectLamp(k, { pos: [s * (bx - 0.22), by0 + 0.1, z1 - 0.03], w: 0.16, h: 0.16, dir: -1, on: mk(o), segments: ['tail', 'amber'] });
  decal(k, 'plate', { w: 0.42, h: 0.1, pos: [-0.35, by0 + 0.08, z1 - 0.05], rot: [0, Math.PI, 0] });
  k.add('steel', gbox(bx * 2, 0.1, 0.16, 0.02), { pos: [0, sill - 0.08, z1 - 0.08], shade: grime(0x4a4e52, { up: 0.6, down: 0.45 }) });
  hitch(k, { y: sill - 0.12, z: tail - 0.1 });
  snorkel(k, { side: 1, x: hw - 0.06, y0: hood - 0.08, y1: roof - 0.06, z0: cabFront + 0.3, z1: cabFront - 0.25 });
  for (const s of [-1, 1]) mudFlap(k, { x: s * track, z: rear - r - 0.12, y: sill - 0.02, w: 0.34, h: 0.3 });
  if (o.lightsOn) lampPool(k, { z: nose });
  return { wheels: [{ x: track, z: front, r }, { x: -track, z: front, r }, { x: track, z: rear, r }, { x: -track, z: rear, r }], track, length: [tail - 0.5, nose + 0.3], height: lidY + 0.3 };
}

// --- 9. off-road trailer -----------------------------------------------------------

export function trailer(k, v, o) {
  const r = 0.4;
  const track = 0.8;
  const hw = 0.85;
  const z0 = 1.0;
  const z1 = -1.35;
  const y0 = 0.72;
  const h = 0.92;
  const proto = tyres(v, { r, w: 0.27, rimR: 0.215 });
  for (const side of [-1, 1]) addWheel(k, proto, { x: side * track, z: 0, side, spin: v.rnd() * 6 });
  // frame: two rails, cross members, axle on leaf springs, fenders
  const railY = y0 - 0.06;
  k.addMirrored('steel', gbox(0.05, 0.1, z0 - z1 + 0.1, 0.008), { pos: [0.45, railY, (z0 + z1) * 0.5], shade: STEEL });
  for (const z of [z0 - 0.05, 0.4, -0.4, z1 + 0.05]) k.add('steel', gbox(0.9, 0.07, 0.05, 0.006), { pos: [0, railY, z], shade: STEEL });
  k.add('steel', cylX(0.04, 0.04, track * 2 - 0.1, 10), { pos: [0, r, 0], shade: grime(0x666a6e, { up: 0.7, down: 0.45 }) });
  k.addMirrored('steel', gbox(0.09, 0.16, 0.12, 0.02), { pos: [track - 0.12, r, 0], shade: STEEL });
  k.addMirrored('steel', bend(1.2, 0.013, 0.8, 10), { pos: [0.47, r + 1.2 + 0.03, 0], rot: [0, Math.PI / 2, -Math.PI / 2 - 0.4], shade: STEEL });
  k.addMirrored('steel', cyl(0.028, 0.028, railY - r - 0.08, 10), { pos: [track - 0.28, (railY + r) * 0.5, 0.12], rot: [0.1, 0, 0.12], shade: grime(0x3c4145, { up: 0.6 }) });
  k.addMirrored('trim', bend(r + 0.12, 0.05, Math.PI, 14), { pos: [hw + 0.05, r * 0.98, 0], rot: [0, Math.PI / 2, 0], tint: 0x383c41 });
  k.addMirrored('trim', gbox(0.44, 0.02, (r + 0.12) * 2, 0.006), { pos: [hw + 0.05, y0 - 0.02, 0], tint: 0x383c41 });
  // the box, and the kitchen slide-out on the right
  const P = paintShade(v, { fixings: [[hw, y0 + 0.1, 0.8], [-hw, y0 + 0.1, 0.8], [hw, y0 + 0.1, -1.2], [-hw, y0 + 0.1, -1.2]], floorY: y0 });
  const { top } = boxBody(k, {
    hw, y0, h, z0, z1, key: v.paintKey, paint: P,
    windows: [],
    doorZ: null,
    hatches: [
      { y: y0 + 0.45, z: 0.35, w: 0.9, h: 0.6, sides: [-1] },
      { y: y0 + 0.45, z: -0.75, w: 0.8, h: 0.6, sides: [-1] },
      { y: y0 + 0.45, z: -0.75, w: 0.8, h: 0.6, sides: [1] },
    ],
    roofRail: false,
    seams: 3,
  });
  const slide = o.slideOut ?? true;
  if (slide) {
    const sx = hw + 0.35;
    k.add('alu', gbox(0.7, 0.5, 0.95, 0.01), { pos: [sx, y0 + 0.4, 0.35], shade: grime(0x8d9398, { dust: 0x736a58, up: 0.4, down: 0.2 }) });
    k.add('alu', gbox(0.74, 0.03, 0.99, 0.005), { pos: [sx, y0 + 0.66, 0.35], shade: grime(0x8d9398, { dust: 0x736a58, up: 0.4 }) });
    // two-burner stove, a kettle, a chopping board
    k.add('trim', gbox(0.5, 0.05, 0.36, 0.01), { pos: [sx, y0 + 0.7, 0.55], tint: 0x32363b });
    for (const dx of [-0.12, 0.12]) k.add('steel', cyl(0.08, 0.08, 0.02, 12), { pos: [sx + dx, y0 + 0.735, 0.55], shade: STEEL });
    k.add('alu', cyl(0.08, 0.07, 0.14, 12), { pos: [sx - 0.12, y0 + 0.81, 0.55], tint: 0xb4b8bb });
    k.add('rust', gbox(0.3, 0.02, 0.22, 0.004), { pos: [sx + 0.1, y0 + 0.68, 0.05], shade: grime(0x8a7250, { up: 0.4 }) });
    // gas bottle standing on the drawbar's centre bar, hose back to the stove
    const gy = railY + 0.04;
    k.add('paint', cyl(0.11, 0.11, 0.5, 14), { pos: [0, gy + 0.25, z0 + 0.95], shade: grime(0xc9741f, { up: 0.4 }) });
    k.add('steel', cyl(0.03, 0.04, 0.06, 8), { pos: [0, gy + 0.53, z0 + 0.95], shade: STEEL });
    k.add('trim', gbox(0.3, 0.02, 0.06, 0.004), { pos: [0, gy + 0.3, z0 + 0.95], tint: 0x433d34 });
    k.add('trim', tube([[0.03, gy + 0.55, z0 + 0.95], [0.5, gy + 0.5, z0 + 0.5], [hw + 0.02, y0 + 0.5, z0 - 0.1], [sx - 0.1, y0 + 0.62, 0.75]], 0.008, 5), { tint: 0xc9741f });
    // slide rails
    k.add('steel', gbox(0.7, 0.04, 0.06, 0.006), { pos: [hw + 0.1, y0 + 0.12, 0.0], shade: STEEL });
    k.add('steel', gbox(0.7, 0.04, 0.06, 0.006), { pos: [hw + 0.1, y0 + 0.12, 0.7], shade: STEEL });
  } else {
    k.add('gap', pbox(0.01, 0.6, 0.95), { pos: [hw + 0.002, y0 + 0.4, 0.35], tint: 0x0c0d0e });
  }
  // drawbar with a chequer-plate tray across the A-frame; the water tank and a
  // jerry can stand on the tray, bolted through
  const tip = drawbar(k, { y: railY, z0: z0 + 1.35, z1: z0, hw: 0.45, hitched: o.hitched ?? false });
  const trayY = railY + 0.04;
  k.add('plate', gbox(0.84, 0.02, 0.62, 0.004), { pos: [0, trayY, z0 + 0.31], tint: 0x8a8d88 });
  k.add('steel', gbox(0.84, 0.05, 0.05, 0.006), { pos: [0, trayY - 0.02, z0 + 0.6], shade: STEEL });
  tank(k, { x: -0.22, y: trayY + 0.21, z: z0 + 0.32, r: 0.2, len: 0.58, axis: 'z', tint: 0xd8d4c4, tap: false });
  canRack(k, { x: 0.26, y: trayY + 0.01, z: z0 + 0.3, n: 1, along: 'x', rot: 0, tints: [0xb43a2a], labels: ['diesel'] });
  // roof: rack with a closed tent, spare on the back, lamps, chevrons
  const { deckY } = roofRack(k, { x: hw - 0.1, z0: z0 - 0.08, z1: z1 + 0.08, y: top + 0.04, h: 0.12, slats: false, legs: [z0 - 0.3, z1 + 0.3], legH: 0.04 });
  roofTent(k, { x0: -0.7, x1: 0.7, z0: z0 - 0.2, z1: z1 + 0.3, y: deckY, open: false, tint: v.pick([0x6f6a55, 0x8b8064]) });
  spare(k, proto, { x: 0.2, y: y0 + 0.5, z: z1 - proto.w * 0.5 - 0.05, axis: 'z', side: -1 });
  for (const s of [-1, 1]) rectLamp(k, { pos: [s * (hw - 0.2), y0 + 0.14, z1 - 0.03], w: 0.18, h: 0.12, dir: -1, on: mk(o), segments: ['tail', 'amber'] });
  decal(k, 'hazard', { w: 1.4, h: 0.12, pos: [0, y0 - 0.02, z1 - 0.04], rot: [0, Math.PI, 0] });
  decal(k, 'plate2', { w: 0.36, h: 0.09, pos: [-0.45, y0 + 0.14, z1 - 0.045], rot: [0, Math.PI, 0] });
  for (const s of [-1, 1]) mudFlap(k, { x: s * track, z: -r - 0.1, y: y0 - 0.06, w: 0.3, h: 0.24 });
  edgeBolts(k, { from: [hw + 0.012, y0 + 0.05, z0 - 0.1], to: [hw + 0.012, y0 + 0.05, z1 + 0.1], n: 6, seed: v.seed });
  edgeBolts(k, { from: [-hw - 0.012, y0 + 0.05, z0 - 0.1], to: [-hw - 0.012, y0 + 0.05, z1 + 0.1], n: 6, seed: v.seed + 1 });
  // three contacts: the wheels and the jockey wheel. The stand winds up and
  // down, so the body never pitches more than 5° whatever the ground does.
  const jz = tip[2] - 0.5;
  return {
    wheels: [{ x: track, z: 0, r }, { x: -track, z: 0, r }, { x: 0.12, z: jz, r: 0.1 }],
    track,
    length: [z1 - 0.5, tip[2] + 0.1],
    // the drawbar is a pole: framing the trailer from its full length puts the
    // camera on the hitch, so the body box is what a picture of it is sized from
    body: [z1 - 0.4, z0 + 0.7],
    height: deckY + 0.5,
    maxPitch: 0.087,
  };
}

// --- 10. dual-sport motorcycle ---------------------------------------------------

export function motorcycle(k, v, o) {
  const rF = 0.34;
  const rR = 0.32;
  const zF = 0.74;
  const zR = -0.7;
  const protoF = wheelProto({ r: rF, w: 0.09, rimR: 0.265, style: 'moto', seed: v.seed, dust: v.dust });
  const protoR = wheelProto({ r: rR, w: 0.13, rimR: 0.225, style: 'moto', seed: v.seed + 1, dust: v.dust });
  addWheel(k, protoF, { x: 0, z: zF, side: 1, steer: 0.28, spin: v.rnd() * 6, squash: 0.012 });
  addWheel(k, protoR, { x: 0, z: zR, side: 1, spin: v.rnd() * 6, squash: 0.012 });
  const P = paintShade(v);
  const dark = grime(0x3c4045, { up: 0.4, jitter: 0.06 });
  // frame: headstock down to the engine cradle, back to the swingarm pivot, up to the seat rails
  const head = [0, 0.98, 0.42];
  k.add('steel', tube([head, [0, 0.62, 0.3], [0, 0.42, 0.12], [0, 0.42, -0.2]], 0.022, 8), { shade: dark });
  k.add('steel', tube([head, [0, 0.9, 0.05], [0, 0.82, -0.2], [0, 0.86, -0.75]], 0.02, 8), { shade: dark });
  k.add('steel', tube([[0, 0.42, -0.2], [0, 0.7, -0.35], [0, 0.85, -0.5]], 0.018, 8), { shade: dark });
  // swingarm to the rear axle, rear shock
  for (const s of [-1, 1]) k.add('alu', tube([[s * 0.1, 0.5, -0.2], [s * 0.1, rR, zR]], 0.018, 8), { tint: 0x9a9ea2 });
  k.add('steel', cyl(0.028, 0.028, 0.34, 10), { pos: [0.03, 0.62, -0.32], rot: [0.5, 0, 0], shade: grime(0xd0a134, { up: 0.4 }) });
  // forks, triple clamps, bars, headlamp and screen
  const forkTop = [0.11, 1.04, 0.5];
  for (const s of [-1, 1]) {
    k.add('chrome', tube([[s * forkTop[0], rF, zF], [s * forkTop[0], forkTop[1], forkTop[2]]], 0.022, 10), { tint: 0xc9cdd0 });
    k.add('trim', tube([[s * forkTop[0], rF + 0.3, zF - 0.1], [s * forkTop[0], forkTop[1] - 0.08, forkTop[2] - 0.02]], 0.03, 10), { shade: dark });
  }
  k.add('alu', gbox(0.3, 0.05, 0.1, 0.01), { pos: [0, 1.0, 0.47], rot: [0.45, 0, 0], tint: 0x9a9ea2 });
  k.add('alu', gbox(0.3, 0.05, 0.1, 0.01), { pos: [0, 0.8, 0.55], rot: [0.45, 0, 0], tint: 0x9a9ea2 });
  k.add('steel', cylX(0.014, 0.014, 0.82, 8), { pos: [0, 1.12, 0.42], shade: dark });
  k.addMirrored('rubber', cylX(0.02, 0.02, 0.13, 8), { pos: [0.36, 1.12, 0.42], tint: 0x262b34 });
  k.addMirrored('trim', gbox(0.02, 0.06, 0.12, 0.006), { pos: [0.24, 1.14, 0.44], rot: [0, 0, 0.6], tint: 0x32363b });
  k.addMirrored('trim', gbox(0.02, 0.1, 0.16, 0.006), { pos: [0.38, 1.12, 0.44], tint: 0x32363b });
  roundLamp(k, { pos: [0, 1.0, 0.6], r: 0.075, on: o.lightsOn, depth: 0.06 });
  k.add(v.paintKey, gbox(0.26, 0.24, 0.1, 0.03), { pos: [0, 0.98, 0.54], shade: P });
  k.pane(v.glassKey, paneGeo(0.3, 0.22), { pos: [0, 1.2, 0.5], rot: [-0.45, 0, 0] });
  k.add('trim', gbox(0.09, 0.05, 0.08, 0.01), { pos: [0, 1.1, 0.48], tint: 0x32363b });
  // high front fender, tank, seat, side panels, rear fender and rack
  // high front fender: a curved sheet a hand above the tyre, both faces
  const fenderR = rF + 0.075;
  // 48 round the full circle is 15 over this arc: a curve, not a crank
  const fender = new THREE.CylinderGeometry(fenderR, fenderR, 0.14, 48, 1, true, 0.6, 1.9);
  fender.rotateZ(Math.PI / 2);
  k.add(v.paintKey, fender, { pos: [0, rF + 0.03, zF], shade: P });
  k.add(v.paintKey, insideOut(fender), { pos: [0, rF + 0.03, zF], shade: P });
  // the tank: a revolved teardrop, fat over the engine and tapering to the
  // headstock, flattened a fifth so it sits between the knees
  const tank = transform(
    lathe([[0.0, -0.26], [0.05, -0.26], [0.13, -0.18], [0.165, -0.06], [0.175, 0.04], [0.16, 0.14], [0.12, 0.22], [0.06, 0.27], [0.0, 0.28]], 32),
    { rot: [0, -Math.PI / 2, 0], scale: [1, 0.78, 1] },
  );
  k.add(v.paintKey, tank, { pos: [0, 0.96, 0.14], rot: [0.08, 0, 0], shade: P });
  k.add(v.paintKey, gbox(0.3, 0.06, 0.2, 0.02), { pos: [0, 0.86, -0.06], shade: P });
  k.add('trim', cyl(0.03, 0.035, 0.03, 10), { pos: [0, 1.08, 0.05], tint: 0x32363b });
  k.add('vinyl', gbox(0.28, 0.1, 0.72, 0.04), { pos: [0, 0.9, -0.38], rot: [-0.04, 0, 0], shade: grime(0x2b2926, { up: 0.5, dust: 0x8d7f63 }) });
  k.addMirrored(v.paintKey, gbox(0.03, 0.22, 0.34, 0.02), { pos: [0.15, 0.7, -0.3], rot: [0.2, 0, 0], shade: P });
  k.add(v.paintKey, gbox(0.2, 0.05, 0.4, 0.02), { pos: [0, 0.82, -0.9], rot: [0.25, 0, 0], shade: P });
  k.add('steel', gbox(0.28, 0.02, 0.26, 0.006), { pos: [0, 0.9, -0.82], shade: dark });
  roundLamp(k, { pos: [0, 0.72, -1.0], r: 0.035, dir: -1, kind: 'tail', on: mk(o), depth: 0.03 });
  decal(k, 'plate', { w: 0.2, h: 0.05, pos: [0, 0.65, -1.02], rot: [0.2, Math.PI, 0] });
  // engine, exhaust, radiator, bash plate
  k.add('steel', gbox(0.3, 0.32, 0.36, 0.04), { pos: [0, 0.5, 0.0], shade: grime(0x555a5e, { up: 0.6, jitter: 0.08 }) });
  k.add('alu', cyl(0.1, 0.1, 0.22, 14), { pos: [0, 0.73, 0.16], rot: [0.3, 0, 0], tint: 0x9a9ea2 });
  for (let i = 0; i < 5; i++) k.add('alu', cyl(0.12, 0.12, 0.012, 14), { pos: [0, 0.66 + i * 0.035, 0.18 - i * 0.01], rot: [0.3, 0, 0], tint: 0x8a8e92 });
  k.add('alu', gbox(0.36, 0.28, 0.06, 0.01), { pos: [0, 0.78, 0.4], rot: [0.2, 0, 0], tint: 0x6a6e72 });
  k.add('rust', tube([[0.12, 0.6, 0.2], [0.17, 0.4, 0.05], [0.18, 0.5, -0.4], [0.2, 0.68, -0.85]], 0.024, 8), { tint: 0x8a7a6a });
  k.add('alu', cylZ(0.055, 0.05, 0.42, 14), { pos: [0.2, 0.7, -0.7], shade: grime(0x9a9ea2, { up: 0.3, down: 0.3, dust: 0x736a58 }) });
  k.add('alu', gbox(0.3, 0.04, 0.42, 0.01), { pos: [0, 0.31, 0.0], tint: 0x8a8e92 });
  // footpegs, chain, side stand down on the left: pivot bracket on the frame,
  // the leg out and down to a foot pad. The bike leans 9° onto it (`roll`
  // below), which brings the pad from 0.048 to the dirt.
  k.addMirrored('steel', gbox(0.12, 0.02, 0.05, 0.005), { pos: [0.2, 0.42, -0.15], shade: dark });
  k.add('steel', gbox(0.02, 0.02, zF - zR - 0.6, 0.004), { pos: [-0.1, rR + 0.05, -0.35], tint: 0x33363a });
  k.add('steel', gbox(0.04, 0.05, 0.06, 0.006), { pos: [-0.12, 0.4, -0.12], shade: dark });
  k.add('steel', tube([[-0.13, 0.39, -0.12], [-0.22, 0.2, -0.22], [-0.27, 0.06, -0.28]], 0.011, 8), { shade: dark });
  k.add('steel', gbox(0.05, 0.012, 0.07, 0.003), { pos: [-0.27, 0.048, -0.28], rot: [0, 0, 0.16], shade: dark });
  // panniers and a top box
  for (const s of [-1, 1]) pannier(k, { x: s * 0.15, y: 0.66, z: -0.6, side: s, w: 0.44, h: 0.38, d: 0.26 });
  k.add('alu', gbox(0.4, 0.28, 0.36, 0.015), { pos: [0, 1.05, -0.85], shade: grime(0x9a9ea2, { dust: 0x736a58, up: 0.4 }) });
  k.add('trim', gbox(0.42, 0.03, 0.38, 0.006), { pos: [0, 1.19, -0.85], tint: 0x433d34 });
  k.add('canvas', cylZ(0.08, 0.08, 0.36, 10), { pos: [0, 1.27, -0.85], shade: grime(0x8b8064, { up: 0.3 }) });
  k.addMirrored('trim', gbox(0.02, 0.03, 0.36, 0.004), { pos: [0.09, 1.27, -0.85], tint: 0x433d34 });
  // mirrors on stalks
  for (const s of [-1, 1]) {
    k.add('steel', tube([[s * 0.28, 1.13, 0.42], [s * 0.34, 1.34, 0.4]], 0.007, 6), { shade: dark });
    k.add('trim', gbox(0.1, 0.07, 0.02, 0.008), { pos: [s * 0.34, 1.36, 0.4], tint: 0x32363b });
  }
  if (o.lightsOn) lampPool(k, { z: zF, w: 1.4, len: 3.0 });
  return {
    wheels: [{ x: 0.2, z: zF, r: rF }, { x: -0.2, z: zF, r: rF }, { x: 0.2, z: zR, r: rR }, { x: -0.2, z: zR, r: rR }],
    track: 0.2,
    length: [zR - 0.4, zF + 0.4],
    height: 1.4,
    // leaning 9° onto the side stand: a positive roll about +Z takes the left
    // (-X) side down, which is where the stand is
    roll: 0.157,
  };
}

export const KINDS = {
  'expedition-truck': expeditionTruck,
  'safari-jeep': safariJeep,
  suv,
  pickup,
  ranger,
  utility,
  quad,
  'supply-truck': supplyTruck,
  camper,
  trailer,
  motorcycle,
};
