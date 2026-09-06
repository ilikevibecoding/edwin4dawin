// Tower family registry: name resolution (names, aliases, numeric indices, unknown -> seeded pick), the district
// mix that hands tall lots to the rubric-11 families, lot-size fallbacks, and the dispatch into the family builders.
import { slab, civic } from './slab.js';
import { setback } from './setback.js';
import { habitat } from './habitat.js';
import { stack } from './stack.js';
import { twin, TWIN_MIN } from './twin.js';
import { pad } from './pad.js';
import { hall } from './hall.js';
import { spire, SPIRE_MIN } from './spire.js';
import { spine, SPINE_MIN } from './spine.js';
import { needle, NEEDLE_MIN } from './needle.js';
import { senate, temple, opera, plaza, terminal } from './landmarks.js';
import { crownProfile } from '../crowns.js';
import { hash2 } from '../../rng.js';

// index order used when the layout passes lot.family as a number
export const FAMILIES = ['slab', 'setback', 'habitat', 'stack', 'twin', 'pad', 'civic', 'hall', 'spire', 'spine', 'needle'];
export const LANDMARKS = ['senate', 'temple', 'opera'];
export const LABELS = { slab: 'Tower', setback: 'Residences', habitat: 'Habitat', stack: 'Works', twin: 'Twin Towers', pad: 'Landing Tower', civic: 'Civic Tower', hall: 'Market Hall', spire: 'Spire', spine: 'Spine Tower', needle: 'Needle', senate: 'Senate', temple: 'Temple', opera: 'Opera', plaza: 'Plaza', spaceport: 'Spaceport Terminal', station: 'Transit Station' };
const ALIASES = {
  office: 'slab', glass: 'slab', residential: 'setback', cylinder: 'habitat', round: 'habitat', drum: 'habitat',
  industrial: 'stack', works: 'stack', platform: 'pad', landing: 'pad', market: 'hall', mall: 'hall', dome: 'senate', ziggurat: 'temple', theatre: 'opera', theater: 'opera',
  republica: 'spire', blade: 'needle', zakuul: 'needle',
};

// District mix (the registry's family selection hook, docs/rubrics/11_towers_v2.md row 2): layout.js still hands
// out its own family names, so tall lots are re-dealt here by lot seed - a share of each district's setbacks become
// spires, of its slabs needles, of its twins spine towers. Deterministic per lot; the layout is not touched. The
// integrator can instead list 'spire' / 'spine' / 'needle' in layout.js DISTRICTS[...].families and set
// DISTRICT_MIX.enabled = false. Shares are of the lots that arrive with the given family and height >= minHeight.
export const DISTRICT_MIX = {
  enabled: true,
  minHeight: 60,
  rules: {
    financial: { setback: [['spire', 0.55]], slab: [['needle', 0.3], ['spire', 0.1]], twin: [['spine', 0.6]], habitat: [['spire', 0.3]] },
    senate: { slab: [['needle', 0.25], ['spire', 0.15]], twin: [['spine', 0.6]] },
    residential: { setback: [['spire', 0.3]], slab: [['needle', 0.25]], habitat: [['spire', 0.2]] },
    entertainment: { setback: [['needle', 0.35], ['spire', 0.2]], habitat: [['spire', 0.25]], pad: [['spine', 0.2]] },
    industrial: { slab: [['needle', 0.25]] },
  },
  // lots wide enough for two shafts (across the front >= SPINE_MIN) in these districts become spine towers at this share
  wide: { financial: 0.6, senate: 0.6, entertainment: 0.4, residential: 0.3 },
};
function districtMix(lot, name, across) {
  if (!DISTRICT_MIX.enabled || lot.kind !== 'tower' || (lot.height ?? 0) < DISTRICT_MIX.minHeight) return name;
  const seed = (lot.seed ?? 0) >>> 0;
  const wide = DISTRICT_MIX.wide[lot.district];
  if (wide && across >= SPINE_MIN && (name === 'slab' || name === 'twin' || name === 'setback') && hash2(seed, 0x12, 0xFA) < wide) return 'spine';
  const rules = DISTRICT_MIX.rules[lot.district];
  const opts = rules && rules[name];
  if (!opts) return name;
  let r = hash2(seed, 0x11, 0xFA);
  for (const [to, share] of opts) { r -= share; if (r < 0) return to; }
  return name;
}

// -> { name, variant }
export function resolveFamily(lot, rng) {
  const seed = (lot.seed ?? 0) >>> 0;
  if (lot.kind === 'plaza') return { name: 'plaza' };
  if (lot.kind === 'spaceport' || lot.kind === 'station') return { name: lot.kind };
  let raw = lot.family;
  let name = null;
  if (typeof raw === 'number') name = lot.kind === 'landmark' ? LANDMARKS[((raw | 0) % 3 + 3) % 3] : FAMILIES[((raw | 0) % FAMILIES.length + FAMILIES.length) % FAMILIES.length];
  else if (typeof raw === 'string') { raw = raw.toLowerCase(); name = FAMILIES.includes(raw) || LANDMARKS.includes(raw) ? raw : ALIASES[raw] || null; }
  if (!name) name = lot.kind === 'landmark' ? LANDMARKS[seed % 3] : FAMILIES[seed % FAMILIES.length];
  const variant = raw === 'cylinder' ? 'ellipse' : 'octagon';
  const front = lot.front || (lot.door && lot.door.side) || 'S';
  const across = front === 'N' || front === 'S' ? lot.w : lot.d, depth = front === 'N' || front === 'S' ? lot.d : lot.w;
  name = districtMix(lot, name, across);
  // fallbacks for lots too small for the family's geometry
  if (name === 'twin' && across < TWIN_MIN) name = 'slab';
  if (name === 'spine' && across < SPINE_MIN) name = 'needle';
  if (name === 'habitat' && Math.min(lot.w, lot.d) < 26) name = 'setback';
  if (name === 'spire' && Math.min(lot.w, lot.d) < SPIRE_MIN) name = 'setback';
  if (name === 'needle' && Math.min(lot.w, lot.d) < NEEDLE_MIN) name = 'setback';
  if (name === 'pad' && depth < 22) name = 'setback';
  // landmarks need room for their signature volume (rotunda + dome, ziggurat steps, stage + amphitheatre + plaza)
  if (name === 'senate' && Math.min(lot.w, lot.d) < 64) name = 'civic';
  if (name === 'temple' && Math.min(lot.w, lot.d) < 40) name = 'setback';
  if (name === 'opera' && (across < 30 || depth < 44)) name = 'hall';
  return { name, variant };
}

// Crown silhouette of a tower lot for the skyline impostors and lane checks, without building the blueprint:
// { style, height (blocks above lot.height, 0 = none), taper (0 box .. 1 point) }. The blueprint's meta.crown
// records what was really built; the two agree to within a few blocks (checked by scripts/test-coruscant-towers.mjs).
export function lotCrown(lot, ground) {
  if (!lot || lot.kind !== 'tower') return { style: null, height: 0, taper: 0 };
  return crownProfile(lot, resolveFamily(lot).name, ground);
}

export function buildFamily(fam, bp, lot, ctx) {
  switch (fam.name) {
    case 'slab': return slab(bp, lot, ctx);
    case 'setback': return setback(bp, lot, ctx);
    case 'habitat': return habitat(bp, lot, ctx, fam.variant);
    case 'stack': return stack(bp, lot, ctx);
    case 'twin': return twin(bp, lot, ctx);
    case 'pad': return pad(bp, lot, ctx);
    case 'civic': return civic(bp, lot, ctx);
    case 'hall': return hall(bp, lot, ctx);
    case 'spire': return spire(bp, lot, ctx);
    case 'spine': return spine(bp, lot, ctx);
    case 'needle': return needle(bp, lot, ctx);
    case 'senate': return senate(bp, lot, ctx);
    case 'temple': return temple(bp, lot, ctx);
    case 'opera': return opera(bp, lot, ctx);
    case 'plaza': return plaza(bp, lot, ctx);
    case 'spaceport': case 'station': return terminal(bp, lot, ctx);
    default: return slab(bp, lot, ctx);
  }
}
