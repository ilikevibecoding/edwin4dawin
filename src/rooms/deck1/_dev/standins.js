// DEV ONLY (Agent B). Stand-ins for the shared Imperial materials/palette that COORDINATION.md §10 says the
// scaffold adds to src/materials.js. Rooms reference the §10 names; this file just makes them exist until
// the real ones land. Deleted with the rest of _dev/ when src/core/registry.js exists.
import * as THREE from "three";
import { makeScreen, makePaintedPanel, makeWornMetal } from "../../../textures.js";

const IMP_HEX = {
  impWhite: "#c9ccd1",
  impGrey: "#8d9198",
  impMid: "#5a5e66",
  impDark: "#33363c",
  impBlack: "#111214",
  impRed: "#ff2a1a",
  impBlue: "#3a7bff",
  impAmber: "#ffa028",
  impGreen: "#38d67a",
  impHullLight: "#a7abb1",
  impHullDark: "#6f747c",
};

export function addStandins(PALETTE, mats) {
  for (const [k, hex] of Object.entries(IMP_HEX)) if (!PALETTE[k]) PALETTE[k] = new THREE.Color(hex);

  const emit = (hex, intensity = 2.2, base = 0x0a0c10) =>
    new THREE.MeshStandardMaterial({ color: base, emissive: new THREE.Color(hex), emissiveIntensity: intensity, roughness: 0.5, metalness: 0 });

  if (!mats.impPanel) {
    const set = makePaintedPanel(512, 131);
    mats.impPanel = new THREE.MeshStandardMaterial({
      map: set.map,
      roughnessMap: set.roughnessMap,
      metalnessMap: set.metalnessMap,
      normalMap: set.normalMap,
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughness: 1,
      metalness: 1,
      vertexColors: true,
      color: 0xffffff,
      envMapIntensity: 0.7,
    });
  }
  if (!mats.impFloor) {
    const set = makeWornMetal(1024, 137);
    mats.impFloor = new THREE.MeshStandardMaterial({
      map: set.map,
      roughnessMap: set.roughnessMap,
      metalnessMap: set.metalnessMap,
      normalMap: set.normalMap,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: 0.9,
      metalness: 0.6,
      vertexColors: true,
      color: 0xffffff,
      envMapIntensity: 0.8,
    });
  }
  if (!mats.blackGloss) mats.blackGloss = new THREE.MeshStandardMaterial({ color: 0x0b0c0f, roughness: 0.18, metalness: 0.35, vertexColors: true, envMapIntensity: 1.0 });
  if (!mats.emitWhite) mats.emitWhite = emit("#e6eeff", 2.4);
  if (!mats.emitBlue) mats.emitBlue = emit("#3a7bff", 2.4);
  if (!mats.emitRedImp) mats.emitRedImp = emit("#ff2a1a", 2.0);
  if (!mats.emitAmber) mats.emitAmber = emit("#ffa028", 2.0);
  if (!mats.emitGreen) mats.emitGreen = emit("#38d67a", 2.0);
  if (!mats.screenImp0) {
    const texes = [makeScreen(512, 256, 201, "#3a7bff", "#ff2a1a"), makeScreen(512, 256, 211, "#ff2a1a", "#ffa028"), makeScreen(512, 256, 223, "#3a7bff", "#38d67a"), makeScreen(512, 256, 233, "#ffa028", "#3a7bff")];
    texes.forEach((tex, i) => {
      mats["screenImp" + i] = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.3, roughness: 0.15, metalness: 0, envMapIntensity: 1.0 });
    });
  }
  if (!mats.holo) mats.holo = new THREE.MeshBasicMaterial({ color: 0x4fd8ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  return mats;
}
