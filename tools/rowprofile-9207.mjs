// Print mean colour per screen row over the central column band, so the
// horizon region of a capture can be read as numbers.
//
// Usage: node tools/rowprofile-9207.mjs shot.png [y0] [y1] [step]

import { readPng, luma } from './pngread-9207.mjs';

const [file, y0 = 250, y1 = 400, step = 2, xa, xb] = process.argv.slice(2);
const img = readPng(file);
const x0 = xa !== undefined ? Number(xa) : Math.round(img.width * 0.25);
const x1 = xb !== undefined ? Number(xb) : Math.round(img.width * 0.75);

for (let y = Number(y0); y <= Math.min(Number(y1), img.height - 1); y += Number(step)) {
  let r = 0;
  let g = 0;
  let b = 0;
  for (let x = x0; x < x1; x++) {
    const i = (y * img.width + x) * img.channels;
    r += img.data[i];
    g += img.data[i + 1];
    b += img.data[i + 2];
  }
  const n = x1 - x0;
  const rgb = [r / n, g / n, b / n];
  const l = luma(rgb);
  const bar = '#'.repeat(Math.round(l / 4));
  console.log(
    `${String(y).padStart(4)}  ${rgb.map((v) => String(Math.round(v)).padStart(3)).join(' ')}  L=${l.toFixed(1).padStart(6)}  ${bar}`
  );
}
