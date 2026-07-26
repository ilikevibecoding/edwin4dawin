import * as THREE from 'three';
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

function bx(mat: THREE.Material, w: number, h: number, d: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function worldWeapon(kind: string): THREE.Group {
  const g = new THREE.Group();
  g.name = `worldweapon:${kind}`;
  switch (kind) {
    case 'br8': {
      g.add(bx(STEEL, 0.045, 0.07, 0.3, 0, 0, 0.1));
      g.add(bx(STEEL, 0.03, 0.03, 0.42, 0, 0.015, 0.42));
      g.add(bx(WOOD, 0.05, 0.05, 0.14, 0, -0.03, 0.32));
      g.add(bx(WOOD, 0.045, 0.09, 0.22, 0, -0.02, -0.2));
      break;
    }
    case 'kis10': {
      g.add(bx(POLY, 0.05, 0.08, 0.34, 0, 0, 0.08));
      g.add(bx(STEEL, 0.026, 0.026, 0.16, 0, 0.01, 0.32));
      g.add(bx(STEEL, 0.035, 0.16, 0.06, 0, -0.1, 0.06));
      g.add(bx(POLY, 0.035, 0.09, 0.05, 0, -0.06, -0.06));
      g.add(bx(STEEL, 0.02, 0.05, 0.18, 0, 0.01, -0.2));
      break;
    }
    default: { // vc7 carbine
      g.add(bx(POLY, 0.05, 0.085, 0.4, 0, 0, 0.1));
      g.add(bx(POLY, 0.045, 0.06, 0.22, 0, 0.005, 0.36));
      g.add(bx(STEEL, 0.024, 0.024, 0.14, 0, 0.012, 0.53));
      g.add(bx(STEEL, 0.04, 0.15, 0.07, 0, -0.1, 0.02));
      g.add(bx(POLY, 0.035, 0.09, 0.05, 0, -0.06, -0.1));
      g.add(bx(POLY, 0.045, 0.1, 0.16, 0, -0.01, -0.26));
      g.add(bx(STEEL, 0.03, 0.03, 0.1, 0, 0.062, 0.16)); // optic
      break;
    }
  }
  g.userData.muzzleLocal = new THREE.Vector3(0, 0.01, kind === 'br8' ? 0.64 : kind === 'kis10' ? 0.42 : 0.61);
  return g;
}
