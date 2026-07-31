/**
 * The reticle.
 *
 * Four ticks whose gap tracks the weapon's live cone of fire, so the crosshair is
 * a truthful readout of where the next round can go rather than decoration. The
 * conversion from cone half-angle to pixels uses the camera's own field of view,
 * which means the ticks stay honest while the FOV slider moves and while ADS
 * zooms in.
 */
import { COLOR } from '../Theme';
import type { CrosshairStyle } from '../Settings';
import type { FrameState } from '../HudState';
import { coneToPixels, dot, outlinedArc, outlinedLine, rgba } from './Draw';
import { clamp, saturate, smoothstep } from '../../core/MathUtils';

export interface CrosshairFrame {
  /** Camera vertical FOV in degrees. */
  fov: number;
  /** Viewport height in CSS pixels. */
  viewportHeight: number;
  style: CrosshairStyle;
  /** Extra fade applied by the scope overlay. */
  scopeAmount: number;
}

/**
 * Tick geometry is quoted at 720p and scaled from there, so the reticle keeps
 * the same apparent size on a 4K display instead of shrinking to a few pixels.
 */
const REFERENCE_HEIGHT = 720;

/** Per weapon class: tick length, thickness and how wide the base gap sits. */
const SHAPE: Record<string, { len: number; width: number; base: number; dot: boolean }> = {
  ar: { len: 9.5, width: 1.6, base: 4, dot: true },
  smg: { len: 8.5, width: 1.6, base: 5, dot: true },
  lmg: { len: 11, width: 1.9, base: 6, dot: false },
  sniper: { len: 12, width: 1.4, base: 3, dot: true },
  shotgun: { len: 7, width: 1.8, base: 11, dot: false },
  pistol: { len: 7.5, width: 1.5, base: 3.5, dot: true },
  launcher: { len: 12, width: 1.6, base: 9, dot: false },
  melee: { len: 6, width: 1.5, base: 2, dot: true },
};

export class Crosshair {
  /** True while the reticle still needs redrawing (it is animating). */
  private lastGap = -1;
  private lastAlpha = -1;
  private lastClass = '';

  /** Smoothed spread so a single shot does not make the ticks jitter. */
  private gap = 6;

  update(state: FrameState, dt: number, frame: CrosshairFrame): boolean {
    const shape = SHAPE[state.weaponClass] ?? SHAPE.ar;
    const scale = scaleFor(frame);
    const cone = coneToPixels(state.spread, frame.fov, frame.viewportHeight);
    const target = Math.max(shape.base * scale, Math.min(cone, frame.viewportHeight * 0.32));
    // Fast to open, slower to close: opening is information the player needs
    // immediately, closing is recovery and should read as settling.
    const rate = target > this.gap ? 26 : 13;
    this.gap += (target - this.gap) * Math.min(1, dt * rate);
    const alpha = this.alphaFor(state, frame);
    const changed =
      Math.abs(this.gap - this.lastGap) > 0.25 ||
      Math.abs(alpha - this.lastAlpha) > 0.01 ||
      state.weaponClass !== this.lastClass;
    return changed;
  }

  draw(ctx: CanvasRenderingContext2D, cx: number, cy: number, state: FrameState, frame: CrosshairFrame): void {
    const shape = SHAPE[state.weaponClass] ?? SHAPE.ar;
    const alpha = this.alphaFor(state, frame);
    this.lastGap = this.gap;
    this.lastAlpha = alpha;
    this.lastClass = state.weaponClass;
    if (alpha <= 0.01 || frame.style === 'none') return;

    const scale = scaleFor(frame);
    const base = shape.base * scale;
    const gap = frame.style === 'dynamic' ? this.gap : base;
    const width = shape.width * scale;
    const white = rgba(COLOR.white, alpha);
    const accent = rgba(COLOR.accent, alpha);
    // Heavier than the default rim: the reticle has to survive a sunlit wall,
    // which is where a thin white line has nothing to sit against.
    const rim = 0.75;

    if (frame.style === 'dot') {
      dot(ctx, cx, cy, 1.7 * scale, white);
      return;
    }

    if (frame.style === 'chevron') {
      const s = 7 * scale;
      outlinedLine(ctx, cx - s, cy - s * 0.5, cx, cy + s * 0.35, width, white, rim);
      outlinedLine(ctx, cx + s, cy - s * 0.5, cx, cy + s * 0.35, width, white, rim);
      return;
    }

    const len = shape.len * scale;
    // Ticks sit on half-pixel centres so the stroke lands symmetrically.
    const x = Math.round(cx) + 0.5;
    const y = Math.round(cy) + 0.5;
    outlinedLine(ctx, x, y - gap, x, y - gap - len, width, white, rim);
    outlinedLine(ctx, x, y + gap, x, y + gap + len, width, white, rim);
    outlinedLine(ctx, x - gap, y, x - gap - len, y, width, white, rim);
    outlinedLine(ctx, x + gap, y, x + gap + len, y, width, white, rim);

    if (shape.dot) dot(ctx, x, y, (gap > base + 1 ? 1.3 : 1.6) * scale, white);

    // The shotgun's pellet cone is the whole point of the weapon, so it gets the
    // cone itself drawn as a pair of faint arcs rather than implied by the gap.
    if (state.weaponClass === 'shotgun') {
      const r = gap + len * 0.5;
      outlinedArc(ctx, x, y, r, -0.42, 0.42, scale, rgba(COLOR.white, alpha * 0.45));
      outlinedArc(ctx, x, y, r, Math.PI - 0.42, Math.PI + 0.42, scale, rgba(COLOR.white, alpha * 0.45));
    }

    // Cooking a grenade: an arc that closes as the fuse burns down.
    if (state.grenadeCook > 0.01) {
      const r = gap + len + 8 * scale;
      const sweep = Math.PI * 2 * state.grenadeCook;
      outlinedArc(ctx, x, y, r, -Math.PI / 2, -Math.PI / 2 + sweep, 2.2 * scale, accent);
    }
  }

  /**
   * Hidden while aiming — the sight is the reticle then. Magnified optics fade
   * out sooner so the crosshair is gone before the scope picture arrives.
   */
  private alphaFor(state: FrameState, frame: CrosshairFrame): number {
    if (!state.alive) return 0;
    const scoped = state.scope === 'sniper' || state.scope === 'acog' || state.scope === 'thermal';
    const ads = smoothstep(scoped ? 0.05 : 0.2, scoped ? 0.45 : 0.85, state.adsAmount);
    const sprint = state.tacticalSprint ? 0.45 : 0;
    return saturate(1 - Math.max(ads, frame.scopeAmount, sprint));
  }

  reset(): void {
    this.lastGap = -1;
    this.lastAlpha = -1;
    this.gap = 6;
  }
}

function scaleFor(frame: CrosshairFrame): number {
  return clamp(frame.viewportHeight / REFERENCE_HEIGHT, 0.85, 3);
}
