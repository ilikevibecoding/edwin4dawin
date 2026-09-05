// Monument Plaza (docs/rubrics/06_landmarks.md, `plaza_monument`): a vast open plaza at plateau level around the
// Umate rock outcrop. The rock (18 high, stone / cobble / gravel / coarse dirt with mossy touches) stands in a ring
// pool with railed kerbs and four causeways; dashed GLOW_PANEL light strips fan out from the pool to the plaza rim;
// seven dark conical pavilions (PANEL_BLACK cones on a warm lit fascia) house open cafes, market stalls and souvenir
// kiosks; four domed rotundas at the corners hold the museum of the rock, the cantina, the ticket hall / info centre
// (with a lift) and the lecture room, each with an upper room under a ribbed dome reached by a half-step flight; a
// perimeter arcade (lit fascia, windows, roof terrace) rims the lot with gates at the boulevard ends and a monumental
// portal at the front door. Everything derives from lot.seed through ctx.rng and position hashes.
//
// Local frame: x in [0, w), z in [0, d), y = 0 is the plateau top (repaved), walk level y = 1, floors on y = 5k.
import { B } from '../../blocks.js';
import { hash2, hash3 } from '../../rng.js';
import { FORCE_AIR } from '../blueprint.js';

const TAU = Math.PI * 2;
const wrap = (a) => { a %= TAU; return a < 0 ? a + TAU : a; };
const angDiff = (a, b) => { const d = wrap(a - b); return d > Math.PI ? TAU - d : d; };
// integer-centred disc test: cell (dx, dz) lies within radius r (q = dx*dx + dz*dz)
const inR = (q, r) => r >= 0 && q <= r * r + r;

const STEP_SLAB = B.STONE_BRICK_SLAB, STEP_FULL = B.DURASTEEL;

export const LANDMARK = { id: 'plaza_monument', name: 'Monument Plaza', span: [3, 3], height: 30, build };

function build(bp, lot, ctx) {
  const rng = ctx.rng;
  const W = bp.w, D = bp.d;
  const CX = (W - 1) >> 1, CZ = (D - 1) >> 1;
  const seed = (lot.seed ?? 1) >>> 0;
  bp.meta.name = 'Monument Plaza';

  const H2 = (x, z, s) => hash2(x, z, (seed + s * 7919) | 0);
  const H3 = (x, y, z, s) => hash3(x, y, z, (seed + s * 7919) | 0);
  const set = (x, y, z, id) => bp.set(x, y, z, id);
  const get = (x, y, z) => bp.get(x, y, z);
  const fill = (x0, y0, z0, x1, y1, z1, id) => bp.fill(x0, y0, z0, x1, y1, z1, id);
  const isFree = (x, y, z) => { const v = get(x, y, z); return v === 0 || v === FORCE_AIR; };
  const rim = (x, z) => Math.min(x, W - 1 - x, z, D - 1 - z);
  const lampPost = (x, z, y = 1) => { set(x, y, z, B.IRON_BARS); set(x, y + 1, z, B.IRON_BARS); set(x, y + 2, z, B.CITY_LAMP); };
  const seatAt = (x, y, z, id = B.SPRUCE_SLAB) => { set(x, y, z, id); bp.spot(x, y, z, 'seat'); };
  // forEach cell of the integer-centred disc of radius r around (cx, cz): cb(x, z, dx, dz, q)
  const disc = (cx, cz, r, cb) => {
    const R = Math.ceil(r) + 1;
    for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) { const q = dx * dx + dz * dz; if (inR(q, r)) cb(cx + dx, cz + dz, dx, dz, q); }
  };

  // ============================================================ 1. paving
  const RIM_D = 4;                     // arcade depth
  const R_ROCK = 7.5, R_LEDGE = 9, R_WATER = 14, R_KERB = 15, R_WALK = 21;
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) {
    const dx = x - CX, dz = z - CZ, q = dx * dx + dz * dz, d = Math.sqrt(q);
    let id;
    if (rim(x, z) < RIM_D) id = ((x + z) & 1) ? B.SMOOTH_STONE : B.STONE_BRICKS;
    else if (d <= R_ROCK) id = B.STONE;
    else if (d <= R_LEDGE) id = B.SMOOTH_STONE;
    else if (d <= R_WATER) id = B.WATER;
    else if (d <= R_KERB) id = B.CHROME;
    else if (d <= R_WALK) id = ((Math.floor(d) - 15) & 1) ? B.STONE_BRICKS : B.SMOOTH_STONE;
    else {
      const band = Math.floor(d) % 12 === 0;
      if (band) id = B.STONE_BRICKS;
      else {
        // dark paving with joint lines every 6 blocks and the odd deck plate / vent grate
        const h = H2(x, z, 1);
        id = h < 0.03 ? B.DECK_PLATE : h < 0.038 ? B.VENT : (x % 6 === 0 || z % 6 === 0) ? B.DURASTEEL_DARK : B.PANEL_BLACK;
      }
    }
    set(x, 0, z, id);
  }

  // ============================================================ 2. the Umate rock in its ring pool
  const spires = [[0, 0, 18, 7.6], [2.6, -1.6, 13, 4.6], [-2.4, 2.4, 11, 4.4], [1.2, 3.4, 8, 3.2], [-3.2, -2.2, 9, 3.4]];
  disc(CX, CZ, R_ROCK, (x, z, dx, dz) => {
    let hgt = 0;
    for (const [sx, sz, sh, sr] of spires) { const dd = Math.hypot(dx - sx, dz - sz); if (dd < sr) hgt = Math.max(hgt, sh * Math.pow(1 - dd / sr, 0.9)); }
    hgt += (H2(x, z, 2) - 0.5) * 2.4;
    if (dx === 0 && dz === 0) hgt = 18;
    const top = Math.max(0, Math.min(18, Math.round(hgt)));
    for (let y = 1; y <= top; y++) {
      const r = H3(x, y, z, 3);
      let id = B.STONE;
      if (r < 0.2) id = B.COBBLESTONE; else if (r < 0.28) id = B.GRAVEL; else if (r < 0.36) id = B.COARSE_DIRT; else if (r > 0.985) id = B.COAL_ORE; else if (r > 0.975) id = B.IRON_ORE;
      set(x, y, z, id);
    }
    if (top > 0 && top < 15) {
      const m = H2(x, z, 4);
      if (m < 0.12) set(x, top + 1, z, B.OAK_LEAVES); else if (m < 0.38) set(x, top + 1, z, B.TALL_GRASS);
    }
  });
  // spotlights in the ledge, blue lights under the water, kerb railing with lamp posts, causeways at the cardinal points
  for (let k = 0; k < 16; k++) { const a = k * TAU / 16 + TAU / 32; set(Math.round(CX + 8.4 * Math.cos(a)), 0, Math.round(CZ + 8.4 * Math.sin(a)), B.GLOW_PANEL); }
  for (let k = 0; k < 12; k++) { const a = k * TAU / 12 + TAU / 24; set(Math.round(CX + 11.5 * Math.cos(a)), 0, Math.round(CZ + 11.5 * Math.sin(a)), B.GLOW_PANEL_BLUE); }
  disc(CX, CZ, R_KERB, (x, z, dx, dz, q) => {
    if (q <= R_WATER * R_WATER) return;
    const onBridge = (Math.abs(dx) <= 1 || Math.abs(dz) <= 1);
    if (onBridge) return;
    set(x, 1, z, B.IRON_BARS);
  });
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + TAU / 16; lampPost(Math.round(CX + 14.6 * Math.cos(a)), Math.round(CZ + 14.6 * Math.sin(a))); }
  for (let s = -1; s <= 1; s += 2) for (let t = 9; t <= 15; t++) {
    for (let o = -2; o <= 2; o++) {
      const edge = Math.abs(o) === 2;
      // N/S causeway (along z) and E/W causeway (along x)
      set(CX + o, 0, CZ + s * t, edge ? B.STONE_BRICKS : B.SMOOTH_STONE);
      set(CX + s * t, 0, CZ + o, edge ? B.STONE_BRICKS : B.SMOOTH_STONE);
      if (edge && t <= 14) { set(CX + o, 1, CZ + s * t, B.IRON_BARS); set(CX + s * t, 1, CZ + o, B.IRON_BARS); }
    }
    set(CX + s * 2, 1, CZ + s * 15, B.IRON_BARS); set(CX - s * 2, 1, CZ + s * 15, B.IRON_BARS);
    set(CX + s * 15, 1, CZ + s * 2, B.IRON_BARS); set(CX + s * 15, 1, CZ - s * 2, B.IRON_BARS);
  }
  for (let s = -1; s <= 1; s += 2) { bp.spot(CX, 1, CZ + s * 10, 'stand'); bp.spot(CX + s * 10, 1, CZ, 'stand'); }

  // ============================================================ 3. radial light strips
  for (let i = 0; i < 16; i++) {
    const a = (i + 0.5) * TAU / 16;
    for (let r = 22; r < 130; r++) {
      const x = Math.round(CX + r * Math.cos(a)), z = Math.round(CZ + r * Math.sin(a));
      if (rim(x, z) <= RIM_D) { lampPost(Math.round(CX + (r - 2) * Math.cos(a)), Math.round(CZ + (r - 2) * Math.sin(a))); break; }
      set(x, 0, z, (r & 1) ? B.CHROME : B.GLOW_PANEL);
    }
  }

  // ============================================================ 4. approach avenue (front door side)
  const AV_W = 4;
  for (let z = CZ + 22; z < D; z++) for (let dx = -AV_W; dx <= AV_W; dx++) {
    const x = CX + dx, ax = Math.abs(dx);
    let id = B.SMOOTH_STONE;
    if (ax === AV_W) id = B.STONE_BRICKS;
    else if (ax === 2) id = (z & 1) ? B.GLOW_PANEL : B.CHROME;
    else if (dx === 0) id = (z % 6 === 0) ? B.STONE_BRICKS : B.SMOOTH_STONE;
    set(x, 0, z, id);
  }

  // ============================================================ 5. perimeter arcade, gates, portal
  buildArcade(bp, lot, { W, D, CX, CZ, RIM_D, set, fill, lampPost, seatAt, rim, H2 });

  // ============================================================ 6. conical pavilions
  const pavAngles = [62, 118, 165, 208, 252, 296, 342];
  const kinds = rng.shuffle(['cafe', 'market', 'kiosk', 'cafe', 'market', 'cafe', 'kiosk']);
  pavAngles.forEach((deg, i) => {
    const a = deg * TAU / 360, rad = 44 + rng.int(-2, 2);
    const cx = Math.round(CX + rad * Math.cos(a)), cz = Math.round(CZ + rad * Math.sin(a));
    const R0 = kinds[i] === 'kiosk' ? rng.pick([6, 7]) : rng.pick([7, 8]), Hc = rng.pick([15, 16, 17, 18, 19]);
    buildPavilion(bp, { cx, cz, R0, Hc, kind: kinds[i], twoBands: rng.chance(0.6), rng, set, get, isFree, disc, seatAt, H2 });
  });

  // ============================================================ 7. domed rotundas at the corners
  const rot = [
    { cx: 20, cz: 22, R: 8, dir: 1, kind: 'museum', up: 'archive_gallery' },
    { cx: W - 21, cz: 22, R: 7, dir: -1, kind: 'cantina', up: 'lounge' },
    { cx: 20, cz: D - 23, R: 8, dir: 1, kind: 'ticket_hall', up: 'plaza_office' },
    { cx: W - 21, cz: D - 23, R: 7, dir: -1, kind: 'lecture_room', up: 'observation_gallery' },
  ];
  for (const r of rot) buildRotunda(bp, { ...r, rng, set, get, fill, isFree, disc, seatAt, lampPost, H2 });

  // ============================================================ 8. plaza furniture
  buildFurniture(bp, { W, D, CX, CZ, RIM_D, rng, set, get, isFree, fill, lampPost, seatAt, rim, disc, H2 });
}

// ---------------------------------------------------------------------------------------------------- arcade
function buildArcade(bp, lot, o) {
  const { W, D, CX, RIM_D, set, fill, lampPost, seatAt, rim } = o;
  const gatesX = [49, 113], gatesZ = [49, 117];      // boulevard ends abutting the lot (local coords)
  const inGate = (edge, t) => {
    const list = edge === 'N' || edge === 'S' ? gatesX : gatesZ;
    for (const c of list) if (Math.abs(t - c) <= 3) return c;
    return null;
  };
  // edge cells: (edge, m = depth into the lot, t = coordinate along the edge)
  const cellOf = (edge, m, t) => edge === 'W' ? [m, t] : edge === 'E' ? [W - 1 - m, t] : edge === 'N' ? [t, m] : [t, D - 1 - m];
  for (const edge of ['W', 'E', 'N', 'S']) {
    const len = edge === 'W' || edge === 'E' ? D : W;
    for (let t = RIM_D; t < len - RIM_D; t++) {
      const gate = inGate(edge, t);
      const portal = edge === 'S' && Math.abs(t - CX) <= 7;
      for (let m = 0; m < RIM_D; m++) {
        const [x, z] = cellOf(edge, m, t);
        // floor
        set(x, 0, z, m === RIM_D - 1 ? B.CHROME : ((t + m) & 1) ? B.SMOOTH_STONE : B.STONE_BRICKS);
        if (portal) continue;                         // the portal paints its own bay
        // roof + parapet
        set(x, 8, z, m === RIM_D - 1 ? B.CHROME : ((t + m) & 1) ? B.DURASTEEL_DARK : B.DECK_PLATE);
        if (m === 0) set(x, 9, z, B.DURASTEEL_DARK);
        if (m === RIM_D - 1) set(x, 9, z, B.IRON_BARS);
        if (gate !== null) {
          const dt = t - gate;
          if (Math.abs(dt) === 3) { fill(x, 1, z, x, 7, z, B.CHROME); continue; }   // gate jambs (full depth)
          if (m === 0 || m === RIM_D - 1) { set(x, 5, z, B.CHROME); set(x, 6, z, Math.abs(dt) <= 1 ? B.HOLO_SIGN : B.PANEL_BLACK); set(x, 7, z, B.PANEL_BLACK); }
          else set(x, 5, z, B.GLOW_PANEL);           // lit gate ceiling
          continue;
        }
        if (m === 0) {
          // outer wall: pilasters every 8, two rows of lit windows, a stripe band, holo posters
          const p = ((t % 8) + 8) % 8;
          if (p === 0) { fill(x, 1, z, x, 9, z, B.DURASTEEL); set(x, 10, z, B.CITY_LAMP); continue; }
          set(x, 1, z, B.DURASTEEL_DARK);
          const win = p === 2 || p === 3 || p === 5 || p === 6;
          const poster = (Math.floor(t / 8) % 3 === 1) && (p === 5 || p === 6);
          for (let y = 2; y <= 7; y++) {
            let id = B.PANEL_BLACK;
            if (y === 4) id = B.PANEL_STRIPE;
            else if (win && (y === 2 || y === 3 || y === 5 || y === 6)) id = poster && y <= 3 ? B.HOLO_SIGN : B.WINDOW_LIT;
            set(x, y, z, id);
          }
        } else if (m === RIM_D - 1) {
          // inner colonnade: columns every 4, lit fascia beam
          if (t % 4 === 0) { fill(x, 1, z, x, 6, z, B.DURASTEEL); set(x, 1, z, B.CHROME); set(x, 7, z, B.PANEL_STRIPE); if (t % 16 === 0) { set(x, 9, z, B.DURASTEEL); set(x, 10, z, B.CITY_LAMP); } }
          else set(x, 7, z, (t % 4 === 2) ? B.WINDOW_LIT : B.PANEL_STRIPE);
        } else {
          // arcade interior: ceiling lights, benches and planters against the outer wall, terrace furniture on the roof
          if (m === 1 && t % 4 === 2) set(x, 8, z, B.GLOW_PANEL);
          const p = ((t % 16) + 16) % 16;
          if (m === 1 && (p === 2 || p === 3)) seatAt(x, 1, z, B.SPRUCE_SLAB);
          if (m === 1 && p === 10) { set(x, 1, z, B.DURASTEEL_DARK); set(x, 2, z, B.OAK_LEAVES); }
          if (m === 2 && p === 6) { set(x, 1, z, B.BARREL); }
          if (m === 1 && p === 14) { set(x, 1, z, B.CONSOLE); set(x, 2, z, B.HOLO_SIGN); const [sx2, sz2] = cellOf(edge, 2, t); bp.spot(sx2, 1, sz2, 'stand'); }
          if (m === 1 && (p === 12 || p === 13 || p === 4 || p === 5)) { seatAt(x, 9, z, B.SPRUCE_SLAB); }
          if (m === 2 && (p === 0 || p === 8)) { set(x, 9, z, B.DURASTEEL_DARK); set(x, 10, z, p === 0 ? B.SPRUCE_LEAVES : B.OAK_LEAVES); }
          if (m === 2 && p === 9) { set(x, 9, z, B.TABLE); }
          if (m === 1 && p === 8) { set(x, 9, z, B.IRON_BARS); set(x, 10, z, B.LANTERN); }
        }
      }
      if (gate !== null && t === gate) {
        const [x, z] = cellOf(edge, 0, t);
        bp.door(x, 1, z, edge);
      }
    }
  }
  // wide terrace stairs up to the arcade roof (one per side): 16 half-steps on a solid stone mass, parapet on the
  // plaza side, railing opened where the flight lands on the roof
  const CZ = o.CZ;
  for (const [edge, t0] of [['W', CZ - 8], ['E', CZ - 8], ['N', CX - 8], ['S', CX + 10]]) {
    for (let k = 0; k < 16; k++) {
      const t = t0 + k, yk = 1 + (k >> 1), full = (k & 1) === 1;
      for (let m = RIM_D; m <= RIM_D + 2; m++) {
        const [x, z] = cellOf(edge, m, t);
        fill(x, 1, z, x, 10, z, FORCE_AIR);
        if (m === RIM_D + 2) { fill(x, 1, z, x, yk, z, B.STONE_BRICKS); set(x, yk + 1, z, B.IRON_BARS); continue; }   // parapet
        if (yk > 1) fill(x, 1, z, x, yk - 1, z, B.STONE_BRICKS);
        set(x, yk, z, full ? B.DURASTEEL : B.STONE_BRICK_SLAB);
      }
      if (k >= 14) { const [x, z] = cellOf(edge, RIM_D - 1, t); set(x, 9, z, FORCE_AIR); }
    }
    for (let m = RIM_D; m <= RIM_D + 2; m++) {    // end wall of the flight with a lamp on the corner
      const [lx, lz] = cellOf(edge, m, t0 + 16); fill(lx, 1, lz, lx, 8, lz, B.STONE_BRICKS); set(lx, 9, lz, m === RIM_D + 2 ? B.CITY_LAMP : B.IRON_BARS);
    }
    const [bx, bz] = cellOf(edge, RIM_D + 2, t0 - 1); set(bx, 1, bz, B.STONE_BRICKS); set(bx, 2, bz, B.IRON_BARS); set(bx, 3, bz, B.CITY_LAMP);
    // the terrace segment the flight lands on, recorded so NPCs (and the harness) know the roof is a walkable room
    const [ax, az] = cellOf(edge, 0, t0 + 12), [bx2, bz2] = cellOf(edge, RIM_D - 1, t0 + 36);
    bp.room('roof_terrace', ax, 9, az, bx2, bz2);
    const [sx, sz] = cellOf(edge, 1, t0 + 20); bp.spot(sx, 9, sz, 'stand');
  }
  // corner pylons
  for (const [x0, z0] of [[0, 0], [W - RIM_D, 0], [0, D - RIM_D], [W - RIM_D, D - RIM_D]]) {
    fill(x0, 1, z0, x0 + RIM_D - 1, 10, z0 + RIM_D - 1, B.DURASTEEL_DARK);
    fill(x0 + 1, 11, z0 + 1, x0 + 2, 11, z0 + 2, B.CHROME);
    set(x0 + 1, 12, z0 + 1, B.CITY_LAMP); set(x0 + 2, 12, z0 + 2, B.CITY_LAMP);
    for (let y = 3; y <= 9; y += 3) {
      fill(x0, y, z0 + 1, x0, y, z0 + 2, B.GLOW_PANEL_BLUE); fill(x0 + RIM_D - 1, y, z0 + 1, x0 + RIM_D - 1, y, z0 + 2, B.GLOW_PANEL_BLUE);
      fill(x0 + 1, y, z0, x0 + 2, y, z0, B.GLOW_PANEL_BLUE); fill(x0 + 1, y, z0 + RIM_D - 1, x0 + 2, y, z0 + RIM_D - 1, B.GLOW_PANEL_BLUE);
    }
  }
  // monumental front portal around the door column (lot.door): pylons, lintel, name sign
  const z1 = D - 1, z0 = D - RIM_D;
  for (const sgn of [-1, 1]) {
    const px = CX + sgn * 6;   // pylon centre column (3 wide: px-1..px+1)
    fill(px - 1, 1, z0, px + 1, 12, z1, B.DURASTEEL_DARK);
    for (let y = 2; y <= 10; y += 2) { set(px, y, z1, B.GLOW_PANEL_BLUE); set(px, y, z0, B.GLOW_PANEL_BLUE); }
    fill(px - 1, 1, z0, px + 1, 1, z1, B.CHROME);
    set(px, 13, z0 + 1, B.CHROME); set(px, 14, z0 + 1, B.CITY_LAMP);
  }
  fill(CX - 7, 10, z0, CX + 7, 11, z1, B.PANEL_BLACK);
  fill(CX - 4, 11, z1, CX + 4, 11, z1, B.HOLO_SIGN); fill(CX - 4, 11, z0, CX + 4, 11, z0, B.HOLO_SIGN);
  fill(CX - 4, 9, z0, CX + 4, 9, z1, B.GLOW_PANEL);                    // lit soffit over the gateway
  fill(CX - 4, 12, z0 + 1, CX + 4, 12, z0 + 2, B.CHROME);
  for (const sgn of [-1, 1]) { const x = CX + sgn * 5; fill(x, 1, z0, x, 8, z1, B.CHROME); }   // door jambs
  bp.door(CX, 1, z1, 'S');
  bp.meta.lobby = { x: bp.wx(CX), y: bp.wy(1), z: bp.wz(z0 - 2) };
}

// ---------------------------------------------------------------------------------------------------- pavilion
function buildPavilion(bp, o) {
  const { cx, cz, R0, Hc, kind, twoBands, rng, set, isFree, disc, seatAt } = o;
  // floor
  disc(cx, cz, R0, (x, z, dx, dz, q) => {
    const d = Math.floor(Math.sqrt(q));
    set(x, 0, z, q <= 1 ? B.DECK_PLATE : (d & 1) ? B.STONE_BRICKS : B.SMOOTH_STONE);
  });
  // perimeter: openings at the cardinal points, columns on the half angles, low wall + glass + warm band
  disc(cx, cz, R0, (x, z, dx, dz, q) => {
    if (inR(q, R0 - 1)) return;
    if (Math.abs(dx) <= 1 || Math.abs(dz) <= 1) return;         // opening (3 wide, full height)
    const a = wrap(Math.atan2(dz, dx));
    let column = false;
    for (let k = 0; k < 8; k++) if (angDiff(a, k * TAU / 8 + TAU / 16) * R0 <= 0.6) column = true;
    if (column) { set(x, 1, z, B.DURASTEEL_DARK); set(x, 2, z, B.DURASTEEL_DARK); set(x, 3, z, B.DURASTEEL_DARK); return; }
    set(x, 1, z, B.PANEL_STRIPE); set(x, 2, z, B.STEEL_GLASS); set(x, 3, z, B.WINDOW_LIT);
  });
  // fascia ring (visible from above; holo signs over the four entrances) + ceiling
  disc(cx, cz, R0 + 1, (x, z, dx, dz, q) => {
    if (!inR(q, R0)) set(x, 4, z, (dx === 0 || dz === 0) ? B.HOLO_SIGN : ((x + z) & 1) ? B.CITY_LAMP : B.WINDOW_LIT);
    else set(x, 4, z, ((dx + 30) % 3 === 0 && (dz + 30) % 3 === 0) ? B.GLOW_PANEL : B.PANEL_BLACK);
  });
  // dark cone with eight seam ribs, one or two lit bands and a lamp tip
  const yb1 = 5 + Math.round(Hc * 0.38), yb2 = 5 + Math.round(Hc * 0.7);
  for (let y = 5; y <= 5 + Hc; y++) {
    const r = R0 * (1 - (y - 5) / Hc);
    if (r < 0.5) { set(cx, y, cz, B.CITY_LAMP); break; }
    disc(cx, cz, r, (x, z, dx, dz, q) => {
      const ring = !inR(q, r - 1);
      let id = B.PANEL_BLACK;
      if (ring) {
        const a = wrap(Math.atan2(dz, dx));
        for (let k = 0; k < 8; k++) if (angDiff(a, k * TAU / 8 + TAU / 16) * r <= 0.5) id = B.DURASTEEL_DARK;
        if (y === yb1) id = B.WINDOW_LIT;
        else if (twoBands && y === yb2) id = B.GLOW_PANEL;
      }
      set(x, y, z, id);
    });
  }
  set(cx, 5 + Hc, cz, B.CITY_LAMP);

  // ---- interior (walk level y 1, ceiling y 4)
  const put = (dx, dz, y, id) => { if (inR(dx * dx + dz * dz, R0 - 1) && isFree(cx + dx, y, cz + dz)) { set(cx + dx, y, cz + dz, id); return true; } return false; };
  const spot = (dx, dz, kind = 'stand') => bp.spot(cx + dx, 1, cz + dz, kind);
  const work = (dx, dz, kind) => bp.work(cx + dx, 1, cz + dz, kind);
  const stool = (dx, dz) => { if (put(dx, dz, 1, B.SPRUCE_SLAB)) spot(dx, dz, 'seat'); };
  // hanging lanterns near the openings' inner corners
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) put(sx * (R0 - 3), sz * (R0 - 3), 3, B.LANTERN);
  if (kind === 'cafe') {
    // mast with holo menus, square counter around it, machines, stools, tables
    for (let y = 1; y <= 3; y++) set(cx, y, cz, B.DURASTEEL_DARK);
    for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(sx, sz, 3, B.HOLO_SIGN);
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== 2) continue;
      if (dx === 2 && dz === 0) continue;                        // staff gap
      const corner = Math.abs(dx) === 2 && Math.abs(dz) === 2;
      put(dx, dz, 1, B.PANEL_BLACK); put(dx, dz, 2, corner ? B.GLASS : B.STONE_BRICK_SLAB);   // glass pastry cases on the corners
    }
    put(-1, -1, 1, B.FURNACE); put(1, -1, 1, B.BARREL); put(-1, 1, 1, B.SHELF); put(-1, 1, 2, B.SHELF); put(1, 1, 1, B.CHEST);
    work(0, 1, 'barista'); work(0, -1, 'barista');
    for (const [dx, dz] of [[-3, -1], [-3, 1], [3, -2], [3, 2], [-1, 3], [1, 3], [-1, -3], [1, -3]]) stool(dx, dz);
    // tables on the diagonals between the openings, three stools each
    const tr = Math.round((R0 - 2.5) * 0.7071);
    for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const tx = sx * tr, tz = sz * tr;
      if (put(tx, tz, 1, B.TABLE)) { stool(tx + sx, tz); stool(tx, tz + sz); if (Math.abs(tx - sx) > 2 || Math.abs(tz) > 2) stool(tx - sx, tz); }
    }
    for (const [px, pz] of [[R0 - 2, 2], [-(R0 - 2), -2], [2, R0 - 2], [-2, -(R0 - 2)]]) { put(px, pz, 1, B.DURASTEEL_DARK); put(px, pz, 2, B.OAK_LEAVES); }
  } else if (kind === 'market') {
    // holo totem at the mast, four stalls on the diagonals with awnings and goods, crates and barrels behind
    set(cx, 1, cz, B.DURASTEEL_DARK); set(cx, 2, cz, B.HOLO_SIGN); set(cx, 3, cz, B.HOLO_SIGN);
    const goods = [B.PUMPKIN, B.HAY_BALE, B.CRATE, B.GOLD_BLOCK, B.RED_WOOL, B.SHELF, B.BOOKSHELF, B.WHITE_WOOL];
    const awn = [B.RED_WOOL, B.WHITE_WOOL, B.BLUE_WOOL, B.GREEN_WOOL];
    [[-4, -4], [4, -4], [-4, 4], [4, 4]].forEach(([sx, sz], i) => {
      const along = i % 2 === 0;    // table row along x or along z
      const col = awn[(i + rng.int(0, 3)) % 4];
      for (let k = -1; k <= 1; k++) {
        const tx = along ? sx + k : sx, tz = along ? sz : sz + k;
        put(tx, tz, 1, B.TABLE);
        put(tx, tz, 3, col); put(along ? tx : tx + Math.sign(sx), along ? tz + Math.sign(sz) : tz, 3, col);
        if (k !== 0) put(tx, tz, 2, rng.pick(goods));
      }
      const bx = along ? sx : sx + Math.sign(sx), bz = along ? sz + Math.sign(sz) : sz;   // behind the stall (toward the wall)
      put(bx + (along ? 1 : 0), bz + (along ? 0 : 1), 1, B.BARREL); put(bx - (along ? 1 : 0), bz - (along ? 0 : 1), 1, B.CRATE);
      work(bx, bz, 'vendor');
      spot(along ? sx : sx - Math.sign(sx), along ? sz - Math.sign(sz) : sz, 'stand');
    });
    for (const [dx, dz] of [[2, 0], [-2, 0]]) stool(dx, dz);
    put(0, 3, 1, B.CRATE); put(0, -3, 1, B.BARREL);
  } else {
    // souvenir kiosk: shelved booth with a counter, trophy plinths, benches
    for (let dz = -1; dz <= 1; dz++) { put(-1, dz, 1, B.SHELF); put(-1, dz, 2, dz === 0 ? B.CHEST : B.BOOKSHELF); }
    for (const dx of [-1, 0]) { put(dx, -2, 1, B.SHELF); put(dx, -2, 2, B.SHELF); put(dx, 2, 1, B.SHELF); put(dx, 2, 2, B.CRATE); }
    put(1, -1, 1, B.PANEL_BLACK); put(1, -1, 2, B.STONE_BRICK_SLAB); put(1, 1, 1, B.PANEL_BLACK); put(1, 1, 2, B.STONE_BRICK_SLAB);
    put(1, 0, 1, B.PANEL_BLACK); put(1, 0, 2, B.GOLD_BLOCK);
    for (let dx = -1; dx <= 1; dx++) put(dx, 0, 3, B.HOLO_SIGN);
    work(0, 0, 'vendor'); spot(2, 0, 'stand'); spot(2, 1, 'stand');
    for (const [px, pz] of [[-4, -3], [-4, 3], [4, -4], [4, 4]]) { put(px, pz, 1, B.SMOOTH_STONE); put(px, pz, 2, rng.pick([B.COBBLESTONE, B.GOLD_BLOCK, B.CHROME, B.IRON_BLOCK])); put(px, pz, 3, B.GLOW_PANEL_BLUE); }
    for (const [dx, dz] of [[-3, 5], [-2, 5], [2, -5], [3, -5]]) stool(dx, dz);
  }
  bp.room(kind, cx - R0, 1, cz - R0, cx + R0, cz + R0);
}

// ---------------------------------------------------------------------------------------------------- rotunda
function buildRotunda(bp, o) {
  const { cx, cz, R, dir, kind, up, rng, set, get, fill, isFree, disc, seatAt, lampPost } = o;
  const X = (u) => cx + dir * u, Z = (v) => cz + v;
  const sector = (dx, dz) => Math.floor(wrap(Math.atan2(dz, dx)) / (TAU / 16));
  // floor
  disc(cx, cz, R, (x, z, dx, dz, q) => {
    const d = Math.floor(Math.sqrt(q));
    set(x, 0, z, q <= 2 ? B.DECK_PLATE : (d & 1) ? B.STONE_BRICKS : B.SMOOTH_STONE);
  });
  // drum wall (y 1..9): plinth, two window rows in alternate sectors, floor band, cornice
  disc(cx, cz, R, (x, z, dx, dz, q) => {
    if (inR(q, R - 1)) return;
    const lit = sector(dx, dz) % 2 === 1;
    set(x, 1, z, B.DURASTEEL_DARK);
    for (let y = 2; y <= 3; y++) set(x, y, z, lit ? B.WINDOW_LIT : B.STONE_BRICKS);
    set(x, 4, z, B.STONE_BRICKS);
    set(x, 5, z, B.PANEL_STRIPE);
    for (let y = 6; y <= 8; y++) set(x, y, z, lit && y <= 8 ? B.WINDOW_LIT : B.STONE_BRICKS);
    set(x, 9, z, B.DURASTEEL_DARK);
  });
  // upper floor slab (y 5) with lit tiles, carved over the stair
  disc(cx, cz, R - 1, (x, z, dx, dz, q) => {
    let id = inR(q, R - 2) ? B.SPRUCE_PLANKS : B.DECK_PLATE;
    if ((dx + 40) % 4 === 0 && (dz + 40) % 4 === 0) id = B.GLOW_PANEL;
    set(x, 5, z, id);
  });
  // dome (y 10 ..): 1.5-thick shell, ribs in even sectors, lit slits low in odd sectors, glow cap + lamp finial
  const yD = 10;
  for (let k = 0; k <= R; k++) {
    const rOut = Math.sqrt(Math.max(0, R * R - k * k));
    const inner2 = (R - 1.5) * (R - 1.5) - k * k, rIn = inner2 > 0 ? Math.sqrt(inner2) : -1;
    disc(cx, cz, rOut, (x, z, dx, dz, q) => {
      if (rIn >= 0 && inR(q, rIn)) return;
      const s = sector(dx, dz);
      let id;
      if (k >= R - 1 || q === 0) id = (k === R || q <= 1) ? B.GLOW_PANEL : B.WINDOW_LIT;   // lit lantern cap
      else if (s % 2 === 0) id = B.DURASTEEL_DARK;
      else id = k <= R * 0.75 ? B.WINDOW_LIT : B.PANEL_BLACK;
      set(x, yD + k, z, id);
    });
  }
  set(cx, yD + R + 1, cz, B.CITY_LAMP);
  // entrance (3 wide, 3 high, chrome frame, holo name sign), porch canopy, lit path
  for (let v = -1; v <= 1; v++) { for (let y = 1; y <= 3; y++) set(X(R), y, Z(v), FORCE_AIR); set(X(R), 4, Z(v), B.CHROME); set(X(R), 6, Z(v), B.HOLO_SIGN); }
  for (const v of [-2, 2]) fill(X(R), 1, Z(v), X(R), 4, Z(v), B.CHROME);
  for (const v of [-2, 2]) fill(X(R + 2), 1, Z(v), X(R + 2), 3, Z(v), B.DURASTEEL);
  for (let u = R + 1; u <= R + 2; u++) for (let v = -2; v <= 2; v++) set(X(u), 4, Z(v), v === 0 ? B.GLOW_PANEL : B.PANEL_BLACK);
  for (let u = R + 1; u <= R + 4; u++) for (let v = -1; v <= 1; v++) set(X(u), 0, Z(v), v === 0 && u === R + 3 ? B.GLOW_PANEL : B.SMOOTH_STONE);
  lampPost(X(R + 3), Z(-3)); lampPost(X(R + 3), Z(3));
  bp.door(X(R), 1, Z(0), dir > 0 ? 'E' : 'W');

  // stair: two-wide half-step flight along the wall opposite the entrance, k = 0..9 from v = -5 to v = 4
  const su = [-(R - 3), -(R - 4)];
  for (const u of su) for (let k = 0; k < 10; k++) {
    const v = -5 + k;
    if (k & 1) set(X(u), 1 + (k - 1) / 2, Z(v), STEP_FULL); else set(X(u), 1 + k / 2, Z(v), STEP_SLAB);
    if (k >= 4) set(X(u), 5, Z(v), FORCE_AIR);
  }
  for (let v = -1; v <= 4; v++) { set(X(-(R - 5)), 6, Z(v), B.IRON_BARS); set(X(-(R - 2)), 6, Z(v), B.IRON_BARS); }
  for (const u of su) set(X(u), 6, Z(-2), B.IRON_BARS);
  set(X(-(R - 5)), 7, Z(4), B.LANTERN);

  // ---- furnishing helpers (u toward the entrance, v across)
  const put = (u, v, y, id) => { const q = u * u + v * v; if (!inR(q, R - 1)) return false; if (!isFree(X(u), y, Z(v))) return false; set(X(u), y, Z(v), id); return true; };
  const spot = (u, v, y, kind = 'stand') => bp.spot(X(u), y, Z(v), kind);
  const work = (u, v, y, kind) => bp.work(X(u), y, Z(v), kind);
  const seat = (u, v, y, id = B.STONE_BRICK_SLAB) => { if (put(u, v, y, id)) spot(u, v, y, 'seat'); };
  const table = (u, v, y) => put(u, v, y, B.TABLE);
  const plinth = (u, v, y, item, cap = B.GLASS) => { if (put(u, v, y, B.SMOOTH_STONE)) { put(u, v, y + 1, item); if (cap) put(u, v, y + 2, cap); } };
  const lampStand = (u, v, y) => { if (put(u, v, y, B.DURASTEEL_DARK)) put(u, v, y + 1, B.LANTERN); };
  const wallPanel = (y, id, every = 4, offset = 0) => disc(cx, cz, R, (x, z, dx, dz, q) => { if (inR(q, R - 1)) return; const s = sector(dx, dz); if (s % every === offset && get(x, y, z) === B.STONE_BRICKS) set(x, y, z, id); });
  const hang = (u, v, id = B.LANTERN) => put(u, v, 4, id);   // hanging from the y 5 slab

  // chandelier under the dome for the upper room
  for (let y = yD + 6; y >= yD + 4; y--) set(cx, y, cz, B.IRON_BARS);
  set(cx, yD + 3, cz, B.CHROME);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) set(cx + dx, yD + 3, cz + dz, B.LANTERN);
  set(cx, yD + 2, cz, B.GLOW_PANEL);

  if (kind === 'museum') {
    // central model of the Umate rock on a plinth, ore vitrines around, info holos, curator desk, benches
    for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) put(u, v, 1, B.SMOOTH_STONE);
    put(0, 0, 2, B.STONE); put(0, 0, 3, B.COBBLESTONE); put(0, 0, 4, B.STONE);
    put(1, 0, 2, B.COBBLESTONE); put(-1, 0, 2, B.GRAVEL); put(0, 1, 2, B.COARSE_DIRT); put(0, -1, 2, B.STONE); put(1, 1, 2, B.TALL_GRASS);
    for (const [u, v] of [[-2, 0], [2, 0]]) set(X(u), 5, Z(v), B.GLOW_PANEL_BLUE);
    const ores = [B.GOLD_ORE, B.IRON_ORE, B.COAL_ORE, B.GOLD_BLOCK, B.GRAVEL, B.COARSE_DIRT, B.CHROME, B.STONE];
    [[-2, -5], [-2, 5], [2, -5], [2, 5], [5, -4], [5, 4], [1, -3], [1, 3]].forEach(([u, v], i) => { plinth(u, v, 1, ores[i % ores.length]); set(X(u), 5, Z(v), B.GLOW_PANEL); });
    wallPanel(2, B.HOLO_SIGN, 4, 0);
    table(4, 4, 1); put(5, 4, 1, B.CONSOLE); seat(4, 5, 1); work(4, 5, 1, 'curator');
    seat(-2, 2, 1); seat(-2, -2, 1); seat(3, -1, 1); seat(3, 1, 1);
    work(0, -3, 1, 'guide'); spot(-3, 3, 1); spot(3, -3, 1);
    hang(-3, -3); hang(3, -3); hang(-3, 3); hang(3, 3);
    put(-2, 6, 1, B.BOOKSHELF); put(2, 6, 1, B.CHEST);
  } else if (kind === 'cantina') {
    // bar with bottle wall, stools, stage with piano and spotlights, booths, tables
    for (let u = -2; u <= 2; u++) { put(u, 3, 1, B.PANEL_BLACK); put(u, 3, 2, B.STONE_BRICK_SLAB); }
    for (let u = -2; u <= 4; u++) { put(u, 5, 1, B.SHELF); put(u, 5, 2, B.SHELF); put(u, 5, 3, u % 2 ? B.HOLO_SIGN : B.PANEL_BLACK); }
    for (let u = -2; u <= 2; u++) { put(u, 6, 1, B.SHELF); put(u, 6, 2, B.SHELF); }
    put(3, 4, 1, B.BARREL); put(4, 4, 1, B.CRATE); put(3, 3, 1, B.PANEL_BLACK); put(3, 3, 2, B.STONE_BRICK_SLAB);
    for (const u of [-2, 0, 2]) seat(u, 2, 1);
    work(0, 4, 1, 'bartender'); work(-2, 4, 1, 'bartender');
    // stage
    for (let u = -2; u <= 2; u++) for (let v = -5; v <= -4; v++) put(u, v, 1, B.SPRUCE_PLANKS);
    put(-1, -5, 2, B.PIANO); put(2, -5, 2, B.GLOW_PANEL_BLUE);
    work(1, -5, 2, 'musician'); spot(0, -4, 2, 'stand');
    set(X(-1), 5, Z(-4), B.GLOW_PANEL_BLUE); set(X(1), 5, Z(-4), B.GLOW_PANEL_BLUE);
    disc(cx, cz, R, (x, z, dx, dz, q) => { if (inR(q, R - 1)) return; if (dz <= -R + 2 && Math.abs(dx) <= 3) { set(x, 2, z, B.HOLO_SIGN); set(x, 3, z, B.HOLO_SIGN); } });
    // booths and tables
    for (const [u, v] of [[4, -3], [4, 3]]) { if (table(u, v, 1)) { seat(u, v + 1, 1, B.RED_WOOL); seat(u, v - 1, 1, B.RED_WOOL); } }
    for (const [u, v] of [[1, 0], [-1, -2]]) { if (table(u, v, 1)) { seat(u + 1, v, 1); seat(u - 1, v, 1); } }
    hang(-2, 0); hang(2, 0); hang(0, -2, B.GLOW_PANEL_BLUE);
    put(-2, 5, 3, B.HOLO_SIGN);
  } else if (kind === 'ticket_hall') {
    // ticket counters with consoles facing the door, queue rails, benches, holo map table, gift shelves, lift
    for (let v = -4; v <= 4; v++) { put(1, v, 1, B.PANEL_BLACK); put(1, v, 2, (v + 40) % 3 === 0 ? B.CONSOLE : B.STONE_BRICK_SLAB); }
    for (const v of [-3, 0, 3]) { work(0, v, 1, 'clerk'); spot(2, v, 1, 'stand'); }
    for (const u of [3, 4]) { put(u, -2, 1, B.IRON_BARS); put(u, 2, 1, B.IRON_BARS); }
    for (const [u, v] of [[3, -5], [4, -5], [3, 5], [4, 5], [-2, 3], [-2, 4]]) seat(u, v, 1);
    if (table(-2, 0, 1)) put(-2, 0, 2, B.GLOW_PANEL_BLUE);
    put(-2, 5, 1, B.SHELF); put(-2, 5, 2, B.SHELF); put(-1, 5, 1, B.SHELF); put(-1, 5, 2, B.CHEST); put(0, 5, 1, B.BARREL);
    put(5, -4, 1, B.PANEL_BLACK); put(5, -4, 2, B.HOLO_SIGN); put(5, -4, 3, B.HOLO_SIGN);
    put(5, 4, 1, B.DURASTEEL_DARK); put(5, 4, 2, B.OAK_LEAVES);
    wallPanel(2, B.HOLO_SIGN, 4, 2);
    hang(2, -3); hang(2, 3);
    // lift shaft (2x2 PANEL_BLACK, chrome doors + blue call markers on both levels)
    const lu0 = -2, lv0 = -5;
    for (let u = lu0; u <= lu0 + 1; u++) for (let v = lv0; v <= lv0 + 1; v++) fill(X(u), 1, Z(v), X(u), 9, Z(v), B.PANEL_BLACK);
    for (let u = lu0; u <= lu0 + 1; u++) for (const lvl of [1, 6]) { set(X(u), lvl, Z(lv0 + 1), B.CHROME); set(X(u), lvl + 1, Z(lv0 + 1), B.CHROME); set(X(u), lvl + 2, Z(lv0 + 1), B.GLOW_PANEL_BLUE); }
    const lx = Math.min(X(lu0), X(lu0 + 1)), lz = Z(lv0);
    bp.lift(lx, lz, 1, 6);
  } else {
    // lecture room: curved holo screen, podium with lectern, seat rows facing it, bookshelves
    disc(cx, cz, R, (x, z, dx, dz, q) => { if (inR(q, R - 1)) return; if (dz <= -R + 2 && Math.abs(dx) <= 3) { set(x, 2, z, B.HOLO_SIGN); set(x, 3, z, B.HOLO_SIGN); } });
    for (let u = -1; u <= 1; u++) for (let v = -5; v <= -4; v++) put(u, v, 1, B.PANEL_BLACK);
    put(0, -4, 2, B.CONSOLE); work(0, -5, 2, 'lecturer');
    for (const v of [-2, 0, 2, 4]) for (const u of [-2, -1, 1, 2, 3]) { if (u === 3 && v < 2) continue; seat(u, v, 1); }
    put(4, -3, 1, B.BOOKSHELF); put(4, -3, 2, B.BOOKSHELF); put(4, 3, 1, B.BOOKSHELF); put(4, 3, 2, B.BOOKSHELF);
    for (const v of [-3, -1, 1, 3]) set(X(0), 5, Z(v), B.GLOW_PANEL_BLUE);
    hang(3, -3); hang(3, 3); hang(-2, -3);
    put(-2, 5, 1, B.CHEST); put(2, 5, 1, B.CRATE);
  }
  bp.room(kind, cx - R + 1, 1, cz - R + 1, cx + R - 1, cz + R - 1);

  // ---- upper room (walk y 6) under the dome
  const wallRow = (cb) => disc(cx, cz, R - 1, (x, z, dx, dz, q) => { if (inR(q, R - 2)) return; cb(dir * dx, dz, sector(dx, dz)); });
  lampStand(-1, -4, 6); lampStand(3, 4, 6); lampStand(3, -4, 6);
  if (up === 'archive_gallery') {
    wallRow((u, v, s) => { if (s % 2 === 0) { put(u, v, 6, B.BOOKSHELF); put(u, v, 7, B.BOOKSHELF); } else if (Math.abs(v) > 1 || u > 0) seat(u, v, 6, B.SPRUCE_SLAB); });
    for (const [u, v] of [[1, -2], [1, 2]]) { if (table(u, v, 6)) { seat(u + 1, v, 6); seat(u - 1, v, 6); } }
    plinth(4, 0, 6, B.GOLD_BLOCK); plinth(-1, 0, 6, B.IRON_ORE); plinth(1, 0, 6, B.GOLD_ORE, null);
    work(3, -2, 6, 'archivist'); spot(0, 3, 6);
  } else if (up === 'lounge') {
    wallRow((u, v, s) => { if (s % 2 === 0 && Math.abs(v) > 1) { seat(u, v, 6, B.RED_WOOL); } else if (s % 4 === 1) put(u, v, 7, B.HOLO_SIGN); });
    for (const [u, v] of [[3, -3], [3, 3], [0, 4]]) table(u, v, 6);
    for (let u = -1; u <= 2; u++) { put(u, 0, 6, B.PANEL_BLACK); put(u, 0, 7, B.STONE_BRICK_SLAB); }
    put(-1, 1, 6, B.SHELF); put(-1, 1, 7, B.SHELF); put(0, 1, 6, B.BARREL); work(1, 1, 6, 'bartender');
    for (const u of [-1, 1]) seat(u, -1, 6);
    if (table(1, -3, 6)) put(1, -3, 7, B.GLOW_PANEL_BLUE);
    spot(3, 0, 6);
  } else if (up === 'plaza_office') {
    // administration desks, holo wall map, storage, and the night guard's bunk
    for (const [u, v] of [[2, -3], [2, 0], [2, 3]]) { if (table(u, v, 6)) { put(u + 1, v, 6, B.CONSOLE); seat(u - 1, v, 6); work(u - 1, v, 6, 'officer'); } }
    wallRow((u, v, s) => { if (s % 2 === 0 && v < 0 && u > -3) put(u, v, 7, B.HOLO_SIGN); else if (s % 4 === 3 && u > -3) { put(u, v, 6, B.CHEST); } });
    put(-1, 4, 6, B.BOOKSHELF); put(-1, 4, 7, B.BOOKSHELF); put(0, 4, 6, B.BOOKSHELF); put(0, 4, 7, B.BOOKSHELF);
    if (isFree(X(4), 6, Z(4)) && isFree(X(4), 6, Z(5))) { set(X(4), 6, Z(5), B.BED_HEAD); set(X(4), 6, Z(4), B.BED_FOOT); bp.bed(X(5), 6, Z(4)); }
    if (isFree(X(4), 6, Z(-4)) && isFree(X(4), 6, Z(-5))) { set(X(4), 6, Z(-5), B.BED_HEAD); set(X(4), 6, Z(-4), B.BED_FOOT); bp.bed(X(5), 6, Z(-4)); }
    put(5, 0, 6, B.CHEST); put(-2, -3, 6, B.CRATE);
    spot(0, 0, 6);
  } else {
    // observation gallery: benches under the windows, star-map table, telescope, shelves
    wallRow((u, v, s) => { if (s % 2 === 1 && Math.abs(v) > 1 && u > -3) seat(u, v, 6, B.SPRUCE_SLAB); });
    if (table(0, 0, 6)) put(0, 0, 7, B.GLOW_PANEL_BLUE);
    put(3, -3, 6, B.IRON_BARS); put(3, -3, 7, B.CONSOLE); work(2, -3, 6, 'astronomer');
    put(3, 3, 6, B.BOOKSHELF); put(3, 3, 7, B.BOOKSHELF); put(2, 4, 6, B.BOOKSHELF);
    for (const [u, v] of [[-1, -2], [1, 2]]) seat(u, v, 6);
    spot(1, -1, 6);
  }
  bp.room(up, cx - R + 2, 6, cz - R + 2, cx + R - 2, cz + R - 2);
}

// ---------------------------------------------------------------------------------------------------- furniture
function buildFurniture(bp, o) {
  const { W, D, CX, CZ, RIM_D, rng, set, isFree, fill, lampPost, seatAt, rim } = o;
  const free3 = (x, z, r = 1) => { for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { if (rim(x + dx, z + dz) < RIM_D + 1) return false; for (let y = 1; y <= 4; y++) if (!isFree(x + dx, y, z + dz)) return false; } return true; };
  const inAvenue = (x, z) => Math.abs(x - CX) <= 6 && z > CZ + 20;

  // fountains on the diagonals between the pool walk and the pavilions
  for (let k = 0; k < 4; k++) {
    const a = TAU / 8 + k * TAU / 4, fx = Math.round(CX + 30 * Math.cos(a)), fz = Math.round(CZ + 30 * Math.sin(a));
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
      const m = Math.max(Math.abs(dx), Math.abs(dz));
      if (m === 3) { set(fx + dx, 1, fz + dz, B.SMOOTH_STONE); if (Math.abs(dx) === 3 && Math.abs(dz) === 3) { set(fx + dx, 2, fz + dz, B.STONE_BRICKS); set(fx + dx, 3, fz + dz, B.LANTERN); } }
      else if (m === 2) { set(fx + dx, 0, fz + dz, ((dx + dz) & 1) ? B.GLOW_PANEL_BLUE : B.CHROME); set(fx + dx, 1, fz + dz, B.WATER); }
      else set(fx + dx, 1, fz + dz, B.CHROME);
    }
    set(fx, 2, fz, B.CHROME); set(fx, 3, fz, B.GLOW_PANEL_BLUE); set(fx, 4, fz, B.IRON_BARS); set(fx, 5, fz, B.WATER);
    for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) set(fx + dx, 2, fz + dz, B.WATER);
    for (const [sx, sz] of [[0, 5], [0, -5], [5, 0], [-5, 0]]) {
      const bx = fx + sx, bz = fz + sz;
      if (sx === 0) { seatAt(bx - 1, 1, bz); seatAt(bx, 1, bz); seatAt(bx + 1, 1, bz); } else { seatAt(bx, 1, bz - 1); seatAt(bx, 1, bz); seatAt(bx, 1, bz + 1); }
    }
  }
  // planters with trees on a ring of 16, benches beside them, holo totems on a ring of 8
  const tree = (x, z, kind) => {
    const [log, leaf] = kind === 0 ? [B.OAK_LOG, B.OAK_LEAVES] : kind === 1 ? [B.SPRUCE_LOG, B.SPRUCE_LEAVES] : [B.BIRCH_LOG, B.BIRCH_LEAVES];
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) set(x + dx, 1, z + dz, dx === 0 && dz === 0 ? B.COARSE_DIRT : B.DURASTEEL_DARK);
    set(x + 1, 1, z + 1, B.TALL_GRASS); set(x - 1, 1, z - 1, B.TALL_GRASS);
    set(x + 1, 2, z + 1, B.TALL_GRASS); set(x - 1, 2, z - 1, B.TALL_GRASS);
    const h = kind === 1 ? 5 : 4;
    fill(x, 2, z, x, h, z, log);
    fill(x - 1, h - 1, z - 1, x + 1, h, z + 1, leaf);
    if (kind === 1) { set(x, h + 1, z, leaf); set(x, h + 2, z, leaf); } else { set(x, h + 1, z, leaf); set(x + 1, h + 1, z, leaf); set(x, h + 1, z - 1, leaf); }
    fill(x, 2, z, x, h, z, log);
  };
  for (let i = 0; i < 16; i++) {
    const a = i * TAU / 16, x = Math.round(CX + 64 * Math.cos(a)), z = Math.round(CZ + 64 * Math.sin(a));
    if (inAvenue(x, z) || !free3(x, z, 2)) continue;
    tree(x, z, i % 3);
    const along = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a));   // bench tangent to the ring
    if (along) { seatAt(x - 2, 1, z - 1); seatAt(x - 2, 1, z); seatAt(x - 2, 1, z + 1); seatAt(x + 2, 1, z - 1); seatAt(x + 2, 1, z); seatAt(x + 2, 1, z + 1); }
    else { seatAt(x - 1, 1, z - 2); seatAt(x, 1, z - 2); seatAt(x + 1, 1, z - 2); seatAt(x - 1, 1, z + 2); seatAt(x, 1, z + 2); seatAt(x + 1, 1, z + 2); }
  }
  const totem = (x, z) => { set(x, 1, z, B.PANEL_BLACK); set(x, 2, z, B.PANEL_BLACK); set(x, 3, z, B.HOLO_SIGN); set(x, 4, z, B.HOLO_SIGN); set(x, 5, z, B.HOLO_SIGN); set(x, 6, z, B.GLOW_PANEL_BLUE); bp.spot(x + 1, 1, z, 'stand'); };
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8, x = Math.round(CX + 56 * Math.cos(a)), z = Math.round(CZ + 56 * Math.sin(a));
    if (inAvenue(x, z) || !free3(x, z, 1)) continue;
    totem(x, z);
  }
  // statue: plinth, iron figure with chrome head, uplight
  const statue = (x, z, tall = false) => {
    set(x, 1, z, B.STONE_BRICKS); set(x, 2, z, B.SMOOTH_STONE); set(x, 3, z, B.IRON_BLOCK); set(x, 4, z, B.IRON_BLOCK); set(x, 5, z, B.CHROME);
    if (tall) { set(x, 6, z, B.IRON_BLOCK); set(x, 7, z, B.CHROME); }
    set(x + 1, 0, z, B.GLOW_PANEL); set(x - 1, 0, z, B.GLOW_PANEL);
  };
  // avenue: alternating statues, trees and lamp posts on both sides
  let n = 0;
  for (let z = CZ + 27; z < D - RIM_D - 4; z += 8, n++) for (const sgn of [-1, 1]) {
    const x = CX + sgn * 7;
    if (n % 3 === 0) statue(x, z);
    else if (n % 3 === 1) { if (free3(x, z, 1)) tree(x, z, 2); }
    else { lampPost(x, z); seatAt(x + sgn, 1, z - 1); seatAt(x + sgn, 1, z + 1); }
  }
  // statue court on the free pavilion slot (east side): raised dais with a tall statue, uplights and lamps
  const a8 = 15 * TAU / 360, sx = Math.round(CX + 44 * Math.cos(a8)), sz = Math.round(CZ + 44 * Math.sin(a8));
  for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
    const m = Math.max(Math.abs(dx), Math.abs(dz));
    if (m === 4) set(sx + dx, 1, sz + dz, B.STONE_BRICK_SLAB);
    else set(sx + dx, 1, sz + dz, ((dx + dz) & 1) ? B.STONE_BRICKS : B.SMOOTH_STONE);
  }
  for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) set(sx + dx, 1, sz + dz, B.GLOW_PANEL);
  fill(sx - 1, 2, sz - 1, sx + 1, 2, sz + 1, B.SMOOTH_STONE);
  set(sx, 3, sz, B.IRON_BLOCK); set(sx, 4, sz, B.IRON_BLOCK); set(sx, 5, sz, B.IRON_BLOCK); set(sx, 6, sz, B.CHROME); set(sx + 1, 4, sz, B.GOLD_BLOCK); set(sx - 1, 4, sz, B.GOLD_BLOCK);
  for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) lampPost(sx + dx, sz + dz, 2);
  for (const [dx, dz] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) { seatAt(sx + dx, 2, sz + dz); bp.spot(sx + dx, 2, sz + dz, 'stand'); }
  // benches around the pool walk between the causeways
  for (let k = 0; k < 8; k++) {
    const a = k * TAU / 8 + TAU / 16, x = Math.round(CX + 18.5 * Math.cos(a)), z = Math.round(CZ + 18.5 * Math.sin(a));
    const along = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a));
    if (along) { seatAt(x, 1, z - 1); seatAt(x, 1, z); seatAt(x, 1, z + 1); } else { seatAt(x - 1, 1, z); seatAt(x, 1, z); seatAt(x + 1, 1, z); }
  }
  // scattered lamp posts on the open paving (world-grid style, skipping anything already built)
  for (let x = 12; x < W - 12; x += 12) for (let z = 12; z < D - 12; z += 12) {
    const d = Math.hypot(x - CX, z - CZ);
    if (d < 24 || inAvenue(x, z) || !free3(x, z, 1) || rng.chance(0.35)) continue;
    lampPost(x, z);
  }
}
