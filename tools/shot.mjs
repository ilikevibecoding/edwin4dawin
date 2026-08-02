#!/usr/bin/env node
/**
 * Headless screenshot of one lab model. This is how you check your work:
 *
 *   npm run shot -- --m=xwing --out=/tmp/xwing.png --az=40 --el=18
 *
 * Options are passed straight through to lab.html as query params, so
 * --bg=space --t=3 --spin=0 --dist=90 --grid=0 all work.
 */
import puppeteer from 'puppeteer';
import { createServer } from 'vite';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

const args = Object.fromEntries(process.argv.slice(2)
  .filter((a) => a.startsWith('--'))
  .map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));

const out = resolve(args.out || '/tmp/shot.png');
delete args.out;
const W = +(args.w || 1100), H = +(args.h || 700);

const server = await createServer({
  root: resolve(import.meta.dirname, '..'),
  configFile: false,
  // Random port: several agents run this tool at the same time.
  server: { port: 20000 + Math.floor(Math.random() * 30000), host: '127.0.0.1', strictPort: false },
  logLevel: 'error',
});
await server.listen();
const port = server.httpServer.address().port;

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
  args: [
    '--no-sandbox', '--disable-setuid-sandbox',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--disable-dev-shm-usage', '--hide-scrollbars',
    `--window-size=${W},${H}`,
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack || ''}`));

const qs = new URLSearchParams({ ...args, w: String(W), h: String(H) }).toString();
const url = `http://127.0.0.1:${port}/lab.html?${qs}`;
process.stderr.write(`shot: ${url}\n`);

let failed = false;
try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !!(window.__lab && window.__lab.ready), { timeout: 60000 });
  await page.evaluate(() => window.__lab.ready);
  await page.evaluate((t) => window.__lab.renderAt(t), +(args.t || 0));
  await new Promise((r) => setTimeout(r, 350));
  await page.evaluate((t) => window.__lab.renderAt(t), +(args.t || 0));
  mkdirSync(dirname(out), { recursive: true });
  await page.screenshot({ path: out });
  const info = await page.evaluate(() => window.__lab.info);
  process.stdout.write(`${info}\nwrote ${out}\n`);
} catch (e) {
  failed = true;
  process.stderr.write(`FAILED: ${e.message}\n`);
} finally {
  const errs = logs.filter((l) => /error|warn|pageerror/i.test(l));
  if (errs.length) process.stderr.write('--- console ---\n' + errs.slice(0, 40).join('\n') + '\n');
  await browser.close();
  await server.close();
  process.exit(failed ? 1 : 0);
}
