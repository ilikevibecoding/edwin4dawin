import * as THREE from 'three';
import type { HudState } from './HudSystem';
import { clamp, TAU } from '../core/MathX';

/**
 * HealthIndicator.ts — CoD-style health feedback with no permanent bar.
 *
 * Health reads entirely through the screen edges: an escalating blood vignette
 * as it drops, a directional flash punched toward the hit source, a heartbeat
 * pulse and blinking CRITICAL warning near death, and a soft green regeneration
 * glow once the player has been out of fire long enough to recover.
 */
export class HealthIndicator {
  readonly el: HTMLDivElement;
  private vig: HTMLDivElement;
  private hitflash: HTMLDivElement;
  private regen: HTMLDivElement;
  private warn: HTMLDivElement;

  private lastDmg = -1;
  private lastHealth = 1;
  private critical = false;
  private regenActive = false;
  private forced: number | null = null;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'hud-health';
    this.el.innerHTML = `
      <div class="hud-vig"></div>
      <div class="hud-regen"></div>
      <div class="hud-hitflash"></div>
      <div class="hud-warn hud-cond">CRITICAL</div>`;
    root.appendChild(this.el);
    this.vig = this.el.querySelector('.hud-vig')!;
    this.regen = this.el.querySelector('.hud-regen')!;
    this.hitflash = this.el.querySelector('.hud-hitflash')!;
    this.warn = this.el.querySelector('.hud-warn')!;
  }

  /** Directional damage flash from a world position (relative to player aim). */
  flashFrom(world: THREE.Vector3, s: HudState) {
    let rel = 0;
    const p = s.player;
    if (p) {
      const dx = world.x - p.position.x;
      const dz = world.z - p.position.z;
      const angTo = Math.atan2(-dx, -dz);
      rel = ((angTo - p.yaw + Math.PI) % TAU) - Math.PI;
      if (rel < -Math.PI) rel += TAU;
    }
    const fx = clamp(50 + Math.sin(rel) * 52, 2, 98);
    const fy = clamp(50 - Math.cos(rel) * 42, 4, 96);
    this.hitflash.style.setProperty('--fx', `${fx.toFixed(0)}%`);
    this.hitflash.style.setProperty('--fy', `${fy.toFixed(0)}%`);
    this.hitflash.classList.remove('go');
    void this.hitflash.offsetWidth;
    this.hitflash.classList.add('go');
  }

  setForced(frac: number | null) {
    this.forced = frac;
  }

  update(s: HudState) {
    const p = s.player;
    const frac = this.forced ?? (p ? clamp(p.health / p.maxHealth, 0, 1) : 1);

    // Vignette ramps in below ~65% health, hard toward zero.
    const dmg = frac >= 0.65 ? 0 : Math.pow(clamp((0.65 - frac) / 0.65, 0, 1), 1.4);
    const q = Math.round(dmg * 100) / 100;
    if (q !== this.lastDmg) {
      this.el.style.setProperty('--dmg', q.toFixed(2));
      this.lastDmg = q;
    }

    const crit = frac > 0 && frac < 0.25;
    if (crit !== this.critical) {
      this.vig.classList.toggle('pulse', crit);
      this.warn.classList.toggle('on', crit);
      this.critical = crit;
    }

    // Regen: health climbing back and not yet full (and not forced/demo).
    const regenNow =
      this.forced === null && p != null && frac < 0.999 && frac > this.lastHealth + 1e-4;
    if (regenNow !== this.regenActive) {
      this.regen.classList.toggle('on', regenNow);
      this.regenActive = regenNow;
    }
    this.lastHealth = frac;
  }

  dispose() {
    this.el.remove();
  }
}
