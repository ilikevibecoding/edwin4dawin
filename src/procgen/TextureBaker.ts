import * as THREE from 'three';
import {
  NORMAL_FRAGMENT_GLSL,
  SURFACE_VERTEX_GLSL,
  buildSurfaceShader,
} from './shaders/surface.glsl';

export interface BakeOptions {
  format: THREE.PixelFormat;
  type: THREE.TextureDataType;
  colorSpace: THREE.ColorSpace;
  generateMipmaps: boolean;
  wrap: THREE.Wrapping;
  minFilter: THREE.MinificationTextureFilter;
  magFilter: THREE.MagnificationTextureFilter;
  anisotropy: number;
  name: string;
}

/** The albedo + packed-ORM pair produced by one multi-target surface pass. */
export interface ChannelSet {
  /** RGB albedo (sRGB), A coverage. */
  albedo: THREE.Texture;
  /** R = ambient occlusion, G = roughness, B = metalness, A = height. */
  orm: THREE.Texture;
}

const BYTES_PER_TEXEL: Record<number, number> = {
  [THREE.UnsignedByteType]: 4,
  [THREE.HalfFloatType]: 8,
  [THREE.FloatType]: 16,
};

interface PooledTarget extends THREE.WebGLRenderTarget {
  __poolKey?: string;
}

/**
 * Renders procedural fragment shaders into render targets and hands back the
 * resulting textures.
 *
 * A render-target texture cannot be detached from its target in three: the GL
 * handle lives in renderer-private state keyed by the texture object, so a
 * clone of it samples as black and disposing the target destroys it. Every
 * target whose texture is kept is therefore retained in a registry and released
 * only by `dispose()`. Scratch targets, whose textures nobody keeps, are pooled
 * and reused.
 */
export class TextureBaker {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly scene = new THREE.Scene();
  private readonly quad: THREE.Mesh;

  private readonly retained: THREE.WebGLRenderTarget[] = [];
  private readonly pool = new Map<string, PooledTarget[]>();
  private readonly borrowed = new Set<PooledTarget>();
  private readonly materials: THREE.ShaderMaterial[] = [];
  private readonly surfaceCache = new Map<string, THREE.ShaderMaterial>();
  private normalMaterial: THREE.ShaderMaterial | null = null;

  private bytes = 0;
  private passes = 0;

  anisotropy: number;

  constructor(renderer: THREE.WebGLRenderer, anisotropy = 1) {
    this.renderer = renderer;
    this.anisotropy = anisotropy;

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    this.camera.position.z = 0.5;
  }

  /** Approximate GPU footprint of every retained texture, mip chain included. */
  get textureBytes(): number {
    return this.bytes;
  }

  get passCount(): number {
    return this.passes;
  }

  get programCount(): number {
    return this.surfaceCache.size + (this.normalMaterial ? 1 : 0);
  }

  // -------------------------------------------------------------------------
  // Core
  // -------------------------------------------------------------------------

  /**
   * Renders `fragmentShader` over a full-screen quad into a fresh target and
   * returns its texture. The target is retained for the lifetime of the baker.
   */
  bake(
    fragmentShader: string,
    uniforms: Record<string, THREE.IUniform>,
    size: number,
    options: Partial<BakeOptions> = {},
  ): THREE.Texture {
    const material = new THREE.ShaderMaterial({
      vertexShader: SURFACE_VERTEX_GLSL,
      fragmentShader,
      glslVersion: THREE.GLSL3,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    this.materials.push(material);

    const rt = this.createTarget(size, size, 1, options);
    rt.texture.name = options.name ?? 'baked';
    this.renderInto(rt, material);
    this.keep(rt);
    return rt.texture;
  }

  /**
   * Bakes a material's albedo and its packed ORM+height set in one pass.
   *
   * Both attachments share a single target, so the pair is retained together;
   * splitting them is not possible without a second pass.
   */
  bakeSurface(
    body: string,
    uniforms: Record<string, THREE.IUniform>,
    size: number,
    name: string,
    wrap: THREE.Wrapping = THREE.RepeatWrapping,
  ): ChannelSet {
    const material = this.acquireSurfaceMaterial(body, uniforms, size);
    const rt = this.createTarget(size, size, 2, {
      colorSpace: THREE.SRGBColorSpace,
      wrap,
    });
    rt.textures[1].colorSpace = THREE.NoColorSpace;
    rt.textures[0].name = `${name}:albedo`;
    rt.textures[1].name = `${name}:orm`;

    this.renderInto(rt, material);
    this.keep(rt);

    return { albedo: rt.textures[0], orm: rt.textures[1] };
  }

  /**
   * Derives a tangent-space normal map from the height packed into `source.a`.
   * `relief` is the relief depth as a fraction of the tile size, which keeps
   * the resulting slopes identical across quality tiers.
   */
  normalFromHeight(
    source: THREE.Texture,
    size: number,
    relief: number,
    wideWeight = 0.35,
    name = 'normal',
    wrap: THREE.Wrapping = THREE.RepeatWrapping,
  ): THREE.Texture {
    const material = this.ensureNormalMaterial();
    const u = material.uniforms;
    u.uSource.value = source;
    (u.uTexel.value as THREE.Vector2).set(1 / size, 1 / size);
    u.uRelief.value = relief;
    u.uWideWeight.value = wideWeight;

    const rt = this.createTarget(size, size, 1, { colorSpace: THREE.NoColorSpace, wrap });
    rt.texture.name = name;
    this.renderInto(rt, material);
    this.keep(rt);

    u.uSource.value = null;
    return rt.texture;
  }

  // -------------------------------------------------------------------------
  // Targets
  // -------------------------------------------------------------------------

  private createTarget(
    width: number,
    height: number,
    count: number,
    options: Partial<BakeOptions>,
  ): THREE.WebGLRenderTarget {
    const generateMipmaps = options.generateMipmaps ?? true;
    return new THREE.WebGLRenderTarget(width, height, {
      count,
      format: options.format ?? THREE.RGBAFormat,
      type: options.type ?? THREE.UnsignedByteType,
      colorSpace: options.colorSpace ?? THREE.NoColorSpace,
      wrapS: options.wrap ?? THREE.RepeatWrapping,
      wrapT: options.wrap ?? THREE.RepeatWrapping,
      minFilter:
        options.minFilter ??
        (generateMipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter),
      magFilter: options.magFilter ?? THREE.LinearFilter,
      anisotropy: options.anisotropy ?? this.anisotropy,
      generateMipmaps,
      depthBuffer: false,
      stencilBuffer: false,
    });
  }

  private keep(rt: THREE.WebGLRenderTarget): void {
    this.retained.push(rt);
    for (const texture of rt.textures) {
      const perTexel = BYTES_PER_TEXEL[texture.type as number] ?? 4;
      const base = rt.width * rt.height * perTexel;
      this.bytes += texture.generateMipmaps ? Math.round(base * 1.3334) : base;
    }
  }

  /** Borrows a scratch target of the given shape; hand it back with `release()`. */
  borrow(size: number, count = 1, options: Partial<BakeOptions> = {}): THREE.WebGLRenderTarget {
    const key = `${size}|${count}|${options.type ?? THREE.UnsignedByteType}|${
      options.colorSpace ?? THREE.NoColorSpace
    }`;
    const free = this.pool.get(key);
    const existing = free?.pop();
    if (existing) {
      this.borrowed.add(existing);
      return existing;
    }
    const rt = this.createTarget(size, size, count, options) as PooledTarget;
    rt.__poolKey = key;
    this.borrowed.add(rt);
    return rt;
  }

  release(rt: THREE.WebGLRenderTarget): void {
    const pooled = rt as PooledTarget;
    this.borrowed.delete(pooled);
    const key = pooled.__poolKey;
    if (key === undefined) {
      rt.dispose();
      return;
    }
    const free = this.pool.get(key);
    if (free) free.push(pooled);
    else this.pool.set(key, [pooled]);
  }

  /** Renders an arbitrary material into a borrowed target. */
  renderToTarget(rt: THREE.WebGLRenderTarget, material: THREE.ShaderMaterial): void {
    this.renderInto(rt, material);
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  private renderInto(rt: THREE.WebGLRenderTarget, material: THREE.ShaderMaterial): void {
    const renderer = this.renderer;
    const prevTarget = renderer.getRenderTarget();
    const prevCubeFace = renderer.getActiveCubeFace();
    const prevMipLevel = renderer.getActiveMipmapLevel();
    const prevAutoClear = renderer.autoClear;
    const prevScissorTest = renderer.getScissorTest();
    const prevToneMapping = renderer.toneMapping;
    const prevXr = renderer.xr.enabled;

    renderer.xr.enabled = false;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.autoClear = true;
    renderer.setScissorTest(false);

    this.quad.material = material;
    renderer.setRenderTarget(rt);
    renderer.render(this.scene, this.camera);
    this.passes++;

    renderer.setRenderTarget(prevTarget, prevCubeFace, prevMipLevel);
    renderer.autoClear = prevAutoClear;
    renderer.setScissorTest(prevScissorTest);
    renderer.toneMapping = prevToneMapping;
    renderer.xr.enabled = prevXr;
  }

  private ensureNormalMaterial(): THREE.ShaderMaterial {
    if (!this.normalMaterial) {
      this.normalMaterial = new THREE.ShaderMaterial({
        vertexShader: SURFACE_VERTEX_GLSL,
        fragmentShader: NORMAL_FRAGMENT_GLSL,
        glslVersion: THREE.GLSL3,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uSource: { value: null },
          uTexel: { value: new THREE.Vector2() },
          uRelief: { value: 1 },
          uWideWeight: { value: 0.35 },
        },
      });
      this.materials.push(this.normalMaterial);
    }
    return this.normalMaterial;
  }

  /**
   * Surface programs are cached per material body. Shader compilation dominates
   * total bake time, so a material re-baked at another resolution — or two
   * variants sharing a body — must not pay for it twice.
   */
  private acquireSurfaceMaterial(
    body: string,
    uniforms: Record<string, THREE.IUniform>,
    size: number,
  ): THREE.ShaderMaterial {
    let material = this.surfaceCache.get(body);
    if (!material) {
      material = new THREE.ShaderMaterial({
        vertexShader: SURFACE_VERTEX_GLSL,
        fragmentShader: buildSurfaceShader(body),
        glslVersion: THREE.GLSL3,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uTexel: { value: new THREE.Vector2() },
          uSeed: { value: 0 },
          ...uniforms,
        },
      });
      this.surfaceCache.set(body, material);
      this.materials.push(material);
    } else {
      for (const [key, uniform] of Object.entries(uniforms)) {
        const existing = material.uniforms[key];
        if (existing) existing.value = uniform.value;
        else material.uniforms[key] = uniform;
      }
    }
    (material.uniforms.uTexel.value as THREE.Vector2).set(1 / size, 1 / size);
    return material;
  }

  dispose(): void {
    for (const rt of this.retained) rt.dispose();
    this.retained.length = 0;
    for (const list of this.pool.values()) {
      for (const rt of list) rt.dispose();
    }
    this.pool.clear();
    for (const rt of this.borrowed) rt.dispose();
    this.borrowed.clear();
    for (const material of this.materials) material.dispose();
    this.materials.length = 0;
    this.surfaceCache.clear();
    this.normalMaterial = null;
    this.quad.geometry.dispose();
    this.bytes = 0;
  }
}
