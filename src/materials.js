import * as THREE from 'three';
import { PALETTE } from './layout.js';
import {
  createPBRMaps,
  createWeave,
  createDiamondPlate,
  createCondensationMap,
} from './textures.js';

export function createMaterials() {
  const hull = createPBRMaps('hull', {
    color: PALETTE.hullWarm,
    variation: 0.42,
    blotches: 22,
    blotchColor: '#6e6554',
    blotchAlpha: 0.14,
    scratches: 70,
    chips: 90,
    chipColor: PALETTE.primer,
    streaks: 10,
    panels: true,
    roughness: 0.58,
    normalStrength: 1.15,
    seed: 11,
    size: 1024,
  });

  const hullGreen = createPBRMaps('hullGreen', {
    color: PALETTE.hullGreen,
    variation: 0.38,
    blotches: 18,
    blotchColor: '#3a3f34',
    scratches: 50,
    chips: 70,
    chipColor: PALETTE.primer,
    panels: true,
    roughness: 0.6,
    seed: 19,
    size: 1024,
  });

  const steel = createPBRMaps('steel', {
    color: PALETTE.steel,
    variation: 0.5,
    scratches: 120,
    scratchColor: 'rgba(200,205,210,0.18)',
    blotches: 12,
    blotchColor: '#1a1c1e',
    roughness: 0.38,
    roughContrast: 0.4,
    normalStrength: 1.6,
    seed: 27,
  });

  const brushed = createPBRMaps('brushed', {
    color: PALETTE.steelLight,
    variation: 0.28,
    streaks: 80,
    streakColor: 'rgba(255,255,255,0.08)',
    scratches: 40,
    roughness: 0.32,
    seed: 33,
    heightScale: 40,
    heightAmp: 0.45,
  });

  const oily = createPBRMaps('oily', {
    color: PALETTE.oily,
    variation: 0.35,
    blotches: 26,
    blotchColor: '#0a0c0e',
    blotchAlpha: 0.28,
    scratches: 30,
    roughness: 0.28,
    roughContrast: 0.5,
    seed: 41,
  });

  const machine = createPBRMaps('machine', {
    color: PALETTE.machineBlue,
    variation: 0.4,
    chips: 60,
    chipColor: PALETTE.steel,
    scratches: 55,
    blotches: 14,
    blotchColor: '#1c2228',
    roughness: 0.48,
    seed: 48,
  });

  const rubber = createPBRMaps('rubber', {
    color: PALETTE.rubber,
    variation: 0.3,
    blotches: 16,
    blotchColor: '#2a2420',
    roughness: 0.88,
    normalStrength: 0.9,
    seed: 55,
    heightScale: 22,
  });

  const pipePaint = createPBRMaps('pipe', {
    color: '#6b6254',
    variation: 0.32,
    chips: 40,
    scratches: 35,
    roughness: 0.55,
    seed: 62,
  });

  const pipeWhite = createPBRMaps('pipeWhite', {
    color: '#b7b0a2',
    variation: 0.25,
    chips: 30,
    chipColor: PALETTE.primer,
    roughness: 0.52,
    seed: 66,
  });

  const pipeCopper = createPBRMaps('pipeCopper', {
    color: '#6a4330',
    variation: 0.4,
    blotches: 10,
    blotchColor: '#3a2418',
    roughness: 0.36,
    seed: 71,
  });

  const plastic = createPBRMaps('plastic', {
    color: PALETTE.plastic,
    variation: 0.2,
    scratches: 20,
    roughness: 0.46,
    seed: 77,
    heightAmp: 0.35,
  });

  const bakelite = createPBRMaps('bakelite', {
    color: PALETTE.bakelite,
    variation: 0.22,
    roughness: 0.42,
    seed: 81,
  });

  const rust = createPBRMaps('rust', {
    color: '#5a3824',
    variation: 0.7,
    blotches: 30,
    blotchColor: '#2a160e',
    roughness: 0.82,
    seed: 88,
    heightScale: 16,
    normalStrength: 1.8,
  });

  const fabric = createWeave(PALETTE.blanket, PALETTE.fabricLight, 512, 12);
  const mattress = createWeave('#8a7a62', '#6a5a48', 512, 18);
  const leather = createPBRMaps('leather', {
    color: PALETTE.leather,
    variation: 0.35,
    blotches: 10,
    roughness: 0.7,
    seed: 95,
    heightScale: 18,
  });

  const plate = createDiamondPlate(512, 14);
  const condensation = createCondensationMap(512, 90);

  const mats = {
    hullPaint: physical({
      ...hull,
      color: 0xb4b09c,
      metalness: 0.12,
      roughness: 0.56,
      clearcoat: 0.22,
      clearcoatRoughness: 0.45,
      envMapIntensity: 0.7,
      normalScale: new THREE.Vector2(0.85, 0.85),
      repeatX: 3,
      repeatY: 12,
    }),
    hullGreen: physical({
      ...hullGreen,
      color: 0x747866,
      metalness: 0.1,
      roughness: 0.6,
      clearcoat: 0.16,
      clearcoatRoughness: 0.5,
      envMapIntensity: 0.55,
      repeatX: 2,
      repeatY: 4,
    }),
    chippedPaint: physical({
      ...hull,
      color: 0xb7a888,
      metalness: 0.18,
      roughness: 0.62,
      clearcoat: 0.1,
      envMapIntensity: 0.5,
    }),
    steel: physical({
      ...steel,
      color: 0x8a9098,
      metalness: 0.82,
      roughness: 0.36,
      envMapIntensity: 1.05,
      normalScale: new THREE.Vector2(0.7, 0.7),
    }),
    brushed: physical({
      ...brushed,
      color: 0xb0b6be,
      metalness: 0.86,
      roughness: 0.3,
      envMapIntensity: 1.15,
    }),
    oily: physical({
      ...oily,
      color: 0x4a545c,
      metalness: 0.72,
      roughness: 0.28,
      envMapIntensity: 0.95,
    }),
    machine: physical({
      ...machine,
      color: 0x7a8a96,
      metalness: 0.55,
      roughness: 0.46,
      clearcoat: 0.08,
      envMapIntensity: 0.7,
    }),
    rubber: physical({
      ...rubber,
      color: 0x1c1d1f,
      metalness: 0.02,
      roughness: 0.9,
      envMapIntensity: 0.25,
    }),
    deck: physical({
      ...plate,
      color: 0x2c2e30,
      metalness: 0.35,
      roughness: 0.74,
      envMapIntensity: 0.4,
      normalScale: new THREE.Vector2(1.1, 1.1),
    }),
    pipe: physical({
      ...pipePaint,
      color: 0x7a7162,
      metalness: 0.22,
      roughness: 0.54,
      envMapIntensity: 0.5,
    }),
    pipeWhite: physical({
      ...pipeWhite,
      color: 0xc4bdae,
      metalness: 0.16,
      roughness: 0.5,
    }),
    pipeCopper: physical({
      ...pipeCopper,
      color: 0x8a5840,
      metalness: 0.7,
      roughness: 0.38,
      envMapIntensity: 0.85,
    }),
    plastic: physical({
      ...plastic,
      color: 0x2e3338,
      metalness: 0.04,
      roughness: 0.48,
      envMapIntensity: 0.35,
    }),
    bakelite: physical({
      ...bakelite,
      color: 0x3a2c22,
      metalness: 0.05,
      roughness: 0.44,
    }),
    rust: physical({
      ...rust,
      color: 0x6a4028,
      metalness: 0.15,
      roughness: 0.84,
    }),
    fabric: physical({
      ...fabric,
      color: 0x6a5848,
      metalness: 0.0,
      roughness: 0.88,
      sheen: 0.45,
      sheenRoughness: 0.7,
      sheenColor: new THREE.Color(0x8a7058),
      envMapIntensity: 0.2,
    }),
    mattress: physical({
      ...mattress,
      color: 0x8a7864,
      metalness: 0.0,
      roughness: 0.9,
      sheen: 0.3,
      sheenColor: new THREE.Color(0xb0a090),
    }),
    leather: physical({
      ...leather,
      color: 0x6a4a38,
      metalness: 0.04,
      roughness: 0.68,
      sheen: 0.2,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x9bb8c0,
      metalness: 0.0,
      roughness: 0.06,
      transmission: 0.0,
      transparent: true,
      opacity: 0.22,
      thickness: 0.08,
      envMapIntensity: 1.4,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      side: THREE.DoubleSide,
    }),
    glassThick: new THREE.MeshPhysicalMaterial({
      color: 0x7a96a0,
      metalness: 0.05,
      roughness: 0.08,
      transparent: true,
      opacity: 0.12,
      envMapIntensity: 1.6,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      side: THREE.DoubleSide,
    }),
    wetGlass: new THREE.MeshPhysicalMaterial({
      color: 0x8aa4ac,
      metalness: 0.0,
      roughness: 0.18,
      roughnessMap: condensation,
      transparent: true,
      opacity: 0.32,
      envMapIntensity: 1.2,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide,
    }),
    emissiveGreen: new THREE.MeshStandardMaterial({
      color: 0x0a1a10,
      emissive: new THREE.Color(PALETTE.instrumentGreen),
      emissiveIntensity: 0.85,
      roughness: 0.35,
      metalness: 0.1,
    }),
    emissiveAmber: new THREE.MeshStandardMaterial({
      color: 0x1a1206,
      emissive: new THREE.Color(PALETTE.instrumentAmber),
      emissiveIntensity: 0.7,
      roughness: 0.35,
    }),
    emissiveCyan: new THREE.MeshStandardMaterial({
      color: 0x061218,
      emissive: new THREE.Color(PALETTE.instrumentCyan),
      emissiveIntensity: 0.65,
      roughness: 0.32,
    }),
    emissiveRed: new THREE.MeshStandardMaterial({
      color: 0x140808,
      emissive: new THREE.Color(0x8a2018),
      emissiveIntensity: 0.45,
      roughness: 0.4,
    }),
    lightWarm: new THREE.MeshStandardMaterial({
      color: 0xffe6b8,
      emissive: new THREE.Color(0xffd9a0),
      emissiveIntensity: 1.4,
      roughness: 0.4,
    }),
    lightCool: new THREE.MeshStandardMaterial({
      color: 0xb8d4dc,
      emissive: new THREE.Color(0x88c0cc),
      emissiveIntensity: 0.9,
      roughness: 0.35,
    }),
    blackout: new THREE.MeshStandardMaterial({
      color: 0x050608,
      roughness: 0.95,
      metalness: 0,
    }),
    foam: physical({
      ...rubber,
      color: 0x3a3834,
      metalness: 0,
      roughness: 0.92,
    }),
  };

  mats.screen = (map) => new THREE.MeshStandardMaterial({
    map,
    emissive: 0xffffff,
    emissiveMap: map,
      emissiveIntensity: 0.95,
    roughness: 0.28,
    metalness: 0.05,
  });

  mats.label = (map) => new THREE.MeshStandardMaterial({
    map,
    roughness: 0.62,
    metalness: 0.08,
  });

  return mats;
}

function physical(opts) {
  const params = {
    color: opts.color ?? 0xffffff,
    metalness: opts.metalness ?? 0.2,
    roughness: opts.roughness ?? 0.5,
    clearcoat: opts.clearcoat ?? 0,
    clearcoatRoughness: opts.clearcoatRoughness ?? 0.4,
    envMapIntensity: opts.envMapIntensity ?? 0.6,
    sheen: opts.sheen ?? 0,
    sheenRoughness: opts.sheenRoughness ?? 0.6,
    normalScale: opts.normalScale ?? new THREE.Vector2(0.6, 0.6),
  };
  if (opts.map) params.map = opts.map.clone();
  if (opts.roughnessMap) params.roughnessMap = opts.roughnessMap.clone();
  if (opts.normalMap) params.normalMap = opts.normalMap.clone();
  if (opts.aoMap) params.aoMap = opts.aoMap.clone();
  if (opts.sheenColor) params.sheenColor = opts.sheenColor;
  const mat = new THREE.MeshPhysicalMaterial(params);
  if (params.map) {
    const rx = opts.repeatX ?? 1;
    const ry = opts.repeatY ?? 1;
    params.map.repeat.set(rx, ry);
    params.map.needsUpdate = true;
    if (params.roughnessMap) params.roughnessMap.repeat.set(rx, ry);
    if (params.normalMap) params.normalMap.repeat.set(rx, ry);
    if (params.aoMap) params.aoMap.repeat.set(rx, ry);
  }
  return mat;
}

export function applyEnvMap(materials, envMap, intensityScale = 1) {
  for (const value of Object.values(materials)) {
    if (value && value.isMaterial) {
      value.envMap = envMap;
      if (value.envMapIntensity != null) value.envMapIntensity *= intensityScale;
      value.needsUpdate = true;
    }
  }
}

export function setWearState(materials, used) {
  const scale = used ? 1 : 0.35;
  for (const value of Object.values(materials)) {
    if (!value || !value.isMaterial) continue;
    if (!value.userData) value.userData = {};
    if (value.normalScale) {
      value.userData.baseNormal = value.userData.baseNormal ?? value.normalScale.clone();
      value.normalScale.copy(value.userData.baseNormal).multiplyScalar(used ? 1 : 0.55);
    }
    if (value.roughness != null && value.userData.baseRough == null) {
      value.userData.baseRough = value.roughness;
    }
    if (value.userData.baseRough != null) {
      value.roughness = THREE.MathUtils.lerp(value.userData.baseRough * 0.85, value.userData.baseRough, scale);
    }
  }
}
