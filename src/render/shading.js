// Shared shading chunk: sun/moon direction and colour, the sky gradient (used by the dome, fog, water and metal
// reflections), and cascaded shadow-map sampling. Every surface material that wants to agree on where the sun and
// its shadows fall binds SHADING_UNIFORMS (same uniform object instances, updated once per frame by the render
// pipeline) and pastes SHADING_PARS into its fragment shader.
//
// Integrator recipe for a ShaderMaterial (debris, voxel vehicles, tsunami crest, ...):
//   vertex:   `varying vec3 vWorldPos;`  ...  `vWorldPos = (modelMatrix * [instanceMatrix *] vec4(position, 1.0)).xyz;`
//   fragment: paste SHADING_PARS above main(); inside main() replace the legacy
//                 `vec3 light = max(vec3(sky) * uSkyTint, vec3(blk) * WARM);`
//             by  `vec3 light = shadingLight(sky * uSkyTint, blk * WARM, vWorldPos, N, skyVis, vDist);`
//             where N is the world-space geometric normal (unit), skyVis = lightCurve(skyLightAtVertex) in 0..1
//             (already multiplied into `sky`), and vDist the view distance. Then bindShading(material).
//   Optional: `vec3 spec = sunSpecular(vWorldPos, N, N, viewDir, roughness, metalness, albedo, skyVis, vDist);`
//   The Light preset never compiles these paths: check `material.defines.FANCY` if the material has its own cheap
//   variant, or just use uShadowCascades (0 = shadows off) / uSunColor (black = no sun) which are always valid.
import * as THREE from 'three';

// three.js layers of shadow casters: chunk meshes are drawn into every cascade, opted-in entity meshes only into
// the near one (their shadows are a few texels at 48+ blocks and they are the bulk of the draw calls).
export const SHADOW_LAYER = 1;
export const SHADOW_LAYER_NEAR = 2;

// Split of the lightmap sky light into an ambient share (uAmbientK, always present) and the directional sun term
// (SUN_STRENGTH, times the wrapped N.L and the shadow). A flat top face at noon gets AMBIENT_K + SUN_STRENGTH * ~1;
// the pair is calibrated so the noon frame's mean luminance matches the pre-rubric look (see the rubric notes).
// The pipeline moves uAmbientK toward 1 as the directional light weakens (low sun, moon, storm deck) so the sky
// light budget stays constant over the day.
export const AMBIENT_K = 0.52;
export const SUN_STRENGTH = 0.44;
export const SUN_WRAP = 0.7;       // wrapped diffuse ((N.L + w) / (1 + w)): side faces keep some sun at noon

// One instance of every uniform; materials reference these objects so a single write updates every surface.
export const SHADING_UNIFORMS = {
  uSunDir: { value: new THREE.Vector3(0, 1, 0) },        // unit vector toward the active light (sun by day, moon by night)
  uSunColor: { value: new THREE.Vector3(0.35, 0.35, 0.35) }, // light colour * strength (black when neither is up)
  uSunUp: { value: 1 },                                  // 0..1 how much of the active light is above the horizon
  uSunWrap: { value: SUN_WRAP },
  uSunDiscDir: { value: new THREE.Vector3(1, 0, 0) },    // real sun direction (sky glow, sun disc)
  uMoonDir: { value: new THREE.Vector3(-1, 0, 0) },
  uMoonPhase: { value: 0 },                              // 0..1 (0 = full)
  uSkyTop: { value: new THREE.Color(0.47, 0.65, 1.0) },
  uSkyHorizon: { value: new THREE.Color(0.75, 0.85, 1.0) },
  uSkyVoid: { value: new THREE.Color(0.28, 0.36, 0.55) },
  uSunsetColor: { value: new THREE.Color(1.0, 0.45, 0.15) },
  uSunsetStrength: { value: 0 },
  uSkyDay: { value: 1 },                                 // day factor 0..1 (star/moon visibility, Mie glow colour)
  uSkyGain: { value: 1 },                                // dayExposure / exposure: the sky keeps its authored brightness when the night exposure lifts the scene
  uCamPos: { value: new THREE.Vector3() },
  uTimeS: { value: 0 },                                  // seconds, for water waves / twinkle
  uAmbientK: { value: AMBIENT_K },
  uAmbientTint: { value: new THREE.Vector3(1, 1, 1) },   // shade colour: cool sky-lit shadows against the warm sun
  uShadowCascades: { value: 0 },                         // 0 (off), 1, 2
  uShadowMap0: { value: null },
  uShadowMap1: { value: null },
  uShadowMat0: { value: new THREE.Matrix4() },
  uShadowMat1: { value: new THREE.Matrix4() },
  // per cascade: x = texel size (uv), y = radius (blocks), z = depth range (blocks), w = normal offset (blocks)
  uShadowParams0: { value: new THREE.Vector4(1 / 2048, 48, 700, 0.05) },
  uShadowParams1: { value: new THREE.Vector4(1 / 2048, 160, 900, 0.16) },
};

const dummyShadow = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, THREE.RGBAFormat);
dummyShadow.needsUpdate = true;
SHADING_UNIFORMS.uShadowMap0.value = dummyShadow;
SHADING_UNIFORMS.uShadowMap1.value = dummyShadow;

// Sky gradient shared by the dome, the fog and reflections. `d` is a unit direction.
export const SKY_GLSL = /* glsl */ `
uniform vec3 uSkyTop; uniform vec3 uSkyHorizon; uniform vec3 uSkyVoid; uniform vec3 uSunsetColor;
uniform float uSunsetStrength; uniform vec3 uSunDiscDir; uniform float uSkyDay; uniform float uSkyGain;
vec3 skyGradient(vec3 d) {
  // Rayleigh-ish: the zenith stays saturated, the horizon whitens quickly (optical depth grows as 1/sin(elev))
  float up = clamp(d.y, 0.0, 1.0);
  float t = 1.0 - exp(-up * 3.2);
  vec3 col = mix(uSkyHorizon, uSkyTop, t);
  col = mix(col, uSkyVoid, smoothstep(0.0, -0.08, d.y));
  // Mie forward scattering: a soft warm glow hugging the horizon around the sun's azimuth (dawn/dusk), plus a
  // faint bright halo around the sun itself during the day
  vec3 sh = normalize(vec3(uSunDiscDir.x, 0.0, uSunDiscDir.z + 0.0001));
  float az = max(dot(normalize(vec3(d.x, 0.0, d.z + 0.0001)), sh), 0.0);
  float band = exp(-abs(d.y) * 7.0);
  col = mix(col, uSunsetColor, uSunsetStrength * band * (0.35 + 0.65 * pow(az, 3.0)));
  float cosSun = max(dot(d, uSunDiscDir), 0.0);
  float halo = pow(cosSun, 12.0) * 0.16 * uSkyDay * step(-0.02, uSunDiscDir.y);
  col += halo * mix(vec3(1.0, 0.8, 0.6), vec3(1.0), uSkyDay * (1.0 - uSunsetStrength));
  return col * uSkyGain;
}`;

// Fragment-shader chunk: sun term, shadows, specular, fog colour. Requires SKY_GLSL uniforms (included).
export const SHADING_PARS = /* glsl */ `
${SKY_GLSL}
uniform vec3 uSunDir; uniform vec3 uSunColor; uniform float uSunUp; uniform float uSunWrap; uniform vec3 uCamPos;
uniform float uAmbientK; uniform vec3 uAmbientTint; uniform float uShadowCascades;
uniform sampler2D uShadowMap0; uniform sampler2D uShadowMap1;
uniform mat4 uShadowMat0; uniform mat4 uShadowMat1;
uniform vec4 uShadowParams0; uniform vec4 uShadowParams1;

// 3x3 PCF of one cascade. gN: geometric normal (for the normal offset), slope: tan(theta) of the sun angle.
float cascadeShadow(sampler2D map, mat4 M, vec4 P, vec3 wp, vec3 gN, float slope) {
  vec3 wpo = wp + gN * (P.w * (0.5 + 0.5 * min(slope, 2.0)));
  vec3 sc = (M * vec4(wpo, 1.0)).xyz;
  if (sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0) return 1.0;
  float z = sc.z - (0.05 + 0.06 * slope) / P.z;   // slope-scaled bias (blocks -> depth units)
  float sum = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
    float d = texture2D(map, sc.xy + vec2(float(i), float(j)) * P.x).r;
    sum += step(z, d);
  }
  return sum / 9.0;
}

// 1 = fully lit, 0 = fully shadowed. dist: distance from the camera (blocks) selects/blends the cascades.
float sunShadow(vec3 wp, vec3 gN, float dist) {
  if (uShadowCascades < 0.5) return 1.0;
  float ndl = dot(gN, uSunDir);
  if (ndl < 0.01) return 1.0;
  float slope = clamp(sqrt(max(1.0 - ndl * ndl, 0.0)) / max(ndl, 0.05), 0.0, 4.0);
  float r0 = uShadowParams0.y;
  if (uShadowCascades > 1.5) {
    float r1 = uShadowParams1.y;
    float w0 = 1.0 - smoothstep(r0 * 0.80, r0 * 0.96, dist);
    float fade = 1.0 - smoothstep(r1 * 0.78, r1 * 0.96, dist);
    float s0 = 1.0, s1 = 1.0;
    if (w0 > 0.001) s0 = cascadeShadow(uShadowMap0, uShadowMat0, uShadowParams0, wp, gN, slope);
    if (w0 < 0.999 && fade > 0.001) s1 = cascadeShadow(uShadowMap1, uShadowMat1, uShadowParams1, wp, gN, slope);
    return mix(mix(1.0, s1, fade), s0, w0);
  }
  float fade = 1.0 - smoothstep(r0 * 0.78, r0 * 0.96, dist);
  if (fade < 0.001) return 1.0;
  return mix(1.0, cascadeShadow(uShadowMap0, uShadowMat0, uShadowParams0, wp, gN, slope), fade);
}

// Direct sun/moon light arriving at a surface: wrapped N.L * sky visibility * shadow * sun colour.
// skyVis is the (curved) sky light at the vertex so interiors and caves get no sun regardless of the shadow map.
vec3 sunLight(vec3 wp, vec3 N, vec3 gN, float skyVis, float dist) {
  float ndl = clamp((dot(N, uSunDir) + uSunWrap) / (1.0 + uSunWrap), 0.0, 1.0);
  float k = ndl * skyVis * uSunUp;
  if (k <= 0.0005) return vec3(0.0);
  return uSunColor * (k * sunShadow(wp, gN, dist));
}

// Total light for the lightmap model: ambient share of the sky light + direct sun, against the warm block light.
// skyAmb = curved sky light * uSkyLight * uSkyTint (the legacy sky term), blk = curved block light * warm tint.
vec3 shadingLight(vec3 skyAmb, vec3 blk, vec3 wp, vec3 N, float skyVis, float dist) {
  vec3 sun = sunLight(wp, N, N, skyVis, dist);
  return max(skyAmb * (uAmbientK * uAmbientTint) + sun, blk);
}

// GGX-lite specular from the sun with Schlick Fresnel; returns HDR radiance (clamped so bloom stays sane).
vec3 sunSpecular(vec3 wp, vec3 N, vec3 gN, vec3 V, float rough, float metal, vec3 albedo, float skyVis, float dist) {
  float ndl = max(dot(N, uSunDir), 0.0);
  float k = ndl * skyVis * uSunUp;
  if (k <= 0.0005) return vec3(0.0);
  vec3 H = normalize(uSunDir + V);
  float ndh = max(dot(N, H), 0.0);
  float vdh = max(dot(V, H), 0.0);
  float r = max(rough, 0.16);          // the sun disc has an angular size: never a perfect mirror peak
  float a2 = r * r; a2 *= a2;
  float dn = ndh * ndh * (a2 - 1.0) + 1.0;
  float D = a2 / (3.14159 * dn * dn);
  vec3 F0 = mix(vec3(0.04), albedo, metal);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - vdh, 5.0);
  vec3 spec = D * F * 0.25 * uSunColor * (k * sunShadow(wp, gN, dist)) * 2.4;
  return min(spec, vec3(3.0));
}

// Fog colour for a view direction: the horizon colour of the sky in that azimuth (so fog warms toward the sun at
// dawn/dusk) scaled to whatever the game set as the base fog colour (disaster overrides, underwater).
vec3 fogColorDir(vec3 fogBase, vec3 viewDir) {
  vec3 hd = normalize(vec3(viewDir.x, 0.0, viewDir.z) + vec3(0.0001, 0.0, 0.0002));
  vec3 g = skyGradient(hd);
  // the gradient away from the sun's azimuth (band factor 0.35) is the reference the base fog colour stands for
  vec3 ref = mix(uSkyHorizon, uSunsetColor, 0.35 * uSunsetStrength);
  vec3 ratio = clamp(g / max(ref, vec3(0.002)), vec3(0.7), vec3(2.0));
  return fogBase * ratio;
}`;

const BOUND = new Set();

// Shares the shading uniforms with a ShaderMaterial (call once after creating it; clones must call it again).
export function bindShading(material) {
  for (const k of Object.keys(SHADING_UNIFORMS)) material.uniforms[k] = SHADING_UNIFORMS[k];
  if (!BOUND.has(material)) {
    BOUND.add(material);
    material.addEventListener('dispose', () => BOUND.delete(material));
  }
  return material;
}

// Flips compile-time switches on every bound material that declares them (FANCY: per-pixel sun/shadow/specular
// path; MATERIAL_MAPS: normal + material atlas sampling). Materials without the define are left alone.
export function setShadingDefines(defs) {
  for (const m of BOUND) {
    if (!m.defines) continue;
    let changed = false;
    for (const [k, v] of Object.entries(defs)) {
      if (k in m.defines && m.defines[k] !== v) { m.defines[k] = v; changed = true; }
    }
    if (changed) m.needsUpdate = true;
  }
}

export function boundMaterials() { return BOUND; }
