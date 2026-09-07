// Family 2: residential tower. Receding shells from the envelope plan (rounded / octagon / stacked discs / ellipse
// on wide lots), every exposed tier roof a terrace with IRON_BARS railings and planters, cantilevered balconies on
// the receded tiers. Lots without an envelope keep the legacy three-or-four-tier setback.
import { B } from '../../blocks.js';
import { FORCE_AIR } from '../blueprint.js';
import { buildTiered } from './tiered.js';
import { envelopeSpec } from './slab.js';

const OUT = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };

export function setback(bp, lot, ctx) {
  const { nF, rng, midDoorF } = ctx;
  const es = envelopeSpec(ctx);
  let tiers = null;
  if (!es) {
    const nT = nF >= 16 ? 4 : nF >= 9 ? 3 : 2;
    const firstEnd = Math.max(midDoorF, 1, Math.floor(nF * 0.4));
    tiers = [{ f0: 0, f1: firstEnd }];
    let f = firstEnd + 1;
    const rem = nF - f;
    for (let k = 1; k < nT && f < nF; k++) {
      const left = nT - k;
      const n = k === nT - 1 ? nF - f : Math.max(1, Math.round(rem / (nT - 1)) + rng.int(-1, 1));
      const f1 = Math.min(nF - 1, f + n - 1);
      tiers.push({ f0: f, f1, inset: { l: 2 * k, r: 2 * k, f: 2 * k, b: 2 * k } });
      f = f1 + 1;
      if (left === 1) break;
    }
    if (f < nF) tiers[tiers.length - 1].f1 = nF - 1;
  }
  ctx.style.railing = B.IRON_BARS;
  const deckFace = es && es.env.deckFace;
  const hooks = {
    afterTier: (t, yRoof) => {
      // terrace planters on the roof ring just inside the railing (skipped where the next tier stands)
      const e = t.ext;
      for (let x = e.x0 + 1; x <= e.x1 - 1; x++) for (let z = e.z0 + 1; z <= e.z1 - 1; z++) {
        const edge = x === e.x0 + 1 || x === e.x1 - 1 || z === e.z0 + 1 || z === e.z1 - 1;
        if (!edge || (x + z) % 4 !== 0 || !bp.isAir(x, yRoof + 1, z) || !bp.isAir(x, yRoof + 2, z) || bp.isAir(x, yRoof, z)) continue;
        bp.set(x, yRoof + 1, z, B.DURASTEEL_DARK); bp.set(x, yRoof + 2, z, rng.chance(0.5) ? B.OAK_LEAVES : B.SPRUCE_LEAVES);
      }
      if (t.index === 0 || t.stalk) return;
      // balconies: two-cell slabs outside the wall every fifth bay on odd floors, with a railing and a door (not on
      // the deck face, which carries the landing decks)
      for (let ff = t.f0 + 1; ff <= t.f1; ff += 2) {
        const y = 5 * ff;
        for (const c of t.ring) {
          if (c.corner || c.along % 5 < 2 || c.face === 'D' || c.face === deckFace) continue;
          const [ox, oz] = OUT[c.face];
          const bx = c.x + ox, bz = c.z + oz, bx2 = bx + ox, bz2 = bz + oz;
          if (!bp.inside(bx2, y, bz2) || !bp.isAir(bx, y, bz) || !bp.isAir(bx, y + 1, bz) || !bp.isAir(bx2, y, bz2) || !bp.isAir(bx2, y + 1, bz2)) continue;
          bp.set(bx, y, bz, B.DURASTEEL); bp.set(bx2, y, bz2, B.DURASTEEL); bp.set(bx2, y + 1, bz2, B.IRON_BARS);
          if (c.along % 5 === 2) { bp.set(c.x, y + 1, c.z, FORCE_AIR); bp.set(c.x, y + 2, c.z, FORCE_AIR); }
        }
      }
    },
  };
  return buildTiered(bp, { ...ctx.spec, ...(es || { tiers }), family: 'setback', hooks });
}
