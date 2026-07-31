/**
 * The centre-screen canvas: crosshair, hitmarker and damage arcs.
 *
 * All three share one canvas because they overlap and all three are per-pixel
 * work. The layer redraws only when at least one of them reports a change, so a
 * standing player with no incoming fire costs one comparison per frame and no
 * canvas work at all.
 */
import { CanvasLayer, setClass } from '../Dom';
import type { FrameState } from '../HudState';
import type { CrosshairStyle } from '../Settings';
import { clamp } from '../../core/MathUtils';
import { Crosshair, type CrosshairFrame } from './Crosshair';
import { DamageIndicators } from './DamageIndicators';
import { Hitmarker, type HitKind } from './Hitmarker';

export class ReticleLayer {
  readonly crosshair = new Crosshair();
  readonly hitmarker = new Hitmarker();
  readonly damage = new DamageIndicators();

  private readonly layer: CanvasLayer;
  private readonly frame: CrosshairFrame = {
    fov: 80,
    viewportHeight: 1080,
    style: 'dynamic',
    scopeAmount: 0,
  };
  private dirty = true;
  private hidden = false;

  constructor(parent: HTMLElement) {
    this.layer = new CanvasLayer('ob-reticle', parent);
  }

  resize(): void {
    if (this.layer.measure(2)) this.dirty = true;
  }

  hitmarkerAt(kind: HitKind): void {
    this.hitmarker.trigger(kind);
    this.dirty = true;
  }

  update(state: FrameState, dt: number, style: CrosshairStyle, fov: number, viewportHeight: number): void {
    const frame = this.frame;
    if (frame.style !== style || frame.fov !== fov || frame.viewportHeight !== viewportHeight) {
      frame.style = style;
      frame.fov = fov;
      frame.viewportHeight = viewportHeight;
      this.dirty = true;
    }
    frame.scopeAmount = state.scopeAmount;

    if (this.crosshair.update(state, dt, frame)) this.dirty = true;
    if (this.hitmarker.update(dt)) this.dirty = true;
    if (this.damage.update(dt)) this.dirty = true;

    // While dead the whole layer is dropped rather than faded per-element.
    const hide = !state.alive;
    if (hide !== this.hidden) {
      this.hidden = hide;
      setClass(this.layer.canvas, 'faded', hide);
      this.dirty = true;
    }
    if (hide || !this.dirty) return;

    this.dirty = false;
    const ctx = this.layer.begin();
    const cx = this.layer.width * 0.5;
    const cy = this.layer.height * 0.5;
    const size = Math.min(this.layer.width, this.layer.height);
    const scale = clamp(this.layer.height / 720, 0.85, 3);
    this.crosshair.draw(ctx, cx, cy, state, frame);
    // Close enough to the crosshair to be read without moving the eye. Pushed
    // out towards the frame edge it stops being a bearing and turns into border
    // decoration, which is the failure mode this indicator exists to avoid.
    this.damage.draw(ctx, cx, cy, size * 0.26, state.yaw, scale);
    this.hitmarker.draw(ctx, cx, cy, clamp(size / 400, 0.8, 2.2));
  }

  reset(): void {
    this.crosshair.reset();
    this.hitmarker.reset();
    this.damage.clear();
    this.dirty = true;
  }

  dispose(): void {
    this.layer.dispose();
  }
}
