// Painting helpers shared by the outfit painters: garment fills over the 2x classic layout, wear levels
// (clean / worn / patched as texture detail), insignia and the head-as-helmet painters.
import { REG, PART, SIDES, ALL_FACES } from './layout.js';
import { shade, mix, rgb } from './raster.js';

export const on = (r, reg, x, y, w, h, c) => r.rect(reg[0] + x, reg[1] + y, w, h, c);
export const px = (r, reg, x, y, c) => r.px(reg[0] + x, reg[1] + y, c);
export const fillPart = (r, part, c, faces = ALL_FACES) => { for (const f of faces) { const reg = PART[part][f]; r.rect(reg[0], reg[1], reg[2], reg[3], c); } };
// rows y..y+h-1 across the four vertical faces of a part
export const band = (r, part, y, h, c, faces = SIDES) => { for (const f of faces) { const reg = PART[part][f]; r.rect(reg[0], reg[1] + y, reg[2], h, c); } };
export const noisePart = (r, part, amt, rng, density = 0.5, faces = SIDES) => { for (const f of faces) { const reg = PART[part][f]; r.noise(reg[0], reg[1], reg[2], reg[3], amt, rng, density); } };
export const speckPart = (r, part, c, count, rng, faces = SIDES) => { for (const f of faces) { const reg = PART[part][f]; r.speckle(reg[0], reg[1], reg[2], reg[3], c, count, rng); } };

// ---- garment building blocks (body faces are 16x24 front/back and 8x24 sides; arm/leg faces 8x24)
export function shirt(r, c, sleeves = c) { fillPart(r, 'body', c); fillPart(r, 'arm', sleeves, ['front', 'back', 'left', 'right', 'top']); }
export function trousers(r, c) { fillPart(r, 'leg', c); }
export function boots(r, c, from = 18, sole = shade(c, 0.6)) { band(r, 'leg', from, 24 - from, c); fillPart(r, 'leg', c, ['bottom']); band(r, 'leg', 23, 1, sole); }
export function hands(r, skin) { band(r, 'arm', 18, 6, skin); fillPart(r, 'arm', skin, ['bottom']); }
export function gloves(r, c, from = 18) { band(r, 'arm', from, 24 - from, c); fillPart(r, 'arm', c, ['bottom']); }
export function belt(r, c, buckle = null, y = 19, h = 2) { band(r, 'body', y, h, c); if (buckle) on(r, REG.bodyFront, 7, y, 2, h, buckle); }
export function collar(r, c, w = 4, h = 2) { on(r, REG.bodyFront, 8 - w / 2, 0, w, h, c); on(r, REG.bodyBack, 8 - w / 2, 0, w, 1, c); }
// V neck showing an inner layer
export function vNeck(r, inner, depth = 4) { for (let y = 0; y < depth; y++) { const half = Math.max(1, Math.round((depth - y) * 0.75)); on(r, REG.bodyFront, 8 - half, y, half * 2, 1, inner); } }
// a raised armour plate: fill + bevel + seam line
export function plate(r, reg, x, y, w, h, c) { r.rect(reg[0] + x, reg[1] + y, w, h, c); r.bevel(reg[0] + x, reg[1] + y, w, h, 1.12, 0.82); }
export function seams(r, part, c, rows = [8, 16]) { for (const y of rows) band(r, part, y, 1, c); }
// knee-length tunic hem over the top rows of the legs
export function hem(r, c, rows = 5) { band(r, 'leg', 0, rows, c); fillPart(r, 'leg', c, ['top']); }
// symmetric pair of vertical straps on the body front
export function straps(r, c, x = 3, w = 2, y = 0, h = 19) { on(r, REG.bodyFront, x, y, w, h, c); on(r, REG.bodyFront, 16 - x - w, y, w, h, c); on(r, REG.bodyBack, x, y, w, h, c); on(r, REG.bodyBack, 16 - x - w, y, w, h, c); }
export function pockets(r, c, y = 14) { on(r, REG.bodyFront, 2, y, 4, 3, c); on(r, REG.bodyFront, 10, y, 4, 3, c); }
// apron over the front (rows y..) with strings around the back
export function apron(r, c, y = 6, strings = shade(c, 0.8)) { on(r, REG.bodyFront, 2, y, 12, 24 - y, c); on(r, REG.bodyFront, 5, 1, 6, y - 1, c); band(r, 'body', y, 1, strings, ['back', 'left', 'right']); }
export function vest(r, c, inner) { on(r, REG.bodyFront, 0, 0, 5, 24, c); on(r, REG.bodyFront, 11, 0, 5, 24, c); on(r, REG.bodyFront, 0, 15, 16, 9, c); fillPart(r, 'body', c, ['back', 'left', 'right', 'top']); on(r, REG.bodyFront, 5, 0, 6, 15, inner); px(r, REG.bodyFront, 7, 6, shade(c, 1.6)); px(r, REG.bodyFront, 8, 10, shade(c, 1.6)); }
export function buttons(r, c, x = 7, y0 = 3, n = 4, step = 3) { for (let i = 0; i < n; i++) px(r, REG.bodyFront, x, y0 + i * step, c); }
export function doubleButtons(r, c, y0 = 4, n = 4, step = 3) { for (let i = 0; i < n; i++) { px(r, REG.bodyFront, 6, y0 + i * step, c); px(r, REG.bodyFront, 9, y0 + i * step, c); } }
// jacket open over a shirt: sides of the front in jacket colour, centre strip shirt
export function jacket(r, c, shirtC, open = 4) { fillPart(r, 'body', c); on(r, REG.bodyFront, 8 - open / 2, 0, open, 16, shirtC); on(r, REG.bodyFront, 8 - open / 2 - 1, 0, 1, 16, shade(c, 0.8)); on(r, REG.bodyFront, 8 + open / 2, 0, 1, 16, shade(c, 0.8)); fillPart(r, 'arm', c, ['front', 'back', 'left', 'right', 'top']); }
export function checker(r, reg, a, b, size = 2) { for (let y = 0; y < reg[3]; y++) for (let x = 0; x < reg[2]; x++) r.px(reg[0] + x, reg[1] + y, ((x / size | 0) + (y / size | 0)) & 1 ? a : b); }
export function stripesH(r, part, a, b, every = 2, faces = SIDES) { for (const f of faces) { const reg = PART[part][f]; for (let y = 0; y < reg[3]; y++) r.rect(reg[0], reg[1] + y, reg[2], 1, (y / every | 0) & 1 ? a : b); } }
export function dots(r, part, c, rng, count = 14, faces = SIDES) { speckPart(r, part, c, count, rng, faces); }
// side stripe down the outer faces of the legs (the leg's left/right faces)
export function legStripe(r, c, x = 3, w = 2) { on(r, REG.legLeft, x, 0, w, 18, c); on(r, REG.legRight, 8 - x - w, 0, w, 18, c); }
export function armStripe(r, c, y = 6, h = 2) { band(r, 'arm', y, h, c); }
export function shoulderTabs(r, c) { band(r, 'arm', 0, 2, c); fillPart(r, 'arm', c, ['top']); }
export function kneePads(r, c) { band(r, 'leg', 10, 4, c); }
export function elbowPads(r, c) { band(r, 'arm', 9, 4, c); }

// ---- insignia (4x4 Republic cog, rank pips, medical cross, badge, vertical diamonds)
export function cog(r, reg, x, y, c, centre = null) {
  for (const [i, j] of [[1, 0], [2, 0], [0, 1], [3, 1], [0, 2], [3, 2], [1, 3], [2, 3]]) r.px(reg[0] + x + i, reg[1] + y + j, c);
  if (centre) for (const [i, j] of [[1, 1], [2, 1], [1, 2], [2, 2]]) r.px(reg[0] + x + i, reg[1] + y + j, centre);
}
export function pips(r, reg, x, y, n, c) { for (let i = 0; i < n; i++) r.px(reg[0] + x + i * 2, reg[1] + y, c); }
export function cross(r, reg, x, y, c) { r.rect(reg[0] + x + 1, reg[1] + y, 1, 3, c); r.rect(reg[0] + x, reg[1] + y + 1, 3, 1, c); }
export function badge(r, reg, x, y, c) { r.rect(reg[0] + x, reg[1] + y, 2, 2, c); r.px(reg[0] + x, reg[1] + y, shade(c, 1.35)); }
// vertical diamond centred on column cx: 1 px wide at the tips, 2 px in the middle
export function vDiamond(r, reg, cx, y0, h, c) {
  for (let j = 0; j < h; j++) {
    const edge = j === 0 || j === h - 1;
    if (edge) r.px(reg[0] + cx, reg[1] + y0 + j, c); else r.rect(reg[0] + cx - 0, reg[1] + y0 + j, 2, 1, c);
  }
}

// ---- helmets painted on the head box (the face is replaced; eyes become null)
export function helmetBase(r, c, dark = shade(c, 0.8), light = shade(c, 1.1)) {
  fillPart(r, 'head', c);
  for (const f of ['front', 'back', 'left', 'right']) { const reg = PART.head[f]; r.rect(reg[0], reg[1] + 15, 16, 1, dark); }
  for (const f of ['front', 'back', 'left', 'right']) { const reg = PART.head[f]; r.rect(reg[0], reg[1], 16, 1, light); }
  const T = REG.headTop; r.rect(T[0], T[1], 16, 16, light);
}
// black T visor: horizontal bar rows 6-7 (cols 3..12) and vertical bar rows 8..11 (cols 7..8)
export function tVisor(r, c = '#0c0c10', hi = '#3a4250', wideBar = false) {
  const F = REG.headFront;
  on(r, F, wideBar ? 2 : 3, 6, wideBar ? 12 : 10, 2, c); on(r, F, 7, 8, 2, 4, c);
  px(r, F, wideBar ? 3 : 4, 6, hi);
}
export function wideVisor(r, c = '#0e1218', hi = '#3a6a8a', y = 4, h = 5, x = 1, w = 14) { const F = REG.headFront; on(r, F, x, y, w, h, c); on(r, F, x + 1, y + 1, 4, 1, hi); }
export function chinGuard(r, c) { const F = REG.headFront; on(r, F, 4, 12, 8, 3, c); }

// ---- wear levels: texture detail, not colour swaps. level: 'clean' | 'worn' | 'patched'
const DIRT = '#4a3a2a', GREY = '#9a9a9a', DGREY = '#5a5a5a';
export function applyWear(r, level, rng, { armour = false, parts = ['body', 'arm', 'leg'], patchColours = ['#6a5a4a', '#4a4a5a', '#7a6a50'] } = {}) {
  if (level === 'clean' || !level) return;
  const faces = SIDES;
  for (const part of parts) for (const f of faces) {
    const reg = PART[part][f];
    // faded / scuffed pixels
    const n = Math.round(reg[2] * reg[3] * (armour ? 0.05 : 0.04));
    for (let k = 0; k < n; k++) r.mul(reg[0] + rng.int(0, reg[2] - 1), reg[1] + rng.int(0, reg[3] - 1), rng.chance(0.5) ? 0.88 : 1.1);
    if (armour) {
      for (let k = 0; k < 3; k++) { const x = reg[0] + rng.int(0, reg[2] - 1), y = reg[1] + rng.int(0, reg[3] - 3); r.px(x, y, GREY); r.px(x, y + 1, GREY); }
      for (let k = 0; k < 2; k++) r.px(reg[0] + rng.int(0, reg[2] - 1), reg[1] + rng.int(0, reg[3] - 1), DGREY);
    }
  }
  // hem dirt and knee / elbow rubbing
  for (const f of faces) {
    const L = PART.leg[f];
    for (let k = 0; k < 6; k++) r.blend(L[0] + rng.int(0, 7), L[1] + rng.int(20, 23), DIRT, 0.35);
    for (let k = 0; k < 3; k++) r.mul(L[0] + rng.int(1, 6), L[1] + rng.int(10, 13), 1.08);
    const A = PART.arm[f];
    for (let k = 0; k < 2; k++) r.mul(A[0] + rng.int(1, 6), A[1] + rng.int(8, 11), 1.08);
  }
  if (level !== 'patched') return;
  // patches with stitch corners, a tear and a stain
  const targets = [[PART.body.front, 3, 8, 10, 16], [PART.body.back, 2, 6, 11, 18], [PART.leg.front, 1, 6, 5, 16], [PART.arm.front, 1, 4, 5, 14], [PART.leg.back, 1, 8, 5, 16]];
  const nPatches = rng.int(2, 3);
  for (let k = 0; k < nPatches; k++) {
    const [reg, x0, y0, x1, y1] = rng.pick(targets);
    const w = rng.int(3, 4), h = rng.int(3, 4), x = reg[0] + rng.int(x0, x1 - w), y = reg[1] + rng.int(y0, y1 - h);
    const base = r.get(x, y);
    const pc = mix(base[3] ? base : '#666666', rng.pick(patchColours), 0.6);
    r.rect(x, y, w, h, pc);
    const st = shade(pc, 0.65);
    r.px(x, y, st); r.px(x + w - 1, y, st); r.px(x, y + h - 1, st); r.px(x + w - 1, y + h - 1, st);
  }
  { const reg = rng.pick([PART.body.front, PART.leg.front, PART.arm.back]); const x = reg[0] + rng.int(1, reg[2] - 2), y = reg[1] + rng.int(4, reg[3] - 5); for (let j = 0; j < 3; j++) r.mul(x + (j === 1 ? 1 : 0), y + j, 0.55); }
  { const reg = rng.pick([PART.body.front, PART.body.back]); const x = reg[0] + rng.int(2, reg[2] - 5), y = reg[1] + rng.int(6, reg[3] - 6); for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) if (rng.chance(0.7)) r.blend(x + i, y + j, DIRT, 0.3); }
}
export const WEAR_LEVELS = ['clean', 'worn', 'patched'];
export { rgb, shade, mix };
