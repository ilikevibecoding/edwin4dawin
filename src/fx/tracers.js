import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Tracer strip texture. U runs along the round (u=1 head, tail tapers to
 * nothing); V is the cross-section: a white-hot core line filling the
 * central third of the strip (~0.03m of the 0.09m width) melting into an
 * orange glow sheath that rolls off to zero at the edges — core + sheath
 * baked into one quad so the whole round is a single crossed-plane mesh.
 */
function tracerCanvas(w = 128, h = 32) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  for (let y = 0; y < h; y++) {
    const vy = Math.abs((y + 0.5) / h - 0.5) * 2; // 0 centre -> 1 edge
    const core = Math.pow(cl(1 - vy / 0.34), 1.2);
    const sheath = Math.pow(cl(1 - vy), 2.2) * 0.5;
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      const along = u > 0.86 ? 1 : 0.06 + 0.94 * Math.pow(u / 0.86, 1.7);
      const a = cl(core + sheath) * along;
      const i = (y * w + x) * 4;
      d[i] = 255;
      d[i + 1] = 140 + 115 * cl(core * 1.35);
      d[i + 2] = 40 + 215 * cl(core * 1.15 - 0.12);
      d[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Two crossed 0.09m planes spanning z in [-1, 0]; head at z=0 (u=1).
 *  The baked V-profile puts a ~0.03m white-hot core inside the 0.09m
 *  additive glow sheath. */
function tracerGeometry() {
  const p1 = new THREE.PlaneGeometry(1, 0.09);
  p1.rotateY(-Math.PI / 2);   // length along +Z, u=0 at the -Z end
  p1.translate(0, 0, -0.5);   // span [-1, 0]; scale.z stretches the tail back
  const p2 = p1.clone();
  p2.rotateZ(Math.PI / 2);
  return mergeGeometries([p1, p2]);
}

/** Tracer rounds: 1.2-1.8m velocity-stretched segments — white-hot core in
 *  an orange sheath, HDR-bright so bloom carries them at 1080p, with slight
 *  per-round jitter. AI rounds (color != null) are thinned to every
 *  2nd-3rd shot; player rounds always draw. */
export class TracerSystem {
  constructor(scene, capacity = 48) {
    this.scene = scene;
    this.items = [];
    this.pool = [];
    this._aiN = 0;
    const geo = tracerGeometry();
    const map = new THREE.CanvasTexture(tracerCanvas());
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    map.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < capacity; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false, // HDR color >1 feeds bloom directly
      });
      mat.color.setRGB(4.4, 3.6, 2.4);
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      m.renderOrder = 13;
      scene.add(m);
      // Preallocated flight record — fire() copies into it, zero allocs.
      this.pool.push({ m, pos: new THREE.Vector3(), dir: new THREE.Vector3(), dist: 0, traveled: 0, speed: 900, len: 1.5 });
    }
  }

  fire(from, to, speed = 900, color = null) {
    // AI rounds pass a tint; draw only every 2nd-3rd of those so enemy fire
    // reads as intermittent tracer, not a laser hose.
    if (color != null) {
      this._aiN = (this._aiN + 1) % 5;
      if (this._aiN !== 0 && this._aiN !== 2) return;
    }
    const t = this.pool.pop();
    if (!t) return;
    const m = t.m;
    // Slight per-round jitter so bursts don't stack into one beam
    t.pos.copy(from);
    t.pos.x += (Math.random() - 0.5) * 0.05;
    t.pos.y += (Math.random() - 0.5) * 0.05;
    t.pos.z += (Math.random() - 0.5) * 0.05;
    t.dir.copy(to).sub(t.pos);
    t.dist = t.dir.length();
    if (t.dist < 1e-4) { this.pool.push(t); return; }
    t.dir.multiplyScalar(1 / t.dist);
    t.traveled = 0;
    t.speed = speed;
    t.len = Math.min(1.2 + Math.random() * 0.6, t.dist * 0.6); // 1.2-1.8m
    m.visible = true;
    // Well above 1.0 so bloom picks the core up at any range
    if (color != null) m.material.color.set(color).multiplyScalar(3.4);
    else m.material.color.setRGB(4.4, 3.6, 2.4);
    m.material.color.multiplyScalar(0.85 + Math.random() * 0.3);
    m.material.opacity = 1;
    m.scale.set(1, 1, 0.05);
    m.position.copy(t.pos);
    m.lookAt(to);
    this.items.push(t);
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const t = this.items[i];
      t.traveled += t.speed * dt;
      if (t.traveled >= t.dist) {
        t.m.visible = false;
        this.pool.push(t);
        this.items.splice(i, 1);
        continue;
      }
      // Head rides the bullet; tail stretches up to len behind it.
      t.m.position.copy(t.pos).addScaledVector(t.dir, t.traveled);
      t.m.scale.z = Math.max(0.05, Math.min(t.len, t.traveled));
      // Fade out over the last 25% of travel
      const k = t.traveled / t.dist;
      t.m.material.opacity = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
    }
  }
}

/* ------------------------------ brass ---------------------------------- */

/** Merged tapered rifle case with a real extractor-groove read: main body,
 *  neck cone, recessed groove band and protruding rim above the case head. */
function casingGeometry() {
  const body = new THREE.CylinderGeometry(0.0036, 0.0039, 0.0246, 12);
  body.translate(0, 0.0027, 0);                       // y in [-0.0096, 0.0150]
  const neck = new THREE.CylinderGeometry(0.0023, 0.0036, 0.0065, 12);
  neck.translate(0, 0.015 + 0.0032, 0);
  const groove = new THREE.CylinderGeometry(0.0029, 0.0029, 0.0026, 12);
  groove.translate(0, -0.0109, 0);                    // recessed extractor groove
  const base = new THREE.CylinderGeometry(0.0039, 0.0039, 0.0028, 12);
  base.translate(0, -0.0136, 0);
  const rim = new THREE.CylinderGeometry(0.0042, 0.0042, 0.0012, 12);
  rim.translate(0, -0.0156, 0);
  return mergeGeometries([body, neck, groove, base, rim]);
}

/** Small noise canvas so the brass roughness breaks up sun highlights. */
function brassRoughCanvas(size = 64) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let i = 0; i < size * size; i++) {
    const v = 195 + Math.random() * 60;
    d[i * 4] = v; d[i * 4 + 1] = v; d[i * 4 + 2] = v; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Ejected brass casings: 3-4 m/s right-rear arcs with hard tumble that
 *  cross the frame, ground bounce, then sink into the dirt instead of
 *  shrink-despawning. (The 1-2 frame eject glint is spawned by the shooter
 *  into the FX flash pool at the eject port.) */
export class CasingSystem {
  constructor(scene, capacity = 50) {
    const geo = casingGeometry();
    const roughMap = new THREE.CanvasTexture(brassRoughCanvas());
    roughMap.wrapS = roughMap.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshStandardMaterial({
      color: 0xc8a24a, roughness: 0.22, metalness: 0.95, roughnessMap: roughMap,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    scene.add(this.mesh);
    this.capacity = capacity;
    this.items = new Array(capacity).fill(null);
    this.recs = new Array(capacity);
    this.free = [];
    for (let i = 0; i < capacity; i++) {
      this.free.push(i);
      this.recs[i] = {
        pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        rot: new THREE.Euler(), rotVel: new THREE.Vector3(),
        age: 0, bounced: false, groundT: 0, sinkT: -1, restY: 0.008,
      };
    }
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._dir = new THREE.Vector3();
    // 1.3x instance scale: brass must survive three consecutive burst frames
    this._one = new THREE.Vector3(1.3, 1.3, 1.3);
    this._zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < capacity; i++) this.mesh.setMatrixAt(i, this._zero);
    this.onBounce = null;
  }

  eject(pos, rightDir, backDir = null) {
    if (!this.free.length) return;
    const i = this.free.pop();
    // 3.1-4.0 m/s along (right + 0.55 up + 0.4 back): a proper right-rear
    // eject arc that clears the shooter's shoulder and crosses the frame.
    const dir = this._dir.copy(rightDir);
    dir.y += 0.55;
    if (backDir) dir.addScaledVector(backDir, 0.4);
    dir.normalize();
    const c = this.recs[i];
    c.pos.copy(pos);
    c.vel.copy(dir).multiplyScalar(3.1 + Math.random() * 0.9);
    c.rot.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    // Hard tumble: 45-75 rad/s about a random axis
    c.rotVel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize().multiplyScalar(45 + Math.random() * 30);
    c.age = 0;
    c.bounced = false;
    c.groundT = 0;
    c.sinkT = -1;
    c.restY = 0.008;
    this.items[i] = c;
  }

  update(dt) {
    for (let i = 0; i < this.capacity; i++) {
      const c = this.items[i];
      if (!c) continue;
      c.age += dt;
      if (c.age > 9) { // safety net only; normal exit is the sink below
        this.items[i] = null; this.free.push(i);
        this.mesh.setMatrixAt(i, this._zero);
        continue;
      }
      if (c.sinkT >= 0) {
        // After 3s on the ground: sink 0.02m over 0.3s, then free the slot.
        c.sinkT += dt;
        c.pos.y = c.restY - 0.02 * Math.min(1, c.sinkT / 0.3);
        if (c.sinkT >= 0.3) {
          this.items[i] = null; this.free.push(i);
          this.mesh.setMatrixAt(i, this._zero);
          continue;
        }
      } else {
        c.vel.y -= 12 * dt;
        c.pos.addScaledVector(c.vel, dt);
        if (c.pos.y < c.restY) {
          c.pos.y = c.restY;
          c.vel.y = Math.abs(c.vel.y) * 0.32;
          c.vel.x *= 0.55; c.vel.z *= 0.55;
          c.rotVel.multiplyScalar(0.45);
          if (!c.bounced) {
            c.bounced = true;
            if (this.onBounce) this.onBounce();
          }
          if (Math.abs(c.vel.y) < 0.4) { c.vel.set(0, 0, 0); c.rotVel.set(0, 0, 0); }
        }
        if (c.vel.lengthSq() < 1e-6 && c.pos.y <= c.restY + 1e-4) {
          c.groundT += dt;
          if (c.groundT > 3) c.sinkT = 0;
        }
        c.rot.x += c.rotVel.x * dt; c.rot.y += c.rotVel.y * dt; c.rot.z += c.rotVel.z * dt;
      }
      this._q.setFromEuler(c.rot);
      this._m.compose(c.pos, this._q, this._one); // never shrink-despawn
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
