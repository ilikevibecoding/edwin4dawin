import * as THREE from 'three';
import { PLAYER } from './layout.js';

export function createPlayer(camera, colliders) {
  const state = {
    enabled: true,
    yaw: 0,
    pitch: -0.08,
    velocity: new THREE.Vector3(),
    position: new THREE.Vector3(PLAYER.spawn.x, PLAYER.eyeHeight, PLAYER.spawn.z),
    keys: new Set(),
    bob: 0,
    locked: false,
    radius: PLAYER.radius,
    height: PLAYER.height,
  };

  camera.position.copy(state.position);
  camera.rotation.order = 'YXZ';

  const onKey = (e, down) => {
    const k = e.code;
    if (down) state.keys.add(k);
    else state.keys.delete(k);
  };

  const onMouse = (e) => {
    if (!state.enabled || !state.locked) return;
    state.yaw -= e.movementX * 0.0022;
    state.pitch -= e.movementY * 0.0022;
    state.pitch = Math.max(-1.2, Math.min(1.2, state.pitch));
  };

  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));
  window.addEventListener('mousemove', onMouse);

  function collide(next) {
    const r = state.radius;
    const y0 = 0.12;
    const y1 = state.height - 0.08;
    for (const c of colliders) {
      const nx = Math.max(c.min.x, Math.min(next.x, c.max.x));
      const nz = Math.max(c.min.z, Math.min(next.z, c.max.z));
      const overlapsY = y1 > c.min.y && y0 < c.max.y;
      if (!overlapsY) continue;
      const dx = next.x - nx;
      const dz = next.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        const d = Math.sqrt(Math.max(d2, 1e-6));
        const pen = r - d;
        next.x += (dx / d) * pen;
        next.z += (dz / d) * pen;
      }
    }
    next.x = Math.max(-1.05, Math.min(1.05, next.x));
    next.z = Math.max(-10.15, Math.min(10.85, next.z));
    return next;
  }

  function update(dt) {
    if (!state.enabled) {
      camera.rotation.set(state.pitch, state.yaw, 0);
      camera.position.copy(state.position);
      return;
    }
    const wish = new THREE.Vector3();
    if (state.keys.has('KeyW') || state.keys.has('ArrowUp')) wish.z -= 1;
    if (state.keys.has('KeyS') || state.keys.has('ArrowDown')) wish.z += 1;
    if (state.keys.has('KeyA') || state.keys.has('ArrowLeft')) wish.x -= 1;
    if (state.keys.has('KeyD') || state.keys.has('ArrowRight')) wish.x += 1;
    if (wish.lengthSq() > 0) wish.normalize();
    wish.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
    const target = wish.multiplyScalar(PLAYER.walkSpeed);
    state.velocity.lerp(target, 1 - Math.exp(-8 * dt));
    const next = state.position.clone();
    next.x += state.velocity.x * dt;
    next.z += state.velocity.z * dt;
    collide(next);
    state.position.x = next.x;
    state.position.z = next.z;
    state.position.y = PLAYER.eyeHeight;
    const spd = state.velocity.length();
    state.bob += spd * dt * 9;
    const bobY = Math.sin(state.bob) * 0.012 * Math.min(1, spd);
    const bobX = Math.cos(state.bob * 0.5) * 0.006 * Math.min(1, spd);
    camera.position.set(state.position.x + bobX, state.position.y + bobY, state.position.z);
    camera.rotation.set(state.pitch, state.yaw, 0);
  }

  function setPose(x, y, z, yaw, pitch) {
    state.position.set(x, y, z);
    state.yaw = yaw;
    state.pitch = pitch;
    state.velocity.set(0, 0, 0);
    camera.position.set(x, y, z);
    camera.rotation.set(pitch, yaw, 0);
  }

  function holdKey(code, down) {
    if (down) state.keys.add(code);
    else state.keys.delete(code);
  }

  return { state, update, setPose, collide, holdKey };
}

export function setupPointerLock(canvas, player) {
  const onChange = () => {
    player.state.locked = document.pointerLockElement === canvas;
  };
  document.addEventListener('pointerlockchange', onChange);
  canvas.addEventListener('click', () => {
    if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
  });
  return {
    lock() {
      return canvas.requestPointerLock();
    },
    unlock() {
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    },
    isLocked() {
      return document.pointerLockElement === canvas;
    },
  };
}
