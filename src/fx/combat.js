// Weapons fire, explosions, sparks and debris.
//
// Everything is pooled and driven by scene-local time. Sequences schedule shots
// declaratively ("fire at t=3.2 from here to there") and the pools replay them
// deterministically, which is what lets the offline renderer reproduce a battle
// frame for frame.

import * as THREE from 'three';
import { emissive, glowPlane, paint } from '../gfx/materials.js';
import { radialGlow, shockRing, smokeSprite, boltSprite } from '../gfx/textures.js';
import { RNG } from '../util/rng.js';
import { clamp, smoothstep, TAU } from '../util/math.js';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Laser bolts. Each bolt is a stretched additive quad pair (one aligned to the
 * travel direction, one camera-facing glow) so it reads from any angle.
 */
export class BoltPool {
  constructor({ max = 90, color = 0xff4a30, length = 14, radius = 0.5, speed = 900 } = {}) {
    this.max = max;
    this.defaults = { color, length, radius, speed, life: 3 };
    this.group = new THREE.Group();
    this.group.renderOrder = 6;
    this.items = [];
    const geo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < max; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: boltSprite({ color: [255, 120, 90] }),
        color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.items.push({ mesh, mat, active: false, t0: 0, life: 1, from: new THREE.Vector3(), dir: new THREE.Vector3(), speed, length, radius, hit: 0 });
    }
    this.cursor = 0;
    this.queue = [];
    this.qi = 0;
  }

  /** Schedule a shot to be fired at scene time `t`. */
  schedule(t, from, to, opts = {}) {
    this.queue.push({ t, from: from.clone ? from.clone() : new THREE.Vector3(...from), to: to.clone ? to.clone() : new THREE.Vector3(...to), opts });
    this.queue.sort((a, b) => a.t - b.t);
    return this;
  }

  /** Schedule a burst: `n` shots `gap` seconds apart with a little scatter. */
  burst(t, n, gap, from, to, opts = {}) {
    const r = new RNG(Math.floor(t * 1000) + n);
    for (let i = 0; i < n; i++) {
      const jitter = opts.spread || 0;
      const target = (to.clone ? to.clone() : new THREE.Vector3(...to)).add(
        new THREE.Vector3(r.gauss(0, jitter), r.gauss(0, jitter), r.gauss(0, jitter)),
      );
      this.schedule(t + i * gap, from, target, opts);
    }
    return this;
  }

  fire(t, from, dir, opts = {}) {
    const it = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.max;
    it.active = true;
    it.t0 = t;
    it.from.copy(from);
    it.dir.copy(dir).normalize();
    it.speed = opts.speed ?? this.defaults.speed;
    it.length = opts.length ?? this.defaults.length;
    it.radius = opts.radius ?? this.defaults.radius;
    it.life = opts.life ?? this.defaults.life;
    it.hit = opts.hit ?? 0;
    it.mat.color.set(opts.color ?? this.defaults.color);
    it.mesh.visible = true;
    return it;
  }

  reset() {
    this.qi = 0;
    for (const it of this.items) { it.active = false; it.mesh.visible = false; }
  }

  update(t, camera) {
    while (this.qi < this.queue.length && this.queue[this.qi].t <= t) {
      const q = this.queue[this.qi++];
      _v.subVectors(q.to, q.from);
      const dist = _v.length();
      const it = this.fire(q.t, q.from, _v, q.opts);
      if (q.opts.travel) it.speed = dist / q.opts.travel;
      it.life = q.opts.life ?? Math.min(4, dist / it.speed + 0.05);
    }
    for (const it of this.items) {
      if (!it.active) continue;
      const age = t - it.t0;
      if (age < 0 || age > it.life) {
        it.active = false;
        it.mesh.visible = false;
        continue;
      }
      _v.copy(it.dir).multiplyScalar(age * it.speed).add(it.from);
      it.mesh.position.copy(_v);
      // Orient the quad so its long axis follows the bolt and its face turns
      // toward the camera.
      if (camera) {
        _v2.subVectors(camera.position, _v).normalize();
        const side = new THREE.Vector3().crossVectors(it.dir, _v2).normalize();
        const up = new THREE.Vector3().crossVectors(side, it.dir).normalize();
        _m.makeBasis(it.dir, up, side);
        it.mesh.quaternion.setFromRotationMatrix(_m);
        it.mesh.rotateY(Math.PI / 2);
      }
      const fade = 1 - smoothstep(it.life * 0.75, it.life, age);
      it.mesh.scale.set(it.length, it.radius * 2, 1);
      it.mat.opacity = fade;
    }
  }
}

/**
 * Explosions: a white flash, an expanding fireball, a shock ring, hot debris
 * shards and a smoke puff, all driven off one age value.
 */
export class ExplosionPool {
  constructor({ max = 14, seed = 3 } = {}) {
    this.group = new THREE.Group();
    this.group.renderOrder = 7;
    this.items = [];
    this.rng = new RNG(seed);
    const ringGeo = new THREE.PlaneGeometry(1, 1);
    const shardGeo = new THREE.TetrahedronGeometry(1, 0);
    for (let i = 0; i < max; i++) {
      const g = new THREE.Group();
      g.visible = false;
      const flash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
        map: radialGlow(), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
      const core = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({
        color: 0xffb44a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
        map: shockRing(), color: 0xffd9a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
      }));
      const smoke = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
        map: smokeSprite(), color: 0x2a2622, transparent: true, depthWrite: false, opacity: 0,
      }));
      const shards = new THREE.InstancedMesh(shardGeo, new THREE.MeshBasicMaterial({ color: 0xff9040, toneMapped: false }), 22);
      shards.frustumCulled = false;
      const dirs = [];
      for (let k = 0; k < 22; k++) {
        const p = this.rng.onSphere({});
        dirs.push(new THREE.Vector3(p.x, p.y, p.z).multiplyScalar(this.rng.float(0.4, 1.4)));
      }
      g.add(smoke, core, ring, shards, flash);
      this.group.add(g);
      this.items.push({ g, flash, core, ring, smoke, shards, dirs, active: false, t0: 0, size: 1, dur: 1.6, light: null });
    }
    this.cursor = 0;
    this.queue = [];
    this.qi = 0;
  }

  schedule(t, pos, opts = {}) {
    this.queue.push({ t, pos: pos.clone ? pos.clone() : new THREE.Vector3(...pos), opts });
    this.queue.sort((a, b) => a.t - b.t);
    return this;
  }

  boom(t, pos, { size = 20, dur = 1.8 } = {}) {
    const it = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;
    it.active = true;
    it.t0 = t;
    it.size = size;
    it.dur = dur;
    it.g.position.copy(pos);
    it.g.visible = true;
    it.g.rotation.set(this.rng.float(0, TAU), this.rng.float(0, TAU), this.rng.float(0, TAU));
    return it;
  }

  reset() {
    this.qi = 0;
    for (const it of this.items) { it.active = false; it.g.visible = false; }
  }

  update(t, camera) {
    while (this.qi < this.queue.length && this.queue[this.qi].t <= t) {
      const q = this.queue[this.qi++];
      this.boom(q.t, q.pos, q.opts);
    }
    const dummy = new THREE.Object3D();
    for (const it of this.items) {
      if (!it.active) continue;
      const age = (t - it.t0) / it.dur;
      if (age < 0 || age > 1) {
        it.active = false;
        it.g.visible = false;
        continue;
      }
      const s = it.size;
      // Flash: violent for the first 12% of the life.
      const fl = Math.exp(-age * 18);
      it.flash.material.opacity = fl;
      it.flash.scale.setScalar(s * (2.5 + age * 7));
      if (camera) it.flash.quaternion.copy(camera.quaternion);
      // Fireball.
      const grow = 1 - Math.exp(-age * 6);
      it.core.scale.setScalar(s * (0.25 + grow * 1.1));
      it.core.material.opacity = clamp(1 - age * 1.9);
      it.core.material.color.setRGB(1, 0.72 - age * 0.45, 0.28 - age * 0.28);
      // Shock ring.
      it.ring.scale.setScalar(s * (0.4 + grow * 5.5));
      it.ring.material.opacity = clamp(0.9 - age * 1.5) * 0.9;
      if (camera) it.ring.quaternion.copy(camera.quaternion);
      // Shards.
      for (let k = 0; k < it.dirs.length; k++) {
        dummy.position.copy(it.dirs[k]).multiplyScalar(s * age * 3.4);
        dummy.rotation.set(age * 9 * it.dirs[k].x, age * 9 * it.dirs[k].y, 0);
        dummy.scale.setScalar(s * 0.09 * (1 - age));
        dummy.updateMatrix();
        it.shards.setMatrixAt(k, dummy.matrix);
      }
      it.shards.instanceMatrix.needsUpdate = true;
      it.shards.material.opacity = 1 - age;
      // Smoke.
      it.smoke.material.opacity = smoothstep(0.05, 0.4, age) * (1 - smoothstep(0.5, 1, age)) * 0.7;
      it.smoke.scale.setScalar(s * (1.5 + age * 4));
      if (camera) it.smoke.quaternion.copy(camera.quaternion);
    }
  }
}

/** Small impact sparks: cheap point burst, used for saber clashes and hits. */
export class SparkPool {
  constructor({ bursts = 8, per = 26, seed = 11, color = 0xffd08a, size = 0.5 } = {}) {
    this.group = new THREE.Group();
    this.items = [];
    const r = new RNG(seed);
    for (let i = 0; i < bursts; i++) {
      const pos = new Float32Array(per * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        size, color, map: radialGlow(), transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, sizeAttenuation: true, toneMapped: false,
      });
      const pts = new THREE.Points(geo, mat);
      pts.visible = false;
      pts.frustumCulled = false;
      this.group.add(pts);
      const dirs = [];
      for (let k = 0; k < per; k++) {
        const p = r.onSphere({});
        dirs.push([p.x, p.y, p.z, r.float(0.4, 1.6)]);
      }
      this.items.push({ pts, geo, mat, dirs, active: false, t0: 0, origin: new THREE.Vector3(), speed: 8, dur: 0.5, gravity: 0 });
    }
    this.cursor = 0;
    this.queue = [];
    this.qi = 0;
  }

  schedule(t, pos, opts = {}) {
    this.queue.push({ t, pos: pos.clone ? pos.clone() : new THREE.Vector3(...pos), opts });
    this.queue.sort((a, b) => a.t - b.t);
    return this;
  }

  burst(t, pos, { speed = 8, dur = 0.5, gravity = 0, color } = {}) {
    const it = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;
    it.active = true;
    it.t0 = t;
    it.origin.copy(pos);
    it.speed = speed;
    it.dur = dur;
    it.gravity = gravity;
    if (color) it.mat.color.set(color);
    it.pts.visible = true;
    return it;
  }

  reset() {
    this.qi = 0;
    for (const it of this.items) { it.active = false; it.pts.visible = false; }
  }

  update(t) {
    while (this.qi < this.queue.length && this.queue[this.qi].t <= t) {
      const q = this.queue[this.qi++];
      this.burst(q.t, q.pos, q.opts);
    }
    for (const it of this.items) {
      if (!it.active) continue;
      const age = t - it.t0;
      if (age < 0 || age > it.dur) {
        it.active = false;
        it.pts.visible = false;
        continue;
      }
      const arr = it.geo.attributes.position.array;
      for (let k = 0; k < it.dirs.length; k++) {
        const d = it.dirs[k];
        const v = it.speed * d[3];
        arr[k * 3] = it.origin.x + d[0] * v * age;
        arr[k * 3 + 1] = it.origin.y + d[1] * v * age - it.gravity * age * age * 0.5;
        arr[k * 3 + 2] = it.origin.z + d[2] * v * age;
      }
      it.geo.attributes.position.needsUpdate = true;
      it.mat.opacity = 1 - age / it.dur;
    }
  }
}

/**
 * Turbolaser: a fat slow bolt for capital ship exchanges, with a muzzle flare.
 * Reuses BoltPool but with heavier defaults.
 */
export function turbolaserPool(color = 0x6bff5a) {
  return new BoltPool({ max: 40, color, length: 90, radius: 5, speed: 2400 });
}

/** Persistent damage fire clinging to a hull. */
export function hullFire({ count = 5, size = 6, seed = 2 } = {}) {
  const g = new THREE.Group();
  const r = new RNG(seed);
  const items = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
      map: radialGlow(), color: 0xff8a30, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    m.scale.setScalar(size * r.float(0.5, 1.4));
    g.add(m);
    items.push({ m, phase: r.float(0, 10), base: m.scale.x });
  }
  g.userData.update = (t, camera) => {
    for (const it of items) {
      const k = 0.7 + 0.3 * Math.sin(t * 9 + it.phase) + 0.15 * Math.sin(t * 23 + it.phase * 2);
      it.m.scale.setScalar(it.base * k);
      it.m.material.opacity = 0.55 + 0.35 * Math.sin(t * 13 + it.phase);
      if (camera) it.m.quaternion.copy(camera.quaternion);
    }
  };
  g.userData.items = items;
  return g;
}
