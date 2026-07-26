// Fable 3 capture harness (copy of tools/capture.js pattern, tuned for prop/material review):
// 720p viewport + generous screenshot timeouts because the shared VM's SwiftShader is slow
// under load. Usage: SERVER=http://127.0.0.1:5184 node tools/capture-props.js [scenario ...]
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SERVER = process.env.SERVER || 'http://127.0.0.1:5184';
const OUT = 'artifacts/shots';
const SHOT_TIMEOUT = 150000;
fs.mkdirSync(OUT, { recursive: true });

function makeHelpers(page, scenarioName, report) {
  const helpers = {
    page,
    async qa(method, ...args) {
      return page.evaluate(([m, a]) => window.__qa[m](...a), [method, args]);
    },
    async adv(ms) {
      return page.evaluate((v) => window.advanceTime(v), ms);
    },
    async shot(name) {
      // Read the WebGL canvas in-page instead of page.screenshot(): the compositor
      // screenshot path starves for minutes when other SwiftShader captures share the VM,
      // while a forced render + toDataURL completes in seconds. (No DOM HUD in the image,
      // which is fine for prop/material review.)
      const file = path.join(OUT, `${scenarioName}--${name}.png`);
      const dataUrl = await page.evaluate(() => {
        const g = window.__game;
        g.render();
        return g.renderer.canvas.toDataURL('image/png');
      });
      fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
      report.shots.push(file);
      return file;
    },
    async state() {
      return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    },
    log(...a) { console.log(`  [${scenarioName}]`, ...a); },
  };
  return helpers;
}

// Player yaw convention (src/player/player.js): lookDir = (-sin(yaw), -cos(yaw)),
// so yaw 0 faces -Z, yaw 90 faces -X, yaw 180 faces +Z, yaw 270 faces +X.
const ROOM_VIEWS = {
  // roomKey -> [teleport [x,y,z], yawDeg, pitchDeg]
  'lobby-desk': [[22.5, 0, 30.8], 55, -8],
  'lobby-wide': [[9, 0, 30.5], 292, -2],
  'wait': [[36, 0, 26], 203, -4],
  'sec': [[26, 0, 21.5], 68, -6],
  'break': [[6.5, 0, 22.5], 33, -6],
  'break-kitchen': [[5.5, 0, 19.5], 46, -4],
  'rr-m': [[11.5, 0, 22.8], 24, -4],
  'copy': [[37, 0, 21.5], 28, -6],
  'it': [[43.5, 0, 16.5], 340, -6],
  'server': [[44.5, 0, 8.8], 31, -4],
  'server-hostage': [[42.8, 0, 6], 320, -6],
  'mech': [[36.5, 0, 9.5], 32, -6],
  'loading': [[20, 0, 9.5], 317, -6],
  'garage-van': [[9.5, 0, 9.8], 51, -8],
  'garage-front': [[1.2, 0, 1.2], 214, -4],
  'janitor': [[11, 0, 16], 180, -8],
  'cubes': [[25.5, 3.6, 12.8], 51, -6],
  'cubes-west': [[2, 3.6, 13.5], 325, -6],
  'print': [[24.5, 3.6, 22.5], 31, -6],
  'conference': [[38.5, 3.6, 8.8], 43, -6],
  'records': [[46, 3.6, 8.5], 23, -6],
  'exec': [[41.2, 3.6, 22.8], 311, -6],
  'exec-hostage': [[43, 3.6, 18.8], 223, -6],
  'asst': [[38.8, 3.6, 22.8], 35, -6],
  'hr': [[42.7, 3.6, 29], 47, -6],
  'well': [[4.8, 3.6, 27.8], 61, -6],
  'store': [[45, 3.6, 32], 352, -6],
  'mezz-south': [[18, 3.6, 32.8], 105, -4],
  'plaza': [[20, 0, 42], 29, -2],
};

export const SCENARIOS = {
  // Quick teleport tour with tuned camera angles (subset via ROOMS=key1,key2 env)
  async 'rooms'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    const only = process.env.ROOMS ? process.env.ROOMS.split(',') : null;
    for (const [key, [target, yaw, pitch]] of Object.entries(ROOM_VIEWS)) {
      if (only && !only.includes(key)) continue;
      await h.qa('teleport', target, yaw);
      await h.qa('setYawPitch', yaw, pitch);
      await h.adv(150);
      // Shared VM runs several SwiftShader captures at once; a single slow shot
      // shouldn't abort the rest of the tour.
      try { await h.shot(key); } catch (e) { h.log(`shot ${key} failed: ${e.message.split('\n')[0]}`); }
    }
    const perf = await h.qa('perf');
    h.log('perf:', JSON.stringify({ drawCalls: perf.drawCalls, triangles: perf.triangles }));
  },
  // Hero prop orbits: reception desk, vending, copier, server rack, van
  async 'heroes'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    const heroes = {
      // name -> [cx, cy, cz, radius, camHeight, [orbit angles kept inside the room]]
      'reception': [17, 0.8, 26.9, 3.4, 1.0, [35, 145]],
      'vending': [7.4, 1.0, 20.0, 2.6, 0.5, [145, 215]],
      'copier': [34.85, 0.7, 17.5, 2.2, 0.7, [35, 325]],
      'server-rack': [40.9, 1.1, 2.1, 3.2, 0.8, [55, 125]],
      'van': [3.6, 1.2, 5.4, 5.0, 1.5, [35, 115]],
    };
    for (const [name, [x, y, z, r, hgt, angles]] of Object.entries(heroes)) {
      for (const ang of angles) {
        await h.qa('teleport', [x, 0, z + 1]);
        await h.qa('cameraOrbit', x, y, z, r, hgt, ang, 55);
        await h.adv(150);
        await h.shot(`${name}-${ang}`);
      }
      await h.qa('cameraOff');
    }
  },
  // Perf sweep: worst-case cameras
  async 'perf'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    for (const cp of ['lobby', 'cubes', 'garage', 'mezz-south', 'plaza']) {
      await h.qa('teleport', cp);
      await h.adv(150);
      const perf = await h.qa('perf');
      h.log(cp, 'draws:', perf.drawCalls, 'tris:', perf.triangles);
    }
  },
};

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : ['rooms'];

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});

let failures = 0;
for (const name of names) {
  const fn = SCENARIOS[name];
  if (!fn) { console.error('unknown scenario:', name); failures++; continue; }
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const report = { shots: [], errors: [] };
  page.on('pageerror', (e) => report.errors.push('pageerror: ' + e.message));
  console.log(`SCENARIO ${name}`);
  try {
    await page.goto(SERVER + '/?qa=1&test=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 60000 });
    await fn(makeHelpers(page, name, report));
    const errs = await page.evaluate(() => window.__consoleErrors);
    report.errors.push(...errs);
    if (report.errors.length) {
      failures++;
      console.log(`  ERRORS(${report.errors.length}):`, JSON.stringify(report.errors.slice(0, 6), null, 1));
    } else {
      console.log(`  ok — ${report.shots.length} shots`);
    }
  } catch (e) {
    failures++;
    console.error(`  FAILED: ${e.message.split('\n')[0]}`);
    try { await page.screenshot({ path: path.join(OUT, `${name}--FAILED.png`), timeout: SHOT_TIMEOUT }); } catch { /* ignore */ }
  }
  await page.close();
}
await browser.close();
console.log(failures ? `DONE with ${failures} failing scenario(s)` : 'DONE all scenarios passed');
process.exit(failures ? 1 : 0);
