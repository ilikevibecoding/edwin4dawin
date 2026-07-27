#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Dump a procedural map straight to PNG, without the scene.
//
// Every map in src/textures is a DataTexture built by pure JS, so it can be
// generated in node and looked at directly. That matters because the alternative
// — inferring what a texture contains from a 100 second render of a truck two
// metres away, through a tone map, a bloom pass and a grade — is how a visible
// cross-hatch in the paint survived thirteen iterations. If a pattern is in the
// map you can see it here in under a second.
//
//   node tools/vstex.mjs paintFlakeNormal paintPeelNormal --zoom 3 --out shots/tex
//   node tools/vstex.mjs --list
//
// --tile 2 repeats the map 2x2 so a seam or a period longer than one wrap is
// visible; --slice n crops the top-left n pixels instead, for looking at texel
// scale detail on a large map.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const outDir = arg('out', 'shots/tex');
const zoom = Number(arg('zoom', '2'));
const tile = Number(arg('tile', '1'));
const slice = Number(arg('slice', '0'));
// Skip both the flags and the values they consume, or `--out shots/tex` gets
// treated as a map called "shots/tex".
const consumed = new Set();
for (let i = 0; i < argv.length; i++) {
  if (['--out', '--zoom', '--tile', '--slice'].includes(argv[i])) consumed.add(i + 1);
}
const names = argv.filter((a, i) => !a.startsWith('--') && !consumed.has(i));

const mod = await import('../src/textures/vehicle.js');

if (argv.includes('--list') || !names.length) {
  const fns = Object.keys(mod).filter((k) => typeof mod[k] === 'function');
  console.log('exports:\n  ' + fns.join('\n  '));
  process.exit(0);
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<html><body></body></html>');

for (const name of names) {
  const fn = mod[name];
  if (typeof fn !== 'function') {
    console.error(`no export "${name}"`);
    continue;
  }
  let got;
  try {
    got = fn();
  } catch (e) {
    console.error(`${name} threw: ${e.message}`);
    continue;
  }
  // Several generators hand back a bundle — { map, normal, rough } — rather than
  // a single texture, so each member is dumped under its own name.
  const bundle = got && got.isTexture ? { [name]: got } : got || {};
  for (const [sub, tex] of Object.entries(bundle)) {
    if (!tex || !tex.isTexture) continue;
    const label = got && got.isTexture ? name : `${name}.${sub}`;
    await dump(label, tex);
  }
}

async function dump(name, tex) {
  const img = tex && tex.image;
  if (!img || !img.data) {
    console.error(`${name} is canvas-backed, not a DataTexture`);
    return;
  }
  const { width: w, height: h, data } = img;

  // Directional energy. A cross-hatch has power along both diagonals and little
  // on the axes; plain noise is isotropic. Comparing mean |difference| between
  // a texel and its four neighbours at distance k tells them apart without an
  // FFT, and doing it over a range of k finds the period.
  const lum = new Float32Array(w * h);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    lum[j] = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
  }
  const at = (x, y) => lum[(((y % h) + h) % h) * w + (((x % w) + w) % w)];
  const dirs = { horiz: [1, 0], vert: [0, 1], diagA: [1, 1], diagB: [1, -1] };
  const acf = {};
  for (const [dname, [dx, dy]] of Object.entries(dirs)) {
    const series = [];
    for (let k = 1; k <= 12; k++) {
      let s = 0;
      let n = 0;
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          s += Math.abs(at(x, y) - at(x + dx * k, y + dy * k));
          n++;
        }
      }
      series.push(+(s / n).toFixed(4));
    }
    acf[dname] = series;
  }

  const sw = slice ? Math.min(slice, w) : w * tile;
  const sh = slice ? Math.min(slice, h) : h * tile;
  const url = await page.evaluate(
    ({ data, w, h, sw, sh, zoom }) => {
      const src = document.createElement('canvas');
      src.width = w;
      src.height = h;
      const sctx = src.getContext('2d');
      const id = sctx.createImageData(w, h);
      id.data.set(new Uint8ClampedArray(data));
      sctx.putImageData(id, 0, 0);
      const c = document.createElement('canvas');
      c.width = sw * zoom;
      c.height = sh * zoom;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      for (let ty = 0; ty * h < sh; ty++) {
        for (let tx = 0; tx * w < sw; tx++) {
          ctx.drawImage(src, tx * w * zoom, ty * h * zoom, w * zoom, h * zoom);
        }
      }
      return c.toDataURL('image/png');
    },
    { data: Array.from(data), w, h, sw, sh, zoom },
  );

  const file = path.join(outDir, `${name}.png`);
  await writeFile(file, Buffer.from(url.split(',')[1], 'base64'));
  const rep = tex.repeat ? `${tex.repeat.x}x${tex.repeat.y}` : '-';
  console.log(`${name}  ${w}x${h}  repeat ${rep}  mips ${tex.generateMipmaps}  -> ${file}`);
  console.log(`  neighbour delta by lag 1..12`);
  for (const [dname, series] of Object.entries(acf)) {
    console.log(`    ${dname.padEnd(6)} ${series.join(' ')}`);
  }
}

await browser.close();
