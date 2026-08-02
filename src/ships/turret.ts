/**
 * A gimballed weapon turret: yaw ring, pitch cradle and barrels.
 *
 * Turrets track a world-space target with limited slew rate and clamped
 * elevation, so they lag realistically instead of snapping.
 */

import * as THREE from 'three';
import { angleDelta, clamp } from '../core/math';
import { metalMaterial, emissiveMaterial, PALETTE } from '../assets/materials';
import { roundedBox } from '../assets/geometry';

export interface TurretOptions {
  scale?: number;
  barrels?: number;
  hullColor?: string;
  boltColor?: string;
  /** Radians per second of yaw/pitch slew. */
  slew?: number;
  minPitch?: number;
  maxPitch?: number;
  name?: string;
}

export class Turret {
  readonly group = new THREE.Group();
  private yawNode = new THREE.Group();
  private pitchNode = new THREE.Group();
  private muzzles: THREE.Object3D[] = [];
  private muzzleGlows: THREE.Mesh[] = [];

  private targetYaw = 0;
  private targetPitch = 0;
  private yaw = 0;
  private pitch = 0;
  private readonly slew: number;
  private readonly minPitch: number;
  private readonly maxPitch: number;
  private flashTimer = 0;
  private nextBarrel = 0;

  /** Set false to make the turret return to its rest pose. */
  tracking = true;

  constructor(o: TurretOptions = {}) {
    const s = o.scale ?? 1;
    const barrels = o.barrels ?? 2;
    this.slew = o.slew ?? 1.1;
    this.minPitch = o.minPitch ?? -0.22;
    this.maxPitch = o.maxPitch ?? 1.15;
    this.group.name = o.name ?? 'Turret';

    const mat = metalMaterial('turret', o.hullColor ?? PALETTE.imperialHullDark, 0.58, 0.8);
    const dark = metalMaterial('turretDark', '#2c3036', 0.7, 0.7);

    // Fixed base ring
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5 * s, 1.85 * s, 0.55 * s, 12), dark);
    base.position.y = 0.27 * s;
    this.group.add(base);

    // Rotating housing
    const housing = new THREE.Mesh(roundedBox(2.6 * s, 1.25 * s, 2.3 * s, 0.25 * s), mat);
    housing.position.y = 1.05 * s;
    this.yawNode.add(housing);
    const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.62 * s, 0.62 * s, 2.9 * s, 10), dark);
    shoulder.rotation.z = Math.PI / 2;
    shoulder.position.y = 1.5 * s;
    this.yawNode.add(shoulder);

    // Pitch cradle + barrels
    this.pitchNode.position.y = 1.5 * s;
    const cradle = new THREE.Mesh(roundedBox(1.9 * s, 1.0 * s, 1.5 * s, 0.18 * s), mat);
    this.pitchNode.add(cradle);

    const barrelGeo = new THREE.CylinderGeometry(0.2 * s, 0.26 * s, 4.6 * s, 8);
    const tipGeo = new THREE.CylinderGeometry(0.3 * s, 0.24 * s, 0.5 * s, 8);
    const glowMat = emissiveMaterial('muzzle', o.boltColor ?? PALETTE.laserGreen, 5, {
      transparent: true,
      opacity: 0,
      toneMapped: false,
    }).clone();
    glowMat.transparent = true;
    glowMat.opacity = 0;

    for (let i = 0; i < barrels; i++) {
      const off = barrels === 1 ? 0 : (i - (barrels - 1) / 2) * 0.72 * s;
      const barrel = new THREE.Mesh(barrelGeo, dark);
      barrel.rotation.x = -Math.PI / 2;
      barrel.position.set(off, 0.12 * s, -2.4 * s);
      this.pitchNode.add(barrel);
      const tip = new THREE.Mesh(tipGeo, mat);
      tip.rotation.x = -Math.PI / 2;
      tip.position.set(off, 0.12 * s, -4.6 * s);
      this.pitchNode.add(tip);

      const muzzle = new THREE.Object3D();
      muzzle.position.set(off, 0.12 * s, -4.95 * s);
      this.pitchNode.add(muzzle);
      this.muzzles.push(muzzle);

      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.55 * s, 8, 6), glowMat);
      glow.position.copy(muzzle.position);
      glow.visible = false;
      this.pitchNode.add(glow);
      this.muzzleGlows.push(glow);
    }

    this.yawNode.add(this.pitchNode);
    this.group.add(this.yawNode);
  }

  /** World-space muzzle position of the barrel that will fire next. */
  muzzleWorld(out = new THREE.Vector3()): THREE.Vector3 {
    return this.muzzles[this.nextBarrel % this.muzzles.length].getWorldPosition(out);
  }

  /** World-space forward direction of the barrels. */
  aimDirection(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(0, 0, -1).applyQuaternion(this.pitchNode.getWorldQuaternion(new THREE.Quaternion())).normalize();
  }

  /** Point the turret at a world-space position (resolved over time). */
  aimAt(worldTarget: THREE.Vector3): void {
    const local = this.group.worldToLocal(worldTarget.clone());
    this.targetYaw = Math.atan2(-local.x, -local.z);
    const flat = Math.hypot(local.x, local.z);
    this.targetPitch = clamp(Math.atan2(local.y, flat), this.minPitch, this.maxPitch);
  }

  /** Trigger a muzzle flash; the bolt itself is spawned by the caller. */
  flash(): void {
    this.flashTimer = 0.075;
    const glow = this.muzzleGlows[this.nextBarrel % this.muzzleGlows.length];
    glow.visible = true;
    this.nextBarrel++;
  }

  update(dt: number): void {
    const step = this.slew * dt;
    const yawTo = this.tracking ? this.targetYaw : 0;
    const pitchTo = this.tracking ? this.targetPitch : 0.12;
    const dy = angleDelta(this.yaw, yawTo);
    const dp = angleDelta(this.pitch, pitchTo);
    this.yaw += clamp(dy, -step, step);
    this.pitch += clamp(dp, -step, step);
    this.yawNode.rotation.y = this.yaw;
    this.pitchNode.rotation.x = -this.pitch;

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      const k = Math.max(0, this.flashTimer / 0.075);
      for (const g of this.muzzleGlows) {
        if (!g.visible) continue;
        (g.material as THREE.MeshStandardMaterial).opacity = k;
        g.scale.setScalar(0.6 + k * 0.9);
        if (k <= 0) g.visible = false;
      }
    }
  }

  /** True when the barrels are pointing close enough to fire convincingly. */
  onTarget(toleranceRad = 0.14): boolean {
    return (
      Math.abs(angleDelta(this.yaw, this.targetYaw)) < toleranceRad &&
      Math.abs(angleDelta(this.pitch, this.targetPitch)) < toleranceRad
    );
  }
}
