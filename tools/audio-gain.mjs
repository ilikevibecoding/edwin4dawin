#!/usr/bin/env node
/**
 * Master-chain response probe.
 *
 * Renders one weapon at a sweep of source volumes and reports what arrives at
 * the destination, so the weapon trims can be set against the chain's measured
 * transfer curve instead of against an arithmetic model of a saturator, two
 * compressors and a soft-clipper in series. Development aid.
 */
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  if (i === -1) return d;
  const v = argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const CHROME = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-dev-shm-usage',
    '--autoplay-policy=no-user-gesture-required',
  ],
  protocolTimeout: 1800000,
  defaultViewport: { width: 640, height: 360 },
});
const page = await browser.newPage();
page.setDefaultTimeout(1800000);
page.on('pageerror', (e) => console.log(' pageerror', e.message));

const u = new global.URL(String(arg('url', 'http://127.0.0.1:5173/')));
u.searchParams.set('capture', '1');
u.searchParams.set('quality', 'high');
await page.goto(u.href, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__GAME__?.ready === true, { timeout: 240000, polling: 250 });
await page.waitForFunction(() => !!window.__AUDIO__, { timeout: 60000, polling: 100 });
await page.evaluate(() => window.__GAME__?.engine?.tryGet?.('audio')?.resume?.()).catch(() => {});
await page.evaluate(() => window.__AUDIO__.bakeAll());

const GUNS = String(arg('guns', 'rifle,smg,sniper,shotgun,pistol')).split(',');
const VOLS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];

const rows = await page.evaluate(
  async (guns, vols) => {
    const A = window.__AUDIO__;
    const res = {};
    for (const g of guns) {
      res[g] = [];
      for (const v of vols) {
        const m = await A.render({
          kind: 'shot',
          id: g,
          distance: 0,
          zone: 'street',
          seed: 12345,
          volume: v,
          seconds: 0.55,
        });
        res[g].push(
          m.ok
            ? { v, peak: +m.peak.toFixed(4), rms: +m.rms.toFixed(5), crest: m.crest, over: m.over }
            : { v, error: m.error },
        );
      }
    }
    return res;
  },
  GUNS,
  VOLS,
);

for (const g of GUNS) {
  console.log(`\n${g}`);
  console.log('    volume    peak      rms    crest');
  for (const r of rows[g] ?? []) {
    if (r.error) {
      console.log(`    ${String(r.v).padStart(5)}  ${r.error}`);
      continue;
    }
    console.log(
      `    ${String(r.v).padStart(6)}  ${r.peak.toFixed(4)}  ${r.rms.toFixed(5)}  ${String(r.crest).padStart(6)}${r.over ? '  OVER' : ''}`,
    );
  }
}
await browser.close();
