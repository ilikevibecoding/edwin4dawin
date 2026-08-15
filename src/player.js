import { Euler, PerspectiveCamera, Vector3 } from 'three';

const _fwd = new Vector3();
const _right = new Vector3();
const _wish = new Vector3();
const _next = new Vector3();
const _euler = new Euler(0, 0, 0, 'YXZ');

export function createPlayer(camera, collision, options = {}) {
  const eye = options.eyeHeight ?? 1.7;
  const radius = options.radius ?? 0.2;
  const height = options.height ?? 1.72;
  const spawn = options.spawn ?? new Vector3(0.05, 0, 2.15);

  const state = {
    position: spawn.clone(),
    velocity: new Vector3(),
    yaw: 0,
    pitch: -0.08,
    enabled: true,
    bob: 0,
    keys: new Set(),
    locked: false,
    onGround: true,
  };

  function applyLook() {
    _euler.set(state.pitch, state.yaw, 0);
    camera.quaternion.setFromEuler(_euler);
  }

  function syncCamera(time) {
    const speed = state.velocity.length();
    if (state.enabled && speed > 0.05) state.bob += time * (6 + speed * 2);
    const bobY = state.enabled ? Math.sin(state.bob) * 0.012 * Math.min(1, speed * 1.4) : 0;
    const bobX = state.enabled ? Math.cos(state.bob * 0.5) * 0.006 * Math.min(1, speed) : 0;
    camera.position.set(state.position.x + bobX, eye + bobY, state.position.z);
    applyLook();
  }

  function update(dt) {
    if (!state.enabled) {
      syncCamera(dt);
      return;
    }
    const accel = 18;
    const maxSpeed = 1.7;
    const damp = 10;
    _fwd.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    _right.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
    _wish.set(0, 0, 0);
    if (state.keys.has('KeyW')) _wish.add(_fwd);
    if (state.keys.has('KeyS')) _wish.sub(_fwd);
    if (state.keys.has('KeyA')) _wish.sub(_right);
    if (state.keys.has('KeyD')) _wish.add(_right);
    if (_wish.lengthSq() > 0) {
      _wish.normalize().multiplyScalar(accel * dt);
      state.velocity.add(_wish);
    } else {
      state.velocity.multiplyScalar(Math.max(0, 1 - damp * dt));
    }
    if (state.velocity.length() > maxSpeed) state.velocity.setLength(maxSpeed);

    _next.copy(state.position).addScaledVector(state.velocity, dt);
    const steps = 3;
    for (let i = 0; i < steps; i++) {
      const t = 1 / steps;
      state.position.addScaledVector(state.velocity, dt * t);
      collision.resolve(state.position, radius, height);
    }
    state.position.y = 0;
    syncCamera(dt);
  }

  function look(dx, dy) {
    if (!state.enabled || !state.locked) return;
    state.yaw -= dx * 0.0022;
    state.pitch -= dy * 0.0022;
    state.pitch = Math.max(-1.2, Math.min(1.2, state.pitch));
    applyLook();
  }

  function setPose(x, y, z, yaw, pitch) {
    state.position.set(x, 0, z);
    state.yaw = yaw;
    state.pitch = pitch;
    state.velocity.set(0, 0, 0);
    syncCamera(0);
  }

  function bind(dom) {
    const onKey = (e, down) => {
      if (down) state.keys.add(e.code);
      else state.keys.delete(e.code);
    };
    window.addEventListener('keydown', (e) => onKey(e, true));
    window.addEventListener('keyup', (e) => onKey(e, false));
    dom.addEventListener('click', () => {
      if (document.pointerLockElement !== dom) dom.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      state.locked = document.pointerLockElement === dom;
    });
    document.addEventListener('mousemove', (e) => {
      look(e.movementX, e.movementY);
    });
  }

  return {
    camera,
    state,
    update,
    look,
    setPose,
    bind,
    syncCamera,
    radius,
    height,
    eye,
  };
}

export function createWorldCamera() {
  const camera = new PerspectiveCamera(68, 16 / 9, 0.05, 120);
  camera.position.set(0, 1.7, 2.2);
  return camera;
}
