/**
 * Decal shaders.
 *
 * Two vertex programs share one fragment program:
 *
 * - `DECAL_VERTEX_INSTANCED` stamps a batched oriented quad. Every bullet hole,
 *   spatter and scorch in the level is one instance of one draw call. A per
 *   instance clip rectangle, measured against the receiving surface when the
 *   decal is placed, trims the quad where the surface runs out so it cannot
 *   hang in the air off the end of a wall.
 * - `DECAL_VERTEX_PATCH` draws a tessellated patch whose vertices were snapped
 *   onto the ground when it was built. Used for the large decals — craters,
 *   scorch fields, blood pools — where a single flat quad would visibly float
 *   over uneven ground.
 *
 * Age is driven entirely by uniforms. Each decal records the sequence number it
 * was written at; the shader compares that with the ring's current sequence and
 * fades out the oldest few, so recycling never pops.
 *
 * Colour is two-tone. The atlas red channel is a paleness mask rather than a
 * finished colour, and each decal supplies the colour of its dark part and of
 * its light part: a bullet hole is the surface's authored `decalColor` in the
 * pit and its authored `dustColor` in the pulverised rim. Multiplying one tint
 * through the whole sprite instead is what turns a crater into a black sticker,
 * because the authored hole colours are all nearly black by design.
 */

const COMMON = /* glsl */ `
uniform vec2 uAtlas;
uniform float uTime;
uniform float uSequence;
uniform vec2 uRing;        // capacity, fade count
uniform vec3 uSunDirView;
uniform vec3 uSunColor;
uniform vec3 uAmbientColor;

varying vec2 vUv;
varying vec4 vColor;       // rgb dark tone, a opacity
varying vec3 vTone;        // rgb light tone
varying vec3 vLight;
varying vec4 vClip;
varying vec2 vLocal;

vec2 atlasUv(float cell, vec2 local) {
  float count = max(uAtlas.x * uAtlas.y, 1.0);
  float ci = mod(cell, count);
  vec2 cellSize = 1.0 / uAtlas;
  vec2 origin = vec2(mod(ci, uAtlas.x), floor(ci / uAtlas.x)) * cellSize;
  return origin + clamp(local, 0.0, 1.0) * cellSize;
}

/** 1 while fresh, ramping to 0 as the ring cursor laps around to this slot. */
float ringFade(float sequence) {
  float age = uSequence - sequence;
  float hold = max(uRing.x - uRing.y, 1.0);
  return 1.0 - clamp((age - hold) / max(uRing.y, 1.0), 0.0, 1.0);
}

/** Blood drying, scorch weathering: a delayed partial fade. */
float timeFade(float spawnTime, float delay, float duration) {
  if (duration <= 0.0) return 1.0;
  float t = (uTime - spawnTime - delay) / duration;
  return mix(1.0, 0.45, clamp(t, 0.0, 1.0));
}

vec3 decalLight(vec3 normalView) {
  float ndl = dot(normalView, uSunDirView);
  float diffuse = clamp(ndl, 0.0, 1.0);
  return uAmbientColor + uSunColor * diffuse;
}
`;

export const DECAL_VERTEX_INSTANCED = /* glsl */ `
attribute vec4 aOrigin;   // xyz centre, w sequence number
attribute vec4 aRight;    // xyz tangent, w half width
attribute vec4 aUp;       // xyz bitangent, w half height
attribute vec4 aColor;    // rgb dark tint, a opacity
attribute vec4 aParams;   // atlas cell, spawn time, fade delay, fade duration
attribute vec4 aClip;     // clip extents as fractions: -u, +u, -v, +v
attribute vec4 aTone;     // rgb light tint, w unused

${COMMON}

void main() {
  vec2 local = position.xy * 2.0;
  vec3 world = aOrigin.xyz + aRight.xyz * (local.x * aRight.w) + aUp.xyz * (local.y * aUp.w);
  vec4 mv = modelViewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;

  vUv = atlasUv(aParams.x, position.xy + 0.5);
  vLocal = local;
  vClip = aClip;

  vec3 normalWorld = normalize(cross(aRight.xyz, aUp.xyz));
  vec3 normalView = normalize((viewMatrix * vec4(normalWorld, 0.0)).xyz);
  float fade = ringFade(aOrigin.w) * timeFade(aParams.y, aParams.z, aParams.w);
  vColor = vec4(aColor.rgb, aColor.a * fade);
  vTone = aTone.rgb;
  vLight = decalLight(normalView);
}
`;

export const DECAL_VERTEX_PATCH = /* glsl */ `
uniform vec4 aOriginU;
uniform vec4 aColorU;
uniform vec4 aParamsU;
uniform vec4 aToneU;

${COMMON}

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;

  vUv = atlasUv(aParamsU.x, uv);
  vLocal = uv * 2.0 - 1.0;
  vClip = vec4(-1.0, 1.0, -1.0, 1.0);

  vec3 normalView = normalize(normalMatrix * normal);
  float fade = ringFade(aOriginU.w) * timeFade(aParamsU.y, aParamsU.z, aParamsU.w);
  vColor = vec4(aColorU.rgb, aColorU.a * fade);
  vTone = aToneU.rgb;
  vLight = decalLight(normalView);
}
`;

export const DECAL_FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D uMap;

varying vec2 vUv;
varying vec4 vColor;
varying vec3 vTone;
varying vec3 vLight;
varying vec4 vClip;
varying vec2 vLocal;

void main() {
  // Trim where the receiving surface ended, with a couple of centimetres of
  // feather so the cut does not read as a straight edge.
  const float feather = 0.14;
  float clipU = min(
    smoothstep(vClip.x - feather, vClip.x + feather, vLocal.x),
    smoothstep(vClip.y + feather, vClip.y - feather, vLocal.x));
  float clipV = min(
    smoothstep(vClip.z - feather, vClip.z + feather, vLocal.y),
    smoothstep(vClip.w + feather, vClip.w - feather, vLocal.y));

  vec4 texel = texture2D(uMap, vUv);
  float alpha = texel.a * vColor.a * clipU * clipV;
  if (alpha <= 0.004) discard;
  vec3 base = mix(vColor.rgb, vTone, texel.r) * vLight;
  gl_FragColor = vec4(base * alpha, alpha);
}
`;
