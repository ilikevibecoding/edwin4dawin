// Procedural textures for the Imperial design language: light-grey wall panels with black trim,
// exterior hull plating with weathering, blue / red / amber console UI, superstructure window lights,
// deck grids, hexagonal solar-panel cells and a stencil decal atlas (original glyph set).
// Everything is canvas / typed-array based; nothing is downloaded.
import * as THREE from "three";
import { TexGen, fbm, vnoise, vnoise2, worley, makeCanvas, toTexture, mulberry32 } from "./textures.js";

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const edgeDist = (u, v) => Math.min(u, 1 - u, v, 1 - v);
function finish(set) {
  set.metalnessMap = set.roughnessMap;
  return set;
}

// ---------------------------------------------------------------------------
// Interior wall panel: pale grey enamel over steel, recessed sub-panel seams, bevelled edge, faint
// vertical brushing under the paint, scuffed lower band. Vertex colour tints (white = as painted).
// ---------------------------------------------------------------------------
export function makeImperialPanel(size = 512, seed = 5) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  // one or two recessed seams splitting the panel (never both at the same place)
  const seamU = rand() < 0.6 ? 0.3 + rand() * 0.4 : -1;
  const seamV = rand() < 0.4 ? 0.3 + rand() * 0.4 : -1;
  const scuffs = [];
  for (let i = 0; i < 10; i++) scuffs.push([rand(), rand() * 0.35, 0.02 + rand() * 0.06, rand()]);
  t.each((u, v, i) => {
    const ed = edgeDist(u, v);
    const n1 = fbm(u, v, { octaves: 4, freq: 5, seed });
    const brush = vnoise2(u, v, 160, 6, seed + 2);
    let lum = 0.93 + (n1 - 0.5) * 0.06 + (brush - 0.5) * 0.02;
    let rough = 0.42 + (n1 - 0.5) * 0.12 + (brush - 0.5) * 0.08;
    let metal = 0.0;
    let hgt = 0.5 + clamp01(ed / 0.022) * 0.3;
    // seams
    const seamK = Math.max(seamU >= 0 ? clamp01(1 - Math.abs(u - seamU) / 0.006) : 0, seamV >= 0 ? clamp01(1 - Math.abs(v - seamV) / 0.006) : 0);
    if (seamK > 0) {
      hgt -= seamK * 0.22;
      lum *= 1 - seamK * 0.35;
      rough += seamK * 0.2;
    }
    // grime gathering along the bevel and the bottom edge
    const grime = clamp01(1 - ed / 0.08) * fbm(u, v, { octaves: 3, freq: 12, seed: seed + 9 }) * 0.5 + clamp01(1 - v / 0.12) * 0.25 * fbm(u, v, { octaves: 3, freq: 20, seed: seed + 4 });
    lum *= 1 - grime * 0.16;
    rough += grime * 0.25;
    // scuffs low on the panel (boots, carts)
    for (const [sx, sy, sr, sk] of scuffs) {
      const d = Math.hypot((u - sx) * 0.6, v - sy);
      if (d < sr) {
        const k = smooth(1 - d / sr) * sk * 0.35;
        lum *= 1 - k * 0.3;
        rough += k * 0.4;
      }
    }
    // fine glancing scratches
    const sc = worley(u, v, 16, seed + 7);
    if (sc < 0.01) {
      const k = 1 - sc / 0.01;
      lum -= k * 0.08;
      hgt -= k * 0.02;
      rough -= k * 0.1;
    }
    // slight cool cast (Imperial enamel reads blue-grey, never cream)
    t.setColor(i, lum * 0.985, lum * 0.995, lum * 1.02);
    t.rough[i] = clamp01(rough);
    t.metal[i] = clamp01(metal);
    t.height[i] = hgt;
  });
  return finish(t.bake({ normalStrength: 2.6 }));
}

// ---------------------------------------------------------------------------
// Black trim / structural frame: matte near-black with a fine cast texture and chipped edges
// ---------------------------------------------------------------------------
export function makeTrimBlack(size = 512, seed = 33) {
  const t = new TexGen(size, size);
  t.each((u, v, i) => {
    const n = fbm(u, v, { octaves: 5, freq: 9, seed });
    const speck = fbm(u, v, { octaves: 3, freq: 60, seed: seed + 3 });
    let lum = 0.72 + (n - 0.5) * 0.14 + (speck - 0.5) * 0.06;
    const ed = edgeDist(u, v);
    const wear = clamp01(1 - ed / 0.02) * clamp01((speck - 0.55) * 4);
    lum += wear * 0.5;
    let rough = 0.58 + (n - 0.5) * 0.2 - wear * 0.2;
    t.setColor(i, lum, lum, lum * 1.02);
    t.rough[i] = clamp01(rough);
    t.metal[i] = 0.35 + wear * 0.5;
    t.height[i] = 0.5 + clamp01(ed / 0.03) * 0.25 + (speck - 0.5) * 0.03;
  });
  return finish(t.bake({ normalStrength: 1.4 }));
}

// ---------------------------------------------------------------------------
// Exterior hull plating: irregular armour plates with recessed seams, per-plate tone variation,
// rivet rows, weathering streaks, soot. Tiles every 1.0 texture unit; builders set texel = 1/24 m so a
// tile covers ~24 m of hull (plates 3–8 m). Vertex colour supplies the overall tint.
// ---------------------------------------------------------------------------
export function makeHullPlating(size = 1024, seed = 101) {
  const t = new TexGen(size, size);
  const rand = mulberry32(seed);
  // irregular grid: 5 columns with jittered splits, each column split into rows independently
  const cols = 5;
  const colEdges = [0];
  for (let c = 1; c < cols; c++) colEdges.push(c / cols + (rand() - 0.5) * 0.06);
  colEdges.push(1);
  const rowsPerCol = [];
  for (let c = 0; c < cols; c++) {
    const n = 3 + Math.floor(rand() * 4);
    const e = [0];
    for (let r = 1; r < n; r++) e.push(r / n + (rand() - 0.5) * 0.05);
    e.push(1);
    rowsPerCol.push(e);
  }
  const tone = [];
  for (let c = 0; c < cols; c++) {
    tone.push(rowsPerCol[c].map(() => 0.9 + (rand() - 0.5) * 0.16));
  }
  const soot = [];
  for (let i = 0; i < 5; i++) soot.push([rand(), rand(), 0.06 + rand() * 0.14, rand()]);
  t.each((u, v, i) => {
    // find plate
    let c = 0;
    while (c < cols - 1 && u > colEdges[c + 1]) c++;
    const re = rowsPerCol[c];
    let r = 0;
    while (r < re.length - 2 && v > re[r + 1]) r++;
    const du = Math.min(u - colEdges[c], colEdges[c + 1] - u);
    const dv = Math.min(v - re[r], re[r + 1] - v);
    const ed = Math.min(du, dv);
    const seam = clamp01(1 - ed / 0.0045);
    const bevel = clamp01((ed - 0.0045) / 0.012);
    const n1 = fbm(u, v, { octaves: 5, freq: 8, seed });
    const n2 = fbm(u, v, { octaves: 3, freq: 40, seed: seed + 11 });
    let lum = tone[c][r] * (0.97 + (n1 - 0.5) * 0.08 + (n2 - 0.5) * 0.03);
    // weathering streaks along v (micrometeorite scouring reads as a directional grain)
    const streak = Math.pow(fbm(u * 1.0, v * 0.1, { octaves: 3, freq: 30, seed: seed + 21 }), 2.5);
    lum *= 1 - streak * 0.12;
    // soot / heat discoloration blotches
    for (const [sx, sy, sr, sk] of soot) {
      const d = Math.hypot(u - sx, (v - sy) * 1.6);
      if (d < sr) lum *= 1 - smooth(1 - d / sr) * sk * 0.3;
    }
    let rough = 0.62 + (n1 - 0.5) * 0.18 + seam * 0.2 + streak * 0.1;
    let metal = 0.12;
    let hgt = 0.5 + bevel * 0.2 - seam * 0.3;
    // rivet rows along plate edges
    const rivetPitch = 0.02;
    const ru = (u - colEdges[c]) / rivetPitch;
    const rv = (v - re[r]) / rivetPitch;
    const nearEdgeU = du < 0.014 && du > 0.007;
    const nearEdgeV = dv < 0.014 && dv > 0.007;
    if ((nearEdgeU && Math.abs(rv - Math.round(rv)) < 0.14) || (nearEdgeV && Math.abs(ru - Math.round(ru)) < 0.14)) {
      hgt += 0.12;
      lum *= 0.85;
      metal = 0.6;
      rough = 0.45;
    }
    // scratches
    const sc = worley(u, v, 14, seed + 7);
    if (sc < 0.006) {
      const k = 1 - sc / 0.006;
      lum += k * 0.12;
      hgt -= k * 0.03;
    }
    t.setColor(i, lum, lum * 1.0, lum * 1.03);
    t.rough[i] = clamp01(rough);
    t.metal[i] = clamp01(metal);
    t.height[i] = hgt;
  });
  return finish(t.bake({ normalStrength: 2.2 }));
}

// ---------------------------------------------------------------------------
// Dark deck grid: charcoal plates with lighter recessed grid, anti-slip texture, worn lanes
// ---------------------------------------------------------------------------
export function makeDeckGrid(size = 1024, seed = 77) {
  const t = new TexGen(size, size);
  const n = 4; // plates per tile
  t.each((u, v, i) => {
    const fu = (u * n) % 1;
    const fv = (v * n) % 1;
    const ed = Math.min(fu, 1 - fu, fv, 1 - fv);
    const seam = clamp01(1 - ed / 0.02);
    const knurl = vnoise(u, v, 256, seed + 1);
    const n1 = fbm(u, v, { octaves: 4, freq: 6, seed });
    let lum = 0.62 + (n1 - 0.5) * 0.12 + (knurl - 0.5) * 0.06;
    lum *= 1 - seam * 0.45;
    // worn lane down the middle of each plate row
    const lane = Math.exp(-Math.pow((fv - 0.5) / 0.25, 2));
    lum += lane * 0.05 * (n1 - 0.3);
    let rough = 0.66 + (n1 - 0.5) * 0.14 + seam * 0.2 - lane * 0.08;
    t.setColor(i, lum, lum * 1.0, lum * 1.04);
    t.rough[i] = clamp01(rough);
    t.metal[i] = 0.55;
    t.height[i] = 0.5 - seam * 0.3 + (knurl - 0.5) * 0.08;
  });
  return finish(t.bake({ normalStrength: 2.0 }));
}

// ---------------------------------------------------------------------------
// Hexagonal cell panel (TIE solar wings): near-black with a fine hex grid and a darker frame
// ---------------------------------------------------------------------------
export function makeHexPanel(size = 512, seed = 41) {
  const t = new TexGen(size, size);
  const hexR = 1 / 14;
  t.each((u, v, i) => {
    // hex grid distance
    const q = (u * Math.sqrt(3)) / (3 * hexR);
    const r = (v - (u * Math.sqrt(3)) / 3) / (3 * hexR);
    const hx = Math.round(q);
    const hz = Math.round(r);
    // approximate via offset grid: sample nearest hex centre in axial coords
    let best = 1;
    for (let dq = -1; dq <= 1; dq++) {
      for (let dr = -1; dr <= 1; dr++) {
        const cq = hx + dq;
        const cr = hz + dr;
        const cx = (cq * 3 * hexR) / Math.sqrt(3);
        const cy = cr * 3 * hexR + (cx * Math.sqrt(3)) / 3;
        const d = Math.hypot(u - cx, v - cy);
        if (d < best) best = d;
      }
    }
    const cell = clamp01(best / (hexR * 1.7));
    const line = smooth(clamp01((cell - 0.78) / 0.12));
    const n1 = fbm(u, v, { octaves: 3, freq: 8, seed });
    let lum = 0.22 + (n1 - 0.5) * 0.08;
    lum = lerp(lum, 0.09, line);
    t.setColor(i, lum * 0.95, lum, lum * 1.15);
    t.rough[i] = lerp(0.35, 0.7, line);
    t.metal[i] = lerp(0.2, 0.6, line);
    t.height[i] = 0.5 - line * 0.2;
  });
  return finish(t.bake({ normalStrength: 1.8 }));
}

// ---------------------------------------------------------------------------
// Console UI: dark screen with a coloured scheme (blue "tactical", red "alert", amber "systems",
// green "sensor"). Static pattern; the material animates via emissive intensity / offset.
// ---------------------------------------------------------------------------
export function makeImperialScreen(w = 512, h = 256, seed = 5, scheme = "blue") {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  const col = { blue: ["#4f8dff", "#9fc4ff", "#ff4a3a"], red: ["#ff3b2e", "#ff8a7a", "#ffc36b"], amber: ["#ffb040", "#ffd890", "#ff4a3a"], green: ["#4fe08a", "#a8ffd0", "#ffb040"], white: ["#cfe0ff", "#ffffff", "#ff4a3a"] }[scheme] || ["#4f8dff", "#9fc4ff", "#ff4a3a"];
  const [accent, bright, warn] = col;
  ctx.fillStyle = "#020408";
  ctx.fillRect(0, 0, w, h);
  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  // grid
  ctx.strokeStyle = rgba(accent, 0.1);
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
  const kind = Math.floor(rand() * 4);
  // header
  ctx.fillStyle = accent;
  ctx.fillRect(pad, pad, w - pad * 2, 2);
  ctx.fillRect(pad, pad + 6, 70 + rand() * 80, 9);
  ctx.fillStyle = rgba(bright, 0.6);
  for (let k = 0; k < 4; k++) ctx.fillRect(w - pad - 110 + k * 26, pad + 6, 18, 9);
  // glyph rows (angular block glyphs)
  const glyphRow = (x, y, n, a) => {
    for (let g = 0; g < n; g++) {
      ctx.fillStyle = rgba(rand() < 0.1 ? warn : accent, a);
      const gx = x + g * 9;
      const kind2 = Math.floor(rand() * 4);
      if (kind2 === 0) ctx.fillRect(gx, y, 6, 6);
      else if (kind2 === 1) {
        ctx.fillRect(gx, y, 6, 2);
        ctx.fillRect(gx, y + 4, 6, 2);
      } else if (kind2 === 2) {
        ctx.fillRect(gx, y, 2, 6);
        ctx.fillRect(gx + 4, y, 2, 6);
      } else {
        ctx.fillRect(gx, y, 6, 2);
        ctx.fillRect(gx + 2, y + 2, 2, 4);
      }
    }
  };
  if (kind === 0) {
    // tactical: wireframe wedge + rings + target boxes
    const cx = w * 0.62;
    const cy = h * 0.55;
    ctx.strokeStyle = rgba(accent, 0.5);
    ctx.lineWidth = 1;
    for (let r = 20; r < 90; r += 22) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - 90, cy);
    ctx.lineTo(cx + 90, cy);
    ctx.moveTo(cx, cy - 90);
    ctx.lineTo(cx, cy + 90);
    ctx.stroke();
    ctx.strokeStyle = bright;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 46);
    ctx.lineTo(cx + 26, cy + 30);
    ctx.lineTo(cx - 26, cy + 30);
    ctx.closePath();
    ctx.stroke();
    for (let k = 0; k < 5; k++) {
      const tx = cx + (rand() - 0.5) * 160;
      const ty = cy + (rand() - 0.5) * 140;
      ctx.strokeStyle = rand() < 0.4 ? warn : accent;
      ctx.strokeRect(tx - 5, ty - 5, 10, 10);
    }
    let y = pad + 30;
    while (y < h - pad - 10) {
      glyphRow(pad, y, 8 + Math.floor(rand() * 10), 0.8);
      y += 13;
    }
  } else if (kind === 1) {
    // systems: bar columns + waveform
    let y = pad + 30;
    for (let r = 0; r < 6; r++) {
      glyphRow(pad, y, 6, 0.8);
      ctx.fillStyle = rgba(accent, 0.25);
      ctx.fillRect(pad + 70, y, w * 0.4, 6);
      ctx.fillStyle = rand() < 0.2 ? warn : accent;
      ctx.fillRect(pad + 70, y, w * 0.4 * rand(), 6);
      y += 16;
    }
    ctx.strokeStyle = bright;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const gy = h * 0.72;
    for (let i = 0; i <= 60; i++) {
      const px = pad + (i / 60) * (w - pad * 2);
      const py = gy + Math.sin(i * 0.5 + seed) * 18 + (rand() - 0.5) * 10;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = rgba(accent, 0.3);
    ctx.strokeRect(pad, gy - 34, w - pad * 2, 68);
  } else if (kind === 2) {
    // navigation: star chart with a hyperlane arc
    ctx.fillStyle = rgba(bright, 0.8);
    for (let k = 0; k < 90; k++) ctx.fillRect(pad + rand() * (w - pad * 2), pad + 26 + rand() * (h - pad * 2 - 26), 1.5, 1.5);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.8);
    ctx.quadraticCurveTo(w * 0.5, h * 0.2, w * 0.86, h * 0.6);
    ctx.stroke();
    for (const [fx, fy] of [[0.15, 0.8], [0.5, 0.45], [0.86, 0.6]]) {
      ctx.strokeStyle = warn;
      ctx.beginPath();
      ctx.arc(w * fx, h * fy, 8, 0, Math.PI * 2);
      ctx.stroke();
      glyphRow(w * fx + 12, h * fy - 3, 4, 0.9);
    }
    let y = pad + 30;
    while (y < h * 0.5) {
      glyphRow(pad, y, 5 + Math.floor(rand() * 6), 0.7);
      y += 13;
    }
  } else {
    // status grid: cells with a few alerts
    const cols = 8;
    const rows = 5;
    const cw = (w - pad * 2) / cols;
    const ch = (h - pad * 2 - 30) / rows;
    for (let r = 0; r < rows; r++) {
      for (let cc = 0; cc < cols; cc++) {
        const a = rand();
        ctx.fillStyle = a < 0.08 ? warn : rgba(accent, 0.25 + rand() * 0.5);
        ctx.fillRect(pad + cc * cw + 2, pad + 30 + r * ch + 2, cw - 4, ch - 4);
        ctx.fillStyle = rgba(bright, 0.8);
        ctx.fillRect(pad + cc * cw + 6, pad + 30 + r * ch + 6, cw * 0.4 * rand(), 3);
      }
    }
  }
  // scanlines + vignette
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  for (let yy = 0; yy < h; yy += 3) ctx.fillRect(0, yy, w, 1);
  const grd = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7);
  grd.addColorStop(0, "rgba(0,0,0,0)");
  grd.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  return toTexture(c, { srgb: true, wrap: false });
}

// ---------------------------------------------------------------------------
// Superstructure window lights: emissive dots on black (RGBA), tiled over terrace faces. Rows of
// small warm-white windows with a few darker / off cells. Tile ≈ 40 m of wall.
// ---------------------------------------------------------------------------
export function makeCityLights(w = 512, h = 256, seed = 9) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  ctx.clearRect(0, 0, w, h);
  const rows = 6;
  const cols = 40;
  for (let r = 0; r < rows; r++) {
    const y = ((r + 0.5) / rows) * h;
    for (let cc = 0; cc < cols; cc++) {
      if (rand() < 0.42) continue;
      const x = ((cc + 0.5) / cols) * w;
      const warm = rand();
      ctx.fillStyle = warm < 0.7 ? "rgba(255,236,200,1)" : warm < 0.9 ? "rgba(190,215,255,1)" : "rgba(255,120,90,1)";
      ctx.globalAlpha = 0.6 + rand() * 0.4;
      ctx.fillRect(x - 2, y - 1.2, 4, 2.4);
    }
  }
  ctx.globalAlpha = 1;
  return toTexture(c, { srgb: true, wrap: true });
}

// ---------------------------------------------------------------------------
// Chevron hazard marking: diagonal stripes in two colours (yellow/black hangar deck, red/black blast)
// ---------------------------------------------------------------------------
export function makeChevron(size = 256, colA = "#e8c33a", colB = "#141416", seed = 3) {
  const t = new TexGen(size, size);
  const a = new THREE.Color(colA);
  const b = new THREE.Color(colB);
  t.each((u, v, i) => {
    const s = (u + v) % 1;
    const k = smooth(clamp01((Math.abs(s - 0.5) - 0.24) / 0.02));
    const n = fbm(u, v, { octaves: 4, freq: 12, seed });
    const wear = clamp01((n - 0.62) * 5);
    const col = k > 0.5 ? a : b;
    const lum = 1 - wear * 0.5;
    t.setColor(i, lerp(col.r, 0.5, wear * 0.6) * lum, lerp(col.g, 0.5, wear * 0.6) * lum, lerp(col.b, 0.5, wear * 0.6) * lum);
    t.rough[i] = 0.7 + wear * 0.2;
    t.metal[i] = 0.1;
    t.height[i] = 0.5 - wear * 0.05;
  });
  return finish(t.bake({ normalStrength: 1.0 }));
}

// ---------------------------------------------------------------------------
// Imperial decal atlas (4×4 cells, RGBA). Original stencil glyphs: cog emblem, bay numbers,
// arrows, hazard triangles, glyph strings (angular script), keep-clear boxes, a droid-service mark.
// ---------------------------------------------------------------------------
export const IMP_DECAL_CELLS = 4;
export function impDecalRect(index) {
  const n = IMP_DECAL_CELLS;
  const cx = index % n;
  const cy = Math.floor(index / n);
  const pad = 0.006;
  return [cx / n + pad, 1 - (cy + 1) / n + pad, (cx + 1) / n - pad, 1 - cy / n - pad];
}
export const IMP_DECAL = {
  cog: 0,
  bay01: 1,
  bay02: 2,
  bay03: 3,
  arrowUp: 4,
  arrowRight: 5,
  hazard: 6,
  keepClear: 7,
  glyphs1: 8,
  glyphs2: 9,
  glyphs3: 10,
  restricted: 11,
  turbolift: 12,
  medical: 13,
  power: 14,
  vacuum: 15,
};

export function makeImperialDecals(size = 1024, seed = 19) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  const cell = size / IMP_DECAL_CELLS;
  ctx.clearRect(0, 0, size, size);
  const ink = (a = 1) => `rgba(18,18,22,${a})`;
  const white = (a = 1) => `rgba(225,228,235,${a})`;
  const red = (a = 1) => `rgba(220,50,40,${a})`;
  const yellow = (a = 1) => `rgba(232,195,58,${a})`;

  const glyphString = (x, y, n, h, color) => {
    ctx.fillStyle = color;
    for (let g = 0; g < n; g++) {
      const gx = x + g * h * 0.9;
      const k = Math.floor(rand() * 6);
      const s = h * 0.7;
      const t = h * 0.14;
      switch (k) {
        case 0:
          ctx.fillRect(gx, y, s, t);
          ctx.fillRect(gx, y, t, s);
          break;
        case 1:
          ctx.fillRect(gx, y + s - t, s, t);
          ctx.fillRect(gx + s - t, y, t, s);
          break;
        case 2:
          ctx.fillRect(gx, y + s / 2 - t / 2, s, t);
          ctx.fillRect(gx + s / 2 - t / 2, y, t, s);
          break;
        case 3:
          ctx.fillRect(gx, y, s, t);
          ctx.fillRect(gx, y + s - t, s, t);
          ctx.fillRect(gx + s / 2 - t / 2, y, t, s);
          break;
        case 4:
          ctx.beginPath();
          ctx.moveTo(gx, y + s);
          ctx.lineTo(gx + s / 2, y);
          ctx.lineTo(gx + s, y + s);
          ctx.lineTo(gx + s - t * 1.4, y + s);
          ctx.lineTo(gx + s / 2, y + t * 1.6);
          ctx.lineTo(gx + t * 1.4, y + s);
          ctx.closePath();
          ctx.fill();
          break;
        default:
          ctx.fillRect(gx, y, t, s);
          ctx.fillRect(gx + s - t, y + s / 2, t, s / 2);
          ctx.fillRect(gx, y + s / 2 - t / 2, s, t);
      }
    }
  };
  const erode = (x0, y0) => {
    // knock out speckles so stencils read as worn paint
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    for (let k = 0; k < 140; k++) {
      ctx.globalAlpha = 0.3 + rand() * 0.6;
      const r = 1 + rand() * 3.5;
      ctx.beginPath();
      ctx.arc(x0 + rand() * cell, y0 + rand() * cell, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  const at = (index, fn) => {
    const cx = (index % IMP_DECAL_CELLS) * cell;
    const cy = Math.floor(index / IMP_DECAL_CELLS) * cell;
    ctx.save();
    ctx.translate(cx, cy);
    fn(cell);
    ctx.restore();
    erode(cx, cy);
  };
  // cog emblem (original: 8-tooth wheel, inner ring, six spokes)
  at(IMP_DECAL.cog, (s) => {
    const c0 = s / 2;
    ctx.fillStyle = white();
    ctx.beginPath();
    ctx.arc(c0, c0, s * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink(0);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(c0, c0, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      ctx.save();
      ctx.translate(c0, c0);
      ctx.rotate(a);
      ctx.fillStyle = white();
      ctx.fillRect(-s * 0.05, -s * 0.44, s * 0.1, s * 0.1);
      ctx.restore();
    }
    ctx.fillStyle = white();
    ctx.beginPath();
    ctx.arc(c0, c0, s * 0.19, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
      ctx.save();
      ctx.translate(c0, c0);
      ctx.rotate(a);
      ctx.fillRect(-s * 0.03, -s * 0.3, s * 0.06, s * 0.12);
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.arc(c0, c0, s * 0.09, 0, Math.PI * 2);
    ctx.fill();
  });
  const bayNumber = (index, txt) =>
    at(index, (s) => {
      ctx.fillStyle = white();
      ctx.font = `bold ${Math.floor(s * 0.62)}px "Arial Narrow", Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(txt, s / 2, s / 2 + s * 0.02);
      ctx.fillRect(s * 0.12, s * 0.86, s * 0.76, s * 0.05);
    });
  bayNumber(IMP_DECAL.bay01, "01");
  bayNumber(IMP_DECAL.bay02, "07");
  bayNumber(IMP_DECAL.bay03, "12");
  const arrow = (index, rot) =>
    at(index, (s) => {
      ctx.save();
      ctx.translate(s / 2, s / 2);
      ctx.rotate(rot);
      ctx.fillStyle = white();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.4);
      ctx.lineTo(s * 0.34, -s * 0.02);
      ctx.lineTo(s * 0.13, -s * 0.02);
      ctx.lineTo(s * 0.13, s * 0.4);
      ctx.lineTo(-s * 0.13, s * 0.4);
      ctx.lineTo(-s * 0.13, -s * 0.02);
      ctx.lineTo(-s * 0.34, -s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  arrow(IMP_DECAL.arrowUp, 0);
  arrow(IMP_DECAL.arrowRight, Math.PI / 2);
  at(IMP_DECAL.hazard, (s) => {
    ctx.fillStyle = yellow();
    ctx.beginPath();
    ctx.moveTo(s / 2, s * 0.1);
    ctx.lineTo(s * 0.92, s * 0.85);
    ctx.lineTo(s * 0.08, s * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ink();
    ctx.fillRect(s * 0.46, s * 0.36, s * 0.08, s * 0.3);
    ctx.fillRect(s * 0.46, s * 0.7, s * 0.08, s * 0.08);
  });
  at(IMP_DECAL.keepClear, (s) => {
    ctx.strokeStyle = yellow();
    ctx.lineWidth = s * 0.06;
    ctx.strokeRect(s * 0.1, s * 0.1, s * 0.8, s * 0.8);
    ctx.beginPath();
    ctx.moveTo(s * 0.1, s * 0.1);
    ctx.lineTo(s * 0.9, s * 0.9);
    ctx.moveTo(s * 0.9, s * 0.1);
    ctx.lineTo(s * 0.1, s * 0.9);
    ctx.stroke();
  });
  at(IMP_DECAL.glyphs1, (s) => {
    glyphString(s * 0.08, s * 0.2, 6, s * 0.14, white());
    glyphString(s * 0.08, s * 0.45, 8, s * 0.1, white(0.8));
    glyphString(s * 0.08, s * 0.66, 5, s * 0.12, white());
  });
  at(IMP_DECAL.glyphs2, (s) => {
    glyphString(s * 0.1, s * 0.3, 4, s * 0.22, white());
    ctx.fillStyle = white();
    ctx.fillRect(s * 0.1, s * 0.62, s * 0.8, s * 0.04);
    glyphString(s * 0.1, s * 0.72, 7, s * 0.1, white(0.8));
  });
  at(IMP_DECAL.glyphs3, (s) => {
    ctx.fillStyle = red();
    ctx.fillRect(s * 0.06, s * 0.1, s * 0.88, s * 0.26);
    glyphString(s * 0.12, s * 0.15, 6, s * 0.16, ink());
    glyphString(s * 0.1, s * 0.5, 8, s * 0.1, white(0.85));
    glyphString(s * 0.1, s * 0.68, 8, s * 0.1, white(0.85));
  });
  at(IMP_DECAL.restricted, (s) => {
    ctx.strokeStyle = red();
    ctx.lineWidth = s * 0.07;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.25, s * 0.25);
    ctx.lineTo(s * 0.75, s * 0.75);
    ctx.stroke();
    glyphString(s * 0.2, s * 0.88, 5, s * 0.1, red());
  });
  at(IMP_DECAL.turbolift, (s) => {
    ctx.fillStyle = white();
    ctx.fillRect(s * 0.2, s * 0.15, s * 0.6, s * 0.7);
    ctx.fillStyle = ink();
    ctx.fillRect(s * 0.26, s * 0.21, s * 0.22, s * 0.58);
    ctx.fillRect(s * 0.52, s * 0.21, s * 0.22, s * 0.58);
    ctx.fillStyle = white();
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.02);
    ctx.lineTo(s * 0.58, s * 0.12);
    ctx.lineTo(s * 0.42, s * 0.12);
    ctx.closePath();
    ctx.fill();
  });
  at(IMP_DECAL.medical, (s) => {
    ctx.fillStyle = white();
    ctx.fillRect(s * 0.4, s * 0.12, s * 0.2, s * 0.76);
    ctx.fillRect(s * 0.12, s * 0.4, s * 0.76, s * 0.2);
  });
  at(IMP_DECAL.power, (s) => {
    ctx.fillStyle = yellow();
    ctx.beginPath();
    ctx.moveTo(s * 0.58, s * 0.08);
    ctx.lineTo(s * 0.3, s * 0.55);
    ctx.lineTo(s * 0.5, s * 0.55);
    ctx.lineTo(s * 0.42, s * 0.92);
    ctx.lineTo(s * 0.72, s * 0.42);
    ctx.lineTo(s * 0.52, s * 0.42);
    ctx.closePath();
    ctx.fill();
  });
  at(IMP_DECAL.vacuum, (s) => {
    ctx.strokeStyle = white();
    ctx.lineWidth = s * 0.06;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = white();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(s / 2 + Math.cos(a) * s * 0.42, s / 2 + Math.sin(a) * s * 0.42, s * 0.035, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  return toTexture(c, { srgb: true, wrap: false, anisotropy: 8 });
}

// ---------------------------------------------------------------------------
// Engine glow / containment field gradient sprite (radial, for additive quads)
// ---------------------------------------------------------------------------
export function makeGlowDisc(size = 256, inner = 0.3) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(inner, "rgba(255,255,255,0.85)");
  g.addColorStop(0.7, "rgba(255,255,255,0.18)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return toTexture(c, { srgb: true, wrap: false });
}

// Hexagonal containment-field pattern (RGBA, tiles): faint hex lattice with a soft interference band
export function makeFieldPattern(size = 512, seed = 12) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  const r = size / 12;
  ctx.strokeStyle = "rgba(160,200,255,0.55)";
  ctx.lineWidth = 1.5;
  const hexAt = (cx, cy) => {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  };
  const dx = r * Math.sqrt(3);
  const dy = r * 1.5;
  for (let row = -1; row < size / dy + 1; row++) {
    for (let col = -1; col < size / dx + 1; col++) {
      hexAt(col * dx + (row % 2 ? dx / 2 : 0), row * dy);
    }
  }
  return toTexture(c, { srgb: true, wrap: true });
}
