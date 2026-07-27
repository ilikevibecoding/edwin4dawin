import * as THREE from 'three';
import type { WeaponSpec } from '../core/Contracts';
import type { HudState } from './HudSystem';
import { clamp } from '../core/MathX';

/**
 * Crosshair.ts — a dynamic reticle drawn from CSS ticks (crisp at any DPI).
 *
 * The centre gap ("bloom") expands with the weapon's live spread — movement,
 * airborne, firing recoil — and contracts when aiming or crouched. It fades out
 * under ADS (the sight takes over), flashes amber on a confirmed hit, tints red
 * when the reticle rests on a hostile, carries a distinct shape per weapon
 * class, and disappears entirely for the scoped sniper.
 */

interface ReticlePreset {
  len: number;
  thick: number;
  base: number; // resting gap in px
  scale: number; // px of bloom per degree of spread
  dot: boolean;
  max: number;
}

const PRESETS: Record<string, ReticlePreset> = {
  'ASSAULT RIFLE': { len: 10, thick: 2, base: 6, scale: 8, dot: true, max: 46 },
  SMG: { len: 8, thick: 2, base: 7, scale: 7, dot: false, max: 52 },
  LMG: { len: 12, thick: 2.5, base: 8, scale: 7, dot: true, max: 60 },
  SNIPER: { len: 14, thick: 2, base: 5, scale: 5, dot: false, max: 40 },
  SHOTGUN: { len: 7, thick: 2.5, base: 12, scale: 9, dot: true, max: 70 },
  PISTOL: { len: 8, thick: 2, base: 5, scale: 8, dot: true, max: 40 },
};
const DEFAULT_PRESET = PRESETS['ASSAULT RIFLE'];

export class Crosshair {
  readonly el: HTMLDivElement;
  private ticks: HTMLDivElement[] = [];
  private dot: HTMLDivElement;
  private enabled = true;

  private fireBloom = 0; // extra spread in degrees from recent fire
  private hitUntil = 0;
  private hostile = false;
  private lastGap = -1;
  private lastLen = -1;
  private lastThick = -1;
  private lastVis = '';
  private _p = new THREE.Vector3();

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'hud-xh';
    for (const [dir, ax] of [
      ['n', 'v'],
      ['s', 'v'],
      ['w', 'h'],
      ['e', 'h'],
    ] as const) {
      const t = document.createElement('div');
      t.className = `hud-xh-t ${ax} ${dir}`;
      this.el.appendChild(t);
      this.ticks.push(t);
    }
    this.dot = document.createElement('div');
    this.dot.className = 'hud-xh-dot';
    this.el.appendChild(this.dot);
    root.appendChild(this.el);
  }

  setEnabled(v: boolean) {
    this.enabled = v;
  }

  /** Called on every weapon:fire — punches the bloom out, decays over time. */
  onFire(spec: WeaponSpec) {
    this.fireBloom = Math.min(this.fireBloom + spec.spreadHip * 0.35 + 0.4, 14);
  }

  onHit() {
    this.hitUntil = performance.now() + 90;
  }

  private spreadProxy(s: HudState, spec: WeaponSpec): number {
    const p = s.player;
    const ads = s.weapons?.adsAmount ?? p?.adsAmount ?? 0;
    let sp = spec.spreadHip + (spec.spreadAds - spec.spreadHip) * ads;
    if (p) {
      const speed = Math.hypot(p.velocity.x, p.velocity.z);
      sp += spec.spreadMoving * clamp(speed / 4, 0, 1);
      if (!p.grounded) sp *= 1.6;
      if (p.stance === 'crouch') sp *= 0.7;
      else if (p.stance === 'prone') sp *= 0.5;
    }
    sp += this.fireBloom;
    return sp;
  }

  update(s: HudState) {
    // Decay fire bloom (real time so it also unwinds while lightly paused-free).
    this.fireBloom = Math.max(0, this.fireBloom - s.dt * 9);

    const spec = s.weapons?.current;
    const ads = s.weapons?.adsAmount ?? s.player?.adsAmount ?? 0;
    const scoped = spec?.scoped ?? false;

    // Visibility: off if disabled; fully hidden for scoped sniper mid/high ADS;
    // otherwise fade with ADS so the iron sight / dot leads.
    let opacity = this.enabled ? 1 : 0;
    if (scoped) opacity *= clamp(1 - ads * 2.2, 0, 1);
    else opacity *= clamp(1 - ads * 0.9, 0.08, 1);
    const vis = opacity.toFixed(2);
    if (vis !== this.lastVis) {
      this.el.style.opacity = vis;
      this.lastVis = vis;
    }
    if (opacity <= 0.02 || !spec) return;

    const preset = PRESETS[spec.className] ?? DEFAULT_PRESET;
    // Scale the whole reticle gently with viewport so it holds up 720p → 4K.
    const ui = clamp(s.vh / 900, 0.85, 2.2);
    const spread = this.spreadProxy(s, spec);
    let gap = (preset.base + spread * 2.1) * ui;
    gap = clamp(gap, preset.base * ui, preset.max * ui);
    gap = Math.round(gap * 2) / 2;
    const len = Math.round(preset.len * ui * 10) / 10;
    const thick = Math.round(preset.thick * ui * 10) / 10;

    if (gap !== this.lastGap) {
      this.el.style.setProperty('--gap', `${gap}px`);
      this.lastGap = gap;
    }
    if (len !== this.lastLen) {
      this.el.style.setProperty('--len', `${len}px`);
      this.lastLen = len;
    }
    if (thick !== this.lastThick) {
      this.el.style.setProperty('--thick', `${thick}px`);
      this.lastThick = thick;
    }
    this.dot.style.display = preset.dot && !(scoped && ads > 0.3) ? '' : 'none';

    // Hit flash.
    const hit = performance.now() < this.hitUntil;
    this.el.classList.toggle('hud-xh--hit', hit);

    // Hostile tint — project live hostiles and test proximity to screen centre.
    const hostile = this.testHostile(s);
    if (hostile !== this.hostile) {
      this.el.classList.toggle('hud-xh--hostile', hostile);
      this.hostile = hostile;
    }
  }

  private testHostile(s: HudState): boolean {
    if (!s.ai) return false;
    const cam = s.camera;
    const list = s.ai.hostiles();
    for (const h of list) {
      this._p.set(h.position.x, h.position.y + 1.1, h.position.z);
      // Behind camera?
      this._p.project(cam);
      if (this._p.z > 1) continue;
      if (Math.abs(this._p.x) < 0.05 && Math.abs(this._p.y) < 0.07) return true;
    }
    return false;
  }

  dispose() {
    this.el.remove();
  }
}
