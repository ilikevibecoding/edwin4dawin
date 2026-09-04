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
  makeHullPlate,
  makeImperialFloor,
  makeImperialPanel,
  makeCityLights,
  makeImperialScreen,
  makeHoloGrid,
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
  // --- Imperial set
  impWhite: new THREE.Color("#d5d8dd"),
  impLight: new THREE.Color("#b4b8bf"),
  impGrey: new THREE.Color("#8a8f97"),
  impMid: new THREE.Color("#585d66"),
  impDark: new THREE.Color("#2c2f35"),
  impBlack: new THREE.Color("#0f1114"),
  impRed: new THREE.Color("#ff2f22"),
  impBlue: new THREE.Color("#4a9dff"),
  impAmber: new THREE.Color("#ffb347"),
  impGreen: new THREE.Color("#4cff88"),
  hullGrey: new THREE.Color("#979ca3"),
  hullLight: new THREE.Color("#b3b8be"),
  hullDark: new THREE.Color("#5f646b"),
  hullBlack: new THREE.Color("#23262b"),
  engineBlue: new THREE.Color("#6fb4ff"),
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

  addImperialMaterials(mats, std);
  return mats;
}

// ---------------------------------------------------------------------------
// Imperial Star Destroyer materials (exterior hull + interior). Exterior materials have fog off:
// the interior uses a short exponential fog that would otherwise swallow a 1,600 m hull.
// ---------------------------------------------------------------------------
function addImperialMaterials(mats, std) {
  const hullTex = makeHullPlate(1024, 131);
  const hullTex2 = makeHullPlate(1024, 197);
  const floorTex = makeImperialFloor(1024, 137);
  const panelTex = makeImperialPanel(512, 139);
  const panelTex2 = makeImperialPanel(512, 173);
  const cityTex = makeCityLights(512, 141);
  const cityTexDense = makeCityLights(512, 149, 0.06);
  const holoTex = makeHoloGrid(256, 157);

  // --- exterior
  // armour plating; vertex colour carries per-plate paint variation
  mats.hull = std(hullTex, { normalScale: new THREE.Vector2(1.0, 1.0), envMapIntensity: 0.5, fog: false });
  mats.hull2 = std(hullTex2, { normalScale: new THREE.Vector2(1.0, 1.0), envMapIntensity: 0.5, fog: false });
  // recessed base surface under the plates, trench walls, engine housings
  mats.hullDark = std(hullTex, { normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.3, roughness: 1.2, fog: false });
  // superstructure faces: dark plating with thousands of lit windows
  mats.city = new THREE.MeshStandardMaterial({
    map: hullTex.map,
    roughnessMap: hullTex.roughnessMap,
    metalnessMap: hullTex.metalnessMap,
    normalMap: hullTex.normalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
    emissive: 0xffffff,
    emissiveMap: cityTex,
    emissiveIntensity: 1.6,
    vertexColors: true,
    color: 0xffffff,
    roughness: 1,
    metalness: 1,
    envMapIntensity: 0.4,
    fog: false,
  });
  mats.cityDense = mats.city.clone();
  mats.cityDense.emissiveMap = cityTexDense;
  // engine exhaust: bright blue-white core
  mats.engineGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color("#9fd0ff").multiplyScalar(2.2), fog: false, toneMapped: true });
  mats.engineGlowOuter = new THREE.MeshBasicMaterial({ color: new THREE.Color("#3f7fe0"), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  // small emissive running lights / window strips on the exterior
  mats.exteriorLight = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: new THREE.Color("#ffe9c4"), emissiveIntensity: 3.0, roughness: 0.6, metalness: 0, fog: false });
  mats.exteriorRed = new THREE.MeshStandardMaterial({ color: 0x110404, emissive: new THREE.Color("#ff3a2a"), emissiveIntensity: 3.0, roughness: 0.6, metalness: 0, fog: false });
  // bridge / observation windows seen from outside (dark, faint interior glow)
  mats.exteriorGlass = new THREE.MeshStandardMaterial({ color: 0x0a0d12, emissive: new THREE.Color("#3a4a66"), emissiveIntensity: 0.5, roughness: 0.15, metalness: 0.6, envMapIntensity: 1.0, fog: false });

  // --- interior
  // black polished deck
  // envMapIntensity kept low: the RoomEnvironment probe's area light otherwise mirrors as a white
  // flare on every deck when looking along +Z at a shallow angle
  mats.floorGloss = std(floorTex, { normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 0.45 });
  // clean white/grey panels (tint from vertex colours), two wear variants
  mats.impPanel = std(panelTex, { normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 0.7 });
  mats.impPanel1 = std(panelTex2, { normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 0.7 });
  // emitters
  const emit = (hex, intensity, extra = {}) =>
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: new THREE.Color(hex), emissiveIntensity: intensity, roughness: 0.5, metalness: 0, ...extra });
  mats.emitWhite = emit("#f2f6ff", 2.6);
  mats.emitWhiteDim = emit("#dfe6f2", 1.15);
  mats.emitWhiteSoft = emit("#f2f6ff", 2.4, { emissiveMap: makeDiffuser(256, 21) });
  mats.emitBlue = emit("#4a9dff", 2.6);
  mats.emitAmber = emit("#ffb347", 2.2);
  mats.emitGreen = emit("#4cff88", 2.0);
  mats.emitRedSoft = emit("#ff3a2a", 1.6, { emissiveMap: makeDiffuser(256, 23) });
  // hologram: additive, double-sided, grid texture
  mats.holo = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#5aa8ff"),
    map: holoTex,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  // detention cell / hangar containment field
  mats.forceField = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#3f8cff"),
    map: holoTex,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  // Imperial console screens: blue tactical / engineering / navigation, plus a red alert variant
  const imp = [
    makeImperialScreen(512, 256, 151, "#4a9dff", "#ff4136", 0),
    makeImperialScreen(512, 256, 152, "#4a9dff", "#ffb347", 1),
    makeImperialScreen(512, 256, 153, "#6ab4ff", "#ff4136", 2),
    makeImperialScreen(512, 256, 154, "#ff5040", "#ffb347", 0),
    makeImperialScreen(512, 256, 155, "#ffb347", "#ff4136", 1),
  ];
  mats.impScreens = imp.map(
    (tex) =>
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0xffffff,
        emissiveMap: tex,
        emissiveIntensity: 1.4,
        roughness: 0.15,
        metalness: 0.0,
        envMapIntensity: 1.0,
      }),
  );
  mats.impScreens.forEach((m, i) => (mats["impScreen" + i] = m));
  // TIE fighter: dark solar panels and grey hull
  mats.tieHull = new THREE.MeshStandardMaterial({ color: new THREE.Color("#8d949c"), roughness: 0.55, metalness: 0.35, fog: false });
  mats.tiePanel = new THREE.MeshStandardMaterial({ color: new THREE.Color("#1a1d22"), roughness: 0.45, metalness: 0.6, fog: false });
  mats.tieGlass = new THREE.MeshStandardMaterial({ color: new THREE.Color("#0b0f16"), roughness: 0.1, metalness: 0.7, emissive: new THREE.Color("#1a2a44"), emissiveIntensity: 0.6, fog: false });
  // interior window glass (bridge): nearly clear, slight blue tint, faint reflection
  mats.bridgeGlass = new THREE.MeshPhysicalMaterial({
    color: 0x8fa8c0,
    roughness: 0.12,
    metalness: 0,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    envMapIntensity: 0.25,
    side: THREE.DoubleSide,
  });
}
