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

/** Overhead height map of the static world; see SkyMask. */
uniform sampler2D tSkyMask;
uniform mat4  uSkyMaskMatrix;
uniform float uSkyMaskTop;
uniform float uSkyMaskRange;
/** 0 until the mask has been baked, so the first frames are open rather than sealed. */
uniform float uSkyMaskAmount;
/** Radius of the disc of mask samples, metres. */
uniform float uSkyRadius;
/** Clearance a blocker must have over the point before it counts, metres. */
uniform float uSkyClearance;
/** View → world, for the mask lookup. */
uniform mat4  uInverseViewMatrix;

${GLSL_COMMON}

#ifndef SLICES
#define SLICES 3
#endif
#ifndef STEPS
#define STEPS 6
#endif
#define SKY_TAPS 13

float readDepth(vec2 uv) {
  return texture2D(tDepth, uv).x;
}

vec3 viewPosFromDepth(vec2 uv, float rawDepth) {
  vec4 clip = vec4(uv * 2.0 - 1.0, rawDepth * 2.0 - 1.0, 1.0);
  vec4 view = uInverseProjection * clip;
  return view.xyz / view.w;
}

/**
 * Files one sample into whichever horizon it belongs to.
 *
 * Which side of the normal a sample falls on is a property of the geometry, not
 * of the screen offset that found it, and conflating the two is why an *open
 * road* came back as the most occluded thing in the frame — 0.027 visibility in
 * the middle of the street against 0.83 for a facade seen square-on. Wrong
 * wherever a surface is seen edge-on and right wherever it faces the camera is
 * the signature of a surface occluding itself.
 *
 * The mechanism: horizons were stored as a cosine against the view vector and
 * sorted by whether the sample came from the plus or the minus screen offset.
 * Two points on one flat plane are separated by a vector lying in that plane,
 * so under a grazing view the road a metre ahead sits within a couple of degrees
 * of the line of sight. That is a legitimate lower bound on the visible wedge —
 * the wedge runs from the near tangent, over the top, to the far tangent — but
 * the minus side of the search is wired to the *upper* bound, so it was recorded
 * as a ceiling instead of a floor and the wedge closed onto nothing. Ground seen
 * at eye height is grazing in every shot in the game, and the resulting
 * darkening is uniform over broad open surfaces, so it never read as occlusion
 * gone wrong, only as a scene that would not brighten.
 *
 * Measuring the angle from the projected normal instead settles it: the sign of
 * the 2D cross product says which side, and the cosine says how far, so a
 * sample lands on the side it geometrically occupies whatever its screen offset
 * was. Values at or under the tangent plane come out non-positive and cannot
 * displace the seed.
 */
void accumulate(vec3 dir, vec3 V, vec3 ortho, float cosN, float sinN, float fall,
                inout float h0, inout float h1) {
  float a = dot(dir, V);
  float b = dot(dir, ortho);
  float len = max(sqrt(a * a + b * b), 1e-5);
  float cosRel = (a * cosN + b * sinN) / len;
  float sinRel = (b * cosN - a * sinN) / len;
  // Scaled rather than gated, so a sample leaving the search radius fades to the
  // tangent plane instead of popping the horizon back.
  float v = cosRel * fall;
  if (sinRel <= 0.0) h0 = max(h0, v);
  else h1 = max(h1, v);
}

/**
 * How much of the sky this point can see, at a scale the horizon search cannot
 * reach.
 *
 * The two terms above are crease-scale on purpose, and no amount of widening
 * them substitutes for this one. A horizon search works by comparing depths in
 * a screen-space neighbourhood, so its reach is bounded by uMaxScreenRadius —
 * a fraction of the frame — and an arch soffit four metres over the road is far
 * outside that. Raising the world radius instead just lowers visibility
 * uniformly over broad open surfaces as well as in creases, which is a global
 * dimmer, not enclosure.
 *
 * Enclosure is what was missing. Ambient in this renderer is a sky dome plus a
 * hemisphere bounce and neither is occluded by geometry, so a tunnel, an arcade
 * and a room all receive the same skylight as the open street outside them.
 * That single error accounts for most of what reads as amateur in an interior:
 * the archway in the street shot came out within a tenth of a stop of the
 * sunlit road it leads to, market stalls had lit undersides, and the covered
 * hall metered brighter than the street. No grade fixes it, because the frame
 * genuinely has no enclosure in it.
 *
 * The answer comes from an overhead height map rather than from the depth
 * buffer. Screen space cannot answer it: a march toward world up only finds
 * occluders that happen to be in frame *and* above the pixel, so a surface near
 * the top of the image is open by construction — the ceiling beams of a covered
 * hall came back as the most sky-exposed thing in the shot and were rendered as
 * the brightest. Widening or reprojecting the march does not help, because the
 * occluder is off-screen by definition. A single orthographic depth pass from
 * directly overhead has none of that dependence on where the camera is looking.
 *
 * A disc of taps, not one. The mask directly overhead answers "is there a roof
 * on me", which is binary and reads as a hard-edged stencil; sampling a disc
 * around the point and weighting the taps toward the centre turns it into the
 * share of the hemisphere that is blocked, which is what separates the middle of
 * a deep arcade from its outer edge. The clearance test is what keeps a surface
 * from occluding itself: the mask's topmost hit over a patch of open road is the
 * road, so a blocker only counts once it is well clear of the point.
 */
float skyVisibility(vec3 P, vec3 N) {
  if (uSkyMaskAmount < 0.001) return 1.0;
  vec3 W = (uInverseViewMatrix * vec4(P, 1.0)).xyz;
  vec3 Nw = normalize((uInverseViewMatrix * vec4(N, 0.0)).xyz);
  // Moved off the surface so a wall does not read as roofed by its own parapet:
  // the mask's topmost hit directly over a wall's base is the top of that wall.
  // Half a metre is several mask texels, which is what it takes to land clear.
  vec3 O = W + Nw * 0.5;

  // How high a blocker has to reach before it counts, which depends on which way
  // the surface faces. One facing up finds *itself* as the topmost hit — the
  // highest thing over a patch of road is the road — so it needs real clearance
  // before a hit means anything, or every kerb would roof the pavement beside
  // it. One facing down is underneath its own slab by definition, so for it any
  // hit at all is a roof and no clearance applies. That asymmetry is the whole
  // reason an awning's underside comes out dark while its top stays open.
  float guard = uSkyClearance * clamp(Nw.y * 1.6, 0.0, 1.0);

  // Sunflower disc: even coverage without a preferred axis, which a ring
  // pattern has and which shows up as banding along the rings.
  float open = 0.0;
  float wsum = 0.0;
  for (int i = 0; i < SKY_TAPS; i++) {
    float fi = float(i);
    float r = sqrt((fi + 0.5) / float(SKY_TAPS)) * uSkyRadius;
    float a = fi * 2.39996323;
    vec2 off = vec2(cos(a), sin(a)) * r;

    vec4 sc = uSkyMaskMatrix * vec4(O.x + off.x, O.y, O.z + off.y, 1.0);
    float h = uSkyMaskTop - texture2D(tSkyMask, sc.xy).x * uSkyMaskRange;
    float blocked = smoothstep(guard - 0.12, guard + 0.55, h - W.y);

    // Zenith-weighted: the centre tap stands for the part of the hemisphere with
    // the most cosine-weighted irradiance in it, so it has to outweigh the rim.
    float w = 1.0 / (1.0 + r * 0.9);
    open += (1.0 - blocked) * w;
    wsum += w;
  }
  return mix(1.0, open / max(wsum, 1e-4), uSkyMaskAmount);
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

    // Slice-plane basis. Everything below is 2D in (V, ortho), which is what
    // lets a sample be placed on the correct side of the normal rather than on
    // the side its screen offset happens to point.
    vec3 sliceDir = vec3(dir, 0.0);
    vec3 ortho = sliceDir - dot(sliceDir, V) * V;
    float orthoLen = length(ortho);
    if (orthoLen < 1e-4) continue;
    ortho /= orthoLen;

    // Normal projected into that plane, as a signed angle from V. Taken from the
    // two basis dots directly: the cross-product form this replaced divided by
    // an axis that is only unit-length when the slice happens to run
    // perpendicular to the view, so it under-projected everywhere else.
    float nV = dot(N, V);
    float nO = dot(N, ortho);
    float projNLen = sqrt(nV * nV + nO * nO);
    if (projNLen < 1e-4) continue;
    float cosN = nV / projNLen;
    float sinN = nO / projNLen;
    float n = atan(sinN, cosN);

    // Horizons as the cosine of the angle *from the normal*, one per side,
    // seeded at the tangent plane. A sample at or under the tangent plane scores
    // zero or less and leaves the seed standing, which is the acne guard; uBias
    // lifts the seed slightly so depth quantisation on a flat surface cannot
    // register as a lip.
    float h0 = uBias;
    float h1 = uBias;

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
        vec3 dirA = sA / max(dA, 1e-5);
        float fallA = clamp(1.0 - (dA - uRadius * uThickness) / max(uRadius, 1e-4), 0.0, 1.0);
        accumulate(dirA, V, ortho, cosN, sinN, fallA, h0, h1);

        float nearA = clamp(1.0 - dA / uContactRadius, 0.0, 1.0);
        contactSum += max(dot(dirA, N) - uBias, 0.0) * nearA * nearA;
        contactWeight += 1.0;
      }
      if (uvB.x > 0.0 && uvB.x < 1.0 && uvB.y > 0.0 && uvB.y < 1.0) {
        vec3 sB = viewPosFromDepth(uvB, readDepth(uvB)) - P;
        float dB = length(sB);
        vec3 dirB = sB / max(dB, 1e-5);
        float fallB = clamp(1.0 - (dB - uRadius * uThickness) / max(uRadius, 1e-4), 0.0, 1.0);
        accumulate(dirB, V, ortho, cosN, sinN, fallB, h0, h1);

        float nearB = clamp(1.0 - dB / uContactRadius, 0.0, 1.0);
        contactSum += max(dot(dirB, N) - uBias, 0.0) * nearB * nearB;
        contactWeight += 1.0;
      }
    }

    // Both horizons are already inside a quadrant of the normal by construction,
    // so the half-hemisphere clamps the previous form needed are implicit.
    float t0 = n - acos(clamp(h0, 0.0, 1.0));
    float t1 = n + acos(clamp(h1, 0.0, 1.0));

    float inner0 = -cos(2.0 * t0 - n) + cos(n) + 2.0 * t0 * sin(n);
    float inner1 = -cos(2.0 * t1 - n) + cos(n) + 2.0 * t1 * sin(n);
    visibility += projNLen * 0.25 * (inner0 + inner1);
  }

  visibility /= float(SLICES);
  visibility = clamp(visibility, 0.0, 1.0);

  float ao = pow(visibility, uIntensity);

  float contact = 1.0 - clamp(contactSum / max(contactWeight, 1.0) * 2.6, 0.0, 1.0);
  contact = pow(contact, 1.4);

  float sky = skyVisibility(P, N);

  // Store linear view depth alongside AO so the bilateral blur can be
  // edge-aware without a second depth fetch.
  gl_FragColor = vec4(ao, -P.z / uFar, contact, sky);
}
`;

/** Edge-aware separable blur used to denoise the GTAO result. */
export const AO_BLUR_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tAO;
uniform sampler2D tNormal;
uniform vec2 uTexel;
uniform vec2 uDirection;
uniform float uDepthSigma;
uniform float uNormalPower;

/**
 * Background carries no occlusion, and letting it into the filter is worse than
 * losing a tap.
 *
 * Sky pixels are written as fully open with a stored depth of exactly zero. The
 * depth weight alone does not keep them out: against a soffit fifteen metres
 * away the difference is 0.0125 of the far plane, which the wide taps' softened
 * sigma passes at three quarters weight. A soffit is a narrow band with a bright
 * opening directly under it, so the filter was averaging an enclosure of 0.1
 * against a screenful of 1.0 and returning 0.52 — the arch ceiling came out as
 * sky-exposed as the road, which is the one thing the enclosure term exists to
 * prevent. Every surface this matters on has that shape: arcade ceilings, awning
 * undersides, the inside of a doorway.
 */
float geometryWeight(float sampleDepth) {
  return step(1e-5, sampleDepth);
}

/**
 * Rejects taps that face a different way from the centre.
 *
 * Depth alone cannot hold the enclosure term's own boundaries, and the archway
 * is the case that proves it: the soffit and the flat wall beside its haunch are
 * at nearly the same depth, so the depth weight passes freely between them while
 * their sky visibility differs by everything. Measured across the haunch the
 * term fell 149 to 31 over thirty pixels where the geometry calls for two or
 * three, and it carried a couple of stone courses of soffit darkening out onto
 * the wall. Their normals are perpendicular, so this separates them exactly
 * where depth cannot, which is what lets the support come down without the
 * enclosure going blotchy on the large flat surfaces that need it smooth.
 */
float normalWeight(vec2 uv, vec3 centerNormal) {
  vec3 n = texture2D(tNormal, uv).xyz * 2.0 - 1.0;
  return pow(max(dot(normalize(n), centerNormal), 0.0), uNormalPower);
}

void main() {
  vec4 center = texture2D(tAO, vUv);
  float centerDepth = center.y;

  /*
   * A background pixel gathers nothing.
   *
   * Rejecting background *samples* is only half of it, and leaving the other
   * half out produced the halo the review picked up around the archway: a soft
   * dark glow tracing the silhouette outward into the sky. The mechanism is the
   * mirror of the one above. For a sky pixel the stored depth is zero, so every
   * wall tap within reach differs from it by that wall's own depth — fifteen
   * metres at the arch, which the wide taps' softened sigma passes at three
   * quarters weight — and the sky pixel averages a screenful of fully-open
   * against a band of heavily-occluded masonry and comes back grey. The wide
   * support that lets the enclosure term describe a soffit is exactly what sets
   * the halo's radius, so the two cannot be traded against each other; the only
   * correct answer is that a pixel with no geometry in it has no occlusion to
   * filter and must be left alone.
   */
  if (centerDepth < 1e-5) {
    gl_FragColor = vec4(center.x, centerDepth, center.z, center.w);
    return;
  }

  vec3 sum = center.xzw;
  float wsum = 1.0;
  // The enclosure term in .w is four rays wide before filtering, so it needs a
  // much longer support than the horizon terms do. Sampling it from taps twice
  // as far out costs nothing — the fetches are already paid for — and it is a
  // genuinely low-frequency signal, so the extra reach cannot smear anything
  // the crease terms rely on.
  vec3 wide = center.xzw;
  float wwide = 1.0;

  // 9-tap Gaussian, depth-weighted.
  const float weights[4] = float[4](0.2270, 0.1945, 0.1216, 0.0540);

  vec3 centerNormal = normalize(texture2D(tNormal, vUv).xyz * 2.0 - 1.0);

  for (int i = 1; i <= 3; i++) {
    vec2 off = uDirection * uTexel * float(i) * 1.6;
    vec4 a = texture2D(tAO, vUv + off);
    vec4 b = texture2D(tAO, vUv - off);
    float wa = weights[i] * exp(-abs(a.y - centerDepth) * uDepthSigma) * geometryWeight(a.y);
    float wb = weights[i] * exp(-abs(b.y - centerDepth) * uDepthSigma) * geometryWeight(b.y);
    sum += a.xzw * wa + b.xzw * wb;
    wsum += wa + wb;

    // The wide taps keep a softened depth sigma so the enclosure stays smooth
    // across a receding floor, but they get the same hard background reject and
    // now a normal reject as well.
    //
    // Brought in from 4.5 to 2.4. At 4.5 the three taps reached 13.5 half-
    // resolution texels, which is 27 full-resolution pixels of support, and that
    // is the measured width of the smear around the archway — the reach that
    // lets the term describe a soffit is the same reach that paints the soffit
    // onto its neighbours. The normal weight is what pays for the reduction:
    // it removes the taps that were crossing a geometric edge, which were the
    // ones the extra reach was spent averaging in the first place.
    vec2 offW = uDirection * uTexel * float(i) * 2.4;
    vec4 c = texture2D(tAO, vUv + offW);
    vec4 d = texture2D(tAO, vUv - offW);
    float wc = weights[i] * exp(-abs(c.y - centerDepth) * uDepthSigma * 0.35)
             * geometryWeight(c.y) * normalWeight(vUv + offW, centerNormal);
    float wd = weights[i] * exp(-abs(d.y - centerDepth) * uDepthSigma * 0.35)
             * geometryWeight(d.y) * normalWeight(vUv - offW, centerNormal);
    wide += c.xzw * wc + d.xzw * wd;
    wwide += wc + wd;
  }

  sum /= wsum;
  wide /= wwide;
  gl_FragColor = vec4(sum.x, centerDepth, sum.y, wide.z);
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
/** Hue of the fill that survives in a space open to sky but not to sun. */
uniform vec3  uSkyFillTint;
uniform float uStrength;
uniform float uContactStrength;
uniform float uEnclosure;
uniform float uEnclosureKnee;
uniform float uFloor;
/** Sun direction in view space, pointing toward the sun. */
uniform vec3  uSunViewDir;
/** Beam-to-ambient response ratio for a surface facing the sun squarely. */
uniform float uSunOverAmbient;

uniform sampler2D tDepth;
uniform mat4  uInverseViewProjection;
uniform mat4  uViewMatrix;
uniform mat4  uProjection;
uniform mat4  uInverseProjection;
uniform vec2  uTexel;
uniform float uFrame;
/** World length of the contact trace, metres. */
uniform float uContactLength;
/** How thick a screen-space occluder is assumed to be, metres. */
uniform float uContactThickness;
/** Normal offset for the trace origin and the AO tangent test, metres. */
uniform float uContactBias;
uniform float uContactShadowStrength;
/** Radius of the full-resolution contact occlusion ring, metres. */
uniform float uContactAORadius;
uniform float uContactAOStrength;
uniform float uApertureGain;
uniform float uApertureRadius;
uniform float uApertureFalloff;
uniform float uApertureThreshold;
uniform int   uCascadeCount;
uniform highp sampler2DShadow tShadow0;
uniform highp sampler2DShadow tShadow1;
uniform mat4  uShadowMatrix0;
uniform mat4  uShadowMatrix1;
uniform float uCascadeSplit0;
uniform float uCascadeSplit1;

float cascadeLit(highp sampler2DShadow shadowMap, mat4 shadowMatrix, vec3 worldPos, float bias) {
  vec4 sc = shadowMatrix * vec4(worldPos, 1.0);
  sc /= sc.w;
  if (sc.z > 1.0) return 1.0;
  vec2 edge = min(sc.xy, 1.0 - sc.xy);
  float inside = smoothstep(0.0, 0.06, min(edge.x, edge.y));
  if (inside <= 0.0) return 1.0;
  // A comparison sampler, which is how three configures a PCF shadow map: the
  // fetch returns the filtered result of the depth test rather than a depth, so
  // it also comes back with the hardware's 2x2 bilinear filtering applied.
  return mix(1.0, texture2D(shadowMap, vec3(sc.xy, sc.z - bias)), inside);
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

vec3 viewPosFrom(vec2 uv, float rawDepth) {
  vec4 clip = vec4(uv * 2.0 - 1.0, rawDepth * 2.0 - 1.0, 1.0);
  vec4 v = uInverseProjection * clip;
  return v.xyz / v.w;
}

vec2 uvFromView(vec3 p) {
  vec4 clip = uProjection * vec4(p, 1.0);
  return (clip.xy / max(clip.w, 1e-5)) * 0.5 + 0.5;
}

// Interleaved gradient noise, rotated per frame so the temporal filter that
// follows this pass averages the dither out instead of accumulating it.
float dither(vec2 pixel) {
  vec2 p = pixel + 5.588238 * fract(uFrame * 0.6180339887);
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

#define CONTACT_STEPS 10
#define CONTACT_TAPS 8

/**
 * Short screen-space trace toward the sun, at the scale of a few centimetres.
 *
 * The wide occlusion term cannot do this and no amount of tuning will let it.
 * It is computed at half resolution and then blurred, so the smallest feature it
 * can represent is several full-resolution pixels across, while the join between
 * a crate and the ground it stands on is one or two. Measured on the street, a
 * stall leg, a barrier post and a barrel all met the sand with no darkening at
 * all, and in the interior a pot read 44.8 against 43.1 for the floor beneath
 * it — a 4% step, which is nothing. Everything floated.
 *
 * Marching along the light rather than around the hemisphere is what makes it a
 * contact *shadow*: it produces the hard, small, correctly-offset dark shape a
 * prop throws onto whatever it is resting on, which is the cue the eye actually
 * reads as "this object is touching that surface". The thickness bound is what
 * keeps it honest — a depth-buffer hit far in front of the marched point is some
 * unrelated foreground object, not an occluder of this ray, and accepting those
 * is what produces trails behind every silhouette.
 */
float contactShadow(vec3 P, vec3 N) {
  vec3 origin = P + N * uContactBias;
  float jitter = dither(gl_FragCoord.xy);
  float occl = 0.0;

  for (int i = 1; i <= CONTACT_STEPS; i++) {
    float f = (float(i) - jitter) / float(CONTACT_STEPS);
    // Quadratic spacing. Contact hardening is a near-field effect: half the
    // steps land in the first quarter of the trace, which is where the shape of
    // the darkening is decided.
    vec3 sp = origin + uSunViewDir * (f * f * uContactLength);
    vec2 uv = uvFromView(sp);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;

    float d = texture2D(tDepth, uv).x;
    if (d >= 0.9999) continue;

    // View space looks down -z, so a larger z is nearer the camera. A scene
    // surface nearer than the marched point means the ray has gone behind
    // something.
    float ahead = viewPosFrom(uv, d).z - sp.z;
    if (ahead > uContactBias && ahead < uContactThickness) {
      // Nearer hits darken more, and the very end of the trace contributes
      // almost nothing, so the term fades out instead of ending in a ring.
      occl = max(occl, 1.0 - f * f);
    }
  }
  return 1.0 - occl * uContactShadowStrength;
}

/**
 * Occlusion from a centimetre-scale ring, at full resolution.
 *
 * The contact shadow above needs a beam to cast it, and half the contacts the
 * review cited have none — the interior pot sits in a room with no sun path at
 * all. So the crease itself has to darken on ambient alone, and that has to
 * happen here rather than in the half-resolution term for the same Nyquist
 * reason. The ring is normal-oriented and its radius is fixed in world units,
 * so a join reads the same size whether it is two metres away or ten.
 */
float contactOcclusion(vec2 uv, vec3 P, vec3 N) {
  // World radius projected to a fraction of screen height.
  float r = uContactAORadius * (uProjection[1][1] * 0.5) / max(-P.z, 0.05);
  // Never smaller than a texel, or it samples only itself; never large enough
  // to become a second wide term, which is what it exists not to be.
  r = clamp(r, uTexel.y, 0.022);
  float aspect = uTexel.y / max(uTexel.x, 1e-6);
  float jitter = dither(gl_FragCoord.xy + 17.0);

  float occ = 0.0;
  float wsum = 0.0;
  for (int i = 0; i < CONTACT_TAPS; i++) {
    float a = (float(i) + jitter) * (6.2831853 / float(CONTACT_TAPS));
    // Two radii per turn so the ring covers the annulus rather than a circle.
    float rad = r * mix(0.45, 1.0, fract(float(i) * 0.5));
    vec2 suv = uv + vec2(cos(a) * aspect, sin(a)) * rad;
    wsum += 1.0;
    float d = texture2D(tDepth, suv).x;
    if (d >= 0.9999) continue;

    vec3 S = viewPosFrom(suv, d) - P;
    float len = length(S);
    if (len < 1e-6) continue;
    // Height above the tangent plane, with the same bias the wide term uses to
    // keep depth quantisation on a flat surface from registering as a lip.
    float h = max(dot(S / len, N) - 0.06, 0.0);
    // Falls off over twice the radius so an occluder just outside the ring does
    // not switch off abruptly.
    occ += h * clamp(1.0 - len / (uContactAORadius * 2.0), 0.0, 1.0);
  }
  return 1.0 - clamp(occ / max(wsum, 1.0) * uContactAOStrength, 0.0, 1.0);
}

#define APERTURE_TAPS 12

/**
 * Light gathered from bright pixels nearby, for enclosed surfaces only.
 *
 * The enclosure term is built on an overhead height map, so it answers exactly
 * one question — is there a roof over this point — and a window is a hole in a
 * *wall*. Nothing in that formulation can know an aperture exists, let alone
 * which way it lies, which is why the floor under a window measured 107.2
 * against 105.2 for a shadowed wall: statistically the same pixel. The room was
 * filled by a term with no direction in it.
 *
 * A window in frame is already a patch of very bright pixels sitting above and
 * to the side of the floor it should be lighting, so the missing directionality
 * can be recovered from the frame itself: gather those pixels as incident
 * radiance, weighted by the cosine at the receiver and by world distance. The
 * pool below an opening, its falloff, and its cool colour then all come out of
 * the same integral rather than being painted in separately — the tint is
 * whatever the aperture's own pixels are, which for daylight through a window is
 * the sky.
 *
 * Gated hard on enclosure. Outdoors this would be a second, unoccluded bounce
 * light over an already-solved frame, and screen-space gathers have no occlusion
 * test worth the name, so it is confined to the case that has nothing else and
 * where the error is smallest.
 */
vec3 apertureLight(vec2 uv, vec3 P, vec3 N, float roofed, float ref) {
  float indoor = 1.0 - smoothstep(0.30, 0.75, roofed);
  if (indoor < 0.01 || uApertureGain < 1e-4) return vec3(0.0);

  float aspect = uTexel.y / max(uTexel.x, 1e-6);
  float jitter = dither(gl_FragCoord.xy + 41.0);
  vec3 sum = vec3(0.0);
  float wsum = 0.0;

  for (int i = 0; i < APERTURE_TAPS; i++) {
    float fi = float(i) + jitter;
    // Sunflower disc over a wide screen radius: an aperture is typically well
    // away from the surface it lights, so this has to reach across the frame
    // rather than stay in a neighbourhood.
    float r = sqrt((fi + 0.5) / float(APERTURE_TAPS)) * uApertureRadius;
    float a = fi * 2.39996323;
    vec2 suv = uv + vec2(cos(a) * aspect, sin(a)) * r;
    if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) continue;

    float d = texture2D(tDepth, suv).x;
    // Each tap's radiance has to be judged *after* its own occlusion, not before.
    // This pass reads the scene one step ahead of the occlusion it is about to
    // apply, and in that buffer a wall four metres inside a room is nearly as
    // bright as the window beside it — the room is dark because of the enclosure
    // term, which has not been applied yet. Comparing raw values therefore cannot
    // tell an aperture from a wall at any threshold, which is why a level gate
    // either floods the room or does nothing. Weighting by the tap's own
    // enclosure restores the distinction: measured here it takes the window-to-
    // wall ratio from about 2 to about 14.
    float tapSky = d >= 0.9999
      ? 1.0
      : mix(1.0, smoothstep(0.0, uEnclosureKnee, texture2D(tAO, suv).w), uEnclosure);
    vec3 L = texture2D(tScene, suv).rgb * tapSky;
    vec3 toward;
    float dist;
    if (d >= 0.9999) {
      // Open sky seen through the opening. There is no depth to place it at, so
      // it is treated as far away in the direction it appears, which is what it
      // is.
      vec3 far = viewPosFrom(suv, 0.9999);
      toward = normalize(far - P);
      dist = uApertureFalloff;
    } else {
      vec3 S = viewPosFrom(suv, d) - P;
      dist = length(S);
      if (dist < 1e-4) continue;
      toward = S / dist;
    }

    float cosR = max(dot(N, toward), 0.0);
    if (cosR <= 0.0) continue;
    // Only things substantially brighter than this surface can light it. Without
    // this the gather is a blur of the room into itself, which flattens the very
    // thing it is meant to create.
    //
    // A gate on the radiance, not a multiplier of it: subtracting the threshold
    // and scaling by the remainder makes the term quadratic in L, so the gain
    // needed depends on the scene's absolute exposure and no single value works
    // across a room and a street.
    //
    // Relative to this pixel's own value rather than absolute. An absolute
    // threshold has to be calibrated against the buffer this pass reads, which is
    // the scene *before* occlusion is applied, and calibrating it against a
    // measurement taken after occlusion put it below the room's own surfaces —
    // every wall then qualified as a light source, the room gathered itself, and
    // the hall came out as flat near-white with the archway's enclosure washed
    // out along with it. A ratio cannot make that mistake: only something several
    // times brighter than the surface being lit can light it, at any exposure and
    // in any scene.
    float lum = dot(L, vec3(0.2126, 0.7152, 0.0722));
    float gate = smoothstep(ref * uApertureThreshold, ref * uApertureThreshold * 2.6, lum);
    if (gate <= 0.0) { wsum += 1.0; continue; }
    float atten = 1.0 / (1.0 + pow(dist / uApertureFalloff, 2.0));
    sum += L * (gate * cosR * atten);
    wsum += 1.0;
  }
  if (wsum < 0.5) return vec3(0.0);
  return sum / wsum * uApertureGain * indoor;
}

void main() {
  vec3 color = texture2D(tScene, vUv).rgb;
  vec4 aoTex = texture2D(tAO, vUv);
  vec2 ao = aoTex.xz;

  // Tight-radius occlusion is applied on top of the wide term and deliberately
  // is not softened by multi-bounce: a contact seam is a genuinely dark line,
  // and it is the cue that stops props reading as decals pasted on the ground.
  float wide = mix(1.0, ao.x, uStrength);
  float contact = mix(1.0, ao.y, uContactStrength);
  // Enclosure, applied outside the multi-bounce fit. That fit models a closed
  // cavity returning its own light to itself, which is the right model for a
  // crease in plaster and the wrong one for a room with a door in it: run
  // through it, a 0.15 sky visibility comes back as 0.28 and an interior can
  // never get more than a stop and a half under the street outside. Kept linear,
  // the same 0.15 is worth two and a half stops, which is what a covered space
  // is actually worth. The floor below is what stops it reaching zero.
  //
  // Remapped through a knee first, because raw sky visibility used directly is a
  // global dimmer wearing enclosure's clothes. A street canyon returns about
  // half — the facades either side genuinely take half the hemisphere — and
  // spending 0.85 stops there cost the whole frame a stop of median and crushed
  // a twentieth of it, for a darkening the eye reads as underexposure rather
  // than as shade. The half a hemisphere a canyon loses is also the half that
  // bounces the most light back, which the hemisphere fill already accounts for.
  // Above the knee the term is inert, so the open parts of a frame are exactly
  // where they were and the whole effect is spent on genuinely covered space.
  float sky = mix(1.0, smoothstep(0.0, uEnclosureKnee, aoTex.w), uEnclosure);

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
  vec3 occlusion = max(multiBounce(wide, proxy) * contact * sky, vec3(uFloor));

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

  // The two full-resolution contact terms, each charged to the light it belongs
  // to. They are separated because they fail in opposite places: the trace needs
  // a beam and does nothing in a windowless room, the ring needs none and would
  // double-darken a surface the beam already misses.
  float rawDepth = texture2D(tDepth, vUv).x;
  float cOcc = 1.0;
  float cShadow = 1.0;
  vec3 aperture = vec3(0.0);
  if (rawDepth < 0.9999) {
    vec3 P = viewPosFrom(vUv, rawDepth);
    cOcc = contactOcclusion(vUv, P, N);
    // Only worth tracing where a beam could arrive; beamShare below would
    // discard the result anyway, and this keeps ten depth fetches off every
    // pixel facing away from the sun.
    if (ndl > 0.02) cShadow = contactShadow(P, N);
    // The receiver is compared on the same footing as the taps: its own value
    // after occlusion, so the ratio between them means the same thing on both
    // sides of the test.
    aperture = apertureLight(vUv, P, N, aoTex.w,
                             dot(color * occlusion, vec3(0.2126, 0.7152, 0.0722)));
  }

  occlusion = max(occlusion * cOcc, vec3(uFloor));
  occlusion = mix(vec3(1.0), occlusion, ambientShare);
  // A contact shadow is an occlusion of the beam, so it is spent out of the
  // beam's share of the pixel. Applying it to the whole value instead would
  // darken the ambient a second time under every prop, on top of the ring.
  occlusion *= mix(1.0, cShadow, 1.0 - ambientShare);

  vec3 occluded = color * occlusion;
  // Occluded cavities are not black — they are filled by light that has bounced
  // off their own walls, so the falloff carries a little of the bounce hue.
  float amount = 1.0 - dot(occlusion, vec3(0.3333));
  // Which fill survives depends on what was occluded, so the hue does too. A
  // crease keeps the light bouncing off its own walls, and in warm plaster that
  // is warm. A space that has lost its sun but still sees sky keeps skylight,
  // which is blue — so tinting the whole of an enclosed frame warm, as a single
  // bounce colour does, warms the one case the review asked to be cool: a room
  // whose only light arrives through its windows.
  vec3 fillTint = mix(uBounceTint, uSkyFillTint, smoothstep(0.25, 0.85, aoTex.w));
  occluded = mix(occluded, occluded * fillTint, amount * 0.5);
  // Aperture light is added after the occlusion, not multiplied through it: it
  // arrives from a direction the occlusion terms have already declared blocked,
  // which is the entire point of computing it separately. It does carry the
  // contact ring, so a pot still darkens the floor it stands on even when that
  // floor's light is coming from a window rather than from the sky.
  gl_FragColor = vec4(occluded + aperture * cOcc, 1.0);
}
`;
