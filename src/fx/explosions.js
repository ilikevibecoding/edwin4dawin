import * as THREE from 'three';
import { makeRNG } from '../core/utils.js';

const rng = makeRNG(60606);

// ===========================================================================
// Explosion effect — AAA anatomy, all scaled by `size`:
//  0-80ms   blinding core flash + expanding ground shockwave ring (mesh)
//  80-400ms roiling fireball: many overlapping puffs, white-hot -> orange ->
//           smoldering dark, buoyant; ember streaks w/ gravity + smoke trails
//  0.4-4s   dense black-grey pillar rising (staged emission, sun-side lit)
//  0-1s     ground dust ring racing outward (stretched streaks + puffs)
//  ~10s     lingering ground haze
// Plus: pooled flash lights (blinding warm peak -> ember decay, large
// radius so facades/street flush orange), lingering ember glow lights,
// scorch decal, camera shake, radial damage, danger-close dust + a warm
// near-camera light pulse so the whole frame kicks.
// ===========================================================================

function ringTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  g.addColorStop(0.0, 'rgba(255,255,255,0)');
  g.addColorStop(0.62, 'rgba(255,255,255,0)');
  g.addColorStop(0.78, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.88, 'rgba(255,255,255,1)');
  g.addColorStop(1.0, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

// Fresnel-rim shockwave dome: bright expanding shell edge, readable from
// eye level (unlike the flat ground ring which is edge-on at distance).
const domeVert = /* glsl */`
  varying float vRim;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vec3 v = normalize(-mv.xyz);
    vRim = pow(1.0 - abs(dot(n, v)), 2.6);
    gl_Position = projectionMatrix * mv;
  }
`;
const domeFrag = /* glsl */`
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vRim;
  void main() {
    gl_FragColor = vec4(uColor * vRim, vRim * uOpacity);
    if (gl_FragColor.a < 0.004) discard;
  }
`;

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();

const COL = {
  flashCore: new THREE.Color(1, 0.97, 0.86).multiplyScalar(11),
  flashWarm: new THREE.Color(1, 0.66, 0.26).multiplyScalar(5),
  flashTail: new THREE.Color(0.9, 0.32, 0.07).multiplyScalar(2.2),
  fire0: new THREE.Color(1, 0.94, 0.72).multiplyScalar(5),
  fireMid: new THREE.Color(1, 0.42, 0.1).multiplyScalar(3.1),
  fire1: new THREE.Color(0.3, 0.08, 0.02),
  // Hot additive core lobes buried INSIDE the alpha mantle: the "lit from
  // within" source that silhouettes the soot rolling over it.
  coreHot: new THREE.Color(1, 0.93, 0.7).multiplyScalar(6.5),
  coreMid: new THREE.Color(1, 0.44, 0.11).multiplyScalar(3.2),
  coreEnd: new THREE.Color(0.4, 0.09, 0.02),
  // Alpha-blended fireball chunks: occlude each other -> real structure,
  // and their dark tail silhouettes against the sky.
  fireA0: new THREE.Color(1, 0.9, 0.6).multiplyScalar(3.4),
  fireAMid: new THREE.Color(1, 0.4, 0.1).multiplyScalar(2.1),
  fireA1: new THREE.Color(0.055, 0.05, 0.046),
  // Outer soot shell: born dim-orange-underlit and near-black within
  // ~150ms, so even 100ms-old fireballs read hot-core / dark-rim.
  soot0: new THREE.Color(0.52, 0.19, 0.06).multiplyScalar(1.4),
  sootMid: new THREE.Color(0.1, 0.085, 0.075),
  soot1: new THREE.Color(0.05, 0.048, 0.046),
  darken0: new THREE.Color(0.4, 0.19, 0.07),
  darkenMid: new THREE.Color(0.15, 0.1, 0.07),
  darken1: new THREE.Color(0.085, 0.08, 0.075),
  // Ember brightness sits just over the bloom threshold: hot orange trails,
  // not white confetti dots against the sky.
  ember0: new THREE.Color(1, 0.7, 0.3).multiplyScalar(3.4),
  emberMid: new THREE.Color(1, 0.42, 0.1).multiplyScalar(2.6),
  ember1: new THREE.Color(0.5, 0.11, 0.02),
  pillar0: new THREE.Color(0.1, 0.09, 0.082),
  pillar1: new THREE.Color(0.26, 0.24, 0.22),
  dust0: new THREE.Color(0.5, 0.43, 0.34),
  dust1: new THREE.Color(0.36, 0.32, 0.27),
  haze0: new THREE.Color(0.27, 0.25, 0.21),
  haze1: new THREE.Color(0.35, 0.32, 0.28),
  // Post-blast street dust: sunlit tan fading toward neutral grey-brown.
  linger0: new THREE.Color(0.44, 0.40, 0.34),
  linger1: new THREE.Color(0.30, 0.285, 0.26),
  trailSmoke0: new THREE.Color(0.24, 0.225, 0.21),
  trailSmoke1: new THREE.Color(0.17, 0.165, 0.155),
  trailHead: new THREE.Color(1, 0.6, 0.22).multiplyScalar(2.8),
  lickFire0: new THREE.Color(1, 0.55, 0.14).multiplyScalar(3.4),
  lickFire1: new THREE.Color(0.55, 0.13, 0.03),
};

const MAX_TRAILERS = 48;

// Detonation light grading: blinding warm peak that cools toward deep
// ember orange as it decays. Kept saturated so the spill on facades reads
// as FIRE light, not just a brighter dusk.
const FLASH_WARM = new THREE.Color(0xff9838);
const FLASH_COOL = new THREE.Color(0xff7020);
// Light column drift so stacked pillars lean like real strike footage.
const PILLAR_WIND = new THREE.Vector3(0.55, 0, -0.22);
// Very gentle acceleration for the 15-25s lingering street dust; with the
// low drag it settles to a slow ~0.3-0.4 m/s downwind creep.
const DRIFT_WIND = new THREE.Vector3(0.14, 0.012, -0.06);

// ---------------------------------------------------------------------------
// Instanced debris chunks: charred shards on ballistic arcs with tumble,
// smoke trailers on the big ones; they bounce, rest a moment, then sink.
// ---------------------------------------------------------------------------
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const DEBRIS_MAX = 48;

class DebrisPool {
  constructor(scene, particles) {
    this.particles = particles;
    const geo = new THREE.TetrahedronGeometry(0.62, 0);
    this.mesh = new THREE.InstancedMesh(
      geo,
      new THREE.MeshStandardMaterial({ roughness: 0.94, metalness: 0.05 }),
      DEBRIS_MAX
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    this.chunks = [];
    const col = new THREE.Color();
    for (let i = 0; i < DEBRIS_MAX; i++) {
      this.chunks.push({
        pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        rot: new THREE.Euler(), angVel: new THREE.Vector3(),
        scale: new THREE.Vector3(), baseY: 0.2,
        state: 0, age: 0, life: 0, bounces: 0, smokeAcc: 0, big: false,
      });
      this.mesh.setColorAt(i, col.setRGB(0, 0, 0));
      this.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
    }
    this.cursor = 0;
    this.color = col;
  }

  launch(pos, s, count) {
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % DEBRIS_MAX;
      const c = this.chunks[i];
      const a = rng() * Math.PI * 2;
      // First two chunks per burst are LARGE (0.4-0.8m) with smoke-trailed
      // arcs. Launch speeds kept low enough that chunks arc against the
      // buildings, not 40m into the sky (sunlit chunks that high read as
      // white confetti on the skyline).
      const big = n < 2;
      const hs = (big ? 3 + rng() * 5 : 4 + rng() * 7) * s;
      c.pos.set(pos.x + (rng() - 0.5) * 1.6 * s, pos.y + 0.5 + rng() * 0.8, pos.z + (rng() - 0.5) * 1.6 * s);
      c.vel.set(Math.cos(a) * hs, (big ? 8 + rng() * 5 : 5 + rng() * 6) * s, Math.sin(a) * hs);
      c.rot.set(rng() * 6.28, rng() * 6.28, rng() * 6.28);
      c.angVel.set((rng() - 0.5) * 14, (rng() - 0.5) * 14, (rng() - 0.5) * 14);
      const base = (big ? 0.24 + rng() * 0.18 : 0.11 + rng() * 0.17) * s;
      c.scale.set(base * (0.6 + rng() * 0.9), base * (0.45 + rng() * 1.0), base * (0.6 + rng() * 0.9));
      c.baseY = Math.max(c.scale.x, c.scale.y, c.scale.z) * 0.45;
      c.state = 1;
      c.age = 0;
      c.life = 2.6 + rng() * 1.3;
      c.bounces = 0;
      c.smokeAcc = 0;
      c.big = big;
      // charred black vs scorched concrete (kept dark: full sun on a pale
      // chunk reads bright white against the sky)
      this.mesh.setColorAt(i, rng() < 0.6
        ? this.color.setRGB(0.05, 0.046, 0.042)
        : this.color.setRGB(0.19, 0.17, 0.145));
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt) {
    let any = false;
    for (let i = 0; i < DEBRIS_MAX; i++) {
      const c = this.chunks[i];
      if (c.state === 0) continue;
      any = true;
      c.age += dt;
      if (c.state === 1) {
        c.vel.y -= 24 * dt;
        c.pos.addScaledVector(c.vel, dt);
        c.rot.x += c.angVel.x * dt;
        c.rot.y += c.angVel.y * dt;
        c.rot.z += c.angVel.z * dt;
        if (c.pos.y < c.baseY) {
          c.pos.y = c.baseY;
          if (c.bounces < 1 && Math.abs(c.vel.y) > 3) {
            c.bounces++;
            c.vel.y = Math.abs(c.vel.y) * 0.28;
            c.vel.x *= 0.45; c.vel.z *= 0.45;
            c.angVel.multiplyScalar(0.4);
          } else {
            c.state = 2;
          }
        }
        // smoke trailer on the big chunks while airborne (dense enough that
        // fast chunks leave a connected ribbon, not a dotted line)
        if (c.big) {
          c.smokeAcc += dt;
          while (c.smokeAcc >= 0.03) {
            c.smokeAcc -= 0.03;
            this.particles.emit({
              pos: c.pos, count: 1, spread: 0.12,
              life: [0.55, 1.0], size: [0.85, 2.0], sizeEase: 0.6,
              color0: COL.trailSmoke0, color1: COL.trailSmoke1,
              alpha: 0.5, gravity: -0.3, drag: 1.1,
              fadeIn: 0.05, fadeOutStart: 0.3, spinVel: 0.8, tex: 2,
            });
          }
        }
      } else if (c.age > c.life) {
        // sink away
        c.pos.y -= 0.6 * dt;
        if (c.pos.y < -c.baseY * 2.5) {
          c.state = 0;
          this.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
          continue;
        }
      }
      _q.setFromEuler(c.rot);
      _m.compose(c.pos, _q, c.scale);
      this.mesh.setMatrixAt(i, _m);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }
}

export class ExplosionFX {
  constructor(scene, particles, impacts, player, audio) {
    this.scene = scene;
    this.particles = particles;
    this.impacts = impacts;
    this.player = player;
    this.audio = audio;
    this.enemyManager = null; // wired in main

    // --- pooled detonation lights ---
    // Flash: holds a blinding warm peak ~0.15s (facades + street flush
    // orange, bloom kicks), then a power-curve decay over ~1.35s while the
    // color cools toward ember orange. Large radius: a detonation 60m out
    // must still throw color onto the surrounding block.
    this.lights = [];
    for (let i = 0; i < 8; i++) {
      const l = new THREE.PointLight(0xffa040, 0, 60, 2);
      scene.add(l);
      this.lights.push({ light: l, t: 99, peak: 0, hold: 0.15, fall: 1.35 });
    }
    // Ember glow: weak, low to the ground, smolders ~2.2s inside the young
    // smoke with a slow flicker — carries the warmth after the flash dies.
    this.emberLights = [];
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xff6a1a, 0, 30, 2);
      scene.add(l);
      this.emberLights.push({ light: l, t: 99, peak: 0, dur: 2.2, seed: i * 2.41 });
    }
    this.time = 0;

    // --- pooled ground shockwave rings ---
    this.rings = [];
    const ringTex = ringTexture();
    const ringGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: ringTex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending,
        color: new THREE.Color(1, 0.82, 0.55).multiplyScalar(2.4),
      });
      const m = new THREE.Mesh(ringGeo, mat);
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      m.renderOrder = 21;
      scene.add(m);
      this.rings.push({ mesh: m, t: 99, dur: 0.5, R: 10 });
    }

    // --- pooled shockwave domes ---
    this.domes = [];
    const domeGeo = new THREE.SphereGeometry(1, 20, 12);
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(1.6, 1.35, 1.05) },
          uOpacity: { value: 0 },
        },
        vertexShader: domeVert,
        fragmentShader: domeFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const m = new THREE.Mesh(domeGeo, mat);
      m.visible = false;
      m.renderOrder = 22;
      scene.add(m);
      this.domes.push({ mesh: m, t: 99, dur: 0.34, R: 9 });
    }

    // --- staged pillar bursts + ember trailers + debris chunks ---
    this.bursts = [];
    this.trailers = [];
    this.debris = new DebrisPool(scene, particles);
  }

  // ----- staged smoke pillar wave -----
  // Emission climbs with k so the column stacks tall (base ~18m up by the
  // final wave, buoyant puffs carrying the top well past 30m) and leans
  // downwind like real strike footage.
  emitPillar(pos, s, k) {
    const p = this.particles;
    _v.copy(pos); _v.y += (1.6 + k * 9.0) * s;
    p.emit({
      pos: _v, count: k < 0.5 ? 3 : 2, vel: _v2.set(0, 5.5 * s, 0), spread: 0.6 * s, spreadY: 0.5,
      life: [3.6 + k * 1.6, 7.4 + k * 3.0], size: [3.4 * s, 8.2 * s], sizeEase: 0.5,
      color0: COL.pillar0, color1: COL.pillar1,
      alpha: 0.94, gravity: -1.1, drag: 0.9, turb: 0.55, wind: PILLAR_WIND,
      fadeIn: 0.1, fadeOutStart: 0.5, posJitter: 1.0 * s, spinVel: 0.65, tex: 2,
    });
    // internal fire licks near the base while young
    if (k < 0.55) {
      _v.copy(pos); _v.y += (1.1 + k * 3.8) * s;
      p.emit({
        pos: _v, count: 1, vel: _v2.set(0, 3.6 * s, 0), spread: 0.7 * s,
        life: [0.3, 0.6], size: [1.2 * s, 2.4 * s], sizeEase: 0.5,
        color0: COL.lickFire0, color1: COL.lickFire1,
        alpha: 0.9, additive: true, gravity: -3, drag: 1.6,
        fadeIn: 0.05, fadeOutStart: 0.4, posJitter: 0.9 * s, tex: 1,
      });
    }
  }

  explode(pos, { size = 1, damage = 120, radius = 9 } = {}) {
    const p = this.particles;
    const s = size;

    // ---- 1. Core: BLINDING pop but STRICTLY the first ~100-140ms. A long
    // or large white stage is what reads as a structureless bloomed sphere;
    // orange fire + black soot must own the frame immediately after. ----
    _v.copy(pos); _v.y += 1.2 * s;
    p.emit({
      pos: _v, count: 2, vel: _v2.set(0, 1, 0), spread: 0.4,
      life: [0.04, 0.08], size: [1.8 * s, 2.8 * s],
      color0: COL.flashCore, color1: COL.flashWarm,
      alpha: 1, additive: true, fadeIn: 0.001, fadeOutStart: 0.25, tex: 0,
    });
    p.emit({
      pos: _v, count: 2, vel: _v2.set(0, 1.5, 0), spread: 0.3,
      life: [0.07, 0.13], size: [1.7 * s, 3.2 * s], sizeEase: 0.5,
      color0: COL.flashWarm, color1: COL.flashTail,
      alpha: 0.36, additive: true, fadeIn: 0.01, fadeOutStart: 0.3, tex: 1,
    });

    // ---- 2. Shockwave: ground ring mesh + fresnel dome shell ----
    if (pos.y < 2.5) {
      const slot = this.rings.reduce((a, b) => (a.t > b.t ? a : b));
      slot.t = 0;
      slot.dur = 0.55;
      slot.R = 13 * s;
      slot.mesh.position.set(pos.x, 0.07 + rng() * 0.03, pos.z);
      slot.mesh.visible = true;
    }
    {
      const slot = this.domes.reduce((a, b) => (a.t > b.t ? a : b));
      slot.t = 0;
      slot.dur = 0.34;
      slot.R = 8.5 * s;
      slot.mesh.position.copy(pos).setY(pos.y + 0.6);
      slot.mesh.visible = true;
    }

    // ---- 3. Fireball, layered inside-out for a volumetric read:
    // (a) hot additive core lobes buried deep — the light source within;
    // (b) mid mantle of alpha fire chunks, white-hot -> orange -> soot,
    //     occluding each other so individual rolling lobes read;
    // (c) outer soot shell born orange-underlit and turning near-black in
    //     ~200ms — the dark self-shadowed rim curling over the hot core;
    // (d) dark caps rising off the top from the very first frames. ----
    _v.copy(pos); _v.y += 1.5 * s;
    p.emit({
      pos: _v, count: 4, sphere: [1.1 * s, 2.6 * s], vel: _v2.set(0, 4.6 * s, 0),
      life: [0.32, 0.68], size: [1.9 * s, 3.1 * s], sizeEase: 0.5,
      color0: COL.coreHot, colorMid: COL.coreMid, midT: 0.16, color1: COL.coreEnd,
      alpha: 0.95, additive: true, gravity: -3.2, drag: 2.1, turb: 0.4,
      fadeIn: 0.01, fadeOutStart: 0.5, posJitter: 0.8 * s, spinVel: 2.2, tex: 1,
    });
    p.emit({
      pos: _v, count: 10, sphere: [2.6 * s, 5.6 * s], vel: _v2.set(0, 3.6 * s, 0),
      life: [0.8, 1.6], size: [3.3 * s, 6.8 * s], sizeEase: 0.4,
      color0: COL.fireA0, colorMid: COL.fireAMid, midT: 0.12, color1: COL.fireA1,
      alpha: 0.95, gravity: -2.6, drag: 2.0, turb: 0.4,
      fadeIn: 0.02, fadeOutStart: 0.55, posJitter: 1.3 * s, spinVel: 2.6, tex: 1,
    });
    // Soot shell: spawned high and rising fast so the dark roll caps the
    // crown and folds down over the fire within the first half second.
    // Sphere speeds kept tight so lobes hug the fireball instead of
    // scattering into detached clouds.
    _v.copy(pos); _v.y += 2.05 * s;
    p.emit({
      pos: _v, count: 17, sphere: [2.8 * s, 5.6 * s], vel: _v2.set(0, 4.4 * s, 0),
      life: [1.15, 2.2], size: [4.0 * s, 8.6 * s], sizeEase: 0.45,
      color0: COL.soot0, colorMid: COL.sootMid, midT: 0.12, color1: COL.soot1,
      alpha: 0.96, gravity: -2.6, drag: 1.9, turb: 0.5,
      fadeIn: 0.03, fadeOutStart: 0.5, posJitter: 1.2 * s, spinVel: 1.9, tex: 2,
    });
    _v.copy(pos); _v.y += 0.9 * s;
    p.emit({
      pos: _v, count: 4, vel: _v2.set(0, 8 * s, 0), spread: 1.6 * s,
      life: [0.2, 0.45], size: [1.6 * s, 2.8 * s], sizeEase: 0.45,
      color0: COL.fire0, colorMid: COL.fireMid, midT: 0.3, color1: COL.fire1,
      alpha: 0.95, additive: true, gravity: -3.5, drag: 2.2,
      fadeIn: 0.01, fadeOutStart: 0.45, posJitter: 0.5 * s, spinVel: 1.8, tex: 1,
    });
    // rising smoke stage: dark caps rolling over the crown from the start
    _v.copy(pos); _v.y += 2.75 * s;
    p.emit({
      pos: _v, count: 9, sphere: [1.7 * s, 4.0 * s], vel: _v2.set(0, 5.0 * s, 0),
      life: [0.95, 1.9], size: [2.8 * s, 6.6 * s], sizeEase: 0.5,
      color0: COL.darken0, colorMid: COL.darkenMid, midT: 0.2, color1: COL.darken1,
      alpha: 0.92, gravity: -2.4, drag: 1.9, turb: 0.5,
      fadeIn: 0.04, fadeOutStart: 0.42, posJitter: 0.9 * s, spinVel: 1.3, tex: 2,
    });

    // ---- 4. Ember streaks (velocity-stretched, gravity arcs) ----
    _v.copy(pos); _v.y += 0.8 * s;
    p.emit({
      pos: _v, count: 28, sphere: [7 * s, 17 * s], vel: _v2.set(0, 8 * s, 0),
      life: [0.7, 1.9], size: [0.18 * s, 0.07 * s],
      color0: COL.ember0, colorMid: COL.emberMid, midT: 0.3, color1: COL.ember1,
      alpha: 1, additive: true, gravity: 26, drag: 0.5, floor: 0.05,
      fadeOutStart: 0.75, stretch: 0.08, lenMax: 5.5 * s,
    });
    // smoldering glow lingering inside the young smoke (kept short/dim so
    // the soot roll wins the crown after the first half second)
    _v.copy(pos); _v.y += 1.3 * s;
    p.emit({
      pos: _v, count: 4, sphere: [0.6 * s, 1.8 * s], vel: _v2.set(0, 2.0 * s, 0),
      life: [0.8, 1.5], size: [1.4 * s, 2.4 * s], sizeEase: 0.5,
      color0: new THREE.Color(0.95, 0.32, 0.08).multiplyScalar(1.7),
      color1: new THREE.Color(0.22, 0.05, 0.01),
      alpha: 0.7, additive: true, gravity: -1.6, drag: 1.4,
      fadeIn: 0.1, fadeOutStart: 0.35, posJitter: 0.8 * s, spinVel: 1.0, tex: 1,
    });
    // Ember trailers with smoke trails (simulated in update). Launch speeds
    // kept low enough that the arcs read against the buildings — trails that
    // top out 35m up just dot the open sky.
    for (let i = 0; i < 8 && this.trailers.length < MAX_TRAILERS; i++) {
      const a = rng() * Math.PI * 2;
      const hs = (3.5 + rng() * 6) * s;
      this.trailers.push({
        pos: pos.clone().add(new THREE.Vector3(0, 0.9 * s, 0)),
        vel: new THREE.Vector3(Math.cos(a) * hs, (5.5 + rng() * 5) * s, Math.sin(a) * hs),
        age: 0, life: 0.9 + rng() * 0.7, acc: 0,
      });
    }

    // ---- 5. Ground dust ring racing outward (washes down the street).
    // Longer-lived and denser than the fireball stages so the ring still
    // reads at +0.5-1.0s when the screenshot lands. ----
    _v.copy(pos); _v.y += 0.5;
    p.emit({
      pos: _v, count: 14, radial: [15 * s, 24 * s], vel: _v2.set(0, 3.0, 0), spread: 0.4,
      life: [1.1, 2.2], size: [3.0 * s, 7.4 * s], sizeEase: 0.55,
      color0: COL.dust0, color1: COL.dust1,
      alpha: 0.78, gravity: 1.1, drag: 1.15, floor: 0.25,
      fadeIn: 0.03, fadeOutStart: 0.45, spinVel: 0.9, tex: 3,
    });
    _v.copy(pos); _v.y += 0.45;
    p.emit({
      pos: _v, count: 12, radial: [18 * s, 28 * s], vel: _v2.set(0, 0.9, 0),
      life: [0.6, 1.15], size: [0.6 * s, 0.34 * s],
      color0: COL.dust0, color1: COL.dust1,
      alpha: 0.58, gravity: 2, drag: 1.5, floor: 0.2,
      fadeOutStart: 0.4, stretch: 0.05, lenMax: 5 * s,
    });

    // ---- 5b. Debris chunks on ballistic arcs ----
    if (pos.y < 2.5) this.debris.launch(pos, s, 7);

    // ---- 6. Smoke pillar: first wave now, staged waves in update ----
    this.emitPillar(pos, s, 0);
    this.bursts.push({ pos: pos.clone(), s, age: 0, next: 0.12, end: 2.6 });

    // ---- 7. Lingering ground haze (10s+) ----
    _v.copy(pos); _v.y += 1.1;
    p.emit({
      pos: _v, count: 4, radial: [0.5 * s, 1.6 * s], vel: _v2.set(0, 0.35, 0),
      life: [6, 11.5], size: [3.0 * s, 6.8 * s], sizeEase: 0.6,
      color0: COL.haze0, color1: COL.haze1,
      alpha: 0.46, gravity: -0.05, drag: 0.55, turb: 0.5,
      fadeIn: 0.45, fadeOutStart: 0.45, posJitter: 3.4 * s, spinVel: 0.25, floor: 0.3, tex: 3,
    });

    // ---- 7b. Post-event atmosphere: the street must NOT be clean air two
    // meters from a fireball. A handful of very large, very-low-alpha dust
    // cards drift slowly downwind for 15-25s (few big quads at low opacity —
    // cheap on overdraw), plus a thin high blanket over the impact zone. ----
    _v.copy(pos); _v.y += 1.7;
    p.emit({
      pos: _v, count: 4, radial: [1.2, 3.6], vel: _v2.set(0, 0.2, 0),
      life: [15, 24], size: [4.6 * s, 8.8 * s], sizeEase: 0.5,
      color0: COL.linger0, color1: COL.linger1,
      alpha: 0.17, gravity: -0.008, drag: 0.3, turb: 0.14, wind: DRIFT_WIND,
      fadeIn: 0.08, fadeOutStart: 0.55, posJitter: 3.2 * s, spinVel: 0.14, floor: 0.55, tex: 3,
    });
    // denser-textured companions so the bank doesn't read as flat milk
    p.emit({
      pos: _v, count: 2, radial: [1.0, 2.8], vel: _v2.set(0, 0.24, 0),
      life: [14, 22], size: [3.8 * s, 7.2 * s], sizeEase: 0.5,
      color0: COL.linger0, color1: COL.linger1,
      alpha: 0.13, gravity: -0.008, drag: 0.3, turb: 0.16, wind: DRIFT_WIND,
      fadeIn: 0.08, fadeOutStart: 0.55, posJitter: 2.6 * s, spinVel: 0.18, floor: 0.55, tex: 2,
    });
    _v.copy(pos); _v.y += 4.6;
    p.emit({
      pos: _v, count: 2, radial: [0.2, 0.8], vel: _v2.set(0, 0.14, 0),
      life: [17, 26], size: [6.5 * s, 11 * s], sizeEase: 0.5,
      color0: COL.linger1, color1: COL.linger1,
      alpha: 0.1, gravity: -0.004, drag: 0.4, turb: 0.1, wind: DRIFT_WIND,
      fadeIn: 0.1, fadeOutStart: 0.6, posJitter: 4.0 * s, spinVel: 0.1, tex: 3,
    });

    // ---- Light: the shot-seller. Facades and the street MUST flush
    // orange. Peak stays huge (physical falloff, decay 2) but the blinding
    // hold is trimmed to ~90ms so the white stage matches the shorter
    // sprite flash; the fall still carries warm fire light ~1.3s.
    const slot = this.lights.reduce((a, b) => (a.t > b.t ? a : b));
    slot.t = 0;
    slot.peak = 3000 * s;
    slot.hold = 0.09;
    slot.fall = 1.25;
    slot.light.position.copy(pos).add(_v.set(0, 3.1 * s, 0));
    slot.light.distance = Math.min(45 + 15 * s, 70);
    slot.light.color.copy(FLASH_WARM);
    slot.light.intensity = slot.peak;

    // Longer-lived ember glow low in the smoke (~2.2s, weak, flickering)
    const em = this.emberLights.reduce((a, b) => (a.t > b.t ? a : b));
    em.t = 0;
    em.peak = 240 * s;
    em.dur = 2.2;
    em.light.position.copy(pos).add(_v.set(0, 1.3 * s, 0));
    em.light.distance = Math.min(18 + 8 * s, 34);

    // ---- Scorch on ground (big enough to read from 60m) ----
    if (pos.y < 1.2) this.impacts.scorch(pos.clone().setY(0.02), size * 1.4);

    // ---- Danger close: dust kicked past the player camera ----
    const d = this.player.position.distanceTo(pos);
    if (d < 16) {
      const fx = -Math.sin(this.player.yaw), fz = -Math.cos(this.player.yaw);
      _v.set(this.player.position.x + fx * 2.4, this.player.position.y + 1.35, this.player.position.z + fz * 2.4);
      p.emit({
        pos: _v, count: 6, vel: _v2.set(-fx * 1.7, 0.5, -fz * 1.7), spread: 0.7,
        life: [0.8, 1.5], size: [1.0, 2.4], sizeEase: 0.5,
        color0: COL.dust0, color1: COL.dust1,
        alpha: 0.3, drag: 1.6, turb: 0.4,
        fadeIn: 0.06, fadeOutStart: 0.3, posJitter: 1.3, tex: 3,
      });
    }
    // Danger close: a short warm pulse riding just ahead of the camera so
    // the whole frame kicks with the blast — a cheap exposure/heat response
    // that never touches the post chain.
    if (d < 34) {
      const near = this.lights.reduce((a, b) => (a.t > b.t ? a : b));
      const k = 1 - d / 34;
      const fx = -Math.sin(this.player.yaw), fz = -Math.cos(this.player.yaw);
      near.t = 0;
      near.peak = 900 * k * size;
      near.hold = 0.09;
      near.fall = 0.45;
      near.light.position.set(
        this.player.position.x + fx * 2.2,
        this.player.position.y + 1.7,
        this.player.position.z + fz * 2.2);
      near.light.distance = 16;
      near.light.color.copy(FLASH_WARM);
      near.light.intensity = near.peak;
    }

    // ---- Camera shake / damage falloff by distance ----
    const sh = Math.max(0, 1 - d / 60);
    this.player.addShake(0.11 * sh * sh * size);

    this.enemyManager?.explosionAt(pos.clone().add(_v.set(0, 1, 0)), radius * size, damage);
    this.audio?.play('explosion', d);
  }

  update(dt) {
    this.time += dt;
    // Flash lights: hold the blinding peak briefly, then a fast power-curve
    // decay while the color cools white-orange -> deep ember.
    for (const s of this.lights) {
      if (s.t > s.hold + s.fall) {
        if (s.light.intensity !== 0) s.light.intensity = 0;
        continue;
      }
      s.t += dt;
      if (s.t < s.hold) {
        s.light.intensity = s.peak * (1 - 0.2 * (s.t / s.hold));
      } else {
        const k = Math.min((s.t - s.hold) / s.fall, 1);
        s.light.intensity = s.peak * 0.8 * Math.pow(1 - k, 2.5);
        s.light.color.lerpColors(FLASH_WARM, FLASH_COOL, Math.min(1, k * 1.6));
      }
    }
    // Ember glows: quick rise, then smoldering falloff with a slow flicker.
    for (const s of this.emberLights) {
      if (s.t > s.dur) {
        if (s.light.intensity !== 0) s.light.intensity = 0;
        continue;
      }
      s.t += dt;
      const k = Math.min(s.t / s.dur, 1);
      const env = Math.min(1, s.t / 0.22) * Math.pow(1 - k, 1.7);
      s.light.intensity = s.peak * env * (0.8 + 0.2 * Math.sin(this.time * 31 + s.seed));
    }
    this.debris.update(dt);

    // Shockwave rings
    for (const r of this.rings) {
      if (r.t > r.dur) { if (r.mesh.visible) r.mesh.visible = false; continue; }
      r.t += dt;
      const k = Math.min(r.t / r.dur, 1);
      const e = 1 - Math.pow(1 - k, 3);
      const sc = Math.max(r.R * 2 * (0.1 + 0.9 * e), 0.01);
      r.mesh.scale.set(sc, sc, 1);
      r.mesh.material.opacity = Math.min(1, 1.8 * Math.pow(1 - k, 1.6));
    }

    // Shockwave domes
    for (const r of this.domes) {
      if (r.t > r.dur) { if (r.mesh.visible) r.mesh.visible = false; continue; }
      r.t += dt;
      const k = Math.min(r.t / r.dur, 1);
      const e = 1 - Math.pow(1 - k, 2.6);
      const sc = Math.max(r.R * (0.12 + 0.88 * e), 0.01);
      r.mesh.scale.set(sc, sc * 0.7, sc);
      r.mesh.material.uniforms.uOpacity.value = 0.5 * Math.pow(1 - k, 1.9);
    }

    // Staged pillar bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.age += dt;
      while (b.age >= b.next && b.next <= b.end) {
        this.emitPillar(b.pos, b.s, b.next / b.end);
        b.next += 0.16;
      }
      if (b.age > b.end) this.bursts.splice(i, 1);
    }

    // Ember trailers: glowing heads with little smoke trails
    for (let i = this.trailers.length - 1; i >= 0; i--) {
      const tr = this.trailers[i];
      tr.age += dt;
      tr.vel.y -= 26 * dt;
      tr.vel.multiplyScalar(Math.max(0, 1 - 0.4 * dt));
      tr.pos.addScaledVector(tr.vel, dt);
      if (tr.age > tr.life || tr.pos.y < 0.1) {
        this.trailers.splice(i, 1);
        continue;
      }
      tr.acc += dt;
      while (tr.acc >= 0.03) {
        tr.acc -= 0.03;
        this.particles.emit({
          pos: tr.pos, count: 1, spread: 0.1,
          life: [0.5, 0.9], size: [0.6, 1.5], sizeEase: 0.6,
          color0: COL.trailSmoke0, color1: COL.trailSmoke1,
          alpha: 0.55, gravity: -0.3, drag: 1.2,
          fadeIn: 0.06, fadeOutStart: 0.3, spinVel: 0.8, tex: 2,
        });
        this.particles.emit({
          pos: tr.pos, count: 1, vel: tr.vel, spread: 0,
          life: [0.09, 0.13], size: [0.28, 0.15],
          color0: COL.trailHead, color1: COL.ember1,
          alpha: 1, additive: true, drag: 8, fadeOutStart: 0.4, tex: 0,
        });
      }
    }
  }
}
