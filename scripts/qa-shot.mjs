#!/usr/bin/env node
/**
 * One-off screenshot helper for interface states the timed tour cannot reach,
 * such as the entry gate before audio is unlocked.
 *
 *   node scripts/qa-shot.mjs gate qa/screenshots/ui-gate.png
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const [what = 'gate', outArg = 'qa/screenshots/ui-gate.png'] = process.argv.slice(2);
const out = path.isAbsolute(outArg) ? outArg : path.join(ROOT, outArg);
const BASE = 'http://127.0.0.1:4173';

async function waitForServer(url, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server not up at ${url}`);
}

const server = spawn('npm', ['run', 'preview'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
server.stdout.on('data', () => {});

let browser;
try {
  await waitForServer(BASE);
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    args: [
      '--headless=new', '--use-gl=angle', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--mute-audio',
    ],
  });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });

  if (what === 'gate') {
    // Wait until loading finishes and the enter button is live.
    await page.waitForFunction(() => {
      const b = document.querySelector('.gate__enter');
      return b instanceof HTMLButtonElement && !b.disabled;
    }, null, { timeout: 240000 });
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: out });
  console.log(`Wrote ${out}`);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 300));
  if (!server.killed) server.kill('SIGKILL');
}
