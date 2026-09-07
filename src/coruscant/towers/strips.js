// Lit vertical window strips (docs/rubrics/11_towers_v2.md row 3): emissive columns every 4-6 blocks running the
// full height of a facade above the podium, so the night skyline reads as lines of light instead of random dots.
// The plan is a pure function of the lot (pitch, phase, faces, colour); the painter overwrites the wall / window /
// slab-band cells of a facade ring column but never openings, glass fronts, signs or corners. The strip block is a
// vertical light-strip tile (LIGHT_STRIP_V blue-white, LIGHT_STRIP_WARM_V amber; rubric 18 rule 6): a bar of light
// with no frame at the top or bottom, so the column is one unbroken line of light instead of a dotted line of panes.
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { hash2 } from '../../rng.js';
import { CROWN_OPTIONS } from '../crowns.js';

export const STRIP_MIN_HEIGHT = 60;
export const STRIP_FROM_FLOOR = 2;      // floors 0-1 are the podium (double-height lobby + gallery)
const KEEP = new Set([0, FORCE_AIR, B.STEEL_GLASS, B.GLASS, B.HOLO_SIGN, B.IRON_BARS, B.CITY_LAMP, B.GLOW_PANEL]);

// -> { pitch, phase, faces (Set or null = all), block, f0 } | null
export function stripPlan(lot, family) {
  if (!CROWN_OPTIONS.enabled || !lot || lot.kind !== 'tower' || (lot.height ?? 0) < STRIP_MIN_HEIGHT || family === 'hall') return null;
  const s = (lot.seed ?? 1) >>> 0;
  const h1 = hash2(s, 11, 0x57), h2 = hash2(s, 12, 0x57), h3 = hash2(s, 13, 0x57), h4 = hash2(s, 14, 0x57);
  const pitch = family === 'spire' ? 4 : 4 + Math.floor(h1 * 3);
  const phase = Math.floor(h2 * pitch);
  let faces = null;
  if (family === 'stack' || h3 < 0.3) faces = h4 < 0.5 ? new Set(['N', 'S', 'D']) : new Set(['E', 'W', 'D']);
  // the strip block is the vertical light-strip tile (rubric 18 rule 6: a bar of light with no frame between the
  // blocks, so the column is one unbroken line); the needle / spine families and most financial towers take the
  // blue-white one, the rest the white one the family's warm palettes turn warm (buildTiered)
  const blue = family === 'needle' || family === 'spine' || (lot.district === 'financial' ? h4 < 0.6 : h4 < 0.4);
  return { pitch, phase, faces, block: blue ? B.LIGHT_STRIP_V : B.GLOW_PANEL, f0: STRIP_FROM_FLOOR };
}

// a white panel column disappears on a pale plaster / stone wall at night (the night render has no bloom, so the
// strip is only as bright as its own texel); those towers take the blue strip instead
const LIGHT_WALLS = new Set([B.PLASTER, B.SMOOTH_STONE]);
export function contrastStrips(plan, wall) {
  if (plan && plan.block === B.GLOW_PANEL && LIGHT_WALLS.has(wall)) plan.block = B.LIGHT_STRIP_V;
  return plan;
}

const KEEP_TBL = new Uint8Array(256);
for (const id of KEEP) KEEP_TBL[id] = 1;

// Paints the strips of one facade ring for floors f0..f1 (slab rows included from the second floor on, so the
// line is continuous). A strip column is one contiguous y-run of the block array, so it is written directly.
export function stripRing(bp, ring, f0, f1, p) {
  if (f1 < f0) return;
  const pitch = Math.max(2, p.pitch | 0), phase = p.phase | 0;
  const blocks = bp.blocks, h = bp.h, d = bp.d, block = p.block;
  const yA = 5 * f0 + 1, yB = Math.min(h - 1, 5 * f1 + 4);
  for (const c of ring) {
    if (c.corner || (p.faces && !p.faces.has(c.face))) continue;
    if ((((c.along + phase) % pitch) + pitch) % pitch !== 0) continue;
    const base = (c.x * d + c.z) * h;
    for (let y = yA; y <= yB; y++) { if (KEEP_TBL[blocks[base + y]] === 0) blocks[base + y] = block; }
  }
}
