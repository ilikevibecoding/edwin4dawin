/**
 * Offline recorder.
 *
 * Software rendering on this machine manages roughly one cinematic frame per
 * second, so the demo cannot be captured in real time. Instead the game is put
 * into fixed-timestep mode and advanced exactly one frame per screenshot: the
 * clock, the story timers and the scripted input all move by the same amount
 * every step, so the result is a frame-accurate recording of a full playthrough
 * regardless of how long each frame took to draw.
 *
 *   node tools/render-video.mjs --out artifacts/demo.mp4 --fps 24 --w 1280 --h 720
 *   node tools/render-video.mjs --frames 240 --out /tmp/probe.mp4   (short probe)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { launch } from './shot.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};

const OUT = arg('out', 'artifacts/demo.mp4');
const FPS = Number(arg('fps', 24));
const W = Number(arg('w', 1280));
const H = Number(arg('h', 720));
const TIER = arg('tier', 'cinema');
const MAX_FRAMES = Number(arg('frames', 60 * 60 * FPS));
const FRAME_DIR = arg('frames-dir', '.render/frames');
const START = Number(arg('start', 0));
const keepFrames = argv.includes('--keep-frames');
const BASE = process.env.BASE_URL || 'http://localhost:5173';

fs.mkdirSync(FRAME_DIR, { recursive: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const browser = await launch();
const page = await browser.newPage();
await page.setViewport({ width: W, height: H });
page.on('pageerror', (e) => console.log('pageerror:', String(e).slice(0, 400)));
page.on('console', (m) => {
  const type = m.type();
  if (type === 'error' || type === 'warning') console.log(`console.${type}:`, m.text().slice(0, 300));
});

const url = `${BASE}/index.html?render=1&tier=${TIER}&w=${W}&h=${H}&fps=${FPS}`;
console.log('loading', url);
await page.goto(url, { waitUntil: 'load', timeout: 600000 });
await page.waitForFunction('window.__ready === true', { timeout: 600000 });

/**
 * Resume point: the highest contiguous frame already on disk. A ten-minute
 * capture takes hours, so losing it to a browser crash is not acceptable; the
 * game is re-simulated up to this point without drawing, which costs seconds
 * rather than hours, and capture continues from there.
 */
let frame = START;
if (!argv.includes('--no-resume')) {
  const existing = fs
    .readdirSync(FRAME_DIR)
    .filter((f) => /^f\d{6}\.jpg$/.test(f))
    .map((f) => Number(f.slice(1, 7)))
    .sort((a, b) => a - b);
  let contiguous = 0;
  for (const n of existing) {
    if (n === contiguous) contiguous++;
    else break;
  }
  // Drop the last frame in case it was half-written when the process died.
  frame = Math.max(START, contiguous - 1);
  if (frame > 0) {
    fs.rmSync(path.join(FRAME_DIR, `f${String(frame).padStart(6, '0')}.jpg`), { force: true });
    console.log(`resuming at frame ${frame}; fast-forwarding`);
    const batch = 240;
    for (let done = 0; done < frame; done += batch) {
      await page.evaluate((n) => window.__skip(n), Math.min(batch, frame - done));
    }
    console.log('caught up');
  }
}
console.log('ready; capturing');

const t0 = Date.now();
let captured = 0;
let finished = false;
while (frame < MAX_FRAMES && !finished) {
  await page.evaluate(() => window.__step(1));
  // JPEG rather than PNG: a ten-minute capture is over thirteen thousand frames,
  // and lossless intermediates cost ten times the disk for no visible gain once
  // the result is x264 at CRF 19.
  const file = path.join(FRAME_DIR, `f${String(frame).padStart(6, '0')}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 94, optimizeForSpeed: true });
  frame++;
  captured++;
  if (frame % 25 === 0) {
    const p = await page.evaluate(() => window.__progress());
    finished = p.finished;
    const elapsed = (Date.now() - t0) / 1000;
    // Flushed per line: when the browser dies the buffered tail is lost, and the
    // log is the only record of where the capture got to.
    fs.appendFileSync(
      '.render/progress.log',
      `frame ${frame} · story ${p.time.toFixed(1)}s · ${(captured / elapsed).toFixed(2)} fps · ` +
        `${(elapsed / 60).toFixed(1)} min\n`
    );
  }
}

const cues = await page.evaluate(() => window.__cues());
fs.writeFileSync('.render/cues.json', JSON.stringify(cues, null, 1));
await browser.close();

const seconds = frame / FPS;
console.log(`captured ${frame} frames (${seconds.toFixed(1)}s of story)`);

// Soundtrack, mixed to the same timeline the cues were recorded on.
execFileSync('node', ['tools/mix-audio.mjs', '--cues', '.render/cues.json', '--out', '.render/track.wav', '--duration', String(seconds)], {
  stdio: 'inherit',
});

execFileSync(
  'ffmpeg',
  [
    '-y',
    '-v',
    'warning',
    '-framerate',
    String(FPS),
    '-i',
    path.join(FRAME_DIR, 'f%06d.jpg'),
    '-i',
    '.render/track.wav',
    '-c:v',
    'libx264',
    '-preset',
    'slow',
    '-crf',
    '19',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '160k',
    '-shortest',
    '-movflags',
    '+faststart',
    OUT,
  ],
  { stdio: 'inherit' }
);

if (!keepFrames) fs.rmSync(FRAME_DIR, { recursive: true, force: true });
console.log('wrote', OUT);
