// Captures a screenshot at every QA checkpoint for room-by-room review.
// Usage: node tools/screenshot-matrix.mjs [outDir] [--hud] [--res=WxH] [--quality=high]
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const outDir = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'screenshots/matrix';
const args = process.argv.join(' ');
const showHud = args.includes('--hud');
const resMatch = args.match(/--res=(\d+)x(\d+)/);
const width = resMatch ? +resMatch[1] : 1280;
const height = resMatch ? +resMatch[2] : 720;
const qMatch = args.match(/--quality=(\w+)/);
const lowspec = !qMatch || qMatch[1] === 'low';

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width, height } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(`http://127.0.0.1:5173/?qa=1${lowspec ? '&lowspec=1' : ''}`);
await page.waitForFunction(() => window.NSR?.state === 'title', null, { timeout: 60000 });
if (qMatch && qMatch[1] !== 'low') {
  await page.evaluate((q) => { window.NSR.constructor; const s = window.NSR; s.lighting && (s.lighting.applyQuality); }, qMatch[1]);
}
await page.evaluate(() => window.__qa.start('operative', 'bdr15'));
await page.waitForFunction(() => window.NSR.state === 'playing');
await page.evaluate(() => { window.__qa.freezeAI(true); window.__qa.god(true); });
await page.evaluate((hud) => window.__qa.screenshotMode(!hud), showHud);
// hide QA panel for clean shots
await page.evaluate(() => { const p = document.querySelector('.qa-panel'); if (p) p.style.display = 'none'; });
await page.evaluate(() => window.advanceTime(600));

const checkpoints = await page.evaluate(() => window.__qa.listCheckpoints());
for (const cp of checkpoints) {
  await page.evaluate((c) => window.__qa.teleport(c), cp);
  // long enough for the light pool to re-assign to this room
  await page.evaluate(() => window.advanceTime(700));
  await page.screenshot({ path: `${outDir}/${cp}.png` });
  process.stdout.write(cp + ' ');
}
console.log('\nDone. Console errors:', errors.length ? errors : 'none');
await browser.close();
