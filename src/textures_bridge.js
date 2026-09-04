// Bridge-only canvas textures (procedural, no assets): the large tactical wall display (sector plot
// with the ship's own silhouette, range rings, bearing lines, contacts and glyph readouts) and the
// vertical status board used for the deck directory columns in the aft vestibule.
import { makeCanvas, toTexture, mulberry32 } from "./textures.js";

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// angular block glyphs (original glyph set, same family as the console screens)
function glyphRow(ctx, rand, x, y, n, size, color) {
  ctx.fillStyle = color;
  const s = size;
  const t = Math.max(1, size * 0.22);
  for (let g = 0; g < n; g++) {
    const gx = x + g * s * 1.35;
    switch (Math.floor(rand() * 5)) {
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
        break;
      default:
        ctx.fillRect(gx, y, t, s);
        ctx.fillRect(gx + s - t, y + s / 2, t, s / 2);
    }
  }
}

/** Wedge silhouette (top view, bow up) as a stroked path centred on (cx, cy), length len. */
function wedge(ctx, cx, cy, len, color, width = 2) {
  const hw = len * 0.31;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(cx, cy - len / 2);
  ctx.lineTo(cx + hw, cy + len / 2);
  ctx.lineTo(cx - hw, cy + len / 2);
  ctx.closePath();
  ctx.stroke();
  // superstructure terraces + bridge head
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - hw * 0.34, cy - len * 0.08, hw * 0.68, len * 0.58);
  ctx.strokeRect(cx - hw * 0.22, cy + len * 0.05, hw * 0.44, len * 0.45);
  ctx.strokeRect(cx - hw * 0.3, cy + len * 0.22, hw * 0.6, len * 0.09);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx + s * hw * 0.2, cy + len * 0.28, len * 0.02, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/**
 * Tactical wall display, 2:1. Dark navy field, fine grid, own-ship wedge at the plot centre, range
 * rings + bearing lines, a friendly / hostile contact scatter, a right-hand readout column.
 */
export function makeTacticalMap(w = 1024, h = 512, seed = 7) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  const accent = "#4f8dff";
  const bright = "#a8ccff";
  const warn = "#ff4a3a";
  const amber = "#ffb040";
  ctx.fillStyle = "#03070f";
  ctx.fillRect(0, 0, w, h);
  // grid
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 32) {
    ctx.strokeStyle = rgba(accent, x % 128 === 0 ? 0.22 : 0.09);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 32) {
    ctx.strokeStyle = rgba(accent, y % 128 === 0 ? 0.22 : 0.09);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  // header band
  ctx.fillStyle = rgba(accent, 0.85);
  ctx.fillRect(16, 14, w - 32, 3);
  glyphRow(ctx, rand, 20, 24, 9, 12, bright);
  glyphRow(ctx, rand, w - 300, 24, 12, 10, rgba(accent, 0.8));
  for (let k = 0; k < 6; k++) ctx.fillRect(w - 160 + k * 24, 26, 16, 9);
  // plot: range rings + bearing lines around own ship
  const cx = w * 0.38;
  const cy = h * 0.55;
  const R = h * 0.36;
  ctx.strokeStyle = rgba(accent, 0.55);
  for (let k = 1; k <= 4; k++) {
    ctx.lineWidth = k === 4 ? 2 : 1;
    ctx.beginPath();
    ctx.arc(cx, cy, (R * k) / 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    ctx.strokeStyle = rgba(accent, k % 3 === 0 ? 0.5 : 0.25);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * R * 0.12, cy + Math.sin(a) * R * 0.12);
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.stroke();
  }
  // sector wedge (sensor cone forward)
  ctx.fillStyle = rgba(accent, 0.08);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, R, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45);
  ctx.closePath();
  ctx.fill();
  wedge(ctx, cx, cy, R * 0.42, bright, 2);
  // contacts: friendly boxes, hostile diamonds with vectors
  for (let k = 0; k < 14; k++) {
    const a = rand() * Math.PI * 2;
    const r = R * (0.3 + rand() * 0.68);
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    const hostile = rand() < 0.35;
    ctx.strokeStyle = hostile ? warn : rand() < 0.3 ? amber : accent;
    ctx.lineWidth = 1.5;
    if (hostile) {
      ctx.beginPath();
      ctx.moveTo(px, py - 7);
      ctx.lineTo(px + 7, py);
      ctx.lineTo(px, py + 7);
      ctx.lineTo(px - 7, py);
      ctx.closePath();
      ctx.stroke();
    } else ctx.strokeRect(px - 6, py - 6, 12, 12);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + (rand() - 0.5) * 60, py + (rand() - 0.5) * 60);
    ctx.stroke();
    glyphRow(ctx, rand, px + 10, py + 9, 4, 5, rgba(hostile ? warn : bright, 0.8));
  }
  // right-hand readout column
  const rx = w * 0.72;
  ctx.strokeStyle = rgba(accent, 0.5);
  ctx.lineWidth = 1;
  ctx.strokeRect(rx, 56, w - rx - 16, h - 72);
  let y = 70;
  for (let r = 0; r < 12 && y < h - 40; r++) {
    glyphRow(ctx, rand, rx + 10, y, 5, 8, rgba(bright, 0.85));
    ctx.fillStyle = rgba(accent, 0.22);
    ctx.fillRect(rx + 90, y, w - rx - 116, 8);
    ctx.fillStyle = rand() < 0.2 ? warn : rand() < 0.3 ? amber : accent;
    ctx.fillRect(rx + 90, y, (w - rx - 116) * (0.2 + rand() * 0.8), 8);
    y += 26;
  }
  // waveform strip along the bottom of the readout column
  ctx.strokeStyle = bright;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const gy = h - 60;
  for (let i = 0; i <= 80; i++) {
    const px = rx + 10 + (i / 80) * (w - rx - 36);
    const py = gy + Math.sin(i * 0.35 + seed) * 10 + (rand() - 0.5) * 6;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  // scanlines
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let yy = 0; yy < h; yy += 4) ctx.fillRect(0, yy, w, 1);
  return toTexture(c, { srgb: true, wrap: false });
}

/** Vertical status board (1:2): header, deck rows with indicator bars, glyph footer. */
export function makeStatusBoard(w = 512, h = 1024, seed = 3) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const rand = mulberry32(seed);
  const accent = "#4f8dff";
  const bright = "#a8ccff";
  const warn = "#ff4a3a";
  ctx.fillStyle = "#04080f";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = rgba(accent, 0.12);
  for (let y = 0; y < h; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.fillStyle = accent;
  ctx.fillRect(24, 28, w - 48, 4);
  glyphRow(ctx, rand, 28, 44, 10, 18, bright);
  // deck rows
  let y = 110;
  for (let r = 0; r < 5; r++) {
    ctx.fillStyle = rgba(accent, 0.18);
    ctx.fillRect(24, y, w - 48, 120);
    ctx.fillStyle = r === 0 ? bright : accent;
    ctx.fillRect(24, y, 6, 120);
    glyphRow(ctx, rand, 46, y + 14, 6, 16, bright);
    for (let k = 0; k < 4; k++) {
      glyphRow(ctx, rand, 46, y + 48 + k * 18, 8, 9, rgba(bright, 0.7));
      ctx.fillStyle = rgba(accent, 0.25);
      ctx.fillRect(220, y + 48 + k * 18, w - 260, 9);
      ctx.fillStyle = rand() < 0.15 ? warn : accent;
      ctx.fillRect(220, y + 48 + k * 18, (w - 260) * rand(), 9);
    }
    y += 136;
  }
  // footer: cog-like emblem ring + glyph line
  ctx.strokeStyle = rgba(bright, 0.8);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(w / 2, y + 70, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, y + 70, 24, 0, Math.PI * 2);
  ctx.stroke();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(w / 2 + Math.cos(a) * 24, y + 70 + Math.sin(a) * 24);
    ctx.lineTo(w / 2 + Math.cos(a) * 42, y + 70 + Math.sin(a) * 42);
    ctx.stroke();
  }
  glyphRow(ctx, rand, 28, y + 140, 14, 12, rgba(accent, 0.8));
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let yy = 0; yy < h; yy += 4) ctx.fillRect(0, yy, w, 1);
  return toTexture(c, { srgb: true, wrap: false });
}
