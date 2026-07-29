/**
 * Clustered forward shading for local lights.
 *
 * The view frustum is diced into a grid of froxels — tiles across the screen,
 * exponentially spaced slices in depth — and the CPU writes the light indices
 * touching each froxel into a small texture every frame. A fragment reads only
 * the handful of lights that can possibly reach it.
 *
 * The reason to build this rather than let three handle point lights is not
 * only throughput. three bakes the light count into the shader: the first
 * muzzle flash of a firefight would recompile every material in the scene and
 * drop a hundred milliseconds on the floor. Here a light is data, so the flash
 * pool costs a texture upload and nothing else.
 */

export interface ClusterShaderOptions {
  /** Maximum light indices stored per froxel; a multiple of 4. */
  perCluster: number;
  /** Shadow-casting spot lights; 0 compiles the lookup out entirely. */
  spotShadows: number;
}

export function clusterPars(opts: ClusterShaderOptions): string {
  const texels = Math.max(1, Math.ceil(opts.perCluster / 4));
  const spots = Math.max(0, opts.spotShadows);

  return /* glsl */ `
uniform highp sampler2D uLightData;
uniform highp sampler2D uClusterData;
/** xyz = grid dimensions, w = lights per froxel. */
uniform vec4 uClusterGrid;
/** x = slices / log(far/near), y = -x * log(near), z = near, w = far. */
uniform vec4 uClusterDepth;
/** Projection scale/offset: xy scale the view ray, zw shift it off-centre. */
uniform vec4 uClusterProj;

${
  spots > 0
    ? /* glsl */ `
uniform highp sampler2D uSpotShadowAtlas;
uniform mat4 uSpotShadowMatrix[${spots}];
/** xy = tile origin in atlas uv, zw = tile extent. */
uniform vec4 uSpotShadowRect[${spots}];
uniform vec2 uSpotShadowTexel;

/** Four-tap rotated PCF. A hero spot is a small part of the frame; the cascade
    rig's full PCSS kernel here would be spent on a doorway shaft. */
float lgtSpotShadow(int index, vec3 worldPos, float rotation) {
  vec4 projected = uSpotShadowMatrix[index] * vec4(worldPos, 1.0);
  if (projected.w <= 0.0) return 1.0;
  vec3 uvz = projected.xyz / projected.w;
  if (uvz.x <= 0.0 || uvz.x >= 1.0 || uvz.y <= 0.0 || uvz.y >= 1.0 || uvz.z >= 1.0) return 1.0;

  vec4 rect = uSpotShadowRect[index];
  float sum = 0.0;
  for (int i = 0; i < 4; i++) {
    vec2 offset = lgtVogel(i, 0.25, rotation) * 1.5 * uSpotShadowTexel / rect.zw;
    vec2 atlasUv = rect.xy + clamp(uvz.xy + offset, vec2(0.0), vec2(1.0)) * rect.zw;
    sum += step(uvz.z, texture2D(uSpotShadowAtlas, atlasUv).r);
  }
  return sum * 0.25;
}
`
    : ''
}

/**
 * Inverse-square falloff with a smooth window at the influence radius.
 *
 * The window matters: a light that is simply clipped at its radius leaves a
 * visible disc edge on the floor, and the froxel assignment relies on the
 * contribution actually being zero at the boundary it culled against.
 */
float lgtDistanceAttenuation(float distanceSq, float invRadiusSq) {
  float factor = distanceSq * invRadiusSq;
  float smoothFactor = clamp(1.0 - factor * factor, 0.0, 1.0);
  return (smoothFactor * smoothFactor) / max(distanceSq, 0.0025);
}

/**
 * Which froxel a view-space position falls in.
 *
 * The projection arrives as uniform terms rather than being read from
 * projectionMatrix, which exists only in the vertex stage, and rather than
 * being derived from gl_FragCoord, which would be the viewmodel camera's
 * viewport while the weapon draws. The grid belongs to the world camera.
 */
ivec3 lgtCluster(vec3 viewPos) {
  float viewDepth = max(-viewPos.z, 1e-4);
  vec2 uv = (viewPos.xy * uClusterProj.xy / viewDepth + uClusterProj.zw) * 0.5 + 0.5;
  float slice = log2(max(viewDepth, uClusterDepth.z)) * uClusterDepth.x + uClusterDepth.y;
  return ivec3(
    clamp(int(uv.x * uClusterGrid.x), 0, int(uClusterGrid.x) - 1),
    clamp(int(uv.y * uClusterGrid.y), 0, int(uClusterGrid.y) - 1),
    clamp(int(slice), 0, int(uClusterGrid.z) - 1)
  );
}

/**
 * Accumulates every local light touching this fragment's froxel.
 *
 * Runs through three's own RE_Direct so local lights get exactly the same
 * BRDF, energy compensation and clearcoat response as the sun; anything else
 * and a torch-lit wall stops matching the same wall in daylight.
 */
void lgtLocalLights(
  vec3 worldPos,
  vec3 viewPos,
  vec3 geometryNormal,
  vec3 geometryViewDir,
  vec3 geometryClearcoatNormal,
  PhysicalMaterial material,
  inout ReflectedLight reflectedLight,
  float rotation
) {
  ivec3 cluster = lgtCluster(viewPos);
  int column = cluster.x + int(uClusterGrid.x) * cluster.z;
  IncidentLight local;

  for (int t = 0; t < ${texels}; t++) {
    vec4 packed = texelFetch(uClusterData, ivec2(column * ${texels} + t, cluster.y), 0);
    for (int c = 0; c < 4; c++) {
      float slot = packed[c] * 255.0;
      if (slot > 254.5) return;
      int index = int(slot + 0.5);

      vec4 posRadius = texelFetch(uLightData, ivec2(0, index), 0);
      vec3 toLight = posRadius.xyz - worldPos;
      float distanceSq = dot(toLight, toLight);
      if (distanceSq > posRadius.w * posRadius.w) continue;

      vec4 colorFalloff = texelFetch(uLightData, ivec2(1, index), 0);
      float attenuation = lgtDistanceAttenuation(distanceSq, colorFalloff.w);
      if (attenuation < 1e-5) continue;

      vec3 direction = toLight * inversesqrt(max(distanceSq, 1e-8));

      vec4 axisScale = texelFetch(uLightData, ivec2(2, index), 0);
      vec4 spotShadow = texelFetch(uLightData, ivec2(3, index), 0);
      if (axisScale.w != 0.0) {
        /* Cone falloff remapped from the outer angle to the penumbra angle and
           squared. A linear ramp leaves a visible straight edge where the
           gradient starts; the square softens the shoulder without touching
           where the cone actually ends. */
        float cosAngle = dot(-direction, axisScale.xyz);
        float cone = clamp(cosAngle * axisScale.w + spotShadow.x, 0.0, 1.0);
        attenuation *= cone * cone;
        if (attenuation < 1e-5) continue;
      } else if (spotShadow.z < 0.999) {
        /* A shaded fitting, which is most of the working lights in an interior:
           an opaque cone over the bulb, so what is under the rim gets the lamp
           and what is over it gets only what the room bounces back. Without
           this a pendant is the brightest thing on its own ceiling — twenty-five
           times what it puts on the table — and every room in the level reads
           top-lit however carefully the daylight is transported. The rim is
           soft rather than a hard horizon because a cone has a rim angle, and
           because a fragment straddling it would otherwise show the seam. */
        float below = dot(-direction, axisScale.xyz);
        attenuation *= mix(spotShadow.z, 1.0, smoothstep(-0.3, 0.12, below));
        if (attenuation < 1e-5) continue;
      }

${
  spots > 0
    ? /* glsl */ `      int shadowIndex = int(spotShadow.y + 0.5) - 1;
      if (shadowIndex >= 0) {
        attenuation *= lgtSpotShadow(shadowIndex, worldPos, rotation);
        if (attenuation < 1e-5) continue;
      }
`
    : ''
}
      local.color = colorFalloff.rgb * attenuation;
      local.direction = normalize((viewMatrix * vec4(direction, 0.0)).xyz);
      local.visible = true;
      RE_Direct(local, viewPos, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
    }
  }
}
`;
}
