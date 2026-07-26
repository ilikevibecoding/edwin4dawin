import * as THREE from 'three';
import { ParticlePool, DebrisPool, makeSpriteTextures } from './particles.js';
import { rand, randRange, randSpread, randPick } from '../core/rand.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

/**
 * VFX facade. Stable API used by weapons/ai/airstrike:
 *   impact(point, normal, surface)
 *   blood(point, dir)
 *   muzzleFlash(getWorldPos, dir, {scale})   — viewmodel & enemies
 *   tracer(from, to, {speed})
 *   explosion(position, {radius, scorch})
 *   smokeColumn(position)  — lingering smoke source, returns stop()
 *   shellEject(pos, rightDir)
 *   flashLight(pos, color, intensity, decay) — transient light
 *   addShake via game.player.addShake
 */
export class VFX {
  constructor(game) {
    this.game = game;
    const tex = makeSpriteTextures();
    this.tex = tex;

    this.add = new ParticlePool(game.scene, tex.soft, { max: 2000, blending: THREE.AdditiveBlending, hdrBoost: 4 });
    this.addHard = new ParticlePool(game.scene, tex.hard, { max: 1200, blending: THREE.AdditiveBlending, hdrBoost: 6 });
    this.smoke = new ParticlePool(game.scene, tex.smoke, { max: 1600, blending: THREE.NormalBlending });
    this.debris = new DebrisPool(game.scene, { max: 300 });

    // pooled transient lights
    this.lights = [];
    for (let i = 0; i < 6; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 40, 2);
      l.castShadow = false;
      game.scene.add(l);
      this.lights.push({ light: l, ttl: 0, decay: 6 });
    }

    // tracers
    this.tracers = [];
    const tGeo = new THREE.PlaneGeometry(1, 1);
    this.tracerGeo = tGeo;
    this.tracerMat = new THREE.MeshBasicMaterial({
      map: tex.hard, color: new THREE.Color(8, 4.5, 1.6), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.tracerMat.toneMapped = true;

    // decals
    this.decals = [];
    this.decalMats = this._makeDecalMats();
    this.maxDecals = 90;

    // smoke emitters (airstrike aftermath etc)
    this.emitters = [];

    game.events.on('explosion', ({ position, radius }) => this.explosion(position, { radius }));
    game.events.on('weapon:hit', ({ point, normal, object, enemy }) => {
      if (!enemy) this.impact(point, normal, object?.userData?.surface || 'concrete');
    });
  }

  _makeDecalMats() {
    const mk = (draw, size = 64) => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      draw(c.getContext('2d'), size);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshBasicMaterial({
        map: t, transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -4,
      });
    };
    const bullet = mk((g, s) => {
      const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grad.addColorStop(0, 'rgba(8,6,5,0.95)');
      grad.addColorStop(0.3, 'rgba(15,12,10,0.8)');
      grad.addColorStop(0.6, 'rgba(30,26,22,0.35)');
      grad.addColorStop(1, 'rgba(30,26,22,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
    });
    const scorch = mk((g, s) => {
      const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grad.addColorStop(0, 'rgba(5,4,4,0.92)');
      grad.addColorStop(0.45, 'rgba(10,8,7,0.75)');
      grad.addColorStop(0.75, 'rgba(18,14,10,0.3)');
      grad.addColorStop(1, 'rgba(20,16,12,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
      // streaks
      g.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < 24; i++) {
        const a = rand() * Math.PI * 2;
        g.strokeStyle = `rgba(0,0,0,${0.15 + rand() * 0.25})`;
        g.lineWidth = 1 + rand() * 3;
        g.beginPath();
        g.moveTo(s / 2, s / 2);
        g.lineTo(s / 2 + Math.cos(a) * s * (0.3 + rand() * 0.24), s / 2 + Math.sin(a) * s * (0.3 + rand() * 0.24));
        g.stroke();
      }
    }, 128);
    return { bullet, scorch };
  }

  _decal(point, normal, size, mat, ttl = 40) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    m.position.copy(point).addScaledVector(normal, 0.012 + rand() * 0.004);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    m.rotateZ(rand() * Math.PI * 2);
    m.renderOrder = 4;
    this.game.scene.add(m);
    this.decals.push({ mesh: m, ttl });
    if (this.decals.length > this.maxDecals) {
      const old = this.decals.shift();
      this.game.scene.remove(old.mesh);
      old.mesh.geometry.dispose();
    }
  }

  flashLight(pos, color = 0xffcc88, intensity = 60, decay = 8, distance = 30) {
    let slot = this.lights.find((s) => s.ttl <= 0);
    if (!slot) slot = this.lights[0];
    slot.light.position.copy(pos);
    slot.light.color.set(color);
    slot.light.intensity = intensity;
    slot.light.distance = distance;
    slot.ttl = 1;
    slot.decay = decay;
  }

  impact(point, normal, surface = 'concrete') {
    const isMetal = surface === 'metal';
    const dustColor = { concrete: 0xb6a998, dirt: 0x8a6f4d, wood: 0x9a7b52, metal: 0x999999, plaster: 0xcfc5b2 }[surface] ?? 0xb6a998;

    // sparks
    this.addHard.burst(isMetal ? 14 : 6, () => ({
      pos: point, life: randRange(0.15, 0.45),
      vel: _v1.copy(normal).multiplyScalar(randRange(2, 7)).add(_v2.set(randSpread(3), randSpread(3) + 1.5, randSpread(3))).clone(),
      size0: 0.02, size1: 0.005, color: isMetal ? 0xffd9a0 : 0xffc080, alpha: 1,
      gravity: 9, drag: 0.6,
    }));
    // dust puff
    this.smoke.burst(5, () => ({
      pos: _v1.copy(point).addScaledVector(normal, 0.05).clone(),
      vel: _v2.copy(normal).multiplyScalar(randRange(0.6, 1.8)).add(new THREE.Vector3(randSpread(0.7), randRange(0.2, 0.9), randSpread(0.7))).clone(),
      life: randRange(0.5, 1.1), size0: 0.08, size1: randRange(0.4, 0.7),
      color: dustColor, alpha: 0.55, rotSpeed: randSpread(2), drag: 2.2, fadeIn: 0.05,
    }));
    // chips
    for (let i = 0; i < 4; i++) {
      this.debris.spawn({
        pos: point.clone(), size: 0.028, life: 1.6, color: dustColor,
        vel: _v1.copy(normal).multiplyScalar(randRange(1.5, 4)).add(_v2.set(randSpread(2), randRange(1, 3), randSpread(2))).clone(),
      });
    }
    this._decal(point, normal, randRange(0.06, 0.1), this.decalMats.bullet);
  }

  blood(point, dir) {
    this.smoke.burst(7, () => ({
      pos: point, life: randRange(0.25, 0.6),
      vel: _v1.copy(dir).multiplyScalar(randRange(0.5, 2.4)).add(_v2.set(randSpread(1.4), randSpread(1.4), randSpread(1.4))).clone(),
      size0: 0.06, size1: randRange(0.28, 0.5), color: 0x5a0d08, alpha: 0.85,
      gravity: 3.5, drag: 1.4, fadeIn: 0.01,
    }));
  }

  muzzleFlash(pos, dir, { scale = 1, light = true } = {}) {
    const p = pos.clone ? pos.clone() : pos;
    this.addHard.burst(3, () => ({
      pos: p, life: randRange(0.03, 0.06),
      vel: _v1.copy(dir).multiplyScalar(randRange(1, 3)).clone(),
      size0: randRange(0.16, 0.3) * scale, size1: 0.04 * scale,
      color: 0xffc668, alpha: 0.95, rot: rand() * 6.28,
    }));
    this.add.emit({
      pos: p, life: 0.055, vel: _v1.set(0, 0, 0).clone(),
      size0: 0.5 * scale, size1: 0.22 * scale, color: 0xff9d45, alpha: 0.6,
    });
    if (light) this.flashLight(p, 0xffb066, 26 * scale, 22, 14);
  }

  shellEject(pos, rightDir) {
    this.debris.spawn({
      pos: pos.clone(), size: 0.02, life: 1.4, color: 0xd8a63c, spin: 22,
      vel: _v1.copy(rightDir).multiplyScalar(randRange(1.4, 2.2)).add(_v2.set(0, randRange(1.6, 2.4), 0)).clone(),
    });
  }

  tracer(from, to, { speed = 320, width = 0.035 } = {}) {
    const dir = to.clone().sub(from);
    const dist = dir.length();
    dir.normalize();
    const mesh = new THREE.Mesh(this.tracerGeo, this.tracerMat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 21;
    this.game.scene.add(mesh);
    this.tracers.push({ mesh, from: from.clone(), dir, dist, speed, t: randRange(1.2, 2.6), len: randRange(2.4, 3.4), width });
  }

  explosion(position, { radius = 6, scorch = true, scale = 1 } = {}) {
    const p = position.clone();
    const s = scale * (radius / 6);

    // core flash
    this.add.emit({ pos: p, life: 0.12, size0: 2.4 * s, size1: 7 * s, color: 0xffe9b0, alpha: 1 });
    this.flashLight(p, 0xff9c4a, 320 * s, 5.5, 46 * s);

    // fireball
    this.add.burst(16, () => ({
      pos: _v1.set(p.x + randSpread(0.7 * s), p.y + randRange(0, 1.2) * s, p.z + randSpread(0.7 * s)).clone(),
      vel: _v2.set(randSpread(5), randRange(2, 8), randSpread(5)).multiplyScalar(s).clone(),
      life: randRange(0.3, 0.65), size0: randRange(0.9, 1.7) * s, size1: randRange(2.2, 3.4) * s,
      color: randPick([0xff8a30, 0xffb050, 0xff6620]), alpha: 0.95, rotSpeed: randSpread(3), drag: 2.2,
    }));
    // sparks
    this.addHard.burst(36, () => ({
      pos: p, life: randRange(0.3, 0.9),
      vel: _v1.set(randSpread(1), randRange(0.4, 1.4), randSpread(1)).normalize().multiplyScalar(randRange(8, 26) * s).clone(),
      size0: 0.05 * s, size1: 0.01, color: 0xffc060, alpha: 1, gravity: 12, drag: 0.7,
    }));
    // smoke column
    this.smoke.burst(22, () => ({
      pos: _v1.set(p.x + randSpread(1.2 * s), p.y + randRange(0.2, 1.6) * s, p.z + randSpread(1.2 * s)).clone(),
      vel: _v2.set(randSpread(1.6), randRange(2.2, 5.2), randSpread(1.6)).multiplyScalar(s * 0.8).clone(),
      life: randRange(1.8, 4.2), size0: randRange(1.2, 2) * s, size1: randRange(3.6, 6) * s,
      color: randPick([0x2a2622, 0x37322c, 0x1f1c19]), alpha: 0.88, rotSpeed: randSpread(1.2), drag: 1.1, fadeIn: 0.06,
    }));
    // dirt/debris
    for (let i = 0; i < 24; i++) {
      this.debris.spawn({
        pos: p.clone(), size: randRange(0.05, 0.16) * s, life: randRange(1.5, 3), color: randPick([0x4a4238, 0x35302a, 0x5c5248]),
        vel: _v1.set(randSpread(1), randRange(0.6, 1.6), randSpread(1)).normalize().multiplyScalar(randRange(6, 18) * s).clone(),
      });
    }
    // ground shockwave dust ring
    this.smoke.burst(14, (i) => {
      const a = (i / 14) * Math.PI * 2;
      return {
        pos: _v1.set(p.x + Math.cos(a) * 0.8 * s, Math.max(p.y - 0.4, 0.25), p.z + Math.sin(a) * 0.8 * s).clone(),
        vel: _v2.set(Math.cos(a) * 9 * s, 0.7, Math.sin(a) * 9 * s).clone(),
        life: randRange(0.7, 1.3), size0: 0.8 * s, size1: 2.4 * s,
        color: 0x8a7c68, alpha: 0.5, drag: 2.6, fadeIn: 0.04,
      };
    });

    if (scorch) {
      const hit = this.game.world.colliders.raycast(p.clone().add(new THREE.Vector3(0, 0.5, 0)), new THREE.Vector3(0, -1, 0), 8);
      if (hit) this._decal(hit.point, hit.normal, radius * 1.1, this.decalMats.scorch, 90);
    }
  }

  /** Lingering smoke source. Returns a stop() function. */
  smokeColumn(position, { rate = 9, size = 1.6, life = 12 } = {}) {
    const em = { pos: position.clone(), rate, size, acc: 0, ttl: life };
    this.emitters.push(em);
    return () => { em.ttl = 0; };
  }

  update(dt) {
    this.add.update(dt);
    this.addHard.update(dt);
    this.smoke.update(dt);
    this.debris.update(dt);

    for (const s of this.lights) {
      if (s.ttl > 0) {
        s.light.intensity *= Math.exp(-s.decay * dt);
        if (s.light.intensity < 0.3) { s.light.intensity = 0; s.ttl = 0; }
      }
    }

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.t += dt * t.speed;
      if (t.t >= t.dist) {
        this.game.scene.remove(t.mesh);
        this.tracers.splice(i, 1);
        continue;
      }
      const head = _v1.copy(t.from).addScaledVector(t.dir, t.t);
      const tail = _v2.copy(t.from).addScaledVector(t.dir, Math.max(0, t.t - t.len));
      const mid = head.clone().add(tail).multiplyScalar(0.5);
      t.mesh.position.copy(mid);
      const len = head.distanceTo(tail);
      t.mesh.scale.set(t.width, len, 1);
      // orient plane along dir, facing camera
      t.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), t.dir);
      const toCam = this.game.camera.position.clone().sub(mid).normalize();
      const side = t.dir.clone().cross(toCam).normalize();
      const face = new THREE.Matrix4().makeBasis(side, t.dir, side.clone().cross(t.dir).normalize());
      t.mesh.quaternion.setFromRotationMatrix(face);
    }

    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const em = this.emitters[i];
      em.ttl -= dt;
      if (em.ttl <= 0) { this.emitters.splice(i, 1); continue; }
      em.acc += dt * em.rate;
      while (em.acc >= 1) {
        em.acc -= 1;
        this.smoke.emit({
          pos: _v1.set(em.pos.x + randSpread(0.8), em.pos.y + randRange(0, 0.6), em.pos.z + randSpread(0.8)).clone(),
          vel: _v2.set(randSpread(0.5), randRange(1.4, 2.6), randSpread(0.5)).clone(),
          life: randRange(2.5, 5), size0: em.size * 0.7, size1: em.size * randRange(2.2, 3.2),
          color: randPick([0x232019, 0x312c26, 0x1b1916]), alpha: 0.8, rotSpeed: randSpread(0.8), drag: 1.4, fadeIn: 0.12,
        });
      }
    }

    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      d.ttl -= dt;
      if (d.ttl <= 0) {
        this.game.scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        this.decals.splice(i, 1);
      }
    }
  }
}
