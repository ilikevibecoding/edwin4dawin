// DEV ONLY (Agent D). Fills in the §10 material/palette names the integrator's scaffold will add to
// src/materials.js, but only where they are missing, so the real ones win the moment they land.
// Nothing here is imported by any deliverable module.
import * as THREE from "three";
import { makeScreen } from "../../textures.js";

const IMP_COLOURS = {
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

function emitter(color, intensity, base = 0x0a0a0c) {
  return new THREE.MeshStandardMaterial({ color: base, emissive: new THREE.Color(color), emissiveIntensity: intensity, roughness: 0.5, metalness: 0 });
}

export function extendPalette(PALETTE) {
  for (const [k, v] of Object.entries(IMP_COLOURS)) if (!PALETTE[k]) PALETTE[k] = new THREE.Color(v);
  return PALETTE;
}

export function extendMaterials(mats) {
  const add = (key, make) => {
    if (!mats[key]) mats[key] = make();
  };
  // individual screen aliases the Kestrel builder created locally
  if (mats.screens && Array.isArray(mats.screens)) mats.screens.forEach((m, i) => add("screen" + i, () => m));
  add("blackGloss", () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.18, metalness: 0.35, vertexColors: true, envMapIntensity: 1.0 }));
  add("impPanel", () => mats.painted);
  add("impFloor", () => mats.deck);
  add("emitWhite", () => emitter("#e8f0ff", 2.4));
  add("emitBlue", () => emitter("#3a7bff", 2.6));
  add("emitRedImp", () => emitter("#ff2a1a", 2.2));
  add("emitAmber", () => emitter("#ffa028", 2.2));
  add("emitGreen", () => emitter("#38d67a", 2.0));
  const impScreens = [
    [131, "#3a7bff", "#ff2a1a"],
    [137, "#ff2a1a", "#3a7bff"],
    [149, "#3a7bff", "#ffa028"],
    [151, "#8fb4ff", "#ff2a1a"],
  ];
  impScreens.forEach(([seed, a, w], i) =>
    add("screenImp" + i, () => {
      const tex = makeScreen(512, 256, seed, a, w);
      return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.3, roughness: 0.15, metalness: 0 });
    }),
  );
  add(
    "holo",
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color("#4fd8ff"),
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexColors: true,
      }),
  );
  return mats;
}
