// wp-013b: character draw-call contribution with 14 enemies alive (before/after probe)
import { chromium } from '@playwright/test';

const SERVER = process.env.SERVER || 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(SERVER + '/?qa=1&test=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game && window.__game.state === 'title', null, { timeout: 60000 });
const out = await page.evaluate(() => {
  const qa = window.__qa;
  qa.quickStart('operator');
  window.__game.engine.running = false;
  qa.god(true); qa.freezeAI(true);
  qa.teleport('lobby', 90);
  const types = ['trooper', 'scout', 'heavy'];
  // 14 extra enemies clustered in view of the lobby camera
  for (let i = 0; i < 14; i++) {
    qa.spawnEnemy(types[i % 3], [16 + (i % 5) * 3, 0, 26 + Math.floor(i / 5) * 3]);
  }
  window.advanceTime(400);
  const withChars = qa.perf();
  // hide all character rigs + their weapons to isolate their draw contribution
  const m = window.__game.mission;
  for (const e of m.enemies) e.rig.group.visible = false;
  for (const h of m.hostages) h.rig.group.visible = false;
  window.advanceTime(50);
  const without = qa.perf();
  const enemies = m.enemies.length;
  for (const e of m.enemies) e.rig.group.visible = true;
  for (const h of m.hostages) h.rig.group.visible = true;
  return { enemies, withChars, without, charDraws: withChars.drawCalls - without.drawCalls, charTris: withChars.triangles - without.triangles };
});
console.log(JSON.stringify(out, null, 1));
const errs = await page.evaluate(() => window.__consoleErrors);
if (errs.length) console.log('ERRORS:', errs);
await browser.close();
