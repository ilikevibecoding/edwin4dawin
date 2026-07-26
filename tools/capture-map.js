// Map-domain capture harness (Fable 2, WP-011). Copy of the shared tools/capture.js harness with
// generous screenshot timeouts (the shared VM often runs several SwiftShader captures at once)
// plus map-specific scenarios: per-room sweep + hero compositions + perf probes.
// Usage: SERVER=http://127.0.0.1:5173 node tools/capture-map.js [scenario ...]
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SERVER = process.env.SERVER || 'http://127.0.0.1:5173';
const OUT = 'artifacts/shots';
const SHOT_TIMEOUT = 300000;
fs.mkdirSync(OUT, { recursive: true });

// "shared" mode: run the UNMODIFIED scenarios from tools/capture.js, only raising Playwright's
// per-page default action timeout. With the full art pass in the scene, a single in-game
// page.screenshot takes 45–65s under SwiftShader (measured), so the shared harness's implicit
// 30s default now trips on every in-game shot regardless of gameplay correctness.
// Usage: SERVER=... node tools/capture-map.js shared menu-flow combat doors escort-real
if (process.argv[2] === 'shared') {
  const origLaunch = chromium.launch.bind(chromium);
  chromium.launch = async (opts) => {
    const browser = await origLaunch(opts);
    const origNewPage = browser.newPage.bind(browser);
    browser.newPage = async (o) => {
      const page = await origNewPage(o);
      page.setDefaultTimeout(SHOT_TIMEOUT);
      // Explicit waits inside the shared scenarios (e.g. menu-flow's 8s deploy->playing wait)
      // were calibrated pre-art-pass; a single frame now takes seconds under SwiftShader, so
      // raise them to the same generous wall-clock budget without changing what they assert.
      const origWait = page.waitForFunction.bind(page);
      page.waitForFunction = (fn, arg, options) =>
        origWait(fn, arg, { ...options, timeout: Math.max(options?.timeout ?? 0, SHOT_TIMEOUT) });
      return page;
    };
    return browser;
  };
  process.argv = [process.argv[0], 'tools/capture.js', ...process.argv.slice(3)];
  await import('./capture.js'); // runs its scenario loop and calls process.exit()
}

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
      const file = path.join(OUT, `${scenarioName}--${name}.png`);
      await page.screenshot({ path: file, timeout: SHOT_TIMEOUT });
      report.shots.push(file);
      return file;
    },
    async state() {
      return JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    },
    async saveState(name) {
      const s = await helpers.state();
      fs.writeFileSync(path.join(OUT, `${scenarioName}--${name}.json`), JSON.stringify(s, null, 1));
      return s;
    },
    log(...a) { console.log(`  [${scenarioName}]`, ...a); },
    // The shared dev server hot-reloads whenever any agent saves a file, destroying the page
    // context mid-scenario. Re-boot the mission and carry on when that happens.
    async ensurePlaying() {
      const ok = await page.evaluate(() => !!(window.__qa && window.__game && window.__game.state === 'playing')).catch(() => false);
      if (ok) return true;
      helpers.log('page reloaded — rebooting mission');
      await page.goto(SERVER + '/?qa=1&test=1', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 90000 });
      await helpers.qa('quickStart', 'operator');
      await helpers.qa('freezeAI', true);
      await helpers.qa('god', true);
      return false;
    },
  };
  return helpers;
}

const ROOM_LIST = ['plaza', 'vest', 'lobby', 'gallery', 'wait', 'sec', 'stair-a', 'copy', 'corr-e', 'it', 'server', 'mech',
  'loading', 'garage', 'sc-west', 'sc-mid', 'break', 'janitor', 'rr-m', 'rr-w', 'stair-b', 'courtyard',
  'cubes', 'cubes-west', 'print', 'corr-n', 'conference', 'records', 'exec-corr', 'asst', 'exec', 'corr-w',
  'well', 'mezz-west', 'mezz-south', 'mezz-east', 'hr', 'store', 'stair-a1', 'stair-b1'];

export const SCENARIOS = {
  // per-room sweep (same list/format as the shared graybox-rooms scenario)
  async 'map-rooms'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    const only = (process.env.ROOMS || '').split(',').filter(Boolean);
    for (const r of only.length ? only : ROOM_LIST) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await h.ensurePlaying();
          await h.qa('teleport', r);
          await h.adv(400); // let the light-budget resort settle
          await h.shot(r);
          break;
        } catch (e) {
          h.log(`retry ${r}: ${e.message.split('\n')[0]}`);
        }
      }
    }
    await h.ensurePlaying();
    await h.saveState('final');
  },
  // hero compositions for the WP-011 report
  async 'map-hero'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    await h.qa('killEnemies'); // hero compositions: no frozen NPCs in frame
    const shots = [
      ['atrium-from-mezz-south', ['camera', [25, 5.2, 33.6], 15, -14, 70]],
      ['lobby-from-vestibule', ['camera', [17, 1.66, 33.2], 0, -4, 70]],
      ['brand-wall', ['camera', [17, 1.6, 29.5], 0, 2, 62]],
      ['open-office', ['camera', [24.5, 5.3, 12.5], 118, -10, 72]],
      ['exec-corridor', ['camera', [46.6, 5.2, 15], 90, -6, 68]],
      ['server-room', ['camera', [46.2, 1.7, 8.4], 38, -8, 70]],
      ['garage-shutter', ['camera', [11.5, 1.7, 9.5], 210, -6, 72]],
      ['plaza-approach', ['camera', [26, 1.7, 42.5], 10, -2, 72]],
      ['plaza-entry', ['camera', [21.5, 1.7, 40.5], 340, 2, 72]],
      ['skylight-up', ['camera', [21, 1.0, 27], 0, 55, 80]],
      ['stair-a-flight', ['camera', [32.8, 1.9, 22.5], 205, -12, 72]],
      ['break-room', ['camera', [6.8, 1.66, 21.5], 55, -6, 72]],
    ];
    const onlyHero = (process.env.HERO || '').split(',').filter(Boolean);
    for (const [name, [fn, ...args]] of shots) {
      if (onlyHero.length && !onlyHero.includes(name)) continue;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (!(await h.ensurePlaying())) await h.qa('killEnemies'); // page rebooted: re-clear
          await h.qa('teleport', [args[0][0], Math.max(0, args[0][1] - 1.66), args[0][2]]);
          await h.qa(fn, ...args);
          await h.adv(400);
          await h.shot(name);
          const perf = await h.qa('perf');
          h.log(name, 'tris', perf.triangles, 'calls', perf.drawCalls);
          break;
        } catch (e) {
          h.log(`retry ${name}: ${e.message.split('\n')[0]}`);
        }
      }
    }
    await h.qa('cameraOff').catch(() => {});
  },
  // WP-011b targeted verification shots (doors, server mood, exterior depth, skylight)
  async 'map-fix'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    const shots = [
      ['door-painted', [24.5, 1.55, 26.4], 0, -14, 58],      // lobby->sec painted leaf + kick plate
      ['door-fire', [32.8, 1.55, 13.1], 180, -14, 58],       // stair-a fire door from the corridor
      ['door-wood', [42.5, 5.15, 14.9], 180, -14, 58],       // exec wood double doors
      ['door-security', [42.5, 1.55, 11.7], 0, -14, 58],     // server main security door (IT side)
      ['server-mood', [43, 1.7, 5], 315, -6, 70],            // enemies kept — readability check
      ['canopy-soffit', [17, 1.66, 39.8], 0, 6, 62],         // entrance canopy from the plaza
      ['facade-base', [11, 1.66, 38.8], 25, 0, 68],          // base AO band along the gallery wall
      ['monolith', [25.9, 1.66, 41.6], 345, 0, 60],          // shrink-to-fit sign check
      ['horizon-south', [26, 4.4, 41.5], 180, -2, 72],       // ground/fog junction over the site wall
      ['skylight-floor', [17.5, 1.66, 30.6], 25, 16, 72],    // shaft read at lobby floor level
      // --- WP-011c ---
      ['shutter-slats', [7, 1.55, 4.6], 0, 4, 58],           // roll door surface at speech distance
      ['garage-ceiling', [10.5, 1.66, 9.5], 340, 26, 72],    // duct vs beam family under pendants
      ['ceiling-lobby', [20, 1.66, 29], 90, 32, 70],         // acoustic speckle check
      ['ceiling-cubes', [10, 5.26, 12], 320, 24, 70],        // acoustic speckle check, office
      ['janitor-look', [12.8, 1.55, 17.2], 72, -2, 70],      // across the closet, not the blank wall
    ];
    const only = (process.env.FIX || '').split(',').filter(Boolean);
    for (const [name, pos, yaw, pitch, fov] of shots) {
      if (only.length && !only.includes(name)) continue;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await h.ensurePlaying();
          await h.qa('teleport', [pos[0], Math.max(0, pos[1] - 1.66), pos[2]]);
          await h.qa('camera', pos, yaw, pitch, fov);
          await h.adv(400);
          await h.shot(name);
          break;
        } catch (e) {
          h.log(`retry ${name}: ${e.message.split('\n')[0]}`);
        }
      }
    }
    await h.qa('cameraOff').catch(() => {});
  },
  // WP-011c: title-menu cinematic drift support — the menus pan x 12-36 / y ~4.4 / z 46-52
  // looking at the facade. Verify monolith/canopy/flagpoles/drifts and the warm interior
  // pools through the lobby glass from three points along that path.
  async 'map-title'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    const shots = [
      ['title-west', [12, 4.4, 52], 342, -9, 55],
      ['title-center', [24, 4.4, 49], 17, -10, 58],
      ['title-east', [36, 4.4, 46], 50, -12, 60],
    ];
    const only = (process.env.TITLE || '').split(',').filter(Boolean);
    for (const [name, pos, yaw, pitch, fov] of shots) {
      if (only.length && !only.includes(name)) continue;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await h.ensurePlaying();
          // park the player (light-budget anchor) just inside the site wall below the camera
          await h.qa('teleport', [pos[0], 0, Math.min(pos[2], 44.5)]);
          await h.qa('camera', pos, yaw, pitch, fov);
          await h.adv(400);
          await h.shot(name);
          break;
        } catch (e) {
          h.log(`retry ${name}: ${e.message.split('\n')[0]}`);
        }
      }
    }
    await h.qa('cameraOff').catch(() => {});
  },
  // perf probe at heavy cameras
  async 'map-perf'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    const out = {};
    for (const cp of ['plaza-spawn', 'lobby', 'mezz-south', 'cubes', 'garage', 'server', 'exec-corr', 'courtyard']) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await h.ensurePlaying();
          await h.qa('teleport', cp);
          await h.adv(500);
          out[cp] = await h.qa('perf');
          h.log(cp, JSON.stringify(out[cp]));
          break;
        } catch (e) {
          h.log(`retry ${cp}: ${e.message.split('\n')[0]}`);
        }
      }
    }
    fs.writeFileSync(path.join(OUT, 'map-perf.json'), JSON.stringify(out, null, 1));
  },
};

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(SCENARIOS);

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});

let failures = 0;
for (const name of names) {
  const fn = SCENARIOS[name];
  if (!fn) { console.error('unknown scenario:', name); failures++; continue; }
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const report = { shots: [], errors: [] };
  page.on('pageerror', (e) => report.errors.push('pageerror: ' + e.message));
  console.log(`SCENARIO ${name}`);
  try {
    await page.goto(SERVER + '/?qa=1&test=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 90000 });
    await fn(makeHelpers(page, name, report));
    // a dev-server reload during teardown leaves a fresh page: no console log, nothing to report
    const errs = await page.evaluate(() => window.__consoleErrors || []);
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
