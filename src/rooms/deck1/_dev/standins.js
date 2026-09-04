// DEV ONLY (Agent B). Stand-ins for the shared Imperial materials/palette that COORDINATION.md §10 says the
// scaffold adds to src/materials.js. Rooms reference the §10 names; this file just makes them exist until
// the real ones land. Deleted with the rest of _dev/ when src/core/registry.js exists.
import * as THREE from "three";
import { makeScreen, makePaintedPanel } from "../../../textures.js";

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
    // pull the Kestrel panel's dents/grime/smudges 55 % toward flat paint: at the darker officers'/observation tints
    // they read as mould blotches and yellow stains (critic round 2); A's real impPanel should be clean above knee height
    const img = set.map.image;
    const g = img.getContext("2d");
    g.fillStyle = "rgba(235, 235, 233, 0.55)";
    g.fillRect(0, 0, img.width, img.height);
    set.map.needsUpdate = true;
    // the dark blotches were the flaked dents: metalness (B) > 0 inside them renders as black spots and their
    // roughness (G) bumps read as smudges under grazing strip light — pull both 75 % toward flat paint
    const rm = set.roughnessMap.image;
    const g2 = rm.getContext("2d");
    g2.fillStyle = "rgba(0, 128, 0, 0.75)";
    g2.fillRect(0, 0, rm.width, rm.height);
    set.roughnessMap.needsUpdate = true;
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
    // clean dark deck with a faint reflection; A's real impFloor ("dark deck, fine grid") replaces this
    mats.impFloor = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.25, vertexColors: true, color: 0xffffff, envMapIntensity: 0.9 });
  }
  if (!mats.blackGloss) mats.blackGloss = new THREE.MeshStandardMaterial({ color: 0x0b0c0f, roughness: 0.3, metalness: 0.35, vertexColors: true, envMapIntensity: 1.0 }); // 0.3, not 0.18: pool points 3 m up mirrored as white blobs on corridor centre strips and table tops
  // 1.35–1.6: under ACES + bloom threshold 1.15 anything ≥ 1.7 clips to white with a halo (critic rounds 1 and 2);
  // these still read as lit lenses/strips, not as grey plastic
  if (!mats.emitWhite) mats.emitWhite = emit("#e6eeff", 1.35);
  if (!mats.emitBlue) mats.emitBlue = emit("#3a7bff", 1.55);
  if (!mats.emitRedImp) mats.emitRedImp = emit("#ff2a1a", 1.4);
  if (!mats.emitAmber) mats.emitAmber = emit("#ffa028", 1.4);
  if (!mats.emitGreen) mats.emitGreen = emit("#38d67a", 1.6);
  if (!mats.screenImp0) {
    const texes = [makeScreen(512, 256, 201, "#3a7bff", "#ff2a1a"), makeScreen(512, 256, 211, "#ff2a1a", "#ffa028"), makeScreen(512, 256, 223, "#3a7bff", "#38d67a"), makeScreen(512, 256, 233, "#ffa028", "#3a7bff")];
    texes.forEach((tex, i) => {
      mats["screenImp" + i] = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.3, roughness: 0.42, metalness: 0, envMapIntensity: 0.4 }); // anti-glare (0.15 mirrored pool spots as white blobs)
    });
  }
  if (!mats.holo) mats.holo = new THREE.MeshBasicMaterial({ color: 0x4fd8ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  return mats;
}
