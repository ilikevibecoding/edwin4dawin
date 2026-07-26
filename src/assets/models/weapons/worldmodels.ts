import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { registerAsset } from '../../registry';

/**
 * Compact world-model weapons for characters (Fable 4). Barrel along +Z,
 * origin at grip. Deliberately chunkier than view models for readability.
 */

registerAsset({
  id: 'weapon.worldmodels',
  name: 'World-model weapons (carbine/SMG/shotgun in enemy hands)',
  category: 'weapon',
  agent: 'Fable 4',
  files: 'src/assets/models/weapons/worldmodels.ts',
  where: 'enemy hands, aligned to aim pose',
  dims: '0.55–0.9 m',
  pivot: 'grip, +Z barrel',
  materials: 'blued steel, polymer',
  collision: 'none',
  lod: 'shared-geometry',
  anim: 'carry/aim via torso weapon mount',
  audio: 'enemy fire set',
  status: 'integrated',
  accept: 'readable silhouette at 25 m; no torso clipping in carry/aim/death',
});

const POLY = new THREE.MeshStandardMaterial({ color: 0x24282c, roughness: 0.7, metalness: 0.15 });
const STEEL = new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: 0.4, metalness: 0.8 });
const WOOD = new THREE.MeshStandardMaterial({ color: 0x5e4632, roughness: 0.6 });

const cache = new Map<string, { geos: Map<THREE.Material, THREE.BufferGeometry> }>();

function buildParts(kind: string): Map<THREE.Material, THREE.BufferGeometry> {
  const acc = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const bx = (mat: THREE.Material, w: number, h: number, d: number, x = 0, y = 0, z = 0): void => {
    let list = acc.get(mat);
    if (!list) {
      list = [];
      acc.set(mat, list);
    }
    list.push(new THREE.BoxGeometry(w, h, d).translate(x, y, z));
  };
  switch (kind) {
    case 'br8':
      bx(STEEL, 0.045, 0.07, 0.3, 0, 0, 0.1);
      bx(STEEL, 0.03, 0.03, 0.42, 0, 0.015, 0.42);
      bx(WOOD, 0.05, 0.05, 0.14, 0, -0.03, 0.32);
      bx(WOOD, 0.045, 0.09, 0.22, 0, -0.02, -0.2);
      break;
    case 'kis10':
      bx(POLY, 0.05, 0.08, 0.34, 0, 0, 0.08);
      bx(STEEL, 0.026, 0.026, 0.16, 0, 0.01, 0.32);
      bx(STEEL, 0.035, 0.16, 0.06, 0, -0.1, 0.06);
      bx(POLY, 0.035, 0.09, 0.05, 0, -0.06, -0.06);
      bx(STEEL, 0.02, 0.05, 0.18, 0, 0.01, -0.2);
      break;
    default: // vc7 carbine
      bx(POLY, 0.05, 0.085, 0.4, 0, 0, 0.1);
      bx(POLY, 0.045, 0.06, 0.22, 0, 0.005, 0.36);
      bx(STEEL, 0.024, 0.024, 0.14, 0, 0.012, 0.53);
      bx(STEEL, 0.04, 0.15, 0.07, 0, -0.1, 0.02);
      bx(POLY, 0.035, 0.09, 0.05, 0, -0.06, -0.1);
      bx(POLY, 0.045, 0.1, 0.16, 0, -0.01, -0.26);
      bx(STEEL, 0.03, 0.03, 0.1, 0, 0.062, 0.16);
      break;
  }
  const out = new Map<THREE.Material, THREE.BufferGeometry>();
  for (const [mat, geos] of acc) {
    const merged = mergeGeometries(geos, false);
    if (merged) out.set(mat, merged);
  }
  return out;
}

export function worldWeapon(kind: string): THREE.Group {
  let entry = cache.get(kind);
  if (!entry) {
    entry = { geos: buildParts(kind) };
    cache.set(kind, entry);
  }
  const g = new THREE.Group();
  g.name = `worldweapon:${kind}`;
  for (const [mat, geo] of entry.geos) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    g.add(m);
  }
  g.userData.muzzleLocal = new THREE.Vector3(0, 0.01, kind === 'br8' ? 0.64 : kind === 'kis10' ? 0.42 : 0.61);
  return g;
}
