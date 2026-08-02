import puppeteer from 'puppeteer';
import { createServer } from 'vite';
import { resolve } from 'path';

export const ROOT = resolve(import.meta.dirname, '..');

export async function startServer() {
  const server = await createServer({
    root: ROOT,
    configFile: false,
    server: { port: 20000 + Math.floor(Math.random() * 30000), host: '127.0.0.1', strictPort: false },
    logLevel: 'error',
  });
  await server.listen();
  return { server, port: server.httpServer.address().port };
}

export async function launch({ width, height, quiet = false } = {}) {
  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 900000,
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--disable-dev-shm-usage', '--hide-scrollbars', '--mute-audio',
      '--disable-frame-rate-limit', '--disable-gpu-vsync',
      '--js-flags=--max-old-space-size=4096',
      `--window-size=${width || 1280},${height || 720}`,
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: width || 1280, height: height || 720, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => {
    const s = `[${m.type()}] ${m.text()}`;
    logs.push(s);
    if (!quiet && /error/i.test(m.type())) process.stderr.write(s + '\n');
  });
  page.on('pageerror', (e) => {
    const s = `[pageerror] ${e.message}`;
    logs.push(s);
    process.stderr.write(s + '\n');
  });
  return { browser, page, logs };
}

/** Boot the film page and wait until every chapter is built. */
export async function openFilm(page, port, { width, height, quality = 'high', extra = '' } = {}) {
  const url = `http://127.0.0.1:${port}/index.html?capture=1&w=${width}&h=${height}&quality=${quality}${extra}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => !!window.__film, { timeout: 120000 });
  await page.evaluate(() => window.__film.ready);
  await page.evaluate(() => window.__film.hideBoot());
  return url;
}
