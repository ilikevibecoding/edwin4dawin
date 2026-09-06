// Facade styles and painters (docs/rubrics/18_architecture_v2.md). A style is drawn per building from the family +
// district + seed: a Coruscant palette (grey-black body, chrome edges, blue or warm light; sand and bronze as the
// residential / civic accents), one facade module repeated at one pitch over the whole height, and a legacy crown
// ornament for the low towers. The painters write one floor of exterior wall for a ring of cells (rect footprints
// via rectRing, arbitrary footprints via maskRing).
//
// Rhythms (rule 1 of the rubric; `grid` and `punched` - rows of small square windows - no longer exist):
//   ribbon    a continuous glazing band per floor (1 or 2 blocks tall, every floor or every other floor)
//   slit      tall narrow lights, one per bay, in a panel field
//   curtain   full-height glazing between vertical fins (mullions) every 3-5 cells
//   panel     smooth panel field with a recessed seam column every 3-4 cells, a tall slit per bay, none on service floors
//   strip     panel field with a fin beside every full-height lit strip (the strips come from towers/strips.js on
//             towers >= 60, the painter draws them itself on low towers)
//   industrial hull plates, a trench band, vents and one tall slit per 6 cells (the stack family)
// Windows are never a grid of squares: a lit band is lit for the whole floor, a slit for its whole height.
import { B } from '../blocks.js';
import { hash2, hash3 } from '../rng.js';

// ---------------------------------------------------------------------------------------------------- palettes
// wall = the panel field, corner = the edge / fin block, band = the floor-slab row, trim = the accent (lintels, the
// top band), mullion = curtain fins, seam = recessed seam / fin column, ledge = the lit ring-ledge block, light =
// the strip colour ('blue' | 'warm' | 'white'), floor / roof = slabs
export const PALETTES = {
  civic_white: { wall: B.PANEL_LIGHT, corner: B.CHROME, band: B.TRIM_DARK, trim: B.PANEL_BRONZE, mullion: B.CHROME, seam: B.TRIM_DARK, ledge: B.LIGHT_STRIP, light: 'blue', floor: B.PANEL_LIGHT, roof: B.DURASTEEL_DARK },
  civic_bronze: { wall: B.PANEL_BRONZE, corner: B.CHROME, band: B.TRIM_DARK, trim: B.CHROME, mullion: B.TRIM_DARK, seam: B.TRIM_DARK, ledge: B.LIGHT_STRIP_WARM, light: 'warm', floor: B.DURASTEEL, roof: B.DURASTEEL_DARK },
  fin_black: { wall: B.PANEL_BLACK, corner: B.CHROME, band: B.TRIM_DARK, trim: B.CHROME, mullion: B.CHROME, seam: B.DURASTEEL_DARK, ledge: B.LIGHT_STRIP, light: 'blue', floor: B.PANEL_BLACK, roof: B.PANEL_BLACK },
  fin_steel: { wall: B.DURASTEEL_DARK, corner: B.CHROME, band: B.PANEL_BLACK, trim: B.GLOW_PANEL_BLUE, mullion: B.TRIM_DARK, seam: B.PANEL_BLACK, ledge: B.LIGHT_STRIP, light: 'blue', floor: B.DURASTEEL, roof: B.DURASTEEL_DARK },
  fin_grey: { wall: B.PANEL_GREY, corner: B.TRIM_DARK, band: B.PANEL_BLACK, trim: B.CHROME, mullion: B.TRIM_DARK, seam: B.TRIM_DARK, ledge: B.LIGHT_STRIP, light: 'blue', floor: B.DURASTEEL, roof: B.DURASTEEL_DARK },
  res_sand: { wall: B.DURASTEEL, corner: B.TRIM_DARK, band: B.PANEL_SAND, trim: B.PANEL_SAND, mullion: B.DURASTEEL_DARK, seam: B.PANEL_SAND, ledge: B.LIGHT_STRIP_WARM, light: 'warm', floor: B.DURASTEEL, roof: B.DECK_PLATE },
  res_grey: { wall: B.PANEL_GREY, corner: B.DURASTEEL, band: B.PANEL_SAND, trim: B.CHROME, mullion: B.DURASTEEL, seam: B.TRIM_DARK, ledge: B.LIGHT_STRIP_WARM, light: 'warm', floor: B.DURASTEEL, roof: B.DURASTEEL_DARK },
  res_bronze: { wall: B.PANEL_BRONZE, corner: B.DURASTEEL, band: B.TRIM_DARK, trim: B.PANEL_SAND, mullion: B.TRIM_DARK, seam: B.TRIM_DARK, ledge: B.LIGHT_STRIP_WARM, light: 'warm', floor: B.DURASTEEL, roof: B.DURASTEEL_DARK },
  ind_hull: { wall: B.HULL_PLATE, corner: B.DURASTEEL_DARK, band: B.HULL_TRENCH, trim: B.PANEL_STRIPE, mullion: B.DURASTEEL_DARK, seam: B.HULL_TRENCH, ledge: B.LIGHT_STRIP, light: 'white', floor: B.DECK_PLATE, roof: B.HULL_PLATE },
  ind_dark: { wall: B.DURASTEEL_DARK, corner: B.HULL_PLATE, band: B.HULL_TRENCH, trim: B.PANEL_RED, mullion: B.TRIM_DARK, seam: B.TRIM_DARK, ledge: B.LIGHT_STRIP_WARM, light: 'white', floor: B.DECK_PLATE, roof: B.DURASTEEL_DARK },
  ent_pink: { wall: B.PANEL_BLACK, corner: B.TRIM_DARK, band: B.TRIM_DARK, trim: B.NEON_PINK, mullion: B.CHROME, seam: B.TRIM_DARK, ledge: B.LIGHT_STRIP, light: 'white', floor: B.PANEL_BLACK, roof: B.PANEL_BLACK },
  ent_green: { wall: B.PANEL_GREY, corner: B.TRIM_DARK, band: B.PANEL_BLACK, trim: B.NEON_GREEN, mullion: B.TRIM_DARK, seam: B.PANEL_BLACK, ledge: B.LIGHT_STRIP, light: 'blue', floor: B.DURASTEEL, roof: B.DURASTEEL_DARK },
  ent_dark: { wall: B.DURASTEEL_DARK, corner: B.CHROME, band: B.TRIM_DARK, trim: B.NEON_PINK, mullion: B.CHROME, seam: B.PANEL_BLACK, ledge: B.LIGHT_STRIP, light: 'white', floor: B.DURASTEEL, roof: B.DURASTEEL_DARK },
  port_grey: { wall: B.PANEL_GREY, corner: B.DURASTEEL_DARK, band: B.TRIM_DARK, trim: B.PANEL_STRIPE, mullion: B.DURASTEEL_DARK, seam: B.TRIM_DARK, ledge: B.LIGHT_STRIP, light: 'white', floor: B.DECK_PLATE, roof: B.DURASTEEL_DARK },
};
// district character (rule 11): the palettes a district draws from, in preference order (the variety pass in
// towers/envelope.js walks this list so neighbours differ)
export const DISTRICT_PALETTES = {
  senate: ['civic_white', 'civic_bronze', 'fin_grey', 'civic_white'],
  financial: ['fin_black', 'fin_steel', 'fin_grey', 'civic_bronze'],
  residential: ['res_sand', 'res_grey', 'res_bronze', 'fin_grey'],
  industrial: ['ind_hull', 'ind_dark', 'fin_grey'],
  entertainment: ['ent_pink', 'ent_green', 'ent_dark', 'fin_black'],
  market: ['res_grey', 'ind_hull', 'port_grey'],
  spaceport: ['port_grey', 'ind_hull'],
};
// family overrides: the 500-Republica spire is bronze / pale, the spine and needle are dark blades
const FAMILY_PALETTES = {
  spire: ['civic_bronze', 'civic_white', 'res_bronze'],
  spine: ['fin_black', 'fin_steel'],
  needle: ['fin_black', 'fin_steel', 'ent_dark'],
  stack: ['ind_hull', 'ind_dark'],
};
const STRIP_BLOCK = { blue: B.GLOW_PANEL_BLUE, warm: B.LIGHT_STRIP_WARM, white: B.GLOW_PANEL };

export const RHYTHMS = ['ribbon', 'slit', 'curtain', 'panel', 'strip', 'industrial'];
const RHYTHM = {
  slab: ['ribbon', 'curtain', 'panel', 'strip'],
  setback: ['ribbon', 'panel', 'slit', 'ribbon'],
  habitat: ['ribbon', 'ribbon', 'panel'],
  stack: ['industrial'],
  twin: ['curtain', 'slit', 'strip'],
  pad: ['panel', 'industrial', 'ribbon'],
  hall: ['ribbon', 'slit'],
  civic: ['slit', 'curtain', 'panel'],
  spire: ['curtain', 'strip'],
  spine: ['curtain', 'slit'],
  needle: ['slit', 'panel'],
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

export function paletteNames(family, district) {
  return FAMILY_PALETTES[family] || DISTRICT_PALETTES[district] || DISTRICT_PALETTES.financial;
}
// the facade modules a family may take (the variety pass in towers/index.js deals one per tower so neighbours differ)
export function rhythmNames(family) {
  return RHYTHM[family] || RHYTHM.slab;
}
// numeric code of a rhythm for the skyline impostor shader (skyline.js aStyle.x)
export const RHYTHM_CODE = { ribbon: 0, slit: 1, curtain: 2, panel: 3, strip: 4, industrial: 5 };

// Writes a named palette into a style (the variety pass re-deals palettes after makeStyle).
export function applyPalette(style, name) {
  const p = PALETTES[name] || PALETTES.fin_grey;
  style.palette = PALETTES[name] ? name : 'fin_grey';
  style.wall = p.wall; style.corner = p.corner; style.band = p.band; style.trim = p.trim; style.mullion = p.mullion;
  style.seam = p.seam; style.ledge = p.ledge; style.light = p.light; style.stripBlock = STRIP_BLOCK[p.light];
  style.floor = p.floor; style.roof = p.roof;
  const dark = p.wall === B.DURASTEEL_DARK || p.wall === B.PANEL_BLACK || p.wall === B.HULL_TRENCH || p.wall === B.PANEL_BRONZE || p.wall === B.PANEL_GREY;
  style.coreWall = dark ? B.DURASTEEL : B.DURASTEEL_DARK;
  style.dark = dark;
  return style;
}

export function makeStyle(family, district, rng) {
  const names = paletteNames(family, district);
  const rhythm = rng.pick(RHYTHM[family] || RHYTHM.slab);
  const style = {
    family, district,
    windowLit: B.WINDOW_BAND_LIT, windowDark: B.WINDOW_BAND_DARK,
    rhythm,
    // one module pitch per tower: fins every 3-5 cells (curtain), seams every 3-4 (panel / slit), strips every 4
    period: rhythm === 'curtain' ? rng.pick([3, 4, 5]) : rhythm === 'slit' ? rng.pick([3, 4]) : rng.pick([3, 4]),
    ribbonTall: rng.chance(0.4), ribbonSkip: rng.chance(0.3),
    stripPitch: 4, stripPhase: rng.int(0, 3), stripsByPlan: false,
    lit: Math.min(0.85, Math.max(0.15, (LIT[district] ?? 0.45) + rng.range(-0.12, 0.12))),
    ledgeEvery: rng.int(5, 8),
    crown: rng.pick(CROWNS[family] || CROWNS.slab),
    vents: family === 'stack' || family === 'pad',
    floorAccent: rng.pick([B.PANEL_STRIPE, B.GLOW_PANEL_BLUE, B.CHROME, B.DECK_PLATE]),
    accentWool: rng.pick(WOOLS),
    railing: B.IRON_BARS,
    signs: rng.chance(0.5),
  };
  applyPalette(style, rng.pick(names));
  if (family === 'stack') style.floor = B.DECK_PLATE;
  return style;
}

// ---------------------------------------------------------------------------------------------------- rings
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

// ---------------------------------------------------------------------------------------------------- painters
// lit for the whole floor (bands) / the whole slit (columns): continuous lines of light, never scattered squares
const bandBlock = (f, style, seed) => (hash2(f, seed, 0x5a) < style.lit ? B.WINDOW_BAND_LIT : B.WINDOW_BAND_DARK);
const slitBlock = (x, z, f, style, seed) => (hash3(x, f, z, seed) < Math.min(0.9, style.lit * 1.3) ? B.WINDOW_SLIT_LIT : B.WINDOW_SLIT_DARK);

// One floor (f) of exterior wall for a ring. o: { lobby, signs, open (colonnade), glassFront: face, ledge }
// The slab row is the band block; every style.ledgeEvery floors (and where o.ledge is set) it is the lit ledge.
export function paintRing(bp, ring, f, style, seed, o = {}) {
  const y = 5 * f;
  const band = o.ledge || (f > 1 && style.ledge && f % style.ledgeEvery === 0) ? style.ledge : style.band;
  const ribbon = style.rhythm === 'ribbon';
  for (const c of ring) {
    const { x, z } = c;
    bp.set(x, y, z, band);
    if (o.open) {
      // colonnade floor: pillars every third cell, railing between, open above
      if (c.corner || c.along % 3 === 0) bp.fill(x, y + 1, z, x, y + 4, z, style.corner);
      else bp.set(x, y + 1, z, B.IRON_BARS);
      continue;
    }
    // rect corners are edge columns; on a chamfered / rounded face the ribbon runs on around the corner
    if (c.corner && !(ribbon && c.face === 'D')) { bp.fill(x, y + 1, z, x, y + 4, z, style.corner); continue; }
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
  const wall = style.wall, seam = style.seam || style.band;
  let a1 = wall, a2 = wall, a3 = wall, a4 = wall;
  const per = Math.max(2, style.period | 0);
  if (c.face === 'D') {
    // chamfer / octagon facets: the module continues around the corner
    switch (style.rhythm) {
      case 'ribbon': { if (!(style.ribbonSkip && f % 2 === 1)) { const g = bandBlock(f, style, seed); a2 = g; if (style.ribbonTall) a3 = g; } break; }
      case 'curtain': { const g = bandBlock(f, style, seed); a1 = g; a2 = g; a3 = g; break; }
      default: if (along % 2 === 0) { a1 = seam; a2 = seam; a3 = seam; a4 = seam; }
    }
  } else {
    switch (style.rhythm) {
      case 'ribbon': {
        if (style.ribbonSkip && f % 2 === 1) break;
        const g = bandBlock(f, style, seed); a2 = g; if (style.ribbonTall) a3 = g;
        break;
      }
      case 'curtain': {
        if (along % per === 0) { a1 = a2 = a3 = a4 = style.mullion; }
        else { const g = bandBlock(f, style, seed); a1 = g; a2 = g; a3 = g; }
        break;
      }
      case 'slit': {
        const k = along % per;
        if (k === 1) { const s = slitBlock(x, z, f, style, seed); a1 = s; a2 = s; a3 = s; }
        else if (k === 0 && per >= 4) { a1 = seam; a2 = seam; a3 = seam; a4 = seam; }
        break;
      }
      case 'panel': {
        const k = along % per;
        if (k === 0) { a1 = seam; a2 = seam; a3 = seam; a4 = seam; }
        else if (k === (per >> 1) && f % 5 !== 4 && f > 1) { const s = slitBlock(x, z, f, style, seed); a1 = s; a2 = s; a3 = s; }
        break;
      }
      case 'strip': {
        const pitch = Math.max(2, style.stripPitch | 0), k = (((along + style.stripPhase) % pitch) + pitch) % pitch;
        if (k === 0) { if (!style.stripsByPlan) { const s = style.stripBlock; a1 = s; a2 = s; a3 = s; a4 = s; } }
        else if (k === 1) { a1 = seam; a2 = seam; a3 = seam; a4 = seam; }
        break;
      }
      default: { // industrial: hull field, a trench band under the slab, vents, one tall slit per 6 cells
        const k = along % 6;
        if (k === 2) { const s = slitBlock(x, z, f, style, seed); a1 = s; a2 = s; a3 = s; }
        else if (k === 5) { a2 = B.VENT; a4 = B.HULL_TRENCH; }
        else if (k === 0) { a4 = B.HULL_TRENCH; }
      }
    }
  }
  if (o.signs && along % 3 === 0 && c.face !== 'D') a3 = B.HOLO_SIGN;
  bp.set(x, y + 1, z, a1); bp.set(x, y + 2, z, a2); bp.set(x, y + 3, z, a3); bp.set(x, y + 4, z, a4);
}

// Roof slab + parapet for a rect. The rim of the roof slab (its ring cells, the top of the wall) is the lit ring
// ledge, so every shell change is a light line around the tower (rule 9); above it a corner-block parapet, or an
// IRON_BARS terrace rail where railing = true (open terraces the parapet would wall in).
export function paintRoof(bp, ext, yRoof, style, railing = false) {
  bp.fill(ext.x0, yRoof, ext.z0, ext.x1, yRoof, ext.z1, style.roof);
  bp.walls(ext.x0, yRoof, ext.z0, ext.x1, yRoof, ext.z1, style.ledge || style.band);
  bp.walls(ext.x0, yRoof + 1, ext.z0, ext.x1, yRoof + 1, ext.z1, railing ? B.IRON_BARS : style.corner);
  for (const [x, z] of [[ext.x0, ext.z0], [ext.x1, ext.z0], [ext.x0, ext.z1], [ext.x1, ext.z1]]) { bp.set(x, yRoof + 1, z, style.corner); bp.set(x, yRoof + 2, z, B.CITY_LAMP); }
}

// Crown ornaments on the top roof (low towers; towers >= 60 get crowns.js). Returns the extra height used above yRoof.
export function paintCrown(bp, ext, yRoof, style, rng, kind = style.crown) {
  const cx = Math.floor((ext.x0 + ext.x1) / 2), cz = Math.floor((ext.z0 + ext.z1) / 2);
  const w = ext.x1 - ext.x0 + 1, d = ext.z1 - ext.z0 + 1;
  const strip = style.stripBlock || B.GLOW_PANEL_BLUE;
  let used = 2;
  switch (kind) {
    case 'antenna': {
      const hgt = rng.int(6, 14);
      bp.fill(cx - 1, yRoof + 1, cz - 1, cx + 1, yRoof + 2, cz + 1, B.DURASTEEL_DARK);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bp.fill(cx + dx, yRoof + 3, cz + dz, cx + dx, yRoof + 4, cz + dz, B.IRON_BARS);
      bp.fill(cx, yRoof + 3, cz, cx, yRoof + hgt, cz, B.CHROME);
      bp.set(cx, yRoof + hgt + 1, cz, B.PANEL_RED); bp.set(cx, yRoof + hgt + 2, cz, B.GLOW_PANEL);
      bp.set(cx, yRoof + Math.floor(hgt / 2), cz, strip);
      used = hgt + 3; break;
    }
    case 'fins': {
      const fh = rng.int(3, 6);
      for (const [x, z] of [[ext.x0, ext.z0], [ext.x1, ext.z0], [ext.x0, ext.z1], [ext.x1, ext.z1]]) {
        bp.fill(x, yRoof + 1, z, x, yRoof + fh, z, style.corner); bp.set(x, yRoof + fh + 1, z, strip);
      }
      bp.fill(cx, yRoof + 1, cz, cx, yRoof + fh + 3, cz, B.CHROME); bp.set(cx, yRoof + fh + 4, cz, B.PANEL_RED);
      used = fh + 5; break;
    }
    case 'mech': {
      const mw = Math.max(3, Math.floor(w / 3)), md = Math.max(3, Math.floor(d / 3));
      const x0 = cx - Math.floor(mw / 2), z0 = cz - Math.floor(md / 2);
      bp.fill(x0, yRoof + 1, z0, x0 + mw - 1, yRoof + 3, z0 + md - 1, B.DURASTEEL_DARK);
      for (let x = x0; x <= x0 + mw - 1; x += 2) { bp.set(x, yRoof + 2, z0, B.VENT); bp.set(x, yRoof + 2, z0 + md - 1, B.VENT); }
      bp.fill(x0, yRoof + 4, z0, x0 + mw - 1, yRoof + 4, z0 + md - 1, B.TRIM_DARK);
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
        bp.disc(cx + 0.5, cz + 0.5, rr, yRoof + 1 + k, yRoof + 1 + k, k % 3 === 2 ? B.CHROME : style.wall, true);
      }
      bp.fill(cx, yRoof + layers + 1, cz, cx, yRoof + layers + 3, cz, B.CHROME); bp.set(cx, yRoof + layers + 4, cz, B.GLOW_PANEL);
      used = layers + 5; break;
    }
    default: { // halo: lit parapet ring
      bp.walls(ext.x0, yRoof + 1, ext.z0, ext.x1, yRoof + 1, ext.z1, style.ledge || B.GLOW_PANEL);
      bp.fill(cx, yRoof + 1, cz, cx, yRoof + 4, cz, B.CHROME); bp.set(cx, yRoof + 5, cz, strip);
      used = 6;
    }
  }
  return used;
}
