// Material families for the whole boat. Owner: materials agent.
// Every mesh in the project uses a material from here (or a display material built
// with helpers from here). Families differ in roughness/metalness/normal response,
// not just color. Wear is driven by a global wear factor (used=1, clean=0.25).

import * as THREE from 'three';
import {
  makeCanvas, fillBase, mottle, streaks, splotches, scratches, speckle,
  edgeGrime, paintChips, stencilText, normalFromHeight, fbmField, fieldToCanvas,
  canvasTexture,
} from './textures.js';

export const PALETTE = {
  hullWhite: '#cfc9b8',
  hullGray: '#9aa09c',
  navalGreen: '#6f7d6d',
  darkSteel: '#3a3d42',
  gunmetal: '#2e3134',
  machineBlue: '#4e5c66',
  safetyOrange: '#b4602f',
  hazardYellow: '#b99a45',
  functionalRed: '#8e3030',
  rubber: '#26272a',
  oiledSteel: '#43454a',
  antiSlip: '#33352f',
  instGreen: '#79c98d',
  instAmber: '#d8a04c',
  instCyan: '#6fb3c8',
  warmLight: '#ffd9a3',
  coolLight: '#a8c4d0',
  waterNear: '#0a2e33',
  waterFar: '#041418',
};

let WEAR = 1.0;
const materialCache = new Map();
const regenFns = [];

export function setWear(w) {
  if (Math.abs(w - WEAR) < 1e-3) return;
  WEAR = w;
  for (const fn of regenFns) fn();
}
export function getWear() { return WEAR; }

function aWear(a) { return a * WEAR; } // scale alpha-ish amounts by wear

// -- shared micro normal maps (wear independent) -----------------------------
let _paintNormal, _brushNormal, _castNormal, _fabricNormal, _rubberNormal, _plateNormal;

function paintNormal() {
  if (_paintNormal) return _paintNormal;
  const f = fbmField(256, 256, 48, 2, 'paint-orangepeel');
  const h = fieldToCanvas(f, 256, 256, (v) => 0.5 + (v - 0.5) * 0.8);
  _paintNormal = canvasTexture(normalFromHeight(h, 1.2), { repeatX: 4, repeatY: 4 });
  return _paintNormal;
}
function brushNormal() {
  if (_brushNormal) return _brushNormal;
  const c = makeCanvas(256, 256); const ctx = c.getContext('2d');
  fillBase(ctx, '#808080');
  const f = fbmField(256, 8, 64, 2, 'brush');
  const img = ctx.getImageData(0, 0, 256, 256); const d = img.data;
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const v = 108 + f[(y % 8) * 256 + x] * 40 + (f[((y * 7) % 8) * 256 + ((x * 3 + y) % 256)] - 0.5) * 26;
    const p = (y * 256 + x) * 4; d[p] = d[p + 1] = d[p + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  _brushNormal = canvasTexture(normalFromHeight(c, 0.7), { repeatX: 2, repeatY: 2 });
  return _brushNormal;
}
function castNormal() {
  if (_castNormal) return _castNormal;
  const f = fbmField(256, 256, 14, 4, 'casting');
  const h = fieldToCanvas(f, 256, 256, (v) => v);
  _castNormal = canvasTexture(normalFromHeight(h, 2.2), { repeatX: 2, repeatY: 2 });
  return _castNormal;
}
function fabricNormal() {
  if (_fabricNormal) return _fabricNormal;
  const c = makeCanvas(256, 256); const ctx = c.getContext('2d');
  fillBase(ctx, '#808080');
  ctx.globalAlpha = 0.55;
  for (let y = 0; y < 256; y += 3) { ctx.fillStyle = y % 6 ? '#9a9a9a' : '#6a6a6a'; ctx.fillRect(0, y, 256, 1.6); }
  for (let x = 0; x < 256; x += 3) { ctx.fillStyle = x % 6 ? '#929292' : '#707070'; ctx.fillRect(x, 0, 1.6, 256); }
  ctx.globalAlpha = 1;
  const f = fbmField(256, 256, 6, 3, 'fabricfold');
  const img = ctx.getImageData(0, 0, 256, 256); const d = img.data;
  for (let i = 0, p = 0; i < f.length; i++, p += 4) {
    const add = (f[i] - 0.5) * 70;
    d[p] += add; d[p + 1] += add; d[p + 2] += add;
  }
  ctx.putImageData(img, 0, 0);
  _fabricNormal = canvasTexture(normalFromHeight(c, 1.6), { repeatX: 3, repeatY: 3 });
  return _fabricNormal;
}
function rubberNormal() {
  if (_rubberNormal) return _rubberNormal;
  const c = makeCanvas(256, 256); const ctx = c.getContext('2d');
  fillBase(ctx, '#787878');
  // fine stipple
  speckle(ctx, 'rubber-stipple', { count: 4200, colors: ['#8f8f8f', '#5f5f5f'], size: 1.4 });
  _rubberNormal = canvasTexture(normalFromHeight(c, 0.55), { repeatX: 6, repeatY: 6 });
  return _rubberNormal;
}
// raised anti-slip diamond plate normal, tile 128px = 0.25 m
function plateNormal() {
  if (_plateNormal) return _plateNormal;
  const c = makeCanvas(256, 256); const ctx = c.getContext('2d');
  fillBase(ctx, '#6e6e6e');
  ctx.fillStyle = '#c8c8c8';
  const lens = 30, wid = 7;
  for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
    const cx = tx * 64 + ((ty % 2) ? 32 : 0) + 32, cy = ty * 64 + 32;
    const ang = ((tx + ty) % 2) ? Math.PI / 4 : -Math.PI / 4;
    ctx.save(); ctx.translate(cx % 256, cy); ctx.rotate(ang);
    ctx.beginPath(); ctx.roundRect(-lens / 2, -wid / 2, lens, wid, 3.2); ctx.fill();
    ctx.restore();
  }
  const blur = makeCanvas(256, 256); const bctx = blur.getContext('2d');
  bctx.filter = 'blur(1.2px)'; bctx.drawImage(c, 0, 0);
  _plateNormal = canvasTexture(normalFromHeight(blur, 2.4), { repeatX: 1, repeatY: 1 });
  return _plateNormal;
}

// -- material definitions ----------------------------------------------------
// def() caches; builder(mat, wear) fills canvases and sets maps once, and is
// re-run on wear change (canvases redrawn in place).

function def(key, create) {
  if (materialCache.has(key)) return materialCache.get(key);
  const mat = create();
  materialCache.set(key, mat);
  return mat;
}

function regenerable(drawFn) {
  // returns {canvas, texture-ish refresh}; drawFn(ctx, wear)
  const canvases = [];
  const api = {
    canvas(w, h) { const c = makeCanvas(w, h); canvases.push(c); return c; },
    textures: [],
  };
  const run = () => { drawFn(api); for (const t of api.textures) t.needsUpdate = true; };
  regenFns.push(run);
  return { api, run };
}

// ============================ HULL PAINT =====================================
// UVs on hull: x = z-meters / 1.5 (tiles), y = angle 0(port floor)..1(stbd floor), 0.5 = crown.
export function hullPaint() {
  return def('hullPaint', () => {
    const W = 1024, H = 1024;
    const mat = new THREE.MeshStandardMaterial({ name: 'hullPaint', roughness: 0.62, metalness: 0.06 });
    const { api, run } = regenerable(({ canvas, textures }) => {
      textures.length = 0;
      const c = api._c || (api._c = canvas(W, H));
      const ctx = c.getContext('2d');
      // vertical bands by v(=y): floor->green wainscot->off-white->crown lighter
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0.0, '#5c675c');
      g.addColorStop(0.10, PALETTE.navalGreen);
      g.addColorStop(0.175, PALETTE.navalGreen);
      g.addColorStop(0.185, '#b9b4a4');
      g.addColorStop(0.34, PALETTE.hullWhite);
      g.addColorStop(0.5, '#d6d1c2');
      g.addColorStop(0.66, PALETTE.hullWhite);
      g.addColorStop(0.815, '#b9b4a4');
      g.addColorStop(0.825, PALETTE.navalGreen);
      g.addColorStop(0.90, PALETTE.navalGreen);
      g.addColorStop(1.0, '#5c675c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      mottle(ctx, 'hull-mottle', { cells: 13, octaves: 4, amount: 0.045 });
      // rib shadow/grime bands where frames land (x = 0 and 0.5 of the 1.5m tile)
      for (const rx of [0, 0.5, 1.0]) {
        const bg = ctx.createLinearGradient((rx - 0.045) * W, 0, (rx + 0.045) * W, 0);
        bg.addColorStop(0, 'rgba(40,38,34,0)');
        bg.addColorStop(0.5, `rgba(40,38,34,${0.16 + aWear(0.14)})`);
        bg.addColorStop(1, 'rgba(40,38,34,0)');
        ctx.fillStyle = bg;
        ctx.fillRect((rx - 0.045) * W, 0, 0.09 * W, H);
      }
      // plate seams along z every 0.75m (x direction tile = 1.5m => 2 seams)
      ctx.fillStyle = 'rgba(52,50,46,0.55)';
      ctx.fillRect(0, 0, 3, H); ctx.fillRect(W / 2 - 1, 0, 3, H);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(3, 0, 2, H); ctx.fillRect(W / 2 + 2, 2, 2, H);
      // rivet rows flanking each seam
      for (const rx of [0.028, 0.472, 0.528, 0.972]) {
        for (let i = 0; i < 26; i++) {
          const y = ((i + 0.5) / 26) * H;
          ctx.fillStyle = 'rgba(66,62,56,0.75)';
          ctx.beginPath(); ctx.arc(rx * W, y, 3.4, 0, 7); ctx.fill();
          ctx.fillStyle = 'rgba(230,226,216,0.4)';
          ctx.beginPath(); ctx.arc(rx * W - 1, y - 1, 1.4, 0, 7); ctx.fill();
        }
      }
      // longitudinal seam rows near wainscot line
      ctx.fillStyle = 'rgba(52,50,46,0.4)';
      ctx.fillRect(0, H * 0.185, W, 2); ctx.fillRect(0, H * 0.815, W, 2);
      // trim shadow under wainscot line
      const trimShadow = ctx.createLinearGradient(0, H * 0.185, 0, H * 0.21);
      trimShadow.addColorStop(0, 'rgba(30,32,28,0.3)');
      trimShadow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = trimShadow; ctx.fillRect(0, H * 0.185, W, H * 0.03);
      // grime: streaks running DOWN each side. y<0.5 is port side (down = toward y=0)
      streaks(ctx, 'hull-streak-a', { count: Math.round(26 * WEAR) + 4, color: `rgba(56,50,40,${aWear(0.16)})`, y0: 0.5, y1: 0.9, minLen: 0.05, maxLen: 0.22, width: 3 });
      const c2 = api._c2 || (api._c2 = canvas(W, H));
      // draw mirrored streaks for port half by transform
      const ctx2 = c2.getContext('2d');
      ctx2.clearRect(0, 0, W, H);
      streaks(ctx2, 'hull-streak-b', { count: Math.round(26 * WEAR) + 4, color: `rgba(56,50,40,${aWear(0.16)})`, y0: 0.5, y1: 0.9, minLen: 0.05, maxLen: 0.22, width: 3 });
      ctx.save(); ctx.scale(1, -1); ctx.drawImage(c2, 0, -H); ctx.restore();
      // floor-level scuffs and grime (both edges of texture = floor)
      edgeGrime(ctx, { inset: 0.05, color: `rgba(24,22,20,${aWear(0.4)})`, sides: { top: 1, bottom: 1, left: 0, right: 0 } });
      splotches(ctx, 'hull-splotch', { count: Math.round(20 * WEAR), color: `rgba(40,36,30,${aWear(0.08)})`, rMin: 20, rMax: 90 });
      scratches(ctx, 'hull-scratch', { count: Math.round(30 * WEAR), color: `rgba(228,224,214,${aWear(0.13)})`, maxLen: 44 });
      paintChips(ctx, 'hull-chips', { count: Math.round(16 * WEAR), y0: 0.06, y1: 0.2, rMin: 1.4, rMax: 3.6 });
      paintChips(ctx, 'hull-chips2', { count: Math.round(16 * WEAR), y0: 0.8, y1: 0.94, rMin: 1.4, rMax: 3.6 });

      if (!mat.map) {
        mat.map = canvasTexture(c, { srgb: true, aniso: 8 });
      }
      textures.push(mat.map);

      // roughness: paint semi-gloss, grime rougher, chips smoother
      const rc = api._rc || (api._rc = canvas(512, 512));
      const rctx = rc.getContext('2d');
      fillBase(rctx, '#9d9d9d');
      const f = fbmField(512, 512, 10, 3, 'hull-rough');
      const img = rctx.getImageData(0, 0, 512, 512); const d = img.data;
      for (let i = 0, p = 0; i < f.length; i++, p += 4) {
        const v = 150 + (f[i] - 0.5) * 70 * WEAR;
        d[p] = d[p + 1] = d[p + 2] = v;
      }
      rctx.putImageData(img, 0, 0);
      streaks(rctx, 'hull-rough-streak', { count: 20, color: `rgba(225,225,225,${aWear(0.35)})`, y0: 0.4, y1: 0.9, width: 4 });
      if (!mat.roughnessMap) mat.roughnessMap = canvasTexture(rc, {});
      textures.push(mat.roughnessMap);
    });
    run();
    mat.normalMap = paintNormal();
    mat.normalScale = new THREE.Vector2(0.3, 0.3);
    mat.envMapIntensity = 0.45;
    return mat;
  });
}

// ============================ DECK / FLOORS ==================================
export function deckPlate() {
  return def('deckPlate', () => {
    const W = 1024, H = 1024; // 1.5m x 1.5m tile
    const mat = new THREE.MeshStandardMaterial({ name: 'deckPlate', roughness: 0.8, metalness: 0.28 });
    const { api, run } = regenerable(({ canvas, textures }) => {
      const c = api._c || (api._c = canvas(W, H));
      const ctx = c.getContext('2d');
      fillBase(ctx, PALETTE.antiSlip);
      mottle(ctx, 'deck-mottle', { cells: 9, octaves: 4, amount: 0.13 });
      // plate joints: 2x2 plates per tile
      ctx.strokeStyle = 'rgba(15,15,14,0.8)'; ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, W - 4, H - 4);
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
      // countersunk screws at plate corners
      for (const [sx, sy] of [[0.03, 0.03], [0.47, 0.03], [0.53, 0.03], [0.97, 0.03], [0.03, 0.47], [0.47, 0.47], [0.53, 0.47], [0.97, 0.47], [0.03, 0.53], [0.47, 0.53], [0.53, 0.53], [0.97, 0.53], [0.03, 0.97], [0.47, 0.97], [0.53, 0.97], [0.97, 0.97]]) {
        ctx.fillStyle = 'rgba(120,118,110,0.9)';
        ctx.beginPath(); ctx.arc(sx * W, sy * H, 7, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(20,20,18,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx * W, sy * H, 7, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx * W - 5, sy * H); ctx.lineTo(sx * W + 5, sy * H); ctx.stroke();
      }
      speckle(ctx, 'deck-speck', { count: Math.round(1400 * WEAR) + 200, colors: ['rgba(0,0,0,0.16)', 'rgba(190,188,180,0.10)'], size: 2 });
      splotches(ctx, 'deck-oil', { count: Math.round(8 * WEAR), color: 'rgba(16,15,14,0.25)', rMin: 12, rMax: 46 });
      if (!mat.map) mat.map = canvasTexture(c, { srgb: true, aniso: 8 });
      textures.push(mat.map);

      const rc = api._rc || (api._rc = canvas(512, 512));
      const rctx = rc.getContext('2d');
      fillBase(rctx, '#c2c2c2');
      speckle(rctx, 'deck-rough-speck', { count: 900, colors: ['#e8e8e8', '#909090'], size: 2 });
      if (!mat.roughnessMap) mat.roughnessMap = canvasTexture(rc, {});
      textures.push(mat.roughnessMap);
    });
    run();
    mat.normalMap = plateNormal();
    mat.normalScale = new THREE.Vector2(0.85, 0.85);
    mat.envMapIntensity = 0.3;
    return mat;
  });
}

// translucent foot-traffic overlay strip laid along walking routes
export function deckWear() {
  return def('deckWear', () => {
    const W = 256, H = 1024;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    const band = ctx.createLinearGradient(0, 0, W, 0);
    band.addColorStop(0, 'rgba(120,118,110,0)');
    band.addColorStop(0.5, `rgba(120,118,110,${0.34 * WEAR})`);
    band.addColorStop(1, 'rgba(120,118,110,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, 0, W, H);
    // scuff marks
    scratches(ctx, 'deckwear-scuff', { count: 90, color: `rgba(60,58,52,${0.3 * WEAR})`, maxLen: 40, width: 2 });
    scratches(ctx, 'deckwear-shine', { count: 50, color: `rgba(190,188,178,${0.22 * WEAR})`, maxLen: 34, width: 1.5 });
    const mat = new THREE.MeshStandardMaterial({
      map: canvasTexture(c, { srgb: true }), transparent: true, roughness: 0.45, metalness: 0.35,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
      envMapIntensity: 0.5, depthWrite: false,
    });
    return mat;
  });
}

export function rubberMat() {
  return def('rubberMat', () => {
    const mat = new THREE.MeshStandardMaterial({ name: 'rubberMat', color: new THREE.Color(PALETTE.rubber), roughness: 0.93, metalness: 0.0 });
    const { api, run } = regenerable(({ canvas, textures }) => {
      const c = api._c || (api._c = canvas(512, 512));
      const ctx = c.getContext('2d');
      fillBase(ctx, PALETTE.rubber);
      mottle(ctx, 'rubber-mottle', { cells: 8, octaves: 3, amount: 0.09 });
      // ribbed runner pattern
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      for (let x = 0; x < 512; x += 26) ctx.fillRect(x, 0, 10, 512);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      for (let x = 20; x < 512; x += 26) ctx.fillRect(x, 0, 4, 512);
      const wearBand = ctx.createLinearGradient(0, 0, 512, 0);
      wearBand.addColorStop(0.3, 'rgba(0,0,0,0)');
      wearBand.addColorStop(0.5, `rgba(150,148,140,${aWear(0.10)})`);
      wearBand.addColorStop(0.7, 'rgba(0,0,0,0)');
      ctx.fillStyle = wearBand; ctx.fillRect(0, 0, 512, 512);
      speckle(ctx, 'rubber-dust', { count: Math.round(500 * WEAR), colors: ['rgba(160,155,145,0.07)'], size: 1.5 });
      if (!mat.map) mat.map = canvasTexture(c, { srgb: true });
      textures.push(mat.map);
    });
    run();
    mat.normalMap = rubberNormal();
    mat.normalScale = new THREE.Vector2(0.5, 0.5);
    mat.envMapIntensity = 0.25;
    return mat;
  });
}

// ============================ METALS =========================================
export function bareSteel() {
  return def('bareSteel', () => {
    const mat = new THREE.MeshStandardMaterial({ name: 'bareSteel', color: 0xb8bcbe, roughness: 0.38, metalness: 0.92 });
    mat.normalMap = brushNormal(); mat.normalScale = new THREE.Vector2(0.35, 0.35);
    const { api, run } = regenerable(({ canvas, textures }) => {
      const rc = api._rc || (api._rc = canvas(256, 256));
      const rctx = rc.getContext('2d');
      fillBase(rctx, '#5c5c5c');
      const f = fbmField(256, 256, 24, 2, 'steel-rough');
      const img = rctx.getImageData(0, 0, 256, 256); const d = img.data;
      for (let i = 0, p = 0; i < f.length; i++, p += 4) { const v = 86 + f[i] * 76; d[p] = d[p + 1] = d[p + 2] = v; }
      rctx.putImageData(img, 0, 0);
      scratches(rctx, 'steel-scr', { count: Math.round(60 * WEAR), color: 'rgba(220,220,220,0.5)', maxLen: 90, width: 1 });
      if (!mat.roughnessMap) mat.roughnessMap = canvasTexture(rc, {});
      textures.push(mat.roughnessMap);
    });
    run();
    mat.envMapIntensity = 1.0;
    return mat;
  });
}

export function galvanized() {
  return def('galvanized', () => {
    const mat = new THREE.MeshStandardMaterial({ name: 'galvanized', color: 0xaeb5b8, roughness: 0.48, metalness: 0.8, envMapIntensity: 1.3 });
    const { api, run } = regenerable(({ canvas, textures }) => {
      const c = api._c || (api._c = canvas(256, 256));
      const ctx = c.getContext('2d');
      fillBase(ctx, '#9aa1a4');
      splotches(ctx, 'galv-spangle', { count: 60, color: 'rgba(255,255,255,0.10)', rMin: 6, rMax: 22, feather: 0.4 });
      splotches(ctx, 'galv-spangle2', { count: 60, color: 'rgba(60,64,66,0.14)', rMin: 6, rMax: 20, feather: 0.4 });
      speckle(ctx, 'galv-speck', { count: Math.round(300 * WEAR), colors: ['rgba(70,60,50,0.2)'], size: 1.6 });
      if (!mat.map) mat.map = canvasTexture(c, { srgb: true });
      textures.push(mat.map);
    });
    run();
    mat.envMapIntensity = 0.8;
    return mat;
  });
}

function machinePaint(key, baseColor, { chipAmt = 1, oil = 0.5, rough = 0.5 } = {}) {
  return def(key, () => {
    const mat = new THREE.MeshStandardMaterial({ name: key, roughness: rough, metalness: 0.25 });
    const { api, run } = regenerable(({ canvas, textures }) => {
      const W = 512, H = 512;
      const c = api._c || (api._c = canvas(W, H));
      const ctx = c.getContext('2d');
      fillBase(ctx, baseColor);
      mottle(ctx, key + '-mottle', { cells: 6, octaves: 4, amount: 0.12 });
      scratches(ctx, key + '-scr', { count: Math.round(26 * WEAR * chipAmt), color: 'rgba(200,198,190,0.16)', maxLen: 40 });
      paintChips(ctx, key + '-chips', { count: Math.round(18 * WEAR * chipAmt), y0: 0, y1: 1, rMin: 1.2, rMax: 4 });
      splotches(ctx, key + '-oil', { count: Math.round(12 * WEAR * oil), color: 'rgba(12,11,10,0.22)', rMin: 14, rMax: 60 });
      streaks(ctx, key + '-streak', { count: Math.round(12 * WEAR), color: 'rgba(30,26,20,0.18)', y0: 0.4, y1: 0.95, width: 3, minLen: 0.08, maxLen: 0.3 });
      edgeGrime(ctx, { inset: 0.07, color: `rgba(14,13,12,${aWear(0.30)})` });
      if (!mat.map) mat.map = canvasTexture(c, { srgb: true });
      textures.push(mat.map);
      const rc = api._rc || (api._rc = canvas(256, 256));
      const rctx = rc.getContext('2d');
      fillBase(rctx, '#8a8a8a');
      splotches(rctx, key + '-roughoil', { count: Math.round(14 * WEAR * oil), color: 'rgba(40,40,40,0.55)', rMin: 16, rMax: 60 });
      speckle(rctx, key + '-roughspeck', { count: 500, colors: ['#a8a8a8', '#6a6a6a'], size: 2 });
      if (!mat.roughnessMap) mat.roughnessMap = canvasTexture(rc, {});
      textures.push(mat.roughnessMap);
    });
    run();
    mat.normalMap = castNormal(); mat.normalScale = new THREE.Vector2(0.35, 0.35);
    mat.envMapIntensity = 0.7;
    return mat;
  });
}

export function gunmetal() { return machinePaint('gunmetal', PALETTE.gunmetal, { chipAmt: 1.2, oil: 0.9, rough: 0.5 }); }
export function machineBlue() { return machinePaint('machineBlue', PALETTE.machineBlue, { chipAmt: 1, oil: 0.6, rough: 0.55 }); }
export function darkSteel() { return machinePaint('darkSteel', PALETTE.darkSteel, { chipAmt: 0.8, oil: 0.7, rough: 0.5 }); }
export function safetyOrangePaint() { return machinePaint('safetyOrange', PALETTE.safetyOrange, { chipAmt: 1.4, oil: 0.2, rough: 0.55 }); }
export function functionalRedPaint() { return machinePaint('functionalRed', PALETTE.functionalRed, { chipAmt: 1.2, oil: 0.2, rough: 0.5 }); }

export function oilySteel() {
  return def('oilySteel', () => {
    const mat = new THREE.MeshPhysicalMaterial({
      name: 'oilySteel', color: 0x1f2124, roughness: 0.32, metalness: 0.9,
      clearcoat: 0.55, clearcoatRoughness: 0.35,
    });
    const { api, run } = regenerable(({ canvas, textures }) => {
      const rc = api._rc || (api._rc = canvas(256, 256));
      const rctx = rc.getContext('2d');
      fillBase(rctx, '#6a6a6a');
      splotches(rctx, 'oily-patch', { count: 26, color: 'rgba(28,28,28,0.7)', rMin: 14, rMax: 70 });
      streaks(rctx, 'oily-run', { count: 16, color: 'rgba(34,34,34,0.6)', y0: 0.2, y1: 0.9, width: 5, minLen: 0.1, maxLen: 0.5 });
      if (!mat.roughnessMap) mat.roughnessMap = canvasTexture(rc, {});
      textures.push(mat.roughnessMap);
    });
    run();
    mat.normalMap = castNormal(); mat.normalScale = new THREE.Vector2(0.25, 0.25);
    mat.envMapIntensity = 1.0;
    return mat;
  });
}

export function copper() {
  return def('copper', () => {
    const mat = new THREE.MeshStandardMaterial({ name: 'copper', color: 0x9a5f3f, roughness: 0.42, metalness: 0.95 });
    const { api, run } = regenerable(({ canvas, textures }) => {
      const c = api._c || (api._c = canvas(256, 128));
      const ctx = c.getContext('2d');
      fillBase(ctx, '#9a5f3f');
      mottle(ctx, 'cu-mottle', { cells: 8, octaves: 3, amount: 0.15 });
      splotches(ctx, 'cu-oxide', { count: Math.round(22 * WEAR), color: 'rgba(58,72,60,0.30)', rMin: 4, rMax: 18 });
      if (!mat.map) mat.map = canvasTexture(c, { srgb: true });
      textures.push(mat.map);
    });
    run();
    mat.envMapIntensity = 0.9;
    return mat;
  });
}

export function brass() {
  return def('brass', () => new THREE.MeshStandardMaterial({
    name: 'brass', color: 0xaf9550, roughness: 0.35, metalness: 0.95, envMapIntensity: 1.0,
    normalMap: brushNormal(), normalScale: new THREE.Vector2(0.2, 0.2),
  }));
}

export function chrome() {
  return def('chrome', () => new THREE.MeshStandardMaterial({
    name: 'chrome', color: 0xd6d9da, roughness: 0.16, metalness: 1.0, envMapIntensity: 1.1,
  }));
}

// ============================ PIPES ==========================================
const pipeColors = {
  green: PALETTE.navalGreen, gray: '#7c8184', blue: PALETTE.machineBlue,
  red: PALETTE.functionalRed, yellow: PALETTE.hazardYellow, white: '#b9b5a7',
  orange: PALETTE.safetyOrange, dark: PALETTE.darkSteel,
};
export function pipePaint(colorName = 'gray') {
  const key = `pipe:${colorName}`;
  return def(key, () => {
    const mat = new THREE.MeshStandardMaterial({ name: key, roughness: 0.5, metalness: 0.3 });
    const { api, run } = regenerable(({ canvas, textures }) => {
      const c = api._c || (api._c = canvas(256, 256));
      const ctx = c.getContext('2d');
      fillBase(ctx, pipeColors[colorName] || colorName);
      mottle(ctx, key + '-mottle', { cells: 5, octaves: 3, amount: 0.10 });
      streaks(ctx, key + '-drip', { count: Math.round(10 * WEAR), color: 'rgba(30,26,20,0.22)', y0: 0.1, y1: 0.8, width: 3, minLen: 0.1, maxLen: 0.4 });
      scratches(ctx, key + '-scr', { count: Math.round(16 * WEAR), color: 'rgba(210,205,195,0.14)', maxLen: 26 });
      speckle(ctx, key + '-spk', { count: Math.round(160 * WEAR), colors: ['rgba(40,30,20,0.25)'], size: 1.6 });
      if (!mat.map) mat.map = canvasTexture(c, { srgb: true });
      textures.push(mat.map);
    });
    run();
    mat.normalMap = paintNormal(); mat.normalScale = new THREE.Vector2(0.4, 0.4);
    mat.envMapIntensity = 0.65;
    return mat;
  });
}

// ============================ PANELS / CABINETS ==============================
export function panelPaint(colorName, colorHex) {
  const key = `panel:${colorName}`;
  return def(key, () => {
    const mat = new THREE.MeshStandardMaterial({ name: key, roughness: 0.48, metalness: 0.15 });
    const { api, run } = regenerable(({ canvas, textures }) => {
      const c = api._c || (api._c = canvas(512, 512));
      const ctx = c.getContext('2d');
      fillBase(ctx, colorHex);
      mottle(ctx, key + '-mottle', { cells: 11, octaves: 3, amount: 0.05 });
      scratches(ctx, key + '-scr', { count: Math.round(18 * WEAR), color: 'rgba(215,210,200,0.12)', maxLen: 34 });
      edgeGrime(ctx, { inset: 0.05, color: `rgba(16,15,14,${aWear(0.30)})` });
      speckle(ctx, key + '-spk', { count: Math.round(240 * WEAR), colors: ['rgba(20,18,16,0.12)'], size: 1.4 });
      if (!mat.map) mat.map = canvasTexture(c, { srgb: true });
      textures.push(mat.map);
    });
    run();
    mat.normalMap = paintNormal(); mat.normalScale = new THREE.Vector2(0.5, 0.5);
    mat.envMapIntensity = 0.6;
    return mat;
  });
}
export function consoleGray() { return panelPaint('consoleGray', '#646b66'); }
export function cabinetGreen() { return panelPaint('cabinetGreen', '#5d685a'); }
export function cabinetGray() { return panelPaint('cabinetGray', '#767b76'); }
export function cabinetCream() { return panelPaint('cabinetCream', '#a8a18d'); }

// ============================ SOFT / ORGANIC =================================
export function fabricBlanket() {
  return def('fabricBlanket', () => {
    const mat = new THREE.MeshPhysicalMaterial({
      name: 'fabricBlanket', roughness: 0.95, metalness: 0,
      sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color(0x8a8f82),
    });
    const { api, run } = regenerable(({ canvas, textures }) => {
      const c = api._c || (api._c = canvas(512, 512));
      const ctx = c.getContext('2d');
      fillBase(ctx, '#49523f');
      mottle(ctx, 'blanket-mottle', { cells: 5, octaves: 3, amount: 0.12 });
      // stitched border + label
      ctx.strokeStyle = 'rgba(35,38,33,0.8)'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
      ctx.strokeRect(18, 18, 476, 476); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(210,205,190,0.85)';
      ctx.fillRect(390, 430, 70, 34);
      stencilText(ctx, 'DSV-7', 425, 447, { size: 15, color: 'rgba(60,60,58,0.9)', spacing: 1 });
      speckle(ctx, 'blanket-fuzz', { count: 1500, colors: ['rgba(220,220,210,0.05)', 'rgba(20,22,18,0.07)'], size: 1.2 });
      if (!mat.map) mat.map = canvasTexture(c, { srgb: true });
      textures.push(mat.map);
    });
    run();
    mat.normalMap = fabricNormal(); mat.normalScale = new THREE.Vector2(0.9, 0.9);
    mat.envMapIntensity = 0.25;
    return mat;
  });
}

export function fabricSheet() {
  return def('fabricSheet', () => {
    const mat = new THREE.MeshPhysicalMaterial({
      name: 'fabricSheet', color: 0xb7b3a4, roughness: 0.9, metalness: 0,
      sheen: 0.5, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xcfccc0),
    });
    mat.normalMap = fabricNormal(); mat.normalScale = new THREE.Vector2(0.55, 0.55);
    mat.envMapIntensity = 0.3;
    return mat;
  });
}

export function mattressTicking() {
  return def('mattressTicking', () => {
    const mat = new THREE.MeshPhysicalMaterial({ name: 'mattress', roughness: 0.92, metalness: 0, sheen: 0.4, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xa9a698) });
    const { api, run } = regenerable(({ canvas, textures }) => {
      const c = api._c || (api._c = canvas(512, 512));
      const ctx = c.getContext('2d');
      fillBase(ctx, '#9d9887');
      for (let x = 0; x < 512; x += 34) { ctx.fillStyle = 'rgba(74,84,92,0.55)'; ctx.fillRect(x, 0, 6, 512); ctx.fillStyle = 'rgba(74,84,92,0.30)'; ctx.fillRect(x + 12, 0, 3, 512); }
      mottle(ctx, 'tick-mottle', { cells: 6, octaves: 3, amount: 0.08 });
      splotches(ctx, 'tick-stain', { count: Math.round(6 * WEAR), color: 'rgba(90,74,52,0.14)', rMin: 12, rMax: 42 });
      if (!mat.map) mat.map = canvasTexture(c, { srgb: true });
      textures.push(mat.map);
    });
    run();
    mat.normalMap = fabricNormal(); mat.normalScale = new THREE.Vector2(0.6, 0.6);
    mat.envMapIntensity = 0.25;
    return mat;
  });
}

export function vinylSeat() {
  return def('vinylSeat', () => {
    const mat = new THREE.MeshPhysicalMaterial({
      name: 'vinylSeat', roughness: 0.55, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.5,
    });
    const { api, run } = regenerable(({ canvas, textures }) => {
      const c = api._c || (api._c = canvas(256, 256));
      const ctx = c.getContext('2d');
      fillBase(ctx, '#4a4038');
      mottle(ctx, 'vinyl-mottle', { cells: 7, octaves: 3, amount: 0.14 });
      scratches(ctx, 'vinyl-crack', { count: Math.round(20 * WEAR), color: 'rgba(24,20,16,0.5)', maxLen: 40, width: 1 });
      splotches(ctx, 'vinyl-shine', { count: 8, color: 'rgba(210,200,180,0.06)', rMin: 20, rMax: 60 });
      if (!mat.map) mat.map = canvasTexture(c, { srgb: true });
      textures.push(mat.map);
    });
    run();
    // wrinkles
    const wc = makeCanvas(256, 256); const wctx = wc.getContext('2d');
    fillBase(wctx, '#808080');
    const f = fbmField(256, 256, 5, 4, 'vinyl-wrinkle');
    const img = wctx.getImageData(0, 0, 256, 256); const d = img.data;
    for (let i = 0, p = 0; i < f.length; i++, p += 4) { const v = 128 + (f[i] - 0.5) * 120; d[p] = d[p + 1] = d[p + 2] = v; }
    wctx.putImageData(img, 0, 0);
    mat.normalMap = canvasTexture(normalFromHeight(wc, 1.6), {});
    mat.normalScale = new THREE.Vector2(0.8, 0.8);
    mat.envMapIntensity = 0.5;
    return mat;
  });
}

export function towel() {
  return def('towel', () => new THREE.MeshPhysicalMaterial({
    name: 'towel', color: 0x8f4a3d, roughness: 1.0, metalness: 0,
    sheen: 0.8, sheenRoughness: 0.9, sheenColor: new THREE.Color(0xaf7a6d),
    normalMap: fabricNormal(), normalScale: new THREE.Vector2(1.2, 1.2), envMapIntensity: 0.2,
  }));
}

// ============================ PLASTICS / GLASS ===============================
export function bakelite() {
  return def('bakelite', () => new THREE.MeshPhysicalMaterial({
    name: 'bakelite', color: 0x2e2019, roughness: 0.28, metalness: 0,
    clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 0.8,
  }));
}
export function plasticBeige() {
  return def('plasticBeige', () => new THREE.MeshStandardMaterial({
    name: 'plasticBeige', color: 0xa89f8b, roughness: 0.55, metalness: 0,
    normalMap: paintNormal(), normalScale: new THREE.Vector2(0.25, 0.25), envMapIntensity: 0.5,
  }));
}
export function plasticBlack() {
  return def('plasticBlack', () => new THREE.MeshStandardMaterial({
    name: 'plasticBlack', color: 0x1c1d1e, roughness: 0.6, metalness: 0, envMapIntensity: 0.5,
  }));
}
export function whiteEnamel() {
  return def('whiteEnamel', () => new THREE.MeshPhysicalMaterial({
    name: 'whiteEnamel', color: 0xc9c6bb, roughness: 0.18, metalness: 0.05,
    clearcoat: 0.7, clearcoatRoughness: 0.2, envMapIntensity: 0.8,
  }));
}

export function glassThick() {
  return def('glassThick', () => new THREE.MeshPhysicalMaterial({
    name: 'glassThick', color: 0x9fb4ae, roughness: 0.03, metalness: 0,
    transparent: true, opacity: 0.045, envMapIntensity: 0.18,
    clearcoat: 0.25, clearcoatRoughness: 0.28, side: THREE.FrontSide, depthWrite: false,
  }));
}
export function glassInstrument() {
  return def('glassInstrument', () => new THREE.MeshPhysicalMaterial({
    name: 'glassInstrument', color: 0x565d5c, roughness: 0.06, metalness: 0,
    transparent: true, opacity: 0.22, envMapIntensity: 1.4, clearcoat: 1, clearcoatRoughness: 0.08,
    depthWrite: false,
  }));
}
export function glassEdge() {
  // the green-tinted edge of thick glass
  return def('glassEdge', () => new THREE.MeshStandardMaterial({
    name: 'glassEdge', color: 0x4a6b5e, roughness: 0.25, metalness: 0.1, envMapIntensity: 0.8,
  }));
}

// ============================ SPECIALS =======================================
export function hazardStripe() {
  return def('hazardStripe', () => {
    const mat = new THREE.MeshStandardMaterial({ name: 'hazardStripe', roughness: 0.6, metalness: 0.1 });
    const { api, run } = regenerable(({ canvas, textures }) => {
      const c = api._c || (api._c = canvas(256, 64));
      const ctx = c.getContext('2d');
      fillBase(ctx, PALETTE.hazardYellow);
      ctx.fillStyle = '#242424';
      for (let x = -64; x < 300; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 64); ctx.lineTo(x + 32, 0); ctx.lineTo(x + 64, 0); ctx.lineTo(x + 32, 64);
        ctx.closePath(); ctx.fill();
      }
      speckle(ctx, 'haz-wear', { count: Math.round(260 * WEAR), colors: ['rgba(40,38,34,0.35)', 'rgba(180,175,160,0.25)'], size: 2 });
      scratches(ctx, 'haz-scr', { count: Math.round(24 * WEAR), color: 'rgba(70,66,60,0.5)', maxLen: 30 });
      if (!mat.map) mat.map = canvasTexture(c, { srgb: true });
      textures.push(mat.map);
    });
    run();
    mat.envMapIntensity = 0.5;
    return mat;
  });
}

export function grateSteel() {
  return def('grateSteel', () => new THREE.MeshStandardMaterial({
    name: 'grateSteel', color: 0x4c4f52, roughness: 0.55, metalness: 0.85,
    normalMap: brushNormal(), normalScale: new THREE.Vector2(0.2, 0.2), envMapIntensity: 0.7,
  }));
}

export function bilge() {
  return def('bilge', () => new THREE.MeshStandardMaterial({
    name: 'bilge', color: 0x121314, roughness: 0.35, metalness: 0.6, envMapIntensity: 0.35,
  }));
}

// condensation overlay: droplet-covered translucent film for cold surfaces.
// Use on thin planes hovering 1-2mm over the base surface.
export function condensation() {
  return def('condensation', () => {
    const W = 256, H = 256;
    // droplet height field -> normal map; alpha where droplets + runs exist
    const height = makeCanvas(W, H); const hctx = height.getContext('2d');
    fillBase(hctx, '#3c3c3c');
    const alpha = makeCanvas(W, H); const actx = alpha.getContext('2d');
    fillBase(actx, '#000000');
    const rng = (function () { let i = 0; const arr = fbmField(1024, 1, 256, 1, 'condense-seq'); return () => arr[(i++) % arr.length]; })();
    for (let i = 0; i < 420; i++) {
      const x = rng() * W, y = rng() * H, r = 1 + rng() * 3.4;
      const hg = hctx.createRadialGradient(x, y, 0, x, y, r);
      hg.addColorStop(0, '#e8e8e8'); hg.addColorStop(0.8, '#9a9a9a'); hg.addColorStop(1, '#3c3c3c');
      hctx.fillStyle = hg; hctx.beginPath(); hctx.arc(x, y, r, 0, Math.PI * 2); hctx.fill();
      const ag = actx.createRadialGradient(x, y, 0, x, y, r);
      ag.addColorStop(0, 'rgba(255,255,255,0.85)'); ag.addColorStop(1, 'rgba(255,255,255,0)');
      actx.fillStyle = ag; actx.beginPath(); actx.arc(x, y, r, 0, Math.PI * 2); actx.fill();
    }
    // a few runs (drip trails)
    for (let i = 0; i < 14; i++) {
      const x = rng() * W, y0 = rng() * H * 0.5, len = 20 + rng() * 60;
      hctx.fillStyle = 'rgba(180,180,180,0.8)'; hctx.fillRect(x - 0.8, y0, 1.6, len);
      actx.fillStyle = 'rgba(255,255,255,0.5)'; actx.fillRect(x - 0.8, y0, 1.6, len);
      const dg = hctx.createRadialGradient(x, y0 + len, 0, x, y0 + len, 3.5);
      dg.addColorStop(0, '#f0f0f0'); dg.addColorStop(1, '#3c3c3c');
      hctx.fillStyle = dg; hctx.beginPath(); hctx.arc(x, y0 + len, 3.5, 0, Math.PI * 2); hctx.fill();
      actx.fillStyle = 'rgba(255,255,255,0.8)'; actx.beginPath(); actx.arc(x, y0 + len, 3, 0, Math.PI * 2); actx.fill();
    }
    const mat = new THREE.MeshPhysicalMaterial({
      name: 'condensation', color: 0x8fa4a0, roughness: 0.14, metalness: 0,
      transparent: true, opacity: 0.3, depthWrite: false,
      alphaMap: canvasTexture(alpha, {}),
      normalMap: canvasTexture(normalFromHeight(height, 2.6), {}),
      normalScale: new THREE.Vector2(1.1, 1.1),
      envMapIntensity: 0.6, clearcoat: 0.8, clearcoatRoughness: 0.18,
    });
    return mat;
  });
}

// gauge/dial face generator (used by greebles); canvases cached by params ----
const dialCache = new Map();
export function makeDialCanvas(label = 'BAR', { max = 10, redFrom = 0.78, size = 128, unit = '' } = {}) {
  const cacheKey = `${label}:${max}:${redFrom}:${size}:${unit}`;
  if (dialCache.has(cacheKey)) return dialCache.get(cacheKey);
  const c = makeCanvas(size, size);
  dialCache.set(cacheKey, c);
  const ctx = c.getContext('2d');
  const cx = size / 2, cy = size / 2, r = size * 0.46;
  ctx.fillStyle = '#ded9cb';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#22221f'; ctx.lineWidth = size * 0.02;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.99, 0, Math.PI * 2); ctx.stroke();
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
  // red zone
  ctx.strokeStyle = 'rgba(142,48,48,0.9)'; ctx.lineWidth = size * 0.05;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, a0 + (a1 - a0) * redFrom, a1); ctx.stroke();
  ctx.strokeStyle = '#22221f';
  for (let i = 0; i <= 20; i++) {
    const a = a0 + ((a1 - a0) * i) / 20;
    const big = i % 4 === 0;
    ctx.lineWidth = big ? size * 0.018 : size * 0.008;
    const r0 = big ? r * 0.72 : r * 0.78, r1 = r * 0.88;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
    if (big) {
      const val = Math.round((max * i) / 20);
      ctx.font = `${size * 0.10}px "DejaVu Sans", sans-serif`;
      ctx.fillStyle = '#22221f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(val), cx + Math.cos(a) * r * 0.58, cy + Math.sin(a) * r * 0.58);
    }
  }
  ctx.font = `${size * 0.085}px "DejaVu Sans", sans-serif`;
  ctx.fillStyle = '#3a3a36'; ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy + r * 0.32);
  if (unit) ctx.fillText(unit, cx, cy + r * 0.45);
  // subtle aging
  splotches(ctx, 'dial-age' + label, { count: 5, color: 'rgba(120,100,70,0.10)', rMin: 6, rMax: 26 });
  return c;
}

// small label plate canvas
export function makeLabelCanvas(text, { w = 256, h = 64, bg = '#b9b4a4', fg = '#26261f', border = true, size = 26 } = {}) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  fillBase(ctx, bg);
  mottle(ctx, 'label-' + text, { cells: 5, octaves: 2, amount: 0.06 });
  if (border) { ctx.strokeStyle = fg; ctx.lineWidth = 3; ctx.strokeRect(4, 4, w - 8, h - 8); }
  stencilText(ctx, text, w / 2, h / 2, { size, color: fg, spacing: 2 });
  speckle(ctx, 'labelwear-' + text, { count: Math.round(40 * WEAR), colors: ['rgba(60,55,45,0.25)'], size: 1.4 });
  return c;
}

// shared dial-face material per (label, max, unit)
export function dialMaterial(label, max, unit = '') {
  const key = `dial:${label}:${max}:${unit}`;
  return def(key, () => new THREE.MeshStandardMaterial({
    map: canvasTexture(makeDialCanvas(label, { max, unit }), { srgb: true, wrap: false }),
    roughness: 0.7, metalness: 0, envMapIntensity: 0.3,
  }));
}

export function labelMaterial(text, opts = {}) {
  const key = `label:${text}:${JSON.stringify(opts)}`;
  return def(key, () => {
    const mat = new THREE.MeshStandardMaterial({
      name: key, roughness: 0.5, metalness: 0.2,
      map: canvasTexture(makeLabelCanvas(text, opts), { srgb: true, wrap: false }),
      envMapIntensity: 0.5,
    });
    return mat;
  });
}

// emissive display material from a canvas the caller owns
export function displayMaterial(canvas, { intensity = 1.0 } = {}) {
  const tex = canvasTexture(canvas, { srgb: true, wrap: false });
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0a0c0b, roughness: 0.35, metalness: 0,
    emissive: 0xffffff, emissiveIntensity: intensity, emissiveMap: tex,
    envMapIntensity: 0.6,
  });
  mat.userData.canvasTex = tex;
  return mat;
}

export function instrumentLampMaterial(colorHex, intensity = 1.6) {
  const key = `lamp:${colorHex}:${intensity}`;
  return def(key, () => new THREE.MeshStandardMaterial({
    color: 0x111111, emissive: new THREE.Color(colorHex), emissiveIntensity: intensity,
    roughness: 0.4, metalness: 0,
  }));
}

export function allCached() { return materialCache; }
