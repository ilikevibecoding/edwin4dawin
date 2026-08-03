#!/usr/bin/env node
/**
 * Automated visual tour.
 *
 * Boots the application in a headless browser, drives it to every checkpoint in
 * the manifest, renders one deterministic frame per checkpoint, captures a
 * screenshot, and evaluates the checkpoint's assertions plus the runtime sanity
 * checks. Console errors and page exceptions are collected for the whole run.
 *
 * Usage:
 *   node scripts/qa-tour.mjs                     # dev server, medium quality
 *   node scripts/qa-tour.mjs --preview           # run against the production build
 *   node scripts/qa-tour.mjs --quality high
 *   node scripts/qa-tour.mjs --only 06,15,18     # checkpoint id prefixes
 *   node scripts/qa-tour.mjs --times 120,200.5   # ad-hoc timestamps
 *   node scripts/qa-tour.mjs --controls          # also exercise the interface
 */

import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer, stopServer, waitForServer } from './lib/devserver.mjs';

const ROOT = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', 'screenshots');
const REPORT_PATH = path.join(ROOT, 'qa', 'report.json');

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = args[i + 1];
  return next && !next.startsWith('--') ? next : true;
};

const usePreview = args.includes('--preview');
const quality = flag('quality', 'medium');
const only = flag('only');
const times = flag('times');
const testControls = args.includes('--controls');
const width = Number(flag('width', 1920));
const height = Number(flag('height', 1080));
const keepServer = args.includes('--keep-server');

const PORT = usePreview ? 4173 : 5173;
const BASE = `http://127.0.0.1:${PORT}`;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const server = startServer({ root: ROOT, preview: usePreview });
  let browser;
  const consoleMessages = [];
  const pageErrors = [];

  try {
    await waitForServer(BASE);

    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
      args: [
        '--headless=new',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--disable-gpu-sandbox',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--autoplay-policy=no-user-gesture-required',
        '--mute-audio',
        `--window-size=${width},${height}`,
      ],
    });

    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    page.on('console', (msg) => {
      const text = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(text);
      if (msg.type() === 'error') console.error(`  [console] ${text}`);
      else if (msg.type() === 'warning' && !/Deprecat/i.test(text)) console.warn(`  [console] ${text}`);
    });
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
      console.error(`  [pageerror] ${err}`);
    });

    const url = `${BASE}/?qa=1&quality=${quality}`;
    console.log(`\nOpening ${url} at ${width}x${height}\n`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    await page.waitForFunction(() => window.__starfall?.ready === true, null, { timeout: 180000 });
    await page.evaluate(() => window.__starfall.enter());
    await page.waitForTimeout(1200);

    const checkpoints = await page.evaluate(() => window.__starfall.checkpoints.map((c) => ({
      id: c.id, time: c.time, chapter: c.chapter, shot: c.shot, scene: c.scene, expects: c.expects, notes: c.notes ?? '',
    })));

    let selected = checkpoints;
    if (only) {
      const prefixes = String(only).split(',').map((s) => s.trim());
      selected = checkpoints.filter((c) => prefixes.some((p) => c.id.startsWith(p)));
    }

    const results = [];

    if (times) {
      // Ad-hoc timestamp mode: capture frames without checkpoint assertions.
      const list = String(times).split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
      for (const t of list) {
        const { report, brightness } = await page.evaluate((time) => {
          const r = window.__starfall.report(time);
          return { report: r, brightness: window.__starfall.brightness() };
        }, t);
        const file = path.join(OUT_DIR, `t${t.toFixed(1).replace('.', '_')}.png`);
        await page.screenshot({ path: file });
        const issues = report.issues.filter((i) => i.severity === 'error');
        console.log(`  t=${t.toFixed(1)}  ${report.chapter}/${report.shot}  "${report.beat}"  lum=${brightness.mean.toFixed(3)}`);
        for (const i of issues) console.log(`         \u2716 ${i.message}`);
        results.push({ id: `t${t}`, time: t, failures: [], report, brightness, screenshot: path.basename(file) });
      }
    } else {
      for (const cp of selected) {
        const result = await page.evaluate((id) => window.__starfall.runCheckpoint(id), cp.id);
        const file = path.join(OUT_DIR, `${cp.id}.png`);
        await page.screenshot({ path: file });

        const status = result.failures.length === 0 ? 'PASS' : 'FAIL';
        const measured = Object.entries(result.report.measurements)
          .filter(([, m]) => m.onScreen)
          .map(([k, m]) => `${k}:${(m.screenFraction * 100).toFixed(2)}%`)
          .join(' ');
        console.log(
          `  ${status.padEnd(4)} ${cp.id.padEnd(26)} t=${String(cp.time).padStart(6)}  `
          + `${result.report.shot.padEnd(7)} lum=${result.brightness.mean.toFixed(3)} `
          + `clip=${(result.brightness.clipped * 100).toFixed(1)}% ${measured}`,
        );
        for (const f of result.failures) console.log(`         ✖ ${f}`);
        results.push({ ...result, screenshot: path.basename(file) });
      }
    }

    // ---- Interface exercise --------------------------------------------
    const controlResults = [];
    if (testControls) {
      console.log('\nExercising the interface:');
      // The transport fades out during uninterrupted playback, exactly as a
      // video player does, so every interaction starts by waking the chrome.
      const wake = async () => {
        await page.mouse.move(width / 2, height - 60);
        await page.waitForTimeout(150);
      };
      const step = async (label, fn) => {
        try {
          await fn();
          controlResults.push({ label, ok: true });
          console.log(`  PASS ${label}`);
        } catch (err) {
          controlResults.push({ label, ok: false, error: String(err) });
          console.log(`  FAIL ${label}: ${err}`);
        }
      };

      await step('play/pause toggle', async () => {
        await page.evaluate(() => window.__starfall.seek(90));
        await page.evaluate(() => window.__starfall.play());
        await page.waitForTimeout(700);
        const playing = await page.evaluate(() => window.__starfall.isPlaying());
        if (!playing) throw new Error('timeline did not start');
        await wake();
        await page.click('[data-action="play"]');
        await page.waitForTimeout(200);
        const paused = await page.evaluate(() => window.__starfall.isPlaying());
        if (paused) throw new Error('pause button had no effect');
      });

      await step('advances in real time', async () => {
        await page.evaluate(() => { window.__starfall.seek(60); window.__starfall.play(); });
        const t0 = await page.evaluate(() => window.__starfall.getTime());
        await page.waitForTimeout(1600);
        const t1 = await page.evaluate(() => window.__starfall.getTime());
        if (t1 - t0 < 0.8) throw new Error(`clock advanced only ${(t1 - t0).toFixed(2)}s in 1.6s`);
        await page.evaluate(() => window.__starfall.pause());
      });

      await step('chapter buttons', async () => {
        await wake();
        await page.click('[data-action="chapters"]');
        await page.waitForTimeout(250);
        const buttons = await page.$$('.chapter-list .chapter-item');
        if (buttons.length !== 8) throw new Error(`expected 8 chapters, found ${buttons.length}`);
        await buttons[4].click();
        await page.waitForTimeout(400);
        const chapter = await page.evaluate(() => window.__starfall.report().chapter);
        if (chapter !== 'corridor') throw new Error(`chapter button landed on ${chapter}`);
      });

      await step('timeline scrubbing', async () => {
        await wake();
        const box = await page.locator('.scrubber').boundingBox();
        await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.62, box.y + box.height / 2, { steps: 12 });
        await page.mouse.up();
        await page.waitForTimeout(300);
        const t = await page.evaluate(() => window.__starfall.getTime());
        if (Math.abs(t / 380 - 0.62) > 0.05) throw new Error(`scrub landed at ${t.toFixed(1)}s`);
        const errs = await page.evaluate(() => window.__starfall.consoleErrors());
        if (errs.length) throw new Error(`scrubbing produced console errors: ${errs[0]}`);
      });

      await step('restart', async () => {
        await wake();
        await page.click('[data-action="restart"]');
        await page.waitForTimeout(300);
        const t = await page.evaluate(() => window.__starfall.getTime());
        if (t > 3) throw new Error(`restart left the clock at ${t.toFixed(1)}s`);
        await page.evaluate(() => window.__starfall.pause());
      });

      await step('subtitles toggle', async () => {
        await page.evaluate(() => window.__starfall.renderAt(90.5));
        await page.waitForTimeout(200);
        const before = await page.locator('.subtitles').getAttribute('class');
        await page.keyboard.press('KeyC');
        await page.waitForTimeout(200);
        const after = await page.locator('.subtitles').getAttribute('class');
        if (before === after) throw new Error('subtitle visibility did not change');
        await page.keyboard.press('KeyC');
      });

      await step('volume sliders', async () => {
        await wake();
        await page.click('[data-action="settings"]');
        await page.waitForTimeout(250);
        const sliders = await page.$$('.panel input[type="range"]');
        if (sliders.length !== 4) throw new Error(`expected 4 mix sliders, found ${sliders.length}`);
        for (const s of sliders) await s.fill('42');
        await page.waitForTimeout(150);
      });

      await step('quality switching', async () => {
        for (const level of ['low', 'high', 'medium']) {
          await page.selectOption('#quality', level);
          await page.waitForTimeout(1400);
          const active = await page.evaluate(() => window.__app.currentQuality);
          if (active !== level) throw new Error(`quality is ${active} after selecting ${level}`);
          const errs = await page.evaluate(() => window.__starfall.consoleErrors());
          if (errs.length) throw new Error(`quality switch produced errors: ${errs[0]}`);
        }
        await wake();
        await page.click('[data-action="settings"]');
      });

      await step('explore mode + selection', async () => {
        await page.evaluate(() => window.__starfall.renderAt(130));
        await page.evaluate(() => window.__starfall.setMode('explore'));
        await page.waitForTimeout(500);
        const ok = await page.evaluate(() => window.__starfall.selectByIdForTest('star-destroyer'));
        if (!ok) throw new Error('could not select the destroyer');
        await page.waitForTimeout(300);
        const visible = await page.locator('.selection').evaluate((el) => !el.classList.contains('hidden'));
        if (!visible) throw new Error('selection panel did not appear');
        // The dossier must be genuinely painted, not merely un-hidden: on a slow
        // rasteriser a screenshot taken immediately catches it mid-fade.
        await page.waitForFunction(
          () => Number(getComputedStyle(document.querySelector('.selection')).opacity) > 0.95,
          null,
          { timeout: 15000 },
        );
        const dossierText = await page.locator('.selection__name').textContent();
        if (!dossierText || !dossierText.trim()) throw new Error('dossier panel is empty');
        await page.screenshot({ path: path.join(OUT_DIR, 'ui-explore-selection.png') });
        // Orbit with the pointer.
        await page.mouse.move(width / 2, height / 2);
        await page.mouse.down();
        await page.mouse.move(width / 2 + 260, height / 2 + 60, { steps: 16 });
        await page.mouse.up();
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(OUT_DIR, 'ui-explore-orbit.png') });
        await page.evaluate(() => window.__starfall.setMode('cinematic'));
      });

      await step('debug overlay', async () => {
        await page.evaluate(() => window.__starfall.renderAt(126));
        await page.keyboard.press('Backquote');
        await page.waitForTimeout(400);
        const visible = await page.locator('.debug').evaluate((el) => !el.classList.contains('hidden'));
        if (!visible) throw new Error('debug overlay did not open');
        await page.screenshot({ path: path.join(OUT_DIR, 'ui-debug-overlay.png') });
        await page.keyboard.press('Backquote');
      });

      await step('help panel', async () => {
        await page.keyboard.press('KeyH');
        await page.waitForTimeout(250);
        const visible = await page.locator('.panel.help').evaluate((el) => !el.classList.contains('hidden'));
        if (!visible) throw new Error('help panel did not open');
        await page.screenshot({ path: path.join(OUT_DIR, 'ui-help.png') });
        await page.keyboard.press('KeyH');
      });

      await step('window resize', async () => {
        for (const size of [{ width: 1280, height: 720 }, { width: 2560, height: 1440 }, { width: 3840, height: 2160 }]) {
          await page.setViewportSize(size);
          await page.waitForTimeout(600);
          await page.evaluate(() => window.__starfall.renderAt(112));
          const errs = await page.evaluate(() => window.__starfall.consoleErrors());
          if (errs.length) throw new Error(`resize to ${size.width}x${size.height} produced errors: ${errs[0]}`);
          await page.screenshot({ path: path.join(OUT_DIR, `ui-resize-${size.width}x${size.height}.png`) });
        }
        await page.setViewportSize({ width, height });
      });
    }

    // ---- Real-time playback sample -------------------------------------
    console.log('\nReal-time playback sample (20 s from the pursuit):');
    await page.evaluate(() => { window.__starfall.seek(100); window.__starfall.play(); });
    const samples = [];
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(2000);
      const s = await page.evaluate(() => {
        const r = window.__starfall.report();
        return { time: r.time, fps: r.fps, draws: r.drawCalls, tris: r.triangles, issues: r.issues.length };
      });
      samples.push(s);
    }
    await page.evaluate(() => window.__starfall.pause());
    const meanFps = samples.reduce((a, s) => a + s.fps, 0) / samples.length;
    console.log(`  mean ${meanFps.toFixed(1)} fps (software rasteriser), draws ~${samples[samples.length - 1].draws}`);

    const consoleErrors = consoleMessages.filter((m) => m.startsWith('error:'));
    const failures = results.filter((r) => r.failures.length > 0);

    const report = {
      generatedAt: new Date().toISOString(),
      url,
      viewport: { width, height },
      quality,
      checkpointCount: results.length,
      failureCount: failures.length,
      consoleErrors,
      pageErrors,
      controlResults,
      playbackSamples: samples,
      meanFps,
      results,
    };
    await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

    console.log(`\n${results.length - failures.length}/${results.length} checkpoints passed`);
    if (consoleErrors.length) console.log(`${consoleErrors.length} console error(s)`);
    if (pageErrors.length) console.log(`${pageErrors.length} page error(s)`);
    console.log(`Report: ${path.relative(process.cwd(), REPORT_PATH)}`);
    console.log(`Screenshots: ${path.relative(process.cwd(), OUT_DIR)}`);

    process.exitCode = failures.length || pageErrors.length || consoleErrors.length ? 1 : 0;
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (!keepServer) await stopServer(server);
  }
}

await rm(REPORT_PATH, { force: true });
await main();
