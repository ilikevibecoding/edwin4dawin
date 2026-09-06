// Star Wars skins for the Coruscant crowd (rubric 07 row 5), painted into cells of a shared atlas in the classic
// 64x32 layout so the instanced crowd renderer (npc/coruscant/crowd.js) can draw every archetype from one texture.
// Faces follow the town's eye rules from skins.js (two separated eyes, white outside / iris inside, one skin pixel
// between them, a 2 px brow ridge above each eye painted as a skin shadow, nose shadow, lip line); the palettes and
// region table are the ones skins.js exports. Droids have no eyes: their photoreceptors are painted with alpha 0.75,
// which the crowd shader reads as "emissive" (lit at night).
import { RNG } from '../rng.js';
import { REGIONS as R, IRIS_COLORS, IRIS_DARK, DARK_SKIN_LUMINANCE, EYE_WHITE } from './skins.js';

export const CELL_W = 64, CELL_H = 32;
export const EMISSIVE_ALPHA = 0.75;

const SKIN_TONES = ['#c69b74', '#b98a63', '#d9a985', '#8d5a3b', '#e0b48f', '#a06e4a', '#6b432b', '#f0c8a0', '#7a4a2e'];
// a few near-human / alien complexions (Mirialan green, Pantoran blue, Zeltron rose, Chagrian teal)
const ALIEN_TONES = ['#7f9a5c', '#6a86c2', '#c97a8a', '#5f9a96'];
const HAIR = ['#2b1d12', '#4a3020', '#7a5230', '#1a1a1a', '#a8773f', '#c9a15a', '#8c8c8c', '#3d2a1a', '#d8d0c0', '#5a2a1a'];
const LIP_TINT = '#a8484a';

function rgb(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
function shade(c, f) { const [r, g, b] = rgb(c); const cl = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return `rgb(${cl(r)},${cl(g)},${cl(b)})`; }
function mix(a, b, t) { const A = rgb(a), B = rgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; }
function luminance(c) { const [r, g, b] = rgb(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }
const rgba = (c, a) => { const [r, g, b] = rgb(c); return `rgba(${r},${g},${b},${a})`; };

// Outfit palettes per archetype: [primary, secondary, trousers]
const OUTFITS = {
  'office worker': { tops: ['#4a5a7a', '#5c6670', '#6b7a5a', '#7a6a5a', '#3f4f5f', '#8a8a9a'], pants: ['#2b2f3a', '#3a3a3a', '#4a4030'], collar: true, belt: '#2a2a2a' },
  resident: { tops: ['#a86a4a', '#5a8a6a', '#8a5a7a', '#c2a15c', '#4a7a9a', '#9a6a3a', '#7a7a7a'], pants: ['#3b4a6b', '#4d3b2a', '#5a5a5a', '#2f3f5f'], belt: '#3a2a1a' },
  senator: { tops: ['#4a2a5a', '#6a2a2a', '#1f2f5f', '#2f4a2f', '#5a3a1a'], pants: null, collar: '#d8c08a', robe: true },
  'senate aide': { tops: ['#d8d0c0', '#b8b0a0', '#c8c0b8'], pants: ['#3a3a4a', '#2b2b3a'], sash: '#5a2a3a', collar: true },
  'senate guard': { tops: ['#2a4fb8'], pants: null, robe: true, helmet: '#2a4fb8', trim: '#c9a227' },
  'security officer': { tops: ['#5a5f66', '#4f545a'], pants: ['#3a3d42'], cap: '#2f3236', badge: '#d8c08a', belt: '#1a1a1a' },
  pilot: { tops: ['#d8622a', '#6b6f3a', '#c9552a'], pants: null, suit: true, chest: '#e8e8e8', goggles: '#2a2a2a', straps: '#3a3a3a' },
  mechanic: { tops: ['#4a5a6a', '#a08860', '#5a6a5a', '#6a5a4a'], pants: null, suit: true, goggles: '#3a3a2a', belt: '#6b4a2f', stains: true },
  'dock worker': { tops: ['#c9a15a', '#a08860', '#8a7a5a'], pants: ['#3a3a3a', '#4d3b2a'], vest: '#3a2a1a', bareArms: true },
  vendor: { tops: ['#a83a3a', '#4a6ea8', '#5d8a4e', '#8a6a3d', '#6f4f8a'], pants: ['#4d3b2a', '#3b4a6b'], apron: ['#e8e2d2', '#c2a15c', '#8a4a2a'] },
  cook: { tops: ['#f0ece0'], pants: ['#2b2b2b', '#3a3a4a'], apron: ['#f0ece0'], capCol: '#f0ece0', neck: '#a83a3a' },
  bartender: { tops: ['#f0ece0'], pants: ['#1a1a1a'], vest: '#1a1a1a', apron: ['#2b2b2b'], bowtie: true },
  medic: { tops: ['#f4f4f4'], pants: ['#3a7a7a', '#2a5a6a'], coat: true, cross: '#c83a3a' },
  patient: { tops: ['#b8d0e0', '#c8e0c8', '#d0c8e0'], pants: null, gown: true, bareArms: true },
  tourist: { tops: ['#e040a0', '#40c040', '#20c0e0', '#f08020', '#f0e020', '#a040f0'], pants: ['#f0e0a0', '#e0e0e0', '#3a3a3a'], loud: true },
  courier: { tops: ['#3a3a4a', '#4a3a2a', '#2a3a4a'], pants: ['#2b2b2b', '#3a4a3a'], satchel: '#8a6a3d', strap: '#6b4a2f', cap: '#2a2a2a' },
  jedi: { tops: ['#c9b28a', '#d8c8a8', '#b8a888'], pants: ['#5a4a3a', '#4a3a2a'], tabard: '#5a3a1a', robe: '#6b4a2f', belt: '#3a2a1a' },
  'bounty hunter': { tops: ['#4a5a4a', '#5a5a6a', '#6a5a3a'], pants: ['#2b2b2b', '#3a3a2a'], armour: true, accent: ['#c83a2a', '#e0a020', '#3a8ac0'], helmet: '#4a5a4a' },
  journalist: { tops: ['#2a8a8a', '#a83a5a', '#4a4aa8'], pants: ['#2b2b2b', '#3a3a4a'], shirt: '#f0ece0', badge: '#e0e0e0' },
  'protocol droid': { droid: 'protocol' },
  astromech: { droid: 'astromech' },
  'sweeper droid': { droid: 'sweeper' },
};

export const SW_ARCHETYPES = Object.keys(OUTFITS);

// Paints the skin of `archetype` variant `seed` into the 64x32 cell at (ox, oy) of a 2d context.
export function paintSWSkin(ctx, ox, oy, archetype, seed = 1, female = null) {
  const rng = new RNG((seed >>> 0) * 7919 + 13 + archetype.length * 101);
  const o = OUTFITS[archetype] || OUTFITS.resident;
  ctx.clearRect(ox, oy, CELL_W, CELL_H);
  const rect = (r, col, dx = 0, dy = 0, w = r[2], h = r[3]) => { ctx.fillStyle = col; ctx.fillRect(ox + r[0] + dx, oy + r[1] + dy, w, h); };
  const px = (r, x, y, col) => { ctx.fillStyle = col; ctx.fillRect(ox + r[0] + x, oy + r[1] + y, 1, 1); };
  const noise = (r, base, amt) => { for (let y = 0; y < r[3]; y++) for (let x = 0; x < r[2]; x++) if (rng.next() < 0.35) px(r, x, y, shade(base, 1 + (rng.next() - 0.5) * amt)); };
  // emissive pixel: cleared first so the stored alpha really is EMISSIVE_ALPHA (a fill over an opaque pixel blends to 1)
  const glow = (r, x, y, col) => { ctx.clearRect(ox + r[0] + x, oy + r[1] + y, 1, 1); ctx.fillStyle = rgba(col, EMISSIVE_ALPHA); ctx.fillRect(ox + r[0] + x, oy + r[1] + y, 1, 1); };
  if (o.droid) { paintDroid(rect, px, glow, noise, rng, o.droid); return { droid: o.droid }; }

  const alien = rng.chance(archetype === 'senator' || archetype === 'tourist' || archetype === 'bounty hunter' ? 0.3 : 0.12);
  const skin = alien ? rng.pick(ALIEN_TONES) : rng.pick(SKIN_TONES);
  const hair = rng.pick(HAIR);
  if (female === null) female = rng.chance(0.5);
  const top = rng.pick(o.tops);
  const pants = o.pants ? rng.pick(o.pants) : top;
  const beard = !female && !alien && rng.chance(0.35), mustache = !female && !alien && rng.chance(0.3);

  // ---- head: skin, hair, then the face (skins.js rules)
  for (const r of [R.headTop, R.headRight, R.headFront, R.headLeft, R.headBack, R.headBottom]) rect(r, skin);
  noise(R.headFront, skin, 0.08);
  const bald = alien && rng.chance(0.6);
  if (!bald) {
    rect(R.headTop, hair);
    rect(R.headBack, hair, 0, 0, 8, female ? 8 : 5);
    rect(R.headRight, hair, 0, 0, 8, female ? 4 : 3); rect(R.headLeft, hair, 0, 0, 8, female ? 4 : 3);
    rect(R.headFront, hair, 0, 0, 8, 1);
    if (female) { rect(R.headFront, hair, 0, 0, 1, 3); rect(R.headFront, hair, 7, 0, 1, 3); }
  } else if (rng.chance(0.5)) { // lekku / montrals hint: two darker stripes down the back of the head
    rect(R.headBack, shade(skin, 0.8), 1, 0, 2, 8); rect(R.headBack, shade(skin, 0.8), 5, 0, 2, 8);
  }
  paintFace(ctx, ox, oy, rng, skin, hair, female, beard, mustache);

  // ---- body
  const bodyCol = top;
  for (const r of [R.bodyFront, R.bodyBack, R.bodyRight, R.bodyLeft, R.bodyTop, R.bodyBottom]) rect(r, bodyCol);
  const armCol = o.bareArms || o.gown ? skin : (o.robe && o.robe !== true ? o.robe : bodyCol);
  for (const r of [R.armFront, R.armBack, R.armRight, R.armLeft]) rect(r, armCol);
  rect(R.armTop, armCol); rect(R.armBottom, skin);
  const legCol = pants;
  for (const r of [R.legFront, R.legBack, R.legRight, R.legLeft]) rect(r, legCol);
  rect(R.legTop, legCol); rect(R.legBottom, '#2a1a0e');

  switch (archetype) {
    case 'office worker': {
      rect(R.bodyFront, '#e8e2d2', 3, 0, 2, 3); // shirt collar V
      if (rng.chance(0.5)) rect(R.bodyFront, shade(top, 0.75), 3, 3, 2, 8); // tie / tunic seam
      for (const r of [R.bodyFront, R.bodyBack, R.bodyRight, R.bodyLeft]) rect(r, o.belt, 0, 11, r[2], 1);
      px(R.bodyFront, 3, 11, '#c9a15a'); px(R.bodyFront, 4, 11, '#c9a15a');
      break;
    }
    case 'resident': {
      if (rng.chance(0.4)) { const v = shade(top, 0.6); rect(R.bodyFront, v, 0, 0, 2, 12); rect(R.bodyFront, v, 6, 0, 2, 12); }
      else if (rng.chance(0.5)) for (let y = 1; y < 12; y += 3) rect(R.bodyFront, shade(top, 0.85), 0, y, 8, 1);
      for (const r of [R.bodyFront, R.bodyBack, R.bodyRight, R.bodyLeft]) rect(r, o.belt, 0, 11, r[2], 1);
      break;
    }
    case 'senator': {
      // floor-length robe: legs painted in the robe colour with a darker hem, wide pale collar, gold clasp
      for (const r of [R.legFront, R.legBack, R.legRight, R.legLeft]) { rect(r, top); rect(r, shade(top, 0.7), 0, 10, 4, 2); }
      rect(R.legTop, top);
      rect(R.bodyFront, o.collar, 0, 0, 8, 2); rect(R.bodyBack, o.collar, 0, 0, 8, 2); rect(R.bodyRight, o.collar, 0, 0, 4, 2); rect(R.bodyLeft, o.collar, 0, 0, 4, 2);
      rect(R.bodyFront, shade(top, 1.25), 3, 2, 2, 10);
      px(R.bodyFront, 3, 2, '#e0b030'); px(R.bodyFront, 4, 2, '#e0b030');
      for (const r of [R.armFront, R.armBack, R.armRight, R.armLeft]) rect(r, shade(top, 0.85), 0, 8, 4, 2); // wide cuffs
      break;
    }
    case 'senate aide': {
      rect(R.bodyFront, o.sash, 1, 0, 2, 12); rect(R.bodyBack, o.sash, 5, 0, 2, 12); // sash over one shoulder
      rect(R.bodyFront, shade(top, 0.9), 3, 0, 2, 1);
      for (const r of [R.bodyFront, R.bodyBack, R.bodyRight, R.bodyLeft]) rect(r, '#3a3a4a', 0, 11, r[2], 1);
      break;
    }
    case 'senate guard': {
      const blue = top, gold = o.trim;
      for (const r of [R.legFront, R.legBack, R.legRight, R.legLeft]) rect(r, blue);
      rect(R.legTop, blue);
      // helmet: crest over the top and back, cheek guards; the face (eyes, brows, nose, mouth) stays visible
      for (const r of [R.headTop, R.headBack]) rect(r, blue);
      rect(R.headRight, blue, 0, 0, 8, 3); rect(R.headLeft, blue, 0, 0, 8, 3);
      rect(R.headRight, blue, 6, 3, 2, 5); rect(R.headLeft, blue, 0, 3, 2, 5);
      rect(R.headFront, blue, 0, 0, 8, 2); rect(R.headFront, blue, 0, 2, 1, 6); rect(R.headFront, blue, 7, 2, 1, 6);
      rect(R.headTop, gold, 3, 0, 2, 8); rect(R.headBack, gold, 3, 0, 2, 4); rect(R.headFront, gold, 3, 0, 2, 1);
      rect(R.bodyFront, gold, 0, 0, 8, 1); rect(R.bodyFront, gold, 3, 1, 2, 11);
      for (const r of [R.armFront, R.armBack, R.armRight, R.armLeft]) rect(r, gold, 0, 8, 4, 1);
      break;
    }
    case 'security officer': {
      // grey uniform, dark cap with a brim band, shoulder tabs, badge
      rect(R.headTop, o.cap); rect(R.headBack, o.cap, 0, 0, 8, 2); rect(R.headRight, o.cap, 0, 0, 8, 2); rect(R.headLeft, o.cap, 0, 0, 8, 2);
      rect(R.headFront, o.cap, 0, 0, 8, 2); rect(R.headFront, shade(o.cap, 1.5), 0, 1, 8, 1);
      rect(R.bodyFront, shade(top, 0.7), 0, 0, 8, 1); rect(R.bodyFront, shade(top, 0.8), 3, 1, 2, 11);
      px(R.bodyFront, 1, 2, o.badge); px(R.bodyFront, 6, 2, shade(top, 1.3));
      for (const r of [R.bodyFront, R.bodyBack, R.bodyRight, R.bodyLeft]) rect(r, o.belt, 0, 11, r[2], 1);
      px(R.bodyFront, 4, 11, '#c9a15a');
      break;
    }
    case 'pilot': {
      // flight suit with the white chest box, dark straps and goggles pushed up on the forehead (rows 1-2)
      rect(R.bodyFront, o.chest, 2, 3, 4, 4); rect(R.bodyFront, '#3a3a3a', 3, 4, 2, 1); px(R.bodyFront, 3, 5, '#c83a2a'); px(R.bodyFront, 4, 6, '#3a8ac0');
      rect(R.bodyFront, o.straps, 1, 0, 1, 12); rect(R.bodyFront, o.straps, 6, 0, 1, 12); rect(R.bodyBack, o.straps, 1, 0, 1, 12); rect(R.bodyBack, o.straps, 6, 0, 1, 12);
      for (const r of [R.legFront, R.legBack, R.legRight, R.legLeft]) { rect(r, top); rect(r, shade(top, 0.75), 0, 5, 4, 1); rect(r, '#2a2a2a', 0, 9, 4, 3); }
      rect(R.legTop, top);
      rect(R.headFront, o.goggles, 1, 1, 6, 1); px(R.headFront, 2, 1, '#6a8ac0'); px(R.headFront, 5, 1, '#6a8ac0');
      rect(R.headRight, o.goggles, 0, 1, 8, 1); rect(R.headLeft, o.goggles, 0, 1, 8, 1); rect(R.headBack, o.goggles, 0, 1, 8, 1);
      break;
    }
    case 'mechanic': {
      for (const r of [R.legFront, R.legBack, R.legRight, R.legLeft]) { rect(r, top); rect(r, '#2a1a0e', 0, 9, 4, 3); }
      rect(R.legTop, top);
      for (const r of [R.bodyFront, R.bodyBack, R.bodyRight, R.bodyLeft]) rect(r, o.belt, 0, 10, r[2], 1);
      px(R.bodyFront, 1, 10, '#8a8a8a'); px(R.bodyFront, 6, 10, '#8a8a8a'); px(R.bodyFront, 0, 9, '#c0c0c0'); // tools
      rect(R.bodyFront, shade(top, 0.8), 3, 0, 2, 10); // zip
      if (o.stains) for (let i = 0; i < 5; i++) px(rng.chance(0.5) ? R.bodyFront : R.legFront, Math.floor(rng.next() * 4), Math.floor(rng.next() * 12), shade(top, 0.6));
      rect(R.headFront, o.goggles, 1, 1, 6, 1); px(R.headFront, 2, 1, '#c0b070'); px(R.headFront, 5, 1, '#c0b070');
      rect(R.headRight, o.goggles, 0, 1, 8, 1); rect(R.headLeft, o.goggles, 0, 1, 8, 1); rect(R.headBack, o.goggles, 0, 1, 8, 1);
      break;
    }
    case 'dock worker': {
      rect(R.bodyFront, o.vest, 0, 0, 2, 12); rect(R.bodyFront, o.vest, 6, 0, 2, 12); rect(R.bodyBack, o.vest); rect(R.bodyRight, o.vest); rect(R.bodyLeft, o.vest);
      px(R.bodyFront, 1, 3, '#d8d8d8'); px(R.bodyFront, 6, 3, '#d8d8d8'); // reflective tabs
      for (const r of [R.armFront, R.armBack, R.armRight, R.armLeft]) rect(r, top, 0, 0, 4, 3); // short sleeves
      for (const r of [R.bodyFront, R.bodyBack, R.bodyRight, R.bodyLeft]) rect(r, '#3a2a1a', 0, 11, r[2], 1);
      break;
    }
    case 'vendor': {
      const apron = rng.pick(o.apron);
      rect(R.bodyFront, apron, 1, 3, 6, 9); rect(R.bodyFront, shade(apron, 0.85), 3, 0, 2, 3);
      for (const r of [R.legFront, R.legBack]) rect(r, apron, 0, 0, 4, 4);
      if (rng.chance(0.5)) { const sc = rng.pick(['#a83a3a', '#3a5aa8', '#f0c040']); rect(R.headTop, sc); rect(R.headFront, sc, 0, 0, 8, 1); rect(R.headRight, sc, 0, 0, 8, 1); rect(R.headLeft, sc, 0, 0, 8, 1); rect(R.headBack, sc, 0, 0, 8, 2); }
      for (const r of [R.armFront, R.armBack, R.armRight, R.armLeft]) rect(r, skin, 0, 7, 4, 5); // rolled sleeves
      break;
    }
    case 'cook': {
      rect(R.bodyFront, o.apron[0], 1, 4, 6, 8); rect(R.bodyFront, o.neck, 3, 0, 2, 1);
      for (let y = 2; y < 10; y += 3) { px(R.bodyFront, 2, y, '#3a3a3a'); px(R.bodyFront, 5, y, '#3a3a3a'); } // double-breasted buttons
      for (const r of [R.legFront, R.legBack, R.legRight, R.legLeft]) for (let y = 0; y < 9; y += 2) rect(r, shade(pants, 1.6), 0, y, 4, 1); // checks
      rect(R.headTop, o.capCol); rect(R.headFront, o.capCol, 0, 0, 8, 1); rect(R.headRight, o.capCol, 0, 0, 8, 1); rect(R.headLeft, o.capCol, 0, 0, 8, 1); rect(R.headBack, o.capCol, 0, 0, 8, 2);
      for (const r of [R.armFront, R.armBack, R.armRight, R.armLeft]) rect(r, skin, 0, 7, 4, 5);
      break;
    }
    case 'bartender': {
      rect(R.bodyFront, o.vest, 0, 0, 2, 12); rect(R.bodyFront, o.vest, 6, 0, 2, 12); rect(R.bodyBack, o.vest); rect(R.bodyRight, o.vest); rect(R.bodyLeft, o.vest);
      rect(R.bodyFront, o.apron[0], 1, 7, 6, 5);
      rect(R.bodyFront, '#1a1a1a', 3, 0, 2, 1); // bow tie
      for (const r of [R.armFront, R.armBack, R.armRight, R.armLeft]) rect(r, skin, 0, 7, 4, 5);
      break;
    }
    case 'medic': {
      rect(R.bodyFront, rng.pick(o.pants), 3, 0, 2, 4); // scrubs showing at the coat opening
      px(R.bodyFront, 1, 2, o.cross); px(R.bodyFront, 1, 3, o.cross); px(R.bodyFront, 0, 3, o.cross); px(R.bodyFront, 2, 3, o.cross); px(R.bodyFront, 1, 4, o.cross);
      rect(R.bodyFront, shade(top, 0.85), 3, 4, 2, 8);
      for (const r of [R.legFront, R.legBack, R.legRight, R.legLeft]) rect(r, top, 0, 0, 4, 3); // coat hem
      break;
    }
    case 'patient': {
      for (const r of [R.legFront, R.legBack, R.legRight, R.legLeft]) { rect(r, top, 0, 0, 4, 6); rect(r, skin, 0, 6, 4, 5); rect(r, '#8a8a8a', 0, 11, 4, 1); }
      rect(R.legTop, top);
      rect(R.bodyFront, shade(top, 0.85), 3, 0, 2, 12);
      px(R.bodyFront, 6, 2, '#e8e8e8'); // wristband/ tag
      break;
    }
    case 'tourist': {
      const c2 = rng.pick(o.tops.filter((c) => c !== top));
      for (let y = 0; y < 12; y += 2) rect(R.bodyFront, c2, 0, y, 8, 1); // loud stripes
      for (let y = 0; y < 12; y += 2) rect(R.bodyBack, c2, 0, y, 8, 1);
      for (const r of [R.armFront, R.armBack, R.armRight, R.armLeft]) rect(r, skin, 0, 4, 4, 8); // short sleeves
      if (rng.chance(0.5)) { rect(R.headTop, c2); rect(R.headFront, c2, 0, 0, 8, 1); rect(R.headRight, c2, 0, 0, 8, 1); rect(R.headLeft, c2, 0, 0, 8, 1); rect(R.headBack, c2, 0, 0, 8, 1); } // sun cap
      px(R.bodyFront, 4, 5, '#2a2a2a'); px(R.bodyFront, 5, 5, '#2a2a2a'); px(R.bodyFront, 4, 6, '#2a2a2a'); // holocam on a strap
      break;
    }
    case 'courier': {
      rect(R.bodyFront, o.strap, 1, 0, 1, 12); rect(R.bodyFront, o.strap, 2, 3, 1, 3); rect(R.bodyFront, o.strap, 3, 6, 1, 3); rect(R.bodyFront, o.strap, 4, 9, 1, 3); // diagonal strap
      rect(R.bodyBack, o.strap, 5, 0, 1, 12);
      rect(R.bodyRight, o.satchel, 0, 6, 4, 6); rect(R.bodyRight, shade(o.satchel, 0.7), 0, 6, 4, 1); // satchel on the hip
      rect(R.headTop, o.cap); rect(R.headFront, o.cap, 0, 0, 8, 1); rect(R.headRight, o.cap, 0, 0, 8, 1); rect(R.headLeft, o.cap, 0, 0, 8, 1); rect(R.headBack, o.cap, 0, 0, 8, 2);
      for (const r of [R.bodyFront, R.bodyBack, R.bodyRight, R.bodyLeft]) rect(r, '#1a1a1a', 0, 11, r[2], 1);
      break;
    }
    case 'jedi': {
      rect(R.bodyFront, o.tabard, 1, 0, 2, 12); rect(R.bodyFront, o.tabard, 5, 0, 2, 12); rect(R.bodyBack, o.tabard, 1, 0, 2, 12); rect(R.bodyBack, o.tabard, 5, 0, 2, 12);
      for (const r of [R.bodyFront, R.bodyBack, R.bodyRight, R.bodyLeft]) rect(r, o.belt, 0, 9, r[2], 1);
      px(R.bodyFront, 4, 9, '#c9a15a'); px(R.bodyFront, 6, 10, '#c0c0c0'); px(R.bodyFront, 6, 11, '#3a8ac0'); // saber hilt on the belt
      for (const r of [R.legFront, R.legBack, R.legRight, R.legLeft]) rect(r, top, 0, 0, 4, 4); // tunic skirt
      for (const r of [R.armFront, R.armBack, R.armRight, R.armLeft]) rect(r, skin, 0, 10, 4, 2);
      break;
    }
    case 'bounty hunter': {
      const acc = rng.pick(o.accent), plate = shade(top, 1.25);
      rect(R.bodyFront, plate, 1, 1, 6, 5); rect(R.bodyFront, acc, 1, 1, 1, 5); rect(R.bodyFront, shade(top, 0.6), 3, 6, 2, 6);
      rect(R.bodyBack, plate, 1, 1, 6, 6);
      for (const r of [R.armFront, R.armBack, R.armRight, R.armLeft]) { rect(r, plate, 0, 0, 4, 3); rect(r, plate, 0, 6, 4, 3); }
      for (const r of [R.legFront, R.legBack, R.legRight, R.legLeft]) { rect(r, plate, 0, 2, 4, 3); rect(r, '#2a2a2a', 0, 9, 4, 3); }
      // half helmet: crown and back plates, the face stays open
      for (const r of [R.headTop, R.headBack]) rect(r, o.helmet);
      rect(R.headRight, o.helmet, 0, 0, 8, 3); rect(R.headLeft, o.helmet, 0, 0, 8, 3); rect(R.headFront, o.helmet, 0, 0, 8, 2); rect(R.headFront, acc, 0, 1, 8, 1);
      px(R.headFront, 6, 5, shade(skin, 0.6)); px(R.headFront, 6, 6, shade(skin, 0.6)); // scar
      break;
    }
    case 'journalist': {
      rect(R.bodyFront, o.shirt, 3, 0, 2, 12); rect(R.bodyFront, o.shirt, 2, 0, 4, 1);
      px(R.bodyFront, 1, 3, o.badge); px(R.bodyFront, 1, 4, o.badge); // press badge
      px(R.bodyFront, 6, 7, '#2a2a2a'); px(R.bodyFront, 6, 8, '#2a2a2a'); px(R.bodyFront, 6, 6, '#c83a2a'); // recorder
      for (const r of [R.bodyFront, R.bodyBack, R.bodyRight, R.bodyLeft]) rect(r, '#2a2a2a', 0, 11, r[2], 1);
      break;
    }
    default: break;
  }
  return { skin, hair, female, alien };
}

// The town's face (skins.js): eyes on row 4 as [white, iris] .. skin .. [iris, white], skin-shadow brows on row 3,
// nose shadow row 5, lip line row 6, facial hair painted last so it stays continuous over the mouth.
export function paintFace(ctx, ox, oy, rng, skin, hair, female, beard, mustache) {
  const F = R.headFront;
  const fx = ox + F[0], fy = oy + F[1];
  const irisPick = rng.pick(IRIS_COLORS);
  const browPick = rng.pick([0.76, 0.78, 0.8]);
  const dark = luminance(skin) < DARK_SKIN_LUMINANCE;
  const browTone = dark ? browPick - 0.12 : browPick;
  const iris = dark ? IRIS_DARK : irisPick;
  const put = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(fx + x, fy + y, w, h); };
  put(2, 4, 1, 1, EYE_WHITE); put(3, 4, 1, 1, iris); put(5, 4, 1, 1, iris); put(6, 4, 1, 1, EYE_WHITE);
  const brow = shade(skin, browTone);
  put(2, 3, 2, 1, brow); put(5, 3, 2, 1, brow);
  put(3, 5, 1, 1, shade(skin, 0.93)); put(4, 5, 1, 1, shade(skin, 0.84));
  put(3, 6, 2, 1, female ? mix(skin, LIP_TINT, 0.55) : shade(skin, 0.76));
  if (mustache) put(2, 6, 4, 1, hair);
  if (beard) { put(1, 6, 6, 2, hair); ctx.fillStyle = hair; ctx.fillRect(ox + R.headRight[0] + 6, oy + R.headRight[1] + 6, 2, 2); ctx.fillRect(ox + R.headLeft[0], oy + R.headLeft[1] + 6, 2, 2); }
}

// Droid skins in the same layout. Protocol droids use the humanoid mesh; astromechs map head = dome, body = barrel,
// legs = the two outrigger legs; sweepers map head = sensor turret, body = chassis, right arm = brush bar.
function paintDroid(rect, px, glow, noise, rng, kind) {
  if (kind === 'protocol') {
    const gold = rng.pick(['#c9a227', '#b8922a', '#d4b04a', '#a8a8b0']), dark = shade(gold, 0.55), joint = '#3a3230';
    for (const r of Object.values(R)) rect(r, gold);
    for (const r of [R.headFront, R.headRight, R.headLeft, R.headBack, R.bodyFront, R.bodyBack, R.armFront, R.legFront]) noise(r, gold, 0.12);
    // face plate: no eyes; a dark visor band with two round photoreceptors (emissive), a slot mouth grille
    rect(R.headFront, dark, 1, 3, 6, 1);
    rect(R.headFront, joint, 2, 4, 1, 1); rect(R.headFront, joint, 5, 4, 1, 1);
    glow(R.headFront, 2, 4, '#fff0a0'); glow(R.headFront, 5, 4, '#fff0a0');
    rect(R.headFront, joint, 3, 6, 2, 1);
    rect(R.headRight, joint, 3, 3, 1, 2); rect(R.headLeft, joint, 4, 3, 1, 2); // audio sensors
    // midriff wiring, chest plate seams
    rect(R.bodyFront, joint, 0, 6, 8, 3); rect(R.bodyFront, '#c83a2a', 2, 7, 1, 1); rect(R.bodyFront, '#3a8ac0', 5, 7, 1, 1); rect(R.bodyFront, gold, 3, 6, 2, 3);
    rect(R.bodyFront, dark, 3, 0, 2, 6); rect(R.bodyBack, dark, 3, 0, 2, 12); rect(R.bodyBack, joint, 0, 6, 8, 2);
    for (const r of [R.armFront, R.armBack, R.armRight, R.armLeft]) { rect(r, joint, 0, 5, 4, 1); rect(r, dark, 0, 9, 4, 3); }
    rect(R.armBottom, dark);
    for (const r of [R.legFront, R.legBack, R.legRight, R.legLeft]) { rect(r, joint, 0, 5, 4, 1); rect(r, dark, 0, 11, 4, 1); }
    rect(R.legBottom, dark);
    return;
  }
  if (kind === 'astromech') {
    const white = '#e8e8e8', blue = rng.pick(['#2a5ac8', '#c83a2a', '#3a9a4a', '#e0a020', '#7a3aa8']), grey = '#8a8a8a', dark = '#3a3a3a';
    for (const r of Object.values(R)) rect(r, white);
    // dome (head regions): silver dome with coloured panels, a black photoreceptor (emissive red core) and blue lights
    for (const r of [R.headTop]) { rect(r, '#c0c0c8'); rect(r, blue, 2, 2, 4, 4); }
    for (const r of [R.headFront, R.headRight, R.headLeft, R.headBack]) { rect(r, '#c8c8d0', 0, 0, 8, 3); rect(r, blue, 1, 3, 2, 1); rect(r, blue, 5, 3, 2, 1); rect(r, white, 0, 4, 8, 4); rect(r, blue, 0, 6, 8, 1); }
    rect(R.headFront, dark, 3, 2, 2, 3); glow(R.headFront, 4, 3, '#ff4040'); glow(R.headFront, 3, 3, '#ff6060');
    glow(R.headFront, 1, 1, '#60a0ff'); glow(R.headFront, 6, 1, '#60a0ff');
    // body: white barrel with blue panels, vents and a data port
    for (const r of [R.bodyFront, R.bodyBack, R.bodyRight, R.bodyLeft]) { rect(r, blue, 0, 1, r[2], 1); rect(r, blue, 0, 7, r[2], 2); rect(r, grey, 0, 11, r[2], 1); }
    rect(R.bodyFront, dark, 1, 3, 2, 3); rect(R.bodyFront, dark, 5, 3, 2, 3); rect(R.bodyFront, blue, 3, 9, 2, 2);
    rect(R.bodyBack, dark, 3, 3, 2, 4);
    // legs: white outriggers with blue shoulder pads and dark feet
    for (const r of [R.legFront, R.legBack, R.legRight, R.legLeft]) { rect(r, blue, 0, 0, 4, 2); rect(r, grey, 0, 6, 4, 1); rect(r, dark, 0, 10, 4, 2); }
    rect(R.legBottom, dark);
    for (const r of [R.armFront, R.armBack, R.armRight, R.armLeft, R.armTop, R.armBottom]) rect(r, white); // unused
    return;
  }
  // sweeper: orange-and-grey municipal chassis with hazard stripes, one emissive sensor eye, dark brush bar
  const body = rng.pick(['#d8782a', '#c8b02a', '#5a6a7a']), dark = '#3a3a3a', stripe = '#1a1a1a';
  for (const r of Object.values(R)) rect(r, body);
  for (const r of [R.bodyFront, R.bodyBack, R.bodyRight, R.bodyLeft]) { for (let x = 0; x < r[2]; x += 2) rect(r, stripe, x, 9, 1, 3); rect(r, dark, 0, 0, r[2], 1); }
  rect(R.bodyTop, dark); rect(R.bodyBottom, dark);
  rect(R.bodyFront, dark, 2, 3, 4, 3); glow(R.bodyFront, 3, 4, '#40ff60'); glow(R.bodyFront, 4, 4, '#ff8040'); // status lights
  for (const r of [R.headFront, R.headRight, R.headLeft, R.headBack]) { rect(r, dark, 0, 5, 8, 3); rect(r, shade(body, 0.8), 0, 0, 8, 1); }
  rect(R.headTop, shade(body, 0.8)); rect(R.headBottom, dark);
  rect(R.headFront, '#1a1a1a', 2, 2, 4, 2); glow(R.headFront, 3, 3, '#ff3030'); glow(R.headFront, 4, 3, '#ff3030');
  for (const r of [R.armFront, R.armBack, R.armRight, R.armLeft]) { rect(r, dark); for (let y = 6; y < 12; y += 2) rect(r, '#6a5a4a', 0, y, 4, 1); } // brush bristles
  rect(R.armTop, dark); rect(R.armBottom, '#6a5a4a');
  for (const r of [R.legFront, R.legBack, R.legRight, R.legLeft, R.legTop, R.legBottom]) rect(r, dark); // wheel housings
}
