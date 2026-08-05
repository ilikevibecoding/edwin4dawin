// Shared material library. Materials are created once and reused across the
// whole base so the renderer can batch aggressively and shader compiles stay
// low even though the scene is heavily kit-bashed.
import * as THREE from 'three';
import * as T from './textures.js';

const M = {};
let built = false;

function repeat(tex, x, y) {
  const t = tex.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(x, y);
  t.needsUpdate = true;
  return t;
}

export function buildMaterials() {
  if (built) return M;
  built = true;

  M.concrete = new THREE.MeshStandardMaterial({
    map: repeat(T.concrete(0), 3, 3),
    normalMap: repeat(T.concreteNormal(), 3, 3),
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 0.94,
    metalness: 0.02,
    color: 0xc7c7bf,
  });

  M.concreteDark = new THREE.MeshStandardMaterial({
    map: repeat(T.concrete(1), 2, 2),
    normalMap: repeat(T.concreteNormal(), 2, 2),
    roughness: 0.96,
    metalness: 0.02,
    color: 0x8f8f88,
  });

  M.asphalt = new THREE.MeshStandardMaterial({
    map: repeat(T.concrete(1), 6, 6),
    normalMap: repeat(T.concreteNormal(), 6, 6),
    color: 0x5b5a58,
    roughness: 0.98,
    metalness: 0.0,
  });

  M.gravel = new THREE.MeshStandardMaterial({
    map: repeat(T.sand(1), 8, 8),
    normalMap: repeat(T.sandNormal(), 8, 8),
    color: 0x9b8f74,
    roughness: 1.0,
    metalness: 0.0,
  });

  // --- painted military panels -------------------------------------------
  const olive = T.militaryPanel({ key: 'olive', base: '#49513f', dark: '#333a2b', light: '#5d654f', seed: 5 });
  const sandPaint = T.militaryPanel({ key: 'sandp', base: '#9a8b6a', dark: '#77694c', light: '#b0a17d', seed: 17 });
  const greyPaint = T.militaryPanel({ key: 'greyp', base: '#6d7175', dark: '#4d5155', light: '#84888c', seed: 29 });
  const whitePaint = T.militaryPanel({ key: 'whitep', base: '#c9c8c1', dark: '#9e9d96', light: '#e2e1da', seed: 41 });
  const nrm = T.panelNormal('panelNrmA', 5);

  M.panelOlive = new THREE.MeshStandardMaterial({
    map: olive, normalMap: nrm, normalScale: new THREE.Vector2(0.7, 0.7),
    roughnessMap: T.wearRoughness(8), roughness: 0.78, metalness: 0.28,
  });
  M.panelSand = new THREE.MeshStandardMaterial({
    map: sandPaint, normalMap: nrm, normalScale: new THREE.Vector2(0.7, 0.7),
    roughnessMap: T.wearRoughness(9), roughness: 0.8, metalness: 0.22,
  });
  M.panelGrey = new THREE.MeshStandardMaterial({
    map: greyPaint, normalMap: nrm, normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: T.wearRoughness(10), roughness: 0.7, metalness: 0.4,
  });
  M.panelWhite = new THREE.MeshStandardMaterial({
    map: whitePaint, normalMap: nrm, normalScale: new THREE.Vector2(0.5, 0.5),
    roughnessMap: T.wearRoughness(11), roughness: 0.62, metalness: 0.24,
  });

  M.corrugated = new THREE.MeshStandardMaterial({
    map: repeat(T.corrugated('#4f5745'), 3, 1),
    normalMap: repeat(T.corrugatedNormal(), 3, 1),
    normalScale: new THREE.Vector2(1.1, 1.1),
    roughness: 0.82, metalness: 0.34,
  });

  M.rusted = new THREE.MeshStandardMaterial({
    map: T.rustedMetal(), normalMap: nrm, roughness: 0.88, metalness: 0.45,
  });

  M.heatSteel = new THREE.MeshStandardMaterial({
    map: T.heatSteel(), roughness: 0.55, metalness: 0.82,
  });

  M.darkMetal = new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.62, metalness: 0.72 });
  M.blackMetal = new THREE.MeshStandardMaterial({ color: 0x16181a, roughness: 0.5, metalness: 0.8 });
  M.steel = new THREE.MeshStandardMaterial({ color: 0x81878c, roughness: 0.42, metalness: 0.88 });
  M.galvanised = new THREE.MeshStandardMaterial({ color: 0x6f746e, roughness: 0.68, metalness: 0.62 });
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.95, metalness: 0.05 });
  M.hydraulic = new THREE.MeshStandardMaterial({ color: 0xaeb4ba, roughness: 0.22, metalness: 0.95 });
  M.brass = new THREE.MeshStandardMaterial({ color: 0xb08d4a, roughness: 0.34, metalness: 0.9 });
  M.olivePlain = new THREE.MeshStandardMaterial({ color: 0x424a38, roughness: 0.82, metalness: 0.2 });
  M.sandPlain = new THREE.MeshStandardMaterial({ color: 0x9c8e6c, roughness: 0.85, metalness: 0.15 });
  M.canvasTarp = new THREE.MeshStandardMaterial({ color: 0x54573f, roughness: 0.98, metalness: 0.0 });

  M.glass = new THREE.MeshPhysicalMaterial({
    color: 0x8fa6b2, roughness: 0.08, metalness: 0.0, transparent: true, opacity: 0.36,
    envMapIntensity: 1.4, side: THREE.DoubleSide,
  });
  M.darkGlass = new THREE.MeshPhysicalMaterial({
    color: 0x121a1e, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.72,
  });

  M.chainLink = new THREE.MeshStandardMaterial({
    map: repeat(T.chainLink(), 1, 1), transparent: true, alphaTest: 0.35,
    side: THREE.DoubleSide, roughness: 0.55, metalness: 0.75, color: 0xb8bcb8,
  });
  M.camoNet = new THREE.MeshStandardMaterial({
    map: T.camoNet(), transparent: true, alphaTest: 0.25, side: THREE.DoubleSide,
    roughness: 0.95, metalness: 0.0, color: 0x7b7f5e,
  });
  M.sandbag = new THREE.MeshStandardMaterial({
    map: T.sandbag(), normalMap: T.sandNormal(), roughness: 1.0, metalness: 0.0,
  });

  M.hazard = new THREE.MeshStandardMaterial({
    map: T.hazardStripes(), roughness: 0.8, metalness: 0.1,
  });

  M.padMarkings = new THREE.MeshStandardMaterial({
    map: T.padMarkings('launchpad'), transparent: true, roughness: 0.9,
    polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false,
  });

  M.scorch = new THREE.MeshStandardMaterial({
    map: T.scorch(), transparent: true, roughness: 1.0, color: 0x2a2724,
    polygonOffset: true, polygonOffsetFactor: -3, depthWrite: false, opacity: 0.9,
  });

  // --- status / emissive --------------------------------------------------
  M.lampGlassOn = new THREE.MeshStandardMaterial({
    color: 0xfff2d0, emissive: 0xfff0cc, emissiveIntensity: 6, roughness: 0.3,
  });
  M.lampGlassOff = new THREE.MeshStandardMaterial({ color: 0x8a8d86, roughness: 0.3, metalness: 0.3 });

  M.ledGreen = statusMat(0x2bff7a, 3.0);
  M.ledRed = statusMat(0xff3a2a, 3.0);
  M.ledAmber = statusMat(0xffb029, 3.0);
  M.ledBlue = statusMat(0x49b8ff, 3.0);
  M.ledOff = new THREE.MeshStandardMaterial({ color: 0x2a2e2a, roughness: 0.4, metalness: 0.3 });

  M.screenGreen = new THREE.MeshBasicMaterial({ color: 0x0d2a1c });

  return M;
}

function statusMat(color, intensity) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.25),
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.35,
    metalness: 0.0,
  });
}

export function mats() {
  return built ? M : buildMaterials();
}

export function additive(color, tex, opts = {}) {
  return new THREE.SpriteMaterial({
    map: tex,
    color,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    ...opts,
  });
}
