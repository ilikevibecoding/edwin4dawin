import * as THREE from 'three';
import { CharacterRig, type RigProportions } from './CharacterRig';
import { attach, blasterCarbine, blasterPistol, boot, limb, plate, utilityBelt } from './parts';
import { box, cyl, merge, sphere } from '../geometry';
import { CHAR_MATS, cloth, emissive } from '../materials';
import { clamp01, damp, smoothstep } from '../../core/math';

/**
 * Concrete humanoid figures.
 *
 * These are deliberately stylised low-poly builds: the goal is an instantly
 * readable silhouette (helmet shape, shoulder line, hem length, colour block)
 * rather than surface detail that would never survive at cinematic distance.
 */

/** Shared armature dressing used by both trooper types. */
function buildBaseHuman(
  rig: CharacterRig,
  cfg: {
    suit: THREE.Material;
    torso: THREE.Material;
    limbs: THREE.Material;
    hands: THREE.Material;
    feet: THREE.Material;
    torsoWidth?: number;
    limbRadius?: number;
  },
): void {
  const j = rig.joints;
  const p = rig.p;
  const tw = cfg.torsoWidth ?? 1;
  const lr = cfg.limbRadius ?? 0.062;

  attach(
    j.hips,
    merge([
      box(0.3 * tw, 0.2, 0.19, { pos: [0, -0.03, 0] }),
      cyl(0.15 * tw, 0.14 * tw, 0.14, 12, { pos: [0, 0.05, 0] }),
    ]),
    cfg.suit,
    'pelvis',
  );

  attach(
    j.chest,
    merge([
      box(0.34 * tw, p.spine * 0.78, 0.2, { pos: [0, p.spine * 0.2, 0] }),
      cyl(0.17 * tw, 0.16 * tw, p.spine * 0.6, 12, { pos: [0, p.spine * 0.18, 0] }),
      box(0.4 * tw, 0.11, 0.19, { pos: [0, p.spine * 0.42, 0] }),
    ]),
    cfg.torso,
    'torso',
  );

  attach(j.neck, cyl(0.05, 0.055, 0.09, 8, { pos: [0, -0.02, 0] }), cfg.suit, 'neck');

  for (const side of ['L', 'R'] as const) {
    const shoulder = side === 'L' ? j.shoulderL : j.shoulderR;
    const elbow = side === 'L' ? j.elbowL : j.elbowR;
    const hand = side === 'L' ? j.handL : j.handR;
    attach(shoulder, limb(lr, p.upperArm, 0.9), cfg.limbs, `upperArm${side}`);
    attach(elbow, limb(lr * 0.9, p.foreArm, 0.88), cfg.limbs, `foreArm${side}`);
    attach(hand, sphere(lr * 0.95, 8, 6, { pos: [0, -0.03, 0.01] }), cfg.hands, `hand${side}`);
  }

  for (const side of ['L', 'R'] as const) {
    const hip = side === 'L' ? j.hipL : j.hipR;
    const knee = side === 'L' ? j.kneeL : j.kneeR;
    const ankle = side === 'L' ? j.ankleL : j.ankleR;
    attach(hip, limb(lr * 1.25, p.thigh, 0.86), cfg.limbs, `thigh${side}`);
    attach(knee, limb(lr * 1.05, p.shin, 0.82), cfg.limbs, `shin${side}`);
    attach(ankle, boot(1), cfg.feet, `foot${side}`);
  }
}

// ---------------------------------------------------------------------------
// Imperial stormtrooper
// ---------------------------------------------------------------------------

export class Stormtrooper extends CharacterRig {
  readonly muzzleNode = new THREE.Object3D();
  private flash: THREE.Mesh;
  private flashLight: THREE.PointLight;
  private flashTimer = 0;

  constructor(seed = 0) {
    super(
      'Imperial Stormtrooper',
      'Boarding infantry in sealed white composite armour. Sensor-blind at close quarters, relentless in the open.',
      { stiffness: 0.85, strideLength: 0.9, shoulderWidth: 0.23, headRadius: 0.13 } as Partial<RigProportions>,
      seed,
    );
    const j = this.joints;
    const armour = CHAR_MATS.trooperArmor();
    const under = CHAR_MATS.trooperUnder();
    const lens = CHAR_MATS.trooperLens();

    buildBaseHuman(this, {
      suit: under,
      torso: under,
      limbs: under,
      hands: under,
      feet: armour,
      torsoWidth: 1.05,
      limbRadius: 0.058,
    });

    // Armour shells over the undersuit.
    attach(
      j.chest,
      merge([
        box(0.4, 0.34, 0.26, { pos: [0, 0.3, 0.01] }),
        box(0.36, 0.16, 0.24, { pos: [0, 0.11, 0.01] }),
        box(0.3, 0.1, 0.22, { pos: [0, 0.42, 0.0] }),
        box(0.13, 0.09, 0.06, { pos: [0.1, 0.36, 0.13] }),
        box(0.13, 0.09, 0.06, { pos: [-0.1, 0.36, 0.13] }),
      ]),
      armour,
      'chestArmour',
    );
    attach(j.hips, merge([box(0.34, 0.15, 0.24, { pos: [0, 0.02, 0] })]), armour, 'hipArmour');
    const belt = utilityBelt(0.16, under);
    belt.position.y = 0.05;
    j.hips.add(belt);

    for (const side of ['L', 'R'] as const) {
      const shoulder = side === 'L' ? j.shoulderL : j.shoulderR;
      const elbow = side === 'L' ? j.elbowL : j.elbowR;
      const hip = side === 'L' ? j.hipL : j.hipR;
      const knee = side === 'L' ? j.kneeL : j.kneeR;
      attach(
        shoulder,
        merge([
          sphere(0.085, 10, 8, { pos: [0, 0.01, 0] }),
          plate(0.062, 0.05, 0.2, 1.28),
        ]),
        armour,
        `pauldron${side}`,
      );
      attach(elbow, plate(0.055, 0.02, 0.2, 1.3), armour, `forearmPlate${side}`);
      attach(hip, plate(0.07, 0.03, 0.26, 1.2), armour, `thighPlate${side}`);
      attach(knee, plate(0.061, 0.0, 0.34, 1.22), armour, `shinPlate${side}`);
      attach(knee, box(0.12, 0.1, 0.03, { pos: [0, -0.02, 0.08] }), armour, `kneePlate${side}`);
    }

    // Helmet — the single most identifying element.
    const helmet = merge([
      sphere(0.135, 16, 12, { pos: [0, 0.025, -0.005], scale: [1, 1.06, 1.07] }),
      box(0.2, 0.075, 0.1, { pos: [0, 0.055, 0.095] }),
      box(0.17, 0.14, 0.06, { pos: [0, -0.045, 0.115] }),
      box(0.2, 0.06, 0.12, { pos: [0, -0.115, 0.02] }),
      box(0.235, 0.09, 0.13, { pos: [0, -0.02, -0.04] }),
    ]);
    attach(j.head, helmet, armour, 'helmet');
    attach(
      j.head,
      merge([
        // Angled eye lenses and the vertical mouth vents.
        box(0.075, 0.058, 0.045, { pos: [0.058, 0.018, 0.125], rot: [0, 0, -0.28] }),
        box(0.075, 0.058, 0.045, { pos: [-0.058, 0.018, 0.125], rot: [0, 0, 0.28] }),
        box(0.115, 0.055, 0.04, { pos: [0, -0.055, 0.128] }),
        box(0.03, 0.05, 0.05, { pos: [0.085, -0.05, 0.1] }),
        box(0.03, 0.05, 0.05, { pos: [-0.085, -0.05, 0.1] }),
        box(0.16, 0.02, 0.03, { pos: [0, 0.075, 0.132] }),
      ]),
      lens,
      'visor',
    );

    // Weapon.
    const weapon = blasterCarbine(1);
    const gun = attach(j.handR, weapon.geometry, CHAR_MATS.blasterBody(), 'blaster');
    gun.position.set(0, -0.045, 0.03);
    gun.rotation.x = 1.35;
    this.muzzleNode.position.copy(weapon.muzzle);
    gun.add(this.muzzleNode);

    this.flash = new THREE.Mesh(
      sphere(0.07, 8, 6),
      new THREE.MeshBasicMaterial({
        color: 0xff6a4a,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.muzzleNode.add(this.flash);
    this.flashLight = new THREE.PointLight(0xff6a4a, 0, 4, 2);
    this.muzzleNode.add(this.flashLight);
  }

  override recoil(strength = 1): void {
    super.recoil(strength);
    this.flashTimer = 0.07;
  }

  override muzzlePosition(out: THREE.Vector3): THREE.Vector3 {
    this.muzzleNode.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(this.muzzleNode.matrixWorld);
  }

  protected override onUpdate(dt: number): void {
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    const f = clamp01(this.flashTimer / 0.07);
    (this.flash.material as THREE.MeshBasicMaterial).opacity = f;
    this.flash.scale.setScalar(0.7 + f * 0.9);
    this.flashLight.intensity = f * 6;
  }
}

// ---------------------------------------------------------------------------
// Rebel defender
// ---------------------------------------------------------------------------

export class RebelTrooper extends CharacterRig {
  readonly muzzleNode = new THREE.Object3D();
  private flash: THREE.Mesh;
  private flashLight: THREE.PointLight;
  private flashTimer = 0;

  constructor(seed = 0) {
    super(
      'Rebel Defender',
      'Ship security in a padded flight suit and open combat helmet. Outnumbered, holding a corridor they cannot win.',
      { stiffness: 1, strideLength: 0.86, headRadius: 0.115 },
      seed,
    );
    const j = this.joints;
    const jacket = CHAR_MATS.rebelJacket();
    const pants = CHAR_MATS.rebelPants();
    const vest = CHAR_MATS.rebelVest();
    const helm = CHAR_MATS.rebelHelmet();
    const skin = CHAR_MATS.skinMid();

    buildBaseHuman(this, {
      suit: pants,
      torso: jacket,
      limbs: jacket,
      hands: skin,
      feet: CHAR_MATS.trooperUnder(),
      torsoWidth: 0.98,
      limbRadius: 0.058,
    });

    // Legs read as separate trousers.
    for (const side of ['L', 'R'] as const) {
      const hip = side === 'L' ? j.hipL : j.hipR;
      const knee = side === 'L' ? j.kneeL : j.kneeR;
      attach(hip, plate(0.072, 0.02, 0.4, 1.06), pants, `trouser${side}`);
      attach(knee, plate(0.062, 0.0, 0.34, 1.06), pants, `calf${side}`);
    }

    // Flak vest with pouches — the strongest colour block on the figure.
    attach(
      j.chest,
      merge([
        box(0.37, 0.36, 0.24, { pos: [0, 0.26, 0.005] }),
        box(0.1, 0.09, 0.06, { pos: [0.11, 0.16, 0.12] }),
        box(0.1, 0.09, 0.06, { pos: [-0.11, 0.16, 0.12] }),
        box(0.12, 0.06, 0.05, { pos: [0, 0.36, 0.12] }),
      ]),
      vest,
      'vest',
    );
    const belt = utilityBelt(0.155, pants);
    belt.position.y = 0.04;
    j.hips.add(belt);

    // Head: visible face, distinctive brimmed helmet with side flaps.
    attach(j.head, sphere(0.108, 14, 10, { pos: [0, 0.0, 0.005], scale: [1, 1.1, 1.05] }), skin, 'head');
    attach(
      j.head,
      merge([
        sphere(0.128, 16, 10, { pos: [0, 0.03, -0.01], scale: [1, 0.92, 1.02] }),
        box(0.24, 0.05, 0.15, { pos: [0, 0.055, 0.045] }),
        box(0.055, 0.13, 0.13, { pos: [0.115, -0.04, -0.005] }),
        box(0.055, 0.13, 0.13, { pos: [-0.115, -0.04, -0.005] }),
        box(0.05, 0.11, 0.05, { pos: [0, 0.09, 0.1] }),
        box(0.16, 0.035, 0.04, { pos: [0, -0.02, 0.115] }),
      ]),
      helm,
      'helmet',
    );
    // Chin strap / comm bead.
    attach(
      j.head,
      merge([box(0.035, 0.03, 0.05, { pos: [0.115, -0.075, 0.045] })]),
      CHAR_MATS.trooperUnder(),
      'comm',
    );

    const weapon = blasterCarbine(0.95);
    const gun = attach(j.handR, weapon.geometry, CHAR_MATS.blasterBody(), 'blaster');
    gun.position.set(0, -0.045, 0.03);
    gun.rotation.x = 1.35;
    this.muzzleNode.position.copy(weapon.muzzle);
    gun.add(this.muzzleNode);

    this.flash = new THREE.Mesh(
      sphere(0.07, 8, 6),
      new THREE.MeshBasicMaterial({
        color: 0x8cff6a,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.muzzleNode.add(this.flash);
    this.flashLight = new THREE.PointLight(0x8cff6a, 0, 4, 2);
    this.muzzleNode.add(this.flashLight);
  }

  override recoil(strength = 1): void {
    super.recoil(strength);
    this.flashTimer = 0.07;
  }

  override muzzlePosition(out: THREE.Vector3): THREE.Vector3 {
    this.muzzleNode.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(this.muzzleNode.matrixWorld);
  }

  protected override onUpdate(dt: number): void {
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    const f = clamp01(this.flashTimer / 0.07);
    (this.flash.material as THREE.MeshBasicMaterial).opacity = f;
    this.flash.scale.setScalar(0.7 + f * 0.9);
    this.flashLight.intensity = f * 6;
  }
}

// ---------------------------------------------------------------------------
// The dark lord
// ---------------------------------------------------------------------------

export class DarkLord extends CharacterRig {
  private cape: THREE.Mesh;
  private capeBase: Float32Array;
  private saber: THREE.Group;
  private saberBlade: THREE.Mesh;
  private saberLight: THREE.PointLight;
  private chestLights: THREE.Mesh;
  private saberAmount = 0;
  private breathPhase = 0;

  constructor(seed = 0) {
    super(
      'The Dark Lord',
      'A towering armoured figure in a life-support shell. Every step is measured; the air changes temperature when he enters.',
      {
        hipHeight: 1.06,
        thigh: 0.49,
        shin: 0.47,
        ankle: 0.1,
        spine: 0.56,
        shoulderWidth: 0.25,
        headRadius: 0.135,
        upperArm: 0.32,
        foreArm: 0.3,
        stiffness: 0.62,
        strideLength: 1.02,
      },
      seed,
    );
    const j = this.joints;
    const black = CHAR_MATS.vaderBlack();
    const trim = CHAR_MATS.vaderTrim();
    const capeMat = cloth('vaderCape', 0x08080a, 0.9);

    buildBaseHuman(this, {
      suit: black,
      torso: black,
      limbs: black,
      hands: black,
      feet: black,
      torsoWidth: 1.15,
      limbRadius: 0.085,
    });

    // Broad armoured chest and shoulder mantle.
    attach(
      j.chest,
      merge([
        box(0.46, 0.42, 0.3, { pos: [0, 0.3, 0] }),
        box(0.52, 0.1, 0.32, { pos: [0, 0.48, 0] }),
        box(0.24, 0.2, 0.1, { pos: [0, 0.24, 0.16] }),
        box(0.1, 0.1, 0.06, { pos: [0.15, 0.1, 0.16] }),
        box(0.1, 0.1, 0.06, { pos: [-0.15, 0.1, 0.16] }),
      ]),
      black,
      'cuirass',
    );
    // Shoulder mantle: a stiff cowl that reads even in silhouette.
    const mantle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.24, 0.26, 16, 1, true),
      capeMat,
    );
    mantle.position.set(0, 0.44, 0);
    mantle.rotation.x = -0.08;
    mantle.castShadow = true;
    j.chest.add(mantle);

    this.chestLights = new THREE.Mesh(
      merge([
        box(0.03, 0.03, 0.02, { pos: [-0.06, 0.28, 0.215] }),
        box(0.03, 0.03, 0.02, { pos: [0, 0.28, 0.215] }),
        box(0.03, 0.03, 0.02, { pos: [0.06, 0.28, 0.215] }),
        box(0.14, 0.016, 0.02, { pos: [0, 0.21, 0.215] }),
      ]),
      emissive('vaderChest', 0xff3b2a, 2.6),
    );
    j.chest.add(this.chestLights);
    attach(
      j.chest,
      merge([
        box(0.2, 0.12, 0.03, { pos: [0, 0.29, 0.2] }),
        box(0.24, 0.05, 0.04, { pos: [0, 0.36, 0.2] }),
      ]),
      trim,
      'chestBox',
    );

    // Wide belt with rectangular boxes.
    attach(
      j.hips,
      merge([
        cyl(0.2, 0.2, 0.1, 14, { pos: [0, 0.07, 0] }),
        box(0.1, 0.08, 0.05, { pos: [0.13, 0.07, 0.17] }),
        box(0.1, 0.08, 0.05, { pos: [-0.13, 0.07, 0.17] }),
        box(0.12, 0.09, 0.05, { pos: [0, 0.07, 0.19] }),
      ]),
      trim,
      'belt',
    );

    // Helmet: dome, angled faceplate, triangular lenses, grille, rear flare.
    // Helmet: a compact dome, a forward-raked faceplate with a pronounced
    // brow and nose ridge, and a short flared neck skirt.
    attach(
      j.head,
      merge([
        sphere(0.132, 18, 14, { pos: [0, 0.028, -0.012], scale: [1, 1.04, 1.02] }),
        box(0.2, 0.052, 0.115, { pos: [0, 0.052, 0.062] }),
        box(0.152, 0.115, 0.075, { pos: [0, -0.008, 0.098], rot: [0.16, 0, 0] }),
        box(0.048, 0.135, 0.095, { pos: [0, 0.0, 0.108], rot: [0.1, 0, 0] }),
        box(0.118, 0.085, 0.062, { pos: [0, -0.088, 0.088], rot: [-0.3, 0, 0] }),
        cyl(0.128, 0.168, 0.115, 16, { pos: [0, -0.128, -0.012] }),
        box(0.068, 0.115, 0.07, { pos: [0.088, -0.022, 0.062], rot: [0, 0.42, 0] }),
        box(0.068, 0.115, 0.07, { pos: [-0.088, -0.022, 0.062], rot: [0, -0.42, 0] }),
      ]),
      black,
      'helmet',
    );
    attach(
      j.head,
      merge([
        box(0.058, 0.042, 0.028, { pos: [0.048, 0.022, 0.135], rot: [0.16, 0, -0.4] }),
        box(0.058, 0.042, 0.028, { pos: [-0.048, 0.022, 0.135], rot: [0.16, 0, 0.4] }),
        box(0.078, 0.036, 0.028, { pos: [0, -0.085, 0.118], rot: [-0.3, 0, 0] }),
        box(0.018, 0.045, 0.028, { pos: [0.05, -0.075, 0.112] }),
        box(0.018, 0.045, 0.028, { pos: [-0.05, -0.075, 0.112] }),
      ]),
      CHAR_MATS.trooperLens(),
      'faceplate',
    );

    // Cape: a curved sheet driven by a small vertex wave.
    const capeGeo = new THREE.PlaneGeometry(0.68, 1.42, 8, 12);
    const pos = capeGeo.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const t = (y + 0.71) / 1.42; // 0 at hem, 1 at shoulders
      const widen = 0.78 + (1 - t) * 0.5;
      pos.setX(i, x * widen);
      // Wrap around the back so it drapes instead of hanging like a board.
      pos.setZ(i, -0.14 - Math.pow(Math.abs(x) / 0.42, 2) * 0.3 * widen);
    }
    pos.needsUpdate = true;
    capeGeo.computeVertexNormals();
    this.capeBase = new Float32Array(pos.array as Float32Array);
    this.cape = new THREE.Mesh(capeGeo, capeMat);
    this.cape.position.set(0, 0.46 - 0.71, -0.05);
    this.cape.castShadow = true;
    this.cape.name = 'cape';
    j.chest.add(this.cape);

    // Lightsaber hilt on the belt; blade stays retracted unless summoned.
    this.saber = new THREE.Group();
    this.saber.position.set(0.2, 0.06, 0.05);
    this.saber.rotation.set(0, 0, -0.35);
    j.hips.add(this.saber);
    const hilt = new THREE.Mesh(
      merge([
        cyl(0.021, 0.021, 0.26, 10, { pos: [0, 0, 0] }),
        cyl(0.026, 0.026, 0.04, 10, { pos: [0, 0.11, 0] }),
        cyl(0.024, 0.024, 0.03, 10, { pos: [0, -0.1, 0] }),
        box(0.012, 0.06, 0.045, { pos: [0.022, 0.02, 0] }),
      ]),
      CHAR_MATS.vaderTrim(),
    );
    hilt.castShadow = true;
    this.saber.add(hilt);
    this.saberBlade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.021, 0.017, 1.15, 10),
      new THREE.MeshBasicMaterial({
        color: 0xff4030,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.saberBlade.position.y = 0.72;
    this.saberBlade.scale.y = 0.001;
    this.saberBlade.visible = false;
    this.saber.add(this.saberBlade);
    this.saberLight = new THREE.PointLight(0xff3a28, 0, 6, 2);
    this.saberLight.position.y = 0.7;
    this.saber.add(this.saberLight);
  }

  /** 0 = hilt only, 1 = fully extended blade. */
  setSaber(v: number): void {
    this.saberAmount = clamp01(v);
  }

  protected override onUpdate(dt: number, elapsed: number): void {
    // Cape sway: a travelling wave whose amplitude follows movement speed.
    const pos = this.cape.geometry.getAttribute('position');
    const sway = 0.02 + Math.min(0.09, this.speed * 0.06);
    for (let i = 0; i < pos.count; i++) {
      const bx = this.capeBase[i * 3];
      const by = this.capeBase[i * 3 + 1];
      const bz = this.capeBase[i * 3 + 2];
      const t = clamp01((0.71 - by) / 1.42);
      const w = Math.sin(elapsed * 2.1 + by * 3.4 + bx * 1.4) * sway * t * t;
      pos.setZ(i, bz - w - t * t * this.speed * 0.11);
      pos.setX(i, bx + w * 0.35);
    }
    pos.needsUpdate = true;

    // Respirator cadence: a slow chest rise every ~4 s.
    this.breathPhase += dt / 4.1;
    const b = Math.sin(this.breathPhase * Math.PI * 2);
    this.joints.chest.scale.set(1 + b * 0.007, 1 + b * 0.005, 1 + b * 0.008);
    (this.chestLights.material as THREE.MeshStandardMaterial).emissiveIntensity =
      2.2 + 1.2 * Math.max(0, b);

    const s = this.saberAmount;
    this.saberBlade.visible = s > 0.005;
    this.saberBlade.scale.y = Math.max(0.001, s);
    this.saberBlade.position.y = 0.13 + 0.58 * s;
    this.saberLight.intensity = s * 9;
    this.saberLight.position.y = 0.13 + 0.6 * s;
  }

  /** Breathing phase in 0..1, so the audio engine can lock to the animation. */
  get respiratorPhase(): number {
    return this.breathPhase % 1;
  }
}

// ---------------------------------------------------------------------------
// The princess
// ---------------------------------------------------------------------------

export class Princess extends CharacterRig {
  private gown: THREE.Mesh;
  private gownBase: Float32Array;
  private holdingData = false;
  private dataCard: THREE.Mesh;

  constructor(seed = 0) {
    super(
      'Princess Leia Organa',
      'A senator carrying stolen technical readouts. Small, composed, and the only person on board who knows what the data is worth.',
      {
        hipHeight: 0.86,
        thigh: 0.4,
        shin: 0.38,
        ankle: 0.08,
        spine: 0.45,
        shoulderWidth: 0.17,
        hipWidth: 0.09,
        headRadius: 0.105,
        upperArm: 0.25,
        foreArm: 0.24,
        stiffness: 0.5,
        strideLength: 0.66,
      },
      seed,
    );
    const j = this.joints;
    const white = CHAR_MATS.leiaWhite();
    const hair = CHAR_MATS.leiaHair();
    const skin = CHAR_MATS.skinLight();

    buildBaseHuman(this, {
      suit: white,
      torso: white,
      limbs: white,
      hands: skin,
      feet: white,
      torsoWidth: 0.82,
      limbRadius: 0.044,
    });

    // Long ceremonial gown replaces visible legs.
    const gownGeo = new THREE.CylinderGeometry(0.19, 0.36, 0.9, 18, 6, true);
    gownGeo.translate(0, -0.4, 0);
    const gpos = gownGeo.getAttribute('position');
    this.gownBase = new Float32Array(gpos.array as Float32Array);
    this.gown = new THREE.Mesh(gownGeo, cloth('leiaGown', 0xf6f4ee, 0.68));
    this.gown.castShadow = true;
    this.gown.receiveShadow = true;
    this.gown.name = 'gown';
    j.hips.add(this.gown);

    // Belt and high collar.
    attach(
      j.hips,
      merge([cyl(0.2, 0.2, 0.05, 16, { pos: [0, 0.06, 0] })]),
      CHAR_MATS.trooperUnder(),
      'sash',
    );
    attach(
      j.chest,
      merge([
        cyl(0.15, 0.12, 0.14, 14, { pos: [0, 0.42, 0] }),
        box(0.06, 0.3, 0.02, { pos: [0, 0.24, 0.1] }),
      ]),
      white,
      'collar',
    );

    // Head with the side-bun hairstyle.
    attach(j.head, sphere(0.1, 14, 12, { pos: [0, 0, 0.004], scale: [0.95, 1.1, 1] }), skin, 'head');
    attach(
      j.head,
      merge([
        sphere(0.108, 14, 12, { pos: [0, 0.022, -0.012], scale: [1, 1.02, 1] }),
        box(0.19, 0.055, 0.13, { pos: [0, 0.062, 0.028] }),
        sphere(0.062, 12, 10, { pos: [0.115, -0.012, 0], scale: [0.8, 1, 1] }),
        sphere(0.062, 12, 10, { pos: [-0.115, -0.012, 0], scale: [0.8, 1, 1] }),
        box(0.05, 0.12, 0.09, { pos: [0, -0.06, -0.075] }),
      ]),
      hair,
      'hair',
    );

    // The data card she carries between the console and the droid.
    this.dataCard = new THREE.Mesh(
      merge([
        box(0.07, 0.02, 0.11, { pos: [0, 0, 0] }),
        box(0.05, 0.024, 0.03, { pos: [0, 0, 0.045] }),
      ]),
      emissive('dataCard', 0x76d9ff, 1.4),
    );
    this.dataCard.position.set(0, -0.05, 0.04);
    this.dataCard.visible = false;
    j.handR.add(this.dataCard);
  }

  setHoldingData(v: boolean): void {
    this.holdingData = v;
    this.dataCard.visible = v;
  }

  get carryingData(): boolean {
    return this.holdingData;
  }

  /** World-space position of the carried data card. */
  dataCardPosition(out: THREE.Vector3): THREE.Vector3 {
    this.dataCard.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(this.dataCard.matrixWorld);
  }

  protected override onUpdate(_dt: number, elapsed: number): void {
    // Hem sway driven by speed and stride phase.
    const pos = this.gown.geometry.getAttribute('position');
    const amp = 0.012 + Math.min(0.05, this.speed * 0.05);
    for (let i = 0; i < pos.count; i++) {
      const bx = this.gownBase[i * 3];
      const by = this.gownBase[i * 3 + 1];
      const bz = this.gownBase[i * 3 + 2];
      const t = clamp01((-by) / 0.9);
      const w = Math.sin(elapsed * 2.6 + this.cyclePhase * Math.PI * 2 + bx * 2.2) * amp * t * t;
      pos.setX(i, bx + w * 0.6);
      pos.setZ(i, bz + w + t * t * this.speed * 0.05);
    }
    pos.needsUpdate = true;
    (this.dataCard.material as THREE.MeshStandardMaterial).emissiveIntensity =
      1.2 + 0.5 * Math.sin(elapsed * 5.5);
  }
}

// ---------------------------------------------------------------------------
// Unarmed ship officer (background dressing for the corridor)
// ---------------------------------------------------------------------------

export class ShipOfficer extends CharacterRig {
  readonly muzzleNode = new THREE.Object3D();

  constructor(seed = 0) {
    super(
      'Rebel Officer',
      'Bridge crew pressed into the defence of the corridor with a sidearm and no armour.',
      { stiffness: 0.95, strideLength: 0.84 },
      seed,
    );
    const j = this.joints;
    buildBaseHuman(this, {
      suit: CHAR_MATS.rebelPants(),
      torso: CHAR_MATS.rebelVest(),
      limbs: CHAR_MATS.rebelJacket(),
      hands: CHAR_MATS.skinLight(),
      feet: CHAR_MATS.trooperUnder(),
      torsoWidth: 0.95,
      limbRadius: 0.055,
    });
    attach(j.head, sphere(0.105, 14, 10, { pos: [0, 0, 0.004], scale: [1, 1.1, 1.03] }), CHAR_MATS.skinLight(), 'head');
    attach(
      j.head,
      merge([
        sphere(0.112, 14, 10, { pos: [0, 0.03, -0.02], scale: [1, 0.85, 1] }),
        box(0.16, 0.04, 0.06, { pos: [0, 0.03, 0.09] }),
      ]),
      CHAR_MATS.leiaHair(),
      'hair',
    );
    const weapon = blasterPistol(1);
    const gun = attach(j.handR, weapon.geometry, CHAR_MATS.blasterBody(), 'sidearm');
    gun.position.set(0, -0.04, 0.02);
    gun.rotation.x = 1.35;
    this.muzzleNode.position.copy(weapon.muzzle);
    gun.add(this.muzzleNode);
  }

  override muzzlePosition(out: THREE.Vector3): THREE.Vector3 {
    this.muzzleNode.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(this.muzzleNode.matrixWorld);
  }
}

export { smoothstep, damp };
