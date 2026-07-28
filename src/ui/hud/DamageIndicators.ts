/**
 * Directional damage arcs.
 *
 * Combat hands over the world-space direction the damaging force travelled in,
 * so the shooter is at the opposite end of it. What is stored is that world
 * direction, not a screen angle: the bearing is resolved against the player's
 * yaw every frame, so an arc keeps pointing at the shooter while the player spins
 * to face them, which is the entire purpose of the indicator.
 */
import type * as THREE from 'three';
import { COLOR, TIMING } from '../Theme';
import { outlinedArc, rgba } from './Draw';

interface Arc {
  /** Unit XZ direction from the player towards the source. */
  x: number;
  z: number;
  age: number;
  strength: number;
}

const MAX_ARCS = 6;
const HALF_WIDTH = 0.3;

export class DamageIndicators {
  private readonly arcs: Arc[] = [];

  /** `direction` points from the shooter towards the player. */
  push(direction: THREE.Vector3, strength = 1): void {
    let x = -direction.x;
    let z = -direction.z;
    const len = Math.hypot(x, z);
    if (len < 1e-4) {
      x = 0;
      z = 1;
    } else {
      x /= len;
      z /= len;
    }

    for (const arc of this.arcs) {
      // Two hits from roughly the same place refresh one arc instead of stacking
      // into an unreadable smear. cos(20 deg) ~ 0.94.
      if (arc.x * x + arc.z * z > 0.94) {
        arc.x = x;
        arc.z = z;
        arc.age = 0;
        arc.strength = Math.min(1.4, arc.strength + strength * 0.5);
        return;
      }
    }
    if (this.arcs.length >= MAX_ARCS) this.arcs.shift();
    this.arcs.push({ x, z, age: 0, strength: Math.min(1.4, strength) });
  }

  get active(): boolean {
    return this.arcs.length > 0;
  }

  update(dt: number): boolean {
    if (this.arcs.length === 0) return false;
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const arc = this.arcs[i];
      arc.age += dt;
      if (arc.age >= TIMING.damageIndicator) this.arcs.splice(i, 1);
    }
    return true;
  }

  /** `scale` is the shared 720p-referenced HUD scale, so strokes hold up at 4K. */
  draw(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    yaw: number,
    scale: number,
  ): void {
    // View basis in the XZ plane. Forward is -Z at yaw 0, which is the engine's
    // convention for both the camera and the compass.
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);

    for (const arc of this.arcs) {
      const life = 1 - arc.age / TIMING.damageIndicator;
      // Snaps to full opacity then decays: the first moments are the flash that
      // catches the eye, the tail is the reminder.
      const alpha = life > 0.85 ? 1 : life * life * 1.05;
      const fromUp = Math.atan2(arc.x * rx + arc.z * rz, arc.x * fx + arc.z * fz);
      const centre = fromUp - Math.PI / 2;
      const width = HALF_WIDTH * (0.7 + 0.5 * arc.strength);
      const r = radius * (1 + (1 - life) * 0.08);
      outlinedArc(
        ctx,
        cx,
        cy,
        r,
        centre - width,
        centre + width,
        5.5 * scale * Math.min(1.4, arc.strength),
        rgba(COLOR.danger, alpha * 0.92),
        alpha * 0.45,
      );
      // A shorter, brighter cap outside the body. Two concentric strokes of
      // different lengths give the arc a direction to point in; one even band
      // reads as a fragment of a ring around the crosshair.
      outlinedArc(
        ctx,
        cx,
        cy,
        r + 6 * scale,
        centre - width * 0.5,
        centre + width * 0.5,
        2 * scale,
        rgba(COLOR.white, alpha * 0.62),
        alpha * 0.3,
      );
    }
  }

  clear(): void {
    this.arcs.length = 0;
  }
}
