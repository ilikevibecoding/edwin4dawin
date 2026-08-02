#!/usr/bin/env node
/**
 * Build just the soundtrack, without rendering a single frame.
 *
 * Useful for checking the mix — levels, cue placement, narration against music
 * — long before the picture is finished.
 *
 *   node tools/mixonly.mjs --out /tmp/track.wav
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openFilm } from './browser.mjs';
import { buildCues, mixCues } from './mixaudio.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (k, d = null) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : d;
};

const out = path.resolve(arg('out', '/tmp/brickwars_track.wav'));
const scene = arg('scene', null);
const withVideo = arg('mp4', null);

const film = await openFilm({ width: 320, height: 180, scene, bloom: false, quiet: true, t0: 0, t1: 0.001, all: true });
const sceneCues = await film.page.evaluate('window.FILM.cues()');
const scenes = film.scenes;
const duration = film.duration;
await film.browser.close();

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/audio/manifest.json'), 'utf8'));
const cues = buildCues({ root: ROOT, manifest, sceneCues, scenes });

const byKind = {};
for (const c of cues) byKind[c.kind] = (byKind[c.kind] || 0) + 1;
console.log(`film ${duration.toFixed(1)}s · cues:`, byKind);

const r = mixCues(cues, duration, out);
console.log(`mixed ${r.placed}, missing ${r.missing}, pre-limit peak ${r.peak.toFixed(2)} -> ${out}`);

const stats = execFileSync('ffmpeg', ['-v', 'error', '-i', out, '-af', 'volumedetect', '-f', 'null', '-'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
console.log(stats.toString().split('\n').filter((l) => l.includes('volumedetect')).join('\n'));

if (withVideo) {
  execFileSync('ffmpeg', [
    '-y', '-v', 'error',
    '-f', 'lavfi', '-i', `color=c=black:s=640x360:r=6:d=${Math.ceil(duration)}`,
    '-i', out,
    '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
    withVideo,
  ]);
  console.log('->', withVideo);
}
