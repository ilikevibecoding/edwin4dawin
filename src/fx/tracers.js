import * as THREE from 'three';

/** Tracer rounds: glowing elongated quads flying along the shot line. */
export class TracerSystem {
  constructor(scene, capacity = 48) {
    this.scene = scene;
    this.items = [];
    this.pool = [];
    const geo = new THREE.CylinderGeometry(0.011, 0.011, 1, 5, 1, true);
    geo.rotateX(Math.PI / 2); // align to +Z
    for (let i = 0; i < capacity; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffc878,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      m.renderOrder = 13;
      scene.add(m);
      this.pool.push(m);
    }
  }

  fire(from, to, speed = 320, color = 0xffc878) {
    const m = this.pool.pop();
    if (!m) return;
    const dir = to.clone().sub(from);
    const dist = dir.length();
    dir.normalize();
    const len = Math.min(4.2, dist * 0.5);
    m.visible = true;
    m.material.color.set(color);
    m.scale.set(1, 1, len);
    m.position.copy(from);
    m.lookAt(to);
    this.items.push({ m, pos: from.clone(), dir, dist, traveled: 0, speed, len });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const t = this.items[i];
      t.traveled += t.speed * dt;
      if (t.traveled >= t.dist) {
        t.m.visible = false;
        this.pool.push(t.m);
        this.items.splice(i, 1);
        continue;
      }
      t.m.position.copy(t.pos).addScaledVector(t.dir, t.traveled);
      const remain = t.dist - t.traveled;
      t.m.scale.z = Math.min(t.len, remain);
      t.m.material.opacity = 0.5 + Math.min(1, remain / 20) * 0.45;
    }
  }
}

/** Ejected brass casings with simple ground bounce. */
export class CasingSystem {
  constructor(scene, capacity = 50) {
    const geo = new THREE.CylinderGeometry(0.007, 0.007, 0.03, 6);
    const mat = new THREE.MeshStandardMaterial({ color: 0xc8a24a, roughness: 0.3, metalness: 0.95 });
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    scene.add(this.mesh);
    this.capacity = capacity;
    this.items = new Array(capacity).fill(null);
    this.free = [];
    for (let i = 0; i < capacity; i++) this.free.push(i);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < capacity; i++) this.mesh.setMatrixAt(i, this._zero);
    this.onBounce = null;
  }

  eject(pos, rightDir, upBias = 1) {
    if (!this.free.length) return;
    const i = this.free.pop();
    const vel = rightDir.clone().multiplyScalar(1.0 + Math.random() * 0.6);
    vel.y = 1.1 * upBias + Math.random() * 0.5;
    this.items[i] = {
      pos: pos.clone(), vel,
      rot: new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3),
      rotVel: new THREE.Vector3((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30),
      age: 0, life: 5, bounced: false,
    };
  }

  update(dt) {
    for (let i = 0; i < this.capacity; i++) {
      const c = this.items[i];
      if (!c) continue;
      c.age += dt;
      if (c.age > c.life) {
        this.items[i] = null;
        this.free.push(i);
        this.mesh.setMatrixAt(i, this._zero);
        continue;
      }
      c.vel.y -= 13 * dt;
      c.pos.addScaledVector(c.vel, dt);
      if (c.pos.y < 0.02) {
        c.pos.y = 0.02;
        c.vel.y = Math.abs(c.vel.y) * 0.35;
        c.vel.x *= 0.6; c.vel.z *= 0.6;
        c.rotVel.multiplyScalar(0.5);
        if (!c.bounced) {
          c.bounced = true;
          if (this.onBounce) this.onBounce();
        }
        if (Math.abs(c.vel.y) < 0.4) { c.vel.set(0, 0, 0); c.rotVel.set(0, 0, 0); }
      }
      c.rot.x += c.rotVel.x * dt; c.rot.y += c.rotVel.y * dt; c.rot.z += c.rotVel.z * dt;
      const fade = c.age > c.life * 0.85 ? 1 - (c.age - c.life * 0.85) / (c.life * 0.15) : 1;
      this._q.setFromEuler(c.rot);
      this._m.compose(c.pos, this._q, new THREE.Vector3(fade, fade, fade));
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
