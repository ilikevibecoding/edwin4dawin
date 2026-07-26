import * as THREE from 'three';
import { smokeSprite, fireSprite, muzzleSprite, tex } from '../world/textures.js';

/**
 * GPU-billboarded particle pools (one draw call per pool) + debris bodies +
 * a small point-light pool. All game effects are composed from these.
 */

const BILLBOARD_VERT = /* glsl */`
  attribute vec3 aCenter;
  attribute float aSize;
  attribute float aRot;
  attribute vec4 aColor;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vFog;
  uniform float uFogDensity;
  void main() {
    vUv = uv;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(aCenter, 1.0);
    float c = cos(aRot), s = sin(aRot);
    vec2 corner = vec2(position.x * c - position.y * s, position.x * s + position.y * c) * aSize;
    mv.xy += corner;
    float dist = length(mv.xyz);
    vFog = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
    gl_Position = projectionMatrix * mv;
  }
`;

const BILLBOARD_FRAG = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3 uFogColor;
  uniform float uAdditive;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vFog;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    vec3 col = t.rgb * vColor.rgb;
    float a = t.a * vColor.a;
    if (uAdditive > 0.5) {
      a *= (1.0 - vFog);
    } else {
      col = mix(col, uFogColor, vFog);
    }
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, a);
  }
`;

export class ParticlePool {
  constructor(scene, spriteCanvas, { capacity = 256, additive = false, fogDensity = 0.0062, fogColor = 0xc9b490 } = {}) {
    this.capacity = capacity;
    this.particles = [];
    this.free = [];
    for (let i = 0; i < capacity; i++) this.free.push(i);
    this.data = new Array(capacity).fill(null);

    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.attributes.position = base.attributes.position;
    geo.attributes.uv = base.attributes.uv;
    this.aCenter = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage);
    this.aRot = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage);
    this.aColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aCenter', this.aCenter);
    geo.setAttribute('aSize', this.aSize);
    geo.setAttribute('aRot', this.aRot);
    geo.setAttribute('aColor', this.aColor);
    geo.instanceCount = 0;

    const map = tex(spriteCanvas);
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    const mat = new THREE.ShaderMaterial({
      vertexShader: BILLBOARD_VERT,
      fragmentShader: BILLBOARD_FRAG,
      uniforms: {
        uMap: { value: map },
        uFogColor: { value: new THREE.Color(fogColor) },
        uFogDensity: { value: fogDensity },
        uAdditive: { value: additive ? 1 : 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 12 : 11;
    scene.add(this.mesh);
    this.geo = geo;
  }

  /**
   * Spawn a particle.
   * o: { pos, vel, grav, drag, life, size0, size1, rot, rotVel,
   *      color0, color1, alpha0, alpha1, fadeIn }
   */
  spawn(o) {
    if (!this.free.length) return;
    const i = this.free.pop();
    this.data[i] = {
      age: 0,
      pos: o.pos.clone(),
      vel: o.vel ? o.vel.clone() : new THREE.Vector3(),
      grav: o.grav ?? 0,
      drag: o.drag ?? 0,
      life: o.life ?? 1,
      size0: o.size0 ?? 1, size1: o.size1 ?? o.size0 ?? 1,
      rot: o.rot ?? Math.random() * Math.PI * 2,
      rotVel: o.rotVel ?? 0,
      color0: o.color0 ?? new THREE.Color(1, 1, 1),
      color1: o.color1 ?? o.color0 ?? new THREE.Color(1, 1, 1),
      alpha0: o.alpha0 ?? 1, alpha1: o.alpha1 ?? 0,
      fadeIn: o.fadeIn ?? 0.06,
    };
  }

  update(dt) {
    let n = 0;
    const c = new THREE.Color();
    for (let i = 0; i < this.capacity; i++) {
      const p = this.data[i];
      if (!p) continue;
      p.age += dt;
      if (p.age >= p.life) { this.data[i] = null; this.free.push(i); continue; }
      const t = p.age / p.life;
      p.vel.y -= p.grav * dt;
      if (p.drag) p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.pos.addScaledVector(p.vel, dt);
      p.rot += p.rotVel * dt;

      this.aCenter.setXYZ(n, p.pos.x, p.pos.y, p.pos.z);
      this.aSize.setX(n, p.size0 + (p.size1 - p.size0) * t);
      this.aRot.setX(n, p.rot);
      c.copy(p.color0).lerp(p.color1, t);
      let a = p.alpha0 + (p.alpha1 - p.alpha0) * t;
      if (p.age < p.fadeIn) a *= p.age / p.fadeIn;
      this.aColor.setXYZW(n, c.r, c.g, c.b, a);
      n++;
    }
    this.geo.instanceCount = n;
    if (n > 0) {
      this.aCenter.needsUpdate = true;
      this.aSize.needsUpdate = true;
      this.aRot.needsUpdate = true;
      this.aColor.needsUpdate = true;
    }
  }
}

/* ------------------------------- debris -------------------------------- */

export class DebrisSystem {
  constructor(scene, capacity = 90) {
    this.capacity = capacity;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6b6156, roughness: 0.95 });
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.castShadow = true;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.items = new Array(capacity).fill(null);
    this.free = [];
    for (let i = 0; i < capacity; i++) this.free.push(i);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._eu = new THREE.Euler();
    this._zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < capacity; i++) this.mesh.setMatrixAt(i, this._zero);
  }
  spawn(pos, vel, scale = 0.14, life = 3.2) {
    if (!this.free.length) return;
    const i = this.free.pop();
    this.items[i] = {
      pos: pos.clone(), vel: vel.clone(),
      rot: new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3),
      rotVel: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12),
      scale, life, age: 0,
    };
  }
  update(dt) {
    for (let i = 0; i < this.capacity; i++) {
      const d = this.items[i];
      if (!d) continue;
      d.age += dt;
      if (d.age > d.life) {
        this.items[i] = null; this.free.push(i);
        this.mesh.setMatrixAt(i, this._zero);
        continue;
      }
      d.vel.y -= 16 * dt;
      d.pos.addScaledVector(d.vel, dt);
      if (d.pos.y < d.scale / 2) {
        d.pos.y = d.scale / 2;
        d.vel.y = Math.abs(d.vel.y) * 0.3;
        d.vel.x *= 0.72; d.vel.z *= 0.72;
        if (Math.abs(d.vel.y) < 0.6) d.vel.y = 0;
      }
      d.rot.x += d.rotVel.x * dt; d.rot.y += d.rotVel.y * dt; d.rot.z += d.rotVel.z * dt;
      const fade = d.age > d.life * 0.82 ? 1 - (d.age - d.life * 0.82) / (d.life * 0.18) : 1;
      const s = d.scale * fade;
      this._q.setFromEuler(d.rot);
      this._m.compose(d.pos, this._q, new THREE.Vector3(s, s, s));
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/* ------------------------------ light pool ------------------------------ */

export class LightPool {
  constructor(scene, n = 6) {
    this.lights = [];
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xffaa44, 0, 18, 2);
      l.visible = false;
      scene.add(l);
      this.lights.push({ l, life: 0, age: 0, intensity: 0 });
    }
  }
  flash(pos, { color = 0xffaa44, intensity = 60, life = 0.25, distance = 20 } = {}) {
    let slot = this.lights.find((s) => s.age >= s.life);
    if (!slot) slot = this.lights[0];
    slot.l.position.copy(pos);
    slot.l.color.set(color);
    slot.l.distance = distance;
    slot.intensity = intensity;
    slot.life = life;
    slot.age = 0;
    slot.l.visible = true;
  }
  update(dt) {
    for (const s of this.lights) {
      if (s.age >= s.life) { s.l.visible = false; continue; }
      s.age += dt;
      const t = Math.min(1, s.age / s.life);
      s.l.intensity = s.intensity * (1 - t) * (1 - t);
      if (s.age >= s.life) s.l.visible = false;
    }
  }
}

/* --------------------------------- FX hub -------------------------------- */

export class FX {
  constructor(scene, quality = 'high') {
    this.scene = scene;
    const big = quality !== 'medium';
    this.smoke = new ParticlePool(scene, smokeSprite(128, 7), { capacity: big ? 460 : 240 });
    this.fire = new ParticlePool(scene, fireSprite(128, 9), { capacity: 200, additive: true });
    this.flash = new ParticlePool(scene, muzzleSprite(128), { capacity: 60, additive: true });
    this.debris = new DebrisSystem(scene, big ? 100 : 50);
    this.lights = new LightPool(scene, 6);
    this.columns = []; // lingering smoke emitters
    this.onShake = null;
    this._v = new THREE.Vector3();
  }

  update(dt, t) {
    this.smoke.update(dt);
    this.fire.update(dt);
    this.flash.update(dt);
    this.debris.update(dt);
    this.lights.update(dt);
    for (let i = this.columns.length - 1; i >= 0; i--) {
      const c = this.columns[i];
      c.next -= dt;
      c.remaining -= dt;
      if (c.remaining <= 0) { this.columns.splice(i, 1); continue; }
      if (c.next <= 0) {
        c.next = 0.12 + Math.random() * 0.08;
        const k = Math.min(1, c.remaining / c.total + 0.25);
        this.smoke.spawn({
          pos: c.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.8, 0.5, (Math.random() - 0.5) * 1.8)),
          vel: new THREE.Vector3(0.6 + Math.random() * 0.5, 2.8 + Math.random() * 1.6, (Math.random() - 0.5) * 0.4),
          life: 5.5 + Math.random() * 3,
          size0: 1.8, size1: 9 + Math.random() * 5,
          color0: new THREE.Color(0.14, 0.13, 0.12), color1: new THREE.Color(0.42, 0.4, 0.38),
          alpha0: 0.7 * k, alpha1: 0, rotVel: (Math.random() - 0.5) * 0.5, fadeIn: 0.4,
        });
      }
    }
  }

  /* -------- shots & impacts -------- */

  impactWall(pos, normal) {
    // Sparks
    for (let i = 0; i < 5; i++) {
      const v = normal.clone().multiplyScalar(2 + Math.random() * 4);
      v.x += (Math.random() - 0.5) * 4; v.y += Math.random() * 3.5; v.z += (Math.random() - 0.5) * 4;
      this.fire.spawn({
        pos: pos.clone(), vel: v, grav: 14, life: 0.16 + Math.random() * 0.22,
        size0: 0.055, size1: 0.015,
        color0: new THREE.Color(1, 0.85, 0.5), color1: new THREE.Color(1, 0.4, 0.1),
        alpha0: 1, alpha1: 0, fadeIn: 0,
      });
    }
    // Dust puff
    for (let i = 0; i < 3; i++) {
      this.smoke.spawn({
        pos: pos.clone().addScaledVector(normal, 0.05),
        vel: normal.clone().multiplyScalar(0.9 + Math.random()).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.5, (Math.random() - 0.5) * 0.8)),
        life: 0.6 + Math.random() * 0.5, size0: 0.14, size1: 0.75 + Math.random() * 0.4,
        color0: new THREE.Color(0.62, 0.56, 0.47), color1: new THREE.Color(0.55, 0.5, 0.42),
        alpha0: 0.65, alpha1: 0, drag: 2.2, fadeIn: 0,
      });
    }
  }

  impactDirt(pos) {
    for (let i = 0; i < 4; i++) {
      this.smoke.spawn({
        pos: pos.clone(),
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.4, 1.6 + Math.random() * 1.6, (Math.random() - 0.5) * 1.4),
        life: 0.7 + Math.random() * 0.5, size0: 0.18, size1: 0.9,
        color0: new THREE.Color(0.66, 0.58, 0.45), color1: new THREE.Color(0.6, 0.53, 0.42),
        alpha0: 0.7, alpha1: 0, drag: 1.6, grav: 1.2, fadeIn: 0,
      });
    }
  }

  bloodPuff(pos, dir) {
    for (let i = 0; i < 5; i++) {
      this.smoke.spawn({
        pos: pos.clone(),
        vel: dir.clone().multiplyScalar(1 + Math.random() * 1.6).add(new THREE.Vector3((Math.random() - 0.5) * 1.6, Math.random() * 1.2, (Math.random() - 0.5) * 1.6)),
        life: 0.35 + Math.random() * 0.3, size0: 0.1, size1: 0.5,
        color0: new THREE.Color(0.36, 0.04, 0.03), color1: new THREE.Color(0.22, 0.03, 0.02),
        alpha0: 0.8, alpha1: 0, grav: 3, fadeIn: 0,
      });
    }
  }

  muzzle(pos, dir) {
    this.flash.spawn({
      pos: pos.clone(), life: 0.055, size0: 0.36 + Math.random() * 0.18, size1: 0.26,
      alpha0: 1, alpha1: 0.4, fadeIn: 0, rot: Math.random() * 6.3,
    });
    this.lights.flash(pos, { color: 0xffbb66, intensity: 26, life: 0.06, distance: 11 });
    // Smoke wisp
    this.smoke.spawn({
      pos: pos.clone().addScaledVector(dir, 0.15),
      vel: dir.clone().multiplyScalar(1.1).add(new THREE.Vector3(0, 0.7, 0)),
      life: 0.7, size0: 0.1, size1: 0.55,
      color0: new THREE.Color(0.55, 0.53, 0.5), color1: new THREE.Color(0.5, 0.48, 0.46),
      alpha0: 0.32, alpha1: 0, drag: 2.4, fadeIn: 0,
    });
  }

  addSmokeColumn(pos, duration = 26) {
    this.columns.push({ pos: pos.clone(), remaining: duration, total: duration, next: 0 });
  }
}
