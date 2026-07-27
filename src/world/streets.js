import * as THREE from 'three';
import { mat4 } from './geo.js';
import { rand, randRange, randPick } from '../core/rand.js';

/**
 * Street network: asphalt roads, raised sidewalks with real curbs, a cracked
 * plaza, lane markings, manholes, stains and grime decals.
 *
 * Layout (world units, x east, z south):
 *   N-S boulevard   x ∈ [-8.5, 8.5]
 *   E-W main street z ∈ [-6.5, 6.5]
 *   N-S secondary   x ∈ ±[42.5, 51.5]
 *   E-W secondary   z ∈ ±[42.5, 51.5]
 */
export const L = {
  HALF: 78,        // playable half extent
  ROAD_H: 0.05,    // asphalt top
  WALK_H: 0.17,    // sidewalk top (12cm curb)
  BLV: 8.5,        // boulevard half width
  CROSS: 6.5,      // main cross street half width
  SEC0: 42.5, SEC1: 51.5, // secondary street span
  SW: 2.7,         // sidewalk width
};

function roadBox(buckets, x0, x1, z0, z1) {
  const w = x1 - x0, d = z1 - z0;
  buckets.box('asphalt', w, L.ROAD_H, d, mat4((x0 + x1) / 2, L.ROAD_H / 2, (z0 + z1) / 2),
    { color: 0xffffff, uvOffset: [rand(), rand()] });
}

function walkBox(buckets, x0, x1, z0, z1, tint = 0xffffff) {
  const w = x1 - x0, d = z1 - z0;
  if (w <= 0.01 || d <= 0.01) return;
  buckets.box('sidewalk', w, L.WALK_H, d, mat4((x0 + x1) / 2, L.WALK_H / 2, (z0 + z1) / 2), { color: tint });
}

/** Top surface height at a point (road / sidewalk / plaza / dirt) + epsilon. */
export function groundHeight(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  const onRoad = ax <= L.BLV || az <= L.CROSS || (ax >= L.SEC0 && ax <= L.SEC1) || (az >= L.SEC0 && az <= L.SEC1);
  // plaza
  if (x >= -26.5 && x <= -L.BLV - L.SW && z >= L.CROSS + L.SW && z <= 31) return 0.072;
  if (onRoad) return L.ROAD_H + 0.006;
  // sidewalk rings of inner blocks
  const inBlock = ax > L.BLV && ax < L.SEC0 && az > L.CROSS && az < L.SEC0;
  if (inBlock) {
    const nearEdge = ax < L.BLV + L.SW || ax > L.SEC0 - L.SW || az < L.CROSS + L.SW || az > L.SEC0 - L.SW;
    if (nearEdge) return L.WALK_H + 0.006;
    return 0.028;
  }
  // outer sidewalks
  if ((ax > L.SEC1 && ax < L.SEC1 + L.SW && az < L.SEC1 + L.SW) ||
      (az > L.SEC1 && az < L.SEC1 + L.SW && ax < L.SEC1 + L.SW)) return L.WALK_H + 0.006;
  return 0.028;
}

/** Flat ground decal. */
export function groundDecal(buckets, bucket, x, z, w, h, ry, tint, y = 0.058, uvRegion = null) {
  const g = new THREE.PlaneGeometry(w, h);
  buckets.push(bucket, g, mat4(x, y, z, -Math.PI / 2, 0, 0).multiply(mat4(0, 0, 0, 0, 0, ry)),
    { color: tint, uvRegion });
}

/** Decal stuck on a vertical wall. normal = angle around Y the decal faces. */
export function wallDecal(buckets, bucket, x, y, z, w, h, faceAngle, tint, offset = 0.03) {
  const g = new THREE.PlaneGeometry(w, h);
  const m = mat4(x + Math.sin(faceAngle) * offset, y, z + Math.cos(faceAngle) * offset, 0, faceAngle, 0);
  buckets.push(bucket, g, m, { color: tint });
}

export function buildStreets(ctx) {
  const { buckets } = ctx;
  const H = L.HALF;
  const E = H + 14; // ground extends past bounds so edges never show raw void

  // ---- dirt base ----------------------------------------------------------
  const base = new THREE.PlaneGeometry(E * 2, E * 2, 1, 1);
  buckets.push('dirt', base, mat4(0, 0.001, 0, -Math.PI / 2), { color: 0xffffff });

  // ---- roads (overlap-free segments) ---------------------------------------
  // boulevard, full length
  roadBox(buckets, -L.BLV, L.BLV, -E, E);
  // main cross street, split around boulevard + secondaries
  for (const [x0, x1] of [[-E, -L.SEC1], [-L.SEC0, -L.BLV], [L.BLV, L.SEC0], [L.SEC1, E]])
    roadBox(buckets, x0, x1, -L.CROSS, L.CROSS);
  // secondary N-S, full length both sides
  roadBox(buckets, L.SEC0, L.SEC1, -E, E);
  roadBox(buckets, -L.SEC1, -L.SEC0, -E, E);
  // secondary E-W, split around boulevard + secondaries
  for (const zs of [[-L.SEC1, -L.SEC0], [L.SEC0, L.SEC1]]) {
    for (const [x0, x1] of [[-E, -L.SEC1], [-L.SEC0, -L.BLV], [L.BLV, L.SEC0], [L.SEC1, E]])
      roadBox(buckets, x0, x1, zs[0], zs[1]);
  }

  // ---- sidewalks around the four inner blocks ------------------------------
  const SW = L.SW;
  const blocks = [
    [L.BLV, L.SEC0, -L.SEC0, -L.CROSS],   // NE
    [-L.SEC0, -L.BLV, -L.SEC0, -L.CROSS], // NW
    [L.BLV, L.SEC0, L.CROSS, L.SEC0],     // SE
    [-L.SEC0, -L.BLV, L.CROSS, L.SEC0],   // SW
  ];
  for (const [x0, x1, z0, z1] of blocks) {
    const tint = new THREE.Color(0xffffff).offsetHSL(0, 0, randRange(-0.03, 0.02));
    walkBox(buckets, x0, x0 + SW, z0, z1, tint);
    walkBox(buckets, x1 - SW, x1, z0, z1, tint);
    walkBox(buckets, x0 + SW, x1 - SW, z0, z0 + SW, tint);
    walkBox(buckets, x0 + SW, x1 - SW, z1 - SW, z1, tint);
  }
  // outer sidewalks along the far side of secondary streets
  walkBox(buckets, L.SEC1, L.SEC1 + SW, -L.SEC1 - SW, L.SEC1 + SW);
  walkBox(buckets, -L.SEC1 - SW, -L.SEC1, -L.SEC1 - SW, L.SEC1 + SW);
  walkBox(buckets, -L.SEC1, L.SEC1, -L.SEC1 - SW, -L.SEC1);
  walkBox(buckets, -L.SEC1, L.SEC1, L.SEC1, L.SEC1 + SW);

  // ---- plaza (SW block interior): cracked concrete slabs -------------------
  const PL = { x0: -L.SEC0 + SW, x1: -L.BLV - SW, z0: L.CROSS + SW, z1: 31 };
  ctx.plaza = PL;
  const slab = 3.4;
  for (let x = PL.x0; x < PL.x1 - 0.5; x += slab) {
    for (let z = PL.z0; z < PL.z1 - 0.5; z += slab) {
      const w = Math.min(slab - 0.06, PL.x1 - x);
      const d = Math.min(slab - 0.06, PL.z1 - z);
      const hgt = 0.055 + randRange(-0.014, 0.014);
      buckets.box('plaza', w, hgt, d,
        mat4(x + w / 2, hgt / 2, z + d / 2, randRange(-0.006, 0.006), randRange(-0.01, 0.01), 0),
        { color: new THREE.Color(0xffffff).offsetHSL(0, 0, randRange(-0.045, 0.02)) });
      if (rand() < 0.30) {
        groundDecal(buckets, 'decalCrack', x + w / 2, z + d / 2, randRange(2, 3.3), randRange(2, 3.3),
          rand() * Math.PI, 0xffffff, hgt + 0.006);
      }
    }
  }

  // ---- lane markings (worn) -------------------------------------------------
  const wearUV = () => {
    const u0 = rand() * 0.72, v0 = rand() * 0.72;
    return [u0, v0, u0 + 0.28, v0 + 0.28];
  };
  const dash = (x, z, ry, len = 2.6, wid = 0.13) => {
    if (rand() < 0.38) return; // missing paint
    const tint = new THREE.Color(0xffffff).multiplyScalar(randRange(0.26, 0.5));
    const g = new THREE.PlaneGeometry(wid, len);
    buckets.push('roadPaint', g, mat4(x, L.ROAD_H + 0.006, z, -Math.PI / 2, 0, 0).multiply(mat4(0, 0, 0, 0, 0, ry)),
      { color: tint, uvRegion: wearUV() });
  };
  for (let z = -H + 4; z < H - 4; z += 5.5) {
    if (Math.abs(z) < 9) continue;
    dash(randRange(-0.05, 0.05), z, randRange(-0.02, 0.02));
    // side lane dashes
    if (rand() < 0.75) dash(-4.3, z + 2.2, 0, 2.2, 0.11);
    if (rand() < 0.75) dash(4.3, z + 2.2, 0, 2.2, 0.11);
  }
  for (const sx of [-1, 1]) {
    for (let x = 12; x < H - 4; x += 5.5) {
      dash(sx * x, randRange(-0.05, 0.05), Math.PI / 2);
    }
  }
  // crosswalks at the main intersection
  const zebra = (cx, cz, along, n = 7) => {
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 1.05;
      if (rand() < 0.34) continue;
      const tint = new THREE.Color(0xffffff).multiplyScalar(randRange(0.16, 0.34));
      const g = new THREE.PlaneGeometry(along === 'x' ? 0.55 : 2.6, along === 'x' ? 2.6 : 0.55);
      const x = along === 'x' ? cx + off : cx;
      const z = along === 'x' ? cz : cz + off;
      buckets.push('roadPaint', g, mat4(x, L.ROAD_H + 0.007, z, -Math.PI / 2), { color: tint, uvRegion: wearUV() });
    }
  };
  zebra(0, -L.CROSS - 2.2, 'x', 13);
  zebra(0, L.CROSS + 2.2, 'x', 13);
  zebra(-L.BLV - 2.2, 0, 'z', 9);
  zebra(L.BLV + 2.2, 0, 'z', 9);

  // ---- macro-scale wear: big worn/dark patches so asphalt is never one value --
  for (let i = 0; i < 40; i++) {
    const onBlv = rand() < 0.55;
    const x = onBlv ? randRange(-7.5, 7.5) : randRange(-H + 6, H - 6);
    const z = onBlv ? randRange(-H + 6, H - 6) : randRange(-5.5, 5.5);
    if (!onBlv && Math.abs(x) > 9 && Math.abs(z) > 6.5) continue;
    const light = rand() < 0.6;
    groundDecal(buckets, 'decalMacro', x, z, randRange(7, 16), randRange(5, 11), rand() * Math.PI,
      light ? 0xd8ccb2 : 0x211d18, L.ROAD_H + 0.002 + rand() * 0.002);
  }
  // worn pale patches on the plaza slabs
  for (let i = 0; i < 9; i++) {
    groundDecal(buckets, 'decalMacro', randRange(PL.x0 + 2, PL.x1 - 2), randRange(PL.z0 + 2, PL.z1 - 2),
      randRange(5, 9), randRange(4, 7), rand() * Math.PI, rand() < 0.55 ? 0xe0d4ba : 0x2a251e, 0.078);
  }
  // tire-lane darkening: broken segments along each wheel track
  const wheelTrack = (fixed, vertical) => {
    for (let c = -H + 8; c < H - 8; c += randRange(14, 26)) {
      if (rand() < 0.22) continue;
      const len = randRange(12, 22);
      const jit = randRange(-0.25, 0.25);
      const x = vertical ? fixed + jit : c + len / 2;
      const z = vertical ? c + len / 2 : fixed + jit;
      groundDecal(buckets, 'decalMacro', x, z, vertical ? 1.15 : len, vertical ? len : 1.15,
        vertical ? Math.PI / 2 : 0, 0x1a1712, L.ROAD_H + 0.0045);
    }
  };
  for (const tx of [-3.4, -1.5, 1.5, 3.4]) wheelTrack(tx, true);
  for (const tz of [-3.1, -1.4, 1.4, 3.1]) wheelTrack(tz, false);
  // oil soak at the main intersection
  for (let i = 0; i < 6; i++) {
    groundDecal(buckets, 'decalStain', randRange(-5, 5), randRange(-4, 4), randRange(2.2, 4.5), randRange(1.8, 3.2),
      rand() * Math.PI, 0x15120e, L.ROAD_H + 0.012 + i * 0.001);
  }
  // extra long cracks in the asphalt
  for (let i = 0; i < 10; i++) {
    const onBlv = rand() < 0.5;
    const x = onBlv ? randRange(-7, 7) : randRange(-H + 8, H - 8);
    const z = onBlv ? randRange(-H + 8, H - 8) : randRange(-5, 5);
    if (!onBlv && Math.abs(x) > 9 && Math.abs(z) > 6.5) continue;
    groundDecal(buckets, 'decalCrack', x, z, randRange(2.6, 4.4), randRange(2.6, 4.4),
      rand() * Math.PI, 0xffffff, L.ROAD_H + 0.008);
  }
  // ---- surface history: tire arcs, oil drips, litter, curb chips -------------
  // skid arcs sweeping through the main intersection
  for (const [ax, az, ar] of [[-2.5, 1.5, 0.35], [2.2, -2.8, Math.PI + 0.2], [-1.2, -3.4, Math.PI / 2 - 0.3], [3.5, 2.6, -Math.PI / 2 + 0.5]]) {
    groundDecal(buckets, 'decalTire', ax, az, randRange(6.5, 9), randRange(6.5, 9), ar, 0xffffff, L.ROAD_H + 0.01);
  }
  // one long braking streak pair on the north boulevard
  groundDecal(buckets, 'decalTire', -2.2, -18, 7, 16, Math.PI * 0.52, 0xffffff, L.ROAD_H + 0.01);
  // oil drip lines down the lane centers (engines leak where cars idle)
  for (const [ox, oz, ov] of [[-2.4, -14, 1], [2.5, 9, 1], [-11, 2.3, 0], [14, -2.4, 0], [2.4, 26, 1], [-2.5, 38, 1]]) {
    for (let k = 0; k < 4; k++) {
      groundDecal(buckets, 'decalStain', ox + (ov ? randRange(-0.2, 0.2) : k * 1.7), oz + (ov ? k * 1.7 : randRange(-0.2, 0.2)),
        randRange(0.5, 1.1), randRange(0.4, 0.9), rand() * Math.PI, 0x16130f, L.ROAD_H + 0.011);
    }
  }
  // litter clusters drifting along the curb lines and gutters
  for (let i = 0; i < 16; i++) {
    const onBlv = rand() < 0.5;
    const side = rand() < 0.5 ? 1 : -1;
    const x = onBlv ? side * randRange(7.2, 8.6) : randRange(-H + 10, H - 10);
    const z = onBlv ? randRange(-H + 10, H - 10) : side * randRange(5.6, 6.9);
    groundDecal(buckets, 'decalLitter', x, z, randRange(1.6, 3.2), randRange(1.4, 2.6),
      rand() * Math.PI, 0xffffff, L.ROAD_H + 0.013);
  }
  // a few blown against the plaza edge + market gutter
  for (let i = 0; i < 5; i++) {
    groundDecal(buckets, 'decalLitter', randRange(-30, -12), randRange(24, 38),
      randRange(1.5, 2.8), randRange(1.3, 2.2), rand() * Math.PI, 0xffffff, 0.082);
  }
  // curb chips + grime pools along curb feet
  for (let i = 0; i < 22; i++) {
    const onBlv = rand() < 0.5;
    const side = rand() < 0.5 ? 1 : -1;
    const x = onBlv ? side * randRange(8.4, 9.1) : randRange(-H + 10, H - 10);
    const z = onBlv ? randRange(-H + 10, H - 10) : side * randRange(6.3, 7.0);
    const chip = rand() < 0.4;
    groundDecal(buckets, chip ? 'decalMacro' : 'decalGrime', x, z, randRange(0.7, 1.6), randRange(0.5, 1.1),
      onBlv ? Math.PI / 2 : 0, chip ? 0xd9cfb6 : 0x2a251e, 0.079 + rand() * 0.003);
  }

  // ---- manholes --------------------------------------------------------------
  for (const [mx, mz] of [[2.8, 18], [-3.2, -26], [1.5, 44], [24, 2.4], [-31, -2.2], [47, -22]]) {
    const g = new THREE.CylinderGeometry(0.42, 0.42, 0.016, 18);
    buckets.push('metalDark', g, mat4(mx, L.ROAD_H + 0.008, mz), { color: 0x8b857c });
    groundDecal(buckets, 'decalStain', mx, mz, 1.5, 1.5, rand() * 3, 0x24211d, L.ROAD_H + 0.02);
  }

  // ---- oil stains, tire marks, mud patches -----------------------------------
  const stains = [
    [6.6, -36, 2.8], [6.7, 24, 3.4], [-6.5, 12, 2.5], [-2, -14, 4.2], [1.5, 6, 3],
    [26, -2, 3.6], [-22, 3, 2.9], [47, 18, 2.6], [-13, 27, 2.2], [14, 60, 3.1],
  ];
  for (const [sx, sz, s] of stains) {
    groundDecal(buckets, 'decalStain', sx, sz, s, s * randRange(0.7, 1.1), rand() * Math.PI, 0x1a1815, L.ROAD_H + randRange(0.01, 0.014));
  }
  // dusty mud creeping onto road edges
  for (let i = 0; i < 26; i++) {
    const onBlv = rand() < 0.5;
    const x = onBlv ? randPick([-1, 1]) * randRange(6.2, 8.3) : randRange(-H + 8, H - 8);
    const z = onBlv ? randRange(-H + 8, H - 8) : randPick([-1, 1]) * randRange(4.0, 6.3);
    if (!onBlv && Math.abs(x) < 10) continue;
    groundDecal(buckets, 'decalStain', x, z, randRange(2.5, 5.5), randRange(1.6, 3),
      rand() * Math.PI, 0x9a8560, L.ROAD_H + randRange(0.008, 0.012));
  }

  // ---- curb grime lines -------------------------------------------------------
  const curbGrime = (x, z, len, spin) => {
    const g = new THREE.PlaneGeometry(len, 0.85);
    buckets.push('decalGrime', g,
      mat4(x, L.ROAD_H + 0.009, z, -Math.PI / 2, 0, 0).multiply(mat4(0, 0, 0, 0, 0, spin)),
      { color: 0xffffff, uvRegion: [0, 0, len / 4, 1] });
  };
  for (const s of [-1, 1]) {
    curbGrime(s * (L.BLV + 0.42), -25, 33, s > 0 ? Math.PI / 2 : -Math.PI / 2);
    curbGrime(s * (L.BLV + 0.42), 25, 33, s > 0 ? Math.PI / 2 : -Math.PI / 2);
    curbGrime(-26, s * (L.CROSS + 0.42), 30, s > 0 ? Math.PI : 0);
    curbGrime(26, s * (L.CROSS + 0.42), 30, s > 0 ? Math.PI : 0);
  }
}
