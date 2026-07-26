import * as THREE from 'three';

/** Layered cinematic explosions: flash, fireball, smoke, dust ring,
 *  shockwave, embers, debris, scorch, lingering smoke column. */
export class ExplosionSystem {
  constructor(scene, fx, decals) {
    this.scene = scene;
    this.fx = fx;
    this.decals = decals;
    this.rings = [];
    this._ringGeo = new THREE.RingGeometry(0.72, 1, 42);
    this._ringGeo.rotateX(-Math.PI / 2);
  }

  spawn(pos, { radius = 6, big = false, scorch = true, column = big } = {}) {
    const fx = this.fx;
    const r = radius;

    // 1. Core flash
    fx.flash.spawn({
      pos: pos.clone().add(new THREE.Vector3(0, r * 0.18, 0)),
      life: 0.1, size0: r * 1.15, size1: r * 1.7, alpha0: 1, alpha1: 0, fadeIn: 0,
    });

    // 2. Fireball cluster
    const nFire = big ? 15 : 9;
    for (let i = 0; i < nFire; i++) {
      const off = new THREE.Vector3((Math.random() - 0.5) * r * 0.55, Math.random() * r * 0.5, (Math.random() - 0.5) * r * 0.55);
      fx.fire.spawn({
        pos: pos.clone().add(off),
        vel: new THREE.Vector3(off.x * 2.2, 3.2 + Math.random() * 4.5, off.z * 2.2),
        life: 0.4 + Math.random() * 0.4,
        size0: r * (0.28 + Math.random() * 0.18), size1: r * (0.7 + Math.random() * 0.4),
        color0: new THREE.Color(1.0, 0.92, 0.72), color1: new THREE.Color(0.85, 0.3, 0.05),
        alpha0: 0.95, alpha1: 0, drag: 1.6, rotVel: (Math.random() - 0.5) * 3, fadeIn: 0,
      });
    }

    // 3. Rolling black smoke
    const nSmoke = big ? 18 : 9;
    for (let i = 0; i < nSmoke; i++) {
      const off = new THREE.Vector3((Math.random() - 0.5) * r * 0.7, Math.random() * r * 0.7, (Math.random() - 0.5) * r * 0.7);
      fx.smoke.spawn({
        pos: pos.clone().add(off),
        vel: new THREE.Vector3(off.x * 1.4, 3.2 + Math.random() * 4.2, off.z * 1.4),
        life: 3.0 + Math.random() * 2.5,
        size0: r * 0.32, size1: r * (1.5 + Math.random() * 0.7),
        color0: new THREE.Color(0.07, 0.065, 0.06), color1: new THREE.Color(0.38, 0.36, 0.34),
        alpha0: 0.92, alpha1: 0, drag: 1.1, rotVel: (Math.random() - 0.5) * 1.2, fadeIn: 0.08,
      });
    }

    // 4. Ground dust ring
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

    // 5. Embers
    const nEmber = big ? 22 : 12;
    for (let i = 0; i < nEmber; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 16, 5 + Math.random() * 13, (Math.random() - 0.5) * 16);
      fx.fire.spawn({
        pos: pos.clone().add(new THREE.Vector3(0, 0.4, 0)),
        vel: v, grav: 15, life: 0.5 + Math.random() * 0.7,
        size0: 0.1, size1: 0.03,
        color0: new THREE.Color(1, 0.8, 0.4), color1: new THREE.Color(1, 0.3, 0.06),
        alpha0: 1, alpha1: 0, fadeIn: 0,
      });
    }

    // 6. Debris chunks
    const nDeb = big ? 13 : 7;
    for (let i = 0; i < nDeb; i++) {
      const v = new THREE.Vector3((Math.random() - 0.5) * 14, 5 + Math.random() * 11, (Math.random() - 0.5) * 14);
      fx.debris.spawn(pos.clone().add(new THREE.Vector3(0, 0.5, 0)), v, 0.07 + Math.random() * 0.16, 2.6 + Math.random() * 1.4);
    }

    // 7. Shockwave ring
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffe6bb, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(this._ringGeo, mat);
    ring.position.copy(pos).setY(Math.max(0.12, pos.y * 0.4));
    ring.renderOrder = 14;
    this.scene.add(ring);
    this.rings.push({ mesh: ring, age: 0, life: 0.42, maxR: r * 2.6 });

    // 8. Light flash
    this.fx.lights.flash(pos.clone().add(new THREE.Vector3(0, 1.4, 0)), {
      color: 0xffa54d, intensity: big ? 320 : 160, life: big ? 0.5 : 0.32, distance: r * 7,
    });

    // 9. Persistent marks
    if (scorch && this.decals) this.decals.scorch(pos, big ? 1.4 : 0.8);
    if (column) this.fx.addSmokeColumn(pos, 20 + Math.random() * 14);

    if (this.fx.onShake) this.fx.onShake(pos, big ? 1.6 : 1.0);
  }

  update(dt) {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.age += dt;
      const t = r.age / r.life;
      if (t >= 1) {
        this.scene.remove(r.mesh);
        r.mesh.material.dispose();
        this.rings.splice(i, 1);
        continue;
      }
      const eased = 1 - (1 - t) * (1 - t);
      const s = 0.6 + eased * r.maxR;
      r.mesh.scale.set(s, 1, s);
      r.mesh.material.opacity = 0.5 * (1 - t);
    }
  }
}
