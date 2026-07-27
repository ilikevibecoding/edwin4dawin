import * as THREE from 'three';
import { bakeNoise } from './particles.js';

/**
 * Layered cinematic explosions: 1-frame HDR core, a GUARANTEED 6-10+ frame
 * fireball phase (white core / 2000K mid / soot rim, noise-eroded edges),
 * blast tongues, black smoke swallow arriving ~0.15s later, dirt columns,
 * a ground-hugging dust shockwave torus racing out at 15 m/s, gravity-arced
 * ember streaks, hot debris, skyline pillars, big scorch decals and a
 * LOCAL (range-limited) detonation light so the frame never grades orange.
 */

// Preallocated spawn palette (no per-explosion color churn)
const C_COREF = new THREE.Color(4.2, 4.0, 3.6);
const C_COREF1 = new THREE.Color(2.0, 1.2, 0.6);
const C_FIRE0 = new THREE.Color(3.3, 3.1, 2.8);
const C_FIRE1 = new THREE.Color(0.85, 0.6, 0.45);
const C_TONGUE0 = new THREE.Color(3.0, 2.6, 2.0);
const C_TONGUE1 = new THREE.Color(1.1, 0.45, 0.16);
const C_EMBER0 = new THREE.Color(2.7, 2.0, 1.25);
const C_EMBER1 = new THREE.Color(1.15, 0.42, 0.14);
const C_BLACK0 = new THREE.Color(0.03, 0.03, 0.03);
const C_BLACK1 = new THREE.Color(0.16, 0.15, 0.14);
const C_BODY0 = new THREE.Color(0.055, 0.05, 0.045);
const C_BODY1 = new THREE.Color(0.32, 0.29, 0.26);
const C_DIRT0 = new THREE.Color(0.4, 0.32, 0.22);
const C_DIRT1 = new THREE.Color(0.48, 0.4, 0.3);
const C_SKIRT0 = new THREE.Color(0.5, 0.44, 0.35);
const C_SKIRT1 = new THREE.Color(0.47, 0.42, 0.34);
const C_TRAIL0 = new THREE.Color(0.24, 0.22, 0.2);
const C_TRAIL1 = new THREE.Color(0.3, 0.28, 0.26);
const C_PILLAR0 = new THREE.Color(0.05, 0.05, 0.05);
const C_PILLAR1 = new THREE.Color(0.22, 0.21, 0.2);

/**
 * Dust shockwave annulus: ragged fbm ring band (peak at ~74% of the half-
 * extent) that reads as a torus of dust hugging the deck when laid flat.
 */
function shockRingCanvas(size = 256, seed = 41) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const n1 = bakeNoise(6, seed * 91 + 13);
  const n2 = bakeNoise(14, seed * 91 + 57);
  const n3 = bakeNoise(28, seed * 91 + 111);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const dx = u - 0.5, dy = v - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy) * 2; // 0 centre -> 1 edge
      const n = n1(u, v) * 0.5 + n2(u, v) * 0.32 + n3(u, v) * 0.18;
      // Ring band: sharp-ish leading edge, soft dusty trailing skirt.
      // The (0.96 - r) envelope guarantees zero alpha at the quad edge.
      const band = Math.exp(-Math.pow((r - 0.74) / (0.10 + n * 0.06), 2));
      const inner = Math.max(0, 1 - Math.abs(r - 0.52) / 0.3) * 0.25;
      let a = (band + inner) * (0.55 + 0.45 * n) * Math.max(0, Math.min(1, (0.96 - r) * 6));
      a = a > 1 ? 1 : a;
      const i = (y * size + x) * 4;
      const lum = 150 + n * 60;
      d[i] = lum;
      d[i + 1] = lum * 0.9;
      d[i + 2] = lum * 0.74;
      d[i + 3] = a * 235;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export class ExplosionSystem {
  constructor(scene, fx, decals) {
    this.scene = scene;
    this.fx = fx;
    this.decals = decals;
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();

    // Pooled ground shockwave rings (flat textured annuli, normal-blended
    // dust — lit haze, not glow). One per detonation, ~0.5s life.
    const ringTex = new THREE.CanvasTexture(shockRingCanvas(256));
    ringTex.wrapS = ringTex.wrapT = THREE.ClampToEdgeWrapping;
    ringTex.colorSpace = THREE.SRGBColorSpace;
    const ringGeo = new THREE.PlaneGeometry(1, 1);
    ringGeo.rotateX(-Math.PI / 2);
    this.rings = [];
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: ringTex, transparent: true, opacity: 0,
        depthWrite: false,
      });
      const m = new THREE.Mesh(ringGeo, mat);
      m.visible = false;
      m.renderOrder = 10; // above decals, below fire/smoke
      m.frustumCulled = false;
      scene.add(m);
      this.rings.push({ mesh: m, age: 0, life: 0.5, active: false, y0: 0, r0: 0 });
    }
  }

  spawn(pos, { radius = 6, big = false, scorch = true, column = big } = {}) {
    const fx = this.fx;
    const r = radius;
    const v = this._v;

    // 1. Core flash — 1-2 frames of near-white HDR at the heart.
    fx.fire.spawn({
      pos: v.set(pos.x, pos.y + r * 0.16, pos.z),
      life: 0.08, size0: r * 0.5, size1: r * 0.7,
      color0: C_COREF, color1: C_COREF1,
      alpha0: 1, alpha1: 0, fadeIn: 0,
    });

    // 2. Fireball cluster — 0.65-0.95s dwell. The pool's blackbody ramp
    //    gives each sprite a white 30% core, 2000K orange mid and a
    //    soot-black rim carved by a noise threshold that rises over life;
    //    the smoke swallow is DELAYED (see 3a) so a full-bright fireball
    //    phase of 10+ frames is guaranteed before anything covers it.
    const nFire = big ? 9 : 7;
    for (let i = 0; i < nFire; i++) {
      const ox = (Math.random() - 0.5) * r * 0.5;
      const oy = Math.random() * r * 0.42;
      const oz = (Math.random() - 0.5) * r * 0.5;
      fx.fire.spawn({
        pos: v.set(pos.x + ox, pos.y + oy + r * 0.08, pos.z + oz),
        vel: this._v2.set(ox * 2.0, 2.8 + Math.random() * 3.4, oz * 2.0),
        life: 0.65 + Math.random() * 0.3,
        size0: r * 0.24, size1: r * 0.58,
        color0: C_FIRE0, color1: C_FIRE1,
        alpha0: 1, alpha1: 0.3, drag: 1.6, rotVel: (Math.random() - 0.5) * 3, fadeIn: 0,
      });
    }

    // 2b. Blast tongues — fixed-length fire fingers spiking out of the core
    //     for the first ~0.35s (negative stretch = absolute metres).
    const nTongue = big ? 4 : 3;
    for (let i = 0; i < nTongue; i++) {
      const a = Math.random() * Math.PI * 2;
      fx.fire.spawn({
        pos: v.set(pos.x, pos.y + r * 0.15, pos.z),
        vel: this._v2.set(Math.cos(a) * (8 + Math.random() * 7), 5 + Math.random() * 6, Math.sin(a) * (8 + Math.random() * 7)),
        life: 0.26 + Math.random() * 0.14,
        size0: r * 0.085, size1: r * 0.05,
        color0: C_TONGUE0, color1: C_TONGUE1,
        alpha0: 1, alpha1: 0, drag: 2.6, grav: 3, fadeIn: 0,
        // Absolute length = |stretch| * size0 -> ~1.7-2.6m fingers at r=9
        stretch: -(2.2 + Math.random() * 1.2),
      });
    }

    // 3a. Black swallow — near-black, fully opaque puffs riding the
    //     fireball top, but arriving only after ~0.15s so the fire phase
    //     is never smothered at birth.
    const nBlack = big ? 5 : 4;
    for (let i = 0; i < nBlack; i++) {
      const ox = (Math.random() - 0.5) * r * 0.4;
      const oz = (Math.random() - 0.5) * r * 0.4;
      fx.smoke.spawn({
        pos: v.set(pos.x + ox, pos.y + r * (0.25 + Math.random() * 0.3), pos.z + oz),
        vel: this._v2.set(ox * 1.2, 6 + Math.random() * 3, oz * 1.2),
        life: 2.2 + Math.random() * 1.4,
        size0: r * 0.34, size1: r * (1.1 + Math.random() * 0.5),
        color0: C_BLACK0, color1: C_BLACK1,
        alpha0: 1.0, alpha1: 0, drag: 1.0, rotVel: (Math.random() - 0.5) * 0.6,
        delay: 0.14 + Math.random() * 0.08, fadeIn: 0.06,
      });
    }

    // 3b. Rolling smoke body filling in behind the black cap.
    const nSmoke = big ? 9 : 7;
    for (let i = 0; i < nSmoke; i++) {
      const ox = (Math.random() - 0.5) * r * 0.6;
      const oz = (Math.random() - 0.5) * r * 0.6;
      fx.smoke.spawn({
        pos: v.set(pos.x + ox, pos.y + Math.random() * r * 0.6, pos.z + oz),
        vel: this._v2.set(ox * 1.5, 3.2 + Math.random() * 4.0, oz * 1.5),
        life: 2.6 + Math.random() * 2.0,
        size0: r * 0.36, size1: r * (1.3 + Math.random() * 0.6),
        color0: C_BODY0, color1: C_BODY1,
        alpha0: 0.95, alpha1: 0, drag: 1.1, rotVel: (Math.random() - 0.5) * 1.2,
        delay: 0.22 + Math.random() * 0.12, fadeIn: 0.06,
      });
    }

    // 4. Dirt columns — towers of earth, the signature of real ordnance.
    for (let i = 0; i < 5; i++) {
      fx.smoke.spawn({
        pos: v.set(pos.x + (Math.random() - 0.5) * r * 0.35, pos.y + 0.2, pos.z + (Math.random() - 0.5) * r * 0.35),
        vel: this._v2.set((Math.random() - 0.5) * 3, 14 + Math.random() * 4, (Math.random() - 0.5) * 3),
        life: 1.8 + Math.random() * 0.6,
        size0: r * 0.18, size1: r * 0.5,
        color0: C_DIRT0, color1: C_DIRT1,
        alpha0: 0.9, alpha1: 0, drag: 0.6, rotVel: (Math.random() - 0.5) * 0.8,
        delay: Math.random() * 0.05, fadeIn: 0.03,
      });
    }

    // 5. Ground dust skirt — persistent low, wide ring hugging the deck.
    const nDust = big ? 8 : 6;
    for (let i = 0; i < nDust; i++) {
      const a = (i / nDust) * Math.PI * 2 + Math.random() * 0.5;
      const ca = Math.cos(a), sa = Math.sin(a);
      fx.smoke.spawn({
        pos: v.set(pos.x + ca * r * 0.3, pos.y + 0.35, pos.z + sa * r * 0.3),
        vel: this._v2.set(ca * (12 + Math.random() * 6), 0.5, sa * (12 + Math.random() * 6)),
        life: 2.2 + Math.random() * 0.4,
        size0: r * 0.4, size1: r * 1.6,
        color0: C_SKIRT0, color1: C_SKIRT1,
        alpha0: 0.6, alpha1: 0, drag: 1.8, fadeIn: 0,
      });
    }

    // 6. Shockwave — a flat dust torus racing outward at 15 m/s for 0.5s
    //    (pooled textured annulus) plus a few low billboard racers riding
    //    the same front so the ring has body.
    this._ring(pos, r);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.random() * 0.6;
      const ca = Math.cos(a), sa = Math.sin(a);
      fx.smoke.spawn({
        pos: v.set(pos.x + ca * r * 0.3, Math.max(0.5, pos.y * 0.3 + 0.4), pos.z + sa * r * 0.3),
        vel: this._v2.set(ca * 15, 0.4, sa * 15),
        life: 0.55,
        size0: 1, size1: 4.5,
        color0: C_SKIRT0, color1: C_SKIRT1,
        alpha0: 0.4, alpha1: 0, drag: 0.8, fadeIn: 0,
      });
    }

    // 7. Embers — gravity-arced streaks, 30-60 m/s launch with drag, living
    //    1.5-2.5s. The pool re-orients each quad along its CURRENT velocity
    //    every frame (gravity included) and shortens the stretch as speed
    //    decays, so arcs BEND — no ruler-straight radial lines. Capped at
    //    20-30 per burst; every 8th tows a sub-stepped smoke thread.
    const nEmber = big ? 26 : 16;
    for (let i = 0; i < nEmber; i++) {
      const a = Math.random() * Math.PI * 2;
      const up = 0.25 + Math.random() * 0.72;          // upper-hemisphere bias
      const hr = Math.sqrt(Math.max(0, 1 - up * up));
      const sp = 30 + Math.random() * 30;              // 30-60 m/s launch
      fx.fire.spawn({
        pos: v.set(pos.x, pos.y + 0.4, pos.z),
        vel: this._v2.set(Math.cos(a) * hr * sp, up * sp, Math.sin(a) * hr * sp),
        grav: 13, drag: 1.1, killY: pos.y + 0.03,
        life: 1.5 + Math.random() * 1.0,
        size0: 0.05, size1: 0.016,
        color0: C_EMBER0, color1: C_EMBER1,
        alpha0: 1, alpha1: 0, fadeIn: 0, stretch: 1,
        // Sparse smoke threads: at 30-60 m/s a tight spacing floods the
        // dust pool (hundreds of puffs/sec), so only every 10th ember tows
        // one, sampled every 1.2m — still an unbroken ribbon at speed.
        trail: i % 10 === 0 ? {
          every: 1.2,
          emit: (p) => fx.debrisDust.spawn({
            pos: p, vel: this._v2.set(0, 0.3, 0),
            life: 0.3 + Math.random() * 0.15, size0: 0.14, size1: 0.5,
            color0: C_TRAIL0, color1: C_TRAIL1,
            alpha0: 0.4, alpha1: 0, drag: 1.2, fadeIn: 0,
          }),
        } : null,
      });
    }

    // 8. Debris chunks — shards, planks and tumbling masonry; they spawn
    //    hot (ember-edge glow cooling over 0.4s), stretch along velocity
    //    while fast, and ~30% tow thin smoke trails.
    const nDeb = big ? 16 : 9;
    for (let i = 0; i < nDeb; i++) {
      this._v2.set((Math.random() - 0.5) * 14, 5 + Math.random() * 10, (Math.random() - 0.5) * 14);
      fx.debris.spawn(v.set(pos.x, pos.y + 0.5, pos.z), this._v2, 0.05 + Math.random() * 0.14, 2.6 + Math.random() * 1.6, 1);
    }

    // 8b. Skyline pillars — big detonations leave 2-3 slow near-black
    //     columns that keep climbing for 6-9s.
    if (big) {
      const nPillar = 2 + (Math.random() < 0.5 ? 1 : 0);
      for (let i = 0; i < nPillar; i++) {
        fx.smoke.spawn({
          pos: v.set(pos.x + (Math.random() - 0.5) * r * 0.3, pos.y + r * 0.5, pos.z + (Math.random() - 0.5) * r * 0.3),
          vel: this._v2.set((Math.random() - 0.5) * 0.6, 1.6 + Math.random() * 0.9, (Math.random() - 0.5) * 0.6),
          life: 6 + Math.random() * 3,
          size0: r * 0.5, size1: r * 2.2,
          color0: C_PILLAR0, color1: C_PILLAR1,
          alpha0: 0.65, alpha1: 0, drag: 0.25, rotVel: (Math.random() - 0.5) * 0.2,
          delay: 0.25 + Math.random() * 0.2, fadeIn: 0.5,
        });
      }
    }

    // 9. Detonation light — strong but LOCAL. Range is clamped (~2.4r,
    //    max 22m) so nearby facades bloom hot orange for a beat while the
    //    wider frame keeps its grade (the old r*9 throw shifted the whole
    //    screen orange during strikes).
    this.fx.lights.flash(v.set(pos.x, pos.y + 1.6, pos.z), {
      color: 0xff9440,
      intensity: big ? 520 : 300,
      life: big ? 0.4 : 0.3,
      distance: Math.min(r * 2.4, 22),
    });

    // 10. Persistent marks — a 3.5-4.8m scorch projected at every impact.
    if (scorch && this.decals) this.decals.scorch(pos, big ? 1.1 : 0.8);
    if (column) this.fx.addSmokeColumn(pos, 20 + Math.random() * 14);

    if (this.fx.onShake) this.fx.onShake(pos, big ? 1.6 : 1.0);
  }

  _ring(pos, r) {
    let slot = this.rings.find((s) => !s.active);
    if (!slot) slot = this.rings[0];
    slot.active = true;
    slot.age = 0;
    slot.life = 0.5;
    slot.r0 = r * 0.24;
    slot.y0 = pos.y + 0.24;
    slot.mesh.visible = true;
    slot.mesh.position.set(pos.x, slot.y0, pos.z);
    slot.mesh.rotation.y = Math.random() * Math.PI * 2;
    slot.mesh.material.opacity = 0.55;
  }

  update(dt) {
    // Shockwave rings: radius grows 15 m/s, lifting slightly as they fade.
    for (const s of this.rings) {
      if (!s.active) continue;
      s.age += dt;
      const t = s.age / s.life;
      if (t >= 1) { s.active = false; s.mesh.visible = false; continue; }
      const R = s.r0 + 15 * s.age;         // torus radius in metres
      const scale = R / 0.37;              // texture band peaks at 74% of half-extent
      s.mesh.scale.set(scale, 1, scale);
      s.mesh.position.y = s.y0 + t * 0.9;
      s.mesh.material.opacity = 0.55 * Math.pow(1 - t, 1.35);
    }
  }
}
