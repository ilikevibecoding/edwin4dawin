#!/usr/bin/env node
/**
 * Layer calibration probe.
 *
 * Renders every gunshot layer alone and reads the peak it contributes at the
 * stack's own summing node, which is the figure the gain staging in
 * `src/audio/live/Shot.ts` is built on. Guessing it from the envelope targets is
 * what produced a carbine four times louder than a pistol, and inferring it
 * from the mix output means inverting a saturator, two compressors and a
 * soft-clipper — so the bridge taps the sum directly instead.
 *
 * Prints the UNIT table to paste back into Shot.ts. A development aid; the
 * assertions live in tools/audio-test.mjs.
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const URL_ = arg('url', 'http://127.0.0.1:5173/');

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-dev-shm-usage',
    '--autoplay-policy=no-user-gesture-required',
    '--window-size=640,360',
  ],
  protocolTimeout: 1800000,
  defaultViewport: { width: 640, height: 360 },
});
const page = await browser.newPage();
page.setDefaultTimeout(1800000);
page.on('pageerror', (e) => console.log(' pageerror', e.message));

const u = new global.URL(URL_);
u.searchParams.set('capture', '1');
u.searchParams.set('quality', 'high');
await page.goto(u.href, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 240000, polling: 250 });
await page.waitForFunction(() => !!window.__AUDIO__, { timeout: 60000, polling: 100 });
await page.evaluate(() => window.__GAME__?.engine?.tryGet?.('audio')?.resume?.()).catch(() => {});
await page.evaluate(() => window.__AUDIO__.bakeAll());

const GUNS = ['rifle', 'smg', 'sniper', 'shotgun', 'pistol'];
const LAYERS = ['crack', 'body', 'res', 'sub', 'mech', 'ring'];

const out = await page.evaluate(
  async (guns, layers, fp, suppressed) => {
    const A = window.__AUDIO__;
    const res = {};
    for (const g of guns) {
      const row = { layers: {} };
      const base = {
        kind: 'shot',
        id: g,
        distance: fp ? 0 : 40,
        firstPerson: fp,
        suppressed,
        zone: 'street',
        seed: 12345,
        dry: true,
        seconds: 0.5,
      };
      const full = await A.render({ ...base, tap: 'sum' });
      if (!full.ok) {
        res[g] = { error: full.error };
        continue;
      }
      row.sumGain = full.layers.sumGain;
      row.stackEstimate = full.layers.stack;
      row.stackActual = +full.peak.toFixed(4);
      row.targets = full.layers;
      const mix = await A.render(base);
      row.output = mix.ok ? +mix.peak.toFixed(4) : mix.error;
      row.attackHf = mix.ok ? +(mix.attackHf * 1000).toFixed(2) : 0;
      row.centroid = mix.ok ? Math.round(mix.centroid) : 0;
      row.tilt = mix.ok ? +mix.tilt.toFixed(3) : 0;
      for (const L of layers) {
        const m = await A.render({ ...base, tap: 'sum', layer: L });
        row.layers[L] = m.ok
          ? { peak: +m.peak.toFixed(4), centroid: Math.round(m.centroid), attackHf: +(m.attackHf * 1000).toFixed(2) }
          : { error: m.error };
      }
      res[g] = row;
    }
    return res;
  },
  GUNS,
  LAYERS,
  !arg('third', false),
  !!arg('suppressed', false),
);

const units = {};
for (const L of LAYERS) units[L] = [];

for (const g of GUNS) {
  const r = out[g];
  if (!r || r.error) {
    console.log(`${g}: ${r?.error ?? 'missing'}`);
    continue;
  }
  console.log(
    `\n${g}  sumGain ${r.sumGain}  stack predicted ${r.stackEstimate} -> aimed at ` +
      `${(r.stackEstimate * r.sumGain).toFixed(3)}, measured ${r.stackActual}`,
  );
  console.log(
    `   mix output ${r.output}   centroid ${r.centroid} Hz   lo/hi ${r.tilt}   shock front ${r.attackHf} ms`,
  );
  console.log('    layer     target   at sum     unit   centroid   shock');
  let sum = 0;
  for (const L of LAYERS) {
    const v = r.layers[L];
    if (v.error) {
      console.log(`    ${L.padEnd(9)} ${v.error}`);
      continue;
    }
    sum += v.peak;
    // The breakdown reports envelope targets, so no gain table is mirrored here.
    const t = r.targets[L] ?? 0;
    const unit = t > 1e-6 ? v.peak / r.sumGain / t : 0;
    if (unit > 0) units[L].push(unit);
    console.log(
      `    ${L.padEnd(9)} ${t.toFixed(3).padStart(6)}  ${v.peak.toFixed(4).padStart(7)}  ` +
        `${unit.toFixed(4).padStart(7)}  ${String(v.centroid).padStart(7)} Hz  ${String(v.attackHf).padStart(6)} ms`,
    );
  }
  console.log(
    `    layer peaks sum to ${sum.toFixed(4)}; together they reach ${r.stackActual} ` +
      `(${((r.stackActual / Math.max(1e-6, sum)) * 100).toFixed(0)}% coherent)`,
  );
}

console.log('\nUNIT table (mean across the five weapons):');
for (const L of LAYERS) {
  const vals = units[L];
  if (!vals.length) continue;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  console.log(
    `  ${L}: ${mean.toFixed(3)},`.padEnd(22) +
      `// ${Math.min(...vals).toFixed(3)} .. ${Math.max(...vals).toFixed(3)}`,
  );
}
const outs = GUNS.map((g) => out[g]?.output).filter((v) => typeof v === 'number');
if (outs.length) {
  console.log(
    `\nmix output spread ${Math.min(...outs).toFixed(4)} .. ${Math.max(...outs).toFixed(4)} ` +
      `(${(Math.max(...outs) / Math.max(1e-6, Math.min(...outs))).toFixed(2)}x)`,
  );
}
await browser.close();
