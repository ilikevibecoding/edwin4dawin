// Self-lit additive point sprites for the beam disaster: energy motes that stream into the focus point while
// the platform charges, and sparks/embers thrown from the impact point. Fixed-size SoA pool, no per-frame
// allocations, one draw call. Purely visual (spawning uses Math.random and happens in render()).
import * as THREE from 'three';

const VERT = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aAlpha;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor; vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = clamp(aSize * uScale / max(-mv.z, 0.5), 1.0, 90.0);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  float a = smoothstep(0.5, 0.05, r) * vAlpha;
  gl_FragColor = vec4(vColor * a, a);
}`;

const KIND_MOTE = 0, KIND_SPARK = 1;
const ATTRS = ['position', 'aSize', 'aColor', 'aAlpha'];

export class MotePool {
  constructor(scene, max = 1500) {
    this.scene = scene;
    this.max = max;
    this.count = 0;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.color = new Float32Array(max * 3);
    this.alpha = new Float32Array(max);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.kind = new Uint8Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.color, 3));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setDrawRange(0, 0);
    // generous static bounds so three never has to compute them from the (mostly empty) buffer
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 100, 0), 4000);
    this.geometry = g;
    this.material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 } }, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 11;
    this.points.visible = false;
    scene.add(this.points);
    this.focus = { x: 0, y: 0, z: 0 };
  }

  setCamera(camera, heightPx) { this.material.uniforms.uScale.value = heightPx / (2 * Math.tan((camera.fov * Math.PI / 180) / 2)); }

  _alloc() { return this.count < this.max ? this.count++ : -1; }

  // Mote: starts at (x,y,z), homes in on this.focus; dies when it arrives.
  spawnMote(x, y, z, speed, size, r, g, b) {
    const i = this._alloc(); if (i < 0) return;
    const dx = this.focus.x - x, dy = this.focus.y - y, dz = this.focus.z - z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    // initial velocity partly tangential so motes spiral in
    const tx = -dz / d, tz = dx / d;
    this.vel[i * 3] = (dx / d) * speed * 0.6 + tx * speed * 0.7; this.vel[i * 3 + 1] = (dy / d) * speed * 0.6; this.vel[i * 3 + 2] = (dz / d) * speed * 0.6 + tz * speed * 0.7;
    this.size[i] = size; this.color[i * 3] = r; this.color[i * 3 + 1] = g; this.color[i * 3 + 2] = b;
    this.alpha[i] = 0; this.life[i] = this.maxLife[i] = d / speed * 1.8 + 0.5; this.kind[i] = KIND_MOTE;
  }

  // Spark: ballistic, fades out, bright.
  spawnSpark(x, y, z, vx, vy, vz, size, life, r, g, b) {
    const i = this._alloc(); if (i < 0) return;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.size[i] = size; this.color[i * 3] = r; this.color[i * 3 + 1] = g; this.color[i * 3 + 2] = b;
    this.alpha[i] = 1; this.life[i] = this.maxLife[i] = life; this.kind[i] = KIND_SPARK;
  }

  clear() { this.count = 0; this.geometry.setDrawRange(0, 0); this.points.visible = false; }

  _remove(i) {
    const last = --this.count;
    if (i === last) return;
    for (let k = 0; k < 3; k++) { this.pos[i * 3 + k] = this.pos[last * 3 + k]; this.vel[i * 3 + k] = this.vel[last * 3 + k]; this.color[i * 3 + k] = this.color[last * 3 + k]; }
    this.size[i] = this.size[last]; this.alpha[i] = this.alpha[last]; this.life[i] = this.life[last]; this.maxLife[i] = this.maxLife[last]; this.kind[i] = this.kind[last];
  }

  update(dt, groundY) {
    const f = this.focus;
    for (let i = 0; i < this.count; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this._remove(i); i--; continue; }
      const px = this.pos[i * 3], py = this.pos[i * 3 + 1], pz = this.pos[i * 3 + 2];
      let vx = this.vel[i * 3], vy = this.vel[i * 3 + 1], vz = this.vel[i * 3 + 2];
      if (this.kind[i] === KIND_MOTE) {
        const dx = f.x - px, dy = f.y - py, dz = f.z - pz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < 1.2) { this._remove(i); i--; continue; }
        const d = Math.sqrt(d2);
        const pull = 42 / Math.max(2.5, d * 0.35); // stronger pull as they close in
        vx += (dx / d) * pull * dt; vy += (dy / d) * pull * dt; vz += (dz / d) * pull * dt;
        const sp = Math.sqrt(vx * vx + vy * vy + vz * vz);
        if (sp > 34) { const k = 34 / sp; vx *= k; vy *= k; vz *= k; }
        const t = 1 - this.life[i] / this.maxLife[i];
        this.alpha[i] = Math.min(1, t * 4) * (0.55 + 0.45 * Math.min(1, 10 / d));
      } else {
        vy -= 16 * dt;
        vx *= 1 - 0.9 * dt; vz *= 1 - 0.9 * dt;
        const t = this.life[i] / this.maxLife[i];
        this.alpha[i] = Math.min(1, t * 2.5);
        if (py + vy * dt < groundY) { vy = -vy * 0.3; vx *= 0.5; vz *= 0.5; }
      }
      this.pos[i * 3] = px + vx * dt; this.pos[i * 3 + 1] = py + vy * dt; this.pos[i * 3 + 2] = pz + vz * dt;
      this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    }
    this.geometry.setDrawRange(0, this.count);
    this.points.visible = this.count > 0;
    if (this.count > 0) for (let k = 0; k < ATTRS.length; k++) this.geometry.attributes[ATTRS[k]].needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
