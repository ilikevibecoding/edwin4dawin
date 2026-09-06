// Combinatorial face generator for the 16x16 head faces of the 2x skin layout.
//
// FACE RULES (the critic-approved rules of src/npc/skins.js, carried to 16x16): two eyes, each a run of
// white + iris + pupil + iris + white on its own columns (2..6 and 9..13), a two-texel skin bridge between them
// (columns 7-8 never hold eye colours), a brow of >= 2 texels directly above each eye with a skin row (row 4)
// between brow and eye so they never fuse into one dark block, irises always lighter than the pupil and never the
// brow colour. Every shape/brow/marking below keeps those rows free; the tests in scripts/test-appearance.mjs
// check the painted pixels, not this comment.
import { RNG } from '../../rng.js';
import { REG, FACE_PX } from './layout.js';
import { rgb, shade, mix, luminance } from './raster.js';

export const EYE_WHITE = '#f2f2f4';
export const PUPIL = '#141218';
const LIP = '#a8484a';

export const SKIN_TONES = [
  { id: 'porcelain', c: '#f1dcc9' }, { id: 'fair', c: '#ebc9a7' }, { id: 'peach', c: '#e3b58c' }, { id: 'sand', c: '#d8a878' },
  { id: 'olive', c: '#c99b6a' }, { id: 'tan', c: '#bf8a5b' }, { id: 'caramel', c: '#a8734a' }, { id: 'bronze', c: '#94613b' },
  { id: 'chestnut', c: '#7d4e30' }, { id: 'umber', c: '#683f27' }, { id: 'espresso', c: '#51301f' }, { id: 'ebony', c: '#3b2418' },
];
export const EYE_COLOURS = [
  { id: 'brown', c: '#6a4426' }, { id: 'dark_brown', c: '#4a2c18' }, { id: 'hazel', c: '#8a6a30' }, { id: 'green', c: '#3f7f3f' },
  { id: 'blue', c: '#3f6fb4' }, { id: 'grey', c: '#7e8c98' }, { id: 'amber', c: '#b8802c' }, { id: 'violet', c: '#6f4d9e' },
];
export const EYE_SHAPES = ['almond', 'round', 'narrow', 'hooded', 'upturned'];
export const BROWS = ['thin', 'thick', 'arched', 'angled', 'sparse'];
export const NOSES = ['small', 'wide', 'long', 'button'];
export const MOUTHS = ['neutral', 'smile', 'frown', 'full', 'thin'];
export const FACIAL_HAIR = ['none', 'stubble', 'mustache', 'goatee', 'beard', 'chinstrap', 'sideburns', 'soul_patch'];
export const HAIR_STYLES = ['none', 'buzz', 'short', 'side_part', 'slicked', 'medium', 'long', 'curly', 'afro', 'braids', 'bun', 'ponytail', 'mohawk', 'undercut', 'topknot'];
export const HAIR_COLOURS = [
  { id: 'black', c: '#17161a' }, { id: 'dark_brown', c: '#2f1f13' }, { id: 'brown', c: '#4b3121' }, { id: 'chestnut', c: '#6d4327' }, { id: 'auburn', c: '#7f3b1e' },
  { id: 'red', c: '#a5532b' }, { id: 'blond', c: '#c39644' }, { id: 'platinum', c: '#e6dcc0' }, { id: 'grey', c: '#8d8d8d' }, { id: 'white', c: '#e9e9e9' },
];
export const AGES = ['young', 'adult', 'middle', 'elder']; // wrinkle / greying levels; 'child' is a fifth age with a body scale
export const MARKINGS = ['none', 'freckles', 'scar', 'tattoo', 'face_paint', 'mole'];
export const GENDERS = ['feminine', 'masculine', 'androgynous'];
export const FACE_PAINT = ['#f0f0f0', '#c23434', '#e6c040', '#3468c8'];

export const FACE_COMBINATIONS = SKIN_TONES.length * EYE_COLOURS.length * EYE_SHAPES.length * BROWS.length * NOSES.length * MOUTHS.length *
  FACIAL_HAIR.length * HAIR_STYLES.length * HAIR_COLOURS.length * AGES.length * MARKINGS.length;

// Eye geometry (face-local texels): eye A on columns 2..6, eye B on 9..13, bridge 7..8, masks over rows 5..8
export const EYE_A_X = 2, EYE_B_X = 9, EYE_W = 5, EYE_ROW0 = 5, BRIDGE = [7, 8];
// mask legend: W white, I iris, P pupil, l lash (dark), d lid shadow (skin shade), . untouched; rows 5,6,7,8; eye A (outer edge left)
const EYE_MASKS = {
  almond: ['.....', 'WIPIW', '.ddd.', '.....'],
  round: ['.lll.', 'WIPIW', 'WIPIW', '.....'],
  narrow: ['.....', 'lllll', 'WIPIW', '.....'],
  hooded: ['.....', 'dIPId', 'WIPIW', '.....'],
  upturned: ['l....', 'WIPIW', '..ddd', '.....'],
};
// brows over rows 2..3 (row 4 stays skin); eye A orientation, mirrored for eye B
const BROW_MASKS = {
  thin: ['.....', 'BBBBB'],
  thick: ['BBBBB', 'BBBBB'],
  arched: ['.BBB.', 'B...B'],
  angled: ['B....', '.BBBB'],
  sparse: ['.....', 'BB.BB'],
};
const mirror = (row) => row.split('').reverse().join('');

export function subSeed(seed, tag) {
  let h = (seed | 0) ^ 0x5bd1e995;
  for (let i = 0; i < tag.length; i++) { h = Math.imul(h ^ tag.charCodeAt(i), 0x01000193); h ^= h >>> 15; }
  return (h >>> 0) || 1;
}
const weighted = (rng, items, weights) => {
  let total = 0; for (const w of weights) total += w;
  let v = rng.next() * total;
  for (let i = 0; i < items.length; i++) { v -= weights[i]; if (v < 0) return items[i]; }
  return items[items.length - 1];
};

// Picks the face traits. sp = species record (see species.js): sp.tones (palette), sp.hair, sp.facialHair, sp.eyeKind
export function pickFace(rng, { gender = 'masculine', age = 'adult', sp = null, clone = false } = {}) {
  const hairOK = !sp || sp.hair !== false;
  const beardOK = hairOK && (!sp || sp.facialHair !== false) && gender !== 'feminine' && age !== 'child';
  const tones = sp && sp.tones ? sp.tones : SKIN_TONES;
  const toneIdx = rng.int(0, tones.length - 1);
  const tone = tones[toneIdx];
  const dark = luminance(tone.c) < 0.42;
  let eyeColour = dark ? weighted(rng, EYE_COLOURS, [5, 5, 3, 1, 1, 1, 2, 0.5]) : weighted(rng, EYE_COLOURS, [3, 2, 2, 2, 3, 2, 1, 0.7]);
  let eyeShape = rng.pick(EYE_SHAPES);
  let brow = gender === 'feminine' ? weighted(rng, BROWS, [3, 0.7, 3, 1.5, 1]) : gender === 'masculine' ? weighted(rng, BROWS, [1.5, 3, 1, 2, 1]) : rng.pick(BROWS);
  let nose = rng.pick(NOSES);
  let mouth = rng.pick(MOUTHS);
  let facialHair = beardOK ? (gender === 'masculine' ? weighted(rng, FACIAL_HAIR, [4.5, 1.5, 1, 1, 1.2, 0.6, 0.6, 0.6]) : weighted(rng, FACIAL_HAIR, [8, 1, 0.3, 0.3, 0.2, 0.2, 0.3, 0.3])) : 'none';
  const styleW = gender === 'feminine' ? [0.4, 0.3, 1.5, 1.5, 0.6, 3, 3, 2, 1.2, 2, 2.5, 2.5, 0.4, 0.6, 0.3]
    : gender === 'masculine' ? [1.5, 2.5, 4, 2.5, 2, 1.5, 0.5, 1.5, 0.8, 0.6, 0.4, 0.5, 0.8, 1.5, 0.6]
      : [1, 1.5, 2, 2, 1.5, 2, 1.5, 1.5, 1, 1.2, 1, 1.2, 1, 1.5, 0.8];
  let hairStyle = hairOK ? weighted(rng, HAIR_STYLES, styleW) : 'none';
  let hairColour = weighted(rng, HAIR_COLOURS, dark ? [8, 5, 2, 0.6, 0.3, 0.2, 0.3, 0.2, 0.6, 0.4] : [4, 4, 3.5, 2, 1.2, 1, 2.5, 0.6, 0.6, 0.4]);
  if (age === 'elder') hairColour = weighted(rng, HAIR_COLOURS, [0, 0, 0, 0, 0, 0, 0, 1, 3, 3]);
  let marking = weighted(rng, MARKINGS, [7, 1.2, 0.8, 0.8, 0.6, 1]);
  if (age === 'child') { nose = rng.chance(0.7) ? 'small' : 'button'; facialHair = 'none'; if (rng.chance(0.4)) eyeShape = 'round'; }
  // species restrictions (Chagrian eye colours, Pantoran hair colours, Weequay topknots)
  if (sp && sp.eyeColours) { const pool = EYE_COLOURS.filter((e) => sp.eyeColours.includes(e.id)); if (pool.length) eyeColour = rng.pick(pool); }
  if (sp && sp.hairColours && age !== 'elder') { const pool = HAIR_COLOURS.filter((h) => sp.hairColours.includes(h.id)); if (pool.length) hairColour = rng.pick(pool); }
  if (sp && sp.hairStyles && hairOK) hairStyle = rng.pick(sp.hairStyles);
  if (clone) {
    // Jango Fett template: same face for every clone; hair, facial hair and markings are the individual touches
    const t = tones.find((x) => x.id === 'caramel') || tones[Math.min(6, tones.length - 1)];
    eyeColour = EYE_COLOURS[1]; eyeShape = 'almond'; brow = 'thick'; nose = 'wide'; mouth = 'neutral';
    hairColour = HAIR_COLOURS[0]; hairStyle = rng.pick(['buzz', 'short', 'undercut', 'mohawk', 'none']);
    facialHair = weighted(rng, FACIAL_HAIR, [4, 2, 1, 2, 0.5, 0.5, 0.5, 0.5]);
    marking = weighted(rng, MARKINGS, [5, 0, 2, 2, 0, 0]);
    return { tone: t, eyeColour, eyeShape, brow, nose, mouth, facialHair, hairStyle, hairColour, age, marking, gender, clone: true };
  }
  return { tone, eyeColour, eyeShape, brow, nose, mouth, facialHair, hairStyle, hairColour, age, marking, gender, clone: false };
}

export function faceId(face) {
  return [face.tone.id, face.eyeColour.id, face.eyeShape, face.brow, face.nose, face.mouth, face.facialHair, face.hairStyle, face.hairColour.id, face.age, face.marking, face.gender[0]].join('/');
}

// hair colour after greying by age
export function effectiveHairColour(face) {
  const c = face.hairColour.c;
  if (face.age === 'middle') return mix(c, '#b9b9b9', 0.3);
  if (face.age === 'elder') return mix(c, '#e2e2e2', luminance(c) > 0.5 ? 0.3 : 0.75);
  return rgb(c);
}

// Paints the whole head (all six faces) for a face record. sp = species record (may override eyes/nose/mouth and
// add marks). Returns the eye info blink.js needs and the rects the tests check.
export function paintHead(r, face, sp, rng) {
  const F = REG.headFront, T = REG.headTop, Bk = REG.headBack, Rt = REG.headRight, Lf = REG.headLeft, Bt = REG.headBottom;
  const skin = rgb(face.tone.c);
  const gender = face.gender;
  const P = (x, y, c) => r.px(F[0] + x, F[1] + y, c);
  const fill = (reg, c) => r.rect(reg[0], reg[1], reg[2], reg[3], c);
  const hair = effectiveHairColour(face);
  const hairy = sp ? sp.hair !== false : true;
  const eyeKind = sp && sp.eyeKind ? sp.eyeKind : 'human';

  for (const reg of [T, Bk, Rt, Lf, F, Bt]) fill(reg, skin);
  for (const reg of [T, Bk, Rt, Lf, F]) r.noise(reg[0], reg[1], reg[2], reg[3], 0.05, rng, 0.35);
  if (sp && sp.paintSkin) sp.paintSkin(r, { skin, rng, face, regions: { F, T, Bk, Rt, Lf, Bt } });

  // jaw / cheek shading by gender
  if (gender === 'masculine') { for (let y = 12; y < 16; y++) { P(0, y, shade(skin, 0.9)); P(15, y, shade(skin, 0.9)); } r.mulRect(F[0] + 1, F[1] + 15, 14, 1, 0.92); }
  else if (gender === 'feminine') { for (const [x, y] of [[1, 9], [2, 9], [13, 9], [14, 9], [1, 10], [14, 10]]) P(x, y, mix(skin, LIP, 0.16)); r.mulRect(F[0], F[1] + 14, 1, 2, 0.94); r.mulRect(F[0] + 15, F[1] + 14, 1, 2, 0.94); }
  if (face.age === 'child') for (const [x, y] of [[2, 9], [3, 9], [12, 9], [13, 9]]) P(x, y, mix(skin, LIP, 0.2));

  // age lines (painted before hair so hair can cover the forehead)
  if (face.age === 'middle' || face.age === 'elder') {
    const f = face.age === 'elder' ? 0.84 : 0.9;
    P(1, 6, shade(skin, f)); P(14, 6, shade(skin, f)); P(1, 7, shade(skin, f)); P(14, 7, shade(skin, f));
    if (face.age === 'elder') {
      for (let x = 4; x <= 11; x++) P(x, 1, shade(skin, 0.92));
      for (const [x, y] of [[5, 10], [5, 11], [10, 10], [10, 11], [4, 12], [11, 12]]) P(x, y, shade(skin, 0.86));
      for (let x = 2; x <= 6; x++) { if (r.get(F[0] + x, F[1] + 8)[3]) P(x, 8, shade(skin, 0.91)); P(x + 7, 8, shade(skin, 0.91)); }
      r.mulRect(F[0], F[1], 16, 16, 0.985);
    }
  }

  // brows
  const browColour = hairy ? mix(hair, skin, 0.22) : shade(skin, 0.68);
  const browRects = [];
  const bm = BROW_MASKS[face.brow];
  for (const [x0, flip] of [[EYE_A_X, false], [EYE_B_X, true]]) {
    let minX = 99, maxX = -1, minY = 99, maxY = -1;
    for (let j = 0; j < 2; j++) {
      const row = flip ? mirror(bm[j]) : bm[j];
      for (let i = 0; i < 5; i++) if (row[i] === 'B') { P(x0 + i, 2 + j, browColour); minX = Math.min(minX, x0 + i); maxX = Math.max(maxX, x0 + i); minY = Math.min(minY, 2 + j); maxY = Math.max(maxY, 2 + j); }
    }
    browRects.push([F[0] + minX, F[1] + minY, maxX - minX + 1, maxY - minY + 1]);
  }

  // eyes
  const eyePixels = [];
  const eyeRects = [];
  let iris = rgb(face.eyeColour.c);
  const lash = mix(skin, '#1e1614', 0.72), lid = shade(skin, 0.83);
  if (eyeKind === 'human') {
    const mask = EYE_MASKS[face.eyeShape].slice();
    if (gender === 'feminine' && mask[0] === '.....' && face.eyeShape !== 'narrow') mask[0] = '.lll.';
    for (const [x0, flip] of [[EYE_A_X, false], [EYE_B_X, true]]) {
      let minX = 99, maxX = -1, minY = 99, maxY = -1;
      for (let j = 0; j < 4; j++) {
        const row = flip ? mirror(mask[j]) : mask[j];
        for (let i = 0; i < 5; i++) {
          const ch = row[i], x = x0 + i, y = EYE_ROW0 + j;
          if (ch === '.') continue;
          if (ch === 'l') { P(x, y, lash); continue; }
          if (ch === 'd') { P(x, y, lid); continue; }
          const c = ch === 'W' ? EYE_WHITE : ch === 'I' ? iris : PUPIL;
          P(x, y, c); eyePixels.push({ x: F[0] + x, y: F[1] + y, color: c });
          minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
      }
      eyeRects.push([F[0] + minX, F[1] + minY, maxX - minX + 1, maxY - minY + 1]);
    }
  } else if (eyeKind === 'large_dark') {
    // alien eyes: two big dark ovals (Rodian / Nautolan / Sullustan / Aqualish) or red (Duros); still separated by the bridge
    const ec = sp.eyeColour || '#0e0c14', hi = sp.eyeHighlight || '#5a5a72', rim = sp.eyeRim || shade(ec, 0.6);
    iris = rgb(ec);
    for (const [x0, flip] of [[1, false], [10, true]]) {
      const w = 5, h = 4, y0 = 5;
      r.rect(F[0] + x0, F[1] + y0, w, h, ec);
      P(flip ? x0 + w - 1 : x0, y0, rim); P(flip ? x0 : x0 + w - 1, y0 + h - 1, rim); P(flip ? x0 + w - 1 : x0, y0 + h - 1, rim); P(flip ? x0 : x0 + w - 1, y0, rim);
      P(flip ? x0 + w - 2 : x0 + 1, y0 + 1, hi);
      if (sp.eyePupil) { r.rect(F[0] + x0 + 2, F[1] + y0 + 1, 1, 2, sp.eyePupil); }
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) eyePixels.push({ x: F[0] + x0 + i, y: F[1] + y0 + j, color: r.get(F[0] + x0 + i, F[1] + y0 + j) });
      eyeRects.push([F[0] + x0, F[1] + y0, w, h]);
    }
  } else if (eyeKind === 'small_dark') {
    // Weequay / Pyke style: small dark eyes with a glint, no visible white
    const ec = sp.eyeColour || '#1a1410';
    iris = rgb(ec);
    for (const x0 of [3, 10]) {
      r.rect(F[0] + x0, F[1] + 6, 3, 2, ec); P(x0 + 1, 6, mix(ec, '#ffffff', 0.35));
      for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) eyePixels.push({ x: F[0] + x0 + i, y: F[1] + 6 + j, color: r.get(F[0] + x0 + i, F[1] + 6 + j) });
      eyeRects.push([F[0] + x0, F[1] + 6, 3, 2]);
    }
  }
  // eyeKind 'geometry' (Gran, Ithorian, Mon Calamari): eyes live on geometry parts; the face stays blank here

  // nose
  const noseKind = sp && sp.nose !== undefined ? sp.nose : face.nose;
  if (noseKind === 'small') { P(7, 9, shade(skin, 0.93)); P(8, 9, shade(skin, 0.85)); }
  else if (noseKind === 'wide') { P(7, 9, shade(skin, 0.93)); P(8, 9, shade(skin, 0.88)); for (let x = 6; x <= 9; x++) P(x, 10, shade(skin, x === 6 || x === 9 ? 0.78 : 0.88)); }
  else if (noseKind === 'long') { for (let y = 7; y <= 9; y++) P(8, y, shade(skin, 0.92)); P(7, 10, shade(skin, 0.9)); P(8, 10, shade(skin, 0.82)); }
  else if (noseKind === 'button') { P(7, 9, shade(skin, 1.08)); P(8, 9, shade(skin, 0.9)); P(7, 10, shade(skin, 0.88)); P(8, 10, shade(skin, 0.8)); }
  else if (noseKind === 'slits') { P(7, 10, shade(skin, 0.7)); P(8, 10, shade(skin, 0.7)); }
  // 'none': snout / hammerhead species carry the nose on geometry

  // mouth (feminine: rose lips; masculine: lip line)
  const mouthKind = sp && sp.mouth !== undefined ? sp.mouth : face.mouth;
  const lipDark = shade(skin, 0.74);
  const lipRose = mix(skin, LIP, gender === 'feminine' ? 0.5 : gender === 'androgynous' ? 0.28 : 0.1);
  const lipCol = gender === 'masculine' ? lipDark : mix(lipRose, lipDark, 0.2);
  if (mouthKind === 'neutral') for (let x = 6; x <= 9; x++) P(x, 12, lipCol);
  else if (mouthKind === 'smile') { for (let x = 6; x <= 9; x++) P(x, 12, lipCol); P(5, 11, lipCol); P(10, 11, lipCol); }
  else if (mouthKind === 'frown') { for (let x = 6; x <= 9; x++) P(x, 11, lipCol); P(5, 12, lipCol); P(10, 12, lipCol); }
  else if (mouthKind === 'full') { for (let x = 6; x <= 9; x++) { P(x, 11, mix(lipRose, lipDark, 0.35)); P(x, 12, mix(lipRose, skin, 0.15)); } P(5, 12, lipDark); P(10, 12, lipDark); }
  else if (mouthKind === 'thin') for (let x = 7; x <= 8; x++) P(x, 12, lipCol);
  else if (mouthKind === 'slit') for (let x = 5; x <= 10; x++) P(x, 12, shade(skin, 0.62));
  else if (mouthKind === 'wide') { for (let x = 4; x <= 11; x++) P(x, 12, shade(skin, 0.7)); P(3, 11, shade(skin, 0.7)); P(12, 11, shade(skin, 0.7)); }

  // markings (keep clear of brow rows 2-3 and eye rows 5-8 on the eye columns)
  if (face.marking === 'freckles') {
    const fc = mix(skin, '#7a4a2a', 0.45);
    for (let k = 0; k < 11; k++) { const side = rng.chance(0.5); const x = side ? rng.int(1, 5) : rng.int(10, 14); P(x, rng.int(8, 10), fc); }
    P(7, 8, fc); P(rng.int(6, 9), 10, fc);
  } else if (face.marking === 'scar') {
    const sc = mix(skin, '#d69a8a', 0.6);
    if (rng.chance(0.5)) { P(12, 8, sc); P(13, 9, sc); P(13, 10, sc); P(14, 11, sc); } else { for (let y = 1; y <= 4; y++) P(11, y, sc); P(11, 8, sc); }
  } else if (face.marking === 'tattoo') {
    const ink = sp && sp.ink ? sp.ink : '#1f2a3d';
    for (let y = 13; y <= 15; y++) { P(7, y, ink); P(8, y, ink); }
    P(1, 9, ink); P(2, 9, ink); P(13, 9, ink); P(14, 9, ink); P(1, 10, ink); P(14, 10, ink);
  } else if (face.marking === 'face_paint') {
    const pc = rng.pick(FACE_PAINT);
    for (let x = 0; x <= 4; x++) { P(x, 9, mix(skin, pc, 0.75)); P(x, 10, mix(skin, pc, 0.55)); }
    for (let x = 11; x <= 15; x++) { P(x, 9, mix(skin, pc, 0.75)); P(x, 10, mix(skin, pc, 0.55)); }
    P(7, 0, mix(skin, pc, 0.8)); P(8, 0, mix(skin, pc, 0.8)); P(7, 1, mix(skin, pc, 0.8)); P(8, 1, mix(skin, pc, 0.8));
  } else if (face.marking === 'mole') { P(rng.chance(0.5) ? 11 : 4, rng.int(9, 11), shade(skin, 0.55)); }
  if (sp && sp.paintFace) sp.paintFace(r, { skin, rng, face, regions: { F, T, Bk, Rt, Lf, Bt }, P });

  // facial hair (mouth line re-drawn afterwards for the full beard so the mouth stays readable)
  if (face.facialHair !== 'none' && hairy) {
    const hc = hair;
    const fh = face.facialHair;
    if (fh === 'stubble') { for (let y = 11; y <= 15; y++) for (let x = 2; x <= 13; x++) if (rng.chance(0.4) && !(y <= 12 && x >= 5 && x <= 10)) P(x, y, mix(skin, hc, 0.35)); }
    if (fh === 'mustache') { for (let x = 5; x <= 10; x++) P(x, 11, hc); P(4, 12, hc); P(11, 12, hc); }
    if (fh === 'goatee') { for (let y = 13; y <= 15; y++) for (let x = 6; x <= 9; x++) P(x, y, hc); P(5, 13, hc); P(10, 13, hc); for (let x = 5; x <= 10; x++) P(x, 11, hc); }
    if (fh === 'beard') {
      for (let y = 13; y <= 15; y++) for (let x = 1; x <= 14; x++) P(x, y, hc);
      for (let y = 10; y <= 12; y++) { for (let x = 0; x <= 3; x++) P(x, y, hc); for (let x = 12; x <= 15; x++) P(x, y, hc); }
      P(4, 12, hc); P(11, 12, hc); for (let x = 5; x <= 10; x++) P(x, 11, hc);
      r.rect(Rt[0] + 12, Rt[1] + 10, 4, 6, hc); r.rect(Lf[0], Lf[1] + 10, 4, 6, hc);
      r.noise(F[0] + 1, F[1] + 13, 14, 3, 0.12, rng, 0.6);
      for (let x = 6; x <= 9; x++) P(x, 12, shade(hc, 0.6)); // mouth stays visible through the beard
    }
    if (fh === 'chinstrap') { for (let x = 1; x <= 14; x++) P(x, 15, hc); for (let y = 9; y <= 15; y++) { P(0, y, hc); P(15, y, hc); } P(1, 14, hc); P(14, 14, hc); r.rect(Rt[0] + 14, Rt[1] + 9, 2, 7, hc); r.rect(Lf[0], Lf[1] + 9, 2, 7, hc); }
    if (fh === 'sideburns') { for (let y = 5; y <= 11; y++) { P(0, y, hc); P(15, y, hc); if (y > 7) { P(1, y, hc); P(14, y, hc); } } r.rect(Rt[0] + 13, Rt[1] + 4, 3, 8, hc); r.rect(Lf[0], Lf[1] + 4, 3, 8, hc); }
    if (fh === 'soul_patch') { P(7, 13, hc); P(8, 13, hc); P(7, 14, hc); P(8, 14, hc); }
  }

  // hair on the head faces (volume parts - buns, tails, afros - are geometry, see species/compose)
  if (hairy && face.hairStyle !== 'none') {
    paintHair(r, face, hair, skin, rng);
    // a fringe may cover brow row 2; the lower brow row always stays visible so every face keeps brows over its eyes
    for (const [x0, flip] of [[EYE_A_X, false], [EYE_B_X, true]]) { const row = flip ? mirror(bm[1]) : bm[1]; for (let i = 0; i < 5; i++) if (row[i] === 'B') P(x0 + i, 3, browColour); }
  }

  const lidColour = shade(skin, 0.85);
  let strip = null;
  if (eyePixels.length) {
    let x0 = 999, y0 = 999, x1 = -1, y1 = -1;
    for (const p of eyePixels) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    strip = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  return { eyeRects, browRects, eyePixels, iris, lid: lidColour, strip, eyeKind, faceRect: [F[0], F[1], 16, 16], browColour, skin, hair: hairy ? hair : null };
}

function paintHair(r, face, hair, skin, rng) {
  const F = REG.headFront, T = REG.headTop, Bk = REG.headBack, Rt = REG.headRight, Lf = REG.headLeft;
  const fill = (reg, c, x = 0, y = 0, w = reg[2], h = reg[3]) => r.rect(reg[0] + x, reg[1] + y, w, h, c);
  const style = face.hairStyle;
  const dark = shade(hair, 0.8), light = shade(hair, 1.18);
  const top = () => { fill(T, hair); r.noise(T[0], T[1], 16, 16, 0.08, rng, 0.5); };
  const sides = (rows) => { fill(Rt, hair, 0, 0, 16, rows); fill(Lf, hair, 0, 0, 16, rows); };
  const back = (rows) => fill(Bk, hair, 0, 0, 16, rows);
  const front = (rows) => fill(F, hair, 0, 0, 16, rows);
  const shaved = mix(skin, hair, 0.35);
  switch (style) {
    case 'buzz': fill(T, shaved); fill(Bk, shaved, 0, 0, 16, 9); fill(Rt, shaved, 0, 0, 16, 6); fill(Lf, shaved, 0, 0, 16, 6); fill(F, shaved, 0, 0, 16, 1); r.noise(T[0], T[1], 16, 16, 0.06, rng, 0.5); break;
    case 'short': top(); sides(6); back(10); front(2); r.px(F[0], F[1] + 1, skin); r.px(F[0] + 15, F[1] + 1, skin); for (let x = 1; x < 15; x += 3) r.px(F[0] + x, F[1] + 1, dark); break;
    case 'side_part': top(); sides(6); back(10); front(2); fill(F, hair, 6, 2, 10, 1); fill(F, skin, 0, 2, 6, 1); for (let y = 0; y < 3; y++) r.px(F[0] + 5, F[1] + y, light); fill(T, light, 5, 0, 1, 16); break;
    case 'slicked': top(); for (let x = 1; x < 16; x += 4) fill(T, light, x, 0, 1, 16); sides(6); back(10); front(1); for (let x = 2; x < 16; x += 4) r.px(F[0] + x, F[1], light); break;
    case 'medium': top(); sides(10); back(14); front(3); fill(F, hair, 0, 3, 1, 5); fill(F, hair, 15, 3, 1, 5); r.px(F[0] + 7, F[1] + 2, skin); r.px(F[0] + 8, F[1] + 2, skin); break;
    case 'long': top(); sides(16); back(16); front(3); fill(F, hair, 0, 3, 2, 9); fill(F, hair, 14, 3, 2, 9); fill(F, skin, 6, 2, 4, 1); for (let x = 2; x < 14; x += 4) fill(Bk, dark, x, 4, 1, 12); break;
    case 'curly': top(); sides(9); back(13); front(3); for (let x = 0; x < 16; x += 2) r.px(F[0] + x, F[1] + 3, hair); for (const reg of [T, Bk, Rt, Lf]) r.noise(reg[0], reg[1], 16, reg === T ? 16 : 9, 0.22, rng, 0.8); r.noise(F[0], F[1], 16, 3, 0.22, rng, 0.8); break;
    case 'afro': top(); sides(11); back(16); front(3); for (let x = 1; x < 16; x += 2) r.px(F[0] + x, F[1] + 3, hair); for (const reg of [T, Bk, Rt, Lf, F]) r.noise(reg[0], reg[1], 16, reg === F ? 4 : 16, 0.2, rng, 0.9); break;
    case 'braids': top(); sides(16); back(16); front(2); for (let x = 0; x < 16; x += 2) { fill(Rt, dark, x, 0, 1, 16); fill(Lf, dark, x + 1, 0, 1, 16); fill(Bk, dark, x, 0, 1, 16); fill(T, dark, x, 0, 1, 16); } for (let y = 0; y < 16; y += 3) { fill(Rt, light, 0, y, 16, 1); fill(Lf, light, 0, y, 16, 1); fill(Bk, light, 0, y, 16, 1); } break;
    case 'bun': top(); sides(6); back(9); front(2); fill(F, skin, 7, 1, 2, 1); for (let x = 3; x < 16; x += 5) fill(T, dark, x, 0, 1, 16); break;
    case 'ponytail': top(); sides(7); back(10); front(2); fill(F, hair, 0, 2, 1, 2); fill(F, hair, 15, 2, 1, 2); for (let x = 2; x < 16; x += 5) fill(T, dark, x, 0, 1, 16); break;
    case 'mohawk': fill(T, shaved); fill(Bk, shaved, 0, 0, 16, 8); fill(Rt, shaved, 0, 0, 16, 5); fill(Lf, shaved, 0, 0, 16, 5); fill(T, hair, 6, 0, 4, 16); fill(F, hair, 6, 0, 4, 1); fill(Bk, hair, 6, 0, 4, 6); break;
    case 'undercut': top(); front(2); fill(Rt, shaved, 0, 0, 16, 6); fill(Lf, shaved, 0, 0, 16, 6); fill(Bk, hair, 0, 0, 16, 4); fill(Bk, shaved, 0, 4, 16, 6); fill(F, hair, 0, 2, 9, 1); break;
    case 'topknot': fill(T, shaved); fill(Bk, shaved, 0, 0, 16, 8); fill(Rt, shaved, 0, 0, 16, 5); fill(Lf, shaved, 0, 0, 16, 5); fill(T, hair, 5, 5, 6, 6); break;
    default: break;
  }
  if (face.age === 'middle' && style !== 'none' && style !== 'buzz') { const grey = mix(hair, '#cfcfcf', 0.55); fill(Rt, grey, 13, 1, 3, 4); fill(Lf, grey, 0, 1, 3, 4); }
}

// Extra head geometry for hair volume: returned as plain box records (head-local px), coloured with the hair colour.
export function hairGeometry(face, hairColour) {
  const style = face.hairStyle, c = hairColour;
  switch (style) {
    case 'bun': return [{ kind: 'hair', part: 'bun', attach: 'head', colour: c, boxes: [{ x: 0, y: 7.2, z: -3.6, w: 3.2, h: 3, d: 3.2 }] }];
    case 'ponytail': return [{ kind: 'hair', part: 'ponytail', attach: 'head', colour: c, boxes: [{ x: 0, y: 5.5, z: -4.9, w: 2.4, h: 3, d: 2 }, { x: 0, y: -0.5, z: -5.2, w: 2, h: 9, d: 1.6 }] }];
    case 'mohawk': return [{ kind: 'hair', part: 'mohawk', attach: 'head', colour: c, boxes: [{ x: 0, y: 9.4, z: 0, w: 2, h: 2.8, d: 7.6 }] }];
    case 'afro': return [{ kind: 'hair', part: 'afro', attach: 'head', colour: c, boxes: [{ x: 0, y: 7.4, z: -0.6, w: 10.4, h: 3.6, d: 10.4 }, { x: 0, y: 3.5, z: -4.9, w: 10, h: 6, d: 1.4 }] }];
    case 'long': return [{ kind: 'hair', part: 'long', attach: 'head', colour: c, boxes: [{ x: 0, y: -1, z: -4.7, w: 8.4, h: 10, d: 1.2 }] }];
    case 'braids': return [{ kind: 'hair', part: 'braids', attach: 'head', colour: c, boxes: [{ x: -2.4, y: -1.5, z: -4.8, w: 1.6, h: 10, d: 1.4 }, { x: 2.4, y: -1.5, z: -4.8, w: 1.6, h: 10, d: 1.4 }] }];
    case 'topknot': return [{ kind: 'hair', part: 'topknot', attach: 'head', colour: c, boxes: [{ x: 0, y: 8.9, z: -0.5, w: 2.6, h: 1.8, d: 2.6 }, { x: 0, y: 5.5, z: -4.9, w: 1.2, h: 7, d: 1.2 }] }];
    default: return [];
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Canonical faces: the 100 faces the critic sheet and the distinctness test use. Picked greedily from seeds 1.. so
// that every pair differs in >= MIN_DIFF of the 256 face texels; deterministic (pure-JS raster), memoised.
export const CANONICAL_MIN_DIFF = 0.14;
let canonical = null;
export function canonicalFaces(paintHeadOnly, count = 100) {
  if (canonical && canonical.length >= count) { const s = canonical.slice(0, count); s.tried = canonical.tried; return s; }
  const out = [];
  const F = REG.headFront;
  const need = Math.ceil(CANONICAL_MIN_DIFF * F[2] * F[3]);
  let tried = 0;
  for (let seed = 1; out.length < count && seed < 5000; seed++) {
    tried++;
    const gender = GENDERS[seed % 3];
    const age = AGES[(seed * 7) % AGES.length];
    const cand = paintHeadOnly(seed, { gender, age, species: 'human' });
    let ok = true;
    for (const o of out) {
      const dif = o.raster.constructor.diffCount(o.raster, F[0], F[1], cand.raster, F[0], F[1], F[2], F[3]);
      if (dif < need) { ok = false; break; }
    }
    if (ok) out.push({ seed, gender, age, face: cand.face, raster: cand.raster, id: faceId(cand.face) });
  }
  canonical = out;
  canonical.tried = tried;
  return out;
}
