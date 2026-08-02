#!/usr/bin/env node
/*
 * Narration pipeline.
 *
 * Synthesizes every line in src/story.js with Piper (a local neural TTS), then
 * runs each through a per-character ffmpeg chain — Vader gets pitched down and
 * squeezed through a helmet, troopers get a comlink, C-3PO gets thinner and
 * reedier — and writes the results plus a duration manifest into
 * public/audio/vo/.
 *
 *   node tools/vo.mjs             # only re-render lines whose text/voice changed
 *   node tools/vo.mjs --force     # re-render everything
 *   node tools/vo.mjs n01 v01     # re-render specific lines
 */
import { execFileSync, execSync } from 'child_process';
import { mkdirSync, existsSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { LINES, VOICES } from '../src/story.js';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'public/audio/vo');
const TMP = path.join(ROOT, 'tmp/vo');
const PIPER = process.env.PIPER || '/tmp/ttsvenv/bin/python';
const VOICE_DIR = process.env.VOICE_DIR || path.join(process.env.HOME || '/tmp', '.cache/piper-voices');
const HF = 'https://huggingface.co/rhasspy/piper-voices/resolve/main';

const VOICE_PATHS = {
  'en_GB-alan-medium': 'en/en_GB/alan/medium',
  'en_US-ryan-high': 'en/en_US/ryan/high',
  'en_GB-jenny_dioco-medium': 'en/en_GB/jenny_dioco/medium',
  'en_GB-northern_english_male-medium': 'en/en_GB/northern_english_male/medium',
  'en_US-lessac-high': 'en/en_US/lessac/high',
};

const argv = process.argv.slice(2);
const force = argv.includes('--force');
const only = argv.filter((a) => !a.startsWith('--'));

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(VOICE_DIR, { recursive: true });

function ensureVoice(name) {
  const onnx = path.join(VOICE_DIR, `${name}.onnx`);
  if (existsSync(onnx)) return onnx;
  const rel = VOICE_PATHS[name];
  if (!rel) throw new Error(`unknown voice ${name}`);
  console.log(`[vo] downloading voice ${name} ...`);
  execSync(`curl -sSfL -o "${onnx}" "${HF}/${rel}/${name}.onnx"`, { stdio: 'inherit' });
  execSync(`curl -sSfL -o "${onnx}.json" "${HF}/${rel}/${name}.onnx.json"`, { stdio: 'inherit' });
  return onnx;
}

function duration(file) {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${file}"`,
  ).toString().trim();
  return Math.round(parseFloat(out) * 1000) / 1000;
}

const manifestPath = path.join(OUT, 'manifest.json');
const prev = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { lines: {} };
const manifest = { generated: new Date().toISOString(), lines: {} };

let rendered = 0;
for (const line of LINES) {
  const voice = VOICES[line.voice];
  if (!voice) throw new Error(`line ${line.id}: unknown voice ${line.voice}`);
  const stamp = createHash('sha1')
    .update(JSON.stringify([line.text, voice.model, voice.lengthScale, voice.filter]))
    .digest('hex').slice(0, 12);

  const outFile = path.join(OUT, `${line.id}.wav`);
  const cached = prev.lines?.[line.id];
  const wanted = only.length === 0 || only.includes(line.id);
  if (!force && wanted && cached && cached.stamp === stamp && existsSync(outFile)) {
    manifest.lines[line.id] = cached;
    continue;
  }
  if (!wanted && cached && existsSync(outFile)) { manifest.lines[line.id] = cached; continue; }

  const model = ensureVoice(voice.model);
  const raw = path.join(TMP, `${line.id}.raw.wav`);
  // `python -m piper` then piper's own -m for the model file.
  execFileSync(PIPER, [
    '-m', 'piper',
    '-m', model,
    '--length-scale', String(voice.lengthScale ?? 1),
    '--sentence-silence', String(voice.sentenceSilence ?? 0.22),
    '-f', raw,
  ], { input: line.text, stdio: ['pipe', 'ignore', 'pipe'] });

  const chain = [
    'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.03',
    voice.filter,
    'loudnorm=I=-18:TP=-1.5:LRA=11',
    'apad=pad_dur=0.12',
  ].filter(Boolean).join(',');

  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-af', chain,
    '-ar', '22050', '-ac', '1', '-c:a', 'pcm_s16le', outFile], { stdio: 'inherit' });
  rmSync(raw, { force: true });

  manifest.lines[line.id] = {
    id: line.id, voice: line.voice, stamp,
    duration: duration(outFile),
    text: line.text,
    caption: line.caption || line.text,
    speaker: line.voice === 'narrator' ? '' : (voice.label || ''),
  };
  rendered++;
  console.log(`[vo] ${line.id.padEnd(4)} ${String(manifest.lines[line.id].duration).padStart(6)}s  ${line.voice.padEnd(9)} ${line.text.slice(0, 62)}`);
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const total = Object.values(manifest.lines).reduce((a, l) => a + l.duration, 0);
console.log(`\n[vo] ${rendered} rendered, ${Object.keys(manifest.lines).length} total, ${total.toFixed(1)}s of narration -> ${path.relative(ROOT, OUT)}`);
