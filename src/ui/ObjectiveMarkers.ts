import * as THREE from 'three';
import type { HudState } from './HudSystem';
import { clamp } from '../core/MathX';

/**
 * ObjectiveMarkers.ts — world-space markers projected to screen.
 *
 * The active objective shows as an amber diamond with a live distance readout;
 * hostiles show as red threat diamonds. Markers clamp to the screen edge (as an
 * arrow) when their target is off-screen or behind the camera, so they always
 * point the player the right way. Elements are pooled to avoid per-frame churn.
 */

interface Marker {
  world: THREE.Vector3;
  cap: string;
  threat: boolean;
}

const MAX_THREATS = 4;

export class ObjectiveMarkers {
  readonly el: HTMLDivElement;
  private pool: HTMLDivElement[] = [];
  private _v = new THREE.Vector3();
  private _c = new THREE.Vector3();
  private markers: Marker[] = [];

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'hud-obj-layer';
    root.appendChild(this.el);
  }

  private acquire(i: number): HTMLDivElement {
    let n = this.pool[i];
    if (!n) {
      n = document.createElement('div');
      n.className = 'hud-obj';
      n.innerHTML = `<div class="dia"><b>◆</b></div><div class="dist hud-num"></div><div class="cap hud-cond"></div>`;
      this.el.appendChild(n);
      this.pool[i] = n;
    }
    return n;
  }

  update(s: HudState) {
    const cam = s.camera;
    cam.updateMatrixWorld();

    // Build the live marker set.
    this.markers.length = 0;
    if (s.objectivePos) this.markers.push({ world: s.objectivePos, cap: 'OBJECTIVE', threat: false });
    if (s.ai) {
      const origin = s.player ? s.player.eye : cam.position;
      const hostiles = s.ai
        .hostiles()
        .map((h) => ({ h, d: origin.distanceToSquared(h.position) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, MAX_THREATS);
      for (const { h } of hostiles) {
        this.markers.push({
          world: this._c.copy(h.position).setY(h.position.y + 1.5).clone(),
          cap: 'HOSTILE',
          threat: true,
        });
      }
    }

    const W = s.vw;
    const H = s.vh;
    const pad = Math.min(W, H) * 0.06;

    let used = 0;
    for (const m of this.markers) {
      const node = this.acquire(used);
      // Camera-space depth: three cameras look down -z, so in-front => z < 0.
      this._v.copy(m.world).applyMatrix4(cam.matrixWorldInverse);
      const inFront = this._v.z < 0;

      this._v.copy(m.world).project(cam);
      let sx = (this._v.x * 0.5 + 0.5) * W;
      let sy = (-this._v.y * 0.5 + 0.5) * H;
      let edge = false;

      if (!inFront || this._v.x < -1 || this._v.x > 1 || this._v.y < -1 || this._v.y > 1) {
        // Clamp to a ring/rectangle around screen centre, pointing at the target.
        let dx = sx - W / 2;
        let dy = sy - H / 2;
        if (!inFront) {
          dx = -dx;
          dy = -dy;
        }
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;
        const halfW = W / 2 - pad;
        const halfH = H / 2 - pad;
        const scale = Math.min(halfW / Math.abs(dx || 1e-3), halfH / Math.abs(dy || 1e-3));
        sx = W / 2 + dx * scale;
        sy = H / 2 + dy * scale;
        edge = true;
      }

      sx = clamp(sx, pad, W - pad);
      sy = clamp(sy, pad, H - pad);

      const dist = (s.player ? s.player.position : cam.position).distanceTo(m.world);
      node.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) translate(-50%,-50%)`;
      node.classList.toggle('threat', m.threat);
      node.classList.toggle('edge', edge);
      const distEl = node.querySelector('.dist') as HTMLElement;
      const capEl = node.querySelector('.cap') as HTMLElement;
      // Threats stay icon-only (a red diamond) to avoid a wall of overlapping
      // labels when several enemies bunch up; the objective carries full text.
      const showText = !m.threat;
      distEl.style.display = showText ? '' : 'none';
      capEl.style.display = showText && !edge ? '' : 'none';
      distEl.textContent = `${Math.round(dist)}M`;
      capEl.textContent = m.cap;
      node.style.display = '';
      used++;
    }

    for (let i = used; i < this.pool.length; i++) this.pool[i].style.display = 'none';
  }

  dispose() {
    this.el.remove();
  }
}
