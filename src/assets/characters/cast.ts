import * as THREE from 'three';
import type { MaterialLibrary } from '../materials';
import { PALETTE } from '../materials';
import { Character, type CharacterOptions, type CharacterSpec } from './CharacterRig';

/**
 * The cast.
 *
 * Each entry is a colour and silhouette recipe rather than a model file. The
 * shapes are original stylised interpretations: what makes them readable is the
 * value contrast (white armour vs dark rebel fatigues vs pure black), the
 * helmet silhouette, and how each one carries itself.
 */

export const STORMTROOPER_SPEC: CharacterSpec = {
  name: 'Imperial stormtrooper',
  height: 1.85,
  bulk: 1.16,
  helmet: 'trooper',
  weapon: 'rifle',
  roughness: 0.34,
  metalness: 0.08,
  colors: {
    head: PALETTE.stormtrooperWhite,
    visor: 0x1b1c20,
    torso: PALETTE.stormtrooperWhite,
    arms: 0xe2e2e4,
    legs: PALETTE.stormtrooperWhite,
    belt: 0x1e1f23,
    accent: 0x141519,
  },
};

export const REBEL_SPEC: CharacterSpec = {
  name: 'Rebel trooper',
  height: 1.79,
  bulk: 1.0,
  helmet: 'rebel',
  weapon: 'blaster',
  roughness: 0.72,
  metalness: 0.06,
  colors: {
    head: 0x2b2f34,
    torso: 0x7a7263,
    arms: 0x585245,
    legs: 0x3e3b35,
    belt: 0x24211e,
    accent: 0x2a2e34,
  },
};

export const REBEL_OFFICER_SPEC: CharacterSpec = {
  ...REBEL_SPEC,
  name: 'Rebel officer',
  colors: {
    head: 0x35302a,
    torso: 0x6d6455,
    arms: 0x585144,
    legs: 0x3d3a34,
    belt: 0x24211e,
    accent: 0x8d3a2a,
  },
};

export const VADER_SPEC: CharacterSpec = {
  name: 'Dark Lord',
  height: 2.03,
  bulk: 1.2,
  helmet: 'vader',
  weapon: 'saber',
  cape: true,
  roughness: 0.22,
  metalness: 0.5,
  colors: {
    head: 0x1a1c22,
    torso: 0x15171d,
    arms: 0x191b21,
    legs: 0x161820,
    belt: 0x24262d,
    accent: 0x33363e,
  },
};

export const LEIA_SPEC: CharacterSpec = {
  name: 'Princess Leia',
  height: 1.62,
  bulk: 0.88,
  helmet: 'none',
  hair: 'buns',
  skirt: true,
  weapon: 'none',
  roughness: 0.68,
  metalness: 0.03,
  colors: {
    head: 0xd8ab8c,
    torso: PALETTE.leiaWhite,
    arms: PALETTE.leiaWhite,
    legs: PALETTE.leiaWhite,
    belt: 0xd8d3c6,
    accent: 0xe8e4da,
  },
};

export function createStormtrooper(lib: MaterialLibrary, options: CharacterOptions, index: number): Character {
  return new Character(lib, { ...STORMTROOPER_SPEC, name: `Imperial stormtrooper ${index + 1}` }, options);
}

export function createRebel(lib: MaterialLibrary, options: CharacterOptions, index: number, officer = false): Character {
  const spec = officer ? REBEL_OFFICER_SPEC : REBEL_SPEC;
  return new Character(lib, { ...spec, name: officer ? 'Rebel officer' : `Rebel trooper ${index + 1}` }, options);
}

export function createVader(lib: MaterialLibrary, options: CharacterOptions): Character {
  const c = new Character(lib, VADER_SPEC, options);
  // Chest control box and shoulder-to-belt harness: the most recognisable
  // silhouette cue after the helmet.
  const chest = c.joints.chest;
  const panel = new THREE.Mesh(
    lib.registry.track(new THREE.BoxGeometry(0.19, 0.13, 0.06)),
    lib.character(0x1a1c21, 0.35, 0.55),
  );
  panel.position.set(0, 0.17, 0.15);
  chest.add(panel);
  const leds: Array<[number, number, number]> = [
    [-0.055, 0.2, 0xff3a2a], [0.0, 0.2, 0x6fe08a], [0.055, 0.2, 0x6fc8ff],
    [-0.03, 0.15, 0xffd166], [0.03, 0.15, 0xff6a4a],
  ];
  for (const [x, y, color] of leds) {
    const led = new THREE.Mesh(
      lib.registry.track(new THREE.BoxGeometry(0.02, 0.014, 0.008)),
      lib.energy(color),
    );
    led.position.set(x, y, 0.182);
    chest.add(led);
  }
  const belt = new THREE.Mesh(
    lib.registry.track(new THREE.BoxGeometry(0.34, 0.07, 0.24)),
    lib.character(0x1c1d22, 0.4, 0.5),
  );
  belt.position.y = 0.03;
  c.joints.hips.add(belt);
  for (const side of [-1, 1]) {
    const strap = new THREE.Mesh(
      lib.registry.track(new THREE.BoxGeometry(0.05, 0.34, 0.03)),
      lib.character(0x17181c, 0.5, 0.4),
    );
    strap.position.set(side * 0.1, 0.14, 0.135);
    strap.rotation.z = side * 0.16;
    chest.add(strap);
  }
  return c;
}

export function createLeia(lib: MaterialLibrary, options: CharacterOptions): Character {
  const c = new Character(lib, LEIA_SPEC, options);
  // Hooded collar and belt detail.
  const collar = new THREE.Mesh(
    lib.registry.track(new THREE.CylinderGeometry(0.115, 0.15, 0.14, 12, 1, true)),
    lib.character(PALETTE.leiaWhite, 0.7, 0.02),
  );
  collar.material.side = THREE.DoubleSide;
  collar.position.y = 0.3;
  collar.castShadow = true;
  c.joints.chest.add(collar);
  const buckle = new THREE.Mesh(
    lib.registry.track(new THREE.BoxGeometry(0.09, 0.05, 0.03)),
    lib.character(0xb9b2a2, 0.45, 0.5),
  );
  buckle.position.set(0, 0.055, 0.1);
  c.joints.hips.add(buckle);
  return c;
}
