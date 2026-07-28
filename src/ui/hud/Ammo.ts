/**
 * Ammunition readout.
 *
 * Large condensed numerals because this is the one number a player checks
 * mid-firefight, a per-round pip strip because a count of 7 says nothing about
 * whether that is most of a magazine or the last of it, and a reload arc driven
 * by the duration the weapon module publishes so the wait is legible without
 * watching the animation.
 */
import { div, markup, restartAnimation, setClass, setStyle, setText, span } from '../Dom';
import { grenadeIcon } from '../Icons';
import type { FrameState } from '../HudState';

const MODE_LABEL: Record<string, string> = {
  auto: 'AUTO',
  semi: 'SEMI',
  burst: 'BURST',
  bolt: 'BOLT',
  pump: 'PUMP',
};

/** An LMG belt would otherwise draw a hundred pips two pixels apart. */
const MAX_PIPS = 30;
const ARC_LENGTH = 2 * Math.PI * 45;

export class Ammo {
  readonly root: HTMLDivElement;

  private readonly nameEl: HTMLElement;
  private readonly modeEl: HTMLElement;
  private readonly magEl: HTMLElement;
  private readonly resEl: HTMLElement;
  private readonly calEl: HTMLElement;
  private readonly nadeCount: HTMLElement;
  private readonly pipsEl: HTMLDivElement;
  private readonly arcFill: SVGCircleElement;
  private pips: HTMLDivElement[] = [];

  private lastMagSize = -1;
  private lastAmmo = -1;
  private lastReserve = -1;
  private lastFilled = -1;
  private lastArc = -1;
  private reloadStart = -1;
  private reloadDuration = 0;

  constructor(parent: HTMLElement) {
    this.root = div('ob-ammo region-br', parent);

    const head = div('ob-ammo-head', this.root);
    this.nameEl = span('ob-ammo-name', head, 'NO WEAPON');
    this.modeEl = span('ob-ammo-mode', head, 'SEMI');

    const main = div('ob-ammo-main', this.root);
    const arc = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arc.setAttribute('class', 'ob-ammo-arc');
    arc.setAttribute('viewBox', '0 0 100 100');
    const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    track.setAttribute('class', 'track');
    track.setAttribute('cx', '50');
    track.setAttribute('cy', '50');
    track.setAttribute('r', '45');
    const fill = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    fill.setAttribute('class', 'fill');
    fill.setAttribute('cx', '50');
    fill.setAttribute('cy', '50');
    fill.setAttribute('r', '45');
    fill.setAttribute('stroke-dasharray', String(ARC_LENGTH));
    fill.setAttribute('stroke-dashoffset', String(ARC_LENGTH));
    arc.appendChild(track);
    arc.appendChild(fill);
    main.appendChild(arc);
    this.arcFill = fill;

    this.magEl = span('ob-ammo-mag n', main, '0');
    span('ob-ammo-sep', main, '/');
    this.resEl = span('ob-ammo-res n', main, '0');

    this.pipsEl = div('ob-ammo-pips', this.root);

    const foot = div('ob-ammo-foot', this.root);
    this.calEl = span('lbl', foot, '');
    const nade = div('ob-ammo-nade', foot);
    markup('ob-ammo-nade-icon', grenadeIcon(), nade);
    this.nadeCount = span('lbl', nade, '0');
  }

  /** From `weapon:reloadStart`, whose duration is the animation's real length. */
  beginReload(now: number, duration: number): void {
    this.reloadStart = now;
    this.reloadDuration = Math.max(0.05, duration);
  }

  endReload(): void {
    this.reloadStart = -1;
  }

  flashEmpty(): void {
    restartAnimation(this.root, 'empty');
  }

  update(state: FrameState): void {
    setText(this.nameEl, state.weaponName || 'UNARMED');
    setText(this.modeEl, MODE_LABEL[state.fireMode] ?? state.fireMode.toUpperCase());
    setText(this.calEl, state.caliber);
    setText(this.nadeCount, `x${state.grenades}`);

    if (state.ammoInMag !== this.lastAmmo) {
      this.lastAmmo = state.ammoInMag;
      setText(this.magEl, String(state.ammoInMag));
    }
    if (state.reserve !== this.lastReserve) {
      this.lastReserve = state.reserve;
      setText(this.resEl, String(state.reserve));
    }

    const fraction = state.magSize > 0 ? state.ammoInMag / state.magSize : 1;
    setClass(this.root, 'low', fraction <= 0.34 && state.ammoInMag > 0);
    setClass(this.root, 'dry', state.ammoInMag <= 0 && state.magSize > 0);

    if (state.magSize !== this.lastMagSize) {
      this.lastMagSize = state.magSize;
      this.rebuildPips(state.magSize);
      this.lastFilled = -1;
    }
    this.updatePips(state);
    this.updateArc(state);
  }

  private rebuildPips(magSize: number): void {
    const count = magSize <= 0 ? 0 : Math.min(magSize, MAX_PIPS);
    if (count === this.pips.length) return;
    this.pipsEl.textContent = '';
    this.pips = [];
    for (let i = 0; i < count; i++) this.pips.push(div('ob-ammo-pip', this.pipsEl));
  }

  private updatePips(state: FrameState): void {
    const count = this.pips.length;
    if (count === 0) return;
    const perPip = state.magSize / count;
    const filled = Math.min(count, Math.ceil(state.ammoInMag / perPip));
    if (filled === this.lastFilled) return;
    this.lastFilled = filled;
    for (let i = 0; i < count; i++) setClass(this.pips[i], 'spent', i >= filled);
  }

  private updateArc(state: FrameState): void {
    const reloading = state.reloading;
    setClass(this.root, 'reloading', reloading);
    if (!reloading) {
      this.reloadStart = -1;
      return;
    }
    let progress = 0;
    if (this.reloadStart >= 0) {
      progress = Math.min(1, (state.time - this.reloadStart) / this.reloadDuration);
    }
    const quantised = Math.round(progress * 100) / 100;
    if (quantised === this.lastArc) return;
    this.lastArc = quantised;
    setStyle(
      this.arcFill as unknown as HTMLElement,
      'stroke-dashoffset',
      (ARC_LENGTH * (1 - quantised)).toFixed(1),
    );
  }
}
