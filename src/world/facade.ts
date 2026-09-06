import * as THREE from 'three';
import { GLSL_NOISE } from '../render/shaders/common.glsl';

/** Procedural facade material shared by all instanced buildings.
 *  Per-instance attributes:
 *    aDims   (w, h, d) metres
 *    aStyle  (style, floorHeight, seed, roofPalette)
 *    aStyle2 (litFraction, warmMix, variant, form)   form: house roof 0 gable / 1 hip / 2 flat
 *    instanceColor = wall tint
 *  Per-vertex attribute aPart tags the deformable house vertices (0 fixed, 1 body top, 2 eave, 3 ridge); -1 tags
 *  the round prisms (cylinder / octagon) so their facade unwraps around the drum instead of being projected.
 *  One instanced geometry yields gable, hip and flat-roofed houses (and pools).
 *
 *  The per-instance varyings are `flat`: perspective interpolation of a constant leaves ~1e-4 of roundoff, which
 *  the per-pane hashes amplified into pixel speckle inside every window.
 *  Every facade pattern is drawn analytically and box-filtered with the pixel footprint (`fpulse`): a window
 *  grid resolves to its true average tone and contrast at any distance instead of aliasing or being faded to a
 *  flat colour, and per-pane detail (blinds, reveals, pane tilt) fades out only once a pane is under a pixel.
 *  Styles:
 *    0 blue glass curtain wall      1 punched windows on plaster    2 balcony bands (cream concrete)
 *    3 art-deco pastel banding      4 industrial metal              5 house stucco
 *    6 plain concrete / utility     7 hotel slab                    8 green ribbon glass
 *    9 dark stone strip windows    10 beige brick mid-rise         11 white egg-crate frame
 *   12 pool water                  13 helipad                      14 glass balustrade (trim layer)
 *  Behind panes over ~12 px a ray-box trace in facade space draws the room (back wall, party wall, ceiling with
 *  lit panels, floor) in the main pass only (the mirror pass renders from the camera reflected under the water).
 *  Glass widens its specular lobe as its panes go sub-pixel (the pane tilts average into the face's normal
 *  distribution), so the sun lights a tower's sun-facing side coherently at 1-5 km.
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
flat varying vec3 vDims;
flat varying vec4 vStyle;
flat varying vec4 vStyle2;
varying vec3 vWorldPosF;
flat varying float vRound;
flat varying vec3 vCamLocal;`)
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
vRound = aPart < -0.5 ? 1.0 : 0.0;
vWorldPosF = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
// camera in the instance's unit-box space (the parallax rooms trace rays in it); the mirror pass renders from
// the camera reflected under the water, so a negative camera height marks that pass in the fragment shader
vCamLocal = (inverse(modelMatrix * instanceMatrix) * vec4(cameraPosition, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uNight;
varying vec3 vLocal;
varying vec3 vLocalN;
flat varying vec3 vDims;
flat varying vec4 vStyle;
flat varying vec4 vStyle2;
varying vec3 vWorldPosF;
flat varying float vRound;
flat varying vec3 vCamLocal;
${GLSL_NOISE}
// per-pane tilt of the glazing (view space), applied to the shading normal after it is computed
vec3 facadeTilt = vec3(0.0);
// how much of this fragment is glazing and how high up the facade it sits (0 grade .. 1 roof): the sky a pane
// mirrors is picked from the probe by height below
float facadeGlass = 0.0;
float facadeHf = 0.5;
// Glazing is a dielectric with a reflective coating, not a metal: its specular colour (F0, the coating) and its
// diffuse colour (the room seen through it) are set separately in lights_physical_fragment, so a pane is dark
// where the mirrored sky is dark, shows its interior head-on and turns into a mirror toward grazing (Fresnel).
vec3 facadeF0 = vec3(0.04);
vec3 facadeDiff = vec3(0.0);
// the lower floors mirror the neighbouring blocks (soft vertical bands) instead of open sky
float facadeOccl = 0.0;
// roughness of the mirrored sky: the pane tilt spread, not the sun-lobe roughness (which widens with distance so
// the sun lights a far tower coherently); the sky gradient a facade mirrors stays crisp at every distance
float facadeSkyRough = 0.1;
// integral from 0 to x of a unit-period pulse train that is 1 on [a, b) of every period
float pulseInt(float x, float a, float b) { float f = floor(x); return f * (b - a) + clamp(x - f - a, 0.0, b - a); }
// box-filtered pulse train: the fraction of the pixel footprint [x - w/2, x + w/2] covered by the pulse. Once the
// footprint nears a whole period the residual ripple (moire) is faded to the exact mean b - a.
// The footprint widens (up to 1.4x, a lens-like low-pass) as the period nears a few pixels: a 2-3 px floor
// rhythm otherwise beats with the pixel grid into herringbone moire on receding faces.
float fpulse(float x, float a, float b, float w) {
  w = max(w, 1e-4) * mix(1.0, 1.4, smoothstep(0.1, 0.45, w));
  float f = (pulseInt(x + 0.5 * w, a, b) - pulseInt(x - 0.5 * w, a, b)) / w;
  return mix(f, b - a, smoothstep(0.55, 1.0, w));
}
// box-filtered step
float fstep(float edge, float x, float w) { return clamp((x - edge) / max(w, 1e-4) + 0.5, 0.0, 1.0); }
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
// glazing families: blue-green, bronze, grey, clear (the reflective base colour of a pane)
vec3 glassFamily(float k) {
  if (k < 0.4) return vec3(0.34, 0.46, 0.55);
  if (k < 0.6) return vec3(0.38, 0.30, 0.22);
  if (k < 0.8) return vec3(0.36, 0.38, 0.41);
  return vec3(0.46, 0.51, 0.55);
}
// coating reflectance (F0) of the glazing families: reflective low-e blue-green and silver-grey, bronze, and
// the near-clear glass of ordinary windows (F0 0.08 plus a faint green cast); a real pane is 8-30 % reflective
// head-on and climbs to a mirror toward grazing, which Fresnel adds on top of these
vec3 glassCoat(float k) {
  if (k < 0.4) return vec3(0.22, 0.30, 0.36);
  if (k < 0.6) return vec3(0.31, 0.22, 0.14);
  if (k < 0.8) return vec3(0.28, 0.29, 0.31);
  return vec3(0.09, 0.105, 0.11);
}
vec3 fasciaPalette(float k) {
  if (k < 0.16) return vec3(0.62, 0.10, 0.08);
  if (k < 0.32) return vec3(0.06, 0.28, 0.18);
  if (k < 0.48) return vec3(0.08, 0.14, 0.34);
  if (k < 0.64) return vec3(0.92, 0.90, 0.84);
  if (k < 0.80) return vec3(0.80, 0.56, 0.14);
  return vec3(0.10, 0.10, 0.11);
}
`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
normal = normalize(normal + facadeTilt);`)
      .replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>
#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
if (facadeGlass > 0.0) {
  // The probe has no parallax, so every pane of a tower would mirror the same strip of sky. Up a real tower the
  // top floors mirror the deep zenith blue and the lower floors the pale haze band and the neighbours: bend the
  // lookup by height. Seen from above a ray dips below the horizon, where the probe stores the flat ground
  // colour; the real ray crosses kilometres of air and shows the haze band instead, which is why distant
  // towers read pale and sky-coloured rather than grey: below-horizon radiance blends toward the haze.
  vec3 rv = inverseTransformDirection(reflect(-geometryViewDir, geometryNormal), viewMatrix);
  vec3 rb = normalize(vec3(rv.x, rv.y + 0.4 * (facadeHf - 0.4), rv.z));
  vec3 sky = textureCubeUV(envMap, envMapRotation * rb, facadeSkyRough).rgb * envMapIntensity;
  float below = smoothstep(0.0, -0.2, rb.y);
  if (below > 0.0) {
    // a ray mirrored downward from a tower a few hundred metres away lands on the sunlit blocks around it (the
    // probe's ground hemisphere); from kilometres away the same ray crosses enough air to show the haze band
    vec3 hz = textureCubeUV(envMap, envMapRotation * normalize(vec3(rb.x, 0.05, rb.z)), max(facadeSkyRough, 0.3)).rgb * envMapIntensity;
    float farW = smoothstep(400.0, 3000.0, length(vWorldPosF - cameraPosition));
    sky = mix(sky * vec3(1.05, 1.0, 0.92), hz, 0.75 * below * farW);
  }
  // the neighbours across the street stand in the mirror of the lower floors: darker than sky, warm-grey
  sky = mix(sky, sky * vec3(0.55, 0.5, 0.45), facadeOccl);
  radiance = mix(radiance, sky, facadeGlass);
}
#endif`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
if (facadeGlass > 0.0) {
  material.diffuseColor = mix(material.diffuseColor, facadeDiff, facadeGlass);
  material.specularColor = mix(material.specularColor, facadeF0, facadeGlass);
}`)
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
  float H = vDims.y;
  bool isTop = vLocalN.y > 0.6;
  bool isRoofSlope = vLocalN.y > 0.25 && vLocalN.y <= 0.6;
  float sideX = abs(vLocalN.x);
  bool round = vRound > 0.5;
  // facade coordinates in metres: along the face (unwrapped around the drum of a prism) and up
  float u = round ? (atan(vLocal.z, vLocal.x) + 3.14159265) * 0.5 * vDims.x : (sideX > 0.5 ? meters.z : meters.x);
  float v = meters.y;
  float faceW = round ? 3.14159265 * vDims.x : (sideX > 0.5 ? vDims.z : vDims.x);
  float facadeSeed = seed + floor(sideX + 0.5) * 3.7 + step(0.0, vLocalN.x + vLocalN.z) * 11.1;
  bool glassy = style < 0.5 || style == 8.0 || style == 9.0;
  // thin, tall concrete frusta are the spires / masts on the crowns
  bool isTrim = vStyle.w < -0.5;   // trim layer: slabs, rails, ledges, coping, corner columns (city.ts)
  bool mast = style == 6.0 && !isTrim && vDims.x < 10.0 && vDims.y > 12.0 && vDims.y > vDims.x * 3.0;
  vec3 glassDark = vec3(0.07, 0.10, 0.13);
  vec3 col = wall;
  float rough = 0.75;
  float metal = 0.0;
  vec3 emis = vec3(0.0);
  float grime = 0.62 * vnoise(vWorldPosF.xz * 0.11 + vWorldPosF.y * 0.07) + 0.38 * vnoise(vWorldPosF.xz * 0.27 - vWorldPosF.y * 0.15);
  float nightOn = smoothstep(0.03, 0.4, uNight);
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
      vec3 base = glassy ? vec3(0.26, 0.27, 0.28) : style == 10.0 ? vec3(0.30, 0.29, 0.28) : style == 6.0 ? vec3(0.52, 0.52, 0.53) : style == 3.0 ? mix(vec3(0.66, 0.64, 0.60), wall, 0.35) : vec3(0.64, 0.64, 0.62);
      col = base * (0.85 + 0.3 * vnoise(vWorldPosF.xz * 0.6));
      // gravel / membrane grain while it spans pixels, ponding stains at the low spots
      float roofPx = fwidth(vWorldPosF.x) + fwidth(vWorldPosF.z);
      float grain = vnoise(vWorldPosF.xz * 3.0);
      col *= 1.0 + (0.12 * grain - 0.06) * (1.0 - smoothstep(0.15, 0.6, roofPx));
      col *= 1.0 - 0.18 * smoothstep(0.62, 0.8, vnoise(vWorldPosF.xz * 0.25 + seed));
      // parapet coping around the edge, a shadow inside it, mechanical pads and rain staining
      float edgeD = min(min(meters.x, vDims.x - meters.x), min(meters.z, vDims.z - meters.z));
      float wm = fwidth(edgeD);
      col = mix(col * 0.62, col, fstep(1.2, edgeD, wm) * 0.6 + 0.4 * smoothstep(0.6, 3.0, edgeD));
      col = mix(col, vec3(0.80, 0.80, 0.78), (1.0 - fstep(0.45, edgeD, wm)) * (style == 5.0 ? 0.0 : 0.8));
      col = mix(col, col * 0.55, step(0.62, hash12(floor(vWorldPosF.xz / 6.0) + seed)) * 0.3);
      col *= 0.9 + 0.2 * grime;
      rough = 0.9;
      // aviation beacon on the tallest roofs
      if (vDims.y > 140.0 && !isTrim) {
        float dc = length(meters.xz - vDims.xz * 0.5);
        emis += vec3(1.0, 0.08, 0.04) * step(dc, 1.0) * 5.0 * uNight;
      }
    }
  } else if (isRoofSlope) {
    if (style == 5.0) {
      col = roofPalette(vStyle.w) * (0.88 + 0.24 * vnoise(vWorldPosF.xz * 2.0 + vWorldPosF.y));
      col *= 0.92 + 0.08 * fpulse(v / 0.35, 0.0, 0.5, fwidth(v) / 0.35);
      rough = 0.85;
    } else {
      // tapered crowns: glass on glass towers (lit from inside at night), painted metal elsewhere
      if (glassy) {
        // glazed pyramid: the same coated glass as the walls, a dark plant space behind it
        float gf = hash11(seed * 2.1 + 0.7);
        facadeGlass = 1.0;
        facadeF0 = glassCoat(gf) * (style == 8.0 ? 0.9 : 1.0);
        facadeDiff = vec3(0.04, 0.05, 0.06);
        facadeHf = 1.0;
        col = facadeDiff;
        rough = 0.1;
      } else {
        col = wall * 0.8;
        rough = 0.5;
        metal = 0.2;
      }
      emis = vec3(1.0, 0.85, 0.6) * (glassy ? 0.9 : 0.12) * uNight;
    }
  } else if (vLocalN.y < -0.5) {
    col = wall * 0.5;
  } else {
    // ---------------------------------------------------------------- walls
    // pixel footprint along the facade (metres): the box-filter width of every pattern
    float wu = fwidth(u), wv = fwidth(v);
    // floor grid; the top partial storey becomes the parapet / plant band so windows never run off the roof
    float parapet = (style < 0.5 || style == 8.0 || style == 11.0) ? 0.45 : 0.9 + 0.6 * hash11(seed * 7.7);
    float nFloors = max(1.0, floor((H - parapet) / floorH + 0.02));
    float fl = v / floorH;
    float floorIdx = floor(fl);
    float fy = fl - floorIdx;
    float rowOn = step(floorIdx + 0.5, nFloors);
    // bay (mullion pitch) per style, fitted to the face so the grid ends on a whole pane at each corner
    float bay = style < 0.5 ? 1.5 : style < 1.5 ? 3.2 : style < 2.5 ? 3.6 : style < 3.5 ? 3.0 : style < 4.5 ? 8.0 : style < 5.5 ? 3.4 : style < 6.5 ? 9.0 : style < 7.5 ? 3.9 : style < 8.5 ? 6.0 : style < 9.5 ? 4.2 : style < 10.5 ? 3.4 : 2.8;
    bay *= 0.85 + 0.3 * variant;
    float nBays = max(1.0, floor(faceW / bay + 0.5));
    bay = faceW / nBays;
    float bu = u / bay;
    float colIdx = floor(bu);
    float fx = bu - colIdx;
    float pwu = wu / bay, pwv = wv / floorH;
    // per-pane detail (blinds, reveals, tilt, AC units) is only drawn while a pane spans more than a pixel or two
    float vis = 1.0 - smoothstep(0.25, 0.8, max(pwu, pwv));
    float paneH = hash12(vec2(colIdx * 1.31 + facadeSeed, floorIdx * 0.77 + seed));
    float fHash = hash11(floorIdx * 0.913 + seed * 0.37);
    // night lighting: per-building lit fraction and warm/cool mix; offices light whole floors
    float thr = 1.0 - litFrac;
    float office = (glassy || style == 11.0) ? 1.0 : 0.0;
    float lit = mix(step(thr, paneH), max(step(thr + 0.12, fHash) * step(0.2, paneH), step(thr + 0.5, paneH)), office);
    lit = min(lit, 1.0) * nightOn;
    vec3 litCol = mix(vec3(0.78, 0.87, 1.0), vec3(1.0, 0.74, 0.42), step(1.0 - warmMix, hash11(paneH * 17.0 + seed)));
    // glazing family and clear / reflective split per building
    float gfam = hash11(seed * 2.1 + 0.7);
    if (wall.b > wall.r + 0.02 && gfam > 0.4 && gfam < 0.6) gfam = 0.2;   // cool-tinted towers never carry bronze glass
    vec3 gtint = glassFamily(gfam);
    float clear = step(0.8, hash11(seed * 3.9 + 1.3));   // clear glass: the interior shows through
    // window rectangle of this style in cell fractions (x along the bay, y up the storey)
    float x0 = 0.22, x1 = 0.78, y0 = 0.25, y1 = 0.82;
    // coating strength of the glazing: 1 = reflective low-e curtain wall, ~0.5 = the ordinary clear glass of
    // punched residential windows (F0 0.08, the room shows through)
    float paneRefl = 0.5;
    float useWin = 1.0;    // styles that draw the generic window grid
    if (style < 0.5) { x0 = 0.035; x1 = 0.965; y0 = 0.24 + 0.1 * variant; y1 = 0.975; paneRefl = 1.0; }
    else if (style == 7.0) { x0 = 0.08; x1 = 0.92; y0 = 0.2; y1 = 0.9; paneRefl = 0.6; }
    else if (style == 2.0) { x0 = 0.08; x1 = 0.92; y0 = 0.42; y1 = 0.95; paneRefl = 0.55; }
    else if (style == 3.0) { x0 = 0.3; x1 = 0.72; y0 = 0.28; y1 = 0.8; paneRefl = 0.5; }
    else if (style == 5.0) { x0 = 0.3; x1 = 0.7; y0 = 0.3; y1 = 0.75; paneRefl = 0.45; }
    else if (style == 8.0) { x0 = 0.0; x1 = 1.0; y0 = 0.26; y1 = 0.97; paneRefl = 1.0; }
    else if (style == 10.0) { x0 = 0.28; x1 = 0.72; y0 = 0.22; y1 = 0.78; paneRefl = 0.5; }
    else if (style == 11.0) { x0 = 0.12; x1 = 0.88; y0 = 0.14; y1 = 0.9; paneRefl = 0.7; }
    else if (style == 9.0) { paneRefl = 0.9; useWin = 0.0; }
    else if (style == 4.0 || style == 6.0 || style > 11.5) useWin = 0.0;
    paneRefl *= 1.0 - 0.45 * clear;
    float gx = fpulse(bu, x0, x1, pwu), gy = fpulse(fl, y0, y1, pwv);
    float glass = gx * gy * rowOn * useWin;
    // position inside the pane and what is seen through it: a dark room with a lighter ceiling band along
    // the top, blinds or curtains drawn on some panes, the reveal's shadow along the head and one jamb.
    // Blinds vary per floor as well as per pane (a tenant who keeps them down, a vacant floor with every blind
    // drawn), and each building has its own blind and curtain colours, so no two facades share a pattern.
    float px = clamp((fx - x0) / max(x1 - x0, 0.01), 0.0, 1.0), py = clamp((fy - y0) / max(y1 - y0, 0.01), 0.0, 1.0);
    float blindLen = 0.15 + 0.75 * fract(paneH * 9.1);
    float blindThr = clamp(0.62 + 0.5 * (fHash - 0.5) + 0.2 * (hash11(seed * 6.3 + 0.4) - 0.5), 0.15, 0.97);
    float blind = step(blindThr, paneH) * step(1.0 - blindLen, py) * vis;
    vec3 blindCol = mix(mix(vec3(0.58, 0.57, 0.53), vec3(0.62, 0.50, 0.40), step(0.8, fract(paneH * 5.3))), vec3(0.42, 0.40, 0.38), step(0.7, hash11(seed * 9.2 + 1.7)) * step(0.5, fract(paneH * 3.7)));
    vec3 interior = vec3(0.045, 0.055, 0.065) + vec3(0.14, 0.13, 0.11) * smoothstep(0.78, 0.98, py) * vis;
    // Parallax rooms behind the large panes (over ~12 px, main pass only: the mirror pass renders from the camera
    // reflected under the water): one ray-box trace in facade space finds the back wall, a side wall, the ceiling
    // or the floor of the room, so a near office or hotel window shows depth that moves with the viewer.
    float par = (1.0 - smoothstep(0.05, 0.09, max(pwu, pwv))) * useWin * step(0.0, cameraPosition.y) * (1.0 - vRound);
    float roomPanel = 0.0;   // lit ceiling panel seen through the pane (modulates the night glow)
    if (par > 0.0) {
      vec3 camM = vec3((vCamLocal.x + 0.5) * vDims.x, vCamLocal.y * vDims.y, (vCamLocal.z + 0.5) * vDims.z);
      vec3 d = normalize(meters - camM);
      float dn = max(dot(d, -vLocalN), 0.02);
      float du = sideX > 0.5 ? d.z : d.x, dv = d.y;
      float roomW = max(bay, 4.5), depth = min(6.0, 0.4 * (sideX > 0.5 ? vDims.x : vDims.z));
      float roomIdx = floor(u / roomW);
      float rHash = hash12(vec2(roomIdx * 0.71 + facadeSeed, floorIdx * 1.13 + seed));
      float tU = du > 0.0 ? ((roomIdx + 1.0) * roomW - u) / du : du < 0.0 ? (roomIdx * roomW - u) / du : 1e9;
      float tV = dv > 0.0 ? ((floorIdx + 1.0) * floorH - 0.35 - v) / dv : dv < 0.0 ? (floorIdx * floorH + 0.1 - v) / dv : 1e9;
      float tB = depth / dn;
      float t = min(tB, min(tU, tV));
      float hd = t * dn;                         // depth of the hit into the room
      float hu = u + t * du, hv = v + t * dv;
      // room finish per room: white / warm / grey offices, a few dark unlet floors
      vec3 wallCol = rHash < 0.35 ? vec3(0.62, 0.60, 0.56) : rHash < 0.7 ? vec3(0.58, 0.56, 0.58) : vec3(0.66, 0.58, 0.48);
      vec3 hit;
      float hRoom = hv - floorIdx * floorH;   // height of the hit above the room's floor
      if (t == tB) {
        // back wall with a cupboard / picture band, and the furniture standing against it: desks, partitions and
        // shelving read as dark silhouettes up to 0.75-1.6 m in about half the bays
        hit = wallCol * (0.85 + 0.3 * step(0.5, fract(hu / roomW * 2.0 + rHash)));
        float fu = fract(hu / 1.9 + rHash * 3.0);
        float furn = step(fu, 0.55) * step(hRoom, 0.75 + 0.85 * step(0.7, hash12(vec2(floor(hu / 1.9 + rHash * 3.0), rHash)))) * step(0.3, hash12(vec2(floor(hu / 1.9 + rHash * 3.0) + 7.0, rHash)));
        hit = mix(hit, vec3(0.16, 0.15, 0.14), furn * 0.85);
      }
      else if (t == tV && dv > 0.0) { hit = vec3(0.78, 0.78, 0.76); roomPanel = step(0.55, fract(hd / 1.4)) * step(0.3, fract(hu / 1.6 + rHash)); }
      else if (t == tV) hit = vec3(0.26, 0.24, 0.22) * (0.9 + 0.2 * step(0.5, fract(hu / 0.6)));            // carpet / tile floor
      else hit = wallCol * 0.8;                                                                          // party wall
      // daylight falls off into the room from the window; the lit room's ceiling panels glow at night
      float fall = 0.05 + 0.32 * exp(-hd * 0.45);
      vec3 room = hit * fall * (1.0 - 0.3 * step(0.86, rHash));
      interior = mix(interior, room, par);
    }
    vec3 seen = mix(interior, blindCol, blind);
    // the odd replaced pane in a different batch of glass
    float replaced = step(0.985, fract(paneH * 31.7)) * vis;
    float reveal = 1.0 - (0.32 * smoothstep(0.72, 1.0, py) + 0.14 * smoothstep(0.86, 1.0, px)) * vis;
    // per-pane micro tilt so each pane catches the sky and the sun a little differently
    {
      vec3 rnd = vec3(hash22(vec2(colIdx + 3.1, floorIdx + facadeSeed)), fract(paneH * 13.7)) - 0.5;
      vec3 nv = normalize(vNormal);
      facadeTilt = (rnd - nv * dot(rnd, nv)) * 0.06 * glass * vis;
    }
    // The pane itself: a coated dielectric. F0 is the coating (family colour times the building's variant, a
    // per-pane batch / film / dirt grain that damps to a fine grain as panes go sub-pixel, a silvery replaced
    // pane now and then); the diffuse colour is the room seen through it, shadowed by the reveal. The sun lobe
    // roughness stays near-mirror while a pane spans pixels (each tilted pane glints on its own) and widens as
    // the panes go sub-pixel: the tilts then average into the face's normal distribution and the sun lights the
    // whole sun-facing side coherently at 1-5 km instead of flashing only when exactly aligned.
    float grain = 1.0 + (fract(paneH * 7.9) - 0.5) * 0.44 * (0.4 + 0.6 * vis);
    vec3 coat = glassCoat(gfam) * paneRefl * (0.85 + 0.3 * variant) * grain;
    coat = mix(coat, vec3(0.30, 0.32, 0.33), replaced);
    float paneRough = mix(0.07, 0.42, 1.0 - vis);
    vec3 paneDiff = seen * reveal * (1.0 - 1.4 * max(coat.g, coat.b));
    facadeSkyRough = mix(0.08, 0.2, 1.0 - vis);
    // the sill's shadow and streaks of dirt washed down from it
    float sillY = y0 - 0.05, sillD = y0 - 0.3;
    float streakN = vnoise(vec2(u * 2.6 + seed, floorIdx * 3.1));
    float streak = gx * smoothstep(sillY, sillD, fy) * step(fy, sillY) * (0.25 + 0.75 * streakN) * rowOn * useWin * vis;
    float sill = gx * fpulse(fl, sillY - 0.04, y0, pwv) * rowOn * useWin;
    if (mast) {
      // slender painted spires / masts: pale paint, a red beacon at the tip and a floodlit glow at night
      col = wall * (0.94 + 0.08 * vnoise(vWorldPosF.xz * 3.0 + v * 2.0));
      rough = 0.45; metal = 0.15;
      float tip = smoothstep(vDims.y - 2.5, vDims.y - 1.0, v);
      emis = vec3(1.0, 0.1, 0.05) * tip * 4.0 * uNight + vec3(1.0, 0.78, 0.5) * 0.1 * uNight;
    } else if (style < 0.5) {
      // curtain wall: vision glass over a spandrel band, mullions between; spandrels are either back-painted glass
      // (an all-glass tower: the spandrel is glazing too, with the opaque backing as its diffuse colour) or metal
      // panel. Mullion caps are dark anodised or pale aluminium per building.
      float mull = 1.0 - fpulse(bu, 0.025, 0.975, pwu);
      float spandrelGlass = step(0.5, hash11(seed * 5.3));
      vec3 backing = mix(wall * 0.35, vec3(0.05, 0.07, 0.09), 0.5 * step(0.5, hash11(seed * 7.7 + 0.3)));
      vec3 spandrelCol = mix(wall * 0.45, vec3(0.86, 0.87, 0.88), step(0.8, hash11(seed * 6.1)));
      float spandrel = fpulse(fl, 0.0, y0, pwv) * (1.0 - mull) * rowOn;
      float mullCol = 0.2 + 0.35 * step(0.6, hash11(seed * 8.8));
      vec3 frame = vec3(mullCol) * (0.95 + 0.1 * spandrelGlass);
      col = mix(frame, spandrelCol, spandrel);
      // horizontal transom line at the head of the spandrel
      float transom = fpulse(fl, y0 - 0.02, y0 + 0.01, pwv) * (1.0 - mull);
      col = mix(col, frame, transom);
      rough = mix(mix(0.45, 0.35, spandrelGlass), paneRough, max(glass, spandrel * spandrelGlass));
      metal = spandrel * (1.0 - spandrelGlass) * 0.3 * step(0.8, hash11(seed * 6.1));   // pale metal panel spandrels
      // spandrel glass joins the glazing: same coating, opaque backing behind it
      float sg = spandrel * spandrelGlass * (1.0 - transom);
      glass = max(glass, sg);
      paneDiff = mix(paneDiff, backing, sg * (1.0 - gy));
      col = mix(col, paneDiff, glass);
      emis = litCol * lit * gx * gy * rowOn * mix(1.3, 2.0, clear) * (1.0 - 0.6 * blind);
      // some towers wear LED accent light at night: the corner mullions and a band under the crown
      float accent = step(0.82, hash11(seed * 3.3 + 2.2)) * step(60.0, H);
      if (accent > 0.5) {
        vec3 accentCol = hash11(seed * 4.1) < 0.5 ? vec3(0.3, 0.6, 1.0) : vec3(1.0, 0.3, 0.7);
        float edge = 1.0 - fstep(0.35, u, wu) + fstep(faceW - 0.35, u, wu);
        emis += accentCol * (edge * 3.0 + 0.25 * spandrel) * uNight;
      }
    } else if (style == 1.0 || style == 7.0) {
      // punched windows on plaster / hotel slab: stucco with a fine grain, a light frame around each opening,
      // AC units under some windows of the older blocks, floor slabs on the hotel
      float sgrain = 0.96 + 0.08 * vnoise(vWorldPosF.xz * 3.0 + v * 2.0);
      vec3 stucco = wall * sgrain;
      float frame = (fpulse(bu, x0 - 0.035, x1 + 0.035, pwu) * fpulse(fl, y0 - 0.03, y1 + 0.03, pwv) - gx * gy) * rowOn;
      col = mix(stucco, vec3(0.9, 0.9, 0.88), clamp(frame, 0.0, 1.0) * (style == 7.0 ? 0.35 : 0.7));
      col = mix(col, paneDiff, glass);
      col *= 1.0 - 0.28 * sill;
      col *= 1.0 - 0.2 * streak;
      float ac = step(0.72, paneH) * step(0.5, hash11(seed * 1.7)) * rowOn * vis;
      float acBox = fpulse(bu, 0.4, 0.6, pwu) * fpulse(fl, 0.09, 0.22, pwv) * ac;
      col = mix(col, vec3(0.55, 0.56, 0.55) * (0.8 + 0.4 * step(0.5, fract(fy * 40.0))), acBox);
      glass *= 1.0 - acBox;
      rough = mix(0.85, paneRough, glass);
      emis = litCol * lit * glass * 1.7 * (1.0 - 0.6 * blind);
      if (style == 7.0) {
        // slab edge each floor with a balcony rail above it
        float slab = fpulse(fl, 0.0, 0.1, pwv);
        float rail = fpulse(fl, 0.1, 0.2, pwv) * (0.35 + 0.65 * fpulse(bu * 10.0, 0.0, 0.14, pwu * 10.0)) * gx;
        col = mix(col, vec3(0.9, 0.9, 0.88), slab);
        col = mix(col, vec3(0.35, 0.36, 0.38), rail * 0.8);
        rough = mix(rough, 0.8, slab);
        glass *= 1.0 - slab;
      }
    } else if (style == 2.0) {
      // balcony bands: a light slab edge, railing posts and a glass balustrade, the recessed sliding door behind
      float slab = fpulse(fl, 0.0, 0.14, pwv);
      float railBand = fpulse(fl, 0.14, 0.42, pwv) * gx;
      float posts = fpulse(bu * 8.0, 0.0, 0.1, pwu * 8.0);
      float topRail = fpulse(fl, 0.39, 0.42, pwv) * gx;
      col = mix(wall * 0.92, vec3(0.94, 0.93, 0.9), slab);
      col = mix(col, paneDiff * 0.8, glass);
      col = mix(col, glassDark * 1.6, railBand * 0.55);
      col = mix(col, vec3(0.9), railBand * max(posts, topRail) * 0.9);
      // under-slab shadow on the door head
      col *= 1.0 - 0.3 * fpulse(fl, 0.88, 1.0, pwv) * gx;
      col *= 1.0 - 0.15 * streak;
      // the door glass sits deep under the slab above: its mirrored sky is mostly the balcony soffit
      coat *= 0.8;
      rough = mix(0.8, paneRough, glass);
      emis = litCol * lit * glass * 1.4 * (1.0 - 0.6 * blind);
    } else if (style == 3.0) {
      // art deco: pastel stucco, horizontal band each floor, vertical fins, small windows, accent every 4 floors
      float fin = fpulse(bu, 0.0, 0.08, pwu);
      float band = fpulse(fl, 0.0, 0.09, pwv);
      vec3 bandCol = mix(vec3(0.96, 0.95, 0.9), wall * 0.78, step(0.5, variant));
      col = wall * (0.97 + 0.06 * vnoise(vWorldPosF.xz * 2.5 + v * 2.0));
      col = mix(col, wall * 1.1, fin);
      col = mix(col, paneDiff, glass);
      col = mix(col, bandCol, band);
      col = mix(col, vec3(0.96, 0.95, 0.9), step(fract(floorIdx / 4.0), 0.05) * fpulse(fl, 0.0, 0.16, pwv));
      col *= 1.0 - 0.25 * sill;
      col *= 1.0 - 0.15 * streak;
      rough = mix(0.85, paneRough, glass);
      emis = litCol * lit * glass * 1.6 * (1.0 - 0.6 * blind);
    } else if (style == 4.0) {
      // industrial: corrugated metal, panel seams, sparse high windows, roll-up doors at ground
      float corrVis = 1.0 - smoothstep(0.25, 0.8, wu * 1.2);
      float corr = 0.5 + 0.5 * sin(u * 6.28 * 1.2);
      col = wall * (0.9 + 0.1 * corr * corrVis);
      col *= 1.0 - 0.12 * fpulse(v / 3.0, 0.0, 0.03, fwidth(v) / 3.0);
      float win = fpulse(bu, 0.3, 0.7, pwu) * fpulse(fl, 0.55, 0.8, pwv) * step(0.5, hash12(vec2(colIdx, facadeSeed))) * rowOn;
      float door = fpulse(fl, 0.0, 0.45, pwv) * fpulse(bu, 0.15, 0.85, pwu) * step(floorIdx, 0.5) * step(0.6, hash12(vec2(colIdx + 3.0, facadeSeed)));
      col = mix(col, vec3(0.5, 0.6, 0.65), win * 0.8);
      col = mix(col, wall * 0.55 * (0.9 + 0.2 * fpulse(v / 0.4, 0.0, 0.5, fwidth(v) / 0.4) * corrVis), door);
      col *= 1.0 - 0.25 * smoothstep(0.5, 0.8, grime) * (1.0 - smoothstep(0.0, 4.0, v));
      // rust runs under the roof edge
      col = mix(col, vec3(0.42, 0.24, 0.14), 0.35 * smoothstep(0.55, 0.85, streakN) * smoothstep(H - 2.5, H - 0.3, v) * step(0.5, hash11(seed * 2.3)));
      rough = 0.55; metal = 0.35;
      emis = vec3(0.9, 0.85, 0.7) * win * lit * 0.8;
    } else if (style == 5.0) {
      // houses: stucco, windows with white trim, a door
      float here = step(0.35, hash12(vec2(colIdx, facadeSeed)));
      glass *= here;
      float trim = (fpulse(bu, 0.25, 0.75, pwu) * fpulse(fl, 0.25, 0.8, pwv) - gx * gy) * here * rowOn;
      col = wall * (0.95 + 0.1 * vnoise(vWorldPosF.xz * 2.0 + v));
      col = mix(col, vec3(0.95), clamp(trim, 0.0, 1.0) * 0.7);
      col = mix(col, paneDiff, glass);
      col *= 1.0 - 0.1 * sill * here;
      rough = mix(0.85, paneRough, glass);
      emis = litCol * lit * glass * 1.3 * (1.0 - 0.6 * blind);
    } else if (style == 6.0) {
      // plain concrete (parking / utility / podiums): precast panels with joints, slab edges and open deck slots
      col = wall * (0.9 + 0.2 * vnoise(vWorldPosF.xz * 0.5 + v * 0.3));
      float joint = max(fpulse(u / 3.6, 0.0, 0.012, wu / 3.6), fpulse(fl, 0.0, 0.02, pwv));
      col *= 1.0 - 0.25 * joint;
      float slot = fpulse(fl, 0.55, 0.9, pwv) * rowOn * step(8.0, H);
      col = mix(col, col * 0.35, slot * 0.85);
      col *= 1.0 - 0.15 * smoothstep(0.5, 0.8, grime);
      rough = 0.85;
    } else if (style == 8.0) {
      // ribbon glass: continuous glazing bands between pale spandrels, a mullion every bay
      float mull = fpulse(bu, 0.0, 0.03, pwu);
      float band = gy * rowOn;
      glass = band * (1.0 - mull);
      coat = mix(coat, vec3(0.14, 0.24, 0.24) * paneRefl * grain, 0.4);   // green-tinted ribbon glass
      col = mix(wall, paneDiff, glass);
      col = mix(col, vec3(0.35), mull * band);
      col = mix(col, wall * 0.85, fpulse(fl, 0.0, 0.025, pwv));
      rough = mix(0.6, paneRough, glass);
      emis = litCol * lit * glass * mix(1.3, 1.9, clear) * (1.0 - 0.6 * blind);
    } else if (style == 9.0) {
      // dark stone piers with bronze vertical strip windows and a spandrel panel per floor
      float hs = 0.2 + 0.08 * variant;
      float strip = fpulse(bu, 0.5 - hs, 0.5 + hs, pwu) * fstep(0.1, v, wv);
      float spandrel = fpulse(fl, 0.0, 0.16, pwv);
      vec3 stone = wall * (0.92 + 0.16 * vnoise(vWorldPosF.xz * 0.9 + v * 0.7));
      stone *= 1.0 - 0.12 * fpulse(fl, 0.0, 0.02, pwv);
      vec3 bronze = vec3(0.13, 0.10, 0.075);
      glass = strip * (1.0 - spandrel);
      coat = glassCoat(0.5) * paneRefl * (0.85 + 0.3 * variant) * grain;   // bronze glass in the strips
      paneDiff = seen * reveal * 0.6;
      col = mix(stone, bronze, strip);
      col = mix(col, paneDiff, glass);
      rough = mix(0.55, paneRough, glass);
      metal = strip * spandrel * 0.4;
      emis = litCol * lit * glass * 1.3 * (1.0 - 0.6 * blind);
    } else if (style == 10.0) {
      // brick mid-rise: running bond, punched windows with stone lintels and sills, AC units
      float row = floor(v / 0.075);
      float brickVis = 1.0 - smoothstep(0.35, 1.2, fwidth(v) / 0.075);
      float brick = hash12(vec2(floor(u / 0.24 + 0.5 * mod(row, 2.0)), row));
      float mortar = max(fpulse(v / 0.075, 0.0, 0.14, fwidth(v) / 0.075), fpulse(u / 0.24 + 0.5 * mod(row, 2.0), 0.0, 0.05, wu / 0.24)) * brickVis;
      vec3 bcol = wall * (0.86 + 0.28 * mix(0.5, brick, brickVis));
      bcol = mix(bcol, wall * 1.05, mortar * 0.5);
      float lintel = gx * fpulse(fl, y1, y1 + 0.08, pwv) * rowOn;
      col = mix(bcol, paneDiff, glass);
      col = mix(col, vec3(0.8, 0.78, 0.72), max(lintel, sill));
      col *= 1.0 - 0.18 * streak;
      float ac = step(0.7, paneH) * step(0.4, hash11(seed * 1.7)) * rowOn * vis;
      float acBox = fpulse(bu, 0.41, 0.59, pwu) * fpulse(fl, 0.1, 0.22, pwv) * ac;
      col = mix(col, vec3(0.55, 0.56, 0.55) * (0.8 + 0.4 * step(0.5, fract(fy * 40.0))), acBox);
      glass *= 1.0 - acBox;
      rough = mix(0.9, paneRough, glass);
      emis = litCol * lit * glass * 1.5 * (1.0 - 0.6 * blind);
    } else if (style == 11.0) {
      // white egg-crate frame with deeply recessed glass: the frame's shadow falls across the head and one jamb
      float recess = 0.45 * smoothstep(0.55, 0.95, py) + 0.18 * smoothstep(0.7, 0.95, px);
      paneDiff *= 1.0 - recess * vis;
      coat *= 1.0 - 0.5 * recess * vis;
      col = mix(wall * (0.97 + 0.06 * vnoise(vWorldPosF.xz * 2.0 + v)), paneDiff, glass);
      rough = mix(0.8, paneRough, glass);
      emis = litCol * lit * glass * 1.4 * (1.0 - 0.6 * blind);
    } else if (style < 12.5) {
      // pool sides: pale tile
      col = vec3(0.85, 0.9, 0.9);
      rough = 0.4;
    } else if (style == 14.0) {
      // glass balustrade panels between slim posts (the trim layer's balcony rails): clear glass with the balcony
      // and its wall showing through
      float post = fpulse(u / 1.5, 0.0, 0.05, wu / 1.5);
      glass = 1.0 - post;
      coat = glassCoat(0.9) * 1.1;
      paneDiff = mix(wall, vec3(0.5, 0.62, 0.7), 0.5) * 0.55;
      col = mix(paneDiff, vec3(0.75), post);
      rough = mix(0.08, 0.4, post);
    } else {
      col = wall;
      rough = 0.8;
    }
    if (!mast && glass > 0.0) {
      // the lower floors mirror the neighbouring blocks rather than open sky: the reflection darkens in soft
      // vertical bands (the neighbours' silhouettes) that fade out with height (applied to the mirrored sky in
      // lights_fragment_maps)
      float nb = smoothstep(0.35, 0.75, vnoise(vec2(u * 0.045 + seed, floor(facadeSeed))));
      facadeOccl = 0.75 * nb * (1.0 - smoothstep(8.0, 70.0, v));
      facadeF0 = coat;
      facadeDiff = paneDiff;
    }
    facadeGlass = glass;
    facadeHf = clamp(v / H, 0.0, 1.0);
    // through a lit room the pane glows unevenly: bright where the ceiling panels are, dimmer on the walls
    emis *= mix(1.0, 0.55 + 1.1 * roomPanel, par * glass);
    if (!mast) {
      // street level: shopfront glazing between piers with a fascia sign band on the walk-up families, a darker
      // plinth elsewhere; lit at night regardless of the floors above
      bool street = (style == 1.0 || style == 2.0 || style == 3.0 || style == 7.0 || style == 10.0 || style == 11.0) && H > 7.0 && hash11(seed * 4.4 + 0.9) < 0.7;
      if (street && floorIdx < 0.5) {
        float sx = fpulse(bu, 0.07, 0.93, pwu);
        float shop = sx * fpulse(fl, 0.05, 0.74, pwv);
        float fascia = sx * fpulse(fl, 0.77, 0.94, pwv);
        vec3 fasciaCol = fasciaPalette(hash12(vec2(floor(colIdx * 0.5), seed)));
        vec3 shopIn = vec3(0.10, 0.09, 0.08) + vec3(0.3, 0.27, 0.22) * smoothstep(0.5, 0.74, fy) * vis;
        float awning = sx * fpulse(fl, 0.66, 0.76, pwv) * step(0.5, hash12(vec2(floor(colIdx * 0.5), seed + 1.0)));
        awning *= 0.6 + 0.4 * fpulse(bu * 6.0, 0.0, 0.5, pwu * 6.0);   // striped valance
        col = mix(wall * 0.9, shopIn, shop);
        col = mix(col, fasciaCol, fascia);
        col = mix(col, mix(fasciaCol, vec3(0.9), 0.35) * 0.8, awning);
        shop *= 1.0 - awning;
        rough = mix(0.8, 0.1, shop);
        metal = 0.0;
        // shopfront glass: clear, mirroring the street opposite rather than the sky
        facadeGlass = shop;
        facadeF0 = glassCoat(0.9);
        facadeDiff = shopIn;
        facadeOccl = 0.8;
        emis = vec3(1.0, 0.88, 0.7) * shop * 1.5 * nightOn + fasciaCol * fascia * 1.2 * nightOn;
      } else if (!isTrim) {
        col = mix(col, col * 0.8, 1.0 - fstep(0.8, v, wv));
      }
      // weathering: grime near the ground, rain staining under the parapet
      if (!isTrim) {
        col *= 1.0 - 0.18 * smoothstep(0.55, 0.85, grime) * (1.0 - smoothstep(2.0, 12.0, v));
        col *= 1.0 - 0.12 * smoothstep(0.45, 0.8, grime) * smoothstep(H - 3.0, H - 0.5, v) * step(12.0, H);
      }
      // crown lighting on about two thirds of the tall towers at night: a lit band just below the roof line, warm,
      // cool or (rarely) magenta, brighter than the windows so the skyline keeps its hierarchy after dark
      if (H > 110.0 && !isTrim && hash11(seed * 1.9 + 3.1) < 0.66) {
        float crown = smoothstep(H - 7.0, H - 5.0, v) * (1.0 - smoothstep(H - 1.0, H, v));
        float pick = hash11(seed * 2.7);
        vec3 crownCol = pick < 0.5 ? vec3(1.0, 0.85, 0.6) : pick < 0.88 ? vec3(0.4, 0.8, 1.0) : vec3(1.0, 0.35, 0.7);
        emis += crownCol * crown * 8.0 * uNight;
      }
      // red obstruction lights at the top corners of the tallest towers
      if (H > 140.0 && !isTrim) {
        float dc = min(length(vec2(u - 0.6, v - (H - 0.9))), length(vec2(u - (faceW - 0.6), v - (H - 0.9))));
        emis += vec3(1.0, 0.08, 0.04) * (1.0 - fstep(0.45, dc, wu)) * 6.0 * uNight;
      }
    }
  }
  diffuseColor.rgb = col;
  roughnessFactor = rough;
  metalnessFactor = metal;
  totalEmissiveRadiance += emis;
}`);
  };
  mat.customProgramCacheKey = () => 'facade-v5';
  return mat;
}
