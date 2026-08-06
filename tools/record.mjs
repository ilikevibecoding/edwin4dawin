/**
 * Deterministic offline recorder.
 *
 * Steps the game one fixed frame at a time, writes each frame to disk, then
 * encodes with ffmpeg. The world clock, the UI clock and the story clock all
 * advance by the same fixed delta, so playback is correctly paced no matter how
 * slow the software rasteriser is.
 *
 *   node tools/record.mjs --chapter=ch1 --fps=24 --w=960 --h=540 --out=recordings/ch1
 */
import puppeteer from 'puppeteer';
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, ...v] = a.replace(/^--/, '').split('=');
      return [k, v.join('=') === '' ? 'true' : v.join('=')];
    })
);

const BASE = args.base ?? 'http://localhost:4173';
const W = Number(args.w ?? 960);
const H = Number(args.h ?? 540);
const FPS = Number(args.fps ?? 24);
const QUALITY = args.q ?? 'medium';
const OUT = args.out ?? 'recordings/demo';
const CHAPTER = args.chapter ?? '';
const PACE = args.pace ?? '1';
const KEEP = args.keep === 'true';
const START = Number(args.start ?? 0);
const DRY = args.dry === 'true';
const ONLY = args.only === 'true';
/** Hard cap so a stall cannot record forever. */
const MAX_SECONDS = Number(args.seconds ?? 300);

function findChrome() {
  for (const c of [process.env.CHROME_PATH, '/usr/local/bin/google-chrome', '/usr/bin/google-chrome']) {
    if (c && existsSync(c)) return c;
  }
  return undefined;
}

async function main() {
  const frameDir = path.join(OUT, 'frames');
  await mkdir(frameDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: findChrome(),
    protocolTimeout: 600000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--disable-frame-rate-limit',
      '--mute-audio',
      `--window-size=${W},${H}`,
      '--js-flags=--max-old-space-size=4096',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  const url =
    `${BASE}/?record=1&w=${W}&h=${H}&q=${QUALITY}&auto=1&pace=${PACE}` +
    (CHAPTER ? `&chapter=${CHAPTER}` : '') +
    (ONLY ? '&only=1' : '');
  console.log(`recording ${url}`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction('window.__READY__ === true || window.__ERROR__', { timeout: 600000, polling: 500 });
  const err = await page.evaluate('window.__ERROR__ || null');
  if (err) throw new Error(err);

  const dt = 1 / FPS;
  const maxFrames = Math.round(MAX_SECONDS * FPS);
  const started = Date.now();
  let i = 0;

  for (; i < maxFrames; i++) {
    // Step, then wait for two animation frames so Chrome commits a paint —
    // otherwise captureScreenshot blocks on an idle compositor.
    await page.evaluate(
      (step) =>
        new Promise((resolve) => {
          window.__stepFrames__(1, step);
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        }),
      dt
    );

    if (DRY) {
      if (i % 100 === 0) await page.screenshot({ captureBeyondViewport: false });
    } else {
      await page.screenshot({
        path: path.join(frameDir, `f${String(START + i).padStart(6, '0')}.png`),
        captureBeyondViewport: false,
      });
    }

    if (i % 25 === 0 || i === maxFrames - 1) {
      const elapsed = (Date.now() - started) / 1000;
      const per = elapsed / (i + 1);
      const progress = await page.evaluate('window.__PROGRESS__ ? JSON.stringify(window.__PROGRESS__) : ""');
      console.log(
        `frame ${i + 1}  t=${((i + 1) / FPS).toFixed(1)}s  ${per.toFixed(2)}s/frame  ${progress}` +
          (errors.length ? `  errors=${errors.length}` : '')
      );
    }

    const done = await page.evaluate('window.__DONE__ === true');
    if (done) {
      console.log(`story finished after ${i + 1} frames (${((i + 1) / FPS).toFixed(1)}s)`);
      i++;
      break;
    }
  }

  await browser.close();
  if (errors.length) console.log(`page reported ${errors.length} error(s); first: ${errors[0]?.slice(0, 300)}`);
  console.log(`captured ${i} frames`);

  if (DRY) {
    console.log('dry run complete; no video written');
    return;
  }

  const video = path.join(OUT, 'video.mp4');
  await new Promise((resolve, reject) => {
    const ff = spawn(
      'ffmpeg',
      [
        '-y',
        '-framerate',
        String(FPS),
        '-start_number',
        String(START),
        '-i',
        path.join(frameDir, 'f%06d.png'),
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '20',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        video,
      ],
      { stdio: ['ignore', 'ignore', 'inherit'] }
    );
    ff.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });
  console.log(`wrote ${video}`);
  if (!KEEP) await rm(frameDir, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
