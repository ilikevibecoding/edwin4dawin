#!/usr/bin/env node
import { chromium } from 'playwright';

// ---------------------------------------------------------------------------
// Checks the Rust noise kernel against the JavaScript it was ported from, and
// times both.
//
//   node tools/wasmcheck.mjs --url http://127.0.0.1:5185
//
// The point of the equality half is that this port is not allowed to be
// "close". Every texture in the project and the whole terrain height field come
// out of fbm, so an implementation that differed in the last bit would quietly
// rebuild the world and invalidate every frame the art direction was tuned
// against. The app runs a smaller version of this check at boot and refuses the
// wasm if it fails; this is the thorough one.
//
// The timing half is measured in a real browser rather than in node, because
// what matters is V8's JIT against V8's wasm engine on the same machine.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const url = arg('url', 'http://127.0.0.1:5185/?quality=fast');
const samples = Number(arg('samples', '300000'));

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
page.on('pageerror', (e) => console.log('[wasmcheck] page error:', e.message));

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 600000 });

const r = await page.evaluate(async (n) => {
  const core = await import('/src/textures/core.js').catch(() => null);
  if (!core) return { err: 'could not import core.js — run against the dev server, not a build' };
  await core.initNoise();
  if (core.noiseBackend() !== 'wasm') return { err: `backend is ${core.noiseBackend()}, wasm did not install` };

  // Regenerate the same inputs for both so the comparison is exact.
  const inputs = [];
  const rnd = core.mulberry32(0x5eed);
  for (let i = 0; i < n; i++) {
    inputs.push([
      (rnd() - 0.5) * 6000,
      (rnd() - 0.5) * 6000,
      1 + ((rnd() * 6) | 0),
      1 + ((rnd() * 200) | 0),
      (rnd() * 1e6) | 0,
      0.25 + rnd() * 0.5,
      1.4 + rnd() * 1.4,
    ]);
  }

  let mismatches = 0;
  let firstBad = null;
  for (const [x, y, o, p, s, g, l] of inputs) {
    const a = core.fbm(x, y, { octaves: o, period: p, seed: s, gain: g, lacunarity: l });
    const b = core.fbmJS(x, y, o, p, s, g, l);
    if (a !== b) {
      mismatches++;
      if (!firstBad) firstBad = { x, y, o, p, s, g, l, wasm: a, js: b };
    }
  }

  // Time them. Alternate the order across repeats so neither gets all the warm
  // cache, and take the best of each — a median would fold in the scheduler.
  const timeIt = (fn) => {
    let best = Infinity;
    for (let rep = 0; rep < 5; rep++) {
      const t0 = performance.now();
      let acc = 0;
      for (const [x, y, o, p, s, g, l] of inputs) acc += fn(x, y, o, p, s, g, l);
      const dt = performance.now() - t0;
      if (acc === 12345.6789) console.log('unreachable');
      if (dt < best) best = dt;
    }
    return best;
  };
  const js = timeIt((x, y, o, p, s, g, l) => core.fbmJS(x, y, o, p, s, g, l));
  const wasm = timeIt((x, y, o, p, s, g, l) => core.fbm(x, y, { octaves: o, period: p, seed: s, gain: g, lacunarity: l }));

  return { n, mismatches, firstBad, js, wasm };
}, samples);

if (r.err) {
  console.error('[wasmcheck]', r.err);
  await browser.close();
  process.exit(1);
}

console.log(`[wasmcheck] ${r.n} samples`);
console.log(`  bit-exact mismatches : ${r.mismatches}`);
if (r.firstBad) console.log('  first mismatch       :', JSON.stringify(r.firstBad));
console.log(`  javascript           : ${r.js.toFixed(1)} ms`);
console.log(`  rust / wasm          : ${r.wasm.toFixed(1)} ms`);
console.log(`  speedup              : ${(r.js / r.wasm).toFixed(2)}x`);

await browser.close();
process.exit(r.mismatches === 0 ? 0 : 1);
