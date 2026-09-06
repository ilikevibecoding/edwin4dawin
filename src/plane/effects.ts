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
 * Spray atlas, three tiles side by side, alpha in the red channel:
 *  - sheet: a fan of thin filaments running from a dense root (left) to a frayed tip (right), drawn along +x so
 *    the quad can be stretched along the particle's motion. Water torn off a chine is a film that immediately
 *    breaks into strands; what the eye keys on is the fine parallel streaking with gaps between the strands,
 *    not a soft blob (soft elongated blobs read as cotton once a few quads overlapped);
 *  - droplets: a loose cluster of small hard dots, nothing soft behind them;
 *  - mist: a ragged blotch built from hundreds of faint dots with a clumpy distribution, so no radial gradient
 *    and no round outline anywhere (the old overlapping soft discs drew as 2-6 m circles in the touchdown clips).
 */
function sprayTexture(): THREE.CanvasTexture {
  const w = 128 * TILES, h = 128;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  const rng = new Rng('spray-atlas');
  // tile 0: a torn shred of film (the fragments the sheet's rim sheds): an irregular veil of overlapping soft
  // lobes with holes eaten into it, denser at the root (left), lacy at the tip; no filament lines (the previous
  // fan of 90 strokes was the "lines of white" the touchdown read as)
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, 128, 128); ctx.clip();
  for (let i = 0; i < 26; i++) {
    const cx = 14 + rng.next() * 100, cy = 64 + rng.gauss() * 13 * (0.5 + cx / 128);
    const r = (9 + 13 * rng.next()) * (1.1 - 0.5 * cx / 128);
    const a = (0.22 + 0.3 * rng.next()) * (1 - 0.55 * cx / 128);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`); g.addColorStop(0.55, `rgba(255,255,255,${(a * 0.6).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  }
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 30; i++) {
    const cx = 30 + rng.next() * 98, cy = 64 + (rng.next() - 0.5) * 60;
    const r = (3 + 8 * rng.next()) * (0.5 + cx / 128);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(0.6, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  // tile 1: droplets
  ctx.save();
  ctx.beginPath(); ctx.rect(128, 0, 128, 128); ctx.clip();
  for (let i = 0; i < 34; i++) {
    const r = 1.2 + 3.0 * Math.pow(rng.next(), 2);
    const ang = rng.next() * Math.PI * 2, rad = 44 * Math.sqrt(rng.next());
    const x = 192 + Math.cos(ang) * rad, y = 64 + Math.sin(ang) * rad;
    const a = 0.55 + 0.45 * rng.next();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`); g.addColorStop(0.7, `rgba(255,255,255,${(a * 0.8).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  ctx.restore();
  // tile 2: mist - dots scattered with a clumpy (multiplicative) density, faint, no envelope
  ctx.save();
  ctx.beginPath(); ctx.rect(256, 0, 128, 128); ctx.clip();
  const clumps: [number, number, number][] = [];
  for (let i = 0; i < 7; i++) clumps.push([320 + (rng.next() - 0.5) * 70, 64 + (rng.next() - 0.5) * 62, 14 + 16 * rng.next()]);
  for (let i = 0; i < 900; i++) {
    const cl = clumps[Math.floor(rng.next() * clumps.length)];
    const x = cl[0] + rng.gauss() * cl[2], y = cl[1] + rng.gauss() * cl[2] * 0.85;
    if (x < 258 || x > 382 || y < 2 || y > 126) continue;
    const r = 2.5 + 5 * rng.next();
    const a = 0.035 + 0.05 * rng.next();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
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
    this.vel = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage) as THREE.InstancedBufferAttribute;
    geo.setAttribute('aFx', this.fx);   // alpha, tile, length along the motion, width
    geo.setAttribute('aVel', this.vel); // world velocity (direction of the stretch), age fraction
    const mat = new THREE.MeshStandardMaterial({ color: 0xf2f6f8, roughness: 1.0, metalness: 0.0, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    mat.defines = { USE_UV: '' };
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uSprayTex = { value: tex };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 aFx;\nattribute vec4 aVel;\nvarying vec4 vFx;')
        // an upward normal: spray is lit like the water surface it was torn from
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);')
        .replace('#include <project_vertex>', /* glsl */ `
          // alpha, tile, age fraction, per-instance seed (a hash of the instance index: every quad is eroded by
          // its own piece of the noise, so two sheets never share an outline)
          vFx = vec4(aFx.xy, aVel.w, fract(float(gl_InstanceID) * 0.6180339887));
          vec4 mvPosition = vec4(0.0, 0.0, 0.0, 1.0);
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
          #endif
          mvPosition = modelViewMatrix * mvPosition;
          // billboard stretched along the view-space direction of the particle's motion
          vec3 vv = (viewMatrix * vec4(aVel.xyz, 0.0)).xyz;
          vec2 ax = vv.xy;
          float al = length(ax);
          ax = al > 1e-4 ? ax / al : vec2(1.0, 0.0);
          vec2 ay = vec2(-ax.y, ax.x);
          mvPosition.xy += ax * (position.x * aFx.z) + ay * (position.y * aFx.w);
          gl_Position = projectionMatrix * mvPosition;
        `);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', /* glsl */ `
          #include <common>
          uniform sampler2D uSprayTex;
          varying vec4 vFx;
          float sprayHash(vec2 q) { vec3 p3 = fract(vec3(q.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
          float sprayNoise(vec2 q) { vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(sprayHash(i), sprayHash(i + vec2(1, 0)), f.x), mix(sprayHash(i + vec2(0, 1)), sprayHash(i + vec2(1, 1)), f.x), f.y); }
        `)
        .replace('#include <map_fragment>', /* glsl */ `
          #include <map_fragment>
          float tile = vFx.y, ageK = vFx.z, seed = vFx.w * 37.0;
          float sprayA = texture2D(uSprayTex, vec2((vUv.x + tile) / ${TILES.toFixed(1)}, vUv.y)).r * vFx.x;
          float sheetK = 1.0 - clamp(tile, 0.0, 1.0);
          float mistK = clamp(tile - 1.0, 0.0, 1.0);
          // erosion: a two-octave noise in the quad's own frame, thresholded higher as the particle ages, so a
          // sheet frays into strands and a mist patch dissolves into rags instead of fading as one soft shape;
          // the window keeps the quad's straight edges from ever printing but is itself ragged by the same noise
          vec2 nq = vUv * vec2(mix(3.0, 6.0, mistK), mix(9.0, 6.0, mistK)) + seed;
          float n = 0.65 * sprayNoise(nq) + 0.35 * sprayNoise(nq * 2.3 + 7.0);
          float thr = mix(0.28, 0.62, ageK) + 0.1 * mistK;
          float erode = smoothstep(thr - 0.22, thr + 0.12, n);
          vec2 win = smoothstep(vec2(0.0), vec2(0.06, 0.12) + 0.18 * n, vUv) * smoothstep(vec2(1.0), vec2(0.9, 0.86) - 0.18 * n, vUv);
          // sheets: fine strands along the motion axis that separate as the film breaks up (more contrast with age)
          float strand = 0.6 + 0.4 * sprayNoise(vec2(vUv.x * 4.0 + seed, vUv.y * 34.0));
          float streak = mix(1.0, mix(0.85, strand, 0.5 + 0.5 * ageK), sheetK);
          sprayA *= win.x * win.y * erode * streak;
          if (sprayA < 0.008) discard;
          // a fresh sheet is a film of clear water: translucent, tinted by the sea it was torn from and glinting
          // (roughness below); it whitens as it breaks into drops over its first tenths of a second, so a single
          // sheet reads glassy while the stacked roots of many at the chine read white
          float film = sheetK * (1.0 - smoothstep(0.1, 0.45, ageK));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.86, 0.92), 0.55 * film);
          diffuseColor.a *= sprayA * (1.0 - 0.45 * film);
        `)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.3, film);');
    };
    mat.customProgramCacheKey = () => 'plane-spray-v5';
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
        grow = 0.7 + 0.9 * Math.sqrt(k);
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
      vel[n * 4] = dirX; vel[n * 4 + 1] = dirY; vel[n * 4 + 2] = dirZ; vel[n * 4 + 3] = k;
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.fx.needsUpdate = true;
    this.vel.needsUpdate = true;
  }
}

/** emission columns kept per sheet (one every SHEET_DT while the chine runs in the water) and stations along the root */
const SHEET_COLS = 40, SHEET_ROWS = 7, SHEET_DT = 1 / 30;

/** GLSL shared by the sheet's lit material and its shadow-pass depth material: the film's coverage. */
const SHEET_GLSL = /* glsl */ `
  varying vec4 vSh;   // alpha, age (s), column seed, root parameter u (0 front .. 1 aft)
  float shHash(vec2 q) { vec3 p3 = fract(vec3(q.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float shNoise(vec2 q) { vec2 i = floor(q), f = fract(q); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(shHash(i), shHash(i + vec2(1, 0)), f.x), mix(shHash(i + vec2(0, 1)), shHash(i + vec2(1, 1)), f.x), f.y); }
  // coverage of the film: whole for its first tenth of a second, then torn into ligaments and holes that grow with
  // age. The noise is keyed by the column's emission time (sh.z), continuous along the fan and fixed per column,
  // so the tears travel with the water they are in, not over it (a per-column random seed would decorrelate the
  // neighbours and the interpolation across each quad would sweep the noise into fine stripes: lines again)
  float sheetCoverage(vec4 sh, out float film, out float tornK) {
    float tau = sh.y, u = sh.w, te = sh.z;
    vec2 q = vec2(te * 34.0, u * 5.5);
    float n = 0.6 * shNoise(q) + 0.4 * shNoise(q * 2.3 + 7.0);
    tornK = smoothstep(0.08, 0.6, tau);
    float thr = mix(0.12, 0.66, tornK);
    float holes = smoothstep(thr - 0.16, thr + 0.1, n);
    film = 1.0 - smoothstep(0.05, 0.22, tau);
    // the fan's front and aft edges thin out; the root (tau 0) is whole
    float edges = smoothstep(0.0, 0.14, u) * smoothstep(1.0, 0.7, u);
    return sh.x * holes * edges;
  }
`;

/**
 * The spray sheet a running float throws: the water the chine displaces leaves it as one continuous film (the
 * "blister" of a planing hull, the curtain of a touchdown), not as particles. Every SHEET_DT the emitter samples
 * the wetted chine at SHEET_ROWS stations with the launch velocity of the water leaving it (sideways and up,
 * faster the deeper the hull runs and the faster it is sinking: Wagner's wedge jet), and the surface drawn is the
 * ballistic flight of those samples through the water's frame: a swept fan that hangs behind the hull, arching
 * out and down, its far edge a second old. A curved, lit, translucent sheet: glassy at the root (the film is
 * clear water), whitening as it tears into ligaments, gone where it has fallen back to the surface. Casts a
 * ragged shadow through its own coverage. One mesh per chine (four per aircraft), rebuilt on the CPU per frame.
 */
class SpraySheet {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.MeshStandardMaterial;
  private readonly geo: THREE.BufferGeometry;
  private readonly pos: Float32Array;
  private readonly sh: Float32Array;
  private readonly nrm: Float32Array;
  private readonly idx: Uint16Array;
  /** ring of emission columns: time, per-row root position (world) and launch velocity, strength */
  private readonly colT = new Float64Array(SHEET_COLS).fill(-1e9);
  private readonly colP = new Float32Array(SHEET_COLS * SHEET_ROWS * 3);
  private readonly colV = new Float32Array(SHEET_COLS * SHEET_ROWS * 3);
  private readonly colK = new Float32Array(SHEET_COLS);
  private readonly colSurf = new Float32Array(SHEET_COLS);
  private head = 0;
  private lastEmit = -1e9;
  private readonly tmpA = new THREE.Vector3();
  private readonly tmpB = new THREE.Vector3();
  private readonly tmpC = new THREE.Vector3();

  constructor(material: THREE.MeshStandardMaterial, depth: THREE.MeshDepthMaterial) {
    const n = SHEET_COLS * SHEET_ROWS;
    this.pos = new Float32Array(n * 3);
    this.sh = new Float32Array(n * 4);
    this.nrm = new Float32Array(n * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('normal', new THREE.BufferAttribute(this.nrm, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSh', new THREE.BufferAttribute(this.sh, 4).setUsage(THREE.DynamicDrawUsage));
    // the index is rebuilt per frame: only quads between consecutive live columns of one contact (a dead column,
    // or a gap where the float skipped clear of the water, must not bridge a sliver across to the next sample)
    this.idx = new Uint16Array((SHEET_COLS - 1) * (SHEET_ROWS - 1) * 6);
    this.geo.setIndex(new THREE.BufferAttribute(this.idx, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setDrawRange(0, 0);
    this.material = material;
    this.mesh = new THREE.Mesh(this.geo, material);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.customDepthMaterial = depth;
    this.mesh.renderOrder = 6;
  }

  clear(): void { this.colT.fill(-1e9); this.head = 0; this.lastEmit = -1e9; this.geo.setDrawRange(0, 0); }

  /**
   * Sample the emitter: `root(u, out)` gives the world position of the spray root at station u (0 front .. 1 aft),
   * `launch(u, out)` the launch velocity of the water leaving it there; `k` the sheet's strength (mass of water
   * thrown), `surfaceY` the water level the fallen film dies at.
   */
  emit(time: number, k: number, surfaceY: number, root: (u: number, out: THREE.Vector3) => THREE.Vector3, launch: (u: number, out: THREE.Vector3) => THREE.Vector3): void {
    if (time - this.lastEmit < SHEET_DT * 0.98) return;
    this.lastEmit = time;
    const c = this.head;
    this.head = (this.head + 1) % SHEET_COLS;
    this.colT[c] = time;
    this.colK[c] = k;
    this.colSurf[c] = surfaceY;
    for (let r = 0; r < SHEET_ROWS; r++) {
      const u = r / (SHEET_ROWS - 1);
      const p = root(u, this.tmpA), v = launch(u, this.tmpB);
      const o = (c * SHEET_ROWS + r) * 3;
      this.colP[o] = p.x; this.colP[o + 1] = p.y; this.colP[o + 2] = p.z;
      this.colV[o] = v.x; this.colV[o + 1] = v.y; this.colV[o + 2] = v.z;
    }
  }

  /** Rebuild the fan for the current time (columns in age order, oldest first). */
  update(time: number): void {
    const pos = this.pos, sh = this.sh, nrm = this.nrm, idx = this.idx;
    let nIdx = 0, prevT = -1e9;
    for (let i = 0; i < SHEET_COLS; i++) {
      // column i of the mesh is the (i)th oldest sample
      const c = (this.head + i) % SHEET_COLS;
      const tau = time - this.colT[c];
      const alive = tau >= 0 && tau < 1.5;
      // stitch this column to the previous one when both are live samples of the same run
      if (alive && this.colT[c] - prevT < SHEET_DT * 3.5) {
        for (let r = 0; r < SHEET_ROWS - 1; r++) {
          const a = (i - 1) * SHEET_ROWS + r, b = a + 1, d = a + SHEET_ROWS, e = d + 1;
          idx[nIdx++] = a; idx[nIdx++] = d; idx[nIdx++] = b; idx[nIdx++] = b; idx[nIdx++] = d; idx[nIdx++] = e;
        }
      }
      prevT = alive ? this.colT[c] : -1e9;
      const k = this.colK[c];
      const surf = this.colSurf[c];
      // the film flies nearly ballistically; what it breaks into (ligaments, drops) meets more air: the horizontal
      // reach saturates (drag), the fall is free
      const kh = 1.1, kv = 0.7;
      const th = (1 - Math.exp(-kh * tau)) / kh, tv = (1 - Math.exp(-kv * tau)) / kv;
      const fall = 0.5 * 9.81 * tau * tau;
      // the film thins as it spreads and is gone once its drops have fallen: alive 0.1 s whole, torn by 0.6 s, a
      // fading mist of drops to 1.2 s (longer for a heavy sheet)
      const life = 0.85 + 0.35 * Math.min(k, 2);
      const fade = alive ? (1 - smoothstep(life * 0.45, life, tau)) * Math.min(k, 1.6) : 0;
      for (let r = 0; r < SHEET_ROWS; r++) {
        const u = r / (SHEET_ROWS - 1);
        const s = (c * SHEET_ROWS + r) * 3, o = (i * SHEET_ROWS + r);
        let x = this.colP[s], y = this.colP[s + 1], z = this.colP[s + 2];
        let a = 0;
        if (alive) {
          x += this.colV[s] * th; z += this.colV[s + 2] * th;
          y += this.colV[s + 1] * tv - fall;
          // fallen back into the water: the film is the wake's foam now
          const dip = surf - y;
          a = fade * (1 - smoothstep(-0.05, 0.25, dip));
          if (dip > 0.25) y = surf - 0.25;
        }
        pos[o * 3] = x; pos[o * 3 + 1] = y; pos[o * 3 + 2] = z;
        // z: the column's emission time, the along-fan noise coordinate (wrapped far outside any fan's 1.5 s span)
        sh[o * 4] = a; sh[o * 4 + 1] = Math.max(tau, 0); sh[o * 4 + 2] = alive ? this.colT[c] % 1024 : 0; sh[o * 4 + 3] = u;
      }
    }
    // normals from the fan's own surface (a translucent film lit from both sides: the sign only matters for the
    // specular sheen, and DoubleSide flips it for the back faces)
    for (let i = 0; i < SHEET_COLS; i++) for (let r = 0; r < SHEET_ROWS; r++) {
      const o = i * SHEET_ROWS + r;
      const i1 = Math.min(i + 1, SHEET_COLS - 1), i0 = Math.max(i - 1, 0), r1 = Math.min(r + 1, SHEET_ROWS - 1), r0 = Math.max(r - 1, 0);
      const a = this.tmpA.set(pos[(i1 * SHEET_ROWS + r) * 3] - pos[(i0 * SHEET_ROWS + r) * 3], pos[(i1 * SHEET_ROWS + r) * 3 + 1] - pos[(i0 * SHEET_ROWS + r) * 3 + 1], pos[(i1 * SHEET_ROWS + r) * 3 + 2] - pos[(i0 * SHEET_ROWS + r) * 3 + 2]);
      const b = this.tmpB.set(pos[(i * SHEET_ROWS + r1) * 3] - pos[(i * SHEET_ROWS + r0) * 3], pos[(i * SHEET_ROWS + r1) * 3 + 1] - pos[(i * SHEET_ROWS + r0) * 3 + 1], pos[(i * SHEET_ROWS + r1) * 3 + 2] - pos[(i * SHEET_ROWS + r0) * 3 + 2]);
      const n = this.tmpC.crossVectors(a, b);
      if (n.lengthSq() < 1e-10) n.set(0, 1, 0); else n.normalize();
      nrm[o * 3] = n.x; nrm[o * 3 + 1] = n.y; nrm[o * 3 + 2] = n.z;
    }
    const g = this.geo;
    (g.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (g.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
    (g.attributes.aSh as THREE.BufferAttribute).needsUpdate = true;
    g.index!.needsUpdate = true;
    g.setDrawRange(0, nIdx);
  }

  /** the lit material shared by every sheet (registered with the game's shadow hook like the spray quads) */
  static makeMaterial(): THREE.MeshStandardMaterial {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.0, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 aSh;\nvarying vec4 vSh;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSh = aSh;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${SHEET_GLSL}`)
        .replace('#include <map_fragment>', /* glsl */ `
          #include <map_fragment>
          float film, tornK;
          float cov = sheetCoverage(vSh, film, tornK);
          if (cov < 0.01) discard;
          // a whole film is clear water seen edge-on: it takes the sea's tint and lets most of the light through;
          // the torn film is aerated and white
          diffuseColor.rgb = mix(vec3(0.97, 0.985, 1.0), vec3(0.55, 0.82, 0.9), 0.7 * film);
          diffuseColor.a *= cov * mix(0.9, 0.45, film);
        `)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.85, 0.12, film);');
    };
    mat.customProgramCacheKey = () => 'spray-sheet-v1';
    return mat;
  }

  /** the shadow-pass material: the same coverage, cut hard, so the sheet's shadow on the water is ragged */
  static makeDepthMaterial(): THREE.MeshDepthMaterial {
    const mat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 aSh;\nvarying vec4 vSh;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSh = aSh;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${SHEET_GLSL}`)
        .replace('#include <map_fragment>', '#include <map_fragment>\nfloat film, tornK; if (sheetCoverage(vSh, film, tornK) * mix(1.0, 0.5, film) < 0.3) discard;');
    };
    mat.customProgramCacheKey = () => 'spray-sheet-depth-v1';
    return mat;
  }
}

/** Float wakes, bow spray, exhaust smoke and wingtip condensation trails. */
export class PlaneEffects {
  readonly wakeL: WakeTrail;
  readonly wakeR: WakeTrail;
  readonly spray: SprayCloud;
  /** the continuous spray films off the four chines: [port out, port in, stbd in, stbd out] */
  readonly sheets: SpraySheet[];
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
  private boilAcc = 0;
  /** the impact splats of the wake maps (null when the batch has none) */
  private readonly splats: SplatBatch | null;

  constructor(wakes: WakeBatch, scene: THREE.Scene) {
    // float hull: 5.7 m from stern to stem, 0.37 m half-beam at the chine (see model.ts floatSections); a float
    // has no propeller behind it (no prop wash lane) and planes at ~15 m/s
    // (r8: 30 s of lane, not 16: the slick road a taxiing float leaves outlasts its froth, and at 3.8 m/s the
    // 16 s ribbon ended 60 m astern, right where the chase camera's foreground is; 80 points at 1.5 m spacing
    // hold 120 m, so at planing speed the capacity, not the lifetime, still bounds the ribbon)
    this.wakeL = new WakeTrail(80, 0.37, 30, 1.1, wakes, 5.7, 1.5);
    this.wakeR = new WakeTrail(80, 0.37, 30, 1.1, wakes, 5.7, 1.5);
    for (const w of [this.wakeL, this.wakeR]) { w.propWash = 0; w.planingSpeed = 15; w.churn = 0.85; }
    this.splats = wakes.splats;
    const tex = spriteTexture();
    // (640: a level wing slapping down emits its curtain along the whole span in one frame, on top of the
    // touchdown plume; 480 evicted the planing spray)
    this.spray = new SprayCloud(640, sprayTexture());
    const sheetMat = SpraySheet.makeMaterial(), sheetDepth = SpraySheet.makeDepthMaterial();
    this.sheets = [0, 1, 2, 3].map(() => new SpraySheet(sheetMat, sheetDepth));
    this.exhaust = new ParticleCloud(120, new THREE.Color(0.25, 0.24, 0.23), tex, 0.22, THREE.NormalBlending);
    scene.add(this.spray.mesh, this.exhaust.points, ...this.sheets.map((s) => s.mesh));
    this.vortexL = new WakeTrail(90, 0.5, 2.2, 0.6, CONTRAIL_MATERIAL);
    this.vortexR = new WakeTrail(90, 0.5, 2.2, 0.6, CONTRAIL_MATERIAL);
    scene.add(this.vortexL.mesh!, this.vortexR.mesh!);
    this.litMaterials = [this.spray.material, sheetMat];
    this.unmirrored = [this.spray.mesh, this.exhaust.points, this.vortexL.mesh!, this.vortexR.mesh!];
  }

  /** Drop every trail, particle and decal (used when the aircraft is re-placed). */
  reset(): void {
    this.wakeL.reset(); this.wakeR.reset(); this.vortexL.reset(); this.vortexR.reset();
    this.spray.clear(); this.exhaust.clear();
    for (const s of this.sheets) s.clear();
    this.splats?.clear();
    this.sprayAcc = 0; this.tailAcc = 0; this.exhaustAcc = 0; this.ploughAcc = 0; this.boilAcc = 0;
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
    let px = -mz, pz = mx;                                                      // across it
    const structural = imp.part !== 'float' && imp.part !== 'wheel';
    const rng = this.rng;
    // a line contact (a level wing slapping down along its span, an inverted cabin along its length): the water
    // leaves along the whole wetted length at once, thrown out to either side of the line and up, so the curtain
    // is as long as the wing and the splat a band along it (r4: the wing stations are the tips, so an inverted
    // airframe falling flat onto the water raised two starbursts at the tips and nothing along the 15 m between)
    const ext = imp.extent;
    const L = ext ? ext.to - ext.from : 0;
    if (ext) { px = -ext.dz; pz = ext.dx; }
    const ex = ext ? ext.dx : 0, ez = ext ? ext.dz : 0;
    const spread = 1 + L / 5;   // emitter counts grow with the wetted length (a 7.5 m half span: 2.5 x a point)
    // sheets: a curtain either side of the keel for a float (thrown outward and up, leaning forward), a plume for
    // a wing tip / the nose (thrown up and back over the part, as the water it ploughs is flung aft)
    // (r2: the sheets leave the chines at 35-55 degrees from the vertical, not straight up: a float landing at
    // 3 m/s sink throws two curtains out to the sides that the camera sees as a V behind the hull, with the
    // fuselage still visible between them; the r1 clips wrapped the tail in one white mass)
    // (a float's curtain is the continuous sheet mesh now: the quads only add the fragments torn off its rim)
    const nSheet = Math.round((structural ? 8 + 16 * E : 2 + 5 * E) * spread);
    for (let i = 0; i < nSheet; i++) {
      const s = rng.next() < 0.5 ? -1 : 1;
      const u = ext ? ext.from + rng.next() * L : 0;
      const along = structural ? -(0.5 + rng.next() * 2.0) * (0.4 + E) : (rng.next() - 0.35) * 1.6;
      // off a line the curtain leaves to both sides at the angle of a float's chine, not as a tip's narrow plume
      const out = ext ? (1.6 + rng.next() * 2.4) * s * (0.55 + 0.7 * E) : structural ? (0.6 + rng.next() * 1.8) * s : (2.4 + rng.next() * 3.2) * s * (0.55 + 0.7 * E);
      const up = (1.8 + 4.2 * E) * (0.6 + 0.6 * rng.next()) + (structural ? 0.02 * spd : 0);
      const carry = structural ? 0.22 : 0.3 + 0.1 * E;
      this.spray.emit({
        x: imp.x + ex * u + mx * (rng.next() - 0.5) * 1.2 + px * out * 0.1, y: imp.y + 0.08, z: imp.z + ez * u + mz * (rng.next() - 0.5) * 1.2 + pz * out * 0.1,
        vx: imp.vx * carry + mx * along + px * out + (rng.next() - 0.5) * 0.6, vy: up, vz: imp.vz * carry + mz * along + pz * out + (rng.next() - 0.5) * 0.6,
        life: 0.45 + rng.next() * 0.35 + 0.3 * E, age: 0, size: 1, tile: TILE_SHEET,
        len: (1.2 + rng.next() * 1.4) * (0.8 + 0.9 * E), wid: (0.45 + rng.next() * 0.45) * (0.9 + 0.6 * E),
        alpha: 0.24 + 0.22 * rng.next() + 0.14 * E,
      });
    }
    // droplets: from the sheets' rims, more forward momentum, ballistic
    const nDrop = Math.round((6 + 20 * E) * spread);
    for (let i = 0; i < nDrop; i++) {
      const s = rng.next() < 0.5 ? -1 : 1;
      const u = ext ? ext.from + rng.next() * L : 0;
      const out = (1.2 + rng.next() * 3.2) * s * (0.6 + 0.7 * E);
      const along = structural ? -(rng.next() * 3.0) : rng.next() * 2.5;
      this.spray.emit({
        x: imp.x + ex * u + px * out * 0.2, y: imp.y + 0.3 + rng.next() * 0.5, z: imp.z + ez * u + pz * out * 0.2,
        vx: imp.vx * (0.4 + 0.2 * E) + mx * along + px * out, vy: 2.0 + 4.5 * E * rng.next() + rng.next() * 1.5, vz: imp.vz * (0.4 + 0.2 * E) + mz * along + pz * out,
        life: 0.6 + rng.next() * 0.5 + 0.2 * E, age: 0, size: 1, tile: TILE_DROPS,
        len: (0.8 + rng.next() * 0.9) * (0.8 + 0.6 * E), wid: (0.35 + rng.next() * 0.4) * (0.8 + 0.5 * E),
        alpha: 0.35 + 0.3 * rng.next() + 0.1 * E,
      });
    }
    // mist: faint rags where the sheets break, hanging behind the contact (small: the r1 mist quads grew to
    // 5-6 m and were the soft white discs that hid everything else)
    const nMist = Math.round((2 + 6 * E) * spread);
    for (let i = 0; i < nMist; i++) {
      const s = (rng.next() - 0.5) * 2;
      const u = ext ? ext.from + rng.next() * L : 0;
      this.spray.emit({
        x: imp.x + ex * u - mx * (0.5 + rng.next() * 1.5) + px * s * 1.6, y: imp.y + 0.5 + rng.next() * 0.7 + 0.6 * E, z: imp.z + ez * u - mz * (0.5 + rng.next() * 1.5) + pz * s * 1.6,
        vx: imp.vx * 0.25 + px * s * 1.0, vy: 0.9 + 1.4 * E + rng.next() * 0.7, vz: imp.vz * 0.25 + pz * s * 1.0,
        life: 1.3 + rng.next() * 0.8 + 0.6 * E, age: 0, size: 1, tile: TILE_MIST,
        len: (1.0 + rng.next() * 0.9) * (0.8 + 0.7 * E), wid: (0.8 + rng.next() * 0.7) * (0.8 + 0.7 * E),
        alpha: 0.07 + 0.08 * rng.next() + 0.1 * E,
      });
    }
    // the surface itself: the splat, stretched along the motion by the speed; off a line contact it is centred on
    // the wetted length and stretched along it instead (the shader's r0 for this energy and kind sets the stretch)
    if (this.splats) {
      if (ext && L > 0.8) {
        const r0 = (0.6 + 1.3 * E) * (structural ? 1.6 : 1);
        const mid = 0.5 * (ext.from + ext.to);
        this.splats.add(imp.x + ex * mid, imp.z + ez * mid, time, E, ex, ez, Math.max(1, (0.5 * L + r0) / r0), structural ? 1 : 0);
      } else {
        this.splats.add(imp.x, imp.z, time, E, imp.vx, imp.vz, 1 + Math.min(spd, 30) * 0.05, structural ? 1 : 0);
      }
    }
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
        len: tile === TILE_MIST ? 1.0 + rng.next() * 0.8 : (0.9 + rng.next() * 1.2) * (0.7 + 0.6 * k), wid: tile === TILE_MIST ? 0.8 + rng.next() * 0.6 : (0.4 + rng.next() * 0.5) * (0.8 + 0.4 * k),
        alpha: tile === TILE_MIST ? 0.06 + 0.08 * rng.next() : 0.28 + 0.25 * rng.next(),
      });
    }
    // a splat every ~2 m of travel (the accumulator shares the plume's clock: one splat per ~25 particles)
    if (this.splats && Math.floor((time - dt) * spd / 2) !== Math.floor(time * spd / 2)) this.splats.add(imp.x, imp.z, time, 0.25 + 0.5 * k, imp.vx, imp.vz, 1.5 + k, 1);
  }

  /**
   * Feed the four chine sheets. Hull frame: float centrelines at z = +-1.25, hard chine 0.37 m off them at y -1.95
   * (parts/floats.ts), the step at x -0.35. The wetted chine runs from the step forward to where the stagnation
   * line meets the chine, further forward the deeper the hull runs; at touchdown (sinking fast) the whole forebody
   * chine takes the water at once. The water leaves the chine sideways and up: at the running draft as the whisker
   * spray of a planing hull (about a fifth of the speed sideways, a sixth up), plus the wedge jet of a sinking
   * hull (a few times the sink rate), thrown a little forward at the stagnation end. Launched in the water's frame
   * (the hull runs on ahead of what it threw), so the sheet sweeps aft into the blister / curtain the eye knows.
   */
  private updateSheets(flight: FlightModel, dt: number, time: number, fdx: number, fdz: number): void {
    const q = flight.quaternion;
    const t = flight.telemetry;
    const V = t.groundSpeed;
    const right = this.right.set(0, 0, 1).applyQuaternion(q);
    right.y = 0;
    if (right.lengthSq() < 1e-6) right.set(-fdz, 0, fdx); else right.normalize();
    const rx = right.x, rz = right.z;
    for (let i = 0; i < 2; i++) {
      const fs = flight.floats[i];
      const fz = i === 0 ? -1.25 : 1.25;
      const onStep = fs.step > -0.02, onBow = fs.bow > -0.02;
      const running = t.onWater && !flight.wreck && V > 3.5 && (onStep || onBow);
      const sink = clamp(-fs.vy, 0, 4);
      const draft = clamp(Math.max(fs.step, fs.bow * 0.7), 0, 0.6);
      const kd = clamp(draft / 0.12, 0, 1);
      // strength: how much water the chine throws (the running blister ~1, a firm touchdown several times that)
      const k = smoothstep(3.5, 8, V) * (0.25 + 0.75 * kd) * (1 + 1.1 * sink);
      const xFront = onStep ? clamp(0.5 + 3.0 * draft + 0.5 * sink, 0.5, 2.5) : 2.5;
      const xAft = onStep ? -0.4 : 1.2;
      const surf = fs.surfaceY;
      for (let sd = 0; sd < 2; sd++) {
        // sd 0: outboard chine, 1: inboard (the inboard sheets meet between the floats: shorter, lower)
        const s = sd === 0 ? Math.sign(fz) : -Math.sign(fz);
        const sheet = this.sheets[i * 2 + sd];
        if (running) {
          const inK = sd === 1 ? 0.65 : 1;
          const root = (u: number, out: THREE.Vector3): THREE.Vector3 => {
            out.set(lerp(xFront, xAft, u), -1.95, fz + s * 0.37).applyQuaternion(q).add(flight.position);
            out.y = surf + 0.03;
            return out;
          };
          const launch = (u: number, out: THREE.Vector3): THREE.Vector3 => {
            const lat = (0.17 * V * kd + 1.2 * sink) * (0.85 + 0.35 * u) * inK * s;
            const up = Math.min((0.16 * V * kd + 1.6 * sink) * (1.15 - 0.4 * u) * (0.8 + 0.2 * inK), 8.5);
            const fwd = 0.05 * V + 0.07 * V * (1 - u);
            return out.set(rx * lat + fdx * fwd, up, rz * lat + fdz * fwd);
          };
          sheet.emit(time, k * inK, surf, root, launch);
        }
        sheet.update(time);
      }
    }
    void dt;
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
      // a flooding hull sits deep: the ribbon head widens its outline to the section that cuts the surface and
      // draws a collar of foam around it (the only hull that ever sits below its waterline is a wreck's)
      trail.immersion = flight.wreck ? Math.min(flight.wreck.flood[i] * 1.25, 1) : 0;
      // the real running depth and sink rate of this float drive the pile-up beside its chines, the spray root
      // and the hollow off its step (the ribbon used to know only the speed: a float driven 40 cm under at
      // touchdown and one skimming at 8 cm drew the same surface)
      trail.draft = wet ? clamp(Math.max(fs.step, fs.bow * 0.7), 0, 0.6) : 0;
      trail.sink = wet ? clamp(-fs.vy, 0, 4) : 0;
      trail.update(p.x, p.z, fdx, fdz, time, wet, speed);
    }
    this.updateSheets(flight, dt, time, fdx, fdz);
    // parts that entered the water this frame (float touchdowns and skips, wheels, a wing tip, the nose): the
    // structured splash and the surface splat at each contact point
    for (const imp of flight.impacts) this.splash(flight, imp, time);
    // parts still ploughing through the water at speed (ditching): a continuous plume behind each
    for (const pl of flight.ploughing) this.plough(pl, dt, time);
    // a flooding hull boils: the air driven out of a split float breaks the surface around it in bursts for as
    // long as it fills (and the churn of the ditching keeps bubbling up for a while after), so the wreck does not
    // lie in glassy water seconds after coming to rest (r4b)
    const w = flight.wreck;
    if (w && t.onWater && speed < 6) {
      this.boilAcc += dt;
      while (this.boilAcc >= 0.3) {
        this.boilAcc -= 0.3;
        for (let i = 0; i < 2; i++) {
          const filling = w.floodTarget[i] - w.flood[i];
          const boil = Math.max(Math.min(filling * 3, 1), 0.5 * (1 - smoothstep(6, 25, w.age)));
          if (boil < 0.05 || this.rng.next() > boil) continue;
          const stern = i === 0 ? model.floatSternL : model.floatSternR;
          const p = this.tmp.copy(stern).setX(-1.8 + this.rng.next() * 4.0).setZ(stern.z + (this.rng.next() - 0.5) * 0.9).applyQuaternion(q).add(flight.position);
          const sy = floats[i].surfaceY;
          this.splats?.add(p.x, p.z, time, 0.04 + 0.12 * boil, 1, 0, 1, 0);
          const nb = 2 + Math.round(3 * this.rng.next() * boil);
          for (let k = 0; k < nb; k++) {
            this.spray.emit({
              x: p.x + (this.rng.next() - 0.5) * 0.7, y: sy + 0.1, z: p.z + (this.rng.next() - 0.5) * 0.7,
              vx: (this.rng.next() - 0.5) * 0.9, vy: 0.5 + this.rng.next() * 1.0 * boil, vz: (this.rng.next() - 0.5) * 0.9,
              life: 0.35 + this.rng.next() * 0.3, age: 0, size: 1, tile: TILE_DROPS,
              len: 0.25 + this.rng.next() * 0.3, wid: 0.2 + this.rng.next() * 0.2, alpha: 0.28 + 0.2 * this.rng.next(),
            });
          }
        }
      }
    } else this.boilAcc = 0;
    // spray: the bow wave tears into sheets from about 5 m/s (the hump), then the chines throw the spray blister
    // sideways and aft from the forebody while planing; dies away once the floats are unloaded. Three fractions:
    // the root sheets (a dense translucent curtain hugging the chine, opening outward and leaning forward),
    // the droplets its rim breaks into (higher, further out, falling), and the mist that hangs behind
    if (t.onWater && speed > 4.5) {
      const hump = smoothstep(4.5, 11, speed);
      const right = this.right.set(0, 0, 1).applyQuaternion(q);
      const v = flight.velocity;
      // slip: the water meets a skidding hull on its side (a slewing wreck, a yawed touchdown), so the spray
      // leaves the upstream side along the hull's whole length and is thrown along the motion and up, like the
      // wall a hull pushes sliding sideways, instead of off the two chines as if it were running straight
      const vh = Math.hypot(v.x, v.z) || 1;
      const wx = v.x / vh, wz = v.z / vh;
      const slipSin = wx * right.x + wz * right.z;   // + : sliding toward starboard
      const slip = smoothstep(0.25, 0.7, Math.abs(slipSin));
      const upSide = slipSin > 0 ? 1 : -1;
      const rate = (26 * hump + 70 * smoothstep(9, 18, speed)) * (1 - 0.55 * smoothstep(28, 40, speed)) * (1 + 1.5 * slip);
      this.sprayAcc += rate * dt;
      while (this.sprayAcc >= 1) {
        this.sprayAcc -= 1;
        for (const bow of [model.floatBowL, model.floatBowR]) {
          const side = bow.z > 0 ? 1 : -1;
          const fs = floats[side > 0 ? 1 : 0];
          // only a float that is actually running in the water throws spray
          if (fs.step < -0.02 && fs.bow < -0.02) continue;
          // emission station: at the bow in the hump phase, spread over the forebody chine when planing, along
          // the upstream side in a skid
          const ax = lerp(lerp(2.3, 0.4 + this.rng.next() * 1.6, planing), -2.0 + this.rng.next() * 4.3, slip);
          const p = this.tmp.copy(bow).setX(ax).setZ(bow.z + lerp(side * 0.3, upSide * 0.35, slip)).applyQuaternion(q).add(flight.position);
          const u = this.rng.next();
          // the film itself is the sheet mesh: the quads are the drops torn off its rim and the mist behind it
          const tile = u < 0.12 ? TILE_SHEET : u < 0.72 ? TILE_DROPS : TILE_MIST;
          const lat = (tile === TILE_MIST ? 1.5 + this.rng.next() * 1.5 : (1.6 + this.rng.next() * 2.6) * (0.6 + 0.6 * hump) + speed * (tile === TILE_DROPS ? 0.07 : 0.045));
          const up = tile === TILE_MIST ? 0.8 + this.rng.next() * 1.2 : tile === TILE_DROPS ? 1.8 + this.rng.next() * 2.4 + speed * 0.06 : 1.0 + this.rng.next() * 1.6 + speed * 0.045;
          // the sheets leave the chine nearly still in the water's frame (the float runs on ahead of them); the
          // drops keep a little more of the hull's speed, the mist stays where it was born
          const carry = tile === TILE_SHEET ? 0.16 : tile === TILE_DROPS ? 0.24 : 0.08;
          const tx = lerp(right.x * side, wx, slip), tz = lerp(right.z * side, wz, slip);
          this.spray.emit({
            x: p.x, y: fs.surfaceY + (tile === TILE_MIST ? 0.9 + this.rng.next() * 0.7 : 0.12), z: p.z,
            vx: v.x * carry + tx * lat + (this.rng.next() - 0.5) * 1.2,
            vy: up,
            vz: v.z * carry + tz * lat + (this.rng.next() - 0.5) * 1.2,
            life: tile === TILE_MIST ? 1.1 + this.rng.next() * 0.9 : tile === TILE_SHEET ? 0.35 + this.rng.next() * 0.3 : 0.5 + this.rng.next() * 0.5, age: 0,
            size: 1, tile,
            // sheets are short and wide (a blister of water, not a spike); droplet clusters are stretched along
            // their flight (a round cluster read as a puff); the mist is a soft cloud
            len: tile === TILE_SHEET ? 0.9 + this.rng.next() * 0.7 + speed * 0.01 : tile === TILE_DROPS ? 0.8 + this.rng.next() * 0.9 : 1.0 + this.rng.next() * 0.8,
            wid: tile === TILE_SHEET ? 0.7 + this.rng.next() * 0.6 : tile === TILE_DROPS ? 0.35 + this.rng.next() * 0.4 : 0.8 + this.rng.next() * 0.6,
            alpha: tile === TILE_SHEET ? 0.3 + 0.22 * this.rng.next() : tile === TILE_DROPS ? 0.3 + 0.3 * this.rng.next() : 0.06 + 0.08 * this.rng.next(),
          });
        }
      }
    }
    // rooster tail: on the step the flow leaves the transom clean and closes behind it in a plume of spray a
    // hull length back, one per float, thrown up and left behind (it hangs nearly still in the water's frame)
    if (t.onWater && planing > 0.05) {
      // (r4: 30/s, mostly drops and thin sheets, 1.5-2.5 m up: at 44/s with a fifth of them mist rags the two
      // plumes read as cotton puffs a metre and a half across in the 3 s planing frame of `water-landing`)
      this.tailAcc += 30 * planing * dt;
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
          const tile = u < 0.45 ? TILE_DROPS : u < 0.9 ? TILE_SHEET : TILE_MIST;
          // the plume: the two flows off the step close behind the transom and shoot up 1.5-2.5 m
          this.spray.emit({
            x: p.x, y: fs.surfaceY + (tile === TILE_MIST ? 0.9 : 0.15), z: p.z,
            vx: v.x * 0.1 + (this.rng.next() - 0.5) * 1.0,
            vy: (tile === TILE_MIST ? 0.9 + this.rng.next() * 0.8 : 1.8 + this.rng.next() * 2.2) * planing,
            vz: v.z * 0.1 + (this.rng.next() - 0.5) * 1.0,
            life: tile === TILE_MIST ? 0.9 + this.rng.next() * 0.6 : 0.4 + this.rng.next() * 0.35, age: 0,
            size: 1, tile,
            len: tile === TILE_DROPS ? 0.7 + this.rng.next() * 0.7 : tile === TILE_SHEET ? 0.7 + this.rng.next() * 0.6 : 0.7 + this.rng.next() * 0.6,
            wid: tile === TILE_DROPS ? 0.3 + this.rng.next() * 0.3 : tile === TILE_SHEET ? 0.3 + this.rng.next() * 0.3 : 0.5 + this.rng.next() * 0.5,
            alpha: tile === TILE_MIST ? 0.05 + 0.06 * this.rng.next() : 0.26 + 0.22 * this.rng.next(),
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
