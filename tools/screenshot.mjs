#!/usr/bin/env node
/**
 * Headless screenshot harness. Boots (or reuses) the Vite dev server, then
 * captures every photo-mode scenario to screenshots/<name>.png using the
 * system Chrome via playwright-core (SwiftShader WebGL).
 *
 * Usage: node tools/screenshot.mjs [scenario ...]
 */
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import http from 'node:http';

const SCENARIOS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['vista', 'combat', 'ads', 'enemies', 'airstrike', 'airstrike2', 'tablet', 'menu'];

const PORT = Number(process.env.PORT || 5173);
const BASE = `http://localhost:${PORT}`;
const OUT = process.env.OUT || 'screenshots';

function serverUp() {
  return new Promise((resolve) => {
    const req = http.get(BASE, () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
  });
}

async function ensureServer() {
  if (await serverUp()) return null;
  console.log('[shots] starting vite dev server...');
  const child = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', String(PORT)], {
    cwd: new URL('..', import.meta.url).pathname,
    stdio: 'ignore',
    detached: true,
  });
  child.unref();
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await serverUp()) return child;
  }
  throw new Error('vite dev server did not come up');
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  await ensureServer();

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
    ],
  });

  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  for (const name of SCENARIOS) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(String(err)));

    const t0 = Date.now();
    console.log(`[shots] ${name}: loading...`);
    try {
      await page.goto(`${BASE}/?photo=${name}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(
        () => window.__PHOTO_READY === true || window.__PHOTO_FAIL,
        null,
        { timeout: 240000, polling: 250 }
      );
      const fail = await page.evaluate(() => window.__PHOTO_FAIL || null);
      if (fail) {
        console.error(`[shots] ${name}: BOOT FAIL → ${fail}`);
      } else {
        await page.screenshot({ path: `${OUT}/${name}.png` });
        console.log(`[shots] ${name}: captured in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      }
    } catch (err) {
      console.error(`[shots] ${name}: ERROR → ${err.message}`);
      try { await page.screenshot({ path: `${OUT}/${name}-error.png` }); } catch {}
    }
    if (errors.length) {
      console.error(`[shots] ${name}: console errors:\n  ${[...new Set(errors)].slice(0, 12).join('\n  ')}`);
    }
    await page.close();
  }

  await browser.close();
  console.log('[shots] done.');
}

main().catch((e) => { console.error(e); process.exit(1); });
