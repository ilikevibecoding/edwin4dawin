import * as THREE from 'three';
import * as T from './util/textures.js';
import { settings } from './settings.js';

/**
 * Shared material library.
 *
 * Materials are cached by key so the whole base - three launchers, shelter,
 * radar, trucks, fencing - reuses a small set of GPU programs and textures.
 */

const cache = new Map();

function make(key, build) {
  if (!cache.has(key)) {
    const m = build();
    m.name = key;
    cache.set(key, m);
  }
  return cache.get(key);
}

function tune(tex, repeat = 1) {
  if (!tex) return tex;
  const t = tex.clone();
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = settings.quality.anisotropy;
  return t;
}

/** Painted, weathered steel - the workhorse material for hardware. */
export function painted(color = '#6f7365', { repeat = 2, rough = 0.72, metal = 0.35, seam = '#3a3d36', panels = 4 } = {}) {
  return make(`painted|${color}|${repeat}|${rough}|${metal}|${seam}|${panels}`, () => {
    const map = tune(T.metalPanel({ base: color, seam, panels, key: 'metal' }), repeat);
    return new THREE.MeshStandardMaterial({
      map,
      color: 0xffffff,
      roughness: rough,
      metalness: metal,
      roughnessMap: tune(T.dataNoise({ r: rough, spread: 0.22 }), repeat),
      normalMap: null
    });
  });
}

/** Flat structural metal without panel lines (frames, brackets, bolts). */
export function metal(color = '#585c54', rough = 0.55, metalness = 0.85) {
  return make(`metal|${color}|${rough}|${metalness}`, () =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness })
  );
}

export function darkMetal() {
  return metal('#31342f', 0.62, 0.8);
}

export function chrome() {
  return make('chrome', () =>
    new THREE.MeshStandardMaterial({ color: '#c9ced4', roughness: 0.16, metalness: 1.0 })
  );
}

/** Desert camouflage for vehicle bodies and canisters. */
export function camoMat(variant = 'desert', repeat = 1.4) {
  const palettes = {
    desert: ['#8b8067', '#6b6553', '#a89a78'],
    olive: ['#4f5843', '#3b4133', '#68705a'],
    grey: ['#71736c', '#54564f', '#8b8d85']
  };
  return make(`camo|${variant}|${repeat}`, () => {
    const map = tune(T.camo({ colors: palettes[variant] || palettes.desert, key: `camo-${variant}` }), repeat);
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.86,
      metalness: 0.12,
      roughnessMap: tune(T.dataNoise({ r: 0.86, spread: 0.14 }), repeat)
    });
  });
}

export function concreteMat(repeat = 6) {
  return make(`concrete|${repeat}`, () => {
    const map = tune(T.concrete({}), repeat);
    return new THREE.MeshStandardMaterial({
      map,
      roughness: 0.94,
      metalness: 0.0,
      roughnessMap: tune(T.dataNoise({ r: 0.94, spread: 0.08 }), repeat)
    });
  });
}

export function gravelMat(repeat = 10) {
  return make(`gravel|${repeat}`, () => {
    const map = tune(T.gravel({}), repeat);
    return new THREE.MeshStandardMaterial({ map, roughness: 0.98, metalness: 0 });
  });
}

export function rubberMat(repeat = 2) {
  return make(`rubber|${repeat}`, () => {
    const map = tune(T.rubber({}), repeat);
    return new THREE.MeshStandardMaterial({ map, roughness: 0.94, metalness: 0.02, color: '#2c2c2e' });
  });
}

export function hoseMat() {
  return make('hose', () =>
    new THREE.MeshStandardMaterial({ color: '#25262a', roughness: 0.85, metalness: 0.05 })
  );
}

export function heatMat(base = '#4a4a48') {
  return make(`heat|${base}`, () => {
    const map = T.heatTemper({ base });
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    return new THREE.MeshStandardMaterial({ map, roughness: 0.45, metalness: 0.9 });
  });
}

export function glassMat(tint = '#0d1a1c', opacity = 0.42) {
  return make(`glass|${tint}|${opacity}`, () =>
    new THREE.MeshPhysicalMaterial({
      color: tint,
      roughness: 0.08,
      metalness: 0.0,
      transmission: 0,
      transparent: true,
      opacity,
      envMapIntensity: 1.4,
      side: THREE.DoubleSide
    })
  );
}

/** Status lamp / indicator. Emissive so bloom picks it up. */
export function lamp(color = '#38ff9a', intensity = 3.0) {
  return make(`lamp|${color}|${intensity}`, () =>
    new THREE.MeshStandardMaterial({
      color: '#101010',
      emissive: new THREE.Color(color),
      emissiveIntensity: intensity,
      roughness: 0.35,
      metalness: 0.1,
      toneMapped: false
    })
  );
}

/** Unlit emissive used for holo elements and screen faces. */
export function holo(color = '#7ff2d0', opacity = 0.85, blending = THREE.AdditiveBlending) {
  return make(`holo|${color}|${opacity}|${blending}`, () =>
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    })
  );
}

export function screenMat(label, opts = {}) {
  return make(`screenmat|${label}|${JSON.stringify(opts)}`, () => {
    const map = T.screenFace(label, opts);
    return new THREE.MeshStandardMaterial({
      map,
      emissiveMap: map,
      emissive: 0xffffff,
      emissiveIntensity: 1.5,
      roughness: 0.25,
      metalness: 0,
      toneMapped: false
    });
  });
}

export function hazardMat(repeat = 1) {
  return make(`hazardmat|${repeat}`, () => {
    const map = tune(T.hazardStripe({}), repeat);
    return new THREE.MeshStandardMaterial({ map, roughness: 0.8, metalness: 0.1 });
  });
}

export function chainLinkMat(repeat = 4) {
  return make(`chainmat|${repeat}`, () => {
    const map = tune(T.chainLink(), repeat);
    return new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      alphaTest: 0.28,
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0.75,
      color: '#9aa09a'
    });
  });
}

export function decalMat(lines, opts = {}) {
  return make(`decal|${lines.join('/')}|${JSON.stringify(opts)}`, () => {
    const map = T.stencilDecal(lines, opts);
    return new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      alphaTest: 0.05,
      roughness: 0.85,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      side: THREE.DoubleSide
    });
  });
}

export function tarpMat(color = '#5d5a4a') {
  return make(`tarp|${color}`, () =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.98, metalness: 0, side: THREE.DoubleSide })
  );
}

export function disposeMaterials() {
  for (const m of cache.values()) m.dispose?.();
  cache.clear();
}

export const MATERIAL_CACHE = cache;
