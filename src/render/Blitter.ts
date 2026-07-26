import * as THREE from 'three';

/**
 * Vertex shader shared by every full-screen pass. A single oversized triangle
 * avoids the diagonal-edge quad helper-thread waste of a two-triangle quad and
 * skips all matrix work — the clip-space position is the attribute itself.
 */
export const FULLSCREEN_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`;

/**
 * Variant that parks the triangle on the far plane so the depth test rejects
 * every pixel already covered by opaque geometry. Used by the sky.
 */
export const FARPLANE_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vRayDir;
uniform mat4 uInvViewProjection;
uniform vec3 uCameraPos;

void main() {
  vUv = position.xy * 0.5 + 0.5;
  vec4 far = uInvViewProjection * vec4( position.xy, 1.0, 1.0 );
  vRayDir = far.xyz / far.w - uCameraPos;
  gl_Position = vec4( position.xy, 1.0, 1.0 );
}
`;

function fullscreenTriangle(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
  );
  // The triangle is deliberately larger than the viewport; culling would kill it.
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return g;
}

/** Options accepted by {@link createRenderTarget}. */
export interface RenderTargetOptions {
  type?: THREE.TextureDataType;
  format?: THREE.PixelFormat;
  filter?: THREE.MagnificationTextureFilter;
  wrap?: THREE.Wrapping;
  depth?: boolean;
  mips?: boolean;
  name?: string;
}

export function createRenderTarget(
  width: number,
  height: number,
  opts: RenderTargetOptions = {},
): THREE.WebGLRenderTarget {
  const filter = opts.filter ?? THREE.LinearFilter;
  const mips = opts.mips ?? false;
  const rt = new THREE.WebGLRenderTarget(Math.max(1, width), Math.max(1, height), {
    type: opts.type ?? THREE.HalfFloatType,
    format: opts.format ?? THREE.RGBAFormat,
    minFilter: mips ? THREE.LinearMipmapLinearFilter : (filter as THREE.MinificationTextureFilter),
    magFilter: filter,
    wrapS: opts.wrap ?? THREE.ClampToEdgeWrapping,
    wrapT: opts.wrap ?? THREE.ClampToEdgeWrapping,
    depthBuffer: opts.depth ?? false,
    stencilBuffer: false,
    generateMipmaps: mips,
    samples: 0,
  });
  rt.texture.name = opts.name ?? 'rt';
  rt.texture.colorSpace = THREE.NoColorSpace;
  rt.texture.generateMipmaps = mips;
  return rt;
}

/** Attach a sampleable depth buffer to a target. */
export function attachDepthTexture(rt: THREE.WebGLRenderTarget): THREE.DepthTexture {
  const dt = new THREE.DepthTexture(rt.width, rt.height, THREE.UnsignedIntType);
  dt.format = THREE.DepthFormat;
  dt.minFilter = THREE.NearestFilter;
  dt.magFilter = THREE.NearestFilter;
  dt.generateMipmaps = false;
  dt.name = 'sceneDepth';
  rt.depthBuffer = true;
  rt.depthTexture = dt;
  return dt;
}

/** Byte cost of a render target, for the debug overlay. */
export function renderTargetBytes(rt: THREE.WebGLRenderTarget): number {
  const t = rt.texture;
  const channels =
    t.format === THREE.RedFormat ? 1 : t.format === THREE.RGFormat ? 2 : 4;
  const bytesPerChannel =
    t.type === THREE.FloatType ? 4 : t.type === THREE.HalfFloatType ? 2 : 1;
  let bytes = rt.width * rt.height * channels * bytesPerChannel;
  if (t.generateMipmaps) bytes = Math.floor(bytes * 1.34);
  if (rt.depthTexture) bytes += rt.width * rt.height * 4;
  return bytes;
}

/**
 * Full-screen pass driver. One mesh, one camera, swapped materials — no
 * per-frame allocation and no EffectComposer bookkeeping.
 */
export class Blitter {
  private readonly geometry = fullscreenTriangle();
  private readonly camera = new THREE.Camera();
  private readonly scene = new THREE.Scene();
  private readonly mesh: THREE.Mesh;
  private readonly fallback = new THREE.MeshBasicMaterial({ color: 0x000000 });

  /** Full-screen passes executed since the last {@link resetCounters}. */
  passCount = 0;
  /** Sum of `width * height` covered by those passes, in megapixels. */
  megaPixels = 0;
  /** Pixel count assumed for passes that target the back buffer. */
  screenPixels = 0;

  constructor() {
    this.mesh = new THREE.Mesh(this.geometry, this.fallback);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.scene.add(this.mesh);
    this.scene.matrixAutoUpdate = false;
    this.camera.matrixAutoUpdate = false;
  }

  /** Build a pass material with the shared full-screen vertex shader. */
  static material(
    fragmentShader: string,
    uniforms: Record<string, THREE.IUniform>,
    defines?: Record<string, string | number>,
  ): THREE.ShaderMaterial {
    const m = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader,
      defines: defines ?? {},
      depthTest: false,
      depthWrite: false,
      transparent: false,
      toneMapped: false,
      blending: THREE.NoBlending,
    });
    m.name = 'postpass';
    return m;
  }

  blit(
    renderer: THREE.WebGLRenderer,
    material: THREE.Material,
    target: THREE.WebGLRenderTarget | null,
    clear = false,
  ): void {
    this.mesh.material = material;
    renderer.setRenderTarget(target);
    if (clear) renderer.clear(true, false, false);
    renderer.render(this.scene, this.camera);
    this.passCount++;
    this.megaPixels += (target ? target.width * target.height : this.screenPixels) / 1e6;
  }

  resetCounters(): void {
    this.passCount = 0;
    this.megaPixels = 0;
  }

  dispose(): void {
    this.geometry.dispose();
    this.fallback.dispose();
  }
}
