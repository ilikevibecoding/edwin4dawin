import * as THREE from 'three';
import { MeshBuilder } from '../core/meshbuilder';
import { clamp01, damp, lerp, TAU } from '../core/math';

export type AvatarPose = 'idle' | 'walk' | 'run' | 'swim' | 'climb' | 'fall' | 'dig' | 'swing' | 'aim';

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

  private attach(parent: THREE.Group, builder: MeshBuilder): void {
    const mesh = new THREE.Mesh(builder.build(), this.material);
    parent.add(mesh);
  }

  private buildTorso(c: AvatarColors, s: number): void {
    const b = new MeshBuilder();
    // Shirt, then an open coat over it, then a sash and belt.
    b.addBox({ x: 0, y: 0.3 * s, z: 0 }, { x: 0.44 * s, y: 0.62 * s, z: 0.26 * s }, c.shirt);
    b.addBox({ x: 0, y: 0.34 * s, z: -0.02 * s }, { x: 0.48 * s, y: 0.5 * s, z: 0.3 * s }, c.coat);
    b.addBox({ x: 0, y: 0.06 * s, z: 0 }, { x: 0.46 * s, y: 0.1 * s, z: 0.29 * s }, c.boots);
    b.addBox({ x: 0.02 * s, y: 0.24 * s, z: 0.15 * s }, { x: 0.5 * s, y: 0.12 * s, z: 0.06 * s }, c.sash);
    if (c.bone) {
      // Ribs showing through a rotted coat.
      for (let i = 0; i < 3; i++) {
        b.addBox({ x: 0, y: (0.2 + i * 0.12) * s, z: 0.14 * s }, { x: 0.3 * s, y: 0.05 * s, z: 0.05 * s }, c.skin);
      }
    }
    this.attach(this.torso, b);
  }

  private buildHead(c: AvatarColors, s: number): void {
    const b = new MeshBuilder();
    b.addBox({ x: 0, y: 0.11 * s, z: 0 }, { x: 0.24 * s, y: 0.26 * s, z: 0.24 * s }, c.skin);
    // Eyes, or empty sockets for the undead.
    for (const dx of [-0.06, 0.06]) {
      b.addBox({ x: dx * s, y: 0.14 * s, z: 0.12 * s }, { x: 0.05 * s, y: 0.05 * s, z: 0.02 * s }, c.bone ? 0x140f0a : 0x241a12);
    }
    if (!c.bone) {
      b.addBox({ x: 0, y: 0.02 * s, z: 0.1 * s }, { x: 0.2 * s, y: 0.1 * s, z: 0.08 * s }, 0x4a3527);
      // Tricorn: brim plus crown.
      b.addBox({ x: 0, y: 0.25 * s, z: 0 }, { x: 0.42 * s, y: 0.04 * s, z: 0.36 * s }, c.hat);
      b.addBox({ x: 0, y: 0.31 * s, z: 0 }, { x: 0.24 * s, y: 0.12 * s, z: 0.24 * s }, c.hat);
      b.addBox({ x: 0, y: 0.27 * s, z: -0.16 * s }, { x: 0.16 * s, y: 0.05 * s, z: 0.1 * s }, 0xd9c48a);
    } else {
      b.addBox({ x: 0, y: 0.03 * s, z: 0.09 * s }, { x: 0.16 * s, y: 0.06 * s, z: 0.08 * s }, c.skin);
      b.addBox({ x: 0, y: 0.26 * s, z: 0 }, { x: 0.3 * s, y: 0.05 * s, z: 0.28 * s }, c.hat);
    }
    this.attach(this.head, b);
  }

  private buildArm(parent: THREE.Group, c: AvatarColors, s: number, side: number): void {
    const b = new MeshBuilder();
    b.addBox({ x: 0, y: -0.18 * s, z: 0 }, { x: 0.14 * s, y: 0.36 * s, z: 0.16 * s }, c.coat);
    b.addBox({ x: 0, y: -0.46 * s, z: 0 }, { x: 0.12 * s, y: 0.26 * s, z: 0.14 * s }, c.bone ? c.skin : c.skin);
    b.addBox({ x: side * 0.01 * s, y: -0.62 * s, z: 0.02 * s }, { x: 0.13 * s, y: 0.12 * s, z: 0.16 * s }, c.bone ? c.skin : 0x8a5a3a);
    this.attach(parent, b);
  }

  private buildLeg(parent: THREE.Group, c: AvatarColors, s: number): void {
    const b = new MeshBuilder();
    b.addBox({ x: 0, y: -0.24 * s, z: 0 }, { x: 0.17 * s, y: 0.48 * s, z: 0.19 * s }, c.trousers);
    b.addBox({ x: 0, y: -0.62 * s, z: 0 }, { x: 0.16 * s, y: 0.3 * s, z: 0.17 * s }, c.boots);
    b.addBox({ x: 0, y: -0.82 * s, z: 0.04 * s }, { x: 0.17 * s, y: 0.1 * s, z: 0.26 * s }, c.boots);
    this.attach(parent, b);
  }

  /** Drives the rig. `speed` is horizontal metres per second. */
  update(dt: number, pose: AvatarPose, speed: number, lookPitch = 0): void {
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
