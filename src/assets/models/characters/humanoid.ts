import * as THREE from 'three';

/**
 * Articulated humanoid rig (Fable 4). Parts are attached to joint groups and
 * animated procedurally (walk/idle/aim/fire/crouch/death/kneel/fear/etc).
 * Skins provide the actual part meshes; the rig guarantees no visible joint
 * separation by overlapping part geometry at joints.
 */

export interface HumanoidSkin {
  /** build meshes for each part; sizes in meters. */
  pelvis(): THREE.Object3D;
  torso(): THREE.Object3D;
  head(): THREE.Object3D;
  upperArmL(): THREE.Object3D;
  upperArmR(): THREE.Object3D;
  foreArmL(): THREE.Object3D;
  foreArmR(): THREE.Object3D;
  thighL(): THREE.Object3D;
  thighR(): THREE.Object3D;
  calfL(): THREE.Object3D;
  calfR(): THREE.Object3D;
  /** optional handheld item attached to right hand */
  handItem?(): THREE.Object3D | null;
  height: number; // total standing height
}

export type AnimName =
  | 'idle' | 'walk' | 'run' | 'crouch-idle' | 'crouch-walk' | 'aim' | 'aim-walk'
  | 'flinch' | 'search' | 'kneel' | 'fear' | 'death' | 'follow';

interface Pose {
  torsoPitch: number;
  torsoY: number; // pelvis height factor
  armLPitch: number; armLRoll: number; foreLPitch: number;
  armRPitch: number; armRRoll: number; foreRPitch: number;
  legSwing: number; // walk amplitude
  kneeBend: number;
  headPitch: number;
  speed: number;   // cycle speed
}

const POSES: Record<string, Partial<Pose>> = {
  idle: { legSwing: 0, kneeBend: 0.04, armLPitch: 0.08, armRPitch: 0.08, torsoY: 1 },
  walk: { legSwing: 0.5, kneeBend: 0.15, armLPitch: 0.15, armRPitch: 0.15, speed: 5.2, torsoY: 1 },
  run: { legSwing: 0.75, kneeBend: 0.3, armLPitch: 0.4, armRPitch: 0.4, speed: 7.6, torsoY: 0.98 },
  'crouch-idle': { legSwing: 0, kneeBend: 0.95, torsoPitch: 0.28, torsoY: 0.72, armLPitch: 0.2, armRPitch: 0.2 },
  'crouch-walk': { legSwing: 0.35, kneeBend: 0.95, torsoPitch: 0.3, torsoY: 0.72, speed: 4, armLPitch: 0.2, armRPitch: 0.2 },
  aim: { legSwing: 0, kneeBend: 0.1, armRPitch: 1.35, armRRoll: -0.12, foreRPitch: 0.12, armLPitch: 1.1, armLRoll: 0.5, foreLPitch: 0.55, torsoY: 1 },
  'aim-walk': { legSwing: 0.4, kneeBend: 0.2, speed: 5, armRPitch: 1.35, armRRoll: -0.12, foreRPitch: 0.12, armLPitch: 1.1, armLRoll: 0.5, foreLPitch: 0.55, torsoY: 1 },
  search: { legSwing: 0.42, kneeBend: 0.16, speed: 4.6, armRPitch: 0.9, armRRoll: -0.15, foreRPitch: 0.4, armLPitch: 0.6, armLRoll: 0.3, foreLPitch: 0.5, torsoY: 1 },
  kneel: { legSwing: 0, kneeBend: 1.55, torsoPitch: 0.12, torsoY: 0.48, armLPitch: -0.5, armRPitch: -0.5, foreLPitch: 1.2, foreRPitch: 1.2, headPitch: 0.25 },
  fear: { legSwing: 0, kneeBend: 0.5, torsoPitch: 0.5, torsoY: 0.82, armLPitch: 1.7, armRPitch: 1.7, foreLPitch: 1.2, foreRPitch: 1.2, headPitch: 0.4 },
  follow: { legSwing: 0.55, kneeBend: 0.25, speed: 6, torsoPitch: 0.16, armLPitch: 0.3, armRPitch: 0.3, torsoY: 0.95 },
  flinch: { legSwing: 0, kneeBend: 0.35, torsoPitch: 0.35, armLPitch: 0.9, armRPitch: 0.9, torsoY: 0.9 },
  death: {},
};

export class Humanoid {
  readonly root = new THREE.Group();
  readonly pelvis = new THREE.Group();
  readonly torso = new THREE.Group();
  readonly headJ = new THREE.Group();
  readonly armL = new THREE.Group();
  readonly armR = new THREE.Group();
  readonly foreL = new THREE.Group();
  readonly foreR = new THREE.Group();
  readonly hipL = new THREE.Group();
  readonly hipR = new THREE.Group();
  readonly kneeL = new THREE.Group();
  readonly kneeR = new THREE.Group();
  readonly handR = new THREE.Group();
  /** torso-space weapon mount blending carry ↔ aim (see attachWeapon) */
  readonly weaponMount = new THREE.Group();
  private hasWeapon = false;
  private aimBlend = 0;

  private anim: AnimName = 'idle';
  private pose: Pose = defaultPose();
  private target: Pose = defaultPose();
  private phase = 0;
  private breathe = Math.random() * 10;
  private deathT = -1;
  private deathDir = new THREE.Vector3(0, 0, 1);
  private deathSpin = 1;
  private flinchT = -1;
  private fireT = -1;
  aimPitch = 0;
  readonly hipHeight: number;
  readonly skin: HumanoidSkin;
  private legLen: number;

  constructor(skin: HumanoidSkin) {
    this.skin = skin;
    const H = skin.height;
    this.legLen = H * 0.5;
    this.hipHeight = H * 0.52;

    this.root.add(this.pelvis);
    this.pelvis.position.y = this.hipHeight;
    this.pelvis.add(skin.pelvis());
    this.pelvis.add(this.torso);
    this.torso.position.y = H * 0.09;
    this.torso.add(skin.torso());
    this.headJ.position.y = H * 0.31;
    this.torso.add(this.headJ);
    this.headJ.add(skin.head());

    const shoulderY = H * 0.27;
    const shoulderX = H * 0.115;
    this.armL.position.set(-shoulderX, shoulderY, 0);
    this.armR.position.set(shoulderX, shoulderY, 0);
    this.torso.add(this.armL, this.armR);
    this.armL.add(skin.upperArmL());
    this.armR.add(skin.upperArmR());
    this.foreL.position.y = -H * 0.16;
    this.foreR.position.y = -H * 0.16;
    this.armL.add(this.foreL);
    this.armR.add(this.foreR);
    this.foreL.add(skin.foreArmL());
    this.foreR.add(skin.foreArmR());
    this.handR.position.y = -H * 0.15;
    this.foreR.add(this.handR);
    const item = skin.handItem?.();
    if (item) this.handR.add(item);

    this.torso.add(this.weaponMount);
    this.weaponMount.position.set(H * 0.09, H * 0.2, H * 0.1);

    const hipX = H * 0.055;
    this.hipL.position.set(-hipX, 0, 0);
    this.hipR.position.set(hipX, 0, 0);
    this.pelvis.add(this.hipL, this.hipR);
    this.hipL.add(skin.thighL());
    this.hipR.add(skin.thighR());
    this.kneeL.position.y = -H * 0.24;
    this.kneeR.position.y = -H * 0.24;
    this.hipL.add(this.kneeL);
    this.hipR.add(this.kneeR);
    this.kneeL.add(skin.calfL());
    this.kneeR.add(skin.calfR());

    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }

  setAnim(a: AnimName): void {
    if (this.anim === a) return;
    this.anim = a;
    if (a === 'flinch') this.flinchT = 0;
    const p = POSES[a] ?? {};
    this.target = { ...defaultPose(), ...p };
  }

  attachWeapon(weapon: THREE.Object3D): void {
    this.weaponMount.add(weapon);
    this.hasWeapon = true;
  }

  getAnim(): AnimName {
    return this.anim;
  }

  fire(): void {
    this.fireT = 0;
  }

  die(dir: THREE.Vector3, spin = 1): void {
    if (this.deathT >= 0) return;
    this.anim = 'death';
    this.deathT = 0;
    this.deathDir.copy(dir).setY(0).normalize();
    this.deathSpin = spin;
  }

  get dead(): boolean {
    return this.deathT >= 0;
  }

  reset(): void {
    this.deathT = -1;
    this.flinchT = -1;
    this.fireT = -1;
    this.anim = 'idle';
    this.pose = defaultPose();
    this.target = defaultPose();
    this.root.rotation.set(0, this.root.rotation.y, 0);
    this.pelvis.position.y = this.hipHeight;
  }

  /** speed = horizontal m/s for cycle sync */
  update(dt: number, speed: number): void {
    if (this.deathT >= 0) {
      this.deathT += dt;
      const t = Math.min(1, this.deathT / 0.75);
      const e = 1 - Math.pow(1 - t, 3);
      // collapse: rotate root around local X toward fall dir, sink pelvis
      const targetYaw = Math.atan2(this.deathDir.x, this.deathDir.z);
      this.root.rotation.y = THREE.MathUtils.damp(this.root.rotation.y, targetYaw, 4, dt);
      this.root.rotation.x = e * (Math.PI / 2) * 0.96;
      this.root.rotation.z = e * 0.12 * this.deathSpin;
      this.pelvis.position.y = THREE.MathUtils.lerp(this.hipHeight, 0.16, e);
      // limbs go loose
      const loose = e * 0.6;
      this.armL.rotation.x = THREE.MathUtils.lerp(this.armL.rotation.x, 0.4 * this.deathSpin, loose);
      this.armR.rotation.x = THREE.MathUtils.lerp(this.armR.rotation.x, -0.3 * this.deathSpin, loose);
      this.kneeL.rotation.x = THREE.MathUtils.lerp(this.kneeL.rotation.x, 0.5, loose);
      this.kneeR.rotation.x = THREE.MathUtils.lerp(this.kneeR.rotation.x, 0.3, loose);
      return;
    }

    this.breathe += dt;
    const p = this.pose;
    const tg = this.target;
    const blend = 1 - Math.exp(-10 * dt);
    for (const key of Object.keys(p) as (keyof Pose)[]) {
      p[key] += (tg[key] - p[key]) * blend;
    }
    // locomotion cycle
    const cyc = tg.speed > 0 ? tg.speed : 5;
    this.phase += dt * cyc * THREE.MathUtils.clamp(speed / 2.2, speed > 0.15 ? 0.55 : 0, 1.6);
    const s = Math.sin(this.phase);
    const s2 = Math.sin(this.phase * 2);
    const swing = p.legSwing * THREE.MathUtils.clamp(speed / 1.6, 0, 1.25);

    this.pelvis.position.y = this.hipHeight * p.torsoY + Math.abs(s2) * 0.02 * swing + Math.sin(this.breathe * 1.7) * 0.004;
    this.pelvis.rotation.z = s * 0.03 * swing;
    this.torso.rotation.x = p.torsoPitch + Math.sin(this.breathe * 1.7) * 0.012;
    this.headJ.rotation.x = p.headPitch - this.aimPitch * 0.35;

    // legs
    this.hipL.rotation.x = s * swing;
    this.hipR.rotation.x = -s * swing;
    this.kneeL.rotation.x = Math.max(0, -s) * swing * 1.15 + p.kneeBend;
    this.kneeR.rotation.x = Math.max(0, s) * swing * 1.15 + p.kneeBend;
    // kneel asymmetry
    if (this.anim === 'kneel') {
      this.hipL.rotation.x = -1.35;
      this.kneeL.rotation.x = 1.5;
      this.hipR.rotation.x = -0.15;
      this.kneeR.rotation.x = 2.15;
    }

    // arms: swing counter to legs unless posed
    const armSwing = swing * 0.55;
    const aiming = this.anim === 'aim' || this.anim === 'aim-walk';
    if (aiming) {
      const aimX = p.armRPitch + this.aimPitch;
      this.armR.rotation.set(-aimX, -0.12, p.armRRoll);
      this.foreR.rotation.set(-p.foreRPitch, 0, 0);
      this.armL.rotation.set(-(p.armLPitch + this.aimPitch * 0.9), 0.5, p.armLRoll);
      this.foreL.rotation.set(-p.foreLPitch, 0.35, 0);
    } else {
      this.armL.rotation.set(-s * armSwing - p.armLPitch, 0, 0.1 + p.armLRoll);
      this.armR.rotation.set(s * armSwing - p.armRPitch, 0, -0.1 + p.armRRoll);
      this.foreL.rotation.set(-p.foreLPitch - 0.15 - Math.max(0, -s) * armSwing * 0.5, 0, 0);
      this.foreR.rotation.set(-p.foreRPitch - 0.15 - Math.max(0, s) * armSwing * 0.5, 0, 0);
    }

    // weapon mount: blend carry (diagonal, low) ↔ aim (forward, pitched)
    if (this.hasWeapon) {
      const aimTarget = aiming || this.anim === 'search' ? 1 : 0;
      this.aimBlend += (aimTarget - this.aimBlend) * blend;
      const b = this.aimBlend;
      const H = this.skin.height;
      this.weaponMount.position.set(
        THREE.MathUtils.lerp(H * 0.07, H * 0.075, b),
        THREE.MathUtils.lerp(H * 0.14, H * 0.24, b),
        THREE.MathUtils.lerp(H * 0.08, H * 0.13, b),
      );
      this.weaponMount.rotation.set(
        THREE.MathUtils.lerp(0.5, -this.aimPitch, b),
        THREE.MathUtils.lerp(-0.35, 0, b),
        THREE.MathUtils.lerp(0.15, 0, b),
      );
    }

    // fire recoil pulse
    if (this.fireT >= 0) {
      this.fireT += dt;
      const k = Math.max(0, 1 - this.fireT / 0.12);
      this.armR.rotation.x += k * 0.1;
      this.torso.rotation.x -= k * 0.02;
      if (this.fireT > 0.12) this.fireT = -1;
    }
    // flinch decay back to previous anim is handled by AI switching anims
    if (this.flinchT >= 0) {
      this.flinchT += dt;
      const k = Math.max(0, 1 - this.flinchT / 0.3);
      this.torso.rotation.x += k * 0.22;
      if (this.flinchT > 0.35) this.flinchT = -1;
    }
  }

  /** approximate world positions for hit volumes */
  hitVolumes(ownerId: string): { ownerId: string; part: 'head' | 'body'; p0: THREE.Vector3; p1: THREE.Vector3; r: number }[] {
    const headPos = new THREE.Vector3();
    this.headJ.getWorldPosition(headPos);
    headPos.y += 0.06;
    const pelvisPos = new THREE.Vector3();
    this.pelvis.getWorldPosition(pelvisPos);
    const neck = new THREE.Vector3();
    this.headJ.getWorldPosition(neck);
    neck.y -= 0.08;
    const feet = pelvisPos.clone();
    feet.y = Math.max(this.root.position.y + 0.2, pelvisPos.y - this.legLen * 0.9);
    return [
      { ownerId, part: 'head', p0: headPos, p1: headPos, r: 0.15 },
      { ownerId, part: 'body', p0: neck, p1: feet, r: 0.24 },
    ];
  }

  muzzleWorld(out = new THREE.Vector3()): THREE.Vector3 {
    if (this.hasWeapon && this.weaponMount.children.length > 0) {
      const w = this.weaponMount.children[0];
      const local = (w.userData.muzzleLocal as THREE.Vector3) ?? new THREE.Vector3(0, 0, 0.5);
      out.copy(local);
      return w.localToWorld(out);
    }
    this.handR.getWorldPosition(out);
    return out;
  }
}

function defaultPose(): Pose {
  return {
    torsoPitch: 0, torsoY: 1,
    armLPitch: 0.08, armLRoll: 0, foreLPitch: 0.15,
    armRPitch: 0.08, armRRoll: 0, foreRPitch: 0.15,
    legSwing: 0.5, kneeBend: 0.06, headPitch: 0, speed: 5,
  };
}
