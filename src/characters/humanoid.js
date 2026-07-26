// Parametric rigged humanoid builder — owner: Fable 4.
// createHumanoid({variant, seed}) -> {
//   group,            outer group (game code positions/rotates this)
//   root,             inner group (animation moves this; y-bob, death)
//   joints,           named joint Groups (see hierarchy below)
//   dims,             {headY, hipsY, scale}
//   meshes,           {torso, head, tie}   (tie = zip-tie, hostages only)
// }
// Hierarchy: group -> root -> hips -> spine -> chest -> neck -> head
//   chest -> armL/armR (shoulder pivot) -> forearm -> hand
//   hips  -> thighL/thighR -> shin -> foot
// Meshes attach rigidly to joints; clothing breaks hide the joins (jacket hem
// at hips, sleeve cuffs at wrists, boot tops at shins). No skinning.
// All randomness is a locally seeded Rng — never Math.random.

import * as THREE from 'three';
import { Rng } from '../core/rng.js';

// ---------------------------------------------------------------- materials
const matCache = new Map();
function mat(color, rough = 0.9, metal = 0) {
  const key = `${color}|${rough}|${metal}`;
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  }
  return matCache.get(key);
}
const SKIN_TONES = [0xc59a76, 0x8a6042];
const skin = (tone) => mat(SKIN_TONES[tone % SKIN_TONES.length], 0.62);
const ORANGE = 0xd4571e;         // Meridian Cell hostile read
const HAIR_DARK = 0x2b241d;

// ---------------------------------------------------------------- geometry
const geoCache = new Map();
function G(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}
const box = (w, h, d) => G(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (rt, rb, h, s = 10) => G(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
const sph = (r, w = 12, h = 9) => G(`s${r},${w},${h}`, () => new THREE.SphereGeometry(r, w, h));
const cap = (r, l, s = 8) => G(`p${r},${l},${s}`, () => new THREE.CapsuleGeometry(r, l, 4, s));

function P(parent, geometry, material, x, y, z, o = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  if (o.rx) mesh.rotation.x = o.rx;
  if (o.ry) mesh.rotation.y = o.ry;
  if (o.rz) mesh.rotation.z = o.rz;
  mesh.scale.set(o.sx || 1, o.sy || 1, o.sz || 1);
  mesh.castShadow = o.noShadow ? false : true;
  parent.add(mesh);
  return mesh;
}
function joint(parent, x, y, z, name) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.name = name;
  parent.add(g);
  return g;
}

// ---------------------------------------------------------------- recipes
const OUTFITS = {
  // Meridian Cell hostiles — orange accent = enemy read
  scout: {
    s: 0.985, bulk: 0.93, jacket: 0x5a6152, sleeve: 0x515747, pants: 0x474c42,
    boot: 0x2a2c2e, glove: 0x2b2d2f, gear: 'rig', headgear: 'beanie', gearCol: 0x383d35,
  },
  trooper: {
    s: 1.0, bulk: 1.0, jacket: 0x3a4148, sleeve: 0x363c43, pants: 0x33383d,
    boot: 0x26282b, glove: 0x2b2d2f, gear: 'carrier', headgear: 'cap', gearCol: 0x2c3034,
  },
  heavy: {
    s: 1.02, bulk: 1.17, jacket: 0x363b3d, sleeve: 0x323638, pants: 0x2f3335,
    boot: 0x232527, glove: 0x2b2d2f, gear: 'armor', headgear: 'helmet', gearCol: 0x272b2d,
  },
  marksman: {
    s: 1.0, bulk: 0.97, jacket: 0x6b7076, sleeve: 0x62676d, pants: 0x3f444a,
    boot: 0x26282b, glove: 0x2b2d2f, gear: 'pack', headgear: 'hood', gearCol: 0x4b5054,
  },
  // Hostages
  voss: {
    s: 0.97, bulk: 0.88, jacket: 0x33363b, sleeve: 0x33363b, pants: 0x2e3033,
    boot: 0x232527, glove: null, gear: 'lanyard', headgear: 'bun', gearCol: 0x3d949e,
    hostage: true, skinTone: 0,
  },
  reid: {
    s: 1.0, bulk: 1.02, jacket: 0x2e4057, sleeve: 0x2e4057, pants: 0x9a8b6b,
    boot: 0x4a3c2c, glove: null, gear: 'hivis', headgear: 'cap_navy', gearCol: 0xd8c22f,
    hostage: true, skinTone: 1,
  },
};

// ---------------------------------------------------------------- builder
export function createHumanoid({ variant = 'trooper', seed = 1 } = {}) {
  const o = OUTFITS[variant] || OUTFITS.trooper;
  const rng = new Rng((seed * 2654435761) >>> 0 || 7);
  const s = o.s, b = o.bulk;

  const group = new THREE.Group();
  group.name = `humanoid_${variant}`;
  const root = new THREE.Group();
  root.name = 'root';
  group.add(root);
  root.scale.setScalar(s);

  // ---- joint tree (positions in unscaled model space; root carries scale)
  const hips = joint(root, 0, 0.99, 0, 'hips');
  const spine = joint(hips, 0, 0.13, 0, 'spine');
  const chest = joint(spine, 0, 0.21, 0, 'chest');
  const neck = joint(chest, 0, 0.19, 0, 'neck');
  const head = joint(neck, 0, 0.09, 0, 'head');

  const armL = joint(chest, -0.19 * b, 0.15, 0, 'armL');
  const forearmL = joint(armL, 0, -0.29, 0, 'forearmL');
  const handL = joint(forearmL, 0, -0.26, 0, 'handL');
  const armR = joint(chest, 0.19 * b, 0.15, 0, 'armR');
  const forearmR = joint(armR, 0, -0.29, 0, 'forearmR');
  const handR = joint(forearmR, 0, -0.26, 0, 'handR');

  const thighL = joint(hips, -0.095, -0.02, 0, 'thighL');
  const shinL = joint(thighL, 0, -0.46, 0, 'shinL');
  const footL = joint(shinL, 0, -0.43, 0, 'footL');
  const thighR = joint(hips, 0.095, -0.02, 0, 'thighR');
  const shinR = joint(thighR, 0, -0.46, 0, 'shinR');
  const footR = joint(shinR, 0, -0.43, 0, 'footR');

  const jacket = mat(o.jacket, 0.92);
  const sleeve = mat(o.sleeve, 0.92);
  const pants = mat(o.pants, 0.94);
  const boots = mat(o.boot, 0.72);
  const gearM = mat(o.gearCol, 0.9);
  const tone = o.skinTone ?? (rng.chance(0.5) ? 0 : 1);
  const skinM = skin(tone);
  const handM = o.glove ? mat(o.glove, 0.85) : skinM;

  // ---- torso
  P(hips, box(0.3, 0.15, 0.19), pants, 0, -0.05, 0, { sx: b, sz: b });                 // pelvis
  P(hips, box(0.31, 0.045, 0.2), mat(0x232527, 0.7), 0, 0.035, 0, { sx: b, sz: b });   // belt
  P(spine, box(0.3, 0.2, 0.185), jacket, 0, 0.07, 0, { sx: b, sz: b });                // lower torso
  P(spine, box(0.335, 0.09, 0.215), jacket, 0, -0.1, 0, { sx: b, sz: b });             // jacket hem (clothing break)
  const torsoMesh = P(chest, cap(0.145, 0.11, 10), jacket, 0, 0.075, 0, { sx: 1.32 * b, sz: 0.78 * b }); // chest
  P(chest, box(0.15, 0.05, 0.16), jacket, 0, 0.2, 0, { sx: b, sz: b });                // collar
  P(neck, cyl(0.048, 0.052, 0.09), skinM, 0, 0.03, 0);

  // ---- head + face/headgear variation
  const headMesh = buildHead(head, o, rng, tone, skinM);

  // ---- arms (shoulder cap, upper sleeve, forearm sleeve, cuff, hand)
  for (const [arm, fore, hand, side] of [[armL, forearmL, handL, -1], [armR, forearmR, handR, 1]]) {
    P(arm, sph(0.066), sleeve, 0, -0.01, 0, { sx: b, sy: 1.05, sz: b });               // deltoid
    P(arm, cap(0.048, 0.17), sleeve, 0, -0.155, 0, { sx: b, sz: b });                  // upper sleeve
    P(fore, cap(0.041, 0.15), sleeve, 0, -0.115, 0);                                   // forearm sleeve
    P(fore, cyl(0.045, 0.047, 0.035), sleeve, 0, -0.235, 0);                           // cuff (clothing break)
    P(hand, box(0.05, 0.1, 0.062), handM, 0, -0.055, 0);                               // hand/glove
    if (!o.hostage && side === 1) {
      P(arm, cyl(0.054 * b, 0.056 * b, 0.055), mat(ORANGE, 0.75), 0, -0.12, 0);        // orange armband
    }
  }

  // ---- legs
  for (const [thigh, shin, foot] of [[thighL, shinL, footL], [thighR, shinR, footR]]) {
    P(thigh, cap(0.062, 0.26), pants, 0, -0.21, 0, { sx: b, sz: b });
    P(shin, cap(0.05, 0.23), pants, 0, -0.18, 0);
    P(shin, cyl(0.056, 0.06, 0.09), boots, 0, -0.36, 0);                               // boot top (clothing break)
    P(foot, box(0.092, 0.075, 0.23), boots, 0, -0.042, -0.045);
    P(foot, box(0.085, 0.045, 0.06), boots, 0, -0.057, -0.175);                        // toe cap
  }

  // ---- variant gear
  buildGear(o, rng, { hips, spine, chest, armL, armR }, b, gearM);

  // ---- hostage zip-tie (hidden after being freed)
  let tie = null;
  if (o.hostage) {
    tie = P(handR, box(0.05, 0.026, 0.03), mat(0xcfd3d6, 0.6), -0.05, -0.05, 0);
  }

  const dims = { headY: (0.99 + 0.13 + 0.21 + 0.19 + 0.09) * s + 0.05, hipsY: 0.99 * s, scale: s };
  const joints = {
    root, hips, spine, chest, neck, head,
    armL, forearmL, handL, armR, forearmR, handR,
    thighL, shinL, footL, thighR, shinR, footR,
  };
  return { group, root, joints, dims, meshes: { torso: torsoMesh, head: headMesh, tie }, variant, seed };
}

// ---------------------------------------------------------------- head
// 2 skin tones x face styles -> 4+ deterministic head variants per faction.
function buildHead(head, o, rng, tone, skinM) {
  const style = o.hostage ? 'clean' : rng.pick(['clean', 'beard', 'balaclava', 'goggles']);
  const balaclava = style === 'balaclava';
  const skullM = balaclava ? mat(0x24262a, 0.95) : skinM;
  const skull = P(head, sph(0.105), skullM, 0, 0.05, 0.008, { sx: 0.92, sy: 1.05, sz: 0.98 });
  if (balaclava) {
    P(head, box(0.084, 0.034, 0.02), skinM, 0, 0.048, -0.086);                          // exposed eye strip
  }
  const eyeM = mat(0x1c1a18, 0.5);
  P(head, box(0.02, 0.012, 0.012), eyeM, -0.024, 0.048, -0.097, { noShadow: true });    // eyes
  P(head, box(0.02, 0.012, 0.012), eyeM, 0.024, 0.048, -0.097, { noShadow: true });
  if (style === 'beard' || (o.headgear === 'cap_navy')) {
    P(head, box(0.082, 0.055, 0.05), mat(HAIR_DARK, 0.95), 0, -0.008, -0.062);          // facial hair
  }
  if (style === 'goggles') {
    P(head, box(0.096, 0.032, 0.028), mat(0x2a2d30, 0.6), 0, 0.05, -0.088);             // goggle frame (worn)
    P(head, box(0.08, 0.022, 0.006), mat(0x8a6a2c, 0.25, 0.4), 0, 0.05, -0.104, { noShadow: true }); // amber lens
  }

  switch (o.headgear) {
    case 'beanie':
      P(head, sph(0.108), mat(0x4a5044, 0.98), 0, 0.105, 0.006, { sx: 0.94, sy: 0.72, sz: 0.98 });
      P(head, cyl(0.1, 0.102, 0.035), mat(0x424839, 0.98), 0, 0.105, 0.004, { sx: 0.96, sz: 1.0 });
      break;
    case 'cap':
    case 'cap_navy': {
      const cm = mat(o.headgear === 'cap' ? 0x2f3438 : 0x27374a, 0.95);
      P(head, sph(0.107), cm, 0, 0.098, 0.012, { sx: 0.93, sy: 0.66, sz: 0.97 });
      P(head, box(0.092, 0.012, 0.09), cm, 0, 0.095, -0.128);                           // brim
      break;
    }
    case 'helmet': {
      const hm = mat(0x2e3234, 0.65, 0.15);
      P(head, sph(0.126), hm, 0, 0.088, 0.008, { sx: 0.96, sy: 0.84, sz: 1.02 });
      P(head, cyl(0.117, 0.121, 0.035), hm, 0, 0.045, 0.008, { sx: 0.98 });             // rim
      P(head, box(0.098, 0.026, 0.03), mat(0x2a2d30, 0.6), 0, 0.115, -0.1);             // goggles stowed up
      P(head, box(0.055, 0.045, 0.012), mat(ORANGE, 0.8), 0, 0.09, 0.118);              // rear faction patch
      break;
    }
    case 'hood': {
      const hd = mat(0x62676d, 0.98);
      P(head, sph(0.132), hd, 0, 0.062, 0.03, { sx: 0.95, sy: 0.98, sz: 1.02 });        // parka hood shell
      P(head, box(0.03, 0.09, 0.05), hd, -0.075, 0.0, -0.05);                           // cheek pad L
      P(head, box(0.03, 0.09, 0.05), hd, 0.075, 0.0, -0.05);                            // cheek pad R
      break;
    }
    case 'bun': {
      const hm = mat(0x4a3524, 0.95);
      P(head, sph(0.108), hm, 0, 0.095, 0.018, { sx: 0.93, sy: 0.85, sz: 0.97 });       // hair
      P(head, sph(0.042), hm, 0, 0.1, 0.105);                                           // bun
      break;
    }
  }
  return skull;
}

// ---------------------------------------------------------------- gear
function buildGear(o, rng, j, b, gearM) {
  const { hips, chest, armL } = j;
  const front = 0.105 * b; // chest surface offset (-Z is forward)
  switch (o.gear) {
    case 'rig': // scout: light chest rig
      P(chest, box(0.23, 0.13, 0.045), gearM, 0, 0.05, -front - 0.015);
      P(chest, box(0.06, 0.09, 0.03), gearM, -0.07, 0.035, -front - 0.045);
      P(chest, box(0.06, 0.09, 0.03), gearM, 0.07, 0.035, -front - 0.045);
      P(chest, box(0.05, 0.05, 0.012), mat(ORANGE, 0.8), -0.09, 0.13, -front - 0.02);   // faction patch
      break;
    case 'carrier': // trooper: plate carrier + mag pouches
      P(chest, box(0.27, 0.23, 0.05), gearM, 0, 0.06, -front - 0.018);
      P(chest, box(0.27, 0.22, 0.045), gearM, 0, 0.06, front + 0.015);
      P(chest, box(0.05, 0.06, 0.16), gearM, -0.115, 0.2, 0);                           // shoulder strap
      P(chest, box(0.05, 0.06, 0.16), gearM, 0.115, 0.2, 0);
      P(hips, box(0.055, 0.1, 0.035), gearM, -0.09, -0.03, -0.105 * b - 0.02);          // mag pouches
      P(hips, box(0.055, 0.1, 0.035), gearM, 0, -0.03, -0.105 * b - 0.025);
      P(hips, box(0.055, 0.1, 0.035), gearM, 0.09, -0.03, -0.105 * b - 0.02);
      P(chest, box(0.05, 0.05, 0.012), mat(ORANGE, 0.8), 0.085, 0.15, -front - 0.026);  // faction patch
      break;
    case 'armor': { // heavy: bulky vest + shoulder pads + collar
      P(chest, box(0.32, 0.3, 0.07), gearM, 0, 0.05, -front - 0.02);
      P(chest, box(0.32, 0.28, 0.06), gearM, 0, 0.05, front + 0.018);
      P(chest, box(0.2, 0.06, 0.24), gearM, 0, 0.225, 0);                               // collar guard
      P(chest, box(0.1, 0.05, 0.17), mat(0x2e3234, 0.65, 0.15), -0.2 * b, 0.16, 0);     // shoulder pad L
      P(chest, box(0.1, 0.05, 0.17), mat(0x2e3234, 0.65, 0.15), 0.2 * b, 0.16, 0);      // shoulder pad R
      P(hips, box(0.16, 0.12, 0.04), gearM, 0, -0.1, -0.105 * b - 0.02);                // groin plate
      P(chest, box(0.07, 0.07, 0.014), mat(ORANGE, 0.8), 0, 0.09, -front - 0.06);       // big faction patch
      break;
    }
    case 'pack': { // marksman: small backpack + chest strap
      P(chest, box(0.24, 0.3, 0.11), gearM, 0, 0.03, front + 0.055);
      P(chest, box(0.2, 0.08, 0.04), mat(0x43484c, 0.9), 0, 0.16, front + 0.11);        // pack lid
      P(chest, box(0.26, 0.045, 0.03), gearM, 0, 0.07, -front - 0.01);                  // chest strap
      P(chest, box(0.05, 0.05, 0.012), mat(ORANGE, 0.8), -0.09, 0.14, -front - 0.015);  // faction patch
      break;
    }
    case 'lanyard': { // voss: blazer lapels + blouse + ID lanyard
      P(chest, box(0.1, 0.17, 0.012), mat(0xcfd3d6, 0.85), 0, 0.05, -front - 0.008);    // blouse front
      P(chest, box(0.05, 0.2, 0.016), mat(0x2b2e33, 0.9), -0.075, 0.05, -front - 0.012, { rz: 0.14 }); // lapel L
      P(chest, box(0.05, 0.2, 0.016), mat(0x2b2e33, 0.9), 0.075, 0.05, -front - 0.012, { rz: -0.14 }); // lapel R
      P(chest, box(0.02, 0.2, 0.008), mat(o.gearCol, 0.8), -0.035, 0.08, -front - 0.02, { rz: 0.12 }); // lanyard strap
      P(chest, box(0.055, 0.075, 0.008), mat(0xe8e6dd, 0.7), 0, -0.045, -front - 0.022);// ID card
      break;
    }
    case 'hivis': { // reid: hi-vis trim on navy polo
      P(chest, box(0.28 * b, 0.035, 0.015), mat(o.gearCol, 0.6), 0, 0.06, -front - 0.008);
      P(chest, box(0.28 * b, 0.035, 0.015), mat(o.gearCol, 0.6), 0, 0.06, front + 0.006);
      P(armL, box(0.02, 0.04, 0.1), mat(o.gearCol, 0.6), -0.05 * b, -0.12, 0);          // sleeve band
      P(chest, box(0.055, 0.04, 0.008), mat(0xe8e6dd, 0.7), 0.07, 0.12, -front - 0.012);// name tag
      break;
    }
  }
}

export function humanoidVariants() { return Object.keys(OUTFITS); }
