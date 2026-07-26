/**
 * Procedural WebAudio synthesis library — Northstar Rescue.
 * Owner: Fable 4 (with Opus 1 mixer integration in src/audio/index.js).
 *
 * EVERY sound in the game is synthesised here: oscillators, cached noise
 * buffers, biquad filters, envelopes and convolution with procedurally
 * generated impulse responses. There are no sample files, no downloads and
 * no copyrighted audio of any kind.
 *
 * The module never touches an AudioContext at import time; everything is a
 * pure function of a context handed in by AudioSystem, so importing this file
 * is safe in environments without WebAudio (Playwright with audio disabled).
 *
 * Public surface:
 *   audioContextClass()               -> AudioContext constructor | null
 *   noiseBuffer(ctx, kind)            -> cached AudioBuffer ('white'|'pink')
 *   REVERBS / impulseResponse(ctx, k) -> procedural convolution impulses
 *   makeKit(ctx, dest, when, rate)    -> scheduling toolkit used by all defs
 *   SOUNDS   { id: (kit, opts) => void }   one-shots (duration = kit.end)
 *   LOOPS    { id: (ctx, dest) => { stop(), setRate(r) } }
 *   MUSIC    { track: { bpm, div, schedule(kit, step) } }
 *   VOICE_SUBTITLES { id: { subtitle, speaker } }
 */

/* ------------------------------------------------------------------ */
/* Context / buffers                                                   */
/* ------------------------------------------------------------------ */

export function audioContextClass() {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

const NOISE_CACHE = new WeakMap();

export function noiseBuffer(ctx, kind = 'white') {
  let per = NOISE_CACHE.get(ctx);
  if (!per) {
    per = {};
    NOISE_CACHE.set(ctx, per);
  }
  if (per[kind]) return per[kind];
  const len = Math.floor(ctx.sampleRate * 1.7);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  if (kind === 'pink') {
    // Paul Kellet's economy pink noise filter
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
    }
  } else {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  per[kind] = buf;
  return buf;
}

/* ------------------------------------------------------------------ */
/* Reverb impulses                                                     */
/* ------------------------------------------------------------------ */

export const REVERBS = {
  small_hard: { secs: 0.5, decay: 9, lp: 0.42, predelay: 0.006, gain: 0.9 },
  office: { secs: 0.34, decay: 13, lp: 0.62, predelay: 0.008, gain: 0.6 },
  corridor: { secs: 1.05, decay: 5.5, lp: 0.5, predelay: 0.014, gain: 0.75 },
  hall: { secs: 2.1, decay: 3.0, lp: 0.45, predelay: 0.022, gain: 0.85 },
  garage: { secs: 1.5, decay: 3.8, lp: 0.72, predelay: 0.018, gain: 0.9 },
  outdoor: { secs: 0.22, decay: 18, lp: 0.55, predelay: 0.03, gain: 0.35 },
};

const IR_CACHE = new WeakMap();

export function impulseResponse(ctx, kind) {
  let per = IR_CACHE.get(ctx);
  if (!per) {
    per = {};
    IR_CACHE.set(ctx, per);
  }
  if (per[kind]) return per[kind];
  const p = REVERBS[kind] ?? REVERBS.office;
  const sr = ctx.sampleRate;
  const pre = Math.floor(p.predelay * sr);
  const len = pre + Math.floor(p.secs * sr);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / (len - pre);
      // Progressive lowpass: the tail darkens as it decays.
      const coef = p.lp * (1 - t * 0.6);
      lp = lp + coef * ((Math.random() * 2 - 1) - lp);
      d[i] = lp * Math.exp(-p.decay * t) * p.gain;
    }
    // A couple of sparse early reflections give the room a size cue.
    const refl = kind === 'outdoor' ? 1 : 3;
    for (let rI = 0; rI < refl; rI++) {
      const at = pre + Math.floor((0.15 + 0.25 * rI) * (len - pre));
      if (at < len - 1) d[at] += (Math.random() * 0.5 + 0.4) * p.gain * 0.4 * (ch ? -1 : 1);
    }
  }
  per[kind] = buf;
  return buf;
}

/* ------------------------------------------------------------------ */
/* Toolkit                                                             */
/* ------------------------------------------------------------------ */

const EPS = 0.0001;

export function makeKit(ctx, dest, when, rate = 1) {
  const F = (f) => Math.min(18000, Math.max(8, f * rate));
  const kit = {
    ctx,
    dest,
    when,
    rate,
    end: when,
  };
  const mark = (t) => {
    if (t > kit.end) kit.end = t;
  };
  const T = (t) => when + t / rate;
  const D = (d) => Math.max(0.004, d / rate);

  function envGain(t0, { a = 0.003, peak = 0.5, hold = 0, r = 0.08, lin = false } = {}) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(EPS, t0);
    g.gain.linearRampToValueAtTime(Math.max(EPS, peak), t0 + a);
    const th = t0 + a + hold;
    if (hold > 0) g.gain.setValueAtTime(Math.max(EPS, peak), th);
    if (lin) g.gain.linearRampToValueAtTime(0, th + r);
    else g.gain.exponentialRampToValueAtTime(EPS, th + r);
    mark(th + r + 0.02);
    return g;
  }

  function makeFilter(spec) {
    const f = ctx.createBiquadFilter();
    f.type = spec.kind === 'bp' ? 'bandpass' : spec.kind === 'hp' ? 'highpass' : spec.kind === 'notch' ? 'notch' : 'lowpass';
    f.frequency.value = F(spec.f ?? 1000);
    f.Q.value = spec.q ?? 1;
    return f;
  }

  /** Oscillator with envelope, optional pitch slide and filter. */
  kit.tone = ({ t = 0, dur = 0.1, w = 'sine', f = 440, f2 = null, slideT = null, g = 0.4, a = 0.003, r = null, filter = null, detune = 0, out = null } = {}) => {
    const t0 = T(t);
    const d = D(dur);
    const rel = r != null ? D(r) : d * 0.7;
    const osc = ctx.createOscillator();
    osc.type = w;
    osc.frequency.setValueAtTime(F(f), t0);
    if (f2 != null) osc.frequency.exponentialRampToValueAtTime(F(f2), t0 + (slideT != null ? D(slideT) : d));
    if (detune) osc.detune.value = detune;
    const env = envGain(t0, { a: D(a), peak: g, hold: Math.max(0, d - D(a) - rel), r: rel });
    let head = osc;
    if (filter) {
      const fl = makeFilter(filter);
      osc.connect(fl);
      head = fl;
    }
    head.connect(env);
    env.connect(out ?? dest);
    osc.start(t0);
    osc.stop(t0 + d + rel + 0.05);
    mark(t0 + d + rel + 0.05);
    return osc;
  };

  /** Noise burst through an optional (sweepable) filter, with envelope. */
  kit.noise = ({ t = 0, dur = 0.15, type = 'white', g = 0.3, a = 0.002, r = null, kind = 'bp', f = 1200, f2 = null, q = 1, rate: nrate = 1, out = null } = {}) => {
    const t0 = T(t);
    const d = D(dur);
    const rel = r != null ? D(r) : d * 0.8;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, type);
    src.loop = true;
    src.playbackRate.value = nrate * (0.92 + Math.random() * 0.16);
    src.loopStart = Math.random(); // decorrelate repeated bursts
    const fl = makeFilter({ kind, f, q });
    if (f2 != null) {
      fl.frequency.setValueAtTime(F(f), t0);
      fl.frequency.exponentialRampToValueAtTime(F(f2), t0 + d);
    }
    const env = envGain(t0, { a: D(a), peak: g, hold: Math.max(0, d - D(a) - rel), r: rel });
    src.connect(fl);
    fl.connect(env);
    env.connect(out ?? dest);
    src.start(t0, Math.random());
    src.stop(t0 + d + rel + 0.05);
    mark(t0 + d + rel + 0.05);
    return { src, fl, env };
  };

  /** Very short filtered-noise transient — mechanical clicks, snaps. */
  kit.click = ({ t = 0, f = 2000, g = 0.3, dur = 0.01, q = 1.4 } = {}) =>
    kit.noise({ t, dur, g, kind: 'bp', f, q, a: 0.0008, r: dur });

  /** Sine pitch-drop body thump. */
  kit.thump = ({ t = 0, f = 120, f2 = null, dur = 0.12, g = 0.6 } = {}) =>
    kit.tone({ t, dur, w: 'sine', f, f2: f2 ?? f * 0.35, g, a: 0.002, r: dur * 0.85 });

  /** Inharmonic metallic ring — a few detuned sines with exponential decay. */
  kit.metal = ({ t = 0, fs = [820, 1370, 2210], dur = 0.35, g = 0.25, spread = 0.015 } = {}) => {
    fs.forEach((f, i) => {
      kit.tone({
        t,
        dur: dur * (0.55 + Math.random() * 0.45),
        w: 'sine',
        f: f * (1 + (Math.random() - 0.5) * spread * 2),
        g: (g / (i + 1)) * (0.8 + Math.random() * 0.4),
        a: 0.001,
      });
    });
  };

  /* ---- Voice synthesis: formant-filtered glottal source ---- */

  const FORMANTS = {
    a: [750, 1220, 2600],
    e: [420, 1900, 2650],
    i: [300, 2150, 3000],
    o: [480, 850, 2650],
    u: [340, 700, 2500],
    m: [260, 950, 2300],
  };

  /**
   * A short vocalisation: continuous sawtooth glottal source with vibrato,
   * three parallel formant bandpasses re-tuned per syllable, per-syllable
   * amplitude gating and a breath-noise layer. Reads as human, not as beeps.
   *
   * spec: { base, syll: [{ v, d, p, g?, gap? }], vib, breath }
   */
  kit.voice = (spec, opts = {}) => {
    const vmul = [1, 0.93, 1.09, 0.86][Math.abs(opts.variant ?? 0) % 4];
    const f0base = spec.base * vmul;
    const t0 = T(0);
    let total = 0;
    for (const s of spec.syll) total += s.d + (s.gap ?? 0.03);
    total = D(total + 0.1);

    const src = ctx.createOscillator();
    src.type = 'sawtooth';
    // Vibrato + a touch of pitch jitter so the voice never sounds synthetic.
    const vib = ctx.createOscillator();
    vib.type = 'sine';
    vib.frequency.value = spec.vib?.f ?? 5.3;
    const vibGain = ctx.createGain();
    vibGain.gain.value = f0base * (spec.vib?.depth ?? 0.02);
    vib.connect(vibGain);
    vibGain.connect(src.frequency);

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(dest);

    const formantGains = [1.0, 0.42, 0.2];
    const filters = [];
    for (let i = 0; i < 3; i++) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 9;
      const fg = ctx.createGain();
      fg.gain.value = formantGains[i];
      src.connect(bp);
      bp.connect(fg);
      fg.connect(master);
      filters.push(bp);
    }
    // Breath layer
    const breath = ctx.createBufferSource();
    breath.buffer = noiseBuffer(ctx, 'pink');
    breath.loop = true;
    const blp = ctx.createBiquadFilter();
    blp.type = 'lowpass';
    blp.frequency.value = 3800;
    const bg = ctx.createGain();
    bg.gain.value = spec.breath ?? 0.05;
    breath.connect(blp);
    blp.connect(bg);
    bg.connect(master);

    let t = t0;
    const g0 = opts.g ?? 0.5;
    src.frequency.setValueAtTime(F(f0base * (spec.syll[0].p ?? 1)), t0);
    for (const s of spec.syll) {
      const d = D(s.d);
      const f0 = F(f0base * (s.p ?? 1) * (1 + (Math.random() - 0.5) * 0.03));
      src.frequency.setTargetAtTime(f0, t, 0.03);
      const fm = FORMANTS[s.v] ?? FORMANTS.a;
      for (let i = 0; i < 3; i++) filters[i].frequency.setTargetAtTime(F(fm[i]), t, 0.028);
      const peak = g0 * (s.g ?? 1);
      master.gain.setTargetAtTime(peak, t, 0.02);
      master.gain.setTargetAtTime(peak * 0.25, t + d * 0.75, 0.03);
      t += d;
      master.gain.setTargetAtTime(0.0001, t, 0.024);
      t += D(s.gap ?? 0.03);
    }
    master.gain.setTargetAtTime(0, t, 0.03);
    src.start(t0);
    vib.start(t0);
    breath.start(t0, Math.random());
    const tEnd = t0 + total + 0.15;
    src.stop(tEnd);
    vib.stop(tEnd);
    breath.stop(tEnd);
    mark(tEnd);
  };

  return kit;
}

/* ------------------------------------------------------------------ */
/* Shared builders                                                     */
/* ------------------------------------------------------------------ */

function gunshot(k, { crack = 1, boom = 1, bright = 5200, mid = 1700, body = 190, dur = 0.14 }) {
  k.click({ t: 0, f: bright, g: 0.85 * crack, dur: 0.012, q: 0.7 });
  k.noise({ t: 0, dur, g: 0.72 * crack, kind: 'bp', f: mid, f2: mid * 0.35, q: 0.6 });
  k.noise({ t: 0, dur: dur * 0.7, g: 0.5 * boom, kind: 'lp', f: 700 });
  k.thump({ t: 0, f: body, f2: body * 0.28, dur: 0.07 + 0.07 * boom, g: 0.85 * boom });
}

function gunTail(k, { dur = 0.9, g = 0.32, f = 1100 }) {
  k.noise({ t: 0, dur, g, kind: 'bp', f, f2: 240, q: 0.7, a: 0.004 });
  k.noise({ t: 0.02, dur: dur * 1.1, g: g * 0.6, kind: 'lp', f: 420, a: 0.01 });
}

function mech(k, t, { f = 1300, g = 0.28, ring = 0 } = {}) {
  k.click({ t, f, g, dur: 0.014, q: 1.6 });
  k.click({ t: t + 0.012, f: f * 0.62, g: g * 0.7, dur: 0.02, q: 1.2 });
  if (ring) k.metal({ t, fs: [f * 1.7], dur: 0.09, g: ring });
}

function footstep(k, { f = 950, g = 0.26, dur = 0.07, knock = 130, knockG = null, ring = 0, crunch = 0, lp = false }) {
  k.noise({ t: 0, dur, g, kind: lp ? 'lp' : 'bp', f, q: 0.9 });
  if (knock) k.thump({ t: 0, f: knock, f2: knock * 0.55, dur: 0.045, g: knockG ?? g * 0.9 });
  if (ring) k.metal({ t: 0.004, fs: [ring, ring * 1.62], dur: 0.12, g: g * 0.35 });
  for (let i = 0; i < crunch; i++) {
    k.click({ t: Math.random() * dur * 1.5, f: 1100 + Math.random() * 1400, g: g * (0.3 + Math.random() * 0.5), dur: 0.006 });
  }
}

function shellDrop(k, opts, { size = 1, plastic = false }) {
  const surface = opts?.surface ?? 'concrete';
  if (surface === 'carpet') {
    k.noise({ t: 0, dur: 0.05, g: 0.1 * size, kind: 'lp', f: 800 });
    return;
  }
  const bright = surface === 'tile' || surface === 'ceramic' ? 1.25 : 1;
  if (plastic) {
    k.thump({ t: 0, f: 420, f2: 180, dur: 0.04, g: 0.22 * size });
    k.click({ t: 0.09, f: 900, g: 0.12 * size, dur: 0.02 });
    return;
  }
  const base = (4900 / Math.sqrt(size)) * bright;
  const bounces = [0, 0.085, 0.15, 0.2];
  bounces.forEach((t, i) => {
    const gg = 0.24 * size * Math.pow(0.55, i);
    if (gg < 0.02) return;
    k.metal({ t: t * (0.9 + Math.random() * 0.2), fs: [base * (0.94 + Math.random() * 0.12), base * 1.5], dur: 0.1, g: gg });
  });
}

const N = (m) => 440 * Math.pow(2, (m - 69) / 12);

/* ------------------------------------------------------------------ */
/* Voice subtitles (exported — the lead renders these)                  */
/* ------------------------------------------------------------------ */

export const VOICE_SUBTITLES = {
  'vo.hostile.contact': { subtitle: 'Contact! Contact!', speaker: 'hostile' },
  'vo.hostile.searching': { subtitle: 'Where are you…', speaker: 'hostile' },
  'vo.hostile.reloading': { subtitle: 'Reloading — cover me!', speaker: 'hostile' },
  'vo.hostile.flank': { subtitle: 'Go around! Flank him!', speaker: 'hostile' },
  'vo.hostile.lostyou': { subtitle: 'Lost him. Stay sharp.', speaker: 'hostile' },
  'vo.hostile.hit': { subtitle: 'Agh — I’m hit!', speaker: 'hostile' },
  'vo.hostile.death': { subtitle: '(dying groan)', speaker: 'hostile' },
  'vo.hostage.fear': { subtitle: 'Please — don’t shoot!', speaker: 'hostage' },
  'vo.hostage.relief': { subtitle: 'Oh, thank god. Get me out of here.', speaker: 'hostage' },
  'vo.hostage.follow': { subtitle: 'Okay. Right behind you.', speaker: 'hostage' },
  'vo.hostage.hurry': { subtitle: 'Hurry — they’re coming!', speaker: 'hostage' },
  'vo.hostage.thanks': { subtitle: 'Thank you. Thank you.', speaker: 'hostage' },
};

/* ------------------------------------------------------------------ */
/* One-shot sound definitions                                          */
/* ------------------------------------------------------------------ */

export const SOUNDS = {};
const S = SOUNDS;

/* ---- Weapons: fire / tails ---- */
S['wpn.pistol.fire'] = (k) => gunshot(k, { crack: 0.9, boom: 0.65, bright: 5600, mid: 2100, body: 210, dur: 0.1 });
S['wpn.smg.fire'] = (k) => gunshot(k, { crack: 0.82, boom: 0.6, bright: 5100, mid: 1900, body: 185, dur: 0.09 });
S['wpn.rifle.fire'] = (k) => gunshot(k, { crack: 1.05, boom: 0.95, bright: 4800, mid: 1500, body: 150, dur: 0.15 });
S['wpn.shotgun.fire'] = (k) => {
  gunshot(k, { crack: 0.8, boom: 1.35, bright: 3600, mid: 900, body: 105, dur: 0.24 });
  k.noise({ t: 0, dur: 0.3, g: 0.6, kind: 'lp', f: 500 });
};
S['wpn.dmr.fire'] = (k) => {
  gunshot(k, { crack: 1.3, boom: 1.1, bright: 6200, mid: 2400, body: 135, dur: 0.2 });
  k.thump({ t: 0.01, f: 95, f2: 30, dur: 0.2, g: 0.7 });
};
S['wpn.pistol.tail'] = (k) => gunTail(k, { dur: 0.55, g: 0.24, f: 1300 });
S['wpn.smg.tail'] = (k) => gunTail(k, { dur: 0.5, g: 0.22, f: 1250 });
S['wpn.rifle.tail'] = (k) => gunTail(k, { dur: 1.0, g: 0.32, f: 1000 });
S['wpn.shotgun.tail'] = (k) => gunTail(k, { dur: 1.15, g: 0.38, f: 650 });
S['wpn.dmr.tail'] = (k) => gunTail(k, { dur: 1.5, g: 0.4, f: 1100 });
S['wpn.distant.indoor'] = (k) => {
  k.thump({ t: 0, f: 110, f2: 45, dur: 0.22, g: 0.4 });
  k.noise({ t: 0, dur: 0.5, g: 0.28, kind: 'lp', f: 420, f2: 150 });
};
S['wpn.distant.far'] = (k) => {
  k.thump({ t: 0, f: 80, f2: 32, dur: 0.3, g: 0.26 });
  k.noise({ t: 0.02, dur: 0.8, g: 0.16, kind: 'lp', f: 240, f2: 90 });
  k.thump({ t: 0.24, f: 62, f2: 30, dur: 0.25, g: 0.1 }); // faint terrain echo
};

/* ---- Weapons: handling ---- */
S['wpn.dry'] = (k) => {
  mech(k, 0, { f: 2100, g: 0.32 });
  mech(k, 0.055, { f: 1400, g: 0.2 });
};
S['wpn.magOut'] = (k) => {
  mech(k, 0, { f: 1150, g: 0.24 });
  k.noise({ t: 0.02, dur: 0.07, g: 0.1, kind: 'bp', f: 750, q: 0.8 });
};
S['wpn.magIn'] = (k) => {
  k.noise({ t: 0, dur: 0.05, g: 0.12, kind: 'bp', f: 800, q: 0.8 });
  mech(k, 0.05, { f: 1000, g: 0.34, ring: 0.06 });
};
S['wpn.chamber'] = (k) => {
  mech(k, 0, { f: 1500, g: 0.3 });
  k.noise({ t: 0.03, dur: 0.08, g: 0.16, kind: 'bp', f: 1900, q: 0.7 });
  mech(k, 0.13, { f: 1100, g: 0.38, ring: 0.08 });
};
S['wpn.draw'] = (k) => {
  k.noise({ t: 0, dur: 0.14, g: 0.12, kind: 'bp', f: 600, f2: 1100, q: 0.6 });
  mech(k, 0.12, { f: 1300, g: 0.16 });
};
S['wpn.holster'] = (k) => {
  k.noise({ t: 0, dur: 0.16, g: 0.1, kind: 'bp', f: 1000, f2: 500, q: 0.6 });
  mech(k, 0.14, { f: 850, g: 0.12 });
};
S['wpn.pistol.reload'] = (k) => {
  S['wpn.magOut'](k);
  const k2 = makeKit(k.ctx, k.dest, k.when + 0.55 / k.rate, k.rate);
  S['wpn.magIn'](k2);
  const k3 = makeKit(k.ctx, k.dest, k.when + 1.05 / k.rate, k.rate);
  S['wpn.chamber'](k3);
  k.end = Math.max(k.end, k3.end);
};
S['wpn.smg.reload'] = (k) => {
  S['wpn.magOut'](k);
  const k2 = makeKit(k.ctx, k.dest, k.when + 0.7 / k.rate, k.rate);
  S['wpn.magIn'](k2);
  const k3 = makeKit(k.ctx, k.dest, k.when + 1.35 / k.rate, k.rate);
  S['wpn.chamber'](k3);
  k.end = Math.max(k.end, k3.end);
};
S['wpn.rifle.reload'] = (k) => {
  S['wpn.magOut'](k);
  const k2 = makeKit(k.ctx, k.dest, k.when + 0.85 / k.rate, k.rate);
  S['wpn.magIn'](k2);
  const k3 = makeKit(k.ctx, k.dest, k.when + 1.55 / k.rate, k.rate);
  mech(k3, 0, { f: 900, g: 0.4, ring: 0.1 }); // bolt release slap
  k.end = Math.max(k.end, k3.end);
};
S['wpn.shotgun.shell'] = (k) => {
  k.click({ t: 0, f: 700, g: 0.18, dur: 0.02 });
  mech(k, 0.09, { f: 1200, g: 0.3, ring: 0.05 });
};
S['wpn.shotgun.pump'] = (k) => {
  k.noise({ t: 0, dur: 0.07, g: 0.26, kind: 'bp', f: 1000, q: 0.7 });
  mech(k, 0.05, { f: 1450, g: 0.3 });
  k.noise({ t: 0.14, dur: 0.07, g: 0.3, kind: 'bp', f: 850, q: 0.7 });
  mech(k, 0.2, { f: 1100, g: 0.36, ring: 0.08 });
};
S['wpn.dmr.reload'] = (k) => {
  S['wpn.magOut'](k);
  const k2 = makeKit(k.ctx, k.dest, k.when + 1.0 / k.rate, k.rate);
  S['wpn.magIn'](k2);
  const k3 = makeKit(k.ctx, k.dest, k.when + 1.9 / k.rate, k.rate);
  S['wpn.chamber'](k3);
  k.end = Math.max(k.end, k3.end);
};
S['wpn.dmr.bolt'] = (k) => {
  mech(k, 0, { f: 1600, g: 0.26 }); // handle up
  k.noise({ t: 0.14, dur: 0.09, g: 0.18, kind: 'bp', f: 1300, q: 0.8 }); // back
  k.noise({ t: 0.38, dur: 0.09, g: 0.2, kind: 'bp', f: 1150, q: 0.8 }); // forward
  mech(k, 0.55, { f: 1000, g: 0.34, ring: 0.08 }); // handle down
};
S['wpn.knife.swing'] = (k) =>
  k.noise({ t: 0, dur: 0.16, g: 0.16, kind: 'bp', f: 500, f2: 2400, q: 1.6, a: 0.02 });
S['wpn.knife.hit'] = (k) => {
  k.thump({ t: 0, f: 180, f2: 70, dur: 0.06, g: 0.45 });
  k.noise({ t: 0, dur: 0.08, g: 0.3, kind: 'lp', f: 900 });
};

/* ---- Casings ---- */
S['shell.small'] = (k, o) => shellDrop(k, o, { size: 1 });
S['shell.rifle'] = (k, o) => shellDrop(k, o, { size: 1.5 });
S['shell.shotgun'] = (k, o) => shellDrop(k, o, { size: 2.2, plastic: true });

/* ---- Footsteps ---- */
const STEP_DEFS = {
  concrete: { f: 1000, g: 0.24, dur: 0.06, knock: 130 },
  carpet: { f: 520, g: 0.16, dur: 0.09, knock: 90, knockG: 0.07, lp: true },
  vinyl: { f: 820, g: 0.22, dur: 0.07, knock: 140 },
  ceramic: { f: 1500, g: 0.24, dur: 0.055, knock: 150, ring: 2600 },
  tile: { f: 1350, g: 0.24, dur: 0.055, knock: 145, ring: 2100 },
  metal: { f: 900, g: 0.26, dur: 0.07, knock: 110, ring: 780 },
  wood: { f: 680, g: 0.26, dur: 0.07, knock: 175, knockG: 0.3 },
  snow: { f: 1300, g: 0.14, dur: 0.12, knock: 0, crunch: 8, lp: true },
};
for (const [surf, def] of Object.entries(STEP_DEFS)) {
  S[`step.${surf}`] = (k) => footstep(k, def);
  S[`step.crouch.${surf}`] = (k) =>
    footstep(k, {
      ...def,
      f: def.f * 0.75,
      g: def.g * 0.42,
      knockG: (def.knockG ?? def.g * 0.9) * 0.4,
      ring: 0,
      crunch: def.crunch ? 4 : 0,
      lp: true,
    });
}
S['step.land'] = (k) => {
  k.thump({ t: 0, f: 120, f2: 42, dur: 0.1, g: 0.6 });
  k.noise({ t: 0, dur: 0.09, g: 0.26, kind: 'lp', f: 800 });
  k.noise({ t: 0.07, dur: 0.06, g: 0.1, kind: 'lp', f: 600 }); // second foot
};

/* ---- Doors ---- */
S['door.wood.open'] = (k) => {
  mech(k, 0, { f: 1350, g: 0.22 });
  k.tone({ t: 0.05, dur: 0.4, w: 'sawtooth', f: 230, f2: 300, g: 0.035, filter: { kind: 'lp', f: 900 }, a: 0.06 });
  k.noise({ t: 0.04, dur: 0.35, g: 0.06, kind: 'bp', f: 500, q: 0.6, a: 0.05 });
};
S['door.wood.close'] = (k) => {
  k.noise({ t: 0, dur: 0.2, g: 0.07, kind: 'bp', f: 550, q: 0.6, a: 0.03 });
  k.thump({ t: 0.18, f: 150, f2: 65, dur: 0.07, g: 0.5 });
  mech(k, 0.22, { f: 1500, g: 0.24 });
};
S['door.metal.open'] = (k) => {
  k.thump({ t: 0, f: 100, f2: 55, dur: 0.06, g: 0.4 });
  k.metal({ t: 0, fs: [190, 425, 760], dur: 0.3, g: 0.18 });
  k.tone({ t: 0.08, dur: 0.5, w: 'sawtooth', f: 620, f2: 780, g: 0.02, filter: { kind: 'bp', f: 1500, q: 4 }, a: 0.08 });
};
S['door.metal.close'] = (k) => {
  k.noise({ t: 0, dur: 0.15, g: 0.06, kind: 'bp', f: 700, q: 0.6 });
  k.thump({ t: 0.14, f: 110, f2: 48, dur: 0.09, g: 0.65 });
  k.metal({ t: 0.14, fs: [210, 470, 900], dur: 0.5, g: 0.24 });
};
S['door.glass.open'] = (k) => {
  mech(k, 0, { f: 1900, g: 0.16 });
  k.noise({ t: 0.04, dur: 0.35, g: 0.05, kind: 'hp', f: 2600, a: 0.06 });
};
S['door.glass.close'] = (k) => {
  k.noise({ t: 0, dur: 0.25, g: 0.045, kind: 'hp', f: 2400, a: 0.04 });
  k.thump({ t: 0.2, f: 200, f2: 90, dur: 0.05, g: 0.3 });
  k.metal({ t: 0.21, fs: [2900], dur: 0.12, g: 0.07 });
};
S['door.locked'] = (k) => {
  mech(k, 0, { f: 1600, g: 0.3 });
  mech(k, 0.09, { f: 1500, g: 0.24 });
  k.noise({ t: 0.04, dur: 0.12, g: 0.12, kind: 'bp', f: 900, q: 1.2 }); // rattle
};
S['door.impact'] = (k) => {
  k.thump({ t: 0, f: 105, f2: 38, dur: 0.12, g: 0.9 });
  k.noise({ t: 0, dur: 0.12, g: 0.4, kind: 'bp', f: 650, q: 0.6 });
  k.click({ t: 0.008, f: 900, g: 0.3, dur: 0.03 }); // frame crack
  k.metal({ t: 0.01, fs: [420], dur: 0.2, g: 0.1 }); // hardware rattle
};
S['door.closer.hiss'] = (k) =>
  k.noise({ t: 0, dur: 1.1, g: 0.06, kind: 'bp', f: 3200, f2: 1600, q: 0.8, a: 0.1 });
S['pushbar'] = (k) => {
  k.click({ t: 0, f: 800, g: 0.32, dur: 0.02 });
  k.metal({ t: 0.01, fs: [1080, 1750], dur: 0.25, g: 0.16 });
  k.thump({ t: 0.03, f: 140, f2: 70, dur: 0.05, g: 0.3 });
};
S['shutter.motor'] = (k) => {
  k.tone({ t: 0, dur: 1.6, w: 'sawtooth', f: 52, f2: 58, g: 0.14, filter: { kind: 'lp', f: 260 }, a: 0.12, r: 0.25 });
  k.noise({ t: 0, dur: 1.6, g: 0.08, kind: 'bp', f: 480, q: 0.7, a: 0.12, r: 0.25 });
};
S['shutter.rattle'] = (k) => {
  for (let i = 0; i < 8; i++) {
    k.metal({ t: i * 0.07 + Math.random() * 0.02, fs: [340 + Math.random() * 260, 880], dur: 0.08, g: 0.1 });
  }
};
S['reader.grant'] = (k) => {
  k.tone({ t: 0, dur: 0.07, w: 'sine', f: 880, g: 0.14, a: 0.004 });
  k.tone({ t: 0.1, dur: 0.12, w: 'sine', f: 1318, g: 0.16, a: 0.004 });
  mech(k, 0.24, { f: 1200, g: 0.16 }); // lock solenoid
};
S['reader.deny'] = (k) => {
  k.tone({ t: 0, dur: 0.13, w: 'square', f: 196, g: 0.08, filter: { kind: 'lp', f: 1200 } });
  k.tone({ t: 0.17, dur: 0.16, w: 'square', f: 165, g: 0.08, filter: { kind: 'lp', f: 1200 } });
};

/* ---- Glass ---- */
S['glass.tap'] = (k) => k.metal({ t: 0, fs: [2350, 3900], dur: 0.12, g: 0.14 });
S['glass.crack'] = (k) => {
  k.click({ t: 0, f: 3300, g: 0.3, dur: 0.012 });
  k.click({ t: 0.03, f: 2500, g: 0.2, dur: 0.014 });
  k.noise({ t: 0, dur: 0.14, g: 0.1, kind: 'hp', f: 3600 });
};
S['glass.shatter'] = (k) => {
  k.noise({ t: 0, dur: 0.5, g: 0.55, kind: 'hp', f: 2400, a: 0.002 });
  k.thump({ t: 0, f: 210, f2: 90, dur: 0.07, g: 0.3 });
  for (let i = 0; i < 11; i++) {
    k.metal({
      t: 0.01 + Math.random() * 0.35,
      fs: [2100 + Math.random() * 3400],
      dur: 0.14 + Math.random() * 0.14,
      g: 0.1 + Math.random() * 0.1,
    });
  }
};
S['glass.fragments'] = (k) => {
  for (let i = 0; i < 6; i++) {
    k.metal({ t: Math.random() * 0.7, fs: [2600 + Math.random() * 2800], dur: 0.12, g: 0.05 + Math.random() * 0.05 });
  }
};

/* ---- Bullet impacts ---- */
S['impact.concrete'] = (k) => {
  k.click({ t: 0, f: 1900, g: 0.35, dur: 0.014 });
  k.noise({ t: 0, dur: 0.09, g: 0.26, kind: 'bp', f: 1200, f2: 500, q: 0.8 });
  k.click({ t: 0.04, f: 2600, g: 0.08, dur: 0.008 }); // chip skitter
};
S['impact.drywall'] = (k) => {
  k.noise({ t: 0, dur: 0.12, g: 0.3, kind: 'lp', f: 640 });
  k.thump({ t: 0, f: 150, f2: 70, dur: 0.05, g: 0.3 });
};
S['impact.wood'] = (k) => {
  k.thump({ t: 0, f: 260, f2: 110, dur: 0.05, g: 0.4 });
  k.click({ t: 0.004, f: 1200, g: 0.24, dur: 0.02 });
  k.noise({ t: 0, dur: 0.07, g: 0.14, kind: 'bp', f: 800, q: 0.8 });
};
S['impact.metal'] = (k) => {
  k.click({ t: 0, f: 3200, g: 0.3, dur: 0.01 });
  k.metal({ t: 0, fs: [1240, 2080, 3350], dur: 0.28, g: 0.24 });
};
S['impact.glass'] = (k) => {
  k.metal({ t: 0, fs: [2750, 4200], dur: 0.16, g: 0.2 });
  k.click({ t: 0.02, f: 3600, g: 0.1, dur: 0.01 });
};
S['impact.carpet'] = (k) => k.noise({ t: 0, dur: 0.08, g: 0.16, kind: 'lp', f: 420 });
S['impact.ceramic'] = (k) => {
  k.click({ t: 0, f: 2600, g: 0.3, dur: 0.012 });
  k.metal({ t: 0.004, fs: [3900, 5300], dur: 0.12, g: 0.12 });
  k.noise({ t: 0, dur: 0.06, g: 0.16, kind: 'bp', f: 1900, q: 1 });
};
S['impact.tile'] = (k) => S['impact.ceramic'](k);
S['impact.vinyl'] = (k) => {
  k.thump({ t: 0, f: 300, f2: 140, dur: 0.04, g: 0.26 });
  k.click({ t: 0, f: 1500, g: 0.16, dur: 0.012 });
};
S['impact.plastic'] = (k) => {
  k.thump({ t: 0, f: 340, f2: 160, dur: 0.045, g: 0.24 });
  k.click({ t: 0.005, f: 1900, g: 0.14, dur: 0.01 });
};
S['impact.rubber'] = (k) => k.noise({ t: 0, dur: 0.06, g: 0.18, kind: 'lp', f: 320 });
S['impact.snow'] = (k) => k.noise({ t: 0, dur: 0.1, g: 0.14, kind: 'lp', f: 520 });
S['impact.flesh'] = (k) => {
  k.noise({ t: 0, dur: 0.07, g: 0.34, kind: 'lp', f: 380 });
  k.thump({ t: 0, f: 95, f2: 45, dur: 0.06, g: 0.4 });
  k.noise({ t: 0.015, dur: 0.05, g: 0.12, kind: 'bp', f: 900, q: 2 }); // wet snap
};
S['ricochet'] = (k) => {
  k.click({ t: 0, f: 3000, g: 0.24, dur: 0.008 });
  k.tone({ t: 0.004, dur: 0.24, w: 'sawtooth', f: 3300, f2: 850, g: 0.1, filter: { kind: 'bp', f: 2400, q: 3 } });
};

/* ---- Bodies ---- */
S['cloth.move'] = (k) =>
  k.noise({ t: 0, dur: 0.22, g: 0.07, kind: 'bp', f: 450, f2: 900, q: 0.7, a: 0.04 });
S['body.fall'] = (k) => {
  k.thump({ t: 0, f: 95, f2: 34, dur: 0.11, g: 0.7 });
  k.noise({ t: 0, dur: 0.14, g: 0.2, kind: 'lp', f: 600 });
  k.thump({ t: 0.16, f: 80, f2: 32, dur: 0.07, g: 0.3 }); // limbs settle
  k.noise({ t: 0.15, dur: 0.12, g: 0.08, kind: 'bp', f: 500, q: 0.7 });
};
S['hit.flesh'] = (k) => {
  k.noise({ t: 0, dur: 0.08, g: 0.4, kind: 'lp', f: 420 });
  k.thump({ t: 0, f: 105, f2: 48, dur: 0.07, g: 0.5 });
};
S['hit.armor'] = (k) => {
  k.metal({ t: 0, fs: [640, 990, 1620], dur: 0.2, g: 0.28 });
  k.thump({ t: 0, f: 160, f2: 75, dur: 0.05, g: 0.4 });
};

/* ---- Grenades ---- */
S['nade.throw'] = (k) =>
  k.noise({ t: 0, dur: 0.28, g: 0.2, kind: 'bp', f: 320, f2: 1400, q: 1.4, a: 0.05 });
S['nade.bounce'] = (k) => {
  k.metal({ t: 0, fs: [1450, 2300], dur: 0.12, g: 0.16 });
  k.thump({ t: 0, f: 220, f2: 100, dur: 0.04, g: 0.3 });
};
S['nade.flash'] = (k) => {
  k.click({ t: 0, f: 4800, g: 1.2, dur: 0.02, q: 0.5 });
  k.noise({ t: 0, dur: 0.5, g: 1.0, kind: 'lp', f: 7500, f2: 400 });
  k.thump({ t: 0, f: 130, f2: 28, dur: 0.3, g: 1.1 });
  k.tone({ t: 0.02, dur: 1.3, w: 'sine', f: 3850, g: 0.14, a: 0.005, r: 1.1 }); // onset ring
};
S['nade.smoke'] = (k) => {
  k.thump({ t: 0, f: 210, f2: 80, dur: 0.08, g: 0.45 });
  k.click({ t: 0, f: 900, g: 0.2, dur: 0.02 });
  k.noise({ t: 0.05, dur: 3.2, g: 0.16, kind: 'bp', f: 3000, f2: 1500, q: 0.6, a: 0.1, r: 1.4 });
};
S['nade.pin'] = (k) => {
  mech(k, 0, { f: 2100, g: 0.18, ring: 0.08 });
};

/* ---- UI (routed dry — index skips the reverb send for ui.*) ---- */
S['ui.hover'] = (k) => k.tone({ t: 0, dur: 0.035, w: 'sine', f: 1400, g: 0.07, a: 0.003 });
S['ui.select'] = (k) => {
  k.tone({ t: 0, dur: 0.05, w: 'sine', f: 880, g: 0.12, a: 0.003 });
  k.tone({ t: 0.06, dur: 0.09, w: 'sine', f: 1318, g: 0.12, a: 0.003 });
};
S['ui.back'] = (k) => {
  k.tone({ t: 0, dur: 0.05, w: 'sine', f: 1318, g: 0.1, a: 0.003 });
  k.tone({ t: 0.06, dur: 0.09, w: 'sine', f: 880, g: 0.1, a: 0.003 });
};
S['ui.error'] = (k) => {
  k.tone({ t: 0, dur: 0.12, w: 'square', f: 164, g: 0.07, filter: { kind: 'lp', f: 1100 } });
  k.tone({ t: 0.16, dur: 0.15, w: 'square', f: 155, g: 0.07, filter: { kind: 'lp', f: 1100 } });
};
S['ui.tick'] = (k) => k.click({ t: 0, f: 2100, g: 0.09, dur: 0.008 });
S['ui.objective'] = (k) => {
  k.tone({ t: 0, dur: 0.4, w: 'sine', f: 1047, g: 0.12, a: 0.004, r: 0.36 });
  k.tone({ t: 0.09, dur: 0.5, w: 'sine', f: 1568, g: 0.1, a: 0.004, r: 0.45 });
};
S['ui.victory'] = (k) => {
  [523, 659, 784, 1047].forEach((f, i) => {
    k.tone({ t: i * 0.13, dur: 0.5, w: 'sine', f, g: 0.12, a: 0.005, r: 0.45 });
    k.tone({ t: i * 0.13, dur: 0.5, w: 'sine', f: f * 2.01, g: 0.03, a: 0.005, r: 0.4 });
  });
};
S['ui.defeat'] = (k) => {
  k.tone({ t: 0, dur: 1.3, w: 'sawtooth', f: 110, f2: 55, g: 0.12, filter: { kind: 'lp', f: 600 }, a: 0.02, r: 1.0 });
  k.tone({ t: 0.1, dur: 1.1, w: 'sine', f: 220, f2: 110, g: 0.07, a: 0.02, r: 0.9 });
};
S['ui.countdown'] = (k) => k.tone({ t: 0, dur: 0.09, w: 'sine', f: 1000, g: 0.16, a: 0.003 });

/* ---- Voices ---- */
const VOICE_SPECS = {
  'vo.hostile.contact': { base: 108, breath: 0.05, syll: [
    { v: 'o', d: 0.11, p: 1.28, g: 1 }, { v: 'a', d: 0.13, p: 1.12, gap: 0.12 },
    { v: 'o', d: 0.11, p: 1.32 }, { v: 'a', d: 0.15, p: 0.98 }] },
  'vo.hostile.searching': { base: 102, breath: 0.06, syll: [
    { v: 'e', d: 0.16, p: 1.02, g: 0.7 }, { v: 'a', d: 0.13, p: 0.96, g: 0.65 }, { v: 'u', d: 0.2, p: 0.85, g: 0.55 }] },
  'vo.hostile.reloading': { base: 110, breath: 0.05, syll: [
    { v: 'e', d: 0.09, p: 1.12 }, { v: 'o', d: 0.13, p: 1.22 }, { v: 'i', d: 0.11, p: 1.02 }, { v: 'e', d: 0.1, p: 0.92, g: 0.8 }] },
  'vo.hostile.flank': { base: 106, breath: 0.05, syll: [
    { v: 'o', d: 0.11, p: 1.2 }, { v: 'a', d: 0.1, p: 1.12 }, { v: 'u', d: 0.15, p: 1.3 }, { v: 'a', d: 0.12, p: 1.05 }] },
  'vo.hostile.lostyou': { base: 100, breath: 0.06, syll: [
    { v: 'o', d: 0.14, p: 1.04, g: 0.75 }, { v: 'i', d: 0.12, p: 0.88, g: 0.6 }] },
  'vo.hostile.hit': { base: 112, breath: 0.08, vib: { f: 6.5, depth: 0.035 }, syll: [
    { v: 'a', d: 0.2, p: 1.38, g: 1.1 }, { v: 'i', d: 0.12, p: 1.05, g: 0.8 }] },
  'vo.hostile.death': { base: 104, breath: 0.12, vib: { f: 4.2, depth: 0.04 }, syll: [
    { v: 'a', d: 0.18, p: 1.24, g: 1 }, { v: 'a', d: 0.34, p: 0.82, g: 0.7 }, { v: 'u', d: 0.28, p: 0.6, g: 0.4 }] },
  'vo.hostage.fear': { base: 196, breath: 0.09, vib: { f: 6.8, depth: 0.045 }, syll: [
    { v: 'i', d: 0.16, p: 1.28 }, { v: 'o', d: 0.11, p: 1.18 }, { v: 'u', d: 0.19, p: 1.4, g: 1.05 }] },
  'vo.hostage.relief': { base: 188, breath: 0.07, syll: [
    { v: 'o', d: 0.18, p: 1.1 }, { v: 'a', d: 0.12, p: 1.22 }, { v: 'o', d: 0.2, p: 0.92, g: 0.8 }] },
  'vo.hostage.follow': { base: 190, breath: 0.06, syll: [
    { v: 'o', d: 0.1, p: 1.1 }, { v: 'e', d: 0.12, p: 1.2 }, { v: 'a', d: 0.1, p: 1.02 }, { v: 'u', d: 0.14, p: 0.9, g: 0.8 }] },
  'vo.hostage.hurry': { base: 198, breath: 0.08, vib: { f: 6.4, depth: 0.04 }, syll: [
    { v: 'u', d: 0.09, p: 1.3 }, { v: 'i', d: 0.09, p: 1.36 }, { v: 'e', d: 0.11, p: 1.18 }, { v: 'o', d: 0.12, p: 1.06 }, { v: 'i', d: 0.1, p: 0.95 }] },
  'vo.hostage.thanks': { base: 186, breath: 0.07, syll: [
    { v: 'a', d: 0.12, p: 1.2 }, { v: 'u', d: 0.12, p: 1.0, gap: 0.14 }, { v: 'a', d: 0.12, p: 1.14 }, { v: 'u', d: 0.16, p: 0.88, g: 0.75 }] },
};
for (const [id, spec] of Object.entries(VOICE_SPECS)) {
  S[id] = (k, opts) => k.voice(spec, opts);
}

/* ------------------------------------------------------------------ */
/* Ambience loops                                                      */
/* ------------------------------------------------------------------ */

function loopedNoise(ctx, out, { type = 'pink', kind = 'lp', f = 400, q = 0.8, g = 0.2, lfoF = 0, lfoDepth = 0, lfoTarget = 'freq' }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, type);
  src.loop = true;
  const fl = ctx.createBiquadFilter();
  fl.type = kind === 'bp' ? 'bandpass' : kind === 'hp' ? 'highpass' : 'lowpass';
  fl.frequency.value = f;
  fl.Q.value = q;
  const gn = ctx.createGain();
  gn.gain.value = g;
  src.connect(fl);
  fl.connect(gn);
  gn.connect(out);
  let lfo = null;
  let lg = null;
  if (lfoF > 0) {
    lfo = ctx.createOscillator();
    lfo.frequency.value = lfoF;
    lg = ctx.createGain();
    lg.gain.value = lfoDepth;
    lfo.connect(lg);
    lg.connect(lfoTarget === 'gain' ? gn.gain : fl.frequency);
    lfo.start();
  }
  src.start(0, Math.random());
  return { src, fl, gn, stopAll: () => { try { src.stop(); lfo?.stop(); } catch { /* already stopped */ } } };
}

function loopedTone(ctx, out, { w = 'triangle', f = 120, g = 0.05, lp = 0 }) {
  const osc = ctx.createOscillator();
  osc.type = w;
  osc.frequency.value = f;
  const gn = ctx.createGain();
  gn.gain.value = g;
  if (lp) {
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = lp;
    osc.connect(fl);
    fl.connect(gn);
  } else {
    osc.connect(gn);
  }
  gn.connect(out);
  osc.start();
  return { osc, gn, stopAll: () => { try { osc.stop(); } catch { /* already stopped */ } } };
}

function loopHandle(parts) {
  return {
    stop() { for (const p of parts) p.stopAll(); },
    setRate(r) {
      for (const p of parts) {
        if (p.src) p.src.playbackRate.value = r;
        if (p.osc) p.osc.frequency.value *= r;
      }
    },
  };
}

export const LOOPS = {
  'amb.hvac': (ctx, out) =>
    loopHandle([
      loopedNoise(ctx, out, { type: 'pink', kind: 'lp', f: 210, g: 0.5, lfoF: 0.13, lfoDepth: 45 }),
      loopedTone(ctx, out, { w: 'triangle', f: 58, g: 0.04, lp: 240 }),
    ]),
  'amb.fluorescent': (ctx, out) =>
    loopHandle([
      loopedTone(ctx, out, { w: 'triangle', f: 120, g: 0.028, lp: 900 }),
      loopedTone(ctx, out, { w: 'sine', f: 240, g: 0.012 }),
      loopedNoise(ctx, out, { type: 'white', kind: 'hp', f: 7000, g: 0.008 }),
    ]),
  'amb.server': (ctx, out) =>
    loopHandle([
      loopedNoise(ctx, out, { type: 'pink', kind: 'bp', f: 850, q: 0.5, g: 0.3 }),
      loopedTone(ctx, out, { w: 'sawtooth', f: 168, g: 0.012, lp: 800 }),
      loopedTone(ctx, out, { w: 'sawtooth', f: 233, g: 0.009, lp: 900 }),
    ]),
  'amb.wind': (ctx, out) =>
    loopHandle([
      loopedNoise(ctx, out, { type: 'pink', kind: 'lp', f: 520, g: 0.34, lfoF: 0.11, lfoDepth: 260 }),
      loopedNoise(ctx, out, { type: 'pink', kind: 'bp', f: 1500, q: 1.6, g: 0.05, lfoF: 0.21, lfoDepth: 500 }),
    ]),
  'amb.storm': (ctx, out) =>
    loopHandle([
      loopedNoise(ctx, out, { type: 'pink', kind: 'lp', f: 640, g: 0.42, lfoF: 0.3, lfoDepth: 320 }),
      loopedNoise(ctx, out, { type: 'pink', kind: 'lp', f: 95, g: 0.4, lfoF: 0.07, lfoDepth: 24 }),
      loopedNoise(ctx, out, { type: 'white', kind: 'hp', f: 5200, g: 0.02, lfoF: 0.4, lfoDepth: 0.012, lfoTarget: 'gain' }),
    ]),
  'amb.snow': (ctx, out) =>
    loopHandle([
      loopedNoise(ctx, out, { type: 'white', kind: 'hp', f: 8000, g: 0.008 }),
      loopedNoise(ctx, out, { type: 'pink', kind: 'lp', f: 380, g: 0.1, lfoF: 0.09, lfoDepth: 90 }),
    ]),
  'amb.tinnitus': (ctx, out) =>
    loopHandle([
      loopedTone(ctx, out, { w: 'sine', f: 3900, g: 0.1 }),
      loopedNoise(ctx, out, { type: 'white', kind: 'hp', f: 9000, g: 0.006 }),
    ]),
};

/* ------------------------------------------------------------------ */
/* Generative music                                                    */
/* ------------------------------------------------------------------ */

// A aeolian for the mission, C major for the wins.
const PAD = (k, roots, dur, g = 0.1, lp = 1400) => {
  for (const m of roots) {
    k.tone({ t: 0, dur, w: 'sawtooth', f: N(m), g: g * 0.5, a: dur * 0.3, r: dur * 0.45, filter: { kind: 'lp', f: lp }, detune: -6 });
    k.tone({ t: 0, dur, w: 'sawtooth', f: N(m), g: g * 0.5, a: dur * 0.3, r: dur * 0.45, filter: { kind: 'lp', f: lp }, detune: 6 });
  }
};
const BELL = (k, m, g = 0.07, dur = 1.1) => {
  k.tone({ t: 0, dur, w: 'sine', f: N(m), g, a: 0.004, r: dur * 0.9 });
  k.tone({ t: 0, dur: dur * 0.6, w: 'sine', f: N(m) * 2.01, g: g * 0.3, a: 0.004, r: dur * 0.5 });
};
const KICK = (k, g = 0.4) => k.thump({ t: 0, f: 130, f2: 42, dur: 0.09, g });
const HAT = (k, g = 0.05) => k.noise({ t: 0, dur: 0.03, g, kind: 'hp', f: 8000, a: 0.001 });
const BASS = (k, m, dur = 0.12, g = 0.18) =>
  k.tone({ t: 0, dur, w: 'sawtooth', f: N(m), g, a: 0.004, filter: { kind: 'lp', f: 620 } });

const MENU_CHORDS = [[45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 55]]; // Am F G Em
const PENTA = [69, 72, 74, 76, 79];

export const MUSIC = {
  menu: {
    bpm: 68, div: 2, // 8th-note steps
    schedule(k, step) {
      const bar = (step >> 3) % 4;
      if (step % 8 === 0) PAD(k, MENU_CHORDS[bar], 3.6, 0.09, 1100);
      if (step % 2 === 1 && Math.random() < 0.2) BELL(k, PENTA[(Math.random() * PENTA.length) | 0], 0.045, 1.6);
    },
  },
  briefing: {
    bpm: 88, div: 2,
    schedule(k, step) {
      const bar = (step >> 3) % 4;
      const root = [45, 45, 41, 43][bar];
      if (step % 8 === 0) PAD(k, [root, root + 7, root + 12], 3.0, 0.07, 900);
      if (step % 2 === 0) BASS(k, root - 12, 0.14, 0.14);
      if (step % 2 === 1) HAT(k, 0.03);
      if (step % 16 === 12) k.thump({ t: 0, f: 90, f2: 40, dur: 0.12, g: 0.2 });
    },
  },
  tension: {
    bpm: 60, div: 2,
    schedule(k, step) {
      if (step % 16 === 0) {
        PAD(k, [33, 40], 7.5, 0.09, 460);
        k.tone({ t: 0, dur: 7.5, w: 'sine', f: N(21), g: 0.1, a: 2, r: 3 });
      }
      if (step % 8 === 0) KICK(k, 0.22);
      if (step % 8 === 1) KICK(k, 0.13); // heartbeat pair
      if (Math.random() < 0.045) BELL(k, 81 + ((Math.random() * 3) | 0), 0.03, 2.2);
      if (step % 32 === 24) k.noise({ t: 0, dur: 3.2, g: 0.03, kind: 'bp', f: 2600, q: 3, a: 1.6, r: 1.4 });
    },
  },
  combat: {
    bpm: 128, div: 4, // 16th-note steps
    schedule(k, step) {
      const s16 = step % 16;
      const bar = (step >> 4) % 4;
      if (s16 % 4 === 0) KICK(k, 0.42);
      if (s16 % 2 === 0) HAT(k, 0.035);
      if (s16 === 4 || s16 === 12) k.noise({ t: 0, dur: 0.1, g: 0.12, kind: 'bp', f: 1700, q: 1 }); // snare-ish
      const riff = [33, 33, 36, 33, 38, 33, 36, 40][((step >> 1) % 8)];
      if (s16 % 2 === 0) BASS(k, riff, 0.1, 0.2);
      if (s16 === 0 && bar % 2 === 0) PAD(k, [45, 48, 52], 0.7, 0.08, 1800);
    },
  },
  victory: {
    bpm: 100, div: 2,
    schedule(k, step) {
      const bar = (step >> 3) % 2;
      if (step % 8 === 0) PAD(k, bar === 0 ? [48, 55, 60, 64] : [45, 53, 60, 65], 3.4, 0.09, 1600);
      const arp = [72, 76, 79, 84, 79, 76][step % 6];
      if (step % 1 === 0 && Math.random() < 0.8) BELL(k, arp, 0.05, 0.8);
      if (step % 2 === 1) k.noise({ t: 0, dur: 0.05, g: 0.02, kind: 'hp', f: 6500 });
    },
  },
  defeat: {
    bpm: 56, div: 1, // quarter-note steps
    schedule(k, step) {
      const line = [45, 43, 41, 40][step % 4];
      BASS(k, line - 12, 2.2, 0.11);
      k.tone({ t: 0, dur: 2.4, w: 'sawtooth', f: N(line), g: 0.05, a: 0.5, r: 1.6, filter: { kind: 'lp', f: 420 } });
      if (step % 4 === 0) k.tone({ t: 0, dur: 4, w: 'sine', f: N(21), g: 0.11, a: 1, r: 2.6 });
      if (step % 8 === 6) k.noise({ t: 0, dur: 2.4, g: 0.025, kind: 'bp', f: 900, q: 2, a: 1.2, r: 1.1 });
    },
  },
};

export const SOUND_IDS = Object.keys(SOUNDS);
export const LOOP_IDS = Object.keys(LOOPS);
export const MUSIC_TRACKS = Object.keys(MUSIC);
