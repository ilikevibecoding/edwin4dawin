// Galactic Senate (docs/rubrics/06_landmarks.md): a vast low dome on a drum, the Grand Convocation Chamber inside
// (five rising rings of delegate pods around the Chancellor's podium tower), four grand entrances with vestibules
// and security posts, three concourse levels of committee rooms, offices, archives, lounges and a cafeteria in the
// drum, the Chancellor's suite on the gallery level, shuttle pads on the podium, the Avenue of the Core Founders on
// the approach and the Senate landing pavilion that receives the boulevard sky bridge. Pure function of the lot and
// ctx.rng. Local coordinates: x 0..166, z 0..174, y 0 = plateau (repaved), walk level y 1; front = south (+z).
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { Room } from '../rooms/room.js';
import { ROOMS } from '../rooms/index.js';

const AIR = FORCE_AIR;
const CX = 83, CZ = 87;                // dome axis
const R_DRUM = 72;                     // outer radius of the drum / dome base
const R_HALL = 57;                     // hall radius (inside the tiers' back wall at 57)
const R_CORR0 = 58, R_CORR1 = 62;      // inner ring corridor (gallery), 5 wide
const R_ROOM0 = 63, R_ROOM1 = 70;      // outer room band
const DRUM_TOP = 13;                   // drum wall top block; dome starts at 14
const DOME_YC = -26.7, DOME_R = 82.7;  // dome = spherical cap: h(r) = DOME_YC + sqrt(DOME_R^2 - r^2) (56 at the axis, 14 at r 72)
const FLOORS = [1, 6, 11];             // concourse floors (walk levels); 16 = gallery / Chancellor's level
const RINGS = [[18, 23, 1], [25, 31, 4], [33, 39, 6], [41, 48, 9], [50, 56, 11]];   // [inner r, outer r, walk y]
const PODIUM_R = 5, PODIUM_TOP = 12;

const STONE = B.SMOOTH_STONE, STONE2 = B.PLASTER, BAND = B.STONE_BRICKS, TRIM = B.CHROME, PLATE = B.DECK_PLATE;
const DARK = B.DURASTEEL_DARK, GLOW = B.GLOW_PANEL, BLUE = B.GLOW_PANEL_BLUE, GLASS = B.STEEL_GLASS, GOLD = B.GOLD_BLOCK, RED = B.PANEL_RED;

const dist = (x, z) => Math.hypot(x + 0.5 - (CX + 0.5), z + 0.5 - (CZ + 0.5));
const domeH = (r) => DOME_YC + Math.sqrt(Math.max(0, DOME_R * DOME_R - r * r));

function doorway(bp, x0, z0, x1, z1, y0, h = 3, lintel = GLOW) {
  bp.fill(x0, y0, z0, x1, y0 + h - 1, z1, AIR);
  // the threshold and the cells on both sides of it always have a floor and head room (the ring corridor is round,
  // the rooms are square, so a door may otherwise open onto a solid or floorless cell)
  if (z0 === z1) { bp.fill(x0, y0 - 1, z0 - 1, x1, y0 - 1, z0 + 1, PLATE); bp.fill(x0, y0, z0 - 1, x1, y0 + 2, z0 + 1, AIR); }
  else { bp.fill(x0 - 1, y0 - 1, z0, x0 + 1, y0 - 1, z1, PLATE); bp.fill(x0 - 1, y0, z0, x0 + 1, y0 + 2, z1, AIR); }
  if (z0 === z1) { bp.fill(x0 - 1, y0, z0, x0 - 1, y0 + h, z0, TRIM); bp.fill(x1 + 1, y0, z0, x1 + 1, y0 + h, z0, TRIM); bp.fill(x0, y0 + h, z0, x1, y0 + h, z0, lintel); }
  else { bp.fill(x0, y0, z0 - 1, x0, y0 + h, z0 - 1, TRIM); bp.fill(x0, y0, z1 + 1, x0, y0 + h, z1 + 1, TRIM); bp.fill(x0, y0 + h, z0, x0, y0 + h, z1, lintel); }
}
function stairZ(bp, x0, x1, z0, dz, y0, n) {
  for (let k = 1; k <= n * 2; k++) {
    const z = z0 + dz * (k - 1), top = y0 - 1 + k / 2, yTop = Math.floor(top), slab = top !== yTop;
    for (let x = x0; x <= x1; x++) { bp.fill(x, y0 - 1, z, x, yTop - 1, z, DARK); bp.set(x, yTop, z, slab ? B.STONE_BRICK_SLAB : STONE); bp.fill(x, yTop + 1, z, x, yTop + 3, z, AIR); }
  }
}
function stairX(bp, z0, z1, x0, dx, y0, n) {
  for (let k = 1; k <= n * 2; k++) {
    const x = x0 + dx * (k - 1), top = y0 - 1 + k / 2, yTop = Math.floor(top), slab = top !== yTop;
    for (let z = z0; z <= z1; z++) { bp.fill(x, y0 - 1, z, x, yTop - 1, z, DARK); bp.set(x, yTop, z, slab ? B.STONE_BRICK_SLAB : STONE); bp.fill(x, yTop + 1, z, x, yTop + 3, z, AIR); }
  }
}
function liftShaft(bp, x, z, ya, yb) {
  bp.fill(x - 1, ya - 1, z - 1, x + 2, yb + 3, z + 2, B.PANEL_BLACK);
  bp.fill(x, ya, z, x + 1, yb + 2, z + 1, AIR);
  bp.lift(x, z, ya, yb);
}
// opens a lift's side at a walk level toward +z ('S'), -z ('N'), +x ('E') or -x ('W') with a blue marker
function liftDoor(bp, x, z, y, side) {
  if (side === 'S') { bp.fill(x, y, z + 2, x + 1, y + 2, z + 2, AIR); bp.set(x - 1, y + 2, z + 2, BLUE); }
  else if (side === 'N') { bp.fill(x, y, z - 1, x + 1, y + 2, z - 1, AIR); bp.set(x - 1, y + 2, z - 1, BLUE); }
  else if (side === 'E') { bp.fill(x + 2, y, z, x + 2, y + 2, z + 1, AIR); bp.set(x + 2, y + 2, z - 1, BLUE); }
  else { bp.fill(x - 1, y, z, x - 1, y + 2, z + 1, AIR); bp.set(x - 1, y + 2, z - 1, BLUE); }
}
const DRESS = [B.SHELF, B.BOOKSHELF, B.CRATE, B.BARREL, B.CHEST];
function dress(r, rng) {
  for (let u = 1; u < r.w - 1; u += 2) if (r.free(u, r.back) && r.empty(u, 0, r.back) && r.empty(u, 1, r.back)) { const id = rng.pick(DRESS); r.put(u, 0, r.back, id); if (id === B.SHELF || id === B.BOOKSHELF) r.put(u, 1, r.back, id); }
  for (let v = 2; v < r.back; v += 2) for (const u of [0, r.w - 1]) if (r.free(u, v) && r.empty(u, 0, v) && r.empty(u, 1, v)) { if ((u + v) % 3 === 0) r.planter(u, v, (v & 1) ? B.OAK_LEAVES : B.SPRUCE_LEAVES); else { r.put(u, 0, v, B.IRON_BARS); r.put(u, 1, v, B.LANTERN); } }
  if (r.w >= 8 && r.d >= 7) { const cu = r.cu, cv = Math.floor(r.back / 2) + 1; if (r.free(cu, cv) && r.empty(cu, 0, cv)) { r.table(cu, cv); r.table(cu + 1, cv); for (const [du, dv] of [[-1, 0], [2, 0], [0, -1], [1, -1], [0, 1], [1, 1]]) if (r.free(cu + du, cv + dv) && r.empty(cu + du, 0, cv + dv)) r.seat(cu + du, cv + dv); } }
}
function template(bp, rng, name, kind, x0, z0, x1, z1, y, side, doorU, doorW = 2, h = 4) {
  const r = new Room(bp, { x0, z0, x1, z1, y, h, side, doorU, doorW }, kind, {});
  (ROOMS[name] || ROOMS.storage).fn(r, rng, {});
  dress(r, rng); r.ceilingLights(4); r.finalize();
  bp.room(kind, x0 - 1, y, z0 - 1, x1 + 1, z1 + 1);
}
function hollow(bp, x0, y0, z0, x1, y1, z1, wall, floor, ceil) {
  bp.fill(x0, y0 - 1, z0, x1, y0 - 1, z1, floor); bp.fill(x0, y0, z0, x1, y1, z1, AIR); bp.fill(x0, y1 + 1, z0, x1, y1 + 1, z1, ceil); bp.walls(x0, y0, z0, x1, y1, z1, wall);
}
function statue(bp, x, y, z) { bp.fill(x, y, z, x, y + 1, z, STONE); bp.fill(x, y + 2, z, x, y + 5, z, GOLD); bp.set(x, y + 6, z, STONE); bp.set(x, y + 7, z, GLOW); }
function lamp(bp, x, y, z, h = 2, id = B.LANTERN) { bp.fill(x, y, z, x, y + h - 1, z, B.IRON_BARS); bp.set(x, y + h, z, id); }

// ------------------------------------------------------------------------------------------------ massing
// drum (r <= 72, y 1..13) and the dome shell above it, with ribs every 22.5 degrees and a lit oculus disc
function drumAndDome(bp) {
  const yMax = Math.ceil(domeH(0)) + 2;
  for (let x = CX - R_DRUM - 1; x <= CX + R_DRUM + 1; x++) for (let z = CZ - R_DRUM - 1; z <= CZ + R_DRUM + 1; z++) {
    const r = dist(x, z);
    if (r > R_DRUM + 0.5) continue;
    // drum: solid stone (rooms are carved later); outer skin dressed with pilasters, bands and window slits
    bp.fill(x, 1, z, x, DRUM_TOP, z, STONE);
    if (r > R_DRUM - 1) {
      const a = Math.atan2(z + 0.5 - (CZ + 0.5), x + 0.5 - (CX + 0.5));
      const seg = Math.round(((a + Math.PI) / (Math.PI * 2)) * 96) % 96;
      for (let y = 1; y <= DRUM_TOP; y++) {
        let id = STONE2;
        if (y === 1 || y === 2 || y === DRUM_TOP) id = BAND;
        else if (seg % 4 === 0) id = STONE;
        else if (y % 5 === 3 || y % 5 === 4) id = (seg & 1) ? B.WINDOW_LIT : B.WINDOW_DARK;
        bp.set(x, y, z, id);
      }
    }
    // dome shell: two blocks thick along the cap surface
    const h = domeH(r);
    if (r <= R_DRUM) {
      const yo = Math.round(h), yi = Math.round(domeH(r + 2.2));
      const a = Math.atan2(z + 0.5 - (CZ + 0.5), x + 0.5 - (CX + 0.5));
      const rib = Math.abs((((a / (Math.PI * 2)) * 16 + 16.5) % 1) - 0.5) < (r > 40 ? 0.04 : 0.07) && r > 10;
      const ring = Math.abs(h - Math.round(h)) < 0.02 && Math.round(h) % 8 === 0;
      for (let y = Math.max(DRUM_TOP + 1, Math.min(yi, yo)); y <= Math.max(yo, yMax > yo ? yo : yMax); y++) {
        // outer surface: grey cap with dark ribs and stone rings; inner surface (the chamber ceiling): dark with
        // the ribs carried through as radiating glow lines
        const outer = y === yo;
        let id = outer ? B.DURASTEEL : B.PANEL_BLACK;
        if (rib) id = (y % 4 === 0) ? GLOW : (outer ? DARK : TRIM); else if (ring && outer) id = BAND;
        if (outer && r > R_DRUM - 6 && (y - DRUM_TOP) % 3 === 1) id = (Math.round(a * 30) & 1) ? B.WINDOW_LIT : STONE2;
        bp.set(x, y, z, id);
      }
      // the oculus: a lit chrome disc on the crown
      if (r <= 12) { const yt = Math.round(domeH(0)); bp.set(x, yt, z, r <= 8 ? GLOW : TRIM); bp.set(x, yt + 1, z, r <= 10 ? (r <= 8 ? GLOW : TRIM) : AIR); }
    }
  }
  // crown spire / antenna
  const yt = Math.round(domeH(0));
  bp.fill(CX - 1, yt + 2, CZ - 1, CX, yt + 12, CZ, TRIM);
  bp.fill(CX - 3, yt + 2, CZ - 3, CX + 2, yt + 3, CZ + 2, DARK);
  bp.set(CX - 1, yt + 13, CZ - 1, BLUE); bp.set(CX, yt + 13, CZ, BLUE);
}

// the Grand Convocation Chamber: pit floor, five rising rings of pods, radial stairs, the podium tower
function chamber(bp, rng) {
  // carve the hall up to the dome's inner surface
  for (let x = CX - R_HALL - 1; x <= CX + R_HALL + 1; x++) for (let z = CZ - R_HALL - 1; z <= CZ + R_HALL + 1; z++) {
    const r = dist(x, z);
    if (r > R_HALL) continue;
    const top = Math.round(domeH(r + 2.2)) - 1;
    bp.fill(x, 1, z, x, top, z, AIR);
    bp.set(x, 0, z, (Math.floor(r) % 4 === 0) ? B.PANEL_BLACK : (r < PODIUM_R + 2 ? GLOW : STONE));
    // dome ceiling lights above the hall (every 6th cell on the inner surface)
    if (x % 6 === 0 && z % 6 === 0 && r > 6) bp.set(x, top + 1, z, GLOW);
  }
  // tiers: each ring is a stepped platform with a pod every 6 blocks (console + two seats), railing at the inner edge
  for (let i = 0; i < RINGS.length; i++) {
    const [r0, r1, y] = RINGS[i];
    for (let x = CX - r1 - 1; x <= CX + r1 + 1; x++) for (let z = CZ - r1 - 1; z <= CZ + r1 + 1; z++) {
      const r = dist(x, z);
      if (r < r0 || r > R_HALL) continue;
      // solid step under the ring, floor at y - 1
      bp.fill(x, 1, z, x, y - 1, z, r > r1 ? STONE : (Math.floor(r) === r0 ? B.PANEL_BLACK : STONE));
      if (r > r1) continue;
      const a = Math.atan2(z + 0.5 - (CZ + 0.5), x + 0.5 - (CX + 0.5));
      const podN = Math.round(r0 * 1.05), pod = ((a + Math.PI) / (Math.PI * 2)) * podN, frac = pod % 1;
      const divider = frac < 0.12;
      if (r < r0 + 1) { bp.set(x, y, z, divider ? TRIM : B.IRON_BARS); continue; }   // railing / pod fronts
      if (divider) { bp.set(x, y, z, TRIM); if (r > r1 - 1.5) bp.set(x, y + 1, z, GLOW); continue; }
      if (r < r0 + 2 && frac > 0.3 && frac < 0.7) { bp.set(x, y, z, B.CONSOLE); continue; }          // pod console
      if (r > r0 + 2 && r < r0 + 3.5 && (frac > 0.25 && frac < 0.4 || frac > 0.6 && frac < 0.75)) { bp.set(x, y, z, B.STONE_BRICK_SLAB); bp.spot(x, y, z, 'seat'); }
      if (r > r1 - 1 && frac > 0.45 && frac < 0.55) { bp.set(x, y, z, B.IRON_BARS); bp.set(x, y + 1, z, B.LANTERN); }
    }
  }
  // repulsorpod balconies stacked up the hall wall above the tiers: four rings of pods hanging off the wall (base slab,
  // console at the inner lip, two seats, chrome rail, a glow strip underneath) so the chamber reads as a wall of pods
  for (const yy of [15, 19, 23, 27]) {
    const n = 40 - (yy - 15) / 4 * 4, ra = R_HALL - 3.5, rb = R_HALL - 0.5;
    for (let x = CX - R_HALL - 1; x <= CX + R_HALL + 1; x++) for (let z = CZ - R_HALL - 1; z <= CZ + R_HALL + 1; z++) {
      const r = dist(x, z);
      if (r < ra || r > rb) continue;
      const top = Math.round(domeH(r + 2.2)) - 1;
      if (top < yy + 3) continue;
      const a = Math.atan2(z + 0.5 - (CZ + 0.5), x + 0.5 - (CX + 0.5));
      const pod = ((a + Math.PI) / (Math.PI * 2)) * n, frac = pod % 1;
      if (frac < 0.18 || frac > 0.82) continue;                        // gaps between pods
      bp.set(x, yy - 1, z, (frac > 0.3 && frac < 0.7) ? B.PANEL_BLACK : TRIM);
      bp.set(x, yy - 2, z, (frac > 0.4 && frac < 0.6 && r > rb - 1.5) ? GLOW : DARK);
      if (r < ra + 1) { bp.set(x, yy, z, (frac > 0.35 && frac < 0.65) ? B.CONSOLE : TRIM); continue; }
      if (r < ra + 2.2 && (frac > 0.25 && frac < 0.4 || frac > 0.6 && frac < 0.75)) { bp.set(x, yy, z, B.STONE_BRICK_SLAB); bp.spot(x, yy, z, 'seat'); }
    }
  }
  // radial stairs at eight angles, cutting through the ring steps (2 wide, from y 1 in the pit up to ring 4)
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + Math.PI / 8;
    const ux = Math.cos(a), uz = Math.sin(a);
    for (let r = RINGS[0][0] - 1; r <= RINGS[4][1] + 1; r += 0.5) {
      const y = tierY(r);
      for (const off of [-0.7, 0.7]) {
        const x = Math.round(CX + ux * r - uz * off), z = Math.round(CZ + uz * r + ux * off);
        const yTop = Math.floor(y), slab = y !== yTop;
        bp.fill(x, 1, z, x, yTop - 1, z, DARK);
        bp.set(x, yTop, z, slab ? B.STONE_BRICK_SLAB : STONE);
        bp.fill(x, yTop + 1, z, x, yTop + 3, z, AIR);
      }
    }
  }
  // podium tower: chrome/black column with the Chancellor's dais on top, lift inside, holo table, seats
  for (let x = CX - PODIUM_R - 1; x <= CX + PODIUM_R + 1; x++) for (let z = CZ - PODIUM_R - 1; z <= CZ + PODIUM_R + 1; z++) {
    const r = dist(x, z);
    if (r > PODIUM_R) continue;
    bp.fill(x, 1, z, x, PODIUM_TOP, z, r > PODIUM_R - 1 ? (Math.round(r * 3) % 2 ? B.PANEL_BLACK : TRIM) : DARK);
    bp.set(x, PODIUM_TOP + 1, z, r > PODIUM_R - 1 ? B.IRON_BARS : (r < 1.5 ? GLOW : B.PANEL_BLACK));
  }
  for (let y = 3; y <= PODIUM_TOP; y += 3) for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; bp.set(Math.round(CX + Math.cos(a) * (PODIUM_R - 0.3)), y, Math.round(CZ + Math.sin(a) * (PODIUM_R - 0.3)), BLUE); }
  const dy = PODIUM_TOP + 2;   // dais walk level
  bp.set(CX + 2, dy, CZ, B.CONSOLE); bp.set(CX + 2, dy, CZ + 1, B.HOLO_SIGN);
  for (const [dx, dz] of [[-2, -1], [-2, 1], [0, -3], [0, 2]]) { bp.set(CX + dx, dy, CZ + dz, B.STONE_BRICK_SLAB); bp.spot(CX + dx, dy, CZ + dz, 'seat'); }
  bp.work(CX + 1, dy, CZ, 'chancellor');
  liftShaft(bp, CX - 1, CZ - 1, 1, dy);
  liftDoor(bp, CX - 1, CZ - 1, 1, 'S'); liftDoor(bp, CX - 1, CZ - 1, dy, 'S');
  bp.fill(CX - 1, 1, CZ + 1, CX, 3, CZ + PODIUM_R + 1, AIR); bp.fill(CX - 1, 0, CZ + 1, CX, 0, CZ + PODIUM_R + 1, PLATE);
  bp.set(CX - 2, 3, CZ + PODIUM_R, GLOW); bp.set(CX + 1, 3, CZ + PODIUM_R, GLOW);
  bp.fill(CX - 1, dy - 1, CZ - 1, CX, dy - 1, CZ, PLATE);
  bp.room('convocation_chamber', CX - R_HALL, 1, CZ - R_HALL, CX + R_HALL, CZ + R_HALL);
  bp.room('chancellor_podium', CX - PODIUM_R, dy, CZ - PODIUM_R, CX + PODIUM_R, CZ + PODIUM_R);
  // entrance tunnels under the tiers from the four cardinal vestibules to the pit (3 wide, 4 high, lit)
  for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    for (let r = RINGS[0][0] - 2; r <= R_HALL + 1; r++) {
      const x = CX + dx * r, z = CZ + dz * r;
      if (dx) { bp.fill(x, 1, z - 1, x, 4, z + 2, AIR); bp.fill(x, 5, z - 1, x, 5, z + 2, r % 3 ? BAND : GLOW); bp.fill(x, 0, z - 1, x, 0, z + 2, STONE); }
      else { bp.fill(x - 1, 1, z, x + 2, 4, z, AIR); bp.fill(x - 1, 5, z, x + 2, 5, z, r % 3 ? BAND : GLOW); bp.fill(x - 1, 0, z, x + 2, 0, z, STONE); }
    }
  }
}
// walk height of the tier surface at radius r (for the radial stairs): flat on a ring, stepping between rings
function tierY(r) {
  for (let i = 0; i < RINGS.length; i++) {
    const [r0, r1, y] = RINGS[i];
    if (r < r0) { const prevY = i === 0 ? 1 : RINGS[i - 1][2], prevR1 = i === 0 ? r0 - 3 : RINGS[i - 1][1]; const t = Math.max(0, Math.min(1, (r - prevR1) / (r0 - prevR1))); return prevY + Math.round(t * (y - prevY) * 2) / 2; }
    if (r <= r1) return y;
  }
  return RINGS[4][2];
}

// concourse: inner ring corridor at every floor, outer room band with rooms at the cardinal straights, lounges at the
// diagonals, four vestibules, four lifts, stairs, the gallery level with the Chancellor's suite
function concourse(bp, rng) {
  const levels = [1, 6, 11, 16];
  for (let li = levels.length - 1; li >= 0; li--) {
    const y = levels[li];
    // ring corridor r 58..61 (gallery at 16 open to the hall)
    for (let x = CX - R_CORR1 - 2; x <= CX + R_CORR1 + 2; x++) for (let z = CZ - R_CORR1 - 2; z <= CZ + R_CORR1 + 2; z++) {
      const r = dist(x, z);
      if (r < R_CORR0 - 1 || r > R_CORR1 + 0.75) continue;
      if (r < R_CORR0) { if (y === 16) { bp.set(x, y, z, B.IRON_BARS); bp.fill(x, y - 1, z, x, y - 1, z, TRIM); } continue; }   // inner wall / gallery railing
      bp.set(x, y - 1, z, (Math.floor(r) === R_CORR0 || Math.floor(r) === R_CORR1) ? B.PANEL_BLACK : PLATE);
      bp.fill(x, y, z, x, y + 3, z, AIR);
      if (y < 16) bp.set(x, y + 4, z, ((x + z) % 5 === 0) ? GLOW : STONE);
      else if (Math.round(domeH(r + 2.2)) - 1 <= y + 4) bp.set(x, y + 4, z, GLOW);
    }
    if (y === 16) for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; lamp(bp, Math.round(CX + Math.cos(a) * 59.5), 16, Math.round(CZ + Math.sin(a) * 59.5), 2, B.LANTERN); }
    // gallery opens onto the hall above ring 4 (railing already placed); lower levels are walled from the tiers
    if (y === 11) for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const ax = CX + dx * (R_CORR0 - 1), az = CZ + dz * (R_CORR0 - 1); if (dx) bp.fill(ax, y, az - 2, ax, y + 3, az + 2, AIR); else bp.fill(ax - 2, y, az, ax + 2, y + 3, az, AIR); }
    if (y < 16) {
      // rooms in the outer band at the four cardinal straights: three 10x8 rooms per band, doors toward the corridor
      const roomKinds = [['meeting_room', 'executive_office', 'archive'], ['cafeteria', 'kitchen', 'lounge'], ['library', 'meeting_room', 'holo_theatre'], ['open_plan_office', 'executive_office', 'server_room']];
      const rOut = y === 11 ? R_ROOM1 - 3 : R_ROOM1;   // the top floor stays under the dome's slope
      const bands = [
        { side: 'N', x0: CX - 16, x1: CX + 16, z0: CZ + R_ROOM0, z1: CZ + rOut },   // south band (door on its north side toward the corridor)
        { side: 'S', x0: CX - 16, x1: CX + 16, z0: CZ - rOut, z1: CZ - R_ROOM0 },   // north band
        { side: 'W', x0: CX + R_ROOM0, x1: CX + rOut, z0: CZ - 16, z1: CZ + 16 },   // east band
        { side: 'E', x0: CX - rOut, x1: CX - R_ROOM0, z0: CZ - 16, z1: CZ + 16 },   // west band
      ];
      bands.forEach((b, bi) => {
        const alongX = b.side === 'N' || b.side === 'S';
        const kinds = roomKinds[(bi + li) % roomKinds.length];
        for (let s = 0; s < 3; s++) {
          const u0 = (alongX ? b.x0 : b.z0) + s * 11, u1 = u0 + 9;
          const rx0 = alongX ? u0 : b.x0 + 1, rx1 = alongX ? u1 : b.x1 - 1, rz0 = alongX ? b.z0 + 1 : u0, rz1 = alongX ? b.z1 - 1 : u1;
          // the middle slot of every band on the ground floor is the entrance vestibule (double height: the slot
          // above it stays open); the north band at y 11 is the Chancellor's suite
          if (y === 1 && s === 1) { vestibule(bp, rng, b, rx0, rz0, rx1, rz1); continue; }
          if (y === 6 && s === 1) continue;
          if (y === 11 && b.side === 'S') continue;
          hollow(bp, rx0 - 1, y, rz0 - 1, rx1 + 1, y + 3, rz1 + 1, STONE, y === 1 ? STONE : PLATE, STONE);
          const kind = kinds[s % kinds.length];
          template(bp, rng, kind, kind, rx0, rz0, rx1, rz1, y, b.side, 3, 2);
          if (b.side === 'N') doorway(bp, rx0 + 3, rz0 - 1, rx0 + 4, rz0 - 1, y);
          else if (b.side === 'S') doorway(bp, rx0 + 3, rz1 + 1, rx0 + 4, rz1 + 1, y);
          else if (b.side === 'W') doorway(bp, rx0 - 1, rz0 + 3, rx0 - 1, rz0 + 4, y);
          else doorway(bp, rx1 + 1, rz0 + 3, rx1 + 1, rz0 + 4, y);
        }
      });
      // diagonal lounges: open bays between the bands with benches, planters, holo pylons and windows
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + k * Math.PI / 2;
        for (let t = -0.28; t <= 0.28; t += 0.035) {
          const ang = a + t;
          for (let r = R_ROOM0; r <= rOut - 1; r++) {
            const x = Math.round(CX + Math.cos(ang) * r), z = Math.round(CZ + Math.sin(ang) * r);
            if (dist(x, z) > rOut - 0.5) continue;
            bp.set(x, y - 1, z, (r % 3 === 0) ? B.PANEL_BLACK : PLATE);
            bp.fill(x, y, z, x, y + 3, z, AIR);
            bp.set(x, y + 4, z, ((x + z) % 4 === 0) ? GLOW : STONE);
          }
        }
        // furnishing along the bay
        for (let j = -2; j <= 2; j++) {
          const ang = a + j * 0.09;
          const bx = Math.round(CX + Math.cos(ang) * 65), bz = Math.round(CZ + Math.sin(ang) * 65);
          if (j % 2 === 0) { bp.set(bx, y, bz, B.STONE_BRICK_SLAB); bp.spot(bx, y, bz, 'seat'); }
          else { bp.set(bx, y, bz, DARK); bp.set(bx, y + 1, bz, B.OAK_LEAVES); }
          const px = Math.round(CX + Math.cos(ang) * (rOut - 1.5)), pz = Math.round(CZ + Math.sin(ang) * (rOut - 1.5));
          if (j === 0) { bp.set(px, y, pz, B.PANEL_BLACK); bp.set(px, y + 1, pz, B.HOLO_SIGN); bp.set(px, y + 2, pz, B.HOLO_SIGN); }
          else if (Math.abs(j) === 2) lamp(bp, px, y, pz, 2, B.LANTERN);
        }
        const lx = Math.round(CX + Math.cos(a) * 64), lz = Math.round(CZ + Math.sin(a) * 64);
        bp.room('senators_lounge', lx - 6, y, lz - 6, lx + 6, lz + 6);
      }
    }
  }
  // Chancellor's suite on the gallery level (north): red walls and carpet, curved window wall in the dome, statues
  chancellorSuite(bp, rng);
  // lifts at the four diagonals (in the corridor's outer wall), doors on every level
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + k * Math.PI / 2;
    const lx = Math.round(CX + Math.cos(a) * 63) - 1, lz = Math.round(CZ + Math.sin(a) * 63) - 1;
    liftShaft(bp, lx, lz, 1, 16);
    for (const y of levels) { const side = Math.cos(a) > 0 ? 'W' : 'E'; liftDoor(bp, lx, lz, y, side); }
  }
  // stairs between the levels in the corridor at the four half-diagonals (2 wide, slab flights along the ring)
  for (const y of [1, 6, 11]) {
    // east side: from z CZ+5 southward; west side: from z CZ-5 northward (the corridor is straight at the cardinals)
    stairZ(bp, CX + R_CORR0, CX + R_CORR0 + 1, CZ + 5, 1, y, 5);
    bp.fill(CX + R_CORR0, y + 5, CZ + 15, CX + R_CORR0 + 1, y + 8, CZ + 17, AIR);
    stairZ(bp, CX - R_CORR0 - 1, CX - R_CORR0, CZ - 5, -1, y, 5);
    bp.fill(CX - R_CORR0 - 1, y + 5, CZ - 17, CX - R_CORR0, y + 8, CZ - 15, AIR);
    bp.set(CX + R_CORR0 + 2, y + 4, CZ + 10, GLOW); bp.set(CX - R_CORR0 - 2, y + 4, CZ - 10, GLOW);
  }
  // corridor windows on the drum's outer face are part of the skin; lit ring band under the dome
  for (let k = 0; k < 48; k++) { const a = k * Math.PI / 24; bp.set(Math.round(CX + Math.cos(a) * (R_DRUM - 1)), DRUM_TOP + 2, Math.round(CZ + Math.sin(a) * (R_DRUM - 1)), GLOW); }
}
// entrance vestibule: the band's middle slot at ground level, opening through the drum wall as a grand arch (10 wide,
// 8 high) with chrome jambs, guard posts on both sides, holo signs, and the tunnel toward the hall
function vestibule(bp, rng, b, rx0, rz0, rx1, rz1) {
  const y = 1, alongX = b.side === 'N' || b.side === 'S';
  bp.fill(rx0 - 1, y, rz0 - 1, rx1 + 1, y + 6, rz1 + 1, AIR);
  bp.fill(rx0 - 1, 0, rz0 - 1, rx1 + 1, 0, rz1 + 1, STONE);
  bp.fill(rx0 - 1, y + 7, rz0 - 1, rx1 + 1, y + 7, rz1 + 1, BAND);
  for (let x = rx0; x <= rx1; x += 3) for (let z = rz0; z <= rz1; z += 3) bp.set(x, y + 7, z, GLOW);
  // the arch through the drum skin
  if (b.side === 'N') { bp.fill(rx0, y, rz1 + 1, rx1, y + 6, CZ + R_DRUM + 1, AIR); bp.fill(rx0 - 1, y, rz1 + 2, rx0 - 1, y + 8, CZ + R_DRUM + 1, TRIM); bp.fill(rx1 + 1, y, rz1 + 2, rx1 + 1, y + 8, CZ + R_DRUM + 1, TRIM); bp.fill(rx0, y + 7, rz1 + 2, rx1, y + 7, CZ + R_DRUM + 1, GLOW); }
  if (b.side === 'S') { bp.fill(rx0, y, CZ - R_DRUM - 1, rx1, y + 6, rz0 - 1, AIR); bp.fill(rx0 - 1, y, CZ - R_DRUM - 1, rx0 - 1, y + 8, rz0 - 2, TRIM); bp.fill(rx1 + 1, y, CZ - R_DRUM - 1, rx1 + 1, y + 8, rz0 - 2, TRIM); bp.fill(rx0, y + 7, CZ - R_DRUM - 1, rx1, y + 7, rz0 - 2, GLOW); }
  if (b.side === 'W') { bp.fill(rx1 + 1, y, rz0, CX + R_DRUM + 1, y + 6, rz1, AIR); bp.fill(rx1 + 2, y, rz0 - 1, CX + R_DRUM + 1, y + 8, rz0 - 1, TRIM); bp.fill(rx1 + 2, y, rz1 + 1, CX + R_DRUM + 1, y + 8, rz1 + 1, TRIM); bp.fill(rx1 + 2, y + 7, rz0, CX + R_DRUM + 1, y + 7, rz1, GLOW); }
  if (b.side === 'E') { bp.fill(CX - R_DRUM - 1, y, rz0, rx0 - 1, y + 6, rz1, AIR); bp.fill(CX - R_DRUM - 1, y, rz0 - 1, rx0 - 2, y + 8, rz0 - 1, TRIM); bp.fill(CX - R_DRUM - 1, y, rz1 + 1, rx0 - 2, y + 8, rz1 + 1, TRIM); bp.fill(CX - R_DRUM - 1, y + 7, rz0, rx0 - 2, y + 7, rz1, GLOW); }
  // opening from the vestibule into the ring corridor
  if (b.side === 'N') bp.fill(rx0 + 2, y, rz0 - 1, rx1 - 2, y + 4, rz0 - 1, AIR);
  if (b.side === 'S') bp.fill(rx0 + 2, y, rz1 + 1, rx1 - 2, y + 4, rz1 + 1, AIR);
  if (b.side === 'W') bp.fill(rx0 - 1, y, rz0 + 2, rx0 - 1, y + 4, rz1 - 2, AIR);
  if (b.side === 'E') bp.fill(rx1 + 1, y, rz0 + 2, rx1 + 1, y + 4, rz1 - 2, AIR);
  // guard posts: consoles and red-striped scanners at both sides, statues, benches
  const gx = alongX ? [rx0, rx1] : [Math.round((rx0 + rx1) / 2)], gz = alongX ? [Math.round((rz0 + rz1) / 2)] : [rz0, rz1];
  for (const x of gx) for (const z of gz) { bp.set(x, y, z, B.PANEL_BLACK); bp.set(x, y + 1, z, B.CONSOLE); bp.work(alongX ? x + (x === rx0 ? 1 : -1) : x, y, alongX ? z : z + (z === rz0 ? 1 : -1), 'guard'); }
  for (const [x, z] of [[rx0, rz0], [rx1, rz0], [rx0, rz1], [rx1, rz1]]) { bp.set(x, y, z, B.PANEL_STRIPE); bp.set(x, y + 1, z, B.PANEL_STRIPE); bp.set(x, y + 2, z, BLUE); }
  bp.set(alongX ? rx0 + 2 : rx0, y + 2, alongX ? rz0 : rz0 + 2, B.HOLO_SIGN); bp.set(alongX ? rx1 - 2 : rx1, y + 2, alongX ? rz0 : rz1 - 2, B.HOLO_SIGN);
  bp.room('vestibule', rx0 - 1, y, rz0 - 1, rx1 + 1, rz1 + 1);
  bp.door(alongX ? Math.round((rx0 + rx1) / 2) : (b.side === 'W' ? rx1 + 1 : rx0 - 1), y, alongX ? (b.side === 'N' ? rz1 + 1 : rz0 - 1) : Math.round((rz0 + rz1) / 2), b.side === 'N' ? 'S' : b.side === 'S' ? 'N' : b.side === 'W' ? 'E' : 'W');
}
function chancellorSuite(bp, rng) {
  // the north band of the top concourse floor (walk 11): the office runs from the ring corridor to the drum skin,
  // whose slits become a red-and-glass window wall; red carpet, holo desk, statues, guard kiosks at the door
  const y = 11, x0 = CX - 14, x1 = CX + 14, z0 = CZ - R_DRUM + 2, z1 = CZ - R_CORR1 - 1;
  for (let x = x0 - 1; x <= x1 + 1; x++) for (let z = z0 - 3; z <= z1 + 1; z++) {
    const r = dist(x, z);
    if (r > R_DRUM + 0.5) continue;
    const skin = r > R_DRUM - 1.5;
    if (skin) { for (let yy = y; yy <= y + 2; yy++) bp.set(x, yy, z, (x - x0) % 3 ? GLASS : RED); bp.set(x, y - 1, z, RED); continue; }   // window wall in the drum skin
    const wall = x === x0 - 1 || x === x1 + 1 || z === z1 + 1;
    bp.set(x, y - 1, z, wall ? RED : ((x + z) % 3 ? B.RED_WOOL : B.PANEL_BLACK));
    if (wall) { bp.fill(x, y, z, x, y + 3, z, RED); continue; }
    bp.fill(x, y, z, x, y + 3, z, AIR);
    bp.set(x, y + 4, z, ((x + z) % 4 === 0) ? GLOW : ((x + z) % 4 === 2 ? GOLD : RED));
  }
  // desk, holo table, statues, guards, seating; door from the gallery
  const dx = CX, dz = CZ - 66;
  bp.set(dx - 1, y, dz, B.PANEL_BLACK); bp.set(dx, y, dz, B.PANEL_BLACK); bp.set(dx - 1, y + 1, dz, B.CONSOLE); bp.set(dx, y + 1, dz, B.HOLO_SIGN);
  bp.set(dx, y, dz - 2, B.STONE_BRICK_SLAB); bp.work(dx, y, dz - 2, 'chancellor');
  for (const sx of [dx - 3, dx + 2]) { bp.set(sx, y, dz + 2, B.STONE_BRICK_SLAB); bp.spot(sx, y, dz + 2, 'seat'); }
  for (const sx of [x0 + 2, x1 - 2]) { statue(bp, sx, y, dz - 1); statue(bp, sx, y, dz + 3); }
  for (const sx of [x0 + 5, x1 - 5]) { bp.set(sx, y, z1 - 1, B.RED_WOOL); bp.set(sx + 1, y, z1 - 1, B.RED_WOOL); bp.spot(sx, y, z1 - 1, 'seat'); bp.set(sx, y, dz + 4, B.TABLE); }
  for (let x = x0 + 1; x <= x1 - 1; x += 4) bp.set(x, y + 2, z1 + 1, (x % 8) ? B.HOLO_SIGN : GOLD);
  for (const sx of [x0 + 3, x1 - 3]) { bp.set(sx, y, dz + 1, B.BOOKSHELF); bp.set(sx, y + 1, dz + 1, B.BOOKSHELF); bp.set(sx, y, dz + 2, B.CHEST); }
  doorway(bp, CX - 1, z1 + 1, CX, z1 + 1, y, 3, GOLD);
  bp.set(CX - 3, y, z1, B.PANEL_BLACK); bp.set(CX - 3, y + 1, z1, B.CONSOLE); bp.work(CX - 4, y, z1, 'guard');
  bp.set(CX + 2, y, z1, B.PANEL_BLACK); bp.set(CX + 2, y + 1, z1, B.CONSOLE); bp.work(CX + 3, y, z1, 'guard');
  bp.room('chancellor_office', x0 - 1, y, z0, x1 + 1, z1 + 1);
}

// approach: forecourt, Avenue of the Core Founders, the landing pavilion with the sky bridge, shuttle pads on the
// podium, stairs from the forecourt to the drum roof terraces, lamps
function approaches(bp, lot) {
  const dx = lot.door.x - lot.x0;               // 83
  // forecourt paving over the whole lot outside the drum
  for (let x = 0; x < bp.w; x++) for (let z = 0; z < bp.d; z++) if (dist(x, z) > R_DRUM + 0.5) bp.set(x, 0, z, ((x + z) % 6 === 0) ? BAND : ((x % 12 === 0 || z % 12 === 0) ? STONE : STONE2));
  // avenue: statues on plinths both sides from the gate to the south arch, lit strip
  for (let z = CZ + R_DRUM + 3; z <= bp.d - 3; z += 3) { statue(bp, dx - 8, 1, z); statue(bp, dx + 9, 1, z); bp.set(dx, 0, z, GLOW); bp.set(dx + 1, 0, z, GLOW); }
  for (let z = CZ + R_DRUM + 2; z <= bp.d - 2; z += 6) { lamp(bp, dx - 11, 1, z, 3, B.CITY_LAMP); lamp(bp, dx + 12, 1, z, 3, B.CITY_LAMP); }
  // gate pylons at the lot door
  bp.fill(dx - 2, 1, bp.d - 1, dx - 2, 7, bp.d - 1, TRIM); bp.fill(dx + 3, 1, bp.d - 1, dx + 3, 7, bp.d - 1, TRIM); bp.set(dx - 2, 8, bp.d - 1, BLUE); bp.set(dx + 3, 8, bp.d - 1, BLUE);
  bp.door(dx, 1, bp.d - 1, 'S');
  // landing pavilion: a round disc (r 9) on a stalk at y 35 by the south edge, receiving the boulevard bridge at
  // (dx, 36, d-1); stairs and a lift down to the forecourt
  const px = dx, pz = bp.d - 11;                 // the stalk (r 2.5) stands clear of the south arch, which reaches z d-15
  for (let x = px - 10; x <= px + 10; x++) for (let z = pz - 10; z <= pz + 10; z++) {
    const r = Math.hypot(x + 0.5 - (px + 0.5), z + 0.5 - (pz + 0.5));
    if (r > 9.5) continue;
    bp.set(x, 35, z, r > 8.5 ? TRIM : ((Math.round(r) % 3 === 0) ? GLOW : PLATE));
    if (r > 8.5) bp.set(x, 36, z, B.IRON_BARS);
    if (r <= 2.5) bp.fill(x, 1, z, x, 34, z, r <= 1.5 ? DARK : TRIM);         // stalk
    if (r > 8.5 && Math.round(r * 4) % 5 === 0) { bp.set(x, 37, z, B.IRON_BARS); bp.set(x, 38, z, B.CITY_LAMP); }
    if (r <= 7.5 && r > 6.5) bp.set(x, 40, z, TRIM);                          // canopy ring
    if (r <= 6.5) bp.set(x, 41, z, r <= 1.5 ? GLOW : GLASS);
  }
  bp.fill(px - 7, 36, pz - 7, px + 7, 39, pz + 7, AIR);
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; const sx = Math.round(px + Math.cos(a) * 5), sz = Math.round(pz + Math.sin(a) * 5); bp.set(sx, 36, sz, B.STONE_BRICK_SLAB); bp.spot(sx, 36, sz, 'seat'); }
  bp.set(px, 36, pz + 4, B.PANEL_BLACK); bp.set(px, 37, pz + 4, B.HOLO_SIGN);
  // bridge deck from the lot edge to the pavilion
  bp.fill(px - 3, 35, pz + 9, px + 3, 35, bp.d - 1, PLATE); bp.fill(px - 3, 36, pz + 9, px - 3, 36, bp.d - 1, B.IRON_BARS); bp.fill(px + 3, 36, pz + 9, px + 3, 36, bp.d - 1, B.IRON_BARS);
  bp.fill(px - 2, 36, pz + 9, px + 2, 39, bp.d - 1, AIR);
  bp.door(dx, 36, bp.d - 1, 'S');
  // lift from the pavilion to the forecourt, and a helix-like switchback stair tower beside it
  liftShaft(bp, px + 9, pz - 4, 1, 36);
  liftDoor(bp, px + 9, pz - 4, 1, 'N'); liftDoor(bp, px + 9, pz - 4, 36, 'S');
  bp.fill(px + 8, 35, pz - 2, px + 10, 35, pz - 1, PLATE); bp.fill(px + 8, 35, pz - 1, px + 10, 35, pz - 1, PLATE);
  const tx0 = px - 20, tz0 = pz - 4;   // stair tower 8 x 12 west of the pavilion, joined by a bridge at y 35
  bp.fill(tx0, 1, tz0, tx0 + 7, 36, tz0 + 11, STONE);
  bp.fill(tx0 + 1, 1, tz0 + 1, tx0 + 6, 35, tz0 + 10, AIR);
  bp.walls(tx0, 1, tz0, tx0 + 7, 36, tz0 + 11, STONE);
  for (let y = 4; y <= 34; y += 5) for (let z = tz0 + 2; z <= tz0 + 9; z += 3) { bp.set(tx0, y, z, B.WINDOW_LIT); bp.set(tx0 + 7, y, z, B.WINDOW_LIT); }
  let level = 1;
  for (let f = 0; f < 7; f++) {
    const east = f % 2 === 0;
    const xs = east ? [tx0 + 1, tx0 + 2] : [tx0 + 5, tx0 + 6];
    stairZ(bp, xs[0], xs[1], east ? tz0 + 1 : tz0 + 10, east ? 1 : -1, level, 5);
    level += 5;
    bp.fill(tx0 + 1, level - 1, east ? tz0 + 9 : tz0 + 1, tx0 + 6, level - 1, east ? tz0 + 10 : tz0 + 2, PLATE);   // landing
    bp.set(tx0 + 3, level + 2, east ? tz0 + 10 : tz0 + 1, GLOW);
  }
  bp.fill(tx0 + 1, 35, tz0 + 1, tx0 + 6, 35, tz0 + 10, PLATE); bp.fill(tx0 + 1, 36, tz0 + 1, tx0 + 6, 39, tz0 + 10, AIR); bp.fill(tx0, 37, tz0, tx0 + 7, 40, tz0 + 11, AIR); bp.set(tx0 + 3, 40, tz0 + 5, GLOW);
  bp.fill(tx0 + 7, 36, tz0 + 5, px - 8, 39, tz0 + 6, AIR); bp.fill(tx0 + 7, 35, tz0 + 5, px - 8, 35, tz0 + 6, PLATE);
  bp.fill(tx0 + 7, 36, tz0 + 4, px - 9, 36, tz0 + 4, B.IRON_BARS); bp.fill(tx0 + 7, 36, tz0 + 7, px - 9, 36, tz0 + 7, B.IRON_BARS);
  doorway(bp, tx0 + 7, tz0 + 5, tx0 + 7, tz0 + 6, 1);
  bp.set(tx0 + 3, 4, tz0 + 5, GLOW); bp.set(tx0 + 4, 4, tz0 + 6, GLOW);
  bp.fill(tx0 + 7, 36, tz0 + 5, tx0 + 7, 38, tz0 + 6, AIR);
  bp.room('stair_tower', tx0, 1, tz0, tx0 + 7, tz0 + 11);
  // shuttle pads east and west: raised platforms (y 6) with markings, lamps, stairs, a parked shuttle each
  for (const [cx, cz] of [[22, 40], [bp.w - 23, 40]]) {
    bp.fill(cx - 12, 1, cz - 12, cx + 12, 5, cz + 12, DARK);
    bp.fill(cx - 11, 1, cz - 11, cx + 11, 5, cz + 11, STONE);
    for (let x = cx - 12; x <= cx + 12; x++) for (let z = cz - 12; z <= cz + 12; z++) { const r = Math.hypot(x - cx, z - cz); bp.set(x, 6, z, r > 10.5 && r <= 11.5 ? B.PANEL_STRIPE : r <= 1.2 ? GLOW : ((x === cx || z === cz) && r < 9) ? GLOW : PLATE); }
    for (const [lx, lz] of [[cx - 11, cz - 11], [cx + 11, cz - 11], [cx - 11, cz + 11], [cx + 11, cz + 11]]) lamp(bp, lx, 7, lz, 2, B.CITY_LAMP);
    stairZ(bp, cx - 1, cx, cz + 13, -1, 1, 6);
    // shuttle
    bp.fill(cx - 6, 7, cz - 2, cx + 6, 9, cz + 2, B.DURASTEEL); bp.fill(cx - 5, 8, cz - 1, cx + 5, 8, cz + 1, AIR);
    bp.fill(cx + 6, 8, cz - 1, cx + 7, 9, cz + 1, GLASS); bp.fill(cx - 8, 7, cz - 1, cx - 7, 8, cz + 1, DARK); bp.set(cx - 9, 7, cz, BLUE);
    bp.fill(cx - 3, 10, cz - 6, cx + 2, 10, cz - 3, TRIM); bp.fill(cx - 3, 10, cz + 3, cx + 2, 10, cz + 6, TRIM);
    bp.fill(cx - 3, 11, cz - 6, cx + 2, 13, cz - 6, B.DURASTEEL); bp.fill(cx - 3, 11, cz + 6, cx + 2, 13, cz + 6, B.DURASTEEL);
    bp.room('landing_pad', cx - 12, 7, cz - 12, cx + 12, cz + 12);
    bp.spot(cx - 8, 7, cz + 8, 'stand'); bp.work(cx + 8, 7, cz + 8, 'deck officer');
  }
  // drum roof terrace ring (y 14 walk on the drum top) reached by two outside stairs (east and west of the south arch)
  for (const [x0, x1, dxs] of [[CX - 40, CX - 37, -1], [CX + 37, CX + 40, 1]]) {
    stairZ(bp, x0, x1, CZ + R_DRUM + 4, -1, 1, 6);          // up onto a 6-high plinth first
    bp.fill(x0 - 1, 6, CZ + R_DRUM - 8, x1 + 1, 6, CZ + R_DRUM + 4, PLATE);
    bp.fill(x0 - 1, 7, CZ + R_DRUM - 8, x1 + 1, 10, CZ + R_DRUM + 4, AIR);
  }
  // lamps around the forecourt
  for (let x = 6; x < bp.w - 6; x += 20) for (const z of [4, bp.d - 6]) if (dist(x, z) > R_DRUM + 2) lamp(bp, x, 1, z, 3, B.CITY_LAMP);
  for (let z = 6; z < bp.d - 6; z += 20) for (const x of [4, bp.w - 5]) if (dist(x, z) > R_DRUM + 2) lamp(bp, x, 1, z, 3, B.CITY_LAMP);
}

export const LANDMARK = {
  id: 'senate', name: 'Galactic Senate', span: [3, 3], height: 90, minW: 160, minD: 170,
  build(bp, lot, ctx) {
    const rng = ctx.rng;
    bp.meta.name = 'Galactic Senate';
    bp.fill(0, 0, 0, bp.w - 1, 0, bp.d - 1, STONE2);
    drumAndDome(bp);
    concourse(bp, rng);
    chamber(bp, rng);
    approaches(bp, lot);
    bp.meta.lobby = { x: lot.x0 + CX, y: bp.y0 + 1, z: lot.z0 + CZ + 65 };
    bp.meta.floors = [1, 6, 11, 16, 36].map((y) => bp.y0 + y);
  },
};
