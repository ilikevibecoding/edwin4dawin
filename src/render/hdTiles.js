// HD tile refinement: turns a 16x16 painted tile into a 64x64 colour tile plus a height field, per material
// class (wood grain, stone chips, brushed metal, panel bevels, fabric weave, leaf clusters ...).
//
// Rules every refiner obeys:
//   * layout preservation: every 4x4 block of HD texels averages back to its base texel (enforced by a
//     per-block mean correction, so the tile reads identically at distance and the top mip levels equal the
//     old 16x16 atlas);
//   * alpha is inherited from the base texel (no new holes, no filled holes);
//   * determinism: everything is seeded from the tile name; the shared noise banks have fixed seeds.
//
// Performance notes (the refiner runs ~140 times at load, cold): detail is composed from small, type-stable
// layer functions that each get JIT-compiled once, scratch buffers are reused, and per-texel work is table
// driven (shared periodic noise banks sampled through a per-tile index transform).
import { RNG } from '../rng.js';
import { BASE_PX, TILE_PX, HD_SCALE } from '../constants.js';
import { classify } from './materials.js';

const B = BASE_PX;          // 16 base texels per tile side
const S = TILE_PX;          // 64 HD texels per tile side
const K = HD_SCALE;         // 4 HD texels per base texel
const N = S * S;
const SM = S - 1;           // wrap mask (S is a power of two)
const BM = B - 1;
const NM = N - 1;

const FACE = 0, GROOVE = 1, DOT = 2, TRANSP = 3;

export function makeImageData(w, h) {
  if (typeof ImageData !== 'undefined') return new ImageData(w, h);
  return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
}

// FNV-1a on the tile name: the per-tile seed.
export function seedFromName(name) {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------------------
// Shared periodic noise banks (64x64, tile-periodic so no seams), built once.
// ---------------------------------------------------------------------------
function valueNoise(seed, cells) {
  const r = new RNG(seed);
  const lat = new Float32Array(cells * cells);
  for (let i = 0; i < lat.length; i++) lat[i] = r.next() * 2 - 1;
  const out = new Float32Array(N);
  const cs = S / cells;
  for (let y = 0; y < S; y++) {
    const gy = y / cs, iy = Math.floor(gy), fy = gy - iy, v = fy * fy * (3 - 2 * fy);
    const r0 = (iy % cells) * cells, r1 = ((iy + 1) % cells) * cells;
    for (let x = 0; x < S; x++) {
      const gx = x / cs, ix = Math.floor(gx), fx = gx - ix, u = fx * fx * (3 - 2 * fx);
      const c0 = ix % cells, c1 = (ix + 1) % cells;
      const a = lat[r0 + c0] + (lat[r0 + c1] - lat[r0 + c0]) * u;
      const b = lat[r1 + c0] + (lat[r1 + c1] - lat[r1 + c0]) * u;
      out[y * S + x] = a + (b - a) * v;
    }
  }
  return out;
}
function fbm(seed, spec) {
  const out = new Float32Array(N);
  let wsum = 0;
  spec.forEach(([cells, w], k) => { const n = valueNoise(seed + k * 101, cells); for (let i = 0; i < N; i++) out[i] += n[i] * w; wsum += w; });
  for (let i = 0; i < N; i++) out[i] /= wsum;
  return out;
}
let NZ = null;
function banks() {
  if (NZ) return NZ;
  const wn = new Float32Array(N);
  const wr = new RNG(97);
  for (let i = 0; i < N; i++) wn[i] = wr.next() * 2 - 1;
  NZ = {
    white: wn, // white noise bank (-1..1); layers sample it with a per-tile/per-layer offset
    coarse: fbm(11, [[4, 1], [8, 0.5]]),
    coarse2: fbm(21, [[4, 1], [8, 0.5]]),
    medium: fbm(12, [[8, 1], [16, 0.5]]),
    medium2: fbm(22, [[8, 1], [16, 0.5]]),
    fine: fbm(13, [[16, 1], [32, 0.5]]),
    fine2: fbm(23, [[16, 1], [32, 0.5]]),
    vfine: valueNoise(14, 32),
  };
  return NZ;
}

// Scratch buffers reused across tiles (keeps the GC quiet during the load-time build).
const SCR = {
  lum: new Float32Array(B * B), sat: new Float32Array(B * B), op: new Uint8Array(B * B), rel: new Float32Array(B * B),
  st: new Uint8Array(B * B), hb: new Float32Array(B * B), w: new Float32Array(B * B), emit: new Float32Array(B * B), nug: new Uint8Array(B * B),
  dist: new Float32Array(B * B), hist: new Uint32Array(256 * 4),
  dl: new Float32Array(N), dh: new Float32Array(N), hbUp: new Float32Array(N), mark: new Uint8Array(N),
  dr: new Float32Array(K * K), dg: new Float32Array(K * K), db: new Float32Array(K * K),
};

// ---------------------------------------------------------------------------
// Base (16x16) analysis: luminance, structure (face / groove / dot / transparent), base height.
// ---------------------------------------------------------------------------
// median of channel (0..3 -> lum, r, g, b) over opaque texels via a 256-bin histogram
function histMedian(hist, channel, count) {
  if (!count) return 128;
  let acc = 0;
  for (let v = 0; v < 256; v++) { acc += hist[channel * 256 + v]; if (acc > count >> 1) return v; }
  return 255;
}
const at = (x, y) => ((y & BM) * B + (x & BM));

function analyze(base, M) {
  const d = base.data;
  const n = B * B;
  const { lum, sat, op, rel, st, hb, w, emit, nug, hist } = SCR;
  hist.fill(0);
  let count = 0;
  for (let i = 0; i < n; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], a = d[i * 4 + 3];
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    sat[i] = mx > 0 ? (mx - mn) / mx : 0;
    op[i] = a >= 128 ? 1 : 0;
    nug[i] = 0;
    if (op[i]) { count++; hist[lum[i] | 0]++; hist[256 + r]++; hist[512 + g]++; hist[768 + b]++; }
  }
  const median = histMedian(hist, 0, count);
  const mr = histMedian(hist, 1, count), mg = histMedian(hist, 2, count), mb = histMedian(hist, 3, count);
  const gs = M.grooveSign, gt = M.grooveT;
  for (let i = 0; i < n; i++) {
    rel[i] = lum[i] - median;
    if (!op[i]) st[i] = TRANSP;
    else if (gs !== 0 && rel[i] * gs > gt) st[i] = GROOVE;
    else st[i] = FACE;
  }
  if (M.blobs) { const bt = M.blobT || 12; for (let i = 0; i < n; i++) if (st[i] === FACE && Math.abs(rel[i]) > bt) st[i] = DOT; }
  if (M.dots) markDots(lum, st);
  const nearMedian = !!M.nearMedian, emitP = M.emit, isOre = M.cls === 'ore', hl = M.hl, alphaGroove = !!M.bevelAlpha;
  for (let i = 0; i < n; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    // near-median weight: 1 for texels that look like the tile's main material
    const dist = Math.abs(r - mr) + Math.abs(g - mg) + Math.abs(b - mb);
    w[i] = nearMedian ? 1 - smoothstep(60, 130, dist) : 1;
    emit[i] = emitP ? smoothstep(emitP.lo, emitP.hi, lum[i]) * (sat[i] >= (emitP.sat || 0) ? 1 : 0) : 0;
    if (isOre && st[i] !== TRANSP && (Math.abs(rel[i]) > 30 || sat[i] > 0.3)) { nug[i] = 1; st[i] = FACE; }
    const s = st[i];
    hb[i] = s === GROOVE ? -1 : s === DOT ? 0.8 : s === TRANSP ? (alphaGroove ? -1 : 0) : clamp(rel[i] / 60, -1, 1) * hl;
  }
  if (M.smooth && gs !== 0) domeHeights(st, hb);
  return { lum, sat, op, median, rel, st, hb, w, emit, nug };
}
// isolated texels that differ strongly from four similar neighbours become domes (rivets, pebbles)
function markDots(lum, st) {
  for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) {
    const i = y * B + x;
    if (st[i] !== FACE) continue;
    const j0 = at(x - 1, y), j1 = at(x + 1, y), j2 = at(x, y - 1), j3 = at(x, y + 1);
    if (st[j0] !== FACE || st[j1] !== FACE || st[j2] !== FACE || st[j3] !== FACE) continue;
    const l = lum[i];
    if (Math.abs(lum[j0] - l) < 12 || Math.abs(lum[j1] - l) < 12 || Math.abs(lum[j2] - l) < 12 || Math.abs(lum[j3] - l) < 12) continue;
    const lo = Math.min(lum[j0], lum[j1], lum[j2], lum[j3]), hi = Math.max(lum[j0], lum[j1], lum[j2], lum[j3]);
    if (hi - lo < 24) st[i] = DOT;
  }
}
// rounded stones / ribs: distance to the nearest groove drives a dome height
function domeHeights(st, hb) {
  const n = B * B, dist = SCR.dist;
  for (let i = 0; i < n; i++) dist[i] = (st[i] === GROOVE || st[i] === TRANSP) ? 0 : 9;
  for (let pass = 0; pass < 3; pass++) for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) {
    const i = y * B + x;
    const m = Math.min(dist[at(x - 1, y)], dist[at(x + 1, y)], dist[at(x, y - 1)], dist[at(x, y + 1)]) + 1;
    if (m < dist[i]) dist[i] = m;
  }
  for (let i = 0; i < n; i++) if (st[i] === FACE) hb[i] += 1.1 * Math.min(dist[i], 3) / 3;
}

// ---------------------------------------------------------------------------
// Layer primitives. Every primitive writes into dl (relative luminance change) and/or dh (height detail),
// both Float32Array(64*64), wrapping at the tile border.
// ---------------------------------------------------------------------------

// Per-tile sampling transform for the shared banks (offset + flips + transpose) so tiles never share visible
// structure. Baked into two index tables: bank index = row[y] + col[x].
function makeXf(rng) {
  const ox = rng.int(0, SM), oy = rng.int(0, SM), fx = rng.chance(0.5), fy = rng.chance(0.5), tp = rng.chance(0.5);
  const row = new Int32Array(S), col = new Int32Array(S);
  for (let k = 0; k < S; k++) {
    const px = fx ? SM - k : k, py = fy ? SM - k : k;
    if (tp) { row[k] = (py + ox) & SM; col[k] = ((px + oy) & SM) * S; }
    else { row[k] = ((py + oy) & SM) * S; col[k] = (px + ox) & SM; }
  }
  return { row, col };
}
const fieldAt = (f, x, y, T) => f[T.row[y] + T.col[x]];

// dst += amp * bank[...] sampled through the tile transform (off: extra index offset for white-noise layers)
function addNoise(dst, f, amp, T, off) {
  const row = T.row, col = T.col;
  for (let y = 0; y < S; y++) { const ry = row[y] + off, o = y * S; for (let x = 0; x < S; x++) dst[o + x] += amp * f[(ry + col[x]) & NM]; }
}
// same, restricted to HD texels whose base texel has structure `code`
function addNoiseWhere(dst, f, amp, T, off, st, code) {
  const row = T.row, col = T.col;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (st[(y >> 2) * B + (x >> 2)] === code) dst[y * S + x] += amp * f[(row[y] + col[x] + off) & NM];
}
// anisotropic sampling: coordinate scales in 1/64 units (sx64 < 64 stretches along x, 0 = constant along x);
// swap exchanges the axes (vertical brushing / grain)
function addNoiseAniso(dst, f, amp, T, sx64, sy64, swap) {
  const row = T.row, col = T.col;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = swap ? y : x, v = swap ? x : y;
    dst[y * S + x] += amp * f[row[((v * sy64) >> 6) & SM] + col[((u * sx64) >> 6) & SM]];
  }
}
// sparse specks: texels whose white noise exceeds pHi get (+ampL, +ampH), below pLo get (ampL2, ampH2); p in 0..1
function addSpecks(dl, dh, off, pHi, ampL, ampH, pLo, ampL2, ampH2) {
  const wn = NZ.white, hi = pHi * 2 - 1, lo = pLo * 2 - 1;
  for (let i = 0; i < N; i++) {
    const h = wn[(i + off) & NM];
    if (h > hi) { dl[i] += ampL; dh[i] += ampH; } else if (h < lo) { dl[i] += ampL2; dh[i] += ampH2; }
  }
}
// n strokes / cracks / blades. Parameters (all always given, see LP()):
//   ang (base angle; < 0 = random), spread, lenMin, lenMax, ampL, ampH, alt (alternate sign), jitter (random walk),
//   lip (lit texel on the lower-right side of a dark crack), shadow (index offset that gets -0.45*ampL: scratches),
//   lean (blades: x offset applied after half the length)
function LP(ang, spread, lenMin, lenMax, ampL, ampH, alt, jitter, lip, shadow, lean) {
  return { ang: ang + 1e-7, spread: spread + 1e-7, lenMin, lenMax, ampL: ampL + 1e-7, ampH: ampH + 1e-7, alt, jitter: jitter + 1e-7, lip: lip + 1e-7, shadow, lean };
}
function lines(dl, dh, rng, n, P) {
  const mark = SCR.mark;
  const useLip = P.lip > 1e-6;
  if (useLip) mark.fill(0);
  for (let k = 0; k < n; k++) {
    const ang = (P.ang < 0 ? rng.range(0, Math.PI) : P.ang) + rng.range(-P.spread, P.spread);
    const sgn = P.alt && (k & 1) ? -1 : 1;
    let x = rng.range(0, S), y = rng.range(0, S);
    let dx = Math.cos(ang), dy = Math.sin(ang);
    const len = rng.int(P.lenMin, P.lenMax);
    const lean = P.lean ? rng.int(-1, 1) : 0;
    for (let j = 0; j < len; j++) {
      const i = ((Math.round(y) & SM) * S + ((Math.round(x) + (j > len / 2 ? lean : 0)) & SM));
      dl[i] += sgn * P.ampL; dh[i] += sgn * P.ampH;
      if (useLip) mark[i] = 1;
      if (P.shadow !== 0) dl[(i + P.shadow) & NM] -= P.ampL * 0.45;
      x += dx; y += dy;
      if (P.jitter > 1e-6) { dx += (rng.next() - 0.5) * P.jitter; dy += (rng.next() - 0.5) * P.jitter; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; }
    }
  }
  if (useLip) for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x;
    if (!mark[i] && mark[((y - 1) & SM) * S + ((x - 1) & SM)]) dl[i] += P.lip;
  }
}
// Ellipses: kind 0 = pit (dark, shadowed top-left wall, lit bottom-right wall), 1 = bump (lit top-left),
// 2 = leaf (lit top, shaded bottom, raised). amp scales the colour effect.
function ellipses(dl, dh, rng, n, rxMin, rxMax, ryMin, ryMax, kind, amp) {
  for (let k = 0; k < n; k++) {
    const rx = rng.range(rxMin, rxMax), ry = rng.range(ryMin, ryMax), ang = kind === 2 ? rng.range(-0.6, 0.6) : rng.range(0, Math.PI);
    const cx = rng.range(0, S), cy = rng.range(0, S);
    const c = Math.cos(ang), s = Math.sin(ang), R = Math.ceil(Math.max(rx, ry)), r = Math.max(rx, ry);
    const ix = Math.floor(cx), iy = Math.floor(cy), fx = cx - ix - 0.5, fy = cy - iy - 0.5;
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      const dx = x + fx, dy = y + fy;
      const u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry;
      const e = u * u + v * v;
      if (e >= 1) continue;
      const i = ((iy + y) & SM) * S + ((ix + x) & SM);
      const sd = (dx + dy) / (r * 1.414);
      if (kind === 0) { dl[i] += amp * (-0.07 + 0.11 * sd * (1 - e * 0.5)); dh[i] -= 0.7 * (1 - e); }
      else if (kind === 1) { dl[i] += amp * (0.03 - 0.11 * sd); dh[i] += 0.5 * (1 - e); }
      else { const t = -dy / ry; dl[i] += amp * (0.05 + 0.1 * t - 0.06 * e); dh[i] += 0.7 * (1 - e); }
    }
  }
}
// Wood grain: dark wavy lines along the grain, tone bands, optional knot; dir 0 = horizontal, 1 = vertical,
// 2 = concentric growth rings.
function grain(dl, dh, rng, T, dir, period, amp, wob, hAmp, withKnot) {
  const nz = banks();
  const phase0 = rng.next() * period;
  const knot = { x: rng.range(6, 58), y: rng.range(6, 58), ra: rng.range(3, 4.4), rb: rng.range(1.5, 2.3), on: withKnot };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x;
    let v;
    if (dir === 1) v = x;
    else if (dir === 2) { const dx = x - 31.5, dy = y - 31.5; v = Math.sqrt(dx * dx + dy * dy); }
    else v = y;
    let vv = v + wob * fieldAt(nz.coarse, x, y, T);
    let kd = 0;
    if (knot.on) {
      const du = dir === 1 ? y - knot.y : x - knot.x, dv = dir === 1 ? x - knot.x : y - knot.y;
      const e = Math.sqrt((du * du) / (knot.ra * knot.ra) + (dv * dv) / (knot.rb * knot.rb));
      if (e < 2.6) vv += (dv >= 0 ? 1 : -1) * 1.4 * clamp((2.6 - e) / 1.6, 0, 1);
      if (e < 1) { const ring = 0.5 + 0.5 * Math.cos(e * 8.5); kd = -0.07 - 0.12 * ring * Math.sqrt(1 - e) - 0.06 * (1 - e); }
    }
    const p = (vv + phase0) / period;
    const f = p - Math.floor(p);
    const dist = Math.min(f, 1 - f) * period;
    const line = Math.max(0, 1 - dist / 0.95);
    const m = fieldAt(nz.medium, x, y, T);
    dl[i] += -amp * line + 0.03 * Math.sin(p * Math.PI * 2 + 1.2) + 0.035 * m + kd;
    dh[i] += -hAmp * line + 0.12 * m + kd * 2;
  }
}
// Fabric weave: 2x2 texel threads, alternating over/under
function weave(dl, dh, amp) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x;
    const over = ((x >> 1) + (y >> 1)) & 1;
    const d = over ? ((y & 1) === 0 ? amp : -amp) : ((x & 1) === 0 ? amp : -amp);
    dl[i] += d; dh[i] += d * 4;
  }
}
// Soft radial glow inside every base texel (emissive cells)
function cellGlow(dl, dh, amp) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, fx = (x & 3) - 1.5, fy = (y & 3) - 1.5, r2 = fx * fx + fy * fy;
    dl[i] += amp * (1 - r2 / 4.5); dh[i] += 3 * amp * (1 - r2 / 4.5);
  }
}
// Sand ripples
function ripples(dl, dh, T, amp) {
  const nz = banks();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x;
    const r = Math.sin(x * 0.25 + y * 0.9 + 3 * fieldAt(nz.coarse, x, y, T));
    dl[i] += amp * r; dh[i] += 5 * amp * r;
  }
}
// Faceted ore nuggets on masked base texels (replaces the stone detail there)
function facets(dl, dh, mask) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (!mask[(y >> 2) * B + (x >> 2)]) continue;
    const i = y * S + x, fx = (x & 3) - 1.5, fy = (y & 3) - 1.5;
    const f = Math.abs(fx) + Math.abs(fy), sd = (fx + fy) / 3;
    dl[i] = -0.16 * sd + (f > 2.4 ? -0.1 : 0.04);
    dh[i] = 1.2 - 0.4 * f;
  }
}
// Glass: bright core along the diagonal streak texels (semi-transparent base texels), lit outer frame edge
function glassStreaks(dl, st, baseData, amp) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, bi = (y >> 2) * B + (x >> 2), fx = (x & 3) - 1.5, fy = (y & 3) - 1.5;
    if (st[bi] !== TRANSP && baseData[bi * 4 + 3] < 255) dl[i] += amp * (1 - Math.abs(fx + fy) / 2);
    if (x === 0 || y === 0) dl[i] += 0.06;
    if (x === SM || y === SM) dl[i] -= 0.05;
  }
}
function clampArr(a, lo, hi) { for (let i = 0; i < N; i++) a[i] = a[i] < lo ? lo : a[i] > hi ? hi : a[i]; }

// ---------------------------------------------------------------------------
// Class painters: sequences of layer primitives.
// ---------------------------------------------------------------------------
const D = {};
D.plain = () => {};
D.wood = (C) => {
  const { M, rng, T, dl, dh, seed, nz } = C;
  const bark = !!M.bark;
  const dir = M.grain === 'v' ? 1 : M.grain === 'rings' ? 2 : 0;
  grain(dl, dh, rng, T, dir, rng.range(bark ? 3.2 : 3.4, bark ? 4.4 : 4.8), bark ? 0.15 : 0.1, bark ? 2.6 : 1.3, bark ? 0.7 : 0.4, !bark && dir !== 2 && rng.chance(0.55));
  addNoise(dl, nz.white, 0.018, T, seed);
  if (bark) lines(dl, dh, rng, rng.int(3, 6), LP(dir === 1 ? 0 : Math.PI / 2, 0.25, 3, 8, -0.14, -0.5, false, 0.35, 0, 0, false));
};
D.stone = (C) => {
  const { M, rng, T, dl, dh, seed, nz } = C;
  addNoise(dl, nz.medium, 0.055, T, 0); addNoise(dl, nz.fine2, 0.04, T, 0); addNoise(dl, nz.white, 0.025, T, seed);
  addNoise(dh, nz.medium, 0.25, T, 0); addNoise(dh, nz.fine2, 0.1, T, 0);
  const chips = M.chips ?? (M.relief < 0.4 ? 3 : 7);
  ellipses(dl, dh, rng, chips, 1.3, 2.8, 0.9, 2.4, 0, 1.0001);
  lines(dl, dh, rng, M.cracks ?? (M.relief < 0.4 ? 1 : 2), LP(-1, Math.PI, 8, 22, -0.16, -0.8, false, 0.6, 0.06, 0, false));
  addSpecks(dl, dh, seed + 3, 0.985, 0.07, 0.0001, 0, 0, 0);
};
D.brick = (C) => {
  const { A, T, dl, dh, seed, nz } = C;
  addNoise(dl, nz.fine, 0.045, T, 0); addNoise(dl, nz.medium2, 0.02, T, 0); addNoise(dl, nz.white, 0.03, T, seed);
  addNoise(dh, nz.fine, 0.15, T, 0);
  addSpecks(dl, dh, seed + 5, 0.965, -0.1, -0.4, 0, 0, 0);
  addNoiseWhere(dl, nz.white, 0.06, T, seed + 6, A.st, GROOVE);
};
D.cobble = (C) => {
  const { A, rng, T, dl, dh, seed, nz } = C;
  addNoise(dl, nz.fine, 0.05, T, 0); addNoise(dl, nz.medium, 0.03, T, 0); addNoise(dl, nz.white, 0.03, T, seed);
  addNoise(dh, nz.fine, 0.12, T, 0);
  ellipses(dl, dh, rng, 4, 1, 1.8, 1, 1.8, 0, 0.8);
  addNoiseWhere(dl, nz.white, 0.04, T, seed + 6, A.st, GROOVE);
};
D.dirt = (C) => {
  const { rng, T, dl, dh, seed, nz } = C;
  addNoise(dl, nz.fine, 0.05, T, 0); addNoise(dl, nz.medium, 0.03, T, 0); addNoise(dl, nz.white, 0.055, T, seed);
  addNoise(dh, nz.fine, 0.3, T, 0); addNoise(dh, nz.white, 0.12, T, seed + 1);
  ellipses(dl, dh, rng, rng.int(6, 10), 1, 1.7, 0.8, 1.5, 1, 1.0001);
};
D.sand = (C) => {
  const { T, dl, dh, seed, nz } = C;
  addNoise(dl, nz.fine, 0.03, T, 0); addNoise(dl, nz.white, 0.035, T, seed);
  addNoise(dh, nz.medium, 0.25, T, 0);
  ripples(dl, dh, T, 0.02);
  addSpecks(dl, dh, seed + 7, 0.97, 0.1, 0.2, 0.03, -0.08, -0.1);
};
D.gravel = (C) => {
  const { T, dl, dh, seed, nz } = C;
  addNoise(dl, nz.fine, 0.04, T, 0); addNoise(dl, nz.white, 0.04, T, seed);
  addNoise(dh, nz.medium, 0.2, T, 0);
};
D.plaster = (C) => {
  const { M, rng, T, dl, dh, seed, nz } = C;
  addNoise(dl, nz.coarse2, 0.035, T, 0); addNoise(dl, nz.fine, 0.025, T, 0); addNoise(dl, nz.white, 0.02, T, seed);
  addNoise(dh, nz.coarse2, 0.3, T, 0); addNoise(dh, nz.fine, 0.1, T, 0);
  if (M.sparkle) addSpecks(dl, dh, seed + 9, 0.975, 0.1, 0.1, 0, 0, 0);
  else if (rng.chance(0.4)) lines(dl, dh, rng, 1, LP(-1, Math.PI, 10, 24, -0.09, -0.4, false, 0.5, 0, 0, false));
};
D.metal = (C) => {
  const { M, rng, T, dl, dh, seed, nz } = C;
  const vert = M.grain === 'v';
  addNoiseAniso(dl, nz.fine, 0.05, T, 19, 192, vert); addNoiseAniso(dh, nz.fine, 0.12, T, 19, 192, vert);
  addNoiseAniso(dl, nz.white, 0.025, T, 0, 64, vert); addNoise(dl, nz.white, 0.012, T, seed);
  addSpecks(dl, dh, seed + 13, 0.988, -0.08, -0.1, 0, 0, 0);
  lines(dl, dh, rng, rng.int(2, 4), LP(vert ? Math.PI / 2 : 0, 0.15, 6, 18, 0.09, -0.2, false, 0, 0, vert ? 1 : S, false));
};
D.chrome = (C) => {
  const { T, dl, dh, seed, nz } = C;
  addNoiseAniso(dl, nz.coarse, 0.06, T, 32, 96, false); addNoiseAniso(dl, nz.fine, 0.02, T, 16, 128, false); addNoise(dl, nz.white, 0.01, T, seed);
  addNoise(dh, nz.coarse, 0.1, T, 0);
};
D.panel = (C) => {
  const { rng, T, dl, dh, seed, nz } = C;
  addNoise(dl, nz.medium, 0.025, T, 0); addNoise(dl, nz.white, 0.012, T, seed);
  addNoise(dh, nz.medium, 0.1, T, 0);
  lines(dl, dh, rng, rng.int(1, 2), LP(0, 0.2, 5, 14, 0.04, 0, false, 0, 0, 0, false));
};
D.glass = (C) => {
  const { A, T, dl, seed, nz } = C;
  addNoise(dl, nz.white, 0.015, T, seed);
  glassStreaks(dl, A.st, C.baseData, 0.1);
};
D.fabric = (C) => {
  const { T, dl, dh, seed, nz } = C;
  weave(dl, dh, 0.06);
  addNoise(dl, nz.white, 0.03, T, seed); addNoise(dl, nz.fine, 0.02, T, 0); addNoise(dh, nz.fine, 0.05, T, 0);
};
D.foliage = (C) => {
  const { M, rng, T, dl, dh, seed, nz } = C;
  const style = M.style || 'leaves';
  addNoise(dl, nz.fine, 0.035, T, 0); addNoise(dl, nz.white, 0.02, T, seed); addNoise(dh, nz.fine, 0.1, T, 0);
  if (style === 'leaves') ellipses(dl, dh, rng, 44, 1.8, 3.2, 1.1, 2, 2, 1.0001);
  else if (style === 'flower') ellipses(dl, dh, rng, 24, 1.2, 1.9, 1, 1.4, 2, 1.0001);
  else if (style === 'blades') lines(dl, dh, rng, 90, LP(-Math.PI / 2, 0, 2, 5, 0.09, 0.3, true, 0, 0, 0, true));
  else if (style === 'ridges') addSpecks(dl, dh, seed + 17, 0.985, 0.12, 0.5, 0, 0, 0);
  clampArr(dl, -0.25, 0.25);
};
D.liquid = (C) => {
  const { T, dl, dh, nz } = C;
  addNoise(dl, nz.coarse, 0.035, T, 0); addNoise(dl, nz.medium, 0.02, T, 0);
  addNoise(dh, nz.coarse, 0.3, T, 0); addNoise(dh, nz.medium, 0.1, T, 0);
};
D.glow = (C) => {
  const { T, dl, dh, seed, nz } = C;
  cellGlow(dl, dh, 0.03); addNoise(dl, nz.white, 0.01, T, seed);
};
D.ore = (C) => { D.stone(C); facets(C.dl, C.dh, C.A.nug); };
D.organic = (C) => {
  const { M, rng, T, dl, dh, seed, nz } = C;
  addNoise(dl, nz.fine, 0.03, T, 0); addNoise(dl, nz.white, 0.02, T, seed); addNoise(dh, nz.fine, 0.1, T, 0);
  if (M.style === 'ribs') { addNoiseAniso(dl, nz.fine, 0.03, T, 128, 19, false); addNoise(dl, nz.medium, 0.03, T, 0); }
  else lines(dl, dh, rng, 70, LP(M.grain === 'r' ? -1 : Math.PI / 2, M.grain === 'r' ? 0 : 0.35, 4, 10, 0.09, 0.3, true, 0, 0, 0, false));
};

// Domes on DOT texels (rivets, pebbles) and bevels along face/groove borders (light from the top-left).
function structurePass(M, A, dl, dh) {
  const domeAmp = M.domeAmp ?? 0.12;
  const b = M.bevel || 0;
  const alphaGroove = !!M.bevelAlpha;
  const st = A.st, w = A.w;
  for (let by = 0; by < B; by++) for (let bx = 0; bx < B; bx++) {
    const bi = by * B + bx, s = st[bi];
    if (s === TRANSP) continue;
    if (s === DOT) {
      for (let fy = 0; fy < K; fy++) for (let fx = 0; fx < K; fx++) {
        const i = (by * K + fy) * S + bx * K + fx;
        const px = fx - 1.5, py = fy - 1.5, sd = (px + py) / 3, r2 = px * px + py * py;
        dl[i] = -domeAmp * sd - (r2 > 4 ? 0.08 : 0);
        dh[i] = 0.9 - r2 / 5;
      }
      continue;
    }
    if (b === 0) continue;
    const up = st[at(bx, by - 1)], dn = st[at(bx, by + 1)], lf = st[at(bx - 1, by)], rt = st[at(bx + 1, by)];
    let t = 0, d = 0, l = 0, r = 0, wgt = 1;
    if (s === FACE) {
      wgt = 0.5 + 0.5 * w[bi];
      if (up === GROOVE || (alphaGroove && up === TRANSP)) t = b;
      if (dn === GROOVE || (alphaGroove && dn === TRANSP)) d = -0.7 * b;
      if (lf === GROOVE || (alphaGroove && lf === TRANSP)) l = 0.6 * b;
      if (rt === GROOVE || (alphaGroove && rt === TRANSP)) r = -0.5 * b;
    } else {
      if (up === FACE) t = -0.8 * b;
      if (dn === FACE) d = 0.3 * b;
      if (lf === FACE) l = -0.4 * b;
      if (rt === FACE) r = 0.15 * b;
    }
    if (t === 0 && d === 0 && l === 0 && r === 0) continue;
    for (let fy = 0; fy < K; fy++) for (let fx = 0; fx < K; fx++) {
      const i = (by * K + fy) * S + bx * K + fx;
      let v = 0;
      if (fy === 0) v += t; if (fy === K - 1) v += d; if (fx === 0) v += l; if (fx === K - 1) v += r;
      dl[i] += v * wgt;
    }
  }
}

// Base height upsample: stepped (crisp bevels) or bilinear (rounded stones, fabric, foliage).
function upsampleHeight(hb, smooth, out) {
  if (smooth) {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const gx = (x + 0.5) / K - 0.5, gy = (y + 0.5) / K - 0.5;
      const x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
      const h00 = hb[at(x0, y0)], h10 = hb[at(x0 + 1, y0)], h01 = hb[at(x0, y0 + 1)], h11 = hb[at(x0 + 1, y0 + 1)];
      out[y * S + x] = (h00 * (1 - fx) + h10 * fx) * (1 - fy) + (h01 * (1 - fx) + h11 * fx) * fy;
    }
  } else {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) out[y * S + x] = hb[(y >> 2) * B + (x >> 2)];
  }
}

// Per-base-texel material values -> (roughness, metalness, emissive) * 255
function blockMaterial(M, A, bi, out) {
  let rough = M.roughness, metal = M.metalness;
  const emis = M.emissive * A.emit[bi];
  if (M.metalSat) metal *= A.sat[bi] < 0.15 ? 1 : 0.15;
  if (M.cls === 'ore') { metal = A.nug[bi] ? M.nuggetMetal : 0; if (A.nug[bi]) rough = 0.45; }
  if (A.st[bi] === GROOVE) rough = Math.min(1, rough + 0.12);
  out[0] = rough * 255; out[1] = metal * 255; out[2] = emis * 255;
}

// Colour composition: base texel + detail, mean-corrected per 4x4 block so every block averages to its base texel.
function compose(M, A, d, dl, dh, hbUp, o, material, height, seed) {
  const nz = NZ, gen = nz.fine, wn = nz.white, genOff = (seed + 31) & NM;
  const { dr, dg, db } = SCR;
  const mat = [0, 0, 0];
  const scale = M.detailScale ?? 1;
  for (let by = 0; by < B; by++) for (let bx = 0; bx < B; bx++) {
    const bi = by * B + bx;
    const r = d[bi * 4], g = d[bi * 4 + 1], b = d[bi * 4 + 2], a = d[bi * 4 + 3];
    blockMaterial(M, A, bi, mat);
    const mr = mat[0], mg = mat[1], mb = mat[2];
    if (A.st[bi] === TRANSP) {
      for (let fy = 0; fy < K; fy++) for (let fx = 0; fx < K; fx++) {
        const i = (by * K + fy) * S + bx * K + fx;
        o[i * 4] = r; o[i * 4 + 1] = g; o[i * 4 + 2] = b; o[i * 4 + 3] = a;
        material[i * 4] = mr; material[i * 4 + 1] = mg; material[i * 4 + 2] = 0; material[i * 4 + 3] = 255;
        height[i] = hbUp[i];
      }
      continue;
    }
    // headroom keeps detail from clamping on very bright / very dark texels
    const mn = Math.min(r, g, b), mx = Math.max(r, g, b);
    const hf = clamp(Math.min(mn, 255 - mx) / 40, 0.3, 1) * scale;
    const wgt = A.w[bi], hw = 0.5 + 0.5 * wgt;
    let sr = 0, sg = 0, sb = 0;
    for (let fy = 0; fy < K; fy++) for (let fx = 0; fx < K; fx++) {
      const i = (by * K + fy) * S + bx * K + fx, k = fy * K + fx;
      // texels that do not look like the tile's main material get generic fine noise instead of the class detail
      const dv = (dl[i] * wgt + (1 - wgt) * (0.03 * gen[i] + 0.015 * wn[(i + genOff) & NM])) * hf;
      // mostly multiplicative (keeps hue), partly additive (dark tiles still show detail)
      const vr = dv * (0.75 * r + 24), vg = dv * (0.75 * g + 24), vb = dv * (0.75 * b + 24);
      dr[k] = vr; dg[k] = vg; db[k] = vb;
      sr += vr; sg += vg; sb += vb;
      height[i] = hbUp[i] + dh[i] * hw;
    }
    sr /= K * K; sg /= K * K; sb /= K * K;
    for (let fy = 0; fy < K; fy++) for (let fx = 0; fx < K; fx++) {
      const i = (by * K + fy) * S + bx * K + fx, k = fy * K + fx;
      o[i * 4] = r + dr[k] - sr; o[i * 4 + 1] = g + dg[k] - sg; o[i * 4 + 2] = b + db[k] - sb; o[i * 4 + 3] = a;
      material[i * 4] = mr; material[i * 4 + 1] = mg; material[i * 4 + 2] = mb; material[i * 4 + 3] = 255;
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Nearest-neighbour upsample of the base tile (the "HD off" path and the `plain` class).
function upsamplePlain(base, color) {
  const d = base.data, o = color.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const bi = ((y >> 2) * B + (x >> 2)) * 4, i = (y * S + x) * 4;
    o[i] = d[bi]; o[i + 1] = d[bi + 1]; o[i + 2] = d[bi + 2]; o[i + 3] = d[bi + 3];
  }
}

// refineTile(base16ImageData, tileName, rng?, opts?) ->
//   { color: ImageData(64), height: Float32Array(64*64), material: Uint8ClampedArray(64*64*4) }
// material channels: R roughness, G metalness, B emissive, A 255. opts.plain skips the refinement (HD off).
export function refineTile(base, name, rng = null, opts = null) {
  const M = (opts && opts.material) || classify(name);
  const color = makeImageData(S, S);
  const height = new Float32Array(N);
  const material = new Uint8ClampedArray(N * 4);
  const d = base.data;
  if ((opts && opts.plain) || M.cls === 'plain') {
    upsamplePlain(base, color);
    for (let i = 0; i < N; i++) { material[i * 4] = M.roughness * 255; material[i * 4 + 1] = M.metalness * 255; material[i * 4 + 2] = 0; material[i * 4 + 3] = 255; }
    return { color, height, material };
  }
  if (!rng) rng = new RNG(seedFromName(name));
  const nz = banks();
  const A = analyze(base, M);
  const dl = SCR.dl, dh = SCR.dh;
  dl.fill(0); dh.fill(0);
  const C = { M, A, rng, nz, T: makeXf(rng), seed: rng.int(0, 1e9), dl, dh, baseData: d };
  (D[M.detail] || D[M.cls] || D.stone)(C);
  structurePass(M, A, dl, dh);
  upsampleHeight(A.hb, !!M.smooth, SCR.hbUp);
  compose(M, A, d, dl, dh, SCR.hbUp, color.data, material, height, C.seed);
  return { color, height, material };
}

// Tangent-space normal map (OpenGL convention: R = +u right, G = toward the top of the tile, B = out) from a
// wrapped height field via Sobel. `strength` scales the slope (class relief).
export function normalFromHeight(height, strength = 1) {
  const out = new Uint8ClampedArray(N * 4);
  const h = height;
  const k = 3 * strength;
  for (let y = 0; y < S; y++) {
    const ym = ((y - 1) & SM) * S, y0 = y * S, yp = ((y + 1) & SM) * S;
    for (let x = 0; x < S; x++) {
      const xm = (x - 1) & SM, xp = (x + 1) & SM;
      const gx = (h[ym + xp] + 2 * h[y0 + xp] + h[yp + xp] - h[ym + xm] - 2 * h[y0 + xm] - h[yp + xm]) / 8;
      const gy = (h[yp + xm] + 2 * h[yp + x] + h[yp + xp] - h[ym + xm] - 2 * h[ym + x] - h[ym + xp]) / 8;
      let nx = -gx * k, ny = gy * k, nzc = 1;
      const l = Math.sqrt(nx * nx + ny * ny + 1);
      nx /= l; ny /= l; nzc /= l;
      const i = (y0 + x) * 4;
      out[i] = 127.5 + 127.5 * nx; out[i + 1] = 127.5 + 127.5 * ny; out[i + 2] = 127.5 + 127.5 * nzc; out[i + 3] = 255;
    }
  }
  return out;
}

// Mip level downsamplers (one function per mode so each is compiled once for its own types).
// colour: alpha-aware, the exact rule the old 16x16 atlas used, so the top levels match it.
function downColor(cur, cs) {
  const ns = cs >> 1, out = new Uint8ClampedArray(ns * ns * 4);
  for (let y = 0; y < ns; y++) for (let x = 0; x < ns; x++) {
    const o = (y * ns + x) * 4, i0 = ((y * 2) * cs + x * 2) * 4, i1 = i0 + 4, i2 = i0 + cs * 4, i3 = i2 + 4;
    let r = 0, g = 0, b = 0, n = 0;
    const a0 = cur[i0 + 3], a1 = cur[i1 + 3], a2 = cur[i2 + 3], a3 = cur[i3 + 3];
    const aSum = a0 + a1 + a2 + a3;
    if (a0 > 127) { r += cur[i0]; g += cur[i0 + 1]; b += cur[i0 + 2]; n++; }
    if (a1 > 127) { r += cur[i1]; g += cur[i1 + 1]; b += cur[i1 + 2]; n++; }
    if (a2 > 127) { r += cur[i2]; g += cur[i2 + 1]; b += cur[i2 + 2]; n++; }
    if (a3 > 127) { r += cur[i3]; g += cur[i3 + 1]; b += cur[i3 + 2]; n++; }
    if (n > 0) { out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = n >= 2 ? 255 : 0; } else out[o + 3] = 0;
    if (n === 4 && aSum < 1020) out[o + 3] = aSum / 4;
  }
  return out;
}
function downLinear(cur, cs) {
  const ns = cs >> 1, out = new Uint8ClampedArray(ns * ns * 4);
  for (let y = 0; y < ns; y++) for (let x = 0; x < ns; x++) {
    const o = (y * ns + x) * 4, i0 = ((y * 2) * cs + x * 2) * 4, i1 = i0 + 4, i2 = i0 + cs * 4, i3 = i2 + 4;
    out[o] = (cur[i0] + cur[i1] + cur[i2] + cur[i3]) / 4;
    out[o + 1] = (cur[i0 + 1] + cur[i1 + 1] + cur[i2 + 1] + cur[i3 + 1]) / 4;
    out[o + 2] = (cur[i0 + 2] + cur[i1 + 2] + cur[i2 + 2] + cur[i3 + 2]) / 4;
    out[o + 3] = (cur[i0 + 3] + cur[i1 + 3] + cur[i2 + 3] + cur[i3 + 3]) / 4;
  }
  return out;
}
function downNormal(cur, cs) {
  const ns = cs >> 1, out = new Uint8ClampedArray(ns * ns * 4);
  for (let y = 0; y < ns; y++) for (let x = 0; x < ns; x++) {
    const o = (y * ns + x) * 4, i0 = ((y * 2) * cs + x * 2) * 4, i1 = i0 + 4, i2 = i0 + cs * 4, i3 = i2 + 4;
    const nx = (cur[i0] + cur[i1] + cur[i2] + cur[i3]) / 4 - 127.5;
    const ny = (cur[i0 + 1] + cur[i1 + 1] + cur[i2 + 1] + cur[i3 + 1]) / 4 - 127.5;
    const nzc = (cur[i0 + 2] + cur[i1 + 2] + cur[i2 + 2] + cur[i3 + 2]) / 4 - 127.5;
    const l = Math.sqrt(nx * nx + ny * ny + nzc * nzc) || 1;
    out[o] = 127.5 + 127.5 * nx / l; out[o + 1] = 127.5 + 127.5 * ny / l; out[o + 2] = 127.5 + 127.5 * nzc / l; out[o + 3] = 255;
  }
  return out;
}
// Per-tile mip chain (64 -> 32 -> ... -> 1). mode: 'color' | 'normal' | 'linear'.
export function buildMipChain(rgba, mode = 'linear') {
  const down = mode === 'color' ? downColor : mode === 'normal' ? downNormal : downLinear;
  const levels = [{ data: rgba, size: S }];
  let cur = rgba, cs = S;
  while (cs > 1) { cur = down(cur, cs); cs >>= 1; levels.push({ data: cur, size: cs }); }
  return levels;
}

// Everything the atlas needs for one tile: refined colour, normal, material and their mip chains.
export function buildTileMaps(base, name, opts = null) {
  const M = classify(name);
  const { color, height, material } = refineTile(base, name, null, { plain: !!(opts && opts.plain), material: M });
  const normal = normalFromHeight(height, M.relief);
  return {
    color: color.data, normal, material, height, cls: M.cls,
    mips: { color: buildMipChain(color.data, 'color'), normal: buildMipChain(normal, 'normal'), material: buildMipChain(material, 'linear') },
  };
}

// Mean colour error of every opaque 4x4 block against its base texel (test helper): { mean, max } in 0..255.
export function blockMeanError(base, color) {
  const d = base.data, o = color.data || color;
  let sum = 0, max = 0, count = 0;
  for (let by = 0; by < B; by++) for (let bx = 0; bx < B; bx++) {
    const bi = (by * B + bx) * 4;
    if (d[bi + 3] < 128) continue;
    let r = 0, g = 0, b = 0;
    for (let fy = 0; fy < K; fy++) for (let fx = 0; fx < K; fx++) {
      const i = ((by * K + fy) * S + bx * K + fx) * 4;
      r += o[i]; g += o[i + 1]; b += o[i + 2];
    }
    const e = (Math.abs(r / 16 - d[bi]) + Math.abs(g / 16 - d[bi + 1]) + Math.abs(b / 16 - d[bi + 2])) / 3;
    sum += e; max = Math.max(max, e); count++;
  }
  return { mean: count ? sum / count : 0, max };
}

export const HD = { BASE_PX: B, TILE_PX: S, SCALE: K };
