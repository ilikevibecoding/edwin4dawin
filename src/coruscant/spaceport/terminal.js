// Westport Grand Terminal: a 120 x 107 glass hall on the apron (floor 96 / feet 97, walls to 109, stepped glass roof
// 110..112) that the hyperlane promenade (the hump, walk 99) crosses east-west. North hall: check-in counters with
// the baggage hall behind them, waiting rows, the information pylon, the customs hall (arrivals) with its scanner
// arches. South hall: the terminus concourse (stair heads and lift shafts down to the platforms, painted by
// terminus.js), the caf, two shops and the toilets. A viewing gallery (mezzanine, feet 104) runs along the west wall.
// Eight 4-wide doors (gate numbers beside the pad-side ones) plus the two promenade doors.
import { M, LINE, halfStair, wallNumber, wallNumberX } from './painter.js';
import { TERMINAL as T, TERMINAL_DOORS, DOOR_GATES, TZ, HUMP, inTube, DECK_TOP, DECK_Y } from './plan.js';
import { hash2 } from '../../rng.js';

const abs = Math.abs;
const F = DECK_TOP, W = DECK_Y;                                            // floor layer 96, feet 97
export const roofY = (z) => T.roof + (abs(z) <= 14 ? 2 : abs(z) <= 32 ? 1 : 0);
// the promenade's walking level at z (the ramps climb from the hall floor on both sides of the tube)
const humpLevel = (z) => (z >= -6 && z <= 5) ? 99 : (z === -7 || z === 6) ? 98.5 : (z === -8 || z === 7) ? 98 : (z === -9 || z === 8) ? 97.5 : 97;
const inHumpZ = (z) => z >= HUMP.z0 && z <= HUMP.z1;

function floorId(x, z) {
  if (x === T.cx - 1 || x === T.cx) return (z & 3) === 0 ? M.GLOW : LINE;                   // north-south spine
  if (z === -27 || z === -20 || z === 18 || z === 25) return (x & 3) === 0 ? M.GLOW : LINE;   // door-to-door lanes
  return ((x & 7) === 0 || (z & 7) === 0) ? M.DD : M.D;
}
function wallId(along, y, ry, corner) {
  if (y <= W + 1) return (y === W + 1 && !corner && (along & 7) === 4) ? M.GLOW : M.DD;      // dark base with light slots
  if (y <= ry - 4) return (corner || (along & 3) === 0) ? M.D : M.GL;                      // glass with mullions every 4
  return y === ry - 2 ? M.STR : M.D;                                                        // fascia band
}

// glass partition (dark base, glass, lintel) along x (z fixed) or along z (x fixed), `h` blocks tall
function partitionX(p, x0, x1, z, h = 5) { p.box(x0, W, z, x1, W, z, M.DD); p.box(x0, W + 1, z, x1, W + h - 2, z, M.GL); p.box(x0, W + h - 1, z, x1, W + h - 1, z, M.D); }
function partitionZ(p, x, z0, z1, h = 5) { p.box(x, W, z0, x, W, z1, M.DD); p.box(x, W + 1, z0, x, W + h - 2, z1, M.GL); p.box(x, W + h - 1, z0, x, W + h - 1, z1, M.D); }
const doorX = (p, x0, x1, z, h = 3) => p.box(x0, W, z, x1, W + h - 1, z, M.AIR);
const doorZ = (p, x, z0, z1, h = 3) => p.box(x, W, z0, x, W + h - 1, z1, M.AIR);

function paintShell(p) {
  const [x0, x1] = p.xRange(T.x0, T.x1), [z0, z1] = p.zRange(T.z0, T.z1);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const ry = roofY(z), onX = x === T.x0 || x === T.x1, onZ = z === T.z0 || z === T.z1, corner = onX && onZ;
    if (!inHumpZ(z)) p.set(x, F, z, floorId(x, z));                                          // the hump keeps its ramps / cover
    if (onX || onZ) {
      const along = onX ? z : x - T.x0;
      // the promenade passes through the east / west walls: nothing below its walking level is touched, the passage
      // is open to 102, a holo header spans it at 103..104
      const yStart = onX && inHumpZ(z) ? Math.floor(humpLevel(z)) + 1 : W;
      for (let y = yStart; y < ry; y++) {
        if (onX && inHumpZ(z)) { if (y <= 102) p.set(x, y, z, M.AIR); else if (y <= 104) p.set(x, y, z, M.HOLO); else p.set(x, y, z, wallId(along, y, ry, false)); }
        else p.set(x, y, z, wallId(along, y, ry, corner));
      }
      if (onX && (z === HUMP.z0 - 1 || z === HUMP.z1 + 1)) p.col(x, z, W, 104, M.GLOW);    // promenade door jambs
    }
    // roof: durasteel frame every 8, tinted glass between
    p.set(x, ry, z, (((x - T.x0) & 7) === 0 || (z & 7) === 0 || onX || onZ) ? M.D : M.GL);
    // ceiling lights and interior pillars
    if (!onX && !onZ) {
      if ((x - T.x0) % 6 === 3 && (z - T.z0) % 6 === 3 && !inHumpZ(z)) p.set(x, ry - 1, z, M.GLOW);
      if ((x === 2262 || x === 2280 || x === 2320 || x === 2338) && (z === -30 || z === -16 || z === 16 || z === 30 || z === 44)) {
        p.col(x, z, W, ry - 1, M.D); p.set(x, W + 1, z, M.GLOW); p.set(x, W + 8, z, M.GLOW);
      }
    }
  }
  // ground doors: 4 wide, 4 high, holo header, glow jambs, the hall name on the fascia above
  TERMINAL_DOORS.forEach((d, i) => {
    if (d.side === 'W' || d.side === 'E') {
      p.box(d.x, W, d.z0, d.x, W + 3, d.z1, M.AIR); p.box(d.x, W + 4, d.z0, d.x, W + 5, d.z1, M.HOLO);
      p.col(d.x, d.z0 - 1, W, W + 5, M.GLOW); p.col(d.x, d.z1 + 1, W, W + 5, M.GLOW);
      p.box(d.x, 108, d.z0 - 4, d.x, 108, d.z1 + 4, M.HOLO);
    } else {
      p.box(d.x0, W, d.z, d.x1, W + 3, d.z, M.AIR); p.box(d.x0, W + 4, d.z, d.x1, W + 5, d.z, M.HOLO);
      p.col(d.x0 - 1, d.z, W, W + 5, M.GLOW); p.col(d.x1 + 1, d.z, W, W + 5, M.GLOW);
      p.box(d.x0 - 4, 108, d.z, d.x1 + 4, 108, d.z, M.HOLO);
    }
  });
  // gate ranges beside the pad-side doors (lit digits on black panels in the glass band, y 100..104)
  for (const [di, a, b] of DOOR_GATES) {
    const d = TERMINAL_DOORS[di];
    if (d.side === 'N' || d.side === 'S') { wallNumberX(p, a, d.x0 - 10, 100, d.z, M.GLOW, M.BLK); wallNumberX(p, b, d.x1 + 4, 100, d.z, M.GLOW, M.BLK); }
    else { wallNumber(p, a, d.x, 100, d.z0 - 10, M.GLOW, M.BLK); wallNumber(p, b, d.x, 100, d.z1 + 4, M.GLOW, M.BLK); }
  }
}

function paintNorthHall(p) {
  if (!p.overlaps(T.x0, T.z0, T.x1, -10)) return;
  const B = TZ.baggage, C = TZ.checkIn;
  // check-in counters: dark desks with consoles every 4, a staff aisle at x 2270..2273, holo boards on a beam above
  for (let x = C.x0; x <= C.x1; x++) {
    if (x >= 2270 && x <= 2273) continue;
    p.set(x, W, C.z, (x & 3) === 2 ? M.CON : M.DD);
    if ((x & 7) < 6 && x > C.x0 && x < C.x1) p.box(x, W + 3, C.z, x, W + 4, C.z, M.HOLO);
  }
  for (const x of [C.x0, 2269, 2274, C.x1]) p.col(x, C.z, W + 1, W + 2, M.DD);
  p.box(C.x0, W + 5, C.z, C.x1, W + 5, C.z, M.D);
  // baggage hall behind a glass partition (staff gap at the aisle), two lit belt loops with bags, sorting consoles,
  // two cart mouths through the north wall out to the apron
  partitionX(p, B.x0 - 1, B.x1 + 1, B.z1 + 1);
  doorX(p, 2270, 2273, B.z1 + 1);
  for (let x = B.x0 + 4; x <= B.x1 - 4; x++) {
    for (const z of [B.z0 + 3, B.z0 + 8]) {
      p.set(x, W, z, (x & 1) ? M.STR : M.DD);
      if (hash2(x, z, 71) < 0.35) p.set(x, W + 1, z, hash2(x, z, 72) < 0.7 ? M.CRATE : M.BARREL);
    }
    if ((x - B.x0) % 12 === 6) { p.set(x, W, B.z0 + 5, M.CON); p.set(x, W, B.z0 + 6, M.DD); }
  }
  for (const x of [B.x0 + 4, B.x1 - 4]) p.box(x, W, B.z0 + 3, x, W, B.z0 + 8, M.STR);                   // belt ends
  for (const x of [2260, 2286]) { p.box(x, W, T.z0, x + 1, W + 1, T.z0, M.AIR); p.box(x - 1, W, T.z0, x - 1, W + 2, T.z0, M.RED); p.box(x + 2, W, T.z0, x + 2, W + 2, T.z0, M.RED); p.box(x, W + 2, T.z0, x + 1, W + 2, T.z0, M.RED); }
  for (let x = B.x0; x <= B.x1; x += 8) p.set(x, W + 5, B.z0 + 5, M.GLOW);                            // work lights (hang from the roof beam level)
  // waiting rows (benches of five with aisles), information pylon at the spine
  const A = TZ.waiting;
  for (const z of [A.z0 + 2, A.z0 + 6, A.z0 + 10]) for (let x = A.x0 + 2; x <= A.x1 - 2; x++) if ((x - A.x0) % 6 !== 1) p.set(x, W, z, M.SLAB);
  const K = TZ.kiosk;
  p.box(K.x0, W, K.z0, K.x1, W, K.z1, M.DD); p.set(K.x0 + 1, W + 1, K.z0 + 1, M.CHR); p.box(K.x0 + 1, W + 2, K.z0 + 1, K.x0 + 1, W + 3, K.z0 + 1, M.HOLO);
  // departure boards: two holo panels facing the waiting rows, hung from the roof
  for (const [bx0, bx1] of [[2262, 2292], [2308, 2338]]) {
    p.box(bx0, W + 4, -12, bx1, W + 5, -12, M.HOLO);
    for (const x of [bx0, (bx0 + bx1) >> 1, bx1]) p.col(x, -12, W + 6, roofY(-12) - 1, M.DD);
  }
  // customs hall (arrivals): glass walls, 4-wide door with a holo header, three scanner arches with lanes, inspection
  // tables, the officers' counter, two glass booths, a holding cell, the x-ray belt
  const U = TZ.customs;
  partitionZ(p, U.x0, U.z0, U.z1, 7); partitionX(p, U.x0, U.x1, U.z1, 7);
  doorX(p, 2328, 2331, U.z1, 4); p.box(2328, W + 4, U.z1, 2331, W + 5, U.z1, M.HOLO);
  for (const ax of [2312, 2326, 2340]) {
    p.col(ax, -24, W, W + 3, M.DD); p.col(ax + 2, -24, W, W + 3, M.DD); p.box(ax, W + 4, -24, ax + 2, W + 4, -24, M.BLUE); p.set(ax + 1, W + 3, -24, M.GLOW);
    for (let z = -28; z <= -18; z++) { p.set(ax - 1, F, z, LINE); p.set(ax + 3, F, z, LINE); }
    p.set(ax + 1, W, -30, M.TABLE); p.set(ax + 2, W, -30, M.CON);
  }
  for (let x = 2316; x <= 2348; x++) p.set(x, W, -34, (x & 3) === 0 ? M.CON : M.DD);
  for (const bx of [2312, 2340]) { p.box(bx, F, -38, bx + 2, F, -36, M.DD); p.walls(bx, W, -38, bx + 2, W + 2, -36, M.GL); p.box(bx, W + 3, -38, bx + 2, W + 3, -36, M.DD); p.set(bx + 1, W + 3, -37, M.GLOW); p.set(bx + 1, W, -38, M.CON); p.box(bx + 1, W, -36, bx + 1, W + 1, -36, M.AIR); }
  p.box(2350, W, -40, 2357, W + 2, -40, M.BARS); p.box(2350, W, -44, 2350, W + 2, -41, M.BARS); p.box(2350, W + 3, -44, 2357, W + 3, -40, M.DD); p.box(2353, W, -40, 2354, W + 1, -40, M.AIR); p.set(2355, W, -43, M.SLAB);
  p.box(2310, W, -20, 2325, W, -20, M.STR); p.box(2317, W, -21, 2319, W + 2, -19, M.DD); p.box(2317, W, -20, 2319, W + 1, -20, M.AIR); p.set(2318, W + 2, -20, M.BLUE);
}

function paintSouthHall(p) {
  if (!p.overlaps(T.x0, 9, T.x1, T.z1)) return;
  // concourse: "TO TRAINS" holo gantries over the stair heads and lift doors (the stairs / shafts come from terminus.js)
  for (const z of [9, 23, 38]) { p.box(2280, W + 3, z, 2280, W + 4, z + 1, M.HOLO); p.col(2280, z - 1, W, W + 4, M.DD); p.col(2280, z + 2, W, W + 4, M.DD); }
  for (let z = 12; z <= 24; z += 6) for (let x = 2246; x <= 2276; x++) if ((x - 2246) % 6 !== 5) p.set(x, W, z, M.SLAB);   // benches west of the stairs
  // caf: glass partitions with doors east and north, bar, back shelf with blue light, menu board, tables and seats
  const Cf = TZ.cafe;
  partitionZ(p, Cf.x1, Cf.z0, Cf.z1); partitionX(p, Cf.x0, Cf.x1, Cf.z0);
  doorZ(p, Cf.x1, 45, 46); doorX(p, 2260, 2261, Cf.z0);
  p.box(Cf.x1, W + 3, 44, Cf.x1, W + 4, 47, M.HOLO);
  p.box(Cf.x0 + 4, W, Cf.z0 + 4, Cf.x0 + 4, W, Cf.z1 - 4, M.DD); p.set(Cf.x0 + 4, W, Cf.z0 + 4, M.BARREL); p.set(Cf.x0 + 4, W, Cf.z1 - 4, M.BARREL);
  for (let z = Cf.z0 + 6; z <= Cf.z1 - 6; z += 5) p.set(Cf.x0 + 4, W, z, M.CON);
  p.box(Cf.x0 + 1, W, Cf.z0 + 4, Cf.x0 + 1, W + 1, Cf.z1 - 4, M.SHELF); p.box(Cf.x0 + 1, W + 2, Cf.z0 + 4, Cf.x0 + 1, W + 2, Cf.z1 - 4, M.BLUE);
  p.box(Cf.x0 + 1, W + 3, Cf.z0 + 8, Cf.x0 + 1, W + 4, Cf.z1 - 8, M.HOLO);
  for (let x = Cf.x0 + 12; x <= Cf.x1 - 4; x += 6) for (let z = Cf.z0 + 5; z <= Cf.z1 - 3; z += 6) { p.set(x, W, z, M.TABLE); p.set(x - 1, W, z, M.SLAB); p.set(x + 1, W, z, M.SLAB); }
  // two shops: glass fronts on the concourse with 4-wide doors and holo signs, counter, back shelves, stock
  for (const [S, dx] of [[TZ.shop1, 2298], [TZ.shop2, 2336]]) {
    partitionX(p, S.x0, S.x1, S.z0); partitionZ(p, S.x0, S.z0, S.z1); partitionZ(p, S.x1, S.z0, S.z1);
    doorX(p, dx, dx + 3, S.z0); p.box(dx, W + 3, S.z0, dx + 3, W + 4, S.z0, M.HOLO);
    p.box(S.x0 + 1, W, S.z1, S.x1 - 1, W + 1, S.z1, M.SHELF); p.box(S.x0 + 1, W + 2, S.z1, S.x1 - 1, W + 2, S.z1, M.GLOW);
    p.box(S.x0 + 3, W, S.z0 + 5, S.x0 + 9, W, S.z0 + 5, M.DD); p.set(S.x0 + 6, W, S.z0 + 5, M.CON);
    for (let x = S.x0 + 12; x <= S.x1 - 2; x++) for (let z = S.z0 + 3; z <= S.z1 - 2; z++) if (z !== S.z0 + 4 && hash2(x, z, 73) < 0.18) p.set(x, W, z, hash2(x, z, 74) < 0.6 ? M.CRATE : M.BARREL);   // z0 + 4: the clerks' aisle
  }
  // toilets: solid walls, two doors with blue / white markers, a centre partition, basins and stalls, ceiling lights
  const Tt = TZ.toilets;
  p.walls(Tt.x0, W, Tt.z0, Tt.x1, W + 3, Tt.z1, M.DD); p.walls(Tt.x0, W + 4, Tt.z0, Tt.x1, W + 4, Tt.z1, M.D);
  p.box(Tt.x0, W + 5, Tt.z0, Tt.x1, W + 5, Tt.z1, M.DD);
  for (const x of [2330, 2346]) { doorX(p, x, x + 1, Tt.z0); p.set(x - 1, W + 3, Tt.z0, x === 2330 ? M.BLUE : M.GLOW); p.set(x + 2, W + 3, Tt.z0, x === 2330 ? M.BLUE : M.GLOW); }
  p.box(2338, W, Tt.z0 + 1, 2338, W + 4, Tt.z1 - 1, M.DD);
  for (const x0 of [Tt.x0 + 1, 2339]) {
    for (let x = x0 + 2; x <= x0 + 12; x += 2) p.set(x, W, Tt.z1 - 1, M.CHR);
    for (let x = x0 + 1; x <= x0 + 13; x += 3) p.box(x, W, Tt.z0 + 2, x, W + 2, Tt.z0 + 4, M.DD);
    for (let x = x0 + 3; x <= x0 + 13; x += 3) p.set(x, W + 4, Tt.z0 + 4, M.GLOW);
  }
}

// Mezzanine along the west wall (floor 103, feet 104) with glass balustrade, benches, viewing consoles with holo
// boards, and two 14-step stairs down to the hall.
function paintGallery(p) {
  const G = TZ.gallery;
  if (!p.overlaps(G.x0, T.z0, G.x1 + 14, T.z1)) return;
  const [z0, z1] = p.zRange(T.z0 + 1, T.z1 - 1);
  for (let z = z0; z <= z1; z++) {
    for (let x = G.x0; x <= G.x1; x++) p.set(x, G.y, z, ((x - G.x0) % 5 === 2 && (z & 7) === 4) ? M.GLOW : ((z & 7) === 0 ? M.DD : M.D));
    const stairHead = TZ.galleryStairs.some((s) => z >= s.z0 && z <= s.z1);
    if (!stairHead) p.set(G.x1 + 1, G.y, z, M.DD), p.set(G.x1 + 1, G.y + 1, z, (z % 6 === 0) ? M.DD : M.GL);
    else p.set(G.x1 + 1, G.y, z, M.D);
    if ((z & 1) === 0 && (z % 12) !== 0 && !stairHead) p.set(G.x0 + 1, G.y + 1, z, M.SLAB);
    if ((z % 12) === 0) { p.set(G.x0, G.y + 1, z, M.CON); p.box(G.x0, G.y + 2, z, G.x0, G.y + 3, z, M.HOLO); }
  }
  for (const s of TZ.galleryStairs) {
    halfStair(p, G.x1 + 1, s.z0, s.z1, G.y + 1, 14, 1);
    for (const z of [s.z0 - 1, s.z1 + 1]) for (let i = 0; i < 14; i++) { const h = G.y + 1 - 0.5 * (i + 1), x = G.x1 + 1 + i; p.set(x, Math.floor(h) + 1, z, M.GL); if (i % 4 === 0) p.set(x, Math.floor(h) + 1, z, M.DD); }
  }
}

export function paintTerminal(p) {
  if (!p.overlaps(T.x0, T.z0, T.x1, T.z1)) return;
  paintShell(p);
  paintNorthHall(p);
  paintSouthHall(p);
  paintGallery(p);
}
