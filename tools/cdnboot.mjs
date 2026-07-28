#!/usr/bin/env node
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

// Reports whether the app's own markup and module actually turned up in the
// document, with a short window. Proxied previewers inject content after load,
// so presence has to be polled rather than read once at DOMContentLoaded.
//
//   node tools/cdnboot.mjs <url> [seconds] [out.png]

const url = process.argv[2];
const secs = Number(process.argv[3] ?? 45);
const shotPath = process.argv[4] ?? null;
if (!url) {
  console.error('usage: node tools/cdnboot.mjs <url> [seconds] [out.png]');
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

// Proving pixels, not just a booted canvas. A hosted build cannot pass debugAPI's
// capture flag (a previewer's query string is the target URL), so there is no
// preserveDrawingBuffer to read back and the compositor screenshot is all there
// is — take a few and keep the brightest, since an early one can catch a frame
// that has not been presented yet.
if (shotPath) {
  let best = null;
  let bestLuma = -1;
  for (let i = 0; i < 2; i++) {
    await page.waitForTimeout(3000);
    // A hosted build gets no ?quality=fast, so under SwiftShader one frame is
    // minutes, and screenshot() blocks on a frame being presented.
    const buf = await page.screenshot({ type: 'png', timeout: 420000 });
    // mean of a coarse sample of the PNG's bytes is enough to rank "black" against
    // "an image", without decoding it
    let sum = 0;
    for (let j = 0; j < buf.length; j += 97) sum += buf[j];
    const score = sum / Math.ceil(buf.length / 97);
    console.log(`[shot ${i}] ${buf.length} bytes score ${score.toFixed(1)}`);
    if (score > bestLuma) {
      bestLuma = score;
      best = buf;
    }
  }
  await writeFile(shotPath, best);
  console.log('[shot] wrote', shotPath);
}

await browser.close();
