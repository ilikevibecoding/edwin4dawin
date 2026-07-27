import { GLSL_COLOR, GLSL_CONST, GLSL_DEPTH } from './common.glsl';
import { GLSL_TONEMAP } from './grade.glsl';

/**
 * Intermediate-buffer viewer, cycled by the `debug:toggle` event with payload
 * `'post'`. Every screen-space pass in this chain is wrong in a way that is
 * invisible in the final frame and obvious in its own buffer, so this is not
 * optional tooling.
 */
export const DEBUG_MODES = [
  'off',
  'depth',
  'normals',
  'roughness',
  'velocity',
  'ao',
  'bentnormal',
  'ssr',
  'volumetrics',
  'bloom',
  'streak',
  'flare',
  'hdr',
  'coc',
  'exposure',
  'probe',
] as const;

export type DebugMode = (typeof DEBUG_MODES)[number];

export const DEBUG_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${GLSL_DEPTH}
${GLSL_TONEMAP}

in vec2 vUv;

uniform sampler2D uDepth;
uniform sampler2D uNormal;
uniform sampler2D uVelocity;
uniform sampler2D uAO;
uniform sampler2D uSSR;
uniform sampler2D uVolumetrics;
uniform sampler2D uBloom;
uniform sampler2D uStreak;
uniform sampler2D uFlare;
uniform sampler2D uHDR;
uniform sampler2D uCoC;
uniform sampler2D uExposureTex;
uniform sampler2D uLuminance;

uniform vec2 uNearFar;
uniform vec2 uResolution;
uniform int uMode;
uniform float uExposure;
out vec4 fragColor;

vec3 signedToUnit(vec3 v) { return v * 0.5 + 0.5; }

/** Small false-colour ramp so scalar buffers are readable at a glance. */
vec3 heat(float x) {
  x = clamp(x, 0.0, 1.0);
  return clamp(vec3(1.5 - abs(4.0 * x - 3.0), 1.5 - abs(4.0 * x - 2.0),
                    1.5 - abs(4.0 * x - 1.0)), 0.0, 1.0);
}

void main() {
  vec3 c = vec3(0.0);

  if (uMode == 1) {
    float d = linearizeDepth(texture(uDepth, vUv).r, uNearFar.x, uNearFar.y);
    // Log scale: a linear ramp over a 900 m far plane shows nothing useful.
    c = vec3(clamp(log2(d + 1.0) / log2(uNearFar.y + 1.0), 0.0, 1.0));
  } else if (uMode == 2) {
    c = signedToUnit(normalize(texture(uNormal, vUv).xyz + 1e-6));
  } else if (uMode == 3) {
    c = vec3(texture(uNormal, vUv).w);
  } else if (uMode == 4) {
    vec2 v = texture(uVelocity, vUv).xy;
    c = vec3(0.5 + v * 25.0, 0.5 - length(v) * 25.0);
  } else if (uMode == 5) {
    c = vec3(texture(uAO, vUv).r);
  } else if (uMode == 6) {
    c = signedToUnit(normalize(texture(uAO, vUv).gba + 1e-6));
  } else if (uMode == 7) {
    vec4 s = texture(uSSR, vUv);
    c = s.rgb * uExposure + vec3(0.0, 0.0, s.a * 0.15);
  } else if (uMode == 8) {
    vec4 v = texture(uVolumetrics, vUv);
    // In-scatter on the left half, transmittance on the right.
    c = vUv.x < 0.5 ? v.rgb * uExposure * 3.0 : vec3(v.a);
  } else if (uMode == 9) {
    c = texture(uBloom, vUv).rgb * uExposure * 4.0;
  } else if (uMode == 10) {
    c = texture(uStreak, vUv).rgb * uExposure * 4.0;
  } else if (uMode == 11) {
    c = texture(uFlare, vUv).rgb * uExposure * 4.0;
  } else if (uMode == 12) {
    c = agxDecode(agxEncode(texture(uHDR, vUv).rgb * uExposure));
  } else if (uMode == 13) {
    float coc = texture(uCoC, vUv).a;
    c = coc < 0.0 ? vec3(-coc, 0.0, 0.0) : vec3(0.0, coc, coc * 0.5);
  } else if (uMode == 14) {
    // Metering grid as false colour, with the adapted EV printed as a bar.
    float ev = texelFetch(uExposureTex, ivec2(0, 0), 0).r;
    float target = texelFetch(uExposureTex, ivec2(0, 0), 0).g;
    if (vUv.y > 0.9) {
      float x = vUv.x * 20.0 - 10.0;
      float bar = smoothstep(0.06, 0.0, abs(x - ev));
      float tgt = smoothstep(0.06, 0.0, abs(x - target));
      c = vec3(bar, tgt, abs(x) < 0.03 ? 1.0 : 0.0);
    } else {
      float l = texture(uLuminance, vUv).r;
      c = heat(clamp((l + 8.0) / 16.0, 0.0, 1.0));
    }
  } else if (uMode == 15) {
    // Colour-management probe. Bottom strip: a linear ramp taken through the
    // real tone curve. Top strip: the same values encoded straight to sRGB.
    // The 18% grey marker must read the same lightness in both if the chain
    // round-trips; anything else means a stray encode or decode.
    float x = vUv.x;
    float linear = x * x * 4.0;
    bool marker = abs(x - 0.2121) < 0.004;
    c = vUv.y > 0.5 ? vec3(linear) : agxDecode(agxEncode(vec3(linear)));
    if (marker) c = vec3(1.0, 0.0, 0.0);
  } else {
    c = texture(uHDR, vUv).rgb;
  }

  fragColor = vec4(linearToSrgb(c), 1.0);
}
`;
