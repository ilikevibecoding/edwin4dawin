#!/usr/bin/env node
// Quick QA screenshot/inspection tool.
// Usage: node tools/shot.mjs "<path-with-query>" <out.png> ["<async js to eval in page>"]
// - Base URL from BASE_URL env (default http://127.0.0.1:5173)
// - Collects console errors/warnings and page errors; prints them.
// - The eval script runs as the body of `async (page-context) => { ... }` in
//   the browser; helpers available: qa (window.__qa), adv(ms) = advanceTime.
// Exit code 1 if any console error occurred.

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const [, , urlPath = '/?test=1&qa=1', out = 'artifacts/shot.png', evalBody = ''] = process.argv;
const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173';

const errors = [];
const warnings = [];

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.setDefaultTimeout(90000);
page.on('console', (msg) => {
  const type = msg.type();
  const text = msg.text();
  if (type === 'error') errors.push(text);
  else if (type === 'warning') warnings.push(text);
});
page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));

await page.goto(BASE + urlPath, { waitUntil: 'load' });
await page.waitForTimeout(900);

if (evalBody) {
  try {
    await page.evaluate(`(async () => {
      const qa = window.__qa;
      const adv = (ms) => window.advanceTime(ms);
      ${evalBody}
    })()`);
  } catch (e) {
    errors.push(`EVAL: ${e.message}`);
  }
}
await page.waitForTimeout(250);
// ensure a freshly-rendered frame in deterministic mode
try { await page.evaluate(() => window.advanceTime && window.advanceTime(17)); } catch { /* ok */ }

fs.mkdirSync(path.dirname(out), { recursive: true });
await page.screenshot({ path: out, timeout: 60000 });

let state = null;
try {
  state = await page.evaluate(() => (window.render_game_to_text ? window.render_game_to_text() : null));
} catch { /* not ready */ }
let probe = null;
try {
  probe = await page.evaluate(() => window.__probe ?? null);
} catch { /* none */ }

if (probe) {
  console.log('--- probe ---');
  console.log(JSON.stringify(probe, null, 1));
}
console.log('--- state ---');
console.log(state ? JSON.stringify(JSON.parse(state), null, 1).slice(0, probe ? 600 : 3000) : 'n/a');
console.log('--- warnings:', warnings.length, '---');
for (const w of warnings.slice(0, 8)) console.log('W:', w.slice(0, 300));
console.log('--- errors:', errors.length, '---');
for (const e of errors.slice(0, 12)) console.log('E:', e.slice(0, 500));
console.log('screenshot ->', out);

await browser.close();
process.exit(errors.length ? 1 : 0);
