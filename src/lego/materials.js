import * as THREE from 'three';
import { FINISH, defaultFinish } from './palette.js';

// A single shared material cache: ABS plastic is ABS plastic, and sharing
// materials is what lets us draw a Star Destroyer without melting the GPU.
const cache = new Map();

export const Quality = {
  // 'high' = bevelled bricks + clearcoat; 'low' = plain boxes + cheap lambert-ish
  level: 'high',
  envMap: null,
  envIntensity: 0.85,
};

function key(color, finish, opts) {
  return `${color}|${finish}|${JSON.stringify(opts || {})}`;
}

/**
 * Get (or build) the ABS-plastic material for a LEGO colour.
 * @param {number} color hex
 * @param {string} [finish] one of FINISH.*
 * @param {object} [opts] { emissive, emissiveIntensity, opacity, roughness, flatShading }
 */
export function mat(color, finish, opts = {}) {
  const f = finish || defaultFinish(color);
  const k = key(color, f, opts);
  if (cache.has(k)) return cache.get(k);

  let m;
  const base = {
    color: new THREE.Color(color).convertSRGBToLinear(),
    envMap: Quality.envMap,
    envMapIntensity: Quality.envIntensity,
  };

  switch (f) {
    case FINISH.TRANS:
      m = new THREE.MeshPhysicalMaterial({
        ...base,
        roughness: opts.roughness ?? 0.08,
        metalness: 0.0,
        transparent: true,
        opacity: opts.opacity ?? 0.55,
        transmission: 0.0, // real transmission is too costly in software GL
        clearcoat: 1.0,
        clearcoatRoughness: 0.04,
        depthWrite: opts.depthWrite ?? false,
        side: THREE.DoubleSide,
        emissive: new THREE.Color(opts.emissive ?? color).convertSRGBToLinear(),
        emissiveIntensity: opts.emissiveIntensity ?? 0.0,
      });
      break;
    case FINISH.METAL:
      m = new THREE.MeshStandardMaterial({
        ...base,
        roughness: opts.roughness ?? 0.35,
        metalness: 0.9,
      });
      break;
    case FINISH.CHROME:
      m = new THREE.MeshStandardMaterial({
        ...base,
        roughness: opts.roughness ?? 0.06,
        metalness: 1.0,
        envMapIntensity: 1.4,
      });
      break;
    case FINISH.RUBBER:
      m = new THREE.MeshStandardMaterial({
        ...base,
        roughness: opts.roughness ?? 0.92,
        metalness: 0.0,
      });
      break;
    case FINISH.GLOW:
      // Emissive parts are written above 1.0 so the bloom threshold can sit
      // high enough that ordinary white ABS does not smear.
      m = new THREE.MeshBasicMaterial({
        color: base.color.clone().multiplyScalar(opts.intensity ?? 2.4),
        toneMapped: false,
        transparent: !!opts.opacity && opts.opacity < 1,
        opacity: opts.opacity ?? 1,
        depthWrite: opts.depthWrite ?? true,
        side: opts.side ?? THREE.FrontSide,
        blending: opts.blending ?? THREE.NormalBlending,
      });
      break;
    default:
      m = new THREE.MeshPhysicalMaterial({
        ...base,
        roughness: opts.roughness ?? 0.34,
        metalness: 0.0,
        clearcoat: Quality.level === 'high' ? 0.45 : 0.0,
        clearcoatRoughness: 0.22,
        flatShading: !!opts.flatShading,
        emissive: opts.emissive !== undefined
          ? new THREE.Color(opts.emissive).convertSRGBToLinear() : new THREE.Color(0, 0, 0),
        emissiveIntensity: opts.emissiveIntensity ?? 1,
      });
  }
  m.name = `abs_${color.toString(16)}_${f}`;
  cache.set(k, m);
  return m;
}

/** Unlit, additive material for engine glow / blaster bolts / saber cores. */
export function glow(color, opacity = 1, additive = true, intensity) {
  return mat(color, FINISH.GLOW, {
    opacity,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: THREE.DoubleSide,
    ...(intensity === undefined ? {} : { intensity }),
  });
}

export function setEnvMap(env, intensity = 0.85) {
  Quality.envMap = env;
  Quality.envIntensity = intensity;
  for (const m of cache.values()) {
    if ('envMap' in m) {
      m.envMap = env;
      m.envMapIntensity = intensity;
      m.needsUpdate = true;
    }
  }
}

export function disposeMaterials() {
  for (const m of cache.values()) m.dispose();
  cache.clear();
}
