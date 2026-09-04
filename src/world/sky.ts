import * as THREE from 'three';
import { GLSL_AERIAL, GLSL_ATMOS_UNIFORMS, GLSL_CLOUD_FIELD, GLSL_NOISE, GLSL_SKY } from '../render/shaders/common.glsl';
import type { Atmosphere } from './atmosphere';
import { createCloudNoiseTexture } from './noiseTexture';

/** Size (texels) and world extent (m) of the baked 2D cloud macro field. */
const COV_SIZE = 1024;
const COV_EXTENT = 76000;
/** Clouds are marched no further than this; beyond it they have faded into the horizon haze. */
const CLOUD_MAX_DIST = 30000;
/** Re-bake the macro field when the camera (in cloud space) drifts this far from the baked centre. */
const COV_REBAKE_DIST = 7000;

/** Sun disc, moon and stars on top of the analytic sky: shared by the full-resolution dome and the probe. */
const GLSL_SKY_EXTRAS = /* glsl */ `
vec3 moonDirection() { return normalize(vec3(-uSunDir.x, max(0.25, -uSunDir.y * 0.8 + 0.3), -uSunDir.z)); }
vec3 stars(vec3 dir) {
  vec3 d = dir * 220.0;
  vec3 c = floor(d);
  float h = hash12(c.xy + c.z * 17.0);
  float star = smoothstep(0.985, 1.0, h) * step(0.15, dir.y);
  vec3 f = fract(d) - 0.5;
  star *= smoothstep(0.35, 0.0, length(f));
  return vec3(star) * (0.6 + 0.4 * hash12(c.zx));
}
vec3 skyBackground(vec3 dir) {
  vec3 sky = skyRadiance(dir);
  sky += sunDisc(dir);
  vec3 moonDir = moonDirection();
  float cm = dot(dir, moonDir);
  float moon = smoothstep(0.99975, 0.99992, cm) * 1.6 + pow(max(cm, 0.0), 700.0) * 0.08;
  sky += vec3(0.75, 0.8, 0.95) * moon * uNight;
  sky += stars(dir) * uNight * 0.7;
  return sky;
}
`;

/** Bakes the macro coverage field (cloud space) into a 2D texture so the raymarch reads one texel instead
 *  of evaluating ~10 octaves of value noise per sample. */
const COV_FRAG = /* glsl */ `
${GLSL_ATMOS_UNIFORMS}
${GLSL_NOISE}
${GLSL_CLOUD_FIELD}
uniform vec2 uCovCenter;
uniform float uCovExtent;
in vec2 vUv;
void main() {
  vec2 cs = uCovCenter + (vUv - 0.5) * uCovExtent;
  vec2 f = cloudFieldCS(cs);
  vec2 p = cs * 0.00015 + uCloudSeed;
  // slow field: which masses develop vertically (0 flat .. 1 towering)
  float tower = clamp((fbm3(p * 0.7 + 3.1) - 0.22) / 0.46, 0.0, 1.0);
  // slight variation of the base altitude between cells
  float baseVar = clamp((fbm3(p * 2.2 + 5.5) - 0.2) / 0.5, 0.0, 1.0);
  gl_FragColor = vec4(f.x, mix(f.y, tower, 0.5), baseVar, f.y);
}
`;

/** Volumetric cloud layer, rendered at reduced resolution into RGB = premultiplied radiance, A = transmittance. */
const CLOUD_FRAG = /* glsl */ `
precision highp sampler3D;
${GLSL_ATMOS_UNIFORMS}
${GLSL_NOISE}
${GLSL_CLOUD_FIELD}
${GLSL_SKY}
${GLSL_AERIAL}
uniform sampler3D uNoise3D;
uniform sampler2D uCovTex;
uniform vec2 uCovCenter;
uniform float uCovExtent;
uniform vec3 uCamPos;
uniform mat4 uInvProj;
uniform mat4 uInvView;
uniform float uCloudSteps;
uniform float uMaxDist;
in vec2 vUv;

const float SIGMA = 0.03;         // extinction per metre at unit density (dense cumulus)
const float NOISE_SCALE = 1.0 / 1600.0;

// interleaved gradient noise: a pure function of the pixel position, so frames are reproducible
float ign(vec2 px) { return fract(52.9829189 * fract(0.06711056 * px.x + 0.00583715 * px.y)); }

/** Macro field at a world xz position: x coverage, y vertical development, z base variation, w interior. */
vec4 macroField(vec2 wp) {
  vec2 uv = (wp + uCloudWind - uCovCenter) / uCovExtent + 0.5;
  return texture(uCovTex, uv);
}

/** Vertical envelope of the layer (before noise): flat base at a common altitude, column height driven by
 *  the macro field. Returns coverage * vertical profile; hf = height fraction in the slab, hn = fraction of
 *  this column's own height, H = column height fraction. */
float envelope(vec3 p, vec4 f, out float hf, out float hn, out float H) {
  float thick = uCloudTop - uCloudBase;
  float base = uCloudBase + (f.z - 0.5) * 0.06 * thick;
  hf = (p.y - base) / thick;
  H = mix(0.22, 1.0, smoothstep(0.05, 0.75, f.y));
  hn = hf / H;
  float v = smoothstep(0.0, 0.05, hf) * (1.0 - smoothstep(0.55, 1.0, hn));
  return f.x * v;
}

vec3 noiseCoord(vec3 p) { return (p + vec3(uCloudWind.x, 0.0, uCloudWind.y)) * NOISE_SCALE; }

/** Shape-eroded density: solid interiors, cauliflower lobes where the envelope thins (top and edges). */
float shapeDensity(float e, float hn, vec4 n) {
  float shape = clamp((n.r * 0.6 + n.g * 0.25 + n.a * 0.15 - 0.3) / 0.7, 0.0, 1.0);
  // interiors stay noise-modulated (mottled bases, uneven light march) instead of saturating
  float erosion = mix(0.5, 1.0, clamp(hn, 0.0, 1.0));
  return e * 1.15 - (1.0 - shape) * erosion;
}

/** Density without edge detail (used by the light march). */
float densityBase(vec3 p, vec4 f) {
  float hf, hn, H;
  float e = envelope(p, f, hf, hn, H);
  if (e <= 0.002) return 0.0;
  vec4 n = texture(uNoise3D, noiseCoord(p));
  return clamp(shapeDensity(e, hn, n), 0.0, 1.0);
}

/** Full density with detail erosion of the edges. */
float densityFull(vec3 p, float e, float hn) {
  vec3 q = noiseCoord(p);
  vec4 n = texture(uNoise3D, q);
  float d = shapeDensity(e, hn, n);
  if (d <= 0.0) return 0.0;
  // low-frequency worley erosion, billowy at the base and wispier toward the top
  float det = texture(uNoise3D, q * 3.0 + vec3(0.37, 0.11, 0.73)).g;
  float wisp = texture(uNoise3D, q * 5.0 + vec3(0.61, 0.29, 0.17)).b;
  float er = mix(det, wisp, smoothstep(0.35, 0.95, hn));
  // remap (rather than subtract) so eroded edges keep a steep density gradient: crisp cauliflower lobes
  float k = 0.38 * (1.0 - er);
  d = (d - k) / (1.0 - k);
  return clamp(d * 2.0, 0.0, 1.0);
}

/** Optical depth toward the light through the layer (4 growing steps). */
float lightOD(vec3 p, vec3 L) {
  float thick = uCloudTop - uCloudBase;
  float od = 0.0;
  float t = 0.0;
  float s = thick * 0.06;
  for (int i = 0; i < 4; i++) {
    vec3 q = p + L * (t + s * 0.5);
    if (q.y > uCloudTop + 1.0 || q.y < uCloudBase - 200.0) break;
    od += densityBase(q, macroField(q.xz)) * s;
    t += s;
    s *= 2.0;
  }
  // shadowing uses a reduced extinction: multiple scattering carries light deeper than Beer-Lambert alone
  return od * SIGMA * 0.6;
}

// Beer-Lambert with a cheap multiple-scattering approximation (3 octaves of attenuated extinction)
float beer(float od) { return 0.48 * exp(-od) + 0.3 * exp(-0.25 * od) + 0.22 * exp(-0.06 * od); }
// Henyey-Greenstein phase normalised so that isotropic = 1
float hgN(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * c, 1.5); }

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 vpos = uInvProj * vec4(ndc, 1.0, 1.0);
  vpos /= vpos.w;
  vec3 dir = normalize((uInvView * vec4(vpos.xyz, 0.0)).xyz);

  // light: the sun, handing over to the moon once the sun is below the horizon
  float nightMix = smoothstep(0.02, -0.08, uSunDir.y);
  vec3 moonDir = normalize(vec3(-uSunDir.x, max(0.25, -uSunDir.y * 0.8 + 0.3), -uSunDir.z));
  vec3 L = normalize(mix(uSunDir, moonDir, nightMix));
  // moonlight is dimmer relative to the (exposure-boosted) night sky than the key colours alone suggest
  vec3 lightCol = uSunColor * 2.7 * mix(1.0, 0.5, nightMix);

  float T = 1.0;
  vec3 col = vec3(0.0);
  float ro_y = uCamPos.y;
  float t0 = -1.0, t1 = -1.0;
  float tb = (uCloudBase - ro_y) / dir.y;
  float tt = (uCloudTop - ro_y) / dir.y;
  if (ro_y < uCloudBase) { if (dir.y > 0.008) { t0 = tb; t1 = tt; } }
  else if (ro_y > uCloudTop) { if (dir.y < -0.008) { t0 = tt; t1 = tb; } }
  else { t0 = 0.0; t1 = dir.y > 0.0 ? tt : tb; }
  float meanDist = 0.0;
  if (t0 >= 0.0 && t0 < uMaxDist) {
    t1 = min(t1, uMaxDist);
    float pathLen = t1 - t0;
    // three step sizes: coarse through clear air, fine inside the envelope, and a surface step that
    // resolves the silhouette while the ray is still mostly transparent. The fine step is budget-limited
    // over the slab crossing and grows with distance (pixel footprint).
    float budget = uCloudSteps * 8.0;
    float dtF = max(pathLen / (budget * 0.6), 36.0 + t0 * 0.003);
    float dtC = dtF * 3.0;
    float dtS = dtF * (1.0 / 3.0);
    float t = t0 + ign(gl_FragCoord.xy) * dtF;

    float cosSun = dot(dir, L);
    // dual-lobe phase: forward lobe gives the silver lining near the sun, back lobe keeps bases readable
    float phase = mix(hgN(cosSun, 0.72), hgN(cosSun, -0.18), 0.45);
    float forward = smoothstep(0.3, 0.95, cosSun);
    vec3 skyAmb = mix(uHorizonColor, uZenithColor, 0.4) * 0.9;
    vec3 gndAmb = uHazeColor * 0.55;
    // low sun: grazing light reaches the undersides (warm sunset bases)
    float lowSun = (1.0 - smoothstep(0.04, 0.3, L.y)) * (1.0 - nightMix);

    int level = 0;          // 0 coarse, 1 fine, 2 surface
    int empty = 0;
    int sinceLight = 9;
    float lt = 1.0;
    float wsum = 0.0;
    for (int i = 0; i < 200; i++) {
      if (float(i) >= budget || t > t1 || T < 0.01) break;
      vec3 p = uCamPos + dir * t;
      vec4 f = macroField(p.xz);
      float hf, hn, H;
      float e = envelope(p, f, hf, hn, H);
      if (e <= 0.004) {
        // clear air: fall back to coarse steps after a couple of empty samples
        if (level > 0) { empty++; if (empty > 2) level = 0; }
        t += level == 0 ? dtC : (level == 1 ? dtF : dtS);
        continue;
      }
      if (level == 0) {
        // entered the envelope during a coarse step: back up and resample finely
        level = 1;
        t = max(t + dtF - dtC, t0);
        continue;
      }
      float dens = densityFull(p, e, hn);
      if (dens <= 0.003) {
        empty++;
        if (level == 2 && empty > 1) level = 1;
        t += level == 1 ? dtF : dtS;
        continue;
      }
      empty = 0;
      if (level == 1 && T > 0.35) {
        // first density after a fine step: back up and resolve the surface with the small step
        level = 2;
        t = max(t + dtS - dtF, t0);
        continue;
      }
      float dt = level == 2 ? dtS : dtF;
      // the light march varies slowly along the ray: reuse it for the next surface sample
      if (level == 1 || sinceLight >= 1) {
        lt = beer(lightOD(p, L));
        // grazing sunset light on the undersides, attenuated by the local cloud thickness
        lt = max(lt, lowSun * (1.0 - smoothstep(0.0, 0.35, hn)) * exp(-e * 2.5) * 0.6);
        sinceLight = 0;
      } else sinceLight++;
      float powder = 1.0 - exp(-dens * 5.0);
      float sunTerm = lt * phase * mix(mix(0.55, 1.0, powder), 1.0, forward);
      // ambient: sky from above, sea/haze bounce from below, occluded by the cloud thickness overhead
      // (thin cells of an overcast deck stay bright underneath, thick cells go dark)
      float above = max(H - hf, 0.0) * (uCloudTop - uCloudBase) * e;
      float ao = mix(0.16, 1.0, exp(-above * 0.0015));
      vec3 amb = mix(gndAmb, skyAmb, clamp(hf * 1.3, 0.0, 1.0)) * ao;
      vec3 S = lightCol * sunTerm + amb;
      float a = 1.0 - exp(-dens * SIGMA * dt);
      col += T * a * S;
      meanDist += T * a * t;
      wsum += T * a;
      T *= 1.0 - a;
      if (level == 2 && T < 0.35) level = 1;
      t += dt;
    }
    if (wsum > 0.0) meanDist /= wsum; else meanDist = t0;
  }

  float alpha = 1.0 - T;
  if (alpha > 0.0005) {
    vec3 c = col / alpha;
    vec3 far = uCamPos + dir * meanDist;
    c = applyAerial(c, uCamPos, far);
    // distant clouds sink into the horizon haze (long low-angle paths through humid air)
    float fade = exp(-meanDist * 1.5e-5) * (1.0 - smoothstep(0.62 * uMaxDist, uMaxDist, meanDist));
    alpha *= fade;
    col = c * alpha;
  } else {
    alpha = 0.0;
    col = vec3(0.0);
  }
  gl_FragColor = vec4(col, 1.0 - alpha);
}
`;

const QUAD_VERT = /* glsl */ `
out vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/** Full-resolution sky dome: analytic sky + sun/moon/stars, composited with the upsampled cloud layer. */
const DOME_VERT = /* glsl */ `
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = vec4(p.xy, p.w * 0.999999, p.w);
}
`;
const DOME_FRAG = /* glsl */ `
${GLSL_ATMOS_UNIFORMS}
${GLSL_NOISE}
${GLSL_SKY}
${GLSL_SKY_EXTRAS}
uniform sampler2D uCloudTex;
uniform vec2 uCloudTexel;
uniform vec2 uResolution;
uniform mat4 uInvProj;
uniform mat4 uInvView;
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 ndc = uv * 2.0 - 1.0;
  vec4 vpos = uInvProj * vec4(ndc, 1.0, 1.0);
  vpos /= vpos.w;
  vec3 dir = normalize((uInvView * vec4(vpos.xyz, 0.0)).xyz);
  vec3 sky = skyBackground(dir);
  // tent-filtered upsample of the reduced-resolution cloud layer (4 bilinear taps = 3x3 tent)
  vec2 o = uCloudTexel * 0.35;
  vec4 c = texture(uCloudTex, uv + vec2(-o.x, -o.y)) + texture(uCloudTex, uv + vec2(o.x, -o.y))
         + texture(uCloudTex, uv + vec2(-o.x, o.y)) + texture(uCloudTex, uv + vec2(o.x, o.y));
  c *= 0.25;
  gl_FragColor = vec4(sky * c.a + c.rgb, 1.0);
}
`;

/** Environment-probe version: analytic sky only (used for IBL / reflections), rendered on a dome. */
const ENV_VERT = /* glsl */ `
out vec3 vDir;
void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const ENV_FRAG = /* glsl */ `
${GLSL_ATMOS_UNIFORMS}
${GLSL_NOISE}
${GLSL_CLOUD_FIELD}
${GLSL_SKY}
in vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  vec3 col = skyRadiance(dir);
  // clouds as a soft brightening band so reflections pick up overcast light
  float cov = uCloudCoverage;
  col = mix(col, mix(uHorizonColor, uZenithColor, 0.4) * 1.1, cov * 0.35 * smoothstep(0.0, 0.3, dir.y));
  vec3 sun = sunDisc(dir);
  col += min(sun, vec3(12.0));
  // sea below the horizon for reflections
  col = mix(col, uHazeColor * 0.55, smoothstep(0.0, -0.05, dir.y));
  gl_FragColor = vec4(col, 1.0);
}
`;

export class Sky {
  readonly dome: THREE.Mesh;
  private readonly cloudMat: THREE.ShaderMaterial;
  private readonly covMat: THREE.ShaderMaterial;
  private readonly domeMat: THREE.ShaderMaterial;
  private readonly quad: THREE.Mesh;
  private readonly quadScene = new THREE.Scene();
  private readonly quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private cloudRT: THREE.WebGLRenderTarget;
  private readonly covRT: THREE.WebGLRenderTarget;
  private covBaked = false;
  private readonly covCenter = new THREE.Vector2();
  private scale: number;
  private readonly envScene = new THREE.Scene();
  private readonly envMat: THREE.ShaderMaterial;
  private pmrem: THREE.PMREMGenerator | null = null;
  private envRT: THREE.WebGLRenderTarget | null = null;
  envMap: THREE.Texture | null = null;
  private readonly noise: THREE.Data3DTexture;

  constructor(private atmos: Atmosphere, renderer: THREE.WebGLRenderer, opts: { cloudSteps: number; scale: number }) {
    this.noise = createCloudNoiseTexture(64);
    this.scale = opts.scale;
    this.covRT = new THREE.WebGLRenderTarget(COV_SIZE, COV_SIZE, {
      type: THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: false, generateMipmaps: false,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping,
    });
    this.covMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: COV_FRAG,
      uniforms: { ...atmos.uniforms, uCovCenter: { value: this.covCenter }, uCovExtent: { value: COV_EXTENT } },
      depthTest: false,
      depthWrite: false,
    });
    this.cloudMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: CLOUD_FRAG,
      uniforms: {
        ...atmos.uniforms,
        uNoise3D: { value: this.noise },
        uCovTex: { value: this.covRT.texture },
        uCovCenter: { value: this.covCenter },
        uCovExtent: { value: COV_EXTENT },
        uCamPos: { value: new THREE.Vector3() },
        uInvProj: { value: new THREE.Matrix4() },
        uInvView: { value: new THREE.Matrix4() },
        uCloudSteps: { value: opts.cloudSteps },
        uMaxDist: { value: CLOUD_MAX_DIST },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.cloudMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
    this.cloudRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });

    this.domeMat = new THREE.ShaderMaterial({
      vertexShader: DOME_VERT,
      fragmentShader: DOME_FRAG,
      uniforms: {
        ...atmos.uniforms,
        uCloudTex: { value: this.cloudRT.texture },
        uCloudTexel: { value: new THREE.Vector2(0.25, 0.25) },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uInvProj: { value: new THREE.Matrix4() },
        uInvView: { value: new THREE.Matrix4() },
      },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), this.domeMat);
    this.dome.frustumCulled = false;
    this.dome.renderOrder = -1000;
    (this.dome as unknown as { isSky: boolean }).isSky = true;

    this.envMat = new THREE.ShaderMaterial({
      vertexShader: ENV_VERT,
      fragmentShader: ENV_FRAG,
      uniforms: { ...atmos.uniforms },
      side: THREE.BackSide,
      depthWrite: false,
    });
    const envDome = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), this.envMat);
    this.envScene.add(envDome);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
  }

  setCloudSteps(n: number): void {
    this.cloudMat.uniforms.uCloudSteps.value = n;
  }

  /** Re-render the environment map (IBL for every PBR material). Cheap enough to call every few frames. */
  updateEnvironment(): THREE.Texture {
    // dispose the whole previous render target (disposing only its texture leaked the framebuffer/renderbuffer)
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem!.fromScene(this.envScene, 0, 0.1, 200);
    this.envMap = this.envRT.texture;
    return this.envMap;
  }

  /** Bake the macro coverage field around the camera's cloud-space position when it has drifted too far. */
  private updateCoverage(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera): void {
    const wind = this.atmos.uniforms.uCloudWind.value as THREE.Vector2;
    const cx = camera.position.x + wind.x, cz = camera.position.z + wind.y;
    if (this.covBaked && Math.hypot(cx - this.covCenter.x, cz - this.covCenter.y) < COV_REBAKE_DIST) return;
    this.covCenter.set(cx, cz);
    this.covBaked = true;
    this.quad.material = this.covMat;
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(this.covRT);
    renderer.render(this.quadScene, this.quadCam);
    renderer.setRenderTarget(prev);
    this.quad.material = this.cloudMat;
  }

  /** Render the cloud layer into the offscreen buffer for this camera; the dome composites it at full resolution. */
  render(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, width: number, height: number): void {
    const w = Math.max(2, Math.round(width * this.scale)), h = Math.max(2, Math.round(height * this.scale));
    if (this.cloudRT.width !== w || this.cloudRT.height !== h) this.cloudRT.setSize(w, h);
    this.updateCoverage(renderer, camera);
    const u = this.cloudMat.uniforms;
    u.uCamPos.value.copy(camera.position);
    u.uInvProj.value.copy(camera.projectionMatrixInverse);
    u.uInvView.value.copy(camera.matrixWorld);
    const d = this.domeMat.uniforms;
    d.uResolution.value.set(width, height);
    d.uCloudTexel.value.set(1 / w, 1 / h);
    d.uInvProj.value.copy(camera.projectionMatrixInverse);
    d.uInvView.value.copy(camera.matrixWorld);
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(this.cloudRT);
    renderer.render(this.quadScene, this.quadCam);
    renderer.setRenderTarget(prev);
    // keep the dome centred on the camera, far enough to sit behind everything
    this.dome.position.copy(camera.position);
    this.dome.scale.setScalar(camera.far * 0.9);
  }
}
