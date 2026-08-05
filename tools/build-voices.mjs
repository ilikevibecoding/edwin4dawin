/**
 * Voice pack builder.
 *
 * Reads every spoken line straight out of the chapter scripts, renders it with
 * espeak-ng using a per-character voice profile, post-processes it with ffmpeg so
 * androids, humans and radio traffic each sit in a different part of the
 * spectrum, and writes an amplitude-derived viseme track alongside each file for
 * lip sync.
 *
 * Extracting from the scripts rather than keeping a parallel line table means the
 * captions and the audio can never drift apart.
 *
 *   node tools/build-voices.mjs [--force]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'public/audio/vo');
const MANIFEST = path.join(ROOT, 'public/audio/voices.json');
const CHAPTERS = ['src/story/chapter1.ts', 'src/story/chapter2.ts', 'src/story/chapter3.ts'];
const force = process.argv.includes('--force');

/**
 * Per-character espeak settings plus the ffmpeg chain applied afterwards.
 * `variant` picks one of espeak's built-in vocal tract variations; `filter` is
 * what actually makes them sound like different sorts of speaker.
 */
const PROFILES = {
  orion: {
    voice: 'en-us+m3',
    speed: 150,
    pitch: 34,
    // Android negotiator: level, close, a hint of hard consonants.
    filter: 'equalizer=f=180:t=q:w=1:g=-3,equalizer=f=2600:t=q:w=2:g=3,acompressor=threshold=-16dB:ratio=3',
  },
  deviant: {
    voice: 'en-us+m2',
    speed: 170,
    pitch: 48,
    // Damaged unit: thin, with a trace of digital breakup.
    filter:
      'highpass=f=190,equalizer=f=1400:t=q:w=2:g=4,tremolo=f=17:d=0.12,acompressor=threshold=-14dB:ratio=4',
  },
  simon: { alias: 'deviant' },
  cass: {
    voice: 'en-us+f3',
    speed: 146,
    pitch: 60,
    filter: 'equalizer=f=300:t=q:w=1:g=-2,equalizer=f=3000:t=q:w=2:g=2,acompressor=threshold=-16dB:ratio=3',
  },
  child: {
    voice: 'en-us+f4',
    speed: 166,
    pitch: 80,
    filter: 'highpass=f=220,equalizer=f=3400:t=q:w=2:g=3',
  },
  girl: { alias: 'child' },
  owner: {
    voice: 'en-us+m1',
    speed: 156,
    pitch: 20,
    // The one human: chestier, rougher, slightly clipped.
    filter: 'equalizer=f=140:t=q:w=1:g=4,equalizer=f=2200:t=q:w=2:g=-2,acompressor=threshold=-12dB:ratio=5',
  },
  atlas: {
    voice: 'en-us+m4',
    speed: 138,
    pitch: 28,
    filter: 'equalizer=f=160:t=q:w=1:g=3,equalizer=f=2400:t=q:w=2:g=2,aecho=0.8:0.5:60:0.18',
  },
  commander: {
    voice: 'en-gb-x-rp+m5',
    speed: 158,
    pitch: 24,
    filter: 'equalizer=f=170:t=q:w=1:g=2,acompressor=threshold=-14dB:ratio=4',
  },
  troopers: { alias: 'radio' },
  radio: {
    voice: 'en-us+m6',
    speed: 174,
    pitch: 36,
    // Squad radio: band-limited, compressed, a little dirty.
    filter:
      'highpass=f=520,lowpass=f=3000,acompressor=threshold=-20dB:ratio=8,volume=1.6,aeval=tanh(2*val(0))/2',
  },
  DISPATCH: { alias: 'radio' },
  NEWSCAST: {
    voice: 'en-us+f2',
    speed: 176,
    pitch: 44,
    filter: 'highpass=f=340,lowpass=f=6000,acompressor=threshold=-18dB:ratio=6,equalizer=f=2800:t=q:w=2:g=3',
  },
  BROADCAST: { alias: 'NEWSCAST' },
};

/** Which actor speaks the lines attached to choices, per chapter file. */
const PLAYER_OF_CHAPTER = {
  'chapter1.ts': 'orion',
  'chapter2.ts': 'cass',
  'chapter3.ts': 'atlas',
};

function resolveProfile(name) {
  let profile = PROFILES[name];
  const seen = new Set();
  while (profile?.alias && !seen.has(profile.alias)) {
    seen.add(profile.alias);
    profile = PROFILES[profile.alias];
  }
  return profile ?? PROFILES.orion;
}

/** Unescapes a JS string literal body. */
function unquote(body) {
  return body
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, ' ')
    .replace(/\\\\/g, '\\');
}

function collectLines() {
  const lines = [];
  const seen = new Set();
  for (const rel of CHAPTERS) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const player = PLAYER_OF_CHAPTER[path.basename(rel)] ?? 'orion';

    // d.say(<actor|'NAME'>, '<text>', '<id>' ...)
    const sayRe =
      /d\.(?:say|bark)\(\s*(?:'([^']+)'|([A-Za-z_][\w]*))\s*,\s*(['"])((?:\\.|(?!\3)[\s\S])*?)\3\s*,\s*'([^']+)'/g;
    for (const m of src.matchAll(sayRe)) {
      const speaker = m[1] ?? m[2];
      const text = unquote(m[4]);
      const id = m[5];
      if (seen.has(id)) continue;
      seen.add(id);
      lines.push({ id, speaker, text });
    }

    // Choice objects: line: '<text>' ... voice: '<id>'
    const choiceRe = /line:\s*(['"])((?:\\.|(?!\1)[\s\S])*?)\1\s*,\s*\n?\s*voice:\s*'([^']+)'/g;
    for (const m of src.matchAll(choiceRe)) {
      const id = m[3];
      if (seen.has(id)) continue;
      seen.add(id);
      lines.push({ id, speaker: player, text: unquote(m[2]) });
    }
  }
  return lines;
}

/** RMS envelope of a mono 8 kHz PCM stream, mapped to a mouth-open curve. */
function visemesFor(file, step) {
  const raw = execFileSync(
    'ffmpeg',
    ['-v', 'quiet', '-i', file, '-f', 's16le', '-ac', '1', '-ar', '8000', '-'],
    { maxBuffer: 64 * 1024 * 1024 }
  );
  const samples = new Int16Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 2));
  const perFrame = Math.max(1, Math.round(8000 * step));
  const env = [];
  let peak = 1e-6;
  for (let i = 0; i < samples.length; i += perFrame) {
    let sum = 0;
    let n = 0;
    for (let j = i; j < Math.min(samples.length, i + perFrame); j++) {
      const v = samples[j] / 32768;
      sum += v * v;
      n++;
    }
    const rms = Math.sqrt(sum / Math.max(1, n));
    peak = Math.max(peak, rms);
    env.push(rms);
  }
  // Normalise, then bias upward: speech RMS spends most of its time low, and a
  // literal mapping leaves the mouth barely moving.
  return env.map((v) => {
    const n = Math.min(1, v / peak);
    return Math.round(Math.pow(n, 0.62) * 100) / 100;
  });
}

function durationOf(file) {
  const out = execFileSync('ffprobe', [
    '-v',
    'quiet',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    file,
  ]);
  return Number(String(out).trim()) || 0;
}

const lines = collectLines();
fs.mkdirSync(OUT_DIR, { recursive: true });
const manifest = {};
const step = 0.04;
let built = 0;

for (const line of lines) {
  const profile = resolveProfile(line.speaker);
  const wav = path.join(OUT_DIR, `${line.id}.wav`);
  const out = path.join(OUT_DIR, `${line.id}.ogg`);
  if (force || !fs.existsSync(out)) {
    execFileSync('espeak-ng', [
      '-v',
      profile.voice,
      '-s',
      String(profile.speed),
      '-p',
      String(profile.pitch),
      '-g',
      '4',
      '-w',
      wav,
      line.text,
    ]);
    execFileSync('ffmpeg', [
      '-v',
      'quiet',
      '-y',
      '-i',
      wav,
      '-af',
      `${profile.filter},loudnorm=I=-18:TP=-2:LRA=9`,
      '-c:a',
      'libopus',
      '-ar',
      '48000',
      '-ac',
      '1',
      '-b:a',
      '48k',
      out,
    ]);
    fs.rmSync(wav, { force: true });
    built++;
  }
  manifest[line.id] = {
    file: `vo/${line.id}.ogg`,
    duration: Math.round(durationOf(out) * 1000) / 1000,
    visemeStep: step,
    visemes: visemesFor(out, step),
  };
}

fs.writeFileSync(MANIFEST, JSON.stringify(manifest));
const total = Object.values(manifest).reduce((a, l) => a + l.duration, 0);
console.log(
  `voices: ${lines.length} lines (${built} rendered), ${total.toFixed(1)}s of dialogue -> ${path.relative(ROOT, MANIFEST)}`
);
