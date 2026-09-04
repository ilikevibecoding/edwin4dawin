// d4-hangar deck: dark semi-gloss plating (4 m plates on a black seam bed, the plate sheet carrying the
// seams, rivets, tie-down rings and wear) around the floor aperture, the shaft we own down to the keel
// (y -85) with the retracted bay-door mechanism and its lit lining, the aperture lip (steel lip, sparse
// black/yellow dashes, non-slip band, lit rails, housed beacons), landing pads, the apron taxi lane from
// the aft door with hold-short bars, taxi lines, cable covers, deck stencils, contact shadows, the
// containment field over the hole and the four tractor emitters.
import * as THREE from "three";
import { Batcher, sharedTorus, PY } from "./batch.js";
import { FLOOR, SHAFT_BOTTOM, HOLE, HALL, PADS, TAXI_X, RACK, RAIL_H, HG, TRACTOR_POINTS, RIB_Z, RIB_X } from "./layout.js";
import { DECK_TILE, LABELS } from "./materials.js";
import { tube, label, railRun, housedLamp, redBeacon, hazardBlocks } from "./util.js";

export const Y_MARK = FLOOR + 0.02; // painted markings are 2 cm proud of the plating (no coplanar faces)
const FLAT_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)); // XY -> XZ plane
const SEAM_Y = FLOOR - 0.06; // black seam bed under the plates
const LIP = { steel: 0.3, dash: 0.7, band: 1.6 }; // from the hole edge: steel lip 0..0.3, dashes 0.3..0.7, band ..1.6
const RAIL_OFF = 0.9; // rail line from the hole edge (inside it: lip + hazard dashes)
const PAINT_WHITE = new THREE.Color(0xbfc3c9);

export function buildDeck(ctx) {
  const { kit, PALETTE, materials } = ctx;
  const B = new Batcher(kit);
  // the plate sheet repeats every DECK_TILE m; the 4 m grid starts at z -70, so the sheet is shifted by
  // 2 m along z to put its seams on the plate joints (the x grid starts at -80, already on the tile)
  const sheet = materials.hgDeck.map;
  sheet.offset.set(0, ((HALL.z0 % DECK_TILE) + DECK_TILE) % DECK_TILE / DECK_TILE);

  // ---- seam bed: 4 black slabs round the hole (their top is the bottom of every seam)
  const bed = { color: PALETTE.impBlack, texel: 0.5 };
  const yB = FLOOR - 0.5;
  const bx0 = HOLE.x0 - LIP.band, bx1 = HOLE.x1 + LIP.band, bz0 = HOLE.z0 - LIP.band, bz1 = HOLE.z1 + LIP.band;
  kit.boxMM("paintedMetal", [HALL.x0, yB, HALL.z0], [HALL.x1, SEAM_Y, bz0], bed);
  kit.boxMM("paintedMetal", [HALL.x0, yB, bz1], [HALL.x1, SEAM_Y, HALL.z1], bed);
  kit.boxMM("paintedMetal", [HALL.x0, yB, bz0], [bx0, SEAM_Y, bz1], bed);
  kit.boxMM("paintedMetal", [bx1, yB, bz0], [HALL.x1, SEAM_Y, bz1], bed);

  buildPlates(ctx, B);
  buildLip(ctx, B);
  buildShaft(ctx, B);
  buildRails(ctx, B);
  buildMarkings(ctx, B);
  buildField(ctx);
  for (const p of TRACTOR_POINTS) buildTractorHousing(ctx, B, p);

  B.flush();
}

// ---------------------------------------------------------------------------
// Plates: 4 m semi-gloss plates (hgDeck; the sheet draws seams, rivets and tie-down rings, the vertex tone
// sets the plate colour) with 6 cm gaps to the black bed, wider section joints on the rib lines, a darker
// plate band under each taxi lane and round the aperture, a small per-plate tone step so the tiled sheet
// never reads as one repeated image.
// ---------------------------------------------------------------------------
function buildPlates(ctx, B) {
  const { PALETTE } = ctx;
  const G = 4, seam = 0.06, joint = 0.16;
  // lip band rect (grown by half a seam so the plates keep a seam to the band)
  const cut = { x0: HOLE.x0 - LIP.band - seam / 2, x1: HOLE.x1 + LIP.band + seam / 2, z0: HOLE.z0 - LIP.band - seam / 2, z1: HOLE.z1 + LIP.band + seam / 2 };
  const onJoint = (v, lines) => lines.some((l) => Math.abs(l - v) < 1.01);
  const steps = (c) => [c.clone().multiplyScalar(0.93), c, c.clone().multiplyScalar(1.07)];
  const tones = { mid: steps(PALETTE.impMid), dark: steps(PALETTE.impDark) };
  const tone = (cx, cz) => {
    const nearHole = cx > HOLE.x0 - 8 && cx < HOLE.x1 + 8 && cz > HOLE.z0 - 8 && cz < HOLE.z1 + 8;
    const lane = Math.abs(Math.abs(cx) - TAXI_X) < G;
    const set = nearHole || lane ? tones.dark : tones.mid;
    // deterministic per-plate step (integer hash of the plate cell)
    const h = (Math.round(cx / G) * 73856093) ^ (Math.round(cz / G) * 19349663);
    return set[((h >>> 0) % 3 + 3) % 3];
  };
  const plate = (x0, x1, z0, z1) => {
    if (x1 - x0 < 0.3 || z1 - z0 < 0.3) return;
    B.boxMM("hgDeck", tone((x0 + x1) / 2, (z0 + z1) / 2), [x0, SEAM_Y, z0], [x1, FLOOR, z1], { faces: PY, texel: 1 / DECK_TILE });
  };
  for (let x = HALL.x0; x < HALL.x1 - 0.01; x += G) {
    for (let z = HALL.z0; z < HALL.z1 - 0.01; z += G) {
      let x0 = x + seam / 2, x1 = x + G - seam / 2, z0 = z + seam / 2, z1 = z + G - seam / 2;
      // wider joints along the rib lines (+-20 m grid)
      if (onJoint(x, RIB_X)) x0 += joint / 2;
      if (onJoint(x + G, RIB_X)) x1 -= joint / 2;
      if (onJoint(z, RIB_Z)) z0 += joint / 2;
      if (onJoint(z + G, RIB_Z)) z1 -= joint / 2;
      // plate minus the lip band: up to four pieces (x strips outside the band, then z strips inside its x range)
      if (x0 < cut.x1 && x1 > cut.x0 && z0 < cut.z1 && z1 > cut.z0) {
        if (x0 < cut.x0) plate(x0, cut.x0, z0, z1);
        if (x1 > cut.x1) plate(cut.x1, x1, z0, z1);
        const mx0 = Math.max(x0, cut.x0), mx1 = Math.min(x1, cut.x1);
        if (z0 < cut.z0) plate(mx0, mx1, z0, cut.z0);
        if (z1 > cut.z1) plate(mx0, mx1, cut.z1, z1);
        continue;
      }
      plate(x0, x1, z0, z1);
    }
  }
}

// ---------------------------------------------------------------------------
// Aperture lip, from the hole edge outward: a 0.3 m light steel lip (its face turning 0.3 m down into
// the hole), a sparse black/yellow dash strip (2 m dashes, 1 m gaps, 0.4 m wide) on a dark rubber
// non-slip band that runs out to 1.6 m, housed white edge lights in the band every 6 m.
// ---------------------------------------------------------------------------
function buildLip(ctx, B) {
  const { PALETTE } = ctx;
  const s = LIP.steel, d = LIP.dash, b = LIP.band;
  const yT = FLOOR + 0.03; // lip top, a hair over the paint
  const steel = (mn, mx) => B.boxMM("metal", HG.steel, mn, mx);
  // steel lip: top plate round the hole + inner face 0.3 m down
  steel([HOLE.x0 - s, FLOOR - 0.3, HOLE.z0 - s], [HOLE.x1 + s, yT, HOLE.z0]);
  steel([HOLE.x0 - s, FLOOR - 0.3, HOLE.z1], [HOLE.x1 + s, yT, HOLE.z1 + s]);
  steel([HOLE.x0 - s, FLOOR - 0.3, HOLE.z0], [HOLE.x0, yT, HOLE.z1]);
  steel([HOLE.x1, FLOOR - 0.3, HOLE.z0], [HOLE.x1 + s, yT, HOLE.z1]);
  // non-slip band (flush with the plates) from the lip to 1.6 m
  const nb = { texel: 1 };
  B.boxMM("rubber", PALETTE.impDark, [HOLE.x0 - b, SEAM_Y, HOLE.z0 - b], [HOLE.x1 + b, FLOOR, HOLE.z0 - s], nb);
  B.boxMM("rubber", PALETTE.impDark, [HOLE.x0 - b, SEAM_Y, HOLE.z1 + s], [HOLE.x1 + b, FLOOR, HOLE.z1 + b], nb);
  B.boxMM("rubber", PALETTE.impDark, [HOLE.x0 - b, SEAM_Y, HOLE.z0 - s], [HOLE.x0 - s, FLOOR, HOLE.z1 + s], nb);
  B.boxMM("rubber", PALETTE.impDark, [HOLE.x1 + s, SEAM_Y, HOLE.z0 - s], [HOLE.x1 + b, FLOOR, HOLE.z1 + s], nb);
  // hazard dashes: 2 m on, 1 m off, along every edge (skipping the bar gaps and the emitter corners)
  const dashLen = 2, gapLen = 1;
  for (const sx of [-1, 1]) {
    const x0 = Math.min(sx * (HOLE.x1 + s), sx * (HOLE.x1 + d)), x1 = Math.max(sx * (HOLE.x1 + s), sx * (HOLE.x1 + d));
    for (let z = HOLE.z0 + 2.5; z + dashLen <= HOLE.z1 - 2.5; z += dashLen + gapLen) hazardBlocks(B, [x0, FLOOR - 0.01, z], [x1, Y_MARK, z + dashLen], "z", { faces: PY });
  }
  for (const sz of [-1, 1]) {
    const zc = sz < 0 ? HOLE.z0 : HOLE.z1;
    const z0 = Math.min(zc + sz * s, zc + sz * d), z1 = Math.max(zc + sz * s, zc + sz * d);
    for (let x = -33.5; x + dashLen <= 33.5; x += dashLen + gapLen) {
      if (x + dashLen > -4.5 && x < 4.5) continue;
      hazardBlocks(B, [x, FLOOR - 0.01, z0], [x + dashLen, Y_MARK, z1], "x", { faces: PY });
    }
  }
  // housed edge lights in the band, outside the rail line
  const e = 1.2;
  const edgeLight = (x, z) => housedLamp(B, "emitWhite", [x, FLOOR + 0.12, z], [0, 1, 0], [0.34, 0.12, 0.34], { housing: HG.gunmetal, inset: 0.05 });
  for (let z = HOLE.z0 + 6; z <= HOLE.z1 - 6; z += 6) for (const sx of [-1, 1]) edgeLight(sx * (HOLE.x1 + e), z);
  for (let x = -30; x <= 30; x += 6) {
    if (Math.abs(x) < 5) continue;
    for (const z of [HOLE.z0 - e, HOLE.z1 + e]) edgeLight(x, z);
  }
}

// ---------------------------------------------------------------------------
// Shaft y -85..-72: walls, heavy ribs + mid ledge, two rows of housed white strips down the lining
// (y -76 and -82), housed red beacon rows, conduit runs, keel lip, and the parked bay-door leaves in
// recesses under the deck on the +-x sides (tracks, guide blocks, rams, lit leaf edges).
// ---------------------------------------------------------------------------
function buildShaft(ctx, B) {
  const { PALETTE } = ctx;
  const impDark = PALETTE.impDark, impMid = PALETTE.impMid, impBlack = PALETTE.impBlack;
  const yDeckB = FLOOR - 0.5;
  const zA = HOLE.z0, zB = HOLE.z1;
  const recessX1 = 48; // recess back wall
  const floorTop = SHAFT_BOTTOM + 0.6; // keel lip / recess floor top
  const M = "paintedMetal";
  const leafY = [-83.05, -79.95, -76.85]; // leaf centres (2 m thick), bottom one riding the floor track
  const ramY = [-81.5, -78.4, -74.9]; // gaps between / above the leaves
  const stripRows = [-76, -82.3]; // the lit lining rows (top leaf / bottom leaf faces on the +-x sides)

  for (const s of [-1, 1]) {
    const xo = (a) => s * a;
    const mm = (x0, x1) => [Math.min(xo(x0), xo(x1)), Math.max(xo(x0), xo(x1))];
    let a, b;
    // deck-edge strip under the steel lip, recess ceiling / back wall / floor
    [a, b] = mm(36, 36.6);
    B.boxMM(M, impDark, [a, FLOOR - 1.6, zA], [b, FLOOR - 0.3, zB]);
    [a, b] = mm(36.6, recessX1);
    B.boxMM(M, impBlack, [a, FLOOR - 1.6, zA], [b, yDeckB, zB]);
    [a, b] = mm(recessX1, recessX1 + 0.6);
    B.boxMM(M, impDark, [a, SHAFT_BOTTOM, zA], [b, yDeckB, zB]);
    [a, b] = mm(36, 52);
    B.boxMM(M, impDark, [a, SHAFT_BOTTOM, zA - 3.6], [b, floorTop, zB + 3.6]);
    // keel lip trim (lighter, so the hole outline reads from below) + a heavy lip beam proud of the deck
    // edge, carrying a lit strip on its inner face the full length of the edge (the far lip reads as a
    // lit line from across the hole)
    [a, b] = mm(35.9, 36.5);
    B.boxMM("metal", HG.steel, [a, floorTop, zA], [b, floorTop + 0.3, zB]);
    [a, b] = mm(35.4, 36.0);
    B.boxMM(M, impMid, [a, FLOOR - 1.0, zA - 0.6], [b, FLOOR - 0.6, zB + 0.6], { texel: 0.5 });
    [a, b] = mm(35.37, 35.4);
    B.boxMM("emitWhite", 0xffffff, [a, FLOOR - 0.94, zA - 0.4], [b, FLOOR - 0.66, zB + 0.4]);

    // three parked door leaves: dark leading-edge face, guide blocks; the top and bottom leaves carry the
    // two lit lining rows (housed white strips every 6 m), the middle one the red beacon row
    for (let k = 0; k < 3; k++) {
      const yc = leafY[k];
      [a, b] = mm(37.3, recessX1 - 0.6);
      B.boxMM(M, impMid, [a, yc - 1.0, zA + 1], [b, yc + 1.0, zB - 1]);
      [a, b] = mm(37.0, 37.3);
      B.boxMM(M, impDark, [a, yc - 1.0, zA + 1], [b, yc + 1.0, zB - 1], { texel: 0.5 });
      [a, b] = mm(36.98, 37.0);
      B.boxMM("metal", HG.steel, [a, yc - 0.1, zA + 1.2], [b, yc + 0.1, zB - 1.2]);
      for (let z = zA + 5; z < zB - 3; z += 8) {
        [a, b] = mm(36.8, 37.0);
        B.boxMM("metal", HG.gunmetal, [a, yc - 0.55, z - 0.45], [b, yc + 0.55, z + 0.45]);
      }
      if (k === 1) for (let z = zA + 4; z <= zB - 4; z += 8) redBeacon(B, [xo(36.8), yc + 0.5, z], [-s, 0, 0], 0.5);
      else {
        const y = k === 2 ? stripRows[0] : stripRows[1];
        for (let z = zA + 4; z <= zB - 4; z += 6) housedLamp(B, "emitWhite", [xo(36.8), y, z], [-s, 0, 0], [2.4, 0.2, 0.3], { inset: 0.04 });
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
    // housed red beacons under the lip beam every 12 m, facing into the hole (housing 16 cm proud)
    for (let z = zA + 4; z < zB; z += 12) redBeacon(B, [xo(35.84), FLOOR - 1.3, z], [-s, 0, 0], 0.44);
  }

  // +-z shaft walls (spanning under the deck to close the recess ends), deck-edge strips, ribs, ledge,
  // conduits, the two lit lining rows, beacons
  for (const [z0, z1, dirIn] of [
    [zA - 0.6, zA, 1],
    [zB, zB + 0.6, -1],
  ]) {
    B.boxMM(M, impDark, [-48.6, SHAFT_BOTTOM, z0], [48.6, yDeckB, z1]);
    // deck-edge strip under the steel lip, inner face 2 cm proud of the wall so nothing is coplanar
    if (dirIn > 0) B.boxMM(M, impDark, [-36.6, FLOOR - 1.6, z0], [36.6, FLOOR - 0.3, z1 + 0.02]);
    else B.boxMM(M, impDark, [-36.6, FLOOR - 1.6, z0 - 0.02], [36.6, FLOOR - 0.3, z1]);
    const zf = dirIn > 0 ? z1 : z0; // wall inner face
    const proud = (d0, d1) => [Math.min(zf + dirIn * d0, zf + dirIn * d1), Math.max(zf + dirIn * d0, zf + dirIn * d1)];
    const rib = (y0, y1, x0, x1, depth = 0.7) => {
      const [p0, p1] = proud(0, depth);
      B.boxMM(M, impMid, [x0, y0, p0], [x1, y1, p1], { texel: 0.5 });
    };
    // lip beam, mid ledge, keel rib (horizontal) + heavy verticals every 6 m
    rib(FLOOR - 1.0, FLOOR - 0.6, -36.6, 36.6, 0.9);
    rib(-78.9, -78.3, -36, 36, 0.9);
    rib(-83.6, -83.0, -36, 36, 0.6);
    for (let x = -33; x <= 33; x += 6) rib(floorTop, FLOOR - 1.6, x - 0.4, x + 0.4, 0.7);
    // lit strip on the lip beam's inner face across the whole edge
    {
      const [e0, e1] = proud(0.9, 0.93);
      B.boxMM("emitWhite", 0xffffff, [-36.3, FLOOR - 0.94, e0], [36.3, FLOOR - 0.66, e1]);
    }
    // two conduit runs on the wall between the ribs
    for (const y of [-77.2, -81.2]) {
      const [p0] = proud(0.22, 0.22);
      B.tube("metal", HG.gunmetal, [-35.5, y, p0], [35.5, y, p0], 0.12, 10);
    }
    // the two lit lining rows: housed white strips between the ribs at y -76 and -82.4
    for (const y of stripRows) {
      for (let x = -30; x <= 30; x += 6) {
        const [p0] = proud(0.24, 0.24);
        housedLamp(B, "emitWhite", [x, y, p0], [0, 0, dirIn], [2.4, 0.24, 0.3], { inset: 0.04 });
      }
    }
    // housed red beacons on the ledge every 8 m + white keel lights under the ledge every 12 m
    for (let x = -32; x <= 32; x += 8) {
      const [p0] = proud(0.9, 0.9);
      redBeacon(B, [x, -78.1, p0], [0, 0, dirIn], 0.5); // standing on the ledge's outer edge
    }
    for (let x = -30; x <= 30; x += 12) {
      const [p0] = proud(0.72, 0.72);
      housedLamp(B, "emitWhite", [x, -84.2, p0], [0, 0, dirIn], [1.2, 0.16, 0.24], { inset: 0.04 });
    }
    // keel lip beyond the wall + trim
    const lz0 = dirIn > 0 ? z0 - 3.0 : z1, lz1 = dirIn > 0 ? z0 : z1 + 3.0;
    B.boxMM(M, impDark, [-52, SHAFT_BOTTOM, lz0], [52, floorTop, lz1]);
    const [t0, t1] = proud(-0.6, 0.1);
    B.boxMM("metal", HG.steel, [-36.5, floorTop, t0], [36.5, floorTop + 0.3, t1]);
  }
}

// ---------------------------------------------------------------------------
// Rails round the hole (1.02 / 0.55 / kick, dark with a light top rail and a lit strip under it) with
// two lowerable dark bars across the +-z gaps on pivot posts carrying housed red beacons.
// ---------------------------------------------------------------------------
function buildRails(ctx, B) {
  const { kit, PALETTE } = ctx;
  const off = RAIL_OFF;
  const rx = HOLE.x1 + off, rz0 = HOLE.z0 - off, rz1 = HOLE.z1 + off;
  const gap = 3.15; // half width of the bar gap at x = 0
  const end = 35.5; // rails stop just short of the emitter housings at the corners (gaps < a player width)
  for (const s of [-1, 1]) {
    railRun(B, kit, [s * rx, HOLE.z0 + 0.6], [s * rx, HOLE.z1 - 0.6], FLOOR, { tag: "aperture-rail", lit: true });
    for (const z of [rz0, rz1]) railRun(B, kit, [s * end, z], [s * gap, z], FLOOR, { tag: "aperture-rail", lit: true });
  }
  for (const z of [rz0, rz1]) {
    // bar (lowered = closed): dark box with a light top edge and a small yellow centre tag
    B.box("paintedMetal", PALETTE.impDark, 0, FLOOR + 0.98, z, gap * 2 + 0.1, 0.16, 0.14);
    B.box("metal", HG.steel, 0, FLOOR + 1.07, z, gap * 2 + 0.1, 0.03, 0.15);
    hazardBlocks(B, [-0.45, FLOOR + 0.9, z - 0.075], [0.45, FLOOR + 1.06, z + 0.075], "x", { block: 0.15 });
    for (const s of [-1, 1]) {
      const px = s * (gap + 0.18);
      B.box("paintedMetal", PALETTE.impDark, px, FLOOR + 0.71, z, 0.3, 1.42, 0.3);
      B.box("metal", HG.steel, px, FLOOR + 0.98, z, 0.36, 0.1, 0.36);
      // twin lamp head on the post top, one lens toward the hall and one toward the hole
      for (const dz of [-1, 1]) redBeacon(B, [px, FLOOR + 1.55, z + dz * 0.16], [0, 0, dz], 0.26);
    }
    kit.collider([-gap - 0.35, FLOOR, z - 0.18], [gap + 0.35, FLOOR + RAIL_H, z + 0.18], "hazard-bar");
  }
  // deck stencils at the bar gaps
  label(kit, "hgDecal", "KEEP CLEAR", [0, Y_MARK + 0.01, rz0 - 2.8], [0, 1, 0], 7, { color: HG.yellow, spin: Math.PI });
  label(kit, "hgDecal", "KEEP CLEAR", [0, Y_MARK + 0.01, rz1 + 2.8], [0, 1, 0], 7, { color: HG.yellow });
}

// ---------------------------------------------------------------------------
// Landing pads, the apron taxi lane from the aft door with hold-short bars, taxi lines, slot ticks,
// cable covers, deck stencils, threshold wear
// ---------------------------------------------------------------------------
function buildMarkings(ctx, B) {
  const { kit, PALETTE } = ctx;
  // deck paint is a worn off-white: under the flood pools a pure white stencil blooms like a lamp
  const white = PAINT_WHITE, yellow = HG.yellow;
  const ring = (x, z, r0, r1, color) => kit.add("painted", new THREE.RingGeometry(r0, r1, 72), { pos: [x, Y_MARK + 0.005, z], quat: FLAT_Q, color, uv: "scale", uvScale: [4, 1] });
  // painted stripe from SEAM_Y to Y_MARK (sits on the plates, sinks into the seams)
  const mark = (color, x0, x1, z0, z1) => B.boxMM("painted", color, [Math.min(x0, x1), FLOOR - 0.01, Math.min(z0, z1)], [Math.max(x0, x1), Y_MARK, Math.max(z0, z1)], { faces: PY });

  for (const p of PADS) {
    // thin outer ring, four corner brackets, centre box, lit number on the aft side: a fighter pad, not a helipad
    ring(p.x, p.z, p.r - 0.25, p.r, white);
    const k = p.r * 0.62, L = 2.2, w = 0.28;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const cx = p.x + sx * k, cz = p.z + sz * k;
      mark(white, cx, cx - sx * L, cz - w / 2, cz + w / 2);
      mark(white, cx - sx * w / 2, cx + sx * w / 2, cz, cz - sz * L);
    }
    for (const sx of [-1, 1]) mark(white, p.x + sx * 0.9, p.x + sx * (0.9 + w), p.z - 1.05, p.z + 1.05);
    for (const sz of [-1, 1]) mark(white, p.x - 1.05, p.x + 1.05, p.z + sz * 0.9, p.z + sz * (0.9 + w));
    label(kit, "hgSign", p.n, [p.x, Y_MARK + 0.01, p.z + p.r - 2.4], [0, 1, 0], 3.2);
    // 12 housed edge lights just outside the ring
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
      const lx = p.x + Math.cos(a) * (p.r + 0.7), lz = p.z + Math.sin(a) * (p.r + 0.7);
      housedLamp(B, "emitWhite", [lx, FLOOR + 0.12, lz], [0, 1, 0], [0.34, 0.12, 0.34], { housing: HG.gunmetal, inset: 0.05 });
    }
  }

  // taxi lanes: yellow dashed centreline, white edge lines at +-3.5 m on the long lanes
  const dashZ = (x, z0, z1, color = yellow, w = 0.15) => {
    for (let z = z0 + 1; z + 3 <= z1; z += 5) mark(color, x - w, x + w, z, z + 3);
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
  // the apron taxi lane: from the aft blast door forward to the aperture bar gap, 6 m wide with solid
  // yellow edges, a dashed white centreline, hold-short bars (double bar + ladder) before the aperture
  // rail and before the door, "HOLD SHORT" stencils, the deck identification inside the lane
  {
    const x0 = -3.0, x1 = 3.0, zNear = 168.0, zFar = 98.4;
    for (const x of [x0, x1]) mark(yellow, x - 0.12, x + 0.12, zFar, zNear);
    dashZ(0, zFar + 5, zNear - 12, white, 0.1);
    const holdShort = (z, dir) => {
      // dir: +1 = the bar faces traffic coming from +z (toward the aperture), -1 = from -z (toward the door)
      mark(yellow, x0, x1, z - 0.15, z + 0.15);
      mark(yellow, x0, x1, z - dir * 0.55 - 0.15, z - dir * 0.55 + 0.15);
      for (let x = x0 + 0.5; x < x1; x += 1.0) mark(yellow, x, x + 0.5, z + dir * 0.3, z + dir * 1.3);
      label(kit, "hgDecal", "HOLD SHORT", [0, Y_MARK + 0.01, z - dir * 2.6], [0, 1, 0], 4.6, { color: yellow, spin: dir > 0 ? 0 : Math.PI });
    };
    holdShort(101.5, 1);
    holdShort(160.5, -1);
    label(kit, "hgDecal", "FLIGHT DECK 4", [0, Y_MARK + 0.01, 152.5], [0, 1, 0], 5.6, { color: white });
  }
  // cross lanes between the pads (aft apron) and on the forward apron
  for (const z of [118, 142, -52]) {
    dashX(z, -TAXI_X, -29);
    dashX(z, -15, -4.5);
    dashX(z, 4.5, 15);
    dashX(z, 29, TAXI_X);
  }
  // apron outline: white box round the aft apron parking area with corner chevrons
  for (const s of [-1, 1]) {
    mark(white, s * 40 - 0.08, s * 40 + 0.08, 104, 156);
    mark(white, s * 12, s * 40, 155.92, 156.08);
    mark(white, s * 12, s * 40, 103.92, 104.08);
  }
  // cable covers: raised dark ramps (rubber top) from the aft wall to the pad power points and across
  // the spawn apron, with yellow end caps
  const cover = (x0, z0, x1, z1) => {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const mn = [Math.min(x0, x1) - (alongX ? 0 : 0.3), FLOOR, Math.min(z0, z1) - (alongX ? 0.3 : 0)];
    const mx = [Math.max(x0, x1) + (alongX ? 0 : 0.3), FLOOR + 0.09, Math.max(z0, z1) + (alongX ? 0.3 : 0)];
    B.boxMM("paintedMetal", PALETTE.impDark, mn, mx, { texel: 1 });
    B.boxMM("rubber", HG.rubber, [mn[0] + 0.08, FLOOR + 0.09, mn[2] + 0.08], [mx[0] - 0.08, FLOOR + 0.11, mx[2] - 0.08]);
    for (const e of [0, 1]) {
      const cx = alongX ? (e ? mx[0] - 0.3 : mn[0] + 0.3) : (mn[0] + mx[0]) / 2;
      const cz = alongX ? (mn[2] + mx[2]) / 2 : e ? mx[2] - 0.3 : mn[2] + 0.3;
      B.box("painted", HG.yellow, cx, FLOOR + 0.115, cz, alongX ? 0.5 : 0.64, 0.01, alongX ? 0.64 : 0.5, { faces: PY });
    }
  };
  for (const s of [-1, 1]) {
    cover(s * 34, 169.5, s * 34, 151);
    cover(s * 34, 151, s * 12, 151);
    cover(s * 62, 169.5, s * 62, 146);
  }
  // deck identification forward
  label(kit, "hgDecal", "DECK 4", [0, Y_MARK + 0.01, -62], [0, 1, 0], 8, { color: white });
  // threshold wear: soft dark blobs in front of the blast doors and the bay doors (the paint is worn
  // where everything rolls in and out)
  contactShadow(kit, 0, 165.5, 9, 6);
  contactShadow(kit, 0, -65.5, 9, 6);
  for (const s of [-1, 1]) {
    contactShadow(kit, s * 74, 15, 10, 18);
    contactShadow(kit, s * 74.5, 120, 9, 14);
  }
}

const SHADOW_BLACK = new THREE.Color(0x000000);
/**
 * Soft dark blob on the deck (contact darkening under props, threshold wear): the atlas blob (5:3, alpha
 * falling off to the edge) painted black over the plating. w along x, d along z; a footprint that is not
 * 5:3 gets a second, crossed blob so the union covers the prop.
 */
export function contactShadow(kit, x, z, w, d) {
  const bd = w / LABELS.SHADOW.aspect; // one blob's depth at width w
  const n = Math.max(1, Math.ceil(d / bd));
  const step = n > 1 ? (d - bd) / (n - 1) : 0;
  for (let i = 0; i < n; i++) label(kit, "hgDecal", "SHADOW", [x, Y_MARK + 0.012, z - d / 2 + bd / 2 + i * step], [0, 1, 0], w, { color: SHADOW_BLACK });
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
  // housed red beacon on top facing the hall corner
  redBeacon(B, [cx, top + 0.85, cz], [0, 1, 0], 0.3);
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
  // deck stencil + contact shadow + collider (generous AABB so the corner between the rail ends is closed)
  label(kit, "hgDecal", "TRACTOR EMITTER", [cx + sx * 0.4, Y_MARK + 0.01, cz + sz * 3.0], [0, 1, 0], 3.6, { color: HG.yellow, spin: sz > 0 ? 0 : Math.PI });
  contactShadow(kit, cx, cz, 5.2, 5.2);
  kit.collider(
    [Math.min(cx - 1.8, p[0] - sx * 0.2), FLOOR, Math.min(cz - 1.8, p[2] - sz * 0.2)],
    [Math.max(cx + 1.8, p[0] - sx * 0.2), top + 1, Math.max(cz + 1.8, p[2] - sz * 0.2)],
    "tractor-housing",
  );
}
