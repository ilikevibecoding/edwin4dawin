// Species catalogue: humans, seventeen Star Wars alien species and droids. Each record gives the skin palette,
// how the face is drawn (eye kind, nose, mouth, markings), which headgear fits, and the extra voxel geometry
// (boxes in head-local px; the composer allocates their textures in the free area of the skin canvas).
//
// Box records: { x, y, z, w, h, d, fill, paint?(r, uv, box, ctx), separate?: [faces] } - centre + size in px relative
// to the attach part's pivot (head pivot = neck, +z = facing direction), see src/npc/model.js.
import { SKIN_TONES } from './faces.js';
import { shade, mix } from './raster.js';

const tones = (...cs) => cs.map((c, i) => ({ id: 'tone' + i, c }));
const EYE_DARK = '#141014';

// paint helpers for part textures (rect = [x, y, w, h])
export const bands = (r, rect, colour, every = 3, offset = 1) => { if (!rect) return; for (let y = offset; y < rect[3]; y += every) r.hline(rect[0], rect[0] + rect[2] - 1, rect[1] + y, colour); };
export const tipDark = (r, rect, colour, rows = 1) => { if (!rect) return; r.rect(rect[0], rect[1] + rect[3] - rows, rect[2], rows, colour); };
export const eyeOn = (r, rect, colour = EYE_DARK, hi = '#6a6a7a', pad = 0) => {
  if (!rect) return;
  const w = Math.max(1, rect[2] - pad * 2), h = Math.max(1, rect[3] - pad * 2);
  r.rect(rect[0] + pad, rect[1] + pad, w, h, colour);
  if (w > 1 && h > 1) r.px(rect[0] + pad, rect[1] + pad, hi);
};
const speckles = (r, reg, colour, n, rng) => r.speckle(reg[0], reg[1], reg[2], reg[3], colour, n, rng);
const eachHeadFace = (regions) => [regions.F, regions.T, regions.Bk, regions.Rt, regions.Lf, regions.Bt];

export const SPECIES = [
  {
    id: 'human', name: 'Human', adjective: 'human', tones: SKIN_TONES, hair: true, facialHair: true, eyeKind: 'human', headgear: 'any', weight: 60,
  },
  {
    id: 'twilek', name: "Twi'lek", adjective: "Twi'lek", homeworld: 'Ryloth', weight: 8,
    tones: tones('#4f8fd0', '#3aa89a', '#5aa050', '#c04a40', '#d8b040', '#7a5aa8', '#d07aa0', '#d8803a'),
    hair: false, eyeKind: 'human', headgear: 'cap', ink: '#20304a',
    geometry: ({ skin }) => {
      const dark = shade(skin, 0.78);
      const lek = (sx) => ({ x: sx, y: 6.4, z: -4.9, w: 2.2, h: 3.4, d: 2.4, fill: skin });
      const tail = (sx) => ({ x: sx, y: -1.2, z: -5.1, w: 2, h: 12, d: 1.8, fill: skin, paint: (r, uv) => { bands(r, uv.front, dark, 4, 2); tipDark(r, uv.front, dark); } });
      return [{ kind: 'lekku', attach: 'head', boxes: [lek(-2.3), lek(2.3), tail(-2.6), tail(2.6)] }];
    },
  },
  {
    id: 'togruta', name: 'Togruta', adjective: 'Togruta', homeworld: 'Shili', weight: 5,
    tones: tones('#c8563a', '#d8783a', '#b03a30', '#8a3a5a', '#d86a50'),
    hair: false, eyeKind: 'human', headgear: 'none', nose: 'small',
    paintFace: (r, { P, skin }) => {
      const w = '#efe9e2';
      for (const [x, y] of [[6, 0], [7, 0], [8, 0], [9, 0], [7, 1], [8, 1], [0, 8], [1, 8], [14, 8], [15, 8], [0, 9], [1, 9], [2, 9], [13, 9], [14, 9], [15, 9], [0, 10], [15, 10], [1, 11], [14, 11]]) P(x, y, w);
      for (const [x, y] of [[6, 14], [7, 14], [8, 14], [9, 14], [7, 15], [8, 15]]) P(x, y, mix(skin, w, 0.8));
    },
    geometry: ({ skin }) => {
      const white = '#ece7dd', blue = '#3b5b9c', red = shade(skin, 0.85);
      const stripe = (r, uv) => { bands(r, uv.front, blue, 3, 1); bands(r, uv.top, blue, 3, 1); };
      const montral = (sx) => [
        { x: sx, y: 9.6, z: -0.6, w: 3.2, h: 3.8, d: 3.4, fill: white, paint: stripe },
        { x: sx, y: 13.2, z: -0.9, w: 2, h: 3.6, d: 2.2, fill: white, paint: stripe },
      ];
      const tail = (sx, z, h) => ({ x: sx, y: 7 - h / 2 - 1, z, w: 2.3, h, d: 2.2, fill: white, paint: (r, uv) => { bands(r, uv.front, blue, 3, 1); tipDark(r, uv.front, red); } });
      return [
        { kind: 'montrals', attach: 'head', boxes: [...montral(-2.6), ...montral(2.6)] },
        { kind: 'lekku', attach: 'head', boxes: [tail(-4.4, 2.2, 13), tail(4.4, 2.2, 13), tail(0, -5, 14)] },
      ];
    },
  },
  {
    id: 'zabrak', name: 'Zabrak', adjective: 'Zabrak', homeworld: 'Iridonia', weight: 5,
    tones: tones('#e3b58c', '#c99b6a', '#a8734a', '#d8a878', '#c0603a', '#e0c060', '#7d4e30'),
    hair: true, facialHair: false, eyeKind: 'human', headgear: 'none', ink: '#1a1a20',
    paintFace: (r, { P, rng }) => {
      const ink = '#1a1a20';
      const pattern = rng.int(0, 2);
      if (pattern === 0) { for (let y = 13; y <= 15; y++) { P(5, y, ink); P(10, y, ink); } for (let y = 9; y <= 11; y++) { P(2, y, ink); P(13, y, ink); } P(7, 0, ink); P(8, 0, ink); P(7, 1, ink); P(8, 1, ink); }
      else if (pattern === 1) { for (let x = 4; x <= 11; x++) if (x !== 7 && x !== 8) P(x, 14, ink); for (const [x, y] of [[1, 9], [1, 10], [14, 9], [14, 10], [3, 12], [12, 12], [6, 1], [9, 1]]) P(x, y, ink); }
      else { for (let y = 9; y <= 15; y += 2) { P(1, y, ink); P(14, y, ink); } for (const [x, y] of [[6, 13], [9, 13], [7, 15], [8, 15], [7, 0], [8, 0]]) P(x, y, ink); }
    },
    geometry: () => {
      const bone = '#d9c9a6', dark = '#6a5a48';
      const horn = (x, z, h = 1.6) => ({ x, y: 8.5 + h / 2, z, w: 1.1, h, d: 1.1, fill: bone, paint: (r, uv) => { r.rect(uv.top[0], uv.top[1], uv.top[2], uv.top[3], dark); } });
      return [{ kind: 'horns', attach: 'head', boxes: [horn(0, 2.8, 1.8), horn(-2, 2.4), horn(2, 2.4), horn(-3.2, 0.2, 1.4), horn(3.2, 0.2, 1.4), horn(-2.3, -2.4, 1.3), horn(2.3, -2.4, 1.3)] }];
    },
  },
  {
    id: 'rodian', name: 'Rodian', adjective: 'Rodian', homeworld: 'Rodia', weight: 6,
    tones: tones('#4f8f3f', '#3f7f4f', '#6a9a3a', '#2f6f3f', '#3a8a7a'),
    hair: false, eyeKind: 'large_dark', eyeColour: '#1a0f2a', eyeHighlight: '#6f5f92', eyeRim: '#0c0814', nose: 'none', mouth: 'none', headgear: 'cap',
    paintSkin: (r, { skin, rng, regions }) => { for (const reg of eachHeadFace(regions)) { r.noise(reg[0], reg[1], reg[2], reg[3], 0.12, rng, 0.6); speckles(r, reg, shade(skin, 0.7), 10, rng); } },
    geometry: ({ skin }) => {
      const dark = shade(skin, 0.7);
      return [
        { kind: 'snout', attach: 'head', boxes: [{ x: 0, y: 2.3, z: 5.4, w: 3.6, h: 3.4, d: 3.4, fill: skin, separate: ['front'], paint: (r, uv) => { const f = uv.front; r.px(f[0] + 1, f[1] + 1, dark); r.px(f[0] + f[2] - 2, f[1] + 1, dark); r.hline(f[0], f[0] + f[2] - 1, f[1] + f[3] - 1, dark); } }] },
        { kind: 'antennae', attach: 'head', boxes: [{ x: -2.2, y: 9.6, z: 1.2, w: 1, h: 3.2, d: 1, fill: skin, paint: (r, uv) => r.rect(uv.top[0], uv.top[1], uv.top[2], uv.top[3], shade(skin, 1.2)) }, { x: 2.2, y: 9.6, z: 1.2, w: 1, h: 3.2, d: 1, fill: skin, paint: (r, uv) => r.rect(uv.top[0], uv.top[1], uv.top[2], uv.top[3], shade(skin, 1.2)) }] },
        { kind: 'crest', attach: 'head', boxes: [-1.4, 1.4, -2.9, 2.9].map((x, i) => ({ x, y: 8.7, z: i < 2 ? -2.6 : -0.9, w: 1, h: 1.4, d: 1, fill: dark })) },
      ];
    },
  },
  {
    id: 'duros', name: 'Duros', adjective: 'Duros', homeworld: 'Duro', weight: 6,
    tones: tones('#5a7a9a', '#4a6a8a', '#6f8ea8', '#3f5f7f', '#5a8a8a'),
    hair: false, eyeKind: 'large_dark', eyeColour: '#c22a2a', eyeHighlight: '#f08a78', eyeRim: '#7a1414', eyePupil: '#5a0c0c', nose: 'slits', mouth: 'slit', headgear: 'any',
    geometry: ({ skin }) => [{ kind: 'crest', part: 'cranium', attach: 'head', boxes: [{ x: 0, y: 8.7, z: -0.6, w: 8.4, h: 1.4, d: 8.4, fill: skin }] }],
  },
  {
    id: 'nautolan', name: 'Nautolan', adjective: 'Nautolan', homeworld: 'Glee Anselm', weight: 4,
    tones: tones('#3f8f5f', '#5aa06a', '#2f7f6f', '#7fa050'),
    hair: false, eyeKind: 'large_dark', eyeColour: '#0b0b10', eyeHighlight: '#3c3c4c', eyeRim: '#050508', nose: 'slits', mouth: 'wide', headgear: 'cap',
    geometry: ({ skin }) => {
      const dark = shade(skin, 0.72);
      const t = (x, y, z) => ({ x, y, z, w: 1.4, h: 9, d: 1.4, fill: skin, paint: (r, uv) => { bands(r, uv.front, dark, 3, 2); tipDark(r, uv.front, dark); } });
      return [{ kind: 'head_tendrils', attach: 'head', boxes: [t(-3.6, 2.2, -3.6), t(3.6, 2.2, -3.6), t(-1.4, 2.6, -4.9), t(1.4, 2.6, -4.9), t(-4.7, 1.8, -1), t(4.7, 1.8, -1), t(-4.5, 1.4, 1.6), t(4.5, 1.4, 1.6)] }];
    },
  },
  {
    id: 'mon_calamari', name: 'Mon Calamari', adjective: 'Mon Calamari', homeworld: 'Mon Cala', weight: 3,
    tones: tones('#d88a70', '#c87a60', '#e0a088', '#b86a58'),
    hair: false, eyeKind: 'geometry', nose: 'none', mouth: 'wide', headgear: 'none',
    paintSkin: (r, { skin, rng, regions }) => { for (const reg of eachHeadFace(regions)) speckles(r, reg, shade(skin, 0.72), 14, rng); },
    geometry: ({ skin }) => {
      const eye = (r, uv) => { eyeOn(r, uv.front, '#e6c65c', '#fff2b0'); if (uv.front) { r.rect(uv.front[0] + 1, uv.front[1] + 1, 1, 1, EYE_DARK); } eyeOn(r, uv.left, '#e6c65c', '#fff2b0'); eyeOn(r, uv.right, '#e6c65c', '#fff2b0'); };
      return [
        { kind: 'crest', part: 'dome', attach: 'head', boxes: [{ x: 0, y: 9.2, z: -0.6, w: 7.2, h: 2.8, d: 7.6, fill: skin }, { x: 0, y: 11.4, z: -1, w: 5, h: 1.8, d: 5.4, fill: skin }] },
        { kind: 'eyes', attach: 'head', boxes: [{ x: -4.2, y: 5.6, z: 1.6, w: 3, h: 3, d: 3, fill: skin, separate: ['front', 'left', 'right'], paint: eye }, { x: 4.2, y: 5.6, z: 1.6, w: 3, h: 3, d: 3, fill: skin, separate: ['front', 'left', 'right'], paint: eye }] },
      ];
    },
  },
  {
    id: 'bothan', name: 'Bothan', adjective: 'Bothan', homeworld: 'Bothawui', weight: 3,
    tones: tones('#b08a5a', '#8a6a4a', '#d0b890', '#7a6a5a'),
    hair: true, facialHair: false, eyeKind: 'human', nose: 'none', mouth: 'none', headgear: 'cap',
    paintSkin: (r, { skin, rng, regions }) => { for (const reg of eachHeadFace(regions)) { r.noise(reg[0], reg[1], reg[2], reg[3], 0.16, rng, 0.9); speckles(r, reg, shade(skin, 0.75), 12, rng); } },
    geometry: ({ skin }) => {
      const dark = shade(skin, 0.55);
      return [
        { kind: 'snout', attach: 'head', boxes: [{ x: 0, y: 2.6, z: 5.3, w: 4.2, h: 3.2, d: 3, fill: skin, separate: ['front'], paint: (r, uv) => { const f = uv.front; r.rect(f[0] + 1, f[1], f[2] - 2, 1, dark); r.hline(f[0] + 1, f[0] + f[2] - 2, f[1] + f[3] - 1, shade(skin, 0.7)); } }] },
        { kind: 'ears', attach: 'head', boxes: [{ x: -3, y: 9.2, z: -1, w: 1.2, h: 2.4, d: 1, fill: skin }, { x: 3, y: 9.2, z: -1, w: 1.2, h: 2.4, d: 1, fill: skin }] },
      ];
    },
  },
  {
    id: 'sullustan', name: 'Sullustan', adjective: 'Sullustan', homeworld: 'Sullust', weight: 4,
    tones: tones('#d8a890', '#c89880', '#e0b8a0', '#b88870'),
    hair: false, eyeKind: 'large_dark', eyeColour: '#0d0c10', eyeHighlight: '#4a4a56', eyeRim: '#060608', nose: 'small', mouth: 'thin', headgear: 'cap', scale: [0.92, 0.9, 0.92],
    geometry: ({ skin }) => [
      { kind: 'jowls', attach: 'head', boxes: [{ x: -3.2, y: 1.6, z: 2.9, w: 2.6, h: 3.6, d: 2.6, fill: shade(skin, 1.05) }, { x: 3.2, y: 1.6, z: 2.9, w: 2.6, h: 3.6, d: 2.6, fill: shade(skin, 1.05) }] },
      { kind: 'ears', attach: 'head', boxes: [{ x: -4.6, y: 5.6, z: -0.4, w: 1, h: 3.6, d: 3, fill: skin }, { x: 4.6, y: 5.6, z: -0.4, w: 1, h: 3.6, d: 3, fill: skin }] },
    ],
  },
  {
    id: 'gran', name: 'Gran', adjective: 'Gran', homeworld: 'Kinyen', weight: 3,
    tones: tones('#8a6a4a', '#a8865a', '#6a4a3a', '#9a7a5a'),
    hair: false, eyeKind: 'geometry', nose: 'none', mouth: 'none', headgear: 'cap',
    geometry: ({ skin }) => {
      const eye = (r, uv) => eyeOn(r, uv.front, EYE_DARK, '#7a7a8a');
      const stalk = (x, y) => ({ x, y, z: 5.1, w: 1.8, h: 1.8, d: 3, fill: skin, separate: ['front'], paint: eye });
      return [
        { kind: 'eyes', part: 'eye_stalks', attach: 'head', boxes: [stalk(-2.8, 6.2), stalk(0, 6.8), stalk(2.8, 6.2)] },
        { kind: 'snout', attach: 'head', boxes: [{ x: 0, y: 2.4, z: 5.4, w: 4.4, h: 3.2, d: 3, fill: skin, separate: ['front'], paint: (r, uv) => { const f = uv.front; r.px(f[0] + 1, f[1] + 1, shade(skin, 0.6)); r.px(f[0] + f[2] - 2, f[1] + 1, shade(skin, 0.6)); r.hline(f[0] + 1, f[0] + f[2] - 2, f[1] + f[3] - 1, shade(skin, 0.7)); } }] },
      ];
    },
  },
  {
    id: 'aqualish', name: 'Aqualish', adjective: 'Aqualish', homeworld: 'Ando', weight: 3,
    tones: tones('#6a6a72', '#8a7a6a', '#5a5a5a', '#9a8a7a'),
    hair: false, eyeKind: 'large_dark', eyeColour: '#0a0a0e', eyeHighlight: '#3c3c46', eyeRim: '#040406', nose: 'none', mouth: 'slit', headgear: 'cap',
    geometry: () => [{ kind: 'tusks', attach: 'head', boxes: [{ x: -1.9, y: 0.2, z: 4.4, w: 1, h: 3, d: 1, fill: '#e8e0c8', paint: (r, uv) => tipDark(r, uv.front, '#c8b890') }, { x: 1.9, y: 0.2, z: 4.4, w: 1, h: 3, d: 1, fill: '#e8e0c8', paint: (r, uv) => tipDark(r, uv.front, '#c8b890') }] }],
  },
  {
    id: 'ithorian', name: 'Ithorian', adjective: 'Ithorian', homeworld: 'Ithor', weight: 2,
    tones: tones('#8a6a4a', '#a8805a', '#6a5040', '#9a7a50'),
    hair: false, eyeKind: 'geometry', nose: 'none', mouth: 'none', headgear: 'none', scale: [1, 1.08, 1],
    // the head box is the neck: vertical throat creases
    paintSkin: (r, { skin, regions }) => { for (const reg of [regions.F, regions.Bk, regions.Rt, regions.Lf]) for (let x = 2; x < reg[2]; x += 4) r.vline(reg[0] + x, reg[1] + 2, reg[1] + reg[3] - 1, shade(skin, 0.86)); },
    geometry: ({ skin }) => {
      const eye = (r, uv) => { eyeOn(r, uv.front, EYE_DARK, '#8a8a9a', 1); eyeOn(r, uv.left, EYE_DARK, '#8a8a9a', 1); eyeOn(r, uv.right, EYE_DARK, '#8a8a9a', 1); };
      return [{ kind: 'hammerhead', attach: 'head', boxes: [
        { x: 0, y: 9.6, z: 1, w: 15, h: 4, d: 6, fill: skin, paint: (r, uv) => bands(r, uv.front, shade(skin, 0.88), 2, 1) },
        { x: -6.2, y: 6.4, z: 3.2, w: 3, h: 5, d: 3.2, fill: skin, separate: ['front', 'left', 'right'], paint: eye },
        { x: 6.2, y: 6.4, z: 3.2, w: 3, h: 5, d: 3.2, fill: skin, separate: ['front', 'left', 'right'], paint: eye },
        { x: 0, y: 12.3, z: -0.6, w: 4, h: 1.6, d: 3, fill: shade(skin, 0.9) },
      ] }];
    },
  },
  {
    id: 'weequay', name: 'Weequay', adjective: 'Weequay', homeworld: 'Sriluur', weight: 3,
    tones: tones('#7a5a3a', '#8a6a48', '#6a4a30', '#9a7a58'),
    hair: true, hairStyles: ['topknot', 'none'], facialHair: false, eyeKind: 'small_dark', eyeColour: '#1a1410', nose: 'wide', mouth: 'thin', headgear: 'any',
    paintSkin: (r, { skin, rng, regions }) => { for (const reg of eachHeadFace(regions)) { r.noise(reg[0], reg[1], reg[2], reg[3], 0.16, rng, 0.8); if (reg !== regions.T && reg !== regions.Bt) for (const y of [3, 10, 14]) r.hline(reg[0], reg[0] + reg[2] - 1, reg[1] + y, shade(skin, 0.82)); } },
  },
  {
    id: 'chagrian', name: 'Chagrian', adjective: 'Chagrian', homeworld: 'Champala', weight: 2,
    tones: tones('#3f6fb0', '#2f5f9f', '#5a80c0', '#4a6aa0'),
    hair: false, eyeKind: 'human', eyeColours: ['amber', 'brown', 'violet'], nose: 'small', headgear: 'none',
    geometry: ({ skin }) => {
      const horn = '#8fa3c0', dark = shade(skin, 0.75);
      return [
        { kind: 'horns', attach: 'head', boxes: [{ x: -3.2, y: 10, z: -1.8, w: 1.4, h: 4.4, d: 1.4, fill: horn, paint: (r, uv) => r.rect(uv.top[0], uv.top[1], uv.top[2], uv.top[3], '#dfe6f0') }, { x: 3.2, y: 10, z: -1.8, w: 1.4, h: 4.4, d: 1.4, fill: horn, paint: (r, uv) => r.rect(uv.top[0], uv.top[1], uv.top[2], uv.top[3], '#dfe6f0') }] },
        { kind: 'lethorns', attach: 'head', boxes: [{ x: -4.8, y: 0.5, z: -1.2, w: 2, h: 12, d: 2, fill: skin, paint: (r, uv) => tipDark(r, uv.front, dark, 2) }, { x: 4.8, y: 0.5, z: -1.2, w: 2, h: 12, d: 2, fill: skin, paint: (r, uv) => tipDark(r, uv.front, dark, 2) }] },
      ];
    },
  },
  {
    id: 'pantoran', name: 'Pantoran', adjective: 'Pantoran', homeworld: 'Pantora', weight: 4,
    tones: tones('#7fa8d8', '#6f98c8', '#8fb4e0', '#5f88b8'),
    hair: true, facialHair: true, eyeKind: 'human', headgear: 'any', hairColours: ['blond', 'platinum', 'white', 'black', 'grey'],
    paintFace: (r, { P, skin }) => { const g = '#e2b640'; for (const [x, y] of [[3, 9], [12, 9], [7, 14], [8, 14], [7, 0], [8, 0]]) P(x, y, g); P(2, 10, mix(skin, g, 0.6)); P(13, 10, mix(skin, g, 0.6)); },
  },
  {
    id: 'mirialan', name: 'Mirialan', adjective: 'Mirialan', homeworld: 'Mirial', weight: 4,
    tones: tones('#a8b070', '#9aa060', '#b8b880', '#8a9858'),
    hair: true, facialHair: true, eyeKind: 'human', headgear: 'any', ink: '#2a3a2a',
    paintFace: (r, { P, rng }) => {
      const ink = '#2a3a2a';
      const diamond = (x, y) => { P(x, y, ink); };
      const style = rng.int(0, 1);
      if (style === 0) { for (const x of [2, 4]) diamond(x, 10); for (const x of [11, 13]) diamond(x, 10); diamond(7, 14); diamond(8, 14); diamond(7, 9); diamond(8, 9); }
      else { for (let x = 5; x <= 10; x += 1) if (x % 2 === 0) diamond(x, 14); diamond(1, 10); diamond(14, 10); diamond(2, 11); diamond(13, 11); }
    },
  },
  {
    id: 'pyke', name: 'Pyke', adjective: 'Pyke', homeworld: 'Oba Diah', weight: 1,
    tones: tones('#b8c0b0', '#a8b0a0', '#c8c8b8'),
    hair: false, eyeKind: 'small_dark', eyeColour: '#141a18', nose: 'slits', mouth: 'slit', headgear: 'none',
    geometry: ({ skin }) => [{ kind: 'crest', part: 'cranium', attach: 'head', boxes: [{ x: 0, y: 9.7, z: -0.6, w: 6.4, h: 3.6, d: 6.4, fill: skin }, { x: 0, y: 12.6, z: -1, w: 4.4, h: 2.4, d: 4.4, fill: shade(skin, 0.95) }] }],
  },
  {
    id: 'droid', name: 'Droid', adjective: 'droid', tones: tones('#8a8a90'), hair: false, facialHair: false, eyeKind: 'none', headgear: 'none', weight: 0, droid: true,
  },
];

export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
export const ALIEN_SPECIES = SPECIES.filter((s) => s.id !== 'human' && !s.droid);
export const ORGANIC_SPECIES = SPECIES.filter((s) => !s.droid);
export const HUMANLIKE_EYES = SPECIES.filter((s) => s.eyeKind === 'human').map((s) => s.id);
export const LARGE_DARK_EYES = SPECIES.filter((s) => s.eyeKind === 'large_dark').map((s) => s.id);
// headgear classes: 'any' takes helmets and caps; 'cap' takes caps/hats but not full helmets; 'none' takes nothing
export const helmetOK = (sp) => sp.headgear === 'any';
export const capOK = (sp) => sp.headgear === 'any' || sp.headgear === 'cap';
