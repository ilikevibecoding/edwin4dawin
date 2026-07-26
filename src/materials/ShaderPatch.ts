import * as THREE from 'three';

/**
 * Injects three optional features into a MeshStandard/PhysicalMaterial without
 * forking three's shader library:
 *
 *  - **Parallax occlusion mapping.** Raymarches the height map in tangent space
 *    with a binary-search refinement, then offsets every map lookup. Silhouette
 *    clipping is deliberately off: it destroys flat quads, and the level is full
 *    of them. Because only the shading uv moves, depth and shadow passes (which
 *    use their own materials) stay exactly consistent with the geometry.
 *  - **Detail normals.** A shared high-frequency normal blended in tangent
 *    space at a much denser tiling rate, so surfaces keep detail at 30 cm.
 *  - **UV tiling.** Scales the map uvs in the vertex shader, which lets one
 *    baked texture set serve many world sizes without cloning textures.
 */

export interface PatchOptions {
  tile?: THREE.Vector2;
  heightMap?: THREE.Texture;
  parallaxSteps?: number;
  parallaxScale?: number;
  detailMap?: THREE.Texture;
  detailScale?: number;
  detailStrength?: number;
  /** Shared time uniform; enables the two-layer scrolling wave normal. */
  wave?: { value: number };
}

const UV_SCALE_CHUNK = /* glsl */ `
#ifdef MAT_TILE
  #ifdef USE_MAP
    vMapUv *= uMatTile;
  #endif
  #ifdef USE_NORMALMAP
    vNormalMapUv *= uMatTile;
  #endif
  #ifdef USE_ROUGHNESSMAP
    vRoughnessMapUv *= uMatTile;
  #endif
  #ifdef USE_METALNESSMAP
    vMetalnessMapUv *= uMatTile;
  #endif
  #ifdef USE_AOMAP
    vAoMapUv *= uMatTile;
  #endif
  #ifdef USE_EMISSIVEMAP
    vEmissiveMapUv *= uMatTile;
  #endif
  #ifdef USE_ALPHAMAP
    vAlphaMapUv *= uMatTile;
  #endif
  vMatUv = uv * uMatTile;
#else
  vMatUv = uv;
#endif
`;

const POM_CHUNK = /* glsl */ `
#ifdef MAT_POM
/**
 * Steep parallax: march the ray through height layers until it passes below the
 * surface, then bisect. 'uMatPomScale' is the height amplitude expressed in uv
 * units, so the offset is physically proportional to the relief.
 */
vec2 matParallax(vec2 baseUv, vec3 viewTS) {
  float steps = float(MAT_POM_STEPS);
  vec2 dUv = (-viewTS.xy / max(abs(viewTS.z), 0.2)) * uMatPomScale / steps;
  float dDepth = 1.0 / steps;

  vec2 cur = vec2(0.0);
  float rayDepth = 0.0;
  float surfDepth = 1.0 - texture2D(uMatHeight, baseUv).r;
  for (int i = 0; i < MAT_POM_STEPS; i++) {
    if (rayDepth >= surfDepth) break;
    cur += dUv;
    rayDepth += dDepth;
    surfDepth = 1.0 - texture2D(uMatHeight, baseUv + cur).r;
  }

  // Bisect the last interval; five halvings removes the layer stepping.
  vec2 lo = cur - dUv;
  float loDepth = rayDepth - dDepth;
  for (int j = 0; j < 5; j++) {
    vec2 mid = (lo + cur) * 0.5;
    float midDepth = (loDepth + rayDepth) * 0.5;
    float ms = 1.0 - texture2D(uMatHeight, baseUv + mid).r;
    if (midDepth >= ms) {
      cur = mid;
      rayDepth = midDepth;
    } else {
      lo = mid;
      loDepth = midDepth;
    }
  }
  return cur;
}
#endif
`;

const FRAG_PARS = /* glsl */ `
varying vec2 vMatUv;
#ifdef MAT_TILE
  uniform vec2 uMatTile;
#endif
#ifdef MAT_POM
  uniform sampler2D uMatHeight;
  uniform float uMatPomScale;
#endif
#ifdef MAT_DETAIL
  uniform sampler2D uMatDetail;
  uniform float uMatDetailScale;
  uniform float uMatDetailStrength;
#endif
#ifdef MAT_WAVE
  uniform float uMatTime;
#endif
vec2 gMatPom = vec2(0.0);
`;

/** Recomputes the tangent frame from derivatives; needs no tangent attribute. */
const FRAG_MAIN_HEAD = /* glsl */ `
#ifdef MAT_POM
{
  vec3 posV = -vViewPosition;
  vec3 dpdx = dFdx(posV);
  vec3 dpdy = dFdy(posV);
  vec3 gN = normalize(cross(dpdx, dpdy));
  vec3 viewDir = normalize(vViewPosition);
  if (dot(gN, viewDir) < 0.0) gN = -gN;
  vec2 dux = dFdx(vMatUv);
  vec2 duy = dFdy(vMatUv);
  float det = dux.x * duy.y - duy.x * dux.y;
  if (abs(det) > 1e-12) {
    vec3 T = normalize((duy.y * dpdx - dux.y * dpdy) / det);
    vec3 B = normalize((-duy.x * dpdx + dux.x * dpdy) / det);
    vec3 viewTS = vec3(dot(viewDir, T), dot(viewDir, B), dot(viewDir, gN));
    // Fade out at grazing angles and with distance: the offsets turn to noise
    // once a texel is smaller than a pixel.
    float grazing = smoothstep(0.05, 0.35, abs(viewTS.z));
    float dist = 1.0 - smoothstep(14.0, 30.0, length(posV));
    float fade = grazing * dist;
    if (fade > 0.01) gMatPom = matParallax(vMatUv, viewTS) * fade;
  }
}
#endif
`;

/**
 * three builds its tangent frame from the derivatives of the normal-map uv,
 * which the parallax offset has already perturbed. Rebuild it from the
 * unoffset uv so the frame stays smooth at grazing angles.
 */
const FRAG_TBN_FIX = /* glsl */ `
#if defined( MAT_POM ) && defined( USE_NORMALMAP_TANGENTSPACE ) && ! defined( USE_TANGENT )
  tbn = getTangentFrame( - vViewPosition, normal, vMatUv );
  #ifdef DOUBLE_SIDED
    tbn[0] *= faceDirection;
    tbn[1] *= faceDirection;
  #endif
#endif
`;

const FRAG_DETAIL = /* glsl */ `
#if defined( MAT_DETAIL ) && defined( USE_NORMALMAP_TANGENTSPACE )
{
  vec3 baseN = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
  baseN.xy *= normalScale;
  vec3 detN = texture2D(uMatDetail, vMatUv * uMatDetailScale).xyz * 2.0 - 1.0;
  // Whiteout blend: sum the slopes rather than overwriting them.
  vec3 blend = normalize(vec3(baseN.xy + detN.xy * uMatDetailStrength, baseN.z * detN.z));
  normal = normalize(tbn * blend);
}
#endif
#if defined( MAT_WAVE ) && defined( USE_NORMALMAP_TANGENTSPACE )
{
  vec2 a = vNormalMapUv * 1.0 + vec2(0.031, 0.017) * uMatTime;
  vec2 b = vNormalMapUv * 2.7 + vec2(-0.023, 0.041) * uMatTime;
  vec3 n1 = texture2D(normalMap, a).xyz * 2.0 - 1.0;
  vec3 n2 = texture2D(normalMap, b).xyz * 2.0 - 1.0;
  vec3 blend = normalize(vec3(n1.xy * normalScale + n2.xy * normalScale * 0.65, n1.z * n2.z));
  normal = normalize(tbn * blend);
}
#endif
`;

/**
 * Redirects every map lookup through the parallax offset. Self-referential
 * macros are expanded exactly once by the preprocessor, so this rewrites uses
 * without touching the varying declarations above it.
 */
const UV_OFFSET_DEFINES = /* glsl */ `
#ifdef MAT_POM
  #define vMapUv (vMapUv + gMatPom)
  #define vNormalMapUv (vNormalMapUv + gMatPom)
  #define vRoughnessMapUv (vRoughnessMapUv + gMatPom)
  #define vMetalnessMapUv (vMetalnessMapUv + gMatPom)
  #define vAoMapUv (vAoMapUv + gMatPom)
  #define vEmissiveMapUv (vEmissiveMapUv + gMatPom)
  #define vAlphaMapUv (vAlphaMapUv + gMatPom)
#endif
`;

export function patchSurfaceShader(mat: THREE.MeshStandardMaterial, opts: PatchOptions): void {
  const defines = { ...(mat.defines ?? {}) } as Record<string, string | number | boolean>;
  delete defines.MAT_TILE;
  delete defines.MAT_POM;
  delete defines.MAT_POM_STEPS;
  delete defines.MAT_DETAIL;
  delete defines.MAT_WAVE;

  const usePom = !!opts.heightMap && (opts.parallaxSteps ?? 0) > 0;
  const useDetail = !!opts.detailMap;
  const useWave = !!opts.wave;
  const useTile = !!opts.tile;

  if (useTile) defines.MAT_TILE = '';
  if (usePom) {
    defines.MAT_POM = '';
    defines.MAT_POM_STEPS = Math.max(4, Math.min(64, opts.parallaxSteps ?? 12));
  }
  if (useDetail) defines.MAT_DETAIL = '';
  if (useWave) defines.MAT_WAVE = '';
  mat.defines = defines;

  mat.onBeforeCompile = (shader) => {
    if (useTile) shader.uniforms.uMatTile = { value: opts.tile };
    if (usePom) {
      shader.uniforms.uMatHeight = { value: opts.heightMap };
      shader.uniforms.uMatPomScale = { value: opts.parallaxScale ?? 0.02 };
    }
    if (useDetail) {
      shader.uniforms.uMatDetail = { value: opts.detailMap };
      shader.uniforms.uMatDetailScale = { value: opts.detailScale ?? 8 };
      shader.uniforms.uMatDetailStrength = { value: opts.detailStrength ?? 0.3 };
    }
    if (useWave) shader.uniforms.uMatTime = opts.wave as THREE.IUniform;

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec2 vMatUv;\n#ifdef MAT_TILE\nuniform vec2 uMatTile;\n#endif`)
      .replace('#include <uv_vertex>', `#include <uv_vertex>\n${UV_SCALE_CHUNK}`);

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_PARS}\n${POM_CHUNK}`)
      .replace('void main() {', `${UV_OFFSET_DEFINES}\nvoid main() {\n${FRAG_MAIN_HEAD}`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>\n${FRAG_TBN_FIX}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${FRAG_DETAIL}`);
  };

  // Keys the program cache so variants never share a compiled shader.
  const key = `mat:${useTile ? 't' : ''}${usePom ? `p${defines.MAT_POM_STEPS}` : ''}${
    useDetail ? 'd' : ''
  }${useWave ? 'w' : ''}`;
  mat.customProgramCacheKey = () => key;
  mat.needsUpdate = true;
}
