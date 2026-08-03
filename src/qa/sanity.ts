/**
 * Runtime sanity checks.
 *
 * These run continuously (cheaply) in the diagnostics overlay and exhaustively
 * from the automated tour. They catch the failure modes that are easy to ship
 * by accident and hard to see in a single screenshot: NaN transforms, objects
 * that have wandered outside the staging volume, a camera buried in a wall,
 * characters below the deck, and audio cues that never fired.
 */

import * as THREE from 'three';
import type { World } from '../show/world';
import { INTERIOR_ORIGIN, BAY_STATION } from '../show/world';
import { CORRIDOR_WIDTH, CORRIDOR_HEIGHT } from '../interior/corridor';
import {
  BAY_WIDTH,
  BAY_DEPTH,
  BAY_HEIGHT,
  BOARDING_X,
  PLATFORM_Y,
  PLATFORM_BACK_Z,
  PLATFORM_FRONT_Z,
} from '../interior/pod-bay';

export type Severity = 'info' | 'warn' | 'error';

export interface Issue {
  severity: Severity;
  code: string;
  detail: string;
}

const MAX_ABS = 1e6;

function isFiniteVec(v: THREE.Vector3): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}

export interface SanityInput {
  world: World;
  camera: THREE.PerspectiveCamera;
  time: number;
  fps: number;
  audioPeak: number;
  missingNarration: string[];
  webglErrors: number;
}

/**
 * Height of walkable deck at a corridor station. Everything is at zero except
 * the pod bay's boarding platform and the ramp that climbs onto it, which the
 * droids legitimately stand on.
 */
function deckHeightAt(x: number, z: number): number {
  const bz = z - BAY_STATION;
  if (Math.abs(x - BOARDING_X) > 2.0) return 0;
  if (bz >= PLATFORM_BACK_Z - 0.1 && bz <= PLATFORM_FRONT_Z + 0.1) return PLATFORM_Y;
  const rampStart = PLATFORM_BACK_Z - 2.3;
  if (bz > rampStart && bz < PLATFORM_BACK_Z) {
    return (PLATFORM_Y * (bz - rampStart)) / (PLATFORM_BACK_Z - rampStart);
  }
  return 0;
}

export function runSanityChecks(input: SanityInput): Issue[] {
  const issues: Issue[] = [];
  const { world, camera } = input;

  /* --- NaN and out-of-bounds transforms --- */
  const check = (obj: THREE.Object3D, label: string, bound = MAX_ABS) => {
    if (!isFiniteVec(obj.position)) {
      issues.push({ severity: 'error', code: 'nan-transform', detail: `${label} position is not finite` });
      return;
    }
    if (!Number.isFinite(obj.quaternion.x + obj.quaternion.y + obj.quaternion.z + obj.quaternion.w)) {
      issues.push({ severity: 'error', code: 'nan-rotation', detail: `${label} rotation is not finite` });
    }
    if (
      Math.abs(obj.position.x) > bound ||
      Math.abs(obj.position.y) > bound ||
      Math.abs(obj.position.z) > bound
    ) {
      issues.push({
        severity: 'error',
        code: 'out-of-bounds',
        detail: `${label} at ${obj.position.toArray().map((n) => Math.round(n)).join(', ')}`,
      });
    }
  };

  check(camera, 'camera', 60000);
  check(world.runner.group, 'corvette', 60000);
  check(world.destroyer.group, 'destroyer', 60000);
  if (world.pod.group.visible) check(world.pod.group, 'escape pod', 60000);

  /* --- camera inside solid geometry --- */
  const BAY_FORWARD_Z = BAY_STATION - BAY_DEPTH / 2;
  const BAY_AFT_Z = BAY_STATION + BAY_DEPTH / 2;
  if (world.currentRegion === 'interior') {
    const local = camera.position.clone().sub(INTERIOR_ORIGIN);
    const inBay = local.z > BAY_FORWARD_Z;
    const halfW = inBay ? BAY_WIDTH / 2 : CORRIDOR_WIDTH / 2;
    const maxY = (inBay ? BAY_HEIGHT : CORRIDOR_HEIGHT) + 0.05;
    if (Math.abs(local.x) > halfW - 0.06) {
      issues.push({
        severity: 'error',
        code: 'camera-in-wall',
        detail: `camera x=${local.x.toFixed(2)} outside ±${(halfW - 0.06).toFixed(2)}`,
      });
    }
    if (local.y < 0.12 || local.y > maxY) {
      issues.push({
        severity: 'error',
        code: 'camera-through-floor',
        detail: `camera y=${local.y.toFixed(2)} outside 0.12..${maxY.toFixed(2)}`,
      });
    }
    if (local.z < -0.4 || local.z > BAY_AFT_Z - 0.1) {
      issues.push({
        severity: 'error',
        code: 'camera-out-of-set',
        detail: `camera z=${local.z.toFixed(2)}`,
      });
    }
  }

  /* --- characters standing on the deck --- */
  if (world.currentRegion === 'interior') {
    const figures: Array<[string, THREE.Object3D, boolean]> = [
      ['leia', world.leia.group, world.leia.group.visible],
      ['vader', world.vader.group, world.vader.group.visible],
      ['r2', world.r2.group, world.r2.group.visible],
      ['c3po', world.c3po.group, world.c3po.group.visible],
      ...world.rebels.map((r, i) => [`rebel-${i}`, r.group, r.group.visible] as [string, THREE.Object3D, boolean]),
      ...world.troopers.map((t, i) => [`trooper-${i}`, t.group, t.group.visible] as [string, THREE.Object3D, boolean]),
    ];
    for (const [name, obj, visible] of figures) {
      if (!visible) continue;
      // Figures are children of the interior group, so their transform is
      // already expressed in corridor-local space.
      const local = obj.position;
      if (Math.abs(local.y - deckHeightAt(local.x, local.z)) > 0.08) {
        issues.push({ severity: 'error', code: 'figure-off-floor', detail: `${name} y=${local.y.toFixed(2)}` });
      }
      const inBay = local.z > BAY_FORWARD_Z;
      const halfW = inBay ? BAY_WIDTH / 2 - 0.3 : CORRIDOR_WIDTH / 2;
      if (Math.abs(local.x) > halfW) {
        issues.push({ severity: 'warn', code: 'figure-in-wall', detail: `${name} x=${local.x.toFixed(2)}` });
      }
      if (local.z < -1 || local.z > BAY_AFT_Z) {
        issues.push({ severity: 'warn', code: 'figure-off-set', detail: `${name} z=${local.z.toFixed(2)}` });
      }
    }
  }

  /* --- audio and assets --- */
  if (input.missingNarration.length) {
    issues.push({
      severity: 'warn',
      code: 'missing-narration',
      detail: `${input.missingNarration.length} clip(s) unavailable: ${input.missingNarration.slice(0, 6).join(', ')}`,
    });
  }
  if (input.audioPeak > 0.985) {
    issues.push({ severity: 'warn', code: 'audio-peak', detail: `master peak ${input.audioPeak.toFixed(3)}` });
  }
  if (input.webglErrors > 0) {
    issues.push({ severity: 'error', code: 'webgl-error', detail: `${input.webglErrors} GL error(s)` });
  }
  if (input.fps > 0 && input.fps < 18) {
    issues.push({ severity: 'warn', code: 'low-fps', detail: `${input.fps.toFixed(1)} fps` });
  }

  return issues;
}

/** Scan a whole subtree for NaN vertices — used once after construction. */
export function checkGeometryIntegrity(root: THREE.Object3D): Issue[] {
  const issues: Issue[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute | undefined;
    if (!pos) {
      issues.push({ severity: 'error', code: 'missing-geometry', detail: `${mesh.name || mesh.type} has no positions` });
      return;
    }
    const arr = pos.array as ArrayLike<number>;
    for (let i = 0; i < arr.length; i++) {
      if (!Number.isFinite(arr[i])) {
        issues.push({ severity: 'error', code: 'nan-vertex', detail: `${mesh.name || mesh.type} vertex ${i}` });
        return;
      }
    }
    if (!mesh.material) {
      issues.push({ severity: 'error', code: 'missing-material', detail: mesh.name || mesh.type });
    }
  });
  return issues;
}
