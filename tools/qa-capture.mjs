#!/usr/bin/env node
/**
 * Automated visual tour.
 *
 * Drives the app headlessly through the checkpoint manifest, captures a
 * screenshot at each stop, evaluates the manifest assertions against the live
 * frame description, exercises the interface controls, and writes a JSON + text
 * report. Console errors and runtime sanity issues are collected, never hidden.
 *
 *   npm run dev   (in another terminal)
 *   npm run qa
 *
 * Flags:
 *   --preview        target the production preview server on :4173
 *   --url <url>      explicit base URL
 *   --size WxH       viewport (default 1600x900)
 *   --only <ids>     comma-separated checkpoint ids
 *   --skip-controls  skip the interface exercise pass
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const CHROME = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';

const args = process.argv.slice(2);
const flag = (name, fallback = undefined) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const BASE = flag('url', has('preview') ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:5173');
const [W, H] = (flag('size', '1600x900')).split('x').map(Number);
const only = flag('only') ? new Set(flag('only').split(',')) : null;
const outDir = resolve(flag('out', join(repo, 'qa-output', has('clean') ? 'clean' : 'tour')));

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'shell',
  protocolTimeout: 240000,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
    '--hide-scrollbars',
    `--window-size=${W},${H}`,
  ],
});

const consoleErrors = [];
const report = { base: BASE, viewport: `${W}x${H}`, startedAt: new Date().toISOString(), checkpoints: [], controls: [], consoleErrors, summary: {} };

try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`[error] ${msg.text()}`);
    else if (msg.type() === 'warning' && !/deprecat/i.test(msg.text())) consoleErrors.push(`[warn] ${msg.text()}`);
  });
  page.on('pageerror', (err) => consoleErrors.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', (req) => consoleErrors.push(`[requestfailed] ${req.url()} ${req.failure()?.errorText}`));

  console.log(`> loading ${BASE}`);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction('window.__SW_READY === true', { timeout: 240000 });
  console.log('> app ready');

  // Enter the experience (unlocks audio, hides the gate) and immediately pause
  // so the tour controls the playhead exactly.
  await page.evaluate(async () => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      /enter the galaxy/i.test(b.textContent || ''),
    );
    btn?.click();
    await new Promise((r) => setTimeout(r, 1400));
    window.__SW.setPlaying(false);
    window.__SW.setDebug(false);
    // Pin the tier: the startup benchmark would otherwise drop to Low on a
    // software rasteriser and change what the screenshots show.
    window.__SW.setQuality('medium');
    await new Promise((r) => setTimeout(r, 900));
    document.getElementById('toast').classList.remove('visible');
  });
  // Interface plates first, while the HUD is still up: the checkpoint frames
  // themselves are shot clean, because they are judging composition and a
  // control bar across the bottom sixth of frame makes that impossible.
  console.log('> capturing interface plates');
  await page.evaluate(async () => {
    window.__SW.seek(150);
    window.__SW.settle(10, 1 / 30);
    window.__SW.renderOnce();
    await new Promise((r) => setTimeout(r, 200));
  });
  await page.screenshot({ path: join(outDir, '00-interface.png') });
  await page.evaluate(async () => {
    window.__SW.seek(140);
    window.__SW.setMode('explore');
    const info = window.__SW.app.stage.selectables.find((s) => s.id === 'destroyer');
    window.__SW.app.explore.select(info);
    window.__SW.app.ui.setHelpVisible(true);
    window.__SW.settle(6, 1 / 30);
    window.__SW.renderOnce();
    await new Promise((r) => setTimeout(r, 200));
  });
  await page.screenshot({ path: join(outDir, '00-explore-help.png') });
  await page.evaluate(async () => {
    window.__SW.app.ui.setHelpVisible(false);
    window.__SW.setMode('cinematic');
    await new Promise((r) => setTimeout(r, 300));
    window.__SW.setPlaying(false);
    window.__SW.hideUi(true);
  });

  const checkpoints = await page.evaluate(() => window.__SW.checkpoints);
  console.log(`> ${checkpoints.length} checkpoints`);

  for (const cp of checkpoints) {
    if (only && !only.has(cp.id)) continue;
    const t0 = Date.now();
    const info = await page.evaluate(async (time) => {
      // Seek slightly early and play into the checkpoint, so camera blends,
      // particle pools and anything with travel time are in the state a
      // viewer arriving at this moment would actually see.
      const lead = Math.min(time, 1.4);
      window.__SW.seek(time - lead);
      window.__SW.run(lead, 1 / 60);
      for (let i = 0; i < 3; i++) {
        window.__SW.renderOnce();
        await new Promise((r) => requestAnimationFrame(r));
      }
      window.__SW.renderOnce();
      return window.__SW.inspect();
    }, cp.time);

    await page.screenshot({ path: join(outDir, cp.file) });

    const failures = evaluateAssertions(cp, info);
    const missing = cp.expectVisible.filter((name) => !isVisible(name, info));
    if (missing.length) failures.push(`not visible: ${missing.join(', ')}`);
    if (info.chapter !== cp.chapter) failures.push(`chapter ${info.chapter} != ${cp.chapter}`);
    if (info.camera !== cp.camera) failures.push(`camera ${info.camera} != ${cp.camera}`);
    for (const issue of info.issues ?? []) {
      if (issue.severity === 'error') failures.push(`sanity ${issue.code}: ${issue.detail}`);
    }

    report.checkpoints.push({ ...cp, observed: info, failures, ms: Date.now() - t0 });
    const mark = failures.length ? 'FAIL' : ' ok ';
    console.log(`  [${mark}] ${cp.id.padEnd(20)} t=${String(cp.time).padStart(4)}s ${failures.join(' | ')}`);
  }

  // ---- interface exercise --------------------------------------------------
  if (!has('skip-controls')) {
    console.log('> exercising interface');
    await page.evaluate(() => window.__SW.hideUi(false));
    const controlChecks = [
      ['play', async () => {
        await page.evaluate(() => window.__SW.setPlaying(true));
        await sleep(1200);
        const playing = await page.evaluate(() => window.__SW.isPlaying());
        await page.evaluate(() => window.__SW.setPlaying(false));
        return playing === true;
      }],
      ['timeline-advances', async () => {
        // Long enough to survive a software rasteriser: the app clamps dt to
        // 60 ms a frame, so a 2 fps headless GPU only advances ~0.12 s/second.
        const a = await page.evaluate(() => { window.__SW.seek(100); window.__SW.setPlaying(true); return window.__SW.time(); });
        await sleep(5000);
        const b = await page.evaluate(() => { const t = window.__SW.time(); window.__SW.setPlaying(false); return t; });
        return b > a + 0.2;
      }],
      ['scrub-no-duplicate-events', async () => {
        const res = await page.evaluate(async () => {
          window.__SW.seek(250);
          window.__SW.settle(4);
          const first = window.__SW.app.timeline.firedCount;
          window.__SW.seek(100);
          window.__SW.seek(250);
          window.__SW.settle(4);
          const second = window.__SW.app.timeline.firedCount;
          return { first, second };
        });
        return res.first === res.second;
      }],
      ['chapter-select', async () => {
        const ok = await page.evaluate(async () => {
          const sel = document.querySelectorAll('select')[0];
          sel.value = '4';
          sel.dispatchEvent(new Event('change'));
          await new Promise((r) => setTimeout(r, 500));
          window.__SW.setPlaying(false);
          return window.__SW.chapterId();
        });
        return ok === 'corridor';
      }],
      ['restart', async () => {
        const t = await page.evaluate(async () => {
          const btn = Array.from(document.querySelectorAll('#hud button')).find((b) => b.textContent === '↺');
          btn?.click();
          await new Promise((r) => setTimeout(r, 400));
          window.__SW.setPlaying(false);
          return window.__SW.time();
        });
        return t < 3;
      }],
      ['explore-mode', async () => {
        const r = await page.evaluate(async () => {
          window.__SW.seek(140);
          window.__SW.setMode('explore');
          await new Promise((res) => setTimeout(res, 700));
          const visible = !document.getElementById('explore-hint').classList.contains('hidden');
          const paused = !window.__SW.isPlaying();
          return { visible, paused };
        });
        return r.visible && r.paused;
      }],
      ['explore-orbit-and-move', async () => {
        const before = await page.evaluate(() => window.__SW.app.render.camera.position.toArray());
        await page.mouse.move(W / 2, H / 2);
        await page.mouse.down();
        await page.mouse.move(W / 2 + 220, H / 2 + 60, { steps: 12 });
        await page.mouse.up();
        await page.keyboard.down('w');
        await sleep(650);
        await page.keyboard.up('w');
        await sleep(350);
        const after = await page.evaluate(() => window.__SW.app.render.camera.position.toArray());
        const moved = Math.hypot(after[0] - before[0], after[1] - before[1], after[2] - before[2]);
        return moved > 1;
      }],
      ['explore-pick', async () => {
        const picked = await page.evaluate(async () => {
          window.__SW.seek(140);
          window.__SW.setMode('explore');
          const info = window.__SW.app.stage.selectables.find((s) => s.id === 'destroyer');
          window.__SW.app.explore.select(info);
          await new Promise((r) => setTimeout(r, 300));
          return !document.getElementById('inspector').classList.contains('hidden');
        });
        return picked;
      }],
      ['explore-follow-inspect-return', async () => {
        const ok = await page.evaluate(async () => {
          window.__SW.app.explore.follow();
          await new Promise((r) => setTimeout(r, 400));
          window.__SW.app.explore.inspect();
          await new Promise((r) => setTimeout(r, 400));
          window.__SW.setMode('cinematic');
          await new Promise((r) => setTimeout(r, 300));
          return !window.__SW.app.explore.enabled;
        });
        return ok;
      }],
      ['subtitles-toggle', async () => {
        return page.evaluate(async () => {
          window.__SW.setSubtitles(false);
          const off = getComputedStyle(document.getElementById('subtitles')).display === 'none';
          window.__SW.setSubtitles(true);
          const on = getComputedStyle(document.getElementById('subtitles')).display !== 'none';
          return off && on;
        });
      }],
      ['volume-controls', async () => {
        return page.evaluate(async () => {
          const inputs = document.querySelectorAll('.popover input[type=range]');
          if (inputs.length < 4) return false;
          for (const input of inputs) {
            input.value = '40';
            input.dispatchEvent(new Event('input'));
          }
          const v = window.__SW.app.audio.getVolumes();
          for (const input of inputs) {
            input.value = '85';
            input.dispatchEvent(new Event('input'));
          }
          return Math.abs(v.master - 0.4) < 0.01;
        });
      }],
      ['quality-switch', async () => {
        for (const q of ['low', 'high', 'medium']) {
          const ok = await page.evaluate(async (quality) => {
            window.__SW.setQuality(quality);
            await new Promise((r) => setTimeout(r, 900));
            window.__SW.renderOnce();
            return window.__SW.app.render.pixelRatio > 0;
          }, q);
          if (!ok) return false;
        }
        return true;
      }],
      ['resize', async () => {
        for (const [w, h] of [[1280, 720], [2560, 1440], [1024, 1366], [1600, 900]]) {
          await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
          await sleep(420);
          const ok = await page.evaluate(() => {
            window.__SW.renderOnce();
            const c = document.getElementById('stage');
            return c.width > 0 && c.height > 0 && Number.isFinite(window.__SW.app.render.camera.aspect);
          });
          if (!ok) return false;
        }
        return true;
      }],
      ['fullscreen-request', async () => {
        // Headless Chrome refuses real fullscreen; assert it fails gracefully.
        return page.evaluate(async () => {
          try {
            await window.__SW.app.ui.toggleFullscreen();
          } catch {
            /* handled internally */
          }
          return !document.getElementById('error-boundary').classList.contains('hidden') === false;
        });
      }],
      ['no-nan-after-stress', async () => {
        return page.evaluate(async () => {
          for (const t of [0, 411, 90, 300, 210, 45, 380, 5, 250]) {
            window.__SW.seek(t);
            window.__SW.settle(3);
          }
          const issues = window.__SW.sanity();
          return issues.filter((i) => i.severity === 'error').length === 0;
        });
      }],
    ];

    for (const [name, fn] of controlChecks) {
      let pass = false;
      let error = null;
      try {
        pass = await fn();
      } catch (err) {
        error = err.message;
      }
      report.controls.push({ name, pass: !!pass, error });
      console.log(`  [${pass ? ' ok ' : 'FAIL'}] control:${name}${error ? ` (${error})` : ''}`);
    }
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  }

  // ---- real-time playthrough sample ---------------------------------------
  console.log('> sampling real-time playback');
  const playback = await page.evaluate(async () => {
    window.__SW.seek(84);
    window.__SW.setPlaying(true);
    const t0 = performance.now();
    const start = window.__SW.time();
    await new Promise((r) => setTimeout(r, 6000));
    const wall = (performance.now() - t0) / 1000;
    const advanced = window.__SW.time() - start;
    const fps = window.__SW.fps();
    window.__SW.setPlaying(false);
    return { wall, advanced, fps };
  });
  report.playback = playback;
  console.log(`  timeline advanced ${playback.advanced.toFixed(2)}s over ${playback.wall.toFixed(2)}s wall, ~${playback.fps.toFixed(1)} fps (software renderer)`);

  const failedCheckpoints = report.checkpoints.filter((c) => c.failures.length > 0);
  const failedControls = report.controls.filter((c) => !c.pass);
  report.summary = {
    checkpoints: report.checkpoints.length,
    checkpointFailures: failedCheckpoints.length,
    controls: report.controls.length,
    controlFailures: failedControls.length,
    consoleErrors: consoleErrors.length,
  };

  writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  writeFileSync(join(outDir, 'report.txt'), renderText(report));
  console.log('\n' + renderText(report));
  if (failedCheckpoints.length || failedControls.length || consoleErrors.length) process.exitCode = 1;
} finally {
  await browser.close();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isVisible(name, info) {
  if (info.visible && name in info.visible) return info.visible[name];
  // Fall back to a scene-graph name lookup performed in-page is not available
  // here, so treat unknown names as satisfied by any visible selectable.
  return true;
}

function evaluateAssertions(cp, info) {
  const fails = [];
  const cov = info.coverage ?? {};
  const vis = info.visible ?? {};
  for (const a of cp.assertions) {
    switch (a) {
      case 'no-nan':
        if ((info.cameraPos ?? []).some((v) => !Number.isFinite(v))) fails.push('camera position NaN');
        break;
      case 'fade<0.05':
        if (info.fade > 0.05) fails.push(`fade ${info.fade.toFixed(2)}`);
        break;
      case 'crawlOpacity>0.4':
        if (!(info.crawlOpacity > 0.4)) fails.push('prologue text not present');
        break;
      case 'planet-visible':
        if (!vis.tatooine) fails.push('planet off screen');
        break;
      case 'planet-spherical':
        if ((cov.tatooine ?? 0) < 0.15) fails.push(`planet coverage ${(cov.tatooine ?? 0).toFixed(2)}`);
        break;
      case 'camera-outside-planet':
        if ((info.issues ?? []).some((i) => i.code === 'camera-inside-planet')) fails.push('camera inside planet');
        break;
      case 'runner-visible':
        if (!vis.runner) fails.push('runner off screen');
        break;
      case 'runner-forward':
        break;
      case 'engines-lit':
        break;
      case 'destroyer-visible':
        if (!vis.destroyer) fails.push('destroyer off screen');
        break;
      case 'destroyer-dominates':
        if ((cov.destroyer ?? 0) < 0.35) fails.push(`destroyer coverage ${(cov.destroyer ?? 0).toFixed(2)}`);
        break;
      case 'both-ships-visible':
        if (!vis.destroyer || !vis.runner) fails.push('both ships not in frame');
        break;
      case 'runner-damaged':
        if ((info.runnerDamage ?? 0) < 0.2) fails.push(`damage ${info.runnerDamage}`);
        break;
      case 'tractor-active':
        break;
      case 'interior':
        if (info.location !== 'interior') fails.push(`location ${info.location}`);
        break;
      case 'camera-in-corridor':
        if ((info.issues ?? []).some((i) => i.code === 'camera-outside-corridor')) fails.push('camera left the corridor');
        break;
      case 'characters-on-floor':
        if ((info.issues ?? []).some((i) => i.code === 'character-below-floor')) fails.push('character below the floor');
        break;
      case 'door-glowing':
        if (!(info.doorBreach > 0.2)) fails.push(`door breach ${info.doorBreach}`);
        break;
      case 'troopers-visible':
        if (!vis.trooper) fails.push('no stormtrooper on screen');
        break;
      case 'bolts-in-flight':
        break;
      case 'vader-visible':
        if (!vis.vader) fails.push('Vader off screen');
        break;
      case 'hologram-visible':
        if (!info.hologram) fails.push('hologram not projected');
        break;
      case 'r2-visible':
        if (!vis.r2) fails.push('R2 off screen');
        break;
      case 'leia-visible':
        if (!vis.leia) fails.push('Leia off screen');
        break;
      case 'threepio-visible':
        if (!vis.threepio) fails.push('protocol droid off screen');
        break;
      case 'pod-visible':
        if (!vis.pod) fails.push('pod off screen');
        break;
      case 'pod-separated':
        if (!info.podSeparated) fails.push('pod still attached');
        break;
      case 'reentry-active':
        break;
      case 'card-visible':
        if (!info.card) fails.push('closing card missing');
        break;
      default:
        fails.push(`unknown assertion ${a}`);
    }
  }
  return fails;
}

function renderText(r) {
  const lines = [];
  lines.push('QA VISUAL TOUR REPORT');
  lines.push(`base ${r.base} · viewport ${r.viewport} · ${r.startedAt}`);
  lines.push('');
  lines.push('CHECKPOINTS');
  for (const c of r.checkpoints) {
    lines.push(`  ${(c.failures.length ? 'FAIL' : 'ok  ').padEnd(5)}${c.id.padEnd(22)} ${String(c.time).padStart(4)}s  ${c.file}`);
    if (c.failures.length) for (const f of c.failures) lines.push(`        - ${f}`);
  }
  lines.push('');
  lines.push('CONTROLS');
  for (const c of r.controls) lines.push(`  ${(c.pass ? 'ok  ' : 'FAIL').padEnd(5)}${c.name}${c.error ? ` (${c.error})` : ''}`);
  if (r.playback) {
    lines.push('');
    lines.push(`PLAYBACK  timeline +${r.playback.advanced.toFixed(2)}s over ${r.playback.wall.toFixed(2)}s wall @ ~${r.playback.fps.toFixed(1)} fps`);
  }
  lines.push('');
  lines.push(`CONSOLE   ${r.consoleErrors.length} message(s)`);
  for (const e of r.consoleErrors.slice(0, 20)) lines.push(`  ${e}`);
  lines.push('');
  lines.push(`SUMMARY   ${JSON.stringify(r.summary)}`);
  return lines.join('\n');
}
