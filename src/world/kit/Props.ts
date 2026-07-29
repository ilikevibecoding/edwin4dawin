import * as THREE from 'three';
import type { MaterialId } from '../../core/Contracts';
import { TAU } from '../../core/MathUtils';
import { mergeGeometries } from '../../procgen';
import {
  type InstanceRef,
  type Sink,
  bagGeometry,
  boxGeometry,
  cachedGeometry,
  catenaryGeometry,
  cylinderGeometry,
  latheGeometry,
  makeDoubleSided,
  placed,
  planeGeometry,
  roundedGeometry,
  snap,
  transform,
} from './Kit';

/**
 * Procedural prop library.
 *
 * Every prop is built from bevelled boxes, lathes and extrusions, cached by
 * shape so that repeated copies share one buffer and end up in an
 * `InstancedMesh`. Anything the player can hide behind also emits a collider, so
 * cover generation and navigation see exactly what the eye sees.
 */

// ---------------------------------------------------------------------------
// Shipping containers
// ---------------------------------------------------------------------------

export interface ContainerOptions {
  /** 6.06 m (twenty foot) or 12.19 m (forty foot). */
  long?: boolean;
  tint?: number;
  /** Stack height index; 0 sits on the ground. */
  level?: number;
  /** Register the roof as a walkable surface. */
  walkable?: boolean;
  doorsOpen?: boolean;
}

const CONTAINER_HEIGHT = 2.59;
const CONTAINER_WIDTH = 2.44;

export function shippingContainer(
  sink: Sink,
  x: number,
  z: number,
  yaw: number,
  opts: ContainerOptions = {},
): void {
  const length = opts.long ? 12.19 : 6.06;
  const base = sink.ground(x, z) + (opts.level ?? 0) * (CONTAINER_HEIGHT + 0.04);
  const y = base + CONTAINER_HEIGHT / 2;
  const tint = opts.tint ?? 0xb8bdb4;

  const body = cachedGeometry(`container|body|${length}`, () =>
    boxGeometry(length - 0.24, CONTAINER_HEIGHT - 0.2, CONTAINER_WIDTH - 0.16, 0.05, 2.4).clone(),
  );
  sink.addProp(body, transform(x, y, z, yaw), {
    material: 'metal_corrugated',
    tier: 'structure',
    tint,
    lod: containerLod(length),
  });

  const frame = cachedGeometry(`container|frame|${length}`, () =>
    containerFrameGeometry(length),
  );
  sink.addProp(frame, transform(x, y, z, yaw), {
    material: 'metal_rusted',
    tier: 'structure',
    tint: 0x9c8f7e,
  });

  const doors = cachedGeometry(`container|doors|${length}`, () =>
    containerDoorGeometry(length),
  );
  sink.addProp(doors, transform(x, y, z, yaw), {
    material: 'metal_panel',
    tier: 'detail',
    tint: 0x8d8478,
  });

  sink.addCollider(
    new THREE.Vector3(x, y, z),
    new THREE.Vector3(length / 2, CONTAINER_HEIGHT / 2, CONTAINER_WIDTH / 2),
    yaw,
    { surface: 'metal' },
  );

  if (opts.walkable) {
    const cos = Math.abs(Math.cos(yaw));
    const sin = Math.abs(Math.sin(yaw));
    const halfX = (length / 2) * cos + (CONTAINER_WIDTH / 2) * sin;
    const halfZ = (length / 2) * sin + (CONTAINER_WIDTH / 2) * cos;
    sink.addWalkable({
      minX: x - halfX + 0.3,
      minZ: z - halfZ + 0.3,
      maxX: x + halfX - 0.3,
      maxZ: z + halfZ - 0.3,
      height: base + CONTAINER_HEIGHT,
    });
  }
}

function containerLod(length: number): THREE.BufferGeometry {
  return cachedGeometry(`container|lod|${length}`, () =>
    boxGeometry(length, CONTAINER_HEIGHT, CONTAINER_WIDTH, 0.06, 2.4).clone(),
  );
}

function containerFrameGeometry(length: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const halfL = length / 2;
  const halfW = CONTAINER_WIDTH / 2;
  const halfH = CONTAINER_HEIGHT / 2;

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push(
        placed(
          boxGeometry(0.16, CONTAINER_HEIGHT, 0.16, 0.02, 1.6),
          transform(sx * (halfL - 0.08), 0, sz * (halfW - 0.08)),
        ),
      );
    }
  }
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push(
        placed(
          boxGeometry(length - 0.2, 0.14, 0.14, 0.02, 1.6),
          transform(0, sy * (halfH - 0.07), sz * (halfW - 0.07)),
        ),
      );
    }
    for (const sx of [-1, 1]) {
      parts.push(
        placed(
          boxGeometry(0.14, 0.14, CONTAINER_WIDTH - 0.2, 0.02, 1.6),
          transform(sx * (halfL - 0.07), sy * (halfH - 0.07), 0),
        ),
      );
    }
  }
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  return merged ?? parts[0];
}

function containerDoorGeometry(length: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const panelWidth = CONTAINER_WIDTH / 2 - 0.14;
  for (const s of [-1, 1]) {
    parts.push(
      placed(
        boxGeometry(0.06, CONTAINER_HEIGHT - 0.34, panelWidth, 0.015, 1.4),
        transform(0, 0, s * (panelWidth / 2 + 0.06)),
      ),
    );
    // Locking bars and handles.
    for (const bar of [-1, 1]) {
      parts.push(
        placed(
          cylinderGeometry(0.032, 0.032, CONTAINER_HEIGHT - 0.5, 6, 1.0),
          transform(0.055, 0, s * (panelWidth / 2 + 0.06) + bar * 0.22),
        ),
      );
    }
    parts.push(
      placed(
        boxGeometry(0.1, 0.06, 0.28, 0.01, 1),
        transform(0.09, -0.1, s * (panelWidth / 2 + 0.06)),
      ),
    );
  }
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  const geometry = merged ?? parts[0];
  // Doors live on the +X end of the container.
  geometry.translate(length / 2 - 0.06, 0, 0);
  return geometry;
}

// ---------------------------------------------------------------------------
// Crates, pallets, barrels
// ---------------------------------------------------------------------------

export function woodCrate(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  yaw: number,
  size = 0.82,
  destructible = true,
): void {
  // Snapped, because a crate is a shadow caster and every distinct size is a
  // whole instanced group plus its cascade draws. Callers vary crate size to break
  // up a stack; a tenth of a metre does that just as well as an arbitrary float.
  size = snap(size, 0.1);
  const geometry = cachedGeometry(`crate|${size.toFixed(2)}`, () => crateGeometry(size));
  const matrix = transform(x, y + size / 2, z, yaw);
  const tint = 0xd9c9a8;
  const ref = destructible
    ? sink.addInstancedProp(geometry, matrix, { material: 'wood_crate', tier: 'structure', tint })
    : sink.addProp(geometry, matrix, { material: 'wood_crate', tier: 'structure', tint });

  sink.addCollider(
    new THREE.Vector3(x, y + size / 2, z),
    new THREE.Vector3(size / 2, size / 2, size / 2),
    yaw,
    { surface: 'wood', destructible: destructible ? 1 : 0 },
  );
  if (destructible) {
    sink.addDestructible({
      kind: 'crate',
      position: new THREE.Vector3(x, y + size / 2, z),
      radius: size * 0.8,
      health: 55,
      surface: 'wood',
      instance: ref,
    });
  }
}

function crateGeometry(size: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [boxGeometry(size, size, size, 0.02, 1.4).clone()];
  const rail = size * 0.09;
  // Corner battens: the detail that separates a crate from a cube.
  for (const axis of [0, 1, 2]) {
    for (const s1 of [-1, 1]) {
      for (const s2 of [-1, 1]) {
        const run = size + 0.004;
        const dims: [number, number, number] =
          axis === 0 ? [run, rail, rail] : axis === 1 ? [rail, run, rail] : [rail, rail, run];
        const pos = new THREE.Vector3();
        const half = size / 2;
        if (axis === 0) pos.set(0, s1 * half, s2 * half);
        else if (axis === 1) pos.set(s1 * half, 0, s2 * half);
        else pos.set(s1 * half, s2 * half, 0);
        parts.push(
          placed(
            boxGeometry(dims[0], dims[1], dims[2], 0.012, 1.2),
            transform(pos.x, pos.y, pos.z),
          ),
        );
      }
    }
  }
  const merged = mergeGeometries(parts, false);
  for (let i = 1; i < parts.length; i++) parts[i].dispose();
  return merged ?? parts[0];
}

export function pallet(sink: Sink, x: number, z: number, yaw: number, y?: number): void {
  const geometry = cachedGeometry('pallet', () => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 6; i++) {
      parts.push(
        placed(
          boxGeometry(1.2, 0.022, 0.1, 0.006, 1.2),
          transform(0, 0.115, -0.4 + (i / 5) * 0.8),
        ),
      );
    }
    for (const s of [-1, 0, 1]) {
      parts.push(placed(boxGeometry(1.2, 0.075, 0.1, 0.008, 1.2), transform(0, 0.04, s * 0.4)));
    }
    for (let i = 0; i < 3; i++) {
      parts.push(
        placed(boxGeometry(0.1, 0.09, 0.8, 0.008, 1.2), transform(-0.5 + i * 0.5, 0.09, 0)),
      );
    }
    const merged = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    return merged ?? parts[0];
  });
  const base = y ?? sink.ground(x, z);
  sink.addProp(geometry, transform(x, base, z, yaw), {
    material: 'wood_plank',
    tier: 'detail',
    tint: 0xcbbb9a,
  });
}

export function oilBarrel(
  sink: Sink,
  x: number,
  z: number,
  yaw: number,
  opts: { tipped?: boolean; tint?: number; y?: number } = {},
): void {
  const geometry = cachedGeometry('barrel', () =>
    latheGeometry(
      'barrel',
      [
        [0, 0],
        [0.26, 0],
        [0.29, 0.04],
        [0.29, 0.2],
        [0.305, 0.24],
        [0.29, 0.28],
        [0.29, 0.56],
        [0.305, 0.6],
        [0.29, 0.64],
        [0.29, 0.82],
        [0.26, 0.87],
        [0, 0.87],
      ],
      14,
      1.8,
    ),
  );
  const lod = cachedGeometry('barrel|lod', () => cylinderGeometry(0.29, 0.29, 0.87, 8, 1.8).clone());
  const base = opts.y ?? sink.ground(x, z);
  const tint = opts.tint ?? (sink.rng.bool(0.4) ? 0xa8907a : 0x8fa39a);

  if (opts.tipped) {
    const matrix = transform(x, base + 0.29, z, yaw, 0, Math.PI / 2);
    sink.addProp(geometry, matrix, { material: 'barrel_rusty', tier: 'structure', tint });
    sink.addCollider(
      new THREE.Vector3(x, base + 0.29, z),
      new THREE.Vector3(0.44, 0.29, 0.29),
      yaw,
      { surface: 'metal' },
    );
    return;
  }

  const ref = sink.addInstancedProp(geometry, transform(x, base, z, yaw), {
    material: 'barrel_rusty',
    tier: 'structure',
    tint,
    lod,
  });
  sink.addCollider(
    new THREE.Vector3(x, base + 0.435, z),
    new THREE.Vector3(0.29, 0.435, 0.29),
    0,
    { surface: 'metal' },
  );
  sink.addDestructible({
    kind: 'barrel',
    position: new THREE.Vector3(x, base + 0.44, z),
    radius: 0.55,
    health: 70,
    surface: 'metal',
    instance: ref,
  });
}

export function jerryCan(sink: Sink, x: number, z: number, yaw: number, y?: number): void {
  const geometry = cachedGeometry('jerrycan', () => {
    const parts = [boxGeometry(0.18, 0.46, 0.34, 0.035, 0.9).clone()];
    parts.push(placed(boxGeometry(0.05, 0.05, 0.2, 0.012, 0.6), transform(0, 0.25, 0)));
    parts.push(placed(cylinderGeometry(0.035, 0.04, 0.06, 6, 0.6), transform(0, 0.26, 0.11)));
    const merged = mergeGeometries(parts, false);
    for (let i = 1; i < parts.length; i++) parts[i].dispose();
    return merged ?? parts[0];
  });
  const base = y ?? sink.ground(x, z);
  sink.addProp(geometry, transform(x, base + 0.23, z, yaw), {
    material: 'metal_rusted',
    tier: 'detail',
    tint: sink.rng.bool(0.5) ? 0x7f8a6e : 0xa8846a,
  });
}

export function ammoCrate(sink: Sink, x: number, z: number, yaw: number, y?: number): void {
  const geometry = cachedGeometry('ammocrate', () => {
    const parts = [boxGeometry(0.92, 0.36, 0.44, 0.028, 1.1).clone()];
    parts.push(placed(boxGeometry(0.96, 0.05, 0.48, 0.015, 1.1), transform(0, 0.2, 0)));
    for (const s of [-1, 1]) {
      parts.push(placed(boxGeometry(0.07, 0.1, 0.06, 0.01, 0.6), transform(s * 0.3, 0.12, 0.23)));
    }
    const merged = mergeGeometries(parts, false);
    for (let i = 1; i < parts.length; i++) parts[i].dispose();
    return merged ?? parts[0];
  });
  const base = y ?? sink.ground(x, z);
  sink.addProp(geometry, transform(x, base + 0.18, z, yaw), {
    material: 'crate_military',
    tier: 'structure',
    tint: 0xc8c3b2,
  });
  sink.addCollider(
    new THREE.Vector3(x, base + 0.18, z),
    new THREE.Vector3(0.46, 0.2, 0.24),
    yaw,
    { surface: 'wood' },
  );
}

export function tyreStack(sink: Sink, x: number, z: number, yaw: number, count = 4): void {
  const tyre = cachedGeometry('tyre', () => {
    const geometry = new THREE.TorusGeometry(0.31, 0.115, 7, 14);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  });
  const base = sink.ground(x, z);
  for (let i = 0; i < count; i++) {
    sink.addProp(
      tyre,
      transform(x, base + 0.115 + i * 0.2, z, yaw + i * 0.7, 0, 0, 1),
      { material: 'rubber_tire', tier: 'structure', tint: 0xb4b4b4, tile: 1.0 },
    );
  }
  sink.addCollider(
    new THREE.Vector3(x, base + (count * 0.2) / 2, z),
    new THREE.Vector3(0.42, (count * 0.2) / 2, 0.42),
    0,
    { surface: 'rubber' },
  );
}

export function cableSpool(sink: Sink, x: number, z: number, yaw: number): void {
  const geometry = cachedGeometry('spool', () => {
    const parts: THREE.BufferGeometry[] = [];
    for (const s of [-1, 1]) {
      parts.push(
        placed(cylinderGeometry(0.72, 0.72, 0.08, 16, 1.6), transform(0, 0.72, s * 0.42, 0, 0, Math.PI / 2)),
      );
    }
    parts.push(placed(cylinderGeometry(0.3, 0.3, 0.78, 12, 1.6), transform(0, 0.72, 0, 0, 0, Math.PI / 2)));
    const merged = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    return merged ?? parts[0];
  });
  const base = sink.ground(x, z);
  sink.addProp(geometry, transform(x, base, z, yaw), {
    material: 'wood_plank',
    tier: 'structure',
    tint: 0xbfae90,
  });
  sink.addCollider(
    new THREE.Vector3(x, base + 0.72, z),
    new THREE.Vector3(0.72, 0.72, 0.5),
    yaw,
    { surface: 'wood' },
  );
}

// ---------------------------------------------------------------------------
// Barriers and emplacements
// ---------------------------------------------------------------------------

/**
 * Sandbag emplacement: offset rows of rounded bags with jittered yaw and a
 * battered profile. Boxes stacked in a grid read as boxes; this reads as bags.
 */
const SANDBAG_SCALE = new THREE.Vector3();

export function sandbagWall(
  sink: Sink,
  x: number,
  z: number,
  yaw: number,
  length: number,
  rows = 4,
  opts: { curve?: number; y?: number } = {},
): void {
  const bag = bagGeometry(0.54, 0.2, 0.34, 0.09);
  const bagLength = 0.54;
  const base = opts.y ?? sink.ground(x, z);
  const perBag = bagLength * 0.98;
  const count = Math.max(2, Math.round(length / perBag));
  const dirX = Math.cos(yaw);
  const dirZ = -Math.sin(yaw);
  const perpX = -dirZ;
  const perpZ = dirX;
  const curve = opts.curve ?? 0;
  const refs: InstanceRef[] = [];

  for (let row = 0; row < rows; row++) {
    const inset = row * 0.045;
    const rowCount = count - (row % 2 === 0 ? 0 : 1);
    for (let i = 0; i < rowCount; i++) {
      const t = (i + (row % 2 === 0 ? 0.5 : 1)) / count - 0.5;
      const along = t * length;
      const bow = curve * (1 - (2 * t) ** 2);
      const px = x + dirX * along + perpX * bow;
      const pz = z + dirZ * along + perpZ * bow;
      const y = base + 0.1 + row * 0.185;
      // Every bag is filled by hand to a different fullness, and the row it sits
      // in squashes the one below. Identical bags are the tell that gives away a
      // sandbag wall built from one mesh.
      SANDBAG_SCALE.set(
        sink.rng.range(0.93, 1.09),
        sink.rng.range(0.84, 1.06),
        sink.rng.range(0.9, 1.12),
      );
      refs.push(sink.addInstancedProp(
        bag,
        transform(
          px + perpX * inset * sink.rng.sign() * 0.4,
          y,
          pz + perpZ * inset * sink.rng.sign() * 0.4,
          yaw + sink.rng.range(-0.14, 0.14),
          sink.rng.range(-0.06, 0.06),
          sink.rng.range(-0.1, 0.1),
          SANDBAG_SCALE,
        ),
        {
          material: 'sandbag',
          tier: 'structure',
          // Wide, because a revetment is filled from whatever is to hand over
          // however long it took to build: bags bleached at the top of the wall,
          // bags still damp at the bottom, and a few from a different batch.
          tint: sink.rng.pick([0xd6cbaf, 0xc9bda0, 0xbdb094, 0xaa9c80, 0xc0ab86, 0x9d9078]),
        },
      ));
    }
  }

  const height = rows * 0.185;
  sink.addCollider(
    new THREE.Vector3(x, base + height / 2, z),
    new THREE.Vector3(length / 2, height / 2, 0.24 + Math.abs(curve) * 0.5),
    yaw,
    { surface: 'sand' },
  );
  sink.addDestructible({
    kind: 'sandbag',
    position: new THREE.Vector3(x, base + height / 2, z),
    radius: length * 0.5,
    health: 220,
    surface: 'sand',
    instances: refs,
  });
}

/** Sandbag ring around a fighting position. */
export function sandbagNest(sink: Sink, x: number, z: number, yaw: number, radius = 1.9): void {
  const sides = 5;
  for (let i = 0; i < sides; i++) {
    const a = yaw + Math.PI * 0.25 + (i / sides) * Math.PI * 1.5;
    const px = x + Math.cos(a) * radius;
    const pz = z + Math.sin(a) * radius;
    sandbagWall(sink, px, pz, -a + Math.PI / 2, (TAU * radius) / sides + 0.2, 4);
  }
}

export function jerseyBarrier(sink: Sink, x: number, z: number, yaw: number, y?: number): void {
  const geometry = cachedGeometry('jersey', () => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.31, 0);
    shape.lineTo(0.31, 0);
    shape.lineTo(0.31, 0.12);
    shape.lineTo(0.155, 0.4);
    shape.lineTo(0.12, 0.96);
    shape.lineTo(-0.12, 0.96);
    shape.lineTo(-0.155, 0.4);
    shape.lineTo(-0.31, 0.12);
    shape.closePath();
    const extruded = new THREE.ExtrudeGeometry(shape, {
      depth: 2.3,
      bevelEnabled: true,
      bevelSize: 0.018,
      bevelThickness: 0.018,
      bevelSegments: 1,
      steps: 1,
    });
    extruded.translate(0, 0, -1.15);
    extruded.rotateY(Math.PI / 2);
    return extruded;
  });
  const base = y ?? sink.ground(x, z);
  sink.addProp(geometry, transform(x, base, z, yaw), {
    material: 'concrete_wall',
    tier: 'structure',
    reproject: true,
    tile: 2.2,
    tint: sink.rng.pick([0xefe9dc, 0xdfd8c8, 0xe8e2d2]),
  });
  sink.addCollider(
    new THREE.Vector3(x, base + 0.48, z),
    new THREE.Vector3(1.15, 0.48, 0.32),
    yaw,
    { surface: 'concrete' },
  );
}

/** Gabion / HESCO style barrier: wire cage packed with fill. */
export function hescoBarrier(
  sink: Sink,
  x: number,
  z: number,
  yaw: number,
  length = 2.4,
  height = 1.15,
): void {
  const base = sink.ground(x, z);
  const fill = cachedGeometry(`hesco|fill|${length}|${height}`, () =>
    roundedGeometry(length, height, 1.0, 0.09, 2, 2.0),
  );
  sink.addProp(fill, transform(x, base + height / 2, z, yaw), {
    material: 'sandbag',
    tier: 'structure',
    tint: 0xc4b899,
  });
  const cage = cachedGeometry(`hesco|cage|${length}|${height}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    for (const s of [-1, 1]) {
      const panel = planeGeometry(length, height, 0.5).clone();
      panel.rotateY(s > 0 ? 0 : Math.PI);
      panel.translate(0, 0, s * 0.52);
      parts.push(panel);
      const end = planeGeometry(1.04, height, 0.5).clone();
      end.rotateY(s * Math.PI * 0.5);
      end.translate(s * (length / 2), 0, 0);
      parts.push(end);
    }
    const merged = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    return merged ?? parts[0];
  });
  sink.addProp(cage, transform(x, base + height / 2, z, yaw), {
    material: 'metal_grate',
    tier: 'detail',
    tile: 0.5,
    tint: 0x9a9384,
  });
  sink.addCollider(
    new THREE.Vector3(x, base + height / 2, z),
    new THREE.Vector3(length / 2, height / 2, 0.52),
    yaw,
    { surface: 'sand' },
  );
}

/** Chain-link fence run with sagging panels, posts and a top rail. */
export function chainLinkFence(
  sink: Sink,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  height = 2.2,
  opts: { collide?: boolean } = {},
): void {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const length = Math.hypot(dx, dz);
  if (length < 0.5) return;
  const yaw = Math.atan2(-dz, dx);
  const span = 2.6;
  const bays = Math.max(1, Math.round(length / span));
  const bayLength = length / bays;

  const post = cachedGeometry(`fence|post|${height}`, () =>
    cylinderGeometry(0.05, 0.055, height, 7, 1.2).clone(),
  );
  const panel = cachedGeometry(`fence|panel|${bayLength.toFixed(2)}|${height}`, () =>
    makeDoubleSided(saggingMeshPanel(bayLength - 0.1, height - 0.18)),
  );

  for (let i = 0; i <= bays; i++) {
    const t = i / bays;
    const px = x0 + dx * t;
    const pz = z0 + dz * t;
    const base = sink.ground(px, pz);
    sink.addProp(post, transform(px, base + height / 2, pz, yaw), {
      material: 'metal_rusted',
      tier: 'structure',
      tint: 0x9e968a,
    });
  }
  for (let i = 0; i < bays; i++) {
    const t = (i + 0.5) / bays;
    const px = x0 + dx * t;
    const pz = z0 + dz * t;
    const base = sink.ground(px, pz);
    sink.addProp(panel, transform(px, base + height / 2 - 0.02, pz, yaw), {
      material: 'metal_grate',
      tier: 'structure',
      tile: 0.42,
      tint: 0xa9a49a,
      castShadow: false,
    });
    // Top rail.
    sink.addProp(
      cachedGeometry(`fence|rail|${bayLength.toFixed(2)}`, () =>
        cylinderGeometry(0.028, 0.028, bayLength, 6, 1.2).clone(),
      ),
      transform(px, base + height - 0.06, pz, yaw, 0, Math.PI / 2),
      { material: 'metal_rusted', tier: 'detail', tint: 0x9e968a },
    );
  }

  if (opts.collide !== false) {
    const midX = (x0 + x1) / 2;
    const midZ = (z0 + z1) / 2;
    sink.addCollider(
      new THREE.Vector3(midX, sink.ground(midX, midZ) + height / 2, midZ),
      new THREE.Vector3(length / 2, height / 2, 0.07),
      yaw,
      { surface: 'metal', noCover: true },
    );
  }
}

/** Wire mesh panel that bows out between its posts instead of hanging flat. */
function saggingMeshPanel(width: number, height: number): THREE.BufferGeometry {
  const cols = 5;
  const rows = 3;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const bow = Math.sin(u * Math.PI) * 0.055 * Math.sin(v * Math.PI * 0.9 + 0.4);
      positions.push((u - 0.5) * width, (v - 0.5) * height, bow);
      uvs.push(u * width, v * height);
    }
  }
  const stride = cols + 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * stride + c;
      indices.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// ---------------------------------------------------------------------------
// Street furniture
// ---------------------------------------------------------------------------

export function streetLamp(sink: Sink, x: number, z: number, yaw: number): void {
  const base = sink.ground(x, z);
  const pole = cachedGeometry('lamp|pole', () => {
    const parts: THREE.BufferGeometry[] = [];
    parts.push(placed(cylinderGeometry(0.075, 0.13, 5.4, 8, 2.0), transform(0, 2.7, 0)));
    parts.push(placed(boxGeometry(0.3, 0.32, 0.3, 0.04, 1.4), transform(0, 0.16, 0)));
    parts.push(
      placed(cylinderGeometry(0.06, 0.06, 1.15, 6, 2.0), transform(0.5, 5.32, 0, 0, 0, 1.15)),
    );
    const merged = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    return merged ?? parts[0];
  });
  sink.addProp(pole, transform(x, base, z, yaw), {
    material: 'metal_panel',
    tier: 'structure',
    tint: 0x8f9691,
  });

  const head = cachedGeometry('lamp|head', () =>
    boxGeometry(0.62, 0.15, 0.32, 0.05, 1.2).clone(),
  );
  const headX = x + Math.cos(yaw) * 0.98;
  const headZ = z - Math.sin(yaw) * 0.98;
  sink.addProp(head, transform(headX, base + 5.52, headZ, yaw), {
    material: 'metal_panel',
    tier: 'detail',
    tint: 0x8f9691,
  });
  const lens = cachedGeometry('lamp|lens', () => planeGeometry(0.5, 0.24, 1.2));
  const ref = sink.addInstancedProp(
    lens,
    transform(headX, base + 5.43, headZ, yaw, Math.PI / 2),
    { material: 'glass_dirty', tier: 'detail', castShadow: false },
  );
  sink.addDestructible({
    kind: 'lamp',
    position: new THREE.Vector3(headX, base + 5.45, headZ),
    radius: 0.7,
    health: 18,
    surface: 'glass',
    instance: ref,
  });
  sink.addCollider(
    new THREE.Vector3(x, base + 1.4, z),
    new THREE.Vector3(0.14, 1.4, 0.14),
    0,
    { surface: 'metal', noCover: true },
  );
}

export function powerPole(sink: Sink, x: number, z: number, yaw: number, height = 7.6): void {
  const base = sink.ground(x, z);
  const geometry = cachedGeometry(`pole|${height}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    parts.push(placed(cylinderGeometry(0.11, 0.16, height, 8, 2.0), transform(0, height / 2, 0)));
    parts.push(placed(boxGeometry(2.1, 0.11, 0.14, 0.02, 1.8), transform(0, height - 0.5, 0)));
    parts.push(placed(boxGeometry(1.4, 0.1, 0.12, 0.02, 1.8), transform(0, height - 1.15, 0)));
    for (const s of [-1, 0, 1]) {
      parts.push(
        placed(cylinderGeometry(0.05, 0.06, 0.16, 6, 0.6), transform(s * 0.92, height - 0.36, 0)),
      );
    }
    const merged = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    return merged ?? parts[0];
  });
  sink.addProp(geometry, transform(x, base, z, yaw), {
    material: 'wood_plank',
    tier: 'structure',
    tint: 0x8f7f68,
  });
  sink.addCollider(
    new THREE.Vector3(x, base + height / 2, z),
    new THREE.Vector3(0.16, height / 2, 0.16),
    0,
    { surface: 'wood', noCover: true },
  );
}

/** Sagging catenary run between two poles. */
export function powerLine(
  sink: Sink,
  from: THREE.Vector3,
  to: THREE.Vector3,
  strands = 3,
): void {
  for (let i = 0; i < strands; i++) {
    const offset = (i - (strands - 1) / 2) * 0.92;
    const a = from.clone();
    const b = to.clone();
    const dir = b.clone().sub(a).setY(0).normalize();
    const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(offset);
    a.add(perp);
    b.add(perp);
    const geometry = catenaryGeometry(a, b, 0.6 + Math.abs(offset) * 0.1, 0.022, 8);
    sink.addStatic(geometry, {
      material: 'metal_rusted',
      tier: 'detail',
      tint: 0x4a4640,
    });
  }
}

export function roadSign(sink: Sink, x: number, z: number, yaw: number, kind: 'square' | 'round' = 'square'): void {
  const base = sink.ground(x, z);
  const post = cachedGeometry('sign|post', () => cylinderGeometry(0.04, 0.045, 2.5, 6, 1.4).clone());
  sink.addProp(post, transform(x, base + 1.25, z, yaw), {
    material: 'metal_panel',
    tier: 'detail',
    tint: 0x9aa09b,
  });
  const panel =
    kind === 'square'
      ? cachedGeometry('sign|square', () => boxGeometry(0.72, 0.72, 0.035, 0.02, 1.4).clone())
      : cachedGeometry('sign|round', () => cylinderGeometry(0.38, 0.38, 0.035, 14, 1.4).clone());
  const matrix =
    kind === 'square'
      ? transform(x, base + 2.16, z, yaw)
      : transform(x, base + 2.16, z, yaw, Math.PI / 2);
  const ref = sink.addInstancedProp(panel, matrix, {
    material: sink.rng.bool(0.5) ? 'paint_red' : 'paint_yellow',
    tier: 'detail',
    tint: 0xf0ece2,
  });
  sink.addDestructible({
    kind: 'sign',
    position: new THREE.Vector3(x, base + 2.16, z),
    radius: 0.6,
    health: 40,
    surface: 'metal',
    instance: ref,
  });
}

export function dumpster(sink: Sink, x: number, z: number, yaw: number): void {
  const base = sink.ground(x, z);
  const body = cachedGeometry('dumpster', () => {
    const parts: THREE.BufferGeometry[] = [];
    parts.push(placed(boxGeometry(1.9, 1.05, 1.15, 0.04, 2.0), transform(0, 0.62, 0)));
    parts.push(placed(boxGeometry(1.98, 0.09, 1.22, 0.02, 2.0), transform(0, 1.16, 0)));
    for (const s of [-1, 1]) {
      parts.push(placed(boxGeometry(0.1, 0.22, 0.1, 0.02, 1.0), transform(s * 0.82, 0.12, 0.48)));
      parts.push(placed(boxGeometry(0.1, 0.22, 0.1, 0.02, 1.0), transform(s * 0.82, 0.12, -0.48)));
    }
    const merged = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    return merged ?? parts[0];
  });
  sink.addProp(body, transform(x, base, z, yaw), {
    material: 'metal_rusted',
    tier: 'structure',
    tint: sink.rng.pick([0x7d8b74, 0x8a7a6a, 0x6f7d84]),
  });
  // Two lid flaps hinged on the long axis; one is usually thrown open.
  const lid = cachedGeometry('dumpster|lid', () => boxGeometry(1.94, 0.055, 0.58, 0.02, 2.0).clone());
  const perpX = Math.sin(yaw);
  const perpZ = Math.cos(yaw);
  for (const s of [-1, 1]) {
    const open = sink.rng.bool(0.4);
    const tilt = open ? 1.35 * s : 0;
    const drop = open ? 0.34 : 0;
    const offset = open ? 0.16 : 0.29;
    sink.addProp(
      lid,
      transform(x + perpX * offset * s, base + 1.24 + drop, z + perpZ * offset * s, yaw, tilt, 0),
      { material: 'metal_panel', tier: 'detail', tint: 0x6d7a72 },
    );
  }
  sink.addCollider(
    new THREE.Vector3(x, base + 0.6, z),
    new THREE.Vector3(0.99, 0.6, 0.61),
    yaw,
    { surface: 'metal' },
  );
}

export function bench(sink: Sink, x: number, z: number, yaw: number): void {
  const base = sink.ground(x, z);
  const geometry = cachedGeometry('bench', () => {
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
      parts.push(placed(boxGeometry(1.8, 0.045, 0.12, 0.012, 1.2), transform(0, 0.45, -0.16 + i * 0.16)));
    }
    for (let i = 0; i < 2; i++) {
      parts.push(placed(boxGeometry(1.8, 0.12, 0.045, 0.012, 1.2), transform(0, 0.66 + i * 0.17, -0.24)));
    }
    for (const s of [-1, 1]) {
      parts.push(placed(boxGeometry(0.14, 0.45, 0.5, 0.02, 1.2), transform(s * 0.78, 0.225, -0.06)));
    }
    const merged = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    return merged ?? parts[0];
  });
  sink.addProp(geometry, transform(x, base, z, yaw), {
    material: 'wood_painted',
    tier: 'structure',
    tint: 0x9c8f74,
  });
  sink.addCollider(
    new THREE.Vector3(x, base + 0.3, z),
    new THREE.Vector3(0.9, 0.3, 0.28),
    yaw,
    { surface: 'wood' },
  );
}

export function planter(sink: Sink, x: number, z: number, yaw: number, size = 1.1): void {
  const base = sink.ground(x, z);
  const geometry = cachedGeometry(`planter|${size}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    parts.push(placed(boxGeometry(size, 0.62, size, 0.05, 2.0), transform(0, 0.31, 0)));
    parts.push(placed(boxGeometry(size + 0.1, 0.08, size + 0.1, 0.02, 2.0), transform(0, 0.66, 0)));
    const merged = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    return merged ?? parts[0];
  });
  sink.addProp(geometry, transform(x, base, z, yaw), {
    material: 'concrete_wall',
    tier: 'structure',
    tint: 0xe4ddcd,
  });
  const soil = cachedGeometry(`planter|soil|${size}`, () =>
    boxGeometry(size - 0.16, 0.1, size - 0.16, 0.02, 1.4).clone(),
  );
  sink.addProp(soil, transform(x, base + 0.6, z, yaw), {
    material: 'dirt_ground',
    tier: 'detail',
    tint: 0xa8987e,
  });
  sink.addCollider(
    new THREE.Vector3(x, base + 0.33, z),
    new THREE.Vector3(size / 2, 0.33, size / 2),
    yaw,
    { surface: 'concrete' },
  );
}

// ---------------------------------------------------------------------------
// Market
// ---------------------------------------------------------------------------

const AWNING_COLORS = [0xc46a4a, 0x4a6f8a, 0xb8a05a, 0x7a8f6a, 0xa85a6a];

/**
 * Market stall: frame, sagging striped awning, counter and goods. The awning is
 * a bowed grid rather than a flat quad, so it reads as cloth under tension.
 */
export function marketStall(
  sink: Sink,
  x: number,
  z: number,
  yaw: number,
  opts: { width?: number; depth?: number } = {},
): void {
  // Half-metre ladder. A stall is a frame and a canopy, both cached on their own
  // dimensions and both shadow casters, so a stall authored at its own exact size
  // is two map-wide instanced groups holding one copy each — and each of those
  // costs a draw in the main pass and one in every shadow cascade it falls in.
  // Nine stalls at nine sizes was the largest single block of one-copy casting
  // groups in the scene. Half a metre is below the width of a crate.
  const width = snap(opts.width ?? 2.6, 0.5);
  const depth = snap(opts.depth ?? 1.9, 0.5);
  const base = sink.ground(x, z);
  const height = 2.35;

  const frame = cachedGeometry(`stall|frame|${width}|${depth}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        parts.push(
          placed(
            boxGeometry(0.07, height, 0.07, 0.012, 1.2),
            transform(sx * (width / 2 - 0.06), height / 2, sz * (depth / 2 - 0.06)),
          ),
        );
      }
    }
    for (const sz of [-1, 1]) {
      parts.push(
        placed(
          boxGeometry(width - 0.1, 0.06, 0.06, 0.01, 1.2),
          transform(0, height - 0.05, sz * (depth / 2 - 0.06)),
        ),
      );
    }
    for (const sx of [-1, 1]) {
      parts.push(
        placed(
          boxGeometry(0.06, 0.06, depth - 0.1, 0.01, 1.2),
          transform(sx * (width / 2 - 0.06), height - 0.05, 0),
        ),
      );
    }
    // Counter.
    parts.push(placed(boxGeometry(width - 0.2, 0.06, depth - 0.4, 0.012, 1.4), transform(0, 0.86, 0)));
    for (const sx of [-1, 1]) {
      parts.push(
        placed(
          boxGeometry(0.08, 0.86, 0.08, 0.012, 1.2),
          transform(sx * (width / 2 - 0.3), 0.43, 0),
        ),
      );
    }
    const merged = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    return merged ?? parts[0];
  });

  const ref = sink.addInstancedProp(frame, transform(x, base, z, yaw), {
    material: 'wood_plank',
    tier: 'structure',
    tint: 0xc4b391,
  });

  const awning = cachedGeometry(`stall|awning|${width}|${depth}`, () =>
    makeDoubleSided(saggingCloth(width + 0.5, depth + 0.9, 0.12)),
  );
  const awningRef = sink.addInstancedProp(awning, transform(x, base + height + 0.06, z, yaw), {
    material: 'fabric_canvas',
    tier: 'structure',
    tint: sink.rng.pick(AWNING_COLORS),
    castShadow: true,
  });

  sink.addCollider(
    new THREE.Vector3(x, base + 0.45, z),
    new THREE.Vector3(width / 2 - 0.1, 0.45, depth / 2 - 0.2),
    yaw,
    { surface: 'wood' },
  );
  sink.addDestructible({
    kind: 'stall',
    position: new THREE.Vector3(x, base + 1.1, z),
    radius: Math.max(width, depth) * 0.7,
    health: 90,
    surface: 'wood',
    instance: ref,
    instances: [awningRef],
  });

  // Goods on the counter and crates underneath.
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  for (let i = 0; i < 3; i++) {
    const lx = sink.rng.range(-width / 2 + 0.35, width / 2 - 0.35);
    const lz = sink.rng.range(-depth / 2 + 0.35, depth / 2 - 0.35);
    const px = x + lx * cos + lz * sin;
    const pz = z - lx * sin + lz * cos;
    sink.addProp(
      cachedGeometry('stall|tray', () => boxGeometry(0.44, 0.13, 0.32, 0.02, 1.0).clone()),
      transform(px, base + 0.95, pz, yaw + sink.rng.range(-0.3, 0.3)),
      { material: 'wood_crate', tier: 'detail', tint: sink.rng.pick([0xc9a86a, 0xa8b47a, 0xc47a5a]) },
    );
  }
  if (sink.rng.bool(0.6)) {
    const lx = sink.rng.range(-width / 2, width / 2);
    woodCrate(sink, x + lx * cos, base, z - lx * sin, yaw + sink.rng.range(-0.4, 0.4), 0.6, false);
  }
}

/** Bowed cloth sheet whose leading edge droops, for awnings and tarpaulins. */
export function saggingCloth(width: number, depth: number, sag: number): THREE.BufferGeometry {
  const cols = 6;
  const rows = 4;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const dip = -sag * Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
      const droop = v > 0.82 ? -(v - 0.82) * 1.9 : 0;
      positions.push((u - 0.5) * width, dip + droop, (v - 0.5) * depth);
      uvs.push(u * width, v * depth);
    }
  }
  const stride = cols + 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * stride + c;
      indices.push(a, a + 1, a + stride, a + 1, a + stride + 1, a + stride);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// ---------------------------------------------------------------------------
// Rubble
// ---------------------------------------------------------------------------

/** One of four pre-built rubble clusters, instanced with a random yaw. */
export function rubblePile(
  sink: Sink,
  x: number,
  z: number,
  yaw: number,
  scale = 1,
  variant = -1,
): void {
  const index = variant >= 0 ? variant : sink.rng.int(0, 3);
  const geometry = cachedGeometry(`rubble|${index}`, () => rubbleGeometry(index));
  const base = sink.ground(x, z);
  sink.addProp(geometry, transform(x, base, z, yaw, 0, 0, scale), {
    material: 'concrete_damaged',
    tier: 'structure',
    tint: 0xd8d0c0,
  });
  sink.addCollider(
    new THREE.Vector3(x, base + 0.32 * scale, z),
    new THREE.Vector3(1.3 * scale, 0.34 * scale, 1.15 * scale),
    yaw,
    { surface: 'concrete', noCover: true },
  );
}

function rubbleGeometry(seed: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  let state = 1337 + seed * 977;
  const rand = (): number => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  const count = 11 + seed * 2;
  for (let i = 0; i < count; i++) {
    const w = 0.2 + rand() * 0.62;
    const h = 0.12 + rand() * 0.3;
    const d = 0.2 + rand() * 0.55;
    const r = rand() * 1.25;
    const a = rand() * TAU;
    parts.push(
      placed(
        boxGeometry(w, h, d, 0.025, 1.6),
        transform(
          Math.cos(a) * r,
          h * 0.4 + rand() * 0.22,
          Math.sin(a) * r * 0.9,
          rand() * TAU,
          rand() * 0.6 - 0.3,
          rand() * 0.6 - 0.3,
        ),
      ),
    );
  }
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  return merged ?? parts[0];
}

/** Long spill of rubble used to seal streets at the map edge. */
export function rubbleBerm(
  sink: Sink,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  height: number,
): void {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const length = Math.hypot(dx, dz);
  const steps = Math.max(2, Math.round(length / 2.6));
  const yaw = Math.atan2(-dz, dx);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x0 + dx * t;
    const pz = z0 + dz * t;
    const scale = 1.1 + sink.rng.range(-0.2, 0.35);
    rubblePile(sink, px, pz, sink.rng.range(0, TAU), scale);
    if (sink.rng.bool(0.45)) {
      const slabWidth = sink.rng.range(1.4, 3.2);
      const slabHeight = sink.rng.range(0.18, 0.3);
      sink.addProp(
        cachedGeometry(`berm|slab|${slabWidth.toFixed(1)}|${slabHeight.toFixed(2)}`, () =>
          boxGeometry(slabWidth, slabHeight, sink.rng.range(1.1, 2.2), 0.04, 2.2).clone(),
        ),
        transform(
          px + sink.rng.range(-1, 1),
          sink.ground(px, pz) + sink.rng.range(0.3, height * 0.7),
          pz + sink.rng.range(-1, 1),
          sink.rng.range(0, TAU),
          sink.rng.range(-0.5, 0.5),
          sink.rng.range(-0.4, 0.4),
        ),
        { material: 'concrete_damaged', tier: 'structure', tint: 0xcfc7b6 },
      );
    }
  }

  // One clean collider so the berm is solid and cannot be climbed through.
  sink.addCollider(
    new THREE.Vector3((x0 + x1) / 2, sink.ground((x0 + x1) / 2, (z0 + z1) / 2) + height / 2, (z0 + z1) / 2),
    new THREE.Vector3(length / 2, height / 2, 1.9),
    yaw,
    { surface: 'gravel', noCover: true },
  );
}

/** Reinforcing bar sticking out of unfinished concrete. */
export function rebarCluster(
  sink: Sink,
  x: number,
  y: number,
  z: number,
  count = 6,
  length = 0.9,
): void {
  const bar = cachedGeometry(`rebar|${length.toFixed(2)}`, () =>
    cylinderGeometry(0.011, 0.011, length, 4, 0.8).clone(),
  );
  for (let i = 0; i < count; i++) {
    sink.addProp(
      bar,
      transform(
        x + sink.rng.range(-0.35, 0.35),
        y + length / 2 - 0.1,
        z + sink.rng.range(-0.35, 0.35),
        sink.rng.range(0, TAU),
        sink.rng.range(-0.28, 0.28),
        sink.rng.range(-0.28, 0.28),
      ),
      { material: 'metal_rusted', tier: 'detail', tint: 0x8a6a4a },
    );
  }
}

/** Scaffolding tower: verticals, ledgers, braces and plank decks. */
export function scaffolding(
  sink: Sink,
  x: number,
  z: number,
  yaw: number,
  width: number,
  depth: number,
  lifts: number,
): void {
  const base = sink.ground(x, z);
  const liftHeight = 2.0;
  const tube = (length: number): THREE.BufferGeometry =>
    cachedGeometry(`scaff|tube|${length.toFixed(2)}`, () =>
      cylinderGeometry(0.024, 0.024, length, 5, 1.2).clone(),
    );

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const px = sx * (width / 2);
      const pz = sz * (depth / 2);
      sink.addProp(
        tube(liftHeight * lifts),
        transform(
          x + px * Math.cos(yaw) + pz * Math.sin(yaw),
          base + (liftHeight * lifts) / 2,
          z - px * Math.sin(yaw) + pz * Math.cos(yaw),
          yaw,
        ),
        { material: 'steel_brushed', tier: 'structure', tint: 0x9fa4a0 },
      );
    }
  }

  for (let lift = 1; lift <= lifts; lift++) {
    const y = base + lift * liftHeight;
    for (const sz of [-1, 1]) {
      const pz = sz * (depth / 2);
      sink.addProp(
        tube(width),
        transform(
          x + pz * Math.sin(yaw),
          y,
          z + pz * Math.cos(yaw),
          yaw,
          0,
          Math.PI / 2,
        ),
        { material: 'steel_brushed', tier: 'detail', tint: 0x9fa4a0 },
      );
    }
    // Plank deck.
    const deck = cachedGeometry(`scaff|deck|${width}|${depth}`, () => {
      const planks: THREE.BufferGeometry[] = [];
      const boards = Math.max(2, Math.round(depth / 0.26));
      for (let i = 0; i < boards; i++) {
        planks.push(
          placed(
            boxGeometry(width - 0.1, 0.035, 0.24, 0.008, 1.6),
            transform(0, 0, -depth / 2 + 0.14 + i * 0.26),
          ),
        );
      }
      const merged = mergeGeometries(planks, false);
      for (const plank of planks) plank.dispose();
      return merged ?? planks[0];
    });
    sink.addProp(deck, transform(x, y - 0.05, z, yaw), {
      material: 'wood_plank',
      tier: 'structure',
      tint: 0xb8a888,
    });
    sink.addCollider(
      new THREE.Vector3(x, y - 0.08, z),
      new THREE.Vector3(width / 2, 0.06, depth / 2),
      yaw,
      { surface: 'wood', noCover: true, noNav: true },
    );
    sink.addWalkable({
      minX: x - width / 2 + 0.2,
      minZ: z - depth / 2 + 0.2,
      maxX: x + width / 2 - 0.2,
      maxZ: z + depth / 2 - 0.2,
      height: y - 0.02,
      costMul: 1.4,
    });
  }
}

/** Simple ladder; the AI treats it as a high-cost link, the player mantles it. */
export function ladder(
  sink: Sink,
  x: number,
  z: number,
  yaw: number,
  height: number,
  material: MaterialId = 'metal_rusted',
): void {
  const base = sink.ground(x, z);
  const geometry = cachedGeometry(`ladder|${height.toFixed(1)}`, () => {
    const parts: THREE.BufferGeometry[] = [];
    for (const s of [-1, 1]) {
      parts.push(
        placed(boxGeometry(0.05, height, 0.05, 0.01, 1.2), transform(s * 0.22, height / 2, 0)),
      );
    }
    const rungs = Math.max(2, Math.floor(height / 0.32));
    for (let i = 0; i < rungs; i++) {
      parts.push(
        placed(
          cylinderGeometry(0.017, 0.017, 0.44, 5, 0.8),
          transform(0, 0.2 + i * 0.32, 0, 0, 0, Math.PI / 2),
        ),
      );
    }
    const merged = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    return merged ?? parts[0];
  });
  sink.addProp(geometry, transform(x, base, z, yaw), {
    material,
    tier: 'structure',
    tint: 0x9a9084,
  });
}

/** Stack of concrete blocks, the mantle-height stepping stone onto low roofs. */
export function blockStack(sink: Sink, x: number, z: number, yaw: number, rows = 4): void {
  const block = cachedGeometry('block', () => boxGeometry(0.44, 0.2, 0.22, 0.018, 1.2).clone());
  const base = sink.ground(x, z);
  for (let row = 0; row < rows; row++) {
    const perRow = row % 2 === 0 ? 3 : 2;
    for (let i = 0; i < perRow; i++) {
      const offset = (i - (perRow - 1) / 2) * 0.24;
      const shift = row % 2 === 0 ? 0 : 0.12;
      sink.addProp(
        block,
        transform(
          x + Math.cos(yaw) * (offset + shift),
          base + 0.1 + row * 0.205,
          z - Math.sin(yaw) * (offset + shift),
          yaw + sink.rng.range(-0.05, 0.05),
        ),
        { material: 'concrete_wall', tier: 'structure', tint: 0xe0d9c8 },
      );
    }
  }
  const height = rows * 0.205;
  sink.addCollider(
    new THREE.Vector3(x, base + height / 2, z),
    new THREE.Vector3(0.4, height / 2, 0.34),
    yaw,
    { surface: 'concrete' },
  );
}
