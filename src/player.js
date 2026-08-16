// First-person controller: pointer lock, WASD, inertia, head bob, capsule
// collision with step assist. Owner: player agent.

import * as THREE from 'three';
import { PLAYER } from './layout.js';
import * as C from './collision.js';

export function createPlayer(camera, domElement) {
  const yawObject = new THREE.Group();      // position + yaw
  const pitchObject = new THREE.Group();    // pitch
  yawObject.add(pitchObject);
  pitchObject.add(camera);
  camera.position.set(0, 0, 0);

  const state = {
    enabled: true,
    feetY: 0,
    vel: new THREE.Vector2(0, 0), // x,z world velocity
    keys: { w: false, a: false, s: false, d: false, shift: false },
    bobPhase: 0,
    bobAmp: 0,
    locked: false,
    moveDistance: 0,
    bob: { x: 0, y: 0, roll: 0 },
  };

  yawObject.position.set(0, PLAYER.eyeHeight, 2.2);

  const onKey = (e, down) => {
    if (e.repeat) return;
    switch (e.code) {
      case 'KeyW': state.keys.w = down; break;
      case 'KeyA': state.keys.a = down; break;
      case 'KeyS': state.keys.s = down; break;
      case 'KeyD': state.keys.d = down; break;
      case 'ShiftLeft': case 'ShiftRight': state.keys.shift = down; break;
    }
  };
  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));

  domElement.addEventListener('click', () => {
    if (state.enabled && !state.locked) domElement.requestPointerLock();
  });
  document.addEventListener('pointerlockchange', () => {
    state.locked = document.pointerLockElement === domElement;
  });
  document.addEventListener('mousemove', (e) => {
    if (!state.locked || !state.enabled) return;
    yawObject.rotation.y -= e.movementX * 0.0021;
    pitchObject.rotation.x -= e.movementY * 0.0021;
    pitchObject.rotation.x = Math.max(-1.45, Math.min(1.45, pitchObject.rotation.x));
  });

  const fwd = new THREE.Vector3();

  function update(dt) {
    if (!state.enabled) return;
    const k = state.keys;
    const maxSpeed = k.shift ? 2.35 : 1.62;
    let ix = (k.d ? 1 : 0) - (k.a ? 1 : 0);
    let iz = (k.s ? 1 : 0) - (k.w ? 1 : 0);
    const len = Math.hypot(ix, iz);
    if (len > 0) { ix /= len; iz /= len; }

    // camera-relative wish direction
    fwd.set(0, 0, -1).applyQuaternion(yawObject.quaternion);
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x).multiplyScalar(-1);
    const wishX = right.x * ix + fwd.x * -iz;
    const wishZ = right.z * ix + fwd.z * -iz;

    const accel = len > 0 ? 16 : 11;
    state.vel.x += (wishX * maxSpeed - state.vel.x) * Math.min(1, accel * dt / 2.2);
    state.vel.y += (wishZ * maxSpeed - state.vel.y) * Math.min(1, accel * dt / 2.2);
    if (len === 0 && state.vel.length() < 0.02) state.vel.set(0, 0);

    const pos = { x: yawObject.position.x + state.vel.x * dt, z: yawObject.position.z + state.vel.y * dt };
    C.resolveHorizontal(pos, PLAYER.radius, state.feetY);
    state.moveDistance += Math.hypot(pos.x - yawObject.position.x, pos.z - yawObject.position.z);
    yawObject.position.x = pos.x;
    yawObject.position.z = pos.z;

    // ground follow with step smoothing
    const ground = C.groundHeightAt(pos.x, pos.z, state.feetY);
    const dy = ground - state.feetY;
    const rate = dy > 0 ? 9 : 7;
    state.feetY += THREE.MathUtils.clamp(dy, -rate * dt, rate * dt);

    // head bob (subtle) driven by actual speed; main.js composes it with ship sway
    const speed = state.vel.length();
    const speedT = THREE.MathUtils.clamp(speed / 1.62, 0, 1.4);
    state.bobAmp += ((speedT > 0.12 ? 1 : 0) - state.bobAmp) * Math.min(1, dt * 6);
    state.bobPhase += dt * (5.6 + speedT * 2.4) * (speedT > 0.05 ? 1 : 0);
    state.bob = {
      y: Math.sin(state.bobPhase * 2) * 0.014 * state.bobAmp * speedT,
      x: Math.sin(state.bobPhase) * 0.008 * state.bobAmp * speedT,
      roll: Math.sin(state.bobPhase) * 0.0035 * state.bobAmp * speedT,
    };
    yawObject.position.y = state.feetY + PLAYER.eyeHeight;
  }

  return {
    object: yawObject,
    pitchObject,
    camera,
    state,
    update,
    setEnabled(v) {
      state.enabled = v;
      if (!v) {
        state.vel.set(0, 0);
        state.keys.w = state.keys.a = state.keys.s = state.keys.d = false;
        if (state.locked && document.exitPointerLock) document.exitPointerLock();
      }
    },
    teleport(x, z, yaw = Math.PI, pitch = 0) {
      state.feetY = C.deckHeightAt(z);
      yawObject.position.set(x, state.feetY + PLAYER.eyeHeight, z);
      yawObject.rotation.y = yaw;
      pitchObject.rotation.x = pitch;
      state.vel.set(0, 0);
      state.bob = { x: 0, y: 0, roll: 0 };
      camera.position.set(0, 0, 0);
      camera.rotation.set(0, 0, 0);
    },
    getPose() {
      return {
        x: yawObject.position.x, y: yawObject.position.y, z: yawObject.position.z,
        yaw: yawObject.rotation.y, pitch: pitchObject.rotation.x,
      };
    },
  };
}
