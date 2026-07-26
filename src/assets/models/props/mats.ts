import * as THREE from 'three';
import { getMaterial } from '../../materials';
import { screen, type ScreenKind } from '../../textures/signage';

/** Shared prop material palette (Fable 3) — named for batch debugging. */
function m(name: string, opts: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial(opts);
  mat.name = name;
  mat.envMapIntensity = 0.55;
  return mat;
}

export const M = {
  // furniture
  birch: (): THREE.MeshStandardMaterial => getMaterial('wood-veneer').mat,
  walnut: m('walnut', { color: 0x5e4630, roughness: 0.5 }),
  laminate: m('laminate', { color: 0xd8d2c4, roughness: 0.45 }),
  laminateDark: m('laminate-dark', { color: 0x4a4e54, roughness: 0.5 }),
  graphite: m('graphite', { color: 0x3a3f45, roughness: 0.7 }),
  panelFabric: m('panel-fabric', { color: 0x9aa1a6, roughness: 0.95 }),
  panelFabricBlue: m('panel-fabric-blue', { color: 0x7a8b98, roughness: 0.95 }),
  seatFabric: m('seat-fabric', { color: 0x3e4a56, roughness: 0.95 }),
  seatFabricWarm: m('seat-fabric-warm', { color: 0x6b5648, roughness: 0.95 }),
  leather: m('leather', { color: 0x2e2a26, roughness: 0.6 }),
  sofaBlue: m('sofa-blue', { color: 0x46606e, roughness: 0.92 }),
  // metals
  alu: m('alu', { color: 0xb4bac0, roughness: 0.38, metalness: 0.8 }),
  steel: m('steel', { color: 0x7e878e, roughness: 0.45, metalness: 0.7 }),
  steelDark: m('steel-dark', { color: 0x3c4248, roughness: 0.5, metalness: 0.6 }),
  chrome: m('chrome', { color: 0xc8cdd2, roughness: 0.18, metalness: 0.95 }),
  stainless: m('stainless', { color: 0xa8aeb4, roughness: 0.3, metalness: 0.9 }),
  galv: (): THREE.MeshStandardMaterial => getMaterial('metal-galv').mat,
  brass: m('brass', { color: 0xa98d5f, roughness: 0.35, metalness: 0.85 }),
  // plastics
  plasticBlack: m('plastic-black', { color: 0x1e2226, roughness: 0.6 }),
  plasticDark: m('plastic-dark', { color: 0x33383e, roughness: 0.55 }),
  plasticGray: m('plastic-gray', { color: 0x878d92, roughness: 0.6 }),
  plasticWhite: m('plastic-white', { color: 0xdcdcd6, roughness: 0.5 }),
  plasticBeige: m('plastic-beige', { color: 0xc9c2ae, roughness: 0.55 }),
  rubber: m('rubber', { color: 0x22262a, roughness: 0.92 }),
  // ceramics & glass
  ceramic: m('ceramic', { color: 0xe8eae8, roughness: 0.15 }),
  mirror: m('mirror', { color: 0xc9d4da, roughness: 0.03, metalness: 1.0 }),
  glassTint: (() => {
    const g = new THREE.MeshPhysicalMaterial({
      color: 0xcfe4e4, transparent: true, opacity: 0.25, roughness: 0.08, metalness: 0,
      side: THREE.DoubleSide, depthWrite: false,
    });
    g.name = 'glass-tint';
    return g;
  })(),
  // paper & cardboard
  paper: m('paper', { color: 0xeeebe2, roughness: 0.9 }),
  cardboard: m('cardboard', { color: 0xb08d5e, roughness: 0.92 }),
  cardboardDark: m('cardboard-dark', { color: 0x8f6f48, roughness: 0.92 }),
  // colors & accents
  safetyYellow: m('safety-yellow', { color: 0xd8b13a, roughness: 0.55 }),
  safetyRed: m('safety-red', { color: 0xc23b2e, roughness: 0.5 }),
  tealAccent: m('teal-accent', { color: 0x2e7d84, roughness: 0.6 }),
  plant: m('plant', { color: 0x3e6b3a, roughness: 0.9 }),
  plantDark: m('plant-dark', { color: 0x2c5230, roughness: 0.9 }),
  soil: m('soil', { color: 0x3a2e24, roughness: 1 }),
  snowMat: (): THREE.MeshStandardMaterial => getMaterial('snow').mat,
  vanWhite: m('van-white', { color: 0xd8dde0, roughness: 0.35, metalness: 0.15 }),
  vanDark: m('van-dark', { color: 0x24282c, roughness: 0.5 }),
  // emissives
  ledCyan: m('led-cyan', { color: 0x0b2226, emissive: 0x37d0e6, emissiveIntensity: 1.6, roughness: 0.4 }),
  ledGreen: m('led-green', { color: 0x0c2012, emissive: 0x48ff7a, emissiveIntensity: 1.4, roughness: 0.4 }),
  ledAmber: m('led-amber', { color: 0x241a08, emissive: 0xffb03a, emissiveIntensity: 1.5, roughness: 0.4 }),
  ledRed: m('led-red', { color: 0x260c08, emissive: 0xff4030, emissiveIntensity: 1.6, roughness: 0.4 }),
  lampWarm: m('lamp-warm', { color: 0x584a30, emissive: 0xffd9a0, emissiveIntensity: 2.4, roughness: 0.4 }),
  troffer: m('troffer', { color: 0x9aa0a4, emissive: 0xeef2ea, emissiveIntensity: 1.35, roughness: 0.4 }),
  trofferOff: m('troffer-off', { color: 0xb0b6ba, emissive: 0x22262a, emissiveIntensity: 0.1, roughness: 0.4 }),
  sodiumLamp: m('sodium-lamp', { color: 0x4a3a20, emissive: 0xffb46b, emissiveIntensity: 2.2, roughness: 0.4 }),
};

const screenMats = new Map<string, THREE.MeshStandardMaterial>();
export function screenMat(kind: ScreenKind): THREE.MeshStandardMaterial {
  let sm = screenMats.get(kind);
  if (!sm) {
    const tex = screen(kind);
    sm = new THREE.MeshStandardMaterial({
      color: 0x0a0c0e,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: kind === 'off' ? 0.05 : 1.15,
      roughness: 0.2,
      metalness: 0,
    });
    sm.name = `screen-${kind}`;
    screenMats.set(kind, sm);
  }
  return sm;
}
