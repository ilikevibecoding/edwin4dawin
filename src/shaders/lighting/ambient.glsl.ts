/**
 * Indirect lighting: sky occlusion, the hemisphere fill and the terrain bounce.
 *
 * Three terms, deliberately kept distinct because they answer different
 * questions and fail differently:
 *
 *  - The **environment probe** (three's own PMREM path) carries the sky and an
 *    analytic ground, prefiltered for roughness. It is the same everywhere.
 *  - The **sky-visibility volume** says how much of that probe a point can
 *    actually see. Without it every interior is lit as though the roof were
 *    not there, which is the single most recognisable failure of a WebGL scene.
 *  - The **irradiance probes** (three's L2 SH grid) carry the bounce that
 *    geometry adds back — the warm light coming off a sunlit wall — which no
 *    amount of occlusion can produce on its own.
 */

export interface AmbientShaderOptions {
  /** A sky-visibility volume has been baked. */
  skyVisibility: boolean;
}

export function ambientPars(opts: AmbientShaderOptions): string {
  return /* glsl */ `
uniform vec3 uAmbientSky;
uniform vec3 uAmbientGround;
/** 1 while no prefiltered probe is bound, 0 once one is. */
uniform float uAmbientFill;

${
  opts.skyVisibility
    ? /* glsl */ `
/** RGB = bent normal, A = fraction of the whole sphere that escapes to sky. */
uniform highp sampler3D uSkyVisibility;
uniform vec3 uSkyVisMin;
uniform vec3 uSkyVisInvExtent;
uniform vec3 uSkyVisResolution;
uniform vec3 uSkyVisCell;

/**
 * Openness two cells have to be within to pool their light freely.
 *
 * Set by what the level measures rather than by taste, and the same floor the
 * bake's interreflection uses: cells well inside a room come back between
 * 0.0001 and 0.003 of the sphere open, cells standing in a window aperture
 * between 0.04 and 0.2, and open street between 0.3 and 0.6. Anything at or
 * under this counts as the same kind of place, which lets a room pool with
 * itself across the factor of ten its own cells vary by while still holding a
 * room and the street outside it apart by the two orders of magnitude that
 * actually separate them.
 */
#define LGT_POOL_FLOOR 0.05

/**
 * Reads the volume with the eight corner probes weighted by whether the surface
 * can actually see them.
 *
 * A hardware trilinear fetch blends all eight regardless of what is between
 * them and the surface, and at any affordable probe spacing that is fatal
 * indoors: the probes bracketing a ceiling are the room below it and the open
 * sky above it, so a ceiling always reads half-open however enclosed the room
 * is, and a floor always reads half-buried. Measured in the café that ships in
 * this level, that alone put the ceiling at aperture 0.52 and the floor at
 * 0.06 — a room lit brightest at the top, which is the single clearest tell
 * that a scene is lit by fill rather than by transport.
 *
 * Rejecting probes the surface faces away from is the standard cure and it is
 * nearly free: a ceiling keeps the probes below it, a floor keeps the ones
 * above, and a wall keeps the ones on its own side. The weight is the squared
 * half-lambert so it falls off smoothly rather than popping across a cell
 * boundary, with a floor under it so a surface lying exactly in the grid plane
 * still has something to read.
 *
 * That cures the leak *along* the normal and does nothing for the one across
 * it, which is the other half of the same problem: a floor faces neither of
 * the walls beside it, so a fragment a metre inside a room still reads the
 * probe standing in the street, and reads it at full weight. Measured in the
 * café, an interior point 0.8 m from the window wall came back thirteen times
 * more open than a thousand rays fired from it say it is. So the weights are
 * sharpened in the two axes tangent to the surface and left linear along the
 * normal: a floor reads the probes above and below it smoothly, and the ones
 * sideways only while they are close. That is the correct prior either way
 * round — a street fragment near a façade equally stops reading the room
 * behind it — and unlike a bias toward the darker probe it does not dim every
 * wall in the town that happens to have a window in it.
 *
 * Sharpening is not enough on its own, and the reason is arithmetic rather
 * than principle: cubing changes nothing at all when the fragment sits halfway
 * between two cells, where both weights cube to a eighth and renormalise back
 * to a half. Where the wall falls relative to the grid is arbitrary, so along
 * any interior wall in the level there is a stripe where the leak comes back
 * at full strength. Measured on the café floor stepping in from an opening,
 * the aperture read 0.29 at 0.6 m, 0.002 at 1.4 m and 0.14 at 4 m — the
 * signature is unmistakable once you see it, because a real opening cannot
 * produce a light pool that switches off and on again as you walk away from
 * it. Those stripes are what the review saw as *both* missing window pools and
 * an interior wall lit by raw sky: what the leak carries is the street's
 * openness, which drives the term that scales the prefiltered probe, and at
 * this hour that probe is a blue zenith while the light genuinely arriving
 * through the window is a warm façade.
 *
 * So the corners are also weighted by how alike their openness is to the
 * fragment's own, in the ratio of the two. Cells in one room agree to within a
 * factor of a few and pool freely; a cell across a wall is two to three orders
 * of magnitude apart and is suppressed in proportion. It is one extra fetch,
 * and it is *only* a suppression of corners brighter than the fragment's own
 * cell — a wall outside with a dark room behind it keeps reading the sky, so
 * nothing in the town's exteriors moves.
 *
 * The reference is the nearest cell to the same normal-offset point the rest
 * of the read uses, which never changes identity anywhere a fragment can be:
 * the switch happens at the midpoint between two cell centres, and for a
 * fragment inside a room facing a wall that midpoint is inside the masonry.
 */
vec4 lgtSkyVisibility(vec3 worldPos, vec3 worldNormal) {
  vec3 last = uSkyVisResolution - 1.0;
  vec3 g = clamp((worldPos - uSkyVisMin) * uSkyVisInvExtent, 0.0, 1.0) * last;
  vec3 base = floor(min(g, max(last - 1.0, vec3(0.0))));
  vec3 f = clamp(g - base, 0.0, 1.0);
  vec3 along = abs(worldNormal);

  /* Openness of the cell the fragment is standing in, floored so that a room's
     own cells — which differ among themselves by a factor of ten down at a
     thousandth of the sphere — still count as the same place. */
  ivec3 home = ivec3(clamp(floor(g + 0.5), vec3(0.0), last));
  float mine = max(texelFetch(uSkyVisibility, home, 0).w, LGT_POOL_FLOOR);

  vec4 sum = vec4(0.0);
  float total = 0.0;
  for (int i = 0; i < 8; i++) {
    vec3 corner = vec3(float(i & 1), float((i >> 1) & 1), float((i >> 2) & 1));
    vec3 index = min(base + corner, last);
    vec3 lerp = mix(1.0 - f, f, corner);
    /* Cubed across the surface, linear along it. Both still reach zero at a
       cell boundary, so the read stays continuous. */
    lerp = mix(lerp * lerp * lerp, lerp, along);
    float w = lerp.x * lerp.y * lerp.z;
    if (w <= 0.0) continue;

    vec3 toProbe = uSkyVisMin + index * uSkyVisCell - worldPos;
    float facing = dot(normalize(toProbe + worldNormal * 1e-3), worldNormal);
    float shadowed = 0.5 + 0.5 * facing;
    w *= max(shadowed * shadowed, 1e-4);

    vec4 v = texelFetch(uSkyVisibility, ivec3(index), 0);
    w *= min(mine / max(v.w, LGT_POOL_FLOOR), 1.0);
    if (w <= 0.0) continue;

    sum += vec4(v.xyz * 2.0 - 1.0, v.w) * w;
    total += w;
  }

  return total > 0.0 ? sum / total : vec4(0.0, 1.0, 0.0, 1.0);
}
`
    : /* glsl */ `
vec4 lgtSkyVisibility(vec3 worldPos, vec3 worldNormal) {
  return vec4(0.0, 1.0, 0.0, 0.5);
}
`
}

/**
 * How much of the environment probe a surface with this normal can see.
 *
 * The volume stores a cone: the average direction from which sky arrives, and
 * what fraction of the whole sphere is open at all. Treating the open region as
 * a uniform cone of half-angle t about the bent normal, (1 - cos t) / 2 is the
 * stored openness, so sin^2 t = 4 * openness * (1 - openness), and the
 * irradiance a surface at angle a to the cone axis receives is pi sin^2(t)
 * cos(a) while the cone clears the horizon, tending to pi (1 + cos a) / 2 as it
 * grows to a hemisphere. Blending the two on openness makes a point in the open
 * return exactly 1 for an up-facing surface, which is the property that lets
 * this multiply the prefiltered probe directly and leave exteriors untouched.
 *
 * Indoors the cone collapses onto whatever opening the room has, and the term
 * becomes strongly directional — a floor beneath a window reads two orders of
 * magnitude above the ceiling over it. A scalar occlusion factor cannot do
 * that, and a room lit as evenly top and bottom is the result.
 */
float lgtSkyAperture(vec4 vis, vec3 worldNormal) {
  float openness = clamp(vis.w, 0.0, 1.0);
  float len = length(vis.xyz);
  float cosAlpha = len > 1e-4 ? dot(worldNormal, vis.xyz) / len : worldNormal.y;
  float cone = min(openness, 0.5);
  float sinSq = 4.0 * cone * (1.0 - cone);
  float sinT = sqrt(sinSq);
  /* Lambert for a cone that straddles the surface's horizon. Clamping the
     cosine at zero — what a point source would want — says a floor receives
     nothing at all from an opening level with it, and an opening level with
     the floor is the only kind a room has. Half the window is still above the
     floor plane. The quadratic is the one that matches both the value and the
     slope of the clear case at each end of the crossing, so nothing kinks
     where the cone touches the horizon. */
  float edge = max(sinT, 1e-4);
  float narrow = cosAlpha >= sinT
    ? cosAlpha
    : (cosAlpha <= -sinT ? 0.0 : (cosAlpha + sinT) * (cosAlpha + sinT) / (4.0 * edge));
  float wide = 0.5 + 0.5 * cosAlpha;
  return sinSq * mix(narrow, wide, clamp(openness * 2.0, 0.0, 1.0));
}

/**
 * Specular occlusion from the same cone. Frostbite's formulation: a rough lobe
 * spans most of the hemisphere and is occluded like diffuse, a mirror lobe is
 * barely occluded at all, and the crossover is exponential in roughness.
 */
float lgtSpecularOcclusion(float visibility, float NdotV, float roughness) {
  float f = exp2(-16.0 * roughness - 1.0);
  return clamp(pow(clamp(NdotV + visibility, 0.0, 1.0), f) - 1.0 + visibility, 0.0, 1.0);
}

/**
 * Stand-in for the prefiltered probe during the frames before the first bake,
 * and on the software rasteriser where the probe is tiny: a hemisphere gradient
 * from the sky above to the terrain bounce below, scaled by the same aperture.
 *
 * Never a constant. A flat ambient term erases every shape cue the normal map
 * exists to provide, which is why untuned WebGL scenes read as cardboard.
 * uAmbientFill is zero whenever the real probe is bound, so the two never both
 * contribute.
 */
vec3 lgtHemisphereFill(vec3 worldNormal, float aperture) {
  float w = worldNormal.y * 0.5 + 0.5;
  vec3 gradient = mix(uAmbientGround, uAmbientSky, w * w);
  return gradient * (aperture * uAmbientFill * PI);
}
`;
}
