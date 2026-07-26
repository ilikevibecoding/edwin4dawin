import * as THREE from 'three';
import { rand, randRange, randSpread } from '../core/rand.js';

/** Procedural sprite textures (soft puff, hard spark, smoke). */
export function makeSpriteTextures() {
  const tex = {};

  const circle = (size, stops) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [o, col] of stops) grad.addColorStop(o, col);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  tex.soft = circle(128, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]);
  tex.hard = circle(64, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,0.9)'], [0.72, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]);

  // smoke: blotchy multi-lobe puff
  {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.clearRect(0, 0, size, size);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + Math.sin(i * 12.9898) * 1.3;
      const r = size * (0.16 + 0.14 * Math.abs(Math.sin(i * 78.233)));
      const x = size / 2 + Math.cos(a) * size * 0.16 * Math.abs(Math.sin(i * 3.7));
      const y = size / 2 + Math.sin(a) * size * 0.16 * Math.abs(Math.cos(i * 5.1));
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.16)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    tex.smoke = t;
  }
  return tex;
}

const VERT = /* glsl */`
  attribute vec3 iPos;
  attribute vec4 iVel;      // xyz vel, w rotSpeed
  attribute vec4 iParams;   // x birth, y life, z size0, w size1
  attribute vec4 iColor;    // rgb tint, a alpha
  attribute vec4 iMisc;     // x rot0, y gravity, z drag, w fadeIn
  uniform float uTime;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vLife;
  void main() {
    float age = uTime - iParams.x;
    float lifeT = clamp(age / iParams.y, 0.0, 1.0);
    vLife = lifeT;

    // integrate with drag: p = p0 + v*(1-exp(-d t))/d + 0.5 g t^2 (approx)
    float d = max(iMisc.z, 0.0001);
    float k = (1.0 - exp(-d * age)) / d;
    vec3 pos = iPos + iVel.xyz * k;
    pos.y -= 0.5 * iMisc.y * age * age;

    float size = mix(iParams.z, iParams.w, lifeT);
    float rot = iMisc.x + iVel.w * age;

    float fadeIn = smoothstep(0.0, max(iMisc.w, 0.0001), lifeT);
    float fadeOut = 1.0 - smoothstep(0.6, 1.0, lifeT);
    vColor = vec4(iColor.rgb, iColor.a * fadeIn * fadeOut);
    if (lifeT >= 1.0) size = 0.0;

    vec2 corner = position.xy; // unit quad -0.5..0.5
    float cs = cos(rot), sn = sin(rot);
    vec2 rc = vec2(corner.x * cs - corner.y * sn, corner.x * sn + corner.y * cs);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    mv.xy += rc * size;
    vUv = position.xy + 0.5;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */`
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying vec4 vColor;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    gl_FragColor = vec4(vColor.rgb * tex.rgb, vColor.a * tex.a);
    if (gl_FragColor.a < 0.003) discard;
  }
`;

/** A pool of billboarded quad particles with GPU integration. */
export class ParticlePool {
  constructor(scene, texture, { max = 1500, blending = THREE.NormalBlending, depthWrite = false, hdrBoost = 1 } = {}) {
    this.max = max;
    this.cursor = 0;
    this.time = 0;
    this.hdrBoost = hdrBoost;

    const geo = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    geo.index = quad.index;
    geo.setAttribute('position', quad.getAttribute('position'));
    geo.instanceCount = 0;

    const mk = (itemSize) => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(max * itemSize), itemSize);
      a.setUsage(THREE.DynamicDrawUsage);
      return a;
    };
    this.aPos = mk(3); this.aVel = mk(4); this.aParams = mk(4); this.aColor = mk(4); this.aMisc = mk(4);
    geo.setAttribute('iPos', this.aPos);
    geo.setAttribute('iVel', this.aVel);
    geo.setAttribute('iParams', this.aParams);
    geo.setAttribute('iColor', this.aColor);
    geo.setAttribute('iMisc', this.aMisc);

    // mark all dead
    for (let i = 0; i < max; i++) { this.aParams.array[i * 4 + 0] = -1e9; this.aParams.array[i * 4 + 1] = 1; }

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uTime: { value: 0 }, uMap: { value: texture } },
      transparent: true,
      depthWrite,
      blending,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = blending === THREE.AdditiveBlending ? 20 : 19;
    scene.add(this.mesh);
    this.geo = geo;
  }

  /**
   * @param {object} p — {pos, vel, life, size0, size1, color(THREE.Color|number), alpha, rot, rotSpeed, gravity, drag, fadeIn}
   */
  emit(p) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    const col = p.color instanceof THREE.Color ? p.color : new THREE.Color(p.color ?? 0xffffff);
    this.aPos.array.set([p.pos.x, p.pos.y, p.pos.z], i * 3);
    this.aVel.array.set([p.vel?.x ?? 0, p.vel?.y ?? 0, p.vel?.z ?? 0, p.rotSpeed ?? 0], i * 4);
    this.aParams.array.set([this.time, p.life ?? 1, p.size0 ?? 0.5, p.size1 ?? p.size0 ?? 0.5], i * 4);
    this.aColor.array.set([col.r * this.hdrBoost, col.g * this.hdrBoost, col.b * this.hdrBoost, p.alpha ?? 1], i * 4);
    this.aMisc.array.set([p.rot ?? rand() * Math.PI * 2, p.gravity ?? 0, p.drag ?? 0.0001, p.fadeIn ?? 0.02], i * 4);
    this._dirty = true;
  }

  burst(n, fn) { for (let i = 0; i < n; i++) this.emit(fn(i)); }

  update(dt) {
    this.time += dt;
    this.material.uniforms.uTime.value = this.time;
    if (this._dirty) {
      this.aPos.needsUpdate = this.aVel.needsUpdate = this.aParams.needsUpdate = this.aColor.needsUpdate = this.aMisc.needsUpdate = true;
      this.geo.instanceCount = this.max;
      this._dirty = false;
    }
  }
}

/** Instanced small debris chunks with CPU physics (bounce on y=0 plane). */
export class DebrisPool {
  constructor(scene, { max = 260 } = {}) {
    this.max = max;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4a4238, roughness: 0.95 });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.castShadow = false;
    this.mesh.frustumCulled = false;
    this.mesh.count = max;
    this.items = new Array(max).fill(null).map(() => ({ alive: false }));
    this.cursor = 0;
    const dummy = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < max; i++) this.mesh.setMatrixAt(i, dummy);
    scene.add(this.mesh);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._s = new THREE.Vector3();
    this.colorAttr = new Float32Array(max * 3).fill(1);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(this.colorAttr, 3);
  }

  spawn({ pos, vel, size = 0.06, life = 3, color = null, spin = 8 }) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    const it = this.items[i];
    it.alive = true;
    it.pos = pos.clone();
    it.vel = vel.clone();
    it.size = size * randRange(0.6, 1.5);
    it.life = life * randRange(0.6, 1.2);
    it.age = 0;
    it.rot = new THREE.Euler(rand() * 6.28, rand() * 6.28, rand() * 6.28);
    it.spin = new THREE.Vector3(randSpread(spin), randSpread(spin), randSpread(spin));
    if (color != null) {
      const c = new THREE.Color(color);
      this.colorAttr.set([c.r, c.g, c.b], i * 3);
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  update(dt) {
    let any = false;
    for (let i = 0; i < this.max; i++) {
      const it = this.items[i];
      if (!it.alive) continue;
      any = true;
      it.age += dt;
      if (it.age > it.life) {
        it.alive = false;
        this._m.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, this._m);
        continue;
      }
      it.vel.y -= 14 * dt;
      it.pos.addScaledVector(it.vel, dt);
      if (it.pos.y < it.size * 0.5) {
        it.pos.y = it.size * 0.5;
        if (Math.abs(it.vel.y) > 0.5) it.vel.y = -it.vel.y * 0.32;
        else it.vel.y = 0;
        it.vel.x *= 0.82; it.vel.z *= 0.82;
        it.spin.multiplyScalar(0.6);
      }
      it.rot.x += it.spin.x * dt; it.rot.y += it.spin.y * dt; it.rot.z += it.spin.z * dt;
      const fade = it.age / it.life > 0.85 ? 1 - (it.age / it.life - 0.85) / 0.15 : 1;
      this._q.setFromEuler(it.rot);
      this._s.setScalar(it.size * fade);
      this._m.compose(it.pos, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
