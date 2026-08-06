/**
 * Shared material library.
 *
 * Materials are created once and reused everywhere so the renderer compiles a
 * small number of programs and batches efficiently. Colour palettes are chosen
 * to read well under all three lighting conditions.
 */

import * as THREE from 'three';
import { paintedMetal, heatMetal, hazardStripes, tyreTread, chainLink, gravelMap } from './textures.js';

const reg = new Map();

function def(name, build) {
  if (!reg.has(name)) {
    const m = build();
    m.name = name;
    reg.set(name, m);
  }
  return reg.get(name);
}

export const PALETTE = {
  oliveDark: '#39412f',
  olive: '#4b5540',
  oliveLight: '#5d6a4f',
  sandPaint: '#8e8163',
  sandLight: '#a89878',
  grayPaint: '#6a6f6c',
  grayDark: '#3c4142',
  steel: '#8b9096',
  steelDark: '#4a4f54',
  black: '#17181a',
  amber: '#ffb028',
  red: '#ff3b30',
  green: '#39ff9e',
  blue: '#4fc3ff',
  white: '#e8e6de',
  copper: '#8a5a34',
};

// --------------------------------------------------------------------------
// Structural
// --------------------------------------------------------------------------

export function matOliveArmour() {
  return def('oliveArmour', () => {
    const t = paintedMetal({
      key: 'oliveArmour', color: PALETTE.olive, seed: 12, panel: 6, wear: 0.7, grime: 0.7,
      camo: [
        { color: 'rgba(46,52,38,0.75)', blobs: 14, scale: 0.16 },
        { color: 'rgba(96,88,64,0.4)', blobs: 10, scale: 0.11 },
      ],
    });
    return new THREE.MeshStandardMaterial({
      ...t, roughness: 0.82, metalness: 0.08,
      normalScale: new THREE.Vector2(0.8, 0.8),
    });
  });
}

export function matSandArmour() {
  return def('sandArmour', () => {
    const t = paintedMetal({
      key: 'sandArmour', color: PALETTE.sandPaint, seed: 27, panel: 5, wear: 0.8, grime: 0.6,
      camo: [
        { color: 'rgba(124,112,82,0.5)', blobs: 12, scale: 0.15 },
        { color: 'rgba(76,72,56,0.32)', blobs: 8, scale: 0.1 },
      ],
    });
    return new THREE.MeshStandardMaterial({
      ...t, roughness: 0.85, metalness: 0.06,
      normalScale: new THREE.Vector2(0.85, 0.85),
    });
  });
}

export function matGrayArmour() {
  return def('grayArmour', () => {
    const t = paintedMetal({ key: 'grayArmour', color: PALETTE.grayPaint, seed: 41, panel: 7, wear: 0.5, grime: 0.5 });
    return new THREE.MeshStandardMaterial({ ...t, roughness: 0.74, metalness: 0.14 });
  });
}

export function matWhitePaint() {
  return def('whitePaint', () => {
    const t = paintedMetal({ key: 'whitePaint', color: '#cfcdc4', seed: 55, panel: 4, wear: 0.55, grime: 0.75 });
    return new THREE.MeshStandardMaterial({ ...t, roughness: 0.66, metalness: 0.08 });
  });
}

export function matShelter() {
  return def('shelter', () => {
    const t = paintedMetal({
      key: 'shelter', color: '#43503f', seed: 71, panel: 8, wear: 0.6, grime: 0.9,
      camo: [{ color: 'rgba(56,50,38,0.55)', blobs: 16, scale: 0.14 }],
    });
    return new THREE.MeshStandardMaterial({ ...t, roughness: 0.84, metalness: 0.07 });
  });
}

export function matSteel() {
  return def('steel', () => new THREE.MeshStandardMaterial({
    color: PALETTE.steel, roughness: 0.42, metalness: 0.92,
  }));
}

export function matSteelDark() {
  return def('steelDark', () => new THREE.MeshStandardMaterial({
    color: PALETTE.steelDark, roughness: 0.55, metalness: 0.85,
  }));
}

export function matChrome() {
  return def('chrome', () => new THREE.MeshStandardMaterial({
    color: '#cfd6dc', roughness: 0.16, metalness: 1.0,
  }));
}

export function matRubber() {
  return def('rubber', () => new THREE.MeshStandardMaterial({
    color: '#1b1b1d', roughness: 0.94, metalness: 0.02,
  }));
}

export function matTyre() {
  return def('tyre', () => new THREE.MeshStandardMaterial({
    map: tyreTread(), color: '#2a2a2c', roughness: 0.95, metalness: 0.03,
  }));
}

export function matHazard() {
  return def('hazard', () => new THREE.MeshStandardMaterial({
    map: hazardStripes(), roughness: 0.68, metalness: 0.06,
  }));
}

export function matHazardRed() {
  return def('hazardRed', () => new THREE.MeshStandardMaterial({
    map: hazardStripes('#c0392b', '#e6e2d6', 10), roughness: 0.75, metalness: 0.12,
  }));
}

export function matHeat() {
  return def('heat', () => {
    const t = heatMetal();
    return new THREE.MeshStandardMaterial({ ...t, roughness: 0.5, metalness: 0.9 });
  });
}

export function matCanister() {
  return def('canister', () => {
    const t = paintedMetal({
      key: 'canister', color: '#5a6350', seed: 91, panel: 3, wear: 0.45, grime: 0.5,
    });
    return new THREE.MeshStandardMaterial({ ...t, roughness: 0.62, metalness: 0.22 });
  });
}

export function matMissileBody() {
  return def('missileBody', () => {
    const t = paintedMetal({
      key: 'missileBody', color: '#c8c6bd', seed: 33, panel: 3, rivets: false, wear: 0.3, grime: 0.25,
    });
    return new THREE.MeshStandardMaterial({ ...t, roughness: 0.38, metalness: 0.45 });
  });
}

export function matThreatBody() {
  return def('threatBody', () => {
    const t = paintedMetal({
      key: 'threatBody', color: '#5d5f61', seed: 65, panel: 3, rivets: false, wear: 0.6, grime: 0.5,
    });
    return new THREE.MeshStandardMaterial({ ...t, roughness: 0.5, metalness: 0.55 });
  });
}

export function matGravel() {
  return def('gravel', () => new THREE.MeshStandardMaterial({
    map: gravelMap(), roughness: 0.96, metalness: 0.02,
  }));
}

export function matFence() {
  return def('fence', () => new THREE.MeshStandardMaterial({
    map: chainLink(), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide,
    roughness: 0.6, metalness: 0.8, depthWrite: true,
  }));
}

export function matGlass() {
  return def('glass', () => new THREE.MeshPhysicalMaterial({
    color: '#1a2a2e', roughness: 0.08, metalness: 0.0,
    transparent: true, opacity: 0.42, envMapIntensity: 1.5,
  }));
}

export function matRadome() {
  return def('radome', () => new THREE.MeshStandardMaterial({
    color: '#cbc7ba', roughness: 0.55, metalness: 0.06,
  }));
}

// --------------------------------------------------------------------------
// Emissive
// --------------------------------------------------------------------------

const emissiveCache = new Map();
export function matEmissive(color, intensity = 3, opts = {}) {
  const key = `em:${color}:${intensity}:${opts.transparent ? 1 : 0}`;
  if (!emissiveCache.has(key)) {
    emissiveCache.set(key, new THREE.MeshStandardMaterial({
      color: '#000000',
      emissive: new THREE.Color(color),
      emissiveIntensity: intensity,
      roughness: 0.4, metalness: 0,
      toneMapped: opts.toneMapped ?? true,
      transparent: !!opts.transparent,
      opacity: opts.opacity ?? 1,
    }));
  }
  return emissiveCache.get(key);
}

const lampCache = new Map();

/**
 * Lamp material. `shared` groups lamps of the same colour onto one material so
 * they batch into a single draw call - correct for the site beacons, which all
 * blink together. Status lamps that must differ pass `shared: false`.
 */
export function makeLamp(color, intensity = 2, shared = false) {
  if (shared) {
    const key = `${color}:${intensity}`;
    if (!lampCache.has(key)) lampCache.set(key, makeLamp(color, intensity, false));
    return lampCache.get(key);
  }
  return new THREE.MeshStandardMaterial({
    color: '#0a0a0a',
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.35, metalness: 0.1,
  });
}

export function disposeMaterials() {
  reg.forEach((m) => m.dispose());
  reg.clear();
  emissiveCache.forEach((m) => m.dispose());
  emissiveCache.clear();
}
