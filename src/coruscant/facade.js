// Facade styles and painters. A style is drawn per building from the family + district + seed so no two towers
// share materials, window rhythm, ornament cadence and crown; the painters write one floor of exterior wall for
// a ring of cells (rect footprints via rectRing, arbitrary footprints via maskRing).
import { B } from '../blocks.js';
import { hash3 } from '../rng.js';

const WALLS = {
  slab: [B.DURASTEEL, B.DURASTEEL_DARK, B.PANEL_BLACK, B.HULL_PLATE],
  setback: [B.DURASTEEL, B.PLASTER, B.SMOOTH_STONE, B.HULL_PLATE],
  habitat: [B.DURASTEEL, B.HULL_PLATE, B.PLASTER],
  stack: [B.DURASTEEL_DARK, B.HULL_PLATE, B.HULL_TRENCH],
  twin: [B.DURASTEEL, B.PANEL_BLACK, B.DURASTEEL_DARK],
  pad: [B.DURASTEEL_DARK, B.DURASTEEL, B.HULL_PLATE],
  hall: [B.SMOOTH_STONE, B.DURASTEEL, B.PLASTER],
  civic: [B.SMOOTH_STONE, B.DURASTEEL, B.PLASTER],
};
const RHYTHM = {
  slab: ['curtain', 'grid', 'punched'],
  setback: ['punched', 'grid', 'ribbon'],
  habitat: ['ribbon', 'punched'],
  stack: ['industrial'],
  twin: ['curtain', 'slit'],
  pad: ['grid', 'industrial', 'punched'],
  hall: ['punched', 'slit'],
  civic: ['slit', 'curtain', 'grid'],
};
const CROWNS = {
  slab: ['antenna', 'fins', 'mech', 'halo'],
  setback: ['halo', 'antenna', 'fins'],
  habitat: ['halo', 'antenna', 'mech'],
  stack: ['mech', 'beacon'],
  twin: ['antenna', 'fins'],
  pad: ['beacon', 'antenna'],
  hall: ['halo'],
  civic: ['dome', 'fins'],
};
const LIT = { senate: 0.45, financial: 0.5, residential: 0.4, industrial: 0.25, entertainment: 0.6, market: 0.5, spaceport: 0.3 };
const WOOLS = [B.RED_WOOL, B.BLUE_WOOL, B.GREEN_WOOL, B.WHITE_WOOL];

export function makeStyle(family, district, rng) {
  const wall = rng.pick(WALLS[family] || WALLS.slab);
  const dark = wall === B.DURASTEEL_DARK || wall === B.PANEL_BLACK || wall === B.HULL_TRENCH;
  const corner = rng.pick(dark ? [B.CHROME, B.DURASTEEL, B.PANEL_STRIPE] : [B.DURASTEEL_DARK, B.CHROME, B.PANEL_BLACK]);
  const band = rng.pick(dark ? [B.PANEL_STRIPE, B.DURASTEEL, B.HULL_PLATE] : [B.DURASTEEL_DARK, B.PANEL_BLACK, B.PANEL_STRIPE, B.HULL_TRENCH]);
  const trim = rng.pick([B.CHROME, B.GOLD_BLOCK, B.PANEL_STRIPE, B.GLOW_PANEL]);
  const rhythm = rng.pick(RHYTHM[family] || RHYTHM.slab);
  return {
    family, district, wall, corner, band, trim,
    mullion: rng.pick([B.CHROME, B.DURASTEEL_DARK, corner]),
    floor: family === 'stack' ? B.DECK_PLATE : rng.pick([B.DURASTEEL, B.DECK_PLATE, B.SMOOTH_STONE, B.PANEL_BLACK]),
    roof: rng.pick([B.DURASTEEL_DARK, B.DECK_PLATE, B.HULL_PLATE]),
    coreWall: dark ? B.DURASTEEL : B.DURASTEEL_DARK,
    windowLit: B.WINDOW_LIT, windowDark: B.WINDOW_DARK,
    rhythm, period: rhythm === 'curtain' ? rng.pick([3, 4, 5]) : rng.pick([2, 3]),
    lit: Math.min(0.85, Math.max(0.15, (LIT[district] ?? 0.45) + rng.range(-0.12, 0.12))),
    bandEvery: rng.int(4, 7),
    crown: rng.pick(CROWNS[family] || CROWNS.slab),
    vents: family === 'stack' || family === 'pad' || rng.chance(0.3),
    floorAccent: rng.pick([B.PANEL_STRIPE, B.GLOW_PANEL_BLUE, B.CHROME, B.DECK_PLATE]),
    accentWool: rng.pick(WOOLS),
    railing: family === 'setback' || family === 'habitat' ? B.IRON_BARS : rng.pick([B.IRON_BARS, band]),
    signs: rng.chance(0.7),
  };
}

// Ring cells of an inclusive rect: { x, z, along, corner, face }
export function rectRing(ext) {
  const cells = [];
  for (let x = ext.x0; x <= ext.x1; x++) {
    const corner = x === ext.x0 || x === ext.x1;
    cells.push({ x, z: ext.z0, along: x - ext.x0, corner, face: 'N' });
    cells.push({ x, z: ext.z1, along: x - ext.x0, corner, face: 'S' });
  }
  for (let z = ext.z0 + 1; z <= ext.z1 - 1; z++) {
    cells.push({ x: ext.x0, z, along: z - ext.z0, corner: false, face: 'W' });
    cells.push({ x: ext.x1, z, along: z - ext.z0, corner: false, face: 'E' });
  }
  return cells;
}

// Ring cells of an arbitrary footprint (inside(x, z) within rect r): cells inside with an outside 4-neighbour.
export function maskRing(r, inside) {
  const cells = [];
  for (let x = r.x0; x <= r.x1; x++) for (let z = r.z0; z <= r.z1; z++) {
    if (!inside(x, z)) continue;
    const n = !inside(x, z - 1), s = !inside(x, z + 1), w = !inside(x - 1, z), e = !inside(x + 1, z);
    const k = (n ? 1 : 0) + (s ? 1 : 0) + (w ? 1 : 0) + (e ? 1 : 0);
    if (!k) continue;
    if (k >= 2) cells.push({ x, z, along: x + z, corner: (x + z) % 2 === 0, face: 'D' });
    else cells.push({ x, z, along: (n || s) ? x : z, corner: false, face: n ? 'N' : s ? 'S' : w ? 'W' : 'E' });
  }
  return cells;
}

// One floor (f) of exterior wall for a ring. o: { lobby, signs, open (colonnade), glassFront: face }
export function paintRing(bp, ring, f, style, seed, o = {}) {
  const y = 5 * f;
  const band = f > 0 && f % style.bandEvery === 0 ? style.trim : style.band;
  for (const c of ring) {
    const { x, z } = c;
    bp.set(x, y, z, band);
    if (o.open) {
      // colonnade floor: pillars every third cell, railing between, open above
      if (c.corner || c.along % 3 === 0) bp.fill(x, y + 1, z, x, y + 4, z, style.corner);
      else bp.set(x, y + 1, z, B.IRON_BARS);
      continue;
    }
    if (c.corner) { bp.fill(x, y + 1, z, x, y + 4, z, style.corner); continue; }
    if (o.lobby || (o.glassFront && c.face === o.glassFront)) {
      const mull = c.along % 4 === 0;
      bp.fill(x, y + 1, z, x, y + 3, z, mull ? style.mullion : B.STEEL_GLASS);
      bp.set(x, y + 4, z, style.wall);
      continue;
    }
    paintWallCell(bp, c, y, f, style, seed, o);
  }
}

function paintWallCell(bp, c, y, f, style, seed, o) {
  const { x, z, along } = c;
  const W = hash3(x, f, z, seed) < style.lit ? B.WINDOW_LIT : B.WINDOW_DARK;
  const wall = style.wall;
  let a1 = wall, a2 = wall, a3 = wall, a4 = wall;
  if (c.face === 'D') {
    // diagonal (octagon) faces: alternate window / wall columns
    if (along % 2 === 0) { a2 = W; a3 = W; }
  } else {
    switch (style.rhythm) {
      case 'curtain': if (along % style.period === 0) { a1 = a2 = a3 = a4 = style.mullion; } else { a1 = W; a2 = W; a3 = W; } break;
      case 'ribbon': a2 = W; if (along % 2 === 1) a3 = W; break;
      case 'punched': if (along % style.period !== 0) { a2 = W; a3 = W; } break;
      case 'slit': if (along % 3 === 1) { a1 = W; a2 = W; a3 = W; } break;
      case 'grid': if (along % 2 === 1) { a2 = W; } a4 = style.band; break;
      default: // industrial
        if (along % 4 === 2) a2 = (f % 2) ? W : B.WINDOW_DARK;
        if (along % 6 === 0) a3 = B.VENT;
        if (along % 6 === 3) a1 = B.HULL_TRENCH;
    }
  }
  if (o.signs && along % 2 === 0 && c.face !== 'D') a3 = B.HOLO_SIGN;
  bp.set(x, y + 1, z, a1); bp.set(x, y + 2, z, a2); bp.set(x, y + 3, z, a3); bp.set(x, y + 4, z, a4);
}

// Roof slab + parapet for a rect; railing = true gives an IRON_BARS terrace rail (setback balconies).
export function paintRoof(bp, ext, yRoof, style, railing = false) {
  bp.fill(ext.x0, yRoof, ext.z0, ext.x1, yRoof, ext.z1, style.roof);
  const rail = railing ? B.IRON_BARS : style.band;
  bp.walls(ext.x0, yRoof + 1, ext.z0, ext.x1, yRoof + 1, ext.z1, rail);
  for (const [x, z] of [[ext.x0, ext.z0], [ext.x1, ext.z0], [ext.x0, ext.z1], [ext.x1, ext.z1]]) { bp.set(x, yRoof + 1, z, style.corner); bp.set(x, yRoof + 2, z, B.CITY_LAMP); }
}

// Crown ornaments on the top roof. Returns the extra height used above yRoof.
export function paintCrown(bp, ext, yRoof, style, rng, kind = style.crown) {
  const cx = Math.floor((ext.x0 + ext.x1) / 2), cz = Math.floor((ext.z0 + ext.z1) / 2);
  const w = ext.x1 - ext.x0 + 1, d = ext.z1 - ext.z0 + 1;
  let used = 2;
  switch (kind) {
    case 'antenna': {
      const hgt = rng.int(6, 14);
      bp.fill(cx - 1, yRoof + 1, cz - 1, cx + 1, yRoof + 2, cz + 1, B.DURASTEEL_DARK);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bp.fill(cx + dx, yRoof + 3, cz + dz, cx + dx, yRoof + 4, cz + dz, B.IRON_BARS);
      bp.fill(cx, yRoof + 3, cz, cx, yRoof + hgt, cz, B.CHROME);
      bp.set(cx, yRoof + hgt + 1, cz, B.PANEL_RED); bp.set(cx, yRoof + hgt + 2, cz, B.GLOW_PANEL);
      bp.set(cx, yRoof + Math.floor(hgt / 2), cz, B.GLOW_PANEL_BLUE);
      used = hgt + 3; break;
    }
    case 'fins': {
      const fh = rng.int(3, 6);
      for (const [x, z] of [[ext.x0, ext.z0], [ext.x1, ext.z0], [ext.x0, ext.z1], [ext.x1, ext.z1]]) {
        bp.fill(x, yRoof + 1, z, x, yRoof + fh, z, style.corner); bp.set(x, yRoof + fh + 1, z, B.GLOW_PANEL);
      }
      bp.fill(cx, yRoof + 1, cz, cx, yRoof + fh + 3, cz, B.CHROME); bp.set(cx, yRoof + fh + 4, cz, B.PANEL_RED);
      used = fh + 5; break;
    }
    case 'mech': {
      const mw = Math.max(3, Math.floor(w / 3)), md = Math.max(3, Math.floor(d / 3));
      const x0 = cx - Math.floor(mw / 2), z0 = cz - Math.floor(md / 2);
      bp.fill(x0, yRoof + 1, z0, x0 + mw - 1, yRoof + 3, z0 + md - 1, B.DURASTEEL_DARK);
      for (let x = x0; x <= x0 + mw - 1; x += 2) { bp.set(x, yRoof + 2, z0, B.VENT); bp.set(x, yRoof + 2, z0 + md - 1, B.VENT); }
      bp.fill(x0, yRoof + 4, z0, x0 + mw - 1, yRoof + 4, z0 + md - 1, B.PANEL_STRIPE);
      bp.fill(x0 + 1, yRoof + 5, z0 + 1, x0 + 1, yRoof + 8, z0 + 1, B.CHROME); bp.set(x0 + 1, yRoof + 9, z0 + 1, B.PANEL_RED);
      used = 10; break;
    }
    case 'beacon': {
      for (const [x, z] of [[ext.x0 + 1, ext.z0 + 1], [ext.x1 - 1, ext.z1 - 1]]) { bp.fill(x, yRoof + 1, z, x, yRoof + 5, z, B.IRON_BARS); bp.set(x, yRoof + 6, z, B.PANEL_RED); bp.set(x, yRoof + 7, z, B.CITY_LAMP); }
      bp.fill(cx - 1, yRoof + 1, cz - 1, cx + 1, yRoof + 2, cz + 1, B.DURASTEEL_DARK); bp.set(cx, yRoof + 3, cz, B.VENT);
      used = 8; break;
    }
    case 'dome': {
      const r = Math.min(w, d) / 2 - 1;
      const layers = Math.max(3, Math.round(r * 0.6));
      for (let k = 0; k < layers; k++) {
        const t = (k + 0.5) / layers;
        const rr = r * Math.sqrt(1 - t * t);
        bp.disc(cx + 0.5, cz + 0.5, rr, yRoof + 1 + k, yRoof + 1 + k, k % 3 === 2 ? B.CHROME : B.DURASTEEL, true);
      }
      bp.fill(cx, yRoof + layers + 1, cz, cx, yRoof + layers + 3, cz, B.CHROME); bp.set(cx, yRoof + layers + 4, cz, B.GLOW_PANEL);
      used = layers + 5; break;
    }
    default: { // halo: lit parapet ring
      bp.walls(ext.x0, yRoof + 1, ext.z0, ext.x1, yRoof + 1, ext.z1, B.GLOW_PANEL);
      bp.fill(cx, yRoof + 1, cz, cx, yRoof + 4, cz, B.CHROME); bp.set(cx, yRoof + 5, cz, B.GLOW_PANEL_BLUE);
      used = 6;
    }
  }
  return used;
}
