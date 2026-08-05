/**
 * GPU particle system.
 *
 * All motion is evaluated in the vertex shader from per-instance spawn state,
 * so a live particle costs nothing on the CPU after it is emitted. One draw
 * call covers thousands of particles. Slots are recycled through a ring so the
 * system never allocates during play.
 *
 * Two flavours share the implementation:
 *   - SMOKE: normal blending, cheaply lit by the scene's key light, fogged.
 *   - HOT:   additive, self-illuminated, optionally stretched along velocity.
 */

import * as THREE from 'three';
import { SlotRing } from '../util/pool.js';
import { smokePuff, glowSprite } from '../util/textures.js';
import { AERIAL_UNIFORMS, AERIAL_PARS, syncAerial } from './aerial.js';

const VERT = /* glsl */`
  attribute vec3  aStart;
  attribute vec3  aVel;
  attribute vec4  aTime;    // x: birth, y: life, z: sizeStart, w: sizeEnd
  attribute vec4  aColor;   // rgb tint, a: peak opacity
  attribute vec4  aParams;  // x: seed, y: drag, z: gravity, w: stretch

  uniform float uTime;
  uniform float uTurbulence;
  uniform float uFadeIn;

  varying vec2  vUv;
  varying vec4  vColor;
  varying float vLife;
  varying vec3  vViewNormal;
  varying float vHaze;

  ${AERIAL_PARS}

  void main() {
    float t = uTime - aTime.x;
    float life = max(aTime.y, 0.0001);
    float k = t / life;
    vLife = k;

    if (k < 0.0 || k > 1.0) {
      // Dead slot: collapse to a degenerate point behind the camera.
      gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
      vUv = uv; vColor = vec4(0.0); vViewNormal = vec3(0.0, 0.0, 1.0); vHaze = 0.0;
      return;
    }

    float d = aParams.y;
    vec3 disp = aVel * (d > 0.0001 ? (1.0 - exp(-d * t)) / d : t);
    disp.y += 0.5 * aParams.z * t * t;

    // Cheap curl-ish wobble so plumes churn instead of drifting rigidly.
    float s = aParams.x;
    float w = uTurbulence * t;
    disp += vec3(
      sin(t * 1.7 + s * 6.283) * w,
      sin(t * 1.1 + s * 12.9) * w * 0.55,
      cos(t * 1.45 + s * 9.42) * w
    );

    vec3 center = aStart + disp;
    vec4 mv = viewMatrix * vec4(center, 1.0);

    float size = mix(aTime.z, aTime.w, 1.0 - pow(1.0 - k, 1.6));
    // Quick pop-in avoids particles appearing at full size.
    size *= smoothstep(0.0, uFadeIn, k) * 0.25 + 0.75;

    float ang = s * 6.283 + t * (s - 0.5) * 1.4;
    float ca = cos(ang), sa = sin(ang);
    vec2 corner = vec2(position.x * ca - position.y * sa, position.x * sa + position.y * ca);

    if (aParams.w > 0.001) {
      // Stretch along view-space velocity: sparks and ember streaks.
      vec3 vv = (viewMatrix * vec4(aVel, 0.0)).xyz;
      vec2 dir = normalize(vv.xy + vec2(0.0001, 0.0));
      vec2 perp = vec2(-dir.y, dir.x);
      float len = 1.0 + aParams.w * min(length(vv) * 0.06, 14.0);
      corner = dir * position.y * len + perp * position.x;
    }

    mv.xy += corner * size;

    vUv = uv;
    vColor = aColor;
    // Fake hemispherical normal across the sprite for the lit smoke pass.
    vViewNormal = normalize(vec3((uv - 0.5) * 1.6, 0.85));
    vHaze = aerialFactor(center);

    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG_SMOKE = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3 uLightDir;      // view-space direction toward the light
  uniform vec3 uLightColor;
  uniform vec3 uShadowColor;
  uniform float uSoftness;
  uniform vec3 uHazeColor;

  varying vec2  vUv;
  varying vec4  vColor;
  varying float vLife;
  varying vec3  vViewNormal;
  varying float vHaze;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float a = tex.a * vColor.a;
    // Fade in fast, out slow: smoke thins as it expands.
    a *= smoothstep(0.0, 0.08, vLife) * (1.0 - smoothstep(0.35, 1.0, vLife));
    if (a < 0.004) discard;

    float ndl = clamp(dot(normalize(vViewNormal), normalize(uLightDir)) * 0.5 + 0.5, 0.0, 1.0);
    // Translucent puffs pick up light from behind as well as in front.
    float wrap = pow(ndl, 0.75);
    vec3 lit = mix(uShadowColor, uLightColor, wrap);
    vec3 col = vColor.rgb * lit;
    col = mix(col, uHazeColor, vHaze);

    gl_FragColor = vec4(col, a * uSoftness);
  }
`;

const FRAG_HOT = /* glsl */`
  uniform sampler2D uMap;
  varying vec2  vUv;
  varying vec4  vColor;
  varying float vLife;
  varying float vHaze;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float a = tex.a * vColor.a;
    a *= (1.0 - smoothstep(0.0, 1.0, vLife));
    if (a < 0.004) discard;
    // Hot cores wash out to white early then cool toward the tint.
    vec3 col = mix(vColor.rgb * 1.6, vColor.rgb * 0.5, smoothstep(0.0, 0.7, vLife));
    // Additive light is scattered out of the beam by haze, not tinted by it.
    col *= (1.0 - vHaze * 0.85);
    gl_FragColor = vec4(col * a, a);
  }
`;

let baseGeo = null;
function getBaseGeo() {
  if (!baseGeo) {
    baseGeo = new THREE.PlaneGeometry(1, 1);
  }
  return baseGeo;
}

export class ParticleSystem {
  /**
   * @param {object} opts
   * @param {'smoke'|'hot'} opts.kind
   * @param {number} opts.capacity
   */
  constructor({ kind = 'smoke', capacity = 1200, texture = null, turbulence = 0.6, softness = 1.0 } = {}) {
    this.kind = kind;
    this.capacity = capacity;
    this.ring = new SlotRing(capacity);
    this.time = 0;

    const geo = new THREE.InstancedBufferGeometry();
    const base = getBaseGeo();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);

    this.aStart = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.aVel = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.aTime = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.aColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.aParams = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    for (const a of [this.aStart, this.aVel, this.aTime, this.aColor, this.aParams]) {
      a.setUsage(THREE.DynamicDrawUsage);
    }
    geo.setAttribute('aStart', this.aStart);
    geo.setAttribute('aVel', this.aVel);
    geo.setAttribute('aTime', this.aTime);
    geo.setAttribute('aColor', this.aColor);
    geo.setAttribute('aParams', this.aParams);
    geo.instanceCount = capacity;
    // Particles move far from their spawn point; skip frustum culling entirely.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);

    const tex = texture || (kind === 'smoke' ? smokePuff(128, 3) : glowSprite(128, 2.6));
    const uniforms = {
      ...AERIAL_UNIFORMS(),
      uTime: { value: 0 },
      uMap: { value: tex },
      uTurbulence: { value: turbulence },
      uFadeIn: { value: 0.06 },
    };
    if (kind === 'smoke') {
      uniforms.uLightDir = { value: new THREE.Vector3(0, 0, 1) };
      uniforms.uLightColor = { value: new THREE.Color(0xffffff) };
      uniforms.uShadowColor = { value: new THREE.Color(0x33404f) };
      uniforms.uSoftness = { value: softness };
    }

    this.material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: kind === 'smoke' ? FRAG_SMOKE : FRAG_HOT,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: kind === 'smoke' ? THREE.NormalBlending : THREE.AdditiveBlending,
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = kind === 'smoke' ? 8 : 12;
    this.mesh.matrixAutoUpdate = false;
    this.geometry = geo;

    this._tmpColor = new THREE.Color();
  }

  /**
   * Emit one particle.
   * @param {THREE.Vector3|{x,y,z}} pos
   * @param {THREE.Vector3|{x,y,z}} vel
   */
  emit(pos, vel, {
    life = 2, sizeStart = 1, sizeEnd = 3, color = 0xffffff, opacity = 1,
    drag = 0.6, gravity = 0, stretch = 0, seed = Math.random(),
  } = {}) {
    const i = this.ring.claim();
    const i3 = i * 3, i4 = i * 4;
    const s = this.aStart.array, v = this.aVel.array, t = this.aTime.array;
    const c = this.aColor.array, p = this.aParams.array;

    s[i3] = pos.x; s[i3 + 1] = pos.y; s[i3 + 2] = pos.z;
    v[i3] = vel.x; v[i3 + 1] = vel.y; v[i3 + 2] = vel.z;
    t[i4] = this.time; t[i4 + 1] = life; t[i4 + 2] = sizeStart; t[i4 + 3] = sizeEnd;

    const col = typeof color === 'number' ? this._tmpColor.setHex(color) : color;
    c[i4] = col.r; c[i4 + 1] = col.g; c[i4 + 2] = col.b; c[i4 + 3] = opacity;
    p[i4] = seed; p[i4 + 1] = drag; p[i4 + 2] = gravity; p[i4 + 3] = stretch;

    this._dirty = true;
    this._minDirty = Math.min(this._minDirty ?? i, i);
    this._maxDirty = Math.max(this._maxDirty ?? i, i);
    return i;
  }

  update(dt) {
    this.time += dt;
    this.material.uniforms.uTime.value = this.time;
    if (this._dirty) {
      // Upload only the touched slot range.
      const lo = this._minDirty, hi = this._maxDirty;
      const n = hi - lo + 1;
      for (const [attr, comps] of [[this.aStart, 3], [this.aVel, 3], [this.aTime, 4], [this.aColor, 4], [this.aParams, 4]]) {
        attr.updateRanges.length = 0;
        attr.addUpdateRange(lo * comps, n * comps);
        attr.needsUpdate = true;
      }
      this._dirty = false;
      this._minDirty = null;
      this._maxDirty = null;
    }
  }

  /** Sync lighting with the current time-of-day preset. */
  setLighting(lightDirView, lightColor, shadowColor) {
    if (this.kind !== 'smoke') return;
    this.material.uniforms.uLightDir.value.copy(lightDirView);
    this.material.uniforms.uLightColor.value.copy(lightColor);
    this.material.uniforms.uShadowColor.value.copy(shadowColor);
  }

  setHaze(opts) { syncAerial(this.material, opts); }

  clear() {
    this.aTime.array.fill(0);
    // Push every birth time far into the past so all slots read as dead.
    for (let i = 0; i < this.capacity; i++) this.aTime.array[i * 4 + 1] = 0.0001;
    this.aTime.needsUpdate = true;
    this.ring.clear();
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
