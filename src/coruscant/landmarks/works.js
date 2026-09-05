// The Works foundry — the industrial-district landmark (docs/rubrics/06_landmarks.md, id `works`).
//
// An industrial cathedral on a 155 x 105 lot. Plan (local x east, z south; the boulevard front is the south edge):
//
//   z 0..11     stack yard: four big chimneys and two small ones on the north side, gas spheres, pipe bridges
//   z 12..22    north strip: two floors of workshops / control booths behind the north wall, roof deck at y 16
//   z 23..90    THE SMELTER HALL (109 x 68): casting floor at y 6 over an undercroft, the magma trench running
//               east-west into the casting pit, four smelters with tap runners, ore gantry, conveyor lines, cargo
//               racks, two gantry cranes, a glass control gallery hung over the floor, ring catwalks at y 26/36/41
//   z 91..104   south strip: corridor + rooms on levels 1 (undercroft), 6, 11, 16; terrace on its roof (y 21);
//               the portal bay in the middle: vestibule, grand stair, lift/stair cores, a 30-block atrium void,
//               the boulevard lobby at y 36 behind the mid-level door, and the vent rose in the gable
//   x 0..21     ore yard: silos on legs, ore heaps, the ore conveyor bridge into the hall
//   x 133..154  loading yard: raised dock, speeder truck, containers, fuel depot
//
// Levels are on the city lattice (walk y = 5k + 1). Stairs rise half a block per cell (slab, full, slab, ...).
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { Room } from '../rooms/room.js';

export const LANDMARK = { id: 'works', name: 'The Works foundry', span: [3, 2], height: 60, build };

const SLAB = B.STONE_BRICK_SLAB, STEP = B.DECK_PLATE;
const Y = { under: 1, hall: 6, s2: 11, s3: 16, terrace: 21, cat: 26, gal: 36, crane: 41, roof: 44, nave: 52, stack: 60 };

function build(bp, lot, ctx) {
  const rng = ctx.rng;
  const ROOMS = ctx.rooms.ROOMS;
  const W = bp.w, D = bp.d;
  bp.meta.name = 'The Works foundry';

  // ------------------------------------------------------------------------------------------------ helpers
  const set = (x, y, z, id) => bp.set(x, y, z, id);
  const fill = (x0, y0, z0, x1, y1, z1, id) => bp.fill(x0, y0, z0, x1, y1, z1, id);
  const carve = (x0, y0, z0, x1, y1, z1) => bp.fill(x0, y0, z0, x1, y1, z1, FORCE_AIR);
  const col = (x, y0, z, y1, id) => bp.fill(x, y0, z, x, y1, z, id);
  const ring = (x0, y0, z0, x1, y1, z1, id) => bp.walls(x0, y0, z0, x1, y1, z1, id);
  const solid = (x, y, z) => { const v = bp.get(x, y, z); return v !== 0 && v !== FORCE_AIR; };
  const lit = () => (rng.chance(0.65) ? B.WINDOW_LIT : B.WINDOW_DARK);
  const cargo = () => (rng.chance(0.6) ? B.CRATE : B.BARREL);
  const isLight = (v) => v === B.GLOW_PANEL || v === B.GLOW_PANEL_BLUE || v === B.CITY_LAMP || v === B.HOLO_SIGN;
  // rooms are recorded with their walls included (the checker treats the outer ring of the rect as the wall)
  const recRoom = (kind, x0, y, z0, x1, z1) => bp.room(kind, x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);

  // half-step stair: n cells from walk level y at (x, z) advancing (dx, dz); even k = slab, odd k = full block.
  // Cells above each step are cleared; the mass below is filled down to baseY (-1 = leave open / floating).
  const stairRun = (x, y, z, dx, dz, n, baseY = -1) => {
    for (let k = 0; k < n; k++) {
      const sx = x + k * dx, sz = z + k * dz, sy = y + (k >> 1);
      carve(sx, sy, sz, sx, sy + 3, sz);
      set(sx, sy, sz, (k & 1) ? STEP : SLAB);
      if (baseY >= 0 && sy - 1 >= baseY) fill(sx, baseY, sz, sx, sy - 1, sz, B.DURASTEEL_DARK);
    }
  };
  // 2 x 5 switchback stairwell in frame coordinates: columns uA (climbing in v) and uB (returning), rows v0+1..v0+5,
  // door row v0. Ten steps per 5-block level; `doors` lists the walk levels that get a doorway (2 wide, 3 high —
  // the first step is right behind the lintel, so a 2-high door would catch the head of anyone stepping up).
  const switchback = (X, Z, uA, uB, v0, y0, y1, doors, trim = B.CHROME) => {
    const put = (u, y, v, id) => set(X(u, v), y, Z(u, v), id);
    for (const u of [uA, uB]) for (let v = v0 + 1; v <= v0 + 5; v++) col(X(u, v), y0, Z(u, v), y1 + 2, FORCE_AIR);
    for (let lvl = y0; lvl <= y1; lvl += 5) {
      if (doors.has(lvl)) {
        for (const u of [uA, uB]) { for (let dy = 0; dy <= 2; dy++) put(u, lvl + dy, v0, FORCE_AIR); put(u, lvl + 3, v0, trim); }
        put(uA, lvl + 4, v0, B.GLOW_PANEL);
      }
      // sub-floor under the next flight doubles as the ceiling of the flight below: a glow panel lights the well.
      // It stops at row v0 + 3: over row v0 + 4 the climber below stands 2 blocks under it and needs 2.4 to step up.
      if (lvl > y0) for (let k = 0; k <= 2; k++) put(uA, lvl - 1, v0 + 1 + k, k === 0 ? B.GLOW_PANEL : B.DECK_PLATE);
      else put(uA, lvl - 1, v0 + 1, B.GLOW_PANEL);
      put(uB + (uB > uA ? 1 : -1), lvl + 3, v0 + 3, B.GLOW_PANEL);
      if (lvl === y1) {   // top landing: guard rail over the well, a status console and a tool crate
        put(uA, lvl, v0 + 4, B.IRON_BARS); put(uA, lvl, v0 + 3, B.CONSOLE); put(uA, lvl + 1, v0 + 3, B.HOLO_SIGN); put(uA, lvl, v0 + 2, B.CRATE);
        continue;
      }
      for (let k = 0; k < 10; k++) {
        const u = k < 5 ? uA : uB, v = k < 5 ? v0 + 1 + k : v0 + 5 - (k - 5);
        put(u, lvl + (k >> 1), v, (k & 1) ? STEP : SLAB);
      }
    }
  };
  // Doorway 2 wide x 2 high in a wall running along x (constant z) or along z (constant x): chrome lintel,
  // striped jambs, a glow panel over the lintel when the wall continues above.
  const doorway = (x, y, z, alongX, w = 2, h = 2) => {
    const dx = alongX ? 1 : 0, dz = alongX ? 0 : 1;
    for (let k = 0; k < w; k++) { carve(x + k * dx, y, z + k * dz, x + k * dx, y + h - 1, z + k * dz); set(x + k * dx, y + h, z + k * dz, B.CHROME); }
    for (const s of [-1, w]) { const jx = x + s * dx, jz = z + s * dz; if (solid(jx, y, jz)) fill(jx, y, jz, jx, y + h, jz, B.PANEL_STRIPE); }
    if (solid(x, y + h + 1, z)) set(x, y + h + 1, z, B.GLOW_PANEL);
  };
  // paints the wall cells surrounding an interior rect (only where they are solid) with the foundry wall pattern
  const skinWalls = (x0, y, z0, x1, z1) => {
    const paint = (x, z, i) => {
      if (!solid(x, y, z)) return;
      set(x, y, z, B.HULL_PLATE); set(x, y + 1, z, i % 4 === 1 ? B.PANEL_STRIPE : B.DURASTEEL); set(x, y + 2, z, i % 4 === 3 ? B.VENT : B.DURASTEEL); set(x, y + 3, z, B.DURASTEEL_DARK);
    };
    for (let x = x0; x <= x1; x++) { paint(x, z0 - 1, x - x0); paint(x, z1 + 1, x - x0); }
    for (let z = z0; z <= z1; z++) { paint(x0 - 1, z, z - z0); paint(x1 + 1, z, z - z0); }
  };
  // patterned room floor at y - 1: durasteel field, black panel border, deck plate corners. Existing light
  // blocks are kept: this slab is also the ceiling of the room below, whose lights were placed first.
  const roomFloor = (x0, y, z0, x1, z1) => {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      if (isLight(bp.get(x, y - 1, z))) continue;
      const edge = x === x0 || x === x1 || z === z0 || z === z1;
      const corner = (x === x0 || x === x1) && (z === z0 || z === z1);
      set(x, y - 1, z, corner ? B.DECK_PLATE : (edge ? B.PANEL_BLACK : B.DURASTEEL));
    }
  };
  // a template room from the library on an interior rect; the door wall is `side`, first door cell at doorAt (x or z)
  const tplRoom = (name, x0, z0, x1, z1, y, side, doorAt, kind = null) => {
    const tpl = ROOMS[name] || ROOMS.storage;
    const alongX = side === 'N' || side === 'S';
    const doorU = alongX ? doorAt - x0 : doorAt - z0;
    roomFloor(x0, y, z0, x1, z1);
    skinWalls(x0, y, z0, x1, z1);
    const room = new Room(bp, { x0, z0, x1, z1, y, h: 4, side, doorU, doorW: 2 }, tpl.name, ctx);
    tpl.fn(room, rng, ctx);
    room.finalize();
    room.putRaw(doorU, 4, 0, B.GLOW_PANEL);
    // guarantee a light inside the room even when the template placed none of its own
    set(x0 + 1, y + 4, z0 + 1, B.GLOW_PANEL); set(x1 - 1, y + 4, z1 - 1, B.GLOW_PANEL);
    // wall fixtures at head height where the template left the walls bare: shelves, conduit, vents, screens
    const fixtures = [B.SHELF, B.PANEL_STRIPE, B.VENT, B.HOLO_SIGN, B.IRON_BARS, B.PANEL_RED];
    let fi = 0;
    const fixture = (u, v) => { if (room.empty(u, 2, v) && room.empty(u, 1, v)) room.put(u, 2, v, fixtures[fi++ % fixtures.length]); };
    for (let v = 1; v < room.d - 1; v += 2) { fixture(0, v); fixture(room.w - 1, v); }
    for (let u = 1; u < room.w - 1; u += 3) fixture(u, room.d - 1);
    recRoom(kind || tpl.name, x0, y, z0, x1, z1);
    // door in the wall the frame points at
    if (side === 'N') doorway(doorAt, y, z0 - 1, true);
    else if (side === 'S') doorway(doorAt, y, z1 + 1, true);
    else if (side === 'W') doorway(x0 - 1, y, doorAt, false);
    else doorway(x1 + 1, y, doorAt, false);
  };
  const lampPost = (x, y, z, h = 2, id = B.CITY_LAMP) => { col(x, y, z, y + h - 1, B.IRON_BARS); set(x, y + h, z, id); };
  const sphere = (cx, cy, cz, r, id) => { for (let dy = -r; dy <= r; dy++) { const rr = Math.sqrt(Math.max(0, r * r - dy * dy)); bp.disc(cx + 0.5, cz + 0.5, rr + 0.4, cy + dy, cy + dy, id); } };
  const pile = (cx, cz, r, id, y0 = 1) => { for (let i = 0; i <= r; i++) fill(cx - r + i, y0 + i, cz - r + i, cx + r - i, y0 + i, cz + r - i, id); };

  // ------------------------------------------------------------------------------------------------ geometry
  const DX = lot.door ? lot.door.x - lot.x0 : (W >> 1);          // front door column (2 wide: DX, DX + 1)
  const SX0 = 22, SX1 = W - 23, SZ0 = 12, SZ1 = D - 1;             // shell walls x 22 / 132, z 12 / 104
  const HX0 = SX0 + 1, HX1 = SX1 - 1;                              // interior x 23..131
  const NZ1 = 22;                                                  // north strip inner wall; rooms z 13..21
  const HZ0 = NZ1 + 1, HZ1 = SZ1 - 14;                             // hall floor z 23..90
  const SW = SZ1 - 13;                                             // south strip inner wall z 91
  const CZ0 = SW + 1, CZ1 = SW + 2;                                // corridor z 92..93
  const RW = SW + 3;                                               // room wall z 94
  const RZ0 = SW + 4, RZ1 = SZ1 - 2;                               // rooms z 95..102 (inner skin z 103)
  const VX0 = DX - 5, VX1 = DX + 6;                                // atrium void x 72..83
  const BX0 = DX - 12, BX1 = DX + 13;                              // portal bay x 65..90
  const CZA = RW + 3, CZB = CZA + 5;                               // core rows z 97..102 (doors face north from z 97)
  const PZ0 = RW, PZ1 = RW + 2;                                    // core landing pockets z 94..96
  const TRZ0 = 55, TRZ1 = 57;                                      // magma trench z 55..57
  const NX0 = 40, NX1 = 114, NVZ0 = 32, NVZ1 = 82;                 // clerestory (nave) rectangle
  const SMELT = [33, 51, 69, 87];                                  // smelter / big chimney centre columns
  const westRooms = [[HX0, 35], [37, 49], [51, 63]];
  const eastRooms = [[92, 104], [106, 118], [120, HX1]];
  const midRooms = [[BX0, 77], [79, BX1]];
  const northRooms = [[HX0, 39], [41, 57], [59, 75], [77, 93], [95, 111], [113, HX1]];

  // ------------------------------------------------------------------------------------------------ ground + mass
  fill(0, 0, 0, W - 1, 0, D - 1, B.DECK_PLATE);
  for (let x = 4; x < W; x += 8) fill(x, 0, 0, x, 0, D - 1, B.HULL_TRENCH);
  for (let z = 4; z < D; z += 8) fill(0, 0, z, W - 1, 0, z, B.HULL_TRENCH);
  ring(SX0 - 1, 0, SZ0 - 1, SX1 + 1, 0, SZ1, B.PANEL_STRIPE);
  fill(SX0, 0, SZ0, SX1, 4, SZ1, B.DURASTEEL_DARK);                // base mass (the undercroft is carved out of it)
  fill(SX0, 5, SZ0, SX1, 5, SZ1, B.DECK_PLATE);                    // casting floor slab
  carve(HX0, 6, SZ0 + 1, HX1, Y.roof - 1, SZ1 - 1);
  ring(SX0, 1, SZ0, SX1, Y.roof, SZ1, B.DURASTEEL_DARK);           // outer walls
  fill(HX0, 5, SZ1 - 1, HX1, Y.roof - 1, SZ1 - 1, B.DURASTEEL_DARK); // south inner skin (z 103)
  fill(SX0, Y.roof, SZ0, SX1, Y.roof, SZ1, B.HULL_PLATE);          // aisle roof

  // casting floor pattern: trench-plate grid every 8 with glow panels on both lattices
  for (let x = HX0 + 4; x <= HX1; x += 8) fill(x, 5, HZ0, x, 5, HZ1, B.HULL_TRENCH);
  for (let z = HZ0 + 4; z <= HZ1; z += 8) fill(HX0, 5, z, HX1, 5, z, B.HULL_TRENCH);
  for (let x = HX0 + 4; x <= HX1; x += 8) for (let z = HZ0 + 4; z <= HZ1; z += 8) { set(x, 5, z, B.GLOW_PANEL); set(x + 4, 5, z + 4, B.GLOW_PANEL); }

  // ------------------------------------------------------------------------------------------------ south strip
  fill(HX0, 6, SW, HX1, 20, SW, B.DURASTEEL_DARK);                 // inner wall z 91 (y 6..20)
  for (let x = HX0; x <= HX1; x++) {                               // its hall face: bands, glass slots for the corridors
    const k = (x - HX0) % 4;
    for (const fy of [9, 14, 19]) set(x, fy, SW, B.PANEL_STRIPE);
    if (k === 1 || k === 2) { fill(x, 12, SW, x, 13, SW, B.STEEL_GLASS); fill(x, 17, SW, x, 18, SW, B.STEEL_GLASS); }
    else if (k === 0) { set(x, 7, SW, B.HULL_PLATE); set(x, 8, SW, B.VENT); }
  }
  for (const fy of [10, 15]) fill(HX0, fy, CZ0, HX1, fy, RZ1, B.DURASTEEL);
  fill(HX0, 20, CZ0, HX1, 20, RZ1, B.DECK_PLATE);                  // terrace deck
  // room wall z 94 and partitions for the three upper levels (pockets stay open)
  for (const [a, b] of [[HX0, BX0 - 1], [BX1 + 1, HX1]]) fill(a, 6, RW, b, 19, RW, B.DURASTEEL);
  for (const rooms of [westRooms, eastRooms]) for (const [a, b] of rooms) { if (a > HX0) fill(a - 1, 6, RW, a - 1, 19, RZ1, B.DURASTEEL); if (b < HX1) fill(b + 1, 6, RW, b + 1, 19, RZ1, B.DURASTEEL); }
  // corridor floors first (each is the ceiling of the corridor below), then the light rows and floor stripes
  for (const y of [Y.hall, Y.s2, Y.s3]) fill(HX0, y - 1, CZ0, HX1, y - 1, CZ1, B.DURASTEEL_DARK);
  for (const y of [Y.under, Y.hall, Y.s2, Y.s3]) {
    for (let x = HX0 + 1; x <= HX1; x += 4) { set(x, y + 4, CZ0, B.GLOW_PANEL); set(x + 2, y + 4, CZ1, B.GLOW_PANEL); set(x, y - 1, CZ1, B.PANEL_STRIPE); }
  }

  // ------------------------------------------------------------------------------------------------ undercroft (y 1..4)
  carve(HX0, 1, CZ0, HX1, 4, CZ1);                                 // corridor
  carve(BX0, 1, PZ0, VX0 - 1, 4, PZ1); carve(VX1 + 1, 1, PZ0, BX1, 4, PZ1); // pockets
  const underA = [['medbay', 'medical post'], ['locker_room', null], ['showers', null]];             // west row A (x asc)
  const underAE = [['security_post', null], ['laundry', null], ['storage', 'tool store']];
  const underB = [['barracks', 'shift bunks'], ['barracks', 'shift bunks'], ['gym', 'workers gym']];
  const underBM = [['cafeteria', 'canteen'], ['kitchen', null]];
  const underBE = [['lounge', 'break room'], ['restroom', null], ['storage', null]];
  const lockerRoom = (x0, z0, x1, z1, y, doorAt) => {
    roomFloor(x0, y, z0, x1, z1); skinWalls(x0, y, z0, x1, z1);
    fill(x0, y - 1, z0, x1, y - 1, z1, B.DURASTEEL); for (let x = x0; x <= x1; x += 2) fill(x, y - 1, z0, x, y - 1, z1, B.PANEL_BLACK);
    for (let x = x0; x <= x1; x++) {                                 // locker banks against the back wall and in two islands
      if (x === doorAt || x === doorAt + 1) continue;
      fill(x, y, z1, x, y + 1, z1, x % 3 === 2 ? B.IRON_BARS : B.IRON_BLOCK); set(x, y + 2, z1, B.PANEL_STRIPE);
    }
    for (const zi of [z0 + 3, z1 - 3]) for (let x = x0 + 1; x <= x1 - 1; x++) {
      if (x >= doorAt - 1 && x <= doorAt + 2 && zi === z0 + 3) continue;
      fill(x, y, zi, x, y + 1, zi, x % 3 === 1 ? B.IRON_BARS : B.IRON_BLOCK);
      if (x % 2 === 0) { set(x, y, zi - 1, SLAB); bp.spot(x, y, zi - 1, 'seat'); } else set(x, y, zi + 1, SLAB);
    }
    set(x0, y, z0, B.CHEST); set(x1, y, z0, B.BARREL); set(x0, y + 1, z0 + 1, B.HOLO_SIGN);
    for (let x = x0 + 1; x <= x1; x += 4) { set(x, y + 4, z0 + 1, B.GLOW_PANEL); set(x, y + 4, z1 - 1, B.GLOW_PANEL); }
    for (let x = x0 + 3; x <= x1; x += 4) set(x, y + 4, (z0 + z1) >> 1, B.GLOW_PANEL);
    for (let x = x0 + 2; x <= x1 - 1; x += 3) set(x, y + 3, z1, B.GLOW_PANEL);   // strip light over the locker bank
    bp.work(x0 + 1, y, z0 + 1, 'attendant'); bp.spot(doorAt, y, z0 + 2);
    recRoom('locker_room', x0, y, z0, x1, z1);
    doorway(doorAt, y, z0 - 1, true);
  };
  const showers = (x0, z0, x1, z1, y, doorAt) => {
    skinWalls(x0, y, z0, x1, z1);
    fill(x0, y - 1, z0, x1, y - 1, z1, B.SMOOTH_STONE); for (let x = x0; x <= x1; x += 2) for (let z = z0; z <= z1; z += 2) set(x, y - 1, z, B.STONE_BRICKS);
    for (let x = x0; x <= x1; x += 2) {                               // stalls along the back: plaster dividers, chrome heads, drains
      if (x + 1 <= x1) { fill(x + 1, y, z1 - 1, x + 1, y + 2, z1, B.PLASTER); }
      set(x, y, z1, SLAB); set(x, y + 2, z1, B.CHROME); set(x, y + 3, z1, B.GLOW_PANEL); bp.spot(x, y, z1 - 1, 'stand');
    }
    for (let x = x0; x <= x1; x += 2) { set(x, y, z0, B.TROUGH); set(x, y + 1, z0, B.CHROME); }   // sinks + mirrors on the door wall side
    for (let x = x0 + 1; x <= x1; x += 2) { set(x, y, z0 + 2, SLAB); set(x, y, z0 + 3, B.WHITE_WOOL); }  // benches and towel stacks
    set(x1, y, z0 + 1, B.BARREL); set(x0, y, z0 + 1, B.CHEST);
    for (let x = x0 + 2; x <= x1; x += 4) { set(x, y + 4, z0 + 3, B.GLOW_PANEL); set(x, y + 4, z0, B.GLOW_PANEL); }
    recRoom('showers', x0, y, z0, x1, z1);
    doorway(doorAt, y, z0 - 1, true);
  };
  const rowA = (x0, x1, spec, y) => {
    carve(x0, y, RZ0, x1, y + 3, RZ1);
    const doorAt = x0 + 5;
    if (spec[0] === 'locker_room') lockerRoom(x0, RZ0, x1, RZ1, y, doorAt);
    else if (spec[0] === 'showers') showers(x0, RZ0, x1, RZ1, y, doorAt);
    else tplRoom(spec[0], x0, RZ0, x1, RZ1, y, 'N', doorAt, spec[1]);
  };
  westRooms.forEach(([a, b], i) => rowA(a, b, underA[i], Y.under));
  eastRooms.forEach(([a, b], i) => rowA(a, b, underAE[i], Y.under));
  const rowB = (x0, x1, spec) => { carve(x0, 1, 80, x1, 4, 90); tplRoom(spec[0], x0, 80, x1, 90, Y.under, 'S', x0 + 5, spec[1]); };
  westRooms.forEach(([a, b], i) => rowB(a, b, underB[i]));
  midRooms.forEach(([a, b], i) => rowB(a, b, underBM[i]));
  eastRooms.forEach(([a, b], i) => rowB(a, b, underBE[i]));

  // ------------------------------------------------------------------------------------------------ south rooms, levels 6 / 11 / 16
  const upper = {
    [Y.hall]: { west: [['workshop', 'fitting shop'], ['droid_bay', null], ['storage', 'tool store']], east: [['control_room', 'dispatch'], ['open_plan_office', 'shipping office'], ['workshop', 'maintenance']] },
    [Y.s2]: { west: [['open_plan_office', 'planning office'], ['meeting_room', null], ['executive_office', 'foreman office']], east: [['comms_room', null], ['server_room', 'data room'], ['open_plan_office', 'accounts']] },
    [Y.s3]: { west: [['lounge', 'crew lounge'], ['archive', 'records'], ['executive_office', 'director office']], east: [['holo_theatre', 'briefing theatre'], ['school_room', 'training room'], ['medbay', 'first aid']] },
  };
  for (const y of [Y.hall, Y.s2, Y.s3]) {
    westRooms.forEach(([a, b], i) => { const s = upper[y].west[i]; tplRoom(s[0], a, RZ0, b, RZ1, y, 'N', a + 5, s[1]); });
    eastRooms.forEach(([a, b], i) => { const s = upper[y].east[i]; tplRoom(s[0], a, RZ0, b, RZ1, y, 'N', a + 5, s[1]); });
    recRoom('corridor', HX0, y, CZ0, HX1, CZ1);
  }
  recRoom('corridor', HX0, Y.under, CZ0, HX1, CZ1);
  // corridor dressing: a service duct under the ceiling on the hall side; lockers, benches, fire points and crates
  // against the room wall between the doors (the hall-side lane always stays clear)
  const corridorKit = (y) => {
    for (let x = HX0; x <= HX1; x++) if (!isLight(bp.get(x, y + 4, CZ0))) set(x, y + 3, CZ0, (x - HX0) % 5 === 2 ? B.VENT : B.DURASTEEL_DARK);
    const roomDoors = [...westRooms, ...eastRooms].map(([a]) => a + 5);
    const blocked = (x) => (x >= BX0 - 1 && x <= BX1 + 1) || roomDoors.some((d) => x >= d - 2 && x <= d + 3) || (y === Y.hall && [30, 44, 58, 98, 112, 126].some((d) => x >= d - 1 && x <= d + 2));
    let i = 0;
    for (let x = HX0 + 1; x < HX1; x += 3) {
      if (blocked(x) || blocked(x + 1)) continue;
      const kind = i++ % 4;
      if (kind === 0) { fill(x, y, CZ1, x + 1, y + 1, CZ1, B.IRON_BLOCK); set(x, y + 2, CZ1, B.PANEL_STRIPE); set(x + 1, y + 2, CZ1, B.IRON_BARS); }
      else if (kind === 1) { set(x, y, CZ1, SLAB); set(x + 1, y, CZ1, SLAB); bp.spot(x, y, CZ1, 'seat'); set(x, y + 2, CZ1, B.HOLO_SIGN); }
      else if (kind === 2) { fill(x, y, CZ1, x, y + 1, CZ1, B.PANEL_RED); set(x + 1, y, CZ1, B.BARREL); set(x + 1, y + 1, CZ1, B.VENT); }
      else { set(x, y, CZ1, B.CRATE); set(x + 1, y, CZ1, B.CRATE); set(x, y + 1, CZ1, B.CRATE); set(x + 1, y + 1, CZ1, B.BARREL); }
    }
  };
  for (const y of [Y.under, Y.hall, Y.s2, Y.s3]) corridorKit(y);
  // arches from the level-6 corridor onto the casting floor (main arch in the bay, side doors)
  carve(DX - 3, Y.hall, SW, DX + 4, Y.hall + 5, SW);
  ring(DX - 4, Y.hall, SW, DX + 5, Y.hall + 6, SW, B.PANEL_STRIPE); fill(DX - 3, Y.hall + 6, SW, DX + 4, Y.hall + 6, SW, B.GLOW_PANEL);
  for (const x of [30, 44, 58, 98, 112, 126]) doorway(x, Y.hall, SW, true, 2, 3);

  // ------------------------------------------------------------------------------------------------ north strip (levels 6, 11; deck at 16)
  fill(HX0, 6, NZ1, HX1, 14, NZ1, B.DURASTEEL_DARK);               // inner wall z 22
  for (let x = HX0; x <= HX1; x++) { const k = (x - HX0) % 4; set(x, 9, NZ1, B.PANEL_STRIPE); set(x, 14, NZ1, B.PANEL_STRIPE); if (k === 2) { set(x, 8, NZ1, B.VENT); set(x, 13, NZ1, B.HULL_PLATE); } }
  fill(HX0, 10, SZ0 + 1, HX1, 10, NZ1 - 1, B.DURASTEEL);
  fill(HX0, 15, SZ0 + 1, HX1, 15, 25, B.DECK_PLATE);              // north deck: strip roof + catwalk, one plane
  for (const [a, b] of northRooms) { if (a > HX0) fill(a - 1, 6, SZ0 + 1, a - 1, 14, NZ1, B.DURASTEEL); }
  const northSpec = {
    [Y.hall]: [['reactor_room', 'power plant'], ['workshop', 'machine shop'], ['droid_bay', 'loader droid bay'], ['storage', 'parts store'], ['garage', 'loader garage'], ['security_post', 'gatehouse']],
    [Y.s2]: [['control_room', 'smelter control'], ['server_room', null], ['comms_room', null], ['meeting_room', 'shift briefing'], ['open_plan_office', 'logistics'], ['storage', 'spares']],
  };
  for (const y of [Y.hall, Y.s2]) northRooms.forEach(([a, b], i) => { const s = northSpec[y][i]; tplRoom(s[0], a, SZ0 + 1, b, NZ1 - 1, y, 'S', a + 7, s[1]); });

  // ------------------------------------------------------------------------------------------------ magma trench, tap, casting pit
  const trX0 = 24, trX1 = 103;
  carve(trX0, 4, TRZ0, trX1, 5, TRZ1); fill(trX0, 3, TRZ0, trX1, 3, TRZ1, B.MAGMA);
  fill(trX0, 4, TRZ0 - 1, trX1 + 1, 5, TRZ0 - 1, B.HULL_TRENCH); fill(trX0, 4, TRZ1 + 1, trX1 + 1, 5, TRZ1 + 1, B.HULL_TRENCH);
  fill(trX0, 6, TRZ0 - 1, trX1, 6, TRZ0 - 1, B.IRON_BARS); fill(trX0, 6, TRZ1 + 1, trX1, 6, TRZ1 + 1, B.IRON_BARS);
  fill(trX0 + 1, 5, TRZ0 - 2, trX1, 5, TRZ0 - 2, B.PANEL_STRIPE); fill(trX0 + 1, 5, TRZ1 + 2, trX1, 5, TRZ1 + 2, B.PANEL_STRIPE);
  for (const bx of [42, 64, 86]) {                                  // bridges over the trench (4 wide, railed)
    fill(bx, 5, TRZ0, bx + 3, 5, TRZ1, B.DECK_PLATE); set(bx + 1, 5, TRZ0 + 1, B.GLOW_PANEL); set(bx + 2, 5, TRZ0 + 1, B.GLOW_PANEL);
    carve(bx + 1, 6, TRZ0 - 1, bx + 2, 6, TRZ1 + 1);
    fill(bx, 6, TRZ0, bx, 6, TRZ1, B.IRON_BARS); fill(bx + 3, 6, TRZ0, bx + 3, 6, TRZ1, B.IRON_BARS);
    bp.spot(bx + 1, 6, TRZ0 + 1);
  }
  // the tap: a blast-furnace head against the west wall, its arched mouth pouring a fall of metal into the trench
  const TX1 = HX0 + 2;
  fill(HX0, 6, TRZ0 - 5, TX1, 14, TRZ1 + 5, B.DURASTEEL_DARK);
  fill(TX1, 6, TRZ0 - 4, TX1, 12, TRZ1 + 4, B.FURNACE);
  col(TX1, 5, TRZ0 - 5, 14, B.CHROME); col(TX1, 5, TRZ1 + 5, 14, B.CHROME); fill(TX1, 13, TRZ0 - 5, TX1, 13, TRZ1 + 5, B.PANEL_RED); fill(TX1, 14, TRZ0 - 5, TX1, 14, TRZ1 + 5, B.CHROME);
  fill(HX0, 15, TRZ0 - 4, TX1, 15, TRZ1 + 4, B.VENT); fill(HX0, 16, TRZ0 - 2, TX1, 17, TRZ1 + 2, B.DURASTEEL_DARK); fill(HX0, 18, TRZ0, TX1, 19, TRZ1, B.PANEL_STRIPE);   // hood
  for (const z of [TRZ0 - 3, TRZ1 + 3]) { set(TX1, 9, z, B.MAGMA); set(TX1, 10, z, B.MAGMA); }                                       // sight glasses
  carve(HX0 + 1, 4, TRZ0, TX1, 8, TRZ1); carve(HX0 + 1, 9, TRZ0 + 1, TX1, 9, TRZ0 + 1);                                             // arched mouth
  fill(HX0, 3, TRZ0, TX1, 3, TRZ1, B.MAGMA); col(HX0 + 1, 4, TRZ0 + 1, 9, B.MAGMA); fill(HX0 + 1, 4, TRZ0, HX0 + 1, 4, TRZ1, B.MAGMA);   // the pour
  for (const z of [TRZ0 - 1, TRZ1 + 1]) { col(TX1, 4, z, 5, B.HULL_TRENCH); set(TX1 + 1, 6, z, B.IRON_BARS); }
  for (let y = 6; y <= 12; y++) { set(TX1 + 1, y, TRZ0 - 6, y % 2 ? B.IRON_BARS : B.PANEL_RED); set(TX1 + 1, y, TRZ1 + 6, y % 2 ? B.IRON_BARS : B.PANEL_RED); }   // marker posts
  // work lights hung from the hood on both sides of the mouth, a lit hazard frame around the pour, glowing tuyeres
  for (const z of [TRZ0 - 2, TRZ1 + 2]) { set(TX1 + 1, 16, z, B.DURASTEEL_DARK); set(TX1 + 1, 15, z, B.GLOW_PANEL); set(TX1 + 3, 14, z, B.IRON_BARS); set(TX1 + 3, 13, z, B.GLOW_PANEL); set(TX1 + 3, 15, z, B.DURASTEEL_DARK); }
  fill(TX1 + 2, 15, TRZ0 - 2, TX1 + 3, 15, TRZ0 - 2, B.DURASTEEL_DARK); fill(TX1 + 2, 15, TRZ1 + 2, TX1 + 3, 15, TRZ1 + 2, B.DURASTEEL_DARK);
  for (const z of [TRZ0 - 1, TRZ1 + 1]) { set(TX1, 7, z, B.PANEL_RED); set(TX1, 8, z, B.GLOW_PANEL); set(TX1, 9, z, B.PANEL_RED); }
  fill(TX1, 10, TRZ0, TX1, 10, TRZ1, B.PANEL_RED); set(TX1, 10, TRZ0 + 1, B.GLOW_PANEL);
  for (const z of [TRZ0 - 3, TRZ1 + 3]) { set(TX1, 7, z, B.MAGMA); set(TX1, 12, z, B.MAGMA); }
  set(TX1 + 2, 6, TRZ0 - 4, B.CONSOLE); set(TX1 + 2, 6, TRZ1 + 4, B.CONSOLE); bp.work(TX1 + 3, 6, TRZ0 - 4, 'tapper'); bp.work(TX1 + 3, 6, TRZ1 + 4, 'tapper');
  // casting pit at the east end (magma basin) with a quench tank and mould rows beside it
  const px0 = trX1 + 1, px1 = 110, pz0 = 52, pz1 = 60;
  carve(px0, 4, pz0, px1, 5, pz1); fill(px0, 3, pz0, px1, 3, pz1, B.MAGMA);
  ring(px0 - 1, 4, pz0 - 1, px1 + 1, 5, pz1 + 1, B.HULL_TRENCH);
  carve(px0 - 1, 4, TRZ0, px0 - 1, 5, TRZ1);                       // the trench flows into the pit
  ring(px0 - 1, 6, pz0 - 1, px1 + 1, 6, pz1 + 1, B.IRON_BARS);
  carve(px0 - 1, 6, TRZ0 - 1, px0 - 1, 6, TRZ1 + 1); fill(px0 - 1, 6, TRZ0 - 1, px0 - 1, 6, TRZ0 - 1, B.IRON_BARS); fill(px0 - 1, 6, TRZ1 + 1, px0 - 1, 6, TRZ1 + 1, B.IRON_BARS);
  carve(px1 + 1, 6, 55, px1 + 1, 6, 57);                           // ladle stand gap on the east side
  for (let z = 54; z <= 58; z += 2) { set(px1 + 3, 6, z, B.IRON_BLOCK); set(px1 + 3, 7, z, B.MAGMA); }   // ladles cooling
  bp.work(px1 + 2, 6, 56, 'caster'); bp.spot(px0 + 3, 6, pz1 + 2);
  for (let x = 114; x <= 122; x += 2) for (let z = 50; z <= 62; z += 2) { set(x, 6, z, B.IRON_BLOCK); if (rng.chance(0.4)) set(x, 7, z, B.GOLD_BLOCK); }   // ingot stacks
  ring(95, 6, 62, 100, 6, 65, B.HULL_TRENCH); fill(96, 6, 63, 99, 6, 64, B.WATER); bp.work(94, 6, 63, 'quench');   // quench tank

  // ------------------------------------------------------------------------------------------------ smelters + flues
  // Blast furnaces: a 9 x 7 hearth of furnace mouths, a banded body with glowing sight slots, a stepped hood with
  // a charging hole under the ore gantry, and a 3 x 3 flue that climbs through the roof and runs north above it
  // on trestles into the chimney of the stack yard.
  const smelter = (cx) => {
    const x0 = cx - 4, x1 = cx + 4, z0 = 44, z1 = 50;
    ring(x0 - 1, 5, z0 - 1, x1 + 1, 5, z1 + 3, B.PANEL_STRIPE);
    fill(x0, 6, z0, x1, 8, z1, B.FURNACE);                          // hearth
    fill(x0, 9, z0, x1, 14, z1, B.DURASTEEL_DARK);                  // body
    ring(x0, 9, z0, x1, 9, z1, B.PANEL_STRIPE); ring(x0, 12, z0, x1, 12, z1, B.PANEL_STRIPE);
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) col(x, 6, z, 15, B.IRON_BLOCK);
    for (const x of [cx - 2, cx, cx + 2]) { set(x, 10, z0, B.MAGMA); set(x, 11, z0, B.VENT); set(x, 10, z1, B.MAGMA); set(x, 11, z1, B.VENT); }   // sight slots
    for (const z of [46, 48]) { set(x0, 10, z, B.MAGMA); set(x1, 10, z, B.MAGMA); set(x0, 13, z, B.VENT); set(x1, 13, z, B.VENT); }
    fill(x0 + 1, 15, z0 + 1, x1 - 1, 15, z1 - 1, B.DURASTEEL_DARK); ring(x0 + 1, 15, z0 + 1, x1 - 1, 15, z1 - 1, B.VENT);   // hood, step 1
    fill(x0 + 2, 16, z0 + 2, x1 - 2, 17, z1 - 2, B.DURASTEEL_DARK); ring(x0 + 2, 17, z0 + 2, x1 - 2, 17, z1 - 2, B.PANEL_RED);   // hood, step 2
    carve(cx - 3, 15, 46, cx - 3, 17, 48); fill(cx - 3, 14, 46, cx - 3, 14, 48, B.MAGMA);   // charging hole, molten glow below
    set(cx - 3, 15, 45, B.IRON_BLOCK); set(cx - 3, 16, 45, B.CHROME);                        // chute from the gantry
    // tap runner into the trench: a molten channel under a steel-glass cover, pouring out through the trench wall
    fill(cx, 4, z1 + 1, cx, 4, TRZ0 - 1, B.MAGMA); fill(cx, 5, z1 + 1, cx, 5, TRZ0 - 2, B.STEEL_GLASS);
    set(cx - 3, 6, z1 + 2, B.CONSOLE); set(cx + 3, 6, z1 + 2, B.CONSOLE);
    bp.work(cx - 3, 6, z1 + 3, 'smelter'); bp.work(cx + 3, 6, z1 + 3, 'smelter');
    set(cx - 4, 6, z0 - 2, B.BARREL); set(cx + 4, 6, z0 - 2, B.CRATE); set(cx + 4, 7, z0 - 2, B.CRATE);
    lampPost(cx - 6, 6, z1 + 2, 2); lampPost(cx + 6, 6, z1 + 2, 2);
  };
  SMELT.forEach(smelter);
  // flues are placed after the roof section (the clerestory carve would cut them): 3 x 3 up through the roofs, then
  // north above them on trestles into the chimney
  const flue = (cx) => {
    fill(cx - 1, 18, 46, cx + 1, Y.nave, 48, B.DURASTEEL_DARK);
    for (let y = 22; y <= Y.nave; y += 8) ring(cx - 1, y, 46, cx + 1, y, 48, B.PANEL_RED);
    fill(cx - 1, Y.nave + 1, 8, cx + 1, Y.nave + 2, 48, B.DURASTEEL_DARK);
    for (let z = 12; z <= 44; z += 8) {
      fill(cx - 1, Y.nave + 1, z, cx + 1, Y.nave + 2, z, B.PANEL_RED);
      const base = z >= NVZ0 && cx >= NX0 && cx <= NX1 ? Y.nave + 1 : Y.roof + 1;   // trestles down to whichever roof is below
      if (base <= Y.nave) { col(cx - 1, base, z, Y.nave, B.IRON_BARS); col(cx + 1, base, z, Y.nave, B.IRON_BARS); }
    }
    fill(cx - 2, Y.nave + 1, 12, cx + 2, Y.nave + 2, 12, B.CHROME);   // collar where the pipe meets the chimney
  };

  // ------------------------------------------------------------------------------------------------ conveyors, racks, lamps
  const belt = (x0, z0, x1, z1) => {
    const alongX = z0 === z1;
    fill(x0, 6, z0, x1, 6, z1, B.DECK_PLATE); fill(x0, 7, z0, x1, 7, z1, B.RAIL);
    const n = alongX ? x1 - x0 : z1 - z0;
    for (let i = 3; i <= n; i += 5) {
      const x = alongX ? x0 + i : x0, z = alongX ? z0 : z0 + i;
      set(x, 7, z, rng.chance(0.3) ? B.GOLD_BLOCK : B.IRON_BLOCK);
      if (i % 15 === 3) { set(alongX ? x : x + 1, 6, alongX ? z + 1 : z, B.IRON_BLOCK); set(alongX ? x : x + 1, 7, alongX ? z + 1 : z, B.CHROME); set(alongX ? x : x + 1, 8, alongX ? z + 1 : z, B.GLOW_PANEL_BLUE); }
    }
  };
  belt(28, 64, 118, 64); belt(28, 72, 118, 72); belt(112, 30, 112, 62);
  for (const x of [38, 60, 82, 104]) { set(x, 6, 68, B.CONSOLE); bp.work(x, 6, 67, 'sorter'); bp.spot(x + 1, 6, 68); }
  // cargo racks: five double racks in each of two blocks (east bay), aisles between
  const rack = (x, z0, z1) => {
    for (let z = z0; z <= z1; z++) for (let dx = 0; dx <= 1; dx++) {
      const post = (z - z0) % 6 === 0;
      if (post) { col(x + dx, 6, z, 12, B.IRON_BLOCK); continue; }
      set(x + dx, 7, z, B.DECK_PLATE); set(x + dx, 9, z, B.DECK_PLATE); set(x + dx, 11, z, B.DECK_PLATE);
      if (rng.chance(0.8)) set(x + dx, 6, z, cargo()); if (rng.chance(0.75)) set(x + dx, 8, z, cargo()); if (rng.chance(0.6)) set(x + dx, 10, z, cargo()); if (rng.chance(0.35)) set(x + dx, 12, z, cargo());
    }
    for (let z = z0 + 3; z <= z1; z += 8) set(x + 1, 13, z, B.CITY_LAMP);
  };
  for (const x of [107, 112, 117, 122, 127]) { rack(x, 26, 50); rack(x, 76, 88); }
  for (const x of [107, 112, 117, 122, 127]) { rack(x, 66, 70); }
  for (const x of [110, 115, 120, 125]) { bp.work(x, 6, 38, 'loader'); bp.work(x, 6, 82, 'loader'); set(x, 5, 32, B.GLOW_PANEL); set(x, 5, 44, B.GLOW_PANEL); set(x, 5, 82, B.GLOW_PANEL); }
  // ore heaps and slag on the casting floor's west end, lamp posts along the floor
  pile(27, 30, 2, B.IRON_ORE, 6); pile(27, 36, 1, B.COAL_ORE, 6); pile(26, 85, 2, B.SCORCHED_STONE, 6); pile(31, 87, 1, B.ASH, 6);
  for (let x = 30; x <= 124; x += 24) { lampPost(x, 6, 40, 2); lampPost(x, 6, 75, 2); }
  for (const [x, z] of [[36, 60], [58, 60], [80, 60], [36, 76], [58, 76], [80, 76]]) { set(x, 6, z, B.CRATE); set(x + 1, 6, z, B.BARREL); if (rng.chance(0.5)) set(x, 7, z, B.CRATE); }
  // rolling mill along the south of the west bay: roller table with glowing billets between mill stands
  fill(28, 6, 79, 60, 6, 79, B.RAIL); fill(28, 5, 78, 60, 5, 80, B.HULL_TRENCH);
  for (let x = 30; x <= 58; x += 7) {
    fill(x, 6, 78, x + 2, 7, 80, B.IRON_BLOCK); fill(x, 8, 78, x + 2, 8, 80, B.CHROME); set(x + 1, 8, 79, B.PANEL_RED);
    set(x, 7, 78, B.PANEL_RED); set(x + 2, 7, 80, B.PANEL_RED); set(x + 1, 9, 79, B.GLOW_PANEL_BLUE);
    if (x + 5 < 61) { set(x + 4, 6, 79, B.MAGMA); set(x + 5, 6, 79, B.MAGMA); }
    set(x + 1, 6, 82, B.CONSOLE); bp.work(x + 1, 6, 83, 'mill hand');
  }
  fill(27, 6, 78, 27, 7, 80, B.IRON_BLOCK); fill(61, 6, 78, 61, 7, 80, B.IRON_BLOCK); set(27, 8, 79, B.GLOW_PANEL); set(61, 8, 79, B.GLOW_PANEL);
  // mould field under the control gallery: rows of ingot moulds filling with metal, a walkway between the rows
  for (let x = 68; x <= 100; x += 4) for (const z of [82, 85, 88]) {
    set(x, 6, z, B.IRON_BLOCK); set(x + 1, 6, z, rng.chance(0.7) ? B.MAGMA : B.IRON_BLOCK); set(x + 2, 6, z, B.IRON_BLOCK);
    if (z === 85) { set(x + 1, 7, z, B.IRON_BARS); }
  }
  for (const x of [70, 86]) { bp.work(x, 6, 84, 'moulder'); bp.spot(x + 8, 6, 87); }
  for (let x = 68; x <= 100; x += 8) { set(x, 5, 84, B.GLOW_PANEL); set(x + 4, 5, 87, B.GLOW_PANEL); }
  bp.room('smelter_hall', HX0, Y.hall, HZ0, 65, HZ1); bp.room('casting_floor', 66, Y.hall, HZ0, 105, HZ1); bp.room('cargo_bay', 106, Y.hall, HZ0, HX1, HZ1);

  // ------------------------------------------------------------------------------------------------ ore gantry (y 16) + posts
  const GZ0 = 42, GZ1 = 44;
  fill(HX0, 15, GZ0, 92, 15, GZ1, B.DECK_PLATE); fill(HX0, 16, GZ0 + 1, 92, 16, GZ0 + 1, B.RAIL);
  fill(HX0, 16, GZ0, 92, 16, GZ0, B.IRON_BARS); fill(HX0, 16, GZ1, 92, 16, GZ1, B.IRON_BARS);
  for (let x = HX0 + 2; x <= 92; x += 8) set(x, 15, GZ0 + 1, B.GLOW_PANEL);
  for (let x = HX0 + 5; x <= 92; x += 12) { col(x, 6, GZ0, 14, B.DURASTEEL_DARK); col(x, 6, GZ1, 14, B.DURASTEEL_DARK); }
  fill(60, 15, 26, 61, 15, GZ0 - 1, B.DECK_PLATE); fill(59, 16, 26, 59, 16, GZ0 - 1, B.IRON_BARS); fill(62, 16, 26, 62, 16, GZ0 - 1, B.IRON_BARS);   // link to the north deck
  set(93, 15, GZ0 + 1, B.IRON_BLOCK); set(93, 16, GZ0 + 1, B.CHROME); bp.work(90, 16, GZ0 + 1, 'gantry');
  bp.room('ore_gantry', HX0, Y.s3, GZ0, 92, GZ1);

  // ------------------------------------------------------------------------------------------------ trusses, pipes, hall lighting
  for (let x = HX0 + 6; x <= HX1; x += 12) {
    fill(x, 43, HZ0, x, 43, HZ1, B.DURASTEEL_DARK);
    for (let z = HZ0; z <= HZ1; z += 2) set(x, 42, z, B.IRON_BARS);
    for (let z = HZ0 + 3; z <= HZ1; z += 8) set(x, 43, z, B.GLOW_PANEL);
  }
  fill(HX0, 41, 28, HX1, 42, 29, B.DURASTEEL_DARK); fill(HX0, 41, 86, HX1, 42, 87, B.DURASTEEL_DARK);   // long pipes
  for (let x = HX0 + 3; x <= HX1; x += 12) { fill(x, 40, 28, x, 40, 29, B.IRON_BARS); fill(x, 40, 86, x, 40, 87, B.IRON_BARS); fill(x, 41, 30, x, 41, 30, B.PANEL_RED); }

  // ------------------------------------------------------------------------------------------------ stair towers (NW / NE corners)
  const towerDoors = new Set([Y.hall, Y.s2, Y.s3, Y.cat, Y.gal, Y.crane]);
  const tower = (X, Z, bx0, bx1) => {
    ring(bx0, 6, 23, bx1, Y.roof, 26, B.DURASTEEL_DARK);
    fill(bx0, 6, 23, bx1, 6, 26, B.DURASTEEL_DARK); fill(bx0, Y.roof, 23, bx1, Y.roof, 26, B.HULL_PLATE);
    for (let y = 9; y < Y.roof; y += 5) { for (let z = 23; z <= 26; z++) { set(bx0, y, z, B.PANEL_STRIPE); set(bx1, y, z, B.PANEL_STRIPE); } }
    switchback(X, Z, 1, 2, 0, Y.hall, Y.crane, towerDoors);
    for (const y of towerDoors) bp.room('stair_tower', bx0, y, 23, bx1, 26);
  };
  tower((u, v) => 29 - v, (u, v) => 23 + u, 23, 29);
  tower((u, v) => 125 + v, (u, v) => 23 + u, 125, 131);

  // ------------------------------------------------------------------------------------------------ catwalk rings, balcony, decks
  const deck = (x0, z0, x1, z1, y, lightEvery = 6) => {
    fill(x0, y - 1, z0, x1, y - 1, z1, B.DECK_PLATE);
    if (x1 - x0 >= z1 - z0) { for (let x = x0 + 2; x <= x1; x += lightEvery) set(x, y - 1, (z0 + z1) >> 1, B.GLOW_PANEL); }
    else { for (let z = z0 + 2; z <= z1; z += lightEvery) set((x0 + x1) >> 1, y - 1, z, B.GLOW_PANEL); }
  };
  const rail = (x0, z0, x1, z1, y) => fill(x0, y, z0, x1, y, z1, B.IRON_BARS);
  // posts, crates and vents along one row of a catwalk (the middle row unless `row` is given), every 8 cells from `phase`
  const clutter = (x0, z0, x1, z1, y, row = null, phase = 4) => {
    const alongX = x1 - x0 >= z1 - z0, mid = row !== null ? row : (alongX ? (z0 + z1) >> 1 : (x0 + x1) >> 1);
    const n = alongX ? x1 - x0 : z1 - z0;
    for (let i = phase; i < n - 2; i += 8) {
      const x = alongX ? x0 + i : mid, z = alongX ? mid : z0 + i;
      const kind = (i >> 3) % 4;
      if (kind === 0) lampPost(x, y, z, 2);
      else if (kind === 1) { set(x, y, z, B.CRATE); set(x, y + 1, z, rng.chance(0.5) ? B.CRATE : B.BARREL); }
      else if (kind === 2) { set(x, y, z, B.VENT); set(x, y + 1, z, B.VENT); set(x, y + 2, z, B.CHROME); }
      else { set(x, y, z, B.CONSOLE); bp.work(alongX ? x : x, y, alongX ? z + 1 : z, 'inspector'); }
    }
  };
  // north balcony (11): strip doors open onto it
  // the tower doors (x 29 / 125, z 24..25) open onto the deck corner: the rail stops one cell short of the door and a
  // railed deck cell at z 26 closes the corner
  const towerExit = (y) => { for (const x of [30, 124]) { set(x, y - 1, 26, B.DECK_PLATE); set(x, y, 26, B.IRON_BARS); } };
  deck(30, 23, 124, 25, Y.s2); rail(31, 25, 123, 25, Y.s2); clutter(30, 23, 124, 25, Y.s2); towerExit(Y.s2);
  for (let x = 30; x <= 124; x += 6) set(x, 9, 25, B.DURASTEEL_DARK);
  bp.room('north_balcony', 30, Y.s2, 23, 124, 25);
  // north deck (16): equipment on the strip roof, railing along its south edge
  rail(31, 25, 123, 25, Y.s3); towerExit(Y.s3);
  carve(59, Y.s3, 25, 62, Y.s3, 25);
  for (let x = 34; x <= 120; x += 16) {                            // transformer units, coolant tanks, lamps
    fill(x, Y.s3, 15, x + 2, Y.s3 + 1, 17, B.IRON_BLOCK); ring(x - 1, Y.s3, 14, x + 3, Y.s3, 18, B.IRON_BARS); set(x + 1, Y.s3 + 2, 16, B.PANEL_RED); set(x + 1, Y.s3 + 3, 16, B.IRON_BARS);
    bp.disc(x + 8.5, 20.5, 2.4, Y.s3, Y.s3 + 2, B.CHROME); set(x + 8, Y.s3 + 3, 20, B.GLOW_PANEL_BLUE);
    lampPost(x + 5, Y.s3, 23, 2); set(x + 8, Y.s3, 14, B.CONSOLE); bp.work(x + 8, Y.s3, 15, 'technician');
  }
  for (let x = HX0 + 1; x <= HX1; x += 6) set(x, 15, 19, B.GLOW_PANEL);
  bp.room('north_deck', HX0, Y.s3, SZ0 + 1, HX1, 25);
  // corner platforms beside the towers and the E / W / N / S rings at 26 and 36, crane catwalk at 41 (north only)
  for (const y of [Y.cat, Y.gal]) {
    deck(23, 27, 32, 29, y); deck(30, 23, 32, 26, y);
    deck(122, 27, HX1, 29, y); deck(122, 23, 124, 26, y);
    deck(30, 23, 124, 25, y); rail(33, 25, 121, 25, y); clutter(30, 23, 124, 25, y); bp.room('catwalk_north', 30, y, 23, 124, 25);
    deck(HX0, 30, 25, 100, y); rail(25, 30, 25, 100, y); clutter(HX0, 30, 25, 100, y); bp.room('catwalk_west', HX0, y, 27, 25, 100);
    deck(129, 30, HX1, 100, y); rail(129, 30, 129, 100, y); clutter(129, 30, HX1, 100, y); bp.room('catwalk_east', 129, y, 27, HX1, 100);
    rail(26, 29, 32, 29, y); rail(122, 29, 128, 29, y); rail(32, 26, 32, 28, y); rail(122, 26, 122, 28, y);   // corner decks: south and hall-side edges
    // south catwalks: z 100..102 against the inner skin (z 103), rail on the hall side, clutter against the wall, lane z 101
    deck(HX0, 100, 62, 102, y); rail(HX0, 100, 62, 100, y); clutter(HX0, 100, 62, 102, y, 102); bp.room('catwalk_south', HX0, y, 99, 62, 103);
    deck(93, 100, HX1, 102, y); rail(93, 100, HX1, 100, y); clutter(93, 100, HX1, 102, y, 102, 8); bp.room('catwalk_south', 93, y, 99, HX1, 103);
    carve(HX0, y, 100, HX0 + 1, y, 100); carve(HX1 - 1, y, 100, HX1, y, 100);   // the ring lanes join the south catwalk (corner posts stay)
    // brackets under the rings
    for (let z = 31; z <= 100; z += 6) { set(HX0, y - 2, z, B.DURASTEEL_DARK); set(HX1, y - 2, z, B.DURASTEEL_DARK); }
    for (let x = 31; x <= 123; x += 6) { set(x, y - 2, 23, B.DURASTEEL_DARK); set(x, y - 2, 102, B.DURASTEEL_DARK); }
  }
  deck(30, 23, 124, 25, Y.crane); rail(33, 25, 121, 25, Y.crane); clutter(30, 23, 124, 25, Y.crane); bp.room('crane_catwalk', 30, Y.crane, 23, 124, 25);
  deck(30, 23, 32, 26, Y.crane); deck(122, 23, 124, 26, Y.crane); rail(30, 26, 32, 26, Y.crane); rail(122, 26, 124, 26, Y.crane);
  // crane runway beams and two gantry cranes with walkable bridges
  fill(30, 34, 25, 124, 34, 25, B.CHROME); fill(HX0, 34, 88, HX1, 34, 88, B.CHROME);   // runways stop short of the towers
  for (let x = 35; x <= 123; x += 8) { set(x, 33, 25, B.DURASTEEL_DARK); set(x, 33, 88, B.DURASTEEL_DARK); }
  const crane = (x0, tz, load) => {
    fill(x0, 34, 26, x0 + 3, 34, 100, B.DURASTEEL_DARK);
    fill(x0, 35, 26, x0 + 3, 35, 100, B.DECK_PLATE); for (let z = 30; z <= 100; z += 8) { set(x0 + 1, 35, z, B.GLOW_PANEL); }
    fill(x0, 36, 26, x0, 36, 100, B.IRON_BARS); fill(x0 + 3, 36, 26, x0 + 3, 36, 100, B.IRON_BARS);
    carve(x0 + 1, 36, 25, x0 + 2, 36, 25); carve(x0 + 1, 36, 100, x0 + 2, 36, 100);   // gaps in the ring rails at both ends
    // trolley under the deck, winch housing + operator console on it, hook cable and the load
    fill(x0, 32, tz - 1, x0 + 3, 33, tz + 1, B.IRON_BLOCK); set(x0 + 1, 33, tz - 1, B.PANEL_RED); set(x0 + 2, 33, tz + 1, B.PANEL_RED);
    fill(x0 + 1, 36, tz - 1, x0 + 1, 37, tz + 1, B.IRON_BLOCK); set(x0 + 1, 37, tz, B.PANEL_RED); set(x0 + 1, 38, tz, B.GLOW_PANEL);
    set(x0 + 1, 36, tz + 2, B.CONSOLE); bp.work(x0 + 2, 36, tz + 2, 'crane operator');
    col(x0 + 1, load + 2, tz, 31, B.IRON_BARS);
    if (load === 20) { ring(x0, 20, tz - 1, x0 + 2, 21, tz + 1, B.IRON_BLOCK); set(x0 + 1, 21, tz, B.MAGMA); set(x0 + 1, 20, tz, B.IRON_BLOCK); }
    else { fill(x0, load, tz - 1, x0 + 2, load + 1, tz, B.CRATE); }
    // tool crates, lamps and cable drums along one side of the deck; the other lane stays clear
    for (let z = 30; z <= 96; z += 6) {
      if (Math.abs(z - tz) <= 3) continue;
      const k = (z / 6) % 3;
      if (k === 0) { set(x0 + 1, 36, z, B.CRATE); set(x0 + 1, 37, z, B.BARREL); }
      else if (k === 1) lampPost(x0 + 1, 36, z, 2);
      else { set(x0 + 1, 36, z, B.IRON_BLOCK); set(x0 + 1, 37, z, B.IRON_BARS); }
    }
    bp.room('crane_bridge', x0, Y.gal, 26, x0 + 3, 100);
  };
  crane(40, 50, 20); crane(100, 70, 18);

  // ------------------------------------------------------------------------------------------------ portal bay: cores, void, grand stair, terrace, lobby
  const coreDoors = new Set([Y.under, Y.hall, Y.s2, Y.s3, Y.terrace, Y.cat, Y.gal]);
  const liftCore = (X, Z) => {
    const y0 = Y.under, y1 = Y.gal;
    for (let u = 0; u <= 5; u++) col(X(u, 0), 0, Z(u, 0), y1 + 4, B.DURASTEEL_DARK);
    for (let v = 0; v <= 5; v++) { col(X(0, v), 0, Z(0, v), y1 + 4, B.DURASTEEL_DARK); col(X(3, v), 0, Z(3, v), y1 + 4, B.DURASTEEL_DARK); }
    for (let u = 1; u <= 2; u++) for (let v = 1; v <= 5; v++) col(X(u, v), 0, Z(u, v), y1 + 4, v <= 2 ? B.PANEL_BLACK : (v === 3 ? B.DURASTEEL_DARK : B.VENT));
    for (let v = 4; v <= 5; v++) for (let y = 4; y <= y1 + 4; y += 5) { set(X(1, v), y, Z(1, v), B.GLOW_PANEL_BLUE); set(X(2, v), y + 2, Z(2, v), B.PANEL_RED); }
    for (let lvl = y0; lvl <= y1; lvl += 5) if (coreDoors.has(lvl)) for (let u = 1; u <= 2; u++) { set(X(u, 0), lvl, Z(u, 0), B.CHROME); set(X(u, 0), lvl + 1, Z(u, 0), B.CHROME); set(X(u, 0), lvl + 2, Z(u, 0), B.GLOW_PANEL_BLUE); }
    switchback(X, Z, 4, 5, 0, y0, y1, coreDoors);
    bp.lift(Math.min(X(1, 1), X(2, 2)), Math.min(Z(1, 1), Z(2, 2)), y0, y1);
    const xs = [X(0, 0), X(5, 5)], zs = [Z(0, 0), Z(5, 5)];
    for (const y of coreDoors) bp.room('lift_core', Math.min(...xs), y, Math.min(...zs), Math.max(...xs), Math.max(...zs));
  };
  // the void's side columns (they carry the lobby and separate it from the cores)
  col(VX0 - 1, 1, CZA, 40, B.DURASTEEL_DARK); col(VX1 + 1, 1, CZA, 40, B.DURASTEEL_DARK);
  for (let z = CZA; z <= CZB; z++) { col(VX0 - 1, 1, z, 40, B.DURASTEEL_DARK); col(VX1 + 1, 1, z, 40, B.DURASTEEL_DARK); }
  liftCore((u, v) => BX0 + u, (u, v) => CZA + v);
  liftCore((u, v) => BX1 - u, (u, v) => CZA + v);
  // atrium void: vestibule at the bottom, open up to the lobby floor
  carve(VX0, 1, PZ0, VX1, 34, SZ1 - 1);
  fill(VX0, 0, PZ0, VX1, 0, SZ1 - 1, B.PANEL_BLACK); for (let x = VX0; x <= VX1; x += 2) fill(x, 0, PZ0, x, 0, SZ1 - 1, B.DECK_PLATE);
  fill(VX0 + 3, 0, SZ1 - 1, VX1 - 3, 0, SZ1 - 1, B.PANEL_STRIPE);
  for (let y = 4; y <= 32; y += 4) { for (const x of [VX0 - 1, VX1 + 1]) for (let z = CZA; z <= CZB; z += 5) set(x, y, z, B.GLOW_PANEL_BLUE); }
  // the grand stair (6 wide) from the vestibule up to the level-6 corridor
  for (let x = DX - 2; x <= DX + 3; x++) stairRun(x, Y.under, SZ1 - 2, 0, -1, 10, 1);
  for (let k = 2; k < 10; k += 2) { set(DX - 2, Y.under + (k >> 1) - 1, SZ1 - 2 - k, B.GLOW_PANEL); set(DX + 3, Y.under + (k >> 1) - 1, SZ1 - 2 - k, B.GLOW_PANEL); }
  // vestibule furniture: security gates, guard console, benches, signage, lamps
  for (const x of [VX0, VX0 + 2, VX1 - 2, VX1]) set(x, 1, SZ1 - 3, B.IRON_BARS);
  set(VX0, 1, SZ1 - 5, B.CONSOLE); set(VX1, 1, SZ1 - 5, B.CONSOLE); bp.work(VX0 + 1, 1, SZ1 - 5, 'guard'); bp.work(VX1 - 1, 1, SZ1 - 5, 'guard');
  for (const z of [PZ0 + 1, PZ0 + 3, PZ0 + 5]) { set(VX0, 1, z, SLAB); set(VX1, 1, z, SLAB); bp.spot(VX0, 1, z, 'seat'); bp.spot(VX1, 1, z, 'seat'); }
  fill(VX0 - 1, 2, CZA + 2, VX0 - 1, 3, CZA + 3, B.HOLO_SIGN); fill(VX1 + 1, 2, CZA + 2, VX1 + 1, 3, CZA + 3, B.HOLO_SIGN);
  lampPost(VX0 + 2, 1, SZ1 - 1 - 0, 2); lampPost(VX1 - 2, 1, SZ1 - 1, 2);
  set(VX0 + 1, 1, PZ0, B.DURASTEEL_DARK); set(VX0 + 1, 2, PZ0, B.SPRUCE_LEAVES); set(VX1 - 1, 1, PZ0, B.DURASTEEL_DARK); set(VX1 - 1, 2, PZ0, B.SPRUCE_LEAVES);
  bp.spot(DX, 1, SZ1 - 3); bp.spot(DX + 1, 1, SZ1 - 4);
  bp.room('vestibule', VX0, Y.under, PZ0, VX1, SZ1 - 1);
  bp.meta.lobby = { x: bp.wx(DX), y: bp.wy(Y.under), z: bp.wz(SZ1 - 4) };
  // railings around the void on the corridor / terrace levels
  for (const y of [Y.s2, Y.s3, Y.terrace]) { rail(VX0, CZ1, VX1, CZ1, y); rail(VX0 - 1, PZ0, VX0 - 1, PZ1, y); rail(VX1 + 1, PZ0, VX1 + 1, PZ1, y); }
  // hall level: the grand stair lands at z 93, so railed ledges flank its top on the void edge (z 94) and rails close
  // the core pockets toward the drop
  for (const [a, b] of [[VX0, DX - 3], [DX + 4, VX1]]) { fill(a, Y.hall - 1, PZ0, b, Y.hall - 1, PZ0, B.DECK_PLATE); rail(a, PZ0, b, PZ0, Y.hall); }
  rail(VX0 - 1, PZ0, VX0 - 1, PZ1, Y.hall); rail(VX1 + 1, PZ0, VX1 + 1, PZ1, Y.hall);
  // terrace (y 21): railing on the hall edge, stairs up to the y 26 catwalk, vents and crates
  rail(HX0, SW + 1, HX1, SW + 1, Y.terrace); carve(VX0, Y.terrace, SW + 1, VX1, Y.terrace, SW + 1);
  // the stairs start one cell in from the railed hall edge (their foot is stepped onto from the side) and land on the
  // catwalk deck at z 102; the cell in front of the foot stays clear
  for (const sx of [40, 113]) for (let dx = 0; dx <= 1; dx++) stairRun(sx + dx, Y.terrace, CZ0 + 1, 0, 1, 10, -1);
  for (let x = 32; x <= 124; x += 12) { if (x >= 60 && x <= 96) continue; fill(x, Y.terrace, 97, x + 1, Y.terrace + 1, 98, B.VENT); set(x, Y.terrace + 2, 97, B.CHROME); set(x + 3, Y.terrace, 100, B.CRATE); set(x + 3, Y.terrace, 101, B.BARREL); lampPost(x + 6, Y.terrace, 96, 2); }
  for (const x of [50, 104]) { set(x, Y.terrace, 95, B.CONSOLE); bp.work(x, Y.terrace, 94, 'inspector'); set(x + 2, Y.terrace, 95, SLAB); bp.spot(x + 2, Y.terrace, 95, 'seat'); }
  // tool racks, coolant drums and valve stands in the alcove under the catwalk overhang (z 101), clear of the stairs
  for (let x = 26, i = 0; x <= HX1 - 2; x += 4, i++) {
    if ((x >= 38 && x <= 42) || (x >= 111 && x <= 115) || (x >= 60 && x <= 96) || solid(x, Y.terrace, 101) || solid(x + 1, Y.terrace, 101)) continue;
    const kind = i % 3;
    if (kind === 0) { set(x, Y.terrace, 101, B.SHELF); set(x, Y.terrace + 1, 101, B.SHELF); set(x + 1, Y.terrace, 101, B.CRATE); }
    else if (kind === 1) { set(x, Y.terrace, 101, B.BARREL); set(x + 1, Y.terrace, 101, B.BARREL); set(x, Y.terrace + 1, 101, B.IRON_BARS); set(x + 1, Y.terrace + 1, 101, B.PANEL_RED); }
    else { set(x, Y.terrace, 101, B.IRON_BLOCK); set(x, Y.terrace + 1, 101, B.CHROME); set(x, Y.terrace + 2, 101, B.PANEL_RED); set(x + 1, Y.terrace, 101, SLAB); bp.spot(x + 1, Y.terrace, 101, 'seat'); }
  }
  bp.room('terrace', HX0, Y.terrace, CZ0, BX0 - 2, RZ1); bp.room('terrace', BX1 + 2, Y.terrace, CZ0, HX1, RZ1);
  // 26: core landing pockets, connectors along the core sides, and the bridge along the void's north edge
  deck(BX0, PZ0, VX0 - 2, PZ1, Y.cat); deck(VX1 + 2, PZ0, BX1, PZ1, Y.cat);
  deck(62, CZ0, 64, SZ1 - 1, Y.cat); deck(91, CZ0, 93, SZ1 - 1, Y.cat);
  deck(BX0, SW, BX1, CZ1, Y.cat); rail(62, SW, 93, SW, Y.cat); rail(VX0, CZ1, VX1, CZ1, Y.cat);
  rail(VX0 - 1, PZ0, VX0 - 1, PZ1, Y.cat); rail(VX1 + 1, PZ0, VX1 + 1, PZ1, Y.cat); rail(62, CZ0, 62, 100, Y.cat); rail(93, CZ0, 93, 100, Y.cat);
  for (let z = CZ0; z <= SZ1 - 2; z += 3) { col(62, Y.terrace, z, Y.cat - 2, B.DURASTEEL_DARK); col(93, Y.terrace, z, Y.cat - 2, B.DURASTEEL_DARK); }
  for (const [x, k] of [[67, 0], [69, 1], [86, 2], [88, 3]]) {   // lamps, crates, a console and a vent stack beside the lane
    if (k === 0) lampPost(x, Y.cat, CZ1, 2); else if (k === 1) { set(x, Y.cat, CZ1, B.CRATE); set(x, Y.cat + 1, CZ1, B.BARREL); }
    else if (k === 2) { set(x, Y.cat, CZ1, B.CONSOLE); bp.work(x, Y.cat, CZ0, 'inspector'); } else { fill(x, Y.cat, CZ1, x, Y.cat + 1, CZ1, B.VENT); set(x, Y.cat + 2, CZ1, B.CHROME); }
  }
  bp.room('catwalk_bridge', 61, Y.cat, SW - 1, 94, CZ1 + 1);
  // boulevard lobby (36) over the void, between the cores
  fill(BX0 - 1, 35, SW, BX1 + 1, 35, SZ1 - 1, B.DECK_PLATE);
  for (let x = BX0; x <= BX1; x += 2) fill(x, 35, SW + 1, x, 35, SZ1 - 1, B.PANEL_BLACK);
  fill(DX - 1, 35, SW + 1, DX + 2, 35, SZ1 - 1, B.PANEL_STRIPE); for (let z = SW + 2; z <= SZ1 - 1; z += 3) { set(DX - 2, 35, z, B.GLOW_PANEL_BLUE); set(DX + 3, 35, z, B.GLOW_PANEL_BLUE); }
  fill(BX0 - 1, 40, SW, BX1 + 1, 40, SZ1 - 1, B.DURASTEEL_DARK);                 // lobby ceiling (aisles)
  for (let x = BX0 + 1; x <= BX1; x += 3) for (let z = SW + 1; z <= SZ1 - 1; z += 3) set(x, 40, z, B.GLOW_PANEL_BLUE);
  // the centre bay rises to a 7-block nave: banded side walls, a glass clerestory toward the hall, lit ceiling at 43
  carve(VX0, 40, SW + 1, VX1, 42, SZ1 - 1);
  fill(VX0 - 1, 43, SW, VX1 + 1, 43, SZ1 - 1, B.DURASTEEL_DARK); for (let x = VX0 + 1; x <= VX1; x += 3) for (let z = SW + 2; z <= SZ1 - 1; z += 3) set(x, 43, z, B.GLOW_PANEL_BLUE);
  for (const x of [VX0 - 1, VX1 + 1]) { fill(x, 40, SW + 1, x, 42, SZ1 - 1, B.DURASTEEL); fill(x, 41, SW + 1, x, 41, SZ1 - 1, B.PANEL_STRIPE); }
  fill(VX0, 40, CZ0, VX1, 42, CZ0, B.STEEL_GLASS); col(VX0 - 1, 40, CZ0, 42, B.CHROME); col(VX1 + 1, 40, CZ0, 42, B.CHROME);
  fill(VX0, 40, SZ1 - 1, VX1, 42, SZ1 - 1, B.HULL_PLATE); fill(VX0, 41, SZ1 - 1, VX1, 41, SZ1 - 1, B.PANEL_RED);
  fill(BX0 - 1, 36, SW, BX0 - 1, 39, PZ1, B.STEEL_GLASS); fill(BX1 + 1, 36, SW, BX1 + 1, 39, PZ1, B.STEEL_GLASS);   // side walls (glass) with doors
  col(BX0 - 1, 36, SW, 39, B.CHROME); col(BX1 + 1, 36, SW, 39, B.CHROME);
  fill(BX0 - 1, 36, CZ0, BX1 + 1, 39, CZ0, B.STEEL_GLASS); fill(BX0 - 1, 36, CZ0, BX1 + 1, 36, CZ0, B.DURASTEEL);   // north wall with the gallery opening
  carve(DX - 3, 36, CZ0, DX + 4, 38, CZ0); fill(DX - 4, 36, CZ0, DX - 4, 39, CZ0, B.CHROME); fill(DX + 5, 36, CZ0, DX + 5, 39, CZ0, B.CHROME); fill(DX - 3, 39, CZ0, DX + 4, 39, CZ0, B.GLOW_PANEL);
  carve(BX0 - 1, 36, PZ0, BX0 - 1, 37, PZ0 + 1); carve(BX1 + 1, 36, PZ0, BX1 + 1, 37, PZ0 + 1);
  fill(BX0 - 1, 38, PZ0, BX0 - 1, 38, PZ0 + 1, B.CHROME); fill(BX1 + 1, 38, PZ0, BX1 + 1, 38, PZ0 + 1, B.CHROME);
  deck(62, SW, BX0 - 2, SZ1 - 1, Y.gal); deck(BX1 + 2, SW, 93, SZ1 - 1, Y.gal); rail(62, SW, 62, 100, Y.gal); rail(93, SW, 93, 100, Y.gal);
  // lobby furniture: reception desk, holo wall, benches, planters, foundry model, lifts' call panels
  for (let x = VX0 + 1; x <= VX0 + 4; x++) { set(x, 36, SZ1 - 5, B.PANEL_BLACK); set(x, 37, SZ1 - 5, SLAB); }
  set(VX0 + 2, 36, SZ1 - 6, B.CONSOLE); bp.work(VX0 + 3, 36, SZ1 - 6, 'receptionist');
  // south wall of the lobby (inner skin z 103): hull plate with a stripe band, the boulevard door through it, holo walls
  fill(VX0, 36, SZ1 - 1, VX1, 38, SZ1 - 1, B.HULL_PLATE); fill(VX0, 39, SZ1 - 1, VX1, 39, SZ1 - 1, B.PANEL_STRIPE);
  carve(DX, 36, SZ1 - 1, DX + 1, 38, SZ1 - 1); col(DX - 1, 36, SZ1 - 1, 39, B.CHROME); col(DX + 2, 36, SZ1 - 1, 39, B.CHROME); fill(DX, 39, SZ1 - 1, DX + 1, 39, SZ1 - 1, B.CHROME);
  fill(VX0, 37, SZ1 - 1, DX - 2, 38, SZ1 - 1, B.HOLO_SIGN); fill(DX + 3, 37, SZ1 - 1, VX1, 38, SZ1 - 1, B.HOLO_SIGN);
  for (const x of [BX0, BX0 + 2, BX1 - 2, BX1]) { set(x, 36, CZ0 + 1, SLAB); bp.spot(x, 36, CZ0 + 1, 'seat'); }
  for (const [x, z] of [[VX1 - 1, SZ1 - 2], [VX1, SZ1 - 5], [VX0, SZ1 - 2]]) { set(x, 36, z, B.DURASTEEL_DARK); set(x, 37, z, B.OAK_LEAVES); }
  fill(VX1 - 3, 36, SZ1 - 6, VX1 - 2, 36, SZ1 - 5, B.PANEL_BLACK); set(VX1 - 3, 37, SZ1 - 6, B.FURNACE); set(VX1 - 2, 37, SZ1 - 5, B.MAGMA); set(VX1 - 2, 37, SZ1 - 6, B.CHROME);
  for (const x of [VX0 - 2, VX1 + 2]) { set(x, 36, PZ0 + 1, B.TABLE); set(x, 36, PZ0 + 2, SLAB); bp.spot(x, 36, PZ0 + 2, 'seat'); }
  bp.spot(DX, 36, SZ1 - 3); bp.spot(DX + 1, 36, CZ1);
  bp.room('boulevard_lobby', BX0, Y.gal, SW + 1, BX1, SZ1 - 1);

  // ------------------------------------------------------------------------------------------------ control gallery (y 36) hung over the floor
  const gx0 = 62, gx1 = 93, gz0 = 76, gz1 = 90;
  for (const [px, pz] of [[gx0 + 1, gz0 + 1], [gx1 - 2, gz0 + 1], [gx0 + 1, gz1 - 2], [gx1 - 2, gz1 - 2]]) { fill(px, 6, pz, px + 1, 34, pz + 1, B.DURASTEEL_DARK); for (let y = 9; y <= 33; y += 6) fill(px, y, pz, px + 1, y, pz + 1, B.PANEL_STRIPE); }
  fill(gx0, 34, gz0, gx1, 34, gz1, B.DURASTEEL_DARK); for (let x = gx0 + 3; x <= gx1; x += 4) for (let z = gz0 + 3; z <= gz1; z += 4) set(x, 34, z, B.GLOW_PANEL);
  fill(gx0, 35, gz0, gx1, 35, gz1, B.DECK_PLATE); for (let x = gx0 + 2; x <= gx1; x += 4) fill(x, 35, gz0 + 1, x, 35, gz1 - 1, B.PANEL_BLACK); for (let z = gz0 + 2; z <= gz1; z += 4) set(DX, 35, z, B.GLOW_PANEL_BLUE);
  carve(gx0, 36, gz0, gx1, 38, gz1);
  ring(gx0, 36, gz0, gx1, 38, gz1, B.STEEL_GLASS);
  for (const x of [gx0, gx0 + 8, gx0 + 16, gx0 + 24, gx1]) col(x, 36, gz0, 38, B.CHROME);
  col(gx0, 36, gz1, 38, B.CHROME); col(gx1, 36, gz1, 38, B.CHROME); col(gx0, 36, (gz0 + gz1) >> 1, 38, B.CHROME); col(gx1, 36, (gz0 + gz1) >> 1, 38, B.CHROME);
  fill(gx0, 39, gz0, gx1, 39, gz1, B.DURASTEEL_DARK); for (let x = gx0 + 2; x <= gx1; x += 4) for (let z = gz0 + 2; z <= gz1; z += 4) set(x, 39, z, B.GLOW_PANEL_BLUE);
  carve(gx0 + 1, 36, gz1, gx1 - 1, 38, gz1); fill(gx0 + 1, 36, gz1, gx1 - 1, 38, gz1, B.STEEL_GLASS); carve(DX - 3, 36, gz1, DX + 4, 38, gz1);   // opening toward the lobby
  for (let x = gx0 + 2; x <= gx1 - 2; x++) {                       // console bank along the north glass, operators, screens
    set(x, 36, gz0 + 1, B.CONSOLE);
    if (x % 2 === 0) { set(x, 36, gz0 + 2, SLAB); bp.work(x, 36, gz0 + 2, 'controller'); }
    if (x % 6 === 2) { set(x, 38, gz0 + 3, B.HOLO_SIGN); set(x + 1, 38, gz0 + 3, B.HOLO_SIGN); }
  }
  fill(DX - 1, 36, gz0 + 6, DX + 1, 36, gz0 + 8, B.PANEL_BLACK); set(DX, 37, gz0 + 7, B.GLOW_PANEL_BLUE);   // holo table
  for (const [x, z] of [[DX - 2, gz0 + 7], [DX + 2, gz0 + 7], [DX, gz0 + 5], [DX, gz0 + 9]]) bp.spot(x, 36, z);
  set(gx1 - 3, 36, gz1 - 2, B.CONSOLE); set(gx1 - 2, 36, gz1 - 2, B.TABLE); set(gx1 - 3, 36, gz1 - 3, SLAB); bp.work(gx1 - 3, 36, gz1 - 3, 'shift chief');
  for (let x = gx0 + 2; x <= gx0 + 8; x++) { set(x, 36, gz1 - 1, B.IRON_BLOCK); set(x, 37, gz1 - 1, x % 2 ? B.IRON_BARS : B.IRON_BLOCK); }
  for (let x = gx1 - 8; x <= gx1 - 2; x++) { set(x, 36, gz1 - 1, B.IRON_BLOCK); set(x, 37, gz1 - 1, x % 2 ? B.GLOW_PANEL_BLUE : B.PANEL_BLACK); }   // server / relay racks
  for (let x = gx0 + 3; x <= gx1 - 3; x += 5) { set(x, 38, gz0 + 1, B.PANEL_RED); }                                                          // warning lamps over the glass
  set(gx0 + 10, 36, gz1 - 1, B.BARREL); set(gx0 + 11, 36, gz1 - 1, B.TABLE); set(gx0 + 12, 36, gz1 - 1, B.SHELF);
  for (const x of [gx0 + 5, gx1 - 5]) { set(x, 36, gz0 + 10, B.PANEL_BLACK); set(x, 37, gz0 + 10, B.GLOW_PANEL_BLUE); set(x, 38, gz0 + 10, B.PANEL_RED); }
  for (const x of [gx0 + 3, gx1 - 3]) { set(x, 36, gz1 - 4, B.TABLE); set(x - 1, 36, gz1 - 4, SLAB); set(x + 1, 36, gz1 - 4, SLAB); bp.spot(x - 1, 36, gz1 - 4, 'seat'); bp.spot(x + 1, 36, gz1 - 4, 'seat'); }
  for (const x of [DX - 9, DX + 7]) {                              // two operator islands flanking the holo table
    fill(x, 36, gz0 + 5, x + 2, 36, gz0 + 5, B.CONSOLE); for (let dx = 0; dx <= 2; dx++) { set(x + dx, 36, gz0 + 6, SLAB); bp.work(x + dx, 36, gz0 + 6, 'analyst'); }
    set(x + 1, 37, gz0 + 5, B.HOLO_SIGN);
  }
  bp.room('control_gallery', gx0, Y.gal, gz0, gx1, gz1);

  // ------------------------------------------------------------------------------------------------ roof: clerestory, skylights, vents, tanks
  carve(NX0, Y.roof, NVZ0, NX1, Y.nave - 1, NVZ1);
  ring(NX0, Y.roof, NVZ0, NX1, Y.nave - 1, NVZ1, B.DURASTEEL_DARK);
  for (let x = NX0; x <= NX1; x++) if ((x - NX0) % 4 !== 0) for (const z of [NVZ0, NVZ1]) { fill(x, 46, z, x, 49, z, (x - NX0) % 4 === 2 ? B.STEEL_GLASS : B.WINDOW_LIT); set(x, 45, z, B.HULL_PLATE); }
  for (let z = NVZ0; z <= NVZ1; z++) if ((z - NVZ0) % 4 !== 0) for (const x of [NX0, NX1]) { fill(x, 46, z, x, 49, z, (z - NVZ0) % 4 === 2 ? B.STEEL_GLASS : B.WINDOW_LIT); set(x, 45, z, B.HULL_PLATE); }
  fill(NX0, 50, NVZ0, NX1, 50, NVZ0, B.PANEL_STRIPE); fill(NX0, 50, NVZ1, NX1, 50, NVZ1, B.PANEL_STRIPE);
  fill(NX0, Y.nave, NVZ0, NX1, Y.nave, NVZ1, B.DURASTEEL_DARK);
  for (let x = NX0 + 4; x < NX1 - 2; x += 6) fill(x, Y.nave, NVZ0 + 3, x, Y.nave, NVZ1 - 3, B.STEEL_GLASS);
  fill(NX0 + 2, Y.nave, TRZ0, NX1 - 2, Y.nave, TRZ1, B.GLOW_PANEL);
  ring(NX0, Y.nave, NVZ0, NX1, Y.nave, NVZ1, B.HULL_PLATE);
  // aisle roof pattern + equipment
  for (let x = SX0 + 4; x <= SX1; x += 8) fill(x, Y.roof, SZ0, x, Y.roof, SZ1, B.DURASTEEL_DARK);
  for (let z = SZ0 + 4; z <= SZ1; z += 8) fill(SX0, Y.roof, z, SX1, Y.roof, z, B.DURASTEEL_DARK);
  ring(SX0, Y.roof, SZ0, SX1, Y.roof, SZ1, B.PANEL_STRIPE);
  fill(SX0, Y.roof + 1, SZ0, SX1, Y.roof + 1, SZ0, B.IRON_BARS); fill(SX0, Y.roof + 1, SZ0, SX0, Y.roof + 1, SZ1, B.IRON_BARS); fill(SX1, Y.roof + 1, SZ0, SX1, Y.roof + 1, SZ1, B.IRON_BARS);
  for (let x = 30; x <= 124; x += 16) { for (const z of [18, 96]) { fill(x, Y.roof + 1, z, x + 2, Y.roof + 2, z + 2, B.VENT); fill(x, Y.roof + 3, z, x + 2, Y.roof + 3, z + 2, B.CHROME); set(x + 1, Y.roof + 3, z + 1, B.GLOW_PANEL); } }
  for (let x = 34; x <= 120; x += 10) { col(x, Y.roof + 1, 26, Y.roof + 4, B.IRON_BARS); set(x, Y.roof + 5, 26, B.GLOW_PANEL_BLUE); }
  SMELT.forEach(flue);

  // ------------------------------------------------------------------------------------------------ roofscape
  // ridge monitor: a long lantern along the nave roof over the trench, louvres and glass lit by the strip below it
  const MZ0 = TRZ0 - 2, MZ1 = TRZ1 + 2, MX0 = NX0 + 3, MX1 = NX1 - 3;
  for (let x = MX0; x <= MX1; x++) {
    const end = x === MX0 || x === MX1, k = (x - MX0) % 4;
    for (const z of [MZ0, MZ1]) fill(x, Y.nave + 1, z, x, Y.nave + 3, z, end || k === 0 ? B.DURASTEEL_DARK : (k === 2 ? B.VENT : B.STEEL_GLASS));
    fill(x, Y.nave + 4, MZ0, x, Y.nave + 4, MZ1, end || k === 0 ? B.PANEL_STRIPE : B.DURASTEEL_DARK);
    if (k === 2 && !end) { set(x, Y.nave + 2, MZ0, B.WINDOW_LIT); set(x, Y.nave + 2, MZ1, B.WINDOW_LIT); }
  }
  for (const x of [MX0, MX1]) { fill(x, Y.nave + 1, MZ0 + 1, x, Y.nave + 3, MZ1 - 1, B.DURASTEEL_DARK); set(x, Y.nave + 2, TRZ0 + 1, B.PANEL_RED); set(x, Y.nave + 3, TRZ0 + 1, B.GLOW_PANEL); }
  for (let x = MX0 + 4; x < MX1; x += 8) { set(x, Y.nave + 5, TRZ0 + 1, B.VENT); set(x, Y.nave + 6, TRZ0 + 1, B.CHROME); }   // cowls on the ridge
  // hyperboloid cooling towers on the south corners of the aisle roof, a water basin inside, lit rim
  const coolingTower = (cx, cz) => {
    const prof = [4.6, 4.3, 4.0, 3.7, 3.4, 3.2, 3.1, 3.1, 3.2, 3.4, 3.6, 3.8];
    prof.forEach((r, i) => bp.disc(cx + 0.5, cz + 0.5, r, Y.roof + 1 + i, Y.roof + 1 + i, i === 0 ? B.PANEL_STRIPE : (i === 4 || i === prof.length - 1 ? B.DURASTEEL_DARK : B.HULL_PLATE), true));
    bp.disc(cx + 0.5, cz + 0.5, 3.6, Y.roof + 1, Y.roof + 1, B.WATER);
    bp.disc(cx + 0.5, cz + 0.5, 3.8, Y.roof + 1 + prof.length, Y.roof + 1 + prof.length, B.GLOW_PANEL, true);
    for (const [dx, dz] of [[-5, 0], [5, 0], [0, -5], [0, 5]]) { col(cx + dx, Y.roof + 1, cz + dz, Y.roof + 3, B.IRON_BARS); set(cx + dx, Y.roof + 4, cz + dz, B.PANEL_RED); }   // stays
  };
  coolingTower(30, 90); coolingTower(124, 90);
  // pipe racks along both aisle roofs feeding the cooling towers: twin pipes on brackets, valves, a chrome elbow at the head
  for (const [xa, xb] of [[26, 28], [126, 128]]) {
    fill(xa, Y.roof + 2, 30, xa, Y.roof + 2, 85, B.DURASTEEL_DARK); fill(xb, Y.roof + 2, 30, xb, Y.roof + 2, 85, B.DURASTEEL_DARK);
    for (let z = 32; z <= 84; z += 8) fill(xa, Y.roof + 1, z, xb, Y.roof + 1, z, B.DURASTEEL_DARK);
    for (let z = 36; z <= 84; z += 16) { set(xa, Y.roof + 3, z, B.CHROME); set(xb, Y.roof + 3, z + 8, B.PANEL_RED); }
    for (const x of [xa, xb]) { set(x, Y.roof + 2, 30, B.CHROME); set(x, Y.roof + 1, 30, B.CHROME); }
  }
  // gas spheres on legs beside the nave, fed from the pipe racks
  for (const [x, z, px0, px1] of [[36, 60, 29, 35], [36, 72, 29, 35], [118, 60, 119, 125], [118, 72, 119, 125]]) {
    sphere(x, Y.roof + 5, z, 3, B.CHROME);
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) col(x + dx, Y.roof + 1, z + dz, Y.roof + 3, B.IRON_BARS);
    fill(px0, Y.roof + 2, z, px1, Y.roof + 2, z, B.DURASTEEL_DARK); set(x, Y.roof + 9, z, B.GLOW_PANEL_BLUE); set(x, Y.roof + 2, z, B.PANEL_RED);
  }
  // skylight monitors over the north and south strips: glass-sided boxes with a lit core
  for (const z of [14, 86]) for (const x0 of [42, 48, 54, 96, 102, 108]) {
    fill(x0, Y.roof + 1, z, x0 + 4, Y.roof + 1, z + 2, B.STEEL_GLASS); fill(x0 + 1, Y.roof + 1, z + 1, x0 + 3, Y.roof + 1, z + 1, B.GLOW_PANEL);
    fill(x0, Y.roof + 2, z, x0 + 4, Y.roof + 2, z + 2, B.DURASTEEL_DARK); fill(x0, Y.roof + 2, z + 1, x0 + 4, Y.roof + 2, z + 1, B.PANEL_STRIPE);
    set(x0, Y.roof + 1, z, B.DURASTEEL_DARK); set(x0 + 4, Y.roof + 1, z, B.DURASTEEL_DARK); set(x0, Y.roof + 1, z + 2, B.DURASTEEL_DARK); set(x0 + 4, Y.roof + 1, z + 2, B.DURASTEEL_DARK);
  }

  // ------------------------------------------------------------------------------------------------ stack yard: chimneys, spheres, pipe bridges
  const chimney = (cx, cz, r, top) => {
    bp.disc(cx + 0.5, cz + 0.5, r + 1.6, 0, 2, B.HULL_PLATE);
    bp.disc(cx + 0.5, cz + 0.5, r + 1.6, 3, 3, B.PANEL_STRIPE, true); bp.disc(cx + 0.5, cz + 0.5, r + 0.6, 3, 3, B.HULL_PLATE);
    bp.disc(cx + 0.5, cz + 0.5, r + 0.5, 4, top, B.DURASTEEL_DARK);
    bp.disc(cx + 0.5, cz + 0.5, r + 0.5, 18, 19, B.VENT, true);
    bp.disc(cx + 0.5, cz + 0.5, r + 0.5, top - 12, top - 11, B.PANEL_RED, true);
    bp.disc(cx + 0.5, cz + 0.5, r + 0.5, top - 7, top - 6, B.PANEL_RED, true);
    // the crown: the shaft flares out into a wider cap with a lit collar and a chrome rim; molten throat inside
    bp.disc(cx + 0.5, cz + 0.5, r + 1.5, top - 4, top - 3, B.DURASTEEL_DARK, true);
    bp.disc(cx + 0.5, cz + 0.5, r + 1.5, top - 2, top - 2, B.GLOW_PANEL, true); bp.disc(cx + 0.5, cz + 0.5, r + 0.5, top - 2, top - 2, B.CHROME, true);
    bp.disc(cx + 0.5, cz + 0.5, r + 1.5, top - 1, top - 1, B.CHROME, true); bp.disc(cx + 0.5, cz + 0.5, r + 0.5, top - 1, top - 1, B.VENT, true);
    bp.disc(cx + 0.5, cz + 0.5, r - 0.5, top - 1, top, B.MAGMA);                    // molten throat, flush with the rim
    for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) { set(cx + dx, top, cz + dz, B.PANEL_RED); set(cx + dx, top - 11, cz + dz, B.GLOW_PANEL); set(cx + dx, top - 6, cz + dz, B.GLOW_PANEL); }   // nav lights on the bands
    col(cx, 4, cz + r, top - 5, B.IRON_BARS);
  };
  for (const cx of SMELT) chimney(cx, 6, 5, Y.stack);
  chimney(108, 6, 3, 52); chimney(124, 6, 3, 52);
  for (let i = 0; i < SMELT.length - 1; i++) {
    const a = SMELT[i] + 5, b = SMELT[i + 1] - 5, m = (a + b) >> 1;
    fill(a, 24, 5, b, 25, 6, B.DURASTEEL_DARK); fill(m, 24, 5, m, 25, 6, B.PANEL_RED);
    col(m, 1, 5, 23, B.IRON_BARS); col(m, 1, 6, 23, B.IRON_BARS);
    sphere(m, 10, 5, 3, B.CHROME); for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) col(m + dx, 1, 5 + dz, 7, B.IRON_BARS);
    set(m, 14, 5, B.GLOW_PANEL_BLUE);
  }
  fill(SMELT[3] + 5, 24, 5, 105, 25, 6, B.DURASTEEL_DARK); fill(111, 24, 5, 121, 25, 6, B.DURASTEEL_DARK);
  for (const x of [98, 116]) { col(x, 1, 5, 23, B.IRON_BARS); col(x, 1, 6, 23, B.IRON_BARS); }
  for (let x = 26; x <= 128; x += 10) { set(x, 1, 1, B.BARREL); if (x % 20 === 6) set(x, 2, 1, B.BARREL); }
  for (let x = 30; x <= 128; x += 24) lampPost(x, 1, 10, 3);
  for (const cx of SMELT) for (const dx of [-7, 7]) { set(cx + dx, 1, 6, B.PANEL_RED); set(cx + dx, 2, 6, B.GLOW_PANEL); }   // hazard beacons at the chimney feet
  // container stacks between the chimney feet and two gantry cranes spanning the yard, so the yard reads as a working
  // stack yard rather than an empty apron
  for (let i = 0; i < SMELT.length - 1; i++) {
    const a = SMELT[i] + 8, b = SMELT[i + 1] - 8;
    for (let x = a; x + 1 <= b; x += 4) { const id = (x % 3 === 0) ? B.PANEL_RED : (x % 3 === 1) ? B.DURASTEEL : B.PANEL_STRIPE; fill(x, 1, 8, x + 1, 2, 9, id); if (x % 2 === 0) fill(x, 3, 8, x + 1, 3, 9, B.DURASTEEL_DARK); set(x, 1, 10, B.CRATE); }
  }
  for (const gx of [SMELT[1] - 3, SMELT[3] + 3]) {
    col(gx, 1, 0, 12, B.IRON_BLOCK); col(gx, 1, 11, 12, B.IRON_BLOCK); fill(gx, 13, 0, gx, 13, 11, B.CHROME); fill(gx - 1, 13, 5, gx + 1, 13, 6, B.DURASTEEL_DARK);
    col(gx, 9, 5, 12, B.IRON_BARS); set(gx, 8, 5, B.IRON_BLOCK); set(gx, 13, 3, B.GLOW_PANEL); set(gx, 13, 8, B.GLOW_PANEL);   // hook on its chain, deck lights
  }
  bp.room('stack_yard', SX0 - 1, Y.under, 0, SX1 + 1, 11);

  // ------------------------------------------------------------------------------------------------ ore yard (west)
  const silo = (cx, cz) => {
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) col(cx + dx, 1, cz + dz, 8, B.DURASTEEL_DARK);
    bp.disc(cx + 0.5, cz + 0.5, 1.6, 9, 9, B.DURASTEEL_DARK); bp.disc(cx + 0.5, cz + 0.5, 2.6, 10, 10, B.DURASTEEL_DARK); bp.disc(cx + 0.5, cz + 0.5, 3.6, 11, 11, B.DURASTEEL_DARK);
    bp.disc(cx + 0.5, cz + 0.5, 4.5, 12, 28, B.DURASTEEL);
    bp.disc(cx + 0.5, cz + 0.5, 4.5, 14, 14, B.HULL_PLATE, true); bp.disc(cx + 0.5, cz + 0.5, 4.5, 20, 21, B.PANEL_STRIPE, true); bp.disc(cx + 0.5, cz + 0.5, 4.5, 26, 26, B.HULL_PLATE, true);
    bp.disc(cx + 0.5, cz + 0.5, 4.5, 29, 29, B.DURASTEEL_DARK); bp.disc(cx + 0.5, cz + 0.5, 3.5, 30, 30, B.DURASTEEL_DARK); bp.disc(cx + 0.5, cz + 0.5, 2.2, 31, 31, B.CHROME); set(cx, 32, cz, B.GLOW_PANEL);
    col(cx - 4, 9, cz, 29, B.IRON_BARS);
    for (let i = 0; i < 4; i++) set(cx + 1 + i, 9 + i, cz, B.DURASTEEL_DARK);      // chute down to the collector belt
  };
  for (const cz of [30, 54, 78]) silo(10, cz);
  fill(14, 15, 26, 16, 15, 82, B.DECK_PLATE); fill(15, 16, 26, 15, 16, 82, B.RAIL); fill(14, 16, 26, 14, 16, 82, B.IRON_BARS); fill(16, 16, 26, 16, 16, 82, B.IRON_BARS);
  for (let z = 26; z <= 82; z += 8) { col(15, 1, z, 14, B.DURASTEEL_DARK); set(15, 15, z + 4, B.GLOW_PANEL); }
  fill(14, 15, GZ0, SX0, 15, GZ1, B.DECK_PLATE); fill(14, 16, GZ0 + 1, SX0, 16, GZ0 + 1, B.RAIL);       // covered bridge into the hall
  fill(17, 16, GZ0, SX0 - 1, 17, GZ0, B.IRON_BARS); fill(17, 16, GZ1, SX0 - 1, 17, GZ1, B.IRON_BARS); fill(17, 18, GZ0, SX0 - 1, 18, GZ1, B.DURASTEEL_DARK);
  carve(SX0, 16, GZ0, SX0, 17, GZ1); ring(SX0, 15, GZ0 - 1, SX0, 18, GZ1 + 1, B.PANEL_STRIPE); carve(SX0, 16, GZ0, SX0, 17, GZ1);
  const ores = [B.IRON_ORE, B.GOLD_ORE, B.COAL_ORE, B.GRAVEL, B.ASH, B.SCORCHED_STONE, B.COBBLESTONE];
  for (const [x, z, r] of [[3, 8, 2], [3, 16, 2], [3, 40, 2], [3, 66, 2], [3, 92, 2], [3, 100, 2], [19, 8, 2], [19, 16, 1], [19, 92, 2], [19, 100, 1]]) pile(x, z, r, rng.pick(ores));
  for (let z = 12; z <= 100; z += 12) { fill(1, 1, z, 5, 1, z, B.HULL_PLATE); }
  for (let z = 6; z <= 100; z += 20) lampPost(1, 1, z, 3);
  set(6, 1, 90, B.CHROME); set(7, 1, 90, B.PANEL_RED); set(8, 1, 90, B.CHROME); set(7, 2, 90, B.GLASS); set(7, 1, 91, B.DURASTEEL_DARK); bp.work(7, 1, 88, 'loader');   // parked loader
  // west door from the casting floor down into the yard
  // (3 x 3 landing on posts in front of the door, railed on its open north and west sides)
  doorway(SX0, Y.hall, 66, false, 2, 3); fill(SX0 - 3, 5, 65, SX0 - 1, 5, 67, B.DECK_PLATE); fill(SX0 - 2, 1, 66, SX0 - 1, 4, 67, B.DURASTEEL_DARK);
  col(SX0 - 3, 1, 65, 4, B.IRON_BLOCK); set(SX0 - 3, 4, 66, B.GLOW_PANEL); set(SX0 - 3, 4, 67, B.DURASTEEL_DARK); set(SX0 - 2, 4, 65, B.DURASTEEL_DARK); set(SX0 - 1, 4, 65, B.DURASTEEL_DARK);
  rail(SX0 - 3, 65, SX0 - 1, 65, Y.hall); rail(SX0 - 3, 66, SX0 - 3, 67, Y.hall);
  for (let dx = 0; dx <= 1; dx++) stairRun(SX0 - 2 + dx, Y.under, 77, 0, -1, 10, 1);
  bp.door(SX0, Y.hall, 66, 'W');
  bp.room('ore_yard', 0, Y.under, 0, SX0, SZ1);

  // ------------------------------------------------------------------------------------------------ loading yard (east): dock, ramp, truck, containers
  fill(SX1 + 1, 1, 40, SX1 + 5, 5, 75, B.HULL_PLATE); fill(SX1 + 1, 5, 40, SX1 + 5, 5, 75, B.DECK_PLATE); fill(SX1 + 5, 5, 40, SX1 + 5, 5, 75, B.PANEL_STRIPE);
  for (let z = 42; z <= 74; z += 6) { set(SX1 + 5, 6, z, B.IRON_BARS); }
  for (const z of [44, 54, 64]) { doorway(SX1, Y.hall, z, false, 4, 5); fill(SX1, Y.hall + 6, z, SX1, Y.hall + 6, z + 3, B.PANEL_STRIPE); bp.spot(SX1 + 2, Y.hall, z + 1); }
  bp.work(SX1 + 4, Y.hall, 50, 'dock hand'); bp.work(SX1 + 4, Y.hall, 70, 'dock hand');
  // pallets waiting between the doors, dock lamps, a dispatch console, glow strips in the deck
  for (const z of [49, 59, 69]) { fill(SX1 + 1, Y.hall, z, SX1 + 2, Y.hall, z + 2, B.CRATE); fill(SX1 + 1, Y.hall + 1, z, SX1 + 1, Y.hall + 1, z + 1, cargo()); set(SX1 + 2, Y.hall + 1, z + 2, B.BARREL); }
  for (const z of [42, 52, 62, 72]) { lampPost(SX1 + 4, Y.hall, z, 3); set(SX1 + 3, Y.hall - 1, z, B.GLOW_PANEL); }
  set(SX1 + 1, Y.hall, 41, B.CONSOLE); set(SX1 + 1, Y.hall + 1, 41, B.HOLO_SIGN); bp.work(SX1 + 2, Y.hall, 41, 'dispatcher');
  set(SX1 + 3, Y.hall, 47, B.IRON_BLOCK); set(SX1 + 3, Y.hall + 1, 47, B.PANEL_RED); set(SX1 + 4, Y.hall, 47, B.CHROME);    // parked pallet jack
  for (let dx = 0; dx <= 3; dx++) stairRun(SX1 + 1 + dx, Y.under, 85, 0, -1, 10, 1);                    // vehicle ramp (south end)
  for (let dx = 0; dx <= 1; dx++) stairRun(SX1 + 2 + dx, Y.under, 30, 0, 1, 10, 1);                     // stairs (north end, clear of the pilaster)
  bp.room('loading_dock', SX1, Y.hall, 39, SX1 + 6, 76);
  // speeder truck backed up to the dock
  const tx = SX1 + 7, tz = 56;
  fill(tx + 1, 1, tz + 1, tx + 2, 1, tz + 3, B.PANEL_BLACK); fill(tx + 9, 1, tz + 1, tx + 10, 1, tz + 3, B.PANEL_BLACK);
  fill(tx, 2, tz, tx + 9, 4, tz + 4, B.HULL_PLATE); fill(tx, 3, tz, tx + 9, 3, tz, B.PANEL_RED); fill(tx, 3, tz + 4, tx + 9, 3, tz + 4, B.PANEL_RED);
  for (const x of [tx + 2, tx + 6]) { set(x, 4, tz, B.VENT); set(x, 4, tz + 4, B.VENT); }
  fill(tx, 3, tz + 1, tx, 3, tz + 3, B.CHROME); set(tx, 3, tz + 2, B.GLOW_PANEL);
  for (let x = tx + 1; x <= tx + 8; x++) for (let z = tz + 1; z <= tz + 3; z++) if (rng.chance(0.7)) { set(x, 5, z, cargo()); if (rng.chance(0.3)) set(x, 6, z, cargo()); }
  fill(tx + 10, 2, tz, tx + 12, 4, tz + 4, B.PANEL_RED); fill(tx + 10, 5, tz, tx + 12, 5, tz + 4, B.STEEL_GLASS); fill(tx + 10, 6, tz, tx + 12, 6, tz + 4, B.DURASTEEL_DARK);
  fill(tx + 12, 5, tz + 1, tx + 12, 5, tz + 3, B.STEEL_GLASS); set(tx + 12, 3, tz, B.GLOW_PANEL); set(tx + 12, 3, tz + 4, B.GLOW_PANEL); set(tx + 12, 4, tz + 2, B.PANEL_BLACK);
  fill(tx, 0, tz - 1, tx + 12, 0, tz - 1, B.PANEL_STRIPE); fill(tx, 0, tz + 5, tx + 12, 0, tz + 5, B.PANEL_STRIPE);
  bp.work(tx + 6, 1, tz - 2, 'driver');
  // containers, fuel depot, yard crane, lamps, fence
  const container = (x, z, y) => { fill(x, y, z, x + 3, y + 2, z + 3, B.HULL_PLATE); fill(x, y + 1, z, x + 3, y + 1, z, B.PANEL_STRIPE); fill(x, y + 1, z + 3, x + 3, y + 1, z + 3, B.PANEL_STRIPE); fill(x + 3, y, z, x + 3, y + 2, z + 3, B.PANEL_RED); set(x + 3, y + 1, z + 1, B.PANEL_BLACK); };
  container(140, 22, 1); container(140, 22, 4); container(145, 22, 1); container(140, 27, 1); container(145, 27, 1); container(145, 27, 4); container(150, 22, 1);
  for (let x = 147; x <= 152; x++) for (let z = 88; z <= 92; z++) if ((x + z) % 2 === 0) { set(x, 1, z, B.BARREL); if (rng.chance(0.4)) set(x, 2, z, B.BARREL); }
  bp.disc(150.5, 97.5, 2.4, 1, 5, B.CHROME); set(150, 6, 97, B.PANEL_RED); ring(146, 1, 86, 153, 1, 94, B.IRON_BARS); carve(146, 1, 89, 146, 1, 90);
  col(138, 1, 79, 12, B.DURASTEEL_DARK); fill(138, 12, 79, 147, 12, 79, B.IRON_BARS); fill(144, 12, 78, 146, 12, 80, B.DURASTEEL_DARK); col(145, 8, 79, 11, B.IRON_BARS); set(145, 7, 79, B.CRATE);
  set(138, 13, 79, B.GLOW_PANEL); bp.work(139, 1, 81, 'crane hand');
  for (let z = 6; z <= 100; z += 20) lampPost(W - 2, 1, z, 3);
  for (const [x, z] of [[136, 12], [140, 12], [136, 98]]) { set(x, 1, z, B.CRATE); set(x + 1, 1, z, B.CRATE); set(x, 2, z, B.CRATE); }
  bp.room('loading_yard', SX1, Y.under, 0, W - 1, SZ1);
  // lot-edge fences with gates on the south side
  for (const [x0, x1] of [[0, SX0 - 1], [SX1 + 1, W - 1]]) { fill(x0, 1, SZ1, x1, 1, SZ1, B.HULL_PLATE); fill(x0, 2, SZ1, x1, 2, SZ1, B.IRON_BARS); fill(x0, 1, 0, x1, 1, 0, B.HULL_PLATE); fill(x0, 2, 0, x1, 2, 0, B.IRON_BARS); }
  fill(0, 1, 0, 0, 1, SZ1, B.HULL_PLATE); fill(0, 2, 0, 0, 2, SZ1, B.IRON_BARS); fill(W - 1, 1, 0, W - 1, 1, SZ1, B.HULL_PLATE); fill(W - 1, 2, 0, W - 1, 2, SZ1, B.IRON_BARS);
  for (const gx of [8, 141]) { carve(gx, 1, SZ1, gx + 3, 3, SZ1); col(gx - 1, 1, SZ1, 4, B.CHROME); col(gx + 4, 1, SZ1, 4, B.CHROME); fill(gx, 4, SZ1, gx + 3, 4, SZ1, B.HOLO_SIGN); bp.door(gx + 1, Y.under, SZ1, 'S'); }

  // ------------------------------------------------------------------------------------------------ facade + outer walls
  // south: pilasters every 8 with recessed bays showing the hull-plate inner skin, window rows, lit slots, hazard band
  for (let x = SX0 + 1; x < SX1; x++) {
    if (x >= VX0 && x <= VX1) continue;
    const pil = ((x - SX0) % 8) < 2;
    if (pil) { for (const y of [9, 14, 19, 24, 29]) set(x, y, SZ1, B.HULL_PLATE); continue; }
    carve(x, 5, SZ1, x, Y.roof - 1, SZ1);
    col(x, 5, SZ1 - 1, Y.roof - 1, B.HULL_PLATE);
    for (const wy of [7, 12, 17]) { set(x, wy, SZ1 - 1, lit()); set(x, wy + 1, SZ1 - 1, B.DURASTEEL_DARK); }
    if ((x - SX0) % 8 === 5) col(x, 23, SZ1 - 1, 40, B.GLOW_PANEL);
    else if ((x - SX0) % 8 === 3) { fill(x, 24, SZ1 - 1, x, 25, SZ1 - 1, B.WINDOW_LIT); fill(x, 30, SZ1 - 1, x, 31, SZ1 - 1, B.WINDOW_LIT); fill(x, 37, SZ1 - 1, x, 38, SZ1 - 1, B.WINDOW_LIT); }
    else { for (const wy of [26, 29, 32, 35, 38, 41]) set(x, wy, SZ1 - 1, lit()); }
    set(x, 21, SZ1 - 1, B.PANEL_STRIPE); set(x, 42, SZ1 - 1, B.VENT);
    for (const y of [2, 3]) set(x, y, SZ1, x % 3 === 0 ? B.VENT : B.HULL_TRENCH);
  }
  fill(SX0, 34, SZ1, SX1, 35, SZ1, B.PANEL_STRIPE); fill(HX0, 34, SZ1 - 1, HX1, 35, SZ1 - 1, B.PANEL_STRIPE);
  for (let x = SX0 + 2; x < SX1; x += 4) { set(x, 34, SZ1, B.GLOW_PANEL); set(x, 34, SZ1 - 1, B.GLOW_PANEL); }   // lit plinth band at deck level
  // cornice on all four sides: chrome with a glow cell every third block, so the roofline reads at night
  const cornice = (x, z, i) => set(x, Y.roof - 1, z, i % 3 === 1 ? B.GLOW_PANEL : B.CHROME);
  for (let x = SX0; x <= SX1; x++) { cornice(x, SZ1, x); cornice(x, SZ0, x); }
  for (let z = SZ0; z <= SZ1; z++) { cornice(SX0, z, z); cornice(SX1, z, z); }
  // the portal: void face with lit slots, gable with the vent rose, holo billboard, both doors
  for (const x of [VX0 + 2, VX1 - 2]) col(x, 6, SZ1, 33, B.GLOW_PANEL);
  for (let y = 7; y <= 33; y += 2) { set(DX, y, SZ1, B.WINDOW_LIT); set(DX + 1, y, SZ1, B.WINDOW_LIT); }
  fill(62, Y.roof, SZ1 - 1, 93, 50, SZ1, B.DURASTEEL_DARK); fill(62, 50, SZ1, 93, 50, SZ1, B.PANEL_STRIPE); fill(64, 51, SZ1 - 1, 91, 51, SZ1, B.DURASTEEL_DARK);
  for (const x of [62, 93]) col(x, Y.roof, SZ1, 53, B.DURASTEEL_DARK);
  for (const x of [63, 92]) { col(x, 51, SZ1, 55, B.IRON_BARS); set(x, 56, SZ1, B.GLOW_PANEL_BLUE); }
  for (const x of [65, 67, 69, 87, 89, 91]) { fill(x, 46, SZ1, x, 47, SZ1, B.WINDOW_LIT); set(x, 48, SZ1, B.HULL_PLATE); }   // lit gable windows
  // stepped crown over the gable: three setbacks, each with a lit top band and glow slots
  for (const [x0, x1, y] of [[66, 89, 52], [70, 85, 54], [74, 81, 56]]) {
    fill(x0, y, SZ1 - 1, x1, y + 1, SZ1, B.DURASTEEL_DARK);
    fill(x0 + 1, y + 1, SZ1, x1 - 1, y + 1, SZ1, B.PANEL_STRIPE);
    for (let x = x0 + 1; x < x1; x++) if ((x - x0) % 2 === 1) set(x, y, SZ1, B.VENT);
    for (let x = x0 + 3; x < x1; x += 4) set(x, y + 1, SZ1, B.GLOW_PANEL);
  }
  set(DX, 58, SZ1 - 1, B.CHROME); set(DX + 1, 58, SZ1 - 1, B.CHROME); set(DX, 59, SZ1 - 1, B.GLOW_PANEL); set(DX + 1, 59, SZ1 - 1, B.GLOW_PANEL);   // finial
  // the furnace eye: a round vent-rimmed emblem in the gable, red ring and a molten core that glows at night
  for (let y = 41; y <= 51; y++) for (let x = DX - 5; x <= DX + 6; x++) {
    const dx = x + 0.5 - (DX + 1), dy = y + 0.5 - 46.5, q = dx * dx + dy * dy;
    if (q > 5.7 * 5.7) continue;
    set(x, y, SZ1, q > 4.6 * 4.6 ? B.VENT : (q > 3.3 * 3.3 ? B.PANEL_RED : (q > 2.2 * 2.2 ? B.DURASTEEL_DARK : B.MAGMA)));
  }
  fill(DX - 6, 40, SZ1, DX + 7, 40, SZ1, B.HOLO_SIGN); fill(DX - 7, 40, SZ1, DX - 7, 40, SZ1, B.CHROME); fill(DX + 8, 40, SZ1, DX + 8, 40, SZ1, B.CHROME);
  carve(DX, Y.under, SZ1, DX + 1, Y.under + 2, SZ1); col(DX - 1, Y.under, SZ1, Y.under + 3, B.CHROME); col(DX + 2, Y.under, SZ1, Y.under + 3, B.CHROME); fill(DX, Y.under + 3, SZ1, DX + 1, Y.under + 3, SZ1, B.CHROME);
  fill(DX - 1, Y.under + 4, SZ1, DX + 2, Y.under + 4, SZ1, B.PANEL_RED); fill(DX, Y.under + 4, SZ1, DX + 1, Y.under + 4, SZ1, B.GLOW_PANEL);
  carve(DX, Y.gal, SZ1, DX + 1, Y.gal + 2, SZ1); col(DX - 1, Y.gal, SZ1, Y.gal + 3, B.CHROME); col(DX + 2, Y.gal, SZ1, Y.gal + 3, B.CHROME); fill(DX, Y.gal + 3, SZ1, DX + 1, Y.gal + 3, SZ1, B.CHROME);
  fill(DX - 1, Y.gal - 1, SZ1, DX + 2, Y.gal - 1, SZ1, B.PANEL_STRIPE);
  bp.door(DX, Y.under, SZ1, 'S'); bp.door(DX, Y.gal, SZ1, 'S');
  // west / east / north walls: pilasters, window rows for the strips, tall lit slots and louvres for the hall
  for (let z = SZ0 + 1; z < SZ1; z++) {
    const k = (z - SZ0) % 8;
    for (const [x, px] of [[SX0, SX0 - 1], [SX1, SX1 + 1]]) {
      if (k < 2) {   // pilasters (lifted over the dock on the east side and over the yard stair on the west side)
        if (!(x === SX1 && z >= 38 && z <= 86)) col(px, x === SX0 && z >= 64 && z <= 78 ? 9 : 1, z, Y.roof - 2, B.DURASTEEL_DARK);
        set(x, 34, z, B.PANEL_STRIPE); set(x, 35, z, B.PANEL_STRIPE); continue;
      }
      if (z >= SZ0 + 1 && z <= NZ1 - 1) { set(x, 7, z, lit()); set(x, 12, z, lit()); }
      if (k === 5) col(x, 24, z, 40, B.GLOW_PANEL);
      else if (k === 3 || k === 7) { for (const wy of [25, 28, 31, 38, 41]) set(x, wy, z, lit()); }
      else if (k === 2 || k === 6) { for (const wy of [27, 30, 40]) set(x, wy, z, lit()); }
      set(x, 21, z, B.PANEL_STRIPE); set(x, 34, z, B.PANEL_STRIPE); set(x, 35, z, B.PANEL_STRIPE);
      if (z > HZ0 && z < HZ1 && k === 4) { fill(x, 37, z, x, 39, z, B.VENT); }
    }
  }
  for (let x = SX0 + 1; x < SX1; x++) {
    const k = (x - SX0) % 8;
    if (k < 2) { col(x, 34, SZ0, 35, B.PANEL_STRIPE); continue; }
    set(x, 7, SZ0, lit()); set(x, 12, SZ0, lit()); set(x, 21, SZ0, B.PANEL_STRIPE); set(x, 34, SZ0, B.PANEL_STRIPE); set(x, 35, SZ0, B.PANEL_STRIPE);
    if (k === 5) col(x, 24, SZ0, 39, B.GLOW_PANEL); else if (k === 3 || k === 7) { for (const wy of [25, 28, 31, 38, 41]) set(x, wy, SZ0, lit()); }
  }
  fill(SX0, 5, SZ0, SX1, 5, SZ0, B.HULL_TRENCH); fill(SX0, 5, SZ0, SX0, 5, SZ1, B.HULL_TRENCH); fill(SX1, 5, SZ0, SX1, 5, SZ1, B.HULL_TRENCH);
}
