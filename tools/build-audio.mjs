#!/usr/bin/env node
/**
 * Lays the film out in time and mixes the master track.
 *
 * This is where the picture gets its clock: walking the script produces the
 * absolute start of every line, and therefore the duration of every chapter,
 * which is written to src/story/timing.json for the renderer to key off.
 *
 *   npm run audio            # synthesise anything missing, then mix
 *   npm run audio -- --mix   # re-mix only (skip TTS/SFX/music)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { SR, stereo, stereoSec, addStereo, scaleStereo, normalise, limit, peakOf, rmsOf } from './lib/dsp.mjs';

const dbfs = (x) => (x > 1e-9 ? 20 * Math.log10(x) : -Infinity);
import { writeWav, readWav } from './lib/wav.mjs';
import { SCRIPT, CHAPTER_ORDER } from '../src/story/script.js';
import { SFX_CUES, MUSIC_CUES } from './sfx-cues.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const AUDIO = path.join(ROOT, 'public/audio');
const args = process.argv.slice(2);
const mixOnly = args.includes('--mix');

/** Pure-action time reserved on top of the dialogue in each chapter. */
const EXTRA_TAIL = {
  title: 7, chase: 9, boarding: 7, message: 5, dunes: 5,
  twinsuns: 4, saber: 4, trench: 19, medals: 7,
};

function run(script, extra = []) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', script), ...extra], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${script} failed`);
}

if (!mixOnly) {
  console.log('- narration');
  run('tts.mjs');
  console.log('- sound effects');
  run('sfx.mjs');
  console.log('- score');
  run('music.mjs');
}

// ------------------------------------------------------------------ layout

const vo = JSON.parse(fs.readFileSync(path.join(AUDIO, 'vo/manifest.json'), 'utf8'));
const voById = new Map(vo.lines.map((l) => [l.id, l]));

let cursor = 0;
const lines = [];
const chapters = [];
for (const ch of CHAPTER_ORDER) {
  const start = cursor;
  for (const s of SCRIPT.filter((x) => x.ch === ch)) {
    const rec = voById.get(s.id);
    if (!rec) throw new Error(`no audio for line ${s.id}; run tools/tts.mjs`);
    cursor += s.pre || 0;
    lines.push({
      id: s.id, ch, who: s.who, text: s.text,
      start: +cursor.toFixed(3), dur: +rec.dur.toFixed(3),
    });
    cursor += rec.dur + (s.post || 0);
  }
  cursor += EXTRA_TAIL[ch] || 0;
  chapters.push({ id: ch, start: +start.toFixed(3), dur: +(cursor - start).toFixed(3) });
}
const DURATION = cursor;
const lineById = new Map(lines.map((l) => [l.id, l]));
const chapterById = new Map(chapters.map((c) => [c.id, c]));

console.log(`\nfilm is ${DURATION.toFixed(1)}s (${Math.floor(DURATION / 60)}m ${Math.round(DURATION % 60)}s)`);
for (const c of chapters) console.log(`  ${c.id.padEnd(10)} ${c.start.toFixed(1).padStart(7)}  +${c.dur.toFixed(1)}`);

// -------------------------------------------------------------------- mix

const TOTAL = Math.ceil(DURATION + 3);
const voBus = stereoSec(TOTAL);
const musicBus = stereoSec(TOTAL);
const sfxBus = stereoSec(TOTAL);

const cache = new Map();
function load(rel) {
  if (cache.has(rel)) return cache.get(rel);
  const r = readWav(path.join(AUDIO, rel));
  const st = { L: r.channels[0], R: r.channels[1] || r.channels[0] };
  cache.set(rel, st);
  return st;
}

for (const l of lines) addStereo(voBus, load(`vo/${l.id}.wav`), l.start * SR, 1);

/** Resolve a cue's absolute start time from its script-relative anchor. */
function resolveAt(c) {
  if (c.after) {
    const l = lineById.get(c.after);
    if (!l) throw new Error(`sfx cue references unknown line "${c.after}"`);
    return l.start + (c.at || 0);
  }
  if (c.afterEnd) {
    const l = lineById.get(c.afterEnd);
    if (!l) throw new Error(`sfx cue references unknown line "${c.afterEnd}"`);
    return l.start + l.dur + (c.at || 0);
  }
  const ch = chapterById.get(c.ch);
  if (!ch) throw new Error(`sfx cue references unknown chapter "${c.ch}"`);
  return ch.start + (c.at || 0);
}

function chapterOf(c) {
  if (c.ch) return chapterById.get(c.ch);
  const id = c.after || c.afterEnd;
  return chapterById.get(lineById.get(id).ch);
}

const placedSfx = [];
for (const c of SFX_CUES) {
  const src = load(`sfx/${c.cue}.wav`);
  const at = resolveAt(c);
  const gain = c.gain ?? 0.6;
  if (c.loop) {
    const chap = chapterOf(c);
    const until = c.untilEnd ? chap.start + chap.dur : at + (c.dur ?? 8);
    const len = src.L.length / SR;
    const xf = Math.min(0.25, len * 0.1);
    for (let t = at; t < until; t += len - xf) {
      addStereo(sfxBus, src, t * SR, gain);
    }
    placedSfx.push({ cue: c.cue, start: +at.toFixed(2), dur: +(until - at).toFixed(2), loop: true });
  } else {
    if (c.pan) {
      const gl = Math.cos((c.pan + 1) * Math.PI / 4) * Math.SQRT2 * 0.7071;
      const gr = Math.sin((c.pan + 1) * Math.PI / 4) * Math.SQRT2 * 0.7071;
      const o = Math.round(at * SR);
      for (let i = 0; i < src.L.length && o + i < sfxBus.L.length; i++) {
        sfxBus.L[o + i] += src.L[i] * gain * gl * 1.2;
        sfxBus.R[o + i] += src.R[i] * gain * gr * 1.2;
      }
    } else {
      addStereo(sfxBus, src, at * SR, gain);
    }
    placedSfx.push({ cue: c.cue, start: +at.toFixed(2) });
  }
}

const placedMusic = [];
for (const m of MUSIC_CUES) {
  const chap = chapterById.get(m.ch);
  const src = load(`music/${m.cue}.wav`);
  const at = chap.start + (m.at || 0);
  const room = chap.start + chap.dur - at;
  const len = src.L.length / SR;
  const use = Math.min(len, Math.max(2, room + 1.2));
  const cut = { L: src.L.subarray(0, Math.round(use * SR)), R: src.R.subarray(0, Math.round(use * SR)) };
  // fade the tail if the cue is being cut short by the chapter ending
  const copy = { L: Float32Array.from(cut.L), R: Float32Array.from(cut.R) };
  if (use < len - 0.05 || m.fadeOut) {
    const fo = Math.round((m.fadeOut ?? 2.2) * SR);
    for (let i = 0; i < fo && i < copy.L.length; i++) {
      const g = i / fo, j = copy.L.length - 1 - i;
      copy.L[j] *= g; copy.R[j] *= g;
    }
  }
  addStereo(musicBus, copy, at * SR, m.gain ?? 0.7);
  placedMusic.push({ cue: m.cue, start: +at.toFixed(2), dur: +use.toFixed(2) });
}

// --------------------------------------------------------------- ducking

/**
 * Sidechain the score to the narration: an envelope follower on the voice bus
 * with a fast attack and a slow release, applied to music and (less) to effects.
 */
function envelope(bus, { attack = 0.06, release = 0.5 } = {}) {
  const n = bus.L.length;
  const env = new Float32Array(n);
  const ac = Math.exp(-1 / (attack * SR));
  const rc = Math.exp(-1 / (release * SR));
  let y = 0;
  for (let i = 0; i < n; i++) {
    const x = Math.max(Math.abs(bus.L[i]), Math.abs(bus.R[i]));
    y = x > y ? ac * y + (1 - ac) * x : rc * y + (1 - rc) * x;
    env[i] = y;
  }
  return env;
}

const voEnv = envelope(voBus);
const DUCK_MUSIC = Math.pow(10, -9.5 / 20);
const DUCK_SFX = Math.pow(10, -3.5 / 20);
for (let i = 0; i < musicBus.L.length; i++) {
  const a = Math.min(1, voEnv[i] / 0.10);          // fully ducked once VO is loud
  const gm = 1 + (DUCK_MUSIC - 1) * a;
  const gs = 1 + (DUCK_SFX - 1) * a;
  musicBus.L[i] *= gm; musicBus.R[i] *= gm;
  sfxBus.L[i] *= gs; sfxBus.R[i] *= gs;
}

const master = stereoSec(TOTAL);
addStereo(master, voBus, 0, 1.0);
addStereo(master, musicBus, 0, 0.95);
addStereo(master, sfxBus, 0, 0.9);

// trim to the film length plus a short tail, then top and tail
const n = Math.round((DURATION + 1.0) * SR);
const out = stereo(n);
out.L.set(master.L.subarray(0, n));
out.R.set(master.R.subarray(0, n));
const fo = Math.round(1.6 * SR);
for (let i = 0; i < fo; i++) { const g = i / fo, j = n - 1 - i; out.L[j] *= g; out.R[j] *= g; }
normalise(out, 0.92);
limit(out, 0.96);

const wavFile = path.join(AUDIO, 'master.wav');
writeWav(wavFile, [out.L, out.R]);
console.log(`\nmaster: ${(n / SR).toFixed(1)}s  peak ${dbfs(peakOf(out)).toFixed(1)} dBFS  rms ${dbfs(rmsOf(out)).toFixed(1)} dBFS`);

// loudness-normalise and encode for the browser
const mp3 = path.join(AUDIO, 'master.mp3');
const r = spawnSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y', '-i', wavFile,
  '-af', 'loudnorm=I=-16:TP=-1.2:LRA=12,aresample=48000',
  '-c:a', 'libmp3lame', '-q:a', '2', mp3,
], { encoding: 'utf8' });
if (r.status !== 0) throw new Error('mp3 encode failed: ' + r.stderr);

// keep the wav in step with the mp3 so the video mux matches what you hear
spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wavFile,
  '-af', 'loudnorm=I=-16:TP=-1.2:LRA=12,aresample=48000', path.join(AUDIO, 'master_norm.wav')]);
fs.renameSync(path.join(AUDIO, 'master_norm.wav'), wavFile);

const timing = {
  generated: new Date().toISOString(),
  duration: +DURATION.toFixed(3),
  chapters,
  lines,
  sfx: placedSfx,
  music: placedMusic,
};
fs.writeFileSync(path.join(ROOT, 'src/story/timing.json'), JSON.stringify(timing, null, 2));
console.log(`wrote ${mp3}\nwrote src/story/timing.json`);
