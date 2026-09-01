// Day/night cycle: sky dome, sun, moon, stars, blocky clouds, fog + light factors.
import * as THREE from 'three';
import { SimplexNoise } from './noise.js';
import { CLOUD_HEIGHT, DAY_LENGTH_SECONDS, START_TIME } from './constants.js';
import { clamp, lerp, smoothstep } from './rng.js';

const DAY_TOP = new THREE.Color(0.47, 0.65, 1.0);
const DAY_HORIZON = new THREE.Color(0.75, 0.85, 1.0);
const NIGHT_TOP = new THREE.Color(0.012, 0.014, 0.035);
const NIGHT_HORIZON = new THREE.Color(0.04, 0.05, 0.10);
const SUNSET = new THREE.Color(1.0, 0.45, 0.15);
const VOID_DAY = new THREE.Color(0.28, 0.36, 0.55);

function makeSunTexture() {
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = 'rgba(255, 236, 170, 0.45)'; ctx.fillRect(3, 3, 26, 26);
  ctx.fillStyle = 'rgba(255, 244, 200, 0.9)'; ctx.fillRect(6, 6, 20, 20);
  ctx.fillStyle = '#fff9d8'; ctx.fillRect(8, 8, 16, 16);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.NoColorSpace;
  return t;
}
function makeMoonTexture() {
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d9dde6'; ctx.fillRect(8, 8, 16, 16);
  ctx.fillStyle = '#b8bcc8'; ctx.fillRect(11, 10, 4, 4); ctx.fillRect(17, 15, 5, 4); ctx.fillRect(12, 18, 3, 3);
  ctx.fillStyle = '#eef0f5'; ctx.fillRect(9, 9, 3, 2);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.NoColorSpace;
  return t;
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}`;
const SKY_FRAG = /* glsl */ `
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uVoid; uniform vec3 uSunset; uniform float uSunsetStrength; uniform vec3 uSunDir;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float t = smoothstep(0.0, 0.42, d.y);
  vec3 col = mix(uHorizon, uTop, t);
  float below = smoothstep(0.0, -0.08, d.y);
  col = mix(col, uVoid, below);
  // sunset/sunrise glow around the sun's azimuth, hugging the horizon
  vec3 sh = normalize(vec3(uSunDir.x, 0.0, uSunDir.z + 0.0001));
  float az = max(dot(normalize(vec3(d.x, 0.0, d.z + 0.0001)), sh), 0.0);
  float band = exp(-abs(d.y) * 7.0);
  col = mix(col, uSunset, uSunsetStrength * band * (0.35 + 0.65 * pow(az, 3.0)));
  gl_FragColor = vec4(col, 1.0);
}`;

export class Sky {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.time = START_TIME;
    this.dayLength = DAY_LENGTH_SECONDS;
    this.paused = false;

    this.skyLight = 1;
    this.skyTint = new THREE.Vector3(1, 1, 1);
    this.fogColor = new THREE.Color();
    this.fogNear = 100;
    this.fogFar = 150;
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.dayFactor = 1;

    // dome
    this.domeMat = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uVoid: { value: new THREE.Color() },
        uSunset: { value: SUNSET.clone() }, uSunsetStrength: { value: 0 }, uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      },
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, depthTest: false,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(480, 24, 12), this.domeMat);
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    // celestial group rotates with time
    this.celestial = new THREE.Group();
    this.celestial.renderOrder = -9;
    scene.add(this.celestial);
    // Celestial bodies sit far away (inside the far plane) and depth-test so terrain occludes them.
    const sunMat = new THREE.MeshBasicMaterial({ map: makeSunTexture(), transparent: true, depthWrite: false, depthTest: true, fog: false });
    this.sun = new THREE.Mesh(new THREE.PlaneGeometry(105, 105), sunMat);
    this.sun.position.set(0, 0, -440); // rotated into place by the group
    this.sun.renderOrder = -9;
    this.celestial.add(this.sun);
    const moonMat = new THREE.MeshBasicMaterial({ map: makeMoonTexture(), transparent: true, depthWrite: false, depthTest: true, fog: false });
    this.moon = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), moonMat);
    this.moon.position.set(0, 0, 440);
    this.moon.rotation.y = Math.PI;
    this.moon.renderOrder = -9;
    this.celestial.add(this.moon);
    // stars
    const starCount = 900;
    const sp = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(450);
      sp[i * 3] = v.x; sp[i * 3 + 1] = v.y; sp[i * 3 + 2] = v.z;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, depthTest: true, fog: false });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.renderOrder = -9;
    this.celestial.add(this.stars);

    this.buildClouds();
    this.update(0, new THREE.Vector3(), 7);
  }

  buildClouds() {
    const cells = 64, cell = 12, thick = 4;
    const n = new SimplexNoise(99);
    const map = new Uint8Array(cells * cells);
    for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) {
      // periodic noise via 4D-ish trick: sample on a torus using two 2D noises
      const a = (i / cells) * Math.PI * 2, b = (j / cells) * Math.PI * 2;
      const v = n.noise3(Math.cos(a) * 2.2, Math.sin(a) * 2.2 + Math.cos(b) * 2.2, Math.sin(b) * 2.2) * 0.7 + n.noise3(Math.cos(a) * 5, Math.sin(a) * 5 + Math.cos(b) * 5, Math.sin(b) * 5) * 0.3;
      map[i * cells + j] = v > 0.18 ? 1 : 0;
    }
    const pos = [], col = [], idx = [];
    const W = cells * cell;
    const shade = [0.9, 0.9, 1.0, 0.7, 0.8, 0.8];
    const pushBox = (x0, y0, z0, x1, y1, z1, mask) => {
      const faces = [
        [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]],
        [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]],
        [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]],
        [[x1, y0, z1], [x0, y0, z1], [x0, y0, z0], [x1, y0, z0]],
        [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
        [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]],
      ];
      for (let d = 0; d < 6; d++) {
        if (mask & (1 << d)) continue;
        const base = pos.length / 3;
        for (const v of faces[d]) { pos.push(v[0], v[1], v[2]); col.push(shade[d], shade[d], shade[d]); }
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    };
    for (let rep = 0; rep < 4; rep++) {
      const ox = (rep & 1) * W, oz = (rep >> 1) * W;
      for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) {
        if (!map[i * cells + j]) continue;
        const has = (ii, jj) => map[((ii + cells) % cells) * cells + ((jj + cells) % cells)];
        let mask = 0;
        if (has(i + 1, j)) mask |= 1; if (has(i - 1, j)) mask |= 2; if (has(i, j + 1)) mask |= 16; if (has(i, j - 1)) mask |= 32;
        pushBox(ox + i * cell, 0, oz + j * cell, ox + i * cell + cell, thick, oz + j * cell + cell, mask);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    this.cloudMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, fog: false, depthWrite: false, side: THREE.DoubleSide });
    this.clouds = new THREE.Mesh(g, this.cloudMat);
    this.clouds.renderOrder = 5;
    this.clouds.frustumCulled = false;
    this.cloudPeriod = W;
    this.cloudOffset = 0;
    this.scene.add(this.clouds);
  }

  advance(dt) {
    if (this.paused) return;
    this.time = (this.time + dt / this.dayLength) % 1;
  }

  // time of day label (0.0 = midnight)
  clockString() {
    const h = Math.floor(this.time * 24), m = Math.floor((this.time * 24 - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Called each frame with camera position and render distance (chunks)
  update(dt, camPos, renderDistance, underwater = false) {
    this.advance(dt);
    this.cloudOffset += dt * 0.6;
    const a = (this.time - 0.25) * Math.PI * 2;
    this.sunDir.set(Math.cos(a), Math.sin(a), 0);
    const e = this.sunDir.y;
    const day = smoothstep(-0.12, 0.22, e);
    this.dayFactor = day;
    const sunset = (1 - smoothstep(0.0, 0.22, Math.abs(e))) * (e > -0.15 ? 1 : 0);
    this.skyLight = lerp(0.27, 1.0, day);
    this.skyTint.set(lerp(0.55, 1, day), lerp(0.62, 1, day), lerp(1.0, 1, day));
    // colours
    const top = NIGHT_TOP.clone().lerp(DAY_TOP, day);
    const horizon = NIGHT_HORIZON.clone().lerp(DAY_HORIZON, day);
    horizon.lerp(SUNSET, sunset * 0.35);
    const voidC = NIGHT_TOP.clone().lerp(VOID_DAY, day);
    this.domeMat.uniforms.uTop.value.copy(top);
    this.domeMat.uniforms.uHorizon.value.copy(horizon);
    this.domeMat.uniforms.uVoid.value.copy(voidC);
    this.domeMat.uniforms.uSunsetStrength.value = sunset * 0.9;
    this.domeMat.uniforms.uSunDir.value.copy(this.sunDir);
    this.fogColor.copy(horizon);
    const R = renderDistance * 16;
    this.fogNear = R * 0.6;
    this.fogFar = R * 0.98;
    if (underwater) { this.fogColor.set(0.02, 0.06, 0.3); this.fogNear = 1; this.fogFar = 18; }
    this.dome.position.copy(camPos);
    this.celestial.position.copy(camPos);
    // sun sits at -z inside the group: first map -z -> +x, then rotate about world z by the sun angle
    this.celestial.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);
    const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
    this.celestial.quaternion.multiply(q2);
    this.starMat.opacity = (1 - day) * 0.9;
    this.stars.visible = day < 0.99;
    this.sun.material.opacity = 1;
    this.moon.material.opacity = lerp(1, 0.15, day);
    // clouds
    const W = this.cloudPeriod;
    const cx = this.cloudOffset + Math.floor((camPos.x - this.cloudOffset) / W) * W - W;
    const cz = Math.floor(camPos.z / W) * W - W;
    this.clouds.position.set(cx, CLOUD_HEIGHT, cz);
    const cloudCol = new THREE.Color(0.08, 0.09, 0.14).lerp(new THREE.Color(1, 1, 1), day).lerp(SUNSET, sunset * 0.5);
    this.cloudMat.color.copy(cloudCol);
  }
}
