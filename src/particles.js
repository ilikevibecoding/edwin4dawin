// GPU point-sprite particles: block break chips (atlas-textured), smoke, dust.
import * as THREE from 'three';
import { BLOCKS, B } from './blocks.js';
import { tileUV } from './textures.js';
import { SHARED } from './entityMaterial.js';

const MAX = 3000;

const VERT = /* glsl */ `
attribute float aSize;
attribute vec4 aUV;
attribute vec3 aColor;
attribute float aAlpha;
attribute vec2 aLight;
uniform float uScale;
varying vec4 vUV;
varying vec3 vColor;
varying float vAlpha;
varying vec2 vLight;
varying float vDist;
void main() {
  vUV = aUV; vColor = aColor; vAlpha = aAlpha; vLight = aLight;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_PointSize = aSize * uScale / max(vDist, 0.1);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uSkyLight; uniform vec3 uSkyTint; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar; uniform float uFlash;
varying vec4 vUV; varying vec3 vColor; varying float vAlpha; varying vec2 vLight; varying float vDist;
float lightCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.4); }
float blockCurve(float l) { float c = l / (4.0 - 3.0 * l); return mix(c, l, 0.6); }
void main() {
  vec3 col;
  float a = vAlpha;
  if (vUV.w < 0.5) {
    vec4 tex = texture2D(map, vUV.xy + gl_PointCoord * vUV.z);
    if (tex.a < 0.5) discard;
    col = tex.rgb;
  } else {
    col = vColor;
  }
  float sky = lightCurve(vLight.x) * uSkyLight;
  float blk = blockCurve(vLight.y);
  vec3 light = max(vec3(sky) * uSkyTint, vec3(blk) * vec3(1.0, 0.9, 0.72));
  light = max(light, vec3(0.035)) + vec3(uFlash);
  col *= light;
  float f = smoothstep(uFogNear, uFogFar, vDist);
  col = mix(col, uFogColor, f);
  gl_FragColor = vec4(col, a);
}`;

export class Particles {
  constructor(scene, world, atlas) {
    this.world = world;
    this.count = 0;
    this.pos = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.size = new Float32Array(MAX);
    this.uv = new Float32Array(MAX * 4);
    this.color = new Float32Array(MAX * 3);
    this.alpha = new Float32Array(MAX);
    this.light = new Float32Array(MAX * 2);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.kind = new Uint8Array(MAX); // 0 block chip, 1 smoke, 2 dust
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aUV', new THREE.BufferAttribute(this.uv, 4));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.color, 3));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('aLight', new THREE.BufferAttribute(this.light, 2));
    g.setDrawRange(0, 0);
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: atlas }, uScale: { value: 500 }, uSkyLight: SHARED.uSkyLight, uSkyTint: SHARED.uSkyTint, uFogColor: SHARED.uFogColor, uFogNear: SHARED.uFogNear, uFogFar: SHARED.uFogFar, uFlash: SHARED.uFlash },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 12;
    scene.add(this.points);
  }

  setCamera(camera, height) {
    this.mat.uniforms.uScale.value = height / (2 * Math.tan((camera.fov * Math.PI / 180) / 2));
  }

  spawn(x, y, z, vx, vy, vz, size, life, kind, uv, color, alpha) {
    if (this.count >= Math.min(MAX, this.cap || MAX)) return;
    const i = this.count++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.size[i] = size;
    this.uv.set(uv, i * 4);
    this.color.set(color, i * 3);
    this.alpha[i] = alpha;
    const l = this.world.sampleLight(x, y, z);
    this.light[i * 2] = l[0]; this.light[i * 2 + 1] = l[1];
    this.life[i] = life; this.maxLife[i] = life;
    this.kind[i] = kind;
  }

  // Block break burst: 4x4x4 chips like Minecraft
  blockBreak(x, y, z, id) {
    const def = BLOCKS[id];
    const [tu, tv, ts] = tileUV(def.tex[Math.random() < 0.5 ? 2 : 4]);
    const n = 3;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) {
      const px = x + (i + 0.5) / n, py = y + (j + 0.5) / n, pz = z + (k + 0.5) / n;
      const vx = (px - x - 0.5) * 2 + (Math.random() - 0.5) * 0.6;
      const vy = (py - y - 0.5) * 2 + Math.random() * 3 + 1;
      const vz = (pz - z - 0.5) * 2 + (Math.random() - 0.5) * 0.6;
      const sub = ts / 4;
      const uv = [tu + Math.floor(Math.random() * 3) * sub, tv + Math.floor(Math.random() * 3) * sub, sub, 0];
      this.spawn(px, py, pz, vx, vy, vz, 0.12 + Math.random() * 0.08, 0.7 + Math.random() * 0.6, 0, uv, [1, 1, 1], 1);
    }
  }

  // Water splash burst (bodies hitting the flood, wave impacts)
  splash(x, y, z, n = 10, power = 1) {
    const [tu, tv, ts] = tileUV(BLOCKS[B.WATER].tex[2]);
    const sub = ts / 4;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.6;
      const uv = [tu + Math.floor(Math.random() * 3) * sub, tv + Math.floor(Math.random() * 3) * sub, sub, 0];
      this.spawn(x + Math.cos(a) * r, y + Math.random() * 0.3, z + Math.sin(a) * r, Math.cos(a) * (1 + Math.random() * 2) * power, (2.5 + Math.random() * 3.5) * power, Math.sin(a) * (1 + Math.random() * 2) * power, 0.12 + Math.random() * 0.1, 0.5 + Math.random() * 0.5, 0, uv, [0.85, 0.92, 1], 0.95);
    }
  }

  // Small chips while hitting a block face
  blockHit(hit, id) {
    const def = BLOCKS[id];
    const [tu, tv, ts] = tileUV(def.tex[2]);
    const sub = ts / 4;
    const n = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]][hit.face];
    const p = hit.point;
    const uv = [tu + Math.floor(Math.random() * 3) * sub, tv + Math.floor(Math.random() * 3) * sub, sub, 0];
    this.spawn(p.x + n[0] * 0.05, p.y + n[1] * 0.05, p.z + n[2] * 0.05, n[0] * 1.5 + (Math.random() - 0.5), n[1] * 1.5 + Math.random() * 1.5 + 0.5, n[2] * 1.5 + (Math.random() - 0.5), 0.1, 0.5, 0, uv, [1, 1, 1], 1);
  }

  smoke(x, y, z, big = false) {
    const g = 0.35 + Math.random() * 0.3;
    this.spawn(x + (Math.random() - 0.5) * 0.3, y, z + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.2 + 0.15, 0.5 + Math.random() * 0.4, (Math.random() - 0.5) * 0.2, big ? 0.9 : 0.5, big ? 3.5 : 3.0, 1, [0, 0, 0, 1], [g, g, g], 0.55);
  }

  dust(x, y, z) {
    this.spawn(x, y + 0.1 + Math.random() * 0.4, z, 0.8 + Math.random() * 0.8, 0.05 + Math.random() * 0.1, (Math.random() - 0.5) * 0.4, 0.18, 2.5 + Math.random() * 2, 2, [0, 0, 0, 1], [0.78, 0.66, 0.48], 0.35);
  }

  update(dt) {
    const w = this.world;
    for (let i = 0; i < this.count; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.remove(i); i--; continue; }
      const k = this.kind[i];
      let vx = this.vel[i * 3], vy = this.vel[i * 3 + 1], vz = this.vel[i * 3 + 2];
      if (k === 0) {
        vy -= 16 * dt;
        vx *= 0.98; vz *= 0.98;
        let nx = this.pos[i * 3] + vx * dt, ny = this.pos[i * 3 + 1] + vy * dt, nz = this.pos[i * 3 + 2] + vz * dt;
        if (BLOCKS[w.getBlock(Math.floor(nx), Math.floor(ny), Math.floor(nz))].solid) {
          if (BLOCKS[w.getBlock(Math.floor(this.pos[i * 3]), Math.floor(ny), Math.floor(this.pos[i * 3 + 2]))].solid) { vy = 0; ny = Math.ceil(ny) + 0.01; vx *= 0.6; vz *= 0.6; }
          else { vx = 0; vz = 0; nx = this.pos[i * 3]; nz = this.pos[i * 3 + 2]; }
        }
        this.pos[i * 3] = nx; this.pos[i * 3 + 1] = ny; this.pos[i * 3 + 2] = nz;
      } else if (k === 1) {
        vx += (Math.random() - 0.5) * 0.4 * dt; vz += (Math.random() - 0.5) * 0.4 * dt;
        this.pos[i * 3] += vx * dt; this.pos[i * 3 + 1] += vy * dt; this.pos[i * 3 + 2] += vz * dt;
        const t = this.life[i] / this.maxLife[i];
        this.alpha[i] = 0.5 * Math.min(1, t * 3) * t;
        this.size[i] += dt * 0.35;
      } else {
        this.pos[i * 3] += vx * dt; this.pos[i * 3 + 1] += vy * dt; this.pos[i * 3 + 2] += vz * dt;
        const t = this.life[i] / this.maxLife[i];
        this.alpha[i] = 0.3 * Math.sin(t * Math.PI);
      }
      this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    }
    this.geo.setDrawRange(0, this.count);
    for (const name of ['position', 'aSize', 'aUV', 'aColor', 'aAlpha', 'aLight']) this.geo.attributes[name].needsUpdate = true;
  }

  remove(i) {
    const last = --this.count;
    if (i === last) return;
    const cp = (arr, n) => { for (let k = 0; k < n; k++) arr[i * n + k] = arr[last * n + k]; };
    cp(this.pos, 3); cp(this.vel, 3); cp(this.size, 1); cp(this.uv, 4); cp(this.color, 3); cp(this.alpha, 1); cp(this.light, 2); cp(this.life, 1); cp(this.maxLife, 1); cp(this.kind, 1);
  }
}
