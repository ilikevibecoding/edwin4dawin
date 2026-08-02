#!/usr/bin/env node
/**
 * Renders the narration script to audio files under public/audio/narration.
 *
 * The narration text is the single source of truth in src/timeline/Script.ts;
 * this script bundles that module with the esbuild that ships inside Vite so
 * there is never a second copy of the words to keep in sync.
 *
 * Speech is produced with Piper, a local open-source neural TTS. Nothing is
 * sampled from any performance, and no cloud service or API key is involved.
 *
 *   PIPER_BIN     path to the piper executable      (default: piper)
 *   PIPER_VOICES  directory holding the .onnx voices (default: ./voices)
 *
 * If the tools are missing the script exits cleanly and the application falls
 * back to browser speech synthesis at runtime.
 */

import { spawn } from 'node:child_process';
import { mkdir, rm, writeFile, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'audio', 'narration');
const tmpDir = path.join(os.tmpdir(), 'starfall-narration');

const PIPER = process.env.PIPER_BIN ?? 'piper';
const VOICE_DIR = process.env.PIPER_VOICES ?? path.join(root, 'voices');

/** Voice assignment. Neutral, unhurried delivery; no actor is imitated. */
const VOICES = {
  narrator: { file: 'en_GB-alan-medium.onnx', lengthScale: 1.16, noise: 0.55, noiseW: 0.7 },
  princess: { file: 'en_GB-jenny_dioco-medium.onnx', lengthScale: 1.02, noise: 0.6, noiseW: 0.8 },
  officer: { file: 'en_US-joe-medium.onnx', lengthScale: 1.0, noise: 0.6, noiseW: 0.8 },
};

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'], ...opts });
    let stderr = '';
    let stdout = '';
    child.stdout?.on('data', (d) => (stdout += d));
    child.stderr?.on('data', (d) => (stderr += d));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-800)}`)),
    );
    if (opts.input !== undefined) {
      child.stdin.write(opts.input);
      child.stdin.end();
    }
  });
}

async function have(cmd) {
  try {
    await run(cmd, ['-h']);
    return true;
  } catch {
    try {
      await run('which', [cmd]);
      return true;
    } catch {
      return false;
    }
  }
}

async function loadScript() {
  const esbuild = await import('esbuild');
  await mkdir(tmpDir, { recursive: true });
  const bundle = path.join(tmpDir, 'script.mjs');
  await esbuild.build({
    entryPoints: [path.join(root, 'src', 'timeline', 'Script.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: bundle,
    logLevel: 'silent',
  });
  return import(`${bundle}?v=${Date.now()}`);
}

async function main() {
  const { NARRATION, narrationWordCount } = await loadScript();
  console.log(`Narration script: ${NARRATION.length} lines, ${narrationWordCount()} words.`);

  if (!(await have(PIPER))) {
    console.warn(`\n[skip] "${PIPER}" not found on PATH.`);
    console.warn('       The application will use browser speech synthesis instead.');
    console.warn('       Install with:  pip install piper-tts');
    return;
  }
  if (!(await have('ffmpeg'))) {
    console.warn('\n[skip] ffmpeg not found; cannot encode narration to mp3.');
    return;
  }

  for (const v of Object.values(VOICES)) {
    const p = path.join(VOICE_DIR, v.file);
    if (!existsSync(p)) {
      console.warn(`\n[skip] Missing voice model: ${p}`);
      console.warn('       Download Piper voices into ./voices (see README).');
      return;
    }
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await mkdir(tmpDir, { recursive: true });

  const manifest = {};
  const durations = {};
  let index = 0;
  for (const line of NARRATION) {
    index++;
    const voice = VOICES[line.speaker] ?? VOICES.narrator;
    const wav = path.join(tmpDir, `${line.id}.wav`);
    const mp3Name = `${line.id}.mp3`;
    const mp3 = path.join(outDir, mp3Name);

    await run(PIPER, [
      '--model',
      path.join(VOICE_DIR, voice.file),
      '--output-file',
      wav,
      '--length-scale',
      String(voice.lengthScale),
      '--noise-scale',
      String(voice.noise),
      '--noise-w-scale',
      String(voice.noiseW),
      '--sentence-silence',
      '0.35',
    ], { input: line.text });

    // Loudness-normalise, trim leading silence, and encode small mono mp3s.
    const filters = [
      'silenceremove=start_periods=1:start_silence=0.05:start_threshold=-50dB',
      'loudnorm=I=-19:TP=-2.0:LRA=9',
      'aresample=44100',
    ].join(',');
    await run('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-i',
      wav,
      '-af',
      filters,
      '-ac',
      '1',
      '-b:a',
      '72k',
      mp3,
    ]);

    const probe = await run('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      mp3,
    ]);
    const duration = Number(probe.stdout.trim()) || 0;
    durations[line.id] = Number(duration.toFixed(2));
    manifest[line.id] = mp3Name;
    const size = (await stat(mp3)).size;
    console.log(
      `  ${String(index).padStart(2, '0')}  ${line.id.padEnd(4)} ${line.speaker.padEnd(9)} ${duration.toFixed(2)}s  ${(size / 1024).toFixed(0)} KiB`,
    );
  }

  await writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(outDir, 'durations.json'), `${JSON.stringify(durations, null, 2)}\n`);

  // Report where the measured audio overruns the slot reserved in the script.
  const overruns = [];
  for (let i = 0; i < NARRATION.length; i++) {
    const line = NARRATION[i];
    const end = line.start + durations[line.id];
    const next = NARRATION[i + 1];
    if (next && end > next.start + 0.25) {
      overruns.push(`${line.id} runs ${(end - next.start).toFixed(2)}s into ${next.id}`);
    }
  }
  if (overruns.length) {
    console.warn('\nTiming overruns to fix in Script.ts:');
    overruns.forEach((o) => console.warn(`  - ${o}`));
  } else {
    console.log('\nAll narration fits inside its scheduled slot.');
  }

  const total = Object.values(durations).reduce((a, b) => a + b, 0);
  console.log(`Total narration: ${total.toFixed(1)}s across ${NARRATION.length} clips.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

export { VOICES };

// Keep the linter honest about unused imports in the skip paths.
void readFile;
