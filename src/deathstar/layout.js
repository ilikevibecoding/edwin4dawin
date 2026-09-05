// Death Star geometry shared by the shell filler (index.js) and the deck planner (plan.js).
//
// Frame: "local" coordinates are world coordinates minus the station centre (CX, CZ) in x/z; the sphere centre is
// (0, CY, 0) in that frame. The deck planner works on integer local block coordinates (x, z); the shell filler uses
// block centres (x + 0.5, y + 0.5 - CY, z + 0.5). Angles: phi = 0 points to +z (toward the frontier / the hangar),
// u(phi) = (sin phi, cos phi), perpendicular n(phi) = (cos phi, -sin phi).
//
// The dish proportions (latitude, crater radius, depth, rim raise, trench half-width/depth) mirror the orbital-beam
// station in src/disasters/beam/stationGeometry.js so the two designs read as the same battle station.

export const CX = 0, CY = 128, CZ = -4000;
export const R = 100;                 // hull radius (blocks); the sphere spans y 28..228
export const SHELL = 4;               // hull thickness
export const OUTER = R + 5;           // largest surface radius (rim raise 4 + margin)

// plan grid: N x N cells covering local x,z in [X0, X0 + N)
export const N = 208, X0 = -104, Z0 = -104;

// decks: floor at DECK_Y0 + d * DECK_H (1 floor + 5 clear + 1 ceiling). Decks 0..24 fill the sphere (y 40..214);
// decks 25..26 exist only inside the overlook tower footprint on top of the hull.
export const DECK_Y0 = 40, DECK_H = 7, N_DECKS = 27, TOP_SPHERE_DECK = 24;
export const deckFloorY = (d) => DECK_Y0 + d * DECK_H;
export const deckOfY = (y) => Math.floor((y - DECK_Y0) / DECK_H);

// --- trench / lip (measured in height above the equator, like the beam station's |y| bands)
export const TRENCH_HALF = 6, TRENCH_DEPTH = 6, LIP_HALF = 8.5, LIP_RAISE = 1;

// --- superlaser dish: concave spherical cap centred at latitude DISH_LAT on the +z side
export const DISH_LAT = 26 * Math.PI / 180;
export const DISH = (() => {
  const Dy = Math.sin(DISH_LAT), Dz = Math.cos(DISH_LAT);
  const a = R * 0.31, h = R * 0.15;
  const rc = (a * a + h * h) / (2 * h);         // radius of the (negative) bowl sphere
  const L = R - h + rc;                          // distance of its centre from the station centre
  const alpha = Math.asin(a / R);
  const rimIn = alpha - 2.5 / R, rimOut = alpha + 3.5 / R, rimRaise = 4;
  const nodeAng = (rimIn + rimOut) * 0.5, nodeR = R + rimRaise + 0.5;
  const emitterR = L - rc + 1.5;
  const nodes = [];
  for (let i = 0; i < 8; i++) {
    const th = (i / 8) * Math.PI * 2, sa = Math.sin(nodeAng), ca = Math.cos(nodeAng);
    // basis: D, U = (1,0,0), V = D x U = (0, Dz, -Dy)
    nodes.push({
      x: sa * Math.cos(th) * nodeR,
      y: (Dy * ca + Dz * sa * Math.sin(th)) * nodeR,
      z: (Dz * ca - Dy * sa * Math.sin(th)) * nodeR,
    });
  }
  return {
    Dy, Dz, a, h, rc, rc2: rc * rc, skin2: (rc + SHELL) * (rc + SHELL), L, L2: L * L, alpha,
    cosRimIn: Math.cos(rimIn), cosRimOut: Math.cos(rimOut), rimRaise, nodeR, nodes,
    emitter: { x: 0, y: Dy * emitterR, z: Dz * emitterR },
    C: { y: Dy * L, z: Dz * L },
    rings: [0.28, 0.52, 0.76].map((f) => Math.cos(alpha * f)), // focusing rings on the bowl (cos of the angle from the axis)
  };
})();

// Squared distance from a local point to the bowl sphere centre.
export function bowlDist2(px, dy, pz) {
  const ey = dy - DISH.C.y, ez = pz - DISH.C.z;
  return px * px + ey * ey + ez * ez;
}

// Inner hull radius (R - SHELL, or R - TRENCH_DEPTH - SHELL in the trench band) at height dy above the equator.
export function innerRadiusAt(dy) {
  const S = Math.abs(dy) < TRENCH_HALF ? R - TRENCH_DEPTH : R;
  const ri = S - SHELL;
  const v = ri * ri - dy * dy;
  return v > 0 ? Math.sqrt(v) : 0;
}

// Largest horizontal radius that is fully interior over every row of deck d (conservative for planning).
export function deckInteriorRadius(d) {
  const y0 = deckFloorY(d);
  let r = Infinity;
  for (let y = y0; y < y0 + DECK_H; y++) r = Math.min(r, innerRadiusAt(y + 0.5 - CY));
  return r;
}

// --- interior layout
export const REACTOR_R = 12, REACTOR_WALL_R = 14, CATWALK_EVERY = 3;
export const RADIALS = [0, 2 * Math.PI / 3, 4 * Math.PI / 3];
export const RINGS = [30, 60, 85];
export const CORR_HALF = 1.5, WALL_HALF = 2.5;

// --- hangar: opening in the equatorial trench facing +z, 40 wide x 20 tall x ~60 deep
export const HANGAR = {
  x0: -20, x1: 19, z0: 34, z1: 99, wallX0: -21, wallX1: 20, backZ: 33, deck0: 11, deck1: 13,
  y0: deckFloorY(11), y1: deckFloorY(14),      // floor block y 117, ceiling block y 137
  mouthZ: 90,                                    // from here on the box is the mouth cut through the hull
};

// --- overlook superstructure on the hull above the dish, centred on the dish axis (x = 0): a wide command bridge
// (deck 24, 35 x 25) half sunk into the hull with a glass front over the dish rim, and on its roof the narrower
// double-height throne room (decks 25-26, 23 wide) whose glass-floored balcony (z 63..66) overhangs the bridge's
// front wall. The filler grows a hull-plated plinth from the hull surface up to yBase under everything but the balcony.
// The stair module in the back-right corner runs from the lower decks up to the throne room (it stands as a pillar in
// the hangar bay on decks 11-13); on the sphere decks its door faces the 0-degree radial corridor, on the tower
// decks it opens straight into the bridge / throne room.
export const TOWER = {
  x0: -17, x1: 17, z0: 38, z1: 62,      // bridge footprint (walls inclusive)
  tx0: -11, tx1: 11,                    // throne room footprint (same z range) + balcony beyond z1
  balconyZ1: 66,
  bridgeDeck: 24, throneDeck: 25, throneTop: 26,
  module: { mx: 13, mz: 43, side: 2 },
  yBase: deckFloorY(24),
};
export const towerContains = (x, z) =>
  (x >= TOWER.x0 && x <= TOWER.x1 && z >= TOWER.z0 && z <= TOWER.z1) ||
  (x >= TOWER.tx0 && x <= TOWER.tx1 && z > TOWER.z1 && z <= TOWER.balconyZ1);

// Turbolift / stair modules: 9x9 footprint (3x3 shaft, PANEL_BLACK walls, spiral slab stairs, outer wall) with the
// door on `side` (0 +x, 1 +z, 2 -x, 3 -z, in local axes). Deck range d0..d1 inclusive.
function moduleFits(mx, mz, rMin, rMax) {
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
    const x = mx + dx, z = mz + dz, r = Math.sqrt(x * x + z * z);
    if (r < rMin || r > rMax) return false;
  }
  return true;
}
function sideToward(mx, mz) {
  // the side facing away from the centre (toward the ring corridor the module hangs off)
  return Math.abs(mx) > Math.abs(mz) ? (mx > 0 ? 0 : 2) : (mz > 0 ? 1 : 3);
}
function sideTowardAxis(mx, mz, phi) {
  // the side facing the radial corridor at angle phi the module sits beside (present on every deck, unlike the rings)
  const nx = Math.cos(phi), nz = -Math.sin(phi), s = -Math.sign(mx * nx + mz * nz);
  const vx = s * nx, vz = s * nz;
  return Math.abs(vx) > Math.abs(vz) ? (vx > 0 ? 0 : 2) : (vz > 0 ? 1 : 3);
}
// decks whose interior is wide enough to hold ring corridor rr (mirrors the filter in plan.js corridors())
function ringDeckRange(rr) {
  let d0 = -1, d1 = -1;
  for (let d = 0; d <= TOP_SPHERE_DECK; d++) if (rr + WALL_HALF + 1 < deckInteriorRadius(d) - 0.75) { if (d0 < 0) d0 = d; d1 = d; }
  return { d0, d1 };
}
function moduleDeckRange(mx, mz) {
  let rMax = 0;
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) rMax = Math.max(rMax, Math.hypot(mx + dx, mz + dz));
  let d0 = -1, d1 = -1;
  for (let d = 0; d <= TOP_SPHERE_DECK; d++) {
    if (deckInteriorRadius(d) > rMax + 1.2) { if (d0 < 0) d0 = d; d1 = d; }
  }
  return { d0, d1 };
}
// First (along, perp) offset from the radial phi whose 9x9 footprint lies in the annulus rMin..rMax, or null.
function searchModule(phi, alongs, perps, rMin, rMax) {
  const ux = Math.sin(phi), uz = Math.cos(phi), nx = Math.cos(phi), nz = -Math.sin(phi);
  for (const along of alongs) for (const perp of perps) {
    const mx = Math.round(along * ux + perp * nx), mz = Math.round(along * uz + perp * nz);
    if (moduleFits(mx, mz, rMin, rMax)) return { mx, mz };
  }
  return null;
}
export const MODULES = (() => {
  const list = [];
  const add = (mx, mz, opts = {}) => {
    const range = moduleDeckRange(mx, mz);
    const m = { mx, mz, side: opts.side ?? sideToward(mx, mz), d0: opts.d0 ?? range.d0, d1: opts.d1 ?? range.d1, name: opts.name || `lift${list.length}`, doors2: opts.doors2 || [] };
    list.push(m);
    return m;
  };
  // ring 30: two standard modules inside the ring (phi 120 / 240) plus the tower module near the phi 0 junction
  for (const phi of [RADIALS[1], RADIALS[2]]) {
    const p = searchModule(phi, [20, 19, 21, 18, 22], [6.5, -6.5, 7.5, -7.5, 5.5, -5.5], REACTOR_WALL_R + 1, RINGS[0] - WALL_HALF - 0.6);
    if (p) add(p.mx, p.mz, { name: `lift30_${Math.round(phi * 180 / Math.PI)}` });
  }
  add(TOWER.module.mx, TOWER.module.mz, { side: TOWER.module.side, d1: TOWER.throneDeck, name: 'tower' });
  // rings 60 / 85: modules inside the ring at phi 120 / 240, and beside the hangar for phi 0
  for (const ring of [RINGS[1], RINGS[2]]) {
    const inner = (ring === RINGS[1] ? RINGS[0] : RINGS[1]) + WALL_HALF + 0.6;
    for (const phi of [RADIALS[1], RADIALS[2]]) {
      const p = searchModule(phi, [ring - 8.5, ring - 9.5, ring - 10.5], [7.5, -7.5, 8.5, -8.5], inner, ring - WALL_HALF - 0.6);
      if (p) add(p.mx, p.mz, { side: sideTowardAxis(p.mx, p.mz, phi), name: `lift${ring}_${Math.round(phi * 180 / Math.PI)}` });
    }
  }
  // beside the hangar's +x wall, doors toward rings 60 / 85: only on the decks where that ring exists
  const r60 = ringDeckRange(RINGS[1]), r85 = ringDeckRange(RINGS[2]);
  add(26, 43, { side: 1, name: 'hangarLift60', d0: r60.d0, d1: r60.d1 });
  add(25, 72, { side: 1, name: 'hangarLift85', d0: r85.d0, d1: r85.d1 });
  return list;
})();

// Fixed special rooms (local interior block ranges, inclusive). `decks` lists the decks the room occupies.
export const FIXED = {
  detention: { x0: 58, x1: 70, z0: 28, z1: 38, deck: 8 },
  compactor: { x0: 64, x1: 72, z0: 28, z1: 38, deck: 7 },
  chute: { x0: 71, x1: 72, z0: 33, z1: 34 },                 // 2x2 shaft from the detention corridor end down to the compactor
  tractor: { x0: -8, x1: 8, z0: -79, z1: -65, deck0: 14, deck1: 16 },
  gallery: { x0: -30, x1: -22, z0: 36, z1: 46, deck: 13 },   // hangar control gallery (windows in the hangar's -x wall)
  superlaser: { x0: -8, x1: 8, z0: 64, z1: 71, deck: 19 },   // focusing chamber behind the dish skin (glass toward the emitter)
};

// Boxes (local x/z, world y) where the deck plan is authoritative even inside the hull shell / outside the sphere
// (the tower box is the towerContains footprint; the superlaser chamber box lives in index.js next to the dish code).
export const PRIORITY = {
  hangar: { x0: HANGAR.wallX0, x1: HANGAR.wallX1, z0: HANGAR.backZ, z1: HANGAR.z1, y0: HANGAR.y0, y1: HANGAR.y1 },
  tower: { x0: TOWER.x0, x1: TOWER.x1, z0: TOWER.z0, z1: TOWER.balconyZ1, y0: TOWER.yBase, y1: deckFloorY(N_DECKS) },
};
// glass patch in the dish skin in front of the superlaser chamber (world y)
export const DISH_WINDOW = { x0: -8, x1: 8, y0: deckFloorY(19) + 1, y1: deckFloorY(19) + 6, z0: 66, z1: 80 };
