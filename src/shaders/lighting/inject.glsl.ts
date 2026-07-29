import { LGT_COMMON } from './common.glsl';
import { csmPars } from './csm.glsl';
import { ambientPars } from './ambient.glsl';
import { clusterPars } from './clustered.glsl';

/**
 * Assembles the rig's contribution to a surface shader.
 *
 * three's own light loop is left alone. The key light is not a scene light at
 * all — it never enters `NUM_DIR_LIGHTS`, so there is no default shadow map to
 * fight with and no recompile when it changes — and local lights arrive as
 * texture data. Everything is spliced in around three's chunks rather than
 * replacing them, which is what lets the material library's parallax patch and
 * this one coexist on the same material.
 */

export interface LightingShaderConfig {
  cascades: number;
  pcss: boolean;
  shadowTaps: number;
  blockerTaps: number;
  cloudShadows: boolean;
  /** Recover the near-field cast shadow the filtered lookup biases away. */
  contactShadows: boolean;
  skyVisibility: boolean;
  clustered: boolean;
  lightsPerCluster: number;
  spotShadows: number;
}

export interface LightingChunks {
  /** Declarations and functions, spliced after three's lighting pars. */
  pars: string;
  /** Direct light and the ambient aperture, after `lights_fragment_begin`. */
  direct: string;
  /** Probe occlusion, after `lights_fragment_maps`. */
  indirect: string;
  defines: Record<string, number>;
  /** Program cache discriminator; changes whenever the code above does. */
  key: string;
}

export function buildLightingChunks(config: LightingShaderConfig): LightingChunks {
  const cascades = Math.max(0, Math.min(4, config.cascades));
  const clustered = config.clustered;
  const spotShadows = clustered ? Math.max(0, Math.min(4, config.spotShadows)) : 0;

  const defines: Record<string, number> = {
    LGT_SHADOWS: cascades > 0 ? 1 : 0,
    LGT_PCSS: config.pcss ? 1 : 0,
    LGT_CLOUD_SHADOWS: config.cloudShadows ? 1 : 0,
    LGT_CLUSTERED: clustered ? 1 : 0,
  };

  const pars = [
    LGT_COMMON,
    /* glsl */ `
uniform vec3 uSunDirection;
/** Irradiance on a surface facing the key light, in engine units. */
uniform vec3 uSunRadiance;
`,
    cascades > 0
      ? csmPars({
          cascades,
          pcss: config.pcss,
          taps: config.shadowTaps,
          blockerTaps: config.blockerTaps,
          cloudShadows: config.cloudShadows,
          contact: config.contactShadows,
        })
      : /* glsl */ `
float lgtSunShadow(vec3 worldPos, vec3 worldNormal, float viewDepth, float NdotL, vec2 fragCoord) {
  return 1.0;
}
`,
    ambientPars({ skyVisibility: config.skyVisibility }),
    clustered
      ? clusterPars({ perCluster: config.lightsPerCluster, spotShadows })
      : '',
  ].join('\n');

  const direct = /* glsl */ `
#if defined( RE_Direct )
  vec3 lgtWorldPos = lgtWorldPosition(geometryPosition);
  vec3 lgtWorldNormal = transformNormalByInverseViewMatrix(geometryNormal, viewMatrix);
  /* The shadow lookup is offset along the *geometric* normal. Using the
     mapped normal instead makes the offset follow the normal map, which warps
     shadow edges across a brick course and looks like a projection bug. */
  vec3 lgtFlatNormal = transformNormalByInverseViewMatrix(nonPerturbedNormal, viewMatrix);
  /* The volume is read against the *geometric* normal too: the read rejects
     probes on the far side of the surface, and a normal map that tilts the
     test by thirty degrees would let a ceiling read the sky above its slab
     wherever the plaster happened to be bumpy. */
  vec4 lgtVis = lgtSkyVisibility(lgtWorldPos, lgtFlatNormal);
  float lgtAperture = lgtSkyAperture(lgtVis, lgtWorldNormal);
  float lgtRotation = lgtIGN(gl_FragCoord.xy) * 6.283185;

  {
    /* Everything about the shadow lookup keys off the *geometric* cosine, not
       the mapped one: the bias slope, because slope-scaling off a normal map
       makes the offset vary per pixel across a flat surface; and the gate,
       because a face turned away from the sun does not receive sun however its
       normal map is painted. Three's own N.L inside RE_Direct still uses the
       mapped normal, which is what gives the surface its relief. */
    float lgtFlatNdotL = dot(lgtFlatNormal, uSunDirection);
    /* Skip the filter on surfaces the key light cannot reach at all. On a street
       at a low sun that is most of the frame, and it is the cheapest shadow
       optimisation there is. */
    if (lgtFlatNdotL > 0.0) {
      IncidentLight lgtSun;
      lgtSun.color = uSunRadiance * lgtSunShadow(
        lgtWorldPos, lgtFlatNormal, -geometryPosition.z, lgtFlatNdotL, gl_FragCoord.xy
      );
      lgtSun.direction = normalize((viewMatrix * vec4(uSunDirection, 0.0)).xyz);
      lgtSun.visible = true;
      RE_Direct(lgtSun, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight);
    }
  }

  #if LGT_CLUSTERED
    lgtLocalLights(
      lgtWorldPos, geometryPosition, geometryNormal, geometryViewDir,
      geometryClearcoatNormal, material, reflectedLight, lgtRotation
    );
  #endif

  #if defined( RE_IndirectDiffuse )
    irradiance += lgtHemisphereFill(lgtWorldNormal, lgtAperture);
  #endif
#endif
`;

  const indirect = /* glsl */ `
#if defined( RE_Direct )
  #if defined( RE_IndirectDiffuse )
    /* The prefiltered probe is the open sky and the terrain under it. How much
       of that a point can see is the whole difference between an interior that
       reads as a room and one that reads as an exterior with a roof drawn on. */
    #if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
      /*
       * Indoors the arriving light is not the hemisphere average. It is
       * whatever the opening frames, and a room with a window onto a sunlit
       * street is lit warm through it; averaging the whole probe hands that
       * room the zenith instead, which is how an interior wall ends up
       * measurably bluer than the sky outside it.
       *
       * Nor is it a single direction. What a surface receives through an
       * opening is the part of the opening the surface can see, weighted by
       * cosine, so the mean direction lies between the opening and the normal
       * — and that is the whole reason a real room is brighter on the floor
       * than on the ceiling without a scrap of direct sun in it. A floor looks
       * up through the window at the sky; the ceiling looks down through the
       * same window at the street, which is in shadow. Aim the lookup at the
       * opening alone and the two come back identical, which is a room lit
       * from nowhere in particular and reads as one immediately.
       */
      float lgtBentLength = length( lgtVis.xyz );
      vec3 lgtOpening = lgtBentLength > 1e-4 ? lgtVis.xyz / lgtBentLength : lgtWorldNormal;
      vec3 lgtPortalDir = normalize( mix( lgtOpening, lgtWorldNormal, 0.45 ) );
      vec3 lgtPortal = PI * textureCubeUV( envMap, envMapRotation * lgtPortalDir, 1.0 ).rgb * envMapIntensity;
      iblIrradiance = mix( lgtPortal, iblIrradiance, smoothstep( 0.06, 0.3, lgtVis.w ) );
    #endif
    iblIrradiance *= lgtAperture;
  #endif
  #if defined( RE_IndirectSpecular )
    float lgtNdotV = saturate(dot(geometryNormal, geometryViewDir));
    /* Fed the cosine-weighted aperture rather than the raw openness: openness
       is a fraction of the whole sphere, so a point in the open reads 0.5 and
       would halve every reflection in the level. */
    radiance *= lgtSpecularOcclusion(lgtAperture, lgtNdotV, material.roughness);
    #ifdef USE_CLEARCOAT
      clearcoatRadiance *= lgtSpecularOcclusion(lgtAperture, lgtNdotV, material.clearcoatRoughness);
    #endif
  #endif
#endif
`;

  const key = [
    'lgt',
    cascades,
    config.pcss ? 'p' : 'f',
    config.shadowTaps,
    config.blockerTaps,
    config.contactShadows ? 'k' : '',
    config.cloudShadows ? 'c' : '',
    config.skyVisibility ? 'v' : '',
    clustered ? `l${config.lightsPerCluster}s${spotShadows}` : '',
  ].join(':');

  return { pars, direct, indirect, defines, key };
}
