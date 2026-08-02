import * as THREE from 'three';
import type { AudioEngine } from './AudioEngine';
import { clamp01 } from '../core/math';

/**
 * Synthesised sound-effect library.
 *
 * Nothing here is a recording. Each effect is built from oscillators, filtered
 * noise and envelopes at play time, so it can be pitched, spatialised and
 * layered without any asset loading. Continuous beds (engine rumble, alarm,
 * respirator) are long-lived voices whose gains the timeline automates.
 */

interface PlayOptions {
  /** World position for diegetic placement. Omit for a 2D (score-level) sound. */
  position?: THREE.Vector3;
  gain?: number;
  refDistance?: number;
  maxDistance?: number;
  /** 0..1 send into the shared reverb. */
  reverb?: number;
  /** Playback rate / pitch multiplier. */
  pitch?: number;
}

export class Sfx {
  private engine: AudioEngine;
  private beds = new Map<string, { gain: GainNode; nodes: AudioNode[]; panner?: PannerNode }>();
  private lastPlay = new Map<string, number>();

  constructor(engine: AudioEngine) {
    this.engine = engine;
  }

  private get ctx(): AudioContext | null {
    return this.engine.ready ? this.engine.ctx : null;
  }

  /** Route a voice into the sfx bus, optionally spatialised and reverberated. */
  private out(node: AudioNode, o: PlayOptions): void {
    const ctx = this.ctx!;
    let tail: AudioNode = node;
    if (o.position) {
      const panner = this.engine.createPanner(o.refDistance ?? 8, o.maxDistance ?? 600, 1.05);
      this.engine.setPannerPosition(panner, o.position.x, o.position.y, o.position.z);
      tail.connect(panner);
      tail = panner;
    }
    tail.connect(this.engine.buses.sfx);
    if (o.reverb && o.reverb > 0) {
      const send = ctx.createGain();
      send.gain.value = o.reverb;
      tail.connect(send);
      send.connect(this.engine.reverbSend);
    }
  }

  /** Rate-limit noisy effects so overlapping triggers cannot stack painfully. */
  private throttle(key: string, minGap: number): boolean {
    const now = this.engine.currentTime;
    const last = this.lastPlay.get(key) ?? -999;
    if (now - last < minGap) return false;
    this.lastPlay.set(key, now);
    return true;
  }

  private env(gain: GainNode, t: number, peak: number, attack: number, decay: number): void {
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  // -- weapons --------------------------------------------------------------

  /** Handheld blaster: a fast downward chirp with a noise transient. */
  blaster(o: PlayOptions & { imperial?: boolean } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.throttle('blaster', 0.035)) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    const base = o.imperial ? 1500 : 1900;
    const pitch = o.pitch ?? 1;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(base * 0.11 * pitch, t + 0.16);

    const sub = ctx.createOscillator();
    sub.type = 'square';
    sub.frequency.setValueAtTime(base * 0.5 * pitch, t);
    sub.frequency.exponentialRampToValueAtTime(base * 0.06 * pitch, t + 0.19);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3.2;
    filter.frequency.setValueAtTime(2600 * pitch, t);
    filter.frequency.exponentialRampToValueAtTime(320 * pitch, t + 0.18);

    const noise = ctx.createBufferSource();
    noise.buffer = this.engine.noiseSource().buffer;
    const nGain = ctx.createGain();
    this.env(nGain, t, 0.28, 0.002, 0.05);
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'highpass';
    nFilter.frequency.value = 1800;
    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(g);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(g);
    this.env(g, t, (o.gain ?? 0.34) * 0.9, 0.003, 0.2);
    this.out(g, { ...o, reverb: o.reverb ?? 0.28 });

    osc.start(t);
    sub.start(t);
    noise.start(t);
    osc.stop(t + 0.3);
    sub.stop(t + 0.3);
    noise.stop(t + 0.12);
  }

  /** Capital-ship turbolaser: much lower, slower, with a long tail. */
  turbolaser(o: PlayOptions = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.throttle('turbolaser', 0.07)) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    const pitch = o.pitch ?? 1;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(38 * pitch, t + 0.55);
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(213 * pitch, t);
    osc2.frequency.exponentialRampToValueAtTime(26 * pitch, t + 0.6);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 6;
    filter.frequency.setValueAtTime(2200, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + 0.6);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(g);
    this.env(g, t, o.gain ?? 0.42, 0.008, 0.72);
    this.out(g, { ...o, reverb: o.reverb ?? 0.5, refDistance: o.refDistance ?? 120, maxDistance: 6000 });
    osc.start(t);
    osc2.start(t);
    osc.stop(t + 0.9);
    osc2.stop(t + 0.9);
  }

  // -- impacts --------------------------------------------------------------

  /** Hull impact. `size` scales pitch and length: 0.4 small, 2 huge. */
  impact(size = 1, o: PlayOptions = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.throttle(`impact${Math.round(size)}`, 0.03)) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();

    const noise = this.engine.noiseSource();
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.setValueAtTime(3200 / size, t);
    nf.frequency.exponentialRampToValueAtTime(160 / size, t + 0.35 * size);
    nf.Q.value = 1.4;
    noise.connect(nf);
    nf.connect(g);

    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(110 / size, t);
    thump.frequency.exponentialRampToValueAtTime(28 / size, t + 0.3 * size);
    const tg = ctx.createGain();
    this.env(tg, t, 0.5, 0.004, 0.4 * size);
    thump.connect(tg);
    tg.connect(g);

    this.env(g, t, (o.gain ?? 0.42) * clamp01(0.55 + size * 0.3), 0.004, 0.55 * size);
    this.out(g, { ...o, reverb: o.reverb ?? 0.45, refDistance: o.refDistance ?? 20 });
    noise.start(t);
    thump.start(t);
    noise.stop(t + 0.9 * size);
    thump.stop(t + 0.9 * size);
  }

  /** Deflector shield absorbing a hit. */
  shield(o: PlayOptions = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.throttle('shield', 0.05)) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.5);
    const ring = ctx.createBiquadFilter();
    ring.type = 'bandpass';
    ring.Q.value = 14;
    ring.frequency.setValueAtTime(1500, t);
    ring.frequency.exponentialRampToValueAtTime(420, t + 0.5);
    const noise = this.engine.noiseSource();
    const ng = ctx.createGain();
    this.env(ng, t, 0.22, 0.006, 0.42);
    noise.connect(ring);
    ring.connect(ng);
    ng.connect(g);
    osc.connect(g);
    this.env(g, t, o.gain ?? 0.3, 0.006, 0.6);
    this.out(g, { ...o, reverb: o.reverb ?? 0.5 });
    osc.start(t);
    noise.start(t);
    osc.stop(t + 0.8);
    noise.stop(t + 0.8);
  }

  /** Electrical sparks: a scatter of bright crackles. */
  sparks(o: PlayOptions & { count?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.throttle('sparks', 0.06)) return;
    const t0 = ctx.currentTime;
    const n = o.count ?? 6;
    for (let i = 0; i < n; i++) {
      const t = t0 + Math.random() * 0.22;
      const g = ctx.createGain();
      const noise = this.engine.noiseSource();
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 9;
      f.frequency.value = 2400 + Math.random() * 4200;
      noise.connect(f);
      f.connect(g);
      this.env(g, t, (o.gain ?? 0.16) * (0.4 + Math.random() * 0.6), 0.001, 0.035);
      this.out(g, { ...o, reverb: o.reverb ?? 0.3 });
      noise.start(t);
      noise.stop(t + 0.06);
    }
  }

  // -- ship / structure -----------------------------------------------------

  /** A cutting torch working through a bulkhead. Returns a stop function. */
  cuttingArc(position: THREE.Vector3, gainValue = 0.2): () => void {
    const ctx = this.ctx;
    if (!ctx) return () => undefined;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gainValue, t + 0.6);
    const noise = this.engine.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2.4;
    bp.frequency.value = 2200;
    const lfo = ctx.createOscillator();
    lfo.type = 'sawtooth';
    lfo.frequency.value = 17;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 1400;
    lfo.connect(lfoGain);
    lfoGain.connect(bp.frequency);
    noise.connect(bp);
    bp.connect(g);
    this.out(g, { position, reverb: 0.4, refDistance: 6 });
    noise.start(t);
    lfo.start(t);
    return () => {
      const now = ctx.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(Math.max(0.0002, g.gain.value), now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      noise.stop(now + 0.25);
      lfo.stop(now + 0.25);
    };
  }

  /** A pressure door blowing inward. */
  doorBreach(o: PlayOptions = {}): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();

    const noise = this.engine.noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(5200, t);
    lp.frequency.exponentialRampToValueAtTime(140, t + 1.6);
    noise.connect(lp);
    lp.connect(g);

    // Metal shear: two detuned saws bending down.
    for (const f0 of [318, 214, 141]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.32, t + 0.9);
      const og = ctx.createGain();
      this.env(og, t, 0.18, 0.01, 1.0);
      osc.connect(og);
      og.connect(g);
      osc.start(t);
      osc.stop(t + 1.4);
    }

    const boom = ctx.createOscillator();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(78, t);
    boom.frequency.exponentialRampToValueAtTime(22, t + 1.1);
    const bg = ctx.createGain();
    this.env(bg, t, 0.6, 0.006, 1.3);
    boom.connect(bg);
    bg.connect(g);

    this.env(g, t, o.gain ?? 0.6, 0.005, 1.8);
    this.out(g, { ...o, reverb: o.reverb ?? 0.7, refDistance: 10 });
    noise.start(t);
    boom.start(t);
    noise.stop(t + 2.2);
    boom.stop(t + 2.2);
  }

  /** Docking clamps releasing. */
  clamps(o: PlayOptions = {}): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const t = t0 + i * 0.17;
      const g = ctx.createGain();
      for (const f of [740, 1130, 1780, 2560]) {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = f * (0.96 + Math.random() * 0.08);
        const og = ctx.createGain();
        this.env(og, t, 0.1, 0.001, 0.42);
        osc.connect(og);
        og.connect(g);
        osc.start(t);
        osc.stop(t + 0.6);
      }
      const noise = this.engine.noiseSource();
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 900;
      const ng = ctx.createGain();
      this.env(ng, t, 0.16, 0.001, 0.1);
      noise.connect(hp);
      hp.connect(ng);
      ng.connect(g);
      noise.start(t);
      noise.stop(t + 0.2);
      this.env(g, t, o.gain ?? 0.32, 0.002, 0.6);
      this.out(g, { ...o, reverb: o.reverb ?? 0.55, refDistance: 6 });
    }
  }

  /** Escape pod leaving the rail. */
  podLaunch(o: PlayOptions = {}): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    const noise = this.engine.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(280, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + 0.5);
    bp.frequency.exponentialRampToValueAtTime(180, t + 2.4);
    noise.connect(bp);
    bp.connect(g);
    const sweep = ctx.createOscillator();
    sweep.type = 'sawtooth';
    sweep.frequency.setValueAtTime(60, t);
    sweep.frequency.exponentialRampToValueAtTime(220, t + 0.7);
    sweep.frequency.exponentialRampToValueAtTime(48, t + 2.4);
    const sg = ctx.createGain();
    this.env(sg, t, 0.3, 0.05, 2.4);
    sweep.connect(sg);
    sg.connect(g);
    this.env(g, t, o.gain ?? 0.5, 0.02, 2.6);
    this.out(g, { ...o, reverb: o.reverb ?? 0.5, refDistance: 12 });
    noise.start(t);
    sweep.start(t);
    noise.stop(t + 3);
    sweep.stop(t + 3);
  }

  /** Footstep on a metal deck. */
  footstep(o: PlayOptions & { heavy?: boolean } = {}): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    const heavy = o.heavy ?? false;
    const noise = this.engine.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.6;
    bp.frequency.setValueAtTime(heavy ? 320 : 900, t);
    bp.frequency.exponentialRampToValueAtTime(heavy ? 90 : 260, t + 0.1);
    noise.connect(bp);
    bp.connect(g);
    const thud = ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(heavy ? 92 : 150, t);
    thud.frequency.exponentialRampToValueAtTime(heavy ? 40 : 70, t + 0.12);
    const tg = ctx.createGain();
    this.env(tg, t, heavy ? 0.4 : 0.18, 0.002, 0.14);
    thud.connect(tg);
    tg.connect(g);
    this.env(g, t, (o.gain ?? 0.2) * (heavy ? 1.4 : 1), 0.002, heavy ? 0.24 : 0.12);
    this.out(g, { ...o, reverb: o.reverb ?? 0.45, refDistance: 4 });
    noise.start(t);
    thud.start(t);
    noise.stop(t + 0.35);
    thud.stop(t + 0.35);
  }

  /** Servo whine as a droid moves. */
  servo(o: PlayOptions & { length?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.throttle('servo', 0.12)) return;
    const t = ctx.currentTime;
    const len = o.length ?? 0.4;
    const g = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.linearRampToValueAtTime(340, t + len * 0.4);
    osc.frequency.linearRampToValueAtTime(190, t + len);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 7;
    bp.frequency.value = 1400;
    osc.connect(bp);
    bp.connect(g);
    this.env(g, t, o.gain ?? 0.1, 0.03, len);
    this.out(g, { ...o, reverb: o.reverb ?? 0.35, refDistance: 4 });
    osc.start(t);
    osc.stop(t + len + 0.2);
  }

  /**
   * Original astromech vocalisation: a short FM warble with a random contour.
   * `mood` shifts the pitch centre and contour shape.
   */
  droidChirp(mood: 'query' | 'alarm' | 'affirm' | 'sad' = 'query', o: PlayOptions = {}): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    const mod = ctx.createOscillator();
    mod.type = 'sine';
    const modGain = ctx.createGain();

    const base = mood === 'alarm' ? 900 : mood === 'sad' ? 420 : 620;
    const steps =
      mood === 'query'
        ? [1, 1.5, 1.2, 1.9]
        : mood === 'affirm'
          ? [1, 1.35, 1.7]
          : mood === 'alarm'
            ? [1, 1.9, 1.1, 2.2, 1.4]
            : [1.6, 1.2, 0.85, 0.6];
    const step = (mood === 'alarm' ? 0.07 : 0.1) * (o.pitch ?? 1);
    carrier.frequency.setValueAtTime(base * steps[0], t);
    for (let i = 1; i < steps.length; i++) {
      carrier.frequency.setValueAtTime(base * steps[i], t + i * step);
    }
    mod.frequency.value = base * 1.42;
    modGain.gain.value = base * 0.85;
    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(g);
    const dur = steps.length * step + 0.06;
    this.env(g, t, o.gain ?? 0.16, 0.006, dur);
    this.out(g, { ...o, reverb: o.reverb ?? 0.35, refDistance: 4 });
    carrier.start(t);
    mod.start(t);
    carrier.stop(t + dur + 0.15);
    mod.stop(t + dur + 0.15);
  }

  /** Protocol droid fret: a wavering descending tone. */
  droidFret(o: PlayOptions = {}): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.linearRampToValueAtTime(250, t + 0.55);
    const vib = ctx.createOscillator();
    vib.frequency.value = 8.5;
    const vibGain = ctx.createGain();
    vibGain.gain.value = 16;
    vib.connect(vibGain);
    vibGain.connect(osc.frequency);
    osc.connect(g);
    this.env(g, t, o.gain ?? 0.1, 0.03, 0.6);
    this.out(g, { ...o, reverb: o.reverb ?? 0.4, refDistance: 4 });
    osc.start(t);
    vib.start(t);
    osc.stop(t + 0.75);
    vib.stop(t + 0.75);
  }

  // -- continuous beds -------------------------------------------------------

  /**
   * Start (or return) a looping bed. Beds persist until `stopBed`.
   * `kind` selects the synthesis recipe.
   */
  bed(
    id: string,
    kind: 'capitalRumble' | 'runnerEngine' | 'alarm' | 'respirator' | 'reentry' | 'roomTone' | 'podThruster',
    position?: THREE.Vector3,
  ): void {
    const ctx = this.ctx;
    if (!ctx || this.beds.has(id)) return;
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    const nodes: AudioNode[] = [];
    let panner: PannerNode | undefined;

    const finish = (): void => {
      let tail: AudioNode = gain;
      if (position) {
        panner = this.engine.createPanner(kind === 'capitalRumble' ? 400 : 20, 12000, 0.9);
        this.engine.setPannerPosition(panner, position.x, position.y, position.z);
        gain.connect(panner);
        tail = panner;
      }
      tail.connect(this.engine.buses.sfx);
      this.beds.set(id, { gain, nodes, panner });
    };

    switch (kind) {
      case 'capitalRumble': {
        const noise = this.engine.noiseSource();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 90;
        lp.Q.value = 0.9;
        noise.connect(lp);
        lp.connect(gain);
        noise.start(t);
        nodes.push(noise, lp);
        for (const f of [24, 37, 51]) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = f;
          const og = ctx.createGain();
          og.gain.value = 0.42;
          osc.connect(og);
          og.connect(gain);
          osc.start(t);
          nodes.push(osc, og);
        }
        break;
      }
      case 'runnerEngine': {
        for (const f of [128, 193, 259]) {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = f;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.Q.value = 6;
          bp.frequency.value = f * 2.1;
          const og = ctx.createGain();
          og.gain.value = 0.24;
          osc.connect(bp);
          bp.connect(og);
          og.connect(gain);
          osc.start(t);
          nodes.push(osc, bp, og);
        }
        const noise = this.engine.noiseSource();
        const hp = ctx.createBiquadFilter();
        hp.type = 'bandpass';
        hp.frequency.value = 1400;
        hp.Q.value = 1.1;
        const ng = ctx.createGain();
        ng.gain.value = 0.16;
        noise.connect(hp);
        hp.connect(ng);
        ng.connect(gain);
        noise.start(t);
        nodes.push(noise, hp, ng);
        break;
      }
      case 'podThruster': {
        const noise = this.engine.noiseSource();
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 0.8;
        bp.frequency.value = 620;
        noise.connect(bp);
        bp.connect(gain);
        noise.start(t);
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 96;
        const og = ctx.createGain();
        og.gain.value = 0.3;
        osc.connect(og);
        og.connect(gain);
        osc.start(t);
        nodes.push(noise, bp, osc, og);
        break;
      }
      case 'alarm': {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = 620;
        const lfo = ctx.createOscillator();
        lfo.type = 'square';
        lfo.frequency.value = 1.7;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 150;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        const shape = ctx.createGain();
        shape.gain.value = 0;
        const pulse = ctx.createOscillator();
        pulse.type = 'square';
        pulse.frequency.value = 0.85;
        const pulseGain = ctx.createGain();
        pulseGain.gain.value = 0.5;
        pulse.connect(pulseGain);
        pulseGain.connect(shape.gain);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1600;
        osc.connect(shape);
        shape.connect(lp);
        lp.connect(gain);
        osc.start(t);
        lfo.start(t);
        pulse.start(t);
        nodes.push(osc, lfo, lfoGain, shape, pulse, pulseGain, lp);
        break;
      }
      case 'respirator': {
        // Original life-support rhythm: filtered noise swelling in and out
        // roughly every four seconds. Deliberately mechanical, not a sample.
        const noise = this.engine.noiseSource();
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 3.4;
        bp.frequency.value = 480;
        const shape = ctx.createGain();
        shape.gain.value = 0;
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.245;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.5;
        const offset = ctx.createConstantSource();
        offset.offset.value = 0.5;
        lfo.connect(lfoGain);
        lfoGain.connect(shape.gain);
        offset.connect(shape.gain);
        const sweep = ctx.createOscillator();
        sweep.type = 'sine';
        sweep.frequency.value = 0.245;
        const sweepGain = ctx.createGain();
        sweepGain.gain.value = 240;
        sweep.connect(sweepGain);
        sweepGain.connect(bp.frequency);
        noise.connect(bp);
        bp.connect(shape);
        shape.connect(gain);
        noise.start(t);
        lfo.start(t);
        sweep.start(t);
        offset.start(t);
        nodes.push(noise, bp, shape, lfo, lfoGain, offset, sweep, sweepGain);
        break;
      }
      case 'reentry': {
        const noise = this.engine.noiseSource();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 420;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 0.7;
        bp.frequency.value = 160;
        noise.connect(lp);
        lp.connect(bp);
        bp.connect(gain);
        noise.start(t);
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 42;
        const og = ctx.createGain();
        og.gain.value = 0.5;
        osc.connect(og);
        og.connect(gain);
        osc.start(t);
        nodes.push(noise, lp, bp, osc, og);
        break;
      }
      case 'roomTone': {
        const noise = this.engine.noiseSource();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 260;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 55;
        noise.connect(lp);
        lp.connect(hp);
        hp.connect(gain);
        noise.start(t);
        nodes.push(noise, lp, hp);
        break;
      }
    }
    finish();
  }

  setBedLevel(id: string, level: number, timeConstant = 0.4): void {
    const bed = this.beds.get(id);
    const ctx = this.ctx;
    if (!bed || !ctx) return;
    bed.gain.gain.setTargetAtTime(Math.max(0.00005, level), ctx.currentTime, timeConstant);
  }

  setBedPosition(id: string, position: THREE.Vector3): void {
    const bed = this.beds.get(id);
    if (!bed || !bed.panner) return;
    this.engine.setPannerPosition(bed.panner, position.x, position.y, position.z);
  }

  hasBed(id: string): boolean {
    return this.beds.has(id);
  }

  stopBed(id: string, fade = 0.4): void {
    const bed = this.beds.get(id);
    const ctx = this.ctx;
    if (!bed || !ctx) return;
    this.beds.delete(id);
    const now = ctx.currentTime;
    bed.gain.gain.cancelScheduledValues(now);
    bed.gain.gain.setValueAtTime(Math.max(0.0001, bed.gain.gain.value), now);
    bed.gain.gain.exponentialRampToValueAtTime(0.00005, now + fade);
    window.setTimeout(
      () => {
        for (const n of bed.nodes) {
          const src = n as AudioScheduledSourceNode;
          if (typeof src.stop === 'function') {
            try {
              src.stop();
            } catch {
              /* already stopped */
            }
          }
          n.disconnect();
        }
        bed.gain.disconnect();
        bed.panner?.disconnect();
      },
      (fade + 0.15) * 1000,
    );
  }

  stopAllBeds(): void {
    for (const id of Array.from(this.beds.keys())) this.stopBed(id, 0.12);
  }
}
