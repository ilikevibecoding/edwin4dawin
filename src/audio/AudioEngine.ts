import * as THREE from 'three';
import { clamp01 } from '../core/math';

/**
 * Web Audio backbone.
 *
 * Signal flow:
 *   [music | sfx | narration] -> bus gain -> master gain -> compressor
 *   -> soft clipper -> destination
 *
 * Diegetic sounds are routed through a `PannerNode` first; the listener is
 * driven from the render camera every frame, so the mix genuinely changes with
 * viewpoint. The compressor and clipper together guarantee the output never
 * exceeds roughly -1 dBFS no matter how many impacts land at once.
 */

export type BusName = 'music' | 'sfx' | 'narration';

export interface AudioVolumes {
  master: number;
  music: number;
  sfx: number;
  narration: number;
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  buses!: Record<BusName, GainNode>;
  /** Shared plate-style reverb send, generated procedurally. */
  reverbSend!: GainNode;
  private compressor!: DynamicsCompressorNode;
  private clipper!: WaveShaperNode;
  private noiseBuffer!: AudioBuffer;
  private started = false;
  private volumes: AudioVolumes = { master: 0.85, music: 0.7, sfx: 0.8, narration: 1 };
  private suspended = false;
  private hrtf = false;

  private readonly camPos = new THREE.Vector3();
  private readonly camFwd = new THREE.Vector3();
  private readonly camUp = new THREE.Vector3();

  get ready(): boolean {
    return this.started && this.ctx !== null;
  }

  get currentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  /** Must be called from a user gesture. */
  async start(hrtf = false): Promise<boolean> {
    if (this.started) {
      await this.ctx?.resume();
      return true;
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor({ latencyHint: 'interactive' });
      await this.ctx.resume();
    } catch {
      this.ctx = null;
      return false;
    }
    this.hrtf = hrtf;
    const ctx = this.ctx;

    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 8;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.22;

    // Final safety clipper: a smooth tanh curve keeps transients from ever
    // reaching 0 dBFS, which is what makes a synthesised mix painful.
    this.clipper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 1.35) * 0.86;
    }
    this.clipper.curve = curve;
    this.clipper.oversample = '2x';

    this.master = ctx.createGain();
    this.master.gain.value = this.volumes.master;
    this.master.connect(this.compressor);
    this.compressor.connect(this.clipper);
    this.clipper.connect(ctx.destination);

    this.buses = {
      music: ctx.createGain(),
      sfx: ctx.createGain(),
      narration: ctx.createGain(),
    };
    this.buses.music.gain.value = this.volumes.music;
    this.buses.sfx.gain.value = this.volumes.sfx;
    this.buses.narration.gain.value = this.volumes.narration;
    for (const b of Object.values(this.buses)) b.connect(this.master);

    // Procedural reverb: exponentially decaying stereo noise.
    const convolver = ctx.createConvolver();
    convolver.buffer = this.buildImpulse(2.6, 2.4);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 1;
    this.reverbSend.connect(convolver);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    convolver.connect(wet);
    wet.connect(this.master);

    // Reusable white noise.
    const len = Math.floor(ctx.sampleRate * 2);
    this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    let seed = 0x1a2b3c4d;
    for (let i = 0; i < len; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      data[i] = (seed / 0xffffffff) * 2 - 1;
    }

    this.started = true;
    return true;
  }

  private buildImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    let seed = 0x7f4a7c15;
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const n = (seed / 0xffffffff) * 2 - 1;
        // Early build-up then exponential tail reads as a large hall.
        const build = Math.min(1, i / (rate * 0.02));
        d[i] = n * build * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  noiseSource(): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    return src;
  }

  setVolumes(v: Partial<AudioVolumes>): void {
    Object.assign(this.volumes, v);
    if (!this.ready) return;
    const t = this.ctx!.currentTime;
    this.master.gain.setTargetAtTime(clamp01(this.volumes.master), t, 0.04);
    this.buses.music.gain.setTargetAtTime(clamp01(this.volumes.music), t, 0.04);
    this.buses.sfx.gain.setTargetAtTime(clamp01(this.volumes.sfx), t, 0.04);
    this.buses.narration.gain.setTargetAtTime(clamp01(this.volumes.narration), t, 0.04);
  }

  getVolumes(): AudioVolumes {
    return { ...this.volumes };
  }

  /** Create a spatialised input node. Connect sources to the returned node. */
  createPanner(distanceRef = 8, maxDistance = 400, rolloff = 1.1): PannerNode {
    const p = this.ctx!.createPanner();
    p.panningModel = this.hrtf ? 'HRTF' : 'equalpower';
    p.distanceModel = 'inverse';
    p.refDistance = distanceRef;
    p.maxDistance = maxDistance;
    p.rolloffFactor = rolloff;
    return p;
  }

  setPannerPosition(panner: PannerNode, x: number, y: number, z: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (panner.positionX) {
      panner.positionX.setTargetAtTime(x, t, 0.02);
      panner.positionY.setTargetAtTime(y, t, 0.02);
      panner.positionZ.setTargetAtTime(z, t, 0.02);
    } else {
      (panner as unknown as { setPosition(x: number, y: number, z: number): void }).setPosition(x, y, z);
    }
  }

  /** Sync the Web Audio listener with the render camera. */
  updateListener(camera: THREE.Camera): void {
    if (!this.ready) return;
    const l = this.ctx!.listener;
    camera.getWorldPosition(this.camPos);
    camera.getWorldDirection(this.camFwd);
    this.camUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const t = this.ctx!.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(this.camPos.x, t, 0.03);
      l.positionY.setTargetAtTime(this.camPos.y, t, 0.03);
      l.positionZ.setTargetAtTime(this.camPos.z, t, 0.03);
      l.forwardX.setTargetAtTime(this.camFwd.x, t, 0.03);
      l.forwardY.setTargetAtTime(this.camFwd.y, t, 0.03);
      l.forwardZ.setTargetAtTime(this.camFwd.z, t, 0.03);
      l.upX.setTargetAtTime(this.camUp.x, t, 0.03);
      l.upY.setTargetAtTime(this.camUp.y, t, 0.03);
      l.upZ.setTargetAtTime(this.camUp.z, t, 0.03);
    } else {
      const legacy = l as unknown as {
        setPosition(x: number, y: number, z: number): void;
        setOrientation(fx: number, fy: number, fz: number, ux: number, uy: number, uz: number): void;
      };
      legacy.setPosition(this.camPos.x, this.camPos.y, this.camPos.z);
      legacy.setOrientation(
        this.camFwd.x, this.camFwd.y, this.camFwd.z,
        this.camUp.x, this.camUp.y, this.camUp.z,
      );
    }
  }

  /** Suspend the graph when the tab is hidden or playback is paused. */
  async setSuspended(suspend: boolean): Promise<void> {
    if (!this.ctx || this.suspended === suspend) return;
    this.suspended = suspend;
    try {
      if (suspend) await this.ctx.suspend();
      else await this.ctx.resume();
    } catch {
      /* ignore */
    }
  }

  get isSuspended(): boolean {
    return this.suspended;
  }
}
