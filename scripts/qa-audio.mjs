#!/usr/bin/env node
/**
 * Audio smoke test.
 *
 * Boots the experience headlessly, lets the clock run across several beats, and
 * samples the master analyser to prove that music, effects and narration are
 * actually reaching the output bus - and that the limiter keeps peaks under
 * control rather than clipping.
 *
 * Chrome is launched with --mute-audio, so nothing is played to a device; the
 * Web Audio graph still runs and the analyser still measures it.
 */

import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer, stopServer, waitForServer } from './lib/devserver.mjs';

const ROOT = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const PORT = 5173;
const BASE = `http://127.0.0.1:${PORT}`;

/** Beats chosen to cover each audio subsystem in turn. */
const PROBES = [
  { time: 6, seconds: 4, label: 'prologue drone + first narration', expect: ['narration', 'music'] },
  { time: 52, seconds: 4, label: 'Tatooine pad + narration', expect: ['narration', 'music'] },
  { time: 122, seconds: 5, label: 'turbolaser salvo + pursuit ostinato', expect: ['sfx', 'music'] },
  { time: 218, seconds: 5, label: 'door breach + boarding percussion', expect: ['sfx'] },
  { time: 246, seconds: 5, label: 'respirator bed + iron motif', expect: ['sfx', 'music'] },
  { time: 290, seconds: 4, label: 'data transfer blips + strings', expect: ['sfx', 'music'] },
  { time: 321, seconds: 5, label: 'pod clamps and launch', expect: ['sfx'] },
];

const server = startServer({ root: ROOT, quiet: true });

let browser;
try {
  await waitForServer(BASE);
  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome',
    args: [
      '--headless=new', '--use-gl=angle', '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage',
      '--autoplay-policy=no-user-gesture-required', '--mute-audio',
    ],
  });
  const context = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto(`${BASE}/?qa=1&quality=low`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__starfall?.ready === true, null, { timeout: 180000 });
  await page.evaluate(() => window.__starfall.enter());
  await page.waitForTimeout(1500);

  const narration = await page.evaluate(() => {
    const n = window.__app.narrationPlayer;
    return { mode: n.playbackMode, loaded: n.loadedCount, cues: n.cueCount };
  });
  console.log(`\nNarration: ${narration.mode}, ${narration.loaded}/${narration.cues} clips decoded`);

  const contextState = await page.evaluate(() => window.__app.audioEngine.state);
  console.log(`AudioContext: ${contextState}\n`);

  const results = [];
  for (const probe of PROBES) {
    await page.evaluate((t) => {
      window.__starfall.seek(t);
      window.__starfall.play();
    }, probe.time);
    const samples = [];
    const end = Date.now() + probe.seconds * 1000;
    while (Date.now() < end) {
      await page.waitForTimeout(120);
      samples.push(await page.evaluate(() => {
        const e = window.__app.audioEngine;
        return { peak: e.peak, reduction: e.reduction };
      }));
    }
    await page.evaluate(() => window.__starfall.pause());
    const peak = Math.max(...samples.map((s) => s.peak));
    const worstReduction = Math.min(...samples.map((s) => s.reduction));
    const active = samples.filter((s) => s.peak > 0.01).length / samples.length;
    const status = peak > 0.02 ? 'PASS' : 'FAIL';
    console.log(
      `  ${status}  t=${String(probe.time).padStart(4)}  peak ${peak.toFixed(3)}  `
      + `limiter ${worstReduction.toFixed(1)} dB  active ${(active * 100).toFixed(0)}%  ${probe.label}`,
    );
    results.push({ ...probe, peak, worstReduction, active });
  }

  const clipped = results.filter((r) => r.peak >= 0.999);
  const silent = results.filter((r) => r.peak <= 0.02);
  console.log(`\n${results.length - silent.length}/${results.length} beats produced audio`);
  console.log(clipped.length ? `${clipped.length} beat(s) reached full scale` : 'No beat reached full scale');
  if (errors.length) console.log(`Console errors: ${errors.length}\n  ${errors.slice(0, 5).join('\n  ')}`);

  await writeFile(path.join(ROOT, 'qa', 'audio-report.json'), `${JSON.stringify({ narration, contextState, results, errors }, null, 2)}\n`);
  process.exitCode = silent.length || clipped.length || errors.length ? 1 : 0;
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await stopServer(server);
}
