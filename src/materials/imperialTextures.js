// Procedural texture sets for the Imperial design language: clean light-grey wall panels with
// hard bevels, black gloss decking, exterior hull plating with panel seams and weathering, blinking
// indicator grids, tactical screens and Aurebesh-style stencil glyphs. Canvas / typed-array only.
import * as THREE from "three";
import { TexGen, mulberry32, fbm, vnoise, vnoise2, worley, makeCanvas, toTexture } from "../textures.js";

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const edgeDist = (u, v) => Math.min(u, 1 - u, v, 1 - v);
function finish(set) {
  set.metalnessMap = set.roughnessMap;
  return set;
}

// ---------------------------------------------------------------------------
// Imperial wall panel: near-white multiplier (vertex colour tints), crisp bevel, faint horizontal
// brushing, very light grime in the bevel, no chips (Imperial ships are kept clean) but a few
// scuffs low on the panel and hairline scratches.
// ---------------------------------------------------------------------------
export function makeImperialPanel(size = 512, seed = 301, { scuff = 0.6 } = {}) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  const scuffs = [];
  for (let i = 0; i < 5; i++) scuffs.push([rand(), 0.1 + rand() * 0.3, 0.04 + rand() * 0.12, rand()]);
  t.each((u, v, i) => {
    const ed = edgeDist(u, v);
    const n1 = fbm(u, v, { octaves: 4, freq: 5, seed });
    const brush = vnoise2(u, v, 300, 6, seed + 3);
    let lum = 0.94 + (n1 - 0.5) * 0.05 + (brush - 0.5) * 0.025;
    // grime settling in the bevel groove
    const groove = clamp01(1 - ed / 0.035);
    const grime = groove * (0.5 + 0.5 * fbm(u, v, { octaves: 3, freq: 12, seed: seed + 7 }));
    lum *= 1 - grime * 0.22;
    let rough = 0.42 + (n1 - 0.5) * 0.12 + grime * 0.25 + (brush - 0.5) * 0.08;
    let metal = 0.0;
    // hard bevel: flat face, 3% chamfer at the edge, small groove
    let hgt = 0.5 + smooth(clamp01(ed / 0.03)) * 0.3;
    // scuffs near the bottom of the panel (boots, carts)
    for (const [sx, sy, sr, sk] of scuffs) {
      const dd = Math.hypot((u - sx) * 1.6, v - sy);
      if (dd < sr) {
        const k = smooth(1 - dd / sr) * scuff * (0.3 + sk * 0.5);
        lum *= 1 - k * 0.12;
        rough += k * 0.2;
      }
    }
    // hairline scratches
    const sc = worley(u, v, 14, seed + 9);
    if (sc < 0.006) {
      const k = 1 - sc / 0.006;
      lum -= k * 0.05;
      rough -= k * 0.1;
      hgt -= k * 0.02;
    }
    t.setColor(i, lum, lum * 1.0, lum * 1.01);
    t.rough[i] = clamp01(rough);
    t.metal[i] = metal;
    t.height[i] = hgt;
  });
  return finish(t.bake({ normalStrength: 2.6 }));
}

// ---------------------------------------------------------------------------
// Black gloss deck (bridge / command spaces): very dark, low roughness with smeared boot-polish
// variation, fine seams every plate, a subtle metallic flake.
// ---------------------------------------------------------------------------
export function makeGlossDeck(size = 1024, seed = 311) {
  const t = new TexGen(size, size);
  const plates = 4;
  t.each((u, v, i) => {
    const pu = (u * plates) % 1;
    const pv = (v * plates) % 1;
    const ed = edgeDist(pu, pv);
    const n1 = fbm(u, v, { octaves: 4, freq: 3, seed });
    const smear = fbm(u * 0.4, v, { octaves: 3, freq: 10, seed: seed + 3 });
    let lum = 0.10 + (n1 - 0.5) * 0.03;
    let rough = 0.16 + (smear - 0.5) * 0.22 + (n1 - 0.5) * 0.08;
    let hgt = 0.5;
    const seam = 0.012;
    if (ed < seam) {
      const k = 1 - ed / seam;
      hgt -= 0.3 * smooth(k);
      lum *= 0.6;
      rough += 0.3;
    }
    // dust in the seams' neighbourhood
    const dust = clamp01(1 - ed / 0.06) * fbm(u, v, { octaves: 3, freq: 20, seed: seed + 5 });
    lum += dust * 0.02;
    rough += dust * 0.1;
    t.setColor(i, lum * 0.96, lum * 0.98, lum * 1.06);
    t.rough[i] = clamp01(rough);
    t.metal[i] = 0.35;
    t.height[i] = hgt;
  });
  return finish(t.bake({ normalStrength: 1.6 }));
}

// ---------------------------------------------------------------------------
// Dark deck plating (corridors, hangar): charcoal plates with anti-slip ribs, seams, wear paths.
// ---------------------------------------------------------------------------
export function makeDarkDeck(size = 1024, seed = 321) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  const scuffs = [];
  for (let i = 0; i < 30; i++) scuffs.push({ x: rand(), y: rand(), a: rand() * Math.PI, l: 0.05 + rand() * 0.2, w: 0.002 + rand() * 0.005, k: rand() });
  const plates = 2;
  t.each((u, v, i) => {
    const pu = (u * plates) % 1;
    const pv = (v * plates) % 1;
    const ed = edgeDist(pu, pv);
    const n1 = fbm(u, v, { octaves: 4, freq: 5, seed });
    const n2 = fbm(u, v, { octaves: 5, freq: 20, seed: seed + 3 });
    let lum = 0.22 + (n1 - 0.5) * 0.08 + (n2 - 0.5) * 0.05;
    let rough = 0.6 + (n2 - 0.5) * 0.2;
    let metal = 0.4;
    let hgt = 0.55;
    const seam = 0.016;
    if (ed < seam) {
      hgt -= 0.35 * smooth(1 - ed / seam);
      lum *= 0.5;
      rough += 0.25;
    } else {
      // anti-slip ribs running along u
      const rib = Math.abs(((pv * 28) % 1) - 0.5);
      if (rib < 0.14) {
        const k = smooth(1 - rib / 0.14);
        hgt += k * 0.1;
        lum += k * 0.03;
        const worn = k * clamp01((n2 - 0.4) * 2);
        metal = lerp(metal, 0.8, worn);
        rough = lerp(rough, 0.35, worn);
      }
    }
    for (const s of scuffs) {
      const dx = u - s.x;
      const dy = v - s.y;
      const along = dx * Math.cos(s.a) + dy * Math.sin(s.a);
      const perp = -dx * Math.sin(s.a) + dy * Math.cos(s.a);
      if (Math.abs(along) < s.l && Math.abs(perp) < s.w) {
        const k = (1 - Math.abs(perp) / s.w) * (1 - Math.abs(along) / s.l) * 0.8;
        lum = lerp(lum, s.k > 0.5 ? 0.45 : 0.1, k);
        rough = lerp(rough, s.k > 0.5 ? 0.3 : 0.8, k);
      }
    }
    t.setColor(i, lum, lum * 1.01, lum * 1.05);
    t.rough[i] = clamp01(rough);
    t.metal[i] = clamp01(metal);
    t.height[i] = hgt;
  });
  return finish(t.bake({ normalStrength: 2.0 }));
}

// ---------------------------------------------------------------------------
// Exterior hull plating: one tile = a grid of armour plates of unequal sizes with recessed seams,
// per-plate tone variation, soot streaks, micrometeorite pitting and a few scorch marks.
// The tile is meant to cover ~48 m; vertex colour tints per hull region.
// ---------------------------------------------------------------------------
export function makeHullPlate(size = 2048, seed = 331) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  // irregular plate grid: split each axis into segments of unequal length
  const cutsU = [0];
  const cutsV = [0];
  while (cutsU[cutsU.length - 1] < 0.92) cutsU.push(cutsU[cutsU.length - 1] + 0.06 + rand() * 0.14);
  cutsU.push(1);
  while (cutsV[cutsV.length - 1] < 0.92) cutsV.push(cutsV[cutsV.length - 1] + 0.05 + rand() * 0.12);
  cutsV.push(1);
  const nU = cutsU.length - 1;
  const nV = cutsV.length - 1;
  const tones = new Float32Array(nU * nV);
  const heights = new Float32Array(nU * nV);
  for (let k = 0; k < tones.length; k++) {
    tones[k] = 0.82 + (rand() - 0.5) * 0.16;
    heights[k] = rand() < 0.25 ? -0.08 : rand() < 0.5 ? 0 : 0.04;
  }
  // some plates carry a row of small hatches / vents
  const hatches = [];
  for (let k = 0; k < 40; k++) hatches.push([rand(), rand(), 0.008 + rand() * 0.02, 0.004 + rand() * 0.008]);
  const scorches = [];
  for (let k = 0; k < 6; k++) scorches.push([rand(), rand(), 0.03 + rand() * 0.08]);
  const find = (cuts, x) => {
    let lo = 0;
    let hi = cuts.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (cuts[mid] <= x) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  t.each((u, v, i) => {
    const iu = find(cutsU, u);
    const iv = find(cutsV, v);
    const k = iv * nU + iu;
    const du = Math.min(u - cutsU[iu], cutsU[iu + 1] - u);
    const dv = Math.min(v - cutsV[iv], cutsV[iv + 1] - v);
    const ed = Math.min(du, dv);
    const n1 = fbm(u, v, { octaves: 4, freq: 6, seed });
    const n2 = fbm(u, v, { octaves: 5, freq: 40, seed: seed + 2 });
    let lum = tones[k] * (0.95 + (n1 - 0.5) * 0.12 + (n2 - 0.5) * 0.06);
    let rough = 0.58 + (n2 - 0.5) * 0.2 + (n1 - 0.5) * 0.1;
    let metal = 0.55;
    let hgt = 0.5 + heights[k];
    const seam = 0.0035;
    if (ed < seam) {
      const q = 1 - ed / seam;
      hgt -= 0.4 * smooth(q);
      lum *= 0.45;
      rough += 0.3;
    } else if (ed < seam * 2.5) {
      // bevel down into the seam
      hgt -= 0.12 * smooth(1 - (ed - seam) / (seam * 1.5));
    }
    // streaks along v (soot trails) starting from seams
    const streak = Math.pow(fbm(u, v * 0.08, { octaves: 3, freq: 30, seed: seed + 11 }), 3);
    lum *= 1 - streak * 0.25;
    rough += streak * 0.15;
    // micro pitting
    const pit = worley(u, v, 90, seed + 4);
    if (pit < 0.012) {
      const q = 1 - pit / 0.012;
      hgt -= q * 0.06;
      lum *= 1 - q * 0.15;
    }
    for (const [hx, hy, hw, hh] of hatches) {
      if (Math.abs(u - hx) < hw && Math.abs(v - hy) < hh) {
        const inner = Math.abs(u - hx) < hw - 0.0015 && Math.abs(v - hy) < hh - 0.0015;
        hgt += inner ? 0.05 : -0.1;
        lum *= inner ? 0.9 : 0.6;
        metal = 0.7;
      }
    }
    for (const [sx, sy, sr] of scorches) {
      const dd = Math.hypot(u - sx, (v - sy) * 1.5);
      if (dd < sr) {
        const q = smooth(1 - dd / sr) * (0.6 + 0.4 * fbm(u, v, { octaves: 3, freq: 50, seed: seed + 6 }));
        lum *= 1 - q * 0.45;
        rough += q * 0.3;
        metal *= 1 - q * 0.5;
      }
    }
    t.setColor(i, lum, lum * 1.01, lum * 1.03);
    t.rough[i] = clamp01(rough);
    t.metal[i] = clamp01(metal);
    t.height[i] = hgt;
  });
  return finish(t.bake({ normalStrength: 3.2 }));
}

// Fine detail normal for hull plating seen up close: rivet rows and small sub-plate seams, no albedo.
export function makeHullDetail(size = 512, seed = 341) {
  const t = new TexGen(size, size);
  const sub = 4;
  t.each((u, v, i) => {
    const pu = (u * sub) % 1;
    const pv = (v * sub) % 1;
    const ed = edgeDist(pu, pv);
    let hgt = 0.5;
    if (ed < 0.012) hgt -= 0.3 * smooth(1 - ed / 0.012);
    // rivet rows just inside the seams
    const ru = Math.abs(((pu * 12) % 1) - 0.5);
    const rv = Math.abs(((pv * 12) % 1) - 0.5);
    const nearEdge = ed > 0.02 && ed < 0.05;
    if (nearEdge && Math.hypot(ru, rv * 1.0) < 0.12) hgt += 0.2;
    const n = fbm(u, v, { octaves: 3, freq: 30, seed });
    hgt += (n - 0.5) * 0.05;
    t.setColor(i, 1, 1, 1);
    t.rough[i] = 0.5;
    t.metal[i] = 0.5;
    t.height[i] = hgt;
  });
  return t.bake({ normalStrength: 2.2 }).normalMap;
}

// ---------------------------------------------------------------------------
// Emissive indicator grid: dark panel with a lattice of tiny square/round lights in Imperial colours.
// The blink shader (materials/imperial.js) uses the cell index (uv) and the colour to animate.
// ---------------------------------------------------------------------------
export function makeIndicatorGrid(w = 512, h = 256, seed = 351, { cols = 32, rows = 16, density = 0.55 } = {}) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  ctx.fillStyle = "#050607";
  ctx.fillRect(0, 0, w, h);
  const colors = ["#ff2a1a", "#ff2a1a", "#2f7bff", "#2f7bff", "#2f7bff", "#ffb020", "#e8ecff", "#4fd8cc", "#ff6a3a"];
  const cw = w / cols;
  const ch = h / rows;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      if (rand() > density) continue;
      const col = colors[Math.floor(rand() * colors.length)];
      ctx.fillStyle = col;
      const x = k * cw + cw * 0.5;
      const y = r * ch + ch * 0.5;
      if (rand() < 0.5) ctx.fillRect(x - cw * 0.3, y - ch * 0.3, cw * 0.6, ch * 0.6);
      else {
        ctx.beginPath();
        ctx.arc(x, y, Math.min(cw, ch) * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  return toTexture(c, { srgb: true, wrap: true });
}

// ---------------------------------------------------------------------------
// Tactical screen: blue Imperial display with a wireframe target, sweep arc, data columns.
// variant selects layout; the shader adds a scanline roll + flicker.
// ---------------------------------------------------------------------------
export function makeTacticalScreen(w = 512, h = 256, seed = 361, variant = 0, accent = "#4d8dff", warn = "#ff3b2a") {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  ctx.fillStyle = "#020509";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(77,141,255,0.10)";
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  const pad = 12;
  ctx.fillStyle = accent;
  ctx.fillRect(pad, pad, w - pad * 2, 2);
  ctx.fillRect(pad, h - pad - 2, w - pad * 2, 2);
  const glyphRow = (x, y, n, size, color) => {
    ctx.fillStyle = color;
    for (let k = 0; k < n; k++) {
      const gw = size * (0.5 + rand() * 0.5);
      ctx.fillRect(x + k * size * 1.2, y, gw, size * 0.9);
    }
  };
  if (variant % 3 === 0) {
    // wireframe wedge (a ship silhouette) + range rings
    const cx = w * 0.62;
    const cy = h * 0.52;
    ctx.strokeStyle = "rgba(77,141,255,0.45)";
    for (const r of [30, 60, 90]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 70);
    ctx.lineTo(cx + 42, cy + 40);
    ctx.lineTo(cx - 42, cy + 40);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy + 40);
    ctx.lineTo(cx - 8, cy + 10);
    ctx.lineTo(cx + 8, cy + 10);
    ctx.lineTo(cx + 14, cy + 40);
    ctx.stroke();
    ctx.fillStyle = warn;
    for (let k = 0; k < 5; k++) {
      const a = rand() * Math.PI * 2;
      const r = 40 + rand() * 50;
      ctx.fillRect(cx + Math.cos(a) * r - 2, cy + Math.sin(a) * r - 2, 4, 4);
    }
    for (let k = 0; k < 9; k++) glyphRow(pad, pad + 14 + k * 14, 6 + Math.floor(rand() * 8), 8, k % 4 === 3 ? warn : "rgba(120,170,255,0.8)");
  } else if (variant % 3 === 1) {
    // bar columns + waveform
    for (let k = 0; k < 18; k++) {
      const bh = 20 + rand() * (h * 0.45);
      ctx.fillStyle = rand() < 0.15 ? warn : accent;
      ctx.globalAlpha = 0.5 + rand() * 0.5;
      ctx.fillRect(pad + k * ((w - pad * 2) / 18), h * 0.75 - bh, (w - pad * 2) / 18 - 4, bh);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= 60; x++) {
      const px = pad + (x / 60) * (w - pad * 2);
      const py = h * 0.22 + Math.sin(x * 0.5 + seed) * 18 + (rand() - 0.5) * 10;
      x === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
    for (let k = 0; k < 3; k++) glyphRow(pad, h * 0.82 + k * 12, 10, 7, "rgba(120,170,255,0.7)");
  } else {
    // planetary/grid map: a sphere wireframe + text panels
    const cx = w * 0.3;
    const cy = h * 0.5;
    ctx.strokeStyle = "rgba(77,141,255,0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 70, 0, Math.PI * 2);
    ctx.stroke();
    for (let k = 1; k < 4; k++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, 70 * Math.cos((k / 4) * Math.PI * 0.5), 70, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, 70, 70 * Math.cos((k / 4) * Math.PI * 0.5), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let k = 0; k < 12; k++) glyphRow(w * 0.56, pad + 14 + k * 14, 6 + Math.floor(rand() * 10), 8, k === 2 || k === 7 ? warn : "rgba(120,170,255,0.75)");
    ctx.fillStyle = accent;
    ctx.fillRect(w * 0.56, pad + 14 + 12 * 14, 80, 3);
  }
  // scanlines
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  for (let yy = 0; yy < h; yy += 3) ctx.fillRect(0, yy, w, 1);
  return toTexture(c, { srgb: true, wrap: false });
}

// ---------------------------------------------------------------------------
// Imperial stencil sheet: 4x4 cells of Aurebesh-like block glyph strings, deck numbers, hazard
// chevrons in black on transparent, plus a few in Imperial red. Same layout as textures.decalRect.
// ---------------------------------------------------------------------------
export const IMP_DECAL_CELLS = 4;
export function impDecalRect(index) {
  const c = index % IMP_DECAL_CELLS;
  const r = Math.floor(index / IMP_DECAL_CELLS);
  const s = 1 / IMP_DECAL_CELLS;
  return [c * s, 1 - (r + 1) * s, (c + 1) * s, 1 - r * s];
}
export function makeImperialDecals(size = 1024, seed = 371) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  const cell = size / IMP_DECAL_CELLS;
  const INK = "#0f1114";
  const RED = "#c8221a";
  const GREY = "#9aa0a8";
  // Aurebesh-ish glyph: strokes on a 3x4 grid
  const glyph = (x, y, s, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = s * 0.16;
    ctx.lineCap = "square";
    const n = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const x0 = x + Math.floor(rand() * 3) * (s * 0.35);
      const y0 = y + Math.floor(rand() * 4) * (s * 0.3);
      const x1 = x + Math.floor(rand() * 3) * (s * 0.35);
      const y1 = y + Math.floor(rand() * 4) * (s * 0.3);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    // a frame stroke so every glyph reads as one character
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + s * 0.9);
    ctx.stroke();
  };
  const word = (x, y, s, n, color) => {
    for (let k = 0; k < n; k++) glyph(x + k * s * 0.95, y, s, color);
  };
  const at = (i, fn) => {
    const cx = (i % IMP_DECAL_CELLS) * cell;
    const cy = Math.floor(i / IMP_DECAL_CELLS) * cell;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.rect(0, 0, cell, cell);
    ctx.clip();
    fn(cell);
    ctx.restore();
  };
  const text = (s, x, y, px, color) => {
    ctx.fillStyle = color;
    ctx.font = `bold ${px}px "DejaVu Sans Mono", "Liberation Mono", Menlo, Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s, x, y);
  };
  const chevrons = (x, y, w, h, n, color) => {
    ctx.fillStyle = color;
    const step = w / n;
    for (let k = 0; k < n; k++) {
      ctx.beginPath();
      ctx.moveTo(x + k * step, y);
      ctx.lineTo(x + k * step + step * 0.5, y);
      ctx.lineTo(x + k * step + step * 0.5 + h * 0.6, y + h);
      ctx.lineTo(x + k * step + h * 0.6, y + h);
      ctx.closePath();
      ctx.fill();
    }
  };
  // 0: deck/section code with glyph line
  at(0, (s) => {
    word(s * 0.12, s * 0.2, s * 0.16, 5, INK);
    text("07-A", s / 2, s * 0.68, s * 0.28, INK);
  });
  // 1: hazard band (black chevrons on red bar)
  at(1, (s) => {
    ctx.fillStyle = RED;
    ctx.fillRect(s * 0.05, s * 0.3, s * 0.9, s * 0.4);
    chevrons(s * 0.08, s * 0.36, s * 0.84, s * 0.28, 6, INK);
  });
  // 2: big numeral
  at(2, (s) => text(String(1 + Math.floor(rand() * 9)), s / 2, s * 0.5, s * 0.8, INK));
  // 3: glyph block (3 lines)
  at(3, (s) => {
    for (let k = 0; k < 3; k++) word(s * 0.1, s * 0.2 + k * s * 0.24, s * 0.14, 4 + Math.floor(rand() * 3), INK);
  });
  // 4: Imperial cog-ish roundel (six spokes in a ring)
  at(4, (s) => {
    ctx.strokeStyle = INK;
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.16, 0, Math.PI * 2);
    ctx.stroke();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(s / 2 + Math.cos(a) * s * 0.18, s / 2 + Math.sin(a) * s * 0.18);
      ctx.lineTo(s / 2 + Math.cos(a) * s * 0.42, s / 2 + Math.sin(a) * s * 0.42);
      ctx.stroke();
    }
  });
  // 5: red restricted
  at(5, (s) => {
    ctx.fillStyle = RED;
    ctx.fillRect(s * 0.06, s * 0.3, s * 0.88, s * 0.4);
    word(s * 0.12, s * 0.36, s * 0.16, 5, INK);
  });
  // 6: barcode-like id
  at(6, (s) => {
    ctx.fillStyle = INK;
    let x = s * 0.1;
    while (x < s * 0.9) {
      const w = s * (0.006 + rand() * 0.02);
      ctx.fillRect(x, s * 0.35, w, s * 0.3);
      x += w + s * (0.006 + rand() * 0.02);
    }
    word(s * 0.15, s * 0.7, s * 0.1, 7, INK);
  });
  // 7: arrow + glyphs
  at(7, (s) => {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(s * 0.1, s * 0.4);
    ctx.lineTo(s * 0.55, s * 0.4);
    ctx.lineTo(s * 0.55, s * 0.26);
    ctx.lineTo(s * 0.9, s * 0.5);
    ctx.lineTo(s * 0.55, s * 0.74);
    ctx.lineTo(s * 0.55, s * 0.6);
    ctx.lineTo(s * 0.1, s * 0.6);
    ctx.closePath();
    ctx.fill();
    word(s * 0.15, s * 0.78, s * 0.12, 5, INK);
  });
  // 8: TIE bay number
  at(8, (s) => {
    text("TIE", s / 2, s * 0.32, s * 0.26, INK);
    text("0" + (1 + Math.floor(rand() * 9)), s / 2, s * 0.66, s * 0.36, INK);
  });
  // 9: spec plate (grey frame + glyph lines)
  at(9, (s) => {
    ctx.strokeStyle = GREY;
    ctx.lineWidth = s * 0.015;
    ctx.strokeRect(s * 0.1, s * 0.15, s * 0.8, s * 0.7);
    for (let k = 0; k < 5; k++) word(s * 0.16, s * 0.22 + k * s * 0.12, s * 0.07, 7 + Math.floor(rand() * 4), GREY);
  });
  // 10: yellow-black chevron band
  at(10, (s) => chevrons(s * 0.02, s * 0.35, s * 0.96, s * 0.3, 4, INK));
  // 11: single red glyph word (large)
  at(11, (s) => word(s * 0.1, s * 0.3, s * 0.26, 3, RED));
  // 12: circle-slash restricted
  at(12, (s) => {
    ctx.strokeStyle = RED;
    ctx.lineWidth = s * 0.07;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.26, s * 0.26);
    ctx.lineTo(s * 0.74, s * 0.74);
    ctx.stroke();
  });
  // 13: emergency (red box, black glyphs)
  at(13, (s) => {
    ctx.fillStyle = RED;
    ctx.fillRect(s * 0.1, s * 0.22, s * 0.8, s * 0.56);
    word(s * 0.16, s * 0.3, s * 0.14, 4, INK);
    word(s * 0.16, s * 0.55, s * 0.14, 5, INK);
  });
  // 14: deck arrow up + number
  at(14, (s) => {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.1);
    ctx.lineTo(s * 0.7, s * 0.4);
    ctx.lineTo(s * 0.58, s * 0.4);
    ctx.lineTo(s * 0.58, s * 0.6);
    ctx.lineTo(s * 0.42, s * 0.6);
    ctx.lineTo(s * 0.42, s * 0.4);
    ctx.lineTo(s * 0.3, s * 0.4);
    ctx.closePath();
    ctx.fill();
    text("19", s / 2, s * 0.8, s * 0.24, INK);
  });
  // 15: two-line glyph label
  at(15, (s) => {
    word(s * 0.1, s * 0.3, s * 0.18, 4, INK);
    word(s * 0.1, s * 0.58, s * 0.18, 4, INK);
  });
  // erode
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (d[i + 3] === 0) continue;
      const u = x / size;
      const n = fbm(u, v, { octaves: 4, freq: 60, seed: seed + 2 });
      const scuff = Math.pow(fbm(u * 0.3, v, { octaves: 3, freq: 40, seed: seed + 5 }), 2);
      let a = d[i + 3] / 255;
      a *= clamp01((n - 0.25) * 4);
      a *= 1 - scuff * 0.5;
      d[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = toTexture(c, { srgb: true, wrap: false });
  tex.anisotropy = 8;
  return tex;
}

// Hangar deck markings: yellow landing-lane lines, cross-hatch, numerals — an alpha sheet laid over deck.
export function makeDeckMarkings(size = 1024, seed = 381) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  const cell = size / 2;
  const YEL = "#d9b53a";
  const RED = "#c8221a";
  const WHITE = "#cfd4dc";
  ctx.clearRect(0, 0, size, size);
  // 0: lane edge stripes with dashes
  ctx.save();
  ctx.fillStyle = YEL;
  ctx.fillRect(0, cell * 0.1, cell, cell * 0.06);
  ctx.fillRect(0, cell * 0.84, cell, cell * 0.06);
  for (let x = 0; x < cell; x += cell * 0.2) ctx.fillRect(x, cell * 0.47, cell * 0.12, cell * 0.06);
  ctx.restore();
  // 1: landing cross / target
  ctx.save();
  ctx.translate(cell, 0);
  ctx.strokeStyle = YEL;
  ctx.lineWidth = cell * 0.05;
  ctx.beginPath();
  ctx.arc(cell / 2, cell / 2, cell * 0.36, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cell * 0.5, cell * 0.05);
  ctx.lineTo(cell * 0.5, cell * 0.95);
  ctx.moveTo(cell * 0.05, cell * 0.5);
  ctx.lineTo(cell * 0.95, cell * 0.5);
  ctx.stroke();
  ctx.restore();
  // 2: hatched keep-clear zone (red)
  ctx.save();
  ctx.translate(0, cell);
  ctx.strokeStyle = RED;
  ctx.lineWidth = cell * 0.035;
  for (let k = -1; k < 2; k += 0.14) {
    ctx.beginPath();
    ctx.moveTo(k * cell, 0);
    ctx.lineTo(k * cell + cell, cell);
    ctx.stroke();
  }
  ctx.strokeRect(cell * 0.03, cell * 0.03, cell * 0.94, cell * 0.94);
  ctx.restore();
  // 3: bay numeral + chevrons
  ctx.save();
  ctx.translate(cell, cell);
  ctx.fillStyle = WHITE;
  ctx.font = `bold ${cell * 0.5}px "DejaVu Sans Mono", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(1 + Math.floor(rand() * 8)), cell / 2, cell * 0.45);
  ctx.fillStyle = YEL;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(cell * (0.2 + k * 0.22), cell * 0.9);
    ctx.lineTo(cell * (0.31 + k * 0.22), cell * 0.76);
    ctx.lineTo(cell * (0.42 + k * 0.22), cell * 0.9);
    ctx.lineTo(cell * (0.31 + k * 0.22), cell * 0.84);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // wear
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (d[i + 3] === 0) continue;
      const n = fbm(x / size, y / size, { octaves: 4, freq: 40, seed });
      d[i + 3] *= clamp01((n - 0.3) * 3.5) * 0.9;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = toTexture(c, { srgb: true, wrap: false });
  return tex;
}
export function deckMarkRect(index) {
  const c = index % 2;
  const r = Math.floor(index / 2);
  return [c * 0.5, 1 - (r + 1) * 0.5, (c + 1) * 0.5, 1 - r * 0.5];
}

// Soft light panel diffuser for the recessed Imperial wall light bands (bright centre, soft edges)
export function makeLightBand(w = 512, h = 64, seed = 391) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    const v = (y + 0.5) / h;
    const fy = 1 - Math.pow(Math.abs(2 * v - 1), 3.0);
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      const fx = 1 - Math.pow(Math.abs(2 * u - 1), 6.0);
      const mottle = 1 + (vnoise(u, v, 12, seed) - 0.5) * 0.06;
      const k = clamp01((0.35 + 0.65 * fy) * fx * mottle);
      const i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = k * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { srgb: true, wrap: false });
}
