// d4-hangar deck: dark semi-gloss plating (4 m plates on a black seam bed, the plate sheet carrying the
// seams, rivets, tie-down rings and wear) around the floor aperture, the shaft we own down to the keel
// (y -85) with the retracted bay-door mechanism and its lit lining, the aperture lip (steel lip, sparse
// black/yellow dashes, non-slip band, lit rails, housed beacons), landing pads, the apron taxi lane from
// the aft door with hold-short bars, taxi lines, cable covers, deck stencils, contact shadows, the
// containment field over the hole and the four tractor emitters.
import * as THREE from "three";
import { Batcher, sharedTorus, PX, NX, PY, PZ, NZ } from "./batch.js";
import { FLOOR, SHAFT_BOTTOM, HOLE, HALL, PADS, TAXI_X, RACK, RAIL_H, HG, EM, TRACTOR_POINTS, RIB_Z, RIB_X, DOORS, WALL_T } from "./layout.js";
import { DECK_TILE, LABELS } from "./materials.js";
import { tube, label, railRun, housedLamp, redBeacon, hazardBlocks, wearStreak, shadowGrad, occlusionPool } from "./util.js";

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
  buildWear(ctx);
  buildField(ctx);
  for (const p of TRACTOR_POINTS) buildTractorHousing(ctx, B, p);

  B.flush();
}

// ---------------------------------------------------------------------------
// Plates: 4 m semi-gloss plates (hgDeck; the sheet draws seams, rivets and tie-down rings, the vertex tone
// sets the plate colour) with 6 cm gaps to the black bed, wider section joints on the rib lines, a darker
// plate band under each taxi lane and round the aperture, and four per-plate tone steps a third of a
// stop apart (0.5 / 0.68 / 0.92 / 1.25 of the base: neighbours with different steps differ by >= 36 % in
// linear light, ~15 % on screen, and the darkest against the lightest is a stop and a third) so a squint
// at the deck from any camera sees a patchwork of plates, and the tiled sheet never reads as one
// repeated image. The tone also picks the plate's gloss (materials.js hgDeck).
// ---------------------------------------------------------------------------
function buildPlates(ctx, B) {
  const { PALETTE } = ctx;
  const G = 4, seam = 0.06, joint = 0.16;
  // lip band rect (grown by half a seam so the plates keep a seam to the band)
  const cut = { x0: HOLE.x0 - LIP.band - seam / 2, x1: HOLE.x1 + LIP.band + seam / 2, z0: HOLE.z0 - LIP.band - seam / 2, z1: HOLE.z1 + LIP.band + seam / 2 };
  const onJoint = (v, lines) => lines.some((l) => Math.abs(l - v) < 1.01);
  // tone steps: index by a weighted table (20 % darkest, 30 % dark, 30 % light, 20 % lightest)
  const steps = (c) => [0.5, 0.68, 0.92, 1.25].map((k) => c.clone().multiplyScalar(k));
  const TABLE = [0, 0, 1, 1, 1, 2, 2, 2, 3, 3];
  // base tones: mid-grey plating (between impMid and impGrey, so the tone steps have room to read in the
  // IBL-lit stretches between the flood pools), a darker set under the taxi lanes and round the aperture
  const tones = { mid: steps(PALETTE.impMid.clone().lerp(PALETTE.impGrey, 0.45)), dark: steps(PALETTE.impDark.clone().lerp(PALETTE.impMid, 0.3)) };
  const tone = (cx, cz) => {
    const nearHole = cx > HOLE.x0 - 8 && cx < HOLE.x1 + 8 && cz > HOLE.z0 - 8 && cz < HOLE.z1 + 8;
    const lane = Math.abs(Math.abs(cx) - TAXI_X) < G;
    const set = nearHole || lane ? tones.dark : tones.mid;
    // deterministic per-plate step (integer hash of the plate cell, mixed so neighbours differ)
    let h = (Math.round(cx / G) * 73856093) ^ (Math.round(cz / G) * 19349663);
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
    return set[TABLE[h % 10]];
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
// Aperture lip, from the hole edge outward: a 0.3 m dark painted lip (its face turning 0.3 m down into
// the hole; clean paint, not the speckled bare-metal sheet - it is 3 m from the aperture camera at a
// grazing angle), a sparse black/yellow dash strip (2 m dashes, 1 m gaps, 0.4 m wide) on a clean dark
// rubber non-slip band that runs out to 1.6 m with a crisp yellow line along its outer edge (and along
// its hole-side edge in the two bar gaps, where the dashes stop), housed white edge lights in the band
// every 6 m.
// ---------------------------------------------------------------------------
function buildLip(ctx, B) {
  const s = LIP.steel, d = LIP.dash, b = LIP.band;
  const yT = FLOOR + 0.03; // lip top, a hair over the paint
  const lip = (mn, mx) => B.boxMM("paintedMetal", HG.gunmetal, mn, mx, { texel: 1 });
  // lip: top plate round the hole + inner face 0.3 m down
  lip([HOLE.x0 - s, FLOOR - 0.3, HOLE.z0 - s], [HOLE.x1 + s, yT, HOLE.z0]);
  lip([HOLE.x0 - s, FLOOR - 0.3, HOLE.z1], [HOLE.x1 + s, yT, HOLE.z1 + s]);
  lip([HOLE.x0 - s, FLOOR - 0.3, HOLE.z0], [HOLE.x0, yT, HOLE.z1]);
  lip([HOLE.x1, FLOOR - 0.3, HOLE.z0], [HOLE.x1 + s, yT, HOLE.z1]);
  // non-slip band (flush with the plates) from the lip to 1.6 m
  const nb = { texel: 1 };
  B.boxMM("rubber", HG.nonSlip, [HOLE.x0 - b, SEAM_Y, HOLE.z0 - b], [HOLE.x1 + b, FLOOR, HOLE.z0 - s], nb);
  B.boxMM("rubber", HG.nonSlip, [HOLE.x0 - b, SEAM_Y, HOLE.z1 + s], [HOLE.x1 + b, FLOOR, HOLE.z1 + b], nb);
  B.boxMM("rubber", HG.nonSlip, [HOLE.x0 - b, SEAM_Y, HOLE.z0 - s], [HOLE.x0 - s, FLOOR, HOLE.z1 + s], nb);
  B.boxMM("rubber", HG.nonSlip, [HOLE.x1 + s, SEAM_Y, HOLE.z0 - s], [HOLE.x1 + b, FLOOR, HOLE.z1 + s], nb);
  // yellow edge line (12 cm) round the band's outer edge
  const yl = 0.12;
  const line = (mn, mx) => B.boxMM("painted", HG.yellow, mn, mx, { faces: PY });
  line([HOLE.x0 - b, FLOOR - 0.01, HOLE.z0 - b], [HOLE.x1 + b, Y_MARK, HOLE.z0 - b + yl]);
  line([HOLE.x0 - b, FLOOR - 0.01, HOLE.z1 + b - yl], [HOLE.x1 + b, Y_MARK, HOLE.z1 + b]);
  line([HOLE.x0 - b, FLOOR - 0.01, HOLE.z0 - b], [HOLE.x0 - b + yl, Y_MARK, HOLE.z1 + b]);
  line([HOLE.x1 + b - yl, FLOOR - 0.01, HOLE.z0 - b], [HOLE.x1 + b, Y_MARK, HOLE.z1 + b]);
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
    // bar gap: a solid yellow line on the band's hole-side edge instead of the dashes
    const g0 = Math.min(zc + sz * s, zc + sz * (s + 0.15)), g1 = Math.max(zc + sz * s, zc + sz * (s + 0.15));
    line([-4.5, FLOOR - 0.01, g0], [4.5, Y_MARK, g1]);
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
    // lit line from across the hole; on the lining level - the bow one faces the spawn from 190 m,
    // right under the far rail, and at the bare level it was part of the hot bar there)
    [a, b] = mm(35.9, 36.5);
    B.boxMM("metal", HG.steel, [a, floorTop, zA], [b, floorTop + 0.3, zB]);
    [a, b] = mm(35.4, 36.0);
    B.boxMM(M, impMid, [a, FLOOR - 1.0, zA - 0.6], [b, FLOOR - 0.6, zB + 0.6], { texel: 0.5 });
    [a, b] = mm(35.37, 35.4);
    B.boxMM("hgEmit", EM.lining, [a, FLOOR - 0.94, zA - 0.4], [b, FLOOR - 0.66, zB + 0.4]);

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
    // lit strip on the lip beam's inner face across the whole edge (lining level, see the +-x sides)
    {
      const [e0, e1] = proud(0.9, 0.93);
      B.boxMM("hgEmit", EM.lining, [-36.3, FLOOR - 0.94, e0], [36.3, FLOOR - 0.66, e1]);
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
  // the strips and post caps sit on the vertex emitter at the rail level: the 72 m aft run faces the
  // spawn 66 m out and the glossy lane mirrors it, so at the strip level (with bare white caps) it drew
  // one hot bar at the vanishing point of the deck view, over its own reflection
  const rail = { tag: "aperture-rail", lit: true, soft: true, level: EM.rail };
  for (const s of [-1, 1]) {
    railRun(B, kit, [s * rx, HOLE.z0 + 0.6], [s * rx, HOLE.z1 - 0.6], FLOOR, rail);
    for (const z of [rz0, rz1]) railRun(B, kit, [s * end, z], [s * gap, z], FLOOR, rail);
  }
  for (const z of [rz0, rz1]) {
    // bar (lowered = closed): a dark box beam with a gunmetal top plate, its paint worn off along the
    // top front edge (a light wear line: the highlight the eye reads, without the whole top plate
    // clipping under the gap light), a steel edge highlight along the bottom front edge, a row of bolt
    // heads down both faces; a black sign plate hung under the middle of the bar carries "APERTURE -
    // KEEP CLEAR" on both faces (a legible label, not an unfinished plate), with a yellow block at
    // each end. Everything here is 1.5 - 3 m from the aperture camera.
    const L = gap * 2 + 0.1;
    B.box("paintedMetal", PALETTE.impDark, 0, FLOOR + 0.98, z, L, 0.16, 0.14, { texel: 1 });
    B.box("paintedMetal", HG.gunmetal, 0, FLOOR + 1.07, z, L, 0.03, 0.15, { texel: 1 });
    for (const dz of [-1, 1]) {
      B.box("paintedMetal", HG.white, 0, FLOOR + 1.055, z + dz * 0.072, L - 0.2, 0.012, 0.012); // worn top edge
      B.box("paintedMetal", HG.steel, 0, FLOOR + 0.905, z + dz * 0.072, L, 0.01, 0.012); // bottom edge highlight
      for (let x = -gap + 0.35; x <= gap - 0.3; x += 0.5) B.box("paintedMetal", HG.gunmetal, x, FLOOR + 0.98, z + dz * 0.08, 0.05, 0.05, 0.03);
    }
    B.box("paintedMetal", PALETTE.impBlack, 0, FLOOR + 0.72, z, 2.9, 0.38, 0.08);
    for (const s of [-1, 1]) B.box("painted", HG.yellow, s * 1.55, FLOOR + 0.72, z, 0.2, 0.38, 0.085);
    for (const dz of [-1, 1]) label(kit, "hgDecal", "APERTURE - KEEP CLEAR", [0, FLOOR + 0.72, z + dz * 0.045], [0, 0, dz], 2.7, { color: HG.white });
    for (const s of [-1, 1]) {
      const px = s * (gap + 0.18);
      // pivot post: bolted base plate, a hazard band at knee height, steel collar under the bar, steel
      // edge trims up the two hall-facing corners, bolt heads on the faces, twin red lamp head on top
      B.box("paintedMetal", PALETTE.impDark, px, FLOOR + 0.71, z, 0.3, 1.42, 0.3, { texel: 1 });
      B.box("paintedMetal", HG.gunmetal, px, FLOOR + 0.02, z, 0.46, 0.04, 0.46);
      for (const bx of [-1, 1]) for (const bz of [-1, 1]) B.box("paintedMetal", HG.steel, px + bx * 0.19, FLOOR + 0.05, z + bz * 0.19, 0.05, 0.03, 0.05);
      hazardBlocks(B, [px - 0.155, FLOOR + 0.35, z - 0.155], [px + 0.155, FLOOR + 0.62, z + 0.155], "y", { block: 0.09 });
      B.box("paintedMetal", HG.steel, px, FLOOR + 0.98, z, 0.36, 0.1, 0.36);
      for (const dz of [-1, 1]) {
        for (const dx of [-1, 1]) B.box("paintedMetal", HG.steel, px + dx * 0.15, FLOOR + 0.71, z + dz * 0.15, 0.02, 1.4, 0.02);
        for (const y of [0.15, 0.8, 1.2]) B.box("paintedMetal", HG.gunmetal, px, FLOOR + y, z + dz * 0.16, 0.06, 0.06, 0.03);
      }
      // twin lamp head on the post top, one lens toward the hall and one toward the hole
      for (const dz of [-1, 1]) redBeacon(B, [px, FLOOR + 1.55, z + dz * 0.16], [0, 0, dz], 0.26);
    }
    kit.collider([-gap - 0.35, FLOOR, z - 0.18], [gap + 0.35, FLOOR + RAIL_H, z + 0.18], "hazard-bar");
  }
  // two lamp masts behind the aft bar gap (x +-4.6, z 101, 7 m): gunmetal pole on a bolted base with a
  // hazard band, an arm toward the lane with a housed downlight head at the top - the fixtures that
  // make the pool behind the KEEP CLEAR stencil (index.js puts the gap point light between the two
  // heads; from the spawn 63 m away the pool at the vanishing point had no visible source)
  for (const s of [-1, 1]) {
    const x = s * 4.6, z = HOLE.z1 + 7, top = FLOOR + 7;
    B.box("paintedMetal", HG.gunmetal, x, FLOOR + 0.03, z, 0.5, 0.06, 0.5);
    for (const bx of [-1, 1]) for (const bz of [-1, 1]) B.box("paintedMetal", HG.steel, x + bx * 0.2, FLOOR + 0.07, z + bz * 0.2, 0.05, 0.03, 0.05);
    B.cyl("metal", HG.gunmetal, x, (FLOOR + top) / 2, z, 0.09, top - FLOOR, "y", 10);
    hazardBlocks(B, [x - 0.1, FLOOR + 0.5, z - 0.1], [x + 0.1, FLOOR + 1.1, z + 0.1], "y", { block: 0.1 });
    B.box("paintedMetal", PALETTE.impDark, x - s * 0.55, top - 0.1, z, 1.1, 0.16, 0.16, { texel: 1 });
    B.box("paintedMetal", PALETTE.impDark, x, top + 0.1, z, 0.3, 0.2, 0.3, { texel: 1 });
    housedLamp(B, "hgEmit", [x - s * 0.95, top - 0.18, z], [0, -1, 0], [0.7, 0.3, 0.5], { inset: 0.05, lampColor: EM.lens });
    kit.collider([x - 0.3, FLOOR, z - 0.3], [x + 0.3, FLOOR + 2.2, z + 0.3], "lamp-mast");
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
  // the forward apron lane: from the bow blast door to the forward aperture bar, the same 6 m lane, but
  // its edge lines are embedded amber edge lighting (a lit lane edge on the vertex emitter, flush with
  // the paint) with housed edge lamps every 4 m beside them: from the balcony and the spawn the apron
  // beyond the aperture is 200 m out and IBL-only, and the two lit lines converging on the bow door
  // (with the lamp dots) are what reads there - the far lane, not black
  {
    const x0 = -3.0, x1 = 3.0, zDoor = -66.0, zBar = -36.0;
    for (const x of [x0, x1]) B.boxMM("hgEmit", EM.laneEdge, [x - 0.14, FLOOR - 0.01, zDoor], [x + 0.14, Y_MARK, zBar], { faces: PY });
    dashZ(0, zDoor + 3, zBar - 2, white, 0.1);
    for (let z = zDoor + 2; z <= zBar - 2; z += 4) {
      for (const x of [x0 - 0.45, x1 + 0.45]) {
        housedLamp(B, "hgEmit", [x, FLOOR + 0.14, z], [0, 1, 0], [0.36, 0.14, 0.36], { housing: HG.gunmetal, inset: 0.05, lampColor: EM.channel });
        // aft-facing lens (toward the balcony and spawn cameras): on the bright emitter, so the dot
        // still blooms through at 200 m
        housedLamp(B, "emitWhite", [x, FLOOR + 0.07, z + 0.19], [0, 0, 1], [0.3, 0.02, 0.1], { housing: HG.gunmetal, inset: 0.02 });
      }
    }
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
  wearBlob(kit, 0, 165.5, 9, 6);
  wearBlob(kit, 0, -65.5, 9, 6);
  for (const s of [-1, 1]) {
    wearBlob(kit, s * 74, 15, 10, 18);
    wearBlob(kit, s * 74.5, 120, 9, 14);
  }
  // steel threshold plate across every bay door (0.8 m into the hall from the jambs, 2 cm proud: the
  // plate every load rolls over), with the two tug-track lines worn dark across it - from the bay-door
  // camera the light plate at the door's foot is what the tracks run up to
  for (const d of DOORS) {
    if (d.kind !== "bay") continue;
    const s = Math.sign(d.dir[0]), xi = s * (HALL.x1 - WALL_T - 0.13), xo = xi - s * 0.8;
    const hw = d.w / 2 + 0.6;
    B.boxMM("metal", HG.steel, [Math.min(xi, xo), FLOOR, d.pos[2] - hw], [Math.max(xi, xo), FLOOR + 0.02, d.pos[2] + hw], { faces: PY | (s > 0 ? NX : PX) | PZ | NZ });
    for (const o of [-1.4, 1.4]) B.boxMM("paintedMetal", HG.gunmetal, [Math.min(xi, xo), FLOOR + 0.02, d.pos[2] + o - 0.45], [Math.max(xi, xo), FLOOR + 0.025, d.pos[2] + o + 0.45], { faces: PY });
  }
}

// ---------------------------------------------------------------------------
// Directional wear and baked shadows on the deck (atlas alpha shapes painted black): tyre tracks along
// the apron lane (strongest at the aperture bar and at the blast door) and both long taxi lanes
// (strongest where craft turn into the bays), scuff arcs and skids on every landing pad, drag marks
// out of every door, a soft band under the rack tiers and along the base of every wall. Everything
// worn is duller: the decals are rough and dark, and the plate sheet's grime is rough too.
// ---------------------------------------------------------------------------
const UP = [0, 1, 0];
function buildWear(ctx) {
  const { kit } = ctx;
  const y = Y_MARK + 0.011;
  const track = (x, z, dz, len, w = 0.9) => wearStreak(kit, [x, y, z], UP, [0, 0, dz], len, w);
  // apron lane (x 0, z 98 .. 168): two tyre tracks either side of the centreline, each in two runs
  for (const sx of [-1, 1]) {
    const x = sx * 1.15;
    track(x, 100.5, 1, 34, 1.0); // from the hold-short bar aft, fading
    track(x, 165.5, -1, 32, 1.0); // from the blast door forward, fading
    track(x + sx * 0.35, 102, 1, 22, 0.6); // a second, offset set (not every tug tracks the same line)
  }
  // long taxi lanes (x +-52): tracks at +-1.2 m, runs meeting at the bay spurs (z 15 and z 120)
  for (const s of [-1, 1]) for (const sx of [-1, 1]) {
    const x = s * TAXI_X + sx * 1.2;
    track(x, 14, -1, 44, 0.9);
    track(x, 16, 1, 40, 0.9);
    track(x, 119, -1, 40, 0.9);
    track(x, 121, 1, 26, 0.9);
    track(x + sx * 0.4, 60, -1, 30, 0.5);
  }
  // landing pads: scuff arcs where craft set down (three per pad, turned) and the approach skids - a
  // gear pair (3.2 m apart) of touchdown skids 9 m long, strongest on the approach side of the pad
  // (craft come in from the blast door of their apron: the aft pads from +z, the forward pads from -z)
  // and trailing across the centre, each skid doubled with an offset second track so the pair reads
  // as two dark bands with a direction at 640 x 360, not as a smudge
  PADS.forEach((p, i) => {
    for (let k = 0; k < 3; k++) {
      const a = i * 1.7 + k * 2.1;
      const r = 5.2 + ((i + k) % 3) * 0.9;
      label(kit, "hgDecal", "ARC", [p.x + Math.cos(a) * 0.6, y, p.z + Math.sin(a) * 0.6], UP, 2 * r, { color: HG.shadow, spin: a });
    }
    const dir = p.z > 32 ? 1 : -1; // approach side
    const yaw = 0.05 * ((i % 3) - 1);
    for (const k of [-1, 1]) {
      const x = p.x + k * 1.6 + 0.3 * ((i + 1) % 2);
      wearStreak(kit, [x, y, p.z + dir * 4.8], UP, [yaw, 0, -dir], 9.0, 0.9);
      wearStreak(kit, [x + 0.3, y, p.z + dir * 3.6], UP, [yaw, 0, -dir], 7.0, 0.6);
    }
  });
  // drag marks out of every door: from the threshold into the hall, strongest at the door. Bay doors
  // get the tug track pair on the door axis (+-1.4 m, 18 m long, each doubled) that everything rolling
  // through leaves - two dark bands converging on the threshold from the bay-door camera 20 m out -
  // plus a wider, fainter pair where the loads trail
  for (const d of DOORS) {
    if (d.kind === "hatch") continue;
    const [px, , pz] = d.pos;
    const n = [-d.dir[0], 0, -d.dir[2]]; // into the hall
    const across = d.dir[0] !== 0 ? [0, 0, 1] : [1, 0, 0];
    const at = (o, back) => [px + n[0] * back + across[0] * o, y, pz + n[2] * back + across[2] * o];
    if (d.kind === "blast") {
      for (const o of [-1.3, 1.3]) wearStreak(kit, at(o, 0.9), UP, n, 12, 1.0);
      continue;
    }
    for (const o of [-1.4, 1.4]) {
      wearStreak(kit, at(o, 1.0), UP, n, 18, 1.1);
      wearStreak(kit, at(o + 0.3, 1.0), UP, n, 14, 0.7);
    }
    for (const o of [-d.w * 0.32, d.w * 0.3]) wearStreak(kit, at(o, 1.0), UP, n, 9, 1.2);
  }
  // baked shadow under the rack tiers: a 3.4 m band along each side wall, dark at the wall
  for (const s of [-1, 1]) {
    const wall = s * (HALL.x1 - WALL_T - 0.12);
    shadowGrad(kit, [wall - s * 1.7, y, (RACK.zoneZ0 + RACK.zoneZ1) / 2], UP, [-s, 0, 0], 3.4, RACK.zoneZ1 - RACK.zoneZ0);
  }
  // wall base: a 2.5 m occlusion band along every wall (walls.js lays the covered cable trench over its
  // first 1.2 m, so the visible part runs out from the trench's edge angle), broken at the door
  // thresholds (their hazard aprons stay clean) and at the rack-tier band
  const base = (wall, spans) => {
    for (const [a, b] of spans) {
      if (b - a < 1) continue;
      const c = (a + b) / 2, L = b - a;
      if (wall.plane === "x") shadowGrad(kit, [wall.c + wall.inward * 1.25, y, c], UP, [wall.inward, 0, 0], 2.5, L);
      else shadowGrad(kit, [c, y, wall.c + wall.inward * 1.25], UP, [0, 0, wall.inward], 2.5, L);
    }
  };
  const inX = HALL.x1 - WALL_T - 0.12, inZ0 = HALL.z0 + WALL_T + 0.12, inZ1 = HALL.z1 - WALL_T - 0.12;
  const cutSpans = (a, b, cuts) => {
    let spans = [[a, b]];
    for (const [c0, c1] of cuts) {
      const next = [];
      for (const [p, q] of spans) {
        if (c1 <= p || c0 >= q) next.push([p, q]);
        else {
          if (c0 > p) next.push([p, c0]);
          if (c1 < q) next.push([c1, q]);
        }
      }
      spans = next;
    }
    return spans;
  };
  for (const s of [-1, 1]) {
    const cuts = DOORS.filter((d) => Math.sign(d.dir[0]) === s).map((d) => [d.pos[2] - d.w / 2 - 2.5, d.pos[2] + d.w / 2 + 2.5]);
    cuts.push([RACK.zoneZ0, RACK.zoneZ1]);
    base({ plane: "x", c: s * inX, inward: -s }, cutSpans(inZ0, inZ1, cuts));
  }
  for (const [zc, inward] of [[inZ0, 1], [inZ1, -1]]) {
    const cuts = DOORS.filter((d) => d.dir[2] === -inward && d.kind === "blast").map((d) => [d.pos[0] - 6.5, d.pos[0] + 6.5]);
    base({ plane: "z", c: zc, inward }, cutSpans(-inX, inX, cuts));
  }
}

/**
 * Contact shadow under a prop, vehicle, column foot or rack leg: near-black over the w x d footprint
 * (along x / z) and a 10 cm contact margin, then `ramp` metres of falloff to nothing on every side
 * (util.occlusionPool: composed from atlas cells so the falloff is 0.3 .. 0.9 m whatever the size).
 */
export function contactShadow(kit, x, z, w, d, ramp = 0.5) {
  occlusionPool(kit, [x, Y_MARK + 0.012, z], w, d, ramp);
}

/**
 * Soft dark blob on the deck (threshold wear where everything rolls in and out of a door): the atlas
 * ellipse (alpha falling off to the edge) painted black over the plating, grown 0.5 m beyond w x d;
 * a footprint that is not the blob's aspect gets a second, crossed blob so the union covers it.
 */
export function wearBlob(kit, x, z, w, d, grow = 0.5) {
  w += 2 * grow;
  d += 2 * grow;
  const bd = w / LABELS.SHADOW.aspect; // one blob's depth at width w
  const n = Math.max(1, Math.ceil(d / bd));
  const step = n > 1 ? (d - bd) / (n - 1) : 0;
  for (let i = 0; i < n; i++) label(kit, "hgDecal", "SHADOW", [x, Y_MARK + 0.012, z - d / 2 + bd / 2 + i * step], [0, 1, 0], w, { color: HG.shadow });
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
  const coil = sharedTorus(1.62, 0.1, 4, 20);
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
  for (const f of [0.3, 0.5, 0.7]) kit.add("metal", new THREE.TorusGeometry(0.72, 0.11, 5, 16), { pos: along(len * f), quat: q, color: HG.steel, uv: "scale", uvScale: [4, 0.5] });
  kit.add("emitBlue", new THREE.TorusGeometry(0.6, 0.06, 4, 16), { pos: along(len - 0.35), quat: q, uv: "scale", uvScale: [4, 0.5] });
  // cut plate where the barrel passes through the deck lip
  B.box("paintedMetal", PALETTE.impBlack, p[0] + sx * 0.9, Y_MARK + 0.015, p[2] + sz * 0.9, 2.4, 0.03, 2.4);
  // deck stencil + contact shadow + collider (generous AABB so the corner between the rail ends is closed)
  label(kit, "hgDecal", "TRACTOR EMITTER", [cx + sx * 0.4, Y_MARK + 0.01, cz + sz * 3.0], [0, 1, 0], 3.6, { color: HG.yellow, spin: sz > 0 ? 0 : Math.PI });
  contactShadow(kit, cx, cz, 3.3, 3.3, 0.9);
  kit.collider(
    [Math.min(cx - 1.8, p[0] - sx * 0.2), FLOOR, Math.min(cz - 1.8, p[2] - sz * 0.2)],
    [Math.max(cx + 1.8, p[0] - sx * 0.2), top + 1, Math.max(cz + 1.8, p[2] - sz * 0.2)],
    "tractor-housing",
  );
}
