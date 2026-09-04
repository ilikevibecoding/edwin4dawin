import * as THREE from 'three';

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
// ---------------------------------------------------------------------------

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();

const PHASE = { HL: 0.0, FL: 0.25, HR: 0.5, FR: 0.75 };
const DUTY = 0.6;

export class Feet {
  constructor(skel, scale, terrain) {
    this.terrain = terrain;
    this.s = scale;
    this.stride = 0.74 * scale;
    this.phase = 0;
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
    this.phase = 0;
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
      this.moving = true;
      // cycle time is bounded: a slow walk takes short slow steps, not one
      // two-second stride planned off a speed that is still ramping up. A
      // turn moves the feet too, so it counts toward the tempo.
      const vEff = speed + Math.abs(yawRate) * 0.55 * s;
      const T = THREE.MathUtils.clamp(this.stride / Math.max(0.05, vEff), 0.85, 1.5);
      this.T = T;
      this.phase = (this.phase + dt / T) % 1;
      const swingDur = (1 - DUTY) * T;
      for (const l of this.legs) {
        const p = (this.phase - l.phase + 1) % 1;
        if (p < DUTY) {
          if (l.swing) this.stepSwing(l, dt);
          continue;
        }
        if (!l.swing && l.planted && !l.stepped) {
          l.stepped = true;
          this.beginSwing(l, swingDur, true);
        }
        if (l.swing) this.stepSwing(l, dt);
      }
      // a foot may step once per cycle
      for (const l of this.legs) if ((this.phase - l.phase + 1) % 1 < DUTY) l.stepped = false;
      return;
    }

    // standing: finish anything in the air, then catch up one foot at a time
    this.moving = false;
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
    const travel = this.moving ? DUTY * (this.T || 1) * 0.5 : 0;
    const ax = this.root.x + vel.x * ahead + l.anchor.x * c + l.anchor.z * sn;
    const az = this.root.z + vel.z * ahead - l.anchor.x * sn + l.anchor.z * c;
    out.x = ax + vel.x * travel;
    out.z = az + vel.z * travel;
    out.y = this.height(out.x, out.z);
    // downhill the step shortens: a leg has only so much length to spend on
    // the drop, so a landing lower than the ground the body will stand over
    // is pulled back toward the anchor, up to the whole lead
    if (travel > 0) {
      const sp = Math.hypot(vel.x, vel.z);
      const drop = this.height(ax, az) - out.y;
      if (sp > 0.05 && drop > 0.015 * this.s) {
        const back = Math.min(travel * sp, drop * 1.8);
        out.x -= (vel.x / sp) * back;
        out.z -= (vel.z / sp) * back;
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
    const lift = Math.max(0.05 * this.s, midY - Math.max(from.y, to.y) + 0.05 * this.s);
    l.swing = { from, to, t: 0, dur, lift, retarget };
    l.planted = false;
  }

  stepSwing(l, dt) {
    const sw = l.swing;
    sw.t += dt;
    const u = Math.min(1, sw.t / sw.dur);
    // a walking foot keeps re-aiming at where the body is actually going
    if (sw.retarget && u < 0.85) this.landing(l, sw.dur - sw.t, sw.to);
    if (u >= 1) {
      this.plant(l, sw.to);
      return;
    }
    // ease the horizontal, arc the vertical
    const e = u * u * (3 - 2 * u);
    l.pos.lerpVectors(sw.from, sw.to, e);
    l.pos.y += Math.sin(u * Math.PI) * sw.lift;
    l.planted = false;
  }

  /** Root-space contacts for the poser. */
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
    }
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
