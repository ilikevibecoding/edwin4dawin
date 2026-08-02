#!/usr/bin/env node
/**
 * Mux rendered frames + the offline soundtrack into the finished film.
 *
 *   node tools/make-movie.mjs --frames render/frames --audio render/soundtrack.wav \
 *        --out render/lego-star-wars.mp4 --fps 24
 */
import { execFileSync } from 'child_process';
import { existsSync, readdirSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };

const FRAMES = flag('frames', 'render/frames');
const AUDIO = flag('audio', 'render/soundtrack.wav');
const OUT = flag('out', 'render/lego-star-wars.mp4');
const FPS = flag('fps', '24');
const CRF = flag('crf', '20');

const list = readdirSync(FRAMES).filter((f) => f.endsWith('.jpg')).sort();
if (!list.length) { console.error('no frames in ' + FRAMES); process.exit(1); }
console.log(`${list.length} frames, first ${list[0]}, last ${list[list.length - 1]}`);

mkdirSync(dirname(OUT), { recursive: true });
const args = [
  '-y', '-loglevel', 'warning', '-stats',
  '-framerate', FPS, '-start_number', String(parseInt(list[0], 10)),
  '-i', `${FRAMES}/%06d.jpg`,
];
if (existsSync(AUDIO)) args.push('-i', AUDIO);
args.push(
  '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF,
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2'
);
if (existsSync(AUDIO)) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
args.push(OUT);

execFileSync('ffmpeg', args, { stdio: 'inherit' });

const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT]).toString().trim();
console.log(`\nwrote ${OUT}  (${(+dur).toFixed(1)}s)`);
