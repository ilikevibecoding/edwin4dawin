import * as THREE from 'three';
import { Noise, Rng, clamp, smoothstep } from '../core/MathUtils';
import type { MaterialName } from '../core/Interfaces';
import type { Batcher } from './Batcher';
import { SEA_SURFACE, registerSeaFinish } from './Finish';
import {
  FX_PY,
  GeoBuf,
  addBox,
  addCylinder,
  addFloor,
  addGroundPatch,
  addQuad,
  addWedge,
  type RGB,
} from './Geo';
import {
  ALLEY,
  CORNICHE,
  COURTYARD,
  CROSS_A,
  CROSS_B,
  MAP,
  ROAD,
  SEA_LEVEL,
  SEA_WALL_X,
  SOUK,
  cellFor,
  rect,
  rectContains,
  type Rect,
} from './Layout';

/**
 * Ground.
 *
 * A flat plane is the single fastest way to make a level look like a
 * prototype, so the ground here is a height field with broad dune undulation,
 * a crowned carriageway, gutters at the kerb line and a slow fall toward the
 * sea. It is authored as one grid whose quads are sorted into material buckets
 * — asphalt, concrete paving, dirt, gravel, sand — which means surfaces meet
 * along shared edges and never z-fight, and every step between a raised
 * pavement and the road is closed by a riser generated from the grid itself.
 */

/** Metres per ground quad inside the town. Fine enough that the material
 *  boundaries read as worn edges rather than as staircases. */
const GRID = 1.25;

/** Ground uv scale; see `pushGround`. */
const GROUND_UV = 0.7;

interface Zone {
  rect: Rect;
  material: MaterialName;
  /** Height above the base field. 0.15 is a kerb. */
  lift: number;
  /** Variant of `material` to draw with; the material itself stays the
   *  physical identity the surface reports to bullets and footsteps. */
  render?: string;
  /** Extra vertex darkening, for shaded or oil-stained ground. */
  shade?: number;
  /** Multiplies the zone's vertex colour. See `GROUND_VARIANTS`. */
  tint?: RGB;
}

/**
 * Render-side adjustments to the library's ground materials.
 *
 * The carriageway is dust over a broken road base, not tarmac. Asphalt was the
 * obvious choice and the wrong one: the library's is a wet-looking near-black
 * with deep aggregate relief, and no amount of brightening stops a hundred
 * square metres of it reading as cold wet cobbles at grazing angles, which is
 * the opposite of everything above it in this light. Patches of the real surface
 * survive and are laid on top in `buildRoadPatches`. Gravel gets the same
 * treatment for the same reason — high-contrast popcorn eased back toward dust.
 *
 * These are variants rather than new materials because a variant reuses the
 * same bucket key and therefore costs no extra draw call.
 */
const GROUND_VARIANTS: ReadonlyArray<{
  key: string;
  base: MaterialName;
  normalScale: number;
  roughness?: number;
}> = [
  { key: 'ground_road', base: 'dirt', normalScale: 0.85 },
  { key: 'ground_yard', base: 'gravel', normalScale: 0.62 },
];

/*
 * Zone tints, and every one of them lifts blue relative to red.
 *
 * The library's dirt and gravel are a red-brown European soil, and the vertex
 * tints here started out warming them further — which is the instinct for a
 * desert and completely wrong. Sun-bleached dust in a North African town is a
 * pale grey-beige; saturated terracotta is what you get in a jungle or a
 * ploughed field, and it was reading as exactly that: a strong orange floor under
 * pale ochre buildings, so the ground fought the architecture instead of sitting
 * under it. Raising blue hardest, then green, then red desaturates toward dust
 * without going to a lifeless grey.
 */
/** Sun-baked dust over the road base: paler and greyer than the side lanes. */
const ROAD_TINT: RGB = [1.28, 1.3, 1.34];
/** Compound gravel, dust-blown. */
const YARD_TINT: RGB = [1.26, 1.26, 1.3];
/** Concrete paving, warmed so it does not read blue against the walls. */
const PAVE_TINT: RGB = [1.06, 1.02, 0.95];
/** Unmade ground in the souk and the alley: trodden, so slightly darker. */
const DIRT_TINT: RGB = [1.12, 1.15, 1.24];

export function registerGroundVariants(batch: Batcher): void {
  for (const v of GROUND_VARIANTS) {
    batch.registerVariant(v.key, v.base, (m) => {
      m.normalScale.multiplyScalar(v.normalScale);
      if (v.roughness !== undefined) m.roughness = v.roughness;
    });
  }
}

export interface Puddle {
  x: number;
  z: number;
  radius: number;
}

export class Terrain {
  private noise: Noise;
  private zones: Zone[] = [];
  private puddles: Puddle[] = [];
  /** Cached heights on the sample grid; the field is queried tens of
   *  thousands of times during generation. */
  private cache = new Map<number, number>();

  constructor(seed: number) {
    this.noise = new Noise(seed ^ 0x51ab);
    this.buildZones();
    this.puddles = [
      { x: -4.4, z: 9.5, radius: 2.4 },
      { x: 4.9, z: -27, radius: 1.9 },
      { x: -30.2, z: 24.5, radius: 1.6 },
      { x: 24.6, z: -8.5, radius: 1.5 },
      { x: -42.4, z: -30.5, radius: 2.1 },
      { x: 3.8, z: 47.5, radius: 1.7 },
    ];
  }

  private buildZones(): void {
    // Order matters: the first match wins, so junctions beat the streets they
    // interrupt and the carriageway beats the pavement it is cut into.
    const road = { material: 'asphalt', render: 'ground_road', tint: ROAD_TINT } as const;
    const yard = { material: 'gravel', render: 'ground_yard', tint: YARD_TINT } as const;
    this.zones = [
      { rect: rect(SEA_WALL_X, MAP.outerMinZ, CORNICHE.x1, MAP.outerMaxZ), material: 'concrete', lift: 0.15, tint: PAVE_TINT },
      { rect: rect(CROSS_A.x0, CROSS_A.z0, CROSS_A.x1, CROSS_A.z1), ...road, lift: 0 },
      { rect: rect(CROSS_B.x0, CROSS_B.z0, CROSS_B.x1, CROSS_B.z1), ...road, lift: 0 },
      { rect: rect(ROAD.x0, ROAD.z0, ROAD.x1, ROAD.z1), ...road, lift: 0 },
      { rect: rect(-8, -62, -5.6, 62), material: 'concrete', lift: 0.15, tint: PAVE_TINT },
      { rect: rect(5.6, -62, 8, 62), material: 'concrete', lift: 0.15, tint: PAVE_TINT },
      { rect: rect(SOUK.x0, SOUK.z0, SOUK.x1, SOUK.z1), material: 'dirt', lift: 0.02, shade: 0.12, tint: DIRT_TINT },
      { rect: rect(ALLEY.x0, ALLEY.z0, ALLEY.x1, ALLEY.z1), material: 'dirt', lift: 0.02, shade: 0.08, tint: DIRT_TINT },
      { rect: rect(COURTYARD.x0, COURTYARD.z0, COURTYARD.x1, COURTYARD.z1), ...yard, lift: 0.04 },
      { rect: rect(28, -16, 49, 5.5), ...yard, lift: 0.04 },
      { rect: rect(-40, -60, -34, 58), material: 'dirt', lift: 0.02, tint: DIRT_TINT },
    ];
  }

  /* ------------------------------- field -------------------------------- */

  /** Base ground height, ignoring paving lift. */
  height(x: number, z: number): number {
    const key = (Math.round(x * 4) & 0xffff) * 65536 + (Math.round(z * 4) & 0xffff);
    const hit = this.cache.get(key);
    if (hit !== undefined) return hit;
    const h = this.evaluate(x, z);
    if (this.cache.size < 400000) this.cache.set(key, h);
    return h;
  }

  private evaluate(x: number, z: number): number {
    const n = this.noise;
    // Broad dune relief, then a finer break-up so nothing reads as a plane.
    let h = 0.62 * n.fbm2(x * 0.0165, z * 0.0165, 3);
    h += 0.17 * n.fbm2(x * 0.062, z * 0.062, 3);
    h += 0.05 * n.noise2(x * 0.31, z * 0.31);
    // The town stands above the shoreline and falls away to the west.
    h += smoothstep(-46, 6, x) * 1.25;

    // Carriageway crown, with gutters where the kerb meets the asphalt.
    const inMarket = z > ROAD.z0 - 2 && z < ROAD.z1 + 2;
    if (inMarket) {
      const t = clamp(Math.abs(x) / 5.6, 0, 1.35);
      h += (0.11 * (1 - t * t) - 0.05 * smoothstep(0.82, 1.0, t)) * smoothstep(1.6, 0, Math.abs(x) - 6.4);
    }
    for (const cz of [-20, 20]) {
      const t = clamp(Math.abs(z - cz) / 4, 0, 1.3);
      if (t < 1.3 && x > -46 && x < 50) h += 0.08 * (1 - t * t) * smoothstep(1.4, 0, t - 1);
    }

    // The promenade is a built surface, so it is flatter than the ground it sits on.
    const prom = smoothstep(-38, -45, x);
    if (prom > 0) h = h * (1 - prom) + (0.34 + 0.1 * n.noise2(x * 0.05, z * 0.05)) * prom;
    return h;
  }

  /** Analytic normal, so shading stays smooth across material boundaries. */
  normal(x: number, z: number, out: THREE.Vector3): THREE.Vector3 {
    const e = 0.5;
    const hx = this.height(x + e, z) - this.height(x - e, z);
    const hz = this.height(x, z + e) - this.height(x, z - e);
    return out.set(-hx / (2 * e), 1, -hz / (2 * e)).normalize();
  }

  zoneAt(x: number, z: number): Zone | null {
    for (const zone of this.zones) {
      if (rectContains(zone.rect, x, z)) return zone;
    }
    return null;
  }

  /** Walkable surface height including paving lift. */
  surfaceHeight(x: number, z: number): number {
    const zone = this.zoneAt(x, z);
    return this.height(x, z) + (zone?.lift ?? 0);
  }

  materialAt(x: number, z: number): MaterialName {
    return this.zoneAt(x, z)?.material ?? 'sand';
  }

  /** How much standing water is at a point; used to darken and gloss ground. */
  wetness(x: number, z: number): number {
    let w = 0;
    for (const p of this.puddles) {
      const d = Math.hypot(x - p.x, z - p.z);
      w = Math.max(w, 1 - smoothstep(p.radius * 0.7, p.radius * 1.9, d));
    }
    return w;
  }

  /* ------------------------------- build -------------------------------- */

  build(batcher: Batcher, rng: Rng): void {
    registerGroundVariants(batcher);
    this.buildField(batcher, rng);
    this.buildSea(batcher);
    this.buildKerbLine(batcher);
    this.buildRoadPatches(batcher, rng);
    this.buildDrain(batcher);
    this.buildPuddles(batcher);
  }

  /**
   * What is left of the metalled surface: long islands of worn asphalt in the
   * dust, welded to the camber.
   *
   * This is the detail that says the street was paved once. A uniform dust
   * carriageway is believable but characterless, and the alternative — paving the
   * whole thing — read as wet cobbles.
   *
   * Three things had to be true before it stopped reading as carpet tiles laid
   * down the street. They are worth naming because each was individually
   * sufficient to ruin it. The patches must be *flush*: as boxes they had a lip
   * and a level top on a cambered road, so every one stood proud along one edge.
   * Their outline must be *irregular*: two straight edges parallel to the kerb
   * are all it takes to read as a manufactured object. And there must be *few and
   * large*: a dozen small ones is a pattern, four long ones broken by dust is a
   * road surface. What is left is per-patch value variation and a rubbled margin
   * where the edge has broken up.
   */
  private buildRoadPatches(batcher: Batcher, rng: Rng): void {
    const h = (x: number, z: number): number => this.surfaceHeight(x, z);
    const radii: number[] = [];
    for (let z = ROAD.z0 + 4; z < ROAD.z1 - 4; z += rng.range(13, 22)) {
      const len = rng.range(7, 15);
      const w = rng.range(2.4, 4.2);
      const cx = rng.range(-2.2, 2.2);
      const cz = z + len * 0.5;
      const cell = cellFor(cx, cz);
      const buf = batcher.solidFlat('asphalt', cell);
      /*
       * Warm mid grey. The library's asphalt is a near-black northern European
       * road; in a bleached town the surviving metalling is bleached too, and at
       * anything near the material's own value it reads as a hole in the street
       * rather than a surface in it.
       */
      const shade = rng.range(0.94, 1.16);
      const col: RGB = [1.42 * shade, 1.34 * shade, 1.2 * shade];
      const sides = 11 + rng.int(0, 4);
      radii.length = 0;
      for (let i = 0; i < sides; i++) {
        // Two overlapping harmonics plus noise: lobed rather than either round
        // or spiky, which is how a torn edge in a bound surface actually runs.
        const a = (i / sides) * Math.PI * 2;
        radii.push(
          (len * 0.5)
          * (0.72 + 0.2 * Math.sin(a * 2 + z) + 0.1 * Math.sin(a * 5 - z * 0.3))
          * rng.range(0.88, 1.1),
        );
      }
      addGroundPatch(buf, cx, cz, radii, rng.range(-0.05, 0.05), (w * 0.5) / (len * 0.5),
        h, 0.022, col);
      /*
       * Loose chippings around the perimeter, where the bound surface has come
       * apart. Any hard boundary between two ground materials is a tell; a
       * scatter of the darker one spilling into the lighter is how the two
       * actually meet, and it costs a handful of triangles.
       */
      const grit = batcher.solidFlat('gravel', cell);
      for (let i = 0; i < 22; i++) {
        const a = rng.range(0, Math.PI * 2);
        const rad = 1 + rng.range(0.72, 1.15);
        const px = cx + Math.cos(a) * w * 0.5 * rad;
        const pz = cz + Math.sin(a) * len * 0.5 * rad;
        addBox(grit, px, h(px, pz) + 0.012, pz,
          rng.range(0.12, 0.42), 0.03, rng.range(0.12, 0.4),
          { rotY: rng.range(0, Math.PI), color: [col[0] * 0.94, col[1] * 0.92, col[2] * 0.9] });
      }
    }
  }

  private buildField(batcher: Batcher, rng: Rng): void {
    const x0 = MAP.outerMinX + 6;
    const x1 = MAP.outerMaxX - 6;
    const z0 = MAP.outerMinZ + 8;
    const z1 = MAP.outerMaxZ - 8;
    const nx = Math.ceil((x1 - x0) / GRID);
    const nz = Math.ceil((z1 - z0) / GRID);
    const n = new THREE.Vector3();
    const noise = this.noise;

    // Height and material are resolved per cell corner once, then quads are
    // emitted into whichever bucket their cell's zone selects.
    const lift = new Float32Array((nx + 1) * (nz + 1));
    const zoneOf: (Zone | null)[] = new Array(nx * nz);
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        zoneOf[j * nx + i] = this.zoneAt(x0 + (i + 0.5) * GRID, z0 + (j + 0.5) * GRID);
      }
    }
    // A corner takes the highest lift of the cells touching it, so a raised
    // pavement keeps a clean straight top edge instead of sagging at corners.
    for (let j = 0; j <= nz; j++) {
      for (let i = 0; i <= nx; i++) {
        let best = 0;
        for (let dj = -1; dj <= 0; dj++) {
          for (let di = -1; di <= 0; di++) {
            const ci = i + di;
            const cj = j + dj;
            if (ci < 0 || cj < 0 || ci >= nx || cj >= nz) continue;
            best = Math.max(best, zoneOf[cj * nx + ci]?.lift ?? 0);
          }
        }
        lift[j * (nx + 1) + i] = best;
      }
    }

    const cornerHeight = (i: number, j: number): number =>
      this.height(x0 + i * GRID, z0 + j * GRID);

    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const zone = zoneOf[j * nx + i];
        const material: string = zone?.render ?? zone?.material ?? 'sand';
        const cx = x0 + (i + 0.5) * GRID;
        const cz = z0 + (j + 0.5) * GRID;
        const inTown = cx > MAP.minX - 6 && cx < MAP.maxX + 8 && cz > MAP.minZ - 8 && cz < MAP.maxZ + 8;
        const buf = inTown
          ? batcher.solidFlat(material, cellFor(cx, cz))
          : batcher.solidFlat(material, 'outskirts');

        const px = x0 + i * GRID;
        const pz = z0 + j * GRID;
        const h00 = cornerHeight(i, j) + lift[j * (nx + 1) + i];
        const h10 = cornerHeight(i + 1, j) + lift[j * (nx + 1) + i + 1];
        const h11 = cornerHeight(i + 1, j + 1) + lift[(j + 1) * (nx + 1) + i + 1];
        const h01 = cornerHeight(i, j + 1) + lift[(j + 1) * (nx + 1) + i];

        const shade = zone?.shade ?? 0;
        const zt = zone?.tint;
        const c00 = this.groundColor(px, pz, shade, noise, zt);
        const c10 = this.groundColor(px + GRID, pz, shade, noise, zt);
        const c11 = this.groundColor(px + GRID, pz + GRID, shade, noise, zt);
        const c01 = this.groundColor(px, pz + GRID, shade, noise, zt);

        const a = this.pushGround(buf, px, h00, pz, c00, n);
        const b = this.pushGround(buf, px + GRID, h10, pz, c10, n);
        const c = this.pushGround(buf, px + GRID, h11, pz + GRID, c11, n);
        const d = this.pushGround(buf, px, h01, pz + GRID, c01, n);
        buf.quad(a, d, c, b);

        // Close any step to the neighbours to the east and south.
        this.pushRiser(batcher, i, j, nx, nz, x0, z0, lift, zoneOf, cornerHeight, 1, 0);
        this.pushRiser(batcher, i, j, nx, nz, x0, z0, lift, zoneOf, cornerHeight, 0, 1);
      }
    }
    void rng;
  }

  private pushGround(
    buf: GeoBuf,
    x: number, y: number, z: number,
    color: RGB,
    n: THREE.Vector3,
  ): number {
    this.normal(x, z, n);
    // Ground uvs are stretched off the metre convention on purpose. Every
    // library material tiles at two to three metres, which at knee height puts
    // eight repeats across the frame and reads as a printed grid; at 0.7 the
    // period lands near four metres, where a single repeat spans most of what
    // the eye can resolve at a grazing angle.
    return buf.vert(x, y, z, n.x, n.y, n.z, x * GROUND_UV, z * GROUND_UV,
      color[0], color[1], color[2]);
  }

  /**
   * A vertical face between two cells at different heights. Without it the
   * player sees straight through the kerb into the void under the pavement.
   */
  private pushRiser(
    batcher: Batcher,
    i: number, j: number, nx: number, nz: number,
    x0: number, z0: number,
    lift: Float32Array,
    zoneOf: (Zone | null)[],
    cornerHeight: (i: number, j: number) => number,
    di: number, dj: number,
  ): void {
    const ni = i + di;
    const nj = j + dj;
    if (ni >= nx || nj >= nz) return;
    const a = zoneOf[j * nx + i];
    const b = zoneOf[nj * nx + ni];
    const la = a?.lift ?? 0;
    const lb = b?.lift ?? 0;
    if (Math.abs(la - lb) < 0.02) return;
    const high = la > lb ? a : b;
    const material: string = high?.material === 'asphalt'
      ? 'concrete'
      : high?.render ?? high?.material ?? 'concrete';
    const cx = x0 + (i + 0.5) * GRID;
    const cz = z0 + (j + 0.5) * GRID;
    const buf = batcher.solidFlat(material, cellFor(cx, cz));

    // The shared edge, walked in +Z for an east-facing riser and +X for a
    // south-facing one, which is the winding a +X / +Z normal wants.
    const ci = di === 1 ? i + 1 : i;
    const cj = dj === 1 ? j + 1 : j;
    const ax = x0 + ci * GRID;
    const az = z0 + cj * GRID;
    const bx = ax + (di === 1 ? 0 : GRID);
    const bz = az + (di === 1 ? GRID : 0);
    const ha = cornerHeight(ci, cj);
    const hb = cornerHeight(di === 1 ? ci : ci + 1, di === 1 ? cj + 1 : cj);
    const top = Math.max(la, lb);
    const bot = Math.min(la, lb);
    const col: RGB = [1.0, 0.97, 0.91];
    const outward = la > lb ? 1 : -1;
    const nxv = di === 1 ? outward : 0;
    const nzv = dj === 1 ? outward : 0;

    const v0 = buf.vert(ax, ha + bot, az, nxv, 0, nzv, ax + az, ha + bot, col[0], col[1], col[2]);
    const v1 = buf.vert(bx, hb + bot, bz, nxv, 0, nzv, bx + bz, hb + bot, col[0], col[1], col[2]);
    const v2 = buf.vert(bx, hb + top, bz, nxv, 0, nzv, bx + bz, hb + top, col[0], col[1], col[2]);
    const v3 = buf.vert(ax, ha + top, az, nxv, 0, nzv, ax + az, ha + top, col[0], col[1], col[2]);
    // A +X face reverses relative to a +Z face for the same corner order.
    const flip = (di === 1) !== (outward < 0);
    if (flip) buf.quad(v0, v3, v2, v1);
    else buf.quad(v0, v1, v2, v3);
  }

  /**
   * Ground tint. Three things ride here: a slow warm/cool drift so no two
   * hundred square metres share a colour, tyre ruts polished into the
   * carriageway, and a wet darkening around standing water.
   */
  private groundColor(x: number, z: number, shade: number, noise: Noise, zoneTint?: RGB): RGB {
    // Three octaves at deliberately chosen scales. A procedural ground texture
    // tiles every couple of metres and reads as a grid at grazing angles, so
    // the 5 m and 2 m terms exist purely to sit across that period and hide it;
    // the 22 m term does the art-directed light-and-shade of the whole street.
    let v = 1 + 0.11 * noise.fbm2(x * 0.045, z * 0.045, 3);
    v *= 1 + 0.1 * noise.fbm2(x * 0.19 + 31.7, z * 0.19 - 12.4, 2);
    // The 1.25 m sample grid cannot carry anything finer than about three
    // metres without aliasing, so this is the last useful octave.
    v *= 1 + 0.075 * noise.noise2(x * 0.31 - 7.1, z * 0.31 + 4.3);
    v *= 1 - shade;
    // Sand blown against everything gets lighter away from traffic.
    const drift = smoothstep(6, 13, Math.abs(x));
    v *= 1 + 0.05 * drift;

    let r = v;
    let g = v * (1 - 0.012 * drift);
    let b = v * (1 - 0.05 * drift);

    // Patchy sand wash lying over whatever the surface is. Fringed with a
    // second octave so the patches have torn edges rather than soft blobs.
    const wash = clamp(
      noise.fbm2(x * 0.07 + 104.2, z * 0.07 - 61.5, 3) * 1.5
      + 0.4 * noise.noise2(x * 0.29, z * 0.29) - 0.18,
      0, 1,
    ) * (0.34 + 0.5 * drift);
    r += wash * 0.2;
    g += wash * 0.16;
    b += wash * 0.05;

    // Damp, organic staining in the hollows: the counterweight that stops the
    // whole ground reading as one flat wash of ochre.
    const damp = clamp(-noise.fbm2(x * 0.058 - 220.3, z * 0.058 + 88.1, 3) * 1.7 - 0.3, 0, 1) * 0.2;
    r *= 1 - damp * 1.15;
    g *= 1 - damp;
    b *= 1 - damp * 0.8;

    // Tyre ruts: two polished bands down each carriageway.
    if (Math.abs(z) < 62) {
      const rut = Math.min(
        Math.abs(Math.abs(x) - 1.55),
        Math.abs(Math.abs(x) - 3.35),
      );
      if (rut < 0.75 && Math.abs(x) < 5.4) {
        const k = (1 - rut / 0.75) * 0.16;
        r *= 1 - k;
        g *= 1 - k;
        b *= 1 - k * 0.8;
      }
    }
    const wet = this.wetness(x, z);
    if (wet > 0) {
      const k = wet * 0.4;
      r *= 1 - k;
      g *= 1 - k * 0.95;
      b *= 1 - k * 0.85;
    }
    if (zoneTint) return [r * zoneTint[0], g * zoneTint[1], b * zoneTint[2]];
    return [r, g, b];
  }

  /* -------------------------------- sea --------------------------------- */

  private buildSea(batcher: Batcher): void {
    registerSeaFinish(batcher);
    const water = batcher.solidFlat(SEA_SURFACE, 'sea');
    const far = 520;

    /*
     * The sea is a swell field, not a plane.
     *
     * A flat sheet of water at golden hour reads as beach, and that is not a
     * tinting problem: the material is `physical` with ior 1.33, so almost the
     * whole plane sits at a glancing angle from a standing player and Fresnel
     * hands back an unbroken mirror of a gold sky. Every pixel gets the same
     * answer because every pixel has the same normal. Darkening the albedo only
     * dims it, because the reflection is on top.
     *
     * What breaks it is geometry. Long swells crossing at a shallow angle to
     * the shore give the surface two normals per wavelength — one face tipped
     * toward the sky and one toward the horizon — so the same reflection
     * resolves as alternating bands of pale gold and deep green, which is what
     * reads as water. Normals are analytic from the height gradient and shared
     * between neighbouring quads, so it shades smoothly rather than as facets.
     */
    const swellMinX = SEA_WALL_X - 190;
    /*
     * Graded, not uniform.
     *
     * Near the armour the grid has to be fine enough to carry a six-metre wave —
     * at 2.6 by 9 metres it could not represent anything shorter than a
     * forty-metre swell, which is the real reason the previous pass read as a
     * mudflat; see `swellY` below. But a uniform sheet at that pitch is sixteen
     * thousand quads reaching a hundred and ninety metres out, and past the first
     * fifty the surface is at such a grazing angle that a nine-metre quad and a
     * one-metre quad shade identically. So the step starts at one and a half
     * metres against the sea wall and grows outward, and the same along the shore
     * away from the town. The water anybody stands over keeps every wave; the
     * offshore sheet costs a twentieth of what it did.
     */
    const graded = (from: number, to: number, step0: number, growth: number, cap: number): number[] => {
      const dir = Math.sign(to - from);
      const out = [from];
      let v = from;
      let step = step0;
      while ((to - v) * dir > 0) {
        v += step * dir;
        out.push(dir > 0 ? Math.min(to, v) : Math.max(to, v));
        step = Math.min(cap, step * growth);
      }
      return out;
    };
    const xs = graded(SEA_WALL_X + 0.2, swellMinX, 1.5, 1.055, 7).reverse();
    const zCentre = (MAP.outerMinZ + MAP.outerMaxZ) * 0.5;
    const zs = [
      ...graded(zCentre, MAP.outerMinZ - 120, 3.2, 1.06, 11).reverse(),
      ...graded(zCentre, MAP.outerMaxZ + 120, 3.2, 1.06, 11).slice(1),
    ];

    /*
     * Crossing swell trains plus real chop, and the thing that matters is the
     * *slope*, not the height.
     *
     * The previous version had the right idea and the wrong numbers, which is why
     * the sea still came back reading as a wet mudflat. It ran two trains of 84
     * and 153 metre wavelength at 19 and 13 centimetres of amplitude. Those are
     * plausible figures for an offshore swell and they are useless here, because
     * what breaks a mirror is the angle of the surface and the steepest slope
     * that pairing can produce is amplitude times wavenumber — 0.19 × 0.075, or
     * about eight tenths of a degree. A standing player looking at water fifty
     * metres out is viewing it at 1.8 degrees. The surface was tipping by less
     * than half the grazing angle, so every quad returned very nearly the same
     * Fresnel answer and the whole sheet stayed one flat mirror of a gold sky.
     * Amplitude alone could never have fixed it: a swell tall enough to matter at
     * 84 metres would have been two metres high.
     *
     * The fix is short waves. The three added terms run at 20, 10 and 6 metres,
     * and although none is more than eight centimetres tall they contribute five
     * times the slope of the two big trains put together — about six degrees all
     * told, comfortably past the grazing angle at every distance the player can
     * see. That is what resolves the reflection into alternating bands of pale
     * gold and deep green instead of an unbroken sheet.
     *
     * Angles stay deliberately off-parallel to the shore, because a wave train
     * lined up with the wall reads as corrugated sheet, and the periods stay
     * mutually irrational so crest lines meander instead of repeating.
     */
    const swellY = (x: number, z: number): number =>
      Math.sin(x * 0.075 + z * 0.021) * 0.19 +
      Math.sin(x * 0.041 - z * 0.055 + 1.7) * 0.13 +
      Math.sin(x * 0.31 + z * 0.12) * 0.075 +
      Math.sin(x * 0.62 - z * 0.34 + 0.6) * 0.05 +
      Math.sin(x * 1.0 + z * 0.55 + 2.2) * 0.028;
    const eps = 0.35;
    const seaPoint = (x: number, z: number): THREE.Vector3 =>
      new THREE.Vector3(x, SEA_LEVEL + swellY(x, z), z);

    const p00 = new THREE.Vector3();
    const p10 = new THREE.Vector3();
    const p11 = new THREE.Vector3();
    const p01 = new THREE.Vector3();
    const nrm = new THREE.Vector3();
    for (let i = 0; i < xs.length - 1; i++) {
      const xa = xs[i];
      const xb = xs[i + 1];
      /*
       * Depth ramp. Shallow water over the sand bar by the armour is pale and
       * green, deep water offshore is dark and blue; without the gradient the
       * whole sheet is one colour and the eye has no distance cue at all.
       */
      const shallow = smoothstep(60, 0, SEA_WALL_X - xa);
      const tint: RGB = [
        0.2 + shallow * 0.34,
        0.46 + shallow * 0.3,
        0.56 + shallow * 0.1,
      ];
      for (let j = 0; j < zs.length - 1; j++) {
        const za = zs[j];
        const zb = zs[j + 1];
        p00.copy(seaPoint(xa, za));
        p10.copy(seaPoint(xb, za));
        p11.copy(seaPoint(xb, zb));
        p01.copy(seaPoint(xa, zb));
        // Crests catch the sun and are a shade paler; troughs hold the depth
        // colour. Sampled at the quad centre so the band follows the wave.
        const cx = (xa + xb) * 0.5;
        const cz = (za + zb) * 0.5;
        // Divisor tracks the field's actual amplitude, or the shorter terms push
        // it into the clamp and every crest lands on the same value.
        const crest = clamp(swellY(cx, cz) / 0.42, -1, 1);
        const k = 1 + crest * 0.3;
        const col: RGB = [tint[0] * k, tint[1] * k, tint[2] * k];
        const gx = (swellY(cx + eps, cz) - swellY(cx - eps, cz)) / (2 * eps);
        const gz = (swellY(cx, cz + eps) - swellY(cx, cz - eps)) / (2 * eps);
        nrm.set(-gx, 1, -gz).normalize();
        addQuad(water, p00, p01, p11, p10,
          [xa, za, xa, zb, xb, zb, xb, za], col, nrm);
      }
    }
    // Flat sheet from the swell field to the horizon, where the waves would be
    // below a pixel anyway and only the glancing reflection survives.
    addFloor(water, -far, -far, swellMinX + 0.1, far, SEA_LEVEL, [0.2, 0.44, 0.54]);

    /*
     * Sea bed. The surface is 14% transparent, so whatever is under it is
     * mixed into every pixel — a sand-coloured bed was a second reason the
     * water read as beach. Dark green-blue, and deep enough that the shallows
     * by the armour still lighten toward it.
     */
    const bed = batcher.solidFlat('sand', 'sea');
    addFloor(bed, -far, -far, SEA_WALL_X + 0.4, far, SEA_LEVEL - 2.2, [0.1, 0.19, 0.2]);

    // Rock armour below the wall, where the beach would be.
    const rock = batcher.solid('rubble', 'sea');
    const rng = new Rng(0x5ea);
    for (let z = MAP.outerMinZ; z < MAP.outerMaxZ; z += 2.4) {
      const s = rng.range(0.9, 2.1);
      addBox(rock,
        SEA_WALL_X - rng.range(0.6, 2.6), SEA_LEVEL + rng.range(0.3, 1.4), z + rng.range(-0.6, 0.6),
        s, s * rng.range(0.5, 0.9), s * rng.range(0.7, 1.2),
        { rotY: rng.range(0, Math.PI), color: [0.86, 0.84, 0.8], grime: 0.35 },
      );
    }

    /*
     * Foam. One bright irregular line where the swell breaks on the armour is
     * worth more than any amount of surface shader: without it a water plane
     * meeting a wall is just two flat colours abutting, which is why the sea
     * read as sand. Opaque on purpose — foam is the one part of water that is.
     */
    const foam = batcher.solidFlat('sand', 'sea');
    for (let z = MAP.outerMinZ; z < MAP.outerMaxZ; z += 1.1) {
      const w = rng.range(0.7, 2.3);
      const x = SEA_WALL_X - rng.range(1.4, 3.4);
      addBox(foam, x, SEA_LEVEL + 0.03, z + rng.range(-0.3, 0.3), w, 0.06, rng.range(0.8, 1.3), {
        rotY: rng.range(-0.4, 0.4),
        color: [1.75, 1.82, 1.86],
      });
      if (rng.next() < 0.45) {
        addBox(foam, x - rng.range(1.5, 5.5), SEA_LEVEL + 0.02, z + rng.range(-0.4, 0.4),
          rng.range(1.2, 4.0), 0.05, rng.range(0.3, 0.7), {
            rotY: rng.range(-0.25, 0.25),
            color: [1.5, 1.58, 1.62],
          });
      }
    }

    /*
     * Whitecaps offshore. The swell gives the sea structure but no scale — a
     * band of chop could be two metres across or twenty. Breaking crests are
     * the only object out there of known size, and scattering them thinly along
     * the crest lines fixes the read of distance across the whole bay.
     */
    for (let i = 0; i < 110; i++) {
      const x = SEA_WALL_X - rng.range(8, 150);
      const z = rng.range(MAP.outerMinZ - 60, MAP.outerMaxZ + 60);
      // Only where the surface is actually near a crest, so the caps sit on the
      // waves rather than being sprinkled at random over them.
      const crest = Math.sin(x * 0.075 + z * 0.021) * 0.19 +
        Math.sin(x * 0.041 - z * 0.055 + 1.7) * 0.13;
      if (crest < 0.14) continue;
      const len = rng.range(1.8, 6.5);
      addBox(foam, x, SEA_LEVEL + crest + 0.04, z, rng.range(0.4, 1.1), 0.05, len, {
        rotY: rng.range(-0.3, 0.3),
        color: [1.4, 1.5, 1.55],
      });
    }

    /*
     * Breaker lines, and these are what actually say "sea".
     *
     * Scattered caps alone did not do it. At grazing incidence Fresnel is very
     * near one, so the surface returns a full mirror of the sky whatever its
     * roughness or albedo — which is physically right and means the water will
     * always be a sheet of pale gold from a standing player's eye. Given that, the
     * only thing left that can distinguish sea from wet sand is *pattern*, and the
     * pattern a coast has is a set of long lines of surf lying parallel to the
     * shore. Blobs scattered over the same area read as a sandbank, which is
     * exactly the note this came back with.
     *
     * Four sets at increasing distance, each broken into segments with gaps and a
     * slow meander so they are lines rather than rules. Top faces only: they lie
     * flat on the water and nothing sees their sides.
     */
    for (const [dist, cover, pale] of [
      [13, 0.82, 1.9], [31, 0.7, 1.72], [58, 0.58, 1.55], [96, 0.44, 1.4],
    ] as const) {
      const seg = 5.5 + dist * 0.06;
      for (let z = MAP.outerMinZ - 70; z < MAP.outerMaxZ + 70; z += seg) {
        if (rng.next() > cover) continue;
        const x = SEA_WALL_X - dist + Math.sin(z * 0.031) * dist * 0.09 + rng.range(-1.4, 1.4);
        const zz = z + rng.range(-0.5, 0.5);
        addBox(foam, x, SEA_LEVEL + swellY(x, zz) + 0.05, zz,
          rng.range(0.7, 1.5) + dist * 0.01, 0.04, seg * rng.range(0.72, 0.98), {
            rotY: rng.range(-0.12, 0.12),
            faces: FX_PY,
            color: [pale * 0.94, pale, pale * 1.02],
          });
      }
    }

    /*
     * A breakwater arm reaching out of the shot. The sea otherwise has no scale
     * cue at all: an empty plane to the horizon could be five metres away or
     * five hundred, and one built object out on it fixes both the distance and
     * the fact that this is a working harbour town.
     */
    const armZ = 26;
    for (let i = 0; i < 26; i++) {
      const t = i / 25;
      const x = SEA_WALL_X - 4 - t * 46;
      const z = armZ + Math.sin(t * 1.5) * 7;
      const s = rng.range(1.6, 2.8);
      addBox(rock, x, SEA_LEVEL + rng.range(0.1, 0.5), z,
        s * 1.6, s * rng.range(0.7, 1.1), s * rng.range(1.1, 1.6),
        { rotY: rng.range(0, Math.PI), color: [0.82, 0.8, 0.76], grime: 0.4 });
      if (i % 4 === 0) {
        addBox(batcher.solid('concrete', 'sea'), x, SEA_LEVEL + 0.9, z, 3.2, 0.5, 2.6,
          { rotY: rng.range(-0.1, 0.1), color: [0.94, 0.92, 0.88], grime: 0.3 });
      }
    }
  }

  /* ------------------------------- details ------------------------------- */

  /** Granite kerb line down the market street, proud of the pavement edge. */
  private buildKerbLine(batcher: Batcher): void {
    const rng = new Rng(0x4b3b91);
    for (const side of [-1, 1]) {
      const x = side * 5.62;
      for (let z = ROAD.z0; z < ROAD.z1; z += 1.6) {
        if (z > CROSS_A.z0 - 0.4 && z < CROSS_A.z1 + 0.4) continue;
        if (z > CROSS_B.z0 - 0.4 && z < CROSS_B.z1 + 0.4) continue;
        const y = this.height(x, z + 0.8) + 0.15;
        const chip = rng.next() < 0.14 ? rng.range(0.02, 0.05) : 0;
        const buf = batcher.solid('concrete', cellFor(x, z));
        addBox(buf, x, y - 0.02 - chip, z + 0.8, 0.34, 0.1, 1.56, {
          color: [0.96 - chip * 2, 0.95 - chip * 2, 0.92],
          grime: 0.2,
        });
      }
    }
  }

  private buildDrain(batcher: Batcher): void {
    const x = -5.1;
    const z = 12.5;
    const y = this.height(x, z);
    const buf = batcher.solid('concrete', cellFor(x, z));
    addBox(buf, x, y - 0.16, z, 1.0, 0.3, 0.8, { color: [0.78, 0.77, 0.75], grime: 0.5 });
    const steel = batcher.solid('steel_plate', cellFor(x, z));
    for (let i = 0; i < 5; i++) {
      addBox(steel, x, y - 0.03, z - 0.3 + i * 0.15, 0.86, 0.05, 0.07, {
        color: [0.62, 0.6, 0.58],
      });
    }
    addBox(steel, x, y - 0.05, z, 0.94, 0.05, 0.05, { color: [0.6, 0.58, 0.56] });
  }

  private buildPuddles(batcher: Batcher): void {
    for (const p of this.puddles) {
      const buf = batcher.solidFlat('water', cellFor(p.x, p.z));
      const y = this.surfaceHeight(p.x, p.z) - 0.035;
      addCylinder(buf, p.x, y, p.z, p.radius, 0.01, {
        segments: 14,
        color: [1, 1, 1],
        caps: true,
      });
    }
  }

  /**
   * Wind-blown sand banked against a wall. Placed by the town assembly along
   * every ground-level facade; the reason it matters is that a hard line where
   * a wall meets the floor reads as two objects, and a drift reads as one
   * place.
   */
  drift(
    batcher: Batcher,
    x0: number, z0: number, x1: number, z1: number,
    /** Outward direction of the wall, as a unit axis. */
    nx: number, nz: number,
    rng: Rng,
    scale = 1,
  ): void {
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 0.8) return;
    const dx = (x1 - x0) / len;
    const dz = (z1 - z0) / len;
    const step = 0.8;
    // The wedge climbs toward its local +x, which must point into the wall.
    const yaw = Math.atan2(nz, -nx);
    /*
     * Segments deliberately overlap, and both their depth and their height vary
     * by a factor of three along the run.
     *
     * The failure this replaces is worth naming: a row of equal wedges at a
     * constant depth has a straight leading edge and a constant crest, and at a
     * grazing angle that reads unmistakably as a strip of folded card leaning on
     * the wall. Sand has no straight lines in it. Overlapping unequal segments
     * cost the same triangles and read as one continuous bank.
     */
    for (let t = -0.4; t < len - 0.1; t += step) {
      const seg = Math.min(step * 2.1, len - t) * rng.range(0.9, 1.5);
      if (seg < 0.2) continue;
      const skip = rng.next();
      const mx = x0 + dx * (t + seg * 0.5);
      const mz = z0 + dz * (t + seg * 0.5);
      const y = this.surfaceHeight(mx, mz) - 0.03;
      const buf = batcher.solidFlat('sand', cellFor(mx, mz));
      // Drifted sand is the same dust the street is made of, not a fresh dune:
      // painted any brighter than the ground it lies on it reads as spilled
      // flour, which is what the first pass at this looked like.
      const shade = rng.range(0.84, 0.98);
      const col: RGB = [1.02 * shade, 0.99 * shade, 0.92 * shade];

      if (skip > 0.14) {
        const depth = rng.range(0.3, 1.05) * scale;
        const h = rng.range(0.045, 0.15) * scale;
        addWedge(buf,
          mx + nx * depth * 0.5, y, mz + nz * depth * 0.5,
          depth, h, seg,
          { rotY: yaw, color: col },
        );
      }
      /*
       * The toe: much wider, only a few centimetres proud, reaching out into the
       * street where wind and traffic have spread it.
       *
       * A squat low-segment cone rather than a wedge. A wedge is the right shape
       * where sand meets a wall, but its plan is a rectangle, and a row of them
       * out in the open reads as folded paper — the straight leading edge is
       * unmistakable at a grazing angle. An irregular polygon with a random yaw
       * gives a broken edge for the same handful of triangles.
       */
      if (skip > 0.45) {
        const toe = rng.range(0.7, 1.5) * scale;
        const th = rng.range(0.02, 0.045) * scale;
        addCylinder(buf,
          mx + nx * toe * 0.34 + dx * rng.range(-0.35, 0.35),
          y - 0.025,
          mz + nz * toe * 0.34 + dz * rng.range(-0.35, 0.35),
          toe * 0.5, th + 0.02,
          {
            segments: rng.next() < 0.5 ? 5 : 6,
            topRadius: toe * rng.range(0.14, 0.26),
            rotY: rng.range(0, Math.PI * 2),
            smooth: false,
            caps: true,
            // Deliberately darker than the drift proper. A toe painted at the
            // same value as fresh sand is brighter than the road it lies on and
            // reads as a sheet of paper dropped in the street.
            color: [col[0] * 0.9, col[1] * 0.88, col[2] * 0.84],
          },
        );
      }
    }
  }

  /**
   * Sand and grime banked around the foot of everything standing on the ground.
   *
   * A prop meeting the floor on a clean line is the most common tell that a
   * scene was assembled rather than photographed: real objects sit *in* a
   * surface, with a shadowed crease where the two meet and a few centimetres of
   * whatever the ground is made of piled against the windward side. Nothing
   * here is expensive — the crease is a flat ring and the bank is a five-sided
   * cone — but the crease in particular does most of the work, because ambient
   * occlusion at the radius the renderer can afford does not resolve a
   * centimetre-scale contact.
   *
   * Everything is placed from the batcher's record of props that declared a
   * footprint, so a prop is grounded by tagging its definition once rather than
   * by remembering at each of its call sites.
   */
  settleProps(batcher: Batcher, rng: Rng): void {
    /*
     * Wind on this coast comes off the sea, so banks pile on the west face of
     * everything. Kept consistent rather than random: a street where every
     * drift leans the same way reads as a place with weather, and one where
     * they lean at random reads as noise.
     */
    const windX = -0.94;
    const windZ = 0.34;
    for (const s of batcher.settled) {
      const { x, z } = s;
      if (x < MAP.minX - 6 || x > MAP.maxX + 6 || z < MAP.minZ - 8 || z > MAP.maxZ + 8) continue;
      /*
       * Only ground the props actually resting on the ground. Stacked crates,
       * sacks on a barrow and pots on a windowsill all come through here with
       * the same definition as the ones on the floor, and a ring of sand
       * hanging in the air a metre up is far worse than no grounding at all.
       */
      const ground = this.surfaceHeight(x, z);
      if (s.y > ground + 0.12 || s.y < ground - 0.5) continue;

      const r = s.radius;
      const buf = batcher.solidFlat('sand', cellFor(x, z));
      const onSand = this.materialAt(x, z) === 'sand';

      /*
       * The crease. A flat annulus of near-black at the contact fading to
       * nothing by about 1.7 radii — vertex-coloured rather than textured, so
       * it costs one ring of triangles and no material.
       */
      const seg = 7;
      const inner = r * 0.86;
      const outer = r * rng.range(1.5, 1.95);
      const rot = rng.range(0, Math.PI * 2);
      const dark = 0.4 + rng.range(0, 0.1);
      const base = buf.vertexCount;
      for (let i = 0; i < seg; i++) {
        const a = rot + (i / seg) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const wob = 0.78 + ((i * 7919) % 13) / 26;
        const ix = x + ca * inner;
        const iz = z + sa * inner;
        const ox = x + ca * outer * wob;
        const oz = z + sa * outer * wob;
        buf.vert(ix, this.surfaceHeight(ix, iz) + 0.006, iz, 0, 1, 0, ix, iz, dark, dark * 0.98, dark * 0.95);
        buf.vert(ox, this.surfaceHeight(ox, oz) + 0.004, oz, 0, 1, 0, ox, oz, 1, 1, 1);
      }
      for (let i = 0; i < seg; i++) {
        const a0 = base + i * 2;
        const a1 = base + ((i + 1) % seg) * 2;
        buf.quad(a0, a0 + 1, a1 + 1, a1);
      }

      /*
       * The bank, in two strengths.
       *
       * On sand it is a proper drift: a few centimetres of dune leaning on the
       * windward face, bright because it is the same sand the street is made
       * of. On paving it is not a dune — it is the wedge of grit, dust and
       * swept rubbish that collects in the angle where nobody's broom reaches,
       * so it is a third the height, much darker than fresh sand, and it hugs
       * the object rather than spreading. Leaving paved props with only the
       * crease was the visible gap: a drum in the alley sat on a clean line
       * with a shadow under it, which is a drum resting *on* a floor rather
       * than one that has been there two years.
       *
       * Skipped on the smallest props either way, where the cone would be
       * wider than the thing it is meant to be leaning against.
       */
      if (r < (onSand ? 0.16 : 0.22) || rng.next() < (onSand ? 0.25 : 0.42)) continue;
      const spread = r * (onSand ? rng.range(1.05, 1.55) : rng.range(0.9, 1.25));
      const bx = x - windX * r * 0.72;
      const bz = z - windZ * r * 0.72;
      const shade = rng.range(0.86, 1.0) * (onSand ? 1 : 0.6);
      addCylinder(buf,
        bx, this.surfaceHeight(bx, bz) - 0.02, bz,
        spread * 0.5, Math.min(r * 0.55, 0.13) * (onSand ? 1 : 0.42) + 0.02,
        {
          segments: 5,
          topRadius: spread * rng.range(0.1, 0.2),
          rotY: rng.range(0, Math.PI * 2),
          smooth: false,
          caps: true,
          color: [0.98 * shade, 0.95 * shade, 0.89 * shade],
        },
      );
    }
  }
}
