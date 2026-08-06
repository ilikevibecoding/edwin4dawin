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
import { smokePuff, glowSprite, noiseTexture, streakSprite, cloudBlob } from './util/textures.js';
import { hazeFactor } from './effects/aerial.js';
import { airDensity, clamp, clamp01, lerp } from './util/mathx.js';
import { QUALITY } from './config.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _v5 = new THREE.Vector3();
const _v6 = new THREE.Vector3();
const _c1 = new THREE.Color();

/** Fill `a` and `b` with an arbitrary orthonormal basis perpendicular to `n`. */
function perpBasis(n, a, b) {
  a.set(0, 1, 0);
  if (Math.abs(n.dot(a)) > 0.9) a.set(1, 0, 0);
  a.crossVectors(n, a).normalize();
  b.crossVectors(n, a).normalize();
}

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
      texture: smokePuff(128, 3), turbulence: 0.9, softness: 0.78,
    });
    this.dust = new ParticleSystem({
      kind: 'smoke', capacity: Math.round(budget * 0.2),
      texture: smokePuff(128, 8), turbulence: 1.15, softness: 0.85,
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

    // Distance-compensated burst flashes. A 150 m fireball 14 km away is four
    // pixels across; without this the payoff of a high-altitude intercept is
    // invisible from the ground, which is exactly where the player is standing.
    this.bursts = [];
    const burstTex = glowSprite(256, 1.7, 'burst');
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.SpriteMaterial({
        map: burstTex, color: 0xfff2d8, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, fog: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      sprite.renderOrder = 20;
      scene.add(sprite);
      this.bursts.push({ sprite, mat, t: 0, life: 1, r0: 10, r1: 100, minPixels: 70 });
    }

    // The lingering debris cloud. Individual smoke particles are a few pixels
    // across at intercept range, so the cloud that actually sells a kill from
    // the ground is drawn as its own distance-compensated billboard.
    this.clouds = [];
    const cloudTexes = [cloudBlob(256, 11), cloudBlob(256, 29), cloudBlob(256, 53)];
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.SpriteMaterial({
        map: cloudTexes[i % cloudTexes.length], color: 0x8a8175, transparent: true,
        depthWrite: false, opacity: 0, fog: false, rotation: 0,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      sprite.renderOrder = 18;
      scene.add(sprite);
      this.clouds.push({ sprite, mat, t: 0, life: 1, r0: 10, r1: 100, minPixels: 20, peak: 0.7 });
    }
    this._viewportHeight = 800;

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
  setLighting(sunDirWorld, lightColour, shadowColour, trailGain = 1) {
    this._sunDir.copy(sunDirWorld);
    this._lightColour.copy(lightColour);
    this._shadowColour.copy(shadowColour);
    this.trails.setLighting(_c1.copy(lightColour).multiplyScalar(
      trailGain / Math.max(0.001, Math.max(lightColour.r, lightColour.g, lightColour.b)),
    ));
  }

  // ------------------------------------------------------------------ update

  /**
   * Fire a burst flash that never falls below `minPixels` on screen.
   * @param {THREE.Vector3} pos
   */
  burstFlash(pos, {
    r0 = 12, r1 = 140, life = 1.1, minPixels = 70, colour = 0xfff2d8, intensity = 2.6,
  } = {}) {
    let b = this.bursts.find((x) => !x.sprite.visible);
    if (!b) b = this.bursts.reduce((a, c) => (a.t / a.life > c.t / c.life ? a : c));
    b.sprite.position.copy(pos);
    // Values above 1 are legitimate here: the sprite renders into the HDR
    // buffer before tone mapping, so this is what makes the flash blow out.
    _c1.set(colour);
    b.mat.color.setRGB(_c1.r * intensity, _c1.g * intensity, _c1.b * intensity);
    b.sprite.visible = true;
    b.t = 0; b.life = life; b.r0 = r0; b.r1 = r1; b.minPixels = minPixels;
    return b;
  }

  /**
   * Lingering detonation cloud that stays legible at any range.
   * Drifts with `vel` so a kill cloud is carried along the engagement geometry
   * instead of hanging in the sky like a decal.
   */
  burstCloud(pos, {
    r0 = 20, r1 = 260, life = 9, minPixels = 26, colour = 0x8b8175, peak = 0.72,
    vel = null,
  } = {}) {
    let c = this.clouds.find((x) => !x.sprite.visible);
    if (!c) c = this.clouds.reduce((a, x) => (a.t / a.life > x.t / x.life ? a : x));
    c.sprite.position.copy(pos);
    c.mat.color.set(colour);
    c.mat.rotation = Math.random() * Math.PI * 2;
    c.sprite.visible = true;
    c.t = 0; c.life = life; c.r0 = r0; c.r1 = r1; c.minPixels = minPixels; c.peak = peak;
    c.vx = vel ? vel.x : 0; c.vy = vel ? vel.y : 0; c.vz = vel ? vel.z : 0;
    return c;
  }

  /** Pixels per world unit at unit distance, for the current viewport and fov. */
  get pixelScale() {
    return this._viewportHeight / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
  }

  /**
   * World size that renders to roughly `px` pixels at `pos`.
   *
   * The intercept is the payoff of the whole engagement and happens 5-15 km
   * from the observer, where an honest debris cloud is a handful of pixels.
   * Sizing the one-shot burst effects through this keeps them legible from the
   * ground while leaving a close-range burst at its physical scale.
   */
  screenSize(pos, px) {
    const dist = this.camera.position.distanceTo(pos);
    return (dist * px) / Math.max(1, this.pixelScale);
  }

  _updateBursts(dt) {
    const pixelScale = this.pixelScale;
    for (const b of this.bursts) {
      if (!b.sprite.visible) continue;
      b.t += dt;
      const k = b.t / b.life;
      if (k >= 1) { b.sprite.visible = false; b.mat.opacity = 0; continue; }
      // Fast flare, slow decay - the signature of a detonation seen at range.
      const env = k < 0.05 ? k / 0.05 : Math.pow(1 - (k - 0.05) / 0.95, 1.9);
      const grow = b.r0 + (b.r1 - b.r0) * (1 - Math.pow(1 - k, 2.4));
      const dist = this.camera.position.distanceTo(b.sprite.position);
      const minWorld = (dist * b.minPixels) / Math.max(1, pixelScale);
      const s = Math.max(grow, minWorld);
      b.sprite.scale.setScalar(s);
      b.mat.opacity = env * (1 - this.hazeAt(b.sprite.position) * 0.7);
    }
    for (const c of this.clouds) {
      if (!c.sprite.visible) continue;
      c.t += dt;
      const k = c.t / c.life;
      if (k >= 1) { c.sprite.visible = false; c.mat.opacity = 0; continue; }
      c.sprite.position.x += c.vx * dt;
      c.sprite.position.y += c.vy * dt;
      c.sprite.position.z += c.vz * dt;
      // Fast bloom into a cloud, then a long dissolve.
      const env = Math.min(1, k / 0.08) * Math.pow(1 - k, 1.5);
      const grow = c.r0 + (c.r1 - c.r0) * (1 - Math.pow(1 - k, 1.8));
      const dist = this.camera.position.distanceTo(c.sprite.position);
      const minWorld = (dist * c.minPixels) / Math.max(1, pixelScale);
      c.sprite.scale.setScalar(Math.max(grow, minWorld));
      c.mat.opacity = env * c.peak * (1 - this.hazeAt(c.sprite.position) * 0.85);
    }
  }

  update(dt, viewportHeight) {
    this.time += dt;
    if (viewportHeight) this._viewportHeight = viewportHeight;
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

    this._updateBursts(dt);
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

  /**
   * Lit fraction for a puff sitting at `offset` from the axis of its plume.
   *
   * Launch smoke is optically thick, so the sunward face of the column is
   * near-white and its core sits in its own shadow. Handing that to the shader
   * per puff is the whole difference between a stack of sprites reading as
   * billows and reading as one flat silhouette. `bury` is how deep in the
   * column the puff sits: 0 at the surface, 1 on the axis.
   */
  _shade(offset, bury = 0) {
    const len = offset.length();
    const d = len > 1e-4 ? offset.dot(this._sunDir) / len : 0;
    const sunward = clamp01(d * 0.5 + 0.5);
    return clamp01((0.1 + 1.0 * Math.pow(sunward, 1.5)) * (1 - bury * 0.7));
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
  followTrail(r, pos, minStep, speed) { this.trails.follow(r, pos, minStep, speed); }
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
    // Perpendicular frame, so puffs can be placed on the surface of the column
    // rather than jittered inside a cube around its axis.
    perpBasis(back, _v4, _v5);
    // The whole column drifts on a slow wander, which is what stops it ruling a
    // straight-sided cone up the frame.
    const t = this.time;
    const wx = Math.sin(t * 0.9) * 0.55 + Math.sin(t * 2.3 + 1.7) * 0.28;
    const wz = Math.cos(t * 1.1 + 0.4) * 0.55 + Math.sin(t * 1.9) * 0.24;
    const radius = (2.2 + rho * 3.4) * scale;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      // Weighted to the surface: a shell of puffs reads as a rolling column,
      // a solid cylinder of them reads as fog.
      const rr = Math.sqrt(0.25 + Math.random() * 0.75);
      const off = _v6.copy(_v4).multiplyScalar(Math.cos(a) * rr)
        .addScaledVector(_v5, Math.sin(a) * rr);
      const bury = 1 - rr;
      const shade = this._shade(off, bury);
      // Dark puffs are the ones the sun cannot reach; tie the tint to the same
      // shading term so colour and light agree.
      const tint = shade < 0.4 ? 0x6f6a62 : colour;
      this.smoke.emit(
        _v3.copy(pos).addScaledVector(back, Math.random() * 7 * scale)
          .addScaledVector(off, radius),
        _v2.copy(off).multiplyScalar(5.5 * scale)
          .addScaledVector(back, 13 * scale)
          .add(_v3.set(wx * 4, 0, wz * 4)),
        {
          life: lerp(5.5, 2.6, rho) * (0.7 + Math.random() * 0.6),
          sizeStart: 2.2 * scale * (0.6 + Math.random() * 0.9),
          sizeEnd: (7 + rho * 9) * scale * (0.7 + Math.random() * 0.7),
          color: tint,
          opacity: (0.14 + rho * 0.5) * (0.75 + Math.random() * 0.5),
          drag: 0.9, gravity: 0.4,
          // Reach most of the width fast, then hold it: a column, not a cone.
          grow: 3.4, shade,
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

    // Efflux jet: the violent gas actually leaving the tube. Short-lived and
    // fast, aimed down the launch axis, and deliberately kept small - this is
    // the bright root of the plume, not the plume itself.
    // Heavily damped so the jet spends itself within a few tube lengths. Left
    // to coast it sinks tens of metres straight through the pad and the whole
    // population is wasted underground.
    perpBasis(down, _v4, _v5);
    for (let i = 0; i < 34 * scale; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = 0.3 + Math.random() * 0.7;
      // Shade from the lateral offset only. Every jet particle travels down the
      // launch axis, so shading them by their velocity puts the entire
      // population on the anti-sun side and the plume comes out uniformly grey.
      const off = _v6.copy(_v4).multiplyScalar(Math.cos(a) * rr)
        .addScaledVector(_v5, Math.sin(a) * rr);
      const shade = this._shade(off, 1 - rr);
      const v = _v2.copy(down).multiplyScalar(40 + Math.random() * 60)
        .addScaledVector(off, 18);
      this.smoke.emit(pos, v, {
        life: 1.9 + Math.random() * 2.0,
        sizeStart: 2.2 * scale, sizeEnd: (8 + Math.random() * 7) * scale,
        color: shade > 0.7 ? 0xefebde : 0xa8a297,
        opacity: 0.5 * (0.7 + Math.random() * 0.6),
        drag: 2.6, gravity: 1.9,
        grow: 3.0, shade,
      });
    }
    for (let i = 0; i < 55 * scale; i++) {
      const v = _v2.copy(down).multiplyScalar(90 + Math.random() * 160).add(
        _v3.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40),
      );
      this.hot.emit(pos, v, {
        life: 0.3 + Math.random() * 0.55,
        sizeStart: 4 * scale, sizeEnd: 1.2 * scale,
        color: p.colour, opacity: 0.95, drag: 2.2,
      });
    }

    // The rolling ground cloud. This is what a launch actually looks like from
    // a hundred metres away: a dense mass boiling out sideways at pad level
    // that the missile climbs out of, not a wedge hanging in mid-air. Each puff
    // is shaded from its own position on the surface of the cloud, so the
    // sunward billows read bright against a shadowed core.
    const cloudN = Math.round(130 * scale);
    const spread = 11 + 7 * scale;
    for (let i = 0; i < cloudN; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.pow(Math.random(), 0.62);
      const r = spread * rr;
      const h = Math.random();
      const lift = h * 15 * scale;
      _v3.set(pos.x + Math.cos(a) * r, groundY + 1.5 + lift, pos.z + Math.sin(a) * r);
      // Offset from the centre of the cloud drives both the shading and the
      // direction it rolls. Puffs higher up the mass face further skyward, so
      // the top of the cloud takes the sun and the skirt stays in shadow.
      const off = _v6.set(
        Math.cos(a) * (1 - h * 0.55), 0.2 + h * 1.1, Math.sin(a) * (1 - h * 0.55),
      ).normalize();
      const bury = 1 - rr;
      const shade = this._shade(off, bury);
      // High drag: the cloud boils in place and is left behind, it does not
      // keep sailing outward until it is a thin sheet across the horizon.
      const sp = (5 + Math.random() * 13) * (0.4 + rr);
      this.smoke.emit(
        _v3,
        _v2.set(Math.cos(a) * sp, 3 + Math.random() * 11 * (1 - bury * 0.6), Math.sin(a) * sp),
        {
          life: 7 + Math.random() * 6,
          sizeStart: 4 * scale * (0.7 + Math.random() * 0.7),
          sizeEnd: (9 + Math.random() * 8) * scale,
          color: shade < 0.3 ? 0x6a655b : (shade > 0.66 ? 0xf6f2e6 : 0xb5b0a4),
          opacity: (0.62 + Math.random() * 0.32),
          drag: 2.1, gravity: 0.55,
          grow: 4.2, shade,
        },
      );
    }

    // Ground wash: dust thrown radially outward from the pad.
    // Dust is a low skirt around the pad, not weather. Kept dense, short and
    // heavily damped: thrown far and thin it turns the whole horizon into a
    // flat brown haze that reads as a dust storm rather than a launch.
    const dustN = 110 * p.dust;
    for (let i = 0; i < dustN; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 8 + Math.random() * 22;
      const r = 2 + Math.random() * 8 * p.dust;
      const off = _v6.set(Math.cos(a), 0.3, Math.sin(a)).normalize();
      const shade = this._shade(off, Math.random() * 0.5);
      this.dust.emit(
        _v3.set(pos.x + Math.cos(a) * r, groundY + 0.4 + Math.random() * 2.5, pos.z + Math.sin(a) * r),
        _v2.set(Math.cos(a) * sp, 2 + Math.random() * 7, Math.sin(a) * sp),
        {
          life: 4.5 + Math.random() * 5,
          sizeStart: 3.4 * p.dust, sizeEnd: (11 + Math.random() * 11) * p.dust,
          color: shade > 0.7 ? 0xc3b598 : 0x877d69,
          opacity: 0.42, drag: 2.4, gravity: -0.35,
          grow: 3.4, shade,
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
    // A lens streak should read as lens response, not as a light source of its
    // own. Cap it in screen space so a launch fifty metres away does not paint
    // a bright bar across half the frame.
    this.glare(pos, {
      scale: Math.min(46 * scale, this.screenSize(pos, 190)),
      life: 1.1, peak: 0.4, colour: p.colour,
    });
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
      const sp = (7 + Math.random() * 20) * (0.4 + k);
      const off = _v6.set(Math.cos(a), 0.3, Math.sin(a)).normalize();
      const shade = this._shade(off, Math.random() * 0.5);
      this.dust.emit(
        _v3.set(padPos.x + Math.cos(a) * (2 + Math.random() * 9), padPos.y + 0.5, padPos.z + Math.sin(a) * (2 + Math.random() * 9)),
        _v2.set(Math.cos(a) * sp, 2 + Math.random() * 8, Math.sin(a) * sp),
        {
          life: 4 + Math.random() * 4,
          sizeStart: 3.4, sizeEnd: 11 + Math.random() * 9,
          color: shade > 0.7 ? 0xc9b489 : 0x8d7c5e,
          opacity: 0.46 * k, drag: 2.3, gravity: -0.3,
          grow: 3.4, shade,
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
    // One-shot events keep a much higher detail floor than continuous
    // emitters: an intercept at 12 km is the payoff of the whole engagement
    // and has to read from the ground.
    const lod = Math.max(0.55, this._lod(pos));
    const s = power;
    // Thin air lets the fireball expand far further before it is quenched,
    // which is also what makes a distant high-altitude burst legible.
    const expand = 1 + (1 - rho) * 2.6;
    const d = this.camera.position.distanceTo(pos);
    // Every world-sized element of the burst takes the larger of its physical
    // size and the size that renders to a given pixel count. Up close the
    // physical value wins and the burst is honest; at 10 km the screen-space
    // floor takes over and the intercept still reads as an event.
    const px = (n) => this.screenSize(pos, n);

    this.fire.spawn(pos, {
      r0: Math.max(5 * s, px(9)), r1: Math.max((30 + rho * 30) * s * expand, px(46)),
      life: 0.9 + rho * 0.4, hot: 0xfff8e0, cool: 0xe0621c, opacity: 1,
    });
    this.shock.spawn(pos, {
      r0: Math.max(8 * s, px(10)), r1: Math.max((170 + rho * 130) * s * expand, px(150)),
      life: 0.9, colour: 0xe8f4ff, opacity: 0.45 + rho * 0.35, rim: 2.6,
    });
    // Secondary slower shell reads as the expanding gas cloud.
    this.shock.spawn(pos, {
      r0: Math.max(4 * s, px(6)), r1: Math.max(90 * s * expand, px(88)),
      life: 1.6, colour, opacity: 0.28, rim: 1.5,
    });

    const hotN = Math.round(90 * s * lod);
    const hotSize = Math.max(6 * s, px(6));
    for (let i = 0; i < hotN; i++) {
      // Speeds are set from the distance the debris should cover on screen over
      // its life, not from a fixed muzzle velocity, so the burst blooms at the
      // same rate whether it is 2 km or 12 km away.
      const sp = Math.max(40 + Math.random() * 190 * s, px(60) * (0.35 + Math.random()));
      _v2.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(sp);
      this.hot.emit(pos, _v2, {
        life: 0.35 + Math.random() * 0.7,
        sizeStart: hotSize, sizeEnd: hotSize * 0.25,
        color: i % 3 === 0 ? 0xffffff : colour, opacity: 1, drag: 1.7,
      });
    }
    const sparkN = Math.round(110 * s * lod);
    const sparkSize = Math.max(1.5 * s, px(2.4));
    for (let i = 0; i < sparkN; i++) {
      const sp = Math.max(90 + Math.random() * 340 * s, px(110) * (0.3 + Math.random()));
      _v2.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(sp);
      if (relVel) _v2.addScaledVector(relVel, 0.06);
      this.sparks.emit(pos, _v2, {
        life: 0.7 + Math.random() * 1.4,
        sizeStart: sparkSize, sizeEnd: sparkSize * 0.15,
        color: 0xffd18a, opacity: 1, drag: 0.55, gravity: -9.81, stretch: 1.3,
      });
    }
    const smokeN = Math.round((60 + rho * 80) * s * lod);
    const smokeS0 = Math.max(7 * s, px(7));
    for (let i = 0; i < smokeN; i++) {
      const sp = Math.max((16 + Math.random() * 80 * s) * expand * 0.6, px(22) * (0.3 + Math.random()));
      _v2.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(sp);
      this.smoke.emit(pos, _v2, {
        life: 5 + Math.random() * 8,
        sizeStart: smokeS0,
        sizeEnd: Math.max((40 + Math.random() * 60) * s * expand * 0.7, px(30 + Math.random() * 34)),
        color: i % 3 === 0 ? 0x6a6258 : 0x413d38,
        opacity: 0.22 + rho * 0.3, drag: 1.1, gravity: 0.8,
      });
    }

    // Radial debris fingers. A warhead intercept throws fragments outward on
    // smoke filaments, and that starburst - not the fireball - is what makes a
    // kill unmistakable from the ground. Each finger is a short chain of puffs
    // launched along one ray, so it draws itself as a spike.
    const fingers = Math.round(16 * lod);
    const fingerReach = Math.max(180 * s * expand, px(150));
    for (let f = 0; f < fingers; f++) {
      _v2.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      if (relVel) _v2.addScaledVector(relVel, 0.00018 * (Math.random() - 0.2));
      _v2.normalize();
      const reach = fingerReach * (0.5 + Math.random() * 0.9);
      const beads = 5;
      for (let b = 0; b < beads; b++) {
        const t = (b + 1) / beads;
        _v3.copy(pos).addScaledVector(_v2, reach * t * 0.22);
        _v1.copy(_v2).multiplyScalar(reach * (0.55 + t * 0.5));
        this.smoke.emit(_v3, _v1, {
          life: 3.2 + Math.random() * 3.4,
          sizeStart: Math.max(3 * s, px(2.6)),
          sizeEnd: Math.max(26 * s, px(11 + Math.random() * 9)),
          color: b === 0 ? 0x8a8074 : 0x55504a,
          opacity: 0.5 - t * 0.16, drag: 1.5, gravity: -1.2,
        });
      }
    }

    this.lights.flash(pos, {
      colour: 0xfff0d0, intensity: 9000 * s, life: 0.9, distance: 2600 * s,
    });
    this.burstFlash(pos, {
      r0: 14 * s, r1: (150 + rho * 60) * s * expand, life: 0.5,
      minPixels: 92 * s, colour: 0xfff4d4, intensity: 4.2,
    });
    // Slower orange bloom behind the white flash.
    this.burstFlash(pos, {
      r0: 20 * s, r1: (240 + rho * 90) * s * expand, life: 1.7,
      minPixels: 60 * s, colour: 0xffb057, intensity: 1.5,
    });
    // The cloud that is still there a beat later. Overlapping puffs of differing
    // tone give it an irregular edge and a shaded core rather than reading as
    // one soft disc, and it is what the player looks at while the HUD confirms.
    for (let i = 0; i < 5; i++) {
      _v2.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
        .normalize().multiplyScalar(Math.max(16 * s * expand, px(16)));
      _v3.copy(pos).add(_v2);
      const lead = i === 0;
      this.burstCloud(_v3, {
        r0: Math.max(18 * s, px(14)),
        r1: Math.max((260 + rho * 140) * s * expand, px(76)) * (0.7 + Math.random() * 0.7),
        life: 9 + Math.random() * 7,
        minPixels: (lead ? 62 : (i === 4 ? 30 : 44)) * (0.85 + Math.random() * 0.3),
        // Sunlit debris reads bright against the sky; the dark core underneath
        // stops the cloud from looking like a soft white sticker.
        colour: i === 4 ? 0x3d382f : (lead ? 0xe4ded1 : 0xb0a899),
        peak: i === 4 ? 0.68 : 0.92 - i * 0.10,
        vel: relVel ? _v1.copy(relVel).multiplyScalar(0.03) : null,
      });
    }
    // Glare is sized in world units, so it has to scale with viewing distance
    // to stay a lens artefact rather than a wall of white.
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
    this.burstFlash(_v3.set(p.x, 10 * s, p.z), {
      r0: 18 * s, r1: 120 * s, life: 1.1, minPixels: 54 * s, colour: 0xffd9a4, intensity: 2.8,
    });
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

  /**
   * Compile every effect program before the first engagement.
   *
   * Pool members start hidden, so their shaders would otherwise compile the
   * first time each effect fires - which on a cold GPU driver shows up as a
   * multi-second freeze exactly when the player presses AUTHORIZE.
   */
  warmup(renderer, scene, camera, extraRoots = []) {
    const hidden = [];
    const reveal = (obj) => {
      obj.traverse((o) => {
        if (!o.visible) { hidden.push(o); o.visible = true; }
      });
    };
    reveal(this.shock.group);
    reveal(this.fire.group);
    reveal(this.decals.group);
    reveal(this.glareGroup);
    for (const b of this.bursts) reveal(b.sprite);
    for (const c of this.clouds) reveal(c.sprite);
    for (const root of extraRoots) if (root) reveal(root);
    for (const g of this.glares) { g.mat.opacity = 0; }
    renderer.compile(scene, camera);
    for (const o of hidden) o.visible = false;
  }

  clear() {
    this.smoke.clear(); this.dust.clear(); this.hot.clear(); this.sparks.clear();
    this.trails.clear(); this.shock.clear(); this.fire.clear();
    this.debris.clear(); this.decals.clear(); this.lights.clear();
    for (const g of this.glares) { g.sprite.visible = false; g.mat.opacity = 0; g.peak = 0; }
    for (const b of this.bursts) { b.sprite.visible = false; b.mat.opacity = 0; }
    for (const c of this.clouds) { c.sprite.visible = false; c.mat.opacity = 0; }
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
