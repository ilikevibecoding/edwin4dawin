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

function withAtm(uniforms) {
  return Object.assign({}, atmosphere, uniforms);
}

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
uniform float uStretchAmount;
void main() {
  vUv = uv;
  vColor = aColor;
  vAlpha = aAlpha;
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
}
`;

const PARTICLE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform float uEmissive;
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
varying vec3 vWorld;
${ATM_PARS}
void main() {
  vec4 t = texture2D( uMap, vUv );
  float a = t.a * vAlpha;
  if ( a < 0.003 ) discard;
  vec3 col = t.rgb * vColor;
  float trans;
  vec3 lit = applyAtm( col, vWorld, trans );
  // Emissive material keeps its own colour through the haze.
  col = mix( lit, col, uEmissive );
  gl_FragColor = vec4( col, a );
}
`;

class BillboardLayer {
  constructor(capacity, texture, { blending = THREE.NormalBlending, sorted = false, stretch = 0, emissive = 0, depthWrite = false } = {}) {
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
    this.alpha0 = new Float32Array(n);
    this.drag = new Float32Array(n);
    this.buoy = new Float32Array(n);
    this.gravity = new Float32Array(n);
    this.fadeIn = new Float32Array(n);
    this.wind = new Float32Array(n);

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
    this.mesh.renderOrder = blending === THREE.AdditiveBlending ? 12 : 10;
    this._order = new Int32Array(n);
    this._depth = new Float32Array(n);
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
    this.alpha0[i] = opts.alpha !== undefined ? opts.alpha : 1;
    this.drag[i] = opts.drag !== undefined ? opts.drag : 1.2;
    this.buoy[i] = opts.buoyancy || 0;
    this.gravity[i] = opts.gravity || 0;
    this.fadeIn[i] = opts.fadeIn || 0.06;
    this.wind[i] = opts.wind !== undefined ? opts.wind : 1;
    return i;
  }

  update(dt, wind) {
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
      this.px[i] += this.vx[i] * dt;
      this.py[i] += this.vy[i] * dt;
      this.pz[i] += this.vz[i] * dt;
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
      for (let i = 0; i < n; i++) {
        this._order[i] = i;
        const dx = this.px[i] - cx;
        const dy = this.py[i] - cy;
        const dz = this.pz[i] - cz;
        this._depth[i] = dx * dx + dy * dy + dz * dz;
      }
      const ord = Array.prototype.slice.call(this._order.subarray(0, n));
      ord.sort((a, b) => this._depth[b] - this._depth[a]);
      for (let k = 0; k < n; k++) this._order[k] = ord[k];
    } else {
      for (let i = 0; i < n; i++) this._order[i] = i;
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
      const ct = t;
      col[o] = this.cr[i] + (this.cr1[i] - this.cr[i]) * ct;
      col[o + 1] = this.cg[i] + (this.cg1[i] - this.cg[i]) * ct;
      col[o + 2] = this.cb[i] + (this.cb1[i] - this.cb[i]) * ct;
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
    return live;
  }

  clear() {
    this.count = 0;
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
uniform float uTime;
uniform float uGrow;
uniform float uFade;
varying float vAlpha;
varying vec3 vColor;
varying vec3 vWorld;
varying float vAcross;
void main() {
  float age = max( 0.0, uTime - aBirth );
  float w = aWidth * ( 1.0 + age * uGrow );
  vec3 world = position;
  vec3 toCam = normalize( cameraPosition - world );
  vec3 side = normalize( cross( aTangent, toCam ) );
  world += side * ( aSide * w );
  vAlpha = aOpacity * exp( -age * uFade );
  vColor = aColor;
  vWorld = world;
  vAcross = aSide;
  gl_Position = projectionMatrix * viewMatrix * vec4( world, 1.0 );
}
`;

const TRAIL_FRAG = /* glsl */ `
precision highp float;
varying float vAlpha;
varying vec3 vColor;
varying vec3 vWorld;
varying float vAcross;
uniform float uEmissive;
${ATM_PARS}
void main() {
  float edge = 1.0 - abs( vAcross ) * 2.0;
  float a = vAlpha * pow( clamp( edge, 0.0, 1.0 ), 0.85 );
  if ( a < 0.004 ) discard;
  float trans;
  vec3 lit = applyAtm( vColor, vWorld, trans );
  vec3 col = mix( lit, vColor, uEmissive );
  gl_FragColor = vec4( col, a );
}
`;

class Trail {
  constructor(capacity, { additive = false, emissive = 0 } = {}) {
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
    this.geo.setIndex(new THREE.BufferAttribute(idx, 1));
    this.geo.setDrawRange(0, 0);
    this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);

    this.mat = new THREE.ShaderMaterial({
      uniforms: withAtm({
        uTime: { value: 0 },
        uGrow: { value: 0.9 },
        uFade: { value: 0.06 },
        uEmissive: { value: emissive },
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
    }
    this.head++;
    this.n = Math.min(this.n + 1, this.capacity);
    // Ring buffer: draw only the contiguous run to avoid a wrap-around ribbon.
    const drawn = Math.min(this.head, this.capacity);
    this.geo.setDrawRange(0, Math.max(0, (drawn - 1) * 6));
    for (const a of ['position', 'aTangent', 'aBirth', 'aWidth', 'aOpacity', 'aColor']) {
      this.geo.attributes[a].needsUpdate = true;
    }
    return true;
  }

  setTime(t) {
    this.mat.uniforms.uTime.value = t;
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
varying vec3 vNormalW;
varying vec3 vWorld;
varying float vNoise;
${GLSL_NOISE}
void main() {
  vec3 p = normalize( position );
  float n = fbm3g( p * 2.4 + vec3( uSeed, uSeed * 0.7, -uSeed ) + vec3( 0.0, -uTime * 0.6, 0.0 ), 4 );
  vNoise = n;
  float bulge = 1.0 + n * uTurb * ( 0.35 + uProgress * 0.55 );
  vec3 world = ( modelMatrix * vec4( p * bulge, 1.0 ) ).xyz;
  vWorld = world;
  vNormalW = normalize( mat3( modelMatrix ) * p );
  gl_Position = projectionMatrix * viewMatrix * vec4( world, 1.0 );
}
`;

const FIREBALL_FRAG = /* glsl */ `
precision highp float;
uniform float uProgress;
uniform vec3 uHot;
uniform vec3 uMid;
uniform vec3 uCool;
uniform float uOpacity;
varying vec3 vNormalW;
varying vec3 vWorld;
varying float vNoise;
${ATM_PARS}
void main() {
  vec3 v = normalize( cameraPosition - vWorld );
  float fres = pow( 1.0 - abs( dot( v, vNormalW ) ), 1.6 );
  float band = clamp( vNoise * 0.5 + 0.5, 0.0, 1.0 );
  float heat = clamp( ( 1.0 - uProgress * 1.35 ) + band * 0.45 - fres * 0.25, 0.0, 1.0 );
  vec3 col = mix( uCool, uMid, smoothstep( 0.12, 0.55, heat ) );
  col = mix( col, uHot, smoothstep( 0.6, 0.98, heat ) );
  float a = uOpacity * ( 1.0 - uProgress ) * ( 0.55 + 0.45 * band ) * ( 0.6 + fres * 0.7 );
  if ( a < 0.004 ) discard;
  float trans;
  vec3 lit = applyAtm( col, vWorld, trans );
  gl_FragColor = vec4( mix( lit, col, 0.55 ), clamp( a, 0.0, 1.0 ) );
}
`;

class Fireball {
  constructor() {
    this.mat = new THREE.ShaderMaterial({
      uniforms: withAtm({
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uSeed: { value: 0 },
        uTurb: { value: 0.42 },
        uHot: { value: new THREE.Color(1.0, 0.96, 0.82) },
        uMid: { value: new THREE.Color(1.0, 0.52, 0.14) },
        uCool: { value: new THREE.Color(0.12, 0.1, 0.1) },
        uOpacity: { value: 1 },
      }),
      vertexShader: FIREBALL_VERT,
      fragmentShader: FIREBALL_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      toneMapped: true,
    });
    this.mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 4), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 13;
    this.alive = false;
    this.t = 0;
    this.life = 1;
    this.r0 = 1;
    this.r1 = 2;
  }

  fire(pos, r0, r1, life, palette) {
    this.mesh.position.copy(pos);
    this.mesh.visible = true;
    this.alive = true;
    this.t = 0;
    this.life = life;
    this.r0 = r0;
    this.r1 = r1;
    this.mat.uniforms.uSeed.value = Math.random() * 40;
    if (palette) {
      this.mat.uniforms.uHot.value.copy(palette.hot);
      this.mat.uniforms.uMid.value.copy(palette.mid);
      this.mat.uniforms.uCool.value.copy(palette.cool);
    }
  }

  update(dt, time) {
    if (!this.alive) return;
    this.t += dt;
    const p = Math.min(1, this.t / this.life);
    const eased = 1 - Math.pow(1 - p, 2.6);
    this.mesh.scale.setScalar(this.r0 + (this.r1 - this.r0) * eased);
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
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
const SHOCK_FRAG = /* glsl */ `
precision highp float;
uniform float uProgress;
uniform vec3 uColor;
uniform float uThickness;
varying vec2 vUv;
varying vec3 vWorld;
${ATM_PARS}
void main() {
  float d = length( vUv - 0.5 ) * 2.0;
  float ring = exp( -pow( ( d - 0.86 ) / uThickness, 2.0 ) );
  float a = ring * ( 1.0 - uProgress ) * ( 1.0 - smoothstep( 0.94, 1.0, d ) );
  if ( a < 0.004 ) discard;
  float trans;
  vec3 lit = applyAtm( uColor, vWorld, trans );
  gl_FragColor = vec4( mix( lit, uColor, 0.6 ), a );
}
`;

class Shockwave {
  constructor() {
    this.mat = new THREE.ShaderMaterial({
      uniforms: withAtm({
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color(1, 0.92, 0.8) },
        uThickness: { value: 0.09 },
      }),
      vertexShader: SHOCK_VERT,
      fragmentShader: SHOCK_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: true,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 14;
    this.alive = false;
    this.t = 0;
    this.life = 1;
    this.r1 = 10;
  }

  fire(pos, r1, life, color, camera) {
    this.mesh.position.copy(pos);
    this.mesh.visible = true;
    this.alive = true;
    this.t = 0;
    this.life = life;
    this.r1 = r1;
    if (color) this.mat.uniforms.uColor.value.copy(color);
    this.camera = camera;
  }

  update(dt) {
    if (!this.alive) return;
    this.t += dt;
    const p = Math.min(1, this.t / this.life);
    const eased = Math.pow(p, 0.55);
    this.mesh.scale.setScalar(Math.max(0.01, this.r1 * eased));
    this.mat.uniforms.uProgress.value = p;
    this.mat.uniforms.uThickness.value = 0.05 + p * 0.14;
    if (this.camera) this.mesh.quaternion.copy(this.camera.quaternion);
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
    const geo = new THREE.TetrahedronGeometry(0.55, 0);
    this.mat = std({ color: 0x4a4642, roughness: 0.75, metalness: 0.5, emissive: 0x220b04, emissiveIntensity: 0.6 });
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

  spawn(pos, vel, scale, life) {
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
    this.count = Math.max(this.count, i + 1);
  }

  update(dt, groundFn, onLand) {
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
  }

  place(pos, size, normal, life = 1e9, rot = Math.random() * Math.PI * 2) {
    const it = this.items[this.next % this.items.length];
    this.next++;
    it.mesh.visible = true;
    it.mesh.position.copy(pos);
    it.mesh.position.y += 0.035;
    it.mesh.scale.set(size, 1, size);
    it.mesh.rotation.set(0, rot, 0);
    if (normal) {
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      it.mesh.quaternion.premultiply(q);
    }
    it.mesh.material.opacity = 1;
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
        it.mesh.material.opacity = Math.max(0, 1 - t);
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
    this.smoke = new BillboardLayer(Math.round(budget * 0.5), smokeSprite(256, 3), {
      blending: THREE.NormalBlending,
      sorted: true,
    });
    this.dust = new BillboardLayer(Math.round(budget * 0.2), smokeSprite(256, 11), {
      blending: THREE.NormalBlending,
      sorted: true,
    });
    this.fire = new BillboardLayer(Math.round(budget * 0.18), softSprite(128, { power: 1.7 }), {
      blending: THREE.AdditiveBlending,
      emissive: 1,
    });
    this.sparks = new BillboardLayer(Math.round(budget * 0.12), sparkSprite(64), {
      blending: THREE.AdditiveBlending,
      stretch: 0.012,
      emissive: 1,
    });
    this.glow = new BillboardLayer(96, flareSprite(256), { blending: THREE.AdditiveBlending, emissive: 1 });
    this.layers = [this.smoke, this.dust, this.fire, this.sparks, this.glow];
    for (const l of this.layers) this.group.add(l.mesh);

    this.trails = [];
    for (let i = 0; i < 18; i++) {
      const t = new Trail(quality.trailSegments, {});
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
    for (let i = 0; i < 10; i++) {
      const f = new Fireball();
      this.group.add(f.mesh);
      this.fireballs.push(f);
    }
    this.shocks = [];
    for (let i = 0; i < 10; i++) {
      const s = new Shockwave();
      this.group.add(s.mesh);
      this.shocks.push(s);
    }
    this.debris = new DebrisPool(Math.min(260, Math.round(budget * 0.09)));
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

    this.wind = new THREE.Vector3(1.4, 0, 0.5);
    this.terrainFn = null;
    this.shakeTarget = null;
  }

  setWind(v) {
    this.wind.copy(v);
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

  flash(pos, peak, life = 0.32, color = 0xffc07a) {
    let slot = this.flashLights.find((f) => f.t >= f.life);
    if (!slot) slot = this.flashLights.reduce((a, b) => (a.t / a.life > b.t / b.life ? a : b));
    slot.light.position.copy(pos);
    slot.light.color.setHex(color);
    slot.light.visible = true;
    slot.t = 0;
    slot.life = life;
    slot.peak = peak;
  }

  glowPuff(pos, size, life, color, alpha = 1) {
    this.glow.spawn({ pos, size0: size, size1: size * 1.5, life, color0: C(color), alpha, drag: 3, fadeIn: 0.02 });
  }

  /**
   * Rocket exhaust: hot core puffs plus a cooler smoke column that drifts with
   * the wind and thins out with altitude.
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
    const n = Math.max(1, Math.round(rate * dt * 60));
    for (let i = 0; i < n; i++) {
      const jitter = 0.6 * scale;
      const p = pos.clone();
      p.x += (Math.random() - 0.5) * jitter;
      p.y += (Math.random() - 0.5) * jitter;
      p.z += (Math.random() - 0.5) * jitter;
      const v = backDir ? backDir.clone().multiplyScalar(28 * scale * (0.4 + Math.random())) : new THREE.Vector3();
      v.x += (Math.random() - 0.5) * 6 * scale;
      v.y += (Math.random() - 0.5) * 6 * scale;
      v.z += (Math.random() - 0.5) * 6 * scale;
      if (boosting) {
        this.fire.spawn({
          pos: p,
          vel: v,
          size0: 3.2 * scale,
          size1: 12 * scale,
          life: 0.24 + Math.random() * 0.16,
          color0: C(hot),
          color1: C(0xff6a20),
          alpha: 0.95,
          drag: 3.4,
          fadeIn: 0.04,
          wind: 0.1,
        });
      }
      this.smoke.spawn({
        pos: p,
        vel: v.clone().multiplyScalar(0.4),
        size0: 4 * scale,
        size1: (26 + Math.random() * 18) * scale * (0.5 + dens),
        life: (1.6 + Math.random() * 2.4) * (0.5 + dens * 1.4),
        rot: Math.random() * 6.28,
        rotV: (Math.random() - 0.5) * 0.6,
        color0: C(smokeColor),
        color1: C(0x8d8d8d),
        alpha: 0.42 * (0.35 + dens * 0.8),
        drag: 0.9,
        buoyancy: 1.2,
        fadeIn: 0.09,
        wind: 0.85,
      });
    }
  }

  /** Ground-interacting launch blast: dust ring, fire wash, scorch mark. */
  launchBlast(pos, dir, batteryCfg, camera) {
    const scale = batteryCfg.plumeScale;
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < Math.round(34 * scale); i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 12 + Math.random() * 26 * scale;
      const v = new THREE.Vector3(Math.cos(a) * sp, 1.2 + Math.random() * 5, Math.sin(a) * sp);
      const p = pos.clone();
      p.y += 0.4;
      this.dust.spawn({
        pos: p,
        vel: v,
        size0: 3 * scale,
        size1: (34 + Math.random() * 26) * scale,
        life: 3.4 + Math.random() * 3.2,
        rot: Math.random() * 6.28,
        rotV: (Math.random() - 0.5) * 0.5,
        color0: C(0xbda480),
        color1: C(0x9a8368),
        alpha: 0.5,
        drag: 1.1,
        buoyancy: 0.9,
        fadeIn: 0.08,
        wind: 1,
      });
    }
    for (let i = 0; i < Math.round(26 * scale); i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 18 + Math.random() * 30 * scale;
      this.fire.spawn({
        pos: pos.clone().add(new THREE.Vector3(0, 0.5, 0)),
        vel: new THREE.Vector3(Math.cos(a) * sp, Math.random() * 6, Math.sin(a) * sp),
        size0: 4 * scale,
        size1: 20 * scale,
        life: 0.36 + Math.random() * 0.3,
        color0: C(0xfff0c0),
        color1: C(0xff5a12),
        alpha: 0.9,
        drag: 2.6,
        fadeIn: 0.03,
        wind: 0.3,
      });
    }
    for (let i = 0; i < Math.round(30 * scale); i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 26 + Math.random() * 50;
      this.sparks.spawn({
        pos: pos.clone().add(new THREE.Vector3(0, 0.6, 0)),
        vel: new THREE.Vector3(Math.cos(a) * sp, Math.random() * 20, Math.sin(a) * sp),
        size0: 0.9,
        size1: 0.25,
        life: 0.5 + Math.random() * 0.7,
        color0: C(0xffe9b0),
        color1: C(0xff5a10),
        alpha: 1,
        drag: 0.5,
        gravity: 9,
        fadeIn: 0.02,
        wind: 0.2,
      });
    }
    this.scorch.place(new THREE.Vector3(pos.x, this.groundAt(pos.x, pos.z), pos.z), 9 * scale, null, 1e9);
    this.flash(pos.clone().add(new THREE.Vector3(0, 3, 0)), 2400 * scale, 0.5, 0xffb060);
    this.shocks
      .find((s) => !s.alive)
      ?.fire(pos.clone().add(new THREE.Vector3(0, 2, 0)), 30 * scale, 0.5, C(0xfff0d0), camera);
    if (this.weather) this.weather.addFlash(0.24 * scale, C(0xffb877));
  }

  /** Air intercept: fireball, ring, debris cone, lingering smoke. */
  intercept(pos, size, camera, palette) {
    const fb = this.fireballs.find((f) => !f.alive) || this.fireballs[0];
    fb.fire(pos, size * 0.35, size * 2.6, 0.85 + size * 0.006, palette);
    const sw = this.shocks.find((s) => !s.alive);
    if (sw) sw.fire(pos, size * 9, 0.75, C(0xffe6c0), camera);

    const dens = trailPersistence(pos.y);
    for (let i = 0; i < 26; i++) {
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      this.fire.spawn({
        pos: pos.clone().addScaledVector(dir, size * 0.4),
        vel: dir.clone().multiplyScalar(30 + Math.random() * 90),
        size0: size * 0.5,
        size1: size * 2.2,
        life: 0.4 + Math.random() * 0.4,
        color0: C(0xfff4d2),
        color1: C(0xff5512),
        alpha: 1,
        drag: 1.8,
        fadeIn: 0.02,
        wind: 0.1,
      });
    }
    for (let i = 0; i < 40; i++) {
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      this.sparks.spawn({
        pos: pos.clone(),
        vel: dir.multiplyScalar(90 + Math.random() * 240),
        size0: 1.6,
        size1: 0.3,
        life: 0.7 + Math.random() * 1.2,
        color0: C(0xffffe0),
        color1: C(0xff7a20),
        alpha: 1,
        drag: 0.28,
        gravity: 9.8,
        fadeIn: 0.01,
        wind: 0.1,
      });
    }
    for (let i = 0; i < 22; i++) {
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      this.smoke.spawn({
        pos: pos.clone().addScaledVector(dir, size * 0.6),
        vel: dir.clone().multiplyScalar(14 + Math.random() * 40),
        size0: size * 0.8,
        size1: size * (5 + Math.random() * 4) * (0.5 + dens),
        life: (3.5 + Math.random() * 4) * (0.4 + dens),
        rot: Math.random() * 6.28,
        rotV: (Math.random() - 0.5) * 0.4,
        color0: C(0x6f6a66),
        color1: C(0x4a4744),
        alpha: 0.55 * (0.3 + dens),
        drag: 0.8,
        buoyancy: 0.5,
        fadeIn: 0.07,
        wind: 1,
      });
    }
    const nDebris = Math.round(14 + size * 0.5);
    for (let i = 0; i < nDebris; i++) {
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize();
      this.debris.spawn(pos.clone(), dir.multiplyScalar(40 + Math.random() * 140), 0.6 + Math.random() * 2.4, 12 + Math.random() * 10);
    }
    this.glowPuff(pos, size * 6, 0.5, 0xffd9a0, 0.9);
    this.flash(pos, 60000 * size, 0.45, 0xffcc8a);
    if (this.weather) this.weather.addFlash(0.5, C(0xffd2a0));
  }

  /** Ground impact of a leaker. */
  groundImpact(pos, size, camera) {
    const gy = this.groundAt(pos.x, pos.z);
    const p = new THREE.Vector3(pos.x, gy, pos.z);
    const fb = this.fireballs.find((f) => !f.alive) || this.fireballs[0];
    fb.fire(p.clone().add(new THREE.Vector3(0, size * 0.5, 0)), size * 0.4, size * 3.0, 1.3, {
      hot: C(0xfff2cf),
      mid: C(0xff7a24),
      cool: C(0x1a1512),
    });
    const sw = this.shocks.find((s) => !s.alive);
    if (sw) sw.fire(p.clone().add(new THREE.Vector3(0, 2, 0)), size * 14, 1.1, C(0xffe0b0), camera);

    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 20 + Math.random() * 70;
      this.dust.spawn({
        pos: p.clone().add(new THREE.Vector3(0, 1, 0)),
        vel: new THREE.Vector3(Math.cos(a) * sp, Math.random() * 26, Math.sin(a) * sp),
        size0: size * 0.6,
        size1: size * (5 + Math.random() * 5),
        life: 6 + Math.random() * 6,
        rot: Math.random() * 6.28,
        rotV: (Math.random() - 0.5) * 0.3,
        color0: C(0xc0a582),
        color1: C(0x8a7660),
        alpha: 0.6,
        drag: 0.8,
        buoyancy: 1.6,
        fadeIn: 0.06,
        wind: 1,
      });
    }
    for (let i = 0; i < 46; i++) {
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9, Math.random() - 0.5).normalize();
      this.fire.spawn({
        pos: p.clone(),
        vel: dir.multiplyScalar(24 + Math.random() * 70),
        size0: size * 0.7,
        size1: size * 3,
        life: 0.7 + Math.random() * 0.7,
        color0: C(0xfff0c0),
        color1: C(0xff4a0c),
        alpha: 1,
        drag: 1.4,
        fadeIn: 0.02,
        wind: 0.2,
      });
    }
    for (let i = 0; i < 60; i++) {
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 1.2, Math.random() - 0.5).normalize();
      this.sparks.spawn({
        pos: p.clone(),
        vel: dir.multiplyScalar(60 + Math.random() * 200),
        size0: 1.8,
        size1: 0.4,
        life: 1.2 + Math.random() * 1.6,
        color0: C(0xfff6d8),
        color1: C(0xff6010),
        alpha: 1,
        drag: 0.25,
        gravity: 9.8,
        fadeIn: 0.01,
        wind: 0.2,
      });
    }
    for (let i = 0; i < 30; i++) {
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 1.4, Math.random() - 0.5).normalize();
      this.debris.spawn(p.clone(), dir.multiplyScalar(30 + Math.random() * 90), 0.8 + Math.random() * 3, 14);
    }
    // Rising smoke column
    for (let i = 0; i < 30; i++) {
      this.smoke.spawn({
        pos: p.clone().add(new THREE.Vector3((Math.random() - 0.5) * size, Math.random() * size, (Math.random() - 0.5) * size)),
        vel: new THREE.Vector3((Math.random() - 0.5) * 8, 6 + Math.random() * 14, (Math.random() - 0.5) * 8),
        size0: size,
        size1: size * (6 + Math.random() * 5),
        life: 12 + Math.random() * 10,
        rot: Math.random() * 6.28,
        rotV: (Math.random() - 0.5) * 0.25,
        color0: C(0x4d4844),
        color1: C(0x2e2b28),
        alpha: 0.68,
        drag: 0.5,
        buoyancy: 2.4,
        fadeIn: 0.05,
        wind: 1,
      });
    }
    this.craters.place(p, size * 2.4, null, 1e9);
    this.scorch.place(p, size * 4.4, null, 1e9);
    this.flash(p.clone().add(new THREE.Vector3(0, size, 0)), 90000, 0.7, 0xffb060);
    if (this.weather) this.weather.addFlash(0.85, C(0xffb070));
  }

  /** Small puff for staging events, decoy release and minor debris. */
  puff(pos, size, color = 0xb0aca8, count = 8) {
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      this.smoke.spawn({
        pos: pos.clone(),
        vel: dir.multiplyScalar(6 + Math.random() * 22),
        size0: size * 0.5,
        size1: size * 3,
        life: 1.6 + Math.random() * 2,
        rot: Math.random() * 6.28,
        rotV: (Math.random() - 0.5) * 0.5,
        color0: C(color),
        color1: C(0x777270),
        alpha: 0.5,
        drag: 1.2,
        buoyancy: 0.4,
        fadeIn: 0.06,
        wind: 1,
      });
    }
  }

  /** Re-entry ablation sparks trailing a threat. */
  ablation(pos, vel, intensity) {
    const n = intensity > 0.6 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      this.sparks.spawn({
        pos: pos.clone(),
        vel: vel.clone().multiplyScalar(-0.12).add(new THREE.Vector3((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30)),
        size0: 2.2 * intensity,
        size1: 0.4,
        life: 0.5 + Math.random() * 0.8,
        color0: C(0xfff2d0),
        color1: C(0xff7a2a),
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

  update(dt, camera) {
    this.time += dt;
    let count = 0;
    for (const l of this.layers) {
      l.update(dt, this.wind);
      count += l.writeBuffers(camera);
    }
    for (const t of [...this.trails, ...this.hotTrails]) {
      t.setTime(this.time);
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
    for (const f of this.fireballs) f.update(dt, this.time);
    for (const s of this.shocks) s.update(dt);
    count += this.debris.update(dt, this.terrainFn, (p) => {
      this.dust.spawn({
        pos: p.clone(),
        vel: new THREE.Vector3((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4),
        size0: 0.8,
        size1: 5,
        life: 1.6,
        color0: C(0xbda480),
        color1: C(0x9a8368),
        alpha: 0.4,
        drag: 1.4,
        buoyancy: 0.5,
        fadeIn: 0.08,
      });
    });
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
