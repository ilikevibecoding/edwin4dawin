import * as THREE from 'three';
import { HIND_LATERAL_MIN } from './spec.js';

// ---------------------------------------------------------------------------
// Foot placement.
//
// Each foot lives in world space and is either planted or swinging. A planted
// foot is a fixed world point on terrain.heightAt(); nothing moves it, the body
// moves over it. A swing is a move between two planted positions on a lifted
// arc, timed by the gait or, when standing, taken one foot at a time to catch
// up with wherever the body has drifted. That is the whole no-slide guarantee:
// there is no code path that translates a foot that bears weight.
//
// Walk is a lateral-sequence four-beat (LH, LF, RH, RF) with a duty factor of
// 0.6, which is roughly what a lion does at a stroll.
//
// Stride follows speed the way it does in the animal: longer and slower steps
// as it speeds up (stride ~ v^0.5, so cadence ~ v^0.5 too), never a fixed
// stride with the cadence doing all the work. At the nominal walk a unit male
// covers 1.45 m a cycle — about 1.25 withers heights; a lioness 1.2 m — and
// each foot travels 0.6 of that against the body while it is planted.
//
// The feet also carry the ground's attitude up to the trunk: a plane is fitted
// through the four points the feet stand on (or are about to land on), and
// its roll across the body and its height under the hips and the shoulders,
// against the terrain sampled on the centreline, are handed to the poser,
// rate-limited so a re-planted foot tilts the trunk over a few tenths of a
// second rather than in the frame it lands.
// ---------------------------------------------------------------------------

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();

const PHASE = { HL: 0.0, FL: 0.25, HR: 0.5, FR: 0.75 };
const DUTY = 0.6;
// A forefoot lands a little ahead of its anchor and leaves well behind it; a
// hind foot's stance is centred. The fraction of the stance travel spent ahead
// of the anchor, per pair.
const STANCE_AHEAD = { front: 0.42, hind: 0.5 };

/** Nominal walking speed of a unit (male) lion, m/s; behaviour.js scales it per animal. */
export const WALK_SPEED = 1.2;
/** Cycle length at WALK_SPEED for a unit lion, metres. */
export const WALK_STRIDE = 1.45;
/** How high the pad clears flat ground mid-swing, unit lion (7.5 cm on a lioness). */
export const SWING_LIFT = 0.09;

// Setting off. The body walks about a stride off a standing foot over the
// first half cycle (the speed ramps while the cycle time falls from its cap),
// so a foot that has most of a stance ahead of it when the walk begins ends it
// far behind its anchor; how far a leg can stand behind before the trunk has
// to come down after it, as a fraction of the scale, and the body's travel
// per cycle through the set-off, are what the choice of the starting phase is
// scored against (see update).
const SETOFF_TRAVEL = 1.0;
const REACH_BEHIND = { front: 0.6, hind: 0.5 };

// Trunk-to-stance-plane fit: how fast the roll and the two heights may follow
// a change of plane (per second, and a first-order lag), and how far.
const PLANE_ROLL_RATE = 0.6;
const PLANE_ROLL_MAX = 0.45;
const PLANE_LIFT_RATE = 0.3;
const PLANE_LIFT_MAX = 0.2;
const PLANE_TAU = 0.3;
// The heights are the plane against the terrain sampled under the hips and
// the shoulders, two samples that are the whole cost of the fit (5 us of a
// 21 us step); they are taken again only when a foot moves or the root has
// walked or turned this far (unit scale, radians) since the last, and the lag
// above turns the refresh into sub-millimetre steps.
const PLANE_RESAMPLE = 0.08;
const PLANE_RESAMPLE_YAW = 0.05;

const _pts = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

/** Stride for a unit lion at speed `v` (m/s, unit scale): shorter, quicker steps at an amble. */
export function strideAt(v) {
  return WALK_STRIDE * THREE.MathUtils.clamp(Math.sqrt(Math.max(0, v) / WALK_SPEED), 0.45, 1.2);
}

export class Feet {
  constructor(skel, scale, terrain, { phase = 0 } = {}) {
    this.terrain = terrain;
    this.s = scale;
    // distance the body covers in one full cycle at the nominal walk; the
    // live value follows the speed (strideAt) so the cadence follows from
    // the speed and the legs never treadmill
    this.stride = WALK_STRIDE * scale;
    this.phase0 = phase;
    this.phase = phase;
    this.moving = false;
    this.legs = skel.legs.map((l) => ({
      spec: l,
      rest: l.footRest.clone(),
      anchor: l.footRest.clone(), // root-space target incl. pose offsets
      pos: new THREE.Vector3(), // world, the contact point
      fwd: new THREE.Vector3(0, 0, 1),
      up: new THREE.Vector3(0, 1, 0),
      planted: true,
      swing: null,
      phase: PHASE[l.name],
      lastLift: 0,
    }));
    this.root = { x: 0, y: 0, z: 0, yaw: 0 };
    this.contact = this.legs.map(() => ({ contact: new THREE.Vector3(), fwd: new THREE.Vector3(), up: new THREE.Vector3() }));
    // where the trunk's ends sit over the ground in root space, for the plane fit
    this.hipZ = skel.rest.get('pelvis').pos.z;
    this.chestZ = skel.rest.get('chest').pos.z;
    // the stance plane's roll across the body (radians, positive lifting +X)
    // and its height under the hips and the shoulders relative to the terrain
    // sampled on the centreline there (metres), rate-limited
    this.roll = 0;
    this.liftHip = 0;
    this.liftChest = 0;
    // the fit's two terrain samples, and where the root was when they were taken
    this.lift = { hip: 0, chest: 0, x: 0, z: 0, yaw: 0, stale: true };
  }

  toWorld(local, out = new THREE.Vector3()) {
    const c = Math.cos(this.root.yaw);
    const sn = Math.sin(this.root.yaw);
    out.set(this.root.x + local.x * c + local.z * sn, this.root.y + local.y, this.root.z - local.x * sn + local.z * c);
    return out;
  }

  toLocal(world, out = new THREE.Vector3()) {
    const c = Math.cos(this.root.yaw);
    const sn = Math.sin(this.root.yaw);
    const dx = world.x - this.root.x;
    const dz = world.z - this.root.z;
    out.set(dx * c - dz * sn, world.y - this.root.y, dx * sn + dz * c);
    return out;
  }

  height(x, z) {
    return this.terrain.heightAt(x, z);
  }

  /** Drop every foot straight onto the ground under its anchor. */
  reset(root) {
    Object.assign(this.root, root);
    this.phase = this.phase0;
    for (const l of this.legs) {
      this.toWorld(l.anchor, l.pos);
      this.plant(l, l.pos);
      l.swing = null;
      l.planted = true;
    }
    // placed, not walked here: the trunk takes the plane at once
    this.fitPlane(Infinity);
  }

  /**
   * Least-squares plane through the four ground points the feet stand on (a
   * swinging foot counts where it will land — its lifted position would tilt
   * the plane by the swing arc), read as the roll across the body and as the
   * plane's height under the hips and the shoulders against the centreline
   * terrain sample there, then followed at a bounded rate. Same fit as the
   * truck's four contact patches in drive.js.
   */
  fitPlane(dt) {
    let mx = 0;
    let mz = 0;
    let mh = 0;
    for (let i = 0; i < 4; i++) {
      const l = this.legs[i];
      const p = _pts[i].copy(l.swing ? l.swing.to : l.pos);
      mx += p.x;
      mz += p.z;
      mh += p.y;
    }
    mx *= 0.25;
    mz *= 0.25;
    mh *= 0.25;
    let sxx = 0;
    let szz = 0;
    let sxz = 0;
    let sxh = 0;
    let szh = 0;
    for (let i = 0; i < 4; i++) {
      const dx = _pts[i].x - mx;
      const dz = _pts[i].z - mz;
      const dh = _pts[i].y - mh;
      sxx += dx * dx;
      szz += dz * dz;
      sxz += dx * dz;
      sxh += dx * dh;
      szh += dz * dh;
    }
    const det = sxx * szz - sxz * sxz;
    if (Math.abs(det) < 1e-6) return;
    const gx = (sxh * szz - szh * sxz) / det;
    const gz = (szh * sxx - sxh * sxz) / det;
    const c = Math.cos(this.root.yaw);
    const sn = Math.sin(this.root.yaw);
    // root-space right is (c, -sn) in the world's xz, forward (sn, c)
    const gRight = gx * c - gz * sn;
    const rollT = THREE.MathUtils.clamp(Math.atan(gRight), -PLANE_ROLL_MAX, PLANE_ROLL_MAX);
    // the plane's height under a root-space point on the centreline, less the
    // terrain's own height there: what the trunk end should rise or drop by
    const s = this.s;
    const L = this.lift;
    const forced = !(dt < Infinity);
    if (L.stale || forced || Math.abs(this.root.x - L.x) + Math.abs(this.root.z - L.z) > PLANE_RESAMPLE * s || Math.abs(this.root.yaw - L.yaw) > PLANE_RESAMPLE_YAW) {
      const liftAt = (lz) => {
        const wx = this.root.x + lz * sn;
        const wz = this.root.z + lz * c;
        const plane = mh + gx * (wx - mx) + gz * (wz - mz);
        return THREE.MathUtils.clamp(plane - this.height(wx, wz), -PLANE_LIFT_MAX * s, PLANE_LIFT_MAX * s);
      };
      L.hip = liftAt(this.hipZ);
      L.chest = liftAt(this.chestZ);
      L.x = this.root.x;
      L.z = this.root.z;
      L.yaw = this.root.yaw;
      L.stale = false;
    }
    const hipT = L.hip;
    const chestT = L.chest;
    if (forced) {
      this.roll = rollT;
      this.liftHip = hipT;
      this.liftChest = chestT;
      return;
    }
    const k = 1 - Math.exp(-dt / PLANE_TAU);
    const follow = (cur, target, rate) => cur + THREE.MathUtils.clamp((target - cur) * k, -rate * dt, rate * dt);
    this.roll = follow(this.roll, rollT, PLANE_ROLL_RATE);
    this.liftHip = follow(this.liftHip, hipT, PLANE_LIFT_RATE * s);
    this.liftChest = follow(this.liftChest, chestT, PLANE_LIFT_RATE * s);
  }

  /** Fix a foot to the ground at (x, z) and read the slope under it. */
  plant(l, p) {
    const h = this.height(p.x, p.z);
    l.pos.set(p.x, h, p.z);
    const c = Math.cos(this.root.yaw);
    const sn = Math.sin(this.root.yaw);
    const fx = sn;
    const fz = c;
    const e = 0.08 * this.s;
    const hf = this.height(p.x + fx * e, p.z + fz * e);
    const hb = this.height(p.x - fx * e, p.z - fz * e);
    const hl = this.height(p.x + fz * e, p.z - fx * e);
    const hr = this.height(p.x - fz * e, p.z + fx * e);
    // ground normal from the two slopes, forward vector tangent to it
    _a.set(fx, (hf - hb) / (2 * e), fz).normalize();
    _b.set(fz, (hl - hr) / (2 * e), -fx).normalize();
    _c.crossVectors(_b, _a).normalize();
    if (_c.y < 0) _c.negate();
    l.up.copy(_c);
    l.fwd.copy(_a);
    l.planted = true;
    l.swing = null;
    l.stance = 0;
    this.lift.stale = true;
  }

  /**
   * Advance the feet.
   *
   * `root`   { x, y, z, yaw } current body root in world
   * `vel`    world velocity of the root (m/s), used to predict landings
   * `yawRate`
   * `moving` whether the gait runs
   * `dt`
   * `rise`   0..1, how quickly a standing foot may catch up (pose transitions)
   */
  update(dt, { root, vel, yawRate = 0, moving, speed, anchors, stepDur = 0.42 }) {
    Object.assign(this.root, root);
    if (anchors) for (let i = 0; i < 4; i++) this.legs[i].anchor.copy(anchors[i]);
    const s = this.s;

    this.vel = vel;
    this.yawRate = yawRate;
    if (moving && speed > 0.02) {
      if (!this.moving) this.setOff();
      this.moving = true;
      // the stride shortens as the animal slows, so an amble is short quick
      // steps rather than one two-second stride planned off a speed that is
      // still ramping up; the cycle time is still bounded. A turn moves the
      // feet too — the anchors swing about the root at ~0.55 m/rad — so it
      // counts toward the tempo but not toward the stride: turning, the
      // animal takes shorter, quicker steps (on the spot at 1.1 rad/s, a
      // 0.8 s cycle whose stance sweeps an anchor 30 degrees rather than a
      // 1.45 s one sweeping it 55, which was more than the legs could stand
      // through)
      const vEff = speed + Math.abs(yawRate) * 0.55 * s;
      this.stride = strideAt(speed / s) * s;
      const T = THREE.MathUtils.clamp(this.stride / Math.max(0.05, vEff), 0.6, 2.2);
      this.T = T;
      this.phase = (this.phase + dt / T) % 1;
      const swingDur = (1 - DUTY) * T;
      for (const l of this.legs) {
        const p = (this.phase - l.phase + 1) % 1;
        if (p < DUTY) {
          // how far through its stance a planted foot is, for the poser's loading
          l.stance = p / DUTY;
          // a swing still in the air when its stance window opens comes down now
          if (l.swing) this.stepSwing(l, dt, l.swing.retarget ? 1 : undefined);
          continue;
        }
        if (!l.swing && l.planted && !l.stepped) {
          l.stepped = true;
          this.beginSwing(l, swingDur, true);
          // where in its window the swing starts. A stance that ran past its
          // duty within this step (a far lion is simulated at a few hertz)
          // starts that far in, so the foot is not left a quarter of a stride
          // behind where the leg can reach; a foot that was already standing
          // in its window when the walk began takes what is left of it.
          l.swing.p0 = p - dt / T < DUTY ? DUTY : p;
        }
        // a gait swing runs on the cycle phase, not its own clock, across
        // whatever is left of its window: when the animal speeds up mid-swing
        // (setting off) the swing tightens with the cadence instead of
        // overlapping the next foot's, and the foot lands on the beat
        if (l.swing) {
          if (l.swing.retarget) {
            l.swing.dur = (1 - l.swing.p0) * T;
            this.stepSwing(l, dt, (p - l.swing.p0) / Math.max(0.05, 1 - l.swing.p0));
          } else this.stepSwing(l, dt);
        }
      }
      // a foot may step once per cycle
      for (const l of this.legs) if ((this.phase - l.phase + 1) % 1 < DUTY) l.stepped = false;
      this.fitPlane(dt);
      return;
    }

    // standing: finish anything in the air, then catch up one foot at a time
    this.moving = false;
    for (const l of this.legs) l.stance = -1;
    let inAir = 0;
    for (const l of this.legs) {
      if (l.swing) {
        this.stepSwing(l, dt);
        inAir++;
      }
    }
    if (inAir === 0) {
      let worst = null;
      let wd = 0;
      for (const l of this.legs) {
        this.toWorld(l.anchor, _a);
        const d = Math.hypot(_a.x - l.pos.x, _a.z - l.pos.z);
        if (d > wd) {
          wd = d;
          worst = l;
        }
      }
      if (worst && wd > 0.07 * s) this.beginSwing(worst, stepDur, false);
    }
    this.fitPlane(dt);
  }

  /**
   * The walk begins: choose where in the cycle to start it.
   *
   * Every foot stands where the stand left it — usually at its anchor, after
   * a lie well ahead of it, one of them perhaps still in the air on a
   * catch-up step. Each of the four phases that has one foot about to lift
   * is scored by how far behind its anchor every foot would be by the time
   * its own swing window opens, given the body's travel through the set-off
   * (SETOFF_TRAVEL per cycle), against the reach the leg has behind it;
   * the phase with the least overreach wins, and among equals the foot
   * furthest behind lifts first. From a settled stand this puts a forefoot
   * first, the diagonal hind foot lifting with it and the other forefoot
   * waiting the longest, which its reach and the shoulder's give absorb. A
   * hind foot first would leave the other hind foot standing half a cycle
   * while the body walked half a metre off it, out of its reach, and the
   * trunk would be fitted down 20 cm at the hips (the rump-down first frame of
   * the round-4 strip; that strip's lion set off with a catch-up step in the
   * air, which landed on its stand-still target with no lead and then stood
   * a whole stance through the acceleration).
   *
   * A catch-up step still in the air whose foot falls in its swing window
   * joins the gait where it is: it re-aims at a landing with the stance's
   * lead and comes down on its beat. One that falls in its stance window
   * finishes on its own clock, which its wait accounts for.
   */
  setOff() {
    const s = this.s;
    const c = Math.cos(this.root.yaw);
    const sn = Math.sin(this.root.yaw);
    const behind = this.legs.map((l) => {
      this.toWorld(l.anchor, _a);
      const p = l.swing ? l.swing.to : l.pos;
      return (p.x - _a.x) * sn + (p.z - _a.z) * c;
    });
    let best = 0;
    let bestCost = Infinity;
    for (let f = 0; f < 4; f++) {
      const ph = (this.legs[f].phase + DUTY - 0.04 + 1) % 1;
      let cost = behind[f] * 1e-3;
      for (let i = 0; i < 4; i++) {
        const l = this.legs[i];
        const p = (ph - l.phase + 1) % 1;
        const wait = p < DUTY ? DUTY - p : 0;
        const over = wait * SETOFF_TRAVEL * s - behind[i] - REACH_BEHIND[l.spec.front ? 'front' : 'hind'] * s;
        if (over > 0) cost += over * over;
      }
      if (cost < bestCost) {
        bestCost = cost;
        best = f;
      }
    }
    this.phase = (this.legs[best].phase + DUTY - 0.04 + 1) % 1;
    for (const l of this.legs) {
      l.stepped = false;
      if (!l.swing || l.swing.retarget) continue;
      const p = (this.phase - l.phase + 1) % 1;
      const u = l.u || 0;
      if (p < DUTY || u > 0.9) continue;
      // p0 such that the gait's progress through the window, (p - p0) / (1 - p0),
      // is the swing's own progress now, so the arc carries on unbroken
      l.swing.retarget = true;
      l.swing.p0 = (p - u) / (1 - u);
      l.stepped = true;
    }
  }

  /**
   * Where a foot should land: the anchor as it will be `ahead` seconds from
   * now, plus half the distance the body covers during the stance, so the
   * foot spends its planted time centred under the leg — in the turn as well
   * as along the path: the anchor swings about the root while the foot stands,
   * so it is placed where the anchor will be half a stance into the turn.
   * Without that a lion turning on the spot (pushed, RETREAT_TURN) swept its
   * planted feet 40 degrees off their anchors and the trunk came down 25 cm
   * after them.
   */
  landing(l, ahead, out) {
    const vel = this.vel;
    const travel = this.moving ? DUTY * (this.T || 1) * STANCE_AHEAD[l.spec.front ? 'front' : 'hind'] : 0;
    const aheadYaw = this.root.yaw + this.yawRate * (ahead + travel);
    const c = Math.cos(aheadYaw);
    const sn = Math.sin(aheadYaw);
    // a hind foot's lateral offset is kept on its own side of the body: the
    // stifle and hock follow the paw, so this is what stops the X under the hips
    let lx = l.anchor.x;
    if (!l.spec.front) {
      const min = Math.abs(l.rest.x) * HIND_LATERAL_MIN;
      lx = l.spec.side > 0 ? Math.max(lx, min) : Math.min(lx, -min);
    }
    const ax = this.root.x + vel.x * ahead + lx * c + l.anchor.z * sn;
    const az = this.root.z + vel.z * ahead - lx * sn + l.anchor.z * c;
    out.x = ax + vel.x * travel;
    out.z = az + vel.z * travel;
    out.y = this.height(out.x, out.z);
    // downhill the step shortens: a leg has only so much length to spend on
    // the drop, so a landing lower than the ground the body will stand over
    // is pulled back toward the anchor, up to the whole lead. Uphill the
    // whole stance shifts forward instead: the foot landing on higher ground
    // has reach to spare, the one trailing on lower ground behind the body
    // does not, so it is lifted sooner (before the leg locks straight and
    // drags the trunk down after it).
    if (travel > 0) {
      const sp = Math.hypot(vel.x, vel.z);
      const drop = this.height(ax, az) - out.y;
      if (sp > 0.05 && drop > 0.015 * this.s) {
        const back = Math.min(travel * sp, drop * 1.8);
        out.x -= (vel.x / sp) * back;
        out.z -= (vel.z / sp) * back;
        out.y = this.height(out.x, out.z);
      } else if (sp > 0.05 && drop < -0.01 * this.s) {
        const fwd = Math.min(0.16 * this.s, -drop * 1.6);
        out.x += (vel.x / sp) * fwd;
        out.z += (vel.z / sp) * fwd;
        out.y = this.height(out.x, out.z);
      }
    }
    return out;
  }

  beginSwing(l, dur, retarget) {
    const from = l.pos.clone();
    const to = this.landing(l, dur, new THREE.Vector3());
    // clearance: over whatever the ground does between the two points
    const midY = this.height((from.x + to.x) * 0.5, (from.z + to.z) * 0.5);
    const lift = Math.max(SWING_LIFT * this.s, midY - Math.max(from.y, to.y) + 0.05 * this.s);
    l.swing = { from, to, t: 0, dur, lift, retarget };
    l.u = 0;
    l.planted = false;
    this.lift.stale = true;
  }

  stepSwing(l, dt, uPhase) {
    const sw = l.swing;
    let u;
    if (uPhase === undefined) {
      sw.t += dt;
      u = Math.min(1, sw.t / sw.dur);
    } else {
      u = Math.min(1, Math.max(l.u || 0, uPhase));
      sw.t = u * sw.dur;
    }
    // a walking foot keeps re-aiming at where the body is actually going
    if (sw.retarget && u < 0.85) this.landing(l, sw.dur - sw.t, sw.to);
    if (u >= 1) {
      this.plant(l, sw.to);
      return;
    }
    // ease the horizontal, arc the vertical. The arc is skewed: the foot
    // comes up quickly off the toes, peaks at ~40 % of the swing and then
    // reaches forward and down, so the last quarter is the paw coming in low
    // over the ground and it lands at a third of the take-off's vertical speed
    const e = u * u * (3 - 2 * u);
    l.pos.lerpVectors(sw.from, sw.to, e);
    const su = Math.sin(u * Math.PI);
    l.pos.y += ((su * (1 + 0.35 * Math.cos(u * Math.PI))) / 1.055) * sw.lift;
    l.u = u;
    l.planted = false;
  }

  /**
   * Root-space contacts for the poser. Each carries the leg's gait state as
   * well: `u` swing progress (-1 planted), `clear` the pad's height over the
   * ground under it, `stance` progress through the planted phase (-1 when
   * standing); the array itself carries the cycle phase, period and whether
   * the gait is running, so the poser can keep the head and the trunk in time
   * with the legs, and the stance plane's roll and its lift under the hips
   * and the shoulders (fitPlane) so the trunk stands on the plane of its feet.
   */
  contacts() {
    for (let i = 0; i < 4; i++) {
      const l = this.legs[i];
      const c = this.contact[i];
      this.toLocal(l.pos, c.contact);
      // rotate fwd/up into root space (no translation)
      const cy = Math.cos(this.root.yaw);
      const sy = Math.sin(this.root.yaw);
      c.fwd.set(l.fwd.x * cy - l.fwd.z * sy, l.fwd.y, l.fwd.x * sy + l.fwd.z * cy);
      c.up.set(l.up.x * cy - l.up.z * sy, l.up.y, l.up.x * sy + l.up.z * cy);
      c.planted = l.planted;
      c.u = l.swing ? l.u : -1;
      c.clear = l.swing ? Math.max(0, l.pos.y - this.height(l.pos.x, l.pos.z)) : 0;
      c.stance = l.planted && this.moving ? (l.stance ?? -1) : -1;
      // where a swinging foot will land, and how far the root will have moved
      // by then (root space), so the poser can bring the trunk down over the
      // whole swing for a landing that is out of reach, not in the frame it lands
      if (l.swing) {
        if (!c.land) {
          c.land = new THREE.Vector3();
          c.travel = new THREE.Vector3();
        }
        this.toLocal(l.swing.to, c.land);
        const remain = Math.max(0, l.swing.dur - l.swing.t);
        const v = this.vel || _a.set(0, 0, 0);
        // y: how much higher or lower the ground under the root will be there
        const gy = this.height(this.root.x + v.x * remain, this.root.z + v.z * remain) - this.root.y;
        c.travel.set((v.x * cy - v.z * sy) * remain, gy, (v.x * sy + v.z * cy) * remain);
      } else if (c.land) {
        c.land = null;
      }
    }
    this.contact.phase = this.phase;
    this.contact.T = this.T || 1;
    this.contact.moving = this.moving;
    this.contact.roll = this.roll;
    this.contact.liftHip = this.liftHip;
    this.contact.liftChest = this.liftChest;
    return this.contact;
  }

  /** How far the paws are from their anchors — used to gate pose transitions. */
  settled(tol = 0.1) {
    for (const l of this.legs) {
      if (l.swing) return false;
      this.toWorld(l.anchor, _a);
      if (Math.hypot(_a.x - l.pos.x, _a.z - l.pos.z) > tol * this.s) return false;
    }
    return true;
  }
}
