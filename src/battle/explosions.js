// Explosions, fires, flak and smoke: one instanced billboard system with a procedural fireball shader.
// Each particle is a camera-facing quad with per-instance (age, life, size, seed, kind, colour). The
// fragment shader draws a noisy radial fireball whose core cools and whose smoke expands and fades, so a
// hull hit, a flak burst and a persistent fire are the same draw call with different parameters.
import * as THREE from "three";

const KIND = { hit: 0, flak: 1, fire: 2, smoke: 3, blast: 4 };

const vert = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iParam;   // age(0..1), size, seed, kind
attribute vec3 iColor;
varying vec2 vUv;
varying vec4 vParam;
varying vec3 vColor;
void main() {
  vUv = uv;
  vParam = iParam;
  vColor = iColor;
  float age = iParam.x;
  float kind = iParam.w;
  // growth curves per kind
  float grow = kind < 0.5 ? (0.35 + 1.05 * sqrt(age)) : kind < 1.5 ? (0.5 + 0.9 * sqrt(age)) : kind < 2.5 ? (0.85 + 0.15 * sin(iParam.z * 40.0 + age * 30.0)) : kind < 3.5 ? (0.6 + 1.6 * age) : (0.3 + 1.3 * sqrt(age));
  float size = iParam.y * grow;
  // billboard in view space
  vec4 centre = modelViewMatrix * vec4(iPos, 1.0);
  float ang = iParam.z * 6.2831 + (kind > 2.5 && kind < 3.5 ? age * 0.6 : 0.0);
  vec2 off = position.xy * size;
  off = vec2(off.x * cos(ang) - off.y * sin(ang), off.x * sin(ang) + off.y * cos(ang));
  centre.xy += off;
  gl_Position = projectionMatrix * centre;
}`;

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec4 vParam;
varying vec3 vColor;
// cheap value noise
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
void main() {
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;
  float age = vParam.x;
  float seed = vParam.z;
  float kind = vParam.w;
  float n = fbm(c * 3.5 + seed * 17.0 + age * 0.4);
  float edge = 0.62 + 0.38 * n;
  float shape = smoothstep(edge, edge - 0.5, r);
  vec3 col;
  float alpha;
  if (kind < 0.5 || kind > 3.5) {
    // hit / blast: white-hot core cooling to orange, then dark smoke
    float hot = smoothstep(0.9, 0.0, age);
    vec3 fire = mix(vec3(1.0, 0.45, 0.12), vec3(1.0, 0.95, 0.8), smoothstep(0.75, 0.0, r * (0.6 + age)) * hot);
    vec3 smoke = vec3(0.12, 0.1, 0.09);
    col = mix(fire, smoke, smoothstep(0.35, 1.0, age)) * vColor;
    alpha = shape * (1.0 - smoothstep(0.55, 1.0, age)) * (0.9 - 0.4 * age);
    col *= 1.0 + 1.4 * hot * (1.0 - r);
  } else if (kind < 1.5) {
    // flak: brief bright puff
    vec3 fire = mix(vec3(1.0, 0.6, 0.25), vec3(1.0, 1.0, 0.9), smoothstep(0.6, 0.0, r));
    col = fire * vColor * (0.8 + 0.9 * (1.0 - age));
    alpha = shape * (1.0 - age) * 0.7;
  } else if (kind < 2.5) {
    // fire: flickering flame, brighter core
    float fl = fbm(c * 5.0 + vec2(0.0, -age * 12.0) + seed * 9.0);
    vec3 fire = mix(vec3(1.0, 0.35, 0.08), vec3(1.0, 0.85, 0.5), smoothstep(0.7, 0.0, r) * fl);
    col = fire * vColor * 1.25;
    alpha = smoothstep(0.9 + 0.3 * fl, 0.1, r) * 0.7;
  } else {
    // smoke: dark, slow, fading
    col = vec3(0.09, 0.08, 0.08) * vColor;
    alpha = shape * (1.0 - age) * 0.55;
  }
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}`;

class ParticleLayer {
  constructor(scene, capacity, blending, renderOrder, name) {
    this.capacity = capacity;
    const geo = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    geo.index = quad.index;
    geo.attributes.position = quad.attributes.position;
    geo.attributes.uv = quad.attributes.uv;
    this.iPos = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity * 3),
      3,
    ).setUsage(THREE.DynamicDrawUsage);
    this.iParam = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity * 4),
      4,
    ).setUsage(THREE.DynamicDrawUsage);
    this.iColor = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity * 3),
      3,
    ).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("iPos", this.iPos);
    geo.setAttribute("iParam", this.iParam);
    geo.setAttribute("iColor", this.iColor);
    geo.instanceCount = 0;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending,
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
      this.iParam.setXYZW(i, p.age, p.size, p.seed, p.kind);
      this.iColor.setXYZ(i, p.color.r, p.color.g, p.color.b);
    }
    this.mesh.geometry.instanceCount = n;
    this.iPos.needsUpdate = true;
    this.iParam.needsUpdate = true;
    this.iColor.needsUpdate = true;
  }
}

export class Explosions {
  constructor(scene, capacity = 1200) {
    this.capacity = capacity;
    // additive layer for fire / hits / flak / blasts, normal-blend layer for smoke (which must darken)
    this.add = new ParticleLayer(
      scene,
      capacity,
      THREE.AdditiveBlending,
      12,
      "explosions",
    );
    this.smoke = new ParticleLayer(
      scene,
      Math.ceil(capacity * 0.8),
      THREE.NormalBlending,
      11,
      "smoke",
    );
    this.spawned = 0;
    this._tmp = new THREE.Vector3();
  }

  /**
   * @param pos world Vector3
   * @param opts { kind, size, life, color, ship, local, loop }
   */
  spawn(pos, opts = {}) {
    const kind = KIND[opts.kind || "hit"];
    const layer = kind === KIND.smoke ? this.smoke : this.add;
    if (layer.particles.length >= layer.capacity) return null;
    const p = {
      pos: pos.clone(),
      ship: opts.ship || null,
      local: opts.local ? opts.local.clone() : null,
      kind,
      size: opts.size || 40,
      life: opts.life || 1.2,
      age: 0,
      seed: Math.random(),
      color: opts.color || new THREE.Color(1, 1, 1),
      loop: !!opts.loop, // persistent fires re-seed instead of dying
    };
    layer.particles.push(p);
    this.spawned++;
    return p;
  }

  // a hull hit: flash + fireball + a couple of smoke puffs
  hit(pos, size = 40, ship = null, local = null) {
    this.spawn(pos, {
      kind: "hit",
      size,
      life: 0.9 + Math.random() * 0.5,
      ship,
      local,
    });
    this.spawn(pos, {
      kind: "smoke",
      size: size * 0.9,
      life: 2.5 + Math.random(),
      ship,
      local,
    });
    if (Math.random() < 0.5)
      this.spawn(pos, { kind: "flak", size: size * 0.5, life: 0.35 });
  }

  flak(pos, size = 60) {
    this.spawn(pos, { kind: "flak", size, life: 0.45 + Math.random() * 0.3 });
  }

  // persistent burning wound on a ship (local point), fire + smoke that keep re-seeding
  fire(ship, local, size = 60) {
    const w = this._tmp.copy(local).applyMatrix4(ship.matrix);
    this.spawn(w, { kind: "fire", size, life: 0.7, ship, local, loop: true });
    this.spawn(w, {
      kind: "smoke",
      size: size * 1.6,
      life: 3.5,
      ship,
      local,
      loop: true,
    });
  }

  blast(pos, size = 400) {
    for (let i = 0; i < 6; i++) {
      const o = new THREE.Vector3(
        (Math.random() - 0.5) * size * 0.4,
        (Math.random() - 0.5) * size * 0.4,
        (Math.random() - 0.5) * size * 0.4,
      );
      this.spawn(pos.clone().add(o), {
        kind: "blast",
        size: size * (0.6 + Math.random() * 0.6),
        life: 1.6 + Math.random() * 0.8,
      });
    }
    for (let i = 0; i < 8; i++) {
      const o = new THREE.Vector3(
        (Math.random() - 0.5) * size * 0.7,
        (Math.random() - 0.5) * size * 0.7,
        (Math.random() - 0.5) * size * 0.7,
      );
      this.spawn(pos.clone().add(o), {
        kind: "smoke",
        size: size * 0.9,
        life: 5 + Math.random() * 3,
      });
    }
  }

  _step(layer, dt) {
    const P = layer.particles;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.age += dt / p.life;
      if (p.age >= 1) {
        if (p.loop && (!p.ship || p.ship.alive)) {
          p.age = 0;
          p.seed = Math.random();
          if (p.kind === KIND.smoke) p.life = 3 + Math.random() * 2;
        } else {
          P[i] = P[P.length - 1];
          P.pop();
          continue;
        }
      }
      if (p.ship && p.local) {
        p.pos.copy(p.local).applyMatrix4(p.ship.matrix);
        if (p.kind === KIND.smoke) p.pos.y += p.age * p.size * 0.8; // smoke drifts off the hull
      }
    }
    layer.write();
  }

  update(dt) {
    this._step(this.add, dt);
    this._step(this.smoke, dt);
  }

  get alive() {
    return this.add.particles.length + this.smoke.particles.length;
  }
}

export { KIND as EXPLOSION_KIND };
