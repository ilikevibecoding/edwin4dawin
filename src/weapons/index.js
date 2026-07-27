import * as THREE from 'three';
import { randSpread, randRange } from '../core/rand.js';
import { WEAPON_DEFS } from './defs.js';
import { makeWeaponMaterials } from './materials.js';
import { buildM4A1, buildM1911, buildGrenade } from './models.js';
import { ViewmodelAnimator } from './animation.js';

const _dir = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _right = new THREE.Vector3();
const _muzzle = new THREE.Vector3();
const _eject = new THREE.Vector3();

/**
 * Weapons system. Owns the viewmodel (attached to player.viewmodelRoot),
 * firing, ADS, reload, grenades.
 * API: equip(index), forceFire(duration), forceAds(bool), throwGrenade()
 * State read by HUD/harness: def, slot, ads, cooldown, grenades.
 */
export class Weapons {
  constructor(game) {
    this.game = game;
    this.defs = WEAPON_DEFS;
    this.current = 0;
    this.state = this.defs.map((d) => ({ mag: d.magSize, reserve: d.reserve, reloading: 0 }));
    this.cooldown = 0;
    this.ads = 0;           // 0..1
    this.wantAds = false;
    this.forceAdsOn = false;
    this.forceFireT = 0;
    this.grenades = 4;
    this.grenadeCooldown = 0;
    this.projectiles = [];

    // recoil pattern bookkeeping
    this.burst = 0;
    this.sinceShot = 9;

    this.root = new THREE.Group();
    game.player.viewmodelRoot.add(this.root);
    this.models = [];
    this.rigs = [];
  }

  async load() {
    this.mats = makeWeaponMaterials();
    for (const def of this.defs) {
      const built = def.type === 'rifle' ? buildM4A1(this.mats) : buildM1911(this.mats);
      built.group.traverse((m) => {
        if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false; }
      });
      built.group.visible = false;
      this.root.add(built.group);
      this.models.push(built.group);
      this.rigs.push(built.rig);
    }
    this.models[this.current].visible = true;

    this.anim = new ViewmodelAnimator(this.game, this);
    this.anim.register(this.defs, this.rigs);

    // dev-only screenshot helpers:
    //   ?vmtest=<index> force weapon, ?vmreload=1 start an empty reload,
    //   ?vmsprint=1 freeze the sprint pose
    const q = new URLSearchParams(location.search);
    const vt = q.get('vmtest');
    if (vt !== null) this.equip(Math.max(0, parseInt(vt) || 0));
    if (q.get('vmreload') !== null) { this.slot.mag = 0; this.reload(); }
    if (q.get('vmsprint') !== null) this.anim.debugSprint = true;
  }

  get def() { return this.defs[this.current]; }
  get slot() { return this.state[this.current]; }

  equip(i) {
    if (i === this.current || i < 0 || i >= this.defs.length) return;
    this.models[this.current].visible = false;
    this.current = i;
    this.models[i].visible = true;
    this.slot.reloading = 0;
    this.cooldown = Math.max(this.cooldown, 0.28);
    this.burst = 0;
    this.anim?.notifyEquip();
    this.game.events.emit('weapon:switch', { weapon: this.def });
  }

  forceAds(v) { this.forceAdsOn = v; }
  forceFire(duration) { this.forceFireT = duration; }

  muzzleWorld(out) {
    return this.rigs[this.current].muzzle.getWorldPosition(out);
  }

  throwGrenade() {
    if (this.grenades <= 0 || this.grenadeCooldown > 0 || !this.game.player.alive) return;
    this.grenades--;
    this.grenadeCooldown = 0.9;
    const cam = this.game.camera;
    const dir = cam.getWorldDirection(new THREE.Vector3());
    const pos = cam.position.clone().addScaledVector(dir, 0.4);
    const vel = dir.multiplyScalar(14).add(new THREE.Vector3(0, 4.2, 0));
    const mesh = buildGrenade(this.mats);
    mesh.position.copy(pos);
    this.game.scene.add(mesh);
    this.projectiles.push({ mesh, vel, fuse: 2.6, bounced: 0 });
    this.game.events.emit('weapon:grenade', {});
  }

  fire() {
    const def = this.def, slot = this.slot;
    if (slot.mag <= 0) {
      this.reload();
      return;
    }
    slot.mag--;
    this.cooldown = 60 / def.rpm;

    const { camera, player, vfx, world, ai, events } = this.game;
    const spread = THREE.MathUtils.lerp(def.spreadHip, def.spreadAds, this.ads) * (player.moveSpeed01 * 0.6 + 1);
    camera.getWorldDirection(_dir);
    _dir.x += randSpread(spread); _dir.y += randSpread(spread); _dir.z += randSpread(spread);
    _dir.normalize();
    _origin.copy(camera.position);

    // camera recoil: rising first shots, then gentle horizontal S-drift
    if (this.sinceShot > 0.25) this.burst = 0;
    this.sinceShot = 0;
    const r = def.recoil;
    const rising = this.burst < r.settleShots ? r.firstShotMul : 1.0;
    const pitchKick = r.pitch * rising * randRange(0.9, 1.1);
    const yawKick = Math.sin(this.burst * r.driftFreq) * r.yaw * 0.85 + randSpread(r.yaw * 0.55);
    player.addRecoil(pitchKick, yawKick);
    this.burst++;
    this.anim.notifyFire(def);

    // muzzle fx at the real muzzle, shells from the real ejection port
    this.muzzleWorld(_muzzle);
    vfx.muzzleFlash(_muzzle.clone(), _dir, { scale: def.vm.flashScale });
    _right.setFromMatrixColumn(camera.matrixWorld, 0);
    this.rigs[this.current].eject.getWorldPosition(_eject);
    vfx.shellEject(_eject.clone(), _right);

    // hitscan: enemies first, then world
    const enemyHit = ai.raycast(_origin, _dir, def.range);
    const worldHit = world.colliders.raycast(_origin, _dir, def.range);
    let hit = null, isEnemy = false;
    if (enemyHit && (!worldHit || enemyHit.distance < worldHit.distance)) { hit = enemyHit; isEnemy = true; }
    else hit = worldHit;

    const end = hit ? hit.point : _origin.clone().addScaledVector(_dir, def.range);
    if (_muzzle.distanceTo(end) > 8) vfx.tracer(_muzzle.clone().addScaledVector(_dir, 1.4), end.clone());

    if (hit) {
      if (isEnemy) {
        const dmg = def.damage * (hit.headshot ? def.headshotMul : 1);
        hit.enemy.damage(dmg, hit.headshot, hit.point, _dir);
        vfx.blood(hit.point, _dir);
        events.emit('ui:hitmarker', { headshot: hit.headshot, kill: hit.enemy.health <= 0 });
      }
      events.emit('weapon:hit', { point: hit.point, normal: hit.normal ?? _dir.clone().negate(), object: hit.object, damage: def.damage, enemy: isEnemy, headshot: !!hit.headshot });
    }
    events.emit('weapon:fire', { weapon: def, origin: _origin.clone(), direction: _dir.clone() });
  }

  reload() {
    const def = this.def, slot = this.slot;
    if (slot.reloading > 0 || slot.mag >= def.magSize || slot.reserve <= 0) return;
    this.anim.wasEmptyReload = slot.mag <= 0;
    slot.reloading = def.reloadTime;
    this.game.events.emit('weapon:reload', { weapon: def });
  }

  update(dt) {
    const { input, player } = this.game;
    if (dt === 0) return;
    const def = this.def, slot = this.slot;

    // input
    if (input.pressed('Digit1')) this.equip(0);
    if (input.pressed('Digit2')) this.equip(1);
    if (input.pressed('KeyR')) this.reload();
    if (input.pressed('KeyG')) this.throwGrenade();
    this.grenadeCooldown = Math.max(0, this.grenadeCooldown - dt);
    this.sinceShot += dt;

    this.wantAds = (input.mouse(2) || this.forceAdsOn) && player.alive && !player.sprinting;
    const adsTarget = this.wantAds ? 1 : 0;
    this.ads = THREE.MathUtils.damp(this.ads, adsTarget, 1 / Math.max(def.adsTime * 0.35, 0.05), dt);
    player.aiming = this.ads > 0.5;
    player.fovOffset = def.adsFov * this.ads;
    // COD keeps the world crisp at ADS — only a whisper of DoF for depth feel.
    // Kept very low: near-plane CoC smears the reticle dot into a soft blob and
    // reads as a milky filter over the whole ADS frame.
    this.game.engine.setDofAmount(this.ads * 0.15);
    if (this.ads > 0.02) {
      const cam = this.game.camera;
      cam.getWorldDirection(_dir);
      this.game.engine.setDofTarget(_dir.multiplyScalar(14).add(cam.position));
    }

    // reload timer
    if (slot.reloading > 0) {
      slot.reloading -= dt;
      if (slot.reloading <= 0) {
        const take = Math.min(def.magSize - slot.mag, slot.reserve);
        slot.mag += take;
        slot.reserve -= take;
        slot.reloading = 0;
      }
    }

    // firing
    this.cooldown -= dt;
    let wantFire = player.alive && slot.reloading <= 0 && !player.sprinting &&
      (def.auto ? input.mouse(0) : input.mousePressed(0));
    if (this.forceFireT > 0) { this.forceFireT -= dt; wantFire = slot.reloading <= 0; }
    if (wantFire && this.cooldown <= 0) this.fire();

    // viewmodel animation
    this.anim.update(dt);

    // grenades ---------------------------------------------------------------
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.vel.y -= 12 * dt;
      const move = p.vel.clone().multiplyScalar(dt);
      const dist = move.length();
      const hit = this.game.world.colliders.raycast(p.mesh.position, move.clone().normalize(), dist + 0.06);
      if (hit) {
        p.mesh.position.copy(hit.point).addScaledVector(hit.normal, 0.06);
        const v = p.vel.clone();
        const n = hit.normal;
        p.vel.copy(v.sub(n.clone().multiplyScalar(2 * v.dot(n))).multiplyScalar(0.42));
        if (p.vel.length() < 1.2) p.vel.set(0, 0, 0);
        p.bounced++;
      } else {
        p.mesh.position.add(move);
      }
      p.mesh.rotation.x += dt * 6; p.mesh.rotation.z += dt * 4;
      p.fuse -= dt;
      if (p.fuse <= 0) {
        this.game.events.emit('explosion', { position: p.mesh.position.clone(), radius: 7, damage: 120 });
        this.game.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }
}
