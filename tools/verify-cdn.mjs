// Boot each candidate URL in a real browser and report whether the game
// actually reaches gameplay. This is the only test that matters for a link:
// curl proves the bytes and the content type, not that the game runs.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('artifacts/smoke', { recursive: true });
const urls = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

const rows = [];
for (const url of urls) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 90)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 90)); });
  const label = url.replace(/^https:\/\//, '').split('/')[0];
  let verdict = 'no boot';
  let detail = '';
  try {
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    let ready = false;
    while (Date.now() - t0 < 220000) {
      ready = await page.evaluate(() => globalThis.__NORTHSTAR__?.levelReady === true).catch(() => false);
      if (ready) break;
      await new Promise((r) => setTimeout(r, 3000));
    }
    if (!ready) {
      const t = await page.title().catch(() => '?');
      verdict = 'FAILED';
      detail = `never became ready (title "${t}")`;
    } else {
      await page.evaluate(() => globalThis.__NORTHSTAR__.startMission({
        difficulty: 'operator', loadout: { primary: 'carbine', secondary: 'pistol', gadget: 'flash' } }));
      const t1 = Date.now();
      while (Date.now() - t1 < 60000) {
        if (await page.evaluate(() => globalThis.__NORTHSTAR__?.state === 'playing')) break;
        await new Promise((r) => setTimeout(r, 500));
      }
      await page.evaluate(() => { globalThis.__NORTHSTAR__.teleport('reception'); globalThis.advanceTime(800); });
      const st = await page.evaluate(() => globalThis.render_game_to_text());
      const lum = await page.evaluate(() => {
        const c = document.getElementById('game-canvas');
        const t = document.createElement('canvas'); t.width = 120; t.height = 68;
        const x = t.getContext('2d'); x.drawImage(c, 0, 0, 120, 68);
        const d = x.getImageData(0, 0, 120, 68).data;
        let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2];
        return +(s / (d.length/4)).toFixed(1);
      });
      await page.screenshot({ path: `artifacts/smoke/cdn-${label.replace(/\W/g, '-')}.png` });
      verdict = st.gameMode === 'playing' && st.player?.room === 'lobby' ? 'PLAYS' : 'PARTIAL';
      detail = `${((Date.now()-t0)/1000).toFixed(0)}s to ready | ${st.gameMode} | ${st.weapon?.name} ${st.weapon?.magazineAmmo}/${st.weapon?.reserveAmmo} | luminance ${lum} | errors ${errs.length}`;
    }
  } catch (e) {
    verdict = 'FAILED';
    detail = String(e.message || e).slice(0, 110);
  }
  rows.push({ verdict, label, detail, url });
  console.log(`${verdict.padEnd(8)} ${label.padEnd(26)} ${detail}`);
  await page.close();
}
await browser.close();
console.log('\n--- summary ---');
for (const r of rows) console.log(`${r.verdict === 'PLAYS' ? 'OK  ' : 'BAD '} ${r.url}`);
