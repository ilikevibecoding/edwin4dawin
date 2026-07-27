import * as THREE from 'three';
import { rand, randRange, randSpread } from '../core/rand.js';

const VERT = /* glsl */`
  attribute vec3 iPos;
  attribute vec4 iVel;      // xyz vel, w rotSpeed
  attribute vec4 iParams;   // x birth, y life, z size0, w size1
  attribute vec4 iColor;    // rgb tint (HDR), a alpha
  attribute vec4 iMisc;     // x rot0, y gravity, z drag, w fadeIn
  attribute vec4 iExtra;    // x atlasTile, y rampMix, z velStretch, w fadeOutStart
  attribute float iAspect;  // non-uniform quad scale (x axis), randomized per particle
  uniform float uTime;
  uniform vec2 uAtlas;      // cols, rows
  uniform vec3 uSunDir;     // world-space dir TO the sun
  uniform vec2 uNear;       // near-fade start/end distances
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vFogDepth;
  varying float vShade;     // -1..1 gradient across the sprite toward the sun

  // white-hot -> yellow -> burning orange-red -> deep red -> extinguished
  vec3 fireRamp(float t) {
    vec3 c = mix(vec3(3.8, 3.5, 3.0), vec3(3.2, 1.8, 0.42), smoothstep(0.0, 0.1, t));
    c = mix(c, vec3(1.5, 0.34, 0.045), smoothstep(0.1, 0.32, t));
    c = mix(c, vec3(0.42, 0.09, 0.02), smoothstep(0.32, 0.66, t));
    c = mix(c, vec3(0.018, 0.013, 0.01), smoothstep(0.66, 1.0, t));
    return c;
  }

  void main() {
    float age = uTime - iParams.x;
    float lifeT = clamp(age / iParams.y, 0.0, 1.0);

    // integrate with drag: p = p0 + v*(1-exp(-d t))/d, then gravity
    float d = max(iMisc.z, 0.0001);
    float k = (1.0 - exp(-d * age)) / d;
    vec3 pos = iPos + iVel.xyz * k;
    pos.y -= 0.5 * iMisc.y * age * age;

    float size = mix(iParams.z, iParams.w, lifeT);
    float rot = iMisc.x + iVel.w * age;

    float fadeIn = smoothstep(0.0, max(iMisc.w, 0.0001), lifeT);
    float fos = iExtra.w <= 0.0 ? 0.6 : iExtra.w;
    float fadeOut = 1.0 - smoothstep(fos, 1.0, lifeT);
    vec3 col = iColor.rgb;
    if (iExtra.y > 0.5) col *= fireRamp(lifeT);
    vColor = vec4(col, iColor.a * fadeIn * fadeOut);
    if (lifeT >= 1.0) size = 0.0;

    vec2 corner = position.xy; // unit quad -0.5..0.5
    // non-uniform scale on a random axis (rotation randomizes the axis):
    // elongated blobs break the perfect-circle silhouette
    corner.x *= max(iAspect, 0.0001);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    // near fade: big sprites dissolve before crossing the camera plane so a
    // danger-close blast never smears a flat color film over the whole frame
    vColor.a *= smoothstep(uNear.x, uNear.y, -mv.z);
    vShade = 0.0;

    if (iExtra.z > 0.0) {
      // velocity-aligned stretched billboard (sparks/embers)
      vec3 curV = iVel.xyz * exp(-d * age);
      curV.y -= iMisc.y * age;
      float speed = length(curV);
      vec3 vv = (modelViewMatrix * vec4(curV, 0.0)).xyz;
      vec2 axis = vv.xy;
      float al = length(axis);
      vec2 along = al > 1e-4 ? axis / al : vec2(1.0, 0.0);
      vec2 across = vec2(-along.y, along.x);
      float lenMul = 1.0 + iExtra.z * speed;
      mv.xy += along * (corner.y * size * lenMul) + across * (corner.x * size);
    } else {
      float cs = cos(rot), sn = sin(rot);
      vec2 rc = vec2(corner.x * cs - corner.y * sn, corner.x * sn + corner.y * cs);
      mv.xy += rc * size;
      // screen-space direction toward the sun -> lighting gradient across quad
      vec2 sv = (viewMatrix * vec4(uSunDir, 0.0)).xy;
      float sl = length(sv);
      if (sl > 1e-4) vShade = clamp(2.0 * dot(rc, sv / sl), -1.0, 1.0);
    }

    vFogDepth = -mv.z;
    float tiles = uAtlas.x * uAtlas.y;
    float tile = mod(iExtra.x, tiles);
    vec2 tuv = vec2(mod(tile, uAtlas.x), floor(tile / uAtlas.x));
    vUv = (position.xy + 0.5 + tuv) / uAtlas;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */`
  uniform sampler2D uMap;
  uniform vec3 uFogColor;
  uniform vec3 uFogParams;  // x: near|density, y: far, z: type (0 none, 1 linear, 2 exp2)
  uniform vec3 uSunCol;
  uniform vec2 uSunShade;   // x: multiplicative strength, y: additive sun-side lift
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vFogDepth;
  varying float vShade;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    vec3 col = vColor.rgb * tex.rgb;
    float a = vColor.a * tex.a;
    // fake directional shading: sun side of the puff lighter, far side darker
    col = col * (1.0 + uSunShade.x * vShade) + uSunCol * (uSunShade.y * max(vShade, 0.0) * tex.a);
    // scene fog (custom ShaderMaterial gets none automatically)
    float fogF = 0.0;
    if (uFogParams.z > 1.5) {
      float dd = uFogParams.x * vFogDepth;
      fogF = 1.0 - exp(-dd * dd);
    } else if (uFogParams.z > 0.5) {
      fogF = clamp((vFogDepth - uFogParams.x) / max(uFogParams.y - uFogParams.x, 1e-3), 0.0, 1.0);
    }
    #ifdef FOG_ADDITIVE
      col *= 1.0 - fogF;         // additive light dies into haze, never turns gray
    #else
      col = mix(col, uFogColor, fogF);
    #endif
    gl_FragColor = vec4(col, a);
    if (a < 0.003) discard;
  }
`;

const _col = new THREE.Color();

/**
 * Pool of GPU-integrated billboard quads (instanced). Supports texture
 * atlases (random tile per particle), a built-in HDR fire color ramp
 * (ramp: 1) and velocity-aligned stretching (stretch > 0) for sparks.
 */
export class ParticlePool {
  constructor(scene, texture, {
    max = 1500, blending = THREE.NormalBlending, depthWrite = false,
    hdrBoost = 1, atlas = null, renderOrder = null,
    sunShade = 0, sunLift = 0, nearFade = [0.5, 2.4],
  } = {}) {
    this.max = max;
    this.cursor = 0;
    this.time = 0;
    this.hdrBoost = hdrBoost;
    this.tiles = atlas ? atlas.cols * atlas.rows : 1;

    const geo = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    geo.index = quad.index;
    geo.setAttribute('position', quad.getAttribute('position'));
    geo.instanceCount = 0;

    const mk = (itemSize) => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(max * itemSize), itemSize);
      a.setUsage(THREE.DynamicDrawUsage);
      return a;
    };
    this.aPos = mk(3); this.aVel = mk(4); this.aParams = mk(4); this.aColor = mk(4); this.aMisc = mk(4); this.aExtra = mk(4); this.aAspect = mk(1);
    geo.setAttribute('iPos', this.aPos);
    geo.setAttribute('iVel', this.aVel);
    geo.setAttribute('iParams', this.aParams);
    geo.setAttribute('iColor', this.aColor);
    geo.setAttribute('iMisc', this.aMisc);
    geo.setAttribute('iExtra', this.aExtra);
    geo.setAttribute('iAspect', this.aAspect);

    // mark all dead (aspect defaults to 1 so old callers render unchanged)
    for (let i = 0; i < max; i++) {
      this.aParams.array[i * 4 + 0] = -1e9; this.aParams.array[i * 4 + 1] = 1;
      this.aAspect.array[i] = 1;
    }

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uMap: { value: texture },
        uAtlas: { value: new THREE.Vector2(atlas?.cols ?? 1, atlas?.rows ?? 1) },
        uFogColor: { value: new THREE.Color(0xd8a878) },
        uFogParams: { value: new THREE.Vector3(0, 0, 0) },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunCol: { value: new THREE.Color(0xffbe85) },
        uSunShade: { value: new THREE.Vector2(sunShade, sunLift) },
        uNear: { value: new THREE.Vector2(nearFade[0], nearFade[1]) },
      },
      defines: blending === THREE.AdditiveBlending ? { FOG_ADDITIVE: '' } : {},
      transparent: true,
      depthWrite,
      blending,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = renderOrder ?? (blending === THREE.AdditiveBlending ? 20 : 19);
    scene.add(this.mesh);
    this.geo = geo;
  }

  /**
   * @param {object} p — {pos, vel, life, size0, size1, color(THREE.Color|number),
   *   alpha, rot, rotSpeed, gravity, drag, fadeIn, fadeOut(start 0..1),
   *   tile(atlas index; default random), ramp(1 = fire color ramp), stretch(vel stretch factor)}
   */
  emit(p) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    const col = p.color instanceof THREE.Color ? p.color : _col.set(p.color ?? 0xffffff);
    const i3 = i * 3, i4 = i * 4;
    this.aPos.array[i3] = p.pos.x; this.aPos.array[i3 + 1] = p.pos.y; this.aPos.array[i3 + 2] = p.pos.z;
    this.aVel.array[i4] = p.vel?.x ?? 0; this.aVel.array[i4 + 1] = p.vel?.y ?? 0; this.aVel.array[i4 + 2] = p.vel?.z ?? 0; this.aVel.array[i4 + 3] = p.rotSpeed ?? 0;
    this.aParams.array[i4] = this.time; this.aParams.array[i4 + 1] = p.life ?? 1;
    this.aParams.array[i4 + 2] = p.size0 ?? 0.5; this.aParams.array[i4 + 3] = p.size1 ?? p.size0 ?? 0.5;
    const b = this.hdrBoost;
    this.aColor.array[i4] = col.r * b; this.aColor.array[i4 + 1] = col.g * b; this.aColor.array[i4 + 2] = col.b * b; this.aColor.array[i4 + 3] = p.alpha ?? 1;
    this.aMisc.array[i4] = p.rot ?? rand() * Math.PI * 2; this.aMisc.array[i4 + 1] = p.gravity ?? 0;
    this.aMisc.array[i4 + 2] = p.drag ?? 0.0001; this.aMisc.array[i4 + 3] = p.fadeIn ?? 0.02;
    this.aExtra.array[i4] = p.tile ?? Math.floor(rand() * this.tiles);
    this.aExtra.array[i4 + 1] = p.ramp ?? 0;
    this.aExtra.array[i4 + 2] = p.stretch ?? 0;
    this.aExtra.array[i4 + 3] = p.fadeOut ?? 0;
    this.aAspect.array[i] = p.aspect ?? 1;
    this._dirty = true;
  }

  burst(n, fn) { for (let i = 0; i < n; i++) this.emit(fn(i)); }

  /** Feed scene fog + sun into the shader each frame (values copied, no allocs). */
  setEnv(fog, sunDir, sunCol) {
    const u = this.material.uniforms;
    if (fog) {
      if (fog.isFogExp2) u.uFogParams.value.set(fog.density, 0, 2);
      else u.uFogParams.value.set(fog.near, fog.far, 1);
      u.uFogColor.value.copy(fog.color);
    } else {
      u.uFogParams.value.z = 0;
    }
    if (sunDir) u.uSunDir.value.copy(sunDir);
    if (sunCol) u.uSunCol.value.copy(sunCol);
  }

  update(dt) {
    this.time += dt;
    this.material.uniforms.uTime.value = this.time;
    if (this._dirty) {
      this.aPos.needsUpdate = this.aVel.needsUpdate = this.aParams.needsUpdate =
        this.aColor.needsUpdate = this.aMisc.needsUpdate = this.aExtra.needsUpdate =
        this.aAspect.needsUpdate = true;
      this.geo.instanceCount = this.max;
      this._dirty = false;
    }
  }
}

/**
 * Jagged low-poly chunk geometry with mottled vertex colors. Duplicated
 * verts are perturbed via a position hash so faces stay welded and the
 * silhouette goes irregular instead of "flying cube".
 */
function chunkGeometry(base, jag = 0.32) {
  const geo = base;
  const pos = geo.getAttribute('position');
  const seen = new Map();
  const keys = new Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    keys[i] = key;
    let e = seen.get(key);
    if (!e) {
      e = {
        dx: randSpread(jag), dy: randSpread(jag), dz: randSpread(jag),
        v: randRange(0.68, 1.18),
      };
      seen.set(key, e);
    }
    pos.setXYZ(i, pos.getX(i) * (1 + e.dx), pos.getY(i) * (1 + e.dy), pos.getZ(i) * (1 + e.dz));
  }
  // baked vertical gradient: undersides darker so chunks read as ambient-
  // occluded volumes with a shadowed belly, not uniformly-shaded dice
  geo.computeBoundingBox();
  const minY = geo.boundingBox.min.y;
  const spanY = Math.max(geo.boundingBox.max.y - minY, 1e-4);
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const h = (pos.getY(i) - minY) / spanY;
    const v = seen.get(keys[i]).v * (0.5 + 0.5 * h);
    colors[i * 3] = v; colors[i * 3 + 1] = v * randRange(0.97, 1.0); colors[i * 3 + 2] = v * randRange(0.92, 0.98);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Debris spread across several chunk shapes (rock/slab/shard) so bursts
 * read as rubble, not repeated boxes. Same spawn API as DebrisPool.
 */
export class DebrisGroup {
  constructor(scene, { max = 320 } = {}) {
    const geos = [
      chunkGeometry(new THREE.IcosahedronGeometry(0.52, 0), 0.45),
      chunkGeometry(new THREE.BoxGeometry(1, 0.45, 0.7), 0.46),
      chunkGeometry(new THREE.ConeGeometry(0.44, 1.05, 5), 0.38),
    ];
    // flat shading gives every facet its own lambert term -> crisp lit-face /
    // shadow-face contrast while tumbling; roughness varies per shape family
    const rough = [0.82, 0.92, 1.0];
    const per = Math.ceil(max / geos.length);
    this.pools = geos.map((g, i) => new DebrisPool(scene, {
      max: per, geometry: g,
      material: new THREE.MeshStandardMaterial({
        color: 0xffffff, roughness: rough[i], vertexColors: true, flatShading: true,
      }),
    }));
  }

  spawn(o) { this.pools[Math.floor(rand() * this.pools.length) % this.pools.length].spawn(o); }

  set onBounce(fn) { for (const p of this.pools) p.onBounce = fn; }

  update(dt) { for (const p of this.pools) p.update(dt); }
}

/**
 * Instanced debris chunks with CPU physics (bounce on ground plane).
 * Supports non-uniform per-item scale (splinters, shells) and an
 * onBounce(pos, speed) hook for audio.
 */
export class DebrisPool {
  constructor(scene, { max = 260, geometry = null, material = null } = {}) {
    this.max = max;
    const geo = geometry ?? new THREE.BoxGeometry(1, 1, 1);
    const mat = material ?? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.castShadow = false;
    this.mesh.frustumCulled = false;
    this.mesh.count = max;
    this.items = new Array(max).fill(null).map(() => ({
      alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
      rot: new THREE.Euler(), spin: new THREE.Vector3(), scale3: new THREE.Vector3(1, 1, 1),
      size: 0.05, life: 1, age: 0, ground: 0, restitution: 0.32, bounced: false,
    }));
    this.cursor = 0;
    this.onBounce = null;
    const dummy = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < max; i++) this.mesh.setMatrixAt(i, dummy);
    scene.add(this.mesh);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._s = new THREE.Vector3();
    this.colorAttr = new Float32Array(max * 3).fill(1);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(this.colorAttr, 3);
  }

  /**
   * @param {object} o — {pos, vel, size, life, color, spin, scale3:{x,y,z}, ground, restitution, sizeJitter}
   */
  spawn({ pos, vel, size = 0.06, life = 3, color = null, spin = 8, scale3 = null, ground = 0, restitution = 0.32, sizeJitter = true }) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    const it = this.items[i];
    it.alive = true;
    it.pos.copy(pos);
    it.vel.copy(vel);
    it.size = sizeJitter ? size * randRange(0.6, 1.5) : size;
    it.life = life * randRange(0.7, 1.2);
    it.age = 0;
    it.ground = ground;
    it.restitution = restitution;
    it.bounced = false;
    it.rot.set(rand() * 6.28, rand() * 6.28, rand() * 6.28);
    it.spin.set(randSpread(spin), randSpread(spin), randSpread(spin));
    if (scale3) it.scale3.set(scale3.x, scale3.y, scale3.z);
    else it.scale3.set(1, 1, 1);
    if (color != null) {
      _col.set(color);
      this.colorAttr[i * 3] = _col.r; this.colorAttr[i * 3 + 1] = _col.g; this.colorAttr[i * 3 + 2] = _col.b;
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  update(dt) {
    let any = false;
    for (let i = 0; i < this.max; i++) {
      const it = this.items[i];
      if (!it.alive) continue;
      any = true;
      it.age += dt;
      if (it.age > it.life) {
        it.alive = false;
        this._m.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, this._m);
        continue;
      }
      it.vel.y -= 14 * dt;
      it.pos.addScaledVector(it.vel, dt);
      const floor = it.ground + it.size * 0.5;
      if (it.pos.y < floor) {
        it.pos.y = floor;
        if (Math.abs(it.vel.y) > 0.5) {
          it.vel.y = -it.vel.y * it.restitution;
          if (!it.bounced) { it.bounced = true; this.onBounce?.(it.pos, Math.abs(it.vel.y)); }
        } else it.vel.y = 0;
        it.vel.x *= 0.82; it.vel.z *= 0.82;
        it.spin.multiplyScalar(0.6);
      }
      it.rot.x += it.spin.x * dt; it.rot.y += it.spin.y * dt; it.rot.z += it.spin.z * dt;
      const fade = it.age / it.life > 0.85 ? 1 - (it.age / it.life - 0.85) / 0.15 : 1;
      this._q.setFromEuler(it.rot);
      this._s.set(it.size * it.scale3.x * fade, it.size * it.scale3.y * fade, it.size * it.scale3.z * fade);
      this._m.compose(it.pos, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
