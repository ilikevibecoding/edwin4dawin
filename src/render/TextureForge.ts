import * as THREE from 'three';
import { FS_VERTEX } from './FullScreen';

/**
 * GPU procedural texture synthesis.
 *
 * Every surface map in the game is generated on the GPU at load time rather
 * than shipped as image data. Three reasons this is the right call here:
 *
 *  1. There are no art assets to download, so the alternative is flat colours.
 *  2. Synthesised maps are seamless by construction and can be regenerated at
 *     any resolution, so the same material looks correct on a 4 m crate and a
 *     120 m ground plane.
 *  3. Height is authored first and albedo/roughness/AO/normal are all derived
 *     from it, which keeps them physically consistent — mortar lines are
 *     simultaneously recessed, darker, rougher, and occluded, exactly as they
 *     are in reality. Independently authored maps almost never agree, and that
 *     disagreement is what makes procedural surfaces look fake.
 */

export interface MaterialMaps {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  aoMap: THREE.Texture;
  metalnessMap: THREE.Texture;
  heightMap: THREE.Texture;
  dispose(): void;
}

const COMMON_GLSL = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uSeed;
uniform vec2  uRepeat;
uniform float uTexel;
uniform vec4  uParams0;
uniform vec4  uParams1;
uniform vec4  uParams2;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uColorC;

const float PI = 3.14159265359;

// ---- hashing ---------------------------------------------------------------
vec2 hash22(vec2 p) {
  p = mod(p, 4096.0);
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float hash21(vec2 p) {
  p = mod(p, 4096.0);
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// ---- tileable value / gradient noise ---------------------------------------
float vnoise(vec2 p, float period) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(mod(i + vec2(0.0, 0.0), period) + uSeed);
  float b = hash21(mod(i + vec2(1.0, 0.0), period) + uSeed);
  float c = hash21(mod(i + vec2(0.0, 1.0), period) + uSeed);
  float d = hash21(mod(i + vec2(1.0, 1.0), period) + uSeed);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float gnoise(vec2 p, float period) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  vec2 ga = hash22(mod(i + vec2(0.0, 0.0), period) + uSeed) * 2.0 - 1.0;
  vec2 gb = hash22(mod(i + vec2(1.0, 0.0), period) + uSeed) * 2.0 - 1.0;
  vec2 gc = hash22(mod(i + vec2(0.0, 1.0), period) + uSeed) * 2.0 - 1.0;
  vec2 gd = hash22(mod(i + vec2(1.0, 1.0), period) + uSeed) * 2.0 - 1.0;
  float va = dot(ga, f - vec2(0.0, 0.0));
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  return mix(mix(va, vb, u.x), mix(vc, vd, u.x), u.y) * 0.7071 + 0.5;
}

float fbm(vec2 p, float period, int octaves, float gain, float lacunarity) {
  float sum = 0.0;
  float amp = 1.0;
  float norm = 0.0;
  float per = period;
  for (int i = 0; i < 10; i++) {
    if (i >= octaves) break;
    sum += gnoise(p, per) * amp;
    norm += amp;
    amp *= gain;
    p *= lacunarity;
    per *= lacunarity;
  }
  return sum / max(norm, 1e-5);
}

float ridged(vec2 p, float period, int octaves) {
  float sum = 0.0;
  float amp = 1.0;
  float norm = 0.0;
  float per = period;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    float n = 1.0 - abs(gnoise(p, per) * 2.0 - 1.0);
    sum += n * n * amp;
    norm += amp;
    amp *= 0.5;
    p *= 2.0;
    per *= 2.0;
  }
  return sum / max(norm, 1e-5);
}

// ---- tileable Worley -------------------------------------------------------
vec3 worley(vec2 p, float period, float jitter) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  float id = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 cell = mod(i + g, period);
      vec2 o = hash22(cell + uSeed) * jitter;
      float d = length(g + o - f);
      if (d < f1) { f2 = f1; f1 = d; id = hash21(cell + uSeed + 7.7); }
      else if (d < f2) { f2 = d; }
    }
  }
  return vec3(f1, f2, id);
}

float remap(float v, float a, float b, float c, float d) {
  return c + (d - c) * clamp((v - a) / max(b - a, 1e-5), 0.0, 1.0);
}

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
`;

/**
 * Each material implements `surface()`, filling a `Surface` struct.
 * Height is in 0..1; the forge derives the normal map from it separately so
 * the GLSL never has to think about tangent space.
 */
const SURFACE_STRUCT = /* glsl */ `
struct Surface {
  vec3  albedo;      // linear
  float height;      // 0..1
  float roughness;   // 0..1
  float metalness;   // 0..1
  float ao;          // 0..1 (macro cavity, augmented by the derived AO pass)
};
`;

const OUTPUT_GLSL = /* glsl */ `
void main() {
  vec2 uv = vUv * uRepeat;
  Surface s = surface(uv);

  #if defined(OUT_ALBEDO)
    gl_FragColor = vec4(s.albedo, 1.0);
  #elif defined(OUT_HEIGHT)
    gl_FragColor = vec4(vec3(s.height), 1.0);
  #elif defined(OUT_ORM)
    // R = AO, G = roughness, B = metalness (glTF ORM convention).
    gl_FragColor = vec4(s.ao, s.roughness, s.metalness, 1.0);
  #else
    gl_FragColor = vec4(s.albedo, 1.0);
  #endif
}
`;

/** Sobel height → tangent-space normal, executed as a post pass. */
const NORMAL_FROM_HEIGHT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tHeight;
uniform vec2  uTexel;
uniform float uStrength;

void main() {
  float tl = texture2D(tHeight, vUv + vec2(-uTexel.x, -uTexel.y)).r;
  float t  = texture2D(tHeight, vUv + vec2( 0.0,      -uTexel.y)).r;
  float tr = texture2D(tHeight, vUv + vec2( uTexel.x, -uTexel.y)).r;
  float l  = texture2D(tHeight, vUv + vec2(-uTexel.x,  0.0)).r;
  float r  = texture2D(tHeight, vUv + vec2( uTexel.x,  0.0)).r;
  float bl = texture2D(tHeight, vUv + vec2(-uTexel.x,  uTexel.y)).r;
  float b  = texture2D(tHeight, vUv + vec2( 0.0,       uTexel.y)).r;
  float br = texture2D(tHeight, vUv + vec2( uTexel.x,  uTexel.y)).r;

  float dx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
  float dy = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);

  vec3 n = normalize(vec3(-dx * uStrength, -dy * uStrength, 1.0));
  gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
}
`;

/** Adds height-derived cavity occlusion into the ORM red channel. */
const AO_FROM_HEIGHT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tHeight;
uniform sampler2D tORM;
uniform vec2  uTexel;
uniform float uRadius;
uniform float uStrength;

void main() {
  float center = texture2D(tHeight, vUv).r;
  float occ = 0.0;
  const int DIRS = 8;
  for (int d = 0; d < DIRS; d++) {
    float a = (float(d) / float(DIRS)) * 6.2831853;
    vec2 dir = vec2(cos(a), sin(a));
    float maxSlope = 0.0;
    for (int s = 1; s <= 4; s++) {
      float dist = float(s) * uRadius * 0.25;
      float h = texture2D(tHeight, vUv + dir * uTexel * dist).r;
      maxSlope = max(maxSlope, (h - center) / max(dist * uTexel.x * 64.0, 1e-3));
    }
    occ += max(maxSlope, 0.0);
  }
  occ /= float(DIRS);

  vec4 orm = texture2D(tORM, vUv);
  float ao = clamp(1.0 - occ * uStrength, 0.0, 1.0);
  gl_FragColor = vec4(orm.r * ao, orm.g, orm.b, 1.0);
}
`;

export interface ForgeOptions {
  size?: number;
  seed?: number;
  repeat?: [number, number];
  normalStrength?: number;
  aoRadius?: number;
  aoStrength?: number;
  params0?: [number, number, number, number];
  params1?: [number, number, number, number];
  params2?: [number, number, number, number];
  colorA?: THREE.ColorRepresentation;
  colorB?: THREE.ColorRepresentation;
  colorC?: THREE.ColorRepresentation;
  anisotropy?: number;
}

export class TextureForge {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly quad: THREE.Mesh;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly cache = new Map<string, MaterialMaps>();

  private readonly normalMat: THREE.ShaderMaterial;
  private readonly aoMat: THREE.ShaderMaterial;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
    );
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
    this.quad = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    this.normalMat = new THREE.ShaderMaterial({
      vertexShader: FS_VERTEX,
      fragmentShader: NORMAL_FROM_HEIGHT,
      uniforms: {
        tHeight: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uStrength: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.aoMat = new THREE.ShaderMaterial({
      vertexShader: FS_VERTEX,
      fragmentShader: AO_FROM_HEIGHT,
      uniforms: {
        tHeight: { value: null },
        tORM: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uRadius: { value: 6 },
        uStrength: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
    });
  }

  private renderTo(target: THREE.WebGLRenderTarget, material: THREE.Material): void {
    const prev = this.renderer.getRenderTarget();
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(prev);
  }

  private makeTarget(size: number, float = false): THREE.WebGLRenderTarget {
    const rt = new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      format: THREE.RGBAFormat,
      type: float ? THREE.HalfFloatType : THREE.UnsignedByteType,
      generateMipmaps: true,
      depthBuffer: false,
      stencilBuffer: false,
      colorSpace: THREE.NoColorSpace,
    });
    return rt;
  }

  /**
   * Bakes a full PBR set from one GLSL `surface()` body.
   * Results are cached by key; call `dispose()` on the forge to release them.
   */
  bake(key: string, surfaceGLSL: string, opts: ForgeOptions = {}): MaterialMaps {
    const cached = this.cache.get(key);
    if (cached) return cached;

    const size = opts.size ?? 1024;
    const seed = opts.seed ?? 1;
    const repeat = opts.repeat ?? [1, 1];
    const aniso = opts.anisotropy ?? this.renderer.capabilities.getMaxAnisotropy();

    const uniforms = {
      uSeed: { value: seed },
      uRepeat: { value: new THREE.Vector2(repeat[0], repeat[1]) },
      uTexel: { value: 1 / size },
      uParams0: { value: new THREE.Vector4(...(opts.params0 ?? [0, 0, 0, 0])) },
      uParams1: { value: new THREE.Vector4(...(opts.params1 ?? [0, 0, 0, 0])) },
      uParams2: { value: new THREE.Vector4(...(opts.params2 ?? [0, 0, 0, 0])) },
      uColorA: { value: new THREE.Color(opts.colorA ?? 0xffffff) },
      uColorB: { value: new THREE.Color(opts.colorB ?? 0x808080) },
      uColorC: { value: new THREE.Color(opts.colorC ?? 0x404040) },
    };

    const build = (define: string): THREE.ShaderMaterial =>
      new THREE.ShaderMaterial({
        vertexShader: FS_VERTEX,
        fragmentShader: `${COMMON_GLSL}\n${SURFACE_STRUCT}\n${surfaceGLSL}\n${OUTPUT_GLSL}`,
        uniforms,
        defines: { [define]: '' },
        depthTest: false,
        depthWrite: false,
      });

    const albedoRT = this.makeTarget(size);
    const heightRT = this.makeTarget(size, true);
    const ormRT = this.makeTarget(size);
    const ormFinalRT = this.makeTarget(size);
    const normalRT = this.makeTarget(size);

    const matAlbedo = build('OUT_ALBEDO');
    const matHeight = build('OUT_HEIGHT');
    const matORM = build('OUT_ORM');

    this.renderTo(albedoRT, matAlbedo);
    this.renderTo(heightRT, matHeight);
    this.renderTo(ormRT, matORM);

    this.normalMat.uniforms.tHeight.value = heightRT.texture;
    (this.normalMat.uniforms.uTexel.value as THREE.Vector2).set(1 / size, 1 / size);
    this.normalMat.uniforms.uStrength.value = (opts.normalStrength ?? 1) * size * 0.012;
    this.renderTo(normalRT, this.normalMat);

    this.aoMat.uniforms.tHeight.value = heightRT.texture;
    this.aoMat.uniforms.tORM.value = ormRT.texture;
    (this.aoMat.uniforms.uTexel.value as THREE.Vector2).set(1 / size, 1 / size);
    this.aoMat.uniforms.uRadius.value = opts.aoRadius ?? 6;
    this.aoMat.uniforms.uStrength.value = opts.aoStrength ?? 1;
    this.renderTo(ormFinalRT, this.aoMat);

    matAlbedo.dispose();
    matHeight.dispose();
    matORM.dispose();
    ormRT.dispose();

    const configure = (t: THREE.Texture, srgb: boolean): THREE.Texture => {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = aniso;
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.needsUpdate = true;
      return t;
    };

    // The albedo shader already outputs linear values, so the sampler must not
    // apply another sRGB decode.
    const maps: MaterialMaps = {
      map: configure(albedoRT.texture, false),
      normalMap: configure(normalRT.texture, false),
      roughnessMap: configure(ormFinalRT.texture, false),
      aoMap: configure(ormFinalRT.texture, false),
      metalnessMap: configure(ormFinalRT.texture, false),
      heightMap: configure(heightRT.texture, false),
      dispose: () => {
        albedoRT.dispose();
        normalRT.dispose();
        ormFinalRT.dispose();
        heightRT.dispose();
      },
    };

    this.cache.set(key, maps);
    return maps;
  }

  dispose(): void {
    for (const m of this.cache.values()) m.dispose();
    this.cache.clear();
    this.normalMat.dispose();
    this.aoMat.dispose();
    this.quad.geometry.dispose();
  }
}
