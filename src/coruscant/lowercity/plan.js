// Lower-city plan (spec section 4): the pure, deterministic geometry that lowercity.js paints. Everything is a
// function of a column's local frame (see worldgen.js lowerLocal): side (0 W, 1 E, 2 N, 3 S), d (Chebyshev distance
// outside the plateau edge, 1..400) and v (the coordinate along that edge, centred on the plateau).
//
// Radial layout of every terrace band (r = offset inside the band, 0..103; worldgen LOWER.bandW):
//   r 0..15   face strip: service deck at the foot of the terrace wall (conduits, vents, lamps, stair towers)
//   r 16..99  three rows of 28 x 28 cells (two in the outermost band): building masses, industrial rooms,
//             ventilation wells, container yards, open plazas; the alleys between them are the openings
//   r 100..103 rail deck along the terrace edge (the next band is 10 blocks lower)
// Radial lines through all bands: freight trenches at v = 168k (8 wide, floor 10 below the terrace, stairs at the
// terrace steps) and service corridors at v = 42 + 84k (4 wide, slab stairs down every terrace, a stair tower to the
// rim at the plateau face). Roofs stay under envelope(d), which falls from 59 at the face to 20 at the sea wall.
import { hash2 } from '../../rng.js';
import { LOWER, lowerBand, lowerLocal } from '../../worldgen.js';

export const LC = {
  faceW: 16, cell: 28, railW: 4,
  trenchEvery: 168, trenchMaxK: 3, trenchHalf: 4,      // trench cells tv -4..3, ledges (railing) at tv -5 and 4
  corridorEvery: 84, corridorOff: 42,                    // corridor cells cv -2..1
  envTop: 59, envBottom: 20,
  cornerV: 500,                                          // |v| beyond this: open yards only (the side seam runs there)
};
export const K = { MASS: 1, ROOM: 2, WELL: 3, YARD: 4, PLAZA: 5 };
export const WALLS = ['dark', 'black', 'stone'];

// Highest block layer allowed at distance d (the "roof line" of the lower city descends monotonically outward).
export const envelope = (d) => Math.floor(LC.envTop - ((LC.envTop - LC.envBottom) * Math.min(d, LOWER.wallD0)) / LOWER.wallD0);
export const rowsOf = (band) => (band === LOWER.levels.length - 1 ? 2 : 3);
export const railR0 = (band) => LC.faceW + rowsOf(band) * LC.cell;        // 100 (bands 0..2), 72 (band 3: then the wall)
export const bandStartD = (band) => band * LOWER.bandW + 1;
export const groundOf = (band) => LOWER.levels[band];
// Trench floor of a band (10 below the terrace, never below the reclamation floor); null where the terrace is the floor.
export function trenchFloor(band) {
  if (band >= LOWER.levels.length) return null;
  const f = Math.max(LOWER.levels[band] - 10, LOWER.floor);
  return f < LOWER.levels[band] ? f : null;
}

// Trench-relative offset of a column (tv in -5..4, ledges included) or null.
export function trenchOf(v) {
  const k = Math.round(v / LC.trenchEvery);
  if (Math.abs(k) > LC.trenchMaxK) return null;
  const tv = v - k * LC.trenchEvery;
  return tv < -LC.trenchHalf - 1 || tv > LC.trenchHalf ? null : tv;
}
// Corridor centre nearest v (the corridor spans c - 2 .. c + 1), or null where there is none: the west side has no
// corridor at v = -42 (the freight ramp switchbacks there) and none beyond the plateau corners.
export function corridorCentre(side, v) {
  const c = LC.corridorOff + LC.corridorEvery * Math.round((v - LC.corridorOff) / LC.corridorEvery);
  if (Math.abs(c) > LC.cornerV - 10) return null;
  if (side === 0 && c === -42) return null;
  return c;
}
export function corridorOf(side, v) {
  const c = corridorCentre(side, v);
  if (c === null) return null;
  const cv = v - c;
  return cv < -2 || cv > 1 ? null : cv;
}

// ------------------------------------------------------------------------------------------------ cells
// A cell is (side, band, row, j): v in [28j, 28j + 28), r in [16 + 28 row, 44 + 28 row). Its content and the inset
// footprint of its mass are hashed once and memoised. Footprints keep clear of the trenches and corridors.
const cellCache = new Map();
const cellKey = (side, band, row, j) => (((side * 8 + band) * 4 + row) * 8192) + (j + 4096);
export function cellAt(side, band, row, j) {
  const key = cellKey(side, band, row, j);
  let c = cellCache.get(key);
  if (c) return c;
  const seed = (side * 1000 + band * 100 + row) | 0;
  const h = (n) => hash2(seed, j * 16 + n, 7001 + n);
  const v0 = j * LC.cell, v1 = v0 + LC.cell, r0 = LC.faceW + row * LC.cell, r1 = r0 + LC.cell;
  const ground = groundOf(band);
  let kind;
  const pick = h(0);
  if (Math.abs(v0) + LC.cell > LC.cornerV) kind = pick < 0.5 ? K.YARD : K.PLAZA;
  else kind = pick < 0.56 ? K.MASS : pick < 0.66 ? K.ROOM : pick < 0.76 ? K.WELL : pick < 0.9 ? K.YARD : K.PLAZA;
  // footprint
  let fv0, fv1, fr0, fr1;
  if (kind === K.WELL) { fv0 = v0 + 10; fv1 = v0 + 18; fr0 = r0 + 10; fr1 = r0 + 18; }
  else { fv0 = v0 + 2 + Math.floor(h(1) * 3); fv1 = v1 - 2 - Math.floor(h(2) * 3); fr0 = r0 + 2 + Math.floor(h(3) * 3); fr1 = r1 - 2 - Math.floor(h(4) * 3); }
  // keep 3 clear of a trench (ledges at tv -5 / 4) and 2 clear of a corridor (cv -2 .. 1)
  const clip = (a, b) => {                       // remove [a, b) from [fv0, fv1), keeping the larger remainder
    if (b <= fv0 || a >= fv1) return;
    const left = a - fv0, right = fv1 - b;
    if (left >= right) fv1 = Math.min(fv1, a); else fv0 = Math.max(fv0, b);
  };
  for (let k = -LC.trenchMaxK; k <= LC.trenchMaxK; k++) { const t = k * LC.trenchEvery; clip(t - LC.trenchHalf - 4, t + LC.trenchHalf + 4); }
  const cc = corridorCentre(side, v0 + LC.cell / 2);
  if (cc !== null) clip(cc - 4, cc + 4);
  if (kind === K.WELL && (fv1 - fv0 < 8)) kind = K.YARD;
  if ((kind === K.MASS || kind === K.ROOM) && fv1 - fv0 < 8) kind = K.YARD;
  if (kind === K.ROOM && (fv1 - fv0 < 12 || fr1 - fr0 < 12)) kind = K.MASS;
  const env = envelope(bandStartD(band) + fr1 - 1);                    // the envelope at the footprint's far edge
  const roof = Math.max(ground + 6, env - 1 - Math.floor(h(5) * 3));   // parapet at roof + 1 stays under the envelope
  const style = Math.floor(h(6) * WALLS.length);
  const lit = 0.08 + h(7) * 0.1;
  const beacon = roof + 2 <= env && h(8) < 0.35;
  c = { side, band, row, j, kind, v0, v1, r0, r1, fv0, fv1, fr0, fr1, ground, roof, env, style, lit, beacon, seed: Math.floor(h(9) * 1e6) };
  if (cellCache.size > 4096) cellCache.clear();
  cellCache.set(key, c);
  return c;
}
export const inFoot = (c, d, v) => { const r = d - bandStartD(c.band); return v >= c.fv0 && v < c.fv1 && r >= c.fr0 && r < c.fr1; };

// ------------------------------------------------------------------------------------------------ stairs
// Slab stairs down a terrace step: 2 * drop half-steps spread over the last `drop` columns of the upper band and the
// first `drop` of the lower one. Returns the walking surface at (band, r) or null off the stair.
export function stepSurface(band, r, upperFloor, lowerFloor, upperBand) {
  const drop = upperFloor - lowerFloor;
  if (drop <= 0) return null;
  const upperEnd = upperBand === LOWER.levels.length - 1 ? railR0(upperBand) : LOWER.bandW;
  let q;
  if (band === upperBand) { if (r < upperEnd - drop) return null; q = r - (upperEnd - drop); }
  else if (band === upperBand + 1) { if (r >= drop) return null; q = r + drop; }
  else return null;
  if (q >= 2 * drop) return null;
  return upperFloor + 1 - 0.5 * (q + 1);
}
export function frameOf(d) { const { band, r } = lowerBand(d); return { band, r }; }

// Walking floor (top block layer) of a lower-city column before the objects are painted: the trench floor inside a
// freight trench, the terrace elsewhere, the wall top on the sea wall; null outside the ring. Used by the hyperlane
// for its bridge pylons (they stand on the trench floor under the track) and by the tests.
export function lowerFloorAt(x, z) {
  const loc = lowerLocal(x, z);
  if (!loc) return null;
  const { band } = lowerBand(loc.d);
  if (band >= LOWER.levels.length) return LOWER.wallTop;
  const tv = trenchOf(loc.v);
  if (tv !== null && tv >= -LC.trenchHalf && tv < LC.trenchHalf) return trenchFloor(band) ?? groundOf(band);
  return groundOf(band);
}

// ------------------------------------------------------------------------------------------------ routes
// Stair towers to the rim stand at every corridor of every side (the corridor's v is their centre); the public
// lift (glass tower, cab shaft, landings at 61 / 41 / 31) stands beside the south freight trench near x 3000.
export const PUBLIC_LIFT = { side: 3, c: 8, mirror: true, glass: true, bottom: 31, landing: 41, trench: true };
// Freight route (west side, local frame: d outward = -x, v = z). The lane leaves the spaceport's west edge on the
// plateau ground (feet 61), descends 1:4 through a cut in the plateau edge to 58, turns onto the first switchback leg
// along the face (58 -> 43 over 60 blocks), turns, comes back on the second leg (43 -> 31), and a level passage
// cut into the deck joins the freight trench (floor 30) under the hyperlane.
export const FREIGHT_RAMP = {
  side: 0,
  laneZ0: -10, laneZ1: -8, laneX0: 2488, laneX1: 2560, cutX1: 2500,
  head: { d0: 1, d1: 3, v0: -10, v1: -8, s: 58 },
  leg1: { d0: 1, d1: 3, v0: -11, v1: -70, s0: 58 },       // northward (v decreasing), 60 blocks
  turn: { d0: 1, d1: 7, v0: -73, v1: -71, s: 43 },
  leg2: { d0: 5, d1: 7, v0: -73, v1: -26, s0: 43 },       // southward (v increasing), 48 blocks
  pass: { d0: 5, d1: 7, v0: -25, v1: -5, s: 31 },          // level, into the trench (tv -4..3, ledge at -5)
  parapetD: 4, outerD: 8,
};
export const VENT_ROUTE = { side: 1, shaftV0: 22, balconyV0: 20, balconyV1: 27, stairV0: 20, wellV0: 28, balconyY: 44 };
// Lit lane-marker masts on the rim promenade (blue light at y 75 for the upper ship lane) between the corridors.
export const MAST_EVERY = 168, MAST_OFF = 84;
