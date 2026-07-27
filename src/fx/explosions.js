import * as THREE from 'three';

/** Layered cinematic explosions: brief HDR core, 0.5-0.7s fireball swallowed
 *  almost immediately by opaque near-black smoke, dirt columns, a persistent
 *  ground dust skirt, shockwave racers, stretched embers, debris, skyline
 *  pillars, scorch, and a lingering smoke column on every big detonation. */
export class ExplosionSystem {
  constructor(scene, fx, decals) {
    this.scene = scene;
    this.fx = fx;
    this.decals = decals;
  }

  spawn(pos, { radius = 6, big = false, scorch = true, column = big } = {}) {
    const fx = this.fx;
    const r = radius;

    // 1. Core flash — small and brief; lives in the fire pool so the smoke
    //    shell (renderOrder 12) swallows it instead of washing the frame.
    fx.fire.spawn({
      pos: pos.clone().add(new THREE.Vector3(0, r * 0.16, 0)),
      life: 0.07, size0: r * 0.5, size1: r * 0.72,
      color0: new THREE.Color(3.4, 2.9, 2.1), color1: new THREE.Color(2.2, 1.1, 0.35),
      alpha0: 1, alpha1: 0, fadeIn: 0,
    });

    // 2. Fireball cluster — 0.5-0.7s dwell, white-hot core decaying to deep
    //    ember red so ACES rolls it off instead of clipping.
    const nFire = big ? 10 : 8;
    for (let i = 0; i < nFire; i++) {
      const off = new THREE.Vector3((Math.random() - 0.5) * r * 0.5, Math.random() * r * 0.42, (Math.random() - 0.5) * r * 0.5);
      fx.fire.spawn({
        pos: pos.clone().add(off),
        vel: new THREE.Vector3(off.x * 2.0, 2.6 + Math.random() * 3.6, off.z * 2.0),
        life: 0.5 + Math.random() * 0.2,
        size0: r * 0.22, size1: r * 0.55,
        color0: new THREE.Color(3.5, 2.6, 1.4), color1: new THREE.Color(0.6, 0.16, 0.03),
        alpha0: 1, alpha1: 0, drag: 1.6, rotVel: (Math.random() - 0.5) * 3, fadeIn: 0,
      });
    }

    // 3a. Black swallow — the first puffs are near-black and fully opaque,
    //     riding the fireball top at 6-9 m/s within 30-50ms of detonation.
    const nBlack = big ? 6 : 4;
    for (let i = 0; i < nBlack; i++) {
      const off = new THREE.Vector3((Math.random() - 0.5) * r * 0.4, r * (0.25 + Math.random() * 0.3), (Math.random() - 0.5) * r * 0.4);
      fx.smoke.spawn({
        pos: pos.clone().add(off),
        vel: new THREE.Vector3(off.x * 1.2, 6 + Math.random() * 3, off.z * 1.2),
        life: 2.2 + Math.random() * 1.4,
        size0: r * 0.34, size1: r * (1.1 + Math.random() * 0.5),
        color0: new THREE.Color(0.03, 0.03, 0.03), color1: new THREE.Color(0.16, 0.15, 0.14),
        alpha0: 1.0, alpha1: 0, drag: 1.0, rotVel: (Math.random() - 0.5) * 0.6,
        delay: 0.03 + Math.random() * 0.02, fadeIn: 0.03,
      });
    }

    // 3b. Rolling smoke body filling in behind the black cap.
    const nSmoke = big ? 12 : 8;
    for (let i = 0; i < nSmoke; i++) {
      const off = new THREE.Vector3((Math.random() - 0.5) * r * 0.6, Math.random() * r * 0.6, (Math.random() - 0.5) * r * 0.6);
      fx.smoke.spawn({
        pos: pos.clone().add(off),
        vel: new THREE.Vector3(off.x * 1.5, 3.2 + Math.random() * 4.0, off.z * 1.5),
        life: 2.6 + Math.random() * 2.0,
        size0: r * 0.36, size1: r * (1.3 + Math.random() * 0.6),
        color0: new THREE.Color(0.05, 0.048, 0.045), color1: new THREE.Color(0.3, 0.28, 0.26),
        alpha0: 0.95, alpha1: 0, drag: 1.1, rotVel: (Math.random() - 0.5) * 1.2,
        delay: 0.07 + Math.random() * 0.06, fadeIn: 0.05,
      });
    }

    // 4. Dirt columns — six towers of earth, the signature of real ordnance.
    for (let i = 0; i < 6; i++) {
      fx.smoke.spawn({
        pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * r * 0.35, 0.2, (Math.random() - 0.5) * r * 0.35)),
        vel: new THREE.Vector3((Math.random() - 0.5) * 3, 14 + Math.random() * 4, (Math.random() - 0.5) * 3),
        life: 1.8 + Math.random() * 0.6,
        size0: r * 0.18, size1: r * 0.5,
        color0: new THREE.Color(0.32, 0.26, 0.19), color1: new THREE.Color(0.42, 0.35, 0.26),
        alpha0: 0.9, alpha1: 0, drag: 0.6, rotVel: (Math.random() - 0.5) * 0.8,
        delay: Math.random() * 0.05, fadeIn: 0.03,
      });
    }

    // 5. Ground dust skirt — persistent low, wide ring hugging the deck,
    //    racing outward at 12-18 m/s and dying into a broad haze.
    const nDust = big ? 12 : 8;
    for (let i = 0; i < nDust; i++) {
      const a = (i / nDust) * Math.PI * 2 + Math.random() * 0.5;
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      fx.smoke.spawn({
        pos: pos.clone().addScaledVector(dir, r * 0.3).add(new THREE.Vector3(0, 0.35, 0)),
        vel: dir.clone().multiplyScalar(12 + Math.random() * 6).add(new THREE.Vector3(0, 0.5, 0)),
        life: 2.2 + Math.random() * 0.4,
        size0: r * 0.4, size1: r * 1.6,
        color0: new THREE.Color(0.5, 0.44, 0.35), color1: new THREE.Color(0.47, 0.42, 0.34),
        alpha0: 0.6, alpha1: 0, drag: 1.8, fadeIn: 0,
      });
    }

    // 6. Shockwave dust wave — ground-hugging billboards racing outward
    //    (replaces the old flat ring donut).
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.35;
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      fx.smoke.spawn({
        pos: new THREE.Vector3(pos.x, Math.max(0.5, pos.y * 0.3 + 0.4), pos.z).addScaledVector(dir, r * 0.3),
        vel: dir.clone().multiplyScalar(35),
        life: 0.7,
        size0: 1, size1: 6,
        color0: new THREE.Color(0.52, 0.46, 0.37), color1: new THREE.Color(0.5, 0.45, 0.37),
        alpha0: 0.42, alpha1: 0, drag: 0.9, fadeIn: 0,
      });
    }

    // 7. Embers — dense HDR sparks, stretched along their velocity. Every
    //    5th ember tows a sub-stepped smoke thread (puff every 0.4m of
    //    travel, interpolated along the frame segment) so the arcs read as
    //    continuous smoking debris, never dotted dashes.
    const nEmber = big ? 72 : 36;
    for (let i = 0; i < nEmber; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 18, 5 + Math.random() * 14, (Math.random() - 0.5) * 18);
      fx.fire.spawn({
        pos: pos.clone().add(new THREE.Vector3(0, 0.4, 0)),
        vel: v, grav: 15, life: 0.6 + Math.random() * 0.8,
        size0: 0.14, size1: 0.02,
        color0: new THREE.Color(3.0, 2.2, 1.0), color1: new THREE.Color(2.2, 0.55, 0.1),
        alpha0: 1, alpha1: 0, fadeIn: 0, stretch: 2.4 + Math.random() * 1.2,
        trail: i % 5 === 0 ? {
          every: 0.4,
          emit: (p) => fx.debrisDust.spawn({
            pos: p, vel: new THREE.Vector3(0, 0.3, 0),
            life: 0.3 + Math.random() * 0.2, size0: 0.1, size1: 0.42,
            color0: new THREE.Color(0.24, 0.22, 0.2), color1: new THREE.Color(0.3, 0.28, 0.26),
            alpha0: 0.45, alpha1: 0, drag: 1.2, fadeIn: 0,
          }),
        } : null,
      });
    }

    // 8. Debris chunks — shards, planks and tumbling masonry
    const nDeb = big ? 18 : 10;
    for (let i = 0; i < nDeb; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 13, 4 + Math.random() * 9, (Math.random() - 0.5) * 13);
      fx.debris.spawn(pos.clone().add(new THREE.Vector3(0, 0.5, 0)), v, 0.05 + Math.random() * 0.14, 2.6 + Math.random() * 1.6);
    }

    // 8b. Skyline pillars — big detonations leave 2-3 slow near-black
    //     columns that keep climbing for 6-9s.
    if (big) {
      const nPillar = 2 + (Math.random() < 0.5 ? 1 : 0);
      for (let i = 0; i < nPillar; i++) {
        fx.smoke.spawn({
          pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * r * 0.3, r * 0.5, (Math.random() - 0.5) * r * 0.3)),
          vel: new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.6 + Math.random() * 0.9, (Math.random() - 0.5) * 0.6),
          life: 6 + Math.random() * 3,
          size0: r * 0.5, size1: r * 2.2,
          color0: new THREE.Color(0.05, 0.05, 0.05), color1: new THREE.Color(0.22, 0.21, 0.2),
          alpha0: 0.65, alpha1: 0, drag: 0.25, rotVel: (Math.random() - 0.5) * 0.2,
          delay: 0.25 + Math.random() * 0.2, fadeIn: 0.5,
        });
      }
    }

    // 9. Light flash — physical-units point strong enough that the nearest
    //    facades visibly bloom warm-orange for ~150ms (sun is intensity 4;
    //    1200/d^2 beats it out to ~17m before the (1-t)^2 decay bites).
    this.fx.lights.flash(pos.clone().add(new THREE.Vector3(0, 1.6, 0)), {
      color: 0xff8f30, intensity: big ? 1200 : 600, life: big ? 0.5 : 0.34, distance: r * 9,
    });

    // 10. Persistent marks
    if (scorch && this.decals) this.decals.scorch(pos, big ? 1.4 : 0.8);
    if (column) this.fx.addSmokeColumn(pos, 20 + Math.random() * 14);

    if (this.fx.onShake) this.fx.onShake(pos, big ? 1.6 : 1.0);
  }

  update(dt) {
    // All layers are particle-driven now; nothing to integrate here.
    void dt;
  }
}
