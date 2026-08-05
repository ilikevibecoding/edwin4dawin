// Shared material library plus the custom aerial-perspective fog that every
// opaque material in the scene uses. Height-dependent extinction with a cheap
// forward-scattering term is what sells the 20 km sight lines.

import * as THREE from 'three';
import {
  concreteMaps,
  sandMaps,
  asphaltMaps,
  paintedMetalMaps,
  brushedMetalMaps,
  heatDiscolorMap,
  treadTexture,
} from './textures.js';

export const atmosphere = {
  uAtmColor: { value: new THREE.Color(0xa9bcd2) },
  uAtmDensity: { value: 1.5e-5 },
  uAtmHeight: { value: 1400 },
  uAtmSunDir: { value: new THREE.Vector3(0.4, 0.6, 0.6) },
  uAtmSunColor: { value: new THREE.Color(0xffe6c4) },
  uAtmHaze: { value: 0.9 },
  uAtmGroundY: { value: 0 },
  uAtmExposureLift: { value: 0.0 },
};

const FOG_PARS_VERTEX = /* glsl */ `
varying float vFogDepth;
varying vec3 vAtmWorldPos;
`;

const FOG_VERTEX = /* glsl */ `
vFogDepth = - mvPosition.z;
{
  mat3 vm = mat3( viewMatrix );
  vAtmWorldPos = cameraPosition + vec3( dot( vm[0], mvPosition.xyz ), dot( vm[1], mvPosition.xyz ), dot( vm[2], mvPosition.xyz ) );
}
`;

const FOG_PARS_FRAGMENT = /* glsl */ `
varying float vFogDepth;
varying vec3 vAtmWorldPos;
uniform vec3 uAtmColor;
uniform float uAtmDensity;
uniform float uAtmHeight;
uniform vec3 uAtmSunDir;
uniform vec3 uAtmSunColor;
uniform float uAtmHaze;
uniform float uAtmGroundY;
`;

const FOG_FRAGMENT = /* glsl */ `
{
  float hC = cameraPosition.y - uAtmGroundY;
  float hP = vAtmWorldPos.y - uAtmGroundY;
  float dh = hP - hC;
  float dist = max( vFogDepth, 0.0 );
  float dC = uAtmDensity * exp( -max( hC, 0.0 ) / uAtmHeight );
  float tau;
  if ( abs( dh ) < 1.0 ) {
    tau = dC * dist;
  } else {
    float k = -dh / uAtmHeight;
    tau = dC * dist * ( 1.0 - exp( k ) ) / ( -k );
  }
  tau *= mix( 1.0, uAtmHaze, clamp( 1.0 - max( hC, 0.0 ) / 900.0, 0.0, 1.0 ) );
  float trans = exp( -tau );
  vec3 viewDir = normalize( vAtmWorldPos - cameraPosition );
  float mu = max( dot( viewDir, uAtmSunDir ), 0.0 );
  vec3 inscatter = uAtmColor + uAtmSunColor * ( pow( mu, 8.0 ) * 0.55 + pow( mu, 2.0 ) * 0.1 );
  gl_FragColor.rgb = mix( inscatter, gl_FragColor.rgb, clamp( trans, 0.0, 1.0 ) );
}
`;

/** Inject the atmosphere model into any built-in three material. */
export function applyAtmosphere(material) {
  if (material.userData.__atm) return material;
  material.userData.__atm = true;
  material.fog = true;
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    if (prev) prev(shader, renderer);
    Object.assign(shader.uniforms, atmosphere);
    shader.vertexShader = shader.vertexShader
      .replace('#include <fog_pars_vertex>', FOG_PARS_VERTEX)
      .replace('#include <fog_vertex>', FOG_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <fog_pars_fragment>', FOG_PARS_FRAGMENT)
      .replace('#include <fog_fragment>', FOG_FRAGMENT);
  };
  const key = material.customProgramCacheKey;
  material.customProgramCacheKey = () => `atm|${key ? key.call(material) : material.type}`;
  return material;
}

export function std(opts = {}) {
  const m = new THREE.MeshStandardMaterial({ ...opts });
  return applyAtmosphere(m);
}

export function phys(opts = {}) {
  const m = new THREE.MeshPhysicalMaterial({ ...opts });
  return applyAtmosphere(m);
}

/** Self-lit surface (status lamps, screens) that still receives fog. */
export function lamp(color, intensity = 2.2, opts = {}) {
  return applyAtmosphere(
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      emissive: new THREE.Color(color),
      emissiveIntensity: intensity,
      roughness: 0.42,
      metalness: 0,
      ...opts,
    })
  );
}

/** Repeat helper that clones the cached maps so UV tiling can differ per use. */
function repeated(maps, rx, ry) {
  const out = {};
  for (const [k, v] of Object.entries(maps)) {
    const t = v.clone();
    t.needsUpdate = true;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    out[k] = t;
  }
  return out;
}

let lib = null;

export function materials() {
  if (lib) return lib;
  const cm = concreteMaps(512);
  const sm = sandMaps(512);
  const am = asphaltMaps(512);
  const tread = treadTexture(256);

  // Tiling here is in "texture repeats per UV unit"; geometry supplies UVs in
  // metres/N so a repeat of 1 keeps the intended physical texel size.
  lib = {
    concrete: std({ ...repeated(cm, 1, 1), color: 0x8c877d, roughness: 0.93, metalness: 0.02, normalScale: new THREE.Vector2(0.5, 0.5) }),
    concretePad: std({ ...repeated(cm, 1, 1), color: 0x847f77, roughness: 0.95, metalness: 0.02, normalScale: new THREE.Vector2(0.35, 0.35) }),
    concreteWall: std({ ...repeated(cm, 0.34, 0.34), color: 0x8a857b, roughness: 0.9, metalness: 0.02, normalScale: new THREE.Vector2(0.6, 0.6) }),
    sand: std({ ...repeated(sm, 1, 1), color: 0x9a7c54, roughness: 1.0, metalness: 0, normalScale: new THREE.Vector2(0.7, 0.7) }),
    asphalt: std({ ...repeated(am, 1, 1), color: 0x4a4744, roughness: 0.84, metalness: 0.04, normalScale: new THREE.Vector2(0.6, 0.6) }),
    gravel: std({ ...repeated(sm, 1, 1), color: 0x726a5e, roughness: 1.0, metalness: 0.02, normalScale: new THREE.Vector2(0.9, 0.9) }),

    oliveMetal: std({ ...repeated(paintedMetalMaps(512, '#4c5445', { camo: false }), 0.5, 0.5), color: 0x707a62, roughness: 0.68, metalness: 0.34 }),
    sandMetal: std({ ...repeated(paintedMetalMaps(512, '#7c6b4f', { rust: 0.35 }), 0.5, 0.5), color: 0x998767, roughness: 0.64, metalness: 0.3 }),
    darkMetal: std({ ...repeated(paintedMetalMaps(512, '#333634', { rust: 0.7, streaks: 30 }), 0.5, 0.5), color: 0x5c6060, roughness: 0.6, metalness: 0.55 }),
    steel: std({ ...repeated(brushedMetalMaps(512, '#7d8288'), 1, 1), color: 0x9aa0a6, roughness: 0.44, metalness: 0.9 }),
    galv: std({ ...repeated(brushedMetalMaps(512, '#969ca2'), 1, 1), color: 0xa6acb2, roughness: 0.54, metalness: 0.8 }),
    rubber: std({ map: tread.map, normalMap: tread.normalMap, color: 0x222224, roughness: 0.94, metalness: 0.02 }),
    tarp: std({ ...repeated(paintedMetalMaps(512, '#434838', { scratches: 8, streaks: 6 }), 0.5, 0.5), color: 0x5f6553, roughness: 0.9, metalness: 0.0 }),
    plastic: std({ color: 0x24272a, roughness: 0.5, metalness: 0.05 }),
    heatMetal: std({ map: heatDiscolorMap(256), color: 0xd8d8d8, roughness: 0.46, metalness: 0.85 }),
    soot: std({ color: 0x171614, roughness: 0.97, metalness: 0.05 }),
    copper: std({ color: 0xa06428, roughness: 0.35, metalness: 0.95 }),
    glass: phys({
      color: 0x1a2630,
      roughness: 0.08,
      metalness: 0,
      transparent: true,
      opacity: 0.42,
      transmission: 0.0,
      envMapIntensity: 1.4,
      side: THREE.DoubleSide,
    }),
    interceptorSkin: std({ ...brushedMetalMaps(512, '#b9bcc0'), color: 0xd2d5d8, roughness: 0.38, metalness: 0.58 }),
    threatSkin: std({ ...paintedMetalMaps(512, '#54575a', { rust: 0.2, scratches: 14 }), color: 0x74777a, roughness: 0.52, metalness: 0.6 }),
  };
  return lib;
}

export function updateAtmosphere(tod, sunDir) {
  atmosphere.uAtmColor.value.setHex(tod.fogColor);
  atmosphere.uAtmDensity.value = tod.fogDensity;
  atmosphere.uAtmSunColor.value.setHex(tod.sunColor).multiplyScalar(tod.sunElev > 0 ? 1 : 0.25);
  atmosphere.uAtmHaze.value = tod.hazeStrength;
  if (sunDir) atmosphere.uAtmSunDir.value.copy(sunDir);
}

export function disposeMaterials() {
  if (!lib) return;
  for (const m of Object.values(lib)) m.dispose();
  lib = null;
}
