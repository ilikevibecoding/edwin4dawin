import * as THREE from 'three';
import { camoMaterial } from '../world/materials.js';
import { makeRNG, clamp, lerp, smoothstep } from '../core/utils.js';

// ===========================================================================
// Procedural enemy soldier — modern military hostile built from primitives.
// Articulated rig: pelvis / spine / head / two-bone-IK arms / legs, with the
// rifle mounted at the right shoulder. Code-driven animation: weighted walk
// gait with counter-rotating shoulders vs hips, combat crouch, scanning idle,
// hit flinch and a two-stage buckling death fall.
// ===========================================================================

const rng = makeRNG(5555);

// Rig constants (meters, world space at identity)
const HIP_Y = 0.98;          // hips group rest height
const THIGH_LEN = 0.44;
const CALF_LEN = 0.40;
const UPPER_ARM = 0.27;
const FOREARM = 0.26;

// ---------------------------------------------------------------------------
// Material kits — three squad uniform variants, shared across instances.
// Nothing pure black; cloth keeps envMapIntensity low.
// ---------------------------------------------------------------------------
function m(color, rough = 0.92, metal = 0, envInt = 0.35) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, envMapIntensity: envInt });
}

let KITS = null;
function getKits() {
  if (KITS) return KITS;
  const shared = {
    gunmetal: m(0x24262b, 0.5, 0.8, 0.7),
    polymer: m(0x2f2d29, 0.78, 0.1, 0.4),
    skin: m(0x9c7a5e, 0.72, 0, 0.4),
    lens: m(0x10181c, 0.22, 0.55, 1.3),
    glove: m(0x37332b, 0.9, 0, 0.32),
  };
  const camo = (seed, palette) => {
    const c = camoMaterial(seed, palette);
    c.envMapIntensity = 0.5;   // sky fill keeps cloth readable in shadow
    return c;
  };
  const oliveP = [0x5d6350, 0x7d7c5f, 0x474a3a, 0x8a836c];
  const tanP = [0xa08c68, 0xb7a37a, 0x7d6c50, 0xab9a76];
  const greyP = [0x6a6c62, 0x7f8074, 0x52544a, 0x8e8e80];
  KITS = [
    { // 0: olive woodland
      uniform: camo(193, oliveP),
      vest: m(0x554e3a, 0.94), strap: m(0x3a3629, 0.95), pouch: m(0x605c44, 0.95),
      pads: m(0x3d3b32, 0.9), boot: m(0x3d3226, 0.88, 0, 0.3),
      mask: m(0x33302a, 0.96), scarf: m(0x847657, 0.97),
      helmet: camo(193, oliveP), furniture: m(0x3b3934, 0.75, 0.05, 0.4),
      ...shared,
    },
    { // 1: desert tan
      uniform: camo(191, tanP),
      vest: m(0x6b5b42, 0.94), strap: m(0x463d2f, 0.95), pouch: m(0x776749, 0.95),
      pads: m(0x554c3b, 0.9), boot: m(0x54422f, 0.88, 0, 0.3),
      mask: m(0x3d3831, 0.96), scarf: m(0xa8946a, 0.97),
      helmet: camo(191, tanP),
      furniture: m(0x7a6d58, 0.75, 0.05, 0.4),
      ...shared,
    },
    { // 2: grey urban
      uniform: camo(192, greyP),
      vest: m(0x45464a, 0.94), strap: m(0x333432, 0.95), pouch: m(0x54554f, 0.95),
      pads: m(0x393936, 0.9), boot: m(0x37332c, 0.88, 0, 0.3),
      mask: m(0x2e2d2a, 0.96), scarf: m(0x67635a, 0.97),
      helmet: camo(192, greyP),
      furniture: m(0x464642, 0.75, 0.05, 0.4),
      ...shared,
    },
  ];
  return KITS;
}

// ---------------------------------------------------------------------------
// Small mesh builders
// ---------------------------------------------------------------------------
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function ball(r, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), mat);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  return mesh;
}

// Tapered limb segment: pivot at top, extends down local -Y.
function limb(rTop, rBot, len, mat) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, len, 10);
  geo.translate(0, -len / 2, 0);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

function cyl(r1, r2, len, mat, x = 0, y = 0, z = 0, rotX = 0, rotZ = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, 10), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rotX, 0, rotZ);
  mesh.castShadow = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// Two-bone IK (torso space). Limb meshes extend down local -Y; lower group is
// a child of the upper group at (0, -upperLen, 0). Guarantees the hand lands
// exactly on the target, with the elbow pushed toward `pole`.
// ---------------------------------------------------------------------------
const _ikDir = new THREE.Vector3(), _ikPole = new THREE.Vector3(), _ikN = new THREE.Vector3();
const _ikE = new THREE.Vector3(), _ikX = new THREE.Vector3(), _ikY = new THREE.Vector3(), _ikZ = new THREE.Vector3();
const _ikM = new THREE.Matrix4(), _ikQ = new THREE.Quaternion();

function solveTwoBone(upper, lower, target, a, b, pole) {
  const S = upper.position;
  _ikDir.subVectors(target, S);
  let d = _ikDir.length();
  d = clamp(d, Math.abs(a - b) + 0.02, a + b - 0.008);
  _ikDir.normalize();
  const p = (a * a - b * b + d * d) / (2 * d);
  const r = Math.sqrt(Math.max(a * a - p * p, 1e-8));
  _ikPole.copy(pole).addScaledVector(_ikDir, -pole.dot(_ikDir));
  if (_ikPole.lengthSq() < 1e-8) _ikPole.set(0, -1, 0);
  _ikPole.normalize();
  _ikE.copy(S).addScaledVector(_ikDir, p).addScaledVector(_ikPole, r);
  _ikN.crossVectors(_ikDir, _ikPole).normalize();

  // Upper bone: local -Y points shoulder -> elbow
  _ikY.subVectors(S, _ikE).normalize();
  _ikX.copy(_ikN);
  _ikZ.crossVectors(_ikX, _ikY).normalize();
  _ikX.crossVectors(_ikY, _ikZ);
  _ikM.makeBasis(_ikX, _ikY, _ikZ);
  upper.quaternion.setFromRotationMatrix(_ikM);

  // Lower bone: local -Y points elbow -> hand, expressed in upper's space
  _ikY.subVectors(_ikE, target).normalize();
  _ikX.copy(_ikN);
  _ikZ.crossVectors(_ikX, _ikY).normalize();
  _ikX.crossVectors(_ikY, _ikZ);
  _ikM.makeBasis(_ikX, _ikY, _ikZ);
  lower.quaternion.setFromRotationMatrix(_ikM).premultiply(_ikQ.copy(upper.quaternion).invert());
}

// ---------------------------------------------------------------------------
// Rifle — M4-style carbine built once, aimed down local -Z. Origin sits at
// the rear of the receiver so the stock reaches back to the shoulder.
// ---------------------------------------------------------------------------
function buildRifle(kit) {
  const g = new THREE.Group();
  const gm = kit.gunmetal, poly = kit.polymer, fur = kit.furniture;

  g.add(box(0.036, 0.068, 0.24, gm, 0, 0, -0.04));                 // receiver
  const hg = box(0.036, 0.05, 0.22, fur, 0, 0.002, -0.27);         // handguard
  g.add(hg);
  g.add(box(0.04, 0.012, 0.16, gm, 0, 0.033, -0.26));              // top rail
  g.add(box(0.012, 0.028, 0.018, gm, 0, 0.052, -0.355));           // front sight
  g.add(cyl(0.010, 0.010, 0.15, gm, 0, 0.004, -0.45, Math.PI / 2));// barrel
  g.add(cyl(0.0145, 0.0145, 0.05, gm, 0, 0.004, -0.545, Math.PI / 2)); // muzzle device
  // Optic: body + objective lens
  g.add(box(0.032, 0.042, 0.09, gm, 0, 0.064, -0.055));
  const lens = cyl(0.013, 0.013, 0.006, kit.lens, 0, 0.064, -0.102, Math.PI / 2);
  g.add(lens);
  // Curved magazine (two angled segments)
  const mag1 = box(0.03, 0.10, 0.05, poly, 0, -0.078, -0.095);
  mag1.rotation.x = 0.3;
  g.add(mag1);
  const mag2 = box(0.028, 0.06, 0.046, poly, 0, -0.148, -0.117);
  mag2.rotation.x = 0.62;
  g.add(mag2);
  // Pistol grip
  const grip = box(0.026, 0.075, 0.04, fur, 0, -0.058, 0.018);
  grip.rotation.x = 0.35;
  g.add(grip);
  // Buffer tube + stock + butt pad
  g.add(box(0.028, 0.042, 0.10, gm, 0, 0.004, 0.10));
  g.add(box(0.034, 0.072, 0.11, fur, 0, -0.006, 0.175));
  g.add(box(0.038, 0.088, 0.02, poly, 0, -0.006, 0.235));
  // Foregrip stub under handguard (left hand anchor)
  const fg = box(0.022, 0.05, 0.03, fur, 0, -0.043, -0.30);
  fg.rotation.x = -0.2;
  g.add(fg);
  return g;
}

// ===========================================================================
// Soldier
// ===========================================================================
export class Soldier {
  constructor() {
    this.root = new THREE.Group();
    const kits = getKits();
    const kit = kits[rng.int(0, kits.length - 1)];
    this.kit = kit;

    // Per-instance character (deterministic)
    const scale = rng.range(0.975, 1.035);
    this.root.scale.setScalar(scale);
    this.phase = rng() * 20;                 // desync idle motion
    this.scanP1 = rng() * 7;
    this.scanP2 = rng() * 7;
    this.deathTwist = rng.range(0.45, 1) * (rng.chance(0.5) ? 1 : -1);
    this.deathLegA = rng.range(0.5, 1.1);
    this.deathLegB = rng.range(0.2, 0.8);
    const hasPack = rng.chance(0.6);
    const hasNVG = rng.chance(0.75);
    const hasAntenna = rng.chance(0.6);

    const uni = kit.uniform;

    // ------------------------------------------------------------- hips
    this.hips = new THREE.Group();
    this.hips.position.y = HIP_Y;
    this.root.add(this.hips);

    this.hips.add(box(0.30, 0.20, 0.20, uni, 0, -0.05, 0));               // pelvis
    this.hips.add(box(0.325, 0.055, 0.225, kit.strap, 0, 0.04, 0));       // belt
    const dump = box(0.10, 0.12, 0.06, kit.pouch, 0.135, -0.055, 0.075);  // dump pouch (left rear)
    dump.rotation.y = 0.35;
    this.hips.add(dump);
    this.hips.add(box(0.09, 0.10, 0.045, kit.pouch, -0.115, -0.045, 0.10)); // rear pouch

    // ------------------------------------------------------------- legs
    const buildLeg = (side) => { // side: +1 left, -1 right
      const thigh = new THREE.Group();
      thigh.position.set(0.10 * side, -0.06, 0);
      this.hips.add(thigh);
      thigh.add(limb(0.084, 0.064, THIGH_LEN, uni));
      // cargo pocket on outer thigh
      thigh.add(box(0.024, 0.11, 0.085, uni, 0.072 * side, -0.24, 0.01));

      const calf = new THREE.Group();
      calf.position.y = -THIGH_LEN;
      thigh.add(calf);
      calf.add(limb(0.06, 0.047, CALF_LEN, uni));
      // knee pad (front of knee, moves with shin)
      const pad = box(0.088, 0.105, 0.05, kit.pads, 0, -0.035, -0.052);
      pad.rotation.x = -0.18;
      calf.add(pad);
      // boot: shaft + foot + sole lip
      calf.add(cyl(0.056, 0.06, 0.10, kit.boot, 0, -0.355, 0));
      calf.add(box(0.096, 0.07, 0.23, kit.boot, 0, -0.433, -0.045));
      calf.add(box(0.106, 0.027, 0.25, kit.pads, 0, -0.468, -0.045));
      return { thigh, calf };
    };
    const L = buildLeg(1), R = buildLeg(-1);
    this.legL = L.thigh; this.calfL = L.calf;
    this.legR = R.thigh; this.calfR = R.calf;

    // drop holster on right thigh (rides with the leg)
    const holster = box(0.05, 0.15, 0.08, kit.pads, -0.082, -0.16, -0.01);
    this.legR.add(holster);
    this.legR.add(box(0.055, 0.03, 0.09, kit.strap, -0.08, -0.085, -0.01)); // holster strap
    this.legR.add(box(0.03, 0.05, 0.035, kit.polymer, -0.085, -0.075, 0.025)); // pistol grip stub

    // ------------------------------------------------------------- torso
    this.torso = new THREE.Group();
    this.torso.position.y = 0.12;
    this.hips.add(this.torso);

    this.torso.add(box(0.32, 0.24, 0.20, uni, 0, 0.08, 0));           // lower torso
    this.torso.add(box(0.36, 0.30, 0.22, uni, 0, 0.31, 0));           // chest
    this.torso.add(box(0.26, 0.075, 0.18, uni, 0, 0.44, 0.01));       // traps / upper back

    // Plate carrier
    this.torso.add(box(0.32, 0.30, 0.055, kit.vest, 0, 0.295, -0.135));  // front plate
    this.torso.add(box(0.32, 0.32, 0.06, kit.vest, 0, 0.30, 0.125));     // back plate
    this.torso.add(box(0.06, 0.20, 0.20, kit.vest, 0.175, 0.21, 0));     // cummerbund L
    this.torso.add(box(0.06, 0.20, 0.20, kit.vest, -0.175, 0.21, 0));    // cummerbund R
    this.torso.add(box(0.07, 0.035, 0.20, kit.strap, 0.105, 0.462, -0.01)); // shoulder strap L
    this.torso.add(box(0.07, 0.035, 0.20, kit.strap, -0.105, 0.462, -0.01)); // shoulder strap R
    // 3 mag pouches + flaps
    for (let i = -1; i <= 1; i++) {
      this.torso.add(box(0.078, 0.115, 0.05, kit.pouch, i * 0.088, 0.185, -0.175));
      this.torso.add(box(0.08, 0.045, 0.056, kit.strap, i * 0.088, 0.235, -0.174));
    }
    // Admin pouch high on chest
    this.torso.add(box(0.15, 0.075, 0.035, kit.pouch, 0, 0.375, -0.16));
    // Radio on left shoulder strap + antenna
    this.torso.add(box(0.048, 0.10, 0.038, kit.pads, 0.12, 0.40, -0.115));
    if (hasAntenna) {
      this.torso.add(cyl(0.005, 0.003, 0.17, kit.polymer, 0.135, 0.50, -0.11));
    }
    // Hydration pack on the back
    if (hasPack) {
      this.torso.add(box(0.22, 0.28, 0.09, kit.pouch, 0, 0.28, 0.195));
      this.torso.add(box(0.20, 0.05, 0.10, kit.strap, 0, 0.415, 0.185));
    }

    // ------------------------------------------------------------- head
    this.head = new THREE.Group();
    this.head.position.set(-0.015, 0.52, 0);
    this.torso.add(this.head);
    this.torso.add(cyl(0.052, 0.056, 0.08, kit.mask, -0.01, 0.49, 0));   // neck
    // shemagh / neck wrap
    const scarf = ball(0.085, kit.scarf, -0.01, 0.495, -0.005, 1.15, 0.62, 1.2);
    this.torso.add(scarf);

    this.head.add(ball(0.106, kit.mask, 0, 0.025, 0, 0.9, 1.02, 0.96));   // balaclava skull
    this.head.add(box(0.10, 0.07, 0.10, kit.mask, 0, -0.028, -0.025));    // jaw
    this.head.add(box(0.125, 0.03, 0.02, kit.skin, 0, 0.05, -0.09));      // eye strip
    // comms headset earcups + band
    this.head.add(cyl(0.034, 0.034, 0.024, kit.pads, 0.092, 0.02, 0, 0, Math.PI / 2));
    this.head.add(cyl(0.034, 0.034, 0.024, kit.pads, -0.092, 0.02, 0, 0, Math.PI / 2));
    this.head.add(box(0.02, 0.04, 0.05, kit.pads, 0.10, 0.02, -0.045));   // mic boom stub

    // helmet: dome + rim, sits above the eye strip
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.58), kit.helmet);
    dome.position.y = 0.095;
    dome.scale.set(0.97, 0.86, 1.04);
    dome.castShadow = true;
    this.head.add(dome);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.121, 0.015, 6, 16), kit.helmet);
    rim.rotation.x = Math.PI / 2 + 0.10;   // back dips slightly lower
    rim.position.set(0, 0.088, 0.008);
    rim.scale.set(0.97, 1.05, 1);
    rim.castShadow = true;
    this.head.add(rim);
    // NVG mount plate + arm
    if (hasNVG) {
      this.head.add(box(0.034, 0.05, 0.016, kit.polymer, 0, 0.135, -0.118));
      this.head.add(box(0.024, 0.02, 0.035, kit.polymer, 0, 0.155, -0.13));
    }
    // side rails
    this.head.add(box(0.014, 0.03, 0.10, kit.polymer, 0.118, 0.10, -0.005));
    this.head.add(box(0.014, 0.03, 0.10, kit.polymer, -0.118, 0.10, -0.005));
    // goggles strapped up on the helmet
    this.head.add(box(0.115, 0.042, 0.035, kit.pads, 0, 0.135, -0.095));
    this.head.add(box(0.095, 0.028, 0.006, kit.lens, 0, 0.135, -0.114));
    this.head.add(box(0.24, 0.024, 0.012, kit.strap, 0, 0.135, 0.0));    // goggle strap around

    // ------------------------------------------------------------- arms
    const buildArm = (side) => { // +1 left, -1 right
      const upper = new THREE.Group();
      upper.position.set(0.168 * side, 0.375, side > 0 ? -0.02 : 0.02);
      this.torso.add(upper);
      upper.add(ball(0.076, uni, 0, -0.02, 0, 1, 1.15, 1));   // deltoid
      upper.add(limb(0.058, 0.047, UPPER_ARM, uni));
      const fore = new THREE.Group();
      fore.position.y = -UPPER_ARM;
      upper.add(fore);
      fore.add(ball(0.05, kit.pads, 0, 0.005, 0));            // elbow pad
      fore.add(cyl(0.052, 0.048, 0.06, uni, 0, -0.04, 0));    // rolled sleeve
      fore.add(limb(0.044, 0.036, FOREARM, kit.glove));       // gloved forearm sleeve
      const hand = box(0.052, 0.085, 0.075, kit.glove, 0, -FOREARM - 0.01, -0.005);
      hand.rotation.x = -0.35;
      fore.add(hand);
      return { upper, fore };
    };
    const AL = buildArm(1), AR = buildArm(-1);
    this.armL = AL.upper; this.forearmL = AL.fore;
    this.armR = AR.upper; this.forearmR = AR.fore;

    // ------------------------------------------------------------- rifle
    this.rifle = buildRifle(kit);
    this.torso.add(this.rifle);
    this.rifleRest = new THREE.Vector3(-0.135, 0.395, -0.24);
    this.rifle.position.copy(this.rifleRest);
    this.rifle.rotation.set(0, -0.035, 0);

    // Muzzle world-space anchor (tracer origin)
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0.004, -0.575);
    this.rifle.add(this.muzzle);

    // Enemy muzzle flash sprite
    const flashMat = new THREE.SpriteMaterial({
      color: 0xffd9a0, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.flash = new THREE.Sprite(flashMat);
    this.flash.scale.set(0.4, 0.4, 1);
    this.flash.position.set(0, 0.004, -0.63);
    this.rifle.add(this.flash);

    // IK targets/poles (torso space)
    this.gripR = new THREE.Vector3(0, -0.085, 0.025);    // rifle-local: pistol grip
    this.gripL = new THREE.Vector3(0, -0.055, -0.29);    // rifle-local: foregrip
    this.poleR = new THREE.Vector3(-0.6, -1, 0.3).normalize();
    this.poleL = new THREE.Vector3(0.85, -0.9, -0.15).normalize();
    this.splayR = new THREE.Vector3(-0.33, 0.06, -0.16); // death splay targets
    this.splayL = new THREE.Vector3(0.36, 0.03, -0.12);
    this._tR = new THREE.Vector3();
    this._tL = new THREE.Vector3();

    // Animation state
    this.t = rng() * 100;
    this.walkPhase = rng() * 10;
    this.flinchT = 99;
    this.flinchSide = 1;
    this.deathT = -1;
    this.deathDir = 1;
    this.flashT = 99;
    this.alertW = 1;

    this._pose(0, 0, 0, 0, 0, 0, 1);
  }

  triggerFlash() {
    this.flashT = 0;
    this.flash.material.rotation = rng() * Math.PI * 2;
    const s = 0.32 + rng() * 0.2;
    this.flash.scale.set(s, s, 1);
  }

  startDeath(dir) {
    this.deathT = 0;
    this.deathDir = dir >= 0 ? 1 : -1;
  }

  flinch() {
    this.flinchT = 0;
    this.flinchSide = rng.chance(0.5) ? 1 : -1;
  }

  // Transform a rifle-local point into torso space and solve both arms.
  _solveArms(blendSplay = 0) {
    this._tR.copy(this.gripR).applyQuaternion(this.rifle.quaternion).add(this.rifle.position);
    this._tL.copy(this.gripL).applyQuaternion(this.rifle.quaternion).add(this.rifle.position);
    if (blendSplay > 0) {
      this._tR.lerp(this.splayR, blendSplay);
      this._tL.lerp(this.splayL, blendSplay);
    }
    solveTwoBone(this.armR, this.forearmR, this._tR, UPPER_ARM, FOREARM, this.poleR);
    solveTwoBone(this.armL, this.forearmL, this._tL, UPPER_ARM, FOREARM, this.poleL);
  }

  /**
   * Animate. moveSpeed in m/s, crouch 0..1, aimPitch aims torso/rifle.
   * opts (optional): { fwd, side } local-space velocity for lean,
   * alert 0..1 (aimed vs patrol carry).
   */
  update(dt, moveSpeed, crouch, aimPitch, opts = null) {
    this.t += dt;

    // Muzzle flash fade (runs even while dying)
    this.flashT += dt;
    this.flash.material.opacity = Math.max(0, 1 - this.flashT / 0.05) * 0.95;

    if (this.deathT >= 0) { this._updateDeath(dt); return; }

    this.flinchT += dt;
    const fwdN = opts ? clamp(opts.fwd / 4, -1, 1) : clamp(moveSpeed / 4, 0, 1);
    const sideN = opts ? clamp(opts.side / 4, -1, 1) : 0;
    const alertTarget = opts && opts.alert !== undefined ? opts.alert : 1;
    this.alertW = lerp(this.alertW, alertTarget, 1 - Math.exp(-dt * 5));

    this.walkPhase += dt * (3.4 + moveSpeed * 1.9);
    const w = clamp(moveSpeed / 2.9, 0, 1.15);
    const idle = clamp(1 - w * 2.2, 0, 1);
    const ph = this.walkPhase;
    const s = Math.sin(ph);
    const c = crouch;
    const tt = this.t + this.phase;

    this._pose(w, s, ph, c, fwdN, sideN, idle, aimPitch, tt);
  }

  _pose(w, s, ph, c, fwdN, sideN, idle, aimPitch = 0, tt = 0) {
    const alert = this.alertW ?? 1;

    // ---- legs: swing + knee fold, blended with asymmetric combat crouch ----
    const swing = 0.52 * Math.min(w, 1);
    const kneeL = Math.max(0, -Math.sin(ph - 0.45)) * 1.05 * w;
    const kneeR = Math.max(0, Math.sin(ph - 0.45)) * 1.05 * w;
    this.legL.rotation.x = s * swing + c * 0.95;
    this.legR.rotation.x = -s * swing + c * 0.42;
    this.legL.rotation.y = 0;
    this.legR.rotation.y = -c * 0.3;
    this.calfL.rotation.x = -0.06 - kneeL - c * 1.68;
    this.calfR.rotation.x = -0.06 - kneeR - c * 1.62;
    // idle stance stagger (left foot slightly forward)
    this.legL.position.z = -0.04 * idle - c * 0.05;
    this.legR.position.z = 0.04 * idle + c * 0.04;

    // ---- hips: bob at 2x step frequency + sway + bladed stance ----
    // Drop the pelvis exactly enough that the planted (straight) leg keeps
    // its boot on the ground through the stride — kills the floaty look.
    const dip = 0.014 * w - (THIGH_LEN + CALF_LEN) * (1 - Math.cos(swing * s)) * 0.9;
    const breath = Math.sin(tt * 1.35) * 0.004;
    this.hips.position.y = HIP_Y - c * 0.31 + dip + breath;
    this.hips.position.z = c * 0.045;
    const blade = 0.15 * (1 - w * 0.75) * (0.35 + alert * 0.65);
    this.hips.rotation.y = s * 0.10 * w + blade * 0.4;
    this.hips.rotation.z = s * 0.05 * w;
    this.hips.rotation.x = -c * 0.05;

    // ---- torso: counter-rotate shoulders vs hips, lean into movement ----
    this.torso.rotation.y = -s * 0.17 * w + blade * 0.6 + Math.sin(tt * 0.7) * 0.015 * idle;
    const leanX = -0.055 - alert * 0.05 - Math.max(0, fwdN) * 0.13 + Math.min(0, fwdN) * 0.06 - c * 0.24;
    this.torso.rotation.x = leanX + aimPitch * 0.55 + Math.sin(tt * 1.35) * 0.006;
    this.torso.rotation.z = -sideN * 0.07 - s * 0.03 * w + Math.sin(tt * 0.9 + 1.3) * 0.008 * idle;

    // ---- rifle: shoulder-mounted, counter-bobbed so the muzzle stays steady ----
    const lowReady = (1 - alert) * 0.9;
    this.rifle.position.set(
      this.rifleRest.x + s * 0.006 * w,
      this.rifleRest.y - dip * 0.5 + Math.sin(tt * 1.35 + 0.6) * 0.003 - lowReady * 0.07,
      this.rifleRest.z + lowReady * 0.05
    );
    this.rifle.rotation.set(
      aimPitch * 0.45 + c * 0.20 - lowReady * 0.42 + Math.sin(tt * 1.1) * 0.006,
      -0.035 - blade - s * 0.05 * w + Math.sin(tt * 0.83) * 0.005,
      0
    );
    this._solveArms(0);

    // ---- head: cheek toward the stock when alert, scanning when idle ----
    const scan = (Math.sin(tt * 0.5 + this.scanP1) * 0.45 + Math.sin(tt * 0.21 + this.scanP2) * 0.3)
      * (1 - alert * 0.85) + Math.sin(tt * 0.62 + this.scanP1) * 0.05 * idle;
    this.head.rotation.y = -0.05 * alert - blade + scan;
    this.head.rotation.x = aimPitch * 0.4 - leanX * 0.55 + Math.abs(s) * 0.015 * w;
    this.head.rotation.z = -0.07 * alert;

    // ---- flinch impulse ----
    this.flinchT += 1 / 60;
    if (this.flinchT < 0.24) {
      const k = 1 - this.flinchT / 0.24;
      const k2 = k * k;
      this.torso.rotation.x += 0.20 * k2;
      this.torso.rotation.z += 0.10 * k2 * this.flinchSide;
      this.head.rotation.x += 0.28 * k2;
      this.head.rotation.z += 0.12 * k2 * this.flinchSide;
      this.rifle.rotation.x -= 0.30 * k2;
      this.hips.position.z += 0.03 * k2;
    }
  }

  // Two-stage death: knees buckle, then the torso twists and drops with
  // gravity ease-in, lands with a small bounce and settles.
  _updateDeath(dt) {
    this.deathT += dt;
    const t = this.deathT;
    const dir = -this.deathDir; // +1 falls backward (shot from the front)

    const buckle = smoothstep(0, 0.16, t);
    const fallT = clamp((t - 0.11) / 0.62, 0, 1);
    const f = Math.pow(fallT, 1.85);           // gravity: slow start, fast end
    const bt = t - 0.73;
    const bounce = bt > 0 ? Math.sin(bt * 24) * Math.exp(-bt * 9) * 0.05 : 0;
    const tw = this.deathTwist;

    this.root.rotation.x = dir * (1.50 * f + bounce);
    this.root.rotation.y = tw * f * 0.8;
    this.root.rotation.z = tw * f * -0.22;

    this.hips.position.y = HIP_Y - 0.36 * buckle - 0.38 * f;
    this.hips.position.z = 0.04 * buckle;
    this.hips.rotation.x = -0.1 * buckle + dir * 0.1 * f;
    this.hips.rotation.y = 0;
    this.hips.rotation.z = 0;

    // legs: buckle under, then sprawl asymmetrically
    this.legL.rotation.x = 0.55 * buckle * this.deathLegA - f * 0.5 * this.deathLegB;
    this.legR.rotation.x = 0.40 * buckle * this.deathLegB + f * 0.45 * this.deathLegA;
    this.legL.rotation.y = tw * 0.2 * f;
    this.legR.rotation.y = -tw * 0.15 * f;
    this.calfL.rotation.x = -1.5 * buckle + f * (1.5 * buckle - 0.3);
    this.calfR.rotation.x = -1.3 * buckle + f * (1.3 * buckle - 0.55 * this.deathLegA);

    // torso slumps then twists with the fall
    this.torso.rotation.x = -0.30 * buckle + dir * 0.28 * f;
    this.torso.rotation.y = tw * 0.45 * f;
    this.torso.rotation.z = tw * 0.18 * f;

    // head snaps forward on the hit, then lolls with the fall
    this.head.rotation.x = -0.35 * buckle + dir * 0.55 * f;
    this.head.rotation.y = tw * 0.3 * f;
    this.head.rotation.z = tw * 0.35 * f;

    // weapon pitches forward out of control; arms loosen toward a sprawl
    this.rifle.position.set(
      this.rifleRest.x - 0.03 * f,
      this.rifleRest.y - 0.14 * f,
      this.rifleRest.z - 0.02 * f
    );
    this.rifle.rotation.set(-1.15 * f - 0.25 * buckle, -0.06 + tw * 0.5 * f, tw * 0.3 * f);
    this._solveArms(f * 0.85);

    // Sink into the ground before removal
    if (t > 6) this.root.position.y -= dt * 0.25;
  }
}
