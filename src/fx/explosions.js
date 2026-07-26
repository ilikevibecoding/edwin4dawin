import * as THREE from 'three';

/** Layered cinematic explosions: brief HDR core, compact fireball swallowed
 *  by delayed black smoke, dirt columns, ground dust wave, embers, debris,
 *  scorch, lingering smoke column. */
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

    // 2. Fireball cluster — tight, short-lived, HDR-decaying so ACES rolls
    //    the core off to warm white instead of clipping.
    const nFire = big ? 10 : 8;
    for (let i = 0; i < nFire; i++) {
      const off = new THREE.Vector3((Math.random() - 0.5) * r * 0.5, Math.random() * r * 0.42, (Math.random() - 0.5) * r * 0.5);
      fx.fire.spawn({
        pos: pos.clone().add(off),
        vel: new THREE.Vector3(off.x * 2.0, 2.6 + Math.random() * 3.6, off.z * 2.0),
        life: 0.25 + Math.random() * 0.2,
        size0: r * 0.22, size1: r * 0.55,
        color0: new THREE.Color(2.6, 1.9, 1.1), color1: new THREE.Color(0.45, 0.1, 0.02),
        alpha0: 1, alpha1: 0, drag: 1.6, rotVel: (Math.random() - 0.5) * 3, fadeIn: 0,
      });
    }

    // 3. Rolling black smoke — enters ~80-120ms after the fire and draws
    //    over it, so the fireball is visibly swallowed by its own smoke.
    const nSmoke = big ? 16 : 10;
    for (let i = 0; i < nSmoke; i++) {
      const off = new THREE.Vector3((Math.random() - 0.5) * r * 0.6, Math.random() * r * 0.6, (Math.random() - 0.5) * r * 0.6);
      fx.smoke.spawn({
        pos: pos.clone().add(off),
        vel: new THREE.Vector3(off.x * 1.5, 3.2 + Math.random() * 4.0, off.z * 1.5),
        life: 2.6 + Math.random() * 2.0,
        size0: r * 0.36, size1: r * (1.3 + Math.random() * 0.6),
        color0: new THREE.Color(0.05, 0.048, 0.045), color1: new THREE.Color(0.3, 0.28, 0.26),
        alpha0: 0.95, alpha1: 0, drag: 1.1, rotVel: (Math.random() - 0.5) * 1.2,
        delay: 0.08 + Math.random() * 0.04, fadeIn: 0.05,
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

    // 5. Ground dust ring
    const nDust = big ? 16 : 10;
    for (let i = 0; i < nDust; i++) {
      const a = (i / nDust) * Math.PI * 2 + Math.random() * 0.4;
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      fx.smoke.spawn({
        pos: pos.clone().addScaledVector(dir, r * 0.45).add(new THREE.Vector3(0, 0.3, 0)),
        vel: dir.clone().multiplyScalar(9 + Math.random() * 6).add(new THREE.Vector3(0, 1.4, 0)),
        life: 1.1 + Math.random() * 0.8,
        size0: r * 0.22, size1: r * 0.75,
        color0: new THREE.Color(0.6, 0.53, 0.42), color1: new THREE.Color(0.55, 0.49, 0.4),
        alpha0: 0.6, alpha1: 0, drag: 2.6, fadeIn: 0,
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
        alpha0: 0.5, alpha1: 0, drag: 0.9, fadeIn: 0,
      });
    }

    // 7. Embers (HDR sparks through the premultiplied fire pool)
    const nEmber = big ? 22 : 12;
    for (let i = 0; i < nEmber; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 16, 5 + Math.random() * 13, (Math.random() - 0.5) * 16);
      fx.fire.spawn({
        pos: pos.clone().add(new THREE.Vector3(0, 0.4, 0)),
        vel: v, grav: 15, life: 0.5 + Math.random() * 0.7,
        size0: 0.1, size1: 0.03,
        color0: new THREE.Color(3.0, 2.2, 1.0), color1: new THREE.Color(2.2, 0.55, 0.1),
        alpha0: 1, alpha1: 0, fadeIn: 0,
      });
    }

    // 8. Debris chunks — shards, planks and tumbling masonry
    const nDeb = big ? 18 : 10;
    for (let i = 0; i < nDeb; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 13, 4 + Math.random() * 9, (Math.random() - 0.5) * 13);
      fx.debris.spawn(pos.clone().add(new THREE.Vector3(0, 0.5, 0)), v, 0.05 + Math.random() * 0.14, 2.6 + Math.random() * 1.6);
    }

    // 9. Light flash
    this.fx.lights.flash(pos.clone().add(new THREE.Vector3(0, 1.4, 0)), {
      color: 0xffa54d, intensity: big ? 320 : 160, life: big ? 0.5 : 0.32, distance: r * 7,
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
