import * as THREE from 'three';
import {
  deckTexture,
  flagTexture,
  hullTexture,
  nameBoardTexture,
  ropeTexture,
  sailTexture,
} from './textures.js';

/** Shared materials, created once and reused across the whole ship. */
export function createMaterials() {
  const hullMap = hullTexture();
  const deckMap = deckTexture();
  const sailMap = sailTexture();
  const tarpMap = ropeTexture();

  return {
    hull: new THREE.MeshStandardMaterial({ map: hullMap, roughness: 0.88, metalness: 0.02 }),
    deck: new THREE.MeshStandardMaterial({ map: deckMap, roughness: 0.82, metalness: 0.0 }),
    timber: new THREE.MeshStandardMaterial({ color: '#7a5630', roughness: 0.85 }),
    darkTimber: new THREE.MeshStandardMaterial({ color: '#3f2c1a', roughness: 0.9 }),
    trim: new THREE.MeshStandardMaterial({ color: '#c8923a', roughness: 0.45, metalness: 0.5 }),
    // A little emissive stands in for sunlight bleeding through the canvas, so
    // the shaded side of a sail does not read as cold grey.
    sail: new THREE.MeshStandardMaterial({
      map: sailMap,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
      color: '#f6efdd',
      emissive: '#4a4132',
      emissiveIntensity: 0.32,
    }),
    flag: new THREE.MeshStandardMaterial({
      map: flagTexture(),
      roughness: 0.9,
      side: THREE.DoubleSide,
      transparent: true,
    }),
    tarp: new THREE.MeshStandardMaterial({ map: tarpMap, roughness: 0.95, side: THREE.DoubleSide }),
    rope: new THREE.LineBasicMaterial({ color: '#5c4a2c', transparent: true, opacity: 0.9 }),
    iron: new THREE.MeshStandardMaterial({ color: '#4b4c54', roughness: 0.5, metalness: 0.8 }),
    nameBoard: new THREE.MeshStandardMaterial({ map: nameBoardTexture(), roughness: 0.6 }),
    brass: new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.3, metalness: 0.9 }),
    glass: new THREE.MeshStandardMaterial({
      color: '#ffcf7a',
      emissive: '#ff9a3c',
      emissiveIntensity: 0.9,
      roughness: 0.25,
    }),
    black: new THREE.MeshStandardMaterial({ color: '#191512', roughness: 0.7 }),
  };
}
