/**
 * Contrail ribbons.
 *
 * Each missile owns a camera-facing ribbon built from its recent flight path.
 * The ribbon widens and fades with age, and both the initial width and the
 * fade rate are driven by the air density recorded when each spine point was
 * laid down - so low, dense-air smoke is thick and short-lived while high
 * altitude trails are thin, pale and persist across the whole sky.
 *
 * A minimum screen-space width keeps trails readable at 40 km, which is what
 * makes a distant intercept legible at all.
 */

import * as THREE from 'three';
import { airDensity } from '../util/mathx.js';
import { noiseTexture } from '../util/textures.js';
import { AERIAL_UNIFORMS, AERIAL_PARS, syncAerial } from './aerial.js';

const VERT = /* glsl */`
  attribute vec3  aTangent;
  attribute float aSide;
  attribute float aBirth;
  attribute vec2  aMeta;     // x: air density at emission, y: arc length

  uniform float uTime;
  uniform float uWidth;
  uniform float uMaxAge;
  uniform float uPixelScale;  // viewportHeight / (2 tan(fov/2))
  uniform float uMinPixels;
  uniform float uExpand;

  varying float vAge;
  varying float vSide;
  varying float vDensity;
  varying float vArc;
  varying float vHaze;

  ${AERIAL_PARS}

  void main() {
    float age = (uTime - aBirth) / max(uMaxAge, 0.001);
    vAge = age;
    vSide = aSide;
    vDensity = aMeta.x;
    vArc = aMeta.y;

    vec4 mv = viewMatrix * vec4(position, 1.0);
    float dist = max(length(mv.xyz), 0.001);

    // Thick close to the nozzle in dense air; thin and slowly spreading up high.
    float w = uWidth * (0.42 + aMeta.x * 0.85);
    w += uWidth * uExpand * age * (0.8 + (1.0 - aMeta.x) * 1.6);

    // Never let a distant trail fall below a readable pixel width.
    float minW = dist * uMinPixels / max(uPixelScale, 1.0);
    w = max(w, minW);

    vec3 tv = (viewMatrix * vec4(aTangent, 0.0)).xyz;
    vec3 toCam = normalize(-mv.xyz);
    vec3 side = cross(normalize(tv + vec3(0.0, 0.0001, 0.0)), toCam);
    float sl = length(side);
    side = sl > 0.0001 ? side / sl : vec3(1.0, 0.0, 0.0);

    mv.xyz += side * (aSide * w);
    vHaze = aerialFactor(position);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */`
  uniform vec3  uSmokeColor;
  uniform vec3  uHotColor;
  uniform vec3  uLightColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform sampler2D uNoise;
  uniform float uHotSpan;
  uniform vec3 uHazeColor;

  varying float vAge;
  varying float vSide;
  varying float vDensity;
  varying float vArc;
  varying float vHaze;

  void main() {
    if (vAge < 0.0 || vAge > 1.0) discard;

    // Soft across the ribbon width.
    float across = 1.0 - abs(vSide);
    float edge = pow(smoothstep(0.0, 0.55, across), 0.7);

    // Break the trail up so it reads as billowing smoke rather than a decal.
    float n = texture2D(uNoise, vec2(vArc * 0.02, vSide * 0.5 + 0.5 + vAge * 0.15)).r;
    float n2 = texture2D(uNoise, vec2(vArc * 0.0061 - vAge * 0.08, vSide * 0.25 + 0.5)).g;
    float breakup = mix(0.55, 1.25, n * 0.6 + n2 * 0.4);

    float fade = pow(1.0 - vAge, 1.35);
    // Thin air => fainter trail, but it lingers; dense air => opaque and brief.
    float dens = mix(0.28, 1.0, vDensity);

    float a = edge * fade * breakup * dens * uOpacity;
    a *= smoothstep(0.0, 0.02, vAge);
    if (a < 0.004) discard;

    // Hot exhaust right behind the nozzle cools into smoke.
    float hot = 1.0 - smoothstep(0.0, uHotSpan, vAge);
    vec3 col = mix(uSmokeColor * uLightColor, uHotColor, hot * hot);
    col += uHotColor * hot * 0.9;
    col = mix(col, uHazeColor, vHaze);
    // Haze also washes the trail out rather than only tinting it.
    a *= 1.0 - vHaze * 0.55;

    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }
`;

export class TrailRibbon {
  constructor(capacity = 96) {
    this.capacity = capacity;
    this.count = 0;
    this.arc = 0;
    this._last = new THREE.Vector3();
    this._hasLast = false;

    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(capacity * 2 * 3);
    this.tan = new Float32Array(capacity * 2 * 3);
    this.side = new Float32Array(capacity * 2);
    this.birth = new Float32Array(capacity * 2);
    this.meta = new Float32Array(capacity * 2 * 2);
    for (let i = 0; i < capacity; i++) {
      this.side[i * 2] = -1;
      this.side[i * 2 + 1] = 1;
    }
    const idx = new Uint16Array((capacity - 1) * 6);
    for (let i = 0; i < capacity - 1; i++) {
      const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
      idx[i * 6 + 0] = a; idx[i * 6 + 1] = b; idx[i * 6 + 2] = d;
      idx[i * 6 + 3] = a; idx[i * 6 + 4] = d; idx[i * 6 + 5] = c;
    }
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aTan = new THREE.BufferAttribute(this.tan, 3).setUsage(THREE.DynamicDrawUsage);
    this.aSide = new THREE.BufferAttribute(this.side, 1);
    this.aBirth = new THREE.BufferAttribute(this.birth, 1).setUsage(THREE.DynamicDrawUsage);
    this.aMeta = new THREE.BufferAttribute(this.meta, 2).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.aPos);
    geo.setAttribute('aTangent', this.aTan);
    geo.setAttribute('aSide', this.aSide);
    geo.setAttribute('aBirth', this.aBirth);
    geo.setAttribute('aMeta', this.aMeta);
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.setDrawRange(0, 0);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
    this.geometry = geo;
  }

  reset() {
    this.count = 0;
    this.arc = 0;
    this._hasLast = false;
    this.geometry.setDrawRange(0, 0);
  }

  /** Append a spine point. `time` is the shared trail clock. */
  push(p, time, density) {
    if (this.count >= this.capacity) {
      // Drop the oldest point: memmove the whole ribbon back one slot.
      this.pos.copyWithin(0, 6);
      this.tan.copyWithin(0, 6);
      this.birth.copyWithin(0, 2);
      this.meta.copyWithin(0, 4);
      this.count--;
    }
    const i = this.count;
    const i6 = i * 6, i2 = i * 2, i4 = i * 4;
    for (const o of [0, 3]) {
      this.pos[i6 + o] = p.x; this.pos[i6 + o + 1] = p.y; this.pos[i6 + o + 2] = p.z;
    }
    this.birth[i2] = time; this.birth[i2 + 1] = time;
    if (this._hasLast) this.arc += this._last.distanceTo(p);
    this._last.copy(p);
    this._hasLast = true;
    this.meta[i4] = density; this.meta[i4 + 1] = this.arc;
    this.meta[i4 + 2] = density; this.meta[i4 + 3] = this.arc;
    this.count++;

    this._recomputeTangents();
    this.geometry.setDrawRange(0, Math.max(0, (this.count - 1) * 6));
    this.aPos.needsUpdate = true;
    this.aTan.needsUpdate = true;
    this.aBirth.needsUpdate = true;
    this.aMeta.needsUpdate = true;
  }

  /** Move the head point without adding a new one (keeps the ribbon glued on). */
  updateHead(p, time, density) {
    if (this.count === 0) { this.push(p, time, density); return; }
    const i = this.count - 1;
    const i6 = i * 6, i2 = i * 2, i4 = i * 4;
    for (const o of [0, 3]) {
      this.pos[i6 + o] = p.x; this.pos[i6 + o + 1] = p.y; this.pos[i6 + o + 2] = p.z;
    }
    this.birth[i2] = time; this.birth[i2 + 1] = time;
    this.meta[i4] = density; this.meta[i4 + 2] = density;
    this._recomputeTangents(Math.max(0, i - 1));
    this.aPos.needsUpdate = true;
    this.aTan.needsUpdate = true;
    this.aBirth.needsUpdate = true;
  }

  _recomputeTangents(from = 0) {
    const n = this.count;
    if (n < 2) return;
    for (let i = Math.max(0, from); i < n; i++) {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      const ax = this.pos[a * 6], ay = this.pos[a * 6 + 1], az = this.pos[a * 6 + 2];
      const bx = this.pos[b * 6], by = this.pos[b * 6 + 1], bz = this.pos[b * 6 + 2];
      let tx = bx - ax, ty = by - ay, tz = bz - az;
      const len = Math.hypot(tx, ty, tz) || 1;
      tx /= len; ty /= len; tz /= len;
      const i6 = i * 6;
      this.tan[i6] = tx; this.tan[i6 + 1] = ty; this.tan[i6 + 2] = tz;
      this.tan[i6 + 3] = tx; this.tan[i6 + 4] = ty; this.tan[i6 + 5] = tz;
    }
  }

  dispose() { this.geometry.dispose(); }
}

/**
 * Owns the shared trail material and a pool of ribbons.
 * Ribbons keep rendering (and fading) after their missile dies, which is what
 * leaves the sky criss-crossed with smoke after an engagement.
 */
export class TrailManager {
  constructor(scene, { capacity = 18, segments = 96 } = {}) {
    this.scene = scene;
    this.time = 0;
    this.segments = segments;
    this.free = [];
    this.live = [];
    this.group = new THREE.Group();
    this.group.name = 'trails';
    scene.add(this.group);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        ...AERIAL_UNIFORMS(),
        uTime: { value: 0 },
        uWidth: { value: 4 },
        uMaxAge: { value: 12 },
        uPixelScale: { value: 700 },
        uMinPixels: { value: 1.4 },
        uExpand: { value: 1.5 },
        uSmokeColor: { value: new THREE.Color(0xffffff) },
        uHotColor: { value: new THREE.Color(0xff9a3c) },
        uLightColor: { value: new THREE.Color(0xffffff) },
        uOpacity: { value: 0.85 },
        uNoise: { value: noiseTexture(128, 5) },
        uHotSpan: { value: 0.05 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });

    for (let i = 0; i < capacity; i++) {
      const r = new TrailRibbon(segments);
      const mesh = new THREE.Mesh(r.geometry, this.material.clone());
      mesh.frustumCulled = false;
      mesh.renderOrder = 6;
      mesh.visible = false;
      mesh.matrixAutoUpdate = false;
      r.mesh = mesh;
      this.group.add(mesh);
      this.free.push(r);
    }
  }

  /**
   * Take a ribbon. `style` comes from the battery/threat definition.
   * Returns null when the pool is exhausted (visuals degrade, sim does not).
   */
  acquire(style = {}) {
    let r = this.free.pop();
    if (!r) {
      // Recycle the oldest live ribbon rather than dropping the effect.
      const oldest = this.live.reduce((a, b) => (a.deadAt ?? Infinity) < (b.deadAt ?? Infinity) ? a : b, this.live[0]);
      if (!oldest) return null;
      this.release(oldest, true);
      r = this.free.pop();
      if (!r) return null;
    }
    r.reset();
    r.deadAt = null;
    r.maxAge = style.life ?? 12;
    const u = r.mesh.material.uniforms;
    u.uWidth.value = style.width ?? 4;
    u.uMaxAge.value = r.maxAge;
    u.uSmokeColor.value.set(style.colour ?? 0xffffff);
    u.uHotColor.value.set(style.hot ?? 0xff9a3c);
    u.uOpacity.value = style.opacity ?? 0.85;
    u.uExpand.value = style.expand ?? 1.5;
    u.uMinPixels.value = style.minPixels ?? 1.4;
    u.uHotSpan.value = style.hotSpan ?? 0.05;
    r.mesh.visible = true;
    this.live.push(r);
    return r;
  }

  /** Missile is gone: let the ribbon fade out on its own before recycling. */
  retire(r) {
    if (!r) return;
    r.deadAt = this.time;
  }

  release(r, immediate = false) {
    const i = this.live.indexOf(r);
    if (i >= 0) this.live.splice(i, 1);
    r.mesh.visible = false;
    r.reset();
    r.deadAt = null;
    this.free.push(r);
  }

  push(r, p, density) {
    if (r) r.push(p, this.time, density);
  }

  update(dt, camera, viewportHeight) {
    this.time += dt;
    const pixelScale = viewportHeight / (2 * Math.tan((camera.fov * Math.PI) / 360));
    for (let i = this.live.length - 1; i >= 0; i--) {
      const r = this.live[i];
      const u = r.mesh.material.uniforms;
      u.uTime.value = this.time;
      u.uPixelScale.value = pixelScale;
      if (r.deadAt !== null && this.time - r.deadAt > r.maxAge) {
        this.release(r);
      }
    }
  }

  setLighting(colour) {
    for (const r of [...this.live, ...this.free]) {
      r.mesh.material.uniforms.uLightColor.value.copy(colour);
    }
  }

  setHaze(opts) {
    for (const r of this.live) syncAerial(r.mesh.material, opts);
    for (const r of this.free) syncAerial(r.mesh.material, opts);
  }

  clear() {
    for (let i = this.live.length - 1; i >= 0; i--) this.release(this.live[i]);
  }

  /** Auto-emit helper: pushes a point when the missile has moved far enough. */
  follow(r, pos, minStep = 22) {
    if (!r) return;
    if (r.count === 0) {
      r.push(pos, this.time, airDensity(pos.y));
      r.push(pos, this.time, airDensity(pos.y));
      return;
    }
    const d = r._last.distanceTo(pos);
    if (d >= minStep) r.push(pos, this.time, airDensity(pos.y));
    else r.updateHead(pos, this.time, airDensity(pos.y));
  }
}
