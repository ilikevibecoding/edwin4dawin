// Contact sheets for the critic: 100 canonical faces at 8x, every species front + side (full body), every outfit
// front + back with its colourways and wear levels. Renders to a 2D canvas (browser) - scripts/skin-sheet.mjs
// screenshots them through CDP; the ?skinsheet= dev hook mounts them over the game.
import { composeUncached, paintHeadOnly, canonicalFaceSet, describeChoice, chooseAppearance } from './compose.js';
import { SPECIES, ORGANIC_SPECIES } from './species.js';
import { OUTFITS } from './outfits.js';
import { ARCHETYPES } from './archetypes.js';
import { createCanvas, hasDomCanvas } from './raster.js';
import { TEX_W, TEX_H } from './layout.js';
import { drawDoll, drawHead } from './dolls.js';

const FONT = '11px "DejaVu Sans Mono", "Cascadia Mono", Menlo, monospace';
const BG = '#1b1b1f', INK = '#e8e8e8', DIM = '#9a9aa4';

function mk(w, h) { const c = createCanvas(w, h); const ctx = c.getContext('2d'); ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h); ctx.imageSmoothingEnabled = false; ctx.font = FONT; return { c, ctx }; }
function text(ctx, s, x, y, col = INK) { ctx.fillStyle = col; ctx.fillText(s, x, y); }
function checker(ctx, x, y, w, h, cs = 8) { for (let j = 0; j < h / cs; j++) for (let i = 0; i < w / cs; i++) { ctx.fillStyle = (i + j) & 1 ? '#2e2e34' : '#26262b'; ctx.fillRect(x + i * cs, y + j * cs, Math.min(cs, w - i * cs), Math.min(cs, h - j * cs)); } }
const headApp = (raster) => { const c = createCanvas(TEX_W, TEX_H); raster.blitTo(c); return { skin: c, model: { kind: 'humanoid', scale: [1, 1, 1] }, geometry: [], overlays: [] }; };

// ---- 1. faces: 100 canonical faces, head front at 8x (16 texels -> 128 px)
export function renderFacesSheet({ count = 100, cols = 10, zoom = 8 } = {}) {
  const faces = canonicalFaceSet(count);
  // the head face is 16 texels; at `zoom` screen px per texel the head is 16*zoom px (= 2*zoom per model px)
  const head = 16 * zoom, cell = head + 48, cellH = head + 46, margin = 12, header = 34;
  const rows = Math.ceil(faces.length / cols);
  const { c, ctx } = mk(margin * 2 + cols * cell, header + rows * cellH + margin);
  text(ctx, `W9 faces - ${faces.length} canonical human faces (front, ${zoom}x per texel), greedy-distinct >= 14% of the 256 face texels; tried ${faces.tried || '?'} seeds. Legend: seed gender age | tone eyes/shape brow | hair/colour, facial hair, marking`, margin, 20);
  faces.forEach((f, k) => {
    const x = margin + (k % cols) * cell, y = header + Math.floor(k / cols) * cellH;
    checker(ctx, x, y, head, head);
    drawHead(ctx, headApp(f.raster), x + head / 2, y, zoom * 2);
    const fc = f.face;
    text(ctx, `${f.seed} ${f.gender[0]} ${f.age}`, x, y + head + 12, INK);
    text(ctx, `${fc.tone.id} ${fc.eyeColour.id}/${fc.eyeShape} ${fc.brow}`.slice(0, 26), x, y + head + 24, DIM);
    text(ctx, `${fc.hairStyle}/${fc.hairColour.id} ${fc.facialHair} ${fc.marking}`.slice(0, 26), x, y + head + 36, DIM);
  });
  return c;
}

// ---- 2. species: every species full body front + side (masculine) and front (feminine), neutral clothes
export function renderSpeciesSheet({ cols = 6, S = 5 } = {}) {
  const list = [...ORGANIC_SPECIES.map((sp) => ({ sp, kind: 'organic' })), ...['protocol_droid', 'astromech', 'sweeper_droid'].map((a) => ({ sp: SPECIES.find((s) => s.droid), kind: a }))];
  const cellW = 62 * S, cellH = 46 * S + 44, margin = 12, header = 34;
  const rows = Math.ceil(list.length / cols);
  const { c, ctx } = mk(margin * 2 + cols * cellW, header + rows * cellH + margin);
  text(ctx, `W9 species - ${ORGANIC_SPECIES.length} organic species (front + left side, masculine; front, feminine) in a neutral tunic + the three droid chassis. ${S}x. Eye rule per species in the caption.`, margin, 20);
  list.forEach((item, k) => {
    const x = margin + (k % cols) * cellW, y = header + Math.floor(k / cols) * cellH;
    const base = y + 44 * S;
    checker(ctx, x, y, cellW - 6, 46 * S);
    let label, sub;
    if (item.kind === 'organic') {
      const sp = item.sp;
      const m = composeUncached(1000 + k * 7, { species: sp.id, gender: 'masculine', age: 'adult', outfit: 'casual_tunic', colourway: 'slate', wear: 'clean', archetype: 'resident' });
      const f = composeUncached(2000 + k * 7, { species: sp.id, gender: 'feminine', age: 'adult', outfit: 'casual_tunic', colourway: 'plum', wear: 'clean', archetype: 'resident' });
      drawDoll(ctx, m, 'front', x + 11 * S, base, S);
      drawDoll(ctx, m, 'left', x + 27 * S, base, S);
      drawDoll(ctx, f, 'front', x + 46 * S, base, S);
      const geo = [...new Set(m.geometry.filter((g) => g.kind !== 'hair').map((g) => g.part || g.kind))].join(', ');
      label = `${sp.name}${sp.homeworld ? ' (' + sp.homeworld + ')' : ''}`;
      sub = `eyes: ${sp.eyeKind}${geo ? ' | ' + geo : ''}`;
    } else {
      const d = composeUncached(3000 + k, { archetype: item.kind });
      drawDoll(ctx, d, 'front', x + 14 * S, base, S);
      drawDoll(ctx, d, 'left', x + 34 * S, base, S);
      label = d.outfit.name; sub = `droid chassis: ${d.model.kind === 'boxes' ? d.model.parts.length + ' boxes' : 'humanoid'}`;
    }
    text(ctx, label, x, base + 14, INK);
    text(ctx, sub.slice(0, 52), x, base + 27, DIM);
  });
  return c;
}

// ---- 3. outfits: every outfit front (first wear level) + back (last wear level), colourway swatches
const archetypeFor = (outfitId) => Object.keys(ARCHETYPES).find((a) => ARCHETYPES[a].outfits[outfitId]) || 'resident';
export function renderOutfitsSheet({ cols = 7, S = 4 } = {}) {
  const cellW = 50 * S, cellH = 50 * S + 58, margin = 12, header = 34;
  const rows = Math.ceil(OUTFITS.length / cols);
  const { c, ctx } = mk(margin * 2 + cols * cellW, header + rows * cellH + margin);
  text(ctx, `W9 outfits - ${OUTFITS.length} outfits, front (first wear level) + back (last wear level), ${S}x; swatches = colourways (primary colour). Caption: name | faction/role | colourways x wear levels`, margin, 20);
  OUTFITS.forEach((o, k) => {
    const x = margin + (k % cols) * cellW, y = header + Math.floor(k / cols) * cellH;
    const base = y + 48 * S;
    checker(ctx, x, y, cellW - 6, 50 * S);
    const arch = archetypeFor(o.id);
    const seed = 500 + k * 13;
    const front = composeUncached(seed, { archetype: arch, outfit: o.id, wear: o.wear[0], colourway: o.colourways[0].id });
    const back = composeUncached(seed, { archetype: arch, outfit: o.id, wear: o.wear[o.wear.length - 1], colourway: o.colourways[Math.min(1, o.colourways.length - 1)].id });
    drawDoll(ctx, front, 'front', x + 13 * S, base, S);
    drawDoll(ctx, back, 'back', x + 34 * S, base, S);
    o.colourways.forEach((cwy, i) => { const col = Object.values(cwy.p).find((v) => typeof v === 'string' && v[0] === '#') || '#888'; ctx.fillStyle = col; ctx.fillRect(x + i * 14, base + 4, 12, 8); });
    text(ctx, o.name.slice(0, 30), x, base + 24, INK);
    text(ctx, `${o.faction}/${o.role} | ${front.species}${front.gender !== 'none' ? ' ' + front.gender[0] : ''}`.slice(0, 32), x, base + 36, DIM);
    text(ctx, `${o.colourways.length} colourways x wear ${o.wear.join('/')}`.slice(0, 32), x, base + 48, DIM);
  });
  return c;
}

// ---- 4. eye-rule zoom: a handful of faces at 16x with the eye / brow rects outlined (debug aid)
export function renderEyeZoomSheet({ seeds = [1, 2, 3, 4, 5, 6, 7, 8], zoom = 16 } = {}) {
  const cell = 16 * zoom + 10, { c, ctx } = mk(24 + seeds.length * cell, 16 * zoom + 60);
  text(ctx, `eye rule debug (${zoom / 2}x per texel): green = eye rects (white + iris + pupil), orange = brow rects above each eye; bridge columns 7-8 stay skin`, 12, 20);
  seeds.forEach((seed, k) => {
    const h = paintHeadOnly(seed, { gender: ['masculine', 'feminine', 'androgynous'][seed % 3], age: 'adult' });
    const x = 12 + k * cell, y = 34;
    drawHead(ctx, headApp(h.raster), x + 8 * zoom, y, zoom);
    ctx.strokeStyle = '#40ff80'; ctx.lineWidth = 1;
    for (const er of h.head.eyeRects) ctx.strokeRect(x + (er[0] - 16) * zoom / 2 + 0.5, y + (er[1] - 16) * zoom / 2 + 0.5, er[2] * zoom / 2 - 1, er[3] * zoom / 2 - 1);
    ctx.strokeStyle = '#ffb040';
    for (const br of h.head.browRects) ctx.strokeRect(x + (br[0] - 16) * zoom / 2 + 0.5, y + (br[1] - 16) * zoom / 2 + 0.5, br[2] * zoom / 2 - 1, br[3] * zoom / 2 - 1);
    text(ctx, `${seed} ${h.face.eyeShape}/${h.face.brow}`, x, y + 16 * zoom + 14);
  });
  return c;
}

export const SHEETS = { faces: renderFacesSheet, species: renderSpeciesSheet, outfits: renderOutfitsSheet, eyes: renderEyeZoomSheet };

export function renderSheet(kind, opts = {}) {
  const fn = SHEETS[kind] || SHEETS.faces;
  return fn(opts);
}

// Mounts a scrollable overlay with the requested sheet (browser only). Exposes window.__sheet for CDP scripts.
export async function mountSheetOverlay(kind = 'faces', opts = {}) {
  if (!hasDomCanvas()) return null;
  const t0 = performance.now();
  const canvas = renderSheet(kind, opts);
  const ms = performance.now() - t0;
  let el = document.getElementById('appearance-sheet');
  if (!el) {
    el = document.createElement('div'); el.id = 'appearance-sheet';
    el.style.cssText = 'position:fixed;inset:0;z-index:50;overflow:auto;background:#101014;padding:8px;';
    document.body.appendChild(el);
  }
  el.innerHTML = '';
  canvas.style.imageRendering = 'pixelated';
  el.appendChild(canvas);
  window.__sheet = { kind, canvas, width: canvas.width, height: canvas.height, ms, dataURL: () => canvas.toDataURL('image/png') };
  window.__renderSheet = (k, o) => {
    const t = performance.now();
    let cv = renderSheet(k, o || {});
    const ms = performance.now() - t;
    if (o && o.crop) { const [x, y, w, h] = o.crop; const c2 = createCanvas(w, h); const cx = c2.getContext('2d'); cx.imageSmoothingEnabled = false; cx.drawImage(cv, x, y, w, h, 0, 0, w, h); cv = c2; }
    return { kind: k, width: cv.width, height: cv.height, ms, dataURL: cv.toDataURL('image/png') };
  };
  console.log(`[appearance] sheet ${kind} ${canvas.width}x${canvas.height} in ${ms.toFixed(0)} ms`);
  return el;
}
export { describeChoice, chooseAppearance };
