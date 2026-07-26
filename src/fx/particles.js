import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { smokeSprite, fireSprite, muzzleSprite, tex } from '../world/textures.js';

/**
 * GPU-billboarded particle pools (one draw call per pool) + debris bodies +
 * a small point-light pool. All game effects are composed from these.
 *
 * Render order contract: fire (11) is drawn first so smoke (12) swallows it;
 * additive flashes/tracers sit on top (13).
 */

const BILLBOARD_VERT = /* glsl */`
  attribute vec3 aCenter;
  attribute float aSize;
  attribute float aRot;
  attribute vec4 aColor;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vFog;
  uniform float uFogDensity;
  void main() {
    vUv = uv;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(aCenter, 1.0);
    float c = cos(aRot), s = sin(aRot);
    vec2 corner = vec2(position.x * c - position.y * s, position.x * s + position.y * c) * aSize;
    mv.xy += corner;
    float dist = length(mv.xyz);
    vFog = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
    gl_Position = projectionMatrix * mv;
  }
`;

const BILLBOARD_FRAG = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3 uFogColor;
  uniform float uAdditive;
  uniform float uPremult;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vFog;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    vec3 col = t.rgb * vColor.rgb;
    float a = t.a * vColor.a;
    if (uPremult > 0.5) {
      // Premultiplied alpha: HDR fire rolls off in ACES instead of clipping,
      // and overlapping sprites can't stack into a white-out.
      a *= (1.0 - vFog);
      if (a < 0.004) discard;
      gl_FragColor = vec4(col * a, a);
    } else {
      if (uAdditive > 0.5) {
        a *= (1.0 - vFog);
      } else {
        col = mix(col, uFogColor, vFog);
      }
      if (a < 0.004) discard;
      gl_FragColor = vec4(col, a);
    }
  }
`;

export class ParticlePool {
  constructor(scene, spriteCanvas, {
    capacity = 256, additive = false, premultiplied = false,
    renderOrder = null, fogDensity = 0.0062, fogColor = 0xc9b490,
  } = {}) {
    this.capacity = capacity;
    this.particles = [];
    this.free = [];
    for (let i = 0; i < capacity; i++) this.free.push(i);
    this.data = new Array(capacity).fill(null);

    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.attributes.position = base.attributes.position;
    geo.attributes.uv = base.attributes.uv;
    this.aCenter = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage);
    this.aRot = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage);
    this.aColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aCenter', this.aCenter);
    geo.setAttribute('aSize', this.aSize);
    geo.setAttribute('aRot', this.aRot);
    geo.setAttribute('aColor', this.aColor);
    geo.instanceCount = 0;

    const map = tex(spriteCanvas);
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    const mat = new THREE.ShaderMaterial({
      vertexShader: BILLBOARD_VERT,
      fragmentShader: BILLBOARD_FRAG,
      uniforms: {
        uMap: { value: map },
        uFogColor: { value: new THREE.Color(fogColor) },
        uFogDensity: { value: fogDensity },
        uAdditive: { value: additive ? 1 : 0 },
        uPremult: { value: premultiplied ? 1 : 0 },
      },
      transparent: true,
      depthWrite: false,
    });
    if (premultiplied) {
      mat.blending = THREE.CustomBlending;
      mat.blendEquation = THREE.AddEquation;
      mat.blendSrc = THREE.OneFactor;
      mat.blendDst = THREE.OneMinusSrcAlphaFactor;
    } else {
      mat.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    }
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = renderOrder ?? (additive ? 12 : 11);
    scene.add(this.mesh);
    this.geo = geo;
  }

  /**
   * Spawn a particle.
   * o: { pos, vel, grav, drag, life, size0, size1, rot, rotVel,
   *      color0, color1, alpha0, alpha1, fadeIn, delay }
   */
  spawn(o) {
    if (!this.free.length) return;
    const i = this.free.pop();
    this.data[i] = {
      age: 0,
      delay: o.delay ?? 0,
      pos: o.pos.clone(),
      vel: o.vel ? o.vel.clone() : new THREE.Vector3(),
      grav: o.grav ?? 0,
      drag: o.drag ?? 0,
      life: o.life ?? 1,
      size0: o.size0 ?? 1, size1: o.size1 ?? o.size0 ?? 1,
      rot: o.rot ?? Math.random() * Math.PI * 2,
      rotVel: o.rotVel ?? 0,
      color0: o.color0 ?? new THREE.Color(1, 1, 1),
      color1: o.color1 ?? o.color0 ?? new THREE.Color(1, 1, 1),
      alpha0: o.alpha0 ?? 1, alpha1: o.alpha1 ?? 0,
      fadeIn: o.fadeIn ?? 0.06,
    };
  }

  update(dt) {
    let n = 0;
    const c = new THREE.Color();
    for (let i = 0; i < this.capacity; i++) {
      const p = this.data[i];
      if (!p) continue;
      if (p.delay > 0) { p.delay -= dt; continue; } // delayed emitter entry
      p.age += dt;
      if (p.age >= p.life) { this.data[i] = null; this.free.push(i); continue; }
      const t = p.age / p.life;
      p.vel.y -= p.grav * dt;
      if (p.drag) p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.pos.addScaledVector(p.vel, dt);
      p.rot += p.rotVel * dt;

      this.aCenter.setXYZ(n, p.pos.x, p.pos.y, p.pos.z);
      this.aSize.setX(n, p.size0 + (p.size1 - p.size0) * t);
      this.aRot.setX(n, p.rot);
      c.copy(p.color0).lerp(p.color1, t);
      let a = p.alpha0 + (p.alpha1 - p.alpha0) * t;
      if (p.age < p.fadeIn) a *= p.age / p.fadeIn;
      this.aColor.setXYZW(n, c.r, c.g, c.b, a);
      n++;
    }
    this.geo.instanceCount = n;
    if (n > 0) {
      this.aCenter.needsUpdate = true;
      this.aSize.needsUpdate = true;
      this.aRot.needsUpdate = true;
      this.aColor.needsUpdate = true;
    }
  }
}

/* ------------------------------- debris -------------------------------- */

const DEBRIS_PALETTE = [
  new THREE.Color(0x6b6156), // concrete
  new THREE.Color(0x1c1a18), // char
  new THREE.Color(0x8a5a44), // brick
];

export class DebrisSystem {
  /** onPuff(pos): callback used by large airborne chunks to drop smoke. */
  constructor(scene, capacity = 160, onPuff = null) {
    this.onPuff = onPuff;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._eu = new THREE.Euler();
    this._s = new THREE.Vector3();
    this._zero = new THREE.Matrix4().makeScale(0, 0, 0);
    this._c = new THREE.Color();

    // Three silhouettes: stretched shard, plank, vertex-jittered chunk.
    const shard = new THREE.TetrahedronGeometry(0.08);
    shard.scale(0.6, 0.6, 1.9);
    const plank = new THREE.BoxGeometry(0.4, 0.06, 0.03);
    const chunk = this._jitteredBox(0.15);

    const nShard = Math.max(4, Math.round(capacity * 0.375));
    const nPlank = Math.max(4, Math.round(capacity * 0.25));
    const nChunk = Math.max(4, capacity - nShard - nPlank);
    this.pools = [
      this._makePool(scene, shard, nShard, 0.045, false),
      this._makePool(scene, plank, nPlank, 0.022, false),
      this._makePool(scene, chunk, nChunk, 0.08, true),
    ];
  }

  _jitteredBox(s) {
    const geo = new THREE.BoxGeometry(s, s, s);
    const p = geo.attributes.position;
    const map = new Map();
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i).toFixed(4)}|${p.getY(i).toFixed(4)}|${p.getZ(i).toFixed(4)}`;
      let o = map.get(key);
      if (!o) {
        o = [(Math.random() - 0.5) * s * 0.5, (Math.random() - 0.5) * s * 0.5, (Math.random() - 0.5) * s * 0.5];
        map.set(key, o);
      }
      p.setXYZ(i, p.getX(i) + o[0], p.getY(i) + o[1], p.getZ(i) + o[2]);
    }
    geo.computeVertexNormals();
    return geo;
  }

  _makePool(scene, geo, n, restY, chunky) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0.02 });
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.castShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    for (let i = 0; i < n; i++) {
      mesh.setMatrixAt(i, this._zero);
      mesh.setColorAt(i, DEBRIS_PALETTE[0]);
    }
    mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    const free = [];
    for (let i = 0; i < n; i++) free.push(i);
    return { mesh, items: new Array(n).fill(null), free, restY, chunky };
  }

  /** scale is a characteristic size (m-ish); ~0.09 maps to 1x geometry. */
  spawn(pos, vel, scale = 0.09, life = 3.2) {
    const roll = Math.random();
    const type = roll < 0.4 ? 0 : roll < 0.6 ? 1 : 2;
    const pool = this.pools[type];
    if (!pool.free.length) return;
    const i = pool.free.pop();
    let mult = THREE.MathUtils.clamp(scale / 0.09, 0.45, 2.4);
    if (type === 1) mult = Math.min(mult, 1.35); // planks stay plank-sized
    const cr = Math.random();
    const cIdx = cr < 0.5 ? 0 : cr < 0.7 ? 1 : 2;
    this._c.copy(DEBRIS_PALETTE[cIdx]).multiplyScalar(0.82 + Math.random() * 0.36);
    pool.mesh.setColorAt(i, this._c);
    pool.mesh.instanceColor.needsUpdate = true;
    pool.items[i] = {
      pos: pos.clone(), vel: vel.clone(),
      rot: new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3),
      rotVel: new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12),
      mult, life, age: 0, rest: false,
      // Big chunks trail dust while airborne
      puff: pool.chunky && 0.15 * mult > 0.08 ? 0.02 + Math.random() * 0.03 : -1,
    };
  }

  update(dt) {
    for (const pool of this.pools) {
      let dirty = false;
      for (let i = 0; i < pool.items.length; i++) {
        const d = pool.items[i];
        if (!d) continue;
        d.age += dt;
        if (d.age > d.life) {
          pool.items[i] = null; pool.free.push(i);
          pool.mesh.setMatrixAt(i, this._zero);
          dirty = true;
          continue;
        }
        if (!d.rest) {
          d.vel.y -= 16 * dt;
          d.pos.addScaledVector(d.vel, dt);
          const floor = pool.restY * d.mult;
          if (d.pos.y < floor) {
            d.pos.y = floor;
            d.vel.y = Math.abs(d.vel.y) * 0.3;
            d.vel.x *= 0.72; d.vel.z *= 0.72;
            d.rotVel.multiplyScalar(0.6);
            if (Math.abs(d.vel.y) < 0.6) d.vel.y = 0;
            if (d.vel.lengthSq() < 0.25) { d.vel.set(0, 0, 0); d.rotVel.set(0, 0, 0); d.rest = true; }
          }
          if (d.puff >= 0 && this.onPuff) {
            d.puff -= dt;
            if (d.puff <= 0 && d.pos.y > 0.35) {
              d.puff = 0.04;
              this.onPuff(d.pos);
            }
          }
          d.rot.x += d.rotVel.x * dt; d.rot.y += d.rotVel.y * dt; d.rot.z += d.rotVel.z * dt;
        }
        const fade = d.age > d.life * 0.82 ? 1 - (d.age - d.life * 0.82) / (d.life * 0.18) : 1;
        const s = d.mult * fade;
        this._q.setFromEuler(d.rot);
        this._m.compose(d.pos, this._q, this._s.set(s, s, s));
        pool.mesh.setMatrixAt(i, this._m);
        dirty = true;
      }
      if (dirty) pool.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

/* ------------------------------ light pool ------------------------------ */

export class LightPool {
  constructor(scene, n = 6) {
    this.lights = [];
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xffaa44, 0, 18, 2);
      l.visible = false;
      l.layers.enable(1); // also light the viewmodel pass
      scene.add(l);
      this.lights.push({ l, life: 0, age: 0, intensity: 0 });
    }
  }
  flash(pos, { color = 0xffaa44, intensity = 60, life = 0.25, distance = 20 } = {}) {
    let slot = this.lights.find((s) => s.age >= s.life);
    if (!slot) slot = this.lights[0];
    slot.l.position.copy(pos);
    slot.l.color.set(color);
    slot.l.distance = distance;
    slot.intensity = intensity;
    slot.life = life;
    slot.age = 0;
    slot.l.visible = true;
  }
  update(dt) {
    for (const s of this.lights) {
      if (s.age >= s.life) { s.l.visible = false; continue; }
      s.age += dt;
      const t = Math.min(1, s.age / s.life);
      s.l.intensity = s.intensity * (1 - t) * (1 - t);
      if (s.age >= s.life) s.l.visible = false;
    }
  }
}

/* --------------------------- muzzle flash tongues ------------------------ */

/** Canvas gradient "tongue": white core at the muzzle -> jagged orange tip. */
function tongueCanvas(w = 256, h = 64) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const mid = h / 2;
  const grd = ctx.createLinearGradient(0, 0, w, 0);
  grd.addColorStop(0.0, 'rgba(255,252,240,1)');
  grd.addColorStop(0.16, 'rgba(255,236,180,0.96)');
  grd.addColorStop(0.42, 'rgba(255,168,64,0.6)');
  grd.addColorStop(0.75, 'rgba(255,116,26,0.22)');
  grd.addColorStop(1.0, 'rgba(255,92,16,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.moveTo(0, mid - h * 0.42);
  ctx.lineTo(w * 0.26, mid - h * 0.33);
  ctx.lineTo(w * 0.52, mid - h * 0.28);
  ctx.lineTo(w * 0.64, mid - h * 0.10);
  ctx.lineTo(w * 0.90, mid - h * 0.15);   // spike 1
  ctx.lineTo(w * 0.62, mid - h * 0.015);
  ctx.lineTo(w * 0.995, mid + h * 0.02);  // spike 2 (longest, on axis)
  ctx.lineTo(w * 0.60, mid + h * 0.09);
  ctx.lineTo(w * 0.79, mid + h * 0.21);   // spike 3
  ctx.lineTo(w * 0.48, mid + h * 0.25);
  ctx.lineTo(w * 0.24, mid + h * 0.35);
  ctx.lineTo(0, mid + h * 0.42);
  ctx.closePath();
  ctx.fill();
  // Hot white core hugging the muzzle end
  const core = ctx.createLinearGradient(0, 0, w * 0.5, 0);
  core.addColorStop(0, 'rgba(255,255,255,0.98)');
  core.addColorStop(1, 'rgba(255,244,200,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(w * 0.1, mid, w * 0.2, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/** Two crossed quads running along +Z from the muzzle. */
function tongueGeometry() {
  const p1 = new THREE.PlaneGeometry(0.45, 0.09);
  p1.rotateY(-Math.PI / 2);            // length along +Z, u=0 at z=0
  p1.translate(0, 0, 0.205);           // start 2cm behind the muzzle tip
  const p2 = p1.clone();
  p2.rotateZ(Math.PI / 2);             // roll the second quad 90° about the barrel axis
  return mergeGeometries([p1, p2]);
}

/* --------------------------------- FX hub -------------------------------- */

const _FWD = new THREE.Vector3(0, 0, 1);

export class FX {
  constructor(scene, quality = 'high') {
    this.scene = scene;
    const big = quality !== 'medium';
    // Smoke draws over fire so fireballs get swallowed by their own smoke.
    this.smoke = new ParticlePool(scene, smokeSprite(128, 7), { capacity: big ? 460 : 240, renderOrder: 12 });
    this.fire = new ParticlePool(scene, fireSprite(128, 9), { capacity: 200, premultiplied: true, renderOrder: 11 });
    this.flash = new ParticlePool(scene, muzzleSprite(128), { capacity: 60, additive: true, renderOrder: 13 });
    this.debris = new DebrisSystem(scene, big ? 160 : 80, (pos) => this._debrisPuff(pos));
    this.lights = new LightPool(scene, 6);
    this.columns = []; // lingering smoke emitters
    this.onShake = null;
    this._v = new THREE.Vector3();
    this._q1 = new THREE.Quaternion();
    this._q2 = new THREE.Quaternion();

    // Dedicated muzzle light — never evicted by explosion flashes.
    this.muzzleLight = new THREE.PointLight(0xffc37a, 0, 8, 2);
    this.muzzleLight.visible = false;
    this.muzzleLight.layers.enable(1);
    scene.add(this.muzzleLight);
    this._muzzleAge = 1;
    this._muzzleLife = 0.045;
    this._muzzleIntensity = 40;

    // Barrel-aligned flash tongues (world layer, additive crossed quads).
    const tTex = tex(tongueCanvas());
    tTex.wrapS = tTex.wrapT = THREE.ClampToEdgeWrapping;
    tTex.colorSpace = THREE.SRGBColorSpace;
    const tGeo = tongueGeometry();
    this.tongues = [];
    for (let i = 0; i < 12; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: tTex, transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      });
      mat.color.setRGB(1.7, 1.45, 1.1);
      const m = new THREE.Mesh(tGeo, mat);
      m.visible = false;
      m.renderOrder = 13;
      m.frustumCulled = false;
      scene.add(m);
      this.tongues.push({ mesh: m, age: 0, active: false });
    }
    this._shotN = 0;
  }

  update(dt, t) {
    this.smoke.update(dt);
    this.fire.update(dt);
    this.flash.update(dt);
    this.debris.update(dt);
    this.lights.update(dt);

    // Muzzle light decay
    if (this.muzzleLight.visible) {
      this._muzzleAge += dt;
      const k = 1 - Math.min(1, this._muzzleAge / this._muzzleLife);
      this.muzzleLight.intensity = this._muzzleIntensity * k * k;
      if (k <= 0) this.muzzleLight.visible = false;
    }
    // Tongues: 1 frame full, 1 frame at 40%, gone.
    for (const tn of this.tongues) {
      if (!tn.active) continue;
      tn.age += dt;
      if (tn.age > 0.036) { tn.active = false; tn.mesh.visible = false; continue; }
      tn.mesh.material.opacity = tn.age <= 0.018 ? 1 : 0.4;
    }

    for (let i = this.columns.length - 1; i >= 0; i--) {
      const c = this.columns[i];
      c.next -= dt;
      c.remaining -= dt;
      if (c.remaining <= 0) { this.columns.splice(i, 1); continue; }
      if (c.next <= 0) {
        c.next = 0.12 + Math.random() * 0.08;
        const k = Math.min(1, c.remaining / c.total + 0.25);
        this.smoke.spawn({
          pos: c.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.8, 0.5, (Math.random() - 0.5) * 1.8)),
          vel: new THREE.Vector3(0.6 + Math.random() * 0.5, 2.8 + Math.random() * 1.6, (Math.random() - 0.5) * 0.4),
          life: 5.5 + Math.random() * 3,
          size0: 1.8, size1: 9 + Math.random() * 5,
          color0: new THREE.Color(0.14, 0.13, 0.12), color1: new THREE.Color(0.42, 0.4, 0.38),
          alpha0: 0.7 * k, alpha1: 0, rotVel: (Math.random() - 0.5) * 0.5, fadeIn: 0.4,
        });
      }
    }
  }

  _debrisPuff(pos) {
    this.smoke.spawn({
      pos: pos.clone(),
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6),
      life: 0.45 + Math.random() * 0.3,
      size0: 0.12, size1: 0.4,
      color0: new THREE.Color(0.44, 0.4, 0.34), color1: new THREE.Color(0.4, 0.37, 0.32),
      alpha0: 0.3, alpha1: 0, drag: 1.4, fadeIn: 0,
    });
  }

  /* -------- shots & impacts -------- */

  impactWall(pos, normal) {
    // Sparks (premultiplied fire pool — HDR colors carry the punch)
    for (let i = 0; i < 5; i++) {
      const v = normal.clone().multiplyScalar(2 + Math.random() * 4);
      v.x += (Math.random() - 0.5) * 4; v.y += Math.random() * 3.5; v.z += (Math.random() - 0.5) * 4;
      this.fire.spawn({
        pos: pos.clone(), vel: v, grav: 14, life: 0.16 + Math.random() * 0.22,
        size0: 0.055, size1: 0.015,
        color0: new THREE.Color(3.2, 2.5, 1.3), color1: new THREE.Color(2.4, 0.9, 0.2),
        alpha0: 1, alpha1: 0, fadeIn: 0,
      });
    }
    // Dust puff
    for (let i = 0; i < 3; i++) {
      this.smoke.spawn({
        pos: pos.clone().addScaledVector(normal, 0.05),
        vel: normal.clone().multiplyScalar(0.9 + Math.random()).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.5, (Math.random() - 0.5) * 0.8)),
        life: 0.6 + Math.random() * 0.5, size0: 0.14, size1: 0.75 + Math.random() * 0.4,
        color0: new THREE.Color(0.62, 0.56, 0.47), color1: new THREE.Color(0.55, 0.5, 0.42),
        alpha0: 0.65, alpha1: 0, drag: 2.2, fadeIn: 0,
      });
    }
  }

  impactDirt(pos) {
    for (let i = 0; i < 4; i++) {
      this.smoke.spawn({
        pos: pos.clone(),
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.4, 1.6 + Math.random() * 1.6, (Math.random() - 0.5) * 1.4),
        life: 0.7 + Math.random() * 0.5, size0: 0.18, size1: 0.9,
        color0: new THREE.Color(0.66, 0.58, 0.45), color1: new THREE.Color(0.6, 0.53, 0.42),
        alpha0: 0.7, alpha1: 0, drag: 1.6, grav: 1.2, fadeIn: 0,
      });
    }
  }

  bloodPuff(pos, dir) {
    for (let i = 0; i < 5; i++) {
      this.smoke.spawn({
        pos: pos.clone(),
        vel: dir.clone().multiplyScalar(1 + Math.random() * 1.6).add(new THREE.Vector3((Math.random() - 0.5) * 1.6, Math.random() * 1.2, (Math.random() - 0.5) * 1.6)),
        life: 0.35 + Math.random() * 0.3, size0: 0.1, size1: 0.5,
        color0: new THREE.Color(0.36, 0.04, 0.03), color1: new THREE.Color(0.22, 0.03, 0.02),
        alpha0: 0.8, alpha1: 0, grav: 3, fadeIn: 0,
      });
    }
  }

  muzzle(pos, dir) {
    this._shotN++;
    const mul = this._shotN % 4 === 0 ? 1.6 : 1.0; // every 4th shot blooms bigger
    // Radial sprite — 2 frames, small, and skipped entirely on ~30% of shots
    if (Math.random() > 0.3) {
      const sMul = mul > 1 ? 1.3 : 1; // sprite grows less than the tongues
      this.flash.spawn({
        pos: pos.clone(), life: 0.034,
        size0: (0.16 + Math.random() * 0.09) * sMul, size1: 0.12 * sMul,
        alpha0: 0.9, alpha1: 0.25, fadeIn: 0, rot: Math.random() * 6.3,
      });
    }
    // Barrel-aligned tongues, random roll
    const tn = this.tongues.find((x) => !x.active);
    if (tn) {
      tn.active = true;
      tn.age = 0;
      tn.mesh.visible = true;
      tn.mesh.material.opacity = 1;
      tn.mesh.position.copy(pos);
      this._q1.setFromUnitVectors(_FWD, dir);
      this._q2.setFromAxisAngle(dir, Math.random() * Math.PI * 2);
      tn.mesh.quaternion.multiplyQuaternions(this._q2, this._q1);
      const w = (0.9 + Math.random() * 0.4) * mul;
      tn.mesh.scale.set(w, w, (0.85 + Math.random() * 0.5) * mul);
    }
    // Dedicated muzzle light
    this.muzzleLight.position.copy(pos);
    this.muzzleLight.visible = true;
    this._muzzleAge = 0;
    this._muzzleIntensity = 40 * mul;
    // Smoke wisp
    this.smoke.spawn({
      pos: pos.clone().addScaledVector(dir, 0.15),
      vel: dir.clone().multiplyScalar(1.1).add(new THREE.Vector3(0, 0.7, 0)),
      life: 0.7, size0: 0.1, size1: 0.55,
      color0: new THREE.Color(0.55, 0.53, 0.5), color1: new THREE.Color(0.5, 0.48, 0.46),
      alpha0: 0.28, alpha1: 0, drag: 2.4, fadeIn: 0,
    });
  }

  addSmokeColumn(pos, duration = 26) {
    this.columns.push({ pos: pos.clone(), remaining: duration, total: duration, next: 0 });
  }
}
