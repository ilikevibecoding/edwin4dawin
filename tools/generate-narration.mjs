#!/usr/bin/env node
/**
 * Offline narration renderer.
 *
 * Reads narration/script.json, synthesises each line with a local Piper voice,
 * post-processes it with ffmpeg into a cinematic-sounding read, encodes to
 * Ogg Vorbis, and writes public/audio/narration/ plus a manifest containing
 * the measured duration of every clip.
 *
 * Requires: python3 with `piper-tts` installed, and ffmpeg on PATH.
 * Nothing here runs in the browser and no API keys are involved.
 *
 *   node tools/generate-narration.mjs [--force] [--only=id1,id2]
 */

import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = join(root, 'narration', 'script.json');
const outDir = join(root, 'public', 'audio', 'narration');
const voiceDir = join(os.homedir(), '.cache', 'piper-voices');
const tmpDir = join(os.tmpdir(), 'narration-build');

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = (args.find((a) => a.startsWith('--only=')) ?? '').replace('--only=', '').split(',').filter(Boolean);

mkdirSync(outDir, { recursive: true });
mkdirSync(voiceDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

const script = JSON.parse(readFileSync(scriptPath, 'utf8'));

/* ---------------------------------------------------------------- helpers */

function run(cmd, cmdArgs, opts = {}) {
  return execFileSync(cmd, cmdArgs, { stdio: ['pipe', 'pipe', 'pipe'], ...opts });
}

function haveFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function ensureVoice(model) {
  const onnx = join(voiceDir, `${model}.onnx`);
  if (existsSync(onnx)) return onnx;
  console.log(`  downloading voice ${model} …`);
  run('python3', ['-m', 'piper.download_voices', model], { cwd: voiceDir });
  return onnx;
}

function durationOf(file) {
  const out = run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file,
  ]).toString().trim();
  return Number.parseFloat(out);
}

/**
 * Post-processing chains. Each turns a dry, close synthetic read into
 * something that sits in a mix.
 *
 *  cinematic — a broad narrator: gentle de-ess, low-mid warmth, a short plate,
 *              light compression and a small amount of air.
 *  interior  — dialogue recorded in a metal corridor: tighter, brighter, with
 *              a very short slap.
 *  comm      — heavily band-limited, as though over a ship intercom.
 *  droid     — band-limited plus a mild ring modulation for a synthetic edge.
 */
const CHAINS = {
  cinematic: [
    'highpass=f=75',
    'equalizer=f=180:width_type=q:width=1.1:g=2.2',
    'equalizer=f=420:width_type=q:width=1.4:g=-2.0',
    'equalizer=f=2600:width_type=q:width=1.6:g=1.6',
    'equalizer=f=7200:width_type=q:width=1.0:g=1.8',
    'acompressor=threshold=-20dB:ratio=3:attack=8:release=180:makeup=2',
    'aecho=0.82:0.62:38|72:0.16|0.09',
    'alimiter=limit=0.89',
    'loudnorm=I=-19:TP=-2.0:LRA=9',
  ],
  interior: [
    'highpass=f=110',
    'equalizer=f=3000:width_type=q:width=1.4:g=2.4',
    'equalizer=f=300:width_type=q:width=1.2:g=-1.5',
    'acompressor=threshold=-19dB:ratio=3.2:attack=6:release=140:makeup=2',
    'aecho=0.8:0.5:22|41:0.13|0.07',
    'alimiter=limit=0.89',
    'loudnorm=I=-19:TP=-2.0:LRA=9',
  ],
  comm: [
    'highpass=f=380',
    'lowpass=f=3400',
    'equalizer=f=1800:width_type=q:width=1.0:g=4',
    'acompressor=threshold=-16dB:ratio=6:attack=4:release=90:makeup=4',
    'aecho=0.9:0.35:14:0.1',
    'alimiter=limit=0.87',
    'loudnorm=I=-19:TP=-2.0:LRA=8',
  ],
  droid: [
    'asetrate=22050*1.06,aresample=22050',
    'highpass=f=300',
    'lowpass=f=5200',
    'equalizer=f=2200:width_type=q:width=0.9:g=3.5',
    'tremolo=f=42:d=0.16',
    'acompressor=threshold=-17dB:ratio=5:attack=4:release=100:makeup=3',
    'aecho=0.85:0.4:18|33:0.12|0.06',
    'alimiter=limit=0.87',
    'loudnorm=I=-19:TP=-2.0:LRA=8',
  ],
};

/* ------------------------------------------------------------------- main */

if (!haveFfmpeg()) {
  console.error('ffmpeg is required. Install it and re-run.');
  process.exit(1);
}

const manifest = { generated: new Date().toISOString(), clips: {} };
const manifestPath = join(outDir, 'manifest.json');
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { clips: {} };

let made = 0;
let skipped = 0;

for (const line of script.lines) {
  if (only.length && !only.includes(line.id)) {
    if (previous.clips?.[line.id]) manifest.clips[line.id] = previous.clips[line.id];
    continue;
  }
  const voice = script.voices[line.voice] ?? script.voices.narrator;
  const outFile = join(outDir, `${line.id}.ogg`);
  const signature = `${voice.model}|${voice.lengthScale}|${voice.chain}|${line.text}`;

  if (!force && existsSync(outFile) && previous.clips?.[line.id]?.signature === signature) {
    manifest.clips[line.id] = previous.clips[line.id];
    skipped++;
    continue;
  }

  const model = ensureVoice(voice.model);
  const rawWav = join(tmpDir, `${line.id}-raw.wav`);

  run('python3', [
    '-m', 'piper',
    '-m', model,
    '-f', rawWav,
    '--length-scale', String(voice.lengthScale ?? 1),
    '--noise-scale', String(voice.noiseScale ?? 0.667),
    '--noise-w-scale', String(voice.noiseW ?? 0.8),
  ], { input: line.text });

  const chain = CHAINS[voice.chain] ?? CHAINS.cinematic;
  // A short lead-in and tail stop the compressor from clipping the first word.
  const filter = ['adelay=60|60', ...chain, 'apad=pad_dur=0.25'].join(',');

  run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', rawWav,
    '-af', filter,
    '-ac', '1', '-ar', '44100',
    '-c:a', 'libvorbis', '-q:a', '4',
    outFile,
  ]);

  const dur = durationOf(outFile);
  manifest.clips[line.id] = {
    file: `${line.id}.ogg`,
    duration: Number(dur.toFixed(3)),
    voice: line.voice,
    signature,
    words: line.text.split(/\s+/).length,
  };
  made++;
  console.log(`  ${line.id.padEnd(4)} ${dur.toFixed(2)}s  ${line.text.slice(0, 62)}`);
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
rmSync(tmpDir, { recursive: true, force: true });

const totalWords = script.lines.reduce((n, l) => n + l.text.split(/\s+/).length, 0);
console.log(`\n${made} generated, ${skipped} unchanged.`);
console.log(`Script is ${totalWords} words across ${script.lines.length} lines.`);

/* ------------------------------- overlap check ------------------------- */
const sorted = [...script.lines].sort((a, b) => a.t - b.t);
let clashes = 0;
for (let i = 0; i < sorted.length - 1; i++) {
  const cur = sorted[i];
  const next = sorted[i + 1];
  const d = manifest.clips[cur.id]?.duration ?? 0;
  const end = cur.t + d;
  if (end > next.t + 0.05) {
    clashes++;
    console.warn(
      `  overlap: ${cur.id} ends at ${end.toFixed(2)}s but ${next.id} starts at ${next.t.toFixed(2)}s ` +
      `(${(end - next.t).toFixed(2)}s over)`,
    );
  }
}
if (clashes === 0) console.log('No narration overlaps.');
else console.log(`${clashes} overlapping line(s) — adjust cue times in narration/script.json.`);
