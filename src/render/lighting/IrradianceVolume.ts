import * as THREE from 'three';
import { Groups } from '../../core/GameContext';
import type { IPhysics, RaycastHit } from '../../core/Interfaces';

/**
 * Sky visibility and indirect bounce, baked on the CPU against the physics BVH.
 *
 * One set of rays answers both questions, which is the whole reason to do it
 * this way. A ray that escapes tells you the point can see sky; a ray that hits
 * tells you what colour the light coming back from that direction is. Firing
 * them twice would double the cost of the only expensive part.
 *
 * Two volumes come out:
 *
 *  - **Sky visibility** — how open the sky is above a point and which way the
 *    opening lies, as an RGBA8 3D texture. This is what stops a room being lit
 *    as though its roof were not there.
 *  - **Irradiance probes** — the bounce arriving at a point, projected onto L2
 *    spherical harmonics and packed into the 3D atlas three's own probe-grid
 *    path samples. Sky is deliberately excluded: the prefiltered probe already
 *    carries it, and counting it twice is how ambient light gets away from you.
 *    What is left is exactly the interesting part — the warm light a sunlit
 *    wall throws into the shade beside it.
 *
 * Everything is amortised against a per-frame time budget, and the geometric
 * half of it is cached, so a moving sun re-lights from the cache instead of
 * re-tracing the level.
 */

/** Coefficients per probe, matching three's `getLightProbeGridIrradiance`. */
const SH_COEFFS = 9;
/**
 * Floats cached per ray: albedo rgb, hit normal xyz, sun visibility, and the
 * ambient irradiance scale at the hit point. Everything the relight needs and
 * nothing that would make it touch the BVH again.
 */
const RAY_STRIDE = 8;

const _origin = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();
const _bent = new THREE.Vector3();
const _size = new THREE.Vector3();
const _sample = new THREE.Vector4();
const _color = new THREE.Color();
const _march = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

function scratchHit(): RaycastHit {
  return {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    distance: 0,
    object: new THREE.Object3D(),
    surface: 'concrete',
  };
}

/* Two, because the sun-visibility ray is fired while the primary hit is still
   being read. Sharing one would silently overwrite the normal mid-use. */
const _hit = scratchHit();
const _shadowHit = scratchHit();

const WHITE = new THREE.Color(1, 1, 1);
const BAKE_MASK = Groups.WORLD | Groups.PROP | Groups.GLASS;

/** Directions on a Fibonacci sphere: even coverage with no seams or poles. */
function fibonacciSphere(count: number): Float32Array {
  const out = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const r = Math.sqrt(Math.max(1 - y * y, 0));
    const theta = golden * i;
    out[i * 3] = Math.cos(theta) * r;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = Math.sin(theta) * r;
  }
  return out;
}

/** Real SH basis through L2, evaluated once per fixed ray direction. */
function shBasis(x: number, y: number, z: number, out: Float32Array, offset: number): void {
  out[offset] = 0.282095;
  out[offset + 1] = 0.488603 * y;
  out[offset + 2] = 0.488603 * z;
  out[offset + 3] = 0.488603 * x;
  out[offset + 4] = 1.092548 * x * y;
  out[offset + 5] = 1.092548 * y * z;
  out[offset + 6] = 0.315392 * (3 * z * z - 1);
  out[offset + 7] = 1.092548 * x * z;
  out[offset + 8] = 0.546274 * (x * x - y * y);
}

export interface VolumeConfig {
  /** Target metres between probes. */
  spacing: number;
  rays: number;
  maxProbes: number;
  /** How far a ray looks before it counts as open sky. */
  reach: number;
}

type Phase = 'idle' | 'trace' | 'gather' | 'project';

export class IrradianceVolume {
  readonly bounds = new THREE.Box3();
  readonly resolution = new THREE.Vector3(1, 1, 1);

  /** RGBA8: bent normal in rgb, upward openness in a. */
  visibilityTexture: THREE.Data3DTexture | null = null;
  /** Half-float atlas of seven sub-volumes, in three's probe-grid layout. */
  shTexture: THREE.Data3DTexture | null = null;

  /** True once the geometric bake has finished and the volume can be trusted. */
  ready = false;
  /** 0..1 across whichever phase is running. */
  progress = 0;

  private config: VolumeConfig = { spacing: 4, rays: 32, maxProbes: 2400, reach: 32 };
  private directions: Float32Array = new Float32Array(0);
  private basis = new Float32Array(0);
  private rayCache = new Float32Array(0);
  private visibility = new Float32Array(0);
  private visibilityBytes = new Uint8Array(0);
  private shData = new Uint16Array(0);
  private sh = new Float32Array(0);
  private probeCount = 0;
  private origin = new THREE.Vector3();
  private cell = new THREE.Vector3();
  /** Where each probe was actually traced from, after relocation. */
  private positions: Float32Array = new Float32Array(0);

  private phase: Phase = 'idle';
  private cursor = 0;
  private relightSun = new THREE.Color();
  private relightSky = new THREE.Color();
  private relightDirection = new THREE.Vector3(0, 1, 0);
  /**
   * Sun direction the shadow rays were fired along. Frozen for the whole bake,
   * because half the cache would otherwise be shadowed against one sun and half
   * against another. A later relight re-projects but cannot re-shadow, so a
   * full day sweep keeps the bounce pattern of whenever the level loaded — a
   * deliberate trade, since re-tracing is two orders of magnitude dearer.
   */
  private bakeSun = new THREE.Vector3(0, 1, 0);
  private pendingRelight = false;

  /**
   * Set up the grid for a level. Returns false when there is nothing to bake.
   *
   * With `trace` false the volume is built neutral — open sky, no bounce — and
   * no rays are fired. That is the bootstrap case: the textures have to exist
   * from the first compile so that adding them later does not rebuild every
   * program in the scene, but a grid placed before the level is known must not
   * pretend to have measured it.
   */
  configure(bounds: THREE.Box3, config: Partial<VolumeConfig> = {}, trace = true): boolean {
    Object.assign(this.config, config);
    if (bounds.isEmpty()) return false;

    this.bounds.copy(bounds);
    /* A little headroom so surfaces exactly on the boundary interpolate against
       a real probe rather than clamping to the edge one. */
    this.bounds.expandByScalar(2);
    this.bounds.getSize(_size);

    const spacing = Math.max(1, this.config.spacing);
    let nx = THREE.MathUtils.clamp(Math.round(_size.x / spacing) + 1, 3, 32);
    let ny = THREE.MathUtils.clamp(Math.round(_size.y / (spacing * 0.8)) + 1, 3, 12);
    let nz = THREE.MathUtils.clamp(Math.round(_size.z / spacing) + 1, 3, 32);

    /* Trim the horizontal resolution until the probe count fits the budget; the
       vertical axis is already the cheapest one and losing it costs the most. */
    while (nx * ny * nz > this.config.maxProbes && (nx > 4 || nz > 4)) {
      if (nx >= nz && nx > 4) nx--;
      else if (nz > 4) nz--;
      else break;
    }
    while (nx * ny * nz > this.config.maxProbes && ny > 3) ny--;

    this.resolution.set(nx, ny, nz);
    this.probeCount = nx * ny * nz;
    this.origin.copy(this.bounds.min);
    this.cell.set(
      _size.x / Math.max(nx - 1, 1),
      _size.y / Math.max(ny - 1, 1),
      _size.z / Math.max(nz - 1, 1),
    );

    const rays = Math.max(8, this.config.rays);
    this.directions = fibonacciSphere(rays);
    this.basis = new Float32Array(rays * SH_COEFFS);
    for (let i = 0; i < rays; i++) {
      shBasis(
        this.directions[i * 3],
        this.directions[i * 3 + 1],
        this.directions[i * 3 + 2],
        this.basis,
        i * SH_COEFFS,
      );
    }

    this.rayCache = new Float32Array(this.probeCount * rays * RAY_STRIDE);
    this.positions = new Float32Array(this.probeCount * 3);
    this.visibility = new Float32Array(this.probeCount * 4);
    this.visibilityBytes = new Uint8Array(this.probeCount * 4);
    this.sh = new Float32Array(this.probeCount * SH_COEFFS * 3);
    this.shData = new Uint16Array(nx * ny * 7 * (nz + 2) * 4);

    this.cursor = 0;
    this.ready = false;
    this.progress = 0;
    this.phase = trace ? 'trace' : 'idle';
    this.pendingRelight = false;
    this.bakeSun.copy(this.relightDirection);
    this.buildTextures();
    return true;
  }

  get baking(): boolean {
    return this.phase !== 'idle';
  }

  /**
   * Advances whichever phase is running, for up to `budgetMs`. One call per
   * frame; the whole bake is a few hundred milliseconds of work spread thin
   * enough that nothing drops below the frame budget.
   */
  step(physics: IPhysics | undefined, budgetMs: number): void {
    if (this.phase === 'idle') {
      if (!this.pendingRelight || this.probeCount === 0) return;
      this.pendingRelight = false;
      this.cursor = 0;
      this.sh.fill(0);
      this.phase = 'project';
    }

    const deadline = performance.now() + Math.max(0.5, budgetMs);
    switch (this.phase) {
      case 'trace':
        if (!physics) return;
        this.runTrace(physics, deadline);
        break;
      case 'gather':
        this.runGather(deadline);
        break;
      case 'project':
        this.runProject(deadline);
        break;
    }
  }

  /**
   * Queues a re-projection of the cached bounce for a new sun and sky.
   *
   * No raycasts are involved: the geometry never moved, only the light on it
   * did. The work is still tens of thousands of ray records times nine
   * coefficients, so it runs in slices — a time-of-day sweep lags the probes by
   * a couple of frames instead of dropping one.
   */
  requestRelight(sunColor: THREE.Color, sunDirection: THREE.Vector3, skyColor: THREE.Color): void {
    this.relightSun.copy(sunColor);
    this.relightSky.copy(skyColor);
    this.relightDirection.copy(sunDirection).normalize();
    this.pendingRelight = true;
  }

  /* ------------------------------- tracing ------------------------------- */

  private runTrace(physics: IPhysics, deadline: number): void {
    const rays = this.directions.length / 3;
    const nx = this.resolution.x;
    const ny = this.resolution.y;

    while (this.cursor < this.probeCount) {
      const p = this.cursor;
      const ix = p % nx;
      const iy = Math.floor(p / nx) % ny;
      const iz = Math.floor(p / (nx * ny));
      _origin.set(
        this.origin.x + ix * this.cell.x,
        this.origin.y + iy * this.cell.y,
        this.origin.z + iz * this.cell.z,
      );
      const buried = this.relocate(physics, _origin);
      this.positions[p * 3] = _origin.x;
      this.positions[p * 3 + 1] = _origin.y;
      this.positions[p * 3 + 2] = _origin.z;
      if (buried) {
        /* Still solid after the escape: leave it for the dilation pass rather
           than let a black cell into the interpolation. */
        this.visibility[p * 4] = 0;
        this.visibility[p * 4 + 1] = 1;
        this.visibility[p * 4 + 2] = 0;
        this.visibility[p * 4 + 3] = -1;
        this.rayCache.fill(0, p * rays * RAY_STRIDE, (p + 1) * rays * RAY_STRIDE);
      } else {
        this.traceProbe(physics, p, _origin, rays);
      }
      this.cursor++;
      /* Checking the clock every eighth probe rather than every ray: a probe is
         a few dozen BVH queries and `performance.now` is not free either. */
      if ((this.cursor & 7) === 0 && performance.now() >= deadline) break;
    }

    this.progress = this.cursor / this.probeCount;
    if (this.cursor < this.probeCount) return;

    this.dilate();
    this.uploadVisibility();
    this.cursor = 0;
    this.phase = 'gather';
  }

  /**
   * Moves a probe out of whatever solid it landed in, in place.
   *
   * A regular grid over a level puts a large fraction of its probes inside the
   * ground, inside walls and under floors. Left alone each one reports no sky
   * and no bounce, and trilinear interpolation then drags that darkness up into
   * the open air above it — which is how a lit desert ends up shaded as though
   * it were under a roof. Relocation is the standard answer and it is what makes
   * a coarse grid usable at all.
   *
   * Inside-ness is decided by parity: march straight up counting surface
   * crossings, and an odd count means the march started in solid. That works
   * with a one-sided terrain surface as well as with closed rooms, and only
   * needs the nearest-hit raycast the physics world already offers. The escape
   * is the first crossing, because starting inside makes crossing one an exit.
   *
   * Returns true when the probe could not be freed within a cell or so, in which
   * case it is deep inside something and better dilated than trusted.
   */
  private relocate(physics: IPhysics, origin: THREE.Vector3): boolean {
    /* Enough to clear the tallest thing a probe can be buried in, and bounded
       so a level with unclosed geometry cannot turn this into a long march. */
    const ceiling = this.bounds.max.y + 4;
    let travel = 0;
    let crossings = 0;
    let firstExit = -1;
    _march.copy(origin);

    while (crossings < 12) {
      const remaining = ceiling - _march.y;
      if (remaining <= 0) break;
      if (!physics.raycastInto(_march, UP, remaining, _hit, BAKE_MASK)) break;
      const advance = _hit.distance + 0.01;
      travel += advance;
      _march.y += advance;
      if (crossings === 0) firstExit = travel;
      crossings++;
    }

    if ((crossings & 1) === 0) return false;

    /* Far enough off the surface that half the probe's rays are not spent on
       the floor it is standing on, but well inside its own cell. */
    const lift = firstExit + Math.min(0.3, this.cell.y * 0.25);
    if (lift > this.cell.y * 1.5 + 1) return true;
    origin.y += lift;
    return false;
  }

  private traceProbe(physics: IPhysics, probe: number, origin: THREE.Vector3, rays: number): void {
    const reach = this.config.reach;
    const base = probe * rays * RAY_STRIDE;
    let open = 0;
    let upper = 0;
    let blocked = 0;
    _bent.set(0, 0, 0);

    for (let r = 0; r < rays; r++) {
      const dx = this.directions[r * 3];
      const dy = this.directions[r * 3 + 1];
      const dz = this.directions[r * 3 + 2];
      _direction.set(dx, dy, dz);
      const slot = base + r * RAY_STRIDE;

      if (!physics.raycastInto(origin, _direction, reach, _hit, BAKE_MASK)) {
        /* A miss is stored as a black albedo, which is also the relight's skip
           test — an escaped ray contributes sky, and the sky is the prefiltered
           probe's job, not this one's. */
        this.rayCache[slot] = 0;
        this.rayCache[slot + 1] = 0;
        this.rayCache[slot + 2] = 0;
        if (dy > 0) {
          upper++;
          open++;
          _bent.x += dx;
          _bent.y += dy;
          _bent.z += dz;
        }
        continue;
      }

      if (dy > 0) upper++;
      if (_hit.distance < 0.4) blocked++;

      const albedo = this.albedoOf(_hit.object);
      this.rayCache[slot] = albedo.r;
      this.rayCache[slot + 1] = albedo.g;
      this.rayCache[slot + 2] = albedo.b;
      this.rayCache[slot + 3] = _hit.normal.x;
      this.rayCache[slot + 4] = _hit.normal.y;
      this.rayCache[slot + 5] = _hit.normal.z;
      this.rayCache[slot + 6] = this.sunVisibility(physics);
      /* The ambient reaching the bounce surface needs the finished visibility
         volume, so it is filled in by the gather phase. */
      this.rayCache[slot + 7] = _hit.distance;
    }

    const openness = upper > 0 ? open / upper : 1;
    if (_bent.lengthSq() < 1e-8) _bent.set(0, 1, 0);
    else _bent.normalize();

    const v = probe * 4;
    this.visibility[v] = _bent.x;
    this.visibility[v + 1] = _bent.y;
    this.visibility[v + 2] = _bent.z;
    /* A probe buried in geometry produces a black, fully occluded cell that
       bleeds into everything interpolating against it. Flag it as invalid and
       let the dilation pass fill it from whichever neighbour is outside. */
    this.visibility[v + 3] = blocked > rays * 0.7 ? -1 : openness;
  }

  /**
   * One shadow ray from the bounce point, using the *baking* sun. Cached, so a
   * later relight only pays for the projection.
   */
  private sunVisibility(physics: IPhysics): number {
    const sun = this.bakeSun;
    if (sun.y <= 0.02) return 0;
    if (_hit.normal.dot(sun) <= 0) return 0;
    _hitPoint.copy(_hit.point).addScaledVector(_hit.normal, 0.05);
    return physics.raycastInto(_hitPoint, sun, 80, _shadowHit, BAKE_MASK) ? 0 : 1;
  }

  private albedoOf(object: THREE.Object3D): THREE.Color {
    const material = (object as THREE.Mesh).material;
    const single = Array.isArray(material) ? material[0] : material;
    const colored = single as THREE.MeshStandardMaterial | undefined;
    if (!colored || !colored.color) return WHITE;
    _color.copy(colored.color);
    /* Bounce is a single pass, so an over-bright albedo compounds visibly. Real
       surfaces sit well under 0.8 and this is where that gets enforced. */
    _color.r = Math.min(_color.r, 0.85);
    _color.g = Math.min(_color.g, 0.85);
    _color.b = Math.min(_color.b, 0.85);
    return _color;
  }

  /** Fills probes that landed inside geometry from their open neighbours. */
  private dilate(): void {
    const nx = this.resolution.x;
    const ny = this.resolution.y;
    const nz = this.resolution.z;
    for (let iz = 0; iz < nz; iz++) {
      for (let iy = 0; iy < ny; iy++) {
        for (let ix = 0; ix < nx; ix++) {
          const p = ix + nx * (iy + ny * iz);
          if (this.visibility[p * 4 + 3] >= 0) continue;
          let sum = 0;
          let count = 0;
          for (let a = -1; a <= 1; a++) {
            for (let b = -1; b <= 1; b++) {
              for (let c = -1; c <= 1; c++) {
                const jx = ix + a;
                const jy = iy + b;
                const jz = iz + c;
                if (jx < 0 || jy < 0 || jz < 0 || jx >= nx || jy >= ny || jz >= nz) continue;
                const value = this.visibility[(jx + nx * (jy + ny * jz)) * 4 + 3];
                if (value < 0) continue;
                sum += value;
                count++;
              }
            }
          }
          this.visibility[p * 4 + 3] = count > 0 ? (sum / count) * 0.5 : 0;
        }
      }
    }
  }

  /* ------------------------------ gathering ------------------------------ */

  /**
   * Second pass over the cached rays: resolves how much sky each bounce surface
   * receives, now that the visibility volume it needs is complete.
   */
  private runGather(deadline: number): void {
    const rays = this.directions.length / 3;

    while (this.cursor < this.probeCount) {
      const p = this.cursor;
      const base = p * rays * RAY_STRIDE;
      /* The relocated origin, not the grid corner: the rays were fired from
         there, so the bounce points are measured from there. */
      const px = this.positions[p * 3];
      const py = this.positions[p * 3 + 1];
      const pz = this.positions[p * 3 + 2];

      for (let r = 0; r < rays; r++) {
        const slot = base + r * RAY_STRIDE;
        if (this.rayCache[slot] + this.rayCache[slot + 1] + this.rayCache[slot + 2] <= 0) continue;
        const distance = this.rayCache[slot + 7];
        const nrx = this.rayCache[slot + 3];
        const nry = this.rayCache[slot + 4];
        const nrz = this.rayCache[slot + 5];
        /* Lift the sample off the surface so the reading is the room the wall
           faces into, not the solid it belongs to. */
        this.sampleVisibility(
          px + this.directions[r * 3] * distance + nrx * 0.35,
          py + this.directions[r * 3 + 1] * distance + nry * 0.35,
          pz + this.directions[r * 3 + 2] * distance + nrz * 0.35,
          _sample,
        );
        const facing = THREE.MathUtils.clamp(
          0.5 + 0.5 * (nrx * _sample.x + nry * _sample.y + nrz * _sample.z),
          0,
          1,
        );
        this.rayCache[slot + 7] = Math.max(_sample.w, 0) * facing * Math.PI;
      }

      this.cursor++;
      if ((this.cursor & 15) === 0 && performance.now() >= deadline) break;
    }

    this.progress = this.cursor / this.probeCount;
    if (this.cursor < this.probeCount) return;

    this.ready = true;
    this.phase = 'idle';
    this.pendingRelight = true;
  }

  /* ------------------------------ projecting ----------------------------- */

  private runProject(deadline: number): void {
    const rays = this.directions.length / 3;
    /* Monte-Carlo estimate of the projection integral over the whole sphere. */
    const weight = (4 * Math.PI) / rays;
    const invPi = 1 / Math.PI;
    const sun = this.relightSun;
    const sky = this.relightSky;
    const dir = this.relightDirection;

    while (this.cursor < this.probeCount) {
      const p = this.cursor;
      const base = p * rays * RAY_STRIDE;
      const shBase = p * SH_COEFFS * 3;

      for (let r = 0; r < rays; r++) {
        const slot = base + r * RAY_STRIDE;
        const ar = this.rayCache[slot];
        const ag = this.rayCache[slot + 1];
        const ab = this.rayCache[slot + 2];
        if (ar + ag + ab <= 0) continue;

        const NdotL =
          this.rayCache[slot + 6] > 0
            ? Math.max(
                this.rayCache[slot + 3] * dir.x +
                  this.rayCache[slot + 4] * dir.y +
                  this.rayCache[slot + 5] * dir.z,
                0,
              )
            : 0;
        const ambient = this.rayCache[slot + 7];

        /* Radiance leaving the bounce surface toward this probe: the irradiance
           it receives, times its albedo, over pi for a Lambertian. */
        const lr = ar * (sun.r * NdotL + sky.r * ambient) * invPi * weight;
        const lg = ag * (sun.g * NdotL + sky.g * ambient) * invPi * weight;
        const lb = ab * (sun.b * NdotL + sky.b * ambient) * invPi * weight;
        if (lr + lg + lb <= 0) continue;

        const basisBase = r * SH_COEFFS;
        for (let c = 0; c < SH_COEFFS; c++) {
          const b = this.basis[basisBase + c];
          const out = shBase + c * 3;
          this.sh[out] += lr * b;
          this.sh[out + 1] += lg * b;
          this.sh[out + 2] += lb * b;
        }
      }

      this.cursor++;
      if ((this.cursor & 15) === 0 && performance.now() >= deadline) break;
    }

    this.progress = this.cursor / this.probeCount;
    if (this.cursor < this.probeCount) return;

    this.uploadSH();
    this.phase = 'idle';
  }

  /** Trilinear read of the baked visibility, in the same units as the shader. */
  sampleVisibility(x: number, y: number, z: number, out: THREE.Vector4): THREE.Vector4 {
    const nx = this.resolution.x;
    const ny = this.resolution.y;
    const nz = this.resolution.z;
    const fx = THREE.MathUtils.clamp((x - this.origin.x) / this.cell.x, 0, nx - 1);
    const fy = THREE.MathUtils.clamp((y - this.origin.y) / this.cell.y, 0, ny - 1);
    const fz = THREE.MathUtils.clamp((z - this.origin.z) / this.cell.z, 0, nz - 1);
    const ix = Math.min(Math.floor(fx), nx - 1);
    const iy = Math.min(Math.floor(fy), ny - 1);
    const iz = Math.min(Math.floor(fz), nz - 1);
    const jx = Math.min(ix + 1, nx - 1);
    const jy = Math.min(iy + 1, ny - 1);
    const jz = Math.min(iz + 1, nz - 1);
    const tx = fx - ix;
    const ty = fy - iy;
    const tz = fz - iz;

    out.set(0, 0, 0, 0);
    for (let c = 0; c < 8; c++) {
      const w = (c & 1 ? tx : 1 - tx) * (c & 2 ? ty : 1 - ty) * (c & 4 ? tz : 1 - tz);
      if (w <= 0) continue;
      const p = ((c & 1 ? jx : ix) + nx * ((c & 2 ? jy : iy) + ny * (c & 4 ? jz : iz))) * 4;
      out.x += this.visibility[p] * w;
      out.y += this.visibility[p + 1] * w;
      out.z += this.visibility[p + 2] * w;
      out.w += this.visibility[p + 3] * w;
    }
    return out;
  }

  /* ------------------------------ textures ------------------------------- */

  private buildTextures(): void {
    this.visibilityTexture?.dispose();
    this.shTexture?.dispose();

    const nx = this.resolution.x;
    const ny = this.resolution.y;
    const nz = this.resolution.z;

    /* Neutral until the first trace lands: fully open sky, no bounce. Materials
       compile against the volume from the first frame, so it must never be
       missing — a texture appearing later would recompile every shader. */
    for (let p = 0; p < this.probeCount; p++) {
      this.visibility[p * 4] = 0;
      this.visibility[p * 4 + 1] = 1;
      this.visibility[p * 4 + 2] = 0;
      this.visibility[p * 4 + 3] = 1;
    }

    const visibility = new THREE.Data3DTexture(this.visibilityBytes, nx, ny, nz);
    visibility.format = THREE.RGBAFormat;
    visibility.type = THREE.UnsignedByteType;
    visibility.minFilter = THREE.LinearFilter;
    visibility.magFilter = THREE.LinearFilter;
    visibility.wrapS = THREE.ClampToEdgeWrapping;
    visibility.wrapT = THREE.ClampToEdgeWrapping;
    visibility.wrapR = THREE.ClampToEdgeWrapping;
    visibility.needsUpdate = true;
    this.visibilityTexture = visibility;

    const sh = new THREE.Data3DTexture(this.shData, nx, ny, 7 * (nz + 2));
    sh.format = THREE.RGBAFormat;
    sh.type = THREE.HalfFloatType;
    sh.minFilter = THREE.LinearFilter;
    sh.magFilter = THREE.LinearFilter;
    sh.wrapS = THREE.ClampToEdgeWrapping;
    sh.wrapT = THREE.ClampToEdgeWrapping;
    sh.wrapR = THREE.ClampToEdgeWrapping;
    sh.needsUpdate = true;
    this.shTexture = sh;

    this.uploadVisibility();
  }

  private uploadVisibility(): void {
    for (let p = 0; p < this.probeCount; p++) {
      const s = p * 4;
      this.visibilityBytes[s] = Math.round((this.visibility[s] * 0.5 + 0.5) * 255);
      this.visibilityBytes[s + 1] = Math.round((this.visibility[s + 1] * 0.5 + 0.5) * 255);
      this.visibilityBytes[s + 2] = Math.round((this.visibility[s + 2] * 0.5 + 0.5) * 255);
      this.visibilityBytes[s + 3] = Math.round(
        THREE.MathUtils.clamp(this.visibility[s + 3], 0, 1) * 255,
      );
    }
    if (this.visibilityTexture) this.visibilityTexture.needsUpdate = true;
  }

  /**
   * Packs 9 RGB coefficients into three's atlas: seven RGBA sub-volumes stacked
   * along Z, each padded by a duplicate slice at both ends so the hardware
   * filter cannot read across a boundary into the next coefficient.
   */
  private uploadSH(): void {
    const nx = this.resolution.x;
    const ny = this.resolution.y;
    const nz = this.resolution.z;
    const padded = nz + 2;
    const slice = nx * ny * 4;
    const half = THREE.DataUtils.toHalfFloat;

    for (let iz = 0; iz < nz; iz++) {
      for (let iy = 0; iy < ny; iy++) {
        for (let ix = 0; ix < nx; ix++) {
          const src = (ix + nx * (iy + ny * iz)) * SH_COEFFS * 3;
          for (let t = 0; t < 7; t++) {
            const dst = (((t * padded + 1 + iz) * ny + iy) * nx + ix) * 4;
            for (let c = 0; c < 4; c++) {
              const index = t * 4 + c;
              this.shData[dst + c] = index < SH_COEFFS * 3 ? half(this.sh[src + index]) : 0;
            }
          }
        }
      }
    }

    for (let t = 0; t < 7; t++) {
      const first = (t * padded + 1) * slice;
      const last = (t * padded + nz) * slice;
      this.shData.copyWithin(t * padded * slice, first, first + slice);
      this.shData.copyWithin((t * padded + nz + 1) * slice, last, last + slice);
    }

    if (this.shTexture) this.shTexture.needsUpdate = true;
  }

  dispose(): void {
    this.visibilityTexture?.dispose();
    this.shTexture?.dispose();
    this.visibilityTexture = null;
    this.shTexture = null;
    this.rayCache = new Float32Array(0);
    this.visibility = new Float32Array(0);
    this.sh = new Float32Array(0);
    this.phase = 'idle';
  }
}
