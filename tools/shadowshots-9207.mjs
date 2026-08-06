// Close-up evidence that the site's ground surfaces receive the sun's shadow
// and its structures cast one. Low sun, so the shadows are long enough to read.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve(process.env.OUT || '/tmp/shshots');
const BASE = process.env.BASE || 'http://127.0.0.1:8307';
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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const problems = [];
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
page.on('console', (m) => m.type() === 'error' && problems.push(`[error] ${m.text()}`));

await page.goto(`${BASE}/?test=1&seed=20260805&quality=high`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__READY === true', null, { timeout: 240000 });
await page.evaluate(() => {
  const G = window.__GAME;
  G.action('deploy');
  G.runFor(1.0);
  G.hideHud(true);
});

const shots = [
  // [name, tod, eye x, eye y, eye z, look x, look y, look z]
  ['revetment_ironwood_day', 'day', 6, 1.7, -78, 4, 1.0, -96],
  ['revetment_ironwood_sunset', 'sunset', 6, 1.7, -78, 4, 1.0, -96],
  ['revetment_longview_sunset', 'sunset', 34, 1.7, 40, 20, 1.0, 62],
  ['apron_cable_run_sunset', 'sunset', 6, 1.7, 14, -4, 0.4, -8],
  ['shelter_signage_sunset', 'sunset', 44, 1.7, 52, 28, 1.6, 57],
  // Raised and angled, so the walls' shadows lie across the apron in view.
  ['revetment_ironwood_shadows_day', 'day', 46, 26, -56, 4, 0, -96],
  ['revetment_longview_shadows_day', 'day', 58, 26, 24, 20, 0, 66],
  ['shelter_shadows_day', 'day', 62, 22, 30, 28, 0, 58],
];

for (const [name, tod, ex, ey, ez, tx, ty, tz] of shots) {
  await page.evaluate(
    ([t, a, b, c, d, e, f]) => {
      const G = window.__GAME;
      G.action(`tod:${t}`);
      G.runFor(0.6);
      G.teleport(a, b, c);
      G.lookAt(d, e, f);
      G.runFor(0.3);
      G.render(4);
    },
    [tod, ex, ey, ez, tx, ty, tz]
  );
  await page.screenshot({ path: path.join(OUT, `${name}.png`), timeout: 180000 });
  console.log('  shot', name);
}

console.log('problems', problems.length, problems.slice(0, 5).join('\n'));
await browser.close();
process.exit(0);
