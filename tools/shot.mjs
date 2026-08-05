// Generic headless capture: loads a page, waits for a readiness flag, saves PNGs.
//   node tools/shot.mjs --url /viewer.html --out shots/x.png [--w 1280 --h 720] [--ready window.__ready]
//   node tools/shot.mjs --url /viewer.html --out shots/x --shots 3   (page exposes window.__shot(i))
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};

const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const url = arg('url', '/index.html');
const out = arg('out', 'shots/shot.png');
const W = Number(arg('w', 1280));
const H = Number(arg('h', 720));
const readyExpr = arg('ready', 'window.__ready === true');
const timeout = Number(arg('timeout', 300000));

export async function launch() {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: 'shell',
    protocolTimeout: 900000,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--disable-frame-rate-limit',
      '--disable-gpu-vsync',
      '--hide-scrollbars',
      '--mute-audio',
      '--js-flags=--max-old-space-size=4096',
    ],
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const browser = await launch();
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });
  page.on('pageerror', (e) => console.log('pageerror:', String(e).slice(0, 400)));
  page.on('console', (m) => {
    const type = m.type();
    if (type === 'error' || type === 'warning' || type === 'warn') {
      const text = m.text();
      if (!/favicon|404/.test(text)) console.log(`console.${type}:`, text.slice(0, 500));
    } else if (String(m.text()).startsWith('[shot]')) console.log(m.text());
  });
  await page.goto(BASE + url, { waitUntil: 'load', timeout });
  await page.waitForFunction(readyExpr, { timeout });

  const names = await page.evaluate(() => (window.__shotNames ? window.__shotNames() : null));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (names && names.length) {
    for (let i = 0; i < names.length; i++) {
      await page.evaluate((idx) => window.__shot(idx), i);
      await page.waitForFunction('window.__shotDone === true', { timeout });
      const file = out.endsWith('.png') ? out.replace(/\.png$/, `_${names[i]}.png`) : `${out}_${names[i]}.png`;
      await page.screenshot({ path: file });
      console.log('wrote', file);
      await page.evaluate(() => (window.__shotDone = false));
    }
  } else {
    await page.screenshot({ path: out });
    console.log('wrote', out);
  }
  await browser.close();
}
