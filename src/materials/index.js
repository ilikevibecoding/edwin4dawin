// Material registry (Fable 3 domain). All world geometry MUST obtain materials via getMaterial(name)
// so the art pass can upgrade every surface in one place. Phase-4: procedural PBR texture sets
// (canvas-generated color/normal/roughness) replace the graybox flat colors. Materials whose
// userData.tileM is set expect world-scale UVs (1 uv unit = tileM meters) — the prop pass
// retrofits map geometry via worldUVs(); props emit their own UVs.
import * as THREE from 'three';
import {
  drywallSet, plasterSet, acousticSet, carpetSet, carpetWornSet, vinylSet, ceramicSet,
  raisedTileSet, concreteSet, deckSet, woodSet, brushedSet, paintedMetalSet, snowSet,
  asphaltSet, brickSet, fabricSet, panelSet, rubberSet, cardboardSet,
} from './textures.js';

const cache = new Map();

// Diagnostic kill switch (?notex=1): serve flat-color materials so QA can isolate how much of
// the SwiftShader frame cost comes from texture sampling. Never set in normal play.
const NOTEX = typeof location !== 'undefined' && /[?&]notex=1/.test(location.search);

// Textured standard material: set() -> {map, normalMap, roughnessMap, tileM}.
// Near-white luminance maps tint through `color`; baked-color sets pass 0xffffff.
function tex(setFn, { tint = 0xffffff, rough = 1.0, metal = 0.0, ns = 1.0, tiled = true, side = null } = {}) {
  return () => {
    if (NOTEX) {
      const m = new THREE.MeshStandardMaterial({ color: tint, roughness: rough, metalness: metal });
      if (side) m.side = side;
      return m;
    }
    const s = setFn();
    const m = new THREE.MeshStandardMaterial({
      map: s.map, normalMap: s.normalMap, roughnessMap: s.roughnessMap,
      color: tint, roughness: rough, metalness: metal,
    });
    m.normalScale.set(ns, ns);
    if (side) m.side = side;
    if (tiled) m.userData.tileM = s.tileM;
    return m;
  };
}

function std(color, roughness, metalness = 0.0, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}
function glass(color, opacity, roughness = 0.12) {
  return new THREE.MeshStandardMaterial({
    color, roughness, metalness: 0.0, transparent: true, opacity,
    side: THREE.DoubleSide, depthWrite: false,
  });
}
function emissive(color, intensity, base = 0x1d1f22, roughness = 0.5) {
  return () => std(base, roughness, 0.0, { emissive: color, emissiveIntensity: intensity });
}

// name -> factory
const DEFS = {
  // ---------------- Architecture (world-UV tiled) ----------------
  drywall:        tex(drywallSet, { tint: 0xc0bbb2 }),
  drywallGreen:   tex(drywallSet, { tint: 0xb2bcac }),
  drywallBlue:    tex(drywallSet, { tint: 0xa8b4be }),
  plaster:        tex(plasterSet, { tint: 0xccc8be }),
  concrete:       tex(() => concreteSet('concrete'), { tint: 0x99999a }),
  concretePaint:  tex(() => concreteSet('concretePaint', { painted: true }), { tint: 0xa4a8ab }),
  deck:           tex(deckSet, { tint: 0x9aa1a9, metal: 0.4 }),
  acoustic:       tex(acousticSet, { tint: 0xd8d5cb }),
  carpet:         tex(carpetSet, { tint: 0x666c6f }),
  carpetBlue:     tex(carpetSet, { tint: 0x54626e }),
  carpetWorn:     tex(carpetWornSet, { tint: 0x5f6568 }),
  vinyl:          tex(vinylSet, { tint: 0xaca89e }),
  tile:           tex(() => ceramicSet('tile', { cells: 4, tileM: 2.4, base: [183, 180, 173], groutL: 104 })),
  tileWhite:      tex(() => ceramicSet('tileWhite', { cells: 6, tileM: 2.4, base: [212, 212, 207], groutL: 158, varAmt: 6, roTile: 0.26 })),
  raisedTile:     tex(raisedTileSet, { metal: 0.35 }),
  wood:           tex(() => woodSet('wood'), { tint: 0x8f6c48 }),
  woodDark:       tex(() => woodSet('wood'), { tint: 0x654a30 }),
  laminate:       tex(() => woodSet('laminateGrain', { grooves: false, plankW: 0.35, grainStretch: 7 }), { tint: 0xb79770, tiled: false }),
  veneer:         tex(() => woodSet('laminateGrain', { grooves: false, plankW: 0.35, grainStretch: 7 }), { tint: 0x8a6a48, tiled: false }),
  laminateWhite:  tex(() => woodSet('laminateGrain', { grooves: false, plankW: 0.35, grainStretch: 7 }), { tint: 0xd3cfc6, tiled: false }),
  snow:           tex(snowSet),
  asphalt:        tex(asphaltSet, { tint: 0x525456 }),
  brick:          tex(brickSet),
  exteriorPanel:  tex(panelSet, { tint: 0x8a9097, metal: 0.35 }),
  parapet:        tex(panelSet, { tint: 0x767b81, metal: 0.25 }),

  // ---------------- Metals ----------------
  paintedMetal:   tex(() => paintedMetalSet(), { tint: 0x787d81, metal: 0.55, tiled: false }),
  paintedMetalRed:tex(() => paintedMetalSet(), { tint: 0x9c443c, metal: 0.5, tiled: false }),
  brushedMetal:   tex(brushedSet, { tint: 0xa4aaaf, metal: 0.9, tiled: false }),
  stainless:      tex(brushedSet, { tint: 0xc4c9cd, metal: 1.0, rough: 0.8, tiled: false }),
  aluminum:       tex(() => paintedMetalSet('paintedClean', { wear: false }), { tint: 0xb4b9bd, metal: 0.85, rough: 0.8, tiled: false }),
  metalBlack:     () => std(0x2b2e31, 0.5, 0.7),
  chrome:         () => std(0xc8ccd0, 0.12, 1.0),
  mirror:         () => std(0xc9d2d8, 0.05, 1.0),

  // ---------------- Doors / frames (flat enamel — box UVs would stretch any texture) ----------------
  doorPaint:      () => std(0x828b93, 0.55, 0.25),
  doorWood:       tex(() => woodSet('laminateGrain', { grooves: false, plankW: 0.35, grainStretch: 7 }), { tint: 0x76573c, tiled: false }),
  doorFire:       () => std(0x8e534c, 0.58, 0.4),
  doorSecurity:   () => std(0x5d646a, 0.5, 0.6),
  frame:          () => std(0x4e545a, 0.5, 0.6),

  // ---------------- Soft / organic / misc ----------------
  rubber:         tex(rubberSet, { tint: 0x313233, tiled: false }),
  hardPlastic:    () => std(0x3b3e42, 0.6),
  softPlastic:    () => std(0x565a5f, 0.8),
  plasticWhite:   () => std(0xd6d2c9, 0.62),
  plasticBeige:   () => std(0xc9c2b2, 0.68),
  fabric:         tex(fabricSet, { tint: 0x6b747c, tiled: false }),
  upholstery:     tex(fabricSet, { tint: 0x404a54, tiled: false }),
  upholsteryWarm: tex(fabricSet, { tint: 0x7c6a52, tiled: false }),
  leather:        () => std(0x33302b, 0.7),
  paper:          () => std(0xd8d5cc, 0.95),
  cardboard:      tex(cardboardSet, { tint: 0xa8875e, tiled: false }),
  electronics:    () => std(0x24262a, 0.55),
  plantLeaf:      () => std(0x40693c, 0.85, 0.0, { side: THREE.DoubleSide }),
  soil:           () => std(0x2e241c, 0.98),

  // ---------------- Emissives (fixtures / indicators) ----------------
  screenOff:      () => std(0x14171a, 0.18, 0.1),
  ledGreen:       emissive(0x3fd873, 2.2),
  ledRed:         emissive(0xd8503f, 2.0),
  ledAmber:       emissive(0xe8b45f, 2.0),
  ledCyan:        emissive(0x6fc3e8, 2.2),
  lampWarm:       emissive(0xffd9a0, 1.6, 0xd8d5cc, 0.6),

  // ---------------- Glass ----------------
  glassClear:     () => glass(0xcfe4ee, 0.08),
  glassFrosted:   () => glass(0xd7e6ec, 0.55, 0.5),
  glassTinted:    () => glass(0x9db8c6, 0.25),
  railGlass:      () => glass(0xc9dde8, 0.22),
};

export function getMaterial(name) {
  let m = cache.get(name);
  if (!m) {
    const def = DEFS[name] || DEFS.drywall;
    m = typeof def === 'function' ? def() : def;
    m.name = name;
    cache.set(name, m);
  }
  return m;
}

export function registerMaterialOverrides(map) {
  // Art pass replaces graybox entries: map is {name: materialFactory}
  for (const [name, factory] of Object.entries(map)) {
    DEFS[name] = factory;
    cache.delete(name);
  }
}

export function listMaterialNames() { return Object.keys(DEFS); }

export function clearMaterialCache() { cache.clear(); }
