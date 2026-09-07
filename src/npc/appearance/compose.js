// The appearance composer: deterministic by seed, layered base skin -> face -> hair -> outfit -> insignia/wear ->
// geometry part textures, one 128x64 canvas per appearance (classic layout at 2x, see layout.js) plus geometry
// records for species / outfit parts. Composed appearances are cached by id (LRU, 512 entries).
import { RNG } from '../../rng.js';
import { Raster, createCanvas, hex, rgb, mix } from './raster.js';
import { TEX_W, TEX_H, REG, PART, ShelfAllocator, boxUV, ALL_FACES } from './layout.js';
import { pickFace, paintHead, hairGeometry, effectiveHairColour, subSeed, faceId, canonicalFaces, SKIN_TONES, EYE_COLOURS, EYE_SHAPES, BROWS, NOSES, MOUTHS, FACIAL_HAIR, HAIR_STYLES, HAIR_COLOURS, AGES, MARKINGS, GENDERS, FACE_COMBINATIONS } from './faces.js';
import { SPECIES, SPECIES_BY_ID, helmetOK, capOK } from './species.js';
import { OUTFITS, OUTFITS_BY_ID } from './outfits.js';
import { ARCHETYPES, resolveArchetype, FACTION_ARCHETYPES, DISTRICT_WEAR, DISTRICT_HUMAN_FACTOR } from './archetypes.js';
import { fillPart, applyWear, WEAR_LEVELS } from './paint.js';

export const CACHE_CAPACITY = 512;
export const HEAD_HEADGEAR = new Set(['helmet', 'mask', 'open_helmet', 'droid']); // the head is fully covered / replaced
const HAIR_VOLUME_BLOCKED = new Set(['cap', 'hood', 'headdress', 'helmet', 'mask', 'open_helmet', 'droid']);

const weightedKey = (rng, weights) => {
  const keys = Object.keys(weights);
  let total = 0; for (const k of keys) total += weights[k];
  if (total <= 0) return keys[0];
  let v = rng.next() * total;
  for (const k of keys) { v -= weights[k]; if (v < 0) return k; }
  return keys[keys.length - 1];
};

// Does this species' head accept the outfit's headgear?
export function outfitFitsSpecies(outfit, sp) {
  if (outfit.droid) return !!sp.droid;
  if (sp.droid) return false;
  if (outfit.species && !outfit.species.includes(sp.id)) return false;
  const hg = outfit.headgear || 'none';
  if (hg === 'none' || hg === 'goggles') return true;
  if (hg === 'cap' || hg === 'hood' || hg === 'headdress') return capOK(sp);
  if (hg === 'mask') return !LOWER_FACE_GEOMETRY.has(sp.id); // breath masks / face masks sit on the lower face
  return helmetOK(sp); // helmet, open_helmet
}
// species whose snout / tusks / jowls / stalks occupy the lower face (no masks); helmets are gated by sp.headgear
const LOWER_FACE_GEOMETRY = new Set(['rodian', 'bothan', 'gran', 'aqualish', 'ithorian', 'sullustan', 'mon_calamari']);

// ---------------------------------------------------------------------------------------------------------------
// Choice step: everything except the pixels. Deterministic in (seed, opts). Also used by describeAppearance(id).
export function chooseAppearance(seed, opts = {}) {
  seed = (seed | 0) || 1;
  const rng = new RNG(subSeed(seed, 'choice'));
  let archetypeId = opts.archetype ? resolveArchetype(opts.archetype, rng) : null;
  if (!archetypeId && opts.faction && FACTION_ARCHETYPES[opts.faction]) { const list = FACTION_ARCHETYPES[opts.faction]; archetypeId = list[Math.floor(rng.next() * list.length)]; }
  if (!archetypeId) archetypeId = 'resident';
  const arch = ARCHETYPES[archetypeId];
  const district = opts.district || null;

  // outfit candidates from the archetype (rank may pin one); an explicit outfit id wins
  let outfitWeights = { ...arch.outfits };
  if (opts.rank && arch.ranks && arch.ranks[opts.rank]) outfitWeights = { [arch.ranks[opts.rank]]: 1 };
  if (opts.outfit && OUTFITS_BY_ID[opts.outfit]) outfitWeights = { [opts.outfit]: 1 };

  // species: explicit > archetype mix (district shifts the human share); must fit at least one candidate outfit
  let speciesWeights = { ...arch.species };
  if (district && DISTRICT_HUMAN_FACTOR[district] && speciesWeights.human) speciesWeights.human *= DISTRICT_HUMAN_FACTOR[district];
  let sp = opts.species && SPECIES_BY_ID[opts.species] ? SPECIES_BY_ID[opts.species] : null;
  if (sp && arch.clone && sp.id !== 'human') sp = SPECIES_BY_ID.human; // Coruscant Guard clones are human
  if (!sp) {
    const fits = Object.fromEntries(Object.entries(speciesWeights).filter(([id]) => SPECIES_BY_ID[id] && Object.keys(outfitWeights).some((o) => outfitFitsSpecies(OUTFITS_BY_ID[o], SPECIES_BY_ID[id]))));
    sp = SPECIES_BY_ID[weightedKey(rng, Object.keys(fits).length ? fits : speciesWeights)];
  }
  // outfits compatible with the species; a species-specific outfit (Rodian sash, Mon Cala cut) is strongly preferred
  let compatible = Object.fromEntries(Object.entries(outfitWeights).filter(([o]) => outfitFitsSpecies(OUTFITS_BY_ID[o], sp)));
  if (!Object.keys(compatible).length) compatible = Object.fromEntries(OUTFITS.filter((o) => outfitFitsSpecies(o, sp) && !o.child).map((o) => [o.id, arch.outfits[o.id] || 0.1]));
  for (const o of Object.keys(compatible)) if (OUTFITS_BY_ID[o].species && OUTFITS_BY_ID[o].species.includes(sp.id)) compatible[o] *= 6;
  const outfit = OUTFITS_BY_ID[weightedKey(rng, compatible)];

  const clone = !!(arch.clone || outfit.clone) && sp.id === 'human';
  let gender = sp.droid ? 'none' : clone ? 'masculine' : (opts.gender && GENDERS.includes(opts.gender)) ? opts.gender : weightedKey(rng, arch.genders);
  let age;
  if (sp.droid) age = 'none';
  else if (clone) age = 'adult';
  else if (arch.child || outfit.child) age = 'child';
  else if (opts.age && (AGES.includes(opts.age) || opts.age === 'child')) age = opts.age;
  else age = weightedKey(rng, (arch.ageByOutfit && arch.ageByOutfit[outfit.id]) || arch.ages);
  if (age === 'child' && !(arch.child || outfit.child) && outfit.headgear !== 'none' && !['cap', 'goggles'].includes(outfit.headgear)) age = 'young';

  const colourway = (opts.colourway && outfit.colourways.find((c) => c.id === opts.colourway)) || outfit.colourways[Math.floor(rng.next() * outfit.colourways.length)];
  // wear: explicit > archetype weights x district, clamped to what the outfit supports
  let wearWeights = {};
  for (const w of outfit.wear) wearWeights[w] = (arch.wear[w] || 0.15) * (district && DISTRICT_WEAR[district] ? DISTRICT_WEAR[district][w] || 1 : 1);
  let wear = opts.wear && outfit.wear.includes(opts.wear) ? opts.wear : weightedKey(rng, wearWeights);
  if (opts.wear && !outfit.wear.includes(opts.wear)) wear = outfit.wear[Math.min(outfit.wear.length - 1, Math.max(0, WEAR_LEVELS.indexOf(opts.wear)))];

  const faceRng = new RNG(subSeed(seed, `face:${sp.id}:${gender}:${age}`));
  const face = sp.droid ? null : pickFace(faceRng, { gender, age, sp, clone });
  const id = ['w9', seed, archetypeId, sp.id, gender, age, outfit.id, colourway.id, wear].join('.');
  return { id, seed, archetype: archetypeId, archetypeLabel: arch.label, species: sp.id, sp, gender, age, clone, outfit, colourway, wear, face, rank: opts.rank || null, district };
}

export function parseAppearanceId(id) {
  const p = String(id).split('.');
  if (p.length < 9 || p[0] !== 'w9') return null;
  return { seed: parseInt(p[1], 10), archetype: p[2], species: p[3], gender: p[4], age: p[5], outfit: p[6], colourway: p[7], wear: p[8] };
}

// ---------------------------------------------------------------------------------------------------------------
class LRU {
  constructor(cap) { this.cap = cap; this.map = new Map(); this.hits = 0; this.misses = 0; this.evictions = 0; }
  get(k) { const v = this.map.get(k); if (v === undefined) { this.misses++; return undefined; } this.map.delete(k); this.map.set(k, v); this.hits++; return v; }
  set(k, v) { if (this.map.has(k)) this.map.delete(k); this.map.set(k, v); if (this.map.size > this.cap) { const first = this.map.keys().next().value; this.map.delete(first); this.evictions++; } }
  has(k) { return this.map.has(k); }
  get size() { return this.map.size; }
  clear() { this.map.clear(); }
  keys() { return [...this.map.keys()]; }
}
export const appearanceCache = new LRU(CACHE_CAPACITY);

// body scale (applied by the integrator to root.scale): species x gender silhouette x seed jitter; children small
function bodyScale(choice, rng) {
  const s = choice.sp.scale ? choice.sp.scale.slice() : [1, 1, 1];
  const g = choice.gender === 'feminine' ? [0.94, 0.975, 0.94] : choice.gender === 'androgynous' ? [0.97, 0.99, 0.97] : [1, 1, 1];
  const j = 1 + (rng.next() - 0.5) * 0.06;
  let out = [s[0] * g[0] * j, s[1] * g[1] * (1 + (rng.next() - 0.5) * 0.05), s[2] * g[2] * j];
  if (choice.age === 'child') out = out.map((v, i) => v * (i === 1 ? 0.68 : 0.74));
  if (choice.age === 'elder') out[1] *= 0.97;
  return out.map((v) => Math.round(v * 1000) / 1000);
}

// Paint step. Returns the appearance object (not cached here). `canvas: false` (the instanced crowd, which blits
// app.raster into its atlas) skips the DOM canvas and the eye-strip ImageData: app.canvas / app.skin / eyes.image
// are null then, everything else is identical.
export function paintAppearance(choice, { canvas: wantCanvas = true } = {}) {
  const { sp, outfit, colourway, wear, face, gender, age, seed } = choice;
  const r = new Raster(TEX_W, TEX_H);
  const alloc = new ShelfAllocator();
  const geometry = [];
  const overlays = [];
  const outfitRng = new RNG(subSeed(seed, 'outfit'));
  const wearRng = new RNG(subSeed(seed, 'wear'));
  const geomRng = new RNG(subSeed(seed, 'geometry'));
  let head = null, skin = rgb('#8a8a90'), hairColour = null;

  if (!sp.droid) {
    skin = rgb(face.tone.c);
    hairColour = sp.hair === false ? null : effectiveHairColour(face);
    const faceRng = new RNG(subSeed(seed, `facepaint:${sp.id}:${gender}:${age}`));
    head = paintHead(r, face, sp, faceRng);
    // base body in skin so anything an outfit leaves open (sleeveless gowns, shorts, rolled sleeves) is skin
    fillPart(r, 'body', skin); fillPart(r, 'arm', skin); fillPart(r, 'leg', skin);
    if (sp.geometry) for (const rec of sp.geometry({ skin, rng: geomRng, face })) geometry.push(rec);
    if (hairColour && !HAIR_VOLUME_BLOCKED.has(outfit.headgear || 'none')) for (const rec of hairGeometry(face, hairColour)) geometry.push(rec);
  }

  // droid box models allocate over the whole canvas (the classic layout is unused)
  const parts = [];
  const allAlloc = outfit.model ? new ShelfAllocator([[0, 0, TEX_W, TEX_H]]) : null;
  const ctx = {
    r, p: colourway.p, wear, rng: outfitRng, skin, sp, face, gender, age, rank: choice.rank, geometry, overlays, alloc, hairColour,
    parts, allocAll: allAlloc ? (w, h, d, separate) => boxUV(allAlloc, { w, h, d }, { separate }) : null,
    helmet: false, armour: !!outfit.armour, patchColours: null, eyeLamps: null, modelKind: null, height: 32,
  };
  outfit.paint(ctx);
  if (!outfit.model) applyWear(r, wear, wearRng, { armour: ctx.armour, patchColours: ctx.patchColours || undefined });
  else if (wear !== 'clean') {
    // box-model droids: scuffs on every part; patched adds mismatched replacement plates and rust streaks
    const patched = wear === 'patched';
    for (const part of parts) for (const rect of new Set(Object.values(part.uv))) {
      const n = Math.round(rect[2] * rect[3] * (patched ? 0.14 : 0.08));
      for (let k = 0; k < n; k++) r.mul(rect[0] + wearRng.int(0, rect[2] - 1), rect[1] + wearRng.int(0, rect[3] - 1), wearRng.chance(0.5) ? 0.8 : 1.12);
      if (patched && rect[2] >= 4 && rect[3] >= 3 && wearRng.chance(0.6)) {
        const pw = wearRng.int(1, 2), ph = wearRng.int(1, 2), px = rect[0] + wearRng.int(0, rect[2] - pw), py = rect[1] + wearRng.int(0, rect[3] - ph);
        r.rect(px, py, pw, ph, wearRng.chance(0.5) ? '#6a5a4a' : '#55585e');
        if (wearRng.chance(0.5)) r.vline(px, py + ph, Math.min(rect[1] + rect[3] - 1, py + ph + 2), '#7a4a2a'); // rust run below the plate
      }
    }
  }

  // textures for the geometry boxes, packed in the free area; painters are stripped so the records stay plain data
  const fallback = () => alloc.alloc(2, 2);
  let fallbackRect = null;
  for (const rec of geometry) {
    for (const box of rec.boxes) {
      let uv = boxUV(alloc, box, { separate: box.separate });
      for (const f of ALL_FACES) if (!uv[f]) { if (!fallbackRect) { fallbackRect = fallback() || [0, 0, 1, 1]; r.rect(fallbackRect[0], fallbackRect[1], fallbackRect[2], fallbackRect[3], '#808080'); } uv[f] = fallbackRect; }
      const fill = box.fill || rec.colour || '#808080';
      for (const rect of new Set(Object.values(uv))) if (rect !== fallbackRect) r.rect(rect[0], rect[1], rect[2], rect[3], fill);
      if (box.paint) { try { box.paint(r, uv, box, ctx); } catch (e) { /* a missing separate face: keep the fill */ } }
      box.uv = uv; box.colour = hex(fill);
      delete box.paint; delete box.fill; delete box.separate;
    }
    if (rec.colour && typeof rec.colour !== 'string') rec.colour = hex(rec.colour);
  }
  // overlays: an inflated second layer around a part (hoods): 8x8 texel faces, transparent face opening
  for (const ov of overlays) {
    const s = 8, uv = {};
    const shell = alloc.alloc(s, s), front = alloc.alloc(s, s);
    if (!shell || !front) continue;
    const c = ov.colour || '#333333';
    r.rect(shell[0], shell[1], s, s, c); r.rect(front[0], front[1], s, s, c);
    if (ov.faceOpening) r.clear(front[0] + 1, front[1] + 1, s - 2, s - 1);
    for (const f of ALL_FACES) uv[f] = f === 'front' ? front : shell;
    ov.uv = uv; ov.colour = hex(c); delete ov.faceOpening;
  }

  const canvas = wantCanvas ? createCanvas(TEX_W, TEX_H) : null;
  if (canvas) r.blitTo(canvas);
  // eye info for blink.js (null when a helmet / mask / droid shell hides the eyes)
  let eyes = null;
  if (head && head.strip && !ctx.helmet && !HEAD_HEADGEAR.has(outfit.headgear)) {
    const s = head.strip;
    eyes = { x: s.x, y: s.y, w: s.w, h: s.h, pixels: head.eyePixels, iris: hex(head.iris), lid: hex(head.lid), image: canvas ? canvas.getContext('2d').getImageData(s.x, s.y, s.w, s.h) : null };
  }
  const scaleRng = new RNG(subSeed(seed, 'scale'));
  const model = outfit.model ? { kind: 'boxes', model: outfit.model, parts, height: ctx.height, scale: [1, 1, 1] } : { kind: 'humanoid', scale: bodyScale(choice, scaleRng), height: 32 };
  const palette = { skin: hex(skin), hair: hairColour ? hex(hairColour) : null, eyes: face ? face.eyeColour.c : (ctx.p.eye || ctx.p.glow || null), ...Object.fromEntries(Object.entries(colourway.p).filter(([, v]) => typeof v === 'string')) };
  const tags = [sp.id, gender, age, choice.archetype, outfit.faction, outfit.role, outfit.id, colourway.id, wear, ctx.helmet ? 'helmet' : 'bare_head', sp.droid ? 'droid' : 'organic', choice.clone ? 'clone' : null].filter(Boolean);
  const app = {
    id: choice.id, seed, archetype: choice.archetype, species: sp.id, speciesName: sp.name, gender, age, clone: choice.clone,
    outfit: { id: outfit.id, name: outfit.name, faction: outfit.faction, role: outfit.role, colourway: colourway.id, colourwayName: colourway.name, wear, headgear: outfit.headgear || 'none' },
    face: face ? { ...face, id: faceId(face), tone: face.tone.id, eyeColour: face.eyeColour.id, hairColour: face.hairColour.id } : null,
    skin: canvas, canvas, raster: r, overlays, geometry, model, palette, tags, eyes, // .canvas: attachBlink(npc, app) reads skinInfo.canvas + .eyes + .seed
    debug: head ? { eyeRects: head.eyeRects, browRects: head.browRects, faceRect: head.faceRect, eyeKind: head.eyeKind, eyeLamps: ctx.eyeLamps } : { eyeLamps: ctx.eyeLamps },
    alloc: { allocated: alloc.allocated, failed: alloc.failed },
  };
  app.description = describeChoice(choice, app);
  return app;
}

// Deterministic composer with the LRU cache. Same seed + options -> the same object (and canvas) back.
export function composeAppearance(seed, opts = {}) {
  const choice = chooseAppearance(seed, opts);
  const cached = appearanceCache.get(choice.id);
  if (cached) return cached;
  const app = paintAppearance(choice);
  appearanceCache.set(choice.id, app);
  return app;
}
export const getAppearance = composeAppearance;
export function composeUncached(seed, opts = {}, paintOpts = undefined) { return paintAppearance(chooseAppearance(seed, opts), paintOpts); }

// ---------------------------------------------------------------------------------------------------------------
const AGE_WORDS = { child: 'child', young: 'young', adult: 'adult', middle: 'middle-aged', elder: 'elderly', none: '' };
const GENDER_WORDS = { feminine: 'woman', masculine: 'man', androgynous: 'person', none: '' };
const WEAR_WORDS = { clean: 'clean and pressed', worn: 'with working scuffs', patched: 'patched and stained' };
export function describeChoice(choice, app = null) {
  const { sp, outfit, colourway, wear, face, gender, age } = choice;
  if (sp.droid) return `${outfit.describe} (${colourway.name} plating), ${WEAR_WORDS[wear]}`;
  const who = age === 'child' ? `${sp.adjective} child` : `${AGE_WORDS[age]} ${sp.adjective} ${GENDER_WORDS[gender]}`.replace(/\s+/g, ' ').trim();
  const bits = [];
  if (face) {
    bits.push(`${face.tone.id.replace(/tone\d/, sp.id === 'human' ? '' : colourName(face.tone.c))} skin`.replace(/^ /, ''));
    if (sp.eyeKind === 'human') bits.push(`${face.eyeColour.id.replace('_', ' ')} ${face.eyeShape} eyes`);
    else if (sp.eyeKind === 'large_dark') bits.push('large dark eyes');
    if (sp.hair !== false && face.hairStyle !== 'none') bits.push(`${face.hairColour.id.replace('_', ' ')} ${face.hairStyle.replace('_', ' ')} hair`);
    else if (sp.hair !== false) bits.push('shaved head');
    if (face.facialHair !== 'none' && sp.hair !== false) bits.push(face.facialHair.replace('_', ' '));
    if (face.marking !== 'none') bits.push(face.marking.replace('_', ' '));
    if (choice.clone) bits.push('clone template face');
  }
  const geo = speciesPartNames(sp);
  const speciesBits = geo.length ? ` (${geo.join(', ')})` : '';
  return `${who}${speciesBits}; ${bits.join(', ')}; ${outfit.describe} [${colourway.name}], ${WEAR_WORDS[wear]}`;
}
// The species' own voxel parts by name (lekku, montrals...) - static per species, so describeAppearance(id) and
// app.description agree without painting anything.
const PART_NAME_CACHE = new Map();
export function speciesPartNames(sp) {
  if (!sp.geometry) return [];
  if (PART_NAME_CACHE.has(sp.id)) return PART_NAME_CACHE.get(sp.id);
  const recs = sp.geometry({ skin: [128, 128, 128, 255], rng: new RNG(1), face: null });
  const names = [...new Set(recs.map((g) => (g.part || (g.kind === 'eyes' ? 'bulging eyes' : g.kind)).replace(/_/g, ' ')))];
  PART_NAME_CACHE.set(sp.id, names);
  return names;
}
export function colourName(c) {
  const [r, g, b] = rgb(c).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (s < 0.12) return l > 0.6 ? 'pale grey' : 'grey';
  let h = 0;
  if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 15 || h >= 345) return l < 0.35 ? 'dark red' : 'red';
  if (h < 45) return l > 0.7 ? 'tan' : l < 0.45 ? 'brown' : 'orange';
  if (h < 70) return s < 0.4 ? 'olive' : 'yellow';
  if (h < 160) return 'green';
  if (h < 200) return 'teal';
  if (h < 260) return l > 0.6 ? 'pale blue' : 'blue';
  if (h < 300) return 'violet';
  return 'pink';
}
export function describeAppearance(idOrApp) {
  if (idOrApp && typeof idOrApp === 'object') return idOrApp.description || describeChoice(chooseAppearance(idOrApp.seed, idOrApp), idOrApp);
  const p = parseAppearanceId(idOrApp);
  if (!p) return '';
  const choice = chooseAppearance(p.seed, { archetype: p.archetype, species: p.species, gender: p.gender === 'none' ? undefined : p.gender, age: p.age === 'none' ? undefined : p.age, outfit: p.outfit, colourway: p.colourway, wear: p.wear });
  return describeChoice(choice, null);
}

// ---------------------------------------------------------------------------------------------------------------
// Head-only paint (faces sheet, canonical faces, eye-rule tests): returns the raster with the head painted.
export function paintHeadOnly(seed, { gender = 'masculine', age = 'adult', species = 'human', clone = false } = {}) {
  const sp = SPECIES_BY_ID[species] || SPECIES_BY_ID.human;
  const faceRng = new RNG(subSeed(seed, `face:${sp.id}:${gender}:${age}`));
  const face = pickFace(faceRng, { gender, age, sp, clone });
  const r = new Raster(TEX_W, TEX_H);
  const head = paintHead(r, face, sp, new RNG(subSeed(seed, `facepaint:${sp.id}:${gender}:${age}`)));
  return { raster: r, face, head, seed, gender, age, species: sp.id };
}
export const canonicalFaceSet = (count = 100) => canonicalFaces(paintHeadOnly, count);

export const APPEARANCE_STATS = {
  faces: {
    skinTones: SKIN_TONES.length, eyeColours: EYE_COLOURS.length, eyeShapes: EYE_SHAPES.length, brows: BROWS.length, noses: NOSES.length, mouths: MOUTHS.length,
    facialHair: FACIAL_HAIR.length, hairStyles: HAIR_STYLES.length, hairColours: HAIR_COLOURS.length, ages: AGES.length + 1, markings: MARKINGS.length, genders: GENDERS.length,
    combinations: FACE_COMBINATIONS, canonical: 100, faceTexels: 16 * 16,
  },
  species: { total: SPECIES.length, aliens: SPECIES.filter((s) => s.id !== 'human' && !s.droid).length, organic: SPECIES.filter((s) => !s.droid).length, withGeometry: SPECIES.filter((s) => !!s.geometry).length, ids: SPECIES.map((s) => s.id) },
  outfits: { total: OUTFITS.length, colourways: OUTFITS.reduce((n, o) => n + o.colourways.length, 0), withWearVariants: OUTFITS.filter((o) => o.wear.length >= 2).length, helmets: OUTFITS.filter((o) => HEAD_HEADGEAR.has(o.headgear)).length, droids: OUTFITS.filter((o) => o.droid).length, ids: OUTFITS.map((o) => o.id) },
  archetypes: Object.keys(ARCHETYPES).length,
  texture: { width: TEX_W, height: TEX_H, bytesPerSkin: TEX_W * TEX_H * 4, layout: 'classic 64x32 Minecraft layout at 2x; model.js UVs are normalised so it maps 1:1', cache: CACHE_CAPACITY, cacheBytesMax: TEX_W * TEX_H * 4 * CACHE_CAPACITY, note: 'per-NPC canvases (one texture + one material per NPC, geometry parts share it); 150 live NPCs = 4.9 MB, LRU cap 512 = 16.8 MB' },
};

export { REG, PART, TEX_W, TEX_H, mix };
