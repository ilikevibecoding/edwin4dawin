// Imperial palette (COORDINATION.md §10). Local copy so Decks 2/3 do not depend on the scaffold's
// PALETTE landing first; values are identical to the shared set and A's keys win once they exist.
import * as THREE from "three";

export const IMP = {
  impWhite: new THREE.Color("#c9ccd1"),
  impGrey: new THREE.Color("#8d9198"),
  impMid: new THREE.Color("#5a5e66"),
  impDark: new THREE.Color("#33363c"),
  impBlack: new THREE.Color("#111214"),
  impRed: new THREE.Color("#ff2a1a"),
  impBlue: new THREE.Color("#3a7bff"),
  impAmber: new THREE.Color("#ffa028"),
  impGreen: new THREE.Color("#38d67a"),
  impHullLight: new THREE.Color("#a7abb1"),
  impHullDark: new THREE.Color("#6f747c"),
  // crew/engineering accents (§11 per-area table)
  medWhite: new THREE.Color("#dfe3e8"),
  medBlue: new THREE.Color("#5aa9ff"),
  engOrange: new THREE.Color("#ff7a1a"),
  teal: new THREE.Color("#3fbfb0"),
  warmWhite: new THREE.Color("#ffd9a8"),
  steel: new THREE.Color("#9ea3aa"),
  white: new THREE.Color("#ffffff"),
};

// Resolve a palette key against the shared PALETTE first, then the local set.
export function col(PALETTE, key) {
  return (PALETTE && PALETTE[key]) || IMP[key] || IMP.impGrey;
}
