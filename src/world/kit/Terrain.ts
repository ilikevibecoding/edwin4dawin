import * as THREE from 'three';
import type { MaterialId } from '../../core/Contracts';
import { clamp, perlin2, smoothstep } from '../../core/MathUtils';
import { mergeGeometries } from '../../procgen';
import { type Sink, cachedGeometry, planeGeometry, slab, transform } from './Kit';
import { hazardBand, roadStencil } from './Signage';

/**
 * The ground.
 *
 * A single flat plane with one texture is the fastest way to make a level look
 * like a tech demo, so the ground here is a height field with a road network cut
 * into it: asphalt with a crown and kerbs, dirt shoulders and gravel patches
 * blended over the sand with per-vertex alpha, worn paint, drains and manholes.
 * Everything reads `TerrainField`, so the visual mesh, the collision mesh and
 * `sampleGround()` can never disagree.
 */

export type RoadSurface = 'asphalt' | 'gravel' | 'dirt';

export interface RoadSpec {
  name: string;
  /** The axis the carriageway runs along: 'x' is an east-west street. */
  axis: 'x' | 'z';
  /** Coordinate of the centreline on the other axis. */
  center: number;
  /** Extent along `axis`. */
  from: number;
  to: number;
  halfWidth: number;
  surface: RoadSurface;
  /** Height of the crown at the centreline. */
  camber: number;
  kerb: boolean;
  markings: 'none' | 'dash' | 'edge';
}

export interface PadSpec {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  height: number;
  /** Metres over which the surrounding ground blends into the pad. */
  feather: number;
}

const ROAD_MATERIAL: Record<RoadSurface, MaterialId> = {
  asphalt: 'asphalt',
  gravel: 'gravel',
  dirt: 'dirt_ground',
};

/**
 * Metres per texture tile for each carriageway surface.
 *
 * `gravel` is authored as graded hardcore — fifteen stones across its 2.2 m tile,
 * so a 15 cm cobble. That is right for a fill heap and wrong for a street people
 * walk down, where it reads as a Victorian sett road. Tiling it at 1.1 m puts the
 * top grade at 7 cm, which is what a compacted gravel surface actually is.
 */
const ROAD_TILE: Record<RoadSurface, number> = {
  // 34 coarse aggregate per tile, so 5 cm chippings. The authored 3 m puts them
  // at 8 cm, which is a sett road rather than a carriageway.
  asphalt: 1.8,
  gravel: 1.1,
  dirt: 2.2,
};

/**
 * Per-surface tint for the carriageway.
 *
 * The gravel is authored as clean crushed limestone, which is what it looks like
 * on the day it is laid and never again. Knocked down and warmed it reads as a
 * street surface that has had dust blown over it and been driven on.
 */
const ROAD_TINT: Record<RoadSurface, number> = {
  asphalt: 0xffffff,
  gravel: 0xb4a68c,
  dirt: 0xe8e0cf,
};

/** Metres above the terrain shell the road surface is laid at. */
const ROAD_LIFT = 0.03;

export class TerrainField {
  constructor(
    readonly roads: readonly RoadSpec[],
    readonly pads: readonly PadSpec[],
  ) {}

  /**
   * Walkable surface height at a world XZ.
   *
   * Wide, low-amplitude undulation keeps the town from looking like it was built
   * on a table, but stays inside what the character controller's step height
   * absorbs without the player feeling the ground fight them.
   */
  height(x: number, z: number): number {
    let h =
      perlin2(x * 0.0125, z * 0.0125) * 0.24 +
      perlin2(x * 0.041 + 11.3, z * 0.041 - 4.7) * 0.075;

    for (const road of this.roads) {
      const along = road.axis === 'x' ? x : z;
      if (along < road.from - 2 || along > road.to + 2) continue;
      const across = Math.abs((road.axis === 'x' ? z : x) - road.center);
      const edge = road.halfWidth;
      if (across > edge + 1.6) continue;
      const t = clamp(across / edge, 0, 1);
      const crown = road.camber * (1 - t * t);
      const w = 1 - smoothstep(edge * 0.85, edge + 1.6, across);
      h = h * (1 - w) + crown * w;
    }

    for (const pad of this.pads) {
      const dx = Math.max(pad.minX - x, 0, x - pad.maxX);
      const dz = Math.max(pad.minZ - z, 0, z - pad.maxZ);
      const d = Math.hypot(dx, dz);
      if (d > pad.feather) continue;
      const w = 1 - smoothstep(0, pad.feather, d);
      h = h * (1 - w) + pad.height * w;
    }
    return h;
  }

  /** Analytic normal from central differences; keeps the ground smooth. */
  normal(x: number, z: number, out: THREE.Vector3): THREE.Vector3 {
    const e = 0.6;
    const dx = this.height(x + e, z) - this.height(x - e, z);
    const dz = this.height(x, z + e) - this.height(x, z - e);
    return out.set(-dx / (2 * e), 1, -dz / (2 * e)).normalize();
  }

  /**
   * True on the flat a building was seated on.
   *
   * The ground overlays draw with `depthWrite` off and a negative polygon offset,
   * which is what lets them blend over the shell without z-fighting it — and also
   * what lets them punch straight up through a finished floor. Anything that
   * decorates the terrain has to keep off the pads.
   */
  onPad(x: number, z: number, margin = 0): boolean {
    for (const pad of this.pads) {
      if (
        x > pad.minX - margin &&
        x < pad.maxX + margin &&
        z > pad.minZ - margin &&
        z < pad.maxZ + margin
      ) {
        return true;
      }
    }
    return false;
  }

  /** True inside the paved part of a road, used to cut the terrain shell. */
  onRoad(x: number, z: number, margin = 0): boolean {
    for (const road of this.roads) {
      if (this.onOneRoad(road, x, z, margin)) return true;
    }
    return false;
  }

  /**
   * Whether one single road paves the whole of an axis-aligned rectangle.
   *
   * The obvious test — every corner is on some road — is wrong where two roads
   * meet end to end: each corner can be claimed by a different strip while the
   * middle belongs to neither, and the ground beneath is skipped, leaving a hole
   * with the sky showing through it. A road strip is a convex rectangle, so
   * asking one road at a time to own all four corners is exact.
   */
  coversRect(minX: number, minZ: number, maxX: number, maxZ: number, margin = 0): boolean {
    for (const road of this.roads) {
      if (
        this.onOneRoad(road, minX, minZ, margin) &&
        this.onOneRoad(road, maxX, minZ, margin) &&
        this.onOneRoad(road, minX, maxZ, margin) &&
        this.onOneRoad(road, maxX, maxZ, margin)
      ) {
        return true;
      }
    }
    return false;
  }

  private onOneRoad(road: RoadSpec, x: number, z: number, margin: number): boolean {
    const along = road.axis === 'x' ? x : z;
    if (along < road.from - margin || along > road.to + margin) return false;
    const across = Math.abs((road.axis === 'x' ? z : x) - road.center);
    return across <= road.halfWidth - margin;
  }
}

export interface TerrainBuildOptions {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  /** Visual grid step. */
  step: number;
  /** Collision grid step; coarser, since the field is deliberately gentle. */
  collisionStep: number;
  chunkSize: number;
}

export function buildTerrain(sink: Sink, field: TerrainField, opts: TerrainBuildOptions): void {
  buildShell(sink, field, opts);
  buildCollision(sink, field, opts);
  for (const road of field.roads) buildRoad(sink, field, road);
  buildBlendPatches(sink, field, opts);

  sink.addWalkable({
    minX: opts.minX + 2,
    minZ: opts.minZ + 2,
    maxX: opts.maxX - 2,
    maxZ: opts.maxZ - 2,
    height: 0,
    terrain: true,
  });
}

/**
 * Ground shell, built per chunk so it culls with everything else.
 *
 * Two surfaces, chosen per quad. The town floor is compacted dirt, because that
 * is what the ground between buildings in a lived-in place actually is, and
 * because `sand_ground` cannot be used at this scale: its ripple train is baked
 * into the albedo as well as the normal, and since the projection is planar and
 * world-aligned every sand quad on the map shares one phase, so the open ground
 * combs itself into an unbroken corduroy from one spawn to the other. Sand comes
 * back in the outer margin, where the shell has to weld into the desert plain and
 * where a ripple train is the correct read.
 *
 * The dirt/sand threshold is wobbled by a couple of octaves of sine so the
 * changeover is not a visible square ring.
 */
function buildShell(sink: Sink, field: TerrainField, opts: TerrainBuildOptions): void {
  const { step, chunkSize } = opts;
  const normal = new THREE.Vector3();
  const half = Math.min(opts.maxX, opts.maxZ);

  for (let baseZ = opts.minZ; baseZ < opts.maxZ; baseZ += chunkSize) {
    for (let baseX = opts.minX; baseX < opts.maxX; baseX += chunkSize) {
      const endX = Math.min(baseX + chunkSize, opts.maxX);
      const endZ = Math.min(baseZ + chunkSize, opts.maxZ);
      const surfaces = SHELL_SURFACES.map(() => ({
        positions: [] as number[],
        normals: [] as number[],
        uvs: [] as number[],
        indices: [] as number[],
      }));

      for (let z = baseZ; z < endZ - 1e-6; z += step) {
        for (let x = baseX; x < endX - 1e-6; x += step) {
          const x1 = Math.min(x + step, endX);
          const z1 = Math.min(z + step, endZ);
          // Skip quads fully inside a road; the road mesh owns those.
          if (field.coversRect(x, z, x1, z1, 0.05)) continue;

          const cx = (x + x1) * 0.5;
          const cz = (z + z1) * 0.5;
          const edge = half - Math.max(Math.abs(cx), Math.abs(cz));
          const wobble = Math.sin(cx * 0.11) * 3.4 + Math.sin(cz * 0.083 + 1.9) * 2.6;
          const target = surfaces[edge < SHELL_MARGIN + wobble ? 1 : 0];

          const base = target.positions.length / 3;
          for (const [px, pz] of [
            [x, z],
            [x1, z],
            [x1, z1],
            [x, z1],
          ] as const) {
            field.normal(px, pz, normal);
            target.positions.push(px, field.height(px, pz), pz);
            target.normals.push(normal.x, normal.y, normal.z);
            target.uvs.push(px, pz);
          }
          target.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
        }
      }

      const centre = new THREE.Vector3(baseX + chunkSize * 0.5, 0, baseZ + chunkSize * 0.5);
      for (let i = 0; i < surfaces.length; i++) {
        const built = surfaces[i];
        if (built.indices.length === 0) continue;
        const spec = SHELL_SURFACES[i];
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(built.positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(built.normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(built.uvs, 2));
        geometry.setIndex(built.indices);
        sink.addStatic(geometry, {
          material: spec.material,
          tier: 'ground',
          reproject: true,
          tile: spec.tile,
          tint: spec.tint,
          mottle: spec.mottle,
          chunkAt: centre,
        });
      }
    }
  }
}

/** Metres in from the shell boundary at which the town floor gives way to sand. */
const SHELL_MARGIN = 12;

const SHELL_SURFACES: Array<{
  material: MaterialId;
  tile: number;
  tint: number;
  mottle: number;
}> = [
  { material: 'dirt_ground', tile: 2.6, tint: 0xd8cdb4, mottle: 0.5 },
  // Slacker than the material's authored 3 m so the ripple lattice is coarse
  // enough to disappear under the vertex mottle out at the edge of the map.
  { material: 'sand_ground', tile: 4.4, tint: 0xf6f1e6, mottle: 0.55 },
];

/**
 * Collision shell. Coarser than the visual mesh on purpose: a trimesh collider
 * is the most expensive shape Rapier has, and the field is smooth enough that
 * two-metre sampling tracks it to within a centimetre or two.
 */
function buildCollision(sink: Sink, field: TerrainField, opts: TerrainBuildOptions): void {
  const step = opts.collisionStep;
  const positions: number[] = [];
  const indices: number[] = [];
  const cols = Math.round((opts.maxX - opts.minX) / step) + 1;
  const rows = Math.round((opts.maxZ - opts.minZ) / step) + 1;

  for (let r = 0; r < rows; r++) {
    const z = opts.minZ + r * step;
    for (let c = 0; c < cols; c++) {
      const x = opts.minX + c * step;
      positions.push(x, field.height(x, z), z);
    }
  }
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const d = a + cols;
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry);
  mesh.name = 'terrain:collision';
  sink.addTrimesh(mesh, 'sand');
}

function buildRoad(sink: Sink, field: TerrainField, road: RoadSpec): void {
  const acrossSteps = 6;
  const alongStep = 2;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const normal = new THREE.Vector3();

  const length = road.to - road.from;
  const alongCount = Math.max(1, Math.round(length / alongStep));
  const cols = acrossSteps + 1;

  for (let i = 0; i <= alongCount; i++) {
    const along = road.from + (length * i) / alongCount;
    for (let j = 0; j <= acrossSteps; j++) {
      const across = road.center - road.halfWidth + (2 * road.halfWidth * j) / acrossSteps;
      const x = road.axis === 'x' ? along : across;
      const z = road.axis === 'x' ? across : along;
      field.normal(x, z, normal);
      positions.push(x, field.height(x, z) + ROAD_LIFT, z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(x, z);
    }
  }
  // Laying (along, across) onto (x, z) reverses handedness between the two axes,
  // so one of them has to be wound the other way round. Get it wrong and the road
  // is back-facing: it vanishes under front-side culling and the sky's ground dome
  // shows through the street, while still shading and colliding as if it were
  // there.
  const flip = road.axis === 'x';
  for (let i = 0; i < alongCount; i++) {
    for (let j = 0; j < acrossSteps; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      if (flip) indices.push(a, b, c, b, d, c);
      else indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  // Long roads span several chunks, so they are split for culling.
  const chunks = Math.max(1, Math.ceil(length / 48));
  if (chunks === 1) {
    sink.addStatic(geometry, {
      material: ROAD_MATERIAL[road.surface],
      tier: 'ground',
      tile: ROAD_TILE[road.surface],
      reproject: true,
      tint: ROAD_TINT[road.surface],
      mottle: 0.45,
    });
  } else {
    splitAlongAxis(geometry, road, chunks, sink);
  }

  if (road.kerb) buildKerbs(sink, field, road);
  if (road.markings !== 'none') buildMarkings(sink, field, road);
  buildRoadStencils(sink, field, road);
  buildRoadFurniture(sink, field, road);
}

/** Splits a long road strip into chunk-sized pieces so culling can work on it. */
function splitAlongAxis(
  geometry: THREE.BufferGeometry,
  road: RoadSpec,
  pieces: number,
  sink: Sink,
): void {
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const index = geometry.getIndex();
  if (!index) return;
  const length = road.to - road.from;

  for (let p = 0; p < pieces; p++) {
    const lo = road.from + (length * p) / pieces - 1e-3;
    const hi = road.from + (length * (p + 1)) / pieces + 1e-3;
    const kept: number[] = [];
    for (let t = 0; t < index.count; t += 3) {
      const a = index.getX(t);
      const along = road.axis === 'x' ? position.getX(a) : position.getZ(a);
      if (along < lo || along > hi) continue;
      kept.push(a, index.getX(t + 1), index.getX(t + 2));
    }
    if (kept.length === 0) continue;
    const piece = geometry.clone();
    piece.userData = {};
    piece.setIndex(kept);
    sink.addStatic(piece, {
      material: ROAD_MATERIAL[road.surface],
      tier: 'ground',
      tile: ROAD_TILE[road.surface],
      reproject: true,
      tint: ROAD_TINT[road.surface],
      mottle: 0.45,
    });
  }
  geometry.dispose();
}

function buildKerbs(sink: Sink, field: TerrainField, road: RoadSpec): void {
  const segment = 3.4;
  const height = 0.16;
  const width = 0.28;
  const count = Math.max(1, Math.floor((road.to - road.from) / segment));
  // Kerbs are gently bevelled so their top edge catches the low sun.
  const geometry = cachedGeometry(`kerb|${segment}|${height}|${width}`, () =>
    slab(0, 0, 0, segment, height, width, 0.035, 2.2),
  );

  for (let side = -1; side <= 1; side += 2) {
    const across = road.center + side * (road.halfWidth + width * 0.5);
    // Painted kerb banding runs in stretches, the way a real no-parking marking
    // does: one length of kerb outside a shop, then plain concrete for twenty
    // metres. A per-segment coin toss would read as noise instead.
    let banded = sink.rng.bool(0.3);
    let bandLeft = sink.rng.int(2, 6);
    for (let i = 0; i < count; i++) {
      const along = road.from + (i + 0.5) * ((road.to - road.from) / count);
      const x = road.axis === 'x' ? along : across;
      const z = road.axis === 'x' ? across : along;
      const y = field.height(x, z) + height * 0.5;
      const yaw = road.axis === 'x' ? 0 : Math.PI / 2;
      sink.addProp(geometry, transform(x, y, z, yaw), {
        material: 'concrete_wall',
        tier: 'ground',
        tint: sink.rng.bool(0.35) ? 0xdad3c4 : 0xf2ece0,
      });
      if (banded) {
        // On the road-facing flank, where a driver and the player both see it.
        const faceYaw = yaw + (side < 0 ? Math.PI / 2 : -Math.PI / 2);
        hazardBand(
          sink,
          x + Math.sin(faceYaw) * (width * 0.5 + 0.008),
          y + 0.005,
          z + Math.cos(faceYaw) * (width * 0.5 + 0.008),
          faceYaw,
          segment,
          height * 0.86,
        );
      }
      if (--bandLeft <= 0) {
        banded = !banded;
        bandLeft = banded ? sink.rng.int(2, 6) : sink.rng.int(4, 12);
      }
    }
  }
}

function buildMarkings(sink: Sink, field: TerrainField, road: RoadSpec): void {
  const dashLength = 2.6;
  const gap = 3.4;
  const width = 0.16;
  const lift = ROAD_LIFT + 0.02;

  if (road.markings === 'dash') {
    const stride = dashLength + gap;
    const count = Math.floor((road.to - road.from) / stride);
    for (let i = 0; i < count; i++) {
      const along = road.from + gap + i * stride + dashLength * 0.5;
      const x = road.axis === 'x' ? along : road.center;
      const z = road.axis === 'x' ? road.center : along;
      addPaint(sink, field, x, z, dashLength, width, road.axis, lift, 'paint_yellow', 0.75);
    }
  }

  const edgeInset = 0.55;
  const stride = 8;
  const count = Math.floor((road.to - road.from) / stride);
  for (let side = -1; side <= 1; side += 2) {
    const across = road.center + side * (road.halfWidth - edgeInset);
    for (let i = 0; i < count; i++) {
      const along = road.from + (i + 0.5) * stride;
      const x = road.axis === 'x' ? along : across;
      const z = road.axis === 'x' ? across : along;
      // Broken, sun-destroyed edge line: skip a third of the dashes.
      if (sink.rng.bool(0.34)) continue;
      addPaint(sink, field, x, z, stride * 0.82, 0.13, road.axis, lift, 'plaster_white', 0.85);
    }
  }
}

function addPaint(
  sink: Sink,
  field: TerrainField,
  x: number,
  z: number,
  length: number,
  width: number,
  axis: 'x' | 'z',
  lift: number,
  material: MaterialId,
  mottle: number,
): void {
  const w = axis === 'x' ? length : width;
  const d = axis === 'x' ? width : length;
  const geometry = planeGeometry(w, d, 1.2).clone();
  geometry.userData = {};
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(x, field.height(x, z) + lift, z);
  sink.addStatic(geometry, { material, tier: 'ground', tint: 0xd8d2c2, mottle });
}

/**
 * Stencils painted flat on the carriageway: lane arrows, SLOW, bus-stop boxes.
 *
 * These are the marks that say a road is used rather than laid, and the top-down
 * tactical view is almost nothing but road surface, so they carry that frame.
 */
function buildRoadStencils(sink: Sink, field: TerrainField, road: RoadSpec): void {
  if (road.surface === 'dirt') return;
  const length = road.to - road.from;
  const stride = 21;
  const count = Math.floor(length / stride);
  for (let i = 0; i < count; i++) {
    if (sink.rng.bool(0.28)) continue;
    const along = road.from + (i + 0.5) * stride + sink.rng.range(-2.4, 2.4);
    // Off the centreline, in the middle of a notional lane.
    const lane = road.halfWidth * sink.rng.range(0.3, 0.62) * sink.rng.sign();
    const x = road.axis === 'x' ? along : road.center + lane;
    const z = road.axis === 'x' ? road.center + lane : along;
    if (field.onPad(x, z, 0.5)) continue;
    // Stencils read along the direction of travel, so they face down the road.
    const facing = road.axis === 'x' ? (lane > 0 ? Math.PI : 0) : lane > 0 ? -Math.PI / 2 : Math.PI / 2;
    roadStencil(
      sink,
      x,
      field.height(x, z) + ROAD_LIFT + 0.03,
      z,
      facing + sink.rng.range(-0.05, 0.05),
      sink.rng.range(1.5, 2.4),
    );
  }
}

/** Drains at the kerb line and manhole covers down the centre of the lane. */
function buildRoadFurniture(sink: Sink, field: TerrainField, road: RoadSpec): void {
  if (road.surface !== 'asphalt') return;
  const stride = 17;
  const count = Math.floor((road.to - road.from) / stride);
  const grate = planeGeometry(0.72, 0.42, 1.1);
  const cover = manholeGeometry();

  for (let i = 0; i < count; i++) {
    const along = road.from + (i + 0.7) * stride;
    const side = i % 2 === 0 ? -1 : 1;
    const across = road.center + side * (road.halfWidth - 0.36);
    const gx = road.axis === 'x' ? along : across;
    const gz = road.axis === 'x' ? across : along;
    const g = grate.clone();
    g.userData = {};
    g.rotateX(-Math.PI / 2);
    if (road.axis === 'z') g.rotateZ(Math.PI / 2);
    g.translate(gx, field.height(gx, gz) + ROAD_LIFT + 0.012, gz);
    sink.addStatic(g, { material: 'metal_grate', tier: 'detail', tint: 0xb9b2a6 });

    if (i % 2 === 0) {
      const mx = road.axis === 'x' ? along + 3.4 : road.center + 1.1;
      const mz = road.axis === 'x' ? road.center + 1.1 : along + 3.4;
      sink.addProp(cover, transform(mx, field.height(mx, mz) + ROAD_LIFT + 0.02, mz), {
        material: 'metal_rusted',
        tier: 'detail',
        tint: 0xa89a86,
      });
    }
  }
}

function manholeGeometry(): THREE.BufferGeometry {
  return cachedGeometry('manhole', () => {
    const geometry = new THREE.CylinderGeometry(0.36, 0.38, 0.05, 16, 1);
    const uv = geometry.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.6, uv.getY(i) * 0.6);
    uv.needsUpdate = true;
    return geometry;
  });
}

/**
 * Dirt and gravel blended over the sand with per-vertex alpha.
 *
 * Two draw calls buy the single biggest readability win the ground has: the
 * terrain stops being one texture and starts looking like ground that people and
 * vehicles have been using.
 */
function buildBlendPatches(sink: Sink, field: TerrainField, opts: TerrainBuildOptions): void {
  const layers: Array<{
    material: MaterialId;
    count: number;
    radius: [number, number];
    tint: number;
    tile: number;
  }> = [
    // Wind-blown sand drifting over the compacted town floor, and the gravel
    // hardcore that gets tipped into the places the dirt has worn through.
    { material: 'sand_ground', count: 78, radius: [2.6, 7.5], tint: 0xefe4cc, tile: 3.4 },
    { material: 'gravel', count: 54, radius: [1.8, 4.6], tint: 0xbdb096, tile: 1.1 },
  ];

  for (const layer of layers) {
    const pieces: THREE.BufferGeometry[] = [];
    for (let i = 0; i < layer.count; i++) {
      const x = sink.rng.range(opts.minX + 6, opts.maxX - 6);
      const z = sink.rng.range(opts.minZ + 6, opts.maxZ - 6);
      const radius = sink.rng.range(layer.radius[0], layer.radius[1]);
      if (field.onPad(x, z, radius * 0.5)) continue;
      pieces.push(blobGeometry(field, x, z, radius, sink.rng.range(0, Math.PI), sink, layer.tile));
    }
    const merged = mergeGeometries(pieces, false);
    for (const piece of pieces) piece.dispose();
    if (!merged) continue;

    const material = sink.ownMaterial(`ground_blend_${layer.material}`, layer.material, (m) => {
      m.vertexColors = true;
      m.transparent = true;
      m.depthWrite = false;
      m.polygonOffset = true;
      m.polygonOffsetFactor = -3;
      m.polygonOffsetUnits = -3;
      m.color.setHex(layer.tint, THREE.SRGBColorSpace);
    });
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = `ground:blend:${layer.material}`;
    mesh.renderOrder = -1;
    sink.addOverlay(mesh);
  }
}

/** Irregular disc that fades out at the rim, following the terrain. */
function blobGeometry(
  field: TerrainField,
  cx: number,
  cz: number,
  radius: number,
  phase: number,
  sink: Sink,
  tile: number,
): THREE.BufferGeometry {
  const segments = 12;
  const uvScale = 1 / tile;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const normal = new THREE.Vector3();

  field.normal(cx, cz, normal);
  positions.push(cx, field.height(cx, cz) + 0.012, cz);
  normals.push(normal.x, normal.y, normal.z);
  uvs.push(cx * uvScale, cz * uvScale);
  colors.push(1, 1, 1, 0.92);

  for (let i = 0; i < segments; i++) {
    const a = phase + (i / segments) * Math.PI * 2;
    const r = radius * (0.62 + 0.38 * (0.5 + 0.5 * Math.sin(a * 3 + phase * 2.3)) + sink.rng.range(-0.08, 0.08));
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r * 0.82;
    field.normal(x, z, normal);
    positions.push(x, field.height(x, z) + 0.012, z);
    normals.push(normal.x, normal.y, normal.z);
    uvs.push(x * uvScale, z * uvScale);
    colors.push(1, 1, 1, 0);
  }
  for (let i = 0; i < segments; i++) {
    indices.push(0, 1 + ((i + 1) % segments), 1 + i);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * Gravel or dirt apron poured over a rectangle, used for yards and shoulders.
 *
 * Built on one shared vertex grid, so neighbouring cells cannot crack apart when
 * the terrain rolls underneath, and with a deliberately ragged outline: an apron
 * that ends on a ruled line is the strongest tell a ground plane has, whereas a
 * real yard has been drifted over at the edges and broken up by traffic. The
 * boundary vertices are drawn inward at random and a few perimeter cells are
 * dropped entirely, which leaves an outline nobody reads as a rectangle.
 */
export function buildApron(
  sink: Sink,
  field: TerrainField,
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
  material: MaterialId,
): void {
  const step = 2;
  const nx = Math.max(1, Math.round((maxX - minX) / step));
  const nz = Math.max(1, Math.round((maxZ - minZ) / step));
  const dx = (maxX - minX) / nx;
  const dz = (maxZ - minZ) / nz;
  const bite = Math.min(1.3, Math.min(dx, dz) * 0.6);

  const positions: number[] = [];
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      let x = minX + i * dx;
      let z = minZ + j * dz;
      if (i === 0) x += sink.rng.range(0, bite);
      else if (i === nx) x -= sink.rng.range(0, bite);
      if (j === 0) z += sink.rng.range(0, bite);
      else if (j === nz) z -= sink.rng.range(0, bite);
      positions.push(x, field.height(x, z) + 0.02, z);
    }
  }

  const indices: number[] = [];
  const at = (i: number, j: number): number => j * (nx + 1) + i;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const cx = minX + (i + 0.5) * dx;
      const cz = minZ + (j + 0.5) * dz;
      if (field.onRoad(cx, cz, -0.4)) continue;
      const perimeter = i === 0 || j === 0 || i === nx - 1 || j === nz - 1;
      if (perimeter && sink.rng.bool(0.22)) continue;
      indices.push(at(i, j), at(i, j + 1), at(i + 1, j + 1));
      indices.push(at(i, j), at(i + 1, j + 1), at(i + 1, j));
    }
  }
  if (indices.length === 0) return;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  sink.addStatic(geometry, {
    material,
    tier: 'ground',
    reproject: true,
    mottle: 0.5,
    chunkAt: new THREE.Vector3((minX + maxX) * 0.5, 0, (minZ + maxZ) * 0.5),
  });
}

// ---------------------------------------------------------------------------
// Horizon
// ---------------------------------------------------------------------------

export interface HorizonOptions {
  /** Half-extent of the detailed terrain; the plain welds to this square edge. */
  inner: number;
  /** How far the plain reaches. Exponential fog swallows it well before this. */
  outer: number;
  /** Radial bands between `inner` and `outer`, spaced geometrically. */
  rings: number;
  /** Samples per edge on the inner ring; must match the terrain shell's step. */
  edgeSamples: number;
}

/**
 * The desert beyond the map.
 *
 * A town that stops dead at a 144 m square with sky underneath it reads as a
 * diorama on a table, so the ground keeps going: a low-poly plain welded vertex
 * for vertex to the shell's edge, dunes ramped in over the first hundred metres,
 * and a ring of eroded ridges far enough out that fog does most of the work.
 *
 * All of it is `sand_ground` in the ground tier, so it merges into the batch the
 * terrain already owns and costs no extra draw calls, and it registers no
 * collision or navigation — nothing out here is reachable.
 */
export function buildHorizon(sink: Sink, field: TerrainField, opts: HorizonOptions): void {
  buildPlain(sink, field, opts);
  buildRidges(sink, field, opts);
}

/**
 * Ring-of-squares plain.
 *
 * Concentric squares rather than a disc so the innermost loop lands exactly on
 * the shell's boundary vertices; a circular skirt would leave a crack of sky
 * along the seam that is visible from every rooftop on the map.
 */
function buildPlain(sink: Sink, field: TerrainField, opts: HorizonOptions): void {
  const steps = opts.edgeSamples * 4;
  const growth = Math.pow(opts.outer / opts.inner, 1 / opts.rings);
  const positions: number[] = [];
  const indices: number[] = [];
  const point = new THREE.Vector2();

  for (let ring = 0; ring <= opts.rings; ring++) {
    const radius = opts.inner * Math.pow(growth, ring);
    const t = ring / opts.rings;
    for (let j = 0; j < steps; j++) {
      squarePoint(radius, j / steps, point);
      positions.push(point.x, plainHeight(field, point.x, point.y, t), point.y);
    }
  }
  for (let ring = 0; ring < opts.rings; ring++) {
    const inner = ring * steps;
    const outer = inner + steps;
    for (let j = 0; j < steps; j++) {
      const j1 = (j + 1) % steps;
      indices.push(inner + j, inner + j1, outer + j1);
      indices.push(inner + j, outer + j1, outer + j);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  sink.addStatic(geometry, {
    material: 'sand_ground',
    tier: 'ground',
    // Far coarser than the town's sand: at this range a hand-sized tile is pure
    // aliasing noise, and the detail that survives is the large-scale drift.
    tile: 14,
    reproject: true,
    tint: 0xf3ecdd,
    mottle: 0.3,
  });
}

/** Point at parameter `t` around the square of half-extent `radius`. */
function squarePoint(radius: number, t: number, out: THREE.Vector2): THREE.Vector2 {
  const u = t * 4;
  const edge = Math.min(3, Math.floor(u));
  const span = radius * (2 * (u - edge) - 1);
  switch (edge) {
    case 0:
      return out.set(span, -radius);
    case 1:
      return out.set(radius, span);
    case 2:
      return out.set(-span, radius);
    default:
      return out.set(-radius, -span);
  }
}

/**
 * Height of the outer plain, blended from the real field into distant dunes.
 *
 * The blend weight is zero on the inner ring so the weld is exact, and the whole
 * plain is biased downward with distance so its far rim always sits below the
 * nearest dune brow instead of drawing a hard line across the sky.
 */
function plainHeight(field: TerrainField, x: number, z: number, t: number): number {
  const near = field.height(x, z);
  const dune =
    perlin2(x * 0.0042 + 37.1, z * 0.0042 - 18.6) * 7 +
    perlin2(x * 0.0135 - 6.4, z * 0.0135 + 9.2) * 2.1;
  const w = smoothstep(0, 0.32, t);
  return near * (1 - w) + (dune - t * t * 11) * w;
}

/** Normalised distance out into the plain, matching `buildPlain`'s ring spacing. */
function plainT(opts: HorizonOptions, x: number, z: number): number {
  const radius = Math.max(Math.abs(x), Math.abs(z), opts.inner);
  return clamp(Math.log(radius / opts.inner) / Math.log(opts.outer / opts.inner), 0, 1);
}

interface RidgeSpec {
  /** Compass bearing in degrees: 0 is north (-Z), 90 is east (+X). */
  bearing: number;
  distance: number;
  halfWidth: number;
  halfDepth: number;
  height: number;
}

/**
 * The skyline, composed against the sun rather than scattered at random.
 *
 * The sun sits low in the west-south-west, so the largest mass goes there to be
 * back-lit into a flat silhouette, the east-north-east ridge is fully lit and
 * shows its form, and the south stays low to keep open sky behind the player
 * spawn. The foothills are close enough that parapets and rooftops cut across
 * them, which is what actually sells the distance.
 */
const RIDGES: readonly RidgeSpec[] = [
  { bearing: 250, distance: 235, halfWidth: 100, halfDepth: 68, height: 46 },
  { bearing: 287, distance: 330, halfWidth: 130, halfDepth: 84, height: 32 },
  { bearing: 214, distance: 300, halfWidth: 140, halfDepth: 88, height: 27 },
  { bearing: 172, distance: 270, halfWidth: 118, halfDepth: 76, height: 19 },
  { bearing: 126, distance: 340, halfWidth: 160, halfDepth: 98, height: 34 },
  { bearing: 64, distance: 250, halfWidth: 112, halfDepth: 74, height: 38 },
  { bearing: 24, distance: 305, halfWidth: 150, halfDepth: 92, height: 30 },
  { bearing: 340, distance: 268, halfWidth: 122, halfDepth: 78, height: 24 },
  { bearing: 357, distance: 395, halfWidth: 200, halfDepth: 112, height: 43 },
  { bearing: 236, distance: 162, halfWidth: 50, halfDepth: 32, height: 9 },
  { bearing: 196, distance: 168, halfWidth: 54, halfDepth: 34, height: 7.5 },
  { bearing: 100, distance: 158, halfWidth: 48, halfDepth: 30, height: 8.5 },
  { bearing: 42, distance: 172, halfWidth: 56, halfDepth: 36, height: 10 },
  { bearing: 8, distance: 165, halfWidth: 52, halfDepth: 33, height: 8 },
  { bearing: 306, distance: 170, halfWidth: 54, halfDepth: 34, height: 7 },
];

/** Radius and height fractions from the foot of a ridge to its crown. */
const RIDGE_PROFILE: readonly (readonly [number, number])[] = [
  [1, 0],
  [0.8, 0.3],
  [0.58, 0.62],
  [0.34, 0.86],
  [0.15, 0.98],
];

/** Worst case of the angular radius wobble, used to keep ridges off the map. */
const MAX_WOBBLE = 1.41;

const HAZE = new THREE.Color(0xb6c2ce);
const ROCK = new THREE.Color(0xdcd0b6);

function buildRidges(sink: Sink, field: TerrainField, opts: HorizonOptions): void {
  const tint = new THREE.Color();

  for (let i = 0; i < RIDGES.length; i++) {
    const spec = RIDGES[i];
    const bearing = THREE.MathUtils.degToRad(spec.bearing);
    const cx = Math.sin(bearing) * spec.distance;
    const cz = -Math.cos(bearing) * spec.distance;

    // Guard rather than trust the table: a ridge that reaches back over the
    // terrain edge would intersect the shell in a hard line and punch through
    // the backdrop buildings.
    const reach = Math.max(spec.halfWidth, spec.halfDepth) * MAX_WOBBLE;
    const fit = Math.min(1, (spec.distance - opts.inner - 14) / Math.max(reach, 1e-3));
    if (fit <= 0) continue;

    tint.copy(ROCK).lerp(HAZE, clamp((spec.distance - 130) / 420, 0, 0.35));
    sink.addStatic(
      ridgeGeometry(
        field,
        opts,
        cx,
        cz,
        spec.halfWidth * fit,
        spec.halfDepth * fit,
        spec.height,
        i * 1.7 + 0.4,
      ),
      {
        material: 'sand_ground',
        tier: 'ground',
        tile: 16,
        reproject: true,
        tint: tint.getHex(),
        mottle: 0.34,
      },
    );
  }
}

/**
 * One eroded hill: stacked rings of a noisy radial profile, draped on the plain.
 *
 * The wobble is a sum of harmonics of the polar angle rather than sampled noise
 * so it closes on itself exactly — a seam down the side of a distant butte is
 * one of the few things at this range the fog will not hide.
 */
function ridgeGeometry(
  field: TerrainField,
  opts: HorizonOptions,
  cx: number,
  cz: number,
  halfWidth: number,
  halfDepth: number,
  height: number,
  phase: number,
): THREE.BufferGeometry {
  const segments = 22;
  const buried = height * 0.22;
  const positions: number[] = [];
  const indices: number[] = [];

  for (const [radiusScale, heightScale] of RIDGE_PROFILE) {
    for (let s = 0; s < segments; s++) {
      const a = (s / segments) * Math.PI * 2;
      const wobble =
        1 +
        0.22 * Math.sin(a * 3 + phase) +
        0.12 * Math.sin(a * 5 - phase * 1.7) +
        0.07 * Math.sin(a * 8 + phase * 2.3);
      const lift = 1 + 0.17 * Math.sin(a * 2 + phase * 0.6) - 0.1 * Math.sin(a * 3 - phase * 1.3);
      const x = cx + Math.cos(a) * halfWidth * radiusScale * wobble;
      const z = cz + Math.sin(a) * halfDepth * radiusScale * wobble;
      const ground = plainHeight(field, x, z, plainT(opts, x, z));
      positions.push(x, ground - buried + height * heightScale * lift, z);
    }
  }

  const apex = positions.length / 3;
  positions.push(cx, plainHeight(field, cx, cz, plainT(opts, cx, cz)) - buried + height, cz);

  for (let ring = 0; ring < RIDGE_PROFILE.length - 1; ring++) {
    const lower = ring * segments;
    const upper = lower + segments;
    for (let s = 0; s < segments; s++) {
      const s1 = (s + 1) % segments;
      indices.push(lower + s, upper + s, upper + s1);
      indices.push(lower + s, upper + s1, lower + s1);
    }
  }
  const crown = (RIDGE_PROFILE.length - 1) * segments;
  for (let s = 0; s < segments; s++) {
    indices.push(crown + s, apex, crown + ((s + 1) % segments));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Flat concrete pad (yards, forecourts, plazas) with a bevelled edge. */
export function buildConcretePad(
  sink: Sink,
  field: TerrainField,
  centerX: number,
  centerZ: number,
  width: number,
  depth: number,
  material: MaterialId = 'concrete_floor',
): void {
  const y = field.height(centerX, centerZ);
  const thickness = 0.24;
  sink.addStatic(
    slab(centerX, y - thickness * 0.5 + 0.05, centerZ, width, thickness, depth, 0.05, 2.4),
    { material, tier: 'ground', mottle: 0.4 },
  );
  sink.addWalkable({
    minX: centerX - width / 2,
    minZ: centerZ - depth / 2,
    maxX: centerX + width / 2,
    maxZ: centerZ + depth / 2,
    height: y + 0.05,
  });
}
