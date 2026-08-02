/**
 * Visual effects library.
 *
 * Every effect is a PURE FUNCTION OF TIME: calling `update(t)` with any t, in
 * any order, must produce identical output. No accumulation, no Math.random()
 * at update time. This is what lets the offline renderer shard the film across
 * parallel browser workers and still get a continuous movie.
 */
import * as THREE from 'three';
import { hash11 } from './rng.js';
import { chamferBox } from './brick.js';

// ---------------------------------------------------------------------------
// Shared procedural textures
// ---------------------------------------------------------------------------

let _radialTex = null;
/** Soft additive blob used for glows, sparks and star sprites. */
export function radialTexture(inner = 0.0, power = 2.2) {
  if (_radialTex) return _radialTex;
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(s, s);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = (x + 0.5) / s - 0.5;
      const dy = (y + 0.5) / s - 0.5;
      const r = Math.min(1, Math.hypot(dx, dy) * 2);
      let a = Math.pow(Math.max(0, 1 - r), power);
      if (r < inner) a = 1;
      const i = (y * s + x) * 4;
      img.data[i] = 255;
      img.data[i + 1] = 255;
      img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  _radialTex = new THREE.CanvasTexture(c);
  _radialTex.colorSpace = THREE.SRGBColorSpace;
  return _radialTex;
}

let _flareTex = null;
/** Four-point anamorphic-ish flare for suns and engine cores. */
export function flareTexture() {
  if (_flareTex) return _flareTex;
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.12, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.16)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  ctx.globalCompositeOperation = 'lighter';
  for (const [w, h] of [[s * 0.9, s * 0.012], [s * 0.012, s * 0.9]]) {
    const lg = ctx.createLinearGradient(s / 2 - w / 2, 0, s / 2 + w / 2, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.5, 'rgba(255,255,255,0.85)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.fillStyle = w > h ? lg : 'rgba(255,255,255,0.5)';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
  _flareTex = new THREE.CanvasTexture(c);
  _flareTex.colorSpace = THREE.SRGBColorSpace;
  return _flareTex;
}

export function additiveMaterial(color, opts = {}) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: opts.opacity ?? 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: opts.side ?? THREE.DoubleSide,
    toneMapped: false,
    map: opts.map ?? null,
  });
}

export function glowSprite(color, size = 1, opacity = 1) {
  const m = new THREE.SpriteMaterial({
    map: radialTexture(),
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const s = new THREE.Sprite(m);
  s.scale.set(size, size, 1);
  return s;
}

// ---------------------------------------------------------------------------
// Starfield
// ---------------------------------------------------------------------------

/**
 * A deep static starfield on a large sphere. `update(t)` gives a very slow
 * drift so the frame never looks frozen.
 */
export class Starfield {
  constructor({ count = 2200, radius = 900, seed = 7, sizeMin = 1.2, sizeMax = 4.2, tint = true } = {}) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const siz = new Float32Array(count);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const u = hash11(i, 11) * 2 - 1;
      const th = hash11(i, 12) * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(th) * r * radius;
      pos[i * 3 + 1] = u * radius;
      pos[i * 3 + 2] = Math.sin(th) * r * radius;
      const w = hash11(i, 13);
      if (tint) {
        c.setHSL(0.55 + (hash11(i, 14) - 0.5) * 0.22, 0.35 * hash11(i, 15), 0.72 + 0.28 * w);
      } else {
        c.setRGB(1, 1, 1);
      }
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      siz[i] = sizeMin + Math.pow(w, 3) * (sizeMax - sizeMin);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uOpacity: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aSize;
        varying vec3 vColor;
        varying float vTw;
        uniform float uTime;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float seed = position.x * 0.013 + position.y * 0.027 + position.z * 0.011;
          vTw = 0.75 + 0.25 * sin(uTime * 1.7 + seed * 12.0);
          gl_PointSize = aSize * vTw * (300.0 / max(1.0, -mv.z)) * 3.0;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vTw;
        uniform float uOpacity;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d) * 2.0;
          float a = pow(max(0.0, 1.0 - r), 2.0);
          if (a < 0.01) discard;
          gl_FragColor = vec4(vColor * vTw, a * uOpacity);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = -10;
    this.material = mat;
  }
  get object() {
    return this.points;
  }
  set opacity(v) {
    this.material.uniforms.uOpacity.value = v;
  }
  update(t) {
    this.material.uniforms.uTime.value = t;
    this.points.rotation.y = t * 0.0035;
  }
}

// ---------------------------------------------------------------------------
// Laser bolts
// ---------------------------------------------------------------------------

/**
 * Pool of travelling energy bolts.
 *
 * Add shots with `add({t0, from, to, speed, color, length, width})`; each bolt
 * appears at t0 and flies from -> to at constant speed, then disappears.
 * Rendered as one InstancedMesh per pool.
 */
export class BoltPool {
  constructor({ max = 96, color = 0xff3322, length = 3, width = 0.16, glow = 1.0 } = {}) {
    this.shots = [];
    this.max = max;
    const geo = new THREE.CylinderGeometry(width, width, 1, 6, 1);
    geo.rotateX(Math.PI / 2); // aim down +z
    this.mesh = new THREE.InstancedMesh(geo, additiveMaterial(color, { side: THREE.FrontSide }), max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.defaultLength = length;

    const halo = new THREE.PlaneGeometry(width * 9, 1);
    this.halo = new THREE.InstancedMesh(
      halo,
      additiveMaterial(color, { map: radialTexture(), opacity: 0.55 * glow }),
      max
    );
    this.halo.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.halo.frustumCulled = false;
    this.halo.count = 0;

    this.object = new THREE.Group();
    this.object.add(this.mesh, this.halo);
    this.object.renderOrder = 5;
    this._d = new THREE.Object3D();
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
  }

  add(shot) {
    this.shots.push({
      t0: shot.t0,
      from: new THREE.Vector3(...shot.from),
      to: new THREE.Vector3(...shot.to),
      speed: shot.speed ?? 220,
      length: shot.length ?? this.defaultLength,
      scale: shot.scale ?? 1,
    });
    return this;
  }

  /** Convenience: a burst of `n` shots at interval `dt` with slight spread. */
  burst({ t0, n = 3, dt = 0.12, from, to, spread = 0, speed = 220, seed = 1, length, scale = 1 }) {
    for (let i = 0; i < n; i++) {
      const j = i + seed * 131;
      const off = [
        (hash11(j, 21) - 0.5) * spread,
        (hash11(j, 22) - 0.5) * spread,
        (hash11(j, 23) - 0.5) * spread,
      ];
      this.add({
        t0: t0 + i * dt,
        from,
        to: [to[0] + off[0], to[1] + off[1], to[2] + off[2]],
        speed,
        length,
        scale,
      });
    }
    return this;
  }

  update(t, camera) {
    let n = 0;
    const d = this._d;
    for (const s of this.shots) {
      if (n >= this.max) break;
      const dist = this._a.copy(s.to).sub(s.from).length();
      const dur = dist / s.speed;
      const u = (t - s.t0) / dur;
      if (u < 0 || u > 1) continue;
      this._b.copy(s.from).lerp(s.to, u);
      d.position.copy(this._b);
      d.lookAt(s.to);
      d.scale.set(s.scale, s.scale, s.length);
      d.updateMatrix();
      this.mesh.setMatrixAt(n, d.matrix);
      if (camera) {
        d.lookAt(camera.position);
        // keep the halo aligned with the bolt axis but facing the camera
        const dir = this._a.copy(s.to).sub(s.from).normalize();
        const toCam = this._b.clone().sub(camera.position).normalize();
        const right = new THREE.Vector3().crossVectors(dir, toCam).normalize();
        const up = new THREE.Vector3().crossVectors(right, dir).normalize();
        const m = new THREE.Matrix4().makeBasis(right, dir, up);
        d.quaternion.setFromRotationMatrix(m);
        d.position.copy(this._b).lerp(s.to, 0);
        d.scale.set(s.scale, s.length * 1.25, 1);
        d.updateMatrix();
        this.halo.setMatrixAt(n, d.matrix);
      }
      n++;
    }
    this.mesh.count = n;
    this.halo.count = camera ? n : 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.halo.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// Brick explosion
// ---------------------------------------------------------------------------

/**
 * Blow a built model apart into its individual bricks.
 *
 * Pass the `userData.parts` list produced by Bricks.build(). Before `t0` the
 * bricks sit exactly where the model is; afterwards each follows an analytic
 * ballistic arc with a per-brick seeded velocity and spin.
 */
export class BrickBurst {
  constructor(parts, opts = {}) {
    const {
      t0 = 0,
      origin = new THREE.Vector3(),
      speed = 14,
      spin = 6,
      gravity = -9,
      spread = 1,
      fade = 0,
      max = 900,
      radial = 1,
      seed = 3,
      scale = 1,
      colorOverride = null,
      matrixWorld = null,
    } = opts;
    this.t0 = t0;
    this.gravity = gravity;
    this.fade = fade;
    this.spin = spin;

    const list = parts.slice(0, max);
    this.n = list.length;
    const geo = chamferBox(1, 1, 1, 0.06);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.02, vertexColors: false });
    this.material = mat;
    this.mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, this.n));
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;

    const col = new THREE.Color();
    this.items = list.map((p, i) => {
      const pos = p.position.clone();
      if (matrixWorld) pos.applyMatrix4(matrixWorld);
      const dir = pos.clone().sub(origin);
      const len = dir.length() || 1;
      dir.divideScalar(len);
      const jitter = new THREE.Vector3(
        hash11(i, seed * 7 + 1) - 0.5,
        hash11(i, seed * 7 + 2) - 0.5,
        hash11(i, seed * 7 + 3) - 0.5
      ).multiplyScalar(spread);
      const v = dir
        .multiplyScalar(radial * speed * (0.45 + hash11(i, seed * 7 + 4)))
        .add(jitter.multiplyScalar(speed * 0.5));
      v.y += speed * 0.25 * hash11(i, seed * 7 + 5);
      col.set(colorOverride ?? p.color);
      this.mesh.setColorAt(i, col);
      return {
        p0: pos,
        q0: p.quaternion.clone(),
        size: p.size.clone().multiplyScalar(scale),
        v,
        axis: new THREE.Vector3(
          hash11(i, seed * 7 + 6) - 0.5,
          hash11(i, seed * 7 + 7) - 0.5,
          hash11(i, seed * 7 + 8) - 0.5
        ).normalize(),
        w: (0.4 + hash11(i, seed * 7 + 9)) * spin,
        delay: hash11(i, seed * 7 + 10) * (opts.stagger ?? 0),
      };
    });
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this._d = new THREE.Object3D();
    this._q = new THREE.Quaternion();
    this.object = this.mesh;
  }

  update(t) {
    const d = this._d;
    const q = this._q;
    let visible = false;
    for (let i = 0; i < this.n; i++) {
      const it = this.items[i];
      const dt = Math.max(0, t - this.t0 - it.delay);
      if (t < this.t0) {
        d.position.copy(it.p0);
        d.quaternion.copy(it.q0);
      } else {
        d.position.set(
          it.p0.x + it.v.x * dt,
          it.p0.y + it.v.y * dt + 0.5 * this.gravity * dt * dt,
          it.p0.z + it.v.z * dt
        );
        q.setFromAxisAngle(it.axis, it.w * dt);
        d.quaternion.copy(it.q0).premultiply(q);
      }
      d.scale.copy(it.size);
      d.updateMatrix();
      this.mesh.setMatrixAt(i, d.matrix);
      visible = true;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.fade > 0) {
      const a = 1 - THREE.MathUtils.clamp((t - this.t0) / this.fade, 0, 1);
      this.material.opacity = a;
      this.material.transparent = a < 1;
    }
    this.mesh.visible = visible;
  }
}

// ---------------------------------------------------------------------------
// Sparks / debris points
// ---------------------------------------------------------------------------

/** Additive spark shower; analytic ballistic points. */
export class Sparks {
  constructor({ count = 160, t0 = 0, life = 1.2, speed = 22, gravity = -12, color = 0xffcc66, size = 0.5, seed = 5, origin = [0, 0, 0], cone = null } = {}) {
    this.t0 = t0;
    this.life = life;
    this.gravity = gravity;
    this.count = count;
    const pos = new Float32Array(count * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size,
      map: radialTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      toneMapped: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.material = mat;
    this.origin = new THREE.Vector3(...origin);
    this.vel = [];
    for (let i = 0; i < count; i++) {
      let dir;
      if (cone) {
        const axis = new THREE.Vector3(...cone.axis).normalize();
        const spread = cone.spread ?? 0.5;
        const a = hash11(i, seed + 1) * Math.PI * 2;
        const r = Math.sqrt(hash11(i, seed + 2)) * spread;
        const t1 = new THREE.Vector3(0, 1, 0);
        if (Math.abs(axis.y) > 0.9) t1.set(1, 0, 0);
        const u = new THREE.Vector3().crossVectors(axis, t1).normalize();
        const v = new THREE.Vector3().crossVectors(axis, u);
        dir = axis
          .clone()
          .add(u.multiplyScalar(Math.cos(a) * r))
          .add(v.multiplyScalar(Math.sin(a) * r))
          .normalize();
      } else {
        const u = hash11(i, seed + 1) * 2 - 1;
        const th = hash11(i, seed + 2) * Math.PI * 2;
        const rr = Math.sqrt(1 - u * u);
        dir = new THREE.Vector3(Math.cos(th) * rr, u, Math.sin(th) * rr);
      }
      this.vel.push(dir.multiplyScalar(speed * (0.25 + hash11(i, seed + 3))));
    }
    this.object = this.points;
  }
  update(t) {
    const dt = t - this.t0;
    if (dt < 0 || dt > this.life) {
      this.points.visible = false;
      return;
    }
    this.points.visible = true;
    const arr = this.points.geometry.attributes.position.array;
    for (let i = 0; i < this.count; i++) {
      const v = this.vel[i];
      const d = dt * (0.6 + hash11(i, 91) * 0.7);
      arr[i * 3] = this.origin.x + v.x * d;
      arr[i * 3 + 1] = this.origin.y + v.y * d + 0.5 * this.gravity * d * d;
      arr[i * 3 + 2] = this.origin.z + v.z * d;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    const a = 1 - dt / this.life;
    this.material.opacity = a * a;
  }
}

// ---------------------------------------------------------------------------
// Explosion flash / fireball
// ---------------------------------------------------------------------------

/** Expanding additive fireball with a bright core flash. */
export class Fireball {
  constructor({ t0 = 0, life = 1.1, radius = 8, color = 0xffaa33, coreColor = 0xffffff, position = [0, 0, 0] } = {}) {
    this.t0 = t0;
    this.life = life;
    this.radius = radius;
    const g = new THREE.SphereGeometry(1, 18, 12);
    this.shell = new THREE.Mesh(g, additiveMaterial(color, { opacity: 0.9, side: THREE.FrontSide }));
    this.core = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), additiveMaterial(coreColor, { opacity: 1 }));
    this.flare = glowSprite(color, radius * 3, 1);
    this.object = new THREE.Group();
    this.object.position.set(...position);
    this.object.add(this.shell, this.core, this.flare);
    this.object.renderOrder = 8;
  }
  update(t) {
    const u = (t - this.t0) / this.life;
    if (u < 0 || u > 1) {
      this.object.visible = false;
      return;
    }
    this.object.visible = true;
    const e = 1 - Math.pow(1 - u, 3);
    const r = this.radius * (0.15 + e * 0.95);
    this.shell.scale.setScalar(r);
    this.shell.material.opacity = 0.85 * Math.pow(1 - u, 1.6);
    const cu = Math.min(1, u * 4);
    this.core.scale.setScalar(this.radius * 0.55 * (0.2 + cu * 0.9));
    this.core.material.opacity = Math.pow(1 - Math.min(1, u * 2.4), 2);
    this.flare.scale.setScalar(this.radius * (2.2 + e * 3.2));
    this.flare.material.opacity = Math.pow(1 - u, 2.2);
  }
}

// ---------------------------------------------------------------------------
// Engine glow / thruster
// ---------------------------------------------------------------------------

/** Additive thruster cone plus sprite; `update` gives it a subtle flicker. */
export class Thruster {
  constructor({ color = 0x88ddff, radius = 0.5, length = 4, position = [0, 0, 0], dir = [0, 0, 1] } = {}) {
    this.base = { radius, length };
    const g = new THREE.ConeGeometry(radius, length, 12, 1, true);
    g.translate(0, -length / 2, 0);
    g.rotateX(Math.PI / 2);
    this.cone = new THREE.Mesh(g, additiveMaterial(color, { opacity: 0.55 }));
    this.sprite = glowSprite(color, radius * 4.5, 0.95);
    this.object = new THREE.Group();
    this.object.add(this.cone, this.sprite);
    this.object.position.set(...position);
    const d = new THREE.Vector3(...dir).normalize();
    this.object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
    this.throttle = 1;
    this.seed = Math.abs(position[0] * 13.7 + position[1] * 7.3 + position[2] * 3.1);
  }
  update(t) {
    const f = 0.86 + 0.14 * Math.sin(t * 37 + this.seed) * Math.sin(t * 13.3 + this.seed * 2);
    const s = this.throttle * f;
    this.cone.scale.set(1, 1, Math.max(0.001, s));
    this.cone.material.opacity = 0.55 * Math.min(1, this.throttle * 1.2);
    this.sprite.scale.setScalar(this.base.radius * 4.5 * (0.6 + s * 0.6));
    this.sprite.material.opacity = 0.95 * Math.min(1, this.throttle * 1.4);
    this.object.visible = this.throttle > 0.01;
  }
}

// ---------------------------------------------------------------------------
// Hologram
// ---------------------------------------------------------------------------

/** Flickering cyan scanline material for projected holograms. */
export function hologramMaterial(color = 0x7fe8ff, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opts.opacity ?? 0.75 },
      uScan: { value: opts.scan ?? 42.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vP; varying vec3 vW;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vP = mv.xyz;
        vW = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uColor; uniform float uOpacity; uniform float uScan;
      varying vec3 vN; varying vec3 vP; varying vec3 vW;
      float h(float x){ return fract(sin(x*127.1)*43758.5453); }
      void main() {
        vec3 V = normalize(-vP);
        float fres = pow(1.0 - abs(dot(normalize(vN), V)), 1.6);
        float scan = 0.55 + 0.45 * sin(vW.y * uScan - uTime * 7.0);
        float band = smoothstep(0.0, 1.0, fract(vW.y * 0.35 - uTime * 0.55));
        float flick = 0.86 + 0.14 * h(floor(uTime * 22.0));
        float a = (0.25 + fres * 0.9) * scan * flick * uOpacity;
        a *= 0.75 + 0.35 * band;
        gl_FragColor = vec4(uColor * (0.7 + fres * 1.5) * flick, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** Cone of light for a hologram projector or a tractor beam. */
export class Beam {
  constructor({ color = 0x7fe8ff, radiusTop = 0.2, radiusBottom = 3, height = 6, opacity = 0.28 } = {}) {
    const g = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 20, 1, true);
    g.translate(0, height / 2, 0);
    this.mesh = new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
        vertexShader: `varying vec2 vUv; varying vec3 vP;
          void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vP=mv.xyz; gl_Position=projectionMatrix*mv; }`,
        fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; varying vec3 vP;
          void main(){
            float edge = pow(sin(vUv.x*3.14159), 0.4);
            float rings = 0.6 + 0.4*sin(vUv.y*40.0 - uTime*6.0);
            float fall = pow(1.0 - vUv.y, 0.8);
            gl_FragColor = vec4(uColor, uOpacity*edge*rings*fall);
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
    );
    this.object = this.mesh;
  }
  update(t) {
    this.mesh.material.uniforms.uTime.value = t;
  }
}

// ---------------------------------------------------------------------------
// Hyperspace
// ---------------------------------------------------------------------------

/** Radial star streaks for the jump to lightspeed. */
export class Hyperspace {
  constructor({ count = 500, length = 60, radius = 40, depth = 400, seed = 31 } = {}) {
    const g = new THREE.CylinderGeometry(0.06, 0.06, 1, 4, 1);
    g.rotateX(Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(g, additiveMaterial(0xbfe6ff, { opacity: 0.9 }), count);
    this.mesh.frustumCulled = false;
    this.count = count;
    this.length = length;
    this.depth = depth;
    this.items = [];
    for (let i = 0; i < count; i++) {
      const a = hash11(i, seed) * Math.PI * 2;
      const r = (0.12 + Math.pow(hash11(i, seed + 1), 0.6)) * radius;
      this.items.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z0: -hash11(i, seed + 2) * depth, sp: 0.6 + hash11(i, seed + 3) });
    }
    this._d = new THREE.Object3D();
    this.object = this.mesh;
    this.intensity = 0;
  }
  update(t, speed = 400) {
    const d = this._d;
    for (let i = 0; i < this.count; i++) {
      const it = this.items[i];
      let z = it.z0 + ((t * speed * it.sp) % this.depth);
      if (z > 0) z -= this.depth;
      d.position.set(it.x, it.y, z);
      d.scale.set(1, 1, this.length * this.intensity * it.sp);
      d.updateMatrix();
      this.mesh.setMatrixAt(i, d.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.material.opacity = Math.min(1, this.intensity);
    this.mesh.visible = this.intensity > 0.01;
  }
}

// ---------------------------------------------------------------------------
// Smoke
// ---------------------------------------------------------------------------

/** Slow drifting additive/alpha smoke puffs, analytic. */
export class Smoke {
  constructor({ count = 40, t0 = 0, life = 4, origin = [0, 0, 0], rise = 1.6, spread = 2.5, size = 3, color = 0x555a60, seed = 17, opacity = 0.5 } = {}) {
    this.t0 = t0;
    this.life = life;
    this.count = count;
    this.rise = rise;
    this.size = size;
    this.opacityScale = opacity;
    const mat = new THREE.SpriteMaterial({
      map: radialTexture(0, 1.4),
      color,
      transparent: true,
      opacity: opacity,
      depthWrite: false,
    });
    this.object = new THREE.Group();
    this.sprites = [];
    for (let i = 0; i < count; i++) {
      const s = new THREE.Sprite(mat.clone());
      s.position.set(
        origin[0] + (hash11(i, seed) - 0.5) * spread,
        origin[1] + (hash11(i, seed + 1) - 0.5) * spread * 0.4,
        origin[2] + (hash11(i, seed + 2) - 0.5) * spread
      );
      s.userData.base = s.position.clone();
      s.userData.delay = hash11(i, seed + 3) * life * 0.6;
      s.userData.rate = 0.6 + hash11(i, seed + 4);
      this.object.add(s);
      this.sprites.push(s);
    }
  }
  update(t) {
    for (let i = 0; i < this.sprites.length; i++) {
      const s = this.sprites[i];
      const dt = t - this.t0 - s.userData.delay;
      if (dt < 0 || dt > this.life) {
        s.visible = false;
        continue;
      }
      s.visible = true;
      const u = dt / this.life;
      s.position.copy(s.userData.base);
      s.position.y += dt * this.rise * s.userData.rate;
      const sc = this.size * (0.4 + u * 1.5) * s.userData.rate;
      s.scale.set(sc, sc, 1);
      s.material.opacity = this.opacityScale * Math.sin(Math.PI * Math.min(1, u * 1.1)) * 0.9;
    }
  }
}

// ---------------------------------------------------------------------------
// Camera shake (deterministic)
// ---------------------------------------------------------------------------

/** Adds smooth pseudo-random shake to a camera; pure function of t. */
export function shake(camera, t, amount, freq = 18, seed = 0) {
  if (amount <= 0) return;
  const n = (s) => Math.sin(t * freq * (1 + s * 0.13) + s * 7.7) * Math.sin(t * freq * 0.61 + s * 3.1);
  camera.position.x += n(seed + 1) * amount;
  camera.position.y += n(seed + 2) * amount;
  camera.rotation.z += n(seed + 3) * amount * 0.02;
}
