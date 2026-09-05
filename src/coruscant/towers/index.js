// Tower family registry: name resolution (names, aliases, numeric indices, unknown -> seeded pick), lot-size
// fallbacks, and the dispatch into the family builders.
import { slab, civic } from './slab.js';
import { setback } from './setback.js';
import { habitat } from './habitat.js';
import { stack } from './stack.js';
import { twin, TWIN_MIN } from './twin.js';
import { pad } from './pad.js';
import { hall } from './hall.js';
import { senate, temple, opera, plaza, terminal } from './landmarks.js';

// index order used when the layout passes lot.family as a number
export const FAMILIES = ['slab', 'setback', 'habitat', 'stack', 'twin', 'pad', 'civic', 'hall'];
export const LANDMARKS = ['senate', 'temple', 'opera'];
export const LABELS = { slab: 'Tower', setback: 'Spire', habitat: 'Habitat', stack: 'Works', twin: 'Twin Towers', pad: 'Landing Tower', civic: 'Civic Tower', hall: 'Market Hall', senate: 'Senate', temple: 'Temple', opera: 'Opera', plaza: 'Plaza', spaceport: 'Spaceport Terminal', station: 'Transit Station' };
const ALIASES = {
  office: 'slab', glass: 'slab', residential: 'setback', spire: 'setback', cylinder: 'habitat', round: 'habitat', drum: 'habitat',
  industrial: 'stack', works: 'stack', platform: 'pad', landing: 'pad', market: 'hall', mall: 'hall', dome: 'senate', ziggurat: 'temple', theatre: 'opera', theater: 'opera',
};

// -> { name, variant }
export function resolveFamily(lot, rng) {
  const seed = (lot.seed ?? 0) >>> 0;
  if (lot.kind === 'plaza') return { name: 'plaza' };
  if (lot.kind === 'spaceport' || lot.kind === 'station') return { name: lot.kind };
  let raw = lot.family;
  let name = null;
  if (typeof raw === 'number') name = (lot.kind === 'landmark' ? LANDMARKS : FAMILIES)[((raw | 0) % 8 + 8) % (lot.kind === 'landmark' ? 3 : 8)];
  else if (typeof raw === 'string') { raw = raw.toLowerCase(); name = FAMILIES.includes(raw) || LANDMARKS.includes(raw) ? raw : ALIASES[raw] || null; }
  if (!name) name = lot.kind === 'landmark' ? LANDMARKS[seed % 3] : FAMILIES[seed % FAMILIES.length];
  const variant = raw === 'cylinder' ? 'ellipse' : 'octagon';
  // fallbacks for lots too small for the family's geometry
  const front = lot.front || (lot.door && lot.door.side) || 'S';
  const across = front === 'N' || front === 'S' ? lot.w : lot.d, depth = front === 'N' || front === 'S' ? lot.d : lot.w;
  if (name === 'twin' && across < TWIN_MIN) name = 'slab';
  if (name === 'habitat' && Math.min(lot.w, lot.d) < 26) name = 'setback';
  if (name === 'pad' && depth < 22) name = 'setback';
  return { name, variant };
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
    case 'senate': return senate(bp, lot, ctx);
    case 'temple': return temple(bp, lot, ctx);
    case 'opera': return opera(bp, lot, ctx);
    case 'plaza': return plaza(bp, lot, ctx);
    case 'spaceport': case 'station': return terminal(bp, lot, ctx);
    default: return slab(bp, lot, ctx);
  }
}
