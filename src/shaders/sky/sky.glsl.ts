/**
 * Sky evaluation and the materials that use it.
 *
 * `evaluateSky` is the single source of truth for what the sky looks like in a
 * given direction; the screen dome, the environment cubemap and the ambient
 * integrator all call it so the IBL can never drift from what the player sees.
 *
 * Output is **linear HDR radiance** in engine units (1 unit = 1 kilonit). No
 * tone mapping, no gamma: the post chain owns both. The sun disk lands around
 * 4.5e4 units at noon, the clear zenith around 3, a moonlit night sky around
 * 6e-3.
 */
export const SKY_EVAL_GLSL = /* glsl */ `
#ifndef SKY_EVAL_INCLUDED
#define SKY_EVAL_INCLUDED

uniform sampler2D uSkyViewLum;
uniform sampler2D uSkyViewMie;
uniform sampler2D uMoonSkyLum;
uniform sampler2D uMoonSkyMie;
uniform vec2 uSkyViewSize;
uniform float uMoonSkyStrength;
uniform float uNightAmount;
uniform vec3 uAirglow;
uniform float uSunAngRadius;
uniform vec3 uSunLimbDarkening;
/** compression / solid angle: turns irradiance into a half-float-safe radiance. */
uniform float uSunDiskScale;
uniform float uMoonDiskGain;

/** Radiance of the solar disk, with wavelength-dependent limb darkening. */
vec3 sunDisk(vec3 dir, vec3 trans) {
  float cosA = dot(dir, uSunDir);
  float ang = sqrt(max(2.0 - 2.0 * cosA, 0.0));
  float edge = max(uPixelAngle * 0.75, uSunAngRadius * 0.02);
  if (ang > uSunAngRadius + edge * 2.0) return vec3(0.0);

  float rr = min(ang / uSunAngRadius, 1.0);
  float disk = 1.0 - smoothstep(uSunAngRadius - edge, uSunAngRadius + edge, ang);
  /* mu is the cosine of the emission angle at the photosphere. */
  float mu = sqrt(max(1.0 - rr * rr, 0.0));
  vec3 limb = max(1.0 - uSunLimbDarkening * (1.0 - mu), vec3(0.0));
  return uSunIrradiance * uSunDiskScale * limb * trans * disk;
}

vec3 evaluateSky(vec3 dir, bool celestials) {
  vec3 pos = cameraPlanetPos();
  float r = length(pos);
  vec3 up = vec3(0.0, 1.0, 0.0);
  float mu = dot(dir, up);
  bool hitsGround = raySphere(pos, dir, PLANET_R) >= 0.0;

  vec3 L = sampleSkyView(uSkyViewLum, uSkyViewMie, uSkyViewSize, pos, dir, uSunDir) * uSunIrradiance;
  if (uMoonSkyStrength > 0.0) {
    L += sampleSkyView(uMoonSkyLum, uMoonSkyMie, uSkyViewSize, pos, dir, uMoonDir)
       * uMoonIrradiance * uMoonSkyStrength;
  }

  if (!celestials) return L;

  vec3 trans = transmittanceToSpace(r, mu);

  if (!hitsGround) {
    L += sunDisk(dir, trans);
    if (uMoonDiskGain > 0.0 && dot(uMoonDir, up) > -0.12) {
      L += moonDisk(dir, uMoonDir, uSunDir, uSunIrradiance * trans * uMoonDiskGain);
    }
    if (uNightAmount > 0.0) {
      float horizonFade = clamp(mu * 6.0, 0.0, 1.0);
      vec3 night = starField(dir, horizonFade) + galacticGlow(dir);
      /* Airglow is emitted in a thin shell at ~90 km, so the line of sight
         through it lengthens sharply toward the horizon. */
      night += uAirglow * (0.55 + 1.6 * exp(-max(mu, 0.0) * 4.5));
      L += night * trans * uNightAmount;
    }
  }

  return L;
}

#endif
`;

export const SKY_DOME_VERT = /* glsl */ `
varying vec3 vWorldDir;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldDir = world.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * world;
  /* Pin to the far plane: the sky then depth-tests correctly behind every
     object without writing depth, wherever in the queue it happens to draw. */
  gl_Position.z = gl_Position.w;
}
`;

export const SKY_DOME_FRAG = /* glsl */ `
precision highp float;
varying vec3 vWorldDir;

uniform sampler2D uCloudResolved;
uniform mat4 uCloudViewProj;
uniform vec2 uCloudTexSize;
uniform float uCloudEnabled;
uniform float uDither;
uniform float uFrameIndex;
/** Set for any pass whose target is not the colour buffer; see SkyDome. */
uniform float uSkyPrepass;

float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

/**
 * Joint-bilateral upsample of the fraction-resolution cloud buffer, guided by
 * the taps' own transmittance so silhouettes stay tighter than plain bilinear.
 */
vec4 sampleClouds(vec3 dir) {
  vec4 clip = uCloudViewProj * vec4(dir, 0.0);
  if (clip.w <= 1e-6) return vec4(0.0, 0.0, 0.0, 1.0);
  vec2 uv = clip.xy / clip.w * 0.5 + 0.5;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec4(0.0, 0.0, 0.0, 1.0);

  vec2 tc = uv * uCloudTexSize - 0.5;
  vec2 base = floor(tc);
  vec2 f = tc - base;
  ivec2 b = ivec2(base);
  ivec2 lim = ivec2(uCloudTexSize) - 1;

  vec4 s00 = texelFetch(uCloudResolved, clamp(b, ivec2(0), lim), 0);
  vec4 s10 = texelFetch(uCloudResolved, clamp(b + ivec2(1, 0), ivec2(0), lim), 0);
  vec4 s01 = texelFetch(uCloudResolved, clamp(b + ivec2(0, 1), ivec2(0), lim), 0);
  vec4 s11 = texelFetch(uCloudResolved, clamp(b + ivec2(1, 1), ivec2(0), lim), 0);

  float w00 = (1.0 - f.x) * (1.0 - f.y);
  float w10 = f.x * (1.0 - f.y);
  float w01 = (1.0 - f.x) * f.y;
  float w11 = f.x * f.y;

  vec4 bilinear = s00 * w00 + s10 * w10 + s01 * w01 + s11 * w11;
  const float K = 5.0;
  w00 *= exp(-K * abs(s00.a - bilinear.a));
  w10 *= exp(-K * abs(s10.a - bilinear.a));
  w01 *= exp(-K * abs(s01.a - bilinear.a));
  w11 *= exp(-K * abs(s11.a - bilinear.a));
  float wsum = w00 + w10 + w01 + w11;
  if (wsum < 1e-5) return bilinear;
  return (s00 * w00 + s10 * w10 + s01 * w01 + s11 * w11) / wsum;
}

void main() {
  /* A depth/velocity prepass wants geometry, not sky: leaving the attachments
     at their cleared values is exactly right, and costs nothing. */
  if (uSkyPrepass > 0.5) discard;

  vec3 dir = normalize(vWorldDir);
  vec3 color = evaluateSky(dir, true);

  if (uCloudEnabled > 0.5) {
    vec4 cloud = sampleClouds(dir);
    color = cloud.rgb + color * cloud.a;
  }

  /* Relative triangular dither. The gradients here span four orders of
     magnitude, so the step that matters is a fraction of the local value, not a
     fixed epsilon. */
  float d0 = ign(gl_FragCoord.xy + uFrameIndex * 5.588238);
  float d1 = ign(gl_FragCoord.xy * 1.7 + 31.7 + uFrameIndex * 3.14159);
  color *= 1.0 + (d0 + d1 - 1.0) * uDither;

  gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
}
`;

/**
 * One cube face of the environment probe. Clouds are marched inline at a
 * reduced step count rather than sampled from the screen buffer, because the
 * probe looks in directions the camera does not.
 */
export const SKY_ENV_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform vec3 uFaceForward;
uniform vec3 uFaceRight;
uniform vec3 uFaceUp;
uniform float uEnvCloudSteps;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  vec3 dir = normalize(uFaceForward + uFaceRight * p.x + uFaceUp * p.y);

  vec3 color = evaluateSky(dir, true);

  if (uEnvCloudSteps > 0.0) {
    vec3 ro = cameraPlanetPos();
    CloudHit hit = marchClouds(ro, dir, uSunDir, 0.5, uEnvCloudSteps);
    vec4 cloud = cloudOverAir(ro, dir, uSunDir, hit, 6.0);
    color = cloud.rgb + color * cloud.a;
  }

  gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
}
`;

/**
 * One direction, one pixel, full float. The only way to check that a sky is
 * physically bright is to read the number: an untone-mapped screenshot cannot
 * distinguish 4 units from 40, and a tone-mapped one cannot distinguish either
 * from a clipped highlight.
 */
export const SKY_PROBE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform vec3 uProbeDir;
uniform float uProbeCelestials;
/** > 0 marches the cloud layer too, and reports its transmittance in alpha. */
uniform float uProbeClouds;
/**
 * 0 reports radiance and cloud transmittance, which is what a look is judged on.
 * 1 reports the march's geometry instead — hit range, the reach that feathers it,
 * and the atmosphere's own transmittance over that range. That second set exists
 * because "the distant clouds are too dark" has two completely different causes
 * with the same symptom, and only the numbers separate them.
 */
uniform float uProbeMode;

void main() {
  vec3 dir = normalize(uProbeDir);
  vec3 L = evaluateSky(dir, uProbeCelestials > 0.5);
  float T = 1.0;
  if (uProbeClouds > 0.0) {
    vec3 ro = cameraPlanetPos();
    CloudHit hit = marchClouds(ro, dir, uSunDir, 0.5, uProbeClouds);
    if (uProbeMode > 0.5) {
      Scatter ap = integrateScatter(ro, dir, uSunDir, 8.0, hit.distance, false, true, 0.5);
      gl_FragColor = vec4(hit.distance, hit.reach, dot(ap.transmittance, vec3(0.3333)),
                          hit.transmittance);
      return;
    }
    vec4 cloud = cloudOverAir(ro, dir, uSunDir, hit, 8.0);
    L = cloud.rgb + L * cloud.a;
    T = cloud.a;
  }
  gl_FragColor = vec4(L, T);
}
`;

/** Bakes the Milky Way into a celestial-space cubemap, one face per draw. */
export const NIGHT_CUBE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform vec3 uFaceForward;
uniform vec3 uFaceRight;
uniform vec3 uFaceUp;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  vec3 dir = normalize(uFaceForward + uFaceRight * p.x + uFaceUp * p.y);
  gl_FragColor = vec4(milkyWay(dir), 1.0);
}
`;

/**
 * Temporal resolve for the cloud buffer. Reprojection is by view direction:
 * clouds are kilometres away, so camera translation contributes almost no
 * parallax, and the sky is what everything else is compared against anyway.
 */
export const CLOUD_RESOLVE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform sampler2D uCurrent;
uniform sampler2D uHistory;
uniform mat4 uInvViewProj;
uniform mat4 uPrevViewProj;
uniform vec3 uCamWorld;
uniform vec2 uTexel;
uniform float uHistoryBlend;

void main() {
  vec4 cur = texture2D(uCurrent, vUv);

  vec4 h = uInvViewProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 dir = normalize(h.xyz / h.w - uCamWorld);

  vec4 clip = uPrevViewProj * vec4(dir, 0.0);
  if (uHistoryBlend <= 0.0 || clip.w <= 1e-6) {
    gl_FragColor = cur;
    return;
  }
  vec2 prevUv = clip.xy / clip.w * 0.5 + 0.5;
  if (prevUv.x < 0.0 || prevUv.y < 0.0 || prevUv.x > 1.0 || prevUv.y > 1.0) {
    gl_FragColor = cur;
    return;
  }

  /* Clamp the history into the local neighbourhood so a moving sun or a wind
     gust cannot smear a stale cloud across the sky. */
  vec4 mn = cur;
  vec4 mx = cur;
  for (int i = 0; i < 4; i++) {
    vec2 o = i == 0 ? vec2(1.0, 0.0) : i == 1 ? vec2(-1.0, 0.0)
           : i == 2 ? vec2(0.0, 1.0) : vec2(0.0, -1.0);
    vec4 s = texture2D(uCurrent, vUv + o * uTexel);
    mn = min(mn, s);
    mx = max(mx, s);
  }
  vec4 pad = (mx - mn) * 0.3 + 1e-4;
  vec4 hist = clamp(texture2D(uHistory, prevUv), mn - pad, mx + pad);

  gl_FragColor = mix(cur, hist, uHistoryBlend);
}
`;
