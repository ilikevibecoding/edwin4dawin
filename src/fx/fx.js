// Visual effects: pooled particles, tracers, muzzle flash, impact decals,
// shell casings, glass shards, smoke volumes, snow. All procedural.
import * as THREE from 'three';
import { bus } from '../core/events.js';
import { settings } from '../core/settings.js';

const IMPACT_COLORS = {
  concrete: 0xb8b2a6, drywall: 0xe8e2d4, wood: 0x9a7548, metal: 0xffd98c,
  glass: 0xcfe4ee, carpet: 0x8a8478, tile: 0xd8d4c8, snow: 0xffffff, flesh: 0xa33f34,
};

export class FX {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.group = new THREE.Group();
    this.group.name = 'fx';
    this.scene.add(this.group);

    this._initParticles();
    this._initTracers();
    this._initDecals();
    this._initShells();
    this._initFlashLight();
    this.smokes = [];
    this.snowT = 0;
  }

  budget() { return settings.quality().particleBudget; }

  // ---------------- particles (single Points pool) ----------------
  _initParticles() {
    const MAX = 2200;
    this.pMax = MAX;
    this.pCount = 0;
    this.pData = new Float32Array(MAX * 8); // x y z vx vy vz life fade
    this.pGeo = new THREE.BufferGeometry();
    this.pPos = new Float32Array(MAX * 3);
    this.pCol = new Float32Array(MAX * 3);
    this.pSize = new Float32Array(MAX);
    this.pGeo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.pGeo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3).setUsage(THREE.DynamicDrawUsage));
    this.pGeo.setAttribute('size', new THREE.BufferAttribute(this.pSize, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.PointsMaterial({
      size: 0.05, vertexColors: true, transparent: true, opacity: 0.95,
      sizeAttenuation: true, depthWrite: false,
    });
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('uniform float size;', 'attribute float size;')
        .replace('gl_PointSize = size;', 'gl_PointSize = size * 320.0;');
    };
    this.points = new THREE.Points(this.pGeo, mat);
    this.points.frustumCulled = false;
    this.group.add(this.points);
    this.pGeo.setDrawRange(0, 0);
  }

  spawnParticle(x, y, z, vx, vy, vz, life, color, size) {
    if (this.pCount >= Math.min(this.pMax, this.budget() * 2)) return;
    const i = this.pCount++;
    const d = this.pData;
    d[i * 8] = x; d[i * 8 + 1] = y; d[i * 8 + 2] = z;
    d[i * 8 + 3] = vx; d[i * 8 + 4] = vy; d[i * 8 + 5] = vz;
    d[i * 8 + 6] = life; d[i * 8 + 7] = life;
    const c = new THREE.Color(color);
    this.pCol[i * 3] = c.r; this.pCol[i * 3 + 1] = c.g; this.pCol[i * 3 + 2] = c.b;
    this.pSize[i] = size;
  }

  _updateParticles(dt) {
    const d = this.pData;
    let n = this.pCount;
    for (let i = 0; i < n; i++) {
      d[i * 8 + 6] -= dt;
      if (d[i * 8 + 6] <= 0) {
        n--;
        for (let k = 0; k < 8; k++) d[i * 8 + k] = d[n * 8 + k];
        this.pCol.copyWithin(i * 3, n * 3, n * 3 + 3);
        this.pSize[i] = this.pSize[n];
        i--;
        continue;
      }
      d[i * 8 + 4] -= 6.5 * dt;           // gravity
      d[i * 8] += d[i * 8 + 3] * dt;
      d[i * 8 + 1] += d[i * 8 + 4] * dt;
      d[i * 8 + 2] += d[i * 8 + 5] * dt;
      this.pPos[i * 3] = d[i * 8];
      this.pPos[i * 3 + 1] = d[i * 8 + 1];
      this.pPos[i * 3 + 2] = d[i * 8 + 2];
    }
    this.pCount = n;
    this.pGeo.setDrawRange(0, n);
    this.pGeo.attributes.position.needsUpdate = true;
    this.pGeo.attributes.color.needsUpdate = true;
    this.pGeo.attributes.size.needsUpdate = true;
  }

  // ---------------- tracers ----------------
  _initTracers() {
    this.tracers = [];
    const mat = new THREE.LineBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 24; i++) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const line = new THREE.Line(g, mat.clone());
      line.visible = false;
      line.frustumCulled = false;
      this.group.add(line);
      this.tracers.push({ line, t: 0 });
    }
  }

  tracer(from, to) {
    const tr = this.tracers.find((t) => t.t <= 0);
    if (!tr) return;
    const p = tr.line.geometry.attributes.position;
    p.setXYZ(0, from.x, from.y, from.z);
    p.setXYZ(1, to.x, to.y, to.z);
    p.needsUpdate = true;
    tr.line.visible = true;
    tr.line.material.opacity = 0.8;
    tr.t = 0.07;
  }

  _updateTracers(dt) {
    for (const t of this.tracers) {
      if (t.t <= 0) continue;
      t.t -= dt;
      t.line.material.opacity = Math.max(0, t.t / 0.07) * 0.8;
      if (t.t <= 0) t.line.visible = false;
    }
  }

  // ---------------- decals ----------------
  _initDecals() {
    const MAX = 160;
    this.decalMax = MAX;
    this.decalIdx = 0;
    this.decals = [];
    const geo = new THREE.PlaneGeometry(0.09, 0.09);
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(20,18,16,0.95)');
    grad.addColorStop(0.55, 'rgba(30,28,24,0.6)');
    grad.addColorStop(1, 'rgba(30,28,24,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    for (let i = 0; i < MAX; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      this.group.add(m);
      this.decals.push(m);
    }
  }

  decal(point, normal, scale = 1) {
    const m = this.decals[this.decalIdx % this.decalMax];
    this.decalIdx++;
    m.position.set(point.x + normal.x * 0.006, point.y + normal.y * 0.006, point.z + normal.z * 0.006);
    m.lookAt(point.x + normal.x, point.y + normal.y, point.z + normal.z);
    m.scale.setScalar(scale * (0.8 + Math.random() * 0.5));
    m.rotation.z = Math.random() * Math.PI * 2;
    m.visible = true;
  }

  clearDecals() { for (const d of this.decals) d.visible = false; }

  // ---------------- shells ----------------
  _initShells() {
    this.shells = [];
    const geo = new THREE.CylinderGeometry(0.006, 0.006, 0.026, 5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xc8a648, metalness: 0.85, roughness: 0.35 });
    for (let i = 0; i < 30; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      this.group.add(m);
      this.shells.push({ mesh: m, t: 0, vel: new THREE.Vector3(), rot: new THREE.Vector3() });
    }
    this.shellIdx = 0;
  }

  shellEject(pos, rightDir) {
    const s = this.shells[this.shellIdx % this.shells.length];
    this.shellIdx++;
    s.mesh.position.set(pos.x, pos.y, pos.z);
    s.mesh.visible = true;
    s.t = 1.4;
    const r = this.game.rng;
    s.vel.set(
      rightDir.x * (1.6 + r.next()) + (r.next() - 0.5),
      1.8 + r.next() * 0.8,
      rightDir.z * (1.6 + r.next()) + (r.next() - 0.5));
    s.rot.set(r.next() * 10, r.next() * 10, r.next() * 10);
  }

  _updateShells(dt) {
    for (const s of this.shells) {
      if (s.t <= 0) continue;
      s.t -= dt;
      s.vel.y -= 12 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.rotation.x += s.rot.x * dt;
      s.mesh.rotation.z += s.rot.z * dt;
      if (s.mesh.position.y < 0.02 && s.vel.y < 0) {
        s.vel.y *= -0.35;
        s.vel.x *= 0.5; s.vel.z *= 0.5;
        if (Math.abs(s.vel.y) < 0.4) { s.vel.set(0, 0, 0); s.rot.set(0, 0, 0); }
        bus.emit('shell-drop', { pos: s.mesh.position });
      }
      if (s.t <= 0) s.mesh.visible = false;
    }
  }

  // ---------------- muzzle flash light ----------------
  _initFlashLight() {
    this.flashLight = new THREE.PointLight(0xffc878, 0, 7, 2);
    this.group.add(this.flashLight);
    this.flashT = 0;
  }

  muzzleFlash(pos, dir) {
    this.flashLight.position.set(pos.x + dir.x * 0.5, pos.y + dir.y * 0.5, pos.z + dir.z * 0.5);
    this.flashLight.intensity = 26;
    this.flashT = 0.045;
    const r = this.game.rng;
    for (let i = 0; i < 5; i++) {
      this.spawnParticle(
        pos.x + dir.x * 0.55, pos.y + dir.y * 0.55, pos.z + dir.z * 0.55,
        dir.x * 3 + (r.next() - 0.5) * 2, dir.y * 3 + (r.next() - 0.5) * 2 + 1, dir.z * 3 + (r.next() - 0.5) * 2,
        0.12 + r.next() * 0.08, i < 2 ? 0xffe4a8 : 0x8a8a8a, i < 2 ? 0.045 : 0.03);
    }
  }

  // ---------------- impacts ----------------
  impact(point, normal, material, opts = {}) {
    const color = IMPACT_COLORS[material] || 0xb8b2a6;
    const r = this.game.rng;
    const n = material === 'flesh' ? (settings.get('reducedBlood') ? 2 : 7) : 8;
    for (let i = 0; i < n; i++) {
      this.spawnParticle(
        point.x + normal.x * 0.02, point.y + normal.y * 0.02, point.z + normal.z * 0.02,
        normal.x * (1 + r.next() * 2.4) + (r.next() - 0.5) * 2.2,
        normal.y * (1 + r.next() * 2.4) + r.next() * 2.2,
        normal.z * (1 + r.next() * 2.4) + (r.next() - 0.5) * 2.2,
        0.22 + r.next() * 0.3, color, material === 'metal' ? 0.02 : 0.032);
    }
    if (material === 'metal') {
      for (let i = 0; i < 4; i++) {
        this.spawnParticle(point.x, point.y, point.z,
          (r.next() - 0.5) * 5, r.next() * 3.5, (r.next() - 0.5) * 5,
          0.3, 0xffd98c, 0.016);
      }
    }
    if (material !== 'flesh' && !opts.noDecal) this.decal(point, normal, material === 'glass' ? 0.6 : 1);
    bus.emit('impact', { point, material });
  }

  glassShatter(point, dir, size) {
    const r = this.game.rng;
    const n = 26;
    for (let i = 0; i < n; i++) {
      this.spawnParticle(
        point.x, point.y + (r.next() - 0.5) * (size?.h || 1) * 0.5, point.z,
        (r.next() - 0.5) * 3.5, r.next() * 1.4 - 0.4, (r.next() - 0.5) * 3.5,
        0.5 + r.next() * 0.5, 0xd8ecf4, 0.03);
    }
  }

  bloodPuff(point, dirFrom) {
    if (settings.get('reducedBlood')) return;
    this.impact(point, { x: -dirFrom.x, y: 0.4, z: -dirFrom.z }, 'flesh', { noDecal: true });
  }

  // ---------------- smoke volumes ----------------
  smokeVolume(pos) {
    const group = new THREE.Group();
    const mat = new THREE.SpriteMaterial({
      color: 0xc4c9cc, transparent: true, opacity: 0.0, depthWrite: false,
    });
    const sprites = [];
    const r = this.game.rng;
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(mat.clone());
      s.position.set(pos.x + (r.next() - 0.5) * 2.4, pos.y + 0.4 + r.next() * 1.6, pos.z + (r.next() - 0.5) * 2.4);
      s.scale.setScalar(0.5);
      sprites.push(s);
      group.add(s);
    }
    this.group.add(group);
    const smoke = { group, sprites, t: 0, dur: 14, pos: { ...pos }, radius: 2.6 };
    this.smokes.push(smoke);
    return smoke;
  }

  _updateSmokes(dt) {
    for (const s of this.smokes) {
      s.t += dt;
      const grow = Math.min(1, s.t / 1.4);
      const fade = s.t > s.dur - 3 ? Math.max(0, (s.dur - s.t) / 3) : 1;
      for (const sp of s.sprites) {
        sp.scale.setScalar(0.5 + grow * 2.6);
        sp.material.opacity = 0.82 * grow * fade;
      }
      if (s.t >= s.dur) {
        this.group.remove(s.group);
        s.dead = true;
      }
    }
    this.smokes = this.smokes.filter((s) => !s.dead);
  }

  // active smoke spheres for AI vision blocking
  smokeZones() {
    return this.smokes.filter((s) => s.t > 0.7 && s.t < s.dur - 1.5)
      .map((s) => ({ x: s.pos.x, y: s.pos.y + 1, z: s.pos.z, r: s.radius }));
  }

  reset() {
    this.pCount = 0;
    this.pGeo.setDrawRange(0, 0);
    this.clearDecals();
    for (const s of this.shells) { s.t = 0; s.mesh.visible = false; }
    for (const s of this.smokes) this.group.remove(s.group);
    this.smokes = [];
    for (const t of this.tracers) { t.t = 0; t.line.visible = false; }
    this.flashLight.intensity = 0;
  }

  update(dt) {
    this._updateParticles(dt);
    this._updateTracers(dt);
    this._updateShells(dt);
    this._updateSmokes(dt);
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this.flashLight.intensity = 0;
    }
  }
}
