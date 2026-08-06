// Probe: simulate the user's "black and glitchy after tab switch" — force a
// WebGL context loss + restore and verify the game recovers (not a dead black
// canvas). Runs LIVE (no pause) since restore uses real timers.
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.env.PROBE_URL ?? 'http://localhost:4173';
fs.mkdirSync('shots_probe', { recursive: true });
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.setDefaultTimeout(150_000);
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error' || t.includes('IRONVEIL') || t.includes('Context')) console.log('CONSOLE:', t.slice(0, 160));
});
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 60_000 });
await page.evaluate(() => { window.__game.testMode(); });
// let it run live a bit so the scene + precompile settle
await page.waitForTimeout(6000);
await page.screenshot({ path: 'shots_probe/ctx_before.png' });

// force the loss (restore after 1.5 s)
const ok = await page.evaluate(() => window.__game.loseContext(1500));
console.log('loseContext supported:', ok);
await page.waitForTimeout(700);
await page.screenshot({ path: 'shots_probe/ctx_during_loss.png' });
let g = await page.evaluate(() => window.__game.gfxState());
console.log('during loss:', JSON.stringify(g));

// wait for restore + recovery
await page.waitForTimeout(4000);
g = await page.evaluate(() => window.__game.gfxState());
console.log('after restore:', JSON.stringify(g));
// prove frames are rendering again: frame counter must advance
const f1 = await page.evaluate(() => window.__game.ctx.time.frame);
await page.waitForTimeout(1200);
const f2 = await page.evaluate(() => window.__game.ctx.time.frame);
console.log('frames advancing:', f1, '->', f2, f2 > f1 ? 'OK' : 'STALLED');
await page.screenshot({ path: 'shots_probe/ctx_after_restore.png' });

// turn around after restore — the original complaint scenario
await page.evaluate(() => { window.__game.teleport(0, 0, 14, Math.PI, 0.03); });
await page.waitForTimeout(800);
await page.screenshot({ path: 'shots_probe/ctx_after_turnaround.png' });

// double loss: quality should step down
await page.evaluate(() => window.__game.loseContext(800));
await page.waitForTimeout(3500);
g = await page.evaluate(() => window.__game.gfxState());
console.log('after 2nd loss:', JSON.stringify(g));
console.log('done');
await browser.close();
