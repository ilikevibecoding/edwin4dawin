import * as THREE from 'three';
import { LAYER } from '../rendering/RenderSystem.js';

/**
 * Weapon surface shading — one shader hook shared by the glTF rifle master material and every procedural
 * attachment material (see attachments/lib.js):
 *
 *   paint / polymer split   (rifle only) the GLB's packed metalness texel separates painted metal (1) from polymer
 *                           (0); its base-colour map is a flat 57-grey, so the tones come from uniforms instead:
 *                           a light neutral Cerakote grey for the metal, charcoal for the furniture
 *   macro variation         low-frequency mottling of roughness + tone (handled, smudged finish)
 *   micro-normal grain      fine tangent-space grain under the baked normal map
 *   micro-scratches         hairline scratches (glossier, lighter), denser near edges
 *   edge wear               bare aluminium showing through the finish along convex hard edges. The rifle reads it
 *                           from a baked UV-atlas map (attachments/surfaceBake.js — edge proximity in metres, so the
 *                           chips are ~1 mm wide whatever the polygon size); attachments from their bevel vertex tint
 *   cavity / grime          darker, duller finish in concave corners (baked, rifle) and low AO areas
 *   ambient occlusion       baked hemisphere AO — UV atlas (rifle) or a per-vertex attribute `aGunAO`
 *                           (attachments) — applied to indirect light fully and to direct light partially (the CSM
 *                           cannot resolve contact shadows at rifle scale)
 *
 * The hook is installed with material.onBeforeCompile + customProgramCacheKey BEFORE the material is registered
 * for cascaded shadows (RenderSystem.registerMaterial chains any existing hook).
 */

let _detailTex = null;
let _surfaceTex = null;
let _neutralBake = null;

/** Shared tileable detail texture: RGB = tangent-space grain normal, A = smooth macro noise. */
export function getDetailTexture(game) {
  if (_detailTex) return _detailTex;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);

  const rnd = lcg(0x9e3779b9);
  // grain: white noise, one wrap-around 3×3 blur (features ≈ 2–3 texels), mixed back with a little raw noise
  const raw = new Float32Array(size * size);
  for (let i = 0; i < raw.length; i++) raw[i] = rnd();
  const soft = blur3(raw, size);
  const h = new Float32Array(size * size);
  for (let i = 0; i < h.length; i++) h[i] = soft[i] * 0.75 + raw[i] * 0.25;
  const n1 = lattice(6, rnd);
  const n2 = lattice(13, rnd);
  const wrap = (v) => (v + size) % size;
  const strength = 3.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h[y * size + wrap(x + 1)] - h[y * size + wrap(x - 1)]) * strength;
      const dy = (h[wrap(y + 1) * size + x] - h[wrap(y - 1) * size + x]) * strength;
      const len = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      img.data[o] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      img.data[o + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      img.data[o + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      const u = x / size;
      const v = y / size;
      const macro = n1(u, v) * 0.65 + n2(u, v) * 0.35;
      img.data[o + 3] = Math.round(THREE.MathUtils.clamp(macro, 0, 1) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  _detailTex = canvasTex(c, game);
  return _detailTex;
}

/**
 * Shared tileable surface-story texture: R = hairline scratches, G = chip noise (fine cellular noise that breaks
 * the edge-wear boundary), B = mid-frequency mottle (smudges / uneven finish).
 */
export function getSurfaceTexture(game) {
  if (_surfaceTex) return _surfaceTex;
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const rnd = lcg(0x1234567);

  // R: scratches — thin straight strokes, drawn 3× with wrap offsets so the tile is seamless
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.lineCap = 'round';
  const stroke = (x, y, len, ang, w, a) => {
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = w;
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        ctx.beginPath();
        ctx.moveTo(x + ox, y + oy);
        ctx.lineTo(x + ox + Math.cos(ang) * len, y + oy + Math.sin(ang) * len);
        ctx.stroke();
      }
    }
  };
  for (let i = 0; i < 520; i++) {
    const len = 6 + Math.pow(rnd(), 2.2) * 140;
    stroke(rnd() * size, rnd() * size, len, rnd() * Math.PI, 0.8 + rnd() * 0.9, 0.25 + rnd() * 0.75);
  }
  for (let i = 0; i < 40; i++) stroke(rnd() * size, rnd() * size, 8 + rnd() * 30, rnd() * Math.PI, 2.5 + rnd() * 3, 0.12 + rnd() * 0.2); // scuffs
  const scr = ctx.getImageData(0, 0, size, size);

  const img = ctx.createImageData(size, size);
  const chipA = lattice(64, rnd);
  const chipB = lattice(150, rnd);
  const mottA = lattice(9, rnd);
  const mottB = lattice(21, rnd);
  const mottC = lattice(47, rnd);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const o = (y * size + x) * 4;
      img.data[o] = scr.data[o];
      const chip = chipA(u, v) * 0.6 + chipB(u, v) * 0.25 + rnd() * 0.15;
      img.data[o + 1] = Math.round(THREE.MathUtils.clamp(chip, 0, 1) * 255);
      const mott = mottA(u, v) * 0.5 + mottB(u, v) * 0.32 + mottC(u, v) * 0.18;
      img.data[o + 2] = Math.round(THREE.MathUtils.clamp(mott, 0, 1) * 255);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  _surfaceTex = canvasTex(c, game);
  return _surfaceTex;
}

/** 1×1 "no bake" texture: AO 1, no edge wear, no cavity. */
export function getNeutralBakeTexture() {
  if (_neutralBake) return _neutralBake;
  const t = new THREE.DataTexture(new Uint8Array([255, 0, 0, 255]), 1, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  _neutralBake = t;
  return t;
}

function canvasTex(c, game) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = game?.assets?.anisotropy ?? 8;
  tex.premultiplyAlpha = false;
  tex.needsUpdate = true;
  return tex;
}

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function blur3(src, size) {
  const wrap = (v) => (v + size) % size;
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += src[wrap(y + dy) * size + wrap(x + dx)];
      out[y * size + x] = s / 9;
    }
  }
  return out;
}

/** Tileable cosine-interpolated value noise on an n×n lattice, sampled at (u, v) ∈ [0, 1). */
function lattice(n, rnd) {
  const g = new Float32Array(n * n);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  return (u, v) => {
    const fx = u * n;
    const fy = v * n;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const sx = 0.5 - 0.5 * Math.cos(tx * Math.PI);
    const sy = 0.5 - 0.5 * Math.cos(ty * Math.PI);
    const at = (i, j) => g[((j + n) % n) * n + ((i + n) % n)];
    const a = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
    const b = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
    return a * (1 - sy) + b * sy;
  };
}

/* ------------------------------------------------------------------------------------------ shader */

const VERT_PARS = /* glsl */ `
varying vec2 vGunUv;
varying float vGunAO;
#ifdef GUN_AO_ATTR
attribute float aGunAO;
#endif
#ifdef GUN_OBJUV
varying vec3 vGunPos;
varying vec3 vGunNrm;
#endif
`;

const VERT_MAIN = /* glsl */ `
vGunUv = uv;
#ifdef GUN_AO_ATTR
vGunAO = aGunAO > 0.001 ? aGunAO : 1.0;
#else
vGunAO = 1.0;
#endif
#ifdef GUN_OBJUV
vGunPos = position.xyz;
vGunNrm = normal;
#endif
`;

const FRAG_PARS = /* glsl */ `
uniform sampler2D gunDetailMap;
uniform sampler2D gunSurfaceMap;
uniform sampler2D gunBakeMap;
uniform float gunGrainRepeat;
uniform float gunGrainScale;
uniform float gunMacroRepeat;
uniform float gunSurfRepeat;
uniform float gunRoughVar;
uniform float gunToneVar;
uniform float gunEdgeWear;
uniform float gunCavity;
uniform float gunAODirect;
uniform float gunScratch;
uniform vec3 gunWearColor;
uniform float gunWearRough;
uniform float gunWearMetal;
uniform vec3 gunPaintColor;
uniform vec3 gunPolymerColor;
uniform float gunPaintRough;
uniform float gunPolymerRough;
uniform float gunPaintMetal;
uniform float gunMapRef;
uniform float gunFill;
uniform vec3 gunFillColor;
uniform float gunNeutral;
uniform float gunObjUvScale;
varying vec2 vGunUv;
varying float vGunAO;
#ifdef GUN_OBJUV
varying vec3 vGunPos;
varying vec3 vGunNrm;
#endif
`;

/**
 * Replaces normal_fragment_maps: baked normal map + fine grain, then the surface story.
 *
 * Attachments (GUN_OBJUV) sample the detail textures with object-space coordinates (dominant-axis planar
 * projection): their procedural UVs are per-face 0–1 (rounded boxes) or 8 mm tiles (extrusions), so a
 * geometry-UV sample would put the mottle / chip noise at sub-millimetre scale and mip-average to a constant.
 * With `gunObjUvScale` = 8, one texture unit is 125 mm on every part — the same physical scale as the rifle.
 */
const FRAG_SURFACE = /* glsl */ `
#ifdef GUN_OBJUV
	vec3 gdAN = abs( vGunNrm );
	vec3 gdP = vGunPos * gunObjUvScale;
	vec2 gdUv = ( gdAN.x >= gdAN.y && gdAN.x >= gdAN.z ) ? gdP.zy : ( ( gdAN.y >= gdAN.z ) ? gdP.xz : gdP.xy );
#else
	vec2 gdUv = vGunUv;
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) && !defined( USE_NORMALMAP_OBJECTSPACE )
	#ifdef GUN_OBJUV
		vec3 mapN = vec3( 0.0, 0.0, 1.0 );
	#else
		vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
		mapN.xy *= normalScale;
	#endif
	vec3 gdGrain = texture2D( gunDetailMap, gdUv * gunGrainRepeat ).xyz * 2.0 - 1.0;
	mapN.xy += gdGrain.xy * gunGrainScale;
	normal = normalize( tbn * normalize( mapN ) );
#else
	#include <normal_fragment_maps>
#endif
float gunAmbientOcclusion = 1.0;
{
	vec4 gdBake = texture2D( gunBakeMap, vGunUv );
	float gdMacro = texture2D( gunDetailMap, gdUv * gunMacroRepeat ).a;
	vec3 gdSurf = texture2D( gunSurfaceMap, gdUv * gunSurfRepeat ).xyz;
	float gdChip = texture2D( gunSurfaceMap, gdUv * gunSurfRepeat * 2.63 + vec2( 0.37, 0.11 ) ).g;
	gunAmbientOcclusion = min( gdBake.r, vGunAO );

	float gdWear = 0.0;
	vec3 gdWearColor = gunWearColor;
	float gdWearRough = gunWearRough;
	float gdWearMetal = gunWearMetal;
	#ifdef GUN_PAINT
		// rifle master material: metalnessFactor is the packed texel (1 = painted metal, 0 = polymer furniture)
		float gdPoly = 1.0 - metalnessFactor;
		float gdMapK = clamp( dot( diffuseColor.rgb, vec3( 0.3333 ) ) / gunMapRef, 0.6, 2.2 );
		diffuseColor.rgb = mix( gunPaintColor, gunPolymerColor, gdPoly ) * mix( 1.0, gdMapK, 0.5 );
		roughnessFactor = mix( gunPaintRough, gunPolymerRough, gdPoly );
		metalnessFactor = gunPaintMetal * ( 1.0 - gdPoly );
		gdWear = gdBake.g * gunEdgeWear * ( 1.0 - gdPoly * 0.75 );
		// polished polymer goes lighter and glossier, never metallic
		gdWearColor = mix( gunWearColor, gunPolymerColor * 2.6, gdPoly );
		gdWearRough = mix( gunWearRough, 0.55, gdPoly );
		gdWearMetal = gunWearMetal * ( 1.0 - gdPoly );
	#else
		#if defined( USE_COLOR )
			// attachments: the colour attribute carries 1 + wearAmount × edgeFactor (aoBake / lib.bakeEdgeWear);
			// undo the tint and turn it into real bare-metal wear
			diffuseColor.rgb /= max( vColor.rgb, vec3( 1e-3 ) );
			gdWear = clamp( ( vColor.r - 1.0 ) * 1.35, 0.0, 1.0 ) * gunEdgeWear;
		#endif
		gdWear = max( gdWear, gdBake.g * gunEdgeWear );
	#endif

	// macro mottling: uneven roughness and tone of a handled finish
	float gdMott = gdMacro * 0.55 + gdSurf.b * 0.45;
	roughnessFactor *= 1.0 + ( gdMott - 0.5 ) * gunRoughVar;
	diffuseColor.rgb *= 1.0 + ( gdMott - 0.5 ) * gunToneVar;

	// hairline scratches: polished through the finish, denser near edges and in the mottle's bright (handled) zones
	float gdScr = gdSurf.r * gunScratch * ( 0.25 + 0.75 * smoothstep( 0.2, 0.9, gdBake.g * 0.8 + gdMott * 0.6 ) );
	roughnessFactor -= gdScr * 0.3;
	diffuseColor.rgb = mix( diffuseColor.rgb, gdWearColor, gdScr * 0.25 );

	// edge wear: chips, not an outline — only some stretches of edge are worn (two octaves of low-frequency
	// mask, features 3–7 cm) and the proximity band is thresholded against fine chip noise so the boundary is
	// ragged
	float gdMacroLow = texture2D( gunDetailMap, gdUv * gunMacroRepeat * 0.37 + vec2( 0.53, 0.29 ) ).a;
	float gdWearMask = smoothstep( 0.3, 0.7, gdMacroLow * 0.55 + gdMacro * 0.3 + gdSurf.b * 0.15 + 0.06 );
	float gdChipped = smoothstep( 0.35, 0.55, gdWear * gdWearMask * ( 0.3 + 0.7 * gdChip ) );
	diffuseColor.rgb = mix( diffuseColor.rgb, gdWearColor, gdChipped );
	roughnessFactor = mix( roughnessFactor, gdWearRough, gdChipped );
	metalnessFactor = mix( metalnessFactor, gdWearMetal, gdChipped );

	// cavity grime: darker + duller in concave corners and in deeply occluded areas
	float gdCav = clamp( gdBake.b * gunCavity + ( 1.0 - gunAmbientOcclusion ) * 0.35 * gunCavity, 0.0, 1.0 );
	diffuseColor.rgb *= 1.0 - gdCav * 0.5;
	roughnessFactor = mix( roughnessFactor, 0.92, gdCav * 0.45 );

	roughnessFactor = clamp( roughnessFactor, 0.04, 1.0 );
	metalnessFactor = clamp( metalnessFactor, 0.0, 1.0 );
}
`;

/**
 * Appended to aomap_fragment: baked occlusion on indirect light (fully) and direct light (partially), a partial
 * desaturation of the scene ambient, plus the view-model fill. The scene's only ambient is a saturated blue sky
 * IBL + a sky-blue hemisphere light: a first-person weapon lit by that alone drops to ~sRGB 40 and goes blue in
 * shade (reference: ~95, neutral). The fill is a neutral hemispherical irradiance (full from above, 45 % from
 * below) scaled by the baked occlusion, i.e. the classic dedicated view-model fill light, done per material
 * because the lighting rig is not ours to change.
 */
const FRAG_AO = /* glsl */ `
#include <aomap_fragment>
{
	float gdOcc = gunAmbientOcclusion;
	reflectedLight.indirectDiffuse *= gdOcc;
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float gdDotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( gdDotNV, gdOcc, material.roughness );
	#endif
	float gdDirect = mix( 1.0, gdOcc, gunAODirect );
	reflectedLight.directDiffuse *= gdDirect;
	reflectedLight.directSpecular *= gdDirect;
	// the scene ambient (sky hemisphere light + blue IBL) tints shaded metal blue; pull it toward grey
	float gdIndLum = dot( reflectedLight.indirectDiffuse, vec3( 0.2126, 0.7152, 0.0722 ) );
	reflectedLight.indirectDiffuse = mix( reflectedLight.indirectDiffuse, vec3( gdIndLum ), gunNeutral );
	vec3 gdUp = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
	float gdHemi = mix( 0.45, 1.0, 0.5 + 0.5 * dot( geometryNormal, gdUp ) );
	reflectedLight.indirectDiffuse += gunFill * gdHemi * gunFillColor * BRDF_Lambert( material.diffuseColor ) * gdOcc;
}
`;

/**
 * Install the surface hook on a MeshStandard/Physical material (with a tangent-space normal map the grain is
 * added to it; without one only the surface story / occlusion / fill apply, e.g. the label decals).
 * Uniforms are stored in material.userData.gun for runtime tuning / the bake to fill in.
 */
export function applyGunDetail(
  material,
  game,
  {
    paint = false,
    grainRepeat = 40,
    grainScale = 0.15,
    macroRepeat = 5,
    surfRepeat = 6,
    roughVar = 0.45,
    toneVar = 0.12,
    edgeWear = 0.7,
    cavity = 0.8,
    aoDirect = 0.55,
    scratch = 0.6,
    wearColor = [0.36, 0.36, 0.37],
    wearRough = 0.36,
    wearMetal = 0.75,
    paintColor = [0.112, 0.112, 0.115],
    polymerColor = [0.028, 0.028, 0.029],
    paintRough = 0.55,
    polymerRough = 0.78,
    paintMetal = 0.18,
    mapRef = 0.041,
    fill = 3.6,
    fillColor = [1.0, 0.945, 0.855],
    neutral = 0.55,
    objectUv = false,
    objectUvScale = 8,
  } = {},
) {
  const uniforms = {
    gunDetailMap: { value: getDetailTexture(game) },
    gunSurfaceMap: { value: getSurfaceTexture(game) },
    gunBakeMap: { value: getNeutralBakeTexture() },
    gunGrainRepeat: { value: grainRepeat },
    gunGrainScale: { value: grainScale },
    gunMacroRepeat: { value: macroRepeat },
    gunSurfRepeat: { value: surfRepeat },
    gunRoughVar: { value: roughVar },
    gunToneVar: { value: toneVar },
    gunEdgeWear: { value: edgeWear },
    gunCavity: { value: cavity },
    gunAODirect: { value: aoDirect },
    gunScratch: { value: scratch },
    gunWearColor: { value: new THREE.Vector3(...wearColor) },
    gunWearRough: { value: wearRough },
    gunWearMetal: { value: wearMetal },
    gunPaintColor: { value: new THREE.Vector3(...paintColor) },
    gunPolymerColor: { value: new THREE.Vector3(...polymerColor) },
    gunPaintRough: { value: paintRough },
    gunPolymerRough: { value: polymerRough },
    gunPaintMetal: { value: paintMetal },
    gunMapRef: { value: mapRef },
    gunFill: { value: fill },
    gunFillColor: { value: new THREE.Vector3(...fillColor) },
    gunNeutral: { value: neutral },
    gunObjUvScale: { value: objectUvScale },
  };
  material.userData.gun = uniforms;
  material.defines = material.defines || {};
  if (paint) material.defines.GUN_PAINT = '';
  if (objectUv) material.defines.GUN_OBJUV = '';
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    if (!shader.fragmentShader.includes('#include <normal_fragment_maps>') || !shader.fragmentShader.includes('#include <aomap_fragment>')) return;
    shader.vertexShader = shader.vertexShader.replace('void main() {', `${VERT_PARS}\nvoid main() {`).replace('#include <uv_vertex>', `#include <uv_vertex>\n${VERT_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${FRAG_PARS}\nvoid main() {`)
      .replace('#include <normal_fragment_maps>', FRAG_SURFACE)
      .replace('#include <aomap_fragment>', FRAG_AO);
  };
  material.customProgramCacheKey = () => `gunSurface6|${paint ? 'p' : 'a'}|${objectUv ? 'o' : 'u'}|${material.defines.GUN_AO_ATTR !== undefined ? 'ao' : ''}`;
  material.needsUpdate = true;
  return material;
}

/** Tell a hooked material that its geometries carry the per-vertex `aGunAO` attribute. */
export function enableVertexAO(material) {
  if (!material.userData.gun) return;
  material.defines.GUN_AO_ATTR = '';
  material.needsUpdate = true;
}

/** Hand a baked UV-atlas map (see attachments/surfaceBake.js) to a hooked material. */
export function setBakeMap(material, texture) {
  if (!material.userData.gun) return;
  material.userData.gun.gunBakeMap.value = texture;
}

/**
 * The view model is drawn by `weaponCamera`, whose layer mask is LAYER.VIEWMODEL only. three.js applies a
 * light to a render pass only when `light.layers` intersects the camera's layers, so the sun cascades and
 * the hemisphere fill (layer 0) never reached the rifle: it was lit by the IBL alone — flat, dark and
 * sky-blue whatever the material multipliers. Enable the scene lights on the view-model layer (FxLights
 * already do this for the flash lights). Idempotent; the proper home for this is RenderSystem (_buildSun).
 */
export function ensureViewModelLighting(game) {
  const layer = LAYER.VIEWMODEL;
  let n = 0;
  game.scene?.traverse((o) => {
    if (o.isLight && !o.layers.isEnabled(layer)) {
      o.layers.enable(layer);
      n++;
    }
  });
  if (n) console.info(`[materials] enabled the view-model layer on ${n} scene light(s)`);
}

/**
 * Upgrade the glTF master material: anisotropy/filtering, the paint/polymer treatment and the surface hook.
 * Runs before WeaponSystem registers the material for CSM (which chains the hook installed here).
 */
export function upgradeGunMaterials(game, rig) {
  ensureViewModelLighting(game);
  const aniso = game.assets.anisotropy;
  const mats = new Set();
  rig.gltfScene.traverse((o) => {
    if (!o.isMesh) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) mats.add(m);
  });
  for (const m of mats) {
    for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) {
      const t = m[key];
      if (t) {
        t.anisotropy = aniso;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.needsUpdate = true;
      }
    }
    // The sky IBL is a saturated blue: keep its contribution modest so shaded metal stays neutral grey (the
    // neutral view-model fill in the hook supplies the missing ambient).
    m.envMapIntensity = 0.28;
    // Unit multipliers: the hook reads the packed texels as masks (metalness B = painted metal vs polymer).
    m.roughness = 1.0;
    m.metalness = 1.0;
    m.color.setRGB(1, 1, 1);
    if (m.normalScale) m.normalScale.set(1.0, 1.0);
    m.side = THREE.FrontSide;
    if (m.normalMap) {
      applyGunDetail(m, game, {
        paint: true,
        grainRepeat: 46,
        grainScale: 0.14,
        macroRepeat: 5.3,
        surfRepeat: 6.5,
        roughVar: 0.5,
        toneVar: 0.14,
        edgeWear: 0.65,
        cavity: 0.85,
        aoDirect: 0.55,
        scratch: 0.22,
        paintColor: [0.1, 0.1, 0.103],
        paintRough: 0.55,
        paintMetal: 0.15,
        fill: 3.4,
      });
    }
    m.needsUpdate = true;
  }
  return Array.from(mats);
}
