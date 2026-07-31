import * as THREE from 'three';
import { SoAPool } from '../core/ObjectPool';
import { buildParticleShader } from './shaders/ParticleShader';

/**
 * Floats per instance. Six vec4s of spawn state, one of atlas/curve data and one
 * of per-particle shading and collision state.
 */
const STRIDE = 32;

/**
 * Spawn parameters. One shared mutable instance is filled and handed to
 * `spawn()` so emission never allocates; a group copies what it needs into its
 * typed arrays and forgets the descriptor.
 */
export interface ParticleDesc {
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  /** Diameter in metres at birth and at death. */
  size0: number;
  size1: number;
  /** Roll in radians and its rate. Ignored by stretched groups. */
  roll: number;
  rollRate: number;
  r0: number;
  g0: number;
  b0: number;
  /**
   * Peak opacity, before the fade-in/fade-out envelope.
   *
   * May exceed 1. The fragment shader clamps the final coverage, so a value
   * above 1 means "stay fully opaque until the envelope has come down far enough
   * to matter" — which is what dense smoke actually does, and the only way to
   * get it, because coverage reaching the screen is the product of this, the
   * sprite's own alpha and the fade curve.
   */
  alpha: number;
  r1: number;
  g1: number;
  b1: number;
  /** 0 alpha-blended, 1 fully additive; anything between is a mix. */
  additive: number;
  /** Acceleration along the group's gravity direction, m/s^2. */
  gravity: number;
  /** Linear drag coefficient, 1/s. */
  drag: number;
  /** Turbulence amplitude in metres per second of lifetime. */
  turbulence: number;
  /**
   * Extra length per m/s of speed, for stretched groups.
   *
   * Length along the velocity is `size * (1 + stretch * speed)`, so this is a
   * time in seconds: the streak is as long as the distance the particle covers in
   * `stretch` seconds. A spark wants something like 0.7 — a fiftieth of that
   * leaves it a round dot travelling very fast, which is the difference between a
   * shower of sparks and a sprinkle of orange pixels.
   */
  stretch: number;
  /** Atlas cell index, or the first frame of a flipbook. */
  cell: number;
  /** Flipbook frame count, 0 for a static cell. */
  frames: number;
  /** Fraction of life spent fading in. */
  fadeIn: number;
  /** Depth-fade band in metres for soft particles. */
  softness: number;
  /**
   * How much of the sun reaches this particle, 0..1.
   *
   * Particles are not in the shadow map, so without this every puff of dust in
   * a shadowed street is shaded as though it were in full sun — which is most of
   * why a burst of dust washes out a frame it should barely tint. Emitters probe
   * occlusion once per effect and hand the answer down; the sun term in the
   * shader is scaled by it and the ambient term is not, so a shadowed particle
   * settles onto the sky fill instead of going black.
   */
  sunVisibility: number;
  /**
   * How much of the sun survives the rest of this particle's own cloud, 0..1.
   *
   * Every sprite in a cloud is shaded, and the cloud still comes out flat. The
   * shading is symmetric about each sprite's own centre, so a hundred of them
   * scattered through a volume put a hundred identical little gradients side by
   * side and the sum has no gradient at all — which is exactly the "uniformly
   * grey-brown, no directional lighting" a smoke bank reads as. What is missing
   * is not per-sprite shading but the cloud shadowing itself: a puff on the far
   * side is behind several metres of smoke and genuinely receives a fraction of
   * what the near side does.
   *
   * Kept apart from `sunVisibility` because the two attenuate different things.
   * Geometry occlusion takes the whole sun away, rim included; smoke in front of
   * smoke does not, since the rim is lit precisely by the light that made it
   * through. So this scales the diffuse term only.
   */
  cloudShadow: number;
  /**
   * World height of the ground under this particle, for groups that bounce.
   *
   * `NO_FLOOR` disables the collision entirely. Emitters that know where the
   * floor is — every impact and every explosion already probes it — pass it so
   * chips and sparks land and settle instead of sinking through the pavement.
   */
  floorY: number;
  /** Restitution of the ground bounce, 0 dead stop to 1 perfectly elastic. */
  bounce: number;
  /** 0..255; the lowest-priority live particles are recycled first. */
  priority: number;
}

/** Sentinel `floorY` meaning "this particle never collides". */
export const NO_FLOOR = -1e9;

export const PD: ParticleDesc = {
  px: 0,
  py: 0,
  pz: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  life: 1,
  size0: 0.2,
  size1: 0.4,
  roll: 0,
  rollRate: 0,
  r0: 1,
  g0: 1,
  b0: 1,
  alpha: 1,
  r1: 1,
  g1: 1,
  b1: 1,
  additive: 0,
  gravity: 0,
  drag: 0,
  turbulence: 0,
  stretch: 0,
  cell: 0,
  frames: 0,
  fadeIn: 0.1,
  softness: 0.5,
  sunVisibility: 1,
  cloudShadow: 1,
  floorY: NO_FLOOR,
  bounce: 0.3,
  priority: 128,
};

export function resetDesc(): ParticleDesc {
  const d = PD;
  d.px = d.py = d.pz = 0;
  d.vx = d.vy = d.vz = 0;
  d.life = 1;
  d.size0 = 0.2;
  d.size1 = 0.4;
  d.roll = 0;
  d.rollRate = 0;
  d.r0 = d.g0 = d.b0 = 1;
  d.alpha = 1;
  d.r1 = d.g1 = d.b1 = 1;
  d.additive = 0;
  d.gravity = 0;
  d.drag = 0;
  d.turbulence = 0;
  d.stretch = 0;
  d.cell = 0;
  d.frames = 0;
  d.fadeIn = 0.1;
  d.softness = 0.5;
  d.sunVisibility = 1;
  d.cloudShadow = 1;
  d.floorY = NO_FLOOR;
  d.bounce = 0.3;
  d.priority = 128;
  return d;
}

export interface ParticleGroupOptions {
  name: string;
  capacity: number;
  map: THREE.Texture;
  atlasCols: number;
  atlasRows: number;
  soft: boolean;
  lit: boolean;
  /**
   * Fraction of the quad's half-width the sprite's silhouette reaches, for lit
   * groups.
   *
   * The sphere the lit shader shades against is only as wide as this: a
   * generator that draws a puff two thirds of the way to its cell border and a
   * sphere fitted to the whole quad never reach the same horizon, and a sphere
   * whose limb sits outside the sprite has no lit side and no dark side inside
   * the part that is actually drawn.
   */
  footprint?: number;
  /** Shade the whole sprite as one tumbling facet; for solid debris. */
  flake?: boolean;
  stretch: boolean;
  /** Lay the quad flat in the world XZ plane (ground rings). */
  ground?: boolean;
  /** Dark texels occlude while bright ones add; for fireballs. */
  soot?: boolean;
  /**
   * Drive colour off a cooling ramp instead of a two-stop lerp.
   *
   * A linear mix from white-hot to dark red never passes through yellow or
   * orange: the bright endpoint dominates the interpolation, so the sprite goes
   * from white to pale pink to dark and the whole impression of something
   * cooling is lost. The ramp visits the temperatures in order.
   */
  blackbody?: boolean;
  /** Bounce off `floorY` and settle instead of falling through it. */
  bounce?: boolean;
  turbulence: boolean;
  /** Exponent shaping the birth-size to death-size interpolation. */
  sizeExponent: number;
  colorExponent: number;
  /** Exponent of the `(1 - t)` fade-out; below 1 holds density longer. */
  fadeExponent: number;
  turbFrequency: number;
  turbScroll: number;
  turbOctave: number;
  renderOrder: number;
  nearFadeStart: number;
  nearFadeRange: number;
  /** True for groups that live in the viewmodel scene. */
  viewmodel: boolean;
  depthWrite: boolean;
}

let nextGroupId = 0;

const QUAD_POSITION = new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]);
const QUAD_INDEX = new Uint16Array([0, 1, 2, 0, 2, 3]);

/**
 * One draw call's worth of particles: a single instanced quad whose per-instance
 * attributes are the complete spawn state of the particle. The CPU touches a
 * slot twice in its life — once on spawn, once on retirement — and uploads only
 * the range of slots it actually dirtied.
 */
export class ParticleGroup {
  readonly name: string;
  readonly id: number;
  readonly capacity: number;
  readonly mesh: THREE.Mesh;
  readonly viewmodel: boolean;
  readonly soft: boolean;

  private readonly data: Float32Array;
  private readonly buffer: THREE.InstancedInterleavedBuffer;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly pool: SoAPool;
  private readonly death: Float32Array;
  private readonly priority: Uint8Array;

  private dirtyMin = Infinity;
  private dirtyMax = -Infinity;
  private evictCursor = 0;
  private spawned = 0;
  private dropped = 0;

  constructor(opts: ParticleGroupOptions) {
    this.name = opts.name;
    this.id = nextGroupId++;
    this.capacity = Math.max(16, opts.capacity | 0);
    this.viewmodel = opts.viewmodel;
    // A viewmodel group has no scene depth to fade against; the weapon's own
    // depth buffer already sorts it.
    this.soft = opts.soft && !opts.viewmodel;
    this.pool = new SoAPool(this.capacity);
    this.death = new Float32Array(this.capacity);
    this.priority = new Uint8Array(this.capacity);
    this.data = new Float32Array(this.capacity * STRIDE);

    this.buffer = new THREE.InstancedInterleavedBuffer(this.data, STRIDE, 1);
    this.buffer.setUsage(THREE.DynamicDrawUsage);

    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(QUAD_POSITION, 3));
    this.geometry.setIndex(new THREE.BufferAttribute(QUAD_INDEX, 1));
    this.geometry.setAttribute('aP0', new THREE.InterleavedBufferAttribute(this.buffer, 4, 0));
    this.geometry.setAttribute('aV0', new THREE.InterleavedBufferAttribute(this.buffer, 4, 4));
    this.geometry.setAttribute('aSize', new THREE.InterleavedBufferAttribute(this.buffer, 4, 8));
    this.geometry.setAttribute('aCol0', new THREE.InterleavedBufferAttribute(this.buffer, 4, 12));
    this.geometry.setAttribute('aCol1', new THREE.InterleavedBufferAttribute(this.buffer, 4, 16));
    this.geometry.setAttribute('aPhys', new THREE.InterleavedBufferAttribute(this.buffer, 4, 20));
    this.geometry.setAttribute('aMisc', new THREE.InterleavedBufferAttribute(this.buffer, 4, 24));
    this.geometry.setAttribute('aShade', new THREE.InterleavedBufferAttribute(this.buffer, 4, 28));
    this.geometry.instanceCount = 0;
    // Bounds are meaningless for a GPU-simulated cloud, and the group is a
    // single draw either way.
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    const shader = buildParticleShader({
      soft: this.soft,
      lit: opts.lit,
      flake: opts.flake === true,
      stretch: opts.stretch,
      ground: opts.ground === true,
      turbulence: opts.turbulence,
      straightAlpha: opts.viewmodel,
      soot: opts.soot === true && !opts.viewmodel,
      blackbody: opts.blackbody === true,
      bounce: opts.bounce === true,
    });

    this.material = new THREE.ShaderMaterial({
      name: `fx:${opts.name}`,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader,
      defines: shader.defines,
      uniforms: {
        uTime: { value: 0 },
        uGravityDir: { value: new THREE.Vector3(0, -1, 0) },
        uAtlas: { value: new THREE.Vector2(opts.atlasCols, opts.atlasRows) },
        uCurves: {
          value: new THREE.Vector4(
            opts.sizeExponent,
            opts.colorExponent,
            opts.fadeExponent,
            opts.turbFrequency,
          ),
        },
        uTurb: { value: new THREE.Vector2(opts.turbScroll, opts.turbOctave) },
        uSizeScale: { value: 1 },
        uAlphaScale: { value: 1 },
        uMap: { value: opts.map },
        uSunDirView: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color(1, 1, 1) },
        uAmbientColor: { value: new THREE.Color(0.2, 0.24, 0.3) },
        uUpView: { value: new THREE.Vector3(0, 1, 0) },
        uNearFade: { value: new THREE.Vector2(opts.nearFadeStart, opts.nearFadeRange) },
        uSphere: { value: 1 / Math.max(0.35, Math.min(1, opts.footprint ?? 1)) },
        uDepthMap: { value: null },
        uDepthRange: { value: new THREE.Vector2(0.05, 110) },
        uInvResolution: { value: new THREE.Vector2(1 / 1920, 1 / 1080) },
      },
      transparent: true,
      depthTest: true,
      depthWrite: opts.depthWrite,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      side: THREE.DoubleSide,
      toneMapped: true,
      fog: false,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.name = `fx:${opts.name}`;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = opts.renderOrder;
    this.mesh.visible = false;
    this.mesh.matrixAutoUpdate = false;
  }

  get liveCount(): number {
    return this.pool.count;
  }

  get spawnCount(): number {
    return this.spawned;
  }

  get dropCount(): number {
    return this.dropped;
  }

  resetStats(): void {
    this.spawned = 0;
    this.dropped = 0;
  }

  /**
   * Claim a slot and write a particle into it. When the group is saturated the
   * least valuable of a small random sample is recycled rather than dropping the
   * new particle: the new one is what the player is looking at.
   */
  spawn(spawnTime: number, d: ParticleDesc): boolean {
    let index = this.pool.alloc();
    if (index < 0) {
      index = this.pickVictim(d.priority);
      if (index < 0) {
        this.dropped++;
        return false;
      }
    }

    const o = index * STRIDE;
    const a = this.data;
    a[o] = d.px;
    a[o + 1] = d.py;
    a[o + 2] = d.pz;
    a[o + 3] = spawnTime;
    a[o + 4] = d.vx;
    a[o + 5] = d.vy;
    a[o + 6] = d.vz;
    a[o + 7] = d.life;
    a[o + 8] = d.size0;
    a[o + 9] = d.size1;
    a[o + 10] = d.roll;
    a[o + 11] = d.rollRate;
    a[o + 12] = d.r0;
    a[o + 13] = d.g0;
    a[o + 14] = d.b0;
    a[o + 15] = d.alpha;
    a[o + 16] = d.r1;
    a[o + 17] = d.g1;
    a[o + 18] = d.b1;
    a[o + 19] = d.additive;
    a[o + 20] = d.gravity;
    a[o + 21] = d.drag;
    a[o + 22] = d.turbulence;
    a[o + 23] = d.stretch;
    a[o + 24] = d.cell;
    a[o + 25] = d.frames;
    a[o + 26] = d.fadeIn;
    a[o + 27] = d.softness;
    a[o + 28] = d.sunVisibility;
    a[o + 29] = d.floorY;
    a[o + 30] = d.bounce;
    a[o + 31] = d.cloudShadow;

    this.death[index] = spawnTime + d.life;
    this.priority[index] = d.priority;
    this.markDirty(index);
    this.spawned++;
    return true;
  }

  /**
   * Sample a handful of live slots and take the one closest to dying, unless
   * every candidate outranks the incoming particle.
   */
  private pickVictim(priority: number): number {
    const count = this.pool.count;
    if (count === 0) return -1;
    let best = -1;
    let bestDeath = Infinity;
    for (let s = 0; s < 8; s++) {
      const i = this.evictCursor % count;
      // A prime-ish stride decorrelates successive probes from spawn order.
      this.evictCursor = (this.evictCursor + 1231) % 0x7fffffff;
      if (this.priority[i] > priority) continue;
      const t = this.death[i];
      if (t < bestDeath) {
        bestDeath = t;
        best = i;
      }
    }
    return best;
  }

  /** Retire expired particles and push the dirtied range to the GPU. */
  update(now: number): void {
    const pool = this.pool;
    const death = this.death;
    for (let i = pool.count - 1; i >= 0; i--) {
      if (death[i] > now) continue;
      const moved = pool.free(i);
      if (moved >= 0) {
        const dst = i * STRIDE;
        const src = moved * STRIDE;
        const a = this.data;
        for (let k = 0; k < STRIDE; k++) a[dst + k] = a[src + k];
        death[i] = death[moved];
        this.priority[i] = this.priority[moved];
        this.markDirty(i);
      }
    }

    const count = pool.count;
    this.geometry.instanceCount = count;
    this.mesh.visible = count > 0;

    if (this.dirtyMax >= this.dirtyMin) {
      const start = this.dirtyMin * STRIDE;
      const length = (this.dirtyMax - this.dirtyMin + 1) * STRIDE;
      this.buffer.addUpdateRange(start, length);
      this.buffer.needsUpdate = true;
      this.dirtyMin = Infinity;
      this.dirtyMax = -Infinity;
    }
  }

  private markDirty(index: number): void {
    if (index < this.dirtyMin) this.dirtyMin = index;
    if (index > this.dirtyMax) this.dirtyMax = index;
  }

  get uniforms(): Record<string, THREE.IUniform> {
    return this.material.uniforms;
  }

  setSizeScale(v: number): void {
    this.material.uniforms.uSizeScale.value = v;
  }

  clear(): void {
    this.pool.clear();
    this.geometry.instanceCount = 0;
    this.mesh.visible = false;
    this.dirtyMin = Infinity;
    this.dirtyMax = -Infinity;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

/** Frame-constant inputs shared by every group. */
export interface ParticleFrame {
  time: number;
  /** Sun direction in world space, pointing toward the sun. */
  sunDirection: THREE.Vector3;
  sunColor: THREE.Color;
  ambientColor: THREE.Color;
  camera: THREE.PerspectiveCamera;
  viewCamera: THREE.PerspectiveCamera;
  /**
   * Packed scene depth for the soft fade. Never null: a 1x1 white stand-in is
   * bound when no capture ran, which unpacks to the far plane and makes the
   * fade a no-op instead of erasing every soft particle.
   */
  depthTexture: THREE.Texture;
  depthNear: number;
  depthFar: number;
  resolutionX: number;
  resolutionY: number;
}

const WORLD_DOWN = /* @__PURE__ */ new THREE.Vector3(0, -1, 0);

/**
 * Owns every particle group and pushes the per-frame uniforms. Groups in the
 * viewmodel scene get their gravity and sun direction rotated into view space,
 * because the viewmodel scene is authored camera-relative.
 */
export class ParticleSystem {
  private readonly groups: ParticleGroup[] = [];
  private readonly tmpSun = new THREE.Vector3();
  private readonly tmpDown = new THREE.Vector3();
  private readonly tmpQuat = new THREE.Quaternion();

  add(group: ParticleGroup): ParticleGroup {
    this.groups.push(group);
    return group;
  }

  get all(): readonly ParticleGroup[] {
    return this.groups;
  }

  get liveCount(): number {
    let n = 0;
    for (let i = 0; i < this.groups.length; i++) n += this.groups[i].liveCount;
    return n;
  }

  get capacity(): number {
    let n = 0;
    for (let i = 0; i < this.groups.length; i++) n += this.groups[i].capacity;
    return n;
  }

  /** True when any soft group has live particles, i.e. a depth capture pays. */
  get needsSceneDepth(): boolean {
    for (let i = 0; i < this.groups.length; i++) {
      const g = this.groups[i];
      if (g.soft && g.liveCount > 0) return true;
    }
    return false;
  }

  update(frame: ParticleFrame): void {
    const groups = this.groups;

    // World-space sun into main-camera view space, once for every world group.
    frame.camera.getWorldQuaternion(this.tmpQuat).invert();
    const sun = this.tmpSun.copy(frame.sunDirection).applyQuaternion(this.tmpQuat);
    // The viewmodel camera never moves, so "down" for view-space particles is
    // world down rotated by the inverse of the main camera.
    const down = this.tmpDown.copy(WORLD_DOWN).applyQuaternion(this.tmpQuat);

    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const u = g.uniforms;
      u.uTime.value = frame.time;
      (u.uSunColor.value as THREE.Color).copy(frame.sunColor);
      (u.uAmbientColor.value as THREE.Color).copy(frame.ambientColor);
      // The sun is already expressed in camera space, which is exactly the
      // viewmodel scene's space, so both group kinds share it.
      (u.uSunDirView.value as THREE.Vector3).copy(sun);
      // Both group kinds shade in the same camera space, so world up is the
      // gravity vector negated for either of them.
      (u.uUpView.value as THREE.Vector3).copy(down).negate();
      const gravity = u.uGravityDir.value as THREE.Vector3;
      if (g.viewmodel) gravity.copy(down);
      else gravity.set(0, -1, 0);
      if (g.soft) {
        u.uDepthMap.value = frame.depthTexture;
        (u.uDepthRange.value as THREE.Vector2).set(frame.depthNear, frame.depthFar);
        (u.uInvResolution.value as THREE.Vector2).set(
          1 / Math.max(1, frame.resolutionX),
          1 / Math.max(1, frame.resolutionY),
        );
      }
      g.update(frame.time);
    }
  }

  clear(): void {
    for (let i = 0; i < this.groups.length; i++) this.groups[i].clear();
  }

  resetStats(): void {
    for (let i = 0; i < this.groups.length; i++) this.groups[i].resetStats();
  }

  dispose(): void {
    for (let i = 0; i < this.groups.length; i++) this.groups[i].dispose();
    this.groups.length = 0;
  }
}
