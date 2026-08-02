// People. They are mostly seen in silhouette or at a distance, but the duel
// needs two figures that can actually move, so everyone is built on the same
// small rig: hips -> torso -> head, with two-segment arms and legs.

import * as THREE from 'three';
import { box, cyl, dome, addMesh } from '../gfx/build.js';
import { paint, emissive, gloss } from '../gfx/materials.js';

/**
 * @returns {THREE.Group} with userData.rig = { hips, torso, head, arms:[{shoulder,elbow,hand}], legs:[{hip,knee,foot}] }
 */
export function rigHumanoid({
  height = 1.8,
  material,
  suit = null,
  bulk = 1,
  headMaterial = null,
} = {}) {
  const g = new THREE.Group();
  const u = height / 1.8;
  const m = material;
  const hm = headMaterial || material;
  const sm = suit || material;

  const hips = new THREE.Group();
  hips.position.y = 0.98 * u;
  g.add(hips);
  addMesh(hips, box(0.32 * u * bulk, 0.24 * u, 0.22 * u * bulk), sm);

  const torso = new THREE.Group();
  torso.position.y = 0.12 * u;
  hips.add(torso);
  addMesh(torso, box(0.4 * u * bulk, 0.5 * u, 0.24 * u * bulk), m, { pos: [0, 0.25 * u, 0] });
  addMesh(torso, box(0.34 * u * bulk, 0.12 * u, 0.2 * u * bulk), sm, { pos: [0, 0.55 * u, 0] });

  const head = new THREE.Group();
  head.position.y = 0.62 * u;
  torso.add(head);
  addMesh(head, cyl(0.055 * u, 0.06 * u, 0.08 * u, 6), sm, { pos: [0, -0.03 * u, 0] });
  addMesh(head, box(0.17 * u, 0.21 * u, 0.18 * u), hm, { pos: [0, 0.11 * u, 0] });

  const arms = [];
  const legs = [];
  for (const sx of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(sx * 0.24 * u * bulk, 0.46 * u, 0);
    torso.add(shoulder);
    addMesh(shoulder, box(0.12 * u * bulk, 0.3 * u, 0.13 * u * bulk), m, { pos: [0, -0.14 * u, 0] });
    const elbow = new THREE.Group();
    elbow.position.y = -0.3 * u;
    shoulder.add(elbow);
    addMesh(elbow, box(0.1 * u, 0.3 * u, 0.11 * u), m, { pos: [0, -0.14 * u, 0] });
    const hand = new THREE.Group();
    hand.position.y = -0.3 * u;
    elbow.add(hand);
    addMesh(hand, box(0.09 * u, 0.11 * u, 0.09 * u), sm);
    arms.push({ shoulder, elbow, hand });

    const hip = new THREE.Group();
    hip.position.set(sx * 0.11 * u, -0.1 * u, 0);
    hips.add(hip);
    addMesh(hip, box(0.15 * u * bulk, 0.44 * u, 0.16 * u * bulk), m, { pos: [0, -0.21 * u, 0] });
    const knee = new THREE.Group();
    knee.position.y = -0.44 * u;
    hip.add(knee);
    addMesh(knee, box(0.13 * u, 0.42 * u, 0.14 * u), m, { pos: [0, -0.2 * u, 0] });
    const foot = new THREE.Group();
    foot.position.y = -0.42 * u;
    knee.add(foot);
    addMesh(foot, box(0.14 * u, 0.08 * u, 0.26 * u), sm, { pos: [0, -0.02 * u, 0.05 * u] });
    legs.push({ hip, knee, foot });
  }

  g.userData.rig = { hips, torso, head, arms, legs, unit: u };
  return g;
}

export function walk(rig, phase, { stride = 0.5, arms = 0.4, bounce = 0.02 } = {}) {
  const a = Math.sin(phase);
  const b = Math.cos(phase);
  rig.legs[0].hip.rotation.x = a * stride;
  rig.legs[1].hip.rotation.x = -a * stride;
  rig.legs[0].knee.rotation.x = Math.max(0, -a) * stride * 1.3;
  rig.legs[1].knee.rotation.x = Math.max(0, a) * stride * 1.3;
  rig.arms[0].shoulder.rotation.x = -a * arms;
  rig.arms[1].shoulder.rotation.x = a * arms;
  rig.arms[0].elbow.rotation.x = -0.25 - Math.max(0, a) * 0.3;
  rig.arms[1].elbow.rotation.x = -0.25 - Math.max(0, -a) * 0.3;
  rig.hips.position.y = rig.unit * (0.98 + Math.abs(b) * bounce);
  rig.torso.rotation.z = a * 0.02;
}

export function idle(rig, t, { amount = 1 } = {}) {
  const s = Math.sin(t * 1.4) * 0.015 * amount;
  rig.torso.rotation.x = 0.02 + s;
  rig.hips.position.y = rig.unit * (0.98 + Math.sin(t * 1.4) * 0.006 * amount);
  rig.arms[0].shoulder.rotation.x = -0.1 + s;
  rig.arms[1].shoulder.rotation.x = -0.1 - s;
  rig.arms[0].elbow.rotation.x = -0.2;
  rig.arms[1].elbow.rotation.x = -0.2;
  rig.head.rotation.y = Math.sin(t * 0.5) * 0.12 * amount;
}

/** Imperial stormtrooper, with an optional blaster in the right hand. */
export function stormtrooper({ height = 1.83, blaster = true } = {}) {
  const white = paint(0xe6e8ea, { flat: false });
  const black = paint(0x1c1e22);
  const g = rigHumanoid({ height, material: white, suit: black, bulk: 1.1, headMaterial: white });
  const { rig } = g.userData;
  const u = rig.unit;
  // Helmet: a slightly larger shell with a dark visor and vocoder grille.
  addMesh(rig.head, box(0.2 * u, 0.24 * u, 0.22 * u), white, { pos: [0, 0.12 * u, 0] });
  addMesh(rig.head, box(0.17 * u, 0.07 * u, 0.02 * u), black, { pos: [0, 0.15 * u, 0.115 * u] });
  addMesh(rig.head, box(0.06 * u, 0.05 * u, 0.03 * u), black, { pos: [0, 0.05 * u, 0.11 * u] });
  addMesh(rig.torso, box(0.42 * u, 0.2 * u, 0.26 * u), white, { pos: [0, 0.42 * u, 0] });
  addMesh(rig.torso, box(0.1 * u, 0.06 * u, 0.02 * u), black, { pos: [-0.08 * u, 0.3 * u, 0.13 * u] });
  addMesh(rig.hips, box(0.36 * u, 0.09 * u, 0.24 * u), white, { pos: [0, -0.06 * u, 0] });
  if (blaster) {
    const gun = new THREE.Group();
    gun.position.set(0, -0.06 * u, 0.06 * u);
    gun.rotation.x = Math.PI / 2;
    rig.arms[1].hand.add(gun);
    addMesh(gun, box(0.05 * u, 0.06 * u, 0.42 * u), black);
    addMesh(gun, cyl(0.018 * u, 0.018 * u, 0.2 * u, 6, { alongZ: true }), black, { pos: [0, 0.01 * u, 0.28 * u] });
    addMesh(gun, box(0.04 * u, 0.1 * u, 0.06 * u), black, { pos: [0, -0.07 * u, -0.06 * u] });
    g.userData.muzzle = new THREE.Object3D();
    g.userData.muzzle.position.set(0, 0.01 * u, 0.4 * u);
    gun.add(g.userData.muzzle);
  }
  return g;
}

/** The Dark Lord: 2.05 m of black armour, a cape, and a very bad temper. */
export function vashek({ height = 2.05 } = {}) {
  const armour = gloss(0x565c66, { shininess: 34, specular: 0x63707e });
  const leather = gloss(0x3d424a, { shininess: 26, specular: 0x60707f });
  const g = rigHumanoid({ height, material: leather, suit: armour, bulk: 1.15, headMaterial: armour });
  const { rig } = g.userData;
  const u = rig.unit;

  // Helmet: flared dome, angular faceplate, breath mask.
  addMesh(rig.head, dome(0.125 * u, { segments: 14, rings: 7 }), armour, { pos: [0, 0.16 * u, 0] });
  addMesh(rig.head, box(0.19 * u, 0.2 * u, 0.2 * u), armour, { pos: [0, 0.1 * u, 0] });
  addMesh(rig.head, box(0.21 * u, 0.06 * u, 0.22 * u), armour, { pos: [0, 0.02 * u, 0] });
  addMesh(rig.head, box(0.13 * u, 0.09 * u, 0.03 * u), gloss(0x191d23, { shininess: 140, specular: 0xccddee }), { pos: [0, 0.15 * u, 0.105 * u] });
  addMesh(rig.head, box(0.07 * u, 0.07 * u, 0.05 * u), gloss(0x22262d, { shininess: 90 }), { pos: [0, 0.05 * u, 0.1 * u] });
  for (const sx of [-1, 1]) {
    addMesh(rig.head, box(0.04 * u, 0.09 * u, 0.06 * u), armour, { pos: [sx * 0.1 * u, 0.09 * u, 0.02 * u] });
  }
  // Chest control box with the only colour on him.
  addMesh(rig.torso, box(0.18 * u, 0.12 * u, 0.04 * u), paint(0x3a3f47), { pos: [0, 0.28 * u, 0.13 * u] });
  for (let i = 0; i < 3; i++) {
    addMesh(rig.torso, box(0.02 * u, 0.02 * u, 0.02 * u),
      emissive([0xff3b30, 0x35d07f, 0x3aa0ff][i], { blending: THREE.NormalBlending, depthWrite: true }),
      { pos: [(i - 1) * 0.05 * u, 0.3 * u, 0.155 * u] });
  }
  addMesh(rig.torso, box(0.3 * u, 0.06 * u, 0.24 * u), armour, { pos: [0, 0.52 * u, 0] });
  addMesh(rig.hips, box(0.36 * u, 0.1 * u, 0.26 * u), armour, { pos: [0, -0.02 * u, 0] });

  // Cape: a tapered slab hung off the shoulders, with a simple sway.
  const cape = new THREE.Group();
  cape.position.set(0, 0.5 * u, -0.13 * u);
  rig.torso.add(cape);
  const capeMesh = addMesh(cape, box(0.44 * u, 1.3 * u, 0.03 * u), gloss(0x32363d, { shininess: 14, specular: 0x3a444f }), { pos: [0, -0.62 * u, -0.02 * u] });
  capeMesh.scale.set(1, 1, 1);
  g.userData.cape = cape;
  g.userData.swayCape = (t, amount = 1) => {
    cape.rotation.x = (-0.06 + Math.sin(t * 1.1) * 0.03) * amount;
    cape.rotation.z = Math.sin(t * 0.8 + 1) * 0.04 * amount;
  };
  return g;
}

/** Hooded exile. The robe is a cone, which is exactly what a robe is. */
export function robedFigure({ height = 1.78, color = 0x9b8461, hood = true } = {}) {
  const cloth = paint(color, { flat: false });
  const dark = paint(0x4a4133);
  const g = rigHumanoid({ height, material: cloth, suit: dark, bulk: 1, headMaterial: paint(0xb08d6a) });
  const { rig } = g.userData;
  const u = rig.unit;
  // Robe skirt.
  addMesh(rig.hips, cyl(0.26 * u, 0.42 * u, 0.95 * u, 12), cloth, { pos: [0, -0.48 * u, 0] });
  // Over-robe on the torso.
  addMesh(rig.torso, cyl(0.24 * u, 0.3 * u, 0.62 * u, 12), cloth, { pos: [0, 0.28 * u, 0] });
  for (const a of rig.arms) addMesh(a.shoulder, cyl(0.1 * u, 0.13 * u, 0.34 * u, 8), cloth, { pos: [0, -0.15 * u, 0] });
  if (hood) {
    addMesh(rig.head, dome(0.16 * u, { segments: 12, rings: 6 }), cloth, { pos: [0, 0.1 * u, -0.01 * u], scale: [1, 1.15, 1.1] });
    addMesh(rig.head, box(0.2 * u, 0.16 * u, 0.06 * u), cloth, { pos: [0, 0.12 * u, -0.11 * u] });
    addMesh(rig.head, box(0.14 * u, 0.13 * u, 0.03 * u), paint(0x120f0b), { pos: [0, 0.11 * u, 0.11 * u] });
  }
  return g;
}

/** Farm girl / pilot. `flightsuit` swaps the tunic for orange and a helmet. */
export function hero({ height = 1.68, flightsuit = false } = {}) {
  const tunic = paint(flightsuit ? 0xd8792a : 0xd6cbb4, { flat: false });
  const dark = paint(flightsuit ? 0x2b2f36 : 0x6b5c46);
  const g = rigHumanoid({ height, material: tunic, suit: dark, bulk: 0.92, headMaterial: paint(0xdcae86) });
  const { rig } = g.userData;
  const u = rig.unit;
  if (flightsuit) {
    addMesh(rig.torso, box(0.3 * u, 0.3 * u, 0.1 * u), paint(0xe8e6e0), { pos: [0, 0.28 * u, 0.14 * u] });
    addMesh(rig.head, box(0.21 * u, 0.2 * u, 0.22 * u), paint(0xe8e6e0), { pos: [0, 0.13 * u, 0] });
    addMesh(rig.head, box(0.19 * u, 0.09 * u, 0.03 * u), paint(0x14161a), { pos: [0, 0.12 * u, 0.115 * u] });
    addMesh(rig.head, box(0.05 * u, 0.14 * u, 0.2 * u), paint(0xd8792a), { pos: [0, 0.22 * u, 0] });
  } else {
    // Hair.
    addMesh(rig.head, box(0.19 * u, 0.14 * u, 0.2 * u), paint(0x4a3520), { pos: [0, 0.18 * u, -0.01 * u] });
    addMesh(rig.head, box(0.1 * u, 0.26 * u, 0.1 * u), paint(0x4a3520), { pos: [0, 0.05 * u, -0.12 * u] });
    addMesh(rig.hips, box(0.34 * u, 0.06 * u, 0.24 * u), dark, { pos: [0, -0.06 * u, 0] });
  }
  return g;
}

/**
 * Lightsaber: hilt plus a two-layer blade (white core inside a coloured glow)
 * with an ignition animation and a point light that actually lights the scene.
 */
export function lightsaber({ color = 0x3aa0ff, length = 1.25, scale = 1 } = {}) {
  const g = new THREE.Group();
  const s = scale;
  const hiltMat = paint(0x9aa0a6, { flat: false });
  const black = paint(0x16181c);
  addMesh(g, cyl(0.021 * s, 0.023 * s, 0.28 * s, 10), hiltMat, { pos: [0, 0.14 * s, 0] });
  addMesh(g, cyl(0.024 * s, 0.024 * s, 0.05 * s, 10), black, { pos: [0, 0.05 * s, 0] });
  addMesh(g, cyl(0.026 * s, 0.026 * s, 0.03 * s, 10), black, { pos: [0, 0.2 * s, 0] });
  addMesh(g, cyl(0.028 * s, 0.022 * s, 0.04 * s, 10), hiltMat, { pos: [0, 0.29 * s, 0] });

  const blade = new THREE.Group();
  blade.position.y = 0.3 * s;
  g.add(blade);
  const L = length * s;
  const core = addMesh(blade, cyl(0.016 * s, 0.018 * s, L, 8),
    emissive(0xffffff, { blending: THREE.NormalBlending, depthWrite: true }), { pos: [0, L / 2, 0] });
  const glow1 = addMesh(blade, cyl(0.045 * s, 0.05 * s, L, 8), emissive(color, { opacity: 0.55 }), { pos: [0, L / 2, 0] });
  const glow2 = addMesh(blade, cyl(0.1 * s, 0.11 * s, L, 8), emissive(color, { opacity: 0.2 }), { pos: [0, L / 2, 0] });
  glow1.renderOrder = 5;
  glow2.renderOrder = 5;
  const tip = addMesh(blade, new THREE.SphereGeometry(0.02 * s, 8, 6), emissive(0xffffff, { blending: THREE.NormalBlending, depthWrite: true }), { pos: [0, L, 0] });
  const light = new THREE.PointLight(color, 0, 6 * s, 2);
  light.position.set(0, L * 0.5, 0);
  blade.add(light);

  g.userData.blade = blade;
  g.userData.light = light;
  g.userData.color = color;
  g.userData.setExtend = (v) => {
    const k = Math.max(0.0001, v);
    blade.scale.y = k;
    blade.visible = v > 0.001;
    light.intensity = v * 3.2;
    core.material.opacity = 1;
  };
  g.userData.setExtend(0);
  return g;
}
