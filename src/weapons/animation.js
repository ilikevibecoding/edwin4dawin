import * as THREE from 'three';
import { randRange, randSpread } from '../core/rand.js';

/**
 * Procedural viewmodel animator. Layers, per frame:
 *   base pose (hip/ADS/sprint blend) + breathing + walk bob (lags camera) +
 *   look sway + strafe/fall lean + landing jolt + recoil springs +
 *   reload choreography (3 phases, drives mag/hands/charging handle/slide) +
 *   switch raise + grenade-throw dip + bolt/slide cycling + empty lock-back.
 * All state lives here; Weapons calls notifyFire/notifyEquip and update(dt).
 */

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();

const sm = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;

/** Damped harmonic spring toward 0. kick(a) produces a peak deflection ≈ a. */
class Spring {
  constructor(k = 260, zeta = 0.8) {
    this.k = k;
    this.c = 2 * Math.sqrt(k) * zeta;
    this.x = 0;
    this.v = 0;
  }
  kick(a) { this.v += a * Math.sqrt(this.k) * Math.E; }
  step(dt) {
    const n = dt > 0.02 ? 2 : 1, h = dt / n;
    for (let i = 0; i < n; i++) {
      this.v += (-this.k * this.x - this.c * this.v) * h;
      this.x += this.v * h;
    }
    return this.x;
  }
}

/** Keyframe track: keys [{t, p:[3], r:[3]}], smoothstep interp, offsets from home. */
function evalTrack(keys, t, outP, outR) {
  let k0 = keys[0], k1 = keys[keys.length - 1];
  if (t <= k0.t) k1 = k0;
  else if (t < k1.t) {
    for (let i = 0; i < keys.length - 1; i++) {
      if (t >= keys[i].t && t <= keys[i + 1].t) { k0 = keys[i]; k1 = keys[i + 1]; break; }
    }
  } else k0 = k1;
  const u = k0 === k1 ? 0 : sm((t - k0.t) / (k1.t - k0.t));
  outP.set(
    lerp(k0.p[0], k1.p[0], u),
    lerp(k0.p[1], k1.p[1], u),
    lerp(k0.p[2], k1.p[2], u)
  );
  outR.set(
    lerp(k0.r[0], k1.r[0], u),
    lerp(k0.r[1], k1.r[1], u),
    lerp(k0.r[2], k1.r[2], u)
  );
}

function applyOffset(obj, home, p, r) {
  obj.position.set(home.pos.x + p.x, home.pos.y + p.y, home.pos.z + p.z);
  _q.setFromEuler(_e.set(r.x, r.y, r.z));
  obj.quaternion.copy(home.quat).multiply(_q);
}

// --- reload choreography keys (normalized 0..1 over reloadTime) --------------

const RIFLE_WEAPON_TRACK = [
  { t: 0.00, p: [0, 0, 0], r: [0, 0, 0] },
  { t: 0.10, p: [0.010, -0.020, 0.010], r: [0.12, 0.06, 0.38] },
  { t: 0.32, p: [0.010, -0.026, 0.010], r: [0.10, 0.05, 0.32] },
  { t: 0.55, p: [0.005, -0.016, 0.005], r: [0.14, 0.02, 0.20] },
  { t: 0.66, p: [0, -0.005, 0], r: [0.05, 0, 0.10] },
  { t: 0.74, p: [-0.004, 0.002, 0.010], r: [-0.03, -0.05, -0.08] },
  { t: 0.84, p: [-0.005, -0.002, 0.022], r: [0.02, -0.06, -0.12] },
  { t: 0.92, p: [0, 0, 0.005], r: [0, -0.02, -0.04] },
  { t: 1.00, p: [0, 0, 0], r: [0, 0, 0] },
];

const RIFLE_HANDL_TRACK = [
  { t: 0.00, p: [0, 0, 0], r: [0, 0, 0] },
  { t: 0.09, p: [0.020, -0.055, 0.160], r: [-0.40, 0, -0.30] },
  { t: 0.20, p: [0.020, -0.190, 0.180], r: [-0.70, 0, -0.40] },
  { t: 0.34, p: [0.000, -0.340, 0.220], r: [-0.90, 0, -0.50] },
  { t: 0.50, p: [-0.010, -0.300, 0.200], r: [-0.80, 0, -0.40] },
  { t: 0.64, p: [0.015, -0.055, 0.160], r: [-0.40, 0, -0.30] },
  { t: 0.70, p: [0.015, -0.050, 0.155], r: [-0.35, 0, -0.25] },
  { t: 0.80, p: [0.024, 0.018, 0.295], r: [-0.35, 0.25, 2.85] },
  { t: 0.88, p: [0.024, 0.016, 0.340], r: [-0.35, 0.25, 2.85] },
  { t: 0.94, p: [0.010, -0.025, 0.100], r: [-0.20, 0.10, 1.0] },
  { t: 1.00, p: [0, 0, 0], r: [0, 0, 0] },
];

const PISTOL_WEAPON_TRACK = [
  { t: 0.00, p: [0, 0, 0], r: [0, 0, 0] },
  { t: 0.12, p: [-0.028, -0.008, 0.018], r: [0.18, -0.10, -0.34] },
  { t: 0.50, p: [-0.030, -0.012, 0.018], r: [0.16, -0.10, -0.30] },
  { t: 0.64, p: [-0.015, -0.004, 0.010], r: [0.08, -0.06, -0.16] },
  { t: 0.76, p: [-0.012, -0.002, 0.022], r: [0.12, -0.08, -0.22] },
  { t: 0.86, p: [-0.004, 0, 0.006], r: [0.03, -0.02, -0.06] },
  { t: 1.00, p: [0, 0, 0], r: [0, 0, 0] },
];

const PISTOL_HANDL_TRACK = [
  { t: 0.00, p: [0, 0, 0], r: [0, 0, 0] },
  { t: 0.12, p: [-0.010, -0.090, 0.060], r: [-0.5, 0, 0.2] },
  { t: 0.28, p: [-0.020, -0.260, 0.100], r: [-0.9, 0, 0.3] },
  { t: 0.46, p: [-0.020, -0.240, 0.090], r: [-0.85, 0, 0.3] },
  { t: 0.62, p: [0.004, -0.052, 0.028], r: [-0.35, 0, 0.1] },
  { t: 0.70, p: [-0.006, 0.075, 0.010], r: [-0.35, 0.25, 1.35] },
  { t: 0.78, p: [-0.006, 0.072, 0.046], r: [-0.35, 0.25, 1.35] },
  { t: 0.88, p: [-0.012, -0.020, 0.020], r: [-0.15, 0.1, 0.5] },
  { t: 1.00, p: [0, 0, 0], r: [0, 0, 0] },
];

export class ViewmodelAnimator {
  constructor(game, weapons) {
    this.game = game;
    this.w = weapons;

    this.kickZ = new Spring(230, 0.78);
    this.kickPitch = new Spring(290, 0.72);
    this.kickYaw = new Spring(290, 0.8);
    this.kickRoll = new Spring(240, 0.8);
    this.jolt = new Spring(130, 0.5);

    this.sprint01 = 0;
    this.slide01 = 0;
    this.crouch01 = 0;
    this.swayX = 0;
    this.swayY = 0;
    this.raiseT = 1;
    this.cycleT = 9;
    this.reloadJolted = false;
    this.wasEmptyReload = false;
    this.debugSprint = false;

    this.pos = new THREE.Vector3();
    this.rot = new THREE.Vector3();
    this.tp = new THREE.Vector3();
    this.tr = new THREE.Vector3();

    game.events.on('player:land', ({ velocity }) => {
      this.jolt.kick(-clamp(velocity * 0.010, 0.02, 0.10));
    });
  }

  /** Precompute pose vectors per weapon (called once after models are built). */
  register(defs, rigs) {
    this.poses = defs.map((def, i) => {
      const vm = def.vm, aim = rigs[i].aim;
      return {
        hipPos: new THREE.Vector3(...vm.hipPos),
        hipRot: new THREE.Vector3(...vm.hipRot),
        adsPos: new THREE.Vector3(-aim.x, -aim.y, vm.adsZ),
        sprintPos: new THREE.Vector3(...vm.sprintPos),
        sprintRot: new THREE.Vector3(...vm.sprintRot),
      };
    });
  }

  notifyFire(def) {
    const vm = def.vm;
    const adsMul = lerp(1, vm.adsKickMul, this.w.ads);
    this.kickZ.kick(vm.kickBack * adsMul * randRange(0.85, 1.15));
    this.kickPitch.kick(vm.kickPitch * adsMul * randRange(0.85, 1.15));
    this.kickYaw.kick(randSpread(vm.kickYaw) * adsMul);
    this.kickRoll.kick(randSpread(vm.kickRoll) * adsMul);
    this.cycleT = 0;
  }

  notifyEquip() { this.raiseT = 0; }

  update(dt) {
    const w = this.w;
    const def = w.def, vm = def.vm, rig = w.rigs[w.current], g = w.models[w.current];
    const pose = this.poses[w.current];
    const p = this.game.player, input = this.game.input, t = this.game.time;
    const slot = w.slot;

    const ads = w.ads;
    const adsB = sm(ads);

    this.sprint01 = damp(this.sprint01, p.sprinting || this.debugSprint ? 1 : 0, 9, dt);
    this.slide01 = damp(this.slide01, p.sliding ? 1 : 0, 10, dt);
    this.crouch01 = damp(this.crouch01, p.crouching && !p.sliding ? 1 : 0, 10, dt);
    this.raiseT = Math.min(1, this.raiseT + dt / 0.30);

    const pos = this.pos, rot = this.rot;

    // --- base pose: hip -> ADS -> sprint --------------------------------------
    pos.copy(pose.hipPos).lerp(pose.adsPos, adsB);
    rot.copy(pose.hipRot).multiplyScalar(1 - adsB);
    const sp = this.sprint01 * (1 - adsB);
    if (sp > 0.001) {
      pos.lerp(pose.sprintPos, sp);
      rot.x = lerp(rot.x, pose.sprintRot.x, sp);
      rot.y = lerp(rot.y, pose.sprintRot.y, sp);
      rot.z = lerp(rot.z, pose.sprintRot.z, sp);
    }

    // --- breathing --------------------------------------------------------------
    const idle = 0.45 + 0.55 * (1 - p.moveSpeed01);
    const br = (1 - adsB * 0.88) * idle;
    pos.y += Math.sin(t * 1.9) * 0.0016 * br;
    pos.x += Math.sin(t * 1.15 + 0.7) * 0.0009 * br;
    rot.x += Math.sin(t * 1.9 + 0.4) * 0.0045 * br;
    rot.z += Math.sin(t * 0.85) * 0.003 * br;

    // --- walk/sprint bob (weapon lags the camera bob slightly) --------------------
    const bobAmp = p.bobAmp * (1 - adsB * 0.93) * (p.sprinting ? 1.45 : 1);
    const ph = p.bobPhase - 0.35;
    pos.x += Math.sin(ph) * 0.0105 * bobAmp;
    pos.y += -Math.abs(Math.cos(ph)) * 0.0125 * bobAmp;
    rot.z += Math.sin(ph) * 0.022 * bobAmp;
    rot.y += Math.sin(ph * 0.5) * 0.008 * bobAmp;

    // --- look sway (weapon lags the mouse) -----------------------------------------
    const swScale = 1 - adsB * 0.94;
    this.swayX = damp(this.swayX, clamp(-input.mouseDX * 0.000075, -0.02, 0.02), 11, dt);
    this.swayY = damp(this.swayY, clamp(input.mouseDY * 0.000075, -0.02, 0.02), 11, dt);
    pos.x += this.swayX * swScale;
    pos.y += this.swayY * swScale;
    rot.y += this.swayX * 2.6 * swScale;
    rot.x += this.swayY * 2.2 * swScale;
    rot.z += this.swayX * 1.8 * swScale;

    // --- strafe lean + vertical velocity float --------------------------------------
    _v.setFromMatrixColumn(this.game.camera.matrixWorld, 0);
    const vSide = p.velocity.dot(_v);
    rot.z += -vSide * 0.0075 * (1 - adsB * 0.9);
    pos.x += -vSide * 0.0011 * (1 - adsB * 0.9);
    pos.y += clamp(-p.velocity.y * 0.0035, -0.02, 0.02) * (1 - adsB * 0.75);

    // --- landing / mag-seat jolt -------------------------------------------------------
    const j = this.jolt.step(dt);
    pos.y += j;
    rot.x += j * -2.2;

    // --- crouch / slide -----------------------------------------------------------------
    pos.y += this.crouch01 * -0.007 * (1 - adsB);
    rot.z += this.crouch01 * 0.04 * (1 - adsB);
    rot.z += this.slide01 * -0.26 * (1 - adsB);
    pos.x += this.slide01 * 0.022 * (1 - adsB);
    pos.y += this.slide01 * 0.014 * (1 - adsB);

    // --- weapon switch raise ---------------------------------------------------------------
    const raise = 1 - (1 - Math.pow(1 - this.raiseT, 3)); // easeOutCubic inverted
    if (raise > 0.001) {
      pos.y -= raise * 0.24;
      pos.z += raise * 0.06;
      rot.x -= raise * 0.85;
      rot.z += raise * 0.25;
    }

    // --- grenade throw dip -------------------------------------------------------------------
    if (w.grenadeCooldown > 0) {
      const gt = clamp((0.9 - w.grenadeCooldown) / 0.5, 0, 1);
      const dip = Math.sin(gt * Math.PI);
      pos.y -= dip * 0.14;
      pos.x += dip * 0.04;
      rot.x -= dip * 0.45;
      rot.z += dip * 0.40;
    }

    // --- recoil springs --------------------------------------------------------------------------
    const kz = this.kickZ.step(dt);
    pos.z += kz;
    pos.y += kz * 0.22;
    rot.x += this.kickPitch.step(dt);
    rot.y += this.kickYaw.step(dt);
    rot.z += this.kickRoll.step(dt);

    // --- reload choreography ------------------------------------------------------------------------
    const reloading = slot.reloading > 0;
    if (reloading) {
      const tr = clamp(1 - slot.reloading / def.reloadTime, 0, 1);
      const wTrack = def.type === 'rifle' ? RIFLE_WEAPON_TRACK : PISTOL_WEAPON_TRACK;
      const hTrack = def.type === 'rifle' ? RIFLE_HANDL_TRACK : PISTOL_HANDL_TRACK;
      evalTrack(wTrack, tr, this.tp, this.tr);
      pos.add(this.tp);
      rot.x += this.tr.x; rot.y += this.tr.y; rot.z += this.tr.z;
      evalTrack(hTrack, tr, this.tp, this.tr);
      applyOffset(rig.handL.group, rig.handLHome, this.tp, this.tr);
      if (def.type === 'rifle') this.animRifleReload(rig, tr);
      else this.animPistolReload(rig, tr);
      if (tr >= 0.64 && !this.reloadJolted) { this.reloadJolted = true; this.jolt.kick(-0.035); }
    } else {
      this.reloadJolted = false;
      this.resetReloadParts(rig);
    }

    // --- action cycling (bolt / slide / hammer) --------------------------------------------------------
    this.cycleT += dt;
    const empty = slot.mag <= 0 && !reloading;
    if (def.type === 'rifle') {
      const u = clamp(this.cycleT / vm.cycleTime, 0, 1);
      let boltBack = Math.sin(u * Math.PI) * 0.030;
      if (empty) boltBack = 0.026;
      if (!reloading) rig.bolt.position.z = rig.boltHome.pos.z + boltBack;
    } else {
      const u = clamp(this.cycleT / vm.cycleTime, 0, 1);
      let slideBack = Math.sin(u * Math.PI) * 0.034;
      if (empty) slideBack = 0.028;
      if (!reloading) rig.slide.position.z = rig.slideHome.pos.z + slideBack;
      rig.hammer.rotation.x = lerp(rig.hammerFired, rig.hammerCocked, empty ? 1 : clamp(u * 2.6, 0, 1));
    }

    // --- apply -------------------------------------------------------------------------------------------
    g.position.copy(pos);
    g.rotation.set(rot.x, rot.y, rot.z);
  }

  resetReloadParts(rig) {
    applyOffset(rig.handL.group, rig.handLHome, _v.set(0, 0, 0), _e.set(0, 0, 0));
    rig.mag.visible = true;
    rig.mag.position.copy(rig.magHome.pos);
    rig.mag.quaternion.copy(rig.magHome.quat);
    if (rig.charging) {
      rig.charging.position.copy(rig.chargingHome.pos);
    }
  }

  animRifleReload(rig, tr) {
    const mag = rig.mag, home = rig.magHome;
    mag.visible = true;
    if (tr < 0.08) {
      mag.position.copy(home.pos);
      mag.quaternion.copy(home.quat);
    } else if (tr < 0.20) {
      const u = (tr - 0.08) / 0.12, e = u * u;
      mag.position.set(home.pos.x, home.pos.y - e * 0.13, home.pos.z + e * 0.02);
      _q.setFromEuler(_e.set(-u * 0.2, 0, 0));
      mag.quaternion.copy(home.quat).multiply(_q);
    } else if (tr < 0.50) {
      const u = (tr - 0.20) / 0.30;
      mag.visible = tr < 0.42;
      mag.position.set(home.pos.x - u * 0.05, home.pos.y - 0.13 - u * u * 0.55, home.pos.z + 0.02 + u * 0.10);
      _q.setFromEuler(_e.set(-0.2 - u * 1.7, 0, -u * 0.5));
      mag.quaternion.copy(home.quat).multiply(_q);
    } else if (tr < 0.66) {
      const u = sm((tr - 0.50) / 0.16);
      mag.position.set(
        home.pos.x + (1 - u) * -0.045,
        home.pos.y + (1 - u) * -0.27,
        home.pos.z + (1 - u) * 0.11
      );
      _q.setFromEuler(_e.set((1 - u) * -0.55, 0, (1 - u) * -0.15));
      mag.quaternion.copy(home.quat).multiply(_q);
    } else {
      mag.position.copy(home.pos);
      mag.quaternion.copy(home.quat);
    }
    // charging handle + bolt during the rack phase
    let chOff = 0;
    if (tr >= 0.80 && tr < 0.88) chOff = sm((tr - 0.80) / 0.08) * 0.042;
    else if (tr >= 0.88 && tr < 0.91) chOff = (1 - (tr - 0.88) / 0.03) * 0.042;
    rig.charging.position.z = rig.chargingHome.pos.z + chOff;
    rig.bolt.position.z = rig.boltHome.pos.z + (tr < 0.91 && tr >= 0.80 ? chOff * 0.75 : tr < 0.80 && this.wasEmptyReload ? 0.026 : 0);
  }

  animPistolReload(rig, tr) {
    const mag = rig.mag, home = rig.magHome;
    mag.visible = true;
    if (tr < 0.06) {
      mag.position.copy(home.pos);
      mag.quaternion.copy(home.quat);
    } else if (tr < 0.18) {
      const u = (tr - 0.06) / 0.12, e = u * u;
      mag.position.set(home.pos.x, home.pos.y - e * 0.09, home.pos.z);
      mag.quaternion.copy(home.quat);
    } else if (tr < 0.48) {
      const u = (tr - 0.18) / 0.30;
      mag.visible = tr < 0.40;
      mag.position.set(home.pos.x - u * 0.03, home.pos.y - 0.09 - u * u * 0.5, home.pos.z + u * 0.05);
      _q.setFromEuler(_e.set(-u * 1.2, 0, -u * 0.4));
      mag.quaternion.copy(home.quat).multiply(_q);
    } else if (tr < 0.64) {
      const u = sm((tr - 0.48) / 0.16);
      mag.position.set(
        home.pos.x + (1 - u) * -0.02,
        home.pos.y + (1 - u) * -0.22,
        home.pos.z + (1 - u) * 0.04
      );
      _q.setFromEuler(_e.set((1 - u) * -0.35, 0, 0));
      mag.quaternion.copy(home.quat).multiply(_q);
    } else {
      mag.position.copy(home.pos);
      mag.quaternion.copy(home.quat);
    }
    // slide rack
    let sOff = 0;
    if (tr >= 0.70 && tr < 0.78) sOff = sm((tr - 0.70) / 0.08) * 0.034;
    else if (tr >= 0.78 && tr < 0.80) sOff = (1 - (tr - 0.78) / 0.02) * 0.034;
    else if (tr < 0.70 && this.wasEmptyReload) sOff = 0.028;
    rig.slide.position.z = rig.slideHome.pos.z + sOff;
    rig.hammer.rotation.x = rig.hammerCocked;
  }
}
