import * as THREE from 'three';
import type { AudioBus, LoopName, MusicMood, SfxName } from './AudioTypes';
import { makeNoiseBuffers, playSfx, type SfxContext } from './Sfx';
import { MusicEngine } from './Music';
import { NARRATION, type NarrationLine } from '../timeline/Script';
import { clamp } from '../core/MathX';

/**
 * Web Audio front end.
 *
 * Signal flow:
 *   sources -> (panner) -> bus gain -> master gain -> compressor -> limiter
 * Four independent bus gains (master, music, effects, narration) are exposed
 * to the interface, and narration ducks the music automatically.
 */

export interface MixerLevels {
  master: number;
  music: number;
  effects: number;
  narration: number;
}

interface LoopVoice {
  gain: GainNode;
  target: number;
  current: number;
  nodes: AudioScheduledSourceNode[];
  extra?: (t: number) => void;
}

export class AudioEngine implements AudioBus {
  readonly ctx: AudioContext;
  private master: GainNode;
  private musicBus: GainNode;
  private sfxBus: GainNode;
  private narrationBus: GainNode;
  private musicDuck: GainNode;
  private compressor: DynamicsCompressorNode;
  private limiter: WaveShaperNode;
  private sfxContext: SfxContext;
  private score: MusicEngine;
  private loops = new Map<LoopName, LoopVoice>();
  private levels: MixerLevels = { master: 0.85, music: 0.62, effects: 0.8, narration: 1.0 };
  private spatialScale = 1;
  private cameraQuatInverse = new THREE.Quaternion();
  private cameraPosition = new THREE.Vector3();
  private narrationBuffers = new Map<string, AudioBuffer>();
  private narrationDurations = new Map<string, number>();
  private activeNarration: AudioBufferSourceNode | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private duckTarget = 1;
  private duckCurrent = 1;
  private lastSfxAt = new Map<string, number>();
  /** True when pre-generated narration audio was found. */
  generatedNarrationAvailable = false;
  speechSynthesisAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
  private suspended = false;

  constructor() {
    const Ctor: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor({ latencyHint: 'interactive' });

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 24;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.22;

    // Final soft clip so nothing can spike into the red.
    this.limiter = this.ctx.createWaveShaper();
    this.limiter.curve = makeSoftClipCurve();
    this.limiter.oversample = '2x';

    this.master = this.ctx.createGain();
    this.master.gain.value = this.levels.master;
    this.master.connect(this.compressor).connect(this.limiter).connect(this.ctx.destination);

    this.musicDuck = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.narrationBus = this.ctx.createGain();
    this.musicBus.gain.value = this.levels.music;
    this.sfxBus.gain.value = this.levels.effects;
    this.narrationBus.gain.value = this.levels.narration;
    this.musicBus.connect(this.musicDuck).connect(this.master);
    this.sfxBus.connect(this.master);
    this.narrationBus.connect(this.master);

    const { white, pink } = makeNoiseBuffers(this.ctx);
    this.sfxContext = { ctx: this.ctx, noise: white, pinkNoise: pink };
    this.score = new MusicEngine(this.ctx, this.musicBus, white);

    const listener = this.ctx.listener;
    if (listener.forwardX) {
      listener.forwardX.value = 0;
      listener.forwardY.value = 0;
      listener.forwardZ.value = -1;
      listener.upX.value = 0;
      listener.upY.value = 1;
      listener.upZ.value = 0;
      listener.positionX.value = 0;
      listener.positionY.value = 0;
      listener.positionZ.value = 0;
    } else {
      listener.setOrientation?.(0, 0, -1, 0, 1, 0);
      listener.setPosition?.(0, 0, 0);
    }
  }

  async resume(): Promise<void> {
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  setSuspended(v: boolean): void {
    this.suspended = v;
    if (v && this.ctx.state === 'running') void this.ctx.suspend();
    if (!v && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  get isSuspended(): boolean {
    return this.suspended;
  }

  /* -------------------------------------------------------------- mixer */

  setLevel(bus: keyof MixerLevels, value: number): void {
    this.levels[bus] = clamp(value, 0, 1);
    const now = this.ctx.currentTime;
    const ramp = (node: GainNode, v: number): void => {
      node.gain.cancelScheduledValues(now);
      node.gain.setTargetAtTime(v, now, 0.05);
    };
    ramp(this.master, this.levels.master);
    ramp(this.musicBus, this.levels.music);
    ramp(this.sfxBus, this.levels.effects);
    ramp(this.narrationBus, this.levels.narration);
  }

  getLevels(): MixerLevels {
    return { ...this.levels };
  }

  /* ------------------------------------------------------------ spatial */

  updateListener(camera: THREE.Camera, spatialScale: number): void {
    camera.getWorldPosition(this.cameraPosition);
    camera.getWorldQuaternion(this.cameraQuatInverse);
    this.cameraQuatInverse.invert();
    this.spatialScale = spatialScale;
  }

  private makePanner(worldPosition: THREE.Vector3): PannerNode {
    const p = this.ctx.createPanner();
    p.panningModel = 'equalpower';
    p.distanceModel = 'inverse';
    p.refDistance = 6;
    p.maxDistance = 400;
    p.rolloffFactor = 1.1;
    const rel = worldPosition.clone().sub(this.cameraPosition).applyQuaternion(this.cameraQuatInverse);
    rel.multiplyScalar(this.spatialScale);
    const len = rel.length();
    if (len > 380) rel.multiplyScalar(380 / len);
    if (p.positionX) {
      p.positionX.value = rel.x;
      p.positionY.value = rel.y;
      p.positionZ.value = rel.z;
    } else {
      p.setPosition?.(rel.x, rel.y, rel.z);
    }
    return p;
  }

  /* ---------------------------------------------------------------- sfx */

  sfx(name: SfxName, options?: { position?: THREE.Vector3; gain?: number; rate?: number }): void {
    if (this.ctx.state !== 'running') return;
    // Throttle identical effects so a dense volley cannot stack into a wall.
    const now = this.ctx.currentTime;
    const last = this.lastSfxAt.get(name) ?? -1;
    if (now - last < 0.035) return;
    this.lastSfxAt.set(name, now);

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = options?.gain ?? 1;
    if (options?.position) {
      const panner = this.makePanner(options.position);
      gainNode.connect(panner).connect(this.sfxBus);
    } else {
      gainNode.connect(this.sfxBus);
    }
    playSfx(this.sfxContext, name, gainNode, now + 0.012, options?.rate ?? 1);
  }

  /* -------------------------------------------------------------- loops */

  loop(name: LoopName, gain: number, options?: { position?: THREE.Vector3; rate?: number }): void {
    void options;
    if (this.ctx.state !== 'running') return;
    let voice = this.loops.get(name);
    if (!voice) {
      const built = this.buildLoop(name);
      if (!built) return;
      voice = built;
      this.loops.set(name, voice);
    }
    voice.target = clamp(gain, 0, 1.4);
  }

  private buildLoop(name: LoopName): LoopVoice | null {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.sfxBus);
    const nodes: AudioScheduledSourceNode[] = [];
    const now = ctx.currentTime;

    const noise = (buffer: AudioBuffer): AudioBufferSourceNode => {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.start(now);
      nodes.push(src);
      return src;
    };
    const tone = (type: OscillatorType, freq: number): OscillatorNode => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.start(now);
      nodes.push(o);
      return o;
    };

    switch (name) {
      case 'destroyerRumble': {
        const n = noise(this.sfxContext.pinkNoise);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 90;
        f.Q.value = 0.7;
        n.connect(f).connect(gain);
        const sub = tone('sine', 27);
        const sg = ctx.createGain();
        sg.gain.value = 0.55;
        sub.connect(sg).connect(gain);
        const sub2 = tone('sine', 41);
        const sg2 = ctx.createGain();
        sg2.gain.value = 0.22;
        sub2.connect(sg2).connect(gain);
        break;
      }
      case 'runnerEngine': {
        const o = tone('sawtooth', 118);
        const o2 = tone('sawtooth', 176);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 620;
        f.Q.value = 1.4;
        const og = ctx.createGain();
        og.gain.value = 0.16;
        o.connect(og).connect(f);
        const og2 = ctx.createGain();
        og2.gain.value = 0.08;
        o2.connect(og2).connect(f);
        const n = noise(this.sfxContext.noise);
        const nf = ctx.createBiquadFilter();
        nf.type = 'bandpass';
        nf.frequency.value = 1400;
        nf.Q.value = 0.8;
        const ng = ctx.createGain();
        ng.gain.value = 0.24;
        n.connect(nf).connect(ng).connect(f);
        f.connect(gain);
        break;
      }
      case 'corridorTone': {
        const n = noise(this.sfxContext.pinkNoise);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 320;
        const ng = ctx.createGain();
        ng.gain.value = 0.5;
        n.connect(f).connect(ng).connect(gain);
        const hum = tone('sine', 58);
        const hg = ctx.createGain();
        hg.gain.value = 0.1;
        hum.connect(hg).connect(gain);
        break;
      }
      case 'alarmLoop': {
        const o = tone('square', 620);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 1300;
        const amp = ctx.createGain();
        amp.gain.value = 0;
        const lfo = tone('square', 0.62);
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.075;
        const offset = ctx.createConstantSource();
        offset.offset.value = 0.075;
        offset.start(now);
        nodes.push(offset);
        lfo.connect(lfoGain).connect(amp.gain);
        offset.connect(amp.gain);
        // Slow pitch alternation between the two alarm tones.
        const pitchLfo = tone('square', 0.62);
        const pitchGain = ctx.createGain();
        pitchGain.gain.value = 70;
        pitchLfo.connect(pitchGain).connect(o.frequency);
        o.connect(f).connect(amp).connect(gain);
        break;
      }
      case 'fire': {
        const n = noise(this.sfxContext.noise);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 640;
        f.Q.value = 0.6;
        const ng = ctx.createGain();
        ng.gain.value = 0.5;
        n.connect(f).connect(ng).connect(gain);
        break;
      }
      case 'podEngine': {
        const n = noise(this.sfxContext.noise);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 900;
        f.Q.value = 0.8;
        const ng = ctx.createGain();
        ng.gain.value = 0.42;
        n.connect(f).connect(ng).connect(gain);
        const o = tone('sawtooth', 168);
        const og = ctx.createGain();
        og.gain.value = 0.08;
        o.connect(og).connect(gain);
        break;
      }
      case 'entryRumble': {
        const n = noise(this.sfxContext.pinkNoise);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 400;
        const ng = ctx.createGain();
        ng.gain.value = 0.85;
        n.connect(f).connect(ng).connect(gain);
        const sub = tone('sine', 36);
        const sg = ctx.createGain();
        sg.gain.value = 0.35;
        sub.connect(sg).connect(gain);
        break;
      }
      case 'respirator': {
        // Original mechanical breathing rhythm: a slow filtered noise swell
        // in and out. Deliberately not modelled on any recording.
        const n = noise(this.sfxContext.noise);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 520;
        f.Q.value = 1.9;
        const amp = ctx.createGain();
        amp.gain.value = 0;
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.33;
        lfo.start(now);
        nodes.push(lfo);
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.5;
        const offset = ctx.createConstantSource();
        offset.offset.value = 0.5;
        offset.start(now);
        nodes.push(offset);
        lfo.connect(lfoGain).connect(amp.gain);
        offset.connect(amp.gain);
        const sweep = ctx.createOscillator();
        sweep.type = 'sine';
        sweep.frequency.value = 0.33;
        sweep.start(now);
        nodes.push(sweep);
        const sweepGain = ctx.createGain();
        sweepGain.gain.value = 260;
        sweep.connect(sweepGain).connect(f.frequency);
        n.connect(f).connect(amp).connect(gain);
        break;
      }
      default:
        return null;
    }
    return { gain, target: 0, current: 0, nodes };
  }

  /* -------------------------------------------------------------- music */

  music(mood: MusicMood, intensity: number): void {
    this.score.setMood(mood, intensity);
  }

  /* ---------------------------------------------------------- narration */

  async preloadNarration(onProgress?: (loaded: number, total: number) => void): Promise<void> {
    const total = NARRATION.length;
    let loaded = 0;
    // A manifest is written by scripts/generate-narration.mjs. If it is not
    // present the engine falls back to browser speech synthesis.
    let manifest: Record<string, string> | null = null;
    try {
      const res = await fetch('audio/narration/manifest.json', { cache: 'no-cache' });
      if (res.ok) manifest = (await res.json()) as Record<string, string>;
    } catch {
      manifest = null;
    }
    if (!manifest) {
      onProgress?.(total, total);
      return;
    }
    await Promise.all(
      NARRATION.map(async (line) => {
        const file = manifest?.[line.id];
        if (!file) {
          loaded++;
          onProgress?.(loaded, total);
          return;
        }
        try {
          const res = await fetch(`audio/narration/${file}`, { cache: 'force-cache' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const bytes = await res.arrayBuffer();
          const buffer = await this.ctx.decodeAudioData(bytes);
          this.narrationBuffers.set(line.id, buffer);
          this.narrationDurations.set(line.id, buffer.duration);
          this.generatedNarrationAvailable = true;
        } catch {
          /* fall back to synthesis for this line */
        }
        loaded++;
        onProgress?.(loaded, total);
      }),
    );
  }

  /** Duration used to time subtitles. */
  durationFor(line: NarrationLine): number {
    return this.narrationDurations.get(line.id) ?? line.estimate;
  }

  narrate(lineId: string): void {
    const line = NARRATION.find((l) => l.id === lineId);
    if (!line) return;
    this.stopNarration();
    const buffer = this.narrationBuffers.get(lineId);
    this.duckTarget = 0.42;
    if (buffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const g = this.ctx.createGain();
      g.gain.value = line.speaker === 'narrator' ? 1 : 0.94;
      src.connect(g).connect(this.narrationBus);
      src.start();
      src.onended = () => {
        if (this.activeNarration === src) {
          this.activeNarration = null;
          this.duckTarget = 1;
        }
      };
      this.activeNarration = src;
    } else if (this.speechSynthesisAvailable) {
      this.speak(line);
    } else {
      this.duckTarget = 1;
    }
  }

  private speak(line: NarrationLine): void {
    try {
      const u = new SpeechSynthesisUtterance(line.text);
      const voices = window.speechSynthesis.getVoices();
      // Prefer a neutral, non-localised English voice.
      const preferred =
        voices.find((v) => /en-GB/i.test(v.lang) && /male|daniel|arthur/i.test(v.name)) ??
        voices.find((v) => /en-GB/i.test(v.lang)) ??
        voices.find((v) => /en[-_]US/i.test(v.lang)) ??
        voices.find((v) => v.lang.startsWith('en')) ??
        null;
      if (preferred) u.voice = preferred;
      u.rate = line.speaker === 'narrator' ? 0.9 : 1.0;
      u.pitch = line.speaker === 'princess' ? 1.25 : line.speaker === 'officer' ? 0.85 : 0.92;
      u.volume = clamp(this.levels.narration * this.levels.master, 0, 1);
      u.onend = () => {
        this.activeUtterance = null;
        this.duckTarget = 1;
      };
      this.activeUtterance = u;
      window.speechSynthesis.speak(u);
    } catch {
      this.duckTarget = 1;
    }
  }

  stopNarration(): void {
    if (this.activeNarration) {
      try {
        this.activeNarration.onended = null;
        this.activeNarration.stop();
      } catch {
        /* already finished */
      }
      this.activeNarration = null;
    }
    if (this.activeUtterance && this.speechSynthesisAvailable) {
      window.speechSynthesis.cancel();
      this.activeUtterance = null;
    }
    this.duckTarget = 1;
  }

  resetTransients(): void {
    this.stopNarration();
    this.loops.forEach((voice) => {
      voice.target = 0;
    });
  }

  /* ------------------------------------------------------------- update */

  update(dt: number): void {
    if (this.ctx.state !== 'running') return;
    this.score.update();
    const now = this.ctx.currentTime;
    const k = 1 - Math.exp(-6 * dt);
    this.loops.forEach((voice) => {
      voice.current += (voice.target - voice.current) * k;
      voice.gain.gain.setTargetAtTime(Math.max(0.0001, voice.current), now, 0.06);
    });
    this.duckCurrent += (this.duckTarget - this.duckCurrent) * (1 - Math.exp(-4 * dt));
    this.musicDuck.gain.setTargetAtTime(this.duckCurrent, now, 0.08);
  }

  get isNarrating(): boolean {
    return this.activeNarration !== null || this.activeUtterance !== null;
  }
}

function makeSoftClipCurve(): Float32Array<ArrayBuffer> {
  const n = 2048;
  const curve = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 1.35) / Math.tanh(1.35);
  }
  return curve;
}
