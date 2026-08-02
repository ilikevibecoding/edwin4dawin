// One combined finishing pass: anamorphic letterbox, vignette, film grain,
// a touch of chromatic aberration, plus the global fade / flash the director
// uses for cuts and explosions. Doing it in a single shader keeps the pass
// count (and therefore the software-render cost) down.

import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export const FinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uFade: { value: 0 },            // 0 = visible, 1 = black
    uFadeColor: { value: new THREE.Color(0x000000) },
    uFlash: { value: 0 },           // additive white flash
    uAspectBars: { value: 2.39 },   // target cinematic aspect (0 = off)
    uResolution: { value: new THREE.Vector2(1280, 720) },
    uGrain: { value: 0.055 },
    uVignette: { value: 0.85 },
    uAberration: { value: 0.0016 },
    uSaturation: { value: 1.06 },
    uContrast: { value: 1.04 },
    uScanline: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uFade, uFlash, uAspectBars, uGrain, uVignette, uAberration, uSaturation, uContrast, uScanline;
    uniform vec3 uFadeColor;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(443.897, 441.423));
      p += dot(p, p.yx + 19.19);
      return fract((p.x + p.y) * p.x);
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);

      // Chromatic aberration grows toward the edges of the frame.
      float ab = uAberration * (0.25 + r2 * 3.0);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c * ab).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c * ab).b;

      // Contrast + saturation grade.
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, uSaturation);
      col = (col - 0.5) * uContrast + 0.5;

      // Vignette.
      float vig = 1.0 - uVignette * smoothstep(0.15, 0.78, r2);
      col *= vig;

      // Grain: static-free because it is keyed off time.
      float g = hash(uv * uResolution + fract(uTime) * 313.0) - 0.5;
      col += g * uGrain * (0.4 + 0.9 * (1.0 - l));

      if (uScanline > 0.0) {
        col *= 1.0 - uScanline * 0.5 * (0.5 + 0.5 * sin(uv.y * uResolution.y * 3.14159));
      }

      col += uFlash;
      col = mix(col, uFadeColor, clamp(uFade, 0.0, 1.0));

      // Anamorphic bars, drawn last so nothing bleeds into them.
      if (uAspectBars > 0.0) {
        float frameAspect = uResolution.x / uResolution.y;
        float visible = frameAspect / uAspectBars;          // fraction of height kept
        float keep = clamp(visible, 0.0, 1.0) * 0.5;
        float d = abs(uv.y - 0.5);
        float bar = smoothstep(keep, keep + 0.0016, d);
        col *= 1.0 - bar;
      }

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function makeFinishPass(width, height) {
  const pass = new ShaderPass(FinishShader);
  pass.uniforms.uResolution.value.set(width, height);
  pass.renderToScreen = true;
  return pass;
}

/**
 * Cheap radial "hyperspace / superlaser" streak overlay, enabled only for the
 * handful of shots that need it.
 */
export const StreakShader = {
  uniforms: {
    tDiffuse: { value: null },
    uStrength: { value: 0 },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uSamples: { value: 10 },
  },
  vertexShader: FinishShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uStrength;
    uniform vec2 uCenter;
    varying vec2 vUv;
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      if (uStrength <= 0.001) { gl_FragColor = base; return; }
      vec2 dir = vUv - uCenter;
      vec3 sum = base.rgb;
      float w = 1.0;
      for (int i = 1; i < 10; i++) {
        float s = float(i) / 9.0;
        float scale = 1.0 - uStrength * s * 0.35;
        vec3 c = texture2D(tDiffuse, uCenter + dir * scale).rgb;
        float weight = (1.0 - s) * 0.8;
        sum += c * weight;
        w += weight;
      }
      gl_FragColor = vec4(sum / w, base.a);
    }
  `,
};
