import type { WeaponSpec } from '../core/Contracts';
import type { HudState } from './HudSystem';

const FIRE_MODE_LABEL: Record<string, string> = {
  auto: 'AUTO',
  semi: 'SEMI',
  burst: 'BURST',
  pump: 'PUMP',
  bolt: 'BOLT',
};

const ARC_R = 15;
const ARC_C = 2 * Math.PI * ARC_R;

/**
 * AmmoPanel.ts — bottom-right weapon/ammo readout.
 *
 * Big weapon name, a large tabular mag count over a smaller reserve, a fire-mode
 * tag, and a visual magazine (ticks for small mags, a depleting meter for large
 * ones). Flashes red when low, greys out with a progress arc while reloading,
 * and pops the numerals when they change.
 */
export class AmmoPanel {
  readonly el: HTMLDivElement;
  private nameEl: HTMLDivElement;
  private subEl: HTMLDivElement;
  private magEl: HTMLSpanElement;
  private resEl: HTMLSpanElement;
  private barEl: HTMLDivElement;
  private arcPrg: SVGCircleElement;
  private ticks: HTMLDivElement[] = [];
  private meterFill: HTMLElement | null = null;
  private useMeter = false;

  private weaponId = '';
  private magSize = 0;
  private lastMag = -1;
  private lastReserve = -1;
  private reloading = false;
  private reloadStart = 0;
  private reloadDur = 0;
  private popTimer = 0;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'hud-ammo';
    this.el.innerHTML = `
      <div class="hud-ammo-name hud-cond hud-cond-r"></div>
      <div class="hud-ammo-sub hud-cond hud-cond-r"></div>
      <div class="hud-ammo-counts">
        <span class="mag">0</span><span class="sep">/</span><span class="res">0</span>
      </div>
      <div class="hud-ammo-bar"></div>
      <div class="hud-ammo-arc">
        <svg viewBox="0 0 36 36">
          <circle class="trk" cx="18" cy="18" r="${ARC_R}"></circle>
          <circle class="prg" cx="18" cy="18" r="${ARC_R}"
            stroke-dasharray="${ARC_C.toFixed(2)}" stroke-dashoffset="${ARC_C.toFixed(2)}"></circle>
        </svg>
      </div>`;
    root.appendChild(this.el);
    this.nameEl = this.el.querySelector('.hud-ammo-name')!;
    this.subEl = this.el.querySelector('.hud-ammo-sub')!;
    this.magEl = this.el.querySelector('.mag')!;
    this.resEl = this.el.querySelector('.res')!;
    this.barEl = this.el.querySelector('.hud-ammo-bar')!;
    this.arcPrg = this.el.querySelector('.prg')!;
  }

  private setWeapon(spec: WeaponSpec) {
    this.weaponId = spec.id;
    this.magSize = spec.magSize;
    this.nameEl.textContent = spec.displayName;
    this.subEl.innerHTML = `${spec.className} · <span class="fm">${FIRE_MODE_LABEL[spec.fireMode] ?? spec.fireMode}</span>`;
    this.buildMagazine(spec.magSize);
    this.lastMag = -1;
    this.lastReserve = -1;
  }

  private buildMagazine(size: number) {
    this.barEl.innerHTML = '';
    this.ticks = [];
    this.meterFill = null;
    this.useMeter = size > 30;
    if (this.useMeter) {
      this.barEl.className = 'hud-ammo-meter';
      const fill = document.createElement('i');
      this.barEl.appendChild(fill);
      this.meterFill = fill;
    } else {
      this.barEl.className = 'hud-ammo-bar';
      for (let i = 0; i < size; i++) {
        const t = document.createElement('div');
        t.className = 'hud-mag-t';
        this.barEl.appendChild(t);
        this.ticks.push(t);
      }
    }
  }

  beginReload(duration: number) {
    this.reloading = true;
    this.reloadStart = performance.now();
    this.reloadDur = Math.max(0.1, duration) * 1000;
    this.el.classList.add('reloading');
  }

  endReload() {
    this.reloading = false;
    this.el.classList.remove('reloading');
    this.arcPrg.setAttribute('stroke-dashoffset', ARC_C.toFixed(2));
  }

  update(s: HudState) {
    const w = s.weapons;
    if (!w) return;
    if (w.current.id !== this.weaponId) this.setWeapon(w.current);

    // Reload safety: keep class in sync with the live weapon state.
    if (w.reloading && !this.reloading) this.beginReload(w.current.reloadTime);
    if (!w.reloading && this.reloading) this.endReload();

    if (this.reloading) {
      const p = Math.min(1, (performance.now() - this.reloadStart) / this.reloadDur);
      this.arcPrg.setAttribute('stroke-dashoffset', (ARC_C * (1 - p)).toFixed(2));
    }

    const mag = w.magAmmo;
    const reserve = w.reserveAmmo;
    if (mag !== this.lastMag) {
      this.magEl.textContent = String(mag);
      this.magEl.classList.remove('pop');
      // reflow to restart animation
      void this.magEl.offsetWidth;
      this.magEl.classList.add('pop');
      this.popTimer = 0;
      this.updateMagazine(mag);
      const low = this.magSize > 0 && mag / this.magSize <= 0.25;
      this.el.classList.toggle('low', low && !this.reloading);
      this.lastMag = mag;
    }
    if (reserve !== this.lastReserve) {
      this.resEl.textContent = String(reserve);
      this.lastReserve = reserve;
    }
    if (this.popTimer >= 0) {
      this.popTimer += s.dt;
      if (this.popTimer > 0.3) {
        this.magEl.classList.remove('pop');
        this.popTimer = -1;
      }
    }
  }

  private updateMagazine(mag: number) {
    if (this.useMeter && this.meterFill) {
      const f = this.magSize > 0 ? mag / this.magSize : 0;
      this.meterFill.style.transform = `scaleX(${f.toFixed(3)})`;
      return;
    }
    for (let i = 0; i < this.ticks.length; i++) {
      this.ticks[i].classList.toggle('spent', i >= mag);
    }
  }

  dispose() {
    this.el.remove();
  }
}
