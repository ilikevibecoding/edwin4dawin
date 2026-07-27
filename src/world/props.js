import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat4, mul, trapBox, chunkGeo } from './geo.js';
import { groundDecal, wallDecal, groundHeight } from './streets.js';
import { rand, randRange, randInt, randPick } from '../core/rand.js';

/**
 * Props: procedural sedans (incl. burnt wrecks), jersey barriers, T-walls,
 * sandbag emplacements, HESCO, power poles with sagging wires, street lamps,
 * dumpsters, tires, pallets/crates, oil drums, market stalls, rubble piles,
 * scattered debris and map-edge berms. Repeated items are instanced.
 */

const CAR_PAINTS = [0x8f8a7a, 0x9a8f72, 0x5d6b6e, 0x74463c, 0x39434e, 0x9d9787, 0x6b7562];

export function buildProps(ctx, bres) {
  const inst = {
    sandbag: { t: [], c: [] },
    jersey: { t: [], c: [] },
    chunkA: { t: [], c: [] },
    chunkB: { t: [], c: [] },
    debris: { t: [], c: [] },
    paper: { t: [], c: [] },
    tire: { t: [], c: [] },
    drum: { t: [], c: [] },
    crate: { t: [], c: [] },
    pallet: { t: [], c: [] },
  };
  ctx.inst = inst;

  buildCars(ctx);
  buildCheckpoint(ctx);
  buildEmplacements(ctx);
  buildPolesAndWires(ctx, bres.wireAnchors);
  buildLamps(ctx);
  buildDumpsters(ctx);
  buildMarket(ctx);
  buildWoodAndBarrels(ctx);
  buildRubble(ctx, bres.rubbleSpots);
  buildCraters(ctx);
  buildEdgeBerms(ctx);
  buildCornerLots(ctx);
  scatterDebris(ctx);

  finalizeInstanced(ctx);
}

// ---------------------------------------------------------------------------
//  helpers
// ---------------------------------------------------------------------------

function obbBlock(ctx, x, z, w, d, ry) {
  const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
  ctx.navgrid.blockRect(x, z, c * w + s * d, s * w + c * d);
}

function tint(base, spread = 0.1) {
  return new THREE.Color(base).offsetHSL(randRange(-0.015, 0.015), randRange(-0.05, 0.05), randRange(-spread, spread * 0.6));
}

/** Soft dark contact-shadow blob so props never read as floating. */
function blob(ctx, x, z, w, d = null, ry = null) {
  groundDecal(ctx.buckets, 'decalShadow', x, z, w, d ?? w, ry ?? rand() * Math.PI,
    0xffffff, groundHeight(x, z) + 0.004);
}

// ---------------------------------------------------------------------------
//  cars
// ---------------------------------------------------------------------------

function addCar(ctx, x, z, ry, { paint = 0x9a9484, burnt = false, flat = false, pickup = false } = {}) {
  const { buckets } = ctx;
  const gy = groundHeight(x, z);
  const drop = flat ? 0.07 : 0;
  // wrecks slump toward one deflated front tire (pitch fwd + roll to that side)
  const deadWheel = (burnt || flat) ? (rand() < 0.5 ? 0 : 1) : -1;
  const slump = deadWheel >= 0 ? 0.045 : 0;
  const rollX = deadWheel < 0 ? 0 : (deadWheel === 0 ? 1 : -1) * slump * 0.7;
  const carM = mat4(x, gy - 0.012 - drop, z, 0, ry, 0).multiply(mat4(0, 0, 0, rollX, 0, -slump * 0.8));
  const bodyB = burnt ? 'carBurnt' : 'carPaint';
  // burnt: brighter rust base, varied strongly per panel so the wreck reads
  const pTint = burnt ? tint(0x524133, 0.05) : tint(paint, 0.06);
  const panel = () => (burnt
    ? new THREE.Color(0x524133).offsetHSL(randRange(-0.015, 0.015), randRange(-0.08, 0.02), randRange(-0.11, 0.02))
    : pTint);
  // fire chars the horizontal surfaces nearly black; dust films the tops of
  // intact cars so roofs/hoods read abandoned instead of showroom
  const charTop = () => (burnt
    ? new THREE.Color(0x2b2521).offsetHSL(0, 0, randRange(-0.02, 0.03))
    : pTint.clone().lerp(new THREE.Color(0x9d907a), 0.3));
  const cp = (bucket, geo, lx, ly, lz, rx = 0, ry2 = 0, rz = 0, color = pTint) =>
    buckets.push(bucket, geo, mul(carM, mat4(lx, ly, lz, rx, ry2, rz)), { color });

  cp(bodyB, new THREE.BoxGeometry(4.42, 0.5, 1.76), 0, 0.62, 0, 0, 0, 0, panel());
  cp(bodyB, trapBox(1.32, 0.13, 1.68, { frontShift: 0.1, sideShrink: 0.96 }), 1.52, burnt ? 0.93 : 0.895, 0, 0, 0, burnt ? 0.1 : 0, charTop());
  if (!pickup) {
    cp(bodyB, new THREE.BoxGeometry(1.0, 0.12, 1.68), -1.68, 0.88, 0, 0, 0, 0, charTop());
  }
  // grime band: dusty mud caked along the lower body
  if (!burnt) {
    cp('carPaint', new THREE.BoxGeometry(4.24, 0.2, 1.785), 0, 0.49, 0, 0, 0, 0,
      new THREE.Color(0x55493a).offsetHSL(0, 0, randRange(-0.02, 0.02)));
  }
  // dark sill shadow under the grime band
  cp('carDark', new THREE.BoxGeometry(4.2, 0.12, 1.79), 0, 0.4, 0, 0, 0, 0, new THREE.Color(0x1e1b17));
  // deep dark wheel wells poking just past the body sides
  for (const ax of [1.42, -1.4]) {
    cp('carDark', new THREE.BoxGeometry(1.02, 0.44, 1.8), ax, 0.46, 0, 0, 0, 0, new THREE.Color(0x100e0c));
  }
  // cabin
  if (pickup) {
    // cab pushed forward + open cargo bed behind
    if (burnt) {
      cp('darkIn', new THREE.BoxGeometry(1.1, 0.52, 1.42), 0.55, 1.14, 0, 0, 0, 0, new THREE.Color(0xffffff));
    } else {
      cp('carGlass', trapBox(1.2, 0.58, 1.56, { frontShift: 0.4, backShift: 0.1, sideShrink: 0.9 }), 0.58, 1.2, 0);
    }
    cp(bodyB, new THREE.BoxGeometry(1.16, 0.055, 1.46), 0.5, 1.51, 0, 0, 0, 0, charTop());
    cp(bodyB, new THREE.BoxGeometry(0.07, 0.66, 0.07), 1.06, 1.2, 0.7, 0, 0, 0.5);
    cp(bodyB, new THREE.BoxGeometry(0.07, 0.66, 0.07), 1.06, 1.2, -0.7, 0, 0, 0.5);
    cp(bodyB, new THREE.BoxGeometry(0.07, 0.64, 0.07), -0.05, 1.2, 0.7);
    cp(bodyB, new THREE.BoxGeometry(0.07, 0.64, 0.07), -0.05, 1.2, -0.7);
    // bed walls + tailgate + dark bed floor
    for (const s of [1, -1]) {
      cp(bodyB, new THREE.BoxGeometry(2.0, 0.3, 0.07), -1.18, 1.02, s * 0.845, 0, 0, 0, panel());
    }
    cp(bodyB, new THREE.BoxGeometry(0.07, 0.3, 1.7), -2.15, 1.02, 0, 0, 0, 0, panel());
    cp(bodyB, new THREE.BoxGeometry(0.07, 0.32, 1.7), -0.21, 1.03, 0, 0, 0, 0, panel());
    cp('darkIn', new THREE.BoxGeometry(1.9, 0.05, 1.6), -1.18, 0.9, 0, 0, 0, 0, new THREE.Color(0xffffff));
    // junk in the bed
    cp('carDark', new THREE.BoxGeometry(0.55, 0.2, 0.7), -1.5, 1.0, -0.25, 0, 0.4, 0, new THREE.Color(0x24211d));
  } else {
    if (burnt) {
      cp('darkIn', new THREE.BoxGeometry(2.0, 0.52, 1.45), -0.2, 1.14, 0, 0, 0, 0, new THREE.Color(0xffffff));
    } else {
      cp('carGlass', trapBox(2.35, 0.58, 1.6, { frontShift: 0.55, backShift: 0.38, sideShrink: 0.88 }), -0.2, 1.2, 0);
    }
    cp(bodyB, new THREE.BoxGeometry(1.44, 0.055, 1.44), -0.28, 1.51, 0, 0, 0, 0, charTop());
    cp(bodyB, new THREE.BoxGeometry(0.07, 0.66, 0.07), 0.78, 1.2, 0.72, 0, 0, 0.6);
    cp(bodyB, new THREE.BoxGeometry(0.07, 0.66, 0.07), 0.78, 1.2, -0.72, 0, 0, 0.6);
    cp(bodyB, new THREE.BoxGeometry(0.07, 0.62, 0.07), -1.06, 1.2, 0.68, 0, 0, -0.42);
    cp(bodyB, new THREE.BoxGeometry(0.07, 0.62, 0.07), -1.06, 1.2, -0.68, 0, 0, -0.42);
    // B-pillars split the greenhouse into door windows
    cp(bodyB, new THREE.BoxGeometry(0.06, 0.56, 1.5), -0.14, 1.17, 0, 0, 0, 0, panel());
  }
  // door seams: hairline dark verticals breaking up the body slab
  if (!pickup) {
    for (const sx2 of [0.62, -0.58]) {
      for (const sz2 of [0.885, -0.885]) {
        cp('carDark', new THREE.BoxGeometry(0.016, 0.4, 0.012), sx2, 0.66, sz2, 0, 0, 0, new THREE.Color(0x171513));
      }
    }
  } else {
    for (const sz2 of [0.885, -0.885]) {
      cp('carDark', new THREE.BoxGeometry(0.016, 0.4, 0.012), 0.02, 0.66, sz2, 0, 0, 0, new THREE.Color(0x171513));
    }
  }
  // door handles
  if (!burnt) {
    for (const sz2 of [0.885, -0.885]) {
      cp('carDark', new THREE.BoxGeometry(0.14, 0.035, 0.02), 0.34, 0.79, sz2, 0, 0, 0, new THREE.Color(0x26231f));
    }
  }
  // bumpers, grille, mirrors, headlights
  const darkTint = new THREE.Color(burnt ? 0x1c1917 : 0x232120);
  cp('carDark', new THREE.BoxGeometry(0.24, 0.19, 1.82), 2.2, 0.46, 0, 0, 0, 0, darkTint);
  cp('carDark', new THREE.BoxGeometry(0.24, 0.19, 1.82), -2.2, 0.46, 0, 0, 0, 0, darkTint);
  cp('carDark', new THREE.BoxGeometry(0.07, 0.22, 1.2), 2.26, 0.7, 0, 0, 0, 0, darkTint);
  if (!burnt) {
    cp('metalPainted', new THREE.BoxGeometry(0.06, 0.13, 0.34), 2.245, 0.72, 0.62, 0, 0, 0, new THREE.Color(0xd8d2bc));
    cp('metalPainted', new THREE.BoxGeometry(0.06, 0.13, 0.34), 2.245, 0.72, -0.62, 0, 0, 0, new THREE.Color(0xd8d2bc));
    cp(bodyB, new THREE.BoxGeometry(0.14, 0.1, 0.06), 0.92, 1.04, 0.92);
    cp(bodyB, new THREE.BoxGeometry(0.14, 0.1, 0.06), 0.92, 1.04, -0.92);
  }
  // wheels — poke past the arches so the tires read from the side; one tire
  // deflated (squashed + bulged) on wrecks
  const wheelGeo = () => new THREE.CylinderGeometry(0.33, 0.33, 0.25, 14).rotateX(Math.PI / 2);
  const hubGeo = () => new THREE.CylinderGeometry(0.135, 0.135, 0.26, 10).rotateX(Math.PI / 2);
  const wheelSpots = [[1.42, 0.84], [1.42, -0.84], [-1.4, 0.84], [-1.4, -0.84]];
  for (let wi = 0; wi < 4; wi++) {
    const [lx, lz] = wheelSpots[wi];
    const dead = wi === deadWheel;
    const squash = dead ? 0.62 : flat ? 0.86 : 1;
    const wide = dead ? 1.22 : 1;
    const m = mul(carM, mat4(lx, 0.33 * squash + drop, lz, 0, 0, 0, wide, squash, 1));
    buckets.push('carDark', wheelGeo(), m, { color: new THREE.Color(0x131211) });
    buckets.push('metalDark', hubGeo(), mul(carM, mat4(lx, 0.33 * squash + drop, lz)),
      { color: new THREE.Color(burnt ? 0x3a332c : 0x5d564c) });
  }
  // grounding + wreck dressing
  if (burnt) {
    groundDecal(ctx.buckets, 'decalScorch', x, z, 6.4, 6.4, ry, 0xffffff, gy + 0.008);
  } else {
    groundDecal(ctx.buckets, 'decalStain', x, z, 5.0, 2.6, ry, 0x0e0d0c, gy + 0.006);
  }
  blob(ctx, x, z, 4.9, 2.35, ry);
  ctx.addBoxCollider(x, 0.5, z, 4.5, 1.0, 1.86, ry, 'metal');
  ctx.addBoxCollider(x, 1.2, z - 0, 2.3, 0.62, 1.62, ry, 'metal');
  obbBlock(ctx, x, z, 4.7, 2.1, ry);
}

function buildCars(ctx) {
  const NORTH = Math.PI / 2, SOUTH = -Math.PI / 2, EAST = 0, WEST = Math.PI;
  addCar(ctx, 6.8, -38, NORTH + 0.05, { paint: 0xaba189, pickup: true });
  addCar(ctx, 6.9, -16, NORTH - 0.03, { burnt: true });
  addCar(ctx, 6.7, 33, NORTH + 0.09, { paint: 0x66787a, flat: true });
  addCar(ctx, -6.9, -30, SOUTH + 0.04, { paint: 0x9a9183 });
  addCar(ctx, -6.8, 14, SOUTH - 0.06, { burnt: true });
  addCar(ctx, 2.4, -2.2, 2.35, { burnt: true });             // intersection wreck
  addCar(ctx, -24, 3.9, EAST + 0.12, { paint: 0x6e4238 });
  addCar(ctx, 30, -3.6, WEST - 0.07, { paint: 0x9a9484 });
  addCar(ctx, 47.3, 21, NORTH - 0.02, { paint: 0x424e5c, pickup: true });
  addCar(ctx, -13.5, 26.5, 1.15, { paint: 0xb3a487, flat: true });
  addCar(ctx, 57, -4.4, NORTH + 0.4, { burnt: true });
}

// ---------------------------------------------------------------------------
//  fortifications
// ---------------------------------------------------------------------------

function jersey(ctx, x, z, ry, toppled = false) {
  const e = toppled ? new THREE.Euler(0, ry, 1.35) : new THREE.Euler(0, ry, randRange(-0.015, 0.015));
  const q = new THREE.Quaternion().setFromEuler(e);
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, toppled ? 0.42 : 0.05, z), q, new THREE.Vector3(1, 1, 1));
  ctx.inst.jersey.t.push(m);
  ctx.inst.jersey.c.push(tint(0xcfc9bc, 0.09));
  blob(ctx, x, z, toppled ? 2.1 : 1.7, 3.5, ry);
  ctx.addBoxCollider(x, 0.48, z, toppled ? 0.95 : 1.0, 0.9, 3.0, ry, 'concrete');
  obbBlock(ctx, x, z, 1.1, 3.0, ry);
}

function twall(ctx, x, z, ry) {
  const { buckets } = ctx;
  const m = mat4(x, 0, z, 0, ry, randRange(-0.014, 0.014));
  const ctint = tint(0xc9c2b4, 0.16);
  buckets.push('trim', new THREE.BoxGeometry(1.62, 0.42, 0.95), mul(m, mat4(0, 0.21, 0)), { color: ctint });
  buckets.push('trim', new THREE.BoxGeometry(1.56, 3.1, 0.22), mul(m, mat4(0, 1.95, 0)), { color: ctint });
  buckets.push('trim', new THREE.BoxGeometry(1.62, 0.14, 0.3), mul(m, mat4(0, 3.57, 0)), { color: ctint.clone().multiplyScalar(0.92) });
  // lift-loop recesses near the top: shadowed gray, not pure-black slots
  for (const s of [-1, 1]) {
    buckets.box('metalDark', 0.15, 0.08, 0.24, mul(m, mat4(s * 0.48, 3.24, 0)), { color: 0x4e4840 });
  }
  // weather-streak grime running down the panel faces
  if (rand() < 0.8) {
    const a = ry + (rand() < 0.5 ? 0 : Math.PI);
    wallDecal(buckets, 'decalGrime', x + Math.sin(a) * 0.115, randRange(1.9, 2.3), z + Math.cos(a) * 0.115,
      1.45, 2.5, a, 0x5a544c, 0.006);
  }
  blob(ctx, x, z, 2.4, 1.7, ry);
  ctx.addBoxCollider(x, 1.8, z, 1.62, 3.65, 0.95, ry, 'concrete');
  obbBlock(ctx, x, z, 1.7, 1.0, ry);
}

function sandbagLine(ctx, x0, z0, x1, z1, rows = 3) {
  const dx = x1 - x0, dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const ry = Math.atan2(-dz, dx); // bags laid lengthwise along the wall
  const n = Math.max(2, Math.round(len / 0.62));
  for (let r = 0; r < rows; r++) {
    const cnt = n - (r === rows - 1 ? 1 : 0);
    for (let i = 0; i < cnt; i++) {
      const f = (i + (r % 2 ? 0.5 : 0) + 0.5) / n;
      if (f > 1) continue;
      const px = x0 + dx * f + randRange(-0.05, 0.05);
      const pz = z0 + dz * f + randRange(-0.05, 0.05);
      sandbag(ctx, px, 0.11 + r * 0.175, pz, ry + randRange(-0.14, 0.14));
    }
  }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  blob(ctx, cx, cz, len + 0.7, 1.35, ry);
  ctx.addBoxCollider(cx, rows * 0.19 / 2 + 0.05, cz, len + 0.3, rows * 0.19 + 0.1, 0.72, ry, 'dirt');
  obbBlock(ctx, cx, cz, Math.abs(dx) + 0.8, Math.abs(dz) + 0.8, 0);
}

function sandbag(ctx, x, y, z, ry) {
  const e = new THREE.Euler(randRange(-0.1, 0.1), ry, randRange(-0.1, 0.1));
  const q = new THREE.Quaternion().setFromEuler(e);
  const s = new THREE.Vector3(randRange(0.88, 1.14), randRange(0.55, 0.7), randRange(0.9, 1.12));
  ctx.inst.sandbag.t.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, s));
  const base = rand() < 0.22 ? 0x84785c : 0xa08a62; // mix in olive-drab bags
  ctx.inst.sandbag.c.push(tint(base, 0.2));
}

function sandbagArc(ctx, cx, cz, r, a0, a1, rows = 3) {
  const len = Math.abs(a1 - a0) * r;
  const n = Math.max(3, Math.round(len / 0.6));
  for (let row = 0; row < rows; row++) {
    const cnt = n - (row === rows - 1 ? 2 : 0);
    for (let i = 0; i < cnt; i++) {
      const a = a0 + (a1 - a0) * ((i + (row % 2 ? 0.5 : 0) + 0.5) / n);
      const px = cx + Math.cos(a) * r, pz = cz + Math.sin(a) * r;
      sandbag(ctx, px, 0.11 + row * 0.175, pz, -a - Math.PI / 2 + randRange(-0.12, 0.12));
    }
  }
  // coarse colliders: 3 segment boxes (+ contact shadow per segment)
  for (let s = 0; s < 3; s++) {
    const a = a0 + (a1 - a0) * ((s + 0.5) / 3);
    blob(ctx, cx + Math.cos(a) * r, cz + Math.sin(a) * r, Math.abs(a1 - a0) * r / 3 + 0.6, 1.35, -a - Math.PI / 2);
    ctx.addBoxCollider(cx + Math.cos(a) * r, rows * 0.19 / 2, cz + Math.sin(a) * r, Math.abs(a1 - a0) * r / 3, rows * 0.19 + 0.1, 0.75, -a, 'dirt');
  }
  ctx.navgrid.blockCircle(cx, cz, r + 0.4);
}

function hesco(ctx, x, z, ry, n = 3) {
  const { buckets } = ctx;
  for (let i = 0; i < n; i++) {
    const px = x + Math.sin(ry) * 0 + Math.cos(ry) * i * 1.42;
    const pz = z + Math.cos(ry) * 0 - Math.sin(ry) * i * 1.42;
    buckets.box('hesco', 1.35, 1.35, 1.35, mat4(px, 0.675, pz, 0, ry + randRange(-0.03, 0.03), 0), { color: tint(0xffffff, 0.09) });
    buckets.box('dirt', 1.2, 0.14, 1.2, mat4(px, 1.38, pz, 0, ry, 0), { color: 0xa5906a });
    blob(ctx, px, pz, 2.0, 2.0);
  }
  const cx = x + Math.cos(ry) * (n - 1) * 0.71, cz = z - Math.sin(ry) * (n - 1) * 0.71;
  ctx.addBoxCollider(cx, 0.7, cz, n * 1.42, 1.45, 1.4, ry, 'dirt');
  obbBlock(ctx, cx, cz, n * 1.45, 1.45, ry);
}

function buildCheckpoint(ctx) {
  // mid-boulevard checkpoint south of the crossroads
  for (let i = 0; i < 4; i++) twall(ctx, -7.2 + i * 1.7, 31 + randRange(-0.2, 0.2), 0.03 * (i % 2 ? 1 : -1));
  jersey(ctx, 1.8, 28.5, 0.22);
  jersey(ctx, 5.6, 33.5, -0.14);
  jersey(ctx, -0.8, 37.8, 0.08, true);
  sandbagLine(ctx, -1.5, 25.8, 4.2, 26.4, 3);
  sandbagLine(ctx, 4.4, 26.6, 5.4, 29.2, 2);
  hesco(ctx, -7.0, 27.4, 0.06, 2);
  drum(ctx, 3.2, 30.4, false);
  drum(ctx, 3.9, 31.1, true);
  tirePile(ctx, -3.5, 34.2, 3);
  groundDecal(ctx.buckets, 'decalStain', 1, 31, 6, 5, 0.4, 0x201d19, 0.062);
}

function buildEmplacements(ctx) {
  // crossroads NW corner nest, watching the intersection
  sandbagArc(ctx, -10.6, -8.6, 2.6, -0.25, 1.75, 3);
  jersey(ctx, -15.5, -9.0, 1.62);
  // plaza edge nest
  sandbagArc(ctx, -11.8, 17, 2.6, 2.2, 3.9, 3);
  // secondary street block: jerseys + hesco
  jersey(ctx, 47, -13.5, 0.12);
  jersey(ctx, 47, -17, -0.08);
  hesco(ctx, -49.5, 28, 1.57, 4);
  jersey(ctx, -47, 8.6, 1.5);
  jersey(ctx, 21, 58, 1.35);
  jersey(ctx, 24.4, 58.4, 1.75, true);
}

// ---------------------------------------------------------------------------
//  poles, wires, lamps
// ---------------------------------------------------------------------------

function wireBetween(ctx, a, b, sagMul = 1) {
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  mid.y -= Math.min(1.6, a.distanceTo(b) * 0.045 * sagMul + 0.25);
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  // radius fat enough not to alias into dash chains against the sky
  const geo = new THREE.TubeGeometry(curve, 10, 0.024, 3);
  ctx.buckets.push('wire', geo, null, { color: 0x161412 });
}

function buildPolesAndWires(ctx, anchors) {
  const { buckets } = ctx;
  const PX = -10.35;
  const zs = [-66, -47.6, -29.2, -10.8, 7.6, 26, 44.4, 62.8];
  const tops = [];
  for (const pz of zs) {
    const broken = pz === 26;
    const lean = broken ? -0.46 : randRange(-0.02, 0.02);
    const h = 7.8;
    const geo = new THREE.CylinderGeometry(0.1, 0.14, h, 8);
    buckets.push('woodDark', geo, mat4(PX, -0.1, pz, randRange(-0.015, 0.015), 0, lean).multiply(mat4(0, h / 2, 0)), { color: tint(0x8a7355, 0.14) });
    blob(ctx, PX, pz, 0.75, 0.75);
    if (broken) {
      // anchor the leaning pole: heaved rubble + kicked-up curb at its base
      for (let k = 0; k < 4; k++) {
        const cs = randRange(0.1, 0.2);
        const which = rand() < 0.5 ? 'chunkA' : 'chunkB';
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, 0));
        ctx.inst[which].t.push(new THREE.Matrix4().compose(
          new THREE.Vector3(PX + randRange(-0.5, 0.7), groundHeight(PX, pz) + cs * 0.3, pz + randRange(-0.5, 0.5)),
          q, new THREE.Vector3(cs, cs * 0.6, cs)));
        ctx.inst[which].c.push(tint(0xa39a88, 0.1));
      }
      blob(ctx, PX + 0.2, pz, 1.5, 1.3);
    }
    const topX = PX - Math.sin(lean) * h;
    const topY = Math.cos(lean) * h - 0.45;
    if (!broken) {
      // crossarm runs across the wire direction (east-west)
      buckets.box('woodDark', 1.7, 0.12, 0.12, mat4(PX, 7.35, pz), { color: tint(0x7d684c, 0.1) });
      tops.push({ x: PX, y: 7.4, z: pz });
    } else {
      tops.push({ x: topX, y: topY, z: pz, broken: true });
    }
    ctx.addBoxCollider(PX, 3.9, pz, 0.3, 7.8, 0.3, 0, 'wood');
    ctx.navgrid.blockCircle(PX, pz, 0.3);
  }
  // spans
  for (let i = 0; i < tops.length - 1; i++) {
    const A = tops[i], B = tops[i + 1];
    if (A.broken || B.broken) {
      // snapped span drapes to the ground
      const src = A.broken ? B : A;
      const dst = A.broken ? A : B;
      wireBetween(ctx, new THREE.Vector3(src.x, src.y, src.z), new THREE.Vector3(dst.x + 1.8, 0.15, (A.z + B.z) / 2 + randRange(-2, 2)), 1.4);
      continue;
    }
    for (const off of [-0.7, 0, 0.7]) {
      wireBetween(ctx, new THREE.Vector3(A.x + off, A.y - (off === 0 ? 0.32 : 0), A.z),
        new THREE.Vector3(B.x + off, B.y - (off === 0 ? 0.32 : 0), B.z));
    }
  }
  // drops to nearby building facades
  for (const an of anchors) {
    let best = null, bd = 1e9;
    for (const t of tops) {
      if (t.broken) continue;
      const d = Math.hypot(t.x - an.x, t.z - an.z);
      if (d < bd) { bd = d; best = t; }
    }
    if (best && bd < 34) {
      wireBetween(ctx, new THREE.Vector3(best.x, best.y - 0.15, best.z), new THREE.Vector3(an.x, an.y, an.z), 0.8);
    }
  }
}

function buildLamps(ctx) {
  const { buckets } = ctx;
  const spots = [
    [10.4, -54, -Math.PI / 2], [10.4, -30, -Math.PI / 2], [10.4, -6.5, -Math.PI / 2],
    [10.4, 18, -Math.PI / 2], [10.4, 42, -Math.PI / 2, 0.3], [10.4, 66, -Math.PI / 2],
    [-30, -7.8, 0], [26, 7.8, Math.PI], [-13, 9, 0.6],
  ];
  for (const [x, z, face, leanIn] of spots) {
    const lean = leanIn ?? randRange(-0.025, 0.025);
    const m = mat4(x, 0, z, 0, face, lean);
    buckets.push('metalPainted', new THREE.CylinderGeometry(0.06, 0.09, 5.6, 8), mul(m, mat4(0, 2.8, 0)), { color: tint(0x5a5f58, 0.1) });
    buckets.push('metalPainted', new THREE.BoxGeometry(0.07, 0.07, 1.15), mul(m, mat4(0, 5.52, 0.5, -0.12, 0, 0)), { color: tint(0x5a5f58, 0.1) });
    buckets.box('metalDark', 0.5, 0.14, 0.24, mul(m, mat4(0, 5.6, 1.05)), { color: 0x33302c });
    blob(ctx, x, z, 0.6, 0.6);
    ctx.addBoxCollider(x, 2.8, z, 0.22, 5.6, 0.22, 0, 'metal');
    ctx.navgrid.blockCircle(x, z, 0.25);
  }
}

// ---------------------------------------------------------------------------
//  street furniture & clutter
// ---------------------------------------------------------------------------

function drum(ctx, x, z, tipped, y = 0) {
  const e = tipped ? new THREE.Euler(Math.PI / 2, rand() * Math.PI, 0, 'YXZ') : new THREE.Euler(0, rand() * Math.PI, randRange(-0.04, 0.04));
  const q = new THREE.Quaternion().setFromEuler(e);
  const p = new THREE.Vector3(x, y + (tipped ? 0.31 : 0.46), z);
  ctx.inst.drum.t.push(new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)));
  ctx.inst.drum.c.push(tint(randPick([0x8a5a3a, 0x5f6d52, 0x4a5a6a, 0x8a4a3a, 0x6d6258]), 0.12));
  blob(ctx, x, z, tipped ? 1.3 : 0.95, tipped ? 0.9 : 0.95);
  ctx.addBoxCollider(x, 0.45, z, 0.65, tipped ? 0.62 : 0.95, 0.65, 0, 'metal');
  ctx.navgrid.blockCircle(x, z, 0.4);
}

function tirePile(ctx, x, z, n) {
  for (let i = 0; i < n; i++) {
    const lx = x + randRange(-0.5, 0.5), lz = z + randRange(-0.5, 0.5);
    const gy = groundHeight(lx, lz);
    const stack = randInt(1, 2);
    for (let s = 0; s < stack; s++) {
      const e = new THREE.Euler(randRange(-0.08, 0.08), rand() * Math.PI, randRange(-0.08, 0.08));
      const q = new THREE.Quaternion().setFromEuler(e);
      ctx.inst.tire.t.push(new THREE.Matrix4().compose(new THREE.Vector3(lx, gy + 0.1 + s * 0.21, lz), q, new THREE.Vector3(1, 1, 1)));
      ctx.inst.tire.c.push(tint(0x1a1918, 0.05));
    }
    blob(ctx, lx, lz, 1.05, 1.05);
  }
  ctx.navgrid.blockCircle(x, z, 0.8);
  ctx.addBoxCollider(x, 0.25, z, 1.4, 0.5, 1.4, 0, 'dirt');
}

function crate(ctx, x, y, z, ry, s = 1) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0));
  ctx.inst.crate.t.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s)));
  ctx.inst.crate.c.push(tint(0xa8895f, 0.14));
  if (y < 0.5) blob(ctx, x, z, s * 1.5, s * 1.5, -ry);
}

function pallet(ctx, x, z, ry, leaning = false, y = null) {
  const e = leaning ? new THREE.Euler(-1.32, ry, 0, 'YXZ') : new THREE.Euler(0, ry, 0);
  const q = new THREE.Quaternion().setFromEuler(e);
  const py = y ?? (leaning ? 0.55 : 0.072);
  ctx.inst.pallet.t.push(new THREE.Matrix4().compose(new THREE.Vector3(x, py, z), q, new THREE.Vector3(1, 1, 1)));
  ctx.inst.pallet.c.push(tint(0x9c8258, 0.16));
  if (!leaning && y === null) blob(ctx, x, z, 1.55, 1.45, -ry);
}

function buildDumpsters(ctx) {
  const { buckets } = ctx;
  const spots = [[25.6, -25.3, 0.15], [-25.8, -23.8, -1.5], [25.4, 29.6, 3.05], [12.4, -26.2, 1.62]];
  for (const [x, z, ry] of spots) {
    const m = mat4(x, 0, z, 0, ry, 0);
    const c = tint(randPick([0x4a5f4a, 0x54636b, 0x6b5a44]), 0.1);
    buckets.push('rustGreen', new THREE.BoxGeometry(1.75, 1.02, 0.95), mul(m, mat4(0, 0.62, 0)), { color: c });
    const lidOpen = rand() < 0.5;
    buckets.push('rustGreen', new THREE.BoxGeometry(1.72, 0.05, 0.92), mul(m, mat4(0, lidOpen ? 1.36 : 1.15, lidOpen ? -0.42 : 0, lidOpen ? -0.9 : 0, 0, 0)), { color: c.clone().multiplyScalar(0.9) });
    for (const [wx, wz] of [[-0.7, 0.4], [0.7, 0.4], [-0.7, -0.4], [0.7, -0.4]]) {
      buckets.push('metalDark', new THREE.CylinderGeometry(0.09, 0.09, 0.07, 8).rotateX(Math.PI / 2), mul(m, mat4(wx, 0.09, wz)), { color: 0x1f1d1b });
    }
    // trash bags
    for (let i = 0; i < randInt(2, 4); i++) {
      buckets.push('carDark', chunkGeo(rand, 0), mul(m, mat4(randRange(-1.3, 1.3), 0.16, randRange(0.7, 1.1), rand(), rand() * 3, 0, 0.28, 0.2, 0.24)), { color: tint(0x1e201e, 0.05) });
    }
    groundDecal(buckets, 'decalStain', x, z, 3, 2.4, ry, 0x191713, groundHeight(x, z) + 0.005);
    blob(ctx, x, z, 2.5, 1.7, ry);
    ctx.addBoxCollider(x, 0.6, z, 1.8, 1.2, 1.0, ry, 'metal');
    obbBlock(ctx, x, z, 1.9, 1.1, ry);
  }
}

function buildMarket(ctx) {
  const { buckets } = ctx;
  const stalls = [
    { x: -22.5, z: 14.5, ry: 0.1, fallen: false },
    { x: -17.5, z: 20.5, ry: -1.4, fallen: false },
    { x: -23.5, z: 26, ry: 0.25, fallen: true },
    { x: -15, z: 13.2, ry: 1.75, fallen: false },
  ];
  const stripeCanopy = (geo, base) => {
    // bake awning stripes into vertex colors (fabric mat shares one bucket)
    const p = geo.attributes.position;
    const carr = new Float32Array(p.count * 3);
    const off = new THREE.Color(0xcfc5aa);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const sx = Math.round((p.getX(i) / 2.9 + 0.5) * 6);
      c.copy(sx % 2 ? base : off);
      carr[i * 3] = c.r; carr[i * 3 + 1] = c.g; carr[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(carr, 3));
  };
  for (const st of stalls) {
    const m = mat4(st.x, 0, st.z, 0, st.ry, 0);
    const aw = tint(randPick([0x9c4a38, 0x5f7d72, 0xb08a3f, 0x6d7c8a]), 0.06);
    const woodT = tint(0xa08256, 0.1);
    if (!st.fallen) {
      for (const [px, pz] of [[-1.25, -0.85], [1.25, -0.85], [-1.25, 0.85], [1.25, 0.85]]) {
        buckets.box('woodDark', 0.09, 2.15, 0.09, mul(m, mat4(px, 1.075, pz, randRange(-0.03, 0.03), 0, randRange(-0.03, 0.03))), { color: woodT });
        // pole cap + tie-down rope running to the canopy corner
        buckets.box('metalDark', 0.13, 0.04, 0.13, mul(m, mat4(px, 2.17, pz)), { color: 0x38332c });
        buckets.push('wire', new THREE.CylinderGeometry(0.011, 0.011, 0.42, 3),
          mul(m, mat4(px * 1.05, 2.3, pz * 1.02, randRange(-0.5, -0.2) * Math.sign(pz), 0, randRange(0.15, 0.4) * Math.sign(px))),
          { color: 0x6b5c44 });
      }
      // cross beams under the canopy
      for (const pz of [-0.85, 0.85]) {
        buckets.box('woodDark', 2.55, 0.06, 0.06, mul(m, mat4(0, 2.12, pz)), { color: woodT });
      }
      // sagging striped canopy (second flipped ply lights the underside)
      const mkCanopy = () => {
        const geo = new THREE.PlaneGeometry(2.9, 2.1, 6, 4);
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const px = p.getX(i) / 2.9, py = p.getY(i) / 2.1;
          p.setZ(i, -Math.cos(px * Math.PI) * 0.27 - Math.cos(py * Math.PI) * 0.07
            + Math.sin(px * 9.4) * 0.025);
        }
        stripeCanopy(geo, aw);
        return geo;
      };
      const cm = mul(m, mat4(0, 2.2, 0, -Math.PI / 2 + 0.12, 0, randRange(-0.04, 0.04)));
      buckets.push('fabric', mkCanopy(), cm, { keepColor: true });
      // counter
      buckets.box('woodPale', 2.4, 0.07, 0.85, mul(m, mat4(0, 0.86, 0)), { color: tint(0xb59a6f, 0.1) });
      crate(ctx, st.x + Math.cos(st.ry) * 0.8, 0.28, st.z - Math.sin(st.ry) * 0.8, st.ry + 0.2, 0.56);
      crate(ctx, st.x - Math.cos(st.ry) * 0.75, 0.28, st.z + Math.sin(st.ry) * 0.75, st.ry - 0.15, 0.56);
      // produce
      for (let i = 0; i < 2; i++) {
        buckets.push('carDark', chunkGeo(rand, 0), mul(m, mat4(randRange(-0.8, 0.8), 0.98, randRange(-0.25, 0.25), 0, rand() * 3, 0, 0.22, 0.14, 0.18)),
          { color: tint(randPick([0x9a6a2a, 0x7d8a3a, 0x8a4530]), 0.08) });
      }
      blob(ctx, st.x, st.z, 3.1, 2.3, st.ry);
      ctx.addBoxCollider(st.x, 0.5, st.z, 2.6, 1.0, 1.8, st.ry, 'wood');
      obbBlock(ctx, st.x, st.z, 2.8, 2.0, st.ry);
    } else {
      // collapsed: tilted posts + draped canopy
      buckets.box('woodDark', 0.09, 2.15, 0.09, mul(m, mat4(-1.2, 0.6, -0.8, 0.9, 0, 0.5)), { color: woodT });
      buckets.box('woodDark', 0.09, 1.9, 0.09, mul(m, mat4(1.2, 0.9, -0.8, randRange(-0.1, 0.1), 0, -0.2)), { color: woodT });
      const geo = new THREE.PlaneGeometry(2.9, 2.2, 6, 4);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        p.setZ(i, Math.sin(p.getX(i) * 2.1) * 0.14 + Math.cos(p.getY(i) * 1.7) * 0.1);
      }
      stripeCanopy(geo, aw);
      buckets.push('fabric', geo, mul(m, mat4(0, 0.27, 0, -Math.PI / 2 + 0.16, 0, 0.1)), { keepColor: true });
      // debris under the drape so it reads as resting on something
      crate(ctx, st.x - 0.5, 0.2, st.z - 0.3, st.ry + 0.5, 0.45);
      crate(ctx, st.x + 1, 0.28, st.z + 0.7, st.ry, 0.56);
      blob(ctx, st.x, st.z, 3.0, 2.4, st.ry);
      ctx.addBoxCollider(st.x, 0.4, st.z, 2.4, 0.8, 1.8, st.ry, 'wood');
      obbBlock(ctx, st.x, st.z, 2.6, 2.0, st.ry);
    }
  }
  // broken monument: stepped plinth, shattered statue stump, toppled column
  // ('slab' = dirty concrete at correct texel density; taper kills razor edges)
  buckets.push('slab', trapBox(3.2, 0.35, 3.2, { frontShift: 0.07, backShift: 0.07, sideShrink: 0.955 }),
    mat4(-19.5, 0.175, 23.5, 0, 0.3, 0), { color: 0xc6bca6 });
  buckets.push('slab', trapBox(2.5, 0.85, 2.5, { frontShift: 0.06, backShift: 0.06, sideShrink: 0.95 }),
    mat4(-19.5, 0.95, 23.5, 0, 0.3, 0), { color: 0xd0c6b0 });
  // chipped top edges on the plinth
  for (let k = 0; k < 4; k++) {
    const ea = 0.3 + k * (Math.PI / 2);
    buckets.push('slab', chunkGeo(rand), mat4(-19.5 + Math.cos(ea) * 1.22, 1.34, 23.5 + Math.sin(ea) * 1.22,
      rand() * 3, rand() * 3, 0, randRange(0.1, 0.16), randRange(0.05, 0.09), randRange(0.1, 0.16)), { color: 0xccc2ac });
  }
  // jagged stump where the statue was blown off
  buckets.push('slab', new THREE.CylinderGeometry(0.42, 0.56, 1.05, 9), mat4(-19.5, 1.9, 23.5, 0.07, 0.4, 0.05), { color: 0xc5bba8 });
  for (const [ox, oz] of [[0.35, 0.2], [-0.3, -0.35]]) {
    const cs = randRange(0.14, 0.22);
    buckets.push('slab', chunkGeo(rand), mat4(-19.5 + ox, 1.42 + cs * 0.3, 23.5 + oz, rand() * 3, rand() * 3, 0, cs, cs * 0.6, cs), { color: 0xc0b6a4 });
  }
  for (let k = 0; k < 3; k++) {
    const rl = randRange(0.35, 0.7);
    buckets.push('metalDark', new THREE.CylinderGeometry(0.012, 0.012, rl, 4),
      mat4(-19.5 + randRange(-0.25, 0.25), 2.3 + rl / 2 - 0.1, 23.5 + randRange(-0.25, 0.25),
        randRange(-0.5, 0.5), 0, randRange(-0.5, 0.5)), { color: 0x4a4136 });
  }
  // the toppled top section lying beside the plinth
  buckets.push('slab', new THREE.CylinderGeometry(0.42, 0.5, 1.6, 9), mat4(-17.5, 0.48, 24.9, 1.4, 0.4, 0.1), { color: 0xbfb5a2 });
  buckets.push('slab', chunkGeo(rand), mat4(-16.6, 0.3, 25.4, 0, rand() * 3, 0, 0.4, 0.3, 0.4), { color: 0xb5ab98 });
  blob(ctx, -19.5, 23.5, 4.4, 4.4, -0.3);
  blob(ctx, -17.5, 24.9, 2.4, 1.5, -0.4);
  // chips + scorch grounding
  for (let k = 0; k < 6; k++) {
    const cs = randRange(0.08, 0.2);
    buckets.push('slab', chunkGeo(rand), mat4(-19.5 + randRange(-2.2, 2.6), 0.075 + cs * 0.25, 23.5 + randRange(-2.2, 2.6),
      rand() * 3, rand() * 3, 0, cs, cs * 0.7, cs), { color: 0xc0b6a2 });
  }
  ctx.addBoxCollider(-19.5, 1.2, 23.5, 2.7, 2.6, 2.7, 0.3, 'concrete');
  ctx.addBoxCollider(-17.4, 0.4, 24.95, 1.7, 0.85, 0.9, 0.4, 'concrete');
  ctx.navgrid.blockRect(-19.5, 23.5, 3.4, 3.4);
  ctx.navgrid.blockRect(-17.4, 24.95, 2.0, 1.2);
  groundDecal(buckets, 'decalCrack', -19.5, 23.5, 5, 5, 0.7, 0xffffff, 0.082);
  groundDecal(buckets, 'decalScorch', -18.6, 24, 3.4, 3.4, 0.4, 0xffffff, 0.086);
}

function buildWoodAndBarrels(ctx) {
  // pallets & crates in alleys / courtyards / shopfronts
  pallet(ctx, 13.2, -25.9, 0.3); pallet(ctx, 13.25, -25.85, 0.42, false, 0.225); // stacked pair
  pallet(ctx, 26.5, -20.5, 1.2, true);
  pallet(ctx, -27.5, -21.5, 0.2);
  pallet(ctx, 12.6, 30.2, 1.6); pallet(ctx, 27.2, 22.5, -0.4, true);
  pallet(ctx, -45.5, 33.5, 0.8);
  crate(ctx, 12.8, 0.3, 29.2, 0.4, 0.6); crate(ctx, 12.8, 0.835, 29.25, 0.9, 0.55);
  crate(ctx, 13.6, 0.26, 29.6, 1.2, 0.52);
  crate(ctx, -26.3, 0.31, -20.4, 0.7, 0.62); crate(ctx, -26.2, 0.885, -20.5, 0.2, 0.55);
  crate(ctx, 33, 0.3, 8.6, 2.2, 0.6);
  crate(ctx, -10.9, 0.29, -33.5, 0.5, 0.58);
  ctx.addBoxCollider(12.9, 0.6, 29.4, 1.6, 1.3, 1.4, 0.3, 'wood');
  ctx.navgrid.blockRect(12.9, 29.4, 1.8, 1.6);
  ctx.addBoxCollider(-26.25, 0.7, -20.45, 1.0, 1.4, 1.0, 0.4, 'wood');
  // drums
  drum(ctx, 10.2, -12.5, false); drum(ctx, 10.6, -13.4, true);
  drum(ctx, -12.4, 33, false);
  drum(ctx, 30.5, 8.7, false);
  drum(ctx, 46.2, 40, true); drum(ctx, 45.5, 39.2, false);
  drum(ctx, -45.8, -18, false);
  tirePile(ctx, 7.2, 47.5, 4);
  tirePile(ctx, -44.6, -8.6, 3);
  tirePile(ctx, 27.9, -8.3, 2);
}

// ---------------------------------------------------------------------------
//  rubble & debris
// ---------------------------------------------------------------------------

function rubblePile(ctx, x, z, r, h, { major = false, scorch = true } = {}) {
  const { buckets } = ctx;
  // craggy displaced dome core, flat-shaded + mottled so it reads as debris
  const dome = new THREE.SphereGeometry(1, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed();
  {
    const p = dome.attributes.position;
    const seen = new Map();
    const carr = new Float32Array(p.count * 3);
    const cA = new THREE.Color(0xa89d8a), cB = new THREE.Color(0x8f8778), cC = new THREE.Color(0xb8a88c);
    const vc = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
      if (!seen.has(key)) {
        const t = rand();
        vc.copy(t < 0.5 ? cA : t < 0.8 ? cB : cC).offsetHSL(0, randRange(-0.015, 0.015), randRange(-0.025, 0.02));
        seen.set(key, [randRange(0.74, 1.18), randRange(0.78, 1.1), vc.r, vc.g, vc.b]);
      }
      const [sr, sy, cr, cg, cb] = seen.get(key);
      p.setXYZ(i, p.getX(i) * sr, p.getY(i) * sr * sy, p.getZ(i) * sr);
      carr[i * 3] = cr; carr[i * 3 + 1] = cg; carr[i * 3 + 2] = cb;
    }
    dome.deleteAttribute('normal');
    dome.computeVertexNormals(); // non-indexed => faceted, hard-edged shading
    dome.setAttribute('color', new THREE.BufferAttribute(carr, 3));
  }
  buckets.push('slab', dome, mat4(x, -0.06, z, 0, rand() * Math.PI, 0, r * 0.96, h, r * 0.96), { keepColor: true });
  // chunks sitting ON the dome surface + spilling around the base
  const count = Math.round(r * r * (major ? 6.0 : 4.6));
  const chunkTint = () => {
    const t = rand();
    return t < 0.62 ? tint(0xa8a296, 0.1) : t < 0.82 ? tint(0xc0b295, 0.09) : tint(0x8a5a48, 0.08);
  };
  for (let i = 0; i < count; i++) {
    const rr = Math.sqrt(rand()) * r * 1.3;
    const a = rand() * Math.PI * 2;
    const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
    const domeH = h * Math.max(0, 1 - Math.pow(Math.min(1, rr / r), 1.6)) * 0.9;
    const s = randRange(0.18, major ? 0.5 : 0.38) * (0.6 + 0.4 * domeH / h);
    const py = Math.max(s * 0.22, domeH * randRange(0.86, 1.0) + s * 0.1);
    const e = new THREE.Euler(rand() * 3, rand() * 3, rand() * 3);
    const q = new THREE.Quaternion().setFromEuler(e);
    const which = rand() < 0.5 ? 'chunkA' : 'chunkB';
    ctx.inst[which].t.push(new THREE.Matrix4().compose(new THREE.Vector3(px, py, pz), q,
      new THREE.Vector3(s, s * randRange(0.5, 0.75), s)));
    ctx.inst[which].c.push(chunkTint());
  }
  // broken slab pieces on every pile so mounds read as collapsed structure,
  // not smooth heaps: some leaning on the pile, some flat at the base
  const sk = Math.min(1, r / 2.2); // size factor for small piles
  const nSlab = major ? 5 : 3;
  for (let i = 0; i < nSlab; i++) {
    const a = rand() * Math.PI * 2;
    const atBase = i >= Math.ceil(nSlab * 0.55);
    const rr = r * (atBase ? randRange(0.85, 1.15) : randRange(0.3, 0.7));
    buckets.box('slab', randRange(1.6, 2.8) * sk, 0.15, randRange(1.2, 2.2) * sk,
      mat4(x + Math.cos(a) * rr, atBase ? randRange(0.06, 0.16) : h * randRange(0.35, 0.6),
        z + Math.sin(a) * rr,
        atBase ? randRange(-0.12, 0.12) : randRange(-0.6, -0.25) * Math.sign(rand() - 0.5),
        rand() * 3, atBase ? randRange(-0.1, 0.1) : randRange(-0.45, 0.45)),
      { color: tint(0xc5bcaa, 0.08) });
  }
  // rebar poking out at chaotic angles
  const nBar = major ? 7 : 3;
  for (let i = 0; i < nBar; i++) {
    const a = rand() * Math.PI * 2, rr = r * randRange(0.1, 0.8);
    const rl = randRange(0.5, 1.4) * Math.max(0.6, sk);
    buckets.push('metalDark', new THREE.CylinderGeometry(0.013, 0.013, rl, 4),
      mat4(x + Math.cos(a) * rr, h * randRange(0.25, 0.72), z + Math.sin(a) * rr, randRange(-1.2, 1.2), rand() * 3, randRange(-1.2, 1.2)),
      { color: 0x4a4136 });
  }
  // grounding dust ring + contact shadow
  const gy = groundHeight(x, z);
  groundDecal(buckets, 'decalStain', x, z, r * 2.6, r * 2.6, rand() * Math.PI, 0x94825f, gy + 0.004);
  blob(ctx, x, z, r * 2.3, r * 2.3);
  if (scorch) groundDecal(buckets, 'decalScorch', x + randRange(-1, 1), z + randRange(-1, 1), r * 1.8, r * 1.8, rand() * Math.PI, 0xffffff, gy + 0.008);
  // collider dome + nav block
  const coneH = Math.max(0.8, h) * 1.15;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 0.92, coneH, 9));
  cone.position.set(x, coneH / 2 - 0.05, z);
  cone.visible = false;
  ctx.group.add(cone);
  ctx.colliders.add(cone, 'concrete');
  ctx.navgrid.blockCircle(x, z, r * 0.72);
}

function buildRubble(ctx, spots) {
  for (const s of spots) rubblePile(ctx, s.x, s.z, s.r, s.h, { major: s.major });
  // extra piles for texture
  rubblePile(ctx, -45.5, -3.2, 2.1, 0.9, { scorch: false });
  rubblePile(ctx, 30.8, 7.4, 1.7, 0.75, { scorch: false });
  rubblePile(ctx, -12.5, -44.6, 2.3, 1.0, {});
  rubblePile(ctx, 52.5, 46.5, 2.6, 1.2, { scorch: false });
  rubblePile(ctx, -27.6, 44.8, 1.9, 0.8, {});
  rubblePile(ctx, 9.8, -55.5, 2.0, 0.9, { scorch: false });
}

function buildCraters(ctx) {
  const { buckets } = ctx;
  const craters = [[-2.2, -27.5, 5.5], [22.5, 2.6, 4.4], [-30.5, 3.2, 4.8], [4.2, 52, 4.2]];
  for (const [x, z, s] of craters) {
    groundDecal(buckets, 'decalScorch', x, z, s, s, rand() * Math.PI, 0xffffff, 0.063);
    groundDecal(buckets, 'decalCrack', x, z, s * 1.35, s * 1.35, rand() * Math.PI, 0xffffff, 0.058);
    // ring of small chunks
    const n = Math.round(s * 4);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const rr = s * randRange(0.22, 0.5);
      const cs = randRange(0.08, 0.22);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, rand() * 3));
      const which = rand() < 0.5 ? 'chunkA' : 'chunkB';
      ctx.inst[which].t.push(new THREE.Matrix4().compose(
        new THREE.Vector3(x + Math.cos(a) * rr, 0.05, z + Math.sin(a) * rr), q, new THREE.Vector3(cs, cs * 0.7, cs)));
      ctx.inst[which].c.push(tint(0xa8a091, 0.1));
    }
  }
}

function buildEdgeBerms(ctx) {
  // block the street exits at the map edge with berms + fortifications
  const exits = [
    [0, -74, 0], [0, 74, 0], [-74, 0, 1], [74, 0, 1],
    [47, -74, 0], [47, 74, 0], [-47, -74, 0], [-47, 74, 0],
    [-74, -47, 1], [74, -47, 1], [-74, 47, 1], [74, 47, 1],
  ];
  for (const [x, z, axis] of exits) {
    rubblePile(ctx, x, z, randRange(5, 6.5), randRange(2.0, 2.8), { major: true, scorch: rand() < 0.5 });
    const ry = axis === 0 ? 0 : Math.PI / 2;
    if (rand() < 0.7) {
      const off = axis === 0 ? [6.5, 0] : [0, 6.5];
      jersey(ctx, x - off[0], z - off[1], ry + randRange(-0.2, 0.2));
      jersey(ctx, x + off[0], z + off[1], ry + randRange(-0.2, 0.2));
    }
    if (rand() < 0.5) hesco(ctx, x + (axis === 0 ? -3 : 2), z + (axis === 0 ? 2 : -3), ry, 2);
  }
}

function buildCornerLots(ctx) {
  // junk in the four outer corner lots
  const lots = [[62, -62], [-62, -62], [62, 62], [-62, 62]];
  for (const [x, z] of lots) {
    tirePile(ctx, x + randRange(-3, 3), z + randRange(-3, 3), 4);
    drum(ctx, x + randRange(-5, 5), z + randRange(-5, 5), rand() < 0.4);
    drum(ctx, x + randRange(-5, 5), z + randRange(-5, 5), rand() < 0.4);
    pallet(ctx, x + randRange(-4, 4), z + randRange(-4, 4), rand() * 3);
    rubblePile(ctx, x + randRange(-4, 4), z + randRange(-4, 4), randRange(1.6, 2.4), 0.9, { scorch: false });
    hesco(ctx, x - 4, z + 4, rand() * Math.PI, randInt(2, 3));
  }
}

function scatterDebris(ctx) {
  const { navgrid } = ctx;
  // small concrete debris — concentrated near walls and gutters
  for (let i = 0; i < 520; i++) {
    let x, z;
    if (rand() < 0.55) {
      // gutter lines near curbs
      const onBlv = rand() < 0.5;
      if (onBlv) { x = randPick([-1, 1]) * randRange(7.2, 8.3); z = randRange(-72, 72); }
      else { z = randPick([-1, 1]) * randRange(5.2, 6.3); x = randRange(-72, 72); }
    } else {
      x = randRange(-72, 72); z = randRange(-72, 72);
    }
    if (!navgrid.isWalkable(x, z) && rand() < 0.8) continue;
    const s = randRange(0.045, 0.17);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, rand() * 3));
    const which = rand() < 0.5 ? 'chunkA' : 'chunkB';
    ctx.inst[which].t.push(new THREE.Matrix4().compose(
      new THREE.Vector3(x, groundHeight(x, z) - 0.012 + s * 0.35, z), q, new THREE.Vector3(s, s * 0.7, s)));
    ctx.inst[which].c.push(tint(0xaaa294, 0.12));
  }
  // papers — dusty, not bright white, so they don't read as floating cards
  for (let i = 0; i < 130; i++) {
    const x = randRange(-70, 70), z = randRange(-70, 70);
    if (!navgrid.isWalkable(x, z)) continue;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(randRange(-0.06, 0.06), rand() * Math.PI, randRange(-0.06, 0.06)));
    ctx.inst.paper.t.push(new THREE.Matrix4().compose(new THREE.Vector3(x, groundHeight(x, z) + 0.01, z), q,
      new THREE.Vector3(randRange(0.5, 0.85), 1, randRange(0.5, 0.85))));
    ctx.inst.paper.c.push(tint(randPick([0x8a8474, 0x78715f, 0x968e7a]), 0.08));
  }
}

// ---------------------------------------------------------------------------
//  instanced mesh finalization
// ---------------------------------------------------------------------------

/** Slumped filled sack: flattened ellipsoid, floor-flattened, dished top. */
function sandbagGeometry() {
  const g = new THREE.SphereGeometry(1, 10, 7);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    // square up the plan silhouette a touch so it reads as a filled sack
    const bulge = 1 + 0.22 * Math.abs(x * z) / (x * x + z * z + 1e-5);
    x *= bulge; z *= bulge;
    // slump: soft-flatten the underside, dish the middle of the top
    if (y < -0.45) y = -0.45 + (y + 0.45) * 0.25;
    if (y > 0) y *= 1 - 0.28 * Math.max(0, 1 - (x * x + z * z) * 1.4);
    p.setXYZ(i, x * 0.34, y * 0.16, z * 0.19);
  }
  g.computeVertexNormals();
  return g;
}

/** Loose tire: torus with block tread displacement + dark hub disc. */
function tireGeometry() {
  const torus = new THREE.TorusGeometry(0.295, 0.105, 8, 24);
  const p = torus.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    const a = Math.atan2(v.y, v.x);
    const seg = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 24);
    const ringR = Math.hypot(v.x, v.y);
    // push alternating segments outward on the outer half = tread blocks
    if (seg % 2 === 0 && ringR > 0.295) {
      const cx = Math.cos(a) * 0.295, cy = Math.sin(a) * 0.295;
      v.set(cx + (v.x - cx) * 1.13, cy + (v.y - cy) * 1.13, v.z * 1.02);
    }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  torus.computeVertexNormals();
  const hub = new THREE.CylinderGeometry(0.2, 0.2, 0.09, 12).rotateX(Math.PI / 2);
  const merged = mergeGeometries([torus.toNonIndexed(), hub.toNonIndexed()], false);
  merged.rotateX(Math.PI / 2);
  return merged;
}

function palletGeometry() {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    parts.push(new THREE.BoxGeometry(1.2, 0.022, 0.1).translate(0, 0.065, -0.5 + i * 0.25));
  }
  for (const x of [-0.55, 0, 0.55]) {
    parts.push(new THREE.BoxGeometry(0.09, 0.09, 1.1).translate(x, 0.0, 0));
  }
  for (let i = 0; i < 3; i++) {
    parts.push(new THREE.BoxGeometry(1.2, 0.022, 0.12).translate(0, -0.055, -0.44 + i * 0.44));
  }
  return mergeGeometries(parts.map((p) => p.toNonIndexed()), false);
}

function jerseyGeometry() {
  const shape = new THREE.Shape();
  const pts = [[-0.5, 0], [0.5, 0], [0.42, 0.12], [0.15, 0.42], [0.12, 0.86], [-0.12, 0.86], [-0.15, 0.42], [-0.42, 0.12]];
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 3.0, bevelEnabled: false });
  g.translate(0, 0, -1.5);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.4, uv.getY(i) * 0.4);
  return g;
}

function finalizeInstanced(ctx) {
  const { game, group, inst } = ctx;
  const { assets } = game;
  const fabricMaps = {
    normalMap: assets.texture('/assets/textures/fabric/normal.jpg'),
    roughnessMap: assets.texture('/assets/textures/fabric/rough.jpg'),
  };
  // NOTE: material color stays white — per-instance colors carry the tint.
  const defs = [
    ['sandbag', sandbagGeometry(),
      new THREE.MeshStandardMaterial({ roughness: 1, ...fabricMaps }), true],
    ['jersey', jerseyGeometry(),
      new THREE.MeshStandardMaterial({ roughness: 0.96, ...assets.pbr('concrete_floor_2', [1, 1]) }), true],
    ['chunkA', chunkGeo(rand, 0), new THREE.MeshStandardMaterial({ roughness: 1, ...assets.pbr('dirty_concrete', [1, 1]) }), true],
    ['chunkB', chunkGeo(rand, 0), new THREE.MeshStandardMaterial({ roughness: 1, ...assets.pbr('gravel_concrete', [1, 1]) }), true],
    ['paper', new THREE.PlaneGeometry(0.3, 0.38).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }), false],
    ['tire', tireGeometry(),
      new THREE.MeshStandardMaterial({ roughness: 0.96, ...fabricMaps }), true],
    ['drum', new THREE.CylinderGeometry(0.3, 0.3, 0.92, 12),
      new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.35, ...assets.pbr('rusty_metal', [1, 1]) }), true],
    ['crate', new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ roughness: 0.92, ...assets.pbr('rough_wood', [1, 1]) }), true],
    ['pallet', palletGeometry(),
      new THREE.MeshStandardMaterial({ roughness: 0.95, ...assets.pbr('planks', [1, 1]) }), true],
  ];
  for (const [name, geo, mat, shadows] of defs) {
    const data = inst[name];
    if (!data.t.length) continue;
    const im = new THREE.InstancedMesh(geo, mat, data.t.length);
    for (let i = 0; i < data.t.length; i++) {
      im.setMatrixAt(i, data.t[i]);
      if (data.c[i]) im.setColorAt(i, data.c[i]);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = shadows;
    im.receiveShadow = true;
    im.frustumCulled = false;
    group.add(im);
  }
}
