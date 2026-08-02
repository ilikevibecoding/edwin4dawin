#!/usr/bin/env node
/**
 * Narration.
 *
 * Each line goes through a local neural TTS (piper), then through a per-character
 * processing chain in ffmpeg: pitch, EQ, saturation, doubling and reverb. The
 * voice presets live in src/story/script.js next to the words.
 *
 *   node tools/tts.mjs            # synthesise everything (cached)
 *   node tools/tts.mjs --force    # re-synthesise
 *   node tools/tts.mjs --only=b3  # one line
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { SCRIPT, VOICES } from '../src/story/script.js';
import { reverbIR } from './lib/dsp.mjs';
import { writeWav } from './lib/wav.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public/audio/vo');
const CACHE = path.join(ROOT, 'tools/.cache');
const VOICE_DIR = path.join(ROOT, 'tools/voices');
const PY = process.env.PIPER_PY || '/tmp/tts-venv/bin/python';

const args = Object.fromEntries(process.argv.slice(2)
  .filter((a) => a.startsWith('--'))
  .map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });

// ---------------------------------------------------------------- reverb IRs

/** Small set of impulse responses so ffmpeg can do proper convolution reverb. */
function ensureIR(name, seconds, opts) {
  const file = path.join(CACHE, `ir_${name}.wav`);
  if (!fs.existsSync(file)) {
    const ir = reverbIR(seconds, opts);
    writeWav(file, [ir.L, ir.R]);
  }
  return file;
}
const IR = {
  plate: ensureIR('plate', 1.6, { room: 0.74, damp: 0.42, preDelay: 0.012 }),
  hall: ensureIR('hall', 2.8, { room: 0.9, damp: 0.28, preDelay: 0.03, size: 1.25 }),
  corridor: ensureIR('corridor', 1.1, { room: 0.6, damp: 0.55, preDelay: 0.008, size: 0.7 }),
};

// ------------------------------------------------------------ filter chains

const semitone = (n) => Math.pow(2, n / 12);

function atempoStages(x) {
  const out = [];
  let need = x;
  while (need > 2.0) { out.push('atempo=2.0'); need /= 2; }
  while (need < 0.5) { out.push('atempo=0.5'); need /= 0.5; }
  if (Math.abs(need - 1) > 1e-4) out.push(`atempo=${need.toFixed(6)}`);
  return out;
}

/**
 * Pitch and speed in one resample + one time-stretch.
 * Chaining two atempo stages (one for pitch correction, one for delivery speed)
 * doubles the phase-vocoder smearing, which is what made Vader unintelligible.
 */
function pitchSpeedChain(semis, rate = 1, sr = 22050) {
  const r = semis ? semitone(semis) : 1;
  const chain = [];
  if (semis) chain.push(`asetrate=${Math.round(sr * r)}`, `aresample=${sr}`);
  chain.push(...atempoStages((rate || 1) / r));
  return chain;
}

/**
 * Build the ffmpeg filtergraph for one character.
 * Input 0 is the raw piper wav; input 1 is the reverb impulse response.
 */
function graphFor(v) {
  const pre = [
    'aformat=sample_fmts=fltp:channel_layouts=mono',
    ...pitchSpeedChain(v.pitch, v.rate),
    'highpass=f=70',
  ];

  const post = [];
  if (v.breath || v.growl) {
    // The mask: chest weight, a scooped low-mid, and a presence lift so the
    // consonants survive. Saturation stays gentle -- an unintelligible Vader
    // is a failed Vader.
    post.push(
      'equalizer=f=105:width_type=o:width=1.1:g=5',
      'equalizer=f=420:width_type=o:width=0.9:g=-3',
      'equalizer=f=2300:width_type=o:width=1.1:g=4.5',
      'lowpass=f=7000',
      'asoftclip=type=tanh:threshold=0.82',
    );
  }
  if (v.metallic) {
    post.push(
      'highpass=f=320', 'lowpass=f=5200',
      'equalizer=f=1500:width_type=o:width=0.6:g=7',
      'equalizer=f=2900:width_type=o:width=0.5:g=5',
      'chorus=0.6:0.9:35:0.5:0.4:2',
      'asoftclip=type=atan:threshold=0.7',
    );
  }
  if (v.radio) {
    post.push(
      'highpass=f=420', 'lowpass=f=3000',
      'equalizer=f=1800:width_type=o:width=1.2:g=5',
      'acompressor=threshold=0.10:ratio=6:attack=4:release=90',
      'asoftclip=type=atan:threshold=0.6',
    );
  }
  if (v.ethereal) {
    post.push('highshelf=f=3200:g=4', 'chorus=0.7:0.9:55:0.4:0.25:2');
  }
  if (!v.radio && !v.metallic) {
    post.push('equalizer=f=180:width_type=o:width=1.2:g=2.5');   // chest
    post.push('equalizer=f=5200:width_type=o:width=1.5:g=2');    // air
  }
  post.push('acompressor=threshold=0.16:ratio=3:attack=8:release=180:makeup=1.6');
  return { pre, post };
}

function ffmpeg(cmdArgs) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...cmdArgs], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg failed:\n${r.stderr}`);
  return r;
}

function probeDuration(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return parseFloat(r.stdout.trim()) || 0;
}

/** piper writes a mono 22.05k wav; we keep it raw and process afterwards. */
function synth(voiceName, text, outFile) {
  const r = spawnSync(PY, ['-m', 'piper', '-m', voiceName, '--data-dir', VOICE_DIR, '-f', outFile],
    { input: text + '\n', encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(outFile)) {
    throw new Error(`piper failed for "${voiceName}": ${r.stderr || r.stdout}`);
  }
}

/**
 * Some words the TTS mangles. Rewrite them phonetically for synthesis only --
 * the on-screen subtitle still shows the real spelling.
 */
const SAY_AS = [
  [/\bR2-D2\b/g, 'Artoo Detoo'],
  [/\bC-3PO\b/g, 'See Threepio'],
  [/\bastromech\b/gi, 'astro-mech'],
  [/\bLeia\b/g, 'Layuh'],
  [/\bevaporators\b/gi, 'evaporaters'],
  [/\blightsaber\b/gi, 'light sabre'],
  [/\bkilometres\b/gi, 'kilometers'],
  [/\bmetres\b/gi, 'meters'],
  [/\btonnes\b/gi, 'tons'],
  [/\bRed Five\b/g, 'Red Five,'],
];
function speakable(text) {
  let s = text;
  for (const [re, to] of SAY_AS) s = s.replace(re, to);
  return s;
}

// ----------------------------------------------------------------- main

const manifestFile = path.join(OUT, 'manifest.json');
const prev = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : { lines: [] };
const prevById = new Map((prev.lines || []).map((l) => [l.id, l]));

const lines = [];
let made = 0;
for (const line of SCRIPT) {
  if (args.only && args.only !== line.id) {
    const p = prevById.get(line.id);
    if (p) { lines.push(p); continue; }
  }
  const v = VOICES[line.who];
  if (!v) throw new Error(`no voice preset for "${line.who}"`);
  const spoken = speakable(line.text);
  const hash = createHash('sha1').update(JSON.stringify([spoken, v])).digest('hex').slice(0, 12);
  const final = path.join(OUT, `${line.id}.wav`);
  const cached = prevById.get(line.id);

  if (!args.force && cached && cached.hash === hash && fs.existsSync(final)) {
    lines.push(cached);
    continue;
  }

  const raw = path.join(CACHE, `raw_${line.id}.wav`);
  synth(v.voice, spoken, raw);

  const { pre, post } = graphFor(v);
  const irFile = v.ethereal ? IR.hall : (v.reverb > 0.24 ? IR.hall : IR.plate);
  const wet = Math.max(0, Math.min(0.9, v.reverb ?? 0.15));

  // dry chain -> split -> convolution reverb send -> blend
  const chain = [];
  if (v.growl) {
    chain.push(`[0:a]${pre.join(',')}[v0]`);
    chain.push('[v0]asplit=2[vd][vs]');
    // An octave-down layer adds mass under the voice without blurring words.
    chain.push(`[vs]${pitchSpeedChain(-12, 1).join(',')},lowpass=f=520,volume=0.30[vsub]`);
    chain.push('[vd][vsub]amix=inputs=2:normalize=0[vm]');
    chain.push(`[vm]${post.join(',')}[dry]`);
  } else {
    chain.push(`[0:a]${[...pre, ...post].join(',')}[dry]`);
  }
  chain.push('[dry]asplit=2[d1][d2]');
  chain.push(`[d2][1:a]afir=dry=10:wet=10:maxir=3,volume=${(wet * 1.35).toFixed(3)}[wetp]`);
  chain.push(`[d1]volume=${(1 - wet * 0.35).toFixed(3)}[dryp]`);
  chain.push('[dryp][wetp]amix=inputs=2:normalize=0[mixed]');
  chain.push(`[mixed]aformat=sample_fmts=s16:channel_layouts=stereo:sample_rates=48000,`
    + `loudnorm=I=-18:TP=-1.5:LRA=11,aresample=48000,volume=${(v.gain ?? 1).toFixed(2)},`
    + `silenceremove=start_periods=1:start_silence=0.06:start_threshold=-52dB,`
    + `areverse,silenceremove=start_periods=1:start_silence=0.12:start_threshold=-52dB,areverse[out]`);

  ffmpeg(['-i', raw, '-i', irFile, '-filter_complex', chain.join(';'), '-map', '[out]', final]);

  const dur = probeDuration(final);
  lines.push({ id: line.id, ch: line.ch, who: line.who, text: line.text, file: `vo/${line.id}.wav`, dur: +dur.toFixed(3), hash });
  made++;
  process.stdout.write(`  ${line.id.padEnd(4)} ${line.who.padEnd(9)} ${dur.toFixed(2)}s  ${line.text.slice(0, 58)}\n`);
}

fs.writeFileSync(manifestFile, JSON.stringify({ lines }, null, 2));
const total = lines.reduce((a, l) => a + l.dur, 0);
console.log(`\n${lines.length} lines (${made} rendered), ${total.toFixed(1)}s of speech -> ${OUT}`);
