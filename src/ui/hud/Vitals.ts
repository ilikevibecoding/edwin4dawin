/**
 * Health and the full-screen feedback that goes with it.
 *
 * Modern shooters mostly do without a health bar and let the screen tell the
 * story, but a bar answers "can I take one more hit" instantly and the screen
 * effect answers "am I in trouble" pre-attentively, so both are here: a small
 * segmented readout in the corner and an escalating blood vignette with a
 * heartbeat pulse over the whole frame.
 */
import { div, setClass, setStyle, setVar, span } from '../Dom';
import type { FrameState } from '../HudState';
import { saturate, smoothstep } from '../../core/MathUtils';

const SEGMENTS = 10;

const STANCE_LABEL: Record<string, string> = {
  stand: 'STANDING',
  crouch: 'CROUCHED',
  prone: 'PRONE',
  slide: 'SLIDING',
  mantle: 'CLIMBING',
};

export class Vitals {
  readonly root: HTMLDivElement;

  private readonly numEl: HTMLElement;
  private readonly stanceEl: HTMLElement;
  private readonly segs: HTMLDivElement[] = [];

  private lastHealth = -1;
  private lastFilled = -1;

  constructor(parent: HTMLElement) {
    this.root = div('ob-vit', parent);

    const head = div('ob-vit-head', this.root);
    span('lbl', head, 'Vitals');
    this.stanceEl = span('lbl ob-vit-state', head, 'STANDING');

    const body = div('ob-vit-body', this.root);
    this.numEl = span('ob-vit-num n', body, '100');
    // Reserves its own column so the glyph appearing never reflows the number.
    span('ob-vit-regen', body, '+');
    const segs = div('ob-vit-segs', body);
    for (let i = 0; i < SEGMENTS; i++) this.segs.push(div('ob-vit-seg', segs));
  }

  update(state: FrameState): void {
    const health = Math.ceil(state.health);
    if (health !== this.lastHealth) {
      this.lastHealth = health;
      this.numEl.textContent = String(health);
    }

    const filled = Math.ceil(state.healthFraction * SEGMENTS);
    if (filled !== this.lastFilled) {
      this.lastFilled = filled;
      for (let i = 0; i < SEGMENTS; i++) setClass(this.segs[i], 'spent', i >= filled);
    }

    setClass(this.root, 'hurt', state.healthFraction <= 0.62);
    setClass(this.root, 'critical', state.healthFraction <= 0.3);
    setClass(this.root, 'regen', state.regenerating);

    const label = state.tacticalSprint
      ? 'TAC SPRINT'
      : state.sprinting
        ? 'SPRINTING'
        : (STANCE_LABEL[state.stance] ?? 'STANDING');
    if (this.stanceEl.textContent !== label) this.stanceEl.textContent = label;
  }
}

/**
 * Screen-wide feedback: blood on a hit, desaturation and a pulse at low health,
 * grit while under fire. Opacity only, so each of these is one composited layer
 * and never touches layout.
 */
export class ScreenFx {
  readonly root: HTMLDivElement;

  private readonly damage: HTMLDivElement;
  private readonly low: HTMLDivElement;
  private readonly grit: HTMLDivElement;

  private lastDamage = -1;
  private lastLow = -1;
  private lastGrit = -1;

  constructor(parent: HTMLElement) {
    this.root = div('ob-fx', parent);
    this.damage = div('ob-fx-damage', this.root);
    this.low = div('ob-fx-low', this.root);
    this.grit = div('ob-fx-grit', this.root);
  }

  update(state: FrameState): void {
    // The hit flash rides on top of whatever the low-health layer is doing, so
    // taking a hit at 90 health still reads. On death it backs off: the death
    // screen supplies its own grade and the two together read as pink.
    const damage = state.alive ? saturate(state.damageFlash) * 0.9 : 0.5;
    const low = state.alive ? smoothstep(0.5, 0.1, state.healthFraction) : 0;
    const grit = saturate(state.suppression) * 0.8;

    this.write(this.damage, damage, 'lastDamage');
    this.write(this.low, low, 'lastLow');
    this.write(this.grit, grit, 'lastGrit');
    setClass(this.low, 'beat', low > 0.45);
  }

  private write(node: HTMLDivElement, value: number, field: 'lastDamage' | 'lastLow' | 'lastGrit'): void {
    const last = this[field];
    if (Math.abs(value - last) < 0.015 && !(value === 0 && last !== 0)) return;
    this[field] = value;
    setVar(node, 'opacity', value, 3);
    // A layer at zero opacity can still cost a composited pass with a backdrop
    // filter attached, so it is taken out of the tree's paint order entirely.
    setStyle(node, 'visibility', value <= 0.002 ? 'hidden' : 'visible');
  }
}
