#!/usr/bin/env node
import { chromium } from 'playwright';

// Reports whether the app's own markup and module actually turned up in the
// document, with a short window. Proxied previewers inject content after load,
// so presence has to be polled rather than read once at DOMContentLoaded.
//
//   node tools/cdnboot.mjs <url> [seconds]

const url = process.argv[2];
const secs = Number(process.argv[3] ?? 45);
if (!url) {
  console.error('usage: node tools/cdnboot.mjs <url> [seconds]');
  process.exit(1);
}

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 200)));
page.on('requestfailed', (r) => console.log('[fail]', r.url().slice(0, 100), r.failure()?.errorText));

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

const deadline = Date.now() + secs * 1000;
let last = '';
while (Date.now() < deadline) {
  const s = await page.evaluate(() => ({
    boot: !!document.getElementById('boot'),
    canvas: !!document.querySelector('canvas'),
    api: typeof window.debugAPI !== 'undefined',
    ready: window.__READY__ === true,
    len: document.documentElement.outerHTML.length,
  }));
  const line = JSON.stringify(s);
  if (line !== last) {
    console.log(`[t+${((secs * 1000 - (deadline - Date.now())) / 1000).toFixed(0)}s]`, line);
    last = line;
  }
  if (s.ready) break;
  await new Promise((r) => setTimeout(r, 2000));
}
await browser.close();
