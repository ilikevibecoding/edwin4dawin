import * as THREE from 'three';
import type { CollisionWorld, RayHit } from '../world/collision';
import type { GlassSystem } from '../world/glassy';
import type { SurfaceKind, WeaponDef } from './types';
import { events } from '../core/events';

/** Analytic hit volumes registered by characters (AI + hostages). */
export interface HitVolume {
  ownerId: string;
  part: 'head' | 'body' | 'limb';
  /** capsule segment (p0=p1 for sphere) */
  p0: THREE.Vector3;
  p1: THREE.Vector3;
  r: number;
}

export interface ShotOutcome {
  kind: 'none' | 'world' | 'character' | 'glass-through';
  surface?: SurfaceKind;
  point?: THREE.Vector3;
  normal?: THREE.Vector3;
  targetId?: string;
  part?: 'head' | 'body' | 'limb';
  damage?: number;
  distance?: number;
}

export function raySphere(o: THREE.Vector3, d: THREE.Vector3, c: THREE.Vector3, r: number): number | null {
  const oc = o.clone().sub(c);
  const b = oc.dot(d);
  const cc = oc.lengthSq() - r * r;
  const disc = b * b - cc;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t > 0 ? t : null;
}

export function rayCapsule(o: THREE.Vector3, d: THREE.Vector3, p0: THREE.Vector3, p1: THREE.Vector3, r: number): number | null {
  if (p0.distanceToSquared(p1) < 1e-8) return raySphere(o, d, p0, r);
  // coarse but robust: sample spheres along the segment
  const steps = Math.max(2, Math.ceil(p0.distanceTo(p1) / (r * 0.8)));
  let best: number | null = null;
  const tmp = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    tmp.lerpVectors(p0, p1, i / steps);
    const t = raySphere(o, d, tmp, r);
    if (t !== null && (best === null || t < best)) best = t;
  }
  return best;
}

export class CombatSystem {
  private col: CollisionWorld;
  private glass: GlassSystem;
  /** dynamic list, provided by AI system each step */
  hitVolumes: HitVolume[] = [];
  /** damage handler by character id */
  onCharacterHit: (id: string, part: 'head' | 'body' | 'limb', damage: number, from: THREE.Vector3, dir: THREE.Vector3) => void = () => {};

  constructor(col: CollisionWorld, glass: GlassSystem) {
    this.col = col;
    this.glass = glass;
  }

  /**
   * Hitscan shot with glass pass-through and limited surface penetration.
   * excludeOwner filters hit volumes (shooter's own).
   */
  shoot(
    origin: THREE.Vector3, dir: THREE.Vector3, weapon: WeaponDef,
    excludeOwner: string, damageMult = 1,
  ): ShotOutcome {
    let o = origin.clone();
    let remainingDist = Math.max(weapon.range * 2.4, 30);
    let dmgScale = damageMult;
    let guard = 0;
    let traveled = 0;

    while (guard++ < 6) {
      const worldHits = this.col.raycastAll(o, dir, remainingDist).filter((h) => !h.box.noBlock);
      // character hit
      let charT = Infinity;
      let charVol: HitVolume | null = null;
      for (const hv of this.hitVolumes) {
        if (hv.ownerId === excludeOwner) continue;
        const t = rayCapsule(o, dir, hv.p0, hv.p1, hv.r);
        if (t !== null && t < charT && t <= remainingDist) {
          charT = t;
          charVol = hv;
        }
      }
      const firstWorld: RayHit | undefined = worldHits[0];

      if (charVol && charT < (firstWorld?.t ?? Infinity)) {
        const point = o.clone().addScaledVector(dir, charT);
        const dist = traveled + charT;
        const falloff = THREE.MathUtils.clamp(1 - Math.max(0, dist - weapon.range) / weapon.range, 0.45, 1);
        const dmg = weapon.damage * (charVol.part === 'head' ? weapon.headshotMult : charVol.part === 'limb' ? 0.75 : 1) * falloff * dmgScale;
        this.onCharacterHit(charVol.ownerId, charVol.part, dmg, o, dir);
        return {
          kind: 'character', targetId: charVol.ownerId, part: charVol.part,
          damage: dmg, point, distance: dist,
        };
      }

      if (!firstWorld) return { kind: 'none' };

      const hit = firstWorld;
      const point = hit.point;
      const surface = hit.box.surface;
      // glass pane pass-through
      if (hit.dynamicId?.startsWith('glass:')) {
        const paneId = hit.dynamicId.slice(6);
        const broke = this.glass.hit(paneId, point, weapon.damage * dmgScale);
        events.emit('impact', {
          surface: 'glass',
          pos: [point.x, point.y, point.z],
          normal: [hit.normal.x, hit.normal.y, hit.normal.z],
        });
        if (broke) {
          // continue through with mild loss
          const adv = hit.t + 0.05;
          o = o.clone().addScaledVector(dir, adv);
          traveled += adv;
          remainingDist -= adv;
          dmgScale *= 0.88;
          continue;
        }
        return { kind: 'world', surface: 'glass', point, normal: hit.normal, distance: traveled + hit.t };
      }

      // impact event
      events.emit('impact', {
        surface,
        pos: [point.x, point.y, point.z],
        normal: [hit.normal.x, hit.normal.y, hit.normal.z],
      });

      // limited penetration through thin soft surfaces
      if (weapon.penetration > 0.2 && (surface === 'drywall' || surface === 'wood' || surface === 'plastic')) {
        // thickness estimate: march the exit
        const inside = o.clone().addScaledVector(dir, hit.t + 0.01);
        const exitHit = exitDistance(inside, dir, hit);
        if (exitHit !== null && exitHit < weapon.penetration * 0.45) {
          const adv = hit.t + exitHit + 0.02;
          const exitPoint = o.clone().addScaledVector(dir, adv);
          events.emit('impact', {
            surface,
            pos: [exitPoint.x, exitPoint.y, exitPoint.z],
            normal: [-hit.normal.x, -hit.normal.y, -hit.normal.z],
          });
          o = exitPoint;
          traveled += adv;
          remainingDist -= adv;
          dmgScale *= 0.5;
          continue;
        }
      }
      return { kind: 'world', surface, point, normal: hit.normal, distance: traveled + hit.t };
    }
    return { kind: 'none' };
  }
}

/** Distance from a point inside box to its exit along dir. */
function exitDistance(inside: THREE.Vector3, dir: THREE.Vector3, hit: RayHit): number | null {
  const b = hit.box;
  let tExit = Infinity;
  const o = [inside.x, inside.y, inside.z];
  const d = [dir.x, dir.y, dir.z];
  const bmin = [b.min.x, b.min.y, b.min.z];
  const bmax = [b.max.x, b.max.y, b.max.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) continue;
    const t1 = (bmin[i] - o[i]) / d[i];
    const t2 = (bmax[i] - o[i]) / d[i];
    const tFar = Math.max(t1, t2);
    tExit = Math.min(tExit, tFar);
  }
  return isFinite(tExit) && tExit > 0 ? tExit : null;
}
