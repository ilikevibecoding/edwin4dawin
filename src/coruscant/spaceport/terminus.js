// Westport Terminus: the undercroft under the terminal's south hall beside the live hyperlane (x 2200..2340, z 3..52).
// Floor slab 88..90, platforms at 91 (feet 92), head room to the deck plate at 96; three yard tracks (A / B / C,
// decks at 89 with rails at 90 like the hyperlane) with buffer stops, the spare train parked on A, island platforms
// between the tracks with glass screen lines (door columns open at the car doors), concourses across the track ends,
// three 10-step stairs and three glass lift shafts up into the concourse of the hall. Platform 1's live edge screen
// (z 3, toggled with the train's doors) is painted by structures/stations.js.
import { M, LINE, halfStair, wallNumber, numberBoard } from './painter.js';
import { TERMINUS as U, DECK_Y } from './plan.js';
import { lowerFloorAt } from '../lowercity/plan.js';
import { doorWorldXs, TRAIN_LENGTH } from '../../vehicles/route.js';
import { buildTrainGrid } from '../../vehicles/train.js';

const BOX = U.box, FLOOR = 91, FEET = 92, DECK = 89, RAIL_Y = 90;
let spareGrid = null;
const spareDoorXs = () => doorWorldXs(U.spareTrainX0);

function paintSlabAndWalls(p) {
  const [x0, x1] = p.xRange(BOX.x0, BOX.x1), [z0, z1] = p.zRange(BOX.z0, BOX.z1);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const track = U.tracks.find((t) => z >= t.z0 && z <= t.z1) || null;
    const inYard = track && x >= U.trackX0 && x <= U.trackX1;
    p.set(x, BOX.floor, z, M.DD);
    if (inYard) {
      // track bed: deck with light edges, lips with blue studs, guide rails
      p.set(x, DECK, z, z === track.z0 || z === track.z1 ? M.D : M.DD);
      if (z === track.z0 || z === track.z1) p.set(x, RAIL_Y, z, (x & 7) === 4 ? M.BLUE : M.DD);
      else if (z === track.z0 + 2 || z === track.z0 + 5) p.set(x, RAIL_Y, z, M.RAILB);
      // buffer stops at both ends
      if ((x <= U.trackX0 + 1 || x >= U.trackX1 - 1) && z > track.z0 && z < track.z1) p.box(x, RAIL_Y, z, x, RAIL_Y + 2, z, M.D), p.set(x, RAIL_Y + 2, z, M.RED);
    } else {
      p.set(x, DECK, z, M.DD); p.set(x, RAIL_Y, z, M.DD);
      const wall = x === BOX.x0 || x === BOX.x1 || z === BOX.z1;
      if (wall) {
        // outer walls 91..95 with lit window bands (views over the lower city); the hyperlane walkway enters at z 3..5
        for (let y = FLOOR; y <= 95; y++) p.set(x, y, z, (y === 92 || y === 93) && ((x + z) & 3) !== 0 && z !== BOX.z1 - 0 ? M.GL : (y === 94 && ((x + z) & 7) === 2) ? M.GLOW : M.DD);
        if ((x === BOX.x0 || x === BOX.x1) && z >= 3 && z <= 5) { p.box(x, FEET, z, x, FEET + 2, z, M.AIR); }
      } else {
        const edge = U.tracks.some((t) => z === t.z0 - 1 || z === t.z1 + 1) && x >= U.trackX0 && x <= U.trackX1;   // platform edge rows
        p.set(x, FLOOR, z, edge ? ((x & 3) === 0 ? M.BLUE : (x & 1) ? M.STR : M.PLATE) : ((x & 7) === 0 || (z & 7) === 0) ? M.DD : M.PLATE);
        // ceiling lights hanging from the deck plate
        if ((x - BOX.x0) % 6 === 3 && (z - BOX.z0) % 8 === 4 && z > 5) p.set(x, 95, z, M.GLOW);
      }
    }
  }
  // the north edge beyond the live platform's screen: barrier (the screen itself comes from stations.js)
  for (let x = x0; x <= x1; x++) if ((x < U.x0 || x > U.x1) && x > BOX.x0 && x < BOX.x1 && p.overlaps(x, 3, x, 3)) { p.set(x, FEET, 3, M.DD); p.set(x, FEET + 1, 3, M.GL); }
  // pylons under the slab down to the lower-city terrace
  for (const px of U.supports.xs) for (const pz of U.supports.zs) {
    if (!p.overlaps(px - 1, pz - 1, px + 2, pz + 2)) continue;
    const ground = lowerFloorAt(px, pz) ?? 12;
    for (let x = px - 1; x <= px + 2; x++) for (let z = pz - 1; z <= pz + 2; z++) {
      const corner = (x === px - 1 || x === px + 2) && (z === pz - 1 || z === pz + 2);
      for (let y = ground - 2; y < BOX.floor; y++) p.set(x, y, z, corner ? M.DD : (y & 7) === 0 ? M.STR : M.D);
    }
    p.box(px - 2, ground + 1, pz - 2, px + 3, ground + 1, pz + 3, M.DD);
    p.box(px - 2, BOX.floor - 2, pz - 2, px + 3, BOX.floor - 1, pz + 3, M.DD); p.box(px - 1, BOX.floor - 1, pz - 1, px + 2, BOX.floor - 1, pz + 2, M.BLUE);
  }
}

// Glass screen lines at the numbered platform faces (static: the yard trains never move), door columns open at the
// car door positions, boarding pads on the floor, platform numbers on the screen heads, a holo board per platform.
function paintScreens(p) {
  const doors = spareDoorXs();
  for (const pl of U.platforms) for (const z of pl.screens) {
    if (z === 3) continue;                                                               // the live edge: stations.js
    if (!p.overlaps(U.trackX0, z, U.trackX1, z)) continue;
    const [x0, x1] = p.xRange(U.trackX0 + 2, U.trackX1 - 2);
    for (let x = x0; x <= x1; x++) {
      const door = doors.some((dx) => x === dx || x === dx + 1);
      p.set(x, FLOOR, z, M.D);                                                           // the screen stands on the platform's edge course over the track lip
      p.set(x, FEET, z, door ? M.AIR : M.GL); p.set(x, FEET + 1, z, door ? M.AIR : M.GL);
      p.set(x, FEET + 2, z, door ? M.HOLO : (x % 6 === 3 ? M.GLOW : M.DD));
      if (door) p.set(x, FLOOR, z + (pl.n === 4 ? -1 : 1), M.GLOW);
    }
    const bx = U.trackX0 + 6;
    numberBoard(p, pl.n, bx, z + (pl.n === 4 ? -2 : 2), FEET, false, 1);
    p.box(bx + 20, FEET + 2, z + (pl.n === 4 ? -2 : 2), bx + 27, FEET + 3, z + (pl.n === 4 ? -2 : 2), M.HOLO);
  }
  // platform 1's number and board on the back wall side (its screen is live)
  numberBoard(p, 1, U.x0 - 6, 6, FEET, false, 1); p.box(U.x0 + 14, FEET + 2, 6, U.x0 + 21, FEET + 3, 6, M.HOLO);
}

// Stairs (10 half steps eastward from the hall floor 97 down to 92) with glass rails round the openings, and the lifts.
function paintAccess(p) {
  for (const s of U.stairs) {
    if (!p.overlaps(s.x0 - 1, s.z0 - 1, s.x0 + 11, s.z1 + 1)) continue;
    halfStair(p, s.x0, s.z0, s.z1, DECK_Y, 10, 1);
    // rails along both sides of the opening in the hall floor; the west end (x0 - 1) is the entry from the hall
    for (let x = s.x0 - 1; x <= s.x0 + 10; x++) { p.set(x, DECK_Y, s.z0 - 1, M.GL); p.set(x, DECK_Y, s.z1 + 1, M.GL); }
    for (let z = s.z0; z <= s.z1; z++) { p.set(s.x0 - 1, DECK_Y, z, M.AIR); p.set(s.x0 - 1, DECK_Y + 1, z, M.AIR); }
    for (let i = 0; i < 10; i++) { const h = DECK_Y - 0.5 * (i + 1), x = s.x0 + i; for (const z of [s.z0 - 1, s.z1 + 1]) if (h + 1 < 96) p.set(x, Math.floor(h) + 1, z, i % 4 === 0 ? M.DD : M.GL); }
    p.set(s.x0 + 10, FEET + 2, s.z0, M.GLOW);
  }
  for (const l of U.lifts) {
    if (!p.overlaps(l.x - 1, l.z - 1, l.x + 1, l.z + 1)) continue;
    for (let x = l.x - 1; x <= l.x + 1; x++) for (let z = l.z - 1; z <= l.z + 1; z++) {
      const corner = (x === l.x - 1 || x === l.x + 1) && (z === l.z - 1 || z === l.z + 1);
      for (let y = FLOOR; y <= 101; y++) p.set(x, y, z, corner ? M.DD : (x === l.x && z === l.z) ? (y === 96 || y === FLOOR ? M.CHR : M.AIR) : (y === 96 || y === 101 || y === FLOOR) ? M.DD : M.GL);
    }
    p.set(l.x, 95, l.z, M.GLOW); p.set(l.x, 101, l.z, M.GLOW); p.set(l.x, 102, l.z, M.D);
    // doors (west face) at both levels, call panels beside them
    p.box(l.x - 1, FEET, l.z, l.x - 1, FEET + 1, l.z, M.AIR); p.box(l.x - 1, DECK_Y, l.z, l.x - 1, DECK_Y + 1, l.z, M.AIR);
    p.set(l.x - 1, FEET + 1, l.z - 1, M.BLUE); p.set(l.x - 1, DECK_Y + 1, l.z - 1, M.BLUE);
  }
}

// The spare train: a static voxel copy of the space train parked on track A (doors toward platform 2).
function paintSpareTrain(p) {
  const x0 = U.spareTrainX0, z0 = U.tracks[0].z0 + 1;
  if (!p.overlaps(x0, z0, x0 + TRAIN_LENGTH - 1, z0 + 5)) return;
  if (!spareGrid) spareGrid = buildTrainGrid().grid;
  const g = spareGrid;
  const [xa, xb] = p.xRange(x0, x0 + g.w - 1);
  for (let x = xa; x <= xb; x++) for (let y = 0; y < g.h; y++) for (let z = 0; z < g.d; z++) {
    const id = g.get(x - x0, y, z);
    if (id) p.set(x, RAIL_Y + y, z0 + z, id);
  }
  // "SPARE" holo strip on the concourse wall beyond the buffer, wheel-tap droid crates on the platform
  p.box(x0 - 8, FEET + 1, z0 + 1, x0 - 8, FEET + 2, z0 + 4, M.HOLO);
}

// Name boards for the terminus on the platform 2 / 3 island ends and lit "WESTPORT" strips under the plate, the
// platform 1 number set into the west wall and the timetable text rows (WALL_SIGN tiles; stations.js registers the
// text) beside it.
function paintDressing(p) {
  for (const x of [U.trackX0 - 4, U.trackX1 + 4]) for (const z of [15, 31, 45]) if (p.overlaps(x, z, x, z)) { p.col(x, z, FEET, FEET + 1, M.CHR); p.set(x, FEET + 2, z, M.BLUE); }
  for (const z of [8, 23, 39]) for (let x = U.trackX0 + 10; x <= U.trackX1 - 10; x += 16) if (p.overlaps(x, z, x + 2, z)) { p.box(x, FEET, z, x + 2, FEET, z, M.SLAB); }
  for (let x = U.x0; x <= U.x1; x += 12) if (p.overlaps(x, 7, x + 5, 7)) p.box(x, 95, 6, x + 5, 95, 6, M.HOLO);
  if (p.overlaps(BOX.x0, 4, BOX.x0 + 1, 14)) {
    wallNumber(p, 1, BOX.x0, FLOOR, 6, M.GLOW, M.BLK);
    for (const s of U.signs) for (let k = 0; k < 4; k++) p.set(s.x, s.y, s.z - k, M.SIGN);
  }
}

export function paintTerminus(p) {
  if (!p.overlaps(BOX.x0 - 3, BOX.z0 - 1, BOX.x1 + 3, BOX.z1 + 3)) return;
  paintSlabAndWalls(p);
  paintScreens(p);
  paintAccess(p);
  paintSpareTrain(p);
  paintDressing(p);
}
