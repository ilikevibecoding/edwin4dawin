// The cargo terminal on the north apron: the container yard with two portal cranes, the hauler dock (two L bays,
// painted by pads.js, with hauler lane markings) and its manifest office, the conveyor from the dock into the cargo
// hall, and the hall itself (roof 109): bonded storage behind bars, two storage rooms with racks, the dispatch office
// (the depot's front desk) and the sorting floor the conveyor feeds. Container / crane helpers are shared with the
// old deck's yards (east.js).
import { M, LINE, lampPost, wallNumber } from './painter.js';
import { CARGO, DECK_TOP, DECK_Y } from './plan.js';
import { hash2, hash3 } from '../../rng.js';

const F = DECK_TOP, W = DECK_Y;

// Container stacks on a yard rect (6 x 3 boxes in rows, some doubled, loose crates in the gaps), lamp posts round it.
export function containers(p, Y, seed) {
  if (!p.overlaps(Y.x0, Y.z0, Y.x1, Y.z1)) return;
  const colors = [M.DD, M.RED, M.STR, M.D, M.HP];
  for (let z = Y.z0 + 1; z + 2 <= Y.z1 - 1; z += 6) for (let x = Y.x0 + 2; x + 5 <= Y.x1 - 2; x += 8) {
    if (!p.overlaps(x, z, x + 5, z + 2)) continue;
    const r = hash3(x, z, seed, 51);
    if (r > 0.72) {
      if (r > 0.9) for (let k = 0; k < 3; k++) if (hash3(x + k, z, seed, 55) < 0.6) p.set(x + k * 2, W, z + 1, hash3(x, z + k, seed, 56) < 0.5 ? M.CRATE : M.BARREL);
      continue;
    }
    const stack = hash3(x, z, seed, 52) < 0.35 ? 2 : 1;
    for (let s = 0; s < stack; s++) {
      const c = colors[Math.floor(hash3(x, z + s, seed, 53) * colors.length)];
      p.box(x, W + s * 3, z, x + 5, W + 2 + s * 3, z + 2, c);
      p.box(x, W + s * 3, z, x, W + 2 + s * 3, z + 2, M.DD); p.box(x + 5, W + s * 3, z, x + 5, W + 2 + s * 3, z + 2, M.DD);
      p.set(x + 2, W + 2 + s * 3, z + 1, M.VENT);
    }
  }
  for (let x = Y.x0; x <= Y.x1; x += 16) { lampPost(p, x, Y.z0, W, 4); lampPost(p, x, Y.z1, W, 4); }
}

// Portal crane: two 2x2 legs at z0 / z1, a beam at height h with a trolley, hook and lamps.
export function crane(p, x, z0, z1, h = 113) {
  if (!p.overlaps(x, z0, x + 1, z1)) return;
  p.box(x, W, z0, x + 1, h - 1, z0 + 1, M.DD); p.box(x, W, z1 - 1, x + 1, h - 1, z1, M.DD);
  p.box(x, h, z0, x + 1, h + 1, z1, M.DD);
  const tz = (z0 + z1) >> 1;
  p.box(x, h - 2, tz - 1, x + 1, h - 1, tz, M.CHR); p.box(x, h - 5, tz, x, h - 3, tz, M.DD);
  p.set(x, h + 2, z0, M.LAMP); p.set(x + 1, h + 2, z1, M.LAMP);
}

function paintYardAndDock(p) {
  const C = CARGO;
  containers(p, C.yard, 7);
  for (const cx of C.cranes) crane(p, cx, C.yard.z0 - 2, C.yard.z1 + 2, 115);
  // hauler dock: lane lines from the bays east to the office / conveyor head, bay numbers on the dock floor
  const D = C.dock;
  if (p.overlaps(D.x0, D.z0, D.x1 + 10, D.z1)) {
    for (let x = D.x0; x <= D.x1 + 6; x++) { p.set(x, F, D.z0, (x & 3) === 0 ? M.GLOW : LINE); p.set(x, F, D.z1, (x & 3) === 0 ? M.GLOW : LINE); }
    for (let z = D.z0; z <= D.z1; z += 4) p.set(D.x1 + 6, F, z, M.RED);
    for (let x = D.x0; x <= D.x1; x += 24) { lampPost(p, x, D.z0 - 1, W, 4); }
    // tug / loader park south of the bays: marked squares with crates
    for (let k = 0; k < 4; k++) { const x = D.x0 + 8 + k * 14; p.ring(x, F, D.z1 - 8, x + 5, D.z1 - 4, LINE); if (hash2(k, 9, 63) < 0.7) p.box(x + 1, W, D.z1 - 7, x + 4, W + 1, D.z1 - 5, k & 1 ? M.HP : M.STR); }
  }
  // manifest office: a small solid hall with a glass front toward the dock, counter, consoles, holo manifest board
  const O = C.office;
  if (p.overlaps(O.x0, O.z0, O.x1, O.z1)) {
    p.walls(O.x0, W, O.z0, O.x1, W + 1, O.z1, M.DD); p.walls(O.x0, W + 2, O.z0, O.x1, W + 3, O.z1, M.GL); p.walls(O.x0, W + 4, O.z0, O.x1, W + 4, O.z1, M.D);
    for (let x = O.x0; x <= O.x1; x += 6) { p.col(x, O.z0, W, W + 4, M.D); p.col(x, O.z1, W, W + 4, M.D); }
    p.box(O.x0, W + 5, O.z0, O.x1, W + 5, O.z1, M.DD);
    p.box(O.x0, W, O.door.z - 1, O.x0, W + 2, O.door.z + 1, M.AIR); p.box(O.x0, W + 3, O.door.z - 1, O.x0, W + 3, O.door.z + 1, M.HOLO);
    p.box(O.x0 + 5, W, O.z0 + 4, O.x0 + 5, W, O.z1 - 4, M.DD); p.set(O.x0 + 5, W, O.z0 + 8, M.CON); p.set(O.x0 + 5, W, O.z1 - 6, M.CON);   // counter
    p.box(O.x1 - 1, W, O.z0 + 2, O.x1 - 1, W + 1, O.z1 - 2, M.SHELF); p.box(O.x1 - 1, W + 2, O.z0 + 2, O.x1 - 1, W + 2, O.z1 - 2, M.BLUE);
    p.box(O.x0 + 8, W + 2, O.z1 - 1, O.x1 - 3, W + 3, O.z1 - 1, M.HOLO);                                 // manifest board
    for (let x = O.x0 + 4; x <= O.x1 - 4; x += 6) p.set(x, W + 4, (O.z0 + O.z1) >> 1, M.GLOW);
    p.set(O.x0 + 10, W, O.z0 + 4, M.TABLE); p.set(O.x0 + 16, W, O.z1 - 4, M.TABLE);
    lampPost(p, O.x0 - 2, O.z0 - 2, W); lampPost(p, O.x0 - 2, O.z1 + 2, W);
  }
}

// The conveyor: a raised belt (y 98, 3 wide) on posts from the dock to the hall's west door, rollers, lit hood ribs.
function paintConveyor(p) {
  const V = CARGO.conveyor, y = V.y;
  if (!p.overlaps(V.x0 - 2, V.z - 2, V.x1 + 1, V.z + 2)) return;
  const [x0, x1] = p.xRange(V.x0, V.x1);
  for (let x = x0; x <= x1; x++) {
    p.set(x, y, V.z - 1, M.DD); p.set(x, y, V.z + 1, M.DD); p.set(x, y, V.z, (x & 1) ? M.CHR : M.STR);
    p.set(x, y - 1, V.z - 1, M.DD); p.set(x, y - 1, V.z + 1, M.DD);
    if ((x - V.x0) % 8 === 0) { p.box(x, W, V.z - 2, x, y + 2, V.z - 2, M.DD); p.box(x, W, V.z + 2, x, y + 2, V.z + 2, M.DD); p.box(x, y + 3, V.z - 2, x, y + 3, V.z + 2, M.D); p.set(x, y + 2, V.z, M.GLOW); }
    if ((x - V.x0) % 8 === 4 && hash2(x, 1, 66) < 0.6) p.set(x, y + 1, V.z, hash2(x, 2, 66) < 0.6 ? M.CRATE : M.BARREL);   // cargo on the belt
  }
  // loading head at the dock end: a hopper frame with a control console
  p.box(V.x0 - 2, W, V.z - 2, V.x0 - 1, y + 2, V.z + 2, M.DD); p.box(V.x0 - 2, y, V.z - 1, V.x0 - 1, y + 1, V.z + 1, M.AIR); p.set(V.x0 - 2, W, V.z - 3, M.CON); p.set(V.x0 - 1, y + 3, V.z, M.RED);
}

function paintHall(p) {
  const C = CARGO, H = C.hall;
  if (!p.overlaps(H.x0, H.z0, H.x1, H.z1)) return;
  const roof = H.roof;
  const [x0, x1] = p.xRange(H.x0, H.x1), [z0, z1] = p.zRange(H.z0, H.z1);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const onX = x === H.x0 || x === H.x1, onZ = z === H.z0 || z === H.z1;
    if (onX || onZ) {
      const along = onX ? z - H.z0 : x - H.x0, column = (along & 7) === 0;
      for (let y = W; y < roof; y++) {
        let id = M.DD;
        if (column) id = M.D;
        else if (y >= W + 6 && y <= W + 7 && (along & 7) >= 3) id = M.GL;
        else if (y === W + 2 && along % 3 === 1) id = M.GLOW;
        else if (y === roof - 1) id = M.D;
        p.set(x, y, z, id);
      }
    } else {
      if (((x - H.x0) & 7) === 0 || ((z - H.z0) & 7) === 0) p.set(x, F, z, M.DD);
      if (((x - H.x0) & 3) === 2 && ((z - H.z0) & 3) === 2) p.set(x, roof - 1, z, M.GLOW);
    }
    p.set(x, roof, z, (onX || onZ) ? M.D : ((x - H.x0) % 6 === 3 && (z - H.z0) % 6 === 3) ? M.VENT : M.DD);
  }
  // doors: 4 wide, 4 high with holo headers and glow jambs
  for (const d of C.doors) {
    if (d.side === 'S' || d.side === 'N') { p.box(d.x0, W, d.z, d.x1, W + 3, d.z, M.AIR); p.box(d.x0, W + 4, d.z, d.x1, W + 5, d.z, M.HOLO); p.col(d.x0 - 1, d.z, W, W + 5, M.GLOW); p.col(d.x1 + 1, d.z, W, W + 5, M.GLOW); }
    else { p.box(d.x, W, d.z0, d.x, W + 3, d.z1, M.AIR); p.box(d.x, W + 4, d.z0, d.x, W + 5, d.z1, M.HOLO); p.col(d.x, d.z0 - 1, W, W + 5, M.GLOW); p.col(d.x, d.z1 + 1, W, W + 5, M.GLOW); }
  }
  // conveyor run inside the hall: the belt continues to the sorting floor (x 2380..2420 at z -300), then a
  // sorting console row and out-lanes to the stores
  const V = C.conveyor;
  for (let x = H.x0 + 1; x <= H.x0 + 40; x++) { p.set(x, V.y, V.z - 1, M.DD); p.set(x, V.y, V.z + 1, M.DD); p.set(x, V.y, V.z, (x & 1) ? M.CHR : M.STR); p.set(x, V.y - 1, V.z - 1, M.DD); p.set(x, V.y - 1, V.z + 1, M.DD); }
  p.box(H.x0 + 41, W, V.z - 2, H.x0 + 42, W, V.z + 2, M.DD); p.set(H.x0 + 41, W + 1, V.z, M.CON); p.set(H.x0 + 42, W + 1, V.z - 2, M.CON);
  for (let x = H.x0 + 4; x <= H.x0 + 40; x += 9) { p.set(x, F, V.z - 6, LINE); p.set(x, F, V.z + 6, LINE); }
  // bonded storage: a barred cage with a locked gate, high-value crates inside, warning lamps
  const Bn = C.bonded;
  p.walls(Bn.x0, W, Bn.z0, Bn.x1, W + 3, Bn.z1, M.BARS); p.walls(Bn.x0, W + 4, Bn.z0, Bn.x1, W + 4, Bn.z1, M.DD);
  for (let x = Bn.x0; x <= Bn.x1; x += 8) p.col(x, Bn.z1, W, W + 4, M.DD);
  for (let z = Bn.z0; z <= Bn.z1; z += 8) p.col(Bn.x0, z, W, W + 4, M.DD);
  p.box(Bn.x0, W, Bn.z1 - 8, Bn.x0, W + 1, Bn.z1 - 7, M.AIR); p.set(Bn.x0, W + 2, Bn.z1 - 8, M.RED); p.set(Bn.x0, W + 2, Bn.z1 - 7, M.RED);   // gate
  for (let x = Bn.x0 + 3; x <= Bn.x1 - 3; x += 4) for (let z = Bn.z0 + 3; z <= Bn.z1 - 3; z += 5) if (hash2(x, z, 81) < 0.55) p.box(x, W, z, x + 1, W + (hash2(x, z, 82) < 0.4 ? 1 : 0), z + 1, hash2(x, z, 83) < 0.5 ? M.HP : M.CRATE);
  p.box(Bn.x0 + 2, W + 3, Bn.z1, Bn.x0 + 9, W + 3, Bn.z1, M.HOLO);                                                    // "BONDED" board on the cage front
  // storage rooms: solid walls with a 3-wide door on the east side, racks along the walls, stock on the floor
  for (const S of C.stores) {
    p.walls(S.x0, W, S.z0, S.x1, W + 4, S.z1, M.DD); p.walls(S.x0, W + 5, S.z0, S.x1, W + 5, S.z1, M.D);
    for (let x = S.x0; x <= S.x1; x += 8) { p.col(x, S.z0, W, W + 5, M.D); p.col(x, S.z1, W, W + 5, M.D); }
    const dz = (S.z0 + S.z1) >> 1;
    p.box(S.x1, W, dz - 1, S.x1, W + 2, dz + 1, M.AIR); p.set(S.x1, W + 3, dz, M.GLOW);
    p.box(S.x0 + 1, W, S.z0 + 1, S.x1 - 1, W + 1, S.z0 + 1, M.SHELF); p.box(S.x0 + 1, W, S.z1 - 1, S.x1 - 1, W + 1, S.z1 - 1, M.SHELF);
    for (let x = S.x0 + 3; x <= S.x1 - 3; x += 3) for (let z = S.z0 + 4; z <= S.z1 - 4; z += 4) if (hash2(x, z, 84) < 0.4) p.box(x, W, z, x, W + Math.floor(hash2(x, z, 85) * 2), z, hash2(x, z, 86) < 0.6 ? M.CRATE : M.BARREL);
    for (let x = S.x0 + 4; x <= S.x1 - 4; x += 8) p.set(x, W + 4, dz, M.GLOW);
  }
  // dispatch office (the depot's desk): glass partition to the hall with a door, front desk with consoles, holo
  // dispatch boards, lockers, a break table
  const Dp = C.dispatch;
  p.box(Dp.x0, W, Dp.z0, Dp.x0, W, Dp.z1, M.DD); p.box(Dp.x0, W + 1, Dp.z0, Dp.x0, W + 3, Dp.z1, M.GL); p.box(Dp.x0, W + 4, Dp.z0, Dp.x0, W + 4, Dp.z1, M.D);
  p.box(Dp.x0, W, Dp.z0, Dp.x1, W, Dp.z0, M.DD); p.box(Dp.x0, W + 1, Dp.z0, Dp.x1, W + 3, Dp.z0, M.GL); p.box(Dp.x0, W + 4, Dp.z0, Dp.x1, W + 4, Dp.z0, M.D);
  const dz = (Dp.z0 + Dp.z1) >> 1;
  p.box(Dp.x0, W, dz - 1, Dp.x0, W + 2, dz + 1, M.AIR); p.box(Dp.x0, W + 3, dz - 1, Dp.x0, W + 3, dz + 1, M.HOLO);
  p.box(Dp.x0 + 5, W, Dp.z0 + 4, Dp.x0 + 5, W, Dp.z1 - 4, M.DD); for (let z = Dp.z0 + 6; z <= Dp.z1 - 6; z += 6) p.set(Dp.x0 + 5, W, z, M.CON);   // front desk
  p.box(Dp.x1 - 1, W + 2, Dp.z0 + 3, Dp.x1 - 1, W + 3, Dp.z1 - 3, M.HOLO);                                                              // dispatch boards
  p.box(Dp.x0 + 10, W, Dp.z1 - 1, Dp.x1 - 3, W + 2, Dp.z1 - 1, M.DD); for (let x = Dp.x0 + 11; x <= Dp.x1 - 4; x += 2) p.set(x, W + 1, Dp.z1 - 1, M.BLUE);   // lockers
  p.set(Dp.x0 + 14, W, Dp.z0 + 6, M.TABLE); p.set(Dp.x0 + 13, W, Dp.z0 + 6, M.SLAB); p.set(Dp.x0 + 15, W, Dp.z0 + 6, M.SLAB);
  for (let x = Dp.x0 + 6; x <= Dp.x1 - 4; x += 8) p.set(x, W + 4, dz, M.GLOW);
  // hall name over the south door, dock number boards over the west (conveyor) door
  wallNumber(p, 1, C.doors[1].x, W + 6, C.doors[1].z0 - 5, M.GLOW, M.BLK);
  p.box(C.doors[0].x0 - 6, roof - 1, H.z1, C.doors[0].x1 + 6, roof - 1, H.z1, M.HOLO);
  // sorting floor markings between the conveyor and the stores' doors
  for (const S of C.stores) { const zc = (S.z0 + S.z1) >> 1; for (let x = S.x1 + 1; x <= S.x1 + 6; x++) { p.set(x, F, zc - 2, LINE); p.set(x, F, zc + 2, LINE); } }
}

export function paintCargo(p) {
  paintYardAndDock(p);
  paintConveyor(p);
  paintHall(p);
}
