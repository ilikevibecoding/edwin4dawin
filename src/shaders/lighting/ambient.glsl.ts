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
/** RGB = bent normal, A = fraction of the sphere that is open sky. */
uniform highp sampler3D uSkyVisibility;
uniform vec3 uSkyVisMin;
uniform vec3 uSkyVisInvExtent;
uniform vec3 uSkyVisTexelScale;
uniform vec3 uSkyVisTexelBias;

vec4 lgtSkyVisibility(vec3 worldPos) {
  vec3 t = clamp((worldPos - uSkyVisMin) * uSkyVisInvExtent, 0.0, 1.0);
  /* Half-texel inset: the volume stores values *at* the grid corners, so the
     outermost half texel has to clamp rather than fade to the border colour. */
  vec4 v = texture(uSkyVisibility, t * uSkyVisTexelScale + uSkyVisTexelBias);
  return vec4(v.xyz * 2.0 - 1.0, v.w);
}
`
    : /* glsl */ `
vec4 lgtSkyVisibility(vec3 worldPos) {
  return vec4(0.0, 1.0, 0.0, 1.0);
}
`
}

/**
 * How much of the environment probe a surface with this normal can see.
 *
 * The volume stores a cone: the average direction from which open sky arrives,
 * and what fraction of the upward hemisphere is open at all. Only upward rays
 * are measured, because the probe's lower half *is* the ground — counting the
 * ground as an occluder would darken every upward-facing surface in the level.
 *
 * The term is relative, so a point in the open returns exactly 1 for every
 * normal and the rig degrades to plain image-based lighting when no volume has
 * been baked. As openness falls the response becomes directional, which is what
 * makes the inward face of a doorway darker than the outward one. A scalar
 * ambient-occlusion factor cannot do that, and flat interiors are the result.
 */
float lgtSkyAperture(vec4 vis, vec3 worldNormal) {
  float openness = clamp(vis.w, 0.0, 1.0);
  float facing = clamp(0.5 + 0.5 * dot(worldNormal, vis.xyz), 0.0, 1.0);
  return openness * mix(1.0 - 0.55 * (1.0 - openness), 1.0, facing);
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
