import * as THREE from 'three';
import { clamp, lerp, perlin2, smoothstep } from '../core/noise';

export interface FlightInputs { throttle: number; pitch: number; roll: number; yaw: number; flaps: number; brake: boolean; }

export interface FlightTelemetry {
  airspeed: number;      // m/s
  groundSpeed: number;
  altitude: number;      // m MSL
  agl: number;
  verticalSpeed: number; // m/s
  heading: number;       // degrees
  alpha: number;         // rad
  beta: number;
  stalled: boolean;
  onWater: boolean;
  onGround: boolean;
  rpm: number;           // 0..1
  gForce: number;
  gearDown: boolean;
  shake: number;
  bank: number;
  pitchAngle: number;
}

const G = 9.81;

/**
 * Rigid-body flight model with lift/drag/side-force, stability derivatives, engine lag, wind and
 * turbulence, float buoyancy with hydrodynamic drag and planing, and amphibious wheels on land.
 * Body axes: +X forward, +Y up, +Z starboard.
 */
export class FlightModel {
  readonly position = new THREE.Vector3(0, 0.3, 0);
  readonly quaternion = new THREE.Quaternion();
  readonly velocity = new THREE.Vector3();
  /** body-frame angular velocity (p roll about X, q pitch about Z?, see below) */
  readonly omega = new THREE.Vector3(); // x: roll rate, y: yaw rate, z: pitch rate (about body axes)
  rpm = 0;
  telemetry: FlightTelemetry = { airspeed: 0, groundSpeed: 0, altitude: 0, agl: 0, verticalSpeed: 0, heading: 0, alpha: 0, beta: 0, stalled: false, onWater: false, onGround: false, rpm: 0, gForce: 1, gearDown: true, shake: 0, bank: 0, pitchAngle: 0 };
  // parameters
  mass = 2350;
  wingArea = 23.2;
  span = 14.6;
  chord = 1.65;
  maxThrust = 7400;
  inertia = new THREE.Vector3(3200, 7400, 5600); // Ixx (roll), Iyy (yaw), Izz (pitch)
  wind = new THREE.Vector3();
  turbulence = 0.3;
  gearDown = true;
  private gust = new THREE.Vector3();
  private time = 0;
  private buffet = 0;
  private readonly tmpV = new THREE.Vector3();
  private readonly tmpV2 = new THREE.Vector3();
  private readonly invQ = new THREE.Quaternion();
  private readonly contactPoints = [
    new THREE.Vector3(2.6, -2.2, -1.25), new THREE.Vector3(2.6, -2.2, 1.25),
    new THREE.Vector3(-2.3, -2.15, -1.25), new THREE.Vector3(-2.3, -2.15, 1.25),
    new THREE.Vector3(-0.9, -2.35, -1.25), new THREE.Vector3(-0.9, -2.35, 1.25),
  ];

  constructor(private heightAt: (x: number, z: number) => number) {}

  reset(x: number, y: number, z: number, headingRad: number, speed: number): void {
    this.position.set(x, y, z);
    this.quaternion.setFromEuler(new THREE.Euler(0, headingRad, 0));
    const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);
    this.velocity.copy(fwd).multiplyScalar(speed);
    this.omega.set(0, 0, 0);
    this.rpm = speed > 5 ? 0.7 : 0.2;
  }

  /** Forward axis in world space. */
  forward(out: THREE.Vector3): THREE.Vector3 { return out.set(1, 0, 0).applyQuaternion(this.quaternion); }
  up(out: THREE.Vector3): THREE.Vector3 { return out.set(0, 1, 0).applyQuaternion(this.quaternion); }

  step(inputs: FlightInputs, dt: number): void {
    if (dt <= 0) { this.updateTelemetry(inputs); return; }
    const sub = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / sub;
    for (let i = 0; i < sub; i++) this.substep(inputs, h);
    this.updateTelemetry(inputs);
  }

  private substep(inp: FlightInputs, dt: number): void {
    this.time += dt;
    // engine lag
    const target = clamp(inp.throttle, 0, 1);
    this.rpm += (target * 0.92 + 0.08 - this.rpm) * clamp(dt / 0.7, 0, 1);

    // gusts: slow random walk shaped by perlin noise
    const t = this.time * 0.35;
    const gx = perlin2(t, 1.3) * 1.0, gy = perlin2(t * 1.7, 7.1) * 0.6, gz = perlin2(t * 1.3, 3.7) * 1.0;
    const turb = this.turbulence * (1 + 2.5 * (1 - smoothstep(20, 220, this.position.y))) * 2.4;
    this.gust.set(gx, gy, gz).multiplyScalar(turb);

    // air-relative velocity in body frame
    this.invQ.copy(this.quaternion).invert();
    const vAir = this.tmpV.copy(this.velocity).sub(this.wind).sub(this.gust);
    const vb = this.tmpV2.copy(vAir).applyQuaternion(this.invQ);
    const V = Math.max(vb.length(), 0.5);
    const alpha = Math.atan2(-vb.y, Math.max(vb.x, 0.1));
    const beta = Math.asin(clamp(vb.z / V, -1, 1));
    const rho = 1.2 * Math.exp(-this.position.y / 9000);
    const qdyn = 0.5 * rho * V * V;
    const S = this.wingArea;

    // lift coefficient with stall
    const flaps = clamp(inp.flaps, 0, 1);
    const alphaStall = 0.27 - flaps * 0.03;
    let cl = 0.32 + flaps * 0.55 + 5.4 * alpha;
    const clMax = 1.55 + flaps * 0.45;
    let stalled = false;
    if (alpha > alphaStall) {
      const over = alpha - alphaStall;
      cl = clMax - over * 3.5 + Math.max(0, over - 0.25) * 2.0;
      cl = Math.max(cl, 0.55);
      stalled = true;
    } else if (alpha < -0.22) {
      cl = Math.max(cl, -0.9);
    }
    cl = Math.min(cl, clMax);
    this.buffet = lerp(this.buffet, stalled ? 1 : smoothstep(alphaStall - 0.05, alphaStall, alpha) * 0.5, clamp(dt * 6, 0, 1));
    const cd = 0.034 + 0.048 * cl * cl + flaps * 0.05 + (this.gearDown ? 0.012 : 0) + (stalled ? 0.12 : 0);
    const cy = -0.9 * beta;

    // aerodynamic forces in the wind frame -> body frame
    const lift = qdyn * S * cl, drag = qdyn * S * cd, side = qdyn * S * cy;
    // drag opposes air velocity; lift is perpendicular in the body XY plane
    const vDir = vb.clone().normalize();
    const liftDir = new THREE.Vector3(-vDir.y, vDir.x, 0).normalize(); // rotate vDir by +90deg about Z (points "up" relative to airflow)
    if (liftDir.lengthSq() < 0.5) liftDir.set(0, 1, 0);
    const fBody = new THREE.Vector3();
    fBody.addScaledVector(vDir, -drag);
    fBody.addScaledVector(liftDir, lift);
    fBody.z += side;
    // thrust falls off with airspeed (fixed-pitch prop) and altitude
    const thrust = this.maxThrust * clamp((this.rpm - 0.08) / 0.92, 0, 1) * clamp(1 - V / 95, 0.25, 1) * (rho / 1.2);
    fBody.x += thrust;

    // moments (body frame): x roll, y yaw, z pitch
    const p = this.omega.x, r = this.omega.y, qq = this.omega.z;
    const b = this.span, c = this.chord;
    const twoV = 2 * Math.max(V, 3);
    const elev = clamp(inp.pitch, -1, 1), ail = clamp(inp.roll, -1, 1), rud = clamp(inp.yaw, -1, 1);
    const cm = 0.02 - 1.15 * alpha - 16.0 * (qq * c / twoV) + 0.95 * elev * (1 - 0.35 * flaps) - 0.08 * flaps;
    // sign conventions: +roll = right wing down, +yaw rate = nose left, +pitch = nose up
    const clRoll = -0.45 * (p * b / twoV) + 0.14 * ail - 0.08 * beta - 0.08 * (r * b / twoV);
    const cn = -0.10 * beta - 0.16 * (r * b / twoV) - 0.075 * rud + 0.012 * ail - 0.02 * (p * b / twoV);
    const M = new THREE.Vector3(qdyn * S * b * clRoll, qdyn * S * b * cn, qdyn * S * c * cm);
    // stall buffet & wing drop
    if (stalled) {
      M.x += qdyn * S * b * 0.02 * Math.sin(this.time * 17) * this.buffet;
      M.z -= qdyn * S * c * 0.03 * this.buffet;
    }
    // turbulence torque
    M.x += 400 * turb * perlin2(this.time * 2.1, 9.9);
    M.z += 300 * turb * perlin2(this.time * 1.9, 4.4);

    // ---- ground / water contacts
    let onWater = false, onGround = false;
    const worldF = new THREE.Vector3();
    const cpWorld = new THREE.Vector3();
    const vPoint = new THREE.Vector3();
    const landBelow = this.heightAt(this.position.x, this.position.z) > 0.05;
    this.gearDown = landBelow && this.position.y < 60 || (this.position.y < 8 && landBelow);
    for (const cp of this.contactPoints) {
      cpWorld.copy(cp).applyQuaternion(this.quaternion).add(this.position);
      const ground = this.heightAt(cpWorld.x, cpWorld.z);
      const isWater = ground <= 0.05;
      const surface = isWater ? 0 : ground;
      const isWheel = cp.y < -2.3; // wheel points sit lower than the float keel
      if (isWater && isWheel) continue; // wheels do nothing in water
      if (!isWater && !isWheel && this.gearDown) continue; // on land the wheels carry the load
      const depth = surface - cpWorld.y;
      if (depth <= 0) continue;
      // velocity of the contact point
      vPoint.copy(this.omega).applyQuaternion(this.quaternion).cross(this.tmpV.copy(cpWorld).sub(this.position)).add(this.velocity);
      let fy: number, fh: number;
      if (isWater) {
        onWater = true;
        const buoyK = 22000; // N per metre submerged per point
        fy = buoyK * Math.min(depth, 0.9) - 2600 * vPoint.y;
        // hydrodynamic drag with planing relief; the step reduces wetted area at speed
        const vh = Math.hypot(vPoint.x, vPoint.z);
        const planing = smoothstep(9, 24, vh);
        fh = -(55 * vh * vh * (1 - planing * 0.82) + 900 * vh) * Math.min(depth / 0.3, 1) / 6;
        // planing lift keeps the floats on the surface
        fy += 1800 * planing * Math.min(depth / 0.3, 1);
      } else {
        onGround = true;
        const k = 52000;
        fy = k * Math.min(depth, 0.5) - 2600 * vPoint.y;
        const vh = Math.hypot(vPoint.x, vPoint.z);
        const roll = inp.brake ? 0.45 : 0.03;
        fh = -roll * Math.max(fy, 0) * Math.sign(vh) * Math.min(vh, 1);
        // lateral grip: wheels resist sideways slip strongly
        const sideDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
        const vSide = vPoint.dot(sideDir);
        worldF.copy(sideDir).multiplyScalar(-vSide * 900);
        this.applyForce(worldF, cpWorld, dt);
      }
      fy = Math.max(fy, 0);
      worldF.set(0, fy, 0);
      const vh = Math.hypot(vPoint.x, vPoint.z);
      if (vh > 0.01) worldF.add(this.tmpV.set(vPoint.x / vh, 0, vPoint.z / vh).multiplyScalar(fh));
      this.applyForce(worldF, cpWorld, dt);
      // water rudder / keel steering when on water at low speed
      if (isWater) {
        const steer = new THREE.Vector3(0, -rud * 260 * Math.min(vh / 6, 1), 0);
        this.omega.add(steer.multiplyScalar(dt / this.inertia.y));
      }
    }

    // integrate translational motion
    const fWorld = fBody.applyQuaternion(this.quaternion);
    fWorld.y -= this.mass * G;
    this.velocity.addScaledVector(fWorld, dt / this.mass);
    this.position.addScaledVector(this.velocity, dt);
    // rotational
    this.omega.x += (M.x / this.inertia.x) * dt;
    this.omega.y += (M.y / this.inertia.y) * dt;
    this.omega.z += (M.z / this.inertia.z) * dt;
    // damping on water/ground so the plane settles
    if (onWater || onGround) this.omega.multiplyScalar(1 - 1.6 * dt);
    const dq = new THREE.Quaternion(this.omega.x * dt * 0.5, this.omega.y * dt * 0.5, this.omega.z * dt * 0.5, 1).normalize();
    this.quaternion.multiply(dq).normalize();

    // hard floor: never let the datum go under the ground
    const gh = this.heightAt(this.position.x, this.position.z);
    const floor = Math.max(gh, 0) + 1.55;
    if (this.position.y < floor) {
      this.position.y = floor;
      if (this.velocity.y < 0) this.velocity.y *= -0.1;
      this.velocity.multiplyScalar(1 - 2.5 * dt);
    }

    this.telemetry.alpha = alpha;
    this.telemetry.beta = beta;
    this.telemetry.stalled = stalled && V > 12;
    this.telemetry.onWater = onWater;
    this.telemetry.onGround = onGround;
    this.telemetry.shake = clamp(this.buffet * 0.6 + turb * 0.08 + smoothstep(55, 95, V) * 0.35, 0, 1);
  }

  private applyForce(f: THREE.Vector3, at: THREE.Vector3, dt: number): void {
    this.velocity.addScaledVector(f, dt / this.mass);
    const r = this.tmpV.copy(at).sub(this.position);
    const torque = r.cross(f); // world torque
    torque.applyQuaternion(this.invQ); // to body
    this.omega.x += (torque.x / this.inertia.x) * dt;
    this.omega.y += (torque.y / this.inertia.y) * dt;
    this.omega.z += (torque.z / this.inertia.z) * dt;
  }

  private updateTelemetry(inp: FlightInputs): void {
    const t = this.telemetry;
    const fwd = this.forward(this.tmpV);
    t.airspeed = this.tmpV2.copy(this.velocity).sub(this.wind).length();
    t.groundSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    t.altitude = this.position.y;
    t.agl = this.position.y - Math.max(0, this.heightAt(this.position.x, this.position.z));
    t.verticalSpeed = this.velocity.y;
    t.heading = ((Math.atan2(fwd.x, -fwd.z) * 180) / Math.PI + 360) % 360;
    t.rpm = this.rpm;
    t.gearDown = this.gearDown;
    const up = this.up(this.tmpV2);
    t.bank = Math.atan2(-up.dot(new THREE.Vector3(1, 0, 0).crossVectors(new THREE.Vector3(0, 1, 0), fwd).normalize()), up.y);
    // simpler bank: roll angle from the up vector projected on the body Z
    const right = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
    t.bank = Math.asin(clamp(-right.y, -1, 1));
    t.pitchAngle = Math.asin(clamp(fwd.y, -1, 1));
    t.gForce = 1 + this.omega.z * t.airspeed / G * 0.5;
    void inp;
  }
}
