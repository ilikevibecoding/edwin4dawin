/**
 * Map and bearing conversions shared by the targeting tablet and the strike.
 *
 * Compass convention throughout: bearings are radians clockwise from north, north
 * is -Z and east is +X, which is what the rest of the engine already assumes for
 * yaw. Grid references use the aviation lettering the tablet draws, columns
 * lettered west to east and rows numbered north to south, so a callout matches
 * what is on screen.
 */
import * as THREE from 'three';
import { COMPASS_16 } from './Tuning';

const TAU = Math.PI * 2;

/** Wraps to [0, 2pi). */
export function normalizeBearing(bearing: number): number {
  const b = bearing % TAU;
  return b < 0 ? b + TAU : b;
}

/** Unit ground vector pointing along `bearing`. */
export function bearingToDirection(bearing: number, out: THREE.Vector3): THREE.Vector3 {
  return out.set(Math.sin(bearing), 0, -Math.cos(bearing));
}

/** Bearing of a ground direction. */
export function directionToBearing(direction: THREE.Vector3): number {
  return normalizeBearing(Math.atan2(direction.x, -direction.z));
}

/** `045 NE` — the readout the tablet and the callout both use. */
export function bearingLabel(bearing: number): string {
  const degrees = Math.round((normalizeBearing(bearing) * 180) / Math.PI) % 360;
  const sector = COMPASS_16[Math.round((degrees / 360) * 16) % 16];
  return `${degrees.toString().padStart(3, '0')} ${sector}`;
}

export function bearingDegrees(bearing: number): number {
  return Math.round((normalizeBearing(bearing) * 180) / Math.PI) % 360;
}

/** Grid columns per side of the map. Ten by ten covers 144 m in 14.4 m squares. */
export const GRID_DIVISIONS = 10;
const COLUMN_LETTERS = 'ABCDEFGHJK';

/** `E4` style reference for a world position. */
export function gridReference(point: THREE.Vector3, bounds: THREE.Box3 | null): string {
  if (!bounds) return '---';
  const u = (point.x - bounds.min.x) / Math.max(1e-3, bounds.max.x - bounds.min.x);
  const v = (point.z - bounds.min.z) / Math.max(1e-3, bounds.max.z - bounds.min.z);
  const column = THREE.MathUtils.clamp(Math.floor(u * GRID_DIVISIONS), 0, GRID_DIVISIONS - 1);
  const row = THREE.MathUtils.clamp(Math.floor(v * GRID_DIVISIONS), 0, GRID_DIVISIONS - 1);
  return `${COLUMN_LETTERS[column]}${row + 1}`;
}

export function gridColumnLabel(index: number): string {
  return COLUMN_LETTERS[THREE.MathUtils.clamp(index, 0, COLUMN_LETTERS.length - 1)];
}

/**
 * Intersects the ray through a normalised device coordinate with a horizontal
 * plane. This is how the tablet reticle maps back to the world; done with the
 * inverse projection rather than a Raycaster so it allocates nothing per frame.
 */
export function screenToGround(
  camera: THREE.Camera,
  ndcX: number,
  ndcY: number,
  planeY: number,
  out: THREE.Vector3,
  scratch: THREE.Vector3,
): boolean {
  out.set(ndcX, ndcY, 0.5).unproject(camera);
  camera.getWorldPosition(scratch);
  out.sub(scratch);
  if (Math.abs(out.y) < 1e-6) return false;
  const t = (planeY - scratch.y) / out.y;
  if (t < 0) return false;
  out.multiplyScalar(t).add(scratch);
  return true;
}

/**
 * Projects a world point to normalised device coordinates. Returns false when the
 * point is behind the camera, so blips off the back of a tilted tablet view are
 * dropped rather than mirrored to the wrong side of the screen.
 */
export function worldToScreen(
  camera: THREE.Camera,
  point: THREE.Vector3,
  out: THREE.Vector3,
): boolean {
  out.copy(point).project(camera);
  return out.z < 1;
}

/** Signed distance from `point` to the run-in axis, and its along-axis position. */
export function axisCoordinates(
  point: THREE.Vector3,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  right: THREE.Vector3,
  out: THREE.Vector2,
): THREE.Vector2 {
  const dx = point.x - origin.x;
  const dz = point.z - origin.z;
  out.set(dx * direction.x + dz * direction.z, dx * right.x + dz * right.z);
  return out;
}
