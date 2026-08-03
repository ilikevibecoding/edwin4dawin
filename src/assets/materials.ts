import * as THREE from 'three';
import { protectResource } from '../core/dispose';
import {
  corridorWallMap,
  deckPlateMap,
  imperialHullMap,
  microRoughnessMap,
  rebelHullMap,
  softDiscMap,
  windowStripMap,
} from './textures';

/**
 * Shared material library.
 *
 * Materials are created once and reused so the renderer can batch aggressively.
 * They are registered as protected resources: disposing a scene subtree never
 * deletes them.
 */

const lib = new Map<string, THREE.Material>();

function reg<T extends THREE.Material>(key: string, make: () => T): T {
  const hit = lib.get(key) as T | undefined;
  if (hit) return hit;
  const mat = make();
  mat.name = key;
  protectResource(mat);
  lib.set(key, mat);
  return mat;
}

export const PALETTE = {
  rebelHull: 0xe3e1d8,
  rebelHullDark: 0x6c6f72,
  rebelAccent: 0xb03a2a,
  imperialHull: 0x9ba2a8,
  imperialHullDark: 0x5b6268,
  imperialDeck: 0x2a2f34,
  engineBlue: 0x9fd8ff,
  engineRed: 0xff8a4a,
  laserGreen: 0x7cff5a,
  laserRed: 0xff4436,
  saberRed: 0xff2b1f,
  hologram: 0x76d9ff,
  sandLight: 0xd9a566,
  sandDark: 0x9c6b3c,
  sandShadow: 0x6c4426,
  skyAmber: 0xffc27a,
} as const;

// ---------------------------------------------------------------------------
// Exterior hull materials
// ---------------------------------------------------------------------------

export const rebelHull = (): THREE.MeshStandardMaterial =>
  reg('rebelHull', () => {
    const map = rebelHullMap();
    // The albedo map already carries the hull colour; tinting again here
    // would square the value and crush the ship into darkness.
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map,
      roughnessMap: microRoughnessMap(),
      roughness: 0.6,
      metalness: 0.24,
      envMapIntensity: 0.85,
    });
  });

export const rebelHullDark = (): THREE.MeshStandardMaterial =>
  reg('rebelHullDark', () => {
    const map = rebelHullMap();
    return new THREE.MeshStandardMaterial({
      color: 0x9fa3a6,
      map,
      roughness: 0.68,
      metalness: 0.4,
      envMapIntensity: 0.7,
    });
  });

export const rebelAccent = (): THREE.MeshStandardMaterial =>
  reg('rebelAccent', () =>
    new THREE.MeshStandardMaterial({
      color: PALETTE.rebelAccent,
      roughness: 0.6,
      metalness: 0.25,
    }),
  );

export const imperialHull = (): THREE.MeshStandardMaterial =>
  reg('imperialHull', () => {
    const map = imperialHullMap();
    return new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map,
      roughnessMap: microRoughnessMap(),
      roughness: 0.64,
      metalness: 0.3,
      envMapIntensity: 0.75,
    });
  });

export const imperialHullDark = (): THREE.MeshStandardMaterial =>
  reg('imperialHullDark', () =>
    new THREE.MeshStandardMaterial({
      color: 0x8f979e,
      map: imperialHullMap(),
      roughness: 0.72,
      metalness: 0.3,
      envMapIntensity: 0.5,
    }),
  );

/**
 * Recessed channels. Textured and darker than the surrounding plating —
 * an untextured flat colour takes the rim light straight on and the trenches
 * end up reading as bright stripes rather than shadowed cuts.
 */
export const imperialTrench = (): THREE.MeshStandardMaterial =>
  reg('imperialTrench', () =>
    new THREE.MeshStandardMaterial({
      color: 0x6d747a,
      map: imperialHullMap(),
      roughness: 0.88,
      metalness: 0.2,
      envMapIntensity: 0.35,
    }),
  );

export const darkMechanical = (): THREE.MeshStandardMaterial =>
  reg('darkMechanical', () =>
    new THREE.MeshStandardMaterial({
      color: 0x3a3f45,
      roughness: 0.66,
      metalness: 0.55,
    }),
  );

export const gunmetal = (): THREE.MeshStandardMaterial =>
  reg('gunmetal', () =>
    new THREE.MeshStandardMaterial({
      color: 0x484f56,
      roughness: 0.42,
      metalness: 0.85,
    }),
  );

// ---------------------------------------------------------------------------
// Interior materials
// ---------------------------------------------------------------------------

/**
 * Corridor shell. Rendered two-sided: the shell is an open extruded ribbon
 * rather than a closed solid, so single-sided culling would punch holes in the
 * ceiling depending on which way each run was wound.
 */
export const corridorWall = (): THREE.MeshStandardMaterial =>
  reg('corridorWall', () => {
    const map = corridorWallMap();
    map.repeat.set(1, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map,
      roughness: 0.58,
      metalness: 0.06,
      envMapIntensity: 0.4,
      side: THREE.DoubleSide,
    });
    // Baked vertical occlusion. The corridor is lit from ceiling strips, so
    // without this the shell renders as one flat white tube: nine overlapping
    // point lights cannot on their own build the falloff a real cove gives.
    // V carries height above the deck (see `ribbonAlongX`).
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         diffuseColor.rgb *= mix(0.34, 1.0, smoothstep(-0.04, 0.72, vMapUv.y));`,
      );
    };
    mat.customProgramCacheKey = () => 'corridorWall-heightAO';
    return mat;
  });

export const corridorTrim = (): THREE.MeshStandardMaterial =>
  reg('corridorTrim', () =>
    new THREE.MeshStandardMaterial({
      color: 0xb9bdc2,
      roughness: 0.5,
      metalness: 0.08,
      envMapIntensity: 0.5,
    }),
  );

export const corridorFloor = (): THREE.MeshStandardMaterial =>
  reg('corridorFloor', () => {
    const map = deckPlateMap();
    map.repeat.set(2, 8);
    return new THREE.MeshStandardMaterial({
      color: 0x7f858c,
      map,
      roughness: 0.6,
      metalness: 0.16,
      envMapIntensity: 0.4,
    });
  });

export const bulkhead = (): THREE.MeshStandardMaterial =>
  reg('bulkhead', () =>
    new THREE.MeshStandardMaterial({
      color: 0xbfbdb6,
      map: corridorWallMap(),
      roughness: 0.54,
      metalness: 0.09,
      envMapIntensity: 0.4,
    }),
  );

// ---------------------------------------------------------------------------
// Emissive / energy materials
// ---------------------------------------------------------------------------

export function emissive(
  key: string,
  color: number,
  intensity = 2.2,
  opts: { transparent?: boolean; opacity?: number } = {},
): THREE.MeshStandardMaterial {
  return reg(`emissive:${key}`, () =>
    new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: new THREE.Color(color),
      emissiveIntensity: intensity,
      roughness: 1,
      metalness: 0,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
      toneMapped: true,
    }),
  );
}

export function additive(key: string, color: number, opacity = 1): THREE.MeshBasicMaterial {
  return reg(`additive:${key}`, () =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
}

export const engineCore = (): THREE.MeshBasicMaterial => additive('engineCore', 0xdaf0ff, 1);
export const engineHalo = (): THREE.MeshBasicMaterial => additive('engineHalo', 0x5aa8ff, 0.65);
export const rebelEngineCore = (): THREE.MeshBasicMaterial => additive('rebelEngineCore', 0xfff2d8, 1);
export const rebelEngineHalo = (): THREE.MeshBasicMaterial => additive('rebelEngineHalo', 0x8fd0ff, 0.6);

export const windowBand = (): THREE.MeshStandardMaterial =>
  reg('windowBand', () => {
    const map = windowStripMap();
    return new THREE.MeshStandardMaterial({
      color: 0x0a0e13,
      emissive: new THREE.Color(0xbfe0ff),
      emissiveMap: map,
      emissiveIntensity: 1.5,
      map,
      roughness: 0.25,
      metalness: 0.6,
    });
  });

export const glowSprite = (color: number, opacity = 1): THREE.SpriteMaterial =>
  reg(`glowSprite:${color.toString(16)}:${opacity}`, () =>
    new THREE.SpriteMaterial({
      map: softDiscMap(),
      color: new THREE.Color(color),
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );

// ---------------------------------------------------------------------------
// Character materials
// ---------------------------------------------------------------------------

export function figure(key: string, color: number, roughness = 0.6, metalness = 0.05): THREE.MeshStandardMaterial {
  return reg(`figure:${key}`, () =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness }),
  );
}

/** Two-sided cloth for capes, gowns and mantles. */
export function cloth(key: string, color: number, roughness = 0.86): THREE.MeshStandardMaterial {
  return reg(`cloth:${key}`, () =>
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
  );
}

export const CHAR_MATS = {
  trooperArmor: () => figure('trooperArmor', 0xf2f2ef, 0.34, 0.06),
  trooperUnder: () => figure('trooperUnder', 0x15171a, 0.75, 0.05),
  trooperLens: () => figure('trooperLens', 0x0a0c0f, 0.18, 0.4),
  rebelJacket: () => figure('rebelJacket', 0x4d5b45, 0.78, 0.02),
  rebelPants: () => figure('rebelPants', 0x2f3a30, 0.82, 0.02),
  rebelHelmet: () => figure('rebelHelmet', 0x3d4a3c, 0.55, 0.15),
  rebelVest: () => figure('rebelVest', 0xb9ac93, 0.8, 0.02),
  vaderBlack: () => figure('vaderBlack', 0x121215, 0.46, 0.16),
  vaderHelmet: () => figure('vaderHelmet', 0x141418, 0.2, 0.55),
  vaderCape: () => figure('vaderCape', 0x0e0e12, 0.94, 0.0),
  vaderTrim: () => figure('vaderTrim', 0x33333a, 0.32, 0.75),
  leiaWhite: () => figure('leiaWhite', 0xf6f4ee, 0.62, 0.02),
  leiaHair: () => figure('leiaHair', 0x2a1c14, 0.72, 0.03),
  skinLight: () => figure('skinLight', 0xd8ab8c, 0.72, 0.0),
  skinMid: () => figure('skinMid', 0xc0895f, 0.72, 0.0),
  droidBlue: () => figure('droidBlue', 0x2f6fd0, 0.42, 0.25),
  droidWhite: () => figure('droidWhite', 0xe8e9ea, 0.35, 0.2),
  droidSilver: () => figure('droidSilver', 0xa9b0b6, 0.28, 0.85),
  droidGold: () => figure('droidGold', 0xd9a531, 0.24, 0.95),
  droidGoldDark: () => figure('droidGoldDark', 0x8d6a1c, 0.35, 0.9),
  blasterBody: () => figure('blasterBody', 0x17191c, 0.45, 0.55),
} as const;

/** Free every library material — only used by the hard teardown path. */
export function disposeMaterialLibrary(): void {
  for (const mat of lib.values()) mat.dispose();
  lib.clear();
}
