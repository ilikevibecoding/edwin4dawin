// Family 1: glass-and-durasteel office slab. Full-lot shaft with WINDOW_LIT / WINDOW_DARK curtain or grid facades,
// a setback crown block on the top quarter and an antenna / fins / mechanical penthouse.
import { buildTiered } from './tiered.js';

export function slab(bp, lot, ctx) {
  const { nF, rng, midDoorF } = ctx;
  const crownFloors = nF >= 12 ? rng.int(2, Math.max(2, Math.floor(nF * 0.25))) : (nF >= 6 ? 1 : 0);
  const baseEnd = Math.max(midDoorF, 1, nF - 1 - crownFloors);
  const tiers = [{ f0: 0, f1: baseEnd }];
  if (baseEnd < nF - 1) tiers.push({ f0: baseEnd + 1, f1: nF - 1, inset: { l: 2, r: 2, f: 2, b: 2 } });
  return buildTiered(bp, { ...ctx.spec, tiers, family: 'slab' });
}

// Family 7 (senate district): civic slab with a lit colonnade under a chrome dome.
export function civic(bp, lot, ctx) {
  const { nF, midDoorF } = ctx;
  const baseEnd = Math.max(midDoorF, 1, nF - 3);
  const tiers = [{ f0: 0, f1: baseEnd }];
  if (baseEnd < nF - 1) tiers.push({ f0: baseEnd + 1, f1: nF - 1, inset: { l: 1, r: 1, f: 1, b: 1 } });
  const hooks = {
    floorOpts: (f) => (f === nF - 1 && nF >= 5 ? { open: true } : {}),
    poolFor: (f) => (f === nF - 1 ? ['garden_terrace', 'observation_deck', 'lounge', 'meditation_chamber', 'gallery'] : f <= 1 ? ctx.pools.ground : ctx.pools.typical),
    crownKind: 'dome',
  };
  return buildTiered(bp, { ...ctx.spec, tiers, family: 'civic', hooks });
}
