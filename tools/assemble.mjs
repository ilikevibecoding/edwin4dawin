#!/usr/bin/env node
/**
 * Stitch the rendered segments into the final demo: hardlink every frame into
 * one ordered sequence, synthesise a score of matching length, encode, mux.
 *
 *   node tools/assemble.mjs --out render/deviant-demo.mp4
 */
import { mkdir, readdir, rm, link, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { parseArgs } from './harness.mjs';

const args = parseArgs(process.argv.slice(2));
const outFile = path.resolve(args.out ?? 'render/deviant-demo.mp4');
const encodeFps = Number(args.encodeFps ?? 12);
const outFps = Number(args.outFps ?? 24);
const scale = args.scale ?? '1280:720';

// Segment order: the opening render, then one segment per later chapter.
const SEGMENTS = (args.segments ??
  'render/demo/frames,render/seg-apartment/frames,render/seg-ledge/frames,render/seg-interro/frames,render/seg-garden/frames,render/seg-ending/frames'
)
  .split(',')
  .map((p) => path.resolve(p))
  .filter((p) => existsSync(p));

const stage = path.resolve('render/_stage');
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });

let index = 0;
for (const dir of SEGMENTS) {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.jpg')).sort();
  for (const f of files) {
    await link(path.join(dir, f), path.join(stage, `${String(index).padStart(6, '0')}.jpg`));
    index++;
  }
  console.log(`${path.relative(process.cwd(), dir)}: ${files.length} frames`);
}
if (index === 0) throw new Error('no frames found');

const seconds = index / encodeFps;
console.log(`total ${index} frames = ${seconds.toFixed(1)}s of video`);

const run = (cmd, cmdArgs) =>
  new Promise((resolve, reject) => {
    const proc = spawn(cmd, cmdArgs, { stdio: ['ignore', 'inherit', 'pipe'] });
    let log = '';
    proc.stderr.on('data', (b) => (log += b));
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(log.slice(-3000)))));
  });

const scoreFile = path.resolve('render/score.wav');
if (!args.noAudio) {
  console.log('synthesising score...');
  await run('node', ['tools/make-audio.mjs', '--seconds', String(Math.ceil(seconds) + 1), '--out', scoreFile]);
}

console.log('encoding...');
await mkdir(path.dirname(outFile), { recursive: true });
await run('ffmpeg', [
  '-y',
  '-framerate',
  String(encodeFps),
  '-i',
  path.join(stage, '%06d.jpg'),
  ...(args.noAudio ? [] : ['-i', scoreFile]),
  '-vf',
  `scale=${scale}:flags=lanczos`,
  '-c:v',
  'libx264',
  '-preset',
  'medium',
  '-crf',
  '20',
  '-pix_fmt',
  'yuv420p',
  '-r',
  String(outFps),
  '-movflags',
  '+faststart',
  ...(args.noAudio ? [] : ['-c:a', 'aac', '-b:a', '160k', '-shortest']),
  outFile,
]);

const info = await stat(outFile);
console.log(`wrote ${outFile} (${(info.size / 1e6).toFixed(1)} MB, ${seconds.toFixed(1)}s)`);
