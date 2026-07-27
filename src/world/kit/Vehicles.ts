import * as THREE from 'three';
import type { MaterialId } from '../../core/Contracts';
import { mergeGeometries } from '../../procgen';
import {
  type Sink,
  boxGeometry,
  cachedGeometry,
  cylinderGeometry,
  placed,
  transform,
} from './Kit';

/**
 * Derelict vehicles.
 *
 * A car is one of the hardest things to fake with boxes, because everyone knows
 * what one looks like. What actually sells it at ten metres is the checklist:
 * tyres with a visible sidewall and a rim inside the arch, a greenhouse that is
 * glass rather than paint, wheel arches flared past the body line, bumpers that
 * stand off the shell, and an exhaust. All of that is here; the shapes in between
 * are bevelled boxes.
 *
 * Each vehicle is a `THREE.LOD`: four merged meshes up close, one silhouette
 * beyond thirty-five metres.
 */

export type VehicleKind = 'pickup' | 'sedan' | 'truck' | 'bus';

export interface VehicleOptions {
  burnt?: boolean;
  paint?: 'tan' | 'green' | 'white' | 'blue' | 'red';
  /** Extra roll, for vehicles dumped in rubble. */
  roll?: number;
  pitch?: number;
  /** Missing glass and doors even when not burnt. */
  stripped?: boolean;
}

type PartKey = 'paint' | 'glass' | 'tyre' | 'metal' | 'dark';

class PartSet {
  private readonly groups = new Map<PartKey, THREE.BufferGeometry[]>();

  add(key: PartKey, geometry: THREE.BufferGeometry): void {
    let list = this.groups.get(key);
    if (!list) {
      list = [];
      this.groups.set(key, list);
    }
    list.push(geometry);
  }

  box(
    key: PartKey,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    bevel = 0.035,
    pitch = 0,
    roll = 0,
    tile = 2.2,
  ): void {
    this.add(key, placed(boxGeometry(w, h, d, bevel, tile), transform(x, y, z, 0, pitch, roll)));
  }

  merged(): Map<PartKey, THREE.BufferGeometry> {
    const out = new Map<PartKey, THREE.BufferGeometry>();
    for (const [key, list] of this.groups) {
      const merged = list.length === 1 ? list[0] : mergeGeometries(list, false);
      if (!merged) continue;
      if (list.length > 1) for (const geometry of list) geometry.dispose();
      out.set(key, merged);
    }
    return out;
  }
}

const PAINT_MATERIAL: Record<string, { id: MaterialId; color: number }> = {
  tan: { id: 'vehicle_paint_tan', color: 0xffffff },
  green: { id: 'vehicle_paint_green', color: 0xffffff },
  white: { id: 'vehicle_paint_tan', color: 0xe6e4de },
  blue: { id: 'vehicle_paint_green', color: 0x8ba6c4 },
  red: { id: 'vehicle_paint_tan', color: 0xb06048 },
};

export function derelictVehicle(
  sink: Sink,
  kind: VehicleKind,
  x: number,
  z: number,
  yaw: number,
  opts: VehicleOptions = {},
): void {
  const burnt = opts.burnt === true;
  const key = `${kind}|${burnt ? 'burnt' : 'intact'}`;
  const merged = vehicleGeometry(kind);
  const base = sink.ground(x, z);
  const lod = new THREE.LOD();
  lod.name = `vehicle:${key}`;
  lod.position.set(x, base, z);
  lod.rotation.set(opts.pitch ?? 0, yaw, opts.roll ?? 0, 'YXZ');

  const near = new THREE.Group();
  near.name = `${lod.name}:near`;
  const paintKey = opts.paint ?? 'tan';
  const paint = PAINT_MATERIAL[paintKey] ?? PAINT_MATERIAL.tan;
  const glassMeshes: THREE.Mesh[] = [];

  for (const [part, geometry] of merged) {
    if (part === 'glass' && (burnt || opts.stripped)) continue;
    const material = vehicleMaterial(sink, part, burnt, paint);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${lod.name}:${part}`;
    if (part === 'glass') glassMeshes.push(mesh);
    near.add(mesh);
  }
  lod.addLevel(near, 0);

  const silhouette = new THREE.Mesh(
    vehicleLodGeometry(kind),
    vehicleMaterial(sink, 'paint', burnt, paint),
  );
  silhouette.name = `${lod.name}:far`;
  lod.addLevel(silhouette, 38);

  sink.addObject(lod, {
    tier: 'structure',
    castShadow: true,
    chunkAt: new THREE.Vector3(x, base, z),
  });
  // Alpha-blended glass has no useful shadow, only a dark rectangle.
  for (const mesh of glassMeshes) mesh.castShadow = false;

  // Collision: chassis plus greenhouse. Two boxes read correctly for both
  // bullets and movement, and cost a fraction of a trimesh.
  const dims = VEHICLE_DIMS[kind];
  sink.addCollider(
    new THREE.Vector3(x, base + dims.chassisY, z),
    new THREE.Vector3(dims.length / 2, dims.chassisHalf, dims.width / 2),
    yaw,
    { surface: 'metal' },
  );
  sink.addCollider(
    new THREE.Vector3(
      x + Math.cos(yaw) * dims.cabOffset,
      base + dims.cabY,
      z - Math.sin(yaw) * dims.cabOffset,
    ),
    new THREE.Vector3(dims.cabLength / 2, dims.cabHalf, dims.width / 2 - 0.06),
    yaw,
    { surface: 'metal' },
  );
}

interface VehicleDims {
  length: number;
  width: number;
  chassisY: number;
  chassisHalf: number;
  cabOffset: number;
  cabY: number;
  cabHalf: number;
  cabLength: number;
}

const VEHICLE_DIMS: Record<VehicleKind, VehicleDims> = {
  pickup: {
    length: 5.3,
    width: 1.94,
    chassisY: 0.72,
    chassisHalf: 0.46,
    cabOffset: -0.35,
    cabY: 1.55,
    cabHalf: 0.38,
    cabLength: 1.85,
  },
  sedan: {
    length: 4.62,
    width: 1.8,
    chassisY: 0.62,
    chassisHalf: 0.38,
    cabOffset: -0.12,
    cabY: 1.28,
    cabHalf: 0.29,
    cabLength: 2.1,
  },
  truck: {
    length: 6.4,
    width: 2.24,
    chassisY: 0.92,
    chassisHalf: 0.58,
    cabOffset: 1.9,
    cabY: 1.96,
    cabHalf: 0.48,
    cabLength: 1.9,
  },
  bus: {
    length: 9.6,
    width: 2.48,
    chassisY: 1.02,
    chassisHalf: 0.66,
    cabOffset: 0,
    cabY: 2.32,
    cabHalf: 0.66,
    cabLength: 8.6,
  },
};

function vehicleMaterial(
  sink: Sink,
  part: PartKey,
  burnt: boolean,
  paint: { id: MaterialId; color: number },
): THREE.MeshStandardMaterial {
  if (burnt) {
    switch (part) {
      case 'tyre':
        return sink.ownMaterial('veh_burnt_tyre', 'rubber_tire', (m) => {
          m.color.setHex(0x1e1d1c, THREE.SRGBColorSpace);
          m.roughness = 1;
        });
      default:
        return sink.ownMaterial('veh_burnt_body', 'metal_rusted', (m) => {
          m.color.setHex(0x3a352f, THREE.SRGBColorSpace);
          m.roughness = 1;
          m.metalness = 0.85;
        });
    }
  }
  switch (part) {
    case 'paint':
      return sink.ownMaterial(`veh_paint_${paint.id}_${paint.color.toString(16)}`, paint.id, (m) => {
        m.color.setHex(paint.color, THREE.SRGBColorSpace);
      });
    case 'glass':
      return sink.ownMaterial('veh_glass', 'vehicle_glass', (m) => {
        const physical = m as THREE.MeshPhysicalMaterial;
        // Transmission would force three into an extra full-scene pass.
        physical.transmission = 0;
        m.transparent = true;
        m.opacity = 0.42;
        m.depthWrite = false;
        m.envMapIntensity = 1.6;
        m.color.setHex(0x9fb1a8, THREE.SRGBColorSpace);
      });
    case 'tyre':
      return sink.material('rubber_tire');
    case 'dark':
      return sink.ownMaterial('veh_dark', 'metal_panel', (m) => {
        m.color.setHex(0x4b4a47, THREE.SRGBColorSpace);
      });
    default:
      return sink.material('metal_rusted');
  }
}

const VEHICLE_CACHE = new Map<VehicleKind, Map<PartKey, THREE.BufferGeometry>>();

function vehicleGeometry(kind: VehicleKind): Map<PartKey, THREE.BufferGeometry> {
  let cached = VEHICLE_CACHE.get(kind);
  if (!cached) {
    cached = vehicleParts(kind);
    VEHICLE_CACHE.set(kind, cached);
  }
  return cached;
}

function vehicleParts(kind: VehicleKind): Map<PartKey, THREE.BufferGeometry> {
  const parts = new PartSet();
  switch (kind) {
    case 'pickup':
      buildPickup(parts);
      break;
    case 'sedan':
      buildSedan(parts);
      break;
    case 'truck':
      buildTruck(parts);
      break;
    case 'bus':
      buildBus(parts);
      break;
  }
  return parts.merged();
}

function vehicleLodGeometry(kind: VehicleKind): THREE.BufferGeometry {
  return cachedGeometry(`vehicle|lod|${kind}`, () => {
    const dims = VEHICLE_DIMS[kind];
    const parts: THREE.BufferGeometry[] = [
      placed(
        boxGeometry(dims.length, dims.chassisHalf * 2, dims.width, 0.06, 2.2),
        transform(0, dims.chassisY, 0),
      ),
      placed(
        boxGeometry(dims.cabLength, dims.cabHalf * 2, dims.width - 0.12, 0.06, 2.2),
        transform(dims.cabOffset, dims.cabY, 0),
      ),
    ];
    const merged = mergeGeometries(parts, false);
    for (const part of parts) part.dispose();
    return merged ?? parts[0];
  });
}

// ---------------------------------------------------------------------------
// Shared sub-assemblies
// ---------------------------------------------------------------------------

/** Tyre with a sidewall, a rim and a hub, plus the flared arch above it. */
function addWheel(
  parts: PartSet,
  x: number,
  y: number,
  z: number,
  radius: number,
  width: number,
  flat = false,
): void {
  const tyre = cachedGeometry(`wheel|tyre|${radius.toFixed(2)}|${width.toFixed(2)}`, () => {
    const geometry = new THREE.TorusGeometry(radius - 0.08, 0.085, 6, 14);
    geometry.rotateY(Math.PI / 2);
    const shell = new THREE.CylinderGeometry(radius, radius, width, 14, 1, true);
    shell.rotateZ(Math.PI / 2);
    const merged = mergeGeometries([geometry, shell], false);
    geometry.dispose();
    shell.dispose();
    return merged ?? geometry;
  });
  const rim = cachedGeometry(`wheel|rim|${radius.toFixed(2)}`, () => {
    const inner = new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, width * 0.7, 12, 1);
    inner.rotateZ(Math.PI / 2);
    const hub = new THREE.CylinderGeometry(radius * 0.18, radius * 0.18, width * 0.95, 8, 1);
    hub.rotateZ(Math.PI / 2);
    const merged = mergeGeometries([inner, hub], false);
    inner.dispose();
    hub.dispose();
    return merged ?? inner;
  });

  const squash = flat ? 0.72 : 1;
  const matrix = transform(x, y - (flat ? radius * 0.2 : 0), z, 0, 0, 0, new THREE.Vector3(1, squash, 1));
  parts.add('tyre', placed(tyre, matrix));
  parts.add('dark', placed(rim, matrix));
}

/** Flared arch over a wheel; without this a car reads as a shoebox. */
function addArch(parts: PartSet, x: number, y: number, z: number, radius: number, side: number): void {
  const segments = 5;
  for (let i = 0; i < segments; i++) {
    const a = (Math.PI * (i + 0.5)) / segments;
    const px = x + Math.cos(a) * radius * 1.06;
    const py = y + Math.sin(a) * radius * 1.06;
    parts.box('paint', px, py, z + side * 0.02, 0.3, 0.14, 0.16, 0.03, 0, a - Math.PI / 2);
  }
}

function addBumper(parts: PartSet, x: number, y: number, width: number): void {
  parts.box('metal', x, y, 0, 0.22, 0.26, width, 0.05);
  for (const s of [-1, 1]) {
    parts.box('metal', x - Math.sign(x) * 0.12, y - 0.02, s * (width / 2 - 0.1), 0.2, 0.18, 0.18, 0.04);
  }
}

function addExhaust(parts: PartSet, x: number, z: number): void {
  parts.add(
    'metal',
    placed(cylinderGeometry(0.045, 0.05, 0.7, 6, 1.0), transform(x, 0.35, z, 0, 0, Math.PI / 2)),
  );
}

function addGlassPanel(
  parts: PartSet,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  pitch: number,
): void {
  parts.add(
    'glass',
    placed(boxGeometry(w, h, d, 0.01, 1.2), transform(x, y, z, 0, 0, pitch)),
  );
}

// ---------------------------------------------------------------------------
// Vehicle bodies
// ---------------------------------------------------------------------------

function buildPickup(parts: PartSet): void {
  const width = 1.9;
  const half = width / 2;

  parts.box('paint', 0, 0.66, 0, 5.2, 0.38, width, 0.06);
  parts.box('dark', 0, 0.42, 0, 4.6, 0.2, width - 0.35, 0.04);

  // Bonnet, cab and bed.
  parts.box('paint', 1.62, 1.0, 0, 1.7, 0.36, width - 0.06, 0.07);
  parts.box('paint', -0.3, 1.28, 0, 1.9, 0.72, width - 0.04, 0.08);
  parts.box('paint', -0.3, 1.72, 0, 1.72, 0.2, width - 0.16, 0.06);
  for (const s of [-1, 1]) {
    parts.box('paint', -1.95, 1.12, s * (half - 0.08), 2.0, 0.55, 0.14, 0.03);
  }
  parts.box('paint', -2.9, 1.12, 0, 0.14, 0.55, width - 0.1, 0.03);
  parts.box('dark', -1.95, 0.88, 0, 2.0, 0.08, width - 0.28, 0.02);

  // Greenhouse.
  addGlassPanel(parts, 0.68, 1.5, 0, 0.1, 0.72, width - 0.22, 0.55);
  addGlassPanel(parts, -1.2, 1.5, 0, 0.1, 0.66, width - 0.24, -0.35);
  for (const s of [-1, 1]) {
    addGlassPanel(parts, -0.35, 1.5, s * (half - 0.06), 1.5, 0.6, 0.06, 0);
  }
  // Pillars keep the glass from floating.
  for (const s of [-1, 1]) {
    parts.box('paint', 0.62, 1.5, s * (half - 0.08), 0.14, 0.76, 0.12, 0.03, 0, 0.55);
    parts.box('paint', -1.16, 1.5, s * (half - 0.08), 0.13, 0.7, 0.12, 0.03, 0, -0.35);
  }

  for (const [wx, side] of [
    [1.58, 1],
    [1.58, -1],
    [-1.62, 1],
    [-1.62, -1],
  ] as const) {
    addWheel(parts, wx, 0.42, side * (half - 0.1), 0.42, 0.3, wx < 0 && side < 0);
    addArch(parts, wx, 0.5, side * half, 0.5, side);
  }

  addBumper(parts, 2.62, 0.62, width);
  addBumper(parts, -2.96, 0.66, width - 0.1);
  addExhaust(parts, -2.6, -0.55);
  // Grille and lights.
  parts.box('dark', 2.5, 0.94, 0, 0.1, 0.3, width - 0.4, 0.02);
  for (const s of [-1, 1]) {
    parts.box('glass', 2.48, 0.98, s * (half - 0.26), 0.08, 0.2, 0.34, 0.02);
  }
  // Mirrors.
  for (const s of [-1, 1]) {
    parts.box('dark', 0.55, 1.55, s * (half + 0.08), 0.1, 0.12, 0.2, 0.02);
  }
}

function buildSedan(parts: PartSet): void {
  const width = 1.76;
  const half = width / 2;

  parts.box('paint', 0, 0.6, 0, 4.5, 0.42, width, 0.08);
  parts.box('dark', 0, 0.38, 0, 4.0, 0.18, width - 0.3, 0.04);
  parts.box('paint', 1.5, 0.9, 0, 1.5, 0.28, width - 0.05, 0.08);
  parts.box('paint', -1.55, 0.92, 0, 1.3, 0.3, width - 0.05, 0.08);
  parts.box('paint', -0.05, 1.14, 0, 2.2, 0.42, width - 0.02, 0.1);
  parts.box('paint', -0.1, 1.42, 0, 1.9, 0.14, width - 0.2, 0.06);

  addGlassPanel(parts, 0.95, 1.24, 0, 0.09, 0.62, width - 0.24, 0.72);
  addGlassPanel(parts, -1.1, 1.26, 0, 0.09, 0.56, width - 0.26, -0.62);
  for (const s of [-1, 1]) {
    addGlassPanel(parts, -0.1, 1.26, s * (half - 0.05), 1.75, 0.44, 0.05, 0);
    parts.box('paint', 0.9, 1.28, s * (half - 0.07), 0.12, 0.66, 0.1, 0.02, 0, 0.72);
    parts.box('paint', -1.05, 1.28, s * (half - 0.07), 0.12, 0.6, 0.1, 0.02, 0, -0.62);
  }

  for (const [wx, side] of [
    [1.42, 1],
    [1.42, -1],
    [-1.42, 1],
    [-1.42, -1],
  ] as const) {
    addWheel(parts, wx, 0.36, side * (half - 0.07), 0.34, 0.24, side > 0 && wx > 0);
    addArch(parts, wx, 0.42, side * half, 0.42, side);
  }

  addBumper(parts, 2.32, 0.56, width - 0.06);
  addBumper(parts, -2.32, 0.58, width - 0.06);
  addExhaust(parts, -2.1, -0.5);
  parts.box('dark', 2.22, 0.86, 0, 0.09, 0.22, width - 0.5, 0.02);
  for (const s of [-1, 1]) {
    parts.box('glass', 2.2, 0.9, s * (half - 0.28), 0.07, 0.16, 0.3, 0.02);
    parts.box('dark', 0.85, 1.32, s * (half + 0.07), 0.09, 0.1, 0.18, 0.02);
  }
}

function buildTruck(parts: PartSet): void {
  const width = 2.2;
  const half = width / 2;

  parts.box('dark', 0, 0.62, 0, 6.2, 0.26, width - 0.4, 0.05);
  // Cab over the front axle.
  parts.box('paint', 1.9, 1.55, 0, 1.9, 1.5, width, 0.09);
  parts.box('paint', 1.9, 2.34, 0, 1.75, 0.12, width - 0.16, 0.05);
  addGlassPanel(parts, 2.82, 1.95, 0, 0.1, 0.9, width - 0.26, 0.06);
  for (const s of [-1, 1]) {
    addGlassPanel(parts, 1.75, 1.95, s * (half - 0.05), 1.2, 0.72, 0.06, 0);
  }

  // Flatbed with drop sides and a canvas hoop frame.
  parts.box('paint', -1.5, 0.86, 0, 4.0, 0.2, width, 0.05);
  for (const s of [-1, 1]) {
    parts.box('paint', -1.5, 1.24, s * (half - 0.07), 4.0, 0.62, 0.12, 0.03);
  }
  parts.box('paint', -3.4, 1.24, 0, 0.12, 0.62, width - 0.1, 0.03);
  for (let i = 0; i < 4; i++) {
    const x = -0.2 - i * 1.05;
    parts.add(
      'metal',
      placed(
        new THREE.TorusGeometry(half - 0.12, 0.035, 5, 10, Math.PI),
        transform(x, 1.55, 0, 0, 0, Math.PI / 2),
      ),
    );
  }

  for (const [wx, side] of [
    [2.05, 1],
    [2.05, -1],
    [-1.85, 1],
    [-1.85, -1],
    [-2.75, 1],
    [-2.75, -1],
  ] as const) {
    addWheel(parts, wx, 0.52, side * (half - 0.12), 0.52, 0.34, false);
    addArch(parts, wx, 0.6, side * half, 0.6, side);
  }

  addBumper(parts, 2.98, 0.7, width);
  addBumper(parts, -3.56, 0.78, width - 0.2);
  addExhaust(parts, 1.2, -half + 0.1);
  parts.box('dark', 2.86, 1.1, 0, 0.12, 0.4, width - 0.5, 0.03);
  for (const s of [-1, 1]) {
    parts.box('glass', 2.84, 1.12, s * (half - 0.3), 0.08, 0.24, 0.34, 0.02);
    parts.box('dark', 2.6, 2.05, s * (half + 0.12), 0.1, 0.3, 0.24, 0.02);
  }
}

function buildBus(parts: PartSet): void {
  const width = 2.44;
  const half = width / 2;
  const length = 9.4;

  parts.box('dark', 0, 0.66, 0, length - 0.4, 0.3, width - 0.3, 0.05);
  parts.box('paint', 0, 1.72, 0, length, 1.85, width, 0.1);
  parts.box('paint', 0, 2.72, 0, length - 0.3, 0.18, width - 0.14, 0.07);

  // Window band down each side plus a windscreen.
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const x = -length / 2 + 1.1 + i * 1.45;
      addGlassPanel(parts, x, 2.2, s * (half - 0.03), 1.2, 0.95, 0.06, 0);
      parts.box('paint', x + 0.72, 2.2, s * (half - 0.05), 0.16, 1.0, 0.1, 0.02);
    }
  }
  addGlassPanel(parts, length / 2 - 0.06, 2.15, 0, 0.08, 1.05, width - 0.3, 0.05);
  addGlassPanel(parts, -length / 2 + 0.06, 2.15, 0, 0.08, 0.95, width - 0.4, -0.05);

  for (const [wx, side] of [
    [3.1, 1],
    [3.1, -1],
    [-2.9, 1],
    [-2.9, -1],
  ] as const) {
    addWheel(parts, wx, 0.52, side * (half - 0.14), 0.52, 0.32, side < 0);
    addArch(parts, wx, 0.6, side * half, 0.62, side);
  }

  addBumper(parts, length / 2 + 0.14, 0.72, width - 0.1);
  addBumper(parts, -length / 2 - 0.14, 0.72, width - 0.1);
  parts.box('dark', length / 2 + 0.04, 1.1, 0, 0.1, 0.42, width - 0.6, 0.03);
  for (const s of [-1, 1]) {
    parts.box('glass', length / 2 + 0.02, 1.12, s * (half - 0.34), 0.08, 0.26, 0.36, 0.02);
  }
  // Roof hatches and a luggage rail.
  for (const s of [-1, 1]) {
    parts.box('metal', s * 2.2, 2.86, 0, 0.7, 0.1, 0.6, 0.03);
  }
}
