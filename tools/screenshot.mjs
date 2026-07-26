#!/usr/bin/env node
/**
 * Headless visual-QA harness.
 *
 * Boots the built game in Chrome with SwiftShader (no GPU in CI), drives it
 * through a scripted sequence of camera poses / gameplay states, and writes
 * PNGs plus a console-error log for the review agents to inspect.
 *
 * Usage:
 *   node tools/screenshot.mjs                       # default shot list
 *   node tools/screenshot.mjs --out shots/run3      # custom output dir
 *   node tools/screenshot.mjs --only sky,weapon     # subset of shots
 *   node tools/screenshot.mjs --width 1600 --height 900
 *   node tools/screenshot.mjs --settle 6000         # ms to let the frame converge
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
    return process.argv[i + 1];
  }
  return fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

const OUT = path.resolve(ROOT, arg('out', 'shots/latest'));
const WIDTH = parseInt(arg('width', '1600'), 10);
const HEIGHT = parseInt(arg('height', '900'), 10);
const SETTLE = parseInt(arg('settle', '9000'), 10);
const QUALITY = arg('quality', 'high');
const ONLY = arg('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const PORT = parseInt(arg('port', '4173'), 10);
const DIST = arg('dist', 'dist');

/**
 * Each shot names a scripted camera/gameplay state. The game exposes
 * `window.__SHOT__(name)` which returns a promise resolving once the state is
 * set up and the renderer has converged (TAA history flushed, particles warm).
 */
const SHOTS = [
  { name: '01_spawn_overview', desc: 'Player spawn looking down the main street' },
  { name: '02_weapon_hipfire', desc: 'Viewmodel at hip, mid-map' },
  { name: '03_weapon_ads', desc: 'Aiming down sights through the optic' },
  { name: '04_interior', desc: 'Inside a building, volumetric light shafts' },
  { name: '05_material_closeup', desc: 'Close-up of wall + prop materials' },
  { name: '06_skyline', desc: 'Sky, sun, atmospheric scattering, distant LODs' },
  { name: '07_combat', desc: 'Firefight: muzzle flash, tracers, enemies, impacts' },
  { name: '08_explosion', desc: 'Grenade detonation with debris and smoke' },
  { name: '09_airstrike_paint', desc: 'Airstrike targeting overlay' },
  { name: '10_airstrike_impact', desc: 'Airstrike detonation chain' },
  { name: '11_hud_full', desc: 'Full HUD with all elements populated' },
  { name: '12_night_or_dusk', desc: 'Alternate lighting scenario' },
];

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function main() {
  if (!existsSync(path.join(ROOT, DIST, 'index.html'))) {
    console.error(`${DIST}/ not found — run \`npx vite build --outDir ${DIST}\` first.`);
    process.exit(2);
  }

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // A previous aborted run can leave the port held; take it back.
  try {
    const { execSync } = await import('node:child_process');
    execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 500));
  } catch {
    /* fuser unavailable; strictPort will surface the conflict */
  }

  const server = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1', '--outDir', DIST],
    { cwd: ROOT, stdio: 'pipe', detached: true },
  );
  server.stdout.on('data', () => {});
  server.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`));
  const killServer = () => {
    try {
      process.kill(-server.pid, 'SIGKILL');
    } catch {
      server.kill('SIGKILL');
    }
  };
  process.on('exit', killServer);

  const baseUrl = `http://127.0.0.1:${PORT}/`;
  if (!(await waitForServer(baseUrl))) {
    killServer();
    throw new Error('preview server did not come up');
  }

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--disable-frame-rate-limit',
      '--js-flags=--max-old-space-size=4096',
      `--window-size=${WIDTH},${HEIGHT}`,
    ],
  });

  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });

  const logs = [];
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') logs.push(`[${t}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}\n${err.stack ?? ''}`));

  const url = `${baseUrl}?quality=${QUALITY}&capture=1${flag('nodemo') ? '&nodemo=1' : ''}`;
  console.log(`Loading ${url}`);
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });

  // Wait for the engine to report ready.
  try {
    await page.waitForFunction(() => window.GAME_READY === true, { timeout: 240000 });
  } catch {
    logs.push('[harness] GAME_READY never became true');
    const bootErr = await page
      .locator('#boot-error')
      .textContent()
      .catch(() => null);
    if (bootErr) logs.push(`[boot-error] ${bootErr}`);
    await page.screenshot({ path: path.join(OUT, '00_boot_failure.png') });
    await writeFile(path.join(OUT, 'console.log'), logs.join('\n'), 'utf8');
    await browser.close();
    killServer();
    process.exit(1);
  }

  console.log('Engine ready — letting the first frames converge...');
  await page.waitForTimeout(SETTLE);

  const hasShotApi = await page.evaluate(() => typeof window.__SHOT__ === 'function');
  const list = ONLY.length ? SHOTS.filter((s) => ONLY.some((o) => s.name.includes(o))) : SHOTS;

  const manifest = [];
  for (const shot of list) {
    let ok = true;
    if (hasShotApi) {
      try {
        await page.evaluate((n) => window.__SHOT__(n), shot.name);
      } catch (err) {
        logs.push(`[harness] __SHOT__("${shot.name}") threw: ${err}`);
        ok = false;
      }
      // Let TAA / motion blur history settle on the new pose.
      await page.waitForTimeout(2200);
    } else {
      // No shot API yet — just grab the live frame a few times.
      await page.waitForTimeout(1200);
    }
    const file = path.join(OUT, `${shot.name}.png`);
    await page.screenshot({ path: file });
    manifest.push({ ...shot, file: path.relative(ROOT, file), ok });
    console.log(`  captured ${shot.name}${ok ? '' : ' (state setup failed)'}`);
    if (!hasShotApi) break; // one generic frame is all we can get
  }

  const perf = await page
    .evaluate(() => {
      const g = window.GAME;
      if (!g) return null;
      return {
        fps: Math.round(g.time?.fps ?? 0),
        drawCalls: g.renderer?.info?.render?.calls ?? 0,
        triangles: g.renderer?.info?.render?.triangles ?? 0,
        programs: g.renderer?.info?.programs?.length ?? 0,
        geometries: g.renderer?.info?.memory?.geometries ?? 0,
        textures: g.renderer?.info?.memory?.textures ?? 0,
        quality: g.config?.tier ?? '?',
      };
    })
    .catch(() => null);

  await writeFile(
    path.join(OUT, 'manifest.json'),
    JSON.stringify({ width: WIDTH, height: HEIGHT, quality: QUALITY, perf, shots: manifest }, null, 2),
    'utf8',
  );
  await writeFile(path.join(OUT, 'console.log'), logs.join('\n') || '(clean)', 'utf8');

  console.log(`\nPerf: ${JSON.stringify(perf)}`);
  console.log(`Console issues: ${logs.length}`);
  console.log(`Output: ${OUT}`);

  await browser.close();
  killServer();

  if (logs.filter((l) => l.startsWith('[pageerror]')).length) process.exit(3);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
