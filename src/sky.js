// Day/night cycle: atmospheric sky dome (Rayleigh-ish gradient, Mie glow, HDR sun disc, moon with phase), twinkling
// stars, blocky clouds, fog + light factors. The dome shares its gradient uniforms with the world/water/entity
// shaders (render/shading.js) so fog, reflections and the sky always agree, including under region looks
// (applyRegion: space, Coruscant) and disaster overrides (applyOverride).
import * as THREE from 'three';
import { SimplexNoise } from './noise.js';
import { CLOUD_HEIGHT, DAY_LENGTH_SECONDS, START_TIME } from './constants.js';
import { clamp, lerp, smoothstep } from './rng.js';
import { SHADING_UNIFORMS, SKY_GLSL } from './render/shading.js';

const DAY_TOP = new THREE.Color(0.47, 0.65, 1.0);
const DAY_HORIZON = new THREE.Color(0.75, 0.85, 1.0);
const NIGHT_TOP = new THREE.Color(0.012, 0.014, 0.035);
const NIGHT_HORIZON = new THREE.Color(0.04, 0.05, 0.10);
const SUNSET = new THREE.Color(1.0, 0.45, 0.15);
const VOID_DAY = new THREE.Color(0.28, 0.36, 0.55);
const MOON_PHASES = 8;   // days per lunar cycle
// The sun's orbit is tilted toward +z (like a temperate latitude): rising/setting points stay on the x axis, but at
// noon the sun is 22 degrees off the zenith so vertical faces still receive sun and shadows never collapse to points.
export const ORBIT_TILT = 22 * Math.PI / 180;
const TILT_Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), ORBIT_TILT);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const Y_FLIP_Q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}`;
const SKY_FRAG = /* glsl */ `
${SKY_GLSL}
uniform vec3 uMoonDir; uniform float uMoonPhase; uniform float uSunAlpha; uniform float uMoonAlpha;
varying vec3 vDir;
float mhash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
void main() {
  vec3 d = normalize(vDir);
  vec3 col = skyGradient(d);
  // sun: HDR disc (angular radius ~2 deg) with a soft glow; warm when low
  float cs = dot(d, uSunDiscDir);
  float above = smoothstep(-0.04, 0.02, d.y);
  float disc = smoothstep(0.99915, 0.99945, cs);
  float glow = pow(max(cs, 0.0), 300.0) * 1.4 + pow(max(cs, 0.0), 32.0) * 0.22;
  vec3 sunCol = mix(vec3(1.0, 0.5, 0.22), vec3(1.0, 0.97, 0.9), clamp(uSunDiscDir.y * 3.5, 0.0, 1.0));
  col += (disc * 3.0 + glow) * sunCol * uSunAlpha * above;
  // moon: a lit sphere, phase from the light direction in its local frame (0 = full)
  float cm = dot(d, uMoonDir);
  if (cm > 0.9985) {
    vec3 upv = abs(uMoonDir.y) < 0.98 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    vec3 Tm = normalize(cross(upv, uMoonDir));
    vec3 Bm = cross(uMoonDir, Tm);
    vec2 o = vec2(dot(d, Tm), dot(d, Bm)) / 0.030;
    float r2 = dot(o, o);
    if (r2 < 1.0) {
      vec3 n = vec3(o, sqrt(1.0 - r2));
      float ph = uMoonPhase * 6.2831853;
      vec3 L = vec3(sin(ph), 0.0, cos(ph));
      float lit = smoothstep(-0.04, 0.10, dot(n, L));
      float craters = 0.82 + 0.18 * step(0.62, mhash(floor(o * 3.0)));
      vec3 moonCol = mix(vec3(0.05, 0.06, 0.09), vec3(0.88, 0.9, 0.97) * craters, lit);
      float edge = smoothstep(1.0, 0.86, r2);
      col = mix(col, moonCol * 1.1, edge * uMoonAlpha * above);
    }
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const STAR_VERT = /* glsl */ `
attribute float aTw;
uniform float uTimeS; uniform float uAlpha; uniform float uScale;
varying float vA;
void main() {
  float tw = 0.6 + 0.4 * sin(uTimeS * (1.2 + aTw * 2.4) + aTw * 47.0);
  vA = tw * uAlpha;
  gl_PointSize = (1.6 + 1.4 * tw * step(0.7, aTw)) * uScale;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const STAR_FRAG = /* glsl */ `
varying float vA;
void main() { gl_FragColor = vec4(vec3(1.0, 0.98, 0.94) * (0.9 + 0.3 * vA), vA); }`;

export class Sky {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.time = START_TIME;
    this.dayLength = DAY_LENGTH_SECONDS;
    this.paused = false;
    this.day = 0;          // completed day/night cycles (moon phase)
    this.elapsed = 0;

    this.skyLight = 1;
    this.skyTint = new THREE.Vector3(1, 1, 1);
    this.fogColor = new THREE.Color();
    this.fogNear = 100;
    this.fogFar = 150;
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.dayFactor = 1;

    // dome (gradient uniforms are the shared shading uniforms)
    const su = SHADING_UNIFORMS;
    this.domeMat = new THREE.ShaderMaterial({
      uniforms: {
        uSkyTop: su.uSkyTop, uSkyHorizon: su.uSkyHorizon, uSkyVoid: su.uSkyVoid, uSunsetColor: su.uSunsetColor,
        uSunsetStrength: su.uSunsetStrength, uSunDiscDir: su.uSunDiscDir, uSkyDay: su.uSkyDay, uSkyGain: su.uSkyGain, uMoonDir: su.uMoonDir, uMoonPhase: su.uMoonPhase,
        uSunAlpha: { value: 1 }, uMoonAlpha: { value: 1 },
      },
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, depthTest: false,
    });
    // legacy aliases (uTop/uHorizon/uVoid/uSunsetStrength) so older callers keep working
    const u = this.domeMat.uniforms;
    u.uTop = u.uSkyTop; u.uHorizon = u.uSkyHorizon; u.uVoid = u.uSkyVoid; u.uSunset = u.uSunsetColor; u.uSunDir = u.uSunDiscDir;
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(480, 24, 12), this.domeMat);
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    // celestial group rotates with time (stars; the sun and moon are drawn by the dome shader)
    this.celestial = new THREE.Group();
    this.celestial.renderOrder = -9;
    scene.add(this.celestial);
    const starCount = 1100;
    const sp = new Float32Array(starCount * 3), tw = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(450);
      sp[i * 3] = v.x; sp[i * 3 + 1] = v.y; sp[i * 3 + 2] = v.z;
      tw[i] = Math.random();
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sg.setAttribute('aTw', new THREE.BufferAttribute(tw, 1));
    this.starMat = new THREE.ShaderMaterial({
      uniforms: { uTimeS: su.uTimeS, uAlpha: { value: 0 }, uScale: { value: Math.min(window.devicePixelRatio || 1, 1.5) } },
      vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, depthTest: true,
    });
    Object.defineProperty(this.starMat, 'opacity', { get: () => this.starMat.uniforms.uAlpha.value, set: (v) => { this.starMat.uniforms.uAlpha.value = v; } });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.renderOrder = -9;
    this.celestial.add(this.stars);
    // sun / moon visibility (the dome draws them); kept as {material:{opacity}} shaped objects for callers
    this.sun = { material: { get opacity() { return u.uSunAlpha.value; }, set opacity(v) { u.uSunAlpha.value = v; } } };
    this.moon = { material: { get opacity() { return u.uMoonAlpha.value; }, set opacity(v) { u.uMoonAlpha.value = v; } } };

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
    const t = this.time + dt / this.dayLength;
    if (t >= 1) this.day++;
    this.time = t % 1;
  }

  // time of day label (0.0 = midnight)
  clockString() {
    const h = Math.floor(this.time * 24), m = Math.floor((this.time * 24 - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Called each frame with camera position and render distance (chunks)
  update(dt, camPos, renderDistance, underwater = false) {
    this.advance(dt);
    this.elapsed += dt;
    this.cloudOffset += dt * 0.6;
    const a = (this.time - 0.25) * Math.PI * 2;
    this.sunDir.set(Math.cos(a), Math.sin(a) * Math.cos(ORBIT_TILT), Math.sin(a) * Math.sin(ORBIT_TILT));
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
    const su = SHADING_UNIFORMS;
    su.uSkyTop.value.copy(top);
    su.uSkyHorizon.value.copy(horizon);
    su.uSkyVoid.value.copy(voidC);
    su.uSunsetColor.value.copy(SUNSET);
    su.uSunsetStrength.value = sunset * 0.9;
    su.uSunDiscDir.value.copy(this.sunDir);
    su.uMoonDir.value.copy(this.sunDir).multiplyScalar(-1);
    su.uMoonPhase.value = (this.day % MOON_PHASES) / MOON_PHASES;
    su.uSkyDay.value = day;
    su.uTimeS.value = this.elapsed;
    this.fogColor.copy(horizon);
    const R = renderDistance * 16;
    this.fogNear = R * 0.6;
    this.fogFar = R * 0.98;
    if (underwater) { this.fogColor.set(0.02, 0.06, 0.3); this.fogNear = 1; this.fogFar = 18; }
    this.dome.position.copy(camPos);
    this.celestial.position.copy(camPos);
    // stars rotate with the sun: map -z -> +x, rotate about world z by the sun angle, then tilt the orbit
    this.celestial.quaternion.setFromAxisAngle(Z_AXIS, a).premultiply(TILT_Q).multiply(Y_FLIP_Q);
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
    this.cloudMat.opacity = 0.85;
  }

  // Region look (call right after update, before disaster overrides). mix: { space: 0..1, coruscant: 0..1 }.
  // Space: black sky, full stars, no clouds, no haze. Coruscant: no low clouds, a warm smoggy horizon, longer fog,
  // and at night a warm city-glow band on the horizon.
  applyRegion(mix) {
    if (!mix) return;
    const sp = mix.space || 0, co = mix.coruscant || 0;
    const u = this.domeMat.uniforms;
    if (sp > 0.001) {
      const black = new THREE.Color(0.005, 0.005, 0.01);
      u.uSkyTop.value.lerp(black, sp); u.uSkyHorizon.value.lerp(new THREE.Color(0.02, 0.02, 0.05), sp); u.uSkyVoid.value.lerp(black, sp);
      u.uSunsetStrength.value *= 1 - sp;
      this.fogColor.lerp(black, sp);
      this.fogNear = lerp(this.fogNear, this.fogFar * 0.9, sp); this.fogFar = lerp(this.fogFar, this.fogFar * 3, sp); // no atmosphere
      this.starMat.opacity = Math.max(this.starMat.opacity, sp); this.stars.visible = this.stars.visible || sp > 0.01;
      this.moon.material.opacity = lerp(this.moon.material.opacity, 1, sp);
      this.cloudMat.opacity *= 1 - sp;
      this.skyLight = lerp(this.skyLight, 0.9, sp); // hard, shadowless "sunlight" in space
    }
    if (co > 0.001) {
      const night = 1 - this.dayFactor;
      const haze = new THREE.Color(0.78, 0.66, 0.52);
      const glow = new THREE.Color(0.55, 0.30, 0.14);   // sodium/neon city glow on the night horizon
      u.uSkyHorizon.value.lerp(haze, co * 0.55).lerp(glow, co * night * 0.6);
      u.uSkyVoid.value.lerp(haze, co * 0.4).lerp(glow, co * night * 0.35);
      // the glow band uses the sunset machinery: a warm band all around the horizon (azimuth term is small at night)
      u.uSunsetColor.value.lerp(glow, co * night);
      u.uSunsetStrength.value = Math.max(u.uSunsetStrength.value, co * night * 0.7);
      this.fogColor.lerp(haze, co * 0.45).lerp(glow, co * night * 0.4);
      this.cloudMat.opacity *= 1 - co;      // the city sits above its cloud deck; towers punch through nothing
    }
  }

  // Disaster override (call right after update): blend the dome, fog colour, celestials and clouds toward a
  // storm colour, and thin the vanilla cloud layer so a storm deck can replace it.
  applyOverride(ov, underwater = false) {
    if (!ov) return;
    const mix = ov.skyMix || 0;
    if (mix > 0.005) {
      const u = this.domeMat.uniforms, c = ov.skyColor;
      u.uSkyTop.value.lerp(c, mix); u.uSkyHorizon.value.lerp(c, mix); u.uSkyVoid.value.lerp(c, mix);
      u.uSunsetStrength.value *= 1 - mix;
      if (!underwater) this.fogColor.lerp(c, mix);
      this.sun.material.opacity *= 1 - mix; this.moon.material.opacity *= 1 - mix; this.starMat.opacity *= 1 - mix;
      this.cloudMat.color.lerp(c, mix * 0.85);
    }
    if (ov.cloudAlpha !== undefined) this.cloudMat.opacity *= ov.cloudAlpha; // relative: update() resets to 0.85, regions may have thinned it already
    this.clouds.visible = this.cloudMat.opacity > 0.01;
  }
}
