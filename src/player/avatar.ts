import * as THREE from 'three';
import { MeshBuilder } from '../core/meshbuilder';
import { clamp01, damp, lerp, TAU } from '../core/math';
import { getMaps } from '../core/textures';

export type AvatarPose =
  | 'idle'
  | 'walk'
  | 'run'
  | 'swim'
  | 'climb'
  | 'fall'
  | 'dig'
  | 'swing'
  | 'aim'
  | 'helm'
  | 'crank';

export interface AvatarColors {
  skin: number;
  shirt: number;
  coat: number;
  trousers: number;
  boots: number;
  hat: number;
  sash: number;
  bone?: boolean;
}

// Kept a couple of stops lighter than the reference garments would be. Most of
// the time you see the pirate against a bright sea with the sun behind him, and
// true-value cloth in that light is a black cut-out.
export const PIRATE_COLORS: AvatarColors = {
  skin: 0xcd9666,
  shirt: 0xe6dcbe,
  coat: 0x9a4b36,
  trousers: 0x6a5f4e,
  boots: 0x413425,
  hat: 0x3a3128,
  sash: 0xb8503a,
};

export const SKELETON_COLORS: AvatarColors = {
  skin: 0xd8d2c0,
  shirt: 0x5c5442,
  coat: 0x3d4a38,
  trousers: 0x3a352c,
  boots: 0x241d15,
  hat: 0x1e1a14,
  sash: 0x4a5c3a,
  bone: true,
};

/**
 * A blocky pirate rig assembled from vertex-coloured boxes, with joints exposed
 * so poses can be driven procedurally - no skinning or animation files needed.
 */
export class Avatar {
  readonly root = new THREE.Group();
  readonly hips = new THREE.Group();
  readonly torso = new THREE.Group();
  readonly head = new THREE.Group();
  readonly armLeft = new THREE.Group();
  readonly armRight = new THREE.Group();
  readonly legLeft = new THREE.Group();
  readonly legRight = new THREE.Group();
  /** Attach point for held items, at the right hand. */
  readonly hand = new THREE.Group();

  private phase = 0;
  private blendSwing = 0;
  private material: THREE.MeshStandardMaterial;

  constructor(colors: AvatarColors = PIRATE_COLORS, scale = 1) {
    // Vertex colours carry the palette, but flat-shaded cloth reads as plastic.
    // Borrowing the sailcloth weave as a normal and roughness map, tiled small,
    // gives coat, shirt and boots a fabric grain without a second texture set.
    const weave = getMaps('canvas');
    const normalMap = weave.normalMap.clone();
    const roughnessMap = weave.roughnessMap.clone();
    for (const map of [normalMap, roughnessMap]) {
      map.repeat.set(4, 4);
      map.needsUpdate = true;
    }
    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      normalMap,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughnessMap,
      roughness: 0.85,
      metalness: 0.03,
      transparent: colors.bone === true,
      opacity: colors.bone ? 0.97 : 1,
    });

    this.root.add(this.hips);
    this.hips.position.y = 0.88 * scale;
    this.hips.add(this.torso, this.legLeft, this.legRight);
    this.torso.add(this.head, this.armLeft, this.armRight);
    this.armRight.add(this.hand);
    this.hand.position.set(0, -0.58 * scale, 0.06 * scale);

    this.legLeft.position.set(-0.13 * scale, 0, 0);
    this.legRight.position.set(0.13 * scale, 0, 0);
    this.armLeft.position.set(-0.33 * scale, 0.5 * scale, 0);
    this.armRight.position.set(0.33 * scale, 0.5 * scale, 0);
    this.head.position.set(0, 0.62 * scale, 0);

    this.buildTorso(colors, scale);
    this.buildHead(colors, scale);
    this.buildArm(this.armLeft, colors, scale, -1);
    this.buildArm(this.armRight, colors, scale, 1);
    this.buildLeg(this.legLeft, colors, scale);
    this.buildLeg(this.legRight, colors, scale);

    this.root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = false;
      }
    });
  }

  private attach(parent: THREE.Group, builder: MeshBuilder, smooth = true): void {
    const mesh = new THREE.Mesh(builder.build(smooth), this.material);
    parent.add(mesh);
  }

  /**
   * Tapered limb or body segment: a squashed cylinder between two radii. Boxes
   * are quick to author but read as a toy; a taper with a rounded cap is the
   * cheapest thing that reads as a person.
   */
  private tube(
    b: MeshBuilder,
    color: number,
    from: THREE.Vector3Like,
    to: THREE.Vector3Like,
    radiusTop: number,
    radiusBottom: number,
    flatten = 1,
    sides = 10,
  ): void {
    const a = new THREE.Vector3(from.x, from.y, from.z);
    const z = new THREE.Vector3(to.x, to.y, to.z);
    const dir = new THREE.Vector3().subVectors(z, a);
    const length = dir.length();
    if (length < 1e-5) return;
    const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, sides, 1);
    geometry.scale(1, 1, flatten);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3().addVectors(a, z).multiplyScalar(0.5),
      quaternion,
      new THREE.Vector3(1, 1, 1),
    );
    b.addGeometry(geometry, color, matrix);
    geometry.dispose();
  }

  private blob(
    b: MeshBuilder,
    color: number,
    centre: THREE.Vector3Like,
    radius: number,
    scale: THREE.Vector3Like = { x: 1, y: 1, z: 1 },
  ): void {
    const geometry = new THREE.SphereGeometry(radius, 10, 7);
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(centre.x, centre.y, centre.z),
      new THREE.Quaternion(),
      new THREE.Vector3(scale.x, scale.y, scale.z),
    );
    b.addGeometry(geometry, color, matrix);
    geometry.dispose();
  }

  private buildTorso(c: AvatarColors, s: number): void {
    const b = new MeshBuilder();
    const shadow = new THREE.Color(c.coat).multiplyScalar(0.66).getHex();
    const deep = new THREE.Color(c.coat).multiplyScalar(0.42).getHex();
    const leather = c.bone ? 0x4a4438 : 0x8d6f45;
    // Shirt: broad across the chest, drawn in at the waist.
    this.tube(b, c.shirt, { x: 0, y: 0.62 * s, z: 0 }, { x: 0, y: 0.3 * s, z: 0 }, 0.205 * s, 0.2 * s, 0.62);
    this.tube(b, c.shirt, { x: 0, y: 0.31 * s, z: 0 }, { x: 0, y: 0.08 * s, z: 0 }, 0.2 * s, 0.16 * s, 0.66);
    // Coat over the top, cut away at the front so the shirt shows through.
    this.tube(b, c.coat, { x: 0, y: 0.58 * s, z: -0.02 * s }, { x: 0, y: 0.3 * s, z: -0.02 * s }, 0.22 * s, 0.21 * s, 0.62);
    this.tube(b, c.coat, { x: 0, y: 0.31 * s, z: -0.02 * s }, { x: 0, y: 0.12 * s, z: -0.02 * s }, 0.21 * s, 0.185 * s, 0.66);
    // Skirts: two panels split at the back, which is what a coat actually does
    // and what stops the whole man reading as one painted barrel from behind.
    for (const side of [-1, 1]) {
      this.tube(
        b,
        c.coat,
        { x: side * 0.035 * s, y: 0.13 * s, z: -0.01 * s },
        { x: side * 0.105 * s, y: -0.22 * s, z: -0.01 * s },
        0.15 * s,
        0.165 * s,
        0.82,
        8,
      );
    }
    // The vent between them, and the hem.
    this.tube(b, deep, { x: 0, y: 0.12 * s, z: -0.11 * s }, { x: 0, y: -0.2 * s, z: -0.14 * s }, 0.05 * s, 0.06 * s, 0.5, 6);
    for (const side of [-1, 1]) {
      this.blob(b, shadow, { x: side * 0.105 * s, y: -0.225 * s, z: -0.01 * s }, 0.078 * s, { x: 1.05, y: 0.3, z: 0.86 });
    }
    // Lapels folded back off the chest.
    for (const side of [-1, 1]) {
      this.blob(b, shadow, { x: side * 0.1 * s, y: 0.44 * s, z: 0.1 * s }, 0.075 * s, { x: 0.7, y: 1.7, z: 0.42 });
    }
    // Shoulders, with a slight cape roll where the sleeve is set in.
    for (const side of [-1, 1]) {
      this.blob(b, c.coat, { x: side * 0.195 * s, y: 0.55 * s, z: 0 }, 0.112 * s, { x: 1, y: 0.9, z: 0.8 });
      // A seam where the sleeve is set in, so the shoulder is not one smooth ball.
      this.tube(
        b,
        shadow,
        { x: side * 0.135 * s, y: 0.62 * s, z: 0 },
        { x: side * 0.235 * s, y: 0.47 * s, z: 0 },
        0.016 * s,
        0.014 * s,
        1.9,
        5,
      );
    }
    // Belt with a brass buckle, and a sash worn over one shoulder.
    this.tube(b, c.boots, { x: 0, y: 0.17 * s, z: 0 }, { x: 0, y: 0.08 * s, z: 0 }, 0.207 * s, 0.207 * s, 0.7);
    b.addBox({ x: 0, y: 0.125 * s, z: 0.145 * s }, { x: 0.075 * s, y: 0.06 * s, z: 0.02 * s }, 0xc39a4e);
    this.tube(
      b,
      c.sash,
      { x: -0.13 * s, y: 0.5 * s, z: 0.02 * s },
      { x: 0.11 * s, y: 0.12 * s, z: 0.02 * s },
      0.048 * s,
      0.055 * s,
      2.6,
      6,
    );
    // Baldric over the other shoulder. Buff leather across a red coat is the
    // one piece of contrast that reads from behind at any distance.
    this.tube(
      b,
      leather,
      { x: 0.135 * s, y: 0.58 * s, z: -0.09 * s },
      { x: -0.12 * s, y: 0.13 * s, z: -0.1 * s },
      0.026 * s,
      0.028 * s,
      2.4,
      5,
    );
    this.tube(
      b,
      leather,
      { x: 0.135 * s, y: 0.58 * s, z: 0.07 * s },
      { x: -0.12 * s, y: 0.13 * s, z: 0.08 * s },
      0.026 * s,
      0.028 * s,
      2.4,
      5,
    );
    // Collar standing up behind the neck.
    this.tube(b, shadow, { x: 0, y: 0.68 * s, z: -0.03 * s }, { x: 0, y: 0.56 * s, z: -0.03 * s }, 0.115 * s, 0.17 * s, 0.78);
    if (c.bone) {
      for (let i = 0; i < 3; i++) {
        b.addBox({ x: 0, y: (0.2 + i * 0.12) * s, z: 0.13 * s }, { x: 0.3 * s, y: 0.05 * s, z: 0.05 * s }, c.skin);
      }
    }
    this.attach(this.torso, b);
  }

  private buildHead(c: AvatarColors, s: number): void {
    const b = new MeshBuilder();
    const hair = 0x33241a;
    // Neck, skull, and a jaw that gives the profile a chin.
    this.tube(b, c.skin, { x: 0, y: 0.03 * s, z: 0 }, { x: 0, y: -0.07 * s, z: 0 }, 0.062 * s, 0.075 * s, 1, 8);
    this.blob(b, c.skin, { x: 0, y: 0.13 * s, z: -0.005 * s }, 0.125 * s, { x: 0.94, y: 1.04, z: 1.02 });
    this.blob(b, c.skin, { x: 0, y: 0.065 * s, z: 0.035 * s }, 0.095 * s, { x: 0.9, y: 0.85, z: 1.0 });
    // Brow, nose, cheekbones.
    this.blob(b, c.skin, { x: 0, y: 0.175 * s, z: 0.088 * s }, 0.055 * s, { x: 1.5, y: 0.42, z: 0.6 });
    this.blob(b, c.skin, { x: 0, y: 0.12 * s, z: 0.105 * s }, 0.032 * s, { x: 0.9, y: 1.25, z: 1.25 });
    for (const dx of [-1, 1]) {
      this.blob(b, c.skin, { x: dx * 0.075 * s, y: 0.115 * s, z: 0.07 * s }, 0.04 * s, { x: 0.9, y: 0.8, z: 0.9 });
      // Eye socket, then the eye sitting in it.
      this.blob(b, c.bone ? 0x0d0906 : 0x6b5138, { x: dx * 0.052 * s, y: 0.152 * s, z: 0.098 * s }, 0.03 * s, {
        x: 1.15,
        y: 0.85,
        z: 0.45,
      });
      if (!c.bone) {
        this.blob(b, 0x22160e, { x: dx * 0.05 * s, y: 0.15 * s, z: 0.112 * s }, 0.015 * s, { x: 1.1, y: 0.85, z: 0.5 });
      }
    }
    if (!c.bone) {
      // Hair swept back into a queue, a full beard, and a tricorn over the lot.
      this.blob(b, hair, { x: 0, y: 0.16 * s, z: -0.045 * s }, 0.128 * s, { x: 0.98, y: 0.94, z: 0.92 });
      this.tube(b, hair, { x: 0, y: 0.11 * s, z: -0.12 * s }, { x: 0, y: -0.06 * s, z: -0.15 * s }, 0.038 * s, 0.022 * s, 1, 7);
      this.blob(b, 0x4a3527, { x: 0, y: 0.045 * s, z: 0.05 * s }, 0.098 * s, { x: 1.02, y: 0.92, z: 0.95 });
      this.blob(b, 0x4a3527, { x: 0, y: 0.098 * s, z: 0.098 * s }, 0.045 * s, { x: 1.5, y: 0.45, z: 0.6 });
      const brim = new THREE.CylinderGeometry(0.26 * s, 0.26 * s, 0.024 * s, 3, 1);
      b.addGeometry(
        brim,
        c.hat,
        new THREE.Matrix4().compose(
          new THREE.Vector3(0, 0.245 * s, 0),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0.06, Math.PI / 6, 0)),
          new THREE.Vector3(1, 1, 1),
        ),
      );
      brim.dispose();
      this.tube(b, c.hat, { x: 0, y: 0.35 * s, z: 0 }, { x: 0, y: 0.235 * s, z: 0 }, 0.105 * s, 0.15 * s, 1, 9);
      this.blob(b, c.hat, { x: 0, y: 0.352 * s, z: 0 }, 0.105 * s, { x: 1, y: 0.5, z: 1 });
      // Hat band and a feather tucked into it.
      this.tube(b, 0x8a2f24, { x: 0, y: 0.28 * s, z: 0 }, { x: 0, y: 0.255 * s, z: 0 }, 0.138 * s, 0.145 * s, 1, 9);
      this.tube(b, 0xd9c48a, { x: 0.09 * s, y: 0.27 * s, z: -0.05 * s }, { x: 0.13 * s, y: 0.4 * s, z: -0.21 * s }, 0.008 * s, 0.022 * s, 2.4, 5);
    } else {
      this.blob(b, c.skin, { x: 0, y: 0.045 * s, z: 0.07 * s }, 0.05 * s, { x: 1.3, y: 0.7, z: 0.9 });
      const brim = new THREE.CylinderGeometry(0.18 * s, 0.18 * s, 0.03 * s, 3, 1);
      b.addGeometry(brim, c.hat, new THREE.Matrix4().makeTranslation(0, 0.24 * s, 0));
      brim.dispose();
    }
    this.attach(this.head, b);
  }

  private buildArm(parent: THREE.Group, c: AvatarColors, s: number, side: number): void {
    const b = new MeshBuilder();
    const cuff = new THREE.Color(c.coat).multiplyScalar(0.7).getHex();
    // Upper arm in the coat sleeve, elbow, then a wide turned-back cuff.
    this.tube(b, c.coat, { x: 0, y: 0.03 * s, z: 0 }, { x: 0, y: -0.28 * s, z: 0 }, 0.08 * s, 0.062 * s);
    this.blob(b, c.coat, { x: 0, y: -0.28 * s, z: 0 }, 0.062 * s, { x: 1, y: 0.9, z: 1 });
    this.tube(b, c.coat, { x: 0, y: -0.28 * s, z: 0 }, { x: 0, y: -0.4 * s, z: 0 }, 0.062 * s, 0.07 * s, 1, 8);
    this.tube(b, cuff, { x: 0, y: -0.38 * s, z: 0 }, { x: 0, y: -0.46 * s, z: 0 }, 0.075 * s, 0.085 * s, 1, 8);
    // Bare forearm and wrist.
    this.tube(b, c.skin, { x: 0, y: -0.44 * s, z: 0 }, { x: 0, y: -0.58 * s, z: 0 }, 0.052 * s, 0.042 * s, 1, 8);
    // Hand: a palm curled round, with the thumb closing over it. Read at arm's
    // length it is the difference between gripping a spoke and pointing at one.
    const hand = c.bone ? c.skin : 0xa9744b;
    this.blob(b, hand, { x: 0, y: -0.625 * s, z: 0.01 * s }, 0.052 * s, { x: 0.85, y: 1.05, z: 1.1 });
    this.tube(
      b,
      hand,
      { x: side * -0.015 * s, y: -0.655 * s, z: 0.045 * s },
      { x: side * -0.015 * s, y: -0.655 * s, z: -0.035 * s },
      0.038 * s,
      0.034 * s,
      1,
      7,
    );
    this.blob(b, hand, { x: side * 0.04 * s, y: -0.632 * s, z: 0.035 * s }, 0.024 * s, { x: 1, y: 1.5, z: 1 });
    this.attach(parent, b);
  }

  private buildLeg(parent: THREE.Group, c: AvatarColors, s: number): void {
    const b = new MeshBuilder();
    const cuff = new THREE.Color(c.boots).multiplyScalar(1.45).getHex();
    // Slops: baggy at the thigh, gathered just below the knee.
    this.tube(b, c.trousers, { x: 0, y: 0.02 * s, z: 0 }, { x: 0, y: -0.26 * s, z: 0 }, 0.095 * s, 0.09 * s);
    this.tube(b, c.trousers, { x: 0, y: -0.26 * s, z: 0 }, { x: 0, y: -0.44 * s, z: 0 }, 0.09 * s, 0.062 * s);
    // Sea boot: turned-down top, shaft, then the foot.
    this.tube(b, cuff, { x: 0, y: -0.4 * s, z: 0 }, { x: 0, y: -0.5 * s, z: 0 }, 0.105 * s, 0.085 * s, 1, 9);
    this.tube(b, c.boots, { x: 0, y: -0.48 * s, z: 0 }, { x: 0, y: -0.78 * s, z: 0 }, 0.082 * s, 0.07 * s, 1, 9);
    this.blob(b, c.boots, { x: 0, y: -0.79 * s, z: 0.035 * s }, 0.082 * s, { x: 0.95, y: 0.52, z: 1.75 });
    // Heel.
    this.blob(b, 0x1a140d, { x: 0, y: -0.815 * s, z: -0.02 * s }, 0.055 * s, { x: 0.9, y: 0.42, z: 0.9 });
    this.attach(parent, b);
  }

  /** Drives the rig. `speed` is horizontal metres per second. */
  update(dt: number, pose: AvatarPose, speed: number, lookPitch = 0, poseParam = 0): void {
    const stride = pose === 'run' ? 9.5 : 6.2;
    this.phase += dt * stride * clamp01(speed / (pose === 'run' ? 5.5 : 2.6)) + dt * 0.6;
    const walkBlend = clamp01(speed / 2.2);
    const swing = Math.sin(this.phase);
    const swing2 = Math.sin(this.phase * 2);

    // Reset per-frame so poses do not accumulate.
    this.root.rotation.set(0, 0, 0);
    this.hips.rotation.set(0, 0, 0);
    this.torso.rotation.set(0, 0, 0);
    this.head.rotation.set(0, 0, 0);
    this.hips.position.y = 0.88;

    switch (pose) {
      case 'walk':
      case 'run': {
        const amp = pose === 'run' ? 0.95 : 0.62;
        this.legLeft.rotation.x = swing * amp * walkBlend;
        this.legRight.rotation.x = -swing * amp * walkBlend;
        this.armLeft.rotation.x = -swing * amp * 0.75 * walkBlend;
        this.armRight.rotation.x = swing * amp * 0.6 * walkBlend;
        this.torso.rotation.z = swing * 0.05 * walkBlend;
        this.torso.rotation.x = walkBlend * (pose === 'run' ? 0.16 : 0.06);
        this.hips.position.y = 0.88 + Math.abs(swing2) * 0.035 * walkBlend;
        break;
      }
      case 'swim': {
        this.root.rotation.x = -1.15;
        this.hips.position.y = 0.35;
        this.legLeft.rotation.x = swing * 0.4;
        this.legRight.rotation.x = -swing * 0.4;
        this.armLeft.rotation.x = -1.6 + Math.sin(this.phase * 1.4) * 1.3;
        this.armRight.rotation.x = -1.6 + Math.sin(this.phase * 1.4 + Math.PI) * 1.3;
        this.armLeft.rotation.z = 0.25;
        this.armRight.rotation.z = -0.25;
        break;
      }
      case 'climb': {
        const c = Math.sin(this.phase * 1.5);
        this.armLeft.rotation.x = -2.4 + c * 0.5;
        this.armRight.rotation.x = -2.4 - c * 0.5;
        this.legLeft.rotation.x = -0.5 - c * 0.35;
        this.legRight.rotation.x = -0.5 + c * 0.35;
        this.torso.rotation.x = 0.12;
        break;
      }
      case 'fall': {
        this.armLeft.rotation.x = -2.2;
        this.armRight.rotation.x = -2.2;
        this.armLeft.rotation.z = 0.5;
        this.armRight.rotation.z = -0.5;
        this.legLeft.rotation.x = 0.4;
        this.legRight.rotation.x = -0.25;
        break;
      }
      case 'dig': {
        const d = Math.sin(this.phase * 2.4);
        this.armLeft.rotation.x = -1.1 + d * 0.7;
        this.armRight.rotation.x = -1.0 + d * 0.8;
        this.torso.rotation.x = 0.4 + d * 0.28;
        this.legLeft.rotation.x = 0.2;
        this.legRight.rotation.x = -0.15;
        break;
      }
      case 'swing': {
        this.blendSwing = 1;
        break;
      }
      case 'helm': {
        // Both hands on the wheel: the arms rise and fall with the spokes as the
        // helm is put over, and the shoulders lean into the turn.
        // Reaching slightly down and out, so the fists land on the rim of a
        // one-metre wheel rather than in the air above it.
        const turn = clamp01(Math.abs(poseParam)) * Math.sign(poseParam);
        this.armLeft.rotation.x = -1.32 - turn * 0.4;
        this.armRight.rotation.x = -1.32 + turn * 0.4;
        this.armLeft.rotation.z = 0.17;
        this.armRight.rotation.z = -0.17;
        this.torso.rotation.z = turn * 0.06;
        this.torso.rotation.x = 0.05;
        this.legLeft.rotation.x = 0.12;
        this.legRight.rotation.x = -0.1;
        break;
      }
      case 'crank': {
        // Heaving round the capstan bars.
        const c = Math.sin(this.phase * 1.6);
        this.armLeft.rotation.x = -1.5 + c * 0.3;
        this.armRight.rotation.x = -1.5 - c * 0.3;
        this.armLeft.rotation.z = 0.2;
        this.armRight.rotation.z = -0.2;
        this.torso.rotation.x = 0.34;
        this.legLeft.rotation.x = 0.3 + c * 0.2;
        this.legRight.rotation.x = -0.2 - c * 0.2;
        break;
      }
      case 'aim': {
        this.armRight.rotation.x = -1.5 + lookPitch * 0.8;
        this.armRight.rotation.z = -0.18;
        this.armLeft.rotation.x = -0.6;
        this.torso.rotation.y = -0.25;
        break;
      }
      default: {
        // Idle: breathe, and sway as if on a moving deck.
        const idle = Math.sin(this.phase * 0.9);
        this.armLeft.rotation.x = idle * 0.06;
        this.armRight.rotation.x = -idle * 0.06;
        this.armLeft.rotation.z = 0.09;
        this.armRight.rotation.z = -0.09;
        this.torso.rotation.z = idle * 0.02;
        break;
      }
    }

    // A sword swing overlays whatever the legs are doing.
    if (this.blendSwing > 0.001) {
      const t = 1 - this.blendSwing;
      this.armRight.rotation.x = lerp(-2.3, 0.9, Math.min(1, t * 2.4));
      this.armRight.rotation.z = lerp(-0.9, 0.5, Math.min(1, t * 2.4));
      this.torso.rotation.y = lerp(0.6, -0.5, Math.min(1, t * 2.2));
      this.blendSwing = damp(this.blendSwing, 0, 6, dt);
    }

    this.head.rotation.x = lookPitch * 0.55;
  }

  /** Triggers the sword swing overlay. */
  playSwing(): void {
    this.blendSwing = 1;
  }

  /** Facing direction in radians (bearing, matching the ship convention). */
  setFacing(bearing: number): void {
    this.root.rotation.y = -bearing + Math.PI / 2;
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  dispose(): void {
    this.root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
    this.material.dispose();
  }

  /** Random walk phase so a crowd of skeletons is not in lockstep. */
  randomizePhase(): void {
    this.phase = Math.random() * TAU;
  }
}
