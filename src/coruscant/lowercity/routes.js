// Lower-city objects painted after the column pass (lowercity.js): the helix stair towers to the rim at every
// service corridor, the public lift (glass tower with a lit cab shaft, landings at 61 / 41 / 31), the freight
// switchback ramp from the spaceport's west edge into the west trench, the ventilation-well route on the east side
// (open grate in the rim promenade -> helix shaft -> maintenance balcony at 45 -> spiral ladder down the well), the
// lane-marker masts on the rim and the blue markers on the plateau face. All geometry is in the side's local frame
// (d outward, v along the edge; worldgen lowerWorld maps it back to world columns).
import { B } from '../../blocks.js';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH } from '../../constants.js';
import { LOWER, lowerWorld, REGIONS } from '../../worldgen.js';
import { LC, corridorCentre, PUBLIC_LIFT, FREIGHT_RAMP, VENT_ROUTE, MAST_EVERY, MAST_OFF, trenchOf } from './plan.js';

const D = B.DURASTEEL, DD = B.DURASTEEL_DARK, BLK = B.PANEL_BLACK, PLATE = B.DECK_PLATE, STR = B.PANEL_STRIPE, GL = B.STEEL_GLASS;
const BLUE = B.GLOW_PANEL_BLUE, GLOW = B.GLOW_PANEL, LAMP = B.CITY_LAMP, HOLO = B.HOLO_SIGN, VENT = B.VENT, CHR = B.CHROME;
const SLAB = B.STONE_BRICK_SLAB, BARS = B.IRON_BARS, FURN = B.FURNACE, MAG = B.MAGMA, AIR = B.AIR, CRATE = B.CRATE, CON = B.CONSOLE;
const mod = (a, m) => ((a % m) + m) % m;
const HALF = REGIONS.coruscant.half, CX = REGIONS.coruscant.cx;

// World-coordinate setter bounded to one chunk, and a local-frame setter for one side.
function worldSetter(chunk) {
  const bx = chunk.cx * CS, bz = chunk.cz * CS, blocks = chunk.blocks;
  return (x, y, z, id) => {
    const lx = x - bx, lz = z - bz;
    if (lx < 0 || lz < 0 || lx >= CS || lz >= CS || y < 0 || y >= CH) return;
    blocks[(lx * CS + lz) * CH + y] = id;
  };
}
function frameSetter(chunk, side) {
  const S = worldSetter(chunk);
  return (d, v, y, id) => { const w = lowerWorld(side, d, v); S(w.x, y, w.z, id); };
}
// Does the local box (d0..d1, v0..v1) touch the chunk?
function touches(chunk, side, d0, d1, v0, v1) {
  const a = lowerWorld(side, d0, v0), b = lowerWorld(side, d1, v1);
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), z0 = Math.min(a.z, b.z), z1 = Math.max(a.z, b.z);
  const bx = chunk.cx * CS, bz = chunk.cz * CS;
  return x1 >= bx && x0 < bx + CS && z1 >= bz && z0 < bz + CS;
}
// v range of the chunk's columns in a side's frame (generous: the columns may belong to another side near a corner).
function vRange(chunk, side) {
  const bx = chunk.cx * CS, bz = chunk.cz * CS;
  return side <= 1 ? [bz, bz + CS - 1] : [bx - CX, bx + CS - 1 - CX];
}

export function paintObjects(chunk) {
  paintFaceAndMasts(chunk);
  for (let side = 0; side < 4; side++) {
    const [va, vb] = vRange(chunk, side);
    for (let c = LC.corridorOff + LC.corridorEvery * Math.floor((va - 6 - LC.corridorOff) / LC.corridorEvery); c <= vb + 6; c += LC.corridorEvery) {
      if (corridorCentre(side, c) !== c) continue;
      if (touches(chunk, side, -4, 1, c - 3, c + 2)) paintTower(frameSetter(chunk, side), { side, c, bottom: 41 });
    }
  }
  const L = PUBLIC_LIFT;
  if (touches(chunk, L.side, -4, 2, L.c - 5, L.c + 2)) paintTower(frameSetter(chunk, L.side), L);
  paintRamp(chunk);
  paintVentRoute(chunk);
}

// Blue lane markers on the plateau face (y 42, every 16), vent grilles over the trench mouths, and the lane-marker
// masts on the rim promenade (blue light at y 75 for the upper ship lane).
function paintFaceAndMasts(chunk) {
  const bx = chunk.cx * CS, bz = chunk.cz * CS, blocks = chunk.blocks;
  const near = Math.max(Math.abs(bx + 8 - CX), Math.abs(bz + 8)) - HALF;
  if (near < -12 || near > 12) return;
  for (let lx = 0; lx < CS; lx++) for (let lz = 0; lz < CS; lz++) {
    const x = bx + lx, z = bz + lz;
    const ax = Math.abs(x - CX) - HALF, az = Math.abs(z) - HALF;
    const dc = Math.max(ax, az);
    if (dc !== 0 && dc !== -1) continue;
    const v = ax >= az ? z : x - CX;
    const col = (lx * CS + lz) * CH;
    if (dc === 0) {
      if (mod(v, 16) === 8) blocks[col + 42] = BLUE;
      const tv = trenchOf(v);
      if (tv !== null && tv >= -LC.trenchHalf && tv < LC.trenchHalf) for (let y = 33; y <= 38; y++) blocks[col + y] = VENT;
    } else if (mod(v, MAST_EVERY) === MAST_OFF && Math.abs(v) < HALF - 8) {
      for (let y = 61; y <= 74; y++) blocks[col + y] = BARS;
      blocks[col + 75] = BLUE;
    }
  }
}

// ------------------------------------------------------------------------------------------------ helix towers
// Ring of the 12 cells around a 2 x 2 core in a 4 x 4 footprint (local a, b in 0..3).
const RING = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [0, 1]];
// Half-steps from `bottom` to `top` (walking levels), with an optional 5-cell flat landing at `landing`. The last
// step always lands on RING[11], next to the head-house door (cells (0,1) / (0,2) face it), so the eight highest
// steps sit on the a <= 2 columns inside the plateau; for the public lift (31 -> 61, landing 41) the flat landing
// falls on RING[3..7]: the four a = 3 cells behind the deck door plus one.
function helixSteps(bottom, top, landing) {
  const rise = (top - bottom) * 2, landK = landing ? (landing - bottom) * 2 : -1, landLen = landing ? 5 : 0;
  const total = rise + landLen, start = mod(11 - total, 12), out = [];
  for (let k = 0; k <= total; k++) {
    let s;
    if (landK < 0 || k <= landK) s = bottom + 0.5 * k;
    else if (k <= landK + landLen) s = landing;
    else s = bottom + 0.5 * (k - landLen);
    const [a, b] = RING[(start + k) % 12];
    out.push({ a, b, s });
  }
  return out;
}
const stepBlock = (F, d, v, s, floorY) => { const L = Math.floor(s), top = s === L ? L - 1 : L; if (top > floorY) F(d, v, top, s === L ? D : SLAB); };

// A stair tower let into the plateau face: local a (0..3) -> d = a - 3, so the 4 x 4 shaft sits inside the edge and
// only its outer wall (d 1) stands in the lower city, where it stops at 59; b -> v (mirrored for the public lift so
// its first step is nearest the trench). The head house on the promenade (walls to 63, roof 64, footprint d -4..0 of
// the 6-wide rim) has the exit door on the plateau side. The deck door is in the outer wall: at the flat landing
// (the public lift: 41, 4 wide) or at the bottom (service towers: 41). The public lift's bottom (31) leaves through
// a short lit tunnel under the deck into the trench beside the tower.
function paintTower(F, T) {
  const c = T.c, bottom = T.bottom, top = 61, glass = !!T.glass, mirror = !!T.mirror;
  const dOf = (a) => a - 3, vOf = (b) => c - 2 + (mirror ? 3 - b : b);
  const wallBlock = (y) => (y === bottom - 1 || y === 59 || y === 63 ? D : glass ? ((y - bottom) % 3 === 2 ? D : GL) : (y % 4 === 2 && y > bottom + 1 ? GL : DD));
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
    const d = dOf(a), v = vOf(b), core = a >= 1 && a <= 2 && b >= 1 && b <= 2;
    F(d, v, bottom - 1, PLATE);
    // the d 0 column closes the head house above the face (its steps stay below 59)
    for (let y = bottom; y <= 63; y++) F(d, v, y, core ? (y % 5 === 0 ? BLUE : (glass ? GL : BLK)) : (a === 3 && y >= 60 ? wallBlock(y) : AIR));
  }
  for (let a = -1; a <= 4; a++) for (let b = -1; b <= 4; b++) {
    if (a >= 0 && a <= 3 && b >= 0 && b <= 3) continue;
    const d = dOf(a), v = vOf(b), wt = a === 4 ? 59 : 63;
    for (let y = bottom - 1; y <= wt; y++) F(d, v, y, wallBlock(y));
  }
  for (let a = -1; a <= 3; a++) for (let b = -1; b <= 4; b++) F(dOf(a), vOf(b), 64, D);
  for (const st of helixSteps(bottom, top, T.landing)) stepBlock(F, dOf(st.a), vOf(st.b), st.s, bottom - 1);
  // rim exit (head-house door onto the promenade), signage and lights
  for (const b of [1, 2]) { F(dOf(-1), vOf(b), 60, PLATE); for (let y = 61; y <= 63; y++) F(dOf(-1), vOf(b), y, AIR); F(dOf(-1), vOf(b), 64, HOLO); }
  F(dOf(-1), vOf(0), 62, GLOW); F(dOf(-1), vOf(3), 62, GLOW);
  F(dOf(1), vOf(-1), 62, GLOW); F(dOf(1), vOf(4), 62, GLOW);
  // deck door in the outer wall (4 wide at the landing, 2 wide at the bottom), signs and lights over it
  const deckY = T.landing || bottom, bs = T.landing ? [0, 1, 2, 3] : [1, 2];
  for (const b of bs) for (let y = deckY; y <= deckY + 2; y++) F(dOf(4), vOf(b), y, AIR);
  F(dOf(4), vOf(bs[0]), deckY + 3, HOLO); F(dOf(4), vOf(bs[bs.length - 1]), deckY + 3, T.landing ? HOLO : GLOW);
  if (T.landing) { F(dOf(4), vOf(1), deckY + 4, GLOW); F(dOf(4), vOf(2), deckY + 4, GLOW); }
  if (T.trench) {
    // bottom exit: from the floor cell (a 3, b 3) through the outer wall, then a 2-wide tunnel under the deck past
    // the trench ledge into the trench's edge cell (tv 3 / -4), kept clear of container stacks
    const vs = mirror ? [c - 2, c - 3, c - 4] : [c + 1, c + 2, c + 3], vT = mirror ? c - 5 : c + 4;
    for (let d = 1; d <= 2; d++) {
      for (const v of vs) { F(d, v, bottom - 1, PLATE); for (let y = bottom; y <= bottom + 2; y++) F(d, v, y, AIR); F(d, v, bottom + 3, v === vs[1] ? GLOW : DD); }
      for (let y = bottom; y <= bottom + 2; y++) F(d, vT, y, AIR);
    }
    F(1, vs[0], bottom + 3, HOLO);
  }
}

// ------------------------------------------------------------------------------------------------ freight ramp
function paintRamp(chunk) {
  const R = FREIGHT_RAMP, g = LOWER.levels[0];
  const S = worldSetter(chunk);
  const bx = chunk.cx * CS, bz = chunk.cz * CS;
  // marked lane on the plateau ground from the spaceport's west edge, descending through the cut in the edge
  if (bx + CS > R.laneX0 && bx <= R.laneX1 && bz + CS > R.laneZ0 - 1 && bz <= R.laneZ1 + 1) {
    for (let x = Math.max(bx, R.laneX0); x <= Math.min(bx + CS - 1, R.laneX1); x++) {
      const cut = x <= R.cutX1, k = R.cutX1 - x;
      const s = cut ? 61 - 0.5 * Math.floor((k + 1) / 2) : 61;
      const L = Math.floor(s), top = s === L ? L - 1 : L;
      for (let z = R.laneZ0; z <= R.laneZ1; z++) {
        S(x, top, z, s === L ? (z === R.laneZ0 + 1 && x % 8 === 0 ? BLUE : PLATE) : SLAB);
        for (let y = top + 1; y <= 63; y++) S(x, y, z, AIR);              // also the rim railing over the cut
      }
      for (const z of [R.laneZ0 - 1, R.laneZ1 + 1]) {
        if (cut) for (let y = top; y <= 60; y++) S(x, y, z, y === 60 ? STR : DD);
        else S(x, 60, z, STR);
      }
    }
    S(R.laneX1 - 1, 61, R.laneZ0 - 1, BARS); S(R.laneX1 - 1, 62, R.laneZ0 - 1, BARS); S(R.laneX1 - 1, 63, R.laneZ0 - 1, HOLO);
    S(R.cutX1 + 4, 61, R.laneZ1 + 1, BARS); S(R.cutX1 + 4, 62, R.laneZ1 + 1, BARS); S(R.cutX1 + 4, 63, R.laneZ1 + 1, LAMP);
  }
  if (!touches(chunk, R.side, 1, R.outerD + 1, R.turn.v0 - 1, R.head.v1)) return;
  const F = frameSetter(chunk, R.side);
  const cell = (d, v, s) => {
    const L = Math.floor(s), top = s === L ? L - 1 : L;
    for (let y = g + 1; y < top; y++) F(d, v, y, DD);
    F(d, v, top, s === L ? D : SLAB);
    for (let y = top + 1; y <= Math.max(g, top + 3); y++) F(d, v, y, AIR);
  };
  const s1 = (v) => R.leg1.s0 - 0.5 * Math.floor((R.leg1.v0 - v + 1) / 2);
  const s2 = (v) => R.leg2.s0 - 0.5 * Math.floor((v - R.leg2.v0 + 1) / 2);
  for (let v = R.head.v0; v <= R.head.v1; v++) for (let d = R.head.d0; d <= R.head.d1; d++) cell(d, v, R.head.s);
  for (let v = R.leg1.v1; v <= R.leg1.v0; v++) for (let d = R.leg1.d0; d <= R.leg1.d1; d++) cell(d, v, s1(v));
  for (let v = R.turn.v0; v <= R.turn.v1; v++) for (let d = R.turn.d0; d <= R.turn.d1; d++) cell(d, v, R.turn.s);
  for (let v = R.leg2.v0; v <= R.leg2.v1; v++) for (let d = R.leg2.d0; d <= R.leg2.d1; d++) cell(d, v, s2(v));
  for (let v = R.pass.v0; v <= R.pass.v1; v++) for (let d = R.pass.d0; d <= R.pass.d1; d++) cell(d, v, R.pass.s);
  // parapet between the legs (one above the upper leg) from the turn platform to the head; the platform itself
  // (v turn.v0 .. turn.v1) stays open across d 1..7 so the legs connect
  for (let v = R.turn.v1 + 1; v <= R.head.v1; v++) {
    const up = v <= R.leg1.v0 ? s1(v) : R.head.s;
    const top = Math.ceil(up) + 1;
    for (let y = g + 1; y <= top; y++) F(R.parapetD, v, y, y === top ? STR : DD);
    if (mod(v, 16) === 8 && top + 2 <= 59) { F(R.parapetD, v, top + 1, BARS); F(R.parapetD, v, top + 2, LAMP); }
  }
  // outer parapet along the turn platform and the return leg (a railing once the leg has cut below the deck), end wall
  for (let v = R.turn.v0; v <= R.leg2.v1; v++) {
    const t2 = Math.ceil(s2(v)) + 1;
    if (t2 > g + 1) for (let y = g + 1; y <= t2; y++) F(R.outerD, v, y, y === t2 ? STR : DD);
    else F(R.outerD, v, g + 1, BARS);
  }
  for (let d = 1; d <= R.outerD; d++) for (let y = g + 1; y <= R.turn.s + 1; y++) F(d, R.turn.v0 - 1, y, y === R.turn.s + 1 ? STR : DD);
  F(R.outerD, R.turn.v0 - 1, R.turn.s + 2, BARS); F(R.outerD, R.turn.v0 - 1, R.turn.s + 3, LAMP);
  // container stacks and a conveyor stub on the turn platform side of the passage mouth
  for (let v = R.pass.v0 + 2; v <= R.pass.v1 - 3; v += 6) { F(R.pass.d1, v, R.pass.s, CRATE); F(R.pass.d1, v + 1, R.pass.s, CRATE); F(R.pass.d1, v, R.pass.s + 1, CRATE); }
  F(R.pass.d0, R.pass.v0 + 1, R.pass.s, CON);
}

// ------------------------------------------------------------------------------------------------ ventilation route
// East side: a 4 x 4 helix shaft inside the rim (d -4..-1) from an open grate in the promenade floor down to 45,
// out through the face onto a railed balcony (floor 44), a slab stair down to the deck and, beside it, the
// ventilation well with the spiral ladder around its shaft down to the reclamation floor.
function paintVentRoute(chunk) {
  const V = VENT_ROUTE, side = V.side, g = LOWER.levels[0];
  if (!touches(chunk, side, -6, 14, V.balconyV0 - 2, V.wellV0 + 9)) return;
  const F = frameSetter(chunk, side);
  // helix shaft in the rim: a -> d = a - 4, b -> v = shaftV0 + b
  const dOf = (a) => a - 4, vOf = (b) => V.shaftV0 + b, bottom = 45;
  for (let a = -1; a <= 4; a++) for (let b = -1; b <= 4; b++) {
    const d = dOf(a), v = vOf(b), interior = a >= 0 && a <= 3 && b >= 0 && b <= 3;
    const core = a >= 1 && a <= 2 && b >= 1 && b <= 2;
    if (!interior) { for (let y = bottom - 1; y <= 59; y++) F(d, v, y, (y === 47 || y === 53 || y === 59) && (b === 1 || b === 2 || a === 1 || a === 2) ? BLUE : BLK); continue; }
    F(d, v, bottom - 1, PLATE);
    for (let y = bottom; y <= 59; y++) F(d, v, y, core ? BLK : AIR);
    F(d, v, 60, core ? VENT : AIR);                       // the open grate: the core is the grate, the ring is open
  }
  for (const st of helixSteps(bottom, 61)) stepBlock(F, dOf(st.a), vOf(st.b), st.s, bottom - 1);
  for (let a = 0; a < 4; a++) { F(dOf(a), vOf(-1), 61, BARS); F(dOf(a), vOf(4), 61, BARS); }   // railing round the hole
  F(dOf(-1), vOf(0), 61, BARS); F(dOf(-1), vOf(3), 61, BARS);
  F(dOf(-1), vOf(-1), 61, BARS); F(dOf(-1), vOf(-1), 62, BARS); F(dOf(-1), vOf(-1), 63, LAMP);
  for (let y = 45; y <= 47; y++) { F(0, vOf(0), y, AIR); F(0, vOf(1), y, AIR); }   // out through the face
  F(0, vOf(2), 46, HOLO); F(0, vOf(-1), 46, GLOW);
  // balcony (floor 44) with posts, railing and a lamp
  for (let d = 1; d <= 4; d++) for (let v = V.balconyV0; v <= V.balconyV1; v++) {
    F(d, v, V.balconyY, PLATE);
    for (let y = V.balconyY + 1; y <= V.balconyY + 3; y++) F(d, v, y, AIR);
    if (d === 4 && (v === V.balconyV0 || v === V.balconyV1)) for (let y = g + 1; y < V.balconyY; y++) F(d, v, y, DD);
    if (d === 4 && v > V.stairV0 + 1) F(d, v, V.balconyY + 1, BARS);
  }
  F(4, V.balconyV1 - 3, V.balconyY + 1, BARS); F(4, V.balconyV1 - 3, V.balconyY + 2, BARS); F(4, V.balconyV1 - 3, V.balconyY + 3, LAMP);
  // stair from the balcony's outer edge down to the deck (8 half-steps along d), railed
  for (let d = 5; d <= 12; d++) {
    const s = V.balconyY + 1 - 0.5 * (d - 4), L = Math.floor(s), top = s === L ? L - 1 : L;
    for (const v of [V.stairV0, V.stairV0 + 1]) { for (let y = g + 1; y < top; y++) F(d, v, y, DD); F(d, v, top, s === L ? D : SLAB); for (let y = top + 1; y <= top + 3; y++) F(d, v, y, AIR); }
    for (const v of [V.stairV0 - 1, V.stairV0 + 2]) { for (let y = g + 1; y < Math.ceil(s); y++) F(d, v, y, DD); F(d, v, Math.ceil(s), BARS); }
  }
  // the well: 8 x 8 collar (parapet to 46, a gap at the balcony), spiral ladder round the shaft down to the floor
  for (let u = 0; u < 8; u++) for (let t = 0; t < 8; t++) {
    const d = 1 + t, v = V.wellV0 + u;
    const set = (y, id) => F(d, v, y, id);
    wellColumn(set, u, t, g, { collar: 6, cover: false, gap: { u: 0, t0: 1, t1: 2 }, seed: 5 });
  }
  const ring = [];
  for (let t = 1; t <= 6; t++) ring.push([1, t]);
  for (let u = 2; u <= 6; u++) ring.push([u, 6]);
  for (let t = 5; t >= 1; t--) ring.push([6, t]);
  for (let u = 5; u >= 2; u--) ring.push([u, 1]);
  for (let k = 0; k < (bottom - LOWER.floor - 1) * 2; k++) {
    const [u, t] = ring[k % ring.length], s = bottom - 0.5 * (k + 1);
    stepBlock(F, 1 + t, V.wellV0 + u, s, LOWER.floor);
  }
  F(1 + 3, V.wellV0 + 3, LOWER.floor + 1, CON);
}

// One column of an 8 x 8 ventilation well (local u, t in 0..7): the collar and shaft walls on the perimeter (plated,
// with vent grates on the collar and a furnace ring at the bottom), the carved shaft with the magma-lit floor and
// a grated cover with a 2 x 2 barred opening inside. o.gap lowers the collar to the balcony level at the entry.
export function wellColumn(set, u, t, g, o) {
  const floor = LOWER.floor, collarTop = g + o.collar;
  const perimeter = u === 0 || u === 7 || t === 0 || t === 7;
  if (perimeter) {
    const gap = o.gap && u === o.gap.u && t >= o.gap.t0 && t <= o.gap.t1;
    const wt = gap ? g + 4 : collarTop;
    for (let y = floor + 1; y <= wt; y++) {
      let id = (y & 7) === 0 ? STR : DD;
      if (y === floor + 1 || y === floor + 2) id = FURN;
      else if (y > g && y <= g + 2 && (u + t) % 3 === 0) id = VENT;
      else if (u === 0 && (t === 3 || t === 4) && (y === g - 6 || y === g - 14)) id = BLUE;
      set(y, id);
    }
    for (let y = wt + 1; y <= collarTop + 1; y++) set(y, AIR);
    return;
  }
  for (let y = floor + 1; y <= collarTop + 1; y++) set(y, AIR);
  const centre = u >= 3 && u <= 4 && t >= 3 && t <= 4;
  set(floor, centre ? MAG : PLATE);
  if (centre) set(floor + 1, BARS);
  if (o.cover) set(collarTop, centre ? BARS : VENT);
}
