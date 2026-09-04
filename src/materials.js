// Builds the shared PBR material library from procedural textures.
// Two light domains: "interior" materials ignore the sun (they live inside the hull) and
// "exterior" materials ignore the interior point / spot lights and reflect a space environment.
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
import {
  makeImperialPanel,
  makeTrimBlack,
  makeHullPlating,
  makeDeckGrid,
  makeHexPanel,
  makeImperialScreen,
  makeCityLights,
  makeChevron,
  makeImperialDecals,
  makeGlowDisc,
  makeFieldPattern,
} from "./textures_imperial.js";

export const PALETTE = {
  // Kestrel (original freighter) palette
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
  // Imperial palette
  impWhite: new THREE.Color("#d6d9de"),
  impGrey: new THREE.Color("#a9adb4"),
  impGreyDark: new THREE.Color("#6d7178"),
  impBlack: new THREE.Color("#15161a"),
  impCharcoal: new THREE.Color("#24262b"),
  impBlue: new THREE.Color("#4f8dff"),
  impBlueDeep: new THREE.Color("#2a4fbf"),
  impRed: new THREE.Color("#ff3b2e"),
  impAmber: new THREE.Color("#ffb040"),
  impGreen: new THREE.Color("#4fe08a"),
  impCyan: new THREE.Color("#7fd8ff"),
  hullLight: new THREE.Color("#b9bcc0"),
  hullMid: new THREE.Color("#9a9ea4"),
  hullDark: new THREE.Color("#5b5f66"),
  hullTrench: new THREE.Color("#3a3d43"),
  engineBlue: new THREE.Color("#8fc4ff"),
  yellow: new THREE.Color("#e8c33a"),
};

// ---------------------------------------------------------------------------
// Light domains (shader patches)
// ---------------------------------------------------------------------------
const CHUNK = THREE.ShaderChunk.lights_fragment_begin;
const INTERIOR_CHUNK = CHUNK.replace(/getDirectionalLightInfo\( directionalLight, directLight \);/g, "getDirectionalLightInfo( directionalLight, directLight ); directLight.color = vec3( 0.0 );");
const EXTERIOR_CHUNK = CHUNK.replace(/getPointLightInfo\( pointLight, geometryPosition, directLight \);/g, "getPointLightInfo( pointLight, geometryPosition, directLight ); directLight.color = vec3( 0.0 );").replace(
  /getSpotLightInfo\( spotLight, geometryPosition, directLight \);/g,
  "getSpotLightInfo( spotLight, geometryPosition, directLight ); directLight.color = vec3( 0.0 );",
);
function interiorPatch(shader) {
  shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_begin>", INTERIOR_CHUNK);
}
function exteriorPatch(shader) {
  shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_begin>", EXTERIOR_CHUNK);
}
/** Mark a lit material as belonging to a light domain. */
export function setDomain(material, domain) {
  if (!material.isMeshStandardMaterial && !material.isMeshPhysicalMaterial && !material.isMeshLambertMaterial && !material.isMeshPhongMaterial) return material;
  material.onBeforeCompile = domain === "exterior" ? exteriorPatch : interiorPatch;
  material.customProgramCacheKey = () => domain;
  material.userData.domain = domain;
  material.needsUpdate = true;
  return material;
}

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
  // Imperial sets
  const impPanel = makeImperialPanel(512, 5);
  const impPanel1 = makeImperialPanel(512, 29);
  const impPanel2 = makeImperialPanel(512, 61);
  const trim = makeTrimBlack(512, 33);
  const hull = makeHullPlating(1024, 101);
  const hull1 = makeHullPlating(1024, 137);
  const deckGrid = makeDeckGrid(1024, 77);
  const hex = makeHexPanel(512, 41);
  const chevronY = makeChevron(256, "#e8c33a", "#141416", 3);
  const chevronR = makeChevron(256, "#d83a2e", "#141416", 5);
  const cityTex = makeCityLights(512, 256, 9);

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
  const emit = (color, intensity, extra = {}) =>
    new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.08), emissive: new THREE.Color(color), emissiveIntensity: intensity, roughness: 0.45, metalness: 0, ...extra });

  const mats = {
    // ---------------- Kestrel (unchanged) ----------------
    painted: std(painted, { normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 0.8 }),
    painted1: std(painted1, { normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 0.8 }),
    painted2: std(painted2, { normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 0.8 }),
    metal: std(metal, { normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.85 }),
    metalRough: std(metal, { normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1.7, envMapIntensity: 0.7 }),
    paintedMetal: std(metal, { normalScale: new THREE.Vector2(0.6, 0.6), metalness: 0.15, roughness: 1.15, envMapIntensity: 0.6 }),
    grate: std(grate, { normalScale: new THREE.Vector2(1.0, 1.0), envMapIntensity: 0.8, transparent: true, depthWrite: true, alphaTest: 0, side: THREE.DoubleSide }),
    deck: std(deck, { normalScale: new THREE.Vector2(1.0, 1.0), envMapIntensity: 1.0 }),
    rubber: std(rubber, { normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.4 }),
    fabric: std(fabric, { normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 0.3 }),
    hazard: std(hazard, { normalScale: new THREE.Vector2(0.4, 0.4), envMapIntensity: 0.6 }),
    emitTeal: emit(PALETTE.teal, 2.4),
    emitWarm: emit(PALETTE.warm, 1.7),
    emitOrange: emit(PALETTE.orange, 2.0),
    emitRed: emit("#ff3a2a", 1.8),
    emitCool: emit("#cfe4ff", 2.2),
    emitWarmSoft: emit(PALETTE.warm, 1.9, { emissiveMap: diffuser }),
    emitCoolSoft: emit("#cfe4ff", 2.4, { emissiveMap: diffuser }),
    darkGloss: new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.25, metalness: 0.2, envMapIntensity: 1.0 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x6d8a96, roughness: 0.22, metalness: 0, transparent: true, opacity: 0.06, depthWrite: false, envMapIntensity: 0.12, side: THREE.DoubleSide }),
    decal: new THREE.MeshStandardMaterial({ map: makeDecalSheet(1024, 19), transparent: true, depthWrite: false, roughness: 0.7, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 0.3 }),

    // ---------------- Imperial interior ----------------
    // pale enamel wall panels (vertex colour tints; impWhite / impGrey)
    impPanel: std(impPanel, { normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 0.6 }),
    impPanel1: std(impPanel1, { normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 0.6 }),
    impPanel2: std(impPanel2, { normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 0.6 }),
    // matte black structural trim / frames / console shells
    impTrim: std(trim, { normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: 0.5 }),
    // brushed dark metal (railings, grilles, machinery); tint via vertex colour
    impMetal: std(metal, { normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 0.9 }),
    impMetalRough: std(metal, { normalScale: new THREE.Vector2(0.6, 0.6), roughness: 1.6, envMapIntensity: 0.6 }),
    // dark deck grid plates
    impDeck: std(deckGrid, { normalScale: new THREE.Vector2(1.0, 1.0), envMapIntensity: 0.9 }),
    // glossy black console tops / screens frames
    impGloss: new THREE.MeshStandardMaterial({ color: 0x090a0d, roughness: 0.3, metalness: 0.35, envMapIntensity: 0.6 }),
    // hexagonal cell panels (TIE wings, some machinery faces)
    hexPanel: std(hex, { normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 0.8 }),
    chevronY: std(chevronY, { normalScale: new THREE.Vector2(0.4, 0.4), envMapIntensity: 0.5 }),
    chevronR: std(chevronR, { normalScale: new THREE.Vector2(0.4, 0.4), envMapIntensity: 0.5 }),
    // emissives (intensity animated by the lighting controller)
    emitBlue: emit(PALETTE.impBlue, 2.0),
    emitBlueSoft: emit(PALETTE.impBlue, 1.6, { emissiveMap: diffuser }),
    emitRedImp: emit(PALETTE.impRed, 2.0),
    emitAmber: emit(PALETTE.impAmber, 1.9),
    emitWhite: emit("#e8f0ff", 1.7),
    emitWhiteSoft: emit("#e8f0ff", 1.9, { emissiveMap: diffuser }),
    // recessed ceiling / cornice slots: a dim, warm-white fixture that never becomes the brightest surface
    emitWhiteDim: emit("#dfe6f4", 0.85, { emissiveMap: diffuser }),
    emitAmberDim: emit(PALETTE.impAmber, 0.9),
    emitBlueDim: emit(PALETTE.impBlue, 0.7),
    emitRedDim: emit(PALETTE.impRed, 0.8),
    emitGreen: emit(PALETTE.impGreen, 1.8),
    emitCyan: emit(PALETTE.impCyan, 2.0),
    // hologram: additive, translucent
    holo: new THREE.MeshBasicMaterial({ color: 0x5fa8ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    holoBright: new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    // bridge / gallery viewport glass: faint blue tint, a little more reflective than the Kestrel's
    viewGlass: new THREE.MeshPhysicalMaterial({ color: 0x8fb4d8, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.08, depthWrite: false, envMapIntensity: 0.25, side: THREE.DoubleSide }),
    // imperial stencil decals
    decalImp: new THREE.MeshStandardMaterial({ map: makeImperialDecals(1024, 19), transparent: true, depthWrite: false, roughness: 0.7, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 0.3 }),
    // hangar containment field (animated in main loop via map offset)
    // containment field: felt, not drawn — a faint additive shimmer with a barely-there lattice
    field: new THREE.MeshBasicMaterial({ color: 0x4a7fff, map: makeFieldPattern(512, 12), transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    glowDisc: new THREE.MeshBasicMaterial({ map: makeGlowDisc(256, 0.3), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),

    // ---------------- Exterior ----------------
    hullPlate: std(hull, { normalScale: new THREE.Vector2(1.0, 1.0), envMapIntensity: 0.5, fog: false }),
    hullPlate1: std(hull1, { normalScale: new THREE.Vector2(1.0, 1.0), envMapIntensity: 0.5, fog: false }),
    // greebles / trench machinery: worn metal, darker tint by vertex colour
    hullGreeble: std(metal, { normalScale: new THREE.Vector2(0.5, 0.5), roughness: 1.3, metalness: 0.7, envMapIntensity: 0.6, fog: false }),
    hullTrim: std(trim, { normalScale: new THREE.Vector2(0.4, 0.4), envMapIntensity: 0.4, fog: false }),
    // superstructure window lights (alpha from map, emissive from the same texture)
    cityLights: new THREE.MeshStandardMaterial({ map: cityTex, emissiveMap: cityTex, emissive: 0xffffff, emissiveIntensity: 2.4, color: 0x000000, transparent: true, depthWrite: false, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, fog: false }),
    engineGlow: new THREE.MeshBasicMaterial({ color: PALETTE.engineBlue, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    engineCore: new THREE.MeshBasicMaterial({ color: 0xe8f4ff, fog: false }),
    extEmitWhite: emit("#ffffff", 3.0, { fog: false }),
    extEmitRed: emit("#ff3020", 3.0, { fog: false }),
    extEmitBlue: emit("#6fa8ff", 3.0, { fog: false }),
    // dimmer warm strips for window / door bands so bloom does not swallow them at distance
    extEmitWarm: emit("#ffe2b0", 1.6, { fog: false }),
  };
  // Console screens (Kestrel): black diffuse, emissive UI
  const screenTex = [makeScreen(512, 256, 5), makeScreen(512, 256, 17), makeScreen(512, 256, 29, "#f08a3c", "#4fd8cc"), makeScreen(512, 256, 41)];
  // roughness 0.3: glassy enough to catch a sheen, no longer a mirror that flares every point key
  const screenMat = (tex, intensity = 1.3) => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: intensity, roughness: 0.3, metalness: 0.0, envMapIntensity: 1.0 });
  mats.screens = screenTex.map((tex) => screenMat(tex));
  mats.leds = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: makeLedStrip(256, 32, 9), emissiveIntensity: 2.0, roughness: 0.3, metalness: 0 });

  // Imperial screens: scheme × 4 variants, each variant a different layout (tactical plot, systems
  // bars, star chart, status grid). Keys: scrBlue0..3, scrRed0..3, scrAmber0..3, scrGreen0..3, scrWhite0..3
  mats.impScreens = [];
  for (const scheme of ["blue", "red", "amber", "green", "white"]) {
    for (let v = 0; v < 4; v++) {
      const m = screenMat(makeImperialScreen(512, 256, 100 + v * 7 + scheme.length * 13, scheme, v), 1.5);
      m.name = `scr${scheme[0].toUpperCase()}${scheme.slice(1)}${v}`;
      mats[m.name] = m;
      mats.impScreens.push(m);
    }
  }

  // Light domains: everything lit is interior unless listed here
  const exteriorKeys = ["hullPlate", "hullPlate1", "hullGreeble", "hullTrim", "cityLights", "extEmitWhite", "extEmitRed", "extEmitBlue", "extEmitWarm"];
  for (const [k, m] of Object.entries(mats)) {
    if (Array.isArray(m)) continue;
    if (!m.isMaterial) continue;
    setDomain(m, exteriorKeys.includes(k) ? "exterior" : "interior");
  }
  for (const m of [...mats.screens, ...mats.impScreens]) setDomain(m, "interior");
  setDomain(mats.leds, "interior");

  mats.exteriorKeys = exteriorKeys;
  /** Give every exterior material the space environment (overrides scene.environment). */
  mats.setExteriorEnv = (tex) => {
    for (const k of exteriorKeys) {
      const m = mats[k];
      if (m && m.isMeshStandardMaterial) {
        m.envMap = tex;
        m.needsUpdate = true;
      }
    }
  };
  return mats;
}
