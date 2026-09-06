import * as THREE from 'three';
import { CONTRAIL_MATERIAL, WAKE_DRIFT, WakeTrail, type SplatBatch, type WakeBatch } from '../render/wakes';
import type { ContactImpact, FlightModel } from './physics';
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

/** tiles of the spray atlas */
const TILE_SHEET = 0, TILE_DROPS = 1, TILE_MIST = 2;
const TILES = 3;

/**
 * Spray atlas, three tiles side by side: a ragged sheet (a fan of water torn into streaks, drawn along +x so
 * it can be stretched along the particle's motion), a cluster of droplets, and mist (a soft irregular cloud of
 * the finest drops, no structure to speak of). Alpha in the red channel.
 */
function sprayTexture(): THREE.CanvasTexture {
  const w = 128 * TILES, h = 128;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  const rng = new Rng('spray-atlas');
  // tile 0: sheet - a torn film: many soft blobs, a little elongated along x, densest toward the root (left),
  // frayed and holed toward the tip (long thin streaks read as brush strokes / airflow lines once the quad was
  // stretched along its motion)
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, 128, 128); ctx.clip();
  // the blobs stay inside the tile (a blob clipped by the tile edge gave the stretched sheet quad a hard
  // straight end, and the fan read as stacked rectangles)
  for (let i = 0; i < 170; i++) {
    const u = Math.pow(rng.next(), 0.7);
    const x = 20 + u * 86, y = 64 + rng.gauss() * (9 + 22 * u);
    const len = 5 + 7 * rng.next(), wid = 2.5 + 4.5 * rng.next() * (1 - 0.3 * u);
    const a = (0.6 - 0.35 * u) * (0.6 + 0.4 * rng.next());
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
  // tile 2: mist - a few overlapping soft discs of low alpha, off-centre so the cloud has no round outline
  ctx.save();
  ctx.beginPath(); ctx.rect(256, 0, 128, 128); ctx.clip();
  for (let i = 0; i < 9; i++) {
    const ang = rng.next() * Math.PI * 2, rad = 22 * Math.sqrt(rng.next());
    const x = 320 + Math.cos(ang) * rad, y = 64 + Math.sin(ang) * rad * 0.8;
    const r = 26 + 18 * rng.next();
    const a = 0.16 + 0.12 * rng.next();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`); g.addColorStop(0.55, `rgba(255,255,255,${(a * 0.45).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
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
 * Spray sheets, droplets and mist as lit instanced quads (one draw): billboards stretched along their motion,
 * shaded by the standard pipeline with an upward normal so they take the sun, the sky and the aircraft's
 * shadow like the foam on the water (spray in the wing's shadow is grey, not white). The material must be
 * registered with the game's lit-material hook (CSM) like every other MeshStandardMaterial.
 *
 * The three tiles move differently, which is what tells them apart more than their texture:
 *  - sheets are thin films thrown as a whole; they fly nearly ballistically (little air drag), open fast, fray and
 *    are gone within a second, dying the moment they fall back to the surface;
 *  - droplets are millimetre drops: ballistic under gravity with moderate drag, shrinking as they fall;
 *  - mist is the fine fraction the sheets break into: heavy air drag stops it within a metre or two of where it
 *    was born, it settles at a few decimetres a second and drifts with the wind, thinning for two or three seconds.
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
          float tile = vFx.y;
          float sprayA = texture2D(uSprayTex, vec2((vUv.x + tile) / ${TILES.toFixed(1)}, vUv.y)).r * vFx.x;
          // soft window over the quad: nothing drawn by a sheet or droplet cluster may end in a straight edge
          vec2 win = smoothstep(vec2(0.0), vec2(0.1, 0.16), vUv) * smoothstep(vec2(1.0), vec2(0.86, 0.84), vUv);
          // streaks along the motion axis with a ragged tip, so a sheet is a torn fan and not a round puff
          float sheetK = 1.0 - clamp(tile, 0.0, 1.0);
          float streak = mix(1.0, 0.78 + 0.22 * sin(vUv.y * 31.0 + vUv.x * 6.0), sheetK);
          float tip = mix(1.0, mix(1.0, 0.6 + 0.4 * sin(vUv.y * 23.0 + 1.7), smoothstep(0.55, 1.0, vUv.x)), sheetK);
          sprayA *= win.x * win.y * streak * tip;
          if (sprayA < 0.01) discard;
          diffuseColor.a *= sprayA;
        `);
    };
    mat.customProgramCacheKey = () => 'plane-spray-v3';
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

  update(dt: number, windX: number, windZ: number): void {
    let n = 0;
    const fx = this.fx.array as Float32Array, vel = this.vel.array as Float32Array;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) { this.particles.splice(i, 1); continue; }
      const k = p.age / p.life;
      let grow: number, dirX = 0, dirY = 0, dirZ = 0;
      if (p.tile === TILE_MIST) {
        // mist: heavy drag toward the wind's own motion, settling slowly, swelling as it thins
        const d = Math.exp(-2.6 * dt);
        p.vx = windX * 0.6 + (p.vx - windX * 0.6) * d; p.vz = windZ * 0.6 + (p.vz - windZ * 0.6) * d;
        p.vy = -0.35 + (p.vy + 0.35) * d;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < 0.25) p.y = 0.25;
        grow = 0.7 + 1.3 * Math.sqrt(k);
        // billboard axis: mist is not stretched along its motion; keep the quad upright-ish in view (x axis)
        dirX = 1;
      } else {
        // sheets and droplets: ballistic; a sheet flies as a whole with little drag, a drop cluster with more
        const drag = p.tile === TILE_SHEET ? 0.9 : 1.6;
        p.vy -= 9.81 * dt;
        const d = Math.exp(-drag * dt);
        p.vx *= d; p.vy *= d; p.vz *= d;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        // back into the water: the sheet collapses into the foam of the wake
        if (p.y < 0.03 && p.age > 0.1) { this.particles.splice(i, 1); continue; }
        // a sheet opens quickly then frays and thins; droplets shrink as they fall
        grow = p.tile === TILE_SHEET ? 0.55 + 0.9 * Math.sqrt(k) : 0.7 + 0.6 * k;
        dirX = p.vx; dirY = p.vy; dirZ = p.vz;
      }
      this.m.makeTranslation(p.x, p.y, p.z);
      this.mesh.setMatrixAt(n, this.m);
      // mist lingers: it fades linearly over its whole life instead of dying with the sheet's sin window
      fx[n * 4] = p.tile === TILE_MIST ? p.alpha * Math.sin(Math.min(k * 4.0, 1) * Math.PI * 0.5) * (1 - k) : p.alpha * Math.sin(Math.min(k * 1.6, 1) * Math.PI * 0.5) * (1 - k * k);
      fx[n * 4 + 1] = p.tile;
      fx[n * 4 + 2] = p.len * grow;
      fx[n * 4 + 3] = p.wid * grow;
      vel[n * 3] = dirX; vel[n * 3 + 1] = dirY; vel[n * 3 + 2] = dirZ;
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
  private ploughAcc = 0;
  /** the impact splats of the wake maps (null when the batch has none) */
  private readonly splats: SplatBatch | null;

  constructor(wakes: WakeBatch, scene: THREE.Scene) {
    // float hull: 5.7 m from stern to stem, 0.37 m half-beam at the chine (see model.ts floatSections); a float
    // has no propeller behind it (no prop wash lane) and planes at ~15 m/s
    this.wakeL = new WakeTrail(80, 0.37, 16, 1.1, wakes, 5.7, 1.5);
    this.wakeR = new WakeTrail(80, 0.37, 16, 1.1, wakes, 5.7, 1.5);
    for (const w of [this.wakeL, this.wakeR]) { w.propWash = 0; w.planingSpeed = 15; w.churn = 0.85; }
    this.splats = wakes.splats;
    const tex = spriteTexture();
    this.spray = new SprayCloud(480, sprayTexture());
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
    this.splats?.clear();
    this.sprayAcc = 0; this.tailAcc = 0; this.exhaustAcc = 0; this.ploughAcc = 0;
    this.rng = new Rng('plane-effects');
  }

  /**
   * Splash of a part of the airframe entering the water (see FlightModel.impacts): the surface responds in
   * three fractions with their own motion, scaled by the impact's energy E (0 a touch .. 1 a slam):
   *  - sheets: thin films of the displaced water thrown up as a curtain around the contact (a float's rise along
   *    both chines, higher and steeper the harder the hit; a wing tip's a plume swept back along its motion),
   *    translucent and lit, gone within a second;
   *  - droplets: the sheets' rims breaking into drops that keep a share of the body's forward speed and fall
   *    ballistically ahead of and beside the track;
   *  - mist: the fine fraction, hanging where the sheets broke and drifting off downwind over 2-3 s;
   * plus the splat in the wake maps: the depression, the ring waves and the whitewater patch the water keeps
   * after the airframe has moved on (elliptical along the body's motion).
   */
  private splash(flight: FlightModel, imp: ContactImpact, time: number): void {
    const E = imp.energy;
    const spd = imp.speed;
    const ml = Math.hypot(imp.vx, imp.vz);
    const mx = ml > 0.1 ? imp.vx / ml : 1, mz = ml > 0.1 ? imp.vz / ml : 0;   // motion direction (world xz)
    const px = -mz, pz = mx;                                                    // across it
    const structural = imp.part !== 'float' && imp.part !== 'wheel';
    const rng = this.rng;
    // sheets: a curtain either side of the keel for a float (thrown outward and up, leaning forward), a plume for
    // a wing tip / the nose (thrown up and back over the part, as the water it ploughs is flung aft)
    const nSheet = Math.round((structural ? 10 : 8) + 22 * E);
    for (let i = 0; i < nSheet; i++) {
      const s = rng.next() < 0.5 ? -1 : 1;
      const along = structural ? -(0.5 + rng.next() * 2.0) * (0.4 + E) : (rng.next() - 0.35) * 1.6;
      const out = structural ? (0.4 + rng.next() * 1.5) * s : (1.1 + rng.next() * 2.2) * s * (0.6 + 0.8 * E);
      const up = (2.2 + 5.5 * E) * (0.6 + 0.6 * rng.next()) + (structural ? 0.02 * spd : 0);
      const carry = structural ? 0.22 : 0.32 + 0.1 * E;
      this.spray.emit({
        x: imp.x + mx * (rng.next() - 0.5) * 1.2 + px * out * 0.12, y: imp.y + 0.08, z: imp.z + mz * (rng.next() - 0.5) * 1.2 + pz * out * 0.12,
        vx: imp.vx * carry + mx * along + px * out + (rng.next() - 0.5) * 0.6, vy: up, vz: imp.vz * carry + mz * along + pz * out + (rng.next() - 0.5) * 0.6,
        life: 0.5 + rng.next() * 0.4 + 0.3 * E, age: 0, size: 1, tile: TILE_SHEET,
        len: (1.2 + rng.next() * 1.4) * (0.8 + 0.9 * E), wid: (0.5 + rng.next() * 0.5) * (0.9 + 0.6 * E),
        alpha: 0.3 + 0.25 * rng.next() + 0.2 * E,
      });
    }
    // droplets: from the sheets' rims, more forward momentum, ballistic
    const nDrop = Math.round(6 + 20 * E);
    for (let i = 0; i < nDrop; i++) {
      const s = rng.next() < 0.5 ? -1 : 1;
      const out = (0.8 + rng.next() * 2.6) * s * (0.6 + 0.7 * E);
      const along = structural ? -(rng.next() * 3.0) : rng.next() * 2.5;
      this.spray.emit({
        x: imp.x + px * out * 0.2, y: imp.y + 0.3 + rng.next() * 0.5, z: imp.z + pz * out * 0.2,
        vx: imp.vx * (0.4 + 0.2 * E) + mx * along + px * out, vy: 2.0 + 4.5 * E * rng.next() + rng.next() * 1.5, vz: imp.vz * (0.4 + 0.2 * E) + mz * along + pz * out,
        life: 0.6 + rng.next() * 0.5 + 0.2 * E, age: 0, size: 1, tile: TILE_DROPS,
        len: (0.8 + rng.next() * 0.9) * (0.8 + 0.6 * E), wid: (0.35 + rng.next() * 0.4) * (0.8 + 0.5 * E),
        alpha: 0.35 + 0.3 * rng.next() + 0.1 * E,
      });
    }
    // mist: a few large faint puffs where the sheets break, hanging behind the contact
    const nMist = Math.round(2 + 6 * E);
    for (let i = 0; i < nMist; i++) {
      const s = (rng.next() - 0.5) * 2;
      this.spray.emit({
        x: imp.x - mx * (0.5 + rng.next() * 1.5) + px * s * 1.2, y: imp.y + 0.6 + rng.next() * 0.8 + 0.8 * E, z: imp.z - mz * (0.5 + rng.next() * 1.5) + pz * s * 1.2,
        vx: imp.vx * 0.25 + px * s * 0.8, vy: 1.2 + 1.6 * E + rng.next() * 0.8, vz: imp.vz * 0.25 + pz * s * 0.8,
        life: 1.4 + rng.next() * 0.9 + 0.7 * E, age: 0, size: 1, tile: TILE_MIST,
        len: (1.6 + rng.next() * 1.4) * (0.8 + 1.0 * E), wid: (1.3 + rng.next() * 1.0) * (0.8 + 1.0 * E),
        alpha: 0.12 + 0.12 * rng.next() + 0.16 * E,
      });
    }
    // the surface itself: the splat, stretched along the motion by the speed
    this.splats?.add(imp.x, imp.z, time, E, imp.vx, imp.vz, 1 + Math.min(spd, 30) * 0.05, structural ? 1 : 0);
    void flight;
  }

  /**
   * A part of the airframe ploughing through the water at speed (a wing tip in a cartwheel, the nose digging in,
   * wheels down on a water landing): a continuous plume of sheets and drops thrown up and back from it while it
   * stays in the water, plus splats laid along its path every metre or two.
   */
  private plough(imp: ContactImpact, dt: number, time: number): void {
    const spd = imp.speed;
    if (spd < 2.5) return;
    const k = smoothstep(2.5, 15, spd);
    this.ploughAcc += (60 + 40 * k) * dt;
    const ml = Math.hypot(imp.vx, imp.vz);
    const mx = ml > 0.1 ? imp.vx / ml : 1, mz = ml > 0.1 ? imp.vz / ml : 0;
    const px = -mz, pz = mx;
    const rng = this.rng;
    while (this.ploughAcc >= 1) {
      this.ploughAcc -= 1;
      const s = (rng.next() - 0.5) * 2;
      const u = rng.next();
      const tile = u < 0.45 ? TILE_SHEET : u < 0.85 ? TILE_DROPS : TILE_MIST;
      const up = tile === TILE_MIST ? 1.5 + k * 2.0 : (2.0 + 5.0 * k) * (0.5 + 0.7 * rng.next());
      this.spray.emit({
        x: imp.x + px * s * 0.5, y: imp.y + 0.15 + (tile === TILE_MIST ? 1.0 : 0), z: imp.z + pz * s * 0.5,
        vx: imp.vx * 0.15 - mx * (1.0 + 3.0 * k) * rng.next() + px * s * (1.0 + 2.0 * k), vy: up, vz: imp.vz * 0.15 - mz * (1.0 + 3.0 * k) * rng.next() + pz * s * (1.0 + 2.0 * k),
        life: tile === TILE_MIST ? 1.2 + rng.next() * 0.8 : 0.5 + rng.next() * 0.5, age: 0, size: 1, tile,
        len: tile === TILE_MIST ? 1.5 + rng.next() : (0.9 + rng.next() * 1.2) * (0.7 + 0.6 * k), wid: tile === TILE_MIST ? 1.2 + rng.next() * 0.8 : (0.4 + rng.next() * 0.5) * (0.8 + 0.4 * k),
        alpha: tile === TILE_MIST ? 0.1 + 0.1 * rng.next() : 0.3 + 0.3 * rng.next(),
      });
    }
    // a splat every ~2 m of travel (the accumulator shares the plume's clock: one splat per ~25 particles)
    if (this.splats && Math.floor((time - dt) * spd / 2) !== Math.floor(time * spd / 2)) this.splats.add(imp.x, imp.z, time, 0.25 + 0.5 * k, imp.vx, imp.vz, 1.5 + k, 1);
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
    // laid wake foam drifts with the wind-driven surface current (~3 % of the wind)
    WAKE_DRIFT.x = flight.wind.x * 0.03; WAKE_DRIFT.z = flight.wind.z * 0.03;
    this.splats?.setTime(time);
    for (const [trail, stern, i] of [[this.wakeL, model.floatSternL, 0], [this.wakeR, model.floatSternR, 1]] as const) {
      const p = this.tmp.copy(stern).setX(emitX).applyQuaternion(q).add(flight.position);
      // the head runs from the emitter to the real bow (x 2.95) wherever the emitter sits on the hull
      trail.lead = 2.95 - emitX;
      // this float is in the water when its step or bow keel is under the surface
      const fs = floats[i];
      const wet = fs.step > 0 || fs.bow > 0;
      trail.update(p.x, p.z, fdx, fdz, time, wet, speed);
    }
    // parts that entered the water this frame (float touchdowns and skips, wheels, a wing tip, the nose): the
    // structured splash and the surface splat at each contact point
    for (const imp of flight.impacts) this.splash(flight, imp, time);
    // parts still ploughing through the water at speed (ditching): a continuous plume behind each
    for (const pl of flight.ploughing) this.plough(pl, dt, time);
    // spray: the bow wave tears into sheets from about 5 m/s (the hump), then the chines throw the spray blister
    // sideways and aft from the forebody while planing; dies away once the floats are unloaded. Three fractions:
    // the root sheets (a dense translucent curtain hugging the chine, opening outward and leaning forward),
    // the droplets its rim breaks into (higher, further out, falling), and the mist that hangs behind
    if (t.onWater && speed > 4.5) {
      const hump = smoothstep(4.5, 11, speed);
      const rate = (26 * hump + 70 * smoothstep(9, 18, speed)) * (1 - 0.55 * smoothstep(28, 40, speed));
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
          const u = this.rng.next();
          const tile = u < 0.5 ? TILE_SHEET : u < 0.82 ? TILE_DROPS : TILE_MIST;
          const lat = (tile === TILE_MIST ? 1.5 + this.rng.next() * 1.5 : (1.6 + this.rng.next() * 2.6) * (0.6 + 0.6 * hump) + speed * (tile === TILE_DROPS ? 0.07 : 0.045));
          const up = tile === TILE_MIST ? 0.8 + this.rng.next() * 1.2 : tile === TILE_DROPS ? 1.8 + this.rng.next() * 2.4 + speed * 0.06 : 1.0 + this.rng.next() * 1.6 + speed * 0.045;
          // the sheets leave the chine nearly still in the water's frame (the float runs on ahead of them); the
          // drops keep a little more of the hull's speed, the mist stays where it was born
          const carry = tile === TILE_SHEET ? 0.16 : tile === TILE_DROPS ? 0.24 : 0.08;
          this.spray.emit({
            x: p.x, y: fs.surfaceY + (tile === TILE_MIST ? 0.9 + this.rng.next() * 0.7 : 0.12), z: p.z,
            vx: v.x * carry + right.x * side * lat + (this.rng.next() - 0.5) * 1.2,
            vy: up,
            vz: v.z * carry + right.z * side * lat + (this.rng.next() - 0.5) * 1.2,
            life: tile === TILE_MIST ? 1.1 + this.rng.next() * 0.9 : tile === TILE_SHEET ? 0.35 + this.rng.next() * 0.3 : 0.5 + this.rng.next() * 0.5, age: 0,
            size: 1, tile,
            // sheets are short and wide (a blister of water, not a spike); droplet clusters are stretched along
            // their flight (a round cluster read as a puff); the mist is a soft cloud
            len: tile === TILE_SHEET ? 0.9 + this.rng.next() * 0.7 + speed * 0.01 : tile === TILE_DROPS ? 0.8 + this.rng.next() * 0.9 : 1.4 + this.rng.next() * 1.2,
            wid: tile === TILE_SHEET ? 0.8 + this.rng.next() * 0.7 : tile === TILE_DROPS ? 0.35 + this.rng.next() * 0.4 : 1.1 + this.rng.next() * 0.9,
            alpha: tile === TILE_SHEET ? 0.45 + 0.3 * this.rng.next() : tile === TILE_DROPS ? 0.3 + 0.3 * this.rng.next() : 0.1 + 0.1 * this.rng.next(),
          });
        }
      }
    }
    // rooster tail: on the step the flow leaves the transom clean and closes behind it in a plume of spray a
    // hull length back, one per float, thrown up and left behind (it hangs nearly still in the water's frame)
    if (t.onWater && planing > 0.05) {
      this.tailAcc += 44 * planing * dt;
      const v = flight.velocity;
      while (this.tailAcc >= 1) {
        this.tailAcc -= 1;
        for (let i = 0; i < 2; i++) {
          const fs = floats[i];
          if (fs.step < -0.02) continue;
          const stern = i === 0 ? model.floatSternL : model.floatSternR;
          const back = 1.4 + this.rng.next() * 1.8 + 0.06 * speed;
          const p = this.tmp.copy(stern).setX(-0.35 - back).setZ(stern.z + (this.rng.next() - 0.5) * 0.5).applyQuaternion(q).add(flight.position);
          const u = this.rng.next();
          const tile = u < 0.45 ? TILE_DROPS : u < 0.8 ? TILE_SHEET : TILE_MIST;
          // the plume: the two flows off the step close behind the transom and shoot up 1.5-2.5 m
          this.spray.emit({
            x: p.x, y: fs.surfaceY + (tile === TILE_MIST ? 1.2 : 0.15), z: p.z,
            vx: v.x * 0.1 + (this.rng.next() - 0.5) * 1.4,
            vy: (tile === TILE_MIST ? 1.2 + this.rng.next() : 2.6 + this.rng.next() * 3.0) * planing,
            vz: v.z * 0.1 + (this.rng.next() - 0.5) * 1.4,
            life: tile === TILE_MIST ? 1.0 + this.rng.next() * 0.8 : 0.5 + this.rng.next() * 0.45, age: 0,
            size: 1, tile,
            len: tile === TILE_DROPS ? 0.8 + this.rng.next() * 0.9 : tile === TILE_SHEET ? 0.8 + this.rng.next() * 0.7 : 1.2 + this.rng.next(),
            wid: tile === TILE_DROPS ? 0.35 + this.rng.next() * 0.35 : tile === TILE_SHEET ? 0.6 + this.rng.next() * 0.5 : 1.0 + this.rng.next() * 0.8,
            alpha: tile === TILE_MIST ? 0.1 + 0.1 * this.rng.next() : 0.35 + 0.3 * this.rng.next(),
          });
        }
      }
    }
    this.spray.update(dt, flight.wind.x, flight.wind.z);
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
