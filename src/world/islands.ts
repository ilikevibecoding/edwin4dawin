import * as THREE from 'three';
import { clamp, clamp01, lerp, Rng, smoothstep, TAU } from '../core/math';
import { Noise2D } from '../core/noise';
import { WORLD_EXTENT } from './environment';
import {
  barrelGeometry,
  bushGeometry,
  crateGeometry,
  grassTuftGeometry,
  palmGeometry,
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
  private terrainMaterial: THREE.MeshStandardMaterial;
  private propMat: THREE.MeshStandardMaterial;

  constructor() {
    this.group.name = 'islands';
    this.terrainMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0,
    });
    this.propMat = propMaterial();
    this.heightTexture = this.buildHeightTexture();
  }

  /** Terrain height at a world position. Above 0 is dry land. */
  heightAt(x: number, z: number): number {
    let h = SEA_FLOOR;
    for (let i = 0; i < this.islands.length; i++) {
      const island = this.islands[i];
      const dx = x - island.x;
      const dz = z - island.z;
      const reach = island.radius * 2.4;
      if (dx * dx + dz * dz > reach * reach) continue;
      const contribution = this.islandHeight(island, x, z, dx, dz);
      if (contribution > h) h = contribution;
    }
    return h;
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
      // Fine bumps so beaches and hillsides are not billiard-smooth.
      h += this.detail.fbm(x * 0.09, z * 0.09, 2) * 0.34 * clamp01(inland * 3);
      if (island.kind === 'outpost') {
        // Outposts get a flatter shelf so shacks and docks sit level.
        const flat = smoothstep(0.72, 0.2, t);
        h = lerp(h, island.height * 0.42, flat * 0.85);
      }
    }

    // Underwater skirt reaching out to the sea floor.
    const off = smoothstep(0.98, 2.3, t);
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

  islandById(id: string): IslandDef | undefined {
    return this.islands.find((i) => i.id === id);
  }

  /** A random spot on dry land, biased away from the very centre and the surf. */
  randomLandPoint(island: IslandDef, rng: Rng, minHeight = 1.6): THREE.Vector3 {
    for (let attempt = 0; attempt < 120; attempt++) {
      const angle = rng.float(0, TAU);
      const r = island.radius * Math.sqrt(rng.float(0.02, 0.82));
      const x = island.x + Math.cos(angle) * r;
      const z = island.z + Math.sin(angle) * r;
      const h = this.heightAt(x, z);
      if (h > minHeight && this.slopeAt(x, z) < 0.55) return new THREE.Vector3(x, h, z);
    }
    const h = this.heightAt(island.x, island.z);
    return new THREE.Vector3(island.x, h, island.z);
  }

  /**
   * Height field packed into RGBA8 (16-bit fixed point across r,g) so the ocean
   * shader can read water depth everywhere without float-texture extensions.
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
      data[index + 2] = 0;
      data[index + 3] = 255;
    };

    // Start with open ocean everywhere, then stamp each island's local box.
    for (let i = 0; i < size * size; i++) encode(i * 4, SEA_FLOOR);

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

    float sampleTerrainHeight(vec2 worldXZ) {
      vec2 uv = (worldXZ + uWorldExtent) / (uWorldExtent * 2.0);
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return ${SEA_FLOOR.toFixed(1)};
      vec4 packed = texture2D(uHeightMap, uv);
      float norm = (packed.r * 255.0 * 256.0 + packed.g * 255.0) / 65535.0;
      return norm * ${HEIGHT_SPAN.toFixed(1)} + (${HEIGHT_MIN.toFixed(1)});
    }
  `;

  /** Builds all terrain meshes and scatter. Call once at load. */
  build(): void {
    const scatter = {
      palms: [] as ScatterPlacement[][],
      rocks: [] as ScatterPlacement[][],
      bushes: [] as ScatterPlacement[],
      grass: [] as ScatterPlacement[],
      barrels: [] as ScatterPlacement[],
      crates: [] as ScatterPlacement[],
      wrecks: [] as ScatterPlacement[],
    };
    const PALM_VARIANTS = 4;
    const ROCK_VARIANTS = 3;
    for (let i = 0; i < PALM_VARIANTS; i++) scatter.palms.push([]);
    for (let i = 0; i < ROCK_VARIANTS; i++) scatter.rocks.push([]);

    for (const island of this.islands) {
      this.group.add(this.buildTerrainMesh(island));
      this.collectScatter(island, scatter, PALM_VARIANTS, ROCK_VARIANTS);
    }

    const palmRng = new Rng(8811);
    for (let v = 0; v < PALM_VARIANTS; v++) {
      this.addInstances(palmGeometry(palmRng), scatter.palms[v], true);
    }
    const rockRng = new Rng(3355);
    for (let v = 0; v < ROCK_VARIANTS; v++) {
      this.addInstances(rockGeometry(rockRng, 1.4), scatter.rocks[v], true);
    }
    this.addInstances(bushGeometry(new Rng(6612)), scatter.bushes, true);
    this.addInstances(grassTuftGeometry(new Rng(9931)), scatter.grass, false);
    this.addInstances(barrelGeometry(), scatter.barrels, true);
    this.addInstances(crateGeometry(new Rng(1177)), scatter.crates, true);
    this.addInstances(wreckGeometry(new Rng(2244)), scatter.wrecks, true);
  }

  private addInstances(geometry: THREE.BufferGeometry, placements: ScatterPlacement[], shadows: boolean): void {
    if (placements.length === 0) {
      geometry.dispose();
      return;
    }
    const mesh = new THREE.InstancedMesh(geometry, this.propMat, placements.length);
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
    mesh.frustumCulled = false;
    this.group.add(mesh);
  }

  private buildTerrainMesh(island: IslandDef): THREE.Mesh {
    const extent = island.radius * 2.35;
    // ~4 m between vertices: enough for smooth hills without a million triangles.
    const segments = clamp(Math.round(island.radius * 0.45), 32, 96);
    const geometry = new THREE.PlaneGeometry(extent * 2, extent * 2, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const color = new THREE.Color();

    const sandWet = new THREE.Color(0xa8875a);
    const sand = new THREE.Color(0xdcc493);
    const sandDry = new THREE.Color(0xcbb27e);
    const grass = new THREE.Color(0x5c8a3c);
    const grassDark = new THREE.Color(0x3f6b2f);
    const rock = new THREE.Color(0x6f6559);
    const rockDark = new THREE.Color(0x4a443c);
    const seabed = new THREE.Color(0x9a8c6a);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + island.x;
      const z = pos.getZ(i) + island.z;
      const h = this.heightAt(x, z);
      pos.setXYZ(i, pos.getX(i), h, pos.getZ(i));

      const slope = clamp01(1 - this.normalAt(x, z).y * 1.0) * 2.2;
      const variation = this.detail.fbm(x * 0.05, z * 0.05, 2);

      if (h < -3) {
        color.copy(seabed).lerp(sandWet, clamp01((h + 14) / 11) * 0.5);
      } else if (h < 0.9) {
        color.copy(sandWet).lerp(sand, clamp01((h + 3) / 3.9));
      } else if (h < 4.5) {
        color.copy(sand).lerp(sandDry, clamp01((h - 0.9) / 3.6));
        color.lerp(grass, clamp01((h - 2.6) / 2.4) * 0.8);
      } else {
        const t = clamp01((h - 4.5) / Math.max(6, island.height * 0.55));
        color.copy(grass).lerp(grassDark, t * 0.7 + variation * 0.2);
      }

      // Cliffs and rock spines override the ground cover.
      const rocky = clamp01((slope - 0.55) * 2.4) * clamp01((h + 2) / 4);
      color.lerp(rock.clone().lerp(rockDark, clamp01(variation + 0.4)), rocky);
      if (island.kind === 'rock') color.lerp(rockDark, 0.35);
      color.multiplyScalar(0.94 + variation * 0.12);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
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
    },
    palmVariants: number,
    rockVariants: number,
  ): void {
    const rng = new Rng(island.seed * 7919 + 13);
    const area = Math.PI * island.radius * island.radius;
    const isRock = island.kind === 'rock';

    const palmCount = isRock ? rng.int(0, 2) : Math.round((area / 1400) * rng.float(0.6, 1.15));
    const bushCount = isRock ? rng.int(1, 4) : Math.round(area / 900);
    const grassCount = isRock ? rng.int(2, 8) : Math.round(area / 320);
    const rockCount = Math.round(area / (isRock ? 700 : 2600)) + 3;

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

    for (let i = 0; i < palmCount; i++) {
      place(scatter.palms[rng.int(0, palmVariants)], 1, 1.4, 0.78, 0.42, 0.75, 1.25);
    }
    place(scatter.bushes, bushCount, 1.2, 0.92, 0.6, 0.7, 1.4);
    place(scatter.grass, grassCount, 1.0, 0.95, 0.7, 0.8, 1.6);
    for (let i = 0; i < rockCount; i++) {
      place(scatter.rocks[rng.int(0, rockVariants)], 1, -2.5, 1.1, 1, 0.5, isRock ? 2.4 : 1.7, 0.35);
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
