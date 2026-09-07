// Family 3: cylindrical habitat tower. On a tower lot the envelope plan gives the elliptical / rounded / octagonal
// footprint, the receding drums, the ring ledges and the balcony decks; lots without an envelope carve an octagon
// (or an ellipse, for the 'cylinder' variant) from the lot square with a receded upper drum. The lobby entrance
// stays on the flat front face so the door sits on the lot edge.
import { B } from '../../blocks.js';
import { buildTiered } from './tiered.js';
import { envelopeSpec } from './slab.js';

export function habitat(bp, lot, ctx, variant = 'octagon') {
  const { nF, midDoorF } = ctx;
  ctx.style.railing = B.IRON_BARS;
  const es = envelopeSpec(ctx);
  if (es) return buildTiered(bp, { ...ctx.spec, ...es, family: 'habitat' });
  const firstEnd = Math.max(midDoorF, 1, Math.floor(nF * 0.55));
  const tiers = [{ f0: 0, f1: firstEnd }];
  if (firstEnd < nF - 1) tiers.push({ f0: firstEnd + 1, f1: nF - 1, inset: { l: 3, r: 3, f: 3, b: 3 } });
  const front = ctx.spec.front;
  const mask = variant === 'ellipse'
    ? (x, z, i, e) => {
      const rx = (e.x1 - e.x0 + 1) / 2, rz = (e.z1 - e.z0 + 1) / 2;
      const dx = (x + 0.5 - (e.x0 + rx)) / rx, dz = (z + 0.5 - (e.z0 + rz)) / rz;
      // keep the entrance face flat: cells within 3 rows of the front edge use the square footprint
      const nearFront = (front === 'S' && e.z1 - z <= 2) || (front === 'N' && z - e.z0 <= 2) || (front === 'E' && e.x1 - x <= 2) || (front === 'W' && x - e.x0 <= 2);
      return dx * dx + dz * dz <= 1 || (nearFront && Math.abs(front === 'S' || front === 'N' ? dx : dz) <= 0.8);
    }
    : (x, z, i, e) => {
      const w = e.x1 - e.x0 + 1, d = e.z1 - e.z0 + 1;
      const c = Math.round(Math.min(w, d) * 0.29);
      const a = x - e.x0, b = z - e.z0, a2 = e.x1 - x, b2 = e.z1 - z;
      return a + b >= c && a2 + b >= c && a + b2 >= c && a2 + b2 >= c;
    };
  return buildTiered(bp, { ...ctx.spec, tiers, family: 'habitat', mask });
}
