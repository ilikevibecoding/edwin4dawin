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
      if (!this.moving) {
        // Setting off. Standing feet all sit at the middle of their stance,
        // so start the cycle where the foot furthest behind its anchor is
        // about to lift; the rest then have at most half a cycle of stance
        // left rather than a whole one, which from a centred start would end
        // a full stride behind the hip with the leg locked straight.
        let first = this.legs[0];
        let fb = Infinity;
        for (const l of this.legs) {
          this.toWorld(l.anchor, _a);
          const c = Math.cos(this.root.yaw);
          const sn = Math.sin(this.root.yaw);
          const behind = (l.pos.x - _a.x) * sn + (l.pos.z - _a.z) * c;
          if (behind < fb) {
            fb = behind;
            first = l;
          }
          l.stepped = false;
        }
        this.phase = (first.phase + DUTY - 0.04 + 1) % 1;
      }
      this.moving = true;
      // the stride shortens as the animal slows, so an amble is short quick
      // steps rather than one two-second stride planned off a speed that is
      // still ramping up; the cycle time is still bounded. A turn moves the
      // feet too, so it counts toward the tempo.
      const vEff = speed + Math.abs(yawRate) * 0.55 * s;
      this.stride = strideAt(vEff / s) * s;
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
    if (inAir > 0) return;
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

  /**
   * Where a foot should land: the anchor as it will be `ahead` seconds from
   * now, plus half the distance the body covers during the stance, so the
   * foot spends its planted time centred under the leg.
   */
  landing(l, ahead, out) {
    const vel = this.vel;
    const aheadYaw = this.root.yaw + this.yawRate * ahead;
    const c = Math.cos(aheadYaw);
    const sn = Math.sin(aheadYaw);
    const travel = this.moving ? DUTY * (this.T || 1) * STANCE_AHEAD[l.spec.front ? 'front' : 'hind'] : 0;
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
   * with the legs.
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
