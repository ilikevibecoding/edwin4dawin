/**
 * Shared GLSL for the effects system.
 *
 * These are compiled into `THREE.ShaderMaterial`, not `RawShaderMaterial`, so
 * three rewrites them to ES 3.00 and supplies the standard matrix uniforms and
 * the `position` / `uv` attributes. Everything here is therefore written in the
 * GLSL 1.00 dialect three expects (`attribute`, `varying`, `gl_FragColor`).
 */

export const FX_MATH = /* glsl */ `
#define FX_PI 3.141592653589793
#define FX_INV_PI 0.3183098861837907

float fxHash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

vec3 fxHash31(float p) {
  vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yzz) * p3.zyx);
}

vec2 fxRotate(vec2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

/**
 * Henyey-Greenstein. The forward lobe is the whole reason back-lit smoke reads
 * as a volume: a puff between the camera and the sun is *brighter* than the
 * sky behind it, which a Lambert term can never produce.
 */
float fxPhaseHG(float cosTheta, float g) {
  float g2 = g * g;
  float d = 1.0 + g2 - 2.0 * g * cosTheta;
  return (1.0 - g2) / (4.0 * FX_PI * max(d * sqrt(max(d, 1e-4)), 1e-4));
}
`;

/**
 * Depth handling for soft particles.
 *
 * `uDepthParams` is (near, far, 1/width, 1/height) and `uHasDepth` gates the
 * whole path: at the lowest preset the pipeline hands out the depth attachment
 * of the target it is currently drawing into, which cannot legally be sampled,
 * so the effects system leaves the texture unbound and every particle stays
 * hard-edged rather than reading undefined memory.
 */
export const FX_DEPTH = /* glsl */ `
uniform sampler2D uDepthTexture;
uniform vec4 uDepthParams;
uniform float uHasDepth;

float fxLinearDepth(float d) {
  float near = uDepthParams.x;
  float far = uDepthParams.y;
  return (near * far) / (far - (far - near) * d);
}

/**
 * View position from depth, taken straight off the perspective terms of the
 * live projection matrix rather than a matrix uniform pushed from the CPU. The
 * pipeline jitters the projection for temporal AA after every lateUpdate has
 * run, so anything uploaded by this system would be a frame's jitter out of
 * step with the depth buffer it is reading.
 */
vec3 fxViewPosFromDepth(vec2 uv, float d, mat4 proj) {
  float z = fxLinearDepth(d);
  vec2 ndc = uv * 2.0 - 1.0;
  return vec3(
    z * (ndc.x + proj[2][0]) / proj[0][0],
    z * (ndc.y + proj[2][1]) / proj[1][1],
    -z
  );
}
`;

/**
 * Blackbody radiance, in the engine's kilonits.
 *
 * A fireball is driven by a temperature curve rather than a colour ramp because
 * the two things a ramp cannot get right are exactly the two that sell it: the
 * hue path from white through yellow and orange into deep red is the Planckian
 * locus, and emitted power goes as T^4, so cooling from 3400 K to 1700 K is a
 * five-stop collapse in brightness rather than a fade to a dimmer orange.
 *
 * Hue comes from a fit of the locus rather than Planck's law evaluated at three
 * wavelengths. Three point samples ignore the width of the cone responses, and
 * below about 2000 K that error runs to three orders of magnitude between the
 * red and green samples — a dying ember comes out a fully saturated primary red
 * instead of the deep orange it actually is. Magnitude is Stefan-Boltzmann,
 * normalised to 1 at 2500 K, so `intensity` reads as a multiple of a reference
 * ember and stays a human-sized number.
 */
export const FX_BLACKBODY = /* glsl */ `
/** Linear-sRGB chromaticity on the Planckian locus, peak channel at 1. */
vec3 fxBlackbodyHue(float T) {
  float t = clamp(T, 1000.0, 20000.0) * 0.01;
  // Both arms of every select are evaluated on some compilers, so the domains
  // are clamped rather than merely branched around: pow of a negative base and
  // log of zero are NaN, and one NaN in an additive buffer is a white screen.
  float hot = max(t - 60.0, 1e-3);
  float warm = max(t - 10.0, 1e-3);
  vec3 c;
  c.r = t <= 66.0 ? 1.0 : 1.29293618 * pow(hot, -0.1332047592);
  c.g = t <= 66.0 ? 0.39008158 * log(t) - 0.63184144 : 1.12989086 * pow(hot, -0.0755148492);
  c.b = t >= 66.0 ? 1.0 : (t <= 19.0 ? 0.0 : 0.54320679 * log(warm) - 1.19625409);
  c = clamp(c, 0.0, 1.0);
  // The fit is display-referred; radiance is not.
  return c * c * (0.8 + 0.2 * c);
}

vec3 fxBlackbody(float T) {
  float x = max(T, 400.0) * 0.0004;
  float x2 = x * x;
  return fxBlackbodyHue(T) * (x2 * x2);
}
`;

/**
 * Single-scatter lighting for a billboarded puff.
 *
 * The billboard is treated as a sphere: a normal is reconstructed from the
 * sprite uv so the puff has a lit side and a shadowed side, a wrap term softens
 * the terminator the way a participating medium does, and a forward-scattering
 * lobe weighted by how thin the puff is at this texel produces the silver
 * lining. Everything is in the sky system's engine units, so smoke picks up the
 * hour of the day for free.
 */
export const FX_SCATTER = /* glsl */ `
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uSkyColor;
uniform vec4 uScatter;   // x = wrap, y = optical depth, z = forward gain, w = ambient gain

vec3 fxScatterLighting(vec3 albedo, vec3 normalWS, vec3 viewDirWS, float density, float burial) {
  float ndl = dot(normalWS, uSunDirection);
  float wrap = max(0.0, (ndl + uScatter.x) / (1.0 + uScatter.x));

  // Light that survives the crossing; thin wisps at the rim glow, the core does not.
  float transmit = exp(-density * uScatter.y);
  float forward = fxPhaseHG(dot(viewDirWS, uSunDirection), 0.66);

  // ...and light that never reached this puff at all, because the rest of the
  // cloud drank it first. Beer-Lambert over the depth the recipe measured at
  // spawn. This is what separates a cloud from a heap of individually lit
  // billboards: the lit face stays bright, the body goes to sky colour, and
  // the mass finally has a near and a far side.
  float reach = exp(-burial);

  vec3 sun = uSunColor * FX_INV_PI * reach * (wrap * (0.45 + 0.55 * transmit) +
    forward * transmit * uScatter.z);
  // Self-occlusion: the dense middle of a puff sees far less of the sky than
  // its edge, which is what gives real smoke its rounded, shaded form. Being
  // buried costs sky too, but far less than it costs sun — the sky is a dome,
  // so a puff in shadow still sees a good deal of it.
  float skyVis = (0.30 + 0.70 * transmit) * (0.62 + 0.38 * normalWS.y) *
    (0.45 + 0.55 * reach);
  vec3 sky = uSkyColor * skyVis * uScatter.w;

  return albedo * (sun + sky);
}
`;
