// Probe: screenshot suite + perf for the base-environment specialist pass.
// Usage: node tools/probe_base_env.mjs [outdir]   (server on :4174)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.PROBE_URL ?? 'http://localhost:4174';
const OUT = process.argv[2] ?? 'shots_base_env';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR', m.text()); });
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 30_000 });
await page.evaluate(() => { window.__game.testMode(); window.__game.pause(true); });

const step = (frames, dt = 33.34) => page.evaluate(([f, d]) => window.__game.step(f, d), [frames, dt]);
const perf = () => page.evaluate(() => window.__game.perf());
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const p = await perf();
  console.log(`${name}: calls=${p.calls} tris=${p.triangles} progs=${p.programs}`);
};
const view = async (px, py, pz, lx, ly, lz) => {
  await page.evaluate(([a, b, c, d, e, f]) => {
    window.__game.teleport(a, b, c, 0, 0);
    window.__game.lookAt(d, e, f);
  }, [px, py, pz, lx, ly, lz]);
  await step(6);
};
const tod = async (t) => {
  await page.evaluate((x) => window.__game.setTimeOfDay(x), t);
  await step(80); // let the 2.2 s blend complete
};

// ---------- DAY ----------
await tod('day');
await view(66, 0, 76, -20, 6, -20);
await shot('01_overview_day');

await view(-16, 0, 2, -32, 3, -18);
await shot('02_shelter_radar_day');

await view(20, 0, -6, 36, 4, -28);
await shot('03_radar_closeup_day');

await view(0, 0, 40, 0, 10, -60); // toward mountains north
await shot('04_mountains_north_day');

await view(0, 0, -40, 30, 60, 300); // south horizon wide
await shot('05_mountains_south_day');

await view(10, 0, 20, -30, 3, 30);
await shot('06_apron_west_day');

// console interior
await page.evaluate(() => window.__game.openConsole());
await step(10);
await shot('07_console_interior_day');
await page.evaluate(() => window.__game.closeConsole());
await step(4);

// ---------- SUNSET ----------
await tod('sunset');
await view(66, 0, 76, -20, 6, -20);
await shot('08_overview_sunset');
await view(0, 0, 40, 0, 12, -300);
await shot('09_mountains_sunset');

// ---------- NIGHT ----------
await tod('night');
await view(-16, 0, 2, -32, 3, -18);
await shot('10_shelter_radar_night');
await view(66, 0, 76, -20, 6, -20);
await shot('11_overview_night');
await page.evaluate(() => window.__game.openConsole());
await step(10);
await shot('12_console_interior_night');
await page.evaluate(() => window.__game.closeConsole());
await step(4);

const s = await page.evaluate(() => window.__game.state());
console.log('state ok, timeOfDay:', s.timeOfDay);
await browser.close();
