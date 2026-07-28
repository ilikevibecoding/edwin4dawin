import { GLSL_BILATERAL, GLSL_COLOR, GLSL_CONST, GLSL_DEPTH, GLSL_NOISE } from './common.glsl';

/**
 * Ground-truth ambient occlusion.
 *
 * This is the slice-based visibility integral from Jimenez et al. 2016, not a
 * hemisphere-sample SSAO: for each of a handful of slices through the view
 * vector we search left and right for the horizon, then evaluate the *analytic*
 * cosine-weighted arc integral between those two horizons. The difference is not
 * subtle — a sample-counting SSAO converges to a noisy estimate of the wrong
 * integral (it ignores the cosine term and double-counts occluders), which is
 * why it needs so much blur and still reads as dirt rather than contact
 * shadowing.
 *
 * Runs at half resolution and is bilaterally upsampled. The occlusion is applied
 * to ambient light only, in `AO_COMPOSITE_FRAG`.
 */
export const GTAO_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${GLSL_NOISE}
${GLSL_DEPTH}

in vec2 vUv;

/** Half-res linear depth: r = nearest, g = farthest of the source 2x2. */
uniform sampler2D uHiZ;
uniform sampler2D uNormal;
uniform vec2 uTexel;
uniform vec2 uResolution;
uniform vec2 uNearFar;
uniform mat4 uProjInv;
uniform mat3 uWorldToView;
uniform float uRadius;
/** Half-res pixels per world unit at one metre of depth. */
uniform float uProjScale;
uniform float uThickness;
uniform float uFrame;

out vec4 fragColor;

#ifndef SLICES
#define SLICES 3
#endif
#ifndef STEPS
#define STEPS 6
#endif

vec3 viewPos(vec2 uv, float depth) {
  return viewRayFromUv(uv, uProjInv) * depth;
}

void main() {
  float d = texture(uHiZ, vUv).r;
  vec3 N = normalize(uWorldToView * texture(uNormal, vUv).xyz);

  // Sky: fully unoccluded, bent normal facing the viewer.
  if (d >= uNearFar.y * 0.995) {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 P = viewPos(vUv, d);
  vec3 V = normalize(-P);

  // Rotating the slice set per pixel and per frame turns the residual banding
  // into noise the denoiser and TAA can eat.
  float rotation = ignAnimated(gl_FragCoord.xy, uFrame) * PI;
  float stepOffset = fract(ignAnimated(gl_FragCoord.yx * 1.7, uFrame * 1.61) + 0.5);

  float radiusPixels = clamp(uRadius * uProjScale / d, 3.0, 96.0);
  float stepPixels = radiusPixels / float(STEPS);

  float visibility = 0.0;
  vec3 bent = vec3(0.0);
  float sliceCount = 0.0;

  for (int s = 0; s < SLICES; s++) {
    float phi = rotation + float(s) * PI / float(SLICES);
    vec2 dir = vec2(cos(phi), sin(phi));

    // Basis of the slice plane: axis is its normal, T lies in the plane and
    // points along +dir on screen, so an angle measured from V is signed.
    vec3 axis = cross(vec3(dir, 0.0), V);
    float axisLen = length(axis);
    if (axisLen < 1e-5) continue;
    axis /= axisLen;
    vec3 T = cross(V, axis);

    vec3 projN = N - axis * dot(N, axis);
    float projLen = length(projN);
    if (projLen < 1e-4) continue;
    vec3 projNn = projN / projLen;

    // Signed angle of the projected normal from V, positive toward +dir.
    float gamma = sign(dot(projNn, T)) * acos(clamp(dot(projNn, V), -1.0, 1.0));

    // Horizons start at the tangent plane, which is what makes an unoccluded
    // surface integrate to exactly 1 instead of 1 minus a bias.
    float cosH0 = cos(gamma + HALF_PI);
    float cosH1 = cos(gamma - HALF_PI);

    for (int i = 0; i < STEPS; i++) {
      float dist = (float(i) + stepOffset) * stepPixels + 1.0;
      vec2 offset = dir * dist * uTexel;

      vec2 uv0 = vUv + offset;
      vec2 uv1 = vUv - offset;

      float d0 = texture(uHiZ, uv0).r;
      float d1 = texture(uHiZ, uv1).r;

      vec3 delta0 = viewPos(uv0, d0) - P;
      vec3 delta1 = viewPos(uv1, d1) - P;
      float len0 = length(delta0);
      float len1 = length(delta1);

      float c0 = dot(delta0, V) / max(len0, 1e-5);
      float c1 = dot(delta1, V) / max(len1, 1e-5);

      // Range falloff. Without it a wall two rooms away occludes the foreground,
      // which is the classic SSAO halo. The tail is soft so an occluder crossing
      // the radius does not pop.
      float w0 = 1.0 - smoothstep(uRadius * 0.65, uRadius, len0);
      float w1 = 1.0 - smoothstep(uRadius * 0.65, uRadius, len1);
      // Off-screen samples carry no information; treat them as unoccluded.
      w0 *= (uv0.x > 0.0 && uv0.x < 1.0 && uv0.y > 0.0 && uv0.y < 1.0) ? 1.0 : 0.0;
      w1 *= (uv1.x > 0.0 && uv1.x < 1.0 && uv1.y > 0.0 && uv1.y < 1.0) ? 1.0 : 0.0;

      // Thin-occluder compensation. The horizon search assumes the depth buffer
      // is a height field, so a railing occludes as if it were a wall extending
      // to infinity behind it. Once the march has moved *past* an occluder — the
      // running horizon is higher than what this sample sees — the horizon is
      // allowed to relax back toward the sample, which lets a thin object stop
      // occluding once you have looked over it.
      float shc0 = mix(cosH0, c0, w0);
      float shc1 = mix(cosH1, c1, w1);
      float new0 = max(cosH0, shc0);
      float new1 = max(cosH1, shc1);
      cosH0 = cosH0 > shc0 ? mix(new0, shc0, uThickness) : new0;
      cosH1 = cosH1 > shc1 ? mix(new1, shc1, uThickness) : new1;
    }

    float h0 = acos(clamp(cosH0, -1.0, 1.0));
    float h1 = -acos(clamp(cosH1, -1.0, 1.0));
    // Clamp each horizon into the hemisphere around the normal.
    h0 = gamma + min(h0 - gamma, HALF_PI);
    h1 = gamma + max(h1 - gamma, -HALF_PI);

    float sinGamma = sin(gamma);
    float cosGamma = cos(gamma);
    float arc = 0.25 * (-cos(2.0 * h0 - gamma) + cosGamma + 2.0 * h0 * sinGamma) +
                0.25 * (-cos(2.0 * h1 - gamma) + cosGamma + 2.0 * h1 * sinGamma);

    // Weighted by the projected normal's length and normalised by the *slice
    // count*, not by the summed weight.
    //
    // The two are not interchangeable and getting it wrong is silent. The arc
    // integral is a cosine-weighted visibility in the slice plane, so on its own
    // it exceeds 1 whenever the normal leans away from the view vector, and it is
    // the |projN| factor that pays that back across the slice set: the product
    // integrates to exactly 1 over a full unoccluded hemisphere at any tilt.
    // Dividing by sum(projLen) instead cancels the factor that was doing the
    // normalising, leaving up to 55% overestimation at grazing angles — which the
    // clamp below then absorbs, so the pass looks like it works and quietly
    // reports no occlusion until a surface is more than half enclosed.
    visibility += projLen * arc;
    sliceCount += 1.0;

    // Bent normal: the bisector of the unoccluded arc, weighted by how much of
    // the hemisphere this slice actually sees.
    float mid = (h0 + h1) * 0.5;
    bent += (V * cos(mid) + T * sin(mid)) * projLen * arc;
  }

  float ao = sliceCount > 0.5 ? clamp(visibility / sliceCount, 0.0, 1.0) : 1.0;
  vec3 bentN = length(bent) > 1e-5 ? normalize(bent) : N;

  fragColor = vec4(ao, bentN);
}
`;

/**
 * Spatial + temporal denoise of the AO buffer, in one pass.
 *
 * The spatial half is a depth-weighted cross rather than a box blur: AO must
 * stay pinned to the silhouette that produced it, and a plain blur is what
 * makes screen-space AO read as a grey smear that lags behind edges. The
 * temporal half reprojects through the velocity buffer and clamps against the
 * local neighbourhood so a moving object cannot drag its occlusion behind it.
 */
export const AO_DENOISE_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${GLSL_DEPTH}

in vec2 vUv;
uniform sampler2D uAO;
uniform sampler2D uHistory;
uniform sampler2D uVelocity;
uniform sampler2D uHiZ;
uniform vec2 uTexel;
uniform vec2 uNearFar;
uniform float uFeedback;
uniform float uReset;
out vec4 fragColor;

void main() {
  float centerDepth = texture(uHiZ, vUv).r;

  vec4 sum = vec4(0.0);
  float wsum = 0.0;
  float mn = 1.0;
  float mx = 0.0;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 uv = vUv + vec2(float(x), float(y)) * uTexel;
      vec4 s = texture(uAO, uv);
      float d = texture(uHiZ, uv).r;
      // Depth similarity, scaled by distance so the tolerance stays in
      // proportion to the local depth slope.
      float w = exp(-abs(d - centerDepth) / max(centerDepth * 0.035, 0.02));
      // Slight centre bias keeps contact shadows from washing out.
      w *= (x == 0 && y == 0) ? 2.0 : 1.0;
      sum += s * w;
      wsum += w;
      mn = min(mn, s.r);
      mx = max(mx, s.r);
    }
  }

  vec4 spatial = wsum > 1e-4 ? sum / wsum : texture(uAO, vUv);

  vec2 velocity = texture(uVelocity, vUv).xy;
  vec2 prevUv = vUv - velocity;
  bool valid = prevUv.x > 0.0 && prevUv.x < 1.0 && prevUv.y > 0.0 && prevUv.y < 1.0 &&
    uReset < 0.5;

  vec4 result = spatial;
  if (valid) {
    vec4 history = texture(uHistory, prevUv);
    // Clamping to the spatial neighbourhood is what removes the smear: any
    // history that disagrees with what this pixel can currently see is wrong.
    history.r = clamp(history.r, mn, mx);
    float speed = length(velocity * vec2(textureSize(uAO, 0)));
    float feedback = uFeedback * exp(-speed * 0.35);
    result = mix(spatial, history, clamp(feedback, 0.0, 0.96));
  }

  fragColor = result;
}
`;

/**
 * Applies AO to the scene, multiplicatively, using `dst * src` blending.
 *
 * The critical part is what it multiplies. AO is a visibility term for
 * *ambient* light; multiplying the shaded frame by it darkens direct sunlight
 * too, which is the single most common way to make a game look muddy — real
 * sunlit concrete next to a wall does not get darker just because the wall is
 * there. So this reconstructs the ratio of ambient to total irradiance from the
 * G-buffer normal, the sun and sky radiance and one shadow-map lookup, and only
 * darkens that fraction. The ratio is albedo-independent, which is what makes it
 * usable in a forward renderer with no albedo buffer.
 */
export function aoCompositeFrag(compare: boolean): string {
  const samplerType = compare ? 'highp sampler2DShadow' : 'highp sampler2D';
  const lookup = compare
    ? 'texture(uShadowMap, vec3(uvz.xy, uvz.z - 0.0025))'
    : '(uvz.z - 0.0025 > texture(uShadowMap, uvz.xy).r ? 0.0 : 1.0)';

  return /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${GLSL_DEPTH}
${GLSL_BILATERAL}

in vec2 vUv;
uniform sampler2D uAO;
uniform sampler2D uDepth;
uniform sampler2D uHalfDepth;
uniform sampler2D uNormal;
uniform ${samplerType} uShadowMap;
uniform mat4 uShadowMatrix;
uniform mat4 uInvViewProj;
uniform vec2 uHalfTexel;
uniform vec2 uNearFar;
uniform vec3 uSunColor;
uniform vec3 uSkyColor;
uniform vec3 uSunDirection;
uniform float uIntensity;
uniform float uPower;
uniform float uHasShadow;
out vec4 fragColor;

/**
 * Depth-aware upsample against the half-res linear depth the AO was traced
 * from, so the AO edge lands on the geometry edge and not one full-res pixel
 * off it.
 */
vec4 upsampleAO(float centerDepth) {
  vec4 sum = vec4(0.0);
  float wsum = 0.0;
  for (int y = 0; y < 2; y++) {
    for (int x = 0; x < 2; x++) {
      vec2 uv = vUv + (vec2(float(x), float(y)) - 0.5) * uHalfTexel * 2.0;
      vec4 s = texture(uAO, uv);
      float d = texture(uHalfDepth, uv).r;
      float w = exp(-abs(d - centerDepth) / max(centerDepth * 0.04, 0.02));
      sum += s * w;
      wsum += w;
    }
  }
  return wsum > 1e-4 ? sum / wsum : texture(uAO, vUv);
}

vec3 worldFromDepth(vec2 uv, float rawDepth) {
  vec4 clip = vec4(uv * 2.0 - 1.0, rawDepth * 2.0 - 1.0, 1.0);
  vec4 w = uInvViewProj * clip;
  return w.xyz / w.w;
}

float sunShadow(vec3 worldPos) {
  if (uHasShadow < 0.5) return 1.0;
  vec4 sc = uShadowMatrix * vec4(worldPos, 1.0);
  vec3 uvz = sc.xyz / max(sc.w, 1e-6);
  if (uvz.x < 0.0 || uvz.x > 1.0 || uvz.y < 0.0 || uvz.y > 1.0 || uvz.z > 1.0) return 1.0;
  return ${lookup};
}

void main() {
  float raw = texture(uDepth, vUv).r;
  if (raw >= 1.0) {
    fragColor = vec4(1.0);
    return;
  }
  float depth = linearizeDepth(raw, uNearFar.x, uNearFar.y);
  float ao = pow(clamp(upsampleAO(depth).r, 0.0, 1.0), uPower);

  vec4 nr = texture(uNormal, vUv);
  vec3 N = normalize(nr.xyz);

  float shadow = sunShadow(worldFromDepth(vUv, raw));
  float ndl = max(dot(N, uSunDirection), 0.0);
  // Both terms must be irradiances for the ratio to mean anything: the sun
  // arrives as one, the sky arrives as a radiance and integrates to pi times it
  // over the hemisphere.
  float direct = luma(uSunColor) * ndl * shadow;
  float ambient = PI * luma(uSkyColor) * (0.55 + 0.45 * N.y);
  float ambientFraction = ambient / max(ambient + direct, 1e-4);

  float occlusion = mix(1.0, ao, clamp(ambientFraction * uIntensity, 0.0, 1.0));
  fragColor = vec4(vec3(occlusion), 1.0);
}
`;
}
