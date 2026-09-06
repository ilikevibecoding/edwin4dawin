// Lit vertical window strips (docs/rubrics/11_towers_v2.md row 3): emissive columns every 4-6 blocks running the
// full height of a facade above the podium, so the night skyline reads as lines of light instead of random dots.
// The plan is a pure function of the lot (pitch, phase, faces, colour); the painter overwrites the wall / window /
// slab-band cells of a facade ring column but never openings, glass fronts, signs or corners.
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
  const blue = family === 'needle' || family === 'spine' || (lot.district === 'financial' ? h4 < 0.45 : h4 < 0.2);
  return { pitch, phase, faces, block: blue ? B.GLOW_PANEL_BLUE : B.WINDOW_LIT, f0: STRIP_FROM_FLOOR };
}

// Paints the strips of one facade ring for floors f0..f1 (slab rows included from the second floor on, so the
// line is continuous).
export function stripRing(bp, ring, f0, f1, p) {
  if (f1 < f0) return;
  const pitch = Math.max(2, p.pitch | 0), phase = p.phase | 0;
  for (const c of ring) {
    if (c.corner || (p.faces && !p.faces.has(c.face))) continue;
    if ((((c.along + phase) % pitch) + pitch) % pitch !== 0) continue;
    for (let f = f0; f <= f1; f++) {
      const y = 5 * f;
      for (let dy = f > f0 ? 0 : 1; dy <= 4; dy++) {
        const v = bp.get(c.x, y + dy, c.z);
        if (KEEP.has(v)) continue;
        bp.set(c.x, y + dy, c.z, p.block);
      }
    }
  }
}
