import * as THREE from 'three';
import { clamp, damp } from '../core/mathx';

/**
 * Explore-mode camera.
 *
 * Orbit with the pointer, fly with WASD, and dolly with the wheel. A pivot
 * point keeps the viewer anchored: however far they wander they can always
 * "Follow" or "Return to cinematic camera" and be put back somewhere sensible,
 * so it is impossible to get irretrievably lost.
 */
export class ExploreControls {
  readonly camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 2_400_000);
  /** Point the camera orbits around. */
  readonly pivot = new THREE.Vector3();
  private spherical = new THREE.Spherical(20, Math.PI / 2.4, 0);
  private targetSpherical = new THREE.Spherical(20, Math.PI / 2.4, 0);
  private smoothPivot = new THREE.Vector3();
  private keys = new Set<string>();
  private dragging = false;
  private lastPointer = new THREE.Vector2();
  private enabled = false;
  /** Object the camera is currently locked to, if any. */
  private followTarget: THREE.Object3D | null = null;
  private followOffset = new THREE.Vector3();
  /** Scale factor applied to movement speed, set from the active scene. */
  private worldScale = 1;
  /**
   * Soft leash on the pivot: where the action is, and how far from it the viewer
   * may fly. Holding W is otherwise a one-way trip to somewhere with nothing in
   * it, and while "Return to cinematic camera" always rescues them, a viewer who
   * has lost sight of the ships has no reason to believe anything is left to see.
   */
  private leashCentre = new THREE.Vector3();
  private leashRadius = Infinity;

  constructor(element: HTMLElement) {
    this.camera.name = 'exploreCamera';

    element.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => this.keys.clear());
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.keys.clear();
      this.dragging = false;
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  setWorldScale(scale: number): void {
    this.worldScale = scale;
  }

  setLeash(centre: THREE.Vector3, radius: number): void {
    this.leashCentre.copy(centre);
    this.leashRadius = radius;
  }

  /** Place the explore camera where the cinematic camera currently is. */
  adoptFrom(camera: THREE.PerspectiveCamera, pivotDistance: number): void {
    this.camera.fov = camera.fov;
    this.camera.near = camera.near;
    this.camera.far = camera.far;
    this.camera.updateProjectionMatrix();

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    this.pivot.copy(camera.position).addScaledVector(forward, pivotDistance);
    this.smoothPivot.copy(this.pivot);
    const offset = new THREE.Vector3().subVectors(camera.position, this.pivot);
    this.spherical.setFromVector3(offset);
    this.targetSpherical.copy(this.spherical);
    this.followTarget = null;
  }

  follow(object: THREE.Object3D, radius: number): void {
    this.followTarget = object;
    const centre = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
    this.followOffset.copy(centre).sub(object.getWorldPosition(new THREE.Vector3()));
    this.targetSpherical.radius = radius;
    this.spherical.radius = radius;
  }

  /** Frame an object tightly, without locking to it. */
  inspect(object: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(object);
    const centre = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    this.pivot.copy(centre);
    this.smoothPivot.copy(centre);
    this.targetSpherical.radius = Math.max(size * 0.85, 1.2);
    this.targetSpherical.phi = Math.PI / 2.5;
    this.spherical.radius = this.targetSpherical.radius;
    this.followTarget = object;
    this.followOffset.copy(centre).sub(object.getWorldPosition(new THREE.Vector3()));
  }

  stopFollowing(): void {
    this.followTarget = null;
  }

  get following(): THREE.Object3D | null {
    return this.followTarget;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.enabled || e.button !== 0) return;
    this.dragging = true;
    this.lastPointer.set(e.clientX, e.clientY);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.enabled || !this.dragging) return;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.lastPointer.set(e.clientX, e.clientY);
    this.targetSpherical.theta -= dx * 0.005;
    this.targetSpherical.phi = clamp(this.targetSpherical.phi - dy * 0.005, 0.08, Math.PI - 0.08);
  };

  private onPointerUp = (): void => {
    this.dragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    if (!this.enabled) return;
    e.preventDefault();
    const factor = Math.exp(e.deltaY * 0.0012);
    this.targetSpherical.radius = clamp(this.targetSpherical.radius * factor, 0.6 * this.worldScale, 90_000 * this.worldScale);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  update(dt: number): void {
    if (!this.enabled) return;

    // WASD flies the pivot in the camera's own basis.
    const speedBase = this.targetSpherical.radius * 0.9 + 1.2 * this.worldScale;
    const boost = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 4 : 1;
    const speed = speedBase * boost * dt;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0);
    const move = new THREE.Vector3();
    if (this.keys.has('KeyW')) move.addScaledVector(forward, 1);
    if (this.keys.has('KeyS')) move.addScaledVector(forward, -1);
    if (this.keys.has('KeyA')) move.addScaledVector(right, -1);
    if (this.keys.has('KeyD')) move.addScaledVector(right, 1);
    if (this.keys.has('KeyQ')) move.addScaledVector(up, -1);
    if (this.keys.has('KeyZ') || this.keys.has('KeyE')) move.addScaledVector(up, 1);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed);
      this.pivot.add(move);
      this.followTarget = null;
    }

    if (this.followTarget) {
      const p = this.followTarget.getWorldPosition(new THREE.Vector3()).add(this.followOffset);
      this.pivot.copy(p);
    } else if (Number.isFinite(this.leashRadius)) {
      const offset = new THREE.Vector3().subVectors(this.pivot, this.leashCentre);
      const d = offset.length();
      if (d > this.leashRadius) {
        this.pivot.copy(this.leashCentre).addScaledVector(offset, this.leashRadius / d);
      }
    }

    this.smoothPivot.set(
      damp(this.smoothPivot.x, this.pivot.x, 12, dt),
      damp(this.smoothPivot.y, this.pivot.y, 12, dt),
      damp(this.smoothPivot.z, this.pivot.z, 12, dt),
    );
    this.spherical.radius = damp(this.spherical.radius, this.targetSpherical.radius, 9, dt);
    this.spherical.theta = damp(this.spherical.theta, this.targetSpherical.theta, 12, dt);
    this.spherical.phi = damp(this.spherical.phi, this.targetSpherical.phi, 12, dt);

    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.smoothPivot).add(offset);
    this.camera.lookAt(this.smoothPivot);
    this.camera.updateMatrixWorld();
  }

  setLens(near: number, far: number, fov = 50): void {
    this.camera.near = near;
    this.camera.far = far;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
