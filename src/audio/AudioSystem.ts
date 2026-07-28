/**
 * The audio system.
 *
 * Everything is synthesised: there are no asset files, so the sound design is
 * arithmetic that runs at load time (`bake/`) and node graphs that are assembled
 * at the moment an event fires (`live/`). This file is the wiring — it owns the
 * context, meters the baking, keeps the listener aligned with the camera, infers
 * what kind of space the player is standing in, and turns the event vocabulary
 * into voices.
 *
 * Three rules shape the implementation:
 *
 *  - **Nothing throws.** WebAudio needs a user gesture, may be muted, may be
 *    absent entirely. Every path is guarded and every failure is silent, because
 *    the screenshot harness runs with `--mute-audio` and no gesture, and audio
 *    must never be the reason a capture hangs or a boot fails.
 *  - **Nothing allocates per frame.** Scratch vectors are module-scoped, event
 *    handlers are bound once, and the only object created per sound is the
 *    `AudioBufferSourceNode`, which is single-use by design.
 *  - **Nothing is unbounded.** Voices come from a fixed pool with priority-based
 *    culling, baking runs against a per-frame millisecond budget, and the master
 *    chain ends in a transfer curve whose own range makes clipping impossible.
 */

import * as THREE from 'three';
import type { GameContext, System } from '../core/GameContext';
import { Groups } from '../core/GameContext';
import type { QualityPreset, QualitySettings } from '../core/Quality';
import type {
  AudioBusName,
  IAI,
  IAudio,
  IPhysics,
  IPlayer,
  IWeapons,
  IWorld,
  RaycastHit,
} from '../core/Interfaces';
import type { SurfaceKind } from '../core/Events';

import { Bakery } from './bake/Bakery';
import {
  GUNS,
  bakeCasings,
  bakeCracks,
  bakeDistantReports,
  bakeFireMechanics,
  bakeNoiseLoops,
  bakeReloadMechanics,
  bakeRings,
  bakeSubs,
  bakeSuppressed,
  bakeTails,
  gunVoice,
} from './bake/Weapons';
import {
  bakeFootstepWeight,
  bakeFootsteps,
  bakeGlassShatter,
  bakeImpacts,
} from './bake/Surfaces';
import {
  bakeBlasts,
  bakeCannon,
  bakeDebris,
  bakeDistantRumble,
  bakeFlashbang,
  bakeGrenadeBounce,
  bakeHelicopter,
  bakeJet,
  bakeNapalm,
  bakeRelease,
  bakeSmoke,
  bakeWhistle,
  bakeWhizby,
} from './bake/Ordnance';
import { bakeBody, bakeCallouts, bakeMusic, bakeRadio, bakeTinnitus, bakeUi } from './bake/Interface';
import {
  bakeAmbientOneShots,
  bakeCity,
  bakeRoomTone,
  bakeSurf,
  bakeWind,
} from './bake/Ambient';

import { AudioCore, type EmitOptions } from './Core';
import { DISTANCE, type DistanceModel } from './graph/Voices';
import type { BusName } from './graph/Mixer';
import { BUS_NAMES } from './graph/Mixer';
import { ShotEngine } from './live/Shot';
import { AmbienceBed, BodyState, DopplerSource, MusicBed, WhizbyPlayer } from './live/Effects';
import { Spatial } from './Spatial';
import { REGISTRY, resolve, type SoundDef } from './Registry';
import { ZONES, ZONE_NAMES, buildZoneIR, type ZoneName } from './dsp/Zones';
import type { Clip } from './dsp/Kernel';

/* ------------------------------ scratch ------------------------------- */

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);
const _surfaceHit: RaycastHit = {
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(0, 1, 0),
  distance: 0,
  object: new THREE.Object3D(),
  surface: 'concrete',
};

const QUALITY_SCALE: Record<QualityPreset, number> = {
  low: 0.25,
  medium: 0.5,
  high: 0.78,
  ultra: 1,
  cinematic: 1,
};

interface Budget {
  spatial: number;
  flat: number;
  shots: number;
  hrtf: boolean;
}

const BUDGETS: Record<QualityPreset, Budget> = {
  low: { spatial: 20, flat: 10, shots: 6, hrtf: false },
  medium: { spatial: 28, flat: 12, shots: 8, hrtf: false },
  high: { spatial: 40, flat: 16, shots: 12, hrtf: true },
  ultra: { spatial: 52, flat: 20, shots: 14, hrtf: true },
  cinematic: { spatial: 64, flat: 24, shots: 16, hrtf: true },
};

/** Stride length in metres for the derived enemy gait. */
const ENEMY_STRIDE_WALK = 0.78;
const ENEMY_STRIDE_RUN = 1.15;

interface EnemyGait {
  x: number;
  y: number;
  z: number;
  phase: number;
  speed: number;
  seen: number;
}

export default class AudioSystem implements System, IAudio {
  readonly key = 'audio';
  readonly order = 80;

  private ctx: AudioContext | null = null;
  private core: AudioCore | null = null;
  private bakery: Bakery | null = null;
  private shots: ShotEngine | null = null;
  private spatial = new Spatial();
  private whiz: WhizbyPlayer | null = null;
  private ambience: AmbienceBed | null = null;
  private music: MusicBed | null = null;
  private body: BodyState | null = null;
  private jet: DopplerSource | null = null;
  private heli: DopplerSource | null = null;

  private irs = new Map<ZoneName, Clip>();
  private zone: ZoneName = 'street';
  private manualZone = false;
  private zoneHold = 0;

  private game: GameContext | null = null;
  private player: IPlayer | null = null;
  private weapons: IWeapons | null = null;
  private ai: IAI | null = null;
  private world: IWorld | null = null;
  private physics: IPhysics | null = null;

  private unsubscribe: Array<() => void> = [];
  private stamps = new Map<string, number>();
  private enemyGait = new Map<number, EnemyGait>();
  private enemyStepEventAt = -1000;
  private clock = 0;
  private lastPlayerFire = -1000;
  private combat = 0;
  private screen = 'none';
  private started = false;
  private unlockRequested = false;
  private failed = '';
  private masterVolume = 0.8;
  private busVolumes = new Map<BusName, number>();
  private bakeComplete = false;

  /* ============================== lifecycle ============================= */

  init(ctx: GameContext): void {
    this.game = ctx;
    try {
      this.build(ctx);
    } catch (err) {
      // A failure here must not take the game with it; the engine logs and the
      // rest of the frame carries on in silence.
      this.failed = String((err as Error)?.message ?? err);
      console.warn('[audio] disabled:', this.failed);
    }
    // Event wiring is safe even with no context: the handlers all short-circuit.
    this.wire(ctx);
    void this.installBridge();
  }

  private build(ctx: GameContext): void {
    const Ctor =
      typeof AudioContext !== 'undefined'
        ? AudioContext
        : ((globalThis as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext ?? null);
    if (!Ctor) {
      this.failed = 'no AudioContext';
      return;
    }
    let audio: AudioContext;
    try {
      audio = new Ctor({ latencyHint: 'interactive' });
    } catch {
      this.failed = 'AudioContext refused';
      return;
    }
    this.ctx = audio;

    const preset = ctx.quality.preset;
    const scale = QUALITY_SCALE[preset] ?? 0.78;
    const budget = BUDGETS[preset] ?? BUDGETS.high;
    const bakery = new Bakery(audio.sampleRate, scale);
    this.bakery = bakery;

    this.zone = 'street';
    this.bakeEager(bakery);
    this.queueDeferred(bakery);

    this.core = new AudioCore(
      audio,
      bakery,
      audio.destination,
      budget.spatial,
      budget.flat,
      budget.hrtf,
      scale,
    );
    this.core.mixer.setMasterVolume(this.masterVolume);
    this.core.mixer.primeZone(this.zone, this.irs.get(this.zone) ?? null);
    this.core.zone = ZONES[this.zone];
    this.core.occlusionProbe = this.probeOcclusion;

    this.shots = new ShotEngine(this.core, budget.shots, scale > 0.6 ? 2048 : 512);
    this.whiz = new WhizbyPlayer(this.core);
    this.ambience = new AmbienceBed(this.core);
    this.music = new MusicBed(this.core);
    this.body = new BodyState(this.core);
    this.jet = new DopplerSource(this.core, 'jet', 'air:jet', 1);
    this.heli = new DopplerSource(this.core, 'heli', 'air:heli', 1);
    for (const b of BUS_NAMES) this.busVolumes.set(b, 1);
  }

  /**
   * What the first second of play needs. Everything here is a few hundred
   * thousand samples of arithmetic; the heavy, long material is deferred.
   */
  private bakeEager(b: Bakery, irs: Map<ZoneName, Clip> = this.irs): void {
    b.run('cracks', bakeCracks);
    b.run('noise', bakeNoiseLoops);
    b.run('subs', bakeSubs);
    b.run('rings', bakeRings);
    b.run('fire-mech', bakeFireMechanics);
    b.run('reload-mech', bakeReloadMechanics);
    b.run('suppressed', bakeSuppressed);
    b.run('casings', bakeCasings);
    b.run('far', bakeDistantReports);
    b.run('whizby', bakeWhizby);
    b.run('footsteps', bakeFootsteps);
    b.run('step-weight', bakeFootstepWeight);
    b.run('impacts', bakeImpacts);
    b.run('ui', bakeUi);
    b.run('radio', bakeRadio);
    b.run('body', bakeBody);
    // The reverb impulse responses: needed before the first shot has a tail,
    // and needed for all four zones because the player can walk anywhere.
    b.run('irs', (bk) => {
      let seed = 0x1234;
      for (const z of ZONE_NAMES) {
        irs.set(z, buildZoneIR(ZONES[z], bk.sampleRate, seed, bk.quality));
        seed = (seed * 1664525 + 1013904223) >>> 0;
      }
    });
    // Tails for the zone play starts in; the other three are trickled.
    b.run('tails', (bk) => bakeTails(bk, [this.zone]));
    b.run('blast-core', (bk) => bakeBlasts(bk, ['grenade', 'bomb']));
  }

  private queueDeferred(b: Bakery): void {
    b.queue('tails-rest', (bk) => bakeTails(bk, ZONE_NAMES));
    b.queue('blasts', bakeBlasts);
    b.queue('debris', bakeDebris);
    b.queue('flashbang', bakeFlashbang);
    b.queue('glass', bakeGlassShatter);
    b.queue('smoke', bakeSmoke);
    b.queue('napalm', bakeNapalm);
    b.queue('rumble', bakeDistantRumble);
    b.queue('release', bakeRelease);
    b.queue('whistle', bakeWhistle);
    b.queue('bounce', bakeGrenadeBounce);
    b.queue('cannon', bakeCannon);
    b.queue('tinnitus', bakeTinnitus);
    b.queue('callouts', bakeCallouts);
    b.queue('jet', bakeJet);
    b.queue('heli', bakeHelicopter);
    b.queue('wind', bakeWind);
    b.queue('city', bakeCity);
    b.queue('surf', bakeSurf);
    b.queue('room', bakeRoomTone);
    b.queue('amb-oneshots', bakeAmbientOneShots);
    b.queue('music', bakeMusic);
  }

  /** Loaded separately so the harness bridge is not in the shipping path. */
  private async installBridge(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const mod = await import('./Debug');
      mod.installAudioBridge(this);
    } catch {
      /* the bridge is a convenience; its absence is not an error */
    }
  }

  /* =============================== IAudio ============================== */

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  async resume(): Promise<void> {
    this.unlockRequested = true;
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      if (ctx.state !== 'running') await ctx.resume();
    } catch {
      /* the gesture may not have counted; the menu will try again */
    }
  }

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    this.core?.mixer.setMasterVolume(this.masterVolume);
  }

  get masterVolumeLevel(): number {
    return this.masterVolume;
  }

  setBusVolume(bus: AudioBusName, v: number): void {
    if (!BUS_NAMES.includes(bus as BusName)) return;
    const name = bus as BusName;
    this.busVolumes.set(name, Math.max(0, Math.min(1, v)));
    this.core?.mixer.setBusVolume(name, v);
  }

  busVolume(bus: AudioBusName): number {
    return this.busVolumes.get(bus as BusName) ?? 1;
  }

  get busNames(): readonly AudioBusName[] {
    return BUS_NAMES as readonly AudioBusName[];
  }

  setReverbZone(zone: ZoneName): void {
    this.manualZone = true;
    this.applyZone(zone, 0.6);
  }

  autoReverbZone(auto: boolean): void {
    this.manualZone = !auto;
  }

  get reverbZone(): ZoneName {
    return this.zone;
  }

  get voiceCount(): number {
    return this.core ? this.core.pool.activeCount : 0;
  }

  get voiceBudget(): number {
    return this.core ? this.core.pool.budget : 0;
  }

  get soundIds(): readonly string[] {
    return Object.keys(REGISTRY);
  }

  stop(id: string): void {
    const core = this.core;
    if (!core) return;
    core.pool.stopOwner(id, core.now);
  }

  play(id: string, opts?: { position?: THREE.Vector3; volume?: number; rate?: number }): boolean {
    const def = resolve(id);
    if (!def) return false;
    const core = this.core;
    if (!core || !this.ready) return true;
    try {
      return this.playDef(def, opts?.position, opts?.volume ?? 1, opts?.rate ?? 1);
    } catch {
      return true;
    }
  }

  /* ============================== dispatch ============================= */

  /** True when a channel was stamped recently enough to swallow a duplicate. */
  private stamped(channel: string | undefined, window: number): boolean {
    if (!channel) return false;
    const at = this.stamps.get(channel);
    return at !== undefined && this.clock - at < window;
  }

  private stamp(channel: string): void {
    this.stamps.set(channel, this.clock);
  }

  private model(family: SoundDef['model']): DistanceModel {
    return family === 'flat' ? DISTANCE.world : (DISTANCE[family] ?? DISTANCE.world);
  }

  private playDef(
    def: SoundDef,
    position: THREE.Vector3 | undefined,
    volume: number,
    rate: number,
  ): boolean {
    const core = this.core;
    if (!core) return false;
    if (this.stamped(def.channel, def.window ?? 0.09)) return true;
    if (def.channel) this.stamp(def.channel);

    const flat = def.model === 'flat' || !position;
    const rng = core.rng;
    const jitter = def.jitter > 0 ? 1 + rng.bi() * def.jitter : 1;

    if (def.clip.charCodeAt(0) === 64 /* '@' */) {
      return this.playDirective(def, position, volume, flat);
    }

    if (def.ring !== undefined && position) {
      this.applyRing(def.ring, position, 12);
    }

    const ok = core.emit(def.clip, {
      bus: def.bus,
      volume: def.volume * volume,
      rate: rate * jitter,
      priority: def.priority,
      positional: !flat,
      x: position?.x ?? 0,
      y: position?.y ?? 0,
      z: position?.z ?? 0,
      model: this.model(def.model),
      wet: def.wet,
      pan: flat ? rng.range(-0.12, 0.12) : 0,
    });
    if (def.steps) {
      for (const [clip, delay, level] of def.steps) {
        core.emit(clip, {
          bus: def.bus,
          volume: def.volume * volume * level,
          rate: rate * (1 + rng.bi() * def.jitter),
          priority: def.priority * 0.85,
          positional: !flat,
          x: position?.x ?? 0,
          y: position?.y ?? 0,
          z: position?.z ?? 0,
          model: this.model(def.model),
          wet: def.wet,
          delay,
        });
      }
    }
    return ok !== null;
  }

  /** `@`-prefixed clips are built rather than played. */
  private playDirective(
    def: SoundDef,
    position: THREE.Vector3 | undefined,
    volume: number,
    flat: boolean,
  ): boolean {
    const clip = def.clip;
    if (clip.startsWith('@shot:') || clip.startsWith('@shot_sup:')) {
      const suppressed = clip.startsWith('@shot_sup:');
      const gun = clip.slice(suppressed ? 10 : 6);
      return this.fireShot(gun, position, suppressed, !position, volume);
    }
    if (clip.startsWith('@reload:')) {
      this.reloadSequence(clip.slice(8), position, volume);
      return true;
    }
    if (clip === '@approach') {
      this.aircraftApproach(volume);
      return true;
    }
    return false;
  }

  /* =============================== weapons ============================= */

  private fireShot(
    gun: string,
    position: THREE.Vector3 | undefined,
    suppressed: boolean,
    firstPerson: boolean,
    volume: number,
  ): boolean {
    const core = this.core;
    const shots = this.shots;
    if (!core || !shots) return false;
    const voice = gunVoice(gun);
    const x = position?.x ?? core.listenerX;
    const y = position?.y ?? core.listenerY;
    const z = position?.z ?? core.listenerZ;
    const distance = firstPerson ? 0 : core.distanceTo(x, y, z);
    return shots.fire({
      gun: voice,
      distance,
      suppressed,
      firstPerson,
      zone: core.zone,
      x,
      y,
      z,
      volume,
      // The weapon sits slightly right of centre in the player's hands.
      pan: firstPerson ? 0.14 : 0,
    });
  }

  /**
   * A reload as a timed sequence of designed mechanisms rather than one clip.
   * Times are fractions of the weapon's own reload duration, so a slow sniper
   * reload spreads out and a fast pistol reload tightens up without a table.
   */
  private reloadSequence(weapon: string, position: THREE.Vector3 | undefined, volume: number): void {
    const core = this.core;
    if (!core) return;
    const stats = this.weapons?.current;
    const empty = (this.weapons?.mag ?? 1) <= 0;
    const enemy = weapon === 'enemy';
    let total = enemy ? 2.1 : 2.4;
    if (!enemy && stats && stats.id === weapon) {
      total = empty ? stats.reloadEmptyTime : stats.reloadTime;
    }
    const flat = !position;
    const shell = weapon === 'shotgun';
    const opts = (delay: number, level: number, priority: number): EmitOptions => ({
      bus: 'weapons',
      volume: level * volume,
      rate: 0.95 + core.rng.next() * 0.1,
      priority,
      positional: !flat,
      x: position?.x ?? 0,
      y: position?.y ?? 0,
      z: position?.z ?? 0,
      model: DISTANCE.world,
      wet: flat ? 0.4 : 1,
      delay,
    });

    if (shell) {
      // Shell-by-shell: the gate opens and then `weapon:reload:shell` drives it.
      core.emit('shell_insert', opts(0.04 * total, 0.5, 0.55));
      return;
    }
    core.emit('mag_release', opts(0.05 * total, 0.85, 0.6));
    core.emit('mag_out', opts(0.16 * total, 0.8, 0.55));
    core.emit('mag_in', opts(0.5 * total, 0.9, 0.6));
    if (empty && !enemy) core.emit('charging_handle', opts(0.78 * total, 0.9, 0.6));
  }

  /* ============================== explosions =========================== */

  /**
   * Hearing damage from something that went off nearby. Falls off with distance
   * and with the blast's own scale, so a grenade across the street rings for a
   * moment and one at your feet takes your hearing for six seconds.
   */
  private applyRing(base: number, position: THREE.Vector3, radius: number): void {
    const core = this.core;
    if (!core || base <= 0) return;
    const d = core.distanceTo(position.x, position.y, position.z);
    const reach = Math.max(4, radius * 2.6);
    const near = Math.max(0, 1 - d / reach);
    const amount = base * near * near;
    if (amount < 0.06) return;
    core.mixer.startRing(amount, core.clip('tinnitus'));
    core.mixer.duck(0.55 * amount + 0.2, 1.4 + 2.2 * amount);
  }

  private aircraftApproach(volume: number): void {
    const core = this.core;
    if (!core) return;
    // A run-in the player can hear coming: the engine note arrives from a long
    // way off, well before anything lands.
    const jet = this.jet;
    if (!jet) return;
    const a = core.rng.range(0, Math.PI * 2);
    jet.set(
      core.listenerX + Math.cos(a) * 620,
      core.listenerY + 260,
      core.listenerZ + Math.sin(a) * 620,
      -Math.cos(a) * 210,
      0,
      -Math.sin(a) * 210,
      volume,
    );
    core.emit('ui_warning', { bus: 'ui', volume: 0.7 * volume, priority: 0.95, positional: false });
  }

  /* ============================== footsteps ============================ */

  private stepSurfaceAt(x: number, y: number, z: number): SurfaceKind {
    const physics = this.physics;
    if (!physics) return 'concrete';
    _v.set(x, y + 0.6, z);
    if (physics.raycastInto(_v, _down, 2.2, _surfaceHit, Groups.WORLD | Groups.PROP)) {
      return _surfaceHit.surface;
    }
    return 'concrete';
  }

  private footstep(
    surface: SurfaceKind,
    position: THREE.Vector3,
    weight: 'crouch' | 'walk' | 'run' | 'land',
    firstPerson: boolean,
    scale = 1,
  ): void {
    const core = this.core;
    if (!core) return;
    const rng = core.rng;
    // Weight is not a volume control: a sprint puts more mass through the boot,
    // which means more low frequency and a slower, harder contact.
    let volume = 0.7;
    let rate = 1;
    let lowpass = 20000;
    let heel = 0;
    switch (weight) {
      case 'crouch':
        volume = 0.28;
        rate = 1.14;
        lowpass = 5200;
        break;
      case 'walk':
        volume = 0.62;
        rate = 1.02;
        break;
      case 'run':
        volume = 0.95;
        rate = 0.93;
        heel = 0.45;
        break;
      case 'land':
        volume = 1.15;
        rate = 0.85;
        heel = 0.95;
        break;
    }
    volume *= scale;
    core.emit(`step:${surface}`, {
      bus: 'footsteps',
      volume: volume * rng.range(0.88, 1.12),
      rate: rate * rng.range(0.92, 1.09),
      priority: firstPerson ? 0.45 : 0.3,
      positional: !firstPerson,
      x: position.x,
      y: position.y,
      z: position.z,
      model: DISTANCE.footstep,
      lowpass,
      wet: firstPerson ? 0.3 : 1,
      pan: firstPerson ? rng.range(-0.35, 0.35) : 0,
    });
    if (heel > 0.01) {
      core.emit('step_weight', {
        bus: 'footsteps',
        volume: heel * volume * 0.7,
        rate: rate * rng.range(0.9, 1.1),
        priority: firstPerson ? 0.5 : 0.32,
        positional: !firstPerson,
        x: position.x,
        y: position.y,
        z: position.z,
        model: DISTANCE.footstep,
        wet: firstPerson ? 0.2 : 1,
      });
    }
  }

  /** Steps for the men around the player, which is real tactical information. */
  private updateEnemyGait(dt: number): void {
    const core = this.core;
    const ai = this.ai;
    if (!core || !ai) return;
    // If the AI ever starts publishing footsteps itself, stand down.
    if (this.clock - this.enemyStepEventAt < 4) return;

    const enemies = ai.enemies;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      let gait = this.enemyGait.get(e.id);
      if (!gait) {
        gait = { x: e.position.x, y: e.position.y, z: e.position.z, phase: 0, speed: 0, seen: this.clock };
        this.enemyGait.set(e.id, gait);
        continue;
      }
      gait.seen = this.clock;
      if (!e.alive) {
        gait.x = e.position.x;
        gait.y = e.position.y;
        gait.z = e.position.z;
        continue;
      }
      const dx = e.position.x - gait.x;
      const dz = e.position.z - gait.z;
      const moved = Math.sqrt(dx * dx + dz * dz);
      gait.x = e.position.x;
      gait.y = e.position.y;
      gait.z = e.position.z;
      const speed = dt > 1e-4 ? moved / dt : 0;
      gait.speed += (speed - gait.speed) * Math.min(1, dt * 8);
      if (gait.speed < 0.35) {
        gait.phase = 0.72;
        continue;
      }
      const running = gait.speed > 3.1;
      gait.phase += moved / (running ? ENEMY_STRIDE_RUN : ENEMY_STRIDE_WALK);
      if (gait.phase < 1) continue;
      gait.phase -= 1;
      const d = core.distanceTo(e.position.x, e.position.y, e.position.z);
      if (d > DISTANCE.footstep.maxDistance) continue;
      _v2.set(e.position.x, e.position.y, e.position.z);
      this.footstep(
        this.stepSurfaceAt(e.position.x, e.position.y, e.position.z),
        _v2,
        running ? 'run' : 'walk',
        false,
        1.05,
      );
    }

    // Retire gaits for entities that have gone away.
    if (this.enemyGait.size > enemies.length + 8) {
      for (const [id, g] of this.enemyGait) {
        if (this.clock - g.seen > 5) this.enemyGait.delete(id);
      }
    }
  }

  /* ================================ wiring ============================= */

  private probeOcclusion = (x: number, y: number, z: number): number => {
    const core = this.core;
    if (!core) return 0;
    return this.spatial.occlusion(core.listenerX, core.listenerY, core.listenerZ, x, y, z);
  };

  private wire(ctx: GameContext): void {
    const on = ctx.events.on.bind(ctx.events);
    const off = this.unsubscribe;

    /* ---- the generic channel ---- */
    off.push(
      on('audio:play', (e) => {
        this.play(e.id, { position: e.position, volume: e.volume, rate: e.rate });
      }),
    );
    off.push(
      on('audio:duck', (e) => {
        this.core?.mixer.duck(e.amount, e.duration);
      }),
    );

    /* ---- weapons ---- */
    off.push(
      on('weapon:fire', (e) => {
        this.stamp('fire');
        this.lastPlayerFire = this.clock;
        this.combat = Math.min(1, this.combat + 0.22);
        _v.copy(e.origin);
        // The player's own weapon is heard from behind the muzzle, not from a
        // point in space a metre in front of the face.
        this.fireShot(e.weaponId, undefined, e.suppressed, true, 1);
        void _v;
      }),
    );
    off.push(
      on('enemy:fire', (e) => {
        this.stamp('enemyfire');
        this.combat = Math.min(1, this.combat + 0.14);
        this.fireShot('enemy_rifle', e.origin, false, false, 1);
      }),
    );
    off.push(
      on('weapon:dryfire', () => {
        if (this.stamped('dryfire', 0.1)) return;
        this.stamp('dryfire');
        this.playById('weapon_dryfire');
      }),
    );
    off.push(
      on('weapon:reload:start', (e) => {
        this.stamp('reload');
        this.reloadSequence(e.weaponId, undefined, 1);
      }),
    );
    off.push(
      on('weapon:reload:shell', () => {
        this.playById('weapon_shell');
      }),
    );
    off.push(
      on('weapon:cycle', (e) => {
        if (this.stamped('cycle', 0.12)) return;
        this.stamp('cycle');
        const core = this.core;
        if (!core) return;
        const pump = e.weaponId === 'shotgun';
        core.emit(pump ? 'pump_cycle' : 'bolt_cycle', {
          bus: 'weapons',
          volume: 0.9,
          rate: 0.96 + core.rng.next() * 0.09,
          priority: 0.68,
          positional: false,
          pan: 0.1,
          wet: 0.4,
        });
      }),
    );
    off.push(
      on('weapon:switch', () => {
        if (this.stamped('switch', 0.15)) return;
        this.stamp('switch');
        this.playById('weapon_switch');
      }),
    );
    off.push(
      on('weapon:firemode', () => {
        this.playById('weapon_firemode');
      }),
    );
    off.push(
      on('weapon:melee', (e) => {
        if (!this.stamped('melee', 0.15)) {
          this.stamp('melee');
          this.playById('weapon_melee');
        }
        if (e.hit) {
          const core = this.core;
          core?.emit('impact:flesh', {
            bus: 'weapons',
            volume: 1,
            priority: 0.8,
            positional: false,
            delay: 0.06,
            wet: 0.4,
          });
        }
      }),
    );
    off.push(
      on('fx:shell', (e) => {
        this.core?.emit('shell_eject', {
          bus: 'weapons',
          volume: 0.4,
          rate: 0.9 + (this.core?.rng.next() ?? 0) * 0.25,
          priority: 0.28,
          positional: false,
          pan: 0.3,
          wet: 0.3,
          delay: 0.02,
        });
        void e;
      }),
    );

    /* ---- projectiles and impacts ---- */
    off.push(
      on('fx:impact', (e) => {
        const core = this.core;
        if (!core) return;
        const surface = e.surface;
        const energy = Math.max(0.15, Math.min(1.4, e.energy));
        core.emit(`impact:${surface}`, {
          bus: 'world',
          volume: (0.55 + 0.55 * energy) * 0.9,
          rate: 0.9 + core.rng.next() * 0.2,
          priority: 0.42,
          x: e.point.x,
          y: e.point.y,
          z: e.point.z,
          model: DISTANCE.world,
        });
      }),
    );
    off.push(
      on('fx:tracer', (e) => {
        const core = this.core;
        const whiz = this.whiz;
        if (!core || !whiz) return;
        // Which side the round went by on, so incoming fire has a direction.
        _v.set(e.end.x - e.origin.x, e.end.y - e.origin.y, e.end.z - e.origin.z);
        const len = _v.length();
        if (len < 0.01) return;
        _v.multiplyScalar(1 / len);
        _v2.set(
          core.listenerX - e.origin.x,
          core.listenerY - e.origin.y,
          core.listenerZ - e.origin.z,
        );
        const along = Math.max(0, Math.min(len, _v2.dot(_v)));
        _v2.set(
          e.origin.x + _v.x * along - core.listenerX,
          e.origin.y + _v.y * along - core.listenerY,
          e.origin.z + _v.z * along - core.listenerZ,
        );
        // Right of travel, in the horizontal plane.
        const rx = -_v.z;
        const rz = _v.x;
        const side = _v2.x * rx + _v2.z * rz;
        whiz.side = Math.max(-1, Math.min(1, side * 1.4));
      }),
    );
    off.push(
      on('fx:whizby', (e) => {
        this.whiz?.play(e.distance, e.speed);
        this.combat = Math.min(1, this.combat + 0.1);
      }),
    );
    off.push(
      on('fx:explosion', (e) => {
        this.explosion(e.position, e.radius, e.source ?? 'grenade');
      }),
    );
    off.push(
      on('fx:flashbang', (e) => {
        const core = this.core;
        if (!core) return;
        this.stamp('flash');
        core.emit('flashbang', {
          bus: 'explosions',
          volume: 1,
          priority: 1,
          x: e.position.x,
          y: e.position.y,
          z: e.position.z,
          model: DISTANCE.explosion,
        });
        this.applyRing(1, e.position, 9);
      }),
    );

    /* ---- the player ---- */
    off.push(
      on('player:footstep', (e) => {
        const stance = this.player?.stance ?? 'stand';
        const weight =
          stance === 'crouch' || stance === 'prone' ? 'crouch' : e.running ? 'run' : 'walk';
        this.footstep(e.surface, e.position, weight, true);
      }),
    );
    off.push(
      on('player:land', (e) => {
        const hard = Math.min(1.4, Math.abs(e.velocity) / 7);
        _v.set(
          this.core?.listenerX ?? 0,
          (this.core?.listenerY ?? 1.6) - 1.4,
          this.core?.listenerZ ?? 0,
        );
        this.footstep(e.surface, _v, hard > 0.55 ? 'land' : 'run', true, 0.5 + hard);
      }),
    );
    off.push(
      on('player:jump', () => {
        this.playById('player_cloth');
      }),
    );
    off.push(
      on('player:vault', () => {
        this.playById('player_vault');
      }),
    );
    off.push(
      on('player:stance', () => {
        this.playById('player_cloth');
      }),
    );
    off.push(
      on('player:damage', (e) => {
        this.playById('player_pain');
        this.combat = 1;
        if (e.kind === 'explosion') this.core?.mixer.duck(0.4, 1.1);
      }),
    );
    off.push(
      on('player:death', () => {
        this.playById('player_death');
        this.core?.mixer.duck(0.65, 3);
        this.music?.sting(0.6);
      }),
    );
    off.push(
      on('player:spawn', () => {
        this.combat = 0;
        this.core?.mixer.duck(0, 0.2);
      }),
    );

    /* ---- enemies ---- */
    off.push(
      on('enemy:death', (e) => {
        const core = this.core;
        if (!core) return;
        core.emit('impact:flesh', {
          bus: 'world',
          volume: 0.9,
          priority: 0.6,
          x: e.position.x,
          y: e.position.y,
          z: e.position.z,
          model: DISTANCE.world,
        });
        core.emit('pain', {
          bus: 'world',
          volume: 0.7,
          rate: 0.82 + core.rng.next() * 0.14,
          priority: 0.55,
          x: e.position.x,
          y: e.position.y + 0.8,
          z: e.position.z,
          model: DISTANCE.world,
          delay: 0.04,
        });
        this.enemyGait.delete(e.id);
      }),
    );
    off.push(
      on('enemy:footstep', (e) => {
        this.enemyStepEventAt = this.clock;
        this.footstep(e.surface, e.position, e.running ? 'run' : 'walk', false, 1.05);
      }),
    );

    /* ---- interface ---- */
    off.push(
      on('ui:hitmarker', (e) => {
        this.playById(e.headshot ? 'ui_hitmarker_head' : 'ui_hitmarker');
        if (e.lethal) {
          this.core?.emit('ui_kill', {
            bus: 'ui',
            volume: 0.85,
            priority: 1,
            positional: false,
            delay: 0.03,
            wet: 0.05,
          });
        }
      }),
    );
    off.push(
      on('killstreak:earned', () => {
        this.playById('killstreak_earned');
        this.music?.sting(0.7);
      }),
    );
    off.push(
      on('airstrike:inbound', (e) => {
        const core = this.core;
        if (!core) return;
        core.emit('ui_warning', { bus: 'ui', volume: 0.9, priority: 0.95, positional: false });
        // The whistle has to land with the bomb, so it starts three seconds out.
        const lead = Math.max(0, e.secondsToImpact - 2.7);
        core.emit('bomb_whistle', {
          bus: 'world',
          volume: 0.8,
          priority: 0.75,
          positional: false,
          delay: lead,
          wet: 0.5,
        });
      }),
    );
    off.push(
      on('airstrike:flyby', (e) => {
        this.stamp('flyby');
        this.jet?.set(
          e.position.x,
          e.position.y,
          e.position.z,
          e.velocity.x,
          e.velocity.y,
          e.velocity.z,
          1,
        );
      }),
    );
    off.push(
      on('killstreak:aircraft', (e) => {
        const src = e.kind === 'jet' ? this.jet : this.heli;
        if (!src) return;
        if (!e.active) {
          src.stop();
          return;
        }
        // No velocity in the event, so derive it from the position change; a
        // helicopter on station barely shifts and should barely doppler.
        src.set(e.position.x, e.position.y, e.position.z, 0, 0, 0, e.kind === 'jet' ? 0.9 : 0.75);
      }),
    );

    /* ---- game and world state ---- */
    off.push(
      on('ui:screen', (e) => {
        this.screen = e.screen;
        const menu = e.screen !== 'none';
        this.core?.mixer.duck(menu ? 0.55 : 0, menu ? 0.4 : 0.5);
        if (this.music) this.music.enabled = true;
        if (this.ambience) this.ambience.trim = menu ? 0.45 : 1;
      }),
    );
    off.push(
      on('game:wave', (e) => {
        if (e.phase === 'incoming') this.music?.sting(0.75);
        if (e.phase === 'incoming') this.music?.push(0.55);
      }),
    );
    off.push(
      on('weather:changed', (e) => {
        if (!this.ambience) return;
        this.ambience.windSpeed = e.windSpeed;
        this.ambience.dust = e.dust;
      }),
    );
    off.push(
      on('quality:changed', () => {
        /* budgets are fixed at init; the mix does not need to change */
      }),
    );
    off.push(
      on('settings:changed', (e) => {
        if (e.key === 'volume' && typeof e.value === 'number') this.setMasterVolume(e.value);
      }),
    );
    off.push(
      on('game:restart', () => {
        this.reset();
      }),
    );
  }

  /** Plays a registered id with no position, for interface and body sounds. */
  private playById(id: string): void {
    const def = REGISTRY[id];
    if (!def || !this.core) return;
    try {
      this.playDef(def, undefined, 1, 1);
    } catch {
      /* ignore */
    }
  }

  private explosion(position: THREE.Vector3, radius: number, source: string): void {
    const core = this.core;
    if (!core) return;
    this.stamp('explosion');
    const airstrike = source === 'airstrike';
    const kind =
      source === 'barrel'
        ? 'barrel'
        : source === 'vehicle'
          ? 'vehicle'
          : source === 'rocket'
            ? 'rocket'
            : airstrike
              ? 'bomb'
              : 'grenade';
    const big = Math.min(1.6, radius / 7);
    core.emit(`blast:${kind}`, {
      bus: 'explosions',
      volume: Math.min(1.15, 0.75 + 0.4 * big),
      rate: 1 - 0.06 * big + core.rng.bi() * 0.04,
      priority: 0.98,
      x: position.x,
      y: position.y,
      z: position.z,
      model: DISTANCE.explosion,
      wet: 1,
    });
    if (radius > 5.5) {
      core.emit('debris', {
        bus: 'explosions',
        volume: 0.6 * big,
        rate: 0.9 + core.rng.next() * 0.2,
        priority: 0.4,
        x: position.x,
        y: position.y,
        z: position.z,
        model: DISTANCE.explosion,
        delay: 0.16,
      });
    }
    if (airstrike || radius > 12) {
      // Something that big is heard twice: once as a blast and once as the
      // ground and the buildings answering it.
      core.emit('distant_rumble', {
        bus: 'explosions',
        volume: 0.85,
        priority: 0.7,
        x: position.x,
        y: position.y,
        z: position.z,
        model: DISTANCE.explosion,
        delay: 0.28,
        wet: 1,
      });
    }
    this.applyRing(airstrike ? 1 : 0.85, position, radius);
    this.combat = 1;
  }

  private reset(): void {
    const core = this.core;
    if (!core) return;
    core.pool.stopAll(core.now);
    this.enemyGait.clear();
    this.stamps.clear();
    this.combat = 0;
  }

  /* ================================ frame ============================== */

  update(dt: number, ctx: GameContext): void {
    this.clock += dt;
    const core = this.core;
    if (!core) return;
    try {
      this.frame(dt, ctx);
    } catch {
      // One bad frame must not become a bad game. Silence beats a crash.
    }
  }

  private frame(dt: number, ctx: GameContext): void {
    const core = this.core;
    const audio = this.ctx;
    if (!core || !audio) return;

    if (!this.started) {
      this.started = true;
      this.player = ctx.tryGet<IPlayer>('player') ?? null;
      this.weapons = ctx.tryGet<IWeapons>('weapons') ?? null;
      this.ai = ctx.tryGet<IAI>('ai') ?? null;
      this.world = ctx.tryGet<IWorld>('world') ?? null;
      this.physics = ctx.tryGet<IPhysics>('physics') ?? null;
      this.spatial.bind(this.physics, this.world);
    }

    // The context is suspended until something clicks. Keep the bookkeeping
    // going but schedule nothing: a suspended context queues every event and
    // then plays the whole backlog at once the moment it resumes.
    const running = audio.state === 'running';

    core.listenerX = ctx.camera.position.x;
    core.listenerY = ctx.camera.position.y;
    core.listenerZ = ctx.camera.position.z;

    this.spatial.resetRayCount();
    _v.set(core.listenerX, core.listenerY, core.listenerZ);
    this.spatial.update(dt, _v);

    if (!running) {
      // Bake anyway once a gesture has been requested, so the first sound after
      // the unlock is not the one that had to wait for the wind bed.
      if (this.unlockRequested && !this.bakeComplete) {
        this.bakeComplete = this.bakery?.pump(1.5) ?? true;
      }
      return;
    }

    this.spatial.updateListener(audio, ctx.camera, core.now);
    this.updateZone(dt);

    const player = this.player;
    if (player && this.body) {
      this.body.health = player.maxHealth > 0 ? player.health / player.maxHealth : 1;
      this.body.winded = player.winded ?? 0;
      this.body.alive = player.alive;
      this.body.holdingBreath = player.breathHeld ?? false;
      this.body.update(dt);
    }

    if (this.ambience) {
      const sky = this.world?.skyVisibility(_v) ?? 1;
      this.ambience.outdoor = sky;
      this.ambience.interior = this.zone === 'interior' || this.zone === 'tunnel' ? 1 : 0;
      this.ambience.update(dt);
    }

    // Combat intensity: decays on its own, pushed by everything violent.
    this.combat = Math.max(0, this.combat - dt * 0.16);
    if (this.music) {
      const nearby = this.awareEnemies();
      this.music.push(Math.min(1, this.combat * 0.75 + nearby * 0.2));
      this.music.enabled = this.screen === 'none' || this.screen === 'pause';
      this.music.update(dt);
    }

    this.jet?.update(dt);
    this.heli?.update(dt);
    this.updateEnemyGait(dt);
    this.updateOcclusionOfLoops();

    core.mixer.updateRing(dt);
    core.sweep();

    if (!this.bakeComplete) {
      // A millisecond and a half a frame: invisible, and the queue drains in
      // the first couple of seconds of play.
      this.bakeComplete = this.bakery?.pump(1.5) ?? true;
    }
  }

  private awareEnemies(): number {
    const ai = this.ai;
    const core = this.core;
    if (!ai || !core) return 0;
    let n = 0;
    const list = ai.enemies;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.alive || !e.aware) continue;
      if (core.distanceTo(e.position.x, e.position.y, e.position.z) < 55) n++;
    }
    return Math.min(1, n / 5);
  }

  /**
   * Long-lived voices need their occlusion re-evaluated as the player moves.
   * One voice per frame, round-robin: at sixty frames a second every live
   * emitter is refreshed several times a second, for the cost of three rays.
   */
  private occlusionCursor = 0;
  private updateOcclusionOfLoops(): void {
    const core = this.core;
    if (!core || !this.spatial.hasPhysics) return;
    const voices = core.pool.all();
    if (voices.length === 0) return;
    for (let tries = 0; tries < 3; tries++) {
      this.occlusionCursor = (this.occlusionCursor + 1) % voices.length;
      const v = voices[this.occlusionCursor];
      if (!v.active || !v.isSpatial) continue;
      // Only worth re-tracing for something that will still be playing.
      if (v.endTime - core.now < 0.25) continue;
      const occ = this.probeOcclusion(v.x, v.y, v.z);
      if (Math.abs(occ - v.occlusion) > 0.02) v.setOcclusion(occ, core.now);
      break;
    }
  }

  private updateZone(dt: number): void {
    this.zoneHold -= dt;
    if (this.manualZone || this.zoneHold > 0) return;
    const inferred = this.spatial.zone;
    if (inferred === this.zone) return;
    // Only accept a change the probe is reasonably sure about, and then hold it
    // for a moment so a doorway cannot make the reverb flutter.
    if (this.spatial.confidence < 0.22) return;
    this.zoneHold = 1.1;
    this.applyZone(inferred, 0.9);
  }

  private applyZone(zone: ZoneName, crossfade: number): void {
    this.zone = zone;
    const core = this.core;
    if (!core) return;
    let ir = this.irs.get(zone) ?? null;
    if (!ir && this.bakery) {
      // The impulse responses are baked eagerly, but be defensive: a zone with
      // no IR should still change the dry path rather than doing nothing.
      ir = this.irs.get('street') ?? null;
    }
    core.setZone(zone, ir, crossfade);
    // The tails for this zone may still be in the queue; ask for them now.
    const b = this.bakery;
    if (b && !b.has(`tail:${zone}:medium`)) {
      b.run(`tails:${zone}`, (bk) => bakeTails(bk, [zone]));
    }
  }

  /* ============================== diagnostics ========================== */

  /** Everything the debug bridge and the performance overlay want. */
  stats(): Record<string, unknown> {
    const core = this.core;
    const b = this.bakery;
    return {
      ready: this.ready,
      state: this.ctx?.state ?? 'none',
      failed: this.failed,
      sampleRate: this.ctx?.sampleRate ?? 0,
      zone: this.zone,
      manualZone: this.manualZone,
      zoneConfidence: Number(this.spatial.confidence.toFixed(3)),
      probe: {
        openness: Number(this.spatial.probe.openness.toFixed(2)),
        nearest: Number(this.spatial.probe.nearest.toFixed(2)),
        ceiling: Number(this.spatial.probe.ceiling.toFixed(2)),
        sky: Number(this.spatial.probe.sky.toFixed(2)),
        elongation: Number(this.spatial.probe.elongation.toFixed(2)),
        enclosure: Number(this.spatial.probe.enclosure.toFixed(2)),
      },
      voices: core ? core.pool.activeCount : 0,
      voiceBudget: core ? core.pool.budget : 0,
      spatialBudget: core ? core.pool.spatialBudget : 0,
      shotGraphs: this.shots?.budget ?? 0,
      sources: core ? core.reaper.liveCount : 0,
      started: core?.started ?? 0,
      dropped: core?.dropped ?? 0,
      ring: core ? Number(core.mixer.ringAmount.toFixed(3)) : 0,
      limiting: core ? Number(core.mixer.limiting.toFixed(2)) : 0,
      clips: b?.clipCount ?? 0,
      clipBytes: b?.bytes ?? 0,
      bakePending: b?.pending ?? 0,
      bakeEagerMs: b ? Number(b.eagerMs.toFixed(1)) : 0,
      bakeDeferredMs: b ? Number(b.deferredMs.toFixed(1)) : 0,
      bakeFailures: b?.failures ?? [],
      rays: this.spatial.rays,
      occlusionCache: this.spatial.cacheStats,
      combat: Number(this.combat.toFixed(2)),
      musicIntensity: this.music ? Number(this.music.intensity.toFixed(2)) : 0,
    };
  }

  /* --- accessors the debug bridge needs; harmless in the shipping path --- */

  get internals(): {
    ctx: AudioContext | null;
    core: AudioCore | null;
    bakery: Bakery | null;
    shots: ShotEngine | null;
    irs: Map<ZoneName, Clip>;
    spatial: Spatial;
  } {
    return {
      ctx: this.ctx,
      core: this.core,
      bakery: this.bakery,
      shots: this.shots,
      irs: this.irs,
      spatial: this.spatial,
    };
  }

  /** Forces every deferred recipe. Used by the numeric harness. */
  finishBaking(): void {
    this.bakery?.finish();
    this.bakeComplete = true;
  }

  /**
   * Renders the whole sound design into a fresh store at an explicit rate and
   * detail level. The numeric harness uses this when the platform refused an
   * `AudioContext`, since the sound design is measurable through an
   * `OfflineAudioContext` whether or not there is an output device.
   */
  bakeStandalone(sampleRate: number, quality = 1): Bakery {
    const b = new Bakery(sampleRate, quality);
    // A throwaway IR sink: the live map must keep the impulse responses that
    // match the live context's rate.
    this.bakeEager(b, new Map<ZoneName, Clip>());
    this.queueDeferred(b);
    b.finish();
    return b;
  }

  onQualityChange(_quality: QualitySettings, _ctx: GameContext): void {
    // The voice budget and the node graphs are fixed at init on purpose: tearing
    // the mixer down mid-match to change a preset would be audible, and the
    // saving is not worth it. Only the bake detail would differ, and that is
    // already done.
  }

  dispose(): void {
    for (const un of this.unsubscribe) {
      try {
        un();
      } catch {
        /* ignore */
      }
    }
    this.unsubscribe.length = 0;
    this.ambience?.stop();
    this.music?.stop();
    this.jet?.stop();
    this.heli?.stop();
    this.shots?.dispose();
    this.core?.dispose();
    this.enemyGait.clear();
    this.stamps.clear();
    const ctx = this.ctx;
    this.ctx = null;
    this.core = null;
    if (ctx) {
      void ctx.close().catch(() => {});
    }
    if (typeof window !== 'undefined') {
      delete (window as unknown as Record<string, unknown>).__AUDIO__;
    }
  }
}
