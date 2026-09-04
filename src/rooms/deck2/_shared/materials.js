// Module-local material fallbacks for the Imperial keys promised in COORDINATION.md §10.
// `imperialExtras(shared)` returns ONLY the keys the shared library does not provide yet, built from
// the Kestrel materials, so every Deck 2/3 module renders before and after the scaffold lands.
// Usage in a manifest:  materials: (shared) => imperialExtras(shared)
import * as THREE from "three";
import { IMP } from "./palette.js";

const emissive = (color, intensity, extra = {}) =>
  new THREE.MeshStandardMaterial({
    color: 0x0a0b0d,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
    roughness: 0.5,
    metalness: 0,
    ...extra,
  });

let cache = null;

export function imperialExtras(shared) {
  if (cache && cache.source === shared) return cache.extras;
  const need = (key) => !shared[key];
  const extras = {};

  // Painted light-grey wall panel: the Kestrel painted panel (near-white base) tinted by vertex colour.
  if (need("impPanel") && shared.painted) {
    extras.impPanel = shared.painted.clone();
    extras.impPanel.envMapIntensity = 0.6;
  }
  // Dark deck with a fine grid: worn deck plating pulled down to charcoal.
  if (need("impFloor") && shared.deck) {
    extras.impFloor = shared.deck.clone();
    extras.impFloor.envMapIntensity = 0.7;
  }
  // Command-floor gloss: dark, low roughness, mostly dielectric so it still shows its own colour.
  if (need("blackGloss")) {
    extras.blackGloss = new THREE.MeshStandardMaterial({
      color: 0x14161a,
      roughness: 0.18,
      metalness: 0.35,
      vertexColors: true,
      envMapIntensity: 1.0,
    });
  }
  if (need("emitWhite")) extras.emitWhite = emissive("#dfe9ff", 2.2);
  if (need("emitBlue")) extras.emitBlue = emissive(IMP.impBlue, 2.4);
  if (need("emitRedImp")) extras.emitRedImp = emissive(IMP.impRed, 2.0);
  if (need("emitAmber")) extras.emitAmber = emissive(IMP.impAmber, 2.0);
  if (need("emitGreen")) extras.emitGreen = emissive(IMP.impGreen, 1.8);
  // Imperial UI screens: until A's red/blue wireframe screens exist, reuse the Kestrel screens.
  const screens = shared.screens || [];
  for (let i = 0; i < 4; i++) {
    if (need("screenImp" + i) && screens.length) extras["screenImp" + i] = screens[i % screens.length];
  }
  if (need("holo")) {
    extras.holo = new THREE.MeshBasicMaterial({
      color: 0x4fd8ff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }
  cache = { source: shared, extras };
  return extras;
}

// Individual screen aliases (screen0..3) the way ship.js exposes them, for kits built by a shim.
export function screenAliases(shared) {
  const out = {};
  (shared.screens || []).forEach((m, i) => (out["screen" + i] = m));
  return out;
}
