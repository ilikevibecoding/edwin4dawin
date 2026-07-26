// Ceiling finish pass (Fable 2): acoustic T-bar grids with tile-variation storytelling, recessed
// emissive troffers that MATCH the lightplan fill positions, suspended strips/highbays under the
// exposed structural deck, painted beams, duct and conduit runs, pendants in warm pockets.
import { FLOORS, ROOMS, VOIDS } from './layout.js';
import { fixturePlan } from './lightplan.js';
import { subtractRect } from './builder.js';
import { cosmeticRng } from '../core/rng.js';

const TILE_VARIATION_ROOMS = new Set(['records', 'store', 'copy', 'it']); // service-ish areas
const DECK_DETAIL = new Set(['garage', 'loading', 'mech', 'server', 'sc']);

export function buildCeilings(map, kit) {
  for (const room of ROOMS) {
    const f = FLOORS[room.floor];
    const ceilY = f.y + f.ceil;
    if (room.ceilMat === 'acoustic') {
      for (const rc of room.rects) {
        let rects = [rc];
        if (room.floor === 0) for (const v of VOIDS) rects = rects.flatMap((r) => subtractRect(r, v.rect));
        for (const r of rects) acousticGrid(kit, r, ceilY, TILE_VARIATION_ROOMS.has(room.id));
      }
    }
    if (room.ceilMat === 'deck' && DECK_DETAIL.has(room.id)) deckWork(kit, room, ceilY);
  }
  buildFixtures(kit);
  buildPendants(kit);
}

// --- acoustic T-bar grid -------------------------------------------------------
function acousticGrid(kit, [x0, z0, x1, z1], ceilY, variation) {
  const y = ceilY - 0.014;
  const B = 0.032, H = 0.028;
  // main runners every 1.2 m, cross tees every 0.6 m, aligned to the world grid so adjoining
  // rooms read as one continuous system
  for (let z = Math.ceil((z0 + 0.05) / 1.2) * 1.2; z < z1 - 0.05; z += 1.2) {
    kit.box('gridTee', x1 - x0 - 0.04, H, B, (x0 + x1) / 2, y, z, { cast: false });
  }
  for (let x = Math.ceil((x0 + 0.05) / 0.6) * 0.6; x < x1 - 0.05; x += 0.6) {
    kit.box('gridTee', B, H, z1 - z0 - 0.04, x, y, (z0 + z1) / 2, { cast: false });
  }
  // perimeter angle
  for (const [cx, cz, w, d] of [
    [(x0 + x1) / 2, z0 + 0.02, x1 - x0, 0.04], [(x0 + x1) / 2, z1 - 0.02, x1 - x0, 0.04],
    [x0 + 0.02, (z0 + z1) / 2, 0.04, z1 - z0], [x1 - 0.02, (z0 + z1) / 2, 0.04, z1 - z0],
  ]) kit.box('gridTee', w, H, d, cx, y, cz, { cast: false });

  if (variation) {
    // a few stained / missing tiles (cosmetic randomness only)
    const cells = Math.max(2, Math.floor((x1 - x0) * (z1 - z0) / 26));
    for (let i = 0; i < cells; i++) {
      const gx = Math.floor(cosmeticRng.range(x0 / 0.6 + 1, x1 / 0.6 - 1)) * 0.6 + 0.3;
      const gz = Math.floor(cosmeticRng.range(z0 / 1.2 + 1, z1 / 1.2 - 1)) * 1.2 + 0.6;
      if (gx < x0 + 0.35 || gx > x1 - 0.35 || gz < z0 + 0.65 || gz > z1 - 0.65) continue;
      const missing = cosmeticRng.chance(0.35);
      kit.box(missing ? 'tileMissing' : 'tileStained', 0.56, 0.008, 1.16, gx, ceilY - 0.008, gz, { cast: false, receive: !missing });
    }
  }
}

// --- fixtures matched to lightplan ------------------------------------------------
function buildFixtures(kit) {
  for (const fx of fixturePlan()) {
    if (fx.overVoid) continue;
    const room = fx.room;
    if (room.ceilMat === 'none' || room.ceilMat === 'sky') continue; // stair shafts: wall packs instead
    const warm = fx.zone.warm;
    const cold = ['garage', 'service', 'server'].includes(room.light);
    const lens = warm ? 'fixtureLensWarm' : cold ? 'fixtureLensCold' : 'fixtureLens';
    const ceilY = fx.ceilY;
    if (room.ceilMat === 'acoustic') {
      // recessed 0.6×1.2 troffer, long side along the room's long axis
      const rc = room.rects[0];
      const alongX = rc[2] - rc[0] >= rc[3] - rc[1];
      const [lw, ld] = alongX ? [1.24, 0.64] : [0.64, 1.24];
      kit.box('fixtureHousing', lw, 0.03, ld, fx.x, ceilY - 0.015, fx.z, { cast: false });
      kit.box(lens, alongX ? 1.14 : 0.54, 0.024, alongX ? 0.54 : 1.14, fx.x, ceilY - 0.034, fx.z, { cast: false, receive: false });
    } else if (room.light === 'garage') {
      // round highbay on a drop rod
      kit.cyl('conduitMetal', 0.015, 0.015, 0.32, fx.x, ceilY - 0.32, fx.z, { cast: false, seg: 6 });
      kit.cyl('fixtureHousing', 0.1, 0.26, 0.16, fx.x, ceilY - 0.46, fx.z, { cast: false, seg: 12 });
      kit.cyl(lens, 0.2, 0.2, 0.025, fx.x, ceilY - 0.48, fx.z, { cast: false, receive: false, seg: 12 });
    } else {
      // suspended linear strip under the deck
      const rc = room.rects[0];
      const alongX = rc[2] - rc[0] >= rc[3] - rc[1];
      const [lw, ld] = alongX ? [1.5, 0.16] : [0.16, 1.5];
      for (const off of [-0.55, 0.55]) {
        kit.cyl('conduitMetal', 0.01, 0.01, 0.42, fx.x + (alongX ? off : 0), ceilY - 0.42, fx.z + (alongX ? 0 : off), { cast: false, seg: 5 });
      }
      kit.box('fixtureHousing', lw, 0.08, ld, fx.x, ceilY - 0.46, fx.z, { cast: false });
      kit.box(lens, alongX ? 1.42 : 0.1, 0.02, alongX ? 0.1 : 1.42, fx.x, ceilY - 0.505, fx.z, { cast: false, receive: false });
    }
  }
}

// --- exposed deck: painted beams, ducts, conduit -----------------------------------
function deckWork(kit, room, ceilY) {
  const [x0, z0, x1, z1] = room.rects[0];
  const w = x1 - x0, d = z1 - z0;
  const alongX = w >= d; // beams span the short direction, spaced along the long one
  const beamMat = 'beamPaint';
  if (alongX) {
    for (let x = x0 + 1.8; x < x1 - 0.8; x += 3.2) {
      kit.box(beamMat, 0.16, 0.3, d - 0.24, x, ceilY - 0.15, (z0 + z1) / 2, { cast: false });
    }
  } else {
    for (let z = z0 + 1.8; z < z1 - 0.8; z += 3.2) {
      kit.box(beamMat, w - 0.24, 0.3, 0.16, (x0 + x1) / 2, ceilY - 0.15, z, { cast: false });
    }
  }
  // main duct + return run along the long axis
  const laneA = alongX ? z0 + d * 0.3 : x0 + w * 0.3;
  const laneB = alongX ? z0 + d * 0.72 : x0 + w * 0.72;
  const main = { w: 0.55, h: 0.36 };
  const ret = { w: 0.34, h: 0.24 };
  const duct = (lane, s, y) => {
    const cx = alongX ? (x0 + x1) / 2 : lane;
    const cz = alongX ? lane : (z0 + z1) / 2;
    const lx = alongX ? w - 0.5 : s.w;
    const lz = alongX ? s.w : d - 0.5;
    kit.box('ductMetal', lx, s.h, lz, cx, y, cz, { cast: false });
    kit.collide(cx - lx / 2, y - s.h / 2, cz - lz / 2, cx + lx / 2, y + s.h / 2, cz + lz / 2,
      { tag: 'duct', material: 'metal', blockSight: false });
  };
  duct(laneA, main, ceilY - 0.42);
  if (room.id !== 'sc') duct(laneB, ret, ceilY - 0.34);
  // twin conduit runs hugging one wall
  const cLane = alongX ? z1 - 0.3 : x1 - 0.3;
  for (const off of [0, 0.12]) {
    const cx = alongX ? (x0 + x1) / 2 : cLane - off;
    const cz = alongX ? cLane - off : (z0 + z1) / 2;
    kit.box('conduitMetal', alongX ? w - 0.3 : 0.045, 0.045, alongX ? 0.045 : d - 0.3, cx, ceilY - 0.09, cz, { cast: false });
  }
}

// --- pendants in warm pockets ---------------------------------------------------
function buildPendants(kit) {
  const spots = [
    { x: 2.6, z: 16.8, floor: 0 }, { x: 2.6, z: 19.4, floor: 0 }, { x: 2.6, z: 22.0, floor: 0 }, // break room
    { x: 3.0, z: 26.5, floor: 1 }, // quiet room
  ];
  for (const s of spots) {
    const f = FLOORS[s.floor];
    const ceilY = f.y + f.ceil;
    const shadeY = f.y + 2.12;
    kit.cyl('conduitMetal', 0.008, 0.008, ceilY - shadeY - 0.16, s.x, shadeY + 0.16, s.z, { cast: false, seg: 5 });
    kit.cyl('pendantShade', 0.05, 0.19, 0.17, s.x, shadeY, s.z, { seg: 14 });
    kit.cyl('fixtureLensWarm', 0.13, 0.13, 0.02, s.x, shadeY - 0.012, s.z, { cast: false, receive: false, seg: 12 });
  }
}
