import * as THREE from 'three';
import { perlin2, smoothstep } from '../core/noise';
import type { FlightModel } from './physics';
import type { PlaneModel } from './model';

export type CameraMode = 'chase' | 'cockpit' | 'orbit' | 'fixed';

/** Chase / cockpit cameras with inertia, speed-dependent FOV and turbulence shake. */
export class FlightCamera {
  mode: CameraMode = 'chase';
  private readonly pos = new THREE.Vector3();
  private readonly vel = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();
  private readonly tmp2 = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  private readonly smoothQ = new THREE.Quaternion();
  private time = 0;
  private initialised = false;
  baseFov = 50;
  shakeScale = 1.0;
  /** external orbit offsets (mouse) */
  orbitYaw = 0;
  orbitPitch = 0;
  chaseDistance = 18;
  chaseHeight = 5.5;

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  snap(): void { this.initialised = false; }

  update(flight: FlightModel, model: PlaneModel, dt: number): void {
    this.time += dt;
    const cam = this.camera;
    const t = flight.telemetry;
    const shake = t.shake * this.shakeScale;
    if (this.mode === 'fixed') return;
    if (this.mode === 'cockpit') {
      // eye position rides with the airframe; a little lag on orientation reads as head inertia
      const eye = this.tmp.copy(model.cockpitEye).applyQuaternion(flight.quaternion).add(flight.position);
      this.q.copy(flight.quaternion);
      if (!this.initialised) { this.smoothQ.copy(this.q); this.initialised = true; }
      this.smoothQ.slerp(this.q, 1 - Math.exp(-dt * 14));
      // model +X forward -> camera -Z forward
      const fix = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0));
      cam.quaternion.copy(this.smoothQ).multiply(fix);
      // mouse look inside the cockpit
      const look = new THREE.Quaternion().setFromEuler(new THREE.Euler(-this.orbitPitch * 0.6, this.orbitYaw * 1.2, 0, 'YXZ'));
      cam.quaternion.multiply(look);
      const jitter = shake * 0.012;
      eye.x += perlin2(this.time * 9.1, 1.1) * jitter;
      eye.y += perlin2(this.time * 11.3, 2.7) * jitter;
      eye.z += perlin2(this.time * 8.7, 5.3) * jitter;
      cam.position.copy(eye);
      cam.fov = this.baseFov + 12;
      cam.updateProjectionMatrix();
      return;
    }
    // chase: spring-damper toward an offset behind and above the aircraft, in a yaw-only frame
    const fwd = flight.forward(this.tmp);
    const yaw = Math.atan2(fwd.x, fwd.z);
    const speed = t.airspeed;
    const dist = this.chaseDistance + speed * 0.06;
    const heightOff = this.chaseHeight + speed * 0.01;
    const orbitQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.orbitPitch, yaw + this.orbitYaw, 0, 'YXZ'));
    const desired = this.tmp2.set(0, heightOff, -dist).applyQuaternion(orbitQ).add(flight.position);
    // bank the camera slightly with the aircraft so turns feel dynamic
    if (!this.initialised) { this.pos.copy(desired); this.vel.set(0, 0, 0); this.initialised = true; }
    const k = 26, c = 9;
    const acc = this.tmp.copy(desired).sub(this.pos).multiplyScalar(k).addScaledVector(this.vel, -c);
    this.vel.addScaledVector(acc, dt);
    this.pos.addScaledVector(this.vel, dt);
    // never let the camera go under the terrain/water
    if (this.pos.y < 1.2) this.pos.y = 1.2;
    const look = this.lookTarget.copy(flight.position).addScaledVector(fwd, 6).add(new THREE.Vector3(0, 1.2, 0));
    cam.position.copy(this.pos);
    // shake: turbulence / stall buffet / high speed
    const s = shake * 0.35;
    cam.position.x += perlin2(this.time * 13.0, 0.3) * s;
    cam.position.y += perlin2(this.time * 15.0, 4.3) * s;
    cam.position.z += perlin2(this.time * 12.0, 8.3) * s;
    cam.up.set(0, 1, 0);
    cam.lookAt(look);
    const bank = t.bank;
    cam.rotateZ(-bank * 0.18);
    cam.fov = this.baseFov + smoothstep(30, 90, speed) * 6;
    cam.updateProjectionMatrix();
  }
}
