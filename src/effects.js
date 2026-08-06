/**
 * Effects coordinator.
 *
 * Owns the particle systems, trail manager, blast pools and dynamic lights, and
 * exposes gameplay-level calls ("launch this battery", "airburst here") so the
 * simulation modules never touch shaders directly.
 *
 * Everything is pooled and budgeted: the particle capacities come from the
 * quality preset, and emission rates scale with distance to camera so a far
 * away engagement costs a fraction of a close one.
 */

import * as THREE from 'three';
import { ParticleSystem } from './effects/particles.js';
import { TrailManager } from './effects/trails.js';
import {
  ShockwavePool, DebrisField, DecalPool, FlashLights, FireballPool,
} from './effects/explosions.js';
import { smokePuff, glowSprite, noiseTexture, streakSprite } from './util/textures.js';
import { hazeFactor } from './effects/aerial.js';
import { airDensity, clamp, clamp01, lerp } from './util/mathx.js';
import { QUALITY } from './config.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _c1 = new THREE.Color();

// ---------------------------------------------------------------------------
// Rocket exhaust flame (per-missile mesh)
// ---------------------------------------------------------------------------

const FLAME_VERT = /* glsl */`
  uniform float uTime;
  uniform float uThrottle;
  uniform sampler2D uNoise;
  varying vec2 vUv;
  varying float vFlicker;
  void main() {
    vUv = uv;
    // v runs 0 at the nozzle to 1 at the tail of the plume.
    float t = uv.y;
    float n = texture2D(uNoise, vec2(uv.x * 2.0, t * 0.6 - uTime * 2.2)).r;
    vFlicker = n;
    vec3 p = position;
    // Necking near the nozzle, flaring and wobbling downstream.
    float flare = mix(0.55, 1.0, smoothstep(0.0, 0.35, t));
    p.xz *= flare * (0.82 + n * 0.42);
    p.y *= uThrottle;
    p.x += sin(t * 9.0 + uTime * 24.0) * 0.035 * t;
    p.z += cos(t * 7.5 + uTime * 19.0) * 0.035 * t;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FLAME_FRAG = /* glsl */`
  uniform vec3 uHot;
  uniform vec3 uMid;
  uniform float uThrottle;
  varying vec2 vUv;
  varying float vFlicker;
  void main() {
    float t = vUv.y;
    float radial = abs(vUv.x - 0.5) * 2.0;
    float core = 1.0 - smoothstep(0.0, 0.75, radial);
    float along = (1.0 - smoothstep(0.05, 1.0, t));
    float a = core * along * (0.55 + vFlicker * 0.75) * uThrottle;
    // Mach-diamond flicker in the first third of the plume.
    float diamonds = 0.55 + 0.45 * sin(t * 42.0 - vFlicker * 4.0);
    a *= mix(1.0, diamonds, 1.0 - smoothstep(0.0, 0.32, t));
    if (a < 0.01) discard;
    vec3 col = mix(uHot, uMid, smoothstep(0.0, 0.55, t) * (0.6 + vFlicker * 0.6));
    gl_FragColor = vec4(col * (1.2 + core), clamp(a, 0.0, 1.0));
  }
`;

let flameGeo = null;
export function makeFlame(radius = 0.35, length = 4, colours = {}) {
  if (!flameGeo) {
    flameGeo = new THREE.CylinderGeometry(1, 0.12, 1, 14, 6, true);
    // Origin at the nozzle, plume extending toward -Y.
    flameGeo.translate(0, -0.5, 0);
  }
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uThrottle: { value: 1 },
      uNoise: { value: noiseTexture(128, 23) },
      uHot: { value: new THREE.Color(colours.hot ?? 0xfff6e0) },
      uMid: { value: new THREE.Color(colours.mid ?? 0xff8a2e) },
    },
    vertexShader: FLAME_VERT, fragmentShader: FLAME_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(flameGeo, mat);
  mesh.scale.set(radius, length, radius);
  mesh.frustumCulled = false;
  mesh.userData.baseScale = new THREE.Vector3(radius, length, radius);
  return mesh;
}

// ---------------------------------------------------------------------------

export class Effects {
  constructor(scene, camera, qualityId = 'high') {
    this.scene = scene;
    this.camera = camera;
    this.q = QUALITY[qualityId] ?? QUALITY.high;
    const budget = this.q.particleBudget;

    this.smoke = new ParticleSystem({
      kind: 'smoke', capacity: Math.round(budget * 0.62),
      texture: smokePuff(128, 3), turbulence: 0.55, softness: 0.78,
    });
    this.dust = new ParticleSystem({
      kind: 'smoke', capacity: Math.round(budget * 0.2),
      texture: smokePuff(128, 8), turbulence: 0.8, softness: 0.85,
    });
    this.hot = new ParticleSystem({
      kind: 'hot', capacity: Math.round(budget * 0.18),
      texture: glowSprite(128, 2.2), turbulence: 0.35,
    });
    this.sparks = new ParticleSystem({
      kind: 'hot', capacity: Math.round(budget * 0.16),
      texture: glowSprite(64, 1.6), turbulence: 0.1,
    });
    for (const ps of [this.smoke, this.dust, this.hot, this.sparks]) scene.add(ps.mesh);

    this.trails = new TrailManager(scene, { capacity: 20, segments: this.q.trailSegments });
    this.shock = new ShockwavePool(scene, 10);
    this.fire = new FireballPool(scene, 9);
    this.debris = new DebrisField(scene, this.q.id === 'low' ? 110 : 240);
    this.decals = new DecalPool(scene, 28);
    this.lights = new FlashLights(scene, this.q.id === 'low' ? 2 : 4);

    // Screen-space glare billboards for launches seen from a distance.
    this.glareGroup = new THREE.Group();
    scene.add(this.glareGroup);
    this.glares = [];
    const streak = streakSprite(256, 32);
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.SpriteMaterial({
        map: streak, color: 0xffe0b0, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
        opacity: 0,
      });
      const s = new THREE.Sprite(mat);
      s.visible = false;
      s.renderOrder = 30;
      this.glareGroup.add(s);
      this.glares.push({ sprite: s, mat, t: 0, life: 1, peak: 0, scale: 1 });
    }

    this._lightDirView = new THREE.Vector3(0, 0, 1);
    this._lightColour = new THREE.Color(0xffffff);
    this._shadowColour = new THREE.Color(0x33404f);
    this._sunDir = new THREE.Vector3(0, 1, 0);
    this._haze = {
      colour: new THREE.Color(0xa8c0d6),
      density: 0.00008,
      scaleHeight: 2400,
      curve: 0.55,
      camPos: this.camera.position,
    };
    this.shakeImpulse = 0;
    this.reducedMotion = false;
    this.time = 0;
  }

  /** Weather pushes the current atmosphere here; particles/trails read it. */
  setHaze({ colour, density, scaleHeight, curve }) {
    if (colour) this._haze.colour.copy(colour);
    if (density !== undefined) this._haze.density = density;
    if (scaleHeight !== undefined) this._haze.scaleHeight = scaleHeight;
    if (curve !== undefined) this._haze.curve = curve;
    this._pushHaze();
  }

  _pushHaze() {
    const h = this._haze;
    h.camPos = this.camera.position;
    this.smoke.setHaze(h);
    this.dust.setHaze(h);
    this.hot.setHaze(h);
    this.sparks.setHaze(h);
    this.trails.setHaze(h);
  }

  // ---------------------------------------------------------------- lighting

  /** Called by the weather system whenever the light preset changes. */
  setLighting(sunDirWorld, lightColour, shadowColour) {
    this._sunDir.copy(sunDirWorld);
    this._lightColour.copy(lightColour);
    this._shadowColour.copy(shadowColour);
    this.trails.setLighting(lightColour);
  }

  // ------------------------------------------------------------------ update

  update(dt, viewportHeight) {
    this.time += dt;
    // Light direction in view space for the lit-smoke approximation.
    this._lightDirView.copy(this._sunDir)
      .transformDirection(this.camera.matrixWorldInverse);
    for (const ps of [this.smoke, this.dust]) {
      ps.setLighting(this._lightDirView, this._lightColour, this._shadowColour);
    }
    this._pushHaze();
    this.smoke.update(dt);
    this.dust.update(dt);
    this.hot.update(dt);
    this.sparks.update(dt);
    this.trails.update(dt, this.camera, viewportHeight);
    this.shock.update(dt);
    this.fire.update(dt);
    this.decals.update(dt);
    this.lights.update(dt);
    this.debris.update(dt, (pos, vel) => {
      this.smoke.emit(pos, _v1.set(vel.x * 0.3, vel.y * 0.3 + 1.4, vel.z * 0.3), {
        life: 1.5 + Math.random(), sizeStart: 0.5, sizeEnd: 3.4,
        color: 0x6d6a63, opacity: 0.42, drag: 1.4, gravity: 0.7,
      });
    });

    for (const g of this.glares) {
      if (!g.sprite.visible) continue;
      g.t += dt;
      const k = g.t / g.life;
      if (k >= 1) { g.sprite.visible = false; g.mat.opacity = 0; continue; }
      const env = k < 0.06 ? k / 0.06 : Math.pow(1 - (k - 0.06) / 0.94, 2.2);
      g.mat.opacity = g.peak * env;
      const s = g.scale * (0.6 + env * 0.8);
      g.sprite.scale.set(s, s * 0.14, 1);
    }

    this.shakeImpulse = Math.max(0, this.shakeImpulse - dt * 2.2);
  }

  /**
   * How much haze sits between the camera and a world point (0..1).
   * Missile marker glows use this instead of scene fog: at 40 km the standard
   * distance fog would erase them entirely, even though a real contrail at
   * altitude is perfectly visible from the ground.
   */
  hazeAt(worldPos) {
    const h = this._haze;
    return hazeFactor(this.camera.position, worldPos, h.density, h.scaleHeight, h.curve);
  }

  /** Distance-based emission scale: far events emit fewer, larger particles. */
  _lod(pos) {
    const d = this.camera.position.distanceTo(pos);
    if (d < 300) return 1;
    if (d < 1500) return 0.65;
    if (d < 6000) return 0.35;
    return 0.16;
  }

  // ------------------------------------------------------------- trails

  acquireTrail(style) { return this.trails.acquire(style); }
  followTrail(r, pos, minStep) { this.trails.follow(r, pos, minStep); }
  retireTrail(r) { this.trails.retire(r); }

  // ------------------------------------------------------------- exhaust

  /**
   * Continuous rocket exhaust. Emission thins with altitude so a missile high
   * up leaves a wispy contrail instead of a dense column.
   */
  exhaust(pos, vel, dt, {
    scale = 1, colour = 0xb9b4ac, hotColour = 0xffb060, rate = 46, hotRate = 22,
  } = {}) {
    const rho = airDensity(pos.y);
    const lod = this._lod(pos);
    const dens = 0.25 + rho * 0.9;
    const n = rate * dt * lod * dens * scale;
    const back = _v1.copy(vel).normalize().multiplyScalar(-1);
    for (let i = 0; i < n; i++) {
      const jitter = _v2.set(
        (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9,
      );
      this.smoke.emit(
        _v3.copy(pos).addScaledVector(back, Math.random() * 6 * scale),
        jitter.addScaledVector(back, 14 * scale),
        {
          life: lerp(5.5, 2.2, rho) * (0.7 + Math.random() * 0.6),
          sizeStart: 1.6 * scale, sizeEnd: (12 + rho * 22) * scale,
          color: colour, opacity: 0.10 + rho * 0.22,
          drag: 0.9, gravity: 0.4,
        },
      );
    }
    const nh = hotRate * dt * lod * scale;
    for (let i = 0; i < nh; i++) {
      this.hot.emit(
        _v3.copy(pos).addScaledVector(back, Math.random() * 3 * scale),
        _v2.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5)
          .addScaledVector(back, 26 * scale),
        {
          life: 0.22 + Math.random() * 0.3,
          sizeStart: 2.4 * scale, sizeEnd: 0.4 * scale,
          color: hotColour, opacity: 0.85, drag: 2.6,
        },
      );
    }
  }

  /** Reentry / aero-heating streamers behind a hot threat. */
  reentryGlow(pos, vel, dt, heat) {
    if (heat <= 0.02) return;
    const back = _v1.copy(vel).normalize().multiplyScalar(-1);
    const n = 34 * dt * heat * this._lod(pos);
    for (let i = 0; i < n; i++) {
      this.hot.emit(
        _v3.copy(pos).addScaledVector(back, Math.random() * 12),
        _v2.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6)
          .addScaledVector(back, 40),
        {
          life: 0.3 + Math.random() * 0.5,
          sizeStart: 3.0 + heat * 5, sizeEnd: 0.6,
          color: heat > 0.55 ? 0xfff2d0 : 0xff9a4a, opacity: 0.5 + heat * 0.5,
          drag: 1.6, stretch: 0.5,
        },
      );
    }
  }

  // ------------------------------------------------------------- launch

  /**
   * Launch event: efflux jet, ground dust wash, blast scorch, flash light and
   * a screen glare. `dir` is the launch direction, `def` the battery config.
   */
  launchBlast(pos, dir, def, groundY = 0) {
    const p = def.plume;
    const scale = p.size;
    const down = _v1.copy(dir).multiplyScalar(-1).normalize();
    const groundDist = Math.max(0, pos.y - groundY);

    // Efflux jet driven straight out of the tail.
    for (let i = 0; i < 90 * scale; i++) {
      const spread = 0.42;
      const v = _v2.copy(down).multiplyScalar(55 + Math.random() * 90).add(
        _v3.set((Math.random() - 0.5) * 60 * spread, (Math.random() - 0.5) * 60 * spread,
          (Math.random() - 0.5) * 60 * spread),
      );
      this.smoke.emit(pos, v, {
        life: 3.4 + Math.random() * 3.6,
        sizeStart: 3 * scale, sizeEnd: (34 + Math.random() * 40) * scale,
        color: 0xbdb7ab, opacity: 0.34, drag: 1.15, gravity: 1.4,
      });
    }
    for (let i = 0; i < 55 * scale; i++) {
      const v = _v2.copy(down).multiplyScalar(90 + Math.random() * 160).add(
        _v3.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40),
      );
      this.hot.emit(pos, v, {
        life: 0.3 + Math.random() * 0.55,
        sizeStart: 5 * scale, sizeEnd: 1.6 * scale,
        color: p.colour, opacity: 0.95, drag: 2.2,
      });
    }

    // Ground wash: dust thrown radially outward from the pad.
    const dustN = 130 * p.dust;
    for (let i = 0; i < dustN; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 14 + Math.random() * 46;
      const r = 2 + Math.random() * 12 * p.dust;
      this.dust.emit(
        _v3.set(pos.x + Math.cos(a) * r, groundY + 0.4 + Math.random() * 2.5, pos.z + Math.sin(a) * r),
        _v2.set(Math.cos(a) * sp, 3 + Math.random() * 16, Math.sin(a) * sp),
        {
          life: 4.5 + Math.random() * 5,
          sizeStart: 4 * p.dust, sizeEnd: (34 + Math.random() * 36) * p.dust,
          color: 0xa8946f, opacity: 0.32, drag: 1.5, gravity: -0.4,
        },
      );
    }
    // A few embers and grit sparks.
    for (let i = 0; i < 60 * scale; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 20 + Math.random() * 70;
      this.sparks.emit(
        _v3.set(pos.x, Math.max(groundY + 0.6, pos.y - 2), pos.z),
        _v2.set(Math.cos(a) * sp, Math.random() * 40, Math.sin(a) * sp),
        {
          life: 0.6 + Math.random() * 1.1,
          sizeStart: 0.7, sizeEnd: 0.15,
          color: 0xffc070, opacity: 1, drag: 0.8, gravity: -14, stretch: 0.9,
        },
      );
    }

    this.shock.spawn(_v3.set(pos.x, groundY + 1.5, pos.z), {
      r0: 4, r1: 42 * scale, life: 0.55, colour: 0xd9cbb2, opacity: 0.34, flat: true, rim: 1.7,
    });
    this.lights.flash(pos, {
      colour: p.colour, intensity: 2600 * scale, life: 0.75, distance: 420 * scale,
    });
    this.glare(pos, { scale: 46 * scale, life: 1.1, peak: 0.45, colour: p.colour });
    if (groundDist < 40) {
      this.decals.spawn(_v3.set(pos.x, groundY, pos.z), 7 * scale, { opacity: 0.62 });
    }
    this.shakeImpulse = Math.min(1.6, this.shakeImpulse + 0.55 * scale);
  }

  /** Continuous pad wash while the booster is still low over its launcher. */
  padWash(padPos, missilePos, dt, def) {
    const h = missilePos.y - padPos.y;
    if (h > 90 || h < 0) return;
    const k = clamp01(1 - h / 90);
    const n = 70 * dt * k * def.plume.dust;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (10 + Math.random() * 40) * (0.4 + k);
      this.dust.emit(
        _v3.set(padPos.x + Math.cos(a) * (2 + Math.random() * 9), padPos.y + 0.5, padPos.z + Math.sin(a) * (2 + Math.random() * 9)),
        _v2.set(Math.cos(a) * sp, 2 + Math.random() * 12, Math.sin(a) * sp),
        {
          life: 4 + Math.random() * 4,
          sizeStart: 3.4, sizeEnd: 30 + Math.random() * 26,
          color: 0xb9a482, opacity: 0.3 * k, drag: 1.5, gravity: -0.3,
        },
      );
    }
  }

  // ------------------------------------------------------------- blasts

  /**
   * Intercept airburst. Scaled by altitude: thin air gives a sharper, shorter
   * flash with less smoke, dense air gives a rolling fireball.
   */
  airburst(pos, relVel, { power = 1, colour = 0xffe6b0 } = {}) {
    const rho = airDensity(pos.y);
    const lod = this._lod(pos);
    const s = power;

    this.fire.spawn(pos, {
      r0: 4 * s, r1: (30 + rho * 30) * s, life: 0.7 + rho * 0.5,
      hot: 0xfff8e0, cool: 0xe0621c, opacity: 1,
    });
    this.shock.spawn(pos, {
      r0: 6 * s, r1: (170 + rho * 130) * s, life: 0.7,
      colour: 0xe8f4ff, opacity: 0.5 + rho * 0.35, rim: 2.6,
    });
    // Secondary slower shell reads as the expanding gas cloud.
    this.shock.spawn(pos, {
      r0: 3 * s, r1: 70 * s, life: 1.25, colour: colour, opacity: 0.3, rim: 1.5,
    });

    const hotN = Math.round(90 * s * lod);
    for (let i = 0; i < hotN; i++) {
      const sp = 40 + Math.random() * 190 * s;
      _v2.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(sp);
      this.hot.emit(pos, _v2, {
        life: 0.35 + Math.random() * 0.7,
        sizeStart: 6 * s, sizeEnd: 1.5 * s,
        color: i % 3 === 0 ? 0xffffff : colour, opacity: 1, drag: 1.7,
      });
    }
    const sparkN = Math.round(110 * s * lod);
    for (let i = 0; i < sparkN; i++) {
      const sp = 90 + Math.random() * 340 * s;
      _v2.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(sp);
      if (relVel) _v2.addScaledVector(relVel, 0.06);
      this.sparks.emit(pos, _v2, {
        life: 0.7 + Math.random() * 1.4,
        sizeStart: 1.5 * s, sizeEnd: 0.2,
        color: 0xffd18a, opacity: 1, drag: 0.55, gravity: -9.81, stretch: 1.3,
      });
    }
    const smokeN = Math.round((40 + rho * 90) * s * lod);
    for (let i = 0; i < smokeN; i++) {
      const sp = 12 + Math.random() * 70 * s;
      _v2.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(sp);
      this.smoke.emit(pos, _v2, {
        life: 4 + Math.random() * 7,
        sizeStart: 6 * s, sizeEnd: (40 + Math.random() * 60) * s,
        color: 0x4a4640, opacity: 0.2 + rho * 0.35, drag: 1.1, gravity: 0.8,
      });
    }

    this.lights.flash(pos, {
      colour: 0xfff0d0, intensity: 9000 * s, life: 0.9, distance: 2600 * s,
    });
    // Glare is sized in world units, so it has to scale with viewing distance
    // to stay a lens artefact rather than a wall of white.
    const d = this.camera.position.distanceTo(pos);
    this.glare(pos, {
      scale: clamp(d * 0.05, 40, 900) * s, life: 0.9, peak: 0.7, colour: 0xfff2d8,
    });
    return { rho };
  }

  /** Threat structural breakup: tumbling chunks with their own smoke. */
  breakup(pos, vel, { count = 12, size = 0.8, smoky = true, spread = 60 } = {}) {
    for (let i = 0; i < count; i++) {
      _v2.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
        .normalize().multiplyScalar(spread * (0.3 + Math.random()));
      if (vel) _v2.addScaledVector(vel, 0.35 + Math.random() * 0.4);
      this.debris.spawn(pos, _v2, {
        size: size * (0.4 + Math.random() * 1.2),
        life: 5 + Math.random() * 5,
        smoky: smoky && i % 2 === 0,
      });
    }
  }

  /** Ground impact: crater flash, dirt plume, rolling smoke, ejecta. */
  groundImpact(pos, vel, { power = 1.4 } = {}) {
    const s = power;
    const p = _v1.set(pos.x, 0.5, pos.z);

    this.fire.spawn(_v3.set(p.x, 6 * s, p.z), {
      r0: 6 * s, r1: 46 * s, life: 1.0, hot: 0xfff0c8, cool: 0xc4400f,
    });
    this.shock.spawn(_v3.set(p.x, 2, p.z), {
      r0: 6, r1: 260 * s, life: 0.85, colour: 0xd8ccb0, opacity: 0.5, flat: true, rim: 1.6,
    });
    this.shock.spawn(_v3.set(p.x, 10 * s, p.z), {
      r0: 4, r1: 120 * s, life: 0.7, colour: 0xffe8c0, opacity: 0.4, rim: 2.4,
    });

    // Vertical dirt column
    for (let i = 0; i < 150 * s; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 10 * s;
      const up = 40 + Math.random() * 120 * s;
      this.dust.emit(
        _v3.set(p.x + Math.cos(a) * r, 1, p.z + Math.sin(a) * r),
        _v2.set(Math.cos(a) * (6 + Math.random() * 26), up, Math.sin(a) * (6 + Math.random() * 26)),
        {
          life: 6 + Math.random() * 6,
          sizeStart: 6 * s, sizeEnd: (50 + Math.random() * 60) * s,
          color: 0x9c8a6c, opacity: 0.55, drag: 0.85, gravity: -3.2,
        },
      );
    }
    // Base surge rolling outward
    for (let i = 0; i < 120 * s; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 30 + Math.random() * 90 * s;
      this.dust.emit(
        _v3.set(p.x + Math.cos(a) * 4, 1.2, p.z + Math.sin(a) * 4),
        _v2.set(Math.cos(a) * sp, 2 + Math.random() * 8, Math.sin(a) * sp),
        {
          life: 7 + Math.random() * 6,
          sizeStart: 8 * s, sizeEnd: (60 + Math.random() * 60) * s,
          color: 0xa8916e, opacity: 0.45, drag: 1.3, gravity: -0.3,
        },
      );
    }
    for (let i = 0; i < 140 * s; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 200 * s;
      this.sparks.emit(
        _v3.set(p.x, 1, p.z),
        _v2.set(Math.cos(a) * sp * 0.5, 40 + Math.random() * 150, Math.sin(a) * sp * 0.5),
        {
          life: 1.4 + Math.random() * 1.8, sizeStart: 1.6, sizeEnd: 0.3,
          color: 0xffb060, opacity: 1, drag: 0.35, gravity: -9.81, stretch: 1.1,
        },
      );
    }
    this.breakup(_v3.set(p.x, 3, p.z), _v2.set(0, 40, 0), {
      count: 22, size: 1.3, smoky: true, spread: 90,
    });
    this.decals.spawn(p, 22 * s, { opacity: 0.95 });
    this.lights.flash(_v3.set(p.x, 12 * s, p.z), {
      colour: 0xffd090, intensity: 16000 * s, life: 1.1, distance: 3200,
    });
    const gd = this.camera.position.distanceTo(p);
    this.glare(_v3.set(p.x, 14 * s, p.z), {
      scale: clamp(gd * 0.06, 50, 700) * s, life: 1.1, peak: 0.8, colour: 0xffd8a0,
    });
    this.shakeImpulse = 1.6;
  }

  /** Decoy flare: bright, tumbling, obviously not a warhead. */
  decoyFlare(pos, vel, dt) {
    const lod = this._lod(pos);
    const n = 26 * dt * lod;
    for (let i = 0; i < n; i++) {
      _v2.set((Math.random() - 0.5) * 24, (Math.random() - 0.5) * 24, (Math.random() - 0.5) * 24);
      if (vel) _v2.addScaledVector(vel, -0.06);
      this.hot.emit(pos, _v2, {
        life: 0.7 + Math.random() * 0.9,
        sizeStart: 5, sizeEnd: 1.0,
        color: 0xffd070, opacity: 0.95, drag: 1.1, gravity: -3,
      });
    }
    const m = 10 * dt * lod;
    for (let i = 0; i < m; i++) {
      this.smoke.emit(pos, _v2.set((Math.random() - 0.5) * 10, -6, (Math.random() - 0.5) * 10), {
        life: 3.5, sizeStart: 3, sizeEnd: 26, color: 0xcac4b8, opacity: 0.2, drag: 1.2, gravity: 0.6,
      });
    }
  }

  /** Small puff for stage separation and control-jet corrections. */
  puff(pos, dir, { size = 4, colour = 0xd8d4cc, count = 8, speed = 30 } = {}) {
    for (let i = 0; i < count; i++) {
      _v2.copy(dir).multiplyScalar(speed * (0.5 + Math.random()))
        .add(_v3.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12));
      this.smoke.emit(pos, _v2, {
        life: 1.1 + Math.random(), sizeStart: size * 0.4, sizeEnd: size * 3,
        color: colour, opacity: 0.4, drag: 2.2, gravity: 0,
      });
    }
  }

  /** Additive screen glare billboard - reads as lens response to a bright source. */
  glare(pos, { scale = 100, life = 1, peak = 1, colour = 0xffe0b0 } = {}) {
    let g = this.glares.find((x) => !x.sprite.visible);
    if (!g) g = this.glares.reduce((a, b) => (a.peak < b.peak ? a : b));
    g.sprite.position.copy(pos);
    g.mat.color.set(colour);
    g.sprite.visible = true;
    g.t = 0; g.life = life; g.peak = peak; g.scale = scale;
    g.sprite.scale.set(scale, scale * 0.14, 1);
    return g;
  }

  /** Persistent dust kick, e.g. footsteps and vehicle motion. */
  footDust(pos, strength = 1) {
    for (let i = 0; i < 3 * strength; i++) {
      const a = Math.random() * Math.PI * 2;
      this.dust.emit(
        _v3.set(pos.x + Math.cos(a) * 0.2, 0.08, pos.z + Math.sin(a) * 0.2),
        _v2.set(Math.cos(a) * 0.5, 0.3 + Math.random() * 0.5, Math.sin(a) * 0.5),
        {
          life: 1.4 + Math.random(), sizeStart: 0.18, sizeEnd: 1.3 + Math.random(),
          color: 0xbca886, opacity: 0.28, drag: 2.4, gravity: -0.15,
        },
      );
    }
  }

  clear() {
    this.smoke.clear(); this.dust.clear(); this.hot.clear(); this.sparks.clear();
    this.trails.clear(); this.shock.clear(); this.fire.clear();
    this.debris.clear(); this.decals.clear(); this.lights.clear();
    for (const g of this.glares) { g.sprite.visible = false; g.mat.opacity = 0; g.peak = 0; }
    this.shakeImpulse = 0;
  }

  get stats() {
    return {
      smoke: this.smoke.ring.count,
      dust: this.dust.ring.count,
      hot: this.hot.ring.count,
      sparks: this.sparks.ring.count,
      debris: this.debris.count,
      trails: this.trails.live.length,
    };
  }
}
