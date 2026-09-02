import * as THREE from 'three';
import { LAYER } from '../rendering/RenderSystem.js';

/**
 * Material upgrades for the glTF rifle and a shared "surface detail" shader hook used by every weapon
 * material (rifle master material + procedural attachments):
 *
 *   - fine-grain detail normal (procedural canvas noise, tiled ~40× over the rifle UVs) blended under the
 *     baked normal map, so anodised/parkerised surfaces break up the sun highlight instead of reading flat
 *   - macro roughness variation (tileable low-frequency noise in the detail texture's alpha) + grain
 *     micro-roughness, for smudged/handled metal
 *   - cheap edge wear: where the baked normal map tilts (bevels, engraved edges) the surface gets lighter,
 *     more metallic and smoother — bare aluminium showing through the finish
 *
 * The hook is installed with material.onBeforeCompile + customProgramCacheKey BEFORE the material is
 * registered for cascaded shadows (RenderSystem.registerMaterial chains any existing hook).
 */

let _detailTex = null;

/** Shared tileable detail texture: RGB = tangent-space grain normal, A = smooth macro noise. */
export function getDetailTexture(game) {
  if (_detailTex) return _detailTex;
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);

  let seed = 0x9e3779b9;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // grain: white noise, one wrap-around 3×3 blur (features ≈ 2–3 texels), mixed back with a little raw noise
  const raw = new Float32Array(size * size);
  for (let i = 0; i < raw.length; i++) raw[i] = rnd();
  const wrap = (v) => (v + size) % size;
  const blur = (src) => {
    const out = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += src[wrap(y + dy) * size + wrap(x + dx)];
        out[y * size + x] = s / 9;
      }
    }
    return out;
  };
  const soft = blur(raw);
  const h = new Float32Array(size * size);
  for (let i = 0; i < h.length; i++) h[i] = soft[i] * 0.75 + raw[i] * 0.25;

  // macro: tileable value noise (two octaves of a cosine-interpolated lattice)
  const lattice = (n) => {
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
  };
  const n1 = lattice(6);
  const n2 = lattice(13);

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
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = game?.assets?.anisotropy ?? 8;
  tex.premultiplyAlpha = false;
  tex.needsUpdate = true;
  _detailTex = tex;
  return tex;
}

const DETAIL_UNIFORMS_GLSL = /* glsl */ `
uniform sampler2D detailNormalMap;
uniform float detailRepeat;
uniform float detailNormalScale;
uniform float detailRoughness;
uniform float edgeWear;
uniform float macroRepeat;
`;

/** normal_fragment_maps with the detail normal blended in (UDN) and the baked-edge factor captured. */
function detailNormalChunk() {
  const src = THREE.ShaderChunk.normal_fragment_maps;
  const marker = 'mapN.xy *= normalScale;';
  if (!src.includes(marker)) {
    console.warn('[materials] normal_fragment_maps marker not found; detail shader disabled');
    return src;
  }
  return src.replace(
    marker,
    /* glsl */ `mapN.xy *= normalScale;
	float gdEdge = saturate( ( 1.0 - mapN.z ) * 4.0 );
	vec3 gdN = texture2D( detailNormalMap, vNormalMapUv * detailRepeat ).xyz * 2.0 - 1.0;
	mapN = normalize( vec3( mapN.xy + gdN.xy * detailNormalScale, mapN.z ) );`,
  );
}

const DETAIL_POST_GLSL = /* glsl */ `
#if defined( USE_NORMALMAP_TANGENTSPACE ) && !defined( USE_NORMALMAP_OBJECTSPACE )
{
	float gdMacro = texture2D( detailNormalMap, vNormalMapUv * macroRepeat ).a;
	float gdGrain = 1.0 - gdN.z;
	roughnessFactor = clamp(
		roughnessFactor * ( 1.0 + ( gdMacro - 0.5 ) * detailRoughness ) + gdGrain * 0.5 * detailRoughness - gdEdge * 0.3 * edgeWear,
		0.03, 1.0 );
	metalnessFactor = min( 1.0, metalnessFactor + gdEdge * 0.35 * edgeWear );
	diffuseColor.rgb *= 1.0 + gdEdge * edgeWear + ( gdMacro - 0.5 ) * 0.14 * detailRoughness;
}
#endif
`;

/**
 * Install the detail hook on a MeshStandard/Physical material that has a tangent-space normal map.
 * Uniforms are stored in material.userData.detail for runtime tuning.
 */
export function applyGunDetail(material, game, { detailRepeat = 40, detailNormalScale = 0.4, detailRoughness = 0.35, edgeWear = 0.5, macroRepeat = 5 } = {}) {
  const tex = getDetailTexture(game);
  const uniforms = {
    detailNormalMap: { value: tex },
    detailRepeat: { value: detailRepeat },
    detailNormalScale: { value: detailNormalScale },
    detailRoughness: { value: detailRoughness },
    edgeWear: { value: edgeWear },
    macroRepeat: { value: macroRepeat },
  };
  material.userData.detail = uniforms;
  const chunk = detailNormalChunk();
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    if (!shader.fragmentShader.includes('#include <normal_fragment_maps>')) return;
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${DETAIL_UNIFORMS_GLSL}\nvoid main() {`)
      .replace('#include <normal_fragment_maps>', `${chunk}\n${DETAIL_POST_GLSL}`);
  };
  material.customProgramCacheKey = () => 'gunDetail2';
  material.needsUpdate = true;
  return material;
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
 * Upgrade the glTF master material: anisotropy/filtering, tuned multipliers, and the detail shader.
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
    m.envMapIntensity = 1.1;
    // Multiplied by the packed roughness/metalness maps: slightly glossier than the flat baseline so the sun
    // highlight shapes the receiver; the detail hook adds ±variation and shinier worn edges on top.
    m.roughness = 0.8;
    // Anodised / parkerised finishes are dielectric coatings over the metal: a low metalness keeps a diffuse
    // term that the sky and ground-bounce can light, so shaded surfaces read charcoal instead of navy-black
    // (a metallic surface facing away from the sun only reflects the blue sky).
    m.metalness = 0.35;
    // Lift the very dark albedo: real "black" anodised/parkerised steel reads as mid grey under sunlight.
    // Near-neutral grey with a faint warm bias that cancels part of the blue sky-IBL cast in shadow.
    m.color.setRGB(2.7, 2.58, 2.4);
    if (m.normalScale) m.normalScale.set(1.0, 1.0);
    m.side = THREE.FrontSide;
    if (m.normalMap) {
      applyGunDetail(m, game, { detailRepeat: 40, detailNormalScale: 0.45, detailRoughness: 0.4, edgeWear: 0.55, macroRepeat: 5.3 });
    }
    m.needsUpdate = true;
  }
  return Array.from(mats);
}
