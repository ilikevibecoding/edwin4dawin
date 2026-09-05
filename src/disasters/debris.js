// Pooled, instanced debris: block chunks thrown by disasters (one draw call for all debris).
// Physics: gravity, simple voxel collision, buoyancy in water, optional external force field.
import * as THREE from 'three';
import { BLOCKS, B } from '../blocks.js';
import { tileUV } from '../textures.js';
import { SHARED } from '../entityMaterial.js';
import { AABB, moveBox } from '../player.js';

const VERT = /* glsl */ `
attribute vec3 aUV;
attribute vec2 aLight;
varying vec2 vUv;
varying vec2 vLight;
varying float vShade;
varying float vDist;
void main() {
  vUv = aUV.xy + vec2(uv.x, 1.0 - uv.y) * aUV.z;
  vLight = aLight;
  vec3 n = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vec3 l1 = normalize(vec3(0.2, 1.0, -0.7));
  vec3 l2 = normalize(vec3(-0.2, 1.0, 0.7));
  float d = max(dot(n, l1), 0.0) + max(dot(n, l2), 0.0);
  vShade = clamp(0.55 + 0.45 * d * 0.7, 0.0, 1.0);
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uSkyLight; uniform vec3 uSkyTint; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uFlash;
varying vec2 vUv; varying vec2 vLight; varying float vShade; varying float vDist;
float lightCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.4); }
float blockCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.6); }
void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < 0.5) discard;
  float sky = lightCurve(vLight.x) * uSkyLight;
  float blk = blockCurve(vLight.y);
  vec3 light = max(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72));
  light = max(light, vec3(0.035)) + vec3(uFlash);
  vec3 col = tex.rgb * light * vShade;
  col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, vDist));
  gl_FragColor = vec4(col, 1.0);
}`;

export class DebrisSystem {
  constructor(scene, world, atlas, maxCount = 600, cap = maxCount) {
    this.cap = Math.min(cap, maxCount);   // soft limit (quality preset); `max` is the allocated pool
    this.world = world;
    this.max = maxCount;
    this.count = 0;
    // SoA state
    this.px = new Float32Array(maxCount); this.py = new Float32Array(maxCount); this.pz = new Float32Array(maxCount);
    this.vx = new Float32Array(maxCount); this.vy = new Float32Array(maxCount); this.vz = new Float32Array(maxCount);
    this.rx = new Float32Array(maxCount); this.ry = new Float32Array(maxCount); this.rz = new Float32Array(maxCount);
    this.wx = new Float32Array(maxCount); this.wy = new Float32Array(maxCount); this.wz = new Float32Array(maxCount);
    this.size = new Float32Array(maxCount); this.mass = new Float32Array(maxCount);
    this.life = new Float32Array(maxCount); this.age = new Float32Array(maxCount);
    this.block = new Uint8Array(maxCount); this.flags = new Uint8Array(maxCount); // 1 = buoyant, 2 = resting
    this.lightTimer = new Uint8Array(maxCount);
    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.uvAttr = new THREE.InstancedBufferAttribute(new Float32Array(maxCount * 3), 3);
    this.lightAttr = new THREE.InstancedBufferAttribute(new Float32Array(maxCount * 2), 2);
    geo.setAttribute('aUV', this.uvAttr);
    geo.setAttribute('aLight', this.lightAttr);
    this.material = new THREE.ShaderMaterial({
      uniforms: { map: { value: atlas }, uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor, uFogNear: SHARED.uFogNear, uFogFar: SHARED.uFogFar, uFlash: SHARED.uFlash },
      vertexShader: VERT, fragmentShader: FRAG,
    });
    this.mesh = new THREE.InstancedMesh(geo, this.material, maxCount);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3();
    this.forceFn = null;       // (i, out:{x,y,z}, dt) => void  external force field (set by disasters)
    this.waterLevelFn = null;  // (x, z) => water surface y or -Infinity
    this.gravity = 22;
    this.spawned = 0;
    this.camera = null;
  }

  // Spawn a debris cube. Returns index or -1 when the pool is full (oldest is recycled if `force`).
  spawn(x, y, z, vx, vy, vz, blockId, size = 0.6, life = 12, opts = {}) {
    let i;
    if (this.count < Math.min(this.max, this.cap)) i = this.count++;
    else if (opts.force) { i = 0; for (let k = 1; k < this.count; k++) if (this.age[k] > this.age[i]) i = k; }
    else return -1;
    this.px[i] = x; this.py[i] = y; this.pz[i] = z;
    this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
    this.rx[i] = opts.rx || 0; this.ry[i] = opts.ry || 0; this.rz[i] = opts.rz || 0;
    this.wx[i] = opts.wx ?? (vx * 0.8); this.wy[i] = opts.wy ?? 1.5; this.wz[i] = opts.wz ?? (vz * 0.8);
    this.size[i] = size; this.mass[i] = opts.mass ?? (size * size * size * (BLOCKS[blockId].sound === 'wood' || BLOCKS[blockId].sound === 'cloth' || BLOCKS[blockId].sound === 'grass' ? 0.6 : 2.2));
    this.life[i] = life; this.age[i] = 0;
    this.block[i] = blockId || B.OAK_PLANKS;
    this.flags[i] = (opts.buoyant ?? this.mass[i] < 1.0) ? 1 : 0;
    const def = BLOCKS[this.block[i]];
    const [tu, tv, ts] = tileUV(def.tex[0]);
    this.uvAttr.setXYZ(i, tu, tv, ts);
    const l = opts.light || this.world.sampleLight(x, y, z);
    this.lightAttr.setXY(i, Math.max(l[0], 0.3), l[1]);
    this.lightTimer[i] = i % 12;
    this.spawned++;
    return i;
  }

  clear() { this.count = 0; this.mesh.count = 0; }

  remove(i) {
    const last = --this.count;
    if (i !== last) {
      for (const a of [this.px, this.py, this.pz, this.vx, this.vy, this.vz, this.rx, this.ry, this.rz, this.wx, this.wy, this.wz, this.size, this.mass, this.life, this.age, this.block, this.flags, this.lightTimer]) a[i] = a[last];
      this.uvAttr.setXYZ(i, this.uvAttr.getX(last), this.uvAttr.getY(last), this.uvAttr.getZ(last));
      this.lightAttr.setXY(i, this.lightAttr.getX(last), this.lightAttr.getY(last));
    }
  }

  update(dt, camera) {
    this.camera = camera;
    const world = this.world;
    const box = new AABB(0, 0, 0, 0, 0, 0);
    const force = { x: 0, y: 0, z: 0 };
    const cx = camera ? camera.position.x : 0, cz = camera ? camera.position.z : 0;
    for (let i = 0; i < this.count; i++) {
      this.age[i] += dt;
      if (this.age[i] > this.life[i]) { this.remove(i); i--; continue; }
      const dx = this.px[i] - cx, dz = this.pz[i] - cz;
      if (dx * dx + dz * dz > 160 * 160) continue; // frozen far away
      const half = this.size[i] / 2;
      let vx = this.vx[i], vy = this.vy[i], vz = this.vz[i];
      // environment forces
      const wl = this.waterLevelFn ? this.waterLevelFn(this.px[i], this.pz[i]) : -Infinity;
      const inWaterBlock = world.getBlock(Math.floor(this.px[i]), Math.floor(this.py[i]), Math.floor(this.pz[i])) === B.WATER;
      const submerged = inWaterBlock || this.py[i] < wl;
      if (submerged && (this.flags[i] & 1)) {
        const surface = inWaterBlock ? Math.max(wl, Math.floor(this.py[i]) + 0.9) : wl;
        const depth = surface - this.py[i];
        vy += (depth * 14 - vy * 3) * dt; // spring toward the surface
        vx *= 1 - 2.5 * dt; vz *= 1 - 2.5 * dt;
      } else if (submerged) {
        vy -= this.gravity * 0.3 * dt; vx *= 1 - 3 * dt; vz *= 1 - 3 * dt;
      } else {
        vy -= this.gravity * dt;
        vx *= 1 - 0.15 * dt; vz *= 1 - 0.15 * dt;
      }
      if (this.forceFn) { force.x = 0; force.y = 0; force.z = 0; this.forceFn(i, force, dt); const inv = 1 / Math.max(0.2, this.mass[i]); vx += force.x * inv * dt; vy += force.y * inv * dt; vz += force.z * inv * dt; }
      // clamp speeds (no physics explosions)
      const sp = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (sp > 40) { const k = 40 / sp; vx *= k; vy *= k; vz *= k; }
      // collision sweep
      box.x0 = this.px[i] - half; box.y0 = this.py[i] - half; box.z0 = this.pz[i] - half; box.x1 = this.px[i] + half; box.y1 = this.py[i] + half; box.z1 = this.pz[i] + half;
      const res = moveBox(world, box, vx * dt, vy * dt, vz * dt, 0, false);
      this.px[i] = box.x0 + half; this.py[i] = box.y0 + half; this.pz[i] = box.z0 + half;
      if (res.hitY) { if (vy < 0) { vy = -vy * 0.25; if (Math.abs(vy) < 1.2) vy = 0; vx *= 0.6; vz *= 0.6; this.wx[i] *= 0.5; this.wz[i] *= 0.5; } else vy = 0; }
      if (res.hitX) vx = -vx * 0.3;
      if (res.hitZ) vz = -vz * 0.3;
      this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
      // tumble
      const spin = res.hitY && Math.abs(vy) < 0.1 ? 0.2 : 1;
      this.rx[i] += this.wx[i] * dt * spin; this.ry[i] += this.wy[i] * dt * spin; this.rz[i] += this.wz[i] * dt * spin;
      if (this.py[i] < -5) { this.remove(i); i--; continue; }
      this.lightTimer[i] += dt;
      if (this.lightTimer[i] >= 0.2) { this.lightTimer[i] = 0; const l = world.sampleLight(this.px[i], this.py[i] + half, this.pz[i]); this.lightAttr.setXY(i, Math.max(l[0], 0.3), l[1]); }
    }
    // upload matrices
    for (let i = 0; i < this.count; i++) {
      const fade = Math.min(1, (this.life[i] - this.age[i]) / 1.0); // shrink out in the last second
      const s = this.size[i] * fade;
      this._e.set(this.rx[i], this.ry[i], this.rz[i]);
      this._q.setFromEuler(this._e);
      this._p.set(this.px[i], this.py[i], this.pz[i]);
      this._s.set(s, s, s);
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.uvAttr.needsUpdate = true;
    this.lightAttr.needsUpdate = true;
  }
}
