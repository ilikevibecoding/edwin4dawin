import * as THREE from 'three';
import { GLSL_NOISE } from '../render/shaders/common.glsl';

/** Procedural facade material shared by all instanced buildings.
 *  Per-instance attributes:
 *    aDims   (w, h, d) metres
 *    aStyle  (style, floorHeight, seed, roofPalette)
 *    aStyle2 (litFraction, warmMix, variant, form)   form: house roof 0 gable / 1 hip / 2 flat
 *    instanceColor = wall tint
 *  Per-vertex attribute aPart tags the deformable house vertices (0 fixed, 1 body top, 2 eave, 3 ridge)
 *  so one instanced geometry yields gable, hip and flat-roofed houses (and pools).
 *  Styles:
 *    0 blue glass curtain wall      1 punched windows on plaster    2 balcony bands (cream concrete)
 *    3 art-deco pastel banding      4 industrial metal              5 house stucco
 *    6 plain concrete / utility     7 hotel slab                    8 green ribbon glass
 *    9 dark stone strip windows    10 beige brick mid-rise         11 white egg-crate frame
 *   12 pool water                  13 helipad
 */
export function createFacadeMaterial(nightUniform: THREE.IUniform<number>): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, metalness: 0.0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = nightUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec3 aDims;
attribute vec4 aStyle;
attribute vec4 aStyle2;
attribute float aPart;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vDims;
varying vec4 vStyle;
varying vec4 vStyle2;
varying vec3 vWorldPosF;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  float form = aStyle2.w;
  if (aPart > 0.5) {
    if (form > 1.5) {
      // flat roof: the body keeps its full height and the roof prism collapses to a point
      if (aPart > 1.5) transformed = vec3(0.0, 1.0, 0.0);
    } else {
      if (aPart < 1.5) transformed.y = 0.68;                        // body top tucks under the roof
      else if (aPart > 2.5 && form > 0.5) transformed.z *= 0.42;    // hip roof: shortened ridge
    }
  }
}
vLocal = transformed;
vLocalN = normal;
vDims = aDims;
vStyle = aStyle;
vStyle2 = aStyle2;
vWorldPosF = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uNight;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vDims;
varying vec4 vStyle;
varying vec4 vStyle2;
varying vec3 vWorldPosF;
${GLSL_NOISE}
vec3 roofPalette(float k) {
  if (k < 0.5) return vec3(0.60, 0.31, 0.20);      // terracotta
  if (k < 1.5) return vec3(0.36, 0.36, 0.37);      // grey shingle
  if (k < 2.5) return vec3(0.88, 0.87, 0.84);      // white membrane
  if (k < 3.5) return vec3(0.40, 0.29, 0.22);      // brown
  if (k < 4.5) return vec3(0.20, 0.42, 0.40);      // teal metal
  if (k < 5.5) return vec3(0.56, 0.56, 0.57);      // gravel
  if (k < 6.5) return vec3(0.76, 0.66, 0.50);      // sandy tile
  return vec3(0.52, 0.22, 0.16);                   // dark red tile
}
`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
{
  float style = vStyle.x;
  float floorH = max(vStyle.y, 2.6);
  float seed = vStyle.z;
  float litFrac = vStyle2.x;
  float warmMix = vStyle2.y;
  float variant = vStyle2.z;
  vec3 wall = diffuseColor.rgb; // instance colour
  vec3 meters = vec3((vLocal.x + 0.5) * vDims.x, vLocal.y * vDims.y, (vLocal.z + 0.5) * vDims.z);
  bool isTop = vLocalN.y > 0.6;
  bool isRoofSlope = vLocalN.y > 0.25 && vLocalN.y <= 0.6;
  float sideX = abs(vLocalN.x);
  float u = sideX > 0.5 ? meters.z : meters.x;
  float v = meters.y;
  float facadeSeed = seed + floor(sideX + 0.5) * 3.7 + step(0.0, vLocalN.x + vLocalN.z) * 11.1;
  bool glassy = style < 0.5 || style == 8.0 || style == 9.0;
  // thin, tall concrete frusta are the spires / masts on the crowns
  bool mast = style == 6.0 && vDims.x < 10.0 && vDims.y > 12.0 && vDims.y > vDims.x * 3.0;
  vec3 glassDark = vec3(0.07, 0.10, 0.13);
  vec3 col = wall;
  float rough = 0.75;
  float metal = 0.0;
  vec3 emis = vec3(0.0);
  float grime = fbm3(vWorldPosF.xz * 0.11 + vWorldPosF.y * 0.07);
  if (isTop) {
    if (style == 5.0) {
      col = roofPalette(vStyle.w) * (0.9 + 0.2 * vnoise(vWorldPosF.xz * 1.5));
      rough = 0.85;
    } else if (style == 12.0) {
      // pool water
      col = vec3(0.14, 0.60, 0.72) * (0.92 + 0.16 * vnoise(vWorldPosF.xz * 1.3));
      rough = 0.06; metal = 0.25;
    } else if (style == 13.0) {
      // helipad: dark pad, white ring and H
      vec2 c = meters.xz - vDims.xz * 0.5;
      float r = length(c) / (vDims.x * 0.5);
      float ring = step(0.82, r) * step(r, 0.94);
      float hBar = step(abs(c.x), vDims.x * 0.2) * step(abs(c.y), vDims.x * 0.045);
      float hLegs = step(abs(c.y), vDims.x * 0.28) * step(abs(abs(c.x) - vDims.x * 0.2), vDims.x * 0.045);
      col = mix(vec3(0.24, 0.25, 0.26), vec3(0.9), clamp(ring + hBar + hLegs, 0.0, 1.0) * 0.85);
      rough = 0.8;
    } else if (style == 4.0) {
      col = vec3(0.52, 0.53, 0.54) * (0.9 + 0.2 * vnoise(vWorldPosF.xz * 0.4));
      // skylight strips on warehouses
      float sky = step(0.8, fract(meters.z / 12.0)) * step(2.0, meters.x) * step(meters.x, vDims.x - 2.0);
      col = mix(col, vec3(0.75, 0.8, 0.85), sky * 0.7);
      rough = 0.7;
    } else {
      // tower roofs: dark membrane on glass / stone / brick, pale on concrete and stucco
      vec3 base = glassy ? vec3(0.26, 0.27, 0.28) : style == 10.0 ? vec3(0.30, 0.29, 0.28) : style == 6.0 ? vec3(0.55, 0.55, 0.56) : style == 3.0 ? mix(vec3(0.74, 0.72, 0.68), wall, 0.35) : vec3(0.74, 0.74, 0.72);
      col = base * (0.85 + 0.3 * vnoise(vWorldPosF.xz * 0.6));
      // parapet edge and mechanical pads
      float edgeD = min(min(meters.x, vDims.x - meters.x), min(meters.z, vDims.z - meters.z));
      col = mix(col * 0.7, col, smoothstep(0.6, 1.4, edgeD));
      col = mix(col, col * 0.55, step(0.62, hash12(floor(vWorldPosF.xz / 6.0) + seed)) * 0.3);
      rough = 0.9;
      // aviation beacon on the tallest roofs
      if (vDims.y > 140.0) {
        float dc = length(meters.xz - vDims.xz * 0.5);
        emis += vec3(1.0, 0.08, 0.04) * step(dc, 1.0) * 5.0 * uNight;
      }
    }
  } else if (isRoofSlope) {
    if (style == 5.0) {
      col = roofPalette(vStyle.w) * (0.88 + 0.24 * vnoise(vWorldPosF.xz * 2.0 + vWorldPosF.y));
      col *= 0.92 + 0.08 * step(0.5, fract(v / 0.35));
      rough = 0.85;
    } else {
      // tapered crowns: glass on glass towers (lit from inside at night), painted metal elsewhere
      col = style < 0.5 ? vec3(0.26, 0.36, 0.48) : style == 8.0 ? vec3(0.2, 0.38, 0.36) : wall * 0.8;
      rough = glassy ? 0.1 : 0.5;
      metal = glassy ? 0.85 : 0.2;
      emis = vec3(1.0, 0.85, 0.6) * (glassy ? 0.9 : 0.12) * uNight;
    }
  } else if (vLocalN.y < -0.5) {
    col = wall * 0.5;
  } else {
    float floorIdx = floor(v / floorH);
    float fy = fract(v / floorH);
    float winW = style < 0.5 ? 1.5 : style < 1.5 ? 3.2 : style < 2.5 ? 3.6 : style < 3.5 ? 3.0 : style < 4.5 ? 8.0 : style < 5.5 ? 3.4 : style < 6.5 ? 9.0 : style < 7.5 ? 3.9 : style < 8.5 ? 6.0 : style < 9.5 ? 4.2 : style < 10.5 ? 3.4 : 2.8;
    winW *= 0.85 + 0.3 * variant;
    float fx = fract(u / winW);
    float colIdx = floor(u / winW);
    // window pattern LOD: fade to the average when the pattern is sub-pixel
    float px = fwidth(u / winW) + fwidth(v / floorH);
    float lod = clamp(px * 1.6, 0.0, 1.0);
    // night lighting: per-building lit fraction and warm/cool mix; offices light whole floors
    float nightOn = smoothstep(0.05, 0.5, uNight);
    float wHash = hash12(vec2(colIdx * 1.31 + facadeSeed, floorIdx * 0.77 + seed));
    float fHash = hash11(floorIdx * 0.913 + seed * 0.37);
    float thr = 1.0 - litFrac;
    float office = (glassy || style == 11.0) ? 1.0 : 0.0;
    float lit = mix(step(thr, wHash), max(step(thr + 0.12, fHash) * step(0.2, wHash), step(thr + 0.5, wHash)), office);
    lit = min(lit, 1.0) * nightOn;
    vec3 litCol = mix(vec3(0.78, 0.87, 1.0), vec3(1.0, 0.74, 0.42), step(1.0 - warmMix, hash11(wHash * 17.0 + seed)));
    if (mast) {
      // slender painted spires / masts: pale paint, a red beacon at the tip and a floodlit glow at night
      col = wall * (0.94 + 0.08 * vnoise(vWorldPosF.xz * 3.0 + v * 2.0));
      rough = 0.45; metal = 0.15;
      float tip = smoothstep(vDims.y - 2.5, vDims.y - 1.0, v);
      emis = vec3(1.0, 0.1, 0.05) * tip * 4.0 * uNight + vec3(1.0, 0.78, 0.5) * 0.2 * uNight;
    } else if (style < 0.5) {
      // blue curtain wall: reflective panes between dark spandrels. The pane colour is a pale cool grey-blue with
      // high metalness so the environment map (sky above, haze toward the horizon) reads as a gradient on the tower;
      // panes stay well below the masonry families in brightness so the two read as different materials.
      float mull = step(fx, 0.05) + step(0.95, fx) + step(fy, 0.05);
      float spandrel = step(fy, 0.16 + 0.12 * variant);
      float glass = 1.0 - clamp(mull + spandrel, 0.0, 1.0);
      vec3 tint = mix(vec3(0.34, 0.44, 0.56), vec3(0.22, 0.32, 0.46), variant);
      vec3 spandrelCol = mix(wall * 0.42, vec3(0.06, 0.08, 0.12), step(0.5, hash11(seed * 5.3)));
      col = mix(mix(spandrelCol, wall * 0.3, clamp(mull, 0.0, 1.0)), tint, glass);
      col = mix(col, mix(spandrelCol, tint, 0.72), lod);
      rough = mix(0.5, 0.06, glass);
      metal = glass * 0.88 * (1.0 - 0.25 * lod);
      emis = litCol * lit * glass * 1.4;
    } else if (style < 1.5 || style > 6.5 && style < 7.5) {
      // punched windows on plaster / hotel slab with balconies
      float wx = step(0.22, fx) * step(fx, 0.78);
      float wy = step(0.25, fy) * step(fy, 0.82);
      float glass = wx * wy;
      if (style > 6.5) { glass = step(0.1, fx) * step(fx, 0.9) * step(0.2, fy) * step(fy, 0.9); }
      col = mix(wall, glassDark, glass);
      // sill shadow under each window
      col *= 1.0 - 0.15 * wx * step(0.18, fy) * step(fy, 0.25);
      col = mix(col, mix(wall, glassDark, 0.4), lod);
      rough = mix(0.8, 0.2, glass);
      metal = glass * 0.7 * (1.0 - lod);
      emis = litCol * lit * glass * 1.6;
      if (style > 6.5) { float slab = step(fy, 0.12); col = mix(col, vec3(0.9, 0.9, 0.88), slab * (1.0 - lod)); rough = mix(rough, 0.8, slab); }
    } else if (style < 2.5) {
      // balcony bands: light slab edge, dark recessed glass, railing line
      float slab = step(fy, 0.14);
      float rail = step(0.14, fy) * step(fy, 0.42) * step(0.08, fx) * step(fx, 0.92);
      float glass = step(0.42, fy) * step(fy, 0.95) * step(0.08, fx) * step(fx, 0.92);
      col = mix(wall * 0.9, vec3(0.94, 0.93, 0.9), slab);
      col = mix(col, glassDark * 1.2, glass);
      col = mix(col, wall * 0.75, rail * 0.6);
      col = mix(col, mix(wall, glassDark, 0.45), lod);
      rough = mix(0.8, 0.25, glass);
      metal = glass * 0.6 * (1.0 - lod);
      emis = litCol * lit * glass * 1.3;
    } else if (style < 3.5) {
      // art deco: pastel stucco, horizontal band each floor, vertical fins, small windows, accent every 4 floors
      float fin = step(fx, 0.08);
      float band = step(fy, 0.09);
      float wx = step(0.3, fx) * step(fx, 0.72);
      float wy = step(0.28, fy) * step(fy, 0.8);
      float glass = wx * wy;
      vec3 bandCol = mix(vec3(0.96, 0.95, 0.9), wall * 0.78, step(0.5, variant));
      col = mix(wall, wall * 1.1, fin);
      col = mix(col, glassDark, glass);
      col = mix(col, bandCol, band);
      col = mix(col, vec3(0.96, 0.95, 0.9), step(fract(floorIdx / 4.0), 0.05) * step(fy, 0.16));
      col = mix(col, mix(wall, glassDark, 0.3), lod);
      rough = mix(0.85, 0.25, glass);
      metal = glass * 0.6 * (1.0 - lod);
      emis = litCol * lit * glass * 1.5;
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
      col = mix(col, glassDark, glass);
      col = mix(col, wall, lod);
      rough = mix(0.85, 0.3, glass);
      metal = glass * 0.5 * (1.0 - lod);
      emis = litCol * lit * glass * 1.2;
    } else if (style < 6.5) {
      // plain concrete (parking / utility / podiums)
      col = wall * (0.9 + 0.2 * vnoise(vWorldPosF.xz * 0.5 + v * 0.3));
      float slot = step(0.55, fy) * step(fy, 0.9);
      col = mix(col, col * 0.4, slot * 0.8 * (1.0 - 0.5 * lod));
      rough = 0.85;
    } else if (style < 8.5) {
      // green ribbon glass: continuous glass bands between pale spandrels
      float band = step(0.26, fy) * step(fy, 0.97);
      float mull = step(fract(u / 6.0), 0.03);
      float glass = band * (1.0 - mull);
      vec3 tint = mix(vec3(0.18, 0.36, 0.34), vec3(0.24, 0.42, 0.42), variant);
      col = mix(wall, tint, glass);
      col = mix(col, mix(wall, tint, 0.68), lod);
      rough = mix(0.6, 0.08, glass);
      metal = glass * 0.88 * (1.0 - 0.3 * lod);
      emis = litCol * lit * glass * 1.3;
    } else if (style < 9.5) {
      // dark stone piers with bronze vertical strip windows
      float hs = 0.2 + 0.08 * variant;
      float strip = step(0.5 - hs, fx) * step(fx, 0.5 + hs) * step(0.1, fy);
      vec3 stone = wall * (0.92 + 0.16 * vnoise(vWorldPosF.xz * 0.9 + v * 0.7));
      vec3 bronze = vec3(0.13, 0.10, 0.075);
      col = mix(stone, bronze, strip);
      col = mix(col, mix(stone, bronze, 0.5), lod);
      rough = mix(0.55, 0.15, strip);
      metal = strip * 0.8 * (1.0 - 0.3 * lod);
      emis = litCol * lit * strip * 1.2;
    } else if (style < 10.5) {
      // brick mid-rise: running bond, punched windows with stone lintels, shopfronts at street level
      float row = floor(v / 0.075);
      float brick = hash12(vec2(floor(u / 0.24 + 0.5 * mod(row, 2.0)), row));
      vec3 bcol = wall * (0.86 + 0.28 * brick);
      float wx = step(0.28, fx) * step(fx, 0.72);
      float wy = step(0.22, fy) * step(fy, 0.78);
      float glass = wx * wy;
      float lintel = wx * step(0.78, fy) * step(fy, 0.86);
      float ground = step(floorIdx, 0.5);
      glass = max(glass, ground * step(0.08, fx) * step(fx, 0.92) * step(0.05, fy) * step(fy, 0.85) * step(0.35, hash12(vec2(colIdx, facadeSeed))));
      col = mix(bcol, glassDark, glass);
      col = mix(col, vec3(0.8, 0.78, 0.72), lintel);
      col = mix(col, mix(bcol, glassDark, 0.35), lod);
      rough = mix(0.9, 0.2, glass);
      metal = glass * 0.6 * (1.0 - lod);
      emis = litCol * lit * glass * 1.4;
    } else if (style < 11.5) {
      // white egg-crate frame with deeply recessed glass
      float frame = 1.0 - step(0.12, fx) * step(fx, 0.88) * step(0.14, fy) * step(fy, 0.9);
      float glass = 1.0 - frame;
      float recess = 0.4 * smoothstep(0.62, 0.9, fy) + 0.15 * smoothstep(0.7, 0.88, fx);
      vec3 g = mix(glassDark * 1.3, glassDark * 0.45, recess);
      col = mix(g, wall, frame);
      col = mix(col, mix(wall, glassDark, 0.42), lod);
      rough = mix(0.25, 0.8, frame);
      metal = glass * 0.6 * (1.0 - lod);
      emis = litCol * lit * glass * 1.3;
    } else if (style < 12.5) {
      // pool sides: pale tile
      col = vec3(0.85, 0.9, 0.9);
      rough = 0.4;
    } else {
      col = wall;
      rough = 0.8;
    }
    // ground floor: darker plinth / shopfronts, streaks of grime under sills
    col *= 1.0 - 0.18 * smoothstep(0.55, 0.85, grime) * (1.0 - smoothstep(2.0, 12.0, v));
    col = mix(col, col * 0.8, step(v, 0.8));
    // crown lighting on about two thirds of the tall towers at night: a lit band just below the roof line, warm,
    // cool or (rarely) magenta, brighter than the windows so the skyline keeps its hierarchy after dark
    if (vDims.y > 110.0 && hash11(seed * 1.9 + 3.1) < 0.66) {
      float crown = smoothstep(vDims.y - 7.0, vDims.y - 5.0, v) * (1.0 - smoothstep(vDims.y - 1.0, vDims.y, v));
      float pick = hash11(seed * 2.7);
      vec3 crownCol = pick < 0.5 ? vec3(1.0, 0.85, 0.6) : pick < 0.88 ? vec3(0.4, 0.8, 1.0) : vec3(1.0, 0.35, 0.7);
      emis += crownCol * crown * 8.0 * uNight;
    }
  }
  diffuseColor.rgb = col;
  roughnessFactor = rough;
  metalnessFactor = metal;
  totalEmissiveRadiance += emis;
}`);
  };
  mat.customProgramCacheKey = () => 'facade-v3';
  return mat;
}
