import * as THREE from 'three';
import type { HudState } from './HudSystem';
import { TAU } from '../core/MathX';

/**
 * DamageIndicator.ts — directional damage chevrons around the crosshair.
 *
 * Each incoming hit spawns an arc segment pointing toward the world-space
 * source (relative to where the player is looking), which fades over ~1.5s.
 * Multiple sources stack. Built from SVG so the arcs stay crisp at any DPI.
 */

function chevronPath(): string {
  const cx = 50;
  const cy = 50;
  const rOut = 43;
  const rIn = 33;
  const spread = 26; // degrees each side of top
  const pt = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  };
  const [oxs, oys] = pt(-spread, rOut);
  const [oxe, oye] = pt(spread, rOut);
  const [ixe, iye] = pt(spread, rIn);
  const [ixs, iys] = pt(-spread, rIn);
  return (
    `M${oxs.toFixed(2)} ${oys.toFixed(2)} ` +
    `A${rOut} ${rOut} 0 0 1 ${oxe.toFixed(2)} ${oye.toFixed(2)} ` +
    `L${ixe.toFixed(2)} ${iye.toFixed(2)} ` +
    `A${rIn} ${rIn} 0 0 0 ${ixs.toFixed(2)} ${iys.toFixed(2)} Z`
  );
}

export class DamageIndicator {
  readonly el: HTMLDivElement;
  private live = new Set<HTMLElement>();

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'hud-dmg-layer';
    // Shared gradient for every chevron.
    this.el.innerHTML = `
      <svg width="0" height="0" style="position:absolute" aria-hidden="true">
        <defs>
          <radialGradient id="hud-dmg-grad" cx="50%" cy="0%" r="100%">
            <stop offset="42%" stop-color="rgba(255,60,44,0)"/>
            <stop offset="78%" stop-color="rgba(255,64,48,0.6)"/>
            <stop offset="100%" stop-color="rgba(255,80,60,1)"/>
          </radialGradient>
        </defs>
      </svg>`;
    root.appendChild(this.el);
  }

  show(world: THREE.Vector3, s: HudState, hold = false) {
    let rel = 0;
    const p = s.player;
    if (p) {
      const dx = world.x - p.position.x;
      const dz = world.z - p.position.z;
      const angTo = Math.atan2(-dx, -dz);
      rel = ((angTo - p.yaw + Math.PI) % TAU) - Math.PI;
      if (rel < -Math.PI) rel += TAU;
    }
    const deg = (rel * 180) / Math.PI;

    const d = document.createElement('div');
    d.className = 'hud-dmg' + (hold ? ' hold' : '');
    d.style.transform = `rotate(${deg.toFixed(1)}deg)`;
    d.innerHTML = `<svg viewBox="0 0 100 100"><path class="arc" d="${chevronPath()}"/></svg>`;
    if (!hold) {
      const done = () => {
        d.removeEventListener('animationend', done);
        this.live.delete(d);
        d.remove();
      };
      d.addEventListener('animationend', done);
      window.setTimeout(done, 1800);
    }
    this.live.add(d);
    this.el.appendChild(d);
  }

  clear() {
    for (const d of this.live) d.remove();
    this.live.clear();
  }

  dispose() {
    this.clear();
    this.el.remove();
  }
}
