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
const WALK_FOV = 52;
const CHASE_FOV = 58;
const COCKPIT_FOV = 64;

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
  const chasePos = new THREE.Vector3();
  const chaseLook = new THREE.Vector3();
  const chaseVel = new THREE.Vector3();
  let seatFollow = null;
  let locked = false;
  let bob = 0;
  let bobX = 0;
  let bobY = 0;
  let seated = false;
  let hasSeat = false;
  let camMode = 'walk';
  let sitHeading = 0;

  function onKey(e, down) {
    if (e.repeat) return;
    const k = e.code;
    if (down) keys.add(k);
    else keys.delete(k);
    if (down && k === 'KeyC' && seated) {
      camMode = camMode === 'chase' ? 'cockpit' : 'chase';
      applyFov();
    }
  }

  function onMouse(e) {
    if (!locked) return;
    yaw.value -= e.movementX * LOOK_SENS;
    pitch.value -= e.movementY * LOOK_SENS;
    pitch.value = THREE.MathUtils.clamp(pitch.value, PITCH_MIN, PITCH_MAX);
  }

  function applyFov() {
    if (camMode === 'chase') camera.fov = CHASE_FOV;
    else if (camMode === 'cockpit') camera.fov = COCKPIT_FOV;
    else camera.fov = WALK_FOV;
    camera.updateProjectionMatrix();
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
    const rightGap = box.max.x - p.x;
    const back = p.z - box.min.z;
    const fwd = box.max.z - p.z;
    const smallest = Math.min(left, rightGap, back, fwd);
    if (smallest === left) p.x = box.min.x - RADIUS;
    else if (smallest === rightGap) p.x = box.max.x + RADIUS;
    else if (smallest === back) p.z = box.min.z - RADIUS;
    else p.z = box.max.z + RADIUS;
    return true;
  }

  function resolve(p) {
    if (!colliders || !colliders.length) return;
    for (let i = 0; i < RESOLVE_ITERS; i++) {
      let hit = false;
      for (const box of colliders) {
        if (box.userData && box.userData.vehicle && seated) continue;
        if (separate(p, box)) hit = true;
      }
      if (!hit) break;
    }
  }

  function plant() {
    const ground = heightAt ? heightAt(pos.x, pos.z) : 0;
    pos.y = ground + EYE;
  }

  function sit(eyeOrFn, heading = 0) {
    seated = true;
    hasSeat = true;
    sitHeading = heading;
    if (typeof eyeOrFn === 'function') {
      seatFollow = eyeOrFn;
      seatTarget.copy(eyeOrFn());
    } else {
      seatTarget.set(eyeOrFn.x, eyeOrFn.y, eyeOrFn.z);
      seatFollow = null;
    }
    pos.copy(seatTarget);
    bob = 0;
    bobX = 0;
    bobY = 0;
    yaw.value = Math.PI + heading;
    pitch.value = -0.06;
    camMode = 'chase';
    chasePos.set(seatTarget.x, seatTarget.y + 1.4, seatTarget.z - 6.4);
    chaseVel.set(0, 0, 0);
    applyFov();
    camera.position.copy(chasePos);
  }

  function stand(at) {
    seated = false;
    hasSeat = false;
    seatFollow = null;
    camMode = 'walk';
    if (at) pos.set(at.x, at.y, at.z);
    else pos.set(1.6, EYE, 0.4);
    resolve(pos);
    plant();
    bob = 0;
    bobX = 0;
    bobY = 0;
    applyFov();
    camera.position.copy(pos);
    applyLook();
  }

  function applyLook() {
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw.value;
    camera.rotation.x = pitch.value;
    camera.rotation.z = 0;
  }

  function eyeNow() {
    if (seatFollow) {
      seatTarget.copy(seatFollow());
    }
    return seatTarget;
  }

  function applyChase(dt, vehicle) {
    const heading = vehicle.heading ?? 0;
    const speed = vehicle.speed ?? 0;
    const eye = eyeNow();
    const yawOff = THREE.MathUtils.clamp(yaw.value - (Math.PI + heading), -0.85, 0.85);
    const back = 6.6 + Math.min(2.2, Math.abs(speed) * 0.12);
    const up = 2.05 + pitch.value * -0.45;
    const lookH = heading + yawOff * 0.35;
    const camH = heading + yawOff;
    const fx = Math.sin(camH);
    const fz = Math.cos(camH);
    const desired = chaseLook.set(vehicle.x - fx * back, vehicle.y + up, vehicle.z - fz * back);
    const k = 1 - Math.exp(-6.2 * dt);
    chasePos.lerp(desired, k);
    camera.position.copy(chasePos);
    const look = eye.clone();
    look.x += Math.sin(lookH) * 4.2;
    look.y -= 0.15;
    look.z += Math.cos(lookH) * 4.2;
    camera.lookAt(look);
    camera.fov = CHASE_FOV + Math.min(7, Math.abs(speed) * 0.32);
    camera.updateProjectionMatrix();
  }

  function update(dt, vehiclePose) {
    if (seated && hasSeat) {
      const eye = eyeNow();
      pos.copy(eye);
      if (camMode === 'chase' && vehiclePose) {
        applyChase(dt, vehiclePose);
      } else {
        camera.fov = COCKPIT_FOV;
        camera.updateProjectionMatrix();
        camera.position.set(eye.x, eye.y, eye.z);
        applyLook();
      }
      return { seated, locked, moving: false, camMode };
    }

    // Camera default looks down -Z. World look dir is (-sin(yaw), 0, -cos(yaw)).
    // Keep A/D on camera-right (cos, 0, -sin) so strafe stays correct.
    forward.set(-Math.sin(yaw.value), 0, -Math.cos(yaw.value));
    right.set(Math.cos(yaw.value), 0, -Math.sin(yaw.value));
    wish.set(0, 0, 0);
    if (keys.has('KeyW')) wish.add(forward);
    if (keys.has('KeyS')) wish.sub(forward);
    if (keys.has('KeyD')) wish.add(right);
    if (keys.has('KeyA')) wish.sub(right);
    const moving = wish.lengthSq() > 0;
    if (moving) wish.normalize();
    const spd = keys.has('ShiftLeft') || keys.has('ShiftRight') ? SPRINT : SPEED;
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
    return { seated, locked, moving, camMode };
  }

  return {
    attach,
    update,
    sit,
    stand,
    applyFov,
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
    lookDir() {
      return {
        x: -Math.sin(yaw.value),
        y: 0,
        z: -Math.cos(yaw.value),
      };
    },
    get locked() {
      return locked;
    },
    get seated() {
      return seated;
    },
    get camMode() {
      return camMode;
    },
    setCamMode(mode) {
      if (mode === 'chase' || mode === 'cockpit' || mode === 'walk') {
        camMode = mode;
        applyFov();
      }
    },
    keys,
  };
}
