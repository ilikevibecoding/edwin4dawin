import * as THREE from 'three';
import { RARITY_COLOR, WEAPONS } from './config.js';

const geo = {
  leg: new THREE.BoxGeometry(0.28, 0.8, 0.3),
  torso: new THREE.BoxGeometry(0.72, 0.68, 0.4),
  arm: new THREE.BoxGeometry(0.22, 0.7, 0.24),
  head: new THREE.BoxGeometry(0.42, 0.42, 0.42),
  hair: new THREE.BoxGeometry(0.46, 0.14, 0.46),
  visor: new THREE.BoxGeometry(0.34, 0.1, 0.05),
};

const OUTFITS = [
  { shirt: 0xe84c4c, pants: 0x2c3e50, skin: 0xf1c27d, hair: 0x3b2417 },
  { shirt: 0x3fa7f5, pants: 0x1b1f3a, skin: 0xc68642, hair: 0x111111 },
  { shirt: 0x58d68d, pants: 0x34495e, skin: 0xffdbac, hair: 0xd4a017 },
  { shirt: 0xf5b041, pants: 0x2e2e2e, skin: 0x8d5524, hair: 0x222222 },
  { shirt: 0xaf7ac5, pants: 0x1f2a44, skin: 0xe0ac69, hair: 0x5a3825 },
  { shirt: 0xf1f1f1, pants: 0x3a3a3a, skin: 0xf1c27d, hair: 0xb55239 },
  { shirt: 0x2ecc71, pants: 0x1a252f, skin: 0xc68642, hair: 0x111111 },
  { shirt: 0x1abc9c, pants: 0x4a235a, skin: 0xffdbac, hair: 0x6e4b2a },
  { shirt: 0xff6fb5, pants: 0x212f3d, skin: 0x8d5524, hair: 0x000000 },
  { shirt: 0xf7dc6f, pants: 0x1c2833, skin: 0xe0ac69, hair: 0x8e5b3b },
];

export function randomOutfit(rng) {
  return rng.pick(OUTFITS);
}

/**
 * Blocky humanoid. Height 1.8. Returns { group, parts, hand } where `hand` is an anchor for held items.
 * Every mesh gets userData.part ('head' | 'body') so raycasts can detect headshots.
 */
export function createCharacter(outfit, tag) {
  const group = new THREE.Group();
  const mk = (g, color, part) => {
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color }));
    m.userData.part = part;
    m.castShadow = true;
    return m;
  };
  const leftLeg = mk(geo.leg, outfit.pants, 'body');
  const rightLeg = mk(geo.leg, outfit.pants, 'body');
  leftLeg.position.set(-0.17, 0.4, 0);
  rightLeg.position.set(0.17, 0.4, 0);
  const torso = mk(geo.torso, outfit.shirt, 'body');
  torso.position.set(0, 1.14, 0);
  const leftArm = mk(geo.arm, outfit.shirt, 'body');
  const rightArm = mk(geo.arm, outfit.shirt, 'body');
  const leftArmPivot = new THREE.Group();
  const rightArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.48, 1.45, 0);
  rightArmPivot.position.set(0.48, 1.45, 0);
  leftArm.position.set(0, -0.32, 0);
  rightArm.position.set(0, -0.32, 0);
  leftArmPivot.add(leftArm);
  rightArmPivot.add(rightArm);
  const head = mk(geo.head, outfit.skin, 'head');
  head.position.set(0, 1.7, 0);
  const hair = mk(geo.hair, outfit.hair, 'head');
  hair.position.set(0, 0.24, 0);
  head.add(hair);
  const visor = mk(geo.visor, 0x222222, 'head');
  visor.position.set(0, 0.04, 0.22);
  head.add(visor);

  const hand = new THREE.Group();
  hand.position.set(0.05, -0.62, 0.15);
  rightArmPivot.add(hand);

  group.add(leftLeg, rightLeg, torso, leftArmPivot, rightArmPivot, head);
  const meshes = [leftLeg, rightLeg, torso, leftArm, rightArm, head, hair, visor];
  for (const m of meshes) m.userData.tag = tag;

  return {
    group,
    meshes,
    parts: { leftLeg, rightLeg, torso, leftArmPivot, rightArmPivot, head },
    hand,
    phase: 0,
  };
}

export function animateCharacter(ch, dt, speed, aiming) {
  const moving = speed > 0.5;
  ch.phase += dt * Math.min(speed, 9) * 1.5;
  const swing = moving ? Math.sin(ch.phase) * 0.7 : 0;
  ch.parts.leftLeg.rotation.x = swing;
  ch.parts.rightLeg.rotation.x = -swing;
  if (aiming) {
    ch.parts.rightArmPivot.rotation.x = -Math.PI / 2 + 0.15;
    ch.parts.leftArmPivot.rotation.x = -Math.PI / 2 + 0.35;
    ch.parts.leftArmPivot.rotation.z = -0.4;
  } else {
    ch.parts.rightArmPivot.rotation.x = -swing * 0.8;
    ch.parts.leftArmPivot.rotation.x = swing * 0.8;
    ch.parts.leftArmPivot.rotation.z = 0;
  }
}

export function flashCharacter(ch, color = 0xff6666) {
  for (const m of ch.meshes) {
    if (!m.userData.baseColor) m.userData.baseColor = m.material.color.getHex();
    m.material.emissive.setHex(color);
    m.material.emissiveIntensity = 0.7;
  }
  setTimeout(() => {
    for (const m of ch.meshes) m.material.emissive.setHex(0x000000);
  }, 90);
}

/** Simple boxy weapon model, oriented so the barrel points along -Z (forward) when held. */
export function createWeaponModel(type, rarity) {
  const def = WEAPONS[type];
  const group = new THREE.Group();
  const body = new THREE.MeshLambertMaterial({ color: 0x2b2f36 });
  const accent = new THREE.MeshLambertMaterial({ color: RARITY_COLOR[rarity] || 0xffffff });
  const wood = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
  const len = def.length;
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, len), body);
  barrel.position.set(0, 0.04, -len / 2);
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, Math.min(0.35, len * 0.5)), body);
  receiver.position.set(0, 0, -0.1);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), type === 'shotgun' || type === 'sniper' ? wood : body);
  grip.position.set(0, -0.12, 0.02);
  grip.rotation.x = 0.3;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.16), accent);
  stripe.position.set(0, 0.09, -0.1);
  group.add(barrel, receiver, grip, stripe);
  if (type === 'ar' || type === 'smg') {
    const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.08), body);
    magazine.position.set(0, -0.12, -0.25);
    group.add(magazine);
  }
  if (type === 'sniper') {
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.28, 8), body);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.13, -0.2);
    group.add(scope);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.3), wood);
    stock.position.set(0, -0.03, 0.2);
    group.add(stock);
  }
  if (type === 'shotgun') {
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.22), wood);
    pump.position.set(0, -0.03, -0.45);
    group.add(pump);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.28), wood);
    stock.position.set(0, -0.03, 0.18);
    group.add(stock);
  }
  group.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return group;
}

export function createPickaxeModel() {
  const group = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 8), new THREE.MeshLambertMaterial({ color: 0x6b4423 }));
  handle.position.set(0, 0.2, 0);
  const headMat = new THREE.MeshLambertMaterial({ color: 0xb8c4d0 });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.1), headMat);
  head.position.set(0.1, 0.62, 0);
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), headMat);
  spike.rotation.z = -Math.PI / 2;
  spike.position.set(0.4, 0.62, 0);
  group.add(handle, head, spike);
  group.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return group;
}

/** Parachute-style glider shown above a skydiving character. */
export function createGliderMesh(color = 0xff8f2b) {
  const g = new THREE.Group();
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(2.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.4),
    new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }),
  );
  canopy.scale.set(1.25, 0.55, 1);
  canopy.position.y = 2.5;
  g.add(canopy);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xdddddd });
  for (const [x, z] of [[-1.6, 0.6], [1.6, 0.6], [-1.6, -0.6], [1.6, -0.6]]) {
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 4), lineMat);
    line.position.set(x * 0.4, 1.9, z * 0.5);
    line.lookAt(new THREE.Vector3(x, 3.2, z));
    line.rotateX(Math.PI / 2);
    g.add(line);
  }
  return g;
}

/** Placeholder held-item for consumables. */
export function createConsumableModel(color) {
  const group = new THREE.Group();
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.26, 10), new THREE.MeshLambertMaterial({ color }));
  bottle.position.y = 0.05;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8), new THREE.MeshLambertMaterial({ color: 0xdddddd }));
  cap.position.y = 0.21;
  group.add(bottle, cap);
  return group;
}
