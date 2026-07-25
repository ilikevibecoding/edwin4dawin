// Headless screenshot harness: boots the dev server build in Chromium (WebGL via
// SwiftShader in CI), waits for the game to report ready, optionally runs a
// setup snippet, then writes a PNG.
//
//   node tests/shot.mjs out.png [--url=...] [--wait=3000] [--eval="js"]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const out = resolve(args.find((a) => !a.startsWith('--')) ?? 'artifacts/shot.png');
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const url = flag('url', 'http://127.0.0.1:5173/?quality=low');
const waitMs = Number(flag('wait', '3500'));
const evalSnippet = flag('eval', '');
const width = Number(flag('width', '960'));
const height = Number(flag('height', '540'));
// Software rasterisation is far slower than a real GPU, so by default we let the
// game simulate for a while, then freeze the loop before asking for the frame.
const keepRunning = args.includes('--running');

mkdirSync(dirname(out), { recursive: true });

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
  ],
});
const page = await browser.newPage({ viewport: { width, height } });

const logs = [];
page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));

await page.goto(url, { waitUntil: 'load', timeout: 60000 });

// Wait for the game bootstrap to signal readiness (set by src/main.ts).
await page
  .waitForFunction(() => window.__gameReady === true, { timeout: 60000 })
  .catch(() => logs.push('[warn] __gameReady never became true'));

if (evalSnippet) {
  try {
    await page.evaluate(evalSnippet);
  } catch (err) {
    logs.push(`[eval error] ${err.message}`);
  }
}

await page.waitForTimeout(waitMs);

if (!keepRunning) {
  await page.evaluate(() => window.engine?.stop());
  await page.waitForTimeout(400);
}

await page.screenshot({ path: out, timeout: 120000, animations: 'disabled' });

const stats = await page.evaluate(() => {
  const info = window.engine?.renderer?.info;
  return info
    ? {
        frameMs: Number(window.engine.frameMs?.toFixed(1)),
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        programs: info.programs?.length ?? 0,
        textures: info.memory.textures,
      }
    : null;
});

console.log(JSON.stringify({ out, stats, logs }, null, 2));
await browser.close();
