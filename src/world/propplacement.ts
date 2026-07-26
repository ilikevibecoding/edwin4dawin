import * as THREE from 'three';
import type { WorldModel } from './mapbuilder';

/**
 * Prop placement (Fable 3). Phase-2 graybox: representative cover volumes at
 * final furniture positions so combat, AI and navigation validate against the
 * true layout. Phase-4 replaces every entry with the finished prop library
 * builders (same footprints, registered in the asset manifest).
 */
export function placeProps(world: WorldModel, scene: THREE.Scene): void {
  // Populated by the Fable 3 production wave. Cover footprints for graybox
  // are placed via `grayboxCover` until then.
  grayboxCover(world);
}

interface CoverSpec {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  y?: number;
  label: string;
}

/** Final furniture footprints (positions reused by the real prop pass). */
export const COVER_PLAN: CoverSpec[] = [
  // Lobby
  { x: 21.5, z: 14.6, w: 3.4, d: 1.1, h: 1.12, label: 'reception-desk' },
  { x: 15.5, z: 12.5, w: 1.8, d: 0.8, h: 0.45, label: 'lobby-bench' },
  { x: 24.5, z: 8.5, w: 0.9, d: 0.9, h: 0.75, label: 'planter' },
  { x: 14.5, z: 8.0, w: 0.9, d: 0.9, h: 0.75, label: 'planter' },
  // Waiting
  { x: 14, z: 23, w: 2.1, d: 0.85, h: 0.78, label: 'sofa' },
  { x: 17.5, z: 24.5, w: 1.1, d: 0.6, h: 0.45, label: 'low-table' },
  // Cubicle floor: 8 pods of 2 desks (aligned to leave the center aisle)
  ...cubiclePods(),
  // Break room
  { x: 13.2, z: 28, w: 2.4, d: 0.65, h: 0.92, label: 'kitchen-counter' },
  { x: 16.5, z: 30.5, w: 1.4, d: 1.4, h: 0.75, label: 'break-table' },
  { x: 19.2, z: 27.5, w: 0.9, d: 0.8, h: 1.85, label: 'vending' },
  // Wellness
  { x: 14, z: 35.5, w: 2, d: 0.9, h: 0.6, label: 'cot' },
  { x: 18, z: 36.5, w: 1.1, d: 0.5, h: 1.3, label: 'cabinet' },
  // Copy room
  { x: 37.4, z: 23, w: 1.3, d: 0.75, h: 1.15, label: 'copier' },
  { x: 39.2, z: 27, w: 0.7, d: 1.8, h: 1.0, label: 'mail-shelf' },
  // IT
  { x: 50, z: 8, w: 3.4, d: 0.8, h: 0.74, label: 'it-bench' },
  { x: 52.8, z: 13, w: 0.9, d: 1.9, h: 1.9, label: 'it-shelf' },
  // Server room
  { x: 43.4, z: 12.4, w: 0.7, d: 2.8, h: 2.0, label: 'server-rack-row' },
  { x: 45.6, z: 12.4, w: 0.7, d: 2.8, h: 2.0, label: 'server-rack-row' },
  { x: 47.2, z: 16.2, w: 0.8, d: 1.2, h: 1.1, label: 'ups' },
  // Security office
  { x: 8, z: 17.5, w: 2.6, d: 0.8, h: 0.95, label: 'security-console' },
  { x: 10.8, z: 15, w: 0.6, d: 1.6, h: 1.8, label: 'locker' },
  // Main hall planters/benches
  { x: 26, z: 19.5, w: 1.8, d: 0.6, h: 0.75, label: 'hall-planter' },
  { x: 36, z: 19.5, w: 1.8, d: 0.6, h: 0.45, label: 'hall-bench' },
  // Loading
  { x: 42, z: 24, w: 1.2, d: 1.2, h: 1.15, label: 'crate-stack' },
  { x: 45.5, z: 27.5, w: 1.6, d: 1.1, h: 0.8, label: 'pallet-boxes' },
  { x: 43, z: 28.8, w: 0.9, d: 0.7, h: 1.3, label: 'hand-truck-zone' },
  // Garage
  { x: 40.5, z: 33.8, w: 2.1, d: 4.6, h: 1.5, label: 'response-van' },
  { x: 46.5, z: 32.5, w: 1.4, d: 1.1, h: 1.1, label: 'workbench' },
  { x: 48.8, z: 36, w: 1.2, d: 1.2, h: 1.4, label: 'barrel-group' },
  // Mech
  { x: 52.8, z: 32, w: 0.7, d: 2, h: 1.9, label: 'electrical-panel' },
  { x: 51.5, z: 36.5, w: 1.6, d: 1.2, h: 1.5, label: 'hvac-unit' },
  // Janitor
  { x: 41, z: 12, w: 0.8, d: 1.4, h: 1.6, label: 'janitor-shelf' },
  // Records (upper)
  ...archiveRacks(),
  // Conference (upper)
  { x: 38, z: 14, w: 4.2, d: 1.5, h: 0.76, y: 3.6, label: 'conference-table' },
  { x: 33, z: 11.5, w: 0.6, d: 1.4, h: 1.1, y: 3.6, label: 'credenza' },
  // Exec (upper)
  { x: 50, z: 10.5, w: 2.4, d: 1.1, h: 0.78, y: 3.6, label: 'exec-desk' },
  { x: 46, z: 15.5, w: 2.0, d: 0.9, h: 0.78, y: 3.6, label: 'exec-sofa' },
  { x: 52.8, z: 15.5, w: 0.6, d: 2.2, h: 2.0, y: 3.6, label: 'bookcase' },
  // Balcony (upper)
  { x: 20, z: 7.5, w: 1.6, d: 0.6, h: 0.45, y: 3.6, label: 'balcony-bench' },
  // Courtyard
  { x: 4, z: 3, w: 1.6, d: 0.6, h: 0.5, label: 'court-bench' },
  { x: 14, z: 2, w: 2.2, d: 0.9, h: 0.8, label: 'snow-planter' },
  { x: 20, z: 4, w: 1.2, d: 1.2, h: 0.9, label: 'snow-drift-cover' },
];

function cubiclePods(): CoverSpec[] {
  const specs: CoverSpec[] = [];
  const rows = [23.4, 27.2, 31.4, 35.2];
  const cols = [22.6, 27.0, 31.4];
  let i = 0;
  for (const z of rows) {
    for (const x of cols) {
      // skip a couple for breathing room / route variety
      if ((z === 27.2 && x === 27.0) || (z === 31.4 && x === 22.6)) {
        i++;
        continue;
      }
      specs.push({ x, z, w: 3.2, d: 1.9, h: 1.24, label: `cubicle-pod-${i++}` });
    }
  }
  return specs;
}

function archiveRacks(): CoverSpec[] {
  const specs: CoverSpec[] = [];
  for (let i = 0; i < 4; i++) {
    specs.push({ x: 7.6 + 0.001, z: 8.6 + i * 2.6, w: 3.4, d: 0.65, h: 2.0, y: 3.6, label: `archive-rack-${i}` });
  }
  return specs;
}

function grayboxCover(world: WorldModel): void {
  const mat = new THREE.MeshStandardMaterial({ color: 0x7d858d, roughness: 0.85 });
  const group = new THREE.Group();
  group.name = 'graybox-cover';
  for (const c of COVER_PLAN) {
    const y = c.y ?? 0;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), mat);
    mesh.position.set(c.x, y + c.h / 2, c.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `cover:${c.label}`;
    group.add(mesh);
    world.collision.addStatic({
      id: `cover:${c.label}`,
      min: new THREE.Vector3(c.x - c.w / 2, y, c.z - c.d / 2),
      max: new THREE.Vector3(c.x + c.w / 2, y + c.h, c.z + c.d / 2),
      surface: 'wood',
      tag: c.label,
    });
  }
  world.group.add(group);
  // rebuild broadphase including cover
  const b = { minX: -6, minZ: -8, maxX: 62, maxZ: 46 };
  world.collision.build(b.minX, b.minZ, b.maxX, b.maxZ);
}
