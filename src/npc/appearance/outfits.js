// Outfit catalogue: 50+ named outfits with faction / role meaning, 2-4 colourways each and wear levels.
// Uniform colours follow the 501st costume references and Wookieepedia (Senate Guard, Coruscant Guard, CSF, Jedi).
// Each painter draws over the already painted body (skin + face); helmets overwrite the head and set ctx.helmet.
// Geometry boxes are part-local px (see species.js); the composer allocates their textures.
import { REG } from './layout.js';
import { shade, mix } from './raster.js';
import * as PAINT from './paint.js';
import {
  on, px, fillPart, band, noisePart, shirt, trousers, boots, hands, gloves, belt, collar, vNeck, plate, hem, straps, pockets, apron, vest,
  doubleButtons, jacket, checker, dots, legStripe, armStripe, shoulderTabs, kneePads, elbowPads,
  cog, pips, cross, badge, vDiamond, helmetBase, tVisor, wideVisor, chinGuard,
} from './paint.js';

const cw = (id, name, p) => ({ id, name, p });
const F = REG.bodyFront, B = REG.bodyBack, HF = REG.headFront, HT = REG.headTop, HB = REG.headBack, HR = REG.headRight, HL = REG.headLeft;

// ---- reusable geometry
const capGeo = (c, badgeC = null) => ({ kind: 'hat', part: 'cap', attach: 'head', boxes: [{ x: 0, y: 8.8, z: 0, w: 8.6, h: 1.6, d: 8.6, fill: c, separate: badgeC ? ['front'] : [], paint: badgeC ? (r, uv) => r.rect(uv.front[0] + Math.floor(uv.front[2] / 2) - 1, uv.front[1], 2, 1, badgeC) : null }, { x: 0, y: 8.3, z: 5.2, w: 6.4, h: 0.6, d: 3, fill: shade(c, 0.85) }] });
const peakedCapGeo = (c, bandC) => ({ kind: 'hat', part: 'peaked_cap', attach: 'head', boxes: [{ x: 0, y: 9.2, z: -0.4, w: 8.8, h: 2.4, d: 8.8, fill: c, paint: (r, uv) => { r.rect(uv.front[0], uv.front[1] + uv.front[3] - 1, uv.front[2], 1, bandC); } }, { x: 0, y: 8.2, z: 5.4, w: 7, h: 0.6, d: 3.2, fill: '#141418' }] });
const hardHatGeo = (c) => ({ kind: 'hat', part: 'hard_hat', attach: 'head', boxes: [{ x: 0, y: 9.3, z: 0, w: 8.8, h: 2.4, d: 8.8, fill: c }, { x: 0, y: 8.2, z: 0, w: 10.6, h: 0.6, d: 10.6, fill: shade(c, 0.9) }] });
const bucketHatGeo = (c) => ({ kind: 'hat', part: 'bucket_hat', attach: 'head', boxes: [{ x: 0, y: 9.1, z: 0, w: 8.6, h: 2, d: 8.6, fill: c }, { x: 0, y: 8.2, z: 0, w: 11, h: 0.6, d: 11, fill: shade(c, 0.9) }] });
const toqueGeo = (c) => ({ kind: 'hat', part: 'toque', attach: 'head', boxes: [{ x: 0, y: 9.6, z: 0, w: 7.4, h: 3, d: 7.4, fill: c, paint: (r, uv) => PAINT.on(r, uv.front, 0, uv.front[3] - 1, uv.front[2], 1, shade(c, 0.85)) }] });
const capeGeo = (c, h = 16, kind = 'cape') => ({ kind, attach: 'body', boxes: [{ x: 0, y: 6 - h / 2, z: -2.7, w: 8.6, h, d: 0.8, fill: c, paint: (r, uv) => { PAINT.on(r, uv.front, 0, uv.front[3] - 1, uv.front[2], 1, shade(c, 0.8)); } }] });
const skirtGeo = (c, h = 8, opts = {}) => {
  const y = -6 - h / 2 + 0.2, boxes = [];
  if (opts.front !== false) boxes.push({ x: 0, y, z: 2.3, w: 8.4, h, d: 0.6, fill: c });
  if (opts.back !== false) boxes.push({ x: 0, y, z: -2.3, w: 8.4, h, d: 0.6, fill: c });
  if (opts.sides !== false) boxes.push({ x: -4.2, y, z: 0, w: 0.6, h, d: 4.4, fill: c }, { x: 4.2, y, z: 0, w: 0.6, h, d: 4.4, fill: c });
  return { kind: 'skirt', part: opts.part || 'skirt', attach: 'body', boxes };
};
const openRobeGeo = (c) => ({ kind: 'skirt', part: 'robe_panels', attach: 'body', boxes: [{ x: -2.6, y: -10.5, z: 2.3, w: 3.4, h: 9, d: 0.6, fill: c }, { x: 2.6, y: -10.5, z: 2.3, w: 3.4, h: 9, d: 0.6, fill: c }, { x: 0, y: -10.5, z: -2.3, w: 8.4, h: 9, d: 0.6, fill: c }] });
const backpackGeo = (c, kind = 'backpack') => ({ kind, attach: 'body', boxes: [{ x: 0, y: 1, z: -3.5, w: 6, h: 8, d: 2.6, fill: c, paint: (r, uv) => PAINT.on(r, uv.front, 1, 1, uv.front[2] - 2, 1, shade(c, 0.7)) }] });
const satchelGeo = (c) => ({ kind: 'satchel', attach: 'body', boxes: [{ x: 3.4, y: -4.2, z: -3.1, w: 4, h: 5, d: 1.8, fill: c, paint: (r, uv) => PAINT.on(r, uv.front, 0, 1, uv.front[2], 1, shade(c, 0.7)) }] });
const hoodDownGeo = (c) => ({ kind: 'hood', part: 'hood_down', attach: 'body', boxes: [{ x: 0, y: 5.6, z: -3, w: 9, h: 2.6, d: 2.4, fill: c }] });
const datapadGeo = () => ({ kind: 'prop', part: 'datapad', attach: 'leftArm', boxes: [{ x: 0, y: -10.4, z: 2.7, w: 2.8, h: 3.6, d: 0.5, fill: '#2a2c34', separate: ['front'], paint: (r, uv) => PAINT.on(r, uv.front, 0, 0, uv.front[2], uv.front[3] - 1, '#5ac8e8') }] });
const goggleGeo = (c = '#2a3a48') => ({ kind: 'goggles', attach: 'head', boxes: [{ x: 0, y: 6.7, z: 4.4, w: 6.6, h: 1.6, d: 1, fill: '#3a3a3a', separate: ['front'], paint: (r, uv) => { PAINT.on(r, uv.front, 0, 0, 2, uv.front[3], c); PAINT.on(r, uv.front, uv.front[2] - 2, 0, 2, uv.front[3], c); } }] });
// Senate Guard double plume: two upright fins on a raised crest base, running front to back over the helmet
const plumeGeo = (c) => ({ kind: 'plume', attach: 'head', boxes: [
  { x: -1.1, y: 13.2, z: -0.6, w: 1.3, h: 5.4, d: 6.6, fill: c, paint: (r, uv) => { PAINT.on(r, uv.front, 0, 0, uv.front[2], 1, shade(c, 1.3)); PAINT.on(r, uv.left, 0, 0, uv.left[2], 1, shade(c, 1.3)); } },
  { x: 1.1, y: 13.2, z: -0.6, w: 1.3, h: 5.4, d: 6.6, fill: c, paint: (r, uv) => { PAINT.on(r, uv.front, 0, 0, uv.front[2], 1, shade(c, 1.3)); PAINT.on(r, uv.left, 0, 0, uv.left[2], 1, shade(c, 1.3)); } },
  { x: 0, y: 10.6, z: -0.4, w: 3.6, h: 1.6, d: 7.6, fill: shade(c, 0.8) },
] });
const openHelmetGeo = (c, trim) => ({ kind: 'helmet', part: 'open_helmet', attach: 'head', boxes: [
  { x: 0, y: 9, z: 0, w: 9.4, h: 1.8, d: 9.4, fill: c, paint: (r, uv) => PAINT.on(r, uv.top, 0, 0, uv.top[2], 1, trim) },
  { x: 0, y: 4.2, z: -4.6, w: 9.4, h: 8.4, d: 1, fill: c },
  { x: -4.6, y: 4.2, z: -0.4, w: 1, h: 8.4, d: 8.4, fill: c, paint: (r, uv) => PAINT.on(r, uv.left, 0, uv.left[3] - 2, uv.left[2], 1, trim) },
  { x: 4.6, y: 4.2, z: -0.4, w: 1, h: 8.4, d: 8.4, fill: c, paint: (r, uv) => PAINT.on(r, uv.right, 0, uv.right[3] - 2, uv.right[2], 1, trim) },
  { x: 0, y: 7.8, z: 4.6, w: 9.4, h: 1.4, d: 1, fill: c, paint: (r, uv) => PAINT.on(r, uv.front, 0, 0, uv.front[2], 1, trim) },
] });
const finGeo = (c) => ({ kind: 'crest', part: 'fin', attach: 'head', boxes: [{ x: 0, y: 8.7, z: 0.6, w: 1.2, h: 1.4, d: 6.8, fill: c }] });
const crestGeo = (c) => ({ kind: 'crest', part: 'mohawk_crest', attach: 'head', boxes: [{ x: 0, y: 9.6, z: 0.3, w: 1.4, h: 2.8, d: 7.6, fill: c, paint: (r, uv) => PAINT.on(r, uv.front, 0, uv.front[3] - 1, uv.front[2], 1, '#1a1a1a') }] });
const pauldronGeo = (c, arm = 'rightArm') => ({ kind: 'pauldron', attach: arm, boxes: [{ x: 0, y: 1.2, z: 0, w: 5.4, h: 1.8, d: 5.4, fill: c }] });
const visorGeo = (c) => ({ kind: 'visor', attach: 'head', boxes: [{ x: 0, y: 4.8, z: 4.5, w: 9, h: 5, d: 0.9, fill: c, paint: (r, uv) => PAINT.on(r, uv.front, 1, 1, 3, 1, mix(c, '#ffffff', 0.35)) }] });
const lampGeo = () => ({ kind: 'lamp', part: 'shoulder_lamp', attach: 'leftArm', boxes: [{ x: 0.2, y: 1, z: 1.6, w: 1.8, h: 1.8, d: 1.8, fill: '#3a3a40', separate: ['front'], paint: (r, uv) => PAINT.on(r, uv.front, 0, 0, uv.front[2], uv.front[3], '#fff2b0') }] });
const holocamGeo = () => ({ kind: 'prop', part: 'holocam', attach: 'body', boxes: [{ x: -6, y: 7.4, z: 0.2, w: 3, h: 2.4, d: 3.4, fill: '#3a3c44', separate: ['front'], paint: (r, uv) => { PAINT.on(r, uv.front, 1, 0, uv.front[2] - 2, uv.front[3], '#1a1a20'); r.px(uv.front[0] + 1, uv.front[1], '#6ae0ff'); } }] });
const cameraGeo = () => ({ kind: 'prop', part: 'camera', attach: 'body', boxes: [{ x: 0, y: 0.5, z: 2.8, w: 2.6, h: 1.8, d: 1.4, fill: '#2a2a30', paint: (r, uv) => r.px(uv.front[0] + 1, uv.front[1], '#7ad0ff') }] });
const helmetCarriedGeo = (c, stripe) => ({ kind: 'prop', part: 'carried_helmet', attach: 'leftArm', boxes: [{ x: 2.7, y: -10.2, z: 0.6, w: 5, h: 5, d: 5, fill: c, paint: (r, uv) => { PAINT.on(r, uv.front, 0, 1, uv.front[2], 2, '#1a1a20'); PAINT.on(r, uv.top, 0, 2, uv.top[2], 1, stripe); } }] });
const maskGeo = (c) => ({ kind: 'mask', part: 'breath_mask', attach: 'head', boxes: [{ x: 0, y: 2.3, z: 4.7, w: 6.6, h: 3.4, d: 1.8, fill: c, separate: ['front'], paint: (r, uv) => { r.px(uv.front[0] + 1, uv.front[1] + 1, '#1a1a1a'); r.px(uv.front[0] + uv.front[2] - 2, uv.front[1] + 1, '#1a1a1a'); } }, { x: -2.4, y: -1.6, z: 4.4, w: 1, h: 5, d: 1, fill: shade(c, 0.8) }, { x: 2.4, y: -1.6, z: 4.4, w: 1, h: 5, d: 1, fill: shade(c, 0.8) }] });
const jetpackGeo = (c) => ({ kind: 'backpack', part: 'jetpack', attach: 'body', boxes: [{ x: 0, y: 1.5, z: -3.4, w: 6, h: 8, d: 2.6, fill: c }, { x: -1.8, y: -3.4, z: -3.4, w: 1.6, h: 2, d: 1.6, fill: '#2a2a2a' }, { x: 1.8, y: -3.4, z: -3.4, w: 1.6, h: 2, d: 1.6, fill: '#2a2a2a' }] });
const rangefinderGeo = () => ({ kind: 'antenna', part: 'rangefinder', attach: 'head', boxes: [{ x: -4.7, y: 8.4, z: -1, w: 0.8, h: 4.2, d: 0.8, fill: '#8a8a8a' }, { x: -4.7, y: 10.7, z: 0.2, w: 0.8, h: 0.8, d: 2.4, fill: '#8a8a8a' }] });
const pikeGeo = () => ({ kind: 'prop', part: 'lightsaber_pike', attach: 'rightArm', boxes: [{ x: 0.2, y: -8, z: 2.2, w: 0.9, h: 9, d: 0.9, fill: '#6a6a72' }, { x: 0.2, y: 3, z: 2.2, w: 0.7, h: 13, d: 0.7, fill: '#f6e27a' }] });
const headdressGeo = (c, jewel) => ({ kind: 'headdress', attach: 'head', boxes: [{ x: 0, y: 10.3, z: -1, w: 9.6, h: 3.2, d: 2.4, fill: c, paint: (r, uv) => r.px(uv.front[0] + Math.floor(uv.front[2] / 2), uv.front[1] + 1, jewel) }, { x: -4.9, y: 3.6, z: -0.4, w: 1.2, h: 6.2, d: 1.2, fill: c }, { x: 4.9, y: 3.6, z: -0.4, w: 1.2, h: 6.2, d: 1.2, fill: c }] });
const collarFanGeo = (c) => ({ kind: 'collar', part: 'fan_collar', attach: 'body', boxes: [{ x: 0, y: 7, z: -2.6, w: 11.5, h: 5.4, d: 0.8, fill: c, paint: (r, uv) => { for (let x = 1; x < uv.front[2]; x += 2) r.vline(uv.front[0] + x, uv.front[1], uv.front[1] + uv.front[3] - 1, shade(c, 1.25)); } }] });
const hoodUpOverlay = (c) => ({ part: 'head', inflate: 0.7, colour: c, faceOpening: true });

// wear list helpers
const CW = ['clean', 'worn'], WP = ['worn', 'patched'], ALLW = ['clean', 'worn', 'patched'];

// small shared painters
const uniformBase = (r, skin, tunic, trous, bootC, sleeves = tunic) => { shirt(r, tunic, sleeves); trousers(r, trous); boots(r, bootC); hands(r, skin); };
const armourSuit = (r, ctx, plateC, underC, glovesC, bootC) => {
  fillPart(r, 'body', underC); fillPart(r, 'arm', underC); fillPart(r, 'leg', underC);
  plate(r, F, 1, 2, 14, 12, plateC); plate(r, B, 1, 2, 14, 12, plateC); band(r, 'body', 2, 12, plateC, ['left', 'right']);
  band(r, 'body', 15, 3, plateC); belt(r, shade(underC, 1.3), plateC, 19, 2);
  band(r, 'arm', 0, 5, plateC); band(r, 'arm', 12, 5, plateC); gloves(r, glovesC);
  band(r, 'leg', 0, 8, plateC); band(r, 'leg', 10, 4, plateC); boots(r, bootC, 16); band(r, 'leg', 16, 6, plateC, ['front']);
  fillPart(r, 'arm', plateC, ['top']); fillPart(r, 'body', plateC, ['top']);
  ctx.armour = true;
};

export const OUTFITS = [
  // ================================================================= Senate Guard (non-clone), Republic blue
  {
    id: 'senate_guard', name: 'Senate Guard robes', faction: 'senate_guard', role: 'guard', headgear: 'open_helmet', wear: CW,
    describe: 'deep blue Senate Guard robes worn open over blue armour, plumed open-face helmet',
    colourways: [cw('guard_blue', 'guard blue', { robe: '#1f2f6c', armour: '#4666c8', trim: '#7a92e0', helmet: '#2c44a0', plume: '#4a6ad0', boots: '#141830' }),
      cw('ceremonial', 'ceremonial', { robe: '#25378a', armour: '#5070d0', trim: '#d8b850', helmet: '#3450b0', plume: '#5878d8', boots: '#141830' }),
      cw('sergeant', 'sergeant', { robe: '#1a2860', armour: '#3c58b8', trim: '#e8e8f0', helmet: '#2838a0', plume: '#4460c0', boots: '#101428' })],
    paint(ctx) {
      const { r, p, skin } = ctx;
      fillPart(r, 'body', p.robe); fillPart(r, 'arm', p.robe); fillPart(r, 'leg', p.robe);
      on(r, F, 4, 0, 8, 19, p.armour); r.bevel(F[0] + 4, F[1], 8, 19, 1.1, 0.85); on(r, F, 7, 2, 2, 14, shade(p.armour, 0.8));
      on(r, F, 3, 0, 1, 19, p.trim); on(r, F, 12, 0, 1, 19, p.trim);
      belt(r, shade(p.robe, 0.7), p.trim, 19, 2);
      band(r, 'arm', 13, 5, p.armour); band(r, 'arm', 13, 1, p.trim); gloves(r, p.boots);
      boots(r, p.boots, 16); band(r, 'leg', 0, 3, shade(p.robe, 0.85));
      // helmet painted on the head around the face opening
      fillPart(r, 'head', p.helmet, ['top', 'back', 'left', 'right', 'bottom']);
      on(r, HF, 0, 0, 16, 3, p.helmet); on(r, HF, 0, 0, 2, 16, p.helmet); on(r, HF, 14, 0, 2, 16, p.helmet); on(r, HF, 0, 2, 16, 1, p.trim);
      on(r, HT, 7, 0, 2, 16, p.plume);
      ctx.geometry.push(openHelmetGeo(p.helmet, p.trim), plumeGeo(p.plume), openRobeGeo(p.robe));
      ctx.armour = true;
    },
  },
  {
    id: 'senate_guard_late', name: 'Senate Guard (late war)', faction: 'senate_guard', role: 'guard', headgear: 'helmet', wear: CW,
    describe: 'late-war Senate Guard: blue robes and armour, plume removed, dark visor',
    colourways: [cw('guard_blue', 'guard blue', { robe: '#1f2f6c', armour: '#4666c8', trim: '#7a92e0', helmet: '#2c44a0', boots: '#141830' }),
      cw('night_watch', 'night watch', { robe: '#1a284f', armour: '#3450a8', trim: '#8090c0', helmet: '#22367c', boots: '#0e1224' })],
    paint(ctx) {
      const { r, p } = ctx;
      OUTFITS_BY_ID.senate_guard.paint({ ...ctx, p: { ...p, plume: p.helmet }, geometry: [] });
      wideVisor(r, '#0c1018', '#3c5a8a', 4, 6, 2, 12);
      ctx.geometry.push(openHelmetGeo(p.helmet, p.trim), openRobeGeo(p.robe));
      ctx.helmet = true; ctx.armour = true;
    },
  },
  {
    id: 'senate_commando', name: 'Senate Commando armour', faction: 'senate_guard', role: 'guard', headgear: 'helmet', wear: CW,
    describe: 'Senate Commando: full blue armour over a black undersuit, visored blue helmet, no robe',
    colourways: [cw('commando_blue', 'commando blue', { armour: '#2f4fb0', under: '#16181f', trim: '#7090d8', boots: '#101218' }),
      cw('captain', 'captain', { armour: '#3050b8', under: '#16181f', trim: '#e0c060', boots: '#101218' }),
      cw('worn_blue', 'field blue', { armour: '#2a44a0', under: '#1a1c22', trim: '#9aa8d8', boots: '#0e1014' })],
    paint(ctx) {
      const { r, p } = ctx;
      armourSuit(r, ctx, p.armour, p.under, p.under, p.boots);
      on(r, F, 6, 4, 4, 8, shade(p.armour, 0.85)); on(r, F, 3, 3, 1, 10, p.trim); on(r, F, 12, 3, 1, 10, p.trim);
      helmetBase(r, p.armour); wideVisor(r, '#0a0c12', '#4a6aa8', 5, 4, 2, 12); chinGuard(r, shade(p.armour, 0.85)); on(r, HF, 7, 9, 2, 5, shade(p.armour, 0.8));
      band(r, 'arm', 0, 2, p.trim);
      const unit = ctx.rng.int(1, 15); // squad code dots on the back plate
      for (let k = 0; k < 4; k++) if (unit & (1 << k)) px(r, B, 4 + k * 2, 16, p.trim);
      ctx.geometry.push(openHelmetGeo(p.armour, p.trim));
      ctx.helmet = true;
    },
  },
  // ================================================================= Coruscant Guard (clone shock troopers)
  {
    id: 'coruscant_guard', name: 'Coruscant Guard armour', faction: 'coruscant_guard', role: 'guard', headgear: 'helmet', wear: ALLW, armour: true, clone: true,
    describe: 'white clone trooper armour with dark scarlet Coruscant Guard markings: dome fin, brow band, twin chest diamonds, shoulder rings, black T-visor',
    colourways: [cw('phase2', 'Phase II', { white: '#e4e4e6', red: '#8e1a22', dark: '#1a1a1e', grey: '#7a7a80' }),
      cw('phase1', 'Phase I', { white: '#e8e8ea', red: '#96202a', dark: '#1a1a1e', grey: '#888890', phase1: true }),
      cw('shock_veteran', 'shock veteran', { white: '#dcdcde', red: '#7e141c', dark: '#16161a', grey: '#6a6a70', extraRed: true })],
    paint(ctx) { paintCoruscantGuard(ctx, false); },
  },
  {
    id: 'coruscant_guard_officer', name: 'Coruscant Guard officer', faction: 'coruscant_guard', role: 'guard', headgear: 'helmet', wear: ALLW, armour: true, clone: true,
    describe: 'Coruscant Guard officer: scarlet helmet crest, forehead stripes, pauldron and kama over the white and scarlet armour',
    colourways: [cw('commander', 'commander', { white: '#e4e4e6', red: '#8e1a22', dark: '#1a1a1e', grey: '#7a7a80', kama: true, pauldron: true }),
      cw('lieutenant', 'lieutenant', { white: '#e4e4e6', red: '#8e1a22', dark: '#1a1a1e', grey: '#7a7a80' }),
      cw('sergeant', 'sergeant', { white: '#e2e2e4', red: '#8a1820', dark: '#1a1a1e', grey: '#747478', extraRed: true })],
    paint(ctx) { paintCoruscantGuard(ctx, true); },
  },
  // ================================================================= Coruscant Security Force (civilian police)
  {
    id: 'csf_patrol', name: 'CSF patrol officer', faction: 'csf', role: 'police', headgear: 'cap', wear: CW,
    describe: 'Coruscant Security Force patrol uniform: blue-grey tunic and trousers with yellow tactical straps and belt, cap with badge',
    colourways: [cw('blue_grey', 'blue-grey / yellow', { tunic: '#4d5c7a', trous: '#3a4660', gear: '#e2b830', yoke: '#6a7a9a', boots: '#15171e' }),
      cw('navy', 'navy / grey', { tunic: '#2b3550', trous: '#232b42', gear: '#9aa0aa', yoke: '#4a5470', boots: '#15171e' }),
      cw('traffic', 'navy / white', { tunic: '#2e3856', trous: '#252d46', gear: '#e8e8ec', yoke: '#505a78', boots: '#15171e' })],
    paint(ctx) {
      const { r, p, skin } = ctx;
      uniformBase(r, skin, p.tunic, p.trous, p.boots);
      on(r, F, 0, 0, 16, 3, p.yoke); on(r, B, 0, 0, 16, 3, p.yoke); shoulderTabs(r, p.gear);
      straps(r, p.gear, 3, 2, 3, 16); belt(r, p.gear, '#3a3a3a', 19, 2); on(r, F, 1, 19, 2, 2, '#3a3a3a'); on(r, F, 13, 19, 2, 2, '#3a3a3a');
      badge(r, F, 11, 5, '#f0d060'); legStripe(r, p.gear, 3, 1);
      ctx.geometry.push(capGeo(p.trous, '#f0d060'));
      if (ctx.rank === 'sergeant') pips(r, F, 2, 6, 2, '#f0d060');
    },
  },
  {
    id: 'csf_detective', name: 'CSF detective', faction: 'csf', role: 'police', headgear: 'none', wear: CW,
    describe: 'CSF detective: long coat over a blue-grey shirt and tie, badge on the belt',
    colourways: [cw('grey_coat', 'grey coat', { coat: '#5a5a62', shirt: '#7a88a8', tie: '#2a3050', trous: '#3a3a44', boots: '#1a1a1e' }),
      cw('brown_coat', 'brown coat', { coat: '#5a4634', shirt: '#8a96b0', tie: '#3a2a20', trous: '#3a3028', boots: '#1a1612' }),
      cw('navy_coat', 'navy coat', { coat: '#2a3352', shirt: '#9aa8c0', tie: '#1a2040', trous: '#22283a', boots: '#12141c' })],
    paint(ctx) {
      const { r, p, skin } = ctx;
      jacket(r, p.coat, p.shirt, 4); trousers(r, p.trous); boots(r, p.boots); hands(r, skin);
      on(r, F, 7, 1, 2, 10, p.tie); collar(r, p.shirt, 4, 1); belt(r, '#2a2a2a', '#d8b040', 19, 2);
      band(r, 'arm', 17, 1, shade(p.coat, 0.8)); hem(r, p.coat, 3);
      ctx.geometry.push(skirtGeo(p.coat, 9, { part: 'coat_tails' }));
    },
  },
  {
    id: 'csf_riot', name: 'CSF riot gear', faction: 'csf', role: 'police', headgear: 'helmet', wear: CW, armour: true,
    describe: 'CSF riot officer: navy jumpsuit under white or grey armour plates, visored helmet',
    colourways: [cw('white_plates', 'white plates', { plates: '#d8dade', suit: '#2a3450', visor: '#182a44', mark: '#e2b830' }),
      cw('grey_plates', 'grey plates', { plates: '#8a9098', suit: '#242c44', visor: '#141c30', mark: '#e2b830' }),
      cw('yellow_marked', 'yellow marked', { plates: '#c8ccd2', suit: '#2a3450', visor: '#182a44', mark: '#f0c020', stripes: true })],
    paint(ctx) {
      const { r, p } = ctx;
      armourSuit(r, ctx, p.plates, p.suit, p.suit, '#15171e');
      if (p.stripes) { on(r, F, 2, 6, 12, 2, p.mark); on(r, B, 2, 6, 12, 2, p.mark); } else badge(r, F, 11, 4, p.mark);
      helmetBase(r, p.plates); wideVisor(r, p.visor, '#6a9ad0', 4, 6, 1, 14); chinGuard(r, shade(p.plates, 0.85));
      ctx.geometry.push(visorGeo(p.visor));
      ctx.helmet = true;
    },
  },
  {
    id: 'gu_police_droid', name: 'GU-series police droid', faction: 'csf', role: 'police_droid', headgear: 'droid', wear: CW, droid: true,
    describe: 'GU-series police droid: grey humanoid plating, single visor slit, CSF markings on the chest',
    colourways: [cw('grey', 'grey', { body: '#6e7278', dark: '#3a3c42', mark: '#e2b830', glow: '#40d0e0' }),
      cw('gunmetal', 'gunmetal', { body: '#50545c', dark: '#2a2c32', mark: '#e2b830', glow: '#40d0e0' }),
      cw('csf_blue', 'CSF blue', { body: '#5a6478', dark: '#2e3440', mark: '#f0c020', glow: '#50e0f0' })],
    paint(ctx) { paintDroidHumanoid(ctx, ctx.p.body, ctx.p.dark); const { r, p } = ctx; on(r, HF, 2, 6, 12, 2, '#101014'); on(r, HF, 4, 6, 8, 1, p.glow); on(r, HF, 3, 11, 3, 1, p.dark); on(r, HF, 10, 11, 3, 1, p.dark); on(r, F, 3, 4, 10, 2, p.mark); on(r, F, 3, 7, 10, 1, p.mark); ctx.helmet = true; },
  },
  // ================================================================= Coruscant Underworld Police
  {
    id: 'underworld_police', name: 'Underworld Police', faction: 'underworld_police', role: 'police', headgear: 'helmet', wear: WP, armour: true,
    describe: 'Coruscant Underworld Police: grey armour plates over a dark jumpsuit, wide-visor helmet, shoulder lamp',
    colourways: [cw('grey_plates', 'grey plates', { plates: '#7a7e86', suit: '#26282e', visor: '#0e1218', boots: '#141418' }),
      cw('blue_plates', 'blue-grey plates', { plates: '#6a7488', suit: '#22262e', visor: '#0e1218', boots: '#141418' }),
      cw('black', 'black', { plates: '#4a4c52', suit: '#1c1e24', visor: '#0c1014', boots: '#101014' })],
    paint(ctx) {
      const { r, p } = ctx;
      armourSuit(r, ctx, p.plates, p.suit, p.suit, p.boots);
      on(r, F, 2, 19, 3, 3, '#3a3a3a'); on(r, F, 11, 19, 3, 3, '#3a3a3a'); badge(r, F, 3, 4, '#c8c8d0');
      helmetBase(r, p.plates); wideVisor(r, p.visor, '#3a6a8a', 4, 5, 1, 14); on(r, HF, 3, 12, 10, 2, shade(p.plates, 0.8));
      ctx.geometry.push(lampGeo(), visorGeo(p.visor));
      ctx.helmet = true;
    },
  },
  // ================================================================= Jedi
  {
    id: 'jedi_knight', name: 'Jedi Knight robes', faction: 'jedi', role: 'jedi', headgear: 'none', wear: CW,
    describe: 'Jedi Knight: layered cream tunic, brown tabards and obi, leather belt with a lightsaber, high boots',
    colourways: [cw('brown_cream', 'brown / cream', { tunic: '#d9ccae', tabard: '#5c3f2a', obi: '#3d2a1c', trous: '#5a4a3a', boots: '#2e2018' }),
      cw('dark', 'dark', { tunic: '#7a7570', tabard: '#2c2420', obi: '#1e1814', trous: '#2a2622', boots: '#161210' }),
      cw('desert', 'desert', { tunic: '#e4d8bc', tabard: '#a08a68', obi: '#5a4838', trous: '#8a7a60', boots: '#3a2a1a' })],
    paint(ctx) { paintJedi(ctx, {}); },
  },
  {
    id: 'jedi_padawan', name: 'Jedi Padawan', faction: 'jedi', role: 'jedi', headgear: 'none', wear: CW,
    describe: 'Jedi Padawan: simple tunic and tabards with the Padawan braid',
    colourways: [cw('cream', 'cream', { tunic: '#e0d6bc', tabard: '#6c4e36', obi: '#3d2a1c', trous: '#6a5a48', boots: '#2e2018' }),
      cw('grey', 'grey', { tunic: '#b8b4aa', tabard: '#4a4038', obi: '#2a2420', trous: '#4a4640', boots: '#1e1a16' }),
      cw('tan', 'tan', { tunic: '#d8c8a8', tabard: '#8a6a48', obi: '#4a3828', trous: '#7a6a50', boots: '#332418' })],
    paint(ctx) { paintJedi(ctx, { padawan: true }); },
  },
  {
    id: 'jedi_master', name: 'Jedi Master cloak', faction: 'jedi', role: 'jedi', headgear: 'hood', wear: CW,
    describe: 'Jedi Master: long hooded brown cloak over the layered robes',
    colourways: [cw('brown', 'brown cloak', { tunic: '#d9ccae', tabard: '#5c3f2a', obi: '#3d2a1c', trous: '#5a4a3a', boots: '#2e2018', cloak: '#4a3626' }),
      cw('black', 'black cloak', { tunic: '#c8c0b0', tabard: '#3a2c24', obi: '#1e1814', trous: '#3a3630', boots: '#161210', cloak: '#1e1a18' }),
      cw('grey', 'grey cloak', { tunic: '#e0d8c8', tabard: '#6a5a4a', obi: '#3a2c20', trous: '#5a5048', boots: '#2a2018', cloak: '#6a625a' })],
    paint(ctx) { paintJedi(ctx, { master: true }); },
  },
  {
    id: 'temple_guard', name: 'Jedi Temple Guard', faction: 'jedi', role: 'temple_guard', headgear: 'mask', wear: CW,
    describe: 'Jedi Temple Guard: gold and tan layered robes, hood, featureless mask, yellow lightsaber pike',
    colourways: [cw('gold', 'gold', { robe: '#c9a648', inner: '#e4d6a8', hood: '#b89440', mask: '#dccb92', boots: '#3a2a18' }),
      cw('tan', 'tan', { robe: '#b8985a', inner: '#e8dcc0', hood: '#a8884a', mask: '#e0d2a8', boots: '#3a2a18' }),
      cw('sentinel', 'sentinel', { robe: '#a88838', inner: '#d8c890', hood: '#8a6c2a', mask: '#d0bc80', boots: '#2a1e12' })],
    paint(ctx) {
      const { r, p } = ctx;
      fillPart(r, 'body', p.robe); fillPart(r, 'arm', p.robe); fillPart(r, 'leg', p.robe); boots(r, p.boots, 19);
      on(r, F, 5, 0, 6, 18, p.inner); on(r, F, 4, 0, 1, 18, shade(p.robe, 0.8)); on(r, F, 11, 0, 1, 18, shade(p.robe, 0.8)); belt(r, shade(p.robe, 0.7), p.inner, 18, 2);
      gloves(r, p.hood, 16);
      fillPart(r, 'head', p.hood); on(r, HF, 2, 2, 12, 13, p.mask); r.bevel(HF[0] + 2, HF[1] + 2, 12, 13, 1.08, 0.88);
      on(r, HF, 5, 6, 1, 6, shade(p.mask, 0.85)); on(r, HF, 10, 6, 1, 6, shade(p.mask, 0.85)); on(r, HF, 6, 11, 4, 1, shade(p.mask, 0.85));
      ctx.geometry.push(pikeGeo(), capeGeo(p.robe, 18));
      ctx.overlays.push(hoodUpOverlay(p.hood));
      ctx.helmet = true;
    },
  },
  // ================================================================= Senators (six planetary styles)
  {
    id: 'senator_naboo', name: 'Naboo senatorial gown', faction: 'senate', role: 'senator', headgear: 'headdress', wear: CW,
    describe: 'Naboo-style senatorial gown with gold embroidery, wide sleeves and a tall arched headdress',
    colourways: [cw('crimson_gold', 'crimson / gold', { gown: '#7a1c2c', embroider: '#d8b050', head: '#d8b050', jewel: '#e04040' }),
      cw('violet_silver', 'violet / silver', { gown: '#4a2a6a', embroider: '#c8c8d8', head: '#c8c8d8', jewel: '#8a60d0' }),
      cw('forest_gold', 'forest / gold', { gown: '#22503a', embroider: '#d0a840', head: '#d0a840', jewel: '#40c080' })],
    paint(ctx) {
      const { r, p, skin } = ctx;
      fillPart(r, 'body', p.gown); fillPart(r, 'arm', p.gown); fillPart(r, 'leg', p.gown);
      for (let y = 2; y < 22; y += 4) { on(r, F, 4, y, 8, 1, p.embroider); px(r, F, 7, y + 2, p.embroider); px(r, F, 8, y + 2, p.embroider); }
      band(r, 'leg', 22, 2, p.embroider); band(r, 'arm', 20, 2, p.embroider); collar(r, p.embroider, 6, 2); hands(r, skin); band(r, 'arm', 18, 2, p.gown);
      fillPart(r, 'head', p.head, ['top']); on(r, HB, 0, 0, 16, 6, p.head); on(r, HR, 0, 0, 16, 3, p.head); on(r, HL, 0, 0, 16, 3, p.head); on(r, HF, 0, 0, 16, 2, p.head);
      ctx.geometry.push(headdressGeo(p.head, p.jewel), skirtGeo(p.gown, 10, { part: 'gown_skirt' }));
    },
  },
  {
    id: 'senator_alderaan', name: 'Alderaanian gown', faction: 'senate', role: 'senator', headgear: 'none', wear: CW,
    describe: 'Alderaan-style flowing gown in pale silver-white with a blue sash and silver hem',
    colourways: [cw('white_blue', 'white / blue', { gown: '#e6e8ec', sash: '#4a6ab0', trim: '#b8bcc8' }),
      cw('ivory_silver', 'ivory / silver', { gown: '#ece4d4', sash: '#8a8aa0', trim: '#c8c0b0' }),
      cw('pale_blue', 'pale blue', { gown: '#c8d8ee', sash: '#2a4a90', trim: '#a0b0d0' })],
    paint(ctx) {
      const { r, p, skin } = ctx;
      fillPart(r, 'body', p.gown); fillPart(r, 'arm', p.gown); fillPart(r, 'leg', p.gown);
      for (let y = 0; y < 16; y++) on(r, F, 3 + (y * 9 / 16 | 0), y, 3, 1, p.sash);
      band(r, 'leg', 21, 3, p.trim); band(r, 'arm', 21, 3, p.gown); hands(r, skin); band(r, 'arm', 20, 4, p.gown); band(r, 'arm', 22, 2, p.trim); collar(r, p.trim, 6, 1);
      ctx.geometry.push(skirtGeo(p.gown, 11, { part: 'gown_skirt' }));
    },
  },
  {
    id: 'senator_chandrila', name: 'Chandrilan robe', faction: 'senate', role: 'senator', headgear: 'none', wear: CW,
    describe: 'Chandrilan senator: a simple plain robe with a white inner collar and a corded belt',
    colourways: [cw('sky', 'sky blue', { robe: '#6f8fa8', inner: '#eaeaea', cord: '#3a4a58' }), cw('sage', 'sage', { robe: '#7a9a78', inner: '#f0eee0', cord: '#3a4a38' }), cw('dove', 'dove grey', { robe: '#8a8a94', inner: '#f0f0f4', cord: '#404048' })],
    paint(ctx) { const { r, p, skin } = ctx; fillPart(r, 'body', p.robe); fillPart(r, 'arm', p.robe); fillPart(r, 'leg', p.robe); hands(r, skin); vNeck(r, p.inner, 4); belt(r, p.cord, null, 18, 1); boots(r, shade(p.robe, 0.6), 21); px(r, F, 8, 5, '#d8c890'); ctx.geometry.push(skirtGeo(p.robe, 8, { part: 'robe_skirt' })); },
  },
  {
    id: 'senator_corellia', name: 'Corellian formal jacket', faction: 'senate', role: 'senator', headgear: 'none', wear: CW,
    describe: 'Corellian formal jacket with gold epaulettes and double buttons, bloodstripe trousers, high boots',
    colourways: [cw('black_gold', 'black / gold', { jacket: '#1e2224', trous: '#2a2e32', stripe: '#d0a030', trim: '#d8b050', boots: '#141414' }),
      cw('green_gold', 'green / gold', { jacket: '#1f2e26', trous: '#242c28', stripe: '#d0a030', trim: '#d8b050', boots: '#141414' }),
      cw('navy_red', 'navy / red', { jacket: '#1e2640', trous: '#22283a', stripe: '#c02030', trim: '#c8c8d0', boots: '#141414' })],
    paint(ctx) { const { r, p, skin } = ctx; shirt(r, p.jacket); trousers(r, p.trous); boots(r, p.boots, 15); hands(r, skin); doubleButtons(r, p.trim, 4, 4, 3); shoulderTabs(r, p.trim); collar(r, p.trim, 6, 1); legStripe(r, p.stripe, 3, 1); belt(r, shade(p.jacket, 0.7), p.trim, 19, 1); },
  },
  {
    id: 'senator_rodia', name: 'Rodian trader sash', faction: 'senate', role: 'senator', headgear: 'none', wear: CW, species: ['rodian'],
    describe: 'Rodian senator: beige tunic with a wide jewelled trader sash and beaded cuffs',
    colourways: [cw('purple_gold', 'purple / gold', { tunic: '#c8b48a', sash: '#4a2a6a', bead: '#e0b040' }), cw('teal_gold', 'teal / gold', { tunic: '#d0c090', sash: '#1f5a5a', bead: '#e0b040' }), cw('red_gold', 'red / gold', { tunic: '#c0b090', sash: '#7a1e28', bead: '#e8c060' })],
    paint(ctx) { const { r, p, skin } = ctx; shirt(r, p.tunic); trousers(r, shade(p.tunic, 0.7)); boots(r, '#3a2a1a'); hands(r, skin); for (let y = 0; y < 20; y++) on(r, F, 2 + (y * 10 / 20 | 0), y, 4, 1, p.sash); for (let y = 1; y < 20; y += 3) px(r, F, 3 + (y * 10 / 20 | 0), y, p.bead); band(r, 'arm', 16, 2, p.bead); belt(r, p.sash, p.bead, 19, 2); ctx.geometry.push(skirtGeo(p.tunic, 6, { part: 'tunic_skirt', sides: false })); },
  },
  {
    id: 'senator_mon_cala', name: 'Mon Cala admiral-cut', faction: 'senate', role: 'senator', headgear: 'none', wear: CW, species: ['mon_calamari'],
    describe: 'Mon Cala senator: white admiral-cut uniform with a high collar, rank cylinders and a dark blue half-cape',
    colourways: [cw('white_blue', 'white / blue', { uni: '#e6e8ea', cape: '#1f3a6a', trim: '#8aa0c8' }), cw('cream_navy', 'cream / navy', { uni: '#ece6d6', cape: '#1a2a4a', trim: '#b0a890' }), cw('white_teal', 'white / teal', { uni: '#e8ecee', cape: '#1e5a60', trim: '#7ab0b8' })],
    paint(ctx) { const { r, p, skin } = ctx; shirt(r, p.uni); trousers(r, p.uni); boots(r, '#e0e0e4', 18, '#909098'); hands(r, skin); collar(r, p.trim, 8, 2); on(r, F, 2, 3, 3, 1, p.trim); on(r, F, 2, 5, 3, 1, p.trim); belt(r, p.cape, p.trim, 19, 2); on(r, F, 11, 3, 1, 3, '#c0c0c8'); on(r, F, 13, 3, 1, 3, '#c0c0c8'); ctx.geometry.push(capeGeo(p.cape, 14)); },
  },
  // ================================================================= Republic administration
  {
    id: 'senate_aide', name: 'Senate aide tunic', faction: 'senate', role: 'aide', headgear: 'none', wear: CW,
    describe: 'Senate aide: grey knee-length tunic with a Republic cog, datapad in hand',
    colourways: [cw('slate', 'slate', { tunic: '#6a6e78', trous: '#3a3c44', trim: '#a0a4b0' }), cw('warm_grey', 'warm grey', { tunic: '#7a7470', trous: '#3e3a38', trim: '#b0a8a0' }), cw('charcoal', 'charcoal', { tunic: '#4a4c52', trous: '#2a2c30', trim: '#8a8c94' }), cw('blue_grey', 'blue-grey', { tunic: '#5c6a80', trous: '#303846', trim: '#98a4b8' })],
    paint(ctx) { const { r, p, skin } = ctx; shirt(r, p.tunic); trousers(r, p.trous); boots(r, '#1e1e22', 20); hands(r, skin); collar(r, p.trim, 4, 1); belt(r, shade(p.tunic, 0.75), null, 18, 1); hem(r, p.tunic, 4); cog(r, F, 10, 4, '#b82830', '#e8c060'); ctx.geometry.push(datapadGeo()); },
  },
  {
    id: 'chancellor_staff', name: "Chancellor's staff robes", faction: 'senate', role: 'aide', headgear: 'none', wear: CW,
    describe: "Chancellor's office staff: dark red robes with black trim and a gold pin",
    colourways: [cw('crimson', 'crimson', { robe: '#5a1e22', trim: '#1a1214', pin: '#e0b040' }), cw('oxblood', 'oxblood', { robe: '#4a1a1e', trim: '#221618', pin: '#d8b050' }), cw('maroon_gold', 'maroon / gold', { robe: '#6a2430', trim: '#2a1a1c', pin: '#f0d060' })],
    paint(ctx) { const { r, p, skin } = ctx; fillPart(r, 'body', p.robe); fillPart(r, 'arm', p.robe); fillPart(r, 'leg', p.robe); hands(r, skin); collar(r, p.trim, 8, 2); on(r, F, 7, 2, 2, 17, p.trim); boots(r, p.trim, 20); badge(r, F, 10, 4, p.pin); band(r, 'arm', 16, 2, p.trim); ctx.geometry.push(skirtGeo(p.robe, 9, { part: 'robe_skirt' })); },
  },
  {
    id: 'customs_inspector', name: 'Customs inspector', faction: 'senate', role: 'customs', headgear: 'cap', wear: CW,
    describe: 'spaceport customs inspector: grey-blue uniform tunic, white collar band, shoulder cord and peaked cap',
    colourways: [cw('grey_blue', 'grey-blue', { tunic: '#5a6478', trous: '#3a4050', cord: '#e8e8e8', boots: '#1a1a1e' }), cw('grey_green', 'grey-green', { tunic: '#5a6a5c', trous: '#3a4238', cord: '#e0d8a0', boots: '#1a1a1e' }), cw('dark_grey', 'dark grey', { tunic: '#484c56', trous: '#2a2c34', cord: '#d8b040', boots: '#141418' })],
    paint(ctx) { const { r, p, skin } = ctx; uniformBase(r, skin, p.tunic, p.trous, p.boots); collar(r, '#f0f0f0', 6, 1); on(r, F, 1, 1, 2, 8, p.cord); badge(r, F, 11, 4, '#d8d8e0'); belt(r, '#2a2a2e', '#c0c0c8', 19, 2); ctx.geometry.push(peakedCapGeo(p.tunic, p.cord), datapadGeo()); },
  },
  // ================================================================= media, medical, spaceport trades
  {
    id: 'journalist', name: 'Journalist', faction: 'media', role: 'journalist', headgear: 'none', wear: CW,
    describe: 'holonet journalist: field jacket with a press band, shoulder holocam',
    colourways: [cw('tan', 'tan', { jacket: '#a8956e', shirt: '#e8e4d8', trous: '#3a3a40', press: '#e8e8e8' }), cw('olive', 'olive', { jacket: '#5a6a48', shirt: '#d8d8d0', trous: '#2e2e34', press: '#e8e8e8' }), cw('black', 'black', { jacket: '#26262a', shirt: '#c8c8d0', trous: '#1e1e24', press: '#f0f0f0' })],
    paint(ctx) { const { r, p, skin } = ctx; jacket(r, p.jacket, p.shirt, 4); trousers(r, p.trous); boots(r, '#1a1a1e'); hands(r, skin); armStripe(r, p.press, 6, 2); band(r, 'arm', 6, 2, '#c02030', ['front']); on(r, F, 2, 14, 4, 3, shade(p.jacket, 0.8)); on(r, F, 10, 14, 4, 3, shade(p.jacket, 0.8)); ctx.geometry.push(holocamGeo()); },
  },
  {
    id: 'medic', name: 'Medic', faction: 'medical', role: 'medic', headgear: 'none', wear: CW,
    describe: 'clinic medic: white tunic and trousers, red medical armband with a white cross, red chest symbol',
    colourways: [cw('white', 'white', { tunic: '#eef0f0', trous: '#dcdee0', band: '#c02030' }), cw('pale_green', 'scrubs green', { tunic: '#8fc0a8', trous: '#7aa890', band: '#c02030' }), cw('white_blue', 'white / blue', { tunic: '#eef0f4', trous: '#4a6a9a', band: '#c02030' })],
    paint(ctx) { const { r, p, skin } = ctx; uniformBase(r, skin, p.tunic, p.trous, '#e8e8ec'); armStripe(r, p.band, 5, 3); band(r, 'arm', 6, 1, '#ffffff', ['front']); px(r, REG.armFront, 3, 5, '#ffffff'); px(r, REG.armFront, 3, 7, '#ffffff'); cross(r, F, 10, 4, p.band); collar(r, shade(p.tunic, 0.9), 6, 1); pockets(r, shade(p.tunic, 0.92), 14); },
  },
  {
    id: 'patient_gown', name: 'Patient gown', faction: 'medical', role: 'patient', headgear: 'none', wear: CW,
    describe: 'clinic patient in a pale sleeveless gown with a wrist ID band',
    colourways: [cw('mint', 'mint', { gown: '#a8c8c0', band: '#ffffff' }), cw('pale_blue', 'pale blue', { gown: '#a8bcd8', band: '#ffffff' }), cw('lavender', 'lavender', { gown: '#b8a8d0', band: '#ffffff' })],
    paint(ctx) { const { r, p, skin } = ctx; fillPart(r, 'body', p.gown); fillPart(r, 'arm', skin); band(r, 'arm', 0, 2, p.gown); band(r, 'leg', 0, 14, p.gown); band(r, 'leg', 14, 8, skin); boots(r, '#c8c8c8', 22); band(r, 'arm', 16, 1, p.band); for (let y = 2; y < 22; y += 5) px(r, F, 7, y, shade(p.gown, 0.85)); },
  },
  {
    id: 'pilot', name: 'Pilot flight suit', faction: 'spaceport', role: 'pilot', headgear: 'none', wear: CW,
    describe: 'pilot flight suit with chest box and harness straps, helmet carried under the arm',
    colourways: [cw('orange', 'orange', { suit: '#d8702a', box: '#c8c8cc', strap: '#3a3a3a', helmet: '#e8e8e8', stripe: '#d8702a' }), cw('olive', 'olive', { suit: '#6a7048', box: '#b8b8b8', strap: '#2a2a2a', helmet: '#d8d8d0', stripe: '#6a7048' }), cw('republic_grey', 'Republic grey', { suit: '#7a7e86', box: '#c8c8cc', strap: '#2a2a2a', helmet: '#e0e0e4', stripe: '#b82830' })],
    paint(ctx) { const { r, p, skin } = ctx; shirt(r, p.suit); trousers(r, p.suit); boots(r, '#1e1e22'); gloves(r, '#1e1e22'); straps(r, p.strap, 4, 1, 0, 19); plate(r, F, 4, 4, 8, 7, p.box); px(r, F, 5, 5, '#e04040'); px(r, F, 7, 5, '#40c040'); px(r, F, 9, 5, '#4060e0'); belt(r, p.strap, '#a0a0a0', 19, 2); kneePads(r, shade(p.suit, 0.8)); ctx.geometry.push(helmetCarriedGeo(p.helmet, p.stripe)); },
  },
  {
    id: 'mechanic', name: 'Mechanic coveralls', faction: 'trades', role: 'mechanic', headgear: 'goggles', wear: WP,
    describe: 'mechanic in coveralls with knee and elbow patches, tool belt, goggles pushed up on the forehead',
    colourways: [cw('grey_blue', 'grey-blue', { suit: '#5a6a78', patch: '#3e4a56', belt: '#5a3a20' }), cw('olive', 'olive', { suit: '#6a6e48', patch: '#4a4e30', belt: '#5a3a20' }), cw('rust', 'rust', { suit: '#8a4a30', patch: '#5e3220', belt: '#3a2a18' }), cw('yellow_hazard', 'hazard yellow', { suit: '#c8a020', patch: '#8a6a10', belt: '#3a2a18' })],
    paint(ctx) { const { r, p, skin } = ctx; shirt(r, p.suit); trousers(r, p.suit); boots(r, '#2a2018'); hands(r, skin); kneePads(r, p.patch); elbowPads(r, p.patch); pockets(r, p.patch, 13); belt(r, p.belt, '#c0c0c0', 19, 2); px(r, F, 2, 19, '#c8c8c8'); px(r, F, 13, 20, '#c8c8c8'); on(r, F, 7, 0, 2, 19, shade(p.suit, 0.85)); if (ctx.sp.headgear !== 'none') { on(r, HF, 0, 1, 16, 1, '#3a3a3a'); ctx.geometry.push(goggleGeo()); } },
  },
  {
    id: 'dock_worker', name: 'Dock worker', faction: 'spaceport', role: 'dock_worker', headgear: 'cap', wear: WP,
    describe: 'dock worker: hi-vis vest with reflective bands over a work shirt, gloves, hard hat',
    colourways: [cw('orange_vest', 'orange vest', { vest: '#e8a020', shirt: '#6a6a70', trous: '#3a3a44', hat: '#e8c020' }), cw('yellow_vest', 'yellow vest', { vest: '#e0d020', shirt: '#5a5a60', trous: '#3a3a44', hat: '#e8e8e8' }), cw('blue_vest', 'blue vest', { vest: '#3a6ad0', shirt: '#7a7a70', trous: '#3a3a44', hat: '#e8a020' })],
    paint(ctx) { const { r, p } = ctx; shirt(r, p.shirt); trousers(r, p.trous); boots(r, '#2a2018'); gloves(r, '#2a2a2a'); vest(r, p.vest, p.shirt); band(r, 'body', 6, 1, '#d8d8d8'); band(r, 'body', 12, 1, '#d8d8d8'); on(r, F, 5, 6, 6, 1, p.shirt); on(r, F, 5, 12, 6, 1, p.shirt); ctx.geometry.push(hardHatGeo(p.hat)); },
  },
  {
    id: 'cook', name: 'Cook', faction: 'food', role: 'cook', headgear: 'cap', wear: CW,
    describe: 'cook in a double-breasted jacket with an apron and cap',
    colourways: [cw('white', 'white jacket', { jacket: '#eeeeea', apron: '#d8d8d0', trous: '#2a2a2e', cap: '#f0f0ee', check: true }), cw('black_jacket', 'black jacket', { jacket: '#2a2a2e', apron: '#e8e8e0', trous: '#2a2a2e', cap: '#2a2a2e' }), cw('street_stall', 'street stall', { jacket: '#c8b898', apron: '#8a3030', trous: '#4a4a50', cap: '#8a3030' })],
    paint(ctx) { const { r, p, skin } = ctx; shirt(r, p.jacket); if (p.check) { checker(r, REG.legFront, '#2a2a2e', '#c8c8c8', 2); checker(r, REG.legBack, '#2a2a2e', '#c8c8c8', 2); checker(r, REG.legLeft, '#2a2a2e', '#c8c8c8', 2); checker(r, REG.legRight, '#2a2a2e', '#c8c8c8', 2); } else trousers(r, p.trous); boots(r, '#1e1e22'); hands(r, skin); band(r, 'arm', 12, 12, skin); doubleButtons(r, shade(p.jacket, 0.7), 3, 4, 3); apron(r, p.apron, 9); ctx.geometry.push(toqueGeo(p.cap)); },
  },
  {
    id: 'bartender', name: 'Bartender', faction: 'food', role: 'bartender', headgear: 'none', wear: CW,
    describe: 'cantina bartender: white shirt with rolled sleeves under a dark vest, towel at the belt',
    colourways: [cw('black_vest', 'black vest', { vest: '#1e1e22', shirt: '#f0ece0', trous: '#1e1e22' }), cw('burgundy_vest', 'burgundy vest', { vest: '#5a1e2a', shirt: '#f0ece0', trous: '#2a2226' }), cw('green_vest', 'green vest', { vest: '#24402c', shirt: '#e8e4d8', trous: '#22262a' })],
    paint(ctx) { const { r, p, skin } = ctx; shirt(r, p.shirt); trousers(r, p.trous); boots(r, '#141416'); hands(r, skin); band(r, 'arm', 11, 13, skin); vest(r, p.vest, p.shirt); on(r, F, 7, 0, 2, 2, '#1a1a1a'); belt(r, '#2a2018', '#c8a040', 19, 2); on(r, REG.bodyLeft, 1, 17, 5, 6, '#f0f0f0'); },
  },
  {
    id: 'vendor', name: 'Market vendor', faction: 'business', role: 'vendor', headgear: 'none', wear: CW,
    describe: 'market vendor: apron over street clothes, rolled sleeves, coin pouch',
    colourways: [cw('leather', 'leather apron', { apron: '#6a4a30', shirt: '#7a8aa0', trous: '#3a3a40' }), cw('canvas_blue', 'blue canvas', { apron: '#3a5a8a', shirt: '#c8b890', trous: '#4a4038' }), cw('red_stall', 'red stall', { apron: '#8a2a2a', shirt: '#d8d0b8', trous: '#3a3a40' }), cw('green', 'green', { apron: '#3a6a3a', shirt: '#e0d8c0', trous: '#4a4a4a' })],
    paint(ctx) { const { r, p, skin } = ctx; shirt(r, p.shirt); trousers(r, p.trous); boots(r, '#2a2018'); hands(r, skin); band(r, 'arm', 12, 12, skin); apron(r, p.apron, 7); on(r, F, 3, 15, 4, 3, shade(p.apron, 0.85)); on(r, F, 9, 15, 4, 3, shade(p.apron, 0.85)); on(r, REG.bodyRight, 2, 18, 3, 3, '#5a4020'); },
  },
  // ================================================================= civilians
  {
    id: 'office_worker', name: 'Office worker', faction: 'business', role: 'office_worker', headgear: 'none', wear: CW,
    describe: 'office worker: fitted tunic over trousers with a white inner collar',
    colourways: [cw('slate_blue', 'slate blue', { tunic: '#4a5a7a', trous: '#3a3c44', inner: '#f0f0f0' }), cw('charcoal', 'charcoal', { tunic: '#3a3c42', trous: '#2a2a30', inner: '#e8e8e8' }), cw('taupe', 'taupe', { tunic: '#8a7a6a', trous: '#3e3830', inner: '#f0ece0' }), cw('teal', 'teal', { tunic: '#2e6a6a', trous: '#2a3438', inner: '#e8f0f0' })],
    paint(ctx) { const { r, p, skin } = ctx; shirt(r, p.tunic); trousers(r, p.trous); boots(r, '#1e1e22', 21); hands(r, skin); collar(r, p.inner, 4, 2); on(r, F, 7, 2, 2, 15, shade(p.tunic, 0.88)); belt(r, shade(p.tunic, 0.7), null, 18, 1); px(r, F, 11, 4, '#7ad0ff'); },
  },
  {
    id: 'casual_tunic', name: 'Casual tunic', faction: 'residents', role: 'resident', headgear: 'none', wear: ALLW,
    describe: 'loose belted tunic and plain trousers',
    colourways: [cw('rust', 'rust', { tunic: '#9a5a3a', trous: '#4a4038', belt: '#3a2a1a' }), cw('sage', 'sage', { tunic: '#7a9a70', trous: '#3a3a3a', belt: '#3a2a1a' }), cw('slate', 'slate', { tunic: '#56607a', trous: '#34343e', belt: '#26262c' }), cw('plum', 'plum', { tunic: '#6a3a5a', trous: '#3a3038', belt: '#2a1a20' })],
    paint(ctx) { const { r, p, skin } = ctx; shirt(r, p.tunic); trousers(r, p.trous); boots(r, '#2a2018', 20); hands(r, skin); belt(r, p.belt, null, 17, 1); hem(r, p.tunic, 3); vNeck(r, skin, 2); },
  },
  {
    id: 'casual_jacket', name: 'Casual jacket', faction: 'residents', role: 'resident', headgear: 'none', wear: ALLW,
    describe: 'short jacket over a shirt, trousers',
    colourways: [cw('brown', 'brown', { jacket: '#5a4030', shirt: '#c8c8c0', trous: '#3a3a44' }), cw('grey', 'grey', { jacket: '#5a5a62', shirt: '#e0d8c0', trous: '#2a2a30' }), cw('blue', 'blue', { jacket: '#2e4a7a', shirt: '#e8e8e8', trous: '#3a3a3a' }), cw('black', 'black', { jacket: '#202024', shirt: '#a83a3a', trous: '#2e2e34' })],
    paint(ctx) { const { r, p, skin } = ctx; jacket(r, p.jacket, p.shirt, 4); trousers(r, p.trous); boots(r, '#1e1a16', 20); hands(r, skin); band(r, 'arm', 16, 1, shade(p.jacket, 0.8)); band(r, 'body', 15, 1, shade(p.jacket, 0.8)); },
  },
  {
    id: 'casual_dress', name: 'Casual dress', faction: 'residents', role: 'resident', headgear: 'none', wear: CW,
    describe: 'simple dress with a patterned band and a skirt',
    colourways: [cw('teal', 'teal', { dress: '#2e7a80', band: '#e0c060', shoes: '#2a2a2a' }), cw('coral', 'coral', { dress: '#d0605a', band: '#f0e0c0', shoes: '#3a2a2a' }), cw('mustard', 'mustard', { dress: '#c8a030', band: '#3a3a4a', shoes: '#2a2a2a' }), cw('lilac', 'lilac', { dress: '#9a80c0', band: '#f0f0f0', shoes: '#3a3040' })],
    paint(ctx) { const { r, p, skin } = ctx; fillPart(r, 'body', p.dress); fillPart(r, 'arm', skin); band(r, 'arm', 0, 4, p.dress); band(r, 'leg', 0, 12, p.dress); band(r, 'leg', 12, 10, skin); boots(r, p.shoes, 22); for (let x = 0; x < 16; x += 2) px(r, F, x, 12, p.band); band(r, 'body', 12, 1, p.band, ['back', 'left', 'right']); collar(r, p.band, 4, 1); ctx.geometry.push(skirtGeo(p.dress, 6, { part: 'dress_skirt' })); },
  },
  {
    id: 'casual_layered', name: 'Layered casual', faction: 'residents', role: 'resident', headgear: 'none', wear: ALLW,
    describe: 'vest over a long-sleeved shirt with a scarf',
    colourways: [cw('earth', 'earth', { vest: '#6a5a40', shirt: '#b8a888', scarf: '#8a3a2a', trous: '#3a3630' }), cw('cool', 'cool', { vest: '#3a4a6a', shirt: '#c8d0d8', scarf: '#e0e0e0', trous: '#2a2e3a' }), cw('warm', 'warm', { vest: '#7a3a2a', shirt: '#e8d8b8', scarf: '#d8a040', trous: '#3a3030' })],
    paint(ctx) { const { r, p, skin } = ctx; shirt(r, p.shirt); trousers(r, p.trous); boots(r, '#1e1a16', 20); hands(r, skin); vest(r, p.vest, p.shirt); band(r, 'body', 0, 2, p.scarf); on(r, F, 5, 2, 3, 6, p.scarf); },
  },
  {
    id: 'casual_workwear', name: 'Workwear', faction: 'residents', role: 'resident', headgear: 'none', wear: WP,
    describe: 'hard-wearing shirt with cargo trousers and suspenders',
    colourways: [cw('khaki', 'khaki', { shirt: '#a89870', trous: '#5a5a48', susp: '#3a2a1a' }), cw('denim', 'denim', { shirt: '#6a7a9a', trous: '#3a4a6a', susp: '#2a2a2a' }), cw('olive', 'olive', { shirt: '#7a8060', trous: '#4a4a38', susp: '#3a2a1a' })],
    paint(ctx) { const { r, p, skin } = ctx; shirt(r, p.shirt); trousers(r, p.trous); boots(r, '#2a2018'); hands(r, skin); band(r, 'arm', 12, 12, skin); straps(r, p.susp, 3, 1, 0, 19); on(r, REG.legFront, 1, 8, 3, 4, shade(p.trous, 0.85)); on(r, REG.legLeft, 2, 8, 4, 4, shade(p.trous, 0.85)); belt(r, p.susp, '#a0a0a0', 19, 1); },
  },
  {
    id: 'casual_sport', name: 'Sportswear', faction: 'residents', role: 'resident', headgear: 'none', wear: CW,
    describe: 'fitted striped top with leggings and running shoes',
    colourways: [cw('red_white', 'red / white', { top: '#c03030', stripe: '#f0f0f0', legs: '#202024', shoes: '#f0f0f0' }), cw('blue_yellow', 'blue / yellow', { top: '#2a4ab0', stripe: '#e8d030', legs: '#1e1e28', shoes: '#e8d030' }), cw('black_green', 'black / green', { top: '#1e1e22', stripe: '#40c060', legs: '#2a2a2e', shoes: '#40c060' })],
    paint(ctx) { const { r, p, skin } = ctx; shirt(r, p.top); band(r, 'arm', 8, 16, skin); trousers(r, p.legs); boots(r, p.shoes, 21); band(r, 'body', 4, 1, p.stripe); band(r, 'body', 7, 1, p.stripe); legStripe(r, p.stripe, 3, 1); },
  },
  {
    id: 'tourist', name: 'Tourist', faction: 'residents', role: 'tourist', headgear: 'cap', wear: CW,
    describe: 'off-world tourist: loud patterned shirt, shorts, bucket hat and a camera on a strap',
    colourways: [cw('floral_pink', 'floral pink', { a: '#e06090', b: '#f0e8a0', shorts: '#d8d0b8', hat: '#f0e8a0' }), cw('checker_green', 'checker green', { a: '#30a060', b: '#f0f0f0', shorts: '#3a3a44', hat: '#f0f0f0', check: true }), cw('starburst_yellow', 'starburst yellow', { a: '#e8c030', b: '#3060c0', shorts: '#e8e0d0', hat: '#3060c0' })],
    paint(ctx) { const { r, p, skin, rng } = ctx; fillPart(r, 'body', p.a); fillPart(r, 'arm', p.a); if (p.check) { checker(r, F, p.a, p.b, 2); checker(r, B, p.a, p.b, 2); } else { dots(r, 'body', p.b, rng, 22); dots(r, 'arm', p.b, rng, 8); } band(r, 'arm', 8, 16, skin); band(r, 'leg', 0, 10, p.shorts); band(r, 'leg', 10, 12, skin); boots(r, '#8a6a4a', 22); ctx.geometry.push(bucketHatGeo(p.hat), cameraGeo()); },
  },
  {
    id: 'courier', name: 'Courier', faction: 'business', role: 'courier', headgear: 'cap', wear: CW,
    describe: 'neighbourhood courier: light jacket with a diagonal strap, cap, satchel, knee pads',
    colourways: [cw('red_strap', 'red strap', { jacket: '#4a4a52', strap: '#c03030', trous: '#2e2e34', cap: '#c03030' }), cw('blue', 'blue', { jacket: '#3a5a90', strap: '#e8e8e8', trous: '#2a2a30', cap: '#3a5a90' }), cw('orange_hi_vis', 'orange hi-vis', { jacket: '#e8842a', strap: '#f0f0f0', trous: '#3a3a3a', cap: '#2a2a2a' })],
    paint(ctx) { const { r, p, skin } = ctx; shirt(r, p.jacket); trousers(r, p.trous); boots(r, '#1e1a16'); hands(r, skin); for (let y = 0; y < 19; y++) px(r, F, 12 - (y * 9 / 19 | 0), y, p.strap); band(r, 'body', 3, 1, p.strap, ['back']); kneePads(r, shade(p.trous, 0.7)); band(r, 'arm', 15, 1, p.strap); ctx.geometry.push(capGeo(p.cap), satchelGeo(p.strap === '#f0f0f0' ? '#4a3a2a' : '#4a3a2a')); },
  },
  {
    id: 'undercity_jacket', name: 'Undercity jacket', faction: 'residents', role: 'resident', headgear: 'hood', wear: WP,
    describe: 'patched undercity jacket with a hood, layered scarves and worn boots',
    colourways: [cw('grey', 'grey', { jacket: '#4a4a4e', inner: '#2a2a30', trous: '#2e2a28', patch: '#6a5a4a' }), cw('brown', 'brown', { jacket: '#4a3a2c', inner: '#2a2420', trous: '#2a2a2e', patch: '#6a6a50' }), cw('oil_green', 'oil green', { jacket: '#3a4a3a', inner: '#22281f', trous: '#2a2a2a', patch: '#5a4a5a' }), cw('dark_red', 'dark red', { jacket: '#4a2a2a', inner: '#241a1a', trous: '#2a2a2a', patch: '#4a5a6a' })],
    paint(ctx) { const { r, p, skin, rng } = ctx; jacket(r, p.jacket, p.inner, 4); trousers(r, p.trous); boots(r, '#1a1612'); hands(r, skin); band(r, 'body', 0, 2, p.inner); if (rng.chance(0.5)) ctx.overlays.push(hoodUpOverlay(p.jacket)); else ctx.geometry.push(hoodDownGeo(p.jacket)); ctx.patchColours = [p.patch, shade(p.jacket, 1.4), '#5a5a5a']; },
  },
  {
    id: 'child_school', name: 'School tunic', faction: 'residents', role: 'child', headgear: 'none', wear: CW, child: true,
    describe: 'school tunic with a white collar and emblem, small satchel',
    colourways: [cw('navy', 'navy', { tunic: '#2a3a6a', trous: '#3a3a44', collar: '#f0f0f0', emblem: '#e0c060' }), cw('maroon', 'maroon', { tunic: '#6a2a3a', trous: '#3a3038', collar: '#f0f0f0', emblem: '#e0c060' }), cw('grey_green', 'grey-green', { tunic: '#4a6a5a', trous: '#3a3a3a', collar: '#f0f0f0', emblem: '#f0f0f0' })],
    paint(ctx) { const { r, p, skin } = ctx; shirt(r, p.tunic); trousers(r, p.trous); boots(r, '#1e1a16', 21); hands(r, skin); collar(r, p.collar, 6, 2); badge(r, F, 10, 4, p.emblem); belt(r, shade(p.tunic, 0.7), null, 18, 1); ctx.geometry.push(satchelGeo('#5a4a3a')); },
  },
  // ================================================================= undercity, crime, hunters, performers
  {
    id: 'black_sun_manager', name: 'Black Sun front manager', faction: 'black_sun', role: 'manager', headgear: 'none', wear: CW,
    describe: 'freight-brokerage front manager: sharp dark suit, white shirt, thin tie and a gold pin',
    colourways: [cw('black_gold', 'black / gold', { suit: '#1a1a1e', shirt: '#f0f0f0', tie: '#3a3a44', pin: '#e0b040' }), cw('charcoal_gold', 'charcoal / gold', { suit: '#2e2e34', shirt: '#e8e8ec', tie: '#5a1e2a', pin: '#e0b040' }), cw('midnight_gold', 'midnight / gold', { suit: '#1a1e30', shirt: '#eaeaf0', tie: '#101018', pin: '#e8c860' })],
    paint(ctx) { const { r, p, skin } = ctx; jacket(r, p.suit, p.shirt, 4); trousers(r, p.suit); boots(r, '#0e0e10', 21); hands(r, skin); on(r, F, 7, 1, 2, 12, p.tie); badge(r, F, 3, 4, p.pin); band(r, 'arm', 17, 1, p.shirt); },
  },
  {
    id: 'pyke_contact', name: 'Pyke contact', faction: 'pykes', role: 'contact', headgear: 'mask', wear: CW,
    describe: 'Pyke smuggling contact: long dark coat, breathing mask with tubes, gloved hands',
    colourways: [cw('green_coat', 'green coat', { coat: '#2e4a3a', inner: '#1a1a1e', mask: '#6a6a72', trous: '#22262a' }), cw('grey_coat', 'grey coat', { coat: '#4a4a52', inner: '#1a1a1e', mask: '#5a5a62', trous: '#22262a' }), cw('purple_coat', 'purple coat', { coat: '#3a2a4a', inner: '#1a1a1e', mask: '#6a6a72', trous: '#22222a' })],
    paint(ctx) { const { r, p } = ctx; jacket(r, p.coat, p.inner, 4); trousers(r, p.trous); boots(r, '#141416'); gloves(r, '#1a1a1e'); belt(r, '#1a1a1e', '#8a8a90', 19, 2); on(r, HF, 4, 9, 8, 5, p.mask); ctx.geometry.push(maskGeo(p.mask), skirtGeo(p.coat, 10, { part: 'coat_tails' })); },
  },
  {
    id: 'bounty_hunter', name: 'Bounty hunter', faction: 'hunters', role: 'bounty_hunter', headgear: 'helmet', wear: WP, armour: true,
    describe: 'bounty hunter: mismatched armour plates, one pauldron, bracers, helmet with a narrow visor and rangefinder, jetpack',
    colourways: [cw('green_grey', 'green / grey', { plates: '#4a6a4a', under: '#3a3a3a', helmet: '#5a7a5a', pauldron: '#8a3a2a', pack: '#5a5a5a' }), cw('rust_black', 'rust / black', { plates: '#7a4a30', under: '#1e1e22', helmet: '#6a4030', pauldron: '#c8a040', pack: '#3a3a3a' }), cw('blue_bone', 'blue / bone', { plates: '#3a5a8a', under: '#2a2a30', helmet: '#d8d0b8', pauldron: '#3a5a8a', pack: '#6a6a70' })],
    paint(ctx) { const { r, p } = ctx; fillPart(r, 'body', p.under); fillPart(r, 'arm', p.under); fillPart(r, 'leg', p.under); plate(r, F, 2, 3, 12, 10, p.plates); plate(r, B, 2, 3, 12, 10, p.plates); band(r, 'arm', 12, 6, '#7a7a80'); gloves(r, '#2a2a2a'); band(r, 'leg', 2, 6, p.plates, ['front', 'left', 'right']); kneePads(r, '#7a7a80'); boots(r, '#1a1a1e'); belt(r, '#3a2a1a', '#c0c0c0', 18, 3); on(r, F, 1, 18, 3, 3, '#5a4a3a'); on(r, F, 12, 18, 3, 3, '#5a4a3a'); helmetBase(r, p.helmet); wideVisor(r, '#0e1014', '#4a6a8a', 6, 2, 2, 12); on(r, HF, 3, 10, 2, 3, shade(p.helmet, 0.7)); on(r, HF, 11, 10, 2, 3, shade(p.helmet, 0.7)); ctx.geometry.push(pauldronGeo(p.pauldron), jetpackGeo(p.pack), rangefinderGeo()); ctx.helmet = true; ctx.armour = true; },
  },
  {
    id: 'performer', name: 'Opera performer', faction: 'culture', role: 'performer', headgear: 'none', wear: CW,
    describe: 'Galaxies Opera performer: sequinned stage costume with a fanned collar and stage make-up',
    colourways: [cw('gold_red', 'gold / red', { base: '#8a1a2a', sequin: '#f0d060', collar: '#e8c050' }), cw('silver_blue', 'silver / blue', { base: '#1e3a7a', sequin: '#e0e8f0', collar: '#c8d0e0' }), cw('emerald_violet', 'emerald / violet', { base: '#1e6a4a', sequin: '#c060e0', collar: '#8a40c0' })],
    paint(ctx) { const { r, p, skin, rng } = ctx; fillPart(r, 'body', p.base); fillPart(r, 'arm', p.base); fillPart(r, 'leg', p.base); dots(r, 'body', p.sequin, rng, 30); dots(r, 'arm', p.sequin, rng, 10); dots(r, 'leg', p.sequin, rng, 10); hands(r, skin); boots(r, p.sequin, 21); collar(r, p.sequin, 8, 1); ctx.geometry.push(collarFanGeo(p.collar)); },
  },
  {
    id: 'opera_patron', name: 'Opera patron', faction: 'culture', role: 'resident', headgear: 'none', wear: CW,
    describe: 'evening wear for the opera: long dark coat with a silver clasp and gloves',
    colourways: [cw('black_silver', 'black / silver', { coat: '#16161a', inner: '#e8e8ec', clasp: '#c8c8d0' }), cw('wine', 'wine', { coat: '#4a1a2a', inner: '#e8e0d0', clasp: '#e0c060' }), cw('midnight_gold', 'midnight / gold', { coat: '#141a30', inner: '#e8e8ec', clasp: '#e0c060' })],
    paint(ctx) { const { r, p } = ctx; jacket(r, p.coat, p.inner, 2); trousers(r, p.coat); boots(r, '#0e0e10', 21); gloves(r, p.coat, 16); on(r, F, 7, 6, 2, 1, p.clasp); band(r, 'arm', 21, 1, p.clasp); ctx.geometry.push(skirtGeo(p.coat, 10, { part: 'coat_tails' })); },
  },
  {
    id: 'salvage_worker', name: 'Salvage cooperative', faction: 'salvage_coop', role: 'salvage', headgear: 'goggles', wear: WP,
    describe: 'salvage cooperative worker: reflective vest over a patched jumpsuit, heavy gloves, welding goggles, cooperative gear emblem',
    colourways: [cw('rust', 'rust', { suit: '#7a4a34', vest: '#c8c020', emblem: '#40b060' }), cw('olive', 'olive', { suit: '#5a5e40', vest: '#e08020', emblem: '#40b060' }), cw('blue', 'blue', { suit: '#3a4a6a', vest: '#c8c020', emblem: '#40b060' })],
    paint(ctx) { const { r, p } = ctx; shirt(r, p.suit); trousers(r, p.suit); boots(r, '#2a2018'); gloves(r, '#4a3a2a', 16); vest(r, p.vest, p.suit); band(r, 'body', 8, 1, '#e8e8e8'); on(r, F, 5, 8, 6, 1, p.suit); cog(r, B, 6, 8, p.emblem); kneePads(r, shade(p.suit, 0.7)); belt(r, '#3a2a1a', '#a0a0a0', 19, 2); if (ctx.sp.headgear !== 'none') ctx.geometry.push(goggleGeo('#5a3a1a')); },
  },
  {
    id: 'gang_jacket', name: 'Freight gang jacket', faction: 'freight_gang', role: 'gang', headgear: 'none', wear: WP,
    describe: 'freight-level gang: matching dark leather jackets with a coloured shoulder stripe and back emblem, bandana',
    colourways: [cw('red_stripe', 'red stripe', { jacket: '#2a2226', stripe: '#c03030', trous: '#2a2a2e' }), cw('yellow_stripe', 'yellow stripe', { jacket: '#262228', stripe: '#e0c030', trous: '#2e2a2a' }), cw('green_stripe', 'green stripe', { jacket: '#242624', stripe: '#40b060', trous: '#2a2a2e' })],
    paint(ctx) { const { r, p, skin } = ctx; jacket(r, p.jacket, '#5a5a5a', 2); trousers(r, p.trous); boots(r, '#1a1612'); hands(r, skin); shoulderTabs(r, p.stripe); armStripe(r, p.stripe, 2, 1); on(r, B, 5, 6, 6, 6, p.stripe); on(r, B, 7, 4, 2, 10, p.stripe); band(r, 'head', 12, 2, p.stripe, ['back', 'left', 'right']); },
  },
  // ================================================================= droids
  {
    id: 'protocol_droid', name: 'Protocol droid', faction: 'droids', role: 'protocol_droid', headgear: 'droid', wear: CW, droid: true,
    describe: 'protocol droid: plated humanoid shell with glowing eyes, mouth grille and exposed midriff wiring',
    colourways: [cw('gold', 'gold', { body: '#c9a23a', dark: '#7a5a18', eye: '#ffe66a' }), cw('silver', 'silver', { body: '#b8bcc4', dark: '#5a5e66', eye: '#ffe66a' }), cw('bronze', 'bronze', { body: '#a8703a', dark: '#5a3a18', eye: '#ffd050' }), cw('white_red', 'white / red', { body: '#e4e4e6', dark: '#8a2a2a', eye: '#60d0ff' })],
    paint(ctx) { paintDroidHumanoid(ctx, ctx.p.body, ctx.p.dark); const { r, p } = ctx; on(r, HF, 3, 5, 3, 3, '#1a1a1a'); on(r, HF, 10, 5, 3, 3, '#1a1a1a'); on(r, HF, 4, 6, 1, 1, p.eye); on(r, HF, 11, 6, 1, 1, p.eye); on(r, HF, 6, 11, 4, 1, '#1a1a1a'); on(r, HF, 6, 12, 4, 1, shade(p.body, 0.7)); on(r, F, 4, 14, 8, 5, '#2a2a2e'); for (let x = 5; x < 11; x += 2) on(r, F, x, 15, 1, 3, ['#c02020', '#2060c0', '#e0c020'][(x >> 1) % 3]); ctx.eyeLamps = [[HF[0] + 3, HF[1] + 5, 3, 3], [HF[0] + 10, HF[1] + 5, 3, 3]]; ctx.helmet = true; },
  },
  {
    id: 'astromech', name: 'Astromech droid', faction: 'droids', role: 'astromech', headgear: 'droid', wear: CW, droid: true, model: 'astromech',
    describe: 'astromech droid: domed cylinder body on two legs with a centre foot, colour panels and a radar eye',
    colourways: [cw('blue_white', 'blue / white', { body: '#e6e6e8', panel: '#2a58c0', dark: '#2a2a30' }), cw('red_white', 'red / white', { body: '#e6e6e8', panel: '#b82a2a', dark: '#2a2a30' }), cw('green_white', 'green / white', { body: '#e2e4e0', panel: '#2a8a4a', dark: '#2a2a30' })],
    paint(ctx) { paintAstromech(ctx); },
  },
  {
    id: 'sweeper_droid', name: 'Street-sweeper droid', faction: 'droids', role: 'sweeper_droid', headgear: 'droid', wear: WP, droid: true, model: 'sweeper',
    describe: 'street-sweeper droid: low box chassis with two spinning front brushes, a sensor dome and a rear bin',
    colourways: [cw('municipal_grey', 'municipal grey', { body: '#7a7e84', dark: '#3a3c42', accent: '#e0c030' }), cw('olive', 'olive', { body: '#6a7050', dark: '#3a3c2a', accent: '#e08020' }), cw('rust_orange', 'rust orange', { body: '#b8622a', dark: '#4a2a1a', accent: '#e8e8e8' })],
    paint(ctx) { paintSweeper(ctx); },
  },
];

export const OUTFITS_BY_ID = Object.fromEntries(OUTFITS.map((o) => [o.id, o]));

// ---------------------------------------------------------------------------------------------------------------
function paintCoruscantGuard(ctx, officer) {
  const { r, p } = ctx;
  const W = p.white, R = p.red, D = p.dark, G = p.grey;
  // white armour over a black undersuit
  armourSuit(r, ctx, W, D, D, D);
  // the two vertical scarlet diamonds on the chest plate
  vDiamond(r, F, 4, 3, 10, R); vDiamond(r, F, 10, 3, 10, R);
  on(r, F, 6, 14, 4, 1, shade(W, 0.85));
  // back plate stripe and belt
  on(r, B, 7, 3, 2, 11, R); belt(r, D, G, 19, 2); on(r, F, 2, 19, 3, 2, G); on(r, F, 11, 19, 3, 2, G);
  // scarlet shoulder rings on the arm plates, red bands on the shins for veterans
  band(r, 'arm', 1, 2, R); band(r, 'arm', 4, 1, shade(W, 0.85));
  if (p.extraRed) { band(r, 'leg', 12, 2, R); band(r, 'arm', 13, 1, R); }
  band(r, 'leg', 8, 2, D); on(r, REG.legFront, 2, 10, 4, 3, shade(W, 0.9));
  // personal unit code: up to four dark tally dots on the upper arm plates (clones mark their own armour)
  const unit = ctx.rng.int(1, 15);
  for (let k = 0; k < 4; k++) if (unit & (1 << k)) px(r, REG.armBack, 1 + k * 2, 6, shade(W, 0.55));
  // helmet: white with the scarlet dome fin stripe, brow band, black T-visor, grey filters (Phase II) / plain (Phase I)
  helmetBase(r, W);
  on(r, HT, 7, 0, 2, 16, R); on(r, HF, 7, 0, 2, 3, R); on(r, HB, 7, 0, 2, 4, R);
  on(r, HF, 2, 3, 12, 2, R);
  if (officer) { for (const x of [4, 7, 10]) on(r, HF, x, 0, 2, 3, R); on(r, HF, 2, 3, 12, 2, R); }
  tVisor(r, '#0c0c10', '#3a4250', !!p.phase1);
  if (!p.phase1) { on(r, HF, 3, 12, 2, 2, G); on(r, HF, 11, 12, 2, 2, G); on(r, HF, 7, 12, 2, 2, shade(W, 0.8)); on(r, HR, 6, 6, 3, 3, G); on(r, HL, 7, 6, 3, 3, G); }
  else { on(r, HF, 5, 12, 6, 1, shade(W, 0.8)); on(r, HF, 7, 13, 2, 1, D); }
  on(r, HR, 12, 3, 2, 9, R); on(r, HL, 2, 3, 2, 9, R);
  on(r, HF, 3, 8, 3, 1, shade(W, 0.88)); on(r, HF, 10, 8, 3, 1, shade(W, 0.88));
  if (officer) {
    ctx.geometry.push(crestGeo(R));
    if (p.pauldron) ctx.geometry.push(pauldronGeo(R));
    if (p.kama) ctx.geometry.push(skirtGeo('#3a3a3e', 9, { part: 'kama', front: false }));
  } else ctx.geometry.push(finGeo(R));
  ctx.helmet = true; ctx.armour = true;
}

function paintJedi(ctx, { padawan = false, master = false }) {
  const { r, p, skin, face, sp } = ctx;
  fillPart(r, 'body', p.tunic); fillPart(r, 'arm', p.tunic); fillPart(r, 'leg', p.trous);
  // tabards down both sides of the chest, obi sash, leather belt with the lightsaber
  on(r, F, 2, 0, 4, 17, p.tabard); on(r, F, 10, 0, 4, 17, p.tabard); on(r, B, 2, 0, 4, 17, p.tabard); on(r, B, 10, 0, 4, 17, p.tabard);
  vNeck(r, shade(p.tunic, 0.88), 3); on(r, F, 6, 0, 4, 17, p.tunic); on(r, F, 7, 3, 2, 14, shade(p.tunic, 0.9));
  band(r, 'body', 15, 3, p.obi); belt(r, '#2a1c12', '#b0a898', 18, 2);
  on(r, REG.bodyLeft, 2, 17, 2, 5, '#9a9aa2'); px(r, REG.bodyLeft, 2, 17, '#e8e8f0');
  boots(r, p.boots, 14); band(r, 'leg', 14, 1, shade(p.boots, 1.3)); hands(r, skin); band(r, 'arm', 16, 2, p.tunic);
  if (padawan && sp.hair !== false) {
    const hc = ctx.hairColour || '#4b3121';
    ctx.geometry.push({ kind: 'hair', part: 'padawan_braid', attach: 'head', colour: hc, boxes: [{ x: 4.3, y: 0.6, z: 1.6, w: 1, h: 6.5, d: 1, fill: hc, paint: (rr, uv) => PAINT.bands(rr, uv.front, shade(hc, 0.7), 2, 1) }] });
  } else if (padawan) {
    ctx.geometry.push({ kind: 'hair', part: 'silka_beads', attach: 'head', boxes: [{ x: 4.3, y: 0.6, z: 1.6, w: 1, h: 6.5, d: 1, fill: '#c8c8d8', paint: (rr, uv) => PAINT.bands(rr, uv.front, '#3a5a9a', 2, 1) }] });
  }
  if (master) {
    fillPart(r, 'arm', p.cloak, ['front', 'back', 'left', 'right', 'top']); band(r, 'arm', 16, 2, p.tunic); hands(r, skin);
    fillPart(r, 'body', p.cloak, ['back', 'left', 'right', 'top']); on(r, F, 0, 0, 2, 24, p.cloak); on(r, F, 14, 0, 2, 24, p.cloak);
    ctx.geometry.push(capeGeo(p.cloak, 20));
    if (ctx.rng.chance(0.35)) ctx.overlays.push(hoodUpOverlay(p.cloak)); else ctx.geometry.push(hoodDownGeo(p.cloak));
  } else ctx.geometry.push(skirtGeo(p.tunic, 7, { part: 'tunic_skirt', sides: false }));
  void face;
}

function paintDroidHumanoid(ctx, body, dark) {
  const { r, rng } = ctx;
  fillPart(r, 'head', body); fillPart(r, 'body', body); fillPart(r, 'arm', body); fillPart(r, 'leg', body);
  for (const part of ['head', 'body', 'arm', 'leg']) noisePart(r, part, 0.05, rng, 0.3);
  // joints, seams and plating bevels
  band(r, 'arm', 9, 2, dark); band(r, 'arm', 20, 1, dark); band(r, 'leg', 10, 2, dark); band(r, 'leg', 21, 1, dark); band(r, 'body', 12, 1, dark); band(r, 'body', 22, 2, dark);
  r.bevel(F[0], F[1], 16, 12, 1.1, 0.85); r.bevel(B[0], B[1], 16, 12, 1.1, 0.85);
  r.bevel(HF[0], HF[1], 16, 16, 1.1, 0.85);
  on(r, HF, 0, 15, 16, 1, dark); band(r, 'head', 14, 1, dark, ['back', 'left', 'right']);
  fillPart(r, 'arm', dark, ['bottom']); on(r, REG.headTop, 6, 6, 4, 4, dark);
  ctx.armour = true;
}

// Non-humanoid droids: the whole canvas is a free atlas and the model is a plain box list for model.js buildBoxModel
function paintAstromech(ctx) {
  const { r, p, allocAll, parts, rng } = ctx;
  const body = p.body, panel = p.panel, dark = p.dark;
  const layout = rng.int(0, 2), serial = rng.int(0, 7); // per-unit panel layout + a serial mark on the back
  const add = (name, x, y, z, w, h, d, paint) => { const uv = allocAll(w, h, d, ['front']); const rects = Object.values(uv); for (const rect of new Set(rects)) r.rect(rect[0], rect[1], rect[2], rect[3], body); if (paint) paint(uv); parts.push({ name, x, y, z, w, h, d, uv }); };
  add('body', 0, 9, 0, 7, 10, 7, (uv) => {
    if (layout === 0) { PAINT.on(r, uv.front, 1, 1, 2, 2, panel); PAINT.on(r, uv.front, 4, 1, 2, 3, panel); PAINT.on(r, uv.front, 1, 5, 5, 1, dark); PAINT.on(r, uv.front, 1, 7, 2, 2, panel); PAINT.on(r, uv.front, 4, 7, 2, 1, dark); }
    else if (layout === 1) { PAINT.on(r, uv.front, 1, 1, 5, 2, panel); PAINT.on(r, uv.front, 1, 4, 2, 4, dark); PAINT.on(r, uv.front, 4, 4, 2, 2, panel); PAINT.on(r, uv.front, 4, 7, 2, 1, panel); }
    else { PAINT.on(r, uv.front, 1, 1, 2, 6, panel); PAINT.on(r, uv.front, 4, 1, 2, 1, dark); PAINT.on(r, uv.front, 4, 3, 2, 3, panel); PAINT.on(r, uv.front, 1, 8, 5, 1, dark); }
    PAINT.on(r, uv.left, 1, 2, uv.left[2] - 2, layout === 2 ? 5 : 3, panel);
    for (let k = 0; k < 3; k++) if (serial & (1 << k)) r.px(uv.left[0] + 1 + k * 2, uv.left[1] + 8, dark);
  });
  add('dome', 0, 15.2, 0, 7, 2.4, 7, (uv) => { PAINT.on(r, uv.front, layout === 1 ? 3 : 2, 0, 2, 2, dark); r.px(uv.front[0] + (layout === 1 ? 3 : 2), uv.front[1], '#6ad0ff'); PAINT.on(r, uv.front, layout === 2 ? 0 : 5, 1, 1, 1, panel); PAINT.on(r, uv.left, 1 + (serial & 1), 0, 2, 1, panel); });
  add('cap', 0, 17.1, 0, 5, 1.4, 5, (uv) => { PAINT.on(r, uv.top, 1, 1, 3, 3, panel); r.px(uv.top[0] + 2, uv.top[1] + 2, '#e04040'); });
  add('leg_l', -4.7, 6.5, 0, 2.4, 11, 3, (uv) => { PAINT.on(r, uv.front, 0, 2, uv.front[2], 1, panel); PAINT.on(r, uv.front, 0, 6, uv.front[2], 1, dark); });
  add('leg_r', 4.7, 6.5, 0, 2.4, 11, 3, (uv) => { PAINT.on(r, uv.front, 0, 2, uv.front[2], 1, panel); PAINT.on(r, uv.front, 0, 6, uv.front[2], 1, dark); });
  add('foot_l', -4.7, 1, 0.5, 2.4, 2, 4, (uv) => PAINT.on(r, uv.front, 0, 1, uv.front[2], 1, dark));
  add('foot_r', 4.7, 1, 0.5, 2.4, 2, 4, (uv) => PAINT.on(r, uv.front, 0, 1, uv.front[2], 1, dark));
  add('foot_c', 0, 1, 2.2, 3, 2, 3, (uv) => PAINT.on(r, uv.front, 0, 1, uv.front[2], 1, dark));
  ctx.helmet = true; ctx.modelKind = 'astromech'; ctx.height = 18.5;
}
function paintSweeper(ctx) {
  const { r, p, allocAll, parts, rng } = ctx;
  const body = p.body, dark = p.dark, acc = p.accent;
  const fleet = rng.int(0, 15), stripeY = rng.int(1, 3); // fleet number on the flank, stripe height per unit
  const add = (name, x, y, z, w, h, d, paint, fill = body) => { const uv = allocAll(w, h, d, ['front', 'top']); for (const rect of new Set(Object.values(uv))) r.rect(rect[0], rect[1], rect[2], rect[3], fill); if (paint) paint(uv); parts.push({ name, x, y, z, w, h, d, uv }); };
  add('chassis', 0, 3.6, 0, 10, 5, 12, (uv) => {
    PAINT.on(r, uv.front, 1, 1, uv.front[2] - 2, 1, acc); PAINT.on(r, uv.top, 1, 1, uv.top[2] - 2, 1, dark); PAINT.on(r, uv.top, 2, 4, uv.top[2] - 4, 4, dark); PAINT.on(r, uv.left, 0, stripeY, uv.left[2], 1, acc);
    for (let k = 0; k < 4; k++) if (fleet & (1 << k)) r.px(uv.left[0] + 2 + k * 2, uv.left[1] + 3, dark); // 4-bit fleet number as a dot code
    r.noise(uv.left[0], uv.left[1], uv.left[2], uv.left[3], 0.06, rng, 0.4);
  });
  add('dome', 0, 6.9, 3.2, 3, 1.6, 3, (uv) => { r.px(uv.front[0] + 1, uv.front[1], '#ff4040'); }, dark);
  add('bin', 0, 6.6, -4, 8, 1.2, 3.4, null, shade(body, 0.85));
  const brush = (uv) => { for (let x = 0; x < uv.front[2]; x += 2) r.vline(uv.front[0] + x, uv.front[1], uv.front[1] + uv.front[3] - 1, '#3a3a3a'); };
  add('brush_l', -3.6, 1.4, 6.6, 3, 2.6, 3, brush, '#8a7a5a');
  add('brush_r', 3.6, 1.4, 6.6, 3, 2.6, 3, brush, '#8a7a5a');
  add('wheel_l', -5.6, 1.5, -2, 1, 3, 3, null, '#1e1e22');
  add('wheel_r', 5.6, 1.5, -2, 1, 3, 3, null, '#1e1e22');
  add('lamp', 0, 4.4, 6.2, 2, 1, 0.8, null, acc);
  ctx.helmet = true; ctx.modelKind = 'sweeper'; ctx.height = 8;
}
