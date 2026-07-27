import * as THREE from 'three';
import type { MaterialId } from '../../core/Contracts';
import { saggingCloth } from './Props';
import {
  type Sink,
  boxGeometry,
  cachedGeometry,
  catenaryGeometry,
  cloneGeometry,
  cylinderGeometry,
  latheGeometry,
  mergeParts,
  placed,
  planeGeometry,
  ribbonGeometry,
  snap,
  transform,
} from './Kit';

/**
 * The decoration layer.
 *
 * Nothing in here changes the shape of the map; all of it changes whether the
 * map looks lived in. The pattern is always the same: something interrupts a
 * long flat run (a downpipe, a conduit, a dust drift), something breaks the
 * silhouette of an edge (an AC unit, a satellite dish), and something records
 * history on a surface (bullet scars, an exposed brick patch, a tag).
 *
 * Everything here is filed as tier `detail`, so it culls earlier than structure
 * and never casts a shadow.
 */

// ---------------------------------------------------------------------------
// Roof and wall furniture
// ---------------------------------------------------------------------------

function acUnitGeometry(wall: boolean): THREE.BufferGeometry {
  return cachedGeometry(`ac|${wall ? 'wall' : 'roof'}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    if (wall) {
      parts.push(placed(boxGeometry(0.86, 0.58, 0.34, 0.03, 1.1), transform(0, 0, 0)));
      parts.push(placed(boxGeometry(0.78, 0.06, 0.06, 0.012, 0.6), transform(0, -0.32, 0.14)));
      for (const s of [-1, 1]) {
        // Wall brackets, angled back to the masonry.
        parts.push(
          placed(boxGeometry(0.05, 0.4, 0.05, 0.01, 0.6), transform(s * 0.36, -0.02, -0.2, 0, 0.5)),
        );
      }
      parts.push(
        placed(cylinderGeometry(0.03, 0.03, 0.5, 6, 0.8), transform(0.3, -0.5, -0.05, 0, 0, 0.1)),
      );
    } else {
      parts.push(placed(boxGeometry(1.05, 0.78, 0.82, 0.045, 1.4), transform(0, 0, 0)));
      parts.push(placed(boxGeometry(1.12, 0.07, 0.88, 0.02, 1.4), transform(0, 0.42, 0)));
      parts.push(
        placed(cylinderGeometry(0.3, 0.3, 0.05, 12, 0.9), transform(0, 0.46, 0, 0, 0, 0)),
      );
      for (const [dx, dz] of [
        [-0.42, -0.32],
        [0.42, -0.32],
        [-0.42, 0.32],
        [0.42, 0.32],
      ] as const) {
        parts.push(placed(boxGeometry(0.12, 0.14, 0.12, 0.02, 0.6), transform(dx, -0.45, dz)));
      }
    }
    return mergeParts(parts);
  });
}

/** Split-unit condenser bolted to a facade at `y`, facing `yaw`. */
export function wallAc(sink: Sink, x: number, y: number, z: number, yaw: number): void {
  sink.addProp(acUnitGeometry(true), transform(x, y, z, yaw), {
    material: 'metal_panel',
    tier: 'detail',
    tint: sink.rng.bool(0.65) ? 0xd9d6ce : 0xb8b2a4,
  });
}

/** Rooftop condenser on anti-vibration feet. */
export function roofAc(sink: Sink, x: number, y: number, z: number, yaw: number): void {
  sink.addProp(acUnitGeometry(false), transform(x, y + 0.55, z, yaw), {
    material: 'metal_panel',
    tier: 'structure',
    tint: 0xc9c4b6,
  });
  sink.addCollider(
    new THREE.Vector3(x, y + 0.5, z),
    new THREE.Vector3(0.55, 0.5, 0.45),
    yaw,
    { surface: 'metal' },
  );
}

/** Rooftop water tank: the single most recognisable roof silhouette in the region. */
export function waterTank(sink: Sink, x: number, y: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('watertank', () => {
    const parts: THREE.BufferGeometry[] = [];
    const drum = latheGeometry(
      'tankdrum',
      [
        [0, 0],
        [0.62, 0.03],
        [0.68, 0.14],
        [0.68, 1.12],
        [0.62, 1.24],
        [0.24, 1.28],
        [0.22, 1.36],
        [0, 1.36],
      ],
      18,
      1.6,
    );
    parts.push(placed(drum, transform(0, 0.62, 0)));
    for (const h of [0.95, 1.35]) {
      parts.push(placed(cylinderGeometry(0.7, 0.7, 0.05, 18, 1.2), transform(0, h, 0)));
    }
    // Angle-iron stand.
    for (const [dx, dz] of [
      [-0.48, -0.48],
      [0.48, -0.48],
      [-0.48, 0.48],
      [0.48, 0.48],
    ] as const) {
      parts.push(placed(boxGeometry(0.07, 0.62, 0.07, 0.012, 0.8), transform(dx, 0.31, dz)));
    }
    for (const s of [-1, 1]) {
      parts.push(placed(boxGeometry(1.03, 0.06, 0.06, 0.012, 0.8), transform(0, 0.5, s * 0.48)));
      parts.push(placed(boxGeometry(0.06, 0.06, 1.03, 0.012, 0.8), transform(s * 0.48, 0.5, 0)));
    }
    parts.push(
      placed(cylinderGeometry(0.035, 0.035, 0.9, 6, 0.8), transform(0.5, 0.2, 0.2, 0, 0, 0.35)),
    );
    return mergeParts(parts);
  });

  sink.addProp(geometry, transform(x, y, z, yaw), {
    material: 'metal_panel',
    tier: 'structure',
    tint: 0xb9b3a6,
  });
  sink.addCollider(
    new THREE.Vector3(x, y + 1.24, z),
    new THREE.Vector3(0.68, 0.62, 0.68),
    yaw,
    { surface: 'metal' },
  );
  sink.addCollider(
    new THREE.Vector3(x, y + 0.3, z),
    new THREE.Vector3(0.55, 0.3, 0.55),
    yaw,
    { surface: 'metal', noCover: true },
  );
}

export function satelliteDish(sink: Sink, x: number, y: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('satdish', () => {
    const parts: THREE.BufferGeometry[] = [];
    const dish = latheGeometry(
      'dish',
      [
        [0, 0],
        [0.16, 0.012],
        [0.32, 0.05],
        [0.48, 0.115],
        [0.6, 0.19],
        [0.62, 0.2],
      ],
      16,
      1.2,
    );
    parts.push(placed(dish, transform(0, 0.62, 0, 0, -1.05)));
    parts.push(placed(cylinderGeometry(0.028, 0.028, 0.42, 6, 0.6), transform(0, 0.5, 0.2, 0, 0.8)));
    parts.push(placed(boxGeometry(0.09, 0.09, 0.09, 0.015, 0.5), transform(0, 0.44, 0.36)));
    parts.push(placed(cylinderGeometry(0.045, 0.05, 0.62, 6, 0.8), transform(0, 0.31, 0)));
    parts.push(placed(boxGeometry(0.24, 0.05, 0.24, 0.012, 0.6), transform(0, 0.03, 0)));
    return mergeParts(parts);
  });
  sink.addProp(geometry, transform(x, y, z, yaw), {
    material: 'metal_panel',
    tier: 'detail',
    tint: 0xe2ded2,
  });
}

/** Guyed antenna mast; the wires are what make it read as a mast, not a stick. */
export function antennaMast(sink: Sink, x: number, y: number, z: number, height: number): void {
  const geometry = cachedGeometry(`mast|${height.toFixed(1)}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    parts.push(placed(cylinderGeometry(0.03, 0.055, height, 6, 1.4), transform(0, height / 2, 0)));
    parts.push(placed(boxGeometry(0.26, 0.05, 0.26, 0.012, 0.6), transform(0, 0.03, 0)));
    for (let i = 0; i < 3; i++) {
      const h = height * (0.45 + i * 0.18);
      parts.push(placed(boxGeometry(0.5, 0.022, 0.022, 0.006, 0.5), transform(0, h, 0)));
    }
    parts.push(placed(cylinderGeometry(0.012, 0.012, 0.5, 4, 0.5), transform(0, height + 0.25, 0)));
    return mergeParts(parts);
  });
  sink.addProp(geometry, transform(x, y, z, 0), {
    material: 'metal_rusted',
    tier: 'detail',
    tint: 0xa9a49a,
  });

  const top = new THREE.Vector3(x, y + height * 0.82, z);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const anchor = new THREE.Vector3(x + Math.cos(a) * 1.8, y + 0.05, z + Math.sin(a) * 1.8);
    sink.addStatic(catenaryGeometry(top, anchor, 0.12, 0.012, 5), {
      material: 'metal_rusted',
      tier: 'detail',
      tint: 0x6d6862,
    });
  }
}

/**
 * Hanging sheet, sized from a fixed set.
 *
 * The sizes are quantised on purpose: every sheet on the map is one of three
 * buffers, so all of them instance together instead of costing a draw call each.
 * Variety comes from the per-instance yaw and tint, which is free.
 */
const CLOTH_SIZES: ReadonlyArray<readonly [number, number]> = [
  [0.54, 0.62],
  [0.68, 0.86],
  [0.82, 1.05],
];

function sheetGeometry(variant: number): THREE.BufferGeometry {
  const [width, drop] = CLOTH_SIZES[variant];
  return cachedGeometry(`sheet|${variant}`, () => {
    const cloth = saggingCloth(width, drop, 0.06);
    cloth.rotateX(Math.PI / 2);
    // Pivot at the line, so the sheet hangs below the placement point.
    cloth.translate(0, -drop / 2, 0);
    return cloth;
  });
}

/** Washing line: rope catenary plus a few sheets that catch the wind shader. */
export function laundryLine(sink: Sink, from: THREE.Vector3, to: THREE.Vector3): void {
  const sag = from.distanceTo(to) * 0.055;
  sink.addStatic(catenaryGeometry(from, to, sag, 0.014, 8), {
    material: 'metal_rusted',
    tier: 'detail',
    tint: 0x8a8378,
  });

  const count = Math.max(2, Math.round(from.distanceTo(to) / 1.4));
  const yaw = Math.atan2(-(to.z - from.z), to.x - from.x);
  const tints = [0xe2dccb, 0xcfc6b2, 0xd8dee2, 0xc9b9a6];

  for (let i = 0; i < count; i++) {
    const t = (i + 0.7) / (count + 0.4);
    const point = from.clone().lerp(to, t);
    point.y -= sag * Math.sin(Math.PI * t);
    const variant = sink.rng.int(0, CLOTH_SIZES.length - 1);
    sink.addProp(
      sheetGeometry(variant),
      transform(point.x, point.y, point.z, yaw + sink.rng.range(-0.14, 0.14)),
      {
        material: 'fabric_canvas',
        tier: 'detail',
        wind: true,
        castShadow: false,
        tint: sink.rng.pick(tints),
        global: true,
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Services running up walls
// ---------------------------------------------------------------------------

/** Downpipe with brackets and a kicked-out elbow at the bottom. */
export function wallPipe(
  sink: Sink,
  x: number,
  z: number,
  yaw: number,
  base: number,
  top: number,
  radius = 0.055,
): void {
  const height = top - base;
  if (height < 0.6) return;
  const key = `pipe|${height.toFixed(2)}|${radius.toFixed(3)}`;
  const geometry = cachedGeometry(key, () => {
    const parts: THREE.BufferGeometry[] = [];
    parts.push(placed(cylinderGeometry(radius, radius, height, 7, 1.4), transform(0, height / 2, 0)));
    const brackets = Math.max(2, Math.floor(height / 1.6));
    for (let i = 0; i < brackets; i++) {
      const h = 0.35 + (i * (height - 0.7)) / Math.max(1, brackets - 1);
      parts.push(
        placed(boxGeometry(radius * 2.6, 0.05, 0.14, 0.01, 0.5), transform(0, h, -0.06)),
      );
    }
    parts.push(
      placed(
        cylinderGeometry(radius, radius, 0.36, 7, 1.0),
        transform(0, 0.12, 0.16, 0, 0, Math.PI / 2.6),
      ),
    );
    return mergeParts(parts);
  });
  sink.addProp(geometry, transform(x, base, z, yaw), {
    material: 'metal_rusted',
    tier: 'detail',
    tint: 0x9c8f7e,
  });
}

/** Surface-mounted conduit with junction boxes; runs horizontally along a wall. */
export function conduitRun(
  sink: Sink,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  y: number,
  yaw: number,
): void {
  const length = Math.hypot(x1 - x0, z1 - z0);
  if (length < 0.5) return;
  const key = `conduit|${length.toFixed(2)}`;
  const geometry = cachedGeometry(key, () => {
    const parts: THREE.BufferGeometry[] = [];
    parts.push(
      placed(cylinderGeometry(0.026, 0.026, length, 6, 1.2), transform(0, 0, 0, 0, 0, Math.PI / 2)),
    );
    const boxes = Math.max(1, Math.floor(length / 3));
    for (let i = 0; i < boxes; i++) {
      const t = (i + 0.5) / boxes - 0.5;
      parts.push(placed(boxGeometry(0.14, 0.18, 0.08, 0.012, 0.5), transform(t * length, 0, 0.02)));
    }
    return mergeParts(parts);
  });
  sink.addProp(geometry, transform((x0 + x1) / 2, y, (z0 + z1) / 2, yaw), {
    material: 'metal_panel',
    tier: 'detail',
    tint: 0x8e8a80,
  });
}

// ---------------------------------------------------------------------------
// Surface history: scars, patches, tags, stains
// ---------------------------------------------------------------------------

/**
 * Exposed masonry where the render has come off. Two layers — a dark rebate and
 * the brick inside it — so the patch reads as depth rather than a sticker.
 */
export function plasterPatch(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  width: number,
  height: number,
): void {
  sink.addStatic(
    placed(planeGeometry(width, height, 1.6), transform(x, y, z, yaw)),
    { material: 'brick_red', tier: 'detail', tint: 0xbfa896, mottle: 0.4 },
  );
  sink.addStatic(
    placed(planeGeometry(width + 0.12, height + 0.12, 1.6), transform(x, y, z, yaw)),
    { material: 'concrete_damaged', tier: 'detail', tint: 0x9d968a },
  );
}

/** Cluster of impact craters. Reads as a firefight happened here. */
export function bulletScars(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  spread: number,
  count: number,
): void {
  const dirX = Math.cos(yaw);
  const dirZ = -Math.sin(yaw);
  const quad = planeGeometry(0.16, 0.16, 0.5);
  for (let i = 0; i < count; i++) {
    const u = sink.rng.range(-spread, spread);
    const v = sink.rng.gaussian(0, spread * 0.42);
    const scale = sink.rng.range(0.55, 1.7);
    sink.addProp(
      quad,
      transform(x + dirX * u, y + v, z + dirZ * u, yaw, 0, sink.rng.range(0, Math.PI), scale),
      { material: 'concrete_damaged', tier: 'detail', tint: 0x6f675c },
    );
  }
}

/**
 * Spray tag built from strokes rather than one rectangle: a solid painted block
 * on a wall reads as a billboard, a few overlapping strokes read as paint.
 */
export function graffiti(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  width: number,
  material: MaterialId = 'paint_red',
): void {
  const dirX = Math.cos(yaw);
  const dirZ = -Math.sin(yaw);
  const strokes = sink.rng.int(4, 6);
  for (let i = 0; i < strokes; i++) {
    const u = (i / strokes - 0.5) * width + sink.rng.range(-0.06, 0.06);
    const length = sink.rng.range(0.35, 0.72);
    const roll = sink.rng.range(-1.3, 1.3);
    sink.addStatic(
      placed(
        planeGeometry(0.075, length, 0.8),
        transform(x + dirX * u, y + sink.rng.range(-0.1, 0.1), z + dirZ * u, yaw, 0, roll),
      ),
      { material, tier: 'detail', tint: sink.rng.bool() ? 0xffffff : 0xd8d2c6 },
    );
  }
}

/** Flat stain on the ground: oil under a vehicle, a scorch under a burnt one. */
export function groundStain(
  sink: Sink,
  x: number,
  z: number,
  radius: number,
  tint: number,
  material: MaterialId = 'asphalt_worn',
): void {
  const geometry = planeGeometry(radius * 2, radius * 2, radius * 1.4);
  const matrix = transform(x, sink.ground(x, z) + 0.012, z, sink.rng.range(0, Math.PI), -Math.PI / 2);
  sink.addProp(geometry, matrix, { material, tier: 'detail', tint });
}

// ---------------------------------------------------------------------------
// Loose matter
// ---------------------------------------------------------------------------

function debrisGeometry(index: number): THREE.BufferGeometry {
  return cachedGeometry(`debris|${index}`, () => {
    switch (index % 4) {
      case 0:
        return boxGeometry(0.23, 0.11, 0.115, 0.02, 0.5).clone();
      case 1:
        return boxGeometry(0.34, 0.06, 0.19, 0.015, 0.5).clone();
      case 2: {
        const geometry = new THREE.IcosahedronGeometry(0.15, 0);
        geometry.scale(1, 0.62, 0.85);
        return geometry;
      }
      default:
        return boxGeometry(0.42, 0.045, 0.05, 0.01, 0.5).clone();
    }
  });
}

const DEBRIS_MATERIAL: MaterialId[] = [
  'concrete_damaged',
  'brick_red',
  'concrete_wall',
  'wood_plank',
];

/**
 * Scatter of chunks, bricks and splinters over a rectangle.
 *
 * Every piece is instanced and none of them cast shadows: at this size a shadow
 * costs more than it reads, and the ambient occlusion in the material already
 * grounds them.
 */
export function debrisField(
  sink: Sink,
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
  count: number,
): void {
  const scaled = Math.max(1, Math.round(count * (0.55 + 0.45 * sink.config.vegetationDensity)));
  for (let i = 0; i < scaled; i++) {
    const x = sink.rng.range(minX, maxX);
    const z = sink.rng.range(minZ, maxZ);
    const variant = sink.rng.int(0, 3);
    const scale = sink.rng.range(0.6, 1.5);
    sink.addProp(
      debrisGeometry(variant),
      transform(
        x,
        sink.ground(x, z) + 0.03 * scale,
        z,
        sink.rng.range(0, Math.PI * 2),
        sink.rng.range(-0.2, 0.2),
        sink.rng.range(-0.2, 0.2),
        scale,
      ),
      {
        material: DEBRIS_MATERIAL[variant],
        tier: 'detail',
        tint: sink.rng.bool(0.4) ? 0xbdb4a4 : 0xd6cec0,
        castShadow: false,
      },
    );
  }
}

/** Paper, cans and rag litter. Smaller and brighter than debris, so it catches the eye. */
export function litterField(
  sink: Sink,
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
  count: number,
): void {
  const paper = cachedGeometry('litter|paper', () => planeGeometry(0.2, 0.26, 0.4).clone());
  const can = cachedGeometry('litter|can', () =>
    cylinderGeometry(0.033, 0.033, 0.11, 7, 0.4).clone(),
  );
  for (let i = 0; i < count; i++) {
    const x = sink.rng.range(minX, maxX);
    const z = sink.rng.range(minZ, maxZ);
    const y = sink.ground(x, z);
    if (sink.rng.bool(0.55)) {
      sink.addProp(
        paper,
        transform(x, y + 0.014, z, sink.rng.range(0, Math.PI * 2), -Math.PI / 2, 0, sink.rng.range(0.7, 1.3)),
        { material: 'plaster_white', tier: 'detail', tint: 0xe8e2d2, castShadow: false },
      );
    } else {
      sink.addProp(
        can,
        transform(x, y + 0.034, z, sink.rng.range(0, Math.PI * 2), Math.PI / 2, 0),
        { material: 'metal_panel', tier: 'detail', tint: 0xb9bdb4, castShadow: false },
      );
    }
  }
}

/**
 * Wind-blown sand banked against a wall.
 *
 * The join between a vertical surface and the ground is the most fragile part of
 * any exterior: a hard 90-degree seam looks like two objects intersecting, a
 * drift makes them look like one place.
 */
export function dustDrift(
  sink: Sink,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  side: number,
  depth = 0.55,
  height = 0.16,
): void {
  const length = Math.hypot(x1 - x0, z1 - z0);
  if (length < 1) return;
  const dirX = (x1 - x0) / length;
  const dirZ = (z1 - z0) / length;
  const perpX = -dirZ * side;
  const perpZ = dirX * side;
  const segments = Math.max(2, Math.round(length / 2.4));

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const wobble = 0.62 + 0.38 * Math.sin(t * 7.3 + x0 * 0.4);
    const px = x0 + dirX * length * t;
    const pz = z0 + dirZ * length * t;
    const y = sink.ground(px, pz);
    positions.push(px, y + height * wobble, pz);
    uvs.push(t * length, 0);
    const ox = px + perpX * depth * wobble;
    const oz = pz + perpZ * depth * wobble;
    positions.push(ox, sink.ground(ox, oz) + 0.015, oz);
    uvs.push(t * length, depth);
    if (i > 0) {
      const b = (i - 1) * 2;
      if (side > 0) indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      else indices.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  sink.addStatic(geometry, {
    material: 'sand_ground',
    tier: 'detail',
    tint: 0xefe6d2,
    mottle: 0.35,
  });
}

// ---------------------------------------------------------------------------
// Cloth
// ---------------------------------------------------------------------------

/**
 * Shop awning on two struts. Registered as a destructible so an explosion tears
 * it; the frame stays, which is exactly what a torn awning looks like.
 */
export function awning(
  sink: Sink,
  x: number,
  z: number,
  yaw: number,
  y: number,
  rawWidth: number,
  rawDepth: number,
  tint = 0xc8552f,
): void {
  const width = snap(rawWidth);
  const depth = snap(rawDepth);
  const dirX = Math.cos(yaw);
  const dirZ = -Math.sin(yaw);
  const perpX = -Math.sin(yaw);
  const perpZ = -Math.cos(yaw);

  const frame = cachedGeometry(`awning|frame|${width.toFixed(2)}|${depth.toFixed(2)}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    parts.push(placed(boxGeometry(width, 0.06, 0.06, 0.012, 0.8), transform(0, 0, depth)));
    for (const s of [-1, 1]) {
      parts.push(
        placed(
          boxGeometry(0.05, 0.05, depth, 0.01, 0.8),
          transform(s * (width / 2 - 0.05), -0.09, depth / 2, 0, -0.18),
        ),
      );
    }
    return mergeParts(parts);
  });

  sink.addProp(frame, transform(x, y, z, yaw), {
    material: 'metal_rusted',
    tier: 'detail',
    tint: 0x8c8377,
  });

  const canopy = cachedGeometry(`awning|cloth|${width.toFixed(2)}|${depth.toFixed(2)}`, () => {
    const cloth = saggingCloth(width, depth, 0.14);
    cloth.rotateX(-Math.PI / 2 - 0.16);
    return cloth;
  });
  const clothRef = sink.addInstancedProp(
    canopy,
    transform(x + perpX * depth * 0.5, y + 0.04, z + perpZ * depth * 0.5, yaw),
    { material: 'fabric_canvas', tier: 'detail', wind: true, castShadow: false, tint },
  );

  // Valance strip along the outer edge, which is what actually flaps.
  const valance = cachedGeometry(`awning|valance|${width.toFixed(2)}`, () => {
    const strip = cloneGeometry(ribbonGeometry(width, 0.26, 0.26, 3, 0.02, 0, 1.1));
    strip.rotateY(Math.PI / 2);
    strip.rotateX(-Math.PI / 2);
    return strip;
  });
  const valanceRef = sink.addInstancedProp(
    valance,
    transform(
      x + perpX * depth - dirX * width * 0.5,
      y - 0.16,
      z + perpZ * depth - dirZ * width * 0.5,
      yaw,
    ),
    { material: 'fabric_canvas', tier: 'detail', wind: true, castShadow: false, tint },
  );

  const centre = new THREE.Vector3(x + perpX * depth * 0.5, y, z + perpZ * depth * 0.5);
  sink.addDestructible({
    kind: 'awning',
    position: centre,
    radius: Math.max(width, depth) * 0.6,
    health: 30,
    surface: 'fabric',
    instances: [clothRef, valanceRef],
  });
}

/** Tarp lashed over scaffolding or a window opening. */
export function hangingTarp(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  rawWidth: number,
  rawDrop: number,
  material: MaterialId = 'camo_net',
): void {
  const width = snap(rawWidth);
  const drop = snap(rawDrop);
  const geometry = cachedGeometry(`tarp|${width.toFixed(2)}|${drop.toFixed(2)}`, () => {
    const cloth = saggingCloth(width, drop, 0.1);
    cloth.rotateX(Math.PI / 2);
    return cloth;
  });
  const ref = sink.addInstancedProp(geometry, transform(x, y - drop / 2, z, yaw), {
    material,
    tier: 'detail',
    wind: true,
    castShadow: false,
    tint: material === 'camo_net' ? 0x8d8b6f : 0xc9c0aa,
  });
  sink.addDestructible({
    kind: 'awning',
    position: new THREE.Vector3(x, y - drop / 2, z),
    radius: Math.max(width, drop) * 0.6,
    health: 24,
    surface: 'fabric',
    instance: ref,
  });
}

/** Rope-and-rag banner strung across a street; sells the market district. */
export function buntingLine(sink: Sink, from: THREE.Vector3, to: THREE.Vector3): void {
  const sag = from.distanceTo(to) * 0.06;
  sink.addStatic(catenaryGeometry(from, to, sag, 0.012, 8), {
    material: 'metal_rusted',
    tier: 'detail',
    tint: 0x7f786c,
  });
  const count = Math.max(4, Math.round(from.distanceTo(to) / 1.1));
  const yaw = Math.atan2(-(to.z - from.z), to.x - from.x);
  const tints = [0xc8552f, 0x2f6f8c, 0xd8c85a, 0xb8b2a4];

  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const point = from.clone().lerp(to, t);
    point.y -= sag * Math.sin(Math.PI * t);
    sink.addProp(flagGeometry(i % 2), transform(point.x, point.y, point.z, yaw), {
      material: 'fabric_canvas',
      tier: 'detail',
      wind: true,
      castShadow: false,
      global: true,
      tint: tints[i % tints.length],
    });
  }
}

/** Pennant hanging from a bunting rope; two sizes, so they all instance. */
function flagGeometry(variant: number): THREE.BufferGeometry {
  return cachedGeometry(`flag|${variant}`, () => {
    const flag = cloneGeometry(
      ribbonGeometry(variant === 0 ? 0.32 : 0.42, 0.22, 0.1, 2, 0.06, 0.3, 0.7),
    );
    flag.rotateZ(-Math.PI / 2);
    return flag;
  });
}
