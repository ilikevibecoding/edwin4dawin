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

// Ride rates, in Hz. A soft long-travel offroad truck sits near one hertz in
// heave; the attitude springs are a touch quicker so the body settles level
// before it settles low, which is the order a real one does it in.
const HEAVE_HZ = 1.15;
const TILT_HZ = 1.45;

/** One explicit step of a critically damped spring. `s` is mutated. */
function springStep(s, target, freq, dt) {
  const w = 2 * Math.PI * freq;
  s.v += (-2 * w * s.v - w * w * (s.x - target)) * dt;
  s.x += s.v * dt;
}

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
    yawRate: 0,
    rpm: 0,
    gear: 1,
    auto: true,
    autoT: startT,
  };

  // --- ride ------------------------------------------------------------------
  // The chassis used to sit at heightAt() under its own centre and take its
  // attitude from the terrain normal sampled 1.1 m out. On a two-track that
  // radius reaches from the crown into the ruts, so the sampled normal swung
  // with every heading change and the whole truck rocked; and pinning the body
  // to a point sample meant every lump in the ground went straight into the
  // camera.
  //
  // Now the four contact patches are sampled and a plane is least-squares
  // fitted through them, which filters anything shorter than the wheelbase for
  // free, and the body follows that plane through springs rather than being
  // welded to it. What the springs do not absorb, the suspension travel does.
  const contacts = vehicle.wheels.map((w) => ({ x: w.x, z: w.z, wx: 0, wz: 0, y: 0 }));
  const heave = { x: 0, v: 0 };
  const tiltX = { x: 0, v: 0 };
  const tiltZ = { x: 0, v: 0 };
  let rideInit = false;

  // Auto-drive tours both roads: up the spur, then out onto the graded mainline
  // at the crossing. A second road nobody ever ends up on is not much of a
  // feature, and the junction is the one place the two surfaces can be compared
  // in a single frame.
  const routes = {
    trail: { point: (t) => terrain.roadPoint(t), length: terrain.roadLength || 330 },
    main: { point: (t) => terrain.mainPoint(t), length: terrain.mainLength || 330 },
  };
  const junction = terrain.junction && terrain.mainPoint ? terrain.junction : null;

  /**
   * Put auto-drive back at a known point on the spur. The beauty captures reset
   * position and speed between views, and without this a capture that ran after
   * the truck had taken the turn would read its start parameter on the mainline
   * instead — two views of "the same" framing, in different places.
   */
  function resetAuto(t = startT) {
    state.route = 'trail';
    state.autoDir = 1;
    state.turned = false;
    state.autoT = t;
  }
  resetAuto(startT);

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

  const _c = new THREE.Vector3();
  const _n = new THREE.Vector3();
  const _q = new THREE.Quaternion();
  const _up = new THREE.Vector3(0, 1, 0);

  /**
   * Sample the four contact patches and least-squares fit a plane through them.
   * Writes each patch's world position and ground height into `contacts` so the
   * vehicle can reuse them for suspension travel — heightAt() is a full road
   * lookup, and sampling twice would double the cost of the frame's terrain work.
   */
  function fitGround(px, pz, heading) {
    const sh = Math.sin(heading);
    const ch = Math.cos(heading);
    let hSum = 0;
    for (const c of contacts) {
      c.wx = px + c.x * ch + c.z * sh;
      c.wz = pz - c.x * sh + c.z * ch;
      c.y = terrain.heightAt(c.wx, c.wz);
      hSum += c.y;
    }
    const mean = hSum / contacts.length;

    let sxx = 0;
    let szz = 0;
    let sxz = 0;
    let sxh = 0;
    let szh = 0;
    for (const c of contacts) {
      const dx = c.wx - px;
      const dz = c.wz - pz;
      const dh = c.y - mean;
      sxx += dx * dx;
      szz += dz * dz;
      sxz += dx * dz;
      sxh += dx * dh;
      szh += dz * dh;
    }
    const det = sxx * szz - sxz * sxz;
    let gx = 0;
    let gz = 0;
    if (Math.abs(det) > 1e-6) {
      gx = (sxh * szz - szh * sxz) / det;
      gz = (szh * sxx - sxh * sxz) / det;
    }
    // A truck articulates over a step, it does not stand on its nose. Bounding
    // the fitted gradient also keeps one wheel dropping into a hole from
    // throwing the body.
    fit.mean = mean;
    fit.gx = THREE.MathUtils.clamp(gx, -0.6, 0.6);
    fit.gz = THREE.MathUtils.clamp(gz, -0.6, 0.6);
  }
  const fit = { mean: 0, gx: 0, gz: 0 };

  function update(dt) {
    // a zero or absurd dt turns the acceleration term into NaN and poisons
    // every transform downstream, so clamp it before anything else runs
    dt = THREE.MathUtils.clamp(dt, 1e-4, 1 / 20);

    if (state.auto) {
      // Follow the road so the demo is alive before anyone touches a key.
      // Advance by the distance actually covered, not a fixed rate, or the
      // target creeps away from the truck whenever the two disagree.
      const route = routes[state.route];
      // Take the turn once, on the way past. Which way along the mainline is
      // decided by whichever direction the truck is already pointing, so it
      // swings onto the road rather than spinning round on the apron.
      if (junction && !state.turned && state.route === 'trail' && state.autoT >= junction.trailT) {
        const tg = terrain.mainTangent(junction.mainT);
        state.autoDir = Math.sin(state.heading) * tg.x + Math.cos(state.heading) * tg.z >= 0 ? 1 : -1;
        state.route = 'main';
        state.autoT = junction.mainT;
        state.turned = true;
      }
      state.autoT += (state.autoDir * dt * Math.max(state.speed, 0.5)) / route.length;
      // Back to the top of the spur at either end rather than reversing: a
      // three-point turn on a forest road is not what this is for.
      if (state.autoT > 0.96 || state.autoT < 0.04) resetAuto(0.04);
      // Lookahead scaled to speed. A fixed 4 m target is 0.4 s of preview at
      // cruise, and steering at it with a gain of 1.9 is what had the truck
      // weaving down every straight — half of what read as a bumpy ride was
      // this, not the ground.
      const lead = (state.autoDir * THREE.MathUtils.clamp(7 + state.speed * 0.95, 7, 24)) / route.length;
      const ahead = route.point(THREE.MathUtils.clamp(state.autoT + lead, 0.005, 0.995));
      const toAhead = _c.copy(ahead).sub(state.pos);
      const want = Math.atan2(toAhead.x, toAhead.z);
      let diff = want - state.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      // Proportional on the heading error, damped by the rate already being
      // turned at, so the correction stops instead of overshooting into the
      // next one.
      const wantSteer = THREE.MathUtils.clamp(diff * 1.15 - state.yawRate * 0.3, -1, 1);
      input.steer += (wantSteer - input.steer) * (1 - Math.exp(-dt * 6));
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

    state.yawRate = (state.speed / 3.06) * Math.tan(state.steer);
    state.heading += state.yawRate * dt;
    state.lateral = state.yawRate * state.speed;

    state.pos.x += Math.sin(state.heading) * state.speed * dt;
    state.pos.z += Math.cos(state.heading) * state.speed * dt;
    // keep the truck inside the playable area
    const lim = terrain.size * 0.45;
    state.pos.x = THREE.MathUtils.clamp(state.pos.x, -lim, lim);
    state.pos.z = THREE.MathUtils.clamp(state.pos.z, -lim, lim);

    // a rev counter needs a gearbox to read against, and there isn't one
    const span = 13 + 8;
    const rev = Math.abs(state.speed) / span;
    state.gear = rev < 0.16 ? 1 : rev < 0.34 ? 2 : rev < 0.58 ? 3 : 4;
    const ratio = [0, 0.16, 0.34, 0.58, 1.0][state.gear];
    const target = THREE.MathUtils.clamp(0.09 + (rev / ratio) * 0.78 + input.throttle * 0.08, 0, 1.05);
    state.rpm += (target - state.rpm) * (1 - Math.exp(-dt * 7));

    fitGround(state.pos.x, state.pos.z, state.heading);
    if (!rideInit) {
      heave.x = fit.mean;
      tiltX.x = fit.gx;
      tiltZ.x = fit.gz;
      rideInit = true;
    }
    springStep(heave, fit.mean, HEAVE_HZ, dt);
    springStep(tiltX, fit.gx, TILT_HZ, dt);
    springStep(tiltZ, fit.gz, TILT_HZ, dt);
    state.pos.y = heave.x;

    // How far each patch sits off the body's own plane. This is the suspension's
    // job, and it is what is left after the plane fit and the springs; measuring
    // it against the body height alone would count the body's tilt twice.
    for (const c of contacts) {
      c.deflect = c.y - (heave.x + tiltX.x * (c.wx - state.pos.x) + tiltZ.x * (c.wz - state.pos.z));
    }

    // place and align the vehicle
    const root = vehicle.root;
    root.position.copy(state.pos);
    _n.set(-tiltX.x, 1, -tiltZ.x).normalize();
    _q.setFromUnitVectors(_up, _n);
    root.quaternion.copy(_q);
    root.rotateY(state.heading);

    vehicle.update(dt, {
      speed: state.speed,
      steer: state.steer,
      accel: state.accel,
      lateral: state.lateral,
      throttle: input.throttle,
      brake: input.brake,
      rpm: state.rpm,
      maxSpeed,
      contacts,
    });
  }

  function dispose() {
    window.removeEventListener('keydown', kd);
    window.removeEventListener('keyup', ku);
  }

  return { state, input, update, resetAuto, dispose };
}
