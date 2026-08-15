import * as THREE from 'three';

const EYE = 1.7;
const RADIUS = 0.32;
const SPEED = 3.4;
const SPRINT = 5.2;

export function createPlayer(camera, colliders, heightAt) {
  const yaw = { value: Math.PI };
  const pitch = { value: -0.08 };
  const pos = new THREE.Vector3(3.4, EYE, 6.2);
  const vel = new THREE.Vector3();
  const keys = new Set();
  let locked = false;
  let bob = 0;
  let seated = false;
  let seatTarget = null;

  function onKey(e, down) {
    if (e.repeat) return;
    const k = e.code;
    if (down) keys.add(k);
    else keys.delete(k);
  }

  function onMouse(e) {
    if (!locked || seated) return;
    yaw.value -= e.movementX * 0.0022;
    pitch.value -= e.movementY * 0.0022;
    pitch.value = THREE.MathUtils.clamp(pitch.value, -1.2, 1.2);
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

  function blocked(next) {
    const p = next.clone();
    p.y = 0.9;
    for (const box of colliders) {
      const closest = new THREE.Vector3(
        THREE.MathUtils.clamp(p.x, box.min.x, box.max.x),
        THREE.MathUtils.clamp(p.y, box.min.y, box.max.y),
        THREE.MathUtils.clamp(p.z, box.min.z, box.max.z),
      );
      if (closest.distanceTo(p) < RADIUS) return true;
    }
    return false;
  }

  function sit(eye) {
    seated = true;
    seatTarget = eye;
  }

  function stand() {
    seated = false;
    seatTarget = null;
    pos.set(1.6, EYE, 0.4);
  }

  function update(dt) {
    if (seated && seatTarget) {
      camera.position.set(seatTarget.x, seatTarget.y, seatTarget.z);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = yaw.value;
      camera.rotation.x = pitch.value;
      return { seated, locked, moving: false };
    }

    const forward = new THREE.Vector3(Math.sin(yaw.value), 0, Math.cos(yaw.value));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const wish = new THREE.Vector3();
    if (keys.has('KeyW')) wish.add(forward);
    if (keys.has('KeyS')) wish.sub(forward);
    if (keys.has('KeyD')) wish.add(right);
    if (keys.has('KeyA')) wish.sub(right);
    const moving = wish.lengthSq() > 0;
    if (moving) wish.normalize();
    const spd = keys.has('ShiftLeft') ? SPRINT : SPEED;
    vel.copy(wish).multiplyScalar(spd);

    const next = pos.clone().addScaledVector(vel, dt);
    if (!blocked(new THREE.Vector3(next.x, pos.y, pos.z))) pos.x = next.x;
    if (!blocked(new THREE.Vector3(pos.x, pos.y, next.z))) pos.z = next.z;

    const ground = heightAt ? heightAt(pos.x, pos.z) : 0;
    pos.y = ground + EYE;
    if (moving) bob += dt * 9;
    const bobY = moving ? Math.sin(bob) * 0.025 : 0;
    const bobX = moving ? Math.cos(bob * 0.5) * 0.01 : 0;

    camera.position.set(pos.x + bobX, pos.y + bobY, pos.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw.value;
    camera.rotation.x = pitch.value;
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
