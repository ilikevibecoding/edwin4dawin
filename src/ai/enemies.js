import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getMaterialLib } from '../world/textures.js';
import { buildEnemyRifle } from '../weapons/models.js';
import { makeRNG, clamp, damp } from '../core/math.js';

const NAMES = ['ASWAD', 'JACKAL', 'VIPER', 'KHAT', 'RAMI', 'ZOLTAN', 'HYENA', 'SCARAB', 'FALAK', 'DERVISH', 'MIRAGE', 'SIROCCO'];
const rng = makeRNG(5150);

/* ------------------------- shared soldier assets --------------------------- */
/* Geometries and canvas textures are built once at module level and shared by
   every soldier instance; per-enemy cost is materials + transforms only. */

let SHARED = null;

function getShared() {
  if (SHARED) return SHARED;

  // Face map: near-white base (tinted by the skin material colour) with a dark
  // eye-line band on the forward hemisphere so faces read at distance.
  // SphereGeometry u=0.25 faces local +Z, so the band centres on x = 32/128.
  const faceC = document.createElement('canvas');
  faceC.width = faceC.height = 128;
  const fc = faceC.getContext('2d');
  fc.fillStyle = '#ffffff';
  fc.fillRect(0, 0, 128, 128);
  // Full-width brow band: kills the bald clay-pot crown at any view angle.
  fc.fillStyle = 'rgba(20,14,10,0.45)';
  fc.fillRect(0, 48, 128, 14);
  fc.fillStyle = 'rgba(25,18,14,0.18)';
  fc.fillRect(6, 51, 52, 14);
  fc.fillStyle = 'rgba(25,18,14,0.55)';
  fc.fillRect(9, 54, 46, 6);
  // Beard block across the lower third; denser at the jaw front.
  fc.fillStyle = 'rgba(20,14,10,0.38)';
  fc.fillRect(0, 72, 128, 38);
  fc.fillStyle = 'rgba(20,14,10,0.3)';
  fc.fillRect(8, 78, 48, 26);
  const faceTex = new THREE.CanvasTexture(faceC);
  faceTex.colorSpace = THREE.SRGBColorSpace;

  // Balaclava map: gear-coloured knit over the whole head, skin visible only
  // through a 40x22px eye slit (baked per skin tone, cached).
  const balaCache = new Map();
  const balaclavaTex = (skinHex) => {
    let tex = balaCache.get(skinHex);
    if (tex) return tex;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#3a3d34';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(0,0,0,0.14)';
    for (let y = 0; y < 128; y += 4) g.fillRect(0, y, 128, 1); // knit rows
    g.fillStyle = '#' + skinHex.toString(16).padStart(6, '0');
    g.fillRect(12, 50, 40, 22);                                // eye slit
    g.fillStyle = 'rgba(20,14,10,0.5)';
    g.fillRect(16, 57, 32, 7);                                 // eye shadow line
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    balaCache.set(skinHex, tex);
    return tex;
  };

  // Cloth mottle: one shared 256px canvas (~300 rects at 5% alpha, two tones)
  // used as albedo break-up AND roughness variation on cloth + pants.
  const motC = document.createElement('canvas');
  motC.width = motC.height = 256;
  const mc = motC.getContext('2d');
  mc.fillStyle = '#f4f2ee';
  mc.fillRect(0, 0, 256, 256);
  const mRng = makeRNG(9713);
  for (let i = 0; i < 300; i++) {
    mc.fillStyle = i % 2 ? 'rgba(52,44,34,0.05)' : 'rgba(255,252,240,0.05)';
    mc.fillRect(mRng() * 256, mRng() * 256, 4 + mRng() * 8, 4 + mRng() * 8);
  }
  const mkMottle = (srgb) => {
    const t = new THREE.CanvasTexture(motC);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const mottleMap = mkMottle(true);
  const mottleRough = mkMottle(false);

  // Blob contact shadow: radial gradient, drawn under each soldier.
  const blobC = document.createElement('canvas');
  blobC.width = blobC.height = 128;
  const bc = blobC.getContext('2d');
  const grd = bc.createRadialGradient(64, 64, 6, 64, 64, 62);
  grd.addColorStop(0, 'rgba(0,0,0,0.4)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.22)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  bc.fillStyle = grd;
  bc.fillRect(0, 0, 128, 128);
  const blobTex = new THREE.CanvasTexture(blobC);
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false });
  const blobGeo = new THREE.PlaneGeometry(0.75, 0.75).rotateX(-Math.PI / 2);

  // Ballistic helmet: lathe profile (crown -> side slope -> rim flare).
  // Points ascend so lathe normals face outward.
  const helmProfile = [
    new THREE.Vector2(0.124, -0.02),
    new THREE.Vector2(0.132, 0.005),
    new THREE.Vector2(0.128, 0.045),
    new THREE.Vector2(0.105, 0.078),
    new THREE.Vector2(0.0, 0.085),
  ];

  const geo = {
    torsoUp: new RoundedBoxGeometry(0.46, 0.30, 0.27, 2, 0.035),
    torsoLow: new RoundedBoxGeometry(0.43, 0.34, 0.25, 2, 0.03),
    pad: new RoundedBoxGeometry(0.15, 0.12, 0.24, 2, 0.025),
    vest: new RoundedBoxGeometry(0.42, 0.38, 0.35, 2, 0.02),
    pouch: new RoundedBoxGeometry(0.1, 0.13, 0.07, 1, 0.015),
    pouchLid: new RoundedBoxGeometry(0.115, 0.035, 0.085, 1, 0.012),
    belt: new RoundedBoxGeometry(0.45, 0.09, 0.31, 1, 0.02),
    collar: new THREE.CylinderGeometry(0.075, 0.083, 0.07, 10),
    head: new THREE.SphereGeometry(0.115, 16, 12),
    neck: new THREE.CylinderGeometry(0.055, 0.055, 0.09, 10),
    helmet: new THREE.LatheGeometry(helmProfile, 14),
    helmBrim: new RoundedBoxGeometry(0.13, 0.03, 0.06, 1, 0.01),
    nvg: new RoundedBoxGeometry(0.05, 0.045, 0.032, 1, 0.008),
    wrap: new THREE.SphereGeometry(0.135, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    scarf: new THREE.SphereGeometry(0.115, 10, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.36),
    tail: new THREE.BoxGeometry(0.11, 0.24, 0.03),
    cap: new THREE.CylinderGeometry(0.105, 0.115, 0.085, 12),
    capBrim: new THREE.BoxGeometry(0.16, 0.02, 0.11),
    shemagh: new THREE.TorusGeometry(0.085, 0.035, 8, 14).rotateX(Math.PI / 2).scale(1, 0.45, 1),
    upperArm: new THREE.CapsuleGeometry(0.062, 0.19, 4, 8),
    foreArm: new THREE.CapsuleGeometry(0.05, 0.18, 4, 8),
    hand: new RoundedBoxGeometry(0.07, 0.095, 0.065, 2, 0.02),
    thigh: new RoundedBoxGeometry(0.15, 0.42, 0.16, 2, 0.045),
    shin: new RoundedBoxGeometry(0.11, 0.4, 0.13, 2, 0.035),
    pelvis: new RoundedBoxGeometry(0.4, 0.18, 0.26, 2, 0.04),
    kneepad: new RoundedBoxGeometry(0.115, 0.13, 0.05, 1, 0.018),
    strap: new THREE.BoxGeometry(0.36, 0.025, 0.02),
    blouse: new THREE.CylinderGeometry(0.064, 0.079, 0.11, 10),
    boot: new RoundedBoxGeometry(0.115, 0.12, 0.26, 1, 0.015),
    thighRig: new RoundedBoxGeometry(0.09, 0.13, 0.11, 1, 0.015),
    canteen: new RoundedBoxGeometry(0.1, 0.14, 0.08, 1, 0.02),
    buttpack: new RoundedBoxGeometry(0.2, 0.14, 0.1, 2, 0.02),
    holster: new RoundedBoxGeometry(0.06, 0.16, 0.09, 1, 0.015),
    chestPouch: new RoundedBoxGeometry(0.14, 0.09, 0.05, 1, 0.012),
    sightBlock: new THREE.BoxGeometry(0.02, 0.07, 0.026),
    barrelShroud: new THREE.CylinderGeometry(0.0155, 0.014, 0.24, 10).rotateX(Math.PI / 2),
  };

  SHARED = { faceTex, balaclavaTex, mottleMap, mottleRough, blobGeo, blobMat, geo };
  return SHARED;
}

/* Scratch objects for the per-frame aim solver (no per-frame allocations). */
const _aV1 = new THREE.Vector3();
const _aV2 = new THREE.Vector3();
const _aV3 = new THREE.Vector3();
const _aQ1 = new THREE.Quaternion();
const _aQ2 = new THREE.Quaternion();
const _aQ3 = new THREE.Quaternion();
const _aQSway = new THREE.Quaternion();
const _aQId = new THREE.Quaternion();
const _aE = new THREE.Euler();

/* Two-bone IK: orient shoulder + elbow so the wrist lands on `target` (in the
   shoulder's parent space). Chain: elbow at shoulder-local (0,-L1,0), forearm
   along -Y, wrist at elbow-local (0,-L2,0); elbow bends about local +X with
   negative values folding the forearm forward. `pole` biases elbow direction. */
function solveArm(arm, target, pole, L1 = 0.29, L2 = 0.28) {
  const S = arm.shoulder.position;
  const D = target.clone().sub(S);
  const d = clamp(D.length(), Math.abs(L1 - L2) + 0.02, (L1 + L2) * 0.99);
  const Dn = D.normalize();
  const cosE = clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1);
  const elbowAng = Math.acos(cosE);
  const cosS = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
  const shAng = Math.acos(cosS);
  const M = pole.clone().sub(Dn.clone().multiplyScalar(pole.dot(Dn)));
  if (M.lengthSq() < 1e-6) M.set(0, 0, 1);
  M.normalize();
  const U = Dn.clone().multiplyScalar(Math.cos(shAng)).addScaledVector(M, Math.sin(shAng));
  const E = S.clone().addScaledVector(U, L1);
  const F = target.clone().sub(E).normalize();
  const yAxis = U.clone().negate();
  let zAxis = F.clone().sub(U.clone().multiplyScalar(F.dot(U)));
  if (zAxis.lengthSq() < 1e-6) zAxis = M.clone();
  zAxis.normalize();
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis);
  arm.shoulder.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
  arm.elbow.rotation.set(-(Math.PI - elbowAng), 0, 0);
}

/* ------------------------------ soldier model ------------------------------ */

function buildSoldier(variant = 0) {
  const lib = getMaterialLib();
  const S = getShared();
  const G = S.geo;

  // Per-instance material variance so squads don't read as clones.
  const vary = (mat, h = 0.015, s = 0.06, l = 0.05) => {
    mat.color.offsetHSL(rng.spread(h), rng.spread(s), rng.spread(l));
    return mat;
  };
  // Skin tones darkened ~20% (the old set rendered as fired terracotta).
  const skinTone = [0x6e4e3a, 0x593d2b, 0x7d5c43][variant % 3];
  const skin = vary(new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.85 }), 0.01, 0.04, 0.03);
  const face = new THREE.MeshStandardMaterial({ color: skin.color.clone(), roughness: 0.85, map: S.faceTex });
  let cloth;
  if (variant % 3 === 0) {
    cloth = lib.camo.clone();               // shares the camo canvas maps
    cloth.roughnessMap = S.mottleRough;
    cloth.color.multiplyScalar(1.1);        // lift toward the light-uniform step
  } else {
    // Light uniform step of the 3-value ladder (vest reads dark against it).
    cloth = new THREE.MeshStandardMaterial({
      color: 0x7a7a60,
      roughness: 0.95, map: S.mottleMap, roughnessMap: S.mottleRough,
    });
  }
  vary(cloth);
  const clothLow = cloth.clone();
  clothLow.color.multiplyScalar(0.8);       // fake AO under the vest
  const pants = vary(new THREE.MeshStandardMaterial({
    color: [0x7b7660, 0x6b665a, 0x757458][variant % 3],
    roughness: 0.95, map: S.mottleMap, roughnessMap: S.mottleRough,
  }));
  // Dark carrier step of the ladder: vest + pouches + belt.
  const gear = vary(new THREE.MeshStandardMaterial({ color: 0x33352c, roughness: 0.9 }));
  const kneeMat = vary(new THREE.MeshStandardMaterial({ color: 0x3a3d34, roughness: 0.92 }), 0.008, 0.03, 0.02);
  const strapMat = vary(new THREE.MeshStandardMaterial({ color: 0xc9b78a, roughness: 0.92 }), 0.008, 0.03, 0.03);
  const bootMat = vary(new THREE.MeshStandardMaterial({ color: 0x2e261c, roughness: 0.9 }), 0.01, 0.03, 0.03);

  const root = new THREE.Group();
  const mk = (geoRef, mat, parent, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geoRef, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  // -- torso assembly
  const torsoPivot = new THREE.Group();
  torsoPivot.position.y = 1.02;
  root.add(torsoPivot);
  mk(G.torsoUp, cloth, torsoPivot, 0, 0.425, 0);
  mk(G.torsoLow, clothLow, torsoPivot, 0, 0.165, 0);
  for (const s of [-1, 1]) mk(G.pad, cloth, torsoPivot, s * 0.235, 0.5, 0);
  mk(G.vest, gear, torsoPivot, 0, 0.3, 0);
  for (let i = 0; i < 3; i++) {
    mk(G.pouch, gear, torsoPivot, -0.13 + i * 0.13, 0.225, 0.2);
    mk(G.pouchLid, gear, torsoPivot, -0.13 + i * 0.13, 0.3, 0.205);
  }
  mk(G.belt, gear, torsoPivot, 0, 0, 0);
  // Tan webbing straps across the vest front: the carrier reads at 50 m.
  mk(G.strap, strapMat, torsoPivot, 0, 0.4, 0.185);
  mk(G.strap, strapMat, torsoPivot, 0, 0.155, 0.185);
  // Pelvis block under the torso: no light-leak gap at the crotch.
  mk(G.pelvis, pants, root, 0, 0.92, 0);

  // Optional gear pool: two attachments are dropped per spawn (de-clone).
  const gearPool = [
    () => mk(G.canteen, gear, torsoPivot, -0.19, -0.04, -0.13),
    () => mk(G.buttpack, gear, torsoPivot, 0, 0.08, -0.19),
    () => { mk(G.holster, gear, torsoPivot, 0.215, -0.06, 0.05).rotation.z = -0.08; },
    () => { mk(G.chestPouch, gear, torsoPivot, 0, 0.415, 0.185).rotation.x = -0.15; },
  ];
  for (let i = 0; i < 2; i++) gearPool.splice(rng.int(0, gearPool.length - 1), 1);
  for (const fn of gearPool) fn();

  // -- head
  const headPivot = new THREE.Group();
  headPivot.position.y = 0.66;
  torsoPivot.add(headPivot);
  // Balaclava variant on some helmet/cap soldiers: knit head, skin only in
  // the eye slit. Keffiyeh soldiers keep the wrapped face instead.
  const balaclava = variant % 3 !== 1 && rng.chance(0.4);
  const headMat = balaclava
    ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, map: S.balaclavaTex(skinTone) })
    : face;
  const head = mk(G.head, headMat, headPivot, 0, 0.1, 0);
  head.scale.set(0.88, 1.06, 0.94);
  mk(G.neck, balaclava ? kneeMat : skin, headPivot, 0, -0.005, 0.005);
  if (variant % 3 === 0) {
    // Ballistic helmet: lathe shell (raked so the back drops to the ears,
    // front rim rides the brow) + front brim + NVG mount stub.
    const helm = mk(G.helmet, gear, headPivot, 0, 0.132, -0.005);
    helm.scale.set(1.08, 1.22, 1.16);
    helm.rotation.x = -0.12;
    mk(G.helmBrim, gear, headPivot, 0, 0.118, 0.145).rotation.x = -0.2;
    mk(G.nvg, gear, headPivot, 0, 0.155, 0.148);
    mk(G.collar, cloth, torsoPivot, 0, 0.585, 0.01);
  } else if (variant % 3 === 1) {
    // Keffiyeh wrap + face scarf + tail, shemagh coil at the neck.
    // Mid-value wrap (0x8f8266): stops blowing out to a white ping-pong ball.
    const wrapMat = vary(new THREE.MeshStandardMaterial({ color: 0x8f8266, roughness: 1 }));
    mk(G.wrap, wrapMat, headPivot, 0, 0.135, 0);
    mk(G.scarf, wrapMat, headPivot, 0, 0.085, 0.03);
    mk(G.tail, wrapMat, headPivot, 0.05, -0.02, -0.125).rotation.x = 0.25;
    const shemMat = vary(new THREE.MeshStandardMaterial({ color: 0x6f6a52, roughness: 1 }));
    mk(G.shemagh, shemMat, torsoPivot, 0, 0.6, 0.05);
  } else {
    // Field cap (wide brim shadows the eyes) + shemagh tucked under the jaw.
    mk(G.cap, cloth, headPivot, 0, 0.2, 0);
    mk(G.capBrim, cloth, headPivot, 0, 0.172, 0.12).rotation.x = -0.12;
    const shemMat = vary(new THREE.MeshStandardMaterial({ color: 0x6f6a52, roughness: 1 }));
    mk(G.shemagh, shemMat, torsoPivot, 0, 0.6, 0.05);
  }

  // -- aim group: arms + rifle sway together (figure-8 in update()).
  const aimGroup = new THREE.Group();
  aimGroup.position.set(0, 0.44, 0.04);
  torsoPivot.add(aimGroup);

  const mkArm = (side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.27, 0.04, -0.02);
    aimGroup.add(shoulder);
    mk(G.upperArm, cloth, shoulder, 0, -0.145, 0);
    const elbow = new THREE.Group();
    elbow.position.y = -0.29;
    shoulder.add(elbow);
    mk(G.foreArm, cloth, elbow, 0, -0.135, 0);
    return { shoulder, elbow };
  };
  const armR = mkArm(1);
  const armL = mkArm(-1);

  // -- rifle: butt seated in the right shoulder pocket, muzzle forward-left
  //    and dipped ~20° at low-ready. COMBAT rotates the whole aim group so
  //    the barrel lands on the player's bearing (see the aim solver in
  //    update()). Cross-section is scaled up so the profile reads at 20 m.
  const rifle = buildEnemyRifle();
  rifle.scale.set(1.5, 1.5, 1.1);
  rifle.position.set(0.16, -0.02, 0.2);
  rifle.rotation.set(0.35, 2.1, 0.06);
  aimGroup.add(rifle);
  mk(G.sightBlock, lib.gunMetal, rifle, 0, 0.05, -0.455);       // front sight tower
  mk(G.barrelShroud, lib.gunMetal, rifle, 0, 0.01, -0.38);      // thick barrel mass
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.012, -0.53);
  rifle.add(muzzle);

  // Hands ride ON the weapon: right hand at the grip, left under the handguard.
  rifle.updateMatrix();
  const gripP = new THREE.Vector3(0, -0.045, 0.115).applyMatrix4(rifle.matrix);
  const guardP = new THREE.Vector3(0, -0.045, -0.16).applyMatrix4(rifle.matrix);
  const mkHand = (p) => {
    const h = new THREE.Mesh(G.hand, skin);
    h.position.copy(p);
    h.quaternion.copy(rifle.quaternion);
    aimGroup.add(h);
    return h;
  };
  const handR = mkHand(gripP);
  const handL = mkHand(guardP);

  // Pose the arm chains so shoulders/elbows plausibly reach the hands.
  solveArm(armR, gripP.clone().add(new THREE.Vector3(0.015, 0.05, -0.015)), new THREE.Vector3(0.75, -0.55, -0.35));
  solveArm(armL, guardP.clone().add(new THREE.Vector3(-0.01, 0.045, -0.01)), new THREE.Vector3(-0.4, -0.9, 0));

  // -- legs: rounded-box thigh/shin (shin top overlaps ~0.05 into the thigh
  //    so the knee never opens), kneepad on each shin top, taller boots +
  //    trouser blouse at the ankle.
  const mkLeg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.11, 1.0, 0);
    root.add(hip);
    mk(G.thigh, pants, hip, 0, -0.21, 0);
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    hip.add(knee);
    mk(G.shin, pants, knee, 0, -0.135, 0);
    mk(G.kneepad, kneeMat, knee, 0, -0.02, 0.058);
    mk(G.blouse, pants, knee, 0, -0.37, 0.005);
    mk(G.boot, bootMat, knee, 0, -0.478, 0.05);
    return { hip, knee };
  };
  const legR = mkLeg(1);
  const legL = mkLeg(-1);
  mk(G.thighRig, gear, legR.hip, 0.065, -0.24, 0.04).rotation.y = 0.15;

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // Blob contact shadow (added after the traverse: must not cast/receive).
  const blob = new THREE.Mesh(S.blobGeo, S.blobMat);
  blob.position.y = 0.015;
  blob.renderOrder = 1;
  root.add(blob);

  return { root, torsoPivot, headPivot, aimGroup, armR, armL, legR, legL, rifle, muzzle, handR, handL, blob };
}

/* --------------------------------- enemy ---------------------------------- */

const STATE = { ADVANCE: 0, COMBAT: 1, RELOCATE: 2, DEAD: 3 };

class Enemy {
  constructor(mgr, pos, variant) {
    this.mgr = mgr;
    this.model = buildSoldier(variant);
    this.root = this.model.root;
    this.root.position.copy(pos);
    const scale = 0.97 + rng() * 0.08;
    this.root.scale.setScalar(scale);
    mgr.scene.add(this.root);

    this.name = rng.pick(NAMES) + '-' + rng.int(10, 99);
    this.health = 100;
    this.alive = true;
    this.state = STATE.ADVANCE;
    this.pos = this.root.position;
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.targetYaw = 0;
    this.speed = 0;
    this.walkPhase = rng() * 10;
    this.breathePhase = rng() * Math.PI * 2;
    this.blade = 0;       // hip yaw offset (radians) off the aim line; 0 while moving
    this.twist = 0;       // torso yaw on top of the hips (shouldering / idle counter)
    this.aimBlend = 0;    // 0 low-ready, 1 weapon presented at the player
    this.aimErr = Math.PI;              // angle between barrel and target line
    this.aimCorr = new THREE.Quaternion(); // persistent aim-group correction
    this.hasLOS = false;  // published for the HUD spot diamond
    this.torsoPitch = 0;
    this.path = null;
    this.pathIdx = 0;
    this.repathT = 0;
    this.burstLeft = 0;
    this.shotT = 0;
    this.aimT = 1 + rng() * 1.5;
    this.duckT = 0;
    this.crouch = 0;      // 0 stand, 1 crouch
    this.crouchTarget = 0;
    this.flinchT = 0;
    this.deathT = 0;
    this.corpseVel = new THREE.Vector3();
    this.fallDir = new THREE.Vector3(1, 0, 0);
    this.relocateTarget = null;
    this.exposed = 1;
  }

  /* --------- damage --------- */
  damage(amount, point, dir, headshot) {
    if (!this.alive) return false;
    this.health -= amount;
    this.flinchT = 0.18;
    this.killCause = headshot ? 'HEADSHOT' : (this.mgr.playerWeaponLabel ? this.mgr.playerWeaponLabel() : 'M4A1');
    if (this.health <= 0) {
      this.die(dir, amount > 60);
      return true;
    }
    // Getting shot pulls them into combat
    if (this.state === STATE.ADVANCE && rng.chance(0.6)) this.enterCombat();
    return false;
  }

  die(dir, fling = false) {
    this.alive = false;
    this.state = STATE.DEAD;
    this.deathT = 0;
    const d = dir ? dir.clone().setY(0).normalize() : new THREE.Vector3(rng.spread(1), 0, rng.spread(1)).normalize();
    this.fallDir = d;
    this.corpseVel.copy(d).multiplyScalar(fling ? 5.5 + rng() * 3 : 1.1);
    if (fling) this.corpseVel.y = 4.5 + rng() * 2.5;
    // Relax limbs randomly
    const M = this.model;
    // Hands leave the weapon and hang at the wrists so relaxed arms read right.
    for (const [arm, hand] of [[M.armR, M.handR], [M.armL, M.handL]]) {
      arm.elbow.add(hand);
      hand.position.set(0, -0.3, 0);
      hand.rotation.set(0, 0, 0);
    }
    M.aimGroup.rotation.set(0, 0, 0);
    M.armR.shoulder.rotation.set(-0.4 + rng.spread(0.5), 0, -0.5 + rng.spread(0.4));
    M.armL.shoulder.rotation.set(-0.3 + rng.spread(0.5), 0, 0.5 + rng.spread(0.4));
    M.armR.elbow.rotation.x = -0.3 - rng() * 0.4;
    M.armL.elbow.rotation.x = -0.3 - rng() * 0.4;
    M.legR.hip.rotation.x = rng.spread(0.5);
    M.legL.hip.rotation.x = rng.spread(0.5);
    M.legR.knee.rotation.x = rng() * 0.6;
    M.legL.knee.rotation.x = rng() * 0.6;
    // Drop rifle slightly
    M.rifle.rotation.z = rng.spread(0.8);
    M.rifle.rotation.x += 0.25 + rng() * 0.3;
    this.mgr.onEnemyKilled(this);
  }

  enterCombat() {
    this.state = STATE.COMBAT;
    this.aimT = 0.35 + rng() * 0.7;
    this.burstLeft = 0;
    this.crouchTarget = rng.chance(0.5) ? 1 : 0;
  }

  /* --------- think --------- */
  update(dt, playerPos, t) {
    const M = this.model;
    if (this.state === STATE.DEAD) {
      this.deathT += dt;
      // Contact blob shrinks away as the body drops (sun shadow takes over).
      if (M.blob.visible) {
        const k = 1 - this.deathT * 2.2;
        if (k <= 0.02) M.blob.visible = false;
        else M.blob.scale.setScalar(k);
      }
      // Ballistic corpse
      if (this.deathT < 2.2) {
        this.corpseVel.y -= 14 * dt;
        this.pos.addScaledVector(this.corpseVel, dt);
        if (this.pos.y <= 0) { this.pos.y = 0; this.corpseVel.set(0, 0, 0); }
        // Fall rotation: pivot to lying
        const k = clamp(this.deathT / 0.5, 0, 1);
        const ease = 1 - (1 - k) * (1 - k);
        const axis = new THREE.Vector3(-this.fallDir.z, 0, this.fallDir.x);
        this.root.quaternion.setFromAxisAngle(axis, ease * Math.PI * 0.5 * 0.96);
        this.root.rotateY(this.yaw);
        this.root.position.y = Math.max(this.pos.y, 0) + ease * 0.12;
      }
      if (this.deathT > 22) {
        this.root.position.y -= dt * 0.25; // sink away
        if (this.deathT > 25) this.mgr.removeEnemy(this);
      }
      return;
    }

    const toPlayer = playerPos.clone().sub(this.pos);
    const distP = toPlayer.length();
    const dirP = toPlayer.clone().normalize();
    this.repathT -= dt;
    this.flinchT = Math.max(0, this.flinchT - dt);

    const eye = this.pos.clone().add(new THREE.Vector3(0, 1.55 - this.crouch * 0.5, 0));
    const playerEye = playerPos.clone().add(new THREE.Vector3(0, 1.5, 0));
    const hasLOS = this.mgr.colliders.hasLOS(eye, playerEye);
    this.hasLOS = hasLOS;

    switch (this.state) {
      case STATE.ADVANCE: {
        // Path toward a cover point near the player
        if (!this.path || this.repathT <= 0) {
          const cover = this.mgr.pickCover(this.pos, playerPos);
          const goal = cover ?? playerPos;
          this.path = this.mgr.nav.findPath(this.pos.x, this.pos.z, goal.x, goal.z) ?? [[goal.x, goal.z]];
          this.pathIdx = 0;
          this.repathT = 3 + rng() * 2;
        }
        this._followPath(dt, 4.4);
        if (hasLOS && distP < 34 && rng.chance(0.03)) this.enterCombat();
        if (this.path && this.pathIdx >= this.path.length) this.enterCombat();
        if (distP < 12 && hasLOS) this.enterCombat();
        break;
      }
      case STATE.COMBAT: {
        this.speed = damp(this.speed, 0, 8, dt);
        this.targetYaw = Math.atan2(dirP.x, dirP.z);
        // Peek / duck cycle when in cover
        this.duckT -= dt;
        if (this.duckT <= 0) {
          this.crouchTarget = this.crouchTarget > 0.5 ? 0 : (rng.chance(0.55) ? 1 : 0);
          this.duckT = 0.9 + rng() * 1.6;
        }
        const standing = this.crouch < 0.4;
        if (hasLOS && standing) {
          this.aimT -= dt;
          // Gate every shot on the aim solver: the barrel must be on the
          // target line (< ~10°) before _fireAt is allowed to run.
          if (this.burstLeft > 0) {
            this.shotT -= dt;
            if (this.shotT <= 0) {
              if (this.aimErr < 0.18) {
                this.shotT = 0.105 + rng() * 0.03;
                this.burstLeft--;
                this._fireAt(playerEye, distP);
              } else {
                this.shotT = 0.05; // hold fire until the muzzle settles
              }
            }
          } else if (this.aimT <= 0 && this.aimErr < 0.18) {
            this.burstLeft = rng.int(3, 6);
            this.aimT = 0.7 + rng() * 1.3;
          }
        }
        // Occasionally relocate to better cover
        if (rng.chance(0.0025) || (!hasLOS && rng.chance(0.01))) {
          this.state = STATE.RELOCATE;
          const cover = this.mgr.pickCover(this.pos, playerPos, true);
          if (cover) {
            this.path = this.mgr.nav.findPath(this.pos.x, this.pos.z, cover.x, cover.z) ?? null;
            this.pathIdx = 0;
          }
          if (!this.path) this.state = STATE.COMBAT;
        }
        break;
      }
      case STATE.RELOCATE: {
        this.crouchTarget = 0;
        this._followPath(dt, 4.6);
        if (!this.path || this.pathIdx >= this.path.length) this.enterCombat();
        if (distP < 9 && hasLOS) this.enterCombat();
        break;
      }
    }

    // Separation from other enemies
    for (const other of this.mgr.enemies) {
      if (other === this || !other.alive) continue;
      const d = this.pos.distanceTo(other.pos);
      if (d < 1.2 && d > 1e-4) {
        const push = this.pos.clone().sub(other.pos).setY(0).normalize().multiplyScalar((1.2 - d) * 2 * dt);
        this.pos.add(push);
      }
    }

    // Capsule collision + yaw smoothing
    this.mgr.colliders.resolveCapsule(this.pos, 0.38, 1.7, this.vel);
    this.pos.y = Math.max(0, this.pos.y);
    let dy = this.targetYaw - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.yaw += dy * Math.min(1, dt * 8);
    // Bladed stance: `blade` is the hip yaw (radians) off the aim line.
    this.root.rotation.set(0, this.yaw + this.blade, 0);

    // Crouch blend
    this.crouch = damp(this.crouch, this.crouchTarget, 6, dt);

    /* --------- animate --------- */
    const moving = this.speed > 0.4;
    this.walkPhase += dt * (5.2 + this.speed * 1.6);
    const swing = moving ? Math.sin(this.walkPhase) : 0;
    const swing2 = moving ? Math.sin(this.walkPhase + Math.PI) : 0;
    const amp = clamp(this.speed / 4.4, 0, 1) * 0.62;
    // Standing = bladed: hips ~20° off the aim line in COMBAT (0.35 rad, a
    // touch more at ease), lead foot staggered. Squared up while moving or
    // crouching (blade fights the crouch pose).
    const bladeTarget = (moving || this.crouch > 0.35) ? 0 : (this.state === STATE.COMBAT ? 0.35 : 0.42);
    this.blade = damp(this.blade, bladeTarget, 5, dt);
    const blade = this.blade;
    M.legR.hip.rotation.x = swing * amp + this.crouch * -0.7;
    M.legL.hip.rotation.x = swing2 * amp + this.crouch * -0.85;
    M.legR.hip.position.z = blade * -0.1;
    M.legL.hip.position.z = blade * 0.29;
    M.legR.knee.rotation.x = Math.max(0, -swing) * amp * 1.4 + this.crouch * 1.15;
    M.legL.knee.rotation.x = Math.max(0, -swing2) * amp * 1.4 + this.crouch * 1.3 + blade * 0.14;
    this.root.position.y = this.pos.y - this.crouch * 0.42 + (moving ? Math.abs(Math.cos(this.walkPhase)) * 0.05 * amp : 0);

    // Torso: aim pitch toward player + flinch + breathing
    const pitchTo = clamp(Math.atan2(playerEye.y - eye.y, Math.max(1, distP)), -0.5, 0.4);
    this.torsoPitch = damp(this.torsoPitch, -pitchTo * 0.6 + (this.flinchT > 0 ? 0.22 : 0), 10, dt);
    const breathe = Math.sin(t * 1.4 + this.breathePhase) * 0.018;
    M.torsoPivot.rotation.x = this.torsoPitch + breathe;
    // Aim/idle torso twist over the bladed hips: shouldering the rifle winds
    // the chest toward the target side; at ease it counters the hips instead.
    const aiming = this.state === STATE.COMBAT && this.crouch < 0.4 && hasLOS;
    this.aimBlend = damp(this.aimBlend, aiming ? 1 : 0, 6, dt);
    this.twist = damp(this.twist, (1 - this.aimBlend) * (-0.55 * blade) + this.aimBlend * 0.3, 6, dt);
    // Walk counter-rotation (shoulders against hips), head compensates
    const counter = -swing * amp * 0.35;
    M.torsoPivot.rotation.y = counter + this.twist + (this.flinchT > 0 ? rng.spread(0.12) : 0);
    M.torsoPivot.rotation.z = moving ? Math.sin(this.walkPhase) * 0.05 * amp : 0;
    M.headPivot.rotation.x = -pitchTo * 0.4 - breathe * 0.6;
    M.headPivot.rotation.y = -counter * 0.5 - clamp(blade + this.twist, -0.6, 0.6) * 0.8;

    // Weapon figure-8 sway; in COMBAT an aim correction is layered on top so
    // the barrel is actually on the player's bearing before _fireAt runs.
    _aE.set(Math.sin(t * 1.7 + this.breathePhase * 1.7) * 0.02, 0, Math.sin(t * 0.9 + this.breathePhase) * 0.025, 'XYZ');
    _aQSway.setFromEuler(_aE);
    M.aimGroup.quaternion.multiplyQuaternions(this.aimCorr, _aQSway);
    if (aiming) {
      // Measure the bore line in world space (muzzle -Z), then rotate the
      // aim pivot so it closes onto the player's eyes. Iterative feedback:
      // converges in ~0.3 s, well inside the pre-burst aim delay.
      const muzzleP = M.muzzle.getWorldPosition(_aV1);
      const barrel = M.muzzle.getWorldDirection(_aV2).negate();
      const want = _aV3.copy(playerEye).sub(muzzleP).normalize();
      this.aimErr = barrel.angleTo(want);
      _aQ1.setFromUnitVectors(barrel, want);                    // world-space fix
      M.torsoPivot.getWorldQuaternion(_aQ2);                    // aim group's parent
      _aQ3.copy(_aQ2).invert().multiply(_aQ1).multiply(_aQ2);   // to local premultiplier
      _aQ3.multiply(this.aimCorr);                              // full-correction target
      this.aimCorr.slerp(_aQ3, Math.min(1, 1 - Math.exp(-12 * dt)));
      // Clamp so point-blank targets can't contort the shoulder girdle.
      _aE.setFromQuaternion(this.aimCorr, 'YXZ');
      _aE.y = clamp(_aE.y, -1.1, 1.1);
      _aE.x = clamp(_aE.x, -0.8, 0.8);
      _aE.z = clamp(_aE.z * 0.35, -0.12, 0.12);
      this.aimCorr.setFromEuler(_aE);
      M.aimGroup.quaternion.multiplyQuaternions(this.aimCorr, _aQSway);
    } else {
      this.aimErr = Math.PI;
      this.aimCorr.slerp(_aQId, Math.min(1, 1 - Math.exp(-6 * dt)));
    }
  }

  _followPath(dt, speed) {
    if (!this.path || this.pathIdx >= this.path.length) { this.speed = damp(this.speed, 0, 8, dt); return; }
    const [tx, tz] = this.path[this.pathIdx];
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.5) { this.pathIdx++; return; }
    this.speed = damp(this.speed, speed, 5, dt);
    this.targetYaw = Math.atan2(dx / d, dz / d);
    this.pos.x += (dx / d) * this.speed * dt;
    this.pos.z += (dz / d) * this.speed * dt;
  }

  _fireAt(playerEye, dist) {
    const M = this.model;
    this.lastShotTime = performance.now() * 0.001;
    const muzzlePos = new THREE.Vector3();
    M.muzzle.getWorldPosition(muzzlePos);
    // Aim error
    const err = 0.35 + dist * 0.028;
    const target = playerEye.clone().add(new THREE.Vector3(rng.spread(err), rng.spread(err * 0.7), rng.spread(err)));
    this.mgr.fx.muzzle(muzzlePos, target.clone().sub(muzzlePos).normalize());
    this.mgr.tracers.fire(muzzlePos, target, 300, 0xffb46a);
    this.mgr.audio.gunshot({ vol: 0.85, dist, caliber: 1.15 });
    // Chance to hit the player
    const movePenalty = this.mgr.getPlayerSpeed() * 0.10;
    const p = clamp(0.24 - dist * 0.004 - movePenalty, 0.05, 0.24);
    if (rng() < p) {
      this.mgr.onPlayerHit(rng.int(6, 13), this.pos);
    } else if (rng.chance(0.4)) {
      // near miss crack: impact somewhere behind player
      const missDir = target.clone().sub(muzzlePos).normalize();
      const hit = this.mgr.colliders.raycast(muzzlePos, missDir, 120);
      if (hit) {
        this.mgr.fx.impactWall(hit.point, hit.normal);
        this.mgr.decals.bulletHole(hit.point, hit.normal);
      }
    }
  }

  /** Ray-sphere hit test. Returns { t, point, headshot } or null. */
  raycast(origin, dir, maxDist) {
    if (!this.alive) return null;
    const spheres = [
      // Head sits at ~1.78 m (headPivot 0.66 + skull offset above the 1.02 torso pivot)
      { c: this.pos.clone().add(new THREE.Vector3(0, 1.73 - this.crouch * 0.45, 0)), r: 0.175, head: true },
      { c: this.pos.clone().add(new THREE.Vector3(0, 1.15 - this.crouch * 0.35, 0)), r: 0.31, head: false },
      { c: this.pos.clone().add(new THREE.Vector3(0, 0.55 - this.crouch * 0.15, 0)), r: 0.3, head: false },
    ];
    let best = null;
    for (const s of spheres) {
      const oc = origin.clone().sub(s.c);
      const b = oc.dot(dir);
      const c = oc.lengthSq() - s.r * s.r;
      const disc = b * b - c;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t < 0.1 || t > maxDist) continue;
      if (!best || t < best.t) {
        best = { t, point: origin.clone().addScaledVector(dir, t), headshot: s.head };
      }
    }
    return best;
  }
}

/* -------------------------------- manager --------------------------------- */

export class EnemyManager {
  constructor({ scene, colliders, nav, fx, decals, tracers, audio, coverPoints, spawnPoints }) {
    this.scene = scene;
    this.colliders = colliders;
    this.nav = nav;
    this.fx = fx;
    this.decals = decals;
    this.tracers = tracers;
    this.audio = audio;
    this.coverPoints = coverPoints;
    this.spawnPoints = spawnPoints;
    this.enemies = [];
    this.wave = 0;
    this.pendingSpawns = 0;
    this.spawnT = 0;
    this.waveBreakT = 2.5;
    this.maxAlive = 6;
    this.onKill = null;        // (enemy, headshot?) => void
    this.onPlayerHit = null;   // set by game
    this.onWave = null;
    this.getPlayerSpeed = () => 0;
    this.playerPos = new THREE.Vector3();
    this.frozen = false;
  }

  get aliveCount() { return this.enemies.filter((e) => e.alive).length; }

  pickCover(fromPos, playerPos, exclude = false) {
    let best = null, bestScore = -Infinity;
    for (const c of this.coverPoints) {
      const dP = c.distanceTo(playerPos);
      if (dP < 7 || dP > 38) continue;
      const dMe = c.distanceTo(fromPos);
      if (exclude && dMe < 4) continue;
      let taken = false;
      for (const e of this.enemies) {
        if (e.alive && e.pos.distanceTo(c) < 2.2) { taken = true; break; }
      }
      if (taken) continue;
      const score = -dMe * 0.6 - Math.abs(dP - 17) + rng() * 4;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  }

  startWave(n) {
    this.wave = n;
    this.pendingSpawns = Math.min(4 + n * 2, 14);
    this.spawnT = 1.2;
    if (this.onWave) this.onWave(n, this.pendingSpawns);
  }

  spawnOne(posOverride = null, variant = null) {
    const spawn = posOverride ?? this._pickSpawn();
    const e = new Enemy(this, spawn.clone(), variant ?? rng.int(0, 2));
    e.targetYaw = e.yaw = Math.atan2(this.playerPos.x - spawn.x, this.playerPos.z - spawn.z);
    this.enemies.push(e);
    return e;
  }

  _pickSpawn() {
    // Prefer spawns 25m+ from player and out of sight
    const candidates = [...this.spawnPoints].sort(() => rng() - 0.5);
    for (const s of candidates) {
      if (s.distanceTo(this.playerPos) > 24) return s;
    }
    return candidates[0];
  }

  onEnemyKilled(enemy) {
    if (this.onKill) this.onKill(enemy);
  }

  removeEnemy(enemy) {
    this.scene.remove(enemy.root);
    const i = this.enemies.indexOf(enemy);
    if (i >= 0) this.enemies.splice(i, 1);
  }

  damageInRadius(pos, radius, maxDmg, fling = true, cause = 'FRAG') {
    let kills = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = e.pos.distanceTo(pos);
      if (d < radius) {
        const dmg = maxDmg * (1 - (d / radius) * 0.7);
        const dir = e.pos.clone().sub(pos).normalize();
        const wasAlive = e.alive;
        e.health -= dmg;
        e.killCause = cause;
        if (e.health <= 0 && wasAlive) {
          e.die(dir, fling);
          kills++;
        } else {
          e.flinchT = 0.35;
        }
      }
    }
    return kills;
  }

  raycast(origin, dir, maxDist) {
    let best = null;
    for (const e of this.enemies) {
      const hit = e.raycast(origin, dir, maxDist);
      if (hit && (!best || hit.t < best.t)) {
        best = { ...hit, enemy: e };
      }
    }
    return best;
  }

  update(dt, playerPos, t) {
    this.playerPos.copy(playerPos);
    if (!this.frozen) {
      // Wave orchestration
      if (this.pendingSpawns > 0) {
        this.spawnT -= dt;
        if (this.spawnT <= 0 && this.aliveCount < this.maxAlive) {
          this.spawnT = 0.7 + rng() * 0.9;
          this.pendingSpawns--;
          this.spawnOne();
        }
      } else if (this.aliveCount === 0 && this.wave > 0) {
        this.waveBreakT -= dt;
        if (this.waveBreakT <= 0) {
          this.waveBreakT = 6;
          this.startWave(this.wave + 1);
        }
      }
    }
    for (const e of this.enemies) e.update(dt, playerPos, t);
  }
}
