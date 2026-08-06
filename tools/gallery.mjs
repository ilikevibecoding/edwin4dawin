// Visual QA harness: drives the game to a set of labelled viewpoints and
// dumps screenshots, plus a scripted engagement sequence.
//
//   node tools/gallery.mjs <outdir> [--w 1600] [--h 900] [--only name,name]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const outDir = args[0] && !args[0].startsWith('--') ? args[0] : 'shots/gallery';
const flag = (n, d) => {
  const i = args.indexOf('--' + n);
  return i >= 0 ? args[i + 1] : d;
};
const W = Number(flag('w', 1600));
const H = Number(flag('h', 900));
const only = flag('only', null)?.split(',');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: [
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox', '--no-sandbox', '--ignore-gpu-blocklist', '--mute-audio',
  ],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const issues = [];
page.on('console', (m) => {
  if (m.type() === 'error') issues.push(`[error] ${m.text()}`);
});
page.on('pageerror', (e) => issues.push(`[pageerror] ${e.message}`));

await page.goto(`http://127.0.0.1:5173/?test=1&seed=7777`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__GAME, null, { timeout: 60000 });
await page.waitForTimeout(600);

const shot = async (name) => {
  if (only && !only.includes(name)) return;
  await page.screenshot({ path: path.join(outDir, `${name}.png`), timeout: 180000 });
  process.stdout.write(`  ${name}\n`);
};

async function view(name, { pos, look, condition, hud = true, freeze = true, sim = 0 }) {
  if (only && !only.includes(name)) return;
  await page.evaluate(([pos, look, condition, hud, freeze, sim]) => {
    const G = window.__GAME;
    if (condition) G.configure({ condition });
    G.freezePlayer(freeze);
    G.teleport(pos[0], pos[1], pos[2]);
    if (look) G.lookAt(look[0], look[1], look[2]);
    G.hideHud(!hud);
    if (sim) G.sim(sim);
    G.render();
  }, [pos, look, condition, hud, freeze, sim]);
  await shot(name);
}

console.log('static views:');
// --- site tour --------------------------------------------------------------
await view('01-spawn-day', { pos: [-6, null, 34], look: [-10, 30, -60], condition: 'day' });
await view('02-apron-overview', { pos: [40, 34, 70], look: [-20, 4, -40], condition: 'day' });
await view('03-shelter-exterior', { pos: [-4, null, 40], look: [-20, 4, 22], condition: 'day' });
await view('04-shelter-interior', { pos: [-20.5, 0.35, 24.5], look: [-20, 1.4, 20.5], condition: 'day' });
await view('05-radar-station', { pos: [24, null, 8], look: [32, 6, -6], condition: 'day' });
await view('06-patriot-battery', { pos: [-42, null, -18], look: [-52, 3, -30], condition: 'day' });
await view('07-thaad-battery', { pos: [14, null, -56], look: [4, 4, -70], condition: 'day' });
await view('08-sentinel-battery', { pos: [70, null, -24], look: [58, 6, -38], condition: 'day' });
await view('09-perimeter', { pos: [-100, null, 60], look: [-20, 6, -20], condition: 'day' });
await view('10-sunset-apron', { pos: [10, null, 20], look: [-40, 10, -50], condition: 'sunset' });
await view('11-night-apron', { pos: [10, null, 20], look: [-40, 10, -50], condition: 'night' });
await view('12-night-batteries', { pos: [30, 8, -20], look: [4, 5, -70], condition: 'night' });

// --- engagement sequence ----------------------------------------------------
console.log('engagement:');
async function engagement(tag, { condition, scenario, battery }) {
  if (only && !only.some((o) => o.startsWith(tag))) return;
  await page.evaluate(([condition, scenario, battery]) => {
    const G = window.__GAME;
    G.freezePlayer(true);
    G.restart();
    G.configure({ condition, scenario, battery });
    G.hideHud(false);
    G.teleport(-6, null, 34);
    G.lookAt(-10, 8000, -40000);
    G.start();
  }, [condition, scenario, battery]);

  // let tracks appear
  await page.evaluate(() => window.__GAME.sim(60 * 8));
  await page.evaluate(() => window.__GAME.render());
  await shot(`${tag}-a-tracks`);

  // let the autopilot assign, wait out the preparation time and launch
  let fired = 0;
  for (let i = 0; i < 90 && !fired; i++) {
    fired = await page.evaluate(() => {
      const G = window.__GAME;
      G.sim(12);
      G.autoPilot();
      return G.state().roundStats.launched;
    });
  }
  await page.evaluate(() => {
    const G = window.__GAME;
    const g = window.__gameInstance;
    const it = g.interceptors.active[0];
    if (it) G.lookAt(it.pos.x, it.pos.y + 60, it.pos.z);
    G.render();
  });
  await shot(`${tag}-b-launch`);

  await page.evaluate(() => window.__GAME.sim(45));
  await page.evaluate(() => window.__GAME.render());
  await shot(`${tag}-c-plume`);

  await page.evaluate(() => window.__GAME.sim(60 * 4));
  await page.evaluate(() => window.__GAME.render());
  await shot(`${tag}-d-climb`);

  // follow to intercept, keeping the camera on the target
  let state = null;
  for (let i = 0; i < 120; i++) {
    state = await page.evaluate(() => {
      const G = window.__GAME;
      const g = window.__gameInstance;
      for (let k = 0; k < 5; k++) {
        G.sim(6);
        G.autoPilot();
      }
      const s = G.state();
      const it = g.interceptors.active[0];
      if (it && it.target) G.lookAt(it.target.pos.x, it.target.pos.y, it.target.pos.z);
      return s;
    });
    if (state.results.length) break;
  }
  await page.evaluate(() => window.__GAME.render());
  await shot(`${tag}-e-intercept`);
  await page.evaluate(() => window.__GAME.sim(50));
  await page.evaluate(() => window.__GAME.render());
  await shot(`${tag}-f-aftermath`);
  console.log(`  ${tag} fired=${fired} results=${JSON.stringify(state?.results)}`);
  return state;
}

await engagement('20-day-thaad', { condition: 'day', scenario: 'single', battery: 'thaad' });
await engagement('21-sunset-patriot', { condition: 'sunset', scenario: 'single', battery: 'patriot' });
await engagement('22-night-sentinel', { condition: 'night', scenario: 'night', battery: 'sentinel' });

// --- console overlay --------------------------------------------------------
if (!only || only.includes('30-console')) {
  await page.evaluate(() => {
    const G = window.__GAME;
    G.restart();
    G.configure({ condition: 'day', scenario: 'saturation', battery: 'patriot' });
    G.teleport(-20.5, 0.35, 23.5);
    G.lookAt(-20, 1.2, 21);
    G.openConsole();
    G.start();
    G.sim(60 * 12);
    G.render();
  });
  await shot('30-console');
  await page.evaluate(() => {
    window.__GAME.closeConsole();
    window.__GAME.render();
  });
}

if (issues.length) {
  console.log('\nISSUES:');
  for (const i of [...new Set(issues)].slice(0, 30)) console.log(' ', i);
} else {
  console.log('\nno console errors');
}

const perf = await page.evaluate(() => window.__GAME.perfProbe(6));
console.log('perf(sync):', JSON.stringify(perf));

await browser.close();
