/**
 * Build the film's soundtrack offline.
 *
 * Decodes every narration line, sound effect and music cue to raw float PCM,
 * sums them at their exact cue times, soft-limits the result and writes a WAV.
 * The browser plays the identical cue list through Web Audio, so the exported
 * film and the live page stay in sync by construction.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const RATE = 48000;
const CH = 2;

const pcmCache = new Map();

/** Decode an audio file to interleaved stereo Float32 at RATE. */
function decode(file) {
  if (pcmCache.has(file)) return pcmCache.get(file);
  const buf = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', file, '-f', 'f32le', '-acodec', 'pcm_f32le', '-ar', String(RATE), '-ac', String(CH), '-'],
    { maxBuffer: 1 << 30 }
  );
  const pcm = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
  pcmCache.set(file, pcm);
  return pcm;
}

/**
 * @param {Array<{t:number,file:string,gain:number,fadeIn?:number,fadeOut?:number}>} cues
 * @param {number} duration seconds
 * @param {string} outWav
 */
/**
 * Build a 0..1 "someone is talking" envelope from the voice cues, with a fast
 * attack and a slow release, sampled at `RATE / STEP`.
 */
const DUCK_STEP = 256;
export function duckEnvelope(cues, frames, { attack = 0.18, release = 0.9, lookahead = 0.12 } = {}) {
  const n = Math.ceil(frames / DUCK_STEP) + 1;
  const env = new Float32Array(n);
  for (const c of cues) {
    if (c.kind !== 'voice') continue;
    const dur = c.duration ?? 0;
    const a = Math.max(0, Math.floor(((c.t - lookahead) * RATE) / DUCK_STEP));
    const b = Math.min(n - 1, Math.ceil(((c.t + dur) * RATE) / DUCK_STEP));
    for (let i = a; i <= b; i++) env[i] = 1;
  }
  // Smooth: fast in, slow out.
  const dt = DUCK_STEP / RATE;
  const ka = Math.exp(-dt / attack);
  const kr = Math.exp(-dt / release);
  let v = 0;
  for (let i = 0; i < n; i++) {
    const target = env[i];
    v = target > v ? ka * v + (1 - ka) * target : kr * v + (1 - kr) * target;
    env[i] = v;
  }
  return env;
}

export function mixCues(cues, duration, outWav, opts = {}) {
  const frames = Math.ceil((duration + 1.0) * RATE);
  const mix = new Float32Array(frames * CH);
  let placed = 0;
  let missing = 0;

  // Measure the narration lengths so the ducker knows when a voice is present.
  for (const c of cues) {
    if (c.kind === 'voice' && c.duration === undefined && fs.existsSync(c.file)) {
      try {
        c.duration = decode(c.file).length / CH / RATE;
      } catch {
        c.duration = 0;
      }
    }
  }
  const duck = duckEnvelope(cues, frames);
  const duckAmount = opts.duck ?? 0.52; // how far music drops under speech

  for (const cue of cues) {
    if (!fs.existsSync(cue.file)) {
      missing++;
      continue;
    }
    let pcm;
    try {
      pcm = decode(cue.file);
    } catch {
      missing++;
      continue;
    }
    const gain = cue.gain ?? 1;
    const start = Math.max(0, Math.round(cue.t * RATE));
    const n = Math.floor(pcm.length / CH);
    const fadeIn = Math.round((cue.fadeIn ?? 0) * RATE);
    const fadeOut = Math.round((cue.fadeOut ?? 0) * RATE);
    const ducked = cue.kind === 'music';
    for (let i = 0; i < n; i++) {
      const o = start + i;
      if (o >= frames) break;
      let g = gain;
      if (fadeIn && i < fadeIn) g *= i / fadeIn;
      if (fadeOut && i > n - fadeOut) g *= Math.max(0, (n - i) / fadeOut);
      if (ducked) g *= 1 - duckAmount * duck[(o / DUCK_STEP) | 0];
      mix[o * CH] += pcm[i * CH] * g;
      mix[o * CH + 1] += pcm[i * CH + 1] * g;
    }
    placed++;
  }

  // Soft limiter: gentle knee above -3 dBFS, so a dense moment never clips.
  const thr = 0.7;
  let peak = 0;
  for (let i = 0; i < mix.length; i++) {
    const v = mix[i];
    const a = Math.abs(v);
    if (a > peak) peak = a;
    if (a > thr) {
      mix[i] = Math.sign(v) * (thr + (1 - thr) * Math.tanh((a - thr) / (1 - thr)));
    }
  }

  const raw = path.join(path.dirname(outWav), '.mix.f32');
  fs.writeFileSync(raw, Buffer.from(mix.buffer, mix.byteOffset, mix.byteLength));
  execFileSync('ffmpeg', [
    '-y', '-v', 'error',
    '-f', 'f32le', '-ar', String(RATE), '-ac', String(CH), '-i', raw,
    '-af', 'highpass=f=28,alimiter=limit=0.94:level=false,aresample=48000',
    '-c:a', 'pcm_s16le',
    outWav,
  ]);
  fs.unlinkSync(raw);
  return { placed, missing, peak, duration };
}

/**
 * Assemble the full cue list from the manifest, the scene sfx cues and the
 * music index. `sceneCues` is what `window.FILM.cues()` returns.
 */
/** Must match `MIX_GAINS` in src/main.js so live and exported audio agree. */
export const MIX_GAINS = { voice: 1.0, sfx: 0.62, music: 0.60 };

export function buildCues({ root, manifest, sceneCues, scenes, gains = {} }) {
  const g = { ...MIX_GAINS, ...gains };
  const cues = [];

  for (const l of manifest.lines) {
    cues.push({ t: l.t, file: path.join(root, 'public', l.url), gain: g.voice, kind: 'voice' });
  }

  const sfxIndexPath = path.join(root, 'public/audio/sfx/index.json');
  const sfxIndex = fs.existsSync(sfxIndexPath) ? JSON.parse(fs.readFileSync(sfxIndexPath, 'utf8')) : {};
  for (const c of sceneCues || []) {
    const e = sfxIndex[c.name];
    if (!e) continue;
    cues.push({ t: c.t, file: path.join(root, 'public', e.file), gain: g.sfx * (c.gain ?? 1), kind: 'sfx' });
  }

  const musicIndexPath = path.join(root, 'public/audio/music/index.json');
  const musicIndex = fs.existsSync(musicIndexPath) ? JSON.parse(fs.readFileSync(musicIndexPath, 'utf8')) : {};
  for (const s of scenes || []) {
    const m = musicIndex[s.id];
    if (!m) continue;
    cues.push({
      t: s.start,
      file: path.join(root, 'public', m.file),
      gain: g.music,
      kind: 'music',
      fadeIn: 0.6,
      fadeOut: 1.2,
    });
  }
  return cues;
}
