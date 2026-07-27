import * as THREE from 'three';
import { ParticlePool, DebrisPool, DebrisGroup } from './particles.js';
import { makeTextures } from './sprites.js';
import { ExplosionFX } from './explosion.js';
import { ScreenOverlay } from './overlay.js';
import { rand, randRange, randSpread, randPick } from '../core/rand.js';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3();
const _side = new THREE.Vector3();
const _m4 = new THREE.Matrix4();
const _c = new THREE.Color();
const _sunDir = new THREE.Vector3(0.4, 0.6, 0.4).normalize();

const SURF_DUST = {
  concrete: [0xb0a494, 0x9e9385, 0xbfb3a1],
  plaster: [0xd8cfbd, 0xe2dbcb, 0xcac0ac],
  dirt: [0x7a6248, 0x6b5540, 0x8a7050],
  wood: [0x9a7b52, 0x8a6d47, 0xa8875c],
  metal: [0x7d7d80, 0x8a8a8e],
};

/**
 * VFX facade. Stable API used by weapons/ai/airstrike:
 *   impact(point, normal, surface)      surface: concrete|metal|dirt|wood|plaster
 *   blood(point, dir)
 *   muzzleFlash(pos, dir, {scale, light})
 *   tracer(from, to, {speed, width})
 *   explosion(position, {radius, scorch, scale})
 *   smokeColumn(position, {rate, size, life}) -> stop()
 *   shellEject(pos, rightDir)
 *   flashLight(pos, color, intensity, decay, distance)
 *   update(dt)
 */
export class VFX {
  constructor(game) {
    this.game = game;
    const tex = makeTextures();
    this.tex = tex;

    // --- particle pools -----------------------------------------------------
    // (muzzle-adjacent pools keep a tiny near-fade so viewmodel fx stay visible)
    this.soft = new ParticlePool(game.scene, tex.soft, { max: 512, blending: THREE.AdditiveBlending, hdrBoost: 4, nearFade: [0.05, 0.16] });
    this.spark = new ParticlePool(game.scene, tex.hard, { max: 1024, blending: THREE.AdditiveBlending, hdrBoost: 6, nearFade: [0.05, 0.2] });
    // additive fire draws ABOVE the normal-blended body (renderOrder 22 > 21)
    // so licks/bursts read on top of the volume instead of hiding behind it
    this.fire = new ParticlePool(game.scene, tex.fire, { max: 128, blending: THREE.AdditiveBlending, hdrBoost: 1, atlas: { cols: 2, rows: 2 }, renderOrder: 22 });
    // fireball body: normal blending so overlaps read as volume, HDR ramp colors still bloom
    this.fireN = new ParticlePool(game.scene, tex.fire, { max: 320, blending: THREE.NormalBlending, hdrBoost: 1, atlas: { cols: 2, rows: 2 }, renderOrder: 21 });
    this.flash = new ParticlePool(game.scene, tex.flash, { max: 64, blending: THREE.AdditiveBlending, hdrBoost: 5, atlas: { cols: 2, rows: 2 }, nearFade: [0.05, 0.12] });
    this.smoke = new ParticlePool(game.scene, tex.smoke, {
      max: 1600, blending: THREE.NormalBlending, atlas: { cols: 2, rows: 2 },
      sunShade: 0.4, sunLift: 0.09, nearFade: [0.3, 1.2],
    });

    // legacy aliases (older systems referenced these names)
    this.add = this.soft;
    this.addHard = this.spark;

    // --- debris -------------------------------------------------------------
    this.debris = new DebrisGroup(game.scene, { max: 330 });
    this.brass = new DebrisPool(game.scene, {
      max: 64,
      // 10 radial segments: at 5cm true scale the case reads round, never as
      // a faceted hex prism when a zoom crop lands on one mid-flight.
      // Moderate metalness/roughness: the case must NEVER blow past the bloom
      // threshold under the muzzle light (the round-3 "orange capsule")
      geometry: new THREE.CylinderGeometry(0.42, 0.42, 1, 10),
      material: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.45, roughness: 0.62 }),
    });
    this.brass.onBounce = (pos, speed) => {
      game.events.emit('shell:bounce', { position: pos, speed });
    };

    // --- transient lights ----------------------------------------------------
    this.lights = [];
    for (let i = 0; i < 6; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 40, 2);
      l.castShadow = false;
      game.scene.add(l);
      this.lights.push({ light: l, ttl: 0, decay: 6 });
    }

    // --- tracers (pooled stretched quads with gradient texture) --------------
    this.tracerGeo = new THREE.PlaneGeometry(1, 1);
    this.tracerMat = new THREE.MeshBasicMaterial({
      map: tex.tracer, color: new THREE.Color(4.5, 3.6, 2.6), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.tracerMat.toneMapped = true;
    this.tracers = [];

    // --- decals ---------------------------------------------------------------
    this.decalGeo = new THREE.PlaneGeometry(1, 1);
    this.decalMats = this._makeDecalMats(tex);
    this.decals = [];
    this.maxDecals = 90;

    // --- misc state -------------------------------------------------------------
    this.emitters = [];
    this.explosionFX = new ExplosionFX(this);
    this.overlay = new ScreenOverlay();

    game.events.on('explosion', ({ position, radius }) => this.explosion(position, { radius }));
    game.events.on('weapon:hit', ({ point, normal, object, enemy }) => {
      if (!enemy) this.impact(point, normal, object?.userData?.surface || 'concrete');
    });
  }

  _makeDecalMats(tex) {
    const mk = (map) => new THREE.MeshBasicMaterial({
      map, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4,
    });
    return {
      holes: tex.holes.map(mk),
      scorch: mk(tex.scorch),
      blood: mk(tex.blood),
    };
  }

  _decal(point, normal, size, mat, ttl = 40) {
    const m = new THREE.Mesh(this.decalGeo, mat.clone());
    m.position.copy(point).addScaledVector(normal, 0.012 + rand() * 0.006);
    m.quaternion.setFromUnitVectors(_v1.set(0, 0, 1), normal);
    m.rotateZ(rand() * Math.PI * 2);
    m.scale.setScalar(size);
    m.renderOrder = 4;
    this.game.scene.add(m);
    this.decals.push({ mesh: m, ttl, fade: Math.min(3, ttl * 0.25) });
    if (this.decals.length > this.maxDecals) {
      const old = this.decals.shift();
      this.game.scene.remove(old.mesh);
      old.mesh.material.dispose();
    }
  }

  flashLight(pos, color = 0xffcc88, intensity = 60, decay = 8, distance = 30) {
    let slot = this.lights.find((s) => s.ttl <= 0);
    if (!slot) {
      // steal the dimmest live light so a fresh blast never loses its flash
      slot = this.lights[0];
      for (const s of this.lights) if (s.light.intensity < slot.light.intensity) slot = s;
    }
    slot.light.position.copy(pos);
    slot.light.color.set(color);
    slot.light.intensity = intensity;
    slot.light.distance = distance;
    slot.ttl = 1;
    slot.decay = decay;
  }

  // ==========================================================================
  // Impacts
  // ==========================================================================
  impact(point, normal, surface = 'concrete') {
    const dust = SURF_DUST[surface] ?? SURF_DUST.concrete;
    switch (surface) {
      case 'metal': this._impactMetal(point, normal, dust); break;
      case 'dirt': this._impactDirt(point, normal, dust); break;
      case 'wood': this._impactWood(point, normal, dust); break;
      case 'plaster': this._impactPlaster(point, normal, dust); break;
      default: this._impactConcrete(point, normal, dust); break;
    }
  }

  _dustPuff(point, normal, dust, { n = 4, size = 0.5, alpha = 0.5, up = 0.6, out = 1.4, life = 1 }) {
    this.smoke.burst(n, () => ({
      pos: _v1.copy(point).addScaledVector(normal, 0.05),
      vel: _v2.copy(normal).multiplyScalar(randRange(0.5, 1.0) * out)
        .add(_v3.set(randSpread(0.7), randRange(0.3, 1.0) * up + 0.2, randSpread(0.7))),
      life: randRange(0.55, 1.15) * life, size0: 0.1, size1: randRange(0.65, 1.35) * size,
      color: randPick(dust), alpha: alpha * randRange(0.8, 1.2), rotSpeed: randSpread(2),
      drag: 2.4, fadeIn: 0.06, fadeOut: 0.45,
    }));
  }

  _chips(point, normal, color, n, speed = 1) {
    for (let i = 0; i < n; i++) {
      this.debris.spawn({
        pos: point,
        vel: _v1.copy(normal).multiplyScalar(randRange(1.5, 4) * speed)
          .add(_v2.set(randSpread(2), randRange(1, 3), randSpread(2))),
        size: 0.028, life: randRange(1.2, 2), color,
      });
    }
  }

  _impactSparks(point, normal, n, { speed = 1, spread = 2.5 } = {}) {
    this.spark.burst(n, () => ({
      pos: point,
      vel: _v1.copy(normal).multiplyScalar(randRange(3, 7) * speed)
        .add(_v2.set(randSpread(spread), randSpread(spread) + 1.2, randSpread(spread))),
      life: randRange(0.28, 0.6), size0: 0.032, size1: 0.012,
      color: randPick([0xffd9a0, 0xffe8c0, 0xffc678]), alpha: 1,
      gravity: 11, drag: 0.9, stretch: 0.28, fadeOut: 0.6,
    }));
  }

  _holeDecal(point, normal, size) {
    this._decal(point, normal, size, randPick(this.decalMats.holes));
  }

  _impactConcrete(point, normal, dust) {
    this._dustPuff(point, normal, dust, { n: 6, size: 0.62, alpha: 0.55, life: 1.15 });
    this._impactSparks(point, normal, 3);
    this._chips(point, normal, 0x8f8578, 4);
    this._holeDecal(point, normal, randRange(0.09, 0.13));
  }

  _impactPlaster(point, normal, dust) {
    this._dustPuff(point, normal, dust, { n: 6, size: 0.7, alpha: 0.6, life: 1.25 });
    this._chips(point, normal, 0xcfc5b2, 3, 0.8);
    this._holeDecal(point, normal, randRange(0.1, 0.15));
  }

  _impactDirt(point, normal, dust) {
    this._dustPuff(point, normal, dust, { n: 8, size: 0.72, alpha: 0.62, up: 2.2, out: 1.0, life: 1.3 });
    // clod burst — taller and chunkier than concrete
    for (let i = 0; i < 6; i++) {
      this.debris.spawn({
        pos: point,
        vel: _v1.copy(normal).multiplyScalar(randRange(1.2, 2.6))
          .add(_v2.set(randSpread(1.6), randRange(1.8, 4.2), randSpread(1.6))),
        size: randRange(0.03, 0.06), life: randRange(1.2, 2), color: randPick(dust),
      });
    }
  }

  _impactWood(point, normal, dust) {
    this._dustPuff(point, normal, dust, { n: 3, size: 0.35, alpha: 0.42 });
    // splinters: elongated slivers tumbling out
    for (let i = 0; i < 5; i++) {
      this.debris.spawn({
        pos: point,
        vel: _v1.copy(normal).multiplyScalar(randRange(2, 4.5))
          .add(_v2.set(randSpread(2), randRange(0.8, 2.6), randSpread(2))),
        size: randRange(0.015, 0.03), life: randRange(1, 1.8),
        color: randPick([0xa8875c, 0x8a6d47, 0xbfa070]),
        scale3: { x: 0.3, y: randRange(2.4, 4.2), z: 0.3 }, spin: 16,
      });
    }
    this._holeDecal(point, normal, randRange(0.08, 0.12));
  }

  _impactMetal(point, normal, dust) {
    // bright spark shower
    this._impactSparks(point, normal, 16, { speed: 1.7, spread: 4 });
    // ricochet streaks: 1-2 long fast lines glancing away
    const nRico = 1 + (rand() < 0.4 ? 1 : 0);
    for (let i = 0; i < nRico; i++) {
      _v1.copy(normal).add(_v2.set(randSpread(0.9), randRange(0.1, 0.7), randSpread(0.9))).normalize();
      this.spark.emit({
        pos: point, vel: _v2.copy(_v1).multiplyScalar(randRange(24, 40)),
        life: randRange(0.22, 0.38), size0: 0.035, size1: 0.015,
        color: 0xffe8b8, alpha: 1, gravity: 6, drag: 0.35, stretch: 0.4, fadeOut: 0.5,
      });
    }
    // ping flash
    this.spark.emit({
      pos: _v1.copy(point).addScaledVector(normal, 0.03), vel: _v2.set(0, 0, 0),
      life: 0.05, size0: 0.14, size1: 0.05, color: 0xfff2cc, alpha: 1, fadeOut: 0.4,
    });
    // faint gray wisp
    this._dustPuff(point, normal, dust, { n: 2, size: 0.3, alpha: 0.3 });
    this._decal(point, normal, randRange(0.06, 0.09), randPick(this.decalMats.holes));
  }

  // ==========================================================================
  // Blood
  // ==========================================================================
  blood(point, dir) {
    // mist puff
    this.smoke.burst(4, () => ({
      pos: point,
      vel: _v1.copy(dir).multiplyScalar(randRange(0.8, 2.2))
        .add(_v2.set(randSpread(1.0), randSpread(0.8) + 0.3, randSpread(1.0))),
      life: randRange(0.3, 0.55), size0: 0.1, size1: randRange(0.45, 0.7),
      color: randPick([0x6a1410, 0x581009, 0x7a1a12]), alpha: 0.62,
      rotSpeed: randSpread(2), drag: 2.2, fadeIn: 0.02, fadeOut: 0.4,
    }));
    // darker droplets arcing with gravity
    this.smoke.burst(6, () => ({
      pos: point,
      vel: _v1.copy(dir).multiplyScalar(randRange(1.2, 3.2))
        .add(_v2.set(randSpread(1.8), randRange(0.4, 1.8), randSpread(1.8))),
      life: randRange(0.3, 0.6), size0: randRange(0.02, 0.045), size1: 0.02,
      color: 0x4a0b06, alpha: 0.95, gravity: 8, drag: 0.6, stretch: 0.12, fadeOut: 0.7,
    }));
    // small dark splat on the surface behind (tasteful, short raycast)
    if (rand() < 0.75) {
      _v3.copy(point).addScaledVector(dir, 0.1);
      const hit = this.game.world.colliders.raycast(_v3, dir, 3.0);
      if (hit) this._decal(hit.point, hit.normal, randRange(0.16, 0.3), this.decalMats.blood, 22);
    }
  }

  // ==========================================================================
  // Muzzle flash
  // ==========================================================================
  muzzleFlash(pos, dir, { scale = 1, light = true } = {}) {
    // star flash sprite — ~72ms so a 780rpm burst (77ms/shot) has a flash on
    // screen nearly every frame; front-loaded fade keeps the pop snappy.
    // Center sits 60% of the sprite radius FORWARD of the muzzle so the
    // fireball blooms off the tip instead of swallowing the barrel mid-length.
    // star kept compact (~0.28m) so the atlas spikes read instead of drowning
    // in a bloom disc that wraps the whole viewmodel
    this.flash.emit({
      pos: _v4.copy(pos).addScaledVector(dir, 0.6 * 0.14 * scale), vel: _v1.set(0, 0, 0), life: 0.072,
      size0: 0.24 * scale, size1: 0.28 * scale,
      color: 0xffd9a8, alpha: 0.55, rot: rand() * Math.PI * 2,
      fadeIn: 0.01, fadeOut: 0.3,
    });
    // hot core glow, hugging the tip — small and restrained: this sprite plus
    // bloom is what used to paint the ~1.5m orange sphere around the gun
    this.soft.emit({
      pos: _v4.copy(pos).addScaledVector(dir, 0.05 * scale), vel: _v1.set(0, 0, 0), life: 0.08,
      size0: 0.075 * scale, size1: 0.095 * scale, color: 0xffb266, alpha: 0.4, fadeOut: 0.35,
    });
    // forward gas jet: brief stretched streaks leaving the bore
    this.spark.burst(2, () => ({
      pos: _v3.copy(pos).addScaledVector(dir, 0.08 * scale),
      vel: _v1.copy(dir).multiplyScalar(randRange(5, 9)).add(_v2.set(randSpread(0.6), randSpread(0.6), randSpread(0.6))),
      life: randRange(0.03, 0.05), size0: 0.035 * scale, size1: 0.015 * scale,
      color: 0xffd28c, alpha: 0.9, drag: 3, stretch: 0.2, fadeOut: 0.4,
    }));
    // 2 short angled spikes off the tip: directional star points that stay
    // readable even when the halo blooms
    this.spark.burst(2, () => ({
      pos: _v3.copy(pos).addScaledVector(dir, 0.05 * scale),
      vel: _v1.copy(dir).multiplyScalar(randRange(2.2, 3.4))
        .add(_v2.set(randSpread(1.6), randSpread(1.6), randSpread(1.6))),
      life: randRange(0.04, 0.055), size0: 0.045 * scale, size1: 0.02 * scale,
      color: 0xffe2b8, alpha: 0.95, drag: 2, stretch: 0.6, fadeOut: 0.45,
    }));
    // paper-light smoke wisp drifting off the barrel
    this.smoke.emit({
      pos: _v1.copy(pos).addScaledVector(dir, 0.07),
      vel: _v2.copy(dir).multiplyScalar(randRange(0.35, 0.6)).add(_v3.set(randSpread(0.12), randRange(0.25, 0.45), randSpread(0.12))),
      life: randRange(0.5, 0.85), size0: 0.04 * scale, size1: randRange(0.18, 0.3) * scale,
      color: 0x8a8378, alpha: 0.2, rotSpeed: randSpread(1.6), drag: 1.8, fadeIn: 0.18, fadeOut: 0.45,
    });
    // decay 12 -> still ~23 intensity at 80ms; reads on nearby walls per shot
    if (light) this.flashLight(pos, 0xffb066, 60 * scale, 12, 14);
  }

  // ==========================================================================
  // Shells
  // ==========================================================================
  shellEject(pos, rightDir) {
    this.brass.spawn({
      pos,
      vel: _v1.copy(rightDir).multiplyScalar(randRange(1.5, 2.4)).add(_v2.set(randSpread(0.4), randRange(1.7, 2.5), randSpread(0.4))),
      size: 0.019, life: randRange(1.6, 2.4), spin: 24,
      // dark bronze albedo: the muzzle light's diffuse term is what used to
      // blow the case out to an emissive capsule — under flash it reads gold,
      // in shade it reads spent brass
      color: randPick([0x7d6124, 0x715a20, 0x86682c, 0x745c22]),
      scale3: { x: 0.55, y: 1.9, z: 0.55 }, restitution: 0.38, sizeJitter: false,
    });
    // one-flash glint (~2 frames) as the case leaves the port
    this.spark.emit({
      pos: _v1.copy(pos).addScaledVector(rightDir, 0.05),
      vel: _v2.copy(rightDir).multiplyScalar(1.8).add(_v3.set(0, 2.0, 0)),
      life: 0.034, size0: 0.011, size1: 0.005, color: 0xffe9b0, alpha: 0.45,
      gravity: 9, stretch: 0.16, fadeOut: 0.35,
    });
  }

  // ==========================================================================
  // Tracers
  // ==========================================================================
  tracer(from, to, { speed = 320, width = 0.016 } = {}) {
    _v1.copy(to).sub(from);
    const dist = _v1.length();
    if (dist < 0.5) return;
    _v1.multiplyScalar(1 / dist);
    let tr = null;
    for (const t of this.tracers) if (!t.active) { tr = t; break; }
    if (!tr) {
      if (this.tracers.length >= 40) return;
      tr = {
        // own material instance so opacity can dim per-tracer near the camera
        mesh: new THREE.Mesh(this.tracerGeo, this.tracerMat.clone()),
        active: false, from: new THREE.Vector3(), dir: new THREE.Vector3(),
        dist: 0, speed: 0, t: 0, len: 0, width: 0,
      };
      tr.mesh.frustumCulled = false;
      tr.mesh.renderOrder = 21;
      this.game.scene.add(tr.mesh);
      this.tracers.push(tr);
    }
    tr.active = true;
    tr.mesh.visible = true;
    tr.from.copy(from);
    tr.dir.copy(_v1);
    tr.dist = dist;
    tr.speed = speed;
    tr.t = randRange(1.2, 2.6);
    tr.len = randRange(1.5, 2.2);
    // hard cap: ~2-3px at 50m — every caller (player, AI, systems) obeys
    tr.width = Math.min(width, 0.02);
  }

  // ==========================================================================
  // Explosion (delegates to ExplosionFX) + lens feedback
  // ==========================================================================
  explosion(position, opts = {}) {
    this.explosionFX.spawn(position, opts);
    const radius = opts.radius ?? 6;
    const d = this.game.camera.position.distanceTo(position);
    const near = 1 - d / (radius * 3.2);
    if (near > 0) this.overlay.trigger(Math.min(1, near * 1.3));
  }

  /** Lingering smoke source. Returns a stop() function. */
  smokeColumn(position, { rate = 9, size = 1.6, life = 12 } = {}) {
    const em = { pos: position.clone(), rate, size, acc: 0, ttl: life };
    this.emitters.push(em);
    return () => { em.ttl = 0; };
  }

  // ==========================================================================
  // Frame update
  // ==========================================================================
  update(dt) {
    // feed scene fog + sun into the particle shaders (composites sprites
    // into the haze and lights smoke volumes from the sun side)
    const fog = this.game.scene.fog ?? null;
    const sun = this.game.world?.sun;
    if (sun) _sunDir.copy(sun.position).normalize();
    const sunCol = sun?.color;
    this.soft.setEnv(fog, _sunDir, sunCol);
    this.spark.setEnv(fog, _sunDir, sunCol);
    this.fire.setEnv(fog, _sunDir, sunCol);
    this.fireN.setEnv(fog, _sunDir, sunCol);
    this.flash.setEnv(fog, _sunDir, sunCol);
    this.smoke.setEnv(fog, _sunDir, sunCol);

    this.soft.update(dt);
    this.spark.update(dt);
    this.fire.update(dt);
    this.fireN.update(dt);
    this.flash.update(dt);
    this.smoke.update(dt);
    this.debris.update(dt);
    this.brass.update(dt);
    this.explosionFX.update(dt);
    this.overlay.update(dt);

    for (const s of this.lights) {
      if (s.ttl > 0) {
        s.light.intensity *= Math.exp(-s.decay * dt);
        if (s.light.intensity < 0.3) { s.light.intensity = 0; s.ttl = 0; }
      }
    }

    // tracers
    const camPos = this.game.camera.position;
    // meters-per-pixel at 1m: a 0.016-0.02m ribbon rasterizes to nothing past
    // ~15m (no MSAA under the composer), so hold a ~1.2px on-screen minimum —
    // still far under the 2-3px budget at 50m; world width stays capped close-up
    const mpp = 2 * Math.tan(THREE.MathUtils.degToRad(this.game.camera.fov * 0.5)) / Math.max(window.innerHeight, 1);
    for (const t of this.tracers) {
      if (!t.active) continue;
      t.t += dt * t.speed;
      if (t.t >= t.dist + t.len) {
        t.active = false;
        t.mesh.visible = false;
        continue;
      }
      const headT = Math.min(t.t, t.dist);
      const head = _v1.copy(t.from).addScaledVector(t.dir, headT);
      const tail = _v2.copy(t.from).addScaledVector(t.dir, Math.max(0, t.t - t.len));
      const mid = _v3.addVectors(head, tail).multiplyScalar(0.5);
      const len = head.distanceTo(tail);
      if (len < 0.01) { t.active = false; t.mesh.visible = false; continue; }
      t.mesh.position.copy(mid);
      const camDist = mid.distanceTo(camPos);
      // near-camera kill: fully faded inside 2.6m, ramping in by ~4.2m — the
      // first segment out of the muzzle can never hang as a glowing capsule
      const nearK = THREE.MathUtils.clamp((camDist - 2.6) / 1.6, 0, 1);
      t.mesh.material.opacity = nearK * THREE.MathUtils.clamp((camDist - 2.5) / 14, 0.25, 1);
      t.mesh.visible = nearK > 0.001;
      // width: >=1.2px so distant rounds survive rasterization, <=3.5px so a
      // close pass never fattens on screen, hard 0.3m world cap
      const wFloor = Math.max(t.width, camDist * mpp * 1.2);
      t.mesh.scale.set(Math.min(wFloor, camDist * mpp * 3.5, 0.3), len, 1);
      _v4.copy(camPos).sub(mid).normalize();
      _side.crossVectors(t.dir, _v4);
      if (_side.lengthSq() < 1e-6) _side.set(1, 0, 0); else _side.normalize();
      _v4.crossVectors(_side, t.dir).normalize();
      _m4.makeBasis(_side, t.dir, _v4);
      t.mesh.quaternion.setFromRotationMatrix(_m4);
    }

    // lingering smoke emitters
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const em = this.emitters[i];
      em.ttl -= dt;
      if (em.ttl <= 0) { this.emitters.splice(i, 1); continue; }
      em.acc += dt * em.rate;
      while (em.acc >= 1) {
        em.acc -= 1;
        this.smoke.emit({
          pos: _v1.set(em.pos.x + randSpread(0.7), em.pos.y + randRange(0, 0.6), em.pos.z + randSpread(0.7)),
          vel: _v2.set(randSpread(0.5), randRange(3.4, 5.0), randSpread(0.5)),
          life: randRange(4.5, 7.5), size0: em.size * randRange(0.55, 0.9), size1: em.size * randRange(3.0, 4.4),
          color: randPick([0x232019, 0x312c26, 0x1b1916]), alpha: 0.88,
          rotSpeed: randSpread(0.8), drag: 1.1, aspect: randRange(1.15, 1.7),
          fadeIn: 0.12, fadeOut: 0.55,
        });
      }
    }

    // NOTE: ambient dust motes are owned by src/world/atmosphere.js (world agent).

    // decals
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      d.ttl -= dt;
      if (d.ttl <= 0) {
        this.game.scene.remove(d.mesh);
        d.mesh.material.dispose();
        this.decals.splice(i, 1);
      } else if (d.ttl < d.fade) {
        d.mesh.material.opacity = d.ttl / d.fade;
      }
    }
  }
}
