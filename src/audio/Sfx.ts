import * as THREE from 'three';
import type { AudioEngine } from './AudioEngine';
import { applyEnvelope, note } from './dsp';

/**
 * Sound-effect library.
 *
 * Every sound here is synthesised from oscillators and noise at playback time.
 * Nothing is sampled from any film, game or commercial library. The
 * respirator rhythm is an original construction: a filtered noise inhale and
 * exhale on a slow cycle, tuned to read as "a man breathing through a machine"
 * without reproducing any recording.
 */

export interface PlayOptions {
  /** World-space position for diegetic sounds. Omit for non-diegetic. */
  position?: THREE.Vector3;
  /** Distance compression for the panner (space uses large values). */
  spatialScale?: number;
  gain?: number;
  /** Reverb send: 'space', 'room' or 'none'. */
  space?: 'space' | 'room' | 'none';
  /** Playback rate / pitch multiplier. */
  detune?: number;
  delay?: number;
}

export class SfxLibrary {
  private engine: AudioEngine;
  /** Long-running sources keyed by name so they can be faded in and out. */
  private loops = new Map<string, { source: AudioBufferSourceNode | OscillatorNode[]; gain: GainNode; panner?: PannerNode; extra?: AudioNode[] }>();
  private listenerPos = new THREE.Vector3();

  constructor(engine: AudioEngine) {
    this.engine = engine;
  }

  setListenerPosition(p: THREE.Vector3): void {
    this.listenerPos.copy(p);
  }

  private out(opts: PlayOptions | undefined): { input: AudioNode; panner?: PannerNode } {
    const ctx = this.engine.ctx;
    const dry = ctx.createGain();
    dry.gain.value = 1;
    let panner: PannerNode | undefined;
    if (opts?.position) {
      panner = this.engine.createPanner(opts.spatialScale ?? 1);
      this.engine.setPannerPosition(panner, opts.position, this.listenerPos, opts.spatialScale ?? 1);
      dry.connect(panner);
      panner.connect(this.engine.buses.sfx);
      const space = opts.space ?? 'space';
      if (space !== 'none') {
        panner.connect(space === 'room' ? this.engine.reverbRoomSend : this.engine.reverbSpaceSend);
      }
    } else {
      dry.connect(this.engine.buses.sfx);
      const space = opts?.space ?? 'none';
      if (space !== 'none') {
        dry.connect(space === 'room' ? this.engine.reverbRoomSend : this.engine.reverbSpaceSend);
      }
    }
    return { input: dry, panner };
  }

  private noiseSource(duration: number, rate = 1): AudioBufferSourceNode {
    const src = this.engine.ctx.createBufferSource();
    src.buffer = this.engine.noiseBuffer;
    src.loop = true;
    src.playbackRate.value = rate;
    void duration;
    return src;
  }

  // -------------------------------------------------------------------------
  // One-shots
  // -------------------------------------------------------------------------

  /** Heavy capital-ship turbolaser: a descending sweep with a hard transient. */
  turbolaser(opts?: PlayOptions): void {
    const ctx = this.engine.ctx;
    const t0 = ctx.currentTime + (opts?.delay ?? 0);
    const { input } = this.out(opts);
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(input);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(760 * (opts?.detune ?? 1), t0);
    osc.frequency.exponentialRampToValueAtTime(72 * (opts?.detune ?? 1), t0 + 0.42);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3.5;
    filter.frequency.setValueAtTime(1800, t0);
    filter.frequency.exponentialRampToValueAtTime(180, t0 + 0.4);
    osc.connect(filter);
    filter.connect(g);

    const noise = this.noiseSource(0.4, 1.4);
    const nf = ctx.createBiquadFilter();
    nf.type = 'highpass';
    nf.frequency.value = 900;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.5 * (opts?.gain ?? 1), t0);
    ng.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.16);
    noise.connect(nf);
    nf.connect(ng);
    ng.connect(input);

    applyEnvelope(g.gain, t0, 0.1, 0.55 * (opts?.gain ?? 1), { attack: 0.004, decay: 0.08, sustain: 0.35, release: 0.34 });
    osc.start(t0);
    osc.stop(t0 + 0.7);
    noise.start(t0);
    noise.stop(t0 + 0.25);
  }

  /** Light infantry blaster: short, bright, metallic. */
  blaster(imperial: boolean, opts?: PlayOptions): void {
    const ctx = this.engine.ctx;
    const t0 = ctx.currentTime + (opts?.delay ?? 0);
    const { input } = this.out(opts);
    const g = ctx.createGain();
    g.connect(input);
    g.gain.value = 0;

    const osc = ctx.createOscillator();
    osc.type = imperial ? 'square' : 'sawtooth';
    const base = imperial ? 1450 : 1980;
    osc.frequency.setValueAtTime(base, t0);
    osc.frequency.exponentialRampToValueAtTime(base * 0.14, t0 + 0.13);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 6;
    filter.frequency.setValueAtTime(base * 1.4, t0);
    filter.frequency.exponentialRampToValueAtTime(320, t0 + 0.13);
    osc.connect(filter);
    filter.connect(g);

    // A short metallic ring gives the bolt its "pew" tail.
    const ring = ctx.createOscillator();
    ring.type = 'triangle';
    ring.frequency.setValueAtTime(base * 2.1, t0);
    ring.frequency.exponentialRampToValueAtTime(base * 0.5, t0 + 0.1);
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.16 * (opts?.gain ?? 1), t0);
    rg.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.14);
    ring.connect(rg);
    rg.connect(input);

    applyEnvelope(g.gain, t0, 0.03, 0.32 * (opts?.gain ?? 1), { attack: 0.002, decay: 0.03, sustain: 0.2, release: 0.1 });
    osc.start(t0);
    osc.stop(t0 + 0.24);
    ring.start(t0);
    ring.stop(t0 + 0.18);
  }

  /** Something large being hit: low thud plus debris rattle. */
  hullImpact(strength: number, opts?: PlayOptions): void {
    const ctx = this.engine.ctx;
    const t0 = ctx.currentTime + (opts?.delay ?? 0);
    const { input } = this.out(opts);
    const s = Math.min(1.4, Math.max(0.15, strength));

    const body = ctx.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(120 * (1.4 - s * 0.5), t0);
    body.frequency.exponentialRampToValueAtTime(28, t0 + 0.5 + s * 0.4);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t0);
    bg.gain.exponentialRampToValueAtTime(0.85 * s * (opts?.gain ?? 1), t0 + 0.012);
    bg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7 + s * 0.7);
    body.connect(bg);
    bg.connect(input);

    const noise = this.noiseSource(1, 0.8);
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.setValueAtTime(2400, t0);
    nf.frequency.exponentialRampToValueAtTime(180, t0 + 0.5);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.55 * s * (opts?.gain ?? 1), t0);
    ng.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.45 + s * 0.4);
    noise.connect(nf);
    nf.connect(ng);
    ng.connect(input);

    body.start(t0);
    body.stop(t0 + 1.6);
    noise.start(t0);
    noise.stop(t0 + 1.2);
  }

  /** Deflector shield absorbing a hit: bright, ringing, electrical. */
  shieldFlash(strength: number, opts?: PlayOptions): void {
    const ctx = this.engine.ctx;
    const t0 = ctx.currentTime + (opts?.delay ?? 0);
    const { input } = this.out(opts);
    const s = Math.min(1, Math.max(0.15, strength));
    const g = ctx.createGain();
    g.gain.value = 0;
    g.connect(input);

    for (const [mult, level] of [[1, 0.5], [1.51, 0.3], [2.37, 0.18]] as const) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420 * mult, t0);
      osc.frequency.exponentialRampToValueAtTime(180 * mult, t0 + 0.55);
      const og = ctx.createGain();
      og.gain.value = level;
      osc.connect(og);
      og.connect(g);
      osc.start(t0);
      osc.stop(t0 + 0.8);
    }
    const noise = this.noiseSource(0.4, 1.8);
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    nf.frequency.value = 3200;
    nf.Q.value = 1.4;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.22 * s * (opts?.gain ?? 1), t0);
    ng.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.4);
    noise.connect(nf);
    nf.connect(ng);
    ng.connect(input);
    noise.start(t0);
    noise.stop(t0 + 0.5);

    applyEnvelope(g.gain, t0, 0.05, 0.3 * s * (opts?.gain ?? 1), { attack: 0.004, decay: 0.1, sustain: 0.3, release: 0.5 });
  }

  /** Breaching charge: a hard crack, a metal tear and a bass drop. */
  doorBreach(opts?: PlayOptions): void {
    const ctx = this.engine.ctx;
    const t0 = ctx.currentTime + (opts?.delay ?? 0);
    const { input } = this.out(opts);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(90, t0);
    sub.frequency.exponentialRampToValueAtTime(24, t0 + 1.4);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t0);
    sg.gain.exponentialRampToValueAtTime(0.95 * (opts?.gain ?? 1), t0 + 0.02);
    sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
    sub.connect(sg);
    sg.connect(input);
    sub.start(t0);
    sub.stop(t0 + 2);

    const crack = this.noiseSource(1, 1.6);
    const cf = ctx.createBiquadFilter();
    cf.type = 'highpass';
    cf.frequency.setValueAtTime(2200, t0);
    cf.frequency.exponentialRampToValueAtTime(300, t0 + 0.9);
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.85 * (opts?.gain ?? 1), t0);
    cg.gain.exponentialRampToValueAtTime(0.0004, t0 + 1.1);
    crack.connect(cf);
    cf.connect(cg);
    cg.connect(input);
    crack.start(t0);
    crack.stop(t0 + 1.3);

    // Tearing metal: a detuned pair sliding down a semitone or two.
    for (const f of [340, 512]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t0 + 0.02);
      osc.frequency.exponentialRampToValueAtTime(f * 0.45, t0 + 0.9);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 8;
      bp.frequency.value = f * 1.5;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t0);
      og.gain.exponentialRampToValueAtTime(0.16 * (opts?.gain ?? 1), t0 + 0.06);
      og.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.0);
      osc.connect(bp);
      bp.connect(og);
      og.connect(input);
      osc.start(t0);
      osc.stop(t0 + 1.2);
    }
  }

  /** Electrical arc / spark shower. */
  sparks(opts?: PlayOptions): void {
    const ctx = this.engine.ctx;
    const t0 = ctx.currentTime + (opts?.delay ?? 0);
    const { input } = this.out(opts);
    const count = 5;
    for (let i = 0; i < count; i++) {
      const t = t0 + i * 0.035 + Math.random() * 0.03;
      const noise = this.noiseSource(0.1, 2.4 + Math.random());
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2600 + Math.random() * 3400;
      bp.Q.value = 4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2 * (opts?.gain ?? 1), t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0002, t + 0.09);
      noise.connect(bp);
      bp.connect(g);
      g.connect(input);
      noise.start(t);
      noise.stop(t + 0.12);
    }
  }

  /** A single boot on deck plating. */
  footstep(hard: boolean, opts?: PlayOptions): void {
    const ctx = this.engine.ctx;
    const t0 = ctx.currentTime + (opts?.delay ?? 0);
    const { input } = this.out(opts);
    const noise = this.noiseSource(0.2, hard ? 0.7 : 1.1);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = hard ? 220 : 430;
    bp.Q.value = 1.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime((hard ? 0.34 : 0.16) * (opts?.gain ?? 1), t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0002, t0 + (hard ? 0.22 : 0.13));
    noise.connect(bp);
    bp.connect(g);
    g.connect(input);
    noise.start(t0);
    noise.stop(t0 + 0.3);

    if (hard) {
      const thud = ctx.createOscillator();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(88, t0);
      thud.frequency.exponentialRampToValueAtTime(42, t0 + 0.14);
      const tg = ctx.createGain();
      tg.gain.setValueAtTime(0.0001, t0);
      tg.gain.exponentialRampToValueAtTime(0.24 * (opts?.gain ?? 1), t0 + 0.008);
      tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      thud.connect(tg);
      tg.connect(input);
      thud.start(t0);
      thud.stop(t0 + 0.3);
    }
  }

  /** Astromech servo movement. */
  droidServo(opts?: PlayOptions): void {
    const ctx = this.engine.ctx;
    const t0 = ctx.currentTime + (opts?.delay ?? 0);
    const { input } = this.out(opts);
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(210, t0);
    osc.frequency.linearRampToValueAtTime(260, t0 + 0.18);
    osc.frequency.linearRampToValueAtTime(180, t0 + 0.36);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 5;
    const g = ctx.createGain();
    applyEnvelope(g.gain, t0, 0.28, 0.09 * (opts?.gain ?? 1), { attack: 0.02, decay: 0.08, sustain: 0.6, release: 0.12 });
    osc.connect(bp);
    bp.connect(g);
    g.connect(input);
    osc.start(t0);
    osc.stop(t0 + 0.55);
  }

  /** Original astromech vocalisation: a short sequence of pitched blips. */
  droidChirp(mood: 'calm' | 'urgent' | 'query', opts?: PlayOptions): void {
    const ctx = this.engine.ctx;
    const t0 = ctx.currentTime + (opts?.delay ?? 0);
    const { input } = this.out(opts);
    const patterns: Record<string, number[]> = {
      calm: [880, 1180, 990],
      urgent: [1320, 1560, 1180, 1760, 1480],
      query: [740, 1180],
    };
    const seq = patterns[mood];
    seq.forEach((f, i) => {
      const t = t0 + i * (mood === 'urgent' ? 0.085 : 0.13);
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f * 0.8, t);
      osc.frequency.exponentialRampToValueAtTime(f, t + 0.03);
      if (mood === 'query' && i === seq.length - 1) {
        osc.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.16);
      }
      const g = ctx.createGain();
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f * 1.2;
      bp.Q.value = 2.4;
      applyEnvelope(g.gain, t, 0.06, 0.11 * (opts?.gain ?? 1), { attack: 0.006, decay: 0.03, sustain: 0.6, release: 0.06 });
      osc.connect(bp);
      bp.connect(g);
      g.connect(input);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  /** Magnetic clamps releasing. */
  clampRelease(opts?: PlayOptions): void {
    const ctx = this.engine.ctx;
    const t0 = ctx.currentTime + (opts?.delay ?? 0);
    const { input } = this.out(opts);
    for (let i = 0; i < 3; i++) {
      const t = t0 + i * 0.13;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(64, t + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3 * (opts?.gain ?? 1), t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0002, t + 0.2);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      osc.connect(lp);
      lp.connect(g);
      g.connect(input);
      osc.start(t);
      osc.stop(t + 0.3);
    }
    const hiss = this.noiseSource(0.6, 0.9);
    const hf = ctx.createBiquadFilter();
    hf.type = 'highpass';
    hf.frequency.value = 1600;
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(0.0001, t0 + 0.3);
    hg.gain.exponentialRampToValueAtTime(0.16 * (opts?.gain ?? 1), t0 + 0.36);
    hg.gain.exponentialRampToValueAtTime(0.0002, t0 + 1.1);
    hiss.connect(hf);
    hf.connect(hg);
    hg.connect(input);
    hiss.start(t0 + 0.3);
    hiss.stop(t0 + 1.3);
  }

  /** Escape-pod launch: a pneumatic slam followed by a rocket swell. */
  podLaunch(opts?: PlayOptions): void {
    const ctx = this.engine.ctx;
    const t0 = ctx.currentTime + (opts?.delay ?? 0);
    const { input } = this.out(opts);
    const slam = ctx.createOscillator();
    slam.type = 'sine';
    slam.frequency.setValueAtTime(150, t0);
    slam.frequency.exponentialRampToValueAtTime(34, t0 + 0.6);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t0);
    sg.gain.exponentialRampToValueAtTime(0.8 * (opts?.gain ?? 1), t0 + 0.01);
    sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
    slam.connect(sg);
    sg.connect(input);
    slam.start(t0);
    slam.stop(t0 + 1);

    const roar = this.noiseSource(3, 0.6);
    const rf = ctx.createBiquadFilter();
    rf.type = 'lowpass';
    rf.frequency.setValueAtTime(300, t0);
    rf.frequency.linearRampToValueAtTime(1400, t0 + 0.5);
    rf.frequency.linearRampToValueAtTime(400, t0 + 2.6);
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, t0);
    rg.gain.exponentialRampToValueAtTime(0.4 * (opts?.gain ?? 1), t0 + 0.25);
    rg.gain.exponentialRampToValueAtTime(0.0004, t0 + 2.8);
    roar.connect(rf);
    rf.connect(rg);
    rg.connect(input);
    roar.start(t0);
    roar.stop(t0 + 3);
  }

  /** Console beeps used for the data transfer. */
  dataBlip(index: number, opts?: PlayOptions): void {
    const ctx = this.engine.ctx;
    const t0 = ctx.currentTime + (opts?.delay ?? 0);
    const { input } = this.out(opts);
    const scale = [note('E5'), note('G5'), note('B5'), note('D6'), note('A5')];
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = scale[index % scale.length];
    const g = ctx.createGain();
    applyEnvelope(g.gain, t0, 0.04, 0.09 * (opts?.gain ?? 1), { attack: 0.004, decay: 0.05, sustain: 0.3, release: 0.18 });
    osc.connect(g);
    g.connect(input);
    osc.start(t0);
    osc.stop(t0 + 0.4);
  }

  // -------------------------------------------------------------------------
  // Sustained beds
  // -------------------------------------------------------------------------

  /**
   * Start (or retune) a looping bed. Beds are the engine rumbles, the alarm,
   * the respirator and the atmospheric-entry roar.
   */
  bed(
    name: string,
    build: (ctx: AudioContext, out: GainNode) => { source: AudioBufferSourceNode | OscillatorNode[]; extra?: AudioNode[] },
    options: { position?: THREE.Vector3; spatialScale?: number; space?: 'space' | 'room' | 'none' } = {},
  ): GainNode {
    const existing = this.loops.get(name);
    if (existing) {
      if (existing.panner && options.position) {
        this.engine.setPannerPosition(existing.panner, options.position, this.listenerPos, options.spatialScale ?? 1);
      }
      return existing.gain;
    }
    const ctx = this.engine.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    let panner: PannerNode | undefined;
    if (options.position) {
      panner = this.engine.createPanner(options.spatialScale ?? 1);
      this.engine.setPannerPosition(panner, options.position, this.listenerPos, options.spatialScale ?? 1);
      gain.connect(panner);
      panner.connect(this.engine.buses.sfx);
      if (options.space && options.space !== 'none') {
        panner.connect(options.space === 'room' ? this.engine.reverbRoomSend : this.engine.reverbSpaceSend);
      }
    } else {
      gain.connect(this.engine.buses.sfx);
      if (options.space && options.space !== 'none') {
        gain.connect(options.space === 'room' ? this.engine.reverbRoomSend : this.engine.reverbSpaceSend);
      }
    }
    const built = build(ctx, gain);
    this.loops.set(name, { source: built.source, gain, panner, extra: built.extra });
    return gain;
  }

  setBedLevel(name: string, level: number, timeConstant = 0.25): void {
    const loop = this.loops.get(name);
    if (!loop) return;
    loop.gain.gain.setTargetAtTime(Math.max(0, level), this.engine.ctx.currentTime, timeConstant);
  }

  getBed(name: string): GainNode | undefined {
    return this.loops.get(name)?.gain;
  }

  setBedPosition(name: string, position: THREE.Vector3, scale: number): void {
    const loop = this.loops.get(name);
    if (loop?.panner) this.engine.setPannerPosition(loop.panner, position, this.listenerPos, scale);
  }

  /** Low capital-ship rumble: filtered brown noise plus a sub oscillator. */
  ensureCapitalRumble(): void {
    this.bed('destroyer', (ctx, out) => {
      const src = ctx.createBufferSource();
      src.buffer = this.engine.rumbleBuffer;
      src.loop = true;
      src.playbackRate.value = 0.55;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 160;
      lp.Q.value = 0.7;
      src.connect(lp);
      lp.connect(out);

      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = 33;
      const sg = ctx.createGain();
      sg.gain.value = 0.5;
      sub.connect(sg);
      sg.connect(out);
      sub.start();

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.09;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 22;
      lfo.connect(lfoGain);
      lfoGain.connect(lp.frequency);
      lfo.start();

      src.start();
      return { source: src, extra: [sub, lfo, lp] };
    }, { position: new THREE.Vector3(), spatialScale: 220, space: 'space' });
  }

  /** Higher, tighter corvette drive tone. */
  ensureRunnerEngine(): void {
    this.bed('runner', (ctx, out) => {
      const oscs: OscillatorNode[] = [];
      const src = ctx.createBufferSource();
      src.buffer = this.engine.rumbleBuffer;
      src.loop = true;
      src.playbackRate.value = 1.5;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 420;
      bp.Q.value = 0.9;
      src.connect(bp);
      bp.connect(out);
      src.start();

      for (const [f, level] of [[112, 0.24], [168, 0.13], [225, 0.07]] as const) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900;
        const g = ctx.createGain();
        g.gain.value = level;
        osc.connect(lp);
        lp.connect(g);
        g.connect(out);
        osc.start();
        oscs.push(osc);
      }
      return { source: src, extra: oscs };
    }, { position: new THREE.Vector3(), spatialScale: 90, space: 'space' });
  }

  /** Corridor alarm: a two-tone klaxon on a slow cycle. */
  ensureAlarm(): void {
    this.bed('alarm', (ctx, out) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 520;
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 0.55;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 96;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900;
      bp.Q.value = 3.4;

      // Pulse the level so the klaxon breathes rather than drones.
      const pulse = ctx.createGain();
      pulse.gain.value = 0.5;
      const pulseLfo = ctx.createOscillator();
      pulseLfo.type = 'sine';
      pulseLfo.frequency.value = 1.1;
      const pulseGain = ctx.createGain();
      pulseGain.gain.value = 0.42;
      pulseLfo.connect(pulseGain);
      pulseGain.connect(pulse.gain);

      osc.connect(bp);
      bp.connect(pulse);
      pulse.connect(out);
      osc.start();
      lfo.start();
      pulseLfo.start();
      return { source: [osc, lfo, pulseLfo], extra: [bp, pulse] };
    }, { space: 'room' });
  }

  /**
   * Original respirator rhythm for the dark lord: band-limited noise gated by a
   * slow asymmetric envelope. Constructed from scratch, not sampled.
   */
  ensureRespirator(): void {
    this.bed('respirator', (ctx, out) => {
      const src = ctx.createBufferSource();
      src.buffer = this.engine.noiseBuffer;
      src.loop = true;
      src.playbackRate.value = 0.45;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 340;
      bp.Q.value = 1.1;

      const shaper = ctx.createWaveShaper();
      shaper.curve = this.engine.saturation;

      // 3.6 s cycle: a slow inhale, a pause, a longer exhale.
      const gate = ctx.createGain();
      gate.gain.value = 0.001;
      const period = 3.6;
      const start = ctx.currentTime;
      for (let i = 0; i < 400; i++) {
        const t = start + i * period;
        gate.gain.setValueAtTime(0.02, t);
        gate.gain.linearRampToValueAtTime(0.85, t + 0.55);
        gate.gain.linearRampToValueAtTime(0.1, t + 1.15);
        gate.gain.setValueAtTime(0.06, t + 1.5);
        gate.gain.linearRampToValueAtTime(0.62, t + 2.15);
        gate.gain.linearRampToValueAtTime(0.02, t + 3.1);
      }

      // Sweep the filter with the cycle so inhale and exhale differ in colour.
      const sweep = ctx.createOscillator();
      sweep.type = 'sine';
      sweep.frequency.value = 1 / period;
      const sweepGain = ctx.createGain();
      sweepGain.gain.value = 150;
      sweep.connect(sweepGain);
      sweepGain.connect(bp.frequency);
      sweep.start();

      src.connect(bp);
      bp.connect(shaper);
      shaper.connect(gate);
      gate.connect(out);
      src.start();
      return { source: src, extra: [sweep, gate, bp, shaper] };
    }, { space: 'room' });
  }

  /** Atmospheric entry: a big, filtered roar that builds. */
  ensureReentry(): void {
    this.bed('reentry', (ctx, out) => {
      const src = ctx.createBufferSource();
      src.buffer = this.engine.rumbleBuffer;
      src.loop = true;
      src.playbackRate.value = 0.85;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 40;
      src.connect(hp);
      hp.connect(lp);
      lp.connect(out);
      src.start();
      return { source: src, extra: [lp, hp] };
    }, { space: 'none' });
  }

  /** Silence and release every bed - used when the experience is torn down. */
  stopAll(): void {
    for (const [, loop] of this.loops) {
      loop.gain.gain.setTargetAtTime(0, this.engine.ctx.currentTime, 0.1);
    }
  }
}
