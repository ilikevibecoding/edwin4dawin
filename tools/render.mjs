#!/usr/bin/env node
/**
 * Offline film renderer.
 *
 * The film is a pure function of time, so the timeline can be split across
 * several headless browsers rendering in parallel and stitched back together.
 * That matters here: WebGL runs on SwiftShader (no GPU), where reading a frame
 * back out of the canvas costs far more than drawing it.
 *
 *   node tools/render.mjs                                  # whole film, 30fps
 *   node tools/render.mjs --scene trench --fps 24          # one scene
 *   node tools/render.mjs --t0 40 --t1 60 --workers 4
 *   node tools/render.mjs --w 854 --h 480 --fps 20         # fast rough cut
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openFilm, buildAndServe } from './browser.mjs';
import { buildCues, mixCues } from './mixaudio.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d = null) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : d;
};
const has = (k) => argv.includes('--' + k);

const FPS = parseFloat(arg('fps', '30'));
const WIDTH = parseInt(arg('w', '1280'), 10);
const HEIGHT = parseInt(arg('h', '720'), 10);
const WORKERS = parseInt(arg('workers', '4'), 10);
const SCENE = arg('scene', null);
const OUT = path.resolve(arg('out', SCENE ? `/tmp/brickwars_${SCENE}.mp4` : path.join(ROOT, 'out/brickwars.mp4')));
const QUALITY = parseFloat(arg('q', '0.94'));
const BLOOM = !has('no-bloom');
const NO_AUDIO = has('no-audio');
const KEEP = has('keep-frames');
const CRF = arg('crf', '17');
const FRAMEDIR = arg('framedir', null);
// Render from a static build by default: the dev server's HMR reloads the page
// whenever any source file is saved, which would corrupt a long render.
const USE_DIST = !has('dev');

fs.mkdirSync(path.dirname(OUT), { recursive: true });

let server = null;
let BASE = arg('base', 'http://localhost:5173');
if (USE_DIST) {
  console.log('building static bundle…');
  server = await buildAndServe(ROOT);
  BASE = server.url;
}

// ---------------------------------------------------------------------------
// Probe the film once to learn its duration, scene list and sound cues.
// ---------------------------------------------------------------------------
console.log('probing film…');
const probe = await openFilm({ base: BASE, width: 320, height: 180, scene: SCENE, bloom: false, quiet: true, t0: 0, t1: 0.001, all: true });
const duration = probe.duration;
const scenes = probe.scenes;
const sceneCues = await probe.page.evaluate('window.FILM.cues()');
await probe.browser.close();

const T0 = parseFloat(arg('t0', '0'));
const T1 = Math.min(parseFloat(arg('t1', String(duration))), duration);
const total = Math.max(1, Math.round((T1 - T0) * FPS));
// Absolute index of the first frame of this run, so a partial re-render lands
// on the frames it is actually replacing.
const FRAME0 = Math.round(T0 * FPS);

console.log(
  `film ${fmt(duration)} · rendering ${fmt(T1 - T0)} (${total} frames) at ${WIDTH}x${HEIGHT}@${FPS}fps ` +
    `with ${WORKERS} worker(s)${SCENE ? ` · scene=${SCENE}` : ''}${BLOOM ? '' : ' · no bloom'}`
);
for (const s of scenes) console.log(`   ${String(s.i).padStart(2)} ${s.id.padEnd(11)} ${fmt(s.start)} +${s.duration.toFixed(1)}s`);

const frameDir = FRAMEDIR || fs.mkdtempSync(path.join(os.tmpdir(), 'bwframes-'));
fs.mkdirSync(frameDir, { recursive: true });

// ---------------------------------------------------------------------------
// Render frames, sharded by contiguous time ranges.
// ---------------------------------------------------------------------------
const shards = [];
const per = Math.ceil(total / WORKERS);
for (let i = 0; i < WORKERS; i++) {
  const a = i * per;
  const b = Math.min(total, a + per);
  if (a >= b) break;
  shards.push({ i, from: a, to: b });
}

let done = 0;
const started = Date.now();
let lastLog = 0;
function tick() {
  done++;
  const now = Date.now();
  if (now - lastLog < 3000 && done < total) return;
  lastLog = now;
  const el = (now - started) / 1000;
  const rate = done / el;
  const eta = (total - done) / Math.max(rate, 1e-6);
  process.stdout.write(
    `\r  ${done}/${total} frames · ${rate.toFixed(1)} fps · elapsed ${fmt(el)} · eta ${fmt(eta)}      `
  );
}

const allErrors = [];
await Promise.all(
  shards.map(async (shard) => {
    const t0 = T0 + shard.from / FPS;
    const t1 = T0 + (shard.to - 1) / FPS + 1e-4;
    const film = await openFilm({
      base: BASE,
      width: WIDTH,
      height: HEIGHT,
      t0,
      t1,
      scene: SCENE,
      bloom: BLOOM,
      quiet: true,
    });
    for (let f = shard.from; f < shard.to; f++) {
      const t = T0 + f / FPS;
      const data = await film.page.evaluate((tt, q) => window.FILM.drawAndGrab(tt, q), t, QUALITY);
      // Frames are named by their ABSOLUTE position in the film, not by their
      // offset within this run. Numbering them from zero meant a partial
      // re-render (`--t0 46 --t1 114`) silently overwrote the opening frames
      // with the wrong part of the movie.
      fs.writeFileSync(
        path.join(frameDir, `f${String(FRAME0 + f).padStart(6, '0')}.jpg`),
        Buffer.from(data.slice(data.indexOf(',') + 1), 'base64')
      );
      tick();
    }
    allErrors.push(...film.errors);
    await film.browser.close();
  })
);
process.stdout.write('\n');

const uniqueErrors = [...new Set(allErrors)];
if (uniqueErrors.length) {
  console.log('page errors seen during render:');
  for (const e of uniqueErrors.slice(0, 20)) console.log('  ! ' + e);
}

// ---------------------------------------------------------------------------
// Soundtrack
// ---------------------------------------------------------------------------
let audioWav = null;
if (!NO_AUDIO) {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/audio/manifest.json'), 'utf8'));
  // Shift every cue so that t=0 is the first rendered frame.
  const cues = buildCues({ root: ROOT, manifest, sceneCues, scenes })
    .map((c) => ({ ...c, t: c.t - T0 }))
    .filter((c) => c.t > -30 && c.t < T1 - T0 + 1);
  audioWav = path.join(frameDir, 'track.wav');
  const r = mixCues(cues, T1 - T0, audioWav);
  console.log(`audio: ${r.placed} cues mixed, ${r.missing} missing, pre-limit peak ${r.peak.toFixed(2)}`);
}

// ---------------------------------------------------------------------------
// Encode
// ---------------------------------------------------------------------------
console.log('encoding…');
const args = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frameDir, 'f%06d.jpg')];
if (audioWav) args.push('-i', audioWav);
args.push(
  '-c:v', 'libx264',
  '-preset', 'medium',
  '-crf', CRF,
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2'
);
if (audioWav) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
args.push(OUT);

if (FRAME0 !== 0) args.splice(args.indexOf('-framerate'), 0, '-start_number', String(FRAME0));

// Guard against encoding a half-populated frame directory: every frame this
// run covers must exist before ffmpeg is handed the sequence.
for (const idx of [FRAME0, FRAME0 + total - 1]) {
  const f = path.join(frameDir, `f${String(idx).padStart(6, '0')}.jpg`);
  if (!fs.existsSync(f)) {
    console.error(`missing expected frame ${f} - refusing to encode`);
    process.exit(1);
  }
}

const enc = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (enc.status !== 0) {
  console.error('ffmpeg failed');
  process.exit(1);
}

const size = fs.statSync(OUT).size;
console.log(`\n${OUT}  ${(size / 1e6).toFixed(1)} MB  ${fmt((Date.now() - started) / 1000)} total`);
try {
  console.log(
    execFileSync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration,bit_rate',
      '-show_entries', 'stream=codec_type,width,height,r_frame_rate',
      '-of', 'default=noprint_wrappers=1',
      OUT,
    ]).toString()
  );
} catch {}

if (!KEEP && !FRAMEDIR) fs.rmSync(frameDir, { recursive: true, force: true });
else console.log('frames kept in', frameDir);
server?.close();

function fmt(s) {
  if (!isFinite(s)) return '–';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m ? `${m}m${r.toFixed(0).padStart(2, '0')}s` : `${r.toFixed(1)}s`;
}
