/**
 * Cinematic camera rig. Shots are declarative — position, aim, lens, optional
 * dolly — and the rig adds the things that make a shot feel photographed:
 * handheld drift, a settling ease on cuts, impact shake and rack focus.
 */
import * as THREE from 'three';
import { clamp, damp, ease, fbm2, type EaseName } from '../engine/math';
import type { PostFX } from '../engine/postfx';

export type ShotSpec = {
  pos?: [number, number, number];
  look?: [number, number, number];
  /** "charId" or "charId:landmark" resolved against the live cast. */
  target?: string;
  /** Offset applied after resolving `target`. */
  targetOffset?: [number, number, number];
  fov?: number;
  /** Dolly destination. */
  to?: [number, number, number];
  toLook?: [number, number, number];
  toTarget?: string;
  /** Dolly duration in seconds. */
  move?: number;
  ease?: EaseName;
  /** 0 = tripod, 1 = very loose handheld. */
  handheld?: number;
  aperture?: number;
  /** Focus distance, or a character id to focus on. */
  focus?: number | string;
  shake?: number;
  roll?: number;
  /** Orbit the aim point over the shot, in radians. */
  orbit?: number;
  /** Height offset applied to the resolved target. */
  height?: number;
};

export type TargetResolver = (spec: string) => THREE.Vector3 | null;

export class CameraRig {
  camera: THREE.PerspectiveCamera;
  private resolve: TargetResolver;
  private fx: PostFX | null = null;

  private posA = new THREE.Vector3();
  private posB = new THREE.Vector3();
  private lookA = new THREE.Vector3();
  private lookB = new THREE.Vector3();
  private fovA = 40;
  private fovB = 40;
  private t = 1;
  private dur = 0;
  private easeName: EaseName = 'inOutCubic';
  private handheld = 0.35;
  private shake = 0;
  private roll = 0;
  private orbit = 0;
  private orbitTotal = 0;
  private targetSpec: string | null = null;
  private toTargetSpec: string | null = null;
  private targetOffset = new THREE.Vector3();
  private focusSpec: number | string | undefined;
  private noiseSeed = Math.random() * 100;
  private curPos = new THREE.Vector3();
  private curLook = new THREE.Vector3();
  private settle = 1;
  private time = 0;

  constructor(camera: THREE.PerspectiveCamera, resolve: TargetResolver) {
    this.camera = camera;
    this.resolve = resolve;
    this.posA.copy(camera.position);
    this.posB.copy(camera.position);
    this.curPos.copy(camera.position);
  }

  attachPost(fx: PostFX): void {
    this.fx = fx;
  }

  /** Cut or move to a new shot. */
  play(shot: ShotSpec): void {
    const prevPos = this.curPos.clone();
    const prevLook = this.curLook.clone();

    this.posA.copy(shot.pos ? new THREE.Vector3(...shot.pos) : prevPos);
    this.posB.copy(shot.to ? new THREE.Vector3(...shot.to) : this.posA);

    this.targetSpec = shot.target ?? null;
    this.toTargetSpec = shot.toTarget ?? null;
    this.targetOffset.set(...(shot.targetOffset ?? [0, 0, 0]));
    if (shot.height) this.targetOffset.y += shot.height;

    const resolvedLook = this.targetSpec ? this.resolve(this.targetSpec) : null;
    this.lookA.copy(shot.look ? new THREE.Vector3(...shot.look) : (resolvedLook ?? prevLook));
    if (resolvedLook && !shot.look) this.lookA.add(this.targetOffset);
    this.lookB.copy(shot.toLook ? new THREE.Vector3(...shot.toLook) : this.lookA);

    this.fovA = shot.fov ?? this.camera.fov;
    this.fovB = shot.fov ?? this.camera.fov;
    this.dur = shot.move ?? 0;
    this.t = this.dur > 0 ? 0 : 1;
    this.easeName = shot.ease ?? 'inOutCubic';
    this.handheld = shot.handheld ?? 0.35;
    this.roll = shot.roll ?? 0;
    this.orbitTotal = shot.orbit ?? 0;
    this.orbit = 0;
    this.focusSpec = shot.focus;
    if (shot.shake) this.shake = shot.shake;
    // A cut should not inherit the previous frame's smoothing.
    this.settle = shot.pos ? 0 : 1;
    if (this.fx) {
      this.fx.aperture = shot.aperture ?? 0.85;
      if (shot.pos) this.fx.focusDistance = this.focusDistanceNow();
    }
    this.noiseSeed = Math.random() * 100;
  }

  addShake(power: number): void {
    this.shake = Math.max(this.shake, power);
  }

  private focusDistanceNow(): number {
    const look = this.curLook.lengthSq() > 0 ? this.curLook : this.lookA;
    return Math.max(0.4, this.curPos.distanceTo(look));
  }

  update(dt: number): void {
    this.time += dt;
    if (this.dur > 0 && this.t < 1) this.t = clamp(this.t + dt / this.dur);
    const k = ease[this.easeName](this.t);

    // Live targets keep the aim glued to a moving actor.
    const live = this.targetSpec ? this.resolve(this.targetSpec) : null;
    if (live) this.lookA.copy(live).add(this.targetOffset);
    const liveTo = this.toTargetSpec ? this.resolve(this.toTargetSpec) : null;
    if (liveTo) this.lookB.copy(liveTo).add(this.targetOffset);
    else if (!this.toTargetSpec && live && !this.lookBFixed) this.lookB.copy(this.lookA);

    const pos = this.posA.clone().lerp(this.posB, k);
    const look = this.lookA.clone().lerp(this.lookB, k);

    if (this.orbitTotal !== 0) {
      this.orbit = this.orbitTotal * k;
      const off = pos.clone().sub(look);
      const c = Math.cos(this.orbit), s = Math.sin(this.orbit);
      pos.set(look.x + off.x * c - off.z * s, pos.y, look.z + off.x * s + off.z * c);
    }

    // Handheld: low-frequency drift plus a faint breathing bob.
    if (this.handheld > 0.001) {
      const h = this.handheld;
      const n = (o: number) => fbm2(this.time * 0.42 + o + this.noiseSeed, o * 3.7, 3);
      pos.x += n(0) * 0.022 * h;
      pos.y += n(11) * 0.017 * h + Math.sin(this.time * 1.1) * 0.004 * h;
      pos.z += n(23) * 0.022 * h;
      look.x += n(31) * 0.03 * h;
      look.y += n(43) * 0.024 * h;
    }

    if (this.shake > 0.001) {
      const s = this.shake;
      pos.x += (Math.random() - 0.5) * 0.09 * s;
      pos.y += (Math.random() - 0.5) * 0.09 * s;
      pos.z += (Math.random() - 0.5) * 0.06 * s;
      look.x += (Math.random() - 0.5) * 0.1 * s;
      look.y += (Math.random() - 0.5) * 0.1 * s;
      this.shake = Math.max(0, this.shake - dt * 2.2);
    }

    // Smooth settle so cuts land rather than snap-stop.
    this.settle = damp(this.settle, 1, 6, dt);
    const lerpRate = 1 - Math.exp(-(8 + 24 * this.settle) * dt);
    this.curPos.lerp(pos, this.dur > 0 || this.settle > 0.99 ? 1 : lerpRate);
    if (this.dur > 0) this.curPos.copy(pos);
    this.curLook.lerp(look, this.dur > 0 ? 1 : Math.max(lerpRate, 0.35));

    this.camera.position.copy(this.curPos);
    this.camera.up.set(Math.sin(this.roll), Math.cos(this.roll), 0);
    this.camera.lookAt(this.curLook);
    const fov = this.fovA + (this.fovB - this.fovA) * k;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    if (this.fx) {
      let focus: number;
      if (typeof this.focusSpec === 'number') focus = this.focusSpec;
      else if (typeof this.focusSpec === 'string') {
        const p = this.resolve(this.focusSpec);
        focus = p ? this.curPos.distanceTo(p) : this.curPos.distanceTo(this.curLook);
      } else {
        focus = this.curPos.distanceTo(this.curLook);
      }
      this.fx.focusTarget = Math.max(0.35, focus);
    }
  }

  private lookBFixed = false;

  get position(): THREE.Vector3 {
    return this.camera.position;
  }
  get aim(): THREE.Vector3 {
    return this.curLook;
  }
  get isMoving(): boolean {
    return this.dur > 0 && this.t < 1;
  }
}
