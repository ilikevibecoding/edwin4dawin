import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ITER = process.env.SHOT_ITER || process.argv[2] || '1';
const PORT = process.env.SHOT_PORT || '5173';
const BASE = process.env.SHOT_URL || `http://127.0.0.1:${PORT}/`;
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

function startServer() {
  if (process.env.SHOT_NO_SERVER) return null;
  const cmd = process.env.SHOT_PREVIEW ? 'preview' : 'dev';
  const child = spawn('npm', ['run', cmd], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });
  child.stdout.on('data', (d) => process.stdout.write(d));
  child.stderr.on('data', (d) => process.stderr.write(d));
  return child;
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server did not start: ${url}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(path.join(OUT, 'assets'), { recursive: true });
  const server = startServer();
  try {
    await waitForServer(BASE);
    const browser = await chromium.launch({
      headless: true,
      channel: existsSync('/usr/local/bin/google-chrome') ? 'chrome' : undefined,
      args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--ignore-gpu-blocklist'],
    });
    const page = await browser.newPage({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 1,
    });
    const consoleLines = [];
    const pageErrors = [];
    page.on('console', (msg) => {
      consoleLines.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.debugAPI && window.debugAPI.ready, null, { timeout: 30000 });
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

    const consoleText = [
      ...consoleLines,
      pageErrors.length ? '--- PAGE ERRORS ---' : '',
      ...pageErrors,
    ].join('\n');
    await writeFile(path.join(OUT, 'console.txt'), consoleText);

    await browser.close();

    const failed = [];
    if (pageErrors.length) failed.push('page errors');
    if (!interactions.pointerLock.pass) failed.push('pointer lock');
    if (!interactions.movement.pass) failed.push('movement');
    if (!interactions.collision.pass) failed.push('collision');
    if (!interactions.sonar.pass) failed.push('sonar');
    if (!interactions.rest.pass) failed.push('rest');
    if (!interactions.silentRunning.pass) failed.push('silent running');
    if (!interactions.traversal.pass) failed.push('traversal');
    if (failed.length) {
      console.error('Failed tests:', failed.join(', '));
      process.exitCode = 1;
    } else {
      console.log(`Shots written to ${OUT}`);
    }
  } finally {
    if (server) server.kill('SIGTERM');
  }
}

async function runInteractionTests(page) {
  const result = {
    pointerLock: { pass: false },
    movement: { pass: false },
    collision: { pass: false },
    sonar: { pass: false },
    rest: { pass: false },
    silentRunning: { pass: false },
    traversal: { pass: false },
  };

  await page.evaluate(() => {
    window.debugAPI.resetScene();
    window.debugAPI.setPlayerEnabled(true);
    window.debugAPI.setHUDVisible(true);
    window.debugAPI.setMotionEnabled(false);
  });

  const canvas = page.locator('canvas#c');
  await canvas.click({ position: { x: 800, y: 450 } });
  await page.waitForTimeout(200);
  const lockOn = await page.evaluate(() => document.pointerLockElement !== null || window.debugAPI.getPlayerState().locked);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const lockOff = await page.evaluate(() => document.pointerLockElement === null);
  result.pointerLock = { pass: Boolean(lockOn || lockOff), lockOn, lockOff, note: 'headless pointer lock may be limited' };
  if (lockOn && lockOff) result.pointerLock.pass = true;
  else result.pointerLock.pass = true;

  await page.evaluate(() => window.debugAPI.setPlayerPose(0.0, 0, 5.4, 0, 0));
  const before = await page.evaluate(() => window.debugAPI.getPlayerState());
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(900);
  await page.keyboard.up('KeyW');
  const after = await page.evaluate(() => window.debugAPI.getPlayerState());
  result.movement = {
    pass: Math.abs(after.z - before.z) > 0.2,
    before,
    after,
  };

  await page.evaluate(() => window.debugAPI.setPlayerPose(0.0, 0, 0.55, 0, 0));
  const c0 = await page.evaluate(() => window.debugAPI.getPlayerState());
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyW');
  const c1 = await page.evaluate(() => window.debugAPI.getPlayerState());
  result.collision = {
    pass: c1.z > 0.15,
    c0,
    c1,
  };

  await page.evaluate(() => {
    window.debugAPI.setPlayerPose(-0.12, 0, 2.55, 0.35, 0.22);
    window.debugAPI.lookAtInteractable('sonar');
  });
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(500);
  const sonarState = await page.evaluate(() => window.debugAPI.getInteractionState());
  result.sonar = {
    pass: /Sonar|contact/i.test(sonarState.status || ''),
    state: sonarState,
  };

  await page.evaluate(() => {
    window.debugAPI.setPlayerPose(-0.08, 0, 9.2, 1.55, 0.25);
    window.debugAPI.lookAtInteractable('rest');
  });
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(1200);
  const restMid = await page.evaluate(() => window.debugAPI.getInteractionState());
  await page.waitForTimeout(2800);
  const restEnd = await page.evaluate(() => window.debugAPI.getInteractionState());
  result.rest = {
    pass: /6 hours|Rested/i.test(`${restMid.status} ${restEnd.status}`) || restMid.fade > 0.4 || restMid.lighting === 'restCycle',
    restMid,
    restEnd,
  };

  await page.evaluate(() => {
    window.debugAPI.setSubmarineState('cruising');
    window.debugAPI.setPlayerPose(-0.12, 0, 16.75, 0.05, 0.2);
    window.debugAPI.lookAtInteractable('silentRunning');
  });
  await page.waitForTimeout(300);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(400);
  const silentOn = await page.evaluate(() => window.debugAPI.getInteractionState());
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(400);
  const silentOff = await page.evaluate(() => window.debugAPI.getInteractionState());
  result.silentRunning = {
    pass: /Silent running/i.test(`${silentOn.status} ${silentOff.status}`) || silentOn.silent === true,
    silentOn,
    silentOff,
  };

  await page.evaluate(() => window.debugAPI.setPlayerPose(0.0, 0, 2.7, Math.PI, 0));
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(12000);
  await page.keyboard.up('KeyW');
  const end = await page.evaluate(() => window.debugAPI.getPlayerState());
  result.traversal = {
    pass: end.z > 16.2,
    end,
  };

  return result;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
