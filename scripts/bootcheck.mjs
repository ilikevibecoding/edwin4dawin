#!/usr/bin/env node
/** Loads a URL, waits a fixed window, and reports boot progress plus console errors. */
import puppeteer from 'puppeteer-core';
import { writeFile } from 'node:fs/promises';

const url = process.argv[2];
const seconds = Number(process.argv[3] ?? 60);
const out = process.argv[4];

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  headless: true,
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--window-size=1280,720',
  ],
  protocolTimeout: 600000,
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 300)}`));
page.on('requestfailed', (r) => errors.push(`reqfail: ${r.url().slice(0, 120)} ${r.failure()?.errorText}`));
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url().slice(0, 120)}`);
});
page.on('console', (m) => {
  if (/error/i.test(m.type()) || /error/i.test(m.text())) errors.push(`console: ${m.text().slice(0, 300)}`);
});

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 300000 });
// Some raw-file CDNs gate HTML behind a click-through notice.
try {
  const link = await page.$x?.('//a[contains(., "Open the page")]');
  const btn = link?.[0] ?? (await page.$('a.btn, a[href*="index.html"]'));
  const text = await page.evaluate(() => document.body.innerText.slice(0, 200));
  if (/One more step|Open the page/i.test(text)) {
    console.log('(interstitial detected, clicking through)');
    await page.evaluate(() => {
      const a = [...document.querySelectorAll('a,button')].find((e) => /open the page/i.test(e.textContent || ''));
      a?.click();
    });
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => {});
  }
  void btn;
} catch {}
await new Promise((r) => setTimeout(r, seconds * 1000));
const state = await page.evaluate(() => ({
  hasEngine: !!window.__engine,
  frames: window.__engine?.clock?.frame ?? null,
  ready: window.__engineReady ?? false,
  loaderGone: document.getElementById('loader')?.className ?? null,
  menuVisible: !document.getElementById('menu')?.classList.contains('hidden'),
  title: document.title,
  bodyClass: document.body.className,
}));
console.log(JSON.stringify(state, null, 2));
console.log('errors:', errors.length ? `\n  ${[...new Set(errors)].slice(0, 12).join('\n  ')}` : 'none');
if (out) {
  await writeFile(out, await page.screenshot({ type: 'png' }));
  console.log(`shot: ${out}`);
}
await browser.close();
