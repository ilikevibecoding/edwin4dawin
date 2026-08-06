// Aerial-perspective parameter sweep.
//
// For a fixed camera pose the pixel -> terrain distance mapping is fixed, so it
// is ray-marched once against the terrain height field and then reused for
// every candidate parameter set. Each candidate is rendered and reported as
// mean screen luminance per distance bucket, which is exactly the depth ramp
// the haze is supposed to produce: it should rise monotonically with distance
// and land at or just under the sky.
//
// Usage: node tools/hazesweep-9207.mjs [--tod day] [--views b200,ring] [--out dir]

import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { readPng, luma } from './pngread-9207.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : d;
};
const OUT = path.resolve(arg('out', '/tmp/hazesweep'));
const BASE = arg('base', 'http://127.0.0.1:8207');
const TOD = arg('tod', 'day');
const VIEWS = arg('views', 'b200,ring').split(',');
const W = Number(arg('w', 960));
const H = Number(arg('h', 540));
const CAND_FILE = arg('candidates', null);

const DEFAULT_CANDIDATES = [
  { name: 'current', density: 6.5e-5, height: 1900, haze: 1.05, color: 0xb4c4d6 },
  { name: 'h6500', density: 6.5e-5, height: 6500, haze: 1.0, color: 0xb4c4d6 },
  { name: 'd9_h6500', density: 9.0e-5, height: 6500, haze: 1.0, color: 0xb4c4d6 },
  { name: 'd9_h9000', density: 9.0e-5, height: 9000, haze: 1.0, color: 0xb4c4d6 },
  { name: 'd12_h6500', density: 1.2e-4, height: 6500, haze: 1.0, color: 0xb4c4d6 },
  { name: 'd9_h6500_dim', density: 9.0e-5, height: 6500, haze: 1.0, color: 0xa4b4c8 },
];
const CANDIDATES = CAND_FILE ? JSON.parse(await fs.readFile(CAND_FILE, 'utf8')) : DEFAULT_CANDIDATES;

const VIEW_SETUP = {
  b200: () => {
    const G = window.__GAME;
    G.teleport(0, undefined, 0);
    const a = (200 * Math.PI) / 180;
    const eyeY = G.game.camera.position.y;
    G.lookAt(Math.cos(a) * 6000, eyeY, Math.sin(a) * 6000);
  },
  b300: () => {
    const G = window.__GAME;
    G.teleport(0, undefined, 0);
    const a = (300 * Math.PI) / 180;
    const eyeY = G.game.camera.position.y;
    G.lookAt(Math.cos(a) * 6000, eyeY, Math.sin(a) * 6000);
  },
  ring: () => {
    const G = window.__GAME;
    G.teleport(46, 22, 34);
    G.lookAt(46 + 26 * 400, 22, 34 - 22 * 400);
  },
  across: () => {
    const G = window.__GAME;
    G.teleport(46, 22, 34);
    G.lookAt(72, 2, 12);
  },
};

const BUCKETS = [1000, 2000, 4000, 6000, 8000, 10000, 13000, 16000, 20000, 25000, 46000];

await fs.mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--disable-gpu-vsync',
    '--mute-audio',
    '--js-flags=--max-old-space-size=4096',
  ],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.setDefaultTimeout(300000);
const problems = [];
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`[error] ${m.text()}`);
});

await page.goto(`${BASE}/?test=1&seed=20260805&quality=high`, { waitUntil: 'load', timeout: 180000 });

/**
 * Bring the page back to a posed, deployed state.
 *
 * The dev server reloads the page whenever a source file is saved, which drops
 * the whole harness, so every step re-checks rather than assuming.
 */
let currentView = null;
async function ensure() {
  await page.waitForFunction('window.__READY === true', null, { timeout: 300000 });
  const posed = await page.evaluate(() => !!window.__probePosed);
  if (posed) return false;
  await page.evaluate((t) => {
    const G = window.__GAME;
    G.action('deploy');
    G.action(`tod:${t}`);
    G.runFor(1.0);
    G.hideHud(true);
    window.__probePosed = true;
  }, TOD);
  if (currentView) await page.evaluate(VIEW_SETUP[currentView]);
  return true;
}
await ensure();

/** Ray-march the terrain for a grid of pixels; misses are sky. */
const distanceMap = (w, h) =>
  page.evaluate(
    ({ w, h }) => {
      const G = window.__GAME;
      const cam = G.game.camera;
      const terrain = G.game.collision.terrain;
      const out = [];
      const dir = cam.position.clone();
      const p = cam.position.clone();
      for (let x = Math.round(w * 0.2); x < w * 0.8; x += 6) {
        for (let y = 0; y < h; y += 3) {
          dir
            .set((x / w) * 2 - 1, -((y / h) * 2 - 1), 0.5)
            .unproject(cam)
            .sub(cam.position)
            .normalize();
          let t = 2;
          let hit = -1;
          let prev = 2;
          while (t < 46000) {
            p.copy(cam.position).addScaledVector(dir, t);
            if (p.y <= terrain(p.x, p.z)) {
              // Bisect between the last miss and this hit.
              let lo = prev;
              let hi = t;
              for (let i = 0; i < 12; i++) {
                const mid = (lo + hi) * 0.5;
                p.copy(cam.position).addScaledVector(dir, mid);
                if (p.y <= terrain(p.x, p.z)) hi = mid;
                else lo = mid;
              }
              hit = hi;
              break;
            }
            prev = t;
            t += Math.max(3, t * 0.012);
          }
          out.push([x, y, hit]);
        }
      }
      return out;
    },
    { w, h }
  );

function report(pngPath, dmap, skyline) {
  const img = readPng(pngPath);
  const acc = BUCKETS.map(() => ({ s: 0, n: 0 }));
  const sky = { s: 0, n: 0 };
  // Sky in the 40 px immediately above the skyline: the strip the ground has
  // to stay under if the haze is not to out-shine the sky it fades into.
  const low = { s: 0, n: 0 };
  for (const [x, y, d] of dmap) {
    const i = (y * img.width + x) * img.channels;
    const l = luma([img.data[i], img.data[i + 1], img.data[i + 2]]);
    if (d < 0) {
      sky.s += l;
      sky.n++;
      if (y >= skyline - 40 && y < skyline) {
        low.s += l;
        low.n++;
      }
      continue;
    }
    let b = BUCKETS.findIndex((v) => d <= v);
    if (b < 0) b = BUCKETS.length - 1;
    acc[b].s += l;
    acc[b].n++;
  }
  return {
    buckets: acc.map((a, i) => ({ upTo: BUCKETS[i], n: a.n, lum: a.n ? Number((a.s / a.n).toFixed(1)) : null })),
    sky: sky.n ? Number((sky.s / sky.n).toFixed(1)) : null,
    skyLow: low.n ? Number((low.s / low.n).toFixed(1)) : null,
  };
}

const results = {};

for (const v of VIEWS) {
  currentView = v;
  await ensure();
  await page.evaluate(VIEW_SETUP[v]);
  await page.evaluate(() => window.__GAME.render(2));
  process.stdout.write(`\n== ${TOD} / ${v} : building distance map ... `);
  const t0 = Date.now();
  const dmap = await distanceMap(W, H);
  console.log(`${dmap.length} rays in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  // Topmost sampled ground pixel: the mountain skyline for this pose.
  const skyline = Math.min(...dmap.filter(([, , d]) => d >= 0).map(([, y]) => y));
  const head = BUCKETS.map((b) => (b >= 1000 ? `${b / 1000}k` : `${b}`).padStart(6)).join('');
  console.log(`${'candidate'.padEnd(16)}${head}${'skyLow'.padStart(8)}${'sky'.padStart(7)}`);
  const counts = BUCKETS.map(() => 0);
  for (const [, , d] of dmap) {
    if (d < 0) continue;
    let b = BUCKETS.findIndex((v) => d <= v);
    if (b < 0) b = BUCKETS.length - 1;
    counts[b]++;
  }
  console.log(`${'(rays)'.padEnd(16)}${counts.map((c) => String(c).padStart(6)).join('')}`);

  results[v] = [];
  for (const c of CANDIDATES) {
    if (await ensure()) await page.evaluate(VIEW_SETUP[v]);
    await page.evaluate((cc) => window.__GAME.setAtm(cc), c);
    await page.evaluate(() => window.__GAME.render(1, 0));
    const file = path.join(OUT, `${TOD}_${v}_${c.name}.png`);
    await page.screenshot({ path: file, timeout: 180000 });
    const r = report(file, dmap, skyline);
    results[v].push({ ...c, ...r });
    const row = r.buckets.map((b) => (b.lum === null ? '     -' : String(b.lum.toFixed(0)).padStart(6))).join('');
    console.log(`${c.name.padEnd(16)}${row}${String(r.skyLow ?? '-').padStart(8)}${String(r.sky ?? '-').padStart(7)}`);
  }
}

await fs.writeFile(path.join(OUT, `sweep_${TOD}.json`), JSON.stringify({ results, problems }, null, 2));
console.log(`\nproblems ${problems.length}`);
console.log(problems.slice(0, 6).join('\n'));
await browser.close();
process.exit(0);
