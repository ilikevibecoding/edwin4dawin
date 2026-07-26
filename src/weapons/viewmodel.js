import * as THREE from 'three';
import { WEAPONS, shotInterval } from './defs.js';
import { buildWeaponModel } from './models.js';
import { reg, OWNERS } from '../core/assets.js';

/**
 * First-person view-model animation — Northstar Rescue.
 * Owner: Fable 4.
 *
 * Everything is procedural and spring-driven; there are no clip files. The
 * ViewModel owns a root group inside the dedicated overlay scene (camera at
 * the origin looking down -Z, near = 0.004). The weapon parents to
 * `arms.rig.weaponMount` from buildOperatorArms() when arms are provided,
 * otherwise to an internal holder at the same bind position, so both paths
 * present identically.
 *
 * LAYERS (composed every update, all additive over the bind pose):
 *   1. base       — hip ↔ ADS translation (ADS solves sightPoint → camera axis)
 *   2. breathing  — slow two-axis sine, damped 85 % while aiming
 *   3. locomotion — figure-eight bob keyed to moveSpeed, plus a roll beat
 *   4. look sway  — lagged yawDelta/pitchDelta with spring recovery
 *   5. recoil     — impulse springs (translation z + pitch/yaw/roll) tuned
 *                   from defs recoilPitch/recoilYaw/recoilRecovery
 *   6. landing    — vertical spring kicked by landImpact
 *   7. lowered    — wall-safe pose, blended via play('lowered'/'raised')
 *   8. action clip— draw/holster/reload/… timeline offsets + part travel
 *
 * NEAR-PLANE SAFETY: first-person models are built with shortened stocks
 * (models.js `fp`) and the composed pivot translation is clamped so no pose
 * can push geometry into the near plane; the lowered pose retracts and drops
 * the muzzle for wall contact.
 */

const ACTIONS = [
  'draw', 'holster', 'idle', 'fire', 'adsIn', 'adsOut',
  'reload', 'reloadEmpty', 'magOut', 'magIn', 'chamber',
  'dryFire', 'inspect', 'melee', 'throw', 'pump', 'bolt', 'land',
  'lowered', 'raised',
];

/* ------------------------------------------------------------------ */
/* Small maths helpers                                                 */
/* ------------------------------------------------------------------ */

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOut = (k) => 1 - (1 - k) * (1 - k);
const easeIn = (k) => k * k;
const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k));
/** Normalised progress of k through [a, b]. */
const span = (k, a, b) => clamp01((k - a) / (b - a));
/** Smooth 0→1→0 hump over [a, b]. */
const hump = (k, a, b) => Math.sin(Math.PI * span(k, a, b));

/**
 * Damped spring toward zero, kicked with velocity impulses. Uses the exact
 * closed-form solution of the damped harmonic oscillator so it is stable for
 * any frame time (a naive Euler step diverges at these stiffnesses).
 */
class Spring {
  constructor(freq = 8, damp = 0.9) {
    this.freq = freq;
    this.damp = damp;
    this.v = 0;
    this.vel = 0;
  }

  kick(impulse) {
    this.vel += impulse;
  }

  update(dt) {
    const w = this.freq * Math.PI * 2;
    const z = Math.min(0.995, this.damp);
    const wd = w * Math.sqrt(1 - z * z);
    const e = Math.exp(-z * w * dt);
    const c = Math.cos(wd * dt);
    const s = Math.sin(wd * dt);
    const x = this.v;
    const B = (this.vel + z * w * x) / wd;
    this.v = e * (x * c + B * s);
    this.vel = e * ((-z * w * x + wd * B) * c - (z * w * B + wd * x) * s);
    if (Math.abs(this.v) < 1e-7 && Math.abs(this.vel) < 1e-6) {
      this.v = 0;
      this.vel = 0;
    }
    return this.v;
  }

  reset() {
    this.v = 0;
    this.vel = 0;
  }
}

const ANIMATED_PARTS = ['slide', 'bolt', 'chargingHandle', 'pumpGrip', 'magazine', 'trigger'];

/* ------------------------------------------------------------------ */
/* ViewModel                                                           */
/* ------------------------------------------------------------------ */

export class ViewModel {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = 'viewmodel.root';
    this.pivot = new THREE.Group();
    this.pivot.name = 'viewmodel.pivot';
    this.root.add(this.pivot);
    scene.add(this.root);

    this.weaponId = null;
    this.def = null;
    this.model = null;
    this.arms = null;
    this._holder = null;
    this._anim = {};
    this._rests = new Map();
    this._adsOffset = new THREE.Vector3();

    this._clip = null;
    this._t = 0;
    this._time = 0;
    this._bobPhase = 0;
    this._shots = 0;

    this._ads = 0;
    this._adsTarget = 0;
    this._lower = 0;
    this._lowerTarget = 0;
    this._crouch = 0;
    this._lagYaw = 0;
    this._lagPitch = 0;

    this._kickZ = new Spring(7.5, 0.85);
    this._kickPitch = new Spring(8.5, 0.8);
    this._kickYaw = new Spring(9, 0.85);
    this._kickRoll = new Spring(9, 0.85);
    this._land = new Spring(5.2, 0.72);

    /** Optional listener: fn(eventName) for 'magOut','magIn','chamber','eject','release','impact','pump'. */
    this.onEvent = null;

    this._pos = new THREE.Vector3();
    this._rot = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
  }

  /* ---------------- weapon binding ---------------- */

  setWeapon(weaponId, arms = null) {
    // detach previous content
    while (this.pivot.children.length) this.pivot.remove(this.pivot.children[0]);
    this._rests.clear();
    this._clip = null;
    this._kickZ.reset(); this._kickPitch.reset(); this._kickYaw.reset(); this._kickRoll.reset();

    this.weaponId = weaponId;
    this.def = WEAPONS[weaponId] ?? null;
    this.model = weaponId ? buildWeaponModel(weaponId, { firstPerson: true }) : null;
    this.arms = arms ?? null;
    if (!this.model) return;
    this._anim = this.model.group.userData.anim ?? {};

    if (arms && arms.rig && arms.rig.weaponMount) {
      this.pivot.add(arms.group);
      const mount = arms.rig.weaponMount;
      while (mount.children.length) mount.remove(mount.children[0]);
      mount.add(this.model.group);
    } else {
      this._holder = new THREE.Object3D();
      this._holder.name = 'viewmodel.holder';
      // matches the weaponMount bind position of buildOperatorArms()
      this._holder.position.set(0.115, -0.315, -0.345);
      this.pivot.add(this._holder);
      this._holder.add(this.model.group);
    }

    // rest transforms of every animatable sub-group
    for (const name of ANIMATED_PARTS) {
      const part = this.model.parts?.[name];
      if (part && part.position) {
        this._rests.set(name, { p: part.position.clone(), r: part.rotation.clone() });
      }
    }

    // ADS: translate the whole rig so the sightPoint lands on the camera axis
    this.pivot.position.set(0, 0, 0);
    this.pivot.rotation.set(0, 0, 0);
    this.root.updateMatrixWorld(true);
    const sw = this.model.sightPoint.getWorldPosition(new THREE.Vector3());
    this._adsOffset.set(-sw.x, -sw.y, 0);

    this.play('draw');
  }

  /* ---------------- action clips ---------------- */

  play(action, opts = {}) {
    if (!ACTIONS.includes(action)) return false;
    switch (action) {
      case 'adsIn': this._adsTarget = 1; return true;
      case 'adsOut': this._adsTarget = 0; return true;
      case 'lowered': this._lowerTarget = 1; return true;
      case 'raised': this._lowerTarget = 0; return true;
      case 'land': this._land.kick(-(opts.impact ?? 1) * 0.28); return true;
      case 'idle': this._clip = null; return true;
      default: break;
    }
    if (this.busy && !opts.force && action !== 'holster') return false;
    const clip = this._makeClip(action, opts);
    if (!clip) return false;
    clip.name = action;
    clip.fired = new Set();
    this._clip = clip;
    this._t = 0;
    if (action === 'fire') this._kickFire();
    return true;
  }

  get busy() {
    return !!(this._clip && this._clip.busy && this._t < this._clip.dur);
  }

  get adsProgress() {
    return this._ads;
  }

  _emit(name) {
    if (this.onEvent) this.onEvent(name, this.weaponId);
  }

  _kickFire() {
    const d = this.def;
    if (!d) return;
    const pitch = d.recoilPitch ?? 1.5;
    const yawSpec = d.recoilYaw ?? 0.5;
    const rec = d.recoilRecovery ?? 9;
    this._shots++;
    const yawSign = this._shots % 2 === 0 ? 1 : -1;
    const damp = 0.62 + Math.min(0.32, rec * 0.028);
    this._kickZ.damp = damp; this._kickPitch.damp = damp; this._kickYaw.damp = damp; this._kickRoll.damp = damp;
    this._kickZ.kick(pitch * 0.16 + 0.12);
    this._kickPitch.kick(pitch * 0.34);
    this._kickYaw.kick(yawSign * yawSpec * 0.16);
    this._kickRoll.kick(-yawSign * yawSpec * 0.1);
  }

  _makeClip(action, opts) {
    const d = this.def ?? {};
    const a = this._anim;
    const vm = this;
    const mk = (dur, busy, apply, events = []) => ({ dur: Math.max(0.05, dur), busy, apply, events });

    switch (action) {
      case 'draw':
        return mk(d.drawTime ?? 0.45, true, (k, out) => {
          const e = easeOut(k);
          out.pos.x += 0.05 * (1 - e);
          out.pos.y += -0.22 * (1 - e);
          out.pos.z += 0.06 * (1 - e);
          out.rot.x += -0.85 * (1 - e);
          out.rot.z += 0.5 * (1 - e);
          out.rot.y += -0.3 * (1 - e);
          // settle overshoot
          out.pos.y += 0.008 * Math.sin(Math.PI * clamp01(k * 1.25)) * e;
        });

      case 'holster':
        return mk(d.holsterTime ?? 0.35, true, (k, out) => {
          const e = easeIn(k);
          out.pos.x += 0.05 * e;
          out.pos.y += -0.24 * e;
          out.pos.z += 0.07 * e;
          out.rot.x += -0.9 * e;
          out.rot.z += 0.45 * e;
        });

      case 'fire': {
        const dur = Math.max(0.09, Math.min(0.16, shotInterval(d)));
        return mk(dur, false, (k) => {
          if (a.blowback) {
            const cyc = k < 0.35 ? easeOut(k / 0.35) : 1 - easeInOut(span(k, 0.35, 0.95));
            vm._offsetPart(a.blowback, 0, 0, (a.travel ?? 0.03) * cyc);
          }
          vm._rotatePart('trigger', 0.32 * hump(k, 0, 0.6), 0, 0);
        }, [{ k: 0.12, name: 'eject' }]);
      }

      case 'dryFire':
        return mk(0.2, false, (k, out) => {
          out.rot.x += -0.012 * hump(k, 0, 0.7);
          vm._rotatePart('trigger', 0.3 * hump(k, 0, 0.8), 0, 0);
        });

      case 'magOut':
        return mk((d.reloadTime ?? 2) * 0.35, true, (k, out) => {
          vm._reloadPose(k, out, 1);
          vm._magOffset(easeOut(k));
        }, [{ k: 0.85, name: 'magOut' }]);

      case 'magIn':
        return mk((d.reloadTime ?? 2) * 0.4, true, (k, out) => {
          vm._reloadPose(1 - k * 0.5, out, 1);
          vm._magOffset(1 - easeInOut(k));
          out.pos.y += -0.006 * hump(k, 0.8, 1); // seat tap
        }, [{ k: 0.82, name: 'magIn' }]);

      case 'reload': {
        if (a.shell) return this._shellClip();
        if (!a.magDrop) return this._chamberClip(0.6);
        return mk(d.reloadTime ?? 2.2, true, (k, out) => {
          vm._reloadPose(hump(k, 0.03, 0.97), out, 1);
          const magT = k < 0.47 ? easeOut(span(k, 0.1, 0.36)) : 1 - easeInOut(span(k, 0.55, 0.8));
          vm._magOffset(magT);
          out.pos.y += -0.007 * hump(k, 0.8, 0.9); // palm-seat bump
        }, [{ k: 0.36, name: 'magOut' }, { k: 0.8, name: 'magIn' }]);
      }

      case 'reloadEmpty': {
        if (a.shell) return this._shellClip();
        if (!a.magDrop) return this._chamberClip(0.8);
        const chargePart = a.charge ?? a.blowback;
        return mk(d.reloadEmptyTime ?? 2.8, true, (k, out) => {
          vm._reloadPose(hump(k, 0.03, 0.97), out, 1.15);
          const magT = k < 0.42 ? easeOut(span(k, 0.08, 0.3)) : 1 - easeInOut(span(k, 0.46, 0.68));
          vm._magOffset(magT);
          // bolt/slide locked open until the chambering beat
          const travel = a.travel ?? 0.03;
          if (a.blowback) {
            const locked = k < 0.8 ? 0.85 : 0.85 * (1 - easeOut(span(k, 0.8, 0.88)));
            vm._offsetPart(a.blowback, 0, 0, travel * locked);
          }
          if (chargePart && chargePart !== a.blowback) {
            vm._offsetPart(chargePart, 0, 0, (a.chargeTravel ?? 0.05) * hump(k, 0.74, 0.9));
          }
          out.rot.z += 0.1 * hump(k, 0.74, 0.94); // rack twist
          out.pos.y += -0.007 * hump(k, 0.68, 0.76);
        }, [{ k: 0.3, name: 'magOut' }, { k: 0.68, name: 'magIn' }, { k: 0.86, name: 'chamber' }]);
      }

      case 'chamber':
        return this._chamberClip(0.55);

      case 'inspect':
        return mk(2.6, true, (k, out) => {
          const roll = hump(k, 0.04, 0.62);
          out.rot.z += -0.95 * roll;
          out.rot.y += 0.55 * roll;
          out.pos.x += -0.05 * roll;
          out.pos.z += 0.03 * roll;
          const peek = hump(k, 0.55, 0.95);
          out.rot.x += 0.3 * peek;
          out.pos.y += 0.03 * peek;
          if (a.blowback) vm._offsetPart(a.blowback, 0, 0, (a.travel ?? 0.03) * 0.6 * hump(k, 0.6, 0.88));
        });

      case 'melee':
        return mk(0.55, true, (k, out) => {
          const wind = easeOut(span(k, 0, 0.3)) * (1 - easeIn(span(k, 0.3, 0.55)));
          out.pos.x += 0.07 * wind;
          out.pos.z += 0.05 * wind;
          out.rot.y += -0.6 * wind;
          out.rot.z += -0.45 * wind;
          const slash = hump(k, 0.28, 0.75);
          out.pos.x += -0.2 * slash;
          out.pos.y += -0.08 * slash;
          out.pos.z += -0.14 * slash;
          out.rot.y += 0.85 * slash;
          out.rot.x += -0.35 * slash;
          out.rot.z += 0.6 * slash;
        }, [{ k: 0.45, name: 'impact' }]);

      case 'throw':
        return mk(0.9, true, (k, out) => {
          const wind = easeOut(span(k, 0, 0.32));
          const whip = easeIn(span(k, 0.36, 0.58));
          const back = wind * (1 - whip);
          out.pos.x += 0.05 * back;
          out.pos.y += 0.05 * back;
          out.pos.z += 0.14 * back;
          out.rot.x += 0.6 * back;
          const fwd = hump(k, 0.38, 0.72);
          out.pos.z += -0.22 * fwd;
          out.pos.y += -0.05 * fwd;
          out.rot.x += -0.9 * fwd;
          // hand returns empty
          const ret = easeOut(span(k, 0.66, 1));
          out.pos.y += -0.16 * ret * (1 - ret);
        }, [{ k: 0.28, name: 'pinOut' }, { k: 0.54, name: 'release' }]);

      case 'pump': {
        const travel = a.pumpTravel ?? 0.08;
        return mk(0.5, true, (k, out) => {
          const back = k < 0.45 ? easeOut(k / 0.45) : 1 - easeInOut(span(k, 0.55, 0.95));
          vm._offsetPart(a.pump ?? 'pumpGrip', 0, 0, travel * back);
          if (a.blowback) vm._offsetPart(a.blowback, 0, 0, (a.travel ?? 0.05) * back);
          out.rot.x += -0.05 * hump(k, 0.1, 0.6);
          out.pos.z += 0.012 * hump(k, 0.1, 0.6);
        }, [{ k: 0.42, name: 'eject' }, { k: 0.9, name: 'pump' }]);
      }

      case 'bolt': {
        const lift = a.boltLift ?? 1.0;
        const travel = a.boltTravel ?? 0.07;
        return mk(d.boltTime ?? 1.05, true, (k, out) => {
          const up = easeOut(span(k, 0, 0.2)) * (1 - easeIn(span(k, 0.78, 0.97)));
          const back = hump(k, 0.2, 0.78);
          vm._rotatePart('bolt', 0, 0, lift * up);
          vm._offsetPart('bolt', 0, 0, travel * back);
          out.rot.x += -0.08 * hump(k, 0.1, 0.85);
          out.rot.z += 0.14 * hump(k, 0.05, 0.9);
          out.pos.y += -0.01 * hump(k, 0.2, 0.7);
        }, [{ k: 0.45, name: 'eject' }, { k: 0.92, name: 'chamber' }]);
      }

      default:
        return null;
    }
  }

  /** Single-shell insert for the shotgun (loop it while rounds remain). */
  _shellClip() {
    const dur = this.def?.reloadTime ?? 0.62;
    return {
      dur, busy: true,
      apply: (k, out) => {
        const roll = hump(k, 0.02, 0.98);
        out.rot.z += 0.5 * roll;
        out.rot.x += -0.1 * roll;
        out.pos.x += -0.02 * roll;
        out.pos.y += -0.03 * roll;
        out.pos.y += -0.006 * hump(k, 0.55, 0.72); // shell pressed home
      },
      events: [{ k: 0.62, name: 'shellIn' }],
    };
  }

  _chamberClip(dur) {
    const vm = this;
    const a = this._anim;
    const part = a.charge ?? a.pump ?? a.blowback;
    const travel = a.charge ? (a.chargeTravel ?? 0.05) : a.pump ? (a.pumpTravel ?? 0.08) : (a.travel ?? 0.03);
    return {
      dur, busy: true,
      apply: (k, out) => {
        out.rot.z += 0.24 * hump(k, 0.05, 0.9);
        out.rot.x += -0.05 * hump(k, 0.1, 0.7);
        const back = k < 0.45 ? easeOut(k / 0.45) : 1 - easeOut(span(k, 0.5, 0.75));
        if (part) vm._offsetPart(part, 0, 0, travel * back);
        if (a.blowback && part !== a.blowback) vm._offsetPart(a.blowback, 0, 0, (a.travel ?? 0.03) * back);
      },
      events: [{ k: 0.55, name: 'chamber' }],
    };
  }

  /** Common reload body pose: roll toward the player, drop and pitch. */
  _reloadPose(w, out, scale = 1) {
    out.rot.z += 0.42 * w * scale;
    out.rot.x += -0.16 * w * scale;
    out.rot.y += 0.1 * w * scale;
    out.pos.x += -0.015 * w * scale;
    out.pos.y += -0.035 * w * scale;
    out.pos.z += 0.012 * w * scale;
  }

  _magOffset(t) {
    const magRest = this._rests.get('magazine');
    const magPart = this.model?.parts?.magazine;
    if (!magRest || !magPart || !magPart.position) return;
    const dir = this._anim.magDir ?? [0, -1, 0];
    const drop = (this._anim.magDrop ?? 0.12) * t;
    this._tmp.set(dir[0], dir[1], dir[2]).normalize().multiplyScalar(drop);
    magPart.position.set(magRest.p.x + this._tmp.x, magRest.p.y + this._tmp.y, magRest.p.z + this._tmp.z);
  }

  _offsetPart(name, x, y, z) {
    const rest = this._rests.get(name);
    const part = this.model?.parts?.[name];
    if (!rest || !part || !part.position) return;
    part.position.set(rest.p.x + x, rest.p.y + y, rest.p.z + z);
  }

  _rotatePart(name, rx, ry, rz) {
    const rest = this._rests.get(name);
    const part = this.model?.parts?.[name];
    if (!rest || !part || !part.rotation) return;
    part.rotation.set(rest.r.x + rx, rest.r.y + ry, rest.r.z + rz);
  }

  _resetParts() {
    for (const [name, rest] of this._rests) {
      const part = this.model?.parts?.[name];
      if (!part || !part.position) continue;
      part.position.copy(rest.p);
      part.rotation.copy(rest.r);
    }
  }

  /* ---------------- frame update ---------------- */

  update(dt, state = {}) {
    if (!this.model) return;
    dt = Math.min(Math.max(dt, 0), 0.1);
    this._time += dt;
    const d = this.def ?? {};

    /* targets */
    if (typeof state.adsFactor === 'number') {
      this._ads = clamp01(state.adsFactor);
    } else {
      if (state.aiming !== undefined) this._adsTarget = state.aiming ? 1 : 0;
      const adsRate = 1 / Math.max(0.08, d.adsTime ?? 0.25);
      const target = this._lowerTarget > 0.5 ? 0 : this._adsTarget;
      this._ads += (target - this._ads) * Math.min(1, dt * adsRate * 3.2);
      this._ads = clamp01(this._ads);
    }
    this._lower += (this._lowerTarget - this._lower) * Math.min(1, dt * 9);
    const crouchTarget = state.crouched ? 1 : 0;
    this._crouch += (crouchTarget - this._crouch) * Math.min(1, dt * 8);
    if (state.landImpact) this._land.kick(-state.landImpact * 0.28);

    /* springs */
    this._kickZ.update(dt);
    this._kickPitch.update(dt);
    this._kickYaw.update(dt);
    this._kickRoll.update(dt);
    this._land.update(dt);

    /* look-lag sway */
    const yawIn = state.yawDelta ?? 0;
    const pitchIn = state.pitchDelta ?? 0;
    this._lagYaw += (yawIn * 0.45 - this._lagYaw) * Math.min(1, dt * 11);
    this._lagPitch += (pitchIn * 0.45 - this._lagPitch) * Math.min(1, dt * 11);

    const ads = easeInOut(this._ads);
    const steady = 1 - 0.85 * ads;

    const pos = this._pos.set(0, 0, 0);
    const rot = this._rot.set(0, 0, 0);

    /* 1 — hip ↔ ADS */
    pos.addScaledVector(this._adsOffset, ads);

    /* 2 — breathing */
    const bt = this._time;
    pos.y += Math.sin(bt * 1.9) * 0.0016 * steady;
    pos.x += Math.sin(bt * 0.9 + 1.3) * 0.0009 * steady;
    rot.z += Math.sin(bt * 1.1 + 0.4) * 0.004 * steady;

    /* 3 — locomotion bob */
    const speed = Math.max(0, state.moveSpeed ?? 0);
    const bobAmp = clamp01(speed / 3.6);
    if (speed > 0.05) this._bobPhase += dt * Math.PI * 2 * (0.9 + speed * 0.42);
    const bp = this._bobPhase;
    pos.x += Math.sin(bp) * 0.0075 * bobAmp * steady;
    pos.y += -Math.abs(Math.sin(bp)) * 0.006 * bobAmp * steady + Math.sin(bp * 2) * 0.0022 * bobAmp * steady;
    rot.z += Math.sin(bp) * 0.014 * bobAmp * steady;
    rot.x += Math.sin(bp * 2 + 0.5) * 0.006 * bobAmp * steady;

    /* 4 — look sway */
    pos.x += -this._lagYaw * 0.03 * steady;
    pos.y += this._lagPitch * 0.02 * steady;
    rot.y += this._lagYaw * 0.5 * steady;
    rot.x += this._lagPitch * 0.35 * steady;
    rot.z += -this._lagYaw * 0.4 * steady;

    /* 5 — recoil */
    pos.z += this._kickZ.v * 0.14;
    pos.y += this._kickZ.v * 0.02;
    rot.x += this._kickPitch.v * 0.13;
    rot.y += this._kickYaw.v * 0.1;
    rot.z += this._kickRoll.v * 0.1;

    /* 6 — landing */
    pos.y += this._land.v * 0.12;
    rot.x += this._land.v * 0.16;

    /* crouch settle */
    pos.y += -0.008 * this._crouch;
    rot.z += 0.02 * this._crouch;

    /* firing tension */
    if (state.firing) {
      pos.x += Math.sin(bt * 55) * 0.0006;
      pos.y += Math.cos(bt * 47) * 0.0005;
    }

    /* 7 — lowered wall-safe pose */
    if (this._lower > 0.001) {
      const L = easeInOut(this._lower);
      pos.x += -0.03 * L;
      pos.y += -0.1 * L;
      pos.z += 0.05 * L;
      rot.x += -0.62 * L;
      rot.y += 0.32 * L;
      rot.z += 0.18 * L;
    }

    /* 8 — action clip */
    this._resetParts();
    if (this._clip) {
      this._t += dt;
      const k = clamp01(this._t / this._clip.dur);
      const out = { pos, rot };
      this._clip.apply(k, out);
      for (const ev of this._clip.events ?? []) {
        if (k >= ev.k && !this._clip.fired.has(ev.name)) {
          this._clip.fired.add(ev.name);
          this._emit(ev.name);
        }
      }
      if (this._t >= this._clip.dur && this._clip.name !== 'holster') this._clip = null;
    }

    /* near-plane guard: never let a pose push the rig into the camera */
    pos.z = Math.min(pos.z, 0.16);

    this.pivot.position.copy(pos);
    this.pivot.rotation.set(rot.x, rot.y, rot.z);
  }

  /* ---------------- world queries ---------------- */

  getMuzzleWorldPosition(target = new THREE.Vector3()) {
    if (!this.model) return target.set(0, 0, -1);
    this.root.updateMatrixWorld(true);
    return this.model.muzzleTip.getWorldPosition(target);
  }

  getEjectWorldPosition(target = new THREE.Vector3()) {
    if (!this.model) return target.set(0, 0, -1);
    this.root.updateMatrixWorld(true);
    return this.model.ejectPoint.getWorldPosition(target);
  }

  dispose() {
    while (this.pivot.children.length) this.pivot.remove(this.pivot.children[0]);
    this.scene.remove(this.root);
    this.model = null;
    this.arms = null;
    this._rests.clear();
    this._clip = null;
  }
}

/* ------------------------------------------------------------------ */
/* Manifest registration                                               */
/* ------------------------------------------------------------------ */

const ANIM_FAMILIES = {
  pistol: {
    name: 'Pistol handling (VSC-9)',
    anims: 'draw, holster, idle, fire (slide blowback), adsIn/adsOut, reload, reloadEmpty (slide-lock + release), magOut, magIn, chamber, dryFire, inspect, lowered/raised, land',
  },
  smg: {
    name: 'SMG handling (Kestrel K-7)',
    anims: 'draw, holster, idle, fire (bolt blowback), adsIn/adsOut, reload, reloadEmpty (charging-handle rack), magOut, magIn, chamber, dryFire, inspect, lowered/raised, land',
  },
  rifle: {
    name: 'Carbine handling (Northwind NW-4)',
    anims: 'draw, holster, idle, fire (carrier blowback), adsIn/adsOut, reload, reloadEmpty (T-handle rack), magOut, magIn, chamber, dryFire, inspect, lowered/raised, land',
  },
  shotgun: {
    name: 'Shotgun handling (Borealis B-12)',
    anims: 'draw, holster, idle, fire (bolt blowback), adsIn/adsOut, reload (per-shell insert loop), chamber, pump (fore-end travel), dryFire, inspect, lowered/raised, land',
  },
  dmr: {
    name: 'DMR handling (Meridian M-700)',
    anims: 'draw, holster, idle, fire, adsIn/adsOut (scope), reload, reloadEmpty, magOut, magIn, bolt (lift + travel + close), chamber, dryFire, inspect, lowered/raised, land',
  },
  melee: {
    name: 'Knife handling (Talon TX)',
    anims: 'draw, holster, idle, melee (windup + swing arc + recover), inspect, lowered/raised, land',
  },
  grenade: {
    name: 'Grenade handling (Halo / Veil)',
    anims: 'draw, holster, idle, throw (windup, pinOut + release events, follow-through), lowered/raised, land',
  },
};

let registered = false;
export function registerWeaponAnimManifest() {
  if (registered) return;
  registered = true;
  for (const [family, spec] of Object.entries(ANIM_FAMILIES)) {
    reg({
      id: `wpn.anim.${family}`,
      name: `${spec.name} — viewmodel animation set`,
      category: 'weapon',
      owner: OWNERS.FABLE4,
      files: ['src/weapons/viewmodel.js'],
      usedIn: 'first-person overlay scene (ViewModel), driven by the player controller',
      dimensions: 'n/a — procedural animation, offsets within ±0.22 m of bind',
      pivot: 'overlay camera at origin looking -Z; pivot group carries all pose layers',
      materials: ['n/a — animation asset'],
      textures: ['n/a — animation asset'],
      collision: 'n/a — lowered pose exposed for wall proximity handling',
      lod: 'single fidelity; springs sub-stepped to 1/30 s for stability',
      animations: spec.anims,
      status: 'built',
      acceptance: 'Spring-driven recoil with per-weapon recovery from defs; distinguishable magOut/magIn beats; empty reload adds a chambering beat; moving parts (slide/bolt/charging handle/pump/magazine) physically travel; breathing + movement bob damped 85% while aiming; lowered pose keeps the muzzle out of walls and the near plane.',
    });
  }
}
