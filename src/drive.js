import * as THREE from 'three';
import { SPEC as S } from './vehicle/spec.js';

const MAX_SPEED = 14.5;
const ACCEL = 8.2;
const BRAKE = 17;
const REVERSE_MAX = 5.2;
const DRAG = 1.55;
const OFFROAD_DRAG = 6.4;
const STEER_MAX = 0.6;
const STEER_RATE = 2.55;
const TRAIL_HALF = 3.15;
const WORLD_Z = 76;
const WORLD_X = 11;

export function createDrive({ keys, heightAt, wanderAt }) {
  const state = {
    x: 0,
    y: 0,
    z: 0,
    heading: 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    steer: 0,
    enabled: false,
    mph: 0,
    offroad: 0,
  };

  function sampleY(x, z) {
    return heightAt ? heightAt(x, z) : 0;
  }

  function update(dt) {
    const center = wanderAt ? wanderAt(state.z) : 0;
    const lateral = state.x - center;
    const off = THREE.MathUtils.smoothstep(TRAIL_HALF, TRAIL_HALF + 2.4, Math.abs(lateral));
    state.offroad = off;

    if (state.enabled) {
      const throttle = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
      const steerIn = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
      const handbrake = keys.has('Space');

      const steerTarget = steerIn * STEER_MAX * (0.38 + 0.62 * (1 - Math.min(1, Math.abs(state.speed) / MAX_SPEED)));
      state.steer = THREE.MathUtils.damp(state.steer, steerTarget, STEER_RATE, dt);

      const max = THREE.MathUtils.lerp(MAX_SPEED, 6.2, off);
      if (throttle > 0) {
        const room = Math.max(0, max - state.speed);
        state.speed += Math.min(ACCEL, ACCEL * (room / Math.max(0.4, max))) * dt;
      } else if (throttle < 0) {
        if (state.speed > 0.35) state.speed -= BRAKE * dt;
        else state.speed -= ACCEL * 0.7 * dt;
      } else {
        state.speed -= Math.sign(state.speed) * DRAG * dt;
      }

      state.speed -= Math.sign(state.speed) * OFFROAD_DRAG * off * dt;
      if (handbrake) state.speed -= Math.sign(state.speed) * 22 * dt;

      if (state.speed > max) state.speed = max;
      if (state.speed < -REVERSE_MAX) state.speed = -REVERSE_MAX;
      if (Math.abs(state.speed) < 0.04 && throttle === 0) state.speed = 0;

      const turn = state.speed * Math.tan(state.steer) / S.wheelbase;
      state.heading += turn * dt;

      state.x += Math.sin(state.heading) * state.speed * dt;
      state.z += Math.cos(state.heading) * state.speed * dt;

      if (Math.abs(state.z) > WORLD_Z) {
        state.z = THREE.MathUtils.clamp(state.z, -WORLD_Z, WORLD_Z);
        state.speed *= 0.35;
      }
      if (Math.abs(state.x) > WORLD_X) {
        state.x = THREE.MathUtils.clamp(state.x, -WORLD_X, WORLD_X);
        state.speed *= 0.45;
      }
    } else {
      state.steer = THREE.MathUtils.damp(state.steer, 0, 4, dt);
    }

    const hx = Math.sin(state.heading);
    const hz = Math.cos(state.heading);
    const fx = state.x + hx * S.frontAxleZ;
    const fz = state.z + hz * S.frontAxleZ;
    const rx = state.x + hx * S.rearAxleZ;
    const rz = state.z + hz * S.rearAxleZ;
    const lx = state.x - hz * S.trackHalf;
    const lz = state.z + hx * S.trackHalf;
    const qx = state.x + hz * S.trackHalf;
    const qz = state.z - hx * S.trackHalf;
    const yF = sampleY(fx, fz);
    const yR = sampleY(rx, rz);
    const yL = sampleY(lx, lz);
    const yQ = sampleY(qx, qz);
    state.y = (yF + yR) * 0.5;
    state.pitch = THREE.MathUtils.damp(state.pitch, Math.atan2(yF - yR, S.wheelbase), 8, dt);
    const wantRoll = Math.atan2(yL - yQ, S.trackHalf * 2) - state.steer * Math.min(1, Math.abs(state.speed) / 10) * 0.18;
    state.roll = THREE.MathUtils.damp(state.roll, wantRoll, 7, dt);
    state.mph = Math.abs(state.speed) * 2.23694;
    return state;
  }

  return { state, update };
}
