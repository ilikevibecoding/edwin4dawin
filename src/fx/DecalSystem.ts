import * as THREE from 'three';
import { Groups, Layers, type GameContext, type System } from '../core/GameContext';
import type { SurfaceKind } from '../core/Events';
import type { IDecals, IPhysics, IRenderPipeline, ISky, RaycastHit } from '../core/Interfaces';
import { FxRng } from './Random';
import type { QualitySettings } from '../core/Quality';
import { DECAL_FRAG, DECAL_VERT } from '../shaders/fx/decal.glsl';
import {
  DECAL_COLUMNS,
  DECAL_ROWS,
  DecalTile,
  bulletTileFor,
  bulletTintFor,
  createDecalAtlas,
  type DecalAtlas,
} from './DecalAtlas';
import { makeUploadRange, needsDepthPrepass, queueUpload } from './FrameState';

/**
 * Pooled projected decals.
 *
 * One instanced draw call covers every hole, scorch, crater and blood mark on
 * the map. Slots are handed out by a wrapping cursor, so the decal recycled is
 * always the oldest; a slot a fixed distance ahead of the cursor is put into a
 * fade the moment allocation passes it, which means by the time the cursor
 * comes round the decal it is about to overwrite has already gone. Decals never
 * pop out — they only pop out if you place a full pool's worth inside the fade
 * time, which is several hundred rounds in half a second.
 */

const STATE_FREE = 0;
const STATE_IN = 1;
const STATE_LIVE = 2;
const STATE_OUT = 3;

const DECAL_RAY_MASK = Groups.WORLD | Groups.PROP;

const _quat = new THREE.Quaternion();
const _roll = new THREE.Quaternion();
const _normal = new THREE.Vector3();
const _position = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _tint = new THREE.Color();
const _rayOrigin = new THREE.Vector3();
const _sunDir = new THREE.Vector3(0.3, 0.8, 0.4);
const _bufferSize = new THREE.Vector2();
const Z_AXIS = new THREE.Vector3(0, 0, 1);

/**
 * Diffuse reflectance the atlas is measured against.
 *
 * The atlas is painted in absolute albedo — a bullet hole at 0.016, a spall rim
 * at 0.55 — and the shader divides by this to get the ratio it multiplies the
 * wall by. It is the average of the level's dry surfaces: rendered stucco,
 * concrete block, packed dirt. Wrong by a stop in either direction and holes
 * are merely dark rather than black, which is a far gentler failure than the
 * alternative of getting the lighting wrong.
 */
const SURFACE_REFLECTANCE = 0.32;

/** Seeded so a captured frame is the same frame every time it is captured. */
const rng = new FxRng(0x2f6b18d);

const _hit: RaycastHit = {
  point: new THREE.Vector3(),
  normal: new THREE.Vector3(0, 1, 0),
  distance: 0,
  object: new THREE.Object3D(),
  surface: 'concrete',
};

export interface DecalOptions {
  tile: number;
  size: number;
  /** Extent along the projection axis. Larger wraps further around corners. */
  depth?: number;
  opacity?: number;
  /** Roll about the surface normal, in radians. */
  rotation?: number;
  /** Multiplier on the atlas tangent normal; 0 flattens the relief. */
  normalStrength?: number;
  glossScale?: number;
  tintR?: number;
  tintG?: number;
  tintB?: number;
  /** Cosine of the steepest surface the decal is allowed to project onto. */
  angleMin?: number;
  /** Seconds spent ramping in. Blood spreads; a bullet hole does not. */
  fadeIn?: number;
  /** Seconds the decal takes to leave once retired. */
  fadeOut?: number;
  /** Seconds before it retires on its own. 0 means it waits to be recycled. */
  ttl?: number;
  /** Size reached at the end of `fadeIn`, for spreading pools. */
  growTo?: number;
}

/**
 * The one options object the effects recipes fill.
 *
 * `place` copies every field into typed arrays before it returns and keeps no
 * reference, so there is no reason for a caller to own its own. An object
 * literal per bullet hole is a few hundred bytes a round, which is nothing
 * until it is thirty rounds a second with a firefight either side of you.
 * Callers outside this system may still pass a literal; `IDecals.add` is the
 * interface they use and it fills this on their behalf.
 */
const _opts: DecalOptions = { tile: 0, size: 0 };

/** Hands back the shared options object with every field at its default. */
export function decalOpts(tile: number, size: number): DecalOptions {
  _opts.tile = tile;
  _opts.size = size;
  _opts.depth = undefined;
  _opts.opacity = undefined;
  _opts.rotation = undefined;
  _opts.normalStrength = undefined;
  _opts.glossScale = undefined;
  _opts.tintR = undefined;
  _opts.tintG = undefined;
  _opts.tintB = undefined;
  _opts.angleMin = undefined;
  _opts.fadeIn = undefined;
  _opts.fadeOut = undefined;
  _opts.ttl = undefined;
  _opts.growTo = undefined;
  return _opts;
}

export default class DecalSystem implements System, IDecals {
  readonly key = 'decals';
  readonly order = 72;

  private ctx: GameContext | null = null;
  private atlas: DecalAtlas | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private geometry: THREE.BoxGeometry | null = null;
  private mesh: THREE.InstancedMesh | null = null;

  private capacity = 0;
  private cursor = 0;
  private highWater = 0;
  private retireLookahead = 16;
  private activeCount = 0;

  private state = new Uint8Array(0);
  private opacity = new Float32Array(0);
  private baseOpacity = new Float32Array(0);
  private timer = new Float32Array(0);
  private duration = new Float32Array(0);
  private ttl = new Float32Array(0);
  private fadeOut = new Float32Array(0);
  private size0 = new Float32Array(0);
  private size1 = new Float32Array(0);
  private depth = new Float32Array(0);
  private transform = new Float32Array(0);

  private tileAttr: THREE.InstancedBufferAttribute | null = null;
  private paramAttr: THREE.InstancedBufferAttribute | null = null;
  private tintAttr: THREE.InstancedBufferAttribute | null = null;

  private matrixLo = -1;
  private matrixHi = -1;
  private paramLo = -1;
  private paramHi = -1;
  private staticLo = -1;
  private staticHi = -1;

  private matrixRange = makeUploadRange();
  private paramRange = makeUploadRange();
  private tileRange = makeUploadRange();
  private tintRange = makeUploadRange();

  private physics: IPhysics | undefined;
  private pipeline: IRenderPipeline | undefined;
  private sky: ISky | undefined;
  private unsubscribe: Array<() => void> = [];

  init(ctx: GameContext): void {
    this.ctx = ctx;
    this.atlas = createDecalAtlas();
    this.build(ctx, ctx.quality);
    // Resolved here rather than on the first frame: the sun-visibility ray has
    // to be available for decals placed during level build-out.
    this.physics = ctx.tryGet<IPhysics>('physics');

    this.unsubscribe.push(
      ctx.events.on('fx:decal', (request) => {
        this.add(request.position, request.normal, request.size, request.kind, request.surface);
      }),
    );
    this.unsubscribe.push(ctx.events.on('game:restart', () => this.clear()));
  }

  private build(ctx: GameContext, quality: QualitySettings): void {
    this.teardownMesh();
    const atlas = this.atlas;
    if (!atlas) return;

    this.capacity = Math.max(32, quality.maxDecals);
    this.retireLookahead = Math.max(4, Math.min(24, this.capacity >> 3));
    this.cursor = 0;
    this.highWater = 0;
    this.activeCount = 0;

    this.state = new Uint8Array(this.capacity);
    this.opacity = new Float32Array(this.capacity);
    this.baseOpacity = new Float32Array(this.capacity);
    this.timer = new Float32Array(this.capacity);
    this.duration = new Float32Array(this.capacity);
    this.ttl = new Float32Array(this.capacity);
    this.fadeOut = new Float32Array(this.capacity);
    this.size0 = new Float32Array(this.capacity);
    this.size1 = new Float32Array(this.capacity);
    this.depth = new Float32Array(this.capacity);
    // position xyz, quaternion xyzw.
    this.transform = new Float32Array(this.capacity * 7);

    this.geometry = new THREE.BoxGeometry(1, 1, 1);

    this.material = new THREE.ShaderMaterial({
      name: 'fx.decal',
      vertexShader: DECAL_VERT,
      fragmentShader: DECAL_FRAG,
      uniforms: {
        uAlbedoAtlas: { value: atlas.albedo },
        uSurfaceAtlas: { value: atlas.surface },
        uDepthTexture: { value: null },
        uDepthParams: { value: new THREE.Vector4(0.05, 1000, 1 / 1920, 1 / 1080) },
        uHasDepth: { value: 0 },
        uSunDirection: { value: _sunDir.clone() },
        uReflectance: { value: 1 / SURFACE_REFLECTANCE },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      // Back faces with an inverted test: the box contributes fill only where
      // geometry lies in front of its far side, and the camera may sit inside.
      depthFunc: THREE.GreaterDepth,
      side: THREE.BackSide,
      // The shader emits a reflectance ratio, so the blend stage is what
      // applies it: the wall keeps its own lighting and only changes material.
      // three only wires up the multiply blend func on the premultiplied path.
      blending: THREE.MultiplyBlending,
      premultipliedAlpha: true,
      toneMapped: false,
      fog: false,
      lights: false,
    });

    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.capacity);
    mesh.name = 'fx.decals';
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    mesh.count = 0;
    // Decals belong to the opaque pass so the volumetric composite fogs them
    // with the wall they sit on; they only sort as transparents.
    mesh.layers.set(Layers.DEFAULT);
    mesh.renderOrder = -10;
    mesh.userData.noPrepass = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.tileAttr = new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * 4), 4);
    this.paramAttr = new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * 4), 4);
    this.tintAttr = new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * 4), 4);
    this.paramAttr.setUsage(THREE.DynamicDrawUsage);
    mesh.geometry.setAttribute('aTile', this.tileAttr);
    mesh.geometry.setAttribute('aParams', this.paramAttr);
    mesh.geometry.setAttribute('aTint', this.tintAttr);

    this.mesh = mesh;
    ctx.scene.add(mesh);
  }

  onQualityChange(quality: QualitySettings, ctx: GameContext): void {
    this.build(ctx, quality);
  }

  /* ------------------------------ IDecals ------------------------------- */

  add(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    size: number,
    kind: 'bullet' | 'scorch' | 'blood' | 'crater',
    surface: SurfaceKind,
  ): void {
    switch (kind) {
      case 'scorch': {
        const o = decalOpts(size > 2.5 ? DecalTile.SCORCH_LARGE : DecalTile.SCORCH_SMALL, size);
        o.depth = Math.max(0.3, size * 0.4);
        o.opacity = 0.92;
        o.rotation = rng.range(0, Math.PI * 2);
        o.normalStrength = 0.35;
        o.glossScale = 0.2;
        o.angleMin = 0.1;
        o.fadeIn = 0.25;
        this.place(position, normal, o);
        break;
      }
      case 'crater': {
        const o = decalOpts(DecalTile.CRATER, size);
        o.depth = Math.max(0.4, size * 0.5);
        o.opacity = 1;
        o.rotation = rng.range(0, Math.PI * 2);
        o.normalStrength = 1.2;
        o.angleMin = 0.35;
        o.fadeIn = 0.12;
        this.place(position, normal, o);
        break;
      }
      case 'blood': {
        const tile = rng.next() < 0.5 ? DecalTile.BLOOD_SPLAT_A : DecalTile.BLOOD_SPLAT_B;
        const o = decalOpts(tile, size);
        o.depth = Math.max(0.12, size * 0.5);
        o.opacity = 0.95;
        o.rotation = rng.range(0, Math.PI * 2);
        o.normalStrength = 0.6;
        o.glossScale = 1;
        o.angleMin = 0.15;
        o.fadeIn = 0.08;
        this.place(position, normal, o);
        break;
      }
      default: {
        bulletTintFor(surface, _tint);
        const o = decalOpts(bulletTileFor(surface), size);
        o.depth = Math.max(0.08, size * 1.1);
        o.opacity = surface === 'glass' ? 0.85 : 1;
        o.rotation = rng.range(0, Math.PI * 2);
        o.normalStrength = 1;
        o.glossScale = surface === 'metal' || surface === 'glass' ? 1 : 0.35;
        o.tintR = _tint.r;
        o.tintG = _tint.g;
        o.tintB = _tint.b;
        o.angleMin = 0.28;
        if (surface === 'water') {
          o.ttl = 2.6;
          o.fadeOut = 1.6;
        }
        this.place(position, normal, o);
        break;
      }
    }
  }

  clear(): void {
    if (!this.mesh) return;
    this.state.fill(STATE_FREE);
    this.opacity.fill(0);
    this.cursor = 0;
    this.highWater = 0;
    this.activeCount = 0;
    this.matrixLo = -1;
    this.matrixHi = -1;
    this.paramLo = -1;
    this.paramHi = -1;
    this.staticLo = -1;
    this.staticHi = -1;
    this.mesh.count = 0;
  }

  get count(): number {
    return this.activeCount;
  }

  /* ----------------------------- placement ------------------------------ */

  /** Full-control placement, used by the impact and explosion recipes. */
  place(position: THREE.Vector3, normal: THREE.Vector3, opts: DecalOptions): number {
    const mesh = this.mesh;
    if (!mesh || this.capacity === 0) return -1;
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) return -1;

    _normal.copy(normal);
    if (_normal.lengthSq() < 1e-8) _normal.set(0, 1, 0);
    else _normal.normalize();

    const slot = this.allocate();
    const size = Math.max(0.02, opts.size);
    const grow = opts.growTo ?? size;
    const fadeIn = Math.max(0, opts.fadeIn ?? 0);

    this.size0[slot] = fadeIn > 0 && opts.growTo !== undefined ? size * 0.45 : size;
    this.size1[slot] = grow;
    this.depth[slot] = opts.depth ?? Math.max(0.08, size * 0.8);

    const t = slot * 7;
    this.transform[t] = position.x;
    this.transform[t + 1] = position.y;
    this.transform[t + 2] = position.z;
    _quat.setFromUnitVectors(Z_AXIS, _normal);
    if (opts.rotation) {
      _roll.setFromAxisAngle(_normal, opts.rotation);
      _quat.premultiply(_roll);
    }
    this.transform[t + 3] = _quat.x;
    this.transform[t + 4] = _quat.y;
    this.transform[t + 5] = _quat.z;
    this.transform[t + 6] = _quat.w;

    const base = opts.opacity ?? 1;
    this.baseOpacity[slot] = base;
    this.opacity[slot] = fadeIn > 0 ? 0 : base;
    this.state[slot] = fadeIn > 0 ? STATE_IN : STATE_LIVE;
    this.timer[slot] = 0;
    this.duration[slot] = Math.max(1e-4, fadeIn);
    this.ttl[slot] = opts.ttl ?? 0;
    this.fadeOut[slot] = opts.fadeOut ?? 0.55;

    const tile = this.tileAttr!.array as Float32Array;
    const col = opts.tile % DECAL_COLUMNS;
    const row = Math.floor(opts.tile / DECAL_COLUMNS);
    tile[slot * 4] = col / DECAL_COLUMNS;
    tile[slot * 4 + 1] = row / DECAL_ROWS;
    tile[slot * 4 + 2] = 1 / DECAL_COLUMNS;
    tile[slot * 4 + 3] = 1 / DECAL_ROWS;

    const tint = this.tintAttr!.array as Float32Array;
    tint[slot * 4] = opts.tintR ?? 1;
    tint[slot * 4 + 1] = opts.tintG ?? 1;
    tint[slot * 4 + 2] = opts.tintB ?? 1;
    tint[slot * 4 + 3] = opts.angleMin ?? 0.3;
    // The tile and tint of a decal are written once and never touched again,
    // so they ride to the GPU on the same frame flush as everything else.
    if (this.staticLo < 0 || slot < this.staticLo) this.staticLo = slot;
    if (slot > this.staticHi) this.staticHi = slot;

    const params = this.paramAttr!.array as Float32Array;
    params[slot * 4] = this.opacity[slot];
    params[slot * 4 + 1] = this.sunVisibility(position, _normal);
    params[slot * 4 + 2] = opts.normalStrength ?? 1;
    params[slot * 4 + 3] = opts.glossScale ?? 0.4;
    this.markParams(slot);

    this.writeMatrix(slot, this.size0[slot]);
    mesh.count = this.highWater;
    return slot;
  }

  private allocate(): number {
    const slot = this.cursor;
    this.cursor = this.cursor + 1 === this.capacity ? 0 : this.cursor + 1;
    if (slot + 1 > this.highWater) this.highWater = slot + 1;
    if (this.state[slot] === STATE_FREE) this.activeCount++;

    // Put the decal a fixed distance ahead of the cursor into its fade now, so
    // that when the ring reaches it there is nothing left to pop.
    let ahead = this.cursor + this.retireLookahead;
    if (ahead >= this.capacity) ahead -= this.capacity;
    if (this.state[ahead] === STATE_LIVE || this.state[ahead] === STATE_IN) this.retire(ahead);
    return slot;
  }

  private retire(slot: number): void {
    this.state[slot] = STATE_OUT;
    this.timer[slot] = 0;
    this.duration[slot] = Math.max(0.05, this.fadeOut[slot]);
    this.baseOpacity[slot] = this.opacity[slot];
  }

  /**
   * One shadow ray at placement time. A bullet hole punched into a wall in
   * shadow has to stay in shadow: without this the decal is lit by the sun the
   * wall around it never sees, and it reads as a bright sticker.
   */
  private sunVisibility(position: THREE.Vector3, normal: THREE.Vector3): number {
    if (_sunDir.y <= 0.02) return 0;
    if (normal.dot(_sunDir) <= 0) return 0;
    const physics = this.physics;
    if (!physics?.raycastInto) return 1;
    _rayOrigin.copy(position).addScaledVector(normal, 0.05);
    return physics.raycastInto(_rayOrigin, _sunDir, 90, _hit, DECAL_RAY_MASK) ? 0 : 1;
  }

  private writeMatrix(slot: number, size: number): void {
    const mesh = this.mesh;
    if (!mesh) return;
    const t = slot * 7;
    _position.set(this.transform[t], this.transform[t + 1], this.transform[t + 2]);
    _quat.set(this.transform[t + 3], this.transform[t + 4], this.transform[t + 5], this.transform[t + 6]);
    _scale.set(size, size, this.depth[slot]);
    _matrix.compose(_position, _quat, _scale);
    mesh.setMatrixAt(slot, _matrix);
    if (this.matrixLo < 0 || slot < this.matrixLo) this.matrixLo = slot;
    if (slot > this.matrixHi) this.matrixHi = slot;
  }

  private hideMatrix(slot: number): void {
    const mesh = this.mesh;
    if (!mesh) return;
    _matrix.makeScale(0, 0, 0);
    mesh.setMatrixAt(slot, _matrix);
    if (this.matrixLo < 0 || slot < this.matrixLo) this.matrixLo = slot;
    if (slot > this.matrixHi) this.matrixHi = slot;
  }

  private markParams(slot: number): void {
    if (this.paramLo < 0 || slot < this.paramLo) this.paramLo = slot;
    if (slot > this.paramHi) this.paramHi = slot;
  }

  /* ------------------------------- frame -------------------------------- */

  lateUpdate(dt: number, ctx: GameContext): void {
    const mesh = this.mesh;
    if (!mesh) return;
    if (this.physics === undefined) this.physics = ctx.tryGet<IPhysics>('physics');
    if (this.pipeline === undefined) this.pipeline = ctx.tryGet<IRenderPipeline>('render');
    if (this.sky === undefined) this.sky = ctx.tryGet<ISky>('sky');

    this.pullLighting(ctx);
    this.animate(dt);
    this.flush();
  }

  private pullLighting(ctx: GameContext): void {
    const material = this.material;
    if (!material) return;
    // Only the direction: the shader shades relief as a ratio, so it never
    // needs to know how bright the sun is or what colour it has turned.
    if (this.sky) _sunDir.copy(this.sky.sunDirection);
    (material.uniforms.uSunDirection.value as THREE.Vector3).copy(_sunDir);

    const depth = needsDepthPrepass(ctx.quality) ? (this.pipeline?.depthTexture ?? null) : null;
    material.uniforms.uDepthTexture.value = depth;
    material.uniforms.uHasDepth.value = depth ? 1 : 0;
    const buffer = ctx.renderer.getDrawingBufferSize(_bufferSize);
    (material.uniforms.uDepthParams.value as THREE.Vector4).set(
      ctx.camera.near,
      ctx.camera.far,
      1 / Math.max(1, buffer.x),
      1 / Math.max(1, buffer.y),
    );
  }

  private animate(dt: number): void {
    const params = this.paramAttr!.array as Float32Array;
    let active = 0;
    for (let slot = 0; slot < this.highWater; slot++) {
      const state = this.state[slot];
      if (state === STATE_FREE) continue;
      active++;

      if (state === STATE_LIVE) {
        if (this.ttl[slot] > 0) {
          this.ttl[slot] -= dt;
          if (this.ttl[slot] <= 0) this.retire(slot);
        }
        continue;
      }

      this.timer[slot] += dt;
      const t = Math.min(1, this.timer[slot] / this.duration[slot]);

      if (state === STATE_IN) {
        this.opacity[slot] = this.baseOpacity[slot] * t;
        if (this.size1[slot] !== this.size0[slot]) {
          const eased = 1 - (1 - t) * (1 - t);
          this.writeMatrix(slot, this.size0[slot] + (this.size1[slot] - this.size0[slot]) * eased);
        }
        if (t >= 1) {
          this.state[slot] = STATE_LIVE;
          this.opacity[slot] = this.baseOpacity[slot];
        }
      } else {
        this.opacity[slot] = this.baseOpacity[slot] * (1 - t) * (1 - t);
        if (t >= 1) {
          this.state[slot] = STATE_FREE;
          this.opacity[slot] = 0;
          this.hideMatrix(slot);
          active--;
        }
      }

      params[slot * 4] = this.opacity[slot];
      this.markParams(slot);
    }
    this.activeCount = active;
  }

  private flush(): void {
    const mesh = this.mesh;
    if (!mesh) return;
    mesh.count = this.highWater;
    if (this.matrixLo >= 0) {
      const span = this.matrixHi - this.matrixLo + 1;
      queueUpload(mesh.instanceMatrix, this.matrixRange, this.matrixLo * 16, span * 16);
      this.matrixLo = -1;
      this.matrixHi = -1;
    }
    if (this.paramLo >= 0) {
      const span = this.paramHi - this.paramLo + 1;
      queueUpload(this.paramAttr!, this.paramRange, this.paramLo * 4, span * 4);
      this.paramLo = -1;
      this.paramHi = -1;
    }
    if (this.staticLo >= 0) {
      const span = this.staticHi - this.staticLo + 1;
      queueUpload(this.tileAttr!, this.tileRange, this.staticLo * 4, span * 4);
      queueUpload(this.tintAttr!, this.tintRange, this.staticLo * 4, span * 4);
      this.staticLo = -1;
      this.staticHi = -1;
    }
  }

  /* ----------------------------- lifecycle ------------------------------ */

  private teardownMesh(): void {
    if (this.mesh) {
      this.mesh.removeFromParent();
      this.mesh.dispose();
      this.mesh = null;
    }
    this.geometry?.dispose();
    this.geometry = null;
    this.material?.dispose();
    this.material = null;
  }

  dispose(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe.length = 0;
    this.teardownMesh();
    this.atlas?.dispose();
    this.atlas = null;
    this.ctx = null;
  }
}
