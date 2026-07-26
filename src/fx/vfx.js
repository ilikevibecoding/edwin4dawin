// Visual effects: pooled tracers, impact bursts, muzzle flashes, glass
// shards, smoke volumes, flash effect. Listens to combat events so weapons/AI
// stay decoupled from rendering.

import * as THREE from 'three';
import { on } from '../core/events.js';
import { getSetting, qualityPreset } from '../core/settings.js';
import { worldRng } from '../core/rng.js';

const IMPACT_COLORS = {
  concrete: 0xc9c5ba, drywall: 0xe6e2d8, wood: 0xa07850, metal: 0xffd890,
  glass: 0xd8ecf4, carpet: 0x8a8478, tile: 0xd0d4d2, snow: 0xffffff, flesh: 0xa03028,
};

export class Vfx {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'vfx';
    scene.add(this.group);
    this.sparks = [];       // {mesh, vel, ttl}
    this.tracers = [];      // {line, ttl}
    this.flashes = [];      // {light/sprite, ttl}
    this.smokes = [];       // {group, ttl, pos, radius}
    this.unsubs = [];
    this.unsubs.push(on('impact', (e) => this.impact(e)));
    this.unsubs.push(on('enemy-shot', (e) => this.tracer(e.from, e.to)));
    this._sparkGeo = new THREE.BoxGeometry(0.03, 0.03, 0.03);
    this._sparkMats = new Map();
  }

  matFor(color) {
    if (!this._sparkMats.has(color)) {
      this._sparkMats.set(color, new THREE.MeshBasicMaterial({ color }));
    }
    return this._sparkMats.get(color);
  }

  impact({ kind, point, normal, light }) {
    if (!point) return;
    const scale = qualityPreset().particleScale;
    const isBlood = kind === 'flesh';
    if (isBlood && getSetting('reducedBlood')) return;
    const color = IMPACT_COLORS[kind] ?? 0xcccccc;
    const n = Math.max(2, Math.round((light ? 3 : 6) * scale));
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this._sparkGeo, this.matFor(color));
      m.position.set(point.x, point.y, point.z);
      const sp = 1.4 + worldRng.random() * 2.4;
      const dir = new THREE.Vector3(
        (normal?.x ?? 0) + (worldRng.random() - 0.5) * 1.5,
        (normal?.y ?? 0) + worldRng.random() * 1.1,
        (normal?.z ?? 0) + (worldRng.random() - 0.5) * 1.5,
      ).normalize().multiplyScalar(sp);
      this.group.add(m);
      this.sparks.push({ mesh: m, vel: dir, ttl: 0.32 + worldRng.random() * 0.2 });
    }
  }

  tracer(from, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(from.x, from.y, from.z), new THREE.Vector3(to.x, to.y, to.z),
    ]);
    const mat = new THREE.LineBasicMaterial({ color: 0xffdf9a, transparent: true, opacity: 0.7 });
    const line = new THREE.Line(geo, mat);
    this.group.add(line);
    this.tracers.push({ line, ttl: 0.08 });
  }

  muzzleFlash(pos, dir) {
    const light = new THREE.PointLight(0xffc36a, 14, 7, 2);
    light.position.copy(pos).addScaledVector(dir, 0.4);
    this.group.add(light);
    this.flashes.push({ obj: light, ttl: 0.05 });
  }

  spawnSmoke(pos, radius, duration) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xb8bec4, transparent: true, opacity: 0.0, roughness: 1, depthWrite: false });
    const blobs = Math.round(10 * qualityPreset().particleScale) + 4;
    for (let i = 0; i < blobs; i++) {
      const s = radius * (0.35 + worldRng.random() * 0.5);
      const m = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), mat.clone());
      m.position.set(
        pos.x + (worldRng.random() - 0.5) * radius * 1.2,
        pos.y + 0.4 + worldRng.random() * radius * 0.8,
        pos.z + (worldRng.random() - 0.5) * radius * 1.2,
      );
      m.userData.targetOpacity = 0.5 + worldRng.random() * 0.25;
      g.add(m);
    }
    this.group.add(g);
    const cloud = { group: g, ttl: duration, age: 0, pos: { ...pos }, radius };
    this.smokes.push(cloud);
    return cloud;
  }

  update(dt) {
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.ttl -= dt;
      if (s.ttl <= 0) { this.group.remove(s.mesh); this.sparks.splice(i, 1); continue; }
      s.vel.y -= 9.8 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.scale.setScalar(Math.max(0.2, s.ttl * 3));
    }
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.ttl -= dt;
      if (t.ttl <= 0) { this.group.remove(t.line); t.line.geometry.dispose(); t.line.material.dispose(); this.tracers.splice(i, 1); }
    }
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.ttl -= dt;
      if (f.ttl <= 0) { this.group.remove(f.obj); this.flashes.splice(i, 1); }
    }
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i];
      s.age += dt;
      s.ttl -= dt;
      const fadeIn = Math.min(1, s.age / 1.2);
      const fadeOut = Math.min(1, Math.max(0, s.ttl / 2));
      for (const m of s.group.children) {
        m.material.opacity = m.userData.targetOpacity * fadeIn * fadeOut;
        m.position.y += dt * 0.06;
      }
      if (s.ttl <= 0) {
        for (const m of s.group.children) { m.geometry.dispose(); m.material.dispose(); }
        this.group.remove(s.group);
        this.smokes.splice(i, 1);
      }
    }
  }

  smokeBlocks(a, b) {
    // segment vs smoke spheres
    for (const s of this.smokes) {
      if (s.age < 0.8) continue;
      const cx = s.pos.x, cy = s.pos.y + 1, cz = s.pos.z;
      const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
      const len2 = abx * abx + aby * aby + abz * abz || 1;
      let t = ((cx - a.x) * abx + (cy - a.y) * aby + (cz - a.z) * abz) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + abx * t, py = a.y + aby * t, pz = a.z + abz * t;
      const d2 = (px - cx) ** 2 + (py - cy) ** 2 + (pz - cz) ** 2;
      if (d2 < s.radius * s.radius) return true;
    }
    return false;
  }

  dispose() {
    for (const u of this.unsubs) u();
    this.scene.remove(this.group);
  }
}
