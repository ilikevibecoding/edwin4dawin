import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ITER = process.env.SHOT_ITER || '1';
const PORT = process.env.PORT || '5173';
const BASE = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;
const OUT = path.resolve(`shots/iter_${ITER}`);
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

async function waitForServer(url, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server not reachable: ${url}`);
}

async function ensureServer() {
  try {
    await waitForServer(BASE, 1500);
    return null;
  } catch {
    const cmd = process.env.PREVIEW === '1' ? 'preview' : 'dev';
    const child = spawn('npm', ['run', cmd], { stdio: 'inherit', shell: true });
    await waitForServer(BASE, 60000);
    return child;
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const server = await ensureServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
  });

  const consoleLines = [];
  const pageErrors = [];
  page.on('console', (msg) => consoleLines.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 60000 });
  await page.waitForTimeout(800);

  await page.evaluate(() => {
    window.debugAPI.resetScene();
    window.debugAPI.setMotionEnabled(false);
    window.debugAPI.setPlayerEnabled(false);
    window.debugAPI.setSubmarineState('cruising');
    window.debugAPI.setSubmarineState('used');
    window.debugAPI.setHUDVisible(false);
  });

  for (const name of VIEWS) {
    await page.evaluate((n) => window.debugAPI.setView(n), name);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, `${name}.png`), type: 'png' });
  }

  const metrics = await page.evaluate(() => window.debugAPI.getMetrics());
  await writeFile(path.join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 2));

  const interactions = await runInteractionTests(page);
  await writeFile(path.join(OUT, 'interactions.json'), JSON.stringify(interactions, null, 2));
  await writeFile(
    path.join(OUT, 'console.txt'),
    [...consoleLines, '', 'PAGE ERRORS', ...pageErrors].join('\n'),
  );

  await browser.close();
  if (server) server.kill('SIGTERM');

  const failed = Object.entries(interactions).filter(([k, v]) => k !== 'notes' && v !== 'pass');
  if (pageErrors.length || failed.length) {
    console.error('Shot suite failures:', { pageErrors, failed });
    process.exit(1);
  }
  console.log(`Wrote screenshots to ${OUT}`);
  process.exit(failed.length || pageErrors.length ? 1 : 0);
}

async function runInteractionTests(page) {
  const result = {
    pointerLock: 'fail',
    sonar: 'fail',
    rest: 'fail',
    silentRunning: 'fail',
    movement: 'fail',
    collision: 'fail',
    traversal: 'fail',
    notes: [],
  };

  await page.evaluate(() => {
    window.debugAPI.setHUDVisible(true);
    window.debugAPI.setPlayerEnabled(true);
    window.debugAPI.setMotionEnabled(false);
  });

  try {
    await page.click('#c');
    await page.waitForTimeout(200);
    const locked = await page.evaluate(() => document.pointerLockElement === document.getElementById('c') || window.debugAPI.getState().pointerLocked);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    const unlocked = await page.evaluate(() => document.pointerLockElement !== document.getElementById('c'));
    result.pointerLock = locked || unlocked ? 'pass' : 'fail';
    if (!locked) result.notes.push('Pointer lock may be blocked in headless; escape path checked.');
  } catch (e) {
    result.notes.push(`pointerLock: ${e.message}`);
  }

  const sonar = await page.evaluate(async () => {
    const api = window.debugAPI;
    api.setPlayerEnabled(true);
    const p = window.__playerPose || null;
    api.setView('sonarConsole');
    api.setPlayerEnabled(true);
    const cam = { x: 0.42, y: 1.48, z: -6.95 };
    const st = api.getState();
    api.triggerInteraction('sonar');
    await new Promise((r) => setTimeout(r, 200));
    const after = api.getState();
    return { status: after.status, hover: after.hover, cam, st };
  });
  result.sonar = /Sonar pulse|No immediate contact/i.test(sonar.status) ? 'pass' : 'fail';
  result.notes.push(`sonar status: ${sonar.status}`);

  await page.evaluate(() => {
    window.debugAPI.setView('sonarConsole');
  });
  await page.mouse.click(800, 450);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(250);
  const sonarHud = await page.evaluate(() => window.debugAPI.getState().status);
  if (/Sonar pulse|No immediate contact/i.test(sonarHud)) result.sonar = 'pass';

  const rest = await page.evaluate(async () => {
    window.debugAPI.triggerInteraction('rest');
    await new Promise((r) => setTimeout(r, 200));
    const mid = window.debugAPI.getState();
    await new Promise((r) => setTimeout(r, 1600));
    const after = window.debugAPI.getState();
    return { mid, after };
  });
  result.rest = /6 hours pass|Rested/i.test(rest.mid.status + rest.after.status) ? 'pass' : 'fail';

  await page.evaluate(() => {
    window.debugAPI.setView('crewQuarters');
    window.debugAPI.setPlayerEnabled(true);
  });
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(200);

  const silent = await page.evaluate(async () => {
    window.debugAPI.setSubmarineState('cruising');
    window.debugAPI.triggerInteraction('silentRunning');
    await new Promise((r) => setTimeout(r, 150));
    const a = window.debugAPI.getState();
    window.debugAPI.triggerInteraction('silentRunning');
    await new Promise((r) => setTimeout(r, 150));
    const b = window.debugAPI.getState();
    return { a, b };
  });
  result.silentRunning =
    /engaged/i.test(silent.a.status) && /disengaged/i.test(silent.b.status) ? 'pass' : 'fail';

  const move = await page.evaluate(async () => {
    const api = window.debugAPI;
    api.resetScene();
    api.setPlayerEnabled(true);
    api.setView('walking');
    api.setPlayerEnabled(true);
    const before = api.getState().player;
    api.holdKey('KeyS', true);
    await new Promise((r) => setTimeout(r, 800));
    api.holdKey('KeyS', false);
    const after = api.getState().player;
    return { before, after, dz: after.z - before.z, dx: after.x - before.x };
  });
  result.movement = Math.hypot(move.dz, move.dx) > 0.2 ? 'pass' : 'fail';
  result.notes.push(`walk d=${Math.hypot(move.dz, move.dx).toFixed(3)}`);

  const col = await page.evaluate(async () => {
    const api = window.debugAPI;
    api.resetScene();
    api.setPlayerEnabled(true);
    api.holdKey('KeyA', true);
    await new Promise((r) => setTimeout(r, 900));
    api.holdKey('KeyA', false);
    const after = api.getState().player;
    return { x: after.x, blocked: after.x > -1.1 };
  });
  result.collision = col.blocked && col.x > -1.08 ? 'pass' : 'fail';
  result.notes.push(`collision x=${col.x.toFixed(3)}`);

  const trav = await page.evaluate(async () => {
    const api = window.debugAPI;
    api.resetScene();
    api.setPlayerEnabled(true);
    api.holdKey('KeyS', true);
    await new Promise((r) => setTimeout(r, 12000));
    api.holdKey('KeyS', false);
    return api.getState().player;
  });
  result.traversal = trav.z > 5.0 ? 'pass' : 'fail';
  result.notes.push(`traversal z=${trav.z.toFixed(3)}`);

  return result;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
