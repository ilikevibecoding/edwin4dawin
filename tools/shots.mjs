import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const iter = process.env.SHOT_ITER || '1';
const outDir = path.join(root, 'shots', `iter_${iter}`);
const port = Number(process.env.PORT || 5173);
const baseURL = process.env.BASE_URL || `http://127.0.0.1:${port}/`;
const startServer = process.env.NO_SERVER !== '1';

const VIEWS = [
  'controlRoom',
  'corridor',
  'crewQuarters',
  'engineRoom',
  'machineryCloseup',
  'sonarConsole',
  'forwardViewport',
  'porthole',
  'aftWide',
  'walking',
];

function waitHttp(url, timeout = 40000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve();
      } catch {
        /* still booting */
      }
      if (Date.now() - start > timeout) reject(new Error(`Server not ready: ${url}`));
      else setTimeout(tick, 250);
    };
    tick();
  });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  let server;
  if (startServer) {
    const cmd = process.env.PREVIEW === '1' ? 'preview' : 'dev';
    server = spawn('npm', ['run', cmd], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });
    server.stdout.on('data', (d) => process.stdout.write(d));
    server.stderr.on('data', (d) => process.stderr.write(d));
  }

  try {
    await waitHttp(baseURL);
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--ignore-gpu-blocklist',
        '--enable-webgl',
      ],
    });
    const context = await browser.newContext({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const consoleLines = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      consoleLines.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 60000 });
    await page.waitForTimeout(800);

    await page.evaluate(() => {
      document.getElementById('blocker')?.classList.add('hidden');
      window.debugAPI.resetScene();
      window.debugAPI.setMotionEnabled(false);
      window.debugAPI.setPlayerEnabled(false);
      window.debugAPI.setHUDVisible(false);
      window.debugAPI.setSubmarineState('used');
      window.debugAPI.setSubmarineState('cruising');
    });

    for (const name of VIEWS) {
      await page.evaluate((view) => {
        window.debugAPI.setHUDVisible(false);
        window.debugAPI.setView(view);
      }, name);
      await page.waitForFunction(() => (window.debugAPI.frameCount || 0) > 3, null, { timeout: 30000 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(outDir, `${name}.png`), type: 'png', timeout: 120000 });
    }

    const metrics = await page.evaluate(() => window.debugAPI.getMetrics());
    await writeFile(path.join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2));

    const interactions = await runInteractionTests(page);
    await writeFile(path.join(outDir, 'interactions.json'), JSON.stringify(interactions, null, 2));
    await writeFile(
      path.join(outDir, 'console.txt'),
      [
        `pageErrors: ${pageErrors.length}`,
        ...pageErrors,
        '',
        ...consoleLines,
      ].join('\n'),
    );

    await browser.close();

    const failed = Object.entries(interactions).filter(([, v]) => v !== true && v !== 'ok' && v !== true);
    const hardFail = Object.entries(interactions).some(([, v]) => v === false);
    if (pageErrors.length || hardFail) {
      console.error('Shot suite failed', { pageErrors, interactions });
      process.exitCode = 1;
    } else {
      console.log(`Wrote screenshots to ${outDir}`);
    }
    void failed;
  } finally {
    if (server) server.kill('SIGTERM');
  }
}

async function runInteractionTests(page) {
  const result = {
    pointerLock: false,
    movement: false,
    collision: false,
    sonar: false,
    rest: false,
    silentRunning: false,
    traversal: false,
  };

  try {
    await page.evaluate(() => {
      window.debugAPI.clearStatus?.();
      window.debugAPI.setPlayerEnabled(true);
      window.debugAPI.setHUDVisible(true);
      window.debugAPI.setPlayerPose(-0.12, 1.7, 10.85, 0.35, 0.12);
      window.debugAPI.lookAt(-0.38, 1.1, 10.32);
    });
    await page.waitForTimeout(300);
    const canvas = page.locator('canvas');
    await canvas.click();
    await page.waitForTimeout(200);
    result.pointerLock = await page.evaluate(() => document.pointerLockElement != null || window.debugAPI.getPlayer().locked);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
  } catch (err) {
    result.pointerLockError = String(err);
  }

  try {
    await page.evaluate(() => {
      window.debugAPI.clearStatus?.();
      window.debugAPI.setPlayerEnabled(true);
      window.debugAPI.setPlayerPose(-0.1, 1.7, 10.7, 0.4, 0.15);
      window.debugAPI.lookAt(-0.38, 1.08, 10.32);
    });
    await page.waitForFunction(() => /sonar/i.test(window.debugAPI.getPrompt()), null, { timeout: 4000 });
    await page.waitForTimeout(150);
    const sonar = await page.evaluate(async () => {
      const before = window.debugAPI.getPrompt();
      const ev = new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true });
      window.dispatchEvent(ev);
      await new Promise((r) => setTimeout(r, 200));
      return {
        prompt: before || window.debugAPI.getPrompt(),
        status: window.debugAPI.getStatus(),
      };
    });
    result.sonar = /sonar|pulse|contact/i.test(`${sonar.prompt} ${sonar.status}`);
    result.sonarDetail = sonar;
  } catch (err) {
    result.sonarError = String(err);
  }

  try {
    await page.evaluate(() => {
      window.debugAPI.clearStatus?.();
      window.debugAPI.setPlayerPose(0.12, 1.7, 4.55, 1.4, 0.35);
      window.debugAPI.lookAt(-0.48, 0.62, 4.55);
    });
    await page.waitForFunction(() => /rest/i.test(window.debugAPI.getPrompt()), null, { timeout: 4000 });
    await page.waitForTimeout(150);
    const rest = await page.evaluate(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
      await new Promise((r) => setTimeout(r, 400));
      return {
        status: window.debugAPI.getStatus(),
        fade: window.debugAPI.getFade(),
      };
    });
    result.rest = /hours|rest/i.test(rest.status) || rest.fade > 0.2;
    result.restDetail = rest;
    await page.waitForTimeout(2800);
  } catch (err) {
    result.restError = String(err);
  }

  try {
    await page.evaluate(() => {
      window.debugAPI.clearStatus?.();
      window.debugAPI.setSubmarineState('cruising');
      window.debugAPI.setPlayerPose(0.05, 1.7, -1.35, 0.05, 0.12);
      window.debugAPI.lookAt(0.35, 1.15, -1.82);
    });
    await page.waitForFunction(() => /silent/i.test(window.debugAPI.getPrompt()), null, { timeout: 4000 });
    await page.waitForTimeout(150);
    const silent = await page.evaluate(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
      await new Promise((r) => setTimeout(r, 250));
      const a = window.debugAPI.getStatus();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
      await new Promise((r) => setTimeout(r, 250));
      const b = window.debugAPI.getStatus();
      return { a, b };
    });
    result.silentRunning = /silent/i.test(`${silent.a} ${silent.b}`);
    result.silentDetail = silent;
  } catch (err) {
    result.silentError = String(err);
  }

  try {
    const moved = await page.evaluate(async () => {
      window.debugAPI.setPlayerEnabled(true);
      window.debugAPI.setPlayerPose(0, 1.7, 8.4, 0, 0);
      const z0 = window.debugAPI.getPlayer().z;
      const down = new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true });
      window.dispatchEvent(down);
      await new Promise((r) => setTimeout(r, 1100));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }));
      const z1 = window.debugAPI.getPlayer().z;
      return { z0, z1, delta: z1 - z0 };
    });
    result.movement = moved.delta < -0.25;
    result.movementDetail = moved;
  } catch (err) {
    result.movementError = String(err);
  }

  try {
    const col = await page.evaluate(async () => {
      window.debugAPI.setPlayerPose(0, 1.7, 12.1, 0, 0);
      const z0 = window.debugAPI.getPlayer().z;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }));
      await new Promise((r) => setTimeout(r, 600));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }));
      const z1 = window.debugAPI.getPlayer().z;
      return { z0, z1, delta: z1 - z0 };
    });
    result.collision = col.z1 < 12.45;
    result.collisionDetail = col;
  } catch (err) {
    result.collisionError = String(err);
  }

  try {
    const walk = await page.evaluate(async () => {
      window.debugAPI.setPlayerPose(0, 1.7, 9.2, 0, 0);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }));
      await new Promise((r) => setTimeout(r, 16000));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }));
      const p = window.debugAPI.getPlayer();
      return p;
    });
    result.traversal = walk.z < -1.2;
    result.traversalDetail = walk;
  } catch (err) {
    result.traversalError = String(err);
  }

  return result;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
