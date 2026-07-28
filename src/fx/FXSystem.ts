import * as THREE from 'three';
import type { AudioEvent, CameraShakeEvent, ExplosionEvent, TracerEvent } from '../core/Events';
import { type GameContext, type System } from '../core/GameContext';
import type {
  IAI,
  IFX,
  ILighting,
  IPhysics,
  IRenderPipeline,
  ISky,
  RaycastHit,
} from '../core/Interfaces';
import { FxRng } from './Random';
import type { QualitySettings } from '../core/Quality';
import { ejectShell, MuzzleState, nearMiss, playMuzzleFlash, playTracer } from './Ballistics';
import { DecalTile } from './DecalAtlas';
import { decalOpts, type default as DecalSystem } from './DecalSystem';
import { DebrisPool } from './DebrisPool';
import { playExplosion } from './Explosions';
import type { FXHost } from './FXContext';
import { grabPassSupport, needsDepthPrepass } from './FrameState';
import { bloodSpray, playImpact } from './Impacts';
import { playFlashbang, playSmokeScreen } from './Ordnance';
import { ParticleEngine } from './ParticleEngine';
import { ShockwavePool } from './Shockwave';

/**
 * The effects system.
 *
 * It owns the particle engine, the solid-debris pool and the blast waves, and
 * it turns the `fx:*` event vocabulary into them. The recipes themselves live
 * next door in `Impacts`, `Explosions`, `Ballistics` and `Ordnance`; this file
 * is the wiring, the clock and the frame budget.
 *
 * ## The clock
 *
 * Everything about a particle's motion is a closed-form function of its age, so
 * the only state the CPU keeps is a single scalar: the time that spawn records
 * are stamped against. It is published to the shaders in `lateUpdate` *before*
 * being advanced, which makes the effect order-independent — a muzzle flash
 * emitted by the weapon system at order 50 and one emitted by the showcase at
 * order 70 are both exactly zero seconds old when the frame they were created
 * in is drawn. A flash that lives 32 ms cannot afford to lose a frame to the
 * update order, and this is cheaper than negotiating one.
 *
 * It also means the whole system is time-addressable: adding four seconds to
 * the clock puts every live effect exactly where it would have been four
 * seconds later, without simulating the frames in between. The showcase uses
 * that to screenshot one explosion at t = 0.05, 0.3, 1 and 4 s.
 *
 * ## Allocation
 *
 * Nothing in the frame path allocates. Spawn records are writes into
 * pre-sized `Float32Array` rings; the descriptor callers fill is a single
 * shared mutable object; event payloads this system emits come out of small
 * pools rather than object literals; and the deferred queue — the casing ting,
 * the pool of blood that spreads under a body — is a fixed-size ring of
 * primitives. Sustained automatic fire with an airstrike landing and two smoke
 * screens up allocates zero bytes per frame.
 */

const DEFERRED_SLOTS = 48;
const DEFER_SOUND = 1;
const DEFER_BLOOD_POOL = 2;

/** Flashes remembered for `relight`; two per blast, so eight covers a volley. */
const LIGHT_SLOTS = 8;
/** One frame at the harness's fixed rate, and a hair under two at 120 Hz. */
const HOLD_WINDOW = 0.0168;

const _bufferSize = new THREE.Vector2();
const _sunDirection = new THREE.Vector3(0.35, 0.8, 0.42).normalize();
const _sunColor = new THREE.Color(14, 12, 9);
const _skyColor = new THREE.Color(0.55, 0.8, 1.3);
const _vec = new THREE.Vector3();
const _color = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);

/** Pooled event payloads: emitting object literals in combat is a GC hitch. */
class EventPool<T> {
  private items: T[];
  private cursor = 0;
  constructor(size: number, make: () => T) {
    this.items = new Array(size);
    for (let i = 0; i < size; i++) this.items[i] = make();
  }
  next(): T {
    const item = this.items[this.cursor];
    this.cursor = this.cursor + 1 === this.items.length ? 0 : this.cursor + 1;
    return item;
  }
}

export default class FXSystem implements System, IFX, FXHost {
  readonly key = 'fx';
  readonly order = 70;

  ctx!: GameContext;
  readonly particles = new ParticleEngine();
  readonly debris = new DebrisPool();
  readonly rng = new FxRng(0x9e3779b1);
  readonly wind = new THREE.Vector3();
  readonly hit: RaycastHit = {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(0, 1, 0),
    distance: 0,
    object: new THREE.Object3D(),
    surface: 'concrete',
  };

  physics: IPhysics | undefined;
  lighting: ILighting | undefined;
  decals: DecalSystem | undefined;
  ai: IAI | undefined;
  pipeline: IRenderPipeline | undefined;
  private sky: ISky | undefined;

  private shockwaves: ShockwavePool | null = null;
  private muzzle = new MuzzleState();
  private unsubscribe: Array<() => void> = [];
  private showcase: { update?(dt: number): void; dispose?(): void } | null = null;

  /** Post-blast screen state, released back to the pipeline when it decays. */
  private concussionHaze = 0;
  private concussionBlur = 0;
  private concussionHeld = false;

  private tracerCounter = 0;
  private frozen = false;
  private lastBlastTime = -100;
  private lastBlast = new THREE.Vector3(1e9, 1e9, 1e9);
  private elapsed = 0;

  private deferTime = new Float32Array(DEFERRED_SLOTS).fill(-1);
  private deferKind = new Uint8Array(DEFERRED_SLOTS);
  private deferPos = new Float32Array(DEFERRED_SLOTS * 3);
  private deferArg = new Float32Array(DEFERRED_SLOTS);
  private deferSound: string[] = new Array(DEFERRED_SLOTS).fill('');
  private deferCursor = 0;

  private lightAt = new Float32Array(LIGHT_SLOTS * 3);
  private lightRGB = new Float32Array(LIGHT_SLOTS * 3);
  /** Per slot: intensity, radius, duration. */
  private lightSpec = new Float32Array(LIGHT_SLOTS * 3);
  private lightIssued = new Float32Array(LIGHT_SLOTS).fill(-1);
  private lightCursor = 0;

  private audioPool = new EventPool<AudioEvent>(12, () => ({
    id: '',
    position: new THREE.Vector3(),
    volume: 1,
    rate: 1,
  }));
  private shakePool = new EventPool<CameraShakeEvent>(6, () => ({
    amplitude: 0,
    duration: 0,
    frequency: 22,
    position: new THREE.Vector3(),
    radius: 20,
  }));
  private whizPool = new EventPool<{ position: THREE.Vector3; distance: number; speed: number }>(
    8,
    () => ({ position: new THREE.Vector3(), distance: 0, speed: 0 }),
  );

  /* ================================ boot ================================= */

  async init(ctx: GameContext): Promise<void> {
    this.ctx = ctx;
    this.particles.attach(ctx.scene, ctx.quality);
    this.debris.attach(ctx, ctx.quality);
    const grab = grabPassSupport(ctx.renderer, ctx.quality);
    this.shockwaves = new ShockwavePool(grab.enabled, grab.type);
    ctx.scene.add(this.shockwaves.object);
    ctx.renderer.getDrawingBufferSize(_bufferSize);
    this.shockwaves.resize(_bufferSize.x, _bufferSize.y);

    this.subscribe(ctx);

    if (typeof location !== 'undefined' && location.search.includes('showcase=fx')) {
      try {
        const mod = await import('./FXShowcase');
        this.showcase = new mod.FXShowcase(ctx, this);
      } catch (err) {
        console.error('[fx] showcase failed to load:', err);
      }
    }
  }

  private subscribe(ctx: GameContext): void {
    const on = ctx.events.on.bind(ctx.events);
    const off = this.unsubscribe;

    off.push(on('fx:impact', (e) => playImpact(this, e)));
    off.push(on('fx:explosion', (e) => this.explode(e)));
    off.push(on('fx:tracer', (e) => this.tracer(e)));
    off.push(on('fx:muzzleflash', (e) => playMuzzleFlash(this, e, this.muzzle)));
    off.push(on('fx:blood', (e) => bloodSpray(this, e.position, e.direction, e.amount, false)));
    off.push(on('fx:smoke', (e) => playSmokeScreen(this, e.position, e.radius, e.duration)));
    off.push(on('fx:flashbang', (e) => playFlashbang(this, e.position, this.pipeline)));
    off.push(on('fx:shell', (e) => this.shell(e.position, e.velocity, e.caliber)));

    off.push(on('weapon:fire', (e) => this.muzzle.shot(e.suppressed)));
    off.push(on('enemy:death', (e) => this.enemyDeath(e.position, e.impulse, e.headshot)));

    // Nothing else builds the airstrike detonations yet, so this system does.
    // If a killstreak implementation starts emitting `fx:explosion` for each
    // bomb, the duplicate guard below drops ours rather than doubling up.
    off.push(
      on('airstrike:impact', (e) => {
        if (this.elapsed - this.lastBlastTime < 0.3 && this.lastBlast.distanceToSquared(e.position) < 9) {
          return;
        }
        _explosionScratch.position.copy(e.position);
        _explosionScratch.radius = 13;
        _explosionScratch.damage = 220;
        _explosionScratch.scale = 1;
        _explosionScratch.source = 'airstrike';
        _explosionScratch.normal = _up;
        this.explode(_explosionScratch);
      }),
    );
    off.push(on('airstrike:begin', () => this.sound('airstrike_approach', undefined, 1, 1)));

    off.push(on('game:restart', () => this.clear()));
  }

  onQualityChange(quality: QualitySettings, ctx: GameContext): void {
    this.particles.onQualityChange(quality);
    this.debris.onQualityChange(ctx, quality);
    this.shockwaves?.setEnabled(grabPassSupport(ctx.renderer, quality).enabled);
  }

  resize(width: number, height: number): void {
    this.shockwaves?.resize(width, height);
  }

  /* =============================== frame ================================= */

  update(dt: number, ctx: GameContext): void {
    this.physics ??= ctx.tryGet<IPhysics>('physics');
    this.lighting ??= ctx.tryGet<ILighting>('lighting');
    this.decals ??= ctx.tryGet<DecalSystem>('decals');
    this.ai ??= ctx.tryGet<IAI>('ai');
    this.pipeline ??= ctx.tryGet<IRenderPipeline>('render');
    this.sky ??= ctx.tryGet<ISky>('sky');
    if (this.physics && !this.debris.available) this.debris.setPhysics(this.physics);

    if (this.frozen) this.relight();
    else this.tick(dt);
    this.showcase?.update?.(dt);
  }

  /**
   * Stops the effects clock while the rest of the engine keeps running.
   *
   * The screenshot harness poses a camera, then steps several frames so
   * auto-exposure and the temporal history converge before it takes the
   * picture. Those frames would age a 50 ms fireball past the moment the shot
   * is supposed to capture, so the showcase freezes the clock at the requested
   * time and lets everything else settle around a still effect.
   */
  setFrozen(frozen: boolean): void {
    this.frozen = frozen;
  }

  /** Everything with per-frame state. Split out so `advance` can re-run it. */
  private tick(dt: number): void {
    this.elapsed += dt;
    this.muzzle.update(dt);
    this.shockwaves?.update(dt);
    this.runDeferred();
    this.decayConcussion(dt);
  }

  lateUpdate(rawDt: number, ctx: GameContext): void {
    const dt = this.frozen ? 0 : rawDt;
    const quality = ctx.quality;
    const depth = needsDepthPrepass(quality) ? (this.pipeline?.depthTexture ?? null) : null;
    const buffer = ctx.renderer.getDrawingBufferSize(_bufferSize);

    if (this.sky) {
      _sunDirection.copy(this.sky.sunDirection);
      _sunColor.copy(this.sky.sunColor);
      _skyColor.copy(this.sky.skyColor);
      const weather = this.sky.weather;
      const speed = weather.windSpeed * 0.35;
      this.wind.set(
        Math.sin(weather.windDirection) * speed,
        0,
        Math.cos(weather.windDirection) * speed,
      );
    }

    this.particles.setLighting(_sunDirection, _sunColor, _skyColor);
    this.particles.setWind(this.wind.x, this.wind.y, this.wind.z);
    this.particles.setDepth(depth, ctx.camera.near, ctx.camera.far, buffer.x, buffer.y);
    this.shockwaves?.setDepth(depth, ctx.camera.near, ctx.camera.far, buffer.x, buffer.y);

    // Flush the rings against the clock this frame's spawns were stamped
    // against, then publish that same clock and move it on for the next frame.
    // Doing it in this order is what makes a particle exactly zero seconds old
    // in the frame it was created.
    this.particles.update();
    this.particles.flushTime(dt);
  }

  /**
   * Jumps the whole system forward without stepping frames.
   *
   * Legitimate because the particle simulation is closed-form: adding to the
   * clock *is* the simulation. Only the handful of things that genuinely
   * integrate — the blast wave radius, barrel heat, the deferred queue — have
   * to be stepped, and they are cheap enough to run at a fixed sixtieth.
   */
  advance(seconds: number): void {
    const step = 1 / 60;
    let left = Math.max(0, Math.min(120, seconds));
    while (left > 1e-4) {
      const dt = Math.min(step, left);
      this.tick(dt);
      this.particles.skipTime(dt);
      left -= dt;
    }
  }

  /* ============================== IFX ==================================== */

  spawnSmoke(position: THREE.Vector3, radius: number, duration: number): void {
    playSmokeScreen(this, position, radius, duration);
  }

  spawnTracer(from: THREE.Vector3, to: THREE.Vector3, speed: number, caliber: number): void {
    _tracerScratch.origin = from;
    _tracerScratch.end = to;
    _tracerScratch.speed = speed;
    _tracerScratch.caliber = caliber;
    _tracerScratch.fromPlayer = true;
    playTracer(this, _tracerScratch);
  }

  get particleCount(): number {
    return this.particles.particleCount;
  }

  /** Total ring capacity across every batch, for the performance overlay. */
  get particleCapacity(): number {
    return this.particles.capacity;
  }

  clear(): void {
    this.particles.clear();
    this.debris.clear();
    this.shockwaves?.clear();
    this.muzzle.reset();
    this.deferTime.fill(-1);
    this.lightIssued.fill(-1);
    // Which rounds carry a trace element is a counter, not a coin toss, so it
    // has to go back to zero with everything else or a captured burst depends
    // on how many rounds were fired before it.
    this.tracerCounter = 0;
    this.concussionHaze = 0;
    this.concussionBlur = 0;
    this.releaseConcussion();
  }

  /* ============================= FXHost ================================== */

  get quality(): QualitySettings {
    return this.ctx.quality;
  }

  /**
   * Where the sun is, as of the last frame that was drawn. Recipes read it to
   * decide which face of the cloud they are about to build is the lit one. A
   * frame of staleness is irrelevant at the speed the sun moves, and the
   * default points somewhere plausible for the first frame.
   */
  get sunDir(): THREE.Vector3 {
    return _sunDirection;
  }

  groundY(x: number, z: number, fromY: number, fallback: number): number {
    const y = this.physics?.groundHeight?.(x, z, fromY);
    return y === null || y === undefined ? fallback : y;
  }

  distanceTo(x: number, y: number, z: number): number {
    const p = this.ctx.camera.position;
    const dx = p.x - x;
    const dy = p.y - y;
    const dz = p.z - z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  shake(
    amplitude: number,
    duration: number,
    frequency: number,
    at: THREE.Vector3,
    radius: number,
  ): void {
    const evt = this.shakePool.next();
    evt.amplitude = amplitude;
    evt.duration = duration;
    evt.frequency = frequency;
    evt.position!.copy(at);
    evt.radius = radius;
    this.ctx.events.emit('camera:shake', evt);
  }

  sound(id: string, at: THREE.Vector3 | undefined, volume: number, rate: number): void {
    const evt = this.audioPool.next();
    evt.id = id;
    evt.volume = volume;
    evt.rate = rate;
    if (at) evt.position!.copy(at);
    else evt.position!.copy(this.ctx.camera.position);
    this.ctx.events.emit('audio:play', evt);
  }

  addConcussion(haze: number, blur: number): void {
    this.concussionHaze = Math.min(1, Math.max(this.concussionHaze, haze));
    this.concussionBlur = Math.min(1, Math.max(this.concussionBlur, blur));
  }

  light(at: THREE.Vector3, color: number, intensity: number, radius: number, duration: number): void {
    // While the clock is held, the rig must not be handed a flash that outlives
    // the instant being photographed: its own clock keeps running, so a 0.6 s
    // fireball light issued before a four-second fast-forward would still be
    // burning in the picture. Held flashes are re-issued a frame at a time by
    // `relight` instead, at whatever intensity the held instant calls for.
    this.lighting?.flashLight?.(at, color, intensity, radius, this.frozen ? HOLD_WINDOW : duration);

    const i = this.lightCursor;
    this.lightCursor = i + 1 === LIGHT_SLOTS ? 0 : i + 1;
    _color.set(color);
    this.lightAt[i * 3] = at.x;
    this.lightAt[i * 3 + 1] = at.y;
    this.lightAt[i * 3 + 2] = at.z;
    this.lightRGB[i * 3] = _color.r;
    this.lightRGB[i * 3 + 1] = _color.g;
    this.lightRGB[i * 3 + 2] = _color.b;
    this.lightSpec[i * 3] = intensity;
    this.lightSpec[i * 3 + 1] = radius;
    this.lightSpec[i * 3 + 2] = duration;
    this.lightIssued[i] = this.elapsed;
  }

  /**
   * Re-creates the blast lighting of the held instant, once per frame.
   *
   * A pooled flash lives in the lighting rig, whose clock this system does not
   * own and must not stop. So while the effects clock is held, every flash that
   * would still be burning at that instant is re-issued at its residual
   * intensity with a window one frame long — the rig fades a flash by the
   * square of its remaining life, and it ages the pool before this system runs,
   * so a light issued here renders at exactly the intensity asked for and is
   * gone before the next frame re-issues it.
   */
  private relight(): void {
    const flash = this.lighting?.flashLight;
    if (!flash) return;
    for (let i = 0; i < LIGHT_SLOTS; i++) {
      const issued = this.lightIssued[i];
      if (issued < 0) continue;
      const duration = this.lightSpec[i * 3 + 2];
      const age = this.elapsed - issued;
      if (age < 0 || age >= duration) {
        this.lightIssued[i] = -1;
        continue;
      }
      const remain = 1 - age / duration;
      _color.setRGB(this.lightRGB[i * 3], this.lightRGB[i * 3 + 1], this.lightRGB[i * 3 + 2]);
      _vec.set(this.lightAt[i * 3], this.lightAt[i * 3 + 1], this.lightAt[i * 3 + 2]);
      this.lighting?.flashLight(
        _vec,
        _color,
        this.lightSpec[i * 3] * remain * remain,
        this.lightSpec[i * 3 + 1],
        HOLD_WINDOW,
      );
    }
  }

  /* ============================= handlers ================================ */

  private explode(evt: ExplosionEvent): void {
    const shockwaves = this.shockwaves;
    if (!shockwaves) return;
    this.lastBlastTime = this.elapsed;
    this.lastBlast.copy(evt.position);
    playExplosion(this, evt, shockwaves);
  }

  private tracer(evt: TracerEvent): void {
    // Only a fraction of rounds carry a trace element. Incoming fire gets a
    // higher rate than outgoing, because a round the player cannot see coming
    // is information they never had.
    this.tracerCounter++;
    const every = evt.fromPlayer ? 3 : 2;
    if (this.tracerCounter % every === 0) playTracer(this, evt);

    if (!evt.fromPlayer) {
      const miss = nearMiss(this, evt, this.ctx.camera.position);
      if (miss < 3) {
        const whiz = this.whizPool.next();
        whiz.position.copy(this.ctx.camera.position);
        whiz.distance = miss;
        whiz.speed = evt.speed;
        this.ctx.events.emit('fx:whizby', whiz);
      }
    }
  }

  private shell(position: THREE.Vector3, velocity: THREE.Vector3, caliber: number): void {
    const fall = ejectShell(this, position, velocity, caliber);
    const ground = this.groundY(position.x, position.z, position.y + 0.5, position.y - 3);
    this.defer(DEFER_SOUND, fall, position.x, ground, position.z, 0.35, 'shell_land');
  }

  private enemyDeath(position: THREE.Vector3, impulse: THREE.Vector3, headshot: boolean): void {
    _vec.copy(impulse);
    if (_vec.lengthSq() < 1e-6) _vec.set(0, 0.4, 1);
    else _vec.normalize();
    // A lethal hit throws a directional mist; a headshot throws considerably
    // more of it. This is the whole of the gore budget and it is deliberate.
    bloodSpray(this, position, _vec, headshot ? 2.2 : 1.3, true);

    const ground = this.groundY(position.x, position.z, position.y + 1.2, position.y - 2.5);
    // The pool arrives once the body has stopped moving, not with the shot.
    this.defer(DEFER_BLOOD_POOL, 1.6, position.x, ground + 0.02, position.z, headshot ? 1.25 : 1, '');
  }

  /* ============================ deferred queue ============================ */

  private defer(
    kind: number,
    delay: number,
    x: number,
    y: number,
    z: number,
    arg: number,
    sound: string,
  ): void {
    const slot = this.deferCursor;
    this.deferCursor = this.deferCursor + 1 === DEFERRED_SLOTS ? 0 : this.deferCursor + 1;
    this.deferTime[slot] = this.elapsed + Math.max(0, delay);
    this.deferKind[slot] = kind;
    this.deferPos[slot * 3] = x;
    this.deferPos[slot * 3 + 1] = y;
    this.deferPos[slot * 3 + 2] = z;
    this.deferArg[slot] = arg;
    this.deferSound[slot] = sound;
  }

  private runDeferred(): void {
    for (let i = 0; i < DEFERRED_SLOTS; i++) {
      const due = this.deferTime[i];
      if (due < 0 || due > this.elapsed) continue;
      this.deferTime[i] = -1;
      _vec.set(this.deferPos[i * 3], this.deferPos[i * 3 + 1], this.deferPos[i * 3 + 2]);
      if (this.deferKind[i] === DEFER_SOUND) {
        this.sound(this.deferSound[i], _vec, this.deferArg[i], this.rng.range(0.9, 1.15));
      } else if (this.deferKind[i] === DEFER_BLOOD_POOL) {
        const size = 0.55 * this.deferArg[i];
        const o = decalOpts(DecalTile.BLOOD_POOL, size);
        o.depth = 0.4;
        o.opacity = 0.95;
        o.rotation = this.rng.range(0, Math.PI * 2);
        o.normalStrength = 0.35;
        o.glossScale = 1.8;
        o.angleMin = 0.55;
        // Spreads over four seconds, which is what makes it read as liquid
        // rather than as a texture that faded in.
        o.fadeIn = 4;
        o.growTo = size * 2.6;
        this.decals?.place(_vec, _up, o);
      }
    }
  }

  /* ============================== concussion ============================== */

  private decayConcussion(dt: number): void {
    const pipeline = this.pipeline;
    if (!pipeline) return;
    if (this.concussionHaze <= 0.004 && this.concussionBlur <= 0.004) {
      this.releaseConcussion();
      return;
    }
    this.concussionHaze = Math.max(0, this.concussionHaze - dt * 1.35);
    this.concussionBlur = Math.max(0, this.concussionBlur - dt * 2.1);
    pipeline.setHeatHaze(this.concussionHaze);
    pipeline.setRadialBlur(this.concussionBlur);
    this.concussionHeld = true;
  }

  /** Hands the shared post-effect knobs back so nothing else has to fight us. */
  private releaseConcussion(): void {
    if (!this.concussionHeld) return;
    this.concussionHeld = false;
    this.pipeline?.setHeatHaze(0);
    this.pipeline?.setRadialBlur(0);
  }

  /* ============================== lifecycle =============================== */

  dispose(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
    this.showcase?.dispose?.();
    this.showcase = null;
    this.releaseConcussion();
    this.shockwaves?.dispose();
    this.shockwaves = null;
    this.debris.dispose();
    this.particles.dispose();
  }
}

/** Reused payloads for the two places this system constructs an event itself. */
const _explosionScratch: ExplosionEvent = {
  position: new THREE.Vector3(),
  radius: 8,
  damage: 100,
  scale: 1,
  source: 'grenade',
  normal: _up,
};

const _tracerScratch: TracerEvent = {
  origin: new THREE.Vector3(),
  end: new THREE.Vector3(),
  speed: 800,
  caliber: 7.62,
  fromPlayer: true,
};
