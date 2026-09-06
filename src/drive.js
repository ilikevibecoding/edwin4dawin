import * as THREE from 'three';
import { WORLD } from './world.js';

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

// Collision response. Restitution is what a truck does against concrete: a
// head-on stop rocks back a little rather than sticking to the wall. Sustained
// contact — a slide along a boma — bleeds the into-wall velocity at a rate
// instead of killing it every frame, or the bicycle model (whose velocity is
// always along its heading) would grind to a halt against anything it touched
// at a shallow angle. `SPIN_TAU` is how long a yaw kick from a corner hit
// takes to die away; with the gain at 0.2 a 15° graze on the boma at 10 m/s
// turns the truck about 5° further than the wall itself did — a little, as
// clipping a post should, not a spin. At 0.35 the rear corner swung into the
// pile as the nose came off it and the second kick left it 16° off the wall.
const RESTITUTION = 0.15;
const SCRAPE_TAU = 0.15;
const DEFLECT = 0.7;
const DEFLECT_MAX = 0.35;
const SPIN_GAIN = 0.2;
const SPIN_TAU = 0.2;
const JOLT_TAU = 0.12;

export function createDriver({ terrain, vehicle, collision = null, startT = 0.42 }) {
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
    // > 0: auto-drive holds this speed with the throttle balancing drag (the
    // capture pre-roll); 0: the caps below set the pace
    cruise: 0,
    // collision: the normal-velocity change this frame (m/s) and where it
    // happened, held for one frame for the audio and the camera; whether the
    // truck is resting against something; the yaw kick still working out
    impact: 0,
    impactPos: null,
    contact: false,
    contactTag: null,
    spin: 0,
    jolt: 0,
  };

  // --- collision -------------------------------------------------------------
  // Three circles along the truck's axis, sized from its real footprint (the
  // hull is 4.9 x 1.76 m plus bumpers and the spare). The world does the
  // broad and narrow phases; this file owns what happens to the truck.
  const S = vehicle.spec || {};
  const nose = S.noseZ ?? 2.44;
  const tail = S.tailZ ?? -2.5;
  const halfW = S.bodyHalfWidth ?? 0.88;
  const R = THREE.MathUtils.clamp(halfW + 0.17, 1.0, 1.1);
  const circles = [
    { dz: nose - R + 0.08, r: R },
    { dz: (nose + tail) * 0.5, r: R },
    { dz: tail + R - 0.08, r: R },
  ];
  // radius of gyration squared of the plan rectangle, for the yaw kick
  const RG2 = ((nose - tail) ** 2 + (2 * halfW) ** 2) / 12;
  const hits = [];
  let world = collision;

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
    trail: { point: (t) => terrain.roadPoint(t), tangent: terrain.roadTangent ? (t) => terrain.roadTangent(t) : null, length: terrain.roadLength || 330 },
    main: { point: (t) => terrain.mainPoint(t), tangent: terrain.mainTangent ? (t) => terrain.mainTangent(t) : null, length: terrain.mainLength || 330 },
  };
  const junction = terrain.junction && terrain.mainPoint ? terrain.junction : null;

  /**
   * The route parameter nearest the truck, searched a few metres either side of
   * the odometer's guess. The odometer alone drifts: a corner cut is shorter
   * than the arc, so its `t` falls behind the truck and the lookahead shrinks
   * into the bend — which is how auto-drive came to clip the camp's rocks.
   */
  const _rp = new THREE.Vector3();
  function nearestT(route, pos, guess) {
    let step = 4 / route.length;
    let best = guess;
    let bestD = Infinity;
    for (let i = -3; i <= 3; i++) {
      const t = THREE.MathUtils.clamp(guess + i * step, 0.002, 0.998);
      const d = _rp.copy(route.point(t)).sub(pos).setY(0).lengthSq();
      if (d < bestD) {
        bestD = d;
        best = t;
      }
    }
    for (let k = 0; k < 3; k++) {
      step *= 0.5;
      for (const t of [best - step, best + step]) {
        if (t < 0.002 || t > 0.998) continue;
        const d = _rp.copy(route.point(t)).sub(pos).setY(0).lengthSq();
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      }
    }
    return best;
  }

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

  /**
   * Zero everything the truck carries from one moment to the next: speed,
   * steer, yaw, the body's three springs and the collision residue. The
   * capture pre-roll resets the route and position but used to inherit the
   * previous view's steer and spring state, so two `setView` calls in one page
   * ended at spots a few centimetres apart and every pixel of the frame moved
   * with them (lighting r7 measured 7.8 % of pixels between two shots of one
   * tree). With this, a pre-roll from a given start is the same pre-roll.
   */
  function resetDynamics() {
    state.speed = 0;
    state.steer = 0;
    state.accel = 0;
    state.lateral = 0;
    state.yawRate = 0;
    state.spin = 0;
    state.jolt = 0;
    state.impact = 0;
    state.cruise = 0;
    input.throttle = 0;
    input.brake = 0;
    input.steer = 0;
    heave.x = heave.v = 0;
    tiltX.x = tiltX.v = 0;
    tiltZ.x = tiltZ.v = 0;
    rideInit = false;
  }

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
  const _ip = new THREE.Vector3();
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

  const wrap = (a) => {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };

  /**
   * Resolve the truck against the world after the position step.
   *
   * Position: the minimum translation over every contact, applied up to three
   * times so nothing is left inside a collider. Velocity: split against each
   * contact normal; the into-wall part is removed with a little restitution on
   * a fresh hit, and bled at a rate on a sustained one. The wall also steers:
   * the heading follows most of the deflected velocity, which is how a slide
   * along a boma stays a slide, and a corner hit adds a yaw kick from the
   * lever arm. Soft colliders (lions) push and slow, never stop.
   */
  function collide(dt, prevSpeed) {
    const t0 = performance.now();
    resolve(dt, prevSpeed);
    if (world) world.sample(performance.now() - t0);
  }

  function resolve(dt, prevSpeed) {
    state.impact = 0;
    state.impactPos = null;
    // this frame's jolt term for the ride: the impact spread over JOLT_TAU
    state.jolt *= Math.exp(-dt / JOLT_TAU);
    if (Math.abs(state.jolt) < 1e-3) state.jolt = 0;
    if (!world) {
      state.contact = false;
      state.accel += state.jolt;
      return;
    }
    const sh = Math.sin(state.heading);
    const ch = Math.cos(state.heading);
    let vx = sh * state.speed;
    let vz = ch * state.speed;
    const wasContact = state.contact;
    let hard = false;
    let soft = false;
    let tag = null;
    let dvSum = 0;
    let ix = 0;
    let iz = 0;
    let iw = 0;
    let spin = 0;
    for (let iter = 0; iter < 3; iter++) {
      world.truckContacts(state.pos.x, state.pos.z, state.heading, circles, hits);
      if (!hits.length) break;
      // minimum translation: each contact only adds what the others have not
      // already given along its normal, so three circles on one wall push out
      // once and two walls in a corner push out along both
      let mx = 0;
      let mz = 0;
      for (const c of hits) {
        const want = c.hard ? c.pen : c.pen * 0.6;
        const left = want - (mx * c.nx + mz * c.nz);
        if (left > 0) {
          mx += c.nx * left;
          mz += c.nz * left;
        }
      }
      state.pos.x += mx;
      state.pos.z += mz;
      if (iter > 0) continue;
      const v = Math.hypot(vx, vz);
      for (const c of hits) {
        const vn = vx * c.nx + vz * c.nz;
        if (vn >= -1e-4) continue;
        let dv;
        if (c.hard) {
          hard = true;
          if (!tag) tag = c.tag;
          // k is sin of the angle between the truck's motion and the wall's
          // face: 1 head-on, small on a graze
          const k = v > 1e-3 ? -vn / v : 1;
          const w = wasContact ? THREE.MathUtils.lerp(Math.min(1, dt / SCRAPE_TAU), 1, k * k) : 1 + RESTITUTION;
          dv = -vn * w;
          const rx = c.px - state.pos.x;
          const rz = c.pz - state.pos.z;
          spin += (rz * c.nx - rx * c.nz) * dv;
        } else {
          soft = true;
          dv = -vn * 0.3;
        }
        vx += c.nx * dv;
        vz += c.nz * dv;
        dvSum += dv;
        ix += c.px * dv;
        iz += c.pz * dv;
        iw += dv;
      }
    }
    state.contact = hard;
    state.contactTag = hard ? tag : null;
    if (!hard && !soft) {
      state.accel += state.jolt;
      return;
    }

    // back onto the bicycle model: the heading follows the deflected velocity
    // part-way, and the speed is what is left along the new heading
    const along = vx * sh + vz * ch;
    let h = state.heading;
    if (Math.abs(along) > 0.5) {
      const target = along > 0 ? Math.atan2(vx, vz) : Math.atan2(-vx, -vz);
      const d = THREE.MathUtils.clamp(wrap(target - h) * DEFLECT, -DEFLECT_MAX, DEFLECT_MAX);
      h += d;
    }
    state.heading = h;
    const speed = vx * Math.sin(h) + vz * Math.cos(h);
    state.spin += (spin / RG2) * SPIN_GAIN;
    state.spin = THREE.MathUtils.clamp(state.spin, -2.5, 2.5);
    state.speed = Math.abs(speed) < 1e-3 ? 0 : speed;

    // what the rest of the game reads: the normal-velocity change, where, and
    // a jolt through the ride so the body pitches and the camera feels it
    state.impact = dvSum;
    if (iw > 1e-6) {
      _ip.set(ix / iw, state.pos.y, iz / iw);
      state.impactPos = _ip;
    }
    if (hard && dvSum > 0.3) {
      state.jolt -= dvSum / JOLT_TAU;
      heave.v -= dvSum * 0.05;
      tiltX.v -= sh * dvSum * 0.02;
      tiltZ.v -= ch * dvSum * 0.02;
    }
    state.accel = (state.speed - prevSpeed) / dt;
    // the raw one-frame figure is hundreds of m/s²; the ride wants the impulse
    // spread over the jolt time, not a single-frame spike it cannot follow
    state.accel = THREE.MathUtils.clamp(state.accel, -12, 12) + state.jolt;
  }

  function update(dt) {
    // a zero or absurd dt turns the acceleration term into NaN and poisons
    // every transform downstream, so clamp it before anything else runs
    dt = THREE.MathUtils.clamp(dt, 1e-4, 1 / 20);

    if (state.auto) {
      // Follow the road so the demo is alive before anyone touches a key.
      // Advance by the distance actually covered, not a fixed rate, or the
      // target creeps away from the truck whenever the two disagree.
      let route = routes[state.route];
      // Take the turn once, on the way past. Which way along the mainline is
      // decided by whichever direction the truck is already pointing, so it
      // swings onto the road rather than spinning round on the apron.
      if (junction && !state.turned && state.route === 'trail' && state.autoT >= junction.trailT) {
        // Toward the camp, always. The route is the point of the drive — spur,
        // junction, campground, savanna, the pride — so the direction along the
        // mainline is not a coin toss on heading, it is wherever the camp is.
        state.autoDir = WORLD.camp.t >= junction.mainT ? 1 : -1;
        state.route = 'main';
        state.autoT = junction.mainT;
        state.turned = true;
      }
      state.autoT += (state.autoDir * dt * Math.max(state.speed, 0.5)) / route.length;
      // Back to the top of the spur at either end rather than reversing: a
      // three-point turn on a forest road is not what this is for.
      if (state.autoT > 0.96 || state.autoT < 0.04) resetAuto(0.04);
      route = routes[state.route];
      // the odometer's guess, corrected to the point of the road the truck is
      // actually beside; the lookahead is measured from there
      state.autoT = nearestT(route, state.pos, state.autoT);
      // Lookahead scaled to speed. A fixed 4 m target is 0.4 s of preview at
      // cruise, and steering at it with a gain of 1.9 is what had the truck
      // weaving down every straight — half of what read as a bumpy ride was
      // this, not the ground. Too long cuts every bend by L²/8R, though: 19 m
      // through the camp's curve was 2.7 m inside the centreline, into the rocks.
      const leadM = THREE.MathUtils.clamp(5 + state.speed * 0.55, 5, 14);
      const lead = (state.autoDir * leadM) / route.length;
      let ahead = null;
      // the lookahead runs on round the corner at the junction, so the turn
      // onto the mainline starts before the crossing instead of at it — from
      // the centreline the swing was 5 m wide of the mainline's
      if (junction && !state.turned && state.route === 'trail') {
        const remain = (junction.trailT - state.autoT) * route.length;
        if (remain < leadM) {
          const dir = WORLD.camp.t >= junction.mainT ? 1 : -1;
          ahead = routes.main.point(THREE.MathUtils.clamp(junction.mainT + (dir * (leadM - remain)) / routes.main.length, 0.005, 0.995));
        }
      }
      if (!ahead) ahead = route.point(THREE.MathUtils.clamp(state.autoT + lead, 0.005, 0.995));
      const toAhead = _c.copy(ahead).sub(state.pos);
      const want = Math.atan2(toAhead.x, toAhead.z);
      let diff = want - state.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      // Cross-track term (Stanley): a pursuit on its own settles a little inside
      // every bend; this steers the centreline offset out at a rate that falls
      // with speed so it cannot start a weave.
      const here = route.point(state.autoT);
      const tg = route.tangent ? route.tangent(state.autoT) : null;
      // the yaw rate the road itself asks for here, from the bend over the next
      // few metres: the damping below must not fight a steady turn, or every
      // tight bend is taken a couple of metres wide
      let pathYaw = 0;
      if (tg) {
        const tx = tg.x * state.autoDir;
        const tz = tg.z * state.autoDir;
        // + is the truck left of the road, going its way
        const cross = (state.pos.x - here.x) * tz - (state.pos.z - here.z) * tx;
        diff -= Math.atan((cross * 1.2) / Math.max(Math.abs(state.speed), 3));
        const step = 3;
        const tg2 = route.tangent(THREE.MathUtils.clamp(state.autoT + (state.autoDir * step) / route.length, 0, 1));
        const h1 = Math.atan2(tx, tz);
        const h2 = Math.atan2(tg2.x * state.autoDir, tg2.z * state.autoDir);
        pathYaw = (wrap(h2 - h1) / step) * state.speed;
      }
      // Proportional on the heading error, damped by the rate being turned at
      // beyond what the road asks, so a correction stops instead of
      // overshooting into the next one.
      const wantSteer = THREE.MathUtils.clamp(diff * 1.15 - (state.yawRate - pathYaw) * 0.3, -1, 1);
      input.steer += (wantSteer - input.steer) * (1 - Math.exp(-dt * 6));
      // Speed for the road ahead: the tightest bend in the next 20 m sets a
      // limit from a lateral-acceleration budget, and the turn at the junction
      // is a corner the curves do not show, so it is a limit of its own. Full
      // throttle everywhere else. Before this the truck took every hairpin at
      // cruise and swung 6 m wide onto the mainline.
      let vMax = 13;
      if (tg) {
        let h0 = Math.atan2(tg.x * state.autoDir, tg.z * state.autoDir);
        // pointing well off the road (the swing onto the mainline, a recovery):
        // no accelerating until the nose is back on it, or the arc runs wide
        if (Math.abs(wrap(h0 - state.heading)) > 0.25) vMax = 6.5;
        let kMax = 0;
        for (let m = 1; m <= 4; m++) {
          const tt = THREE.MathUtils.clamp(state.autoT + (state.autoDir * 5 * m) / route.length, 0, 1);
          const t2 = route.tangent(tt);
          const h = Math.atan2(t2.x * state.autoDir, t2.z * state.autoDir);
          kMax = Math.max(kMax, Math.abs(wrap(h - h0)) / 5);
          h0 = h;
        }
        if (kMax > 1e-4) vMax = Math.min(vMax, Math.sqrt(5.5 / kMax));
      }
      if (junction && !state.turned && state.route === 'trail' && (junction.trailT - state.autoT) * route.length < 22) vMax = Math.min(vMax, 6.5);
      vMax = Math.max(vMax, 5);
      if (state.cruise > 0) {
        // The capture pre-roll holds one speed so a beauty view ends at a fixed
        // place on the road. Left to the caps above, a pinned 12 m/s on the
        // spur's bend reads as a brake pedal held to the floor — accel −21 m/s²
        // every step — and the body sat nose-down 5.7° in every truck frame of
        // the round-5 re-shoot, with the glass cameras (placed in root space)
        // off the cab. Cruise: the limit is the pinned speed and the throttle
        // balances drag exactly, so the body sees a steady cruise, as it did
        // when the old driver ran flat out here.
        vMax = state.cruise;
        const cruiseDrag = 0.42 * state.speed + 0.02 * state.speed * Math.abs(state.speed);
        input.throttle = THREE.MathUtils.clamp((vMax - state.speed) * 1.5 + cruiseDrag / 9.5, 0, 1);
        input.brake = 0;
      } else {
        input.throttle = THREE.MathUtils.clamp((vMax - state.speed) * 1.5 + 0.5, 0, 1);
        input.brake = state.speed > vMax + 0.5 ? THREE.MathUtils.clamp((state.speed - vMax) * 0.4, 0, 1) : 0;
      }
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
    // the yaw a corner hit left the truck with, dying away
    state.spin *= Math.exp(-dt / SPIN_TAU);
    if (Math.abs(state.spin) < 1e-4) state.spin = 0;
    state.heading += (state.yawRate + state.spin) * dt;
    state.lateral = state.yawRate * state.speed;

    state.pos.x += Math.sin(state.heading) * state.speed * dt;
    state.pos.z += Math.cos(state.heading) * state.speed * dt;
    // keep the truck inside the playable area
    const lim = terrain.size * 0.45;
    state.pos.x = THREE.MathUtils.clamp(state.pos.x, -lim, lim);
    state.pos.z = THREE.MathUtils.clamp(state.pos.z, -lim, lim);

    collide(dt, prevSpeed);

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

  return {
    state,
    input,
    update,
    resetAuto,
    resetDynamics,
    dispose,
    /** The truck's collision circles, [{ dz, r }] along its axis from the centre. */
    circles,
    /** Swap or install the collision world (main.js builds it after the scene). */
    setCollision(w) {
      world = w || null;
    },
    get collision() {
      return world;
    },
    /**
     * The collision resolve alone, at the truck's current pose, for the cost
     * check: a headless browser's performance.now() ticks in 0.1 ms steps, so a
     * per-frame sample cannot see a 2 µs resolve — a batch of these can.
     */
    resolve(dt = 1 / 60) {
      resolve(dt, state.speed);
    },
  };
}
