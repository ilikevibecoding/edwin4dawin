/**
 * Material library. Two things here are load-bearing for the look:
 *  1. a global patch to three's physical lighting chunk that adds wrapped
 *     "subsurface" diffuse, so skin does not read like painted plastic;
 *  2. helpers that wire the procedural texture sets onto physical materials
 *     with consistent tiling.
 */
import * as THREE from 'three';
import * as Tex from './textures';

let patched = false;

/**
 * Adds an opt-in wrapped-diffuse + terminator-tint term to MeshPhysicalMaterial.
 * Materials enable it with `defines.SSS_WRAP` plus `sssWrap` / `sssColor` uniforms.
 */
export function patchSubsurfaceLighting(): void {
  if (patched) return;
  patched = true;
  const key = 'lights_physical_pars_fragment';
  const src = THREE.ShaderChunk[key];
  const find = /float dotNL = saturate\( dot\( geometryNormal, directLight\.direction \) \);\s+vec3 irradiance = dotNL \* directLight\.color;/;
  if (!find.test(src)) {
    console.warn('[materials] subsurface patch did not match three shader chunk; skin will use standard diffuse');
    return;
  }
  THREE.ShaderChunk[key] = src.replace(
    find,
    /* glsl */ `
	float rawNL = dot( geometryNormal, directLight.direction );
	float dotNL = saturate( rawNL );

	#ifdef SSS_WRAP
		float wrapNL = saturate( ( rawNL + sssWrap ) / ( 1.0 + sssWrap ) );
		float term = smoothstep( 0.42, - sssWrap, rawNL );
		vec3 irradiance = wrapNL * directLight.color * mix( vec3( 1.0 ), sssColor, term );
	#else
		vec3 irradiance = dotNL * directLight.color;
	#endif
`,
  );
}

export type SkinOpts = {
  tone?: [number, number, number];
  wrap?: number;
  sss?: [number, number, number];
  rough?: number;
  size?: number;
};

/** Skin: wrapped diffuse, oily clearcoat sheen, pore normals. */
export function skinMaterial(o: SkinOpts = {}): THREE.MeshPhysicalMaterial {
  patchSubsurfaceLighting();
  const tone = o.tone ?? [0.68, 0.47, 0.4];
  const set = Tex.skin(o.size ?? 512, tone);
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: set.map,
    normalMap: set.normalMap,
    roughnessMap: set.roughnessMap,
    roughness: o.rough ?? 0.62,
    metalness: 0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.55,
    sheen: 0.24,
    sheenRoughness: 0.72,
    sheenColor: new THREE.Color(0.9, 0.62, 0.55).convertSRGBToLinear(),
    normalScale: new THREE.Vector2(0.55, 0.55),
  });
  m.map!.repeat.set(1, 1);
  const sss = o.sss ?? [1.0, 0.42, 0.3];
  m.defines = { ...(m.defines ?? {}), SSS_WRAP: '' };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.sssWrap = { value: o.wrap ?? 0.42 };
    shader.uniforms.sssColor = { value: new THREE.Vector3(sss[0], sss[1], sss[2]) };
    shader.fragmentShader = 'uniform float sssWrap;\nuniform vec3 sssColor;\n' + shader.fragmentShader;
  };
  m.customProgramCacheKey = () => 'skin_sss';
  return m;
}

/** Head material: painted face map (lips, brows, sockets) over skin shading. */
export function faceMaterial(o: Tex.FaceTexOpts): THREE.MeshPhysicalMaterial {
  patchSubsurfaceLighting();
  const set = Tex.faceTexture(o);
  const m = new THREE.MeshPhysicalMaterial({
    map: set.map,
    normalMap: set.normalMap,
    roughnessMap: set.roughnessMap,
    roughness: 1,
    metalness: 0,
    clearcoat: 0.12,
    clearcoatRoughness: 0.55,
    sheen: 0.22,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(0.9, 0.62, 0.55).convertSRGBToLinear(),
    normalScale: new THREE.Vector2(0.5, 0.5),
  });
  m.defines = { ...(m.defines ?? {}), SSS_WRAP: '' };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.sssWrap = { value: 0.4 };
    shader.uniforms.sssColor = { value: new THREE.Vector3(1.0, 0.4, 0.29) };
    shader.fragmentShader = 'uniform float sssWrap;\nuniform vec3 sssColor;\n' + shader.fragmentShader;
  };
  m.customProgramCacheKey = () => 'face_sss';
  return m;
}

/** Android chassis: white polymer with a faint pearlescent clearcoat. */
export function chassisMaterial(color = 0xf2f6f8): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color).convertSRGBToLinear(),
    roughness: 0.32,
    metalness: 0.04,
    clearcoat: 0.7,
    clearcoatRoughness: 0.14,
    iridescence: 0.22,
    iridescenceIOR: 1.24,
    envMapIntensity: 1.1,
  });
}

export function clothMaterial(
  rgb: [number, number, number],
  opts: { rough?: number; weave?: number; size?: number; sheen?: number; repeat?: number } = {},
): THREE.MeshPhysicalMaterial {
  const set = Tex.fabric(opts.size ?? 256, rgb[0], rgb[1], rgb[2], opts.weave ?? 140);
  const rep = opts.repeat ?? 3;
  for (const t of [set.map, set.normalMap, set.roughnessMap]) t?.repeat.set(rep, rep);
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(rgb[0], rgb[1], rgb[2]).convertSRGBToLinear(),
    map: set.map,
    normalMap: set.normalMap,
    roughnessMap: set.roughnessMap,
    roughness: opts.rough ?? 0.86,
    metalness: 0,
    sheen: opts.sheen ?? 0.5,
    sheenRoughness: 0.9,
    sheenColor: new THREE.Color(0.6, 0.62, 0.7).convertSRGBToLinear(),
    normalScale: new THREE.Vector2(0.7, 0.7),
  });
}

/** Wet-look leather / vinyl — jackets, car seats, cop-shop chairs. */
export function leatherMaterial(color = 0x14181c): THREE.MeshPhysicalMaterial {
  const set = Tex.fabric(256, 0.06, 0.06, 0.07, 300);
  for (const t of [set.map, set.normalMap, set.roughnessMap]) t?.repeat.set(4, 4);
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color).convertSRGBToLinear(),
    normalMap: set.normalMap,
    roughnessMap: set.roughnessMap,
    roughness: 0.44,
    metalness: 0.02,
    clearcoat: 0.5,
    clearcoatRoughness: 0.3,
    normalScale: new THREE.Vector2(0.5, 0.5),
  });
}

export function emissiveMaterial(color: THREE.ColorRepresentation, intensity = 3): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.4,
    metalness: 0,
    toneMapped: true,
  });
}

/** Screen / sign panel driven by a generated texture. */
export function screenMaterial(tex: THREE.Texture, intensity = 2.2): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: intensity,
    roughness: 0.28,
    metalness: 0,
    transparent: false,
  });
  return m;
}

export function glassMaterial(tint = 0x0b1418, opacity = 0.24): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tint).convertSRGBToLinear(),
    roughness: 0.06,
    metalness: 0,
    transparent: true,
    opacity,
    transmission: 0.55,
    thickness: 0.35,
    ior: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

export function paintedMetal(color: THREE.ColorRepresentation, rough = 0.35): THREE.MeshPhysicalMaterial {
  const set = Tex.metal(512, 0.4);
  for (const t of [set.normalMap, set.roughnessMap]) t?.repeat.set(2, 2);
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color).convertSRGBToLinear(),
    normalMap: set.normalMap,
    roughness: rough,
    metalness: 0.55,
    clearcoat: 0.35,
    clearcoatRoughness: 0.25,
    normalScale: new THREE.Vector2(0.25, 0.25),
  });
}

export function fromTexSet(
  set: Tex.TexSet,
  opts: { repeat?: number; color?: THREE.ColorRepresentation; rough?: number; metal?: number; normalScale?: number } = {},
): THREE.MeshPhysicalMaterial {
  const rep = opts.repeat ?? 1;
  for (const t of [set.map, set.normalMap, set.roughnessMap]) {
    if (t) {
      t.repeat.set(rep, rep);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
    }
  }
  return new THREE.MeshPhysicalMaterial({
    color: opts.color !== undefined ? new THREE.Color(opts.color).convertSRGBToLinear() : 0xffffff,
    map: set.map,
    normalMap: set.normalMap,
    roughnessMap: set.roughnessMap,
    roughness: opts.rough ?? 1,
    metalness: opts.metal ?? 0,
    normalScale: new THREE.Vector2(opts.normalScale ?? 1, opts.normalScale ?? 1),
  });
}

/** Additive "hologram" material for scan overlays and projected UI. */
export function holoMaterial(color = 0x57d8ff, opacity = 0.5): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
