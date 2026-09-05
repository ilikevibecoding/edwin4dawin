// Explosions, fires, flak, sparks, shock rings, shield ripples and smoke: two instanced billboard draw
// calls (additive for everything that glows, normal blending for smoke, which must darken) driven by one
// procedural shader. Each particle is a quad with per-instance (age, life, size, seed, kind, colour, axis):
// hits and blasts are noisy fireballs that cool from white to orange; fires are flame licks anchored to the
// hull and stretched along a per-fire drift direction; smoke puffs are sun-shaded discs that drift, grow
// and fade; sparks are tiny stretched streaks with velocity; rings and shield discs are world-oriented
// quads. Persistent fires are emitters that keep their licks alive and stream a plume of smoke puffs.
import * as THREE from "three";

const KIND = {
  hit: 0,
  flak: 1,
  fire: 2,
  smoke: 3,
  blast: 4,
  flash: 5,
  spark: 6,
  ring: 7,
  shield: 8,
  glow: 9,
};

export const SHIELD_COLOR = new THREE.Color(0.5, 0.78, 1.0);

const _w = new THREE.Vector3();
const _w2 = new THREE.Vector3();
const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _nl = new THREE.Vector3();
const _l = new THREE.Vector3();
const _l2 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _inv = new THREE.Matrix4();
const WHITE = new THREE.Color(1, 1, 1);

function randDir(out) {
  // uniform direction on the sphere
  const z = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return out.set(Math.cos(a) * r, Math.sin(a) * r, z);
}

const vert = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iParam;   // age(0..1), size (m), seed, kind
attribute vec3 iColor;
attribute vec4 iAxis;    // xyz: world direction (drift / velocity / disc normal), w: extra (growth or stretch)
uniform vec3 sunDir;
uniform float time;
varying vec2 vUv;
varying vec4 vParam;
varying vec3 vColor;
varying vec3 vSunV;
varying float vExtra;
void main() {
  vUv = uv;
  vParam = iParam;
  vColor = iColor;
  vExtra = iAxis.w;
  vSunV = normalize((viewMatrix * vec4(sunDir, 0.0)).xyz);
  float age = iParam.x;
  float seed = iParam.z;
  int k = int(iParam.w + 0.5);
  float size = iParam.y;
  if (k == 7 || k == 8) {
    // shock ring / shield disc: a quad lying in the plane perpendicular to the axis (world space)
    vec3 n = normalize(iAxis.xyz);
    vec3 t = normalize(cross(n, abs(n.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 b = cross(n, t);
    float grow = k == 7 ? 0.3 + 1.3 * pow(age, 0.55) : 1.0;
    vec3 wp = iPos + (position.x * t + position.y * b) * size * grow;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(wp, 1.0);
    return;
  }
  // growth curves per kind
  float grow = 1.0;
  if (k == 0) grow = 0.35 + 1.05 * sqrt(age);
  else if (k == 1) grow = 0.5 + 0.7 * pow(age, 0.4);
  else if (k == 2) grow = 0.92 + 0.08 * sin(time * 11.0 + seed * 40.0) * sin(time * 6.3 + seed * 17.0);
  else if (k == 3) grow = mix(1.0, iAxis.w, 1.0 - (1.0 - age) * (1.0 - age));
  else if (k == 4) grow = 0.3 + 1.3 * sqrt(age);
  else if (k == 5) grow = 1.0 + 0.5 * age;
  else if (k == 6) grow = 1.0 - 0.4 * age;
  else if (k == 9) grow = 1.0 + 0.08 * sin(time * 9.0 + seed * 50.0);
  size *= grow;
  vec4 centre = modelViewMatrix * vec4(iPos, 1.0);
  vec2 off;
  if (k == 2 || k == 6) {
    // flame lick / spark: align the quad's +y with the screen projection of the axis; flames are anchored at
    // their base, sparks centred; both foreshorten when the axis points at the camera
    vec3 dv = mat3(viewMatrix) * iAxis.xyz;
    float l = length(dv.xy);
    vec2 d2 = l > 1e-4 ? dv.xy / l : vec2(0.0, 1.0);
    float stretch = mix(1.0, iAxis.w, clamp(l, 0.0, 1.0));
    vec2 q = k == 2 ? vec2(position.x, (position.y + 0.5) * stretch) : vec2(position.x, position.y * stretch);
    off = vec2(q.x * d2.y + q.y * d2.x, -q.x * d2.x + q.y * d2.y) * size;
  } else {
    float ang = seed * 6.2831 + (k == 3 ? age * 0.5 * (seed > 0.5 ? 1.0 : -1.0) : 0.0);
    vec2 p = position.xy * size;
    off = vec2(p.x * cos(ang) - p.y * sin(ang), p.x * sin(ang) + p.y * cos(ang));
  }
  centre.xy += off;
  gl_Position = projectionMatrix * centre;
}`;

const frag = /* glsl */ `
precision highp float;
uniform float time;
varying vec2 vUv;
varying vec4 vParam;
varying vec3 vColor;
varying vec3 vSunV;
varying float vExtra;
// cheap value noise
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
// hex tiling: offset to the nearest cell centre and the hex distance from it (0 centre .. 0.5 border)
vec2 hexCell(vec2 p) {
  const vec2 r = vec2(1.0, 1.7320508);
  vec2 h = r * 0.5;
  vec2 a = mod(p, r) - h;
  vec2 b = mod(p - h, r) - h;
  return dot(a, a) < dot(b, b) ? a : b;
}
float hexDist(vec2 p) { p = abs(p); return max(dot(p, vec2(0.5, 0.8660254)), p.x); }
void main() {
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;
  float age = vParam.x;
  float seed = vParam.z;
  int k = int(vParam.w + 0.5);
  vec3 col = vec3(0.0);
  float alpha = 0.0;
  if (k == 0 || k == 4) {
    // hit / blast fireball: white-hot core cooling to orange then dull red, boiling noisy edge
    float n = fbm(c * 3.2 + seed * 17.0 + vec2(age * 0.6, -age * 1.1));
    float edge = 0.52 + 0.48 * n;
    float shape = smoothstep(edge, edge - 0.5, r);
    float hot = smoothstep(0.35, 0.0, age);
    float boil = fbm(c * 6.5 - seed * 9.0 + vec2(-age * 1.4, age * 2.2));
    vec3 fire = mix(vec3(1.0, 0.3, 0.05), vec3(1.0, 0.66, 0.22), boil);
    float coreMask = smoothstep(0.75, 0.0, r * (0.6 + age * 1.6));
    fire = mix(fire, vec3(1.0, 0.94, 0.82), coreMask * hot);
    float cool = smoothstep(0.3, 0.95, age);
    fire *= mix(1.0, 0.3, cool);
    fire = mix(fire, fire * vec3(1.0, 0.55, 0.35), cool);
    col = fire * vColor * (1.0 + 0.6 * hot * coreMask);
    // blasts stack several fireballs, so each one is more translucent than a single hit
    alpha = shape * (1.0 - smoothstep(0.45, 1.0, age)) * (k == 4 ? 0.62 : 0.9);
  } else if (k == 1) {
    // flak: sparkly burst with short rays and a bright core, modest peak
    float a = atan(c.y, c.x);
    float rays = 0.5 + 0.5 * noise(vec2(cos(a), sin(a)) * 2.0 + seed * 31.0 + age * 0.5);
    float burst = smoothstep(1.0, 0.15, r / (0.55 + 0.45 * rays));
    float core = smoothstep(0.32, 0.0, r);
    float fade = (1.0 - age) * (1.0 - age);
    float twinkle = 0.75 + 0.25 * sin(seed * 80.0 + age * 60.0);
    vec3 fire = mix(vec3(1.0, 0.5, 0.18), vec3(1.0, 0.93, 0.75), core);
    col = fire * vColor * (0.7 + 0.9 * fade);
    alpha = (burst * 0.55 + core * 0.9) * fade * twinkle;
  } else if (k == 2) {
    // flame lick: base at v = 0, ragged tip, colour from white-yellow at the root to dull red at the tip
    float fy = vUv.y;
    float n = fbm(vec2(c.x * 4.5 + seed * 13.0, fy * 2.6 - time * 2.2 + seed * 7.0));
    float width = mix(0.5, 0.1, fy);
    float edgeNoise = (n - 0.5) * (0.25 + 0.5 * fy);
    float body = smoothstep(width, width * 0.2, abs(c.x) + edgeNoise);
    float tip = 1.0 - smoothstep(0.55 + 0.35 * n, 1.0, fy);
    float root = smoothstep(0.0, 0.06, fy);
    float lick = body * tip * root;
    vec3 fire = mix(vec3(1.0, 0.76, 0.36), vec3(1.0, 0.36, 0.06), smoothstep(0.0, 0.6, fy + (n - 0.5) * 0.3));
    fire = mix(fire, vec3(0.5, 0.09, 0.02), smoothstep(0.55, 1.0, fy));
    float io = smoothstep(0.0, 0.12, age) * (1.0 - smoothstep(0.7, 1.0, age));
    col = fire * vColor * 1.1;
    alpha = lick * io * 0.8;
  } else if (k == 3) {
    // smoke: dark, sun-shaded disc with internal density, a warm underlight and an ember glow while young
    float n = fbm(c * 3.0 + seed * 23.0 + vec2(age * 0.25, age * 0.35));
    float edge = 0.5 + 0.5 * n;
    float shape = smoothstep(edge, edge - 0.55, r);
    float dens = 0.45 + 0.55 * fbm(c * 5.5 - seed * 11.0 + age * 0.4);
    vec3 N = normalize(vec3(c * 2.0, sqrt(max(0.0, 1.0 - r * r)) * 0.9 + 0.25));
    float lit = clamp(dot(N, vSunV), 0.0, 1.0);
    vec3 base = vec3(0.115, 0.11, 0.105) * vColor;
    col = base * (0.15 + 0.9 * lit * lit + 0.2 * lit) * (0.6 + 0.6 * dens);
    col += vec3(0.03, 0.02, 0.012) * clamp(-N.y, 0.0, 1.0);
    float ember = max(0.0, 1.0 - r);
    col += vec3(0.9, 0.35, 0.08) * smoothstep(0.15, 0.0, age) * ember * ember * 0.3;
    float fadeIn = smoothstep(0.0, 0.1, age);
    alpha = shape * fadeIn * (1.0 - smoothstep(0.5, 1.0, age)) * 0.75 * (0.6 + 0.4 * dens);
  } else if (k == 5) {
    // flash: fast white pop with a faint four-point glint
    float g = pow(max(0.0, 1.0 - r), 2.2);
    float a = atan(c.y, c.x);
    float star = pow(abs(cos(a * 2.0 + seed * 3.0)), 16.0) * smoothstep(0.9, 0.05, r) * 0.5;
    float fade = (1.0 - age) * (1.0 - age);
    col = vec3(1.0, 0.97, 0.92) * vColor * 1.8;
    alpha = (g + star) * fade;
  } else if (k == 6) {
    // spark: tiny streak (stretched along its velocity in the vertex stage), white to orange
    float d = length(c * 2.0);
    float g = pow(max(0.0, 1.0 - d), 1.4);
    vec3 sc = mix(vec3(1.0, 0.95, 0.82), vec3(1.0, 0.42, 0.1), smoothstep(0.05, 0.7, age));
    col = sc * vColor * 1.8;
    alpha = g * (1.0 - age * age) * (1.0 - smoothstep(0.85, 1.0, age));
  } else if (k == 7) {
    // shock ring: thin expanding band (the quad itself grows), warm then bluish-white
    float th = mix(0.14, 0.06, age);
    float q = (r - 0.8) / th;
    float band = exp(-q * q);
    vec3 rc = mix(vec3(1.0, 0.75, 0.45), vec3(0.75, 0.85, 1.0), age);
    col = rc * vColor * 1.7;
    alpha = (band * 0.9 + smoothstep(0.8, 0.0, r) * 0.12) * (1.0 - age);
  } else if (k == 8) {
    // shield ripple: translucent hex-cell disc, a ring travelling outward from the impact, fading
    vec2 cell = hexCell(c * 2.0 * 5.5);
    float hd = hexDist(cell);
    float lines = smoothstep(0.36, 0.46, hd);
    float q = (r - age * 1.05) / 0.18;
    float ripple = exp(-q * q);
    float disc = 1.0 - smoothstep(0.75, 1.0, r);
    float centreFlash = smoothstep(0.45, 0.0, r) * (1.0 - smoothstep(0.0, 0.5, age));
    float fade = 1.0 - age;
    col = vColor * 1.5;
    alpha = disc * ((lines * 0.7 + 0.1) * (ripple * 0.9 + 0.2 * fade) + centreFlash * 0.7) * fade;
  } else {
    // glow: soft pulsing orange core of a persistent fire (kept modest: several fires stack on a hulk)
    float g = pow(max(0.0, 1.0 - r), 3.0);
    float pulse = 0.85 + 0.15 * sin(time * 9.0 + seed * 50.0) * sin(time * 4.7 + seed * 21.0);
    col = vec3(1.0, 0.44, 0.1) * vColor * 0.9 * pulse;
    alpha = g * 0.55;
  }
  if (alpha < 0.008) discard;
  gl_FragColor = vec4(col, min(alpha, 1.0));
}`;

class ParticleLayer {
  constructor(scene, capacity, blending, renderOrder, name, uniforms) {
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
    this.iParam = dyn(4);
    this.iColor = dyn(3);
    this.iAxis = dyn(4);
    geo.setAttribute("iPos", this.iPos);
    geo.setAttribute("iParam", this.iParam);
    geo.setAttribute("iColor", this.iColor);
    geo.setAttribute("iAxis", this.iAxis);
    geo.instanceCount = 0;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending,
      side: THREE.DoubleSide, // rings and shield discs are world-oriented and seen from either side
      fog: false,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = renderOrder;
    this.mesh.name = name;
    scene.add(this.mesh);
    this.particles = [];
  }
  write() {
    const P = this.particles;
    const n = Math.min(P.length, this.capacity);
    for (let i = 0; i < n; i++) {
      const p = P[i];
      this.iPos.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
      // particles waiting on a delay are written as zero-size quads
      if (p.age < 0) this.iParam.setXYZW(i, 0, 0, p.seed, p.kind);
      else this.iParam.setXYZW(i, p.age, p.size, p.seed, p.kind);
      this.iColor.setXYZ(i, p.color.r, p.color.g, p.color.b);
      this.iAxis.setXYZW(i, p.axis.x, p.axis.y, p.axis.z, p.extra);
    }
    this.mesh.geometry.instanceCount = n;
    this.iPos.needsUpdate = true;
    this.iParam.needsUpdate = true;
    this.iColor.needsUpdate = true;
    this.iAxis.needsUpdate = true;
  }
}

function newParticle() {
  return {
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    axis: new THREE.Vector3(0, 1, 0),
    local: new THREE.Vector3(),
    color: new THREE.Color(1, 1, 1),
    ship: null,
    owner: null, // fire emitter that spawned this plume puff
    attached: false,
    hasVel: false,
    kind: 0,
    size: 1,
    life: 1,
    age: 0,
    seed: 0,
    loop: false,
    extra: 1,
    drag: 0,
  };
}

export class Explosions {
  /**
   * @param scene
   * @param capacity additive particles (fire, hits, flak, sparks, rings); the smoke layer gets 1.5x that
   *   (plumes on ~180 fires plus blast and hit smoke; smoke quads are cheap, the plumes are the look)
   * @param opts { sun } battle sun uniforms (makeBattleSun()) so smoke is lit from the right side
   */
  constructor(scene, capacity = 1200, opts = {}) {
    this.capacity = capacity;
    this.uniforms = {
      time: { value: 0 },
      sunDir: {
        value: opts.sun
          ? opts.sun.dir.value
          : new THREE.Vector3(-0.35, 0.55, 0.76).normalize(),
      },
    };
    // additive layer for everything that glows, normal-blend layer for smoke (which must darken)
    this.add = new ParticleLayer(
      scene,
      capacity,
      THREE.AdditiveBlending,
      11,
      "explosions",
      this.uniforms,
    );
    this.smoke = new ParticleLayer(
      scene,
      Math.round(capacity * 1.5),
      THREE.NormalBlending,
      12,
      "smoke",
      this.uniforms,
    );
    this.spawned = 0;
    this.time = 0;
    this.fires = []; // persistent fire emitters
    this.debris = null; // optional Debris system (effects/debris.js)
    this._debrisAuto = true;
    this._pool = [];
    this._extents = new Map();
    this._tmp = new THREE.Vector3();
  }

  /**
   * Link a Debris system: blasts and heavy hits throw fragments through it. It is stepped from update()
   * unless { autoUpdate: false } is passed (then call debris.update(dt) yourself).
   */
  attachDebris(debris, opts = {}) {
    this.debris = debris;
    this._debrisAuto = opts.autoUpdate !== false;
    return debris;
  }

  /**
   * @param pos world Vector3
   * @param opts { kind, size, life, color, ship, local, loop, vel, axis, extra, delay, drag }
   *   kind: hit | flak | fire | smoke | blast | flash | spark | ring | shield | glow
   *   ship + local: the particle rides the ship (local point); vel: free particle velocity (m/s);
   *   axis: drift direction (fire), velocity direction (spark) or disc normal (ring, shield);
   *   extra: growth ratio over life (smoke) or stretch (fire, spark); delay: seconds before it appears.
   */
  spawn(pos, opts = {}) {
    const kind =
      typeof opts.kind === "number" ? opts.kind : (KIND[opts.kind] ?? KIND.hit);
    const layer = kind === KIND.smoke ? this.smoke : this.add;
    if (layer.particles.length >= layer.capacity) return null;
    const p = this._pool.pop() || newParticle();
    p.pos.copy(pos);
    p.ship = opts.ship || null;
    p.owner = null;
    p.attached = !!(opts.ship && opts.local);
    if (p.attached) p.local.copy(opts.local);
    p.kind = kind;
    p.size = opts.size || 40;
    p.life = opts.life || 1.2;
    p.age = opts.delay ? -opts.delay / p.life : 0;
    p.seed = Math.random();
    p.color.copy(opts.color || WHITE);
    p.loop = !!opts.loop;
    p.hasVel = !!opts.vel;
    if (p.hasVel) p.vel.copy(opts.vel);
    if (opts.axis) p.axis.copy(opts.axis);
    else p.axis.set(0, 1, 0);
    p.extra = opts.extra ?? (kind === KIND.smoke ? 2.0 : 1.0);
    p.drag = opts.drag || 0;
    layer.particles.push(p);
    this.spawned++;
    return p;
  }

  _room(layer, fraction = 0.8) {
    return layer.particles.length < layer.capacity * fraction;
  }

  // hull bounding box of a model (from its surface samples) for outward-normal estimates
  _extentsOf(model) {
    let e = this._extents.get(model);
    if (e) return e;
    const s = model.surface;
    const c = new THREE.Vector3();
    const inv2 = new THREE.Vector3();
    if (s && s.length >= 9) {
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < s.length; i += 3)
        for (let k = 0; k < 3; k++) {
          if (s[i + k] < min[k]) min[k] = s[i + k];
          if (s[i + k] > max[k]) max[k] = s[i + k];
        }
      c.set(
        (min[0] + max[0]) / 2,
        (min[1] + max[1]) / 2,
        (min[2] + max[2]) / 2,
      );
      const h = (k) => Math.max(10, (max[k] - min[k]) / 2);
      inv2.set(1 / h(0) ** 2, 1 / h(1) ** 2, 1 / h(2) ** 2);
    } else {
      const L = model.length || 500;
      inv2.set(1 / (L * 0.22) ** 2, 1 / (L * 0.08) ** 2, 1 / (L * 0.5) ** 2);
    }
    e = { c, inv2 };
    this._extents.set(model, e);
    return e;
  }

  // outward direction (local space) at a local hull point: the normal of the hull's bounding ellipsoid
  _outwardLocal(ship, local, out) {
    const e = this._extentsOf(ship.model);
    out.copy(local).sub(e.c);
    out.set(out.x * e.inv2.x, out.y * e.inv2.y, out.z * e.inv2.z);
    if (out.lengthSq() < 1e-14) out.set(0, 1, 0);
    else out.normalize();
    return out;
  }

  /**
   * World-space outward hull normal at a ship-local point (bounding-ellipsoid estimate), for shieldHit()
   * and hit() callers that have no surface normal. Writes into `out` and returns it.
   */
  hullNormal(ship, local, out) {
    return this._outwardLocal(ship, local, out).transformDirection(ship.matrix);
  }

  /**
   * A hull hit: white flash, orange fireball with a noisy edge, sparks flying outward, a dark smoke puff
   * that lingers and drifts; heavy hits may throw a fragment or two. Sizes: fighter ~14, light ~28,
   * heavy ~55 m. `normal` (world, optional) is the hull normal at the impact (e.g. -bolt.dir); without it
   * the outward direction is estimated from the ship's hull ellipsoid.
   */
  hit(pos, size = 40, ship = null, local = null, normal = null) {
    const attached = !!(ship && local);
    if (normal) _n.copy(normal).normalize();
    else if (attached)
      this._outwardLocal(ship, local, _n).transformDirection(ship.matrix);
    else if (ship) _n.copy(pos).sub(ship.position).normalize();
    else _n.set(0, 1, 0);
    // lift the fireball off the hull so the depth test does not slice it in half
    const lift = size * 0.35;
    _w.copy(pos).addScaledVector(_n, lift);
    if (attached) {
      _nl.copy(_n).applyQuaternion(_q.copy(ship.quaternion).invert());
      _l.copy(local).addScaledVector(_nl, lift);
    }
    const sh = attached ? ship : null;
    const lo = attached ? _l : null;
    // the fireball is the one essential particle; everything else yields when the layer runs full
    this.spawn(_w, {
      kind: "hit",
      size,
      life: 0.8 + Math.random() * 0.5,
      ship: sh,
      local: lo,
    });
    if (this._room(this.add, 0.92))
      this.spawn(_w, {
        kind: "flash",
        size: size * 1.1,
        life: 0.14 + Math.random() * 0.06,
        ship: sh,
        local: lo,
      });
    if (size > 40 && this._room(this.add, 0.9)) {
      // a second, smaller fireball rolling out a moment later
      _w2.copy(_w).addScaledVector(_n, size * 0.25);
      _w2.x += (Math.random() - 0.5) * size * 0.3;
      _w2.y += (Math.random() - 0.5) * size * 0.3;
      _w2.z += (Math.random() - 0.5) * size * 0.3;
      if (attached) _l2.copy(_w2).applyMatrix4(_inv.copy(ship.matrix).invert());
      this.spawn(_w2, {
        kind: "hit",
        size: size * 0.7,
        life: 0.7 + Math.random() * 0.4,
        delay: 0.12,
        ship: sh,
        local: attached ? _l2 : null,
      });
    }
    // sparks: a few tiny bright streaks flying outward (skipped when the layer is filling up)
    if (this._room(this.add, 0.8)) {
      const ns = size < 20 ? 3 : size < 40 ? 4 : 6;
      for (let i = 0; i < ns; i++) {
        randDir(_v).multiplyScalar(0.9).add(_n).normalize();
        const speed = (20 + size * 1.3) * (0.5 + Math.random());
        _w2.copy(_v).multiplyScalar(speed);
        if (ship) _w2.add(ship.velocity);
        this.spawn(pos, {
          kind: "spark",
          size: Math.max(1.2, size * 0.07),
          life: 0.5 + Math.random() * 0.6,
          vel: _w2,
          axis: _v,
          extra: 3.5,
          drag: 0.6,
        });
      }
    }
    // smoke: drifts off along the normal, lags a moving ship. Heavy hits always smoke; small ones only
    // sometimes, and none once the smoke layer is 75 % full (plumes and blasts matter more)
    const smokeChance = size >= 40 ? 1 : size >= 20 ? 0.6 : 0.25;
    if (this._room(this.smoke, 0.75) && Math.random() < smokeChance) {
      _v.copy(_n).multiplyScalar(6 + size * 0.25);
      if (ship) _v.addScaledVector(ship.velocity, 0.7);
      _v.x += (Math.random() - 0.5) * size * 0.15;
      _v.y += (Math.random() - 0.5) * size * 0.15;
      _v.z += (Math.random() - 0.5) * size * 0.15;
      this.spawn(_w, {
        kind: "smoke",
        size: size * 0.9,
        life: 2 + size * 0.04 + Math.random() * 1.5,
        vel: _v,
        extra: 2.2,
        drag: 0.25,
        delay: 0.1,
      });
    }
    // heavy hits knock a plate or two loose; keep half the debris pool free for detonations
    if (
      this.debris &&
      size >= 45 &&
      Math.random() < 0.2 &&
      this.debris.alive < this.debris.capacity * 0.5
    )
      this.debris.burst(
        pos,
        1 + Math.floor(Math.random() * 2),
        30 + size * 0.6,
        {
          size: size * 0.05,
          dir: _n,
          velocity: ship ? ship.velocity : null,
          life: [8, 18],
          heat: 0.5,
          evict: false,
        },
      );
  }

  /**
   * Shield ripple: a translucent hex-pattern disc oriented along the hull normal, a ring travelling out
   * from the impact, plus a small flash. Optional ship + local make it ride the ship for its short life.
   */
  shieldHit(pos, normal, size = 60, color = null, ship = null, local = null) {
    _n.copy(normal).normalize();
    if (_n.lengthSq() < 0.5) _n.set(0, 1, 0);
    const lift = size * 0.03;
    _w.copy(pos).addScaledVector(_n, lift);
    const attached = !!(ship && local);
    if (attached) {
      _nl.copy(_n).applyQuaternion(_q.copy(ship.quaternion).invert());
      _l.copy(local).addScaledVector(_nl, lift);
    }
    const col = color || SHIELD_COLOR;
    this.spawn(_w, {
      kind: "shield",
      size,
      life: 0.5 + Math.random() * 0.15,
      axis: _n,
      color: col,
      ship: attached ? ship : null,
      local: attached ? _l : null,
    });
    this.spawn(_w, {
      kind: "flash",
      size: size * 0.45,
      life: 0.1,
      color: col,
      ship: attached ? ship : null,
      local: attached ? _l : null,
    });
  }

  // flak: a brief sparkly burst with a bright core, a few sparks and a tiny smoke puff
  flak(pos, size = 60) {
    this.spawn(pos, { kind: "flak", size, life: 0.4 + Math.random() * 0.25 });
    if (this._room(this.add, 0.85)) {
      const ns = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < ns; i++) {
        randDir(_v);
        _w2.copy(_v).multiplyScalar(size * 0.9 * (0.4 + Math.random() * 0.6));
        this.spawn(pos, {
          kind: "spark",
          size: Math.max(1, size * 0.06),
          life: 0.35 + Math.random() * 0.35,
          vel: _w2,
          axis: _v,
          extra: 3,
          drag: 0.8,
        });
      }
    }
    if (this._room(this.smoke, 0.6)) {
      randDir(_v).multiplyScalar(size * 0.08);
      this.spawn(pos, {
        kind: "smoke",
        size: size * 0.6,
        life: 1.6 + Math.random(),
        extra: 1.8,
        delay: 0.15,
        vel: _v,
      });
    }
  }

  /**
   * Persistent burning wound on a ship (local point): layered flame licks and a glow core anchored to the
   * hull, stretched along a per-fire drift direction (outward from the hull, leaning aft), and a plume of
   * smoke puffs streaming that way, 200-400 m long for big fires. Returns the emitter.
   */
  fire(ship, local, size = 60) {
    const F = {
      ship,
      local: local.clone(),
      size,
      drift: new THREE.Vector3(),
      driftW: new THREE.Vector3(),
      world: new THREE.Vector3(),
      parts: [],
      // plume: puff speed x life ~ 250 m for a 60 m fire, ~450 m for a 150 m one
      speed: Math.min(60, 22 + size * 0.35),
      life: 4.5 + Math.min(size, 160) * 0.02,
      timer: Math.random() * 0.4,
      puffs: 0, // plume puffs alive
      maxPuffs: 7,
      dead: false,
    };
    // outward from the hull with an aft lean (+z local) and a little randomness
    this._outwardLocal(ship, local, F.drift);
    F.drift.z += 0.55;
    F.drift.x += (Math.random() - 0.5) * 0.3;
    F.drift.y += (Math.random() - 0.5) * 0.2;
    F.drift.normalize();
    F.world.copy(F.local).applyMatrix4(ship.matrix);
    F.driftW.copy(F.drift).transformDirection(ship.matrix);
    const lick = (scale, lift, life, stretch) => {
      _l.copy(F.local).addScaledVector(F.drift, size * lift);
      _w.copy(_l).applyMatrix4(ship.matrix);
      const p = this.spawn(_w, {
        kind: "fire",
        size: size * scale,
        life,
        ship,
        local: _l,
        loop: true,
        axis: F.driftW,
        extra: stretch,
      });
      if (p) {
        p.age = Math.random(); // desynchronise the licks
        F.parts.push(p);
      }
    };
    // three layered licks while the layer has room, one when many ships are burning; the licks stay
    // compact (about a fire-size long) so the plume, not the flame, is the long part of the wound
    lick(0.95, 0.08, 0.55 + Math.random() * 0.25, 1.45);
    if (this._room(this.add, 0.5)) {
      lick(0.7, 0.05, 0.45 + Math.random() * 0.2, 1.25);
      lick(0.5, 0.02, 0.35 + Math.random() * 0.2, 1.1);
    }
    _l.copy(F.local).addScaledVector(F.drift, size * 0.2);
    _w.copy(_l).applyMatrix4(ship.matrix);
    const glow = this.spawn(_w, {
      kind: "glow",
      size: size * 1.1,
      life: 1,
      ship,
      local: _l,
      loop: true,
    });
    if (glow) F.parts.push(glow);
    this.fires.push(F);
    return F;
  }

  // put out every fire on a ship (its licks die at the end of their current cycle, the plume drifts away)
  extinguish(ship) {
    for (const F of this.fires) if (F.ship === ship) F.dead = true;
  }

  /**
   * Big detonation, staged: white flash, expanding fireballs (some rolling out a little later), a thin
   * shock ring, sparks, heavy smoke and, when a Debris system is attached, a burst of tumbling fragments.
   * opts { normal: ring orientation (world), velocity: base velocity of the debris/smoke, debris: count or
   * false }
   */
  blast(pos, size = 400, opts = {}) {
    const base = opts.velocity || null;
    this.spawn(pos, { kind: "flash", size: size * 0.85, life: 0.25 });
    if (opts.normal) _n.copy(opts.normal).normalize();
    else randDir(_n);
    this.spawn(pos, {
      kind: "ring",
      size: size * 1.1,
      life: 1.1,
      axis: _n,
      delay: 0.04,
    });
    // the main expanding fireball, two more beside it, then three rolling out around it a little later
    // (spread apart so they do not all stack into white)
    for (let i = 0; i < 6; i++) {
      const late = i >= 3;
      const off =
        i === 0 ? 0 : size * (late ? 0.45 : 0.3) * (0.4 + 0.6 * Math.random());
      randDir(_v).multiplyScalar(off);
      _w.copy(pos).add(_v);
      if (base) _w.addScaledVector(base, late ? 0.3 : 0.05);
      this.spawn(_w, {
        kind: "blast",
        size:
          size *
          (i === 0
            ? 0.9
            : late
              ? 0.5 + Math.random() * 0.4
              : 0.4 + Math.random() * 0.25),
        life:
          i === 0
            ? 1.7
            : late
              ? 1.8 + Math.random() * 0.8
              : 1.3 + Math.random() * 0.5,
        delay: late ? 0.2 + Math.random() * 0.6 : Math.random() * 0.06,
      });
    }
    const ns = 18;
    for (let i = 0; i < ns; i++) {
      randDir(_v);
      _w2.copy(_v).multiplyScalar(size * 0.9 * (0.35 + Math.random() * 0.65));
      if (base) _w2.add(base);
      this.spawn(pos, {
        kind: "spark",
        size: Math.max(2, size * 0.02),
        life: 1.2 + Math.random(),
        vel: _w2,
        axis: _v,
        extra: 4,
        drag: 0.35,
        delay: Math.random() * 0.1,
      });
    }
    for (let i = 0; i < 10; i++) {
      randDir(_v);
      _w.copy(pos).addScaledVector(_v, size * 0.35 * Math.random());
      _w2.copy(_v).multiplyScalar(size * 0.09 * (0.5 + Math.random()));
      if (base) _w2.addScaledVector(base, 0.8);
      this.spawn(_w, {
        kind: "smoke",
        size: size * 0.7,
        life: 6 + Math.random() * 4,
        vel: _w2,
        extra: 2.2,
        drag: 0.15,
        delay: 0.4 + Math.random() * 0.8,
      });
    }
    if (this.debris && opts.debris !== false)
      this.debris.burst(pos, opts.debris || 90, 25 + size * 0.15, {
        size: Math.max(2, size * 0.02),
        radius: size * 0.2,
        velocity: base,
      });
  }

  _updateFires(dt) {
    if (!this.fires.length) return;
    // plume budget: fires share ~55 % of the smoke layer in proportion to their size, so the big fires
    // of a badly damaged ship keep long plumes while small ones get a wisp; spawning slows as the layer
    // fills and stops at 90 % so blasts always find room
    const occ = this.smoke.particles.length / this.smoke.capacity;
    let sizeSum = 0;
    for (const F of this.fires) sizeSum += F.size;
    const perSize = (0.55 * this.smoke.capacity) / Math.max(1, sizeSum);
    const throttle = 1 + (2 * Math.max(0, occ - 0.6)) / 0.4;
    const plumes = occ < 0.9;
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const F = this.fires[i];
      if (F.dead || F.ship.alive === false) {
        for (const p of F.parts) p.loop = false;
        this.fires[i] = this.fires[this.fires.length - 1];
        this.fires.pop();
        continue;
      }
      F.world.copy(F.local).applyMatrix4(F.ship.matrix);
      F.driftW.copy(F.drift).transformDirection(F.ship.matrix);
      for (const p of F.parts) p.axis.copy(F.driftW);
      F.timer -= dt;
      if (F.timer <= 0) {
        const maxPuffs = Math.max(2, Math.min(8, Math.round(F.size * perSize)));
        F.maxPuffs = maxPuffs;
        F.timer = (F.life / maxPuffs) * throttle * (0.7 + 0.6 * Math.random());
        if (!plumes || F.puffs >= maxPuffs) continue;
        // release the puff downstream of the licks so it does not smother the flame
        _w.copy(F.world).addScaledVector(F.driftW, F.size * 0.6);
        _v.copy(F.driftW)
          .multiplyScalar(F.speed * (0.8 + 0.4 * Math.random()))
          .addScaledVector(F.ship.velocity, 0.35);
        _v.x += (Math.random() - 0.5) * F.speed * 0.25;
        _v.y += (Math.random() - 0.5) * F.speed * 0.25;
        _v.z += (Math.random() - 0.5) * F.speed * 0.25;
        const p = this.spawn(_w, {
          kind: "smoke",
          size: F.size * 0.8,
          life: F.life * (0.8 + 0.4 * Math.random()),
          vel: _v,
          extra: 3.0,
          drag: 0.12,
        });
        if (p) {
          p.owner = F;
          F.puffs++;
        }
      }
    }
  }

  _step(layer, dt) {
    const P = layer.particles;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.age += dt / p.life;
      if (p.age >= 1) {
        if (p.loop && (!p.ship || p.ship.alive !== false)) {
          p.age = 0;
          p.seed = Math.random();
        } else {
          P[i] = P[P.length - 1];
          P.pop();
          p.ship = null;
          if (p.owner) {
            p.owner.puffs--;
            p.owner = null;
          }
          this._pool.push(p);
          continue;
        }
      }
      if (p.age < 0) continue; // waiting on its delay
      if (p.attached) p.pos.copy(p.local).applyMatrix4(p.ship.matrix);
      else if (p.hasVel) {
        p.pos.addScaledVector(p.vel, dt);
        if (p.drag > 0) p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      }
    }
    layer.write();
  }

  update(dt) {
    this.time += dt;
    this.uniforms.time.value = this.time;
    this._updateFires(dt);
    this._step(this.add, dt);
    this._step(this.smoke, dt);
    if (this.debris && this._debrisAuto) this.debris.update(dt);
  }

  get alive() {
    return this.add.particles.length + this.smoke.particles.length;
  }

  get counts() {
    return {
      additive: this.add.particles.length,
      smoke: this.smoke.particles.length,
      fires: this.fires.length,
      debris: this.debris ? this.debris.alive : 0,
    };
  }
}

export { KIND as EXPLOSION_KIND };
