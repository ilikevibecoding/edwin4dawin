/**
 * Minimal RIFF/WAVE reader and writer.
 *
 * Everything in the audio pipeline works in Float32 at `SR`; this module is the
 * only place that knows about 16-bit PCM on disk.
 */

import fs from 'node:fs';
import path from 'node:path';

export const SR = 48000;

/** Peak-safe float -> int16 with triangular dither (kills quantisation buzz on quiet tails). */
function floatToInt16(v, dither) {
  let s = v;
  if (dither) s += (Math.random() + Math.random() - 1) * (1 / 65536);
  s = Math.max(-1, Math.min(1, s));
  return s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
}

/**
 * @param {string} file
 * @param {Float32Array[]} channels one entry per channel, all the same length
 * @param {{ sampleRate?: number, dither?: boolean }} [opts]
 */
export function writeWav(file, channels, opts = {}) {
  const sampleRate = opts.sampleRate ?? SR;
  const dither = opts.dither ?? true;
  const nch = channels.length;
  const frames = channels[0].length;
  const bytes = frames * nch * 2;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + bytes, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(nch, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * nch * 2, 28);
  header.writeUInt16LE(nch * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(bytes, 40);

  const body = Buffer.alloc(bytes);
  let o = 0;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < nch; c++) {
      body.writeInt16LE(floatToInt16(channels[c][i], dither), o);
      o += 2;
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([header, body]));
  return { file, frames, sampleRate, channels: nch, duration: frames / sampleRate };
}

/** Reads 16/24/32-bit int or 32-bit float PCM WAVE. Returns Float32 channels. */
export function readWav(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`not a RIFF/WAVE file: ${file}`);
  }
  let pos = 12;
  let fmt = null;
  let data = null;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === 'fmt ') {
      fmt = {
        format: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bits: buf.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      data = buf.subarray(body, Math.min(body + size, buf.length));
    }
    pos = body + size + (size % 2);
  }
  if (!fmt || !data) throw new Error(`malformed wav: ${file}`);

  const bytesPer = fmt.bits / 8;
  const frames = Math.floor(data.length / (bytesPer * fmt.channels));
  const out = [];
  for (let c = 0; c < fmt.channels; c++) out.push(new Float32Array(frames));

  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < fmt.channels; c++) {
      const o = (i * fmt.channels + c) * bytesPer;
      let v;
      if (fmt.format === 3 && fmt.bits === 32) v = data.readFloatLE(o);
      else if (fmt.bits === 16) v = data.readInt16LE(o) / 32768;
      else if (fmt.bits === 24) v = ((data[o] | (data[o + 1] << 8) | (data[o + 2] << 24) >> 8)) / 8388608;
      else if (fmt.bits === 32) v = data.readInt32LE(o) / 2147483648;
      else if (fmt.bits === 8) v = (data[o] - 128) / 128;
      else throw new Error(`unsupported bit depth ${fmt.bits} in ${file}`);
      out[c][i] = v;
    }
  }
  return { channels: out, sampleRate: fmt.sampleRate, frames, duration: frames / fmt.sampleRate };
}

/** Sum of all channels, scaled so a correlated stereo pair does not clip. */
export function toMono(read) {
  const { channels, frames } = read;
  if (channels.length === 1) return channels[0];
  const m = new Float32Array(frames);
  for (const ch of channels) for (let i = 0; i < frames; i++) m[i] += ch[i];
  const g = 1 / channels.length;
  for (let i = 0; i < frames; i++) m[i] *= g;
  return m;
}
