// UI screenshot pipeline (Fable 1 domain). Copy of the capture.js harness with
// UI-specific scenarios covering every screen and HUD state.
// Usage: SERVER=http://127.0.0.1:5173 node tools/capture-ui.js [scenarioName ...]
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
    async shot(name, clip) {
      // generous timeout: the shared CI box often runs several software-rendered
      // Chromes at once and frame production can take tens of seconds
      const file = path.join(OUT, `${scenarioName}--${name}.png`);
      try {
        await page.screenshot({ path: file, timeout: 90000, ...(clip ? { clip } : {}) });
      } catch {
        // Playwright's preamble ("waiting for fonts") can stall when the page's
        // main thread is saturated; grab the compositor frame straight via CDP
        const cdp = await page.context().newCDPSession(page);
        const { data } = await cdp.send('Page.captureScreenshot', {
          format: 'png',
          ...(clip ? { clip: { ...clip, scale: 1 } } : {}),
        });
        fs.writeFileSync(file, Buffer.from(data, 'base64'));
        await cdp.detach();
      }
      report.shots.push(file);
      return file;
    },
    async click(action) {
      // force: skip actionability frame-polling — UI is static under ?test=1 and
      // the shared CI box renders frames too slowly for stability checks
      await page.click(`[data-action="${action}"]`, { force: true });
    },
    log(...a) { console.log(`  [${scenarioName}]`, ...a); },
  };
  return helpers;
}

// Deploy into gameplay through the real menu flow (loading screen is ~50ms in test mode).
async function quickPlay(h, primary = null) {
  await h.qa('quickStart', 'operator', primary);
  await h.qa('freezeAI', true);
  await h.qa('god', true);
  await h.adv(900); // finish weapon draw
}

export const SCENARIOS = {
  async 'ui-title'(h) {
    await h.page.waitForTimeout(2200); // entrance animation settles
    await h.shot('title');
  },
  async 'ui-settings'(h) {
    await h.click('settings');
    await h.shot('settings');
    // control reference lives at the bottom of the scroll area
    await h.page.evaluate(() => {
      const sc = document.querySelector('#screen-settings .panel-scroll');
      sc.scrollTop = sc.scrollHeight;
    });
    await h.shot('settings-controls');
  },
  async 'ui-menus'(h) {
    await h.click('start');
    await h.shot('difficulty');
    await h.page.hover('[data-action="difficulty-veteran"]', { force: true });
    await h.shot('difficulty-hover');
    await h.page.click('[data-action="difficulty-operator"]', { force: true });
    await h.shot('briefing');
    await h.click('to-loadout');
    for (const id of ['boreal-k5', 'halcyon-hc4', 'vanta-s12', 'meridian-lr8']) {
      await h.page.click(`[data-action="select-${id}"]`, { force: true });
      await h.shot('loadout-' + id);
    }
  },
  async 'ui-loading'(h) {
    await h.qa('setState', 'loading');
    await h.page.waitForTimeout(400);
    await h.shot('loading');
    await h.qa('setState', 'title');
  },
  async 'ui-hud'(h) {
    await quickPlay(h);
    await h.qa('teleport', 'lobby');
    await h.qa('spawnEnemy', 'trooper', [17, 0, 22]);
    await h.adv(300);
    await h.shot('combat-idle');
    await h.qa('mouse', 0, true);
    await h.adv(250);
    await h.qa('mouse', 0, false);
    await h.shot('combat-fire');
    await h.adv(400);
    // low + empty magazine states
    await h.page.evaluate(() => { window.__game.mission.player.arsenal.current.mag = 3; });
    await h.adv(60);
    await h.shot('ammo-low');
    await h.page.evaluate(() => { window.__game.mission.player.arsenal.current.mag = 0; });
    await h.adv(60);
    await h.shot('ammo-empty');
    // subtitle bar (mirror of the bus handler, visual check only)
    await h.page.evaluate(() => {
      const el = window.__game.ui.hudEls.subtitle;
      el.textContent = 'Okafor: "They moved us at gunpoint — there were at least a dozen of them."';
      el.style.display = 'block';
    });
    await h.shot('subtitle');
    await h.page.evaluate(() => { window.__game.ui.hudEls.subtitle.style.display = 'none'; });
    // damage state: real hit + re-arm the transient overlays (they fade on wall-clock
    // timers ~350ms; screenshots on the shared box take longer than that to capture)
    await h.qa('god', false);
    await h.qa('hurt', 75);
    await h.adv(50);
    await h.page.evaluate(() => {
      const ui = window.__game.ui;
      // the bus handler schedules wall-clock fade timers; cancel them so the
      // overlays hold still for the (slow) screenshot
      clearTimeout(ui._dmgT);
      clearTimeout(ui._dirT);
      const E = ui.hudEls;
      E.dmgVignette.style.opacity = '1';
      E.dmgArc.style.transform = 'rotate(2.2rad)';
      E.dmgArc.style.opacity = '1';
    });
    await h.shot('damaged');
    await h.page.evaluate(() => {
      const E = window.__game.ui.hudEls;
      E.dmgVignette.style.opacity = '0';
      E.dmgArc.style.opacity = '0';
    });
    // critical vitals (health <= 35 threshold; armor soaks part of each hit)
    await h.qa('hurt', 45);
    await h.qa('hurt', 40);
    await h.adv(60);
    await h.shot('vitals-critical');
    // flash state
    await h.page.evaluate(() => { window.__game.mission.player.flash = 0.8; });
    await h.adv(30);
    await h.shot('flash');
  },
  async 'ui-scope'(h) {
    await quickPlay(h, 'meridian-lr8');
    await h.qa('teleport', 'lobby');
    await h.adv(400);
    await h.qa('mouse', 2, true);
    await h.adv(700);
    await h.shot('scope');
    await h.qa('mouse', 2, false);
  },
  async 'ui-hostages'(h) {
    await quickPlay(h);
    await h.adv(200);
    await h.shot('chips-unknown');
    await h.qa('setObjective', 'located');
    await h.adv(60);
    await h.shot('chips-located');
    await h.qa('setObjective', 'secured');
    await h.adv(60);
    await h.shot('chips-secured');
  },
  async 'ui-pause'(h) {
    await quickPlay(h);
    await h.qa('teleport', 'lobby');
    await h.adv(200);
    await h.qa('setState', 'paused');
    await h.shot('paused');
  },
  // WP-010b: restart confirmation. Auto-confirm is test-mode only, so disarm testMode
  // to photograph the player-facing confirm strip, then restore it.
  async 'ui-confirm'(h) {
    await quickPlay(h);
    await h.qa('teleport', 'lobby');
    await h.adv(200);
    await h.qa('setState', 'paused');
    await h.page.evaluate(() => { window.__game.testMode = false; });
    await h.page.click('#screen-paused [data-action="restart"]', { force: true });
    await h.shot('pause-armed');
    await h.page.click('#screen-paused [data-action="restart-cancel"]', { force: true });
    await h.shot('pause-cancelled');
    // defeat screen carries the same pattern (resume first: end states need a live mission)
    await h.qa('setState', 'playing');
    await h.adv(60);
    await h.qa('setObjective', 'defeat');
    await h.adv(120);
    // advanceTime() re-asserts testMode; disarm again for the player-facing confirm
    await h.page.evaluate(() => { window.__game.testMode = false; });
    await h.page.click('#screen-defeat [data-action="restart"]', { force: true });
    await h.shot('defeat-armed');
    // player-facing confirm actually restarts (restore testMode first for the fast path)
    await h.page.evaluate(() => { window.__game.testMode = true; });
    await h.page.click('#screen-defeat [data-action="restart-confirm"]', { force: true });
    await h.page.waitForFunction(() => window.__game.state === 'playing', null, { timeout: 120000 });
    await h.adv(200);
    await h.shot('confirmed-restarted');
  },
  // WP-010b: extraction hold countdown chip (climax focal treatment)
  async 'ui-extract'(h) {
    await quickPlay(h);
    await h.qa('setObjective', 'escorted');
    for (let i = 0; i < 30; i++) {
      const holding = await h.page.evaluate(() => window.__game.mission.extractCountdown != null);
      if (holding) break;
      await h.adv(1000);
    }
    await h.adv(700); // countdown mid-run so the chip shows a live number
    await h.shot('extract-hold');
  },
  // WP-010b: hostage chip glyph audit — every state in one scripted run.
  // Chips read hostage fields directly; mutate them and repaint the HUD without stepping
  // the sim (a stepped sim would react to a dead hostage by ending the mission).
  async 'ui-chips-audit'(h) {
    await quickPlay(h);
    await h.adv(200);
    const CLIP = { x: 0, y: 780, width: 480, height: 300 }; // bottom-left chip cluster
    const set = (i, mut) => h.page.evaluate(([idx, m]) => {
      Object.assign(window.__game.mission.hostages[idx], m);
      window.__game.ui.updateHud(window.__game.mission, 1); // repaint only
    }, [i, mut]);
    await h.shot('1-unknown', CLIP);
    await set(0, { discovered: true });
    await h.shot('2-located', CLIP);
    await set(0, { state: 'following' }); // `secured` derives from state
    await h.shot('3-with-you', CLIP);
    await set(0, { state: 'waiting' });
    await h.shot('4-holding', CLIP);
    await set(0, { state: 'extracted' });
    await set(1, { discovered: true, alive: false });
    await h.shot('5-safe-and-lost', CLIP);
  },
  async 'ui-end'(h) {
    await quickPlay(h);
    await h.qa('setObjective', 'victory');
    await h.adv(120);
    await h.shot('victory');
    await h.qa('resetMission');
    await h.adv(200);
    await h.qa('setObjective', 'defeat');
    await h.adv(120);
    await h.shot('defeat');
  },
  // spot-check at 1366×768 (viewport switched below via SMALL set)
  async 'ui-small'(h) {
    await h.page.waitForTimeout(2200);
    await h.shot('title');
    await h.click('start');
    await h.shot('difficulty');
    await h.page.click('[data-action="difficulty-operator"]', { force: true });
    await h.shot('briefing');
    await h.click('to-loadout');
    await h.shot('loadout');
    await h.page.click('#screen-loadout [data-action="back"]', { force: true });
    await h.page.keyboard.press('Escape');
    await h.page.keyboard.press('Escape');
    await h.click('settings');
    await h.shot('settings');
    await h.page.click('#screen-settings [data-action="back"]', { force: true });
    await quickPlay(h);
    await h.qa('teleport', 'lobby');
    await h.adv(300);
    await h.shot('hud');
    await h.qa('setState', 'paused');
    await h.shot('paused');
    await h.qa('setState', 'playing');
    await h.qa('setObjective', 'victory');
    await h.adv(120);
    await h.shot('victory');
  },
};

const SMALL_VIEWPORT = new Set(['ui-small']);

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
  const viewport = SMALL_VIEWPORT.has(name) ? { width: 1366, height: 768 } : { width: 1920, height: 1080 };
  const page = await browser.newPage({ viewport });
  page.setDefaultTimeout(120000);
  const report = { shots: [], errors: [] };
  page.on('pageerror', (e) => report.errors.push('pageerror: ' + e.message));
  console.log(`SCENARIO ${name}`);
  try {
    await page.goto(SERVER + '/?qa=1&test=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 120000 });
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
    console.error(`  FAILED: ${e.message.split('\n').slice(0, 4).join(' | ')}`);
    try { await page.screenshot({ path: path.join(OUT, `${name}--FAILED.png`), timeout: 60000 }); } catch { /* ignore */ }
  }
  await page.close();
}
await browser.close();
console.log(failures ? `DONE with ${failures} failing scenario(s)` : 'DONE all scenarios passed');
process.exit(failures ? 1 : 0);
