/**
 * AudioEngine — the game's entire audio subsystem.
 *
 * Everything is synthesized offline into `AudioBuffer`s at `init` time (see
 * SoundBank) so gameplay only ever spawns cheap `AudioBufferSourceNode`s. The
 * engine owns the mixing graph (per-category buses → glue compressor → limiter),
 * HRTF spatialization with distance-based air absorption, a blended procedural
 * reverb, ducking, and the signature nearby-explosion tinnitus/TTS effect.
 *
 * It degrades gracefully: if Web Audio is unavailable or blocked, every public
 * method becomes a safe no-op and nothing throws or blocks `init`.
 */
import type * as THREE from 'three';
import type { Subsystem, EngineContext } from '../core/Engine';
import type { GameEvents } from '../core/Events';
import {
  buildSoundBank,
  bankSoundIds,
  type BankBuildResult,
  type OfflineCtor,
} from './SoundBank';
import { Reverb, type ReverbPreset } from './Reverb';
import { mulberry32, type Rng } from './SynthLab';

export type BusName = 'sfx' | 'weapons' | 'explosions' | 'ui' | 'ambience' | 'music';

export interface PlayOptions {
  gain?: number;
  /** Playback rate multiplier (also affects pitch). */
  rate?: number;
  /** Extra detune in cents. */
  detune?: number;
  category?: BusName;
  loop?: boolean;
  /** Force a specific baked variant instead of a random one. */
  variant?: number;
  /** Stereo pan for non-positional sounds, -1..1. */
  pan?: number;
  /** Reverb send amount 0..1. */
  reverb?: number;
  /** Occlusion amount 0..1 (lowpass + attenuation). */
  occlusion?: number;
  /** Apply small random pitch/gain jitter (default true). */
  jitter?: boolean;
  /** Fade-in seconds. */
  fadeIn?: number;
  /** Schedule the sound `when` seconds into the future. */
  when?: number;
  /** Relative playback priority; higher survives voice stealing. */
  priority?: number;
}

export interface PlayAtOptions extends PlayOptions {
  refDistance?: number;
  rolloff?: number;
  maxDistance?: number;
}

export interface PlayHandle {
  readonly id: number;
}

interface Voice {
  id: number;
  source: AudioBufferSourceNode;
  gain: GainNode;
  baseGain: number;
  airLP: BiquadFilterNode | null;
  panner: PannerNode | null;
  send: GainNode | null;
  category: BusName;
  priority: number;
  startedAt: number;
  loop: boolean;
  occlusion: number;
  distance: number;
  nodes: AudioNode[];
  handle: PlayHandle;
}

const MAX_VOICES = 48;
const AIR_MIN_CUTOFF = 700;
const AIR_MAX_CUTOFF = 20000;

/** Base mix level per bus, before the user volume multipliers. */
const BUS_LEVELS: Record<BusName, number> = {
  weapons: 1.0,
  explosions: 1.0,
  sfx: 0.9,
  ui: 0.85,
  ambience: 0.6,
  music: 0.7,
};

/** Which reverb preset the "enclosed" end of the indoor blend uses. */
const INDOOR_PRESET: ReverbPreset = 'street_canyon';
const OUTDOOR_PRESET: ReverbPreset = 'outdoor_open';

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export class AudioEngine implements Subsystem {
  readonly name = 'audio';
  readonly order = 90;

  /** True only when a usable AudioContext + sound bank exist. */
  available = false;
  /** Populated after the bank is built; safe to read for diagnostics. */
  bankStats: BankBuildResult | null = null;

  private ctx: AudioContext | null = null;
  private bank = new Map<string, AudioBuffer[]>();

  // Mixing graph.
  private buses: Record<BusName, GainNode> | null = null;
  private sfxGroup: GainNode | null = null;
  private musicGroup: GainNode | null = null;
  private colorFilter: BiquadFilterNode | null = null;
  private duckAll: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private busComp: DynamicsCompressorNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;

  // Reverb.
  private reverbInput: GainNode | null = null;
  private convolverA: ConvolverNode | null = null;
  private convolverB: ConvolverNode | null = null;
  private wetA: GainNode | null = null;
  private wetB: GainNode | null = null;
  private reverbReturn: GainNode | null = null;

  // Tinnitus tone (created lazily, reused).
  private tinnitusOsc: OscillatorNode | null = null;
  private tinnitusGain: GainNode | null = null;
  private tinnitusActive = false;

  private voices = new Map<number, Voice>();
  private nextId = 1;
  private rng: Rng = mulberry32(0xa11ce);

  private events: EngineContext['events'] | null = null;
  private settings: EngineContext['settings'] | null = null;
  private camera: THREE.Camera | null = null;
  private listenerPos = { x: 0, y: 0, z: 0 };

  private indoor = 0;
  private underwater = false;
  private tinnitusTarget = AIR_MAX_CUTOFF;

  // Adaptive music.
  private combatIntensity = 0;
  private ambienceHandle: PlayHandle | null = null;
  private musicCalm: Voice | null = null;
  private musicCombat: Voice | null = null;

  private unsubs: Array<() => void> = [];
  private gestureBound = false;
  private disposed = false;

  // ------------------------------------------------------------------ init

  async init(ctx: EngineContext): Promise<void> {
    this.events = ctx.events;
    this.settings = ctx.settings;
    this.camera = ctx.camera;

    if (!this.createContext()) {
      // No audio available (headless / blocked). Still safe; just silent.
      this.subscribe();
      return;
    }

    try {
      await this.buildBank();
      this.buildGraph();
      this.available = true;
    } catch (err) {
      console.warn('[audio] init failed, running silent:', err);
      this.available = false;
    }

    this.subscribe();
    this.bindGesture();
  }

  private createContext(): boolean {
    try {
      const Ctor: typeof AudioContext | undefined =
        (typeof AudioContext !== 'undefined' && AudioContext) ||
        (typeof window !== 'undefined' && (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) ||
        undefined;
      if (!Ctor) return false;
      this.ctx = new Ctor({ latencyHint: 'interactive' });
      return true;
    } catch {
      this.ctx = null;
      return false;
    }
  }

  private getOfflineCtor(): OfflineCtor | null {
    const g = globalThis as unknown as {
      OfflineAudioContext?: OfflineCtor;
      webkitOfflineAudioContext?: OfflineCtor;
    };
    return g.OfflineAudioContext ?? g.webkitOfflineAudioContext ?? null;
  }

  private async buildBank(): Promise<void> {
    const OfflineCtor = this.getOfflineCtor();
    if (!OfflineCtor || !this.ctx) throw new Error('OfflineAudioContext unavailable');
    const sampleRate = this.ctx.sampleRate || 44100;
    const result = await buildSoundBank({
      OfflineCtor,
      sampleRate,
      timeoutMs: 6000,
      concurrency: 24,
    });
    this.bank = result.bank;
    this.bankStats = result;
    const mb = (result.totalBytes / (1024 * 1024)).toFixed(1);
    console.info(
      `[audio] bank built in ${result.buildMs.toFixed(0)}ms — ${result.ids.length} ids, ` +
        `${result.variantCount} buffers, ${mb} MB` +
        (result.silent.length ? `, SILENT: ${result.silent.join(', ')}` : '')
    );
  }

  private buildGraph(): void {
    const ctx = this.ctx!;
    // Master chain: color -> duck -> master -> glue comp -> limiter -> out.
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -2;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.08;
    this.limiter.connect(ctx.destination);

    this.busComp = ctx.createDynamicsCompressor();
    this.busComp.threshold.value = -18;
    this.busComp.knee.value = 30;
    this.busComp.ratio.value = 2.5;
    this.busComp.attack.value = 0.006;
    this.busComp.release.value = 0.18;
    this.busComp.connect(this.limiter);

    this.masterGain = ctx.createGain();
    this.masterGain.connect(this.busComp);

    this.duckAll = ctx.createGain();
    this.duckAll.connect(this.masterGain);

    this.colorFilter = ctx.createBiquadFilter();
    this.colorFilter.type = 'lowpass';
    this.colorFilter.frequency.value = AIR_MAX_CUTOFF;
    this.colorFilter.Q.value = 0.5;
    this.colorFilter.connect(this.duckAll);

    this.sfxGroup = ctx.createGain();
    this.sfxGroup.connect(this.colorFilter);
    this.musicGroup = ctx.createGain();
    this.musicGroup.connect(this.colorFilter);

    // Category buses.
    const buses = {} as Record<BusName, GainNode>;
    (Object.keys(BUS_LEVELS) as BusName[]).forEach((name) => {
      const g = ctx.createGain();
      g.gain.value = BUS_LEVELS[name];
      g.connect(name === 'music' ? this.musicGroup! : this.sfxGroup!);
      buses[name] = g;
    });
    this.buses = buses;

    // Reverb: two convolvers crossfaded by `indoor`.
    this.reverbReturn = ctx.createGain();
    this.reverbReturn.gain.value = 1;
    this.reverbReturn.connect(this.colorFilter);

    this.convolverA = ctx.createConvolver();
    this.convolverB = ctx.createConvolver();
    try {
      this.convolverA.buffer = Reverb.render(ctx, OUTDOOR_PRESET, 7);
      this.convolverB.buffer = Reverb.render(ctx, INDOOR_PRESET, 13);
    } catch {
      /* convolver stays empty — reverb simply silent */
    }
    this.wetA = ctx.createGain();
    this.wetB = ctx.createGain();
    this.wetA.gain.value = 1;
    this.wetB.gain.value = 0;
    this.convolverA.connect(this.wetA).connect(this.reverbReturn);
    this.convolverB.connect(this.wetB).connect(this.reverbReturn);
    this.reverbInput = ctx.createGain();
    this.reverbInput.gain.value = 0.9;
    this.reverbInput.connect(this.convolverA);
    this.reverbInput.connect(this.convolverB);

    this.applyVolumes(true);
  }

  private bindGesture(): void {
    if (this.gestureBound || typeof window === 'undefined') return;
    this.gestureBound = true;
    const resumeOnce = () => {
      void this.resume();
    };
    window.addEventListener('pointerdown', resumeOnce, { once: true });
    window.addEventListener('keydown', resumeOnce, { once: true });
  }

  async resume(): Promise<void> {
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
    } catch {
      /* ignore — will retry on next gesture */
    }
  }

  // ------------------------------------------------------------- subscribe

  private subscribe(): void {
    const ev = this.events;
    if (!ev) return;
    const on = <K extends keyof GameEvents>(k: K, fn: (p: GameEvents[K]) => void) => {
      this.unsubs.push(ev.on(k, fn));
    };

    on('weapon:fire', (p) => this.onWeaponFire(p));
    on('weapon:dryfire', () => this.play('dryfire', { category: 'weapons', gain: 0.7 }));
    on('weapon:reload:start', () => {
      this.play('mag_release', { category: 'weapons', gain: 0.8 });
      this.play('mag_out', { category: 'weapons', gain: 0.8, when: 0.14 });
    });
    on('weapon:reload:end', () => {
      this.play('mag_in', { category: 'weapons', gain: 0.9 });
      this.play('bolt_release', { category: 'weapons', gain: 0.75, when: 0.09 });
    });
    on('weapon:switch', () => {
      this.play('weapon_lower', { category: 'weapons', gain: 0.6 });
      this.play('weapon_raise', { category: 'weapons', gain: 0.7, when: 0.16 });
      this.play('cloth', { category: 'sfx', gain: 0.4, when: 0.05 });
    });
    on('weapon:ads', (on2) => this.play(on2 ? 'ads_in' : 'ads_out', { category: 'weapons', gain: 0.5 }));

    on('hit:confirm', (p) => this.onHitConfirm(p));
    on('hit:surface', (p) => this.onHitSurface(p));
    on('enemy:death', (p) => this.onEnemyDeath(p));

    on('explosion', (p) => this.onExplosion(p));
    on('player:damage', () => {
      this.play('pain', { category: 'sfx', gain: 0.8 });
      this.duck(0.3, 0.5);
    });
    on('player:footstep', (p) => this.onFootstep(p));
    on('player:land', (p) => this.play(p.impact > 6 ? 'land_hard' : 'land_soft', { category: 'sfx', gain: clamp(0.4 + p.impact * 0.06, 0.4, 1) }));

    on('airstrike:called', (p) => this.onAirstrikeCalled(p));
    on('airstrike:inbound', () => this.play('airstrike_whistle', { category: 'sfx', gain: 0.8 }));
    on('airstrike:impact', (p) => this.onAirstrikeImpact(p));

    on('killstreak:earned', () => this.play('ui_killstreak', { category: 'ui', gain: 0.9 }));
    on('ui:notify', (p) => {
      const tone = p.tone ?? 'info';
      const rate = tone === 'good' ? 1.12 : tone === 'bad' ? 0.86 : 1;
      this.play('ui_notify', { category: 'ui', gain: 0.7, rate });
    });
  }

  // ------------------------------------------------------------- handlers

  private onWeaponFire(p: GameEvents['weapon:fire']): void {
    const id = this.bank.has(`weapon_${p.weapon}`) ? `weapon_${p.weapon}` : 'weapon_assault_rifle';
    this.playAt(id, p.muzzle, {
      category: 'weapons',
      reverb: 0.3 + this.indoor * 0.35,
      refDistance: 10,
      rolloff: 0.9,
      maxDistance: 600,
      priority: 3,
    });
    this.duck(0.12, 0.14);
    this.combatIntensity = clamp(this.combatIntensity + 0.12, 0, 1);
  }

  private onHitConfirm(p: GameEvents['hit:confirm']): void {
    this.play(p.headshot ? 'ui_hitmarker_head' : 'ui_hitmarker', { category: 'ui', gain: 0.8, jitter: false });
    if (p.lethal) this.play('ui_kill', { category: 'ui', gain: 0.7, when: 0.02 });
  }

  private onHitSurface(p: GameEvents['hit:surface']): void {
    const id = `impact_${p.surface}`;
    const soundId = this.bank.has(id) ? id : 'impact_concrete';
    this.playAt(soundId, p.point, { category: 'sfx', reverb: 0.18 + this.indoor * 0.25, refDistance: 6, priority: 1 });
    // Occasional ricochet whine off hard surfaces.
    if ((p.surface === 'metal' || p.surface === 'concrete') && this.rng() < 0.3) {
      this.playAt('ricochet', p.point, { category: 'sfx', gain: 0.6, refDistance: 8, when: 0.01 });
    }
  }

  private onEnemyDeath(p: GameEvents['enemy:death']): void {
    const g = clamp(1 - p.distance / 60, 0.15, 1);
    this.play('impact_flesh', { category: 'sfx', gain: 0.7 * g });
    this.play('pain', { category: 'sfx', gain: 0.6 * g, when: 0.02, rate: 0.9 });
  }

  private onExplosion(p: GameEvents['explosion']): void {
    const dist = this.distanceTo(p.position);
    this.playAt('explosion', p.position, {
      category: 'explosions',
      reverb: 0.5 + this.indoor * 0.4,
      refDistance: 16,
      rolloff: 0.7,
      maxDistance: 900,
      priority: 5,
    });
    this.duck(0.55, 0.9);
    this.combatIntensity = clamp(this.combatIntensity + 0.4, 0, 1);
    // A very close blast: temporary threshold shift + tinnitus.
    if (dist < p.radius + 10) {
      this.triggerTinnitus(clamp(1 - dist / (p.radius + 10), 0.3, 1));
    }
  }

  private onFootstep(p: GameEvents['player:footstep']): void {
    const id = this.bank.has(`footstep_${p.surface}`) ? `footstep_${p.surface}` : 'footstep_concrete';
    const g = clamp(0.28 + p.speed * 0.05, 0.28, 0.7);
    this.play(id, { category: 'sfx', gain: g, pan: (this.rng() - 0.5) * 0.3 });
  }

  private onAirstrikeCalled(p: GameEvents['airstrike:called']): void {
    this.playAt('airstrike_jet', p.position, { category: 'sfx', gain: 0.9, refDistance: 40, maxDistance: 1500, priority: 4 });
    this.play('airstrike_rumble', { category: 'sfx', gain: 0.5 });
  }

  private onAirstrikeImpact(p: GameEvents['airstrike:impact']): void {
    // Impact chain — several offset explosions around the point.
    const n = 4;
    for (let i = 0; i < n; i++) {
      const jitter = () => (this.rng() - 0.5) * 14;
      const pos = {
        x: p.position.x + jitter(),
        y: p.position.y,
        z: p.position.z + jitter(),
      } as unknown as THREE.Vector3;
      this.playAt('explosion', pos, {
        category: 'explosions',
        when: i * 0.11 + this.rng() * 0.04,
        reverb: 0.6,
        refDistance: 18,
        rolloff: 0.7,
        maxDistance: 900,
        priority: 5,
      });
    }
    this.duck(0.7, 1.4);
    if (this.distanceTo(p.position) < 40) this.triggerTinnitus(0.9);
    this.combatIntensity = 1;
  }

  // -------------------------------------------------------------- playback

  private pickVariant(id: string, forced?: number): AudioBuffer | null {
    const variants = this.bank.get(id);
    if (!variants || variants.length === 0) return null;
    if (forced !== undefined) return variants[clamp(forced, 0, variants.length - 1) | 0] ?? null;
    return variants[(this.rng() * variants.length) | 0] ?? variants[0];
  }

  play(id: string, opts: PlayOptions = {}): PlayHandle | null {
    return this.spawn(id, null, opts);
  }

  playAt(id: string, position: THREE.Vector3, opts: PlayAtOptions = {}): PlayHandle | null {
    return this.spawn(id, position, opts);
  }

  private spawn(id: string, position: THREE.Vector3 | null, opts: PlayAtOptions): PlayHandle | null {
    if (!this.available || !this.ctx || !this.buses) return null;
    const buffer = this.pickVariant(id, opts.variant);
    if (!buffer) return null;

    const ctx = this.ctx;
    const category = opts.category ?? 'sfx';
    const bus = this.buses[category];

    if (this.voices.size >= MAX_VOICES) this.stealVoice();

    const jitter = opts.jitter ?? true;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = opts.loop ?? false;
    const rateJit = jitter ? 1 + (this.rng() - 0.5) * 0.06 : 1;
    src.playbackRate.value = (opts.rate ?? 1) * rateJit;
    if (opts.detune !== undefined && src.detune) src.detune.value = opts.detune;

    const gainJit = jitter ? 1 + (this.rng() - 0.5) * 0.12 : 1;
    const baseGain = (opts.gain ?? 1) * gainJit;

    const gain = ctx.createGain();
    const when = ctx.currentTime + Math.max(0, opts.when ?? 0);
    const fadeIn = opts.fadeIn ?? 0;
    if (fadeIn > 0) {
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, baseGain), when + fadeIn);
    } else {
      gain.gain.value = baseGain;
    }

    const nodes: AudioNode[] = [src, gain];
    let head: AudioNode = src;
    let airLP: BiquadFilterNode | null = null;
    let panner: PannerNode | null = null;
    let distance = 0;

    if (position) {
      distance = this.distanceTo(position);
      airLP = ctx.createBiquadFilter();
      airLP.type = 'lowpass';
      airLP.frequency.value = this.airCutoff(distance, opts.occlusion ?? 0);
      airLP.Q.value = 0.4;
      head.connect(airLP);
      head = airLP;
      nodes.push(airLP);

      panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = opts.refDistance ?? 8;
      panner.rolloffFactor = opts.rolloff ?? 1;
      panner.maxDistance = opts.maxDistance ?? 500;
      this.setPannerPosition(panner, position);

      head.connect(gain);
      gain.connect(panner);
      panner.connect(bus);
      nodes.push(panner);
    } else if (opts.pan !== undefined && typeof ctx.createStereoPanner === 'function') {
      const sp = ctx.createStereoPanner();
      sp.pan.value = clamp(opts.pan, -1, 1);
      head.connect(gain).connect(sp).connect(bus);
      nodes.push(sp);
    } else {
      head.connect(gain).connect(bus);
    }

    // Reverb send.
    let send: GainNode | null = null;
    const sendAmt = opts.reverb ?? (category === 'ui' || category === 'music' ? 0 : 0.12);
    if (sendAmt > 0 && this.reverbInput) {
      send = ctx.createGain();
      const distFactor = position ? clamp(distance / 60, 0, 1) * 0.4 : 0;
      send.gain.value = clamp(sendAmt + distFactor, 0, 1.2);
      gain.connect(send);
      send.connect(this.reverbInput);
      nodes.push(send);
    }

    const occ = opts.occlusion ?? 0;
    if (occ > 0) gain.gain.value = baseGain * (1 - 0.7 * occ);

    const id2 = this.nextId++;
    const handle: PlayHandle = { id: id2 };
    const voice: Voice = {
      id: id2,
      source: src,
      gain,
      baseGain,
      airLP,
      panner,
      send,
      category,
      priority: opts.priority ?? 2,
      startedAt: ctx.currentTime,
      loop: src.loop,
      occlusion: occ,
      distance,
      nodes,
      handle,
    };
    this.voices.set(id2, voice);

    src.onended = () => this.disposeVoice(voice);
    try {
      src.start(when);
    } catch {
      this.disposeVoice(voice);
      return null;
    }
    return handle;
  }

  stop(handle: PlayHandle | null): void {
    if (!handle) return;
    const voice = this.voices.get(handle.id);
    if (!voice || !this.ctx) return;
    const t = this.ctx.currentTime;
    try {
      voice.gain.gain.cancelScheduledValues(t);
      voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), t);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      voice.source.stop(t + 0.05);
    } catch {
      this.disposeVoice(voice);
    }
  }

  setOcclusion(handle: PlayHandle | null, amount: number): void {
    if (!handle) return;
    const voice = this.voices.get(handle.id);
    if (!voice || !this.ctx) return;
    const a = clamp(amount, 0, 1);
    voice.occlusion = a;
    const t = this.ctx.currentTime;
    voice.gain.gain.setTargetAtTime(voice.baseGain * (1 - 0.7 * a), t, 0.05);
    if (voice.airLP) {
      const cut = this.airCutoff(voice.distance, a);
      voice.airLP.frequency.setTargetAtTime(cut, t, 0.05);
    }
  }

  private stealVoice(): void {
    let victim: Voice | null = null;
    for (const v of this.voices.values()) {
      if (v.loop) continue;
      if (
        !victim ||
        v.priority < victim.priority ||
        (v.priority === victim.priority && v.startedAt < victim.startedAt)
      ) {
        victim = v;
      }
    }
    if (victim) {
      try {
        victim.source.stop();
      } catch {
        /* already stopped */
      }
      this.disposeVoice(victim);
    }
  }

  private disposeVoice(voice: Voice): void {
    if (!this.voices.has(voice.id)) return;
    this.voices.delete(voice.id);
    voice.source.onended = null;
    for (const n of voice.nodes) {
      try {
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
    if (this.musicCalm === voice) this.musicCalm = null;
    if (this.musicCombat === voice) this.musicCombat = null;
  }

  // ------------------------------------------------------------- listener

  setListener(camera: THREE.Camera): void {
    this.camera = camera;
    this.updateListener();
  }

  private updateListener(): void {
    if (!this.ctx || !this.camera) return;
    const cam = this.camera;
    cam.updateMatrixWorld();
    const e = cam.matrixWorld.elements;
    const px = e[12];
    const py = e[13];
    const pz = e[14];
    this.listenerPos.x = px;
    this.listenerPos.y = py;
    this.listenerPos.z = pz;
    // Forward is -Z of the camera basis; up is +Y.
    const fx = -e[8];
    const fy = -e[9];
    const fz = -e[10];
    const ux = e[4];
    const uy = e[5];
    const uz = e[6];
    const l = this.ctx.listener;
    const now = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setValueAtTime(px, now);
      l.positionY.setValueAtTime(py, now);
      l.positionZ.setValueAtTime(pz, now);
      l.forwardX.setValueAtTime(fx, now);
      l.forwardY.setValueAtTime(fy, now);
      l.forwardZ.setValueAtTime(fz, now);
      l.upX.setValueAtTime(ux, now);
      l.upY.setValueAtTime(uy, now);
      l.upZ.setValueAtTime(uz, now);
    } else {
      const legacy = l as unknown as {
        setPosition(x: number, y: number, z: number): void;
        setOrientation(fx: number, fy: number, fz: number, ux: number, uy: number, uz: number): void;
      };
      legacy.setPosition(px, py, pz);
      legacy.setOrientation(fx, fy, fz, ux, uy, uz);
    }
  }

  private setPannerPosition(panner: PannerNode, pos: THREE.Vector3): void {
    if (panner.positionX) {
      const now = this.ctx!.currentTime;
      panner.positionX.setValueAtTime(pos.x, now);
      panner.positionY.setValueAtTime(pos.y, now);
      panner.positionZ.setValueAtTime(pos.z, now);
    } else {
      (panner as unknown as { setPosition(x: number, y: number, z: number): void }).setPosition(
        pos.x,
        pos.y,
        pos.z
      );
    }
  }

  private distanceTo(pos: THREE.Vector3): number {
    const dx = pos.x - this.listenerPos.x;
    const dy = pos.y - this.listenerPos.y;
    const dz = pos.z - this.listenerPos.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private airCutoff(distance: number, occlusion: number): number {
    const air = AIR_MIN_CUTOFF + (AIR_MAX_CUTOFF - AIR_MIN_CUTOFF) * Math.exp(-distance / 45);
    return clamp(air * (1 - 0.8 * occlusion), 200, AIR_MAX_CUTOFF);
  }

  // ---------------------------------------------------------------- mixing

  setMasterVolume(v: number): void {
    if (this.settings) this.settings.user.masterVolume = clamp(v, 0, 1);
    this.applyVolumes(false);
  }

  private applyVolumes(instant: boolean): void {
    if (!this.ctx || !this.masterGain || !this.sfxGroup || !this.musicGroup) return;
    const s = this.settings?.user;
    const master = s ? s.masterVolume : 0.85;
    const sfx = s ? s.sfxVolume : 1;
    const music = s ? s.musicVolume : 0.5;
    const t = this.ctx.currentTime;
    const set = (p: AudioParam, val: number) => {
      if (instant) p.value = val;
      else p.setTargetAtTime(val, t, 0.05);
    };
    set(this.masterGain.gain, master);
    set(this.sfxGroup.gain, sfx);
    set(this.musicGroup.gain, music);
  }

  duck(amount: number, seconds: number): void {
    if (!this.ctx || !this.buses) return;
    const a = clamp(amount, 0, 1);
    const t = this.ctx.currentTime;
    for (const name of ['ambience', 'music'] as BusName[]) {
      const g = this.buses[name].gain;
      const base = BUS_LEVELS[name];
      g.cancelScheduledValues(t);
      g.setValueAtTime(Math.max(0.0001, g.value), t);
      g.linearRampToValueAtTime(base * (1 - a), t + 0.04);
      g.setTargetAtTime(base, t + 0.04 + seconds * 0.3, seconds * 0.4);
    }
  }

  setUnderwater(on: boolean): void {
    this.underwater = on;
    this.applyColorFilter();
  }

  setIndoor(amount: number): void {
    this.indoor = clamp(amount, 0, 1);
    if (!this.ctx || !this.wetA || !this.wetB) return;
    const t = this.ctx.currentTime;
    this.wetA.gain.setTargetAtTime(1 - this.indoor, t, 0.2);
    this.wetB.gain.setTargetAtTime(this.indoor, t, 0.2);
  }

  private applyColorFilter(): void {
    if (!this.ctx || !this.colorFilter) return;
    const t = this.ctx.currentTime;
    const uw = this.underwater ? 500 : AIR_MAX_CUTOFF;
    const target = Math.min(uw, this.tinnitusTarget);
    this.colorFilter.frequency.setTargetAtTime(target, t, 0.08);
  }

  // ------------------------------------------------------- tinnitus / TTS

  /**
   * Signature nearby-explosion effect: duck everything, sweep a global lowpass
   * closed then back open over ~4s, and ring a fading tinnitus tone.
   */
  triggerTinnitus(intensity = 1): void {
    if (!this.ctx || !this.duckAll || !this.busComp) return;
    const i = clamp(intensity, 0, 1);
    const t = this.ctx.currentTime;

    // Duck the whole mix, then recover.
    this.duckAll.gain.cancelScheduledValues(t);
    this.duckAll.gain.setValueAtTime(Math.max(0.0001, this.duckAll.gain.value), t);
    this.duckAll.gain.linearRampToValueAtTime(1 - 0.6 * i, t + 0.05);
    this.duckAll.gain.setTargetAtTime(1, t + 0.5, 1.4);

    // Muffle: sweep the color filter down then back open over ~4s.
    this.tinnitusTarget = 700 + (1 - i) * 2000;
    this.applyColorFilter();
    if (this.colorFilter) {
      this.colorFilter.frequency.setTargetAtTime(AIR_MAX_CUTOFF, t + 1.0, 1.4);
    }
    // Reset the logical target so later underwater toggles behave.
    setTimeout(() => {
      this.tinnitusTarget = AIR_MAX_CUTOFF;
      this.applyColorFilter();
    }, 4200);

    // Tinnitus tone.
    if (!this.tinnitusGain) {
      this.tinnitusGain = this.ctx.createGain();
      this.tinnitusGain.gain.value = 0;
      this.tinnitusGain.connect(this.busComp);
    }
    if (this.tinnitusOsc) {
      try {
        this.tinnitusOsc.stop();
      } catch {
        /* ignore */
      }
      this.tinnitusOsc.disconnect();
    }
    this.tinnitusOsc = this.ctx.createOscillator();
    this.tinnitusOsc.type = 'sine';
    this.tinnitusOsc.frequency.setValueAtTime(4200 + i * 800, t);
    // Slow bandpass-style wobble via a second detuned partial.
    this.tinnitusOsc.frequency.setTargetAtTime(4600 + i * 600, t + 0.5, 2.0);
    this.tinnitusOsc.connect(this.tinnitusGain);
    this.tinnitusGain.gain.cancelScheduledValues(t);
    this.tinnitusGain.gain.setValueAtTime(0.0001, t);
    this.tinnitusGain.gain.exponentialRampToValueAtTime(0.18 * i, t + 0.06);
    this.tinnitusGain.gain.setTargetAtTime(0.0001, t + 0.5, 1.6);
    this.tinnitusActive = true;
    try {
      this.tinnitusOsc.start(t);
      this.tinnitusOsc.stop(t + 5.5);
    } catch {
      /* ignore */
    }
    this.tinnitusOsc.onended = () => {
      this.tinnitusActive = false;
    };
  }

  // --------------------------------------------------------- ambience/music

  startAmbience(): void {
    if (!this.available) return;
    if (!this.ambienceHandle) {
      this.ambienceHandle = this.play('ambience', { category: 'ambience', loop: true, gain: 1, jitter: false, fadeIn: 2 });
    }
    if (!this.musicCalm) {
      const h = this.play('music_calm', { category: 'music', loop: true, gain: 1, jitter: false, fadeIn: 3 });
      this.musicCalm = h ? this.voices.get(h.id) ?? null : null;
    }
    if (!this.musicCombat) {
      const h = this.play('music_combat', { category: 'music', loop: true, gain: 0.0001, jitter: false });
      this.musicCombat = h ? this.voices.get(h.id) ?? null : null;
    }
  }

  stopAmbience(): void {
    this.stop(this.ambienceHandle);
    this.ambienceHandle = null;
    if (this.musicCalm) {
      this.stop(this.musicCalm.handle);
      this.musicCalm = null;
    }
    if (this.musicCombat) {
      this.stop(this.musicCombat.handle);
      this.musicCombat = null;
    }
  }

  private updateMusic(): void {
    if (!this.ctx || !this.musicCalm || !this.musicCombat) return;
    const t = this.ctx.currentTime;
    const c = this.combatIntensity;
    this.musicCombat.gain.gain.setTargetAtTime(Math.max(0.0001, c), t, 0.4);
    this.musicCalm.gain.gain.setTargetAtTime(Math.max(0.0001, 1 - c * 0.7), t, 0.4);
  }

  // ------------------------------------------------------------- lifecycle

  update(dt: number, ctx: EngineContext): void {
    if (!this.available) return;
    if (this.camera !== ctx.camera) this.camera = ctx.camera;
    this.updateListener();
    this.applyVolumes(false);
    this.combatIntensity = Math.max(0, this.combatIntensity - dt * 0.15);
    this.updateMusic();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const off of this.unsubs) off();
    this.unsubs.length = 0;
    for (const v of [...this.voices.values()]) {
      try {
        v.source.stop();
      } catch {
        /* ignore */
      }
      this.disposeVoice(v);
    }
    if (this.tinnitusOsc) {
      try {
        this.tinnitusOsc.stop();
      } catch {
        /* ignore */
      }
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {
        /* ignore */
      });
    }
    this.ctx = null;
    this.available = false;
  }

  // ---------------------------------------------------------- diagnostics

  /** Static list of every family id the bank exposes (no context needed). */
  static soundIds(): string[] {
    return bankSoundIds();
  }
}
