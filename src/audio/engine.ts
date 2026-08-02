/**
 * Audio engine.
 *
 * Everything you hear is synthesised at run time from oscillators and noise
 * buffers — there are no sampled recordings in this project. The graph is:
 *
 *   [music]    ─┐
 *   [effects]  ─┼─► master gain ─► compressor ─► hard limiter ─► destination
 *   [narration]─┘
 *
 * Diegetic effects are routed through `PannerNode`s so they move with the
 * camera. The limiter is a second, faster compressor with a very high ratio;
 * between the two, the master output cannot produce a painful peak regardless
 * of how many events fire at once.
 */

export type Bus = 'music' | 'sfx' | 'narration';

export interface MixLevels {
  master: number;
  music: number;
  sfx: number;
  narration: number;
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private compressor!: DynamicsCompressorNode;
  private limiter!: DynamicsCompressorNode;
  private busGains: Record<Bus, GainNode> = {} as Record<Bus, GainNode>;
  /** Effects that should be positioned in the world connect here. */
  private spatialOut!: GainNode;
  private analyser!: AnalyserNode;

  private levels: MixLevels = { master: 0.85, music: 0.62, sfx: 0.78, narration: 1 };
  private noiseBuffers = new Map<string, AudioBuffer>();
  private started = false;
  private suspendedByTab = false;

  /** True once the context is running and the graph is built. */
  get ready(): boolean {
    return this.started && !!this.ctx && this.ctx.state === 'running';
  }

  /** True once the graph exists, whether or not it is running. */
  get built(): boolean {
    return !!this.ctx;
  }

  get currentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  /**
   * Build the graph without resuming it.
   *
   * A suspended context can still decode audio, so narration is decoded during
   * loading and the context is only resumed later, inside the user gesture
   * that the autoplay policy requires.
   */
  prepare(): boolean {
    if (this.ctx) return true;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return false;
      const ctx = new Ctor({ latencyHint: 'interactive' });
      this.ctx = ctx;

      this.limiter = ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -1.5;
      this.limiter.knee.value = 0;
      this.limiter.ratio.value = 20;
      this.limiter.attack.value = 0.001;
      this.limiter.release.value = 0.08;
      this.limiter.connect(ctx.destination);

      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -16;
      this.compressor.knee.value = 22;
      this.compressor.ratio.value = 3.2;
      this.compressor.attack.value = 0.008;
      this.compressor.release.value = 0.24;
      this.compressor.connect(this.limiter);

      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.connect(this.compressor);

      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = this.levels.master;
      this.masterGain.connect(this.analyser);

      for (const bus of ['music', 'sfx', 'narration'] as Bus[]) {
        const g = ctx.createGain();
        g.gain.value = this.levels[bus];
        g.connect(this.masterGain);
        this.busGains[bus] = g;
      }

      this.spatialOut = ctx.createGain();
      this.spatialOut.gain.value = 1;
      this.spatialOut.connect(this.busGains.sfx);

      if (ctx.listener.forwardX) {
        ctx.listener.forwardX.value = 0;
        ctx.listener.forwardY.value = 0;
        ctx.listener.forwardZ.value = -1;
        ctx.listener.upX.value = 0;
        ctx.listener.upY.value = 1;
        ctx.listener.upZ.value = 0;
      }

      return true;
    } catch {
      this.ctx = null;
      return false;
    }
  }

  /** Must be called from a user gesture. Safe to call more than once. */
  async start(): Promise<boolean> {
    if (!this.ctx && !this.prepare()) return false;
    const ctx = this.ctx!;
    try {
      if (ctx.state !== 'running') await ctx.resume();
    } catch {
      return false;
    }
    this.started = true;
    return ctx.state === 'running';
  }

  setLevel(bus: keyof MixLevels, value: number): void {
    this.levels[bus] = Math.max(0, Math.min(1, value));
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (bus === 'master') {
      this.masterGain?.gain.setTargetAtTime(this.levels.master, t, 0.03);
    } else {
      this.busGains[bus]?.gain.setTargetAtTime(this.levels[bus], t, 0.03);
    }
  }

  getLevels(): MixLevels {
    return { ...this.levels };
  }

  bus(name: Bus): GainNode {
    return this.busGains[name];
  }

  /** Destination for effects that should be positioned in the world. */
  get spatialDestination(): GainNode {
    return this.spatialOut;
  }

  /** Peak level of the master bus in [0,1]; used by the diagnostics overlay. */
  peakLevel(): number {
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    let peak = 0;
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128) / 128);
    return peak;
  }

  /** Move the Web Audio listener to match the render camera. */
  updateListener(
    px: number, py: number, pz: number,
    fx: number, fy: number, fz: number,
    ux: number, uy: number, uz: number,
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const l = ctx.listener;
    const t = ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(px, t, 0.02);
      l.positionY.setTargetAtTime(py, t, 0.02);
      l.positionZ.setTargetAtTime(pz, t, 0.02);
      l.forwardX.setTargetAtTime(fx, t, 0.02);
      l.forwardY.setTargetAtTime(fy, t, 0.02);
      l.forwardZ.setTargetAtTime(fz, t, 0.02);
      l.upX.setTargetAtTime(ux, t, 0.02);
      l.upY.setTargetAtTime(uy, t, 0.02);
      l.upZ.setTargetAtTime(uz, t, 0.02);
    } else {
      // Deprecated API, still the only one on some browsers.
      (l as unknown as { setPosition(x: number, y: number, z: number): void }).setPosition(px, py, pz);
      (l as unknown as { setOrientation(...a: number[]): void }).setOrientation(fx, fy, fz, ux, uy, uz);
    }
  }

  /**
   * A cached noise buffer. `kind` selects the spectrum:
   * white (flat), pink (−3 dB/oct) or brown (−6 dB/oct, the rumble source).
   */
  noise(kind: 'white' | 'pink' | 'brown' = 'white', seconds = 2): AudioBuffer {
    const key = `${kind}:${seconds}`;
    const hit = this.noiseBuffers.get(key);
    if (hit) return hit;
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    if (kind === 'white') {
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } else if (kind === 'pink') {
      // Voss–McCartney style approximation with three running averages.
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099046;
        b1 = 0.963 * b1 + w * 0.2965164;
        b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.22;
      }
    } else {
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.2;
      }
    }
    this.noiseBuffers.set(key, buf);
    return buf;
  }

  /** Short helper: an oscillator with an ADSR-ish gain envelope. */
  tone(
    o: {
      type?: OscillatorType;
      freq: number;
      to?: AudioNode;
      start?: number;
      attack?: number;
      hold?: number;
      release?: number;
      gain?: number;
      detune?: number;
      glideTo?: number;
      glideTime?: number;
    },
  ): { osc: OscillatorNode; gain: GainNode } | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const t0 = o.start ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(Math.max(1, o.freq), t0);
    if (o.detune) osc.detune.value = o.detune;
    if (o.glideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.glideTo), t0 + (o.glideTime ?? 0.2));
    }
    const g = ctx.createGain();
    const peak = o.gain ?? 0.2;
    const a = o.attack ?? 0.01;
    const h = o.hold ?? 0.1;
    const r = o.release ?? 0.2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    g.gain.setValueAtTime(Math.max(0.0002, peak), t0 + a + h);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + h + r);
    osc.connect(g);
    g.connect(o.to ?? this.busGains.sfx);
    osc.start(t0);
    osc.stop(t0 + a + h + r + 0.05);
    return { osc, gain: g };
  }

  /** Filtered noise burst — the basis of impacts, sparks and breaches. */
  noiseBurst(o: {
    to?: AudioNode;
    start?: number;
    duration?: number;
    gain?: number;
    type?: BiquadFilterType;
    freq?: number;
    freqTo?: number;
    q?: number;
    kind?: 'white' | 'pink' | 'brown';
    attack?: number;
  }): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = o.start ?? ctx.currentTime;
    const dur = o.duration ?? 0.3;
    const src = ctx.createBufferSource();
    src.buffer = this.noise(o.kind ?? 'white', 2);
    src.loop = true;
    // A random read offset stops repeated bursts sounding identical.
    const offset = Math.random() * 1.5;

    const filter = ctx.createBiquadFilter();
    filter.type = o.type ?? 'bandpass';
    filter.frequency.setValueAtTime(Math.max(20, o.freq ?? 900), t0);
    if (o.freqTo) filter.frequency.exponentialRampToValueAtTime(Math.max(20, o.freqTo), t0 + dur);
    filter.Q.value = o.q ?? 1;

    const g = ctx.createGain();
    const peak = o.gain ?? 0.25;
    const atk = o.attack ?? 0.004;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(filter);
    filter.connect(g);
    g.connect(o.to ?? this.busGains.sfx);
    src.start(t0, offset);
    src.stop(t0 + dur + 0.05);
  }

  /** Create a positioned node group; connect sources to the returned input. */
  panner(x: number, y: number, z: number, refDistance = 8, maxDistance = 400): { input: GainNode; node: PannerNode } | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const p = ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = refDistance;
    p.maxDistance = maxDistance;
    p.rolloffFactor = 1.1;
    if (p.positionX) {
      p.positionX.value = x;
      p.positionY.value = y;
      p.positionZ.value = z;
    } else {
      (p as unknown as { setPosition(x: number, y: number, z: number): void }).setPosition(x, y, z);
    }
    const input = ctx.createGain();
    input.connect(p);
    p.connect(this.spatialOut);
    return { input, node: p };
  }

  /** Convert a MIDI note number to Hz. */
  static mtof(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  suspendForHiddenTab(): void {
    if (this.ctx && this.ctx.state === 'running') {
      this.suspendedByTab = true;
      void this.ctx.suspend();
    }
  }

  resumeAfterHiddenTab(): void {
    if (this.ctx && this.suspendedByTab) {
      this.suspendedByTab = false;
      void this.ctx.resume();
    }
  }

  async dispose(): Promise<void> {
    if (this.ctx) {
      try {
        await this.ctx.close();
      } catch {
        /* already closed */
      }
    }
    this.ctx = null;
    this.started = false;
  }
}
