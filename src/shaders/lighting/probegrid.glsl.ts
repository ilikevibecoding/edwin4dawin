import * as THREE from 'three';

/**
 * Stops the bounce grid reading through walls.
 *
 * three's own probe-grid lookup is a hardware trilinear fetch of the eight
 * cells around the sample point, and at any probe spacing a level can afford
 * that is the single largest error in an interior. The grid over this town is
 * 2 m across; a café wall is 0.35 m thick. So a fragment on the inside of that
 * wall has cells on *both* sides of it in its stencil, and the one outside is
 * holding the street: measured in the café this level ships, the cell 0.34 m
 * beyond the window wall carried ten times the room's DC coefficient and took
 * 26% of the weight on the ceiling beside it. Three quarters of what lit that
 * ceiling arrived from outdoors, through a slab and a wall, and no amount of
 * care in the bake can survive it — the bake had that cell right.
 *
 * That is both halves of what the review measured. It is most of why the
 * ceiling outshone the floor: a ceiling has no aperture of its own, so
 * whatever leaks in is *all* it has, while the floor at least had a window to
 * dilute it. And it is why one wall of the room was blue and the wall opposite
 * was warm — the blue one is the one with the street behind it, close enough
 * for the stencil to reach through.
 *
 * The cure is the one already proven on the sky-visibility volume next door:
 * sharpen the weights in the two axes tangent to the surface and leave them
 * linear along its normal. A fragment then reads the cells in front of and
 * behind itself smoothly, and the ones sideways — the ones that can be through
 * a wall without being far away — only while they are close. It is the correct
 * prior in both directions: a fragment in the street equally stops reading the
 * room behind the façade.
 *
 * What makes it worth doing this way rather than with an eight-tap loop is
 * that the weight is *separable*. The tangential sharpening is a per-axis
 * function of that axis's interpolation fraction alone, so normalising it per
 * axis and feeding the result back as a remapped fraction reproduces the
 * eight-corner weighted sum exactly — while still costing one hardware fetch
 * per sub-volume instead of eight. Seven texture reads, as before, and the
 * arithmetic is a dozen instructions.
 *
 * Installed by overriding the stock chunk, so it applies to every lit material
 * in the scene including the ones the material library compiles for itself,
 * and so nothing has to be re-patched when they rebuild.
 */
export function installProbeGridLeakGuard(): void {
  if (THREE.ShaderChunk.lightprobes_pars_fragment === GUARDED) return;
  THREE.ShaderChunk.lightprobes_pars_fragment = GUARDED;
}

const GUARDED = /* glsl */ `
#ifdef USE_LIGHT_PROBES_GRID

// Single atlas 3D texture that stores all 7 SH sub-volumes stacked along Z.
// Atlas depth = 7 * ( nz + 2 ) where nz = probesResolution.z.
uniform highp sampler3D probesSH;

uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;

vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {

	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = max( res - 1.0, vec3( 1.0 ) );
	vec3 probeSpacing = gridRange / resMinusOne;

	// Half a probe along the normal, as the stock chunk does: it is what keeps a
	// surface from reading the cell buried in the solid it is the skin of.
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 grid = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 ) * resMinusOne;

	// Sharpen across the surface, leave linear along it. Cubing both corner
	// weights and renormalising is the eight-tap weighting written per axis;
	// the two agree because the weight is a product over the axes.
	vec3 cellBase = floor( grid );
	vec3 f = clamp( grid - cellBase, 0.0, 1.0 );
	vec3 along = abs( worldNormal );
	vec3 far = mix( f * f * f, f, along );
	vec3 near = mix( ( 1.0 - f ) * ( 1.0 - f ) * ( 1.0 - f ), 1.0 - f, along );
	vec3 uvw = clamp( ( cellBase + far / max( far + near, vec3( 1e-6 ) ) ) / resMinusOne, 0.0, 1.0 );

	// Remap to texel centers of the probe grid (XY and Z)
	uvw = uvw * resMinusOne / res + 0.5 / res;

	float nz = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth = 7.0 * paddedSlices;
	float uvZBase = uvw.z * nz + 1.0;

	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                     ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices ) / atlasDepth ) );

	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;

	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;

	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );

	return max( result, vec3( 0.0 ) );

}

#endif
`;
