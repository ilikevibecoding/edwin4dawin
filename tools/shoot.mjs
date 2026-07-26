#!/usr/bin/env node
/**
 * Headless capture harness.
 *
 * Boots the built game in Chrome with a software WebGL2 rasteriser, drives the
 * deterministic shot harness (`?shot=1`), and writes PNGs to `captures/`.
 *
 *   node tools/shoot.mjs                      # every scenario
 *   node tools/shoot.mjs street alley         # named scenarios
 *   node tools/shoot.mjs --tag before         # prefix the filenames
 *   node tools/shoot.mjs --size 1920x1080     # override resolution
 *   node tools/shoot.mjs --quality high
 *
 * Software rendering is slow; a 1600x900 frame with the full post stack takes
 * a few seconds. The timeouts below are sized for that, not for a real GPU.
 */

import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const argv = process.argv.slice(2);
const flags = {};
const scenarios = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) {
    flags[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  } else {
    scenarios.push(argv[i]);
  }
}

// `--fast` trades resolution and temporal convergence for turnaround; use it
// while iterating and drop it for a final review pass.
const FAST = !!flags.fast;
const [W, H] = (flags.size ?? (FAST ? '960x540' : '1600x900')).split('x').map(Number);
const QUALITY = flags.quality ?? (FAST ? 'medium' : 'high');
const TAG = flags.tag ? `${flags.tag}-` : '';
const outDir = resolve(root, String(flags.out ?? 'captures'));

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

/** Picks a free TCP port so parallel capture runs never collide. */
function freePort() {
  return new Promise((res, rej) => {
    const srv = createServer();
    srv.on('error', rej);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => res(port));
    });
  });
}

const PORT = Number(flags.port ?? (await freePort()));

function startServer() {
  return new Promise((res, rej) => {
    // `--dist` lets concurrent agents each build into their own output
    // directory instead of racing over a single `dist/`.
    const args = ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'];
    if (flags.dist) args.push('--outDir', String(flags.dist));
    const proc = spawn('npx', args, {
      cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
    });
    let settled = false;
    const onData = (buf) => {
      const s = buf.toString();
      if (!settled && /Local:|localhost:|127\.0\.0\.1:/.test(s)) {
        settled = true;
        res(proc);
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', rej);
    setTimeout(() => {
      if (!settled) {
        settled = true;
        res(proc);
      }
    }, 6000);
  });
}

const main = async () => {
  const server = await startServer();
  // Give vite preview a moment to bind.
  await new Promise((r) => setTimeout(r, 1200));

  const browser = await chromium.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--enable-webgl',
      '--disable-frame-rate-limit',
      '--disable-gpu-vsync',
      '--js-flags=--max-old-space-size=4096',
      '--force-device-scale-factor=1',
      '--autoplay-policy=no-user-gesture-required',
      '--mute-audio',
    ],
  });

  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });

  const logs = [];
  const verbose = !!flags.verbose;
  page.on('console', (m) => {
    const line = `[${m.type()}] ${m.text()}`;
    logs.push(line);
    if (verbose || m.type() === 'error' || line.includes('[boot]') || line.includes('[shot]')) {
      console.log('   ' + line);
    }
  });
  page.on('pageerror', (e) => {
    const line = `[pageerror] ${e.message}\n${e.stack ?? ''}`;
    logs.push(line);
    console.log('   ' + line);
  });

  const warmupQS = flags.warmup ? `&warmup=${flags.warmup}` : FAST ? '&warmup=14' : '';
  const url = `http://127.0.0.1:${PORT}/?shot=1&q=${QUALITY}${warmupQS}`;
  console.log(`→ ${url}  (${W}x${H}, quality=${QUALITY})`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  try {
    await page.waitForFunction(
      () => window.__SHOT_READY__ === true || window.__BOOT_ERROR__,
      { timeout: Number(flags.boottimeout ?? 600000), polling: 500 },
    );
  } catch (err) {
    console.error('✗ harness never became ready');
    console.error(logs.slice(-60).join('\n'));
    writeFileSync(resolve(outDir, 'boot-log.txt'), logs.join('\n'));
    await page.screenshot({ path: resolve(outDir, 'boot-failure.png') });
    await browser.close();
    server.kill();
    process.exit(1);
  }

  const bootError = await page.evaluate(() => window.__BOOT_ERROR__ ?? null);
  if (bootError) {
    console.error('✗ boot error:', bootError);
    console.error(logs.slice(-60).join('\n'));
    writeFileSync(resolve(outDir, 'boot-log.txt'), logs.join('\n'));
    await browser.close();
    server.kill();
    process.exit(1);
  }

  const available = await page.evaluate(() => window.__SHOT_SCENARIOS__);
  const list = scenarios.length > 0 ? scenarios.filter((s) => available.includes(s)) : available;
  if (list.length === 0) {
    console.error(`✗ no matching scenarios. available: ${available.join(', ')}`);
    await browser.close();
    server.kill();
    process.exit(1);
  }

  const written = [];
  for (const key of list) {
    const t0 = Date.now();
    process.stdout.write(`  ${key} … `);
    try {
      await page.evaluate((k) => window.__SHOT_RUN__(k), key);

      // Read the WebGL canvas directly rather than going through the
      // compositor: under software rasterisation a full page screenshot
      // forces another repaint and routinely exceeds any sane timeout.
      const dataUrl = await page.evaluate(() => {
        const canvas = document.getElementById('viewport');
        const hud = document.querySelector('#ui-root canvas');
        const out = document.createElement('canvas');
        out.width = canvas.width;
        out.height = canvas.height;
        const g = out.getContext('2d');
        g.drawImage(canvas, 0, 0);
        if (hud && hud.width > 0) g.drawImage(hud, 0, 0, out.width, out.height);
        return out.toDataURL('image/png');
      });

      const file = resolve(outDir, `${TAG}${key}.png`);
      writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
      written.push(file);
      console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      logs.push(`[scenario:${key}] ${err.message}`);
    }
  }

  writeFileSync(resolve(outDir, 'console.log'), logs.join('\n'));

  const errors = logs.filter((l) => l.startsWith('[error]') || l.startsWith('[pageerror]'));
  if (errors.length > 0) {
    console.log(`\n⚠ ${errors.length} console errors:`);
    console.log(errors.slice(0, 20).join('\n'));
  }

  console.log(`\n✓ wrote ${written.length} captures to ${outDir}`);
  await browser.close();
  try { process.kill(-server.pid); } catch { server.kill(); }
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
