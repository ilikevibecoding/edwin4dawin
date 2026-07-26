import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Head-bright gradient strip for tracers (u=1 head, u=0 tail → alpha 0). */
function tracerCanvas(w = 128, h = 8) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, w, 0);
  grd.addColorStop(0.0, 'rgba(255,255,255,0)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.06)');
  grd.addColorStop(0.82, 'rgba(255,255,255,0.35)');
  grd.addColorStop(0.95, 'rgba(255,255,255,1)');
  grd.addColorStop(1.0, 'rgba(255,255,255,1)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  return c;
}

/** Two crossed 0.006m planes spanning z in [-1, 0]; head at z=0 (u=1). */
function tracerGeometry() {
  const p1 = new THREE.PlaneGeometry(1, 0.006);
  p1.rotateY(-Math.PI / 2);   // length along +Z, u=0 at the -Z end
  p1.translate(0, 0, -0.5);   // span [-1, 0]; scale.z stretches the tail back
  const p2 = p1.clone();
  p2.rotateZ(Math.PI / 2);
  return mergeGeometries([p1, p2]);
}

/** Tracer rounds: thin bloom-lit streaks with a bright head and fading tail. */
export class TracerSystem {
  constructor(scene, capacity = 48) {
    this.scene = scene;
    this.items = [];
    this.pool = [];
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
      mat.color.setRGB(7.0, 3.2, 1.2); // white-hot head via bloom
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      m.renderOrder = 13;
      scene.add(m);
      this.pool.push(m);
    }
  }

  fire(from, to, speed = 900, color = null) {
    const m = this.pool.pop();
    if (!m) return;
    const dir = to.clone().sub(from);
    const dist = dir.length();
    dir.normalize();
    const len = Math.min(1.2 + Math.random(), dist * 0.6); // 1.2–2.2m cap
    m.visible = true;
    if (color != null) m.material.color.set(color).multiplyScalar(2.2);
    else m.material.color.setRGB(7.0, 3.2, 1.2);
    m.material.opacity = 1;
    m.scale.set(1, 1, 0.05);
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

/** Merged tapered rifle case: body + neck cone + extractor rim. */
function casingGeometry() {
  const body = new THREE.CylinderGeometry(0.0044, 0.0048, 0.037, 12);
  const neck = new THREE.CylinderGeometry(0.0028, 0.0044, 0.008, 12);
  neck.translate(0, 0.0185 + 0.004, 0);
  const rim = new THREE.CylinderGeometry(0.005, 0.005, 0.001, 12);
  rim.translate(0, -0.0185 - 0.0005, 0);
  return mergeGeometries([body, neck, rim]);
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

/** Ejected brass casings: fast arcs that cross the frame, ground bounce,
 *  then sink into the dirt instead of shrink-despawning. */
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
    this.free = [];
    for (let i = 0; i < capacity; i++) this.free.push(i);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._one = new THREE.Vector3(1, 1, 1);
    this._zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < capacity; i++) this.mesh.setMatrixAt(i, this._zero);
    this.onBounce = null;
  }

  eject(pos, rightDir, backDir = null) {
    if (!this.free.length) return;
    const i = this.free.pop();
    // 2.6-3.4 m/s along (right + 0.85 up + 0.15 back): the case arcs visibly
    // through the top-right quadrant before dropping out of frame.
    const dir = rightDir.clone();
    dir.y += 0.85;
    if (backDir) dir.addScaledVector(backDir, 0.15);
    dir.normalize();
    const vel = dir.multiplyScalar(2.6 + Math.random() * 0.8);
    const spin = 40 + Math.random() * 30; // rad/s
    const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    this.items[i] = {
      pos: pos.clone(), vel,
      rot: new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3),
      rotVel: axis.multiplyScalar(spin),
      age: 0, bounced: false, groundT: 0, sinkT: -1, restY: 0.006,
    };
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
