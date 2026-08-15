import * as THREE from 'three';
import {
  paintedSteelMaps,
  hullGreenMaps,
  chippedPaintMaps,
  brushedMetalMaps,
  oilyMachineMaps,
  rubberMaps,
  fabricMaps,
  blanketMaps,
  plasticMaps,
  pipePaintMaps,
  rustGrimeMaps,
  wetMaps,
  grateMaps,
  condensationOverlay,
} from './textures.js';

export function createMaterials(seed = 1) {
  const painted = paintedSteelMaps(seed + 1);
  const green = hullGreenMaps(seed + 2);
  const chipped = chippedPaintMaps(seed + 3);
  const brushed = brushedMetalMaps(seed + 4);
  const oily = oilyMachineMaps(seed + 5);
  const rubber = rubberMaps(seed + 6);
  const fabric = fabricMaps(seed + 7);
  const blanket = blanketMaps(seed + 8);
  const plastic = plasticMaps(seed + 9);
  const pipe = pipePaintMaps(seed + 10);
  const rust = rustGrimeMaps(seed + 11);
  const wet = wetMaps(seed + 12);
  const grate = grateMaps(seed + 13);

  const hullPaint = new THREE.MeshStandardMaterial({
    color: 0xd4cfc0,
    map: painted.map,
    roughnessMap: painted.roughnessMap,
    normalMap: painted.normalMap,
    roughness: 0.55,
    metalness: 0.08,
    envMapIntensity: 0.55,
  });
  hullPaint.normalScale.set(0.45, 0.45);

  const hullGreen = new THREE.MeshStandardMaterial({
    color: 0x8a9480,
    map: green.map,
    roughnessMap: green.roughnessMap,
    normalMap: green.normalMap,
    roughness: 0.6,
    metalness: 0.06,
    envMapIntensity: 0.45,
  });
  hullGreen.normalScale.set(0.4, 0.4);

  const chippedPaint = new THREE.MeshStandardMaterial({
    color: 0xb0aa9a,
    map: chipped.map,
    roughnessMap: chipped.roughnessMap,
    normalMap: chipped.normalMap,
    roughness: 0.58,
    metalness: 0.18,
    envMapIntensity: 0.6,
  });
  chippedPaint.normalScale.set(0.7, 0.7);

  const brushedMetal = new THREE.MeshStandardMaterial({
    color: 0x9aa0a6,
    map: brushed.map,
    roughnessMap: brushed.roughnessMap,
    normalMap: brushed.normalMap,
    roughness: 0.32,
    metalness: 0.86,
    envMapIntensity: 1.1,
  });
  brushedMetal.normalScale.set(0.85, 0.85);

  const oilyMachine = new THREE.MeshPhysicalMaterial({
    color: 0x3d4148,
    map: oily.map,
    roughnessMap: oily.roughnessMap,
    normalMap: oily.normalMap,
    roughness: 0.38,
    metalness: 0.78,
    clearcoat: 0.35,
    clearcoatRoughness: 0.4,
    envMapIntensity: 1.0,
  });
  oilyMachine.normalScale.set(0.35, 0.35);

  const gunmetal = new THREE.MeshStandardMaterial({
    color: 0x4a4e54,
    map: oily.map,
    roughnessMap: oily.roughnessMap,
    normalMap: oily.normalMap,
    roughness: 0.44,
    metalness: 0.82,
    envMapIntensity: 0.95,
  });

  const machineBlue = new THREE.MeshStandardMaterial({
    color: 0x4e5964,
    map: pipe.map,
    roughnessMap: pipe.roughnessMap,
    normalMap: pipe.normalMap,
    roughness: 0.5,
    metalness: 0.35,
    envMapIntensity: 0.7,
  });

  const rubberFloor = new THREE.MeshStandardMaterial({
    color: 0x232224,
    map: rubber.map,
    roughnessMap: rubber.roughnessMap,
    normalMap: rubber.normalMap,
    roughness: 0.88,
    metalness: 0.02,
    envMapIntensity: 0.25,
  });
  rubberFloor.normalScale.set(1.1, 1.1);

  const deckCoat = new THREE.MeshStandardMaterial({
    color: 0x2c2a26,
    map: rubber.map,
    roughnessMap: rubber.roughnessMap,
    normalMap: grate.normalMap,
    roughness: 0.8,
    metalness: 0.12,
    envMapIntensity: 0.3,
  });

  const fabricMat = new THREE.MeshStandardMaterial({
    color: 0x8a96a4,
    map: fabric.map,
    roughnessMap: fabric.roughnessMap,
    normalMap: fabric.normalMap,
    roughness: 0.9,
    metalness: 0.0,
    envMapIntensity: 0.2,
  });
  fabricMat.normalScale.set(0.8, 0.8);

  const blanketMat = new THREE.MeshStandardMaterial({
    color: 0x5a6a7a,
    map: blanket.map,
    roughnessMap: blanket.roughnessMap,
    normalMap: blanket.normalMap,
    roughness: 0.92,
    metalness: 0.0,
    envMapIntensity: 0.18,
  });

  const pillowMat = new THREE.MeshStandardMaterial({
    color: 0xc8c2b4,
    map: fabric.map,
    roughnessMap: fabric.roughnessMap,
    normalMap: fabric.normalMap,
    roughness: 0.86,
    metalness: 0.0,
  });

  const plasticMat = new THREE.MeshStandardMaterial({
    color: 0x2c3034,
    map: plastic.map,
    roughnessMap: plastic.roughnessMap,
    roughness: 0.42,
    metalness: 0.05,
    envMapIntensity: 0.4,
  });

  const bakelite = new THREE.MeshStandardMaterial({
    color: 0x2a1c14,
    roughness: 0.48,
    metalness: 0.04,
    envMapIntensity: 0.35,
  });

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xb8c8c8,
    roughness: 0.06,
    metalness: 0.0,
    transmission: 0.0,
    transparent: true,
    opacity: 0.22,
    thickness: 0.08,
    envMapIntensity: 1.4,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    side: THREE.DoubleSide,
  });

  const thickGlass = new THREE.MeshPhysicalMaterial({
    color: 0x8aa0a4,
    roughness: 0.08,
    metalness: 0.02,
    transparent: true,
    opacity: 0.18,
    envMapIntensity: 1.6,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    side: THREE.DoubleSide,
  });

  const wetSteel = new THREE.MeshPhysicalMaterial({
    color: 0x8a8e88,
    map: wet.map,
    roughnessMap: wet.roughnessMap,
    normalMap: wet.normalMap,
    roughness: 0.18,
    metalness: 0.55,
    clearcoat: 0.7,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.15,
  });

  const rustMat = new THREE.MeshStandardMaterial({
    color: 0x8a4a2a,
    map: rust.map,
    roughnessMap: rust.roughnessMap,
    normalMap: rust.normalMap,
    roughness: 0.9,
    metalness: 0.15,
  });

  const pipeMat = new THREE.MeshStandardMaterial({
    color: 0x7a8278,
    map: pipe.map,
    roughnessMap: pipe.roughnessMap,
    normalMap: pipe.normalMap,
    roughness: 0.5,
    metalness: 0.28,
    envMapIntensity: 0.65,
  });

  const pipeCopper = new THREE.MeshStandardMaterial({
    color: 0x8a5a38,
    map: pipe.map,
    roughness: 0.4,
    metalness: 0.7,
    envMapIntensity: 0.9,
  });

  const pipeBlue = new THREE.MeshStandardMaterial({
    color: 0x3d5a6a,
    map: pipe.map,
    roughnessMap: pipe.roughnessMap,
    roughness: 0.48,
    metalness: 0.22,
  });

  const pipeRed = new THREE.MeshStandardMaterial({
    color: 0x6a3a34,
    map: pipe.map,
    roughness: 0.5,
    metalness: 0.2,
  });

  const grateMat = new THREE.MeshStandardMaterial({
    color: 0x3a3834,
    map: grate.map,
    roughnessMap: grate.roughnessMap,
    normalMap: grate.normalMap,
    roughness: 0.62,
    metalness: 0.45,
    envMapIntensity: 0.55,
  });
  grateMat.normalScale.set(1.4, 1.4);

  const emissiveGreen = new THREE.MeshStandardMaterial({
    color: 0x102010,
    emissive: 0x3dff7a,
    emissiveIntensity: 0.85,
    roughness: 0.35,
    metalness: 0.1,
  });

  const emissiveAmber = new THREE.MeshStandardMaterial({
    color: 0x201808,
    emissive: 0xffa030,
    emissiveIntensity: 0.7,
    roughness: 0.35,
  });

  const emissiveRed = new THREE.MeshStandardMaterial({
    color: 0x180808,
    emissive: 0xff4030,
    emissiveIntensity: 0.55,
    roughness: 0.4,
  });

  const lightWarm = new THREE.MeshStandardMaterial({
    color: 0xffe6b8,
    emissive: 0xffd090,
    emissiveIntensity: 1.4,
    roughness: 0.3,
  });

  const lightCool = new THREE.MeshStandardMaterial({
    color: 0xc8e8ff,
    emissive: 0x88c8ff,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });

  const leather = new THREE.MeshStandardMaterial({
    color: 0x3a2a22,
    roughness: 0.62,
    metalness: 0.04,
    envMapIntensity: 0.3,
  });

  const condensation = new THREE.MeshPhysicalMaterial({
    color: 0xc8d4d8,
    map: condensationOverlay(seed + 14),
    transparent: true,
    opacity: 0.28,
    roughness: 0.15,
    metalness: 0,
    depthWrite: false,
  });

  const blackout = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    roughness: 0.9,
    metalness: 0,
  });

  const warning = new THREE.MeshStandardMaterial({
    color: 0xb56a32,
    roughness: 0.55,
    metalness: 0.08,
  });

  const yellow = new THREE.MeshStandardMaterial({
    color: 0xb59a45,
    roughness: 0.52,
    metalness: 0.08,
  });

  const mats = {
    hullPaint,
    hullGreen,
    chippedPaint,
    brushedMetal,
    oilyMachine,
    gunmetal,
    machineBlue,
    rubberFloor,
    deckCoat,
    fabric: fabricMat,
    blanket: blanketMat,
    pillow: pillowMat,
    plastic: plasticMat,
    bakelite,
    glass,
    thickGlass,
    wetSteel,
    rust: rustMat,
    pipe: pipeMat,
    pipeCopper,
    pipeBlue,
    pipeRed,
    grate: grateMat,
    emissiveGreen,
    emissiveAmber,
    emissiveRed,
    lightWarm,
    lightCool,
    leather,
    condensation,
    blackout,
    warning,
    yellow,
  };

  mats.setWear = (mode) => {
    const used = mode !== 'clean';
    const intensity = used ? 1 : 0.25;
    hullPaint.normalScale.set(0.45 * intensity + 0.15, 0.45 * intensity + 0.15);
    chippedPaint.normalScale.set(0.7 * intensity + 0.2, 0.7 * intensity + 0.2);
    oilyMachine.clearcoat = used ? 0.35 : 0.15;
  };

  mats.all = Object.values(mats).filter((m) => m && m.isMaterial);
  return mats;
}
