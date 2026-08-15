import * as THREE from 'three';
import { LAYOUT } from './layout.js';

export function createPlayer(camera, collider, canvas) {
  const state = {
    enabled: true,
    yaw: 0,
    pitch: 0.04,
    velocity: new THREE.Vector3(),
    keys: new Set(),
    bob: 0,
    locked: false,
  };

  const pos = camera.position;
  pos.set(0, LAYOUT.eyeHeight, 10.55);

  const onKey = (e, down) => {
    const k = e.code;
    if (down) state.keys.add(k);
    else state.keys.delete(k);
  };

  const onMouse = (e) => {
    if (!state.enabled || !state.locked) return;
    state.yaw -= e.movementX * 0.0022;
    state.pitch -= e.movementY * 0.0020;
    state.pitch = THREE.MathUtils.clamp(state.pitch, -1.15, 1.15);
  };

  const onLockChange = () => {
    state.locked = document.pointerLockElement === canvas;
  };

  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));
  document.addEventListener('mousemove', onMouse);
  document.addEventListener('pointerlockchange', onLockChange);

  canvas.addEventListener('click', () => {
    if (!state.enabled) return;
    canvas.requestPointerLock?.();
  });

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const wish = new THREE.Vector3();

  function update(dt) {
    camera.rotation.order = 'YXZ';
    camera.rotation.y = state.yaw;
    camera.rotation.x = state.pitch;

    if (!state.enabled) return;

    wish.set(0, 0, 0);
    if (state.holdForward || state.keys.has('KeyW') || state.keys.has('ArrowUp')) wish.z -= 1;
    if (state.keys.has('KeyS') || state.keys.has('ArrowDown')) wish.z += 1;
    if (state.keys.has('KeyA') || state.keys.has('ArrowLeft')) wish.x -= 1;
    if (state.keys.has('KeyD') || state.keys.has('ArrowRight')) wish.x += 1;

    forward.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    right.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
    const move = new THREE.Vector3();
    move.addScaledVector(forward, -wish.z);
    move.addScaledVector(right, wish.x);
    if (move.lengthSq() > 0) move.normalize();

    const speed = state.keys.has('ShiftLeft') ? 1.55 : 1.15;
    const accel = 8;
    const damp = 7;
    const target = move.multiplyScalar(speed);
    state.velocity.x = THREE.MathUtils.damp(state.velocity.x, target.x, accel, dt);
    state.velocity.z = THREE.MathUtils.damp(state.velocity.z, target.z, accel, dt);
    if (move.lengthSq() === 0) {
      state.velocity.x = THREE.MathUtils.damp(state.velocity.x, 0, damp, dt);
      state.velocity.z = THREE.MathUtils.damp(state.velocity.z, 0, damp, dt);
    }

    pos.x += state.velocity.x * dt;
    pos.z += state.velocity.z * dt;
    collider.resolve(pos, LAYOUT.playerRadius, LAYOUT.playerHeight);

    const spd = Math.hypot(state.velocity.x, state.velocity.z);
    state.bob += dt * spd * 9;
    const bobAmt = Math.min(0.012, spd * 0.01);
    pos.y = LAYOUT.eyeHeight + Math.sin(state.bob) * bobAmt;
  }

  function setPose(x, y, z, yaw = 0, pitch = 0) {
    pos.set(x, y ?? LAYOUT.eyeHeight, z);
    state.yaw = yaw;
    state.pitch = pitch;
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
    state.velocity.set(0, 0, 0);
  }

  function lookAt(target) {
    const dir = new THREE.Vector3().subVectors(target, pos).normalize();
    state.yaw = Math.atan2(-dir.x, -dir.z);
    state.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
    camera.rotation.order = 'YXZ';
    camera.rotation.y = state.yaw;
    camera.rotation.x = state.pitch;
  }

  return {
    state,
    camera,
    update,
    setPose,
    lookAt,
    setEnabled(v) {
      state.enabled = v;
      if (!v) {
        state.velocity.set(0, 0, 0);
        state.holdForward = false;
      }
    },
    setHoldForward(v) {
      state.holdForward = !!v;
    },
    isLocked() {
      return state.locked;
    },
    getPosition() {
      return pos.clone();
    },
  };
}
