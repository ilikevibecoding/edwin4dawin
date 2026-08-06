import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { T } from './Textures';
import { clamp, damp } from './math';

export type Quality = 'cinema' | 'high' | 'balanced' | 'fast';

export interface PostParams {
  /** Artistic bias applied on top of the measured auto exposure. */
  exposure: number;
  bloomStrength: number;
  bloomThreshold: number;
  bloomKnee: number;
  anamorphic: number;
  aoStrength: number;
  aoRadius: number;
  focusDistance: number;
  /** Bokeh radius in pixels at maximum circle of confusion. */
  aperture: number;
  focalRange: number;
  grain: number;
  aberration: number;
  vignette: number;
  contrast: number;
  saturation: number;
  lift: THREE.Color;
  gain: THREE.Color;
  rain: number;
  glitch: number;
  deviancy: number;
  fadeToBlack: number;
  whiteFlash: number;
  scanPulse: number;
}

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const DEPTH_UTIL = /* glsl */ `
uniform float uNear;
uniform float uFar;
uniform mat4 uProjInv;
float rawDepth(sampler2D d, vec2 uv) { return texture2D(d, uv).x; }
float linearDepth(float raw) {
  float z = raw * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear));
}
vec3 viewPos(vec2 uv, float raw) {
  vec4 clip = vec4(uv * 2.0 - 1.0, raw * 2.0 - 1.0, 1.0);
  vec4 v = uProjInv * clip;
  return v.xyz / v.w;
}`;

/**
 * HDR post-processing chain: SSAO -> bloom (mip pyramid) -> anamorphic streak ->
 * depth of field -> filmic grade. Written as discrete passes so quality tiers can
 * skip stages entirely on weak hardware.
 */
export class PostStack {
  readonly params: PostParams = {
    exposure: 1.0,
    bloomStrength: 0.5,
    bloomThreshold: 0.95,
    bloomKnee: 0.55,
    anamorphic: 0.35,
    aoStrength: 0.6,
    aoRadius: 0.34,
    focusDistance: 6,
    aperture: 10,
    focalRange: 4.0,
    grain: 0.04,
    aberration: 0.5,
    vignette: 0.55,
    contrast: 1.06,
    saturation: 1.04,
    lift: new THREE.Color(0.012, 0.02, 0.036),
    gain: new THREE.Color(1.02, 1.0, 1.0),
    rain: 0.35,
    glitch: 0,
    deviancy: 0,
    fadeToBlack: 0,
    whiteFlash: 0,
    scanPulse: 0,
  };

  quality: Quality;
  sceneRT!: THREE.WebGLRenderTarget;
  private aoRT!: THREE.WebGLRenderTarget;
  private aoBlurRT!: THREE.WebGLRenderTarget;
  private dofRT!: THREE.WebGLRenderTarget;
  private streakRT!: THREE.WebGLRenderTarget;
  private mips: THREE.WebGLRenderTarget[] = [];
  private quad = new FullScreenQuad();
  private width = 1;
  private height = 1;
  private time = 0;
  private smoothFocus = 6;
  /** Auto exposure state (scene-referred key luminance -> scale). */
  autoExposure = true;
  private measuredKey = 0.16;
  private exposureScale = 1;
  private probeCountdown = 0;
  private probeInterval = 3;
  private snapNext = true;
  lastKey = 0.16;

  private matAO: THREE.ShaderMaterial;
  private matAOBlur: THREE.ShaderMaterial;
  private matDown: THREE.ShaderMaterial;
  private matUp: THREE.ShaderMaterial;
  private matStreak: THREE.ShaderMaterial;
  private matDof: THREE.ShaderMaterial;
  private matComposite: THREE.ShaderMaterial;

  constructor(private renderer: THREE.WebGLRenderer, quality: Quality = 'high') {
    this.quality = quality;
    const noise = T.noise();
    noise.wrapS = noise.wrapT = THREE.RepeatWrapping;
    const drops = T.droplets();
    drops.wrapS = drops.wrapT = THREE.RepeatWrapping;

    this.matAO = new THREE.ShaderMaterial({
      uniforms: {
        tDepth: { value: null },
        uNear: { value: 0.1 },
        uFar: { value: 200 },
        uProjInv: { value: new THREE.Matrix4() },
        uProj: { value: new THREE.Matrix4() },
        uRadius: { value: 0.55 },
        uTexel: { value: new THREE.Vector2() },
        uTime: { value: 0 },
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tDepth;
        uniform mat4 uProj;
        uniform float uRadius;
        uniform vec2 uTexel;
        uniform float uTime;
        ${DEPTH_UTIL}
        #ifndef AO_SAMPLES
        #define AO_SAMPLES 12
        #endif
        float hash(vec2 p) { return fract(sin(dot(p, vec2(41.13, 289.7))) * 43758.5453); }
        void main() {
          float raw = rawDepth(tDepth, vUv);
          if (raw >= 0.99999) { gl_FragColor = vec4(1.0); return; }
          vec3 P = viewPos(vUv, raw);
          // Reconstruct a normal from depth so no extra geometry pass is needed.
          vec3 Px = viewPos(vUv + vec2(uTexel.x, 0.0), rawDepth(tDepth, vUv + vec2(uTexel.x, 0.0)));
          vec3 Py = viewPos(vUv + vec2(0.0, uTexel.y), rawDepth(tDepth, vUv + vec2(0.0, uTexel.y)));
          vec3 N = normalize(cross(Px - P, Py - P));
          if (dot(N, -normalize(P)) < 0.0) N = -N;
          float ao = 0.0;
          float ang = hash(vUv * 1024.0) * 6.2831853;
          float radius = uRadius;
          const float GOLDEN = 2.39996323;
          for (int i = 0; i < AO_SAMPLES; i++) {
            float fi = (float(i) + 0.5) / float(AO_SAMPLES);
            float a = ang + float(i) * GOLDEN;
            float r = sqrt(fi) * radius;
            vec3 dir = vec3(cos(a), sin(a), 0.0);
            vec3 sp = P + (dir + N * 0.55) * r;
            vec4 cp = uProj * vec4(sp, 1.0);
            vec2 suv = (cp.xy / cp.w) * 0.5 + 0.5;
            if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;
            float sraw = rawDepth(tDepth, suv);
            vec3 sPos = viewPos(suv, sraw);
            vec3 v = sPos - P;
            float dist = length(v);
            float occ = max(0.0, dot(N, v / max(dist, 1e-4)) - 0.06);
            ao += occ * (radius / (radius + dist * dist * 1.4));
          }
          ao = clamp(1.0 - ao * (2.6 / float(AO_SAMPLES)), 0.0, 1.0);
          gl_FragColor = vec4(ao, linearDepth(raw), 0.0, 1.0);
        }`,
    });

    this.matAOBlur = new THREE.ShaderMaterial({
      uniforms: { tAO: { value: null }, uTexel: { value: new THREE.Vector2() }, uDir: { value: new THREE.Vector2(1, 0) } },
      vertexShader: VERT,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tAO;
        uniform vec2 uTexel;
        uniform vec2 uDir;
        void main() {
          vec2 step = uDir * uTexel;
          vec2 center = texture2D(tAO, vUv).xy;
          float sum = center.x;
          float wsum = 1.0;
          for (int i = 1; i <= 4; i++) {
            float fi = float(i);
            for (int s = 0; s < 2; s++) {
              vec2 uv = vUv + step * fi * (s == 0 ? 1.0 : -1.0);
              vec2 t = texture2D(tAO, uv).xy;
              float w = exp(-fi * fi * 0.12) * exp(-abs(t.y - center.y) * 2.2);
              sum += t.x * w;
              wsum += w;
            }
          }
          gl_FragColor = vec4(sum / wsum, center.y, 0.0, 1.0);
        }`,
    });

    this.matDown = new THREE.ShaderMaterial({
      uniforms: {
        tSrc: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uThreshold: { value: 0.9 },
        uKnee: { value: 0.5 },
        uPrefilter: { value: 0 },
        uExposure: { value: 1 },
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tSrc;
        uniform vec2 uTexel;
        uniform float uThreshold;
        uniform float uKnee;
        uniform float uPrefilter;
        uniform float uExposure;
        vec3 fetch(vec2 uv) { return texture2D(tSrc, uv).rgb; }
        void main() {
          vec2 t = uTexel;
          // 13-tap partial Karis box: stable, flicker-free downsample.
          vec3 a = fetch(vUv + t * vec2(-2.0, 2.0));
          vec3 b = fetch(vUv + t * vec2(0.0, 2.0));
          vec3 c = fetch(vUv + t * vec2(2.0, 2.0));
          vec3 d = fetch(vUv + t * vec2(-2.0, 0.0));
          vec3 e = fetch(vUv);
          vec3 f = fetch(vUv + t * vec2(2.0, 0.0));
          vec3 g = fetch(vUv + t * vec2(-2.0, -2.0));
          vec3 h = fetch(vUv + t * vec2(0.0, -2.0));
          vec3 i = fetch(vUv + t * vec2(2.0, -2.0));
          vec3 j = fetch(vUv + t * vec2(-1.0, 1.0));
          vec3 k = fetch(vUv + t * vec2(1.0, 1.0));
          vec3 l = fetch(vUv + t * vec2(-1.0, -1.0));
          vec3 m = fetch(vUv + t * vec2(1.0, -1.0));
          vec3 col = e * 0.125;
          col += (a + c + g + i) * 0.03125;
          col += (b + d + f + h) * 0.0625;
          col += (j + k + l + m) * 0.125;
          if (uPrefilter > 0.5) {
            col *= uExposure;
            float br = max(col.r, max(col.g, col.b));
            float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
            soft = soft * soft / (4.0 * uKnee + 1e-4);
            float contrib = max(soft, br - uThreshold) / max(br, 1e-4);
            col *= contrib;
          }
          gl_FragColor = vec4(col, 1.0);
        }`,
    });

    this.matUp = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uScale: { value: 1 } },
      vertexShader: VERT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tSrc;
        uniform vec2 uTexel;
        uniform float uScale;
        void main() {
          vec2 t = uTexel * 1.0;
          vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
          c += texture2D(tSrc, vUv + vec2(-t.x, 0.0)).rgb * 2.0;
          c += texture2D(tSrc, vUv + vec2(t.x, 0.0)).rgb * 2.0;
          c += texture2D(tSrc, vUv + vec2(0.0, -t.y)).rgb * 2.0;
          c += texture2D(tSrc, vUv + vec2(0.0, t.y)).rgb * 2.0;
          c += texture2D(tSrc, vUv + vec2(-t.x, -t.y)).rgb;
          c += texture2D(tSrc, vUv + vec2(t.x, -t.y)).rgb;
          c += texture2D(tSrc, vUv + vec2(-t.x, t.y)).rgb;
          c += texture2D(tSrc, vUv + vec2(t.x, t.y)).rgb;
          gl_FragColor = vec4(c / 16.0 * uScale, 1.0);
        }`,
    });

    this.matStreak = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } },
      vertexShader: VERT,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tSrc;
        uniform vec2 uTexel;
        void main() {
          // Wide horizontal gather - fake anamorphic flare on bright neon.
          vec3 sum = vec3(0.0);
          float wsum = 0.0;
          for (int i = -12; i <= 12; i++) {
            float fi = float(i);
            float w = exp(-fi * fi / 42.0);
            sum += texture2D(tSrc, vUv + vec2(uTexel.x * fi * 3.0, 0.0)).rgb * w;
            wsum += w;
          }
          gl_FragColor = vec4(sum / wsum, 1.0);
        }`,
    });

    this.matDof = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tDepth: { value: null },
        uNear: { value: 0.1 },
        uFar: { value: 200 },
        uProjInv: { value: new THREE.Matrix4() },
        uFocus: { value: 6 },
        uAperture: { value: 12 },
        uRange: { value: 1.2 },
        uTexel: { value: new THREE.Vector2() },
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tScene;
        uniform sampler2D tDepth;
        uniform float uFocus;
        uniform float uAperture;
        uniform float uRange;
        uniform vec2 uTexel;
        ${DEPTH_UTIL}
        #ifndef DOF_SAMPLES
        #define DOF_SAMPLES 22
        #endif
        float coc(float d) {
          float sign = d - uFocus;
          float amt = abs(sign) / max(uRange, 0.001);
          // Foreground blur ramps faster than background, like a fast prime lens.
          amt *= sign < 0.0 ? 1.5 : 1.0;
          return clamp(amt, 0.0, 1.0);
        }
        void main() {
          float centerD = linearDepth(rawDepth(tDepth, vUv));
          float centerC = coc(centerD);
          vec3 sum = texture2D(tScene, vUv).rgb;
          float wsum = 1.0;
          const float GOLDEN = 2.39996323;
          for (int i = 0; i < DOF_SAMPLES; i++) {
            float fi = (float(i) + 0.5) / float(DOF_SAMPLES);
            float a = float(i) * GOLDEN;
            float r = sqrt(fi);
            vec2 off = vec2(cos(a), sin(a)) * r * uAperture * uTexel;
            vec2 uv = vUv + off;
            vec3 c = texture2D(tScene, uv).rgb;
            float d = linearDepth(rawDepth(tDepth, uv));
            float sc = coc(d);
            // Only let samples bleed in if they are themselves blurry (or we are).
            float w = max(centerC, sc * (d < centerD ? 1.0 : 0.35));
            w *= 1.0 - smoothstep(sc * 1.05 + 0.05, sc * 1.05 + 0.35, r * centerC * 0.0 + r);
            w = max(w, 0.0);
            sum += c * w;
            wsum += w;
          }
          gl_FragColor = vec4(sum / wsum, centerC);
        }`,
    });

    this.matComposite = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tDof: { value: null },
        tBloom: { value: null },
        tStreak: { value: null },
        tAO: { value: null },
        tDepth: { value: null },
        tNoise: { value: noise },
        tDrops: { value: drops },
        uNear: { value: 0.1 },
        uFar: { value: 200 },
        uProjInv: { value: new THREE.Matrix4() },
        uResolution: { value: new THREE.Vector2() },
        uTime: { value: 0 },
        uExposure: { value: 1 },
        uBloom: { value: 0.6 },
        uStreak: { value: 0.35 },
        uAO: { value: 0.8 },
        uGrain: { value: 0.05 },
        uAberration: { value: 0.5 },
        uVignette: { value: 0.5 },
        uContrast: { value: 1.05 },
        uSaturation: { value: 1.05 },
        uLift: { value: new THREE.Color() },
        uGain: { value: new THREE.Color(1, 1, 1) },
        uRain: { value: 0.35 },
        uGlitch: { value: 0 },
        uDeviancy: { value: 0 },
        uFade: { value: 0 },
        uFlash: { value: 0 },
        uScanPulse: { value: 0 },
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tScene;
        uniform sampler2D tDof;
        uniform sampler2D tBloom;
        uniform sampler2D tStreak;
        uniform sampler2D tAO;
        uniform sampler2D tDepth;
        uniform sampler2D tNoise;
        uniform sampler2D tDrops;
        uniform vec2 uResolution;
        uniform float uTime, uExposure, uBloom, uStreak, uAO, uGrain, uAberration;
        uniform float uVignette, uContrast, uSaturation, uRain, uGlitch, uDeviancy, uFade, uFlash, uScanPulse;
        uniform vec3 uLift, uGain;
        ${DEPTH_UTIL}

        // ACES filmic approximation (Stephen Hill's fit).
        const mat3 ACESInput = mat3(
          0.59719, 0.07600, 0.02840,
          0.35458, 0.90834, 0.13383,
          0.04823, 0.01566, 0.83777);
        const mat3 ACESOutput = mat3(
          1.60475, -0.10208, -0.00327,
          -0.53108, 1.10813, -0.07276,
          -0.07367, -0.00605, 1.07602);
        vec3 RRTAndODTFit(vec3 v) {
          vec3 a = v * (v + 0.0245786) - 0.000090537;
          vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
          return a / b;
        }
        vec3 aces(vec3 c) {
          c = ACESInput * c;
          c = RRTAndODTFit(c);
          return clamp(ACESOutput * c, 0.0, 1.0);
        }
        vec3 toSRGB(vec3 c) {
          return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0031308)), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
        }
        float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

        void main() {
          vec2 uv = vUv;
          vec2 centered = uv - 0.5;
          float r2 = dot(centered, centered);

          // Slight barrel distortion sells the anamorphic lens.
          uv = 0.5 + centered * (1.0 + r2 * 0.012 * uAberration);

          // Rain on the lens: refractive droplets that drift downward.
          if (uRain > 0.001) {
            vec2 duv = uv * vec2(1.0, 0.62) + vec2(0.0, uTime * 0.014);
            vec4 dr = texture2D(tDrops, duv);
            float mask = smoothstep(0.25, 0.95, dr.b) * uRain;
            uv += (dr.xy - 0.5) * 0.014 * mask;
          }

          if (uGlitch > 0.001) {
            float band = floor(uv.y * 90.0);
            float n = texture2D(tNoise, vec2(band * 0.037, uTime * 0.7)).r;
            uv.x += (n - 0.5) * 0.06 * uGlitch * step(0.72, n);
          }

          // Chromatic aberration grows toward the frame edge.
          float ca = uAberration * (0.0016 + r2 * 0.006);
          vec2 dir = normalize(centered + 1e-6);
          vec3 col;
          col.r = texture2D(tScene, uv + dir * ca).r;
          col.g = texture2D(tScene, uv).g;
          col.b = texture2D(tScene, uv - dir * ca).b;
          col *= uExposure;

          #ifdef USE_DOF
            vec4 dof = texture2D(tDof, uv);
            col = mix(col, dof.rgb * uExposure, smoothstep(0.02, 0.35, dof.a));
          #endif

          #ifdef USE_AO
            float ao = texture2D(tAO, uv).r;
            ao = mix(1.0, ao, uAO);
            // Tint the occlusion slightly cool, as if losing bounced skylight.
            col *= mix(vec3(ao), vec3(ao * 0.97, ao * 0.99, ao * 1.03), 0.5);
          #endif

          vec3 bloom = texture2D(tBloom, uv).rgb;
          col += bloom * uBloom;
          vec3 streak = texture2D(tStreak, uv).rgb;
          col += streak * uStreak * vec3(0.55, 0.78, 1.25);

          // Deviancy: creeping red pressure at the edge of vision.
          if (uDeviancy > 0.001) {
            float edge = smoothstep(0.06, 0.42, r2);
            col = mix(col, col * vec3(1.5, 0.28, 0.28), edge * uDeviancy * 0.85);
            col += vec3(0.16, 0.0, 0.0) * uDeviancy * edge;
          }

          col = aces(col);

          // Grade: lift/gain, contrast around 0.5, saturation, cool-shadow split tone.
          col = col * uGain + uLift * (1.0 - col);
          col = (col - 0.5) * uContrast + 0.5;
          float l = luma(col);
          col = mix(vec3(l), col, uSaturation);
          col = mix(col, col * vec3(0.86, 0.97, 1.12), (1.0 - smoothstep(0.0, 0.45, l)) * 0.5);
          col = mix(col, col * vec3(1.06, 1.0, 0.93), smoothstep(0.62, 1.0, l) * 0.35);

          // Droplet highlights catch the neon.
          if (uRain > 0.001) {
            vec4 dr = texture2D(tDrops, uv * vec2(1.0, 0.62) + vec2(0.0, uTime * 0.014));
            float spec = pow(smoothstep(0.55, 1.0, dr.b), 3.0) * uRain;
            col += spec * vec3(0.1, 0.16, 0.24);
          }

          // Analysis-mode sweep line.
          if (uScanPulse > 0.001) {
            float sweep = fract(uTime * 0.35);
            float d = abs(vUv.y - sweep);
            col += vec3(0.05, 0.35, 0.6) * uScanPulse * exp(-d * 90.0);
            col += vec3(0.02, 0.1, 0.16) * uScanPulse * step(fract(vUv.y * 220.0), 0.5) * 0.3;
          }

          float vig = smoothstep(0.95, 0.18, r2 * (1.5 + uVignette));
          col *= mix(1.0, vig, uVignette);

          // Film grain, slightly stronger in the shadows.
          vec3 grain = texture2D(tNoise, uv * uResolution / 256.0 + vec2(fract(uTime * 3.7), fract(uTime * 2.3))).rgb;
          col += (grain - 0.5) * uGrain * mix(0.85, 0.5, luma(col));

          col = mix(col, vec3(1.0), clamp(uFlash, 0.0, 1.0));
          col *= 1.0 - clamp(uFade, 0.0, 1.0);

          gl_FragColor = vec4(toSRGB(clamp(col, 0.0, 1.0)), 1.0);
        }`,
    });
  }

  setQuality(q: Quality) {
    if (q === this.quality) return;
    this.quality = q;
    this.setSize(this.width, this.height, true);
  }

  private get cfg() {
    switch (this.quality) {
      case 'cinema':
        return { ao: true, dof: true, aoScale: 1, dofScale: 1, aoSamples: 20, dofSamples: 34, mips: 6 };
      case 'high':
        return { ao: true, dof: true, aoScale: 0.5, dofScale: 0.5, aoSamples: 14, dofSamples: 24, mips: 5 };
      case 'balanced':
        return { ao: true, dof: true, aoScale: 0.34, dofScale: 0.5, aoSamples: 7, dofSamples: 10, mips: 4 };
      default:
        return { ao: false, dof: false, aoScale: 0.5, dofScale: 0.5, aoSamples: 6, dofSamples: 8, mips: 4 };
    }
  }

  setSize(width: number, height: number, force = false) {
    if (!force && width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    const cfg = this.cfg;

    this.sceneRT?.dispose();
    const depth = new THREE.DepthTexture(width, height, THREE.FloatType);
    this.sceneRT = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      depthTexture: depth,
      depthBuffer: true,
      stencilBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      samples: 0,
    });
    this.sceneRT.texture.colorSpace = THREE.NoColorSpace;

    const mk = (w: number, h: number) => {
      const rt = new THREE.WebGLRenderTarget(Math.max(1, Math.floor(w)), Math.max(1, Math.floor(h)), {
        type: THREE.HalfFloatType,
        depthBuffer: false,
        stencilBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      });
      rt.texture.colorSpace = THREE.NoColorSpace;
      rt.texture.wrapS = rt.texture.wrapT = THREE.ClampToEdgeWrapping;
      return rt;
    };

    this.aoRT?.dispose();
    this.aoBlurRT?.dispose();
    this.aoRT = mk(width * cfg.aoScale, height * cfg.aoScale);
    this.aoBlurRT = mk(width * cfg.aoScale, height * cfg.aoScale);

    this.dofRT?.dispose();
    this.dofRT = mk(width * cfg.dofScale, height * cfg.dofScale);

    this.mips.forEach((m) => m.dispose());
    this.mips = [];
    for (let i = 0; i < cfg.mips; i++) {
      const s = Math.pow(2, i + 1);
      this.mips.push(mk(width / s, height / s));
    }
    this.streakRT?.dispose();
    this.streakRT = mk(width / 4, height / 4);

    this.matAO.defines = { AO_SAMPLES: cfg.aoSamples };
    this.matAO.needsUpdate = true;
    this.matDof.defines = { DOF_SAMPLES: cfg.dofSamples };
    this.matDof.needsUpdate = true;
    this.matComposite.defines = {
      ...(cfg.ao ? { USE_AO: '' } : {}),
      ...(cfg.dof ? { USE_DOF: '' } : {}),
    };
    this.matComposite.needsUpdate = true;
  }

  /** Smoothly track a focus target so rack-focus reads naturally. */
  updateFocus(target: number, dt: number, snap = false) {
    this.smoothFocus = snap ? target : damp(this.smoothFocus, target, 6.5, dt);
    this.params.focusDistance = this.smoothFocus;
  }

  private blit(material: THREE.Material, target: THREE.WebGLRenderTarget | null, clear = true) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    if (clear) this.renderer.clear(true, false, false);
    this.quad.render(this.renderer);
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, dt: number) {
    const r = this.renderer;
    const p = this.params;
    const cfg = this.cfg;
    this.time += dt;

    r.setRenderTarget(this.sceneRT);
    r.clear();
    r.render(scene, camera);

    const projInv = camera.projectionMatrixInverse;

    if (cfg.ao && p.aoStrength > 0.001) {
      const u = this.matAO.uniforms;
      u.tDepth.value = this.sceneRT.depthTexture;
      u.uNear.value = camera.near;
      u.uFar.value = camera.far;
      u.uProjInv.value = projInv;
      u.uProj.value = camera.projectionMatrix;
      u.uRadius.value = p.aoRadius;
      u.uTexel.value.set(1 / this.aoRT.width, 1 / this.aoRT.height);
      u.uTime.value = this.time;
      this.blit(this.matAO, this.aoRT);

      const b = this.matAOBlur.uniforms;
      b.tAO.value = this.aoRT.texture;
      b.uTexel.value.set(1 / this.aoRT.width, 1 / this.aoRT.height);
      b.uDir.value.set(1, 0);
      this.blit(this.matAOBlur, this.aoBlurRT);
      b.tAO.value = this.aoBlurRT.texture;
      b.uDir.value.set(0, 1);
      this.blit(this.matAOBlur, this.aoRT);
    }

    // Bloom pyramid: prefiltered downsample chain then additive tent upsample.
    let src: THREE.Texture = this.sceneRT.texture;
    let srcW = this.width;
    let srcH = this.height;
    for (let i = 0; i < this.mips.length; i++) {
      const u = this.matDown.uniforms;
      u.tSrc.value = src;
      u.uTexel.value.set(1 / srcW, 1 / srcH);
      u.uThreshold.value = p.bloomThreshold;
      u.uKnee.value = p.bloomKnee;
      u.uExposure.value = this.exposure;
      u.uPrefilter.value = i === 0 ? 1 : 0;
      this.blit(this.matDown, this.mips[i]);
      src = this.mips[i].texture;
      srcW = this.mips[i].width;
      srcH = this.mips[i].height;
    }
    for (let i = this.mips.length - 1; i > 0; i--) {
      const u = this.matUp.uniforms;
      u.tSrc.value = this.mips[i].texture;
      u.uTexel.value.set(1 / this.mips[i].width, 1 / this.mips[i].height);
      u.uScale.value = 0.78;
      this.blit(this.matUp, this.mips[i - 1], false);
    }

    if (p.anamorphic > 0.001) {
      const u = this.matStreak.uniforms;
      const source = this.mips[Math.min(1, this.mips.length - 1)];
      u.tSrc.value = source.texture;
      u.uTexel.value.set(1 / source.width, 1 / source.height);
      this.blit(this.matStreak, this.streakRT);
    }

    if (cfg.dof && p.aperture > 0.01) {
      const u = this.matDof.uniforms;
      u.tScene.value = this.sceneRT.texture;
      u.tDepth.value = this.sceneRT.depthTexture;
      u.uNear.value = camera.near;
      u.uFar.value = camera.far;
      u.uProjInv.value = projInv;
      u.uFocus.value = p.focusDistance;
      u.uAperture.value = p.aperture;
      u.uRange.value = p.focalRange;
      u.uTexel.value.set(1 / this.dofRT.width, 1 / this.dofRT.height);
      this.blit(this.matDof, this.dofRT);
    }

    this.updateExposure(dt);

    const u = this.matComposite.uniforms;
    u.tScene.value = this.sceneRT.texture;
    u.tDof.value = this.dofRT.texture;
    u.tBloom.value = this.mips[0].texture;
    u.tStreak.value = this.streakRT.texture;
    u.tAO.value = this.aoRT.texture;
    u.tDepth.value = this.sceneRT.depthTexture;
    u.uNear.value = camera.near;
    u.uFar.value = camera.far;
    u.uProjInv.value = projInv;
    u.uResolution.value.set(this.width, this.height);
    u.uTime.value = this.time;
    u.uExposure.value = this.exposure;
    u.uBloom.value = p.bloomStrength;
    u.uStreak.value = p.anamorphic;
    u.uAO.value = p.aoStrength;
    u.uGrain.value = p.grain;
    u.uAberration.value = p.aberration;
    u.uVignette.value = p.vignette;
    u.uContrast.value = p.contrast;
    u.uSaturation.value = p.saturation;
    (u.uLift.value as THREE.Color).copy(p.lift);
    (u.uGain.value as THREE.Color).copy(p.gain);
    u.uRain.value = p.rain;
    u.uGlitch.value = p.glitch;
    u.uDeviancy.value = p.deviancy;
    u.uFade.value = clamp(p.fadeToBlack);
    u.uFlash.value = clamp(p.whiteFlash);
    u.uScanPulse.value = p.scanPulse;

    r.setRenderTarget(null);
    this.blit(this.matComposite, null);
  }

  /** Final exposure multiplier actually applied to the frame. */
  get exposure() {
    return this.exposureScale * this.params.exposure;
  }

  /** Force the next measurement to be applied instantly (used on hard cuts). */
  snapExposure() {
    this.snapNext = true;
  }

  private updateExposure(dt: number) {
    if (!this.autoExposure) {
      this.exposureScale = 1;
      return;
    }
    this.probeCountdown -= 1;
    if (this.probeCountdown <= 0 || this.snapNext) {
      this.probeCountdown = this.probeInterval;
      const stats = this.probe();
      // Median plus a little mean keeps bright practicals from dominating.
      const key = Math.max(1e-4, stats.p50 * 0.7 + stats.mean * 0.3);
      if (Number.isFinite(key)) this.measuredKey = key;
    }
    // Target middle grey in scene-referred units.
    const target = 0.155;
    const wanted = clamp(target / this.measuredKey, 0.05, 18);
    if (this.snapNext) {
      this.exposureScale = wanted;
      this.snapNext = false;
    } else {
      // Adapt down faster than up, like a real iris.
      const speed = wanted < this.exposureScale ? 2.6 : 1.6;
      this.exposureScale = damp(this.exposureScale, wanted, speed, dt);
    }
    this.lastKey = this.measuredKey;
  }

  /** Read back HDR scene luminance for grading diagnostics. */
  probe(): { mean: number; p50: number; p95: number; max: number } {
    const w = 96;
    const h = 54;
    const buf = new Uint16Array(w * h * 4);
    const x = Math.floor((this.width - w) / 2);
    const y = Math.floor((this.height - h) / 2);
    try {
      this.renderer.readRenderTargetPixels(this.sceneRT, x, y, w, h, buf);
    } catch {
      return { mean: 0, p50: 0, p95: 0, max: 0 };
    }
    // The scene target is half-float, so decode manually.
    const half = (bits: number) => {
      const sign = bits & 0x8000 ? -1 : 1;
      const exp = (bits & 0x7c00) >> 10;
      const frac = bits & 0x03ff;
      if (exp === 0) return sign * Math.pow(2, -14) * (frac / 1024);
      if (exp === 0x1f) return frac ? NaN : sign * Infinity;
      return sign * Math.pow(2, exp - 15) * (1 + frac / 1024);
    };
    const lum: number[] = [];
    let sum = 0;
    let max = 0;
    for (let i = 0; i < w * h; i++) {
      const l = 0.2126 * half(buf[i * 4]) + 0.7152 * half(buf[i * 4 + 1]) + 0.0722 * half(buf[i * 4 + 2]);
      if (!Number.isFinite(l)) continue;
      lum.push(l);
      sum += l;
      if (l > max) max = l;
    }
    lum.sort((a, b) => a - b);
    return {
      mean: sum / Math.max(1, lum.length),
      p50: lum[Math.floor(lum.length * 0.5)] ?? 0,
      p95: lum[Math.floor(lum.length * 0.95)] ?? 0,
      max,
    };
  }

  dispose() {
    this.quad.dispose();
    this.sceneRT?.dispose();
    this.aoRT?.dispose();
    this.aoBlurRT?.dispose();
    this.dofRT?.dispose();
    this.streakRT?.dispose();
    this.mips.forEach((m) => m.dispose());
  }
}
