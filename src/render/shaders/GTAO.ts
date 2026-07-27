import { GLSL_COMMON } from '../FullScreen';

/**
 * Ground-Truth Ambient Occlusion (horizon-search, Jimenez et al. style).
 *
 * Compared with classic hemisphere-sampling SSAO this converges to a much
 * more physically plausible cosine-weighted visibility integral, so contact
 * shadows tighten under crates and in door reveals instead of producing the
 * grey halo that instantly dates a renderer.
 */
export const GTAO_FRAG = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D tDepth;
uniform sampler2D tNormal;
uniform vec2  uResolution;
uniform vec2  uTexel;
uniform mat4  uProjection;
uniform mat4  uInverseProjection;
uniform float uNear;
uniform float uFar;
uniform float uRadius;         // world-space sampling radius, metres
uniform float uContactRadius;  // tight-radius contact term, metres
uniform float uIntensity;
uniform float uBias;           // normal bias to kill self-occlusion acne
uniform float uThickness;      // heuristic for un-occluding thin geometry
uniform float uMaxScreenRadius;
uniform float uFrame;

${GLSL_COMMON}

#ifndef SLICES
#define SLICES 3
#endif
#ifndef STEPS
#define STEPS 6
#endif

float readDepth(vec2 uv) {
  return texture2D(tDepth, uv).x;
}

vec3 viewPosFromDepth(vec2 uv, float rawDepth) {
  vec4 clip = vec4(uv * 2.0 - 1.0, rawDepth * 2.0 - 1.0, 1.0);
  vec4 view = uInverseProjection * clip;
  return view.xyz / view.w;
}

void main() {
  float rawDepth = readDepth(vUv);
  if (rawDepth >= 0.9999) {
    gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
    return;
  }

  vec3 P = viewPosFromDepth(vUv, rawDepth);
  vec3 N = normalize(texture2D(tNormal, vUv).xyz * 2.0 - 1.0);
  vec3 V = normalize(-P);

  // Screen-space radius shrinks with distance so the effect stays world-scale.
  float pixelRadius = uRadius * (uProjection[1][1] * 0.5) / max(-P.z, 0.05);
  pixelRadius = clamp(pixelRadius, 2.0 * uTexel.y, uMaxScreenRadius);

  // Per-pixel rotation + offset, animated across frames. TAA then resolves the
  // remaining noise into a clean gradient for free.
  vec3 rand = hash32(gl_FragCoord.xy + uFrame * 17.0);
  float rotJitter = rand.x;
  float stepJitter = rand.y;

  float visibility = 0.0;
  // Accumulated separately from the horizon integral: a short-range occlusion
  // estimate that survives the wide term's cosine weighting. Without it, a
  // 1-metre radius spreads its darkening over so many pixels that the seam
  // where two surfaces actually meet is no darker than the wall above it.
  float contactSum = 0.0;
  float contactWeight = 0.0;

  for (int s = 0; s < SLICES; s++) {
    float phi = (float(s) + rotJitter) * (PI / float(SLICES));
    vec2 dir = vec2(cos(phi), sin(phi));
    vec2 sliceStep = dir * pixelRadius / float(STEPS);
    // Correct for aspect so the world-space radius is isotropic on screen.
    sliceStep.x *= uResolution.y / uResolution.x;

    // Project the surface normal into the slice plane; the horizon angles are
    // measured relative to this, which is what makes GTAO cosine-correct.
    vec3 sliceDir = vec3(dir, 0.0);
    vec3 orthoDir = sliceDir - dot(sliceDir, V) * V;
    vec3 axis = cross(sliceDir, V);
    vec3 projN = N - axis * dot(N, axis);
    float projNLen = length(projN);
    if (projNLen < 1e-4) continue;
    projN /= projNLen;

    float sgn = sign(dot(orthoDir, projN));
    float cosN = clamp(dot(projN, V), -1.0, 1.0);
    float n = sgn * acos(cosN);

    float h0 = -1.0; // cos of max horizon angle, side 0
    float h1 = -1.0; // side 1

    for (int t = 1; t <= STEPS; t++) {
      float f = (float(t) - stepJitter) / float(STEPS);
      // Quadratic spacing concentrates samples near the shading point, where
      // occlusion contributes most.
      vec2 off = sliceStep * f * f * float(STEPS);

      vec2 uvA = vUv + off;
      vec2 uvB = vUv - off;

      if (uvA.x > 0.0 && uvA.x < 1.0 && uvA.y > 0.0 && uvA.y < 1.0) {
        vec3 sA = viewPosFromDepth(uvA, readDepth(uvA)) - P;
        float dA = length(sA);
        float cA = dot(sA / max(dA, 1e-5), V);
        float fallA = clamp(1.0 - (dA - uRadius * uThickness) / max(uRadius, 1e-4), 0.0, 1.0);
        h0 = max(h0, mix(-1.0, cA, fallA));

        float nearA = clamp(1.0 - dA / uContactRadius, 0.0, 1.0);
        contactSum += max(dot(sA / max(dA, 1e-5), N) - uBias, 0.0) * nearA * nearA;
        contactWeight += 1.0;
      }
      if (uvB.x > 0.0 && uvB.x < 1.0 && uvB.y > 0.0 && uvB.y < 1.0) {
        vec3 sB = viewPosFromDepth(uvB, readDepth(uvB)) - P;
        float dB = length(sB);
        float cB = dot(sB / max(dB, 1e-5), V);
        float fallB = clamp(1.0 - (dB - uRadius * uThickness) / max(uRadius, 1e-4), 0.0, 1.0);
        h1 = max(h1, mix(-1.0, cB, fallB));

        float nearB = clamp(1.0 - dB / uContactRadius, 0.0, 1.0);
        contactSum += max(dot(sB / max(dB, 1e-5), N) - uBias, 0.0) * nearB * nearB;
        contactWeight += 1.0;
      }
    }

    float t0 = n + max(-acos(clamp(h0, -1.0, 1.0)) - n, -PI * 0.5);
    float t1 = n + min( acos(clamp(h1, -1.0, 1.0)) - n,  PI * 0.5);

    float inner0 = -cos(2.0 * t0 - n) + cos(n) + 2.0 * t0 * sin(n);
    float inner1 = -cos(2.0 * t1 - n) + cos(n) + 2.0 * t1 * sin(n);
    visibility += projNLen * 0.25 * (inner0 + inner1);
  }

  visibility /= float(SLICES);
  visibility = clamp(visibility, 0.0, 1.0);

  float ao = pow(visibility, uIntensity);

  float contact = 1.0 - clamp(contactSum / max(contactWeight, 1.0) * 2.6, 0.0, 1.0);
  contact = pow(contact, 1.4);

  // Store linear view depth alongside AO so the bilateral blur can be
  // edge-aware without a second depth fetch.
  gl_FragColor = vec4(ao, -P.z / uFar, contact, 1.0);
}
`;

/** Edge-aware separable blur used to denoise the GTAO result. */
export const AO_BLUR_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tAO;
uniform vec2 uTexel;
uniform vec2 uDirection;
uniform float uDepthSigma;

void main() {
  vec3 center = texture2D(tAO, vUv).xyz;
  float centerDepth = center.y;

  vec2 sum = center.xz;
  float wsum = 1.0;

  // 9-tap Gaussian, depth-weighted.
  const float weights[4] = float[4](0.2270, 0.1945, 0.1216, 0.0540);

  for (int i = 1; i <= 3; i++) {
    vec2 off = uDirection * uTexel * float(i) * 1.6;
    vec3 a = texture2D(tAO, vUv + off).xyz;
    vec3 b = texture2D(tAO, vUv - off).xyz;
    float wa = weights[i] * exp(-abs(a.y - centerDepth) * uDepthSigma);
    float wb = weights[i] * exp(-abs(b.y - centerDepth) * uDepthSigma);
    sum += a.xz * wa + b.xz * wb;
    wsum += wa + wb;
  }

  sum /= wsum;
  gl_FragColor = vec4(sum.x, centerDepth, sum.y, 1.0);
}
`;

/**
 * Multiplies AO into the lit HDR buffer.
 *
 * The occlusion is applied through Jimenez's multi-bounce fit rather than
 * directly. A cavity in a bright material returns most of the light it
 * receives back to itself, so raw visibility over-darkens pale surfaces badly;
 * the usual workaround is to mask AO off wherever the pixel is bright, which
 * removes it from every sunlit contact point in the frame — precisely where the
 * eye looks for it. The multi-bounce curve makes that mask unnecessary, so AO
 * can run at full strength everywhere and still keep plaster looking like
 * plaster.
 *
 * Ambient occlusion occludes *ambient*. Applied to the whole lit buffer it also
 * attenuates the sun, and at a room-scale radius that turns it into a broad
 * global dimmer: measured over a rooftop it cost one and two-thirds stops of
 * mean scene luminance, which the auto-exposure then spent its entire range
 * clawing back. The result is a frame with no contrast anywhere and no visible
 * contact darkening either, because the occlusion signal has been spread evenly
 * across every surface instead of concentrated where surfaces meet.
 *
 * There is no G-buffer to split direct from indirect, so the split is estimated
 * from the sun's geometric term and the preset's own sun-to-sky ratio: a face
 * turned to the sun is mostly beam and barely takes any occlusion, a face turned
 * away is lit only by sky and takes all of it. The one case this gets wrong — a
 * sun-facing surface that happens to be in shadow — errs toward too little
 * occlusion, which is the harmless direction.
 */
export const AO_APPLY_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene;
uniform sampler2D tAO;
uniform sampler2D tNormal;
uniform vec3  uBounceTint;
uniform float uStrength;
uniform float uContactStrength;
uniform float uFloor;
/** Sun direction in view space, pointing toward the sun. */
uniform vec3  uSunViewDir;
/** Beam-to-ambient response ratio for a surface facing the sun squarely. */
uniform float uSunOverAmbient;

uniform sampler2D tDepth;
uniform mat4  uInverseViewProjection;
uniform mat4  uViewMatrix;
uniform int   uCascadeCount;
uniform sampler2D tShadow0;
uniform sampler2D tShadow1;
uniform mat4  uShadowMatrix0;
uniform mat4  uShadowMatrix1;
uniform float uCascadeSplit0;
uniform float uCascadeSplit1;

float cascadeLit(sampler2D shadowMap, mat4 shadowMatrix, vec3 worldPos, float bias) {
  vec4 sc = shadowMatrix * vec4(worldPos, 1.0);
  sc /= sc.w;
  if (sc.z > 1.0) return 1.0;
  vec2 edge = min(sc.xy, 1.0 - sc.xy);
  float inside = smoothstep(0.0, 0.06, min(edge.x, edge.y));
  if (inside <= 0.0) return 1.0;
  float d = texture2D(shadowMap, sc.xy).x;
  return mix(1.0, sc.z - bias > d ? 0.0 : 1.0, inside);
}

/**
 * Whether the sun actually reaches this pixel.
 *
 * The geometric term on its own cannot answer that, and the difference matters
 * because it decides how much of the pixel's light the occlusion term is
 * entitled to remove. Indoors every sunward-facing wall in the room passes an
 * N.L test while receiving no beam whatsoever, so exempting them left interiors
 * as flat evenly-lit plaster with no darkening in a single arch soffit or wall
 * junction. Outdoors the same error removes occlusion from everything standing
 * in a building's cast shadow.
 *
 * Reading the cascades directly is the unambiguous answer. Estimating it from
 * the occlusion term instead — a point that cannot see the sky cannot see the
 * sun — sounds equivalent and is not: at a room-scale radius a cluttered street
 * of awnings and market stalls scores as low as a room does, and the frame loses
 * a quarter of its range to occlusion that no interior needed.
 */
float sunVisibility(vec2 uv) {
  if (uCascadeCount == 0) return 1.0;
  float rawDepth = texture2D(tDepth, uv).x;
  if (rawDepth >= 0.9999) return 1.0;

  vec4 clip = vec4(uv * 2.0 - 1.0, rawDepth * 2.0 - 1.0, 1.0);
  vec4 world = uInverseViewProjection * clip;
  world /= world.w;
  float viewDepth = -(uViewMatrix * vec4(world.xyz, 1.0)).z;

  float lit = 1.0;
  if (viewDepth < uCascadeSplit0) {
    lit = cascadeLit(tShadow0, uShadowMatrix0, world.xyz, 0.0016);
    if (uCascadeCount > 1) {
      float blend = smoothstep(uCascadeSplit0 * 0.8, uCascadeSplit0, viewDepth);
      if (blend > 0.0) {
        lit = mix(lit, cascadeLit(tShadow1, uShadowMatrix1, world.xyz, 0.0032), blend);
      }
    }
  } else if (uCascadeCount > 1 && viewDepth < uCascadeSplit1) {
    lit = cascadeLit(tShadow1, uShadowMatrix1, world.xyz, 0.0032);
    lit = mix(lit, 1.0, smoothstep(uCascadeSplit1 * 0.75, uCascadeSplit1, viewDepth));
  }
  return lit;
}

vec3 multiBounce(float visibility, vec3 albedo) {
  vec3 a =  2.0404 * albedo - 0.3324;
  vec3 b = -4.7951 * albedo + 0.6417;
  vec3 c =  2.7552 * albedo + 0.6903;
  return clamp(max(vec3(visibility), ((visibility * a + b) * visibility + c) * visibility),
               0.0, 1.0);
}

void main() {
  vec3 color = texture2D(tScene, vUv).rgb;
  vec2 ao = texture2D(tAO, vUv).xz;

  // Tight-radius occlusion is applied on top of the wide term and deliberately
  // is not softened by multi-bounce: a contact seam is a genuinely dark line,
  // and it is the cue that stops props reading as decals pasted on the ground.
  float wide = mix(1.0, ao.x, uStrength);
  float contact = mix(1.0, ao.y, uContactStrength);

  // No G-buffer here, so the lit colour stands in for reflectance — but only
  // its *hue* may be taken from the lit colour, never its level.
  //
  // Reinhard of the raw HDR value was the obvious way to get a 0..1 albedo out
  // of it and it is wrong in the one place the term matters. A shaded facade of
  // 0.45-albedo plaster arrives here at a scene-linear 0.03, so it proxies as
  // an albedo of 0.03, multi-bounce reads it as soot and returns none of the
  // inter-reflection that stops a cavity going black. The result was that AO
  // ran at its harshest exactly where the frame has the least light to spare:
  // pushing it hard enough to model an interior crushed a fifth of a sunlit
  // street to zero. Normalising to the brightest channel keeps the bounce hue
  // and pins the level to a plausible mid albedo, which makes the response
  // independent of exposure and of whether the pixel happens to be in shadow.
  float peak = max(max(color.r, color.g), color.b);
  vec3 proxy = peak > 1e-5 ? color * (0.52 / peak) : vec3(0.52);
  // A room-scale radius sees so much occluding geometry that raw visibility
  // approaches zero indoors, and nothing downstream can recover a pixel that
  // has been multiplied to nothing. Real cavities are never unlit: light that
  // has bounced several times still reaches them, so the term is floored.
  vec3 occlusion = max(multiBounce(wide, proxy) * contact, vec3(uFloor));

  // Fraction of this pixel's response that arrived as ambient, and so the
  // fraction the occlusion is allowed to touch.
  //
  // The geometric term alone is not enough to decide that. Indoors, half the
  // surfaces in the room still face sunward, so N.L exempts them from occlusion
  // even though no beam reaches any of them — which is why an interior came out
  // as flat evenly-lit plaster with no darkening in a single arch soffit, wall
  // junction or door reveal. Outdoors the same error quietly removes occlusion
  // from everything standing in a building's cast shadow.
  //
  // Visibility of the sky is the missing factor. A point that cannot see the
  // sky cannot see the sun in it either, so the wide occlusion term doubles as a
  // sun-visibility estimate — the same cone-versus-occlusion reasoning that
  // stands in for directional occlusion elsewhere. Enclosure now removes the
  // beam from the estimate and hands the pixel back to the occlusion term, while
  // an open sunlit wall is unaffected because its visibility is already 1.
  vec3 N = normalize(texture2D(tNormal, vUv).xyz * 2.0 - 1.0);
  float ndl = max(dot(N, uSunViewDir), 0.0);
  float beam = ndl * sunVisibility(vUv);
  float ambientShare = 1.0 / (1.0 + beam * uSunOverAmbient);
  occlusion = mix(vec3(1.0), occlusion, ambientShare);

  vec3 occluded = color * occlusion;
  // Occluded cavities are not black — they are filled by light that has bounced
  // off their own walls, so the falloff carries a little of the bounce hue.
  float amount = 1.0 - dot(occlusion, vec3(0.3333));
  gl_FragColor = vec4(mix(occluded, occluded * uBounceTint, amount * 0.5), 1.0);
}
`;
