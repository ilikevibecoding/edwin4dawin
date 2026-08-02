/*
 * The audio bus — everything the film hears passes through here.
 *
 * Hard rule for this whole directory: every sound is scheduled at an absolute
 * AudioContext time using AudioParam automation and start(when)/stop(when).
 * Nothing reads ctx.currentTime while playing, nothing waits on a frame or a
 * wall clock, nothing calls Math.random(). Schedule the entire soundtrack at
 * t = 0 into an OfflineAudioContext of the right length and the render is
 * sample-for-sample identical to live playback.
 *
 *   const audio = createAudioEngine(ctx);
 *   scheduleCue(audio, 'fanfare', 0);
 *   playSfx(audio, 'blaster_rebel', 3.2, { pan: -0.4 });
 *   audio.duck(6, 4.5, 0.35);          // music under narration
 *
 * Signal flow:
 *
 *   music ─┬─ musicDuck ───────────────────────────┐
 *          └─ (per-voice send) ─ sends.music ─ musicSendDuck ─┐
 *   sfx   ─┬─ sfxDuck ─────────────────────────────┤         │
 *          └─ (per-voice send) ─ sends.sfx ─ sfxSendDuck ─────┤
 *   vo    ─┬───────────────────────────────────────┤         │
 *          └─ (per-voice send) ─ sends.vo ───────────────────┤
 *                                                  │         │
 *                            reverb (in) ──────────┼─ preDelay ─ convolver ─ reverbReturn ─┐
 *                                                  │                                       │
 *                                       premaster ─┴───────────────────────────────────────┘
 *                                            │
 *                                   master ─ limiter(pad → soft-clip curve) ─ destination
 *
 * The reverb sends are tapped *after* the duck gains, so a ducked music bed
 * takes its reverb tail down with it.
 */
import { makeRng } from '../core/rng.js';

/** Smallest level an exponential ramp may target (0 is illegal). */
export const FLOOR = 1e-4;

export function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
export function ftom(f) { return 69 + 12 * Math.log2(f / 440); }
export function dbToGain(db) { return Math.pow(10, db / 20); }
export function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
/** Seconds per beat. */
export function spb(tempo) { return 60 / tempo; }

// ---------------------------------------------------------------------------
// buffers
// ---------------------------------------------------------------------------

/**
 * Seeded noise. `type` is 'white' | 'pink' | 'brown'. Stereo buffers get two
 * decorrelated streams, which is what makes wind and rumble feel wide.
 */
export function noiseBuffer(ctx, seconds = 4, type = 'white', seed = 'noise', channels = 2) {
  const len = Math.max(1, Math.floor(seconds * ctx.sampleRate));
  const buf = ctx.createBuffer(channels, len, ctx.sampleRate);
  for (let ch = 0; ch < channels; ch++) {
    const d = buf.getChannelData(ch);
    const r = makeRng(`${seed}:${type}:${ch}`);
    if (type === 'pink') {
      // Paul Kellet's economical pink filter.
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = r.range(-1, 1);
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.17;
        b6 = w * 0.115926;
      }
    } else if (type === 'brown') {
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = r.range(-1, 1);
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.2;
      }
    } else {
      for (let i = 0; i < len; i++) d[i] = r.range(-1, 1);
    }
  }
  return buf;
}

/**
 * A procedural concert-hall impulse response: a short cluster of early
 * reflections followed by an exponentially decaying, progressively darkening
 * noise tail. Each channel is normalised to unit energy so the wet level is
 * the same at any sample rate.
 */
export function makeImpulseResponse(ctx, opts = {}) {
  const seconds = opts.seconds ?? 2.7;
  const decay = opts.decay ?? 2.8;
  const preDelay = opts.preDelay ?? 0.012;
  const damp = opts.damp ?? 0.55;
  const seed = opts.seed || 'hall';
  const rate = ctx.sampleRate;
  const len = Math.max(2, Math.floor(seconds * rate));
  const pre = Math.min(len - 1, Math.floor(preDelay * rate));
  const buf = ctx.createBuffer(2, len, rate);

  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    const r = makeRng(`${seed}:ir:${ch}`);
    let lp = 0, dc = 0;
    const span = len - pre;
    for (let i = pre; i < len; i++) {
      const u = (i - pre) / span;
      // A one-pole lowpass whose coefficient closes over time: high
      // frequencies die away first, the way air absorbs them.
      const a = clamp(0.30 + damp * u, 0, 0.97);
      lp += (r.range(-1, 1) - lp) * (1 - a);
      dc += (lp - dc) * 0.004;                 // strip the rumble the lowpass builds up
      d[i] = (lp - dc) * Math.pow(1 - u, decay);
    }
    // Discrete early reflections give the space a size.
    const taps = 18;
    for (let k = 0; k < taps; k++) {
      const at = pre + Math.floor(r.range(0.003, 0.075) * rate);
      if (at < len) d[at] += r.range(-1, 1) * 0.5 * Math.pow(1 - k / taps, 1.3);
    }
    let sum = 0;
    for (let i = 0; i < len; i++) sum += d[i] * d[i];
    const g = sum > 0 ? (opts.energy ?? 1.0) / Math.sqrt(sum) : 0;
    for (let i = 0; i < len; i++) d[i] *= g;
  }
  return buf;
}

/**
 * Static soft-clip curve for the master limiter. The signal is padded by
 * 1/drive first, so `drive` sets how far above full scale the curve still
 * behaves; below `knee` it is exactly unity, above it folds smoothly into
 * `ceiling`.
 */
export function limiterCurve(len = 8192, drive = 2.0, knee = 0.62, ceiling = 0.94) {
  const c = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const x = (i / (len - 1)) * 2 - 1;
    const y = x * drive;
    const a = Math.abs(y);
    const s = y < 0 ? -1 : 1;
    c[i] = s * (a <= knee ? a : knee + (ceiling - knee) * Math.tanh((a - knee) / (ceiling - knee)));
  }
  return c;
}

// ---------------------------------------------------------------------------
// automation helpers — all absolute-time
// ---------------------------------------------------------------------------

/** Exponential ramp that tolerates zero/negative targets. */
export function expTo(param, value, when) {
  param.exponentialRampToValueAtTime(Math.max(FLOOR, value), when);
  return when;
}

/** from → to over `dur`, exponential unless told otherwise. */
export function sweep(param, when, from, to, dur, exp = true) {
  param.setValueAtTime(exp ? Math.max(FLOOR, from) : from, when);
  if (exp) param.exponentialRampToValueAtTime(Math.max(FLOOR, to), when + dur);
  else param.linearRampToValueAtTime(to, when + dur);
  return when + dur;
}

/**
 * ADSR on a gain param. Returns the absolute time the envelope reaches
 * silence, which is what callers use as a node's stop time.
 *
 *   { a, d, s, r, peak, dur }  — `dur` is attack→release-start, so total
 *   length is max(dur, a + d) + r.
 */
export function ampEnv(param, when, opts = {}) {
  const peak = Math.max(FLOOR, opts.peak ?? 1);
  const a = Math.max(0.0005, opts.a ?? 0.01);
  const d = Math.max(0.0005, opts.d ?? 0.08);
  const s = clamp(opts.s ?? 0.75, 0.0005, 4);
  const rel = Math.max(0.005, opts.r ?? 0.15);
  const dur = Math.max(opts.dur ?? 0.5, a + d);
  const t1 = when + a;
  const t2 = t1 + d;
  const t3 = when + dur;
  const sus = Math.max(FLOOR, peak * s);
  param.setValueAtTime(FLOOR, when);
  param.exponentialRampToValueAtTime(peak, t1);
  param.exponentialRampToValueAtTime(sus, t2);
  if (t3 > t2) param.setValueAtTime(sus, t3);
  param.exponentialRampToValueAtTime(FLOOR, t3 + rel);
  param.setValueAtTime(0, t3 + rel + 0.0005);
  return t3 + rel + 0.001;
}

/** Percussive envelope: instant attack, exponential decay. */
export function hitEnv(param, when, peak = 1, decay = 0.3, attack = 0.002) {
  param.setValueAtTime(FLOOR, when);
  param.exponentialRampToValueAtTime(Math.max(FLOOR, peak), when + attack);
  param.exponentialRampToValueAtTime(FLOOR, when + attack + decay);
  param.setValueAtTime(0, when + attack + decay + 0.0005);
  return when + attack + decay + 0.001;
}

/** A swell: rise, plateau, fall. */
export function swellEnv(param, when, peak, rise, hold, fall) {
  param.setValueAtTime(FLOOR, when);
  param.exponentialRampToValueAtTime(Math.max(FLOOR, peak), when + rise);
  if (hold > 0) param.setValueAtTime(Math.max(FLOOR, peak), when + rise + hold);
  param.exponentialRampToValueAtTime(FLOOR, when + rise + hold + fall);
  param.setValueAtTime(0, when + rise + hold + fall + 0.0005);
  return when + rise + hold + fall + 0.001;
}

// ---------------------------------------------------------------------------
// the engine
// ---------------------------------------------------------------------------

const ENGINE_DEFAULTS = {
  master: 0.9,
  music: 0.62,
  sfx: 0.72,
  vo: 1.0,
  reverbReturn: 0.42,
  reverbSeconds: 2.7,
  reverbDecay: 2.8,
  reverbDamp: 0.55,
  reverbPreDelay: 0.014,
  reverbSeed: 'lego-hall',
  limiter: true,
  seed: 'lego-audio',
  noiseSeconds: 8,
};

/**
 * Build the mix bus on an AudioContext or OfflineAudioContext.
 *
 * @param {BaseAudioContext} ctx
 * @param {object} [opts] see ENGINE_DEFAULTS
 * @returns {object} the engine handle the rest of src/audio takes as `audio`
 */
export function createAudioEngine(ctx, opts = {}) {
  const o = { ...ENGINE_DEFAULTS, ...opts };
  const owned = [];
  const gain = (v) => {
    const n = ctx.createGain();
    n.gain.value = v;
    owned.push(n);
    return n;
  };

  const master = gain(o.master);
  const premaster = gain(1);

  // Master soft limiter: pad → static curve → destination.
  let tail = master;
  let limiterPad = null, limiterShaper = null;
  if (o.limiter) {
    limiterPad = gain(0.5);
    limiterShaper = ctx.createWaveShaper();
    limiterShaper.curve = limiterCurve(8192, 2.0, 0.62, 0.94);
    limiterShaper.oversample = 'none';
    owned.push(limiterShaper);
    master.connect(limiterPad);
    limiterPad.connect(limiterShaper);
    tail = limiterShaper;
  }
  tail.connect(ctx.destination);
  premaster.connect(master);

  // Buses. The duck gains sit downstream of the user-facing bus nodes so a
  // caller may freely automate `music.gain` for their own fades.
  const music = gain(o.music);
  const sfx = gain(o.sfx);
  const vo = gain(o.vo);
  const musicDuck = gain(1);
  const sfxDuck = gain(1);
  music.connect(musicDuck); musicDuck.connect(premaster);
  sfx.connect(sfxDuck); sfxDuck.connect(premaster);
  vo.connect(premaster);

  // Shared reverb.
  const reverb = gain(1);                       // public send input
  const reverbPre = ctx.createDelay(0.25);
  reverbPre.delayTime.value = o.reverbPreDelay;
  owned.push(reverbPre);
  const convolver = ctx.createConvolver();
  convolver.normalize = false;
  const reverbIR = makeImpulseResponse(ctx, {
    seconds: o.reverbSeconds, decay: o.reverbDecay,
    damp: o.reverbDamp, preDelay: 0, seed: o.reverbSeed,
  });
  convolver.buffer = reverbIR;
  owned.push(convolver);
  const reverbReturn = gain(o.reverbReturn);
  reverb.connect(reverbPre);
  reverbPre.connect(convolver);
  convolver.connect(reverbReturn);
  reverbReturn.connect(premaster);

  // Per-bus reverb sends, ducked in step with the dry path.
  const sendMusic = gain(1), sendSfx = gain(1), sendVo = gain(1);
  const musicSendDuck = gain(1), sfxSendDuck = gain(1);
  sendMusic.connect(musicSendDuck); musicSendDuck.connect(reverb);
  sendSfx.connect(sfxSendDuck); sfxSendDuck.connect(reverb);
  sendVo.connect(reverb);

  const noiseCache = new Map();
  const rngCache = new Map();

  const audio = {
    ctx,
    sr: ctx.sampleRate,
    opts: o,

    // contract
    master, music, sfx, vo, reverb,

    // extras the score and sfx modules use
    premaster,
    reverbReturn,
    reverbIR,
    convolver,
    limiter: limiterShaper,
    limiterPad,
    ducks: { music: musicDuck, sfx: sfxDuck, musicSend: musicSendDuck, sfxSend: sfxSendDuck },
    sends: { music: sendMusic, sfx: sendSfx, vo: sendVo },

    /** Cue instances keyed by name, so stopCue() can find them. */
    cues: new Map(),

    /** Named deterministic stream. Same name ⇒ same numbers, every render. */
    rng(name) {
      return makeRng(`${o.seed}:${name}`);
    },

    /** Fresh stream every call but still deterministic (call order decides). */
    rngFor(name, index) {
      const key = `${name}#${index}`;
      if (!rngCache.has(key)) rngCache.set(key, 0);
      return makeRng(`${o.seed}:${key}`);
    },

    /** Cached noise buffer. */
    noise(type = 'white', seconds = o.noiseSeconds, seed = 'shared') {
      const key = `${type}|${seconds}|${seed}|${ctx.sampleRate}`;
      let b = noiseCache.get(key);
      if (!b) {
        b = noiseBuffer(ctx, seconds, type, `${o.seed}:${seed}`, 2);
        noiseCache.set(key, b);
      }
      return b;
    },

    setMasterGain(v, when = 0) {
      master.gain.cancelScheduledValues(when);
      master.gain.setValueAtTime(v, when);
      return audio;
    },

    setBusGain(name, v, when = 0) {
      const bus = name === 'music' ? music : name === 'sfx' ? sfx : name === 'vo' ? vo : null;
      if (!bus) return audio;
      bus.gain.setValueAtTime(v, when);
      return audio;
    },

    /**
     * Pull the music bed (and, less far, the effects bed) down from `when` for
     * `dur` seconds so narration sits on top. Pure AudioParam automation, so a
     * whole film's worth of ducks can be laid down before playback starts.
     * Calls are expected in increasing `when` order.
     */
    duck(when, dur = 3, amount = 0.34, dopts = {}) {
      const atk = dopts.attack ?? 0.28;
      const rel = dopts.release ?? 0.7;
      const sfxAmount = dopts.sfxAmount ?? clamp(amount + (1 - amount) * 0.55, 0, 1);
      const hold = Math.max(0, dur);
      const pairs = [
        [musicDuck.gain, amount], [musicSendDuck.gain, amount],
        [sfxDuck.gain, sfxAmount], [sfxSendDuck.gain, sfxAmount],
      ];
      for (const [p, target] of pairs) {
        p.setValueAtTime(1, Math.max(0, when - 0.001));
        p.linearRampToValueAtTime(target, when + atk);
        p.setValueAtTime(target, when + atk + hold);
        p.linearRampToValueAtTime(1, when + atk + hold + rel);
      }
      return when + atk + hold + rel;
    },

    /** Connect `node` to the shared reverb through a fresh send gain. */
    send(node, amount = 0.25, bus = 'music') {
      const g = gain(amount);
      node.connect(g);
      g.connect(bus === 'sfx' ? sendSfx : bus === 'vo' ? sendVo : sendMusic);
      return g;
    },

    dispose() {
      for (const n of owned) { try { n.disconnect(); } catch (e) { /* already gone */ } }
      owned.length = 0;
      noiseCache.clear();
      audio.cues.clear();
    },
  };

  return audio;
}

// ---------------------------------------------------------------------------
// voice plumbing shared by score.js and sfx.js
// ---------------------------------------------------------------------------

/**
 * A channel strip: gain → pan → bus, plus a reverb send. Instruments push
 * their per-note nodes into `input`.
 */
export function channelStrip(audio, dest, opts = {}) {
  const ctx = audio.ctx;
  const input = ctx.createGain();
  input.gain.value = opts.level ?? 1;
  const panner = ctx.createStereoPanner();
  panner.pan.value = clamp(opts.pan ?? 0, -1, 1);
  input.connect(panner);
  panner.connect(dest);
  let sendGain = null;
  if ((opts.send ?? 0) > 0) {
    sendGain = ctx.createGain();
    sendGain.gain.value = opts.send;
    panner.connect(sendGain);
    sendGain.connect(opts.bus === 'sfx' ? audio.sends.sfx : opts.bus === 'vo' ? audio.sends.vo : audio.sends.music);
  }
  return { input, panner, send: sendGain, nodes: [input, panner, sendGain].filter(Boolean) };
}

/**
 * A voice pool bound to one scheduled event (a cue instance or one sfx).
 * Every source node it hands out is remembered with its stop time so the whole
 * thing can be cut short later without touching a running clock.
 */
export function makeBin(audio) {
  const ctx = audio.ctx;
  const bin = {
    ctx,
    audio,
    sources: [],           // { node, stopAt }
    nodes: [],
    end: 0,

    keep(node) { bin.nodes.push(node); return node; },

    /** Oscillator started at `when`, stopped at `stopAt`. */
    osc(type, freq, when, stopAt, detune = 0) {
      const n = ctx.createOscillator();
      n.type = type;
      n.frequency.value = freq;
      if (detune) n.detune.value = detune;
      n.start(when);
      n.stop(stopAt);
      bin.sources.push({ node: n, stopAt });
      if (stopAt > bin.end) bin.end = stopAt;
      return n;
    },

    /** Buffer source (noise beds, taps). `offset` is seeded by the caller. */
    buf(buffer, when, stopAt, opts = {}) {
      const n = ctx.createBufferSource();
      n.buffer = buffer;
      if (opts.loop !== false) {
        n.loop = true;
        n.loopStart = 0;
        n.loopEnd = buffer.duration;
      }
      if (opts.rate) n.playbackRate.value = opts.rate;
      if (opts.detune) n.detune.value = opts.detune;
      n.start(when, opts.offset ?? 0);
      n.stop(stopAt);
      bin.sources.push({ node: n, stopAt });
      if (stopAt > bin.end) bin.end = stopAt;
      return n;
    },

    gain(v = 0) {
      const n = ctx.createGain();
      n.gain.value = v;
      return bin.keep(n);
    },

    filter(type, freq, q = 1) {
      const n = ctx.createBiquadFilter();
      n.type = type;
      n.frequency.value = freq;
      n.Q.value = q;
      return bin.keep(n);
    },

    /**
     * An LFO running for a span, whose output (±depth in the target param's
     * units) is added to every param passed in. Oscillators always start at
     * phase 0, so this is repeatable.
     */
    lfo(rate, depth, when, stopAt, params, type = 'sine') {
      const n = bin.osc(type, rate, when, stopAt);
      const g = bin.gain(depth);
      n.connect(g);
      for (const p of [].concat(params)) g.connect(p);
      return { osc: n, depth: g };
    },

    /**
     * Cut everything off at `at`, silencing `out` over `fade`. The hold uses
     * cancelAndHoldAtTime so no JS-side reading of a live param value is
     * needed; `base` is the fallback level where that is unavailable.
     */
    cut(at, fade, out, base = 1) {
      const t = at + fade;
      if (out) {
        const p = out.gain;
        if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(at);
        else { p.cancelScheduledValues(at); p.setValueAtTime(base, at); }
        p.linearRampToValueAtTime(0, t);
      }
      for (const s of bin.sources) {
        if (s.stopAt > t) { try { s.node.stop(t); } catch (e) { /* already stopped */ } s.stopAt = t; }
      }
      bin.end = Math.min(bin.end, t);
      return t;
    },
  };
  return bin;
}
