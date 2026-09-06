import * as THREE from 'three';
import { CONTRAIL_MATERIAL, WakeTrail, type WakeBatch } from '../render/wakes';
import type { FlightModel } from './physics';
import type { PlaneModel } from './model';
import { clamp, lerp, smoothstep } from '../core/noise';
import { Rng } from '../core/seed';

function spriteTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/**
 * Spray atlas, two tiles side by side: a ragged sheet (a fan of water torn into streaks, drawn along +x so
 * it can be stretched along the particle's motion) and a cluster of droplets. Alpha in the red channel.
 */
function sprayTexture(): THREE.CanvasTexture {
  const w = 256, h = 128;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  const rng = new Rng('spray-atlas');
  // tile 0: sheet - many soft elongated blobs along x, denser toward the root (left), frayed at the tip
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, 128, 128); ctx.clip();
  // the blobs stay inside the tile (a blob clipped by the tile edge gave the stretched sheet quad a hard
  // straight end, and the fan read as stacked rectangles)
  for (let i = 0; i < 140; i++) {
    const u = Math.pow(rng.next(), 0.7);
    const x = 22 + u * 84, y = 64 + rng.gauss() * (7 + 20 * u);
    const len = 8 + 12 * rng.next(), wid = 1.5 + 4.0 * rng.next() * (1 - 0.4 * u);
    const a = (0.55 - 0.35 * u) * (0.6 + 0.4 * rng.next());
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`);
    g.addColorStop(0.5, `rgba(255,255,255,${(a * 0.45).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.translate(x, y); ctx.rotate((rng.next() - 0.5) * 0.5); ctx.scale(len, wid);
    ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  ctx.restore();
  // tile 1: droplets - a loose cluster of small round dots with a faint mist behind them
  ctx.save();
  ctx.beginPath(); ctx.rect(128, 0, 128, 128); ctx.clip();
  // (faint: a strong mist disc made every droplet quad a round translucent puff)
  const mist = ctx.createRadialGradient(192, 64, 0, 192, 64, 44);
  mist.addColorStop(0, 'rgba(255,255,255,0.1)'); mist.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = mist; ctx.fillRect(128, 0, 128, 128);
  for (let i = 0; i < 70; i++) {
    const r = 1.5 + 4.5 * Math.pow(rng.next(), 2);
    const ang = rng.next() * Math.PI * 2, rad = 46 * Math.sqrt(rng.next());
    const x = 192 + Math.cos(ang) * rad, y = 64 + Math.sin(ang) * rad;
    const a = 0.5 + 0.5 * rng.next();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`); g.addColorStop(0.6, `rgba(255,255,255,${(a * 0.7).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  ctx.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

interface Particle { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; age: number; size: number; }

class ParticleCloud {
  readonly points: THREE.Points;
  private readonly particles: Particle[] = [];
  private readonly positions: Float32Array;
  private readonly alphas: Float32Array;
  private readonly sizes: Float32Array;
  private readonly geo: THREE.BufferGeometry;

  constructor(readonly capacity: number, color: THREE.Color, tex: THREE.Texture, opacity: number, blending: THREE.Blending) {
    this.positions = new Float32Array(capacity * 3);
    this.alphas = new Float32Array(capacity);
    this.sizes = new Float32Array(capacity);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex }, uColor: { value: color }, uOpacity: { value: opacity }, uScale: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aAlpha; attribute float aSize; varying float vAlpha;
        uniform float uScale;
        void main() { vAlpha = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / max(-mv.z, 0.5); }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uTex; uniform vec3 uColor; uniform float uOpacity; varying float vAlpha;
        void main() { vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(uColor, t.a * vAlpha * uOpacity); }
      `,
      transparent: true, depthWrite: false, blending,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.geo.setDrawRange(0, 0);
  }

  emit(p: Particle): void {
    if (this.particles.length >= this.capacity) this.particles.shift();
    this.particles.push(p);
  }

  clear(): void {
    this.particles.length = 0;
    this.geo.setDrawRange(0, 0);
  }

  update(dt: number, gravity: number, drag: number, scale: number): void {
    (this.points.material as THREE.ShaderMaterial).uniforms.uScale.value = scale;
    let n = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) { this.particles.splice(i, 1); continue; }
      p.vy -= gravity * dt;
      const d = Math.exp(-drag * dt);
      p.vx *= d; p.vy *= d; p.vz *= d;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.05 && gravity > 0) { p.y = 0.05; p.vy = 0; }
      const k = p.age / p.life;
      this.positions[n * 3] = p.x; this.positions[n * 3 + 1] = p.y; this.positions[n * 3 + 2] = p.z;
      this.alphas[n] = Math.sin(k * Math.PI) * (1 - k * 0.5);
      this.sizes[n] = p.size * (0.6 + k * 1.2);
      n++;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.setDrawRange(0, n);
  }
}

interface SprayParticle extends Particle { tile: number; len: number; wid: number; alpha: number; }

/**
 * Spray sheets and droplets as lit instanced quads (one draw): billboards stretched along their motion,
 * shaded by the standard pipeline with an upward normal so they take the sun, the sky and the aircraft's
 * shadow like the foam on the water (spray in the wing's shadow is grey, not white). The material must be
 * registered with the game's lit-material hook (CSM) like every other MeshStandardMaterial.
 */
class SprayCloud {
  readonly mesh: THREE.InstancedMesh;
  readonly material: THREE.MeshStandardMaterial;
  private readonly particles: SprayParticle[] = [];
  private readonly fx: THREE.InstancedBufferAttribute;
  private readonly vel: THREE.InstancedBufferAttribute;
  private readonly m = new THREE.Matrix4();

  constructor(readonly capacity: number, tex: THREE.Texture) {
    const geo = new THREE.PlaneGeometry(1, 1);
    this.fx = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage) as THREE.InstancedBufferAttribute;
    this.vel = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage) as THREE.InstancedBufferAttribute;
    geo.setAttribute('aFx', this.fx);   // alpha, tile, length along the motion, width
    geo.setAttribute('aVel', this.vel); // world velocity (direction of the stretch)
    const mat = new THREE.MeshStandardMaterial({ color: 0xf2f6f8, roughness: 1.0, metalness: 0.0, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    mat.defines = { USE_UV: '' };
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uSprayTex = { value: tex };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 aFx;\nattribute vec3 aVel;\nvarying vec2 vFx;')
        // an upward normal: spray is lit like the water surface it was torn from
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);')
        .replace('#include <project_vertex>', /* glsl */ `
          vFx = aFx.xy;
          vec4 mvPosition = vec4(0.0, 0.0, 0.0, 1.0);
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
          #endif
          mvPosition = modelViewMatrix * mvPosition;
          // billboard stretched along the view-space direction of the particle's motion
          vec3 vv = (viewMatrix * vec4(aVel, 0.0)).xyz;
          vec2 ax = vv.xy;
          float al = length(ax);
          ax = al > 1e-4 ? ax / al : vec2(1.0, 0.0);
          vec2 ay = vec2(-ax.y, ax.x);
          mvPosition.xy += ax * (position.x * aFx.z) + ay * (position.y * aFx.w);
          gl_Position = projectionMatrix * mvPosition;
        `);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D uSprayTex;\nvarying vec2 vFx;')
        .replace('#include <map_fragment>', /* glsl */ `
          #include <map_fragment>
          float sprayA = texture2D(uSprayTex, vec2(vUv.x * 0.5 + 0.5 * vFx.y, vUv.y)).r * vFx.x;
          // soft window over the quad: nothing drawn by a sheet or droplet cluster may end in a straight edge
          vec2 win = smoothstep(vec2(0.0), vec2(0.1, 0.16), vUv) * smoothstep(vec2(1.0), vec2(0.86, 0.84), vUv);
          // streaks along the motion axis with a ragged tip, so a sheet is a torn fan and not a round puff
          float streak = mix(0.55 + 0.45 * sin(vUv.y * 31.0 + vUv.x * 6.0), 1.0, vFx.y);
          float tip = mix(mix(1.0, 0.6 + 0.4 * sin(vUv.y * 23.0 + 1.7), smoothstep(0.55, 1.0, vUv.x)), 1.0, vFx.y);
          sprayA *= win.x * win.y * streak * tip;
          if (sprayA < 0.01) discard;
          diffuseColor.a *= sprayA;
        `);
    };
    mat.customProgramCacheKey = () => 'plane-spray-v2';
    this.material = mat;
    this.mesh = new THREE.InstancedMesh(geo, mat, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.count = 0;
    this.mesh.renderOrder = 7;
  }

  emit(p: SprayParticle): void {
    if (this.particles.length >= this.capacity) this.particles.shift();
    this.particles.push(p);
  }

  clear(): void {
    this.particles.length = 0;
    this.mesh.count = 0;
  }

  update(dt: number): void {
    let n = 0;
    const fx = this.fx.array as Float32Array, vel = this.vel.array as Float32Array;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) { this.particles.splice(i, 1); continue; }
      p.vy -= 9.81 * dt;
      const d = Math.exp(-1.4 * dt);
      p.vx *= d; p.vy *= d; p.vz *= d;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      // back into the water: the sheet collapses into the foam of the wake
      if (p.y < 0.03 && p.age > 0.1) { this.particles.splice(i, 1); continue; }
      const k = p.age / p.life;
      // a sheet opens quickly then frays and thins; droplets shrink as they fall
      const grow = p.tile === 0 ? 0.55 + 0.9 * Math.sqrt(k) : 0.7 + 0.6 * k;
      this.m.makeTranslation(p.x, p.y, p.z);
      this.mesh.setMatrixAt(n, this.m);
      fx[n * 4] = p.alpha * Math.sin(Math.min(k * 1.6, 1) * Math.PI * 0.5) * (1 - k * k);
      fx[n * 4 + 1] = p.tile;
      fx[n * 4 + 2] = p.len * grow;
      fx[n * 4 + 3] = p.wid * grow;
      vel[n * 3] = p.vx; vel[n * 3 + 1] = p.vy; vel[n * 3 + 2] = p.vz;
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.fx.needsUpdate = true;
    this.vel.needsUpdate = true;
  }
}

/** Float wakes, bow spray, exhaust smoke and wingtip condensation trails. */
export class PlaneEffects {
  readonly wakeL: WakeTrail;
  readonly wakeR: WakeTrail;
  readonly spray: SprayCloud;
  readonly exhaust: ParticleCloud;
  readonly vortexL: WakeTrail;
  readonly vortexR: WakeTrail;
  /** materials shaded by the standard pipeline (the game registers them for the cascaded shadows) */
  readonly litMaterials: THREE.Material[];
  /** meshes that must not appear in the planar reflection */
  readonly unmirrored: THREE.Object3D[];
  private readonly tmp = new THREE.Vector3();
  private readonly tmp3 = new THREE.Vector3();
  /** seeded so spray/exhaust are reproducible frame-for-frame in the benchmark clips */
  private rng = new Rng('plane-effects');
  private readonly tmp2 = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private sprayAcc = 0;
  private tailAcc = 0;
  private exhaustAcc = 0;
  /** per float: was the step under water last frame, and the time of its last touchdown splash */
  private readonly wasWet = [false, false];
  private readonly splashAt = [-10, -10];

  constructor(wakes: WakeBatch, scene: THREE.Scene) {
    // float hull: 5.7 m from stern to stem, 0.37 m half-beam at the chine (see model.ts floatSections)
    this.wakeL = new WakeTrail(80, 0.37, 16, 1.1, wakes, 5.7, 1.5);
    this.wakeR = new WakeTrail(80, 0.37, 16, 1.1, wakes, 5.7, 1.5);
    const tex = spriteTexture();
    this.spray = new SprayCloud(360, sprayTexture());
    this.exhaust = new ParticleCloud(120, new THREE.Color(0.25, 0.24, 0.23), tex, 0.22, THREE.NormalBlending);
    scene.add(this.spray.mesh, this.exhaust.points);
    this.vortexL = new WakeTrail(90, 0.5, 2.2, 0.6, CONTRAIL_MATERIAL);
    this.vortexR = new WakeTrail(90, 0.5, 2.2, 0.6, CONTRAIL_MATERIAL);
    scene.add(this.vortexL.mesh!, this.vortexR.mesh!);
    this.litMaterials = [this.spray.material];
    this.unmirrored = [this.spray.mesh, this.exhaust.points, this.vortexL.mesh!, this.vortexR.mesh!];
  }

  /** Drop every trail, particle and decal (used when the aircraft is re-placed). */
  reset(): void {
    this.wakeL.reset(); this.wakeR.reset(); this.vortexL.reset(); this.vortexR.reset();
    this.spray.clear(); this.exhaust.clear();
    this.sprayAcc = 0; this.tailAcc = 0; this.exhaustAcc = 0;
    this.wasWet[0] = this.wasWet[1] = false;
    this.splashAt[0] = this.splashAt[1] = -10;
    this.rng = new Rng('plane-effects');
  }

  /**
   * Touchdown splash of one float: the hull slaps the water at `sink` m/s and throws a burst of sheets forward
   * and outward from the stem plus a curtain along the chine, larger and higher the harder it hits; a separate
   * event from the steady planing spray (which only starts once the float is running on the surface).
   */
  private splash(flight: FlightModel, model: PlaneModel, side: number, sink: number, surfaceY: number): void {
    const q = flight.quaternion, v = flight.velocity;
    const fwd = flight.forward(this.tmp3);
    const right = this.right.set(0, 0, 1).applyQuaternion(q);
    const bow = side > 0 ? model.floatBowR : model.floatBowL;
    const hard = clamp((sink - 0.8) / 2.2, 0, 1);
    const n = Math.round(12 + 26 * hard);
    for (let i = 0; i < n; i++) {
      const stem = this.rng.next() < 0.45;
      // stem sheets leave the forward hull, the curtain the chine from the step forward
      const ax = stem ? 1.9 + this.rng.next() * 1.0 : -0.3 + this.rng.next() * 2.4;
      const p = this.tmp.copy(bow).setX(ax).setZ(bow.z + side * 0.38).applyQuaternion(q).add(flight.position);
      const out = stem ? 1.0 + this.rng.next() * 1.6 : 1.6 + this.rng.next() * 2.2;
      const ahead = stem ? 1.2 + this.rng.next() * 1.8 : (this.rng.next() - 0.3) * 1.0;
      const up = (stem ? 2.6 : 1.8) + 2.0 * hard + this.rng.next() * (1.4 + 1.5 * hard);
      const carry = stem ? 0.4 : 0.28;
      const sheet = this.rng.next() < 0.7;
      this.spray.emit({
        x: p.x, y: surfaceY + 0.1, z: p.z,
        vx: v.x * carry + fwd.x * ahead + right.x * side * out + (this.rng.next() - 0.5) * 0.8,
        vy: up,
        vz: v.z * carry + fwd.z * ahead + right.z * side * out + (this.rng.next() - 0.5) * 0.8,
        life: 0.55 + this.rng.next() * 0.45 + 0.2 * hard, age: 0,
        size: 1, tile: sheet ? 0 : 1,
        len: (sheet ? 1.1 + this.rng.next() * 1.2 : 0.9 + this.rng.next() * 0.9) * (1 + 0.5 * hard),
        wid: (sheet ? 0.6 + this.rng.next() * 0.6 : 0.4 + this.rng.next() * 0.4) * (1 + 0.4 * hard),
        alpha: 0.45 + 0.3 * this.rng.next() + 0.15 * hard,
      });
    }
  }

  update(flight: FlightModel, model: PlaneModel, dt: number, time: number, pixelHeight: number): void {
    const t = flight.telemetry;
    const q = flight.quaternion;
    const speed = t.groundSpeed;
    const fwd = flight.forward(this.tmp3);
    const fl = Math.hypot(fwd.x, fwd.z) || 1;
    const fdx = fwd.x / fl, fdz = fwd.z / fl;
    // float wakes: the ribbon head (bow wave, waterline) shows whenever the floats are in the water, the trail
    // grows as they move; the emitter is the stern at displacement speeds and slides to the step once planing
    const planing = smoothstep(11, 19, speed);
    const emitX = lerp(-2.75, -0.35, planing);
    const floats = flight.floats;
    for (const [trail, stern, i] of [[this.wakeL, model.floatSternL, 0], [this.wakeR, model.floatSternR, 1]] as const) {
      const p = this.tmp.copy(stern).setX(emitX).applyQuaternion(q).add(flight.position);
      // the head runs from the emitter to the real bow (x 2.95) wherever the emitter sits on the hull
      trail.lead = 2.95 - emitX;
      // this float is in the water when its step or bow keel is under the surface
      const fs = floats[i];
      const wet = fs.step > 0 || fs.bow > 0;
      trail.update(p.x, p.z, fdx, fdz, time, wet, speed);
      // touchdown: the float comes down onto the surface at more than ~0.8 m/s (a skip lands again the same way)
      if (wet && !this.wasWet[i] && -fs.vy > 0.8 && time - this.splashAt[i] > 0.35) {
        this.splashAt[i] = time;
        this.splash(flight, model, i === 0 ? -1 : 1, -fs.vy, fs.surfaceY);
      }
      this.wasWet[i] = wet;
    }
    // spray: the bow wave tears into sheets from about 5 m/s (the hump), then the chines throw a fan of sheets
    // and droplets sideways and aft from the forebody while planing; dies away once the floats are unloaded
    if (t.onWater && speed > 4.5) {
      const hump = smoothstep(4.5, 11, speed);
      const rate = (28 * hump + 80 * smoothstep(9, 18, speed)) * (1 - 0.55 * smoothstep(28, 40, speed));
      this.sprayAcc += rate * dt;
      const right = this.right.set(0, 0, 1).applyQuaternion(q);
      const v = flight.velocity;
      while (this.sprayAcc >= 1) {
        this.sprayAcc -= 1;
        for (const bow of [model.floatBowL, model.floatBowR]) {
          const side = bow.z > 0 ? 1 : -1;
          const fs = floats[side > 0 ? 1 : 0];
          // only a float that is actually running in the water throws spray
          if (fs.step < -0.02 && fs.bow < -0.02) continue;
          // emission station: at the bow in the hump phase, spread over the forebody chine when planing
          const ax = lerp(2.3, 0.4 + this.rng.next() * 1.6, planing);
          const p = this.tmp.copy(bow).setX(ax).setZ(bow.z + side * 0.3).applyQuaternion(q).add(flight.position);
          const sheet = this.rng.next() < 0.6;
          const lat = (1.4 + this.rng.next() * 2.4) * (0.6 + 0.6 * hump) + speed * 0.05;
          const up = 1.0 + this.rng.next() * 2.0 + speed * 0.06;
          // sheets leave the chine nearly still in the water's frame (the float runs on ahead of them)
          const carry = sheet ? 0.12 : 0.22;
          // sheets are short and wide (a blister of water, not a spike) and translucent; the droplet clusters
          // carry the mist the sheets break into
          this.spray.emit({
            x: p.x, y: fs.surfaceY + 0.12, z: p.z,
            vx: v.x * carry + right.x * side * lat + (this.rng.next() - 0.5) * 1.2,
            vy: up,
            vz: v.z * carry + right.z * side * lat + (this.rng.next() - 0.5) * 1.2,
            life: sheet ? 0.45 + this.rng.next() * 0.4 : 0.45 + this.rng.next() * 0.55, age: 0,
            size: 1, tile: sheet ? 0 : 1,
            // droplet clusters are stretched along their flight too (a round cluster read as a puff)
            len: sheet ? 0.7 + this.rng.next() * 0.8 + speed * 0.015 : 0.8 + this.rng.next() * 0.9,
            wid: sheet ? 0.55 + this.rng.next() * 0.5 : 0.35 + this.rng.next() * 0.4,
            alpha: sheet ? 0.3 + 0.25 * this.rng.next() : 0.3 + 0.25 * this.rng.next(),
          });
        }
      }
    }
    // rooster tail: on the step the flow leaves the transom clean and closes behind it in a plume of spray a
    // hull length back, one per float, thrown up and left behind (it hangs nearly still in the water's frame)
    if (t.onWater && planing > 0.05) {
      this.tailAcc += 34 * planing * dt;
      const v = flight.velocity;
      while (this.tailAcc >= 1) {
        this.tailAcc -= 1;
        for (let i = 0; i < 2; i++) {
          const fs = floats[i];
          if (fs.step < -0.02) continue;
          const stern = i === 0 ? model.floatSternL : model.floatSternR;
          const back = 1.4 + this.rng.next() * 1.8 + 0.06 * speed;
          const p = this.tmp.copy(stern).setX(-0.35 - back).setZ(stern.z + (this.rng.next() - 0.5) * 0.5).applyQuaternion(q).add(flight.position);
          const droplet = this.rng.next() < 0.55;
          this.spray.emit({
            x: p.x, y: fs.surfaceY + 0.15, z: p.z,
            vx: v.x * 0.1 + (this.rng.next() - 0.5) * 1.4,
            vy: (2.2 + this.rng.next() * 2.6) * planing,
            vz: v.z * 0.1 + (this.rng.next() - 0.5) * 1.4,
            life: 0.5 + this.rng.next() * 0.4, age: 0,
            size: 1, tile: droplet ? 1 : 0,
            len: droplet ? 0.8 + this.rng.next() * 0.9 : 0.9 + this.rng.next() * 0.8,
            wid: droplet ? 0.35 + this.rng.next() * 0.35 : 0.5 + this.rng.next() * 0.4,
            alpha: 0.3 + 0.25 * this.rng.next(),
          });
        }
      }
    }
    this.spray.update(dt);
    // exhaust: faint dark puffs, more when the throttle is high
    if (t.rpm > 0.2) {
      this.exhaustAcc += (10 + 25 * t.rpm) * dt;
      while (this.exhaustAcc >= 1) {
        this.exhaustAcc -= 1;
        const p = this.tmp.copy(model.exhaustPos).applyQuaternion(q).add(flight.position);
        this.exhaust.emit({ x: p.x, y: p.y, z: p.z, vx: flight.velocity.x - fwd.x * 6 + (this.rng.next() - 0.5), vy: flight.velocity.y - 1.5 + this.rng.next() * 1.5, vz: flight.velocity.z - fwd.z * 6 + (this.rng.next() - 0.5), life: 0.35 + this.rng.next() * 0.3, age: 0, size: 0.35 + this.rng.next() * 0.3 });
      }
    }
    this.exhaust.update(dt, -0.3, 2.5, pixelHeight * 0.9);
    // wingtip condensation when pulling hard at speed (humid tropical air)
    const gpull = clamp((t.alpha - 0.13) / 0.12, 0, 1) * smoothstep(35, 55, t.airspeed);
    const tipL = this.tmp.copy(model.wingTipL).applyQuaternion(q).add(flight.position);
    const tipR = this.tmp2.copy(model.wingTipR).applyQuaternion(q).add(flight.position);
    this.vortexL.update(tipL.x, tipL.z, fdx, fdz, time, gpull > 0.05, t.airspeed);
    this.vortexR.update(tipR.x, tipR.z, fdx, fdz, time, gpull > 0.05, t.airspeed);
    this.vortexL.mesh!.position.y = tipL.y; this.vortexL.mesh!.updateMatrix();
    this.vortexR.mesh!.position.y = tipR.y; this.vortexR.mesh!.updateMatrix();
    (this.vortexL.mesh!.material as THREE.ShaderMaterial).uniforms.uStrength.value = gpull * 0.7;
    (this.vortexR.mesh!.material as THREE.ShaderMaterial).uniforms.uStrength.value = gpull * 0.7;
  }
}
