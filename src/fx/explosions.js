import * as THREE from 'three';
import { makeRNG } from '../core/utils.js';

const rng = makeRNG(60606);

// ===========================================================================
// Explosion effect — AAA anatomy, all scaled by `size`:
//  0-80ms   blinding core flash + expanding ground shockwave ring (mesh)
//  80-400ms roiling fireball: many overlapping puffs, white-hot -> orange ->
//           smoldering dark, buoyant; ember streaks w/ gravity + smoke trails
//  0.4-4s   dense black-grey pillar rising (staged emission, sun-side lit)
//  0-1s     ground dust ring racing outward (stretched streaks + puffs)
//  ~10s     lingering ground haze
// Plus: pooled point light (two-phase decay), scorch decal, camera shake,
// radial damage, danger-close dust kicked past the player camera.
// ===========================================================================

function ringTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  g.addColorStop(0.0, 'rgba(255,255,255,0)');
  g.addColorStop(0.62, 'rgba(255,255,255,0)');
  g.addColorStop(0.78, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.88, 'rgba(255,255,255,1)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

// Fresnel-rim shockwave dome: bright expanding shell edge, readable from
// eye level (unlike the flat ground ring which is edge-on at distance).
const domeVert = /* glsl */`
  varying float vRim;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vec3 v = normalize(-mv.xyz);
    vRim = pow(1.0 - abs(dot(n, v)), 2.6);
    gl_Position = projectionMatrix * mv;
  }
`;
const domeFrag = /* glsl */`
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vRim;
  void main() {
    gl_FragColor = vec4(uColor * vRim, vRim * uOpacity);
    if (gl_FragColor.a < 0.004) discard;
  }
`;

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();

const COL = {
  flashCore: new THREE.Color(1, 0.97, 0.86).multiplyScalar(11),
  flashWarm: new THREE.Color(1, 0.66, 0.26).multiplyScalar(5),
  flashTail: new THREE.Color(0.9, 0.32, 0.07).multiplyScalar(2.2),
  fire0: new THREE.Color(1, 0.94, 0.72).multiplyScalar(6.5),
  fireMid: new THREE.Color(1, 0.42, 0.1).multiplyScalar(3.1),
  fire1: new THREE.Color(0.3, 0.08, 0.02),
  darken0: new THREE.Color(0.4, 0.19, 0.07),
  darkenMid: new THREE.Color(0.15, 0.1, 0.07),
  darken1: new THREE.Color(0.085, 0.08, 0.075),
  ember0: new THREE.Color(1, 0.82, 0.42).multiplyScalar(6),
  emberMid: new THREE.Color(1, 0.42, 0.1).multiplyScalar(3),
  ember1: new THREE.Color(0.5, 0.11, 0.02),
  pillar0: new THREE.Color(0.125, 0.115, 0.105),
  pillar1: new THREE.Color(0.32, 0.3, 0.28),
  dust0: new THREE.Color(0.52, 0.44, 0.34),
  dust1: new THREE.Color(0.37, 0.33, 0.27),
  haze0: new THREE.Color(0.31, 0.28, 0.23),
  haze1: new THREE.Color(0.4, 0.37, 0.32),
  trailSmoke0: new THREE.Color(0.3, 0.28, 0.26),
  trailSmoke1: new THREE.Color(0.22, 0.21, 0.2),
  trailHead: new THREE.Color(1, 0.6, 0.22).multiplyScalar(4),
  lickFire0: new THREE.Color(1, 0.55, 0.14).multiplyScalar(3.4),
  lickFire1: new THREE.Color(0.55, 0.13, 0.03),
};

const MAX_TRAILERS = 48;

export class ExplosionFX {
  constructor(scene, particles, impacts, player, audio) {
    this.scene = scene;
    this.particles = particles;
    this.impacts = impacts;
    this.player = player;
    this.audio = audio;
    this.enemyManager = null; // wired in main

    // --- pooled flash lights, two-phase decay ---
    this.lights = [];
    for (let i = 0; i < 8; i++) {
      const l = new THREE.PointLight(0xffa04d, 0, 40, 1.8);
      scene.add(l);
      this.lights.push({ light: l, t: 99 });
    }

    // --- pooled ground shockwave rings ---
    this.rings = [];
    const ringTex = ringTexture();
    const ringGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: ringTex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(1, 0.82, 0.55).multiplyScalar(2.4),
      });
      const m = new THREE.Mesh(ringGeo, mat);
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.renderOrder = 21;
      scene.add(m);
      this.rings.push({ mesh: m, t: 99, dur: 0.5, R: 10 });
    }

    // --- pooled shockwave domes ---
    this.domes = [];
    const domeGeo = new THREE.SphereGeometry(1, 20, 12);
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(1.6, 1.35, 1.05) },
          uOpacity: { value: 0 },
        },
        vertexShader: domeVert,
        fragmentShader: domeFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const m = new THREE.Mesh(domeGeo, mat);
      m.visible = false;
      m.renderOrder = 22;
      scene.add(m);
      this.domes.push({ mesh: m, t: 99, dur: 0.42, R: 9 });
    }

    // --- staged pillar bursts + ember trailers ---
    this.bursts = [];
    this.trailers = [];
  }

  // ----- staged smoke pillar wave -----
  emitPillar(pos, s, k) {
    const p = this.particles;
    _v.copy(pos); _v.y += (1.6 + k * 5.5) * s;
    p.emit({
      pos: _v, count: k < 0.5 ? 3 : 2, vel: _v2.set(0, 4.5 * s, 0), spread: 0.7 * s, spreadY: 0.5,
      life: [3.2 + k * 1.5, 7.5 + k * 3], size: [3.2 * s, 9.0 * s], sizeEase: 0.5,
      color0: COL.pillar0, color1: COL.pillar1,
      alpha: 0.9, gravity: -0.9, drag: 0.95, turb: 0.6,
      fadeIn: 0.14, fadeOutStart: 0.5, posJitter: 1.2 * s, spinVel: 0.65, tex: 2,
    });
    // internal fire licks near the base while young
    if (k < 0.45) {
      _v.copy(pos); _v.y += (1.1 + k * 3.4) * s;
      p.emit({
        pos: _v, count: 1, vel: _v2.set(0, 3.4 * s, 0), spread: 0.7 * s,
        life: [0.3, 0.55], size: [1.1 * s, 2.2 * s], sizeEase: 0.5,
        color0: COL.lickFire0, color1: COL.lickFire1,
        alpha: 0.9, additive: true, gravity: -3, drag: 1.6,
        fadeIn: 0.05, fadeOutStart: 0.4, posJitter: 0.9 * s, tex: 1,
      });
    }
  }

  explode(pos, { size = 1, damage = 120, radius = 9 } = {}) {
    const p = this.particles;
    const s = size;

    // ---- 1. Core flash: blinding 2-frame pop + warm halo ----
    _v.copy(pos); _v.y += 1.2 * s;
    p.emit({
      pos: _v, count: 2, vel: _v2.set(0, 1, 0), spread: 0.4,
      life: [0.06, 0.1], size: [5 * s, 9.5 * s],
      color0: COL.flashCore, color1: COL.flashWarm,
      alpha: 1, additive: true, fadeIn: 0.001, fadeOutStart: 0.25, tex: 0,
    });
    p.emit({
      pos: _v, count: 1, vel: _v2.set(0, 1.5, 0), spread: 0.3,
      life: [0.15, 0.2], size: [3.5 * s, 10 * s], sizeEase: 0.5,
      color0: COL.flashWarm, color1: COL.flashTail,
      alpha: 0.9, additive: true, fadeIn: 0.01, fadeOutStart: 0.3, tex: 1,
    });

    // ---- 2. Shockwave: ground ring mesh + fresnel dome shell ----
    if (pos.y < 2.5) {
      const slot = this.rings.reduce((a, b) => (a.t > b.t ? a : b));
      slot.t = 0;
      slot.dur = 0.55;
      slot.R = 13 * s;
      slot.mesh.position.set(pos.x, 0.07 + rng() * 0.03, pos.z);
      slot.mesh.visible = true;
    }
    {
      const slot = this.domes.reduce((a, b) => (a.t > b.t ? a : b));
      slot.t = 0;
      slot.dur = 0.42;
      slot.R = 9.5 * s;
      slot.mesh.position.copy(pos).setY(pos.y + 0.6);
      slot.mesh.visible = true;
    }

    // ---- 3. Roiling fireball: shell + core column, hot -> dark ramp ----
    _v.copy(pos); _v.y += 1.3 * s;
    p.emit({
      pos: _v, count: 15, sphere: [2.6 * s, 6.2 * s], vel: _v2.set(0, 2.8 * s, 0),
      life: [0.45, 1.0], size: [2.4 * s, 5.2 * s], sizeEase: 0.42,
      color0: COL.fire0, colorMid: COL.fireMid, midT: 0.22, color1: COL.fire1,
      alpha: 0.95, additive: true, gravity: -3.5, drag: 2.4,
      fadeIn: 0.015, fadeOutStart: 0.5, posJitter: 1.0 * s, spinVel: 2.2, tex: 1,
    });
    _v.copy(pos); _v.y += 0.7 * s;
    p.emit({
      pos: _v, count: 9, vel: _v2.set(0, 10 * s, 0), spread: 2.0 * s,
      life: [0.5, 1.1], size: [2.0 * s, 4.6 * s], sizeEase: 0.45,
      color0: COL.fire0, colorMid: COL.fireMid, midT: 0.22, color1: COL.fire1,
      alpha: 0.95, additive: true, gravity: -4, drag: 2.0,
      fadeIn: 0.02, fadeOutStart: 0.5, posJitter: 0.7 * s, spinVel: 1.8, tex: 1,
    });
    // fire turning to dark smoke (alpha layer riding the fireball)
    _v.copy(pos); _v.y += 1.5 * s;
    p.emit({
      pos: _v, count: 9, sphere: [1.6 * s, 3.8 * s], vel: _v2.set(0, 2.8 * s, 0),
      life: [0.8, 1.7], size: [2.2 * s, 5.2 * s], sizeEase: 0.5,
      color0: COL.darken0, colorMid: COL.darkenMid, midT: 0.3, color1: COL.darken1,
      alpha: 0.85, gravity: -2.4, drag: 1.9, turb: 0.5,
      fadeIn: 0.12, fadeOutStart: 0.42, posJitter: 0.8 * s, spinVel: 1.3, tex: 2,
    });

    // ---- 4. Ember streaks (velocity-stretched, gravity arcs) ----
    _v.copy(pos); _v.y += 0.8 * s;
    p.emit({
      pos: _v, count: 18, sphere: [7 * s, 15 * s], vel: _v2.set(0, 7 * s, 0),
      life: [0.55, 1.4], size: [0.17 * s, 0.07 * s],
      color0: COL.ember0, colorMid: COL.emberMid, midT: 0.4, color1: COL.ember1,
      alpha: 1, additive: true, gravity: 26, drag: 0.5, floor: 0.05,
      fadeOutStart: 0.75, stretch: 0.06, lenMax: 3.2 * s,
    });
    // smoldering glow lingering inside the young smoke
    _v.copy(pos); _v.y += 1.4 * s;
    p.emit({
      pos: _v, count: 4, sphere: [0.6 * s, 1.8 * s], vel: _v2.set(0, 2.2 * s, 0),
      life: [1.1, 2.0], size: [1.6 * s, 2.9 * s], sizeEase: 0.5,
      color0: new THREE.Color(0.95, 0.32, 0.08).multiplyScalar(1.7),
      color1: new THREE.Color(0.22, 0.05, 0.01),
      alpha: 0.85, additive: true, gravity: -1.6, drag: 1.4,
      fadeIn: 0.1, fadeOutStart: 0.35, posJitter: 0.8 * s, spinVel: 1.0, tex: 1,
    });
    // ember trailers with smoke trails (simulated in update)
    for (let i = 0; i < 4 && this.trailers.length < MAX_TRAILERS; i++) {
      const a = rng() * Math.PI * 2;
      const hs = (3.5 + rng() * 5) * s;
      this.trailers.push({
        pos: pos.clone().add(new THREE.Vector3(0, 0.9 * s, 0)),
        vel: new THREE.Vector3(Math.cos(a) * hs, (8 + rng() * 7) * s, Math.sin(a) * hs),
        age: 0, life: 0.9 + rng() * 0.6, acc: 0,
      });
    }

    // ---- 5. Ground dust ring racing outward ----
    _v.copy(pos); _v.y += 0.5;
    p.emit({
      pos: _v, count: 12, radial: [11 * s, 17 * s], vel: _v2.set(0, 1.4, 0), spread: 0.5,
      life: [0.7, 1.5], size: [1.7 * s, 4.2 * s], sizeEase: 0.55,
      color0: COL.dust0, color1: COL.dust1,
      alpha: 0.62, gravity: 1.4, drag: 2.3, floor: 0.25,
      fadeIn: 0.03, fadeOutStart: 0.35, spinVel: 0.9, tex: 3,
    });
    _v.copy(pos); _v.y += 0.45;
    p.emit({
      pos: _v, count: 10, radial: [16 * s, 24 * s], vel: _v2.set(0, 0.8, 0),
      life: [0.35, 0.75], size: [0.55 * s, 0.32 * s],
      color0: COL.dust0, color1: COL.dust1,
      alpha: 0.5, gravity: 2, drag: 1.7, floor: 0.2,
      fadeOutStart: 0.4, stretch: 0.055, lenMax: 4.5 * s,
    });

    // ---- 6. Smoke pillar: first wave now, staged waves in update ----
    this.emitPillar(pos, s, 0);
    this.bursts.push({ pos: pos.clone(), s, age: 0, next: 0.12, end: 2.2 });

    // ---- 7. Lingering ground haze (10s+) ----
    _v.copy(pos); _v.y += 1.1;
    p.emit({
      pos: _v, count: 6, radial: [0.5 * s, 1.6 * s], vel: _v2.set(0, 0.35, 0),
      life: [6, 11.5], size: [3.0 * s, 8.0 * s], sizeEase: 0.6,
      color0: COL.haze0, color1: COL.haze1,
      alpha: 0.3, gravity: -0.05, drag: 0.55, turb: 0.5,
      fadeIn: 0.45, fadeOutStart: 0.45, posJitter: 3.4 * s, spinVel: 0.25, floor: 0.3, tex: 3,
    });

    // ---- Light flash (two-phase decay in update) ----
    const slot = this.lights.reduce((a, b) => (a.t > b.t ? a : b));
    slot.t = 0;
    slot.light.position.copy(pos).add(_v.set(0, 2.4 * s, 0));
    slot.light.intensity = 520 * s;
    slot.light.distance = 48 * s;

    // ---- Scorch on ground ----
    if (pos.y < 1.2) this.impacts.scorch(pos.clone().setY(0.02), size * 1.05);

    // ---- Danger close: dust kicked past the player camera ----
    const d = this.player.position.distanceTo(pos);
    if (d < 16) {
      const fx = -Math.sin(this.player.yaw), fz = -Math.cos(this.player.yaw);
      _v.set(this.player.position.x + fx * 2.4, this.player.position.y + 1.35, this.player.position.z + fz * 2.4);
      p.emit({
        pos: _v, count: 6, vel: _v2.set(-fx * 1.7, 0.5, -fz * 1.7), spread: 0.7,
        life: [0.8, 1.5], size: [1.0, 2.4], sizeEase: 0.5,
        color0: COL.dust0, color1: COL.dust1,
        alpha: 0.3, drag: 1.6, turb: 0.4,
        fadeIn: 0.06, fadeOutStart: 0.3, posJitter: 1.3, tex: 3,
      });
    }

    // ---- Camera shake / damage falloff by distance ----
    const sh = Math.max(0, 1 - d / 60);
    this.player.addShake(0.11 * sh * sh * size);

    this.enemyManager?.explosionAt(pos.clone().add(_v.set(0, 1, 0)), radius * size, damage);
    this.audio?.play('explosion', d);
  }

  update(dt) {
    // Lights: violent drop from peak, then a short smoldering glow
    for (const s of this.lights) {
      s.t += dt;
      const I = s.light.intensity;
      if (I > 0) {
        s.light.intensity = Math.max(0, I - dt * (I > 70 ? 2600 : 140));
      }
    }

    // Shockwave rings
    for (const r of this.rings) {
      if (r.t > r.dur) { if (r.mesh.visible) r.mesh.visible = false; continue; }
      r.t += dt;
      const k = Math.min(r.t / r.dur, 1);
      const e = 1 - Math.pow(1 - k, 3);
      const sc = Math.max(r.R * 2 * (0.1 + 0.9 * e), 0.01);
      r.mesh.scale.set(sc, sc, 1);
      r.mesh.material.opacity = Math.min(1, 1.8 * Math.pow(1 - k, 1.6));
    }

    // Shockwave domes
    for (const r of this.domes) {
      if (r.t > r.dur) { if (r.mesh.visible) r.mesh.visible = false; continue; }
      r.t += dt;
      const k = Math.min(r.t / r.dur, 1);
      const e = 1 - Math.pow(1 - k, 2.6);
      const sc = Math.max(r.R * (0.12 + 0.88 * e), 0.01);
      r.mesh.scale.set(sc, sc * 0.7, sc);
      r.mesh.material.uniforms.uOpacity.value = 0.72 * Math.pow(1 - k, 1.9);
    }

    // Staged pillar bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.age += dt;
      while (b.age >= b.next && b.next <= b.end) {
        this.emitPillar(b.pos, b.s, b.next / b.end);
        b.next += 0.12;
      }
      if (b.age > b.end) this.bursts.splice(i, 1);
    }

    // Ember trailers: glowing heads with little smoke trails
    for (let i = this.trailers.length - 1; i >= 0; i--) {
      const tr = this.trailers[i];
      tr.age += dt;
      tr.vel.y -= 26 * dt;
      tr.vel.multiplyScalar(Math.max(0, 1 - 0.4 * dt));
      tr.pos.addScaledVector(tr.vel, dt);
      if (tr.age > tr.life || tr.pos.y < 0.1) {
        this.trailers.splice(i, 1);
        continue;
      }
      tr.acc += dt;
      while (tr.acc >= 0.05) {
        tr.acc -= 0.05;
        this.particles.emit({
          pos: tr.pos, count: 1, spread: 0.1,
          life: [0.45, 0.8], size: [0.28, 0.85], sizeEase: 0.6,
          color0: COL.trailSmoke0, color1: COL.trailSmoke1,
          alpha: 0.55, gravity: -0.3, drag: 1.2,
          fadeIn: 0.06, fadeOutStart: 0.3, spinVel: 0.8, tex: 2,
        });
        this.particles.emit({
          pos: tr.pos, count: 1, vel: tr.vel, spread: 0,
          life: [0.09, 0.13], size: [0.34, 0.18],
          color0: COL.trailHead, color1: COL.ember1,
          alpha: 1, additive: true, drag: 8, fadeOutStart: 0.4, tex: 0,
        });
      }
    }
  }
}
