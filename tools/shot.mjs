#!/usr/bin/env node
/*
 * Headless screenshot tool for the parts preview.
 *
 *   node tools/shot.mjs xwing
 *   node tools/shot.mjs xwing vader r2d2 --out tmp/shots --w 1200 --h 800
 *   node tools/shot.mjs stardestroyer --az 120 --el 35 --spin 0 --wait 1500
 *   node tools/shot.mjs --list
 *
 * Writes PNGs to tmp/shots/<item>.png by default and prints any page errors,
 * so a build can be eyeballed without a desktop.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import path from 'path';

const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const PORT = +(process.env.PREVIEW_PORT || 5173);
const ORIGIN = `http://127.0.0.1:${PORT}`;

const argv = process.argv.slice(2);
const items = [];
// az 205 puts the camera in front: builds face -Z, the three.js forward axis.
const opt = { w: 1280, h: 820, az: 205, el: 18, spin: '0', wait: 1200, out: 'tmp/shots', dist: '', plate: '1', bg: '' };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    if (k === 'list') { opt.list = true; continue; }
    opt[k] = argv[++i];
  } else items.push(a);
}

async function up() {
  try {
    const r = await fetch(ORIGIN + '/preview.html', { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch { return false; }
}

async function ensureServer() {
  if (await up()) return null;
  console.error(`[shot] starting vite on ${PORT} ...`);
  const p = spawn('npx', ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    cwd: process.cwd(), stdio: 'ignore', detached: true,
  });
  p.unref();
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await up()) return p;
  }
  throw new Error('vite did not come up');
}

(async () => {
  await ensureServer();
  if (!existsSync(CHROME)) throw new Error('chrome not found at ' + CHROME);
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      '--no-sandbox', '--disable-dev-shm-usage',
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--enable-webgl', '--ignore-gpu-blocklist', '--disable-lcd-text',
      '--hide-scrollbars', '--mute-audio',
    ],
  });
  const page = await browser.newPage({ viewport: { width: +opt.w, height: +opt.h }, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));

  if (opt.list || items.length === 0) {
    await page.goto(`${ORIGIN}/preview.html`, { waitUntil: 'load' });
    await page.waitForFunction('window.__READY__ === true', null, { timeout: 60000 }).catch(() => {});
    const list = await page.evaluate('window.__EXHIBITS__ || []');
    console.log('exhibits (%d):\n  %s', list.length, list.join('\n  '));
    const errs = await page.evaluate('window.__ERRORS__ || []');
    if (errs.length) console.log('\nmodule errors:\n' + errs.join('\n'));
    if (logs.length) console.log('\nconsole:\n' + logs.slice(0, 20).join('\n'));
    await browser.close();
    return;
  }

  mkdirSync(opt.out, { recursive: true });
  for (const item of items) {
    logs.length = 0;
    const q = new URLSearchParams({ item, az: opt.az, el: opt.el, spin: opt.spin, wait: String(opt.wait), plate: opt.plate });
    if (opt.dist) q.set('dist', opt.dist);
    if (opt.bg) q.set('bg', opt.bg);
    const url = `${ORIGIN}/preview.html?${q}`;
    await page.goto(url, { waitUntil: 'load' });
    const ok = await page.waitForFunction('window.__READY__ === true', null, { timeout: 90000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(400);
    const file = path.join(opt.out, `${item.replace(/[^\w.-]/g, '_')}.png`);
    await page.screenshot({ path: file });
    const hud = await page.evaluate(() => document.getElementById('hud')?.innerText || '');
    console.log(`\n=== ${item} -> ${file}${ok ? '' : '  (TIMEOUT)'}\n${hud}`);
    const errs = await page.evaluate('window.__ERRORS__ || []');
    if (errs.length) console.log('errors:\n' + errs.join('\n'));
    if (logs.length) console.log('console:\n' + logs.slice(0, 12).join('\n'));
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
