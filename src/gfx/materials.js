// Shared materials. The film is lit with a stylised, mostly-Lambert setup: it is
// dramatically cheaper than PBR (which matters a lot when the offline renderer
// is a software rasteriser) and the hard falloff suits the "70s model shop" look
// far better than physically correct roughness ever would.

import * as THREE from 'three';
import { hullPanels, hullWindows, greebleTexture, radialGlow, starSprite, boltSprite, smokeSprite, shockRing, solarPanel, stoneTexture, plasterTexture } from './textures.js';

const pool = new Map();
function memo(key, fn) {
  if (!pool.has(key)) pool.set(key, fn());
  return pool.get(key);
}

/** Standard painted-hull material with procedural plating. */
export function hull({
  color = 0xb9bfc7,
  seed = 7,
  base = [150, 155, 162],
  repeat = [1, 1],
  emissiveMap = false,
  emissiveIntensity = 1,
  windowSeed = 11,
  density = 5,
  grime = 0.25,
  flat = false,
} = {}) {
  const key = `hull:${color}:${seed}:${base.join()}:${repeat.join()}:${emissiveMap}:${emissiveIntensity}:${windowSeed}:${density}:${grime}:${flat}`;
  return memo(key, () => {
    const map = hullPanels({ seed, base, density, grime }).clone();
    map.needsUpdate = true;
    map.repeat.set(repeat[0], repeat[1]);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    const m = new THREE.MeshLambertMaterial({ color, map, flatShading: flat });
    if (emissiveMap) {
      const em = hullWindows({ seed: windowSeed }).clone();
      em.needsUpdate = true;
      em.repeat.set(repeat[0], repeat[1]);
      em.wrapS = em.wrapT = THREE.RepeatWrapping;
      m.emissiveMap = em;
      m.emissive = new THREE.Color(0xffffff);
      m.emissiveIntensity = emissiveIntensity;
    }
    return m;
  });
}

/** Flat painted metal without texture (small parts, cheap). */
export function paint(color, { flat = true, emissive = 0x000000, emissiveIntensity = 1 } = {}) {
  return memo(`paint:${color}:${flat}:${emissive}:${emissiveIntensity}`, () =>
    new THREE.MeshLambertMaterial({ color, flatShading: flat, emissive, emissiveIntensity }));
}

export function greebled({ color = 0x8d949c, seed = 31, repeat = [4, 4], base = [96, 100, 108], lights = 0.06 } = {}) {
  return memo(`greebled:${color}:${seed}:${repeat.join()}:${base.join()}:${lights}`, () => {
    const map = greebleTexture({ seed, base, lights }).clone();
    map.needsUpdate = true;
    map.repeat.set(repeat[0], repeat[1]);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshLambertMaterial({ color, map });
  });
}

/** Self-lit surface -- engines, lasers, saber cores, cockpit glow. */
export function emissive(color, { opacity = 1, blending = THREE.AdditiveBlending, depthWrite = false, side = THREE.FrontSide } = {}) {
  return memo(`em:${color}:${opacity}:${blending}:${depthWrite}:${side}`, () =>
    new THREE.MeshBasicMaterial({
      color,
      transparent: opacity < 1 || blending === THREE.AdditiveBlending,
      opacity,
      blending,
      depthWrite,
      side,
      toneMapped: false,
    }));
}

export function solidGlow(color, opacity = 1) {
  return memo(`sg:${color}:${opacity}`, () =>
    new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: opacity < 1, opacity }));
}

export function solarArray({ color = 0xffffff, seed = 9, repeat = [1, 1], base = [46, 52, 62] } = {}) {
  return memo(`solar:${color}:${seed}:${repeat.join()}:${base.join()}`, () => {
    const map = solarPanel({ seed, base }).clone();
    map.needsUpdate = true;
    map.repeat.set(repeat[0], repeat[1]);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshLambertMaterial({ color, map });
  });
}

/** Weathered rock / adobe surfaces for the desert. */
export function stone({ color = 0xffffff, seed = 4, repeat = [1, 1], base = [176, 138, 98], strata = 1 } = {}) {
  return memo(`stonemat:${color}:${seed}:${repeat.join()}:${base.join()}:${strata}`, () => {
    const map = stoneTexture({ seed, base, strata }).clone();
    map.needsUpdate = true;
    map.repeat.set(repeat[0], repeat[1]);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshLambertMaterial({ color, map });
  });
}

export function plaster({ color = 0xffffff, seed = 6, repeat = [1, 1], base = [206, 186, 152] } = {}) {
  return memo(`plastermat:${color}:${seed}:${repeat.join()}:${base.join()}`, () => {
    const map = plasterTexture({ seed, base }).clone();
    map.needsUpdate = true;
    map.repeat.set(repeat[0], repeat[1]);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshLambertMaterial({ color, map });
  });
}

/** Polished armour: dark but with a hard specular so it reads against black. */
export function gloss(color = 0x24272d, { shininess = 70, specular = 0x9fb4cc } = {}) {
  return memo(`gloss:${color}:${shininess}:${specular}`, () =>
    new THREE.MeshPhongMaterial({ color, shininess, specular, flatShading: false }));
}

export function glass(color = 0x0a1420, opacity = 0.55) {
  return memo(`glass:${color}:${opacity}`, () =>
    new THREE.MeshPhongMaterial({
      color,
      shininess: 120,
      specular: 0x88aacc,
      transparent: true,
      opacity,
    }));
}

/** Additive sprite material from one of the procedural glow textures. */
export function glowSprite({ color = 0xffffff, texture = null, opacity = 1, depthWrite = false, blending = THREE.AdditiveBlending, rotation = 0 } = {}) {
  const tex = texture || radialGlow();
  const m = new THREE.SpriteMaterial({
    map: tex,
    color,
    transparent: true,
    opacity,
    blending,
    depthWrite,
    depthTest: true,
    rotation,
    toneMapped: false,
  });
  return m;
}

/** Camera-facing additive quad material (cheaper + orientable vs Sprite). */
export function glowPlane({ color = 0xffffff, texture = null, opacity = 1, blending = THREE.AdditiveBlending } = {}) {
  return new THREE.MeshBasicMaterial({
    map: texture || radialGlow(),
    color,
    transparent: true,
    opacity,
    blending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

export const sprites = {
  glow: () => radialGlow(),
  star: () => starSprite(),
  smoke: () => smokeSprite(),
  ring: () => shockRing(),
  bolt: (color) => boltSprite({ color }),
};

export function disposeMaterialPool() {
  for (const m of pool.values()) if (m && m.dispose) m.dispose();
  pool.clear();
}
