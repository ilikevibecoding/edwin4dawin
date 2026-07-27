import { GLSL_COLOR, GLSL_CONST, GLSL_DEPTH, GLSL_NOISE } from './common.glsl';

/**
 * Motion blur, reconstructed from the velocity buffer.
 *
 * A naive implementation samples along the centre pixel's own motion vector,
 * which produces two immediately recognisable artefacts: moving objects have
 * sharp edges (the blur stops at the silhouette instead of extending past it)
 * and the background smears *over* stationary foreground objects. Both come from
 * the same mistake — treating the velocity field as if each pixel were
 * independent.
 *
 * This uses McGuire-style reconstruction instead. The blur direction is dilated
 * from the neighbourhood so a moving object blurs beyond its own silhouette, and
 * every tap is weighted by a soft depth comparison plus a "does this tap's own
 * motion actually reach me" cone test, so a background pixel only contributes
 * where its own blur would genuinely cover the centre.
 */
export const MOTION_BLUR_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${GLSL_NOISE}
${GLSL_DEPTH}

in vec2 vUv;
uniform sampler2D uColor;
uniform sampler2D uVelocity;
uniform sampler2D uDepth;
uniform vec2 uTexel;
uniform vec2 uResolution;
uniform vec2 uNearFar;
uniform float uShutter;
uniform float uMaxRadius;
uniform float uFrame;
out vec4 fragColor;

#ifndef TAPS
#define TAPS 8
#endif

float depthAt(vec2 uv) {
  return linearizeDepth(texture(uDepth, uv).r, uNearFar.x, uNearFar.y);
}

void main() {
  vec3 center = texture(uColor, vUv).rgb;
  vec2 centerVelocity = texture(uVelocity, vUv).xy * uShutter;

  // Dilate: search a small cross for the longest motion vector so the blur can
  // extend past the moving object's own pixels.
  vec2 dominant = centerVelocity;
  float dominantLen = length(centerVelocity);
  for (int i = 0; i < 4; i++) {
    float a = (float(i) + 0.5) * HALF_PI;
    vec2 o = vec2(cos(a), sin(a)) * uTexel * 6.0;
    vec2 v = texture(uVelocity, clamp(vUv + o, vec2(0.0), vec2(1.0))).xy * uShutter;
    float l = length(v);
    if (l > dominantLen) {
      dominantLen = l;
      dominant = v;
    }
  }

  if (dominantLen < 0.4 / max(uResolution.x, uResolution.y)) {
    fragColor = vec4(center, 1.0);
    return;
  }

  // Clamp the trail length: a fast pan should read as motion, not as a wipe.
  float maxLen = uMaxRadius;
  if (dominantLen > maxLen) dominant *= maxLen / dominantLen;
  float centerLen = length(centerVelocity);

  float centerDepth = depthAt(vUv);
  float jitter = ignAnimated(gl_FragCoord.xy, uFrame) - 0.5;

  vec3 acc = center;
  float wsum = 1.0;

  for (int i = 1; i <= TAPS; i++) {
    // Symmetric taps: the shutter is open for the frame either side of now.
    float t = (float(i) + jitter) / float(TAPS + 1) - 0.5;
    vec2 offset = dominant * t;
    vec2 uv = clamp(vUv + offset, vec2(0.0), vec2(1.0));

    float tapDepth = depthAt(uv);
    vec2 tapVelocity = texture(uVelocity, uv).xy * uShutter;
    float dist = length(offset);

    // Soft classification. 1 when the tap is in front of the centre pixel.
    float front = clamp(0.5 + (centerDepth - tapDepth) / max(centerDepth * 0.05, 0.05), 0.0, 1.0);
    // Does the tap's own blur reach the centre? Does the centre's reach the tap?
    float coneTap = clamp(1.0 - dist / max(length(tapVelocity), 1e-6), 0.0, 1.0);
    float coneCenter = clamp(1.0 - dist / max(centerLen, 1e-6), 0.0, 1.0);

    float w = front * coneTap + (1.0 - front) * coneCenter;
    acc += texture(uColor, uv).rgb * w;
    wsum += w;
  }

  fragColor = vec4(acc / max(wsum, 1e-4), 1.0);
}
`;

/**
 * Circle-of-confusion and half-resolution colour, in one pass.
 *
 * CoC comes from the real thin-lens relation given focus distance, focal length
 * (derived from the camera's vertical FOV against a 24 mm sensor) and f-number,
 * with an artistic multiplier on top: a 14 mm-equivalent lens at f/4 has a
 * genuinely enormous depth of field, so a physically exact CoC on an 80-degree
 * FPS camera is invisible. The *shape* of the falloff stays physical, which is
 * what makes the near/far transition read correctly.
 *
 * Sign carries the field: negative in front of the focal plane, positive behind.
 */
export const DOF_PREPARE_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${GLSL_DEPTH}

in vec2 vUv;
uniform sampler2D uColor;
uniform sampler2D uDepth;
uniform vec2 uTexel;
uniform vec2 uNearFar;
uniform float uFocus;
uniform float uFocalLength;
uniform float uCocScale;
uniform float uMaxCoc;
out vec4 fragColor;

float cocAt(vec2 uv) {
  float depth = linearizeDepth(texture(uDepth, uv).r, uNearFar.x, uNearFar.y);
  float coc = uCocScale * (depth - uFocus) / max(depth * (uFocus - uFocalLength), 1e-4);
  return clamp(coc, -uMaxCoc, uMaxCoc);
}

void main() {
  // Take the CoC of the sample with the largest magnitude in the 2x2 footprint:
  // under-blurring a pixel that should be soft is much more visible than the
  // reverse, because it leaves a hard edge inside a blurred region.
  vec2 o = uTexel * 0.5;
  float c0 = cocAt(vUv + vec2(-o.x, -o.y));
  float c1 = cocAt(vUv + vec2(o.x, -o.y));
  float c2 = cocAt(vUv + vec2(-o.x, o.y));
  float c3 = cocAt(vUv + vec2(o.x, o.y));
  float coc = c0;
  if (abs(c1) > abs(coc)) coc = c1;
  if (abs(c2) > abs(coc)) coc = c2;
  if (abs(c3) > abs(coc)) coc = c3;

  vec3 color = texture(uColor, vUv + vec2(-o.x, -o.y)).rgb;
  color += texture(uColor, vUv + vec2(o.x, -o.y)).rgb;
  color += texture(uColor, vUv + vec2(-o.x, o.y)).rgb;
  color += texture(uColor, vUv + vec2(o.x, o.y)).rgb;

  fragColor = vec4(color * 0.25, coc);
}
`;

/**
 * Per-tile CoC extremes, reduced from the half-resolution CoC.
 *
 * The near field is a scatter expressed as a gather, so a sharp pixel has to
 * know how far away foreground bokeh could still reach it. Without this it has
 * to assume the worst and search the maximum radius every time, which wastes
 * almost the whole sample budget: at a 7-texel maximum a 16-tap disc places its
 * taps 3 texels apart, and a heavily blurred surface shows the spiral lattice
 * instead of a blur. Worse, the coverage it measures is then a fraction of the
 * *maximum* disc rather than of the disc that actually exists, so a foreground
 * object with half the maximum CoC composites at a quarter strength and its
 * silhouette stays hard.
 *
 * Reducing to tiles first gives the gather the real radius for its
 * neighbourhood. 8x8 taps over a target 1/64 the size is one fetch per
 * half-resolution pixel, so this is effectively free.
 */
export const DOF_TILE_FRAG = /* glsl */ `
precision highp float;

in vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uTexel;
out vec4 fragColor;

void main() {
  // Derived from the tile index rather than from vUv: the tile count is rounded
  // up, so tile UV space covers slightly more than the source and the two grids
  // do not share a mapping.
  vec2 base = (floor(gl_FragCoord.xy) * 8.0 + 0.5) * uTexel;
  float nearMax = 0.0;
  float farMax = 0.0;
  for (int y = 0; y < 8; y++) {
    for (int x = 0; x < 8; x++) {
      float coc = texture(uSource, base + vec2(float(x), float(y)) * uTexel).a;
      nearMax = max(nearMax, -coc);
      farMax = max(farMax, coc);
    }
  }
  fragColor = vec4(nearMax, farMax, 0.0, 1.0);
}
`;

/**
 * Max over neighbouring tiles, so a tile also knows about bokeh spreading in
 * from outside it. The radius has to cover the largest half-resolution CoC the
 * prepass can produce — two tiles of eight texels each, which is enough for a
 * maximum CoC of 32 full-resolution pixels. Under-reaching here truncates near
 * bokeh on a tile boundary, which prints the tile grid into the silhouette.
 */
export const DOF_TILE_DILATE_FRAG = /* glsl */ `
precision highp float;

in vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uTexel;
out vec4 fragColor;

#ifndef RADIUS
#define RADIUS 2
#endif

void main() {
  vec2 m = vec2(0.0);
  for (int y = -RADIUS; y <= RADIUS; y++) {
    for (int x = -RADIUS; x <= RADIUS; x++) {
      m = max(m, texture(uSource, vUv + vec2(float(x), float(y)) * uTexel).rg);
    }
  }
  fragColor = vec4(m, 0.0, 1.0);
}
`;

/**
 * Near/far bokeh gather, writing both fields in one pass via MRT.
 *
 * The two fields have to be separate. The far field is an *occluded* gather: a
 * background pixel may only contribute where nothing nearer is in the way. The
 * near field is an *unoccluded* scatter-as-gather: an out-of-focus foreground
 * object must spread over the sharp background behind it, so the test is only
 * whether the tap's own CoC reaches this pixel, deliberately ignoring depth
 * order. Doing them together in one pass is what produces the classic error
 * where a blurred foreground has a sharp outline.
 *
 * Samples are placed on a golden-angle spiral, which gives an even disc without
 * the ring structure a concentric layout leaves in bokeh highlights, and each tap
 * is weighted slightly toward bright values so highlights form discs rather than
 * just fading.
 */
export const DOF_GATHER_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${GLSL_NOISE}

in vec2 vUv;
uniform sampler2D uSource;
uniform sampler2D uTile;
uniform vec2 uTexel;
/** Rescales this pass's UV into the rounded-up tile grid's UV. */
uniform vec2 uTileScale;
uniform float uFrame;
uniform float uMaxCoc;
layout(location = 0) out vec4 outFar;
layout(location = 1) out vec4 outNear;

#ifndef TAPS
#define TAPS 16
#endif

void main() {
  vec4 center = texture(uSource, vUv);
  float centerCoc = center.a;

  /*
   * Each field gathers over the radius its own bokeh actually occupies, and
   * normalises against the coverage a fully occupying surface at that radius
   * would produce. Both halves matter: the radius decides how well the disc is
   * sampled, and the normaliser decides whether the composite reaches full
   * strength. Dividing by the tap count instead measures coverage as a fraction
   * of the largest possible disc, which under-composites every blur smaller than
   * the maximum and leaves its silhouette hard.
   *
   * The far field's radius is the centre pixel's own CoC — taps beyond it are
   * rejected by the reach test anyway. The near field's comes from the dilated
   * tile maximum, because a sharp pixel has no CoC of its own to go on.
   */
  float farRadius = max(max(centerCoc, 0.0), 1.0);
  float nearRadius = max(texture(uTile, vUv * uTileScale).r, 1.0);

  // The centre is the tap at zero distance and is weighted by the same rule.
  // Weighting it by its own CoC instead — which is what it looks like it should
  // be — makes the centre pixel dominate in proportion to how blurred it is
  // supposed to be, so the strongest blur is the one that barely blurs.
  //
  // The rim ramp is one texel wide. Widening it costs the near field dearly: a
  // tap with no blur at all still scores half a unit of coverage at zero
  // distance, and over a two-texel ramp that leaks far enough out that a
  // perfectly sharp region measures a third of full near coverage and gets
  // composited with a one-texel blur of itself.
  float centerFar = clamp(centerCoc + 0.5, 0.0, 1.0);
  float centerNear = clamp(-centerCoc + 0.5, 0.0, 1.0);

  vec3 farAcc = center.rgb * centerFar;
  float farWeight = centerFar;
  float farCoverage = centerFar;
  float farNorm = 1.0;
  vec3 nearAcc = center.rgb * centerNear;
  float nearWeight = centerNear;
  float nearCoverage = centerNear;
  float nearNorm = 1.0;

  float angleOffset = ignAnimated(gl_FragCoord.xy, uFrame) * TAU;

  for (int i = 0; i < TAPS; i++) {
    float fi = float(i) + 0.5;
    // Golden angle spiral: sqrt radius keeps the disc uniformly covered.
    float a = fi * 2.39996323 + angleOffset;
    float r = sqrt(fi / float(TAPS));
    vec2 dir = vec2(cos(a), sin(a)) * r;

    vec4 tapF = texture(uSource, clamp(vUv + dir * farRadius * uTexel, vec2(0.0), vec2(1.0)));
    float distF = r * farRadius;

    // Bokeh weighting: a tap contributes where its own CoC covers this pixel.
    float farReach = clamp(max(tapF.a, 0.0) - distF + 0.5, 0.0, 1.0);
    // Occlusion, measured *relative to the blur radius* rather than in absolute
    // CoC. A fixed cutoff rejects any tap even slightly nearer than the centre,
    // which means two surfaces at similar far depths refuse to blur into each
    // other and their shared silhouette survives at full sharpness in the middle
    // of an otherwise soft image — with the half-resolution stair-stepping
    // intact. Scaling by the centre's own CoC keeps a genuinely near, in-focus
    // object out while letting neighbouring background depths mix.
    float notNearer = clamp((tapF.a - centerCoc) / max(centerCoc, 1.0) + 1.0, 0.0, 1.0);
    float wFar = farReach * notNearer;
    // Slight bias toward bright taps so specular highlights form discs.
    float bokehF = 1.0 + 0.35 * sqrt(max(luma(tapF.rgb), 0.0));

    farAcc += tapF.rgb * wFar * bokehF;
    farWeight += wFar * bokehF;
    farCoverage += wFar;
    farNorm += clamp(farRadius - distF + 0.5, 0.0, 1.0);

    vec4 tapN = texture(uSource, clamp(vUv + dir * nearRadius * uTexel, vec2(0.0), vec2(1.0)));
    float distN = r * nearRadius;
    float wNear = clamp(max(-tapN.a, 0.0) - distN + 0.5, 0.0, 1.0);
    float bokehN = 1.0 + 0.35 * sqrt(max(luma(tapN.rgb), 0.0));

    nearAcc += tapN.rgb * wNear * bokehN;
    nearWeight += wNear * bokehN;
    nearCoverage += wNear;
    nearNorm += clamp(nearRadius - distN + 0.5, 0.0, 1.0);
  }

  // Below a texel of near CoC there is no foreground bokeh to scatter, and the
  // radius has bottomed out at its floor, so fade the field out rather than
  // compositing a one-texel blur of the sharp image over itself.
  float nearGate = smoothstep(0.75, 1.75, nearRadius);

  outFar = vec4(
    farAcc / max(farWeight, 1e-4),
    clamp(farCoverage / max(farNorm, 1e-4), 0.0, 1.0)
  );
  outNear = vec4(
    nearAcc / max(nearWeight, 1e-4),
    clamp(nearCoverage / max(nearNorm, 1e-4), 0.0, 1.0) * nearGate
  );
}
`;

/**
 * Fills the gaps between spiral taps.
 *
 * A disc of radius R sampled with N taps spaces them R*sqrt(pi/N) apart, so at
 * the maximum CoC a 16-tap gather leaves gaps of about three half-resolution
 * texels. Anything with detail finer than that — which is most textured surfaces
 * — comes out of the gather carrying a faint diagonal lattice rather than a
 * blur, and a regular lattice reads as a cheap effect far more than noise does.
 * A short blur at exactly the tap spacing removes it while leaving the bokeh
 * shape intact, and costs a fraction of the taps it would take to sample the
 * disc densely enough to avoid it.
 *
 * Both fields are averaged weighted by coverage, so a pixel next to one with no
 * valid taps does not pull its colour toward whatever that pixel fell back to.
 */
export const DOF_FILL_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_NOISE}

in vec2 vUv;
uniform sampler2D uFar;
uniform sampler2D uNear;
uniform sampler2D uSource;
uniform sampler2D uTile;
uniform vec2 uTexel;
uniform vec2 uTileScale;
uniform float uFrame;
uniform float uSpacing;
layout(location = 0) out vec4 outFar;
layout(location = 1) out vec4 outNear;

void main() {
  vec4 centerFar = texture(uFar, vUv);
  vec4 centerNear = texture(uNear, vUv);

  vec2 tile = texture(uTile, vUv * uTileScale).rg;
  float farRadius = max(texture(uSource, vUv).a, 0.0);
  // Half the tap spacing in each field, floored so a nearly sharp pixel is not
  // softened and ceilinged so the bokeh does not turn to mush.
  float farStep = clamp(farRadius * uSpacing, 0.0, 2.0);
  float nearStep = clamp(tile.r * uSpacing, 0.0, 2.0);

  vec3 farAcc = centerFar.rgb * centerFar.a;
  float farW = centerFar.a;
  float farA = centerFar.a;
  vec3 nearAcc = centerNear.rgb * centerNear.a;
  float nearW = centerNear.a;
  float nearA = centerNear.a;

  float angleOffset = ignAnimated(gl_FragCoord.xy, uFrame) * TAU;
  for (int i = 0; i < 4; i++) {
    float a = (float(i) + 0.5) * HALF_PI + angleOffset;
    vec2 dir = vec2(cos(a), sin(a));

    vec4 f = texture(uFar, clamp(vUv + dir * farStep * uTexel, vec2(0.0), vec2(1.0)));
    farAcc += f.rgb * f.a;
    farW += f.a;
    farA += f.a;

    vec4 n = texture(uNear, clamp(vUv + dir * nearStep * uTexel, vec2(0.0), vec2(1.0)));
    nearAcc += n.rgb * n.a;
    nearW += n.a;
    nearA += n.a;
  }

  outFar = vec4(farW > 1e-4 ? farAcc / farW : centerFar.rgb, farA * 0.2);
  outNear = vec4(nearW > 1e-4 ? nearAcc / nearW : centerNear.rgb, nearA * 0.2);
}
`;

/**
 * Composites the two bokeh fields over the sharp image at full resolution.
 *
 * The far field is faded in by the centre pixel's own CoC; the near field is
 * composited by its coverage, over the top, so foreground bokeh genuinely spills
 * across whatever is behind it.
 */
export const DOF_COMPOSITE_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${GLSL_DEPTH}

in vec2 vUv;
uniform sampler2D uColor;
uniform sampler2D uFar;
uniform sampler2D uNear;
uniform sampler2D uDepth;
uniform vec2 uNearFar;
uniform float uFocus;
uniform float uFocalLength;
uniform float uCocScale;
uniform float uMaxCoc;
out vec4 fragColor;

void main() {
  vec3 sharp = texture(uColor, vUv).rgb;
  float depth = linearizeDepth(texture(uDepth, vUv).r, uNearFar.x, uNearFar.y);
  float coc = clamp(
    uCocScale * (depth - uFocus) / max(depth * (uFocus - uFocalLength), 1e-4),
    -uMaxCoc,
    uMaxCoc
  );

  vec4 farField = texture(uFar, vUv);
  vec4 nearField = texture(uNear, vUv);

  // One pixel of CoC is not worth blurring; ramping in from there hides the
  // half-resolution gather. The coverage term backs the field off where its taps
  // were all rejected as occluders, which is what keeps a sharp object's edge
  // from being eaten by the blur behind it.
  float farBlend = smoothstep(0.6, 2.2, coc) * smoothstep(0.12, 0.5, farField.a);
  vec3 color = mix(sharp, farField.rgb, farBlend);
  color = mix(color, nearField.rgb, clamp(nearField.a, 0.0, 1.0));

  fragColor = vec4(color, 1.0);
}
`;

/**
 * Viewmodel composite with its own depth of field.
 *
 * The weapon is rendered by a separate camera into a separate target precisely
 * so it can be kept out of the world's motion blur and DOF — otherwise the gun
 * smears every time the player turns, and goes soft whenever the world behind it
 * is out of focus. It gets its own shallow focus instead: while aiming, the
 * sights stay sharp and the barrel and the shooter's hands fall off, which is
 * both what a real short-focus lens does at that distance and a strong readable
 * cue that the player is aimed in.
 */
export const VIEWMODEL_COMPOSITE_FRAG = /* glsl */ `
precision highp float;
${GLSL_CONST}
${GLSL_COLOR}
${GLSL_NOISE}
${GLSL_DEPTH}

in vec2 vUv;
uniform sampler2D uWorld;
uniform sampler2D uViewmodel;
uniform sampler2D uViewmodelDepth;
uniform vec2 uTexel;
uniform vec2 uNearFar;
uniform float uFocus;
uniform float uCocScale;
uniform float uMaxCoc;
uniform float uFrame;
out vec4 fragColor;

#ifndef TAPS
#define TAPS 10
#endif

float vmCoc(vec2 uv) {
  float raw = texture(uViewmodelDepth, uv).r;
  if (raw >= 1.0) return 0.0;
  float depth = linearizeDepth(raw, uNearFar.x, uNearFar.y);
  return clamp((depth - uFocus) * uCocScale / max(depth, 0.02), -uMaxCoc, uMaxCoc);
}

void main() {
  vec3 world = texture(uWorld, vUv).rgb;
  vec4 vm = texture(uViewmodel, vUv);
  float coc = vmCoc(vUv);
  float radius = abs(coc);

  if (radius > 0.75) {
    // Gather over the viewmodel only. Premultiplying by coverage before the
    // blur is what lets the weapon's silhouette go soft against the world
    // instead of blurring the world into it.
    vec4 acc = vec4(vm.rgb * vm.a, vm.a);
    float wsum = 1.0;
    float angleOffset = ignAnimated(gl_FragCoord.xy, uFrame) * TAU;
    for (int i = 0; i < TAPS; i++) {
      float fi = float(i) + 0.5;
      float a = fi * 2.39996323 + angleOffset;
      float r = sqrt(fi / float(TAPS));
      vec2 uv = clamp(vUv + vec2(cos(a), sin(a)) * r * radius * uTexel, vec2(0.0), vec2(1.0));
      vec4 s = texture(uViewmodel, uv);
      float tapRadius = abs(vmCoc(uv));
      float w = clamp((tapRadius - r * radius) * 0.5 + 0.5, 0.0, 1.0);
      acc.rgb += s.rgb * s.a * w;
      acc.a += s.a * w;
      wsum += w;
    }
    vm.rgb = acc.rgb / max(acc.a, 1e-4);
    vm.a = clamp(acc.a / max(wsum, 1e-4), 0.0, 1.0);
  }

  fragColor = vec4(mix(world, vm.rgb, clamp(vm.a, 0.0, 1.0)), 1.0);
}
`;
