import * as THREE from 'three';
import type { EngineContext } from '../core/System';

/**
 * Scene depth for soft particles.
 *
 * The render module draws the world into an HDR target that owns a depth
 * texture, but particles are part of that same draw — sampling it while writing
 * into it is a framebuffer feedback loop, which WebGL leaves undefined and
 * Chrome refuses outright. So FX captures its own copy first.
 *
 * Three things keep the cost of a second scene traversal defensible:
 *
 * - it only runs on frames where a soft particle is actually alive, which for
 *   most of a firefight is no frames at all;
 * - it runs at a fraction of the render resolution, with a short far plane so
 *   frustum culling throws away everything past the range over which a soft
 *   fade is even perceptible;
 * - shadow map updates are suppressed for the pass, which is otherwise the
 *   single most expensive thing `WebGLRenderer.render` would repeat.
 *
 * Transparent, alpha-tested and depth-write-disabled geometry is excluded, so
 * the sky, glass, foliage cards and the FX layer itself cannot punch holes in
 * the captured depth.
 */
export class DepthPrepass {
  private ctx!: EngineContext;
  private target: THREE.WebGLRenderTarget | null = null;
  private readonly material = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
  });
  private readonly camera = new THREE.PerspectiveCamera();
  private readonly clearColor = new THREE.Color();
  private readonly hidden: THREE.Object3D[] = [];
  private readonly excluded: THREE.Object3D[] = [];

  private scale = 0.5;
  private interval = 1;
  private frame = 0;
  private rescanTimer = 0;
  private width = 1;
  private height = 1;
  private lastCaptureFrame = -1;
  private captures = 0;

  /** Far plane of the capture. Beyond this a soft fade is not perceptible. */
  range = 110;
  near = 0.05;

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.applyQuality();
    this.material.name = 'fx:depthPrepass';
  }

  applyQuality(): void {
    const tier = this.ctx.config.tier;
    this.scale = tier === 'ultra' ? 0.6 : tier === 'high' ? 0.5 : 0.4;
    this.interval = tier === 'ultra' || tier === 'high' ? 1 : 2;
    this.range = tier === 'ultra' ? 140 : tier === 'high' ? 110 : 80;
    this.releaseTarget();
  }

  /** True when the pass can be used at all on this quality tier. */
  get supported(): boolean {
    return this.ctx.config.tier !== 'low';
  }

  get texture(): THREE.Texture | null {
    return this.target?.texture ?? null;
  }

  get far(): number {
    return this.range;
  }

  /** Number of prepasses run since the last reset; reported by the FX stats. */
  get captureCount(): number {
    return this.captures;
  }

  resetStats(): void {
    this.captures = 0;
  }

  /**
   * Capture depth for this frame. `roots` are the FX scene roots, hidden for
   * the pass. Returns false when nothing was captured and callers should fall
   * back to hard intersections.
   */
  capture(roots: readonly THREE.Object3D[], dt: number): boolean {
    if (!this.supported) return false;
    const ctx = this.ctx;
    const frame = ctx.time.frame;
    if (frame === this.lastCaptureFrame) return this.target !== null;

    this.frame++;
    if (this.interval > 1 && this.frame % this.interval !== 0 && this.target !== null) {
      // Reuse the previous capture; a fade band tolerates one frame of lag.
      return true;
    }
    this.lastCaptureFrame = frame;

    const width = Math.max(160, Math.round(ctx.size.width * this.scale));
    const height = Math.max(90, Math.round(ctx.size.height * this.scale));
    const target = this.ensureTarget(width, height);

    this.rescanTimer -= dt;
    if (this.rescanTimer <= 0) {
      this.rescanTimer = 0.5;
      this.collectExcluded();
    }

    const renderer = ctx.renderer;
    const scene = ctx.scene;
    const main = ctx.camera;

    this.camera.fov = main.fov;
    this.camera.aspect = main.aspect;
    this.camera.near = main.near;
    this.camera.far = this.range;
    this.camera.filmGauge = main.filmGauge;
    this.camera.filmOffset = main.filmOffset;
    this.camera.zoom = main.zoom;
    this.camera.position.copy(main.position);
    this.camera.quaternion.copy(main.quaternion);
    this.camera.scale.copy(main.scale);
    this.camera.updateMatrixWorld(true);
    this.camera.updateProjectionMatrix();
    this.near = main.near;

    const prevTarget = renderer.getRenderTarget();
    const prevActiveCube = renderer.getActiveCubeFace();
    const prevMip = renderer.getActiveMipmapLevel();
    const prevOverride = scene.overrideMaterial;
    const prevAutoClear = renderer.autoClear;
    const prevShadowAuto = renderer.shadowMap.autoUpdate;
    const prevShadowNeeds = renderer.shadowMap.needsUpdate;
    const prevAlpha = renderer.getClearAlpha();
    const prevTone = renderer.toneMapping;
    renderer.getClearColor(this.clearColor);

    this.hide(roots);

    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = false;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.autoClear = true;
    // White unpacks to depth 1, i.e. "nothing here", which reads as the far
    // plane and leaves particles unfaded against the sky.
    renderer.setClearColor(0xffffff, 1);
    scene.overrideMaterial = this.material;
    renderer.setRenderTarget(target);
    renderer.render(scene, this.camera);

    scene.overrideMaterial = prevOverride;
    renderer.setRenderTarget(prevTarget, prevActiveCube, prevMip);
    renderer.setClearColor(this.clearColor, prevAlpha);
    renderer.autoClear = prevAutoClear;
    renderer.shadowMap.autoUpdate = prevShadowAuto;
    renderer.shadowMap.needsUpdate = prevShadowNeeds;
    renderer.toneMapping = prevTone;

    this.reveal();
    this.captures++;
    return true;
  }

  private ensureTarget(width: number, height: number): THREE.WebGLRenderTarget {
    if (this.target && this.width === width && this.height === height) return this.target;
    this.width = width;
    this.height = height;
    if (!this.target) {
      this.target = new THREE.WebGLRenderTarget(width, height, {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        // Packed depth cannot be interpolated: two neighbouring texels average
        // into a completely unrelated distance.
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        generateMipmaps: false,
        depthBuffer: true,
        stencilBuffer: false,
        colorSpace: THREE.NoColorSpace,
      });
      this.target.texture.name = 'fx:sceneDepth';
    } else {
      this.target.setSize(width, height);
    }
    return this.target;
  }

  /**
   * Anything that does not write opaque depth in the real frame must not write
   * it here either, or smoke would fade against sky and foliage cards.
   */
  private collectExcluded(): void {
    this.excluded.length = 0;
    this.ctx.scene.traverseVisible((object) => {
      const material = (object as THREE.Mesh).material as
        | THREE.Material
        | THREE.Material[]
        | undefined;
      if (!material) return;
      const first = Array.isArray(material) ? material[0] : material;
      if (!first) return;
      if (first.transparent || !first.depthWrite || first.alphaTest > 0) {
        this.excluded.push(object);
      }
    });
  }

  private hide(roots: readonly THREE.Object3D[]): void {
    const hidden = this.hidden;
    hidden.length = 0;
    for (let i = 0; i < roots.length; i++) {
      const root = roots[i];
      if (root.visible) {
        root.visible = false;
        hidden.push(root);
      }
    }
    for (let i = 0; i < this.excluded.length; i++) {
      const object = this.excluded[i];
      if (object.visible) {
        object.visible = false;
        hidden.push(object);
      }
    }
  }

  private reveal(): void {
    const hidden = this.hidden;
    for (let i = 0; i < hidden.length; i++) hidden[i].visible = true;
    hidden.length = 0;
  }

  private releaseTarget(): void {
    this.target?.dispose();
    this.target = null;
  }

  dispose(): void {
    this.releaseTarget();
    this.material.dispose();
    this.excluded.length = 0;
    this.hidden.length = 0;
  }
}
