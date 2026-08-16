// Shared helpers for screenshot/test tooling.
import { createServer, preview } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

export async function startServer({ prod = false } = {}) {
  const port = 5200 + Math.floor(Math.random() * 3200);
  if (prod) {
    const server = await preview({ preview: { port, strictPort: false, host: '127.0.0.1' } });
    const url = server.resolvedUrls.local[0];
    return { server, url, close: () => new Promise((r) => server.httpServer.close(r)) };
  }
  const server = await createServer({ server: { port, strictPort: false, host: '127.0.0.1' }, logLevel: 'warn' });
  await server.listen();
  const url = server.resolvedUrls.local[0];
  return { server, url, close: () => server.close() };
}

export async function launchBrowser() {
  return chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    args: [
      '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--force-color-profile=srgb', '--disable-lcd-text',
      '--hide-scrollbars', '--mute-audio',
    ],
  });
}

export async function openApp(browser, url, { seed = 1337, quality = 'high', collect = null } = {}) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  if (collect) {
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      collect.console.push(`[${type}] ${text}`);
      if (type === 'error') collect.errors.push(text);
    });
    page.on('pageerror', (err) => {
      collect.pageErrors.push(String(err && err.message ? err.message : err));
    });
  }
  await page.goto(`${url}?seed=${seed}&quality=${quality}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__ready === true && !!window.debugAPI, null, { timeout: 120000 });
  return page;
}

export async function applyBaseline(page, { state = 'cruising', wear = 'used' } = {}) {
  await page.evaluate(({ state, wear }) => {
    window.debugAPI.setSubmarineState(wear);
    window.debugAPI.setSubmarineState(state);
    window.debugAPI.setMotionEnabled(false);
    window.debugAPI.setPlayerEnabled(false);
    window.debugAPI.setHUDVisible(false);
  }, { state, wear });
  await page.waitForTimeout(700);
}

export async function shootView(page, view, outPath, { settleMs = 2000 } = {}) {
  const ok = await page.evaluate((v) => window.debugAPI.setView(v), view);
  if (!ok) throw new Error(`unknown view: ${view}`);
  await page.waitForTimeout(settleMs);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath });
  return outPath;
}
