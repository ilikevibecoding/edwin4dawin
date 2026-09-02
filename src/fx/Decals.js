import * as THREE from 'three';

/**
 * Pooled instanced decals: oriented quads (tangent frame built from the surface normal + random rotation)
 * offset 5 mm along the normal, one draw call for the whole pool. Oldest are recycled when the pool is
 * full; decals fade out after `lifetime` seconds. Premultiplied blending lets a decal both darken (holes,
 * scorch) and add highlights (metal dent rim) in one pass.
 */

const VERT = /* glsl */ `
attribute vec4 aPos;     // xyz, size
attribute vec4 aNormal;  // xyz surface normal, w rotation
attribute vec4 aData;    // atlas cell, alpha, lit, unused
attribute vec4 aColor;   // rgb tint
uniform vec2 uGrid;
uniform float uFogDensity;
varying vec2 vUv;
varying vec3 vColor;
varying vec3 vData;
varying vec3 vNormal;
varying float vFog;

void main() {
  vec3 n = normalize(aNormal.xyz);
  vec3 ref = abs(n.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t = normalize(cross(ref, n));
  vec3 b = cross(n, t);
  float c = cos(aNormal.w);
  float s = sin(aNormal.w);
  vec2 rc = vec2(c * position.x - s * position.y, s * position.x + c * position.y) * aPos.w;
  vec3 world = aPos.xyz + t * rc.x + b * rc.y + n * 0.005;
  vec4 mv = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;
  float cell = aData.x;
  float col = mod(cell, uGrid.x);
  float row = (uGrid.y - 1.0) - floor(cell / uGrid.x);
  vUv = (uv + vec2(col, row)) / uGrid;
  vColor = aColor.rgb;
  vData = aData.yzw;
  vNormal = n;
  float depth = -mv.z;
  vFog = 1.0 - exp(-uFogDensity * uFogDensity * depth * depth);
}
`;

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uAtlas;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uAmbient;
uniform vec3 uFogColor;
varying vec2 vUv;
varying vec3 vColor;
varying vec3 vData;
varying vec3 vNormal;
varying float vFog;

void main() {
  vec4 tex = texture2D(uAtlas, vUv);
  float alpha = tex.a * vData.x;
  if (alpha < 0.003) discard;
  vec3 col = tex.rgb * vColor;
  float ndl = max(0.0, dot(normalize(vNormal), uSunDir));
  vec3 light = uAmbient + uSunColor * ndl;
  col *= mix(vec3(1.0), light, vData.y);
  vec3 rgb = col * alpha;
  rgb = mix(rgb, uFogColor * alpha, vFog);
  gl_FragColor = vec4(rgb, alpha);
}
`;

export class Decals {
  constructor(game, atlas, { capacity = 250, lifetime = 60, fadeTime = 8 } = {}) {
    this.game = game;
    this.capacity = capacity;
    this.lifetime = lifetime;
    this.fadeTime = fadeTime;
    this.count = 0;
    this.next = 0;
    this.born = new Float32Array(capacity);
    this.baseAlpha = new Float32Array(capacity);
    this.time = 0;

    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    geo.setAttribute('uv', base.attributes.uv);
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aNormal = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aData = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aPos', this.aPos);
    geo.setAttribute('aNormal', this.aNormal);
    geo.setAttribute('aData', this.aData);
    geo.setAttribute('aColor', this.aColor);
    geo.instanceCount = 0;
    this.geometry = geo;

    const fog = game.scene.fog;
    this.uniforms = {
      uAtlas: { value: atlas.map },
      uGrid: { value: new THREE.Vector2(atlas.cols, atlas.rows) },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Vector3(1.2, 1.1, 1.0) },
      uAmbient: { value: new THREE.Vector3(0.38, 0.42, 0.5) },
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
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.name = 'Decals';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    this.mesh.visible = false;
  }

  /**
   * Add a decal. `size` is the quad edge in meters. Returns the slot index.
   */
  add(point, normal, cell, size, { rotation = Math.random() * Math.PI * 2, alpha = 1, lit = 1, r = 1, g = 1, b = 1, sizeJitter = 0.2 } = {}) {
    const i = this.next;
    this.next = (this.next + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
    const s = size * (1 + (Math.random() * 2 - 1) * sizeJitter);
    this.aPos.setXYZW(i, point.x, point.y, point.z, s);
    this.aNormal.setXYZW(i, normal.x, normal.y, normal.z, rotation);
    this.aData.setXYZW(i, cell, alpha, lit, 0);
    this.aColor.setXYZW(i, r, g, b, 1);
    this.born[i] = this.time;
    this.baseAlpha[i] = alpha;
    this.aPos.needsUpdate = true;
    this.aNormal.needsUpdate = true;
    this.aData.needsUpdate = true;
    this.aColor.needsUpdate = true;
    this.geometry.instanceCount = this.count;
    this.mesh.visible = this.count > 0;
    return i;
  }

  update(dt) {
    if (this.count === 0) return;
    this.time += dt;
    const render = this.game.render;
    this.uniforms.uSunDir.value.copy(render.sunDirection);
    const sc = render.sunColor;
    const si = (render.sunIntensity ?? 4) / Math.PI;
    this.uniforms.uSunColor.value.set(sc.r * si, sc.g * si, sc.b * si);
    const fog = this.game.scene.fog;
    if (fog) {
      this.uniforms.uFogColor.value.copy(fog.color);
      this.uniforms.uFogDensity.value = fog.isFogExp2 ? fog.density : 0;
    }
    if (dt <= 0) return;
    // fade the old ones (cheap: 250 entries)
    const D = this.aData.array;
    let changed = false;
    for (let i = 0; i < this.count; i++) {
      const age = this.time - this.born[i];
      if (age > this.lifetime) {
        const a = this.baseAlpha[i] * Math.max(0, 1 - (age - this.lifetime) / this.fadeTime);
        if (D[i * 4 + 1] !== a) {
          D[i * 4 + 1] = a;
          changed = true;
        }
      }
    }
    if (changed) this.aData.needsUpdate = true;
  }
}
