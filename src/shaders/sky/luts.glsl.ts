/**
 * Bake passes for the atmosphere LUTs.
 *
 * `transmittance` and `multiScatter` are sun-independent and baked once (or
 * when weather changes the aerosol load). `skyView` is baked whenever the sun
 * or moon moves far enough to matter, and `aerial` whenever the sky-view LUT
 * is rebaked.
 *
 * Everything is stored per unit top-of-atmosphere irradiance; see
 * atmosphere.glsl.ts.
 */

/** Full-screen triangle; `vUv` spans 0..1 over the target. */
export const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const TRANSMITTANCE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

void main() {
  float r, mu;
  transmittanceLutParams(vUv, r, mu);

  vec3 pos = vec3(0.0, r, 0.0);
  vec3 dir = vec3(sqrt(max(1.0 - mu * mu, 0.0)), mu, 0.0);

  /* March to the top of the atmosphere; grazing rays need the extra samples. */
  float tTop = raySphere(pos, dir, ATMOS_R);
  float tGround = raySphere(pos, dir, PLANET_R);
  float tMax = tGround > 0.0 ? min(tGround, tTop) : tTop;
  if (tMax <= 0.0) {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    return;
  }

  const float STEPS = 48.0;
  vec3 depth = vec3(0.0);
  float dt = tMax / STEPS;
  for (float i = 0.5; i < STEPS; i += 1.0) {
    vec3 p = pos + dir * (dt * i);
    depth += sampleMedium(length(p)).extinction * dt;
  }
  gl_FragColor = vec4(exp(-depth), 1.0);
}
`;

export const MULTISCATTER_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

/**
 * Second-order in-scattering and the fraction of light that scatters again,
 * both for unit incoming radiance and an isotropic phase.
 */
void integrateMs(vec3 pos, vec3 dir, vec3 sunDir, out vec3 lum, out vec3 fms) {
  lum = vec3(0.0);
  fms = vec3(0.0);

  float tGround = raySphere(pos, dir, PLANET_R);
  float tTop = raySphere(pos, dir, ATMOS_R);
  float tMax;
  if (tGround < 0.0) {
    if (tTop < 0.0) return;
    tMax = tTop;
  } else {
    tMax = tTop > 0.0 ? min(tTop, tGround) : tGround;
  }

  const float STEPS = 20.0;
  vec3 throughput = vec3(1.0);
  float t = 0.0;
  for (float i = 0.0; i < STEPS; i += 1.0) {
    float tNew = tMax * (i + 0.5) / STEPS;
    float dt = tNew - t;
    t = tNew;

    vec3 p = pos + dir * t;
    float r = length(p);
    vec3 up = p / r;
    Medium m = sampleMedium(r);
    vec3 segT = exp(-m.extinction * dt);
    vec3 inv = 1.0 / m.extinction;

    vec3 ms = m.scatterTotal;
    fms += throughput * (ms - ms * segT) * inv;

    float shadow = raySphere(p, sunDir, SHADOW_R) >= 0.0 ? 0.0 : 1.0;
    vec3 s = shadow * transmittanceToSpace(r, dot(up, sunDir)) * m.scatterTotal * ISO_PHASE;
    lum += throughput * (s - s * segT) * inv;
    throughput *= segT;
  }

  if (tGround > 0.0) {
    vec3 p = pos + dir * tGround;
    float r = length(p);
    vec3 up = p / r;
    float nDotL = max(dot(up, sunDir), 0.0);
    lum += throughput * transmittanceToSpace(r, dot(up, sunDir)) * nDotL * uGroundAlbedo / PI;
  }
}

void main() {
  float muSun = texCoordToUnit(vUv.x, uMultiLutSize) * 2.0 - 1.0;
  float hFrac = texCoordToUnit(vUv.y, uMultiLutSize);
  float r = mix(PLANET_R + 0.01, ATMOS_R, clamp(hFrac, 0.0, 1.0));

  vec3 pos = vec3(0.0, r, 0.0);
  vec3 sunDir = vec3(sqrt(max(1.0 - muSun * muSun, 0.0)), muSun, 0.0);

  /* 16 uniformly distributed directions is ample: the term is very smooth. */
  const float SQRT_N = 4.0;
  vec3 lumSum = vec3(0.0);
  vec3 fmsSum = vec3(0.0);
  for (float i = 0.0; i < SQRT_N; i += 1.0) {
    for (float j = 0.0; j < SQRT_N; j += 1.0) {
      float randA = (i + 0.5) / SQRT_N;
      float randB = (j + 0.5) / SQRT_N;
      float theta = 2.0 * PI * randA;
      float phi = acos(clamp(1.0 - 2.0 * randB, -1.0, 1.0));
      float sinPhi = sin(phi);
      vec3 dir = vec3(cos(theta) * sinPhi, cos(phi), sin(theta) * sinPhi);

      vec3 lum, fms;
      integrateMs(pos, dir, sunDir, lum, fms);
      lumSum += lum;
      fmsSum += fms;
    }
  }
  float invN = 1.0 / (SQRT_N * SQRT_N);
  vec3 lum = lumSum * invN;
  vec3 fms = fmsSum * invN;

  /* Sum of all scattering orders as a geometric series. */
  vec3 psi = lum / max(1.0 - fms, vec3(1e-4));
  gl_FragColor = vec4(psi, 1.0);
}
`;

export const SKYVIEW_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
layout(location = 0) out vec4 outLum;
layout(location = 1) out vec4 outMie;

uniform vec3 uBakeLightDir;
uniform vec2 uSkyViewSize;
uniform float uSkyViewSteps;

void main() {
  vec3 pos = cameraPlanetPos();
  float r = length(pos);

  float viewZenithCos, lightViewCos;
  skyViewLutParams(vUv, r, uSkyViewSize, viewZenithCos, lightViewCos);

  /* Rebuild a frame where the light sits at azimuth zero. */
  vec3 up = vec3(0.0, 1.0, 0.0);
  float lightZenithCos = dot(up, uBakeLightDir);
  vec3 lightDir = normalize(vec3(sqrt(max(1.0 - lightZenithCos * lightZenithCos, 0.0)),
                                 lightZenithCos, 0.0));

  float viewZenithSin = sqrt(max(1.0 - viewZenithCos * viewZenithCos, 0.0));
  vec3 dir = vec3(
    viewZenithSin * lightViewCos,
    viewZenithCos,
    viewZenithSin * sqrt(max(1.0 - lightViewCos * lightViewCos, 0.0)));

  Scatter s = integrateScatter(pos, dir, lightDir, uSkyViewSteps, 9000000.0, true, true, 0.3);
  outLum = vec4(s.lum, 1.0);
  outMie = vec4(s.lumMie, 1.0);
}
`;

/**
 * Aerial perspective, parameterised in world terms rather than Hillaire's
 * camera froxels: (distance, view zenith, azimuth relative to the sun). That
 * makes it independent of where the camera looks, so it only needs rebaking
 * when the sun moves — and any consumer can sample it from a world position
 * without knowing our projection.
 */
export const AERIAL_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
layout(location = 0) out vec4 outInscatter;
layout(location = 1) out vec4 outTransmittance;

uniform vec3 uBakeLightDir;
uniform vec3 uAerialSize;
uniform float uAerialMaxDistance;
uniform float uAerialSlice;

void main() {
  /* u: sqrt-distributed distance. v: sqrt-distributed view zenith around the
     horizon, where nearly all geometry lives. slice: azimuth to the sun. */
  float u = texCoordToUnit(vUv.x, uAerialSize.x);
  float v = texCoordToUnit(vUv.y, uAerialSize.y);
  float w = uAerialSize.z > 1.0 ? uAerialSlice / (uAerialSize.z - 1.0) : 0.0;

  float dist = uAerialMaxDistance * u * u;
  float sv = v * 2.0 - 1.0;
  float mu = sign(sv) * sv * sv;
  float cosAz = 1.0 - 2.0 * w * w;

  vec3 pos = cameraPlanetPos();
  float sinZen = sqrt(max(1.0 - mu * mu, 0.0));

  /* Build the view direction in a frame whose +x points at the sun azimuth. */
  vec3 up = vec3(0.0, 1.0, 0.0);
  float lightZenithCos = dot(up, uBakeLightDir);
  vec3 lightDir = normalize(vec3(sqrt(max(1.0 - lightZenithCos * lightZenithCos, 0.0)),
                                 lightZenithCos, 0.0));
  vec3 dir = vec3(sinZen * cosAz, mu, sinZen * sqrt(max(1.0 - cosAz * cosAz, 0.0)));

  Scatter s = integrateScatter(pos, dir, lightDir, 24.0, max(dist, 0.001), false, true, 0.5);
  vec3 lum = s.lum + s.lumMie * phaseAerosol(dot(dir, lightDir));
  outInscatter = vec4(lum, 1.0);
  outTransmittance = vec4(s.transmittance, 1.0);
}
`;

/**
 * Two aggregates of the current sky, both from the same `evaluateSky` the screen
 * uses (minus sun disk and stars) so neither can disagree with what the player
 * sees. Rendered to a 2x1 float target and read back when the sky changes.
 *
 *   texel 0  cosine-weighted hemisphere average — the ambient term.
 *   texel 1  average around the horizon ring — the fog and aerial base colour,
 *            which is brighter and warmer than the hemisphere average and is
 *            what keeps a distant silhouette hazy-bright instead of grey.
 */
export const SKY_AMBIENT_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

void main() {
  vec3 sum = vec3(0.0);
  float weight = 0.0;

  if (vUv.x < 0.5) {
    /* 8x16 stratified hemisphere. cos(theta) = sqrt(1 - u) *is* the
       cosine-weighted distribution, so the directions already carry the weight
       and the estimator is a plain mean: E = pi * mean(L), and this value is
       E / pi, which is what a diffuse albedo wants to multiply. Weighting by
       cos a second time is the easy mistake, and it under-reads the horizon —
       the brightest part of the hemisphere — by about a seventh. */
    for (float i = 0.5; i < 8.0; i += 1.0) {
      float cosT = sqrt(1.0 - i / 8.0);
      float sinT = sqrt(max(1.0 - cosT * cosT, 0.0));
      for (float j = 0.5; j < 16.0; j += 1.0) {
        float phi = 2.0 * PI * (j / 16.0);
        vec3 dir = vec3(sinT * cos(phi), cosT, sinT * sin(phi));
        sum += evaluateSky(dir, false);
        weight += 1.0;
      }
    }
  } else {
    /* A band from just below to a few degrees above the horizon, all azimuths. */
    for (float i = 0.5; i < 3.0; i += 1.0) {
      float elev = mix(-0.008, 0.055, i / 3.0);
      float cosT = cos(elev);
      for (float j = 0.5; j < 24.0; j += 1.0) {
        float phi = 2.0 * PI * (j / 24.0);
        vec3 dir = vec3(cosT * cos(phi), sin(elev), cosT * sin(phi));
        sum += evaluateSky(dir, false);
        weight += 1.0;
      }
    }
  }
  gl_FragColor = vec4(sum / max(weight, 1e-5), 1.0);
}
`;
