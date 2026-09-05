// Scorch decals: one instanced draw call of hull-oriented dark marks stamped under persistent fires and
// heavy hits. Each decal is a quad lying in the hull's tangent plane (oriented by the outward normal),
// riding its ship's matrix every frame like the fire particles. It multiplies the frame buffer (a scorch
// darkens whatever light the plating receives, so the mark reads on a sunlit cream deck and disappears
// on the shadow side or against space) and never fights the hull for depth: the vertex shader scales the
// quad toward the camera by a little so the surface it sits on cannot clip it, while hulls in front still
// occlude it. Decals face-cull by their normal, so the far side of a ship does not show through.
import * as THREE from "three";

const vert = /* glsl */ `
attribute vec3 iPos;     // world
attribute vec3 iNormal;  // world, outward
attribute vec4 iParam;   // size (m), fade 0..1, seed, kind (0 fire, 1 hit)
varying vec2 vUv;
varying vec4 vParam;
varying float vFacing;
void main() {
  vUv = uv;
  vParam = iParam;
  vec3 n = normalize(iNormal);
  vec3 t = normalize(cross(n, abs(n.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 b = cross(n, t);
  float ang = iParam.z * 6.2831;
  float ca = cos(ang);
  float sa = sin(ang);
  vec2 q = vec2(position.x * ca - position.y * sa, position.x * sa + position.y * ca) * iParam.x;
  vec3 wp = iPos + t * q.x + b * q.y;
  vec3 cc = cameraPosition - iPos;
  float dist = max(length(cc), 1e-3);
  vFacing = dot(n, cc) / dist;
  // similarity about the camera: same screen footprint, depth pulled toward the viewer
  float bias = min(iParam.x * 0.14 + 1.5, dist * 0.5);
  wp = cameraPosition + (wp - cameraPosition) * (1.0 - bias / dist);
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}`;

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec4 vParam;
varying float vFacing;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.07; a *= 0.5; } return v; }
void main() {
  if (vFacing < 0.03) discard;
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;
  if (r > 1.0) discard;
  float seed = vParam.z;
  float kind = vParam.w;
  float ang = atan(c.y, c.x);
  // ragged outer edge with radial streaks (soot blown outward from the burn)
  float streak = fbm(vec2(ang * 2.2 + seed * 31.0, r * 3.0 + seed * 7.0));
  float grain = fbm(c * 7.0 + seed * 13.0);
  float edge = 0.55 + 0.45 * streak;
  float shape = smoothstep(edge, edge * 0.35, r);
  // hits: a tight black core with spatter; fires: a wide burn with the darkest centre
  float core = kind > 0.5 ? smoothstep(0.6, 0.08, r) : smoothstep(0.9, 0.12, r);
  float spatter = kind > 0.5 ? smoothstep(0.6, 0.78, grain) * smoothstep(1.0, 0.4, r) * 0.8 : 0.0;
  float a = clamp(shape * (0.7 + 0.3 * grain) + core * 0.6 + spatter, 0.0, 1.0);
  a *= vParam.y * smoothstep(0.03, 0.25, vFacing);
  // multiplied onto the lit hull: a soot core at about a quarter of the plating's brightness, dark brown
  // around it, and a heat-discoloured rim (faint orange-grey) where the paint only baked
  vec3 rim = vec3(0.86, 0.72, 0.58);
  vec3 brown = vec3(0.36, 0.24, 0.16);
  vec3 sootCol = vec3(0.2, 0.18, 0.16);
  float inner = smoothstep(0.15, 0.7, core);
  vec3 dark = mix(mix(rim, brown, smoothstep(0.0, 0.5, core + spatter * 0.5)), sootCol, inner);
  gl_FragColor = vec4(mix(vec3(1.0), dark, a), 1.0);
}`;

const _v = new THREE.Vector3();

export class Scorch {
  /**
   * @param scene
   * @param capacity decals alive at once (fires hold theirs; hit decals are evicted oldest-first)
   */
  constructor(scene, capacity = 400, opts = {}) {
    this.capacity = capacity;
    const geo = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    geo.index = quad.index;
    geo.attributes.position = quad.attributes.position;
    geo.attributes.uv = quad.attributes.uv;
    const dyn = (n) =>
      new THREE.InstancedBufferAttribute(
        new Float32Array(capacity * n),
        n,
      ).setUsage(THREE.DynamicDrawUsage);
    this.iPos = dyn(3);
    this.iNormal = dyn(3);
    this.iParam = dyn(4);
    geo.setAttribute("iPos", this.iPos);
    geo.setAttribute("iNormal", this.iNormal);
    geo.setAttribute("iParam", this.iParam);
    geo.instanceCount = 0;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      // multiply: dst x src (three's MultiplyBlending preset insists on premultiplied alpha)
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.ZeroFactor,
      blendDst: THREE.SrcColorFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = opts.renderOrder ?? 6;
    this.mesh.name = "scorch";
    scene.add(this.mesh);
    this.list = [];
    this._pool = [];
    this.stamped = 0;
  }

  _alloc() {
    return (
      this._pool.pop() || {
        ship: null,
        local: new THREE.Vector3(),
        normal: new THREE.Vector3(0, 1, 0), // ship-local outward normal
        size: 10,
        seed: 0,
        kind: 1,
        hold: false,
        age: 0,
        life: 90,
        fade: 1,
      }
    );
  }

  // the released decal furthest through its fade (held decals are never evicted)
  _evictable() {
    let best = -1;
    let k = -1;
    for (let i = 0; i < this.list.length; i++) {
      const d = this.list[i];
      if (d.hold) continue;
      const t = d.age / d.life;
      if (t > k) {
        k = t;
        best = i;
      }
    }
    return best;
  }

  // a released hit decal on the ship whose centre lies within a fraction of the sizes of the point (the
  // mark a repeated hit on the same spot should deepen rather than double)
  _overlapping(ship, local, size) {
    for (const d of this.list) {
      if (d.ship !== ship || d.hold || d.kind !== 1) continue;
      const reach = 0.4 * Math.max(size, d.size);
      if (d.local.distanceToSquared(local) < reach * reach) return d;
    }
    return null;
  }

  /**
   * Stamp a decal on a ship at a local point.
   * @param ship Ship (matrix, alive), local Vector3 (ship space), normal Vector3 (ship space, outward)
   * @param size decal width (m)
   * @param opts { kind: 0 fire | 1 hit, life: seconds until fully faded (default 90), hold: keep at
   *   full strength until release() is called (persistent fires) }
   * A hit decal landing on an existing hit mark refreshes and widens that mark instead of adding one.
   * Returns the record or null when the pool is full of held decals.
   */
  stamp(ship, local, normal, size, opts = {}) {
    let d;
    if ((opts.kind ?? 1) === 1 && !opts.hold) {
      d = this._overlapping(ship, local, size);
      if (d) {
        // each repeat widens the mark by 12 %, up to twice the hit size
        const grown = Math.max(d.size, size) * 1.12;
        d.size = Math.max(d.size, Math.min(grown, size * 2));
        d.age = 0;
        d.life = Math.max(d.life, opts.life || 90);
        d.fade = 1;
        this.stamped++;
        return d;
      }
    }
    if (this.list.length < this.capacity) {
      d = this._alloc();
      this.list.push(d);
    } else {
      const i = this._evictable();
      if (i < 0) return null;
      d = this.list[i];
    }
    d.ship = ship;
    d.local.copy(local);
    d.normal.copy(normal);
    if (d.normal.lengthSq() < 1e-8) d.normal.set(0, 1, 0);
    else d.normal.normalize();
    d.size = size;
    d.seed = Math.random();
    d.kind = opts.kind ?? 1;
    d.hold = !!opts.hold;
    d.age = 0;
    d.life = opts.life || 90;
    d.fade = 1;
    this.stamped++;
    return d;
  }

  // let a held decal start fading (over `life` seconds)
  release(d, life = 75) {
    if (!d || !this.list.includes(d)) return;
    d.hold = false;
    d.age = 0;
    d.life = life;
  }

  // drop every decal on a ship at once (hulk retired)
  removeShip(ship) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--)
      if (L[i].ship === ship) {
        const d = L[i];
        L[i] = L[L.length - 1];
        L.pop();
        d.ship = null;
        this._pool.push(d);
      }
  }

  count(ship) {
    let n = 0;
    for (const d of this.list) if (d.ship === ship) n++;
    return n;
  }

  update(dt) {
    const L = this.list;
    let n = 0;
    for (let i = L.length - 1; i >= 0; i--) {
      const d = L[i];
      if (!d.hold) d.age += dt;
      if (d.age >= d.life || !d.ship || d.ship.alive === false) {
        L[i] = L[L.length - 1];
        L.pop();
        d.ship = null;
        this._pool.push(d);
      }
    }
    const cap = this.capacity;
    for (let i = 0; i < L.length && n < cap; i++) {
      const d = L[i];
      const k = d.age / d.life;
      // full strength for the first 60 %, then a smooth fade
      d.fade = d.hold ? 1 : 1 - THREE.MathUtils.smoothstep(k, 0.6, 1.0);
      _v.copy(d.local).applyMatrix4(d.ship.matrix);
      this.iPos.setXYZ(n, _v.x, _v.y, _v.z);
      _v.copy(d.normal).transformDirection(d.ship.matrix);
      this.iNormal.setXYZ(n, _v.x, _v.y, _v.z);
      this.iParam.setXYZW(n, d.size, d.fade, d.seed, d.kind);
      n++;
    }
    this.mesh.geometry.instanceCount = n;
    this.iPos.needsUpdate = true;
    this.iNormal.needsUpdate = true;
    this.iParam.needsUpdate = true;
  }

  get alive() {
    return this.list.length;
  }
}
