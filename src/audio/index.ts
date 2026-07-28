/**
 * The audio system.
 *
 * Everything the game hears is synthesised at runtime: there is not a single
 * audio file in the project. `synth/` is a small DSP toolkit, `sounds/` uses it
 * to design roughly two hundred sounds as layered recipes, and this file is the
 * seam between those and the rest of the game.
 *
 * Two things this system does that are worth knowing about from outside:
 *
 *  - It subscribes to `GameEvents` for everything nobody else already covers.
 *    Where a module already calls `play()` directly — combat for impacts, the
 *    weapon system for its mechanical sounds — this file deliberately does not
 *    also react to the matching event, because the result would be every sound
 *    played twice.
 *  - It drives its own listener. `setListener` exists on the contract and the
 *    player module calls it, but if that call ever stops arriving this system
 *    falls back to reading `PlayerSystem` directly, because a stale listener is
 *    the single worst failure mode in game audio: everything keeps playing, from
 *    the wrong place, and nothing looks broken.
 */
import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { ORDER } from '../core/System';
import type {
  AISystem,
  AudioSystem,
  PhysicsSystem,
  PlayerSystem,
  SoundId,
  WorldSystem,
} from '../core/Contracts';
import type { Damageable, SurfaceType } from '../core/GameTypes';
import { clamp, saturate } from '../core/MathUtils';
import { AudioEngine, VOICE_BUDGET, type EngineStats } from './AudioEngine';
import { Ambience, type AmbienceId } from './Ambience';
import { Gunfire } from './Gunfire';
import { Music } from './Music';
import { Vitals } from './Vitals';
import { footstepSoundId } from './sounds';

/** Gestures that count as "the user has interacted"; any of them unlocks audio. */
const GESTURES: readonly string[] = [
  'pointerdown',
  'mousedown',
  'touchstart',
  'keydown',
  'click',
];

/** Warm-up budget per frame while the cold half of the bank is still rendering. */
const WARMUP_BUDGET_MS = 2.5;

/** Combat intensity decays to zero over roughly this many seconds of quiet. */
const INTENSITY_DECAY = 0.16;

interface AmbienceHint {
  indoors?: boolean;
  space?: string | null;
  reverb?: number;
}

export class AudioSystemImpl implements AudioSystem, System {
  readonly name = 'audio' as const;
  readonly order = ORDER.AUDIO;

  private readonly engine = new AudioEngine();
  private readonly ambience = new Ambience(this.engine);
  private readonly music = new Music(this.engine);
  private readonly vitals = new Vitals(this.engine);
  private readonly gunfire = new Gunfire(this.engine);

  private ctx: EngineContext | null = null;
  private player: PlayerSystem | null = null;
  private world: WorldSystem | null = null;
  private physics: PhysicsSystem | null = null;
  private localEntity: Damageable | null = null;

  private readonly unsubscribe: Array<() => void> = [];
  private readonly gestureHandler = (): void => {
    void this.unlock();
  };
  private readonly visibilityHandler = (): void => {
    if (typeof document === 'undefined') return;
    if (document.hidden) this.engine.suspendForVisibility();
    else this.engine.resumeFromVisibility();
  };
  private gesturesBound = false;

  /** Scratch vectors. Never handed out and never retained by a caller. */
  private readonly eye = new THREE.Vector3();
  private readonly forward = new THREE.Vector3(0, 0, -1);
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly velocity = new THREE.Vector3();
  private readonly point = new THREE.Vector3();

  /** Combat intensity, 0..1, driving the score. */
  private intensity = 0;
  private intensityFloor = 0;
  private indoors = 0;
  private paused = false;
  private frameCount = 0;
  private listenerFrames = 0;
  private ambienceId: AmbienceId = 'exterior';
  private explicitAmbience = false;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    if (!this.engine.init()) return;

    this.player = ctx.tryGet<PlayerSystem>('player') ?? null;
    this.world = ctx.tryGet<WorldSystem>('world') ?? null;
    this.physics = ctx.tryGet<PhysicsSystem>('physics') ?? null;
    this.localEntity = this.player?.entity ?? null;
    this.engine.setPhysics(this.physics);

    // Occlusion raycasts scale with the quality tier: they are the only part of
    // the audio update that touches the physics world.
    this.engine.occlusion.testsPerFrame = ctx.config.particleBudget < 400 ? 2 : 4;

    this.bindGestures();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    // The hot set — gunfire, impacts, footsteps, the interface — is rendered
    // synchronously here so the first trigger pull is never silent. The rest is
    // rendered a couple of milliseconds at a time from `update`.
    this.engine.warmHotSet();

    this.subscribe(ctx);
    this.ambience.set(this.ambienceId);
    this.installTestHook();
  }

  private bindGestures(): void {
    if (this.gesturesBound || typeof window === 'undefined') return;
    this.gesturesBound = true;
    for (const type of GESTURES) {
      window.addEventListener(type, this.gestureHandler, { passive: true });
    }
  }

  private unbindGestures(): void {
    if (!this.gesturesBound || typeof window === 'undefined') return;
    this.gesturesBound = false;
    for (const type of GESTURES) window.removeEventListener(type, this.gestureHandler);
  }

  get unlocked(): boolean {
    return this.engine.unlocked;
  }

  async unlock(): Promise<void> {
    await this.engine.unlock();
    // Once running there is no reason to keep listening for gestures, and the
    // handlers would otherwise fire on every click for the rest of the session.
    if (this.engine.unlocked) this.unbindGestures();
  }

  dispose(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
    this.unbindGestures();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    this.vitals.stop();
    this.music.stop(0.1);
    this.ambience.stop(0.1);
    this.engine.dispose();
    if (typeof window !== 'undefined') {
      delete (window as unknown as Record<string, unknown>).__AUDIO_TEST__;
      delete (window as unknown as Record<string, unknown>).__AUDIO_STATS__;
    }
  }

  // ---------------------------------------------------------------------------
  // Contract
  // ---------------------------------------------------------------------------

  play(
    id: SoundId,
    position?: THREE.Vector3,
    opts?: { volume?: number; pitch?: number; refDistance?: number; maxDistance?: number },
  ): void {
    this.engine.play(id, position ?? null, {
      volume: opts?.volume,
      pitch: opts?.pitch,
      refDistance: opts?.refDistance,
      maxDistance: opts?.maxDistance,
    });
  }

  play2D(id: SoundId, opts?: { volume?: number; pitch?: number }): void {
    this.engine.play2D(id, { volume: opts?.volume, pitch: opts?.pitch, immediate: true });
  }

  gunshot(id: SoundId, position: THREE.Vector3, suppressed: boolean, isLocal: boolean): void {
    this.gunfire.fire(id, position, suppressed, isLocal);
    // Gunfire is the strongest signal that a fight is happening; the local
    // player's own fire counts for more than a distant exchange.
    this.bumpIntensity(isLocal ? 0.34 : 0.16);
  }

  setListener(
    position: THREE.Vector3,
    forward: THREE.Vector3,
    up: THREE.Vector3,
    velocity: THREE.Vector3,
  ): void {
    this.engine.setListener(position, forward, up, velocity);
    this.listenerFrames = 0;
  }

  setDeafen(amount: number, duration: number): void {
    const graph = this.engine.graph;
    if (!graph) return;
    graph.setDeafen(amount, duration);
    // The ambience is pulled down separately: it is the layer the tinnitus tone
    // has to be legible over, and the deafen low-pass alone leaves a wind bed
    // sitting right on top of it.
    this.ambience.setDuck(1 - saturate(amount) * 0.85);
  }

  setMasterVolume(v: number): void {
    this.engine.graph?.setMasterVolume(v);
  }

  setMusicIntensity(v: number): void {
    // Callers use this two ways: the settings menu as a volume, gameplay as an
    // intensity. Treat it as a floor under the measured combat intensity, which
    // makes both readings behave sensibly.
    this.intensityFloor = saturate(v);
  }

  setAmbience(id: AmbienceId): void {
    this.explicitAmbience = true;
    this.ambienceId = id;
    this.ambience.set(id);
    this.indoors = id === 'exterior' ? 0 : 1;
  }

  // ---------------------------------------------------------------------------
  // Per-frame
  // ---------------------------------------------------------------------------

  update(dt: number, ctx: EngineContext): void {
    if (!this.engine.ok) return;
    this.frameCount++;

    this.resolveSystems(ctx);
    this.driveListener();
    this.engine.update(dt);

    if (!this.engine.warmedUp) this.engine.pumpWarmup(WARMUP_BUDGET_MS);

    this.updateIntensity(dt);
    this.updateVitals(dt);

    this.ambience.update(dt);
    const weapons = this.engine.graph?.weaponsLevel() ?? 0;
    this.music.setIntensity(
      this.paused ? 0.14 : Math.max(this.intensity, this.intensityFloor * 0.55),
    );
    this.music.update(dt, weapons);

    // Heavy sustained fire pushes the ambience down too, not just the music:
    // wind under a firefight is mud, and the voices are better spent elsewhere.
    if (this.engine.graph && this.engine.graph.deafenAmount() <= 0.01) {
      this.ambience.setDuck(clamp(1 - weapons * 1.6, 0.35, 1));
    }
  }

  private resolveSystems(ctx: EngineContext): void {
    // Systems can be registered after audio initialises, and any of them may be
    // absent entirely in a stripped build or a test harness.
    if (!this.player) {
      this.player = ctx.tryGet<PlayerSystem>('player') ?? null;
      this.localEntity = this.player?.entity ?? null;
    }
    if (!this.world) this.world = ctx.tryGet<WorldSystem>('world') ?? null;
    if (!this.physics) {
      this.physics = ctx.tryGet<PhysicsSystem>('physics') ?? null;
      if (this.physics) this.engine.setPhysics(this.physics);
    }
  }

  /**
   * Keep the listener current. The player module calls `setListener` every
   * frame, but audio must not depend on that: if the call stops arriving for a
   * few frames this reads the player directly, and if there is no player at all
   * it falls back to the camera.
   */
  private driveListener(): void {
    if (this.engine.listenerWasSet) {
      this.listenerFrames = 0;
      return;
    }
    this.listenerFrames++;
    if (this.listenerFrames < 3) return;

    const player = this.player;
    if (player) {
      player.getEyePosition(this.eye);
      player.getLookDirection(this.forward);
      this.up.set(0, 1, 0);
      this.velocity.copy(player.velocity);
      this.engine.setListener(this.eye, this.forward, this.up, this.velocity);
      return;
    }

    const camera = this.ctx?.camera;
    if (!camera) return;
    camera.getWorldPosition(this.eye);
    camera.getWorldDirection(this.forward);
    this.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    // No velocity source without a player, so no Doppler. Better than guessing.
    this.velocity.set(0, 0, 0);
    this.engine.setListener(this.eye, this.forward, this.up, this.velocity);
  }

  private updateIntensity(dt: number): void {
    this.intensity = Math.max(0, this.intensity - INTENSITY_DECAY * dt);
    // Standing next to live enemies is itself tension, independent of shooting.
    if (this.frameCount % 15 === 0) {
      const ai = this.ctx?.tryGet<AISystem>('ai');
      const alive = ai?.aliveCount ?? 0;
      if (alive > 0) this.intensity = Math.max(this.intensity, clamp(alive / 8, 0, 0.42));
    }
  }

  private bumpIntensity(amount: number): void {
    this.intensity = saturate(this.intensity + amount);
  }

  private updateVitals(dt: number): void {
    const player = this.player;
    if (player) {
      const entity = player.entity;
      if (entity) {
        this.vitals.setHealth(entity.maxHealth > 0 ? entity.health / entity.maxHealth : 1);
        this.vitals.setAlive(entity.isAlive);
      }
      // Exertion from actual speed rather than from the sprint flag, so walking
      // uphill into a fight sounds different from standing still in one.
      const speed = player.speed;
      this.vitals.setExertion(
        saturate(speed / 7) * (player.isTacticalSprinting ? 1 : player.isSprinting ? 0.85 : 0.5),
      );
    }
    this.vitals.update(dt, this.engine.graph?.deafenAmount() ?? 0);
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  private on<T>(ctx: EngineContext, type: string, handler: (payload: T) => void): void {
    this.unsubscribe.push(ctx.events.on<T>(type, handler));
  }

  /**
   * Every payload here is read synchronously and never retained. Combat's
   * payloads in particular are pooled and reused, so holding one would mean
   * reading a different event's data a frame later.
   */
  private subscribe(ctx: EngineContext): void {
    // ---- Player ------------------------------------------------------------
    this.on<{ position: THREE.Vector3; surface: SurfaceType; loud: boolean }>(
      ctx,
      'player:footstep',
      (e) => this.footstep(e.position, e.surface, e.loud),
    );

    this.on<{ impactSpeed: number; surface: SurfaceType }>(ctx, 'player:landed', (e) => {
      const hard = e.impactSpeed > 7.5;
      const strength = clamp((e.impactSpeed - 2) / 9, 0.15, 1);
      this.engine.play2D(hard ? 'land_hard' : 'land_soft', {
        volume: strength,
        pitch: 1.06 - strength * 0.14,
        immediate: true,
      });
      // The surface still colours the landing: the boot layer is the same
      // footstep design, just louder and pitched down.
      this.engine.play2D(footstepSoundId(e.surface), {
        volume: strength * 0.8,
        pitch: 0.86,
        immediate: true,
      });
      if (hard) this.engine.play2D('gear_rustle', { volume: 0.7, immediate: true });
    });

    this.on<{ amount: number; direction: THREE.Vector3; health: number }>(
      ctx,
      'player:damaged',
      (e) => {
        const max = this.localEntity?.maxHealth ?? 100;
        const fraction = saturate(e.health / Math.max(1, max));
        this.vitals.setHealth(fraction);
        const id =
          e.amount > 34 || fraction < 0.3
            ? 'player_hurt_heavy'
            : e.amount > 14
              ? 'player_hurt'
              : 'player_hurt_light';
        this.engine.play2D(id, { volume: clamp(0.5 + e.amount / 60, 0.4, 1), immediate: true });
        this.bumpIntensity(0.3);
      },
    );

    this.on<{ health: number }>(ctx, 'player:heal', (e) => {
      const max = this.localEntity?.maxHealth ?? 100;
      this.vitals.setHealth(saturate(e.health / Math.max(1, max)));
    });

    this.on(ctx, 'player:death', () => {
      this.vitals.setAlive(false);
      this.engine.play2D('player_death', { volume: 1, immediate: true });
      // Everything the player was doing stops with them.
      this.engine.stopTagged('vitals:breath', 0.25);
      this.intensity = 0;
    });

    this.on<{ position: THREE.Vector3 }>(ctx, 'player:spawn', () => {
      this.vitals.setAlive(true);
      this.vitals.setHealth(1);
      this.engine.play2D('player_spawn', { volume: 0.8, immediate: true });
    });

    this.on(ctx, 'player:sprintStart', () => this.vitals.setExertion(0.85));
    this.on(ctx, 'player:sprintEnd', () => this.vitals.setExertion(0.25));
    this.on(ctx, 'player:slideStart', () => {
      this.engine.play2D('slide_start', { volume: 0.85, immediate: true });
    });
    this.on<{ height: number }>(ctx, 'player:mantleStart', (e) => {
      this.engine.play2D('mantle_grunt', {
        volume: clamp(0.5 + e.height * 0.3, 0.5, 1),
        immediate: true,
      });
    });

    // ---- Weapons -----------------------------------------------------------
    // The weapon system plays its own mechanical sounds and calls `gunshot()`
    // directly, so these handlers only add what nothing else covers.
    this.on<{ weaponId: string; suppressed: boolean }>(ctx, 'weapon:fire', () => {
      this.bumpIntensity(0.02);
    });

    this.on<{ from: string | null; to: string }>(ctx, 'weapon:switch', () => {
      // A weapon swap ends any tail the previous one left ringing on the
      // viewmodel bus; the report tails are positional and stay.
      this.engine.stopTagged('weapon:local', 0.08);
    });

    this.on<{ weaponId: string }>(ctx, 'weapon:empty', () => {
      // `weapon:empty` fires both on a dry trigger pull and on firing the last
      // round. The weapon system already plays the dry fire, so this is just the
      // magazine going light: a subtle spring rattle.
      this.engine.play2D('weapon_bolt_lock', { volume: 0.3, pitch: 1.2, immediate: true });
    });

    // ---- Combat ------------------------------------------------------------
    // Impact and explosion sounds are played by combat itself; these handlers
    // provide the feedback layer that only the shooter hears.
    this.on<{
      result: { target: Damageable | null; point: THREE.Vector3; surface: SurfaceType };
      damage: number;
      isHeadshot: boolean;
      attacker: Damageable | null;
    }>(ctx, 'combat:hit', (e) => {
      if (!this.isLocal(e.attacker)) return;
      const id = e.isHeadshot ? 'ui_hitmarker_headshot' : 'ui_hitmarker';
      this.engine.play2D(id, { volume: clamp(0.5 + e.damage / 90, 0.5, 1), immediate: true });
      if (e.result?.target) {
        this.point.copy(e.result.point);
        this.engine.play('flesh_hit', this.point, { volume: 0.7 });
      }
      this.bumpIntensity(0.1);
    });

    this.on<{
      victim: Damageable;
      killer: Damageable | null;
      isHeadshot: boolean;
      distance: number;
    }>(ctx, 'combat:kill', (e) => {
      if (this.isLocal(e.killer)) {
        this.engine.play2D('ui_hitmarker_kill', { volume: 1, immediate: true });
      }
      // The body landing, wherever it happened.
      if (e.victim) {
        e.victim.getPosition(this.point);
        this.engine.play('body_fall', this.point, { volume: 0.85 });
      }
      this.bumpIntensity(0.25);
    });

    this.on<{ position: THREE.Vector3; radius: number; kind: string }>(
      ctx,
      'combat:explosion',
      (e) => {
        // Combat plays the blast itself. What it cannot know is how the room
        // answers, so add the reverberant thunder and a debris settle.
        const distance = this.engine.listenerAt.distanceTo(e.position);
        this.point.copy(e.position);
        if (distance > 45) {
          this.engine.play('explosion_distant', this.point, {
            volume: clamp(e.radius / 12, 0.3, 1.2),
          });
        }
        if (this.indoors > 0.4 && distance < 60) {
          this.engine.play('amb_debris_settle', this.point, { volume: 0.7 });
        }
        this.bumpIntensity(0.45);
      },
    );

    // Payload is pooled: read the two fields we need and let it go.
    this.on<{ distance: number; isLocalPlayer: boolean }>(ctx, 'combat:nearmiss', (e) => {
      if (!e.isLocalPlayer) return;
      // Combat plays the whizz. The adrenaline response is ours.
      this.bumpIntensity(0.38);
      this.vitals.setExertion(Math.min(1, 0.5 + (1 - saturate(e.distance / 2)) * 0.5));
    });

    // ---- AI ----------------------------------------------------------------
    this.on<{ enemyId: number; position: THREE.Vector3 }>(ctx, 'ai:alerted', () => {
      this.bumpIntensity(0.12);
    });

    // ---- Killstreaks -------------------------------------------------------
    this.on<{ id: string; name: string }>(ctx, 'killstreak:earned', () => {
      this.engine.play2D('ui_killstreak', { volume: 0.9, immediate: true });
    });

    this.on<{ origin: THREE.Vector3; heading: number }>(ctx, 'killstreak:airstrikeCalled', () => {
      this.engine.play2D('radio_airstrike_inbound', { volume: 1, immediate: true });
      this.bumpIntensity(0.6);
    });

    this.on<{ position: THREE.Vector3 }>(ctx, 'killstreak:airstrikeImpact', () => {
      this.bumpIntensity(0.8);
    });

    // ---- UI ----------------------------------------------------------------
    this.on<{ text: string; sub?: string; kind?: 'info' | 'warn' | 'reward' }>(
      ctx,
      'ui:notify',
      (e) => {
        const id =
          e.kind === 'reward' ? 'ui_reward' : e.kind === 'warn' ? 'ui_error' : 'ui_notify';
        this.engine.play2D(id, { volume: 0.7, immediate: true });
      },
    );

    // ---- Engine and world --------------------------------------------------
    this.on<boolean>(ctx, 'engine:paused', (paused) => {
      this.paused = paused === true;
      if (this.paused) {
        this.engine.graph?.setBusVolume('sfx', 0.25);
        this.engine.graph?.setBusVolume('weapons', 0.15);
        this.engine.graph?.setBusVolume('ambience', 0.3);
        this.music.setIntensity(0.15);
      } else {
        this.engine.graph?.setBusVolume('sfx', 1);
        this.engine.graph?.setBusVolume('weapons', 1);
        this.engine.graph?.setBusVolume('ambience', 1);
      }
    });

    this.on<AmbienceHint>(ctx, 'world:ambience', (e) => this.applyAmbienceHint(e));
  }

  private isLocal(entity: Damageable | null | undefined): boolean {
    if (!entity) return false;
    if (this.localEntity) return entity === this.localEntity;
    const player = this.player;
    return player ? entity === player.entity : false;
  }

  private footstep(position: THREE.Vector3, surface: SurfaceType, loud: boolean): void {
    this.point.copy(position);
    const local = this.engine.listenerAt.distanceToSquared(this.point) < 4;
    this.engine.play(footstepSoundId(surface), local ? null : this.point, {
      volume: loud ? 1 : 0.55,
      // A loud step is not just a louder step, it is a brighter one — more heel,
      // more grit, less of the soft roll of a careful footfall.
      toneDb: loud ? 2.5 : -3,
      immediate: local,
    });
    // Gear does not move much when you are trying to be quiet.
    if (loud || Math.random() < 0.4) {
      this.engine.play(local ? 'gear_rustle' : 'ai_gear_shift', local ? null : this.point, {
        volume: loud ? 0.55 : 0.22,
        immediate: local,
        priorityScale: 0.4,
      });
    }
  }

  /**
   * The world module reports indoor/outdoor plus a reverb weight. It has no
   * concept of a tunnel, so that is inferred: a small, very reverberant volume
   * with the player under it is a tunnel rather than a room.
   */
  private applyAmbienceHint(hint: AmbienceHint | undefined): void {
    if (!hint) return;
    const indoors = hint.indoors === true;
    const reverb = saturate(hint.reverb ?? 0);
    this.indoors = indoors ? 1 : 0;
    this.ambience.setReverbWeight(indoors ? reverb : 0.15);
    this.gunfire.setEnvironment(this.indoors, reverb);
    if (this.explicitAmbience) return;
    const id: AmbienceId = !indoors ? 'exterior' : reverb > 0.82 ? 'tunnel' : 'interior';
    if (id !== this.ambienceId) {
      this.ambienceId = id;
      this.ambience.set(id);
    }
  }

  // ---------------------------------------------------------------------------
  // Diagnostics
  // ---------------------------------------------------------------------------

  /** Engine metrics, exposed for the debug overlay and the test harness. */
  stats(): EngineStats & {
    budget: number;
    intensity: number;
    musicLayers: number;
    ambience: string;
    shots: number;
  } {
    return {
      ...this.engine.stats(),
      budget: VOICE_BUDGET,
      intensity: Math.round(this.intensity * 100) / 100,
      musicLayers: this.music.activeLayers,
      ambience: this.ambience.id ?? 'none',
      shots: this.gunfire.shotsFired,
    };
  }

  /**
   * `?audiotest=1` installs `window.__AUDIO_TEST__()`, which renders every
   * designed sound through an `OfflineAudioContext` and reports objective
   * measurements. Audio cannot be checked from a screenshot; it can be checked
   * from numbers.
   */
  private installTestHook(): void {
    if (typeof window === 'undefined') return;
    const global = window as unknown as Record<string, unknown>;
    global.__AUDIO_STATS__ = (): unknown => this.stats();

    const search = typeof location !== 'undefined' ? location.search : '';
    if (!/[?&]audiotest=1/.test(search)) return;
    global.__AUDIO_TEST__ = async (filter?: string): Promise<unknown> => {
      const { runAudioSelfTest } = await import('./dev/SelfTest');
      return runAudioSelfTest(this.engine, filter);
    };
  }
}

/** Exposed so a debug overlay can type against the metrics without importing internals. */
export type { EngineStats } from './AudioEngine';
export { VOICE_BUDGET } from './AudioEngine';
