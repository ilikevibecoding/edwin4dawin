// ---------------------------------------------------------------------------
// Sound. All synthesised — there are no audio files, the same way there are no
// textures — through the Web Audio API: an engine that follows throttle and
// revs, tyre noise that follows speed and the surface under the wheels, wind,
// and a savanna ambience bed with birds and distant animals. Browsers refuse to
// start audio before a user gesture, so `createAudio` builds nothing until the
// first click or key.
//
// Contract:
//   createAudio() -> {
//     update(dt, { speed, throttle, rpm, surface, timeOfDay, camera, vehiclePos }),
//     setEnabled(bool), enabled,
//     cue(name, opts),             // one-shots: door, indicator, horn, lion
//     inspect(),                   // node parameters, for tools/audiocheck.mjs
//   }
//
// Graph:
//   engine ─ 4 oscillators + AM'd combustion noise + turbo sine
//          → engineFilter (lowpass, opens with revs and load) → engineBus ─┐
//   tyres  ─ noise → tyreFilter (bandpass, surface) → tyreGain ──────────┐│
//          ─ noise → rumble lowpass → rumbleGain ─────────────────────────┤│
//          ─ 2 stone voices, noise → bandpass → gated gain ──────────────┤│
//   wind   ─ noise → windFilter (lowpass, gusting LFO) → windGain ────────┤│
//   bed    ─ noise floor, 2 cricket voices, a call oscillator, a lion ────┤│
//   cues   ─ perc voice (door), horn pair ────────────────────────────────┤│
//                                                    extFilter → extBus ─┴┴→ compressor → master → out
//
// Everything exterior goes through `extFilter`, a lowpass the interior cameras
// close down to cabin frequencies while `engineBus` comes up; from outside the
// filter is wide open and the engine falls off with distance instead.
//
// Cost: one looping noise buffer fanned out to every noise chain, seventeen
// oscillators, ~25 filters and gains. Parameters are moved with setTargetAtTime
// on a 20 ms tick rather than set per frame, and `update` allocates nothing.
// ---------------------------------------------------------------------------

const TICK = 0.02;
const MAX_SPEED = 21;

const SURFACES = {
  // dirt two-track: fine grit hiss, a lot of rumble, frequent small stones
  trail: { freq: 2400, q: 0.9, level: 1.0, rumble: 1.0, stoneRate: 0.24, stoneLo: 1800, stoneHi: 4800 },
  // graded gravel: a broader, lower crunch, fewer but bigger stones
  main: { freq: 850, q: 0.45, level: 1.15, rumble: 0.7, stoneRate: 0.42, stoneLo: 900, stoneHi: 2600 },
};

const BED = {
  day: { floor: 0.05, cricket: 0.0, bird: [3, 9], hornbill: [18, 40], night: 0 },
  dusk: { floor: 0.04, cricket: 0.045, bird: [6, 14], hornbill: [30, 60], night: 0 },
  night: { floor: 0.03, cricket: 0.065, bird: [12, 30], hornbill: [0, 0], night: 1 },
};

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const rnd = (lo, hi) => lo + Math.random() * (hi - lo);

export function createAudio() {
  let enabled = false;
  let ctx = null;
  let g = null; // the graph, once built
  let acc = 0;
  let inspector = null;

  // scheduler timers, in seconds of update time, and how often each has fired
  const timers = { stone: 0.3, bird: 4, hornbill: 25, lion: 30 };
  const fired = { stone: 0, bird: 0, hornbill: 0, lion: 0 };

  // Since setTargetAtTime approaches asymptotically, the values written are the
  // targets; the checker reads the params themselves.
  function target(param, value, tc) {
    param.setTargetAtTime(value, ctx.currentTime, tc);
  }

  function noiseBuffer(seconds) {
    const n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function osc(type, freq, dest) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    if (dest) o.connect(dest);
    o.start();
    return o;
  }
  function gain(v, dest) {
    const n = ctx.createGain();
    n.gain.value = v;
    if (dest) n.connect(dest);
    return n;
  }
  function filter(type, freq, q, dest) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    if (dest) f.connect(dest);
    return f;
  }

  function build() {
    const t0 = ctx.currentTime;

    // --- master ---------------------------------------------------------------
    const master = gain(0.8, ctx.destination);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.knee.value = 10;
    comp.ratio.value = 8;
    comp.attack.value = 0.004;
    comp.release.value = 0.22;
    comp.connect(master);

    const engineBus = gain(0.7, comp);
    const extBus = gain(1, comp);
    const extFilter = filter('lowpass', 18000, 0.5, extBus);

    // one noise source for everything; each chain filters its own band out of it
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer(2.5);
    noiseSrc.loop = true;
    noiseSrc.start();
    const noise = gain(1, null);
    noiseSrc.connect(noise);

    // --- engine ---------------------------------------------------------------
    // A four-pot diesel: the firing order at f0, its half-order sub from the
    // crank, the second and third harmonics, and combustion noise gated at f0
    // so the idle chugs rather than hums.
    const engineGain = gain(0.4, engineBus);
    const engineFilter = filter('lowpass', 900, 1.1, engineGain);
    const fund = gain(0.22, engineFilter);
    const sub = gain(0.16, engineFilter);
    const harm2 = gain(0.1, engineFilter);
    const harm3 = gain(0.05, engineFilter);
    const oFund = osc('sawtooth', 24, fund);
    const oSub = osc('square', 12, sub);
    const oHarm2 = osc('sawtooth', 48, harm2);
    oHarm2.detune.value = 7;
    const oHarm3 = osc('triangle', 72, harm3);

    const combGain = gain(0.08, engineFilter);
    const combAM = gain(0.5, combGain);
    const combFilter = filter('bandpass', 500, 0.8, combAM);
    noise.connect(combFilter);
    const oGate = osc('square', 24, null);
    const gateDepth = gain(0.5, combAM.gain);
    oGate.connect(gateDepth);

    // idle lump: a slow wobble on the fundamental that fades out as revs rise
    const oLump = osc('sine', 6.5, null);
    const lumpDepth = gain(28, null);
    oLump.connect(lumpDepth);
    lumpDepth.connect(oFund.detune);
    lumpDepth.connect(oSub.detune);
    lumpDepth.connect(oGate.detune);

    const turboGain = gain(0, engineBus);
    const oTurbo = osc('sine', 700, turboGain);
    const turboHiss = filter('bandpass', 2400, 4, turboGain);
    noise.connect(turboHiss);

    // --- tyres ----------------------------------------------------------------
    const tyreGain = gain(0, extFilter);
    const tyreFilter = filter('bandpass', SURFACES.trail.freq, SURFACES.trail.q, tyreGain);
    noise.connect(tyreFilter);
    const rumbleGain = gain(0, extFilter);
    const rumbleFilter = filter('lowpass', 140, 0.7, rumbleGain);
    noise.connect(rumbleFilter);

    const stones = [0, 1].map(() => {
      const gn = gain(0, extFilter);
      const f = filter('bandpass', 3000, 6, gn);
      noise.connect(f);
      return { gain: gn, filter: f };
    });

    // --- wind -----------------------------------------------------------------
    const windGain = gain(0, extFilter);
    const windFilter = filter('lowpass', 300, 0.6, windGain);
    noise.connect(windFilter);
    const oGust = osc('sine', 0.31, null);
    const gustDepth = gain(140, windFilter.frequency);
    oGust.connect(gustDepth);

    // --- ambience bed ---------------------------------------------------------
    const floorGain = gain(BED.day.floor, extFilter);
    const floorFilter = filter('lowpass', 480, 0.5, floorGain);
    noise.connect(floorFilter);
    const oBreath = osc('sine', 0.17, null);
    const breathDepth = gain(0.012, floorGain.gain);
    oBreath.connect(breathDepth);

    const crickets = [
      { freq: 4300, rate: 23 },
      { freq: 5150, rate: 31 },
    ].map(({ freq, rate }) => {
      const gn = gain(0, extFilter);
      const am = gain(0.5, gn);
      const f = filter('bandpass', freq, 18, am);
      noise.connect(f);
      const o = osc('sine', rate, null);
      const d = gain(0.5, am.gain);
      o.connect(d);
      return { gain: gn, osc: o };
    });

    // one melodic voice shared by every bird; calls are scheduled onto it
    const callGain = gain(0, extFilter);
    const oCall = osc('sine', 2800, callGain);

    // lion: two detuned saws plus breath noise through a low filter; the same
    // voice does the distant roar and the close cue at different settings
    const lionGain = gain(0, extFilter);
    const lionAM = gain(1, lionGain);
    const lionFilter = filter('lowpass', 160, 1.2, lionAM);
    const oLion = osc('sawtooth', 55, lionFilter);
    const oLion2 = osc('sawtooth', 57.5, lionFilter);
    const lionBreath = gain(0.5, lionFilter);
    const lionBreathFilter = filter('bandpass', 220, 1.5, lionBreath);
    noise.connect(lionBreathFilter);
    const oGrowl = osc('sine', 28, null);
    const growlDepth = gain(0, lionAM.gain);
    oGrowl.connect(growlDepth);

    // --- cues -----------------------------------------------------------------
    const percGain = gain(0, extFilter);
    const percFilter = filter('lowpass', 300, 1, percGain);
    noise.connect(percFilter);

    const hornGain = gain(0, extFilter);
    const hornFilter = filter('bandpass', 700, 1.4, hornGain);
    const oHornA = osc('sawtooth', 370, hornFilter);
    const oHornB = osc('sawtooth', 440, hornFilter);

    g = {
      master, comp, engineBus, extBus, extFilter, noiseSrc,
      engineGain, engineFilter, fund, sub, harm2, harm3, oFund, oSub, oHarm2, oHarm3,
      combGain, combFilter, oGate, oLump, lumpDepth, turboGain, oTurbo, turboHiss,
      tyreGain, tyreFilter, rumbleGain, stones,
      windGain, windFilter,
      floorGain, crickets, callGain, oCall,
      lionGain, lionFilter, oLion, oLion2, oGrowl, growlDepth,
      percGain, percFilter, hornGain, oHornA, oHornB,
      stoneIx: 0,
      interior: false,
      surface: 'trail',
      time: 'day',
      built: t0,
    };
  }

  // --- one-shots ----------------------------------------------------------------
  // Envelopes are scheduled onto persistent voices, so nothing is allocated
  // when a stone hits or a bird calls.

  function stone(speedN, s) {
    const v = g.stones[g.stoneIx];
    g.stoneIx ^= 1;
    const t = ctx.currentTime;
    const peak = rnd(0.12, 0.42) * (0.3 + 0.7 * speedN);
    v.filter.frequency.cancelScheduledValues(t);
    v.filter.frequency.setValueAtTime(rnd(s.stoneLo, s.stoneHi), t);
    v.gain.gain.cancelScheduledValues(t);
    v.gain.gain.setValueAtTime(0, t);
    v.gain.gain.linearRampToValueAtTime(peak, t + 0.003);
    v.gain.gain.setTargetAtTime(0, t + 0.003, rnd(0.008, 0.02));
  }

  function chirp(t, f0, f1, dur, level) {
    const o = g.oCall.frequency;
    const gn = g.callGain.gain;
    o.setValueAtTime(f0, t);
    o.exponentialRampToValueAtTime(f1, t + dur);
    gn.setValueAtTime(0, t);
    gn.linearRampToValueAtTime(level, t + dur * 0.25);
    gn.setTargetAtTime(0, t + dur * 0.7, dur * 0.18);
  }

  function bird(night) {
    let t = ctx.currentTime + 0.05;
    g.oCall.frequency.cancelScheduledValues(t);
    g.callGain.gain.cancelScheduledValues(t);
    if (night) {
      // a nightjar: two long, level, low whistles
      for (let i = 0; i < 2; i++) {
        chirp(t, 1350, 1290, 0.42, 0.028);
        t += 0.7;
      }
      return;
    }
    const n = 2 + Math.floor(Math.random() * 3);
    const base = rnd(2200, 3400);
    const lvl = rnd(0.03, 0.06);
    for (let i = 0; i < n; i++) {
      const up = Math.random() < 0.6;
      chirp(t, base * (up ? 1 : 1.35), base * (up ? 1.4 : 1.0), rnd(0.06, 0.13), lvl);
      t += rnd(0.12, 0.24);
    }
  }

  function hornbill() {
    let t = ctx.currentTime + 0.05;
    g.oCall.frequency.cancelScheduledValues(t);
    g.callGain.gain.cancelScheduledValues(t);
    const n = 4 + Math.floor(Math.random() * 3);
    const f = rnd(560, 680);
    for (let i = 0; i < n; i++) {
      chirp(t, f * 1.08, f, 0.09, 0.045);
      t += 0.19;
    }
  }

  function roar({ close = false } = {}) {
    const t = ctx.currentTime + 0.02;
    const lvl = close ? 0.3 : rnd(0.05, 0.09);
    const dur = close ? 2.2 : rnd(1.6, 2.8);
    const f0 = close ? 78 : 58;
    const f1 = close ? 46 : 40;
    for (const [p, k] of [
      [g.oLion.frequency, 1],
      [g.oLion2.frequency, 1.045],
    ]) {
      p.cancelScheduledValues(t);
      p.setValueAtTime(f0 * k, t);
      p.exponentialRampToValueAtTime(f1 * k, t + dur);
    }
    g.lionFilter.frequency.cancelScheduledValues(t);
    g.lionFilter.frequency.setValueAtTime(close ? 420 : 140, t);
    g.lionFilter.frequency.linearRampToValueAtTime(close ? 760 : 190, t + dur * 0.35);
    g.lionFilter.frequency.setTargetAtTime(close ? 260 : 110, t + dur * 0.5, dur * 0.4);
    g.growlDepth.gain.cancelScheduledValues(t);
    g.growlDepth.gain.setValueAtTime(close ? 0.55 : 0.35, t);
    g.growlDepth.gain.setTargetAtTime(0, t + dur * 0.6, dur * 0.3);
    const gn = g.lionGain.gain;
    gn.cancelScheduledValues(t);
    gn.setValueAtTime(0, t);
    gn.linearRampToValueAtTime(lvl, t + dur * 0.28);
    gn.setValueAtTime(lvl, t + dur * 0.55);
    // the long tail is the thing that says "far across the grass"
    gn.setTargetAtTime(0, t + dur * 0.55, close ? 0.55 : 1.3);
  }

  function door({ open = false } = {}) {
    const t = ctx.currentTime;
    const gn = g.percGain.gain;
    const f = g.percFilter.frequency;
    gn.cancelScheduledValues(t);
    f.cancelScheduledValues(t);
    if (open) {
      // latch click then the seal letting go
      f.setValueAtTime(2200, t);
      gn.setValueAtTime(0, t);
      gn.linearRampToValueAtTime(0.35, t + 0.004);
      gn.setTargetAtTime(0, t + 0.004, 0.012);
      f.setValueAtTime(600, t + 0.06);
      gn.setValueAtTime(0.12, t + 0.06);
      gn.setTargetAtTime(0, t + 0.06, 0.05);
      return;
    }
    // a slam: low thump, a panel ring, the latch
    f.setValueAtTime(240, t);
    f.exponentialRampToValueAtTime(90, t + 0.12);
    gn.setValueAtTime(0, t);
    gn.linearRampToValueAtTime(0.9, t + 0.006);
    gn.setTargetAtTime(0, t + 0.006, 0.045);
    f.setValueAtTime(1800, t + 0.05);
    gn.setValueAtTime(0.3, t + 0.05);
    gn.setTargetAtTime(0, t + 0.05, 0.02);
    f.setValueAtTime(420, t + 0.09);
    gn.setValueAtTime(0.12, t + 0.09);
    gn.setTargetAtTime(0, t + 0.09, 0.06);
  }

  function indicator({ tock = false } = {}) {
    const t = ctx.currentTime;
    const v = g.stones[g.stoneIx];
    g.stoneIx ^= 1;
    v.filter.frequency.cancelScheduledValues(t);
    v.filter.frequency.setValueAtTime(tock ? 1350 : 1900, t);
    v.gain.gain.cancelScheduledValues(t);
    v.gain.gain.setValueAtTime(0, t);
    v.gain.gain.linearRampToValueAtTime(0.28, t + 0.002);
    v.gain.gain.setTargetAtTime(0, t + 0.002, 0.006);
  }

  function horn({ duration = 0.45 } = {}) {
    const t = ctx.currentTime;
    const gn = g.hornGain.gain;
    gn.cancelScheduledValues(t);
    gn.setValueAtTime(0, t);
    gn.linearRampToValueAtTime(0.32, t + 0.03);
    gn.setValueAtTime(0.32, t + duration);
    gn.setTargetAtTime(0, t + duration, 0.04);
  }

  // --- per-tick parameter tracking --------------------------------------------

  function track(dt, s) {
    const rpm = clamp01(Math.min(s.rpm ?? 0, 1.05) / 1.05);
    const thr = clamp01(s.throttle ?? 0);
    const speedN = clamp01(Math.abs(s.speed ?? 0) / MAX_SPEED);
    const surf = SURFACES[s.surface] || SURFACES.trail;
    const bed = BED[s.timeOfDay] || BED.day;

    // listener: inside the cab, or how far out
    let interior = false;
    let dist = 6;
    const cam = s.camera?.position;
    const vp = s.vehiclePos;
    if (cam && vp) {
      const dx = cam.x - vp.x;
      const dy = cam.y - vp.y;
      const dz = cam.z - vp.z;
      const dh = Math.sqrt(dx * dx + dz * dz);
      interior = dh < 1.7 && dy > 0.6 && dy < 2.3;
      dist = Math.sqrt(dh * dh + dy * dy);
    }
    g.interior = interior;
    const falloff = interior ? 1 : clamp01(7 / Math.max(dist, 4));

    // engine
    const f0 = 24 + 110 * rpm;
    target(g.oFund.frequency, f0, 0.035);
    target(g.oSub.frequency, f0 * 0.5, 0.035);
    target(g.oHarm2.frequency, f0 * 2, 0.035);
    target(g.oHarm3.frequency, f0 * 3, 0.035);
    target(g.oGate.frequency, f0, 0.035);
    target(g.combFilter.frequency, 380 + 1900 * rpm, 0.06);
    target(g.combGain.gain, 0.05 + 0.14 * thr + 0.05 * rpm, 0.06);
    target(g.harm3.gain, 0.03 + 0.07 * thr, 0.08);
    target(g.lumpDepth.gain, 30 * (1 - rpm) * (1 - thr * 0.6), 0.1);
    target(g.oLump.frequency, 6.5 + 18 * rpm, 0.1);
    target(g.engineFilter.frequency, 520 + 2600 * rpm + 1600 * thr, 0.06);
    target(g.engineGain.gain, 0.26 + 0.18 * thr + 0.14 * rpm, 0.06);
    const boost = clamp01(thr * (0.3 + rpm) * 1.6);
    target(g.oTurbo.frequency, 700 + 2600 * rpm, 0.08);
    target(g.turboHiss.frequency, 1800 + 3200 * rpm, 0.08);
    target(g.turboGain.gain, 0.03 * boost, 0.12);
    target(g.engineBus.gain, interior ? 1.0 : 0.72 * falloff, 0.08);

    // tyres
    if (g.surface !== s.surface) {
      g.surface = s.surface;
      target(g.tyreFilter.frequency, surf.freq, 0.12);
      target(g.tyreFilter.Q, surf.q, 0.12);
    }
    target(g.tyreGain.gain, 0.4 * Math.pow(speedN, 0.8) * surf.level * falloff, 0.06);
    target(g.rumbleGain.gain, 0.3 * speedN * surf.rumble * (interior ? 1.15 : falloff), 0.06);

    // wind: on the body outside, a draught through the seals inside
    target(g.windFilter.frequency, 280 + 1500 * speedN * speedN, 0.1);
    target(g.windGain.gain, 0.36 * speedN * speedN * (interior ? 0.2 : 1), 0.1);

    // listener filter and the bed
    target(g.extFilter.frequency, interior ? 820 : 18000, 0.08);
    if (g.time !== s.timeOfDay) {
      g.time = s.timeOfDay;
      target(g.floorGain.gain, bed.floor, 0.6);
      for (const c of g.crickets) target(c.gain.gain, bed.cricket, 0.8);
    }

    // scheduler
    if (speedN > 0.06) {
      timers.stone -= dt;
      if (timers.stone <= 0) {
        stone(speedN, surf);
        fired.stone++;
        timers.stone = (surf.stoneRate / (0.15 + speedN)) * rnd(0.4, 1.6);
      }
    }
    timers.bird -= dt;
    if (timers.bird <= 0) {
      bird(bed.night);
      fired.bird++;
      timers.bird = rnd(bed.bird[0], bed.bird[1]);
    }
    if (bed.hornbill[1] > 0) {
      timers.hornbill -= dt;
      if (timers.hornbill <= 0) {
        hornbill();
        fired.hornbill++;
        timers.hornbill = rnd(bed.hornbill[0], bed.hornbill[1]);
      }
    }
    timers.lion -= dt;
    if (timers.lion <= 0) {
      roar();
      fired.lion++;
      timers.lion = bed.night ? rnd(35, 70) : rnd(55, 110);
    }
  }

  const cues = { door, indicator, horn, lion: (o) => roar({ close: true, ...o }) };

  return {
    get enabled() {
      return enabled;
    },
    setEnabled(on) {
      enabled = !!on;
      if (!enabled) {
        if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {});
        return;
      }
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) {
          enabled = false;
          return;
        }
        ctx = new AC({ latencyHint: 'interactive' });
        build();
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    update(dt, state) {
      if (!enabled || !g || !state) return;
      dt = dt > 0.1 ? 0.1 : dt > 0 ? dt : 0;
      acc += dt;
      if (acc < TICK) return;
      const step = acc;
      acc = 0;
      track(step, state);
    },
    cue(name, opts) {
      if (!g) return false;
      const fn = cues[name];
      if (!fn) return false;
      fn(opts || {});
      return true;
    },
    /** Live parameter values, for the check tool. Plain numbers only. */
    inspect() {
      if (!g) return { built: false, enabled, contextState: ctx?.state ?? null };
      if (!inspector) {
        inspector = ctx.createAnalyser();
        inspector.fftSize = 2048;
        g.master.connect(inspector);
        inspector.buf = new Float32Array(inspector.fftSize);
      }
      inspector.getFloatTimeDomainData(inspector.buf);
      let peak = 0;
      for (let i = 0; i < inspector.buf.length; i++) {
        const a = Math.abs(inspector.buf[i]);
        if (a > peak) peak = a;
      }
      return {
        built: true,
        enabled,
        contextState: ctx.state,
        currentTime: ctx.currentTime,
        sampleRate: ctx.sampleRate,
        interior: g.interior,
        surface: g.surface,
        time: g.time,
        outputPeak: peak,
        compressorReduction: g.comp.reduction,
        fired: { ...fired },
        engine: {
          f0: g.oFund.frequency.value,
          sub: g.oSub.frequency.value,
          filter: g.engineFilter.frequency.value,
          gain: g.engineGain.gain.value,
          bus: g.engineBus.gain.value,
          comb: g.combGain.gain.value,
          turbo: g.turboGain.gain.value,
          turboFreq: g.oTurbo.frequency.value,
          lump: g.lumpDepth.gain.value,
        },
        tyre: {
          gain: g.tyreGain.gain.value,
          filterFreq: g.tyreFilter.frequency.value,
          filterQ: g.tyreFilter.Q.value,
          rumble: g.rumbleGain.gain.value,
          stone: Math.max(g.stones[0].gain.gain.value, g.stones[1].gain.gain.value),
        },
        wind: { gain: g.windGain.gain.value, filter: g.windFilter.frequency.value },
        ext: { filter: g.extFilter.frequency.value },
        bed: {
          floor: g.floorGain.gain.value,
          cricket: g.crickets[0].gain.gain.value,
          call: g.callGain.gain.value,
          lion: g.lionGain.gain.value,
        },
        cue: { perc: g.percGain.gain.value, horn: g.hornGain.gain.value },
      };
    },
  };
}
