/** Shared headless-Chrome plumbing for the frame grabbers. */
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
};

/**
 * Serve a directory over HTTP on an ephemeral port.
 *
 * Rendering from `dist/` rather than the dev server matters while several
 * agents are editing the repo: Vite's HMR reloads the page on every save,
 * which destroys a render half way through.
 */
export function startStaticServer(dir) {
  const root = path.resolve(dir);
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(root, p);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ url: `http://127.0.0.1:${port}`, close: () => server.close() });
    });
  });
}

/** Build the site and serve `dist/`. Returns the same shape as startStaticServer. */
export async function buildAndServe(root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')) {
  execFileSync('npx', ['vite', 'build', '--logLevel', 'error'], { cwd: root, stdio: 'inherit' });
  return startStaticServer(path.join(root, 'dist'));
}

export const CHROME = process.env.CHROME_BIN || '/usr/local/bin/google-chrome';

export const CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-gpu-vsync',
  '--hide-scrollbars',
  '--mute-audio',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-features=CalculateNativeWinOcclusion',
  '--js-flags=--max-old-space-size=3072',
];

export async function openFilm({
  base = 'http://localhost:5173',
  width = 1280,
  height = 720,
  t0 = 0,
  t1 = null,
  scene = null,
  bloom = true,
  all = false,
  quiet = false,
  timeout = 240000,
} = {}) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: [...CHROME_ARGS, `--window-size=${width},${height}`],
    protocolTimeout: 600000,
  });
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  const errors = [];
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error') errors.push(t);
    if (!quiet) console.log(`  [page:${m.type()}] ${t}`);
  });
  page.on('pageerror', (e) => {
    errors.push(e.message);
    if (!quiet) console.log('  [pageerror]', e.message);
  });

  const q = new URLSearchParams({ render: '1', w: String(width), h: String(height), t0: String(t0) });
  if (t1 !== null) q.set('t1', String(t1));
  if (scene) q.set('scene', scene);
  if (!bloom) q.set('bloom', '0');
  if (all) q.set('all', '1');

  await page.goto(`${base}/?${q}`, { waitUntil: 'domcontentloaded', timeout });
  try {
    await page.waitForFunction('window.FILM_READY === true || window.FILM_ERROR', { timeout, polling: 200 });
  } catch (e) {
    const err = await page.evaluate('window.FILM_ERROR || null');
    throw new Error(`film failed to boot: ${err || e.message}\n${errors.join('\n')}`);
  }
  const bootError = await page.evaluate('window.FILM_ERROR || null');
  if (bootError) throw new Error('film boot error: ' + bootError);

  const info = await page.evaluate('({duration: window.FILM.duration, scenes: window.FILM.scenes})');
  return { browser, page, errors, ...info };
}
