import * as THREE from 'three';
import { MeshBuilder } from '../core/meshbuilder';
import { clamp01, damp, lerp, TAU } from '../core/math';

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

export const PIRATE_COLORS: AvatarColors = {
  skin: 0xc0895c,
  shirt: 0xd8cbaa,
  coat: 0x7a3a2c,
  trousers: 0x494036,
  boots: 0x2c2318,
  hat: 0x27201a,
  sash: 0x9c3b2e,
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
    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.78,
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
    // Chest tapering into the waist, then an open coat over the top of it.
    this.tube(b, c.shirt, { x: 0, y: 0.6 * s, z: 0 }, { x: 0, y: 0.08 * s, z: 0 }, 0.2 * s, 0.15 * s, 0.62);
    this.tube(b, c.coat, { x: 0, y: 0.56 * s, z: -0.01 * s }, { x: 0, y: 0.12 * s, z: -0.01 * s }, 0.22 * s, 0.19 * s, 0.66);
    // Coat skirts flaring below the belt.
    this.tube(b, c.coat, { x: 0, y: 0.14 * s, z: 0 }, { x: 0, y: -0.12 * s, z: 0 }, 0.2 * s, 0.26 * s, 0.7);
    // Shoulders.
    for (const side of [-1, 1]) {
      this.blob(b, c.coat, { x: side * 0.19 * s, y: 0.54 * s, z: 0 }, 0.11 * s, { x: 1, y: 0.9, z: 0.8 });
    }
    // Belt and sash.
    this.tube(b, c.boots, { x: 0, y: 0.16 * s, z: 0 }, { x: 0, y: 0.08 * s, z: 0 }, 0.2 * s, 0.2 * s, 0.68);
    this.tube(b, c.sash, { x: -0.02 * s, y: 0.3 * s, z: 0.02 * s }, { x: 0.06 * s, y: 0.14 * s, z: 0.02 * s }, 0.19 * s, 0.19 * s, 0.6, 8);
    // Collar.
    this.tube(b, c.coat, { x: 0, y: 0.66 * s, z: -0.02 * s }, { x: 0, y: 0.56 * s, z: -0.02 * s }, 0.1 * s, 0.16 * s, 0.8);
    if (c.bone) {
      for (let i = 0; i < 3; i++) {
        b.addBox({ x: 0, y: (0.2 + i * 0.12) * s, z: 0.13 * s }, { x: 0.3 * s, y: 0.05 * s, z: 0.05 * s }, c.skin);
      }
    }
    this.attach(this.torso, b);
  }

  private buildHead(c: AvatarColors, s: number): void {
    const b = new MeshBuilder();
    // Neck and skull.
    this.tube(b, c.skin, { x: 0, y: 0.02 * s, z: 0 }, { x: 0, y: -0.06 * s, z: 0 }, 0.06 * s, 0.07 * s, 1, 8);
    this.blob(b, c.skin, { x: 0, y: 0.12 * s, z: 0 }, 0.125 * s, { x: 0.94, y: 1.06, z: 1 });
    this.blob(b, c.skin, { x: 0, y: 0.11 * s, z: 0.1 * s }, 0.035 * s, { x: 1, y: 1.1, z: 1.3 });
    for (const dx of [-0.055, 0.055]) {
      this.blob(b, c.bone ? 0x140f0a : 0x241a12, { x: dx * s, y: 0.15 * s, z: 0.105 * s }, 0.022 * s, { x: 1.2, y: 1, z: 0.5 });
    }
    if (!c.bone) {
      // Beard and a tricorn: brim, crown, and a feather in the band.
      this.blob(b, 0x4a3527, { x: 0, y: 0.03 * s, z: 0.055 * s }, 0.085 * s, { x: 1.05, y: 0.9, z: 1.0 });
      const brim = new THREE.CylinderGeometry(0.23 * s, 0.23 * s, 0.022 * s, 3, 1);
      b.addGeometry(brim, c.hat, new THREE.Matrix4().makeTranslation(0, 0.235 * s, 0));
      brim.dispose();
      this.tube(b, c.hat, { x: 0, y: 0.35 * s, z: 0 }, { x: 0, y: 0.23 * s, z: 0 }, 0.1 * s, 0.14 * s, 1, 8);
      this.blob(b, 0xd9c48a, { x: 0.05 * s, y: 0.3 * s, z: -0.1 * s }, 0.045 * s, { x: 0.5, y: 0.6, z: 1.6 });
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
    // Upper arm in the coat sleeve, forearm bare, then a cuff and a fist.
    this.tube(b, c.coat, { x: 0, y: 0.02 * s, z: 0 }, { x: 0, y: -0.3 * s, z: 0 }, 0.075 * s, 0.06 * s);
    this.tube(b, c.coat, { x: 0, y: -0.28 * s, z: 0 }, { x: 0, y: -0.36 * s, z: 0 }, 0.075 * s, 0.065 * s, 1, 8);
    this.tube(b, c.skin, { x: 0, y: -0.34 * s, z: 0 }, { x: 0, y: -0.56 * s, z: 0 }, 0.055 * s, 0.045 * s, 1, 8);
    this.blob(b, c.bone ? c.skin : 0x9c6a44, { x: side * 0.005 * s, y: -0.6 * s, z: 0.01 * s }, 0.055 * s, {
      x: 1,
      y: 1.05,
      z: 0.85,
    });
    this.attach(parent, b);
  }

  private buildLeg(parent: THREE.Group, c: AvatarColors, s: number): void {
    const b = new MeshBuilder();
    this.tube(b, c.trousers, { x: 0, y: 0, z: 0 }, { x: 0, y: -0.44 * s, z: 0 }, 0.085 * s, 0.065 * s);
    // Sea boot: turned-down top, shaft, then the foot.
    this.tube(b, c.boots, { x: 0, y: -0.4 * s, z: 0 }, { x: 0, y: -0.48 * s, z: 0 }, 0.095 * s, 0.08 * s, 1, 8);
    this.tube(b, c.boots, { x: 0, y: -0.46 * s, z: 0 }, { x: 0, y: -0.78 * s, z: 0 }, 0.08 * s, 0.07 * s, 1, 8);
    this.blob(b, c.boots, { x: 0, y: -0.79 * s, z: 0.03 * s }, 0.08 * s, { x: 0.95, y: 0.5, z: 1.7 });
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
        const turn = clamp01(Math.abs(poseParam)) * Math.sign(poseParam);
        this.armLeft.rotation.x = -1.52 - turn * 0.42;
        this.armRight.rotation.x = -1.52 + turn * 0.42;
        this.armLeft.rotation.z = 0.3;
        this.armRight.rotation.z = -0.3;
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
