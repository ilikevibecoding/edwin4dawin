import * as THREE from 'three';
import type { EngineContext } from '../core/Engine';
import { ParticleTextures, ATLAS_COLS } from './ParticleTextures';
import { PARTICLE_VERT, PARTICLE_FRAG } from './shaders/particle.glsl';

/** Objects the VFX system owns live on this layer so the depth prepass can
 *  skip them (they must not occlude themselves in the soft-particle test). */
export const VFX_LAYER = 2;

/**
 * A reusable spawn descriptor. Effect libraries mutate a single shared
 * instance and call {@link ParticleBatch.spawn}; nothing is allocated per
 * particle. Reset to sane defaults each time via {@link reset}.
 */
export class SpawnDesc {
  px = 0; py = 0; pz = 0;
  vx = 0; vy = 0; vz = 0;
  r0 = 1; g0 = 1; b0 = 1;
  r1 = 1; g1 = 1; b1 = 1;
  life = 1;
  size0 = 1; size1 = 1;
  gravity = 0; drag = 0;
  rot = 0; rotSpeed = 0;
  cell = 0; frames = 1; fadeMode = 0;
  lit = false; stretch = false; soft = false; turb = false;
  stretchAmt = 0; opacity = 1; turbAmt = 0;
  seed = 0;
  /** Seconds to defer birth — used to time-sequence explosion layers cheaply. */
  delay = 0;

  reset(): this {
    this.px = this.py = this.pz = 0;
    this.vx = this.vy = this.vz = 0;
    this.r0 = this.g0 = this.b0 = 1;
    this.r1 = this.g1 = this.b1 = 1;
    this.life = 1;
    this.size0 = this.size1 = 1;
    this.gravity = 0; this.drag = 0;
    this.rot = 0; this.rotSpeed = 0;
    this.cell = 0; this.frames = 1; this.fadeMode = 0;
    this.lit = this.stretch = this.soft = this.turb = false;
    this.stretchAmt = 0; this.opacity = 1; this.turbAmt = 0;
    this.seed = Math.random();
    this.delay = 0;
    return this;
  }
}

/** Reflect `incoming` (unit, travel direction) about `normal` into `out`. */
export function reflect(out: THREE.Vector3, incoming: THREE.Vector3, normal: THREE.Vector3): THREE.Vector3 {
  return out.copy(incoming).addScaledVector(normal, -2 * incoming.dot(normal));
}

/** Build a right-handed orthonormal basis (t, b) spanning the plane ⟂ n. */
export function orthoBasis(n: THREE.Vector3, t: THREE.Vector3, b: THREE.Vector3): void {
  if (Math.abs(n.y) < 0.99) t.set(0, 1, 0).cross(n).normalize();
  else t.set(1, 0, 0).cross(n).normalize();
  b.copy(n).cross(t).normalize();
}

const STRIDES = {
  spawn: 3, vel: 3, color0: 3, color1: 3, params: 4, dyn: 4, atlas: 4, extra: 4,
} as const;

class ParticleBatch {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  private geometry: THREE.InstancedBufferGeometry;
  private capacity: number;
  private head = 0;
  private dirty = false;

  private aSpawn: Float32Array;
  private aVel: Float32Array;
  private aColor0: Float32Array;
  private aColor1: Float32Array;
  private aParams: Float32Array;
  private aDyn: Float32Array;
  private aAtlas: Float32Array;
  private aExtra: Float32Array;

  private attrs: THREE.InstancedBufferAttribute[] = [];

  constructor(capacity: number, atlas: THREE.Texture, additive: boolean, uniforms: THREE.ShaderMaterialParameters['uniforms']) {
    this.capacity = capacity;

    const geo = new THREE.InstancedBufferGeometry();
    // Base quad: two triangles in [-0.5, 0.5].
    const positions = new Float32Array([
      -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0,
      -0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.aSpawn = new Float32Array(capacity * STRIDES.spawn);
    this.aVel = new Float32Array(capacity * STRIDES.vel);
    this.aColor0 = new Float32Array(capacity * STRIDES.color0);
    this.aColor1 = new Float32Array(capacity * STRIDES.color1);
    this.aParams = new Float32Array(capacity * STRIDES.params);
    this.aDyn = new Float32Array(capacity * STRIDES.dyn);
    this.aAtlas = new Float32Array(capacity * STRIDES.atlas);
    this.aExtra = new Float32Array(capacity * STRIDES.extra);

    const add = (name: string, arr: Float32Array, size: number) => {
      const a = new THREE.InstancedBufferAttribute(arr, size);
      a.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute(name, a);
      this.attrs.push(a);
    };
    add('aSpawn', this.aSpawn, 3);
    add('aVel', this.aVel, 3);
    add('aColor0', this.aColor0, 3);
    add('aColor1', this.aColor1, 3);
    add('aParams', this.aParams, 4);
    add('aDyn', this.aDyn, 4);
    add('aAtlas', this.aAtlas, 4);
    add('aExtra', this.aExtra, 4);

    geo.instanceCount = capacity;
    // Big bounding sphere: particles roam far from the origin and we never want
    // the batch frustum-culled as a whole.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);

    this.geometry = geo;

    const mat = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      uniforms: { ...uniforms, uAdditive: { value: additive ? 1 : 0 }, uAtlas: { value: atlas } },
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      side: THREE.DoubleSide,
      toneMapped: true,
    });
    this.material = mat;

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.layers.set(VFX_LAYER);
    this.mesh.renderOrder = additive ? 20 : 10; // smoke under sparks
    this.mesh.name = additive ? 'vfx-additive' : 'vfx-alpha';
  }

  spawnCount = 0;

  spawn(d: SpawnDesc) {
    const i = this.head;
    this.head = (this.head + 1) % this.capacity;
    this.dirty = true;
    this.spawnCount++;

    let o = i * 3;
    this.aSpawn[o] = d.px; this.aSpawn[o + 1] = d.py; this.aSpawn[o + 2] = d.pz;
    this.aVel[o] = d.vx; this.aVel[o + 1] = d.vy; this.aVel[o + 2] = d.vz;
    this.aColor0[o] = d.r0; this.aColor0[o + 1] = d.g0; this.aColor0[o + 2] = d.b0;
    this.aColor1[o] = d.r1; this.aColor1[o + 1] = d.g1; this.aColor1[o + 2] = d.b1;

    o = i * 4;
    this.aParams[o] = spawnClock + d.delay; this.aParams[o + 1] = d.life;
    this.aParams[o + 2] = d.size0; this.aParams[o + 3] = d.size1;
    this.aDyn[o] = d.gravity; this.aDyn[o + 1] = d.drag;
    this.aDyn[o + 2] = d.rot; this.aDyn[o + 3] = d.rotSpeed;
    const flags = (d.lit ? 1 : 0) + (d.stretch ? 2 : 0) + (d.soft ? 4 : 0) + (d.turb ? 8 : 0);
    this.aAtlas[o] = d.cell; this.aAtlas[o + 1] = d.frames;
    this.aAtlas[o + 2] = d.fadeMode; this.aAtlas[o + 3] = flags;
    this.aExtra[o] = d.stretchAmt; this.aExtra[o + 1] = d.opacity;
    this.aExtra[o + 2] = d.turbAmt; this.aExtra[o + 3] = d.seed;
  }

  flush() {
    if (!this.dirty) return;
    for (const a of this.attrs) a.needsUpdate = true;
    this.dirty = false;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

// Module-scoped spawn clock so ParticleBatch.spawn can stamp the current time
// without threading it through every call.
let spawnClock = 0;

interface PoolLight {
  light: THREE.PointLight;
  active: boolean;
  mode: 0 | 1; // 0 flash, 1 fire
  t: number;
  total: number;
  base: number;
  seed: number;
}

/**
 * Owns the two GPU particle batches, the shared uniform block, the dynamic
 * light pool, and the soft-particle depth prepass.
 */
export class ParticleEngine {
  readonly textures: ParticleTextures;
  readonly additive: ParticleBatch;
  readonly alpha: ParticleBatch;
  readonly desc = new SpawnDesc();

  private ctx: EngineContext;
  private uniforms: Record<string, THREE.IUniform>;
  private time = 0;

  // depth prepass
  private depthRT: THREE.WebGLRenderTarget | null = null;
  private depthCam = new THREE.PerspectiveCamera();
  private depthMat = new THREE.MeshBasicMaterial({ colorWrite: false });
  private depthSize = new THREE.Vector2();
  private softEnabled = true;

  // light pool
  private lights: PoolLight[] = [];
  private readonly maxLights = 8;

  private _db = new THREE.Vector2();
  private inPrepass = false;
  private softActiveUntil = 0;

  constructor(ctx: EngineContext, budget: number) {
    this.ctx = ctx;
    this.textures = new ParticleTextures();

    const sky = ctx.has('lighting')
      ? (ctx.get('lighting') as { sky: { preset: { fogColor: THREE.Color; fogGroundColor: THREE.Color; fogDensity: number; sunColor: THREE.Color; ambientColor: THREE.Color } }; sunDirection: THREE.Vector3 })
      : null;
    const preset = sky?.sky.preset;

    this.uniforms = {
      uTime: { value: 0 },
      uAtlasCols: { value: ATLAS_COLS },
      uSunDir: { value: (sky?.sunDirection.clone() ?? new THREE.Vector3(0.4, 0.8, 0.2)).normalize() },
      uSunColor: { value: (preset?.sunColor.clone() ?? new THREE.Color(1, 0.94, 0.84)) },
      uAmbient: { value: (preset?.ambientColor.clone() ?? new THREE.Color(0.4, 0.45, 0.55)).multiplyScalar(0.9) },
      uFogColor: { value: (preset?.fogColor.clone() ?? new THREE.Color(0.6, 0.63, 0.68)) },
      uFogDensity: { value: preset?.fogDensity ?? 0.012 },
      uFogHeight: { value: 0 },
      uDepthTex: { value: null },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uNear: { value: ctx.camera.near },
      uFar: { value: ctx.camera.far },
      uSoftEnabled: { value: 0 },
      uSoftDist: { value: 1.2 },
    };

    const addCap = Math.max(64, Math.round(budget * 0.45));
    const alpCap = Math.max(64, Math.round(budget * 0.55));
    this.additive = new ParticleBatch(addCap, this.textures.additive, true, this.uniforms);
    this.alpha = new ParticleBatch(alpCap, this.textures.alpha, false, this.uniforms);

    ctx.scene.add(this.additive.mesh);
    ctx.scene.add(this.alpha.mesh);

    // Drive the soft-particle depth prepass from the alpha batch's
    // onBeforeRender so it always uses the exact camera the composer renders
    // with (the capture harness poses the camera after the last update, so a
    // lateUpdate-based prepass would be stale for the captured frame).
    this.alpha.mesh.onBeforeRender = (_r, _s, camera) => {
      if (this.inPrepass) return;
      if (!this.softEnabled || this.time > this.softActiveUntil) {
        this.uniforms.uSoftEnabled.value = 0;
        return;
      }
      this.inPrepass = true;
      this.renderDepthPrepass(camera as THREE.PerspectiveCamera);
      this.inPrepass = false;
    };

    // Make the world camera also draw the VFX layer.
    ctx.camera.layers.enable(VFX_LAYER);

    // Dynamic light pool: always resident (constant count → no shader
    // recompiles), intensity 0 when idle.
    for (let i = 0; i < this.maxLights; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 30, 2);
      l.castShadow = false;
      l.layers.enableAll();
      ctx.scene.add(l);
      this.lights.push({ light: l, active: false, mode: 0, t: 0, total: 1, base: 0, seed: Math.random() });
    }

    this.allowSoft(!new URLSearchParams(location.search).has('nosoft'));
  }

  allowSoft(v: boolean) {
    this.softEnabled = v;
  }

  now(): number {
    return this.time;
  }

  /** Keep the depth prepass running while soft particles are alive. */
  markSoft(life: number) {
    this.softActiveUntil = Math.max(this.softActiveUntil, this.time + life);
  }

  /** Set the outward-facing scene lighting reference for lit particles. */
  syncLighting() {
    if (!this.ctx.has('lighting')) return;
    const l = this.ctx.get('lighting') as {
      sky: { preset: { fogColor: THREE.Color; fogGroundColor: THREE.Color; fogDensity: number; sunColor: THREE.Color; ambientColor: THREE.Color } };
      sunDirection: THREE.Vector3;
    };
    (this.uniforms.uSunDir.value as THREE.Vector3).copy(l.sunDirection).normalize();
    (this.uniforms.uSunColor.value as THREE.Color).copy(l.sky.preset.sunColor);
    (this.uniforms.uAmbient.value as THREE.Color).copy(l.sky.preset.ambientColor).multiplyScalar(0.9);
    (this.uniforms.uFogColor.value as THREE.Color).copy(l.sky.preset.fogColor);
    this.uniforms.uFogDensity.value = l.sky.preset.fogDensity;
  }

  // -------------------------------------------------------------------------
  // Dynamic lights
  // -------------------------------------------------------------------------

  /** One-shot muzzle/explosion flash. */
  flashLight(pos: THREE.Vector3, color: THREE.Color, intensity: number, distance: number, duration: number) {
    const e = this.acquireLight();
    e.active = true;
    e.mode = 0;
    e.t = duration;
    e.total = duration;
    e.base = intensity;
    e.light.color.copy(color);
    e.light.distance = distance;
    e.light.decay = 2;
    e.light.position.copy(pos);
    e.light.intensity = intensity;
  }

  /** Persistent flickering fire light. */
  fireLight(pos: THREE.Vector3, color: THREE.Color, intensity: number, distance: number, duration: number) {
    const e = this.acquireLight();
    e.active = true;
    e.mode = 1;
    e.t = duration;
    e.total = duration;
    e.base = intensity;
    e.seed = Math.random() * 1000;
    e.light.color.copy(color);
    e.light.distance = distance;
    e.light.decay = 2;
    e.light.position.copy(pos);
    e.light.intensity = intensity;
  }

  private acquireLight(): PoolLight {
    let free = this.lights.find((l) => !l.active);
    if (free) return free;
    // steal the one with the least time remaining
    free = this.lights[0];
    for (const l of this.lights) if (l.t < free.t) free = l;
    return free;
  }

  private updateLights(dt: number) {
    for (const e of this.lights) {
      if (!e.active) continue;
      e.t -= dt;
      if (e.t <= 0) {
        e.active = false;
        e.light.intensity = 0;
        continue;
      }
      const k = e.t / e.total;
      if (e.mode === 0) {
        // sharp flash: bright immediately then fast decay
        e.light.intensity = e.base * k * k;
      } else {
        // fire flicker with a smooth-ish envelope over its life
        const f = 0.65 + 0.35 * Math.sin(this.time * 17 + e.seed) * Math.sin(this.time * 6.3 + e.seed * 1.7);
        const env = Math.min(1, k * 4) * Math.min(1, e.t * 0.5 + 0.2);
        e.light.intensity = e.base * f * env;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Frame
  // -------------------------------------------------------------------------

  update(dt: number) {
    this.time += dt;
    spawnClock = this.time;
    this.uniforms.uTime.value = this.time;
    this.uniforms.uFogHeight.value = this.ctx.camera.position.y;
    this.updateLights(dt);
    this.additive.flush();
    this.alpha.flush();
  }

  /** Render a cheap depth-only pass of the opaque world for soft particles,
   *  using the exact camera the composer is about to render with. Invoked from
   *  the alpha batch's onBeforeRender. */
  private renderDepthPrepass(renderCamera: THREE.PerspectiveCamera) {
    const renderer = this.ctx.renderer;
    renderer.getDrawingBufferSize(this._db);
    const w = Math.max(2, Math.floor(this._db.x * 0.5));
    const h = Math.max(2, Math.floor(this._db.y * 0.5));
    if (!this.depthRT || this.depthSize.x !== w || this.depthSize.y !== h) {
      this.depthRT?.dispose();
      const rt = new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        depthBuffer: true,
      });
      rt.depthTexture = new THREE.DepthTexture(w, h, THREE.UnsignedIntType);
      rt.depthTexture.minFilter = THREE.NearestFilter;
      rt.depthTexture.magFilter = THREE.NearestFilter;
      this.depthRT = rt;
      this.depthSize.set(w, h);
    }

    const cam = renderCamera;
    cam.updateMatrixWorld();
    this.depthCam.position.setFromMatrixPosition(cam.matrixWorld);
    this.depthCam.quaternion.setFromRotationMatrix(cam.matrixWorld);
    this.depthCam.projectionMatrix.copy(cam.projectionMatrix);
    this.depthCam.projectionMatrixInverse.copy(cam.projectionMatrixInverse);
    this.depthCam.updateMatrixWorld(true);
    this.depthCam.layers.set(0); // opaque world only, never the VFX layer

    const scene = this.ctx.scene;
    const prevOverride = scene.overrideMaterial;
    const prevTarget = renderer.getRenderTarget();
    const prevAutoUpdate = renderer.shadowMap.autoUpdate;
    const prevAutoClear = renderer.autoClear;

    renderer.shadowMap.autoUpdate = false;
    scene.overrideMaterial = this.depthMat;
    renderer.autoClear = true;
    renderer.setRenderTarget(this.depthRT);
    renderer.render(scene, this.depthCam);

    scene.overrideMaterial = prevOverride;
    renderer.setRenderTarget(prevTarget);
    renderer.shadowMap.autoUpdate = prevAutoUpdate;
    renderer.autoClear = prevAutoClear;

    // Restore the camera's own render-time state used by the composer.
    cam.updateMatrixWorld(true);

    this.uniforms.uDepthTex.value = this.depthRT.depthTexture;
    (this.uniforms.uResolution.value as THREE.Vector2).set(this._db.x, this._db.y);
    this.uniforms.uNear.value = cam.near;
    this.uniforms.uFar.value = cam.far;
    this.uniforms.uSoftEnabled.value = 1;
  }

  dispose() {
    this.additive.dispose();
    this.alpha.dispose();
    this.textures.dispose();
    this.depthRT?.dispose();
    this.depthMat.dispose();
    for (const e of this.lights) {
      this.ctx.scene.remove(e.light);
      e.light.dispose();
    }
    this.ctx.scene.remove(this.additive.mesh);
    this.ctx.scene.remove(this.alpha.mesh);
    this.ctx.camera.layers.disable(VFX_LAYER);
  }
}
