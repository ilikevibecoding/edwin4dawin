// Shader for entities (NPCs, animals, items, hand, train): textured, Minecraft-style directional
// entity shading, lit by sampled world light, with the same fog as the terrain.
// With the render pipeline on (FANCY 1) entities also receive the directional sun/moon and its cascaded shadows
// through the shared shading chunk, and every entity material is flagged as a shadow caster.
import * as THREE from 'three';
import { SHADING_PARS, bindShading } from './render/shading.js';

// Shared uniforms (same object instances reused by every entity material)
export const SHARED = {
  uSkyLight: { value: 1 },
  uSkyTint: { value: new THREE.Vector3(1, 1, 1) },
  uFogColor: { value: new THREE.Vector3(0.7, 0.8, 1) },
  uFogNear: { value: 80 },
  uFogFar: { value: 120 },
  uFlash: { value: 0 },
};

const VERT = /* glsl */ `
varying vec2 vUv;
varying float vShade;
varying float vDist;
#if FANCY
varying vec3 vWorldPos;
varying vec3 vNormal;
#endif
void main() {
  vUv = uv;
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vec3 l1 = normalize(vec3(0.2, 1.0, -0.7));
  vec3 l2 = normalize(vec3(-0.2, 1.0, 0.7));
  float d = max(dot(n, l1), 0.0) + max(dot(n, l2), 0.0);
  vShade = clamp(0.55 + 0.45 * d * 0.7, 0.0, 1.0);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
#if FANCY
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  vNormal = n;
#endif
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec2 uLight;
uniform float uSkyLight;
uniform vec3 uSkyTint;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uFlash;
uniform vec3 uTint;
uniform float uOpacity;
uniform float uHurt;
varying vec2 vUv;
varying float vShade;
varying float vDist;
#if FANCY
varying vec3 vWorldPos;
varying vec3 vNormal;
${SHADING_PARS}
#endif
float lightCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.4); }
float blockCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.6); }
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < 0.5) discard;
  float skyCurved = lightCurve(uLight.x);
  float sky = skyCurved * uSkyLight;
  float blk = blockCurve(uLight.y);
  vec3 blkCol = vec3(blk) * vec3(1.0, 0.9, 0.72);
#if FANCY
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamPos - vWorldPos);
  vec3 light = shadingLight(vec3(sky) * uSkyTint, blkCol, vWorldPos, N, skyCurved, vDist);
  vec3 fogC = fogColorDir(uFogColor, -V);
#else
  vec3 light = max(vec3(sky) * uSkyTint, blkCol);
  vec3 fogC = uFogColor;
#endif
  light = max(light, vec3(0.035)) + vec3(uFlash);
  vec3 col = tex.rgb * uTint * light * vShade;
  col = mix(col, vec3(1.0, 0.3, 0.3), uHurt * 0.5);
  float f = smoothstep(uFogNear, uFogFar, vDist);
  col = mix(col, fogC, f);
  gl_FragColor = vec4(col, uOpacity);
}`;

// opts.shading = false keeps the legacy shading permanently (the first-person hand lives in camera space, so the
// world-space sun and shadow maps do not apply to it).
export function makeEntityMaterial(texture, opts = {}) {
  const shaded = opts.shading !== false;
  const m = new THREE.ShaderMaterial({
    defines: { FANCY: 0 },   // flipped to 1 by the pipeline for bound (shaded) materials only
    uniforms: {
      map: { value: texture },
      uLight: { value: new THREE.Vector2(1, 0) },
      uSkyLight: SHARED.uSkyLight,
      uSkyTint: SHARED.uSkyTint,
      uFogColor: SHARED.uFogColor,
      uFogNear: SHARED.uFogNear,
      uFogFar: SHARED.uFogFar,
      uFlash: SHARED.uFlash,
      uTint: { value: new THREE.Vector3(1, 1, 1) },
      uOpacity: { value: 1 },
      uHurt: { value: 0 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: opts.side ?? THREE.FrontSide,
    transparent: !!opts.transparent,
  });
  if (shaded) { bindShading(m); m.userData.shadowCaster = true; }
  // clone must keep shared uniform references
  const origClone = m.clone.bind(m);
  m.clone = () => {
    const c = origClone();
    c.uniforms.uSkyLight = SHARED.uSkyLight;
    c.uniforms.uSkyTint = SHARED.uSkyTint;
    c.uniforms.uFogColor = SHARED.uFogColor;
    c.uniforms.uFogNear = SHARED.uFogNear;
    c.uniforms.uFogFar = SHARED.uFogFar;
    c.uniforms.uFlash = SHARED.uFlash;
    if (shaded) { bindShading(c); c.userData.shadowCaster = true; }
    c.clone = m.clone;
    return c;
  };
  return m;
}

export function canvasTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.NoColorSpace;
  t.flipY = false;
  return t;
}
