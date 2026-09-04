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
  makeScreenLayout,
  makeLedStrip,
  makeDecalSheet,
  makeGrate,
  makeDiffuser,
} from "./textures.js";

// Imperial palette. The key names date from the freighter phase (cream / orange / teal) and are kept so
// the legacy rooms re-theme without edits: "cream" is now the light grey-white of Imperial corridor
// panels, "orange" the sparse dark-red accent, "tealPaint" the blue-slate trim, "teal" the blue-white
// instrument glow and "warm" the amber one.
export const PALETTE = {
  cream: new THREE.Color("#c6c9ce"),
  creamDark: new THREE.Color("#8f939a"),
  orange: new THREE.Color("#9c3530"),
  tealPaint: new THREE.Color("#3f4b5e"),
  slate: new THREE.Color("#5c6169"),
  gunmetal: new THREE.Color("#3c4046"),
  darkMetal: new THREE.Color("#22252a"),
  steel: new THREE.Color("#9ea3aa"),
  brass: new THREE.Color("#8a8d93"),
  rubber: new THREE.Color("#ffffff"),
  fabricCream: new THREE.Color("#9da0a6"),
  fabricTeal: new THREE.Color("#2f3c55"),
  fabricOrange: new THREE.Color("#5c2b28"),
  teal: new THREE.Color("#6fb4ff"),
  warm: new THREE.Color("#ffb866"),
  // Imperial-specific additions
  impWhite: new THREE.Color("#d8dbe0"),
  impGrey: new THREE.Color("#a6aab1"),
  impGreyDark: new THREE.Color("#5d6168"),
  impBlack: new THREE.Color("#171a1e"),
  impRed: new THREE.Color("#c0392b"),
  impBlue: new THREE.Color("#4a8dff"),
  impAmber: new THREE.Color("#ffb347"),
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
      emissive: new THREE.Color("#ff8a3a"),
      emissiveIntensity: 2.0,
      roughness: 0.5,
      metalness: 0,
    }),
    // Imperial instrument colours: blue, amber, white (hard) + soft diffuser variants
    emitBlue: new THREE.MeshStandardMaterial({ color: 0x06101e, emissive: PALETTE.impBlue, emissiveIntensity: 1.8, roughness: 0.4, metalness: 0 }),
    emitAmber: new THREE.MeshStandardMaterial({ color: 0x1a1004, emissive: PALETTE.impAmber, emissiveIntensity: 1.6, roughness: 0.4, metalness: 0 }),
    emitWhite: new THREE.MeshStandardMaterial({ color: 0x101214, emissive: new THREE.Color("#e8f0ff"), emissiveIntensity: 1.5, roughness: 0.4, metalness: 0 }),
    emitBlueSoft: new THREE.MeshStandardMaterial({ color: 0x06101e, emissive: PALETTE.impBlue, emissiveMap: diffuser, emissiveIntensity: 1.8, roughness: 0.5, metalness: 0 }),
    emitRedSoft: new THREE.MeshStandardMaterial({ color: 0x100404, emissive: new THREE.Color("#ff3a2a"), emissiveMap: diffuser, emissiveIntensity: 2.0, roughness: 0.5, metalness: 0 }),
    emitWhiteSoft: new THREE.MeshStandardMaterial({ color: 0x101214, emissive: new THREE.Color("#e8f0ff"), emissiveMap: diffuser, emissiveIntensity: 1.7, roughness: 0.5, metalness: 0 }),
    // Satin black Imperial console / trim panel (dielectric so it still shades under dim light)
    satinBlack: new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.42, metalness: 0.25, envMapIntensity: 0.9 }),
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
      emissiveIntensity: 1.45,
      roughness: 0.5,
      metalness: 0,
    }),
    emitCoolSoft: new THREE.MeshStandardMaterial({
      color: 0x0a0e14,
      emissive: new THREE.Color("#cfe4ff"),
      emissiveMap: diffuser,
      emissiveIntensity: 1.7,
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
  // 0..3 legacy layouts (now blue-white), 4 blue tactical, 5 red alert / restricted, 6 amber engineering
  const screenTex = [
    makeScreen(512, 256, 5),
    makeScreen(512, 256, 17),
    makeScreen(512, 256, 29, "#ff9a3c", "#6fb4ff"),
    makeScreen(512, 256, 41),
    makeScreen(512, 256, 57, "#4a8dff", "#b4d2ff"),
    makeScreen(512, 256, 73, "#ff3b30", "#ff9a90"),
    makeScreen(512, 256, 89, "#ffb347", "#ffe2b0"),
    // 7..10 alternative layouts: ship schematic (blue), sensor radar (blue), data columns (blue),
    // power bars (amber) — rooms mix these so no deck repeats one texture
    makeScreenLayout("schematic", 512, 256, 101, "#4a8dff", "#ffb347"),
    makeScreenLayout("radar", 512, 256, 113, "#4a8dff", "#ff3b30"),
    makeScreenLayout("columns", 512, 256, 127, "#6fb4ff", "#ffb347"),
    makeScreenLayout("bars", 512, 256, 131, "#ffb347", "#ff3b30"),
  ];
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
