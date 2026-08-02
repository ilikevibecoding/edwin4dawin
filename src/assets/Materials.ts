import * as THREE from 'three';
import { noiseTexture, panelTexture } from './Textures';

/**
 * Shared material palette.
 *
 * Rebel surfaces are warm off-white and dirty; Imperial surfaces are cold,
 * desaturated and cleaner. Emissive materials are the only things allowed
 * above the bloom threshold.
 */

export interface MaterialLibrary {
  rebelHull: THREE.MeshStandardMaterial;
  rebelHullDark: THREE.MeshStandardMaterial;
  rebelTrim: THREE.MeshStandardMaterial;
  imperialHull: THREE.MeshStandardMaterial;
  imperialHullDark: THREE.MeshStandardMaterial;
  imperialTrim: THREE.MeshStandardMaterial;
  imperialDeep: THREE.MeshStandardMaterial;
  corridorWall: THREE.MeshStandardMaterial;
  corridorPanel: THREE.MeshStandardMaterial;
  corridorFloor: THREE.MeshStandardMaterial;
  corridorTrim: THREE.MeshStandardMaterial;
  blackRubber: THREE.MeshStandardMaterial;
  whiteArmor: THREE.MeshStandardMaterial;
  darkCloth: THREE.MeshStandardMaterial;
  brownCloth: THREE.MeshStandardMaterial;
  leiaWhite: THREE.MeshStandardMaterial;
  vaderBlack: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  droidWhite: THREE.MeshStandardMaterial;
  droidBlue: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  glassDark: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  emissiveIce: THREE.MeshBasicMaterial;
  emissiveAmber: THREE.MeshBasicMaterial;
  emissiveRed: THREE.MeshBasicMaterial;
  emissiveGreen: THREE.MeshBasicMaterial;
  emissiveWarm: THREE.MeshBasicMaterial;
}

let library: MaterialLibrary | null = null;

function std(params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial(params);
}

export function buildMaterials(anisotropy: number): MaterialLibrary {
  if (library) return library;

  const rebelPanels = panelTexture({
    seed: 'rebel-hull',
    base: '#d8d6cf',
    lineColor: 'rgba(70,72,74,0.5)',
    cols: 10,
    rows: 7,
    grime: 0.24,
    streaks: 40,
    scorch: 3,
    size: 512,
  });
  rebelPanels.anisotropy = anisotropy;
  rebelPanels.repeat.set(3, 2);

  const imperialPanels = panelTexture({
    seed: 'imperial-hull',
    base: '#9aa0a6',
    lineColor: 'rgba(46,50,56,0.62)',
    cols: 14,
    rows: 10,
    grime: 0.13,
    streaks: 12,
    scorch: 0,
    size: 512,
  });
  // Tiling is set per surface through the lofted UV scale, so the texture
  // itself stays at 1:1 to avoid a moiré weave on the big hull planes.
  imperialPanels.anisotropy = anisotropy;
  imperialPanels.repeat.set(1, 1);

  const corridorPanels = panelTexture({
    seed: 'corridor',
    base: '#e6e4de',
    lineColor: 'rgba(96,100,106,0.42)',
    cols: 6,
    rows: 4,
    grime: 0.14,
    streaks: 12,
    scorch: 1,
    size: 512,
  });
  corridorPanels.anisotropy = anisotropy;

  const grime = noiseTexture('grime', 256, 5, 1.4);
  grime.repeat.set(4, 4);

  library = {
    rebelHull: std({
      color: 0xe9e7e0,
      map: rebelPanels,
      roughnessMap: grime,
      roughness: 0.72,
      metalness: 0.22,
    }),
    rebelHullDark: std({ color: 0x8d8b84, roughness: 0.68, metalness: 0.35 }),
    rebelTrim: std({ color: 0x4b4a48, roughness: 0.5, metalness: 0.6 }),

    imperialHull: std({
      color: 0xb6bcc3,
      map: imperialPanels,
      roughnessMap: grime,
      roughness: 0.58,
      metalness: 0.24,
    }),
    imperialHullDark: std({ color: 0x878d95, roughness: 0.56, metalness: 0.3 }),
    imperialTrim: std({ color: 0x5a6069, roughness: 0.44, metalness: 0.5 }),
    imperialDeep: std({ color: 0x33383e, roughness: 0.78, metalness: 0.2 }),

    corridorWall: std({
      color: 0xf0eee8,
      map: corridorPanels,
      roughness: 0.62,
      metalness: 0.06,
    }),
    corridorPanel: std({ color: 0xd9d7d0, roughness: 0.55, metalness: 0.12 }),
    corridorFloor: std({ color: 0x9fa2a6, roughness: 0.78, metalness: 0.14 }),
    corridorTrim: std({ color: 0x5c5f64, roughness: 0.42, metalness: 0.55 }),

    blackRubber: std({ color: 0x121317, roughness: 0.86, metalness: 0.05 }),
    whiteArmor: std({ color: 0xdbdfe6, roughness: 0.36, metalness: 0.05 }),
    darkCloth: std({ color: 0x2b2f36, roughness: 0.92, metalness: 0.02 }),
    brownCloth: std({ color: 0x5d4a35, roughness: 0.9, metalness: 0.02 }),
    leiaWhite: std({ color: 0xf7f6f2, roughness: 0.68, metalness: 0.02 }),
    vaderBlack: std({ color: 0x0d0e11, roughness: 0.3, metalness: 0.42 }),
    gold: std({ color: 0xd9a441, roughness: 0.24, metalness: 0.92 }),
    droidWhite: std({ color: 0xeceff2, roughness: 0.28, metalness: 0.34 }),
    droidBlue: std({ color: 0x2f6fb5, roughness: 0.3, metalness: 0.38 }),
    chrome: std({ color: 0xb9c0c8, roughness: 0.18, metalness: 0.95 }),
    glassDark: std({ color: 0x0a0d12, roughness: 0.12, metalness: 0.6 }),
    skin: std({ color: 0xd8a887, roughness: 0.72, metalness: 0.0 }),

    emissiveIce: new THREE.MeshBasicMaterial({ color: 0x9fd8ff, toneMapped: false }),
    emissiveAmber: new THREE.MeshBasicMaterial({ color: 0xffb44a, toneMapped: false }),
    emissiveRed: new THREE.MeshBasicMaterial({ color: 0xff4433, toneMapped: false }),
    emissiveGreen: new THREE.MeshBasicMaterial({ color: 0x6dff8a, toneMapped: false }),
    emissiveWarm: new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false }),
  };
  return library;
}

export function getMaterials(): MaterialLibrary {
  if (!library) throw new Error('Material library requested before initialisation.');
  return library;
}

export function disposeMaterials(): void {
  if (!library) return;
  Object.values(library).forEach((m) => (m as THREE.Material).dispose());
  library = null;
}
