import * as THREE from 'three';

// Shared, cached materials. Sharing is not just a memory optimisation here:
// Kit batches instances by material identity, so two bricks only merge into one
// draw call if they resolve to the same cached material object.

const cache = new Map();

export const FINISH = {
  plastic: 'plastic',   // standard injection-moulded ABS
  matte: 'matte',       // rubber tyres, printed detail
  metal: 'metal',       // chrome / pearl elements
  trans: 'trans',       // transparent elements
  glow: 'glow',         // emissive: engines, blaster bolts, sabers, lamps
  glass: 'glass',       // canopies
  sand: 'sand',         // terrain, slightly rough non-brick surfaces
};

function build(finish, color, extra) {
  const c = new THREE.Color(color);
  switch (finish) {
    case FINISH.matte:
      return new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0.0 });
    case FINISH.metal:
      return new THREE.MeshStandardMaterial({ color: c, roughness: 0.24, metalness: 0.95 });
    case FINISH.trans:
      return new THREE.MeshPhysicalMaterial({
        color: c, roughness: 0.08, metalness: 0.0, transmission: 0.0,
        transparent: true, opacity: extra.opacity ?? 0.55,
        emissive: c, emissiveIntensity: extra.emissive ?? 0.25,
        side: THREE.DoubleSide, depthWrite: false,
      });
    case FINISH.glass:
      return new THREE.MeshPhysicalMaterial({
        color: c, roughness: 0.03, metalness: 0.0,
        transparent: true, opacity: extra.opacity ?? 0.35,
        envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false,
      });
    case FINISH.glow:
      return new THREE.MeshStandardMaterial({
        color: c, emissive: c, emissiveIntensity: extra.emissive ?? 3.0,
        roughness: 0.4, metalness: 0.0,
        transparent: extra.opacity !== undefined, opacity: extra.opacity ?? 1,
      });
    case FINISH.sand:
      return new THREE.MeshStandardMaterial({ color: c, roughness: 0.98, metalness: 0.0 });
    case FINISH.plastic:
    default:
      return new THREE.MeshStandardMaterial({
        color: c, roughness: 0.36, metalness: 0.0, envMapIntensity: 0.85,
      });
  }
}

export function getMaterial(color, finish = FINISH.plastic, extra = {}) {
  const key = `${finish}|${color}|${extra.opacity ?? ''}|${extra.emissive ?? ''}|${extra.tag ?? ''}`;
  let m = cache.get(key);
  if (!m) {
    m = build(finish, color, extra);
    m.name = key;
    m.userData.finish = finish;
    cache.set(key, m);
  }
  return m;
}

// A private (uncached) copy, for materials that will be animated per-object.
export function uniqueMaterial(color, finish = FINISH.plastic, extra = {}) {
  const m = build(finish, color, extra);
  m.userData.finish = finish;
  return m;
}

export function applyEnvironment(envMap) {
  for (const m of cache.values()) {
    if ('envMap' in m) {
      m.envMap = envMap;
      m.needsUpdate = true;
    }
  }
}

export function allMaterials() {
  return [...cache.values()];
}
