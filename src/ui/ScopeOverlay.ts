import type { HudState } from './HudSystem';
import { clamp } from '../core/MathX';

/**
 * ScopeOverlay.ts — the sniper's full-screen scope picture.
 *
 * A black vignette with a circular aperture, a mil-dot reticle, a chromatic
 * fringe at the glass edge, a slow lens-breathing wobble and an occasional
 * scope glint. Only appears for a `scoped` weapon once ADS is near full; fades
 * with the ADS blend so the transition from iron-sight tracks the weapon.
 */

function reticleSvg(): string {
  const c = 50;
  const gap = 5;
  const parts: string[] = [];
  // Fine outer crosshair with a central gap.
  parts.push(`<line x1="${c}" y1="2" x2="${c}" y2="${c - gap}" stroke-width="0.5"/>`);
  parts.push(`<line x1="${c}" y1="${c + gap}" x2="${c}" y2="98" stroke-width="0.5"/>`);
  parts.push(`<line x1="2" y1="${c}" x2="${c - gap}" y2="${c}" stroke-width="0.5"/>`);
  parts.push(`<line x1="${c + gap}" y1="${c}" x2="98" y2="${c}" stroke-width="0.5"/>`);
  // Heavy posts near the edges.
  parts.push(`<line x1="${c}" y1="2" x2="${c}" y2="14" stroke-width="1.4"/>`);
  parts.push(`<line x1="${c}" y1="86" x2="${c}" y2="98" stroke-width="1.4"/>`);
  parts.push(`<line x1="2" y1="${c}" x2="14" y2="${c}" stroke-width="1.4"/>`);
  parts.push(`<line x1="86" y1="${c}" x2="98" y2="${c}" stroke-width="1.4"/>`);
  // Mil dots along each axis.
  for (let i = 1; i <= 5; i++) {
    const d = i * 6;
    parts.push(`<circle class="dot" cx="${c}" cy="${c - gap - d}" r="0.6"/>`);
    parts.push(`<circle class="dot" cx="${c}" cy="${c + gap + d}" r="0.6"/>`);
    parts.push(`<circle class="dot" cx="${c - gap - d}" cy="${c}" r="0.6"/>`);
    parts.push(`<circle class="dot" cx="${c + gap + d}" cy="${c}" r="0.6"/>`);
  }
  parts.push(`<circle class="dot" cx="${c}" cy="${c}" r="0.5"/>`);
  return `<svg viewBox="0 0 100 100">${parts.join('')}</svg>`;
}

export class ScopeOverlay {
  readonly el: HTMLDivElement;
  private shown = false;
  private lastOp = -1;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'hud-scope';
    this.el.innerHTML = `
      <div class="mask"></div>
      <div class="fringe"></div>
      <div class="glass"></div>
      <div class="glint"></div>
      <div class="reticle">${reticleSvg()}</div>`;
    root.appendChild(this.el);
  }

  /** True while the scope picture is (partly) up — HUD hides the crosshair. */
  get active(): boolean {
    return this.shown;
  }

  update(s: HudState) {
    const spec = s.weapons?.current;
    const ads = s.weapons?.adsAmount ?? s.player?.adsAmount ?? 0;
    const scoped = spec?.scoped ?? false;
    const op = scoped ? clamp((ads - 0.55) / 0.4, 0, 1) : 0;

    const shown = op > 0.01;
    if (shown !== this.shown) {
      this.el.classList.toggle('show', shown);
      this.shown = shown;
    }
    const q = Math.round(op * 100) / 100;
    if (q !== this.lastOp) {
      this.el.style.opacity = q.toFixed(2);
      this.lastOp = q;
    }
  }

  dispose() {
    this.el.remove();
  }
}
