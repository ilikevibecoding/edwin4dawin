/**
 * Cascaded shadow map sampling, spliced into every lit surface material.
 *
 * The atlas is a single depth texture holding one square tile per cascade, so
 * the whole rig costs one texture unit no matter how many cascades the quality
 * preset asks for — which matters, because a fully-featured surface here
 * already binds albedo, normal, ARM, height, detail, the PMREM probe, the probe
 * grid and the cloud deck before shadows get a look in.
 *
 * Depth is stored as the orthographic window-space z, so it is *linear* in
 * metres along the light axis. That is what makes physically-scaled PCSS
 * possible: a blocker two metres above the floor produces a penumbra two metres
 * wide times the tangent of the sun's angular radius, with no fudge factors.
 */

export interface CsmShaderOptions {
  cascades: number;
  /** Blocker search + variable-radius PCF rather than a fixed-radius kernel. */
  pcss: boolean;
  /** Filter taps. */
  taps: number;
  /** Blocker-search taps. Half the filter count unless a preset says otherwise. */
  blockerTaps?: number;
  /** Multiply the sun's cloud-transmittance map into the shadow term. */
  cloudShadows: boolean;
}

export function csmPars(opts: CsmShaderOptions): string {
  const n = Math.max(1, opts.cascades);
  const taps = Math.max(4, opts.taps);
  const blockerTaps = Math.max(4, opts.blockerTaps ?? taps >> 1);

  /**
   * Widest penumbra this tap budget can draw, in texels of the cascade.
   *
   * A blocker search is a random sampling of a disc, so what makes it reliable
   * is taps per unit area. Spreading N taps over a disc of radius R leaves gaps
   * of about R/sqrt(N) texels between them, and once that gap is wider than a
   * texel the test stops being a measurement and becomes a coin toss — which is
   * not a subtle failure, because the estimated blocker distance sets the filter
   * radius, so neighbouring fragments a few texels outside a shadow alternate
   * between "nothing found, fully lit" and "something found, filter over a wide
   * disc, partly shadowed". That reads as a band of dithered speckle around
   * every shadow edge, and it was the last visible artefact on the range.
   *
   * Radius sqrt(N) texels is where the taps still tile the disc, and the search
   * radius is also the cap on the filter radius: a fragment whose search found
   * nothing within R cannot be in a penumbra wider than R, so letting the
   * filter reach further than the search could see is what produced the halo in
   * the first place.
   *
   * The cap is in texels, so it scales with the cascade — 4 cm texels near the
   * camera, 67 cm out at 200 m — which is the same direction real penumbrae
   * grow, and is why contact hardening survives it.
   */
  const searchTexels = (Math.sqrt(blockerTaps + 1) * 1.6).toFixed(2);

  return /* glsl */ `
uniform highp sampler2D uCsmAtlas;
/** World position to atlas uv + linear light-space depth, per cascade. */
uniform mat4 uCsmMatrix[${n}];
/**
 * x: view depth this cascade stops at
 * y: metres covered by one shadow texel
 * z: metres spanned by the stored depth range
 * w: atlas uv covered by one metre (the tile's own scale, for filter radii)
 */
uniform vec4 uCsmParams[${n}];
/** Tile origin (xy) and extent (zw) in atlas uv. */
uniform vec4 uCsmRect[${n}];
uniform vec2 uCsmAtlasTexel;
/** Fraction of a cascade's depth range spent cross-fading into the next. */
uniform float uCsmBlend;
/** Constant depth bias in metres, before slope scaling. */
uniform float uCsmDepthBias;
/** Normal offset in shadow texels, before slope scaling. */
uniform float uCsmNormalBias;
/** tan of the key light's angular radius: 0.0047 for the sun, wider overcast. */
uniform float uCsmLightAngle;
/** Artistic widening of the physical penumbra. */
uniform float uCsmSoftness;
/** Distance over which the last cascade fades out to unshadowed. */
uniform vec2 uCsmFade;
/**
 * Per-frame advance of the sample rotation, or 0 when nothing downstream will
 * average successive frames. With a temporal resolve this is what turns the
 * filter's residual noise into detail it can integrate away; without one it
 * would simply be visible as crawling grain, so the rig only asks for it when
 * the antialiasing is temporal.
 */
uniform float uCsmJitter;

#if LGT_CLOUD_SHADOWS
uniform sampler2D uCloudShadowMap;
uniform mat4 uCloudShadowMatrix;
uniform float uCloudShadowStrength;
#endif

/** Raw stored depth at a tile-local uv, clamped so a tap cannot leave the tile. */
float lgtCsmDepth(int index, vec2 uv) {
  vec4 rect = uCsmRect[index];
  vec2 atlasUv = rect.xy + clamp(uv, vec2(0.0), vec2(1.0)) * rect.zw;
  return texture2D(uCsmAtlas, atlasUv).r;
}

/**
 * How the receiver's own depth changes per unit of tile uv.
 *
 * This is the single thing that makes a filter wider than one texel usable on a
 * surface the light grazes. A texel spans texelWorld * tan(theta) of depth
 * across such a surface, so at 84 degrees of incidence in the near cascade a tap
 * three texels away is comparing against a point more than a metre nearer the
 * sun — and reads it as a blocker. That is what stipples a sunlit wall, and no
 * constant bias fixes it: the bias needed on the wall would detach every shadow
 * on the ground. Tilting the comparison with the receiver is exact for a planar
 * surface, needs no tuning, and costs two dot products.
 *
 * Derived from the surface normal rather than from dFdx of the projected
 * coordinate, which is the usual formulation but would be undefined here. The
 * cascade index varies per fragment across a split and the whole block sits
 * inside a branch on N.L, so a screen-space derivative would be reading across
 * quads that projected into different tiles — garbage along exactly the edges
 * that matter.
 *
 * Rows 0 and 1 of the world-to-uv map are the cascade's light-space axes scaled
 * by uv per metre, so dotting the normal with them gives its components in that
 * basis without carrying the basis around as a uniform.
 */
vec2 lgtCsmGradient(int index, vec3 normal, float NdotL) {
  vec4 params = uCsmParams[index];
  mat4 m = uCsmMatrix[index];
  float nx = dot(normal, vec3(m[0][0], m[1][0], m[2][0]));
  float ny = dot(normal, vec3(m[0][1], m[1][1], m[2][1]));
  float scale = params.w * params.w * NdotL * params.z;
  return vec2(nx, ny) / scale;
}

/**
 * Shadow term for one cascade.
 *
 * uvz arrives already biased, and grad tilts every tap's comparison onto the
 * receiver plane. The kernel is a Vogel disc rotated per pixel, which turns the
 * banding a fixed kernel produces into noise the temporal resolve removes for
 * free.
 */
float lgtCsmFilter(int index, vec3 uvz, vec2 grad, float rotation) {
  vec4 params = uCsmParams[index];
  float uvPerMetre = params.w;
  float texelWorld = params.y;
  float depthRange = params.z;

  float radius = texelWorld * 1.35 * uvPerMetre;

#if LGT_PCSS
  /* Search out to the widest penumbra ${blockerTaps + 1} taps can measure, and
     no further. The tap count rather than the light's angular size is what sets
     this; the note on searchTexels in the generator explains why. */
  float searchWorld = clamp(
    depthRange * uCsmLightAngle * uCsmSoftness,
    texelWorld * 1.5,
    texelWorld * ${searchTexels}
  );
  float searchUv = searchWorld * uvPerMetre;

  /* The centre tap is unconditional. A Vogel disc has no sample at the origin,
     so without it a fragment squarely inside a shadow can have every search tap
     land outside and take the lit early-out, which is what makes a soft shadow's
     edge break up into dashes rather than resolve. */
  float blockerSum = 0.0;
  float blockerCount = 0.0;
  {
    float d = lgtCsmDepth(index, uvz.xy);
    if (d < uvz.z) {
      blockerSum += d;
      blockerCount += 1.0;
    }
  }
  /* Turned by the golden angle relative to the filter, so whatever pattern the
     search leaves in the radius estimate does not line up with the pattern the
     filter leaves in the result and reinforce it. */
  float searchRotation = rotation + 2.399963;
  const float invBlocker = 1.0 / float(${blockerTaps});
  for (int i = 0; i < ${blockerTaps}; i++) {
    vec2 offset = lgtVogel(i, invBlocker, searchRotation) * searchUv;
    float d = lgtCsmDepth(index, uvz.xy + offset);
    /* Compared against the receiver plane at the tap, not at the fragment. The
       search has to be tilted too, or a grazing wall finds itself as a blocker
       and the filter never runs. */
    if (d < uvz.z + dot(grad, offset)) {
      blockerSum += d;
      blockerCount += 1.0;
    }
  }
  /* Nothing between this fragment and the sun. The early-out is most of the
     frame — open ground, walls facing the light — so PCSS costs the blocker
     search there and nothing else. */
  if (blockerCount < 0.5) return 1.0;

  float blockerDistance = (uvz.z - blockerSum / blockerCount) * depthRange;
  float penumbra = blockerDistance * uCsmLightAngle * uCsmSoftness;
  radius = clamp(penumbra, texelWorld * 0.8, searchWorld) * uvPerMetre;
#endif

  float sum = 0.0;
  const float invTaps = 1.0 / float(${taps});
  for (int i = 0; i < ${taps}; i++) {
    vec2 offset = lgtVogel(i, invTaps, rotation) * radius;
    sum += step(uvz.z + dot(grad, offset), lgtCsmDepth(index, uvz.xy + offset));
  }
  return sum * invTaps;
}

/**
 * Projects into a cascade with a normal offset and a slope-scaled depth bias.
 *
 * The normal offset scales with the *sine* of the incidence angle, which tops
 * out at one, rather than with the tangent, which does not. A tangent-scaled
 * offset reaches eleven texels on a grazing wall — a third of a metre in the
 * near cascade and several metres in the far one — and an offset that large
 * stops being a bias and starts being a translation: the lookup lands on
 * whatever is a third of a metre off the wall, which is usually not the wall.
 *
 * What does need the tangent is the depth bias, and it needs it *in texels*.
 * The depth a texel spans across the surface is texelWorld * tan(theta), so a
 * bias fixed in metres is simultaneously enormous in the near cascade and
 * negligible in the far one. Most of that error is taken out by the receiver
 * gradient above; this only has to cover the half-texel between the fragment
 * and the centre of the texel it samples, which the gradient cannot know about.
 */
vec3 lgtCsmProject(int index, vec3 worldPos, vec3 worldNormal, float sinTheta, float tanTheta) {
  vec4 params = uCsmParams[index];
  float texelWorld = params.y;
  float offset = texelWorld * uCsmNormalBias * (1.0 + 2.0 * sinTheta);
  vec4 projected = uCsmMatrix[index] * vec4(worldPos + worldNormal * offset, 1.0);
  vec3 uvz = projected.xyz;
  uvz.z -= (uCsmDepthBias * texelWorld * (1.0 + tanTheta)) / params.z;
  return uvz;
}

bool lgtCsmInside(vec3 uvz) {
  return uvz.x > 0.0 && uvz.x < 1.0 && uvz.y > 0.0 && uvz.y < 1.0 && uvz.z < 1.0;
}

/**
 * Sun visibility at a world position, 0 fully shadowed to 1 fully lit.
 *
 * Cascades are chosen by view depth and cross-faded over the tail of each
 * slice, so the resolution change reads as a slight softening rather than the
 * hard tiled seam an unblended rig shows exactly where the eye is drawn.
 *
 * flatNdotL is the *geometric* cosine, and may be negative.
 */
float lgtSunShadow(
  vec3 worldPos, vec3 worldNormal, float viewDepth, float flatNdotL, vec2 fragCoord
) {
  /*
   * Fade the sun out as the surface turns edge-on to it.
   *
   * A shadow map samples the surface the geometry describes, and as that surface
   * turns edge-on the whole visible face compresses into a couple of texels —
   * every fragment on it then sits within a texel of the face's own silhouette,
   * and the blocker test flips from pixel to pixel across all of it. That is not
   * fixable by biasing: it is a face whose depth the map cannot represent. It
   * showed up as a band of dithered speckle up a sunlit wall and survived a nine
   * metre depth bias, a single-texel kernel and no normal offset at all.
   *
   * Fading over the same range is not a dodge, it is the correct shading. A
   * normal map cannot make a face that is edge-on to a light receive light from
   * it; letting it try is what puts direct sun on geometry that is turned away
   * from the sun, and it is why the band was bright enough to see in the first
   * place. Applied here rather than to the cosine so three's own N.L, which
   * wants the mapped normal, is left alone.
   */
  float terminator = smoothstep(0.0, 0.3, flatNdotL);
  if (terminator <= 0.0) return 0.0;

  float shadow = 1.0;

  float NdotL = max(flatNdotL, 0.1);
  float sinTheta = sqrt(max(1.0 - NdotL * NdotL, 0.0));
  float tanTheta = min(sinTheta / NdotL, 8.0);
  /*
   * How far to turn the sample disc.
   *
   * Per frame under PCSS, per pixel otherwise, and the difference matters more
   * than it looks. A per-pixel turn is the standard way to stop a fixed kernel
   * printing its own outline onto every shadow edge in the frame — but PCSS has
   * no fixed kernel to print: the blocker search already varies the radius
   * continuously from pixel to pixel, so the turn buys nothing there and costs
   * something real. Where the shadow content is finer than a texel — the
   * conduits up a wall, a wire, a railing seen end-on — each pixel's taps land
   * on a different subset of it, and the result does not average into a soft
   * shadow, it resolves as a checkerboard of dither. Turning the whole frame
   * together keeps every frame spatially coherent, so that content reads as the
   * streaky shadow it is, and still leaves a temporal resolve something to
   * integrate.
   */
#if LGT_PCSS
  float rotation = uCsmJitter * 6.2831853;
#else
  float rotation = (lgtIGN(fragCoord) + uCsmJitter) * 6.2831853;
#endif

  int index = ${n - 1};
  float near = 0.0;
  #if ${n} > 1
  for (int i = 0; i < ${n}; i++) {
    if (viewDepth < uCsmParams[i].x) {
      index = i;
      break;
    }
    near = uCsmParams[i].x;
  }
  #endif

  vec3 uvz = lgtCsmProject(index, worldPos, worldNormal, sinTheta, tanTheta);
  vec2 grad = lgtCsmGradient(index, worldNormal, NdotL);
  shadow = lgtCsmInside(uvz) ? lgtCsmFilter(index, uvz, grad, rotation) : 1.0;

  #if ${n} > 1
  /* Cross-fade over the tail of the slice. Only fragments inside the band pay
     for the second lookup, and the band is a tenth of a cascade. */
  float far = uCsmParams[index].x;
  float band = uCsmBlend * (far - near);
  float t = band > 0.0 ? clamp((viewDepth - (far - band)) / band, 0.0, 1.0) : 0.0;
  if (t > 0.0 && index + 1 < ${n}) {
    vec3 nextUvz = lgtCsmProject(index + 1, worldPos, worldNormal, sinTheta, tanTheta);
    vec2 nextGrad = lgtCsmGradient(index + 1, worldNormal, NdotL);
    float nextShadow =
      lgtCsmInside(nextUvz) ? lgtCsmFilter(index + 1, nextUvz, nextGrad, rotation) : 1.0;
    shadow = mix(shadow, nextShadow, t);
  }
  #endif

  /* Past the last cascade there is no data, so ease back to lit rather than
     ending the shadows on a line across the ground. */
  shadow = mix(shadow, 1.0, smoothstep(uCsmFade.x, uCsmFade.y, viewDepth));

#if LGT_CLOUD_SHADOWS
  /* The deck's transmittance map is a top-down projection: at ground level the
     shadow sits under the cloud, which is what a distant observer sees. */
  vec2 cloudUv = (uCloudShadowMatrix * vec4(worldPos, 1.0)).xy;
  vec2 clamped = clamp(cloudUv, vec2(0.0), vec2(1.0));
  float inside = (clamped.x == cloudUv.x && clamped.y == cloudUv.y) ? 1.0 : 0.0;
  float cloud = mix(1.0, texture2D(uCloudShadowMap, clamped).r, uCloudShadowStrength * inside);
  shadow *= cloud;
#endif

  return shadow * terminator;
}
`;
}
