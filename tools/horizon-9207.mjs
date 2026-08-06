// Verification sweep for the environment pass: pad-centre skyline on several
// bearings, a raised overview, the three emplacements, and the scene
// draw-call / triangle budget.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : d;
};
const OUT = path.resolve(arg('out', '/tmp/hz'));
const BASE = arg('base', 'http://127.0.0.1:8207');
const W = Number(arg('w', 1280));
const H = Number(arg('h', 720));

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
const problems = [];
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`[error] ${m.text()}`);
});

await page.goto(`${BASE}/?test=1&seed=20260805&quality=high`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__READY === true', null, { timeout: 240000 });
console.log('ready');

await page.evaluate(() => {
  const G = window.__GAME;
  G.action('deploy');
  G.action('tod:day');
  G.runFor(1.0);
  G.hideHud(true);
});

const shot = async (name, frames = 2) => {
  await page.evaluate((f) => window.__GAME.render(f), frames);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), timeout: 180000 });
  console.log('  shot', name);
};

for (const b of [0, 45, 90, 135, 180, 225, 270, 315]) {
  await page.evaluate((deg) => {
    const G = window.__GAME;
    G.teleport(0, undefined, 0);
    const a = (deg * Math.PI) / 180;
    G.lookAt(Math.cos(a) * 4000, G.game.camera.position.y, Math.sin(a) * 4000);
    G.runFor(0.2);
  }, b);
  await shot(`pad_b${String(b).padStart(3, '0')}`);
}

await page.evaluate(() => {
  const G = window.__GAME;
  G.teleport(0, 150, 300);
  G.lookAt(0, 0, -260);
  G.runFor(0.2);
});
await shot('overview_high');

const emplacements = [
  ['emp_hawkeye', 0, 0, -64, 3.2, 3],
  ['emp_longview', 20, -4, 66, 3.6, -11],
  ['emp_ironwood', 4, -50, 4, 4.5, -96],
];
for (const [name, px, pz, tx, ty, tz] of emplacements) {
  await page.evaluate(
    ([a, b, c, d, e]) => {
      const G = window.__GAME;
      G.teleport(a, undefined, b);
      G.lookAt(c, d, e);
      G.runFor(0.2);
    },
    [px, pz, tx, ty, tz]
  );
  await shot(name);
}

const perf = await page.evaluate(() => {
  const G = window.__GAME;
  const res = {};
  G.teleport(0, undefined, 0);
  G.lookAt(0, 8, -400);
  res.padCentre = G.measure(10);
  G.teleport(126, undefined, 116);
  G.lookAt(-30, 26, -70);
  res.siteOverview = G.measure(10);
  G.teleport(0, 150, 300);
  G.lookAt(0, 0, -260);
  res.raised = G.measure(10);
  return res;
});
for (const [k, v] of Object.entries(perf)) {
  console.log(`perf ${k}: draws=${v.drawCalls} tris=${v.triangles} median=${v.medianMs.toFixed(1)}ms`);
}

const horizon = await page.evaluate(() => {
  const G = window.__GAME;
  const th = G.game.collision.terrain;
  const eye = 1.7;
  const out = [];
  for (let deg = 0; deg < 360; deg += 15) {
    const a = (deg * Math.PI) / 180;
    let best = -90;
    let bestR = 0;
    let bestH = 0;
    for (let r = 195; r < 3000; r += 5) {
      const h = th(Math.cos(a) * r, Math.sin(a) * r);
      const ang = (Math.atan2(h - eye, r) * 180) / Math.PI;
      if (ang > best) {
        best = ang;
        bestR = r;
        bestH = h;
      }
    }
    out.push({ deg, ang: Number(best.toFixed(2)), r: bestR, h: Number(bestH.toFixed(1)) });
  }
  return out;
});
const worst = horizon.reduce((a, b) => (b.ang > a.ang ? b : a));
console.log('near-field skyline worst (within 3 km):', JSON.stringify(worst));
console.log(horizon.map((h) => `${h.deg}:${h.ang}`).join('  '));

// Shadow flags live in tools/shadowaudit-9207.mjs: classifying meshes needs
// per-copy bounds and world orientation, which is more than belongs here.

await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify({ perf, horizon, problems }, null, 2));
console.log('problems', problems.length, problems.slice(0, 8).join('\n'));
await browser.close();
process.exit(0);
