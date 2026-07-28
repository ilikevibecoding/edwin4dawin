/**
 * Analytic single-scattering atmosphere, ray-marched into a cube map and then
 * PMREM-filtered for image based lighting.
 *
 * Everything specular in the game reflects this, and every diffuse surface takes
 * its ambient from it, so it has to carry a real luminance range: a sun disc
 * three orders of magnitude above the sky, a sunlit ground bounce a few times
 * the zenith, and a horizon band between them. A flat grey environment map is
 * what makes hobbyist WebGL metal look like grey plastic.
 */
export const SKY_VERTEX_GLSL = /* glsl */ `
out vec3 vDirection;

void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export function buildSkyFragment(viewSteps: number, lightSteps: number): string {
  return /* glsl */ `
precision highp float;

in vec3 vDirection;

layout(location = 0) out vec4 outColor;

uniform vec3 uSunDirection;
uniform float uSunIntensity;
uniform float uMieStrength;
uniform float uSunDiscRadiance;
uniform float uSunGlow;
uniform float uSunAngular;
uniform vec3 uGroundAlbedo;
uniform float uGroundBounce;
uniform float uGain;

const float PLANET_R = 6371000.0;
const float ATMOS_R = 6471000.0;
const float OBSERVER_H = 250.0;
const vec3 RAYLEIGH_BETA = vec3(5.8e-6, 13.5e-6, 33.1e-6);
const float MIE_BETA = 2.1e-5;
const float H_RAYLEIGH = 8000.0;
const float H_MIE = 1200.0;
const float MIE_G = 0.76;
const int VIEW_STEPS = ${Math.max(4, Math.round(viewSteps))};
const int LIGHT_STEPS = ${Math.max(2, Math.round(lightSteps))};
const float PI = 3.141592653589793;

float sat1(float x) { return clamp(x, 0.0, 1.0); }

/** Near/far intersections with a sphere centred on the origin; far < near on a miss. */
vec2 raySphere(vec3 origin, vec3 dir, float radius) {
  float b = dot(origin, dir);
  float c = dot(origin, origin) - radius * radius;
  float d = b * b - c;
  if (d < 0.0) return vec2(1.0, -1.0);
  d = sqrt(d);
  return vec2(-b - d, -b + d);
}

/** In-scattered radiance along a view ray, clipped to the first surface hit. */
vec3 inscatter(vec3 origin, vec3 dir, vec3 sunDir) {
  vec2 atmos = raySphere(origin, dir, ATMOS_R);
  if (atmos.x > atmos.y) return vec3(0.0);

  float near = max(atmos.x, 0.0);
  float far = atmos.y;
  vec2 ground = raySphere(origin, dir, PLANET_R);
  if (ground.x > 0.0) far = min(far, ground.x);
  float stepSize = (far - near) / float(VIEW_STEPS);
  if (stepSize <= 0.0) return vec3(0.0);

  float mu = dot(dir, sunDir);
  float mu2 = mu * mu;
  float gg = MIE_G * MIE_G;
  float phaseR = 3.0 / (16.0 * PI) * (1.0 + mu2);
  float phaseM = 3.0 / (8.0 * PI) * ((1.0 - gg) * (1.0 + mu2)) /
    ((2.0 + gg) * pow(max(1.0 + gg - 2.0 * MIE_G * mu, 1e-4), 1.5));

  float mieBeta = MIE_BETA * uMieStrength;

  vec3 sumR = vec3(0.0);
  vec3 sumM = vec3(0.0);
  float odR = 0.0;
  float odM = 0.0;
  float t = near;

  for (int i = 0; i < VIEW_STEPS; i++) {
    vec3 p = origin + dir * (t + stepSize * 0.5);
    float h = length(p) - PLANET_R;
    float dR = exp(-h / H_RAYLEIGH) * stepSize;
    float dM = exp(-h / H_MIE) * stepSize;
    odR += dR;
    odM += dM;

    // Optical depth from the sample point towards the sun.
    vec2 sunHit = raySphere(p, sunDir, ATMOS_R);
    float sunStep = sunHit.y / float(LIGHT_STEPS);
    float sodR = 0.0;
    float sodM = 0.0;
    float st = 0.0;
    for (int j = 0; j < LIGHT_STEPS; j++) {
      vec3 sp = p + sunDir * (st + sunStep * 0.5);
      float sh = length(sp) - PLANET_R;
      sodR += exp(-sh / H_RAYLEIGH) * sunStep;
      sodM += exp(-sh / H_MIE) * sunStep;
      st += sunStep;
    }

    // Shadowed by the planet itself: no direct light reaches this sample.
    vec2 blocker = raySphere(p, sunDir, PLANET_R);
    float shadow = (blocker.x <= blocker.y && blocker.y > 0.0) ? 0.0 : 1.0;
    vec3 attenuation = exp(-(RAYLEIGH_BETA * (odR + sodR) + mieBeta * (odM + sodM)));
    sumR += dR * attenuation * shadow;
    sumM += dM * attenuation * shadow;
    t += stepSize;
  }

  return uSunIntensity * (phaseR * RAYLEIGH_BETA * sumR + phaseM * mieBeta * sumM);
}

/** Transmittance from the observer straight up through the sun's path. */
vec3 sunTransmittance(vec3 origin, vec3 sunDir) {
  vec2 hit = raySphere(origin, sunDir, ATMOS_R);
  float stepSize = max(hit.y, 0.0) / float(LIGHT_STEPS);
  float odR = 0.0;
  float odM = 0.0;
  float t = 0.0;
  for (int j = 0; j < LIGHT_STEPS; j++) {
    vec3 p = origin + sunDir * (t + stepSize * 0.5);
    float h = length(p) - PLANET_R;
    odR += exp(-h / H_RAYLEIGH) * stepSize;
    odM += exp(-h / H_MIE) * stepSize;
    t += stepSize;
  }
  return exp(-(RAYLEIGH_BETA * odR + MIE_BETA * uMieStrength * odM));
}

vec3 sunDisc(vec3 dir, vec3 sunDir, vec3 transmittance) {
  float angle = acos(clamp(dot(dir, sunDir), -1.0, 1.0));
  float edge = sat1(angle / max(uSunAngular, 1e-5));
  float core = 1.0 - smoothstep(0.82, 1.0, edge);
  // Limb darkening: without it the disc reads as a pasted-on circle.
  float limb = mix(0.62, 1.0, sqrt(max(0.0, 1.0 - edge * edge)));
  float glow = exp(-angle * 26.0) * 0.7 + exp(-angle * 4.5) * 0.055;
  return transmittance * (core * limb * uSunDiscRadiance + glow * uSunGlow);
}

void main() {
  vec3 dir = normalize(vDirection);
  vec3 sunDir = normalize(uSunDirection);
  vec3 origin = vec3(0.0, PLANET_R + OBSERVER_H, 0.0);
  vec3 transmittance = sunTransmittance(origin, sunDir);

  vec3 colour;
  if (dir.y >= 0.0) {
    colour = inscatter(origin, dir, sunDir) + sunDisc(dir, sunDir, transmittance);
  } else {
    // Lambertian ground: L = albedo / pi * E. Both terms of E matter, but the sun
    // is an order of magnitude the larger, and dropping it — which a bounce
    // written as a fraction of the sky above does — leaves the probe's lower
    // hemisphere twenty times too dim. Every shadow in the game is then filled by
    // blue sky alone and every interior gets nothing at all, which is the single
    // biggest reason a real-time scene reads as cold and computer-generated.
    //
    // The sky's contribution uses the measured ratio between hemispheric sky
    // irradiance and the radiance of the patch directly overhead (about 6 for
    // this atmosphere); it is an 8% correction on the sun term, so the ratio's
    // own drift with elevation is not worth another march to resolve.
    vec3 mirrored = normalize(vec3(dir.x, -dir.y, dir.z));
    vec3 skyAbove = inscatter(origin, mirrored, sunDir);
    vec3 grazing = inscatter(origin, normalize(vec3(dir.x, 0.02, dir.z)), sunDir);
    float sunUp = max(sunDir.y, 0.0);
    vec3 irradiance = transmittance * uSunIntensity * sunUp + skyAbove * 6.0;
    vec3 lit = uGroundAlbedo * uGroundBounce * (1.0 / PI) * irradiance;
    colour = mix(grazing, lit, smoothstep(0.0, 0.045, -dir.y));
  }

  outColor = vec4(max(colour * uGain, vec3(0.0)), 1.0);
}
`;
}
