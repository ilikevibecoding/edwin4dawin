import * as THREE from 'three';
import { rand, randSpread, randRange } from '../core/rand.js';

const _dir = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _right = new THREE.Vector3();

/**
 * Weapons system. Owns the viewmodel (attached to player.viewmodelRoot),
 * firing, ADS, reload, grenades.
 * API: equip(index), forceFire(duration), forceAds(bool), throwGrenade()
 */
export class Weapons {
  constructor(game) {
    this.game = game;
    this.defs = [
      {
        name: 'M4A1', type: 'rifle', auto: true, rpm: 780, damage: 26, headshotMul: 2.1,
        magSize: 30, reserve: 180, reloadTime: 2.1, spreadHip: 0.014, spreadAds: 0.0016,
        recoil: [0.0072, 0.0022], adsFov: -16, adsTime: 0.22, range: 300,
      },
      {
        name: 'M1911', type: 'pistol', auto: false, rpm: 420, damage: 34, headshotMul: 2.4,
        magSize: 8, reserve: 64, reloadTime: 1.6, spreadHip: 0.02, spreadAds: 0.004,
        recoil: [0.014, 0.004], adsFov: -8, adsTime: 0.16, range: 120,
      },
    ];
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
    this.recoilKick = new THREE.Vector3(); // viewmodel kick spring
    this.swayPos = new THREE.Vector3();
    this.swayRot = new THREE.Vector3();

    this.root = new THREE.Group();
    game.player.viewmodelRoot.add(this.root);
    this.models = [];
  }

  async load() {
    // Baseline procedural viewmodels (replaced by AAA versions later)
    for (const def of this.defs) {
      const g = new THREE.Group();
      const metal = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.45, metalness: 0.85 });
      const poly = new THREE.MeshStandardMaterial({ color: 0x35342f, roughness: 0.7, metalness: 0.1 });
      if (def.type === 'rifle') {
        const recv = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.09, 0.34), metal);
        recv.position.set(0, 0, -0.12);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.34, 12), metal);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.012, -0.44);
        const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.26), poly);
        handguard.position.set(0, 0.005, -0.33);
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.07), poly);
        mag.position.set(0, -0.11, -0.08);
        mag.rotation.x = 0.12;
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.075, 0.2), poly);
        stock.position.set(0, -0.005, 0.12);
        const sightF = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, 0.01), metal);
        sightF.position.set(0, 0.06, -0.42);
        const sightR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.022, 0.02), metal);
        sightR.position.set(0, 0.058, -0.02);
        g.add(recv, barrel, handguard, mag, stock, sightF, sightR);
        g.userData.muzzleLocal = new THREE.Vector3(0, 0.012, -0.62);
      } else {
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.045, 0.19), metal);
        slide.position.set(0, 0.02, -0.06);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.14), poly);
        frame.position.set(0, -0.01, -0.03);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.11, 0.05), poly);
        grip.position.set(0, -0.07, 0.02);
        grip.rotation.x = -0.25;
        g.add(slide, frame, grip);
        g.userData.muzzleLocal = new THREE.Vector3(0, 0.02, -0.17);
      }
      g.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false; } });
      g.visible = false;
      this.root.add(g);
      this.models.push(g);
    }
    this.models[this.current].visible = true;
    // grenade mesh proto
    this.grenadeGeo = new THREE.SphereGeometry(0.055, 10, 8);
    this.grenadeMat = new THREE.MeshStandardMaterial({ color: 0x39412f, roughness: 0.6, metalness: 0.3 });
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
    this.game.events.emit('weapon:switch', { weapon: this.def });
  }

  forceAds(v) { this.forceAdsOn = v; }
  forceFire(duration) { this.forceFireT = duration; }

  muzzleWorld(out) {
    const g = this.models[this.current];
    return out.copy(g.userData.muzzleLocal).applyMatrix4(g.matrixWorld);
  }

  throwGrenade() {
    if (this.grenades <= 0 || this.grenadeCooldown > 0 || !this.game.player.alive) return;
    this.grenades--;
    this.grenadeCooldown = 0.9;
    const cam = this.game.camera;
    const dir = cam.getWorldDirection(new THREE.Vector3());
    const pos = cam.position.clone().addScaledVector(dir, 0.4);
    const vel = dir.multiplyScalar(14).add(new THREE.Vector3(0, 4.2, 0));
    const mesh = new THREE.Mesh(this.grenadeGeo, this.grenadeMat);
    mesh.position.copy(pos);
    mesh.castShadow = true;
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

    // recoil
    player.addRecoil(def.recoil[0] * randRange(0.85, 1.15), randSpread(def.recoil[1]));
    this.recoilKick.z += 0.05;
    this.recoilKick.y += 0.008;

    // muzzle fx
    const muzzle = this.muzzleWorld(new THREE.Vector3());
    vfx.muzzleFlash(muzzle, _dir, { scale: def.type === 'rifle' ? 1 : 0.7 });
    _right.setFromMatrixColumn(camera.matrixWorld, 0);
    vfx.shellEject(muzzle.clone().addScaledVector(_dir, -0.25), _right);

    // hitscan: enemies first, then world
    const enemyHit = ai.raycast(_origin, _dir, def.range);
    const worldHit = world.colliders.raycast(_origin, _dir, def.range);
    let hit = null, isEnemy = false;
    if (enemyHit && (!worldHit || enemyHit.distance < worldHit.distance)) { hit = enemyHit; isEnemy = true; }
    else hit = worldHit;

    const end = hit ? hit.point : _origin.clone().addScaledVector(_dir, def.range);
    if (muzzle.distanceTo(end) > 8) vfx.tracer(muzzle.clone().addScaledVector(_dir, 1.4), end.clone());

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
    slot.reloading = def.reloadTime;
    this.game.events.emit('weapon:reload', { weapon: def });
  }

  update(dt) {
    const { input, player, camera } = this.game;
    if (dt === 0) return;
    const def = this.def, slot = this.slot;

    // input
    if (input.pressed('Digit1')) this.equip(0);
    if (input.pressed('Digit2')) this.equip(1);
    if (input.pressed('KeyR')) this.reload();
    if (input.pressed('KeyG')) this.throwGrenade();
    this.grenadeCooldown = Math.max(0, this.grenadeCooldown - dt);

    this.wantAds = (input.mouse(2) || this.forceAdsOn) && player.alive && !player.sprinting;
    const adsTarget = this.wantAds ? 1 : 0;
    this.ads = THREE.MathUtils.damp(this.ads, adsTarget, 1 / Math.max(def.adsTime * 0.35, 0.05), dt);
    player.aiming = this.ads > 0.5;
    player.fovOffset = def.adsFov * this.ads;
    this.game.engine.setDofAmount(this.ads * 0.9);

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

    // viewmodel animation ------------------------------------------------------
    const g = this.models[this.current];
    const hipPos = new THREE.Vector3(0.16, -0.155, -0.33);
    const adsPos = new THREE.Vector3(0, -0.098, -0.22);
    const sprintRot = player.sprinting ? 0.5 : 0;
    const basePos = hipPos.clone().lerp(adsPos, this.ads);

    // sway from mouse
    const swayX = THREE.MathUtils.clamp(-input.mouseDX * 0.00007, -0.02, 0.02);
    const swayY = THREE.MathUtils.clamp(input.mouseDY * 0.00007, -0.02, 0.02);
    this.swayPos.x = THREE.MathUtils.damp(this.swayPos.x, swayX * (1 - this.ads * 0.85), 10, dt);
    this.swayPos.y = THREE.MathUtils.damp(this.swayPos.y, swayY * (1 - this.ads * 0.85), 10, dt);

    // bob
    const bob = player.bobAmp * (1 - this.ads * 0.8);
    const bx = Math.sin(player.bobPhase) * 0.009 * bob;
    const by = -Math.abs(Math.cos(player.bobPhase)) * 0.011 * bob;

    // recoil spring
    this.recoilKick.multiplyScalar(Math.exp(-12 * dt));

    g.position.copy(basePos).add(this.swayPos);
    g.position.x += bx;
    g.position.y += by + (player.crouching ? -0.008 : 0);
    g.position.z += this.recoilKick.z * 0.5;
    g.rotation.set(
      this.recoilKick.z * 1.6 + this.swayPos.y * 2 + (player.sprinting ? 0.35 : 0),
      this.swayPos.x * 3 + sprintRot * 0.35,
      this.swayPos.x * 2 - sprintRot * 0.25
    );
    if (slot.reloading > 0) {
      const t = 1 - slot.reloading / def.reloadTime;
      const dip = Math.sin(Math.min(t * 1.25, 1) * Math.PI);
      g.position.y -= dip * 0.09;
      g.rotation.x += dip * 0.5;
      g.rotation.z += dip * 0.3;
    }

    // grenades -------------------------------------------------------------------
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
