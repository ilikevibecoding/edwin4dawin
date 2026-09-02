import * as THREE from 'three';

/**
 * One instanced batch of camera-facing (or velocity-stretched) sprite quads, simulated on the CPU into
 * pre-allocated typed arrays (structure of arrays) and uploaded as instanced attributes — a single draw
 * call for a few thousand particles, zero per-frame allocation.
 *
 * Blending: premultiplied alpha (ONE, ONE_MINUS_SRC_ALPHA) so additive sparks/fire (blend = 0) and
 * alpha-blended smoke/dust (blend = 1) live in the same batch and are depth-sorted together.
 * Lighting: sprites with `lit > 0` sample a companion normal atlas and are shaded by the sun
 * (wrap lighting + bright backlit rim on thin edges) so smoke reads as volumetric, not flat grey.
 *
 *   ps.emit({ x, y, z, vx, vy, vz, life, size0, size1, rot, rotVel, r0, g0, b0, r1, g1, b1, alpha, fadeIn,
 *             fadeOut, atlas, atlasCount, blend0, blend1, lit0, lit1, gravity, drag, stretch, turb, bounce,
 *             groundY, sizeEase })
 *   ps.update(dt, camera, time)
 */

const FIELDS = [
  'px', 'py', 'pz', 'vx', 'vy', 'vz', 'age', 'life', 'size0', 'size1', 'rot', 'rotVel',
  'r0', 'g0', 'b0', 'r1', 'g1', 'b1', 'alpha', 'fadeIn', 'fadeOut', 'atlas', 'atlasCount',
  'blend0', 'blend1', 'lit0', 'lit1', 'gravity', 'drag', 'stretch', 'turb', 'bounce', 'groundY', 'seed', 'sizeEase', 'hover',
];

const VERT = /* glsl */ `
attribute vec4 aPos;    // xyz world position, w = size (m)
attribute vec4 aVel;    // xyz world velocity, w = stretched length (m), 0 = round billboard
attribute vec4 aData;   // rotation, atlas cell, alpha, lit
attribute vec4 aColor;  // rgb tint (linear), a = blend (0 additive .. 1 alpha)
uniform vec2 uGrid;
uniform float uFogDensity;
varying vec2 vUv;
varying vec4 vColor;
varying vec3 vData;     // alpha, lit, blend
varying vec2 vRot;
varying float vFog;
varying float vDepthFade;
varying float vFlip;

void main() {
  vec4 mv = modelViewMatrix * vec4(aPos.xyz, 1.0);
  vec2 corner = position.xy;
  float c = cos(aData.x);
  float s = sin(aData.x);
  vec2 offset;
  if (aVel.w > 0.0) {
    vec3 vv = (viewMatrix * vec4(aVel.xyz, 0.0)).xyz;
    vec2 d = vv.xy;
    float l = length(d);
    d = l > 1e-5 ? d / l : vec2(0.0, 1.0);
    vec2 p = vec2(-d.y, d.x);
    // foreshorten the streak when the velocity points at/away from the camera
    float fore = clamp(l / max(length(vv), 1e-5), 0.15, 1.0);
    offset = p * corner.x * aPos.w + d * corner.y * (aVel.w * fore);
    c = d.y;
    s = -d.x;
  } else {
    offset = vec2(c * corner.x - s * corner.y, s * corner.x + c * corner.y) * aPos.w;
  }
  mv.xy += offset;
  gl_Position = projectionMatrix * mv;
  // negative cell index = mirrored sprite (doubles the apparent variety of the atlas)
  float cell = aData.y;
  vFlip = 1.0;
  if (cell < 0.0) {
    vFlip = -1.0;
    cell = -cell - 1.0;
  }
  float col = mod(cell, uGrid.x);
  float row = (uGrid.y - 1.0) - floor(cell / uGrid.x);
  vec2 cuv = vec2(vFlip < 0.0 ? 1.0 - uv.x : uv.x, uv.y);
  vUv = (cuv + vec2(col, row)) / uGrid;
  vColor = aColor;
  vData = vec3(aData.z, aData.w, aColor.a);
  vRot = vec2(c, s);
  float depth = -mv.z;
  vFog = 1.0 - exp(-uFogDensity * uFogDensity * depth * depth);
  vDepthFade = clamp(depth / (aPos.w * 0.9 + 0.05), 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uAtlas;
uniform sampler2D uNormalAtlas;
uniform vec3 uSunView;
uniform vec3 uSunColor;
uniform vec3 uAmbient;
uniform vec3 uFogColor;
varying vec2 vUv;
varying vec4 vColor;
varying vec3 vData;
varying vec2 vRot;
varying float vFog;
varying float vDepthFade;
varying float vFlip;

void main() {
  vec4 tex = texture2D(uAtlas, vUv);
  float alpha = tex.a * vData.x * vDepthFade;
  if (alpha < 0.002) discard;
  vec3 col = tex.rgb * vColor.rgb;
  float lit = vData.y;
  if (lit > 0.001) {
    vec4 nrm = texture2D(uNormalAtlas, vUv);
    vec3 n = nrm.xyz * 2.0 - 1.0;
    n.x *= vFlip;
    n.xy = vec2(vRot.x * n.x - vRot.y * n.y, vRot.y * n.x + vRot.x * n.y);
    n = normalize(n);
    float ndl = dot(n, uSunView);
    // translucent media: soft wrap lighting instead of a hard terminator
    float wrap = clamp(ndl * 0.55 + 0.45, 0.0, 1.0);
    wrap = wrap * wrap * (1.6 - 0.6 * wrap);
    // sun in front of the camera → thin edges glow (forward scattering)
    float back = clamp(-uSunView.z, 0.0, 1.0);
    float thin = 1.0 - nrm.a * vData.x;
    float rim = back * pow(thin, 2.0) * 1.6 + pow(thin, 4.0) * 0.25;
    // sky ambient stronger on top, ground bounce below
    vec3 amb = uAmbient * (0.75 + 0.45 * n.y);
    vec3 light = amb + uSunColor * (wrap + rim);
    col *= mix(vec3(1.0), light, lit);
  }
  float blend = vData.z;
  vec3 rgb = col * alpha;
  float a = alpha * blend;
  rgb = mix(rgb, uFogColor * a, vFog);
  gl_FragColor = vec4(rgb, a);
}
`;

export class ParticleSystem {
  constructor(game, atlas, { capacity = 4096, renderOrder = 10, layer = 0 } = {}) {
    this.game = game;
    this.capacity = capacity;
    this.count = 0;
    const N = capacity;
    for (const f of FIELDS) this[f] = new Float32Array(N);
    this._fields = FIELDS.map((f) => this[f]);
    this._keys = new Float64Array(N);

    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aVel = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aData = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aPos', this.aPos);
    geo.setAttribute('aVel', this.aVel);
    geo.setAttribute('aData', this.aData);
    geo.setAttribute('aColor', this.aColor);
    geo.instanceCount = 0;
    this.geometry = geo;

    const fog = game.scene.fog;
    this.uniforms = {
      uAtlas: { value: atlas.map },
      uNormalAtlas: { value: atlas.normalMap },
      uGrid: { value: new THREE.Vector2(atlas.cols, atlas.rows) },
      uSunView: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Vector3(1.2, 1.1, 1.0) },
      uAmbient: { value: new THREE.Vector3(0.32, 0.36, 0.44) },
      uFogColor: { value: new THREE.Color(fog ? fog.color : 0xbfd4e6) },
      uFogDensity: { value: fog && fog.isFogExp2 ? fog.density : 0 },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = 'ParticleBatch';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = renderOrder;
    this.mesh.layers.set(layer);
    this.mesh.visible = false;
    this._camPos = new THREE.Vector3();
    this._sunView = new THREE.Vector3();
    this.time = 0;
    this.stats = { alive: 0, peak: 0 };
  }

  /** Spawn one particle. Returns false when the batch is full (oldest is recycled). */
  emit(p) {
    let i;
    if (this.count >= this.capacity) {
      // recycle the particle closest to death
      let best = 0;
      let bestT = -1;
      const n = this.count;
      for (let k = 0; k < n; k += 7) {
        const t = this.age[k] / this.life[k];
        if (t > bestT) {
          bestT = t;
          best = k;
        }
      }
      i = best;
    } else {
      i = this.count++;
    }
    this.px[i] = p.x;
    this.py[i] = p.y;
    this.pz[i] = p.z;
    this.vx[i] = p.vx ?? 0;
    this.vy[i] = p.vy ?? 0;
    this.vz[i] = p.vz ?? 0;
    this.life[i] = Math.max(0.016, p.life ?? 1);
    this.age[i] = Math.min(this.life[i] * 0.98, p.age ?? 0);
    this.size0[i] = p.size0 ?? 0.5;
    this.size1[i] = p.size1 ?? this.size0[i];
    this.rot[i] = p.rot ?? 0;
    this.rotVel[i] = p.rotVel ?? 0;
    this.r0[i] = p.r0 ?? 1;
    this.g0[i] = p.g0 ?? 1;
    this.b0[i] = p.b0 ?? 1;
    this.r1[i] = p.r1 ?? this.r0[i];
    this.g1[i] = p.g1 ?? this.g0[i];
    this.b1[i] = p.b1 ?? this.b0[i];
    this.alpha[i] = p.alpha ?? 1;
    this.fadeIn[i] = p.fadeIn ?? 0.08;
    this.fadeOut[i] = p.fadeOut ?? 0.5;
    this.atlas[i] = p.atlas ?? 0;
    this.atlasCount[i] = p.atlasCount ?? 1;
    this.blend0[i] = p.blend0 ?? 1;
    this.blend1[i] = p.blend1 ?? this.blend0[i];
    this.lit0[i] = p.lit0 ?? 0;
    this.lit1[i] = p.lit1 ?? this.lit0[i];
    this.gravity[i] = p.gravity ?? 0;
    this.drag[i] = p.drag ?? 0;
    this.stretch[i] = p.stretch ?? 0;
    this.turb[i] = p.turb ?? 0;
    this.bounce[i] = p.bounce ?? 0;
    this.groundY[i] = p.groundY ?? -1e9;
    this.seed[i] = p.seed ?? Math.random() * 100;
    this.sizeEase[i] = p.sizeEase ?? 1;
    this.hover[i] = p.hover ?? (this.bounce[i] > 0 ? 0.35 : 0);
    return true;
  }

  _swapRemove(i, last) {
    if (i === last) return;
    for (const arr of this._fields) arr[i] = arr[last];
  }

  update(dt, camera) {
    const g = this.game;
    this.time += dt;
    const time = this.time;
    const { px, py, pz, vx, vy, vz, age, life, gravity, drag, turb, bounce, groundY, seed, rot, rotVel, size0, size1, hover, sizeEase } = this;
    let n = this.count;
    if (dt > 0) {
      for (let i = 0; i < n; ) {
        const a = age[i] + dt;
        if (a >= life[i]) {
          n--;
          this._swapRemove(i, n);
          continue;
        }
        age[i] = a;
        let x = vx[i], y = vy[i], z = vz[i];
        y -= gravity[i] * dt;
        const dr = drag[i];
        if (dr > 0) {
          const k = Math.max(0, 1 - dr * dt);
          x *= k;
          y *= k;
          z *= k;
        }
        const tb = turb[i];
        if (tb > 0) {
          const s = seed[i];
          x += Math.sin(py[i] * 1.3 + time * 1.7 + s) * tb * dt;
          z += Math.cos(px[i] * 1.1 + time * 1.3 + s * 1.7) * tb * dt;
          y += Math.sin(time * 2.3 + s * 2.1 + pz[i] * 0.7) * tb * 0.5 * dt;
        }
        let ny = py[i] + y * dt;
        const hv = hover[i];
        if (hv > 0) {
          // keep the sprite's lower edge out of the floor as it grows (no soft-particle depth available)
          const t = a / life[i];
          const e = sizeEase[i];
          const te = e === 1 ? t : e > 1 ? 1 - Math.pow(1 - t, e) : Math.pow(t, 1 / Math.max(e, 0.05));
          const size = size0[i] + (size1[i] - size0[i]) * te;
          const floor = groundY[i] + size * hv;
          if (ny < floor) {
            ny = floor;
            const bn = bounce[i];
            if (y < 0) {
              if (bn > 0) {
                y = -y * bn;
                x *= 0.65;
                z *= 0.65;
                rotVel[i] *= 0.5;
                if (y < 0.25) {
                  y = 0;
                  gravity[i] = 0;
                  x *= 0.4;
                  z *= 0.4;
                }
              } else {
                y = 0;
              }
            }
          }
        }
        vx[i] = x;
        vy[i] = y;
        vz[i] = z;
        px[i] += x * dt;
        py[i] = ny;
        pz[i] += z * dt;
        rot[i] += rotVel[i] * dt;
        i++;
      }
      this.count = n;
    }
    this.stats.alive = n;
    if (n > this.stats.peak) this.stats.peak = n;
    this.mesh.visible = n > 0;
    if (n === 0) {
      this.geometry.instanceCount = 0;
      return;
    }

    // --- sort back to front (packed integer keys, native typed-array sort → no comparator allocation)
    const m = camera.matrixWorldInverse.elements;
    const keys = this._keys;
    for (let i = 0; i < n; i++) {
      const depth = -(m[2] * px[i] + m[6] * py[i] + m[10] * pz[i] + m[14]);
      const q = Math.max(0, Math.min(1048575, ((2000 - depth) * 128) | 0));
      keys[i] = q * 65536 + i;
    }
    const view = keys.subarray(0, n);
    view.sort();

    // --- fill instance attributes
    const P = this.aPos.array, V = this.aVel.array, D = this.aData.array, C = this.aColor.array;
    const { r0, g0, b0, r1, g1, b1, alpha, fadeIn, fadeOut, atlas, atlasCount, blend0, blend1, lit0, lit1, stretch } = this;
    for (let k = 0; k < n; k++) {
      const key = keys[k];
      const i = key - Math.floor(key / 65536) * 65536;
      const t = age[i] / life[i];
      const e = sizeEase[i];
      const te = e === 1 ? t : e > 1 ? 1 - Math.pow(1 - t, e) : Math.pow(t, 1 / Math.max(e, 0.05));
      const size = size0[i] + (size1[i] - size0[i]) * te;
      const fi = fadeIn[i];
      let fin = fi > 0 ? Math.min(1, t / fi) : 1;
      fin = fin * fin * (3 - 2 * fin);
      const fo = fadeOut[i];
      let fout = fo > 0 ? Math.min(1, (1 - t) / fo) : 1;
      fout = fout * fout * (3 - 2 * fout);
      const a = alpha[i] * fin * fout;
      const o = k * 4;
      P[o] = px[i];
      P[o + 1] = py[i];
      P[o + 2] = pz[i];
      P[o + 3] = size;
      const st = stretch[i];
      let len = 0;
      if (st > 0) {
        const sp = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]);
        len = Math.max(size * 1.2, sp * st);
      }
      V[o] = vx[i];
      V[o + 1] = vy[i];
      V[o + 2] = vz[i];
      V[o + 3] = len;
      const ac = atlasCount[i];
      const cell = ac > 1 ? atlas[i] + Math.min(ac - 1, Math.floor(t * ac)) : atlas[i];
      const sd = seed[i];
      D[o] = rot[i];
      D[o + 1] = sd - Math.floor(sd) > 0.5 ? -(cell + 1) : cell; // mirrored half the time
      D[o + 2] = a;
      D[o + 3] = lit0[i] + (lit1[i] - lit0[i]) * t;
      C[o] = r0[i] + (r1[i] - r0[i]) * t;
      C[o + 1] = g0[i] + (g1[i] - g0[i]) * t;
      C[o + 2] = b0[i] + (b1[i] - b0[i]) * t;
      C[o + 3] = blend0[i] + (blend1[i] - blend0[i]) * t;
    }
    for (const attr of [this.aPos, this.aVel, this.aData, this.aColor]) {
      attr.clearUpdateRanges();
      attr.addUpdateRange(0, n * 4);
      attr.needsUpdate = true;
    }
    this.geometry.instanceCount = n;

    // --- lighting uniforms
    const render = g.render;
    this._sunView.copy(render.sunDirection).transformDirection(camera.matrixWorldInverse);
    this.uniforms.uSunView.value.copy(this._sunView);
    const sc = render.sunColor;
    const si = (render.sunIntensity ?? 4) / Math.PI;
    this.uniforms.uSunColor.value.set(sc.r * si, sc.g * si, sc.b * si);
    const fog = g.scene.fog;
    if (fog) {
      this.uniforms.uFogColor.value.copy(fog.color);
      this.uniforms.uFogDensity.value = fog.isFogExp2 ? fog.density : 0;
    }
  }

  clear() {
    this.count = 0;
    this.geometry.instanceCount = 0;
    this.mesh.visible = false;
  }
}
