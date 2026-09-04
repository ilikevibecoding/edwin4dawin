import * as THREE from 'three';
import { GLSL_NOISE } from '../render/shaders/common.glsl';

/** Procedural facade material shared by all instanced buildings.
 *  Per-instance attributes:
 *    aDims  (w, h, d) metres
 *    aStyle (style, floorHeight, seed, roofPalette)
 *    instanceColor = wall tint
 *  Styles: 0 curtain-wall glass, 1 punched windows, 2 balcony bands, 3 art-deco pastel,
 *          4 industrial metal, 5 house stucco, 6 parking/plain concrete, 7 hotel slab
 */
export function createFacadeMaterial(nightUniform: THREE.IUniform<number>): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0.0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = nightUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec3 aDims;
attribute vec4 aStyle;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vDims;
varying vec4 vStyle;
varying vec3 vWorldPosF;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vLocal = position;
vLocalN = normal;
vDims = aDims;
vStyle = aStyle;
vWorldPosF = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uNight;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vDims;
varying vec4 vStyle;
varying vec3 vWorldPosF;
${GLSL_NOISE}
vec3 roofPalette(float k) {
  if (k < 0.5) return vec3(0.62, 0.34, 0.22);      // terracotta
  if (k < 1.5) return vec3(0.34, 0.34, 0.35);      // grey shingle
  if (k < 2.5) return vec3(0.86, 0.86, 0.84);      // white membrane
  if (k < 3.5) return vec3(0.42, 0.31, 0.24);      // brown
  if (k < 4.5) return vec3(0.22, 0.42, 0.40);      // teal metal
  return vec3(0.55, 0.55, 0.56);                   // gravel
}
`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
{
  float style = vStyle.x;
  float floorH = max(vStyle.y, 2.6);
  float seed = vStyle.z;
  vec3 wall = diffuseColor.rgb; // instance colour
  vec3 meters = vec3((vLocal.x + 0.5) * vDims.x, vLocal.y * vDims.y, (vLocal.z + 0.5) * vDims.z);
  bool isTop = vLocalN.y > 0.6;
  bool isRoofSlope = vLocalN.y > 0.25 && vLocalN.y <= 0.6;
  float sideX = abs(vLocalN.x);
  float u = sideX > 0.5 ? meters.z : meters.x;
  float v = meters.y;
  float facadeSeed = seed + floor(sideX + 0.5) * 3.7 + step(0.0, vLocalN.x + vLocalN.z) * 11.1;
  vec3 col = wall;
  float rough = 0.75;
  float metal = 0.0;
  vec3 emis = vec3(0.0);
  float grime = fbm3(vWorldPosF.xz * 0.11 + vWorldPosF.y * 0.07);
  if (isTop) {
    // roofs
    if (style < 4.5 && style != 5.0) {
      vec3 base = mix(vec3(0.42, 0.42, 0.43), vec3(0.72, 0.72, 0.70), step(0.5, hash11(seed * 3.1)));
      col = base * (0.85 + 0.3 * vnoise(vWorldPosF.xz * 0.6));
      // parapet edge and mechanical pad
      float edgeD = min(min(meters.x, vDims.x - meters.x), min(meters.z, vDims.z - meters.z));
      col = mix(col * 0.7, col, smoothstep(0.6, 1.4, edgeD));
      col = mix(col, col * 0.55, step(0.62, hash12(floor(vWorldPosF.xz / 6.0) + seed)) * 0.3);
      rough = 0.9;
    } else if (style == 5.0) {
      col = roofPalette(vStyle.w) * (0.9 + 0.2 * vnoise(vWorldPosF.xz * 1.5));
      rough = 0.85;
    } else {
      col = vec3(0.52, 0.53, 0.54) * (0.9 + 0.2 * vnoise(vWorldPosF.xz * 0.4));
      // skylight strips on warehouses
      float sky = step(0.8, fract(meters.z / 12.0)) * step(2.0, meters.x) * step(meters.x, vDims.x - 2.0);
      col = mix(col, vec3(0.75, 0.8, 0.85), sky * 0.7);
      rough = 0.7;
    }
  } else if (isRoofSlope) {
    col = roofPalette(vStyle.w) * (0.88 + 0.24 * vnoise(vWorldPosF.xz * 2.0 + vWorldPosF.y));
    // tile rows
    col *= 0.92 + 0.08 * step(0.5, fract(v / 0.35));
    rough = 0.85;
  } else if (vLocalN.y < -0.5) {
    col = wall * 0.5;
  } else {
    float floorIdx = floor(v / floorH);
    float fy = fract(v / floorH);
    // window pattern LOD: fade to the average when the pattern is sub-pixel
    float winW = style < 0.5 ? 1.6 : style < 1.5 ? 3.2 : style < 2.5 ? 3.6 : style < 3.5 ? 3.0 : style < 4.5 ? 8.0 : style < 5.5 ? 3.4 : style < 6.5 ? 9.0 : 3.9;
    float fx = fract(u / winW);
    float colIdx = floor(u / winW);
    float px = fwidth(u / winW) + fwidth(v / floorH);
    float lod = clamp(px * 1.6, 0.0, 1.0);
    float litHash = hash12(vec2(colIdx * 1.31 + facadeSeed, floorIdx * 0.77 + seed));
    float lit = step(0.72 - 0.25 * uNight, litHash) * uNight;
    vec3 glassCol = vec3(0.07, 0.10, 0.13);
    vec3 warm = mix(vec3(1.0, 0.82, 0.55), vec3(0.75, 0.85, 1.0), step(0.75, hash11(litHash * 17.0)));
    if (style < 0.5) {
      // curtain wall: nearly all glass, thin mullions, spandrel every floor
      float mullion = step(fx, 0.06) + step(0.94, fx);
      float spandrel = step(fy, 0.16);
      float glass = 1.0 - max(min(mullion, 1.0), spandrel);
      vec3 tint = mix(vec3(0.07, 0.15, 0.20), vec3(0.05, 0.09, 0.15), hash11(seed * 5.3));
      vec3 spandrelCol = wall * 0.55;
      col = mix(spandrelCol, tint, glass);
      col = mix(col, mix(spandrelCol, tint, 0.8), lod);
      rough = mix(0.55, 0.12, glass);
      metal = mix(0.0, 0.85, glass) * (1.0 - lod * 0.3);
      emis = warm * lit * glass * 1.4;
    } else if (style < 1.5 || style > 6.5) {
      // punched windows on plaster / hotel slab
      float wx = step(0.22, fx) * step(fx, 0.78);
      float wy = step(0.25, fy) * step(fy, 0.82);
      float glass = wx * wy;
      if (style > 6.5) { glass = step(0.1, fx) * step(fx, 0.9) * step(0.2, fy) * step(fy, 0.9); }
      col = mix(wall, glassCol, glass);
      col = mix(col, mix(wall, glassCol, 0.4), lod);
      rough = mix(0.8, 0.2, glass);
      metal = glass * 0.7 * (1.0 - lod);
      emis = warm * lit * glass * 1.6;
      // balcony slabs on hotel slabs
      if (style > 6.5) { float slab = step(fy, 0.12); col = mix(col, vec3(0.9, 0.9, 0.88), slab * (1.0 - lod)); rough = mix(rough, 0.8, slab); }
    } else if (style < 2.5) {
      // balcony bands: light slab edge, dark recessed glass, railing line
      float slab = step(fy, 0.14);
      float rail = step(0.14, fy) * step(fy, 0.42) * step(0.08, fx) * step(fx, 0.92);
      float glass = step(0.42, fy) * step(fy, 0.95) * step(0.08, fx) * step(fx, 0.92);
      col = mix(wall * 0.9, vec3(0.92, 0.92, 0.9), slab);
      col = mix(col, glassCol * 1.2, glass);
      col = mix(col, wall * 0.75, rail * 0.6);
      col = mix(col, mix(wall, glassCol, 0.45), lod);
      rough = mix(0.8, 0.25, glass);
      metal = glass * 0.6 * (1.0 - lod);
      emis = warm * lit * glass * 1.3;
    } else if (style < 3.5) {
      // art deco: pastel wall, vertical fins, smaller windows, horizontal accent every 3 floors
      float fin = step(fx, 0.08);
      float wx = step(0.3, fx) * step(fx, 0.72);
      float wy = step(0.3, fy) * step(fy, 0.8);
      float glass = wx * wy;
      float accent = step(fract(floorIdx / 3.0), 0.05) * step(fy, 0.1);
      col = mix(wall, wall * 1.12, fin);
      col = mix(col, glassCol, glass);
      col = mix(col, vec3(0.95, 0.95, 0.9), accent);
      col = mix(col, mix(wall, glassCol, 0.3), lod);
      rough = mix(0.85, 0.25, glass);
      metal = glass * 0.6 * (1.0 - lod);
      emis = warm * lit * glass * 1.5;
    } else if (style < 4.5) {
      // industrial: corrugated metal, sparse high windows, roll-up doors at ground
      float corr = 0.5 + 0.5 * sin(u * 6.28 * 1.2);
      col = wall * (0.9 + 0.1 * corr * (1.0 - lod));
      float win = step(0.3, fx) * step(fx, 0.7) * step(0.55, fy) * step(fy, 0.8) * step(0.5, hash12(vec2(colIdx, facadeSeed)));
      float door = step(fy, 0.45) * step(0.15, fx) * step(fx, 0.85) * step(floorIdx, 0.5) * step(0.6, hash12(vec2(colIdx + 3.0, facadeSeed)));
      col = mix(col, vec3(0.5, 0.6, 0.65), win * 0.8);
      col = mix(col, wall * 0.55, door);
      col *= 1.0 - 0.2 * smoothstep(0.5, 0.8, grime) * (1.0 - smoothstep(0.0, 4.0, v));
      rough = 0.55; metal = 0.35;
    } else if (style < 5.5) {
      // houses: stucco, windows with white trim, a door
      float wx = step(0.3, fx) * step(fx, 0.7);
      float wy = step(0.3, fy) * step(fy, 0.75);
      float glass = wx * wy * step(0.35, hash12(vec2(colIdx, facadeSeed)));
      float trim = (step(0.25, fx) * step(fx, 0.75) * step(0.25, fy) * step(fy, 0.8)) - glass;
      col = wall * (0.95 + 0.1 * vnoise(vWorldPosF.xz * 2.0 + v));
      col = mix(col, vec3(0.95), trim * 0.7);
      col = mix(col, glassCol, glass);
      col = mix(col, wall, lod);
      rough = mix(0.85, 0.3, glass);
      metal = glass * 0.5 * (1.0 - lod);
      emis = warm * lit * glass * 1.2;
    } else {
      // plain concrete (parking / utility)
      col = wall * (0.9 + 0.2 * vnoise(vWorldPosF.xz * 0.5 + v * 0.3));
      float slot = step(0.55, fy) * step(fy, 0.9);
      col = mix(col, col * 0.4, slot * 0.8);
      rough = 0.85;
    }
    // ground floor: darker plinth / shopfronts, streaks of grime under sills
    col *= 1.0 - 0.18 * smoothstep(0.55, 0.85, grime) * (1.0 - smoothstep(2.0, 12.0, v));
    col = mix(col, col * 0.8, step(v, 0.8));
    // crown lighting on tall towers at night: a lit band just below the roof line
    if (vDims.y > 110.0) {
      float crown = smoothstep(vDims.y - 6.0, vDims.y - 4.5, v) * (1.0 - smoothstep(vDims.y - 1.0, vDims.y, v));
      vec3 crownCol = mix(vec3(1.0, 0.85, 0.6), vec3(0.4, 0.8, 1.0), step(0.5, hash11(seed * 2.7)));
      emis += crownCol * crown * 6.0 * uNight;
    }
  }
  diffuseColor.rgb = col;
  roughnessFactor = rough;
  metalnessFactor = metal;
  totalEmissiveRadiance += emis;
}`);
  };
  mat.customProgramCacheKey = () => 'facade-v1';
  return mat;
}
