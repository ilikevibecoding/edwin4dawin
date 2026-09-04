// FIX-AB2 luma probe: node /tmp/fab2/luma.mjs a.png ... [--region x0,y0,x1,y1 (fractions)]
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
function decodePNG(buf) {
  let off = 8, w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error("only 8-bit PNG supported");
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(w * h * ch);
  let prev = Buffer.alloc(stride), p = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[p++];
    const line = Buffer.from(raw.subarray(p, p + stride));
    p += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? line[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c; const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      line[i] = v & 255;
    }
    line.copy(out, y * stride);
    prev = line;
  }
  return { w, h, ch, data: out };
}
const args = process.argv.slice(2);
let region = null;
const files = [];
for (let i = 0; i < args.length; i++) { if (args[i] === "--region") region = args[++i].split(",").map(Number); else files.push(args[i]); }
for (const f of files) {
  const { w, h, ch, data } = decodePNG(readFileSync(f));
  const x0 = region ? Math.floor(region[0] * w) : 0, y0 = region ? Math.floor(region[1] * h) : 0;
  const x1 = region ? Math.floor(region[2] * w) : w, y1 = region ? Math.floor(region[3] * h) : h;
  const hist = new Uint32Array(256);
  let sum = 0, n = 0, hot = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * w + x) * ch;
    const r = data[i], g = ch >= 3 ? data[i + 1] : r, b = ch >= 3 ? data[i + 2] : r;
    const l = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    hist[l]++; sum += l; n++; if (l > 235) hot++;
  }
  const pct = (q) => { let acc = 0; for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= q * n) return i; } return 255; };
  const name = f.split("/").slice(-2).join("/");
  console.log(`${name.padEnd(44)} mean ${(sum / n).toFixed(1).padStart(5)}  p5 ${String(pct(0.05)).padStart(3)}  p50 ${String(pct(0.5)).padStart(3)}  p95 ${String(pct(0.95)).padStart(3)}  hot(>235) ${((100 * hot) / n).toFixed(2)}%`);
}
