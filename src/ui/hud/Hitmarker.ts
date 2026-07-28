/**
 * Hit confirmation.
 *
 * The only thing in this HUD allowed to appear instantly. 60 ms of scale-in and
 * 180 ms of fade-out is short enough that it reads as part of the shot rather
 * than as an animation, and the eye still resolves the colour: white for a body
 * hit, amber and heavier for a headshot, blue for armour, and a red starburst
 * with a ring for a kill.
 */
import { COLOR } from '../Theme';
import { TIMING } from '../Theme';
import { outlinedArc, outlinedLine, rgba } from './Draw';

export type HitKind = 'normal' | 'headshot' | 'kill' | 'armor';

interface Style {
  color: string;
  width: number;
  inner: number;
  outer: number;
  rays: number;
  ring: boolean;
  life: number;
}

const STYLES: Record<HitKind, Style> = {
  normal: { color: COLOR.white, width: 1.9, inner: 4.5, outer: 11, rays: 4, ring: false, life: 0.24 },
  headshot: { color: COLOR.warn, width: 2.9, inner: 4.5, outer: 13.5, rays: 4, ring: false, life: 0.28 },
  armor: { color: COLOR.friendly, width: 2.2, inner: 6.5, outer: 11.5, rays: 4, ring: false, life: 0.24 },
  kill: { color: COLOR.danger, width: 3.1, inner: 5, outer: 17, rays: 8, ring: true, life: 0.34 },
};

export class Hitmarker {
  private kind: HitKind = 'normal';
  private t = -1;

  trigger(kind: HitKind): void {
    // A kill overrides a body hit landing in the same instant; a body hit never
    // downgrades a kill that is still on screen.
    if (this.t >= 0 && this.kind === 'kill' && kind !== 'kill') return;
    this.kind = kind;
    this.t = 0;
  }

  get active(): boolean {
    return this.t >= 0;
  }

  update(dt: number): boolean {
    if (this.t < 0) return false;
    // A confirm that is triggered and expires inside the same frame never gets
    // drawn at all. That is exactly what happens on a hitch, which is when the
    // player most needs to know the round landed, so the first frame after a
    // trigger always draws before the clock is allowed to advance.
    if (this.t === 0) {
      this.t = Number.EPSILON;
      return true;
    }
    this.t += dt;
    if (this.t > STYLES[this.kind].life) this.t = -1;
    return true;
  }

  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number): void {
    if (this.t < 0) return;
    const style = STYLES[this.kind];
    const t = this.t;
    const grow = Math.min(1, t / TIMING.hitmarkerIn);
    const fade = Math.max(0, 1 - Math.max(0, t - TIMING.hitmarkerIn) / TIMING.hitmarkerOut);
    // Overshoots on the way in and drifts outward as it fades, which is what
    // makes it read as an impact rather than a blink.
    const size = (1.55 - 0.55 * grow + (1 - fade) * 0.22) * scale;
    const alpha = fade * fade;
    const color = rgba(style.color, alpha);
    const inner = style.inner * size;
    const outer = style.outer * size;
    const step = (Math.PI * 2) / style.rays;
    const phase = style.rays === 8 ? Math.PI / 8 : Math.PI / 4;

    for (let i = 0; i < style.rays; i++) {
      const a = phase + i * step;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      outlinedLine(
        ctx,
        cx + dx * inner,
        cy + dy * inner,
        cx + dx * outer,
        cy + dy * outer,
        style.width * Math.max(0.7, size * 0.8),
        color,
        alpha * 0.5,
      );
    }

    if (style.ring) {
      const r = outer * (0.8 + (1 - fade) * 0.9);
      outlinedArc(ctx, cx, cy, r, 0, Math.PI * 2, 1.4, rgba(style.color, alpha * 0.5), alpha * 0.25);
    }
  }

  reset(): void {
    this.t = -1;
  }
}
