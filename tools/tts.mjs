#!/usr/bin/env node
/**
 * Narration synthesis.
 *
 * Reads the screenplay from src/story.js, synthesises every line with Piper
 * (a local neural TTS — no network at render time), runs each through a
 * per-character ffmpeg processing chain, and writes public/vo/*.mp3 plus a
 * manifest with real measured durations.
 *
 *   node tools/tts.mjs            # synthesise anything missing
 *   node tools/tts.mjs --force    # re-synthesise everything
 *   node tools/tts.mjs --check    # just report timing fit against story.js
 *
 * Setup (already done on this machine, re-run if the venv is gone):
 *   python3 -m venv /tmp/ttsvenv && /tmp/ttsvenv/bin/pip install piper-tts
 *   /tmp/ttsvenv/bin/python -m piper.download_voices --download-dir /tmp/voices \
 *       en_GB-alan-medium en_US-ryan-high en_GB-northern_english_male-medium
 */
import { execFileSync } from 'child_process';
import { mkdirSync, existsSync, writeFileSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'vo');
const TMP = '/tmp/tts-work';
const PIPER = process.env.PIPER_BIN || '/tmp/ttsvenv/bin/piper';
const VOICE_DIR = process.env.PIPER_VOICES || '/tmp/voices';

const FORCE = process.argv.includes('--force');
const CHECK = process.argv.includes('--check');

/**
 * Each film voice = a Piper model, a delivery tweak, and an ffmpeg character chain.
 * The chains are what turn one TTS engine into a cast.
 */
const VOICES = {
  narrator: {
    model: 'en_GB-alan-medium',
    length: 1.06,
    noise: 0.55,
    noiseW: 0.75,
    // warm, close-mic storyteller: tame sibilance, lift the chest, tiny room
    filter:
      'highpass=f=70,equalizer=f=180:t=q:w=1.0:g=2.5,equalizer=f=3200:t=q:w=2.0:g=-2,' +
      'equalizer=f=6500:t=q:w=2.0:g=1.5,acompressor=threshold=-20dB:ratio=3:attack=8:release=180,' +
      'aecho=0.85:0.85:22:0.055,loudnorm=I=-17:TP=-1.5:LRA=9',
  },
  vader: {
    model: 'en_US-ryan-high',
    length: 1.3,
    noise: 0.4,
    noiseW: 0.6,
    // drop a fifth, keep the tempo, then bury it in a cathedral
    filter:
      'asetrate=22050*0.74,aresample=44100,atempo=1.351,' +
      'lowpass=f=3400,equalizer=f=110:t=q:w=1.0:g=7,equalizer=f=420:t=q:w=1.4:g=-4,' +
      'acompressor=threshold=-24dB:ratio=6:attack=5:release=250,' +
      'aecho=0.9:0.88:150|320:0.5|0.28,loudnorm=I=-17:TP=-1.5',
  },
  comm: {
    model: 'en_US-ryan-high',
    length: 0.97,
    noise: 0.6,
    noiseW: 0.8,
    // squadron radio: band limited, squashed, a touch of grit
    filter:
      'highpass=f=520,lowpass=f=2900,acompressor=threshold=-28dB:ratio=9:attack=2:release=90,' +
      'volume=5,alimiter=limit=0.85,equalizer=f=1700:t=q:w=1.2:g=5,' +
      'aecho=0.9:0.7:12:0.2,loudnorm=I=-18:TP=-1.5',
  },
  imperial: {
    model: 'en_GB-northern_english_male-medium',
    length: 1.0,
    noise: 0.5,
    noiseW: 0.7,
    // shipboard intercom, cleaner than squadron comms
    filter:
      'highpass=f=380,lowpass=f=4200,acompressor=threshold=-24dB:ratio=6:attack=4:release=120,' +
      'equalizer=f=2400:t=q:w=1.5:g=3,aecho=0.9:0.75:30:0.22,loudnorm=I=-18:TP=-1.5',
  },
};

const { voiceLines, timeline } = await import('../src/story.js');

function sh(cmd, args) {
  return execFileSync(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
}

function durationOf(file) {
  const out = sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return parseFloat(out.trim());
}

function synth(line, voice, rawPath) {
  const v = VOICES[voice];
  const model = join(VOICE_DIR, v.model + '.onnx');
  if (!existsSync(model)) throw new Error(`missing piper voice ${model}`);
  execFileSync(
    PIPER,
    ['-m', model, '-f', rawPath, '--length-scale', String(v.length),
      '--noise-scale', String(v.noise), '--noise-w-scale', String(v.noiseW),
      '--sentence-silence', '0.25'],
    { input: line, stdio: ['pipe', 'ignore', 'pipe'] }
  );
}

function postFx(rawPath, outPath, voice) {
  const v = VOICES[voice];
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', rawPath,
    '-af', v.filter, '-ac', '1', '-ar', '44100',
    '-codec:a', 'libmp3lame', '-b:a', '112k', outPath,
  ]);
}

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const lines = voiceLines();
const manifest = [];
let made = 0;

for (const l of lines) {
  const mp3 = join(OUT, l.id + '.mp3');
  if (FORCE || !existsSync(mp3)) {
    if (CHECK) { console.log(`missing: ${l.id}`); continue; }
    const raw = join(TMP, l.id + '.wav');
    // strip typographic characters Piper mispronounces
    const text = l.text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\u2014/g, ', ');
    synth(text, l.voice, raw);
    postFx(raw, mp3, l.voice);
    rmSync(raw, { force: true });
    made++;
    console.log(`  synth ${l.id} [${l.voice}]`);
  }
  manifest.push({ ...l, file: `vo/${l.id}.mp3`, dur: existsSync(mp3) ? durationOf(mp3) : 0 });
}

// timing report: does every line finish before the next one starts?
const { duration } = timeline();
let clashes = 0;
console.log('\n  id                  start    dur   ends   next   text');
console.log('  ' + '-'.repeat(96));
for (let i = 0; i < manifest.length; i++) {
  const m = manifest[i];
  const next = manifest[i + 1];
  const end = m.t + m.dur;
  const gap = next ? next.t - end : duration - end;
  const flag = gap < -0.15 ? ' <-- OVERLAP' : gap < 0.15 ? ' <-- tight' : '';
  if (flag) clashes++;
  console.log(
    `  ${m.id.padEnd(18)} ${m.t.toFixed(1).padStart(6)} ${m.dur.toFixed(1).padStart(6)} ` +
    `${end.toFixed(1).padStart(6)} ${gap.toFixed(1).padStart(6)}   ${m.text.slice(0, 42)}${flag}`
  );
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ duration, lines: manifest }, null, 2));
const speech = manifest.reduce((a, m) => a + m.dur, 0);
console.log(`\n  ${manifest.length} lines, ${made} newly synthesised`);
console.log(`  ${speech.toFixed(1)}s of speech across a ${duration.toFixed(0)}s film`);
console.log(`  ${clashes} timing problem(s)`);
console.log(`  manifest -> public/vo/manifest.json`);
