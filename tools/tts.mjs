#!/usr/bin/env node
/**
 * Narration build step.
 *
 * Synthesises every line in the screenplay with Piper, shapes each character's
 * voice with an ffmpeg filter chain, measures the real durations, and writes
 * `public/audio/manifest.json`. Scene durations fall out of the measured audio,
 * so no scene can ever cut its own narration off.
 *
 *   node tools/tts.mjs            # only re-synthesises changed lines
 *   node tools/tts.mjs --force    # rebuild everything
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENES, SPEAKERS } from '../src/story/script.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const VOICES = path.join(ROOT, 'tools/voices');
const OUT = path.join(ROOT, 'public/audio/lines');
const CACHE = path.join(ROOT, 'tools/.cache/tts');
const PIPER = process.env.PIPER_BIN || path.join(process.env.HOME, '.local/bin/piper');

const force = process.argv.includes('--force');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });

function sh(cmd, args) {
  return execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

function duration(file) {
  return parseFloat(
    sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim()
  );
}

function synth(id, speakerKey, text) {
  const sp = SPEAKERS[speakerKey];
  if (!sp) throw new Error(`unknown speaker: ${speakerKey}`);
  const model = path.join(VOICES, `${sp.voice}.onnx`);
  if (!fs.existsSync(model)) throw new Error(`missing voice model ${model}`);

  const sig = createHash('sha1')
    .update(JSON.stringify([text, sp.voice, sp.lengthScale, sp.chain, sp.gain, 3]))
    .digest('hex')
    .slice(0, 12);
  const finalPath = path.join(OUT, `${id}.mp3`);
  const sigPath = path.join(CACHE, `${id}.sig`);

  if (!force && fs.existsSync(finalPath) && fs.existsSync(sigPath) && fs.readFileSync(sigPath, 'utf8') === sig) {
    return { path: finalPath, cached: true, duration: duration(finalPath) };
  }

  const raw = path.join(CACHE, `${id}.raw.wav`);
  execFileSync(
    PIPER,
    [
      '-m', model,
      '-f', raw,
      '--length-scale', String(sp.lengthScale ?? 1),
      '--noise-scale', '0.62',
      '--noise-w-scale', '0.78',
      '--sentence-silence', '0.28',
    ],
    { input: text, stdio: ['pipe', 'ignore', 'pipe'] }
  );

  const chain = [sp.chain, `volume=${sp.gain ?? 1}`].filter(Boolean).join(',');
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-i', raw,
    '-af', chain,
    '-ar', '44100', '-ac', '1', '-b:a', '128k',
    finalPath,
  ]);
  fs.writeFileSync(sigPath, sig);
  return { path: finalPath, cached: false, duration: duration(finalPath) };
}

// ---------------------------------------------------------------------------

const manifest = { scenes: {}, lines: [], generatedAt: new Date().toISOString() };
let filmT = 0;
let nCached = 0;
let nNew = 0;

for (const scene of SCENES) {
  let cursor = 0;
  const sceneLines = [];
  for (let i = 0; i < scene.lines.length; i++) {
    const l = scene.lines[i];
    const id = `${scene.id}_${String(i).padStart(2, '0')}_${l.speaker}`;
    const r = synth(id, l.speaker, l.text);
    r.cached ? nCached++ : nNew++;

    let start;
    if (l.at !== undefined) start = Math.max(l.at, cursor);
    else start = cursor + (l.gap ?? 0.5);
    cursor = start + r.duration;

    sceneLines.push({
      id,
      scene: scene.id,
      speaker: l.speaker,
      speakerName: SPEAKERS[l.speaker].name,
      text: l.text,
      subtitle: l.subtitle !== false,
      local: +start.toFixed(3),
      dur: +r.duration.toFixed(3),
      url: `audio/lines/${id}.mp3`,
    });
    process.stdout.write(`  ${r.cached ? '·' : '+'} ${id} ${r.duration.toFixed(2)}s\n`);
  }

  const contentEnd = cursor + (scene.tail ?? 2);
  const dur = +Math.max(scene.minDuration ?? 0, contentEnd).toFixed(3);
  manifest.scenes[scene.id] = { id: scene.id, title: scene.title, start: +filmT.toFixed(3), duration: dur };
  for (const sl of sceneLines) {
    manifest.lines.push({ ...sl, t: +(filmT + sl.local).toFixed(3) });
  }
  console.log(`SCENE ${scene.id.padEnd(10)} start ${filmT.toFixed(2).padStart(7)}s  dur ${dur.toFixed(2)}s`);
  filmT += dur;
}

manifest.duration = +filmT.toFixed(3);
fs.mkdirSync(path.join(ROOT, 'public/audio'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'public/audio/manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`\n${nNew} synthesised, ${nCached} cached`);
console.log(`Film duration: ${Math.floor(manifest.duration / 60)}m ${(manifest.duration % 60).toFixed(1)}s`);
