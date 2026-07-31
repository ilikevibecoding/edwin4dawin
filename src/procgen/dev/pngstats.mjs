#!/usr/bin/env node
/**
 * Offline measurement of captured frames.
 *
 * The capture harnesses answer "does it still run"; this answers "did the look
 * actually change, and by how much". It decodes the PNGs a harness already
 * wrote, so a baseline can be re-measured with new metrics long after the run
 * that produced it, and so before/after comparisons cost no render time on a
 * box where a frame takes a second.
 *
 * Regions are given in fractions of the frame so shots captured at different
 * resolutions stay comparable.
 *
 * Beyond mean luminance it reports the quantities that separate a flat surface
 * from a AAA one: `macroStd` is the spread of block means, i.e. low-frequency
 * mottle with tile-scale detail averaged away, and `warmCoolStd` is the spread
 * of per-block red-minus-blue, i.e. how far a surface drifts warm and cool
 * across its area rather than sitting on one grey.
 *
 * Usage:
 *   node src/procgen/dev/pngstats.mjs shots/qa2/07_combat.png \
 *     --rect wall=0.1,0.3,0.3,0.3 --rect floor=0.3,0.7,0.4,0.25
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];
  let palette = null;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'PLTE') {
      palette = Buffer.from(data);
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  if (interlace !== 0) throw new Error('interlaced PNG unsupported');
  if (depth !== 8) throw new Error(`bit depth ${depth} unsupported`);

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`color type ${colorType} unsupported`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.allocUnsafe(height * stride);

  // Reverse the per-scanline filters (PNG spec 9.2); `prev` is the already
  // reconstructed line above, which filters 2..4 predict from.
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const line = out.subarray(y * stride, (y + 1) * stride);
    src.copy(line);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      switch (filter) {
        case 1:
          line[i] = (line[i] + a) & 0xff;
          break;
        case 2:
          line[i] = (line[i] + b) & 0xff;
          break;
        case 3:
          line[i] = (line[i] + ((a + b) >> 1)) & 0xff;
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
          break;
        }
        default:
          break;
      }
    }
    prev = line;
  }

  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0, n = width * height; i < n; i++) {
    if (colorType === 3) {
      const p = out[i] * 3;
      rgb[i * 3] = palette[p];
      rgb[i * 3 + 1] = palette[p + 1];
      rgb[i * 3 + 2] = palette[p + 2];
    } else if (colorType === 0 || colorType === 4) {
      const v = out[i * channels];
      rgb[i * 3] = v;
      rgb[i * 3 + 1] = v;
      rgb[i * 3 + 2] = v;
    } else {
      rgb[i * 3] = out[i * channels];
      rgb[i * 3 + 1] = out[i * channels + 1];
      rgb[i * 3 + 2] = out[i * channels + 2];
    }
  }
  return { width, height, rgb };
}

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const BLOCKS = 12;

function measure(img, rect) {
  const x0 = Math.max(0, Math.round(rect[0] * img.width));
  const y0 = Math.max(0, Math.round(rect[1] * img.height));
  const w = Math.min(img.width - x0, Math.round(rect[2] * img.width));
  const h = Math.min(img.height - y0, Math.round(rect[3] * img.height));
  if (w <= 0 || h <= 0) throw new Error(`empty rect ${rect}`);

  const hist = new Uint32Array(256);
  let sr = 0;
  let sg = 0;
  let sb = 0;
  let sl = 0;
  let sl2 = 0;
  let ss = 0;
  let n = 0;
  const bl = new Float64Array(BLOCKS * BLOCKS);
  const bwc = new Float64Array(BLOCKS * BLOCKS);
  const bn = new Float64Array(BLOCKS * BLOCKS);

  for (let y = y0; y < y0 + h; y++) {
    const by = Math.min(BLOCKS - 1, Math.floor(((y - y0) * BLOCKS) / h));
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * img.width + x) * 3;
      const r = img.rgb[i];
      const g = img.rgb[i + 1];
      const b = img.rgb[i + 2];
      const l = luma(r, g, b);
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      sr += r;
      sg += g;
      sb += b;
      sl += l;
      sl2 += l * l;
      ss += mx > 0 ? (mx - mn) / mx : 0;
      hist[Math.min(255, Math.round(l))]++;
      n++;
      const c = by * BLOCKS + Math.min(BLOCKS - 1, Math.floor(((x - x0) * BLOCKS) / w));
      bl[c] += l;
      bwc[c] += r - b;
      bn[c]++;
    }
  }

  const std = (sum, sum2, count) =>
    Math.sqrt(Math.max(0, sum2 / count - (sum / count) ** 2));
  let ml = 0;
  let ml2 = 0;
  let mw = 0;
  let mw2 = 0;
  let blocks = 0;
  for (let c = 0; c < bn.length; c++) {
    if (bn[c] < 4) continue;
    const l = bl[c] / bn[c];
    const wc = bwc[c] / bn[c];
    ml += l;
    ml2 += l * l;
    mw += wc;
    mw2 += wc * wc;
    blocks++;
  }
  const pct = (p) => {
    let want = p * n;
    for (let i = 0; i < 256; i++) {
      want -= hist[i];
      if (want <= 0) return i;
    }
    return 255;
  };
  const f = (v) => +v.toFixed(2);
  return {
    px: n,
    rgb: [f(sr / n), f(sg / n), f(sb / n)],
    luma: f(sl / n),
    sat: +(ss / n).toFixed(4),
    warmCool: f(sr / n - sb / n),
    detailStd: f(std(sl, sl2, n)),
    macroStd: f(std(ml, ml2, blocks)),
    warmCoolStd: f(std(mw, mw2, blocks)),
    p01: pct(0.01),
    p05: pct(0.05),
    p50: pct(0.5),
    p95: pct(0.95),
    p99: pct(0.99),
    over250: +((hist.subarray(250).reduce((a, b) => a + b, 0) / n) * 100).toFixed(3),
  };
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const files = process.argv.slice(2).filter((a) => a.endsWith('.png'));
const rects = { full: [0, 0, 1, 1] };
process.argv.forEach((a, i) => {
  if (a !== '--rect') return;
  const [name, spec] = process.argv[i + 1].split('=');
  rects[name] = spec.split(',').map(Number);
});

const out = {};
for (const file of files) {
  const img = decodePng(readFileSync(file));
  const per = {};
  for (const [name, rect] of Object.entries(rects)) per[name] = measure(img, rect);
  out[file] = { width: img.width, height: img.height, regions: per };
  const label = file.split('/').slice(-2).join('/');
  for (const [name, m] of Object.entries(per)) {
    console.log(
      `${label.padEnd(30)} ${name.padEnd(10)} luma=${String(m.luma).padStart(6)} ` +
        `sat=${String(m.sat).padStart(6)} r-b=${String(m.warmCool).padStart(7)} ` +
        `macroStd=${String(m.macroStd).padStart(5)} wcStd=${String(m.warmCoolStd).padStart(5)} ` +
        `p05=${String(m.p05).padStart(3)} p50=${String(m.p50).padStart(3)} ` +
        `p95=${String(m.p95).padStart(3)} >250=${m.over250}%`,
    );
  }
}
const json = arg('json', '');
if (json) writeFileSync(json, JSON.stringify(out, null, 1));
