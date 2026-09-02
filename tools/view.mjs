#!/usr/bin/env node
// Render /dev/viewer.html with the given query string to a PNG (dev server must be running).
//   node tools/view.mjs "m=/assets/models/weapons/M4A1.glb&v=side&axes=1" /tmp/out.png
import puppeteer from 'puppeteer-core';
const [query, out = '/tmp/view.png'] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  defaultViewport: { width: 1280, height: 720 },
});
const page = await browser.newPage();
page.on('console', (m) => { const t = m.text(); if (!/deprecated|Multiple instances|favicon/.test(t)) console.log(t); });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`http://localhost:5173/dev/viewer.html?${query}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__done === true, { timeout: 180000 });
await page.screenshot({ path: out });
console.log('saved', out);
await browser.close();
