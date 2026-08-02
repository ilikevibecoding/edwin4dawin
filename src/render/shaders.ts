/**
 * Hand-written post-processing shaders.
 *
 * Kept deliberately small: one cheap depth-aware defocus pass and one final
 * grade pass that folds vignette, grain, chromatic aberration and the global
 * fade-to-black used for chapter transitions into a single draw.
 */

export const FinalGradeShader = {
  name: 'FinalGradeShader',
  uniforms: {
    tDiffuse: { value: null as unknown },
    uTime: { value: 0 },
    uVignette: { value: 0.42 },
    uGrain: { value: 0.05 },
    uChroma: { value: 0.0016 },
    uFade: { value: 0.0 },
    uFadeColor: { value: [0, 0, 0] },
    uLift: { value: 0.012 },
    uSaturation: { value: 1.04 },
    uResolution: { value: [1280, 720] },
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
    uniform float uTime;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uChroma;
    uniform float uFade;
    uniform vec3  uFadeColor;
    uniform float uLift;
    uniform float uSaturation;
    uniform vec2  uResolution;
    varying vec2 vUv;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 uv = vUv;
      vec2 centered = uv - 0.5;
      float r2 = dot(centered, centered);

      // Chromatic aberration grows toward the frame edge only.
      vec2 dir = centered * (uChroma * (0.35 + r2 * 2.0));
      vec3 color;
      color.r = texture2D(tDiffuse, uv + dir).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, uv - dir).b;

      // Gentle lift keeps interiors readable without washing out space.
      color = color + uLift * (1.0 - color);

      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, uSaturation);

      // Vignette: smooth, never crushes the corners to pure black.
      float vig = 1.0 - uVignette * smoothstep(0.06, 0.78, r2);
      color *= vig;

      // Animated film grain, scaled down in bright areas.
      float g = hash12(gl_FragCoord.xy + vec2(uTime * 137.0, uTime * 71.0)) - 0.5;
      color += g * uGrain * (1.0 - 0.65 * luma);

      color = mix(color, uFadeColor, clamp(uFade, 0.0, 1.0));
      gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
    }
  `,
};

export const DofCompositeShader = {
  name: 'DofCompositeShader',
  uniforms: {
    tDiffuse: { value: null as unknown },
    tDepth: { value: null as unknown },
    uNear: { value: 0.1 },
    uFar: { value: 1000 },
    uFocus: { value: 40 },
    uRange: { value: 40 },
    uMaxBlur: { value: 1.6 },
    uTexel: { value: [1 / 1280, 1 / 720] },
    uStrength: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    #include <common>
    #include <packing>
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform float uNear;
    uniform float uFar;
    uniform float uFocus;
    uniform float uRange;
    uniform float uMaxBlur;
    uniform float uStrength;
    uniform vec2 uTexel;
    varying vec2 vUv;

    float viewDepth(vec2 uv) {
      float d = texture2D(tDepth, uv).x;
      return -perspectiveDepthToViewZ(d, uNear, uFar);
    }

    void main() {
      float dist = viewDepth(vUv);
      float coc = clamp(abs(dist - uFocus) / max(1.0, uRange), 0.0, 1.0);
      coc = pow(coc, 1.6) * uMaxBlur * uStrength;

      vec4 base = texture2D(tDiffuse, vUv);
      if (coc < 0.02) { gl_FragColor = base; return; }

      // 8-tap rotated poisson ring: enough for a soft, restrained defocus.
      vec4 sum = base;
      float total = 1.0;
      const int TAPS = 8;
      for (int i = 0; i < TAPS; i++) {
        float a = float(i) * 0.7853981634 + vUv.x * 3.0 + vUv.y * 5.0;
        float rad = (0.55 + 0.45 * fract(float(i) * 0.618)) * coc;
        vec2 off = vec2(cos(a), sin(a)) * rad * uTexel * 6.0;
        vec2 suv = clamp(vUv + off, vec2(0.001), vec2(0.999));
        // Reject samples much closer than the centre so foreground edges
        // do not bleed over sharp subjects.
        float sd = viewDepth(suv);
        float w = sd < dist - uRange * 0.35 ? 0.15 : 1.0;
        sum += texture2D(tDiffuse, suv) * w;
        total += w;
      }
      gl_FragColor = sum / total;
    }
  `,
};
