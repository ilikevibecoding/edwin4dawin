import * as THREE from 'three';
import { FULLSCREEN_VERT } from '../../shaders/post/common.glsl';

/**
 * Minimal composer built for this pipeline instead of three's `EffectComposer`.
 *
 * The stock composer owns a fixed pair of RGBA8 read/write buffers, resolves
 * every pass through them, and offers no way to attach MRT, share a depth
 * texture, keep temporal history, or render into a mip level. All four are
 * load-bearing here, so this owns target allocation and pass submission
 * directly and leaves ordering to the pipeline.
 */

export interface RenderCaps {
  /** Half-float colour attachments. Without it the whole chain drops to RGBA8. */
  colorBufferFloat: boolean;
  /** Linear filtering of float textures; needed by bloom's tent upsample. */
  floatLinear: boolean;
  maxDrawBuffers: number;
  maxSamples: number;
  /** GPU timer queries, used to report per-pass cost. */
  timerQuery: boolean;
}

export interface TargetOptions {
  type?: THREE.TextureDataType;
  format?: THREE.PixelFormat;
  /** Colour attachment count for MRT. */
  count?: number;
  depthBuffer?: boolean;
  depthTexture?: THREE.DepthTexture | null;
  filter?: THREE.MagnificationTextureFilter;
  samples?: number;
  wrap?: THREE.Wrapping;
}

const scratchColor = new THREE.Color();

export class Composer {
  readonly renderer: THREE.WebGLRenderer;
  readonly caps: RenderCaps;
  /** Half-float when supported, byte otherwise. Every HDR target uses this. */
  readonly hdrType: THREE.TextureDataType;

  private quadGeometry: THREE.BufferGeometry;
  private quadMesh: THREE.Mesh;
  private quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private targets: THREE.WebGLRenderTarget[] = [];
  private materials: THREE.Material[] = [];
  private timer: GPUTimer | null = null;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const isWebGL2 = renderer.capabilities.isWebGL2 !== false;
    const colorBufferFloat = isWebGL2 && !!gl.getExtension('EXT_color_buffer_float');
    const halfFloatOnly = !colorBufferFloat && !!gl.getExtension('EXT_color_buffer_half_float');

    this.caps = {
      colorBufferFloat: colorBufferFloat || halfFloatOnly,
      floatLinear: !!gl.getExtension('OES_texture_float_linear') || colorBufferFloat,
      maxDrawBuffers: isWebGL2 ? (gl.getParameter(gl.MAX_DRAW_BUFFERS) as number) : 1,
      maxSamples: isWebGL2 ? (gl.getParameter(gl.MAX_SAMPLES) as number) : 0,
      timerQuery: isWebGL2 && !!gl.getExtension('EXT_disjoint_timer_query_webgl2'),
    };

    this.hdrType = this.caps.colorBufferFloat ? THREE.HalfFloatType : THREE.UnsignedByteType;
    if (!this.caps.colorBufferFloat) {
      console.warn(
        '[post] EXT_color_buffer_float unavailable; HDR targets fall back to 8-bit. ' +
          'Bloom, volumetrics and tone mapping will clip.',
      );
    }

    this.quadGeometry = new THREE.BufferGeometry();
    // A single oversized triangle: no diagonal seam and 2/3 of the vertex work.
    this.quadGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
    );
    this.quadGeometry.setAttribute(
      'uv',
      new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2),
    );
    this.quadMesh = new THREE.Mesh(this.quadGeometry, new THREE.MeshBasicMaterial());
    this.quadMesh.frustumCulled = false;
    this.quadMesh.matrixAutoUpdate = false;

    if (this.caps.timerQuery) this.timer = new GPUTimer(gl);
  }

  /* ------------------------------ targets ------------------------------- */

  createTarget(width: number, height: number, opts: TargetOptions = {}): THREE.WebGLRenderTarget {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    const filter = opts.filter ?? THREE.LinearFilter;
    const type = opts.type ?? this.hdrType;

    const rt = new THREE.WebGLRenderTarget(w, h, {
      type,
      format: opts.format ?? THREE.RGBAFormat,
      count: Math.min(opts.count ?? 1, this.caps.maxDrawBuffers),
      depthBuffer: opts.depthBuffer ?? false,
      stencilBuffer: false,
      generateMipmaps: false,
      minFilter: filter,
      magFilter: filter,
      wrapS: opts.wrap ?? THREE.ClampToEdgeWrapping,
      wrapT: opts.wrap ?? THREE.ClampToEdgeWrapping,
      samples: opts.samples ?? 0,
      depthTexture: opts.depthTexture ?? null,
    });

    for (const t of rt.textures) t.colorSpace = THREE.NoColorSpace;
    this.targets.push(rt);
    return rt;
  }

  createDepthTexture(width: number, height: number): THREE.DepthTexture {
    const d = new THREE.DepthTexture(
      Math.max(1, Math.floor(width)),
      Math.max(1, Math.floor(height)),
      THREE.UnsignedIntType,
    );
    d.format = THREE.DepthFormat;
    d.minFilter = THREE.NearestFilter;
    d.magFilter = THREE.NearestFilter;
    return d;
  }

  destroyTarget(rt: THREE.WebGLRenderTarget | null | undefined): void {
    if (!rt) return;
    const i = this.targets.indexOf(rt);
    if (i >= 0) this.targets.splice(i, 1);
    rt.depthTexture?.dispose();
    rt.dispose();
  }

  /* ------------------------------ passes -------------------------------- */

  /** Creates a fullscreen-pass material and tracks it for disposal. */
  material(
    fragmentShader: string,
    uniforms: Record<string, THREE.IUniform>,
    defines?: Record<string, string | number | boolean>,
  ): THREE.ShaderMaterial {
    const m = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader,
      uniforms,
      ...(defines ? { defines: defines as Record<string, unknown> } : {}),
      glslVersion: THREE.GLSL3,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
      toneMapped: false,
      fog: false,
      lights: false,
    });
    this.materials.push(m);
    return m;
  }

  track<T extends THREE.Material>(m: T): T {
    this.materials.push(m);
    return m;
  }

  /** Draws one fullscreen pass of `material` into `target` (null = canvas). */
  draw(material: THREE.Material, target: THREE.WebGLRenderTarget | null): void {
    this.renderer.setRenderTarget(target);
    this.quadMesh.material = material;
    this.renderer.render(this.quadMesh, this.quadCamera);
  }

  clear(
    target: THREE.WebGLRenderTarget | null,
    color: THREE.ColorRepresentation | null = 0x000000,
    alpha = 0,
    depth = true,
  ): void {
    this.renderer.setRenderTarget(target);
    if (color !== null) {
      const prev = this.renderer.getClearColor(scratchColor).getHex();
      const prevAlpha = this.renderer.getClearAlpha();
      this.renderer.setClearColor(color, alpha);
      this.renderer.clear(true, depth, false);
      this.renderer.setClearColor(prev, prevAlpha);
    } else {
      this.renderer.clear(false, depth, false);
    }
  }

  /* ------------------------------ timing -------------------------------- */

  beginTimer(name: string): void {
    this.timer?.begin(name);
  }

  endTimer(): void {
    this.timer?.end();
  }

  /** Call once per frame, after submission, to retire finished timer queries. */
  collectTimings(): void {
    this.timer?.endFrame();
  }

  get timings(): Readonly<Record<string, number>> {
    return this.timer ? this.timer.results : EMPTY_TIMINGS;
  }

  dispose(): void {
    for (const t of this.targets) {
      t.depthTexture?.dispose();
      t.dispose();
    }
    this.targets.length = 0;
    for (const m of this.materials) m.dispose();
    this.materials.length = 0;
    this.quadGeometry.dispose();
    this.timer?.dispose();
  }
}

const EMPTY_TIMINGS: Readonly<Record<string, number>> = Object.freeze({});

/**
 * Wraps EXT_disjoint_timer_query_webgl2. Queries cannot nest, so passes are
 * timed sequentially and results are collected some frames later, once the GPU
 * has caught up.
 *
 * Only a few passes are timed per frame, and which few rotates. Timing all of
 * them every frame does not work: the results lag by however long the GPU is
 * behind, so the in-flight queue fills, every later `begin` is refused, and the
 * profile ends up containing nothing but the first pass in the frame — with no
 * indication that the rest were dropped rather than free. Sampling a sliding
 * window instead covers every pass within a handful of frames, and since the
 * results are exponentially smoothed anyway the loss of per-frame resolution
 * costs nothing.
 */
class GPUTimer {
  readonly results: Record<string, number> = {};
  private gl: WebGL2RenderingContext;
  private ext: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };
  private pending: Array<{ name: string; query: WebGLQuery }> = [];
  private active: WebGLQuery | null = null;
  private pool: WebGLQuery[] = [];
  private smoothing = 0.15;

  /** Passes timed per frame, and where in the frame this one starts. */
  private budget = 4;
  private cursor = 0;
  private index = 0;
  private passesLastFrame = 1;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as unknown as {
      TIME_ELAPSED_EXT: number;
      GPU_DISJOINT_EXT: number;
    };
  }

  begin(name: string): void {
    const i = this.index++;
    if (this.active || this.pending.length >= this.budget * 4) return;
    // Distance forward from the cursor, wrapped, so the window can straddle the
    // end of the frame.
    const total = this.passesLastFrame;
    if ((((i - this.cursor) % total) + total) % total >= this.budget) return;
    const q = this.pool.pop() ?? this.gl.createQuery();
    if (!q) return;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
    this.active = q;
    this.pending.push({ name, query: q });
  }

  end(): void {
    if (!this.active) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.active = null;
  }

  endFrame(): void {
    this.poll();
    this.passesLastFrame = Math.max(1, this.index);
    this.cursor = (this.cursor + this.budget) % this.passesLastFrame;
    this.index = 0;
  }

  private poll(): void {
    const gl = this.gl;
    if (gl.getParameter(this.ext.GPU_DISJOINT_EXT)) {
      for (const p of this.pending) this.pool.push(p.query);
      this.pending.length = 0;
      return;
    }
    while (this.pending.length > 0) {
      const head = this.pending[0];
      if (!gl.getQueryParameter(head.query, gl.QUERY_RESULT_AVAILABLE)) break;
      const ns = gl.getQueryParameter(head.query, gl.QUERY_RESULT) as number;
      const ms = ns / 1e6;
      const prev = this.results[head.name];
      this.results[head.name] = prev === undefined ? ms : prev + (ms - prev) * this.smoothing;
      this.pool.push(head.query);
      this.pending.shift();
    }
  }

  dispose(): void {
    for (const p of this.pending) this.gl.deleteQuery(p.query);
    for (const q of this.pool) this.gl.deleteQuery(q);
    this.pending.length = 0;
    this.pool.length = 0;
  }
}
