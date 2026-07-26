// Material registry (Fable 3 domain). All world geometry MUST obtain materials via getMaterial(name)
// so the art pass can upgrade every surface in one place. Phase-2 graybox: tuned flat PBR colors
// with roughness variation; Phase-4 replaces relevant entries with procedural texture sets.
import * as THREE from 'three';

const cache = new Map();

// name -> factory
const DEFS = {
  // Architecture
  drywall:        () => std(0xb8b4ac, 0.85),
  drywallGreen:   () => std(0xa9b3a4, 0.85),
  drywallBlue:    () => std(0x9fabb4, 0.85),
  plaster:        () => std(0xc4c0b6, 0.9),
  concrete:       () => std(0x8d8d8b, 0.93),
  concretePaint:  () => std(0x9a9d9e, 0.8),
  deck:           () => std(0x9299a0, 0.7, 0.3),
  acoustic:       () => std(0xcfccc2, 0.95),
  carpet:         () => std(0x5f6668, 0.98),
  carpetBlue:     () => std(0x4d5a66, 0.98),
  vinyl:          () => std(0xa8a49a, 0.55),
  tile:           () => std(0xb5b2ab, 0.35),
  tileWhite:      () => std(0xc9c9c4, 0.3),
  raisedTile:     () => std(0x84898e, 0.5, 0.3),
  wood:           () => std(0x7a5b3e, 0.6),
  woodDark:       () => std(0x56402c, 0.55),
  laminate:       () => std(0xa98d68, 0.5),
  snow:           () => std(0xdfe6ec, 0.85),
  asphalt:        () => std(0x4a4c4e, 0.95),
  brick:          () => std(0x8a6a5a, 0.9),
  exteriorPanel:  () => std(0x7d838a, 0.6, 0.3),
  parapet:        () => std(0x6d7278, 0.7, 0.2),
  paintedMetal:   () => std(0x6f7478, 0.55, 0.6),
  paintedMetalRed:() => std(0x8e3b34, 0.5, 0.5),
  brushedMetal:   () => std(0x9aa0a5, 0.35, 0.9),
  stainless:      () => std(0xb9bec2, 0.25, 1.0),
  aluminum:       () => std(0xaeb3b7, 0.4, 0.9),
  doorPaint:      () => std(0x7f8890, 0.6, 0.2),
  doorWood:       () => std(0x6e5138, 0.55),
  doorFire:       () => std(0x86504a, 0.6, 0.4),
  doorSecurity:   () => std(0x5a6167, 0.5, 0.7),
  frame:          () => std(0x4e545a, 0.5, 0.6),
  rubber:         () => std(0x2e2f30, 0.95),
  hardPlastic:    () => std(0x3b3e42, 0.6),
  softPlastic:    () => std(0x565a5f, 0.8),
  fabric:         () => std(0x616a72, 0.98),
  upholstery:     () => std(0x39424c, 0.9),
  paper:          () => std(0xd8d5cc, 0.95),
  cardboard:      () => std(0xa08154, 0.95),
  electronics:    () => std(0x24262a, 0.55),
  glassClear:     () => glass(0xcfe4ee, 0.08),
  glassFrosted:   () => glass(0xd7e6ec, 0.55, 0.5),
  glassTinted:    () => glass(0x9db8c6, 0.25),
  railGlass:      () => glass(0xc9dde8, 0.22),
};

function std(color, roughness, metalness = 0.0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
function glass(color, opacity, roughness = 0.12) {
  return new THREE.MeshStandardMaterial({
    color, roughness, metalness: 0.0, transparent: true, opacity,
    side: THREE.DoubleSide, depthWrite: false,
  });
}

export function getMaterial(name) {
  let m = cache.get(name);
  if (!m) {
    const def = DEFS[name] || DEFS.drywall;
    m = def();
    m.name = name;
    cache.set(m === undefined ? name : name, m);
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

export function clearMaterialCache() { cache.clear(); }
