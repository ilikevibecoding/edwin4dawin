import * as THREE from 'three';

/**
 * Visual effects. STUB — real particles, decals, muzzle flash, tracers, casings, explosions live in src/fx/* (VFX team).
 *
 * Required interface:
 *   async load()
 *   update(dt)
 *   muzzleFlash(position, direction)          // usually driven by 'weapon:fire'
 *   impact(point, normal, surface, direction) // driven by 'bullet:hit'
 *   explosion(position, radius, kind)         // driven by 'explosion'
 *   tracer(from, to)
 *   spawnCasing(position, velocity, angularVelocity)   // driven by 'weapon:casing'
 *   decal(point, normal, type, size)
 *   blood(point, direction)                   // driven by 'enemy:damaged'
 *
 * All FX must use game.settings.quality.particles as a density multiplier and pool their meshes.
 */
export class Effects {
  constructor(game) {
    this.game = game;
    this.events = game.events;
    this.root = new THREE.Group();
    this.root.name = 'Effects';
    game.scene.add(this.root);
    this._impacts = [];
    this._flashLight = new THREE.PointLight(0xffb060, 0, 6, 2);
    game.scene.add(this._flashLight);
    this._flashTime = 0;
    this._impactGeo = new THREE.SphereGeometry(0.03, 6, 4);
    this._impactMat = new THREE.MeshBasicMaterial({ color: 0xffe0a0 });

    this.events.on('weapon:fire', (e) => this.muzzleFlash(e.muzzle, e.direction));
    this.events.on('bullet:hit', (e) => this.impact(e.point, e.normal, e.surface, e.direction));
    this.events.on('explosion', (e) => this.explosion(e.position, e.radius, e.kind));
  }

  async load() {}

  muzzleFlash(position) {
    this._flashLight.position.copy(position);
    this._flashLight.intensity = 25;
    this._flashTime = 0.05;
  }

  impact(point, normal) {
    const m = new THREE.Mesh(this._impactGeo, this._impactMat);
    m.position.copy(point).addScaledVector(normal, 0.01);
    this.root.add(m);
    this._impacts.push({ mesh: m, life: 0.6 });
  }

  explosion(position, radius) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.4, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff8830, transparent: true, opacity: 0.8 }));
    m.position.copy(position);
    this.root.add(m);
    this._impacts.push({ mesh: m, life: 0.5, grow: radius });
  }

  tracer() {}
  spawnCasing() {}
  decal() {}
  blood() {}

  update(dt) {
    if (this._flashTime > 0) {
      this._flashTime -= dt;
      if (this._flashTime <= 0) this._flashLight.intensity = 0;
    }
    for (let i = this._impacts.length - 1; i >= 0; i--) {
      const it = this._impacts[i];
      it.life -= dt;
      if (it.grow) {
        it.mesh.scale.multiplyScalar(1 + dt * 4);
        it.mesh.material.opacity = Math.max(0, it.life * 1.6);
      }
      if (it.life <= 0) {
        this.root.remove(it.mesh);
        if (it.grow) { it.mesh.geometry.dispose(); it.mesh.material.dispose(); }
        this._impacts.splice(i, 1);
      }
    }
  }
}
