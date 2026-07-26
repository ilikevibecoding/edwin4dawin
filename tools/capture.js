// Screenshot + state capture pipeline (Opus 4 domain). Runs named scenarios against the dev
// server, saving screenshots and render_game_to_text output under artifacts/shots/.
// Usage: node tools/capture.js [scenarioName ...]   (default: all)
//        SERVER=http://127.0.0.1:5173 node tools/capture.js
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SERVER = process.env.SERVER || 'http://127.0.0.1:5173';
const OUT = 'artifacts/shots';
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
      const file = path.join(OUT, `${scenarioName}--${name}.png`);
      await page.screenshot({ path: file });
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
    async holdKey(code, ms) {
      await helpers.qa('press', code);
      await helpers.adv(ms);
      await helpers.qa('release', code);
    },
    async fireBurst(ms = 300) {
      await helpers.qa('mouse', 0, true);
      await helpers.adv(ms);
      await helpers.qa('mouse', 0, false);
    },
    async click(action) {
      await page.click(`[data-action="${action}"]`);
    },
    log(...a) { console.log(`  [${scenarioName}]`, ...a); },
  };
  return helpers;
}

// ---------------------------------------------------------------------------
export const SCENARIOS = {
  async 'title'(h) {
    await h.shot('title');
    await h.saveState('title');
  },
  async 'menu-flow'(h) {
    await h.click('start');
    await h.shot('difficulty');
    await h.page.click('[data-action="difficulty-operator"]');
    await h.shot('briefing');
    await h.click('to-loadout');
    await h.shot('loadout');
    await h.click('deploy');
    await h.page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 8000 });
    await h.adv(300);
    await h.shot('spawn');
    await h.saveState('spawn');
  },
  async 'graybox-rooms'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    const rooms = ['plaza', 'vest', 'lobby', 'gallery', 'wait', 'sec', 'stair-a', 'copy', 'corr-e', 'it', 'server', 'mech',
      'loading', 'garage', 'sc-west', 'sc-mid', 'break', 'janitor', 'rr-m', 'rr-w', 'stair-b', 'courtyard',
      'cubes', 'cubes-west', 'print', 'corr-n', 'conference', 'records', 'exec-corr', 'asst', 'exec', 'corr-w',
      'well', 'mezz-west', 'mezz-south', 'mezz-east', 'hr', 'store', 'stair-a1', 'stair-b1'];
    for (const r of rooms) {
      await h.qa('teleport', r);
      await h.adv(120);
      await h.shot(r);
    }
    await h.saveState('final');
  },
  async 'movement'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    const s0 = await h.state();
    await h.holdKey('KeyW', 1200);
    const s1 = await h.state();
    h.log('moved', s0.player.position, '->', s1.player.position);
    await h.shot('after-walk');
    await h.qa('press', 'KeyC');
    await h.adv(400);
    await h.qa('release', 'KeyC');
    const s2 = await h.state();
    h.log('crouch state:', s2.player.moveState);
    await h.saveState('after-crouch');
  },
  async 'combat'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    await h.qa('teleport', 'lobby');
    await h.qa('spawnEnemy', 'trooper', [17, 0, 22]);
    await h.adv(200);
    await h.shot('enemy-ahead');
    await h.fireBurst(400);
    await h.adv(300);
    await h.shot('after-fire');
    await h.saveState('after-fire');
  },
};

// ---------------------------------------------------------------------------
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
    await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 30000 });
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
    try { await page.screenshot({ path: path.join(OUT, `${name}--FAILED.png`) }); } catch { /* ignore */ }
  }
  await page.close();
}
await browser.close();
console.log(failures ? `DONE with ${failures} failing scenario(s)` : 'DONE all scenarios passed');
process.exit(failures ? 1 : 0);
