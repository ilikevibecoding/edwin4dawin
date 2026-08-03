#!/usr/bin/env node
/**
 * Offline soundtrack capture.
 *
 * The score, the effects and the narration are all scheduled against the Web
 * Audio clock, so the soundtrack has to be recorded in real time — but the
 * *picture* does not have to be drawn while it happens. This freezes the
 * renderer, steps `App.simulate(dt)` off `AudioContext.currentTime` so the show
 * tracks the audio clock exactly, and taps the master limiter into a
 * MediaRecorder. On a machine that draws at two frames a second that is the
 * difference between a soundtrack in sync and one stretched five times too long.
 *
 *   node scripts/render-audio.mjs --out qa/starfall-audio.webm
 *   node scripts/render-audio.mjs --to 30            # short check
 */
import puppeteer from 'puppeteer-core';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};

const FROM = Number(flag('from', 0));
const TO = Number(flag('to', 0)) || null;
const PORT = Number(flag('port', 5173));
const OUT = path.resolve(root, flag('out', 'qa/starfall-audio.webm'));

const chrome = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium'].find(
  (c) => c && existsSync(c),
);

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--autoplay-policy=no-user-gesture-required',
    '--hide-scrollbars',
  ],
  protocolTimeout: 900000,
});

const page = await browser.newPage();
await page.setViewport({ width: 640, height: 360, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('pageerror', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.error('console', m.text());
});
await page.goto(`http://127.0.0.1:${PORT}/?qa=1&quality=low&autoplay=0`, {
  waitUntil: 'domcontentloaded',
});
await page.waitForFunction('window.__STARFALL && window.__STARFALL.ready === true', {
  timeout: 600000,
});

await mkdir(path.dirname(OUT), { recursive: true });
const sink = createWriteStream(OUT);
let bytes = 0;
await page.exposeFunction('__pushAudio', (b64) => {
  const buf = Buffer.from(b64, 'base64');
  bytes += buf.length;
  sink.write(buf);
});

const duration = await page.evaluate(() => window.__STARFALL.duration);
const end = Math.min(TO ?? duration, duration);
console.log(
  `capturing ${(end - FROM).toFixed(1)}s of soundtrack from t=${FROM}s in real time -> ${path.relative(root, OUT)}`,
);

const started = Date.now();
const report = setInterval(() => {
  const s = (Date.now() - started) / 1000;
  process.stdout.write(
    `\r  ${s.toFixed(0)}s / ${(end - FROM).toFixed(0)}s · ${(bytes / 1e6).toFixed(1)} MB captured        `,
  );
}, 5000);

const result = await page.evaluate(async ({ from, endTime }) => {
  const app = window.__STARFALL.app;
  await app.startAudio();
  const audio = app.audio;
  if (!audio) return { ok: false, reason: 'audio engine failed to start' };
  await audio.resume();

  const ctx = audio.ctx;
  const dest = ctx.createMediaStreamDestination();
  // Tap the very end of the chain, after the compressor and the soft clip, so
  // what is recorded is exactly what a listener would hear.
  audio.limiter.connect(dest);

  const rec = new MediaRecorder(dest.stream, {
    mimeType: 'audio/webm;codecs=opus',
    audioBitsPerSecond: 192000,
  });
  const pending = [];
  rec.ondataavailable = (e) => {
    if (!e.data || !e.data.size) return;
    pending.push(
      e.data.arrayBuffer().then((ab) => {
        let s = '';
        const bytes = new Uint8Array(ab);
        for (let i = 0; i < bytes.length; i += 0x8000) {
          s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        return window.__pushAudio(btoa(s));
      }),
    );
  };

  // Renderer off. Nothing is drawn during the capture, which is what lets the
  // simulation keep up with real time on a machine with no GPU.
  app.frozen = true;
  app.show.timeline.seek(from);
  app.show.timeline.play();

  rec.start(2000);
  const t0 = ctx.currentTime;
  let last = t0;

  await new Promise((resolve) => {
    const tick = () => {
      const now = ctx.currentTime;
      const dt = Math.min(0.05, now - last);
      if (dt > 0) {
        last = now;
        app.simulate(dt);
        const interior = app.stage.interior.visible && !app.stage.space.visible;
        audio.updateListener(app.render.camera, interior ? 1 : 0.045);
      }
      if (now - t0 >= endTime - from) resolve();
      else setTimeout(tick, 8);
    };
    tick();
  });

  rec.stop();
  await new Promise((r) => (rec.onstop = r));
  await Promise.all(pending);
  return { ok: true, showTime: app.show.time - from, audioTime: ctx.currentTime - t0 };
}, { from: FROM, endTime: end });

clearInterval(report);
process.stdout.write('\n');
sink.end();
await new Promise((r) => sink.on('close', r));
await browser.close();

if (!result.ok) {
  console.error(`capture failed: ${result.reason}`);
  process.exit(1);
}
console.log(
  `done · show reached ${result.showTime.toFixed(1)}s over ${result.audioTime.toFixed(1)}s of audio ` +
    `(drift ${(result.showTime - result.audioTime).toFixed(2)}s) · ${(bytes / 1e6).toFixed(1)} MB`,
);
