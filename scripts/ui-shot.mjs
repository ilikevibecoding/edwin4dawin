#!/usr/bin/env node
/**
 * UI screenshot tool (menus + forced HUD states).
 *
 * Usage:
 *   node scripts/ui-shot.mjs --url=http://localhost:5179 --out=review/ui main pause gameover defeat loading
 *   node scripts/ui-shot.mjs "pause?pose=street&t=2"        # pause over a rendered scene
 *
 * Each positional arg is "<uidemo>[?extra=params]". If the extra params include a
 * pose=..., we wait for the harness (__SHOT_READY__); otherwise we wait for the
 * menu demo flag (__UIDEMO_READY__). Output: <out>/menu_<name>.png
 */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opts = { out: 'review/ui', url: 'http://localhost:5179', w: 1280, h: 720 };
const specs = [];
for (const a of args) {
  if (a.startsWith('--out=')) opts.out = a.slice(6);
  else if (a.startsWith('--url=')) opts.url = a.slice(6);
  else if (a.startsWith('--w=')) opts.w = parseInt(a.slice(4));
  else if (a.startsWith('--h=')) opts.h = parseInt(a.slice(4));
  else specs.push(a);
}
if (!specs.length) specs.push('loading', 'main', 'pause?pose=street&t=1.5', 'gameover?pose=street&t=1.5');

const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const sanitize = (s) => s.replace(/[?&=]/g, '_').replace(/[^a-zA-Z0-9_.-]/g, '');

async function main() {
  await mkdir(opts.out, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: [
      '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
      '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
      '--enable-webgl', '--ignore-gpu-blocklist',
      `--window-size=${opts.w},${opts.h}`,
    ],
    defaultViewport: { width: opts.w, height: opts.h },
    protocolTimeout: 300000,
  });

  for (const spec of specs) {
    const [name, extra] = spec.split('?');
    const usesHarness = !!extra && /(^|&)pose=/.test(extra);
    const url = `${opts.url}/?uidemo=${encodeURIComponent(name)}${extra ? '&' + extra : ''}`;
    const flag = usesHarness ? '__SHOT_READY__' : '__UIDEMO_READY__';
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error(`[pageerror] ${spec}: ${e.message}`));
    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(`window.${flag} === true`, { timeout: 240000, polling: 250 });
      await new Promise((r) => setTimeout(r, 450)); // let entrance animations settle
      const file = join(opts.out, `menu_${sanitize(spec)}.png`);
      await page.screenshot({ path: file });
      console.log(`[shot] ${file}`);
    } catch (e) {
      console.error(`[fail] ${spec}: ${e.message}`);
      if (consoleErrors.length) console.error('  console errors:', consoleErrors.slice(0, 5).join(' | '));
      try {
        const file = join(opts.out, `menu_${sanitize(spec)}_FAILED.png`);
        await page.screenshot({ path: file });
        console.log(`[shot] ${file} (failure state)`);
      } catch {}
    }
    await page.close();
  }
  await browser.close();
}

main();
