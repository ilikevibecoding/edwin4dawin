import * as THREE from 'three';
import { clamp, clamp01, lerp, Rng, smoothstep, TAU } from '../core/math';
import { Noise2D } from '../core/noise';
import { WORLD_EXTENT } from './environment';
import { texturedMaterial } from '../core/textures';
import { terrainMaterial } from './terrainmaterial';
import {
  barrelGeometry,
  bushGeometry,
  crateGeometry,
  driftwoodGeometry,
  foliageMaterial,
  grassTuftGeometry,
  palmGeometry,
  palmMaterial,
  propMaterial,
  rockGeometry,
  wreckGeometry,
} from './props';

export type IslandKind = 'island' | 'outpost' | 'rock';

export interface IslandDef {
  id: string;
  name: string;
  kind: IslandKind;
  x: number;
  z: number;
  /** Shoreline radius in metres. */
  radius: number;
  /** Peak height above sea level. */
  height: number;
  seed: number;
}

/** Deep-ocean floor height. Also the fallback for the whole map. */
export const SEA_FLOOR = -46;
const HEIGHT_MIN = -52;
const HEIGHT_SPAN = 132;
const HEIGHT_TEX_SIZE = 1024;

/**
 * Shore distance: how far a point is, in metres, from the nearest waterline.
 * Negative inland. Packed into the spare blue channel of the height texture
 * and used to lay the surf.
 *
 * Depth is the obvious coordinate for surf and a poor one. It wanders - a sand
 * flat that stays between one and two metres deep for a hundred metres crosses
 * any given breaking depth over and over - so bands laid in depth smear across
 * an entire lagoon. It also needs sub-metre precision, and the terrain it comes
 * from is only defined every five metres. Distance to the shoreline has neither
 * problem: it rises monotonically as you head out to sea, so a band in it is a
 * band that follows the coast, and it is smooth enough that interpolating it
 * between texels five metres apart is accurate to well under a metre.
 */
const SHORE_MIN = -32;
const SHORE_SPAN = 128;
/** Angular resolution of the per-island waterline radius table. */
const SHORE_BINS = 384;

/**
 * Hand-placed archipelago: two outposts to sell at, a spread of named islands
 * to dig on, and a scatter of rocks and shoals to run aground on.
 */
export const ISLANDS: IslandDef[] = [
  { id: 'sandy-shilling', name: 'Sandy Shilling Outpost', kind: 'outpost', x: -980, z: 620, radius: 128, height: 17, seed: 101 },
  { id: 'gallows-rest', name: "Gallows' Rest Outpost", kind: 'outpost', x: 1080, z: -880, radius: 122, height: 15, seed: 202 },

  { id: 'crooks-hollow', name: "Crook's Hollow", kind: 'island', x: -180, z: -160, radius: 168, height: 44, seed: 311 },
  { id: 'rum-runner', name: 'Rum Runner Isle', kind: 'island', x: 640, z: 420, radius: 132, height: 31, seed: 412 },
  { id: 'cutlass-cay', name: 'Cutlass Cay', kind: 'island', x: -1320, z: -520, radius: 118, height: 26, seed: 523 },
  { id: 'bilge-rat-bay', name: 'Bilge Rat Bay', kind: 'island', x: 250, z: 1180, radius: 152, height: 38, seed: 634 },
  { id: 'skull-shoal', name: 'Skull Shoal', kind: 'island', x: 1560, z: 260, radius: 96, height: 22, seed: 745 },
  { id: 'devils-ridge', name: "Devil's Ridge", kind: 'island', x: -640, z: -1240, radius: 186, height: 62, seed: 856 },
  { id: 'krakens-fall', name: "Kraken's Fall", kind: 'island', x: 1240, z: 1320, radius: 142, height: 35, seed: 967 },
  { id: 'marrow-islet', name: 'Marrow Islet', kind: 'island', x: -1720, z: 1240, radius: 104, height: 24, seed: 178 },
  { id: 'salty-sands', name: 'Salty Sands', kind: 'island', x: 60, z: -1620, radius: 112, height: 20, seed: 289 },
  { id: 'mutineer-rock', name: 'Mutineer Rock', kind: 'island', x: -1500, z: -1560, radius: 88, height: 48, seed: 390 },
  { id: 'wailing-reach', name: 'Wailing Reach', kind: 'island', x: 1820, z: -1640, radius: 126, height: 33, seed: 491 },

  { id: 'rock-a', name: 'The Fangs', kind: 'rock', x: -420, z: 700, radius: 34, height: 11, seed: 512 },
  { id: 'rock-b', name: 'Widow Stack', kind: 'rock', x: 860, z: -260, radius: 28, height: 14, seed: 613 },
  { id: 'rock-c', name: 'Anvil Rock', kind: 'rock', x: -960, z: -640, radius: 31, height: 9, seed: 714 },
  { id: 'rock-d', name: 'Gull Perch', kind: 'rock', x: 420, z: -980, radius: 26, height: 12, seed: 815 },
  { id: 'rock-e', name: 'Broken Tooth', kind: 'rock', x: 1520, z: 900, radius: 30, height: 10, seed: 916 },
  { id: 'rock-f', name: 'Drowned Man Shoal', kind: 'rock', x: -1180, z: 160, radius: 36, height: 6, seed: 127 },
  { id: 'rock-g', name: 'Smuggler Spit', kind: 'rock', x: 200, z: 520, radius: 24, height: 8, seed: 228 },
  { id: 'rock-h', name: 'Cinder Stack', kind: 'rock', x: -260, z: 1720, radius: 29, height: 13, seed: 329 },
];

/** A regular height grid covering one island, in the island's local frame. */
interface TerrainGrid {
  extent: number;
  segments: number;
  step: number;
  data: Float32Array;
}

export interface ScatterPlacement {
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: number;
}

/**
 * The terrain layer: an analytic height field (queried by ship collision, the
 * player controller, cannonballs and AI), the meshes built from it, and a packed
 * height texture the ocean shader reads for depth colour and shore foam.
 */
export class IslandField {
  readonly islands = ISLANDS;
  readonly group = new THREE.Group();
  heightTexture: THREE.DataTexture;

  private noise = new Noise2D(20997);
  private detail = new Noise2D(4413);
  /** Sampled height grid per island; the mesh and every query read from these. */
  private grids: TerrainGrid[];
  /** Waterline radius per bearing, per island. See `buildShoreRadii`. */
  private shoreRadii: Float32Array[];
  private terrainMaterial: THREE.MeshStandardMaterial;
  private propMat: THREE.MeshStandardMaterial;
  /** Palms, which are double-sided and sway on their own slower period. */
  private palmMat: THREE.MeshStandardMaterial;
  /** Grass and bushes, which bend in the wind. */
  private foliageMat: THREE.MeshStandardMaterial;
  /** Boulders, which take the same stone texture as the cliffs. */
  private rockMat: THREE.MeshStandardMaterial;

  constructor(skyUniforms?: Record<string, THREE.IUniform>) {
    this.group.name = 'islands';
    // Sand, grass and rock are blended per pixel from the mesh's splat weights;
    // vertex colour is only a tint on top of them.
    this.terrainMaterial = terrainMaterial(skyUniforms);
    this.propMat = propMaterial();
    this.palmMat = palmMaterial();
    this.foliageMat = foliageMaterial();
    this.rockMat = texturedMaterial('rock', { roughness: 1, normalScale: 1.1 });
    this.grids = this.buildGrids();
    this.shoreRadii = this.buildShoreRadii();
    this.heightTexture = this.buildHeightTexture();
  }

  /**
   * Radius of the waterline at each of `SHORE_BINS` bearings, per island.
   *
   * Found by marching the *grid* sampler rather than the analytic field, so the
   * line this reports is the one the terrain mesh actually draws. The analytic
   * field disagrees with the mesh by a few tenths of a metre of height, which on
   * a one-in-eleven foreshore is three metres of beach - enough to leave the
   * foam visibly adrift of the sand it is supposed to be running up.
   */
  private buildShoreRadii(): Float32Array[] {
    return this.islands.map((island) => {
      const radii = new Float32Array(SHORE_BINS);
      for (let bin = 0; bin < SHORE_BINS; bin++) {
        const angle = (bin / SHORE_BINS) * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        // Coarse march out from well inside the coast, then bisect. The coast
        // can only be crossed once per bearing on a star-shaped island, which
        // is how these are built.
        const step = 1.5;
        let inner = island.radius * 0.5;
        let outer = island.radius * 1.9;
        for (let d = inner; d <= outer; d += step) {
          if (this.heightAt(island.x + cos * d, island.z + sin * d) < 0) {
            inner = d - step;
            outer = d;
            break;
          }
        }
        for (let i = 0; i < 7; i++) {
          const mid = (inner + outer) * 0.5;
          if (this.heightAt(island.x + cos * mid, island.z + sin * mid) < 0) outer = mid;
          else inner = mid;
        }
        radii[bin] = (inner + outer) * 0.5;
      }
      return radii;
    });
  }

  /**
   * Metres from the nearest island's waterline; negative inland. Approximated
   * radially, which is exact for the star-shaped coasts these islands have.
   */
  shoreDistanceAt(x: number, z: number): number {
    let nearest = SHORE_MIN + SHORE_SPAN;
    for (let i = 0; i < this.islands.length; i++) {
      const island = this.islands[i];
      const dx = x - island.x;
      const dz = z - island.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > island.radius * 2.4) continue;
      const radii = this.shoreRadii[i];
      // Interpolate between bearings so the field has no radial seams in it.
      const bin = (Math.atan2(dz, dx) / (Math.PI * 2)) * SHORE_BINS;
      const b0 = Math.floor(bin);
      const f = bin - b0;
      const r0 = radii[((b0 % SHORE_BINS) + SHORE_BINS) % SHORE_BINS];
      const r1 = radii[((b0 + 1) % SHORE_BINS + SHORE_BINS) % SHORE_BINS];
      const dist = d - (r0 + (r1 - r0) * f);
      if (dist < nearest) nearest = dist;
    }
    return nearest;
  }

  /**
   * Terrain height at a world position. Above 0 is dry land.
   *
   * This reads the same sampled grid the terrain mesh is built from, rather
   * than the analytic field, so what the player stands on is exactly what is
   * drawn. Querying the noise directly instead left boots a metre under a
   * hillside wherever the mesh's ten-metre quads cut a corner.
   */
  heightAt(x: number, z: number): number {
    let h = SEA_FLOOR;
    for (let i = 0; i < this.islands.length; i++) {
      const grid = this.grids[i];
      const island = this.islands[i];
      const gx = (x - island.x + grid.extent) / grid.step;
      const gz = (z - island.z + grid.extent) / grid.step;
      if (gx < 0 || gz < 0 || gx > grid.segments || gz > grid.segments) continue;
      const x0 = Math.min(Math.floor(gx), grid.segments - 1);
      const z0 = Math.min(Math.floor(gz), grid.segments - 1);
      const fx = gx - x0;
      const fz = gz - z0;
      const row = grid.segments + 1;
      const h00 = grid.data[z0 * row + x0];
      const h10 = grid.data[z0 * row + x0 + 1];
      const h01 = grid.data[(z0 + 1) * row + x0];
      const h11 = grid.data[(z0 + 1) * row + x0 + 1];
      // Interpolate across the same two triangles PlaneGeometry splits the cell
      // into. Bilinear would be smoother but sits up to a metre off the drawn
      // surface wherever the four corners of a cell are badly twisted.
      const contribution =
        fx + fz <= 1
          ? h00 + (h10 - h00) * fx + (h01 - h00) * fz
          : h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
      if (contribution > h) h = contribution;
    }
    return h;
  }

  /**
   * Layout of one island's height grid. Shared by the sampler above and by the
   * mesh builder, so a vertex and a footstep read the same number.
   */
  private static gridLayout(island: IslandDef): { extent: number; segments: number; step: number } {
    // Reaches slightly past the analytic falloff, and lands a vertex every few
    // metres so hillsides are not faceted into ten-metre planes. Four metres
    // is about the coarsest that keeps the waterline from cutting a visible
    // sawtooth across a beach you are standing on.
    const extent = island.radius * 2.4;
    const segments = clamp(Math.round((extent * 2) / 4.8), 48, 200);
    return { extent, segments, step: (extent * 2) / segments };
  }

  private buildGrids(): TerrainGrid[] {
    return this.islands.map((island) => {
      const layout = IslandField.gridLayout(island);
      const row = layout.segments + 1;
      const data = new Float32Array(row * row);
      for (let j = 0; j < row; j++) {
        const z = island.z - layout.extent + j * layout.step;
        for (let i = 0; i < row; i++) {
          const x = island.x - layout.extent + i * layout.step;
          data[j * row + i] = this.islandHeight(island, x, z, x - island.x, z - island.z);
        }
      }
      return { ...layout, data };
    });
  }

  private islandHeight(island: IslandDef, x: number, z: number, dx: number, dz: number): number {
    const d = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);
    // Warping the radius by angle gives an irregular but still star-shaped coast.
    const wobble =
      this.noise.fbm(Math.cos(angle) * 1.7 + island.seed * 0.013, Math.sin(angle) * 1.7 - island.seed * 0.017, 3) * 0.26;
    const t = d / (island.radius * (1 + wobble));

    const inland = smoothstep(1.0, 0.55, t);
    const isRock = island.kind === 'rock';
    let h = island.height * Math.pow(inland, isRock ? 0.85 : 1.4);

    if (inland > 0.001) {
      const hills = this.noise.fbm(x * 0.0075, z * 0.0075, 4);
      const ridges = this.noise.ridged(x * 0.011 + island.seed, z * 0.011 - island.seed, 3);
      h += island.height * inland * (hills * 0.3 + (ridges - 0.5) * (isRock ? 0.55 : 0.32));
      if (island.kind === 'outpost') {
        // Outposts get a flatter shelf so shacks and docks sit level.
        const flat = smoothstep(0.72, 0.2, t);
        h = lerp(h, island.height * 0.42, flat * 0.85);
      }
    }

    // Foreshore. The radial falloff runs out at t = 1 and the deep skirt does
    // not bite until well past it, which left every island ringed by tens of
    // metres of dead-flat ground sitting at exactly sea level - no beach slope
    // for surf to break on, and a tideline that moved twenty metres with a
    // centimetre of swell. Carry the sand on down at about one in eleven.
    h -= Math.max(0, t - 0.94) * island.radius * 0.09;

    // Fine bumps so beaches and hillsides are not billiard-smooth. Carried out
    // across the foreshore, which is precisely where a smooth ramp shows.
    h += this.detail.fbm(x * 0.09, z * 0.09, 2) * 0.34 * clamp01((1.55 - t) * 2.2);

    // Underwater skirt reaching out to the sea floor.
    const off = smoothstep(1.05, 2.3, t);
    h -= (Math.abs(SEA_FLOOR) + 6) * off * off;
    if (off > 0.02) h += this.detail.fbm(x * 0.02 + 4.1, z * 0.02 - 7.3, 3) * 3.4 * off;

    return h;
  }

  normalAt(x: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
    const e = 0.6;
    const hL = this.heightAt(x - e, z);
    const hR = this.heightAt(x + e, z);
    const hD = this.heightAt(x, z - e);
    const hU = this.heightAt(x, z + e);
    return out.set(hL - hR, 2 * e, hD - hU).normalize();
  }

  /** Steepness in 0..1, where 0 is flat ground. */
  slopeAt(x: number, z: number): number {
    const n = this.normalAt(x, z);
    return clamp01(1 - n.y);
  }

  /**
   * Ground cover weights (sand, grass, rock) at a point, normalised to sum to
   * one. The terrain mesh bakes these into its splat attribute and the scatter
   * pass reads them back, so tufts of grass only ever grow where the ground is
   * painted as grass - scattering them by height alone dots the bare beach
   * with weeds and leaves the meadow behind it empty.
   */
  private coverAt(island: IslandDef, x: number, z: number, h: number, slope: number): [number, number, number] {
    const variation = this.detail.fbm(x * 0.05, z * 0.05, 2);
    const shoreNoise = this.detail.fbm(x * 0.045 + 12.7, z * 0.045 - 3.9, 3);
    const grassLine = 2.0 + shoreNoise * 3.6 + variation * 1.2;
    const beach = 1 - smoothstep(grassLine - 0.9, grassLine + 0.9, h);
    // Anything much past about thirty degrees is bare stone. The old threshold
    // sat above a forty-five degree face, so entire hillsides came out as one
    // unbroken sheet of green felt with nothing to read their shape against.
    const rocky =
      smoothstep(0.17, 0.44, slope + (variation - 0.5) * 0.14) +
      (island.kind === 'rock' ? 0.7 : 0) +
      clamp01((h - island.height * 0.72) / Math.max(4, island.height * 0.3)) * 0.5;
    let sand = clamp01(beach) + (h < -1 ? 1 : 0);
    let rock = clamp01(rocky);
    let grass = clamp01(1 - sand * 0.9 - rock * 0.9) * (h > 0.6 ? 1 : 0.15);
    if (island.kind === 'outpost' && h > 3) {
      const trodden = clamp01(
        1 - Math.hypot(x - island.x, z - island.z) / (island.radius * 0.34) + (this.detail.fbm(x * 0.012 + 31.7, z * 0.012 - 12.3, 3) - 0.5) * 0.8,
      );
      sand += trodden * 0.8;
      grass *= 1 - trodden * 0.7;
    }
    const total = Math.max(0.0001, sand + grass + rock);
    return [sand / total, grass / total, rock / total];
  }

  nearestIsland(x: number, z: number, kinds?: IslandKind[]): { island: IslandDef; distance: number } {
    let best = this.islands[0];
    let bestDist = Infinity;
    for (const island of this.islands) {
      if (kinds && !kinds.includes(island.kind)) continue;
      const d = Math.hypot(x - island.x, z - island.z) - island.radius;
      if (d < bestDist) {
        bestDist = d;
        best = island;
      }
    }
    return { island: best, distance: bestDist };
  }


  /** A random spot on dry land, biased away from the very centre and the surf. */
  randomLandPoint(island: IslandDef, rng: Rng, minHeight = 1.6): THREE.Vector3 {
    // Genuinely level ground, not merely walkable: chests, skeletons and the
    // player all end up here, and a hillside steep enough to put a shovel two
    // metres above the hole it is digging is no use to any of them.
    for (let attempt = 0; attempt < 160; attempt++) {
      const angle = rng.float(0, TAU);
      const r = island.radius * Math.sqrt(rng.float(0.02, 0.82));
      const x = island.x + Math.cos(angle) * r;
      const z = island.z + Math.sin(angle) * r;
      const h = this.heightAt(x, z);
      if (h <= minHeight) continue;
      // Check the neighbourhood, not just the gradient at a point: a single
      // flat facet can sit in the middle of a very steep slope.
      const spread = Math.max(
        Math.abs(this.heightAt(x - 1.6, z) - h),
        Math.abs(this.heightAt(x + 1.6, z) - h),
        Math.abs(this.heightAt(x, z - 1.6) - h),
        Math.abs(this.heightAt(x, z + 1.6) - h),
      );
      if (spread < 0.7) return new THREE.Vector3(x, h, z);
    }
    const h = this.heightAt(island.x, island.z);
    return new THREE.Vector3(island.x, h, island.z);
  }

  /**
   * Height field packed into RGBA8 (16-bit fixed point across r,g) so the ocean
   * shader can read water depth everywhere without float-texture extensions.
   * Blue carries distance to the waterline; see `SHORE_MIN`.
   */
  private buildHeightTexture(): THREE.DataTexture {
    const size = HEIGHT_TEX_SIZE;
    const data = new Uint8Array(size * size * 4);
    const encode = (index: number, height: number) => {
      const norm = clamp01((height - HEIGHT_MIN) / HEIGHT_SPAN);
      const scaled = norm * 65535;
      const hi = Math.floor(scaled / 256);
      const lo = Math.floor(scaled - hi * 256);
      data[index] = hi;
      data[index + 1] = lo;
      data[index + 3] = 255;
    };
    const encodeShore = (index: number, dist: number) => {
      data[index + 2] = Math.round(clamp01((dist - SHORE_MIN) / SHORE_SPAN) * 255);
    };

    // Start with open ocean everywhere, then stamp each island's local box.
    for (let i = 0; i < size * size; i++) {
      encode(i * 4, SEA_FLOOR);
      data[i * 4 + 2] = 255;
    }

    const worldToTexel = size / (WORLD_EXTENT * 2);
    for (const island of this.islands) {
      const reach = island.radius * 2.4;
      const minU = Math.max(0, Math.floor((island.x - reach + WORLD_EXTENT) * worldToTexel));
      const maxU = Math.min(size - 1, Math.ceil((island.x + reach + WORLD_EXTENT) * worldToTexel));
      const minV = Math.max(0, Math.floor((island.z - reach + WORLD_EXTENT) * worldToTexel));
      const maxV = Math.min(size - 1, Math.ceil((island.z + reach + WORLD_EXTENT) * worldToTexel));

      for (let v = minV; v <= maxV; v++) {
        const z = (v + 0.5) / worldToTexel - WORLD_EXTENT;
        for (let u = minU; u <= maxU; u++) {
          const x = (u + 0.5) / worldToTexel - WORLD_EXTENT;
          const idx = (v * size + u) * 4;
          const existing = ((data[idx] << 8) | data[idx + 1]) / 65535 * HEIGHT_SPAN + HEIGHT_MIN;
          const h = this.islandHeight(island, x, z, x - island.x, z - island.z);
          if (h > existing) encode(idx, h);
          // Nearest waterline wins, independently of which island happens to
          // own the terrain here.
          const shore = this.shoreDistanceAt(x, z);
          if (shore < clamp01(data[idx + 2] / 255) * SHORE_SPAN + SHORE_MIN) encodeShore(idx, shore);
        }
      }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  /** GLSL decoder matching `buildHeightTexture`. */
  static readonly HEIGHT_SAMPLE_GLSL = /* glsl */ `
    uniform sampler2D uHeightMap;
    uniform float uWorldExtent;

    /** Terrain height in x, metres seaward of the waterline in y, from one fetch. */
    vec2 sampleTerrainBed(vec2 worldXZ) {
      vec2 uv = (worldXZ + uWorldExtent) / (uWorldExtent * 2.0);
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        return vec2(${SEA_FLOOR.toFixed(1)}, ${(SHORE_MIN + SHORE_SPAN).toFixed(1)});
      }
      vec4 packed = texture2D(uHeightMap, uv);
      float norm = (packed.r * 255.0 * 256.0 + packed.g * 255.0) / 65535.0;
      return vec2(
        norm * ${HEIGHT_SPAN.toFixed(1)} + (${HEIGHT_MIN.toFixed(1)}),
        packed.b * ${SHORE_SPAN.toFixed(1)} + (${SHORE_MIN.toFixed(1)}));
    }

    float sampleTerrainHeight(vec2 worldXZ) {
      return sampleTerrainBed(worldXZ).x;
    }

    /** Metres seaward of the nearest waterline; negative inland. */
    float sampleShoreDistance(vec2 worldXZ) {
      return sampleTerrainBed(worldXZ).y;
    }
  `;

  /**
   * Builds all terrain meshes and scatter. Call once at load.
   *
   * Scatter is instanced per island rather than once for the whole archipelago:
   * a single world-spanning batch can never be frustum culled, and the grass
   * alone runs to millions of triangles, so every island would be paying for
   * every other island's undergrowth on every frame.
   */
  build(): void {
    const PALM_VARIANTS = 4;
    const ROCK_VARIANTS = 3;
    // Shared geometry: one palm variant is one buffer, reused by every island.
    const palmRng = new Rng(8811);
    const palmGeometries = Array.from({ length: PALM_VARIANTS }, () => palmGeometry(palmRng));
    const rockRng = new Rng(3355);
    const rockGeometries = Array.from({ length: ROCK_VARIANTS }, () => rockGeometry(rockRng, 1.4));
    const driftRng = new Rng(4499);
    const driftGeometries = Array.from({ length: 3 }, () => driftwoodGeometry(driftRng));
    const bushGeo = bushGeometry(new Rng(6612));
    const grassGeo = grassTuftGeometry(new Rng(9931));
    const barrelGeo = barrelGeometry();
    const crateGeo = crateGeometry(new Rng(1177));
    const wreckGeo = wreckGeometry(new Rng(2244));

    for (const island of this.islands) {
      this.group.add(this.buildTerrainMesh(island));

      const scatter = {
        palms: Array.from({ length: PALM_VARIANTS }, () => [] as ScatterPlacement[]),
        rocks: Array.from({ length: ROCK_VARIANTS }, () => [] as ScatterPlacement[]),
        bushes: [] as ScatterPlacement[],
        grass: [] as ScatterPlacement[],
        barrels: [] as ScatterPlacement[],
        crates: [] as ScatterPlacement[],
        wrecks: [] as ScatterPlacement[],
        driftwood: [] as ScatterPlacement[],
      };
      this.collectScatter(island, scatter, PALM_VARIANTS, ROCK_VARIANTS);

      for (let v = 0; v < PALM_VARIANTS; v++) {
        this.addInstances(palmGeometries[v], scatter.palms[v], true, this.palmMat);
      }
      for (let v = 0; v < ROCK_VARIANTS; v++) {
        this.addInstances(rockGeometries[v], scatter.rocks[v], true, this.rockMat);
      }
      this.addInstances(bushGeo, scatter.bushes, true, this.foliageMat);
      this.addInstances(grassGeo, scatter.grass, false, this.foliageMat);
      this.addInstances(barrelGeo, scatter.barrels, true);
      this.addInstances(crateGeo, scatter.crates, true);
      this.addInstances(wreckGeo, scatter.wrecks, true);
      for (let v = 0; v < driftGeometries.length; v++) {
        this.addInstances(driftGeometries[v], scatter.driftwood.filter((_, i) => i % 3 === v), true);
      }
    }
  }

  private addInstances(
    geometry: THREE.BufferGeometry,
    placements: ScatterPlacement[],
    shadows: boolean,
    material: THREE.Material = this.propMat,
  ): void {
    if (placements.length === 0) return;
    const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    placements.forEach((p, i) => {
      position.set(p.x, p.y, p.z);
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rotation);
      scale.setScalar(p.scale);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    // Per-island batches sit inside a known bound, so they can be culled.
    mesh.computeBoundingSphere();
    this.group.add(mesh);
  }

  private buildTerrainMesh(island: IslandDef): THREE.Mesh {
    // Exactly the grid heightAt samples, so a vertex lands on every grid node
    // and the surface underfoot is the surface on screen.
    const { extent, segments } = IslandField.gridLayout(island);
    const geometry = new THREE.PlaneGeometry(extent * 2, extent * 2, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const splat = new Float32Array(pos.count * 3);
    // Metres inland of the waterline, so the swash can be sized in metres of
    // beach the way the ocean's surf is. Height above sea level cannot do that
    // job: the same half metre of rise is two metres of sand on a steep cove and
    // twenty on a flat, so a tideline scaled by height is a tight line in one
    // place and a wash halfway up the beach in the next.
    const shore = new Float32Array(pos.count);
    const color = new THREE.Color();

    // The sand/grass/rock textures carry the palette now, so vertex colour is
    // only a tint: damp sand, bleached scrub, mossy hollows, trodden earth.
    const WET = new THREE.Color(0x8f7f63);
    const SCRUB = new THREE.Color(0xc0b878);
    const EARTH = new THREE.Color(0xa08256);
    const MOSS = new THREE.Color(0x6e8a55);
    const TRODDEN = new THREE.Color(0xb59a6e);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + island.x;
      const z = pos.getZ(i) + island.z;
      const h = this.heightAt(x, z);
      pos.setXYZ(i, pos.getX(i), h, pos.getZ(i));

      shore[i] = this.shoreDistanceAt(x, z);

      const slope = clamp01(1 - this.normalAt(x, z).y);
      const variation = this.detail.fbm(x * 0.05, z * 0.05, 2);
      const patch = this.detail.fbm(x * 0.012 + 31.7, z * 0.012 - 12.3, 3);
      const dry = this.detail.fbm(x * 0.03 - 8.1, z * 0.03 + 55.4, 3);

      // Beaches are sand, the interior is grass, anything steep is bare rock.
      const [wSand, wGrass, wRock] = this.coverAt(island, x, z, h, slope);
      splat[i * 3] = wSand;
      splat[i * 3 + 1] = wGrass;
      splat[i * 3 + 2] = wRock;

      // --- Tint.
      color.setScalar(1);
      // Only a hint here: the terrain shader darkens the sand the swash is
      // actually running over, and baking a second static band on top of that
      // leaves a permanent dark ring round every island at low tide.
      if (h < 0.8) color.lerp(WET, clamp01((0.8 - h) / 2.4) * 0.3);
      if (h > 2.2) {
        // Lean on these harder than looks reasonable in isolation: seen from
        // half a mile off, ground cover that varies less than this reads as
        // one flat sheet of colour however good the texture on it is.
        color.lerp(SCRUB, clamp01(patch * 1.5) * 0.6 * wGrass);
        color.lerp(EARTH, clamp01(dry * 1.3 - 0.25) * 0.55 * wGrass);
        color.lerp(MOSS, clamp01(-patch * 1.6) * 0.55 * wGrass);
      }
      if (island.kind === 'outpost' && h > 3) {
        const trodden = clamp01(1 - Math.hypot(x - island.x, z - island.z) / (island.radius * 0.34));
        color.lerp(TRODDEN, trodden * 0.4);
      }
      // Bake a curvature term: gullies and the foot of a slope collect shade,
      // ridges catch the light. Without it a hillside reads as a smooth dome
      // however good the texture on it is.
      const r = 7;
      const around =
        (this.heightAt(x - r, z) + this.heightAt(x + r, z) + this.heightAt(x, z - r) + this.heightAt(x, z + r)) / 4;
      const curvature = clamp((h - around) / 3.5, -1, 1);
      color.multiplyScalar(0.9 + variation * 0.2 + curvature * 0.12);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSplat', new THREE.BufferAttribute(splat, 3));
    geometry.setAttribute('aShore', new THREE.BufferAttribute(shore, 1));
    // UVs in world metres, so the ground detail tiles evenly across every island
    // and never stretches over a cliff face.
    const uvs = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uvs[i * 2] = pos.getX(i) + island.x;
      uvs[i * 2 + 1] = pos.getZ(i) + island.z;
    }
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, this.terrainMaterial);
    mesh.position.set(island.x, 0, island.z);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.name = `terrain-${island.id}`;
    mesh.userData.island = island.id;
    return mesh;
  }

  private collectScatter(
    island: IslandDef,
    scatter: {
      palms: ScatterPlacement[][];
      rocks: ScatterPlacement[][];
      bushes: ScatterPlacement[];
      grass: ScatterPlacement[];
      barrels: ScatterPlacement[];
      crates: ScatterPlacement[];
      wrecks: ScatterPlacement[];
      driftwood: ScatterPlacement[];
    },
    palmVariants: number,
    rockVariants: number,
  ): void {
    const rng = new Rng(island.seed * 7919 + 13);
    const area = Math.PI * island.radius * island.radius;
    const isRock = island.kind === 'rock';

    const palmCount = isRock ? rng.int(0, 2) : Math.round((area / 1400) * rng.float(0.6, 1.15));
    const bushCount = isRock ? rng.int(1, 4) : Math.round(area / 380);
    // Clumping is what makes ground cover read, not raw count: an even scatter
    // twice as dense still looks like a dot pattern and costs twice as much.
    const grassCount = isRock ? rng.int(4, 14) : Math.round(area / 16);
    const rockCount = Math.round(area / (isRock ? 500 : 1400)) + 4;

    /**
     * Places `count` props, retrying rejected spots so steep islands still get
     * their share of trees instead of losing most candidates to the slope test.
     */
    const place = (
      list: ScatterPlacement[],
      count: number,
      minH: number,
      maxHFrac: number,
      maxSlope: number,
      scaleMin: number,
      scaleMax: number,
      sink = 0,
    ) => {
      let placed = 0;
      let attempts = 0;
      const maxAttempts = count * 14 + 20;
      while (placed < count && attempts < maxAttempts) {
        attempts++;
        const angle = rng.float(0, TAU);
        const r = island.radius * Math.sqrt(rng.float(0.01, 1.02));
        const x = island.x + Math.cos(angle) * r;
        const z = island.z + Math.sin(angle) * r;
        const h = this.heightAt(x, z);
        if (h < minH || h > island.height * maxHFrac) continue;
        if (this.slopeAt(x, z) > maxSlope) continue;
        list.push({ x, y: h - sink, z, rotation: rng.float(0, TAU), scale: rng.float(scaleMin, scaleMax) });
        placed++;
      }
    };

    /**
     * Grass in clumps rather than evenly spread. Uniform scatter at any
     * affordable density reads as a dot pattern up close and as bald ground a
     * few paces further off; clumping puts the same number of blades where the
     * eye can see them and leaves honest gaps between.
     */
    const placeGrass = (count: number) => {
      let placed = 0;
      let attempts = 0;
      while (placed < count && attempts < count * 6 + 40) {
        attempts++;
        const angle = rng.float(0, TAU);
        const r = island.radius * Math.sqrt(rng.float(0.01, 1.02));
        const cx = island.x + Math.cos(angle) * r;
        const cz = island.z + Math.sin(angle) * r;
        const ch = this.heightAt(cx, cz);
        if (ch < 0.8 || ch > island.height * 0.98) continue;
        // Follow the ground cover the terrain is painted with, so tufts never
        // sprout out of bare sand or a rock face. The threshold is low enough
        // to catch the marram on the back of the dunes, where the splat is
        // mostly sand but there is still something growing.
        if (this.coverAt(island, cx, cz, ch, this.slopeAt(cx, cz))[1] < 0.22) continue;
        const clump = rng.int(4, 11);
        const spread = rng.float(0.8, 2.4);
        for (let i = 0; i < clump && placed < count; i++) {
          const a = rng.float(0, TAU);
          const d = spread * Math.sqrt(rng.float(0, 1));
          const x = cx + Math.cos(a) * d;
          const z = cz + Math.sin(a) * d;
          const h = this.heightAt(x, z);
          if (h < 0.7) continue;
          scatter.grass.push({ x, y: h - 0.06, z, rotation: rng.float(0, TAU), scale: rng.float(0.75, 1.8) });
          placed++;
        }
      }
    };

    for (let i = 0; i < palmCount; i++) {
      place(scatter.palms[rng.int(0, palmVariants)], 1, 1.4, 0.78, 0.42, 0.75, 1.25);
    }
    place(scatter.bushes, bushCount, 1.2, 0.92, 0.6, 0.7, 1.4);
    placeGrass(grassCount);
    for (let i = 0; i < rockCount; i++) {
      place(scatter.rocks[rng.int(0, rockVariants)], 1, -2.5, 1.1, 1, 0.5, isRock ? 2.4 : 1.7, 0.35);
    }

    // Driftwood and boulders along the tideline, where a bare curve of sand
    // otherwise gives the eye nothing to measure the shore against.
    if (!isRock) {
      const driftCount = Math.round(island.radius / 22);
      for (let i = 0; i < driftCount; i++) place(scatter.driftwood, 1, 0.35, 0.14, 0.35, 0.7, 1.3, 0.06);
      const shoreRocks = Math.round(island.radius / 12);
      for (let i = 0; i < shoreRocks; i++) {
        place(scatter.rocks[rng.int(0, rockVariants)], 1, -1.6, 0.1, 1.2, 0.35, 1.1, 0.3);
      }
    }

    if (!isRock && rng.bool(0.45)) {
      const spot = this.randomLandPoint(island, rng, 0.6);
      scatter.wrecks.push({ x: spot.x, y: spot.y - 0.4, z: spot.z, rotation: rng.float(0, TAU), scale: rng.float(0.8, 1.2) });
    }

    if (island.kind === 'outpost') {
      for (let i = 0; i < 8; i++) place(scatter.barrels, 1, 2.2, 0.85, 0.28, 0.85, 1.05);
      for (let i = 0; i < 6; i++) place(scatter.crates, 1, 2.2, 0.85, 0.28, 0.9, 1.15);
    }
  }
}
