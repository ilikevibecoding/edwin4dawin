import * as THREE from 'three';
import { Layers, type GameContext } from '../../core/GameContext';
import { Composer } from './Composer';
import {
  DEPTH_HIZ_BASE,
  DEPTH_HIZ_REDUCE,
  GBUFFER_BACKGROUND_FRAG,
  GBUFFER_FRAG,
  GBUFFER_VERT,
} from '../../shaders/post/gbuffer.glsl';

/** Number of levels in the ray-traversal hierarchy, including the half-res base. */
const HIZ_LEVELS = 3;

function halton(index: number, base: number): number {
  let f = 1;
  let r = 0;
  let i = index;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
}

interface PrevTransform {
  matrix: THREE.Matrix4;
  frame: number;
}

const noSsrLayer = new THREE.Layers();
noSsrLayer.set(Layers.NO_SSR);

const scratchMatrix = new THREE.Matrix4();
const scratchNormal = new THREE.Matrix3();

function excludeFromPrepass(mesh: THREE.Mesh): boolean {
  if ((mesh.userData as { noPrepass?: boolean }).noPrepass === true) return true;
  const material = mesh.material;
  if (Array.isArray(material)) {
    return material.every((m) => m.transparent || m.depthWrite === false);
  }
  return material === undefined || material.transparent || material.depthWrite === false;
}

/**
 * Produces linear depth, world-space normals and screen-space motion vectors in
 * one MRT pass, plus a min/max depth hierarchy for screen-space tracing. TAA,
 * motion blur, GTAO, SSR and volumetrics all read from here, so it runs first
 * and is fully inspectable through the debug view.
 */
export class GBufferPass {
  /** RGBA16F: world normal in `rgb`, perceptual roughness in `a`. */
  target!: THREE.WebGLRenderTarget;
  depth!: THREE.DepthTexture;
  /** Progressive min/max linear depth, index 0 = half resolution. */
  hiz: THREE.WebGLRenderTarget[] = [];

  /** Sub-pixel projection offset in NDC applied this frame. */
  readonly jitter = new THREE.Vector2();
  /** Same offset expressed in UV, for passes that unjitter a lookup. */
  readonly jitterUv = new THREE.Vector2();

  private composer: Composer;
  private material: THREE.ShaderMaterial;
  private background: THREE.ShaderMaterial;
  private hizBase: THREE.ShaderMaterial;
  private hizReduce: THREE.ShaderMaterial;
  private prev = new WeakMap<THREE.Object3D, PrevTransform>();
  private frame = 0;
  private sampleCount = 8;
  private sampleIndex = 0;
  private jitterScale = 1;
  private haltonX: number[] = [];
  private haltonY: number[] = [];
  private width = 1;
  private height = 1;
  private hidden: THREE.Object3D[] = [];

  readonly prevViewProj = new THREE.Matrix4();
  private curViewProj = new THREE.Matrix4();
  private havePrev = false;

  constructor(composer: Composer, ctx: GameContext) {
    this.composer = composer;

    this.material = new THREE.ShaderMaterial({
      vertexShader: GBUFFER_VERT,
      fragmentShader: GBUFFER_FRAG,
      glslVersion: THREE.GLSL3,
      uniforms: {
        uPrevModel: { value: new THREE.Matrix4() },
        uCurViewProj: { value: this.curViewProj },
        uPrevViewProj: { value: this.prevViewProj },
        uViewToWorld: { value: new THREE.Matrix3() },
        uRoughness: { value: 0.6 },
        uMetalness: { value: 0 },
        uSSRMask: { value: 1 },
      },
      side: THREE.FrontSide,
      fog: false,
      lights: false,
      toneMapped: false,
    });
    composer.track(this.material);

    const mat = this.material;
    mat.onBeforeRender = (
      _renderer,
      _scene,
      _camera,
      _geometry,
      object: THREE.Object3D,
      group,
    ) => {
      const u = mat.uniforms;
      let entry = this.prev.get(object);
      if (entry === undefined) {
        entry = { matrix: object.matrixWorld.clone(), frame: this.frame };
        this.prev.set(object, entry);
      }
      // A gap in the record means the object was culled or newly spawned; using
      // its current transform yields zero velocity instead of a wild streak.
      const stale = this.frame - entry.frame > 1;
      (u.uPrevModel.value as THREE.Matrix4).copy(stale ? object.matrixWorld : entry.matrix);
      entry.matrix.copy(object.matrixWorld);
      entry.frame = this.frame;

      // three types this argument as a Group, but what it passes is a geometry
      // group, which is where the material index for a multi-material mesh lives.
      const slot = (group as unknown as { materialIndex?: number } | undefined)?.materialIndex ?? 0;
      const material = Array.isArray((object as THREE.Mesh).material)
        ? ((object as THREE.Mesh).material as THREE.Material[])[slot]
        : ((object as THREE.Mesh).material as THREE.Material | undefined);
      const std = material as THREE.MeshStandardMaterial | undefined;
      u.uRoughness.value = std?.roughness !== undefined ? std.roughness : 0.7;
      u.uMetalness.value = std?.metalness !== undefined ? std.metalness : 0;
      u.uSSRMask.value = object.layers.test(noSsrLayer) ? 0 : 1;
      mat.uniformsNeedUpdate = true;
    };

    this.background = composer.material(GBUFFER_BACKGROUND_FRAG, {
      uInvViewProj: { value: new THREE.Matrix4() },
      uPrevViewProj: { value: this.prevViewProj },
    });

    const nearFar = new THREE.Vector2(ctx.camera.near, ctx.camera.far);
    this.hizBase = composer.material(DEPTH_HIZ_BASE, {
      uDepth: { value: null },
      uNearFar: { value: nearFar },
      uSrcSize: { value: new THREE.Vector2() },
    });
    this.hizReduce = composer.material(DEPTH_HIZ_REDUCE, {
      uSrc: { value: null },
      uSrcSize: { value: new THREE.Vector2() },
    });

    this.setSampleCount(8);
  }

  setSampleCount(n: number): void {
    if (n === this.sampleCount && this.haltonX.length > 0) return;
    this.sampleCount = n;
    this.haltonX.length = 0;
    this.haltonY.length = 0;
    for (let i = 0; i < n; i++) {
      this.haltonX.push(halton(i + 1, 2) - 0.5);
      this.haltonY.push(halton(i + 1, 3) - 0.5);
    }
  }

  /** 0 disables jitter entirely (used when TAA is off). */
  setJitterScale(scale: number): void {
    this.jitterScale = scale;
  }

  resize(width: number, height: number, ctx: GameContext): void {
    this.width = width;
    this.height = height;
    this.composer.destroyTarget(this.target);
    for (const h of this.hiz) this.composer.destroyTarget(h);
    this.hiz.length = 0;

    this.depth = this.composer.createDepthTexture(width, height);
    this.target = this.composer.createTarget(width, height, {
      count: 2,
      depthBuffer: true,
      depthTexture: this.depth,
      filter: THREE.NearestFilter,
    });
    this.target.textures[0].name = 'gNormalRoughness';
    this.target.textures[1].name = 'gMotionMetal';

    for (let i = 0; i < HIZ_LEVELS; i++) {
      const div = 2 << i;
      this.hiz.push(
        this.composer.createTarget(Math.ceil(width / div), Math.ceil(height / div), {
          format: THREE.RGFormat,
          filter: THREE.NearestFilter,
        }),
      );
    }

    (this.hizBase.uniforms.uNearFar.value as THREE.Vector2).set(ctx.camera.near, ctx.camera.far);
    this.havePrev = false;
  }

  get normalTexture(): THREE.Texture {
    return this.target.textures[0];
  }

  get velocityTexture(): THREE.Texture {
    return this.target.textures[1];
  }

  /** Half-resolution min/max linear depth. */
  get hizHalf(): THREE.Texture {
    return this.hiz[0].texture;
  }

  /** Coarsest level, used to skip empty space during ray traversal. */
  get hizCoarse(): THREE.Texture {
    return this.hiz[this.hiz.length - 1].texture;
  }

  /** Applies this frame's sub-pixel offset to the camera's projection matrix. */
  applyJitter(camera: THREE.PerspectiveCamera): void {
    if (this.jitterScale <= 0) {
      this.jitter.set(0, 0);
      this.jitterUv.set(0, 0);
      return;
    }
    const i = this.sampleIndex % this.sampleCount;
    const jx = (this.haltonX[i] * this.jitterScale * 2) / this.width;
    const jy = (this.haltonY[i] * this.jitterScale * 2) / this.height;
    this.jitter.set(jx, jy);
    this.jitterUv.set(jx * 0.5, jy * 0.5);
    const e = camera.projectionMatrix.elements;
    e[8] += jx;
    e[9] += jy;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  removeJitter(camera: THREE.PerspectiveCamera): void {
    if (this.jitter.x === 0 && this.jitter.y === 0) return;
    const e = camera.projectionMatrix.elements;
    e[8] -= this.jitter.x;
    e[9] -= this.jitter.y;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  advanceSample(): void {
    this.sampleIndex = (this.sampleIndex + 1) % this.sampleCount;
  }

  /**
   * Renders the prepass. `unjitteredProjection` must be the projection matrix
   * without this frame's TAA offset so motion vectors stay jitter-free.
   */
  render(ctx: GameContext, unjitteredProjection: THREE.Matrix4, frame: number): void {
    const r = this.composer.renderer;
    const camera = ctx.camera;
    this.frame = frame;

    this.curViewProj.multiplyMatrices(unjitteredProjection, camera.matrixWorldInverse);
    if (!this.havePrev) {
      this.prevViewProj.copy(this.curViewProj);
      this.havePrev = true;
    }

    scratchMatrix.copy(camera.matrixWorld);
    scratchNormal.setFromMatrix4(scratchMatrix);
    (this.material.uniforms.uViewToWorld.value as THREE.Matrix3).copy(scratchNormal);

    const scene = ctx.scene;
    const prevOverride = scene.overrideMaterial;
    const prevBackground = scene.background;
    const prevMask = camera.layers.mask;

    scene.overrideMaterial = this.material;
    // A background draw here would only cost fill; the prepass wants geometry.
    scene.background = null;
    // Late transparents (glass, smoke, particles) must not write prepass depth
    // or every screen-space pass would treat them as solid walls.
    camera.layers.disable(Layers.TRANSPARENT_LATE);
    camera.layers.disable(Layers.VIEWMODEL);
    this.hideNonOpaque(scene);

    this.composer.clear(this.target, 0x000000, 0, true);
    // Background velocity first, depth-test off, so geometry overwrites it.
    (this.background.uniforms.uInvViewProj.value as THREE.Matrix4)
      .copy(this.curViewProj)
      .invert();
    this.composer.draw(this.background, this.target);
    r.setRenderTarget(this.target);
    r.render(scene, camera);

    this.restoreHidden();
    scene.overrideMaterial = prevOverride;
    scene.background = prevBackground;
    camera.layers.mask = prevMask;

    this.buildHierarchy();
  }

  /**
   * Hides everything that must not contribute geometry to the prepass.
   *
   * `scene.overrideMaterial` replaces materials wholesale, including their
   * `depthWrite` flag, so a sky dome or a particle sheet that relies on
   * `depthWrite: false` would otherwise stamp itself into the depth buffer and
   * become a solid surface as far as AO, SSR and the fog march are concerned. A
   * sky dome in particular would wrap the entire frame in a wall at its own
   * radius. Objects can also opt out explicitly with `userData.noPrepass`.
   */
  private hideNonOpaque(scene: THREE.Scene): void {
    scene.traverseVisible((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh && !(object as THREE.Points).isPoints) return;
      if (!excludeFromPrepass(mesh)) return;
      object.visible = false;
      this.hidden.push(object);
    });
  }

  private restoreHidden(): void {
    for (const object of this.hidden) object.visible = true;
    this.hidden.length = 0;
  }

  private buildHierarchy(): void {
    this.hizBase.uniforms.uDepth.value = this.depth;
    (this.hizBase.uniforms.uSrcSize.value as THREE.Vector2).set(this.width, this.height);
    this.composer.draw(this.hizBase, this.hiz[0]);

    for (let i = 1; i < this.hiz.length; i++) {
      const src = this.hiz[i - 1];
      this.hizReduce.uniforms.uSrc.value = src.texture;
      (this.hizReduce.uniforms.uSrcSize.value as THREE.Vector2).set(src.width, src.height);
      this.composer.draw(this.hizReduce, this.hiz[i]);
    }
  }

  /** Call once per frame after everything that consumes motion vectors. */
  endFrame(): void {
    this.prevViewProj.copy(this.curViewProj);
    this.advanceSample();
  }

  resetHistory(): void {
    this.havePrev = false;
    this.prev = new WeakMap();
  }
}
