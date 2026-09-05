import * as THREE from 'three';
import { perlin2, smoothstep } from '../core/noise';
import type { FlightModel } from './physics';
import type { PlaneModel } from './model';

export type CameraMode = 'chase' | 'cockpit' | 'orbit' | 'fixed';

/** chase spring stiffness and damping (damping ratio 0.9); C/K is the feed-forward lead in seconds */
const CHASE_K = 60;
const CHASE_C = 2 * 0.9 * Math.sqrt(CHASE_K);

/** Chase / cockpit cameras with inertia, speed-dependent FOV and turbulence shake. */
export class FlightCamera {
  mode: CameraMode = 'chase';
  private readonly pos = new THREE.Vector3();
  private readonly vel = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();
  private readonly tmp2 = new THREE.Vector3();
  private readonly fwd = new THREE.Vector3();
  private readonly lookLift = new THREE.Vector3(0, 1.2, 0);
  private readonly orbitQ = new THREE.Quaternion();
  private readonly euler = new THREE.Euler();
  private readonly q = new THREE.Quaternion();
  /** optional terrain/water height query so the chase camera never dips below the ground */
  groundHeight: ((x: number, z: number) => number) | null = null;
  private readonly smoothQ = new THREE.Quaternion();
  private time = 0;
  private initialised = false;
  baseFov = 50;
  /** 0 = rock steady, 1 = full turbulence/buffet sway; toggled with V in play mode */
  shakeScale = 0.5;
  /** external orbit offsets (mouse) */
  orbitYaw = 0;
  orbitPitch = 0;
  chaseDistance = 25;
  chaseHeight = 6.5;

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  snap(): void { this.initialised = false; }

  /** Rest pose of the chase spring for a target moving at the aircraft's velocity: the offset behind and above the
   *  aircraft in a yaw-only frame (without the velocity feed-forward added in update). */
  private chaseDesired(flight: FlightModel, out: THREE.Vector3): THREE.Vector3 {
    const fwd = flight.forward(this.fwd);
    const yaw = Math.atan2(fwd.x, fwd.z);
    const speed = flight.telemetry.airspeed;
    // the rest distance closes with speed by the spring's feed-forward lead (C/K seconds of travel): this is where
    // the camera came to rest in every bench still so far (a spring settled behind a frozen aircraft with its
    // velocity fed forward), i.e. the framing the frames have been judged on; in flight it is now the steady state
    // too, so the clip continues from the still without the camera falling 15-20 m back
    const dist = Math.max(10, this.chaseDistance + speed * (0.08 - CHASE_C / CHASE_K));
    const heightOff = this.chaseHeight + speed * 0.012;
    const orbitQ = this.orbitQ.setFromEuler(this.euler.set(this.orbitPitch, yaw + this.orbitYaw, 0, 'YXZ'));
    return out.set(0, heightOff, -dist).applyQuaternion(orbitQ).add(flight.position);
  }

  /** Puts the camera where it sits in steady flight at the aircraft's current velocity and poses it, without
   *  integrating. A chase camera settled behind a frozen aircraft would otherwise rest 12-13 m ahead of that pose
   *  (the velocity feed-forward with nothing moving) and lurch back over the first half second once the
   *  simulation runs — the bench still and the clip that continues from it now share one camera path. */
  settle(flight: FlightModel, model: PlaneModel, stepDt = 0): void {
    if (this.mode === 'chase') {
      // the spring in update() sees the aircraft already advanced by the frame it is about to integrate, so its
      // discrete rest pose leads the analytic one by one frame of travel (v * dt)
      this.pos.copy(this.chaseDesired(flight, this.tmp2)).addScaledVector(flight.velocity, stepDt);
      this.vel.copy(flight.velocity);
      this.initialised = true;
    } else {
      this.snap();
    }
    this.update(flight, model, 0);
  }

  update(flight: FlightModel, model: PlaneModel, dt: number): void {
    this.time += dt;
    const cam = this.camera;
    const t = flight.telemetry;
    // shake is composed from what the airframe is actually doing: low-frequency sway from turbulence, a
    // 9-11 Hz shudder from stall buffet, and a faint hum at high speed. The old single 0.35 m / 13 Hz jitter
    // read as nausea, not motion; total positional amplitude now stays within ~0.1 m.
    const sway = t.gustLevel * this.shakeScale;
    const buffet = t.buffet * this.shakeScale;
    // no speed "hum": a 12-15 Hz jitter read as blur on the aircraft against the background in chase view
    const hum = 0.0 * this.shakeScale;
    const shakeX = perlin2(this.time * 2.3, 0.3) * 0.10 * sway + perlin2(this.time * 9.5, 1.3) * 0.06 * buffet + perlin2(this.time * 13.0, 2.2) * 0.015 * hum;
    const shakeY = perlin2(this.time * 2.9, 4.3) * 0.10 * sway + perlin2(this.time * 11.0, 5.7) * 0.06 * buffet + perlin2(this.time * 15.0, 6.1) * 0.015 * hum;
    const shakeZ = perlin2(this.time * 2.1, 8.3) * 0.10 * sway + perlin2(this.time * 10.2, 9.1) * 0.06 * buffet + perlin2(this.time * 12.0, 7.7) * 0.015 * hum;
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
      // head motion: a fraction of the airframe's own shake (the pilot is strapped in)
      eye.x += shakeX * 0.15;
      eye.y += shakeY * 0.15;
      eye.z += shakeZ * 0.15;
      cam.position.copy(eye);
      cam.fov = this.baseFov + 12;
      cam.updateProjectionMatrix();
      return;
    }
    // chase: spring-damper toward an offset behind and above the aircraft, in a yaw-only frame
    // `fwd` must not alias `tmp`: the spring acceleration below reuses `tmp`, and the look target needs the
    // real forward vector (aliasing made the camera look at position + 6 x acceleration and lose the aircraft)
    const desired = this.chaseDesired(flight, this.tmp2);
    const fwd = this.fwd; // set by chaseDesired
    const speed = t.airspeed;
    // bank the camera slightly with the aircraft so turns feel dynamic
    if (!this.initialised) { this.pos.copy(desired); this.vel.set(0, 0, 0); this.initialised = true; }
    const k = CHASE_K, c = CHASE_C;
    // feed the aircraft velocity forward so the spring only has to absorb accelerations
    desired.addScaledVector(flight.velocity, c / k);
    const acc = this.tmp.copy(desired).sub(this.pos).multiplyScalar(k).addScaledVector(this.vel, -c);
    this.vel.addScaledVector(acc, dt);
    this.pos.addScaledVector(this.vel, dt);
    // never let the camera go under the terrain/water
    const floor = Math.max(1.2, this.groundHeight ? this.groundHeight(this.pos.x, this.pos.z) + 2.5 : 1.2);
    if (this.pos.y < floor) { this.pos.y = floor; if (this.vel.y < 0) this.vel.y = 0; }
    const look = this.lookTarget.copy(flight.position).addScaledVector(fwd, 6).add(this.lookLift);
    cam.position.copy(this.pos);
    cam.position.x += shakeX;
    cam.position.y += shakeY;
    cam.position.z += shakeZ;
    cam.up.set(0, 1, 0);
    cam.lookAt(look);
    const bank = t.bank;
    cam.rotateZ(-bank * 0.18);
    cam.fov = this.baseFov + smoothstep(30, 90, speed) * 6;
    cam.updateProjectionMatrix();
  }
}
