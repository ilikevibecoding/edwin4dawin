import * as THREE from 'three';
import type { Atmosphere } from '../world/atmosphere';
import { GLSL_AERIAL, GLSL_ATMOS_UNIFORMS, GLSL_CLOUD_FIELD, GLSL_NOISE, GLSL_SKY } from './shaders/common.glsl';

const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/** Aerial perspective + cloud shadows, applied in screen space using the depth buffer. */
const AERIAL_FRAG = /* glsl */ `
${GLSL_ATMOS_UNIFORMS}
${GLSL_NOISE}
${GLSL_CLOUD_FIELD}
${GLSL_SKY}
${GLSL_AERIAL}
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform mat4 uInvProj;
uniform mat4 uInvView;
uniform vec3 uCamPos;
uniform float uLogDepthFC;
uniform float uCloudShadowStrength;
uniform vec2 uTexel;
varying vec2 vUv;
float geomDepth(vec2 uv) { float d = texture2D(tDepth, uv).r; return d < 0.99999 ? d : 0.0; }
void main() {
  vec4 c = texture2D(tColor, vUv);
  float depth = texture2D(tDepth, vUv).r;
  bool seam = false;
  if (depth >= 0.99999) {
    // The horizon row: MSAA resolves those pixels to a mix of the dome and the *unhazed* far water (the haze is
    // applied here from the resolved depth, which took the dome's sample), leaving a one-pixel dark seam along
    // the whole horizon at any altitude (sky 202, seam 161-190, water 178 at 30 m). Haze the pixel by its
    // farthest geometry neighbour instead: the dome is skyRadiance in this direction, and hazing a mix of the
    // dome and the water by the water's distance gives exactly the mix of the dome and the hazed water (the
    // in-scatter is that same skyRadiance), so the row lands between the sky and the water it straddles.
    // Sky pixels next to near geometry (airframe, towers) pick up a haze of well under 1 % from this.
    float dn = max(max(geomDepth(vUv + vec2(uTexel.x, 0.0)), geomDepth(vUv - vec2(uTexel.x, 0.0))),
                   max(geomDepth(vUv + vec2(0.0, uTexel.y)), geomDepth(vUv - vec2(0.0, uTexel.y))));
    if (dn == 0.0) { gl_FragColor = c; return; }
    depth = dn;
    seam = true;
  }
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 vdir4 = uInvProj * vec4(ndc, 1.0, 1.0);
  vec3 vdir = vdir4.xyz / vdir4.w;
  vdir /= -vdir.z;
  float w = exp2(depth * 2.0 / uLogDepthFC) - 1.0;
  vec3 vpos = vdir * w;
  vec3 wp = (uInvView * vec4(vpos, 1.0)).xyz;
  vec3 col = c.rgb;
  if (!seam) {
    // Clouds shade the ground: under the cloud's footprint the direct beam is gone (a cumulus is optically thick)
    // and only the direct-sun share of the light is removed (uSunShare, atmosphere.ts); the sky's share stays.
    // cloudShadow() returns 1 - 0.72 * footprint (its own cap from when it was the whole shadow factor), so the
    // footprint is read back out of it here: with the cap left in, a cloud at noon removed 0.72 * 0.86 = 62 % of
    // the light while the building next to it removed 86 %, and under the cloudy preset (sun already dimmed to
    // 0.3 by the preset, shadow share 0.38) a cloud took 27 %: no shadow pattern at all under a deck.
    float cov = clamp((1.0 - cloudShadow(wp)) / 0.72, 0.0, 1.0);
    col *= 1.0 - cov * uSunShare * uCloudShadowStrength;
  }
  col = applyAerial(col, uCamPos, wp);
  gl_FragColor = vec4(col, 1.0);
}
`;

const BRIGHT_FRAG = /* glsl */ `
uniform sampler2D tColor;
uniform float uThreshold;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tColor, vUv).rgb;
  float l = max(max(c.r, c.g), c.b);
  float k = max(l - uThreshold, 0.0);
  k = k / (1.0 + k);
  gl_FragColor = vec4(c * (k / max(l, 1e-4)), 1.0);
}
`;

const BLUR_FRAG = /* glsl */ `
uniform sampler2D tColor;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec3 s = texture2D(tColor, vUv).rgb * 0.227;
  s += (texture2D(tColor, vUv + uDir * 1.385).rgb + texture2D(tColor, vUv - uDir * 1.385).rgb) * 0.316;
  s += (texture2D(tColor, vUv + uDir * 3.231).rgb + texture2D(tColor, vUv - uDir * 3.231).rgb) * 0.070;
  gl_FragColor = vec4(s, 1.0);
}
`;

const COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tBloom0;
uniform sampler2D tBloom1;
uniform sampler2D tBloom2;
uniform float uBloom;
uniform float uExposure;
uniform float uSaturation;
uniform float uVignette;
uniform vec3 uLift;
uniform vec3 uGain;
uniform vec2 uResolution;
uniform float uGrain;
uniform float uTime;
varying vec2 vUv;
vec3 aces(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  vec3 c = texture2D(tColor, vUv).rgb;
  vec3 bloom = texture2D(tBloom0, vUv).rgb * 0.5 + texture2D(tBloom1, vUv).rgb * 0.3 + texture2D(tBloom2, vUv).rgb * 0.25;
  c += bloom * uBloom;
  c *= uExposure;
  // grade: subtle lift/gain (teal shadows, warm highlights)
  c = c * uGain + uLift * (1.0 - smoothstep(0.0, 0.6, c));
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSaturation);
  // gentle contrast around mid grey
  c = mix(c, c * c * (3.0 - 2.0 * min(c, vec3(1.0))), 0.18);
  c = aces(c);
  vec2 q = vUv - 0.5;
  float vig = 1.0 - uVignette * smoothstep(0.35, 0.95, length(q) * 1.35);
  c *= vig;
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  // dither against 8-bit banding in the sky gradients: one display level of triangular noise, applied after
  // the gamma so it is the same size in the darks as in the highlights (in linear light it was a ten-level
  // grain over the night sea), and a fixed pattern (a re-rolled one read as film grain in the dark frames)
  float dn = hash(gl_FragCoord.xy) + hash(gl_FragCoord.yx + 17.3) - 1.0;
  c += dn * uGrain;
  gl_FragColor = vec4(c, 1.0);
}
`;

export interface PostOptions { samples: number; bloom: boolean; }

export class PostPipeline {
  private sceneRT: THREE.WebGLRenderTarget;
  private fogRT: THREE.WebGLRenderTarget;
  private bloomRTs: THREE.WebGLRenderTarget[] = [];
  private bloomTmp: THREE.WebGLRenderTarget[] = [];
  private readonly quad: THREE.Mesh;
  private readonly quadScene = new THREE.Scene();
  private readonly quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly aerialMat: THREE.ShaderMaterial;
  private readonly brightMat: THREE.ShaderMaterial;
  private readonly blurMat: THREE.ShaderMaterial;
  private readonly compositeMat: THREE.ShaderMaterial;
  width = 1;
  height = 1;
  exposure = 1.0;
  cloudShadowStrength = 1.0;

  constructor(private renderer: THREE.WebGLRenderer, atmos: Atmosphere, private opts: PostOptions) {
    const depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: opts.samples, depthTexture, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.fogRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    for (let i = 0; i < 3; i++) {
      this.bloomRTs.push(new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }));
      this.bloomTmp.push(new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }));
    }
    this.aerialMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: AERIAL_FRAG,
      uniforms: {
        ...atmos.uniforms,
        tColor: { value: null },
        tDepth: { value: null },
        uInvProj: { value: new THREE.Matrix4() },
        uInvView: { value: new THREE.Matrix4() },
        uCamPos: { value: new THREE.Vector3() },
        uLogDepthFC: { value: 1 },
        uCloudShadowStrength: { value: 1 },
        uTexel: { value: new THREE.Vector2(1 / 1280, 1 / 720) },
      },
      depthTest: false,
      depthWrite: false,
    });
    // threshold sits above sunlit white (~1.3) so only glitter, lights and cloud tops bloom: no veil over the blue sky
    this.brightMat = new THREE.ShaderMaterial({ vertexShader: FULLSCREEN_VERT, fragmentShader: BRIGHT_FRAG, uniforms: { tColor: { value: null }, uThreshold: { value: 1.5 } }, depthTest: false, depthWrite: false });
    this.blurMat = new THREE.ShaderMaterial({ vertexShader: FULLSCREEN_VERT, fragmentShader: BLUR_FRAG, uniforms: { tColor: { value: null }, uDir: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false });
    this.compositeMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: COMPOSITE_FRAG,
      uniforms: {
        tColor: { value: null }, tBloom0: { value: null }, tBloom1: { value: null }, tBloom2: { value: null },
        uBloom: { value: 0.2 }, uExposure: { value: 0.92 }, uSaturation: { value: 1.16 }, uVignette: { value: 0.25 },
        uLift: { value: new THREE.Vector3(0.0, 0.002, 0.004) }, uGain: { value: new THREE.Vector3(1.03, 1.0, 0.97) },
        uResolution: { value: new THREE.Vector2(1, 1) }, uGrain: { value: 1 / 255 }, uTime: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.aerialMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }

  setSize(w: number, h: number): void {
    this.width = w; this.height = h;
    this.sceneRT.setSize(w, h);
    this.fogRT.setSize(w, h);
    for (let i = 0; i < 3; i++) {
      const s = 2 ** (i + 1);
      this.bloomRTs[i].setSize(Math.max(1, Math.round(w / s)), Math.max(1, Math.round(h / s)));
      this.bloomTmp[i].setSize(Math.max(1, Math.round(w / s)), Math.max(1, Math.round(h / s)));
    }
    this.compositeMat.uniforms.uResolution.value.set(w, h);
    this.aerialMat.uniforms.uTexel.value.set(1 / w, 1 / h);
  }

  get target(): THREE.WebGLRenderTarget { return this.sceneRT; }

  private blit(mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null): void {
    this.quad.material = mat;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCam);
  }

  /** Runs after the scene has been rendered into `target`. */
  finish(camera: THREE.PerspectiveCamera, time: number): void {
    const r = this.renderer;
    const a = this.aerialMat.uniforms;
    a.tColor.value = this.sceneRT.texture;
    a.tDepth.value = this.sceneRT.depthTexture;
    a.uInvProj.value.copy(camera.projectionMatrixInverse);
    a.uInvView.value.copy(camera.matrixWorld);
    a.uCamPos.value.copy(camera.position);
    a.uLogDepthFC.value = 2.0 / (Math.log(camera.far + 1.0) / Math.LN2);
    a.uCloudShadowStrength.value = this.cloudShadowStrength;
    // shared atmosphere uniform: the sea and far terrain dissolve into the sky over the last 45 % of the view
    // distance, so the far-plane cut never shows against the dome's horizon
    (a.uFarDissolve.value as THREE.Vector2).set(camera.far * 0.55, 1 / (camera.far * 0.4));
    this.blit(this.aerialMat, this.fogRT);

    // night exposure boost: x3.5 keeps 22:00 reading as night (x6 read as blue hour) while city lights stay bright
    const gain = 1 + 2.5 * (this.aerialMat.uniforms.uNight.value as number);
    if (this.opts.bloom) {
      // The threshold is a display level (above sunlit white, ~1.3 at the day exposure), so it follows the
      // night gain: at x3.5 a lamp of radiance 0.6 is already white on screen but sat under the fixed 1.5, and
      // the nav lights and lamps got no glare at all at 22:00 (their sprites read as flat 40 px discs).
      this.brightMat.uniforms.uThreshold.value = 1.5 / gain;
      this.brightMat.uniforms.tColor.value = this.fogRT.texture;
      this.blit(this.brightMat, this.bloomRTs[0]);
      for (let i = 0; i < 3; i++) {
        const rt = this.bloomRTs[i], tmp = this.bloomTmp[i];
        const w = rt.width, h = rt.height;
        if (i > 0) {
          // downsample the previous level into this one first
          this.blurMat.uniforms.tColor.value = this.bloomRTs[i - 1].texture;
          this.blurMat.uniforms.uDir.value.set(0.5 / w, 0.5 / h);
          this.blit(this.blurMat, rt);
        }
        this.blurMat.uniforms.tColor.value = rt.texture;
        this.blurMat.uniforms.uDir.value.set(1 / w, 0);
        this.blit(this.blurMat, tmp);
        this.blurMat.uniforms.tColor.value = tmp.texture;
        this.blurMat.uniforms.uDir.value.set(0, 1 / h);
        this.blit(this.blurMat, rt);
      }
    }
    const c = this.compositeMat.uniforms;
    c.tColor.value = this.fogRT.texture;
    c.tBloom0.value = this.bloomRTs[0].texture;
    c.tBloom1.value = this.bloomRTs[1].texture;
    c.tBloom2.value = this.bloomRTs[2].texture;
    c.uBloom.value = this.opts.bloom ? 0.18 : 0.0;
    c.uExposure.value = this.exposure * gain;
    c.uTime.value = time;
    this.blit(this.compositeMat, null);
    r.setRenderTarget(null);
  }
}
