// Procedural art kit — every sprite is drawn in code. One shared palette and
// outline treatment so the whole set reads as a single style.
import { clamp, lerp, mulberry32 } from './util.js';

export const PAL = {
  out: '#372d54',
  skin: '#f6c894', skinSh: '#dfa76d',
  steel: '#c6cede', steelSh: '#939eb9', steelLt: '#eef2fa',
  blue: '#3f7cf6', blueDk: '#2b58c8', blueLt: '#7db0ff',
  red: '#e0483e', redDk: '#a92c28', redLt: '#ff8a70',
  gold: '#ffc93c', goldDk: '#e29a19', goldLt: '#ffe89c',
  wood: '#b5793c', woodDk: '#8a5626', woodLt: '#d99c5c',
  stone: '#cfc6b3', stoneSh: '#a79c86', stoneLt: '#e9e2d2',
  grassA: '#a4de55', grassB: '#93cf45', grassOut: '#48922e',
  river: '#3f9fe0', riverDk: '#2f7fc0', riverLt: '#8fd4f7',
  elixir: '#e453e0', elixirDk: '#a827aa', elixirLt: '#ff9df2',
};

export const TEAM = {
  player: { main: PAL.blue, dk: PAL.blueDk, lt: PAL.blueLt, bar: '#3fa4ff', barDk: '#1b62c8' },
  enemy: { main: PAL.red, dk: PAL.redDk, lt: PAL.redLt, bar: '#ff5a4a', barDk: '#a92018' },
};

export function mkCanvas(w, h, s = 2) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * s); c.height = Math.ceil(h * s);
  const x = c.getContext('2d');
  x.scale(s, s);
  x.lineJoin = 'round'; x.lineCap = 'round';
  return [c, x];
}

/* ================= shading toolkit ================= */
function hex2rgb(h) {
  let s = h.slice(1);
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const to2 = (v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');

// blend two hex colors; k = 0 -> a, k = 1 -> b
export function mix(a, b, k) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return `#${to2(Math.round(A[0] + (B[0] - A[0]) * k))}${to2(Math.round(A[1] + (B[1] - A[1]) * k))}${to2(Math.round(A[2] + (B[2] - A[2]) * k))}`;
}

// unified lighting: positive k lifts toward warm sunlight, negative sinks toward cool shadow
export function shade(h, k) {
  return k >= 0 ? mix(h, '#fff3d0', k) : mix(h, '#221c38', -k);
}

export function rgba(h, a) {
  const [r, g, b] = hex2rgb(h);
  return `rgba(${r},${g},${b},${a})`;
}

export function grad(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [p, c] of stops) g.addColorStop(p, c);
  return g;
}

export function rgrad(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [p, c] of stops) g.addColorStop(p, c);
  return g;
}

export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Stroke-then-fill. The edge is a deep shade of the fill itself (not universal
// ink), which is the single biggest lever between "flat sticker" and "rendered
// object": shapes separate by shading, the way lit geometry does.
const edgeCache = new Map();
export function edgeFor(fill) {
  if (typeof fill !== 'string' || fill[0] !== '#') return PAL.out;
  const key = fill.length > 7 ? fill.slice(0, 7) : fill;
  let v = edgeCache.get(key);
  // gentle occlusion tint: reads as shading at the silhouette, not a drawn line
  if (!v) { v = mix(key, '#241a3e', 0.34); edgeCache.set(key, v); }
  return v;
}
export function of(ctx, fill, lw = 4) {
  ctx.strokeStyle = edgeFor(fill); ctx.lineWidth = lw * 0.6; ctx.stroke();
  ctx.fillStyle = fill; ctx.fill();
}

export function ell(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

export function outlineText(ctx, txt, x, y, size, fill = '#fff', lw = 0) {
  ctx.font = `${size}px "Lilita One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PAL.out; ctx.lineWidth = lw || Math.max(3, size * 0.28);
  ctx.strokeText(txt, x, y);
  ctx.fillStyle = fill; ctx.fillText(txt, x, y);
}

/* ================= icons ================= */

export function coinCanvas(sz = 26) {
  const [c, x] = mkCanvas(sz, sz, 3);
  const r = sz / 2 - 2.5, cx = sz / 2, cy = sz / 2;
  ell(x, cx, cy, r, r); of(x, PAL.gold, 3.4);
  ell(x, cx, cy, r * 0.66, r * 0.66);
  x.strokeStyle = PAL.goldDk; x.lineWidth = 2; x.stroke();
  x.fillStyle = PAL.goldDk;
  x.font = `bold ${sz * 0.5}px "Lilita One", sans-serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('$', cx, cy + 0.5);
  x.fillStyle = '#ffffffb0';
  ell(x, cx - r * 0.42, cy - r * 0.45, r * 0.24, r * 0.15); x.fill();
  return c;
}

export function gemCanvas(sz = 26) {
  const [c, x] = mkCanvas(sz, sz, 3);
  const cx = sz / 2, cy = sz / 2 + 0.5, r = sz / 2 - 3;
  x.beginPath();
  x.moveTo(cx - r, cy - r * 0.35);
  x.lineTo(cx - r * 0.5, cy - r * 0.9);
  x.lineTo(cx + r * 0.5, cy - r * 0.9);
  x.lineTo(cx + r, cy - r * 0.35);
  x.lineTo(cx, cy + r);
  x.closePath();
  of(x, '#3ddc84', 3.4);
  x.fillStyle = '#7ff7b2';
  x.beginPath();
  x.moveTo(cx - r * 0.45, cy - r * 0.35); x.lineTo(cx - r * 0.2, cy - r * 0.82); x.lineTo(cx + r * 0.1, cy - r * 0.35); x.closePath(); x.fill();
  x.fillStyle = '#18a05c88';
  x.beginPath();
  x.moveTo(cx, cy + r); x.lineTo(cx + r, cy - r * 0.35); x.lineTo(cx + r * 0.2, cy - r * 0.35); x.closePath(); x.fill();
  return c;
}

export function crownCanvas(w = 30, fill = PAL.gold) {
  const h = w * 0.85;
  const [c, x] = mkCanvas(w, h, 3);
  const bx = w * 0.12, by = h * 0.82;
  x.beginPath();
  x.moveTo(bx, by);
  x.lineTo(bx - w * 0.02, h * 0.28);
  x.lineTo(w * 0.32, h * 0.5);
  x.lineTo(w * 0.5, h * 0.14);
  x.lineTo(w * 0.68, h * 0.5);
  x.lineTo(w - bx + w * 0.02, h * 0.28);
  x.lineTo(w - bx, by);
  x.closePath();
  of(x, fill, 3.6);
  rr(x, bx - 1, by - h * 0.1, w - bx * 2 + 2, h * 0.16, 2); of(x, PAL.goldDk === fill ? fill : PAL.gold, 3);
  x.fillStyle = '#e0483e';
  ell(x, w * 0.5, h * 0.52, w * 0.08, w * 0.08); x.fill();
  x.strokeStyle = PAL.out; x.lineWidth = 1.4; x.stroke();
  x.fillStyle = '#ffffff99';
  ell(x, w * 0.5 - w * 0.03, h * 0.49, w * 0.03, w * 0.025); x.fill();
  return c;
}

export function elixirDropCanvas(w = 26, h = 30) {
  const [c, x] = mkCanvas(w, h, 3);
  const cx = w / 2;
  x.beginPath();
  x.moveTo(cx, 2.5);
  x.bezierCurveTo(cx + w * 0.42, h * 0.42, cx + w * 0.36, h - 2.5, cx, h - 2.5);
  x.bezierCurveTo(cx - w * 0.36, h - 2.5, cx - w * 0.42, h * 0.42, cx, 2.5);
  x.closePath();
  of(x, PAL.elixir, 3.6);
  const g = x.createRadialGradient(cx - 2, h * 0.62, 1, cx, h * 0.62, w * 0.4);
  g.addColorStop(0, PAL.elixirLt); g.addColorStop(1, '#ff9df200');
  x.fillStyle = g; x.fill();
  x.fillStyle = '#ffffffcc';
  ell(x, cx - w * 0.14, h * 0.38, w * 0.09, h * 0.1); x.fill();
  return c;
}

export function cloudCanvas(w = 130) {
  const h = w * 0.46;
  const [c, x] = mkCanvas(w, h, 2);
  const lobes = [
    [w * 0.2, h * 0.6, w * 0.15],
    [w * 0.42, h * 0.42, w * 0.2],
    [w * 0.66, h * 0.52, w * 0.165],
    [w * 0.85, h * 0.66, w * 0.105],
    [w * 0.1, h * 0.72, w * 0.09],
  ];
  // single path: lobes + flat base (no beginPath reset in between)
  x.beginPath();
  for (const [lx, ly, r] of lobes) {
    x.moveTo(lx + r, ly);
    x.arc(lx, ly, r, 0, Math.PI * 2);
  }
  const bx = w * 0.04, by = h * 0.58, bw = w * 0.9, bh = h * 0.28, br = bh / 2;
  x.moveTo(bx + br, by);
  x.arcTo(bx + bw, by, bx + bw, by + bh, br);
  x.arcTo(bx + bw, by + bh, bx, by + bh, br);
  x.arcTo(bx, by + bh, bx, by, br);
  x.arcTo(bx, by, bx + bw, by, br);
  x.closePath();
  x.strokeStyle = '#bcd9f2'; x.lineWidth = 5; x.stroke();
  x.fillStyle = '#ffffff'; x.fill();
  // soft belly shading
  x.fillStyle = '#d8ecfa';
  x.beginPath();
  x.moveTo(bx + br, by + bh * 0.4);
  x.arcTo(bx + bw, by + bh * 0.4, bx + bw, by + bh, br * 0.6);
  x.arcTo(bx + bw, by + bh, bx, by + bh, br * 0.6);
  x.arcTo(bx, by + bh, bx, by + bh * 0.4, br * 0.6);
  x.arcTo(bx, by + bh * 0.4, bx + bw, by + bh * 0.4, br * 0.6);
  x.closePath();
  x.fill();
  return c;
}

export function treeCanvas(w = 64) {
  const h = w * 1.2;
  const [c, x] = mkCanvas(w, h, 2);
  // trunk
  rr(x, w * 0.44, h * 0.62, w * 0.13, h * 0.32, w * 0.05);
  of(x, PAL.woodDk, 4);
  // canopy: three stacked blobs
  ell(x, w * 0.5, h * 0.44, w * 0.4, h * 0.3); of(x, '#5faf3f', 4.4);
  ell(x, w * 0.32, h * 0.32, w * 0.23, h * 0.18); of(x, '#6cbb49', 3.6);
  ell(x, w * 0.64, h * 0.28, w * 0.26, h * 0.2); of(x, '#7ec850', 3.6);
  // highlights
  x.fillStyle = '#a2d95a88';
  ell(x, w * 0.58, h * 0.2, w * 0.13, h * 0.08); x.fill();
  ell(x, w * 0.28, h * 0.26, w * 0.09, h * 0.06); x.fill();
  return c;
}

export function bushCanvas(w = 46) {
  const h = w * 0.68;
  const [c, x] = mkCanvas(w, h, 2);
  // single lobed blob silhouette
  x.beginPath();
  x.moveTo(w * 0.08, h * 0.82);
  x.quadraticCurveTo(w * 0.02, h * 0.5, w * 0.2, h * 0.42);
  x.quadraticCurveTo(w * 0.2, h * 0.14, w * 0.42, h * 0.24);
  x.quadraticCurveTo(w * 0.52, h * 0.02, w * 0.68, h * 0.22);
  x.quadraticCurveTo(w * 0.92, h * 0.2, w * 0.88, h * 0.5);
  x.quadraticCurveTo(w * 0.99, h * 0.62, w * 0.92, h * 0.82);
  x.quadraticCurveTo(w * 0.5, h * 0.95, w * 0.08, h * 0.82);
  x.closePath();
  of(x, '#6cbb49', 4);
  // highlight lobe
  x.fillStyle = '#a2d95a99';
  ell(x, w * 0.6, h * 0.3, w * 0.14, h * 0.1); x.fill();
  ell(x, w * 0.32, h * 0.4, w * 0.1, h * 0.08); x.fill();
  // berries
  x.fillStyle = '#e0483e';
  ell(x, w * 0.28, h * 0.62, w * 0.045, w * 0.045); x.fill();
  ell(x, w * 0.7, h * 0.58, w * 0.045, w * 0.045); x.fill();
  x.strokeStyle = PAL.out; x.lineWidth = 1.4;
  ell(x, w * 0.28, h * 0.62, w * 0.045, w * 0.045); x.stroke();
  ell(x, w * 0.7, h * 0.58, w * 0.045, w * 0.045); x.stroke();
  return c;
}

export function swordsCanvas(sz = 34) {
  const [c, x] = mkCanvas(sz, sz, 3);
  const draw = (flip) => {
    x.save();
    x.translate(sz / 2, sz / 2);
    x.scale(flip, 1);
    x.rotate(Math.PI / 4);
    // blade
    x.beginPath();
    x.moveTo(-3, -sz * 0.42); x.lineTo(3, -sz * 0.42); x.lineTo(3.4, sz * 0.1); x.lineTo(-3.4, sz * 0.1);
    x.closePath(); of(x, PAL.steel, 3);
    x.fillStyle = PAL.steelLt; x.fillRect(-3, -sz * 0.4, 2.4, sz * 0.48);
    // guard + grip
    rr(x, -7, sz * 0.1, 14, 4.6, 2.2); of(x, PAL.gold, 3);
    rr(x, -2.4, sz * 0.145 + 2, 4.8, sz * 0.2, 2.2); of(x, PAL.woodDk, 3);
    ell(x, 0, sz * 0.36, 3.4, 3.4); of(x, PAL.gold, 3);
    x.restore();
  };
  draw(1); draw(-1);
  return c;
}

/* ================= chest ================= */
// anchor cx,cy = center of the BODY. open01: 0 closed -> 1 lid hovering above.
// glowR caps the halo radius so it never clips against canvas bounds.
export function drawChest(ctx, cx, cy, w, { open01 = 0, wobble = 0, glow = 0, kind = 'wood', glowR = 0 } = {}) {
  const bodyH = w * 0.46, lidH = w * 0.34;
  const gold = kind === 'gold';
  const wc = gold ? PAL.gold : PAL.wood, wcd = gold ? PAL.goldDk : PAL.woodDk, wcl = gold ? PAL.goldLt : PAL.woodLt;
  const band = gold ? '#8a5626' : PAL.gold, bandDk = gold ? '#6b3f16' : PAL.goldDk;
  const lw = Math.max(3, w * 0.05);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(wobble);
  if (glow > 0) {
    const R = glowR || w * 0.9;
    const g = ctx.createRadialGradient(0, -bodyH * 0.2, R * 0.12, 0, -bodyH * 0.2, R);
    g.addColorStop(0, `rgba(255,220,110,${0.5 * glow})`);
    g.addColorStop(1, 'rgba(255,220,110,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, -bodyH * 0.2, R, 0, Math.PI * 2); ctx.fill();
  }

  // ---- body (open box) ----
  rr(ctx, -w / 2, -bodyH / 2, w, bodyH, w * 0.07); of(ctx, wc, lw);
  rr(ctx, -w / 2, -bodyH / 2, w, bodyH, w * 0.07);
  ctx.fillStyle = grad(ctx, -w / 2, -bodyH / 2, w / 2, bodyH / 2, [
    [0, shade(wc, 0.16)], [0.5, wc], [1, shade(wc, -0.18)],
  ]);
  ctx.fill();
  // planks with grain + seams
  ctx.save();
  rr(ctx, -w / 2, -bodyH / 2, w, bodyH, w * 0.07); ctx.clip();
  ctx.strokeStyle = rgba(shade(wcd, -0.05), 0.55); ctx.lineWidth = Math.max(1, w * 0.012);
  for (let i = 0; i < 3; i++) {
    const gy = -bodyH / 2 + bodyH * (0.24 + i * 0.26);
    ctx.beginPath();
    ctx.moveTo(-w / 2 + w * 0.05, gy);
    ctx.quadraticCurveTo(0, gy + w * 0.012 * (i % 2 ? 1 : -1), w / 2 - w * 0.05, gy);
    ctx.stroke();
  }
  ctx.strokeStyle = wcd; ctx.lineWidth = Math.max(1.4, w * 0.02);
  for (let i = 1; i < 3; i++) {
    const px = -w / 2 + (w / 3) * i;
    ctx.beginPath(); ctx.moveTo(px, -bodyH / 2 + w * 0.04); ctx.lineTo(px, bodyH / 2 - w * 0.05); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(34, 24, 10, 0.22)';
  rr(ctx, -w / 2 + w * 0.015, bodyH / 2 - w * 0.075, w - w * 0.03, w * 0.06, w * 0.02); ctx.fill();
  ctx.restore();
  // metal feet
  for (const fx of [-w / 2 + w * 0.03, w / 2 - w * 0.16]) {
    rr(ctx, fx, bodyH / 2 - w * 0.1, w * 0.13, w * 0.1, w * 0.025); of(ctx, band, lw * 0.7);
  }
  // horizontal band: graded metal with rivets and a specular dash
  rr(ctx, -w / 2 - w * 0.02, -w * 0.02, w + w * 0.04, bodyH * 0.26, w * 0.03);
  of(ctx, band, lw * 0.8);
  rr(ctx, -w / 2 - w * 0.02, -w * 0.02, w + w * 0.04, bodyH * 0.26, w * 0.03);
  ctx.fillStyle = grad(ctx, 0, -w * 0.02, 0, -w * 0.02 + bodyH * 0.26, [
    [0, shade(band, 0.22)], [0.55, band], [1, shade(band, -0.2)],
  ]);
  ctx.fill();
  ctx.fillStyle = bandDk;
  for (const rx of [-w * 0.38, -w * 0.13, w * 0.13, w * 0.38]) {
    ell(ctx, rx, -w * 0.02 + bodyH * 0.13, w * 0.018, w * 0.018); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255, 250, 230, 0.6)';
  rr(ctx, -w * 0.42, w * 0.002, w * 0.14, w * 0.022, w * 0.011); ctx.fill();

  // interior glow + gold pile when open
  if (open01 > 0.12) {
    const k = Math.min(1, open01 * 1.3);
    ctx.fillStyle = '#54350f';
    rr(ctx, -w / 2 + w * 0.05, -bodyH / 2 - w * 0.02, w - w * 0.1, w * 0.1, w * 0.02); ctx.fill();
    const g2 = ctx.createRadialGradient(0, -bodyH / 2, 1, 0, -bodyH / 2, w * 0.55);
    g2.addColorStop(0, `rgba(255,244,180,${0.9 * k})`);
    g2.addColorStop(1, 'rgba(255,244,180,0)');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.arc(0, -bodyH / 2, w * 0.55, 0, Math.PI * 2); ctx.fill();
    // coins peeking out
    for (const [ox, oy, r] of [[-w * 0.22, -bodyH / 2, 0.07], [0, -bodyH / 2 - w * 0.03, 0.085], [w * 0.2, -bodyH / 2, 0.065]]) {
      ell(ctx, ox, oy, w * r, w * r * 0.8); of(ctx, PAL.gold, lw * 0.55);
      ctx.fillStyle = PAL.goldDk;
      ell(ctx, ox, oy, w * r * 0.5, w * r * 0.38); ctx.fill();
    }
  }

  // ---- lid: pops off and hovers ----
  const lift = open01 * (w * 0.5);
  const lidTilt = open01 * -0.16;
  ctx.save();
  ctx.translate(0, -bodyH / 2 - w * 0.015 - lift);
  ctx.rotate(lidTilt);
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(-w / 2, -lidH * 0.4);
  ctx.quadraticCurveTo(-w / 2 + w * 0.02, -lidH, -w * 0.2, -lidH);
  ctx.lineTo(w * 0.2, -lidH);
  ctx.quadraticCurveTo(w / 2 - w * 0.02, -lidH, w / 2, -lidH * 0.4);
  ctx.lineTo(w / 2, 0);
  ctx.closePath();
  of(ctx, wc, lw);
  // lid dome gradient (lit crest, shaded flanks)
  const lidPath = () => {
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2, -lidH * 0.4);
    ctx.quadraticCurveTo(-w / 2 + w * 0.02, -lidH, -w * 0.2, -lidH);
    ctx.lineTo(w * 0.2, -lidH);
    ctx.quadraticCurveTo(w / 2 - w * 0.02, -lidH, w / 2, -lidH * 0.4);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
  };
  lidPath();
  ctx.fillStyle = grad(ctx, 0, -lidH, 0, 0, [
    [0, shade(wc, 0.2)], [0.55, wc], [1, shade(wc, -0.14)],
  ]);
  ctx.fill();
  // lid highlight
  ctx.fillStyle = wcl + '77';
  ctx.beginPath();
  ctx.moveTo(-w * 0.4, -lidH * 0.28);
  ctx.quadraticCurveTo(-w * 0.38, -lidH * 0.8, -w * 0.12, -lidH * 0.84);
  ctx.lineTo(-w * 0.12, -lidH * 0.28);
  ctx.closePath(); ctx.fill();
  // lid center band
  rr(ctx, -w * 0.12, -lidH - lw * 0.3, w * 0.24, lidH + lw * 0.5, w * 0.03);
  of(ctx, band, lw * 0.8);
  // lid rim
  rr(ctx, -w / 2 - w * 0.015, -w * 0.028, w + w * 0.03, w * 0.075, w * 0.03);
  of(ctx, band, lw * 0.75);
  ctx.restore();

  // ---- lock plate on closed chest ----
  if (open01 < 0.25) {
    ctx.globalAlpha = 1 - open01 * 4;
    rr(ctx, -w * 0.1, -bodyH / 2 - w * 0.05, w * 0.2, w * 0.24, w * 0.045);
    of(ctx, PAL.gold, lw * 0.85);
    ctx.fillStyle = bandDk;
    ell(ctx, 0, -bodyH / 2 + w * 0.02, w * 0.032, w * 0.032); ctx.fill();
    ctx.fillRect(-w * 0.013, -bodyH / 2 + w * 0.02, w * 0.026, w * 0.07);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// fits the full closed-chest silhouette in a w×h box (glow capped to the box)
export function chestCanvas(w, h, opts = {}) {
  const [c, x] = mkCanvas(w, h, 3);
  const cw = Math.min(w * 0.86, h * 1.15);
  drawChest(x, w / 2, h * 0.62, cw, { ...opts, glowR: Math.min(w, h) * 0.5 });
  return c;
}

/* ================= units ================= */
// All units: anchor at feet center. pose = { face:1|-1, walk:phase, attack01, flash, s:scale }

function limbSwing(walk, amp) { return Math.sin(walk * Math.PI * 2) * amp; }

function drawFace(ctx, cx, cy, r, team, mood = 'calm') {
  ctx.fillStyle = PAL.out;
  const ex = r * 0.34;
  ell(ctx, cx - ex, cy, r * 0.1, r * 0.14); ctx.fill();
  ell(ctx, cx + ex, cy, r * 0.1, r * 0.14); ctx.fill();
  if (mood === 'angry') {
    ctx.strokeStyle = PAL.out; ctx.lineWidth = r * 0.14;
    ctx.beginPath(); ctx.moveTo(cx - ex - r * 0.16, cy - r * 0.3); ctx.lineTo(cx - ex + r * 0.12, cy - r * 0.16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + ex + r * 0.16, cy - r * 0.3); ctx.lineTo(cx + ex - r * 0.12, cy - r * 0.16); ctx.stroke();
  }
  ctx.strokeStyle = PAL.out; ctx.lineWidth = Math.max(1.2, r * 0.09);
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.34, r * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

export function drawKnight(ctx, x, y, pose = {}) {
  const { face = 1, walk = 0, attack01 = 0, s = 1, team = 'player' } = pose;
  const T = TEAM[team];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face * s, s);
  const bob = Math.abs(Math.sin(walk * Math.PI * 2)) * 1.4;
  const lunge = attack01 > 0 ? Math.sin(attack01 * Math.PI) * 3.5 : 0;
  ctx.translate(lunge, -bob);
  const sw = limbSwing(walk, 3);
  // legs
  rr(ctx, -6.5 + sw * 0.7, -7, 5.5, 8, 2.6); of(ctx, PAL.steelSh, 3.4);
  rr(ctx, 1 - sw * 0.7, -7, 5.5, 8, 2.6); of(ctx, PAL.steelSh, 3.4);
  // shield arm (behind body): domed steel with a lit boss
  ell(ctx, -9.5, -13, 6.2, 6.6); of(ctx, PAL.steel, 3.6);
  ell(ctx, -9.5, -13, 6.2, 6.6);
  ctx.fillStyle = rgrad(ctx, -11.6, -15.6, 1, 9.6, [
    [0, shade(PAL.steel, 0.3)], [0.55, PAL.steel], [1, shade(PAL.steel, -0.24)],
  ]);
  ctx.fill();
  ell(ctx, -9.5, -13, 3.1, 3.4);
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.fillStyle = grad(ctx, -9.5, -16.4, -9.5, -9.6, [[0, shade(T.main, 0.2)], [1, shade(T.main, -0.12)]]);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 250, 235, 0.6)';
  ell(ctx, -10.6, -14.6, 1.1, 0.8); ctx.fill();
  // torso: diagonal key light + leading-edge rim
  rr(ctx, -8, -21, 16, 15, 5); of(ctx, T.main, 4);
  rr(ctx, -8, -21, 16, 15, 5);
  ctx.fillStyle = grad(ctx, -8, -21, 8, -6, [
    [0, shade(T.main, 0.24)], [0.5, T.main], [1, shade(T.main, -0.28)],
  ]);
  ctx.fill();
  ctx.fillStyle = T.lt + '66';
  rr(ctx, -6, -20, 12, 5, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(255, 246, 214, 0.62)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-7.1, -19.2); ctx.quadraticCurveTo(-8, -14, -7.2, -8.4); ctx.stroke();
  // belt
  rr(ctx, -8, -10.5, 16, 4, 2); of(ctx, '#6b4423', 3.2);
  rr(ctx, -2, -10.8, 4, 4.4, 1.4); of(ctx, PAL.gold, 2.6);
  // sword arm
  const swingA = attack01 > 0 ? lerp(-0.5, 1.35, Math.sin(Math.min(1, attack01 * 1.15) * Math.PI / 2)) : -0.5 + Math.sin(walk * Math.PI * 2) * 0.12;
  ctx.save();
  ctx.translate(7.5, -17);
  ctx.rotate(swingA);
  rr(ctx, -2.2, -2.2, 4.4, 9, 2.2); of(ctx, T.dk, 3.2); // arm
  ctx.translate(0, 8);
  ell(ctx, 0, 0, 2.8, 2.8); of(ctx, PAL.skin, 2.8); // hand
  // sword: graded steel + edge gleam near the tip
  ctx.rotate(-Math.PI / 2);
  rr(ctx, 3, -2, 14, 4, 1.6); of(ctx, PAL.steel, 3);
  rr(ctx, 3, -2, 14, 4, 1.6);
  ctx.fillStyle = grad(ctx, 0, -2, 0, 2, [[0, PAL.steelLt], [0.55, PAL.steel], [1, shade(PAL.steel, -0.22)]]);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  rr(ctx, 12.6, -1.7, 3.4, 1.2, 0.6); ctx.fill();
  rr(ctx, 1.6, -3.6, 2.6, 7.2, 1.2); of(ctx, PAL.gold, 2.6);
  ctx.restore();
  // head
  ell(ctx, 0, -29, 8.6, 8.2); of(ctx, PAL.skin, 4);
  ctx.fillStyle = rgba(PAL.skinSh, 0.5);
  ctx.beginPath(); ctx.ellipse(0, -26, 7.6, 4, 0, Math.PI * 0.1, Math.PI * 0.9); ctx.fill();
  // helmet: domed steel with a hot specular
  const helm = () => {
    ctx.beginPath();
    ctx.arc(0, -30.5, 8.8, Math.PI, 0, false);
    ctx.lineTo(8.8, -28.2); ctx.lineTo(-8.8, -28.2); ctx.closePath();
  };
  helm();
  of(ctx, PAL.steel, 3.6);
  helm();
  ctx.fillStyle = grad(ctx, -8, -39, 7, -28, [
    [0, shade(PAL.steel, 0.28)], [0.55, PAL.steel], [1, shade(PAL.steel, -0.22)],
  ]);
  ctx.fill();
  ctx.fillStyle = PAL.steelLt + 'cc';
  ctx.beginPath(); ctx.arc(-2.5, -33.5, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ell(ctx, -3.4, -34.6, 1.2, 0.9); ctx.fill();
  rr(ctx, -1.6, -30.4, 3.2, 6, 1.4); of(ctx, PAL.steel, 2.6); // nose guard
  // occlusion under the helm rim grounds it on the face
  ctx.fillStyle = 'rgba(34, 24, 60, 0.24)';
  ell(ctx, 0, -27.5, 8.2, 1.4); ctx.fill();
  // plume
  ctx.beginPath();
  ctx.moveTo(-1, -38.5);
  ctx.quadraticCurveTo(-7, -44, -10, -39);
  ctx.quadraticCurveTo(-5.5, -39.5, -3.4, -36.6);
  ctx.closePath();
  of(ctx, T.main, 3);
  drawFace(ctx, 0, -28.5, 8, team, team === 'enemy' ? 'angry' : 'calm');
  ctx.restore();
}

export function drawOgre(ctx, x, y, pose = {}) {
  const { face = 1, walk = 0, attack01 = 0, s = 1, team = 'player' } = pose;
  const T = TEAM[team];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face * s, s);
  const bob = Math.abs(Math.sin(walk * Math.PI * 2)) * 2;
  const squash = 1 + Math.sin(walk * Math.PI * 4) * 0.02;
  ctx.translate(attack01 > 0 ? Math.sin(attack01 * Math.PI) * 4.5 : 0, -bob);
  ctx.scale(1 / squash, squash);
  const skin = '#9fb84e', skinDk = '#7d9639', skinLt = '#c2d67e';
  const sw = limbSwing(walk, 3.6);
  // legs
  rr(ctx, -11 + sw, -8, 8.5, 9.5, 3.6); of(ctx, skinDk, 4);
  rr(ctx, 2.5 - sw, -8, 8.5, 9.5, 3.6); of(ctx, skinDk, 4);
  // club arm behind (raises on attack)
  const clubA = attack01 > 0 ? lerp(-2.1, 0.7, Math.sin(Math.min(1, attack01 * 1.1) * Math.PI / 2)) : -1.55 + Math.sin(walk * Math.PI * 2) * 0.06;
  ctx.save();
  ctx.translate(12, -26);
  ctx.rotate(clubA);
  rr(ctx, -3, -1, 18, 6.4, 3); of(ctx, skin, 4); // arm
  ctx.translate(16, 2);
  ctx.rotate(-0.12);
  const club = () => {
    ctx.beginPath();
    ctx.moveTo(-2.6, 3); ctx.lineTo(-4.4, -16); ctx.quadraticCurveTo(0, -21, 4.4, -16); ctx.lineTo(2.6, 3);
    ctx.closePath();
  };
  club();
  of(ctx, PAL.wood, 4);
  club();
  ctx.fillStyle = grad(ctx, -4.4, 0, 4.4, 0, [
    [0, shade(PAL.wood, 0.18)], [0.5, PAL.wood], [1, shade(PAL.wood, -0.2)],
  ]);
  ctx.fill();
  ctx.fillStyle = PAL.woodDk;
  ell(ctx, -1.4, -13, 1.3, 1.3); ctx.fill();
  ell(ctx, 1.8, -9, 1.3, 1.3); ctx.fill();
  ctx.restore();
  // torso (pear) with key-light volume and a leading-edge rim
  const pear = () => {
    ctx.beginPath();
    ctx.moveTo(-13, -6);
    ctx.quadraticCurveTo(-16.5, -20, -9, -27);
    ctx.quadraticCurveTo(0, -31.5, 9, -27);
    ctx.quadraticCurveTo(16.5, -20, 13, -6);
    ctx.quadraticCurveTo(0, -1, -13, -6);
    ctx.closePath();
  };
  pear();
  of(ctx, skin, 4.4);
  ctx.save();
  pear(); ctx.clip();
  ctx.fillStyle = grad(ctx, -14, -30, 12, -4, [
    [0, shade(skin, 0.22)], [0.45, skin], [1, shade(skin, -0.26)],
  ]);
  ctx.fillRect(-17, -32, 34, 32);
  ctx.strokeStyle = 'rgba(255, 246, 214, 0.55)'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-12.6, -9); ctx.quadraticCurveTo(-15.2, -20, -8.6, -26.2); ctx.stroke();
  ctx.restore();
  // belly with soft top light
  ell(ctx, 0, -11.5, 8.4, 7); of(ctx, skinLt, 3.2);
  ell(ctx, 0, -11.5, 8.4, 7);
  ctx.fillStyle = grad(ctx, 0, -18.5, 0, -4.5, [[0, shade(skinLt, 0.16)], [1, shade(skinLt, -0.12)]]);
  ctx.fill();
  // strap
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 5.6;
  ctx.beginPath(); ctx.moveTo(-9, -26); ctx.lineTo(5, -8); ctx.stroke();
  ctx.strokeStyle = '#7a4e22'; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.moveTo(-9, -26); ctx.lineTo(5, -8); ctx.stroke();
  // team wristband on front arm
  ctx.save();
  ctx.translate(-12.5, -22);
  ctx.rotate(0.9 + (attack01 > 0 ? Math.sin(attack01 * Math.PI) * 0.4 : Math.sin(walk * Math.PI * 2) * 0.12));
  rr(ctx, -3.2, 0, 6.4, 13, 3); of(ctx, skin, 4);
  rr(ctx, -3.6, 7.4, 7.2, 4.2, 1.8); of(ctx, T.main, 2.8);
  ell(ctx, 0, 13.4, 3.4, 3.2); of(ctx, skinDk, 3);
  ctx.restore();
  // head with brow light and jaw shade
  ell(ctx, 1, -33.5, 8.8, 7.6); of(ctx, skin, 4);
  ell(ctx, 1, -33.5, 8.8, 7.6);
  ctx.fillStyle = grad(ctx, 1, -41, 1, -26, [[0, shade(skin, 0.16)], [0.6, skin], [1, shade(skin, -0.14)]]);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 246, 214, 0.35)';
  ell(ctx, -2, -38.4, 3.6, 1.5); ctx.fill();
  // ears + horns
  ell(ctx, -7.8, -34.5, 2.4, 3); of(ctx, skin, 3);
  ctx.beginPath();
  ctx.moveTo(6.5, -39.5); ctx.quadraticCurveTo(8.6, -44.5, 11.4, -43.4); ctx.quadraticCurveTo(9.8, -40.5, 8.8, -38.3);
  ctx.closePath(); of(ctx, '#efe6cd', 3);
  // occlusion where the head sits on the shoulders
  ctx.fillStyle = 'rgba(28, 34, 10, 0.22)';
  ell(ctx, 1, -25.2, 7.6, 2); ctx.fill();
  // jaw + teeth
  rr(ctx, -5.4, -30.4, 13, 5.4, 2.6); of(ctx, skinDk, 3.2);
  ctx.fillStyle = '#f6f2e4';
  ctx.beginPath(); ctx.moveTo(-3.2, -30); ctx.lineTo(-1.6, -33); ctx.lineTo(-0.2, -30); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(3.2, -30); ctx.lineTo(4.8, -33); ctx.lineTo(6.2, -30); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-3.2, -30); ctx.lineTo(-1.6, -33); ctx.lineTo(-0.2, -30); ctx.moveTo(3.2, -30); ctx.lineTo(4.8, -33); ctx.lineTo(6.2, -30); ctx.stroke();
  // eyes
  ctx.fillStyle = PAL.out;
  ell(ctx, -2, -36, 1.15, 1.5); ctx.fill();
  ell(ctx, 4.4, -36, 1.15, 1.5); ctx.fill();
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(-4.4, -38.6); ctx.lineTo(-0.4, -37.4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6.8, -38.6); ctx.lineTo(2.8, -37.4); ctx.stroke();
  ctx.restore();
}

export function drawImp(ctx, x, y, pose = {}) {
  const { face = 1, walk = 0, attack01 = 0, s = 1, team = 'player' } = pose;
  const T = TEAM[team];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face * s, s);
  const bob = Math.abs(Math.sin(walk * Math.PI * 2)) * 1.6;
  ctx.translate(attack01 > 0 ? Math.sin(attack01 * Math.PI) * 3 : 0, -bob);
  const skin = '#e46a52', skinDk = '#c14c38';
  const sw = limbSwing(walk, 2.4);
  // legs
  rr(ctx, -4.6 + sw * 0.8, -4.5, 3.6, 5.5, 1.8); of(ctx, skinDk, 3);
  rr(ctx, 1 - sw * 0.8, -4.5, 3.6, 5.5, 1.8); of(ctx, skinDk, 3);
  // tail
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 4.4;
  ctx.beginPath(); ctx.moveTo(-4, -7); ctx.quadraticCurveTo(-10, -8, -9.5, -13); ctx.stroke();
  ctx.strokeStyle = skin; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-4, -7); ctx.quadraticCurveTo(-10, -8, -9.5, -13); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-11, -14.5); ctx.lineTo(-8, -14.6); ctx.lineTo(-9.3, -11.6); ctx.closePath();
  of(ctx, skin, 2.4);
  // body+head blob with key light
  ell(ctx, 0, -10.5, 7.2, 7.6); of(ctx, skin, 3.6);
  ell(ctx, 0, -10.5, 7.2, 7.6);
  ctx.fillStyle = rgrad(ctx, -2.6, -13.6, 1, 11.5, [
    [0, shade(skin, 0.22)], [0.55, skin], [1, shade(skin, -0.26)],
  ]);
  ctx.fill();
  ctx.fillStyle = rgba(skinDk, 0.4);
  ctx.beginPath(); ctx.ellipse(0, -6.4, 6, 3, 0, Math.PI * 0.15, Math.PI * 0.85); ctx.fill();
  // team headband
  ctx.beginPath();
  ctx.moveTo(-7, -13.5); ctx.quadraticCurveTo(0, -16.6, 7, -13.5);
  ctx.quadraticCurveTo(0, -14.4, -7, -13.5); ctx.closePath();
  of(ctx, T.main, 2.4);
  // horns
  ctx.beginPath(); ctx.moveTo(-5.5, -16); ctx.quadraticCurveTo(-7.6, -20.5, -4.2, -20.2); ctx.quadraticCurveTo(-3.6, -17.8, -3.2, -16.4); ctx.closePath();
  of(ctx, '#f2ead4', 2.6);
  ctx.beginPath(); ctx.moveTo(5.5, -16); ctx.quadraticCurveTo(7.6, -20.5, 4.2, -20.2); ctx.quadraticCurveTo(3.6, -17.8, 3.2, -16.4); ctx.closePath();
  of(ctx, '#f2ead4', 2.6);
  // ears
  ell(ctx, -7.6, -11.5, 2, 2.6); of(ctx, skin, 2.4);
  ell(ctx, 7.6, -11.5, 2, 2.6); of(ctx, skin, 2.4);
  // eyes: big white
  ctx.fillStyle = '#fff';
  ell(ctx, -2.4, -11, 2, 2.4); ctx.fill();
  ell(ctx, 2.8, -11, 2, 2.4); ctx.fill();
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 1.2;
  ell(ctx, -2.4, -11, 2, 2.4); ctx.stroke();
  ell(ctx, 2.8, -11, 2, 2.4); ctx.stroke();
  ctx.fillStyle = PAL.out;
  ell(ctx, -1.9, -10.7, 0.9, 1.1); ctx.fill();
  ell(ctx, 3.3, -10.7, 0.9, 1.1); ctx.fill();
  // grin
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(0.4, -7.6, 2.4, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
  // dagger arm
  const stabA = attack01 > 0 ? lerp(0.5, -0.6, Math.sin(Math.min(1, attack01 * 1.2) * Math.PI / 2)) : 0.5;
  ctx.save();
  ctx.translate(6, -8.5);
  ctx.rotate(stabA);
  rr(ctx, -1.6, -1.6, 6, 3.2, 1.6); of(ctx, skin, 2.6);
  ctx.translate(6, 0);
  ctx.rotate(-Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(-1.7, 0); ctx.lineTo(1.7, 0); ctx.lineTo(0, 7.5); ctx.closePath();
  of(ctx, PAL.steel, 2.4);
  rr(ctx, -2.4, -2.6, 4.8, 2.6, 1.2); of(ctx, PAL.woodDk, 2.2);
  ctx.restore();
  ctx.restore();
}

export function drawArcher(ctx, x, y, pose = {}) {
  const { face = 1, walk = 0, attack01 = 0, s = 1, team = 'player' } = pose;
  const T = TEAM[team];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face * s, s);
  const bob = Math.abs(Math.sin(walk * Math.PI * 2)) * 1.2;
  ctx.translate(0, -bob);
  const sw = limbSwing(walk, 2.6);
  // legs
  rr(ctx, -5.4 + sw * 0.7, -6.5, 4.6, 7.5, 2.2); of(ctx, '#6b4423', 3.2);
  rr(ctx, 0.8 - sw * 0.7, -6.5, 4.6, 7.5, 2.2); of(ctx, '#6b4423', 3.2);
  // quiver
  ctx.save();
  ctx.translate(-8, -18); ctx.rotate(-0.35);
  rr(ctx, -3, 0, 6, 11, 2.6); of(ctx, PAL.woodDk, 3);
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 1.6;
  for (const dx of [-1.4, 0.8]) {
    ctx.beginPath(); ctx.moveTo(dx, 0.5); ctx.lineTo(dx + 0.8, -3.4); ctx.stroke();
    ctx.fillStyle = '#e8e2d0';
    ctx.beginPath(); ctx.moveTo(dx + 0.8, -3.4); ctx.lineTo(dx - 0.6, -5.6); ctx.lineTo(dx + 2.2, -5.2); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // tunic with key light + leading rim
  const tunic = () => {
    ctx.beginPath();
    ctx.moveTo(-7, -6.5);
    ctx.lineTo(-5.6, -19); ctx.quadraticCurveTo(0, -21.5, 5.6, -19);
    ctx.lineTo(7, -6.5);
    ctx.quadraticCurveTo(0, -4.4, -7, -6.5);
    ctx.closePath();
  };
  tunic();
  of(ctx, '#8a6a44', 3.8);
  ctx.save();
  tunic(); ctx.clip();
  ctx.fillStyle = grad(ctx, -7, -21, 7, -5, [
    [0, shade('#8a6a44', 0.22)], [0.5, '#8a6a44'], [1, shade('#8a6a44', -0.26)],
  ]);
  ctx.fillRect(-8, -22, 16, 18);
  ctx.strokeStyle = 'rgba(255, 246, 214, 0.55)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-6.4, -8); ctx.lineTo(-5.4, -18.4); ctx.stroke();
  ctx.restore();
  rr(ctx, -7, -12.5, 14, 3.4, 1.6); of(ctx, '#5d452b', 2.8);
  // head + hood (team colored)
  ell(ctx, 0.5, -26.5, 7.4, 7.2); of(ctx, PAL.skin, 3.8);
  ctx.fillStyle = rgba(PAL.skinSh, 0.45);
  ctx.beginPath(); ctx.ellipse(0.5, -24, 6.4, 3.2, 0, Math.PI * 0.12, Math.PI * 0.88); ctx.fill();
  const hood = () => {
    ctx.beginPath();
    ctx.moveTo(-7.6, -25);
    ctx.quadraticCurveTo(-9, -35, 0.5, -35.4);
    ctx.quadraticCurveTo(7.5, -35.2, 8.6, -28.5);
    ctx.quadraticCurveTo(9.2, -25.5, 7.2, -25.8);
    ctx.quadraticCurveTo(6.8, -31.4, 0.5, -31.6);
    ctx.quadraticCurveTo(-5.2, -31.4, -5.4, -24.6);
    ctx.closePath();
  };
  hood();
  of(ctx, T.main, 3.4);
  hood();
  ctx.fillStyle = grad(ctx, 0, -35.4, 0, -24.6, [[0, shade(T.main, 0.22)], [1, shade(T.main, -0.12)]]);
  ctx.fill();
  // hood tip
  ctx.beginPath();
  ctx.moveTo(-2, -34.8); ctx.quadraticCurveTo(0.5, -38.6, 4, -34.9);
  ctx.quadraticCurveTo(0.8, -36, -2, -34.8); ctx.closePath();
  of(ctx, T.main, 2.8);
  drawFace(ctx, 0.7, -26, 6.6, team, team === 'enemy' ? 'angry' : 'calm');
  // bow arm (front)
  const drawT = attack01 > 0 ? Math.sin(Math.min(1, attack01 * 1.25) * Math.PI) : 0;
  ctx.save();
  ctx.translate(6.5, -16.5);
  ctx.rotate(-0.2);
  rr(ctx, -1.8, -1.8, 7, 3.6, 1.8); of(ctx, '#8a6a44', 3);
  ctx.translate(7, 0);
  // bow
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, 0, 9, -Math.PI * 0.42, Math.PI * 0.42); ctx.stroke();
  ctx.strokeStyle = PAL.wood; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.arc(0, 0, 9, -Math.PI * 0.42, Math.PI * 0.42); ctx.stroke();
  // string
  const sx = Math.cos(Math.PI * 0.42) * 9, sy = Math.sin(Math.PI * 0.42) * 9;
  const pull = -drawT * 6;
  ctx.strokeStyle = '#f4efdf'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(sx, -sy); ctx.lineTo(pull, 0); ctx.lineTo(sx, sy); ctx.stroke();
  if (drawT > 0.08) {
    ctx.strokeStyle = PAL.woodDk; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(pull, 0); ctx.lineTo(pull + 11, 0); ctx.stroke();
    ctx.fillStyle = '#e8e2d0';
    ctx.beginPath(); ctx.moveTo(pull + 11, -1.8); ctx.lineTo(pull + 14.5, 0); ctx.lineTo(pull + 11, 1.8); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

export function drawMage(ctx, x, y, pose = {}) {
  const { face = 1, walk = 0, attack01 = 0, s = 1, team = 'player' } = pose;
  const T = TEAM[team];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face * s, s);
  const bob = Math.abs(Math.sin(walk * Math.PI * 2)) * 1.1;
  ctx.translate(0, -bob);
  // robe with cloth volume + fold shadows
  const robe = () => {
    ctx.beginPath();
    ctx.moveTo(-9.5, 0);
    ctx.quadraticCurveTo(-8, -14, -5, -20);
    ctx.quadraticCurveTo(0, -23, 5, -20);
    ctx.quadraticCurveTo(8, -14, 9.5, 0);
    ctx.quadraticCurveTo(0, 2.2, -9.5, 0);
    ctx.closePath();
  };
  robe();
  of(ctx, T.main, 4);
  ctx.save();
  robe(); ctx.clip();
  ctx.fillStyle = grad(ctx, -9, -22, 9, -2, [
    [0, shade(T.main, 0.22)], [0.5, T.main], [1, shade(T.main, -0.26)],
  ]);
  ctx.fillRect(-10, -24, 20, 27);
  for (const fx of [-3.4, 2.2]) {
    ctx.strokeStyle = 'rgba(18, 10, 38, 0.2)'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(fx, -17);
    ctx.quadraticCurveTo(fx - 0.8, -8, fx - 0.4, 0.6);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 246, 214, 0.42)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-8.6, -3); ctx.quadraticCurveTo(-7.6, -13.6, -4.8, -19.2); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = T.dk;
  ctx.beginPath();
  ctx.moveTo(-9.5, 0); ctx.quadraticCurveTo(0, 2.2, 9.5, 0);
  ctx.lineTo(8.8, -4); ctx.quadraticCurveTo(0, -1.6, -8.8, -4);
  ctx.closePath(); ctx.fill();
  // belt
  rr(ctx, -7.4, -13, 14.8, 3.4, 1.6); of(ctx, PAL.gold, 2.8);
  // staff arm (front, raises on attack)
  const raiseA = attack01 > 0 ? lerp(0.35, -0.75, Math.sin(Math.min(1, attack01 * 1.15) * Math.PI / 2)) : 0.35 + Math.sin(walk * Math.PI * 2) * 0.08;
  ctx.save();
  ctx.translate(6.5, -17);
  ctx.rotate(raiseA);
  rr(ctx, -1.8, -1.8, 7.4, 3.6, 1.8); of(ctx, T.dk, 3);
  ctx.translate(7.5, 0);
  ctx.rotate(-0.5);
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 5.4;
  ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(0, -10); ctx.stroke();
  ctx.strokeStyle = PAL.wood; ctx.lineWidth = 2.8;
  ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(0, -10); ctx.stroke();
  const glowR = 3.4 + (attack01 > 0 ? Math.sin(attack01 * Math.PI) * 2.4 : 0);
  const gg = ctx.createRadialGradient(0, -12.5, 0.5, 0, -12.5, glowR * 2.2);
  gg.addColorStop(0, '#bdf3ffee'); gg.addColorStop(1, '#48c8f800');
  ctx.fillStyle = gg;
  ell(ctx, 0, -12.5, glowR * 2.2, glowR * 2.2); ctx.fill();
  ell(ctx, 0, -12.5, glowR, glowR); of(ctx, '#6fdcff', 3);
  ctx.restore();
  // beard + head
  const beard = () => {
    ctx.beginPath();
    ctx.moveTo(-6.4, -22);
    ctx.quadraticCurveTo(-6.8, -14.5, 0, -13);
    ctx.quadraticCurveTo(6.8, -14.5, 6.4, -22);
    ctx.closePath();
  };
  beard();
  of(ctx, '#eef2fa', 3.2);
  beard();
  ctx.fillStyle = grad(ctx, 0, -22, 0, -13, [[0, '#ffffff'], [1, '#c9d2e6']]);
  ctx.fill();
  ell(ctx, 0, -24.5, 6.8, 6.2); of(ctx, PAL.skin, 3.6);
  ctx.fillStyle = 'rgba(255, 246, 214, 0.4)';
  ell(ctx, -2, -27.2, 2.6, 1.3); ctx.fill();
  drawFace(ctx, 0, -24.5, 6, team, team === 'enemy' ? 'angry' : 'calm');
  // hat with a lit face and graded cone
  const hat = () => {
    ctx.beginPath();
    ctx.moveTo(-9.4, -27.5);
    ctx.lineTo(9.4, -27.5);
    ctx.quadraticCurveTo(10.6, -29.8, 8, -30.2);
    ctx.lineTo(3.4, -30.8);
    ctx.quadraticCurveTo(4.4, -42.5, -0.6, -44.5);
    ctx.quadraticCurveTo(-3.2, -38, -4.4, -30.8);
    ctx.lineTo(-8, -30.2);
    ctx.quadraticCurveTo(-10.6, -29.6, -9.4, -27.5);
    ctx.closePath();
  };
  hat();
  of(ctx, T.dk, 3.6);
  hat();
  ctx.fillStyle = grad(ctx, -8, -44, 8, -27, [
    [0, shade(T.dk, 0.26)], [0.5, T.dk], [1, shade(T.dk, -0.18)],
  ]);
  ctx.fill();
  // gold band with specular
  rr(ctx, -4.8, -32.4, 9.2, 2.8, 1.2); of(ctx, PAL.gold, 2.4);
  rr(ctx, -4.8, -32.4, 9.2, 2.8, 1.2);
  ctx.fillStyle = grad(ctx, 0, -32.4, 0, -29.6, [[0, PAL.goldLt], [0.55, PAL.gold], [1, PAL.goldDk]]);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  rr(ctx, -3.4, -32, 2.8, 1, 0.5); ctx.fill();
  // brim shadow cast onto the brow
  ctx.fillStyle = 'rgba(28, 20, 52, 0.26)';
  ell(ctx, 0, -27.1, 7.6, 1.3); ctx.fill();
  ctx.restore();
}

export const UNIT_DRAW = {
  knight: drawKnight,
  ogre: drawOgre,
  imp: drawImp,
  archer: drawArcher,
  mage: drawMage,
};

/* ================= fireball icon (for card + projectile) ================= */
export function drawFireball(ctx, x, y, r, t = 0, angle = Math.PI * 0.75) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // tail flames
  for (let i = 0; i < 3; i++) {
    const fl = r * (2.1 - i * 0.45) * (1 + 0.12 * Math.sin(t * 20 + i * 2.4));
    const off = (i - 1) * r * 0.42;
    ctx.beginPath();
    ctx.moveTo(0, off - r * 0.34);
    ctx.quadraticCurveTo(fl * 0.6, off - r * 0.1, fl, off + Math.sin(t * 26 + i) * r * 0.12);
    ctx.quadraticCurveTo(fl * 0.6, off + r * 0.24, 0, off + r * 0.34);
    ctx.closePath();
    of(ctx, i === 0 ? '#ff9c2e' : i === 1 ? '#ffc93c' : '#ff6b2e', 3);
  }
  // ball
  ell(ctx, 0, 0, r, r); of(ctx, '#ff7b2e', 3.6);
  ell(ctx, -r * 0.18, -r * 0.14, r * 0.62, r * 0.6);
  ctx.fillStyle = '#ffc93c'; ctx.fill();
  ell(ctx, -r * 0.28, -r * 0.24, r * 0.3, r * 0.28);
  ctx.fillStyle = '#fff3c8'; ctx.fill();
  ctx.restore();
}

/* ================= towers ================= */
// anchor: x = center, y = ground line at base front. t = time (flag wave)
export function drawTower(ctx, x, y, { team = 'player', kind = 'side', t = 0, hp01 = 1 } = {}) {
  const T = TEAM[team];
  const K = kind === 'king';
  const W = K ? 68 : 48;
  const H = K ? 62 : 62;
  ctx.save();
  ctx.translate(x, y);

  // stone platform (3/4 view): lit deck, blocky front face, AO under the body
  const pw = W + (K ? 26 : 20), ph = K ? 26 : 22;
  rr(ctx, -pw / 2, -ph * 0.55, pw, ph, 6); of(ctx, PAL.stone, 4);
  rr(ctx, -pw / 2, -ph * 0.55, pw, ph, 6);
  ctx.fillStyle = grad(ctx, 0, -ph * 0.55, 0, ph * 0.45, [
    [0, shade(PAL.stone, 0.12)], [0.52, PAL.stone], [1, shade(PAL.stone, -0.14)],
  ]);
  ctx.fill();
  // front face reads as stacked blocks
  ctx.save();
  rr(ctx, -pw / 2, -ph * 0.55, pw, ph, 6); ctx.clip();
  ctx.fillStyle = grad(ctx, 0, ph * 0.08, 0, ph * 0.45, [[0, PAL.stoneSh], [1, shade(PAL.stoneSh, -0.2)]]);
  rr(ctx, -pw / 2 + 1.5, ph * 0.12, pw - 3, ph * 0.34, 3); ctx.fill();
  ctx.strokeStyle = rgba(shade(PAL.stoneSh, -0.34), 0.8); ctx.lineWidth = 1.4;
  for (let i = 1; i < 4; i++) {
    const fx = -pw / 2 + (pw / 4) * i + (i % 2 ? 2 : -2);
    ctx.beginPath(); ctx.moveTo(fx, ph * 0.13); ctx.lineTo(fx, ph * 0.44); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 246, 214, 0.2)';
  rr(ctx, -pw / 2 + 2, ph * 0.1, pw - 4, 1.8, 1); ctx.fill();
  ctx.restore();
  // soft occlusion where the tower body meets the deck
  ctx.fillStyle = 'rgba(20, 16, 36, 0.18)';
  ell(ctx, 0, -ph * 0.1, W * 0.54, 5); ctx.fill();

  const bodyCol = damageTint('#cfc6b3', hp01);
  const bodyDk = damageTint('#a79c86', hp01);

  if (!K) {
    // ---- side tower: open-topped round turret with defender
    const sideBody = () => {
      ctx.beginPath();
      ctx.moveTo(-W / 2, -6);
      ctx.lineTo(-W / 2 + 4, -H + 14);
      ctx.lineTo(W / 2 - 4, -H + 14);
      ctx.lineTo(W / 2, -6);
      ctx.quadraticCurveTo(0, -1, -W / 2, -6);
      ctx.closePath();
    };
    sideBody();
    of(ctx, bodyCol, 4.4);
    // masonry + cylindrical light inside the wall silhouette
    ctx.save();
    sideBody(); ctx.clip();
    stoneCourses(ctx, -W / 2 + 2, -H + 16, W - 4, H - 20, bodyCol, 5);
    ctx.fillStyle = grad(ctx, -W / 2, 0, W / 2, 0, [
      [0, 'rgba(255, 246, 214, 0.15)'], [0.42, 'rgba(255, 246, 214, 0)'],
      [0.78, 'rgba(34, 28, 56, 0.10)'], [1, 'rgba(34, 28, 56, 0.26)'],
    ]);
    ctx.fillRect(-W / 2, -H, W, H);
    ctx.fillStyle = grad(ctx, 0, -18, 0, -2, [[0, 'rgba(34, 28, 56, 0)'], [1, 'rgba(34, 28, 56, 0.18)']]);
    ctx.fillRect(-W / 2, -18, W, 16);
    ctx.restore();
    const rimY = -H + 14;
    // open turret mouth: dark interior the defender stands in (sells 3/4 view)
    ell(ctx, 0, rimY - 10, W / 2 - 3, 5.4);
    ctx.strokeStyle = edgeFor(bodyCol); ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = shade(bodyCol, -0.52); ctx.fill();
    ctx.strokeStyle = rgba(shade(bodyCol, 0.28), 0.85); ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, rimY - 10.4, W / 2 - 4.6, 4.2, 0, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    // flag pole rising behind the rim
    drawFlag(ctx, 0, rimY - 22, 11, T, t);
    // defender peeking over the rim (behind front parapet)
    drawDefender(ctx, 0, rimY - 7, T, t, false);
    // top rim + crenellation (in front of defender)
    rr(ctx, -W / 2 - 4, rimY - 8, W + 8, 12, 4); of(ctx, bodyCol, 4);
    rr(ctx, -W / 2 - 4, rimY - 8, W + 8, 12, 4);
    ctx.fillStyle = grad(ctx, 0, rimY - 8, 0, rimY + 4, [
      [0, shade(bodyCol, 0.15)], [0.55, bodyCol], [1, shade(bodyCol, -0.12)],
    ]);
    ctx.fill();
    ctx.strokeStyle = rgba(shade(bodyCol, -0.3), 0.5); ctx.lineWidth = 1.2;
    for (let i = 1; i < 5; i++) {
      const jx = -W / 2 - 4 + ((W + 8) / 5) * i;
      ctx.beginPath(); ctx.moveTo(jx, rimY - 6.2); ctx.lineTo(jx, rimY + 2.4); ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const mx = -W / 2 - 4 + (i * (W + 8)) / 3.4 + 2;
      rr(ctx, mx, rimY - 15, 9, 9, 2); of(ctx, bodyCol, 3.4);
      rr(ctx, mx, rimY - 15, 9, 9, 2);
      ctx.fillStyle = grad(ctx, 0, rimY - 15, 0, rimY - 6, [[0, shade(bodyCol, 0.18)], [1, shade(bodyCol, -0.1)]]);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 246, 214, 0.4)';
      rr(ctx, mx + 1.3, rimY - 14, 6.4, 1.7, 1); ctx.fill();
    }
    ctx.fillStyle = bodyDk + '88';
    rr(ctx, -W / 2 - 2, rimY - 1, W + 4, 3.4, 1.6); ctx.fill();
    // hanging team banner: draped cloth with folds and a hanging rod
    const bannerPath = () => {
      ctx.beginPath();
      ctx.moveTo(-8, rimY + 6);
      ctx.lineTo(8, rimY + 6);
      ctx.lineTo(8, rimY + 26);
      ctx.lineTo(0, rimY + 22);
      ctx.lineTo(-8, rimY + 26);
      ctx.closePath();
    };
    bannerPath(); of(ctx, T.main, 3.2);
    ctx.save();
    bannerPath(); ctx.clip();
    ctx.fillStyle = rgba(T.lt, 0.42);
    ctx.fillRect(-8, rimY + 6, 3.8, 22);
    for (const [fx, fw, a] of [[-3, 2.4, 0.15], [2.4, 3, 0.2]]) {
      ctx.fillStyle = `rgba(18, 10, 38, ${a})`;
      ctx.beginPath();
      ctx.moveTo(fx, rimY + 6);
      ctx.quadraticCurveTo(fx + fw * 0.4, rimY + 16, fx, rimY + 26);
      ctx.lineTo(fx + fw, rimY + 26);
      ctx.quadraticCurveTo(fx + fw * 1.4, rimY + 15, fx + fw, rimY + 6);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(18, 10, 38, 0.30)'; ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-8, rimY + 25); ctx.lineTo(0, rimY + 21); ctx.lineTo(8, rimY + 25);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = PAL.out; ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.moveTo(-9.6, rimY + 5); ctx.lineTo(9.6, rimY + 5); ctx.stroke();
    ctx.strokeStyle = PAL.goldDk; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-9.6, rimY + 5); ctx.lineTo(9.6, rimY + 5); ctx.stroke();
    // door: recessed arch with iron band and studs
    const doorPath = () => {
      ctx.beginPath();
      ctx.moveTo(-7, -4); ctx.lineTo(-7, -15); ctx.quadraticCurveTo(0, -20, 7, -15); ctx.lineTo(7, -4);
      ctx.closePath();
    };
    doorPath(); of(ctx, PAL.woodDk, 3.4);
    ctx.save();
    doorPath(); ctx.clip();
    ctx.fillStyle = grad(ctx, 0, -20, 0, -4, [
      [0, 'rgba(8, 5, 2, 0.5)'], [0.42, 'rgba(8, 5, 2, 0.12)'], [1, 'rgba(255, 218, 160, 0.1)'],
    ]);
    ctx.fillRect(-7, -20, 14, 16);
    ctx.strokeStyle = '#5d3a17'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-2.4, -18); ctx.lineTo(-2.4, -5); ctx.moveTo(2.4, -18); ctx.lineTo(2.4, -5); ctx.stroke();
    ctx.strokeStyle = '#454962'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6.4, -10.6); ctx.lineTo(6.4, -10.6); ctx.stroke();
    ctx.fillStyle = PAL.steel;
    for (const sxx of [-4.6, 0, 4.6]) { ell(ctx, sxx, -10.6, 0.8, 0.8); ctx.fill(); }
    ctx.restore();
    // gold trim band with a specular dash
    rr(ctx, -W / 2 + 3, -H + 26, W - 6, 4.4, 2); of(ctx, PAL.gold, 2.8);
    rr(ctx, -W / 2 + 3, -H + 26, W - 6, 4.4, 2);
    ctx.fillStyle = grad(ctx, 0, -H + 26, 0, -H + 30.4, [[0, PAL.goldLt], [0.5, PAL.gold], [1, PAL.goldDk]]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    rr(ctx, -W / 2 + 7, -H + 26.9, 7, 1.4, 0.7); ctx.fill();
  } else {
    // ---- king tower: wide keep with two mini turrets
    // rear turrets (shaded toward their outer edges)
    for (const dx of [-W / 2 + 4, W / 2 - 4]) {
      rr(ctx, dx - 9, -H + 4, 18, H - 22, 5); of(ctx, bodyDk, 4);
      rr(ctx, dx - 9, -H + 4, 18, H - 22, 5);
      const outerDark = dx < 0;
      ctx.fillStyle = grad(ctx, dx - 9, 0, dx + 9, 0, outerDark
        ? [[0, shade(bodyDk, -0.2)], [0.55, bodyDk], [1, shade(bodyDk, 0.08)]]
        : [[0, shade(bodyDk, 0.08)], [0.45, bodyDk], [1, shade(bodyDk, -0.2)]]);
      ctx.fill();
      for (let i = 0; i < 2; i++) {
        rr(ctx, dx - 9 + i * 11.5, -H + 4 - 6, 6.5, 7, 1.6); of(ctx, bodyDk, 3);
      }
      ctx.beginPath();
      ctx.moveTo(dx - 8, -H + 2); ctx.lineTo(dx, -H - 9); ctx.lineTo(dx + 8, -H + 2);
      ctx.closePath(); of(ctx, T.dk, 3.4);
      // lit roof facet
      ctx.fillStyle = 'rgba(255, 246, 214, 0.22)';
      ctx.beginPath();
      ctx.moveTo(dx - 6, -H + 1.4); ctx.lineTo(dx - 0.6, -H - 7.4); ctx.lineTo(dx + 1.8, -H - 5.6);
      ctx.lineTo(dx - 2.6, -H + 1.4);
      ctx.closePath(); ctx.fill();
    }
    // main keep with masonry + volume
    const keepBody = () => {
      ctx.beginPath();
      ctx.moveTo(-W / 2 + 6, -4);
      ctx.lineTo(-W / 2 + 9, -H + 6);
      ctx.lineTo(W / 2 - 9, -H + 6);
      ctx.lineTo(W / 2 - 6, -4);
      ctx.quadraticCurveTo(0, 0.5, -W / 2 + 6, -4);
      ctx.closePath();
    };
    keepBody();
    of(ctx, bodyCol, 4.6);
    ctx.save();
    keepBody(); ctx.clip();
    stoneCourses(ctx, -W / 2 + 7, -H + 8, W - 14, H - 14, bodyCol, 9);
    ctx.fillStyle = grad(ctx, -W / 2, 0, W / 2, 0, [
      [0, 'rgba(255, 246, 214, 0.14)'], [0.42, 'rgba(255, 246, 214, 0)'],
      [0.8, 'rgba(34, 28, 56, 0.10)'], [1, 'rgba(34, 28, 56, 0.24)'],
    ]);
    ctx.fillRect(-W / 2, -H, W, H);
    ctx.fillStyle = grad(ctx, 0, -16, 0, -1, [[0, 'rgba(34, 28, 56, 0)'], [1, 'rgba(34, 28, 56, 0.18)']]);
    ctx.fillRect(-W / 2, -16, W, 15);
    ctx.restore();
    // crenellated top
    const rimY = -H + 6;
    rr(ctx, -W / 2 + 3, rimY - 9, W - 6, 13, 4); of(ctx, bodyCol, 4);
    rr(ctx, -W / 2 + 3, rimY - 9, W - 6, 13, 4);
    ctx.fillStyle = grad(ctx, 0, rimY - 9, 0, rimY + 4, [
      [0, shade(bodyCol, 0.15)], [0.55, bodyCol], [1, shade(bodyCol, -0.12)],
    ]);
    ctx.fill();
    ctx.strokeStyle = rgba(shade(bodyCol, -0.3), 0.5); ctx.lineWidth = 1.2;
    for (let i = 1; i < 6; i++) {
      const jx = -W / 2 + 3 + ((W - 6) / 6) * i;
      ctx.beginPath(); ctx.moveTo(jx, rimY - 7); ctx.lineTo(jx, rimY + 2.6); ctx.stroke();
    }
    // keep top platform floor visible between the merlons (3/4 view)
    ell(ctx, 0, rimY - 13, W / 2 - 9, 5);
    ctx.strokeStyle = rgba(shade(bodyCol, -0.35), 0.9); ctx.lineWidth = 2.2; ctx.stroke();
    ctx.fillStyle = grad(ctx, 0, rimY - 18, 0, rimY - 8, [
      [0, shade(bodyCol, 0.14)], [1, shade(bodyCol, -0.06)],
    ]);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const mx = -W / 2 + 3 + (i * (W - 14)) / 4;
      rr(ctx, mx, rimY - 16, 9, 9, 2); of(ctx, bodyCol, 3.4);
      rr(ctx, mx, rimY - 16, 9, 9, 2);
      ctx.fillStyle = grad(ctx, 0, rimY - 16, 0, rimY - 7, [[0, shade(bodyCol, 0.18)], [1, shade(bodyCol, -0.1)]]);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 246, 214, 0.4)';
      rr(ctx, mx + 1.3, rimY - 15, 6.4, 1.7, 1); ctx.fill();
    }
    // gold trim with a specular dash (under the hanging cloth)
    rr(ctx, -W / 2 + 8, -H + 18, W - 16, 4.6, 2); of(ctx, PAL.gold, 2.8);
    rr(ctx, -W / 2 + 8, -H + 18, W - 16, 4.6, 2);
    ctx.fillStyle = grad(ctx, 0, -H + 18, 0, -H + 22.6, [[0, PAL.goldLt], [0.5, PAL.gold], [1, PAL.goldDk]]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    rr(ctx, -W / 2 + 12, -H + 18.9, 8, 1.5, 0.75); ctx.fill();
    // hanging team banner with crown emblem: draped cloth + gold fringe
    const kBanner = () => {
      ctx.beginPath();
      ctx.moveTo(-11, rimY + 2);
      ctx.lineTo(11, rimY + 2);
      ctx.lineTo(11, -16);
      ctx.lineTo(0, -11);
      ctx.lineTo(-11, -16);
      ctx.closePath();
    };
    kBanner();
    of(ctx, T.main, 3.8);
    ctx.save();
    kBanner(); ctx.clip();
    ctx.fillStyle = grad(ctx, -11, 0, 11, 0, [
      [0, shade(T.main, -0.2)], [0.22, shade(T.main, 0.12)],
      [0.55, T.main], [1, shade(T.main, -0.2)],
    ]);
    ctx.fillRect(-11, rimY + 2, 22, H);
    for (const [fx, fw, a] of [[-4.6, 2.6, 0.16], [3, 3, 0.18]]) {
      ctx.fillStyle = `rgba(18, 10, 38, ${a})`;
      ctx.beginPath();
      ctx.moveTo(fx, rimY + 2);
      ctx.quadraticCurveTo(fx + fw * 0.4, rimY + 14, fx, -12);
      ctx.lineTo(fx + fw, -12);
      ctx.quadraticCurveTo(fx + fw * 1.4, rimY + 13, fx + fw, rimY + 2);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(18, 10, 38, 0.3)'; ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-11, -17.4); ctx.lineTo(0, -12.4); ctx.lineTo(11, -17.4);
    ctx.stroke();
    ctx.restore();
    // gold cord across the hoist + fringe dots on the tails
    ctx.strokeStyle = PAL.out; ctx.lineWidth = 3.8;
    ctx.beginPath(); ctx.moveTo(-12.6, rimY + 1); ctx.lineTo(12.6, rimY + 1); ctx.stroke();
    ctx.strokeStyle = PAL.goldDk; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-12.6, rimY + 1); ctx.lineTo(12.6, rimY + 1); ctx.stroke();
    ctx.fillStyle = PAL.gold;
    for (const [fx2, fy2] of [[-10.4, -16.4], [-5.2, -14], [0, -11.6], [5.2, -14], [10.4, -16.4]]) {
      ell(ctx, fx2, fy2 + 1.6, 1.15, 1.15); ctx.fill();
    }
    miniCrown(ctx, 0, rimY + 24, 13);
    // flag offset to the side + crowned king standing on the keep top
    drawFlag(ctx, -17, rimY - 12, 10, T, t);
    drawDefender(ctx, 2, rimY - 13, T, t, true);
  }

  // damage cracks
  if (hp01 < 0.66) {
    ctx.strokeStyle = PAL.out; ctx.lineWidth = 1.7; ctx.globalAlpha = 0.75;
    crack(ctx, -W * 0.28, -H * 0.42, 12);
    if (hp01 < 0.33) { crack(ctx, W * 0.2, -H * 0.66, 14); crack(ctx, W * 0.05, -H * 0.25, 9); }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// tiny bust visible over the tower rim; king variant wears a crown
function drawDefender(ctx, x, y, T, t, isKing) {
  const bob = Math.sin(t * 2.6 + (isKing ? 1.2 : 0)) * 1.2;
  ctx.save();
  ctx.translate(x, y + bob);
  // slow breathe so the figure never reads as frozen
  ctx.scale(1, 1 + Math.sin(t * (isKing ? 1.7 : 2.2) + (isKing ? 0.6 : 2)) * 0.03);
  // shoulders with a lit-left gradient
  rr(ctx, -7.5, -3.5, 15, 7.5, 3.4); of(ctx, T.main, 3.2);
  rr(ctx, -7.5, -3.5, 15, 7.5, 3.4);
  ctx.fillStyle = grad(ctx, -7.5, 0, 7.5, 0, [
    [0, shade(T.main, 0.16)], [0.5, T.main], [1, shade(T.main, -0.16)],
  ]);
  ctx.fill();
  // head with a soft under-shadow
  ell(ctx, 0, -8.5, 6.2, 5.8); of(ctx, PAL.skin, 3.2);
  ctx.fillStyle = rgba(PAL.skinSh, 0.55);
  ctx.beginPath();
  ctx.ellipse(0, -6.4, 5.6, 3.4, 0, Math.PI * 0.12, Math.PI * 0.88);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 246, 214, 0.5)';
  ell(ctx, -2.2, -11, 2.2, 1.4); ctx.fill();
  if (isKing) {
    // crown with a gold gradient
    const crownPath = () => {
      ctx.beginPath();
      ctx.moveTo(-5.2, -12.2);
      ctx.lineTo(-5.6, -17.4);
      ctx.lineTo(-2.6, -14.4);
      ctx.lineTo(0, -18.2);
      ctx.lineTo(2.6, -14.4);
      ctx.lineTo(5.6, -17.4);
      ctx.lineTo(5.2, -12.2);
      ctx.closePath();
    };
    crownPath();
    of(ctx, PAL.gold, 2.8);
    crownPath();
    ctx.fillStyle = grad(ctx, 0, -18.2, 0, -12.2, [[0, PAL.goldLt], [0.6, PAL.gold], [1, PAL.goldDk]]);
    ctx.fill();
    // occasional glint at the crown tip
    const gt = (t % 3.4) / 3.4;
    if (gt < 0.2) {
      const ga = Math.sin((gt / 0.2) * Math.PI);
      ctx.globalAlpha = ga;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      const gr = 2.2 + ga * 1.6;
      ctx.beginPath();
      ctx.moveTo(4.8 - gr, -18.4); ctx.lineTo(4.8 + gr, -18.4);
      ctx.moveTo(4.8, -18.4 - gr); ctx.lineTo(4.8, -18.4 + gr);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // beard
    ctx.beginPath();
    ctx.moveTo(-4.6, -6.5);
    ctx.quadraticCurveTo(-4.4, -1.4, 0, -0.8);
    ctx.quadraticCurveTo(4.4, -1.4, 4.6, -6.5);
    ctx.quadraticCurveTo(0, -4.6, -4.6, -6.5);
    ctx.closePath();
    of(ctx, '#eef2fa', 2.6);
  } else {
    // hood with a lit crest
    const hoodPath = () => {
      ctx.beginPath();
      ctx.moveTo(-6.6, -8);
      ctx.quadraticCurveTo(-6.8, -15.4, 0, -15.6);
      ctx.quadraticCurveTo(6.8, -15.4, 6.6, -8);
      ctx.quadraticCurveTo(6, -11.8, 0, -12);
      ctx.quadraticCurveTo(-6, -11.8, -6.6, -8);
      ctx.closePath();
    };
    hoodPath();
    of(ctx, T.dk, 2.8);
    hoodPath();
    ctx.fillStyle = grad(ctx, 0, -15.6, 0, -8, [[0, shade(T.dk, 0.2)], [1, shade(T.dk, -0.1)]]);
    ctx.fill();
  }
  // eyes
  ctx.fillStyle = PAL.out;
  ell(ctx, -2, -8.6, 0.85, 1.05); ctx.fill();
  ell(ctx, 2, -8.6, 0.85, 1.05); ctx.fill();
  ctx.restore();
}

function damageTint(hex, hp01) {
  if (hp01 > 0.66) return hex;
  // keep hex output so downstream shade()/rgba() helpers can parse it
  return mix(hex, '#000000', hp01 > 0.33 ? 0.08 : 0.18);
}

// per-brick masonry with tone variance and a lit top bevel on every block.
// caller is expected to have clipped to the wall silhouette.
function stoneCourses(ctx, x, y, w, h, base, seed = 7) {
  const rngS = mulberry32(seed);
  const rows = Math.max(2, Math.round(h / 11));
  const rh = h / rows;
  const cols = 3, bw = w / cols;
  for (let j = 0; j < rows; j++) {
    const off = j % 2 ? 0 : 0.5;
    for (let i = -1; i < cols + 1; i++) {
      const bx = x + (i + off) * bw;
      const bx2 = Math.max(x, bx), be = Math.min(x + w, bx + bw);
      if (be - bx2 < 3) continue;
      ctx.fillStyle = rgba(shade(base, (rngS() - 0.5) * 0.26), 0.6);
      rr(ctx, bx2 + 0.9, y + j * rh + 0.9, be - bx2 - 1.8, rh - 1.8, 2);
      ctx.fill();
      // recessed mortar joint + lit top bevel sell the relief
      ctx.strokeStyle = rgba(shade(base, -0.4), 0.35); ctx.lineWidth = 1;
      rr(ctx, bx2 + 0.9, y + j * rh + 0.9, be - bx2 - 1.8, rh - 1.8, 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 246, 214, 0.16)';
      rr(ctx, bx2 + 1.4, y + j * rh + 1.3, be - bx2 - 2.8, 1.7, 1);
      ctx.fill();
    }
  }
}

function crack(ctx, x, y, len) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + len * 0.3, y + len * 0.4);
  ctx.lineTo(x + len * 0.1, y + len * 0.7);
  ctx.lineTo(x + len * 0.45, y + len);
  ctx.stroke();
}

function drawFlag(ctx, x, y, size, T, t) {
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x, y + 9); ctx.lineTo(x, y - size * 0.6); ctx.stroke();
  ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y + 9); ctx.lineTo(x, y - size * 0.6); ctx.stroke();
  const w1 = Math.sin(t * 5) * size * 0.16;
  const w2 = Math.sin(t * 5 + 1.4) * size * 0.22;
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.6);
  ctx.quadraticCurveTo(x + size * 0.6, y - size * 0.62 + w1, x + size * 1.15, y - size * 0.5 + w2);
  ctx.quadraticCurveTo(x + size * 0.65, y - size * 0.28 + w1, x, y - size * 0.05);
  ctx.closePath();
  of(ctx, T.main, 3);
  // lit hoist-side panel
  ctx.fillStyle = T.lt + '88';
  ctx.beginPath();
  ctx.moveTo(x + 1, y - size * 0.55);
  ctx.quadraticCurveTo(x + size * 0.5, y - size * 0.56 + w1, x + size * 0.6, y - size * 0.45 + w1);
  ctx.lineTo(x + 1, y - size * 0.25);
  ctx.closePath(); ctx.fill();
  // curling shadow toward the fly edge sells the ripple
  ctx.fillStyle = 'rgba(18, 10, 38, 0.22)';
  ctx.beginPath();
  ctx.moveTo(x + size * 0.62, y - size * 0.5 + w1 * 0.7);
  ctx.quadraticCurveTo(x + size * 0.92, y - size * 0.52 + w2 * 0.85, x + size * 1.15, y - size * 0.5 + w2);
  ctx.quadraticCurveTo(x + size * 0.85, y - size * 0.34 + w1, x + size * 0.58, y - size * 0.3 + w1 * 0.6);
  ctx.closePath(); ctx.fill();
  // gold finial on the pole tip
  ell(ctx, x, y - size * 0.66, 1.9, 1.9);
  ctx.strokeStyle = PAL.out; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.fillStyle = PAL.goldLt; ctx.fill();
}

export function miniCrown(ctx, x, y, w) {
  ctx.save();
  ctx.translate(x - w / 2, y - w * 0.4);
  const h = w * 0.8;
  const crownP = () => {
    ctx.beginPath();
    ctx.moveTo(w * 0.08, h * 0.85);
    ctx.lineTo(w * 0.02, h * 0.25);
    ctx.lineTo(w * 0.3, h * 0.5);
    ctx.lineTo(w * 0.5, h * 0.1);
    ctx.lineTo(w * 0.7, h * 0.5);
    ctx.lineTo(w * 0.98, h * 0.25);
    ctx.lineTo(w * 0.92, h * 0.85);
    ctx.closePath();
  };
  crownP();
  of(ctx, PAL.gold, 3);
  crownP();
  ctx.fillStyle = grad(ctx, 0, h * 0.1, 0, h * 0.85, [
    [0, PAL.goldLt], [0.55, PAL.gold], [1, PAL.goldDk],
  ]);
  ctx.fill();
  // band shadow + jewel + point sparkles
  ctx.fillStyle = rgba(PAL.goldDk, 0.55);
  rr(ctx, w * 0.1, h * 0.68, w * 0.8, h * 0.14, w * 0.05); ctx.fill();
  ell(ctx, w * 0.5, h * 0.62, w * 0.09, w * 0.09);
  ctx.fillStyle = '#e8542e'; ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ell(ctx, w * 0.47, h * 0.585, w * 0.032, w * 0.032); ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ell(ctx, w * 0.5, h * 0.14, w * 0.045, w * 0.045); ctx.fill();
  ctx.restore();
}

/* ================= rubble (destroyed tower) ================= */
export function drawRubble(ctx, x, y, seedRocks) {
  ctx.save();
  ctx.translate(x, y);
  // debris mound (dark, sooty base)
  ctx.beginPath();
  ctx.moveTo(-32, 6);
  ctx.quadraticCurveTo(-26, -10, -12, -12);
  ctx.quadraticCurveTo(0, -17, 12, -11);
  ctx.quadraticCurveTo(27, -9, 32, 6);
  ctx.quadraticCurveTo(0, 11, -32, 6);
  ctx.closePath();
  of(ctx, '#8d8270', 4);
  // angular broken blocks — mid/dark stone so they don't glow against the grass
  for (const r of seedRocks) {
    const [rx, ry, rs, light] = r;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate((rx * 13.7) % 1 - 0.5);
    ctx.beginPath();
    ctx.moveTo(-rs, -rs * 0.55);
    ctx.lineTo(rs * 0.2, -rs * 0.9);
    ctx.lineTo(rs, -rs * 0.15);
    ctx.lineTo(rs * 0.6, rs * 0.7);
    ctx.lineTo(-rs * 0.7, rs * 0.6);
    ctx.closePath();
    of(ctx, light ? PAL.stone : PAL.stoneSh, 3.2);
    ctx.fillStyle = '#ffffff24';
    ctx.beginPath();
    ctx.moveTo(-rs * 0.6, -rs * 0.45); ctx.lineTo(rs * 0.1, -rs * 0.7); ctx.lineTo(rs * 0.2, -rs * 0.3); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // scorch smudges
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#3b3247';
  ell(ctx, -10, -8, 8, 4.6); ctx.fill();
  ell(ctx, 13, -3, 6.5, 3.6); ctx.fill();
  ctx.globalAlpha = 1;
  // splintered beams
  for (const [bx1, by1, bx2, by2] of [[-16, 2, -5, -20], [8, 3, 21, -13]]) {
    ctx.strokeStyle = PAL.out; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.stroke();
    ctx.strokeStyle = PAL.woodDk; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.stroke();
  }
  ctx.restore();
}

/* ================= cards ================= */
export const RARITY = {
  common: { frame: '#94a7c8', frameDk: '#5f7396', bgTop: '#8fb6e8', bgBot: '#4a6fa8', label: 'Common' },
  rare: { frame: '#ffa63e', frameDk: '#c26f14', bgTop: '#ffd28f', bgBot: '#c87828', label: 'Rare' },
  epic: { frame: '#c266f0', frameDk: '#8330b4', bgTop: '#e0a8ff', bgBot: '#8f4ec8', label: 'Epic' },
};

export function cardCanvas(def, w = 66, h = 84) {
  const [c, x] = mkCanvas(w, h, 3);
  const R = RARITY[def.rarity];
  // frame with a bevel: lit top edge, sunk bottom
  rr(x, 1.5, 1.5, w - 3, h - 3, 8); of(x, R.frame, 3.4);
  rr(x, 1.5, 1.5, w - 3, h - 3, 8);
  x.fillStyle = grad(x, 0, 0, 0, h, [
    [0, shade(R.frame, 0.28)], [0.5, R.frame], [1, shade(R.frame, -0.24)],
  ]);
  x.fill();
  // inner window
  const g = grad(x, 0, 4, 0, h - 4, [[0, R.bgTop], [1, R.bgBot]]);
  rr(x, 5, 5, w - 10, h - 10, 5.5);
  x.fillStyle = g; x.fill();
  x.strokeStyle = R.frameDk; x.lineWidth = 1.6; x.stroke();
  x.save();
  rr(x, 5, 5, w - 10, h - 10, 5.5); x.clip();
  // radial stage light behind the portrait
  x.fillStyle = rgrad(x, w / 2, h * 0.44, 2, w * 0.56, [
    [0, 'rgba(255, 255, 255, 0.32)'], [1, 'rgba(255, 255, 255, 0)'],
  ]);
  x.fillRect(0, 0, w, h);
  // ground shadow + portrait
  x.fillStyle = '#00000026';
  ell(x, w / 2, h - 17, w * 0.3, 5); x.fill();
  if (def.spell) {
    // diagonal flight pose, mass centered in the frame
    drawFireball(x, w / 2 - 5, h / 2 + 3, w * 0.19, 0.3, Math.PI * 0.78);
  } else {
    const fn = UNIT_DRAW[def.unit];
    // portraitScale is relative to an 84px-tall reference card
    const s = (def.portraitScale || 1.15) * (h / 84);
    fn(x, w / 2, h - h * 0.18, { s, team: 'player', walk: 0.13 });
  }
  // inner ambient occlusion + top gloss
  x.strokeStyle = 'rgba(20, 14, 40, 0.28)'; x.lineWidth = 3;
  rr(x, 6, 6, w - 12, h - 12, 5); x.stroke();
  x.fillStyle = '#ffffff2e';
  rr(x, 5, 5, w - 10, 13, 5); x.fill();
  x.restore();
  // name banner with plate bevel
  rr(x, 7, h - 17.5, w - 14, 12.5, 5); of(x, R.frameDk, 2.6);
  rr(x, 7, h - 17.5, w - 14, 12.5, 5);
  x.fillStyle = grad(x, 0, h - 17.5, 0, h - 5, [
    [0, shade(R.frameDk, 0.2)], [1, shade(R.frameDk, -0.18)],
  ]);
  x.fill();
  x.fillStyle = 'rgba(255, 255, 255, 0.22)';
  rr(x, 8.5, h - 16.6, w - 17, 2.2, 1.1); x.fill();
  outlineText(x, def.name, w / 2, h - 11, 8.6, '#fff', 2.6);
  return c;
}
