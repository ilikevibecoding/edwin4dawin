// Pure-JS RGBA raster used by the appearance composer. Every skin is painted into a Raster (typed array) and
// blitted once into a real canvas, so the same bytes come out in node (offline tests) and in the browser, and
// painting never touches the (slow) 2D canvas API per pixel. SoftCanvas is a tiny stand-in for HTMLCanvasElement
// with the subset of the 2D context the composer, blink.js and the tests use, so `document` is optional.

export function rgb(c) {
  if (Array.isArray(c)) return c.length === 3 ? [c[0], c[1], c[2], 255] : [c[0], c[1], c[2], c[3]];
  if (c[0] === '#') {
    if (c.length === 4) return [parseInt(c[1] + c[1], 16), parseInt(c[2] + c[2], 16), parseInt(c[3] + c[3], 16), 255];
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), c.length >= 9 ? parseInt(c.slice(7, 9), 16) : 255];
  }
  const m = /rgba?\(([^)]+)\)/.exec(c);
  if (m) { const p = m[1].split(',').map((v) => parseFloat(v)); return [p[0], p[1], p[2], p.length > 3 ? Math.round(p[3] * 255) : 255]; }
  return [255, 0, 255, 255];
}
const cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
export function hex(c) { const [r, g, b] = rgb(c); return '#' + [r, g, b].map((v) => cl(v).toString(16).padStart(2, '0')).join(''); }
export function shade(c, f) { const [r, g, b, a] = rgb(c); return [cl(r * f), cl(g * f), cl(b * f), a]; }
export function mix(a, b, t) { const A = rgb(a), B = rgb(b); return [cl(A[0] + (B[0] - A[0]) * t), cl(A[1] + (B[1] - A[1]) * t), cl(A[2] + (B[2] - A[2]) * t), 255]; }
export function luminance(c) { const [r, g, b] = rgb(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }
export function withAlpha(c, a) { const [r, g, b] = rgb(c); return [r, g, b, cl(a * 255)]; }
export function sameColour(p, c, tol = 0) {
  const C = rgb(c);
  return Math.abs(p[0] - C[0]) <= tol && Math.abs(p[1] - C[1]) <= tol && Math.abs(p[2] - C[2]) <= tol;
}

export class Raster {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8ClampedArray(w * h * 4); }
  px(x, y, c) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const C = rgb(c), i = (y * this.w + x) * 4;
    this.d[i] = C[0]; this.d[i + 1] = C[1]; this.d[i + 2] = C[2]; this.d[i + 3] = C[3];
  }
  // source-over blend with an explicit opacity (0..1) onto an opaque or transparent pixel
  blend(x, y, c, a) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const C = rgb(c), i = (y * this.w + x) * 4, da = this.d[i + 3] / 255;
    if (da === 0) { this.d[i] = C[0]; this.d[i + 1] = C[1]; this.d[i + 2] = C[2]; this.d[i + 3] = cl(a * 255); return; }
    this.d[i] = cl(this.d[i] + (C[0] - this.d[i]) * a); this.d[i + 1] = cl(this.d[i + 1] + (C[1] - this.d[i + 1]) * a); this.d[i + 2] = cl(this.d[i + 2] + (C[2] - this.d[i + 2]) * a);
    this.d[i + 3] = cl(Math.max(this.d[i + 3], a * 255));
  }
  get(x, y) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]];
  }
  alpha(x, y) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.d[(y * this.w + x) * 4 + 3]; }
  rect(x, y, w, h, c) {
    x |= 0; y |= 0; w |= 0; h |= 0;
    let x0 = x < 0 ? 0 : x, y0 = y < 0 ? 0 : y, x1 = x + w > this.w ? this.w : x + w, y1 = y + h > this.h ? this.h : y + h;
    if (x1 <= x0 || y1 <= y0) return;
    const C = rgb(c), d = this.d, W = this.w, cr = C[0], cg = C[1], cb = C[2], ca = C[3];
    for (let j = y0; j < y1; j++) { let i = (j * W + x0) * 4; for (let k = x0; k < x1; k++, i += 4) { d[i] = cr; d[i + 1] = cg; d[i + 2] = cb; d[i + 3] = ca; } }
  }
  rectA(x, y, w, h, c, a) { const C = rgb(c); for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.blend(i, j, C, a); }
  hline(x0, x1, y, c) { this.rect(x0, y, x1 - x0 + 1, 1, c); }
  vline(x, y0, y1, c) { this.rect(x, y0, 1, y1 - y0 + 1, c); }
  // 1-px frame inside the rect
  frame(x, y, w, h, c) { this.hline(x, x + w - 1, y, c); this.hline(x, x + w - 1, y + h - 1, c); this.vline(x, y, y + h - 1, c); this.vline(x + w - 1, y, y + h - 1, c); }
  clear(x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const k = (j * this.w + i) * 4; this.d[k] = 0; this.d[k + 1] = 0; this.d[k + 2] = 0; this.d[k + 3] = 0; } }
  // multiply the brightness of a pixel / rect
  mul(x, y, f) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4, d = this.d;
    if (!d[i + 3]) return;
    d[i] = d[i] * f; d[i + 1] = d[i + 1] * f; d[i + 2] = d[i + 2] * f; // Uint8ClampedArray clamps and rounds
  }
  mulRect(x, y, w, h, f) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.mul(i, j, f); }
  // per-pixel brightness jitter over existing pixels; density = fraction of pixels touched
  noise(x, y, w, h, amt, rng, density = 1) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (density < 1 && rng.next() >= density) continue;
      this.mul(i, j, 1 + (rng.next() - 0.5) * 2 * amt);
    }
  }
  speckle(x, y, w, h, c, count, rng) { const C = rgb(c); for (let k = 0; k < count; k++) this.px(x + Math.floor(rng.next() * w), y + Math.floor(rng.next() * h), C); }
  // copy a rect from another raster (alpha 0 pixels are skipped)
  copy(src, sx, sy, w, h, dx, dy) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const p = src.get(sx + i, sy + j); if (p[3]) this.px(dx + i, dy + j, p); }
  }
  // mirror a rect horizontally in place
  mirrorX(x, y, w, h) {
    for (let j = y; j < y + h; j++) for (let i = 0; i < w >> 1; i++) {
      const a = this.get(x + i, j), b = this.get(x + w - 1 - i, j);
      this.px(x + i, j, b); this.px(x + w - 1 - i, j, a);
    }
  }
  // gradient-free "bevel": lighter top-left edge, darker bottom-right edge
  bevel(x, y, w, h, lightF = 1.15, darkF = 0.8) {
    for (let i = x; i < x + w; i++) { this.mul(i, y, lightF); this.mul(i, y + h - 1, darkF); }
    for (let j = y + 1; j < y + h - 1; j++) { this.mul(x, j, lightF); this.mul(x + w - 1, j, darkF); }
  }
  count(x, y, w, h, pred) { let n = 0; for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (pred(this.get(i, j), i, j)) n++; return n; }
  // number of pixels that differ (any channel by more than tol) between two same-sized rects of two rasters
  static diffCount(a, ax, ay, b, bx, by, w, h, tol = 8) {
    let n = 0;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const p = a.get(ax + i, ay + j), q = b.get(bx + i, by + j);
      if (Math.abs(p[0] - q[0]) > tol || Math.abs(p[1] - q[1]) > tol || Math.abs(p[2] - q[2]) > tol || Math.abs(p[3] - q[3]) > tol) n++;
    }
    return n;
  }
  hash(x = 0, y = 0, w = this.w, h = this.h) {
    let hsh = 2166136261;
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const k = (j * this.w + i) * 4;
      for (let c = 0; c < 4; c++) { hsh ^= this.d[k + c]; hsh = Math.imul(hsh, 16777619); }
    }
    return (hsh >>> 0).toString(16).padStart(8, '0');
  }
  clone() { const r = new Raster(this.w, this.h); r.d.set(this.d); return r; }
  // Copies the pixels into a canvas (real or Soft) through one putImageData
  blitTo(canvas) {
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(this.w, this.h);
    img.data.set(this.d);
    ctx.putImageData(img, 0, 0);
    return canvas;
  }
  static fromCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const r = new Raster(canvas.width, canvas.height);
    r.d.set(img.data);
    return r;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Canvas factory: real DOM canvases when a document exists, SoftCanvas otherwise, or anything injected by the host.
let factory = null;
export function setCanvasFactory(fn) { factory = fn; }
export function createCanvas(w, h) {
  if (factory) return factory(w, h);
  if (typeof document !== 'undefined' && document.createElement) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  return new SoftCanvas(w, h);
}
export function hasDomCanvas() { return typeof document !== 'undefined' && !!document.createElement; }

class SoftImageData { constructor(w, h, data) { this.width = w; this.height = h; this.data = data || new Uint8ClampedArray(w * h * 4); } }

class SoftContext {
  constructor(canvas) { this.canvas = canvas; this.fillStyle = '#000000'; this.imageSmoothingEnabled = true; this.globalAlpha = 1; }
  get raster() { return this.canvas.raster; }
  createImageData(w, h) { return new SoftImageData(w, h); }
  getImageData(x, y, w, h) {
    const out = new SoftImageData(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const p = this.raster.get(x + i, y + j); out.data.set(p, (j * w + i) * 4); }
    return out;
  }
  putImageData(img, dx, dy) {
    for (let j = 0; j < img.height; j++) for (let i = 0; i < img.width; i++) { const k = (j * img.width + i) * 4; this.raster.px(dx + i, dy + j, [img.data[k], img.data[k + 1], img.data[k + 2], img.data[k + 3]]); }
  }
  fillRect(x, y, w, h) {
    const c = rgb(this.fillStyle), a = (c[3] / 255) * this.globalAlpha;
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (a >= 1) this.raster.rect(x, y, w, h, c); else this.raster.rectA(x, y, w, h, c, a);
  }
  clearRect(x, y, w, h) { this.raster.clear(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  // drawImage(img, dx, dy) | (img, dx, dy, dw, dh) | (img, sx, sy, sw, sh, dx, dy, dw, dh) - nearest neighbour
  drawImage(img, ...a) {
    const src = img.raster ? img.raster : Raster.fromCanvas(img);
    let sx = 0, sy = 0, sw = src.w, sh = src.h, dx, dy, dw, dh;
    if (a.length === 2) { [dx, dy] = a; dw = sw; dh = sh; }
    else if (a.length === 4) { [dx, dy, dw, dh] = a; }
    else { [sx, sy, sw, sh, dx, dy, dw, dh] = a; }
    dx = Math.round(dx); dy = Math.round(dy); dw = Math.round(dw); dh = Math.round(dh);
    for (let j = 0; j < dh; j++) for (let i = 0; i < dw; i++) {
      const p = src.get(sx + Math.floor((i / dw) * sw), sy + Math.floor((j / dh) * sh));
      if (p[3] === 0) continue;
      if (p[3] === 255 && this.globalAlpha >= 1) this.raster.px(dx + i, dy + j, p); else this.raster.blend(dx + i, dy + j, p, (p[3] / 255) * this.globalAlpha);
    }
  }
  fillText() { /* no text in the soft canvas */ }
  measureText(t) { return { width: (t || '').length * 7 }; }
  save() {} restore() {} translate() {} scale() {} beginPath() {} closePath() {} moveTo() {} lineTo() {} stroke() {} fill() {}
}

export class SoftCanvas {
  constructor(w, h) { this.raster = new Raster(w, h); this._ctx = null; this.isSoft = true; }
  get width() { return this.raster.w; }
  set width(v) { this.raster = new Raster(v, this.raster.h); }
  get height() { return this.raster.h; }
  set height(v) { this.raster = new Raster(this.raster.w, v); }
  getContext(kind) { if (kind !== '2d') return null; if (!this._ctx) this._ctx = new SoftContext(this); return this._ctx; }
  toDataURL() { throw new Error('SoftCanvas.toDataURL needs a deflate function: use encodePNG(raster, deflate)'); }
}

// Minimal PNG writer (RGBA8, no filtering) for offline sheets: deflate = e.g. node:zlib deflateSync
export function encodePNG(raster, deflate) {
  const { w, h, d } = raster;
  const raw = new Uint8Array((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; raw.set(d.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1); }
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c; }
  const crc = (buf) => { let c = -1; for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (type, data) => {
    const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = new Uint8Array(deflate(raw));
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((n, p) => n + p.length, 0), out = new Uint8Array(total);
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
