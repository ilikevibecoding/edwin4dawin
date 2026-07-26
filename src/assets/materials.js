// Material library. Phase-2 graybox: readable flat materials with a scale
// grid so proportions can be judged. The art pass (Fable 3) replaces the
// implementations here without touching consumers: get(key) stays stable.
import * as THREE from 'three';

let _cache = new Map();
let _gridTex = null;

function gridTexture(base = '#9aa3ab', line = '#7c848c', size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  g.strokeStyle = line;
  g.lineWidth = 2;
  g.strokeRect(0, 0, size, size);
  g.globalAlpha = 0.4;
  g.beginPath();
  g.moveTo(size / 2, 0); g.lineTo(size / 2, size);
  g.moveTo(0, size / 2); g.lineTo(size, size / 2);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const GRAYBOX_COLORS = {
  wall_int: 0xb8bcc2, wall_ext: 0x8f959c, wall_glassframe: 0x3a3f45,
  floor_carpet: 0x5f6a72, floor_tile: 0xaeb6ba, floor_concrete: 0x82878b,
  floor_wood: 0x8a6f52, floor_snow: 0xe8edf2, floor_kitchen: 0x9aa39f,
  ceiling: 0xd4d7da, ceiling_service: 0x6f757c,
  stair: 0x7d838a, core: 0x757b83, railing: 0x4a5058,
  door: 0x76614a, door_fire: 0x8a3d34, door_security: 0x44506a, door_glass: 0x8fb4c4,
  frame: 0x3c4147, shutter: 0x5a6068,
  trim: 0x62686e,
};

export function getMaterial(key) {
  if (_cache.has(key)) return _cache.get(key);
  const mat = createMaterial(key);
  _cache.set(key, mat);
  return mat;
}

function createMaterial(key) {
  if (!_gridTex) _gridTex = gridTexture();
  if (key.startsWith('glass')) {
    const opts = {
      glass: { color: 0xcfe4ee, opacity: 0.18, roughness: 0.08 },
      glass_frosted: { color: 0xdfe8ec, opacity: 0.55, roughness: 0.5 },
      glass_tinted: { color: 0x37505e, opacity: 0.4, roughness: 0.1 },
    }[key] || { color: 0xcfe4ee, opacity: 0.2, roughness: 0.1 };
    return new THREE.MeshPhysicalMaterial({
      color: opts.color, transparent: true, opacity: opts.opacity,
      roughness: opts.roughness, metalness: 0.0, side: THREE.DoubleSide,
      depthWrite: false,
    });
  }
  const color = GRAYBOX_COLORS[key] ?? 0xbfc3c7;
  const useGrid = key.startsWith('wall') || key.startsWith('floor') || key === 'ceiling';
  return new THREE.MeshStandardMaterial({
    color,
    map: useGrid ? _gridTex : null,
    roughness: 0.9,
    metalness: 0.02,
  });
}

// room style -> floor/ceiling/wall materials (graybox tier)
export function roomMaterials(style) {
  switch (style) {
    case 'exterior': return { floor: 'floor_snow', ceiling: null, wall: 'wall_ext', floorTag: 'snow' };
    case 'lobby': return { floor: 'floor_tile', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'tile' };
    case 'office': return { floor: 'floor_carpet', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'carpet' };
    case 'conference': return { floor: 'floor_carpet', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'carpet' };
    case 'exec': return { floor: 'floor_wood', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'wood' };
    case 'kitchen': return { floor: 'floor_kitchen', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'tile' };
    case 'restroom': return { floor: 'floor_tile', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'tile' };
    case 'archive': return { floor: 'floor_carpet', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'carpet' };
    case 'server': return { floor: 'floor_tile', ceiling: 'ceiling_service', wall: 'wall_int', floorTag: 'tile' };
    case 'security': return { floor: 'floor_carpet', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'carpet' };
    case 'corridor': return { floor: 'floor_carpet', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'carpet' };
    case 'service': return { floor: 'floor_concrete', ceiling: 'ceiling_service', wall: 'wall_ext', floorTag: 'concrete' };
    case 'garage': return { floor: 'floor_concrete', ceiling: 'ceiling_service', wall: 'wall_ext', floorTag: 'concrete' };
    case 'utility': return { floor: 'floor_concrete', ceiling: 'ceiling_service', wall: 'wall_int', floorTag: 'concrete' };
    case 'stairwell': return { floor: 'floor_concrete', ceiling: 'ceiling_service', wall: 'wall_ext', floorTag: 'concrete' };
    default: return { floor: 'floor_carpet', ceiling: 'ceiling', wall: 'wall_int', floorTag: 'carpet' };
  }
}

export function clearMaterialCache() {
  for (const m of _cache.values()) m.dispose?.();
  _cache.clear();
}
