// Galactic Senate (docs/rubrics/17_senate.md, SPEC §8): the civic centrepiece. A 136-wide drum (y 1..26) under a
// grey ribbed dome, the Grand Convocation Chamber inside it — a 60-wide pit, two stepped bowl rings, three stacked
// wall tiers of cantilevered delegation pods with a walkable gallery ring behind each, the public viewing gallery on
// top and the Chancellor's podium column at the axis — twelve playable delegation suites in the drum's outer band at
// the two lower wall tiers (six per tier: reception, senator's office, aides' room, records, lounge, each with its own
// lift from the grand lobby ring and a private pod door from its back corridor), committee rooms, petition office,
// press office, records, kitchens, guard rooms, the Chancellor's office, a Jedi liaison alcove, four entrances
// (south security screening, north loading dock, east press, west diplomatic), a processional avenue with colonnades,
// statue plinths and Senate Guard posts, the boulevard gate deck on twin stalks, corner shuttle pads.
//
// Pure function of the lot and ctx.rng (the layout seed). Local coordinates: x 0..166, z 0..174, y 0 = plateau
// (repaved), walk level y 1; front = south (+z). Angles are atan2(dz, dx) in [0, 2pi): east 0, south pi/2, west pi,
// north 3pi/2 — the seam sits inside the east cardinal slot, so no room ever straddles it.
//
// Room kinds W4's planner staffs (src/npc/coruscant/rooms.js) stay valid: convocation_chamber (the hall, >= 400 seat
// spots so a 100-senator session sits), chancellor_podium, chancellor_office, vestibule, senators_lounge, landing_pad,
// stair_tower, executive_office. New kinds are listed in docs/overhaul/senate.md.
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { DELEGATIONS, SIZE_ARC } from '../../senate/delegations.js';

const AIR = FORCE_AIR;
const TAU = Math.PI * 2;
export const G = {
  CX: 83, CZ: 79, R_DRUM: 68, DRUM_TOP: 26, R_HALL: 53, PIT_R: 30,   // pit floor: bins 0..30 = 61 blocks across
  BOWL: [[31, 36, 3], [37, 42, 6]],          // [inner bin, outer bin, walk y]
  INNER_WALL: 43, INNER_ROOM: [44, 52],       // inner band rooms (levels 1 and 6)
  POD_R: [40, 45], GALLERY_R: [46, 52],      // wall tiers: pods cantilevered in front of the gallery ring
  TIERS: [11, 16, 21], GALLERY_Y: 26, LEVELS: [1, 6, 11, 16, 21],
  SERVICE_R: [54, 55], SVC_WALL: 56, ROOM_R: [57, 61], OUT_WALL: 62, CORR_R: [63, 66], SKIN_R: [67, 68],
  PODS_PER_TIER: 30, PODIUM_R: 5, PODIUM_TOP: 12, DAIS_Y: 14, SLOT: 0.10,   // SLOT: cardinal slot half-angle (rad)
  DOME_YC: -21.56, DOME_R: 83.56,            // spherical cap: 27 at r 68 (drum top + 1), 62 at the axis
};
const { CX, CZ } = G;

const STONE = B.SMOOTH_STONE, STONE2 = B.PLASTER, BAND = B.STONE_BRICKS, TRIM = B.CHROME, PLATE = B.DECK_PLATE;
const DARK = B.DURASTEEL_DARK, GLOW = B.GLOW_PANEL, BLUE = B.GLOW_PANEL_BLUE, GLASS = B.STEEL_GLASS, GOLD = B.GOLD_BLOCK, RED = B.PANEL_RED;
const SEAT = B.STONE_BRICK_SLAB;

export const domeH = (r) => G.DOME_YC + Math.sqrt(Math.max(0, G.DOME_R * G.DOME_R - r * r));
const norm = (a) => { a %= TAU; return a < 0 ? a + TAU : a; };
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const cellOf = (r, a) => [Math.round(CX + r * Math.cos(a)), Math.round(CZ + r * Math.sin(a))];
const CARDINALS = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];   // E S W N

// ------------------------------------------------------------------------------------------------ polar tables
// dist / angle / integer radius bin of every lot cell, computed once per build (every ring and sector loop reads them)
function polar(bp) {
  const n = bp.w * bp.d, dist = new Float32Array(n), ang = new Float32Array(n), bin = new Int16Array(n);
  for (let x = 0; x < bp.w; x++) for (let z = 0; z < bp.d; z++) {
    const i = x * bp.d + z, dx = x - CX, dz = z - CZ, r = Math.hypot(dx, dz);
    dist[i] = r; bin[i] = Math.floor(r); ang[i] = norm(Math.atan2(dz, dx));
  }
  return { dist, ang, bin, at: (x, z) => x * bp.d + z };
}
// iterate the cells of an annular sector (bins ra..rb inclusive, angle a0..a1 non-wrapping) with a tight bbox
function eachSector(bp, P, ra, rb, a0, a1, fn) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  const pts = [[ra, a0], [ra, a1], [rb + 1, a0], [rb + 1, a1]];
  for (let k = 0; k < 4; k++) { const c = k * Math.PI / 2; if (c > a0 && c < a1) pts.push([rb + 1, c]); }
  for (const [r, a] of pts) { const x = CX + r * Math.cos(a), z = CZ + r * Math.sin(a); if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  x0 = Math.max(0, Math.floor(x0) - 1); x1 = Math.min(bp.w - 1, Math.ceil(x1) + 1); z0 = Math.max(0, Math.floor(z0) - 1); z1 = Math.min(bp.d - 1, Math.ceil(z1) + 1);
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const i = x * bp.d + z, b = P.bin[i];
    if (b < ra || b > rb) continue;
    const a = P.ang[i];
    if (a <= a0 || a >= a1) continue;
    fn(x, z, b, a, i);
  }
}
// cells of a straight radial slot: bins ra..rb, perpendicular distance from the cardinal axis <= half
function eachSlot(bp, P, ra, rb, card, half, fn) {
  const ux = Math.cos(card), uz = Math.sin(card);
  const cx0 = CX + ux * ra, cx1 = CX + ux * (rb + 1), cz0 = CZ + uz * ra, cz1 = CZ + uz * (rb + 1);
  const x0 = Math.max(0, Math.floor(Math.min(cx0, cx1) - half - 2)), x1 = Math.min(bp.w - 1, Math.ceil(Math.max(cx0, cx1) + half + 2));
  const z0 = Math.max(0, Math.floor(Math.min(cz0, cz1) - half - 2)), z1 = Math.min(bp.d - 1, Math.ceil(Math.max(cz0, cz1) + half + 2));
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const dx = x - CX, dz = z - CZ, along = dx * ux + dz * uz, perp = -dx * uz + dz * ux;
    if (along < ra || along > rb + 0.99 || Math.abs(perp) > half) continue;
    fn(x, z, along, perp);
  }
}

// ------------------------------------------------------------------------------------------------ small helpers
const isFree = (bp, x, y, z) => { const v = bp.get(x, y, z); return v === 0 || v === AIR; };
// lift-shaft wall cells placed before the rooms; room carves, doors and links leave them alone (a Set per build,
// keyed like bp.blocks, so palettes may use PANEL_BLACK freely)
let PYLON = new Set();
const pylonKey = (bp, x, y, z) => (x * bp.d + z) * bp.h + y;
const isPylon = (bp, x, y, z) => PYLON.has(pylonKey(bp, x, y, z));
// a half-step stair: 2n cells from (x0,z0) stepping (dx,dz), rising n blocks from walk level y0 (surface y0 + k/2);
// solid below every step, three cells of head room above, so the harness walker and the player both take it
function stairRun(bp, x0, z0, dx, dz, y0, n, wide = 2, base = DARK, tread = STONE, slab = SEAT) {
  const px = dz !== 0 ? 1 : 0, pz = dx !== 0 ? 1 : 0;   // perpendicular (width) direction
  for (let k = 1; k <= 2 * n; k++) {
    const s = y0 + k / 2, half = (k & 1) === 1, cell = half ? Math.floor(s) : s - 1;
    for (let w = 0; w < wide; w++) {
      const x = x0 + dx * (k - 1) + px * w, z = z0 + dz * (k - 1) + pz * w;
      bp.fill(x, y0 - 1, z, x, cell - 1, z, base);
      bp.set(x, cell, z, half ? slab : tread);
      bp.fill(x, cell + 1, z, x, cell + 3, z, AIR);
    }
  }
}
function liftShaft(bp, x, z, ya, yb) {
  bp.fill(x - 1, ya - 1, z - 1, x + 2, yb + 3, z + 2, B.PANEL_BLACK);
  bp.fill(x, ya, z, x + 1, yb + 2, z + 1, AIR);
  for (let xx = x - 1; xx <= x + 2; xx++) for (let zz = z - 1; zz <= z + 2; zz++) for (let y = ya - 1; y <= yb + 3; y++) PYLON.add(pylonKey(bp, xx, y, zz));
  bp.lift(x, z, ya, yb);
}
// opens a lift's side at a walk level toward +z ('S'), -z ('N'), +x ('E') or -x ('W'), chrome jambs, blue marker
function liftDoor(bp, x, z, y, side) {
  if (side === 'S') { bp.fill(x, y, z + 2, x + 1, y + 2, z + 2, AIR); bp.set(x - 1, y + 2, z + 2, BLUE); bp.set(x - 1, y, z + 2, TRIM); bp.set(x + 2, y, z + 2, TRIM); bp.set(x, y - 1, z + 2, PLATE); bp.set(x + 1, y - 1, z + 2, PLATE); }
  else if (side === 'N') { bp.fill(x, y, z - 1, x + 1, y + 2, z - 1, AIR); bp.set(x - 1, y + 2, z - 1, BLUE); bp.set(x - 1, y, z - 1, TRIM); bp.set(x + 2, y, z - 1, TRIM); bp.set(x, y - 1, z - 1, PLATE); bp.set(x + 1, y - 1, z - 1, PLATE); }
  else if (side === 'E') { bp.fill(x + 2, y, z, x + 2, y + 2, z + 1, AIR); bp.set(x + 2, y + 2, z - 1, BLUE); bp.set(x + 2, y, z - 1, TRIM); bp.set(x + 2, y, z + 2, TRIM); bp.set(x + 2, y - 1, z, PLATE); bp.set(x + 2, y - 1, z + 1, PLATE); }
  else { bp.fill(x - 1, y, z, x - 1, y + 2, z + 1, AIR); bp.set(x - 1, y + 2, z - 1, BLUE); bp.set(x - 1, y, z - 1, TRIM); bp.set(x - 1, y, z + 2, TRIM); bp.set(x - 1, y - 1, z, PLATE); bp.set(x - 1, y - 1, z + 1, PLATE); }
}
// the axis side (N/S/E/W) nearest to a direction
const sideOf = (ux, uz) => Math.abs(ux) >= Math.abs(uz) ? (ux > 0 ? 'E' : 'W') : (uz > 0 ? 'S' : 'N');
// a lift shaft centred on polar (r, a) whose door faces `dir` (+1 outward, -1 inward) at level y; the two cells past
// the door are carved with a floor so the car always opens onto a walkable cell; returns { x, z } of the car
function polarLift(bp, r, a, ya, yb, doors) {
  const [x, z] = cellOf(r, a);
  const lx = x - 1, lz = z - 1, sides = {};
  liftShaft(bp, lx, lz, ya, yb);
  for (const [y, dir] of doors) {
    const side = sideOf(dir * Math.cos(a), dir * Math.sin(a));
    sides[y] = side;
    liftDoor(bp, lx, lz, y, side);
    const [sx, sz] = side === 'E' ? [1, 0] : side === 'W' ? [-1, 0] : side === 'S' ? [0, 1] : [0, -1];
    // porch: two cells beyond the door, both car columns
    for (let k = 1; k <= 2; k++) for (let w = 0; w < 2; w++) {
      const px = lx + (side === 'E' ? 2 : side === 'W' ? -1 : w) + sx * k, pz = lz + (side === 'S' ? 2 : side === 'N' ? -1 : w) + sz * k;
      bp.fill(px, y, pz, px, y + 2, pz, AIR); if (isFree(bp, px, y - 1, pz)) bp.set(px, y - 1, pz, PLATE);
    }
  }
  return { x: lx, z: lz, sides };
}
// the two lintel cells over a lift door (the shaft wall above the opening): a plaque light goes there
function liftLintel(lift, y, side) {
  const [lx, lz] = [lift.x, lift.z];
  if (side === 'S') return [[lx, y + 3, lz + 2], [lx + 1, y + 3, lz + 2]];
  if (side === 'N') return [[lx, y + 3, lz - 1], [lx + 1, y + 3, lz - 1]];
  if (side === 'E') return [[lx + 2, y + 3, lz], [lx + 2, y + 3, lz + 1]];
  return [[lx - 1, y + 3, lz], [lx - 1, y + 3, lz + 1]];
}
function statue(bp, x, y, z) { bp.fill(x, y, z, x, y + 1, z, STONE); bp.fill(x, y + 2, z, x, y + 5, z, GOLD); bp.set(x, y + 6, z, STONE); bp.set(x, y + 7, z, GLOW); }
function lamp(bp, x, y, z, h = 2, id = B.LANTERN) { bp.fill(x, y, z, x, y + h - 1, z, B.IRON_BARS); bp.set(x, y + h, z, id); }
function guardPost(bp, x, y, z, fx, fz) { bp.set(x, y, z, B.PANEL_BLACK); bp.set(x, y + 1, z, B.CONSOLE); bp.work(x + fx, y, z + fz, 'guard'); }

// ------------------------------------------------------------------------------------------------ massing
function ground(bp) { bp.fill(0, 0, 0, bp.w - 1, 0, bp.d - 1, STONE2); }

// drum (bins <= 68, y 1..26, solid — rooms are carved later) with a dressed skin, and the dome shell above it
function drumAndDome(bp, P) {
  const yMax = Math.ceil(domeH(0)) + 2;
  for (let x = 0; x < bp.w; x++) for (let z = 0; z < bp.d; z++) {
    const i = P.at(x, z), b = P.bin[i], r = P.dist[i];
    if (b > G.R_DRUM) continue;
    bp.fill(x, 1, z, x, G.DRUM_TOP, z, STONE);
    if (b >= G.SKIN_R[0]) {
      // skin: pilasters every 96 segments, stone bands at the base, the mid band and the cornice, window slits
      const seg = Math.round((P.ang[i] / TAU) * 96) % 96;
      for (let y = 1; y <= G.DRUM_TOP; y++) {
        let id = STONE2;
        if (y <= 2 || y === 13 || y === 14 || y === G.DRUM_TOP) id = BAND;
        else if (seg % 4 === 0) id = STONE;
        else if (y % 5 === 3 || y % 5 === 4) id = (seg & 1) ? B.WINDOW_LIT : B.WINDOW_DARK;
        bp.set(x, y, z, id);
      }
      if (b === G.SKIN_R[0]) bp.set(x, G.DRUM_TOP + 1, z, (seg % 3 === 0) ? GLOW : TRIM);   // lit cornice ring
    }
    // dome shell: two blocks thick along the cap; outer grey with dark ribs lit every third block, inner black with
    // the ribs carried through as chrome / glow lines (the chamber ceiling)
    const h = domeH(r), yo = Math.round(h), yi = Math.round(domeH(r + 2.2));
    const a = P.ang[i];
    const rib = Math.abs((((a / TAU) * 16 + 16.5) % 1) - 0.5) < (r > 40 ? 0.04 : 0.07) && r > 10;
    const ring = Math.abs(h - Math.round(h)) < 0.02 && Math.round(h) % 8 === 0;
    for (let y = Math.max(G.DRUM_TOP + 1, Math.min(yi, yo)); y <= Math.min(yo, yMax); y++) {
      const outer = y === yo;
      let id = outer ? B.DURASTEEL : B.PANEL_BLACK;
      if (rib) id = (y % 3 === 0) ? GLOW : (outer ? DARK : TRIM); else if (ring && outer) id = BAND;
      if (outer && r > G.R_DRUM - 8 && (y - G.DRUM_TOP) % 3 === 1) id = (Math.round(a * 30) & 1) ? B.WINDOW_LIT : STONE2;
      bp.set(x, y, z, id);
    }
    if (r <= 12) { const yt = Math.round(domeH(0)); bp.set(x, yt, z, r <= 8 ? GLOW : TRIM); bp.set(x, yt + 1, z, r <= 10 ? (r <= 8 ? GLOW : TRIM) : AIR); }
  }
  const yt = Math.round(domeH(0));
  bp.fill(CX - 1, yt + 2, CZ - 1, CX, yt + 12, CZ, TRIM);
  bp.fill(CX - 3, yt + 2, CZ - 3, CX + 2, yt + 3, CZ + 2, DARK);
  bp.set(CX - 1, yt + 13, CZ - 1, BLUE); bp.set(CX, yt + 13, CZ, BLUE);
}

// walk height of the bowl surface at radius r (for the radial stairs): pit 1, ring 1 at 3, ring 2 at 6
function bowlY(r) {
  if (r <= 27) return 1;
  if (r <= 31) return 1 + Math.round((r - 27) * 0.5 * 2) / 2;
  if (r <= 34) return 3;
  if (r <= 40) return 3 + Math.round((r - 34) * 0.5 * 2) / 2;
  return 6;
}

// a delegation pod: console at the front, four seats, rails on the open sides, glow under the front lip.
// front = inner bin, back = outer bin (the platform spans front..back); `floorY` = platform block; walk = floorY + 1
function pod(bp, a, front, back, floorY, halfW, seats, hanging) {
  const y = floorY + 1;
  for (let r = front; r <= back; r++) {
    const step = 1 / r;
    for (let k = -Math.ceil(halfW / step); k <= Math.ceil(halfW / step); k++) {
      const da = k * step;
      if (Math.abs(da) > halfW) continue;
      const [x, z] = cellOf(r + 0.5, a + da);
      const edge = Math.abs(da) > halfW - step * 0.9;
      bp.set(x, floorY, z, edge ? TRIM : B.PANEL_BLACK);
      if (hanging) bp.set(x, floorY - 1, z, (r <= front + 1) ? GLOW : DARK);
      bp.fill(x, y, z, x, y + 3, z, AIR);
      if (r === front) { bp.set(x, y, z, Math.abs(da) < step * 1.1 ? B.CONSOLE : B.IRON_BARS); if (Math.abs(da) < step * 1.1) bp.set(x, y + 1, z, Math.abs(da) < step * 0.4 ? B.HOLO_SIGN : AIR); }
      else if (edge && r < back) bp.set(x, y, z, B.IRON_BARS);
    }
  }
  const s1 = 1 / (front + 2), s2 = 1 / (front + 3);
  const spots = [[front + 2.5, -s1 * 1.2], [front + 2.5, s1 * 1.2]];
  if (seats >= 4) spots.push([front + 3.5, -s2 * 1.2], [front + 3.5, s2 * 1.2]);
  const out = [];
  for (const [r, da] of spots) { const [x, z] = cellOf(r, a + da); if (isFree(bp, x, y, z)) { bp.set(x, y, z, SEAT); bp.spot(x, y, z, 'seat'); out.push({ x, y, z }); } }
  const [sx, sz] = cellOf(back - 0.5, a);
  return { x: sx, y, z: sz, seats: out };
}

// the Grand Convocation Chamber: pit, podium column and dais, bowl rings with pods, radial stairs, three wall tiers
// of hanging pods with gallery rings, the public gallery, the enclosing wall, the dome ceiling lights, four tunnels
function chamber(bp, P, meta) {
  const [pr0, pr1] = G.POD_R, [gr0, gr1] = G.GALLERY_R;
  // carve the hall to the dome's inner surface; the pit floor with concentric light rings
  for (let x = CX - G.R_HALL - 1; x <= CX + G.R_HALL + 1; x++) for (let z = CZ - G.R_HALL - 1; z <= CZ + G.R_HALL + 1; z++) {
    const i = P.at(x, z), b = P.bin[i], r = P.dist[i];
    if (b >= G.R_HALL) continue;
    const top = Math.round(domeH(r + 2.2)) - 1;
    bp.fill(x, 1, z, x, top, z, AIR);
    bp.set(x, 0, z, (b % 6 === 0) ? ((x + z) % 3 === 0 ? GLOW : B.PANEL_BLACK) : (b < G.PODIUM_R + 2 ? BLUE : STONE));
    if (x % 6 === 0 && z % 6 === 0 && r > 6) bp.set(x, top + 1, z, GLOW);                 // dome ceiling lights
    // bowl rings: solid steps under the walk levels; inner wall behind ring 2 up to the first tier
    for (const [r0, r1, y] of G.BOWL) if (b >= r0 && b <= r1) bp.fill(x, 1, z, x, y - 1, z, b === r0 ? B.PANEL_BLACK : STONE);
    if (b === G.INNER_WALL) { bp.fill(x, 1, z, x, G.TIERS[0] - 2, z, STONE2); bp.set(x, 7, z, (x + z) % 3 ? STONE2 : GLOW); bp.set(x, 9, z, GLOW); }
    if (b > G.INNER_WALL) bp.fill(x, 1, z, x, G.TIERS[0] - 2, z, STONE);                // inner band mass (rooms carved later)
  }
  // bowl pods: ring 1 (24 pods), ring 2 (28 pods), divider trims between them
  meta.pods = [];
  G.BOWL.forEach(([r0, r1, y], ri) => {
    const n = ri === 0 ? 24 : 28;
    for (let k = 0; k < n; k++) {
      const a = norm(k * TAU / n + TAU / (2 * n));
      const p = pod(bp, a, r0, r1, y - 1, 2.6 / (r0 + 0.5), 2, false);
      meta.pods.push({ ring: ri, k, a, ...p });
      const [dx, dz] = cellOf(r0 + 3, a + Math.PI / n); bp.set(dx, y, dz, TRIM); bp.set(dx, y + 1, dz, B.LANTERN);
    }
  });
  // radial stairs at the eight half-diagonals from the pit to ring 2
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + Math.PI / 8, ux = Math.cos(a), uz = Math.sin(a);
    for (let r = 26; r <= 42.5; r += 0.5) {
      const s = bowlY(r), cell = Number.isInteger(s) ? s - 1 : Math.floor(s);
      for (const off of [-0.7, 0.7]) {
        const x = Math.round(CX + ux * r - uz * off), z = Math.round(CZ + uz * r + ux * off);
        bp.fill(x, 1, z, x, cell - 1, z, DARK);
        bp.set(x, cell, z, Number.isInteger(s) ? STONE : SEAT);
        bp.fill(x, cell + 1, z, x, cell + 3, z, AIR);
      }
    }
  }
  // wall tiers: gallery ring floor (bins 46..52) at y-1, rail at bin 46 between pods, 30 hanging pods per tier
  meta.tierPods = [];
  G.TIERS.forEach((y, t) => {
    // the middle tier is staggered by half a slot so its pods hang over the gaps of the tier below (and the top
    // tier over the middle tier's gaps): every pod front has air beneath it, and the cardinal passages of the
    // middle tier look straight into the chamber between two pods
    const n = G.PODS_PER_TIER, podHalf = 2.7 / (pr0 + 0.5), off = t === 1 ? TAU / (2 * n) : 0;
    eachSector(bp, P, gr0, gr1, 0, TAU, (x, z, b, a) => {
      bp.set(x, y - 1, z, (b === gr0 || b === gr1) ? B.PANEL_BLACK : ((x + z) % 7 === 0 ? GLOW : PLATE));
      bp.fill(x, y, z, x, y + 3, z, AIR);
      const k = Math.round((a - off) / (TAU / n)) % n, da = angDiff(a, k * TAU / n + off);
      if (b === gr0 && Math.abs(da) > podHalf + 0.6 / gr0) bp.set(x, y, z, B.IRON_BARS);
    });
    // east seam: eachSector skips angle 0 exactly; fill the seam cells of the gallery floor
    for (let b = gr0; b <= gr1; b++) { bp.set(CX + b, y - 1, CZ, PLATE); bp.fill(CX + b, y, CZ, CX + b, y + 3, CZ, AIR); }
    if (off) bp.set(CX + gr0, y, CZ, B.IRON_BARS);   // no pod at the seam on the staggered tier: close the rail
    const tierPods = [];
    for (let k = 0; k < n; k++) {
      const a = norm(k * TAU / n + off);
      const p = pod(bp, a, pr0, pr1, y - 1, podHalf, 4, true);
      tierPods.push({ tier: t, k, a, ...p });
    }
    meta.tierPods.push(tierPods);
    // gallery lights in the wall behind, every fourth cell
    eachSector(bp, P, G.R_HALL, G.R_HALL, 0, TAU, (x, z) => { if ((x * 3 + z) % 4 === 0) bp.set(x, y + 3, z, GLOW); });
  });
  // public viewing gallery on top (bins 44..52): stepped seats toward the rail
  const gy = G.GALLERY_Y;
  eachSector(bp, P, 44, gr1, 0, TAU, (x, z, b) => {
    bp.set(x, gy - 1, z, (b === 44) ? TRIM : ((x + z) % 5 === 0 ? GLOW : STONE));
    bp.fill(x, gy, z, x, gy + 8, z, AIR);
    if (b === 44) bp.set(x, gy, z, B.IRON_BARS);
    else if (b === 46 || b === 48) { if ((x + z) % 2 === 0) { bp.set(x, gy, z, SEAT); bp.spot(x, gy, z, 'seat'); } }
  });
  for (let b = 44; b <= gr1; b++) { bp.set(CX + b, gy - 1, CZ, STONE); bp.fill(CX + b, gy, CZ, CX + b, gy + 8, CZ, AIR); }
  // the enclosing wall (bin 53) from the floor to the dome: plaster with chrome pilasters and lit slits above the
  // public gallery; solid behind the galleries
  eachSector(bp, P, G.R_HALL, G.R_HALL, 0, TAU, (x, z, b, a) => {
    const top = Math.round(domeH(P.dist[P.at(x, z)] + 2.2));
    const seg = Math.round((a / TAU) * 60) % 60;
    for (let y = 1; y <= top; y++) {
      let id = STONE2;
      if (seg % 5 === 0) id = TRIM;
      else if (y > gy + 2 && y % 4 === 1) id = B.WINDOW_LIT;
      else if (y === gy + 1 || y === gy + 2) id = GOLD;
      bp.set(x, y, z, id);
    }
  });
  { const top = Math.round(domeH(G.R_HALL + 2.2)); bp.fill(CX + G.R_HALL, 1, CZ, CX + G.R_HALL, top, CZ, STONE2); }
  // podium column with blue rings, the Chancellor's dais on top (rail, console, holo, seats), the lift inside
  const dy = G.DAIS_Y;
  for (let x = CX - G.PODIUM_R - 1; x <= CX + G.PODIUM_R + 1; x++) for (let z = CZ - G.PODIUM_R - 1; z <= CZ + G.PODIUM_R + 1; z++) {
    const r = P.dist[P.at(x, z)];
    if (r > G.PODIUM_R + 0.5) continue;
    bp.fill(x, 1, z, x, dy - 1, z, r > G.PODIUM_R - 0.5 ? (Math.round(r * 3) % 2 ? B.PANEL_BLACK : TRIM) : DARK);
    bp.set(x, dy - 1, z, r < 1.5 ? GLOW : B.PANEL_BLACK);
    if (r > G.PODIUM_R - 0.5) bp.set(x, dy, z, B.IRON_BARS);
  }
  for (let y = 3; y <= dy - 2; y += 3) for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; bp.set(Math.round(CX + Math.cos(a) * (G.PODIUM_R + 0.2)), y, Math.round(CZ + Math.sin(a) * (G.PODIUM_R + 0.2)), BLUE); }
  // the lift shaft fills x CX-2..CX+1, z CZ-2..CZ+1 up to the dais; the Chancellor stands east of it facing the
  // chamber over the console, aides' seats at the dais corners, the lift door opens south onto free cells
  bp.set(CX + 3, dy, CZ, B.CONSOLE); bp.set(CX + 3, dy, CZ + 1, B.HOLO_SIGN); bp.set(CX + 3, dy, CZ - 1, B.HOLO_SIGN); bp.set(CX + 3, dy + 1, CZ, B.HOLO_SIGN);
  for (const [ox, oz] of [[2, -3], [2, 3], [-3, -3], [-3, 3]]) { bp.set(CX + ox, dy, CZ + oz, SEAT); bp.spot(CX + ox, dy, CZ + oz, 'seat'); }
  bp.work(CX + 2, dy, CZ, 'chancellor');
  liftShaft(bp, CX - 1, CZ - 1, 1, dy);
  liftDoor(bp, CX - 1, CZ - 1, 1, 'S'); liftDoor(bp, CX - 1, CZ - 1, dy, 'S');
  bp.fill(CX - 1, 1, CZ + 1, CX, 3, CZ + G.PODIUM_R + 1, AIR); bp.fill(CX - 1, 0, CZ + 1, CX, 0, CZ + G.PODIUM_R + 1, PLATE);
  bp.set(CX - 2, 3, CZ + G.PODIUM_R, GLOW); bp.set(CX + 1, 3, CZ + G.PODIUM_R, GLOW);
  bp.fill(CX - 1, dy - 1, CZ - 1, CX, dy - 1, CZ, PLATE);
  bp.room('convocation_chamber', CX - G.R_HALL, 1, CZ - G.R_HALL, CX + G.R_HALL, CZ + G.R_HALL);
  bp.room('chancellor_podium', CX - G.PODIUM_R, dy, CZ - G.PODIUM_R, CX + G.PODIUM_R, CZ + G.PODIUM_R);
  meta.dais = { x: CX + 1, y: dy, z: CZ };
  // four tunnels at ground level from the drum's outer wall to the pit (3 wide, 4 high, lit lintels every third cell)
  for (const c of CARDINALS) eachSlot(bp, P, G.PIT_R - 1, G.SKIN_R[1], c, 1.5, (x, z, along) => {
    bp.fill(x, 1, z, x, 4, z, AIR); bp.set(x, 0, z, STONE);
    if (!isFree(bp, x, 5, z)) bp.set(x, 5, z, Math.floor(along) % 3 ? BAND : GLOW);   // lintels only under massing, not over the open bowl
  });
  // ring 1 is two blocks high, so each tunnel cuts a trench through it: a slab bridge carries the ring walk across
  for (const c of CARDINALS) eachSlot(bp, P, G.BOWL[0][0], G.BOWL[0][1], c, 1.5, (x, z) => bp.set(x, 4, z, SEAT));
}

// ------------------------------------------------------------------------------------------------ sectors (rooms)
// An annular-sector room: bins ra..rb (interior), angles a0..a1, walk level y. Carves floor / air / ceiling, records
// its bounding box as the room and offers polar furnishing (writes only into empty cells so lift pylons and walls
// survive). mid = centre angle; step(r) = one block of arc at radius r.
class Sector {
  constructor(bp, P, y, ra, rb, a0, a1, kind, floor = PLATE, wallId = null) {
    this.bp = bp; this.P = P; this.y = y; this.ra = ra; this.rb = rb; this.a0 = a0; this.a1 = a1; this.kind = kind;
    this.mid = (a0 + a1) / 2; this.half = (a1 - a0) / 2; this.rm = (ra + rb + 1) / 2;
    this.x0 = Infinity; this.x1 = -Infinity; this.z0 = Infinity; this.z1 = -Infinity; this.cells = 0; this.list = [];
    eachSector(bp, P, ra, rb, a0, a1, (x, z) => {
      // lift pylons (PANEL_BLACK) placed before the rooms survive the carve; decorated ceilings (a gallery floor, a
      // pod platform) are left alone — only plain drum stone becomes the room's ceiling
      if (isPylon(bp, x, y, z)) return;
      if (!isPylon(bp, x, y - 1, z)) bp.set(x, y - 1, z, floor);
      for (let yy = y; yy <= y + 3; yy++) if (!isPylon(bp, x, yy, z)) bp.set(x, yy, z, AIR);
      const c = bp.get(x, y + 4, z); if (c === STONE || c === STONE2 || c === 0) bp.set(x, y + 4, z, STONE);
      if (x < this.x0) this.x0 = x; if (x > this.x1) this.x1 = x; if (z < this.z0) this.z0 = z; if (z > this.z1) this.z1 = z; this.cells++; this.list.push([x, z]);
    });
    // wall dressing: the ring cells just outside the interior (bins ra-1 and rb+1) inside the angular range
    if (wallId != null) for (const b of [ra - 1, rb + 1]) eachSector(bp, P, b, b, a0, a1, (x, z) => { for (let yy = y; yy <= y + 3; yy++) if (!isFree(bp, x, yy, z)) bp.set(x, yy, z, wallId); });
  }
  cell(r, a) { return cellOf(r, a); }
  free(r, a, dy = 0) { const [x, z] = cellOf(r, a); return isFree(this.bp, x, this.y + dy, z) && this.inside(r, a); }
  inside(r, a) { return r >= this.ra && r < this.rb + 1 && a > this.a0 && a < this.a1; }
  put(r, a, dy, id) { const [x, z] = cellOf(r, a); if (!this.inside(r, a) || !isFree(this.bp, x, this.y + dy, z)) return false; this.bp.set(x, this.y + dy, z, id); return true; }
  putRaw(r, a, dy, id) { const [x, z] = cellOf(r, a); this.bp.set(x, this.y + dy, z, id); }
  seat(r, a) { const [x, z] = cellOf(r, a); if (this.put(r, a, 0, SEAT)) { this.bp.spot(x, this.y, z, 'seat'); return { x, y: this.y, z }; } return null; }
  work(r, a, kind) { const [x, z] = cellOf(r, a); if (this.inside(r, a) && isFree(this.bp, x, this.y, z)) { this.bp.work(x, this.y, z, kind); return { x, y: this.y, z }; } return null; }
  stand(r, a, kind = 'stand') { const [x, z] = cellOf(r, a); if (this.inside(r, a) && isFree(this.bp, x, this.y, z)) { this.bp.spot(x, this.y, z, kind); return { x, y: this.y, z }; } return null; }
  // desk: console block with a work record on the cell toward `dir` (+1 outward / -1 inward)
  desk(r, a, kind = 'desk', dir = -1) { if (this.put(r, a, 0, B.CONSOLE)) return this.work(r + dir, a, kind); return null; }
  // ceiling lights along the mid radius and the back row; n = count along the arc
  lights(n = 2, id = GLOW) {
    let placed = 0;
    const put = (r, a) => { const [x, z] = cellOf(r, a); if (!isPylon(this.bp, x, this.y + 4, z) && this.inside(r, a)) { this.bp.set(x, this.y + 4, z, id); placed++; } };
    for (let k = 0; k < n; k++) { const a = this.a0 + (this.a1 - this.a0) * (k + 0.5) / n; put(this.rm, a); if (this.rb - this.ra >= 6) { put(this.ra + 1, a); put(this.rb, a); } }
    // a lift pylon may cover the mid row of a small room: fall back to the first carved cell whose ceiling is free
    if (!placed) for (const [x, z] of this.list) if (!isPylon(this.bp, x, this.y + 4, z)) { this.bp.set(x, this.y + 4, z, id); break; }
  }
  // iterate arc positions along radius r: fn(a, k) for k arc blocks inset from both ends by `inset` blocks
  arc(r, inset, fn) { const s = 1 / r, n = Math.floor(((this.a1 - this.a0) * r - 2 * inset) / 1); for (let k = 0; k <= n; k++) fn(this.a0 + (inset + k) * s, k, n); }
  // shelves / planters / lamps along the outer (back) wall row rb
  backRow(fn) { this.arc(this.rb, 1.2, (a, k) => fn(this.rb, a, k)); }
  // registers the room (bounding box plus the one-cell wall ring, the convention the rectangular rooms follow);
  // returns its record (world coords, the same fields pruneMeta keeps)
  register() { if (!this.cells) return null; this.bp.room(this.kind, this.x0 - 1, this.y, this.z0 - 1, this.x1 + 1, this.z1 + 1); return this.bp.meta.rooms[this.bp.meta.rooms.length - 1]; }
  get center() { return cellOf(this.rm, this.mid); }
  get range() { return [this.a0, this.a1]; }
}
// opening through the ring wall at bin `wall` around angle a, 2 wide (arc) x 3 high; slides along the arc up to +-3
// blocks when a lift pylon stands in the way, staying inside `range` (the room's angles); returns the door's centre
function ringDoor(bp, wall, a, y, width = 2, lintel = TRIM, range = null) {
  const s = 1 / (wall + 0.5);
  const tryAt = (aa, commit) => {
    if (range && (aa - 1.2 * s < range[0] || aa + 1.2 * s > range[1])) return false;
    const cells = [];
    for (let k = -Math.floor((width - 1) / 2) - 1; k <= Math.ceil((width - 1) / 2) + 1; k++) {
      const [x, z] = cellOf(wall + 0.5, aa + k * s);
      const inner = k >= -Math.floor((width - 1) / 2) && k <= Math.ceil((width - 1) / 2);
      if (inner && isPylon(bp, x, y, z)) return false;   // a lift pylon stands here
      cells.push([x, z, inner]);
    }
    if (!commit) return true;
    for (const [x, z, inner] of cells) {
      if (inner) { bp.fill(x, y, z, x, y + 2, z, AIR); bp.set(x, y + 3, z, lintel); if (isFree(bp, x, y - 1, z)) bp.set(x, y - 1, z, PLATE); }
      else if (!isFree(bp, x, y, z)) bp.fill(x, y, z, x, y + 2, z, TRIM);
    }
    // the cells on both sides of the threshold have floor and head room (rounded rings leave odd corners)
    for (const [x, z, inner] of cells) if (inner) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const bb = Math.floor(Math.hypot(x + dx - CX, z + dz - CZ));
      if (bb === wall) continue;
      if (isFree(bp, x + dx, y - 1, z + dz)) bp.set(x + dx, y - 1, z + dz, PLATE);
      const v = bp.get(x + dx, y, z + dz); if (v === STONE || v === STONE2) bp.fill(x + dx, y, z + dz, x + dx, y + 2, z + dz, AIR);
    }
    return true;
  };
  for (const off of [0, 1, -1, 2, -2, 3, -3]) { const aa = a + off * s; if (tryAt(aa, false)) { tryAt(aa, true); return { a: aa, cell: cellOf(wall + 0.5, aa) }; } }
  tryAt(a, true); return { a, cell: cellOf(wall + 0.5, a) };
}

// ------------------------------------------------------------------------------------------------ furnishing
const nameOf = (id) => (typeof id === 'string' ? B[id] : id);
const EMISSIVE = new Set([B.GLOW_PANEL, B.GLOW_PANEL_BLUE, B.HOLO_SIGN, B.LANTERN, B.CITY_LAMP, B.WINDOW_LIT]);
const lightId = (acc) => (EMISSIVE.has(acc) && acc !== B.LANTERN && acc !== B.WINDOW_LIT ? acc : GLOW);
// generic polar furnishers for the non-suite rooms (kind roles)
function furnish(sec, role, rng, pal = null) {
  const wall = pal ? nameOf(pal.wall) : null, acc = pal ? nameOf(pal.accent) : GLOW;
  const back = sec.rb, front = sec.ra;
  switch (role) {
    case 'office': {   // desks in a row at the back with chairs in front, shelves at the ends, a holo board
      sec.arc(back, 1.5, (a, k) => { if (k % 2 === 0) { sec.desk(back, a, 'desk', -1); sec.seat(back - 1, a); } else if (k % 4 === 1) sec.put(back, a, 1, B.HOLO_SIGN); });
      sec.arc(front, 1.2, (a, k) => { if (k % 3 === 1) { sec.put(front, a, 0, B.SHELF); sec.put(front, a, 1, B.SHELF); } });
      break;
    }
    case 'archive': {  // bookshelf walls, two reading consoles, crates of records
      for (const r of [front, back]) sec.arc(r, 1.2, (a, k) => { if (k % 5 !== 2) { sec.put(r, a, 0, B.BOOKSHELF); sec.put(r, a, 1, B.BOOKSHELF); } else sec.put(r, a, 0, B.CHEST); });
      sec.desk(sec.rm, sec.mid - sec.half * 0.4, 'archivist', 1); sec.desk(sec.rm, sec.mid + sec.half * 0.4, 'desk', 1);
      break;
    }
    case 'storage': {  // crate and barrel stacks, a stock console
      sec.arc(back, 1, (a, k) => { sec.put(back, a, 0, k % 3 ? B.CRATE : B.BARREL); if (k % 2) sec.put(back, a, 1, B.CRATE); });
      sec.arc(front, 1, (a, k) => { if (k % 2 === 0) sec.put(front, a, 0, k % 4 ? B.CRATE : B.BARREL); });
      sec.desk(sec.rm, sec.a0 + 2.5 / sec.rm, 'stock', 1);
      break;
    }
    case 'kitchen': {  // furnaces and counters along the back, a serving counter at the front
      sec.arc(back, 1, (a, k) => { sec.put(back, a, 0, k % 3 === 1 ? B.FURNACE : B.PANEL_BLACK); if (k % 3 !== 1) sec.put(back, a, 1, SEAT); if (k % 4 === 2) sec.work(back - 1, a, 'cook'); });
      sec.arc(front, 1.5, (a, k) => { sec.put(front, a, 0, B.PANEL_BLACK); sec.put(front, a, 1, SEAT); if (k % 4 === 0) sec.put(front, a, 0, B.BARREL); });
      break;
    }
    case 'canteen': {  // tables with seats in two rows, a serving counter at the back
      sec.arc(back, 1, (a, k) => { sec.put(back, a, 0, B.PANEL_BLACK); sec.put(back, a, 1, SEAT); if (k % 4 === 1) sec.work(back - 1, a, 'server'); });
      for (const r of [front + 1, sec.rm + 1]) sec.arc(r, 1.5, (a, k) => { if (k % 3 === 1) { sec.put(r, a, 0, B.TABLE); sec.seat(r, a - 1 / r); sec.seat(r, a + 1 / r); } });
      break;
    }
    case 'lounge': {   // benches along the walls, planters, low tables, a bar counter at one end
      sec.arc(back, 1.2, (a, k) => { if (k % 4 === 3) sec.put(back, a, 0, B.DURASTEEL_DARK) && sec.put(back, a, 1, (k & 4) ? B.OAK_LEAVES : B.SPRUCE_LEAVES); else sec.seat(back, a); });
      sec.arc(sec.rm, 2, (a, k) => { if (k % 4 === 1) sec.put(sec.rm, a, 0, B.TABLE); });
      sec.put(front, sec.a0 + 1.5 / front, 0, B.PANEL_BLACK); sec.put(front, sec.a0 + 2.5 / front, 0, B.PANEL_BLACK); sec.put(front, sec.a0 + 1.5 / front, 1, B.SHELF); sec.work(front + 1, sec.a0 + 2 / front, 'bartender');
      break;
    }
    case 'meeting': {  // a long table along the arc with seats on both sides, a holo board at the back
      sec.arc(sec.rm, 2, (a, k) => { sec.put(sec.rm, a, 0, B.TABLE); if (k % 2 === 0) { sec.seat(sec.rm - 1, a); sec.seat(sec.rm + 1, a); } });
      sec.put(back, sec.mid, 1, B.HOLO_SIGN); sec.put(back, sec.mid, 2, B.HOLO_SIGN); sec.work(sec.rm + 1, sec.a0 + 1.2 / sec.rm, 'desk');
      break;
    }
    case 'hearing': {  // a raised bench for the committee at the back, witness console, rows of public seats
      sec.arc(back, 1, (a, k) => { sec.put(back, a, 0, B.PANEL_BLACK); sec.put(back, a, 1, k % 2 ? B.CONSOLE : SEAT); if (k % 2 === 0) sec.work(back - 1, a, 'desk'); });
      sec.put(sec.rm, sec.mid, 0, B.CONSOLE); sec.work(sec.rm - 1, sec.mid, 'witness');
      sec.arc(front, 1, (a, k) => { if (k % 2 === 0) sec.seat(front, a); if (k % 2 === 0) sec.seat(front + 1, a); });
      break;
    }
    case 'security': { // scanner gates, a console desk, weapon lockers
      sec.arc(back, 1.2, (a, k) => { if (k % 3 === 0) { sec.put(back, a, 0, B.PANEL_STRIPE); sec.put(back, a, 1, B.PANEL_STRIPE); sec.put(back, a, 2, BLUE); } else if (k % 3 === 1) { sec.put(back, a, 0, B.CHEST); } });
      sec.desk(sec.rm, sec.mid, 'guard', 1); sec.desk(sec.rm, sec.a0 + 2 / sec.rm, 'guard', 1);
      break;
    }
    case 'barracks': { // beds along the back, lockers at the front
      sec.arc(back, 1.2, (a, k) => { if (k % 3 === 0) { const [x, z] = sec.cell(back, a); const [fx, fz] = sec.cell(back - 1, a); if (sec.put(back, a, 0, B.BED_HEAD) && sec.put(back - 1, a, 0, B.BED_FOOT)) sec.bp.bed(fx, sec.y, fz); } });
      sec.arc(front, 1.2, (a, k) => { if (k % 2 === 0) { sec.put(front, a, 0, B.CHEST); } });
      break;
    }
    case 'reception': { // counter with a receptionist, waiting seats, a holo directory
      sec.arc(back, 2, (a, k) => { sec.put(back, a, 0, B.PANEL_BLACK); sec.put(back, a, 1, SEAT); if (k % 3 === 1) sec.work(back - 1, a, 'receptionist'); });
      sec.arc(front, 1.2, (a, k) => { if (k % 2 === 0) sec.seat(front, a); });
      sec.put(back, sec.mid, 2, B.HOLO_SIGN);
      break;
    }
    case 'press': {    // a row of comms consoles with seats, holo screens, a small stage
      sec.arc(back, 1, (a, k) => { if (k % 2 === 0) sec.desk(back, a, 'comms', -1); else sec.put(back, a, 1, B.HOLO_SIGN); if (k % 2 === 0) sec.seat(back - 1, a); });
      sec.arc(front, 1.5, (a, k) => { if (k % 2 === 1) sec.desk(front, a, 'desk', 1); });
      break;
    }
    case 'server': {   // console racks
      for (const r of [front, back]) sec.arc(r, 1, (a, k) => { if (k % 4 !== 3) { sec.put(r, a, 0, B.CONSOLE); sec.put(r, a, 1, k % 2 ? B.CONSOLE : BLUE); } });
      sec.work(sec.rm, sec.mid, 'technician');
      break;
    }
    case 'liaison': {  // a quiet alcove: white benches, a meditation mat, a small holo table, planters
      sec.arc(back, 1.5, (a, k) => { if (k % 3 === 0) sec.seat(back, a); else if (k % 3 === 1) sec.put(back, a, 0, B.WHITE_WOOL); });
      sec.put(sec.rm, sec.mid, 0, B.TABLE); sec.put(sec.rm, sec.mid, 1, B.HOLO_SIGN);
      sec.arc(front, 1, (a, k) => { if (k % 4 === 0) { sec.put(front, a, 0, B.DURASTEEL_DARK); sec.put(front, a, 1, B.BIRCH_LEAVES); } });
      break;
    }
    case 'chancellor': { // red carpet, gold, a great desk, statues, seats for visitors
      sec.arc(back, 1, (a, k) => { sec.put(back, a, 0, k % 3 ? RED : GOLD); if (k % 3 === 1) sec.put(back, a, 1, B.HOLO_SIGN); });
      sec.put(sec.rm + 1, sec.mid, 0, B.PANEL_BLACK); sec.put(sec.rm + 1, sec.mid + 1 / sec.rm, 0, B.PANEL_BLACK); sec.put(sec.rm + 1, sec.mid, 1, B.CONSOLE); sec.put(sec.rm + 1, sec.mid + 1 / sec.rm, 1, B.HOLO_SIGN);
      sec.work(sec.rm + 2, sec.mid, 'chancellor'); sec.put(sec.rm + 2, sec.mid, 0, SEAT);
      for (const da of [-2.5 / sec.rm, 2.5 / sec.rm]) sec.seat(sec.rm - 1, sec.mid + da);
      for (const da of [-sec.half * 0.7, sec.half * 0.7]) { const [x, z] = sec.cell(sec.rm, sec.mid + da); if (isFree(sec.bp, x, sec.y, z)) { sec.bp.fill(x, sec.y, z, x, sec.y + 1, z, GOLD); sec.bp.set(x, sec.y + 2, z, GLOW); } }
      break;
    }
    default: break;
  }
  if (wall) for (const b of [sec.ra - 1, sec.rb + 1]) eachSector(sec.bp, sec.P, b, b, sec.a0, sec.a1, (x, z) => { for (let yy = sec.y; yy <= sec.y + 3; yy++) { const v = sec.bp.get(x, yy, z); if (v === STONE || v === STONE2) sec.bp.set(x, yy, z, wall); } });
  sec.lights(Math.max(1, Math.round(sec.half * sec.rm / 4)), lightId(acc));
}

// signature furnishing of a delegation suite (in its reception or lounge)
function artifact(sec, name, pal) {
  const r = sec.ra + 1, a = sec.a0 + 2.2 / r, a2 = sec.a0 + 4.2 / r;
  switch (name) {
    case 'planters': for (const aa of [a, a2, a2 + 2 / r]) { sec.put(r, aa, 0, B.DURASTEEL_DARK); sec.put(r, aa, 1, B.OAK_LEAVES); } sec.put(r + 1, a2, 0, B.TALL_GRASS); break;
    case 'ore_crates': for (const aa of [a, a2]) { sec.put(r, aa, 0, B.CRATE); sec.put(r, aa, 1, B.GOLD_ORE); } sec.put(r + 1, a, 0, B.IRON_ORE); sec.put(r + 1, a2, 0, B.COAL_ORE); break;
    case 'water_tank': for (const aa of [a, a2]) { sec.put(r, aa, 0, B.WATER); sec.put(r, aa, 1, GLASS); sec.put(r, aa, 2, GLASS); sec.put(r, aa, 3, BLUE); } break;
    case 'banners': for (const aa of [a, a2, a2 + 2 / r]) { sec.put(r, aa, 0, B.GOLD_BLOCK); sec.put(r, aa, 1, B.RED_WOOL); sec.put(r, aa, 2, B.RED_WOOL); sec.put(r, aa, 3, B.WHITE_WOOL); } break;
    case 'route_map': for (const aa of [a, a2, a2 + 2 / r]) { sec.put(r, aa, 1, B.HOLO_SIGN); sec.put(r, aa, 2, B.HOLO_SIGN); sec.put(r, aa, 0, B.PANEL_BLACK); } break;
    case 'mineral_display': for (const aa of [a, a2]) { sec.put(r, aa, 0, B.IRON_BLOCK); sec.put(r, aa, 1, B.IRON_ORE); } sec.put(r + 1, a, 0, GLASS); sec.put(r + 1, a2, 0, GLASS); sec.put(r + 1, a, 1, B.GOLD_ORE); break;
    case 'library_wall': for (let k = 0; k < 4; k++) { const aa = a + k / r; sec.put(r, aa, 0, B.BOOKSHELF); sec.put(r, aa, 1, B.BOOKSHELF); sec.put(r, aa, 2, B.BOOKSHELF); } break;
    case 'ship_model': for (let k = 0; k < 4; k++) sec.put(r, a + k / r, 1, B.DURASTEEL); sec.put(r, a + 4 / r, 1, GLASS); sec.put(r, a + 1 / r, 2, B.DURASTEEL); sec.put(r, a, 0, B.PANEL_BLACK); sec.put(r, a + 3 / r, 0, B.PANEL_BLACK); sec.put(r, a - 1 / r, 1, BLUE); break;
    case 'medical_tank': for (const aa of [a]) { sec.put(r, aa, 0, B.CHROME); sec.put(r, aa, 1, GLASS); sec.put(r, aa, 2, GLASS); sec.put(r, aa, 3, BLUE); } sec.put(r, a2, 0, B.CHEST); sec.put(r, a2, 1, B.WHITE_WOOL); break;
    case 'garden': for (let k = 0; k < 5; k++) { const aa = a + k / r; sec.put(r, aa, 0, B.GRASS); sec.put(r, aa, 1, k % 2 ? B.SPRUCE_LEAVES : B.TALL_GRASS); } sec.put(r + 1, a2, 0, B.WATER); break;
    case 'records_vault': for (let k = 0; k < 4; k++) { const aa = a + k / r; sec.put(r, aa, 0, B.PANEL_BLACK); sec.put(r, aa, 1, k % 2 ? B.CONSOLE : B.CHEST); sec.put(r, aa, 2, k % 2 ? BLUE : B.PANEL_BLACK); } break;
    case 'star_charts': for (let k = 0; k < 4; k++) { const aa = a + k / r; sec.put(r, aa, 1, k % 2 ? B.HOLO_SIGN : BLUE); sec.put(r, aa, 2, k % 2 ? BLUE : B.HOLO_SIGN); sec.put(r, aa, 0, B.HULL_PLATE); } sec.put(r + 1, a2, 0, B.LANTERN); break;
    default: break;
  }
  void pal;
}

// the angular plan of a suite: its rooms along the arc (weights by role, 1.2-block gaps that stay leak-proof for a
// 4-neighbour walker) and the angle of its lift at the reception's far end. Computed before anything is carved so
// every lift pylon can be placed first.
const SUITE_KIND = { reception: 'delegation_reception', office: 'executive_office', aides: 'aides_office', records: 'delegation_records', lounge: 'delegation_lounge', shrine: 'delegation_salon', kitchenette: 'delegation_kitchenette', guest_room: 'delegation_guest_room', workshop: 'delegation_workshop' };
export function suitePlan(deleg, a0, a1) {
  const [ra] = G.ROOM_R;
  const roles = deleg.layout.slice();
  if (deleg.extraRoom) roles.splice(roles.indexOf('lounge') + 1, 0, deleg.extraRoom);
  const weight = { reception: 1.6, office: 1.45, aides: 1.15, records: 1.0, lounge: 1.0, shrine: 0.85, kitchenette: 0.85, guest_room: 0.9, workshop: 0.9 };
  const gapA = 1.2 / ra, totalW = roles.reduce((s, r) => s + weight[r], 0), usable = (a1 - a0) - gapA * (roles.length + 1);
  const ranges = [];
  let a = a0 + gapA;
  for (const role of roles) { const w = usable * weight[role] / totalW; ranges.push({ role, a0: a, a1: a + w, mid: a + w / 2, half: w / 2 }); a += w + gapA; }
  const rec = ranges.find((R) => R.role === 'reception');
  const dirSign = deleg.layout.indexOf('reception') % 2 === 0 ? 1 : -1;
  const liftA = rec.mid + dirSign * Math.max(0, rec.half - 2.6 / 60);
  return { roles, ranges, liftA, a0, a1 };
}

// the rooms of one suite along its arc; returns the suite record for bp.meta.senate.delegations
function suite(bp, P, meta, deleg, y, plan, tier, podAngles, lift) {
  const pal = { wall: nameOf(deleg.palette.wall), floor: nameOf(deleg.palette.floor), accent: nameOf(deleg.palette.accent), trim: nameOf(deleg.palette.trim) };
  const [ra, rb] = G.ROOM_R, rm = (ra + rb + 1) / 2, { a0, a1 } = plan;
  const rooms = [], ranges = [];
  for (const R of plan.ranges) ranges.push({ ...R, sec: new Sector(bp, P, y, ra, rb, R.a0, R.a1, SUITE_KIND[R.role], pal.floor, pal.wall) });
  // doors: every room onto the back corridor (bin 56); the reception onto the public corridor (bin 62); internal
  // doors between neighbours through the gaps (reception <-> both neighbours, office <-> aides, lounge <-> neighbours)
  let entry = null;
  for (let i = 0; i < ranges.length; i++) {
    const R = ranges[i];
    ringDoor(bp, G.SVC_WALL, R.sec.mid, y, 2, pal.trim, R.sec.range);
    if (R.role === 'reception') entry = ringDoor(bp, G.OUT_WALL, R.sec.mid, y, 2, pal.trim, R.sec.range);
    if (i > 0) {
      const L = ranges[i - 1], link = L.role === 'reception' || R.role === 'reception' || (L.role === 'office' && R.role === 'aides') || (L.role === 'aides' && R.role === 'office') || L.role === 'lounge' || R.role === 'lounge';
      if (link) { const ab = (L.a1 + R.a0) / 2; for (const r of [rm - 1, rm]) { const [x, z] = cellOf(r, ab); if (isPylon(bp, x, y, z)) continue; bp.fill(x, y, z, x, y + 2, z, AIR); if (isFree(bp, x, y - 1, z)) bp.set(x, y - 1, z, pal.floor); } }
    }
  }
  // furnishing per role
  for (const R of ranges) {
    const s = R.sec;
    switch (R.role) {
      case 'reception': furnish(s, 'reception', null, pal); artifact(s, deleg.artifact, pal); break;
      case 'office': {
        s.put(rb, s.mid, 0, B.PANEL_BLACK); s.put(rb, s.mid + 1 / rb, 0, B.PANEL_BLACK); s.put(rb, s.mid, 1, B.CONSOLE); s.put(rb, s.mid + 1 / rb, 1, B.HOLO_SIGN);
        s.work(rb - 1, s.mid, 'executive'); s.put(rb - 1, s.mid, 0, SEAT); s.work(rb - 1, s.mid + 1 / rb, 'desk');   // the senator sits at the desk
        for (const da of [-2.5 / rm, 2.5 / rm]) s.seat(rm - 1, s.mid + da);
        s.arc(ra, 1.2, (aa, k) => { if (k % 2 === 0) { s.put(ra, aa, 0, B.BOOKSHELF); s.put(ra, aa, 1, k % 4 ? B.BOOKSHELF : B.HOLO_SIGN); } });
        s.put(rb, s.a0 + 1.5 / rb, 0, B.DURASTEEL_DARK); s.put(rb, s.a0 + 1.5 / rb, 1, B.OAK_LEAVES);
        // view: chamber glass in the inner wall (toward the gallery / back corridor), city slits in the outer wall, or a lit skylight
        if (deleg.view === 'chamber') s.arc(ra - 1, 1.5, (aa, k) => { if (k % 3 !== 2) s.putRaw(ra - 1, aa, 1, GLASS); });
        else if (deleg.view === 'city') s.arc(rb + 1, 1.5, (aa, k) => { if (k % 2 === 0) s.putRaw(rb + 1, aa, 1, B.WINDOW_LIT); });
        else s.arc(rm, 1.5, (aa, k) => { if (k % 2 === 0) s.putRaw(rm, aa, 4, pal.accent); });
        break;
      }
      case 'aides': s.arc(rb, 1.2, (aa, k) => { if (k % 2 === 0) { s.desk(rb, aa, 'desk', -1); s.seat(rb - 1, aa); } }); s.arc(ra, 1.2, (aa, k) => { if (k % 3 === 0) { s.put(ra, aa, 0, B.SHELF); s.put(ra, aa, 1, B.SHELF); } else if (k % 3 === 1) s.put(ra, aa, 1, B.HOLO_SIGN); }); break;
      case 'records': furnish(s, 'archive', null, pal); break;
      case 'lounge': furnish(s, 'lounge', null, pal); if (deleg.layout.indexOf('lounge') !== deleg.layout.indexOf('reception') + 1) artifact(s, deleg.artifact, pal); break;
      case 'shrine': s.arc(rb, 1.5, (aa, k) => { if (k % 2 === 0) { s.put(rb, aa, 0, GOLD); s.put(rb, aa, 1, k % 4 ? B.LANTERN : GOLD); } }); s.put(rm, s.mid, 0, B.WHITE_WOOL); s.stand(rm - 1, s.mid, 'seat'); s.put(rm - 1, s.mid, 0, SEAT); break;
      case 'kitchenette': s.arc(rb, 1.2, (aa, k) => { s.put(rb, aa, 0, k % 4 === 1 ? B.FURNACE : B.PANEL_BLACK); if (k % 4 !== 1) s.put(rb, aa, 1, SEAT); }); s.put(rm, s.mid, 0, B.TABLE); s.seat(rm, s.mid - 1 / rm); s.seat(rm, s.mid + 1 / rm); s.work(rb - 1, s.a0 + 2 / rb, 'cook'); break;
      case 'guest_room': { const [fx, fz] = cellOf(rb - 1, s.mid); if (s.put(rb, s.mid, 0, B.BED_HEAD) && s.put(rb - 1, s.mid, 0, B.BED_FOOT)) bp.bed(fx, y, fz); s.put(rb, s.a0 + 1.5 / rb, 0, B.CHEST); s.put(ra, s.mid, 0, B.TABLE); s.seat(ra, s.mid + 1 / ra); break; }
      case 'workshop': s.arc(rb, 1.2, (aa, k) => { s.put(rb, aa, 0, k % 3 === 0 ? B.ANVIL : B.CRATE); if (k % 3 === 1) s.work(rb - 1, aa, 'technician'); }); s.put(ra, s.mid, 0, B.CONSOLE); s.put(ra, s.a0 + 1.5 / ra, 0, B.BARREL); break;
      default: break;
    }
    if (R.role !== 'reception' && R.role !== 'records' && R.role !== 'lounge') { for (const b of [ra - 1, rb + 1]) eachSector(bp, P, b, b, s.a0, s.a1, (x, z) => { for (let yy = y; yy <= y + 3; yy++) { const v = bp.get(x, yy, z); if (v === STONE || v === STONE2) bp.set(x, yy, z, pal.wall); } }); s.lights(2, lightId(pal.accent)); }
    const rec = s.register(); if (rec) rooms.push({ role: R.role, kind: rec.kind, x: rec.x, y: rec.y, z: rec.z, w: rec.w, d: rec.d });
  }
  // the private pod: the tier pod nearest the suite's centre (inside its arc), its door through the chamber wall
  const mid = (a0 + a1) / 2;
  let best = null;
  for (const p of podAngles) { const d = Math.abs(angDiff(p.a, mid)); if (p.a > a0 && p.a < a1 && (!best || d < best.d)) best = { d, p }; }
  const podDoor = ringDoor(bp, G.R_HALL, best.p.a, y, 2, pal.trim);
  const [px, pz] = cellOf(G.R_HALL + 0.5, best.p.a); bp.set(px, y + 3, pz, lightId(pal.accent));
  // the back corridor stretch of this suite: palette floor
  eachSector(bp, P, G.SERVICE_R[0], G.SERVICE_R[1], a0, a1, (x, z) => { if (!isPylon(bp, x, y - 1, z)) bp.set(x, y - 1, z, pal.floor); });
  // plaque light over the suite entrance, and over the delegation's lift door in the grand lobby (the lift's outward
  // side at level 1), so the lobby ring shows twelve differently lit doors
  const [ex, ez] = entry.cell; bp.set(ex, y + 3, ez, lightId(pal.accent));
  if (lift.sides && lift.sides[1]) for (const [px, py, pz] of liftLintel(lift, 1, lift.sides[1])) bp.set(px, py, pz, lightId(pal.accent));
  best.p.delegation = deleg.id;
  return {
    id: deleg.id, name: deleg.name, senator: deleg.senator, world: deleg.world, concern: deleg.concern, palette: deleg.palette, emblem: deleg.emblem, tier,
    size: deleg.size, layout: plan.roles, artifact: deleg.artifact, view: deleg.view, extraRoom: deleg.extraRoom || null,
    suite: { rooms, y: bp.wy(y), entry: { x: bp.wx(entry.cell[0]), y: bp.wy(y), z: bp.wz(entry.cell[1]) }, podDoor: { x: bp.wx(podDoor.cell[0]), y: bp.wy(y), z: bp.wz(podDoor.cell[1]) }, arc: [a0, a1],
      lift: { x: bp.wx(lift.x), z: bp.wz(lift.z), y0: bp.wy(1), y1: bp.wy(y) }, lobbyDoor: { x: bp.wx(lift.x), y: bp.wy(1), z: bp.wz(lift.z) } },
    pod: { tier, k: best.p.k, spot: { x: bp.wx(best.p.x), y: bp.wy(best.p.y), z: bp.wz(best.p.z) }, seats: best.p.seats.map((s) => ({ x: bp.wx(s.x), y: bp.wy(s.y), z: bp.wz(s.z) })) },
  };
}

// ------------------------------------------------------------------------------------------------ the drum's bands
function bands(bp, P, rng, meta) {
  const [sr0, sr1] = G.SERVICE_R, [rr0, rr1] = G.ROOM_R, [cr0, cr1] = G.CORR_R, [ir0, ir1] = G.INNER_ROOM;
  const S = G.SLOT;
  const quad = (q) => [CARDINALS[q] + S, CARDINALS[q] + Math.PI / 2 - S];   // q: 0 E->S, 1 S->W, 2 W->N, 3 N->E
  const sub = ([qa, qb], k, n, gap = 1.6 / rr0) => { const w = (qb - qa - gap * (n - 1)) / n; return [qa + k * (w + gap), qa + k * (w + gap) + w]; };
  // corridors and service rings on every level (top-down so a lower level's ceiling lights land in the floor above)
  for (let li = G.LEVELS.length - 1; li >= 0; li--) {
    const y = G.LEVELS[li];
    // public corridors: the visitor route's stone, brick and gold; service ring: deck plate and striped panels
    eachSector(bp, P, cr0, cr1, 0, TAU, (x, z, b) => { bp.set(x, y - 1, z, (b === cr0 || b === cr1) ? GOLD : ((x + z) % 4 === 0 ? BAND : STONE)); bp.fill(x, y, z, x, y + 3, z, AIR); bp.set(x, y + 4, z, ((x + z) % 5 === 0) ? GLOW : STONE); });
    eachSector(bp, P, sr0, sr1, 0, TAU, (x, z) => { bp.set(x, y - 1, z, ((x + z) % 3) ? PLATE : B.PANEL_STRIPE); bp.fill(x, y, z, x, y + 3, z, AIR); bp.set(x, y + 4, z, ((x + z) % 4 === 0) ? GLOW : DARK); });
    for (const [b0, b1, floor] of [[cr0, cr1, STONE], [sr0, sr1, PLATE]]) for (let b = b0; b <= b1; b++) { bp.set(CX + b, y - 1, CZ, floor); bp.fill(CX + b, y, CZ, CX + b, y + 3, CZ, AIR); }   // east seam cells
    if (y === 1) {   // the grand lobby ring: the outer band joins the corridor (bins 57..66), stone and gold floor
      eachSector(bp, P, rr0, G.OUT_WALL, 0, TAU, (x, z, b) => { bp.set(x, 0, z, (b === rr0 || b === G.OUT_WALL) ? GOLD : ((x + z) % 4 === 0 ? BAND : STONE)); bp.fill(x, 1, z, x, 4, z, AIR); });
      for (let b = rr0; b <= G.OUT_WALL; b++) { bp.set(CX + b, 0, CZ, STONE); bp.fill(CX + b, 1, CZ, CX + b, 4, CZ, AIR); }
    }
    // cardinal slots: a straight passage from the corridor to the service ring (3 wide), at the tiers on through the
    // chamber wall into the gallery; guard post beside it. (No south passage at level 6: the screening hall below is
    // double height there.)
    for (const c of CARDINALS) {
      if (y === 6 && c === Math.PI / 2) continue;
      const tier = G.TIERS.includes(y);
      const off = (c === 0 || c === Math.PI) ? -2 : 0;   // east / west: the stairs take the other half of the slot
      eachSlot(bp, P, tier ? G.R_HALL : sr0, cr0, c, 3.5, (x, z, along, perp) => {
        if (Math.abs(perp - off) > 1.5) return;
        bp.set(x, y - 1, z, Math.floor(along) % 2 ? STONE : GOLD); bp.fill(x, y, z, x, y + 3, z, AIR); bp.set(x, y + 4, z, Math.floor(along) % 3 ? STONE : GLOW);
      });
      // guard post at the passage mouth (bin 60): the console in a niche of the passage wall, the guard on the edge cell
      if (y > 1) {
        const cellAt = (along, perp) => [Math.round(CX + Math.cos(c) * along - Math.sin(c) * perp), Math.round(CZ + Math.sin(c) * along + Math.cos(c) * perp)];
        const [gx, gz] = cellAt(60, off - 1), [kx, kz] = cellAt(60, off - 2);
        if (isFree(bp, gx, y, gz) && !isPylon(bp, kx, y, kz)) guardPost(bp, kx, y, kz, gx - kx, gz - kz);
      }
    }
  }
  // ---- lifts first (their pylons must survive the room carves): twelve delegation lifts from the lobby to the
  // suite's tier, four public lifts in the facade at the diagonals, two service lifts beside the dock
  meta.delegations = [];
  const tiers = [DELEGATIONS.filter((d) => d.tier === 1), DELEGATIONS.filter((d) => d.tier === 2)];
  const plans = [];   // { deleg, y, t, plan }
  tiers.forEach((list, t) => {
    const y = G.TIERS[t];
    for (let q = 0; q < 3; q++) {
      const [qa, qb] = quad(q);
      // tier 2 takes each quadrant in the opposite order so the two tiers' receptions (and lift pylons) stagger
      const A = list[q * 2 + t], Bd = list[q * 2 + 1 - t];
      const wA = SIZE_ARC[A.size] / 59, wB = SIZE_ARC[Bd.size] / 59;
      plans.push({ deleg: A, y, t, plan: suitePlan(A, qa, qa + wA), spare: (qb - qa) - wA - wB, spareAt: [qa + wA, qb - wB] });
      plans.push({ deleg: Bd, y, t, plan: suitePlan(Bd, qb - wB, qb) });
    }
  });
  // a lift pylon is 4 x 4; two shafts closer than 5 blocks would merge, so each suite tries the reception's far end,
  // then its near end, then every block of its own arc until it clears the shafts already placed
  const placed = [];
  const shaftXZ = (a) => cellOf(60.5, a);
  for (const p of plans) {
    const rec = p.plan.ranges.find((R) => R.role === 'reception');
    const candidates = [p.plan.liftA, rec.mid * 2 - p.plan.liftA];
    for (let k = 3; k * (1 / 60) < (p.plan.a1 - p.plan.a0) - 3 / 60; k++) candidates.push(p.plan.a0 + k / 60);
    let chosen = candidates[0];
    for (const a of candidates) { const [x, z] = shaftXZ(a); if (placed.every(([px, pz]) => Math.max(Math.abs(px - x), Math.abs(pz - z)) >= 5)) { chosen = a; break; } }
    p.plan.liftA = chosen; placed.push(shaftXZ(chosen));
    p.lift = polarLift(bp, 60.5, chosen, 1, p.y, [[1, 1], [p.y, -1]]);
  }
  meta.publicLifts = [];
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + k * Math.PI / 2;
    const l = polarLift(bp, 67.5, a, 1, G.LEVELS[G.LEVELS.length - 1], G.LEVELS.map((y) => [y, -1]));
    meta.publicLifts.push({ x: bp.wx(l.x), z: bp.wz(l.z) });
  }
  for (const a of [Math.PI * 1.5 + 0.2, Math.PI * 1.5 - 0.2]) polarLift(bp, 67.5, a, 1, G.LEVELS[G.LEVELS.length - 1], G.LEVELS.map((y) => [y, -1]));
  // ---- rooms, top level first so each level's ceiling lights land in the floor above after that floor is laid
  // level 21: committee floor, the Chancellor's office at the north
  {
    const y = 21;
    const plan = [[0, 0, 2, 'hearing_chamber', 'hearing'], [0, 1, 2, 'senators_lounge', 'lounge'], [1, 0, 2, 'meeting_room', 'meeting'], [1, 1, 2, 'press_office', 'press'], [2, 0, 2, 'hearing_chamber', 'hearing'], [2, 1, 2, 'archive', 'archive']];
    for (const [q, k, n, kind, role] of plan) {
      const [a0, a1] = sub(quad(q), k, n);
      const s = new Sector(bp, P, y, rr0, rr1, a0, a1, kind);
      furnish(s, role, rng);
      ringDoor(bp, G.OUT_WALL, s.mid, y, 2, TRIM, s.range); ringDoor(bp, G.SVC_WALL, s.mid, y, 2, TRIM, s.range);
      s.register();
    }
    const [qa] = quad(3), wC = 40 / 59;
    const s = new Sector(bp, P, y, rr0, rr1, qa + 1.6 / rr0, qa + wC, 'chancellor_office', B.RED_WOOL, RED);
    furnish(s, 'chancellor', rng, { wall: 'PANEL_RED', accent: 'GOLD_BLOCK' });
    const door = ringDoor(bp, G.OUT_WALL, s.mid, y, 2, GOLD, s.range); ringDoor(bp, G.SVC_WALL, s.mid, y, 2, GOLD, s.range);
    for (const da of [-2.5 / 63.5, 2.5 / 63.5]) { const [gx, gz] = cellOf(64, door.a + da); if (isFree(bp, gx, y, gz)) guardPost(bp, gx, y, gz, Math.round(Math.cos(door.a)), Math.round(Math.sin(door.a))); }
    meta.chancellorOffice = s.register();
    const rest = [['guard_post', 'security'], ['meeting_room', 'meeting'], ['storage', 'storage']];
    rest.forEach(([kind, role], k) => { const [a0, a1] = sub([qa + wC + 1.6 / rr0, quad(3)[1]], k, rest.length); const r = new Sector(bp, P, y, rr0, rr1, a0, a1, kind); furnish(r, role, rng); ringDoor(bp, G.OUT_WALL, r.mid, y, 2, TRIM, r.range); ringDoor(bp, G.SVC_WALL, r.mid, y, 2, TRIM, r.range); r.register(); });
  }
  // the suites (tier 2 then tier 1) and the Q4 service rooms of each tier level
  for (const t of [1, 0]) {
    const y = G.TIERS[t], pods = meta.tierPods[t];
    for (const p of plans) if (p.t === t) {
      meta.delegations.push(suite(bp, P, meta, p.deleg, y, p.plan, t + 1, pods, p.lift));
      if (p.spare && p.spare * 59 > 7) { const s = new Sector(bp, P, y, rr0, rr1, p.spareAt[0] + 1.2 / rr0, p.spareAt[1] - 1.2 / rr0, 'guard_post'); furnish(s, 'security', rng); ringDoor(bp, G.OUT_WALL, s.mid, y, 2, TRIM, s.range); s.register(); }
    }
    const q4 = quad(3), plan = t === 0 ? [['freight_storage', 'storage'], ['guard_post', 'security'], ['archive', 'archive'], ['staff_canteen', 'canteen']] : [['archive', 'archive'], ['guard_post', 'security'], ['meeting_room', 'meeting'], ['server_room', 'server']];
    plan.forEach(([kind, role], k) => { const [a0, a1] = sub(q4, k, plan.length); const s = new Sector(bp, P, y, rr0, rr1, a0, a1, kind); furnish(s, role, rng); ringDoor(bp, G.OUT_WALL, s.mid, y, 2, TRIM, s.range); ringDoor(bp, G.SVC_WALL, s.mid, y, 2, TRIM, s.range); s.register(); });
  }
  meta.delegations.sort((a, b) => DELEGATIONS.findIndex((d) => d.id === a.id) - DELEGATIONS.findIndex((d) => d.id === b.id));
  // level 6: inner band (committee / diplomatic / liaison) and outer band (committee rooms, lounges)
  {
    const y = 6;
    // the liaison alcove sits just south of the east passage: the Jedi come in by the east (press) entry, up the east
    // stairs and through the passage, a few steps along the service ring (SPEC §13 Seran Vale's route from the Temple)
    const inner = [[0, 0, 2, 'liaison_lounge', 'liaison'], [0, 1, 2, 'hearing_chamber', 'hearing'], [1, 0, 2, 'guard_post', 'security'], [1, 1, 2, 'meeting_room', 'meeting'], [2, 0, 2, 'diplomatic_reception', 'reception'], [2, 1, 2, 'meeting_room', 'meeting'], [3, 0, 2, 'archive', 'archive'], [3, 1, 2, 'server_room', 'server']];
    for (const [q, k, n, kind, role] of inner) {
      const [a0, a1] = sub(quad(q), k, n, 1.6 / ir0);
      const s = new Sector(bp, P, y, ir0, ir1, a0, a1, kind, role === 'liaison' ? B.WHITE_WOOL : STONE);
      furnish(s, role, rng);
      ringDoor(bp, G.R_HALL, s.mid, y, 2, TRIM, s.range);
      const rec = s.register();
      if (kind === 'liaison_lounge') {
        // the alcove opens onto the bowl's top ring through the inner wall: the liaison steps straight into the chamber
        ringDoor(bp, G.INNER_WALL, s.mid, y, 2, B.WHITE_WOOL, s.range);
        const sp = s.stand(s.rm, s.mid + 1.5 / s.rm, 'stand') || { x: s.center[0], y, z: s.center[1] };
        // the in-lot walk from the street east of the lot: forecourt, east (press) entry, lobby ring, the east stairs
        // (first flight, south stretch), the level-6 east passage, the service ring to the alcove's door, the alcove
        const W = (x, yy, z) => ({ x: bp.wx(x), y: bp.wy(yy), z: bp.wz(z) });
        const [rx, rz] = cellOf(sr0 + 0.5, s.mid);
        meta.liaison = { room: rec, spot: W(sp.x, y, sp.z), route: [W(CX + 80, 1, CZ), W(CX + 69, 1, CZ), W(CX + 64, 1, CZ), W(CX + 63, 1, CZ + 2), W(CX + 63, 6, CZ + 13), W(CX + 64, 6, CZ - 2), W(CX + 55, 6, CZ - 2), W(rx, 6, rz), W(sp.x, y, sp.z)] };
      }
      if (kind === 'hearing_chamber') meta.hearing = rec;
    }
    const outer = [[0, 0, 2, 'hearing_chamber', 'hearing'], [0, 1, 2, 'senators_lounge', 'lounge'], [1, 0, 2, 'meeting_room', 'meeting'], [1, 1, 2, 'hearing_chamber', 'hearing'], [2, 0, 2, 'press_office', 'press'], [2, 1, 2, 'senators_lounge', 'lounge'], [3, 0, 3, 'archive', 'archive'], [3, 1, 3, 'restroom', 'lounge'], [3, 2, 3, 'storage', 'storage']];
    for (const [q, k, n, kind, role] of outer) {
      const [a0, a1] = sub(quad(q), k, n);
      const s = new Sector(bp, P, y, rr0, rr1, a0, a1, kind);
      furnish(s, role, rng);
      ringDoor(bp, G.OUT_WALL, s.mid, y, 2, TRIM, s.range); ringDoor(bp, G.SVC_WALL, s.mid, y, 2, TRIM, s.range);
      s.register();
    }
  }
  // level 1: inner band (public-facing rooms open onto the tunnels, all open onto the service ring)
  {
    const y = 1;
    const plan = [
      // [quadrant, slot, n, kind, role, tunnel the room also opens onto]
      [0, 0, 2, 'press_office', 'press', 0], [0, 1, 2, 'petition_office', 'office', Math.PI / 2],
      [1, 0, 2, 'guard_post', 'security', Math.PI / 2], [1, 1, 2, 'guard_barracks', 'barracks', null],
      [2, 0, 2, 'hall_of_records', 'archive', Math.PI], [2, 1, 2, 'staff_canteen', 'canteen', null],
      [3, 0, 2, 'freight_storage', 'storage', Math.PI * 1.5], [3, 1, 2, 'senate_kitchen', 'kitchen', null],
    ];
    for (const [q, k, n, kind, role, tun] of plan) {
      const [a0, a1] = sub(quad(q), k, n, 1.6 / ir0);
      const s = new Sector(bp, P, y, ir0, ir1, a0, a1, kind, role === 'storage' || role === 'kitchen' ? PLATE : STONE);
      furnish(s, role, rng);
      ringDoor(bp, G.R_HALL, s.mid, y, 2, TRIM, s.range);
      if (tun !== null) radialDoor(bp, P, s, tun, y);
      const rec = s.register();
      if (kind === 'petition_office') { const [x, z] = s.center; meta.petition = { room: rec, desk: { x: bp.wx(x), y: bp.wy(y), z: bp.wz(z - 1) } }; if (isFree(bp, x, y, z)) { bp.set(x, y, z, B.CONSOLE); bp.work(x, y, z - 1, 'clerk'); } }
      if (kind === 'freight_storage') meta.freight = s.center;
    }
    // the lobby ring's ceiling lights, written last so the level-6 floors above keep them
    eachSector(bp, P, rr0, cr1, 0, TAU, (x, z) => { if ((x + z) % 4 === 0 && !isPylon(bp, x, 5, z) && bp.get(x, 5, z) !== 0 && bp.get(x, 5, z) !== AIR) bp.set(x, 5, z, GLOW); });
  }
  // ---- stairs
  // visitor stairs (east and west): flights along the corridor at every level, the last flight radial into the gallery.
  // Consecutive flights alternate between the two straight stretches beside the passage (south of it climbing +z,
  // north of it climbing -z): a flight stacked directly on the one below would bury its headroom with its own base.
  meta.stairs = { visitor: [], service: [] };
  for (const east of [true, false]) {
    const sx = east ? CX + cr0 : CX - cr0 - 1;      // two columns: bins 63..64
    const railX = east ? sx + 2 : sx - 1;
    [1, 6, 11, 16].forEach((y, i) => {
      const south = i % 2 === 0, z0 = south ? CZ + 3 : CZ - 4, dz = south ? 1 : -1;
      stairRun(bp, sx, z0, 0, dz, y, 5, 2, DARK, STONE, SEAT);
      // rail along the open side of the well on the level above (not over the top steps: that is the landing), lights
      for (let k = 0; k < 8; k++) bp.set(railX, y + 5, z0 + dz * k, B.IRON_BARS);
      bp.set(sx, y + 8, z0 + dz * 5, GLOW); bp.set(sx, y + 4, z0 - dz, GLOW);
      meta.stairs.visitor.push({ x: bp.wx(sx), y: bp.wy(y), z: bp.wz(z0), to: bp.wy(y + 5), landing: { x: bp.wx(sx), y: bp.wy(y + 5), z: bp.wz(z0 + dz * 10) } });
    });
    // 21 -> 26: radial flight from the corridor (bin 62) inward to the public gallery (bin 52), z CZ+1..CZ+2
    const dir = east ? -1 : 1, x0 = east ? CX + G.OUT_WALL : CX - G.OUT_WALL;
    for (let k = 0; k < 10; k++) { const x = x0 + dir * k; bp.fill(x, 20, CZ + 1, x, 29, CZ + 2, AIR); }
    stairRun(bp, x0, CZ + 1, dir, 0, 21, 5, 2, DARK, STONE, SEAT);
    for (let k = 0; k <= 10; k++) { const x = x0 + dir * k; bp.set(x, 27, CZ, TRIM); bp.set(x, 27, CZ + 3, TRIM); bp.fill(x, 28, CZ, x, 29, CZ + 3, AIR); bp.set(x, 30, CZ + 1, k % 3 ? STONE : GLOW); bp.set(x, 30, CZ + 2, STONE); }
    { const gx = x0 + dir * 10; bp.fill(gx, 25, CZ + 1, gx + dir, 25, CZ + 2, STONE); bp.fill(gx, 26, CZ + 1, gx + dir, 29, CZ + 2, AIR); }
    meta.stairs.visitor.push({ x: bp.wx(x0), y: bp.wy(21), z: bp.wz(CZ + 1), to: bp.wy(26) });
  }
  // service stairs (north): flights along the corridor's inner half beside the dock, deck plate treads, alternating
  // east (+x) and west (-x) of the north passage; each flight lands at a service lift's porch (pylons at x +-11..14)
  [1, 6, 11, 16].forEach((y, i) => {
    const z0 = CZ - cr0 - 1;   // rows z CZ-64, CZ-63 (bins 64, 63)
    const dx = i % 2 === 0 ? 1 : -1, x0 = CX + dx * 2;
    stairRun(bp, x0, z0, dx, 0, y, 5, 2, DARK, PLATE, SEAT);
    for (let k = 0; k < 8; k++) bp.set(x0 + dx * k, y + 5, z0 - 1, B.IRON_BARS);
    bp.set(x0 + dx * 5, y + 8, z0, GLOW); bp.set(x0 - dx, y + 4, z0, GLOW);
    meta.stairs.service.push({ x: bp.wx(x0), y: bp.wy(y), z: bp.wz(z0), to: bp.wy(y + 5), landing: { x: bp.wx(x0 + dx * 10), y: bp.wy(y + 5), z: bp.wz(z0) } });
  });
  // ---- entrances at ground level: south security screening, north loading dock, east press, west diplomatic
  entrances(bp, P, meta);
}
// a door from an inner-band room onto the neighbouring cardinal tunnel (through the room's radial wall)
function radialDoor(bp, P, sec, tun, y) {
  const edge = Math.abs(angDiff(sec.a0, tun)) < Math.abs(angDiff(sec.a1, tun)) ? sec.a0 : sec.a1;
  const inward = edge === sec.a0 ? 1 : -1;   // the wall lies just outside the interior's angular edge
  for (const r of [sec.rm - 1, sec.rm]) for (let k = 0; k <= 16; k++) {
    const [x, z] = cellOf(r, edge - inward * k * 0.5 / r);
    const dx = x - CX, dz = z - CZ, perp = -dx * Math.sin(tun) + dz * Math.cos(tun);
    if (Math.abs(perp) <= 1.5) break;   // reached the tunnel
    if (isPylon(bp, x, y, z)) break;
    bp.fill(x, y, z, x, y + 2, z, AIR); if (isFree(bp, x, y - 1, z)) bp.set(x, y - 1, z, PLATE);
  }
}

function entrances(bp, P, meta) {
  const [rr0] = G.ROOM_R, cr1 = G.CORR_R[1];
  // south: security screening hall (bins 57..66, 11 wide, double height), the grand arch (11 wide, 8 high) through
  // the skin; the level-6 corridor is open to the hall there, so it gets a balustrade
  eachSlot(bp, P, rr0, cr1, Math.PI / 2, 5.5, (x, z, along, perp) => {
    bp.set(x, 0, z, (Math.floor(along) % 3 === 0 && Math.abs(perp) < 4) ? GOLD : STONE); bp.fill(x, 1, z, x, 8, z, AIR); bp.set(x, 9, z, (Math.floor(along) + Math.floor(perp)) % 3 === 0 ? GLOW : BAND);
  });
  eachSlot(bp, P, G.CORR_R[0], cr1, Math.PI / 2, 6.5, (x, z, along, perp) => { if (Math.abs(perp) > 5.5) bp.set(x, 6, z, B.IRON_BARS); });
  eachSlot(bp, P, G.SKIN_R[0], G.SKIN_R[1] + 1, Math.PI / 2, 5.5, (x, z) => { bp.fill(x, 1, z, x, 8, z, AIR); bp.set(x, 9, z, GLOW); bp.set(x, 0, z, GOLD); });
  eachSlot(bp, P, G.SKIN_R[0], G.SKIN_R[1] + 1, Math.PI / 2, 7, (x, z, along, perp) => { if (Math.abs(perp) > 5.5) { bp.fill(x, 1, z, x, 10, z, TRIM); bp.set(x, 11, z, BLUE); } });
  // the scanner line: a 3-wide gate at the axis flanked by chrome barriers, guard consoles behind it
  { const z = CZ + 61; for (let px = -5; px <= 5; px++) { const x = CX + px; if (Math.abs(px) <= 1) continue; if (Math.abs(px) === 2) { bp.fill(x, 1, z, x, 2, z, B.PANEL_STRIPE); bp.set(x, 3, z, BLUE); } else bp.set(x, 1, z, B.IRON_BARS); } bp.fill(CX - 1, 3, z, CX + 1, 3, z, BLUE); }
  guardPost(bp, CX - 4, 1, CZ + 59, 0, 1); guardPost(bp, CX + 4, 1, CZ + 59, 0, 1);
  bp.set(CX - 4, 3, CZ + 58, B.HOLO_SIGN); bp.set(CX + 4, 3, CZ + 58, B.HOLO_SIGN);
  for (const px of [-4, 4]) statue(bp, CX + px, 1, CZ + 65);
  bp.room('security_screening', CX - 5, 1, CZ + rr0, CX + 5, CZ + cr1);
  bp.door(CX, 1, CZ + G.SKIN_R[1], 'S');
  meta.lobby = { x: CX, y: 1, z: CZ + 60 };
  // north: loading dock (bins 57..66, 17 wide, 4 high under the level-6 floor) with a freight arch, crates, a console
  eachSlot(bp, P, rr0, cr1, Math.PI * 1.5, 8, (x, z, along, perp) => { bp.set(x, 0, z, Math.abs(perp) < 2 ? B.PANEL_STRIPE : PLATE); bp.fill(x, 1, z, x, 4, z, AIR); bp.set(x, 5, z, (Math.floor(along) + Math.floor(perp)) % 4 === 0 ? GLOW : DARK); });
  eachSlot(bp, P, G.SKIN_R[0], G.SKIN_R[1] + 1, Math.PI * 1.5, 3.5, (x, z) => { bp.fill(x, 1, z, x, 5, z, AIR); bp.set(x, 6, z, B.PANEL_STRIPE); bp.set(x, 0, z, B.PANEL_STRIPE); });
  for (const px of [-6, -5, 5, 6]) for (const dz of [-60, -59]) { bp.set(CX + px, 1, CZ + dz, B.CRATE); if ((px + dz) % 2) bp.set(CX + px, 2, CZ + dz, B.CRATE); }
  bp.set(CX - 7, 1, CZ - 61, B.BARREL); bp.set(CX + 7, 1, CZ - 61, B.BARREL);
  bp.set(CX - 3, 1, CZ - 58, B.PANEL_BLACK); bp.set(CX - 3, 2, CZ - 58, B.CONSOLE); bp.work(CX - 3, 1, CZ - 57, 'stock');
  guardPost(bp, CX + 3, 1, CZ - 58, 0, 1);
  bp.room('loading_dock_storage', CX - 8, 1, CZ - cr1, CX + 8, CZ - rr0);
  bp.door(CX, 1, CZ - G.SKIN_R[1], 'N');
  // east (press) and west (diplomatic) entries: an arch (6 wide, 6 high) into the lobby ring, guard kiosks, holo signs
  for (const [c, kind] of [[0, 'vestibule'], [Math.PI, 'diplomatic_vestibule']]) {
    const ux = Math.cos(c);
    // (the arch's top row is a balustrade: the level-6 corridor runs past the opening five blocks up)
    eachSlot(bp, P, G.SKIN_R[0], G.SKIN_R[1] + 1, c, 3.5, (x, z) => { bp.fill(x, 1, z, x, 5, z, AIR); bp.set(x, 6, z, B.IRON_BARS); bp.set(x, 7, z, GLOW); bp.set(x, 0, z, GOLD); });
    eachSlot(bp, P, G.SKIN_R[0], G.SKIN_R[1] + 1, c, 4.5, (x, z, along, perp) => { if (Math.abs(perp) > 3.5) { bp.fill(x, 1, z, x, 8, z, TRIM); bp.set(x, 9, z, BLUE); } });
    const gx = Math.round(CX + ux * 64);
    guardPost(bp, gx, 1, CZ - 5, 0, 1); guardPost(bp, gx, 1, CZ + 5, 0, -1);
    bp.set(Math.round(CX + ux * 62), 3, CZ - 3, B.HOLO_SIGN); bp.set(Math.round(CX + ux * 62), 3, CZ + 3, B.HOLO_SIGN);
    bp.room(kind, Math.round(CX + ux * 66) - (ux > 0 ? 8 : 0), 1, CZ - 6, Math.round(CX + ux * 66) + (ux > 0 ? 0 : 8), CZ + 6);
    bp.door(Math.round(CX + ux * G.SKIN_R[1]), 1, CZ, ux > 0 ? 'E' : 'W');
  }
  // the grand lobby ring is registered as four quadrant rooms (one per cardinal arc between the entrances)
  for (let q = 0; q < 4; q++) {
    const a = CARDINALS[q] + Math.PI / 4, [x, z] = cellOf(61.5, a);
    bp.room('grand_lobby', x - 14, 1, z - 14, x + 14, z + 14);
  }
}

// ------------------------------------------------------------------------------------------------ approach
// forecourt paving, the processional avenue (colonnades, statue plinths, guard posts, gate pylons), the boulevard
// gate deck on twin stalks with its lift and stair tower, corner shuttle pads, the VIP platform, lamps
function approaches(bp, P, lot, meta) {
  const dx = lot.door.x - lot.x0;   // 83
  for (let x = 0; x < bp.w; x++) for (let z = 0; z < bp.d; z++) if (P.bin[P.at(x, z)] > G.R_DRUM) bp.set(x, 0, z, ((x + z) % 6 === 0) ? BAND : ((x % 12 === 0 || z % 12 === 0) ? STONE : STONE2));
  const zArch = CZ + G.SKIN_R[1] + 1;   // 148: first cell outside the drum on the axis
  // avenue paving: a gold-edged lit spine from the gate to the arch
  for (let z = zArch; z <= bp.d - 2; z++) { for (let x = dx - 6; x <= dx + 6; x++) bp.set(x, 0, z, (x === dx - 6 || x === dx + 6) ? GOLD : ((z % 4 === 0 && Math.abs(x - dx) <= 1) ? GLOW : STONE)); }
  // colonnades: chrome columns with lit capitals every four blocks, a chrome beam over them; statue plinths outside
  for (let z = zArch + 2; z <= bp.d - 4; z += 4) for (const sx of [dx - 8, dx + 8]) { bp.fill(sx, 1, z, sx, 6, z, TRIM); bp.set(sx, 7, z, GLOW); }
  for (const sx of [dx - 8, dx + 8]) bp.fill(sx, 8, zArch + 2, sx, 8, bp.d - 4, DARK);
  // statues flank the arch mouth and repeat every eight blocks; the rhythm stops short of the gate deck's lift shaft
  for (let z = zArch; z <= bp.d - 10; z += 8) for (const sx of [dx - 12, dx + 12]) { bp.fill(sx - 1, 1, z - 1, sx + 1, 1, z + 1, STONE); statue(bp, sx, 2, z); }
  for (let z = zArch + 4; z <= bp.d - 6; z += 8) for (const sx of [dx - 12, dx + 12]) if (isFree(bp, sx, 1, z) && isFree(bp, sx, 4, z)) lamp(bp, sx, 1, z, 3, B.CITY_LAMP);
  // Senate Guard posts: kiosks at the arch and at the gate
  guardPost(bp, dx - 5, 1, zArch + 1, 1, 0); guardPost(bp, dx + 5, 1, zArch + 1, -1, 0);
  guardPost(bp, dx - 4, 1, bp.d - 4, 1, 0); guardPost(bp, dx + 4, 1, bp.d - 4, -1, 0);
  // gate pylons
  for (const px of [dx - 7, dx + 7]) { bp.fill(px - 1, 1, bp.d - 2, px + 1, 9, bp.d - 1, TRIM); bp.fill(px, 3, bp.d - 1, px, 8, bp.d - 1, GLOW); bp.set(px, 10, bp.d - 1, BLUE); }
  bp.door(dx, 1, bp.d - 1, 'S');
  // the boulevard gate deck: y 35 slab spanning the avenue at the lot's south end on twin stalks, canopy, benches
  const deckZ0 = bp.d - 12, deckZ1 = bp.d - 1;
  for (const sx of [dx - 10, dx + 10]) { bp.fill(sx - 1, 1, deckZ0 + 3, sx + 1, 34, deckZ0 + 5, DARK); bp.fill(sx, 1, deckZ0 + 4, sx, 34, deckZ0 + 4, TRIM); for (let y = 4; y <= 32; y += 4) bp.fill(sx - 1, y, deckZ0 + 3, sx + 1, y, deckZ0 + 5, BLUE); }
  bp.fill(dx - 11, 35, deckZ0, dx + 11, 35, deckZ1, PLATE);
  for (let x = dx - 11; x <= dx + 11; x++) for (let z = deckZ0; z <= deckZ1; z++) if ((x + z) % 4 === 0) bp.set(x, 35, z, GLOW);
  bp.fill(dx - 11, 36, deckZ0, dx + 11, 40, deckZ1, AIR);
  bp.fill(dx - 11, 36, deckZ0, dx - 11, 36, deckZ1, B.IRON_BARS); bp.fill(dx + 11, 36, deckZ0, dx + 11, 36, deckZ1, B.IRON_BARS);
  bp.fill(dx - 11, 36, deckZ0, dx + 11, 36, deckZ0, B.IRON_BARS);
  bp.fill(dx - 3, 36, deckZ1, dx + 3, 39, deckZ1, AIR);   // the bridge mouth
  bp.fill(dx - 9, 41, deckZ0 + 2, dx + 9, 41, deckZ1 - 2, GLASS); for (let x = dx - 9; x <= dx + 9; x += 3) bp.set(x, 41, deckZ0 + 5, GLOW);
  for (const sx of [dx - 9, dx + 9]) bp.fill(sx, 36, deckZ0 + 2, sx, 40, deckZ0 + 2, TRIM);
  for (const sx of [dx - 6, dx - 3, dx + 3, dx + 6]) { bp.set(sx, 36, deckZ0 + 2, SEAT); bp.spot(sx, 36, deckZ0 + 2, 'seat'); }
  bp.set(dx, 36, deckZ0 + 1, B.PANEL_BLACK); bp.set(dx, 37, deckZ0 + 1, B.HOLO_SIGN); bp.work(dx + 1, 36, deckZ0 + 1, 'guard');
  bp.door(dx, 36, deckZ1, 'S');
  // lift from the deck to the forecourt (east end) and the stair tower (west end) joined by a bridge
  liftShaft(bp, dx + 13, deckZ0 + 4, 1, 36); liftDoor(bp, dx + 13, deckZ0 + 4, 1, 'N'); liftDoor(bp, dx + 13, deckZ0 + 4, 36, 'W');
  bp.fill(dx + 12, 0, deckZ0 + 2, dx + 14, 0, deckZ0 + 3, PLATE);
  const tx0 = dx - 22, tz0 = deckZ0 - 2;   // stair tower 8 x 12
  bp.fill(tx0, 1, tz0, tx0 + 7, 36, tz0 + 11, STONE);
  bp.fill(tx0 + 1, 1, tz0 + 1, tx0 + 6, 35, tz0 + 10, AIR);
  bp.walls(tx0, 1, tz0, tx0 + 7, 36, tz0 + 11, STONE);
  for (let y = 4; y <= 34; y += 5) for (let z = tz0 + 2; z <= tz0 + 9; z += 3) { bp.set(tx0, y, z, B.WINDOW_LIT); bp.set(tx0 + 7, y, z, B.WINDOW_LIT); }
  let level = 1;
  for (let f = 0; f < 7; f++) {
    const east = f % 2 === 0, x0 = east ? tx0 + 1 : tx0 + 5;
    stairRun(bp, x0, east ? tz0 + 1 : tz0 + 10, 0, east ? 1 : -1, level, 5, 2, DARK, STONE, SEAT);
    level += 5;
    bp.fill(tx0 + 1, level - 1, east ? tz0 + 9 : tz0 + 1, tx0 + 6, level - 1, east ? tz0 + 10 : tz0 + 2, PLATE);   // landing spans the width
    bp.fill(tx0 + 1, level, east ? tz0 + 9 : tz0 + 1, tx0 + 6, level + 3, east ? tz0 + 10 : tz0 + 2, AIR);
    bp.set(tx0 + 3, level + 3, east ? tz0 + 10 : tz0 + 1, GLOW);
  }
  bp.fill(tx0 + 1, 35, tz0 + 1, tx0 + 6, 35, tz0 + 10, PLATE); bp.fill(tx0 + 1, 36, tz0 + 1, tx0 + 6, 39, tz0 + 10, AIR); bp.fill(tx0, 37, tz0, tx0 + 7, 40, tz0 + 11, AIR); bp.set(tx0 + 3, 40, tz0 + 5, GLOW);
  bp.fill(tx0 + 7, 35, tz0 + 5, dx - 12, 35, tz0 + 6, PLATE); bp.fill(tx0 + 7, 36, tz0 + 5, dx - 12, 39, tz0 + 6, AIR);
  bp.fill(tx0 + 8, 36, tz0 + 4, dx - 12, 36, tz0 + 4, B.IRON_BARS); bp.fill(tx0 + 8, 36, tz0 + 7, dx - 12, 36, tz0 + 7, B.IRON_BARS);
  bp.fill(dx - 11, 36, tz0 + 5, dx - 11, 39, tz0 + 6, AIR);
  bp.fill(tx0 + 7, 1, tz0 + 5, tx0 + 7, 3, tz0 + 6, AIR); bp.set(tx0 + 7, 4, tz0 + 5, GLOW); bp.set(tx0 + 3, 4, tz0 + 5, GLOW);
  bp.room('stair_tower', tx0, 1, tz0, tx0 + 7, tz0 + 11);
  meta.deck = { x: dx, y: 36, z: deckZ0 + 6 };
  // corner shuttle pads (north-west, north-east): raised platforms with markings, lamps, stairs and a parked shuttle
  for (const [cx, cz] of [[14, 14], [bp.w - 15, 14]]) {
    bp.fill(cx - 12, 1, cz - 12, cx + 12, 5, cz + 12, DARK);
    bp.fill(cx - 11, 1, cz - 11, cx + 11, 5, cz + 11, STONE);
    for (let x = cx - 12; x <= cx + 12; x++) for (let z = cz - 12; z <= cz + 12; z++) { const r = Math.hypot(x - cx, z - cz); bp.set(x, 6, z, r > 10.5 && r <= 11.5 ? B.PANEL_STRIPE : r <= 1.2 ? GLOW : ((x === cx || z === cz) && r < 9) ? GLOW : PLATE); }
    for (const [lx, lz] of [[cx - 11, cz - 11], [cx + 11, cz - 11], [cx - 11, cz + 11], [cx + 11, cz + 11]]) lamp(bp, lx, 7, lz, 2, B.CITY_LAMP);
    stairRun(bp, cx - 1, cz + 13 + 9, 0, -1, 1, 6, 2, DARK, STONE, SEAT);   // 12 cells from z cz+22 down to cz+11 (rise 6)
    bp.fill(cx - 6, 7, cz - 2, cx + 6, 9, cz + 2, B.DURASTEEL); bp.fill(cx - 5, 8, cz - 1, cx + 5, 8, cz + 1, AIR);
    bp.fill(cx + 6, 8, cz - 1, cx + 7, 9, cz + 1, GLASS); bp.fill(cx - 8, 7, cz - 1, cx - 7, 8, cz + 1, DARK); bp.set(cx - 9, 7, cz, BLUE);
    bp.fill(cx - 3, 10, cz - 6, cx + 2, 10, cz - 3, TRIM); bp.fill(cx - 3, 10, cz + 3, cx + 2, 10, cz + 6, TRIM);
    bp.fill(cx - 3, 11, cz - 6, cx + 2, 13, cz - 6, B.DURASTEEL); bp.fill(cx - 3, 11, cz + 6, cx + 2, 13, cz + 6, B.DURASTEEL);
    bp.room('landing_pad', cx - 12, 7, cz - 12, cx + 12, cz + 12);
    bp.spot(cx - 8, 7, cz + 8, 'stand'); bp.work(cx + 8, 7, cz + 8, 'deck officer');
  }
  // the VIP arrival platform (south-east corner): a raised disc with a marked reception line and a canopy
  { const cx = bp.w - 16, cz = bp.d - 16;
    for (let x = cx - 13; x <= cx + 13; x++) for (let z = cz - 13; z <= cz + 13; z++) { const r = Math.hypot(x - cx, z - cz); if (r > 13) continue; bp.fill(x, 1, z, x, 3, z, r > 12 ? TRIM : STONE); bp.set(x, 4, z, r > 12 ? B.IRON_BARS : (z === cz && x < cx ? B.RED_WOOL : (Math.round(r) % 4 === 0 ? GLOW : STONE))); }
    for (let x = cx - 10; x < cx - 2; x += 2) { bp.spot(x, 4, cz - 1, 'stand'); bp.spot(x, 4, cz + 1, 'stand'); }
    bp.work(cx + 2, 4, cz, 'guard'); bp.set(cx + 3, 4, cz, B.PANEL_BLACK); bp.set(cx + 3, 5, cz, B.HOLO_SIGN);
    for (const [px, pz] of [[cx - 8, cz - 8], [cx + 8, cz - 8], [cx - 8, cz + 8], [cx + 8, cz + 8]]) lamp(bp, px, 4, pz, 3, B.CITY_LAMP);
    stairRun(bp, cx - 1, cz - 13 - 6, 0, 1, 1, 3, 2, DARK, STONE, SEAT);
    bp.room('vip_landing_platform', cx - 12, 4, cz - 12, cx + 12, cz + 12);
  }
  // forecourt lamps along the lot edges
  for (let x = 6; x < bp.w - 6; x += 20) for (const z of [4, bp.d - 6]) if (P.bin[P.at(x, z)] > G.R_DRUM + 2 && isFree(bp, x, 1, z) && isFree(bp, x, 4, z)) lamp(bp, x, 1, z, 3, B.CITY_LAMP);
  for (let z = 6; z < bp.d - 6; z += 20) for (const x of [4, bp.w - 5]) if (P.bin[P.at(x, z)] > G.R_DRUM + 2 && isFree(bp, x, 1, z) && isFree(bp, x, 4, z)) lamp(bp, x, 1, z, 3, B.CITY_LAMP);
}

// ------------------------------------------------------------------------------------------------ routes / meta
// the two memorable routes as world-coordinate waypoints (test-senate walks each consecutive pair by flood fill)
function routes(bp, meta) {
  const W = (x, y, z) => ({ x: bp.wx(x), y: bp.wy(y), z: bp.wz(z) });
  const dx = CX;
  // plaza gate -> avenue -> arch -> security screening -> grand lobby -> east stairs (four flights, alternating
  // stretches) -> level 21 -> radial flight -> public gallery -> across the gallery ring to the north
  const e = CX + G.CORR_R[0];
  const visitor = [
    W(dx, 1, bp.d - 2), W(dx, 1, bp.d - 14), W(dx, 1, CZ + G.SKIN_R[1] + 3), W(dx, 1, CZ + G.SKIN_R[1]), W(dx, 1, CZ + 62), W(dx, 1, CZ + 58),
    W(CX + 30, 1, CZ + 55), W(e, 1, CZ + 2),
    W(e, 6, CZ + 13), W(e, 11, CZ - 14), W(e, 16, CZ + 13), W(e, 21, CZ - 14),
    W(CX + G.OUT_WALL - 1, 21, CZ + 1), W(CX + G.OUT_WALL - 10, 26, CZ + 1), W(CX + 47, 26, CZ + 1), W(CX, 26, CZ - 47),
  ];
  // loading dock -> freight stores -> service stairs (alternating east / west of the north passage) -> tier-1 service
  // ring -> Kessar's back corridor and pod door -> the pod
  const k = meta.delegations.find((d) => d.id === 'kessar');
  const service = [
    W(dx, 1, CZ - G.SKIN_R[1] - 2), W(dx, 1, CZ - 61), W(dx, 1, CZ - 50), W(meta.freight[0], 1, meta.freight[1]), W(CX + 2, 1, CZ - 64),
    W(CX + 12, 6, CZ - 64), W(CX - 2, 6, CZ - 64), W(CX - 12, 11, CZ - 64), W(CX, 11, CZ - 60), W(CX, 11, CZ - 55),
    W(CX + 40, 11, CZ - 37),   // service ring, quadrant 4 -> 1 via the east slot
  ];
  if (k) service.push({ x: k.suite.podDoor.x, y: k.suite.podDoor.y, z: k.suite.podDoor.z }, { ...k.pod.spot });
  meta.routes = { visitor, service };
}

export const LANDMARK = {
  id: 'senate', name: 'Galactic Senate', span: [3, 3], height: 90, minW: 160, minD: 170,
  build(bp, lot, ctx) {
    const rng = ctx.rng;
    bp.meta.name = 'Galactic Senate';
    PYLON = new Set();
    const P = polar(bp);
    const meta = {};
    ground(bp);
    drumAndDome(bp, P);
    chamber(bp, P, meta);
    bands(bp, P, rng, meta);
    approaches(bp, P, lot, meta);
    routes(bp, meta);
    bp.meta.lobby = { x: bp.wx(meta.lobby.x), y: bp.wy(meta.lobby.y), z: bp.wz(meta.lobby.z) };
    bp.meta.floors = [...G.LEVELS, G.GALLERY_Y, 36].map((y) => bp.y0 + y);
    const W = (p) => ({ x: bp.wx(p.x), y: bp.wy(p.y), z: bp.wz(p.z) });
    bp.meta.senate = {
      centre: { x: bp.wx(CX), z: bp.wz(CZ) }, radius: { hall: G.R_HALL, drum: G.R_DRUM }, levels: G.LEVELS.map((y) => bp.wy(y)), tiers: G.TIERS.map((y) => bp.wy(y)), galleryY: bp.wy(G.GALLERY_Y),
      dais: W(meta.dais), delegations: meta.delegations, liaison: meta.liaison, petition: meta.petition, hearing: meta.hearing, chancellorOffice: meta.chancellorOffice,
      pods: meta.tierPods.map((tp) => tp.map((p) => ({ tier: p.tier, k: p.k, delegation: p.delegation || null, spot: W(p), seats: p.seats.map(W) }))),
      bowlPods: meta.pods.length, routes: meta.routes, stairs: meta.stairs, publicLifts: meta.publicLifts, deck: W(meta.deck),
    };
  },
};
