/**
 * Cinematic camera. Shots are described in film terms — close-up, over the
 * shoulder, two-shot — and solved from the actors' current positions, so the
 * story script never hard-codes coordinates. Moves are eased, with optional
 * handheld drift, and a focus plane that tracks the subject.
 *
 * Interior sets are small, so a naive shot solver will happily put the lens
 * outside the room. Solved positions are therefore clamped against scene
 * geometry — but the raycast is cached and revalidated on a timer, never run per
 * frame, because raycasting a 200k-triangle set every frame dominates the whole
 * frame budget on a software rasteriser.
 */
import * as THREE from 'three';
import type { Character } from '../characters/Character';
import type { Mark } from '../world/SceneTypes';

export type ShotSize = 'ecu' | 'close' | 'medium' | 'mid' | 'wide' | 'extremeWide';

export interface ShotOptions {
  /** Horizontal angle offset from the subject's facing, in degrees. */
  angle?: number;
  height?: number;
  /** Roll in degrees, for a subtly dutched frame. */
  roll?: number;
  fov?: number;
  /** Seconds to travel to the new setup; 0 cuts. */
  duration?: number;
  handheld?: number;
  /** Slow push in (positive) or pull out (negative), metres per second. */
  dolly?: number;
  lookOffsetY?: number;
}

const SHOT_DISTANCE: Record<ShotSize, number> = {
  ecu: 0.42,
  close: 0.78,
  medium: 1.5,
  mid: 2.1,
  wide: 4.2,
  extremeWide: 8.5,
};

const SHOT_FOV: Record<ShotSize, number> = {
  ecu: 44,
  close: 40,
  medium: 38,
  mid: 36,
  wide: 34,
  extremeWide: 30,
};

interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  roll: number;
}

export class CameraDirector {
  readonly camera: THREE.PerspectiveCamera;

  private from: CameraState;
  private to: CameraState;
  private t = 1;
  private duration = 0;

  private handheld = 0.35;
  private dollySpeed = 0;
  private noiseTime = Math.random() * 100;
  private shakeAmount = 0;

  private tracking: (() => { position: THREE.Vector3; target: THREE.Vector3 }) | null = null;

  /** Large occluders only: walls and floors matter, a coffee mug does not. */
  private occluders: THREE.Object3D[] = [];
  private bounds: THREE.Box3 | null = null;
  private raycaster = new THREE.Raycaster();
  /** Cached clamp: safe distance as a fraction of the requested distance. */
  private clampRatio = 1;
  private clampAge = 1e9;
  private clampDir = new THREE.Vector3();
  private clock = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    const pos = camera.position.clone();
    const tgt = pos.clone().add(new THREE.Vector3(0, 0, -1));
    this.from = { position: pos.clone(), target: tgt.clone(), fov: camera.fov, roll: 0 };
    this.to = { position: pos.clone(), target: tgt.clone(), fov: camera.fov, roll: 0 };
  }

  /** Registers scene geometry for collision, keeping only the big pieces. */
  setCollider(root: THREE.Object3D | null, bounds?: THREE.Box3 | null) {
    this.occluders = [];
    this.bounds = bounds ?? null;
    if (!root) return;
    const box = new THREE.Box3();
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || mesh.userData.noCameraCollide) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (mats.every((m) => !m || (m as THREE.Material).transparent)) return;
      box.setFromObject(mesh);
      const size = box.getSize(new THREE.Vector3());
      // Two dimensions over a metre: a wall, floor, ceiling or large fixture
      const big = [size.x, size.y, size.z].filter((v) => v > 1).length >= 2;
      if (big) this.occluders.push(mesh);
    });
    this.clampAge = 1e9;
  }

  cut(position: THREE.Vector3, target: THREE.Vector3, fov = this.camera.fov, roll = 0) {
    this.from = { position: position.clone(), target: target.clone(), fov, roll };
    this.to = { position: position.clone(), target: target.clone(), fov, roll };
    this.t = 1;
    this.duration = 0;
    this.tracking = null;
    this.apply(position, target, fov, roll);
  }

  moveTo(position: THREE.Vector3, target: THREE.Vector3, opts: ShotOptions = {}) {
    const duration = opts.duration ?? 1.5;
    this.from = this.currentState();
    this.to = {
      position: position.clone(),
      target: target.clone(),
      fov: opts.fov ?? this.from.fov,
      roll: THREE.MathUtils.degToRad(opts.roll ?? 0),
    };
    this.duration = duration;
    this.t = duration <= 0 ? 1 : 0;
    if (opts.handheld !== undefined) this.handheld = opts.handheld;
    this.dollySpeed = opts.dolly ?? 0;
    if (duration <= 0) this.apply(this.to.position, this.to.target, this.to.fov, this.to.roll);
  }

  private currentState(): CameraState {
    const k = this.ease(this.t);
    return {
      position: this.from.position.clone().lerp(this.to.position, k),
      target: this.from.target.clone().lerp(this.to.target, k),
      fov: THREE.MathUtils.lerp(this.from.fov, this.to.fov, k),
      roll: THREE.MathUtils.lerp(this.from.roll, this.to.roll, k),
    };
  }

  /** Slow in, slow out — reads as a motorised dolly rather than a lerp. */
  private ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // -------------------------------------------------------------------------
  // Collision
  // -------------------------------------------------------------------------

  private raycastClamp(position: THREE.Vector3, target: THREE.Vector3): number {
    if (this.occluders.length === 0) return 1;
    const dir = position.clone().sub(target);
    const distance = dir.length();
    if (distance < 1e-4) return 1;
    dir.divideScalar(distance);
    this.raycaster.set(target, dir);
    this.raycaster.near = 0.02;
    this.raycaster.far = distance;
    const hits = this.raycaster.intersectObjects(this.occluders, true);
    if (hits.length === 0) return 1;
    // Keep the lens clearly on the near side of the obstruction
    const safe = Math.max(0.42, hits[0].distance - 0.16);
    return Math.min(1, safe / distance);
  }

  /**
   * Applies the collision clamp, revalidating at most a few times a second or
   * when the shot direction changes materially.
   */
  private clamped(solved: { position: THREE.Vector3; target: THREE.Vector3 }) {
    const dir = solved.position.clone().sub(solved.target);
    const distance = dir.length();
    if (distance > 1e-4) dir.divideScalar(distance);
    const turned = this.clampDir.dot(dir) < 0.985;
    if (turned || this.clampAge > 0.4) {
      this.clampRatio = this.raycastClamp(solved.position, solved.target);
      this.clampDir.copy(dir);
      this.clampAge = 0;
    }
    let position =
      this.clampRatio >= 0.999
        ? solved.position
        : solved.target.clone().addScaledVector(dir, distance * this.clampRatio);
    if (this.bounds) {
      position = position.clone().clamp(this.bounds.min, this.bounds.max);
    }
    return { position, target: solved.target };
  }

  // -------------------------------------------------------------------------
  // Shot solvers
  // -------------------------------------------------------------------------

  solveSingle(actor: Character, size: ShotSize, opts: ShotOptions = {}) {
    const eye = actor.getEyeWorldPosition();
    const dist = SHOT_DISTANCE[size];
    const yaw = actor.group.rotation.y + THREE.MathUtils.degToRad(opts.angle ?? 25);
    const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    // Wider shots sit lower and centre further down the body
    const drop = size === 'wide' || size === 'extremeWide' ? 0.45 : size === 'mid' ? 0.2 : 0.02;
    const target = eye.clone();
    target.y -= drop;
    target.y += opts.lookOffsetY ?? 0;
    const position = target.clone().addScaledVector(dir, dist);
    position.y = eye.y + (opts.height ?? 0) - drop * 0.35;
    return { position, target };
  }

  /**
   * Over-the-shoulder. The near actor reads as a soft foreground mass at the
   * frame edge, so the lens sits well back and clearly off to one side.
   */
  solveOverShoulder(
    near: Character,
    far: Character,
    opts: ShotOptions & { side?: 1 | -1; shoulderDistance?: number } = {}
  ) {
    const nearEye = near.getEyeWorldPosition();
    const farEye = far.getEyeWorldPosition();
    const axis = farEye.clone().sub(nearEye);
    axis.y = 0;
    if (axis.lengthSq() < 1e-6) axis.set(0, 0, 1);
    axis.normalize();
    const right = new THREE.Vector3(-axis.z, 0, axis.x);
    const position = nearEye
      .clone()
      .addScaledVector(axis, -(opts.shoulderDistance ?? 1.18))
      .addScaledVector(right, (opts.side ?? 1) * 0.5);
    position.y = nearEye.y + (opts.height ?? 0.1);
    const target = farEye.clone();
    target.y += opts.lookOffsetY ?? -0.02;
    return { position, target };
  }

  /**
   * Two-shot. The distance comes from the lens rather than a guess, so both
   * actors actually fit, and four candidate directions are tested so the camera
   * takes whichever side of the axis has room for it.
   */
  solveTwoShot(a: Character, b: Character, opts: ShotOptions = {}) {
    const ea = a.getEyeWorldPosition();
    const eb = b.getEyeWorldPosition();
    const mid = ea.clone().add(eb).multiplyScalar(0.5);
    const axis = eb.clone().sub(ea);
    axis.y = 0;
    if (axis.lengthSq() < 1e-6) axis.set(0, 0, 1);
    const separation = axis.length();
    axis.normalize();
    const perp = new THREE.Vector3(-axis.z, 0, axis.x);
    const fov = opts.fov ?? 36;
    const halfW = Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * this.camera.aspect);
    const up = new THREE.Vector3(0, 1, 0);
    const target = mid.clone();
    target.y -= 0.06;

    let best: { position: THREE.Vector3; ratio: number } | null = null;
    const baseAngle = opts.angle ?? 22;
    for (const sign of [1, -1]) {
      for (const deg of [baseAngle, -baseAngle]) {
        const dir = perp.clone().multiplyScalar(sign).applyAxisAngle(up, THREE.MathUtils.degToRad(deg));
        // Apparent separation shrinks as the camera moves off perpendicular
        const foreshorten = Math.max(0.35, Math.abs(dir.dot(perp)));
        const needed = (separation * foreshorten * 0.5) / Math.tan(halfW) + 0.55;
        const wanted = mid.clone().addScaledVector(dir, needed);
        wanted.y = mid.y + (opts.height ?? 0.02);
        const ratio = this.raycastClamp(wanted, target);
        if (!best || ratio > best.ratio) {
          best = { position: wanted.clone().sub(target).multiplyScalar(ratio).add(target), ratio };
        }
        if (ratio >= 0.999) break;
      }
      if (best && best.ratio >= 0.999) break;
    }
    return { position: best!.position, target, fits: best!.ratio >= 0.72 };
  }

  // -------------------------------------------------------------------------
  // Convenience: solve and move
  // -------------------------------------------------------------------------

  single(actor: Character, size: ShotSize, opts: ShotOptions = {}) {
    const solve = () => this.clamped(this.solveSingle(actor, size, opts));
    const s = solve();
    this.moveTo(s.position, s.target, { fov: SHOT_FOV[size], ...opts });
    this.tracking = solve;
  }

  overShoulder(near: Character, far: Character, opts: ShotOptions & { side?: 1 | -1 } = {}) {
    const solve = () => this.clamped(this.solveOverShoulder(near, far, opts));
    const s = solve();
    this.moveTo(s.position, s.target, { fov: opts.fov ?? 40, ...opts });
    this.tracking = solve;
  }

  /** Falls back to an over-the-shoulder setup when the room is too tight. */
  twoShot(a: Character, b: Character, opts: ShotOptions = {}) {
    if (!this.solveTwoShot(a, b, opts).fits) {
      this.overShoulder(a, b, { ...opts, side: 1 });
      return;
    }
    const solve = () => {
      const s = this.solveTwoShot(a, b, opts);
      return { position: s.position, target: s.target };
    };
    const s = solve();
    this.moveTo(s.position, s.target, { fov: opts.fov ?? 36, ...opts });
    this.tracking = solve;
  }

  toMark(mark: Mark, lookAt: THREE.Vector3, opts: ShotOptions = {}) {
    this.tracking = null;
    const s = this.clamped({ position: mark.position.clone(), target: lookAt.clone() });
    this.moveTo(s.position, s.target, opts);
  }

  /** Freezes the current framing, stopping per-frame re-solves. */
  lock() {
    this.tracking = null;
  }

  shake(amount: number) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
  }

  setHandheld(v: number) {
    this.handheld = v;
  }

  get isMoving() {
    return this.t < 1;
  }

  /** The point the lens should be focused on. */
  get focusPoint(): THREE.Vector3 {
    return this.currentState().target;
  }

  update(dt: number) {
    this.clock += dt;
    this.clampAge += dt;
    if (this.duration > 0 && this.t < 1) this.t = Math.min(1, this.t + dt / this.duration);

    if (this.tracking) {
      const solved = this.tracking();
      const rate = 1 - Math.exp(-dt * 2.2);
      this.to.position.lerp(solved.position, rate);
      this.to.target.lerp(solved.target, rate);
      if (this.t >= 1) {
        this.from.position.copy(this.to.position);
        this.from.target.copy(this.to.target);
      }
    }

    const state = this.currentState();

    if (this.dollySpeed !== 0) {
      const push = state.target.clone().sub(state.position).normalize().multiplyScalar(this.dollySpeed * dt);
      this.from.position.add(push);
      this.to.position.add(push);
      state.position.add(push);
    }

    // Handheld drift: out-of-phase sine pairs read as a human operator
    this.noiseTime += dt;
    if (this.handheld > 0.001) {
      const a = this.handheld * 0.014;
      const n = this.noiseTime;
      state.position.x += Math.sin(n * 0.71) * a + Math.sin(n * 1.93) * a * 0.4;
      state.position.y += Math.sin(n * 0.53 + 1.7) * a * 0.8 + Math.sin(n * 2.31) * a * 0.3;
      state.position.z += Math.sin(n * 0.61 + 3.1) * a * 0.5;
      state.target.x += Math.sin(n * 0.47 + 0.9) * a * 0.6;
      state.target.y += Math.sin(n * 0.67 + 2.2) * a * 0.5;
    }

    if (this.shakeAmount > 0.0001) {
      const s = this.shakeAmount;
      state.position.x += (Math.random() - 0.5) * s;
      state.position.y += (Math.random() - 0.5) * s;
      state.target.x += (Math.random() - 0.5) * s * 0.5;
      state.target.y += (Math.random() - 0.5) * s * 0.5;
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 3 * this.shakeAmount * 4 - dt * 0.02);
    }

    this.apply(state.position, state.target, state.fov, state.roll);
  }

  private apply(position: THREE.Vector3, target: THREE.Vector3, fov: number, roll: number) {
    this.camera.position.copy(position);
    this.camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    this.camera.lookAt(target);
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
