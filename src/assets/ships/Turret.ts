import * as THREE from 'three';
import { darkMechanical, gunmetal } from '../materials';
import { box, cyl, merge, sphere } from '../geometry';
import { clamp, damp } from '../../core/math';

/**
 * Animated twin-barrel turret.
 *
 * Yaw and pitch are separate nodes so tracking reads as machinery rather than
 * a mesh being pointed with lookAt(). Elevation is clamped to a plausible arc
 * and slewing is rate-limited, which makes the turrets look heavy.
 */
export class Turret {
  readonly root = new THREE.Group();
  readonly yawNode = new THREE.Group();
  readonly pitchNode = new THREE.Group();
  readonly muzzles: THREE.Object3D[] = [];

  private targetYaw = 0;
  private targetPitch = 0;
  private currentYaw = 0;
  private currentPitch = 0;
  private recoil = 0;
  private readonly worldTmp = new THREE.Vector3();
  private readonly localTmp = new THREE.Vector3();
  private readonly invMatrix = new THREE.Matrix4();

  /** Seconds between shots; the battle system reads/writes this. */
  cooldown = 0;

  constructor(readonly scale = 1, readonly barrelLength = 9) {
    this.root.name = 'Turret';
    const s = scale;

    const base = merge([
      cyl(3.4 * s, 4.2 * s, 1.6 * s, 12, { pos: [0, 0.8 * s, 0] }),
      box(7.2 * s, 0.5 * s, 7.2 * s, { pos: [0, 0.25 * s, 0] }),
    ]);
    const baseMesh = new THREE.Mesh(base, darkMechanical());
    baseMesh.castShadow = true;
    this.root.add(baseMesh);

    this.yawNode.position.y = 1.6 * s;
    this.root.add(this.yawNode);

    const housing = merge([
      cyl(2.9 * s, 3.1 * s, 2.2 * s, 12, { pos: [0, 1.1 * s, 0] }),
      box(5.4 * s, 2.4 * s, 4.2 * s, { pos: [0, 1.6 * s, -0.4 * s] }),
      box(1.2 * s, 1.4 * s, 1.2 * s, { pos: [0, 2.9 * s, -1.4 * s] }),
    ]);
    const housingMesh = new THREE.Mesh(housing, gunmetal());
    housingMesh.castShadow = true;
    this.yawNode.add(housingMesh);

    this.pitchNode.position.set(0, 1.8 * s, 0);
    this.yawNode.add(this.pitchNode);

    const bl = barrelLength * s;
    const barrelParts: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      const x = side * 1.35 * s;
      barrelParts.push(cyl(0.55 * s, 0.7 * s, bl, 8, { pos: [x, 0, bl * 0.5], rot: [Math.PI / 2, 0, 0] }));
      barrelParts.push(cyl(0.95 * s, 0.95 * s, 1.1 * s, 8, { pos: [x, 0, bl * 0.86], rot: [Math.PI / 2, 0, 0] }));
      barrelParts.push(sphere(1.0 * s, 8, 6, { pos: [x, 0, 0.4 * s] }));
      const muzzle = new THREE.Object3D();
      muzzle.position.set(x, 0, bl * 0.95);
      this.pitchNode.add(muzzle);
      this.muzzles.push(muzzle);
    }
    barrelParts.push(box(3.6 * s, 1.6 * s, 2.6 * s, { pos: [0, 0, 0.2 * s] }));
    const barrels = new THREE.Mesh(merge(barrelParts), gunmetal());
    barrels.castShadow = true;
    this.pitchNode.add(barrels);
  }

  /** Point the turret at a world-space position. */
  aimAt(worldPoint: THREE.Vector3): void {
    this.root.updateWorldMatrix(true, false);
    this.invMatrix.copy(this.root.matrixWorld).invert();
    this.localTmp.copy(worldPoint).applyMatrix4(this.invMatrix);
    this.targetYaw = Math.atan2(this.localTmp.x, this.localTmp.z);
    const horiz = Math.hypot(this.localTmp.x, this.localTmp.z);
    this.targetPitch = clamp(Math.atan2(this.localTmp.y - 1.8 * this.scale, horiz), -0.22, 1.2);
  }

  /** Rest position when there is nothing to track. */
  standDown(yaw = 0, pitch = 0.35): void {
    this.targetYaw = yaw;
    this.targetPitch = pitch;
  }

  fire(): void {
    this.recoil = 1;
  }

  muzzleWorld(index: number, out: THREE.Vector3): THREE.Vector3 {
    this.muzzles[index % this.muzzles.length].getWorldPosition(out);
    return out;
  }

  update(dt: number): void {
    // Shortest-path yaw damping.
    let delta = this.targetYaw - this.currentYaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    this.currentYaw += delta * (1 - Math.exp(-dt / 0.5));
    this.currentPitch = damp(this.currentPitch, this.targetPitch, 0.45, dt);
    this.yawNode.rotation.y = this.currentYaw;
    this.pitchNode.rotation.x = -this.currentPitch;

    this.recoil = damp(this.recoil, 0, 0.06, dt);
    this.pitchNode.position.z = -this.recoil * 0.8 * this.scale;
    if (this.cooldown > 0) this.cooldown -= dt;
    this.worldTmp.set(0, 0, 0);
  }
}
