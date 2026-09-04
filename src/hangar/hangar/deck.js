// d4-hangar deck: plating around the floor aperture, the shaft we own down to the keel (y -85), the
// retracted bay-door mechanism, safety rails, hazard markings, landing pads + taxi lines, the
// containment field over the hole and the four tractor-beam emitter housings at its corners.
import * as THREE from "three";
import { Batcher, sharedTorus } from "./batch.js";
import { FLOOR, SHAFT_BOTTOM, HOLE, HALL, PADS, TAXI_X, RACK, RAIL_H, HG, TRACTOR_POINTS } from "./layout.js";
import { tube, label, railRun } from "./util.js";

const Y_MARK = FLOOR + 0.02; // painted markings are 2 cm proud of the plating (no coplanar faces)
const FLAT_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)); // XY -> XZ plane

export function buildDeck(ctx) {
  const { kit, PALETTE } = ctx;
  const B = new Batcher(kit);

  // ---- deck plating (4 slabs around the hole; the shaft edge strips fill the last 0.6 m to the lip)
  // impWhite tint: the deck texture is already mid-grey, impGrey on top of it went too dark
  const deckOpts = { color: PALETTE.impWhite, texel: 0.5 };
  const yB = FLOOR - 0.5;
  kit.boxMM("impFloor", [HALL.x0, yB, HALL.z0], [HALL.x1, FLOOR, HOLE.z0 - 0.6], deckOpts);
  kit.boxMM("impFloor", [HALL.x0, yB, HOLE.z1 + 0.6], [HALL.x1, FLOOR, HALL.z1], deckOpts);
  kit.boxMM("impFloor", [HALL.x0, yB, HOLE.z0 - 0.6], [HOLE.x0 - 0.6, FLOOR, HOLE.z1 + 0.6], deckOpts);
  kit.boxMM("impFloor", [HOLE.x1 + 0.6, yB, HOLE.z0 - 0.6], [HALL.x1, FLOOR, HOLE.z1 + 0.6], deckOpts);

  buildShaft(ctx, B);
  buildRails(ctx, B);
  buildMarkings(ctx, B);
  buildField(ctx);
  for (const p of TRACTOR_POINTS) buildTractorHousing(ctx, B, p);

  B.flush();
}

// ---------------------------------------------------------------------------
// Shaft y -85..-72: walls, ribs, beacon rows, keel lip, and the parked bay-door leaves in recesses
// under the deck on the +-x sides (tracks, guide blocks, hydraulic rams).
// ---------------------------------------------------------------------------
function buildShaft(ctx, B) {
  const { kit, PALETTE } = ctx;
  const impDark = PALETTE.impDark, impMid = PALETTE.impMid, impBlack = PALETTE.impBlack;
  const yDeckB = FLOOR - 0.5;
  const zA = HOLE.z0, zB = HOLE.z1;
  const recessX1 = 48; // recess back wall
  const floorTop = SHAFT_BOTTOM + 0.6; // keel lip / recess floor top
  const M = "paintedMetal";
  const leafY = [-83.05, -79.95, -76.85]; // leaf centres (2 m thick), bottom one riding the floor track
  const ramY = [-81.5, -78.4, -74.9]; // gaps between / above the leaves

  for (const s of [-1, 1]) {
    const xo = (a) => s * a;
    const mm = (x0, x1) => [Math.min(xo(x0), xo(x1)), Math.max(xo(x0), xo(x1))];
    let a, b;
    // deck-edge strip (the lip you see from the deck) and recess ceiling / back wall / floor
    [a, b] = mm(36, 36.6);
    B.boxMM(M, impDark, [a, FLOOR - 1.6, zA], [b, FLOOR, zB]);
    [a, b] = mm(36.6, recessX1);
    B.boxMM(M, impBlack, [a, FLOOR - 1.6, zA], [b, yDeckB, zB]);
    [a, b] = mm(recessX1, recessX1 + 0.6);
    B.boxMM(M, impDark, [a, SHAFT_BOTTOM, zA], [b, yDeckB, zB]);
    [a, b] = mm(36, 52);
    B.boxMM(M, impDark, [a, SHAFT_BOTTOM, zA - 3.6], [b, floorTop, zB + 3.6]);
    // lip edge trim (lighter, so the hole outline reads from below)
    [a, b] = mm(35.9, 36.5);
    B.boxMM("metal", HG.steel, [a, floorTop, zA], [b, floorTop + 0.3, zB]);

    // three parked door leaves: dark leading-edge face with a 0.6 m hazard stripe, guide blocks, beacons
    for (let k = 0; k < 3; k++) {
      const yc = leafY[k];
      [a, b] = mm(37.3, recessX1 - 0.6);
      B.boxMM(M, impMid, [a, yc - 1.0, zA + 1], [b, yc + 1.0, zB - 1]);
      [a, b] = mm(37.0, 37.3);
      B.boxMM(M, impDark, [a, yc - 1.0, zA + 1], [b, yc + 1.0, zB - 1], { texel: 0.5 });
      [a, b] = mm(36.98, 37.0);
      B.boxMM("hgHazard", 0xffffff, [a, yc - 0.3, zA + 1.2], [b, yc + 0.3, zB - 1.2], { texel: 0.5 });
      for (let z = zA + 5; z < zB - 3; z += 8) {
        [a, b] = mm(36.85, 37.0);
        B.boxMM("metal", HG.gunmetal, [a, yc - 0.6, z - 0.4], [b, yc + 0.6, z + 0.4]);
        if (k === 1 && Math.round((z - zA - 5) / 8) % 3 === 0) {
          [a, b] = mm(36.7, 37.0);
          B.boxMM("hgPulse", 0xffffff, [a, yc - 0.18, z - 0.3], [b, yc + 0.18, z + 0.3]);
        }
      }
    }
    // tracks on the recess floor and under its ceiling
    for (let z = zA + 4; z <= zB - 4; z += 8) {
      [a, b] = mm(37, recessX1 - 0.2);
      B.boxMM("metal", HG.gunmetal, [a, floorTop, z - 0.15], [b, floorTop + 0.3, z + 0.15]);
      B.boxMM("metal", HG.gunmetal, [a, FLOOR - 1.9, z - 0.15], [b, FLOOR - 1.6, z + 0.15]);
    }
    // hydraulic rams (piston + cylinder + head block) in the gaps, shared geometry through the batcher
    for (let z = zA + 8; z <= zB - 8; z += 15) {
      for (const yr of ramY) {
        B.cyl("metal", HG.steel, xo((41 + recessX1 - 0.1) / 2), yr, z, 0.24, recessX1 - 0.1 - 41, "x", 10);
        B.cyl(M, impDark, xo((44.5 + recessX1 - 0.1) / 2), yr, z, 0.4, recessX1 - 0.1 - 44.5, "x", 10);
        B.box("metal", HG.gunmetal, xo(40.9), yr, z, 0.5, 0.9, 0.9);
      }
    }
    // beacon row along the hole edge (deck-edge strip), every 4 m
    for (let z = zA + 2; z < zB; z += 4) {
      [a, b] = mm(35.88, 36.0);
      B.boxMM("hgPulse", 0xffffff, [a, FLOOR - 0.95, z - 0.25], [b, FLOOR - 0.65, z + 0.25]);
    }
  }

  // +-z shaft walls (spanning under the deck to close the recess ends), deck-edge strips, ribs, beacons
  for (const [z0, z1, dirIn] of [
    [zA - 0.6, zA, 1],
    [zB, zB + 0.6, -1],
  ]) {
    B.boxMM(M, impDark, [-48.6, SHAFT_BOTTOM, z0], [48.6, yDeckB, z1]);
    // deck-edge strip, inner face 2 cm proud of the wall so nothing is coplanar
    if (dirIn > 0) B.boxMM(M, impDark, [-36.6, FLOOR - 1.6, z0], [36.6, FLOOR, z1 + 0.02]);
    else B.boxMM(M, impDark, [-36.6, FLOOR - 1.6, z0 - 0.02], [36.6, FLOOR, z1]);
    const zf = dirIn > 0 ? z1 : z0; // wall inner face
    const proud = (d0, d1) => [Math.min(zf + dirIn * d0, zf + dirIn * d1), Math.max(zf + dirIn * d0, zf + dirIn * d1)];
    const rib = (y0, y1, x0, x1) => {
      const [p0, p1] = proud(0, 0.5);
      B.boxMM(M, impMid, [x0, y0, p0], [x1, y1, p1]);
    };
    for (const y of [-75.4, -79.4, -83.2]) rib(y - 0.3, y + 0.3, -36, 36);
    for (let x = -33; x <= 33; x += 6) rib(floorTop, FLOOR - 1.6, x - 0.3, x + 0.3);
    for (let x = -34; x <= 34; x += 4) {
      const [p0, p1] = proud(0, 0.14);
      B.boxMM("hgPulse", 0xffffff, [x - 0.25, -78.15, p0], [x + 0.25, -77.85, p1]);
    }
    for (let x = -32; x <= 32; x += 8) {
      const [p0, p1] = proud(0, 0.12);
      B.boxMM("emitCool", 0xffffff, [x - 0.6, -84.15, p0], [x + 0.6, -83.95, p1]);
    }
    // keel lip beyond the wall + trim
    const lz0 = dirIn > 0 ? z0 - 3.0 : z1, lz1 = dirIn > 0 ? z0 : z1 + 3.0;
    B.boxMM(M, impDark, [-52, SHAFT_BOTTOM, lz0], [52, floorTop, lz1]);
    const [t0, t1] = proud(-0.6, 0.1);
    B.boxMM("metal", HG.steel, [-36.5, floorTop, t0], [36.5, floorTop + 0.3, t1]);
  }
}

// ---------------------------------------------------------------------------
// Rails around the hole (1.02 m, posts every 2.5 m, kick plate) with two lowerable hazard bars at the
// +-z ends and the hazard border on the deck.
// ---------------------------------------------------------------------------
function buildRails(ctx, B) {
  const { kit } = ctx;
  const off = 0.35;
  const rx = HOLE.x1 + off, rz0 = HOLE.z0 - off, rz1 = HOLE.z1 + off;
  const gap = 3.15; // half width of the hazard-bar gap at x = 0
  const end = 35.5; // rails stop short of the emitter housings at the corners
  for (const s of [-1, 1]) {
    railRun(B, kit, [s * rx, HOLE.z0 + 0.5], [s * rx, HOLE.z1 - 0.5], FLOOR, { tag: "aperture-rail" });
    for (const z of [rz0, rz1]) railRun(B, kit, [s * end, z], [s * gap, z], FLOOR, { tag: "aperture-rail" });
  }
  // hazard bars (lowered = closed) across the two gaps, on pivot posts with pulsing lamps
  for (const z of [rz0, rz1]) {
    B.box("hgHazard", 0xffffff, 0, FLOOR + 1.0, z, gap * 2 + 0.1, 0.14, 0.14, { texel: 1 });
    for (const s of [-1, 1]) {
      B.box("metal", HG.gunmetal, s * (gap + 0.15), FLOOR + 0.6, z, 0.26, 1.2, 0.26);
      B.box("hgPulse", 0xffffff, s * (gap + 0.15), FLOOR + 1.3, z, 0.2, 0.2, 0.2);
      B.box("metal", HG.steel, s * (gap + 0.15), FLOOR + 1.0, z, 0.34, 0.1, 0.34);
    }
    kit.collider([-gap - 0.3, FLOOR, z - 0.15], [gap + 0.3, FLOOR + RAIL_H, z + 0.15], "hazard-bar");
  }
  // hazard border 1.5 m wide around the hole (0.45 .. 1.95 m from the edge)
  const i0 = 0.45, i1 = 1.95;
  const hz = { texel: 0.5 };
  B.boxMM("hgHazard", 0xffffff, [HOLE.x1 + i0, FLOOR, HOLE.z0 - i1], [HOLE.x1 + i1, Y_MARK, HOLE.z1 + i1], hz);
  B.boxMM("hgHazard", 0xffffff, [HOLE.x0 - i1, FLOOR, HOLE.z0 - i1], [HOLE.x0 - i0, Y_MARK, HOLE.z1 + i1], hz);
  B.boxMM("hgHazard", 0xffffff, [HOLE.x0 - i0, FLOOR, HOLE.z0 - i1], [HOLE.x1 + i0, Y_MARK, HOLE.z0 - i0], hz);
  B.boxMM("hgHazard", 0xffffff, [HOLE.x0 - i0, FLOOR, HOLE.z1 + i0], [HOLE.x1 + i0, Y_MARK, HOLE.z1 + i1], hz);
  // deck-edge lights in the hazard border every 4 m (skipping the bar gaps and the emitter housings), so
  // the aperture outline reads from the spawn and the balcony
  const edgeLight = (x, z) => {
    B.box("metal", HG.gunmetal, x, FLOOR + 0.03, z, 0.4, 0.06, 0.4);
    B.box("emitWhite", 0xffffff, x, FLOOR + 0.085, z, 0.28, 0.05, 0.28);
  };
  const d = 1.25;
  for (let z = HOLE.z0 + 4; z <= HOLE.z1 - 4; z += 4) for (const s of [-1, 1]) edgeLight(s * (HOLE.x1 + d), z);
  for (let x = -32; x <= 32; x += 4) {
    if (Math.abs(x) < 4) continue;
    for (const z of [HOLE.z0 - d, HOLE.z1 + d]) edgeLight(x, z);
  }
  // deck stencils at the bar gaps
  label(kit, "hgDecal", "KEEP CLEAR", [0, Y_MARK + 0.01, rz0 - 2.6], [0, 1, 0], 7, { color: HG.yellow, spin: Math.PI });
  label(kit, "hgDecal", "KEEP CLEAR", [0, Y_MARK + 0.01, rz1 + 2.6], [0, 1, 0], 7, { color: HG.yellow });
}

// ---------------------------------------------------------------------------
// Landing pads, taxi lines, slot ticks, deck stencils
// ---------------------------------------------------------------------------
function buildMarkings(ctx, B) {
  const { kit } = ctx;
  const white = HG.white, yellow = HG.yellow;
  const ring = (x, z, r0, r1, color) => kit.add("painted", new THREE.RingGeometry(r0, r1, 72), { pos: [x, Y_MARK + 0.005, z], quat: FLAT_Q, color, uv: "scale", uvScale: [4, 1] });
  // painted stripe from FLOOR to Y_MARK
  const mark = (color, x0, x1, z0, z1) => B.boxMM("painted", color, [Math.min(x0, x1), FLOOR, Math.min(z0, z1)], [Math.max(x0, x1), Y_MARK, Math.max(z0, z1)]);

  for (const p of PADS) {
    ring(p.x, p.z, p.r - 0.4, p.r, white);
    ring(p.x, p.z, 1.6, 1.9, white);
    mark(white, p.x - 1.6, p.x + 1.6, p.z - 0.15, p.z + 0.15);
    mark(white, p.x - 0.15, p.x + 0.15, p.z - 1.6, p.z + 1.6);
    // pad number: lit stencil inside the ring on its aft side, readable from aft
    label(kit, "hgSign", p.n, [p.x, Y_MARK + 0.01, p.z + p.r - 2.6], [0, 1, 0], 4.2);
    // 16 edge lights just outside the ring
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const lx = p.x + Math.cos(a) * (p.r + 0.6), lz = p.z + Math.sin(a) * (p.r + 0.6);
      B.box("metal", HG.gunmetal, lx, FLOOR + 0.03, lz, 0.36, 0.06, 0.36);
      B.box("emitWhite", 0xffffff, lx, FLOOR + 0.08, lz, 0.26, 0.06, 0.26);
    }
  }

  // taxi lanes: yellow dashed centreline, white edge lines at +-3.5 m on the long lanes
  const dashZ = (x, z0, z1) => {
    for (let z = z0 + 1; z + 3 <= z1; z += 5) mark(yellow, x - 0.15, x + 0.15, z, z + 3);
  };
  const dashX = (z, x0, x1) => {
    for (let x = x0 + 1; x + 3 <= x1; x += 5) mark(yellow, x, x + 3, z - 0.15, z + 0.15);
  };
  for (const s of [-1, 1]) {
    const x = s * TAXI_X;
    dashZ(x, -56, 150);
    for (const e of [-3.5, 3.5]) mark(white, x + e - 0.075, x + e + 0.075, -56, 150);
    // bay spurs to the side doors at z 15 and z 120, arrows pointing into the bays
    dashX(15, Math.min(x, s * 78), Math.max(x, s * 78));
    dashX(120, Math.min(x, s * 78), Math.max(x, s * 78));
    for (const z of [18.6, 123.6]) label(kit, "hgDecal", "ARROW", [s * 66, Y_MARK + 0.01, z], [0, 1, 0], 3.2, { color: yellow, spin: s > 0 ? -Math.PI / 2 : Math.PI / 2 });
    // slot ticks + numbers toward the racks
    for (let i = 0; i < RACK.slotsZ.length; i++) {
      const z = RACK.slotsZ[i];
      mark(white, s * 55, s * 61, z - 0.125, z + 0.125);
      const id = `${s < 0 ? "P" : "S"}1-${String(i + 1).padStart(2, "0")}`;
      label(kit, "hgDecal", id, [s * 58, Y_MARK + 0.01, z + 1.4], [0, 1, 0], 2.6, { color: yellow });
    }
  }
  // cross lanes between the pads (aft apron) and on the forward apron
  for (const z of [118, 142, -52]) {
    dashX(z, -TAXI_X, -29);
    dashX(z, -15, 15);
    dashX(z, 29, TAXI_X);
  }
  // deck identification near the spawn + forward
  label(kit, "hgDecal", "FLIGHT DECK 4", [0, Y_MARK + 0.01, 150], [0, 1, 0], 12, { color: white });
  label(kit, "hgDecal", "DECK 4", [0, Y_MARK + 0.01, -62], [0, 1, 0], 8, { color: white });
}

// ---------------------------------------------------------------------------
// Containment field over the hole: additive shimmer plane, UVs in metres for the shader
// ---------------------------------------------------------------------------
function buildField(ctx) {
  const { kit } = ctx;
  const w = HOLE.x1 - HOLE.x0, d = HOLE.z1 - HOLE.z0;
  const g = new THREE.PlaneGeometry(w, d, 1, 1);
  kit.add("emitField", g, { pos: [(HOLE.x0 + HOLE.x1) / 2, FLOOR - 0.8, (HOLE.z0 + HOLE.z1) / 2], rot: [-Math.PI / 2, 0, 0], uv: "scale", uvScale: [w, d] });
}

// ---------------------------------------------------------------------------
// Tractor-beam emitter housing at a hole corner. The beam starts at `p` (the barrel mouth).
// ---------------------------------------------------------------------------
function buildTractorHousing(ctx, B, p) {
  const { kit, PALETTE } = ctx;
  const sx = Math.sign(p[0]), sz = p[2] < 30 ? -1 : 1;
  const cx = p[0] + sx * 1.6, cz = p[2] + sz * 1.6;
  const top = FLOOR + 2.4;
  // drum housing + base ring + cap
  kit.cyl("paintedMetal", cx, (FLOOR + top) / 2, cz, 1.5, top - FLOOR, "y", { color: PALETTE.impDark, segments: 24, texel: 0.5 });
  kit.cyl("metal", cx, FLOOR + 0.15, cz, 1.72, 0.3, "y", { color: HG.gunmetal, segments: 24 });
  kit.cyl("metal", cx, top + 0.2, cz, 1.25, 0.4, "y", { color: HG.gunmetal, segments: 24 });
  kit.cyl("paintedMetal", cx, top + 0.55, cz, 0.7, 0.3, "y", { color: PALETTE.impMid, segments: 16 });
  // coil rings around the drum (the barrel coils are inside the hole, so the drum needs its own) + a
  // painted yellow ring on the deck round the base
  const coil = sharedTorus(1.62, 0.1, 6, 32);
  for (const y of [FLOOR + 0.6, FLOOR + 0.9, FLOOR + 1.2]) B.geo("metal", HG.steel, coil, [cx, y, cz], FLAT_Q);
  kit.add("painted", new THREE.RingGeometry(1.95, 2.25, 48), { pos: [cx, Y_MARK + 0.005, cz], quat: FLAT_Q, color: HG.yellow, uv: "scale", uvScale: [4, 1] });
  // indicator lights + bolt heads around the drum
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const lx = cx + Math.cos(a) * 1.52, lz = cz + Math.sin(a) * 1.52;
    B.box("emitBlue", 0xffffff, lx, FLOOR + 1.5, lz, 0.16, 0.16, 0.16);
    B.box("metal", HG.gunmetal, lx, FLOOR + 1.9, lz, 0.14, 0.14, 0.14);
  }
  B.box("hgPulse", 0xffffff, cx, top + 0.8, cz, 0.3, 0.2, 0.3);
  // barrel from the housing top toward the mouth, with coil rings and an emissive throat ring
  const start = [cx - sx * 0.2, top - 0.6, cz - sz * 0.2];
  tube(kit, "paintedMetal", start, p, 0.55, { color: PALETTE.impDark, segments: 16 });
  const dir = new THREE.Vector3(p[0] - start[0], p[1] - start[1], p[2] - start[2]);
  const len = dir.length();
  dir.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  const along = (f) => [start[0] + dir.x * f, start[1] + dir.y * f, start[2] + dir.z * f];
  for (const f of [0.3, 0.5, 0.7]) kit.add("metal", new THREE.TorusGeometry(0.72, 0.11, 8, 24), { pos: along(len * f), quat: q, color: HG.steel, uv: "scale", uvScale: [4, 0.5] });
  kit.add("emitBlue", new THREE.TorusGeometry(0.6, 0.06, 6, 24), { pos: along(len - 0.35), quat: q, uv: "scale", uvScale: [4, 0.5] });
  // cut plate where the barrel passes through the deck lip
  B.box("paintedMetal", PALETTE.impBlack, p[0] + sx * 0.9, Y_MARK + 0.015, p[2] + sz * 0.9, 2.4, 0.03, 2.4);
  // deck stencil + collider (generous AABB so the corner between the rail ends is closed)
  label(kit, "hgDecal", "TRACTOR EMITTER", [cx + sx * 0.4, Y_MARK + 0.01, cz + sz * 3.0], [0, 1, 0], 3.6, { color: HG.yellow, spin: sz > 0 ? 0 : Math.PI });
  kit.collider(
    [Math.min(cx - 1.8, p[0] - sx * 0.2), FLOOR, Math.min(cz - 1.8, p[2] - sz * 0.2)],
    [Math.max(cx + 1.8, p[0] - sx * 0.2), top + 1, Math.max(cz + 1.8, p[2] - sz * 0.2)],
    "tractor-housing",
  );
}
