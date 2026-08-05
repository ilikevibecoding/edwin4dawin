// player.js — first-person controller: pointer lock, WASD + sprint, head bob,
// footsteps, camera shake (trauma-based), capsule-vs-world collision.
import * as THREE from 'three';
import { clamp, damp, lerp } from './util.js';
import { resolveCapsule } from './physics.js';
import { terrainHeight } from './base.js';

const EYE_HEIGHT = 1.7;
const WALK_SPEED = 4.3;
const SPRINT_SPEED = 7.4;
const ACCEL = 42;
const FRICTION = 11;
const RADIUS = 0.38;

export function createPlayer(ctx) {
  const { camera, renderer } = ctx;

  const state = {
    enabled: true,
    locked: false,
    yaw: Math.PI, // face -Z? yaw=PI faces +Z... set at spawn below
    pitch: 0,
    feet: new THREE.Vector3(2, 0, 14),
    vel: new THREE.Vector3(),
    bobPhase: 0,
    bobAmp: 0,
    trauma: 0,
    shakeT: 0,
    keys: new Set(),
    moving: false,
    sprinting: false,
    footstepSide: 0,
  };

  // spawn: on the apron looking toward the shelter/radar (north, -Z)
  state.feet.set(4, 0, 16);
  state.yaw = Math.PI * 1.0; // three.js: yaw 0 faces -Z with our convention below

  const canvas = renderer.domElement;

  function onMouseMove(e) {
    if (!state.locked || !state.enabled) return;
    const sens = 0.0021;
    state.yaw -= e.movementX * sens;
    state.pitch -= e.movementY * sens;
    state.pitch = clamp(state.pitch, -1.45, 1.45);
  }

  function onKey(e, down) {
    if (e.repeat) return;
    const k = e.code;
    if (down) state.keys.add(k); else state.keys.delete(k);
  }

  document.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));
  document.addEventListener('pointerlockchange', () => {
    state.locked = document.pointerLockElement === canvas;
    ctx.events.emit('pointer-lock', state.locked);
  });

  const _fwd = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _wish = new THREE.Vector3();
  const _shakeOff = new THREE.Vector3();
  const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

  function groundAt(x, z) {
    return terrainHeight(x, z);
  }

  const api = {
    state,
    get position() { return state.feet; },
    get eyePosition() { return camera.position; },
    lockPointer() {
      if (!state.locked) canvas.requestPointerLock?.();
    },
    unlockPointer() {
      if (state.locked) document.exitPointerLock?.();
    },
    setEnabled(v) {
      state.enabled = v;
      if (!v) { state.keys.clear(); state.vel.set(0, 0, 0); }
    },
    teleport(x, y, z, yaw = state.yaw, pitch = state.pitch) {
      state.feet.set(x, y ?? groundAt(x, z), z);
      state.yaw = yaw;
      state.pitch = pitch;
      state.vel.set(0, 0, 0);
      api.update(0);
    },
    addShake(amount) {
      state.trauma = clamp(state.trauma + amount, 0, 1.2);
    },
    update(dt) {
      const reduced = ctx.settings.reducedMotion;

      if (state.enabled && dt > 0) {
        // wish direction in yaw space
        _fwd.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
        _right.set(-_fwd.z, 0, _fwd.x);
        _wish.set(0, 0, 0);
        const K = state.keys;
        if (K.has('KeyW') || K.has('ArrowUp')) _wish.add(_fwd);
        if (K.has('KeyS') || K.has('ArrowDown')) _wish.sub(_fwd);
        if (K.has('KeyD') || K.has('ArrowRight')) _wish.add(_right);
        if (K.has('KeyA') || K.has('ArrowLeft')) _wish.sub(_right);
        state.sprinting = (K.has('ShiftLeft') || K.has('ShiftRight')) && _wish.lengthSq() > 0;
        const maxSpeed = state.sprinting ? SPRINT_SPEED : WALK_SPEED;

        if (_wish.lengthSq() > 0) {
          _wish.normalize().multiplyScalar(ACCEL * dt);
          state.vel.add(_wish);
          const sp = state.vel.length();
          if (sp > maxSpeed) state.vel.multiplyScalar(maxSpeed / sp);
        } else {
          const sp = state.vel.length();
          const drop = sp * FRICTION * dt;
          state.vel.multiplyScalar(sp > 0.001 ? Math.max(0, sp - drop) / sp : 0);
        }

        state.feet.x += state.vel.x * dt;
        state.feet.z += state.vel.z * dt;

        // keep player near the base
        const r = Math.hypot(state.feet.x, state.feet.z);
        if (r > 1200) {
          state.feet.x *= 1200 / r;
          state.feet.z *= 1200 / r;
        }

        resolveCapsule(state.feet, RADIUS, 1.8, ctx.world.colliders);
        state.feet.y = groundAt(state.feet.x, state.feet.z);
      }

      const speed = state.vel.length();
      state.moving = speed > 0.4;

      // head bob
      const targetAmp = state.moving && !reduced ? clamp(speed / SPRINT_SPEED, 0, 1) : 0;
      state.bobAmp = damp(state.bobAmp, targetAmp, 8, Math.max(dt, 1e-4));
      const bobFreq = state.sprinting ? 11.4 : 8.4;
      const prevPhase = state.bobPhase;
      if (state.moving) state.bobPhase += dt * bobFreq;
      const bobY = Math.abs(Math.sin(state.bobPhase)) * 0.042 * state.bobAmp;
      const bobX = Math.sin(state.bobPhase * 0.5) * 0.02 * state.bobAmp;
      // footstep trigger at bob valley
      if (Math.floor(prevPhase / Math.PI) !== Math.floor(state.bobPhase / Math.PI) && state.moving) {
        state.footstepSide ^= 1;
        ctx.events.emit('footstep', { sprint: state.sprinting, side: state.footstepSide });
      }

      // camera shake (trauma^2 falloff)
      state.trauma = Math.max(0, state.trauma - dt * 0.85);
      state.shakeT += dt * 34;
      const shakeScale = reduced ? 0.12 : 1;
      const sh = state.trauma * state.trauma * shakeScale;
      _shakeOff.set(
        (Math.sin(state.shakeT * 1.1) + Math.sin(state.shakeT * 2.63) * 0.5) * 0.021 * sh,
        (Math.sin(state.shakeT * 1.47 + 2) + Math.sin(state.shakeT * 3.1) * 0.5) * 0.024 * sh,
        0
      );
      const shakeYaw = Math.sin(state.shakeT * 1.7 + 4) * 0.0035 * sh;

      camera.position.set(
        state.feet.x + bobX * Math.cos(state.yaw) + _shakeOff.x,
        state.feet.y + EYE_HEIGHT + bobY + _shakeOff.y,
        state.feet.z - bobX * Math.sin(state.yaw)
      );
      _euler.set(state.pitch, state.yaw + shakeYaw, Math.sin(state.bobPhase * 0.5) * 0.0035 * state.bobAmp);
      camera.quaternion.setFromEuler(_euler);
    },
  };

  return api;
}
