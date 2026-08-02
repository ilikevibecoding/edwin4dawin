/**
 * Offline render harness for the audio modules.
 *
 * This page exists so `tools/audio-probe.mjs` can drive a real browser Web
 * Audio implementation headlessly: it renders a requested chunk through an
 * `OfflineAudioContext`, encodes it to WAV in memory, and hands the bytes back
 * over the devtools protocol in base64 chunks.
 *
 * It doubles as the reference for how the director should wire things up — see
 * `filmPlan()` at the bottom, which is exactly what `--what film` renders.
 */

import { createBus, rng } from './engine.js';
import { SCENES, timeline, voiceLines } from '../story.js';

/* ------------------------------------------------------------------ *
 * WAV
 * ------------------------------------------------------------------ */

function encodeWav(buffer, { pcm16 = false } = {}) {
  const nCh = buffer.numberOfChannels;
  const nFrames = buffer.length;
  const sr = buffer.sampleRate;
  const bytesPerSample = pcm16 ? 2 : 4;
  const dataBytes = nFrames * nCh * bytesPerSample;
  const out = new Uint8Array(44 + dataBytes);
  const dv = new DataView(out.buffer);
  const str = (off, s) => { for (let i = 0; i < s.length; i++) out[off + i] = s.charCodeAt(i); };

  str(0, 'RIFF');
  dv.setUint32(4, 36 + dataBytes, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, pcm16 ? 1 : 3, true);          // 1 = PCM, 3 = IEEE float
  dv.setUint16(22, nCh, true);
  dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * nCh * bytesPerSample, true);
  dv.setUint16(32, nCh * bytesPerSample, true);
  dv.setUint16(34, bytesPerSample * 8, true);
  str(36, 'data');
  dv.setUint32(40, dataBytes, true);

  const chans = [];
  for (let c = 0; c < nCh; c++) chans.push(buffer.getChannelData(c));
  let off = 44;
  for (let i = 0; i < nFrames; i++) {
    for (let c = 0; c < nCh; c++) {
      const v = chans[c][i];
      if (pcm16) {
        const s = Math.max(-1, Math.min(1, v));
        dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        off += 2;
      } else {
        dv.setFloat32(off, v, true);
        off += 4;
      }
    }
  }
  return out;
}

function measure(buffer) {
  const per = [];
  let peak = 0;
  let sumSq = 0;
  let n = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    let p = 0; let ss = 0; let dc = 0;
    for (let i = 0; i < d.length; i++) {
      const v = d[i];
      const a = v < 0 ? -v : v;
      if (a > p) p = a;
      ss += v * v;
      dc += v;
    }
    per.push({ peak: p, rms: Math.sqrt(ss / Math.max(1, d.length)), dc: dc / Math.max(1, d.length) });
    peak = Math.max(peak, p);
    sumSq += ss;
    n += d.length;
  }
  const rms = Math.sqrt(sumSq / Math.max(1, n));
  return {
    peak, peakDb: 20 * Math.log10(Math.max(1e-9, peak)),
    rms, rmsDb: 20 * Math.log10(Math.max(1e-9, rms)),
    perChannel: per,
  };
}

/* ------------------------------------------------------------------ *
 * Node accounting — the film has to fit in one offline pass
 * ------------------------------------------------------------------ */

const FACTORIES = [
  'createOscillator', 'createGain', 'createBiquadFilter', 'createBufferSource',
  'createDelay', 'createConvolver', 'createDynamicsCompressor', 'createWaveShaper',
  'createStereoPanner', 'createPanner', 'createChannelMerger', 'createChannelSplitter',
  'createConstantSource', 'createIIRFilter', 'createAnalyser', 'createBuffer',
];

function countNodes(ctx) {
  const stats = { total: 0, byType: {} };
  for (const name of FACTORIES) {
    const orig = ctx[name];
    if (typeof orig !== 'function') continue;
    ctx[name] = function wrapped(...args) {
      if (name !== 'createBuffer') stats.total++;
      stats.byType[name] = (stats.byType[name] || 0) + 1;
      return orig.apply(ctx, args);
    };
  }
  return stats;
}

/* ------------------------------------------------------------------ *
 * The film plan — reference wiring for the director
 * ------------------------------------------------------------------ */

/** Rough spoken length of a narration line, for the music duck window. */
export function estimateVoiceLength(text) {
  return Math.max(0.9, text.length / 14.5);
}

/** Music sections straight out of the screenplay. */
export function storySections() {
  return timeline().scenes.map((s) => ({ id: s.music, start: s.start, dur: s.dur, scene: s.id }));
}

/** Narration duck windows straight out of the screenplay. */
export function storyDucks() {
  return voiceLines().map((l) => ({ t: l.t, dur: estimateVoiceLength(l.text), id: l.id }));
}

/**
 * The effects track. Times are absolute film seconds. This is a plausible cue
 * sheet for the seven scenes and it exercises all 31 effects, so `--what film`
 * is a true end-to-end test of the whole soundtrack.
 */
export function filmCues() {
  const c = [];
  const add = (t, sfx, opts) => c.push({ t, sfx, opts });
  const r = rng(4242);

  // I — crawl (0–41)
  add(0.2, 'rumbleSub', { dur: 3.2, gain: 0.55, f0: 42, f1: 24 });

  // II — the chase (41–71)
  add(41.0, 'engineRumble', { dur: 28, gain: 0.30, fade: 2.5 });
  add(42.4, 'enginePass', { dur: 2.4, gain: 0.6, from: -0.8, to: 0.7 });
  add(45.0, 'laser', { pan: -0.5 }); add(45.55, 'laser', { pan: 0.45, pitch: 1.06 });
  add(46.4, 'laser', { pan: -0.3, pitch: 0.94 });
  add(48.9, 'laser', { pan: 0.5 }); add(49.3, 'laser', { pan: -0.4, pitch: 1.1 });
  add(54.0, 'rumbleSub', { dur: 5.5, gain: 0.8, f0: 40, f1: 22 });
  add(55.4, 'turbolaser', { pan: -0.35 });
  add(56.3, 'hullImpact', { pan: -0.2 });
  add(57.1, 'turbolaser', { pan: 0.4 });
  add(57.9, 'hullImpact', { pan: 0.25, gain: 0.8 });
  add(58.6, 'turbolaser', { pan: 0.05, gain: 1.0 });
  add(62.0, 'ionDrone', { dur: 6.5, gain: 0.42 });
  add(63.0, 'turbolaser', { pan: -0.5 });
  add(63.5, 'hullImpact', { pan: -0.1 });
  add(64.4, 'turbolaser', { pan: 0.3 });
  add(64.9, 'explosion', { pan: 0.3, gain: 0.7 });
  add(66.2, 'explosion', { pan: -0.35, gain: 0.85 });
  add(68.4, 'explosion', { gain: 0.6, pan: 0.1 });
  add(69.2, 'alarm', { dur: 4.4, gain: 0.30 });

  // III — boarders (71–104)
  add(71.4, 'doorBlast', { pan: -0.1 });
  add(72.4, 'alarm', { dur: 11, gain: 0.22 });
  for (let i = 0; i < 16; i++) {
    const t = 73.0 + i * 0.55 + r() * 0.22;
    add(t, 'blaster', { pan: (r() * 2 - 1) * 0.7, pitch: 0.9 + r() * 0.3 });
    if (r() < 0.45) add(t + 0.07 + r() * 0.05, 'ricochet', { pan: (r() * 2 - 1) * 0.8, gain: 0.4 });
  }
  add(82.4, 'hullImpact', { gain: 0.6 });
  add(83.6, 'rumbleSub', { dur: 3.4, gain: 0.75, f0: 44, f1: 23 });
  add(84.9, 'vaderBreath', {});
  add(86.2, 'saberOn', { pan: 0.15, hum: 0.6 });
  add(86.8, 'saberHum', { dur: 5.6, pan: 0.15, gain: 0.34 });
  add(88.6, 'vaderBreath', {});
  add(89.6, 'saberClash', { pan: 0.1 });
  add(90.4, 'saberClash', { pan: -0.15, gain: 0.7 });
  add(95.6, 'vaderBreath', {});
  add(99.4, 'vaderBreath', {});
  add(101.2, 'saberOff', { pan: 0.15 });

  // IV — pod seven (104–131)
  add(104.6, 'droidBeep', { n: 5, pan: -0.2 });
  add(106.6, 'protocolFuss', { syllables: 7, pan: 0.25 });
  add(109.2, 'droidWorry', { pan: -0.2 });
  add(111.4, 'droidBeep', { n: 7, pan: -0.15, seed: 3 });
  add(113.6, 'protocolFuss', { syllables: 5, pan: 0.3, seed: 2 });
  add(116.4, 'droidBeep', { n: 4, pan: -0.25, seed: 9 });
  add(118.6, 'podLaunch', {});
  add(121.4, 'engineWhoosh', { dur: 1.6, pan: 0.4, gain: 0.45 });
  add(125.2, 'radioStatic', { dur: 0.5, gain: 0.3 });
  add(125.4, 'commBeep', {});
  add(127.6, 'targetingLock', { dur: 1.4, lock: 0.35, gain: 0.3 });

  // V — twin suns (131–163)
  add(131.0, 'wind', { dur: 31.6, gain: 0.34, fade: 2.2 });
  add(141.2, 'droidBeep', { n: 5, pan: -0.3, seed: 5 });
  add(142.6, 'droidWorry', { pan: 0.3, dur: 1.2 });
  add(144.2, 'protocolFuss', { syllables: 8, pan: 0.3, seed: 7 });
  add(148.2, 'sandcrawlerRumble', { dur: 13.5, gain: 0.5 });
  add(152.4, 'jawaChatter', { pan: -0.35 });
  add(154.1, 'jawaChatter', { pan: 0.4, seed: 3, n: 8 });
  add(156.2, 'droidWorry', { pan: -0.1 });
  add(158.0, 'jawaChatter', { pan: 0.2, seed: 11, n: 13 });

  // VI — the trench (163–209)
  add(163.0, 'engineRumble', { dur: 45.4, gain: 0.26, fade: 2.0, pitch: 1.15 });
  add(165.6, 'enginePass', { dur: 2.0, from: -0.9, to: 0.85, gain: 0.6 });
  add(169.0, 'enginePass', { dur: 2.2, from: 0.9, to: -0.8, gain: 0.5, pitch: 1.2 });
  add(177.6, 'radioStatic', { dur: 0.45, gain: 0.28 });
  add(177.8, 'commBeep', {});
  for (let i = 0; i < 26; i++) {
    const t = 181.0 + i * 0.7 + r() * 0.3;
    add(t, 'turbolaser', { pan: (r() * 2 - 1) * 0.8, gain: 0.5 + r() * 0.3 });
    if (r() < 0.4) add(t + 0.25 + r() * 0.3, 'explosion', { pan: (r() * 2 - 1) * 0.7, gain: 0.4 + r() * 0.3 });
  }
  add(184.2, 'enginePass', { dur: 1.8, from: 0.8, to: -0.9, gain: 0.45 });
  add(189.6, 'targetingLock', { dur: 2.2, lock: 0.5 });
  add(193.0, 'hullImpact', { pan: -0.3, gain: 0.6 });
  add(195.4, 'commBeep', { gain: 0.3 });
  add(201.4, 'radioStatic', { dur: 0.4, gain: 0.26 });
  add(202.6, 'laser', { pitch: 0.34, pan: -0.2, gain: 0.9, len: 0.6 });
  add(202.9, 'laser', { pitch: 0.32, pan: 0.2, gain: 0.9, len: 0.6 });
  add(203.2, 'engineWhoosh', { dur: 2.2, gain: 0.55 });
  add(206.0, 'explosion', { gain: 0.9 });

  // VII — a new spark (209–243)
  add(208.9, 'bigExplosion', { gain: 1.0 });
  add(211.6, 'rumbleSub', { dur: 5.0, gain: 0.7, f0: 40, f1: 21 });
  add(214.0, 'enginePass', { dur: 2.6, from: -0.85, to: 0.8, gain: 0.5 });
  add(216.6, 'hyperspaceJump', { gain: 0.75 });
  add(221.4, 'crowdCheer', { dur: 4.6, gain: 0.5 });
  add(230.6, 'droidBeep', { n: 8, pan: -0.2, seed: 21 });
  add(232.4, 'protocolFuss', { syllables: 6, pan: 0.25, seed: 13 });
  add(235.2, 'droidBeep', { n: 5, pan: -0.15, seed: 33 });
  return c.sort((a, b) => a.t - b.t);
}

/* ------------------------------------------------------------------ *
 * Render
 * ------------------------------------------------------------------ */

const SECTION_STORY_DUR = {};
for (const s of SCENES) SECTION_STORY_DUR[s.music] = s.dur;

async function render(cfg = {}) {
  const {
    what = 'score',
    section = 'fanfare',
    name = 'laser',
    sr = 48000,
    seed = 20250802,
    pcm16 = false,
    opts = {},
    bus: busOpts = {},
    lead = 0.25,
  } = cfg;

  let dur = cfg.dur;
  let secDur = cfg.secDur;
  const notes = [];

  // --- work out how long the render needs to be --------------------
  if (what === 'score') {
    if (section === 'all' || section === 'film') {
      const secs = storySections();
      secDur = secs[secs.length - 1].start + secs[secs.length - 1].dur;
      if (dur == null) dur = secDur + 2.0;
    } else {
      if (secDur == null) secDur = SECTION_STORY_DUR[section] || 20;
      if (dur == null) dur = secDur + 2.4;
    }
  } else if (what === 'film') {
    const secs = storySections();
    secDur = secs[secs.length - 1].start + secs[secs.length - 1].dur;
    if (dur == null) dur = secDur + 3.0;
  } else if (what === 'sfx' || what === 'cues' || what === 'sfxall' || what === 'reverb') {
    if (dur == null) dur = await dryRunLength(cfg, sr);
  }
  dur = Math.max(0.25, dur);

  // --- real render -------------------------------------------------
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
  const stats = countNodes(ctx);
  const bus = createBus(ctx, { seed, ...busOpts });
  const t0 = performance.now();
  const plan = await schedule(ctx, bus, { ...cfg, dur, secDur, lead, seed });
  const scheduleMs = performance.now() - t0;

  const t1 = performance.now();
  const buffer = await ctx.startRendering();
  const renderMs = performance.now() - t1;

  const m = measure(buffer);
  const bytes = encodeWav(buffer, { pcm16 });
  self.__wav = bytes;

  return {
    ok: true,
    what, section, name,
    duration: buffer.length / buffer.sampleRate,
    sampleRate: buffer.sampleRate,
    channels: buffer.numberOfChannels,
    bytes: bytes.length,
    nodes: stats.total,
    nodesByType: stats.byType,
    reverb: bus.reverbKind,
    scheduleMs: Math.round(scheduleMs),
    renderMs: Math.round(renderMs),
    scheduledEnd: plan.end,
    plan: plan.info,
    notes,
    ...m,
  };
}

/** Ask the effect how long it is by scheduling it against a throwaway ctx. */
async function dryRunLength(cfg, sr) {
  const { what, name = 'laser', opts = {}, lead = 0.25 } = cfg;
  const probe = new OfflineAudioContext(2, 256, sr);
  const bus = createBus(probe, { reverb: 'none' });
  const plan = await schedule(probe, bus, { ...cfg, dur: 600, secDur: 600, lead, dry: true });
  const tail = what === 'reverb' ? 4.5 : 0.8;
  return Math.max(0.5, plan.end + tail);
}

async function schedule(ctx, bus, cfg) {
  const { what, section, name, opts = {}, lead = 0.25, seed = 20250802 } = cfg;
  const info = {};
  let end = 0;

  if (what === 'score' || what === 'film') {
    const { scheduleScore } = await import('./score.js');
    let sections;
    if (what === 'film' || section === 'all' || section === 'film') {
      sections = storySections();
    } else {
      sections = [{ id: section, start: 0, dur: cfg.secDur }];
    }
    const res = scheduleScore(ctx, bus, sections, { seed });
    info.sections = res.sections;
    info.scoreNotes = res.notes;
    end = Math.max(end, res.end);

    if (what === 'film') {
      const { scheduleCues } = await import('./sfx.js');
      const cues = filmCues();
      end = Math.max(end, scheduleCues(ctx, bus, cues));
      info.cues = cues.length;
      const ducks = storyDucks();
      for (const d of ducks) bus.duckVoice(d.t, d.dur);
      info.ducks = ducks.length;
    }
    return { end, info };
  }

  if (what === 'sfx') {
    const { SFX } = await import('./sfx.js');
    const fn = SFX[name];
    if (!fn) throw new Error(`unknown sfx "${name}"`);
    end = fn(ctx, bus, lead, opts);
    info.sfx = name;
    return { end, info };
  }

  if (what === 'sfxall') {
    const { SFX, SFX_NAMES } = await import('./sfx.js');
    let t = lead;
    const laid = [];
    for (const n of SFX_NAMES) {
      const e = SFX[n](ctx, bus, t, { dur: 2.5, ...opts });
      laid.push({ name: n, t, end: e, dur: +(e - t).toFixed(3) });
      t = e + 0.45;
      end = Math.max(end, e);
    }
    info.laid = laid;
    return { end, info };
  }

  if (what === 'cues') {
    const { scheduleCues } = await import('./sfx.js');
    const cues = cfg.cues && cfg.cues.length ? cfg.cues : filmCues();
    end = scheduleCues(ctx, bus, cues);
    info.cues = cues.length;
    return { end, info };
  }

  if (what === 'reverb') {
    // Impulse into both sends so the tails can be measured directly.
    const b = ctx.createBuffer(1, 64, ctx.sampleRate);
    b.getChannelData(0)[0] = 1;
    for (const [dest, t] of [[bus.musicFx, lead], [bus.fx, lead + 2.2]]) {
      if (!dest) continue;
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.connect(dest);
      s.start(t);
      end = Math.max(end, t + 4.0);
    }
    return { end, info };
  }

  throw new Error(`unknown --what "${what}"`);
}

/* ------------------------------------------------------------------ *
 * Bridge to the node driver
 * ------------------------------------------------------------------ */

function b64(u8, from, len) {
  const view = u8.subarray(from, from + len);
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < view.length; i += CH) {
    s += String.fromCharCode.apply(null, view.subarray(i, i + CH));
  }
  return btoa(s);
}

self.audioProbe = {
  render,
  chunk: (from, len) => b64(self.__wav, from, len),
  filmCues,
  storySections,
  storyDucks,
  estimateVoiceLength,
  async names() {
    const [{ SFX_NAMES }, { SECTION_IDS }] = await Promise.all([import('./sfx.js'), import('./score.js')]);
    return { sfx: SFX_NAMES, sections: SECTION_IDS };
  },
};
self.__ready = true;
