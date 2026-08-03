#!/usr/bin/env node
/**
 * Frame inspector for the cinematic.
 *
 * Seeks to a list of absolute timeline times, settles the world, renders, saves
 * a screenshot and prints what the frame contains (camera, chapter, visible
 * subjects, sanity issues, luminance histogram). Used by the QA loop to decide
 * whether a shot actually reads.
 *
 * Usage: node tools/diag.mjs '[["name",time], ...]' [--size WxH] [--quality medium]
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const flags = new Map();
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    flags.set(args[i].slice(2), args[i + 1]);
    i++;
  } else positional.push(args[i]);
}

const SHOTS = JSON.parse(positional[0] || '[["vader",276]]');
const [W, H] = (flags.get('size') ?? '1280x720').split('x').map(Number);
const QUALITY = flags.get('quality') ?? 'medium';
const OUT = flags.get('out') ?? '/workspace/qa-output/diag';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'shell',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--autoplay-policy=no-user-gesture-required',
    '--mute-audio',
    `--window-size=${W},${H}`,
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });
const problems = [];
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${m.type()}] ${m.text()}`);
});

await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__SW_READY === true', { timeout: 240000 });
await page.evaluate(async (quality) => {
  document.querySelector('#gate button.primary').click();
  await new Promise((r) => setTimeout(r, 900));
  window.__SW.setPlaying(false);
  window.__SW.setQuality(quality);
  await new Promise((r) => setTimeout(r, 700));
  window.__SW.hideUi(true);
}, QUALITY);

const report = [];
for (const [name, t] of SHOTS) {
  const data = await page.evaluate(async (time) => {
    window.__SW.seek(time);
    window.__SW.settle(12, 1 / 30);
    for (let i = 0; i < 3; i++) {
      window.__SW.renderOnce();
      await new Promise((r) => requestAnimationFrame(r));
    }
    window.__SW.renderOnce();

    const app = window.__SW.app;
    const frame = window.__SW.inspect();
    const cam = app.render.camera;

    // Luminance histogram of the rendered frame, to catch black or blown shots.
    const gl = app.render.renderer.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const step = 6;
    const px = new Uint8Array(4);
    let sum = 0;
    let n = 0;
    let dark = 0;
    let blown = 0;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const i = (y * w + x) * 4;
        px[0] = buf[i];
        px[1] = buf[i + 1];
        px[2] = buf[i + 2];
        const l = (0.2126 * px[0] + 0.7152 * px[1] + 0.0722 * px[2]) / 255;
        sum += l;
        n++;
        if (l < 0.02) dark++;
        if (l > 0.97) blown++;
      }
    }

    const chars = app.stage.allCharacters
      .filter((c) => c.root.visible)
      .map((c) => ({
        n: c.displayName.split(' ')[0],
        p: c.root.position.toArray().map((v) => +v.toFixed(2)),
        st: c.state,
      }));

    return {
      time,
      chapter: frame.chapter,
      camera: frame.camera,
      location: frame.location,
      fade: +frame.fade.toFixed(3),
      camPos: cam.position.toArray().map((v) => +v.toFixed(2)),
      fov: +cam.fov.toFixed(1),
      visible: Object.entries(frame.visible)
        .filter(([, v]) => v)
        .map(([k]) => k),
      coverage: Object.fromEntries(
        Object.entries(frame.coverage)
          .filter(([, v]) => v > 0.0005)
          .map(([k, v]) => [k, +v.toFixed(3)]),
      ),
      card: frame.card,
      subtitle: frame.subtitle ? frame.subtitle.slice(0, 48) : null,
      issues: frame.issues.map((i) => `${i.severity}:${i.code}:${i.detail}`),
      chars,
      luma: +(sum / n).toFixed(3),
      darkPct: +((dark / n) * 100).toFixed(1),
      blownPct: +((blown / n) * 100).toFixed(1),
    };
  }, t);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  data.name = name;
  report.push(data);
  console.log(
    `${name.padEnd(18)} t=${String(t).padStart(5)} ${String(data.chapter).padEnd(9)} ${String(data.camera).padEnd(22)} luma=${data.luma} dark=${data.darkPct}% blown=${data.blownPct}% vis=[${data.visible.join(',')}]`,
  );
  if (data.issues.length) console.log(`   issues: ${data.issues.join(' | ')}`);
}

writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
if (problems.length) {
  console.log('--- console ---');
  for (const p of problems.slice(0, 30)) console.log(p);
}
await browser.close();
