// Clipped block writer for one chunk plus the small drawing helpers the spaceport painters share. Everything is a
// pure function of world coordinates (hash-based variation), so every chunk is identical on every load and client.
import { B } from '../../blocks.js';
import { CHUNK_SIZE as CS, CHUNK_HEIGHT as CH } from '../../constants.js';

const max = Math.max, min = Math.min;

export class Painter {
  constructor(chunk) {
    this.b = chunk.blocks;
    this.x0 = chunk.cx * CS; this.z0 = chunk.cz * CS; this.x1 = this.x0 + CS - 1; this.z1 = this.z0 + CS - 1;
  }
  overlaps(x0, z0, x1, z1) { return !(x1 < this.x0 || x0 > this.x1 || z1 < this.z0 || z0 > this.z1); }
  overlapsRect(r) { return this.overlaps(r.x0, r.z0, r.x1, r.z1); }
  set(x, y, z, id) {
    const lx = x - this.x0, lz = z - this.z0;
    if (lx < 0 || lz < 0 || lx >= CS || lz >= CS || y < 0 || y >= CH) return;
    this.b[(lx * CS + lz) * CH + y] = id;
  }
  get(x, y, z) {
    const lx = x - this.x0, lz = z - this.z0;
    if (lx < 0 || lz < 0 || lx >= CS || lz >= CS || y < 0 || y >= CH) return -1;
    return this.b[(lx * CS + lz) * CH + y];
  }
  // inclusive box, clipped
  box(x0, y0, z0, x1, y1, z1, id) {
    const ax0 = max(x0, this.x0), ax1 = min(x1, this.x1), az0 = max(z0, this.z0), az1 = min(z1, this.z1);
    if (ax0 > ax1 || az0 > az1) return;
    const by0 = max(0, y0), by1 = min(CH - 1, y1);
    for (let x = ax0; x <= ax1; x++) for (let z = az0; z <= az1; z++) {
      const base = ((x - this.x0) * CS + (z - this.z0)) * CH;
      for (let y = by0; y <= by1; y++) this.b[base + y] = id;
    }
  }
  col(x, z, y0, y1, id) { this.box(x, y0, z, x, y1, z, id); }
  // walls of a box (no floor / ceiling)
  walls(x0, y0, z0, x1, y1, z1, id) {
    this.box(x0, y0, z0, x0, y1, z1, id); this.box(x1, y0, z0, x1, y1, z1, id);
    this.box(x0, y0, z0, x1, y1, z0, id); this.box(x0, y0, z1, x1, y1, z1, id);
  }
  // one-layer rectangle outline
  ring(x0, y, z0, x1, z1, id) { this.walls(x0, y, z0, x1, y, z1, id); }
  // solid cylinder around the block corner (cx, cz) (cells whose centre is within r), clipped
  cyl(cx, cz, r, y0, y1, id) {
    const R = Math.ceil(r);
    const ax0 = max(cx - R, this.x0), ax1 = min(cx + R, this.x1), az0 = max(cz - R, this.z0), az1 = min(cz + R, this.z1);
    for (let x = ax0; x <= ax1; x++) for (let z = az0; z <= az1; z++) {
      const dx = x + 0.5 - cx, dz = z + 0.5 - cz;
      if (dx * dx + dz * dz <= r * r) this.col(x, z, y0, y1, id);
    }
  }
  xRange(x0, x1) { return [max(x0, this.x0), min(x1, this.x1)]; }
  zRange(z0, z1) { return [max(z0, this.z0), min(z1, this.z1)]; }
  // iterate the clipped cells of an inclusive rect: fn(x, z)
  each(x0, z0, x1, z1, fn) {
    const ax0 = max(x0, this.x0), ax1 = min(x1, this.x1), az0 = max(z0, this.z0), az1 = min(z1, this.z1);
    for (let x = ax0; x <= ax1; x++) for (let z = az0; z <= az1; z++) fn(x, z);
  }
}

// Block shorthands shared by the painters.
export const M = {
  D: B.DURASTEEL, DD: B.DURASTEEL_DARK, PLATE: B.DECK_PLATE, STR: B.PANEL_STRIPE, GL: B.STEEL_GLASS,
  GLOW: B.GLOW_PANEL, BLUE: B.GLOW_PANEL_BLUE, LAMP: B.CITY_LAMP, HOLO: B.HOLO_SIGN, CON: B.CONSOLE,
  CHR: B.CHROME, RED: B.PANEL_RED, BLK: B.PANEL_BLACK, VENT: B.VENT, SLAB: B.STONE_BRICK_SLAB, HP: B.HULL_PLATE,
  AIR: B.AIR, BARS: B.IRON_BARS, CRATE: B.CRATE, BARREL: B.BARREL, SHELF: B.SHELF, TABLE: B.TABLE, SIGN: B.WALL_SIGN,
  ANVIL: B.ANVIL, FURNACE: B.FURNACE,
};
// Floor markings on the dark deck plate: PANEL_STRIPE only shows its stripes on side faces (its top is dark
// durasteel), so flush markings use light durasteel lines and red hazard cells; PANEL_STRIPE is used for kerbs.
export const LINE = B.DURASTEEL;

// 3x5 pixel digits 0..9 (row-major, top row first) for painted pad / gate numbers.
const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
export function paintDigit(p, n, x0, y, z0, id, flip = false) {
  const d = DIGITS[n];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (d[r * 3 + c] === '1') {
    if (flip) p.set(x0 + 2 - c, y, z0 + 4 - r, id); else p.set(x0 + c, y, z0 + r, id);
  }
}
// A number (1..99) as flat digits, 4 cells per digit
export function paintNumber(p, n, x0, y, z0, id, flip = false) {
  const s = String(n);
  for (let i = 0; i < s.length; i++) paintDigit(p, +s[i], x0 + (flip ? (s.length - 1 - i) : i) * 4, y, z0, id, flip);
}
// The same digits on a vertical wall facing +x or -x (columns along z), lit panels on a dark backing
export function wallDigit(p, n, x, y0, z0, id, back) {
  const d = DIGITS[n];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) p.set(x, y0 + 4 - r, z0 + c, d[r * 3 + c] === '1' ? id : back);
}
export function wallNumber(p, n, x, y0, z0, id, back) {
  const s = String(n);
  for (let i = 0; i < s.length; i++) wallDigit(p, +s[i], x, y0, z0 + i * 4, id, back);
  return s.length * 4 - 1;
}

// A lamp post: dark post with a city lamp on top (standing on the surface `y`).
export function lampPost(p, x, z, y, h = 3) { p.col(x, z, y, y + h - 1, M.DD); p.set(x, y + h, z, M.LAMP); }

// Glass balustrade: striped kerb + glass on the surface `y`
export function kerb(p, x, z, y) { p.set(x, y, z, M.STR); p.set(x, y + 1, z, M.GL); }

// Half-block stair along +x or -x: `n` steps starting at (x0, z0..z1) at walking level `top` going DOWN by 0.5 per
// cell in direction dir (+1 / -1). Paints the treads (slab / block pairs) and clears head room above them.
export function halfStair(p, x0, z0, z1, top, n, dir) {
  for (let i = 0; i < n; i++) {
    const x = x0 + i * dir, h = top - 0.5 * (i + 1);        // walking level on this cell
    const yTop = Math.floor(h), half = h !== yTop;
    for (let z = z0; z <= z1; z++) {
      if (half) { p.set(x, yTop, z, M.SLAB); p.set(x, yTop - 1, z, M.DD); }
      else { p.set(x, yTop - 1, z, M.D); p.set(x, yTop - 2, z, M.DD); }
      for (let y = Math.ceil(h); y <= Math.floor(h + 2.4); y++) p.set(x, y, z, M.AIR);
    }
  }
}

// Switchback stair tower (caged) from walking level `topY` (a deck surface) down to `groundY` (feet level on the
// ground), flights along x inside the box x0 .. x0 + 15, z0 .. z0 + 5: landings at x0+1..2 and x0+13..14, two 2-wide
// flights (z0+1..2 eastbound, z0+3..4 westbound) of half-block steps over x0+3..12. A full flight drops 5 blocks;
// the first flight is shortened so the last landing meets the ground exactly. Painted after the deck: the steps cut
// their head room through it. Returns the ground exit side ('W' / 'E').
export const TOWER_W = 16, TOWER_D = 6;
export function switchbackTower(p, x0, z0, topY, groundY, { cage = true, lit = true } = {}) {
  const x1 = x0 + TOWER_W - 1, z1 = z0 + TOWER_D - 1;
  if (!p.overlaps(x0, z0, x1, z1)) return null;
  if (cage) {
    for (let y = groundY; y < topY - 1; y++) {
      for (let x = x0; x <= x1; x++) for (const z of [z0, z1]) p.set(x, y, z, (x === x0 || x === x1 || (x - x0) % 5 === 0) ? M.DD : M.BARS);
      for (let z = z0 + 1; z <= z1 - 1; z++) for (const x of [x0, x1]) p.set(x, y, z, M.DD);
    }
  }
  let level = topY, f = 0, exitEast = true;
  const flight = (east, steps) => {
    const zs = east ? [z0 + 1, z0 + 2] : [z0 + 3, z0 + 4];
    for (let i = 1; i <= steps; i++) {
      const h = level - 0.5 * i, x = east ? x0 + 12 - steps + i : x0 + 3 + steps - i, yTop = Math.floor(h);
      for (const z of zs) {
        if (h === yTop) { p.set(x, yTop - 1, z, M.D); p.set(x, yTop - 2, z, M.DD); }
        else { p.set(x, yTop, z, M.SLAB); p.set(x, yTop - 1, z, M.DD); }
        for (let y = Math.ceil(h); y <= Math.floor(h + 2.4); y++) p.set(x, y, z, M.AIR);
      }
    }
    level -= steps / 2;
    const lx = east ? [x0 + 13, x0 + 14] : [x0 + 1, x0 + 2];
    for (const x of lx) for (let z = z0 + 1; z <= z1 - 1; z++) { p.set(x, level - 1, z, M.PLATE); p.set(x, level - 2, z, M.DD); for (let y = level; y <= level + 2; y++) p.set(x, y, z, M.AIR); }
    if (lit) p.set(east ? x1 : x0, level + 2, z0 + 2, M.GLOW);
    exitEast = east; f++;
  };
  const rem = (topY - groundY) % 5;
  if (rem) flight(true, rem * 2);
  while (level > groundY && f < 40) flight(f % 2 === 0, 10);
  // railing round the stairwell opening on the deck
  for (let x = x0 + 2; x <= x0 + 13; x++) { p.set(x, topY, z0, M.GL); p.set(x, topY, z0 + 3, M.GL); }
  for (const z of [z0 + 1, z0 + 2]) p.set(x0 + 13, topY, z, M.GL);
  // ground floor plate and the exit in the end wall the last flight arrives at
  p.box(x0 + 1, groundY - 1, z0 + 1, x1 - 1, groundY - 1, z1 - 1, M.PLATE);
  const ex = exitEast ? x1 : x0;
  for (let z = z0 + 1; z <= z1 - 1; z++) for (let y = groundY; y <= groundY + 2; y++) p.set(ex, y, z, M.AIR);
  p.set(ex, groundY + 3, z0 + 2, M.GLOW);
  return exitEast ? 'E' : 'W';
}
