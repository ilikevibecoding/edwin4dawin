import * as THREE from 'three';
import { clamp } from '../core/mathx';
import { createImpulseResponse, createNoiseBuffer, createRumbleBuffer, createSaturationCurve } from './dsp';

export type BusName = 'music' | 'sfx' | 'narration';

export interface MixLevels {
  master: number;
  music: number;
  sfx: number;
  narration: number;
}

export const DEFAULT_MIX: MixLevels = { master: 0.85, music: 0.62, sfx: 0.8, narration: 1.0 };

/**
 * Audio backbone.
 *
 * Master chain: buses -> master gain -> gentle bus compressor -> brick-wall
 * limiter -> destination. The limiter is deliberately conservative: nothing in
 * this piece is allowed to reach an uncomfortable peak, even when a turbolaser
 * salvo, the score and the narrator all land on the same frame.
 *
 * Diegetic effects are routed through PannerNodes positioned in world space,
 * with the listener driven by the cinematic camera, so the mix genuinely
 * changes as the camera moves.
 */
export class AudioEngine {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  readonly buses: Record<BusName, GainNode>;
  readonly reverbSpace: ConvolverNode;
  readonly reverbRoom: ConvolverNode;
  readonly reverbSpaceSend: GainNode;
  readonly reverbRoomSend: GainNode;
  readonly noiseBuffer: AudioBuffer;
  readonly rumbleBuffer: AudioBuffer;
  readonly saturation: Float32Array<ArrayBuffer>;

  private compressor: DynamicsCompressorNode;
  private limiter: DynamicsCompressorNode;
  private analyser: AnalyserNode;
  private levels: MixLevels = { ...DEFAULT_MIX };
  private muted = false;
  private analyserData: Uint8Array<ArrayBuffer>;

  constructor() {
    const Ctor: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor({ latencyHint: 'interactive' });

    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -3.5;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.14;
    this.limiter.connect(this.ctx.destination);

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 22;
    this.compressor.ratio.value = 3.2;
    this.compressor.attack.value = 0.012;
    this.compressor.release.value = 0.28;
    this.compressor.connect(this.limiter);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyserData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    this.compressor.connect(this.analyser);

    this.master = this.ctx.createGain();
    this.master.gain.value = DEFAULT_MIX.master;
    this.master.connect(this.compressor);

    this.buses = {
      music: this.ctx.createGain(),
      sfx: this.ctx.createGain(),
      narration: this.ctx.createGain(),
    };
    this.buses.music.gain.value = DEFAULT_MIX.music;
    this.buses.sfx.gain.value = DEFAULT_MIX.sfx;
    this.buses.narration.gain.value = DEFAULT_MIX.narration;
    for (const bus of Object.values(this.buses)) bus.connect(this.master);

    // Two reverb characters: cold hall for exteriors, tight metal for interiors.
    this.reverbSpace = this.ctx.createConvolver();
    this.reverbSpace.buffer = createImpulseResponse(this.ctx, 3.4, 3.2, 0.62);
    this.reverbSpaceSend = this.ctx.createGain();
    this.reverbSpaceSend.gain.value = 0.34;
    this.reverbSpaceSend.connect(this.reverbSpace);
    this.reverbSpace.connect(this.master);

    this.reverbRoom = this.ctx.createConvolver();
    this.reverbRoom.buffer = createImpulseResponse(this.ctx, 1.15, 4.4, 0.42);
    this.reverbRoomSend = this.ctx.createGain();
    this.reverbRoomSend.gain.value = 0.3;
    this.reverbRoomSend.connect(this.reverbRoom);
    this.reverbRoom.connect(this.master);

    this.noiseBuffer = createNoiseBuffer(this.ctx, 3);
    this.rumbleBuffer = createRumbleBuffer(this.ctx, 5);
    this.saturation = createSaturationCurve(5.5);

    // A forgiving distance model: sound falls off but never disappears entirely.
    const l = this.ctx.listener;
    if (l.forwardX) {
      l.forwardX.value = 0;
      l.forwardY.value = 0;
      l.forwardZ.value = -1;
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    }
  }

  get state(): AudioContextState {
    return this.ctx.state;
  }

  async resume(): Promise<void> {
    if (this.ctx.state !== 'running') {
      try {
        await this.ctx.resume();
      } catch {
        /* Autoplay policy: caller retries on the next gesture. */
      }
    }
  }

  suspend(): void {
    if (this.ctx.state === 'running') void this.ctx.suspend();
  }

  get now(): number {
    return this.ctx.currentTime;
  }

  setLevel(name: keyof MixLevels, value: number): void {
    const v = clamp(value, 0, 1);
    this.levels[name] = v;
    const target = name === 'master' ? this.master : this.buses[name];
    const gain = this.muted && name === 'master' ? 0 : v;
    target.gain.setTargetAtTime(gain, this.ctx.currentTime, 0.05);
  }

  getLevels(): MixLevels {
    return { ...this.levels };
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.master.gain.setTargetAtTime(muted ? 0 : this.levels.master, this.ctx.currentTime, 0.04);
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /**
   * Create a spatialised output node. Diegetic sources connect to the returned
   * panner; `scale` compresses world distances so that kilometre-scale exterior
   * geometry still produces a sensible mix.
   */
  createPanner(scale = 1): PannerNode {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 8 * scale;
    p.maxDistance = 3000 * scale;
    p.rolloffFactor = 0.85;
    p.coneInnerAngle = 360;
    return p;
  }

  /** Position a panner from a world-space point, applying the given scale. */
  setPannerPosition(panner: PannerNode, position: THREE.Vector3, listenerPos: THREE.Vector3, scale: number): void {
    const dx = (position.x - listenerPos.x) / scale;
    const dy = (position.y - listenerPos.y) / scale;
    const dz = (position.z - listenerPos.z) / scale;
    const t = this.ctx.currentTime;
    if (panner.positionX) {
      panner.positionX.setValueAtTime(dx, t);
      panner.positionY.setValueAtTime(dy, t);
      panner.positionZ.setValueAtTime(dz, t);
    } else {
      panner.setPosition(dx, dy, dz);
    }
  }

  /**
   * Drive the listener from the camera. The listener stays at the origin and
   * sources are placed relative to it, which avoids float precision problems at
   * 100 km from the world origin.
   */
  updateListener(camera: THREE.Camera): void {
    const l = this.ctx.listener;
    const q = camera.getWorldQuaternion(new THREE.Quaternion());
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setValueAtTime(0, t);
      l.positionY.setValueAtTime(0, t);
      l.positionZ.setValueAtTime(0, t);
      l.forwardX.setValueAtTime(fwd.x, t);
      l.forwardY.setValueAtTime(fwd.y, t);
      l.forwardZ.setValueAtTime(fwd.z, t);
      l.upX.setValueAtTime(up.x, t);
      l.upY.setValueAtTime(up.y, t);
      l.upZ.setValueAtTime(up.z, t);
    } else {
      l.setPosition(0, 0, 0);
      l.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
    }
  }

  /** Peak level 0..1, used by the debug overlay to prove nothing is clipping. */
  get peak(): number {
    this.analyser.getByteTimeDomainData(this.analyserData);
    let peak = 0;
    for (let i = 0; i < this.analyserData.length; i++) {
      peak = Math.max(peak, Math.abs(this.analyserData[i] - 128) / 128);
    }
    return peak;
  }

  get reduction(): number {
    return this.limiter.reduction;
  }

  dispose(): void {
    void this.ctx.close();
  }
}
