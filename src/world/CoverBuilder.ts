import * as THREE from 'three';
import type { CoverPoint } from '../core/Contracts';
import { GAMEPLAY } from '../core/Config';
import type { ColliderRecord } from './Builder';
import type { WorldNavGrid } from './NavBuilder';

/**
 * Cover extraction.
 *
 * Cover is derived from the collision boxes rather than authored by hand, which
 * is the only way to keep it honest: if a wall moves, its cover moves with it,
 * and a piece of cover can never point at something that is not there.
 *
 * A box qualifies when it stands on the ground (so there is something to crouch
 * behind, not a lintel two metres up) and its top is between shin and head
 * height. Each vertical face is then sampled along its length, and every sample
 * that lands on a walkable navigation cell becomes a cover point with peek
 * positions towards the ends of the face.
 *
 * The sampling runs in two passes: the first takes the middle of every
 * qualifying face, the second fills the rest in. So if the cap is ever reached,
 * it truncates the dense runs along long walls rather than dropping whichever
 * district happened to be built last.
 *
 * `normal` points from the cover position into the obstacle: it is the direction
 * the threat is expected to come from, so an agent can accept a piece of cover
 * with `dot(normalize(threat - cover), normal) > 0`.
 */

const RADIUS = GAMEPLAY.player.radius;
/** Stand-off from the face: body radius plus enough room to lean. */
const STANDOFF = RADIUS + 0.26;
/** Below this the box is a kerb, above it there is nothing to shoot over. */
const MIN_COVER = 0.55;
const MAX_COVER = 2.6;
/** Cover taller than this protects a standing agent. */
const STAND_COVER = 1.32;
const SAMPLE_SPACING = 1.6;
/** Points closer together than this are the same firing position. */
const DEDUPE = 1.15;
/** Faces shorter than this cannot hide anybody. */
const MIN_FACE = 0.3;

export interface CoverBuildOptions {
  nav: WorldNavGrid;
  /** Cap, so a pathological amount of geometry cannot flood the AI. */
  limit?: number;
}

export function buildCoverPoints(
  colliders: readonly ColliderRecord[],
  opts: CoverBuildOptions,
): CoverPoint[] {
  const { nav } = opts;
  const limit = opts.limit ?? 2400;
  const points: CoverPoint[] = [];
  const seen = new Set<string>();
  const axisX = new THREE.Vector3();
  const axisZ = new THREE.Vector3();

  for (let pass = 0; pass < 2; pass++) {
    for (const record of colliders) {
      if (record.noCover) continue;
      if (record.half.y * 2 < MIN_COVER) continue;
      const top = record.center.y + record.half.y;
      const bottom = record.center.y - record.half.y;

      const cos = Math.cos(record.yaw);
      const sin = Math.sin(record.yaw);
      // Local axes in world space. Yaw follows the kit convention: +local X runs
      // along (cos, -sin) and +local Z along (sin, cos).
      axisX.set(cos, 0, -sin);
      axisZ.set(sin, 0, cos);

      for (let face = 0; face < 4; face++) {
        const alongX = face === 0 || face === 2;
        const sign = face === 0 || face === 1 ? 1 : -1;
        const tangent = alongX ? axisX : axisZ;
        const halfLength = alongX ? record.half.x : record.half.z;
        const halfDepth = alongX ? record.half.z : record.half.x;
        if (halfLength < MIN_FACE) continue;

        // Outward direction of this face.
        const ox = (alongX ? axisZ.x : axisX.x) * sign;
        const oz = (alongX ? axisZ.z : axisX.z) * sign;

        const samples = Math.max(1, Math.round((halfLength * 2) / SAMPLE_SPACING));
        const middle = samples >> 1;
        for (let i = 0; i < samples; i++) {
          if (pass === 0 ? i !== middle : i === middle) continue;
          const t = samples === 1 ? 0 : -halfLength + ((i + 0.5) * (halfLength * 2)) / samples;
          const px = record.center.x + tangent.x * t + ox * (halfDepth + STANDOFF);
          const pz = record.center.z + tangent.z * t + oz * (halfDepth + STANDOFF);

          const ground = nav.heightAt(px, pz, bottom + 0.4);
          if (ground === null) continue;
          const exposed = top - ground;
          if (exposed < MIN_COVER || exposed > MAX_COVER) continue;
          // The box must reach down to where the agent stands, or it is a canopy.
          if (bottom > ground + 0.55) continue;

          const key = `${Math.round(px / DEDUPE)}|${Math.round(pz / DEDUPE)}|${Math.round(ground / 2)}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const position = new THREE.Vector3(px, ground, pz);
          const reach = Math.min(halfLength + 0.5, 1.7);
          points.push({
            position,
            normal: new THREE.Vector3(-ox, 0, -oz),
            low: exposed < STAND_COVER,
            peekLeft: peekAt(nav, position, tangent, reach, ground),
            peekRight: peekAt(nav, position, tangent, -reach, ground),
          });
          if (points.length >= limit) return points;
        }
      }
    }
  }
  return points;
}

/** Peek position along the face, dropped when it is not on walkable ground. */
function peekAt(
  nav: WorldNavGrid,
  position: THREE.Vector3,
  tangent: THREE.Vector3,
  distance: number,
  ground: number,
): THREE.Vector3 | null {
  const x = position.x + tangent.x * distance;
  const z = position.z + tangent.z * distance;
  const height = nav.heightAt(x, z, ground);
  if (height === null || Math.abs(height - ground) > GAMEPLAY.player.stepHeight) return null;
  return new THREE.Vector3(x, height, z);
}
