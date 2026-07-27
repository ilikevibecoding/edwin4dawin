/**
 * Shared GLSL for the post chain.
 *
 * Everything here is ES 3.00; three compiles `ShaderMaterial` with
 * `glslVersion: GLSL3` without injecting an output declaration, so each pass
 * declares its own `layout(location = N) out`.
 */

/** Fullscreen triangle. `position` is already in clip space. */
export const FULLSCREEN_VERT = /* glsl */ `
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const GLSL_CONST = /* glsl */ `
#define PI 3.141592653589793
#define TAU 6.283185307179586
#define HALF_PI 1.570796326794897
#define FLT_EPS 1e-6
`;

export const GLSL_COLOR = /* glsl */ `
float luma(vec3 c) { return dot(c, vec3(0.2126729, 0.7151522, 0.0721750)); }
float maxc(vec3 c) { return max(c.r, max(c.g, c.b)); }

// Rec.709 luminance weighting on a tone-mapped signal reads slightly flat;
// this is the perceptual weighting used for grain and sharpening masks.
float lumaFast(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

vec3 rgbToYCoCg(vec3 c) {
  float y  = 0.25 * c.r + 0.5 * c.g + 0.25 * c.b;
  float co = 0.5 * c.r - 0.5 * c.b;
  float cg = -0.25 * c.r + 0.5 * c.g - 0.25 * c.b;
  return vec3(y, co, cg);
}

vec3 yCoCgToRgb(vec3 c) {
  float t = c.x - c.z;
  return vec3(t + c.y, c.x + c.z, t - c.y);
}

vec3 linearToSrgb(vec3 c) {
  c = max(c, vec3(0.0));
  return mix(c * 12.92, pow(c, vec3(1.0 / 2.4)) * 1.055 - 0.055, step(0.0031308, c));
}

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

// Reinhard-style range compression used to keep temporal filters stable in HDR.
vec3 tonemapRange(vec3 c) { return c / (1.0 + maxc(max(c, vec3(0.0)))); }
vec3 tonemapRangeInv(vec3 c) { return c / max(1.0 - maxc(c), 1e-4); }
`;

export const GLSL_NOISE = /* glsl */ `
// Interleaved gradient noise. Spectrally close enough to blue noise for
// dithered sampling and it costs no texture unit; this is what the CoD
// "Next Generation Post Processing" talk uses for its stochastic passes.
float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

// R2 low-discrepancy sequence: successive frames stay decorrelated so temporal
// accumulation converges instead of beating against itself.
vec2 r2Seq(float n) { return fract(vec2(0.7548776662, 0.5698402910) * n); }

float ignAnimated(vec2 p, float frame) {
  return fract(ign(p) + 0.61803398875 * frame);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

// Triangular-PDF dither. Applied before an 8-bit write it removes the banding
// a uniform-PDF dither leaves behind in smooth gradients such as sky.
float triDither(vec2 uv, float frame) {
  float r0 = hash12(uv * 1024.0 + frame * 17.13);
  float r1 = hash12(uv * 1024.0 + frame * 17.13 + 71.7);
  return (r0 + r1) - 1.0;
}
`;

export const GLSL_DEPTH = /* glsl */ `
// Negative, view-space Z. Matches three's perspectiveDepthToViewZ.
float viewZFromDepth(float d, float near, float far) {
  return (near * far) / ((far - near) * d - far);
}

// Positive distance along -Z. Sky (depth == 1) returns the far plane.
float linearizeDepth(float d, float near, float far) {
  return -viewZFromDepth(d, near, far);
}

vec3 viewPosFromDepth(vec2 uv, float d, mat4 projInv) {
  vec4 clip = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  vec4 view = projInv * clip;
  return view.xyz / view.w;
}

// View-space direction through a pixel, normalised so z == -1.
vec3 viewRayFromUv(vec2 uv, mat4 projInv) {
  vec4 clip = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
  vec3 v = (projInv * clip).xyz;
  return v / max(-v.z, 1e-6);
}
`;

/** Henyey-Greenstein and friends, shared by volumetrics and the sky fallback. */
export const GLSL_SCATTER = /* glsl */ `
float phaseHG(float cosTheta, float g) {
  float g2 = g * g;
  float d = 1.0 + g2 - 2.0 * g * cosTheta;
  return (1.0 - g2) / (4.0 * PI * max(d * sqrt(max(d, 1e-4)), 1e-4));
}

// Two-lobe mix: a strong forward lobe for the sun glow plus a wide lobe so the
// fog still reads as a volume when looking away from the sun.
float phaseDual(float cosTheta, float g0, float g1, float w) {
  return mix(phaseHG(cosTheta, g0), phaseHG(cosTheta, g1), w);
}

/**
 * Zenith-to-horizon radiance gradient, in the same engine units the sky system
 * publishes (one unit is a kilonit). Used where a real sky lookup is not
 * available to a pass: the fog's ambient in-scatter and the reflection of the
 * sky in a ray that leaves the screen. Deliberately has no solar disk — a
 * mis-scaled sun in a reflection is far more noticeable than a missing one, so
 * callers that want a highlight add their own aureole with a known magnitude.
 */
vec3 skyGradient(vec3 dir, vec3 zenith, vec3 horizon) {
  float up = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 base = mix(horizon, zenith, pow(up, 0.6));
  // Below the horizon the world bounces rather than the sky; without this the
  // reflection in wet asphalt reads as a hole in the ground.
  return mix(horizon * 0.4, base, smoothstep(-0.15, 0.04, dir.y));
}
`;

export const GLSL_BILATERAL = /* glsl */ `
/**
 * Depth-aware upsample of a half-resolution buffer. Weighting by depth
 * similarity is what stops half-res AO, SSR and fog from leaking a one-pixel
 * halo across every silhouette.
 */
vec4 bilateralUpsample(sampler2D tex, sampler2D depthTex, vec2 uv, vec2 halfTexel,
                       float centerDepth, float near, float far, float sigma) {
  vec4 sum = vec4(0.0);
  float wsum = 0.0;
  for (int y = 0; y < 2; y++) {
    for (int x = 0; x < 2; x++) {
      vec2 o = (vec2(float(x), float(y)) - 0.5) * halfTexel * 2.0;
      vec2 suv = uv + o;
      vec4 s = texture(tex, suv);
      float d = linearizeDepth(texture(depthTex, suv).r, near, far);
      float w = exp(-abs(d - centerDepth) / max(sigma * centerDepth, 0.02));
      sum += s * w;
      wsum += w;
    }
  }
  return wsum > 1e-4 ? sum / wsum : texture(tex, uv);
}
`;

export function postChunks(): string {
  return [GLSL_CONST, GLSL_COLOR, GLSL_NOISE, GLSL_DEPTH].join('\n');
}
