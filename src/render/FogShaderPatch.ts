import * as THREE from 'three';

/**
 * Aerial perspective, injected into three's fog chunks.
 *
 * `FogExp2` gives one grey mix factor per distance. That cannot produce aerial
 * perspective, because atmosphere does three things at once and only one of them
 * is a mix: it extincts the surface's own radiance *per wavelength*, it adds
 * airlight whose brightness comes from the sky rather than from a hand-picked
 * colour, and its density falls off with altitude so ground haze sits low while
 * a rooftop two hundred metres away stays comparatively clear. Stock fog with a
 * colour dimmer than the surfaces it covers — which is what a horizon tint is
 * next to sunlit stone — makes distance *darker* and lower contrast, the exact
 * opposite of what real distance does.
 *
 * Rewriting the chunks rather than adding a screen-space pass keeps one code
 * path for opaque geometry, particles and alpha-blended decals alike; a
 * depth-buffer pass would apply the wrong distance to everything transparent and
 * would need its own tier gating.
 *
 * The world position is reconstructed from `mvPosition` and `viewMatrix` instead
 * of from `worldPosition`, because `worldpos_vertex` is conditional and
 * `transformed` does not exist in the sprite vertex shader, whereas `mvPosition`
 * is in scope everywhere `fog_vertex` is.
 */

interface FogPatchState {
  parsVertex: string;
  vertex: string;
  parsFragment: string;
  fragment: string;
}

let state: FogPatchState | null = null;

/**
 * x: 1 / scale height, y: base altitude, z: red extinction excess,
 * w: blue extinction excess. The two extinction terms are excesses over green
 * rather than absolute coefficients, so the density the lighting rig sets stays
 * a single number, and so a material that reaches this shader without the
 * uniform falls back to neutral grey fog instead of extincting green alone.
 */
export const fogProfileUniform: THREE.IUniform<Float32Array> = {
  value: new Float32Array([1 / 26, -6, -0.38, 0.55]),
};

/** xyz: direction towards the sun, w: forward-scattering gain. */
export const fogSunUniform: THREE.IUniform<Float32Array> = {
  value: new Float32Array([0, 1, 0, 0]),
};

/** xyz: forward-scattering tint, w: its angular exponent. */
export const fogGlowUniform: THREE.IUniform<Float32Array> = {
  value: new Float32Array([1, 0.94, 0.84, 6]),
};

const PARS_VERTEX = /* glsl */ `
#ifdef USE_FOG
	varying float vFogDepth;
	varying vec3 vObFogWorld;
#endif
`;

const VERTEX = /* glsl */ `
#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
	// view -> world without the camera's world matrix: for an orthonormal view
	// basis, right-multiplying by viewMatrix applies its transpose, and adding the
	// camera position supplies the translation that leaves out.
	vObFogWorld = ( vec4( mvPosition.xyz, 1.0 ) * viewMatrix ).xyz + cameraPosition;
#endif
`;

const PARS_FRAGMENT = /* glsl */ `
#ifdef USE_FOG

	uniform vec3 fogColor;
	varying float vFogDepth;
	varying vec3 vObFogWorld;

	uniform vec4 obFogProfile;
	uniform vec4 obFogSun;
	uniform vec4 obFogGlow;

	#ifdef FOG_EXP2

		uniform float fogDensity;

	#else

		uniform float fogNear;
		uniform float fogFar;

	#endif

#endif
`;

const FRAGMENT = /* glsl */ `
#ifdef USE_FOG

	#ifdef FOG_EXP2

		vec3 obFogRel = vObFogWorld - cameraPosition;
		float obFogDist = length( obFogRel );
		vec3 obFogDir = obFogDist > 1e-4 ? obFogRel / obFogDist : vec3( 0.0, 0.0, -1.0 );

		// Optical path through an exponentially thinning medium. The level-ray
		// case is split out because that is exactly where the difference of two
		// nearly equal exponentials loses all its significant digits.
		float obFogY0 = clamp( ( cameraPosition.y - obFogProfile.y ) * obFogProfile.x, -4.0, 24.0 );
		float obFogY1 = clamp( ( vObFogWorld.y - obFogProfile.y ) * obFogProfile.x, -4.0, 24.0 );
		float obFogDy = obFogY1 - obFogY0;
		float obFogPath = abs( obFogDy ) < 1e-3
			? obFogDist * exp( - obFogY0 )
			: obFogDist * ( exp( - obFogY0 ) - exp( - obFogY1 ) ) / obFogDy;

		vec3 obFogSigma = fogDensity * ( 1.0 + vec3( obFogProfile.z, 0.0, obFogProfile.w ) );
		vec3 obFogT = exp( - obFogSigma * max( obFogPath, 0.0 ) );

		// Looking into the sun, the haze between the eye and the surface is lit
		// from behind; that silver is most of what reads as depth on a hazy day.
		float obFogFwd = pow( max( dot( obFogDir, obFogSun.xyz ), 0.0 ), obFogGlow.w );
		vec3 obFogAir = fogColor + obFogGlow.xyz * ( obFogFwd * obFogSun.w );

		gl_FragColor.rgb = gl_FragColor.rgb * obFogT + obFogAir * ( 1.0 - obFogT );

	#else

		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
		gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );

	#endif

#endif
`;

/**
 * A `Float32Array` uniform value survives `cloneUniforms` by reference, so one
 * array feeds every material in the scene and a per-frame update costs nothing.
 * `UniformsLib.fog` covers materials other modules assemble by merging it;
 * `ShaderLib` covers the built-ins, whose uniforms were merged before this ran.
 */
function installGlobalUniforms(): void {
  const targets: Array<Record<string, THREE.IUniform>> = [];
  const lib = THREE.UniformsLib as unknown as Record<string, Record<string, THREE.IUniform>>;
  if (lib.fog) targets.push(lib.fog);
  const shaders = THREE.ShaderLib as unknown as Record<
    string,
    { uniforms: Record<string, THREE.IUniform> }
  >;
  for (const key of Object.keys(shaders)) {
    const uniforms = shaders[key]?.uniforms;
    if (uniforms && 'fogColor' in uniforms) targets.push(uniforms);
  }
  for (const uniforms of targets) {
    uniforms.obFogProfile = fogProfileUniform;
    uniforms.obFogSun = fogSunUniform;
    uniforms.obFogGlow = fogGlowUniform;
  }
}

function removeGlobalUniforms(): void {
  const lib = THREE.UniformsLib as unknown as Record<string, Record<string, THREE.IUniform>>;
  const shaders = THREE.ShaderLib as unknown as Record<
    string,
    { uniforms: Record<string, THREE.IUniform> }
  >;
  const targets: Array<Record<string, THREE.IUniform>> = [];
  if (lib.fog) targets.push(lib.fog);
  for (const key of Object.keys(shaders)) {
    const uniforms = shaders[key]?.uniforms;
    if (uniforms && 'obFogProfile' in uniforms) targets.push(uniforms);
  }
  for (const uniforms of targets) {
    delete uniforms.obFogProfile;
    delete uniforms.obFogSun;
    delete uniforms.obFogGlow;
  }
}

export function isFogPatchActive(): boolean {
  return state !== null;
}

/** Replace the four fog chunks. Returns false if they are already patched. */
export function installFogPatch(): boolean {
  if (state !== null) return true;
  const chunks = THREE.ShaderChunk as unknown as Record<string, string>;
  const parsVertex = chunks.fog_pars_vertex;
  const vertex = chunks.fog_vertex;
  const parsFragment = chunks.fog_pars_fragment;
  const fragment = chunks.fog_fragment;
  if (
    typeof parsVertex !== 'string' ||
    typeof vertex !== 'string' ||
    typeof parsFragment !== 'string' ||
    typeof fragment !== 'string'
  ) {
    return false;
  }
  // The stock chunk this replaces has to look like the version it was written
  // against, or a three upgrade would silently drop whatever it added.
  if (!vertex.includes('vFogDepth = - mvPosition.z')) return false;

  state = { parsVertex, vertex, parsFragment, fragment };
  chunks.fog_pars_vertex = PARS_VERTEX;
  chunks.fog_vertex = VERTEX;
  chunks.fog_pars_fragment = PARS_FRAGMENT;
  chunks.fog_fragment = FRAGMENT;
  installGlobalUniforms();
  return true;
}

export function uninstallFogPatch(): void {
  if (!state) return;
  const chunks = THREE.ShaderChunk as unknown as Record<string, string>;
  chunks.fog_pars_vertex = state.parsVertex;
  chunks.fog_vertex = state.vertex;
  chunks.fog_pars_fragment = state.parsFragment;
  chunks.fog_fragment = state.fragment;
  removeGlobalUniforms();
  state = null;
}

/**
 * Compile a fogged probe material. A driver that rejects the injected GLSL costs
 * aerial perspective rather than a scene of untextured black.
 */
export function validateFogPatch(renderer: THREE.WebGLRenderer): boolean {
  if (!state) return false;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x808080, 0.01);
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 2, 4);

  const geometry = new THREE.PlaneGeometry(4, 4);
  const probes: THREE.Material[] = [
    new THREE.MeshStandardMaterial({ roughness: 0.6 }),
    new THREE.MeshBasicMaterial({ color: 0x808080 }),
    new THREE.PointsMaterial({ size: 2 }),
  ];
  scene.add(new THREE.Mesh(geometry, probes[0]));
  scene.add(new THREE.Mesh(geometry, probes[1]));
  scene.add(new THREE.Points(geometry, probes[2]));
  scene.add(new THREE.Sprite(new THREE.SpriteMaterial({ fog: true })));
  scene.add(new THREE.DirectionalLight(0xffffff, 1));

  let failed = false;
  const prevCheck = renderer.debug.checkShaderErrors;
  const prevHandler = renderer.debug.onShaderError;
  renderer.debug.checkShaderErrors = true;
  renderer.debug.onShaderError = (): void => {
    failed = true;
  };
  try {
    renderer.compile(scene, camera);
  } catch {
    failed = true;
  }
  renderer.debug.checkShaderErrors = prevCheck;
  renderer.debug.onShaderError = prevHandler;

  geometry.dispose();
  for (const m of probes) m.dispose();
  scene.traverse((o) => {
    const sprite = o as THREE.Sprite;
    if (sprite.isSprite) sprite.material.dispose();
  });
  scene.clear();

  if (failed) {
    console.warn('[render] aerial-perspective fog patch rejected by the driver; using stock fog');
    uninstallFogPatch();
    return false;
  }
  return true;
}
