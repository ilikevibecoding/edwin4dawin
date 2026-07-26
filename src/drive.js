import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Arcade truck handling. A bicycle model with a low-pass on everything, which
// is all a showcase needs: the job is to look planted, not to simulate a diff.
// ---------------------------------------------------------------------------

const KEYS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  brake: ['Space'],
  boost: ['ShiftLeft', 'ShiftRight'],
};

export function createDriver({ terrain, vehicle, startT = 0.42 }) {
  const input = { throttle: 0, brake: 0, steer: 0, boost: 0 };
  const down = new Set();

  const state = {
    pos: new THREE.Vector3(),
    heading: 0,
    speed: 0,
    steer: 0,
    accel: 0,
    lateral: 0,
    auto: true,
    autoT: startT,
  };

  // drop the truck on the road facing along it
  const p0 = terrain.roadPoint(startT);
  const t0 = terrain.roadTangent(startT);
  state.pos.copy(p0);
  state.heading = Math.atan2(t0.x, t0.z);

  function onKey(e, isDown) {
    if (isDown) down.add(e.code);
    else down.delete(e.code);
    if (Object.values(KEYS).flat().includes(e.code)) e.preventDefault();
    if (isDown && (KEYS.forward.includes(e.code) || KEYS.back.includes(e.code))) state.auto = false;
  }
  const kd = (e) => onKey(e, true);
  const ku = (e) => onKey(e, false);
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);

  const has = (list) => list.some((c) => down.has(c));

  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const _c = new THREE.Vector3();
  const _n = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _up = new THREE.Vector3(0, 1, 0);

  /** Terrain normal from three nearby height samples. */
  function normalAt(x, z, r = 1.1) {
    const h0 = terrain.heightAt(x, z);
    const hx = terrain.heightAt(x + r, z);
    const hz = terrain.heightAt(x, z + r);
    _a.set(r, hx - h0, 0);
    _b.set(0, hz - h0, r);
    return _n.crossVectors(_b, _a).normalize();
  }

  function update(dt) {
    // a zero or absurd dt turns the acceleration term into NaN and poisons
    // every transform downstream, so clamp it before anything else runs
    dt = THREE.MathUtils.clamp(dt, 1e-4, 1 / 20);

    if (state.auto) {
      // follow the road so the demo is alive before anyone touches a key
      state.autoT += (dt * 9.5) / 330;
      if (state.autoT > 0.94) state.autoT = 0.06;
      const ahead = terrain.roadPoint(Math.min(0.98, state.autoT + 0.012));
      const toAhead = _c.copy(ahead).sub(state.pos);
      const want = Math.atan2(toAhead.x, toAhead.z);
      let diff = want - state.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      input.steer = THREE.MathUtils.clamp(diff * 1.9, -1, 1);
      input.throttle = 1;
      input.brake = 0;
    } else {
      const t = (has(KEYS.forward) ? 1 : 0) - (has(KEYS.back) ? 1 : 0);
      input.throttle = Math.max(0, t);
      input.brake = has(KEYS.brake) ? 1 : Math.max(0, -t);
      const s = (has(KEYS.left) ? 1 : 0) - (has(KEYS.right) ? 1 : 0);
      input.steer += (s - input.steer) * (1 - Math.exp(-dt * 9));
      input.boost = has(KEYS.boost) ? 1 : 0;
    }

    const maxSpeed = 13 + input.boost * 8;
    const prevSpeed = state.speed;
    const drive = input.throttle * 9.5 * (1 + input.boost * 0.5);
    const brake = input.brake * (state.speed > 0.2 ? 16 : 5);
    const drag = 0.42 * state.speed + 0.02 * state.speed * Math.abs(state.speed);
    state.speed += (drive - brake - drag) * dt;
    if (!input.throttle && !input.brake && Math.abs(state.speed) < 0.15) state.speed *= 0.85;
    state.speed = THREE.MathUtils.clamp(state.speed, -5, maxSpeed);
    state.accel = (state.speed - prevSpeed) / dt;

    // steering falls off with speed, like a real rack does
    const steerLimit = 0.56 / (1 + Math.abs(state.speed) * 0.075);
    const targetSteer = input.steer * steerLimit;
    state.steer += (targetSteer - state.steer) * (1 - Math.exp(-dt * 8));

    const yawRate = (state.speed / 3.06) * Math.tan(state.steer);
    state.heading += yawRate * dt;
    state.lateral = yawRate * state.speed;

    state.pos.x += Math.sin(state.heading) * state.speed * dt;
    state.pos.z += Math.cos(state.heading) * state.speed * dt;
    // keep the truck inside the playable area
    const lim = terrain.size * 0.45;
    state.pos.x = THREE.MathUtils.clamp(state.pos.x, -lim, lim);
    state.pos.z = THREE.MathUtils.clamp(state.pos.z, -lim, lim);
    state.pos.y = terrain.heightAt(state.pos.x, state.pos.z);

    // place and align the vehicle
    const root = vehicle.root;
    root.position.copy(state.pos);
    const n = normalAt(state.pos.x, state.pos.z);
    _q.setFromUnitVectors(_up, n);
    root.quaternion.copy(_q);
    root.rotateY(state.heading);

    vehicle.update(dt, {
      speed: state.speed,
      steer: state.steer,
      accel: state.accel,
      lateral: state.lateral,
      terrainY: (x, z) => terrain.heightAt(x, z),
    });
  }

  function dispose() {
    window.removeEventListener('keydown', kd);
    window.removeEventListener('keyup', ku);
  }

  return { state, input, update, dispose };
}
