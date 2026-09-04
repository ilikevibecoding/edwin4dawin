import * as THREE from 'three';
import { STAND } from './pose.js';
import { mulberry32 } from '../../textures/core.js';

// ---------------------------------------------------------------------------
// What a lion does all day, which is mostly nothing.
//
// A small state machine over a library of poses. Each state names a pose,
// how long it tends to last, and what it can go to next; the truck's distance
// and noise push the machine toward standing and watching, and a truck that
// goes quiet lets it settle back down. Transitions blend the pose parameters
// over a second or two, and the feet module takes the steps the new pose asks
// for one foot at a time.
//
// On top of the state run the layers that never stop: breathing, blinking,
// ear flicks, tail movement, and the head turning toward whatever is
// interesting — which, when the truck is in range, is the truck.
// ---------------------------------------------------------------------------

export const POSES = {
  stand: { ...STAND },
  alert: { ...STAND, neckPitch: 0.3, headPitch: -0.08, earAlert: 1.0, tailLift: 0.12 },
  // walking, the trunk comes down a little on bent legs and the head is
  // carried level with the back, face forward
  walk: { ...STAND, hipH: 1.03, chestH: 1.08, neckPitch: -0.26, headPitch: 0.14, tailLift: -0.1, earAlert: 0.55 },
  sit: {
    ...STAND,
    hipH: 0.5,
    chestH: 1.1,
    arch: -0.12,
    neckPitch: 0.18,
    hindFold: 1,
    hockX: 0.18,
    hockZ: -0.68,
    hindZ: 0.18,
    hindX: 0.04,
    frontZ: 0.06,
    tailGround: 1,
    earAlert: 0.6,
  },
  // sphinx: forearms flat, hind legs folded in a Z with the hock on the ground
  // behind the hip, the shin lying outside the pastern and the paw beside the belly
  lie: {
    ...STAND,
    hipH: 0.41,
    chestH: 0.58,
    arch: 0.05,
    neckPitch: 0.42,
    headPitch: -0.12,
    frontZ: 0.27,
    frontX: 0.03,
    frontFold: 1,
    hindFold: 1,
    hockX: 0.31,
    hockZ: -0.7,
    hindZ: 0.22,
    hindX: 0.06,
    tailGround: 1,
    earAlert: 0.35,
  },
  rest: {
    ...STAND,
    hipH: 0.41,
    chestH: 0.58,
    arch: 0.05,
    neckPitch: -0.35,
    headPitch: -0.3,
    frontZ: 0.27,
    frontX: 0.03,
    frontFold: 1,
    hindFold: 1,
    hockX: 0.31,
    hockZ: -0.7,
    hindZ: 0.22,
    hindX: 0.06,
    tailGround: 1,
    earAlert: 0.1,
  },
  stretch: { ...STAND, hipH: 1.08, chestH: 0.74, arch: 0.18, neckPitch: 0.1, headPitch: -0.15, frontZ: 0.4, frontFold: 0.5, tailLift: 0.35, earAlert: 0.4 },
};

// dwell times in seconds [min, max], and where each state can go
const STATES = {
  rest: { dwell: [25, 70], next: ['lie', 'lie', 'sit'] },
  lie: { dwell: [18, 55], next: ['rest', 'rest', 'sit', 'stand'] },
  sit: { dwell: [8, 22], next: ['lie', 'lie', 'stand', 'rest'] },
  stand: { dwell: [4, 10], next: ['walk', 'walk', 'stretch', 'sit'] },
  stretch: { dwell: [2.2, 3.2], next: ['stand', 'walk'] },
  walk: { dwell: [4, 12], next: ['stand', 'lie', 'sit'] },
  alert: { dwell: [6, 14], next: ['sit', 'stand', 'lie'] },
  pace: { dwell: [5, 9], next: ['alert'] },
};

const BLEND = { toLie: 1.9, toStand: 1.6, default: 1.2 };

const _v = new THREE.Vector3();

export class Brain {
  constructor({ kind, scale, seed, home, spread, pride }) {
    this.kind = kind;
    this.s = scale;
    this.rnd = mulberry32(seed);
    this.home = home; // { x, z } where this animal belongs
    this.spread = spread;
    this.pride = pride; // shared list of all brains, for spacing
    this.pos = new THREE.Vector3(home.x, 0, home.z);
    this.yaw = home.yaw ?? this.rnd() * Math.PI * 2;
    this.vel = new THREE.Vector3();
    this.speed = 0;
    this.yawRate = 0;
    this.dest = null;
    // a lion's walk is 1.0–1.3 m/s; a cub hurries to keep up
    this.walkSpeed = 1.15 * scale * (kind === 'cub' ? 1.15 : 1);
    // the gait period, written back by the feet each frame, so the tail and
    // the head can move in time with the legs
    this.gaitT = 1;

    this.state = 'lie';
    this.timer = 0;
    this.dwell = 10 + this.rnd() * 20;
    this.pose = { ...POSES.lie };
    this.from = { ...POSES.lie };
    this.to = POSES.lie;
    this.blend = 1;
    this.blendDur = 1;

    this.alarm = 0;
    this.interest = 0;
    this.gaze = { yaw: 0, pitch: 0 };
    this.gazeTarget = { yaw: 0, pitch: 0 };
    this.wander = 0;
    this.blinkT = 2 + this.rnd() * 4;
    this.blink = 0;
    this.earT = 1 + this.rnd() * 3;
    this.ear = [0, 0];
    this.breathPhase = this.rnd() * Math.PI * 2;
    this.tailPhase = this.rnd() * Math.PI * 2;
    this.tailSide = this.rnd() < 0.5 ? -1 : 1;
    this.flick = 0;
    this.flickT = 3 + this.rnd() * 5;
    this.settleT = 0;
  }

  pick(list) {
    return list[Math.floor(this.rnd() * list.length)];
  }

  enter(state) {
    if (state === 'walk' || state === 'pace') {
      const d = this.chooseDestination(state === 'pace');
      if (!d) state = 'alert';
      else this.dest = d;
    }
    const prevLying = this.pose.hipH < 0.7;
    this.from = { ...this.pose };
    this.to = POSES[state === 'pace' ? 'walk' : state === 'alert' ? 'alert' : state];
    const lying = this.to.hipH < 0.7;
    this.blendDur = lying && !prevLying ? BLEND.toLie : !lying && prevLying ? BLEND.toStand : BLEND.default;
    this.blend = 0;
    this.state = state;
    this.timer = 0;
    const [a, b] = STATES[state].dwell;
    this.dwell = a + this.rnd() * (b - a);
  }

  /** A spot a few metres off, clear of the others, inside the pride's ground. */
  chooseDestination(away) {
    for (let i = 0; i < 12; i++) {
      const ang = this.rnd() * Math.PI * 2;
      const r = (2.5 + this.rnd() * 4) * (away ? 1.4 : 1);
      let x = this.pos.x + Math.cos(ang) * r;
      let z = this.pos.z + Math.sin(ang) * r;
      // home pull: never further than the pride's spread from where it belongs
      const dx = x - this.home.x;
      const dz = z - this.home.z;
      const dh = Math.hypot(dx, dz);
      if (dh > this.spread) {
        x = this.home.x + (dx / dh) * this.spread * 0.8;
        z = this.home.z + (dz / dh) * this.spread * 0.8;
      }
      if (away && this.truck) {
        // pace away from the truck, not toward it
        if ((x - this.pos.x) * (this.truck.x - this.pos.x) + (z - this.pos.z) * (this.truck.z - this.pos.z) > 0) continue;
      }
      let ok = true;
      for (const o of this.pride) {
        if (o === this) continue;
        const minD = (this.kind === 'male' || o.kind === 'male' ? 3.2 : 1.9) * Math.max(this.s, o.s);
        const p = o.dest || o.pos;
        if (Math.hypot(p.x - x, p.z - z) < minD) {
          ok = false;
          break;
        }
      }
      if (ok && this.terrainOk && !this.terrainOk(x, z)) ok = false;
      if (ok) return { x, z };
    }
    return null;
  }

  /**
   * Repulsion from another animal, treated as a capsule from its rump to its
   * nose. Returns { x, z, w } — a push away from the nearest point of the
   * capsule, of length up to ~1.5 at contact, and the raw closeness `w` — or
   * null when clear.
   */
  separation(o) {
    const os = o.s;
    const fx = Math.sin(o.yaw);
    const fz = Math.cos(o.yaw);
    // the capsule axis: rump 0.8 behind the root, nose 1.0 ahead (unit lion)
    const ax = o.pos.x - fx * 0.8 * os;
    const az = o.pos.z - fz * 0.8 * os;
    const bx = o.pos.x + fx * 1.0 * os;
    const bz = o.pos.z + fz * 1.0 * os;
    const abx = bx - ax;
    const abz = bz - az;
    const t = THREE.MathUtils.clamp(((this.pos.x - ax) * abx + (this.pos.z - az) * abz) / (abx * abx + abz * abz), 0, 1);
    const cx = ax + abx * t;
    const cz = az + abz * t;
    let dx = this.pos.x - cx;
    let dz = this.pos.z - cz;
    let d = Math.hypot(dx, dz);
    // clearance: 0.8 m from the capsule surface, plus this animal's own half-width
    const R = 0.8 + 0.3 * os + 0.3 * this.s;
    if (d >= R) return null;
    if (d < 1e-4) {
      // dead on the axis: push out sideways
      dx = fz;
      dz = -fx;
      d = 1;
    }
    const w = 1 - d / R;
    const k = (w * 1.5) / d;
    return { x: dx * k, z: dz * k, w };
  }

  /**
   * Advance one frame. `truck` is { x, z, speed, throttle } in world space.
   * Returns everything the poser and the feet need.
   */
  update(dt, truck) {
    this.truck = truck;
    const s = this.s;
    // --- stimulus ---------------------------------------------------------------
    const dx = truck.x - this.pos.x;
    const dz = truck.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const loud = THREE.MathUtils.clamp(Math.abs(truck.speed) / 12, 0, 1) * 0.65 + truck.throttle * 0.35;
    const near = THREE.MathUtils.smoothstep(dist, 8, 60);
    const want = (1 - near) * (0.35 + loud * 0.9) + (dist < 14 ? 0.35 : 0);
    // startles fast, settles slowly
    const rate = want > this.alarm ? 2.2 : 0.16;
    this.alarm += (want - this.alarm) * (1 - Math.exp(-dt * rate));
    // interest in the truck: anything within 70 m gets looked at
    const wantInterest = THREE.MathUtils.clamp(1 - THREE.MathUtils.smoothstep(dist, 30, 75) + this.alarm * 0.6, 0, 1);
    this.interest += (wantInterest - this.interest) * (1 - Math.exp(-dt * 1.5));

    // --- state machine --------------------------------------------------------
    this.timer += dt;
    const S = STATES[this.state];
    if (this.alarm > 0.62 && !['alert', 'pace', 'walk'].includes(this.state)) {
      this.enter('alert');
    } else if (this.alarm > 1.05 && dist < 12 && this.state === 'alert' && this.timer > 1.5 && this.kind !== 'male') {
      this.enter('pace');
    } else if (this.state === 'alert') {
      // stay up while it is loud; settle once it has gone quiet for a while
      if (this.alarm < 0.3) this.settleT += dt;
      else this.settleT = 0;
      if (this.settleT > 6 && this.blend >= 1) this.enter(this.pick(['sit', 'sit', 'lie']));
    } else if (this.state === 'walk' || this.state === 'pace') {
      if (this.dest) {
        const ddx = this.dest.x - this.pos.x;
        const ddz = this.dest.z - this.pos.z;
        if (Math.hypot(ddx, ddz) < 0.35 * s || this.timer > 25) {
          this.dest = null;
          this.enter(this.state === 'pace' ? 'alert' : this.pick(S.next));
        }
      } else if (this.speed < 0.02) {
        this.enter(this.pick(S.next));
      }
    } else if (this.timer > this.dwell && this.blend >= 1) {
      let next = this.pick(S.next);
      // a long lie ends in a stretch more often than not
      if (this.state === 'lie' && next === 'stand' && this.rnd() < 0.6) next = 'stretch';
      if (this.state === 'stand' && next === 'stretch' && this.timer < 3) next = 'walk';
      this.enter(next);
    }

    // --- movement ---------------------------------------------------------------
    let targetSpeed = 0;
    if ((this.state === 'walk' || this.state === 'pace') && this.dest && this.blend > 0.4) {
      const ddx = this.dest.x - this.pos.x;
      const ddz = this.dest.z - this.pos.z;
      const d = Math.hypot(ddx, ddz);
      // separation: every other animal is a capsule along its heading, and
      // this one steers to stay 0.8 m clear of it — a cub does not walk
      // through its mother's hind legs — and slows when the way is blocked
      let sx = ddx / Math.max(1e-6, d);
      let sz = ddz / Math.max(1e-6, d);
      let block = 0;
      for (const o of this.pride) {
        if (o === this) continue;
        const sep = this.separation(o);
        if (!sep) continue;
        sx += sep.x;
        sz += sep.z;
        // how squarely the obstacle sits in the way
        block = Math.max(block, sep.w * Math.max(0, -(sep.x * Math.sin(this.yaw) + sep.z * Math.cos(this.yaw)) / Math.max(1e-6, Math.hypot(sep.x, sep.z))));
      }
      const wantYaw = Math.atan2(sx, sz);
      let e = wantYaw - this.yaw;
      while (e > Math.PI) e -= Math.PI * 2;
      while (e < -Math.PI) e += Math.PI * 2;
      const maxTurn = 0.9;
      this.yawRate = THREE.MathUtils.clamp(e * 2.2, -maxTurn, maxTurn);
      // slow down for the turn, for the arrival, and for whoever is in the way
      targetSpeed =
        this.walkSpeed *
        (this.state === 'pace' ? 1.3 : 1) *
        THREE.MathUtils.clamp(1.2 - Math.abs(e) * 0.9, 0.25, 1) *
        THREE.MathUtils.clamp(d / (1.2 * s), 0.3, 1) *
        THREE.MathUtils.clamp(1 - block * 1.2, 0.15, 1);
    } else {
      this.yawRate = 0;
    }
    this.speed += (targetSpeed - this.speed) * (1 - Math.exp(-dt * 2.6));
    if (targetSpeed === 0 && this.speed < 0.03) this.speed = 0;
    // a lion turns as it walks; standing, it turns slowly, a foot at a time
    this.yawRate *= Math.min(1, this.speed / (0.3 * s) + 0.35);
    this.yaw += this.yawRate * dt;
    this.vel.set(Math.sin(this.yaw) * this.speed, 0, Math.cos(this.yaw) * this.speed);
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;

    // --- pose blend -------------------------------------------------------------
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / this.blendDur);
      const t = this.blend * this.blend * (3 - 2 * this.blend);
      for (const k in this.to) this.pose[k] = THREE.MathUtils.lerp(this.from[k] ?? STAND[k] ?? 0, this.to[k], t);
    }

    // --- gaze ---------------------------------------------------------------------
    // the truck, in root space; otherwise a slow wander
    this.wander += dt;
    if (this.wander > 5 + this.rnd() * 6) {
      this.wander = 0;
      this.gazeTarget.yaw = (this.rnd() - 0.5) * 1.4;
      this.gazeTarget.pitch = (this.rnd() - 0.5) * 0.3;
    }
    let gy = this.gazeTarget.yaw;
    let gp = this.gazeTarget.pitch;
    if (this.interest > 0.02) {
      const c = Math.cos(this.yaw);
      const sn = Math.sin(this.yaw);
      const lx = dx * c - dz * sn;
      const lz = dx * sn + dz * c;
      const ty = Math.atan2(lx, lz);
      // eyes on the cab, not the wheels: the truck position is at ground level
      const tp = Math.atan2(-(this.pos.y + (this.pose.hipH + 0.15) * s - ((truck.y ?? this.pos.y) + 1.5)), Math.hypot(lx, lz)) * 0.6;
      // a lion does not turn its head past its shoulder; beyond that it looks away
      const yawT = Math.abs(ty) < 2.0 ? THREE.MathUtils.clamp(ty, -1.35, 1.35) : 0;
      gy = THREE.MathUtils.lerp(gy, yawT, this.interest);
      gp = THREE.MathUtils.lerp(gp, THREE.MathUtils.clamp(tp, -0.45, 0.35), this.interest);
    }
    const gRate = 1 - Math.exp(-dt * (2.0 + this.alarm * 3));
    this.gaze.yaw += (gy - this.gaze.yaw) * gRate;
    this.gaze.pitch += (gp - this.gaze.pitch) * gRate;

    // --- layers ------------------------------------------------------------------
    const restful = this.pose.hipH < 0.7 ? 1 : 0;
    this.breathPhase += dt * (restful ? 1.35 : 1.9) * (this.kind === 'cub' ? 1.4 : 1) * (1 + this.alarm * 0.4);
    const breath = Math.sin(this.breathPhase) * 0.5 + 0.5;
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blink = 0.28;
      this.blinkT = 2.5 + this.rnd() * 5.5;
    }
    if (this.blink > 0) this.blink -= dt;
    const bl = this.blink > 0 ? Math.sin((this.blink / 0.28) * Math.PI) : 0;
    // resting with the head down, the eyes are mostly shut
    const doze = this.state === 'rest' ? 0.75 : 0;
    const blinkAmt = Math.max(bl, doze);

    this.earT -= dt;
    if (this.earT <= 0) {
      this.earT = 1.5 + this.rnd() * 4;
      this.ear[this.rnd() < 0.5 ? 0 : 1] = 0.35;
    }
    for (let i = 0; i < 2; i++) if (this.ear[i] > 0) this.ear[i] -= dt;
    const earFlick = this.ear.map((e) => (e > 0 ? Math.sin((e / 0.35) * Math.PI) : 0));

    // walking, the tail swings once per stride, in time with the legs; at
    // rest it moves on its own slow beat
    const walkAmt = THREE.MathUtils.clamp(this.speed / (0.4 * s), 0, 1);
    this.tailPhase += dt * THREE.MathUtils.lerp(restful ? 1.2 : 2.0, (Math.PI * 2) / Math.max(0.5, this.gaitT), walkAmt);
    this.flickT -= dt;
    if (this.flickT <= 0) {
      this.flick = 0.9;
      this.flickT = 3 + this.rnd() * 7;
    }
    if (this.flick > 0) this.flick -= dt;
    const flick = this.flick > 0 ? Math.sin((this.flick / 0.9) * Math.PI) : 0;
    const tailSway = (restful ? 0.25 : 0.45 + this.speed * 0.4) + flick * 1.1 + this.alarm * 0.4;

    return {
      pose: this.pose,
      gaze: this.gaze,
      moving: this.speed > 0.02,
      speed: this.speed,
      vel: this.vel,
      yawRate: this.yawRate,
      anim: {
        breath,
        blink: [blinkAmt, blinkAmt],
        earFlick,
        tailSway,
        tailPhase: this.tailPhase,
        tailSide: this.tailSide,
        walkAmt,
      },
      state: this.state,
      alarm: this.alarm,
      interest: this.interest,
    };
  }
}
