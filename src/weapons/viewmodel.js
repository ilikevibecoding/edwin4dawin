import * as THREE from 'three';
import { clamp, damp, lerp, smoothstep } from '../core/utils.js';
import { makeRNG } from '../core/utils.js';

// ===========================================================================
// First-person viewmodel: "AX-4" carbine (M4-class), procedurally modeled.
// Lives in its own overlay scene. Handles all weapon motion: idle sway,
// walk/sprint cycles, ADS blend, recoil kick, reload choreography.
//
// Layout (rifle local space): bore axis along Z at x=0, y=0.
//   -Z = muzzle (tip at z=-0.520), +Z = butt (pad at z=+0.305).
// All dimensions in meters, modeled at real-world scale.
// ===========================================================================

const rng = makeRNG(1123);

// ---------------------------------------------------------------------------
// Procedural textures
// ---------------------------------------------------------------------------
function muzzleFlashTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2;
  // Star spikes — irregular lengths for a combusting look
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4 + rng() * 0.35);
    const len = size * (0.26 + rng() * 0.22);
    const g = ctx.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, 'rgba(255,244,210,0.95)');
    g.addColorStop(0.5, 'rgba(255,170,60,0.5)');
    g.addColorStop(1, 'rgba(255,120,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.025);
    ctx.lineTo(len, 0);
    ctx.lineTo(0, size * 0.025);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Hot core
  const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.2);
  g2.addColorStop(0, 'rgba(255,253,244,1)');
  g2.addColorStop(0.35, 'rgba(255,200,105,0.9)');
  g2.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Soft round dot for the reflex sight reticle.
function reticleDotTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,235,230,1)');
  g.addColorStop(0.25, 'rgba(255,60,40,0.95)');
  g.addColorStop(0.6, 'rgba(255,40,25,0.35)');
  g.addColorStop(1, 'rgba(255,30,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Draws fn at the 9 wrap offsets so every feature tiles seamlessly — kills
// the visible seam where a cylinder's UV wraps around.
function drawWrapped(ctx, size, fn) {
  for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
    ctx.save(); ctx.translate(ox * size, oy * size); fn(); ctx.restore();
  }
}

// Multicam-ish camo for the sleeves. Seamless (wrap-drawn) so the sleeve
// tubes can map it once around with no seam and no visible tiling. Organic
// blob CHAINS instead of dots so it reads as camo, not gravel.
function camoTexture(size = 256) {
  const R = makeRNG(7031);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#55503b';
  ctx.fillRect(0, 0, size, size);
  const cols = ['#645c42', '#3e3826', '#6e6852', '#2c2818', '#494330', '#7a7260', '#36301f'];
  // large soft underlayer washes
  for (let i = 0; i < 22; i++) {
    const px = R() * size, py = R() * size, r = 18 + R() * 38;
    const sq = 0.4 + R() * 0.45, rot = R() * Math.PI;
    const col = cols[Math.floor(R() * cols.length)];
    drawWrapped(ctx, size, () => {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * sq, rot, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }
  // organic blob chains — the readable multicam layer
  for (let i = 0; i < 85; i++) {
    const col = cols[Math.floor(R() * cols.length)];
    let px = R() * size, py = R() * size;
    const n = 2 + Math.floor(R() * 4);
    for (let k = 0; k < n; k++) {
      const r = 4 + R() * 8, sq = 0.45 + R() * 0.4, rot = R() * Math.PI;
      const qx = px, qy = py;
      drawWrapped(ctx, size, () => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(qx, qy, r, r * sq, rot, 0, Math.PI * 2);
        ctx.fill();
      });
      px += (R() - 0.5) * 18; py += (R() - 0.5) * 12;
    }
  }
  // sparse small accent spots
  for (let i = 0; i < 130; i++) {
    const col = cols[Math.floor(R() * cols.length)];
    const px = R() * size, py = R() * size, r = 1.5 + R() * 3;
    const sq = 0.4 + R() * 0.5, rot = R() * Math.PI;
    drawWrapped(ctx, size, () => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * sq, rot, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  // vertical drip streaks (multicam signature)
  for (let i = 0; i < 36; i++) {
    const dark = R() < 0.5;
    const px = R() * size, py = R() * size, len = 6 + R() * 15;
    const w = 1 + R() * 1.4, dx1 = (R() - 0.5) * 5, dx2 = (R() - 0.5) * 7;
    drawWrapped(ctx, size, () => {
      ctx.strokeStyle = dark ? 'rgba(30,26,14,0.4)' : 'rgba(128,120,96,0.35)';
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + dx1, py + len * 0.5, px + dx2, py + len);
      ctx.stroke();
    });
  }
  // fabric speckle (subtle — weave bump carries the cloth read)
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.10)' : 'rgba(255,250,235,0.06)';
    ctx.fillRect(R() * size, R() * size, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// Anodized-metal texture pair. The FULL albedo is baked into the map (the
// material uses a white/near-white tint) so worn-edge highlights can be
// BRIGHTER than the base anodize — a multiply tint would clamp them.
// Feature sizes are tuned for the receiver's stretched UVs: the 256px U axis
// spans only ~4cm of machined face, so anything narrower than ~6px in U is
// sub-pixel at 720p. Lengthwise detail is drawn as wide soft bands + chunky
// streaks; crisp 1-2px detail is reserved for the V axis (cross ticks).
// The roughness map is correlated: worn/greasy = glossy (dark), dust = matte
// (light). UV borders get a broken bright frame so box edges + chamfer bands
// read as anodize rubbed through to bare metal.
// opts: { base, edge, turnMarks } — turnMarks rotates machining 90 deg for
// lathe rings around barrel cylinders.
function metalMaps(seed, opts = {}) {
  const { base = '#3d3c3f', edge = '#8e897e', turnMarks = false, aspect = 1 } = opts;
  const size = 256;
  const R = makeRNG(seed);
  const a = document.createElement('canvas'); a.width = a.height = size;
  const r = document.createElement('canvas'); r.width = r.height = size;
  const ca = a.getContext('2d'), cr = r.getContext('2d');
  ca.fillStyle = base; ca.fillRect(0, 0, size, size);
  cr.fillStyle = '#828282'; cr.fillRect(0, 0, size, size); // mid roughness
  // axis helper: draws in "machining space" (lines run along V normally,
  // along U for turn marks) by flipping coordinates
  const P = (ctx, x, y, w, h) => {
    if (turnMarks) ctx.fillRect(y, x, h, w);
    else ctx.fillRect(x, y, w, h);
  };
  // Soft round smudge, pre-squashed along canvas Y by `aspect`. Long parts
  // (receiver flats, rail bases) map far more length than height per texel;
  // without the squash one 40px blob blows up into a several-cm ghost slab.
  const blob = (ctx, x, y, rad, c0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 1 / aspect);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
    g.addColorStop(0, c0);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
    ctx.restore();
  };
  // anodize tonal drift: broad soft bands along the machining direction.
  // Dark side kept MILD: every box face maps the full texture, so a stack
  // of dark bands lands at the same station on receiver main/deck/bulge
  // faces at once and merges into one flat dark slab across the flank.
  for (let i = 0; i < 8; i++) {
    const x = R() * size, w = 24 + R() * 60, dark = R() < 0.55;
    const col = dark ? '10,9,8' : '255,250,240';
    const aA = dark ? 0.05 + R() * 0.05 : 0.05 + R() * 0.06;
    const g = ca.createLinearGradient(turnMarks ? 0 : x - w, turnMarks ? x - w : 0, turnMarks ? 0 : x + w, turnMarks ? x + w : 0);
    g.addColorStop(0, `rgba(${col},0)`);
    g.addColorStop(0.5, `rgba(${col},${aA})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ca.fillStyle = g; ca.fillRect(0, 0, size, size);
  }
  // machined step bands: hard-edged value steps 8-20px wide (reads as
  // milled relief flats along the part). Kept mild — the receiver UVs
  // stretch a band into a several-cm rectangle, so strong steps read as
  // flat dark slabs at 720p.
  for (let i = 0; i < 6; i++) {
    const x = R() * size, w = 8 + R() * 14, dark = R() < 0.5;
    ca.fillStyle = dark ? 'rgba(8,8,8,0.09)' : 'rgba(255,250,240,0.07)';
    P(ca, x, 0, w, size);
    cr.fillStyle = dark ? 'rgba(210,210,210,0.05)' : 'rgba(70,70,70,0.05)';
    P(cr, x, 0, w, size);
  }
  // chunky lengthwise machining streaks (wide so they survive minification).
  // Roughness side stays gentle: every glossy streak mirrors the bright sky
  // env across the full receiver length and stacks into a chrome sheen.
  for (let i = 0; i < 20; i++) {
    const x = R() * size, w = 3 + R() * 5;
    const y0 = R() * size * 0.5, len = size * (0.3 + R() * 0.7);
    const light = R() < 0.45;
    ca.fillStyle = light ? `rgba(235,230,220,${0.05 + R() * 0.08})` : `rgba(6,6,6,${0.09 + R() * 0.12})`;
    P(ca, x, y0, w, len);
    cr.fillStyle = `rgba(72,72,72,${0.06 + R() * 0.08})`;
    P(cr, x, y0, w, len);
  }
  // fine cross ticks: crisp 1-2px chatter marks across the machining
  // direction (V axis is dense enough for these to resolve)
  for (let i = 0; i < 105; i++) {
    const y = R() * size, x = R() * size, len = 3 + R() * 12;
    const light = R() < 0.45;
    ca.fillStyle = light ? `rgba(226,220,208,${0.07 + R() * 0.10})` : `rgba(10,10,10,${0.13 + R() * 0.16})`;
    P(ca, x, y, len, 1 + R() * 1.5);
    cr.fillStyle = `rgba(64,64,64,${0.12 + R() * 0.16})`;
    P(cr, x, y, len, 1 + R() * 1.5);
  }
  // anodizing speckle (chunky enough to survive mips)
  for (let i = 0; i < 800; i++) {
    const x = R() * size, y = R() * size, s = R() < 0.7 ? 2 : 3;
    const light = R() < 0.45;
    ca.fillStyle = light ? `rgba(220,215,205,${0.06 + R() * 0.10})` : `rgba(8,8,8,${0.09 + R() * 0.14})`;
    ca.fillRect(x, y, s, s);
    cr.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.13)' : 'rgba(255,255,255,0.13)';
    cr.fillRect(x, y, s, s);
  }
  // blotchy patina patches — large soft value drift
  for (let i = 0; i < 13; i++) {
    const x = R() * size, y = R() * size, rad = 22 + R() * 48, dark = R() < 0.55;
    blob(ca, x, y, rad, dark ? 'rgba(6,6,6,0.08)' : 'rgba(255,250,238,0.09)');
    blob(cr, x, y, rad, dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)');
  }
  // finger-grease smudges: glossy (dark) soft blobs in roughness, faint
  // darkening in albedo. Kept WEAK: with metalness ~0.7 a broad roughness
  // blob is a hard sheen cutoff (a gloss patch mirrors the bright sky env
  // and reads as a milky ghost square on the flank).
  for (let i = 0; i < 9; i++) {
    const x = R() * size, y = R() * size, rad = 16 + R() * 32;
    blob(cr, x, y, rad, 'rgba(66,66,66,0.13)');
    blob(ca, x, y, rad, 'rgba(10,9,8,0.08)');
  }
  // dust patches: matte (light) in roughness, faintly pale in albedo
  for (let i = 0; i < 6; i++) {
    const x = R() * size, y = R() * size, rad = 18 + R() * 36;
    blob(cr, x, y, rad, 'rgba(225,225,225,0.10)');
    blob(ca, x, y, rad, 'rgba(216,204,178,0.07)');
  }
  // scratches: bright in albedo, shiny (dark) in roughness. Drawn wide
  // enough in U to survive the receiver's UV stretch.
  for (let i = 0; i < 34; i++) {
    const x = R() * size, y = R() * size, len = 6 + R() * 26;
    const axisAng = turnMarks ? 0 : Math.PI / 2;
    const ang = R() < 0.6 ? axisAng + (R() - 0.5) * 0.35 : R() * Math.PI;
    const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
    const w = R() < 0.75 ? 2 : 3;
    const br = Math.floor(190 + R() * 40);
    ca.strokeStyle = `rgba(${br},${br - 6},${br - 16},${0.11 + R() * 0.15})`;
    ca.lineWidth = w;
    ca.beginPath(); ca.moveTo(x, y); ca.lineTo(x + dx, y + dy); ca.stroke();
    cr.strokeStyle = `rgba(58,58,58,${0.22 + R() * 0.24})`;
    cr.lineWidth = w;
    cr.beginPath(); cr.moveTo(x, y); cr.lineTo(x + dx, y + dy); cr.stroke();
  }
  // worn-edge frame: solid base + broken bright dashes hugging the border.
  // UV borders land on box-face edges + chamfer bands => machined edges
  // read as rubbed-through bare metal.
  const er = parseInt(edge.slice(1, 3), 16), eg = parseInt(edge.slice(3, 5), 16), eb = parseInt(edge.slice(5, 7), 16);
  ca.strokeStyle = `rgba(${er},${eg},${eb},0.30)`; ca.lineWidth = 6;
  ca.strokeRect(0, 0, size, size);
  cr.strokeStyle = 'rgba(70,70,70,0.35)'; cr.lineWidth = 6;
  cr.strokeRect(0, 0, size, size);
  for (let i = 0; i < 58; i++) {
    const edgeI = Math.floor(R() * 4);
    const p = R() * size, len = 7 + R() * 18, th = 3 + R() * 4;
    const lift = 8 + R() * 26;
    ca.fillStyle = `rgba(${Math.min(255, er + lift)},${Math.min(255, eg + lift)},${Math.min(255, eb + lift)},${0.25 + R() * 0.22})`;
    cr.fillStyle = `rgba(56,56,56,${0.28 + R() * 0.26})`;
    if (edgeI === 0) { ca.fillRect(p, 0, len, th); cr.fillRect(p, 0, len, th); }
    else if (edgeI === 1) { ca.fillRect(p, size - th, len, th); cr.fillRect(p, size - th, len, th); }
    else if (edgeI === 2) { ca.fillRect(0, p, th, len); cr.fillRect(0, p, th, len); }
    else { ca.fillRect(size - th, p, th, len); cr.fillRect(size - th, p, th, len); }
  }
  // Albedo value floor: stacked dark washes can compound to near-black
  // patches which, on the receiver's stretched UVs, blow up into big flat
  // featureless "holes". Per-channel lighten-clamp bounds the dark end while
  // leaving midtone variance and bright wear untouched.
  const fb = [1, 3, 5].map((i) => Math.round(parseInt(base.slice(i, i + 2), 16) * 0.84));
  ca.globalCompositeOperation = 'lighten';
  ca.fillStyle = `rgb(${fb[0]},${fb[1]},${fb[2]})`;
  ca.fillRect(0, 0, size, size);
  ca.globalCompositeOperation = 'source-over';
  const map = new THREE.CanvasTexture(a);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  const rough = new THREE.CanvasTexture(r);
  rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
  rough.anisotropy = 8;
  return { map, rough };
}

// PMAG-style waffle grid for the magazine body (also reused as bump map).
function magWaffleTexture(size = 128) {
  const R = makeRNG(3307);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4f4130';                       // groove color
  ctx.fillRect(0, 0, size, size);
  const cell = 26, gap = 7;
  for (let y = gap; y < size - 2; y += cell + gap) {
    for (let x = gap; x < size - 2; x += cell + gap) {
      ctx.fillStyle = '#8a7355';                   // raised cell
      ctx.beginPath();
      ctx.roundRect(x, y, cell, cell, 6);
      ctx.fill();
      // top-left bevel light + bottom shade inside each cell
      ctx.fillStyle = 'rgba(255,238,210,0.22)';
      ctx.fillRect(x + 2, y + 2, cell - 4, 3);
      ctx.fillStyle = 'rgba(30,22,12,0.25)';
      ctx.fillRect(x + 2, y + cell - 5, cell - 4, 3);
    }
  }
  // wear noise
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,240,220,0.08)';
    ctx.fillRect(R() * size, R() * size, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Woven-fabric bump: over/under checker weave + thread gaps + noise. Reads
// as cloth weave under raking light (sleeves, cuffs, straps).
function weaveBumpTexture(size = 64) {
  const R = makeRNG(4407);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#7d7d7d';
  ctx.fillRect(0, 0, size, size);
  const cell = 4;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const over = ((x / cell) + (y / cell)) % 2 === 0;
      ctx.fillStyle = over ? '#989898' : '#666666';
      ctx.fillRect(x, y, cell - 1, cell - 1);
      // thread highlight ridge inside each pick
      ctx.fillStyle = over ? '#a8a8a8' : '#747474';
      if (over) ctx.fillRect(x, y + 1, cell - 1, 1);
      else ctx.fillRect(x + 1, y, 1, cell - 1);
    }
  }
  // gap lines between threads
  ctx.fillStyle = '#4e4e4e';
  for (let p = cell - 1; p < size; p += cell) {
    ctx.fillRect(p, 0, 1, size);
    ctx.fillRect(0, p, size, 1);
  }
  // noise so the weave doesn't read mechanical
  for (let i = 0; i < 700; i++) {
    const v = 90 + Math.floor(R() * 80);
    ctx.fillStyle = `rgba(${v},${v},${v},0.35)`;
    ctx.fillRect(R() * size, R() * size, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 5);
  return t;
}

// ---------------------------------------------------------------------------
// Tactical glove texture suite. Full color is BAKED into the albedo (material
// tints stay white) — the old glove was a near-black tint multiplied over a
// faint grey mottle, which quantized every feature into 2-3 sRGB steps and
// rendered as one flat blob at 720p. Shading is baked in too (knuckle
// top-light, crease darks, finger-side grime) so the hand reads even where
// the light is soft. Each builder returns { map, rough }.
// ---------------------------------------------------------------------------

// Dashed contrast stitching with a recessed seam channel, baked into both
// albedo and roughness (thread = matte bright, channel = shadowed).
function bakeStitch(ca, cr, x0, y0, x1, y1, alpha = 1) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  ca.strokeStyle = `rgba(44,34,18,${0.5 * alpha})`;
  ca.lineWidth = 3;
  ca.beginPath(); ca.moveTo(x0, y0); ca.lineTo(x1, y1); ca.stroke();
  cr.strokeStyle = `rgba(232,232,232,${0.35 * alpha})`;
  cr.lineWidth = 3;
  cr.beginPath(); cr.moveTo(x0, y0); cr.lineTo(x1, y1); cr.stroke();
  for (let t = 1.5; t + 4.5 < len; t += 8) {
    ca.strokeStyle = `rgba(224,207,164,${0.9 * alpha})`;
    ca.lineWidth = 2;
    ca.beginPath();
    ca.moveTo(x0 + ux * t, y0 + uy * t);
    ca.lineTo(x0 + ux * (t + 4.5), y0 + uy * (t + 4.5));
    ca.stroke();
    cr.strokeStyle = `rgba(246,246,246,${0.55 * alpha})`;
    cr.lineWidth = 2;
    cr.beginPath();
    cr.moveTo(x0 + ux * t, y0 + uy * t);
    cr.lineTo(x0 + ux * (t + 4.5), y0 + uy * (t + 4.5));
    cr.stroke();
  }
}

// Shared canvas pair setup: coyote-tan cordura base + cross weave + mottle.
function gloveCanvasPair(size, R) {
  const a = document.createElement('canvas'); a.width = a.height = size;
  const r = document.createElement('canvas'); r.width = r.height = size;
  const ca = a.getContext('2d'), cr = r.getContext('2d');
  ca.fillStyle = '#97835f'; ca.fillRect(0, 0, size, size);
  cr.fillStyle = '#d2d2d2'; cr.fillRect(0, 0, size, size); // matte fabric
  // cross weave (dense enough to read as cloth in the 2x crop)
  for (let y = 0; y < size; y += 3) {
    ca.fillStyle = y % 6 ? 'rgba(255,243,212,0.055)' : 'rgba(38,29,14,0.085)';
    ca.fillRect(0, y, size, 1);
    cr.fillStyle = y % 6 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    cr.fillRect(0, y, size, 1);
  }
  for (let x = 0; x < size; x += 3) {
    ca.fillStyle = x % 6 ? 'rgba(255,243,212,0.045)' : 'rgba(38,29,14,0.065)';
    ca.fillRect(x, 0, 1, size);
  }
  // sun-fade / sweat mottle (albedo) with correlated gloss (grease = shiny)
  for (let i = 0; i < 16; i++) {
    const x = R() * size, y = R() * size, rad = 16 + R() * 44, dark = R() < 0.5;
    const g = ca.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, dark ? 'rgba(44,34,18,0.15)' : 'rgba(242,228,192,0.13)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ca.fillStyle = g; ca.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    const gr = cr.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, dark ? 'rgba(120,120,120,0.22)' : 'rgba(255,255,255,0.12)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    cr.fillStyle = gr; cr.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  return { a, r, ca, cr };
}

// Finishing pass: speckle grain + a lighten-clamp floor so stacked dirt
// washes can never compound to near-black (the old blob failure mode).
function gloveFinish(ca, cr, size) {
  const R = makeRNG(9151);
  for (let i = 0; i < 550; i++) {
    ca.fillStyle = R() < 0.5 ? 'rgba(30,22,10,0.14)' : 'rgba(255,244,216,0.10)';
    ca.fillRect(R() * size, R() * size, 1, 1);
    cr.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)';
    cr.fillRect(R() * size, R() * size, 1, 1);
  }
  ca.globalCompositeOperation = 'lighten';
  ca.fillStyle = 'rgb(82,71,51)';
  ca.fillRect(0, 0, size, size);
  ca.globalCompositeOperation = 'source-over';
  const map = new THREE.CanvasTexture(ca.canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  const rough = new THREE.CanvasTexture(cr.canvas);
  rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
  rough.anisotropy = 8;
  return { map, rough };
}

// Back-of-hand / cuff panels: coyote fabric, double-stitched border frame,
// cross seams, dirt near the edges, and a baked top-light gradient.
function gloveBackMaps(size = 256) {
  const R = makeRNG(5513);
  const { ca, cr } = gloveCanvasPair(size, R);
  // baked top-light: bright crest fading to shadowed base — keeps the hand
  // plates reading dimensional even in flat fill
  const gTop = ca.createLinearGradient(0, 0, 0, size);
  gTop.addColorStop(0, 'rgba(255,240,206,0.13)');
  gTop.addColorStop(0.4, 'rgba(255,240,206,0)');
  gTop.addColorStop(0.72, 'rgba(22,16,8,0)');
  gTop.addColorStop(1, 'rgba(22,16,8,0.14)');
  ca.fillStyle = gTop; ca.fillRect(0, 0, size, size);
  // dirt accumulation toward the borders (where fingers/webbing meet)
  for (let i = 0; i < 12; i++) {
    const edge = Math.floor(R() * 4);
    const p = R() * size, rad = 12 + R() * 26;
    const x = edge === 0 ? p : edge === 1 ? p : edge === 2 ? rad * 0.4 : size - rad * 0.4;
    const y = edge === 0 ? rad * 0.4 : edge === 1 ? size - rad * 0.4 : p;
    const g = ca.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(30,23,11,0.14)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ca.fillStyle = g; ca.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    const gr = cr.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(130,130,130,0.20)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    cr.fillStyle = gr; cr.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // double-stitched border frame + cross seams (panel construction lines)
  for (const inset of [7, 13]) {
    bakeStitch(ca, cr, inset, inset, size - inset, inset);
    bakeStitch(ca, cr, size - inset, inset, size - inset, size - inset);
    bakeStitch(ca, cr, size - inset, size - inset, inset, size - inset);
    bakeStitch(ca, cr, inset, size - inset, inset, inset);
  }
  bakeStitch(ca, cr, 4, size * 0.62, size - 4, size * 0.62);
  bakeStitch(ca, cr, size * 0.34, 4, size * 0.34, size - 4, 0.8);
  return gloveFinish(ca, cr, size);
}

// Finger strip, wrap-aware for the capsule segments (after rotateX(90):
// u=0 faces -X, u=0.25 = back of finger / camera side, u=0.75 = palm side).
// Fabric back with flanking seams, leather inner stripe, grime on the finger
// SIDES (u 0 and 0.5 — the between-finger dirt), crease darks at both V ends
// so every joint gets a baked shadow ring.
function gloveFingerMaps(size = 192) {
  const R = makeRNG(6619);
  const { ca, cr } = gloveCanvasPair(size, R);
  // leather inner stripe (palm side) centered u=0.75, feathered edges
  const lx0 = size * 0.58, lx1 = size * 0.92, feather = size * 0.05;
  ca.fillStyle = '#75614b';
  ca.fillRect(lx0 + feather, 0, lx1 - lx0 - feather * 2, size);
  for (const [x, flip] of [[lx0, 0], [lx1 - feather, 1]]) {
    const g = ca.createLinearGradient(x, 0, x + feather, 0);
    g.addColorStop(flip, 'rgba(117,97,75,0)');
    g.addColorStop(1 - flip, 'rgba(117,97,75,1)');
    ca.fillStyle = g; ca.fillRect(x, 0, feather, size);
  }
  cr.fillStyle = 'rgba(158,158,158,0.9)'; // leather = glossier than fabric
  cr.fillRect(lx0 + feather, 0, lx1 - lx0 - feather * 2, size);
  // leather grain within the stripe
  for (let i = 0; i < 700; i++) {
    const x = lx0 + R() * (lx1 - lx0), y = R() * size;
    ca.fillStyle = R() < 0.55 ? 'rgba(42,32,20,0.18)' : 'rgba(210,190,158,0.12)';
    ca.fillRect(x, y, 1, 1);
  }
  // grime on the finger sides (u 0 and 0.5): baked between-finger dirt
  for (const cu of [0, 0.5, 1]) {
    const cx = cu * size, w = size * 0.085;
    const g = ca.createLinearGradient(cx - w, 0, cx + w, 0);
    g.addColorStop(0, 'rgba(28,21,10,0)');
    g.addColorStop(0.5, 'rgba(28,21,10,0.30)');
    g.addColorStop(1, 'rgba(28,21,10,0)');
    ca.fillStyle = g; ca.fillRect(cx - w, 0, w * 2, size);
    const gr = cr.createLinearGradient(cx - w, 0, cx + w, 0);
    gr.addColorStop(0, 'rgba(140,140,140,0)');
    gr.addColorStop(0.5, 'rgba(140,140,140,0.28)');
    gr.addColorStop(1, 'rgba(140,140,140,0)');
    cr.fillStyle = gr; cr.fillRect(cx - w, 0, w * 2, size);
  }
  // lengthwise seams flanking the fabric back panel
  bakeStitch(ca, cr, size * 0.13, 2, size * 0.13, size - 2, 0.85);
  bakeStitch(ca, cr, size * 0.37, 2, size * 0.37, size - 2, 0.85);
  // knuckle-back top-light: soft bright pad on the camera-facing band
  ca.save();
  ca.translate(size * 0.25, size * 0.46);
  ca.scale(1, 2.0);
  const hk = ca.createRadialGradient(0, 0, 0, 0, 0, size * 0.15);
  hk.addColorStop(0, 'rgba(250,236,198,0.20)');
  hk.addColorStop(1, 'rgba(0,0,0,0)');
  ca.fillStyle = hk; ca.fillRect(-size * 0.15, -size * 0.15, size * 0.3, size * 0.3);
  ca.restore();
  // crease darks at both V ends (joint shadow rings) + core lines
  for (const cv of [0.115, 0.885]) {
    const cy = cv * size, h = size * 0.045;
    const g = ca.createLinearGradient(0, cy - h, 0, cy + h);
    g.addColorStop(0, 'rgba(20,14,6,0)');
    g.addColorStop(0.5, 'rgba(20,14,6,0.34)');
    g.addColorStop(1, 'rgba(20,14,6,0)');
    ca.fillStyle = g; ca.fillRect(0, cy - h, size, h * 2);
    ca.fillStyle = 'rgba(16,11,4,0.5)';
    ca.fillRect(0, cy - 1, size, 2);
    cr.fillStyle = 'rgba(238,238,238,0.30)';
    cr.fillRect(0, cy - h * 0.6, size, h * 1.2);
  }
  // faint mid wrinkles
  for (const cv of [0.34, 0.5, 0.66]) {
    ca.fillStyle = 'rgba(30,22,10,0.10)';
    ca.fillRect(0, cv * size - 1, size, 2);
  }
  return gloveFinish(ca, cr, size);
}

// Palm / heel pads: worn tan leather — glossier than the fabric, heavy grain,
// crease lines, bright worn high spots.
function glovePalmMaps(size = 192) {
  const R = makeRNG(7717);
  const a = document.createElement('canvas'); a.width = a.height = size;
  const r = document.createElement('canvas'); r.width = r.height = size;
  const ca = a.getContext('2d'), cr = r.getContext('2d');
  ca.fillStyle = '#7a644a'; ca.fillRect(0, 0, size, size);
  cr.fillStyle = '#9e9e9e'; cr.fillRect(0, 0, size, size); // leather sheen
  for (let i = 0; i < 2600; i++) {
    ca.fillStyle = R() < 0.55 ? 'rgba(40,30,16,0.16)' : 'rgba(214,192,156,0.11)';
    ca.fillRect(R() * size, R() * size, R() < 0.7 ? 1 : 2, 1);
    cr.fillStyle = R() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)';
    cr.fillRect(R() * size, R() * size, 1, 1);
  }
  // crease lines with dirt settled in
  for (let i = 0; i < 24; i++) {
    const x = R() * size, y = R() * size, len = 14 + R() * 40;
    const ang = (R() - 0.5) * 1.1;
    ca.strokeStyle = `rgba(34,25,12,${0.20 + R() * 0.16})`;
    ca.lineWidth = 1 + R();
    ca.beginPath();
    ca.moveTo(x, y);
    ca.quadraticCurveTo(
      x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5 + (R() - 0.5) * 8,
      x + Math.cos(ang) * len, y + Math.sin(ang) * len
    );
    ca.stroke();
  }
  // worn-bright high spots, glossy in roughness
  for (let i = 0; i < 9; i++) {
    const x = R() * size, y = R() * size, rad = 14 + R() * 30;
    const g = ca.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(226,204,166,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ca.fillStyle = g; ca.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    const gr = cr.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(110,110,110,0.30)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    cr.fillStyle = gr; cr.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ca.globalCompositeOperation = 'lighten';
  ca.fillStyle = 'rgb(66,54,38)';
  ca.fillRect(0, 0, size, size);
  ca.globalCompositeOperation = 'source-over';
  const map = new THREE.CanvasTexture(a);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  const rough = new THREE.CanvasTexture(r);
  rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
  rough.anisotropy = 8;
  return { map, rough };
}

// Red-dot lens face: coated-glass gradient (dark center, teal-blue depth
// toward the rim), a violet AR-coating ring, and a baked bright sky-catch
// crescent top-left so the lens reads glassy even where the env map is dim.
function lensFaceTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const cx = size / 2, cy = size / 2, rad = size * 0.49;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.clip();
  // base coated-glass gradient (very dark center — real coated glass reads
  // near-black until a reflection crosses it)
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
  g.addColorStop(0, '#030907');
  g.addColorStop(0.6, '#061511');
  g.addColorStop(0.85, '#0a211c');
  g.addColorStop(1, '#0f2d27');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // ground reflection hint: slightly warmer dark band low
  const gg = ctx.createLinearGradient(0, cy, 0, size);
  gg.addColorStop(0, 'rgba(0,0,0,0)');
  gg.addColorStop(1, 'rgba(58,48,30,0.28)');
  ctx.fillStyle = gg;
  ctx.fillRect(0, cy, size, size / 2);
  // violet AR-coat ring near the rim
  for (const [rr, w, aA] of [[rad * 0.88, 7, 0.10], [rad * 0.90, 4, 0.16], [rad * 0.92, 2, 0.22]]) {
    ctx.strokeStyle = `rgba(158,96,224,${aA})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  // sky-catch crescent (upper-left, matches key light side). Kept faint —
  // from the hip the disc is foreshortened and a bright crescent + hotspot
  // compress into one bright blob that reads as a solid glossy marble.
  for (const [w, aA] of [[11, 0.06], [7, 0.12], [4, 0.26]]) {
    ctx.strokeStyle = `rgba(206,232,255,${aA})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(cx + 3, cy + 4, rad * 0.68, Math.PI * 1.02, Math.PI * 1.62);
    ctx.stroke();
  }
  // hot spot on the crescent
  const hs = ctx.createRadialGradient(cx - rad * 0.48, cy - rad * 0.42, 0, cx - rad * 0.48, cy - rad * 0.42, size * 0.10);
  hs.addColorStop(0, 'rgba(240,250,255,0.5)');
  hs.addColorStop(1, 'rgba(240,250,255,0)');
  ctx.fillStyle = hs;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Small 4-point star glint for the lens AR sparkle.
function glintTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2, cy = size / 2;
  for (const [len, th] of [[size * 0.46, size * 0.035], [size * 0.28, size * 0.035]]) {
    for (const ang of [0, Math.PI / 2]) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang + (len < size * 0.3 ? Math.PI / 4 : 0));
      const g = ctx.createLinearGradient(-len, 0, len, 0);
      g.addColorStop(0, 'rgba(190,225,255,0)');
      g.addColorStop(0.5, 'rgba(235,246,255,0.9)');
      g.addColorStop(1, 'rgba(190,225,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-len, -th, len * 2, th * 2);
      ctx.restore();
    }
  }
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.12);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(1, 'rgba(210,235,255,0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------------------
// Small mesh helpers (module scope). All add to `parent` and return the mesh.
// ---------------------------------------------------------------------------
function box(parent, mat, w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

// Cylinder along Z. rRear = radius at +Z end, rFront = radius at -Z end.
function cylZ(parent, mat, rRear, rFront, len, x, y, z, seg = 14, open = false) {
  const geo = new THREE.CylinderGeometry(rRear, rFront, len, seg, 1, open);
  geo.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function cylY(parent, mat, rTop, rBot, len, x, y, z, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, seg), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// Cylinder along X.
function cylX(parent, mat, r, len, x, y, z, seg = 12) {
  const geo = new THREE.CylinderGeometry(r, r, len, seg);
  geo.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// Tapered tube between two points (used for forearms/wrists). `twist`
// rotates the geometry around its own axis first — moves the UV wrap seam
// and de-syncs shared textures between segments.
function tubeBetween(parent, mat, r1, r2, a, b, seg = 12, twist = 0) {
  const from = new THREE.Vector3(a[0], a[1], a[2]);
  const to = new THREE.Vector3(b[0], b[1], b[2]);
  const dir = to.clone().sub(from);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(r2, r1, len, seg);
  if (twist) geo.rotateY(twist);
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(from).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(m);
  return m;
}

// Sphere at a point. Plugs tube junctions: an exposed cylinder end-cap disc
// reads as a flat dark hole from a near-axial camera, a sphere shades round.
function ballAt(parent, mat, r, x, y, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// Capsule along Z.
function capsuleZ(parent, mat, r, len, x, y, z, rx = 0, ry = 0, rz = 0) {
  const geo = new THREE.CapsuleGeometry(r, len, 3, 10);
  geo.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

// Articulated finger: a chain of capsule segments that extends along -Z and
// curls via +X rotations at each joint. `orient` (Euler) pre-rotates the curl
// plane so callers can wrap tubes/grips in any plane. Returns the root group;
// callers position/rotate the root at the knuckle.
function makeFinger(parent, mat, r, lens, curls, orient = null) {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  if (orient) inner.rotation.copy(orient);
  root.add(inner);
  let node = inner;
  for (let i = 0; i < lens.length; i++) {
    const seg = new THREE.Group();
    if (i > 0) seg.position.z = -lens[i - 1];
    seg.rotation.x = curls[i];
    node.add(seg);
    const rr = r * (1 - i * 0.1);
    const geo = new THREE.CapsuleGeometry(rr, Math.max(0.004, lens[i] - rr * 0.9), 3, 9);
    geo.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.z = -lens[i] / 2;
    seg.add(mesh);
    node = seg;
  }
  parent.add(root);
  return root;
}

function std(color, roughness, metalness, envMapIntensity = 1, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity, ...extra });
}

// ---------------------------------------------------------------------------
// Chamfered box: like BoxGeometry but every edge/corner is cut at 45 deg so
// key light can catch the bevels (machined-billet look). Flat facet normals.
// UVs: inset faces map to the texture interior; chamfer strips map to the
// texture border band, which is where metalMaps() bakes its worn-edge frame —
// so bevels automatically read as edge-worn metal.
// ---------------------------------------------------------------------------
function chamferedBoxGeometry(w, h, d, c) {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const cc = Math.min(c, hw * 0.9, hh * 0.9, hd * 0.9);
  const iw = hw - cc, ih = hh - cc, id = hd - cc;
  const PX = (sx, sy, sz) => [sx * hw, sy * ih, sz * id];
  const PY = (sx, sy, sz) => [sx * iw, sy * hh, sz * id];
  const PZ = (sx, sy, sz) => [sx * iw, sy * ih, sz * hd];
  const pos = [], uv = [];
  const B = 0.05; // interior inset for face UVs
  const E = 0.04; // chamfer band width (samples the baked worn-edge frame)
  function quad(a, b, c2, d2, uvs) {
    // two triangles: a,b,c2 + a,c2,d2
    pos.push(...a, ...b, ...c2, ...a, ...c2, ...d2);
    uv.push(uvs[0], uvs[1], uvs[2], uvs[3], uvs[4], uvs[5], uvs[0], uvs[1], uvs[4], uvs[5], uvs[6], uvs[7]);
  }
  function tri(a, b, c2) {
    pos.push(...a, ...b, ...c2);
    uv.push(0, 0, E, 0, 0, E);
  }
  const faceUV = [B, B, 1 - B, B, 1 - B, 1 - B, B, 1 - B];
  const bandUV = [0, 0, 1, 0, 1, E, 0, E];
  // 6 inset faces
  for (const s of [1, -1]) {
    quad(PX(s, -1, -1), PX(s, 1, -1), PX(s, 1, 1), PX(s, -1, 1), faceUV);
    quad(PY(-1, s, -1), PY(1, s, -1), PY(1, s, 1), PY(-1, s, 1), faceUV);
    quad(PZ(-1, -1, s), PZ(1, -1, s), PZ(1, 1, s), PZ(-1, 1, s), faceUV);
  }
  // 12 chamfer strips
  for (const sx of [1, -1]) for (const sy of [1, -1])
    quad(PX(sx, sy, -1), PX(sx, sy, 1), PY(sx, sy, 1), PY(sx, sy, -1), bandUV);
  for (const sx of [1, -1]) for (const sz of [1, -1])
    quad(PX(sx, -1, sz), PX(sx, 1, sz), PZ(sx, 1, sz), PZ(sx, -1, sz), bandUV);
  for (const sy of [1, -1]) for (const sz of [1, -1])
    quad(PY(-1, sy, sz), PY(1, sy, sz), PZ(1, sy, sz), PZ(-1, sy, sz), bandUV);
  // 8 corner triangles
  for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1])
    tri(PX(sx, sy, sz), PY(sx, sy, sz), PZ(sx, sy, sz));

  // Fix winding so all faces point outward (convex solid centered at origin),
  // then compute flat normals.
  const p = pos, u = uv;
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3(), ctr = new THREE.Vector3();
  for (let i = 0; i < p.length; i += 9) {
    va.fromArray(p, i); vb.fromArray(p, i + 3); vc.fromArray(p, i + 6);
    ab.subVectors(vb, va); ac.subVectors(vc, va);
    n.crossVectors(ab, ac);
    ctr.addVectors(va, vb).add(vc);
    if (n.dot(ctr) < 0) {
      for (let k = 0; k < 3; k++) { const t = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = t; }
      const ui = (i / 9) * 6;
      for (let k = 0; k < 2; k++) { const t = u[ui + 2 + k]; u[ui + 2 + k] = u[ui + 4 + k]; u[ui + 4 + k] = t; }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

// Chamfered box mesh helper (mirrors box(), with bevel size cs).
function cbox(parent, mat, w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cs = 0.002) {
  const m = new THREE.Mesh(chamferedBoxGeometry(w, h, d, cs), mat);
  m.position.set(x, y, z);
  if (rx || ry || rz) m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

// Torus ring around a tube axis (fabric folds, bezel lips).
function ringAt(parent, mat, R, r, p, dir, seg = 16) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(R, r, 7, seg), mat);
  m.position.set(p[0], p[1], p[2]);
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
  parent.add(m);
  return m;
}

// ===========================================================================
export class Viewmodel {
  constructor(engine) {
    this.engine = engine;
    this.scene = engine.viewmodelScene;
    this.root = new THREE.Group();
    this.scene.add(this.root);

    // Lighting that matches the world's high warm sun (screen-left), plus a
    // faint cool rim from the right so dark metal edges never go dead black.
    // Hemi tracks the world's ambient level (0.72): any higher and upward
    // faces catch enough sky fill that the whole rail band reads silver.
    const key = new THREE.DirectionalLight(0xffdcae, 3.3);
    key.position.set(-0.7, 0.95, 0.35);
    this.scene.add(key);
    const fill = new THREE.HemisphereLight(0x96abc6, 0x60523f, 0.72);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xbcd2ff, 0.4);
    rim.position.set(0.7, 0.25, -0.55);
    this.scene.add(rim);
    // Chest bounce: weak warm fill from the player's torso. Key + rim are
    // both frontal, so every rear-facing surface (optic mount back, BUIS,
    // deck steps) otherwise merges into one unreadable black hole.
    const bounce = new THREE.DirectionalLight(0xcfc0ae, 0.68);
    bounce.position.set(0.16, -0.30, 0.85); // from below-behind: never hits
    // top faces, so the glossy muzzle/rail tops keep their key-light-only look
    this.scene.add(bounce);

    this.buildRifle();

    // Pose targets (viewmodel-camera space).
    // Composition comes from POSITION, not rotation: the bore stays nearly
    // parallel to the view direction so perspective converges the barrel
    // toward the screen-center vanishing point (classic FPS 3/4-from-behind).
    this.hipPos = new THREE.Vector3(0.17, -0.15, -0.37);
    this.hipRot = new THREE.Euler(0.0, 0.035, 0.012);
    // ADS: optic axis (x=0, y=+0.0615) must land exactly on screen center.
    this.adsPos = new THREE.Vector3(0.0, -0.0615, -0.162);
    this.adsRot = new THREE.Euler(0, 0, 0);
    this.sprintPos = new THREE.Vector3(0.10, -0.22, -0.44);
    this.sprintRot = new THREE.Euler(0.42, -0.52, 0.16);
    this.reloadPos = new THREE.Vector3(0.12, -0.27, -0.38);
    this.reloadRot = new THREE.Euler(0.5, 0.2, 0.32);

    this.pos = this.hipPos.clone();
    this.rot = new THREE.Euler().copy(this.hipRot);

    // Dynamics
    this.swayX = 0; this.swayY = 0;
    this.kickPos = 0; this.kickRot = 0; this.kickRoll = 0; this.kickYaw = 0;
    this.bobT = 0;
    this.aimFrac = 0;
    this.reloadT = -1; // <0 = not reloading
    this.reloadDuration = 2.05;
    this.muzzleFlashT = 99;
    this.flashScale = 1;
  }

  // =========================================================================
  // Geometry
  // =========================================================================
  buildRifle() {
    // ---- Material set -----------------------------------------------------
    const camo = camoTexture();
    const waffle = magWaffleTexture();
    const weave = weaveBumpTexture();
    const gBack = gloveBackMaps();
    const gFing = gloveFingerMaps();
    const gPalm = glovePalmMaps();
    // Thumb variant: finger strip shifted a quarter turn so the fabric back
    // band (u 0.25) lands on the left thumb's camera-facing u=0 flank.
    const gThumbMap = gFing.map.clone(); gThumbMap.offset.x = 0.25;
    const gThumbRough = gFing.rough.clone(); gThumbRough.offset.x = 0.25;
    // Baked-albedo wear families (material tint stays near-white so worn
    // edges can be brighter than the base anodize)
    // aspect = physical length/height a face maps per texel (receiver slabs
    // ~5x, rail bases ~8x): smudges are pre-squashed so they land round.
    // Edge tones sit ~1.5 stops over base, no more: brighter worn edges
    // multiply with sky fill/env at grazing angles and the flats go silver.
    const wearRecv = metalMaps(2101, { base: '#2e2d32', edge: '#57544d', aspect: 5 });
    const wearDark = metalMaps(2103, { base: '#242323', edge: '#48443d', aspect: 2 });
    const wearSteel = metalMaps(2102, { base: '#1f2226', edge: '#545860', turnMarks: true });
    const wearRail = metalMaps(2104, { base: '#383734', edge: '#615c52', aspect: 8 });

    const metal = (wear, color, rough, met, env, extra = {}) =>
      new THREE.MeshStandardMaterial({
        color, map: wear.map, roughnessMap: wear.rough, roughness: rough,
        metalness: met, envMapIntensity: env, ...extra,
      });

    const M = this.mats = {
      // Three clearly split families: near-black machined/steel core, light
      // machined-aluminum contact surfaces, warm FDE polymer furniture.
      // Kept well below the sky's specular energy: at metalness ~0.6 these
      // top surfaces mirrored the bright env and the whole gun read chrome.
      // (wearRail's baked worn-edge tone covers every picatinny bevel, so the
      // tint must sit darker than it looks on paper or the rail reads silver)
      rail:  metal(wearRail, 0x807d76, 0.74, 0.38, 0.55), // machined rail (worn gunmetal)
      deck:  metal(wearRail, 0x6b6a65, 0.78, 0.34, 0.48), // riser band under rail
      recvU: metal(wearRecv, 0xffffff, 0.92, 0.40, 0.72), // upper receiver (dark graphite)
      recvL: metal(wearRecv, 0xc9c9c9, 0.95, 0.38, 0.72), // lower receiver (darker)
      hg:    metal(wearDark, 0xffffff, 1.0, 0.45, 0.75),  // handguard (near-black, matte)
      hgFlat: metal(wearDark, 0xffffff, 1.0, 0.45, 0.75, { flatShading: true }),
      steel: metal(wearSteel, 0xffffff, 0.52, 0.9, 0.75), // nitride barrel/muzzle
      steelFlat: metal(wearSteel, 0xffffff, 0.52, 0.9, 0.75, { flatShading: true }),
      steelB: std(0x484c53, 0.3, 0.9, 0.6),             // steel accents (wear)
      poly: std(0x282a2d, 0.85, 0.05, 0.55),            // furniture polymer (matte)
      polyD: std(0x1e2023, 0.92, 0.03, 0.4),            // rubber pads / grooves
      fde: new THREE.MeshStandardMaterial({
        map: waffle, bumpMap: waffle, bumpScale: 1.6,
        roughness: 0.85, metalness: 0.04, envMapIntensity: 0.55,
      }),                                               // FDE waffle mag body
      fdeS: std(0x73604a, 0.88, 0.04, 0.5),             // FDE solid (grip/panels)
      fdeD: std(0x594c3c, 0.90, 0.04, 0.45),            // FDE dark (floor plate)
      optic: metal(wearRecv, 0x7e8496, 0.72, 0.60, 1.00), // optic body (cool blue-gray)
      opticIn: std(0x0f1013, 0.85, 0.2, 0.2, { side: THREE.BackSide }),
      recess: std(0x121316, 0.88, 0.25, 0.25),          // fake slots/holes
      // Glove family: coyote-tan tactical gloves, all albedo BAKED into the
      // maps (white tints). The old 0x232528 tint crushed every texture
      // feature to 2-3 sRGB steps and the hand read as one flat charcoal
      // blob — the "grey mannequin claw" note. Value plan: fabric back sits
      // ABOVE the sleeve camo average, knuckle armor clearly below it, so
      // pads/stitching read as graphic contrast at 720p.
      glove: new THREE.MeshStandardMaterial({
        map: gBack.map, roughnessMap: gBack.rough, roughness: 1.0,
        metalness: 0, envMapIntensity: 0.55, bumpMap: gBack.map, bumpScale: 0.35,
      }),                                               // back-of-hand/cuff fabric
      gloveFinger: new THREE.MeshStandardMaterial({
        map: gFing.map, roughnessMap: gFing.rough, roughness: 1.0,
        metalness: 0, envMapIntensity: 0.55, bumpMap: gFing.map, bumpScale: 0.4,
      }),                                               // finger segments (wrap-aware)
      gloveThumb: new THREE.MeshStandardMaterial({
        map: gThumbMap, roughnessMap: gThumbRough, roughness: 1.0,
        metalness: 0, envMapIntensity: 0.55, bumpMap: gThumbMap, bumpScale: 0.4,
      }),                                               // left thumb (u-shifted strip)
      glovePalm: new THREE.MeshStandardMaterial({
        map: gPalm.map, roughnessMap: gPalm.rough, roughness: 1.0, color: 0xddd2c2,
        metalness: 0, envMapIntensity: 0.7, bumpMap: gPalm.map, bumpScale: 0.3,
      }),                                               // leather palm/heel pads
      // (mild dim tint: the trigger-hand palm face sat in the same tan band
      // as the FDE buffer tube right above it and the two merged)
      gloveCuff: new THREE.MeshStandardMaterial({
        map: gBack.map, roughnessMap: gBack.rough, roughness: 1.0, color: 0xd4ccbe,
        metalness: 0, envMapIntensity: 0.5, bumpMap: gBack.map, bumpScale: 0.35,
      }),                                               // wrist cuff (dimmed: the
      // up-facing wrist tube catches the key square-on and outshone the hand)
      gloveD: std(0x312c23, 0.95, 0, 0.4),              // dark webbing / velcro
      gloveSeam: std(0x141109, 0.96, 0, 0.25),          // dark seams between fingers
      strap: std(0x6e6349, 0.92, 0, 0.55, { bumpMap: weave, bumpScale: 0.7 }), // tan nylon strap
      stitch: std(0xb7a77e, 0.8, 0, 0.7),               // contrast stitching / edging
      knuck: std(0x3b342a, 0.7, 0.02, 0.55),            // molded knuckle armor ribs
      knuckPad: std(0x453c2f, 0.68, 0.02, 0.55),        // per-finger knuckle pads
      sleeve: new THREE.MeshStandardMaterial({
        map: camo, roughness: 0.95, metalness: 0,
        envMapIntensity: 0.5, bumpMap: weave, bumpScale: 0.8,
      }),
      cuff: new THREE.MeshStandardMaterial({
        color: 0x2b2716, roughness: 0.95, metalness: 0,
        envMapIntensity: 0.5, bumpMap: weave, bumpScale: 1.0,
      }),                                               // elastic cuff band (dark but
      // clearly fabric — near-black here reads as a hole in the arm, not cloth)
    };

    const g = new THREE.Group();
    this.rifle = g;

    this._buildBarrelGroup(g, M);
    this._buildHandguard(g, M);
    this._buildReceivers(g, M);
    this._buildMagazine(g, M);
    this._buildGripStock(g, M);
    this._buildOptic(g, M);
    this._buildHands(g, M);
    this._buildFlash(g);

    this.root.add(g);
  }

  // ---- Barrel, gas system, muzzle device ---------------------------------
  _buildBarrelGroup(g, M) {
    // Exposed barrel section ahead of the handguard (handguard ends z=-0.385)
    cylZ(g, M.steel, 0.0102, 0.0096, 0.10, 0, 0, -0.415, 14);
    // Barrel shoulder where it exits the rail
    cylZ(g, M.steel, 0.0118, 0.0118, 0.012, 0, 0, -0.389, 14);
    // Low-profile gas block + short visible gas tube stub going back into rail
    box(g, M.steel, 0.019, 0.021, 0.024, 0, 0.003, -0.405);
    cylZ(g, M.steel, 0.0026, 0.0026, 0.05, 0, 0.0145, -0.392, 8);
    // Gas block set screws (left face, camera side)
    cylX(g, M.recess, 0.0018, 0.002, -0.0098, -0.003, -0.400, 6);
    cylX(g, M.recess, 0.0018, 0.002, -0.0098, -0.003, -0.409, 6);
    // Crush washer + dark seam ring where the device torques against it
    cylZ(g, M.steel, 0.0122, 0.0100, 0.005, 0, 0, -0.4635, 12);
    cylZ(g, M.recess, 0.0119, 0.0119, 0.0022, 0, 0, -0.4662, 12);
    // Birdcage flash hider body — chunkier than the barrel so it reads
    cylZ(g, M.steelFlat, 0.0126, 0.0118, 0.052, 0, 0, -0.492, 12);
    // Wrench flats at the rear of the device
    cbox(g, M.steelFlat, 0.0252, 0.016, 0.008, 0, 0, -0.4705, 0, 0, 0, 0.0018);
    // Vent slots — thin near-black boxes crossing the body read as cuts
    for (let i = 0; i < 3; i++) {
      box(g, M.recess, 0.0262, 0.0034, 0.034, 0, 0, -0.488, 0, 0, (i * Math.PI) / 3);
    }
    // Front crown ring (bright worn steel — reads end-on) + dark bore
    cylZ(g, M.steelB, 0.0128, 0.0128, 0.009, 0, 0, -0.5155, 12);
    cylZ(g, M.recess, 0.0068, 0.0068, 0.003, 0, 0, -0.5195, 10);
  }

  // ---- Free-float M-LOK handguard -----------------------------------------
  _buildHandguard(g, M) {
    // Octagonal tube: flats at top/bottom/sides (flat-shaded for crisp facets)
    const tubeGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.267, 8, 1, true);
    tubeGeo.rotateX(Math.PI / 2);
    tubeGeo.rotateZ(Math.PI / 8);
    const tube = new THREE.Mesh(tubeGeo, M.hgFlat);
    tube.position.set(0, 0, -0.2515);
    g.add(tube);

    // Front cap ring + rear barrel-nut collar
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0188, 0.0188, 0.010, 8), M.hgFlat);
    cap.geometry.rotateX(Math.PI / 2); cap.geometry.rotateZ(Math.PI / 8);
    cap.position.set(0, 0, -0.381);
    g.add(cap);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.0198, 0.0198, 0.020, 8), M.hgFlat);
    collar.geometry.rotateX(Math.PI / 2); collar.geometry.rotateZ(Math.PI / 8);
    collar.position.set(0, 0, -0.127);
    g.add(collar);

    // Top riser web + rail base (rail ridges are added in _buildReceivers so
    // they run continuously across handguard + receiver).
    cbox(g, M.hg, 0.014, 0.010, 0.265, 0, 0.0212, -0.2515, 0, 0, 0, 0.0016);
    cbox(g, M.rail, 0.021, 0.005, 0.265, 0, 0.0285, -0.2515, 0, 0, 0, 0.0013);
    // Worn-edge highlight along the octagon's top-left long edge (the edge
    // the key light rakes) — reads as a machined chamfer catching light
    box(g, M.rail, 0.0013, 0.0013, 0.258, -0.00695, 0.0167, -0.2515, 0, 0, 0.393);

    // M-LOK slots: left, bottom, right rows (fake recesses, slightly proud)
    const flat = 0.018 * Math.cos(Math.PI / 8); // 0.01663 — distance to flat
    for (let i = 0; i < 5; i++) {
      const z = -0.152 - i * 0.045;
      box(g, M.recess, 0.0014, 0.0066, 0.034, -flat - 0.0004, 0, z); // left
      box(g, M.recess, 0.0014, 0.0066, 0.034, flat + 0.0004, 0, z);  // right
      box(g, M.recess, 0.0066, 0.0014, 0.034, 0, -flat - 0.0004, z); // bottom
    }

    // QD sling socket on left flat near the rear
    cylX(g, M.hg, 0.006, 0.0024, -flat - 0.0008, -0.006, -0.148, 12);
    cylX(g, M.recess, 0.0035, 0.0028, -flat - 0.0016, -0.006, -0.148, 10);

    // Barrel-nut clamp screws on the collar (left face, camera side)
    cylX(g, M.steelB, 0.0022, 0.0020, -0.0202, -0.006, -0.122, 8);
    cylX(g, M.steelB, 0.0022, 0.0020, -0.0202, -0.006, -0.132, 8);
    cylX(g, M.recess, 0.0011, 0.0012, -0.0214, -0.006, -0.122, 6);
    cylX(g, M.recess, 0.0011, 0.0012, -0.0214, -0.006, -0.132, 6);

    // FDE polymer M-LOK rail covers (left + right flats near the muzzle end)
    box(g, M.fdeS, 0.0018, 0.0085, 0.052, -flat - 0.0012, 0, -0.345);
    box(g, M.fdeS, 0.0018, 0.0085, 0.052, flat + 0.0012, 0, -0.345);
    box(g, M.fdeD, 0.0018, 0.0085, 0.040, -flat - 0.0012, 0, -0.196);

    // FDE polymer handstop fin under the front of the rail
    box(g, M.fdeS, 0.010, 0.011, 0.022, 0, -flat - 0.005, -0.336, 0.35);
    box(g, M.fdeD, 0.010, 0.006, 0.013, 0, -flat - 0.0105, -0.343, 0.55);
  }

  // ---- Upper + lower receiver, controls, rails, BUIS ----------------------
  _buildReceivers(g, M) {
    // Upper receiver: stepped chamfered slabs read as machined billet —
    // bevels catch the key light along the long edges
    cbox(g, M.recvU, 0.036, 0.038, 0.220, 0, 0.001, -0.005, 0, 0, 0, 0.003);   // main
    // Top deck: light machined riser band under the rail. MUST be at least
    // as wide as the main box: a narrower deck leaves an open trench along
    // the main box's top chamfer, and hip-camera rays dive through it into
    // the hollow receiver (backface-culled right flank), hitting the
    // ejection door's inner face / the street behind — the "floating dark
    // slab" and "milky ghost band" bugs. 0.1mm proud also avoids z-fighting.
    cbox(g, M.deck, 0.0362, 0.010, 0.220, 0, 0.024, -0.005, 0, 0, 0, 0.0022);  // top deck
    cbox(g, M.recvU, 0.0365, 0.014, 0.150, 0, -0.006, 0.020, 0, 0, 0, 0.0025); // side bulge
    // Rail base over receiver
    cbox(g, M.rail, 0.021, 0.005, 0.190, 0, 0.0285, -0.020, 0, 0, 0, 0.0013);

    // Continuous picatinny teeth across handguard + receiver. Diamond
    // profile (45-deg flanks) instead of square boxes: each tooth crest
    // catches a specular line like a real machined rail.
    const ridgeGeo = new THREE.BoxGeometry(0.0149, 0.0149, 0.0047);
    ridgeGeo.rotateZ(Math.PI / 4);
    ridgeGeo.scale(1, 0.17, 1);
    for (let z = -0.376; z <= 0.070; z += 0.010) {
      const tooth = new THREE.Mesh(ridgeGeo, M.rail);
      tooth.position.set(0, 0.0329, z);
      g.add(tooth);
    }

    // Upper/lower seam line
    box(g, M.recess, 0.0368, 0.0012, 0.150, 0, -0.0135, 0.020);

    // --- Right side (top-rear IS visible from the hip camera: sight-lines
    // pass over the deck's right edge and rake down this flank) ---
    // Ejection port recess (dark interior slot)
    box(g, M.recess, 0.0008, 0.021, 0.062, 0.0174, 0.001, -0.005);
    // Port door: light machined steel, slightly yawed toward the key light.
    // As a bare texture-averaged plate it rakes into a big featureless dark
    // rectangle from the hip view (the sight-line passes over the deck edge
    // and down this flank). Bright hinge rod on the TOP edge + steel rib
    // across the visible inner face break the flat patch up.
    // (low-metalness details: steelB here would mirror the dark ground env
    // and vanish — diffuse recvL actually catches the key light)
    box(g, M.deck, 0.0022, 0.018, 0.058, 0.0172, 0.001, -0.005, 0, 0.06, 0);
    cylZ(g, M.recvL, 0.0013, 0.0013, 0.060, 0.0161, 0.0102, -0.005, 8);
    box(g, M.recvL, 0.0007, 0.0016, 0.054, 0.0159, 0.002, -0.005, 0, 0.06, 0);
    // Brass deflector wedge + forward assist (kept close to the flank so
    // its shadowed back face never floats past the silhouette)
    box(g, M.recvU, 0.006, 0.013, 0.014, 0.0158, 0.004, 0.032, 0, -0.28, 0);
    cylZ(g, M.recvU, 0.0066, 0.0066, 0.016, 0.0185, 0.010, 0.085, 10);
    cylZ(g, M.steelB, 0.0052, 0.0052, 0.005, 0.0185, 0.010, 0.0955, 10);
    // Mag release button
    box(g, M.recvL, 0.004, 0.011, 0.015, 0.018, -0.019, 0.030);
    cylX(g, M.steelB, 0.0042, 0.004, 0.0195, -0.019, 0.030, 10);

    // --- Left side (faces the camera — hero details) ---
    // Bolt catch: chamfered paddle (a sharp box this size reads as a bare
    // dark rectangle at 720p) + plunger pin witness dot
    cbox(g, M.recvL, 0.003, 0.016, 0.013, -0.0185, -0.002, 0.018, 0, 0, 0, 0.0011);
    cbox(g, M.recvL, 0.0038, 0.009, 0.009, -0.0195, 0.006, 0.012, 0, 0, 0, 0.0011);
    cylX(g, M.steelB, 0.0014, 0.0014, -0.0202, -0.002, 0.018, 8);
    // Safety selector: hub + lever pointing forward (FIRE)
    cylX(g, M.recvL, 0.0048, 0.0035, -0.0188, -0.012, 0.080, 12);
    box(g, M.recvL, 0.0032, 0.0055, 0.020, -0.0195, -0.012, 0.070);
    box(g, M.steelB, 0.0026, 0.0045, 0.0045, -0.0198, -0.012, 0.062);
    // Takedown + pivot pins
    cylX(g, M.steelB, 0.0032, 0.0022, -0.0182, -0.022, 0.098, 10);
    cylX(g, M.steelB, 0.0032, 0.0022, -0.0182, -0.022, -0.008, 10);
    // Trigger/hammer pins (small witness dots on the lower's left flank)
    cylX(g, M.steelB, 0.0017, 0.0016, -0.0172, -0.026, 0.052, 8);
    cylX(g, M.steelB, 0.0017, 0.0016, -0.0172, -0.032, 0.036, 8);

    // Charging handle: shaft + T-wings + latch (top rear)
    box(g, M.hg, 0.012, 0.006, 0.045, 0, 0.0225, 0.118);
    cbox(g, M.hg, 0.034, 0.0055, 0.012, 0, 0.0225, 0.134, 0, 0, 0, 0.0013);
    box(g, M.hg, 0.007, 0.006, 0.013, -0.0195, 0.0225, 0.131, 0, 0.30, 0);
    box(g, M.hg, 0.007, 0.006, 0.013, 0.0195, 0.0225, 0.131, 0, -0.30, 0);
    box(g, M.steelB, 0.006, 0.004, 0.012, -0.0222, 0.022, 0.126, 0, 0.25, 0);
    // Shallow machining groove along the upper's left flank (breaks the slab)
    box(g, M.recess, 0.0006, 0.0018, 0.190, -0.0182, 0.012, -0.020);
    // Forge mark circle + detent pin dot on the otherwise-bare rear flank
    // patch (between charging handle and lower) so it stops reading as a void
    cylX(g, M.recess, 0.0028, 0.0008, -0.01805, 0.009, 0.042, 10);
    cylX(g, M.steelB, 0.0012, 0.0010, -0.0184, 0.014, 0.028, 8);

    // --- Lower receiver + magwell + trigger group ---
    cbox(g, M.recvL, 0.033, 0.036, 0.135, 0, -0.026, 0.045, 0, 0, 0, 0.0028);
    cbox(g, M.recvL, 0.035, 0.052, 0.058, 0, -0.055, 0.012, 0.10, 0, 0, 0.0028);  // magwell
    cbox(g, M.recvL, 0.0375, 0.009, 0.061, 0, -0.079, 0.019, 0.10, 0, 0, 0.002);  // flare lip
    // Serial plate (slightly proud bright inset on the magwell's left face)
    box(g, M.rail, 0.0008, 0.008, 0.018, -0.0178, -0.052, 0.012, 0.10, 0, 0);
    // Shallow lightening recess on the magwell front-left corner
    box(g, M.recess, 0.0006, 0.020, 0.010, -0.0177, -0.055, -0.008, 0.10, 0, 0);
    // Trigger guard + trigger
    box(g, M.recvL, 0.007, 0.0035, 0.056, 0, -0.0855, 0.074);
    box(g, M.recvL, 0.007, 0.017, 0.004, 0, -0.077, 0.0485, 0.18, 0, 0);
    box(g, M.steelB, 0.0045, 0.019, 0.005, 0, -0.062, 0.070, 0.20, 0, 0);

    // --- Folded backup iron sights ---
    // Rear BUIS (behind optic). NOTE: this block sits large in the hip view
    // right of the optic — in flat near-black (old M.hg) it rendered as THE
    // mystery "floating dark slab". Textured graphite + a lighter folded
    // leaf + knob/screw jewelry make it read as a folded sight instead.
    cbox(g, M.recvU, 0.022, 0.0065, 0.030, 0, 0.0385, 0.058, 0, 0, 0, 0.0016);
    cbox(g, M.rail, 0.015, 0.0045, 0.020, 0, 0.0440, 0.055, 0, 0, 0, 0.0012); // folded leaf
    box(g, M.recess, 0.0158, 0.0016, 0.0075, 0, 0.0448, 0.0505);              // aperture slot
    cylX(g, M.steelB, 0.0036, 0.006, -0.0128, 0.0385, 0.064, 8);              // windage knob (camera side)
    cylX(g, M.recess, 0.0018, 0.0012, -0.0162, 0.0385, 0.064, 6);
    cylX(g, M.steel, 0.0019, 0.023, 0, 0.0385, 0.066, 8);                     // hinge pin
    // Front BUIS (front of rail)
    cbox(g, M.recvU, 0.019, 0.0055, 0.024, 0, 0.0370, -0.355, 0, 0, 0, 0.0014);
    cbox(g, M.rail, 0.010, 0.004, 0.016, 0, 0.0418, -0.358, 0, 0, 0, 0.0010);
    box(g, M.recess, 0.0028, 0.0045, 0.0028, 0, 0.0425, -0.358);              // front post peek
  }

  // ---- Curved FDE magazine w/ waffle texture ------------------------------
  _buildMagazine(g, M) {
    const mag = new THREE.Group();
    this.mag = mag;
    mag.position.set(0, -0.081, 0.012);
    mag.rotation.x = 0.10;
    this._magBasePos = mag.position.clone();
    this._magBaseRotX = 0.10;

    // Four stacked segments following the AK-ish 30rd curve
    const segs = [
      { y: -0.024, z: 0.000, rx: 0.06 },
      { y: -0.0695, z: 0.010, rx: 0.18 },
      { y: -0.113, z: 0.026, rx: 0.31 },
      { y: -0.1545, z: 0.047, rx: 0.44 },
    ];
    for (const s of segs) {
      cbox(mag, M.fde, 0.0255, 0.050, 0.056, 0, s.y, s.z, s.rx, 0, 0, 0.002);
      // front + rear spine strips
      box(mag, M.fdeS, 0.0257, 0.048, 0.007, 0, s.y, s.z - 0.0262, s.rx, 0, 0);
      box(mag, M.fdeS, 0.0257, 0.048, 0.007, 0, s.y, s.z + 0.0262, s.rx, 0, 0);
      // Round-count witness holes down the left spine edge (dark dots)
      box(mag, M.recess, 0.0008, 0.0032, 0.0032, -0.0130, s.y + 0.010, s.z - 0.020, s.rx, 0, 0);
      box(mag, M.recess, 0.0008, 0.0032, 0.0032, -0.0130, s.y - 0.012, s.z - 0.017, s.rx, 0, 0);
    }
    // Floor plate + lip
    cbox(mag, M.fdeD, 0.029, 0.009, 0.062, 0, -0.180, 0.062, 0.47, 0, 0, 0.0018);
    box(mag, M.fdeD, 0.0305, 0.004, 0.066, 0, -0.1745, 0.0605, 0.47, 0, 0);

    g.add(mag);
  }

  // ---- Pistol grip, buffer tube, stock ------------------------------------
  _buildGripStock(g, M) {
    // Grip: FDE core + backstrap swell + finger grooves + floor plug
    cbox(g, M.fdeS, 0.026, 0.088, 0.036, 0, -0.090, 0.122, -0.30, 0, 0, 0.0028);
    cbox(g, M.fdeS, 0.024, 0.075, 0.011, 0, -0.086, 0.142, -0.38, 0, 0, 0.002);
    box(g, M.fdeD, 0.027, 0.004, 0.012, 0, -0.070, 0.1065, -0.30, 0, 0);
    box(g, M.fdeD, 0.027, 0.004, 0.012, 0, -0.088, 0.1122, -0.30, 0, 0);
    box(g, M.fdeD, 0.027, 0.004, 0.012, 0, -0.106, 0.1178, -0.30, 0, 0);
    box(g, M.fdeD, 0.028, 0.009, 0.040, 0, -0.131, 0.136, -0.30, 0, 0);

    // Receiver end plate + castle nut + a short FDE buffer-tube stub. The
    // stock itself is intentionally NOT modeled: it anchors at the player's
    // shoulder and must never appear in frame (COD viewmodels omit it too).
    // Plate spans the FULL upper+lower cross-section: the boxes' bare rear
    // end faces otherwise show around it as big flat bounce-lit quads.
    cbox(g, M.recvL, 0.038, 0.056, 0.006, 0, -0.008, 0.108, 0, 0, 0, 0.0016);
    // Horizontal serration cuts across the plate (visible from the shooter)
    box(g, M.recess, 0.030, 0.0012, 0.0022, 0, 0.006, 0.1105);
    box(g, M.recess, 0.030, 0.0012, 0.0022, 0, -0.020, 0.1105);
    box(g, M.recess, 0.030, 0.0012, 0.0022, 0, -0.028, 0.1105);
    cylZ(g, M.recvL, 0.0165, 0.0165, 0.009, 0, 0.002, 0.114, 10);
    // Castle-nut wrench notches (dark cuts around the visible upper-left arc)
    for (const aN of [2.1, 2.75, 3.4]) {
      box(g, M.recess, 0.004, 0.0034, 0.0045, Math.cos(aN) * 0.0163, 0.002 + Math.sin(aN) * 0.0163, 0.114, 0, 0, aN);
    }
    cylZ(g, M.fdeD, 0.0135, 0.0132, 0.035, 0, 0.002, 0.134, 14);
    // Buffer tube position-index holes along its underside-left
    box(g, M.recess, 0.0012, 0.0024, 0.0024, -0.0093, -0.0079, 0.128, 0, 0, 0.81);
    box(g, M.recess, 0.0012, 0.0024, 0.0024, -0.0093, -0.0079, 0.140, 0, 0, 0.81);
    // QD sling loop on the end plate (left)
    cylX(g, M.steelB, 0.0065, 0.0022, -0.0185, -0.008, 0.110, 10);
    cylX(g, M.recess, 0.0038, 0.0026, -0.0192, -0.008, 0.110, 8);
  }

  // ---- Red dot optic (Aimpoint micro style) --------------------------------
  _buildOptic(g, M) {
    const O = new THREE.Group();
    O.position.set(0, 0, -0.030); // optic center station
    g.add(O);
    const AX = 0.0615; // optical axis height — ADS pose depends on this

    // Rail clamp mount + side plates + clamp screws (chamfered slabs).
    // Left plate faces the camera — it gets hex screw heads with dark sockets.
    cbox(O, M.optic, 0.024, 0.012, 0.052, 0, 0.0395, 0, 0, 0, 0, 0.0018);
    cbox(O, M.optic, 0.0055, 0.014, 0.052, 0.0125, 0.0395, 0, 0, 0, 0, 0.0012);
    cbox(O, M.optic, 0.0055, 0.014, 0.052, -0.0125, 0.0395, 0, 0, 0, 0, 0.0012);
    cylX(O, M.steelB, 0.0028, 0.003, 0.0148, 0.0395, -0.014, 8);
    cylX(O, M.steelB, 0.0028, 0.003, 0.0148, 0.0395, 0.014, 8);
    cylX(O, M.steelB, 0.0028, 0.0026, -0.0148, 0.0395, -0.014, 8);
    cylX(O, M.steelB, 0.0028, 0.0026, -0.0148, 0.0395, 0.014, 8);
    cylX(O, M.recess, 0.0013, 0.0010, -0.0164, 0.0395, -0.014, 6);
    cylX(O, M.recess, 0.0013, 0.0010, -0.0164, 0.0395, 0.014, 6);
    // Body base
    cbox(O, M.optic, 0.027, 0.010, 0.048, 0, 0.050, 0, 0, 0, 0, 0.0018);

    // Main tube (open ended) + dark inner liner
    cylZ(O, M.optic, 0.0152, 0.0152, 0.034, 0, AX, 0, 16, true);
    cylZ(O, M.opticIn, 0.0140, 0.0140, 0.0335, 0, AX, 0, 16, true);
    // Bezels (open rings — caps would block the sight picture)
    cylZ(O, M.optic, 0.0162, 0.0165, 0.0064, 0, AX, -0.0185, 16, true);
    cylZ(O, M.optic, 0.0160, 0.0158, 0.0056, 0, AX, 0.0178, 16, true);
    // Machined bezel LIPS (tori): round rims so the eyepiece and objective
    // read as circular even from the hip view. Optic-tone, not bright rail
    // metal — a light ring here glows neon-cyan against the dark lens.
    ringAt(O, M.optic, 0.0150, 0.0021, [0, AX, 0.0208], [0, 0, 1], 22);
    ringAt(O, M.optic, 0.0153, 0.0020, [0, AX, -0.0218], [0, 0, 1], 22);

    // --- Lens stack -------------------------------------------------------
    // 1) Baked coated-glass FACE (dark center, teal depth, violet AR ring,
    //    bright sky-catch crescent). Basic material => stable under any env.
    const lensTex = lensFaceTexture();
    const faceMat = new THREE.MeshBasicMaterial({ map: lensTex, transparent: true });
    const rearFace = new THREE.Mesh(new THREE.CircleGeometry(0.0137, 24), faceMat);
    rearFace.position.set(0, AX, 0.0121);
    rearFace.renderOrder = 1; // under the glass caps regardless of sort origin
    O.add(rearFace);
    const frontFace = new THREE.Mesh(new THREE.CircleGeometry(0.0137, 24), faceMat);
    frontFace.position.set(0, AX, -0.0121);
    frontFace.rotation.y = Math.PI;
    frontFace.renderOrder = 1;
    O.add(frontFace);
    this.lensFaceMat = faceMat; // faded during ADS to open the sight picture

    // 2) Nearly-FLAT glass caps over the faces (big sphere, small cap): a
    //    strongly curved dome fisheyes the whole sky into a frosted ball;
    //    the flat cap only catches a narrow moving sheen — real glass.
    const glassMat = (color, opacity) => new THREE.MeshStandardMaterial({
      color, roughness: 0.02, metalness: 0.85, transparent: true,
      opacity, envMapIntensity: 1.05, side: THREE.DoubleSide, depthWrite: false,
    });
    const domeGeo = new THREE.SphereGeometry(0.075, 22, 5, 0, Math.PI * 2, 0, 0.183);
    const rearLens = new THREE.Mesh(domeGeo, glassMat(0xd4e2de, 0.075));
    rearLens.rotation.x = Math.PI / 2;         // pole faces +Z (toward eye)
    rearLens.position.set(0, AX, -0.0600);     // rim ~z 0.0137, pole z 0.0150
    rearLens.renderOrder = 2;
    O.add(rearLens);
    const frontLens = new THREE.Mesh(domeGeo, glassMat(0xbfd4dc, 0.075));
    frontLens.rotation.x = -Math.PI / 2;       // pole faces -Z (down bore)
    frontLens.position.set(0, AX, 0.0600);     // rim ~z -0.0137, pole z -0.0150
    frontLens.renderOrder = 2;
    O.add(frontLens);

    // 3) AR-coating sparkle: a tiny star glint pinned near the upper-left of
    //    the eyepiece rim (key-light side) + a faint cyan-violet secondary.
    const glintTex = glintTexture();
    const glint = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glintTex, color: 0xdceeff, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending,
    }));
    glint.scale.set(0.0065, 0.0065, 1);
    glint.position.set(-0.0062, AX + 0.0078, 0.0185);
    glint.renderOrder = 7;
    O.add(glint);
    this.lensGlint = glint;
    const glint2 = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glintTex, color: 0xb490ff, transparent: true, opacity: 0.25,
      blending: THREE.AdditiveBlending,
    }));
    glint2.scale.set(0.004, 0.004, 1);
    glint2.position.set(0.0071, AX - 0.0058, 0.0185);
    glint2.renderOrder = 7;
    O.add(glint2);
    this.lensGlint2 = glint2;

    // Turrets + battery cap
    cylY(O, M.optic, 0.005, 0.005, 0.007, 0, AX + 0.0180, 0, 12);
    cylY(O, M.polyD, 0.0052, 0.0052, 0.002, 0, AX + 0.0222, 0, 12);
    cylX(O, M.optic, 0.0055, 0.009, 0.019, AX, 0, 12);
    cylX(O, M.polyD, 0.0057, 0.002, 0.024, AX, 0, 12);
    cylX(O, M.optic, 0.0072, 0.005, -0.018, AX, 0, 12);

    // Emissive dot + soft glow (visible when aiming; sprite so it always
    // faces the eye and lands exactly on the optical axis)
    const dotTex = reticleDotTexture();
    const dotMat = new THREE.SpriteMaterial({
      map: dotTex, color: 0xff3522, transparent: true, opacity: 0,
      depthTest: false, blending: THREE.AdditiveBlending,
    });
    this.redDot = new THREE.Sprite(dotMat);
    this.redDot.scale.set(0.0030, 0.0030, 1);
    this.redDot.position.set(0, AX, 0);
    this.redDot.renderOrder = 6;
    O.add(this.redDot);
    const glowMat = new THREE.SpriteMaterial({
      map: dotTex, color: 0xff2211, transparent: true, opacity: 0,
      depthTest: false, blending: THREE.AdditiveBlending,
    });
    this.dotGlow = new THREE.Sprite(glowMat);
    this.dotGlow.scale.set(0.0075, 0.0075, 1);
    this.dotGlow.position.set(0, AX, 0);
    this.dotGlow.renderOrder = 5;
    O.add(this.dotGlow);
    // Wide soft halo — the emitter blooming against the glass (no post
    // bloom reaches the viewmodel overlay, so this fakes it)
    const haloMat = new THREE.SpriteMaterial({
      map: dotTex, color: 0xff2a18, transparent: true, opacity: 0,
      depthTest: false, blending: THREE.AdditiveBlending,
    });
    this.dotHalo = new THREE.Sprite(haloMat);
    this.dotHalo.scale.set(0.017, 0.017, 1);
    this.dotHalo.position.set(0, AX, 0.001);
    this.dotHalo.renderOrder = 4;
    O.add(this.dotHalo);
  }

  // ---- Gloved hands + camo sleeves ----------------------------------------
  _buildHands(g, M) {
    const flat = 0.018 * Math.cos(Math.PI / 8);

    // ================= LEFT HAND — C-grip on the handguard =================
    const lh = new THREE.Group();
    lh.position.set(0, 0, -0.30);
    lh.rotation.set(0, 0.10, 0.08); // extra yaw: shows finger runs past the
    // back-of-hand plate instead of hiding them behind it
    g.add(lh);
    this.leftHand = lh;
    this._lhBasePos = lh.position.clone();
    this._lhBaseRot = new THREE.Euler(0, 0.10, 0.08);

    // Fingers wrap the tube in the XY plane: knuckles on the left-underside,
    // curling under toward the right. orient rotY(-90°) points segments +X
    // and makes joint curls rotate about +Z (the tube axis plane).
    // Knuckles ride high on the tube's left face (classic C-clamp) so the
    // finger backs face the camera and catch the key light.
    // Spacing > sum of radii => visible gaps; dark seam shims sit in the
    // gaps so the separation reads even in soft light.
    // Fingers rake FORWARD ~22 deg (orient yaw past -90): a pure
    // cross-section wrap is seen end-on from this near-bore camera and the
    // fingers foreshortened into blobs — the round-1 "grape cluster". The
    // rake shows each finger's LENGTH crossing the tube from the camera.
    const lOrient = new THREE.Euler(0, -Math.PI / 2 + 0.38, 0);
    // Knuckles ride the octagon's TOP-LEFT corner (th ~2.5-2.6): the camera
    // looks DOWN at the tube, so a mid-flank knuckle line shows only balls
    // cresting the silhouette while the finger lengths wrap out of view
    // underneath. From the corner, the proximal segments visibly run
    // down-across the camera-facing flat before tucking under.
    // Slightly slimmer segments too: with the old radii adjacent fingers
    // left only ~4mm of gap and merged into a mitten at 720p.
    const lFingers = [
      { z: -0.0290, r: 0.0070, lens: [0.029, 0.021, 0.014], curls: [0, 0.86, 1.02], th: 2.60 },
      { z: -0.0092, r: 0.0074, lens: [0.031, 0.022, 0.015], curls: [0, 0.81, 0.98], th: 2.57 },
      { z: 0.0106, r: 0.0068, lens: [0.029, 0.021, 0.014], curls: [0, 0.90, 1.06], th: 2.53 },
      { z: 0.0298, r: 0.0057, lens: [0.024, 0.017, 0.012], curls: [0, 0.99, 1.10], th: 2.49 },
    ];
    for (const f of lFingers) {
      const rad = flat + f.r; // resting on the corner (hand yaw supplies press)
      const kx = rad * Math.cos(f.th), ky = rad * Math.sin(f.th);
      const root = makeFinger(lh, M.gloveFinger, f.r, f.lens, f.curls, lOrient);
      root.position.set(kx, ky, f.z);
      // start direction = tangent of the wrap circle at the knuckle
      root.rotation.z = f.th + Math.PI / 2 - 0.12;
      // rounded knuckle pad at the proximal joint (reads as glove armor)
      capsuleZ(lh, M.knuckPad, 0.0033, 0.0026, kx - 0.0016, ky + 0.0010, f.z, 0, -0.05, 0.3);
    }
    // Dark seam shims between adjacent fingers (shadow gaps from the hip
    // cam), rotated so their long axis follows the finger run (down-left).
    for (let i = 0; i < lFingers.length - 1; i++) {
      const zMid = (lFingers[i].z + lFingers[i + 1].z) / 2;
      const thM = (lFingers[i].th + lFingers[i + 1].th) / 2;
      const rad = flat + 0.004;
      const kx = rad * Math.cos(thM) - 0.0046, ky = rad * Math.sin(thM) - 0.0053;
      box(lh, M.gloveSeam, 0.0130, 0.0165, 0.0024, kx, ky, zMid, 0, 0, -0.72);
    }
    // Low fabric bridge where the fingers emerge from the hand (kills any
    // gap between finger roots and the back-of-hand plate)
    capsuleZ(lh, M.glove, 0.0050, 0.052, -0.0245, 0.0095, 0.0005, 0, -0.06, 0.06);
    // Palm slab against the left flat + leather heel pad
    box(lh, M.glove, 0.022, 0.052, 0.076, -0.0330, 0.004, 0.012, 0, -0.10, 0.32);
    box(lh, M.glovePalm, 0.017, 0.032, 0.032, -0.0345, -0.010, 0.034, 0, 0, 0.22);
    // ONE dark knuckle bumper bar arcing over the knuckle line, stitch line
    // riding it as a CHILD mesh (round 2 placed the stitch with unrotated
    // offsets and it floated off the plate as a bright stick). Round 1's
    // three parallel ribs read as extra tan fingers from this camera.
    const lBumper = capsuleZ(lh, M.knuck, 0.0056, 0.050, -0.0208, 0.0136, -0.001, 0, -0.05, 0.30);
    box(lBumper, M.stitch, 0.0011, 0.0011, 0.044, -0.0040, 0.0040, 0);
    // Webbing strap across the back of the hand. NO bright stitch edging
    // here: a thin bright box running near-parallel to the view axis
    // projects as a long radial streak — it read as a floating white wire.
    box(lh, M.gloveD, 0.004, 0.014, 0.066, -0.0402, -0.006, 0.008, 0, -0.05, 0.25);
    // Thumb pressed high alongside the rail riser, pointing to the muzzle,
    // with a thenar web connecting it back to the hand mass so it never
    // reads as a detached sausage.
    const lThumb = makeFinger(lh, M.gloveThumb, 0.0073, [0.026, 0.020], [0, 0.10], null);
    lThumb.position.set(-0.0122, 0.0190, -0.008);
    lThumb.rotation.set(-0.06, 0.12, -0.32); // slight splay off the riser so
    // the thumb shows readable length instead of foreshortening to a dot
    tubeBetween(lh, M.glove, 0.0058, 0.0068, [-0.0290, 0.0060, 0.004], [-0.0125, 0.0175, -0.006], 10);
    ballAt(lh, M.glove, 0.0066, -0.0172, 0.0150, -0.006); // thenar mound: closes
    // the dark V between thumb base and index knuckle
    // Wrist + glove cuff (strap ring + velcro tab) where sleeve meets glove
    box(lh, M.gloveCuff, 0.020, 0.030, 0.030, -0.0335, -0.015, 0.032, 0.25, 0, 0.15);
    ballAt(lh, M.gloveCuff, 0.0186, -0.034, -0.018, 0.038); // rounds off the wrist-tube cap
    tubeBetween(lh, M.gloveCuff, 0.0185, 0.0205, [-0.034, -0.018, 0.038], [-0.045, -0.052, 0.080]);
    // Forearm: ONE continuous tapered camo tube from inside the glove wrist
    // to inside the elbow bunch. Earlier stacked bands (strap tube, cuff
    // tube, hem sphere, sleeve tube) each exposed an up-arm-facing end-cap /
    // annulus to this near-axial camera, and every one of them shaded to a
    // flat near-black ellipse that read as a HOLE in the arm. A single
    // unbroken surface shades smoothly; the strap and cuff cinch it as round
    // TORUS bands (no flat faces anywhere).
    const lArmDir = [-0.190, -0.754, 0.629];
    tubeBetween(lh, M.sleeve, 0.0215, 0.0284, [-0.0435, -0.0445, 0.0740], [-0.0648, -0.1291, 0.1446], 12, 1.7);
    ringAt(lh, M.strap, 0.0217, 0.0025, [-0.0440, -0.0464, 0.0756], lArmDir, 18); // glove strap band
    box(lh, M.gloveD, 0.0042, 0.0125, 0.0195, -0.0630, -0.0480, 0.0790, 0.42, 0.10, 0.28); // velcro tab
    box(lh, M.stitch, 0.0044, 0.0018, 0.0185, -0.0632, -0.0428, 0.0775, 0.42, 0.10, 0.28); // tab stitch edge
    box(lh, M.strap, 0.0036, 0.0090, 0.0110, -0.0655, -0.0405, 0.0740, 0.42, 0.10, 0.42);  // strap end
    cbox(lh, M.polyD, 0.0050, 0.0040, 0.0058, -0.0648, -0.0530, 0.0838, 0.42, 0.10, 0.28, 0.001); // cinch buckle
    ringAt(lh, M.cuff, 0.0222, 0.0030, [-0.0461, -0.0547, 0.0825], lArmDir, 18); // dark elastic cuff
    // Upper-arm segment slides OVER the forearm tube (+1mm radius at the
    // overlap). The junction sits BELOW the frame edge: the camera looks
    // almost straight down the forearm bore, so any junction cap inside the
    // frame renders as a UV-squashed speckle disc no matter what covers it.
    tubeBetween(lh, M.sleeve, 0.0294, 0.0330, [-0.0630, -0.1233, 0.1417], [-0.0950, -0.2350, 0.1900], 12, 3.9);

    // ================= RIGHT HAND — on the pistol grip ======================
    // Parent frame matches the grip rake so the hand hugs it.
    const rh = new THREE.Group();
    rh.position.set(0, -0.084, 0.120);
    rh.rotation.x = -0.30;
    g.add(rh);
    this.rightHand = rh;

    // Palm on the grip's right face + back-of-hand mass toward the camera
    // top. The slab's camera-facing -X flank is the PALM/thenar side (it
    // hugs the grip), so it wears leather — as a sharp fabric box it read
    // as one flat untextured tan rectangle under the buffer tube.
    cbox(rh, M.glovePalm, 0.019, 0.058, 0.048, 0.0205, -0.010, 0.004, 0, -0.08, -0.06, 0.0035);
    capsuleZ(rh, M.glove, 0.0105, 0.032, 0.014, 0.0200, 0.002, 0.15, 0.10, 0);
    capsuleZ(rh, M.knuck, 0.0048, 0.038, 0.0302, -0.001, 0.002, 0, 0, -0.06);
    capsuleZ(rh, M.knuck, 0.0040, 0.036, 0.0300, -0.011, 0.003, 0, 0, -0.06);
    box(rh, M.gloveD, 0.0035, 0.012, 0.052, 0.0305, -0.028, 0.004, 0, 0, -0.06);
    // Dark wrist-strap band crossing the visible palm heel (breaks the slab)
    box(rh, M.gloveD, 0.0022, 0.013, 0.044, 0.0102, -0.024, 0.010, 0, -0.08, -0.06);
    // Thumb-webbing seam crease near the top of the visible palm face
    box(rh, M.gloveSeam, 0.0014, 0.0022, 0.040, 0.0102, 0.008, 0.006, 0, -0.08, -0.10);

    // Middle/ring/pinky wrap the grip front. orient rotZ(90°) keeps segments
    // pointing -Z while curls rotate about the grip's long axis.
    const rOrient = new THREE.Euler(0, 0, Math.PI / 2);
    const rFingers = [
      { y: -0.004, r: 0.0069, lens: [0.029, 0.021, 0.016], curls: [0.15, 0.85, 0.95] },
      { y: -0.0210, r: 0.0065, lens: [0.027, 0.020, 0.015], curls: [0.18, 0.88, 0.98] },
      { y: -0.0370, r: 0.0056, lens: [0.022, 0.016, 0.012], curls: [0.22, 0.95, 1.02] },
    ];
    for (const f of rFingers) {
      const root = makeFinger(rh, M.gloveFinger, f.r, f.lens, f.curls, rOrient);
      root.position.set(0.0185, f.y, 0.0195);
      // knuckle pad where each finger crests the grip front (camera side)
      capsuleZ(rh, M.knuckPad, 0.0032, 0.0024, 0.0068, f.y + 0.0022, -0.0062, 0, 0.25, 0);
    }
    // Dark seam shims between the wrapped fingers (crease shadows)
    for (let i = 0; i < rFingers.length - 1; i++) {
      const yMid = (rFingers[i].y + rFingers[i + 1].y) / 2 + 0.001;
      box(rh, M.gloveSeam, 0.0165, 0.0022, 0.0145, 0.0128, yMid, 0.0052, 0, 0.18, 0);
    }
    // Index finger indexed straight along the receiver above the trigger
    const rIndex = makeFinger(rh, M.gloveFinger, 0.0067, [0.029, 0.020, 0.015], [0.05, 0.10, 0.12], rOrient);
    rIndex.position.set(0.0175, 0.0245, 0.006);
    rIndex.rotation.x = 0.10;
    // Thumb over the top-left (behind the safety)
    const rThumb = makeFinger(rh, M.gloveFinger, 0.0080, [0.028, 0.022], [0, 0.35], new THREE.Euler(0, Math.PI / 2, 0));
    rThumb.position.set(0.006, 0.026, 0.020);
    rThumb.rotation.x = -0.20;
    // Wrist + strap/cuff torus bands + continuous camo forearm to
    // bottom-right (same no-exposed-caps construction as the left arm)
    ballAt(rh, M.gloveCuff, 0.0211, 0.021, -0.052, 0.012);
    tubeBetween(rh, M.gloveCuff, 0.021, 0.025, [0.021, -0.052, 0.012], [0.035, -0.105, 0.055]);
    const rArmDir = [0.212, -0.772, 0.600];
    tubeBetween(rh, M.sleeve, 0.0262, 0.036, [0.0330, -0.0975, 0.0490], [0.068, -0.225, 0.148], 12, 2.3);
    ringAt(rh, M.strap, 0.0264, 0.0026, [0.0336, -0.0998, 0.0508], rArmDir, 18); // glove strap band
    box(rh, M.gloveD, 0.0042, 0.0125, 0.020, 0.052, -0.096, 0.046, -0.35, -0.15, -0.30); // velcro tab
    ringAt(rh, M.cuff, 0.0270, 0.0032, [0.0360, -0.1083, 0.0574], rArmDir, 18); // dark elastic cuff
  }

  // ---- Muzzle flash + marker ----------------------------------------------
  _buildFlash(g) {
    const tex = muzzleFlashTexture();
    const flashMat = new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthTest: false,
    });
    this.flash = new THREE.Sprite(flashMat);
    this.flash.scale.set(0.2, 0.2, 1);
    this.flash.position.set(0, 0, -0.548);
    this.flash.renderOrder = 10;
    g.add(this.flash);

    const coreMat = new THREE.SpriteMaterial({
      map: tex, color: 0xfff3d8, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthTest: false,
    });
    this.flashCore = new THREE.Sprite(coreMat);
    this.flashCore.scale.set(0.09, 0.09, 1);
    this.flashCore.position.set(0, 0, -0.535);
    this.flashCore.renderOrder = 11;
    g.add(this.flashCore);

    // Brief warm splash on the handguard/hand when firing
    this.flashLight = new THREE.PointLight(0xffb066, 0, 1.6, 2);
    this.flashLight.position.set(0, -0.01, -0.50);
    g.add(this.flashLight);

    // Muzzle marker for world-space effects
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0, -0.523);
    g.add(this.muzzle);
  }

  // =========================================================================
  // Public API (contract used by weapons/main)
  // =========================================================================
  setEnvironment(envMap) {
    this.scene.environment = envMap;
    this.scene.environmentIntensity = 0.55;
  }

  triggerShot() {
    this.kickPos = Math.min(0.055, this.kickPos + 0.022);
    this.kickRot = Math.min(0.10, this.kickRot + 0.045);
    this.kickRoll = clamp(this.kickRoll + (rng() - 0.5) * 0.035, -0.05, 0.05);
    this.kickYaw = clamp(this.kickYaw + (rng() - 0.5) * 0.02, -0.03, 0.03);
    this.muzzleFlashT = 0;
    this.flashScale = 0.8 + rng() * 0.5;
    this.flash.material.rotation = rng() * Math.PI * 2;
    this.flashCore.material.rotation = rng() * Math.PI * 2;
  }

  startReload() {
    if (this.reloadT >= 0) return false;
    this.reloadT = 0;
    return true;
  }

  get reloading() { return this.reloadT >= 0; }

  /** Returns world-space muzzle position using the main camera transform. */
  getMuzzleWorld(mainCamera, out) {
    this.muzzle.getWorldPosition(out);
    // Viewmodel space == camera space; transform into world
    out.applyMatrix4(mainCamera.matrixWorld);
    return out;
  }

  // =========================================================================
  update(dt, ctx) {
    // ctx: { aiming, sprinting, moveNorm, mouseDX, mouseDY, bobPhase, onGround, dead }
    const aimTarget = ctx.aiming && !this.reloading && !ctx.sprinting ? 1 : 0;
    this.aimFrac = damp(this.aimFrac, aimTarget, 15, dt);

    // Reload progress + choreography phases
    let reloadBlend = 0, magDrop = 0, handToMag = 0, seat = 0;
    if (this.reloadT >= 0) {
      this.reloadT += dt;
      const t01 = this.reloadT / this.reloadDuration;
      if (t01 >= 1) { this.reloadT = -1; }
      else {
        reloadBlend = Math.sin(Math.min(t01, 1) * Math.PI) ** 0.7;
        const out = smoothstep(0.14, 0.34, t01);
        const back = smoothstep(0.52, 0.74, t01);
        magDrop = out * (1 - back);
        handToMag = smoothstep(0.04, 0.16, t01) * (1 - smoothstep(0.78, 0.94, t01));
        seat = Math.max(0, 1 - Math.abs((t01 - 0.76) / 0.06)); // mag seats: bump
      }
    }

    // Sway from mouse (lagged)
    this.swayX = damp(this.swayX, clamp(ctx.mouseDX * 0.0016, -0.05, 0.05), 9, dt);
    this.swayY = damp(this.swayY, clamp(ctx.mouseDY * 0.0016, -0.05, 0.05), 9, dt);

    // Kick recovery
    this.kickPos = damp(this.kickPos, 0, 11, dt);
    this.kickRot = damp(this.kickRot, 0, 9, dt);
    this.kickRoll = damp(this.kickRoll, 0, 8, dt);
    this.kickYaw = damp(this.kickYaw, 0, 8, dt);

    // Pose blending: hip -> ads -> sprint -> reload
    const sprintBlend = ctx.sprinting && !this.reloading ? 1 : 0;
    this._sprintF = damp(this._sprintF ?? 0, sprintBlend, 9, dt);
    const sp = this._sprintF;

    const px = lerp(lerp(this.hipPos.x, this.adsPos.x, this.aimFrac), this.sprintPos.x, sp);
    const py = lerp(lerp(this.hipPos.y, this.adsPos.y, this.aimFrac), this.sprintPos.y, sp);
    const pz = lerp(lerp(this.hipPos.z, this.adsPos.z, this.aimFrac), this.sprintPos.z, sp);
    const rx = lerp(lerp(this.hipRot.x, this.adsRot.x, this.aimFrac), this.sprintRot.x, sp);
    const ry = lerp(lerp(this.hipRot.y, this.adsRot.y, this.aimFrac), this.sprintRot.y, sp);
    const rz = lerp(lerp(this.hipRot.z, this.adsRot.z, this.aimFrac), this.sprintRot.z, sp);

    // Walk bob (reduced when aiming)
    this.bobT = ctx.bobPhase;
    const bobAmp = ctx.moveNorm * (1 - this.aimFrac * 0.85) * (ctx.onGround ? 1 : 0.25);
    const bobX = Math.sin(this.bobT * 0.5) * 0.008 * bobAmp;
    const bobY = -Math.abs(Math.sin(this.bobT)) * 0.007 * bobAmp;

    // Idle breathing
    const t = performance.now() / 1000;
    const idleMul = 1 - this.aimFrac * 0.7;
    const idleX = Math.sin(t * 1.1) * 0.0012 * idleMul;
    const idleY = Math.sin(t * 1.7) * 0.0011 * idleMul;
    const idleRoll = Math.sin(t * 0.9) * 0.004 * idleMul;

    const fp = this.pos;
    fp.set(
      px + bobX + idleX - this.swayX * (1 - this.aimFrac * 0.6),
      py + bobY + idleY + this.swayY * (1 - this.aimFrac * 0.6) - seat * 0.006,
      pz + this.kickPos
    );
    const fr = this.rot;
    fr.set(
      rx - this.kickRot + this.swayY * 0.6 + seat * 0.02,
      ry + this.swayX * 0.8 + this.kickYaw,
      rz + this.swayX * 0.4 + this.kickRoll + idleRoll
    );

    // Reload overlay motion
    if (reloadBlend > 0) {
      fp.lerp(this.reloadPos, reloadBlend * 0.9);
      fr.x = lerp(fr.x, this.reloadRot.x, reloadBlend * 0.9);
      fr.y = lerp(fr.y, this.reloadRot.y, reloadBlend * 0.9);
      fr.z = lerp(fr.z, this.reloadRot.z, reloadBlend * 0.9);
    }

    // Magazine drop/insert + left hand follows it
    this.mag.position.set(
      this._magBasePos.x,
      this._magBasePos.y - 0.17 * magDrop,
      this._magBasePos.z + 0.06 * magDrop
    );
    this.mag.rotation.x = this._magBaseRotX + 0.55 * magDrop;

    const lh = this.leftHand;
    if (handToMag > 0) {
      const hx = lerp(this._lhBasePos.x, 0.004, handToMag);
      const hy = lerp(this._lhBasePos.y, -0.128 - 0.17 * magDrop, handToMag);
      const hz = lerp(this._lhBasePos.z, 0.030 + 0.06 * magDrop, handToMag);
      lh.position.set(hx, hy, hz);
      lh.rotation.set(
        this._lhBaseRot.x + 0.5 * handToMag,
        this._lhBaseRot.y + 0.3 * handToMag,
        this._lhBaseRot.z - 0.55 * handToMag
      );
    } else {
      lh.position.copy(this._lhBasePos);
      lh.rotation.copy(this._lhBaseRot);
    }

    this.rifle.position.copy(fp);
    this.rifle.rotation.copy(fr);

    // Red dot: always lit (reads as a powered optic at hip) but small and
    // crisp — no red wash. Soft glow + wide halo fake the bloom the post
    // chain never applies to the viewmodel overlay.
    this.redDot.material.opacity = 0.70 + this.aimFrac * 0.30;
    this.dotGlow.material.opacity = 0.22 + this.aimFrac * 0.16;
    this.dotHalo.material.opacity = 0.07 + this.aimFrac * 0.035;
    // Lens glints + coated face fade during ADS so they never pollute the
    // sight picture (the baked face is near-opaque at hip)
    this.lensGlint.material.opacity = 0.6 * (1 - this.aimFrac * 0.75);
    this.lensGlint2.material.opacity = 0.25 * (1 - this.aimFrac * 0.85);
    this.lensFaceMat.opacity = 1 - this.aimFrac * 0.88;

    // Muzzle flash decay (2-frame flash) + light splash
    this.muzzleFlashT += dt;
    const fa = Math.max(0, 1 - this.muzzleFlashT / 0.05);
    this.flash.material.opacity = fa * 0.95;
    this.flashCore.material.opacity = fa;
    const fs = this.flashScale * (0.115 + fa * 0.085) * (1 + this.aimFrac * 0.15);
    this.flash.scale.set(fs, fs, 1);
    this.flashCore.scale.set(fs * 0.45, fs * 0.45, 1);
    this.flashLight.intensity = fa * 2.0;

    // Viewmodel FOV: tighter when ADS
    this.engine.viewmodelCamera.fov = lerp(56, 42, this.aimFrac);
    this.engine.viewmodelCamera.updateProjectionMatrix();
  }
}
