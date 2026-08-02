#!/usr/bin/env node
/**
 * Offline narration renderer.
 *
 * Synthesises every line of `src/audio/narration-script.json` with a locally
 * installed Piper voice, applies a light cinematic treatment with ffmpeg, and
 * writes Ogg Vorbis files plus a manifest (with measured durations) into
 * `public/audio/narration/`.
 *
 * The voices are ordinary open neutral TTS models — they are not modelled on
 * any performer. Nothing here runs at page load; the app only ever reads the
 * generated files.
 *
 * Requirements: python3 with `piper-tts`, ffmpeg, and the voice models in
 * `tools/voices/` (see `node tools/fetch-voices.mjs`).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const outDir = join(repo, 'public', 'audio', 'narration');
const tmpDir = join(repo, '.narration-tmp');
const voiceDir = join(here, 'voices');
const scriptPath = join(repo, 'src', 'audio', 'narration-script.json');

const VOICE_MODELS = {
  narrator: { model: 'en_GB-alan-medium', lengthScale: 1.06, noiseW: 0.7 },
  princess: { model: 'en_US-amy-medium', lengthScale: 1.0, noiseW: 0.75 },
  protocol: { model: 'en_US-ryan-high', lengthScale: 0.98, noiseW: 0.6 },
};

// Per-voice ffmpeg treatment. The narrator gets a warm, slightly reverberant
// documentary tone; the protocol droid gets a deliberately mechanical timbre.
const VOICE_FILTERS = {
  narrator:
    'highpass=f=75,equalizer=f=180:t=q:w=1.1:g=2.5,equalizer=f=2600:t=q:w=1.4:g=2.2,' +
    'equalizer=f=6500:t=q:w=1.6:g=1.2,acompressor=threshold=-18dB:ratio=3:attack=8:release=180:makeup=2,' +
    'aecho=0.82:0.68:52|118:0.16|0.08,alimiter=limit=0.89,loudnorm=I=-18:TP=-2:LRA=9',
  princess:
    'highpass=f=110,equalizer=f=320:t=q:w=1.2:g=1.4,equalizer=f=3200:t=q:w=1.5:g=2.0,' +
    'acompressor=threshold=-18dB:ratio=3:attack=6:release=160:makeup=2,' +
    'aecho=0.85:0.7:38|84:0.14|0.07,alimiter=limit=0.89,loudnorm=I=-18:TP=-2:LRA=9',
  protocol:
    'asetrate=22050*1.06,aresample=22050,highpass=f=220,lowpass=f=5200,' +
    'equalizer=f=1400:t=q:w=1.0:g=5,equalizer=f=800:t=q:w=1.2:g=-4,' +
    'aphaser=type=t:speed=1.4:decay=0.35,acompressor=threshold=-16dB:ratio=4:attack=4:release=120:makeup=3,' +
    'aecho=0.9:0.75:24|46:0.1|0.05,alimiter=limit=0.89,loudnorm=I=-18:TP=-2:LRA=9',
};

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts });
}

function probeDuration(file) {
  const out = run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1',
    file,
  ]);
  return Number.parseFloat(out.trim());
}

const script = JSON.parse(readFileSync(scriptPath, 'utf8'));

const missing = [];
for (const v of Object.values(VOICE_MODELS)) {
  if (!existsSync(join(voiceDir, `${v.model}.onnx`))) missing.push(v.model);
}
if (missing.length) {
  console.error(`Missing Piper voice models: ${missing.join(', ')}`);
  console.error('Run: node tools/fetch-voices.mjs');
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

const manifest = { version: script.version, generated: new Date().toISOString(), lines: [] };
let index = 0;
for (const line of script.lines) {
  index++;
  const voiceCfg = VOICE_MODELS[line.voice] ?? VOICE_MODELS.narrator;
  const rawWav = join(tmpDir, `${line.id}.raw.wav`);
  const procWav = join(tmpDir, `${line.id}.proc.wav`);
  const oggOut = join(outDir, `${line.id}.ogg`);

  run(
    'python3',
    [
      '-m', 'piper',
      '-m', join(voiceDir, `${voiceCfg.model}.onnx`),
      '--length-scale', String(voiceCfg.lengthScale),
      '--noise-w-scale', String(voiceCfg.noiseW),
      '--sentence-silence', '0.35',
      '-f', rawWav,
    ],
    { input: line.text, env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` } },
  );

  const filter = VOICE_FILTERS[line.voice] ?? VOICE_FILTERS.narrator;
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', rawWav, '-af', filter, '-ar', '24000', '-ac', '1', procWav]);
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', procWav, '-c:a', 'libvorbis', '-q:a', '3', '-ar', '24000', '-ac', '1', oggOut]);

  const duration = probeDuration(oggOut);
  manifest.lines.push({
    id: line.id,
    chapter: line.chapter,
    voice: line.voice,
    time: line.time,
    text: line.text,
    file: `${line.id}.ogg`,
    duration: Math.round(duration * 1000) / 1000,
  });
  console.log(`[${index}/${script.lines.length}] ${line.id} (${line.voice}) -> ${duration.toFixed(2)}s`);
}

writeFileSync(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
rmSync(tmpDir, { recursive: true, force: true });

const words = script.lines.reduce((n, l) => n + l.text.trim().split(/\s+/).length, 0);
const total = manifest.lines.reduce((n, l) => n + l.duration, 0);
console.log(`\nWrote ${manifest.lines.length} clips, ${words} words, ${total.toFixed(1)}s of narration.`);

// Report any overlapping cues so the timeline can be adjusted.
const sorted = [...manifest.lines].sort((a, b) => a.time - b.time);
for (let i = 0; i < sorted.length - 1; i++) {
  const end = sorted[i].time + sorted[i].duration;
  if (end > sorted[i + 1].time) {
    console.warn(
      `  overlap: ${sorted[i].id} ends at ${end.toFixed(1)}s but ${sorted[i + 1].id} starts at ${sorted[i + 1].time}s`,
    );
  }
}
