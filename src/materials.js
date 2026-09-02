// Builds the shared PBR material library from procedural textures.
import * as THREE from "three";
import {
  makePaintedPanel,
  makeWornMetal,
  makeDeckPlate,
  makeRubber,
  makeFabric,
  makeHazard,
  makeScreen,
  makeLedStrip,
  makeDecalSheet,
  makeGrate,
  makeDiffuser,
} from "./textures.js";

export const PALETTE = {
  cream: new THREE.Color("#e2d9c6"),
  creamDark: new THREE.Color("#b9b0a0"),
  orange: new THREE.Color("#e9782f"),
  tealPaint: new THREE.Color("#5d8a86"),
  slate: new THREE.Color("#6b7079"),
  gunmetal: new THREE.Color("#4a4e55"),
  darkMetal: new THREE.Color("#2b2e33"),
  steel: new THREE.Color("#9ea3aa"),
  brass: new THREE.Color("#b58a4a"),
  rubber: new THREE.Color("#ffffff"),
  fabricCream: new THREE.Color("#d9cfbd"),
  fabricTeal: new THREE.Color("#3f8c86"),
  fabricOrange: new THREE.Color("#d8722f"),
  teal: new THREE.Color("#4fd8cc"),
  warm: new THREE.Color("#ffc78a"),
};

export function buildMaterials() {
  const painted = makePaintedPanel(512, 11);
  const painted1 = makePaintedPanel(512, 47);
  const painted2 = makePaintedPanel(512, 83);
  const metal = makeWornMetal(1024, 23);
  const grate = makeGrate(1024, 768, 61);
  const deck = makeDeckPlate(1024, 41);
  const rubber = makeRubber(256, 53);
  const fabric = makeFabric(256, 67);
  const hazard = makeHazard(256, 71);
  const diffuser = makeDiffuser(256, 13);

  const std = (set, extra = {}) =>
    new THREE.MeshStandardMaterial({
      map: set.map,
      roughnessMap: set.roughnessMap,
      metalnessMap: set.metalnessMap,
      normalMap: set.normalMap,
      roughness: 1,
      metalness: 1,
      vertexColors: true,
      color: 0xffffff,
      ...extra,
    });

  const mats = {
    // Painted hull panels (tint from vertex colors); three wear variants
    painted: std(painted, { normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 0.8 }),
    painted1: std(painted1, { normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 0.8 }),
    painted2: std(painted2, { normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 0.8 }),
    // Structural / trim metal (tint from vertex colors)
    metal: std(metal, { normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.85 }),
    // Cast / sand-blasted metal: same wear, but the roughness map is pushed up so point lights spread
    // into a soft sheen instead of a hot ring (porthole frames, fixtures, appliance bezels)
    metalRough: std(metal, { normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1.7, envMapIntensity: 0.7 }),
    // Dark painted structural steel (ribs, beams, housings): the worn-metal maps for wear, but
    // dielectric — a bare-metal box that reflects nothing but a dim interior reads as a black hole
    paintedMetal: std(metal, { normalScale: new THREE.Vector2(0.6, 0.6), metalness: 0.15, roughness: 1.15, envMapIntensity: 0.6 }),
    // Floor grating: cut-out texture on a single quad (mipmapped, so no distance moiré)
    grate: std(grate, {
      normalScale: new THREE.Vector2(1.0, 1.0),
      envMapIntensity: 0.8,
      transparent: true,
      depthWrite: true,
      alphaTest: 0,
      side: THREE.DoubleSide,
    }),
    // Deck plating
    deck: std(deck, { normalScale: new THREE.Vector2(1.0, 1.0), envMapIntensity: 1.0 }),
    // Rubber / plastics
    rubber: std(rubber, { normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.4 }),
    // Fabric (tinted by vertex colors)
    fabric: std(fabric, { normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 0.3 }),
    // Hazard stripes
    hazard: std(hazard, { normalScale: new THREE.Vector2(0.4, 0.4), envMapIntensity: 0.6 }),

    // Emissives — intensity animated by the lighting controller (rest cycle)
    emitTeal: new THREE.MeshStandardMaterial({
      color: 0x0a1a1a,
      emissive: PALETTE.teal,
      emissiveIntensity: 2.4,
      roughness: 0.4,
      metalness: 0,
    }),
    emitWarm: new THREE.MeshStandardMaterial({
      color: 0x1a1410,
      emissive: PALETTE.warm,
      emissiveIntensity: 1.7,
      roughness: 0.5,
      metalness: 0,
    }),
    emitOrange: new THREE.MeshStandardMaterial({
      color: 0x1a0a04,
      emissive: PALETTE.orange,
      emissiveIntensity: 2.0,
      roughness: 0.5,
      metalness: 0,
    }),
    emitRed: new THREE.MeshStandardMaterial({
      color: 0x100404,
      emissive: new THREE.Color("#ff3a2a"),
      emissiveIntensity: 1.8,
      roughness: 0.5,
      metalness: 0,
    }),
    emitCool: new THREE.MeshStandardMaterial({
      color: 0x0a0e14,
      emissive: new THREE.Color("#cfe4ff"),
      emissiveIntensity: 2.2,
      roughness: 0.5,
      metalness: 0,
    }),
    // Fixture diffusers: same emitters with a centre-bright falloff map (uv "keep" per emitter face)
    emitWarmSoft: new THREE.MeshStandardMaterial({
      color: 0x1a1410,
      emissive: PALETTE.warm,
      emissiveMap: diffuser,
      emissiveIntensity: 1.9,
      roughness: 0.5,
      metalness: 0,
    }),
    emitCoolSoft: new THREE.MeshStandardMaterial({
      color: 0x0a0e14,
      emissive: new THREE.Color("#cfe4ff"),
      emissiveMap: diffuser,
      emissiveIntensity: 2.4,
      roughness: 0.5,
      metalness: 0,
    }),

    // Dark glass / plastic for screens frame etc.
    darkGloss: new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.25, metalness: 0.2, envMapIntensity: 1.0 }),

    // Window glass: nearly transparent, faint reflective sheen (kept dim so deep space stays black)
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x6d8a96,
      roughness: 0.22,
      metalness: 0,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
      envMapIntensity: 0.12,
      side: THREE.DoubleSide,
    }),

    // Stencil decals (labels / hazard markings) laid over painted panels
    decal: new THREE.MeshStandardMaterial({
      map: makeDecalSheet(1024, 19),
      transparent: true,
      depthWrite: false,
      roughness: 0.7,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      envMapIntensity: 0.3,
    }),
  };

  // Console screens: black diffuse, emissive UI
  const screenTex = [makeScreen(512, 256, 5), makeScreen(512, 256, 17), makeScreen(512, 256, 29, "#f08a3c", "#4fd8cc"), makeScreen(512, 256, 41)];
  mats.screens = screenTex.map(
    (tex) =>
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0xffffff,
        emissiveMap: tex,
        emissiveIntensity: 1.3,
        roughness: 0.15,
        metalness: 0.0,
        envMapIntensity: 1.0,
      }),
  );
  mats.leds = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: 0xffffff,
    emissiveMap: makeLedStrip(256, 32, 9),
    emissiveIntensity: 2.0,
    roughness: 0.3,
    metalness: 0,
  });

  return mats;
}
