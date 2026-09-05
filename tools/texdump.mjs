#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import zlib from 'node:zlib';

// Writes the generated ground textures out as PNGs so they can be looked at
// directly. Far faster than guessing which noise term produced a pattern from
// a 30 s software render.
//
//   node tools/texdump.mjs [--out shots/tex]

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const outDir = arg('out', 'shots/tex');

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
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
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

let table = null;
function crc32(buf) {
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

await mkdir(outDir, { recursive: true });
const g = await import('../src/textures/ground.js');

const dump = async (name, tex, { alphaOnly = false } = {}) => {
  const { data, width, height } = tex.image;
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (alphaOnly) {
      out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = data[i * 4 + 3];
      out[i * 4 + 3] = 255;
    } else {
      out[i * 4] = data[i * 4];
      out[i * 4 + 1] = data[i * 4 + 1];
      out[i * 4 + 2] = data[i * 4 + 2];
      out[i * 4 + 3] = 255;
    }
  }
  await writeFile(`${outDir}/${name}.png`, png(width, height, out));
  console.log(`${outDir}/${name}.png  ${width}x${height}`);
};

const track = g.trackMaps();
const verge = g.vergeMaps();
const litter = g.litterMaps();
const tread = g.treadImprint();
await dump('track_albedo', track.map);
await dump('track_rough', track.map, { alphaOnly: true });
await dump('track_normal', track.normal);
await dump('track_ao', track.normal, { alphaOnly: true });
await dump('verge_albedo', verge.map);
await dump('litter_albedo', litter.map);
await dump('tread_normal', tread.normal);
await dump('tread_ao', tread.normal, { alphaOnly: true });
await dump('dust_rgb', g.dustPuff());
await dump('dust_alpha', g.dustPuff(), { alphaOnly: true });
await dump('macro', g.macroVariation());
await dump('detail_normal', g.detailNormal());
console.log('track mean linear luminance', track.mean.toFixed(4), ' litter', litter.mean.toFixed(4));

const relief = g.reliefMaps();
await dump('relief_height', relief.height);
await dump('relief_cavity', relief.height, { alphaOnly: false });
await dump('relief_normal', relief.normal);
await dump('relief_ao', relief.normal, { alphaOnly: true });
await dump('canopy', g.canopyReflection());
