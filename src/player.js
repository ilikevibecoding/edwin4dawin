import * as THREE from 'three';

const EYE = 1.7;
const RADIUS = 0.32;
const SPEED = 3.4;
const SPRINT = 5.2;
const BOB_FREQ = 9;
const BOB_Y = 0.025;
const BOB_X = 0.01;
const LOOK_SENS = 0.0022;
const PITCH_MIN = -1.2;
const PITCH_MAX = 1.2;
const RESOLVE_ITERS = 3;

export function createPlayer(camera, colliders, heightAt) {
  const yaw = { value: Math.PI };
  const pitch = { value: -0.08 };
  const pos = new THREE.Vector3(3.4, EYE, 6.2);
  const vel = new THREE.Vector3();
  const keys = new Set();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const wish = new THREE.Vector3();
  const seatTarget = new THREE.Vector3();
  let locked = false;
  let bob = 0;
  let bobX = 0;
  let bobY = 0;
  let seated = false;
  let hasSeat = false;

  function onKey(e, down) {
    if (e.repeat) return;
    const k = e.code;
    if (down) keys.add(k);
    else keys.delete(k);
  }

  function onMouse(e) {
    if (!locked) return;
    yaw.value -= e.movementX * LOOK_SENS;
    pitch.value -= e.movementY * LOOK_SENS;
    pitch.value = THREE.MathUtils.clamp(pitch.value, PITCH_MIN, PITCH_MAX);
  }

  function attach(dom) {
    window.addEventListener('keydown', (e) => onKey(e, true));
    window.addEventListener('keyup', (e) => onKey(e, false));
    window.addEventListener('mousemove', onMouse);
    dom.addEventListener('click', () => {
      if (!locked) dom.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      locked = document.pointerLockElement === dom;
    });
  }

  // Vertical capsule (eye-high) vs AABB: push out in XZ so motion slides.
  function separate(p, box) {
    const capMin = RADIUS;
    const capMax = EYE;
    if (box.max.y < capMin || box.min.y > capMax) return false;

    const cx = THREE.MathUtils.clamp(p.x, box.min.x, box.max.x);
    const cz = THREE.MathUtils.clamp(p.z, box.min.z, box.max.z);
    let dx = p.x - cx;
    let dz = p.z - cz;
    const d2 = dx * dx + dz * dz;

    if (d2 > 1e-10) {
      if (d2 >= RADIUS * RADIUS) return false;
      const d = Math.sqrt(d2);
      const push = (RADIUS - d) / d;
      p.x += dx * push;
      p.z += dz * push;
      return true;
    }

    const left = p.x - box.min.x;
    const right = box.max.x - p.x;
    const back = p.z - box.min.z;
    const fwd = box.max.z - p.z;
    const smallest = Math.min(left, right, back, fwd);
    if (smallest === left) p.x = box.min.x - RADIUS;
    else if (smallest === right) p.x = box.max.x + RADIUS;
    else if (smallest === back) p.z = box.min.z - RADIUS;
    else p.z = box.max.z + RADIUS;
    return true;
  }

  function resolve(p) {
    if (!colliders || !colliders.length) return;
    for (let i = 0; i < RESOLVE_ITERS; i++) {
      let hit = false;
      for (const box of colliders) {
        if (separate(p, box)) hit = true;
      }
      if (!hit) break;
    }
  }

  function plant() {
    const ground = heightAt ? heightAt(pos.x, pos.z) : 0;
    pos.y = ground + EYE;
  }

  function sit(eye) {
    seated = true;
    hasSeat = true;
    seatTarget.set(eye.x, eye.y, eye.z);
    pos.set(eye.x, eye.y, eye.z);
    bob = 0;
    bobX = 0;
    bobY = 0;
    camera.position.copy(seatTarget);
    applyLook();
  }

  function stand() {
    seated = false;
    hasSeat = false;
    pos.set(1.6, EYE, 0.4);
    resolve(pos);
    plant();
    bob = 0;
    bobX = 0;
    bobY = 0;
    camera.position.copy(pos);
    applyLook();
  }

  function applyLook() {
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw.value;
    camera.rotation.x = pitch.value;
  }

  function update(dt) {
    if (seated && hasSeat) {
      camera.position.set(seatTarget.x, seatTarget.y, seatTarget.z);
      applyLook();
      return { seated, locked, moving: false };
    }

    forward.set(Math.sin(yaw.value), 0, Math.cos(yaw.value));
    right.set(forward.z, 0, -forward.x);
    wish.set(0, 0, 0);
    if (keys.has('KeyW')) wish.add(forward);
    if (keys.has('KeyS')) wish.sub(forward);
    if (keys.has('KeyD')) wish.add(right);
    if (keys.has('KeyA')) wish.sub(right);
    const moving = wish.lengthSq() > 0;
    if (moving) wish.normalize();
    const spd = keys.has('ShiftLeft') ? SPRINT : SPEED;
    vel.copy(wish).multiplyScalar(spd);

    pos.x += vel.x * dt;
    pos.z += vel.z * dt;
    resolve(pos);
    plant();

    if (moving) {
      bob += dt * BOB_FREQ;
      bobY = Math.sin(bob) * BOB_Y;
      bobX = Math.cos(bob * 0.5) * BOB_X;
    } else {
      bob = 0;
      bobY = 0;
      bobX = 0;
    }

    camera.position.set(pos.x + bobX, pos.y + bobY, pos.z);
    applyLook();
    return { seated, locked, moving };
  }

  return {
    attach,
    update,
    sit,
    stand,
    get position() {
      return pos;
    },
    get yaw() {
      return yaw.value;
    },
    setLook(y, p) {
      yaw.value = y;
      pitch.value = p;
    },
    get locked() {
      return locked;
    },
    get seated() {
      return seated;
    },
    keys,
  };
}
