// Western building generators (voxel builds with interiors, signs, porches, balconies).
import { B } from '../blocks.js';

const PLANKS = B.OAK_PLANKS, DARK = B.SPRUCE_PLANKS, WHITE = B.WHITE_PLANKS;

// Registers a building record for NPC use. spots are interior standing places.
function record(fr, name, kind, F, w, d) {
  const rec = { name, kind, floorY: F + 1, spots: [], door: null, inside: null, bounds: null, beds: [], work: [] };
  const [ax, az] = fr.world(0, 0), [bx, bz] = fr.world(w - 1, d - 1);
  rec.bounds = { x0: Math.min(ax, bx), x1: Math.max(ax, bx), z0: Math.min(az, bz), z1: Math.max(az, bz) };
  fr.s.buildings.push(rec);
  return rec;
}
function addSpot(fr, rec, u, v, y, list = 'spots') { const [x, z] = fr.world(u, v); rec[list].push({ x, y, z }); }
function setDoor(fr, rec, u, v, y) {
  const [ox, oz] = fr.world(u, v - 1);
  const [ix, iz] = fr.world(u, v + 1);
  rec.door = { x: ox, y, z: oz };
  rec.inside = { x: ix, y, z: iz };
}

// Staircase rising 5 blocks (walking level F+1 -> F+6, the second floor) along +v from (u, vStart)
// using alternating slabs / full blocks (10 half-steps).
function stairs(fr, u, F, vStart, slabBottom, slabTop, full) {
  for (let k = 0; k < 10; k++) {
    const v = vStart + k;
    const level = F + 1 + Math.floor(k / 2); // cell y of the step
    for (let y = F + 1; y < level; y++) fr.set(u, y, v, full);
    fr.set(u, level, v, k % 2 === 0 ? slabBottom : full);
    // headroom: open the second floor above the middle steps
    if (k >= 2 && k <= 7) { fr.set(u, F + 5, v, B.AIR); fr.set(u, F + 6, v, B.AIR); }
    else if (k > 7) fr.set(u, F + 6, v, B.AIR);
  }
}

// Core western shop/building shell.
// opts: {w,d,floors,wall,trim,floorBlock,roof:'flat'|'gable',falseFront,sign,doorU,balcony,awning,windows,foundation}
export function shell(fr, F, o) {
  const w = o.w, d = o.d, floors = o.floors || 1;
  const wall = o.wall ?? PLANKS, trim = o.trim ?? B.STRIPPED_OAK, floorBlock = o.floorBlock ?? PLANKS;
  const roofY = F + 5 * floors; // block y of the roof / top ceiling
  // clear volume above ground and lay foundation + floor
  fr.fill(0, F, 0, w - 1, roofY + 6, d - 1, B.AIR);
  fr.fill(0, F - 1, 0, w - 1, F - 1, d - 1, o.foundation ?? B.COBBLESTONE);
  fr.fill(0, F, 0, w - 1, F, d - 1, floorBlock);
  for (let f = 0; f < floors; f++) {
    const y0 = F + 1 + f * 5, y1 = y0 + 3;
    fr.walls(0, y0, 0, w - 1, y1, d - 1, wall);
    // corner trim
    for (const [u, v] of [[0, 0], [w - 1, 0], [0, d - 1], [w - 1, d - 1]]) fr.fill(u, y0, v, u, y1, v, trim);
    if (f < floors - 1) { fr.fill(0, y1 + 1, 0, w - 1, y1 + 1, d - 1, floorBlock); fr.walls(0, y1 + 1, 0, w - 1, y1 + 1, d - 1, trim); }
    // windows: facade
    if (o.windows !== false) {
      const wins = o.windowsU || [2, w - 3];
      for (const u of wins) if (u > 0 && u < w - 1 && u !== (o.doorU ?? Math.floor(w / 2))) fr.window(u, y0 + 1, 0, 2);
      if (f > 0 || o.frontOnly !== true) {
        // sides
        for (let v = 3; v < d - 2; v += 4) { fr.window(0, y0 + 1, v, 2); fr.window(w - 1, y0 + 1, v, 2); }
        // back
        for (let u = 2; u < w - 2; u += 5) if (f > 0 || u !== (o.backDoorU ?? -99)) fr.window(u, y0 + 1, d - 1, 2);
      }
    }
  }
  // roof
  if (o.roof === 'gable') fr.gableRoof(0, w - 1, 0, d - 1, roofY, o.roofBlock ?? DARK, o.roofSlab ?? B.SPRUCE_SLAB);
  else fr.flatRoof(0, w - 1, 0, d - 1, roofY, o.roofBlock ?? DARK, o.roofSlab ?? B.SPRUCE_SLAB);
  // false front
  if (o.falseFront !== false && o.roof !== 'gable') fr.falseFront(0, w - 1, roofY, o.falseFrontH ?? 2, 0, wall, o.roofSlab ?? B.SPRUCE_SLAB);
  else if (o.falseFront !== false && o.roof === 'gable') { fr.fill(0, roofY + 1, 0, w - 1, roofY + 2, 0, wall); for (let u = 0; u <= w - 1; u++) fr.set(u, roofY + 3, 0, B.SPRUCE_SLAB); }
  // door
  const doorU = o.doorU ?? Math.floor(w / 2);
  fr.door(doorU, F + 1, 0, o.doorId === undefined ? B.OAK_DOOR : o.doorId);
  if (o.doubleDoor) fr.door(doorU + 1, F + 1, 0, o.doorId === undefined ? B.OAK_DOOR : o.doorId);
  if (o.backDoorU !== undefined) { fr.door(o.backDoorU, F + 1, d - 1, B.OAK_DOOR); fr.set(o.backDoorU, F, d, B.OAK_SLAB); }
  // awning / balcony over the boardwalk (v=-1,-2)
  if (floors >= 2 && o.balcony !== false) {
    fr.fill(0, F + 5, -1, w - 1, F + 5, -2, floorBlock);
    for (let u = 0; u <= w - 1; u++) fr.set(u, F + 6, -2, B.OAK_FENCE);
    fr.set(0, F + 6, -1, B.OAK_FENCE); fr.set(w - 1, F + 6, -1, B.OAK_FENCE);
    for (const u of [0, w - 1]) { fr.fill(u, F + 1, -2, u, F + 4, -2, trim); fr.fill(u, F + 7, -2, u, F + 9, -2, trim); }
    for (let u = 4; u < w - 1; u += 4) { fr.fill(u, F + 1, -2, u, F + 4, -2, B.SPRUCE_FENCE); }
    fr.fill(0, F + 10, -1, w - 1, F + 10, -2, B.SPRUCE_SLAB);
    // balcony door
    fr.door(doorU, F + 6, 0, B.OAK_DOOR);
    fr.lantern(1, F + 4, -1); fr.lantern(w - 2, F + 4, -1);
  } else if (o.awning !== false) {
    fr.awning(0, w - 1, F + 5, 2, o.roofSlab ?? B.SPRUCE_SLAB, B.SPRUCE_FENCE, F + 1);
    fr.lantern(1, F + 4, -1); fr.lantern(w - 2, F + 4, -1);
  }
  // sign above the door / on false front
  if (o.sign) {
    const y = floors >= 2 ? roofY + 1 : roofY + 1;
    fr.sign(doorU, y, 0, o.sign);
  }
  const rec = record(fr, o.name || o.sign || 'building', o.kind || 'shop', F, w, d);
  setDoor(fr, rec, doorU, 0, F + 1);
  return rec;
}

// ------------------------------------------------------------------------------------------------
export function saloon(fr, F) {
  const w = 27, d = 16;
  const rec = shell(fr, F, { w, d, floors: 2, wall: PLANKS, trim: B.SPRUCE_LOG, roof: 'flat', sign: 'SALOON', doorU: 13, doorId: B.SALOON_DOOR, doubleDoor: false, name: 'Saloon', kind: 'saloon', windowsU: [3, 6, 9, 17, 20, 23], backDoorU: 4 });
  // extra: big double saloon door opening
  fr.door(13, F + 1, 0, B.SALOON_DOOR);
  // bar along the back: counter (d-4), bartender walkway (d-3), bottle shelves against the intact back wall (d-2)
  fr.fill(8, F + 1, d - 4, 22, F + 1, d - 4, DARK);
  fr.fill(8, F + 2, d - 4, 22, F + 2, d - 4, B.SPRUCE_SLAB);
  fr.fill(8, F + 1, d - 2, 22, F + 3, d - 2, B.SHELF);
  fr.fill(9, F + 4, d - 2, 21, F + 4, d - 2, DARK);
  for (let u = 9; u <= 21; u += 3) fr.lantern(u, F + 4, d - 5);
  // bartender spots behind the bar
  addSpot(fr, rec, 12, d - 3, F + 1, 'work'); addSpot(fr, rec, 18, d - 3, F + 1, 'work');
  // bar stools/spots in front of bar
  for (let u = 8; u <= 22; u += 2) addSpot(fr, rec, u, d - 5, F + 1);
  // tables with chairs
  for (const [u, v] of [[4, 4], [4, 9], [9, 6], [17, 6], [22, 4], [22, 9], [9, 9], [17, 9]]) {
    fr.set(u, F + 1, v, B.TABLE);
    fr.set(u - 1, F + 1, v, B.SPRUCE_SLAB); fr.set(u + 1, F + 1, v, B.SPRUCE_SLAB);
    addSpot(fr, rec, u - 1, v, F + 1); addSpot(fr, rec, u + 1, v, F + 1);
    addSpot(fr, rec, u, v - 1, F + 1);
  }
  // piano + stage corner
  fr.set(2, F + 1, d - 4, B.PIANO); fr.set(1, F + 1, d - 4, B.SPRUCE_SLAB);
  addSpot(fr, rec, 1, d - 5, F + 1, 'work');
  { const [px, pz] = fr.world(2, d - 4); rec.piano = { x: px, z: pz }; }
  fr.fill(1, F + 1, d - 8, 4, F + 1, d - 6, B.SPRUCE_SLAB); // small stage
  // chandelier lanterns
  for (const [u, v] of [[7, 5], [13, 5], [19, 5], [7, 11], [19, 11]]) fr.lantern(u, F + 4, v);
  // stairs on the right side going back
  stairs(fr, w - 2, F, 2, B.OAK_SLAB, B.OAK_SLAB_TOP, PLANKS);
  fr.fill(w - 3, F + 1, 2, w - 3, F + 3, 9, B.OAK_FENCE); // railing
  // upstairs: rooms along the back
  const F2 = F + 5;
  fr.fill(1, F2 + 1, 6, w - 3, F2 + 3, 6, PLANKS); // corridor wall (leaves the stairwell column open)
  for (let u = 1; u <= w - 2; u++) if (u % 6 === 3) fr.door(u, F2 + 1, 6, B.OAK_DOOR);
  for (let u = 6; u < w - 2; u += 6) fr.fill(u, F2 + 1, 7, u, F2 + 3, d - 2, PLANKS);
  for (let u = 1; u < w - 2; u += 6) {
    fr.set(u + 1, F2 + 1, d - 3, B.BED_FOOT); fr.set(u + 1, F2 + 1, d - 2, B.BED_HEAD);
    fr.set(u + 3, F2 + 1, d - 2, B.CHEST); fr.lantern(u + 2, F2 + 4, d - 4);
    addSpot(fr, rec, u + 3, d - 4, F2 + 1, 'beds');
  }
  for (let u = 3; u < w - 3; u += 5) fr.lantern(u, F2 + 4, 3);
  for (let u = 5; u < w - 4; u += 6) addSpot(fr, rec, u, 3, F2 + 1);
  // hanging lanterns front, extra sign
  fr.sign(6, F + 11, 0, 'ROOMS');
  fr.sign(20, F + 11, 0, 'WHISKEY');
  rec.barSpots = rec.spots.slice(0, 8);
  return rec;
}

export function sheriff(fr, F) {
  const w = 16, d = 12;
  const rec = shell(fr, F, { w, d, floors: 1, wall: B.STONE_BRICKS, trim: B.COBBLESTONE, floorBlock: B.SMOOTH_STONE, roof: 'flat', roofBlock: B.STONE_BRICKS, roofSlab: B.STONE_BRICK_SLAB, sign: "SHERIFF", doorU: 4, name: "Sheriff's Office", kind: 'sheriff', windowsU: [8, 12], frontOnly: true, foundation: B.STONE_BRICKS });
  // office: desk, chair, bookshelf, gun rack
  fr.set(3, F + 1, 4, B.TABLE); fr.set(4, F + 1, 4, B.TABLE); fr.set(3, F + 1, 5, B.SPRUCE_SLAB);
  fr.fill(1, F + 1, d - 2, 3, F + 2, d - 2, B.BOOKSHELF);
  fr.fill(1, F + 1, 1, 1, F + 2, 2, B.SHELF);
  fr.set(w - 8, F + 1, 1, B.CHEST);
  addSpot(fr, rec, 3, 5, F + 1, 'work'); // sheriff at desk
  addSpot(fr, rec, 6, 2, F + 1, 'work'); addSpot(fr, rec, 5, 8, F + 1, 'work'); // deputies' posts
  addSpot(fr, rec, 5, 3, F + 1); addSpot(fr, rec, 2, 8, F + 1); addSpot(fr, rec, 6, 8, F + 1);
  // jail: two cells at the right side behind a wall of iron bars, cell doors left open
  fr.fill(8, F + 1, 1, 8, F + 3, d - 2, B.IRON_BARS);
  fr.fill(8, F + 1, 6, w - 2, F + 3, 6, B.STONE_BRICKS);
  fr.set(8, F + 1, 3, B.OAK_DOOR); fr.set(8, F + 2, 3, B.OAK_DOOR);
  fr.set(8, F + 1, 9, B.OAK_DOOR); fr.set(8, F + 2, 9, B.OAK_DOOR);
  for (const v0 of [1, 7]) {
    fr.set(w - 3, F + 1, v0 + 1, B.BED_FOOT); fr.set(w - 2, F + 1, v0 + 1, B.BED_HEAD);
    fr.set(w - 2, F + 1, v0 + 3, B.BARREL);
    addSpot(fr, rec, w - 4, v0 + 2, F + 1, 'beds');
  }
  // barred windows on the jail side
  for (const v of [2, 8]) { fr.set(w - 1, F + 2, v, B.IRON_BARS); fr.set(w - 1, F + 3, v, B.IRON_BARS); }
  fr.lantern(4, F + 4, 6); fr.lantern(12, F + 4, 3); fr.lantern(12, F + 4, 9);
  fr.sign(11, F + 6, 0, 'JAIL');
  return rec;
}

export function generalStore(fr, F) {
  const w = 15, d = 13;
  const rec = shell(fr, F, { w, d, floors: 1, wall: PLANKS, trim: B.SPRUCE_LOG, roof: 'flat', sign: 'GENERAL STORE', doorU: 7, name: 'General Store', kind: 'store', windowsU: [2, 4, 10, 12], falseFrontH: 3 });
  fr.fill(2, F + 1, d - 4, w - 3, F + 1, d - 4, DARK); fr.fill(2, F + 2, d - 4, w - 3, F + 2, d - 4, B.SPRUCE_SLAB); // counter
  fr.fill(1, F + 1, d - 2, w - 2, F + 3, d - 2, B.SHELF); // goods against the (intact) back wall
  fr.fill(1, F + 1, 2, 1, F + 3, d - 6, B.BOOKSHELF); fr.fill(w - 2, F + 1, 2, w - 2, F + 3, d - 6, B.SHELF);
  for (const [u, v] of [[4, 4], [5, 4], [9, 5], [10, 5], [4, 8]]) fr.set(u, F + 1, v, u % 2 ? B.CRATE : B.BARREL);
  fr.set(10, F + 2, 5, B.CRATE);
  addSpot(fr, rec, 7, d - 3, F + 1, 'work');
  for (const [u, v] of [[3, 6], [7, 6], [11, 7], [7, 8]]) addSpot(fr, rec, u, v, F + 1);
  fr.lantern(4, F + 4, 5); fr.lantern(10, F + 4, 5); fr.lantern(7, F + 4, 8);
  // goods outside on the boardwalk
  fr.set(1, F + 1, -1, B.BARREL); fr.set(2, F + 1, -1, B.CRATE); fr.set(w - 2, F + 1, -1, B.BARREL); fr.set(w - 2, F + 2, -1, B.BARREL);
  return rec;
}

export function shop(fr, F, name, kind, w = 11, d = 10, opts = {}) {
  const rec = shell(fr, F, { w, d, floors: 1, wall: opts.wall ?? PLANKS, trim: opts.trim ?? B.STRIPPED_OAK, roof: opts.roof || 'flat', sign: name.toUpperCase(), doorU: Math.floor(w / 2), name, kind, ...opts });
  const cu = Math.floor(w / 2);
  // counter (d-4), keeper walkway (d-3), goods shelves inside against the back wall (d-2). The wall stays intact.
  fr.fill(2, F + 1, d - 4, w - 3, F + 1, d - 4, DARK); fr.fill(2, F + 2, d - 4, w - 3, F + 2, d - 4, B.SPRUCE_SLAB);
  fr.fill(1, F + 1, d - 2, w - 2, F + 3, d - 2, opts.shelf ?? B.SHELF);
  addSpot(fr, rec, cu, d - 3, F + 1, 'work');
  addSpot(fr, rec, cu - 2, 3, F + 1); addSpot(fr, rec, cu + 2, 3, F + 1); addSpot(fr, rec, cu, d - 5, F + 1);
  fr.lantern(cu, F + 4, 2); fr.lantern(cu, F + 4, d - 5);
  if (opts.furnish) opts.furnish(fr, F, rec, w, d);
  return rec;
}

export function doctor(fr, F) {
  return shop(fr, F, 'Doctor', 'doctor', 10, 10, {
    wall: WHITE, trim: B.SPRUCE_LOG, furnish: (fr, F, rec, w, d) => {
      fr.set(2, F + 1, 3, B.BED_FOOT); fr.set(2, F + 1, 4, B.BED_HEAD); fr.set(w - 3, F + 1, 4, B.TABLE); fr.set(1, F + 1, 6, B.BOOKSHELF); fr.set(1, F + 2, 6, B.BOOKSHELF);
      addSpot(fr, rec, 3, 4, F + 1, 'beds');
    },
  });
}

export function gunsmith(fr, F) {
  return shop(fr, F, 'Gunsmith', 'gunsmith', 11, 10, {
    wall: DARK, trim: B.STRIPPED_OAK, shelf: B.BOOKSHELF, furnish: (fr, F, rec, w, d) => {
      fr.set(1, F + 1, 3, B.CRATE); fr.set(1, F + 1, 4, B.CRATE); fr.set(1, F + 2, 3, B.CRATE); fr.set(w - 2, F + 1, 3, B.BARREL);
      fr.fill(1, F + 1, 6, 1, F + 3, 7, B.BOOKSHELF);
      fr.set(w - 2, F + 1, 5, B.ANVIL);
    },
  });
}

export function hotel(fr, F) {
  const w = 21, d = 14;
  const rec = shell(fr, F, { w, d, floors: 2, wall: B.PLASTER, trim: B.SPRUCE_LOG, roof: 'flat', sign: 'HOTEL', doorU: 10, name: 'Grand Hotel', kind: 'hotel', windowsU: [3, 6, 14, 17], backDoorU: 3 });
  // lobby: reception desk, key shelves inside against the back wall, seating
  fr.fill(7, F + 1, d - 4, 13, F + 1, d - 4, DARK); fr.fill(7, F + 2, d - 4, 13, F + 2, d - 4, B.SPRUCE_SLAB);
  fr.fill(8, F + 1, d - 2, 12, F + 3, d - 2, B.BOOKSHELF);
  addSpot(fr, rec, 10, d - 3, F + 1, 'work');
  for (const [u, v] of [[3, 4], [17, 4], [3, 8], [17, 8]]) { fr.set(u, F + 1, v, B.TABLE); fr.set(u + 1, F + 1, v, B.SPRUCE_SLAB); fr.set(u - 1, F + 1, v, B.SPRUCE_SLAB); addSpot(fr, rec, u + 1, v, F + 1); addSpot(fr, rec, u - 1, v, F + 1); }
  fr.fill(1, F + 1, 2, 1, F + 1, 3, B.RED_WOOL); fr.fill(w - 2, F + 1, 2, w - 2, F + 1, 3, B.RED_WOOL);
  for (const [u, v] of [[5, 6], [10, 6], [15, 6], [10, 10]]) fr.lantern(u, F + 4, v);
  stairs(fr, w - 2, F, 2, B.OAK_SLAB, B.OAK_SLAB_TOP, PLANKS);
  fr.fill(w - 3, F + 1, 2, w - 3, F + 3, 9, B.OAK_FENCE);
  // upstairs rooms: corridor at v=5..6, rooms front (v 1..4) and back (v 7..12)
  const F2 = F + 5;
  fr.fill(1, F2 + 1, 5, w - 3, F2 + 3, 5, PLANKS);
  fr.fill(1, F2 + 1, 7, w - 3, F2 + 3, 7, PLANKS);
  for (let u = 4; u < w - 3; u += 5) {
    fr.fill(u, F2 + 1, 1, u, F2 + 3, 4, PLANKS);
    fr.fill(u, F2 + 1, 8, u, F2 + 3, d - 2, PLANKS);
  }
  for (let u = 2; u < w - 3; u += 5) {
    fr.door(u, F2 + 1, 5, B.OAK_DOOR); fr.door(u, F2 + 1, 7, B.OAK_DOOR);
    fr.set(u + 1, F2 + 1, 2, B.BED_HEAD); fr.set(u + 1, F2 + 1, 3, B.BED_FOOT);
    fr.set(u + 1, F2 + 1, d - 2, B.BED_HEAD); fr.set(u + 1, F2 + 1, d - 3, B.BED_FOOT);
    fr.set(u + 2, F2 + 1, 1, B.CHEST); fr.set(u + 2, F2 + 1, d - 2, B.CHEST);
    fr.lantern(u + 1, F2 + 4, 3); fr.lantern(u + 1, F2 + 4, d - 4);
    addSpot(fr, rec, u + 2, 3, F2 + 1, 'beds'); addSpot(fr, rec, u + 2, d - 4, F2 + 1, 'beds');
  }
  for (let u = 3; u < w - 3; u += 5) fr.lantern(u, F2 + 4, 6);
  for (let u = 6; u < w - 4; u += 6) addSpot(fr, rec, u, 6, F2 + 1);
  fr.sign(4, F + 11, 0, 'ROOMS');
  fr.sign(16, F + 11, 0, 'BATHS');
  return rec;
}

export function bank(fr, F) {
  const w = 17, d = 14;
  const rec = shell(fr, F, { w, d, floors: 2, wall: B.BRICKS, trim: B.STONE_BRICKS, floorBlock: B.SMOOTH_STONE, roof: 'flat', roofBlock: B.STONE_BRICKS, roofSlab: B.STONE_BRICK_SLAB, sign: 'BANK', doorU: 8, name: 'Bank', kind: 'bank', balcony: false, awning: false, windowsU: [3, 5, 11, 13], foundation: B.STONE_BRICKS, falseFrontH: 2 });
  // columns and steps at the entrance
  for (const u of [5, 11]) fr.fill(u, F + 1, -1, u, F + 4, -1, B.STONE_BRICKS);
  fr.fill(6, F + 5, -1, 10, F + 5, -1, B.STONE_BRICK_SLAB);
  fr.fill(5, F + 5, -2, 11, F + 5, -2, B.STONE_BRICK_SLAB);
  fr.lantern(8, F + 4, -1);
  // teller counter with bars
  fr.fill(3, F + 1, 6, w - 4, F + 1, 6, DARK); fr.fill(3, F + 2, 6, w - 4, F + 2, 6, B.SPRUCE_SLAB);
  fr.fill(3, F + 3, 6, w - 4, F + 3, 6, B.IRON_BARS);
  fr.set(8, F + 3, 6, B.AIR); fr.set(8, F + 2, 6, B.SPRUCE_SLAB);
  addSpot(fr, rec, 6, 7, F + 1, 'work'); addSpot(fr, rec, 10, 7, F + 1, 'work');
  addSpot(fr, rec, 6, 4, F + 1); addSpot(fr, rec, 10, 4, F + 1); addSpot(fr, rec, 8, 3, F + 1);
  fr.set(2, F + 1, 2, B.TABLE); fr.set(w - 3, F + 1, 2, B.TABLE);
  // vault at the back
  fr.fill(5, F + 1, 9, w - 6, F + 4, d - 2, B.STONE_BRICKS);
  fr.fill(6, F + 1, 10, w - 7, F + 3, d - 3, B.AIR);
  fr.set(8, F + 1, 9, B.IRON_BARS); fr.set(8, F + 2, 9, B.IRON_BARS);
  fr.fill(6, F + 1, d - 3, w - 7, F + 1, d - 3, B.GOLD_BLOCK);
  fr.set(6, F + 1, 10, B.CHEST); fr.set(w - 7, F + 1, 10, B.CHEST);
  fr.lantern(8, F + 3, 11);
  for (const [u, v] of [[4, 3], [12, 3], [8, 8]]) fr.lantern(u, F + 4, v);
  // second floor offices
  stairs(fr, 1, F, 2, B.STONE_BRICK_SLAB, B.STONE_BRICK_SLAB_TOP, B.STONE_BRICKS);
  const F2 = F + 5;
  fr.set(5, F2 + 1, 4, B.TABLE); fr.set(11, F2 + 1, 4, B.TABLE); fr.fill(3, F2 + 1, d - 2, w - 4, F2 + 2, d - 2, B.BOOKSHELF);
  fr.lantern(8, F2 + 4, 6); fr.lantern(4, F2 + 4, 9); fr.lantern(12, F2 + 4, 9);
  addSpot(fr, rec, 6, 5, F2 + 1); addSpot(fr, rec, 10, 6, F2 + 1);
  return rec;
}

export function blacksmith(fr, F) {
  const w = 13, d = 11;
  const rec = shell(fr, F, { w, d, floors: 1, wall: DARK, trim: B.SPRUCE_LOG, floorBlock: B.COBBLESTONE, roof: 'gable', roofBlock: DARK, sign: 'BLACKSMITH', doorU: 6, doorId: 0, name: 'Blacksmith', kind: 'blacksmith', awning: false, windows: false, falseFront: false });
  // open front: wide opening
  fr.fill(3, F + 1, 0, 9, F + 3, 0, B.AIR);
  fr.set(6, F + 4, 0, DARK);
  fr.sign(6, F + 5, 0, 'BLACKSMITH');
  // forge with chimney
  fr.fill(1, F + 1, d - 3, 3, F + 1, d - 2, B.STONE_BRICKS);
  fr.set(2, F + 2, d - 3, B.FURNACE);
  fr.fill(1, F + 2, d - 2, 3, F + 3, d - 2, B.STONE_BRICKS);
  fr.chimney(2, d - 2, F + 4, F + 9, B.STONE_BRICKS);
  fr.set(5, F + 1, d - 4, B.ANVIL);
  fr.set(8, F + 1, d - 3, B.TROUGH);
  fr.set(w - 2, F + 1, 2, B.BARREL); fr.set(w - 2, F + 1, 3, B.CRATE); fr.set(w - 2, F + 2, 2, B.IRON_BLOCK);
  fr.fill(1, F + 1, 1, 1, F + 2, 2, B.CRATE);
  addSpot(fr, rec, 5, d - 5, F + 1, 'work');
  addSpot(fr, rec, 8, 4, F + 1); addSpot(fr, rec, 3, 4, F + 1);
  fr.lantern(6, F + 4, 5); fr.lantern(3, F + 4, d - 4);
  // hitching post outside
  return rec;
}

export function stable(fr, F) {
  const w = 17, d = 14;
  const rec = shell(fr, F, { w, d, floors: 1, wall: DARK, trim: B.SPRUCE_LOG, floorBlock: B.COARSE_DIRT, roof: 'gable', sign: 'LIVERY STABLE', doorU: 8, doorId: 0, name: 'Livery Stable', kind: 'stable', awning: false, windows: false, falseFront: false, foundation: B.DIRT });
  fr.fill(7, F + 1, 0, 9, F + 3, 0, B.AIR); // big opening
  fr.fill(7, F + 4, 0, 9, F + 4, 0, DARK);
  fr.sign(8, F + 5, 0, 'LIVERY');
  // stalls along both sides
  for (let v = 2; v < d - 2; v += 4) {
    fr.fill(4, F + 1, v, 4, F + 1, v + 2, B.SPRUCE_FENCE); fr.fill(w - 5, F + 1, v, w - 5, F + 1, v + 2, B.SPRUCE_FENCE);
    fr.fill(1, F + 1, v + 3, 4, F + 1, v + 3, B.SPRUCE_FENCE); fr.fill(w - 5, F + 1, v + 3, w - 2, F + 1, v + 3, B.SPRUCE_FENCE);
    fr.set(1, F + 1, v, B.HAY_BALE); fr.set(w - 2, F + 1, v, B.HAY_BALE);
    fr.set(2, F + 1, v + 2, B.TROUGH); fr.set(w - 3, F + 1, v + 2, B.TROUGH);
    const [hx, hz] = fr.world(2, v + 1); fr.s.animalSpawns.push({ type: 'horse', x: hx + 0.5, z: hz + 0.5, tie: true });
    const [hx2, hz2] = fr.world(w - 3, v + 1); if (v > 2) fr.s.animalSpawns.push({ type: 'horse', x: hx2 + 0.5, z: hz2 + 0.5, tie: true });
  }
  fr.fill(6, F + 1, d - 2, 10, F + 2, d - 2, B.HAY_BALE);
  fr.set(w - 2, F + 1, 1, B.BARREL); fr.set(1, F + 1, 1, B.CRATE);
  addSpot(fr, rec, 8, d - 4, F + 1, 'work'); addSpot(fr, rec, 6, 4, F + 1); addSpot(fr, rec, 10, 8, F + 1);
  fr.lantern(8, F + 4, 3); fr.lantern(8, F + 4, 8); fr.lantern(8, F + 4, d - 3);
  // hay loft window
  fr.set(8, F + 6, 0, B.AIR); fr.set(8, F + 7, 0, B.AIR);
  return rec;
}

export function station(fr, F) {
  const w = 21, d = 8;
  const rec = shell(fr, F, { w, d, floors: 1, wall: PLANKS, trim: B.SPRUCE_LOG, floorBlock: DARK, roof: 'gable', roofBlock: DARK, sign: 'DEPOT', doorU: 10, name: 'Train Depot', kind: 'station', windowsU: [3, 6, 14, 17], backDoorU: 10, falseFront: false });
  // ticket counter and benches
  fr.fill(2, F + 1, 3, 6, F + 1, 3, DARK); fr.fill(2, F + 2, 3, 6, F + 2, 3, B.SPRUCE_SLAB); fr.fill(2, F + 3, 3, 6, F + 3, 3, B.IRON_BARS);
  fr.fill(1, F + 1, d - 2, 6, F + 3, d - 2, B.BOOKSHELF);
  fr.fill(13, F + 1, 2, 18, F + 1, 2, B.SPRUCE_SLAB); fr.fill(13, F + 1, 5, 18, F + 1, 5, B.SPRUCE_SLAB);
  addSpot(fr, rec, 4, 5, F + 1, 'work');
  for (const u of [13, 15, 17]) { addSpot(fr, rec, u, 2, F + 1); addSpot(fr, rec, u, 5, F + 1); }
  fr.lantern(5, F + 4, 4); fr.lantern(10, F + 4, 4); fr.lantern(15, F + 4, 4);
  // sign facing the tracks too
  fr.sign(10, F + 5, d - 1, 'DEPOT', true);
  return rec;
}

export function church(fr, F) {
  const w = 13, d = 17;
  const rec = shell(fr, F, { w, d, floors: 1, wall: WHITE, trim: B.SPRUCE_LOG, roof: 'gable', roofBlock: DARK, sign: null, doorU: 6, doubleDoor: false, name: 'Church', kind: 'church', awning: false, windows: false, falseFront: false, foundation: B.STONE_BRICKS });
  // taller nave: remove the shell roof, raise walls to 6 and roof higher
  fr.fill(-1, F + 5, 0, w, F + 22, d - 1, B.AIR);
  fr.walls(0, F + 5, 0, w - 1, F + 6, d - 1, WHITE);
  fr.gableRoof(0, w - 1, 0, d - 1, F + 7, DARK, B.SPRUCE_SLAB);
  // tall arched windows
  for (let v = 4; v < d - 2; v += 4) { fr.fill(0, F + 2, v, 0, F + 5, v, B.GLASS); fr.fill(w - 1, F + 2, v, w - 1, F + 5, v, B.GLASS); }
  // steeple tower at front
  fr.fill(4, F + 1, 0, 8, F + 12, 2, WHITE);
  fr.fill(5, F + 1, 1, 7, F + 12, 1, B.AIR);
  fr.fill(5, F + 1, 0, 7, F + 3, 0, B.AIR); // door gap in tower base
  fr.fill(6, F + 1, 0, 6, F + 2, 2, B.AIR); fr.set(6, F + 1, 0, B.OAK_DOOR); fr.set(6, F + 2, 0, B.OAK_DOOR);
  fr.fill(5, F + 4, 0, 7, F + 4, 2, WHITE);
  fr.fill(4, F + 13, 0, 8, F + 13, 2, DARK);
  fr.fill(5, F + 14, 0, 7, F + 14, 2, DARK); fr.fill(6, F + 15, 1, 6, F + 16, 1, DARK);
  fr.fill(5, F + 17, 1, 7, F + 17, 1, B.SPRUCE_LOG); fr.fill(6, F + 17, 1, 6, F + 19, 1, B.SPRUCE_LOG); // cross
  fr.set(6, F + 10, 0, B.AIR); fr.set(6, F + 11, 0, B.AIR); fr.set(6, F + 10, 0, B.GLASS); fr.set(6, F + 11, 0, B.GLASS);
  fr.lantern(6, F + 12, 1);
  // pews & altar
  for (let v = 5; v < d - 5; v += 2) { fr.fill(2, F + 1, v, 5, F + 1, v, B.SPRUCE_SLAB); fr.fill(7, F + 1, v, 10, F + 1, v, B.SPRUCE_SLAB); }
  fr.fill(4, F + 1, d - 3, 8, F + 1, d - 3, B.TABLE); fr.set(6, F + 2, d - 3, B.BOOKSHELF);
  fr.fill(5, F + 1, d - 2, 7, F + 2, d - 2, B.RED_WOOL);
  addSpot(fr, rec, 6, d - 4, F + 1, 'work');
  for (let v = 5; v < d - 5; v += 2) for (const u of [3, 4, 8, 9]) addSpot(fr, rec, u, v, F + 1);
  for (const v of [6, 10, 14]) { fr.lantern(3, F + 5, v); fr.lantern(9, F + 5, v); }
  return rec;
}

export function house(fr, F, name, variant = 0) {
  const w = 7 + (variant % 2) * 2, d = 7 + (variant % 3);
  const walls = [PLANKS, DARK, WHITE, B.PLASTER][variant % 4];
  const rec = shell(fr, F, { w, d, floors: 1, wall: walls, trim: variant % 2 ? B.SPRUCE_LOG : B.STRIPPED_OAK, roof: 'gable', roofBlock: variant % 2 ? DARK : B.SPRUCE_PLANKS, sign: null, doorU: Math.floor(w / 2), name, kind: 'house', awning: false, falseFront: false, windowsU: [1, w - 2], frontOnly: true });
  // porch
  fr.fill(0, F + 4, -1, w - 1, F + 4, -2, B.OAK_SLAB);
  fr.fill(0, F + 1, -2, 0, F + 3, -2, B.OAK_FENCE); fr.fill(w - 1, F + 1, -2, w - 1, F + 3, -2, B.OAK_FENCE);
  fr.fill(0, F, -1, w - 1, F, -2, PLANKS); // porch floor
  fr.set(Math.floor(w / 2), F, -3, B.OAK_SLAB); // step
  fr.set(1, F + 1, -1, B.SPRUCE_SLAB); // porch bench
  fr.lantern(w - 2, F + 3, -1);
  // interior
  fr.set(1, F + 1, d - 2, B.BED_HEAD); fr.set(1, F + 1, d - 3, B.BED_FOOT);
  fr.set(w - 2, F + 1, d - 2, B.CHEST); fr.set(w - 2, F + 1, 2, B.TABLE); fr.set(w - 3, F + 1, 2, B.SPRUCE_SLAB);
  if (variant % 2 === 0) { fr.set(1, F + 1, 1, B.BOOKSHELF); }
  else { fr.set(1, F + 1, 1, B.BARREL); }
  fr.lantern(Math.floor(w / 2), F + 4, Math.floor(d / 2));
  fr.chimney(w - 1, d - 2, F + 1, F + 9, B.BRICKS);
  fr.set(w - 2, F + 1, d - 4, B.FURNACE);
  addSpot(fr, rec, 2, d - 3, F + 1, 'beds');
  addSpot(fr, rec, Math.floor(w / 2), 3, F + 1); addSpot(fr, rec, w - 3, 3, F + 1);
  const [px, pz] = fr.world(1, -1); rec.porch = { x: px, y: F + 1, z: pz };
  // outhouse behind the house (3x3 shack, door facing the house)
  const ou = w - 2, ov = d + 2;
  fr.fill(ou - 1, F, ov - 1, ou + 1, F + 3, ov + 1, DARK);
  fr.fill(ou, F + 1, ov, ou, F + 2, ov, B.AIR);
  fr.set(ou, F + 1, ov - 1, B.OAK_DOOR); fr.set(ou, F + 2, ov - 1, B.OAK_DOOR);
  fr.fill(ou - 1, F + 4, ov - 1, ou + 1, F + 4, ov + 1, B.SPRUCE_SLAB);
  fr.set(ou, F, d, B.DIRT_PATH); fr.set(ou, F + 1, d, B.AIR); fr.set(ou, F + 2, d, B.AIR);
  return rec;
}

export function barn(fr, F) {
  const w = 17, d = 15;
  const rec = shell(fr, F, { w, d, floors: 1, wall: DARK, trim: WHITE, floorBlock: B.COARSE_DIRT, roof: 'gable', roofBlock: DARK, sign: null, doorU: 8, doorId: 0, name: 'Barn', kind: 'barn', awning: false, windows: false, falseFront: false, foundation: B.DIRT });
  // taller: second wall layer
  fr.fill(0, F + 5, 1, w - 1, F + 8, d - 1, B.AIR);
  fr.walls(0, F + 5, 0, w - 1, F + 7, d - 1, DARK);
  fr.fill(0, F + 8, 0, w - 1, F + 14, d - 1, B.AIR);
  fr.gableRoof(0, w - 1, 0, d - 1, F + 8, DARK, B.SPRUCE_SLAB);
  fr.fill(6, F + 1, 0, 10, F + 4, 0, B.AIR); // big doors open
  fr.fill(6, F + 5, 0, 10, F + 5, 0, WHITE);
  for (const u of [6, 10]) fr.fill(u, F + 1, 0, u, F + 4, 0, WHITE);
  fr.fill(7, F + 6, 0, 9, F + 7, 0, B.AIR); // loft opening
  // X pattern trim on the doors sides
  for (let k = 0; k < 4; k++) { fr.set(1 + k, F + 1 + k, 0, WHITE); fr.set(w - 2 - k, F + 1 + k, 0, WHITE); fr.set(4 - k, F + 1 + k, 0, WHITE); fr.set(w - 5 + k, F + 1 + k, 0, WHITE); }
  // interior: hay loft and stalls
  fr.fill(1, F + 5, 1, w - 2, F + 5, 5, PLANKS);
  fr.fill(1, F + 6, 1, w - 2, F + 6, 4, B.HAY_BALE);
  fr.fill(1, F + 1, d - 4, 5, F + 2, d - 2, B.HAY_BALE); fr.fill(w - 5, F + 1, d - 3, w - 2, F + 1, d - 2, B.HAY_BALE);
  for (let v = 7; v < d - 4; v += 4) { fr.fill(4, F + 1, v, 4, F + 1, v + 2, B.SPRUCE_FENCE); fr.fill(1, F + 1, v + 3, 4, F + 1, v + 3, B.SPRUCE_FENCE); fr.set(2, F + 1, v + 2, B.TROUGH); }
  fr.set(w - 2, F + 1, 3, B.BARREL); fr.set(w - 2, F + 1, 4, B.BARREL); fr.set(w - 3, F + 1, 3, B.CRATE);
  fr.lantern(8, F + 4, 4); fr.lantern(8, F + 7, 9); fr.lantern(3, F + 4, 9);
  addSpot(fr, rec, 8, 6, F + 1, 'work'); addSpot(fr, rec, 8, 10, F + 1); addSpot(fr, rec, 12, 8, F + 1);
  const [hx, hz] = fr.world(2, 8); fr.s.animalSpawns.push({ type: 'horse', x: hx + 0.5, z: hz + 0.5, tie: true });
  const [cx, cz] = fr.world(12, 11); fr.s.animalSpawns.push({ type: 'cow', x: cx + 0.5, z: cz + 0.5, tie: true });
  return rec;
}

export function warehouse(fr, F, name = 'FREIGHT') {
  const w = 15, d = 11;
  const rec = shell(fr, F, { w, d, floors: 1, wall: DARK, trim: B.SPRUCE_LOG, floorBlock: PLANKS, roof: 'gable', roofBlock: B.SPRUCE_PLANKS, sign: name, doorU: 7, doorId: 0, name: 'Warehouse', kind: 'warehouse', awning: false, windowsU: [2, 12], falseFront: false });
  fr.fill(6, F + 1, 0, 8, F + 3, 0, B.AIR);
  for (const [u, v, h] of [[2, 3, 2], [3, 3, 1], [2, 4, 1], [11, 3, 2], [12, 3, 1], [11, 8, 2], [12, 8, 1], [2, 8, 1], [3, 8, 2], [7, 8, 1]]) fr.fill(u, F + 1, v, u, F + h, v, (u + v) % 2 ? B.CRATE : B.BARREL);
  fr.fill(5, F + 1, d - 2, 9, F + 1, d - 2, B.HAY_BALE);
  fr.lantern(7, F + 4, 3); fr.lantern(7, F + 4, 8);
  addSpot(fr, rec, 7, 5, F + 1, 'work'); addSpot(fr, rec, 5, 6, F + 1); addSpot(fr, rec, 9, 6, F + 1);
  return rec;
}

export function waterTower(fr, F) {
  const w = 5, d = 5;
  for (const [u, v] of [[0, 0], [w - 1, 0], [0, d - 1], [w - 1, d - 1]]) fr.fill(u, F, v, u, F + 7, v, B.SPRUCE_LOG);
  fr.fill(0, F + 4, 0, w - 1, F + 4, d - 1, B.SPRUCE_FENCE);
  fr.fill(1, F + 4, 1, w - 3 + 1, F + 4, d - 2, B.AIR);
  fr.fill(0, F + 8, 0, w - 1, F + 8, d - 1, DARK);
  fr.walls(0, F + 9, 0, w - 1, F + 12, d - 1, B.BARREL);
  fr.fill(1, F + 9, 1, w - 2, F + 12, d - 2, B.WATER);
  fr.fill(0, F + 13, 0, w - 1, F + 13, d - 1, B.SPRUCE_SLAB);
  fr.fill(1, F + 13, 1, w - 2, F + 13, d - 2, DARK); fr.fill(2, F + 14, 2, 2, F + 14, 2, DARK);
  fr.fill(2, F + 1, -1, 2, F + 8, -1, B.SPRUCE_FENCE); // fill pipe
  fr.set(2, F + 1, -2, B.TROUGH);
}

export function graveyard(fr, F, w = 19, d = 17) {
  // picket fence perimeter with a gate on the front
  for (let u = 0; u < w; u++) { fr.set(u, F + 1, 0, B.WHITE_FENCE); fr.set(u, F + 1, d - 1, B.WHITE_FENCE); }
  for (let v = 0; v < d; v++) { fr.set(0, F + 1, v, B.WHITE_FENCE); fr.set(w - 1, F + 1, v, B.WHITE_FENCE); }
  const gate = Math.floor(w / 2);
  fr.set(gate, F + 1, 0, B.AIR); fr.set(gate + 1, F + 1, 0, B.AIR);
  fr.set(gate, F + 1, 0, B.AIR);
  // path
  for (let v = 0; v < d - 2; v++) { fr.set(gate, F, v, B.DIRT_PATH); fr.set(gate + 1, F, v, B.DIRT_PATH); }
  // graves
  const rec = record(fr, 'Graveyard', 'graveyard', F, w, d);
  for (let v = 3; v < d - 2; v += 3) for (let u = 2; u < w - 2; u += 3) {
    if (u === gate || u === gate + 1 || u === gate - 1) continue;
    fr.set(u, F + 1, v, B.GRAVESTONE);
    fr.set(u, F, v + 1, B.COARSE_DIRT); fr.set(u, F, v + 2, B.COARSE_DIRT);
    if ((u * 7 + v) % 5 === 0) fr.set(u, F + 1, v + 2, B.POPPY);
    addSpot(fr, rec, u, v + 1 <= d - 3 ? v + 1 : v - 1, F + 1);
  }
  // dead tree
  fr.fill(w - 3, F + 1, d - 4, w - 3, F + 6, d - 4, B.SPRUCE_LOG);
  fr.set(w - 4, F + 6, d - 4, B.SPRUCE_LOG); fr.set(w - 2, F + 5, d - 4, B.SPRUCE_LOG); fr.set(w - 3, F + 5, d - 3, B.SPRUCE_LOG);
  fr.set(w - 4, F + 1, d - 3, B.DEAD_BUSH);
  fr.lantern(gate - 1, F + 2, 0); fr.lantern(gate + 2, F + 2, 0);
  fr.set(gate - 1, F + 1, 0, B.WHITE_FENCE); fr.set(gate + 2, F + 1, 0, B.WHITE_FENCE);
  const [ox, oz] = fr.world(gate, -1); rec.door = { x: ox, y: F + 1, z: oz };
  const [ix, iz] = fr.world(gate, 2); rec.inside = { x: ix, y: F + 1, z: iz };
  return rec;
}

export function marketStalls(fr, F, count = 3) {
  const rec = record(fr, 'Market', 'market', F, count * 4, 3);
  for (let i = 0; i < count; i++) {
    const u0 = i * 4;
    fr.fill(u0, F + 1, 1, u0 + 2, F + 1, 1, B.TABLE);
    fr.set(u0, F + 1, 0, B.SPRUCE_FENCE); fr.set(u0 + 2, F + 1, 0, B.SPRUCE_FENCE); fr.set(u0, F + 2, 0, B.SPRUCE_FENCE); fr.set(u0 + 2, F + 2, 0, B.SPRUCE_FENCE);
    fr.set(u0, F + 1, 2, B.SPRUCE_FENCE); fr.set(u0 + 2, F + 1, 2, B.SPRUCE_FENCE); fr.set(u0, F + 2, 2, B.SPRUCE_FENCE); fr.set(u0 + 2, F + 2, 2, B.SPRUCE_FENCE);
    for (let u = u0; u <= u0 + 2; u++) for (let v = 0; v <= 2; v++) fr.set(u, F + 3, v, (u + i) % 2 ? B.RED_WOOL : B.WHITE_WOOL);
    fr.set(u0 + 1, F + 2, 1, i % 3 === 0 ? B.PUMPKIN : i % 3 === 1 ? B.HAY_BALE : B.CRATE);
    fr.set(u0 + 1, F + 1, 3, B.BARREL);
    addSpot(fr, rec, u0 + 1, 2, F + 1, 'work');
    addSpot(fr, rec, u0 + 1, -1, F + 1); addSpot(fr, rec, u0, -1, F + 1);
  }
  return rec;
}

export function wagon(fr, F, loaded = 'hay') {
  for (const [u, v] of [[0, 0], [0, 4], [2, 0], [2, 4]]) fr.set(u, F + 1, v, B.SPRUCE_LOG);
  fr.fill(0, F + 2, 0, 2, F + 2, 4, DARK);
  for (let v = 0; v <= 4; v++) { fr.set(0, F + 3, v, B.SPRUCE_FENCE); fr.set(2, F + 3, v, B.SPRUCE_FENCE); }
  fr.set(1, F + 3, 4, B.SPRUCE_FENCE); fr.set(1, F + 3, 0, B.SPRUCE_FENCE);
  fr.fill(1, F + 3, 1, 1, F + 3, 3, loaded === 'hay' ? B.HAY_BALE : loaded === 'crates' ? B.CRATE : B.BARREL);
  fr.set(1, F + 2, -1, B.SPRUCE_FENCE); fr.set(1, F + 2, -2, B.SPRUCE_FENCE);
  const [hx, hz] = fr.world(1, -3);
  fr.s.animalSpawns.push({ type: 'horse', x: hx + 0.5, z: hz + 0.5, tie: true });
}

export function well(fr, F) {
  fr.walls(0, F, 0, 2, F + 1, 2, B.COBBLESTONE);
  fr.set(1, F - 1, 1, B.WATER); fr.set(1, F, 1, B.WATER); fr.set(1, F - 2, 1, B.WATER);
  fr.fill(0, F + 2, 0, 0, F + 3, 0, B.SPRUCE_FENCE); fr.fill(2, F + 2, 2, 2, F + 3, 2, B.SPRUCE_FENCE);
  fr.fill(0, F + 2, 2, 0, F + 3, 2, B.SPRUCE_FENCE); fr.fill(2, F + 2, 0, 2, F + 3, 0, B.SPRUCE_FENCE);
  fr.fill(-1, F + 4, -1, 3, F + 4, 3, B.SPRUCE_SLAB);
  fr.fill(0, F + 5, 0, 2, F + 5, 2, DARK);
  fr.set(1, F + 3, 1, B.LANTERN);
}

export function hitchingRail(store, x, y, z, along = 'x', len = 3) {
  for (let k = 0; k < len; k++) store.set(along === 'x' ? x + k : x, y, along === 'x' ? z : z + k, B.SPRUCE_FENCE);
}

export function lampPost(store, x, y, z) {
  store.set(x, y, z, B.SPRUCE_FENCE); store.set(x, y + 1, z, B.SPRUCE_FENCE); store.set(x, y + 2, z, B.SPRUCE_FENCE);
  store.set(x, y + 3, z, B.LANTERN);
  store.lamps.push({ x, y: y + 3, z });
}

export function bench(store, x, y, z, along = 'x', len = 2) {
  for (let k = 0; k < len; k++) store.set(along === 'x' ? x + k : x, y, along === 'x' ? z : z + k, B.SPRUCE_SLAB);
}
