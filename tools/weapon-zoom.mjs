#!/usr/bin/env node
/**
 * Crop and magnify a capture, so model detail can be judged without paying for
 * another software-rasterised frame.
 *
 * Captures at 800x450 are cheap but far too small to see whether an edge is
 * chamfered or a sight is centred. This decodes the PNG in-process, cuts a
 * window out of it and scales it up nearest-neighbour, which keeps the pixel
 * grid honest — a blurry upscale would hide exactly the aliasing that says a
 * part is one pixel wide.
 *
 * Usage:
 *   node tools/weapon-zoom.mjs shots/weapons/wpn_ads.png --rect 340,180,120,90 --scale 6
 *   node tools/weapon-zoom.mjs shots/weapons/wpn_ads.png --centre --size 96 --scale 8
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';

const CRC = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Decodes an 8-bit RGB/RGBA/grey PNG into `{ width, height, data }` RGBA8. */
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let p = 8;
  let width = 0;
  let height = 0;
  let channels = 4;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const body = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (body[8] !== 8) throw new Error(`unsupported bit depth ${body[8]}`);
      const colour = body[9];
      channels = colour === 6 ? 4 : colour === 2 ? 3 : colour === 0 ? 1 : 0;
      if (!channels) throw new Error(`unsupported colour type ${colour}`);
      if (body[12] !== 0) throw new Error('interlaced PNG unsupported');
    } else if (type === 'IDAT') {
      idat.push(body);
    } else if (type === 'IEND') {
      break;
    }
    p += 12 + len;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8Array(width * height * 4);
  const line = new Uint8Array(stride);
  const prev = new Uint8Array(stride);
  let q = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[q++];
    for (let i = 0; i < stride; i++) {
      const x = raw[q + i];
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v;
      switch (filter) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: {
          const pa = Math.abs(b - c);
          const pb = Math.abs(a - c);
          const pc = Math.abs(a + b - 2 * c);
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`bad filter ${filter}`);
      }
      line[i] = v & 0xff;
    }
    q += stride;
    for (let x = 0; x < width; x++) {
      const s = x * channels;
      const d = (y * width + x) * 4;
      if (channels === 1) {
        out[d] = out[d + 1] = out[d + 2] = line[s];
        out[d + 3] = 255;
      } else {
        out[d] = line[s];
        out[d + 1] = line[s + 1];
        out[d + 2] = line[s + 2];
        out[d + 3] = channels === 4 ? line[s + 3] : 255;
      }
    }
    prev.set(line);
  }
  return { width, height, data: out };
}

export function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }
  const chunk = (type, body) => {
    const out = Buffer.alloc(body.length + 12);
    out.writeUInt32BE(body.length, 0);
    out.write(type, 4, 'ascii');
    body.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Nearest-neighbour magnification, optionally with a one-pixel crosshair. */
function zoom(src, rx, ry, rw, rh, scale, crosshair) {
  const w = rw * scale;
  const h = rh * scale;
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(src.height - 1, ry + Math.floor(y / scale));
    for (let x = 0; x < w; x++) {
      const sx = Math.min(src.width - 1, rx + Math.floor(x / scale));
      const s = (sy * src.width + sx) * 4;
      const d = (y * w + x) * 4;
      out[d] = src.data[s];
      out[d + 1] = src.data[s + 1];
      out[d + 2] = src.data[s + 2];
      out[d + 3] = 255;
    }
  }
  if (crosshair) {
    // Marks the exact screen centre of the *source* image, which is what an
    // ADS shot has to line the sight up with.
    const cx = (src.width / 2 - rx) * scale;
    const cy = (src.height / 2 - ry) * scale;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const onV = Math.abs(x - cx) < 1 && (y % 8 < 4);
        const onH = Math.abs(y - cy) < 1 && (x % 8 < 4);
        if (!onV && !onH) continue;
        const d = (y * w + x) * 4;
        out[d] = 255;
        out[d + 1] = 32;
        out[d + 2] = 32;
      }
    }
  }
  return { width: w, height: h, data: out };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const file = argv.find((a) => !a.startsWith('--'));
  const arg = (n, f) => {
    const i = argv.indexOf(`--${n}`);
    return i === -1 ? f : argv[i + 1];
  };
  const src = decodePng(readFileSync(file));
  const scale = Number(arg('scale', 4));
  let rect = arg('rect', null);
  if (argv.includes('--centre') || argv.includes('--center')) {
    const size = Number(arg('size', 96));
    rect = [
      Math.round(src.width / 2 - size / 2),
      Math.round(src.height / 2 - size / 2),
      size,
      size,
    ];
  } else if (rect) {
    rect = rect.split(',').map(Number);
  } else {
    rect = [0, 0, src.width, src.height];
  }
  const z = zoom(src, rect[0], rect[1], rect[2], rect[3], scale, argv.includes('--crosshair'));
  const out = arg('out', file.replace(/\.png$/, `.zoom.png`));
  writeFileSync(out, encodePng(z.width, z.height, z.data));
  console.log(`${out}  ${z.width}x${z.height}  (src ${src.width}x${src.height} rect ${rect})`);
}
