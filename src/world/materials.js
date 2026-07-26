// Material library. Single source of truth: everything requests materials by
// name via getMaterial(). Phase-2 graybox ships coherent flat PBR values;
// the texture pass upgrades entries in place (same names) with procedural maps.

import * as THREE from 'three';

const cache = new Map();

// name: [color, roughness, metalness, extra]
const TABLE = {
  // architecture
  drywall:        [0xb8bcb9, 0.92, 0.0],
  drywall_accent: [0x51616b, 0.9, 0.0],
  plaster:        [0xaeb2ac, 0.95, 0.0],
  concrete:       [0x8d8d88, 0.95, 0.0],
  concrete_dark:  [0x6e6e6a, 0.96, 0.0],
  ceiling_tile:   [0xcfd2cc, 0.97, 0.0],
  carpet:         [0x5a6068, 0.99, 0.0],
  carpet_exec:    [0x4a4f45, 0.99, 0.0],
  vinyl:          [0x9fa39c, 0.55, 0.0],
  tile:           [0xb9c2c4, 0.35, 0.0],
  tile_dark:      [0x3f4a4e, 0.5, 0.0],
  lobby_floor:    [0x9aa2a6, 0.3, 0.05],
  entry_mat:      [0x3a3f42, 0.98, 0.0],
  server_floor:   [0x7c8288, 0.6, 0.15],
  garage_floor:   [0x757974, 0.85, 0.0],
  wood:           [0x8a6a48, 0.62, 0.0],
  wood_dark:      [0x5d452f, 0.6, 0.0],
  laminate:       [0xa88f6d, 0.5, 0.0],
  metal_painted:  [0x707880, 0.55, 0.4],
  metal_dark:     [0x3c4247, 0.5, 0.55],
  metal_brushed:  [0x9aa2a8, 0.35, 0.85],
  steel:          [0xb6bcc0, 0.28, 0.9],
  aluminum:       [0xc4c9cc, 0.32, 0.85],
  plastic_dark:   [0x2e3236, 0.65, 0.0],
  plastic_light:  [0xd6d8d2, 0.7, 0.0],
  rubber:         [0x232628, 0.95, 0.0],
  fabric_blue:    [0x46627a, 0.98, 0.0],
  fabric_gray:    [0x666d72, 0.98, 0.0],
  leather_black:  [0x24262a, 0.55, 0.0],
  paper:          [0xe8e6dd, 0.95, 0.0],
  cardboard:      [0xa98d63, 0.95, 0.0],
  snow:           [0xdde8f2, 0.85, 0.0],
  door_office:    [0x74563c, 0.6, 0.0],
  door_metal:     [0x5c666d, 0.5, 0.45],
  door_fire:      [0x7a3f38, 0.55, 0.35],
  door_exec:      [0x4e3a28, 0.55, 0.0],
  frame_metal:    [0x454c52, 0.5, 0.5],
  mullion:        [0x30373d, 0.45, 0.6],
  baseboard:      [0x3a3f43, 0.7, 0.0],
};

export function getMaterial(name) {
  if (cache.has(name)) return cache.get(name);
  const def = TABLE[name];
  if (!def) {
    console.warn(`[materials] unknown material '${name}', using fallback`);
    const fb = new THREE.MeshStandardMaterial({ color: 0xff00ff, roughness: 0.8 });
    cache.set(name, fb);
    return fb;
  }
  const [color, roughness, metalness, extra = {}] = def;
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  mat.name = name;
  cache.set(name, mat);
  return mat;
}

// Glass is shared per style; transparent, affected by breakage per-pane via
// separate mesh state (never mutate these shared materials at runtime).
export function getGlassMaterial(style = 'clear') {
  const key = `glass_${style}`;
  if (cache.has(key)) return cache.get(key);
  let mat;
  if (style === 'frosted') {
    mat = new THREE.MeshPhysicalMaterial({
      color: 0xd7e4ea, roughness: 0.55, metalness: 0, transmission: 0,
      transparent: true, opacity: 0.55, depthWrite: false,
    });
  } else if (style === 'tinted') {
    mat = new THREE.MeshPhysicalMaterial({
      color: 0x9fc4d8, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.32, depthWrite: false,
    });
  } else {
    mat = new THREE.MeshPhysicalMaterial({
      color: 0xcfe6f0, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false,
    });
  }
  mat.side = THREE.DoubleSide;
  mat.name = key;
  cache.set(key, mat);
  return mat;
}

export function getCrackedGlassMaterial() {
  const key = 'glass_cracked';
  if (cache.has(key)) return cache.get(key);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xe8f2f6, roughness: 0.4, metalness: 0, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide,
  });
  cache.set(key, mat);
  return mat;
}

// Map room floor keys -> material + footstep surface
export const FLOOR_STYLES = {
  carpet: { mat: 'carpet', surface: 'carpet' },
  carpet_exec: { mat: 'carpet_exec', surface: 'carpet' },
  vinyl: { mat: 'vinyl', surface: 'vinyl' },
  tile: { mat: 'tile', surface: 'tile' },
  lobby: { mat: 'lobby_floor', surface: 'tile' },
  entry: { mat: 'entry_mat', surface: 'carpet' },
  concrete: { mat: 'concrete', surface: 'concrete' },
  concrete_seal: { mat: 'concrete_dark', surface: 'concrete' },
  server: { mat: 'server_floor', surface: 'metal' },
  garage: { mat: 'garage_floor', surface: 'concrete' },
  snow: { mat: 'snow', surface: 'snow' },
};

export function materialNames() { return Object.keys(TABLE); }
export function upgradeMaterial(name, props) {
  const m = getMaterial(name);
  Object.assign(m, props);
  m.needsUpdate = true;
}

// meters per texture tile, consumed by world-space UV baking (uv.js).
// Materials not listed default to 1 m/tile.
export const MATERIAL_TILE_METERS = {
  carpet: 2, carpet_exec: 2, vinyl: 2, tile: 1.2, lobby_floor: 2.4, concrete: 2.4,
  concrete_dark: 2.4, garage_floor: 3, server_floor: 1.2, drywall: 2.4, plaster: 2.4,
  ceiling_tile: 1.2, snow: 3, wood: 1.2, wood_dark: 1.2, laminate: 1.2,
  metal_painted: 1.6, metal_dark: 1.2, metal_brushed: 1, steel: 1, aluminum: 1,
};
export function getUvScale(name) { return MATERIAL_TILE_METERS[name] || 1; }
