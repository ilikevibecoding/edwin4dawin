// Lead's fast integration smoke test: boot, enter gameplay, walk the map,
// screenshot key rooms, and dump every console message. Not part of the
// Playwright matrix (that is Opus 4's); this is the tight loop for integration.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = process.env.NS_URL || 'http://127.0.0.1:5173/?qa=1';
const OUT = 'artifacts/smoke';
mkdirSync(OUT, { recursive: true });

const rooms = process.env.NS_ROOMS
  ? process.env.NS_ROOMS.split(',')
  : ['insertion', 'entrance', 'vestibule', 'lobby', 'waiting', 'stairwell', 'openoffice',
     'conference', 'breakroom', 'restrooms', 'midcorr', 'copyroom', 'itroom', 'serverroom',
     'mechanical', 'servicecorr', 'loading', 'garage', 'execcorr', 'execoffice', 'archive',
     'upperlanding', 'weststair', 'upperweststair', 'eastlink', 'janitor'];

const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-lcd-text'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });

const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));

await page.goto(URL, { waitUntil: 'domcontentloaded' });

try {
  const t0 = Date.now();
  while (Date.now() - t0 < 240000) {
    const ready = await page.evaluate(() => globalThis.__NORTHSTAR__?.levelReady === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  const ready = await page.evaluate(() => globalThis.__NORTHSTAR__?.levelReady === true);
  if (!ready) throw new Error('levelReady stayed false');
} catch (e) {
  writeFileSync(`${OUT}/console.log`, logs.join('\n'));
  console.log('LEVEL NEVER BECAME READY:', e.message);
  console.log(logs.slice(0, 80).join('\n'));
  await page.screenshot({ path: `${OUT}/00-stuck.png` });
  await browser.close();
  process.exit(1);
}

console.log('level ready');
await page.screenshot({ path: `${OUT}/01-title.png` });

// Enter gameplay through the QA API (fast path).
await page.evaluate(() => {
  const g = globalThis.__NORTHSTAR__;
  g.startMission({ difficulty: 'operator', loadout: { primary: 'carbine', secondary: 'pistol', gadget: 'flash' } });
});
await page.waitForFunction(() => globalThis.__NORTHSTAR__?.state === 'playing', { timeout: 60000 });
await page.evaluate(() => globalThis.advanceTime(500));
await page.screenshot({ path: `${OUT}/02-spawn.png` });

const summary = [];
for (const room of rooms) {
  const ok = await page.evaluate((r) => globalThis.__NORTHSTAR__.teleport(r), room);
  if (!ok) { summary.push({ room, error: 'no such checkpoint' }); continue; }
  await page.evaluate(() => globalThis.advanceTime(700));
  const st = await page.evaluate(() => globalThis.render_game_to_text());
  const lum = await page.evaluate(() => {
    const c = document.getElementById('game-canvas');
    const tmp = document.createElement('canvas');
    tmp.width = 160; tmp.height = 90;
    const ctx = tmp.getContext('2d');
    ctx.drawImage(c, 0, 0, 160, 90);
    const d = ctx.getImageData(0, 0, 160, 90).data;
    let sum = 0, min = 255, max = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      sum += l; if (l < min) min = l; if (l > max) max = l;
    }
    return { mean: +(sum / (d.length / 4)).toFixed(1), min: +min.toFixed(0), max: +max.toFixed(0) };
  });
  await page.screenshot({ path: `${OUT}/room-${room}.png` });
  summary.push({
    room,
    reported: st.player?.room,
    pos: st.player?.position,
    grounded: st.player?.grounded,
    lum,
    errors: st.consoleErrors,
  });
  console.log(`${room.padEnd(16)} reported=${String(st.player?.room).padEnd(16)} grounded=${st.player?.grounded} lum=${lum.mean} (${lum.min}-${lum.max})`);
}

const finalState = await page.evaluate(() => globalThis.render_game_to_text());
writeFileSync(`${OUT}/state.json`, JSON.stringify(finalState, null, 2));
writeFileSync(`${OUT}/rooms.json`, JSON.stringify(summary, null, 2));
writeFileSync(`${OUT}/console.log`, logs.join('\n'));

const errs = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]') || l.startsWith('[requestfailed]'));
const warns = logs.filter((l) => l.startsWith('[warning]'));
console.log(`\nconsole: ${logs.length} messages, ${errs.length} errors, ${warns.length} warnings`);
if (errs.length) console.log(errs.slice(0, 30).join('\n'));
if (warns.length) console.log('--- warnings (first 10) ---\n' + warns.slice(0, 10).join('\n'));
console.log(`\nperf: ${JSON.stringify(finalState.performance)}`);
await browser.close();
