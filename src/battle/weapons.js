// Turbolaser / laser bolts: one instanced draw call of screen-space ribbons, pooled. A bolt flies from a
// hardpoint to a target point; on arrival it reports a hit (explosion, damage) through the callback.
//
// Rendering: every bolt is one quad whose two ends are the bolt's tail and head in world space. The vertex
// shader projects both ends, clips the segment against the near plane, and expands the quad perpendicular
// to the *projected* axis so bolts seen head-on still read as a round glow instead of an edge-on sliver.
// Distant bolts are held to a minimum projected width AND length (a thin streak, never a round pill), and
// the more a bolt had to be inflated the dimmer and more saturated it draws, so a 10 km exchange reads as
// fine red and teal streaks between the lines. The fragment shader draws a tapered capsule in that ribbon
// space: a saturated coloured halo, a thin tail, and a small hot core that whitens only at the head tip.
import * as THREE from "three";

const _p = new THREE.Vector3();
const _size = new THREE.Vector2();
const EMPTY = Object.freeze({});

// halo half-width as a multiple of the bolt radius (the visible core is ~radius wide)
const HALO = 2.4;
// screen-space minimums (pixels): half-width of the halo and length of the streak
const MIN_HALF_WIDTH_PX = 0.9;
const MIN_LENGTH_PX = 34;

export const BOLT_COLORS = {
  republic: new THREE.Color(1.0, 0.22, 0.12), // red turbolasers
  separatist: new THREE.Color(0.25, 1.0, 0.75), // teal-green
  fighterRepublic: new THREE.Color(1.0, 0.3, 0.2),
  fighterSeparatist: new THREE.Color(0.9, 0.35, 0.2),
  jedi: new THREE.Color(0.3, 1.0, 0.35),
  ion: new THREE.Color(0.45, 0.7, 1.0),
};

const BOLT_KIND = { turbo: 0, light: 1, fighter: 2 };

const vert = /* glsl */ `
attribute vec3 iA;       // tail (world)
attribute vec3 iB;       // head (world)
attribute vec4 iParam;   // radius (m), seed, kind, intensity
attribute vec3 iColor;
uniform float time;
uniform vec2 resolution;
varying vec3 vColor;
varying vec3 vRib;       // (across, along) * w, w  -> screen-linear coordinates after the divide
varying vec3 vSpan;      // tail half-width, projected body length, head half-width (aspect-corrected NDC)
varying vec2 vGain;      // brightness, white-core weight
void main() {
  vColor = iColor;
  vec4 a = modelViewMatrix * vec4(iA, 1.0);
  vec4 b = modelViewMatrix * vec4(iB, 1.0);
  // near plane distance from the projection matrix; clip the segment against z = -near
  float near = projectionMatrix[3][2] / (projectionMatrix[2][2] - 1.0);
  bool aBehind = a.z > -near;
  bool bBehind = b.z > -near;
  if (aBehind && bBehind) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    vRib = vec3(0.0, 0.0, 1.0);
    vSpan = vec3(1.0);
    vGain = vec2(0.0);
    return;
  }
  if (aBehind) a = mix(a, b, (-near - a.z) / (b.z - a.z));
  if (bBehind) b = mix(b, a, (-near - b.z) / (a.z - b.z));
  vec4 ca = projectionMatrix * a;
  vec4 cb = projectionMatrix * b;
  float aspect = projectionMatrix[1][1] / projectionMatrix[0][0];
  vec2 asp = vec2(aspect, 1.0);
  vec2 na = ca.xy / ca.w * asp;
  vec2 nb = cb.xy / cb.w * asp;
  vec2 d = nb - na;
  float lenN = length(d);
  vec2 dir = lenN > 1e-6 ? d / lenN : vec2(0.0, 1.0);
  vec2 perp = vec2(-dir.y, dir.x);
  // perspective half-width of the halo at each end, never thinner than a fraction of a pixel so distant
  // bolts stay readable (film language: the exchange must be legible from between the lines)
  float px = 2.0 / resolution.y;                 // one pixel in aspect-corrected NDC
  float halo = iParam.x * ${HALO.toFixed(2)};
  float minW = ${MIN_HALF_WIDTH_PX.toFixed(2)} * px;
  float waT = halo * projectionMatrix[1][1] / ca.w;
  float wbT = halo * projectionMatrix[1][1] / cb.w;
  float wa = max(waT, minW);
  float wb = max(wbT, minW);
  // minimum projected length: a far bolt is a streak, not a pill. Only the part of the shortness that
  // comes from distance is made up (a bolt seen head-on is foreshortened and stays a dot): compare the
  // projected length with what the bolt would measure seen broadside at the same distance.
  float wMid = 0.5 * (ca.w + cb.w);
  float lenWorld = length(iB - iA);
  float lenBroad = lenWorld * projectionMatrix[1][1] / wMid;
  float fore = lenBroad > 1e-6 ? clamp(lenN / lenBroad, 0.0, 1.0) : 1.0;
  // the minimum scales with the bolt's real length: a heavy turbolaser (~100 m) gets the full streak, a
  // fighter laser (~25 m) a quarter of it, so the capital exchange stays the dominant graphic
  float minLen = ${MIN_LENGTH_PX.toFixed(1)} * px * sqrt(fore) * clamp(lenWorld / 100.0, 0.25, 1.0);
  float lenT = lenN;
  if (lenN < minLen) {
    // grow the streak backwards from the head (the head marks where the bolt really is)
    na = nb - dir * minLen;
    lenN = minLen;
  }
  // when width or length had to be inflated the bolt is far away: dim it and drop the white core so
  // distant bolts read as saturated red / teal streaks rather than white confetti
  float ratio = min(min(1.0, (waT + wbT) / (wa + wb)), lenT / max(lenN, 1e-6));
  float flicker = 0.9 + 0.1 * sin(time * 41.0 + iParam.y * 97.0) * sin(time * 67.0 + iParam.y * 13.0);
  vGain = vec2((0.62 + 0.38 * ratio) * iParam.w * flicker, 0.1 + 0.9 * smoothstep(0.2, 0.85, ratio));
  float isHead = step(0.0, position.y);
  float across = position.x * 2.0;
  vec2 base = mix(na, nb, isHead);
  float w = mix(wa, wb, isHead);
  // extend both ends by their half-width for the rounded caps
  vec2 p = (base + perp * (across * w) + dir * ((isHead * 2.0 - 1.0) * w)) / asp;
  float cw = mix(ca.w, cb.w, isHead);
  float cz = mix(ca.z, cb.z, isHead);
  gl_Position = vec4(p * cw, cz, cw);
  vRib = vec3(across, isHead, 1.0) * cw;
  vSpan = vec3(wa, lenN, wb);
}`;

const frag = /* glsl */ `
precision highp float;
varying vec3 vColor;
varying vec3 vRib;
varying vec3 vSpan;
varying vec2 vGain;
void main() {
  vec2 rib = vRib.xy / vRib.z;             // across -1..1, along 0..1 over the whole quad (caps included)
  float wa = vSpan.x;
  float lenN = vSpan.y;
  float wb = vSpan.z;
  float total = wa + lenN + wb;
  float s = rib.y * total;                 // screen units along the quad
  float t = lenN > 1e-6 ? clamp((s - wa) / lenN, 0.0, 1.0) : 1.0; // 0 tail .. 1 head along the body
  float wHere = mix(wa, wb, rib.y);
  // tapered profile: thin tail, full width from ~3/4 of the length, rounded head
  float taper = 0.22 + 0.78 * smoothstep(0.0, 0.75, t);
  float dx = rib.x * wHere;
  float dy = max(0.0, max(wa - s, s - (wa + lenN)));
  float d = length(vec2(dx, dy)) / (wHere * taper);
  if (d >= 1.0) discard;
  float halo = (1.0 - d) * (1.0 - d);
  // hot core: narrow, and it only whitens toward the head tip so red bolts stay red along their length
  float core = smoothstep(0.24, 0.0, d) * vGain.y;
  float tip = smoothstep(0.55, 1.0, t);
  vec3 coreCol = mix(vColor * 1.6, mix(vColor, vec3(1.0), 0.5), tip);
  float g = mix(0.4, 1.0, smoothstep(0.0, 0.85, t)) * vGain.x;
  vec3 col = (vColor * (halo * 1.15 + 0.35 * (1.0 - vGain.y) * (1.0 - d)) + coreCol * core) * g;
  gl_FragColor = vec4(col, 1.0);
}`;

export class Bolts {
  constructor(scene, capacity = 1500, opts = {}) {
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
    this.iA = dyn(3);
    this.iB = dyn(3);
    this.iParam = dyn(4);
    this.iColor = dyn(3);
    geo.setAttribute("iA", this.iA);
    geo.setAttribute("iB", this.iB);
    geo.setAttribute("iParam", this.iParam);
    geo.setAttribute("iColor", this.iColor);
    geo.instanceCount = 0;
    this.uniforms = {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(1280, 720) },
    };
    this.mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      // the ribbon's winding depends on the bolt's screen direction, so both faces must draw
      side: THREE.DoubleSide,
      fog: false,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = opts.renderOrder ?? 10;
    this.mesh.name = "bolts";
    // the ribbon's minimum pixel width needs the real drawing-buffer size, read at render time
    this.mesh.onBeforeRender = (renderer) => {
      renderer.getDrawingBufferSize(_size);
      this.uniforms.resolution.value.copy(_size);
    };
    scene.add(this.mesh);
    // kept for callers that reach for the instanced meshes by name
    this.core = this.mesh;
    this.glow = this.mesh;
    this.bolts = [];
    this._pool = [];
    this.onHit = null; // (bolt) => void
    this.onFire = null; // (bolt) => void
    this.fired = 0;
    this.time = 0;
  }

  _alloc() {
    return (
      this._pool.pop() || {
        from: new THREE.Vector3(),
        to: new THREE.Vector3(),
        dir: new THREE.Vector3(),
        speed: 0,
        length: 0,
        radius: 0,
        color: null,
        damage: 0,
        target: null,
        side: "",
        kind: "",
        t: 0,
        dist: 0,
        miss: false,
        seed: 0,
        intensity: 1,
        muzzle: true,
        // set by the choreography after fire(); reset here so a recycled record never carries them over
        capital: false,
        heavy: false,
        fighterTarget: null,
      }
    );
  }

  /**
   * @param from Vector3, to Vector3 (world)
   * @param opts { color: Color, speed, length, radius, damage, target, side, kind, intensity, muzzle }
   * @param target, side, kind (optional, positional) override the same fields of `opts`, so hot callers
   *   can pass a shared spec object plus the per-shot fields without building an options object per shot:
   *   `bolts.fire(from, to, BOLT_SPECS.heavy.republic, targetShip, "republic", "turbo")`.
   * Returns the bolt record (from, to, dir, speed, length, radius, color, damage, target, side, kind, t,
   * dist, miss, capital, heavy, fighterTarget) or null when the pool is full. The record is recycled after
   * the hit callback.
   */
  fire(from, to, opts = EMPTY, target, side, kind) {
    if (this.bolts.length >= this.capacity) return null;
    const b = this._alloc();
    b.from.copy(from);
    b.to.copy(to);
    b.dir.copy(to).sub(from);
    b.speed = opts.speed || 2600;
    b.length = opts.length || 60;
    b.radius = opts.radius || 2.2;
    b.color = opts.color || BOLT_COLORS.republic;
    b.damage = opts.damage || 1;
    b.target = target !== undefined ? target : opts.target || null;
    b.side = side || opts.side || "republic";
    b.kind = kind || opts.kind || "turbo";
    b.intensity = opts.intensity || 1;
    b.muzzle = opts.muzzle !== false;
    b.t = 0;
    b.miss = false;
    b.capital = false;
    b.heavy = false;
    b.fighterTarget = null;
    b.seed = Math.random();
    b.dist = b.dir.length();
    if (b.dist > 1e-6) b.dir.divideScalar(b.dist);
    else b.dir.set(0, 0, -1);
    this.bolts.push(b);
    this.fired++;
    if (this.onFire) this.onFire(b);
    return b;
  }

  /**
   * Muzzle flash at the barrel for every shot: a short coloured flash sprite through the explosion system.
   * Bolts fired with `{ muzzle: false }` skip it.
   */
  attachMuzzleFlash(explosions, opts = {}) {
    const scale = opts.scale ?? 1;
    const fast = typeof explosions.flash === "function";
    this.onFire = (b) => {
      if (!b.muzzle) return;
      const size = b.radius * 5 * scale;
      const life = 0.09 + Math.random() * 0.05;
      // positional fast path (no options object per shot) when the explosion system offers it
      if (fast) explosions.flash(b.from, size, life, b.color);
      else
        explosions.spawn(b.from, {
          kind: "flash",
          size,
          life,
          color: b.color,
        });
    };
    return this;
  }

  update(dt) {
    this.time += dt;
    this.uniforms.time.value = this.time;
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.t += b.speed * dt;
      if (b.t >= b.dist) {
        if (this.onHit) this.onHit(b);
        this.bolts[i] = this.bolts[this.bolts.length - 1];
        this.bolts.pop();
        b.target = null;
        this._pool.push(b);
      }
    }
    let n = 0;
    for (const b of this.bolts) {
      // the ribbon trails the head by the bolt length and grows out of the barrel when just fired
      const head = Math.min(b.t, b.dist);
      const tail = Math.max(0, head - b.length);
      _p.copy(b.from).addScaledVector(b.dir, tail);
      this.iA.setXYZ(n, _p.x, _p.y, _p.z);
      _p.copy(b.from).addScaledVector(b.dir, head);
      this.iB.setXYZ(n, _p.x, _p.y, _p.z);
      this.iParam.setXYZW(
        n,
        b.radius,
        b.seed,
        BOLT_KIND[b.kind] ?? 0,
        b.intensity,
      );
      this.iColor.setXYZ(n, b.color.r, b.color.g, b.color.b);
      n++;
    }
    this.mesh.geometry.instanceCount = n;
    this.iA.needsUpdate = true;
    this.iB.needsUpdate = true;
    this.iParam.needsUpdate = true;
    this.iColor.needsUpdate = true;
  }

  get alive() {
    return this.bolts.length;
  }
}
