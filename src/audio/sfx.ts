/**
 * Sound-effect library.
 *
 * Every effect is synthesised. One-shots can be placed in the world through a
 * `PannerNode`; sustained sources (engines, alarms, the respirator) are held
 * as objects with a level you can ride.
 *
 * Levels are deliberately conservative: the loudest single event peaks around
 * −8 dBFS before the bus compressor, so a dense firefight still leaves
 * headroom for the score.
 */

import * as THREE from 'three';
import { AudioEngine } from './engine';

export interface Placed {
  /** Optional world position; omit for a non-diegetic effect. */
  at?: THREE.Vector3;
  /** Distance at which the sound is at unity gain. */
  ref?: number;
  gain?: number;
}

/** A sustained source whose level and pitch can be ridden over time. */
export class SustainedSource {
  private gainNode: GainNode | null = null;
  private extra: (level: number, t: number) => void = () => {};
  private stopFns: Array<(t: number) => void> = [];
  private ctx: AudioContext | null;
  private stopped = false;

  constructor(ctx: AudioContext | null, gainNode: GainNode | null) {
    this.ctx = ctx;
    this.gainNode = gainNode;
  }

  attachExtra(fn: (level: number, t: number) => void): void {
    this.extra = fn;
  }

  onStop(fn: (t: number) => void): void {
    this.stopFns.push(fn);
  }

  setLevel(level: number, smooth = 0.12): void {
    if (!this.ctx || !this.gainNode || this.stopped) return;
    this.gainNode.gain.setTargetAtTime(Math.max(0.0001, level), this.ctx.currentTime, smooth);
    this.extra(level, this.ctx.currentTime);
  }

  stop(fade = 0.4): void {
    if (!this.ctx || this.stopped) return;
    this.stopped = true;
    const t = this.ctx.currentTime;
    this.gainNode?.gain.setTargetAtTime(0.0001, t, fade / 3);
    for (const fn of this.stopFns) fn(t + fade);
  }

  get isStopped(): boolean {
    return this.stopped;
  }
}

export class SfxLibrary {
  private e: AudioEngine;
  private sustained = new Set<SustainedSource>();

  constructor(engine: AudioEngine) {
    this.e = engine;
  }

  private dest(p?: Placed): AudioNode | null {
    const ctx = this.e.ctx;
    if (!ctx) return null;
    if (p?.at) {
      const panner = this.e.panner(p.at.x, p.at.y, p.at.z, p.ref ?? 8);
      return panner?.input ?? null;
    }
    return this.e.bus('sfx');
  }

  /* ---------------------------------------------------------- weapons */

  /**
   * Light blaster bolt: a fast downward pitch sweep with a metallic ring.
   * `pitch` shifts the whole event so Rebel and Imperial weapons differ.
   */
  blaster(p: Placed = {}, pitch = 1): void {
    const ctx = this.e.ctx;
    const to = this.dest(p);
    if (!ctx || !to) return;
    const t = ctx.currentTime;
    const g = (p.gain ?? 1) * 0.34;

    this.e.tone({
      type: 'square', freq: 2100 * pitch, glideTo: 210 * pitch, glideTime: 0.13,
      to, start: t, attack: 0.002, hold: 0.01, release: 0.13, gain: g * 0.5,
    });
    this.e.tone({
      type: 'sawtooth', freq: 1400 * pitch, glideTo: 130 * pitch, glideTime: 0.16,
      to, start: t, attack: 0.001, hold: 0.008, release: 0.16, gain: g * 0.3,
    });
    this.e.noiseBurst({
      to, start: t, duration: 0.06, gain: g * 0.35, type: 'bandpass',
      freq: 3400 * pitch, freqTo: 900 * pitch, q: 2,
    });
  }

  /** Capital-ship turbolaser: same gesture, an octave down and much longer. */
  turbolaser(p: Placed = {}): void {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? 120 });
    if (!ctx || !to) return;
    const t = ctx.currentTime;
    const g = (p.gain ?? 1) * 0.42;
    this.e.tone({
      type: 'sawtooth', freq: 620, glideTo: 48, glideTime: 0.5,
      to, start: t, attack: 0.004, hold: 0.05, release: 0.5, gain: g * 0.5,
    });
    this.e.tone({
      type: 'square', freq: 310, glideTo: 36, glideTime: 0.6,
      to, start: t, attack: 0.003, hold: 0.04, release: 0.6, gain: g * 0.32,
    });
    this.e.noiseBurst({
      to, start: t, duration: 0.35, gain: g * 0.3, type: 'lowpass',
      freq: 2200, freqTo: 200, kind: 'brown',
    });
  }

  /* ---------------------------------------------------------- impacts */

  /** Hull impact. `size` 0..1 scales weight and decay. */
  impact(p: Placed = {}, size = 0.5): void {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? (12 + size * 90) });
    if (!ctx || !to) return;
    const t = ctx.currentTime;
    const g = (p.gain ?? 1) * (0.22 + size * 0.4);
    this.e.noiseBurst({
      to, start: t, duration: 0.18 + size * 0.7, gain: g,
      type: 'lowpass', freq: 900 + size * 500, freqTo: 70, kind: 'brown',
    });
    this.e.tone({
      type: 'sine', freq: 120 - size * 60, glideTo: 34, glideTime: 0.35,
      to, start: t, attack: 0.004, hold: 0.03, release: 0.4 + size * 0.6, gain: g * 0.8,
    });
    this.e.noiseBurst({
      to, start: t, duration: 0.1, gain: g * 0.3, type: 'highpass', freq: 2600,
    });
  }

  /** Deflector shield absorbing a hit: a ring-modulated energy wash. */
  shieldHit(p: Placed = {}, strength = 1): void {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? 60 });
    if (!ctx || !to) return;
    const t = ctx.currentTime;
    const g = (p.gain ?? 1) * 0.24 * strength;

    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(680, t);
    carrier.frequency.exponentialRampToValueAtTime(190, t + 0.55);
    const modulator = ctx.createOscillator();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(83, t);
    modulator.frequency.exponentialRampToValueAtTime(27, t + 0.55);
    const modGain = ctx.createGain();
    modGain.gain.value = 1;
    const ring = ctx.createGain();
    ring.gain.value = 0;
    modulator.connect(modGain);
    modGain.connect(ring.gain);
    carrier.connect(ring);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(g, t + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    ring.connect(env);
    env.connect(to);
    carrier.start(t); carrier.stop(t + 0.7);
    modulator.start(t); modulator.stop(t + 0.7);

    this.e.noiseBurst({
      to, start: t, duration: 0.28, gain: g * 0.5,
      type: 'bandpass', freq: 2600, freqTo: 700, q: 1.4,
    });
  }

  /** Small electrical spark shower. */
  sparks(p: Placed = {}, intensity = 1): void {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? 5 });
    if (!ctx || !to) return;
    const t = ctx.currentTime;
    const n = Math.round(3 + intensity * 5);
    for (let i = 0; i < n; i++) {
      this.e.noiseBurst({
        to,
        start: t + Math.random() * 0.3,
        duration: 0.02 + Math.random() * 0.05,
        gain: (p.gain ?? 1) * 0.14 * intensity * (0.4 + Math.random() * 0.8),
        type: 'bandpass',
        freq: 2600 + Math.random() * 5200,
        q: 3.5,
      });
    }
  }

  /** A door being cut open, then torn off its runners. */
  doorBreach(p: Placed = {}): void {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? 6 });
    if (!ctx || !to) return;
    const t = ctx.currentTime;
    const g = p.gain ?? 1;
    // Detonation
    this.e.noiseBurst({ to, start: t, duration: 1.5, gain: g * 0.5, type: 'lowpass', freq: 1600, freqTo: 45, kind: 'brown' });
    this.e.tone({ type: 'sine', freq: 90, glideTo: 26, glideTime: 0.9, to, start: t, attack: 0.005, hold: 0.05, release: 1.1, gain: g * 0.5 });
    // Metal shriek
    this.e.tone({ type: 'sawtooth', freq: 320, glideTo: 1400, glideTime: 0.35, to, start: t + 0.02, attack: 0.02, hold: 0.1, release: 0.5, gain: g * 0.1 });
    // Ringing debris
    for (let i = 0; i < 9; i++) {
      this.e.noiseBurst({
        to, start: t + 0.25 + Math.random() * 1.2, duration: 0.12 + Math.random() * 0.2,
        gain: g * 0.1 * (0.4 + Math.random()), type: 'bandpass',
        freq: 700 + Math.random() * 2600, q: 6,
      });
    }
  }

  /** Cutting torch loop used while the charge burns through the door. */
  cuttingTorch(p: Placed = {}): SustainedSource {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? 5 });
    if (!ctx || !to) return new SustainedSource(null, null);
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.connect(to);

    const src = ctx.createBufferSource();
    src.buffer = this.e.noise('white', 2);
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 1.6;
    const hiss = ctx.createGain();
    hiss.gain.value = 0.4;
    src.connect(bp); bp.connect(hiss); hiss.connect(g);
    src.start(0, Math.random());

    const buzz = ctx.createOscillator();
    buzz.type = 'sawtooth';
    buzz.frequency.value = 62;
    const buzzFilter = ctx.createBiquadFilter();
    buzzFilter.type = 'lowpass';
    buzzFilter.frequency.value = 700;
    const buzzGain = ctx.createGain();
    buzzGain.gain.value = 0.09;
    buzz.connect(buzzFilter); buzzFilter.connect(buzzGain); buzzGain.connect(g);
    buzz.start();

    const s = new SustainedSource(ctx, g);
    s.onStop((t) => { src.stop(t + 0.2); buzz.stop(t + 0.2); });
    this.sustained.add(s);
    return s;
  }

  /* ----------------------------------------------------------- engines */

  /**
   * Continuous drive rumble. `kind` picks the character:
   *   capital — very low brown noise plus a sub sine, felt more than heard;
   *   corvette — a higher, tighter turbine tone.
   */
  engine(kind: 'capital' | 'corvette' | 'pod', p: Placed = {}): SustainedSource {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? (kind === 'capital' ? 400 : 70) });
    if (!ctx || !to) return new SustainedSource(null, null);

    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(to);

    const src = ctx.createBufferSource();
    src.buffer = this.e.noise('brown', 2);
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = kind === 'capital' ? 130 : kind === 'corvette' ? 420 : 700;
    lp.Q.value = 0.8;
    const nGain = ctx.createGain();
    nGain.gain.value = kind === 'capital' ? 0.85 : 0.5;
    src.connect(lp); lp.connect(nGain); nGain.connect(out);
    src.start(0, Math.random());

    const baseFreq = kind === 'capital' ? 31 : kind === 'corvette' ? 92 : 148;
    const oscs: OscillatorNode[] = [];
    for (const [mult, amp] of [[1, 0.5], [1.5, 0.14], [2.02, 0.09]] as Array<[number, number]>) {
      const o = ctx.createOscillator();
      o.type = kind === 'capital' ? 'sine' : 'sawtooth';
      o.frequency.value = baseFreq * mult;
      const og = ctx.createGain();
      og.gain.value = amp * (kind === 'capital' ? 0.7 : 0.24);
      o.connect(og);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = kind === 'capital' ? 180 : 900;
      og.connect(f);
      f.connect(out);
      o.start();
      oscs.push(o);
    }

    const s = new SustainedSource(ctx, out);
    s.attachExtra((level, t) => {
      // Higher throttle opens the filter and lifts the pitch slightly.
      lp.frequency.setTargetAtTime(
        (kind === 'capital' ? 90 : kind === 'corvette' ? 260 : 460) * (1 + level * 1.4),
        t, 0.2,
      );
      for (let i = 0; i < oscs.length; i++) {
        const mult = [1, 1.5, 2.02][i];
        oscs[i].frequency.setTargetAtTime(baseFreq * mult * (0.86 + level * 0.22), t, 0.25);
      }
    });
    s.onStop((t) => { src.stop(t + 0.3); for (const o of oscs) o.stop(t + 0.3); });
    this.sustained.add(s);
    return s;
  }

  /** Two-tone corridor alarm. */
  alarm(p: Placed = {}): SustainedSource {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? 12 });
    if (!ctx || !to) return new SustainedSource(null, null);
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(to);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 620;
    const shaper = ctx.createBiquadFilter();
    shaper.type = 'bandpass';
    shaper.frequency.value = 900;
    shaper.Q.value = 1.6;
    // Square LFO chops the tone and alternates the pitch.
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 0.62;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 130;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const chop = ctx.createGain();
    chop.gain.value = 0.5;
    const chopLfo = ctx.createOscillator();
    chopLfo.type = 'square';
    chopLfo.frequency.value = 1.24;
    const chopGain = ctx.createGain();
    chopGain.gain.value = 0.42;
    chopLfo.connect(chopGain);
    chopGain.connect(chop.gain);

    osc.connect(shaper);
    shaper.connect(chop);
    chop.connect(out);
    osc.start(); lfo.start(); chopLfo.start();

    const s = new SustainedSource(ctx, out);
    s.onStop((t) => { osc.stop(t + 0.2); lfo.stop(t + 0.2); chopLfo.stop(t + 0.2); });
    this.sustained.add(s);
    return s;
  }

  /**
   * Original respirator rhythm for the Dark Lord: a slow filtered-noise
   * inhale/exhale cycle. Newly synthesised, not sampled from anything.
   */
  respirator(p: Placed = {}): SustainedSource {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? 5 });
    if (!ctx || !to) return new SustainedSource(null, null);
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(to);

    const src = ctx.createBufferSource();
    src.buffer = this.e.noise('pink', 3);
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 420;
    bp.Q.value = 2.4;
    const shape = ctx.createGain();
    shape.gain.value = 0.0001;
    src.connect(bp); bp.connect(shape); shape.connect(out);
    src.start(0, Math.random());

    // A low resonant body under the breath.
    const body = ctx.createOscillator();
    body.type = 'sine';
    body.frequency.value = 74;
    const bodyGain = ctx.createGain();
    bodyGain.gain.value = 0.0001;
    body.connect(bodyGain); bodyGain.connect(out);
    body.start();

    // Schedule one full 4.4 s cycle at a time.
    const period = 4.4;
    let next = ctx.currentTime + 0.1;
    const schedule = () => {
      if (!ctx) return;
      while (next < ctx.currentTime + 6) {
        // Inhale: brighter, rising.
        bp.frequency.setValueAtTime(320, next);
        bp.frequency.linearRampToValueAtTime(780, next + 1.1);
        shape.gain.setValueAtTime(0.0001, next);
        shape.gain.linearRampToValueAtTime(0.5, next + 0.5);
        shape.gain.linearRampToValueAtTime(0.02, next + 1.35);
        bodyGain.gain.setValueAtTime(0.0001, next);
        bodyGain.gain.linearRampToValueAtTime(0.1, next + 0.5);
        bodyGain.gain.linearRampToValueAtTime(0.005, next + 1.4);
        // Exhale: darker, falling, slightly longer.
        const ex = next + 2.1;
        bp.frequency.setValueAtTime(620, ex);
        bp.frequency.linearRampToValueAtTime(240, ex + 1.4);
        shape.gain.setValueAtTime(0.0001, ex);
        shape.gain.linearRampToValueAtTime(0.42, ex + 0.35);
        shape.gain.linearRampToValueAtTime(0.0001, ex + 1.6);
        bodyGain.gain.setValueAtTime(0.0001, ex);
        bodyGain.gain.linearRampToValueAtTime(0.13, ex + 0.4);
        bodyGain.gain.linearRampToValueAtTime(0.0005, ex + 1.7);
        next += period;
      }
    };
    schedule();
    const timer = window.setInterval(schedule, 2000);

    const s = new SustainedSource(ctx, out);
    s.onStop((t) => {
      window.clearInterval(timer);
      src.stop(t + 0.3);
      body.stop(t + 0.3);
    });
    this.sustained.add(s);
    return s;
  }

  /** Atmospheric entry: a rising, buffeting roar. */
  atmosphericEntry(p: Placed = {}): SustainedSource {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? 40 });
    if (!ctx || !to) return new SustainedSource(null, null);
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(to);

    const src = ctx.createBufferSource();
    src.buffer = this.e.noise('brown', 3);
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 40;
    // Buffeting: a slow tremolo on the whole band.
    const trem = ctx.createGain();
    trem.gain.value = 0.8;
    const tremLfo = ctx.createOscillator();
    tremLfo.frequency.value = 7.3;
    const tremGain = ctx.createGain();
    tremGain.gain.value = 0.25;
    tremLfo.connect(tremGain);
    tremGain.connect(trem.gain);
    tremLfo.start();

    src.connect(hp); hp.connect(lp); lp.connect(trem); trem.connect(out);
    src.start(0, Math.random());

    const s = new SustainedSource(ctx, out);
    s.attachExtra((level, t) => lp.frequency.setTargetAtTime(220 + level * 1500, t, 0.4));
    s.onStop((t) => { src.stop(t + 0.4); tremLfo.stop(t + 0.4); });
    this.sustained.add(s);
    return s;
  }

  /* -------------------------------------------------- bodies and droids */

  /** A single footstep. `hard` distinguishes armoured boots from soft soles. */
  footstep(p: Placed = {}, hard = true): void {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? 4 });
    if (!ctx || !to) return;
    const t = ctx.currentTime;
    const g = (p.gain ?? 1) * (hard ? 0.14 : 0.08);
    this.e.noiseBurst({
      to, start: t, duration: hard ? 0.11 : 0.08, gain: g,
      type: 'bandpass', freq: hard ? 260 : 170, freqTo: 90, q: 1.1, kind: 'brown',
    });
    if (hard) {
      this.e.noiseBurst({ to, start: t + 0.008, duration: 0.05, gain: g * 0.5, type: 'highpass', freq: 3200 });
    }
  }

  /** Rolling astromech drive. */
  droidRoll(p: Placed = {}): SustainedSource {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? 4 });
    if (!ctx || !to) return new SustainedSource(null, null);
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(to);
    const src = ctx.createBufferSource();
    src.buffer = this.e.noise('brown', 2);
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 320;
    bp.Q.value = 1.1;
    src.connect(bp); bp.connect(out);
    src.start(0, Math.random());
    const motor = ctx.createOscillator();
    motor.type = 'sawtooth';
    motor.frequency.value = 128;
    const mf = ctx.createBiquadFilter();
    mf.type = 'lowpass';
    mf.frequency.value = 500;
    const mg = ctx.createGain();
    mg.gain.value = 0.14;
    motor.connect(mf); mf.connect(mg); mg.connect(out);
    motor.start();
    const s = new SustainedSource(ctx, out);
    s.attachExtra((level, t) => motor.frequency.setTargetAtTime(90 + level * 130, t, 0.15));
    s.onStop((t) => { src.stop(t + 0.2); motor.stop(t + 0.2); });
    this.sustained.add(s);
    return s;
  }

  /**
   * Original astromech chirp. A short sequence of pitched square blips with a
   * quick portamento; `mood` biases the contour up (curious) or down (worried).
   */
  droidChirp(p: Placed = {}, mood: 'calm' | 'urgent' | 'worried' = 'calm'): void {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? 4 });
    if (!ctx || !to) return;
    const t = ctx.currentTime;
    const n = mood === 'urgent' ? 5 : 3;
    const dir = mood === 'worried' ? -1 : 1;
    let f = mood === 'urgent' ? 1100 : 760;
    for (let i = 0; i < n; i++) {
      const start = t + i * (mood === 'urgent' ? 0.075 : 0.12);
      const target = f * (1 + dir * (0.18 + Math.random() * 0.5));
      this.e.tone({
        type: 'square', freq: f, glideTo: target, glideTime: 0.07,
        to, start, attack: 0.004, hold: 0.03, release: 0.06,
        gain: (p.gain ?? 1) * 0.09,
      });
      this.e.tone({
        type: 'sine', freq: f * 2, glideTo: target * 2, glideTime: 0.07,
        to, start, attack: 0.004, hold: 0.02, release: 0.05,
        gain: (p.gain ?? 1) * 0.035,
      });
      f = target * (0.7 + Math.random() * 0.7);
    }
  }

  /** Protocol-droid servo whine — a rising then falling filtered buzz. */
  servo(p: Placed = {}, length = 0.4): void {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? 3 });
    if (!ctx || !to) return;
    const t = ctx.currentTime;
    this.e.tone({
      type: 'sawtooth', freq: 180, glideTo: 320, glideTime: length * 0.6,
      to, start: t, attack: 0.03, hold: length * 0.5, release: length * 0.5,
      gain: (p.gain ?? 1) * 0.045,
    });
    this.e.noiseBurst({
      to, start: t, duration: length, gain: (p.gain ?? 1) * 0.03,
      type: 'bandpass', freq: 1800, freqTo: 2600, q: 3,
    });
  }

  /* ------------------------------------------------------- ship systems */

  /** Docking or escape-pod clamps: a heavy metallic clank with ring-off. */
  clamp(p: Placed = {}, size = 1): void {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? 8 });
    if (!ctx || !to) return;
    const t = ctx.currentTime;
    const g = (p.gain ?? 1) * 0.3 * size;
    this.e.noiseBurst({ to, start: t, duration: 0.09, gain: g, type: 'lowpass', freq: 1400, freqTo: 200, kind: 'brown' });
    for (const [f, q, amp] of [[186, 22, 0.5], [412, 26, 0.3], [903, 30, 0.16]] as Array<[number, number, number]>) {
      this.e.noiseBurst({
        to, start: t, duration: 0.9 * size, gain: g * amp, type: 'bandpass', freq: f / size, q,
      });
    }
  }

  /** Pressure door cycling open or shut. */
  doorServo(p: Placed = {}, opening = true): void {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? 6 });
    if (!ctx || !to) return;
    const t = ctx.currentTime;
    this.e.noiseBurst({
      to, start: t, duration: 0.75, gain: (p.gain ?? 1) * 0.14,
      type: 'bandpass', freq: opening ? 300 : 700, freqTo: opening ? 700 : 260, q: 1.4, kind: 'pink',
    });
    this.e.tone({
      type: 'sawtooth', freq: opening ? 68 : 92, glideTo: opening ? 96 : 62, glideTime: 0.7,
      to, start: t, attack: 0.06, hold: 0.4, release: 0.25, gain: (p.gain ?? 1) * 0.07,
    });
    this.clamp({ ...p, gain: (p.gain ?? 1) * 0.5 }, 0.6);
  }

  /** Tractor-beam capture: a descending resonant sweep that then holds. */
  tractorBeam(p: Placed = {}): SustainedSource {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? 120 });
    if (!ctx || !to) return new SustainedSource(null, null);
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(to);
    const oscs: OscillatorNode[] = [];
    for (const [f, amp, type] of [[58, 0.4, 'sine'], [87, 0.16, 'triangle'], [174, 0.06, 'sine']] as Array<[number, number, OscillatorType]>) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = amp;
      o.connect(g); g.connect(out);
      o.start();
      oscs.push(o);
    }
    // Slow pulsing so the beam feels like it is working.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 2.6;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.22;
    lfo.connect(lfoGain);
    lfoGain.connect(out.gain);
    lfo.start();
    const s = new SustainedSource(ctx, out);
    s.onStop((t) => { for (const o of oscs) o.stop(t + 0.3); lfo.stop(t + 0.3); });
    this.sustained.add(s);
    return s;
  }

  /** Data transfer chirp — the plans moving into the droid. */
  dataTransfer(p: Placed = {}): void {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? 4 });
    if (!ctx || !to) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 14; i++) {
      this.e.tone({
        type: 'square',
        freq: 900 + (i % 5) * 220 + Math.random() * 300,
        to,
        start: t + i * 0.055,
        attack: 0.002, hold: 0.012, release: 0.03,
        gain: (p.gain ?? 1) * 0.045,
      });
    }
    this.e.tone({
      type: 'sine', freq: 300, glideTo: 1200, glideTime: 0.8,
      to, start: t, attack: 0.2, hold: 0.4, release: 0.4, gain: (p.gain ?? 1) * 0.05,
    });
  }

  /** Holographic projector ignition. */
  hologram(p: Placed = {}): void {
    const ctx = this.e.ctx;
    const to = this.dest({ ...p, ref: p.ref ?? 4 });
    if (!ctx || !to) return;
    const t = ctx.currentTime;
    this.e.tone({ type: 'triangle', freq: 210, glideTo: 840, glideTime: 0.5, to, start: t, attack: 0.1, hold: 0.25, release: 0.5, gain: (p.gain ?? 1) * 0.07 });
    this.e.noiseBurst({ to, start: t, duration: 0.6, gain: (p.gain ?? 1) * 0.045, type: 'bandpass', freq: 1600, freqTo: 5200, q: 2 });
  }

  /** A soft low sweep used to punctuate chapter transitions. */
  transition(p: Placed = {}, up = true): void {
    const ctx = this.e.ctx;
    const to = this.e.bus('sfx');
    if (!ctx || !to) return;
    const t = ctx.currentTime;
    this.e.noiseBurst({
      to, start: t, duration: 2.2, gain: (p.gain ?? 1) * 0.09,
      type: 'lowpass', freq: up ? 90 : 2600, freqTo: up ? 2400 : 70, kind: 'pink', attack: 1.2,
    });
  }

  /** Stops every sustained source. Called on seek and teardown. */
  stopAllSustained(fade = 0.25): void {
    for (const s of this.sustained) s.stop(fade);
    this.sustained.clear();
  }
}
