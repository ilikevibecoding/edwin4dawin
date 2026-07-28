import * as THREE from 'three';
import { Layers } from '../core/GameContext';
import type { QualitySettings } from '../core/Quality';
import { PARTICLE_FRAG, PARTICLE_VERT } from '../shaders/fx/particle.glsl';
import { makeUploadRange, needsDepthPrepass, queueUpload } from './FrameState';
import { ATLAS_COLUMNS, ATLAS_ROWS, createParticleAtlas } from './ParticleTextures';

/**
 * The particle engine.
 *
 * One draw call per material. Seven materials cover everything in the game:
 * lit smoke, lit dust, blackbody fire, stretched sparks, lit solid fragments,
 * gore and tracers. A particle is 28 floats of spawn record in an interleaved
 * instance buffer; nothing in this file touches a position after the record is
 * written.
 *
 * Allocation discipline
 * ---------------------
 * The typed arrays, the geometries, the materials and the single mutable
 * `ParticleDesc` are all created once. `spawn` writes 28 floats and advances a
 * cursor. Sustained automatic fire, an airstrike and a smoke screen at the same
 * time therefore allocate exactly nothing, which is the whole point: this is
 * the system most able to produce a GC hitch in the middle of a firefight.
 *
 * Slot allocation is a bump cursor that wraps. The oldest particle is the one
 * overwritten, which is the correct eviction policy for effects — the round
 * that just landed matters more than the smoke from three seconds ago — and it
 * needs no free list. `instanceCount` follows a high-water mark that resets to
 * zero once every particle in the batch has expired, so an idle batch costs one
 * skipped draw rather than a full sweep of dead instances.
 */

export const Batch = {
  SMOKE: 0,
  DUST: 1,
  FIRE: 2,
  SPARK: 3,
  CHUNK: 4,
  BLOOD: 5,
  TRACER: 6,
} as const;

export type BatchId = (typeof Batch)[keyof typeof Batch];

/** Floats per particle: seven vec4 instanced attributes. */
const STRIDE = 28;

/**
 * How much cloud stands between a point and the sun, in cloud radii.
 *
 * The cloud is approximated by the sphere of radius `radius` about its centre,
 * and the answer is the chord from the point to where the sun enters it: zero
 * on the lit face, up to two on the far side. Recipes multiply the result by
 * however opaque a radius of their particular smoke is and hand it to
 * `ParticleDesc.burial`.
 *
 * Passing a zero `oy` and the column's cross-sectional radius gives the same
 * answer for a vertical plume, whose occlusion is dominated by how far across
 * the stalk the light has to come.
 */
export function sunBurial(
  sun: THREE.Vector3,
  ox: number,
  oy: number,
  oz: number,
  radius: number,
): number {
  const r = Math.max(1e-3, radius);
  const x = ox / r;
  const y = oy / r;
  const z = oz / r;
  const along = x * sun.x + y * sun.y + z * sun.z;
  const inside = 1 - (x * x + y * y + z * z) + along * along;
  return inside <= 0 ? 0 : Math.max(0, Math.sqrt(inside) - along);
}

/**
 * A spawn record. One shared, mutable instance lives on the engine; callers
 * fill it and call `spawn`. Passing an object literal per particle would put
 * thousands of short-lived objects a second in front of the collector.
 */
export class ParticleDesc {
  px = 0;
  py = 0;
  pz = 0;
  vx = 0;
  vy = 0;
  vz = 0;
  /** Seconds the particle lives. */
  life = 1;
  /** Linear drag coefficient in 1/s. Zero is ballistic. */
  drag = 0;
  /** Multiplier on -9.81 m/s^2. Negative floats a particle upward. */
  gravity = 1;
  size0 = 0.2;
  size1 = 0.4;
  /** Exponent on normalised age when interpolating size; < 1 expands early. */
  sizeCurve = 1;
  /** Colour at birth. For the fire batch this is (T0 kelvin, T1 kelvin, intensity). */
  r0 = 1;
  g0 = 1;
  b0 = 1;
  a0 = 1;
  /** Colour at death. For the fire batch `r1` is instead the soot fraction. */
  r1 = 1;
  g1 = 1;
  b1 = 1;
  a1 = 0;
  seed = 0;
  sprite = 0;
  /** Metres of sinusoidal curl per second of age. */
  turbulence = 0;
  /** World height the particle bounces off; only used by colliding batches. */
  groundY = -1e6;
  rotation = 0;
  spin = 0;
  /** Seconds of motion the velocity streak represents. */
  stretch = 0;
  /** Seconds to wait before the particle appears. */
  delay = 0;

  /**
   * How much of its own cloud stands between this particle and the sun, as an
   * optical depth. Zero is a puff on the lit face; two or three is one buried
   * in the middle of a smoke screen, which then receives almost no direct sun
   * and is shaded by the sky alone.
   *
   * Without it every puff in a cloud is lit as though it were the only one
   * there, and a smoke screen photographs as a single white mass with no
   * interior — the scatter term can shade one puff against itself, but it has
   * no way to know that four metres of smoke are in the way. This is the cheap
   * substitute for that: one number per particle, worked out at spawn from the
   * shape the recipe is about to build, which is the only place anything knows
   * what the cloud looks like.
   *
   * It shares a slot with `stretch`. A batch either draws its particles
   * stretched along their velocity or lights them as a participating medium;
   * nothing does both, so the two never collide.
   */
  get burial(): number {
    return this.stretch;
  }

  set burial(v: number) {
    this.stretch = v;
  }

  reset(): this {
    this.px = 0;
    this.py = 0;
    this.pz = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.life = 1;
    this.drag = 0;
    this.gravity = 1;
    this.size0 = 0.2;
    this.size1 = 0.4;
    this.sizeCurve = 1;
    this.r0 = 1;
    this.g0 = 1;
    this.b0 = 1;
    this.a0 = 1;
    this.r1 = 1;
    this.g1 = 1;
    this.b1 = 1;
    this.a1 = 0;
    this.seed = 0;
    this.sprite = 0;
    this.turbulence = 0;
    this.groundY = -1e6;
    this.rotation = 0;
    this.spin = 0;
    this.stretch = 0;
    this.delay = 0;
    return this;
  }

  position(x: number, y: number, z: number): this {
    this.px = x;
    this.py = y;
    this.pz = z;
    return this;
  }

  velocity(x: number, y: number, z: number): this {
    this.vx = x;
    this.vy = y;
    this.vz = z;
    return this;
  }

  colors(
    r0: number,
    g0: number,
    b0: number,
    a0: number,
    r1: number,
    g1: number,
    b1: number,
    a1: number,
  ): this {
    this.r0 = r0;
    this.g0 = g0;
    this.b0 = b0;
    this.a0 = a0;
    this.r1 = r1;
    this.g1 = g1;
    this.b1 = b1;
    this.a1 = a1;
    return this;
  }

  sizes(a: number, b: number, curve = 1): this {
    this.size0 = a;
    this.size1 = b;
    this.sizeCurve = curve;
    return this;
  }
}

interface BatchConfig {
  name: string;
  /** Fraction of `quality.maxParticles` this batch owns. */
  share: number;
  lit: boolean;
  fire: boolean;
  soft: boolean;
  stretch: boolean;
  collide: boolean;
  additive: boolean;
  /**
   * Emit *and* absorb, rather than only emit. Fire uses it: an additive
   * fireball has no way to be darker than what is behind it, so its sooty
   * shell cannot exist and every overlap drives the buffer further towards
   * white until the whole ball is one flat blown-out disc.
   */
  premultiplied: boolean;
  renderOrder: number;
  /**
   * `TRANSPARENT_LATE` for anything that has to composite into the volumetric
   * fog — which is everything a blast throws up. Tracers go on `GLOW` instead:
   * they are drawn with the opaque pass, so the fog attenuates them with
   * distance and a round crossing a smoke bank dims behind it.
   */
  layer: number;
  /** Normalised age over which the particle fades in, and out. */
  fadeIn: number;
  fadeOut: number;
  /** Metres of depth difference over which the soft fade runs. */
  softness: number;
  windInfluence: number;
  restitution: number;
  friction: number;
  /** Scatter tuning: wrap, optical depth, forward gain, ambient gain. */
  scatter: [number, number, number, number];
}

const LATE = Layers.TRANSPARENT_LATE;

const CONFIGS: BatchConfig[] = [
  {
    name: 'smoke',
    share: 0.3,
    lit: true,
    fire: false,
    soft: true,
    stretch: false,
    collide: false,
    additive: false,
    premultiplied: false,
    renderOrder: 10,
    layer: LATE,
    fadeIn: 0.1,
    fadeOut: 0.42,
    softness: 1.6,
    windInfluence: 1,
    restitution: 0,
    friction: 1,
    // A tight terminator and a strong sky term. Wrapped further the cloud has
    // no shadow side at all and a smoke screen photographs as one flat mass of
    // whatever colour the sun happens to be; the contrast between a sunlit top
    // and a sky-lit underside is most of what makes it read as a volume.
    scatter: [0.5, 2.9, 1.2, 1.45],
  },
  {
    name: 'dust',
    share: 0.18,
    lit: true,
    fire: false,
    soft: true,
    stretch: false,
    collide: false,
    additive: false,
    premultiplied: false,
    renderOrder: 11,
    layer: LATE,
    fadeIn: 0.07,
    fadeOut: 0.5,
    softness: 0.9,
    windInfluence: 0.75,
    restitution: 0,
    friction: 1,
    scatter: [0.85, 1.7, 1.9, 1.25],
  },
  {
    name: 'fire',
    share: 0.12,
    lit: false,
    fire: true,
    soft: true,
    stretch: false,
    collide: false,
    additive: false,
    premultiplied: true,
    renderOrder: 22,
    layer: LATE,
    fadeIn: 0.04,
    fadeOut: 0.4,
    softness: 0.6,
    windInfluence: 0.35,
    restitution: 0,
    friction: 1,
    scatter: [0.7, 2, 1, 1],
  },
  {
    name: 'spark',
    share: 0.16,
    lit: false,
    fire: true,
    soft: true,
    stretch: true,
    collide: true,
    additive: true,
    premultiplied: false,
    renderOrder: 24,
    layer: LATE,
    fadeIn: 0.02,
    fadeOut: 0.3,
    softness: 0.25,
    windInfluence: 0.2,
    restitution: 0.38,
    friction: 0.55,
    scatter: [0.7, 2, 1, 1],
  },
  {
    name: 'chunk',
    share: 0.12,
    lit: true,
    fire: false,
    soft: false,
    stretch: false,
    collide: true,
    additive: false,
    premultiplied: false,
    renderOrder: 12,
    layer: LATE,
    fadeIn: 0.01,
    fadeOut: 0.2,
    softness: 0.3,
    windInfluence: 0.1,
    restitution: 0.3,
    friction: 0.6,
    // A chip of masonry is opaque, so the scatter model's transmission term is
    // nearly zero for it and the sun contributes almost nothing away from the
    // lit face. Left at the smoke tuning every fragment renders as a black
    // fleck; the ambient gain is what makes them read as stone.
    scatter: [0.35, 1.1, 0.3, 1.7],
  },
  {
    name: 'blood',
    share: 0.08,
    lit: true,
    fire: false,
    soft: false,
    stretch: true,
    collide: true,
    additive: false,
    premultiplied: false,
    renderOrder: 13,
    layer: LATE,
    fadeIn: 0.01,
    fadeOut: 0.25,
    softness: 0.3,
    windInfluence: 0.1,
    restitution: 0.15,
    friction: 0.4,
    scatter: [0.6, 3.4, 0.7, 0.9],
  },
  {
    name: 'tracer',
    share: 0.04,
    lit: false,
    // A tracer is burning phosphor, not a blackbody: the colour is the
    // compound, so it comes from the gradient rather than a temperature.
    fire: false,
    soft: true,
    stretch: true,
    collide: false,
    additive: true,
    premultiplied: false,
    renderOrder: 4,
    layer: Layers.GLOW,
    fadeIn: 0.02,
    fadeOut: 0.35,
    softness: 0.4,
    windInfluence: 0,
    restitution: 0,
    friction: 1,
    scatter: [0.7, 2, 1, 1],
  },
];

class ParticleBatch {
  readonly config: BatchConfig;
  readonly mesh: THREE.Mesh;
  readonly geometry: THREE.InstancedBufferGeometry;
  readonly material: THREE.ShaderMaterial;
  readonly buffer: THREE.InstancedInterleavedBuffer;
  readonly data: Float32Array;
  readonly deaths: Float32Array;
  readonly capacity: number;

  private head = 0;
  private highWater = 0;
  private latestDeath = 0;
  private dirtyLo = -1;
  private dirtyHi = -1;
  private uploadRange = makeUploadRange();
  liveCount = 0;
  /** Particles requested since the last reset, including those evicted. */
  spawned = 0;

  constructor(config: BatchConfig, capacity: number, uniforms: Record<string, THREE.IUniform>) {
    this.config = config;
    this.capacity = Math.max(16, capacity);
    this.data = new Float32Array(this.capacity * STRIDE);
    this.deaths = new Float32Array(this.capacity);

    this.buffer = new THREE.InstancedInterleavedBuffer(this.data, STRIDE, 1);
    this.buffer.setUsage(THREE.DynamicDrawUsage);

    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.setAttribute('position', QUAD_POSITION);
    this.geometry.setAttribute('uv', QUAD_UV);
    this.geometry.setIndex(QUAD_INDEX);
    for (let i = 0; i < ATTRIBUTE_NAMES.length; i++) {
      this.geometry.setAttribute(
        ATTRIBUTE_NAMES[i],
        new THREE.InterleavedBufferAttribute(this.buffer, 4, i * 4, false),
      );
    }
    this.geometry.instanceCount = 0;
    // Particles are authored in world space with the mesh at the origin, so a
    // bounding volume would have to cover the level; culling is off instead.
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    const defines: Record<string, string> = {};
    if (config.lit) defines.FX_LIT = '1';
    if (config.fire) defines.FX_FIRE = '1';
    if (config.soft) defines.FX_SOFT = '1';
    if (config.stretch) defines.FX_STRETCH = '1';
    if (config.collide) defines.FX_COLLIDE = '1';
    if (config.premultiplied) defines.FX_PREMULT = '1';

    this.material = new THREE.ShaderMaterial({
      name: `fx.particle.${config.name}`,
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      uniforms,
      defines,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: config.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      // With `NormalBlending` this swaps the source factor from SRC_ALPHA to
      // ONE, which is what makes the emit-and-absorb output above composite.
      premultipliedAlpha: config.premultiplied,
      side: THREE.DoubleSide,
      toneMapped: false,
      fog: false,
      lights: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = `fx.particles.${config.name}`;
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.renderOrder = config.renderOrder;
    this.mesh.layers.set(config.layer);
    this.mesh.visible = false;
    this.mesh.userData.noPrepass = true;
  }

  spawn(d: ParticleDesc, now: number): void {
    const slot = this.head;
    this.head = this.head + 1 === this.capacity ? 0 : this.head + 1;
    if (slot + 1 > this.highWater) this.highWater = slot + 1;
    this.spawned++;

    const t0 = now + d.delay;
    const o = slot * STRIDE;
    const a = this.data;
    a[o] = d.px;
    a[o + 1] = d.py;
    a[o + 2] = d.pz;
    a[o + 3] = t0;
    a[o + 4] = d.vx;
    a[o + 5] = d.vy;
    a[o + 6] = d.vz;
    a[o + 7] = d.life;
    a[o + 8] = d.drag;
    a[o + 9] = d.gravity;
    a[o + 10] = d.size0;
    a[o + 11] = d.size1;
    a[o + 12] = d.r0;
    a[o + 13] = d.g0;
    a[o + 14] = d.b0;
    a[o + 15] = d.a0;
    a[o + 16] = d.r1;
    a[o + 17] = d.g1;
    a[o + 18] = d.b1;
    a[o + 19] = d.a1;
    a[o + 20] = d.seed;
    a[o + 21] = d.sprite;
    a[o + 22] = d.turbulence;
    a[o + 23] = d.groundY;
    a[o + 24] = d.rotation;
    a[o + 25] = d.spin;
    a[o + 26] = d.stretch;
    a[o + 27] = d.sizeCurve;

    const death = t0 + d.life;
    this.deaths[slot] = death;
    if (death > this.latestDeath) this.latestDeath = death;

    if (this.dirtyLo < 0 || slot < this.dirtyLo) this.dirtyLo = slot;
    if (slot > this.dirtyHi) this.dirtyHi = slot;
  }

  update(now: number, countLive: boolean): void {
    if (this.highWater > 0 && now > this.latestDeath) {
      this.head = 0;
      this.highWater = 0;
      this.latestDeath = 0;
      this.liveCount = 0;
    }

    if (this.dirtyLo >= 0) {
      queueUpload(
        this.buffer,
        this.uploadRange,
        this.dirtyLo * STRIDE,
        (this.dirtyHi - this.dirtyLo + 1) * STRIDE,
      );
      this.dirtyLo = -1;
      this.dirtyHi = -1;
    }

    this.geometry.instanceCount = this.highWater;
    this.mesh.visible = this.highWater > 0;

    if (countLive) {
      let live = 0;
      const deaths = this.deaths;
      for (let i = 0; i < this.highWater; i++) if (deaths[i] > now) live++;
      this.liveCount = live;
    }
  }

  clear(): void {
    this.head = 0;
    this.highWater = 0;
    this.latestDeath = 0;
    this.liveCount = 0;
    this.dirtyLo = -1;
    this.dirtyHi = -1;
    this.geometry.instanceCount = 0;
    this.mesh.visible = false;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}

const ATTRIBUTE_NAMES = ['aSpawn', 'aVel', 'aDyn', 'aCol0', 'aCol1', 'aMisc', 'aMisc2'];

/* One quad, shared by every batch: four vertices and two triangles. */
const QUAD_POSITION = new THREE.BufferAttribute(
  new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]),
  3,
);
const QUAD_UV = new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2);
const QUAD_INDEX = new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1);

export class ParticleEngine {
  readonly desc = new ParticleDesc();
  /** Multiplies every requested particle count; follows `debrisDensity`. */
  densityScale = 1;

  private batches: ParticleBatch[] = [];
  private atlas: THREE.DataTexture;
  private group = new THREE.Group();
  private frame = 0;
  private time = 0;
  private softEnabled = true;

  private shared: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uWind: { value: new THREE.Vector3() },
    uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
    uSunColor: { value: new THREE.Color(12, 10, 8) },
    uSkyColor: { value: new THREE.Color(0.6, 0.9, 1.4) },
    uDepthTexture: { value: null },
    uDepthParams: { value: new THREE.Vector4(0.05, 1000, 1 / 1920, 1 / 1080) },
    uHasDepth: { value: 0 },
    uAtlas: { value: null },
    uAtlasDim: { value: new THREE.Vector2(ATLAS_COLUMNS, ATLAS_ROWS) },
    uAtlasInset: { value: 1.5 / 128 },
    uSizeScale: { value: 1 },
    uExposure: { value: 1 },
  };

  constructor() {
    this.atlas = createParticleAtlas();
    this.shared.uAtlas.value = this.atlas;
    this.group.name = 'fx.particles';
    this.group.matrixAutoUpdate = false;
  }

  attach(scene: THREE.Scene, quality: QualitySettings): void {
    scene.add(this.group);
    this.build(quality);
  }

  private build(quality: QualitySettings): void {
    for (const batch of this.batches) batch.dispose();
    this.batches.length = 0;

    // Without a prepass the pipeline hands out the depth attachment of the
    // target it is currently writing into, which cannot legally be sampled.
    // Soft particles switch off rather than read undefined memory.
    this.softEnabled = needsDepthPrepass(quality);
    // Counts follow the particle budget, not `debrisDensity`: that one governs
    // physics bodies, and halving a plume's sprite count halves its *shape*,
    // not just its cost. The floor is deliberately high — a column built from
    // a dozen billboards reads as a dozen billboards at any size — and the
    // compensating size bump below buys back the coverage instead.
    const budget = quality.maxParticles / 12000;
    this.densityScale = Math.min(1.5, Math.max(0.5, 0.45 + 0.55 * budget));
    // Fewer, larger puffs still have to occlude: coverage is what smoke is for.
    this.shared.uSizeScale.value = Math.min(1.45, Math.pow(1 / this.densityScale, 0.35));

    for (const config of CONFIGS) {
      const capacity = Math.round(quality.maxParticles * config.share);
      const uniforms: Record<string, THREE.IUniform> = {
        ...this.shared,
        uFade: { value: new THREE.Vector2(config.fadeIn, config.fadeOut) },
        uOpacity: { value: 1 },
        uCollide: { value: new THREE.Vector2(config.restitution, config.friction) },
        uSoftness: { value: config.softness },
        uWindInfluence: { value: config.windInfluence },
        uScatter: { value: new THREE.Vector4(...config.scatter) },
      };
      const effective: BatchConfig = this.softEnabled
        ? config
        : { ...config, soft: false };
      const batch = new ParticleBatch(effective, capacity, uniforms);
      this.batches.push(batch);
      this.group.add(batch.mesh);
    }
  }

  onQualityChange(quality: QualitySettings): void {
    this.build(quality);
  }

  /** Commits the shared descriptor into a batch's ring. */
  spawn(batch: BatchId): void {
    this.batches[batch].spawn(this.desc, this.time);
  }

  /** Scales a requested particle count by the quality budget; always >= 1. */
  count(requested: number): number {
    return Math.max(1, Math.round(requested * this.densityScale));
  }

  /** Ring size of one batch, for effects that must not monopolise it. */
  capacityOf(batch: BatchId): number {
    return this.batches[batch]?.capacity ?? 0;
  }

  /**
   * Publishes the clock that every spawn record written this frame carries,
   * then advances it ready for the next frame.
   *
   * The order matters. Publishing first means a particle created anywhere in
   * this frame — by a system that updates before this one, by this one, or by
   * one that updates after — is drawn at exactly zero seconds old. Advancing
   * first would age it by a frame, which for a 32 ms muzzle flash is most of
   * its life.
   */
  flushTime(dt: number): void {
    this.shared.uTime.value = this.time;
    this.time += dt;
  }

  /** Moves the clock without publishing, for deterministic fast-forward. */
  skipTime(seconds: number): void {
    this.time += seconds;
  }

  /** The clock every spawn record is timestamped against. */
  get now(): number {
    return this.time;
  }

  setWind(x: number, y: number, z: number): void {
    (this.shared.uWind.value as THREE.Vector3).set(x, y, z);
  }

  setLighting(sunDirection: THREE.Vector3, sunColor: THREE.Color, skyColor: THREE.Color): void {
    (this.shared.uSunDirection.value as THREE.Vector3).copy(sunDirection);
    (this.shared.uSunColor.value as THREE.Color).copy(sunColor);
    (this.shared.uSkyColor.value as THREE.Color).copy(skyColor);
  }

  setDepth(texture: THREE.Texture | null, near: number, far: number, w: number, h: number): void {
    const usable = this.softEnabled && texture !== null;
    this.shared.uDepthTexture.value = usable ? texture : null;
    this.shared.uHasDepth.value = usable ? 1 : 0;
    (this.shared.uDepthParams.value as THREE.Vector4).set(near, far, 1 / Math.max(1, w), 1 / Math.max(1, h));
  }

  update(): void {
    this.frame++;
    // The live count only feeds the perf overlay, so it is sampled rather than
    // recomputed every frame across every ring.
    const countLive = this.frame % 8 === 0;
    for (const batch of this.batches) batch.update(this.time, countLive);
  }

  get particleCount(): number {
    let n = 0;
    for (const batch of this.batches) n += batch.liveCount;
    return n;
  }

  get capacity(): number {
    let n = 0;
    for (const batch of this.batches) n += batch.capacity;
    return n;
  }

  clear(): void {
    for (const batch of this.batches) batch.clear();
  }

  dispose(): void {
    for (const batch of this.batches) batch.dispose();
    this.batches.length = 0;
    this.group.removeFromParent();
    this.atlas.dispose();
  }
}
