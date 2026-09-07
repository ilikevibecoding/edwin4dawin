#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import zlib from 'node:zlib';

// Writes the mainline's gravel tile out as PNGs, plus a magnified crop at the
// scale the low framings actually see it. Guessing which term produced a
// pattern from a 20 s software render of a road at a grazing angle is how two
// rounds got spent on a cobbling artefact that is visible in the tile itself.
//
//   node tools/gravdump.mjs [--out shots/tex] [--crop 128]

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const outDir = arg('out', 'shots/tex');
const crop = Number(arg('crop', '128'));

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return crc ^ 0xffffffff;
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

await mkdir(outDir, { recursive: true });
const g = await import('../src/textures/ground.js');

const write = async (name, w, h, rgba) => {
  await writeFile(`${outDir}/${name}.png`, png(w, h, rgba));
  console.log(`${outDir}/${name}.png  ${w}x${h}`);
};

/** Whole tile, or the alpha channel on its own. */
const dump = async (name, tex, alphaOnly = false) => {
  const { data, width, height } = tex.image;
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (alphaOnly) out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = data[i * 4 + 3];
    else for (let c = 0; c < 3; c++) out[i * 4 + c] = data[i * 4 + c];
    out[i * 4 + 3] = 255;
  }
  await write(name, width, height, out);
};

/**
 * A `crop`-texel square blown up to 512, nearest-neighbour. The low framings
 * put about 3 mm of ground under a pixel, which is a little under one texel, so
 * this is very close to what the bottom of one of those frames is showing.
 */
const zoom = async (name, tex) => {
  const { data, width } = tex.image;
  const out = new Uint8Array(512 * 512 * 4);
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const sx = Math.floor((x / 512) * crop);
      const sy = Math.floor((y / 512) * crop);
      const s = (sy * width + sx) * 4;
      const d = (y * 512 + x) * 4;
      for (let c = 0; c < 3; c++) out[d + c] = data[s + c];
      out[d + 3] = 255;
    }
  }
  await write(name, 512, 512, out);
};

const gravel = g.gravelMaps();
await dump('grav_albedo', gravel.map);
await dump('grav_normal', gravel.normal);
await dump('grav_ao', gravel.normal, true);
await zoom('grav_zoom', gravel.map);
await zoom('grav_zoom_n', gravel.normal);

// Size distribution of the coarse fraction, as a check that the aggregate is
// actually graded rather than one size with gaps in it. A pit-run surface
// course has far more small pieces than large ones; a honeycomb of one size is
// what reads as cobbles however well it is coloured.
const { height: hf } = gravel;
const N = Math.round(Math.sqrt(hf.length));
let lo = 1;
let hi = 0;
let sum = 0;
for (let i = 0; i < hf.length; i++) {
  lo = Math.min(lo, hf[i]);
  hi = Math.max(hi, hf[i]);
  sum += hf[i];
}
console.log(`height field ${N}x${N}  min ${lo.toFixed(3)}  max ${hi.toFixed(3)}  mean ${(sum / hf.length).toFixed(3)}`);
console.log(`gravel tile mean linear luminance ${gravel.mean.toFixed(4)}`);

// Red over blue of the tile as authored, which is the only number in the chain
// that is not being pushed around by the key light and the tone curve.
const { data, width, height } = gravel.map.image;
let r = 0;
let b = 0;
for (let i = 0; i < width * height; i++) {
  r += data[i * 4];
  b += data[i * 4 + 2];
}
console.log(`tile sRGB mean r ${(r / (width * height)).toFixed(1)}  b ${(b / (width * height)).toFixed(1)}  r:b ${(r / b).toFixed(3)}`);
