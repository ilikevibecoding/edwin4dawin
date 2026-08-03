/**
 * The human cast.
 *
 * Every figure is built from primitives on the shared rig. Recognisability is
 * carried entirely by silhouette, palette and posture:
 *
 *   Rebel trooper — open-face domed helmet with a neck flap, tan flak vest
 *                   over a blue-grey jumpsuit, wide utility belt.
 *   Stormtrooper  — segmented white armour over a black bodyglove, and the
 *                   distinctive helmet: brow ridge, dark lenses, vented frown.
 *   Vader         — tall, entirely black, flared helmet and faceplate, chest
 *                   control panel, wide belt, long cape.
 *   Leia          — floor-length white gown, white bodice, side-coiled hair.
 *
 * Torso geometry is attached to the `spine` and `chest` joints rather than to
 * the pelvis, so the body actually deforms when a figure twists, leans or
 * takes a hit.
 */

import * as THREE from 'three';
import { Figure, HUMAN, type FigureOptions } from './figure';
import { limb, ball, boot, glove, blasterCarbine, blasterPistol, Lightsabre, type Weapon } from './parts';
import { paintMaterial, clothMaterial, metalMaterial, emissiveMaterial, glassMaterial, PALETTE } from '../assets/materials';
import { roundedBox } from '../assets/geometry';

export interface HumanOptions extends FigureOptions {
  weaponColor?: string;
}

/**
 * A stylised face.
 *
 * Deliberately reductive: a shaded brow, two recessed eye slots, a nose plane
 * and a soft mouth line. Protruding eyeballs on a low-poly head read as googly
 * cartoon eyes the moment the camera gets close, so everything here is set
 * *into* the face rather than onto it, and nothing is brighter than the skin.
 */
function addFace(
  head: THREE.Object3D,
  skin: THREE.Material,
  opts: { depth: number; eyeY: number; scale?: number; hairMat?: THREE.Material },
): void {
  const s = opts.scale ?? 1;
  const socketMat = paintMaterial('faceSocket', '#6b4f40', 0.95, 0);
  const eyeMat = paintMaterial('faceEye', '#241a15', 0.7, 0);
  const mouthMat = paintMaterial('faceMouth', '#7a5245', 0.9, 0);

  // Brow shelf: one slab across both eyes, sitting just proud of the face so
  // it casts the eyes into shadow at any lighting angle.
  const brow = new THREE.Mesh(roundedBox(0.104 * s, 0.018 * s, 0.026 * s, 0.007 * s), skin);
  brow.position.set(0, opts.eyeY + 0.023 * s, -opts.depth - 0.001);
  head.add(brow);
  if (opts.hairMat) {
    const brows = new THREE.Mesh(new THREE.BoxGeometry(0.088 * s, 0.006 * s, 0.005 * s), opts.hairMat);
    brows.position.set(0, opts.eyeY + 0.024 * s, -opts.depth - 0.013 * s);
    head.add(brows);
  }

  for (const side of [-1, 1]) {
    // Recess first, pupil inside it: the slot never catches a specular hit.
    const socket = new THREE.Mesh(roundedBox(0.036 * s, 0.017 * s, 0.012 * s, 0.005 * s), socketMat);
    socket.position.set(side * 0.034 * s, opts.eyeY, -opts.depth + 0.008 * s);
    head.add(socket);
    const eye = new THREE.Mesh(roundedBox(0.022 * s, 0.011 * s, 0.008 * s, 0.004 * s), eyeMat);
    eye.position.set(side * 0.034 * s, opts.eyeY - 0.001 * s, -opts.depth + 0.005 * s);
    head.add(eye);
  }

  const nose = new THREE.Mesh(roundedBox(0.02 * s, 0.036 * s, 0.02 * s, 0.007 * s), skin);
  nose.position.set(0, opts.eyeY - 0.025 * s, -opts.depth - 0.001);
  head.add(nose);
  const mouth = new THREE.Mesh(roundedBox(0.034 * s, 0.007 * s, 0.008 * s, 0.003 * s), mouthMat);
  mouth.position.set(0, opts.eyeY - 0.058 * s, -opts.depth + 0.004 * s);
  head.add(mouth);
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);
/** Weapon orientation in the hand when nobody is aiming: muzzle toward the deck. */
const REST_GRIP = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const _handQ = new THREE.Quaternion();
const _handP = new THREE.Vector3();
const _aimQ = new THREE.Quaternion();
const _lookM = new THREE.Matrix4();
const _carry = new THREE.Vector3();

/** Common plumbing: a weapon socketed into the right hand. */
abstract class ArmedFigure extends Figure {
  protected weapon: Weapon | null = null;

  /**
   * Socket a weapon into the right hand.
   *
   * The rig hangs each limb down its own −Y, and the aim pose pitches the arm
   * forward by very nearly π/2, so rotating the weapon −π/2 about X lays the
   * barrel along the forearm: pointing at the target when aiming, and at the
   * deck when the arm is down. Getting this wrong is what makes procedural
   * soldiers appear to fire over their own shoulders.
   */
  protected attachWeapon(w: Weapon, offset = new THREE.Vector3(0.012, -0.05, -0.015)): void {
    this.weapon = w;
    w.group.position.copy(offset);
    w.group.quaternion.copy(REST_GRIP);
    this.joints.handR.add(w.group);
  }

  /** World position and direction the next bolt should leave from. */
  muzzleWorld(outPos: THREE.Vector3, outDir: THREE.Vector3): boolean {
    if (!this.weapon || !this.weapon.group.visible) return false;
    this.weapon.muzzle.getWorldPosition(outPos);
    outDir
      .set(0, 0, -1)
      .applyQuaternion(this.weapon.group.getWorldQuaternion(new THREE.Quaternion()))
      .normalize();
    return true;
  }

  fire(): void {
    this.weapon?.flash(true);
    this.firePulse = 1;
  }

  protected override poseExtra(dt: number, _elapsed: number): void {
    this.weapon?.update(dt);
    this.aimWeapon();
  }

  /**
   * Swing the weapon in the hand so the barrel lines up with the target.
   *
   * The arm pose is authored for silhouette, not for ballistics; letting the
   * wrist take up the small residual error means the muzzle is always where
   * the bolts actually come from, at any body angle.
   */
  private aimWeapon(): void {
    const w = this.weapon;
    if (!w) return;
    const hand = this.joints.handR;
    hand.getWorldQuaternion(_handQ);
    hand.getWorldPosition(_handP);
    let target = this.aimTarget;
    if (!target || this.aimBlend < 0.02) {
      // Carry position: muzzle forward and down, relative to the body rather
      // than the hand, so a swinging arm does not wave the barrel skyward.
      _carry.set(0, -0.55, -1.4).applyEuler(this.group.rotation).add(_handP);
      target = _carry;
    }
    _lookM.lookAt(_handP, target, WORLD_UP);
    // lookAt puts +Z along (eye − target), so local −Z lands on the target —
    // and −Z is the barrel axis.
    _aimQ.setFromRotationMatrix(_lookM).premultiply(_handQ.invert());
    w.group.quaternion.copy(_aimQ);
  }

  setWeaponVisible(v: boolean): void {
    if (this.weapon) this.weapon.group.visible = v;
  }

  get hasWeapon(): boolean {
    return !!this.weapon && this.weapon.group.visible;
  }
}

/* ------------------------------------------------------------------ rebel */

export class RebelTrooper extends ArmedFigure {
  constructor(o: HumanOptions = {}) {
    super({ ...o, proportions: { ...HUMAN, height: 1.77, ...(o.proportions ?? {}) } });
    this.group.name = 'RebelTrooper';
    const j = this.joints;
    const p = this.p;

    const suit = paintMaterial('rebelSuit', PALETTE.rebelUniform, 0.85, 0);
    const vest = paintMaterial('rebelVest', PALETTE.rebelVest, 0.8, 0);
    const leather = paintMaterial('rebelLeather', '#2e2820', 0.7, 0.05);
    const helmetMat = paintMaterial('rebelHelmet', '#333a46', 0.55, 0.15);
    const skin = paintMaterial('skin', '#b98c6d', 0.72, 0);

    // Abdomen on the spine, chest and vest on the chest joint.
    const abdomen = new THREE.Mesh(roundedBox(0.32, 0.3, 0.2, 0.07, 3), suit);
    abdomen.position.y = 0.14;
    j.spine.add(abdomen);
    const chest = new THREE.Mesh(roundedBox(0.36, 0.3, 0.215, 0.075, 3), suit);
    chest.position.y = 0.13;
    j.chest.add(chest);
    const vestMesh = new THREE.Mesh(roundedBox(0.375, 0.34, 0.245, 0.06, 3), vest);
    vestMesh.position.y = 0.08;
    j.chest.add(vestMesh);
    const vestSkirt = new THREE.Mesh(roundedBox(0.35, 0.14, 0.225, 0.05), vest);
    vestSkirt.position.y = 0.2;
    j.spine.add(vestSkirt);

    const belt = new THREE.Mesh(roundedBox(0.36, 0.075, 0.23, 0.03), leather);
    belt.position.y = 0.03;
    j.pelvis.add(belt);
    const hips = new THREE.Mesh(roundedBox(0.3, 0.16, 0.2, 0.06), suit);
    hips.position.y = -0.02;
    j.pelvis.add(hips);
    for (const s of [-1, 1]) {
      const pouch = new THREE.Mesh(roundedBox(0.075, 0.09, 0.06, 0.02), leather);
      pouch.position.set(s * 0.13, 0.01, -0.12);
      j.pelvis.add(pouch);
    }

    // Neck column bridges chest to head.
    const neckCol = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.058, 0.13, 10), skin);
    neckCol.position.y = 0.03;
    j.neck.add(neckCol);

    // Head and the distinctive domed helmet with its neck flap.
    const head = new THREE.Mesh(roundedBox(0.165, 0.205, 0.185, 0.075, 3), skin);
    head.position.y = 0.095;
    j.head.add(head);
    addFace(j.head, skin, { depth: 0.093, eyeY: 0.115, hairMat: paintMaterial('rebelHair', '#3a2a1e', 0.9, 0) });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.108, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), helmetMat);
    dome.position.y = 0.125;
    dome.scale.set(1.1, 1.02, 1.16);
    j.head.add(dome);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.113, 0.015, 6, 18), helmetMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.122;
    rim.scale.set(1.09, 1.16, 1);
    j.head.add(rim);
    const flap = new THREE.Mesh(roundedBox(0.19, 0.14, 0.05, 0.03), helmetMat);
    flap.position.set(0, 0.06, 0.1);
    flap.rotation.x = -0.16;
    j.head.add(flap);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.007, 5, 14), leather);
    strap.rotation.y = Math.PI / 2;
    strap.position.y = 0.06;
    strap.scale.set(1, 1.2, 1);
    j.head.add(strap);

    // Limbs.
    for (const side of [-1, 1] as const) {
      const upper = side < 0 ? j.upperArmL : j.upperArmR;
      const fore = side < 0 ? j.forearmL : j.forearmR;
      const hand = side < 0 ? j.handL : j.handR;
      upper.add(ball(0.056, vest));
      upper.add(limb(p.upperArm, 0.05, 0.042, suit));
      fore.add(limb(p.forearm, 0.042, 0.036, suit));
      hand.add(glove(leather));

      const thigh = side < 0 ? j.thighL : j.thighR;
      const shin = side < 0 ? j.shinL : j.shinR;
      const foot = side < 0 ? j.footL : j.footR;
      thigh.add(limb(p.thigh, 0.078, 0.058, suit));
      shin.add(limb(p.shin, 0.055, 0.042, suit));
      foot.add(boot(leather));
    }

    this.attachWeapon(blasterCarbine(o.weaponColor ?? PALETTE.laserBlue, 0.95));
  }
}

/* ----------------------------------------------------------- stormtrooper */

export class Stormtrooper extends ArmedFigure {
  constructor(o: HumanOptions = {}) {
    super({ ...o, proportions: { ...HUMAN, height: 1.83, ...(o.proportions ?? {}) } });
    this.group.name = 'Stormtrooper';
    const j = this.joints;
    const p = this.p;

    const armour = paintMaterial('tkArmour', PALETTE.stormtrooperWhite, 0.3, 0.05);
    const under = paintMaterial('tkUnder', '#15171a', 0.8, 0.08);
    const lens = glassMaterial('tkLens', '#05080c', 0.96);
    const trim = paintMaterial('tkTrim', '#191b1f', 0.5, 0.2);

    // Bodyglove core through the whole torso, plates layered on top.
    const core = new THREE.Mesh(roundedBox(0.3, 0.34, 0.19, 0.07, 3), under);
    core.position.y = 0.13;
    j.spine.add(core);
    const abs = new THREE.Mesh(roundedBox(0.33, 0.13, 0.215, 0.045), armour);
    abs.position.y = 0.05;
    j.spine.add(abs);
    const abs2 = new THREE.Mesh(roundedBox(0.315, 0.1, 0.205, 0.04), armour);
    abs2.position.y = 0.19;
    j.spine.add(abs2);

    const chestPlate = new THREE.Mesh(roundedBox(0.38, 0.3, 0.24, 0.08, 3), armour);
    chestPlate.position.y = 0.12;
    j.chest.add(chestPlate);
    const collarPlate = new THREE.Mesh(roundedBox(0.28, 0.07, 0.2, 0.03), armour);
    collarPlate.position.y = 0.27;
    j.chest.add(collarPlate);

    const beltPlate = new THREE.Mesh(roundedBox(0.36, 0.09, 0.24, 0.03), armour);
    beltPlate.position.y = 0.02;
    j.pelvis.add(beltPlate);
    const buckle = new THREE.Mesh(roundedBox(0.09, 0.06, 0.03, 0.012), trim);
    buckle.position.set(0, 0.02, -0.125);
    j.pelvis.add(buckle);
    const hipShell = new THREE.Mesh(roundedBox(0.32, 0.16, 0.21, 0.06), armour);
    hipShell.position.y = -0.05;
    j.pelvis.add(hipShell);
    for (const s of [-1, 1]) {
      const hipPlate = new THREE.Mesh(roundedBox(0.12, 0.15, 0.13, 0.045), armour);
      hipPlate.position.set(s * 0.12, -0.07, -0.01);
      j.pelvis.add(hipPlate);
    }

    // Neck seal.
    const neckSeal = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.07, 0.14, 10), under);
    neckSeal.position.y = 0.03;
    j.neck.add(neckSeal);

    // Helmet: dome, brow ridge, dark lenses, vocoder and the vented frown.
    const helmet = new THREE.Mesh(roundedBox(0.185, 0.23, 0.215, 0.085, 4), armour);
    helmet.position.y = 0.1;
    j.head.add(helmet);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.099, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), armour);
    crown.position.y = 0.175;
    crown.scale.set(0.96, 0.75, 1.06);
    j.head.add(crown);
    const brow = new THREE.Mesh(roundedBox(0.185, 0.032, 0.035, 0.012), trim);
    brow.position.set(0, 0.168, -0.099);
    j.head.add(brow);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(roundedBox(0.058, 0.05, 0.03, 0.018), lens);
      eye.position.set(s * 0.047, 0.128, -0.105);
      eye.rotation.y = s * 0.14;
      j.head.add(eye);
    }
    const vocoder = new THREE.Mesh(roundedBox(0.048, 0.08, 0.035, 0.012), trim);
    vocoder.position.set(0, 0.085, -0.106);
    j.head.add(vocoder);
    const frown = new THREE.Mesh(roundedBox(0.11, 0.026, 0.02, 0.008), trim);
    frown.position.set(0, 0.036, -0.102);
    j.head.add(frown);
    for (const s of [-1, 1]) {
      const cheekVent = new THREE.Mesh(roundedBox(0.028, 0.05, 0.02, 0.008), trim);
      cheekVent.position.set(s * 0.073, 0.068, -0.093);
      cheekVent.rotation.y = s * 0.4;
      j.head.add(cheekVent);
    }
    const tube = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.009, 5, 16), trim);
    tube.rotation.x = Math.PI / 2;
    tube.position.y = 0.012;
    tube.scale.set(1.05, 1.1, 1);
    j.head.add(tube);

    // Limbs: white plates over the black bodyglove.
    for (const side of [-1, 1] as const) {
      const upper = side < 0 ? j.upperArmL : j.upperArmR;
      const fore = side < 0 ? j.forearmL : j.forearmR;
      const hand = side < 0 ? j.handL : j.handR;
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), armour);
      pauldron.scale.set(1, 0.92, 1);
      upper.add(pauldron);
      upper.add(limb(p.upperArm * 0.9, 0.05, 0.042, armour));
      upper.add(ball(0.043, under, -p.upperArm));
      fore.add(limb(p.forearm * 0.92, 0.046, 0.038, armour));
      hand.add(glove(under));

      const thigh = side < 0 ? j.thighL : j.thighR;
      const shin = side < 0 ? j.shinL : j.shinR;
      const foot = side < 0 ? j.footL : j.footR;
      thigh.add(limb(p.thigh * 0.94, 0.08, 0.058, armour));
      thigh.add(ball(0.05, under, -p.thigh));
      shin.add(limb(p.shin * 0.94, 0.061, 0.048, armour));
      const kneePlate = new THREE.Mesh(roundedBox(0.1, 0.09, 0.06, 0.025), armour);
      kneePlate.position.set(0, -0.06, -0.045);
      shin.add(kneePlate);
      foot.add(boot(armour, 1.05));
    }

    this.attachWeapon(blasterCarbine(o.weaponColor ?? PALETTE.laserRed, 1));
  }
}

/* ------------------------------------------------------------------ Vader */

export class DarkLord extends ArmedFigure {
  readonly sabre: Lightsabre;
  private cape: THREE.Mesh;
  private capeGeo: THREE.PlaneGeometry;
  private capeBase: Float32Array;
  private breathMat: THREE.MeshStandardMaterial;
  private chestLamps: THREE.MeshStandardMaterial[] = [];
  private capePhase = 0;
  /** Rises and falls with the respirator; the audio engine reads it. */
  breathPhase = 0;

  constructor(o: HumanOptions = {}) {
    super({
      ...o,
      // Deliberately the tallest figure in the piece.
      proportions: {
        ...HUMAN,
        height: 2.03,
        hipHeight: 1.05,
        thigh: 0.5,
        shin: 0.5,
        spine: 0.32,
        chest: 0.3,
        neck: 0.1,
        shoulderWidth: 0.235,
        upperArm: 0.33,
        forearm: 0.31,
        stride: 0.78,
        walkSpeed: 1.05,
        ...(o.proportions ?? {}),
      },
      tempo: 0.55,
    });
    this.group.name = 'DarkLord';
    const j = this.joints;
    const p = this.p;

    // Vader reads almost entirely through specular highlights, so the blacks
    // are lifted slightly and the armour given a hard, glossy response.
    const black = paintMaterial('vaderBlack', '#1b1d22', 0.4, 0.3);
    const gloss = paintMaterial('vaderGloss', '#16181d', 0.13, 0.55);
    const leather = paintMaterial('vaderLeather', '#191b20', 0.66, 0.12);
    const silver = metalMaterial('vaderSilver', '#8f959c', 0.3, 0.92);
    this.breathMat = emissiveMaterial('vaderChest', '#ff3b25', 0.5).clone();

    // Torso.
    const abdomen = new THREE.Mesh(roundedBox(0.34, 0.34, 0.23, 0.08, 3), black);
    abdomen.position.y = 0.16;
    j.spine.add(abdomen);
    const chestShell = new THREE.Mesh(roundedBox(0.42, 0.34, 0.26, 0.085, 3), black);
    chestShell.position.y = 0.14;
    j.chest.add(chestShell);

    // Chest control panel — on the front, where the audience can read it.
    const chestBox = new THREE.Mesh(roundedBox(0.21, 0.155, 0.09, 0.02), gloss);
    chestBox.position.set(0, 0.16, -0.135);
    j.chest.add(chestBox);
    // Kept below the bloom threshold. Six saturated lamps at bloom strength on
    // a black chest turn into a television set at any distance under five
    // metres, which is exactly the distance his entrance is shot from.
    const lampColours = ['#ff3b25', '#ff5a3a', '#4aa3ff', '#7dff9a', '#dfe6f0', '#ff3b25'];
    for (let i = 0; i < 6; i++) {
      const m = emissiveMaterial(`vaderLamp${i}`, lampColours[i], 0.5).clone();
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.014, 0.01), m);
      lamp.position.set(-0.062 + (i % 3) * 0.062, 0.19 - Math.floor(i / 3) * 0.04, -0.181);
      j.chest.add(lamp);
      this.chestLamps.push(m);
    }
    // Etched keypad squares so the panel is not just six lights on a void.
    const keyMat = metalMaterial('vaderKeys', '#3c4046', 0.5, 0.7);
    for (let i = 0; i < 4; i++) {
      const key = new THREE.Mesh(roundedBox(0.026, 0.012, 0.008, 0.003), keyMat);
      key.position.set(-0.048 + i * 0.032, 0.116, -0.181);
      j.chest.add(key);
    }
    const chestVent = new THREE.Mesh(roundedBox(0.14, 0.038, 0.05, 0.012), silver);
    chestVent.position.set(0, 0.062, -0.145);
    j.chest.add(chestVent);

    // Shoulder mantle.
    for (const s of [-1, 1]) {
      const mantle = new THREE.Mesh(roundedBox(0.17, 0.1, 0.26, 0.04), gloss);
      mantle.position.set(s * 0.2, 0.29, 0);
      mantle.rotation.z = s * 0.24;
      j.chest.add(mantle);
    }

    // Wide belt with boxes, and the front/back skirt panels.
    const belt = new THREE.Mesh(roundedBox(0.44, 0.11, 0.29, 0.03), leather);
    belt.position.y = 0.04;
    j.pelvis.add(belt);
    const beltBox = metalMaterial('vaderBeltBox', '#4c5157', 0.42, 0.85);
    for (let i = -1; i <= 1; i++) {
      const box = new THREE.Mesh(roundedBox(0.08, 0.075, 0.05, 0.012), beltBox);
      box.position.set(i * 0.115, 0.04, -0.155);
      j.pelvis.add(box);
    }
    const hips = new THREE.Mesh(roundedBox(0.36, 0.18, 0.25, 0.07), black);
    hips.position.y = -0.04;
    j.pelvis.add(hips);
    // A short tunic skirt, not a full-length apron: the legs must read.
    for (const z of [-1, 1]) {
      const panel = new THREE.Mesh(roundedBox(0.26, 0.3, 0.035, 0.02), leather);
      panel.position.set(0, -0.13, z * 0.13);
      panel.rotation.x = z * 0.08;
      j.pelvis.add(panel);
    }
    for (const s2 of [-1, 1]) {
      const side = new THREE.Mesh(roundedBox(0.035, 0.28, 0.22, 0.02), leather);
      side.position.set(s2 * 0.15, -0.12, 0);
      j.pelvis.add(side);
    }

    // Neck: a thick armoured column so the helmet never floats.
    const neckCol = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.16, 12), leather);
    neckCol.position.y = 0.03;
    j.neck.add(neckCol);

    // Helmet: dome, flared skirt, angular faceplate, triangular respirator.
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.125, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), gloss);
    dome.position.y = 0.12;
    dome.scale.set(1.02, 1.2, 1.06);
    j.head.add(dome);
    const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.126, 0.158, 0.13, 16, 1, true), gloss);
    flare.position.y = 0.055;
    j.head.add(flare);
    const face = new THREE.Mesh(roundedBox(0.155, 0.21, 0.14, 0.035, 3), gloss);
    face.position.set(0, 0.115, -0.05);
    j.head.add(face);
    const browRidge = new THREE.Mesh(roundedBox(0.172, 0.05, 0.055, 0.015), black);
    browRidge.position.set(0, 0.19, -0.096);
    browRidge.rotation.x = 0.2;
    j.head.add(browRidge);
    const lensMat = glassMaterial('vaderLens', '#0c1014', 0.98);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(roundedBox(0.056, 0.052, 0.03, 0.02), lensMat);
      eye.position.set(s * 0.043, 0.143, -0.112);
      eye.rotation.z = s * -0.22;
      j.head.add(eye);
    }
    // Respirator triangle, apex down.
    const grille = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.052, 0.05, 3), silver);
    grille.rotation.x = Math.PI / 2;
    grille.rotation.z = Math.PI;
    grille.position.set(0, 0.056, -0.104);
    j.head.add(grille);
    const grilleGlow = new THREE.Mesh(new THREE.CircleGeometry(0.03, 3), this.breathMat);
    grilleGlow.position.set(0, 0.056, -0.131);
    grilleGlow.rotation.z = Math.PI;
    j.head.add(grilleGlow);
    for (const s of [-1, 1]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.115, 8), silver);
      tube.position.set(s * 0.083, 0.09, -0.066);
      tube.rotation.x = 0.16;
      j.head.add(tube);
    }
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.115, 0.08, 12), leather);
    collar.position.y = -0.02;
    j.head.add(collar);

    // Limbs.
    for (const side of [-1, 1] as const) {
      const upper = side < 0 ? j.upperArmL : j.upperArmR;
      const fore = side < 0 ? j.forearmL : j.forearmR;
      const hand = side < 0 ? j.handL : j.handR;
      upper.add(ball(0.068, gloss));
      upper.add(limb(p.upperArm, 0.058, 0.048, black));
      fore.add(limb(p.forearm, 0.05, 0.042, black));
      const cuff = new THREE.Mesh(roundedBox(0.105, 0.085, 0.095, 0.02), gloss);
      cuff.position.y = -p.forearm + 0.025;
      fore.add(cuff);
      hand.add(glove(gloss, 1.15));

      const thigh = side < 0 ? j.thighL : j.thighR;
      const shin = side < 0 ? j.shinL : j.shinR;
      const foot = side < 0 ? j.footL : j.footR;
      thigh.add(limb(p.thigh, 0.09, 0.065, black));
      shin.add(limb(p.shin, 0.065, 0.052, black));
      foot.add(boot(gloss, 1.2));
    }

    // Cape: hangs from the shoulder line to just above the deck, animated by a
    // travelling wave. Cheap, and it is what sells the walk.
    this.capeGeo = new THREE.PlaneGeometry(0.52, 1.62, 8, 16);
    this.capeBase = Float32Array.from(this.capeGeo.attributes.position.array as Float32Array);
    const capeMat = clothMaterial('vaderCape', '#101216', 0.95);
    this.cape = new THREE.Mesh(this.capeGeo, capeMat);
    this.cape.position.set(0, -0.19, 0.16);
    this.cape.castShadow = true;
    j.pelvis.add(this.cape);

    this.sabre = new Lightsabre('#ff3a2a', 1.05);
    this.sabre.group.position.set(0.02, -0.09, -0.02);
    this.sabre.group.rotation.set(1.4, 0, 0);
    j.handR.add(this.sabre.group);
    this.setWeaponVisible(false);
  }

  protected override poseExtra(dt: number, elapsed: number): void {
    super.poseExtra(dt, elapsed);
    this.sabre.update(dt, elapsed);

    // Respirator rhythm — an original ~4.4 s cycle, not a sampled recording.
    this.breathPhase = (elapsed % 4.4) / 4.4;
    const inhale = Math.max(0, Math.sin(this.breathPhase * Math.PI * 2));
    this.breathMat.emissiveIntensity = 0.45 + inhale * 0.85;
    for (let i = 0; i < this.chestLamps.length; i++) {
      this.chestLamps[i].emissiveIntensity = 0.4 + 0.42 * (0.5 + 0.5 * Math.sin(elapsed * (1.1 + i * 0.27) + i));
    }
    // The chest slowly rises and falls with the machine, not with him.
    this.joints.chest.rotation.x -= inhale * 0.018;

    // Cape: gravity plus a travelling wave whose amplitude follows walk speed.
    this.capePhase += dt * (1.4 + this.speed * 2.2);
    const pos = this.capeGeo.attributes.position as THREE.BufferAttribute;
    const amp = 0.02 + this.speed * 0.055;
    for (let i = 0; i < pos.count; i++) {
      const bx = this.capeBase[i * 3];
      const by = this.capeBase[i * 3 + 1];
      const v = (by + 0.81) / 1.62; // 0 at the hem, 1 at the shoulders
      const droop = (1 - v) * (1 - v);
      const wave = Math.sin(this.capePhase * 2.1 - (1 - v) * 5.2 + bx * 2.4) * amp * droop;
      const flare = (1 - v) * (0.05 + this.speed * 0.09);
      pos.setXYZ(i, bx * (1 + (1 - v) * 0.42), by, wave + droop * 0.1 + flare);
    }
    pos.needsUpdate = true;
    this.capeGeo.computeVertexNormals();
    this.cape.rotation.x = -this.joints.spine.rotation.x * 0.6;
  }
}

/* ------------------------------------------------------------------- Leia */

export class Princess extends ArmedFigure {
  private gown: THREE.Mesh;
  private gownGeo: THREE.CylinderGeometry;
  private gownBase: Float32Array;
  private gownPhase = 0;

  constructor(o: HumanOptions = {}) {
    super({
      ...o,
      proportions: {
        ...HUMAN,
        height: 1.63,
        hipHeight: 0.86,
        thigh: 0.4,
        shin: 0.4,
        spine: 0.25,
        chest: 0.23,
        neck: 0.08,
        shoulderWidth: 0.165,
        upperArm: 0.26,
        forearm: 0.24,
        hipWidth: 0.095,
        stride: 0.6,
        walkSpeed: 1.25,
        ...(o.proportions ?? {}),
      },
    });
    this.group.name = 'Princess';
    const j = this.joints;
    const p = this.p;

    const white = clothMaterial('leiaGown', PALETTE.leiaWhite, 0.88);
    const whiteSolid = paintMaterial('leiaBodice', '#f6f4ef', 0.7, 0);
    const hair = paintMaterial('leiaHair', '#33231a', 0.84, 0.02);
    const skin = paintMaterial('leiaSkin', '#e2b795', 0.68, 0);
    const beltMat = metalMaterial('leiaBelt', '#c9ccd1', 0.35, 0.85);

    const abdomen = new THREE.Mesh(roundedBox(0.26, 0.3, 0.175, 0.07, 3), whiteSolid);
    abdomen.position.y = 0.1;
    j.spine.add(abdomen);
    const bodice = new THREE.Mesh(roundedBox(0.3, 0.26, 0.185, 0.07, 3), whiteSolid);
    bodice.position.y = 0.1;
    j.chest.add(bodice);
    // Draped hood collar standing off the shoulders.
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.155, 0.15, 16, 1, true), white);
    collar.position.y = 0.24;
    j.chest.add(collar);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.013, 6, 22), beltMat);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.03;
    belt.scale.set(1.05, 0.72, 1);
    j.pelvis.add(belt);

    const neckCol = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.05, 0.11, 10), skin);
    neckCol.position.y = 0.02;
    j.neck.add(neckCol);

    // Head, face and the coiled side buns.
    const head = new THREE.Mesh(roundedBox(0.15, 0.185, 0.165, 0.07, 3), skin);
    head.position.y = 0.085;
    j.head.add(head);
    addFace(j.head, skin, { depth: 0.084, eyeY: 0.1, scale: 0.94, hairMat: hair });
    // The cap stops above the brow. Swept any further round and it closes over
    // the eyes, and at the distances these shots are photographed from that
    // turns her head into an anonymous dark mass.
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.094, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hair);
    hairCap.position.y = 0.112;
    hairCap.scale.set(1.06, 1.06, 1.12);
    j.head.add(hairCap);
    // Side falls framing the face, down to the buns.
    for (const s of [-1, 1]) {
      const fall = new THREE.Mesh(roundedBox(0.035, 0.11, 0.15, 0.017), hair);
      fall.position.set(s * 0.072, 0.075, 0.01);
      j.head.add(fall);
    }
    const nape = new THREE.Mesh(roundedBox(0.14, 0.13, 0.07, 0.035), hair);
    nape.position.set(0, 0.05, 0.07);
    j.head.add(nape);
    for (const s of [-1, 1]) {
      const bun = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.032, 8, 18), hair);
      bun.rotation.y = Math.PI / 2;
      bun.position.set(s * 0.097, 0.052, 0.005);
      j.head.add(bun);
      const bunFill = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), hair);
      bunFill.position.set(s * 0.097, 0.052, 0.005);
      j.head.add(bunFill);
    }

    for (const side of [-1, 1] as const) {
      const upper = side < 0 ? j.upperArmL : j.upperArmR;
      const fore = side < 0 ? j.forearmL : j.forearmR;
      const hand = side < 0 ? j.handL : j.handR;
      upper.add(ball(0.047, whiteSolid));
      upper.add(limb(p.upperArm, 0.043, 0.034, whiteSolid));
      fore.add(limb(p.forearm, 0.034, 0.03, whiteSolid));
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.058, 0.075, 10), white);
      cuff.position.y = -p.forearm + 0.03;
      fore.add(cuff);
      hand.add(glove(skin, 0.85));

      const thigh = side < 0 ? j.thighL : j.thighR;
      const shin = side < 0 ? j.shinL : j.shinR;
      const foot = side < 0 ? j.footL : j.footR;
      thigh.add(limb(p.thigh, 0.062, 0.05, whiteSolid));
      shin.add(limb(p.shin, 0.048, 0.038, whiteSolid));
      foot.add(boot(paintMaterial('leiaBoot', '#e8e5df', 0.6, 0), 0.85));
    }

    // Floor-length gown with soft vertical folds.
    this.gownGeo = new THREE.CylinderGeometry(0.155, 0.3, 0.88, 24, 6, true);
    const gp = this.gownGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < gp.count; i++) {
      const x = gp.getX(i);
      const z = gp.getZ(i);
      const a = Math.atan2(z, x);
      const r = Math.hypot(x, z);
      // Eight shallow flutes, deepest at the hem.
      const v = (gp.getY(i) + 0.44) / 0.88;
      const fold = 1 + Math.cos(a * 8) * 0.035 * (1 - v);
      gp.setXYZ(i, Math.cos(a) * r * fold, gp.getY(i), Math.sin(a) * r * fold);
    }
    this.gownGeo.computeVertexNormals();
    this.gownBase = Float32Array.from(gp.array as Float32Array);
    this.gown = new THREE.Mesh(this.gownGeo, white);
    this.gown.position.y = -0.39;
    this.gown.castShadow = true;
    j.pelvis.add(this.gown);

    this.attachWeapon(blasterPistol(PALETTE.laserBlue, 0.95), new THREE.Vector3(0.015, -0.06, -0.02));
    this.setWeaponVisible(false);
  }

  protected override poseExtra(dt: number, elapsed: number): void {
    super.poseExtra(dt, elapsed);
    this.gownPhase += dt * (1.6 + this.speed * 2.6);
    const pos = this.gownGeo.attributes.position as THREE.BufferAttribute;
    const amp = 0.012 + this.speed * 0.05;
    for (let i = 0; i < pos.count; i++) {
      const bx = this.gownBase[i * 3];
      const by = this.gownBase[i * 3 + 1];
      const bz = this.gownBase[i * 3 + 2];
      const v = (by + 0.44) / 0.88;
      const hem = (1 - v) * (1 - v);
      const angle = Math.atan2(bz, bx);
      const sway = Math.sin(this.gownPhase * 2.2 + angle * 2) * amp * hem;
      pos.setXYZ(i, bx + sway * 0.6, by + Math.sin(this.gownPhase * 1.7 + angle) * amp * hem * 0.4, bz + sway);
    }
    pos.needsUpdate = true;
    this.gownGeo.computeVertexNormals();
    void elapsed;
  }
}

/* -------------------------------------------------------- imperial officer */

export class ImperialOfficer extends ArmedFigure {
  constructor(o: HumanOptions = {}) {
    super({ ...o, proportions: { ...HUMAN, height: 1.78, ...(o.proportions ?? {}) } });
    this.group.name = 'ImperialOfficer';
    const j = this.joints;
    const p = this.p;

    const tunic = paintMaterial('officerTunic', '#4f5357', 0.78, 0.05);
    const dark = paintMaterial('officerDark', '#1b1d20', 0.6, 0.1);
    const skin = paintMaterial('officerSkin', '#c49a7c', 0.72, 0);
    const rank = emissiveMaterial('rankBadge', '#4aa3ff', 0.7);

    const abdomen = new THREE.Mesh(roundedBox(0.3, 0.3, 0.19, 0.06, 3), tunic);
    abdomen.position.y = 0.14;
    j.spine.add(abdomen);
    const chest = new THREE.Mesh(roundedBox(0.35, 0.3, 0.21, 0.07, 3), tunic);
    chest.position.y = 0.12;
    j.chest.add(chest);
    const belt = new THREE.Mesh(roundedBox(0.34, 0.06, 0.22, 0.02), dark);
    belt.position.y = 0.03;
    j.pelvis.add(belt);
    const hips = new THREE.Mesh(roundedBox(0.29, 0.16, 0.19, 0.06), dark);
    hips.position.y = -0.03;
    j.pelvis.add(hips);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.012), rank);
    badge.position.set(-0.1, 0.16, -0.108);
    j.chest.add(badge);

    const neckCol = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.12, 10), skin);
    neckCol.position.y = 0.03;
    j.neck.add(neckCol);

    const head = new THREE.Mesh(roundedBox(0.155, 0.195, 0.175, 0.07, 3), skin);
    head.position.y = 0.09;
    j.head.add(head);
    addFace(j.head, skin, { depth: 0.089, eyeY: 0.108, hairMat: paintMaterial('officerHair', '#2c2620', 0.9, 0) });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.093, 0.098, 0.075, 14), dark);
    cap.position.y = 0.185;
    j.head.add(cap);
    const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.093, 0.093, 0.012, 14), dark);
    capTop.position.y = 0.223;
    j.head.add(capTop);
    const peak = new THREE.Mesh(roundedBox(0.16, 0.016, 0.075, 0.008), dark);
    peak.position.set(0, 0.152, -0.088);
    peak.rotation.x = -0.14;
    j.head.add(peak);

    for (const side of [-1, 1] as const) {
      const upper = side < 0 ? j.upperArmL : j.upperArmR;
      const fore = side < 0 ? j.forearmL : j.forearmR;
      const hand = side < 0 ? j.handL : j.handR;
      upper.add(limb(p.upperArm, 0.05, 0.04, tunic));
      fore.add(limb(p.forearm, 0.04, 0.034, tunic));
      hand.add(glove(dark));
      const thigh = side < 0 ? j.thighL : j.thighR;
      const shin = side < 0 ? j.shinL : j.shinR;
      const foot = side < 0 ? j.footL : j.footR;
      thigh.add(limb(p.thigh, 0.072, 0.055, dark));
      shin.add(limb(p.shin, 0.053, 0.041, dark));
      foot.add(boot(dark));
    }

    this.attachWeapon(blasterPistol(PALETTE.laserRed, 0.95));
    this.setWeaponVisible(false);
  }
}
