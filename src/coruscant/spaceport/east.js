// The original east terminal on the plateau deck (the domestic hub): the covered bridge from the Coruscant station
// and the half-step ramp up to the deck, the terminal hall (stepped glass roof, check-in, boards, seating, cantina,
// kiosks, security post, gate lounge), the two covered concourse spines to the eight domestic pads, the east plaza
// with the control tower ring and the monument, the maintenance hangar, the fuel farm, the container yards with
// their cranes, the workshop and the speeder park. Ported from the first spaceport onto the shared Painter.
import { M, LINE, lampPost } from './painter.js';
import { EAST as E, OLD_PADS, PAD_SIZES, STATION_Y, DECK_TOP, DECK_Y } from './plan.js';
import { containers, crane } from './cargo.js';
import { hash2 } from '../../rng.js';
import { shipModels, stampShip } from '../../ships/models.js';

const abs = Math.abs;
const F = DECK_TOP, W = DECK_Y;

// ------------------------------------------------------------------------------------------------ bridge + ramp
function paintBridge(p) {
  const br = E.bridge, hw = br.hw;
  if (p.overlaps(br.x0, -hw - 1, br.x1, hw + 1)) {
    const [x0, x1] = p.xRange(br.x0, br.x1);
    for (let x = x0; x <= x1; x++) {
      for (let z = -hw; z <= hw; z++) {
        p.set(x, STATION_Y, z, z === 0 ? M.STR : (abs(z) === 5 && (x & 3) === 0) ? M.GLOW : M.D);
        p.set(x, STATION_Y + 5, z, ((x - br.x0) % 7 === 0) ? M.D : M.GL);        // glass canopy with beams
      }
      for (const z of [-hw - 1, hw + 1]) {
        p.set(x, STATION_Y, z, M.DD); p.set(x, STATION_Y + 1, z, M.DD);
        p.box(x, STATION_Y + 2, z, x, STATION_Y + 4, z, M.GL);
        p.set(x, STATION_Y + 5, z, M.D);
        p.set(x, STATION_Y - 1, z, M.DD);                                          // underside rail
        if ((x - br.x0) % 8 === 2) p.col(x, z, 61, STATION_Y - 2, M.DD);           // support pillars to the ground
      }
    }
  }
  const R = E.ramp;
  if (p.overlaps(R.x0, -R.hw - 1, R.x1, R.hw + 1)) {
    const [x0, x1] = p.xRange(R.x0, R.x1);
    for (let x = x0; x <= x1; x++) {
      const k = x - R.x0;                    // 0..12, walking surface 91 + k/2
      const T = STATION_Y + 1 + k / 2, top = Math.floor(T), half = T !== top;
      for (let z = -R.hw; z <= R.hw; z++) {
        p.box(x, STATION_Y, z, x, top - 1, z, k === 0 ? M.D : M.DD);
        if (half) p.set(x, top, z, M.SLAB);
        if (!half && k > 0 && k < 12 && abs(z) === 5) p.set(x, top - 1, z, M.GLOW);   // step lights
      }
      for (const z of [-R.hw - 1, R.hw + 1]) {                                        // glass balustrade
        p.col(x, z, STATION_Y, top, M.DD);
        p.set(x, top + 1, z, M.GL); p.set(x, top + 2, z, M.GL);
      }
    }
  }
}

// ------------------------------------------------------------------------------------------------ terminal
const roofY = (z) => 111 + (abs(z) <= 8 ? 2 : abs(z) <= 24 ? 1 : 0);

function terminalFloor(x, z) {
  const T = E.terminal;
  if (abs(z) === 4 && x > T.x0 && x < T.x1) return (x & 3) === 0 ? M.GLOW : M.STR;                // east-west spine edges
  if (abs(z) < 4) return M.D;
  if ((x === T.cx - 4 || x === T.cx + 5)) return (z & 3) === 0 ? M.GLOW : M.STR;                  // north-south spine edges
  if (x > T.cx - 4 && x < T.cx + 5) return M.D;
  return ((x & 7) === 0 || (z & 7) === 0) ? M.DD : M.D;
}

function paintTerminal(p) {
  const T = E.terminal;
  if (!p.overlaps(T.x0, T.z0, T.x1, T.z1)) return;
  const [x0, x1] = p.xRange(T.x0, T.x1), [z0, z1] = p.zRange(T.z0, T.z1);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const ry = roofY(z);
    const onX = x === T.x0 || x === T.x1, onZ = z === T.z0 || z === T.z1;
    p.set(x, F, z, terminalFloor(x, z));
    if (onX || onZ) {
      const corner = onX && onZ, mullion = onX ? ((z & 3) === 0) : ((x - T.x0) % 4 === 0);
      for (let y = W; y < ry; y++) {
        let id = M.D;
        if (y <= W + 1) id = (y === W + 1 && !corner && (onX ? (z & 7) === 4 : ((x - T.x0) & 7) === 4)) ? M.GLOW : M.DD;
        else if (y <= 106) id = (corner || mullion) ? M.D : M.GL;
        p.set(x, y, z, id);
      }
    }
    // roof: durasteel frame every 8 blocks, tinted glass between
    p.set(x, ry, z, (((x - T.x0) & 7) === 0 || (z & 7) === 0 || x === T.x1) ? M.D : M.GL);
  }
  // doors (west/east on the spine, north/south to the concourses) with holo headers and glow frames
  for (const x of [T.x0, T.x1]) {
    p.box(x, W, -4, x, W + 4, 4, M.AIR);
    p.box(x, W + 5, -4, x, W + 6, 4, M.HOLO);
    p.col(x, -5, W, W + 6, M.GLOW); p.col(x, 5, W, W + 6, M.GLOW);
  }
  for (const z of [T.z0, T.z1]) {
    p.box(T.cx - 3, W, z, T.cx + 4, W + 4, z, M.AIR);
    p.box(T.cx - 3, W + 5, z, T.cx + 4, W + 6, z, M.HOLO);
    p.col(T.cx - 4, z, W, W + 6, M.GLOW); p.col(T.cx + 5, z, W, W + 6, M.GLOW);
  }
  // interior pillars with lamps at knee and head height
  for (const x of [2604, 2616, 2628, 2640]) for (const z of [-24, -12, 12, 24]) {
    p.col(x, z, W, roofY(z) - 1, M.D); p.set(x, W + 1, z, M.GLOW); p.set(x, W + 4, z, M.GLOW);
  }
  // central departure-board tower
  p.box(T.cx - 1, W, -1, T.cx + 1, W + 2, 1, M.DD); p.box(T.cx - 1, W + 3, -1, T.cx + 1, W + 5, 1, M.HOLO); p.box(T.cx - 1, W + 6, -1, T.cx + 1, W + 6, 1, M.CHR);
  // check-in counters (north side) with consoles, baggage belt and wall boards behind them
  for (const [cx0, cx1] of [[2598, 2614], [2628, 2644]]) {
    for (let x = cx0; x <= cx1; x++) p.set(x, W, -30, (x & 3) === 2 ? M.CON : M.DD);
    p.box(cx0, W, -36, cx1, W, -36, M.DD);
    for (let x = cx0; x <= cx1; x++) if (hash2(x, 1, 21) < 0.45) p.set(x, W + 1, -36, M.CRATE);
    p.box(cx0 + 2, W + 3, T.z0 + 1, cx1 - 2, W + 4, T.z0 + 1, M.HOLO);
  }
  // security post (NE corner): glass booth with a console
  p.box(2645, W, -38, 2649, W, -34, M.DD); p.walls(2645, W + 1, -38, 2649, W + 2, -34, M.GL); p.box(2645, W + 3, -38, 2649, W + 3, -34, M.DD);
  p.set(2647, W + 3, -36, M.GLOW); p.set(2647, W + 1, -37, M.CON); p.box(2645, W + 1, -36, 2645, W + 2, -36, M.AIR);
  // seating rows (south half), benches of five with aisles
  for (const z of [10, 14, 18, 22]) for (const [bx0, bx1] of [[2598, 2612], [2630, 2644]]) {
    for (let x = bx0; x <= bx1; x++) if ((x - bx0) % 6 !== 5) p.set(x, W, z, M.SLAB);
    p.set(bx0 + 5, W, z, M.DD);
  }
  // cantina (SW corner): bar, back shelves with blue light, tables and seats
  p.box(2598, W, 34, 2610, W, 34, M.DD); p.set(2598, W, 34, M.BARREL); p.set(2610, W, 34, M.BARREL); p.set(2604, W, 34, M.CON);
  p.box(2598, W, T.z1 - 1, 2610, W + 1, T.z1 - 1, M.SHELF); p.box(2598, W + 2, T.z1 - 1, 2610, W + 2, T.z1 - 1, M.BLUE);
  p.box(2603, W + 3, 34, 2605, W + 4, 34, M.HOLO);
  for (const [tx, tz] of [[2600, 28], [2606, 28], [2600, 31], [2606, 31], [2609, 29]]) {
    p.set(tx, W, tz, M.TABLE); p.set(tx - 1, W, tz, M.SLAB); p.set(tx + 1, W, tz, M.SLAB);
  }
  // kiosks along the south wall: counter, side partitions, back shelves, holo sign under a lit canopy
  for (const kx0 of [2628, 2634, 2640]) {
    const kx1 = kx0 + 5;
    p.box(kx0, W, 35, kx1 - 1, W, 35, M.DD);
    p.box(kx0, W, 36, kx0, W + 3, 38, M.DD);
    p.box(kx0 + 1, W, T.z1 - 1, kx1, W + 1, T.z1 - 1, M.SHELF);
    for (let x = kx0 + 1; x <= kx1; x++) for (let z = 37; z <= 38; z++) if (hash2(x, z, 22) < 0.35) p.set(x, W, z, hash2(x, z, 23) < 0.5 ? M.CRATE : M.BARREL);
    p.box(kx0, W + 4, 35, kx1, W + 4, T.z1 - 1, M.DD); p.set(kx0 + 3, W + 4, 37, M.GLOW);
    p.box(kx0 + 1, W + 3, 35, kx1 - 1, W + 3, 35, M.HOLO);
  }
  // gate lounge (east end): benches facing the glass wall, consoles at the gates
  for (const x of [2640, 2644]) for (let z = -30; z <= 30; z++) if (abs(z) > 5 && (z % 6) !== 0) p.set(x, W, z, M.SLAB);
  for (const z of [-20, 20]) { p.set(2648, W, z, M.CON); p.set(2648, W, z + 1, M.DD); p.set(2648, W, z - 1, M.DD); }
}

// ------------------------------------------------------------------------------------------------ concourses
function paintSpines(p) {
  const sp = E.spine, T = E.terminal, half = PAD_SIZES.S;
  if (!p.overlaps(sp.x0 - 1, -sp.zEnd, sp.x1 + 1, sp.zEnd)) return;
  const [x0, x1] = p.xRange(sp.x0 - 1, sp.x1 + 1);
  for (const side of [-1, 1]) {
    const za = side < 0 ? -sp.zEnd : T.z1 + 1, zb = side < 0 ? T.z0 - 1 : sp.zEnd;
    const [z0, z1] = p.zRange(za, zb);
    if (z0 > z1) continue;
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      if (x === sp.x0 || x === sp.x1) p.set(x, F, z, (z % 6 === 0) ? M.GLOW : LINE);              // lit edge lines
      else if ((x === T.cx || x === T.cx + 1) && ((z & 7) < 4)) p.set(x, F, z, LINE);             // dashed centre line
      if (x === sp.x0 - 1 || x === sp.x1 + 1) {
        if (((z + 168) & 15) === 8) { p.col(x, z, W, W + 4, M.DD); p.set(x, W + 2, z, M.LAMP); }   // lamp posts carry the canopy
        p.set(x, W + 5, z, M.D);
      } else p.set(x, W + 5, z, M.GL);                                                              // glass canopy
    }
  }
  // cross-walk markings from the spines to the pads and from the east pads to the plaza/east zone
  for (const pad of OLD_PADS) {
    const west = pad.x < T.cx;
    const gx0 = west ? pad.x + half : sp.x1 + 1, gx1 = west ? sp.x0 - 1 : pad.x - half - 1;
    for (const dz of [-3, 3]) for (let x = gx0; x <= gx1; x++) p.set(x, F, pad.z + dz, LINE);
    if (!west) for (const dz of [-3, 3]) for (let x = pad.x + half; x <= 2671; x++) p.set(x, F, pad.z + dz, LINE);
  }
}

// ------------------------------------------------------------------------------------------------ hangar
function paintHangar(p) {
  const H = E.hangar;
  if (!p.overlaps(H.x0, H.z0, H.x1, H.z1)) return;
  const roof = 112, zc = (H.z0 + H.z1) >> 1;
  const [x0, x1] = p.xRange(H.x0, H.x1), [z0, z1] = p.zRange(H.z0, H.z1);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    if (x > H.x0 && (abs(z - zc) === 12 || (z === zc && (x & 7) < 4))) p.set(x, F, z, LINE);
    else if (((x - H.x0) % 9) === 4 && ((z - H.z0) % 9) === 4) p.set(x, F, z, M.VENT);
    const back = x === H.x1, side = z === H.z0 || z === H.z1, front = x === H.x0;
    if (back || side) {
      const column = back ? ((z - H.z0) & 7) === 0 : ((x - H.x0) & 7) === 0;
      for (let y = W; y < roof; y++) {
        let id = M.DD;
        if (column) id = M.D;
        else if (y >= 104 && y <= 105 && ((back ? (z - H.z0) : (x - H.x0)) & 7) >= 3) id = M.GL;
        else if ((y === 99 || y === 108) && ((back ? (z - H.z0) : (x - H.x0)) % 3) === 1) id = M.GLOW;
        else if (y === roof - 1) id = M.D;
        p.set(x, y, z, id);
      }
    } else if (front) {
      if (abs(z - zc) > 16) p.box(x, W, z, x, roof - 1, z, abs(z - zc) === 17 ? M.D : M.DD);
      else p.box(x, roof - 2, z, x, roof - 1, z, M.D);
    }
    p.set(x, roof, z, (front || back || side) ? M.D : ((x - H.x0) % 6 === 3 && (z - H.z0) % 6 === 3) ? M.VENT : M.DD);
    if (!front && !back && !side && ((x - H.x0) & 3) === 2 && ((z - H.z0) & 3) === 2) p.set(x, roof - 1, z, M.GLOW);
  }
  p.box(H.x0 + 1, 108, zc, H.x1 - 1, 108, zc, M.D);
  p.box(H.x0 + 1, 108, H.z0 + 1, H.x1 - 1, 108, H.z0 + 1, M.DD); p.box(H.x0 + 1, 108, H.z1 - 1, H.x1 - 1, 108, H.z1 - 1, M.DD);
  p.box(2685, 106, zc - 1, 2686, 107, zc, M.DD); p.set(2685, 105, zc, M.CHR); p.set(2685, 104, zc, M.CHR);
  stampShip(shipModels()[0], (x, y, z, id) => p.set(x, y, z, id), 2693, W, zc, 1);
  for (let z = zc - 10; z <= zc + 10; z += 4) { p.set(H.x1 - 1, W, z, M.CON); p.set(H.x1 - 1, W, z + 1, M.DD); }
  for (let x = H.x1 - 5; x <= H.x1 - 1; x++) for (let z = H.z0 + 1; z <= H.z0 + 5; z++) {
    const h = Math.floor(hash2(x, z, 41) * 3.2);
    if (h > 0) p.box(x, W, z, x, W - 1 + h, z, hash2(x, z, 42) < 0.6 ? M.CRATE : M.BARREL);
  }
  for (let x = H.x1 - 5; x <= H.x1 - 1; x++) for (let z = H.z1 - 5; z <= H.z1 - 1; z++) if (hash2(x, z, 43) < 0.4) p.set(x, W, z, M.BARREL);
  p.set(H.x0 + 4, W, H.z0 + 2, M.ANVIL); p.set(H.x0 + 6, W, H.z0 + 2, M.FURNACE); p.set(H.x0 + 8, W, H.z0 + 2, M.TABLE);
  for (const z of [zc - 14, zc + 14]) for (let x = H.x0 + 6; x <= H.x1 - 6; x += 12) lampPost(p, x, z, W);
}

// ------------------------------------------------------------------------------------------------ fuel farm
function paintFuel(p) {
  const Fu = E.fuel;
  if (!p.overlaps(Fu.x0, Fu.z0, Fu.x1, Fu.z1)) return;
  for (const [cx, cz] of Fu.tanks) {
    p.cyl(cx, cz, 6.5, F, F, M.DD); p.cyl(cx, cz, 5.6, F, F, M.RED); p.cyl(cx, cz, 4.8, F, F, M.DD);
    p.cyl(cx, cz, 5.5, W, 111, M.CHR);
    p.cyl(cx, cz, 5.5, 104, 104, M.STR); p.cyl(cx, cz, 4.7, 104, 104, M.CHR);
    p.cyl(cx, cz, 4.5, 112, 112, M.CHR); p.cyl(cx, cz, 3, 113, 113, M.CHR); p.cyl(cx, cz, 1.5, 114, 114, M.DD); p.set(cx, 115, cz, M.LAMP);
    p.box(cx - 1, W, cz - 1, cx, W + 2, cz, M.DD);
  }
  p.box(2681, 100, -84, 2701, 100, -84, M.DD); p.box(2681, 100, -60, 2701, 100, -60, M.DD); p.box(2691, 100, -84, 2691, 100, -60, M.DD);
  for (let z = -84; z <= -60; z += 8) p.col(2691, z, W, 99, M.DD);
  for (let x = 2681; x <= 2701; x += 8) { p.col(x, -84, W, 99, M.DD); p.col(x, -60, W, 99, M.DD); }
  p.box(2689, W, -74, 2693, 100, -70, M.DD); p.box(2690, W, -73, 2692, 99, -71, M.AIR);
  p.box(2689, W, -72, 2689, 98, -72, M.AIR); p.set(2691, 100, -72, M.GLOW); p.set(2692, W, -71, M.CON); p.set(2693, 98, -72, M.RED);
  p.box(2689, 101, -74, 2693, 101, -70, M.D); p.box(2691, 101, -72, 2691, 103, -72, M.DD); p.set(2691, 104, -72, M.LAMP);
  for (let x = Fu.x0; x <= Fu.x1; x++) for (const z of [Fu.z0, Fu.z1]) { p.set(x, W, z, M.DD); p.set(x, W + 1, z, M.GL); }
  for (let z = Fu.z0; z <= Fu.z1; z++) for (const x of [Fu.x0, Fu.x1]) if (abs(z + 71) > 2) { p.set(x, W, z, M.DD); p.set(x, W + 1, z, M.GL); }
  for (const x of [Fu.x0, Fu.x1]) for (const z of [Fu.z0, Fu.z1]) lampPost(p, x, z, W);
  p.box(Fu.x0, F, -73, Fu.x0 + 10, F, -69, LINE);
}

// ------------------------------------------------------------------------------------------------ yards + workshop
function paintYards(p) {
  containers(p, E.yardN, 1); crane(p, 2640, E.yardN.z0 - 2, E.yardN.z1 + 2);
  containers(p, E.yardS, 2); crane(p, 2640, E.yardS.z0 - 2, E.yardS.z1 + 2);
  const Wk = E.workshop;
  if (p.overlaps(Wk.x0, Wk.z0, Wk.x1, Wk.z1)) {
    const roof = 108;
    p.walls(Wk.x0, W, Wk.z0, Wk.x1, roof - 1, Wk.z1, M.DD);
    for (let x = Wk.x0; x <= Wk.x1; x += 8) { p.col(x, Wk.z0, W, roof, M.D); p.col(x, Wk.z1, W, roof, M.D); }
    for (let z = Wk.z0; z <= Wk.z1; z += 7) { p.col(Wk.x0, z, W, roof, M.D); p.col(Wk.x1, z, W, roof, M.D); }
    p.box(Wk.x0, 101, Wk.z0 + 1, Wk.x1, 102, Wk.z1 - 1, M.GL); p.box(Wk.x0, 101, Wk.z0, Wk.x0, 102, Wk.z0, M.D);
    p.box(Wk.x0 + 1, 101, Wk.z0, Wk.x1 - 1, 102, Wk.z0, M.GL); p.box(Wk.x0 + 1, 101, Wk.z1, Wk.x1 - 1, 102, Wk.z1, M.GL);
    p.box(Wk.x0, W, 64, Wk.x0, 104, 76, M.AIR); p.box(Wk.x0, 105, 63, Wk.x0, roof - 1, 77, M.D);
    p.box(Wk.x0, roof, Wk.z0, Wk.x1, roof, Wk.z1, M.DD);
    for (let x = Wk.x0 + 4; x < Wk.x1; x += 8) for (let z = Wk.z0 + 4; z < Wk.z1; z += 7) { p.set(x, roof, z, M.VENT); p.set(x, roof - 1, z, M.GLOW); }
    for (let x = Wk.x0 + 4; x < Wk.x1; x += 8) { p.set(x, W + 1, Wk.z0 + 1, M.GLOW); p.set(x, W + 1, Wk.z1 - 1, M.GLOW); }
    for (let z = Wk.z0 + 3; z <= Wk.z1 - 3; z += 3) p.set(Wk.x1 - 1, W, z, [M.CON, M.ANVIL, M.TABLE, M.FURNACE, M.DD][((z - Wk.z0) / 3) % 5 | 0]);
    for (let x = Wk.x0 + 3; x <= Wk.x1 - 3; x += 3) { p.set(x, W, Wk.z0 + 1, (x & 1) ? M.CRATE : M.BARREL); }
    p.box(2697, F, 66, 2703, F, 74, LINE); p.box(2698, F, 67, 2702, F, 73, M.PLATE);
    stampShip(shipModels()[2], (x, y, z, id) => p.set(x, y, z, id), 2700, W, 70, 1);
  }
}

// ------------------------------------------------------------------------------------------------ plaza
function paintPlaza(p) {
  if (!p.overlaps(2651, -40, 2716, 40)) return;
  for (let x = 2651; x <= 2715; x++) { p.set(x, F, -5, LINE); p.set(x, F, 5, LINE); if ((x & 3) === 0) { p.set(x, F, -4, M.GLOW); p.set(x, F, 4, M.GLOW); } }
  for (let x = 2656; x <= 2712; x += 14) { lampPost(p, x, -8, W); lampPost(p, x, 8, W); }
  p.cyl(2692, 0, 10.5, F, F, M.D); p.cyl(2692, 0, 9.5, F, F, M.STR); p.cyl(2692, 0, 8.5, F, F, M.D);
  p.box(2704, W, -1, 2706, W + 1, 1, M.DD); p.box(2705, W + 2, 0, 2705, 110, 0, M.CHR); p.set(2705, 111, 0, M.BLUE); p.set(2705, 112, 0, M.LAMP);
  for (const [x, z] of [[2703, -2], [2707, -2], [2703, 2], [2707, 2]]) p.set(x, W, z, M.SLAB);
  for (const z of [-20, 20]) for (let x = 2660; x <= 2676; x++) if (x % 5 !== 4) p.set(x, W, z, M.SLAB);
}

export function paintEast(p) {
  paintBridge(p);
  paintTerminal(p);
  paintSpines(p);
  paintPlaza(p);
  paintHangar(p);
  paintFuel(p);
  paintYards(p);
}
