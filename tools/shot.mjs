#!/usr/bin/env node
/**
 * Headless capture harness.
 *
 * Boots the game in Chrome with SwiftShader, drives it through a named
 * camera shot defined in src/dev/shots.ts, and writes a PNG. Also relays
 * page console output so renderer errors surface in CI logs.
 *
 * usage: node tools/shot.mjs --shot=overview --out=shots/overview.png
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? 'true'] : [a, 'true'];
  })
);

const url = args.url ?? 'http://127.0.0.1:4173/';
const shot = args.shot ?? 'overview';
const out = resolve(args.out ?? `shots/${shot}.png`);
const width = Number(args.w ?? 1920);
const height = Number(args.h ?? 1080);
const waitMs = Number(args.wait ?? 0);
const timeoutMs = Number(args.timeout ?? 240000);

mkdirSync(dirname(out), { recursive: true });

const CHROME =
  process.env.CHROME_PATH ??
  ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) =>
    existsSync(p)
  );

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'shell',
  protocolTimeout: timeoutMs + 60000,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--disable-gpu-sandbox',
    '--hide-scrollbars',
    `--window-size=${width},${height}`,
    '--force-device-scale-factor=1',
    '--font-render-hinting=none',
    '--js-flags=--max-old-space-size=6144',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 1 });

const logs = [];
page.on('console', (m) => {
  const t = `[${m.type()}] ${m.text()}`;
  logs.push(t);
  if (m.type() === 'error' || m.type() === 'warning') console.error('  page', t);
});
page.on('pageerror', (e) => {
  logs.push(`[pageerror] ${e.message}`);
  console.error('  page [pageerror]', e.message);
});

let exitCode = 0;
try {
  // Tell the app to boot in capture mode before any module evaluates.
  await page.evaluateOnNewDocument((s) => {
    window.__CAPTURE__ = { shot: s };
  }, shot);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // The app resolves this once the requested shot is composed and the
  // renderer has settled (TAA converged, streaming done).
  await page.waitForFunction(() => window.__CAPTURE_READY__ === true, {
    timeout: timeoutMs,
    polling: 250,
  });

  if (waitMs) await new Promise((r) => setTimeout(r, waitMs));

  await page.screenshot({ path: out, type: 'png', captureBeyondViewport: false });
  const stats = await page.evaluate(() => window.__CAPTURE_STATS__ ?? null);
  console.log(`ok  ${shot} -> ${out}${stats ? '  ' + JSON.stringify(stats) : ''}`);
} catch (err) {
  exitCode = 1;
  console.error(`FAIL ${shot}: ${err.message}`);
  console.error('--- page log tail ---');
  console.error(logs.slice(-40).join('\n'));
  try {
    await page.screenshot({ path: out.replace(/\.png$/, '.fail.png'), type: 'png' });
  } catch {}
} finally {
  await browser.close();
}

process.exit(exitCode);
