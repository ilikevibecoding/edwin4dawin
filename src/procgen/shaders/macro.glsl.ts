import { COMMON_GLSL } from './common.glsl';
import { NOISE_GLSL } from './noise.glsl';

/**
 * World-space macro variation, layered over every architectural material.
 *
 * A tiled texture carries no information at any scale larger than its tile. Past
 * the first repeat a wall is the same wall again, so a twenty-metre facade or a
 * plaza floor reads as one flat value however much detail the tile itself holds —
 * and that is what separates a real photograph, where nothing is ever uniform
 * across a whole surface, from a rendering of a tiled quad.
 *
 * Everything here is therefore authored in metres of world space rather than in
 * UV, which makes it indifferent to each mesh's tile rate and continuous across
 * the seam between two meshes tiled differently. Three things are layered:
 *
 *   - a low-frequency tonal and warm/cool drift, at a period several times the
 *     tile, so no two parts of a surface match;
 *   - grime, accumulating where it does in life: at the foot of walls, in the
 *     creases the baked occlusion already marks, and as dust on anything facing
 *     up;
 *   - vertical drip staining below the level where water runs off.
 *
 * The cost is three texture fetches and about thirty ALU on top of a standard
 * material, and the mask that drives the grime is free: it is the ambient
 * occlusion the surface bake already wrote into the packed ORM texture.
 */

/** Channels of the shared macro field, baked once at {@link MACRO_TEXTURE_SIZE}. */
export const MACRO_BAKE_FRAGMENT = /* glsl */ `
precision highp float;

in vec2 vUv;

layout(location = 0) out vec4 outMacro;

uniform vec2 uTexel;
uniform float uSeed;

${NOISE_GLSL}
${COMMON_GLSL}

void main() {
  vec2 uv = vUv + uSeed * 0.017;

  // Two independent low-frequency fields. Sampled at different world scales by
  // the consumer, they give four decorrelated octaves out of two fetches.
  // Named mottle rather than patch, which GLSL ES 3.0 reserves.
  //
  // Both are contrast-expanded about their midpoint. Summed octaves only reach
  // their nominal extremes where every octave happens to agree, so the raw field
  // occupies about a third of 0..1 and a consumer asking for a given swing gets a
  // third of it; measured on a facade, an authored warm/cool drift of 0.17 was
  // arriving as two levels of 255. The gain is what makes the strengths mean what
  // they say, and stays low enough not to flatten the field into plateaux.
  float broad = sat(fbm2(uv * 3.0, vec2(3.0), 4) * 1.05 + 0.5);
  float mottle = sat(fbm2(uv * 5.0 + 19.7, vec2(5.0), 3) * 1.05 + 0.5);

  // Anisotropic field for run-off: coherent along v, broken along u, so the
  // consumer gets vertical streaks by mapping v to world height.
  float streak = fbmValue2(uv * vec2(34.0, 3.0), vec2(34.0, 3.0), 3);
  streak = mix(streak, ridged2(uv * vec2(17.0, 2.0), vec2(17.0, 2.0), 3, 0.5, 2.0), 0.35);

  // A mask with large clean areas: weathering is patchy, and a stain that covers
  // everything evenly is just a darker material.
  float mask = sat(fbm2(uv * 2.0 - 7.3, vec2(2.0), 3) * 0.5 + 0.5);

  outMacro = vec4(sat(broad), sat(mottle), sat(streak), sat(mask));
}
`;

export const MACRO_TEXTURE_SIZE = 256;

/** Vertex-side world position, matching three's own batching and instancing. */
export const MACRO_VERTEX_GLSL = /* glsl */ `
  vec4 obMacroLocal = vec4( transformed, 1.0 );
  #ifdef USE_BATCHING
    obMacroLocal = batchingMatrix * obMacroLocal;
  #endif
  #ifdef USE_INSTANCING
    obMacroLocal = instanceMatrix * obMacroLocal;
  #endif
  vObMacroWorld = ( modelMatrix * obMacroLocal ).xyz;
`;

export const MACRO_FRAGMENT_PARS_GLSL = /* glsl */ `
uniform sampler2D obMacroMap;
uniform vec4 obMacroTone;   // x: tonal swing, y: hue swing, z: grime, w: streak
uniform vec4 obMacroShape;  // x: 1/drift metres, y: dado height, z: ground level, w: 1/streak metres
varying vec3 vObMacroWorld;
`;

export const MACRO_FRAGMENT_GLSL = /* glsl */ `
  {
    vec3 obP = vObMacroWorld;

    // A sheared planar lookup rather than a triplanar blend. The shear makes the
    // field vary along all three axes, which is all a low-frequency drift needs,
    // and it costs one fetch where a blend costs three plus the weights.
    vec2 obDriftUv = obP.xz * obMacroShape.x + obP.y * obMacroShape.x * vec2( 0.41, -0.33 );
    vec4 obBroad = texture2D( obMacroMap, obDriftUv );

    // The near octave is what breaks a tile's own repeat, so it has to be
    // comparable to a tile rather than to a facade. At the drift period this
    // second lookup sat at 2.6 m against tiles authored at 1.2 to 2 m, which is
    // coarser than every one of them: measured on the brick, the layer moved the
    // metre scale and left the 75 mm course rhythm it was supposed to disguise
    // completely intact. At 1.4 m it beats against the repeat instead.
    vec2 obNearUv = obDriftUv * 8.0 + vec2( 0.37, 0.71 );
    vec2 obNearField = texture2D( obMacroMap, obNearUv ).ga;

    float obDrift = obBroad.r * 0.58 + obNearField.x * 0.42;

    // True geometric normal from the world position's screen derivatives: the
    // mapped normal would make the grime follow the tile's own bumps, and this
    // needs no interpolator of its own.
    vec3 obFace = cross( dFdx( obP ), dFdy( obP ) );
    float obFaceLen = length( obFace );
    vec3 obNormalW = obFaceLen > 1e-9 ? obFace / obFaceLen : vec3( 0.0, 1.0, 0.0 );
    obNormalW *= dot( obNormalW, cameraPosition - obP ) < 0.0 ? -1.0 : 1.0;
    float obUp = obNormalW.y;

    // Splash-back and capillary rise up the foot of a wall, patchy rather than a
    // band, and only on surfaces steep enough for water to have run down them.
    float obDado = 1.0 - smoothstep( 0.0, obMacroShape.y, obP.y - obMacroShape.z );
    obDado *= saturate( 1.0 - abs( obUp ) * 1.6 ) * ( 0.35 + 0.65 * obBroad.w );

    // Dust settles on anything facing up; the same field breaks it into drifts.
    float obDust = saturate( obUp ) * saturate( obUp ) * ( 0.3 + 0.7 * obNearField.y );

    float obCavity = 0.0;
    #ifdef USE_ROUGHNESSMAP
      // The surface bake already wrote occlusion into this texture's red
      // channel, which is exactly the crease mask grime wants and is already
      // resident: dirt collects in the creases, not on the high points.
      obCavity = saturate( 1.0 - texelRoughness.r ) * ( 0.4 + 0.6 * obBroad.w );
    #endif

    float obGrime = saturate( ( obDado * 0.9 + obDust * 0.55 + obCavity * 0.5 ) * obMacroTone.z );

    // Run-off below sills and ledges. Coherent vertically, broken horizontally,
    // and gated on the same patch mask so most of the wall stays clean.
    float obStreakV = texture2D(
      obMacroMap,
      vec2( ( obP.x + obP.z ) * obMacroShape.w, obP.y * obMacroShape.w * 0.11 )
    ).b;
    float obStreak = saturate( 1.0 - abs( obUp ) * 1.4 ) * obMacroTone.w *
      smoothstep( 0.45, 0.95, obStreakV * ( 0.55 + 0.75 * obBroad.w ) );

    // Tonal drift first, so the grime that follows sits on top of it rather than
    // being scaled by it.
    diffuseColor.rgb *= 1.0 + ( obDrift - 0.5 ) * obMacroTone.x;
    diffuseColor.rgb *= mix(
      vec3( 1.0 - obMacroTone.y * 0.55, 1.0 - obMacroTone.y * 0.16, 1.0 + obMacroTone.y ),
      vec3( 1.0 + obMacroTone.y, 1.0, 1.0 - obMacroTone.y * 0.9 ),
      obDrift
    );

    // Grime as a multiplier rather than a blend towards a dirt colour: the tile's
    // own structure has to survive it, or the surface reads as painted mud.
    diffuseColor.rgb *= mix( vec3( 1.0 ), vec3( 0.56, 0.50, 0.42 ), obGrime );
    diffuseColor.rgb *= mix( vec3( 1.0 ), vec3( 0.62, 0.60, 0.57 ), obStreak );

    #ifdef USE_ROUGHNESSMAP
      // Damp concrete is darker and glossier; dust and dry grime are matte.
      float obDamp = smoothstep( 0.62, 0.98, 1.0 - obDrift ) * obBroad.w;
      diffuseColor.rgb *= mix( vec3( 1.0 ), vec3( 0.74, 0.76, 0.80 ), obDamp * 0.7 );
      roughnessFactor = clamp(
        roughnessFactor + obGrime * 0.14 + obStreak * 0.06 - obDamp * 0.30,
        0.045,
        1.0
      );
    #endif
  }
`;
