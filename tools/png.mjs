/**
 * Minimal PNG reader (8-bit RGB/RGBA, non-interlaced) so the shot harness can
 * measure exposure from the file it actually saved, instead of reading back a
 * WebGL canvas (which is blank without preserveDrawingBuffer).
 */
import zlib from 'node:zlib';
import fs from 'node:fs';

export function decodePNG(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png');
  let off = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error('interlaced png unsupported');
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`unsupported png (depth ${bitDepth}, colorType ${colorType})`);
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);

  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prior = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prior ? prior[i] : 0;
      const c = prior && i >= channels ? prior[i - channels] : 0;
      const x = line[i];
      let v;
      switch (filter) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error('bad filter ' + filter);
      }
      cur[i] = v & 0xff;
    }
  }
  return { width, height, channels, data: out };
}

/** Exposure / palette summary used for rubric item 4 and 6. */
export function analyse(file) {
  const { width, height, channels, data } = decodePNG(file);
  const n = width * height;
  let blown = 0, crushed = 0, sum = 0, satSum = 0;
  const hueBins = new Array(12).fill(0);
  const lumaHist = new Array(16).fill(0);
  for (let i = 0; i < n; i++) {
    const r = data[i * channels], g = data[i * channels + 1], b = data[i * channels + 2];
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += l;
    lumaHist[Math.min(15, Math.floor((l / 256) * 16))]++;
    if (r >= 252 && g >= 252 && b >= 252) blown++;
    if (l <= 2) crushed++;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const d = mx - mn;
    satSum += mx === 0 ? 0 : d / mx;
    if (d > 18 && l > 12) {
      let h;
      if (mx === r) h = ((g - b) / d + 6) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      hueBins[Math.floor((h / 6) * 12) % 12]++;
    }
  }
  return {
    meanLuma: +(sum / n).toFixed(1),
    meanSat: +(satSum / n).toFixed(3),
    blownPct: +((blown / n) * 100).toFixed(3),
    crushedPct: +((crushed / n) * 100).toFixed(3),
    lumaHist: lumaHist.map((v) => +((v / n) * 100).toFixed(1)),
    hueBins: hueBins.map((v) => +((v / n) * 100).toFixed(1)),
  };
}
