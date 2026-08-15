import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import {
  fabricAlbedo,
  metalAlbedo,
  metalRough,
  paintAlbedo,
  paintNormal,
  paintRough,
  rubberAlbedo,
  tireAlbedo,
  tireNormal,
} from '../textures.js';

export function createVehicleMaterials(env) {
  const paintMap = paintAlbedo();
  paintMap.repeat.set(2, 2);
  const paintR = paintRough();
  paintR.repeat.set(2, 2);
  const paintN = paintNormal();
  paintN.repeat.set(2, 2);

  const metalMap = metalAlbedo();
  const metalR = metalRough();
  const rubberMap = rubberAlbedo();
  const tireMap = tireAlbedo();
  tireMap.flipY = false;
  tireMap.repeat.set(1, 3);
  const tireN = tireNormal();
  tireN.flipY = false;
  tireN.repeat.set(1, 3);
  const fabric = fabricAlbedo();

  const common = {
    envMap: env,
    envMapIntensity: 0.55,
  };

  return {
    paint: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: paintMap,
      roughnessMap: paintR,
      normalMap: paintN,
      roughness: 0.24,
      metalness: 0.12,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      ...common,
      envMapIntensity: 0.74,
    }),
    blackout: new THREE.MeshStandardMaterial({
      color: PALETTE.blackout,
      roughness: 0.7,
      metalness: 0.12,
      ...common,
      envMapIntensity: 0.32,
    }),
    plastic: new THREE.MeshStandardMaterial({
      color: PALETTE.plastic,
      roughness: 0.78,
      metalness: 0.04,
      ...common,
      envMapIntensity: 0.25,
    }),
    steel: new THREE.MeshStandardMaterial({
      color: PALETTE.steel,
      map: metalMap,
      roughnessMap: metalR,
      roughness: 0.42,
      metalness: 0.72,
      ...common,
      envMapIntensity: 0.7,
    }),
    chrome: new THREE.MeshStandardMaterial({
      color: PALETTE.chrome,
      roughness: 0.18,
      metalness: 0.85,
      ...common,
      envMapIntensity: 0.9,
    }),
    rusty: new THREE.MeshStandardMaterial({
      color: PALETTE.rusty,
      map: metalMap,
      roughness: 0.7,
      metalness: 0.35,
      ...common,
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: PALETTE.rubber,
      map: rubberMap,
      roughness: 0.88,
      metalness: 0.02,
      ...common,
      envMapIntensity: 0.2,
    }),
    tire: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tireMap,
      normalMap: tireN,
      roughness: 0.86,
      metalness: 0.0,
      ...common,
      envMapIntensity: 0.18,
    }),
    rim: new THREE.MeshStandardMaterial({
      color: 0x3a3a38,
      roughness: 0.35,
      metalness: 0.55,
      ...common,
      envMapIntensity: 0.55,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: PALETTE.glass,
      roughness: 0.08,
      metalness: 0.0,
      transmission: 0.55,
      thickness: 0.04,
      transparent: true,
      opacity: 0.55,
      ...common,
      envMapIntensity: 1.0,
    }),
    fabric: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: fabric,
      roughness: 0.92,
      metalness: 0.0,
      ...common,
      envMapIntensity: 0.2,
    }),
    headlight: new THREE.MeshStandardMaterial({
      color: 0xfff6e0,
      emissive: PALETTE.headlight,
      emissiveIntensity: 1.8,
      roughness: 0.15,
      metalness: 0.1,
    }),
    lens: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.4,
      transparent: true,
      opacity: 0.65,
      ...common,
    }),
    amber: new THREE.MeshStandardMaterial({
      color: PALETTE.amber,
      emissive: PALETTE.amber,
      emissiveIntensity: 1.4,
      roughness: 0.3,
    }),
    tail: new THREE.MeshStandardMaterial({
      color: PALETTE.tail,
      emissive: PALETTE.tail,
      emissiveIntensity: 1.5,
      roughness: 0.28,
    }),
    led: new THREE.MeshStandardMaterial({
      color: PALETTE.led,
      emissive: PALETTE.led,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    }),
  };
}

export function setVehicleEnv(materials, env) {
  for (const m of Object.values(materials)) {
    if (m.envMap !== undefined) {
      m.envMap = env;
      m.needsUpdate = true;
    }
  }
}
