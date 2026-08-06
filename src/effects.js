// Pooled visual effects: billboard particle layers, camera-facing ribbon trails,
// noise-displaced fireballs, shockwaves, debris, ground decals and launch plumes.
// Nothing here allocates during play; every system is a fixed-size pool.

import * as THREE from 'three';
import { atmosphere } from './util/materials.js';
import { std, applyAtmosphere } from './util/materials.js';
import { GLSL_NOISE } from './util/noise.js';
import { trailPersistence, airDensity } from './physics.js';
import { WORLD } from './config.js';
import {
  smokeSprite,
  softSprite,
  sparkSprite,
  flareSprite,
  ringSprite,
  scorchDecalTexture,
  craterDecalTexture,
} from './util/textures.js';

/* --------------------------------------------------- atmosphere for shaders */

const ATM_PARS = /* glsl */ `
uniform vec3 uAtmColor;
uniform float uAtmDensity;
uniform float uAtmHeight;
uniform vec3 uAtmSunDir;
uniform vec3 uAtmSunColor;
uniform float uAtmHaze;
uniform float uAtmGroundY;
vec3 applyAtm( vec3 color, vec3 worldPos, out float transOut ) {
  float hC = cameraPosition.y - uAtmGroundY;
  float hP = worldPos.y - uAtmGroundY;
  float dh = hP - hC;
  float dist = length( worldPos - cameraPosition );
  float dC = uAtmDensity * exp( -max( hC, 0.0 ) / uAtmHeight );
  float tau;
  if ( abs( dh ) < 1.0 ) tau = dC * dist;
  else { float k = -dh / uAtmHeight; tau = dC * dist * ( 1.0 - exp( k ) ) / ( -k ); }
  tau *= mix( 1.0, uAtmHaze, clamp( 1.0 - max( hC, 0.0 ) / 900.0, 0.0, 1.0 ) );
  float trans = clamp( exp( -tau ), 0.0, 1.0 );
  transOut = trans;
  vec3 viewDir = normalize( worldPos - cameraPosition );
  float mu = max( dot( viewDir, uAtmSunDir ), 0.0 );
  vec3 insc = uAtmColor + uAtmSunColor * ( pow( mu, 8.0 ) * 0.55 + pow( mu, 2.0 ) * 0.1 );
  return mix( insc, color, trans );
}
`;

/**
 * Ambient light level for particle albedo. Smoke and dust are drawn in a custom
 * shader with no scene lights, so without this a tan dust cloud stays fully
 * bright at midnight. Emissive layers are exempt via `uEmissive`.
 */
export const particleAmbient = { uAmbient: { value: new THREE.Color(1, 1, 1) } };

function withAtm(uniforms) {
  return Object.assign({}, atmosphere, particleAmbient, uniforms);
}

/* ------------------------------------------------------ logarithmic depth */

// The renderer runs with `logarithmicDepthBuffer`, which means the depth buffer
// holds log2( 1 + w ) * FC * 0.5 rather than the usual projected z. A custom
// shader that does not encode depth the same way is compared against the
// terrain in the wrong space and loses the depth test everywhere it overlaps
// solid geometry - which is exactly where blast and impact effects live.
// ShaderMaterial does not get the <common> chunk, so the helper the stock
// vertex chunk relies on has to be declared here.
const LOGDEPTH_PARS_VERT = /* glsl */ `
bool isPerspectiveMatrix( mat4 m ) { return m[ 2 ][ 3 ] == -1.0; }
#include <logdepthbuf_pars_vertex>
`;
const LOGDEPTH_VERT = /* glsl */ `
#include <logdepthbuf_vertex>
`;
const LOGDEPTH_PARS_FRAG = /* glsl */ `
#include <logdepthbuf_pars_fragment>
`;
const LOGDEPTH_FRAG = /* glsl */ `
#include <logdepthbuf_fragment>
`;

// Billboards are camera-facing quads offset purely in view-space XY, so all four
// corners share one w. Encoding the log depth into gl_Position.z is therefore
// exact for them and, unlike writing gl_FragDepth, it keeps early-Z rejection -
// which matters a lot for the layer with the heaviest overdraw.
const LOGDEPTH_FLAT_PARS = /* glsl */ `
#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
  uniform float logDepthBufFC;
#endif
`;
const LOGDEPTH_FLAT = /* glsl */ `
#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
  if ( projectionMatrix[ 2 ][ 3 ] == -1.0 ) {
    gl_Position.z = ( log2( max( 1e-6, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0 ) * gl_Position.w;
  }
#endif
`;

/**
 * Premultiplied "over" blending. RGB is written pre-multiplied by coverage, so a
 * fragment with alpha 0 adds light like additive blending while a fragment with
 * alpha 1 occludes what is behind it. One material can then carry a fireball
 * from incandescent gas to opaque soot without a second draw call.
 */
const PREMULT = {
  transparent: true,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
  blendEquationAlpha: THREE.AddEquation,
  blendSrcAlpha: THREE.OneFactor,
  blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
};

/* ------------------------------------------------------- billboard layer */

const PARTICLE_VERT = /* glsl */ `
attribute vec3 aPos;
attribute float aScale;
attribute float aRot;
attribute vec3 aColor;
attribute float aAlpha;
attribute vec3 aStretch;
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
varying vec3 vWorld;
varying float vRot;
varying float vRadius;
uniform float uStretchAmount;
${LOGDEPTH_FLAT_PARS}
void main() {
  vUv = uv;
  vColor = aColor;
  vAlpha = aAlpha;
  vRot = aRot;
  vRadius = aScale * 0.5;
  vec4 mv = viewMatrix * vec4( aPos, 1.0 );
  vec2 q = position.xy * aScale;
  float c = cos( aRot ), s = sin( aRot );
  vec2 r = vec2( q.x * c - q.y * s, q.x * s + q.y * c );
  if ( uStretchAmount > 0.0 ) {
    // Stretch along the view-space projection of the velocity vector.
    vec3 sv = ( viewMatrix * vec4( aStretch, 0.0 ) ).xyz;
    vec2 dir = length( sv.xy ) > 1e-5 ? normalize( sv.xy ) : vec2( 0.0, 1.0 );
    vec2 perp = vec2( -dir.y, dir.x );
    float amt = 1.0 + length( aStretch ) * uStretchAmount;
    r = dir * ( q.y * aScale * 0.0 + q.y * amt ) + perp * q.x;
  }
  mv.xy += r;
  vWorld = aPos;
  gl_Position = projectionMatrix * mv;
  ${LOGDEPTH_FLAT}
}
`;

const PARTICLE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform float uEmissive;
uniform float uSunLit;
uniform vec3 uAmbient;
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
varying vec3 vWorld;
varying float vRot;
varying float vRadius;
${ATM_PARS}
void main() {
  vec4 t = texture2D( uMap, vUv );
  float a = t.a * vAlpha;
  // Near fade. A launch dust puff grows past 100 m across, so standing on the
  // apron during a salvo used to put the camera *inside* several of them at once
  // and the frame washed to a flat dome that hid the mountain ring. Fading a
  // billboard as the eye enters it is the standard answer and is also the honest
  // one: you cannot see the far side of a cloud you are in.
  a *= smoothstep( vRadius * 0.35, vRadius * 1.3, length( vWorld - cameraPosition ) );
  if ( a < 0.003 ) discard;
  vec3 col = t.rgb * vColor;
  if ( uSunLit > 0.0 ) {
    // Treat the billboard as a sphere so puffs pick up a sun side and a shadow
    // side. Cheap, but it is what stops smoke reading as flat grey paper.
    float c = cos( -vRot ), s = sin( -vRot );
    vec2 q = vUv * 2.0 - 1.0;
    vec2 r = vec2( q.x * c - q.y * s, q.x * s + q.y * c );
    float rr = min( dot( r, r ), 1.0 );
    vec3 n = vec3( r, sqrt( 1.0 - rr ) );
    vec3 right = vec3( viewMatrix[ 0 ][ 0 ], viewMatrix[ 1 ][ 0 ], viewMatrix[ 2 ][ 0 ] );
    vec3 up = vec3( viewMatrix[ 0 ][ 1 ], viewMatrix[ 1 ][ 1 ], viewMatrix[ 2 ][ 1 ] );
    vec3 fwd = vec3( viewMatrix[ 0 ][ 2 ], viewMatrix[ 1 ][ 2 ], viewMatrix[ 2 ][ 2 ] );
    vec3 wn = normalize( right * n.x + up * n.y + fwd * n.z );
    float ndl = clamp( dot( wn, uAtmSunDir ) * 0.5 + 0.5, 0.0, 1.0 );
    float lit = pow( ndl, 1.8 );
    col *= mix( 1.0, 0.6 + 0.8 * lit, uSunLit );
    col += uAtmSunColor * ( lit * lit ) * uSunLit * 0.22;
    // Forward scattering: a puff between the eye and the sun glows at the edge.
    vec3 viewDir = normalize( vWorld - cameraPosition );
    float ms = pow( max( dot( viewDir, uAtmSunDir ), 0.0 ), 6.0 );
    col += uAtmSunColor * ms * uSunLit * 0.2 * ( 1.0 - t.a );
  }
  col *= mix( uAmbient, vec3( 1.0 ), uEmissive );
  float trans;
  vec3 lit = applyAtm( col, vWorld, trans );
  // Emissive material keeps its own colour through the haze.
  col = mix( lit, col, uEmissive );
  gl_FragColor = vec4( col, a );
}
`;

const NO_HUG = -1e9;

class BillboardLayer {
  constructor(capacity, texture, { blending = THREE.NormalBlending, sorted = false, stretch = 0, emissive = 0, sunLit = 0, depthWrite = false, renderOrder = null } = {}) {
    this.capacity = capacity;
    this.count = 0;
    this.sorted = sorted;

    const n = capacity;
    this.px = new Float32Array(n);
    this.py = new Float32Array(n);
    this.pz = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.vz = new Float32Array(n);
    this.size0 = new Float32Array(n);
    this.size1 = new Float32Array(n);
    this.rot = new Float32Array(n);
    this.rotV = new Float32Array(n);
    this.age = new Float32Array(n);
    this.life = new Float32Array(n);
    this.cr = new Float32Array(n);
    this.cg = new Float32Array(n);
    this.cb = new Float32Array(n);
    this.cr1 = new Float32Array(n);
    this.cg1 = new Float32Array(n);
    this.cb1 = new Float32Array(n);
    this.cr2 = new Float32Array(n);
    this.cg2 = new Float32Array(n);
    this.cb2 = new Float32Array(n);
    this.alpha0 = new Float32Array(n);
    this.drag = new Float32Array(n);
    this.buoy = new Float32Array(n);
    this.gravity = new Float32Array(n);
    this.fadeIn = new Float32Array(n);
    this.wind = new Float32Array(n);
    // Turbulence: a per-particle wander that makes smoke churn instead of drift.
    this.turb = new Float32Array(n);
    this.phase = new Float32Array(n);
    // Ground-hugging particles (blast surges) never sink below this height.
    this.hugY = new Float32Array(n).fill(NO_HUG);

    const base = new THREE.PlaneGeometry(1, 1);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.attributes.position);
    this.geo.setAttribute('uv', base.attributes.uv);
    base.dispose();

    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.aScale = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    this.aRot = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    this.aColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.aAlpha = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    this.aStretch = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    for (const a of [this.aPos, this.aScale, this.aRot, this.aColor, this.aAlpha, this.aStretch]) a.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('aPos', this.aPos);
    this.geo.setAttribute('aScale', this.aScale);
    this.geo.setAttribute('aRot', this.aRot);
    this.geo.setAttribute('aColor', this.aColor);
    this.geo.setAttribute('aAlpha', this.aAlpha);
    this.geo.setAttribute('aStretch', this.aStretch);
    this.geo.instanceCount = 0;
    this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);

    this.mat = new THREE.ShaderMaterial({
      uniforms: withAtm({
        uMap: { value: texture },
        uStretchAmount: { value: stretch },
        uEmissive: { value: emissive },
        uSunLit: { value: sunLit },
      }),
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite,
      depthTest: true,
      blending,
      side: THREE.DoubleSide,
      toneMapped: true,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = renderOrder !== null ? renderOrder : blending === THREE.AdditiveBlending ? 12 : 10;
    this._order = new Int32Array(n);
    this._depth = new Float32Array(n);
    // Reused between frames: sorting must not allocate every draw.
    this._sortList = [];
    /** Particles actually written last frame. */
    this.live = 0;
  }

  spawn(opts) {
    let i;
    if (this.count < this.capacity) {
      i = this.count++;
    } else {
      // Recycle the oldest particle rather than dropping the new one.
      let worst = 0;
      let worstT = -1;
      for (let k = 0; k < this.capacity; k += 7) {
        const t = this.age[k] / Math.max(0.01, this.life[k]);
        if (t > worstT) {
          worstT = t;
          worst = k;
        }
      }
      i = worst;
    }
    const p = opts.pos;
    this.px[i] = p.x;
    this.py[i] = p.y;
    this.pz[i] = p.z;
    const v = opts.vel;
    this.vx[i] = v ? v.x : 0;
    this.vy[i] = v ? v.y : 0;
    this.vz[i] = v ? v.z : 0;
    this.size0[i] = opts.size0;
    this.size1[i] = opts.size1 !== undefined ? opts.size1 : opts.size0;
    this.rot[i] = opts.rot || 0;
    this.rotV[i] = opts.rotV || 0;
    this.age[i] = 0;
    this.life[i] = opts.life;
    const c0 = opts.color0;
    this.cr[i] = c0.r;
    this.cg[i] = c0.g;
    this.cb[i] = c0.b;
    const c1 = opts.color1 || c0;
    this.cr1[i] = c1.r;
    this.cg1[i] = c1.g;
    this.cb1[i] = c1.b;
    const c2 = opts.color2 || c1;
    this.cr2[i] = c2.r;
    this.cg2[i] = c2.g;
    this.cb2[i] = c2.b;
    this.alpha0[i] = opts.alpha !== undefined ? opts.alpha : 1;
    this.drag[i] = opts.drag !== undefined ? opts.drag : 1.2;
    this.buoy[i] = opts.buoyancy || 0;
    this.gravity[i] = opts.gravity || 0;
    this.fadeIn[i] = opts.fadeIn || 0.06;
    this.wind[i] = opts.wind !== undefined ? opts.wind : 1;
    this.turb[i] = opts.turb || 0;
    this.phase[i] = Math.random() * 100;
    this.hugY[i] = opts.hugY !== undefined ? opts.hugY : NO_HUG;
    return i;
  }

  update(dt, wind, time) {
    const wx = wind.x;
    const wy = wind.y;
    const wz = wind.z;
    for (let i = 0; i < this.count; i++) {
      if (this.age[i] >= this.life[i]) continue;
      this.age[i] += dt;
      const d = Math.exp(-this.drag[i] * dt);
      this.vx[i] = (this.vx[i] - wx * this.wind[i]) * d + wx * this.wind[i];
      this.vz[i] = (this.vz[i] - wz * this.wind[i]) * d + wz * this.wind[i];
      this.vy[i] = (this.vy[i] - wy * this.wind[i]) * d + wy * this.wind[i];
      this.vy[i] += (this.buoy[i] - this.gravity[i]) * dt;
      const tb = this.turb[i];
      if (tb > 0) {
        const a = time * 0.9 + this.phase[i];
        this.vx[i] += Math.sin(a * 1.7) * tb * dt;
        this.vy[i] += Math.sin(a * 1.31 + 2.1) * tb * 0.55 * dt;
        this.vz[i] += Math.cos(a * 1.13 + 4.2) * tb * dt;
      }
      this.px[i] += this.vx[i] * dt;
      this.py[i] += this.vy[i] * dt;
      this.pz[i] += this.vz[i] * dt;
      const hug = this.hugY[i];
      if (hug > NO_HUG * 0.5 && this.py[i] < hug) {
        // A surge rolling over the deck cannot go through it; it spreads instead.
        this.py[i] = hug;
        if (this.vy[i] < 0) this.vy[i] *= -0.2;
        this.vx[i] *= 1.004;
        this.vz[i] *= 1.004;
      }
      this.rot[i] += this.rotV[i] * dt;
    }
  }

  writeBuffers(camera) {
    const n = this.count;
    let live = 0;
    if (this.sorted && n > 0) {
      const cx = camera.position.x;
      const cy = camera.position.y;
      const cz = camera.position.z;
      const depth = this._depth;
      for (let i = 0; i < n; i++) {
        const dx = this.px[i] - cx;
        const dy = this.py[i] - cy;
        const dz = this.pz[i] - cz;
        depth[i] = dx * dx + dy * dy + dz * dz;
      }
      // Unused slots sort to the very back and are skipped when writing.
      for (let i = n; i < this.capacity; i++) depth[i] = -1;
      // Back-to-front insertion sort that reuses the previous frame's order.
      // Particle slots are stable and depths barely change between frames, so
      // this is near-linear and, unlike Array.sort, it touches no heap.
      const order = this._order;
      if (!this._orderReady) {
        for (let i = 0; i < this.capacity; i++) order[i] = i;
        this._orderReady = true;
      }
      for (let k = 1; k < this.capacity; k++) {
        const idx = order[k];
        const d = depth[idx];
        let j = k - 1;
        while (j >= 0 && depth[order[j]] < d) {
          order[j + 1] = order[j];
          j--;
        }
        order[j + 1] = idx;
      }
    } else {
      const order = this._order;
      for (let i = 0; i < n; i++) order[i] = i;
    }

    const pos = this.aPos.array;
    const sc = this.aScale.array;
    const rt = this.aRot.array;
    const col = this.aColor.array;
    const al = this.aAlpha.array;
    const st = this.aStretch.array;
    for (let k = 0; k < n; k++) {
      const i = this._order[k];
      const life = this.life[i];
      if (this.age[i] >= life) continue;
      const t = this.age[i] / life;
      const o = live * 3;
      pos[o] = this.px[i];
      pos[o + 1] = this.py[i];
      pos[o + 2] = this.pz[i];
      sc[live] = this.size0[i] + (this.size1[i] - this.size0[i]) * t;
      rt[live] = this.rot[i];
      // Three colour stops: hot -> warm -> cold reads as a cooling ember.
      if (t < 0.5) {
        const ct = t * 2;
        col[o] = this.cr[i] + (this.cr1[i] - this.cr[i]) * ct;
        col[o + 1] = this.cg[i] + (this.cg1[i] - this.cg[i]) * ct;
        col[o + 2] = this.cb[i] + (this.cb1[i] - this.cb[i]) * ct;
      } else {
        const ct = t * 2 - 1;
        col[o] = this.cr1[i] + (this.cr2[i] - this.cr1[i]) * ct;
        col[o + 1] = this.cg1[i] + (this.cg2[i] - this.cg1[i]) * ct;
        col[o + 2] = this.cb1[i] + (this.cb2[i] - this.cb1[i]) * ct;
      }
      const fin = Math.min(1, t / Math.max(1e-4, this.fadeIn[i]));
      const fout = 1 - Math.pow(t, 1.6);
      al[live] = this.alpha0[i] * fin * Math.max(0, fout);
      st[o] = this.vx[i];
      st[o + 1] = this.vy[i];
      st[o + 2] = this.vz[i];
      live++;
    }
    this.geo.instanceCount = live;
    if (live > 0) {
      this.aPos.addUpdateRange(0, live * 3);
      this.aPos.needsUpdate = true;
      this.aScale.addUpdateRange(0, live);
      this.aScale.needsUpdate = true;
      this.aRot.addUpdateRange(0, live);
      this.aRot.needsUpdate = true;
      this.aColor.addUpdateRange(0, live * 3);
      this.aColor.needsUpdate = true;
      this.aAlpha.addUpdateRange(0, live);
      this.aAlpha.needsUpdate = true;
      this.aStretch.addUpdateRange(0, live * 3);
      this.aStretch.needsUpdate = true;
    }
    // Compact: drop fully dead particles from the tail.
    while (this.count > 0 && this.age[this.count - 1] >= this.life[this.count - 1]) this.count--;
    this.live = live;
    return live;
  }

  clear() {
    this.count = 0;
    this.live = 0;
    this.geo.instanceCount = 0;
  }
}

/* ------------------------------------------------------------ ribbon trail */

const TRAIL_VERT = /* glsl */ `
attribute vec3 aTangent;
attribute float aSide;
attribute float aBirth;
attribute float aWidth;
attribute float aOpacity;
attribute vec3 aColor;
// x: fade multiplier, y: growth multiplier, z: per-segment turbulence seed
attribute vec3 aMod;
uniform float uTime;
uniform float uGrow;
uniform float uFade;
uniform float uTurb;
uniform float uBirth;
uniform vec3 uWind;
varying float vAlpha;
varying vec3 vColor;
varying vec3 vWorld;
varying float vAcross;
varying float vAge;
varying float vSeed;
${LOGDEPTH_PARS_VERT}
void main() {
  float age = max( 0.0, uTime - aBirth );
  // The ribbon is born narrow and widens as the exhaust expands. That also
  // keeps it out of the way of the flame cone, which is otherwise painted over
  // by a full-width contrail starting at the nozzle.
  float w = aWidth * ( 1.0 + age * uGrow * aMod.y ) * mix( 0.3, 1.0, smoothstep( 0.0, uBirth * 2.2, age ) );
  vec3 world = position;
  // Old ribbon drifts downwind and wanders: a smoke trail is not a wire.
  world += uWind * age * 0.4;
  float sd = aMod.z;
  // sd counts segments, so these low frequencies wander over tens of metres of
  // ribbon. High frequencies here would jitter each vertex independently and
  // read as a saw blade rather than as a wandering column of smoke.
  vec3 wob = vec3(
    sin( sd * 0.43 + age * 0.83 ),
    sin( sd * 0.29 + age * 0.61 + 2.1 ),
    cos( sd * 0.37 + age * 0.72 + 4.2 )
  );
  world += wob * ( uTurb * w * min( age, 10.0 ) * 0.14 );
  vec3 toCam = normalize( cameraPosition - world );
  vec3 side = normalize( cross( aTangent, toCam ) );
  world += side * ( aSide * w );
  // A contrail condenses a moment behind the nozzle. Ramping the newest
  // segments in also stops the ribbon from painting over the flame cone, which
  // is the only place the exhaust is close enough to read as fire.
  vAlpha = aOpacity * exp( -age * uFade * aMod.x ) * smoothstep( 0.0, uBirth, age );
  vColor = aColor;
  vWorld = world;
  vAcross = aSide;
  vAge = age;
  vSeed = sd;
  gl_Position = projectionMatrix * viewMatrix * vec4( world, 1.0 );
  ${LOGDEPTH_VERT}
}
`;

const TRAIL_FRAG = /* glsl */ `
precision highp float;
varying float vAlpha;
varying vec3 vColor;
varying vec3 vWorld;
varying float vAcross;
varying float vAge;
varying float vSeed;
uniform float uEmissive;
uniform float uSunLit;
uniform vec3 uAmbient;
${ATM_PARS}
${LOGDEPTH_PARS_FRAG}
void main() {
  ${LOGDEPTH_FRAG}
  float aged = clamp( vAge * 0.055, 0.0, 1.0 );
  // Rounded cross-section: a column of smoke seen side-on rather than a flat
  // card. The profile broadens and softens with age so old ribbon goes wispy.
  float x = clamp( abs( vAcross ) * 2.0, 0.0, 1.0 );
  float prof = pow( max( 0.0, 1.0 - x * x ), mix( 0.95, 2.3, aged ) );
  // Lean the density off-axis per segment; the profile still reaches zero at
  // the geometry edge, so this bends the core without exposing a seam.
  prof *= clamp( 1.0 + sin( vSeed * 0.31 + 2.0 ) * vAcross * 0.5, 0.4, 1.6 );
  float a = vAlpha * prof;
  // Longitudinal break-up, at a wavelength of roughly ten segments.
  float wisp = 0.64 + 0.36 * sin( vSeed * 0.55 ) * sin( vSeed * 0.21 + 1.3 );
  a *= mix( 1.0, wisp, 0.12 + aged * 0.72 );
  if ( a < 0.004 ) discard;
  vec3 col = vColor;
  if ( uSunLit > 0.0 ) {
    vec3 viewDir = normalize( vWorld - cameraPosition );
    float ms = pow( max( dot( viewDir, uAtmSunDir ), 0.0 ), 5.0 );
    col += uAtmSunColor * ms * uSunLit * 0.25;
  }
  col *= mix( uAmbient, vec3( 1.0 ), uEmissive );
  float trans;
  vec3 lit = applyAtm( col, vWorld, trans );
  col = mix( lit, col, uEmissive );
  gl_FragColor = vec4( col, a );
}
`;

class Trail {
  constructor(capacity, { additive = false, emissive = 0, sunLit = 0 } = {}) {
    this.capacity = capacity;
    this.head = 0;
    this.n = 0;
    this.active = false;
    this.lastPos = new THREE.Vector3();
    this.minStep = 3;

    const verts = capacity * 2;
    this.positions = new Float32Array(verts * 3);
    this.tangents = new Float32Array(verts * 3);
    this.sides = new Float32Array(verts);
    this.births = new Float32Array(verts);
    this.widths = new Float32Array(verts);
    this.opacities = new Float32Array(verts);
    this.colors = new Float32Array(verts * 3);
    this.mods = new Float32Array(verts * 3);
    for (let i = 0; i < capacity; i++) {
      this.sides[i * 2] = -0.5;
      this.sides[i * 2 + 1] = 0.5;
    }

    const idx = new Uint16Array((capacity - 1) * 6);
    for (let i = 0; i < capacity - 1; i++) {
      const a = i * 2;
      idx[i * 6] = a;
      idx[i * 6 + 1] = a + 2;
      idx[i * 6 + 2] = a + 1;
      idx[i * 6 + 3] = a + 1;
      idx[i * 6 + 4] = a + 2;
      idx[i * 6 + 5] = a + 3;
    }

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aTangent', new THREE.BufferAttribute(this.tangents, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSide', new THREE.BufferAttribute(this.sides, 1));
    this.geo.setAttribute('aBirth', new THREE.BufferAttribute(this.births, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aWidth', new THREE.BufferAttribute(this.widths, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aOpacity', new THREE.BufferAttribute(this.opacities, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aMod', new THREE.BufferAttribute(this.mods, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setIndex(new THREE.BufferAttribute(idx, 1));
    this.geo.setDrawRange(0, 0);
    this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);

    this.mat = new THREE.ShaderMaterial({
      uniforms: withAtm({
        uTime: { value: 0 },
        uGrow: { value: 0.9 },
        uFade: { value: 0.06 },
        uTurb: { value: 1 },
        uBirth: { value: 0.09 },
        uEmissive: { value: emissive },
        uSunLit: { value: sunLit },
        uWind: { value: new THREE.Vector3() },
      }),
      vertexShader: TRAIL_VERT,
      fragmentShader: TRAIL_FRAG,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      side: THREE.DoubleSide,
      toneMapped: true,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = additive ? 11 : 9;
  }

  reset(opts = {}) {
    this.head = 0;
    this.n = 0;
    this.active = true;
    this.mesh.visible = true;
    this.geo.setDrawRange(0, 0);
    this.mat.uniforms.uGrow.value = opts.grow !== undefined ? opts.grow : 0.9;
    this.mat.uniforms.uFade.value = opts.fade !== undefined ? opts.fade : 0.06;
    this.mat.uniforms.uEmissive.value = opts.emissive !== undefined ? opts.emissive : 0;
    this.mat.uniforms.uTurb.value = opts.turbulence !== undefined ? opts.turbulence : opts.emissive ? 0.35 : 1;
    // The hot ribbon is the flame itself, so it may not be held back.
    this.mat.uniforms.uBirth.value = opts.emissive ? 0.012 : 0.075;
    this.minStep = opts.minStep !== undefined ? opts.minStep : 3;
    this._first = true;
  }

  /** Append a ribbon vertex pair. Returns true if a segment was written. */
  push(pos, tangent, time, width, opacity, color) {
    if (!this.active) return false;
    if (!this._first && pos.distanceToSquared(this.lastPos) < this.minStep * this.minStep) return false;
    this._first = false;
    this.lastPos.copy(pos);
    const i = this.head % this.capacity;
    const v = i * 2;
    // Thin air holds neither width nor opacity: bake the altitude response into
    // the segment so one ribbon can be a fat contrail low down and a thread high up.
    const persist = trailPersistence(pos.y);
    const fadeMul = 1 + (1 - persist) * 1.6;
    const growMul = 0.4 + persist * 1.15;
    // Segment index, wrapped to keep float32 exact. The shaders derive their
    // low-frequency wander from it, so it has to increase monotonically along
    // the ribbon rather than hop about.
    const seed = this.head % 4096;
    for (const k of [v, v + 1]) {
      this.positions[k * 3] = pos.x;
      this.positions[k * 3 + 1] = pos.y;
      this.positions[k * 3 + 2] = pos.z;
      this.tangents[k * 3] = tangent.x;
      this.tangents[k * 3 + 1] = tangent.y;
      this.tangents[k * 3 + 2] = tangent.z;
      this.births[k] = time;
      this.widths[k] = width;
      this.opacities[k] = opacity;
      this.colors[k * 3] = color.r;
      this.colors[k * 3 + 1] = color.g;
      this.colors[k * 3 + 2] = color.b;
      this.mods[k * 3] = fadeMul;
      this.mods[k * 3 + 1] = growMul;
      this.mods[k * 3 + 2] = seed;
    }
    this.head++;
    this.n = Math.min(this.n + 1, this.capacity);
    // Ring buffer: draw only the contiguous run to avoid a wrap-around ribbon.
    const drawn = Math.min(this.head, this.capacity);
    this.geo.setDrawRange(0, Math.max(0, (drawn - 1) * 6));
    for (const a of ['position', 'aTangent', 'aBirth', 'aWidth', 'aOpacity', 'aColor', 'aMod']) {
      this.geo.attributes[a].needsUpdate = true;
    }
    return true;
  }

  setTime(t) {
    this.mat.uniforms.uTime.value = t;
  }

  setWind(w) {
    this.mat.uniforms.uWind.value.copy(w);
  }

  detach() {
    this.active = false;
  }

  hide() {
    this.active = false;
    this.mesh.visible = false;
    this.head = 0;
    this.n = 0;
    this.geo.setDrawRange(0, 0);
  }
}

/* -------------------------------------------------------------- fireball */

const FIREBALL_VERT = /* glsl */ `
uniform float uTime;
uniform float uProgress;
uniform float uSeed;
uniform float uTurb;
uniform float uRoll;
varying vec3 vNormalW;
varying vec3 vWorld;
varying float vNoise;
varying vec3 vQ;
${GLSL_NOISE}
${LOGDEPTH_PARS_VERT}
void main() {
  vec3 p = normalize( position );
  // The noise field is advected downward and outward, which reads as the
  // fireball rolling over on itself as it climbs.
  vec3 q = p * mix( 2.4, 1.5, uProgress ) + vec3( uSeed, uSeed * 0.7, -uSeed );
  q += vec3( 0.0, -uTime * uRoll, 0.0 );
  q -= p * uProgress * 1.1;
  float n = fbm3g( q, 4 );
  // A second, finer band breaks the silhouette into individual billows.
  float n2 = fbm3g( q * 3.3 + 17.0, 3 );
  vNoise = n * 0.72 + n2 * 0.5;
  vQ = q;
  // Keep the displacement well under the radius. Past that the surface folds
  // through itself, back faces get culled and the ball shows sky-coloured holes
  // with hard polygonal edges.
  float amp = uTurb * ( 0.3 + uProgress * 0.36 );
  float bulge = max( 1.0 + n * amp + n2 * amp * 0.45, 0.35 );
  vec3 world = ( modelMatrix * vec4( p * bulge, 1.0 ) ).xyz;
  vWorld = world;
  vNormalW = normalize( mat3( modelMatrix ) * p );
  gl_Position = projectionMatrix * viewMatrix * vec4( world, 1.0 );
  ${LOGDEPTH_VERT}
}
`;

const FIREBALL_FRAG = /* glsl */ `
precision highp float;
uniform float uProgress;
uniform vec3 uHot;
uniform vec3 uMid;
uniform vec3 uCool;
uniform float uOpacity;
uniform float uSmoke;
uniform float uGlow;
varying vec3 vNormalW;
varying vec3 vWorld;
varying float vNoise;
varying vec3 vQ;
${GLSL_NOISE}
${ATM_PARS}
${LOGDEPTH_PARS_FRAG}
void main() {
  ${LOGDEPTH_FRAG}
  vec3 v = normalize( cameraPosition - vWorld );
  float fres = pow( 1.0 - abs( dot( v, vNormalW ) ), 1.6 );
  // The vertex noise is interpolated across each triangle, so any hard
  // threshold on it alone breaks along straight polygon edges. Two octaves
  // evaluated per fragment, in the same advected noise space, put the detail
  // below the tessellation and keep every boundary organic.
  float fine = snoise3( vQ * 3.2 ) * 0.42 + snoise3( vQ * 7.6 + 5.0 ) * 0.2;
  float band = clamp( vNoise * 0.34 + fine * 0.34 + 0.5, 0.0, 1.0 );
  // Heat drains from the outside in; the deepest folds stay bright longest.
  // Multiplying (rather than adding) the noise band means even the first frames
  // are mostly incandescent orange with white only in the hottest creases.
  // Weighting heat heavily by the noise band is what gives the ball internal
  // structure: without it the whole surface cools at one rate and reads as a
  // painted sphere.
  // Concentrating the heat into the upper part of the noise band is what buys
  // contrast: a few incandescent pockets inside a body of deep orange and soot,
  // instead of one broad region that tone-maps to pale yellow.
  float core = mix( band, smoothstep( 0.35, 1.0, band ), 0.8 );
  // Heat has to survive into the middle of the life. Draining it faster leaves
  // the ball sitting at a fraction of the colour ramp for most of the shot, so
  // it never gets near the orange and white stops and reads as flat scarlet.
  float heat = clamp( ( 1.0 - uProgress * 1.55 ) * ( 0.22 + core * 1.3 ) - fres * 0.4, 0.0, 1.0 );
  // Soot -> deep red -> orange -> white. The white stop is deliberately hard to
  // reach: callers pass a near-white "hot" colour, and reaching for it early is
  // what turns the whole ball into a pale yellow balloon.
  // The stops sit low on the heat range on purpose. Heat drains fast, so ramps
  // pitched any higher leave the whole ball parked in the deep-red band for
  // most of its life, which reads as one flat scarlet mass.
  vec3 col = mix( uCool, uMid * vec3( 0.72, 0.26, 0.12 ), smoothstep( 0.02, 0.19, heat ) );
  col = mix( col, uMid, smoothstep( 0.16, 0.46, heat ) );
  col = mix( col, uHot, smoothstep( 0.58, 1.05, heat ) );
  // The ball is opaque gas, not a glow: it has to replace the sky behind it or
  // an HDR daylight background shows straight through and washes it white.
  // As it cools, uSmoke decides whether it settles into soot (low altitude) or
  // simply disperses (thin air up high).
  float coolT = smoothstep( 0.22, 0.85, uProgress );
  float young = 1.0 - smoothstep( 0.0, 0.34, uProgress );
  // Feather the silhouette. Without this the icosphere's outline reads as a
  // hard polygon the moment the ball stops being bright enough to hide it.
  // Only the outer limb is feathered; feathering the whole surface punches
  // holes wherever a billow happens to turn edge-on.
  float rim = smoothstep( 0.0, 0.45, 1.0 - fres );
  // The shell has to be near-opaque where there is gas and absent where there
  // is not. A cooling ball held at one intermediate alpha over a bright sky
  // reads as tinted glass, which is the single worst artefact this shader can
  // produce; the billow mask below is what keeps it lumpy instead.
  // As it cools the mask narrows onto the densest billows and those billows are
  // pushed towards opaque, so the ball tears into separate lumps of smoke
  // instead of thinning uniformly into a translucent bubble.
  float torn = smoothstep( 0.18, 0.9, uProgress );
  float lump = smoothstep( mix( 0.30, 0.56, torn ), mix( 0.62, 0.74, torn ), band );
  float burning = smoothstep( 0.02, 0.24, heat );
  float body = clamp( max( burning, lump * mix( 1.0, uSmoke, coolT ) * ( 1.0 + torn ) ), 0.0, 1.0 );
  float dense = uOpacity * rim * body * ( 1.0 - smoothstep( 0.42, 0.95, uProgress ) );
  // While it is still incandescent the ball is optically thick: force it opaque
  // so a bright HDR sky cannot bleed through and desaturate the fire. In thin
  // air (low uSmoke) there is nothing to be thick with, so only the burning
  // part gets the override and the rest stays a wisp.
  dense = mix( dense, rim * uOpacity, young * 0.85 * max( burning, uSmoke ) );
  float a = clamp( dense, 0.0, 1.0 );
  if ( a < 0.004 ) discard;
  float trans;
  vec3 lit = applyAtm( col, vWorld, trans );
  // Mostly self-coloured soot: pushing a near-black cool palette through the
  // haze in-scatter turns the cold rim into a pale glassy shell.
  vec3 bodyCol = mix( col * 0.55, lit, 0.22 );
  // Entrained smoke is lit from inside by the fire it wraps, which is what
  // keeps the dark lobes brown rather than a neutral grey cut-out.
  bodyCol += uMid * 0.09 * ( 1.0 - uProgress ) * ( 0.35 + 0.65 * band );
  // Emission goes as heat squared so only the deepest folds punch through the
  // tonemapper: a uniformly bright ball just reads as a white blob. The birth
  // frames get several times the output of the cooling phase.
  // Soot is entrained from the first frame: the folds that are not glowing must
  // stay dark, or the ball is a uniformly lit balloon rather than burning gas.
  float sooty = 0.18 + 0.82 * smoothstep( 0.20, 0.75, band );
  // A steep power on heat is what keeps the incandescence in a few creases. A
  // gentler curve lights most of the surface at once and the ball reads as one
  // flat saturated orange mass rather than as burning gas.
  float emit = uGlow * pow( heat, 2.6 ) * ( 4.5 + 6.0 * young ) * ( 1.0 - uProgress * 0.5 ) * sooty;
  vec3 base = mix( bodyCol, col * ( 0.45 + 0.55 * sooty ), heat );
  gl_FragColor = vec4( ( base + col * emit ) * a, a );
}
`;

/**
 * One icosphere shared by every fireball in the pool. The displacement is a
 * vertex effect, so the tessellation has to be fine enough that a strong bulge
 * does not expose the polyhedron; paying for that once is the only way it fits.
 */
let _fbGeo = null;
function fireballGeometry(detail) {
  if (!_fbGeo || _fbGeo.parameters.detail !== detail) _fbGeo = new THREE.IcosahedronGeometry(1, detail);
  return _fbGeo;
}

class Fireball {
  constructor(detail = 4) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: withAtm({
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uSeed: { value: 0 },
        uTurb: { value: 0.42 },
        uRoll: { value: 0.6 },
        uHot: { value: new THREE.Color(1.0, 0.96, 0.82) },
        uMid: { value: new THREE.Color(1.0, 0.52, 0.14) },
        uCool: { value: new THREE.Color(0.12, 0.1, 0.1) },
        uOpacity: { value: 1 },
        uSmoke: { value: 0.8 },
        uGlow: { value: 1 },
      }),
      vertexShader: FIREBALL_VERT,
      fragmentShader: FIREBALL_FRAG,
      depthWrite: false,
      side: THREE.FrontSide,
      toneMapped: true,
      ...PREMULT,
    });
    this.mesh = new THREE.Mesh(fireballGeometry(detail), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 13;
    this.alive = false;
    this.t = 0;
    this.life = 1;
    this.r0 = 1;
    this.r1 = 2;
    this.rise = 0;
    this.grow = 2.6;
    this.flat = 0;
    this.rootY = null;
    this._p = new THREE.Vector3();
  }

  fire(pos, r0, r1, life, palette, opts = {}) {
    this._p.copy(pos);
    this.mesh.position.copy(pos);
    this.mesh.visible = true;
    this.alive = true;
    this.t = 0;
    this.life = life;
    this.r0 = r0;
    this.r1 = r1;
    this.rise = opts.rise !== undefined ? opts.rise : 0;
    this.grow = opts.grow !== undefined ? opts.grow : 2.6;
    // A burst against a surface cannot expand downward, so it spreads sideways
    // instead: an oblate dome whose base stays welded to the deck until
    // buoyancy lifts it clear. Without this a ground hit reads as a sphere
    // parked on the terrain.
    this.flat = opts.flat !== undefined ? opts.flat : 0;
    this.rootY = opts.rootY !== undefined ? opts.rootY : null;
    this.mat.uniforms.uGlow.value = opts.glow !== undefined ? opts.glow : 1;
    this.mat.uniforms.uSeed.value = Math.random() * 40;
    this.mat.uniforms.uTurb.value = opts.turb !== undefined ? opts.turb : 0.42;
    this.mat.uniforms.uRoll.value = opts.roll !== undefined ? opts.roll : 0.6;
    this.mat.uniforms.uSmoke.value = opts.smoke !== undefined ? opts.smoke : 0.8;
    this.mat.uniforms.uOpacity.value = opts.opacity !== undefined ? opts.opacity : 1;
    if (palette) {
      if (palette.hot) this.mat.uniforms.uHot.value.copy(palette.hot);
      if (palette.mid) this.mat.uniforms.uMid.value.copy(palette.mid);
      if (palette.cool) this.mat.uniforms.uCool.value.copy(palette.cool);
    }
  }

  update(dt, time, wind) {
    if (!this.alive) return;
    this.t += dt;
    const p = Math.min(1, this.t / this.life);
    const eased = 1 - Math.pow(1 - p, this.grow);
    const rad = this.r0 + (this.r1 - this.r0) * eased;
    // The dome rounds out as it climbs away from the surface that squashed it.
    const flat = this.flat * (1 - p * 0.55);
    const sy = 1 - flat * 0.46;
    const sxz = 1 + flat * 0.3;
    this.mesh.scale.set(rad * sxz, rad * sy, rad * sxz);
    // Buoyant rise plus wind drift: the ball does not hang where it was born.
    if (this.rise !== 0) this._p.y += this.rise * dt * (0.35 + p);
    if (wind) {
      this._p.x += wind.x * dt * 0.6;
      this._p.z += wind.z * dt * 0.6;
    }
    this.mesh.position.copy(this._p);
    // Keep the underside on the deck while the dome is still growing faster
    // than it is rising; once buoyancy wins, it lifts off on its own.
    if (this.rootY !== null) this.mesh.position.y = Math.max(this._p.y, this.rootY + rad * sy * 0.62);
    this.mat.uniforms.uProgress.value = p;
    this.mat.uniforms.uTime.value = time;
    if (p >= 1) {
      this.alive = false;
      this.mesh.visible = false;
    }
  }
}

/* ------------------------------------------------------------- shockwave */

const SHOCK_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
${LOGDEPTH_PARS_VERT}
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
  ${LOGDEPTH_VERT}
}
`;
const SHOCK_FRAG = /* glsl */ `
precision highp float;
uniform float uProgress;
uniform vec3 uColor;
uniform float uThickness;
uniform float uIntensity;
uniform float uEmit;
varying vec2 vUv;
varying vec3 vWorld;
${ATM_PARS}
${LOGDEPTH_PARS_FRAG}
void main() {
  ${LOGDEPTH_FRAG}
  vec2 q = vUv - 0.5;
  float d = length( q ) * 2.0;
  float ang = atan( q.y, q.x );
  // A blast front is not a perfect circle. Rippling the radius and varying the
  // brightness round the ring is what keeps it from reading as a lens artefact.
  float r0 = 0.86 + sin( ang * 7.0 + uProgress * 3.1 ) * 0.013 + sin( ang * 13.0 - 1.7 ) * 0.007;
  float ring = exp( -pow( ( d - r0 ) / uThickness, 2.0 ) );
  ring *= 0.7 + 0.3 * sin( ang * 5.0 + 2.3 );
  // A faint compressed shell trails the leading edge inward.
  float shell = smoothstep( 0.86, 0.4, d ) * ( 1.0 - smoothstep( 0.86, 0.99, d ) ) * 0.18;
  float a = ( ring + shell ) * uIntensity * pow( 1.0 - uProgress, 1.6 ) * ( 1.0 - smoothstep( 0.94, 1.0, d ) );
  a = clamp( a, 0.0, 1.0 );
  if ( a < 0.004 ) discard;
  float trans;
  vec3 lit = applyAtm( uColor, vWorld, trans );
  vec3 col = mix( lit, uColor, 0.6 );
  float occl = a * ( 1.0 - uEmit );
  gl_FragColor = vec4( col * a, occl );
}
`;

class Shockwave {
  constructor() {
    this.mat = new THREE.ShaderMaterial({
      uniforms: withAtm({
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color(1, 0.92, 0.8) },
        uThickness: { value: 0.09 },
        uIntensity: { value: 1 },
        uEmit: { value: 1 },
      }),
      vertexShader: SHOCK_VERT,
      fragmentShader: SHOCK_FRAG,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: true,
      ...PREMULT,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 14;
    this.alive = false;
    this.t = 0;
    this.life = 1;
    this.r1 = 10;
    this.ground = false;
    this.thick0 = 0.05;
    this.thick1 = 0.14;
    this.ease = 0.55;
  }

  fire(pos, r1, life, color, camera, opts = {}) {
    this.mesh.position.copy(pos);
    this.mesh.visible = true;
    this.alive = true;
    this.t = 0;
    this.life = life;
    this.r1 = r1;
    if (color) this.mat.uniforms.uColor.value.copy(color);
    this.mat.uniforms.uIntensity.value = opts.intensity !== undefined ? opts.intensity : 1;
    this.mat.uniforms.uEmit.value = opts.emit !== undefined ? opts.emit : 1;
    this.thick0 = opts.thickness !== undefined ? opts.thickness : 0.05;
    this.thick1 = opts.thickness1 !== undefined ? opts.thickness1 : this.thick0 + 0.09;
    this.ease = opts.ease !== undefined ? opts.ease : 0.55;
    this.ground = !!opts.ground;
    this.camera = camera;
    if (this.ground) this.mesh.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
  }

  update(dt) {
    if (!this.alive) return;
    this.t += dt;
    const p = Math.min(1, this.t / this.life);
    const eased = Math.pow(p, this.ease);
    this.mesh.scale.setScalar(Math.max(0.01, this.r1 * eased));
    this.mat.uniforms.uProgress.value = p;
    this.mat.uniforms.uThickness.value = this.thick0 + p * (this.thick1 - this.thick0);
    if (!this.ground && this.camera) this.mesh.quaternion.copy(this.camera.quaternion);
    if (p >= 1) {
      this.alive = false;
      this.mesh.visible = false;
    }
  }
}

/* ----------------------------------------------------------------- debris */

class DebrisPool {
  constructor(capacity) {
    this.capacity = capacity;
    // A 20-face solid silhouettes as a chunk from any angle; a tetrahedron
    // tumbles through orientations where it reads as a flat triangle.
    const geo = new THREE.IcosahedronGeometry(0.5, 0);
    // Low metalness on purpose: a half-metal chunk with no local reflection
    // probe renders as a black dot against a bright sky instead of a fragment.
    this.mat = std({ color: 0x6e6660, roughness: 0.85, metalness: 0.08, emissive: 0x2a0d04, emissiveIntensity: 0.7 });
    this.mesh = new THREE.InstancedMesh(geo, this.mat, capacity);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = false;
    this.pos = [];
    this.vel = [];
    this.spin = [];
    this.quat = [];
    this.age = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.scale = new Float32Array(capacity);
    /** Seconds until this fragment sheds its next smoke puff; <=0 means none. */
    this.smokeIn = new Float32Array(capacity);
    this.smokeEvery = new Float32Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.pos.push(new THREE.Vector3());
      this.vel.push(new THREE.Vector3());
      this.spin.push(new THREE.Vector3());
      this.quat.push(new THREE.Quaternion());
      this.life[i] = 0;
      this.age[i] = 1;
    }
    this.count = 0;
    this._m = new THREE.Matrix4();
    this._s = new THREE.Vector3();
    this._dq = new THREE.Quaternion();
  }

  spawn(pos, vel, scale, life, smokeEvery = 0) {
    let i = -1;
    for (let k = 0; k < this.capacity; k++) {
      if (this.age[k] >= this.life[k]) {
        i = k;
        break;
      }
    }
    if (i < 0) return;
    this.pos[i].copy(pos);
    this.vel[i].copy(vel);
    this.spin[i].set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
    this.quat[i].identity();
    this.age[i] = 0;
    this.life[i] = life;
    this.scale[i] = scale;
    this.smokeEvery[i] = smokeEvery;
    this.smokeIn[i] = smokeEvery > 0 ? Math.random() * smokeEvery : 0;
    this.count = Math.max(this.count, i + 1);
  }

  update(dt, groundFn, onLand, onSmoke) {
    let live = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.age[i] >= this.life[i]) continue;
      this.age[i] += dt;
      this.vel[i].y -= WORLD.gravity * dt;
      this.vel[i].multiplyScalar(Math.exp(-0.35 * dt));
      this.pos[i].addScaledVector(this.vel[i], dt);
      const gy = groundFn ? groundFn(this.pos[i].x, this.pos[i].z) : 0;
      if (this.pos[i].y < gy) {
        this.pos[i].y = gy;
        if (onLand && this.vel[i].lengthSq() > 30) onLand(this.pos[i], this.vel[i]);
        this.vel[i].multiplyScalar(-0.22);
        this.vel[i].y = Math.abs(this.vel[i].y) * 0.5;
        this.spin[i].multiplyScalar(0.5);
        this.smokeEvery[i] = 0;
      }
      const every = this.smokeEvery[i];
      if (every > 0 && onSmoke) {
        this.smokeIn[i] -= dt;
        if (this.smokeIn[i] <= 0) {
          this.smokeIn[i] = every;
          onSmoke(this.pos[i], this.vel[i], this.age[i] / this.life[i], this.scale[i]);
        }
      }
      this._dq.setFromAxisAngle(
        this._s.copy(this.spin[i]).normalize(),
        this.spin[i].length() * dt
      );
      this.quat[i].premultiply(this._dq);
      const t = this.age[i] / this.life[i];
      const s = this.scale[i] * (1 - t * 0.25);
      this._s.set(s, s, s);
      this._m.compose(this.pos[i], this.quat[i], this._s);
      this.mesh.setMatrixAt(live++, this._m);
    }
    this.mesh.count = live;
    this.mesh.instanceMatrix.needsUpdate = true;
    return live;
  }

  clear() {
    for (let i = 0; i < this.capacity; i++) {
      this.age[i] = 1;
      this.life[i] = 0;
      this.smokeEvery[i] = 0;
    }
    this.count = 0;
    this.mesh.count = 0;
  }
}

/* ----------------------------------------------------------------- decals */

class DecalPool {
  constructor(capacity, textures) {
    this.items = [];
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    for (let i = 0; i < capacity; i++) {
      const mat = applyAtmosphere(
        new THREE.MeshStandardMaterial({
          map: textures[i % textures.length],
          transparent: true,
          opacity: 1,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -6,
          polygonOffsetUnits: -6,
          roughness: 0.94,
          metalness: 0.02,
        })
      );
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      m.renderOrder = 2;
      this.items.push({ mesh: m, age: 1, life: 0, fade: 40 });
    }
    this.next = 0;
    this._q = new THREE.Quaternion();
    this._up = new THREE.Vector3(0, 1, 0);
  }

  place(pos, size, normal, life = 1e9, rot = Math.random() * Math.PI * 2, opacity = 1) {
    // Every decal is its own draw call, and a launch pad is scorched from the
    // same spot on every shot. Refreshing the mark that is already there keeps
    // a long session from spending the whole pool - and the whole draw-call
    // allowance - on one launcher.
    let it = null;
    const near = size * 0.3;
    for (const c of this.items) {
      if (!c.mesh.visible) continue;
      if (Math.abs(c.mesh.scale.x - size) > size * 0.35) continue;
      const dx = c.mesh.position.x - pos.x;
      const dz = c.mesh.position.z - pos.z;
      if (dx * dx + dz * dz < near * near) {
        it = c;
        break;
      }
    }
    if (it) {
      // Deepen and spread the existing mark slightly instead of moving it, so
      // repeat launches darken one patch rather than snapping a new quad in.
      const grown = Math.min(size * 1.35, it.mesh.scale.x * 1.06);
      it.mesh.scale.set(grown, 1, grown);
      opacity = Math.min(1, Math.max(opacity, (it.peak || 0) + 0.05));
    } else {
      it = this.items[this.next % this.items.length];
      this.next++;
      it.mesh.visible = true;
      it.mesh.position.copy(pos);
      it.mesh.position.y += 0.035;
      it.mesh.scale.set(size, 1, size);
      it.mesh.rotation.set(0, rot, 0);
      if (normal) {
        this._q.setFromUnitVectors(this._up, normal);
        it.mesh.quaternion.premultiply(this._q);
      }
    }
    it.mesh.material.opacity = opacity;
    it.peak = opacity;
    it.age = 0;
    it.life = life;
    return it;
  }

  update(dt) {
    for (const it of this.items) {
      if (!it.mesh.visible) continue;
      it.age += dt;
      if (it.life < 1e8) {
        const t = it.age / it.life;
        it.mesh.material.opacity = Math.max(0, (it.peak || 1) * (1 - t));
        if (t >= 1) it.mesh.visible = false;
      }
    }
  }

  clear() {
    for (const it of this.items) {
      it.mesh.visible = false;
      it.age = 1;
      it.life = 0;
    }
  }
}

/* ------------------------------------------------------------- Effects mgr */

const C = (hex) => new THREE.Color(hex);
const TAU = Math.PI * 2;

// Scratch objects: spawn() copies every field immediately, so a handful of
// shared temporaries is enough to keep the hot paths allocation-free.
const _p = new THREE.Vector3();
const _p2 = new THREE.Vector3();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _side = new THREE.Vector3();
const _up = new THREE.Vector3();
const _ca = new THREE.Color();
const _cb = new THREE.Color();
const _cc = new THREE.Color();
const _cd = new THREE.Color();
const _ce = new THREE.Color();
const _cf = new THREE.Color();

// Shared palettes; none of these allocate at spawn time.
const COL = {
  dustHot: C(0xd8bf98),
  dust: C(0xc2a880),
  dustDark: C(0x8f7a5f),
  grit: C(0x6a5a45),
  gritDark: C(0x3c3225),
  smokeLight: C(0xcfcac2),
  smokeMid: C(0x8e8a84),
  smokeDark: C(0x4a4744),
  soot: C(0x2b2826),
  sootDeep: C(0x1a1817),
  // A ground burst entrains dirt, so its cold lobes are brown rather than the
  // near-black soot of a clean airframe kill. It still has to be dark: lifting
  // the cool stop is what collapses the fireball into one flat orange mass,
  // because the unlit lobes stop reading as unlit.
  sootEarth: C(0x1b1209),
  flameWhite: C(0xfff6e2),
  flameHot: C(0xffd79a),
  flameMid: C(0xff7a24),
  flameDeep: C(0xd23a06),
  // Exhaust cools through this rather than through flameDeep. An additive
  // sprite whose green sits far below its red adds red and blue to a blue sky
  // and leaves green behind, which lands squarely on magenta in the low-alpha
  // halo around a boosting motor. Carrying more green keeps it orange.
  flameExhaustCool: C(0xc7591c),
  // Embers are spawned over-range: additive sprites at LDR intensity against a
  // bright sky come out as pale pink smears instead of glowing points.
  emberWhite: C(0xfffbe8).multiplyScalar(3.2),
  emberOrange: C(0xff8a24).multiplyScalar(2.4),
  emberDark: C(0x501202),
  ringWarm: C(0xfff0d0),
  ringPale: C(0xd8cbb4),
  coldWhite: C(0xf2f6ff),
  coldBlue: C(0xa9c4e8),
  mote: C(0xfff2d8),
};

const rnd = Math.random;
const rr = (a, b) => a + Math.random() * (b - a);

export class Effects {
  constructor(scene, quality, weather) {
    this.scene = scene;
    this.quality = quality;
    this.weather = weather;
    this.time = 0;
    this.group = new THREE.Group();
    this.group.name = 'effects';
    scene.add(this.group);

    const budget = quality.particleBudget;
    // Spawn counts scale with the preset so LOW does not simply drop particles
    // on the floor of an over-subscribed pool.
    this.q = THREE.MathUtils.clamp(budget / 2800, 0.4, 1.5);

    this.smoke = new BillboardLayer(Math.round(budget * 0.42), smokeSprite(256, 3), {
      blending: THREE.NormalBlending,
      sorted: true,
      sunLit: 0.9,
    });
    this.dust = new BillboardLayer(Math.round(budget * 0.26), smokeSprite(256, 11), {
      blending: THREE.NormalBlending,
      sorted: true,
      sunLit: 0.85,
    });
    // A turbulent sprite rather than a radial gradient. Additive gradients
    // saturate to a cluster of identical white discs the moment several of them
    // overlap, which is the giveaway that a fire is made of billboards.
    this.fire = new BillboardLayer(Math.round(budget * 0.18), smokeSprite(128, 7), {
      blending: THREE.AdditiveBlending,
      emissive: 1,
    });
    this.sparks = new BillboardLayer(Math.round(budget * 0.13), sparkSprite(64), {
      blending: THREE.AdditiveBlending,
      stretch: 0.009,
      emissive: 1,
    });
    // Ejected grit: opaque, gravity-bound and unlit, so it silhouettes against
    // the dust instead of glowing like the sparks do.
    this.grit = new BillboardLayer(Math.round(budget * 0.08), softSprite(64, { power: 0.6, core: 1.6 }), {
      blending: THREE.NormalBlending,
      sunLit: 0.6,
      renderOrder: 10,
    });
    this.glow = new BillboardLayer(112, flareSprite(256), { blending: THREE.AdditiveBlending, emissive: 1 });
    this.motesEnabled = budget >= 1500;
    this.motes = new BillboardLayer(this.motesEnabled ? 140 : 1, softSprite(64, { power: 1.4 }), {
      blending: THREE.AdditiveBlending,
      emissive: 1,
      renderOrder: 12,
    });
    this.layers = [this.smoke, this.dust, this.grit, this.fire, this.sparks, this.glow, this.motes];
    for (const l of this.layers) this.group.add(l.mesh);

    this.trails = [];
    for (let i = 0; i < 18; i++) {
      const t = new Trail(quality.trailSegments, { sunLit: 0.8 });
      this.group.add(t.mesh);
      this.trails.push(t);
    }
    this.hotTrails = [];
    for (let i = 0; i < 10; i++) {
      const t = new Trail(Math.max(24, Math.round(quality.trailSegments * 0.35)), { additive: true, emissive: 1 });
      this.group.add(t.mesh);
      this.hotTrails.push(t);
    }

    this.fireballs = [];
    // The displaced sphere needs enough tessellation that a strong bulge reads
    // as billows rather than as flat plates pulled off a polyhedron.
    const fbDetail = budget >= 2400 ? 14 : budget >= 1500 ? 9 : 5;
    for (let i = 0; i < 12; i++) {
      const f = new Fireball(fbDetail);
      this.group.add(f.mesh);
      this.fireballs.push(f);
    }
    this.shocks = [];
    for (let i = 0; i < 14; i++) {
      const s = new Shockwave();
      this.group.add(s.mesh);
      this.shocks.push(s);
    }
    this.debris = new DebrisPool(Math.min(300, Math.round(budget * 0.1)));
    this.group.add(this.debris.mesh);

    this.scorch = new DecalPool(Math.round(quality.decals * 0.6), [scorchDecalTexture(256, 9), scorchDecalTexture(256, 23)]);
    this.craters = new DecalPool(Math.round(quality.decals * 0.4), [craterDecalTexture(256, 4), craterDecalTexture(256, 17)]);
    for (const d of [...this.scorch.items, ...this.craters.items]) this.group.add(d.mesh);

    // Flash lights, shared budget.
    this.flashLights = [];
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xffc07a, 0, 900, 1.6);
      l.visible = false;
      this.group.add(l);
      this.flashLights.push({ light: l, t: 0, life: 0, peak: 0 });
    }

    // Lingering emitters: a launch pad or a crater keeps producing smoke for
    // seconds after the event, which is what makes a column build rather than pop.
    this.sources = [];
    for (let i = 0; i < 12; i++) {
      this.sources.push({ active: false, kind: 0, pos: new THREE.Vector3(), gy: 0, t: 0, life: 0, scale: 1, acc: 0 });
    }

    this.wind = new THREE.Vector3(1.4, 0, 0.5);
    this.terrainFn = null;
    this.shakeTarget = null;
    this.particleCount = 0;
    this._moteTimer = 0;
  }

  setWind(v) {
    this.wind.copy(v);
  }

  /** Ambient level applied to non-emissive particle albedo (per time of day). */
  setAmbient(color) {
    particleAmbient.uAmbient.value.set(color);
  }

  /* ------------------------------------------------------------- trails */

  acquireTrail(opts) {
    for (const t of this.trails) {
      if (!t.active && !t.mesh.visible) {
        t.reset(opts);
        return t;
      }
    }
    // Steal the least-recently used one.
    const t = this.trails[0];
    t.hide();
    t.reset(opts);
    return t;
  }

  acquireHotTrail(opts) {
    for (const t of this.hotTrails) {
      if (!t.active && !t.mesh.visible) {
        t.reset(opts);
        return t;
      }
    }
    const t = this.hotTrails[0];
    t.hide();
    t.reset(opts);
    return t;
  }

  /* ---------------------------------------------------------- primitives */

  /**
   * Daylight-relative brightness. The tonemapper opens right up at night, so a
   * flash sized for noon turns the whole apron into a white card after dark.
   */
  _expScale() {
    const elev = this.weather && this.weather.tod ? this.weather.tod.sunElev : 0.6;
    return 0.42 + 0.58 * THREE.MathUtils.clamp(elev / 0.22, 0, 1);
  }

  flash(pos, peak, life = 0.32, color = 0xffc07a) {
    let slot = this.flashLights.find((f) => f.t >= f.life);
    if (!slot) slot = this.flashLights.reduce((a, b) => (a.t / a.life > b.t / b.life ? a : b));
    slot.light.position.copy(pos);
    slot.light.color.setHex(color);
    slot.light.visible = true;
    slot.t = 0;
    slot.life = life;
    slot.peak = peak * this._expScale();
  }

  glowPuff(pos, size, life, color, alpha = 1) {
    this.glow.spawn({ pos, size0: size, size1: size * 1.5, life, color0: C(color), alpha, drag: 3, fadeIn: 0.02 });
  }

  /** Grab a free shockwave, or the one closest to finishing. */
  _shock() {
    let best = null;
    for (const s of this.shocks) {
      if (!s.alive) return s;
      if (!best || s.t / s.life > best.t / best.life) best = s;
    }
    return best;
  }

  _fireball() {
    let best = null;
    for (const f of this.fireballs) {
      if (!f.alive) return f;
      if (!best || f.t / f.life > best.t / best.life) best = f;
    }
    return best;
  }

  /** Register a lingering smoke source. kind 0 = launch pad, 1 = crater. */
  _source(pos, gy, life, scale, kind) {
    let slot = this.sources.find((s) => !s.active);
    if (!slot) slot = this.sources[0];
    slot.active = true;
    slot.kind = kind;
    slot.pos.copy(pos);
    slot.gy = gy;
    slot.t = 0;
    slot.life = life;
    slot.scale = scale;
    slot.acc = 0;
    return slot;
  }

  /**
   * Rocket exhaust: a short incandescent core wrapped in a turbulent smoke
   * sheath. Both thin out with altitude via `trailPersistence`.
   */
  exhaust(pos, vel, opts) {
    const {
      scale = 1,
      hot = 0xffd9a0,
      smokeColor = 0xbdbdbd,
      rate = 1,
      dt = 0.016,
      boosting = true,
      backDir = null,
    } = opts;
    const dens = trailPersistence(pos.y);
    const n = Math.max(1, Math.round(rate * dt * 60 * this.q));
    _ca.set(hot);
    _cb.set(smokeColor);
    // The flame layer blends additively, so against a bright HDR sky an LDR
    // orange adds almost nothing and the plume disappears. Spawning the flame
    // with over-range colour is what makes it out-punch the background - and it
    // is the honest answer too, since a burning motor really is far brighter
    // than the sky behind it.
    // Saturation matters more than raw intensity: ACES pulls anything bright
    // and broad-spectrum towards white, so the flame stops reading as fire the
    // moment its channels are close together. The orange stops carry the plume
    // and the near-white throat is kept small and comparatively dim.
    _cd.copy(COL.flameMid).multiplyScalar(3.0);
    _ce.copy(COL.flameExhaustCool).multiplyScalar(1.85);
    _cc.copy(COL.flameHot).multiplyScalar(2.7);
    _ca.multiplyScalar(2.3);
    // Kept only just over range: this one is normal-blended, so pushing it high
    // would tone-map straight to white instead of painting an orange cone.
    _cf.copy(COL.flameMid).multiplyScalar(1.4);
    for (let i = 0; i < n; i++) {
      const jitter = 0.6 * scale;
      _p.copy(pos);
      _p.x += (rnd() - 0.5) * jitter;
      _p.y += (rnd() - 0.5) * jitter;
      _p.z += (rnd() - 0.5) * jitter;
      if (backDir) _v.copy(backDir).multiplyScalar(28 * scale * (0.4 + rnd()));
      else _v.set(0, 0, 0);
      _v.x += (rnd() - 0.5) * 6 * scale;
      _v.y += (rnd() - 0.5) * 6 * scale;
      _v.z += (rnd() - 0.5) * 6 * scale;
      if (boosting) {
        // Flame is attached to the nozzle, so it has to carry most of the
        // airframe's velocity. Without this the missile outruns its own plume in
        // a single frame and the boost phase reads as a bare ribbon. The core
        // holds station best; the sheath lags, which tapers the cone.
        _v2.copy(_v).addScaledVector(vel, 0.88);
        // Core: small, very bright, dies almost immediately.
        this.fire.spawn({
          pos: _p,
          vel: _v2,
          size0: 1.5 * scale,
          size1: 3.6 * scale,
          life: 0.1 + rnd() * 0.07,
          color0: _cc,
          color1: _ca,
          color2: _cd,
          alpha: 0.6,
          drag: 5.5,
          fadeIn: 0.02,
          wind: 0.05,
        });
        // Sheath: the flame that actually reads at distance. It starts orange
        // rather than white, because a dozen overlapping white sprites just
        // saturate to a featureless streak once bloom gets hold of them, and it
        // ends on soot so the cone hands off to the smoke column.
        _v2.copy(_v).addScaledVector(vel, 0.55);
        this.fire.spawn({
          pos: _p,
          vel: _v2,
          size0: 3.2 * scale,
          size1: 15 * scale,
          life: 0.26 + rnd() * 0.2,
          color0: _cd,
          color1: _ce,
          color2: COL.smokeDark,
          alpha: 0.5,
          drag: 3.2,
          fadeIn: 0.05,
          wind: 0.1,
          turb: 9 * scale,
        });
        // Opaque flame sheath. Additive fire can only add to a bright sky, so
        // by itself it saturates to a white streak; a normal-blended warm puff
        // is what actually paints an orange cone at close range and then hands
        // over to the grey column as it cools.
        _v2.copy(_v).addScaledVector(vel, 0.62);
        this.smoke.spawn({
          pos: _p,
          vel: _v2,
          size0: 2.2 * scale,
          size1: 9 * scale,
          life: 0.3 + rnd() * 0.22,
          rot: rnd() * TAU,
          rotV: (rnd() - 0.5) * 2.4,
          color0: _cf,
          color1: COL.flameExhaustCool,
          color2: COL.smokeDark,
          alpha: 0.5,
          drag: 3.4,
          fadeIn: 0.06,
          wind: 0.1,
          turb: 7 * scale,
        });
      }
      // Smoke column, offset off the axis so the sheath churns outward and set
      // back from the throat: a pale normal-blended puff sitting on the nozzle
      // covers the flame and is what makes a close plume look like a grey rag.
      _p2.copy(_p);
      if (backDir) _p2.addScaledVector(backDir, 2.6 * scale);
      const off = 1.1 * scale;
      _p2.x += (rnd() - 0.5) * off;
      _p2.y += (rnd() - 0.5) * off;
      _p2.z += (rnd() - 0.5) * off;
      // Just enough inheritance for the sheath to wrap the core for a moment
      // before drag parks it in the air as trail smoke.
      _v2.copy(_v).multiplyScalar(0.34).addScaledVector(vel, 0.24);
      this.smoke.spawn({
        pos: _p2,
        vel: _v2,
        size0: 3.4 * scale,
        size1: (24 + rnd() * 20) * scale * (0.45 + dens),
        life: (1.5 + rnd() * 2.4) * (0.45 + dens * 1.5),
        rot: rnd() * TAU,
        rotV: (rnd() - 0.5) * 0.9,
        color0: COL.smokeMid,
        color1: _cb,
        color2: COL.smokeLight,
        alpha: 0.4 * (0.3 + dens * 0.85),
        drag: 0.85,
        buoyancy: 1.1,
        fadeIn: 0.2,
        wind: 0.85,
        turb: 1.6 + dens * 2.2,
      });
    }
  }

  /**
   * Ground-interacting launch signature: deck surge, ignition flash, churning
   * column, ejected grit and a pressure ring. Everything keys off `plumeScale`
   * so a Sentinel round dwarfs a Patriot round.
   */
  launchBlast(pos, dir, batteryCfg, camera) {
    const s = batteryCfg.plumeScale;
    const q = this.q;
    const ex = 0.45 + 0.55 * this._expScale();
    // Sprite sizes grow sub-linearly with plume scale: a Sentinel should dwarf a
    // Patriot through a wider, denser cloud rather than 2.2x-wide single puffs.
    const sz = 0.55 + s * 0.45;
    const gy = this.groundAt(pos.x, pos.z);
    _p2.set(pos.x, gy, pos.z);
    const deckX = pos.x;
    const deckZ = pos.z;

    // ---- ignition flash core -----------------------------------------
    _p.set(deckX, gy + 2.2 * s, deckZ);
    this.glow.spawn({
      pos: _p,
      size0: 7 * s,
      size1: 26 * s,
      life: 0.17,
      color0: COL.flameWhite,
      color1: COL.flameHot,
      color2: COL.flameMid,
      alpha: 0.8 * ex,
      drag: 4,
      fadeIn: 0.01,
      wind: 0,
    });

    // ---- deck surge: dense dust ring that hugs the ground and rolls out --
    // Sprites start large: a launch cloud is metres across the instant the
    // motor lights, and small puffs that grow slowly just read as haze.
    const nRing = Math.round(58 * s * q);
    for (let i = 0; i < nRing; i++) {
      const a = (i / nRing) * TAU + rr(-0.11, 0.11);
      const r0 = (2.5 + rnd() * 4) * s;
      const sp = (20 + rnd() * 24) * (0.6 + s * 0.55);
      _p.set(deckX + Math.cos(a) * r0, gy + 0.4 + rnd() * 4 * s, deckZ + Math.sin(a) * r0);
      _v.set(Math.cos(a) * sp, 3 + rnd() * 10, Math.sin(a) * sp);
      // Mottle the mid stop per puff. Overlapping sprites that share one colour
      // integrate to a flat wash however many of them there are; a spread of
      // values across the population is what gives the cloud internal form.
      const shade = rnd();
      _cd.copy(COL.dust).lerp(COL.dustDark, shade * 0.85);
      this.dust.spawn({
        pos: _p,
        vel: _v,
        size0: (6 + rnd() * 11) * sz,
        size1: (24 + rnd() * 34) * sz,
        life: 5 + rnd() * 4,
        rot: rnd() * TAU,
        rotV: (rnd() - 0.5) * 1.1,
        color0: COL.dustHot,
        color1: _cd,
        color2: COL.dustDark,
        alpha: 0.7 + rnd() * 0.28,
        // Drag sets the radius the ring stalls at (v0/drag), so it stays a
        // readable ring near the pad instead of sweeping past the viewer.
        drag: 1.15,
        buoyancy: 1.6,
        fadeIn: 0.04,
        wind: 1,
        turb: 2.4,
        hugY: gy + 0.4,
      });
    }
    // A second, faster and lower skirt gives the surge a defined leading edge.
    const nSkirt = Math.round(34 * s * q);
    for (let i = 0; i < nSkirt; i++) {
      const a = (i / nSkirt) * TAU + rr(-0.14, 0.14);
      const sp = (36 + rnd() * 32) * (0.65 + s * 0.5);
      _p.set(deckX + Math.cos(a) * 3 * s, gy + 0.3, deckZ + Math.sin(a) * 3 * s);
      _v.set(Math.cos(a) * sp, 0.4 + rnd() * 1.6, Math.sin(a) * sp);
      this.dust.spawn({
        pos: _p,
        vel: _v,
        size0: (5 + rnd() * 4) * sz,
        size1: (20 + rnd() * 18) * sz,
        life: 2.6 + rnd() * 2,
        rot: rnd() * TAU,
        rotV: (rnd() - 0.5) * 1.1,
        color0: COL.dustHot,
        color1: COL.dust,
        color2: COL.dustDark,
        alpha: 0.66,
        drag: 1.8,
        buoyancy: 0.15,
        fadeIn: 0.03,
        wind: 0.9,
        turb: 1.6,
        hugY: gy + 0.3,
      });
    }

    // ---- prompt column: the stack is already building at t=0, the lingering
    // source below only keeps feeding it -------------------------------------
    const nCol = Math.round(20 * s * q);
    for (let i = 0; i < nCol; i++) {
      const a = rnd() * TAU;
      const r0 = rnd() * 4 * s;
      _p.set(deckX + Math.cos(a) * r0, gy + rr(1, 7) * s, deckZ + Math.sin(a) * r0);
      _v.set(Math.cos(a) * rr(2, 8), 8 + rnd() * 20, Math.sin(a) * rr(2, 8));
      this.smoke.spawn({
        pos: _p,
        vel: _v,
        size0: (6 + rnd() * 5) * sz,
        size1: (26 + rnd() * 22) * sz,
        life: 5 + rnd() * 5,
        rot: rnd() * TAU,
        rotV: (rnd() - 0.5) * 0.4,
        color0: COL.smokeLight,
        color1: COL.smokeMid,
        color2: COL.smokeDark,
        alpha: 0.62,
        drag: 0.6,
        buoyancy: 2,
        fadeIn: 0.04,
        wind: 1,
        turb: 2.6,
      });
    }

    // ---- fire wash off the deflector ----------------------------------
    // Sizes and lifetimes vary widely on purpose. Uniform sprites at this
    // density stack into a cluster of identical soft discs, which is the one
    // thing that unmistakably reads as billboards rather than as fire.
    const nFire = Math.round(34 * s * q);
    for (let i = 0; i < nFire; i++) {
      const a = rnd() * TAU;
      const big = rnd();
      const sp = (14 + rnd() * 38 * s) * (1.3 - big * 0.6);
      _p.set(deckX + Math.cos(a) * rnd() * 2 * s, gy + 0.5 + rnd() * 2.6 * s, deckZ + Math.sin(a) * rnd() * 2 * s);
      _v.set(Math.cos(a) * sp, rnd() * 9 * s, Math.sin(a) * sp);
      this.fire.spawn({
        pos: _p,
        vel: _v,
        size0: (1.1 + big * 2.4) * s,
        size1: (4 + big * 11) * s,
        life: 0.18 + rnd() * 0.34,
        rot: rnd() * TAU,
        rotV: (rnd() - 0.5) * 3.5,
        color0: COL.flameHot,
        color1: COL.flameMid,
        color2: COL.flameDeep,
        alpha: (0.34 + big * 0.28) * ex,
        drag: 2.8,
        fadeIn: 0.02,
        wind: 0.25,
        turb: 9,
      });
    }

    // ---- ejected grit and sparks --------------------------------------
    const nGrit = Math.round(26 * s * q);
    for (let i = 0; i < nGrit; i++) {
      const a = rnd() * TAU;
      const sp = 12 + rnd() * 34 * s;
      _p.set(deckX + Math.cos(a) * 2 * s, gy + 0.4, deckZ + Math.sin(a) * 2 * s);
      _v.set(Math.cos(a) * sp, 4 + rnd() * 12 * s, Math.sin(a) * sp);
      this.grit.spawn({
        pos: _p,
        vel: _v,
        size0: 0.1 + rnd() * 0.17,
        size1: 0.08 + rnd() * 0.12,
        life: 1.2 + rnd() * 1.4,
        color0: COL.grit,
        color1: COL.grit,
        color2: COL.gritDark,
        alpha: 0.95,
        drag: 0.16,
        gravity: 9.81,
        fadeIn: 0.01,
        wind: 0.15,
      });
    }
    const nSpark = Math.round(48 * s * q);
    for (let i = 0; i < nSpark; i++) {
      const a = rnd() * TAU;
      const sp = 24 + rnd() * 54;
      _p.set(deckX, gy + 0.6, deckZ);
      _v.set(Math.cos(a) * sp, rnd() * 22, Math.sin(a) * sp);
      this.sparks.spawn({
        pos: _p,
        vel: _v,
        // Embers are over-range and therefore bloom: anything much wider than a
        // couple of pixels at pad range renders as a soft white disc.
        size0: 0.22,
        size1: 0.07,
        life: 0.5 + rnd() * 0.8,
        color0: COL.emberWhite,
        color1: COL.emberOrange,
        color2: COL.emberDark,
        alpha: 1,
        drag: 0.5,
        gravity: 9,
        fadeIn: 0.01,
        wind: 0.2,
      });
    }

    // ---- pressure ring on the deck, plus a faint air shock -------------
    _p.set(deckX, gy + 0.5, deckZ);
    this._shock().fire(_p, 34 * s, 0.62, COL.ringPale, camera, {
      ground: true,
      emit: 0.35,
      intensity: 0.85 * ex,
      thickness: 0.035,
      thickness1: 0.12,
      ease: 0.5,
    });
    _p.set(deckX, gy + 3 * s, deckZ);
    this._shock().fire(_p, 20 * s, 0.34, COL.ringWarm, camera, {
      emit: 1,
      intensity: 0.5 * ex,
      thickness: 0.05,
      ease: 0.45,
    });

    // ---- lingering column ---------------------------------------------
    _p.set(deckX, gy, deckZ);
    this._source(_p, gy, 2.4 + s * 1.1, s, 0);

    this.scorch.place(_p2, 9 * s, null, 1e9);
    _p.set(pos.x, pos.y + 3, pos.z);
    this.flash(_p, 2400 * s, 0.5, 0xffb060);
    if (this.weather) this.weather.addFlash(0.24 * s, COL.flameHot);
  }

  /**
   * Air intercept: flash core, rolling fireball that cools to smoke, shock ring,
   * a smoking debris cone and a lingering smoke ball. Thin air at altitude cuts
   * the smoke back and shifts the whole event colder.
   */
  intercept(pos, size, camera, palette) {
    // Readability scale. A 30 m fireball 22 km away subtends about a tenth of a
    // degree, so a high-altitude kill would be a single dim pixel. Distant
    // events are drawn larger than life — the same cheat already used for
    // missile bodies and their glow sprites — so the player can actually see
    // the intercept they just paid a round for.
    const viewDist = camera ? pos.distanceTo(camera.position) : 0;
    const read = THREE.MathUtils.clamp(viewDist / 1300, 1, 22);
    // Spatial extents scale with distance; counts and lifetimes stay keyed to
    // the true yield so a far-off kill does not cost more or last longer.
    const baseSize = size;
    size *= read;
    const dens = trailPersistence(pos.y);
    const thin = 1 - dens;
    const q = this.q;
    const hot = palette && palette.hot ? palette.hot : COL.flameWhite;
    const mid = palette && palette.mid ? palette.mid : COL.flameMid;
    const cool = palette && palette.cool ? palette.cool : COL.sootDeep;
    // High up there is nothing to burn and nothing to glow off: the event goes
    // white-blue and disperses instead of rolling into a sooty ball.
    _ca.copy(hot).lerp(COL.coldWhite, thin * 0.6);
    _cb.copy(mid).lerp(COL.coldBlue, thin * 0.7);
    _cc.copy(cool).lerp(COL.coldBlue, thin * 0.35);

    // ---- flash core ----------------------------------------------------
    // Held to a minimum angular size. A real detonation 25 km away reads as a
    // brilliant point of light with a halo, which is exactly what this sprite
    // is, so sizing it in milliradians rather than metres is both cheaper and
    // more convincing than inflating the fireball to a kilometre across.
    const mrad = viewDist * 0.001;
    this.glow.spawn({
      pos,
      size0: Math.max(size * 1.2, mrad * 70),
      size1: Math.max(size * 4.2, mrad * 190),
      life: 0.14 + (read > 3 ? 0.3 : 0),
      color0: COL.flameWhite,
      color1: _ca,
      color2: _cb,
      alpha: 1.0,
      drag: 5,
      fadeIn: 0.005,
      wind: 0,
    });
    if (read > 2.5) {
      // The flare sprite's alpha collapses well inside its quad, so at long
      // range it reads as a pinprick however large the quad is. These two use
      // the broad soft-edged puff instead, which keeps real brightness out to
      // nearly half its radius and is what actually makes a 20 km kill legible.
      this.fire.spawn({
        pos,
        size0: mrad * 85,
        size1: mrad * 230,
        life: 0.62,
        color0: COL.flameWhite,
        color1: _ca,
        color2: _cb,
        alpha: 1,
        drag: 5,
        fadeIn: 0.006,
        wind: 0,
      });
      this.fire.spawn({
        pos,
        size0: mrad * 130,
        size1: mrad * 330,
        life: 1.5,
        color0: _cb,
        color1: _cc,
        color2: _cc,
        alpha: 0.62,
        drag: 4,
        fadeIn: 0.03,
        wind: 0,
      });
      // Afterglow so the eye has time to find the event at long range.
      this.glow.spawn({
        pos,
        size0: mrad * 95,
        size1: mrad * 270,
        life: 1.5,
        color0: _ca,
        color1: _cb,
        color2: _cc,
        alpha: 0.72,
        drag: 4,
        fadeIn: 0.02,
        wind: 0,
      });
    }

    // ---- fireball ------------------------------------------------------
    const fb = this._fireball();
    fb.fire(pos, size * 0.22, size * (1.5 + dens * 0.8), (0.55 + baseSize * 0.008) * (0.55 + dens * 0.7), { hot: _ca, mid: _cb, cool: _cc }, {
      rise: 4 + dens * 16,
      roll: 0.8 + dens * 0.6,
      smoke: 0.08 + dens * 0.5,
      turb: 0.44 + dens * 0.34,
      grow: 1.9,
      glow: 0.8 + thin * 0.35,
      // Thin air has little to keep optically thick, so the ball is a flash
      // and a wisp up high rather than a persistent shell.
      opacity: 0.45 + dens * 0.55,
    });
    // A second, smaller ball a beat later reads as the burn rolling over.
    const fb2 = this._fireball();
    if (fb2 !== fb) {
      _p.copy(pos);
      _p.x += rr(-1, 1) * size * 0.5;
      _p.y += rr(-0.3, 0.9) * size * 0.5;
      _p.z += rr(-1, 1) * size * 0.5;
      fb2.fire(_p, size * 0.16, size * (0.9 + dens * 0.6), (0.75 + baseSize * 0.01) * (0.55 + dens * 0.8), { hot: _ca, mid: _cb, cool: _cc }, {
        rise: 6 + dens * 18,
        roll: 0.5,
        smoke: 0.1 + dens * 0.45,
        turb: 0.6,
        grow: 1.7,
        glow: 0.55,
        opacity: 0.7 * (0.3 + dens * 0.7),
      });
    }

    // ---- shock ring ----------------------------------------------------
    this._shock().fire(pos, Math.max(size * (2.8 + dens * 2.2), mrad * 72), 0.32 + dens * 0.18, _ca, camera, {
      emit: 1,
      intensity: 0.3,
      thickness: 0.022,
      thickness1: 0.07,
      ease: 0.42,
    });

    // ---- burning fragments of the airframe -----------------------------
    const nFire = Math.round((16 + 14 * dens) * q);
    for (let i = 0; i < nFire; i++) {
      _v.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
      _p.copy(pos).addScaledVector(_v, size * 0.4);
      _v.multiplyScalar(26 + rnd() * 95);
      this.fire.spawn({
        pos: _p,
        vel: _v,
        size0: size * 0.22,
        size1: size * (0.9 + dens * 0.5),
        life: (0.3 + rnd() * 0.4) * (0.6 + dens * 0.6),
        color0: COL.flameHot,
        color1: _cb,
        color2: COL.flameDeep,
        alpha: 0.55,
        drag: 1.7,
        fadeIn: 0.015,
        wind: 0.1,
        turb: 8,
      });
    }

    // ---- embers: white, then orange, then dark ------------------------
    const nSpark = Math.round((30 + 22 * dens) * q);
    for (let i = 0; i < nSpark; i++) {
      _v.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(80 + rnd() * 260);
      this.sparks.spawn({
        pos,
        vel: _v,
        size0: 0.5,
        size1: 0.13,
        life: 0.7 + rnd() * 1.4,
        color0: COL.emberWhite,
        color1: COL.emberOrange,
        color2: COL.emberDark,
        alpha: 1,
        drag: 0.26,
        gravity: 9.8 * dens,
        fadeIn: 0.008,
        wind: 0.1,
      });
    }

    // ---- debris cone ----------------------------------------------------
    // Fragments leave along a preferred axis, so the wreck reads as a cone
    // rather than a uniform sphere.
    _axis.set(rr(-1, 1), rr(-0.6, 0.4), rr(-1, 1)).normalize();
    _side.set(-_axis.z, 0, _axis.x);
    if (_side.lengthSq() < 1e-4) _side.set(1, 0, 0);
    _side.normalize();
    _up.crossVectors(_axis, _side);
    const nDebris = Math.round((12 + baseSize * 0.42) * Math.min(1, q + 0.25));
    for (let i = 0; i < nDebris; i++) {
      const spread = 0.42 + rnd() * 0.5;
      const ang = rnd() * TAU;
      _v.copy(_axis)
        .addScaledVector(_side, Math.cos(ang) * spread)
        .addScaledVector(_up, Math.sin(ang) * spread)
        .normalize()
        .multiplyScalar(40 + rnd() * 150);
      _p.copy(pos);
      const scl = 0.3 + rnd() * 1.3;
      // Only the bigger pieces are worth a smoke ribbon.
      this.debris.spawn(_p, _v, scl, 11 + rnd() * 10, scl > 0.85 && dens > 0.1 ? 0.055 + rnd() * 0.05 : 0);
    }

    // ---- prompt smoke plus a lingering, wind-drifting ball --------------
    // The ball is built from two populations: a slow, dense body that holds
    // together as a recognisable mass, and faster outer wisps that shred off it.
    // Up high there is no soot to make and no warm bounce light to catch, so
    // what little cloud there is goes pale and blue instead of brown.
    _cd.copy(COL.smokeLight).lerp(COL.coldWhite, thin * 0.8);
    _ce.copy(COL.smokeMid).lerp(COL.coldWhite, thin * 0.65);
    _cf.copy(COL.smokeDark).lerp(COL.coldBlue, thin * 0.6);
    const nBall = Math.round((9 + 11 * dens) * q);
    for (let i = 0; i < nBall; i++) {
      _v.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
      _p.copy(pos).addScaledVector(_v, size * (0.15 + rnd() * 0.3));
      _v.multiplyScalar(5 + rnd() * 16);
      this.smoke.spawn({
        pos: _p,
        vel: _v,
        size0: size * 1.15,
        size1: size * (1.9 + rnd() * 1.3) * (0.55 + dens * 0.7),
        life: (4.2 + rnd() * 4.5) * (0.32 + dens),
        rot: rnd() * TAU,
        rotV: (rnd() - 0.5) * 0.35,
        color0: _ce,
        color1: _cf,
        color2: _cc,
        alpha: 0.82 * (0.22 + dens * 0.95),
        drag: 1.1,
        buoyancy: 1.6 * dens,
        // fadeIn is a fraction of life: on a multi-second smoke ball anything
        // above a few percent means the mass is still arriving a second later.
        fadeIn: 0.035,
        wind: 1,
        turb: 0.8 + dens * 1.1,
      });
    }
    const nWisp = Math.round((9 + 15 * dens) * q);
    for (let i = 0; i < nWisp; i++) {
      _v.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
      _p.copy(pos).addScaledVector(_v, size * 0.55);
      _v.multiplyScalar(20 + rnd() * 46);
      this.smoke.spawn({
        pos: _p,
        vel: _v,
        size0: size * 0.8,
        size1: size * (2.4 + rnd() * 2.6) * (0.45 + dens),
        life: (2.6 + rnd() * 3.4) * (0.3 + dens),
        rot: rnd() * TAU,
        rotV: (rnd() - 0.5) * 0.6,
        color0: _cd,
        color1: _ce,
        color2: _cf,
        alpha: 0.42 * (0.2 + dens * 0.9),
        drag: 0.7,
        buoyancy: 0.7 * dens,
        fadeIn: 0.07,
        wind: 1,
        turb: 1.4 + dens * 1.8,
      });
    }
    if (dens > 0.12) {
      _p.copy(pos);
      this._source(_p, pos.y, 1.1 + dens * 1.4, size * 0.06 * (0.4 + dens), 2);
    }

    this.flash(pos, 60000 * size, 0.45, 0xffcc8a);
    if (this.weather) this.weather.addFlash(0.5, COL.flameHot);
  }

  /** Ground impact of a leaker: base surge, rising column, ejecta and decals. */
  groundImpact(pos, size, camera) {
    const gy = this.groundAt(pos.x, pos.z);
    const q = this.q;
    _p2.set(pos.x, gy, pos.z);
    const px = pos.x;
    const pz = pos.z;

    // Fuel-rich dirt burn: pull the mid stop off pure orange so the body has
    // somewhere to sit between the incandescent creases and the soot.
    _ca.copy(COL.flameMid).lerp(COL.sootEarth, 0.16);
    // The surge dome. Squashed and welded to the deck, it spreads sideways
    // because that is the only direction open to it.
    const fb = this._fireball();
    _p.set(px, gy + size * 0.16, pz);
    fb.fire(_p, size * 0.16, size * 1.05, 1.35, { hot: COL.flameWhite, mid: _ca, cool: COL.sootEarth }, {
      rise: 7,
      roll: 1.05,
      smoke: 0.7,
      turb: 1.25,
      // Compact and bright for the first frames, then it rolls open.
      grow: 1.5,
      glow: 0.9,
      opacity: 0.95,
      flat: 0.85,
      rootY: gy - size * 0.06,
    });
    // The head of the column: a smaller, hotter ball climbing out of the dome.
    const fbHead = this._fireball();
    if (fbHead !== fb) {
      _p.set(px + rr(-1, 1) * size * 0.18, gy + size * 0.5, pz + rr(-1, 1) * size * 0.18);
      fbHead.fire(_p, size * 0.1, size * 0.62, 1.7, { hot: COL.flameWhite, mid: _ca, cool: COL.sootEarth }, {
        rise: 22,
        roll: 0.8,
        smoke: 0.85,
        turb: 1.0,
        grow: 2.2,
        glow: 0.7,
        opacity: 0.92,
        flat: 0.3,
      });
    }

    // ---- base surge: the dirty ring that rolls out along the deck -------
    const nSurge = Math.round(64 * q);
    for (let i = 0; i < nSurge; i++) {
      const a = (i / nSurge) * TAU + rr(-0.08, 0.08);
      // The surge has to outrun the fireball, or the dirty part of the event
      // stays hidden inside the bright part for its whole first second.
      const sp = 48 + rnd() * 74;
      _p.set(px + Math.cos(a) * size * 0.2, gy + 0.5 + rnd() * 3, pz + Math.sin(a) * size * 0.2);
      _v.set(Math.cos(a) * sp, 2 + rnd() * 7, Math.sin(a) * sp);
      this.dust.spawn({
        pos: _p,
        vel: _v,
        size0: size * 0.7,
        size1: size * (2.6 + rnd() * 2.6),
        life: 6 + rnd() * 6,
        rot: rnd() * TAU,
        rotV: (rnd() - 0.5) * 0.4,
        color0: COL.dustHot,
        color1: COL.dust,
        color2: COL.dustDark,
        alpha: 0.75,
        drag: 0.9,
        buoyancy: 0.45,
        fadeIn: 0.05,
        wind: 1,
        turb: 2.4,
        hugY: gy + 0.5,
      });
    }

    // ---- rising stem ----------------------------------------------------
    const nStem = Math.round(30 * q);
    for (let i = 0; i < nStem; i++) {
      const a = rnd() * TAU;
      const r0 = rnd() * size * 0.5;
      _p.set(px + Math.cos(a) * r0, gy + rnd() * size * 0.8, pz + Math.sin(a) * r0);
      _v.set(Math.cos(a) * rr(2, 9), 12 + rnd() * 26, Math.sin(a) * rr(2, 9));
      this.dust.spawn({
        pos: _p,
        vel: _v,
        size0: size * 0.8,
        size1: size * (2.6 + rnd() * 2.4),
        life: 7 + rnd() * 5,
        rot: rnd() * TAU,
        rotV: (rnd() - 0.5) * 0.3,
        color0: COL.dust,
        color1: COL.dustDark,
        color2: COL.smokeDark,
        alpha: 0.62,
        drag: 0.5,
        buoyancy: 2.6,
        fadeIn: 0.05,
        wind: 1,
        turb: 2.6,
      });
    }

    // ---- fireball wash --------------------------------------------------
    const nFire = Math.round(24 * q);
    for (let i = 0; i < nFire; i++) {
      _v.set(rnd() - 0.5, rnd() * 0.9, rnd() - 0.5).normalize();
      _p.set(px, gy + 0.6, pz);
      _v.multiplyScalar(22 + rnd() * 64);
      this.fire.spawn({
        pos: _p,
        vel: _v,
        size0: size * 0.32,
        size1: size * 1.25,
        life: 0.45 + rnd() * 0.6,
        color0: COL.flameHot,
        color1: COL.flameMid,
        color2: COL.flameDeep,
        alpha: 0.55,
        drag: 1.5,
        fadeIn: 0.02,
        wind: 0.2,
        turb: 7,
      });
    }

    // ---- ejecta arcs: grit and embers on ballistic paths ----------------
    const nEject = Math.round(48 * q);
    for (let i = 0; i < nEject; i++) {
      const a = rnd() * TAU;
      const el = 0.7 + rnd() * 0.8;
      const sp = 26 + rnd() * 62;
      _p.set(px, gy + 0.5, pz);
      _v.set(Math.cos(a) * sp * Math.cos(el), sp * Math.sin(el), Math.sin(a) * sp * Math.cos(el));
      this.grit.spawn({
        pos: _p,
        vel: _v,
        size0: 0.16 + rnd() * 0.34,
        size1: 0.12 + rnd() * 0.24,
        life: 2.4 + rnd() * 2.2,
        color0: COL.grit,
        color1: COL.grit,
        color2: COL.gritDark,
        alpha: 0.95,
        drag: 0.1,
        gravity: 9.81,
        fadeIn: 0.01,
        wind: 0.2,
      });
    }
    const nSpark = Math.round(46 * q);
    for (let i = 0; i < nSpark; i++) {
      _v.set(rnd() - 0.5, rnd() * 1.2, rnd() - 0.5).normalize().multiplyScalar(55 + rnd() * 190);
      _p.set(px, gy + 0.5, pz);
      this.sparks.spawn({
        pos: _p,
        vel: _v,
        // Small: an additive sprite a metre across reads as a pale pink pill
        // against a bright sky, not as a glowing fragment.
        size0: 0.55,
        size1: 0.16,
        life: 1.1 + rnd() * 1.6,
        color0: COL.emberWhite,
        color1: COL.emberOrange,
        color2: COL.emberDark,
        alpha: 1,
        drag: 0.24,
        gravity: 9.8,
        fadeIn: 0.01,
        wind: 0.2,
      });
    }

    // ---- tumbling wreckage, smoking on the way up ------------------------
    const nDebris = Math.round(26 * Math.min(1, q + 0.25));
    for (let i = 0; i < nDebris; i++) {
      _v.set(rnd() - 0.5, rnd() * 1.4, rnd() - 0.5).normalize().multiplyScalar(26 + rnd() * 82);
      _p.set(px, gy + 0.6, pz);
      const scl = 0.35 + rnd() * 1.5;
      this.debris.spawn(_p, _v, scl, 14, scl > 1.25 ? 0.045 : 0);
    }

    // ---- rings and light -------------------------------------------------
    _p.set(px, gy + 0.6, pz);
    this._shock().fire(_p, size * 6.5, 0.9, COL.ringPale, camera, {
      ground: true,
      emit: 0.3,
      intensity: 0.9,
      thickness: 0.035,
      thickness1: 0.13,
      ease: 0.5,
    });
    _p.set(px, gy + size * 0.5, pz);
    this._shock().fire(_p, size * 4.5, 0.42, COL.ringWarm, camera, {
      emit: 1,
      intensity: 0.7,
      thickness: 0.045,
      ease: 0.42,
    });

    _p.set(px, gy, pz);
    this._source(_p, gy, 5.5, size * 0.09, 1);

    this.craters.place(_p2, size * 2.4, null, 1e9);
    this.scorch.place(_p2, size * 4.4, null, 1e9);
    _p.set(px, gy + size, pz);
    this.flash(_p, 90000, 0.7, 0xffb060);
    if (this.weather) this.weather.addFlash(0.85, COL.flameHot);
  }

  /** Small puff for staging events, decoy release and minor debris. */
  puff(pos, size, color = 0xb0aca8, count = 8) {
    _ca.set(color);
    for (let i = 0; i < count; i++) {
      _v.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(6 + rnd() * 22);
      this.smoke.spawn({
        pos,
        vel: _v,
        size0: size * 0.5,
        size1: size * 3,
        life: 1.6 + rnd() * 2,
        rot: rnd() * TAU,
        rotV: (rnd() - 0.5) * 0.6,
        color0: _ca,
        color1: COL.smokeMid,
        color2: COL.smokeDark,
        alpha: 0.5,
        drag: 1.2,
        buoyancy: 0.4,
        fadeIn: 0.06,
        wind: 1,
        turb: 1.4,
      });
    }
  }

  /** Re-entry ablation sparks trailing a threat. */
  ablation(pos, vel, intensity) {
    const n = intensity > 0.6 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      _v.copy(vel).multiplyScalar(-0.12);
      _v.x += (rnd() - 0.5) * 30;
      _v.y += (rnd() - 0.5) * 30;
      _v.z += (rnd() - 0.5) * 30;
      this.sparks.spawn({
        pos,
        vel: _v,
        size0: 2.2 * intensity,
        size1: 0.4,
        life: 0.5 + rnd() * 0.8,
        color0: COL.emberWhite,
        color1: COL.emberOrange,
        color2: COL.emberDark,
        alpha: intensity,
        drag: 0.4,
        gravity: 4,
        fadeIn: 0.02,
        wind: 0.2,
      });
    }
  }

  groundAt(x, z) {
    return this.terrainFn ? this.terrainFn(x, z) : 0;
  }

  clear() {
    for (const l of this.layers) l.clear();
    for (const t of [...this.trails, ...this.hotTrails]) t.hide();
    for (const f of this.fireballs) {
      f.alive = false;
      f.mesh.visible = false;
    }
    for (const s of this.shocks) {
      s.alive = false;
      s.mesh.visible = false;
    }
    for (const s of this.sources) s.active = false;
    this.debris.clear();
    this.scorch.clear();
    this.craters.clear();
    for (const f of this.flashLights) {
      f.t = 1;
      f.life = 0;
      f.light.visible = false;
      f.light.intensity = 0;
    }
  }

  /* ------------------------------------------------------------ internals */

  /** Feed the lingering smoke sources (launch pads, craters, wrecks). */
  _updateSources(dt) {
    for (const s of this.sources) {
      if (!s.active) continue;
      s.t += dt;
      if (s.t >= s.life) {
        s.active = false;
        continue;
      }
      const k = 1 - s.t / s.life;
      s.acc += dt * (s.kind === 2 ? 26 : 34) * k * this.q;
      let n = Math.floor(s.acc);
      if (n <= 0) continue;
      s.acc -= n;
      n = Math.min(n, 6);
      const sc = s.scale;
      for (let i = 0; i < n; i++) {
        if (s.kind === 2) {
          // Air burst: a smoke ball that expands in place and drifts downwind.
          _v.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
          _p.copy(s.pos).addScaledVector(_v, sc * rr(1, 9));
          _v.multiplyScalar(rr(1, 7));
          this.smoke.spawn({
            pos: _p,
            vel: _v,
            size0: sc * 5,
            size1: sc * rr(13, 24),
            life: rr(4.5, 8.5),
            rot: rnd() * TAU,
            rotV: (rnd() - 0.5) * 0.3,
            color0: COL.smokeMid,
            color1: COL.smokeDark,
            color2: COL.soot,
            alpha: 0.4,
            drag: 0.55,
            buoyancy: 0.5,
            fadeIn: 0.16,
            wind: 1,
            turb: 1.6,
          });
          continue;
        }
        const a = rnd() * TAU;
        const r0 = rnd() * sc * (s.kind === 1 ? 5 : 2.6);
        _p.set(s.pos.x + Math.cos(a) * r0, s.gy + rr(0.5, 3) * sc, s.pos.z + Math.sin(a) * r0);
        _v.set(Math.cos(a) * rr(1, 5) * sc, rr(5, 15) * (s.kind === 1 ? 1.4 : 1), Math.sin(a) * rr(1, 5) * sc);
        this.smoke.spawn({
          pos: _p,
          vel: _v,
          size0: sc * 6,
          size1: sc * rr(22, 40),
          life: rr(5, 11) * (s.kind === 1 ? 1.4 : 1),
          rot: rnd() * TAU,
          rotV: (rnd() - 0.5) * 0.35,
          color0: s.kind === 1 ? COL.smokeDark : COL.smokeLight,
          color1: s.kind === 1 ? COL.soot : COL.smokeMid,
          color2: s.kind === 1 ? COL.sootDeep : COL.smokeDark,
          alpha: s.kind === 1 ? 0.7 : 0.58,
          drag: 0.5,
          buoyancy: s.kind === 1 ? 2.6 : 1.8,
          fadeIn: 0.09,
          wind: 1,
          turb: 2.4,
        });
      }
    }
  }

  /**
   * Dust motes hanging in the air a few metres from the eye. Only worth drawing
   * in daylight, where they catch the sun and give the air some depth.
   */
  _updateMotes(dt, camera) {
    if (!this.motesEnabled) return;
    const layer = this.motes;
    const sunUp = this.weather && this.weather.tod ? this.weather.tod.sunElev : 0.6;
    if (sunUp <= 0.08) return;
    this._moteTimer -= dt;
    if (this._moteTimer > 0) return;
    this._moteTimer = 0.05;
    const want = Math.round(layer.capacity * 0.6);
    let spawn = Math.min(10, want - layer.live);
    const cam = camera.position;
    while (spawn-- > 0) {
      const a = rnd() * TAU;
      const r0 = 1.5 + rnd() * 9;
      _p.set(cam.x + Math.cos(a) * r0, cam.y + rr(-1.5, 1.8), cam.z + Math.sin(a) * r0);
      const gy = this.groundAt(_p.x, _p.z);
      if (_p.y < gy + 0.15) _p.y = gy + 0.15;
      _v.set(rr(-0.12, 0.12), rr(-0.05, 0.09), rr(-0.12, 0.12));
      layer.spawn({
        pos: _p,
        vel: _v,
        size0: 0.012 + rnd() * 0.035,
        size1: 0.012 + rnd() * 0.035,
        life: 2.6 + rnd() * 3.4,
        color0: COL.mote,
        color1: COL.mote,
        alpha: (0.16 + rnd() * 0.3) * Math.min(1, sunUp * 2),
        drag: 0.6,
        buoyancy: 0.015,
        fadeIn: 0.25,
        wind: 0.12,
        turb: 0.05,
      });
    }
  }

  update(dt, camera) {
    this.time += dt;
    this._updateSources(dt);
    this._updateMotes(dt, camera);
    let count = 0;
    for (const l of this.layers) {
      l.update(dt, this.wind, this.time);
      count += l.writeBuffers(camera);
    }
    for (const t of this.trails) {
      t.setTime(this.time);
      t.setWind(this.wind);
    }
    for (const t of this.hotTrails) t.setTime(this.time);
    for (const t of [...this.trails, ...this.hotTrails]) {
      if (!t.active && t.mesh.visible) {
        // Fade the orphaned ribbon out, then release it.
        const fade = t.mat.uniforms.uFade.value;
        t._orphan = (t._orphan || 0) + dt;
        if (t._orphan > Math.min(24, 6 / Math.max(0.02, fade))) {
          t.hide();
          t._orphan = 0;
        }
      } else if (t.active) {
        t._orphan = 0;
      }
    }
    for (const f of this.fireballs) f.update(dt, this.time, this.wind);
    for (const s of this.shocks) s.update(dt);
    count += this.debris.update(
      dt,
      this.terrainFn,
      (p, v) => {
        _v.set((rnd() - 0.5) * 4, 2 + rnd() * 3, (rnd() - 0.5) * 4);
        this.dust.spawn({
          pos: p,
          vel: _v,
          size0: 0.8,
          size1: 5,
          life: 1.6,
          color0: COL.dust,
          color1: COL.dustDark,
          alpha: 0.4,
          drag: 1.4,
          buoyancy: 0.5,
          fadeIn: 0.08,
          turb: 0.8,
        });
      },
      (p, v, t, scl) => {
        // Smoke ribbon shed by a tumbling fragment. Puffs start wide enough to
        // overlap their neighbours along the arc, otherwise the trail reads as a
        // string of beads rather than a continuous wisp.
        _v.copy(v).multiplyScalar(-0.05);
        this.smoke.spawn({
          pos: p,
          vel: _v,
          size0: scl * (3.4 + rnd() * 1.6),
          size1: scl * (9 + rnd() * 6),
          life: 1 + rnd() * 1.1,
          rot: rnd() * TAU,
          rotV: (rnd() - 0.5) * 0.6,
          color0: COL.dustDark,
          color1: COL.smokeDark,
          color2: COL.soot,
          alpha: 0.26 * (1 - t * 0.6),
          drag: 1.1,
          buoyancy: 0.9,
          fadeIn: 0.1,
          wind: 1,
          turb: 1.6,
        });
      }
    );
    this.scorch.update(dt);
    this.craters.update(dt);
    for (const f of this.flashLights) {
      if (f.t >= f.life) {
        if (f.light.visible) {
          f.light.visible = false;
          f.light.intensity = 0;
        }
        continue;
      }
      f.t += dt;
      const p = Math.min(1, f.t / f.life);
      f.light.intensity = f.peak * Math.pow(1 - p, 2.4);
      if (p >= 1) {
        f.light.visible = false;
        f.light.intensity = 0;
      }
    }
    this.particleCount = count;
    return count;
  }
}
