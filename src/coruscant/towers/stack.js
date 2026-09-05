// Family 4: industrial stack. Dark durasteel plant block with vent rows and hull-trench bands, a receded upper
// block ringed by a catwalk, exhaust chimneys on the base roof, exterior pipe runs and red beacons.
import { B } from '../../blocks.js';
import { buildTiered } from './tiered.js';

const OUT = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };

export function stack(bp, lot, ctx) {
  const { nF, rng, midDoorF } = ctx;
  const baseEnd = Math.max(midDoorF, 1, Math.floor(nF * 0.5));
  const tiers = [{ f0: 0, f1: baseEnd }];
  if (baseEnd < nF - 1) tiers.push({ f0: baseEnd + 1, f1: nF - 1, inset: { l: 3, r: 3, f: 3, b: 3 } });
  ctx.style.railing = B.IRON_BARS;
  ctx.style.rhythm = 'industrial';
  const hooks = {
    afterTier: (t, yRoof, frame, layout, all) => {
      if (t.index !== 0 || all.length < 2) return;
      const e = t.ext, top = 5 * nF, upper = all[1];
      // chimneys in the free roof corners
      let n = 0;
      for (const [x, z] of [[e.x0 + 1, e.z0 + 1], [e.x1 - 2, e.z1 - 2], [e.x1 - 2, e.z0 + 1], [e.x0 + 1, e.z1 - 2]]) {
        if (n >= 2) break;
        if (!bp.isAir(x, yRoof + 1, z) || !bp.isAir(x + 1, yRoof + 1, z + 1) || !bp.isAir(x, yRoof + 1, z + 1) || !bp.isAir(x + 1, yRoof + 1, z)) continue;
        const h = rng.int(8, 14);
        bp.fill(x, yRoof + 1, z, x + 1, yRoof + h, z + 1, B.DURASTEEL_DARK);
        bp.fill(x, yRoof + h + 1, z, x + 1, yRoof + h + 1, z + 1, B.PANEL_RED);
        bp.set(x, yRoof + Math.floor(h / 2), z, B.PANEL_STRIPE); bp.set(x + 1, yRoof + Math.floor(h / 2), z + 1, B.PANEL_STRIPE);
        n++;
      }
      // pipe runs one block off the upper block's walls, with vent collars
      for (const c of upper.ring) {
        if (c.corner || c.face === 'D' || c.along % 6 !== 3) continue;
        const [ox, oz] = OUT[c.face];
        const px = c.x + ox, pz = c.z + oz;
        if (!bp.inside(px, yRoof + 1, pz) || !bp.isAir(px, yRoof + 2, pz)) continue;
        bp.fill(px, yRoof + 1, pz, px, top - 1, pz, B.IRON_BARS);
        for (let y = yRoof + 4; y < top; y += 20) bp.set(px, y, pz, B.VENT);
        bp.set(px, top, pz, B.DURASTEEL_DARK);
      }
    },
  };
  return buildTiered(bp, { ...ctx.spec, tiers, family: 'stack', hooks });
}
