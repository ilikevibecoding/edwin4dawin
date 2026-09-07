// Family 1: office tower. On a tower lot the massing comes from the envelope plan (towers/envelope.js: octagon /
// rounded / buttress / blade / stacked shells receding in steps, lit ring ledges, fins, landing decks); the facade is
// the style's module (ribbon / curtain / panel / strip) and the crown comes from crowns.js. Lots without an envelope
// (landmark fallbacks) keep the legacy shaft + setback crown block.
import { buildTiered } from './tiered.js';

// The tiers / mask / env of a tower lot from the family's envelope plan, or null where the lot has none.
export function envelopeSpec(ctx, o) {
  if (!ctx.envelope) return null;
  const env = ctx.envelope(o);
  return { tiers: env.tiers, mask: env.mask, env };
}

export function slab(bp, lot, ctx) {
  const { nF, rng, midDoorF } = ctx;
  const es = envelopeSpec(ctx);
  if (es) return buildTiered(bp, { ...ctx.spec, ...es, family: 'slab' });
  const crownFloors = nF >= 12 ? rng.int(2, Math.max(2, Math.floor(nF * 0.25))) : (nF >= 6 ? 1 : 0);
  const baseEnd = Math.max(midDoorF, 1, nF - 1 - crownFloors);
  const tiers = [{ f0: 0, f1: baseEnd }];
  if (baseEnd < nF - 1) tiers.push({ f0: baseEnd + 1, f1: nF - 1, inset: { l: 2, r: 2, f: 2, b: 2 } });
  return buildTiered(bp, { ...ctx.spec, tiers, family: 'slab' });
}

// Family 7 (senate district): civic tower with a lit colonnade under a chrome dome.
export function civic(bp, lot, ctx) {
  const { nF, midDoorF } = ctx;
  const es = envelopeSpec(ctx, { deck: false });
  let tiers = null;
  if (!es) {
    const baseEnd = Math.max(midDoorF, 1, nF - 3);
    tiers = [{ f0: 0, f1: baseEnd }];
    if (baseEnd < nF - 1) tiers.push({ f0: baseEnd + 1, f1: nF - 1, inset: { l: 1, r: 1, f: 1, b: 1 } });
  }
  const hooks = {
    floorOpts: (f) => (f === nF - 1 && nF >= 5 ? { open: true } : {}),
    poolFor: (f) => (f === nF - 1 ? ['garden_terrace', 'observation_deck', 'lounge', 'meditation_chamber', 'gallery'] : f <= 1 ? ctx.pools.ground : ctx.pools.typical),
    crownKind: 'dome',
  };
  return buildTiered(bp, { ...ctx.spec, ...(es || { tiers }), family: 'civic', hooks });
}
