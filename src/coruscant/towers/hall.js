// Family 8 (market district): low market hall. Full-lot block of shops, stalls and eateries under a stepped
// STEEL_GLASS barrel vault with a lit ridge; the vault replaces the top slab so the upper floor reads as a hall.
import { B } from '../../blocks.js';
import { buildTiered } from './tiered.js';

export function hall(bp, lot, ctx) {
  const { nF, midDoorF } = ctx;
  const tiers = [{ f0: 0, f1: Math.max(1, nF - 1) }];
  const hooks = {
    crown: false,
    afterTier: (t, yRoof) => {
      const e = t.ext;
      const w = e.x1 - e.x0 + 1, d = e.z1 - e.z0 + 1;
      const alongX = w >= d;                       // vault axis along the longer side
      const half = (alongX ? d : w) / 2;
      const rise = Math.max(3, Math.min(6, Math.round(half * 0.5)));
      const hgt = (c) => Math.round(rise * Math.sqrt(Math.max(0, 1 - ((c + 0.5 - half) / half) ** 2)));
      for (let x = e.x0; x <= e.x1; x++) for (let z = e.z0; z <= e.z1; z++) {
        const c = alongX ? z - e.z0 : x - e.x0, n = alongX ? d : w;
        const h = hgt(c);
        const outer = c < half ? c - 1 : c + 1;
        const hOut = outer < 0 || outer >= n ? 0 : hgt(outer);
        const ring = x === e.x0 || x === e.x1 || z === e.z0 || z === e.z1;
        const endWall = alongX ? (x === e.x0 || x === e.x1) : (z === e.z0 || z === e.z1);
        if (!ring && bp.get(x, yRoof, z) === ctx.style.roof) bp.set(x, yRoof, z, 0);   // open the hall to the vault
        if (endWall) { bp.fill(x, yRoof + 1, z, x, yRoof + h, z, (c % 3 === 1) ? B.STEEL_GLASS : ctx.style.wall); continue; }
        if (ring) continue;                                                            // parapet already painted
        for (let y = yRoof + Math.max(1, hOut); y <= yRoof + h; y++) bp.set(x, y, z, B.STEEL_GLASS);
        if (h === rise && ((alongX ? x : z) % 4 === 0)) bp.set(x, yRoof + h, z, B.GLOW_PANEL);
      }
    },
  };
  return buildTiered(bp, { ...ctx.spec, tiers, family: 'hall', midDoorF: midDoorF < nF ? midDoorF : -1, hooks });
}
