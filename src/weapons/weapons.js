import * as THREE from 'three';
import { buildRifleViewmodel, buildPistolViewmodel, buildHand } from './models.js';
import { clamp, damp, lerp } from '../core/math.js';

const WEAPON_DEFS = {
  rifle: {
    name: 'M4A1 TEMPEST', mode: 'AUTO', auto: true,
    rpm: 720, damage: 26, headMul: 1.9, mag: 30, reserve: 180,
    spreadHip: 0.024, spreadAds: 0.0025, spreadMove: 0.02,
    recoilPitch: 0.0042, recoilYaw: 0.0022, kick: 0.02,
    // Every round draws a streak: the MW-style "bullet leaving the gun"
    // read has to land in any single fired frame, not 1-in-3.
    reloadTime: 2.15, caliber: 1.0, tracerEvery: 1,
  },
  pistol: {
    name: 'P320 COBRA', mode: 'SEMI', auto: false,
    rpm: 420, damage: 34, headMul: 2.0, mag: 12, reserve: 72,
    spreadHip: 0.016, spreadAds: 0.004, spreadMove: 0.012,
    recoilPitch: 0.006, recoilYaw: 0.002, kick: 0.03,
    reloadTime: 1.5, caliber: 0.8, tracerEvery: 1,
  },
};

// Viewmodel renders through a dedicated 50-degree camera on layer 1, at
// true 1:1 scale — positions are real-world metres from the eye.
const VM_SCALE = 1.0;
const HIP_POS = new THREE.Vector3(0.15, -0.165, -0.37);
// ADS is optic-centred EXACTLY: the tube axis (optic local y=0.085) must
// pass through the camera axis so the collimated dot solves to dead lens
// centre. (The old 5mm-low cheat left the dot reading visibly high of
// centre in every ADS frame.)
const ADS_POS = new THREE.Vector3(0, -0.085, -0.34);
const SPRINT_POS = new THREE.Vector3(0.1, -0.235, -0.34);
const PISTOL_HIP = new THREE.Vector3(0.14, -0.16, -0.36);
const PISTOL_ADS = new THREE.Vector3(0, -0.04, -0.37);

// HDR tints for the extra ADS lens-bloom petal (fx.muzzle()'s own petal
// colors are private to particles.js).
const ADS_BLOOM0 = new THREE.Color(2.1, 1.68, 1.1);
const ADS_BLOOM1 = new THREE.Color(1.4, 0.75, 0.3);

export class WeaponSystem {
  constructor(opts) {
    Object.assign(this, opts); // camera, scene, colliders, fx, decals, tracers, casings, explosions, audio, hud, enemies, onRecoil, onShake
    this.root = new THREE.Group();
    this.root.scale.setScalar(VM_SCALE);
    this.camera.add(this.root);

    // Build both viewmodels
    this.models = {
      rifle: buildRifleViewmodel(),
      pistol: buildPistolViewmodel(),
    };
    this.hands = {
      rifle: [buildHand(1, 'grip'), buildHand(-1, 'support')],
      pistol: [buildHand(1, 'grip')],
    };
    // Attach hands. The hand rigs wrap a bar running along their local Z
    // through their origin, so each mounts with its origin ON the gripped
    // axis: right hand on the pistol-grip axis (rotated ~-1.25 rad so the
    // fingers curl around the raked grip), left hand C-clamping the
    // handguard mid-length with knuckles rolled toward the camera.
    const [rh, lh] = this.hands.rifle;
    rh.position.set(0, -0.071, 0.09); rh.rotation.set(-1.25, 0, 0.05);
    lh.position.set(0, 0.012, -0.26); lh.rotation.set(0.1, -0.05, -0.06);
    this.models.rifle.group.add(rh, lh);
    const [prh] = this.hands.pistol;
    prh.position.set(0, -0.048, 0.055); prh.rotation.set(-1.29, 0, 0);
    this.models.pistol.group.add(prh);

    for (const key of Object.keys(this.models)) {
      const m = this.models[key];
      m.group.visible = false;
      m.group.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.receiveShadow = false; } });
      this.root.add(m.group);
    }
    // Weapon layer: rendered by the dedicated viewmodel camera only
    this.root.traverse((o) => o.layers.set(1));

    this.state = {};
    for (const key of Object.keys(WEAPON_DEFS)) {
      this.state[key] = { mag: WEAPON_DEFS[key].mag, reserve: WEAPON_DEFS[key].reserve };
    }

    this.current = 'rifle';
    this.def = WEAPON_DEFS.rifle;
    this.vm = this.models.rifle;
    this.vm.group.visible = true;

    this.triggerHeld = false;
    this.wantAds = false;
    this.adsFrac = 0;
    this.cooldown = 0;
    this.reloadT = -1;
    this.switchT = -1;
    this.switchTo = null;
    this.shotCount = 0;
    this.spreadBloom = 0;

    // Spring state for recoil & sway
    this.recoilPos = new THREE.Vector3();
    this.recoilRot = new THREE.Vector3();
    this.swayPos = new THREE.Vector3();
    this.swayRot = new THREE.Vector3();
    this.bobPhase = 0;
    this.lastLookDX = 0; this.lastLookDY = 0;

    this.grenades = [];
    this.grenadeCount = 4;
    this._tmpV = new THREE.Vector3();
    this._tmpV2 = new THREE.Vector3();
    this._tmpQ = new THREE.Quaternion();
    // update() scratch vectors (no per-frame allocations)
    this._reloadPosOff = new THREE.Vector3();
    this._reloadRotOff = new THREE.Vector3();
    this._basePos = new THREE.Vector3();
    this._baseRot = new THREE.Vector3();
    // Muzzle FX deferred from _fire() to the end of update() — see _flushShotFx
    this._pendingFx = null;
    this._fxV = new THREE.Vector3();
    this._fxV2 = new THREE.Vector3();
    this._fxV3 = new THREE.Vector3();

    // Mirror of the engine's dedicated 50° viewmodel camera (same transform
    // as the world camera, different projection) — used to re-project the
    // red dot so it collimates against the world-camera aim ray.
    this.vmCam = new THREE.PerspectiveCamera(50, this.camera.aspect || 1, 0.01, 6);

    this.updateHud();
  }

  get busy() { return this.reloadT >= 0 || this.switchT >= 0; }

  updateHud() {
    const s = this.state[this.current];
    this.hud.setAmmo(s.mag, s.reserve);
    this.hud.setWeaponName(this.def.name, this.def.mode);
  }

  switchWeapon(key) {
    if (key === this.current || this.switchT >= 0 || !WEAPON_DEFS[key]) return;
    this.switchTo = key;
    this.switchT = 0;
    this.reloadT = -1;
    this.audio.reload('in');
  }

  reload() {
    const s = this.state[this.current];
    if (this.reloadT >= 0 || s.mag >= this.def.mag || s.reserve <= 0 || this.switchT >= 0) return;
    this.reloadT = 0;
    this.audio.reload('out');
  }

  onTriggerDown() {
    this.triggerHeld = true;
    if (!this.def.auto) this._tryFire();
  }
  onTriggerUp() { this.triggerHeld = false; }

  _tryFire() {
    if (this.cooldown > 0 || this.busy) return;
    const s = this.state[this.current];
    if (s.mag <= 0) {
      this.audio.dryFire();
      this.cooldown = 0.24;
      if (s.reserve > 0) this.reload();
      return;
    }
    this._fire();
  }

  _fire() {
    const def = this.def;
    const s = this.state[this.current];
    s.mag--;
    this.cooldown = 60 / def.rpm;
    this.shotCount++;
    this.spreadBloom = Math.min(1, this.spreadBloom + 0.24);

    // Ray with spread
    this.camera.updateMatrixWorld();
    const origin = this.camera.getWorldPosition(this._tmpV.set(0, 0, 0)).clone();
    const dir = this.camera.getWorldDirection(this._tmpV2.set(0, 0, 0)).clone();
    const spread = this.currentSpread();
    dir.x += (Math.random() - 0.5) * 2 * spread;
    dir.y += (Math.random() - 0.5) * 2 * spread;
    dir.z += (Math.random() - 0.5) * 2 * spread;
    dir.normalize();

    // Resolve hit: enemies vs world vs ground
    const MAX = 300;
    const enemyHit = this.enemies ? this.enemies.raycast(origin, dir, MAX) : null;
    const worldHit = this.colliders.raycast(origin, dir, MAX);
    let groundT = Infinity;
    if (dir.y < -1e-5) groundT = -origin.y / dir.y;

    let point = null, normal = null, kind = 'none', enemy = null, headshot = false;
    let bestT = MAX;
    if (worldHit && worldHit.t < bestT) { bestT = worldHit.t; point = worldHit.point; normal = worldHit.normal; kind = 'wall'; }
    if (groundT < bestT) { bestT = groundT; point = origin.clone().addScaledVector(dir, groundT); normal = new THREE.Vector3(0, 1, 0); kind = 'ground'; }
    if (enemyHit && enemyHit.t < bestT) { bestT = enemyHit.t; point = enemyHit.point; normal = dir.clone().negate(); kind = 'enemy'; enemy = enemyHit.enemy; headshot = enemyHit.headshot; }
    if (!point) point = origin.clone().addScaledVector(dir, MAX);

    // Muzzle/casing FX are deferred to the end of update() (once this
    // frame's final viewmodel pose — recoil included — is applied) so the
    // flash roots exactly on the rendered crown. Spawning here used the
    // PREVIOUS frame's matrices: by first recoil frame the gun had moved
    // up/back while the flash stayed put, reading ~10px low-left of the bore.
    this._pendingFx = {
      point,
      tracer: this.shotCount % def.tracerEvery === 0 && bestT > 4,
    };
    this.audio.gunshot({ vol: 1, caliber: def.caliber });
    this.audio.casing();

    // Impact
    if (kind === 'enemy' && enemy) {
      const dmg = def.damage * (headshot ? def.headMul : 1);
      this.fx.bloodPuff(point, dir);
      const killed = enemy.damage(dmg, point, dir, headshot);
      this.hud.showHitmarker(killed, headshot);
      this.audio.hitmarker(killed);
    } else if (kind === 'wall') {
      this.fx.impactWall(point, normal);
      this.decals.bulletHole(point, normal);
      this.audio.impact(bestT);
    } else if (kind === 'ground') {
      this.fx.impactDirt(point);
      this.audio.impact(bestT);
    }

    // Recoil impulses
    const adsMul = lerp(1, 0.55, this.adsFrac);
    this.onRecoil(
      def.recoilPitch * adsMul * (0.85 + Math.random() * 0.3),
      def.recoilYaw * adsMul * (Math.random() - 0.42)
    );
    this.recoilPos.z += def.kick;
    this.recoilPos.y += def.kick * 0.2;
    this.recoilRot.x += def.kick * (this.adsFrac > 0.5 ? 0.5 : 1.1);
    this.recoilRot.z += (Math.random() - 0.5) * def.kick * 0.8;

    this.updateHud();
    if (s.mag === 0 && s.reserve > 0) this.hud.flashReloadHint(true);
  }

  /**
   * Spawn the shot FX at THIS frame's final muzzle transform. Runs at the
   * end of update() once recoil/bob/sway are applied to the group, so the
   * flash core sits on the bore at the flash-hider crown in the rendered
   * frame, and the tongue runs along the true barrel axis instead of the
   * camera ray.
   */
  _flushShotFx() {
    const p = this._pendingFx;
    this._pendingFx = null;
    this.vm.muzzle.updateWorldMatrix(true, false);
    const bore = this.vm.muzzle.getWorldDirection(this._fxV2).negate(); // forward = -Z
    // Flash roots ON the bore axis in both hip and ADS. In ADS the bore
    // runs below the optic axis, so the bloom wraps the barrel centreline
    // and crests the LOWER rim of the sight picture, MW-style. (The old
    // +4.5cm camera-up shift parked the whole flash inside the lens and
    // read as frosted glass / a flash hanging right of the bore.)
    const fxPos = this.vm.muzzle.getWorldPosition(this._fxV)
      .addScaledVector(bore, 0.03 + 0.05 * this.adsFrac);
    this.fx.muzzle(fxPos, bore, true);
    // fx.muzzle() takes no size parameter, so ADS gets one extra petal
    // sprite into the depth-free vm pool: a small bore-centred halo that
    // fattens the bloom around the muzzle without washing the lens.
    // Mirrors muzzle()'s 30% skip cadence so bursts keep dead frames.
    if (this.adsFrac > 0.5 && this.fx.petalVM) {
      const n10 = (this.fx._shotN ?? 0) % 10;
      const skipped = (n10 === 3 || n10 === 4 || n10 === 7) && !window.__PHOTO_MODE;
      if (!skipped) {
        this.fx.petalVM.spawn({
          pos: fxPos, life: 0.04,
          size0: 0.09 * this.adsFrac * (0.9 + Math.random() * 0.3), size1: 0.07,
          color0: ADS_BLOOM0, color1: ADS_BLOOM1,
          alpha0: 0.28, alpha1: 0, fadeIn: 0, rot: Math.random() * 6.3,
        });
      }
    }
    // Muzzle light must kick in THIS rendered frame. fx.muzzle() only arms
    // the light record — intensity is written on the pool's next update, and
    // the default 50ms life decayed to nothing by the frame after the shot,
    // so fired frames showed a flash that cast zero light. Force the warm
    // short-throw light hot now, and add a wider ~2.5m splash so the
    // handguard, glove and 1-2m of ground visibly kick for 1-2 frames.
    const ml = this.fx.muzzleLight;
    if (ml && ml.visible && this.fx._muzzleAge === 0) {
      this.fx._muzzleIntensity = 80;
      this.fx._muzzleLife = 0.07;
      ml.intensity = 80;
      this.fx.lights.flash(fxPos, { color: 0xffb377, intensity: 26, life: 0.09, distance: 3.0 });
    }
    if (p.tracer) this.tracers.fire(fxPos, p.point, 900);
    // Casing — offset away from the lens so brass never fills the screen
    const camQ = this.camera.getWorldQuaternion(this._tmpQ);
    const right = this._fxV2.set(1, 0, 0).applyQuaternion(camQ).normalize();
    const back = this._fxV3.set(0, 0, 1).applyQuaternion(camQ).normalize();
    const ejectPos = this.vm.ejectPort.getWorldPosition(new THREE.Vector3()).addScaledVector(right, 0.085);
    this.casings.eject(ejectPos, right, back);
    // Eject glint — sun catching the brass for its first 1-2 frames. It has
    // to fly WITH the case: same eject direction as CasingSystem.eject
    // (right + 0.55 up + 0.4 back) at the mean eject speed, with a life
    // short enough that the speed spread can't visibly separate glint from
    // casing. Sized ~60% of the on-screen case so it reads as a sparkle ON
    // the brass, never a detached disc.
    const glintVel = this._fxV.copy(right);
    glintVel.y += 0.55;
    glintVel.addScaledVector(back, 0.4).normalize().multiplyScalar(4.3);
    this.fx.flash.spawn({
      pos: ejectPos, vel: glintVel, life: 0.03,
      size0: 0.011, size1: 0.007, alpha0: 0.5, alpha1: 0, fadeIn: 0, rot: Math.random() * 6.3,
    });
  }

  currentSpread() {
    const def = this.def;
    const move = this.moveFrac ?? 0;
    const base = lerp(def.spreadHip, def.spreadAds, this.adsFrac);
    return base + def.spreadMove * move * (1 - this.adsFrac * 0.85) + this.spreadBloom * 0.012 * (1 - this.adsFrac * 0.7);
  }

  throwGrenade() {
    if (this.grenadeCount <= 0 || this.busy) return;
    this.grenadeCount--;
    this.audio.reload('in');
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshStandardMaterial({ color: 0x3a4434, roughness: 0.6, metalness: 0.3 }));
    body.scale.y = 1.2;
    g.add(body);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.008), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.4 }));
    lever.position.set(0.02, 0.05, 0);
    g.add(lever);
    body.castShadow = true;
    this.scene.add(g);

    this.camera.updateMatrixWorld();
    const origin = this.camera.getWorldPosition(new THREE.Vector3());
    const dir = this.camera.getWorldDirection(new THREE.Vector3());
    const pos = origin.clone().addScaledVector(dir, 0.5);
    pos.y -= 0.1;
    const vel = dir.clone().multiplyScalar(13);
    vel.y += 3.5;
    this.grenades.push({ mesh: g, pos, vel, fuse: 2.3, spin: new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8) });
  }

  _updateGrenades(dt) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.fuse -= dt;
      if (g.fuse <= 0) {
        this.scene.remove(g.mesh);
        this.grenades.splice(i, 1);
        this.explosions.spawn(g.pos.clone(), { radius: 5.5, big: false });
        this.audio.explosion({ dist: this.camera.getWorldPosition(this._tmpV).distanceTo(g.pos) });
        if (this.onExplosionDamage) this.onExplosionDamage(g.pos, 6.5, 130);
        continue;
      }
      // Integrate with collision
      g.vel.y -= 16 * dt;
      const step = g.vel.length() * dt;
      if (step > 1e-6) {
        const dir = g.vel.clone().normalize();
        const hit = this.colliders.raycast(g.pos, dir, step + 0.06);
        if (hit) {
          const n = hit.normal;
          const d = g.vel.dot(n);
          g.vel.addScaledVector(n, -1.7 * d);
          g.vel.multiplyScalar(0.45);
        } else {
          g.pos.addScaledVector(g.vel, dt);
        }
      }
      if (g.pos.y < 0.06) {
        g.pos.y = 0.06;
        if (Math.abs(g.vel.y) > 0.8) this.audio.impact(4);
        g.vel.y = Math.abs(g.vel.y) * 0.42;
        g.vel.x *= 0.72; g.vel.z *= 0.72;
      }
      g.mesh.position.copy(g.pos);
      g.mesh.rotation.x += g.spin.x * dt;
      g.mesh.rotation.y += g.spin.y * dt;
    }
  }

  /**
   * dt, move: { speed(0..1), sprinting, grounded, lookDX, lookDY }
   */
  update(dt, move) {
    const def = this.def;
    this.moveFrac = move.speed;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.spreadBloom = Math.max(0, this.spreadBloom - dt * 1.9);

    // Auto fire
    if (this.triggerHeld && def.auto) this._tryFire();

    // ADS
    const adsBlocked = move.sprinting || this.busy;
    const target = this.wantAds && !adsBlocked ? 1 : 0;
    this.adsFrac = damp(this.adsFrac, target, 13, dt);

    /* ---------------- switch ---------------- */
    if (this.switchT >= 0) {
      this.switchT += dt;
      const DOWN = 0.22, UP = 0.24;
      if (this.switchT >= DOWN && this.switchTo) {
        this.vm.group.visible = false;
        this.current = this.switchTo;
        this.def = WEAPON_DEFS[this.current];
        this.vm = this.models[this.current];
        this.vm.group.visible = true;
        this.switchTo = null;
        this.updateHud();
      }
      if (this.switchT >= DOWN + UP) this.switchT = -1;
    }

    /* ---------------- reload ---------------- */
    const reloadPosOff = this._reloadPosOff.set(0, 0, 0);
    const reloadRotOff = this._reloadRotOff.set(0, 0, 0);
    if (this.reloadT >= 0) {
      this.reloadT += dt;
      const T = def.reloadTime;
      const t = this.reloadT / T;
      const mag = this.vm.magGroup;
      // Phases: tilt in [0,0.15], mag out [0.1,0.35], mag in [0.5,0.75], bolt [0.78,0.92], untilt [0.9,1]
      const tilt = t < 0.15 ? t / 0.15 : t > 0.9 ? (1 - t) / 0.1 : 1;
      reloadRotOff.set(0.22 * tilt, 0.12 * tilt, -0.38 * tilt);
      reloadPosOff.set(-0.02 * tilt, -0.03 * tilt, 0.02 * tilt);
      if (t > 0.1 && t < 0.35) {
        const k = (t - 0.1) / 0.25;
        mag.position.y = -0.05 - k * 0.3;
        mag.rotation.x = k * 0.5;
        if (!this._magOut) { this._magOut = true; }
      } else if (t >= 0.35 && t < 0.5) {
        mag.visible = false;
      } else if (t >= 0.5 && t < 0.75) {
        mag.visible = true;
        const k = 1 - (t - 0.5) / 0.25;
        mag.position.y = -0.05 - k * 0.25;
        mag.rotation.x = k * 0.3;
        if (!this._magIn) { this._magIn = true; this.audio.reload('in'); }
      } else if (t >= 0.75) {
        mag.position.y = -0.05;
        mag.rotation.x = 0;
      }
      if (t > 0.78 && t < 0.92) {
        const k = Math.sin(((t - 0.78) / 0.14) * Math.PI);
        this.vm.chGroup.position.z = 0.115 + k * 0.045;
        if (!this._bolt) { this._bolt = true; this.audio.reload('bolt'); }
      }
      if (this.reloadT >= T) {
        this.reloadT = -1;
        this._magOut = this._magIn = this._bolt = false;
        const s = this.state[this.current];
        const need = def.mag - s.mag;
        const take = Math.min(need, s.reserve);
        s.mag += take; s.reserve -= take;
        this.vm.chGroup.position.z = 0.115;
        this.updateHud();
        this.hud.flashReloadHint(false);
      }
    }

    /* ---------------- pose blending ---------------- */
    const isPistol = this.current === 'pistol';
    const hipPos = isPistol ? PISTOL_HIP : HIP_POS;
    const adsPos = isPistol ? PISTOL_ADS : ADS_POS;
    const basePos = this._basePos.copy(hipPos).lerp(adsPos, this.adsFrac);
    const baseRot = this._baseRot.set(0, 0, 0);

    // Slight inward cant at hip so the muzzle converges toward center
    baseRot.y += 0.045 * (1 - this.adsFrac);

    // Sprint pose
    const sprintFrac = move.sprintFrac ?? (move.sprinting ? 1 : 0);
    basePos.lerp(SPRINT_POS, sprintFrac * (1 - this.adsFrac));
    baseRot.x += 0.32 * sprintFrac * (1 - this.adsFrac);
    baseRot.y += 0.42 * sprintFrac * (1 - this.adsFrac);
    baseRot.z += 0.12 * sprintFrac * (1 - this.adsFrac);

    // Switch dip
    if (this.switchT >= 0) {
      const DOWN = 0.22, UP = 0.24;
      const k = this.switchT < DOWN ? this.switchT / DOWN : 1 - (this.switchT - DOWN) / UP;
      basePos.y -= 0.22 * k;
      baseRot.x += 0.5 * k;
    }

    // Walk bob
    const bobAmp = (0.9 - this.adsFrac * 0.75) * move.speed;
    this.bobPhase += dt * (move.sprinting ? 13.5 : 9.5) * Math.min(1, move.speed * 1.5 + 0.001);
    const bobX = Math.sin(this.bobPhase) * 0.008 * bobAmp;
    const bobY = -Math.abs(Math.cos(this.bobPhase)) * 0.009 * bobAmp;

    // Look sway (lag behind camera)
    const swayTX = clamp((move.lookDX ?? 0) * -0.00016, -0.02, 0.02);
    const swayTY = clamp((move.lookDY ?? 0) * 0.00013, -0.018, 0.018);
    this.swayPos.x = damp(this.swayPos.x, swayTX, 9, dt);
    this.swayPos.y = damp(this.swayPos.y, swayTY, 9, dt);
    this.swayRot.z = damp(this.swayRot.z, swayTX * -2.4, 8, dt);
    this.swayRot.x = damp(this.swayRot.x, swayTY * 2.2, 8, dt);
    this.swayRot.y = damp(this.swayRot.y, swayTX * -1.6, 8, dt);

    // Recoil springs recover
    const rec = 1 - Math.exp(-14 * dt);
    this.recoilPos.multiplyScalar(1 - rec);
    this.recoilRot.multiplyScalar(1 - rec);

    // Idle breathe
    const tNow = performance.now() * 0.001;
    const idleY = Math.sin(tNow * 1.4) * 0.0016 * (1 - this.adsFrac * 0.7);
    const idleRX = Math.sin(tNow * 1.1) * 0.0022 * (1 - this.adsFrac * 0.8);

    const grp = this.vm.group;
    grp.position.set(
      basePos.x + bobX + this.swayPos.x + this.recoilPos.x + reloadPosOff.x,
      basePos.y + bobY + this.swayPos.y + idleY + this.recoilPos.y + reloadPosOff.y,
      basePos.z + this.recoilPos.z + reloadPosOff.z
    );
    grp.rotation.set(
      baseRot.x + this.swayRot.x + idleRX + this.recoilRot.x + reloadRotOff.x,
      baseRot.y + this.swayRot.y + this.recoilRot.y * 0.4 + reloadRotOff.y,
      baseRot.z + this.swayRot.z + this.recoilRot.z + reloadRotOff.z
    );

    // Reset mag pose after reload safety
    if (this.reloadT < 0 && this.vm.magGroup) {
      this.vm.magGroup.visible = true;
      this.vm.magGroup.position.y = -0.05;
      this.vm.magGroup.rotation.x = 0;
    }

    // At full ADS ease the stock/grip cluster down-left so the buttpad and
    // camo sleeve clear the bottom edge of the frame.
    if (this.current === 'rifle') {
      const k = this.adsFrac;
      if (this.vm.stockGroup) this.vm.stockGroup.position.set(-0.014 * k, -0.005 - 0.024 * k, 0.27);
      const rGrip = this.hands.rifle[0];
      rGrip.position.set(-0.012 * k, -0.071 - 0.02 * k, 0.09);
    }

    // Shot FX deferred from _fire(): spawn at the final rendered pose.
    if (this._pendingFx) this._flushShotFx();

    // Collimated red dot: solve the 40m aim point through the WORLD camera,
    // then re-project that NDC through the mirrored 50° viewmodel camera.
    if (this.adsFrac > 0.2 && this.vm.updateDot) {
      this.camera.updateMatrixWorld();
      if (this.vmCam.aspect !== this.camera.aspect) {
        this.vmCam.aspect = this.camera.aspect;
        this.vmCam.updateProjectionMatrix();
      }
      this.vmCam.position.setFromMatrixPosition(this.camera.matrixWorld);
      this.vmCam.quaternion.setFromRotationMatrix(this.camera.matrixWorld);
      this.vmCam.updateMatrixWorld();
      this.vm.updateDot(this.camera, this.vmCam);
    }
    // Emitter fade: a real red dot only presents near the optical axis.
    // Fading with adsFrac keeps the HDR dot/halo from blooming a taillight
    // around the optic in hip/shoulder views.
    if (this.vm.opticDot) {
      const k = clamp((this.adsFrac - 0.22) / 0.5, 0, 1);
      this.vm.opticDot.visible = k > 0.02;
      this.vm.opticDot.material.opacity = k;
      if (this.vm.opticHalo) {
        this.vm.opticHalo.visible = k > 0.02;
        this.vm.opticHalo.material.opacity = 0.5 * k;
      }
    }

    this._updateGrenades(dt);
    this.hud.setSpread(this.currentSpread());
    this.hud.setAds(this.adsFrac > 0.6);
  }
}
