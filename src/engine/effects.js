import * as THREE from 'three';
import { C, FINISH } from '../lego/palette.js';
import { glow, mat } from '../lego/materials.js';
import { boxGeo, cylGeo, sphereGeo, PLATE, BRICK } from '../lego/parts.js';
import { RNG } from './rng.js';
import { clamp, ease } from './util.js';

/*
 * Shared action effects. Everything is pooled and instanced: a dogfight can
 * have a hundred bolts in the air and still render on a software rasteriser.
 */

// ------------------------------------------------------------------- bolts

const boltGeo = (() => {
  const g = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
  g.rotateX(Math.PI / 2);   // length along +Z
  return g;
})();

/** Pooled laser bolts. Colour per pool: red for Imperial, green/red for rebels. */
export class BoltPool {
  constructor(scene, {
    max = 96, color = C.transRed, core = 0xffe8e8, radius = 0.14, length = 3.2, speed = 220,
  } = {}) {
    this.max = max; this.speed = speed; this.radius = radius; this.length = length;
    this.items = [];
    this.free = [];

    const m = glow(color, 0.85);
    const cm = glow(core, 1.0);
    this.halo = new THREE.InstancedMesh(boltGeo, m, max);
    this.coreMesh = new THREE.InstancedMesh(boltGeo, cm, max);
    for (const im of [this.halo, this.coreMesh]) {
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.frustumCulled = false;
      im.count = max;
      scene.add(im);
    }
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3();
    this._p = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < max; i++) {
      this.items.push({ alive: false, pos: new THREE.Vector3(), dir: new THREE.Vector3(0, 0, 1), life: 0, ttl: 1 });
      this.free.push(i);
    }
    this._hide();
  }

  _hide() {
    this._m.makeScale(0, 0, 0);
    for (let i = 0; i < this.max; i++) {
      this.halo.setMatrixAt(i, this._m);
      this.coreMesh.setMatrixAt(i, this._m);
    }
    this.halo.instanceMatrix.needsUpdate = true;
    this.coreMesh.instanceMatrix.needsUpdate = true;
  }

  fire(from, dir, { ttl = 1.4, speed = this.speed } = {}) {
    const i = this.free.pop();
    if (i === undefined) return null;
    const it = this.items[i];
    it.alive = true;
    it.pos.copy(from);
    it.dir.copy(dir).normalize();
    it.life = 0; it.ttl = ttl; it.speed = speed;
    return i;
  }

  /** Fire at a target point with a little spread. */
  fireAt(from, target, opts = {}) {
    const d = new THREE.Vector3().subVectors(target, from).normalize();
    if (opts.spread) {
      d.x += (Math.random() - 0.5) * opts.spread;
      d.y += (Math.random() - 0.5) * opts.spread;
      d.z += (Math.random() - 0.5) * opts.spread;
      d.normalize();
    }
    return this.fire(from, d, opts);
  }

  update(dt) {
    let any = false;
    for (let i = 0; i < this.max; i++) {
      const it = this.items[i];
      if (!it.alive) continue;
      any = true;
      it.life += dt;
      if (it.life >= it.ttl) {
        it.alive = false;
        this.free.push(i);
        this._m.makeScale(0, 0, 0);
      } else {
        it.pos.addScaledVector(it.dir, it.speed * dt);
        this._q.setFromUnitVectors(this._up, it.dir);
        const fade = 1 - clamp((it.life - it.ttl * 0.8) / (it.ttl * 0.2), 0, 1);
        this._s.set(this.radius * fade, this.radius * fade, this.length);
        this._m.compose(it.pos, this._q, this._s);
        this.halo.setMatrixAt(i, this._m);
        this._s.set(this.radius * 0.42 * fade, this.radius * 0.42 * fade, this.length * 0.94);
        this._m.compose(it.pos, this._q, this._s);
      }
      this.coreMesh.setMatrixAt(i, this._m);
      if (!it.alive) this.halo.setMatrixAt(i, this._m);
    }
    if (any) {
      this.halo.instanceMatrix.needsUpdate = true;
      this.coreMesh.instanceMatrix.needsUpdate = true;
    }
  }
}

// -------------------------------------------------------------- brick burst

const BURST_SHAPES = [
  [2, 1, 1], [1, 1, 1], [2, 2, 1], [3, 1, 1], [1, 1, 2], [2, 1, 2],
];

/**
 * The LEGO way to blow something up: it comes apart into loose bricks.
 * One InstancedMesh per pool, simple ballistics, deterministic.
 */
export class BrickBurst {
  constructor(scene, { max = 260, colors = [C.lightBluishGray, C.darkBluishGray, C.white], seed = 7 } = {}) {
    this.max = max;
    this.rng = new RNG(seed);
    this.items = [];
    this.free = [];
    const geo = boxGeo(1, PLATE * 2.5, 1, 0.04);
    const material = mat(0xffffff).clone();
    material.vertexColors = false;
    this.mesh = new THREE.InstancedMesh(geo, material, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    scene.add(this.mesh);
    this.colors = colors.map((c) => new THREE.Color(c).convertSRGBToLinear());
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._s = new THREE.Vector3();
    for (let i = 0; i < max; i++) {
      this.items.push({
        alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        rot: new THREE.Euler(), spin: new THREE.Vector3(), size: new THREE.Vector3(1, 1, 1),
        life: 0, ttl: 3,
      });
      this.free.push(i);
      this._m.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.gravity = -14;
  }

  burst(center, {
    count = 40, speed = 22, spread = 1, up = 0.6, ttl = 3.4, gravity = this.gravity, scale = 1,
  } = {}) {
    for (let n = 0; n < count; n++) {
      const i = this.free.pop();
      if (i === undefined) return;
      const it = this.items[i];
      const r = this.rng;
      it.alive = true;
      it.pos.copy(center);
      it.pos.x += r.gauss(0, 0.6); it.pos.y += r.gauss(0, 0.6); it.pos.z += r.gauss(0, 0.6);
      const th = r.range(0, Math.PI * 2);
      const ph = Math.acos(r.range(-1, 1) * (1 - up) + up * 0.3);
      const sp = speed * r.range(0.35, 1.25);
      it.vel.set(Math.sin(ph) * Math.cos(th) * sp * spread, Math.abs(Math.cos(ph)) * sp * (0.5 + up), Math.sin(ph) * Math.sin(th) * sp * spread);
      it.rot.set(r.range(0, 6.28), r.range(0, 6.28), r.range(0, 6.28));
      it.spin.set(r.gauss(0, 7), r.gauss(0, 7), r.gauss(0, 7));
      const sh = r.pick(BURST_SHAPES);
      it.size.set(sh[0] * scale, sh[1] * scale, sh[2] * scale);
      it.life = 0; it.ttl = ttl * r.range(0.7, 1.2);
      it.gravity = gravity;
      const c = this.colors[r.int(0, this.colors.length - 1)];
      this.mesh.instanceColor.setXYZ(i, c.r, c.g, c.b);
    }
    this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt) {
    let any = false;
    for (let i = 0; i < this.max; i++) {
      const it = this.items[i];
      if (!it.alive) continue;
      any = true;
      it.life += dt;
      if (it.life >= it.ttl) {
        it.alive = false; this.free.push(i);
        this._m.makeScale(0, 0, 0);
      } else {
        it.vel.y += (it.gravity ?? this.gravity) * dt;
        it.pos.addScaledVector(it.vel, dt);
        it.rot.x += it.spin.x * dt; it.rot.y += it.spin.y * dt; it.rot.z += it.spin.z * dt;
        const fade = 1 - clamp((it.life - it.ttl * 0.75) / (it.ttl * 0.25), 0, 1);
        this._q.setFromEuler(it.rot);
        this._s.copy(it.size).multiplyScalar(fade);
        this._m.compose(it.pos, this._q, this._s);
      }
      this.mesh.setMatrixAt(i, this._m);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// -------------------------------------------------------------- fireballs

const SPRITE_GEO = new THREE.PlaneGeometry(1, 1);

function radialTexture(inner = 'rgba(255,240,200,1)', mid = 'rgba(255,140,40,0.75)', outer = 'rgba(60,20,10,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.35, mid);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let _fireTex = null, _smokeTex = null, _flashTex = null;
export function fireTexture() { return (_fireTex ||= radialTexture()); }
export function smokeTexture() {
  return (_smokeTex ||= radialTexture('rgba(120,120,125,0.75)', 'rgba(60,60,66,0.4)', 'rgba(20,20,24,0)'));
}
export function flashTexture() {
  return (_flashTex ||= radialTexture('rgba(255,255,255,1)', 'rgba(190,225,255,0.6)', 'rgba(120,180,255,0)'));
}

/** Pooled additive billboards: fireballs, muzzle flashes, smoke puffs, sparks. */
export class SpritePool {
  constructor(scene, { max = 120, texture = null, additive = true, color = 0xffffff } = {}) {
    this.max = max;
    const m = new THREE.MeshBasicMaterial({
      map: texture || fireTexture(),
      transparent: true, depthWrite: false, toneMapped: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      color: new THREE.Color(color),
    });
    this.mesh = new THREE.InstancedMesh(SPRITE_GEO, m, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3).fill(1), 3);
    scene.add(this.mesh);
    this.items = [];
    this.free = [];
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3();
    this._p = new THREE.Vector3();
    for (let i = 0; i < max; i++) {
      this.items.push({ alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, ttl: 1, size0: 1, size1: 2, rot: 0, spin: 0, color: new THREE.Color(1, 1, 1) });
      this.free.push(i);
      this._m.makeScale(0, 0, 0);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.camera = null;
  }

  spawn(pos, { ttl = 0.8, size0 = 1, size1 = 5, vel = null, color = null, spin = 0, drag = 0.9 } = {}) {
    const i = this.free.pop();
    if (i === undefined) return;
    const it = this.items[i];
    it.alive = true; it.life = 0; it.ttl = ttl;
    it.pos.copy(pos);
    it.vel.copy(vel || { x: 0, y: 0, z: 0 });
    it.size0 = size0; it.size1 = size1; it.rot = Math.random() * 6.28; it.spin = spin; it.drag = drag;
    if (color) it.color.set(color);
    else it.color.setRGB(1, 1, 1);
    this.mesh.instanceColor.setXYZ(i, it.color.r, it.color.g, it.color.b);
    this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt, camera) {
    const cam = camera || this.camera;
    let any = false;
    for (let i = 0; i < this.max; i++) {
      const it = this.items[i];
      if (!it.alive) continue;
      any = true;
      it.life += dt;
      const u = it.life / it.ttl;
      if (u >= 1) {
        it.alive = false; this.free.push(i);
        this._m.makeScale(0, 0, 0);
      } else {
        it.pos.addScaledVector(it.vel, dt);
        it.vel.multiplyScalar(Math.pow(it.drag ?? 0.9, dt * 60));
        it.rot += it.spin * dt;
        const s = it.size0 + (it.size1 - it.size0) * ease.outCubic(u);
        const fade = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85;
        if (cam) this._q.copy(cam.quaternion);
        else this._q.identity();
        const rq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), it.rot);
        this._q.multiply(rq);
        this._s.set(s, s, s);
        this._m.compose(it.pos, this._q, this._s);
        this.mesh.instanceColor.setXYZ(i, it.color.r * fade, it.color.g * fade, it.color.b * fade);
      }
      this.mesh.setMatrixAt(i, this._m);
    }
    if (any) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.instanceColor.needsUpdate = true;
    }
  }
}

/** One-call explosion: flash, fireball, smoke, sparks and a shower of bricks. */
export class Explosions {
  constructor(scene, { seed = 11, bricks = true, colors } = {}) {
    this.fire = new SpritePool(scene, { max: 90, texture: fireTexture() });
    this.smoke = new SpritePool(scene, { max: 70, texture: smokeTexture(), additive: false, color: 0x2a2a30 });
    this.flash = new SpritePool(scene, { max: 24, texture: flashTexture() });
    this.bricks = bricks ? new BrickBurst(scene, { seed, colors }) : null;
    this.rng = new RNG(seed + 3);
    this.lights = [];
    this.scene = scene;
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0xffa050, 0, 120, 2);
      l.visible = false;
      scene.add(l);
      this.lights.push({ light: l, t: 0, ttl: 0 });
    }
  }

  boom(pos, { scale = 1, brickCount = 34, brickSpeed = 20, light = true, smoke = true } = {}) {
    const r = this.rng;
    this.flash.spawn(pos, { ttl: 0.18 * scale, size0: 3 * scale, size1: 16 * scale, color: 0xfff3d0 });
    for (let i = 0; i < 5; i++) {
      this.fire.spawn(pos, {
        ttl: r.range(0.5, 1.1) * scale,
        size0: 2 * scale, size1: r.range(9, 17) * scale,
        vel: new THREE.Vector3(r.gauss(0, 4), r.gauss(1, 3), r.gauss(0, 4)).multiplyScalar(scale),
        spin: r.gauss(0, 2),
      });
    }
    if (smoke) {
      for (let i = 0; i < 4; i++) {
        this.smoke.spawn(pos, {
          ttl: r.range(1.6, 3.0) * scale, size0: 3 * scale, size1: r.range(14, 24) * scale,
          vel: new THREE.Vector3(r.gauss(0, 2.5), r.range(1, 5), r.gauss(0, 2.5)),
          spin: r.gauss(0, 0.8), drag: 0.96,
        });
      }
    }
    for (let i = 0; i < 10; i++) {
      this.fire.spawn(pos, {
        ttl: r.range(0.35, 0.9), size0: 0.9 * scale, size1: 0.2,
        vel: new THREE.Vector3(r.gauss(0, 1), r.gauss(0, 1), r.gauss(0, 1)).normalize().multiplyScalar(r.range(12, 40) * scale),
        color: 0xffd48a, drag: 0.93,
      });
    }
    if (this.bricks && brickCount) {
      this.bricks.burst(pos, { count: brickCount, speed: brickSpeed * scale, scale: Math.max(0.6, scale * 0.8) });
    }
    if (light) {
      const slot = this.lights.find((l) => !l.light.visible) || this.lights[0];
      slot.light.position.copy(pos);
      slot.light.visible = true;
      slot.t = 0; slot.ttl = 0.7 * scale;
      slot.peak = 900 * scale * scale;
      slot.light.distance = 140 * scale;
    }
  }

  update(dt, camera) {
    this.fire.update(dt, camera);
    this.smoke.update(dt, camera);
    this.flash.update(dt, camera);
    this.bricks?.update(dt);
    for (const s of this.lights) {
      if (!s.light.visible) continue;
      s.t += dt;
      const u = s.t / s.ttl;
      if (u >= 1) { s.light.visible = false; s.light.intensity = 0; continue; }
      s.light.intensity = (s.peak || 600) * Math.pow(1 - u, 2.2);
    }
  }
}

// ------------------------------------------------------------ engine trails

/** A stretched additive cone behind an engine nozzle. */
export function engineFlare(color = C.transLightBlue, radius = 0.6, length = 6, opts = {}) {
  const g = new THREE.Group();
  const coneG = cylGeo(radius, radius * 0.15, length, 10, true).clone();
  coneG.rotateX(-Math.PI / 2);
  coneG.translate(0, 0, -length / 2);
  const flame = new THREE.Mesh(coneG, mat(color, FINISH.GLOW, {
    intensity: opts.intensity ?? 1.5, opacity: 0.5, depthWrite: false,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  }));
  const hot = new THREE.Mesh(sphereGeo(radius * 0.62, 10, 8), mat(
    new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.7).getHex(), FINISH.GLOW,
    { intensity: opts.coreIntensity ?? 1.9, opacity: 0.9, depthWrite: false },
  ));
  hot.scale.z = 0.45;
  g.add(flame, hot);
  g.userData.set = (amount) => {
    g.visible = amount > 0.01;
    flame.scale.set(1, 1, Math.max(0.05, amount));
    hot.scale.set(amount * 0.9 + 0.1, amount * 0.9 + 0.1, 0.45 * amount + 0.05);
  };
  g.userData.set(1);
  return g;
}

// ---------------------------------------------------------------- hologram

export const HologramMaterial = (color = 0x74d8ff) => new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) },
    uOpacity: { value: 0.85 },
    uScan: { value: 90.0 },
    uGlitch: { value: 0.0 },
  },
  vertexShader: /* glsl */`
    varying vec3 vN; varying vec3 vW; varying vec2 vUv;
    uniform float uTime, uGlitch;
    void main() {
      vUv = uv; vN = normalize(normalMatrix * normal);
      vec3 p = position;
      p.x += sin(p.y * 12.0 + uTime * 30.0) * uGlitch;
      vec4 wp = modelMatrix * vec4(p, 1.0);
      vW = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: /* glsl */`
    varying vec3 vN; varying vec3 vW; varying vec2 vUv;
    uniform float uTime, uOpacity, uScan;
    uniform vec3 uColor;
    void main() {
      float fres = pow(1.0 - abs(dot(normalize(vN), normalize(cameraPosition - vW))), 1.6);
      float scan = 0.55 + 0.45 * sin(vW.y * uScan - uTime * 9.0);
      float band = smoothstep(0.0, 0.6, fract(vW.y * 0.35 - uTime * 0.55));
      float flick = 0.88 + 0.12 * sin(uTime * 43.0) * sin(uTime * 7.3);
      vec3 c = uColor * (0.35 + fres * 1.5) * scan * flick * (0.75 + band * 0.5);
      gl_FragColor = vec4(c, uOpacity * (0.30 + fres * 0.8) * scan * flick);
    }`,
});

/** Turn any built model into a flickering blue hologram of itself. */
export function makeHologram(source, { color = 0x74d8ff, scale = 1 } = {}) {
  const clone = source.clone(true);
  const material = HologramMaterial(color);
  clone.traverse((o) => {
    if (o.isMesh) {
      o.material = material;
      o.castShadow = false; o.receiveShadow = false;
    }
  });
  clone.scale.multiplyScalar(scale);
  const g = new THREE.Group();
  g.add(clone);
  g.userData.material = material;
  g.userData.update = (t, dt) => {
    material.uniforms.uTime.value = t;
    material.uniforms.uGlitch.value = Math.max(0, Math.sin(t * 0.9) * 0.02 + (Math.random() < 0.01 ? 0.08 : 0));
  };
  return g;
}

/** The cone of light under a hologram projector. */
export function projectorCone(radius = 2.2, height = 3.0, color = 0x74d8ff) {
  const g = cylGeo(radius, 0.12, height, 18, true).clone();
  const m = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.13, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.y = height / 2;
  return mesh;
}

// -------------------------------------------------------------- misc bits

/** Cheap volumetric-ish light shaft (a soft additive cone). */
export function lightShaft(radiusTop, radiusBottom, height, color = 0xffe6b0, opacity = 0.10) {
  const g = cylGeo(radiusTop, radiusBottom, height, 16, true).clone();
  const m = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, toneMapped: false,
  });
  return new THREE.Mesh(g, m);
}

/** Dust / ember motes drifting in a volume. */
export class Motes {
  constructor(scene, { count = 220, size = 0.09, color = 0xffe0b0, box = [40, 20, 40], seed = 5, speed = 0.6 } = {}) {
    const rng = new RNG(seed);
    const pos = new Float32Array(count * 3);
    this.seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = rng.range(-box[0] / 2, box[0] / 2);
      pos[i * 3 + 1] = rng.range(0, box[1]);
      pos[i * 3 + 2] = rng.range(-box[2] / 2, box[2] / 2);
      this.seeds[i] = rng.range(0, 100);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.base = pos.slice();
    this.box = box; this.speed = speed;
    const m = new THREE.PointsMaterial({
      color, size, transparent: true, opacity: 0.65, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.count = count;
  }

  update(t) {
    const p = this.points.geometry.attributes.position;
    for (let i = 0; i < this.count; i++) {
      const s = this.seeds[i];
      p.array[i * 3] = this.base[i * 3] + Math.sin(t * 0.3 * this.speed + s) * 1.4;
      p.array[i * 3 + 1] = ((this.base[i * 3 + 1] + t * this.speed * 0.5 + s) % this.box[1]);
      p.array[i * 3 + 2] = this.base[i * 3 + 2] + Math.cos(t * 0.24 * this.speed + s * 1.7) * 1.4;
    }
    p.needsUpdate = true;
  }
}
