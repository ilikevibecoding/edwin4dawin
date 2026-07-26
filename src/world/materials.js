// Material library. Single source of truth: everything requests materials by
// name via getMaterial(). Phase-3 texture pass: each entry now binds the
// procedural PBR map set from textures.js (base color + normal + roughness,
// canvas-generated, seeded, seamless). Scalars below tune how the maps read:
// `metal` multiplies metalness, `ns` scales the normal map, and `rough`/`flat`
// only apply if a family has no generator (defensive fallback).

import * as THREE from 'three';
import { getTextureSet } from './textures.js';

const cache = new Map();

// name: { flat: fallbackColor, rough: fallbackRoughness, metal, ns: normalScale }
const TABLE = {
  // architecture — walls
  drywall:        { flat: 0xb8bcb9, rough: 0.92, metal: 0,    ns: 0.5 },
  drywall_accent: { flat: 0x51616b, rough: 0.9,  metal: 0,    ns: 0.5 },
  drywall_blue:   { flat: 0x96a3b0, rough: 0.9,  metal: 0,    ns: 0.5 },
  plaster:        { flat: 0xaeb2ac, rough: 0.95, metal: 0,    ns: 0.45 },
  brick:          { flat: 0x8c5044, rough: 0.9,  metal: 0,    ns: 0.8 },
  concrete:       { flat: 0x8d8d88, rough: 0.95, metal: 0,    ns: 0.7 },
  concrete_dark:  { flat: 0x6e6e6a, rough: 0.7,  metal: 0,    ns: 0.6 },
  wet_concrete:   { flat: 0x5f615e, rough: 0.6,  metal: 0,    ns: 0.7 },
  ceiling_tile:   { flat: 0xcfd2cc, rough: 0.97, metal: 0,    ns: 0.6 },
  // floors
  carpet:         { flat: 0x5a6068, rough: 0.99, metal: 0,    ns: 0.65 },
  carpet_exec:    { flat: 0x4a4f45, rough: 0.99, metal: 0,    ns: 0.65 },
  carpet_worn:    { flat: 0x62666c, rough: 0.99, metal: 0,    ns: 0.55 },
  vinyl:          { flat: 0x9fa39c, rough: 0.55, metal: 0,    ns: 0.3 },
  tile:           { flat: 0xb9c2c4, rough: 0.35, metal: 0,    ns: 0.6 },
  tile_dark:      { flat: 0x3f4a4e, rough: 0.5,  metal: 0,    ns: 0.6 },
  tile_restroom:  { flat: 0xd6dbdc, rough: 0.3,  metal: 0,    ns: 0.6 },
  lobby_floor:    { flat: 0x9aa2a6, rough: 0.3,  metal: 0.05, ns: 0.4 },
  entry_mat:      { flat: 0x3a3f42, rough: 0.98, metal: 0,    ns: 0.85 },
  server_floor:   { flat: 0x7c8288, rough: 0.6,  metal: 0.15, ns: 0.6 },
  garage_floor:   { flat: 0x757974, rough: 0.85, metal: 0,    ns: 0.7 },
  snow:           { flat: 0xdde8f2, rough: 0.7,  metal: 0,    ns: 1.0 },
  ice:            { flat: 0xc6dbe9, rough: 0.15, metal: 0,    ns: 0.35 },
  // woods
  wood:           { flat: 0x8a6a48, rough: 0.62, metal: 0,    ns: 0.45 },
  wood_dark:      { flat: 0x5d452f, rough: 0.6,  metal: 0,    ns: 0.45 },
  laminate:       { flat: 0xa88f6d, rough: 0.5,  metal: 0,    ns: 0.3 },
  // metals
  metal_painted:  { flat: 0x707880, rough: 0.55, metal: 0.4,  ns: 0.35 },
  metal_dark:     { flat: 0x3c4247, rough: 0.5,  metal: 0.55, ns: 0.25 },
  metal_brushed:  { flat: 0x9aa2a8, rough: 0.35, metal: 0.8,  ns: 0.2 },
  steel:          { flat: 0xb6bcc0, rough: 0.28, metal: 0.85, ns: 0.2 },
  aluminum:       { flat: 0xc4c9cc, rough: 0.32, metal: 0.8,  ns: 0.2 },
  // prop-scale utility
  plastic_dark:   { flat: 0x2e3236, rough: 0.65, metal: 0,    ns: 0.25 },
  plastic_light:  { flat: 0xd6d8d2, rough: 0.7,  metal: 0,    ns: 0.25 },
  rubber:         { flat: 0x232628, rough: 0.95, metal: 0,    ns: 0.55 },
  fabric_blue:    { flat: 0x46627a, rough: 0.98, metal: 0,    ns: 0.5 },
  fabric_gray:    { flat: 0x666d72, rough: 0.98, metal: 0,    ns: 0.5 },
  leather_black:  { flat: 0x24262a, rough: 0.55, metal: 0,    ns: 0.55 },
  paper:          { flat: 0xe8e6dd, rough: 0.95, metal: 0,    ns: 0.15 },
  cardboard:      { flat: 0xa98d63, rough: 0.95, metal: 0,    ns: 0.25 },
  // doors + frames
  door_office:    { flat: 0x74563c, rough: 0.6,  metal: 0,    ns: 0.45 },
  door_metal:     { flat: 0x5c666d, rough: 0.5,  metal: 0.45, ns: 0.35 },
  door_fire:      { flat: 0x7a3f38, rough: 0.55, metal: 0.35, ns: 0.4 },
  door_exec:      { flat: 0x4e3a28, rough: 0.55, metal: 0,    ns: 0.45 },
  frame_metal:    { flat: 0x454c52, rough: 0.5,  metal: 0.5,  ns: 0.3 },
  mullion:        { flat: 0x30373d, rough: 0.45, metal: 0.6,  ns: 0.25 },
  baseboard:      { flat: 0x3a3f43, rough: 0.7,  metal: 0,    ns: 0.3 },
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
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: def.rough,
    metalness: def.metal || 0,
  });
  const tex = getTextureSet(name);
  if (tex) {
    mat.map = tex.map;
    mat.normalMap = tex.normalMap;
    mat.roughnessMap = tex.roughnessMap;
    // maps carry the full albedo + roughness; scalars become multipliers
    mat.roughness = 1.0;
    const ns = def.ns ?? 0.5;
    mat.normalScale.set(ns, ns);
  } else {
    mat.color.setHex(def.flat);
  }
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
  carpet_worn: { mat: 'carpet_worn', surface: 'carpet' },
  vinyl: { mat: 'vinyl', surface: 'vinyl' },
  tile: { mat: 'tile', surface: 'tile' },
  restroom: { mat: 'tile_restroom', surface: 'tile' },
  lobby: { mat: 'lobby_floor', surface: 'tile' },
  entry: { mat: 'entry_mat', surface: 'carpet' },
  concrete: { mat: 'concrete', surface: 'concrete' },
  concrete_seal: { mat: 'concrete_dark', surface: 'concrete' },
  server: { mat: 'server_floor', surface: 'metal' },
  garage: { mat: 'garage_floor', surface: 'concrete' },
  snow: { mat: 'snow', surface: 'snow' },
  ice: { mat: 'ice', surface: 'tile' },
};

export function materialNames() { return Object.keys(TABLE); }
export function upgradeMaterial(name, props) {
  const m = getMaterial(name);
  Object.assign(m, props);
  m.needsUpdate = true;
}

// meters per texture tile, consumed by world-space UV baking (uv.js).
// Chosen so pattern scale is physically right: ceiling_tile texture holds a
// 2×2 of 0.6 m grid cells -> 1.2; tile holds 4×4 of 0.3 m ceramic -> 1.2;
// lobby_floor holds 3×3 of 0.8 m slabs -> 2.4; server_floor 2×2 of 0.6 m
// panels -> 1.2; brick 16 courses of 75 mm -> 1.2. Materials not listed
// default to 1 m/tile (prop scale).
export const MATERIAL_TILE_METERS = {
  carpet: 2, carpet_exec: 2, carpet_worn: 2, vinyl: 2,
  tile: 1.2, tile_dark: 1.2, tile_restroom: 1.2, lobby_floor: 2.4,
  concrete: 2.4, concrete_dark: 2.4, wet_concrete: 2.4,
  garage_floor: 3, server_floor: 1.2,
  drywall: 2.4, drywall_accent: 2.4, drywall_blue: 2.4, plaster: 2.4, brick: 1.2,
  ceiling_tile: 1.2, snow: 3, ice: 1.5,
  wood: 1.2, wood_dark: 1.2, laminate: 1.2,
  metal_painted: 1.6, metal_dark: 1.2, metal_brushed: 1, steel: 1, aluminum: 1,
};
export function getUvScale(name) { return MATERIAL_TILE_METERS[name] || 1; }
