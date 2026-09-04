import * as THREE from 'three';
import { PlaneModel } from './model';
import { FlightModel, type FlightInputs } from './physics';
import { PlaneEffects } from './effects';

/** The player's seaplane: model + flight model + effects glued together. */
export class Aircraft {
  readonly model = new PlaneModel();
  readonly flight: FlightModel;
  readonly effects: PlaneEffects;
  readonly inputs: FlightInputs = { throttle: 0, pitch: 0, roll: 0, yaw: 0, flaps: 0, brake: false };

  constructor(heightAt: (x: number, z: number) => number, scene: THREE.Scene, wakeScene: THREE.Scene) {
    this.flight = new FlightModel(heightAt);
    this.effects = new PlaneEffects(wakeScene, scene);
    scene.add(this.model.root);
  }

  /** Place the aircraft statically (bench views): position, heading (rad, 0 = north), pitch, bank, speed. */
  place(x: number, y: number, z: number, headingRad: number, pitchRad: number, bankRad: number, speed: number, throttle: number): void {
    this.flight.position.set(x, y, z);
    // heading 0 = north (-Z). Model +X forward. yaw about Y: forward = (sin h, 0, -cos h)
    const yaw = Math.atan2(-Math.cos(headingRad), Math.sin(headingRad));
    const e = new THREE.Euler(0, 0, 0, 'YZX');
    e.set(bankRad, yaw, pitchRad, 'YZX');
    this.flight.quaternion.setFromEuler(e);
    const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(this.flight.quaternion);
    this.flight.velocity.copy(fwd).multiplyScalar(speed);
    this.flight.omega.set(0, 0, 0);
    this.flight.rpm = throttle;
    this.inputs.throttle = throttle;
    this.syncModel();
  }

  syncModel(): void {
    this.model.root.position.copy(this.flight.position);
    this.model.root.quaternion.copy(this.flight.quaternion);
  }

  update(dt: number, time: number, night: number, wind: THREE.Vector3, turbulence: number, pixelHeight: number, simulate: boolean): void {
    this.flight.wind.copy(wind);
    this.flight.turbulence = turbulence;
    if (simulate) this.flight.step(this.inputs, dt);
    this.syncModel();
    const t = this.flight.telemetry;
    this.model.animate(this.inputs.pitch, this.inputs.roll, this.inputs.yaw, this.inputs.flaps, t.rpm, dt, time, night, t.gearDown);
    this.effects.update(this.flight, this.model, dt, time, pixelHeight);
  }
}
