import * as THREE from 'three';
import { probeCompiles } from './ShaderProbe';

/**
 * Cascaded shadow support injected into three's built-in lighting chunk.
 *
 * The addon `CSM` class needs `setupMaterial()` on every material plus its own
 * `onBeforeCompile` hook, which does not survive a codebase where several
 * modules build materials independently — it silently clobbers their compile
 * hooks and makes any material it never saw N times too bright. This patch
 * instead rewrites the directional-light section of `lights_fragment_begin`
 * once, so every lit material — present or future, standard, physical, lambert
 * or phong — picks up cascades with no per-material bookkeeping at all.
 *
 * Cascade selection needs no split uniforms: the cascade lights are ordered
 * tightest-first, so the first cascade whose shadow coordinate lands inside its
 * atlas is also the highest-resolution one covering the fragment.
 *
 * The patch is validated by compiling a probe material before the game renders
 * anything; if the driver rejects it, everything is rolled back and the renderer
 * falls back to a single non-cascaded shadow.
 */

const DIR_BLOCK_START = '#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )';
const UNROLL_END = '#pragma unroll_loop_end';

/**
 * Nearest receiver-to-occluder distance the blocker probe resolves, in metres.
 * The lighting rig converts it into the shadow camera's depth units, which is
 * the only place the cascades' metres-per-depth-unit is known.
 */
export const BLOCKER_PROBE_NEAR = 0.6;
/** Occluder distance at which a cascade's authored penumbra radius applies. */
export const PENUMBRA_REFERENCE_DISTANCE = 3;
/** Ceiling on the penumbra scale: past this a 12-tap kernel is thinner than TAA can carry. */
export const PENUMBRA_MAX_SCALE = 3.0;

interface PatchState {
  cascades: number;
  originalLights: string;
  originalShadowPars: string;
}

let state: PatchState | null = null;

/** 12-tap poisson disk; enough taps for a smooth penumbra at 4 hw-filtered samples each. */
const POISSON_12 = [
  [-0.326212, -0.405805],
  [-0.840144, -0.07358],
  [-0.695914, 0.457137],
  [-0.203345, 0.620716],
  [0.96234, -0.194983],
  [0.473434, -0.480026],
  [0.519456, 0.767022],
  [0.185461, -0.893124],
  [0.507431, 0.064425],
  [0.89642, 0.412458],
  [-0.32194, -0.932615],
  [-0.791559, -0.597705],
];

function poissonArrayGlsl(): string {
  const entries = POISSON_12.map(([x, y]) => `vec2( ${x.toFixed(6)}, ${y.toFixed(6)} )`).join(
    ',\n    ',
  );
  return `const vec2 OB_POISSON[ ${POISSON_12.length} ] = vec2[ ${POISSON_12.length} ](\n    ${entries}\n  );`;
}

function shadowLookupGlsl(): string {
  return /* glsl */ `

// ---------------------------------------------------------------------------
// Operation Blackout — cascade shadow lookup (appended by src/render)
// ---------------------------------------------------------------------------
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0

  uniform vec4 obShadowParams;   // x: temporal phase, y: softness, z: unused, w: unused

  ${poissonArrayGlsl()}

  float obShadowDither( vec2 pixel ) {
    return fract( 52.9829189 * fract( dot( pixel, vec2( 0.06711056, 0.00583715 ) ) ) );
  }

  #if defined( SHADOWMAP_TYPE_PCF )
    #define OB_SHADOW_SAMPLER highp sampler2DShadow
    #define OB_SHADOW_FETCH( map, uv, z ) texture( map, vec3( uv, z ) )
  #else
    #define OB_SHADOW_SAMPLER highp sampler2D
    #define OB_SHADOW_FETCH( map, uv, z ) step( z, texture2D( map, uv ).r )
  #endif

  /**
   * Penumbra scale from the receiver-to-occluder distance, which is what makes a
   * shadow tighten where it touches its caster and spread where it does not.
   *
   * A comparison sampler cannot hand back a depth, so the usual blocker search is
   * unavailable. Four comparisons against planes at ${BLOCKER_PROBE_NEAR} m and
   * three geometric steps beyond it recover the distance instead: each one is
   * fully lit until its plane passes in front of the occluder, so their sum is a
   * monotone, hardware-filtered estimate of it for the cost of four taps.
   */
  float obBlockerScale( OB_SHADOW_SAMPLER shadowMap, vec3 coord ) {
    float step0 = obShadowParams.z;
    if ( step0 <= 0.0 ) return 1.0;
    vec4 occluded = 1.0 - vec4(
      OB_SHADOW_FETCH( shadowMap, coord.xy, coord.z - step0 ),
      OB_SHADOW_FETCH( shadowMap, coord.xy, coord.z - step0 * 3.0 ),
      OB_SHADOW_FETCH( shadowMap, coord.xy, coord.z - step0 * 9.0 ),
      OB_SHADOW_FETCH( shadowMap, coord.xy, coord.z - step0 * 27.0 )
    );
    float steps = 1.0 + dot( occluded, vec4( 1.0, 3.0, 10.0, 18.0 ) );
    return clamp( steps * ${(BLOCKER_PROBE_NEAR / PENUMBRA_REFERENCE_DISTANCE).toFixed(6)}, 0.2, obShadowParams.w );
  }

  float obCascadeShadowLookup(
    OB_SHADOW_SAMPLER shadowMap, vec2 shadowMapSize, float shadowIntensity,
    float shadowBias, float shadowRadius, vec4 shadowCoord
  ) {
    vec3 coord = shadowCoord.xyz / shadowCoord.w;
    coord.z += shadowBias;
    if ( coord.z > 1.0 ) return 1.0;

    // Rotate the kernel by blue-ish noise that also advances per frame: the
    // residual noise is what TAA turns into a smooth penumbra, whereas a fixed
    // kernel bands into visible rings.
    float softness = obShadowParams.y > 0.0 ? obShadowParams.y : 1.0;
    float phi = ( obShadowDither( gl_FragCoord.xy ) + obShadowParams.x ) * 6.283185307;
    vec2 rot = vec2( cos( phi ), sin( phi ) );
    softness *= obBlockerScale( shadowMap, coord );
    vec2 radius = ( max( shadowRadius, 0.35 ) * softness ) / shadowMapSize;

    float sum = 0.0;
    for ( int i = 0; i < ${POISSON_12.length}; i ++ ) {
      vec2 o = OB_POISSON[ i ];
      vec2 d = vec2( o.x * rot.x - o.y * rot.y, o.x * rot.y + o.y * rot.x ) * radius;
      #if defined( SHADOWMAP_TYPE_PCF )
        sum += texture( shadowMap, vec3( coord.xy + d, coord.z ) );
      #else
        sum += step( coord.z, texture2D( shadowMap, coord.xy + d ).r );
      #endif
    }
    sum *= ${(1 / POISSON_12.length).toFixed(8)};
    return mix( 1.0, sum, shadowIntensity );
  }

#endif
`;
}

function directionalBlockGlsl(cascades: number): string {
  return /* glsl */ `#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )

	DirectionalLight directionalLight;

	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0

		DirectionalLightShadow directionalLightShadow;

		{
			float obCascadeShadow = 1.0;
			bool obPicked = false;

			#pragma unroll_loop_start
			for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
				#if ( UNROLLED_LOOP_INDEX < ${cascades} )
				if ( ! obPicked ) {
					vec4 obCoord = vDirectionalShadowCoord[ i ];
					vec3 obProj = obCoord.xyz / obCoord.w;
					bool obInside = all( greaterThan( obProj.xy, vec2( 0.012 ) ) ) &&
						all( lessThan( obProj.xy, vec2( 0.988 ) ) ) && obProj.z <= 1.0;
					if ( obInside ) {
						directionalLightShadow = directionalLightShadows[ i ];
						obCascadeShadow = obCascadeShadowLookup(
							directionalShadowMap[ i ], directionalLightShadow.shadowMapSize,
							directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias,
							directionalLightShadow.shadowRadius, obCoord );
						obPicked = true;
					}
				}
				#endif
			}
			#pragma unroll_loop_end

			// Every cascade light shares one direction and colour, so the sun is
			// shaded exactly once with the cascade that was selected above.
			directionalLight = directionalLights[ 0 ];
			getDirectionalLightInfo( directionalLight, directLight );
			directLight.color *= ( directLight.visible && receiveShadow ) ? obCascadeShadow : 1.0;
			RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
		}

	#else

		directionalLight = directionalLights[ 0 ];
		getDirectionalLightInfo( directionalLight, directLight );
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );

	#endif

	#if ( NUM_DIR_LIGHTS > ${cascades} )

		// Extra directional lights owned by other systems keep vanilla behaviour.
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
			#if ( UNROLLED_LOOP_INDEX >= ${cascades} )
			directionalLight = directionalLights[ i ];
			getDirectionalLightInfo( directionalLight, directLight );
			#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
			directionalLightShadow = directionalLightShadows[ i ];
			directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
			#endif
			RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
			#endif
		}
		#pragma unroll_loop_end

	#endif

#endif`;
}

/** The shared uniform every lit material reads the kernel rotation from. */
export const shadowParamsUniform: THREE.IUniform<Float32Array> = {
  value: new Float32Array([0, 1, 0, 0]),
};

/**
 * A `Float32Array` uniform value is copied by reference when three clones
 * `ShaderLib` uniforms for a material, so one array feeds every material in the
 * scene and updating it costs nothing per frame.
 */
function installGlobalUniform(): void {
  const lib = THREE.ShaderLib as unknown as Record<
    string,
    { uniforms: Record<string, THREE.IUniform> }
  >;
  for (const key of Object.keys(lib)) {
    const uniforms = lib[key]?.uniforms;
    if (!uniforms || !('directionalLights' in uniforms)) continue;
    uniforms.obShadowParams = shadowParamsUniform;
  }
}

function removeGlobalUniform(): void {
  const lib = THREE.ShaderLib as unknown as Record<
    string,
    { uniforms: Record<string, THREE.IUniform> }
  >;
  for (const key of Object.keys(lib)) {
    const uniforms = lib[key]?.uniforms;
    if (uniforms && 'obShadowParams' in uniforms) delete uniforms.obShadowParams;
  }
}

export function isCascadePatchActive(): boolean {
  return state !== null;
}

export function patchedCascadeCount(): number {
  return state?.cascades ?? 0;
}

/**
 * Install the cascade patch for `cascades` shadow-casting directional lights.
 * Returns false (and changes nothing) when the chunk does not look like the
 * version this patch was written against.
 */
export function installCascadePatch(cascades: number): boolean {
  if (state !== null) {
    if (state.cascades === cascades) return true;
    uninstallCascadePatch();
  }
  if (cascades < 2) return false;

  const chunks = THREE.ShaderChunk as unknown as Record<string, string>;
  const lights = chunks.lights_fragment_begin;
  const shadowPars = chunks.shadowmap_pars_fragment;
  if (typeof lights !== 'string' || typeof shadowPars !== 'string') return false;

  const start = lights.indexOf(DIR_BLOCK_START);
  if (start < 0) return false;
  const unrollEnd = lights.indexOf(UNROLL_END, start);
  if (unrollEnd < 0) return false;
  const endifIndex = lights.indexOf('#endif', unrollEnd);
  if (endifIndex < 0) return false;
  const end = endifIndex + '#endif'.length;

  state = {
    cascades,
    originalLights: lights,
    originalShadowPars: shadowPars,
  };

  chunks.lights_fragment_begin =
    lights.slice(0, start) + directionalBlockGlsl(cascades) + lights.slice(end);
  chunks.shadowmap_pars_fragment = shadowPars + shadowLookupGlsl();
  installGlobalUniform();
  return true;
}

export function uninstallCascadePatch(): void {
  if (!state) return;
  const chunks = THREE.ShaderChunk as unknown as Record<string, string>;
  chunks.lights_fragment_begin = state.originalLights;
  chunks.shadowmap_pars_fragment = state.originalShadowPars;
  removeGlobalUniform();
  state = null;
}

/**
 * Compile a probe material through the patched chunks. Any link failure rolls
 * the patch back, so a driver that dislikes the injected GLSL costs us cascade
 * quality rather than a black screen.
 */
export function validateCascadePatch(
  renderer: THREE.WebGLRenderer,
  lights: readonly THREE.DirectionalLight[],
): boolean {
  if (!state) return false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 2, 4);

  const geometry = new THREE.PlaneGeometry(4, 4);
  const probes: THREE.Material[] = [
    new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.2 }),
    new THREE.MeshPhysicalMaterial({ roughness: 0.4, clearcoat: 0.5 }),
    new THREE.MeshLambertMaterial({ color: 0x808080 }),
  ];
  for (const m of probes) {
    const mesh = new THREE.Mesh(geometry, m);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
  }
  // Mirror the real rig so the probe compiles the same permutation.
  for (const light of lights) {
    const clone = new THREE.DirectionalLight(light.color.getHex(), 1);
    clone.castShadow = light.castShadow;
    clone.shadow.mapSize.setScalar(64);
    scene.add(clone);
    scene.add(clone.target);
  }
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 0.2));

  const linked = probeCompiles(renderer, scene, camera);

  geometry.dispose();
  for (const m of probes) m.dispose();
  scene.clear();

  if (!linked) {
    console.warn('[render] cascade shader patch rejected by the driver; using single-cascade shadows');
    uninstallCascadePatch();
    return false;
  }
  return true;
}
