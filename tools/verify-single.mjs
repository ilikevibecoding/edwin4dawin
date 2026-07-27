// Load the single-file bundle straight off disk (file://) or from a URL and
// confirm it boots, reaches gameplay and renders.
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const target = process.argv[2] || pathToFileURL(resolve('dist/northstar-rescue.html')).href;
const b = await chromium.launch({ channel: 'chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${m.text()}`); });
p.on('requestfailed', (r) => errs.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));

console.log('loading', target);
await p.goto(target, { waitUntil: 'domcontentloaded' });

const t0 = Date.now();
let ready = false;
while (Date.now() - t0 < 300000) {
  ready = await p.evaluate(() => globalThis.__NORTHSTAR__?.levelReady === true).catch(() => false);
  if (ready) break;
  await new Promise((r) => setTimeout(r, 2000));
}
console.log('levelReady:', ready, `(${((Date.now() - t0) / 1000).toFixed(0)}s)`);
if (!ready) { console.log('errors:', errs.slice(0, 10)); await b.close(); process.exit(1); }

await p.screenshot({ path: 'artifacts/smoke/cdn-title.png' });
await p.evaluate(() => globalThis.__NORTHSTAR__.startMission({
  difficulty: 'operator', loadout: { primary: 'carbine', secondary: 'pistol', gadget: 'flash' } }));
const t1 = Date.now();
while (Date.now() - t1 < 60000) {
  if (await p.evaluate(() => globalThis.__NORTHSTAR__?.state === 'playing')) break;
  await new Promise((r) => setTimeout(r, 500));
}
await p.evaluate(() => { globalThis.__NORTHSTAR__.teleport('reception'); globalThis.advanceTime(800); });
await p.screenshot({ path: 'artifacts/smoke/cdn-gameplay.png' });

const st = await p.evaluate(() => globalThis.render_game_to_text());
const lum = await p.evaluate(() => {
  const c = document.getElementById('game-canvas');
  const t = document.createElement('canvas'); t.width = 120; t.height = 68;
  const x = t.getContext('2d'); x.drawImage(c, 0, 0, 120, 68);
  const d = x.getImageData(0, 0, 120, 68).data;
  let s = 0; for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i+1] + 0.0722 * d[i+2];
  return +(s / (d.length / 4)).toFixed(1);
});
const qa = await p.evaluate(() => !!globalThis.__NORTHSTAR_QA__);
console.log('state:', st.gameMode, '| room:', st.player?.room, '| weapon:', st.weapon?.name,
            '| ammo:', `${st.weapon?.magazineAmmo}/${st.weapon?.reserveAmmo}`, '| luminance:', lum);
console.log('QA exposed in this build:', qa, '(should be false without ?qa=1)');
console.log(errs.length ? `ERRORS (${errs.length}):\n  ${errs.slice(0, 10).join('\n  ')}` : 'no console errors, no failed requests');
await b.close();
process.exit(errs.length ? 1 : 0);
