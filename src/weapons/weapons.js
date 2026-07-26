import * as THREE from 'three';
import { makeRNG, damp } from '../core/utils.js';

// ===========================================================================
// Weapon system: AX-4 carbine. Hitscan with visual tracers, recoil pattern
// applied to player aim, shell casings, muzzle light, ammo + reload.
// ===========================================================================

const rng = makeRNG(9182);

// Along-length brightness gradient: blazing head fading down the tail.
function tracerGradientTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 64); // y=0 -> v=1 (head)
  g.addColorStop(0.0, 'rgba(255,255,255,1)');
  g.addColorStop(0.1, 'rgba(255,246,225,1)');
  g.addColorStop(0.42, 'rgba(255,220,160,0.55)');
  g.addColorStop(0.8, 'rgba(255,190,120,0.16)');
  g.addColorStop(1.0, 'rgba(255,170,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 64);
  return new THREE.CanvasTexture(c);
}

class TracerPool {
  constructor(scene, max = 48) {
    this.pool = [];
    this.active = [];
    // Tapered: wide bright head (+z after rotate), thin tail
    const geo = new THREE.CylinderGeometry(0.016, 0.0045, 1, 6, 1, true);
    geo.rotateX(Math.PI / 2); // align to Z, head at +z
    const gradient = tracerGradientTexture();
    for (let i = 0; i < max; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(1.0, 0.78, 0.42).multiplyScalar(5),
        map: gradient,
        transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false,
        side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      scene.add(m);
      this.pool.push(m);
    }
  }

  fire(from, to, speed = 420) {
    const m = this.pool.pop();
    if (!m) return;
    const dir = to.clone().sub(from);
    const dist = dir.length();
    dir.normalize();
    m.visible = true;
    m.userData = { from: from.clone(), dir, dist, traveled: rng.range(1.5, 4), speed, len: 5.5 };
    this.active.push(m);
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const m = this.active[i];
      const u = m.userData;
      u.traveled += u.speed * dt;
      const head = Math.min(u.traveled, u.dist);
      const tail = Math.max(u.traveled - u.len, 0);
      if (tail >= u.dist) {
        m.visible = false;
        this.active.splice(i, 1);
        this.pool.push(m);
        continue;
      }
      const segLen = Math.max(head - tail, 0.1);
      const mid = u.from.clone().addScaledVector(u.dir, (head + tail) / 2);
      m.position.copy(mid);
      m.scale.set(1, 1, segLen);
      m.lookAt(mid.clone().add(u.dir));
      m.material.opacity = 0.85 * Math.min(1, (u.dist - tail) / 8);
    }
  }
}

class CasingPool {
  constructor(scene, max = 48) {
    const geo = new THREE.CylinderGeometry(0.0045, 0.0045, 0.026, 6);
    const mat = new THREE.MeshStandardMaterial({ color: 0xb98f3e, roughness: 0.35, metalness: 0.9, envMapIntensity: 1.6 });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.max = max;
    this.items = [];
    this.m4 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.e = new THREE.Euler();
    this.s = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < max; i++) this.m4.identity(), this.mesh.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
  }

  eject(pos, rightDir, upDir) {
    if (this.items.length >= this.max) this.items.shift();
    const vel = rightDir.clone().multiplyScalar(rng.range(1.4, 2.2))
      .addScaledVector(upDir, rng.range(1.6, 2.4));
    this.items.push({
      pos: pos.clone(), vel,
      rot: new THREE.Vector3(rng() * 6, rng() * 6, rng() * 6),
      rotVel: new THREE.Vector3(rng.range(-14, 14), rng.range(-14, 14), rng.range(-14, 14)),
      age: 0, life: 2.4,
    });
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      const it = this.items[i];
      if (!it || it.age > it.life) {
        this.m4.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, this.m4);
        continue;
      }
      it.age += dt;
      it.vel.y -= 11 * dt;
      it.pos.addScaledVector(it.vel, dt);
      if (it.pos.y < 0.015) {
        it.pos.y = 0.015;
        it.vel.y = Math.abs(it.vel.y) * 0.35;
        it.vel.x *= 0.7; it.vel.z *= 0.7;
        it.rotVel.multiplyScalar(0.6);
      }
      it.rot.addScaledVector(it.rotVel, dt);
      this.e.set(it.rot.x, it.rot.y, it.rot.z);
      this.q.setFromEuler(this.e);
      this.m4.compose(it.pos, this.q, this.s);
      this.mesh.setMatrixAt(i, this.m4);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export class WeaponSystem {
  constructor(engine, player, physics, viewmodel, impacts, audio) {
    this.engine = engine;
    this.player = player;
    this.physics = physics;
    this.viewmodel = viewmodel;
    this.impacts = impacts;
    this.audio = audio;

    this.name = 'AX-4';
    this.rpm = 780;
    this.magSize = 30;
    this.ammo = 30;
    this.reserve = 210;
    this.damageBody = 26;
    this.damageHead = 62;

    this.cooldown = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.bloom = 0;

    this.tracers = new TracerPool(engine.scene);
    this.casings = new CasingPool(engine.scene);

    this.muzzleLight = new THREE.PointLight(0xffb45e, 0, 9, 2);
    engine.scene.add(this.muzzleLight);

    this.enemyManager = null; // wired in main
    this.onShotFired = null;
    this.onHit = null;        // (kind: 'hit'|'kill'|'headshot')

    this._muzzleWorld = new THREE.Vector3();
    this._dir = new THREE.Vector3();
  }

  get canFire() {
    return this.cooldown <= 0 && this.ammo > 0 && !this.viewmodel.reloading && !this.player.dead;
  }

  tryReload() {
    if (this.ammo >= this.magSize || this.reserve <= 0 || this.viewmodel.reloading) return;
    if (this.viewmodel.startReload()) {
      this.audio?.play('reload');
      setTimeout(() => {
        const need = this.magSize - this.ammo;
        const take = Math.min(need, this.reserve);
        this.ammo += take;
        this.reserve -= take;
      }, this.viewmodel.reloadDuration * 900);
    }
  }

  fire(camera) {
    if (!this.canFire) return;
    this.cooldown = 60 / this.rpm;
    this.ammo--;

    // --- Aim direction with spread ---
    const aimF = this.player.aimingFraction;
    const moveF = this.player.moveSpeedNormalized;
    const baseSpread = THREE.MathUtils.lerp(0.017, 0.0022, aimF);
    const spread = baseSpread * (1 + moveF * 1.6) + this.bloom * 0.011;
    this.bloom = Math.min(1, this.bloom + 0.16);

    camera.getWorldDirection(this._dir);
    this._dir.x += (rng() - 0.5) * 2 * spread;
    this._dir.y += (rng() - 0.5) * 2 * spread;
    this._dir.z += (rng() - 0.5) * 2 * spread;
    this._dir.normalize();

    const origin = camera.position.clone();

    // --- Hit detection: enemies first, then world ---
    const worldHit = this.physics.raycast(origin, this._dir, 320);
    const worldDist = worldHit ? worldHit.dist : 320;
    const enemyHit = this.enemyManager?.hitScan(origin, this._dir, worldDist);

    let endPoint;
    if (enemyHit) {
      endPoint = enemyHit.point;
      const dmg = enemyHit.part === 'head' ? this.damageHead : this.damageBody;
      const result = this.enemyManager.applyDamage(enemyHit.enemy, dmg, this._dir);
      this.impacts.bloodHit(enemyHit.point, this._dir);
      this.onHit?.(result === 'dead' ? (enemyHit.part === 'head' ? 'headshot' : 'kill') : 'hit', enemyHit.enemy);
      this.audio?.play('hitmarker');
    } else if (worldHit) {
      endPoint = worldHit.point;
      const metal = worldHit.point.y > 0.05 && rng.chance(0.25);
      this.impacts.bulletImpact(worldHit.point, worldHit.normal, metal ? 'metal' : 'concrete');
    } else {
      endPoint = origin.clone().addScaledVector(this._dir, 320);
    }

    // --- Visuals ---
    this.viewmodel.triggerShot();
    this.viewmodel.getMuzzleWorld(camera, this._muzzleWorld);
    this.tracers.fire(this._muzzleWorld, endPoint);

    this.muzzleLight.position.copy(this._muzzleWorld);
    this.muzzleLight.intensity = 26;

    // Casing: eject to the right of camera
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0);
    this.casings.eject(this._muzzleWorld.clone().addScaledVector(this._dir, -0.25).addScaledVector(right, 0.06), right, up);

    // --- Recoil: mostly vertical, slight horizontal wander ---
    const recoilScale = THREE.MathUtils.lerp(1.0, 0.55, aimF);
    this.recoilPitch += (0.0052 + rng() * 0.0016) * recoilScale;
    this.recoilYaw += (rng() - 0.42) * 0.0035 * recoilScale;

    this.player.addShake(0.0035);
    this.audio?.play('shot');
    this.onShotFired?.();
  }

  update(dt, camera, wantFire) {
    this.cooldown -= dt;
    this.bloom = Math.max(0, this.bloom - dt * 2.4);

    if (wantFire) this.fire(camera);

    // Recoil application + recovery
    if (Math.abs(this.recoilPitch) > 1e-5 || Math.abs(this.recoilYaw) > 1e-5) {
      const applyP = this.recoilPitch * Math.min(1, dt * 34);
      const applyY = this.recoilYaw * Math.min(1, dt * 34);
      this.player.pitch += applyP;
      this.player.yaw += applyY;
      this.recoilPitch -= applyP;
      this.recoilYaw -= applyY;
    }

    this.muzzleLight.intensity = damp(this.muzzleLight.intensity, 0, 34, dt);
    this.tracers.update(dt);
    this.casings.update(dt);
  }
}
