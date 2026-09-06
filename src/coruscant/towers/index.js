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
import { envelopeCandidates, envelopeFor } from './envelope.js';
import { paletteNames, rhythmNames, applyPalette } from '../facade.js';
import { getLayout } from '../layout.js';

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
  wide: { financial: 0.7, senate: 0.7, entertainment: 0.5, residential: 0.5, industrial: 0.3 },
  wideFrom: ['slab', 'twin', 'setback', 'habitat', 'pad'],
};
function districtMix(lot, name, across) {
  if (!DISTRICT_MIX.enabled || lot.kind !== 'tower' || (lot.height ?? 0) < DISTRICT_MIX.minHeight) return name;
  const seed = (lot.seed ?? 0) >>> 0;
  const wide = DISTRICT_MIX.wide[lot.district];
  if (wide && across >= SPINE_MIN && DISTRICT_MIX.wideFrom.includes(name) && hash2(seed, 0x12, 0xFA) < wide) return 'spine';
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

// ------------------------------------------------------------------------------------ rubric 18: envelope + variety
// The architecture pick of a tower lot: envelope kind, palette and facade rhythm, dealt so that no two towers within
// VARIETY_RADIUS share (family, envelope, crown, palette) (rubric 18 row 3) and same-family neighbours differ in
// rhythm where the family has more than one. Lots of the memoised city layout get the neighbour-aware deal (computed
// once per layout, in lot order, greedily avoiding the tuples already taken nearby); any other lot (test harness
// lots, other seeds) takes its own seeded first choice. Deterministic either way. The skyline impostors read the
// same record, so the far silhouette, tint and light lines match the tower that streams in.
export const VARIETY_RADIUS = 120;
const archCache = new WeakMap();   // layout -> Map(lot.id -> { envelope, palette, rhythm, crown })
function seededOrder(list, seed, salt) {
  return list.map((v, i) => [v, hash2(seed, salt, i)]).sort((a, b) => a[1] - b[1]).map((a) => a[0]);
}
function ownPick(lot, family) {
  const seed = (lot.seed ?? 1) >>> 0;
  return { envelope: seededOrder(envelopeCandidates(family, lot), seed, 0x21)[0], palette: seededOrder(paletteNames(family, lot.district), seed, 0x22)[0], rhythm: seededOrder(rhythmNames(family), seed, 0x23)[0], crown: crownProfile(lot, family).style, family };
}
function archPlan(layout) {
  let plan = archCache.get(layout);
  if (plan) return plan;
  plan = new Map();
  const towers = layout.lots.filter((l) => l.kind === 'tower');
  const done = [];
  const R2 = VARIETY_RADIUS * VARIETY_RADIUS;
  for (const lot of towers) {
    const family = resolveFamily(lot).name, seed = (lot.seed ?? 1) >>> 0;
    const crown = crownProfile(lot, family).style;
    const envs = seededOrder(envelopeCandidates(family, lot), seed, 0x21), pals = seededOrder(paletteNames(family, lot.district), seed, 0x22);
    const rhys = seededOrder(rhythmNames(family), seed, 0x23);
    const cx = lot.x0 + lot.w / 2, cz = lot.z0 + lot.d / 2;
    const nearFam = done.filter((d) => { const dx = d.cx - cx, dz = d.cz - cz; return dx * dx + dz * dz <= R2 && d.family === family; });
    const near = nearFam.filter((d) => d.crown === crown);
    let pick = null;
    // envelopes vary first (the silhouette), palettes second
    outer: for (let j = 0; j < pals.length; j++) for (let i = 0; i < envs.length; i++) {
      if (!near.some((d) => d.envelope === envs[i] && d.palette === pals[j])) { pick = { envelope: envs[i], palette: pals[j] }; break outer; }
    }
    if (!pick) pick = { envelope: envs[0], palette: pals[0] };
    // the rhythm least used by the same family nearby (ties by the seeded order)
    let rhythm = rhys[0], best = Infinity;
    for (const r of rhys) { const n = nearFam.filter((d) => d.rhythm === r).length; if (n < best) { best = n; rhythm = r; } }
    const rec = { ...pick, rhythm, crown, family, cx, cz, id: lot.id };
    plan.set(lot.id, rec); done.push(rec);
  }
  archCache.set(layout, plan);
  return plan;
}
export function archFor(lot, family) {
  if (!lot || lot.kind !== 'tower') return null;
  const city = getLayout();
  const rec = city && city.lots[lot.id] === lot ? archPlan(city).get(lot.id) : null;
  return rec && rec.family === family ? rec : ownPick(lot, family);
}
// The envelope a lot builds (and the impostor draws): the variety-dealt kind resolved by envelopeFor.
export function lotEnvelope(lot, family, o) {
  return envelopeFor(lot, family, archFor(lot, family).envelope, o);
}

export function buildFamily(fam, bp, lot, ctx) {
  if (lot && lot.kind === 'tower') {
    const arch = archFor(lot, fam.name);
    applyPalette(ctx.style, arch.palette);
    if (arch.rhythm) { ctx.style.rhythm = arch.rhythm; if (arch.rhythm === 'curtain' && ctx.style.period < 3) ctx.style.period = 3; }
    ctx.arch = arch;
    ctx.envelope = (o) => envelopeFor(lot, fam.name, arch.envelope, { nF: ctx.nF, midDoorF: ctx.midDoorF, ...o });
  }
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
