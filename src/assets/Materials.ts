import * as THREE from 'three';
import { noiseTexture, panelTexture, platingTextures, type PlatingSet } from './Textures';

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
  /** Slightly cooler than the hull: raised plates that must not read as holes. */
  rebelPlate: THREE.MeshStandardMaterial;
  /** Surface machinery: carries the hull's plating so blocks never read clean. */
  rebelGreeble: THREE.MeshStandardMaterial;
  rebelTrim: THREE.MeshStandardMaterial;
  /** Inside of an engine bell: back faces only, so the throat reads as a hole. */
  bellInterior: THREE.MeshStandardMaterial;
  imperialHull: THREE.MeshStandardMaterial;
  /** Untextured imperial grey for large slabs the plating tile cannot serve. */
  imperialPlate: THREE.MeshStandardMaterial;
  imperialHullDark: THREE.MeshStandardMaterial;
  /** Surface machinery: carries the hull's plating so blocks never read clean. */
  imperialGreeble: THREE.MeshStandardMaterial;
  /** Gun emplacements: matte and dark, so they read as studs, not sugar cubes. */
  imperialTurret: THREE.MeshStandardMaterial;
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
  /** Rebel flight fatigues: light enough to read against the dark vest. */
  rebelKhaki: THREE.MeshStandardMaterial;
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

/** Apply filtering settings to every channel of a plating set. */
function tuneSet(set: PlatingSet, anisotropy: number, repeat: [number, number] = [1, 1]): PlatingSet {
  for (const t of [set.map, set.normalMap, set.roughnessMap]) {
    t.anisotropy = anisotropy;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return set;
}

export function buildMaterials(anisotropy: number): MaterialLibrary {
  if (library) return library;

  // Hull tiling is driven by each surface's UV scale so a tile is roughly a
  // hundred units across whatever the ship; the textures stay at 1:1.
  const rebelPlating = tuneSet(
    platingTextures({
      seed: 'rebel-hull',
      base: '#dedbd2',
      variation: 0.09,
      relief: 0.55,
      majorCols: 5,
      majorRows: 4,
      fittings: 20,
      grime: 0.22,
      streaks: 26,
    }),
    anisotropy,
  );

  const imperialPlating = tuneSet(
    platingTextures({
      seed: 'imperial-hull',
      base: '#aab0b6',
      variation: 0.07,
      relief: 0.7,
      majorCols: 7,
      majorRows: 6,
      fittings: 26,
      grime: 0.1,
      streaks: 10,
    }),
    anisotropy,
  );

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
      color: 0xf2efe6,
      map: rebelPlating.map,
      normalMap: rebelPlating.normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: rebelPlating.roughnessMap,
      roughness: 0.74,
      metalness: 0.16,
      envMapIntensity: 0.7,
    }),
    rebelHullDark: std({ color: 0x8d8b84, roughness: 0.68, metalness: 0.35, envMapIntensity: 0.7 }),
    rebelPlate: std({ color: 0xcbc7bd, roughness: 0.74, metalness: 0.18, envMapIntensity: 0.7 }),
    // Detail blocks have to sit a clear value step below the plate they stand
    // on and share its texture, or a hundred clean untextured boxes read as
    // white stickers pasted over a dirty hull.
    rebelGreeble: std({
      color: 0x8b867d,
      map: rebelPlating.map,
      roughness: 0.84,
      metalness: 0.12,
      envMapIntensity: 0.4,
    }),
    // Low metalness on purpose: a polished disc the width of the stern turns
    // into a mirror of the sky and reads as a ball stuck to the hull.
    rebelTrim: std({ color: 0x5b5954, roughness: 0.66, metalness: 0.28, envMapIntensity: 0.5 }),
    bellInterior: std({
      color: 0x26282c,
      roughness: 0.85,
      metalness: 0.2,
      side: THREE.BackSide,
      envMapIntensity: 0.25,
    }),

    imperialHull: std({
      color: 0xc2c7cc,
      map: imperialPlating.map,
      normalMap: imperialPlating.normalMap,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughnessMap: imperialPlating.roughnessMap,
      roughness: 0.62,
      metalness: 0.16,
      // Imperial grey has to stay grey even with a lit desert filling half the
      // sky, so these surfaces take a deliberately small share of the IBL.
      envMapIntensity: 0.42,
    }),
    imperialPlate: std({
      color: 0xb4bac0,
      roughness: 0.68,
      metalness: 0.12,
      envMapIntensity: 0.38,
    }),
    imperialHullDark: std({
      color: 0x8d949c,
      roughness: 0.6,
      metalness: 0.22,
      envMapIntensity: 0.4,
    }),
    imperialGreeble: std({
      color: 0x767d85,
      map: imperialPlating.map,
      roughness: 0.78,
      metalness: 0.12,
      envMapIntensity: 0.28,
    }),
    // Matte and dark. At metalness 0.4 a turret cap mirrors the lit planet and
    // the belly ends up flecked with white cubes during the reveal.
    imperialTurret: std({
      color: 0x555b63,
      roughness: 0.72,
      metalness: 0.1,
      envMapIntensity: 0.2,
    }),
    imperialTrim: std({ color: 0x646a72, roughness: 0.46, metalness: 0.4, envMapIntensity: 0.4 }),
    imperialDeep: std({ color: 0x33383e, roughness: 0.8, metalness: 0.18, envMapIntensity: 0.3 }),

    corridorWall: std({
      color: 0xf0eee8,
      map: corridorPanels,
      roughnessMap: grime,
      roughness: 0.62,
      metalness: 0.06,
    }),
    corridorPanel: std({ color: 0xd9d7d0, roughness: 0.55, metalness: 0.12 }),
    corridorFloor: std({ color: 0x9fa2a6, roughness: 0.78, metalness: 0.14 }),
    corridorTrim: std({ color: 0x5c5f64, roughness: 0.42, metalness: 0.55 }),

    blackRubber: std({ color: 0x121317, roughness: 0.86, metalness: 0.05 }),
    whiteArmor: std({ color: 0xdbdfe6, roughness: 0.36, metalness: 0.05 }),
    darkCloth: std({ color: 0x232a35, roughness: 0.92, metalness: 0.02 }),
    brownCloth: std({ color: 0x5d4a35, roughness: 0.9, metalness: 0.02 }),
    rebelKhaki: std({ color: 0x9a8a68, roughness: 0.9, metalness: 0.02 }),
    leiaWhite: std({ color: 0xf7f6f2, roughness: 0.68, metalness: 0.02 }),
    // Barely metallic. At metalness 0.42 the costume mirrors the corridor's
    // alert strobes and the darkest figure in the story reads as red plastic.
    vaderBlack: std({ color: 0x0b0c0f, roughness: 0.44, metalness: 0.14, envMapIntensity: 0.4 }),
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
