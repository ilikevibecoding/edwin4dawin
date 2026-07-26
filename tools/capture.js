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
  async 'mission-loop-fast'(h) {
    // Full loop using QA jumps: secure both -> escort teleport -> extraction -> victory
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    // discover + secure via real interaction on hostage A
    await h.qa('teleport', 'server');
    await h.adv(500);
    let s = await h.state();
    h.log('hostage A discovered:', s.hostages[0].discovered);
    await h.qa('teleport', [45.0, 0, 3.6], 300);
    await h.adv(200);
    s = await h.state();
    h.log('interactable:', JSON.stringify(s.interactable));
    await h.qa('press', 'KeyE');
    await h.adv(120);
    await h.qa('release', 'KeyE');
    s = await h.state();
    h.log('hostage A state:', s.hostages[0].state);
    await h.shot('secured-a');
    // jump the rest of the way
    await h.qa('setObjective', 'escorted');
    await h.adv(4000);
    s = await h.state();
    h.log('objectives:', JSON.stringify(s.objectives.map((o) => o.id + ':' + o.state)));
    h.log('hostages:', JSON.stringify(s.hostages.map((x) => x.state)));
    await h.shot('extraction');
    await h.adv(5000);
    s = await h.state();
    h.log('result:', JSON.stringify(s.result));
    await h.shot('end');
    await h.saveState('end');
  },
  async 'ai-behavior'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('god', true);
    await h.qa('teleport', 'sc-west'); // quiet spot: service corridor west end
    await h.adv(800); // finish weapon draw
    await h.fireBurst(150);
    await h.adv(150);
    let s = await h.state();
    h.log('ammo after burst:', s.player.weapon.magazine);
    await h.adv(2500);
    s = await h.state();
    h.log('enemy states after shot:', JSON.stringify(s.enemies.map((e) => e.id + ':' + e.state)));
    await h.shot('reaction');
    await h.adv(6000);
    s = await h.state();
    h.log('later:', JSON.stringify(s.enemies.map((e) => e.id + ':' + e.state)), 'playerHP:', s.player.health);
    await h.shot('later');
    await h.saveState('later');
  },
  async 'enemy-attacks'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('teleport', 'lobby');
    await h.adv(6000); // stand in the open; lobby patrols should engage
    const s = await h.state();
    h.log('playerHP:', s.player.health, 'armor:', s.player.armor,
      'enemies:', JSON.stringify(s.enemies.slice(0, 3).map((e) => e.id + ':' + e.state)));
    await h.shot('under-fire');
    await h.saveState('under-fire');
  },
  async 'escort-real'(h) {
    // Hostage B walks from the executive office to the garage across two floors.
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    await h.qa('teleport', [45.0, 3.6, 21.0], 0);
    await h.adv(600);
    await h.qa('press', 'KeyE');
    await h.adv(120);
    await h.qa('release', 'KeyE');
    let s = await h.state();
    h.log('hostage B:', s.hostages[1].state);
    const waypoints = [['exec-corr', 6], ['stair-a1', 8], ['lobby', 14], ['sec', 8], ['sc-mid', 8], ['sc-west', 8], ['garage', 12]];
    for (const [wp, sec] of waypoints) {
      await h.qa('teleport', wp);
      await h.adv(sec * 1000);
      s = await h.state();
      h.log(`@${wp}: hostage at`, JSON.stringify(s.hostages[1].pos), s.hostages[1].state, 'dist', s.hostages[1].dist);
    }
    await h.shot('hostage-in-garage');
    await h.saveState('escort-end');
    const warns = await h.page.evaluate(() => window.__consoleWarnings.filter((w) => w.includes('hostage') || w.includes('enemy')).length);
    h.log('suppressed-teleport warnings:', warns);
  },
  async 'doors'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('freezeAI', true);
    await h.qa('god', true);
    await h.qa('teleport', 'sc-mid', 180); // face the loading door? use sec-sc door: teleport near
    await h.qa('teleport', [24.5, 0, 13.8], 180);
    await h.adv(300);
    let s = await h.state();
    h.log('near doors:', JSON.stringify(s.nearbyDoors.slice(0, 2)), 'prompt:', JSON.stringify(s.interactable));
    await h.qa('press', 'KeyE');
    await h.adv(100);
    await h.qa('release', 'KeyE');
    await h.adv(900);
    s = await h.state();
    h.log('after E:', JSON.stringify(s.nearbyDoors.find((d) => d.id === 'door-sec-sc')));
    await h.shot('door-open');
    // walk through
    await h.holdKey('KeyW', 1500);
    s = await h.state();
    h.log('walked through to:', JSON.stringify(s.player.position));
    await h.saveState('through-door');
  },
  async 'restart-clean'(h) {
    await h.qa('quickStart', 'operator');
    await h.qa('teleport', 'lobby');
    await h.fireBurst(500);
    await h.adv(1000);
    const s1 = await h.state();
    await h.qa('resetMission');
    await h.adv(200);
    const s2 = await h.state();
    h.log('before-reset ammo:', s1.player.weapon.magazine, 'after:', s2.player.weapon.magazine,
      'timer:', s2.missionTimerSec, 'enemies:', s2.enemiesRemaining);
    await h.saveState('after-restart');
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
