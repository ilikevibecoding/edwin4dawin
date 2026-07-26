import * as THREE from 'three';
import { PALETTE } from '../palette.js';
import {
  diamondPlateMaps,
  fabricMaps,
  glassRoughness,
  makePaintMaterial,
  meshAlpha,
  reflectorNormal,
  rubberMaps,
  treadMaps,
  trimMaps,
  wornMetalMaps,
} from '../textures/vehicle.js';

// ---------------------------------------------------------------------------
// The truck's material library. Keys here are what every vehicle part module
// references through `Kit.add(key, ...)`.
//
// Four PBR families are represented: automotive clearcoat paint, worn/blasted
// steel, moulded rubber & plastic, and soft fabric.
// ---------------------------------------------------------------------------

let cachedMats = null;

export function vehicleMaterials(env = null) {
  if (cachedMats) {
    if (env) for (const m of Object.values(cachedMats)) if ('envMap' in m) m.envMap = env;
    return cachedMats;
  }

  const metal = wornMetalMaps(3);
  const metal2 = wornMetalMaps(8);
  const trim = trimMaps();
  const rubber = rubberMaps();
  const tread = treadMaps();
  const fabric = fabricMaps();
  const plate = diamondPlateMaps();

  const m = {};

  // --- paint family --------------------------------------------------------
  m.paint = makePaintMaterial(PALETTE.bodyPaint);
  m.paintRoof = makePaintMaterial(PALETTE.bodyPaintDark, { roughness: 0.4, clearcoatRoughness: 0.14 });
  m.paintAccent = makePaintMaterial(PALETTE.accent, { metalness: 0.5, roughness: 0.42, clearcoat: 0.85 });

  // --- metal family --------------------------------------------------------
  m.steel = new THREE.MeshStandardMaterial({
    map: metal.map,
    normalMap: metal.normal,
    roughnessMap: metal.rough,
    metalnessMap: metal.metalness,
    normalScale: new THREE.Vector2(0.8, 0.8),
    metalness: 1.0,
    roughness: 1.0,
    envMapIntensity: 1.1,
  });
  m.steelDark = new THREE.MeshStandardMaterial({
    map: metal2.map,
    normalMap: metal2.normal,
    roughnessMap: metal2.rough,
    color: 0x4c5155,
    normalScale: new THREE.Vector2(0.9, 0.9),
    metalness: 0.95,
    roughness: 0.72,
    envMapIntensity: 0.9,
  });
  m.chrome = new THREE.MeshStandardMaterial({
    color: PALETTE.chrome,
    metalness: 1.0,
    roughness: 0.13,
    normalMap: metal.normal,
    normalScale: new THREE.Vector2(0.12, 0.12),
    envMapIntensity: 1.6,
  });
  m.alu = new THREE.MeshStandardMaterial({
    color: 0x9aa0a4,
    metalness: 1.0,
    roughness: 0.38,
    normalMap: metal.normal,
    normalScale: new THREE.Vector2(0.35, 0.35),
    envMapIntensity: 1.25,
  });
  m.plate = new THREE.MeshStandardMaterial({
    color: 0x6f7479,
    metalness: 0.95,
    roughness: 0.55,
    normalMap: plate.normal,
    roughnessMap: plate.rough,
    normalScale: new THREE.Vector2(1.0, 1.0),
    envMapIntensity: 1.0,
  });
  m.brakeDisc = new THREE.MeshStandardMaterial({
    color: 0x6a6560,
    metalness: 1.0,
    roughness: 0.42,
    envMapIntensity: 1.0,
  });
  m.caliper = new THREE.MeshStandardMaterial({
    color: PALETTE.accentDim,
    metalness: 0.7,
    roughness: 0.5,
    envMapIntensity: 0.9,
  });

  // --- rubber / plastic family --------------------------------------------
  m.rubber = new THREE.MeshStandardMaterial({
    map: rubber.map,
    normalMap: rubber.normal,
    roughnessMap: rubber.rough,
    normalScale: new THREE.Vector2(0.9, 0.9),
    metalness: 0.0,
    roughness: 0.92,
    envMapIntensity: 0.55,
  });
  m.tread = new THREE.MeshStandardMaterial({
    map: rubber.map,
    normalMap: tread.normal,
    roughnessMap: tread.rough,
    aoMap: tread.ao,
    normalScale: new THREE.Vector2(1.6, 1.6),
    color: 0x2a2b2c,
    metalness: 0.0,
    roughness: 0.95,
    envMapIntensity: 0.4,
  });
  m.trim = new THREE.MeshStandardMaterial({
    map: trim.map,
    normalMap: trim.normal,
    roughnessMap: trim.rough,
    normalScale: new THREE.Vector2(0.7, 0.7),
    metalness: 0.02,
    roughness: 0.78,
    envMapIntensity: 0.7,
  });
  m.trimGloss = new THREE.MeshStandardMaterial({
    color: 0x17191b,
    metalness: 0.05,
    roughness: 0.28,
    normalMap: trim.normal,
    normalScale: new THREE.Vector2(0.25, 0.25),
    envMapIntensity: 1.1,
  });

  // --- glass ---------------------------------------------------------------
  m.glass = new THREE.MeshPhysicalMaterial({
    color: 0x11181c,
    metalness: 0.0,
    roughness: 0.06,
    roughnessMap: glassRoughness(),
    transmission: 0.0,
    opacity: 0.42,
    transparent: true,
    envMapIntensity: 2.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  m.glassDark = new THREE.MeshPhysicalMaterial({
    color: 0x080b0d,
    metalness: 0.0,
    roughness: 0.12,
    opacity: 0.72,
    transparent: true,
    envMapIntensity: 1.5,
    clearcoat: 1.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // --- lights --------------------------------------------------------------
  m.reflector = new THREE.MeshStandardMaterial({
    color: 0xf2f4f6,
    metalness: 1.0,
    roughness: 0.09,
    normalMap: reflectorNormal(),
    normalScale: new THREE.Vector2(0.6, 0.6),
    envMapIntensity: 1.8,
  });
  m.lensClear = new THREE.MeshPhysicalMaterial({
    color: 0xdfe8ee,
    metalness: 0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.3,
    envMapIntensity: 2.4,
    clearcoat: 1,
    depthWrite: false,
  });
  m.headlight = new THREE.MeshStandardMaterial({
    color: 0xfff6e2,
    emissive: PALETTE.headlight,
    emissiveIntensity: 3.2,
    roughness: 0.25,
    metalness: 0,
  });
  m.taillight = new THREE.MeshStandardMaterial({
    color: 0x3a0704,
    emissive: PALETTE.taillight,
    emissiveIntensity: 2.4,
    roughness: 0.3,
    metalness: 0,
  });
  m.amber = new THREE.MeshStandardMaterial({
    color: 0x35210a,
    emissive: PALETTE.markerAmber,
    emissiveIntensity: 1.9,
    roughness: 0.35,
    metalness: 0,
  });

  // --- soft trim -----------------------------------------------------------
  m.fabric = new THREE.MeshStandardMaterial({
    map: fabric.map,
    normalMap: fabric.normal,
    roughnessMap: fabric.rough,
    normalScale: new THREE.Vector2(0.8, 0.8),
    metalness: 0,
    roughness: 0.95,
    envMapIntensity: 0.4,
  });
  m.interiorPlastic = new THREE.MeshStandardMaterial({
    color: PALETTE.interiorPlastic,
    metalness: 0.05,
    roughness: 0.68,
    normalMap: trim.normal,
    normalScale: new THREE.Vector2(0.4, 0.4),
    envMapIntensity: 0.55,
  });
  m.mesh = new THREE.MeshStandardMaterial({
    color: 0x15171a,
    alphaMap: meshAlpha('hex'),
    transparent: true,
    alphaTest: 0.5,
    metalness: 0.8,
    roughness: 0.55,
    side: THREE.DoubleSide,
    envMapIntensity: 0.8,
  });
  m.canvasTop = new THREE.MeshStandardMaterial({
    color: 0x2b2c28,
    metalness: 0,
    roughness: 0.88,
    normalMap: fabric.normal,
    normalScale: new THREE.Vector2(1.2, 1.2),
    envMapIntensity: 0.5,
  });

  if (env) for (const mat of Object.values(m)) if ('envMap' in mat) mat.envMap = env;
  cachedMats = m;
  return m;
}

export function setVehicleEnv(env) {
  if (!cachedMats) return;
  for (const mat of Object.values(cachedMats)) {
    if ('envMap' in mat) {
      mat.envMap = env;
      mat.needsUpdate = true;
    }
  }
}
