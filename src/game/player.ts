/**
 * Player controller: third-person free roam.
 *
 * WASD moves relative to the camera, the mouse orbits an over-the-shoulder rig,
 * and proximity to an interactable raises a contextual prompt. Collision is
 * axis-separated against a small list of boxes per set, which is plenty for
 * dressed interiors and a street.
 */
import * as THREE from 'three';
import type { Character } from '../engine/character';
import { clamp, damp, TAU } from '../engine/math';
import type { Collider, Interactable } from '../sets/types';
import type { PostFX } from '../engine/postfx';

export type PlayerInput = {
  forward: number;
  right: number;
  run: boolean;
};

export type BotOrder = {
  /** World-space destination. */
  to: THREE.Vector3;
  run?: boolean;
  /** Reached when within this distance. */
  radius?: number;
};

const WALK = 1.35;
const RUN = 2.75;

export class Player {
  character: Character;
  camera: THREE.PerspectiveCamera;
  /** Camera orbit state. */
  yaw = 0;
  pitch = 0.06;
  distance = 2.85;
  private targetDistance = 2.85;
  private colliders: Collider[] = [];
  private interactables: Interactable[] = [];
  private bounds = { minX: -60, maxX: 60, minZ: -60, maxZ: 60 };
  private camPos = new THREE.Vector3();
  private camAim = new THREE.Vector3();
  private input: PlayerInput = { forward: 0, right: 0, run: false };
  private bot: BotOrder | null = null;
  private speedNow = 0;
  private fx: PostFX | null = null;
  /**
   * A dedicated character key that trails the camera. Sets are lit for their
   * staged shots, so free roam needs its own light or the protagonist walks
   * into pockets of pitch black.
   */
  private keyLight = new THREE.SpotLight(0xd2e4ff, 0, 16, 0.62, 0.85, 2);
  /** Lantern at the lens so the floor around the player reads at all. */
  private fillLight = new THREE.PointLight(0xbcd2ee, 0, 13, 2);
  private rimLight = new THREE.SpotLight(0x9fd0ff, 0, 14, 0.7, 0.9, 2);
  private ambLift = new THREE.HemisphereLight(0x2c4260, 0x11161d, 0);
  private scene: THREE.Object3D | null = null;
  /** Interactables already used, so prompts do not repeat. */
  used = new Set<string>();
  nearest: Interactable | null = null;
  enabled = false;
  private initialised = false;

  constructor(character: Character, camera: THREE.PerspectiveCamera) {
    this.character = character;
    this.camera = camera;
    this.yaw = character.group.rotation.y + Math.PI;
  }

  attachPost(fx: PostFX): void {
    this.fx = fx;
  }

  configure(opts: {
    colliders?: Collider[];
    interactables?: Interactable[];
    bounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
    scene?: THREE.Object3D;
    /** Scale the follow rig for bright interiors. */
    keyScale?: number;
  }): void {
    this.colliders = opts.colliders ?? [];
    this.interactables = opts.interactables ?? [];
    if (opts.bounds) this.bounds = opts.bounds;
    this.keyScale = opts.keyScale ?? 1;
    if (opts.scene && this.scene !== opts.scene) {
      this.scene = opts.scene;
      for (const l of [this.keyLight, this.rimLight]) {
        l.castShadow = false;
        this.scene.add(l, l.target);
      }
      this.scene.add(this.fillLight, this.ambLift);
    }
  }
  private keyScale = 1;

  /** Hand control to the player, snapping the orbit behind the character. */
  activate(): void {
    this.enabled = true;
    this.keyLight.intensity = 20 * this.keyScale;
    this.rimLight.intensity = 9 * this.keyScale;
    this.fillLight.intensity = 20 * this.keyScale;
    this.ambLift.intensity = 1.1 * this.keyScale;
    this.yaw = this.character.group.rotation.y + Math.PI;
    this.pitch = 0.08;
    this.initialised = false;
  }
  deactivate(): void {
    this.enabled = false;
    this.keyLight.intensity = 0;
    this.rimLight.intensity = 0;
    this.fillLight.intensity = 0;
    this.ambLift.intensity = 0;
    this.character.drive(0, 0, 0);
    this.input.forward = 0;
    this.input.right = 0;
    this.bot = null;
  }

  setInput(i: Partial<PlayerInput>): void {
    Object.assign(this.input, i);
  }

  look(dx: number, dy: number, sensitivity = 0.0026): void {
    this.yaw -= dx * sensitivity;
    this.pitch = clamp(this.pitch - dy * sensitivity, -0.42, 0.75);
    while (this.yaw > Math.PI) this.yaw -= TAU;
    while (this.yaw < -Math.PI) this.yaw += TAU;
  }

  zoom(delta: number): void {
    this.targetDistance = clamp(this.targetDistance + delta * 0.0016, 1.5, 5.5);
  }

  /** Scripted walking, used by the autoplay demo and film capture. */
  order(o: BotOrder | null): void {
    this.bot = o;
  }
  get botDone(): boolean {
    if (!this.bot) return true;
    const p = this.character.group.position;
    return Math.hypot(this.bot.to.x - p.x, this.bot.to.z - p.z) <= (this.bot.radius ?? 0.6);
  }

  /* -------------------------------------------------------------- collision */

  private blocked(x: number, z: number, radius = 0.32): boolean {
    if (x < this.bounds.minX + radius || x > this.bounds.maxX - radius) return true;
    if (z < this.bounds.minZ + radius || z > this.bounds.maxZ - radius) return true;
    for (const c of this.colliders) {
      if (
        x > c.min[0] - radius && x < c.max[0] + radius &&
        z > c.min[1] - radius && z < c.max[1] + radius
      ) return true;
    }
    return false;
  }

  /* ---------------------------------------------------------------- update */

  update(dt: number): void {
    const ch = this.character;
    const pos = ch.group.position;

    let fwd = this.input.forward;
    let side = this.input.right;
    let run = this.input.run;

    // Bot orders steer in world space; convert to camera-relative input so the
    // same movement code (and animation) drives both player and demo.
    if (this.bot) {
      const dx = this.bot.to.x - pos.x;
      const dz = this.bot.to.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > (this.bot.radius ?? 0.6)) {
        const nx = dx / dist, nz = dz / dist;
        // Ease off near the destination so the stop reads naturally.
        const throttle = clamp(dist / 1.4, 0.25, 1);
        const camFwdX = Math.sin(this.yaw + Math.PI), camFwdZ = Math.cos(this.yaw + Math.PI);
        fwd = (nx * camFwdX + nz * camFwdZ) * throttle;
        side = (nx * camFwdZ - nz * camFwdX) * throttle;
        run = this.bot.run ?? false;
        // Swing the camera to trail the direction of travel.
        const want = Math.atan2(nx, nz) + Math.PI;
        let d = want - this.yaw;
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        this.yaw += d * (1 - Math.exp(-1.6 * dt));
      } else {
        fwd = 0;
        side = 0;
      }
    }

    const mag = Math.min(1, Math.hypot(fwd, side));
    if (mag > 0.02 && this.enabled) {
      // Camera-relative basis on the ground plane.
      const fx = Math.sin(this.yaw + Math.PI);
      const fz = Math.cos(this.yaw + Math.PI);
      const rx = fz;
      const rz = -fx;
      let dirX = fx * fwd + rx * side;
      let dirZ = fz * fwd + rz * side;
      const len = Math.hypot(dirX, dirZ) || 1;
      dirX /= len;
      dirZ /= len;

      const speed = (run ? RUN : WALK) * mag;
      this.speedNow = damp(this.speedNow, speed, 10, dt);
      const step = this.speedNow * dt;

      // Axis-separated resolution gives free sliding along walls.
      const nx = pos.x + dirX * step;
      const nz = pos.z + dirZ * step;
      if (!this.blocked(nx, pos.z)) pos.x = nx;
      if (!this.blocked(pos.x, nz)) pos.z = nz;

      ch.drive(dirX, dirZ, this.speedNow);
    } else {
      this.speedNow = damp(this.speedNow, 0, 12, dt);
      ch.drive(0, 0, 0);
    }

    /* ---- third-person camera ---- */
    const head = ch.worldPoint('headCenter', new THREE.Vector3());
    const aim = head.clone().add(new THREE.Vector3(0, -0.06, 0));
    this.distance = damp(this.distance, this.targetDistance, 6, dt);
    const cp = Math.cos(this.pitch);
    const desired = new THREE.Vector3(
      aim.x + Math.sin(this.yaw) * cp * this.distance,
      aim.y + Math.sin(this.pitch) * this.distance + 0.28,
      aim.z + Math.cos(this.yaw) * cp * this.distance,
    );
    // Keep the camera out of the floor and out of solid boxes.
    desired.y = Math.max(desired.y, 0.45);
    let d = this.distance;
    while (d > 0.9 && this.blocked(desired.x, desired.z, 0.25)) {
      d -= 0.25;
      desired.set(
        aim.x + Math.sin(this.yaw) * cp * d,
        Math.max(0.45, aim.y + Math.sin(this.pitch) * d + 0.28),
        aim.z + Math.cos(this.yaw) * cp * d,
      );
    }
    if (!this.initialised) {
      this.camPos.copy(desired);
      this.camAim.copy(aim);
      this.initialised = true;
    } else {
      this.camPos.lerp(desired, 1 - Math.exp(-9 * dt));
      this.camAim.lerp(aim, 1 - Math.exp(-13 * dt));
    }
    // Slight shoulder offset so the character does not block the centre.
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);
    this.camera.position.set(this.camPos.x + rightX * 0.24, this.camPos.y, this.camPos.z + rightZ * 0.24);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.camAim);
    if (this.camera.fov !== 52) {
      this.camera.fov = 52;
      this.camera.updateProjectionMatrix();
    }
    // Follow rig: three-quarter key from camera left, rim from the far side.
    const chest = aim.y - 0.35;
    const kx = Math.cos(this.yaw + 0.9);
    const kz = -Math.sin(this.yaw + 0.9);
    this.keyLight.position.set(pos.x + kx * 2.6 + Math.sin(this.yaw) * 1.6, chest + 2.5, pos.z + kz * 2.6 + Math.cos(this.yaw) * 1.6);
    this.keyLight.target.position.set(pos.x, chest, pos.z);
    this.rimLight.position.set(pos.x - kx * 2.2 - Math.sin(this.yaw) * 2.0, chest + 1.9, pos.z - kz * 2.2 - Math.cos(this.yaw) * 2.0);
    this.rimLight.target.position.set(pos.x, chest, pos.z);
    this.fillLight.position.set(
      this.camera.position.x + (aim.x - this.camera.position.x) * 0.35,
      this.camera.position.y - 0.2,
      this.camera.position.z + (aim.z - this.camera.position.z) * 0.35,
    );

    if (this.fx) {
      this.fx.focusTarget = this.camera.position.distanceTo(this.camAim);
      this.fx.aperture = 0.34;
    }

    /* ---- nearest interactable ---- */
    let best: Interactable | null = null;
    let bestD = Infinity;
    for (const it of this.interactables) {
      if (it.once !== false && this.used.has(it.id)) continue;
      const dd = Math.hypot(it.at[0] - pos.x, it.at[2] - pos.z);
      const r = it.radius ?? 2.2;
      if (dd < r && dd < bestD) {
        best = it;
        bestD = dd;
      }
    }
    this.nearest = best;
  }

  /** Consume the nearest interactable, if any. */
  interact(): Interactable | null {
    const it = this.nearest;
    if (!it) return null;
    this.used.add(it.id);
    this.nearest = null;
    return it;
  }

  get interactableList(): Interactable[] {
    return this.interactables;
  }
}
